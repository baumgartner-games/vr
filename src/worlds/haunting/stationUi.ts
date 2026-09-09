import { repairsFor } from './mission';
import './haunting.css';
import './stationDashboard.css';
import type { HouseSpec } from './house';
import {
  crowdAt,
  MOVE_TIME,
  seating,
  shoved,
  stationFacts,
  STATIONS,
  type Claim,
  type StationId,
} from './stations';
import type { ArchiveView } from './archiveView';
import type { HauntState } from './net';
import { emptySnapshot, type MapSnapshot } from './map/mapSnapshot';
import { roles, type RoleHost, type RoleView } from './registry/roles';
import type { ViewExtras } from './views/extras';

/**
 * **Der Van** — Kopfzeile, Auftragsstreifen, Geräteübersicht, und darunter
 * das Gerät, an dem man sitzt.
 *
 * Was ein Gerät zeigt, steht nicht mehr hier: Archiv, Schalttafel und Späher
 * kommen aus der Rollen-Registry (`registry/roles.ts`), jede aus ihrer
 * eigenen Datei in `views/`, und werden zur Kennung des Platzes gebaut
 * (`roles.get(station).mount(host)`). Diese Datei kennt nur noch die Plätze
 * (`stations.ts`), den Fernseher (dessen Bild die 3D-Welt zeichnet) und den
 * Rahmen darum.
 */
export interface StationHost {
  spec(): HouseSpec;
  state(): HauntState;
  /** Der Stand der Station als Karte — was die Rollen zeichnen (`HauntingWorld.mapSnapshot`). */
  snapshot?(): MapSnapshot;
  claims(): Claim[];
  me(): string;
  link(): { peers: number; vr: boolean; room: string };
  technician(): void;
  /** Das globale Spielmenü bleibt aus jeder Telefonrolle erreichbar. */
  menu?(): void;
  /** Einen sicheren Durchlauf mit einem Modelltechniker ansehen. */
  botRound?(): void;
  /** Die 2D-Welt an- oder ausschalten (`map/flatMode.ts`); `flatActive` sagt, ob sie läuft. */
  flatMode?(): void;
  flatActive?(): boolean;
  /** Eine beendete Runde über die autorisierte Weltaktion neu beginnen. */
  restart?(): void;
  /** Eine Zeile an den Chat oder das Menü der Welt. */
  notify?(text: string): void;
  nameOf(peer: string): string;
  /** An welchem Gerät ich wirklich sitze — `null`, wenn weggeschubst. */
  seat(): StationId | null;
  /** Und wohin ich unterwegs bin. */
  wanted(): StationId | null;
  /** Wie viele Sekunden das Hinlaufen noch dauert. */
  arriving(): number;
  sit(station: StationId): void;
  flip(id: string, on: boolean): void;
  /** Wie der Archivar sein Blatt gerade hält (`archiveView.ts`). */
  archiveView(): ArchiveView;
  /** Näher heran oder weiter weg — Faktor über 1 heißt näher. */
  archiveZoom(factor: number): void;
  /**
   * Das Blatt verschieben, in **Anteilen des Bildes** und nicht in Metern:
   * Wie viele Meter ein Punkt auf dem Schirm ist, hängt am Ausschnitt, und
   * den kennt die Welt (`HauntingWorld.aimArchive`).
   */
  archivePan(dx: number, dz: number): void;
  /** Und wieder auf das ganze Zimmer zurück. */
  archiveHome(): void;
}

/** Wie oft eine Rollenansicht höchstens nachgeführt wird, in Millisekunden. */
const ROLE_RATE = 40;

export class StationUi {
  private readonly root = document.createElement('div');
  private readonly bar = document.createElement('header');
  private readonly quest = document.createElement('div');
  private readonly view = document.createElement('div');
  private readonly body = document.createElement('div');
  /** Wo die Rollenansicht steht — ein Element, das die Seite immer wieder einhängt. */
  private readonly slot = document.createElement('div');
  /** Die gebaute Rollenansicht und zu welchem Platz sie gehört. */
  private role: { id: StationId; view: RoleView } | null = null;
  private roleTime = 0;

  /**
   * **Die Ecke oben rechts im Bild**: der Menüknopf des Fernsehers.
   *
   * Sie steht als eigene Zeile zwischen Kopfzeile und Bild und nicht als
   * absolut gesetzte Ecke *im* Bild: Als Zeile im Fluss steht sie von selbst
   * genau unter dem, was über ihr steht.
   */
  private readonly viewTools = document.createElement('div');
  private readonly panelKey = document.createElement('button');

  /** Ob gerade die Geräteübersicht offen ist statt der eigenen Station. */
  private vanOpen = true;
  /**
   * **Ob die Bedienung gerade über dem Bild des Fernsehers liegt.**
   *
   * Weggeblendet und nicht abgebaut: Ein Panel, das beim Wiedereinblenden neu
   * entsteht, kommt oben statt dort zurück, wo man war.
   */
  private panel = false;
  /**
   * Welches Zimmer der Archivar aufgeschlagen hat — `''` heißt: die Karte.
   * Gesetzt von der Archivansicht (`views/archive.ts`) über `showRoom`,
   * gelesen von der Welt, die das Zimmer in die Akte zeichnet.
   */
  selected = '';
  /** Woran erkannt wird, dass die Seite neu geschrieben werden muss. */
  private drawn = '';
  /**
   * Welche Seite zuletzt geschrieben wurde — **wofür der Scrollstand gilt**.
   *
   * Ohne das sprang die Liste bei jedem Knopfdruck nach oben: Die Seite wird
   * neu geschrieben, und eine neu geschriebene Liste fängt oben an. Der Stand
   * wird deshalb aufgehoben und nur dann verworfen, wenn wirklich eine
   * **andere** Seite kommt.
   */
  private paged = '';

  constructor(
    private readonly host: StationHost,
    /** Die Uhr für die Drossel der Rollenansicht — für Tests austauschbar. */
    private readonly now: () => number = () => performance.now(),
  ) {
    this.root.className = 'haunt';
    this.bar.className = 'haunt__bar';
    this.quest.className = 'haunt__quest';
    this.view.className = 'haunt__view';
    this.body.className = 'haunt__body';
    this.slot.className = 'haunt__role';

    this.viewTools.className = 'haunt__vtools';
    this.panelKey.className = 'haunt__vbtn';
    this.panelKey.dataset['panel'] = '';
    this.viewTools.append(this.panelKey);

    this.root.append(this.bar, this.quest, this.viewTools, this.view, this.body);
    document.body.append(this.root);
    document.body.classList.add('haunt-on');

    this.root.addEventListener('click', (event) => this.onClick(event));
  }

  dispose(): void {
    this.dropRole();
    this.root.remove();
    document.body.classList.remove('haunt-on');
  }

  /** Welche Station gerade zu sehen ist — `null` heißt: die Übersicht in der Zentrale. */
  get station(): StationId | null {
    if (this.vanOpen) return null;
    const seat = this.host.seat();
    return seat && this.host.arriving() <= 0 ? seat : null;
  }

  /** Die gebaute Rollenansicht — für Tests und die Welt. */
  get roleView(): RoleView | null {
    return this.role?.view ?? null;
  }

  /**
   * Wohin die Welt ihr Bild zeichnen soll, in CSS-Pixeln — oder `null`, wenn
   * diese Station keines hat. Der Fernseher hat den ganzen Schirm, der
   * Archivar das Loch seiner Raumakte; die Karten zeichnen sich selbst.
   */
  viewport(): { x: number; y: number; w: number; h: number } | null {
    if (this.station === 'watch') {
      const box = this.view.getBoundingClientRect();
      if (box.width < 8 || box.height < 8) return null;
      return { x: box.left, y: box.top, w: box.width, h: box.height };
    }
    return this.role?.view.viewport?.() ?? null;
  }

  /**
   * **Wie viele Punkte des Bildes oben schon vergeben sind.**
   *
   * Beim Fernseher liegen Kopfzeile und Auftragsstreifen über dem Bild; das
   * Loch des Archivars liegt in der Seite und hat nichts über sich.
   */
  headroom(): number {
    if (this.station !== 'watch') return 0;
    const box = this.quest.getBoundingClientRect();
    return Math.max(0, box.bottom);
  }

  /** Ob das Bild hinter der Bedienung grob gerastert werden soll (`HauntingWorld.veilView`). */
  get veiled(): boolean {
    return this.hasView && this.panel;
  }

  refresh(): void {
    const state = this.host.state();
    const spec = this.host.spec();
    const station = this.station;
    this.mountRole(station);
    const sign = [
      spec.seed,
      station ?? 'van',
      state.phase,
      state.crew.hp,
      state.crew.options.test,
      this.host.link().peers,
      this.host.link().vr,
      state.monsterOn,
      state.done.length,
      Math.ceil(this.host.arriving()),
      this.host
        .claims()
        .map((claim) => `${claim.id}:${claim.station}`)
        .sort()
        .join('|'),
      this.panel,
      this.host.flatActive?.() ?? false,
      this.role ? this.role.id : '',
    ].join('/');

    if (sign !== this.drawn) {
      this.drawn = sign;
      this.write();
    }
    // Die Rollenansicht führt sich selbst nach — in Telefonrate, nicht je Bild.
    const now = this.now();
    if (this.role && now - this.roleTime >= ROLE_RATE) {
      const dt = this.roleTime ? (now - this.roleTime) / 1000 : 0;
      this.roleTime = now;
      this.role.view.update(Math.min(0.5, dt));
    }
    this.view.hidden = !this.hasView;
  }

  /** Ob diese Station ein Bild der ganzen Welt bekommt — nur der Fernseher. */
  private get hasView(): boolean {
    return this.station === 'watch';
  }

  // --- die Rollen -------------------------------------------------------------

  /**
   * Die Ansicht zum Platz bauen — oder abbauen, wenn keiner (mehr) gilt.
   *
   * Aus der Registry, nicht aus einer Liste hier: Wer eine Rolle anmeldet
   * (`views/*.register.ts`), bekommt sie hier gebaut. Ist sie (noch) nicht
   * angemeldet — die Welt lädt `views/` nach —, steht ein Platzhalter, und der
   * nächste `refresh` versucht es wieder.
   */
  private mountRole(station: StationId | null): void {
    if (!station || station === 'watch') {
      this.dropRole();
      return;
    }
    if (this.role?.id === station) return;
    this.dropRole();
    const definition = roles.get(station);
    if (!definition) {
      this.slot.replaceChildren(
        note('calm', stationFacts(station).label, 'Die Ansicht wird geladen …'),
      );
      return;
    }
    const view = definition.mount(this.roleHost());
    this.role = { id: station, view };
    this.roleTime = 0;
    this.slot.replaceChildren(view.element);
    view.update(0);
  }

  private dropRole(): void {
    if (!this.role) return;
    this.role.view.dispose();
    this.role = null;
    this.selected = '';
    this.slot.replaceChildren();
  }

  /** Was eine Rolle von der Welt bekommt — der `StationHost`, zurechtgeschnitten. */
  private roleHost(): RoleHost {
    const host = this.host;
    const extra: ViewExtras = {
      spec: () => host.spec(),
      state: () => host.state(),
      showRoom: (roomId) => {
        this.selected = roomId;
      },
      archiveView: () => host.archiveView(),
      archiveZoom: (factor) => host.archiveZoom(factor),
      archivePan: (dx, dz) => host.archivePan(dx, dz),
      archiveHome: () => host.archiveHome(),
    };
    return {
      snapshot: () => host.snapshot?.() ?? emptySnapshot(),
      me: () => host.me(),
      nameOf: (peer) => host.nameOf(peer),
      flip: (id, on) => host.flip(id, on),
      notify: (text) => host.notify?.(text),
      extra,
    };
  }

  // --- schreiben -------------------------------------------------------------

  private write(): void {
    const state = this.host.state();
    const spec = this.host.spec();
    const station = this.station;
    const facts = station ? stationFacts(station) : null;

    // Die Farbe der Station hängt am Wurzelelement und nicht an jeder Kachel
    // einzeln: Von hier aus färbt sie Kopfzeile, Rand und Knöpfe über eine
    // einzige Variable, und eine neue Station bekommt eine Zeile im CSS.
    this.root.dataset['station'] = station ?? 'van';
    this.writeShape();

    const back = el('button', 'haunt__back');
    back.dataset['van'] = '';
    back.append(
      el('span', 'haunt__back-icon', this.vanOpen ? '←' : '☰'),
      el('span', '', this.vanOpen && this.host.seat() ? 'Zurück' : 'Menü / Rollen'),
    );
    back.setAttribute('aria-label', this.vanOpen ? 'Zurück zur eigenen Station' : 'Rolle wechseln');

    const where = el('span', 'haunt__where');
    where.append(
      el('strong', '', facts ? facts.label : 'ORBITAL / EINSATZZENTRALE'),
      el('small', '', facts ? facts.tagline : 'Ein Außentechniker · drei im Van'),
    );

    const bar: HTMLElement[] = [
      where,
      el(
        'span',
        `haunt__state${state.monsterOn ? ' is-hot' : ''}`,
        state.crew.options.test
          ? 'Sicherer Test'
          : state.phase === 'won'
            ? 'Mission erfüllt'
            : state.phase === 'lost'
              ? 'Mission gescheitert'
              : state.monsterOn
                ? 'Mission läuft'
                : 'Bereit',
      ),
    ];
    back.setAttribute('aria-expanded', String(this.vanOpen));
    bar.push(back);
    this.bar.replaceChildren(...bar);

    this.writeQuest(state, spec);

    // **Der Scrollstand bleibt, solange dieselbe Seite bleibt.** Ein Knopf
    // schreibt die Seite neu, und eine neu geschriebene Liste fängt oben an —
    // wer unten auf eine Kachel tippt, stünde danach wieder oben.
    const page = `${station ?? 'van'}/${this.vanOpen ? 'van' : 'seat'}`;
    const keep = page === this.paged ? this.body.scrollTop : 0;
    this.paged = page;
    const focused =
      document.activeElement instanceof HTMLElement && this.body.contains(document.activeElement)
        ? document.activeElement
        : null;
    const focusKey = focused && Object.entries(focused.dataset)[0];
    this.body.replaceChildren(...this.roundResult(), ...this.page(station));
    if (focusKey) {
      const [key, value] = focusKey;
      const replacement = [
        ...this.body.querySelectorAll<HTMLElement>('button,input,select,canvas'),
      ].find((element) => element.dataset[key] === value);
      replacement?.focus({ preventScroll: true });
    }
    this.body.scrollTop = keep;
  }

  /**
   * **Die Form der Seite**: beim Fernseher Bild ganz, Bedienung auf Zuruf;
   * bei den drei Geräten die Rollenansicht im Fluss der Seite.
   */
  private writeShape(): void {
    const view = this.hasView;
    // Die offene Bedienung gehört zu dem Gerät, an dem sie aufgemacht wurde:
    // Wer aufsteht und sich woandershin setzt, sieht dort zuerst sein Bild.
    if (!view) this.panel = false;
    this.root.classList.toggle('is-view', view);
    this.root.classList.toggle('is-panel', view && this.panel);
    this.root.classList.toggle('is-role', !!this.role);
    this.panelKey.hidden = !view;
    this.view.setAttribute('aria-label', 'Zuschaueransicht');
    if (view) {
      this.panelKey.textContent = this.panel ? '✕' : '☰';
      this.panelKey.setAttribute('aria-expanded', this.panel ? 'true' : 'false');
      this.panelKey.setAttribute(
        'aria-label',
        this.panel ? 'Hinweise schließen, nur das Bild zeigen' : 'Hinweise einblenden',
      );
    }
    this.viewTools.hidden = !view;
  }

  /**
   * **Der Auftragsstreifen** — ein Feld je Sache, und drei Zustände.
   *
   * `0/3` sagt, wie viele es sind; es sagt nicht, dass eine davon gerade in der
   * Hand des VR-Spielers liegt und noch nicht in der Zentrale. Genau dieser
   * Unterschied ist am Tisch die Frage, die gestellt wird („hast du sie schon
   * abgelegt?"), und drei Kästchen beantworten sie ohne ein Wort.
   */
  private writeQuest(state: HauntState, spec: HouseSpec): void {
    const repairs = repairsFor(spec);
    const strip = el('span', 'haunt__pips');
    for (const repair of repairs) {
      const pip = el('i', `haunt__pip${state.done.includes(repair.id) ? ' is-done' : ''}`);
      pip.title = repair.title;
      strip.append(pip);
    }
    this.quest.replaceChildren(
      el('span', 'haunt__quest-label', 'SYSTEME'),
      strip,
      el('span', 'haunt__quest-count', `${state.done.length}/3 · ANZUG ${state.crew.hp}/3`),
    );
    this.quest.setAttribute(
      'aria-label',
      `${state.done.length} von 3 Systemen repariert; Anzug ${state.crew.hp} von 3`,
    );
  }

  private page(station: StationId | null): HTMLElement[] {
    if (station === null) return this.vanPage();
    if (station === 'watch') return this.watchPage();
    return [this.slot];
  }

  /**
   * **Die Geräteübersicht.** Wer wo sitzt, und was frei ist.
   *
   * Hier steht auch, was eine Station ausdrücklich *nicht* sieht. Das ist
   * keine Hilfe für Anfänger, sondern die halbe Spielregel: Wer nicht weiß,
   * was er nicht sieht, hält seine Lücke für die Wahrheit und meldet sie als
   * solche.
   */
  private vanPage(): HTMLElement[] {
    const claims = this.host.claims();
    const me = this.host.me();
    const seats = seating(claims);
    const wanted = this.host.wanted();
    const travel = this.host.arriving();
    const link = this.host.link();
    const out: HTMLElement[] = [
      note(
        link.vr ? 'live' : 'warn',
        link.vr ? 'Crew verbunden' : 'Warte auf den VR-Spieler',
        `${link.peers} Gegenstelle(n) · Raum: ${link.room || 'verbindet …'}. Alle Geräte müssen denselben Raum wählen.`,
      ),
      note(
        'calm',
        'Eure Crew',
        'Quest: Außentechniker. Handys: Archiv mit Karte und Codes, Schalttafel mit Türen und Lichtern, Späher mit Techniker und Monster. Der Zuschauer ist ein Fenster für den Fernseher.',
      ),
    ];
    if (this.host.botRound) {
      const bot = el('button', 'haunt__tile haunt__tile--simulation');
      bot.dataset['botRound'] = '';
      bot.append(
        el('strong', '', 'Bot-Runde ansehen'),
        el(
          'span',
          'haunt__tag',
          link.vr
            ? 'Ein Techniker spielt bereits. Die Bot-Demo ist verfügbar, sobald er die Rolle verlässt.'
            : 'Sicherer Test · Station von oben · Techniker auf automatischer Route',
        ),
      );
      bot.toggleAttribute('disabled', link.vr);
      out.push(bot);
    }
    if (this.host.flatMode) {
      // Die Checkbox neben der Bot-Runde: 2D-Welt statt 3D (`map/flatMode.ts`).
      const flat = el('label', 'haunt__tile haunt__tile--flat');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.dataset['flatMode'] = '';
      box.checked = this.host.flatActive?.() ?? false;
      flat.append(
        box,
        el('strong', '', ' 2D-Welt von oben'),
        el(
          'span',
          'haunt__tag',
          'Karte statt 3D · Stock links, drei Knöpfe rechts · Rollen im Streifen darüber wechselbar',
        ),
      );
      out.push(flat);
    }
    if (!link.vr) {
      const test = el('button', 'haunt__tile', 'Als Techniker am Desktop testen');
      test.dataset['technician'] = '';
      out.push(test);
    }

    if (shoved(claims, me)) {
      out.push(
        note(
          'warn',
          'Weggeschubst',
          'Jemand saß länger an dem Gerät. Nimm ein anderes — du verlierst Zeit, aber nichts, was du schon weißt.',
        ),
      );
    }

    for (const station of STATIONS) {
      // Die Worte kommen aus der Registry, wenn die Rolle angemeldet ist —
      // sonst aus der Platzliste, die dieselben Sätze kennt.
      const role = roles.get(station.id);
      const owner = seats.get(station.id);
      const mine = owner === me;
      const coming = wanted === station.id && travel > 0;
      const tile = el('button', 'haunt__tile');
      tile.dataset['sit'] = station.id;
      tile.dataset['accent'] = station.id;
      tile.setAttribute('aria-pressed', mine ? 'true' : 'false');
      if (mine) tile.classList.add('is-mine');
      else if (owner && !station.shared) tile.classList.add('is-taken');
      if (coming) tile.classList.add('is-coming');

      const head = el('span', 'haunt__tile-head');
      // **Vor dem Fernseher ist immer Platz** — dort steht eine Zahl statt
      // eines Namens: Ein einzelner Name wäre dort die Lüge, dass er besetzt
      // sei, und „besetzt" ist die eine Auskunft, um die es bei den drei
      // anderen Kacheln überhaupt geht.
      const crowd = station.shared ? crowdAt(claims, station.id) : 0;
      head.append(
        el('strong', '', role?.label ?? station.label),
        el(
          'span',
          `haunt__seat${mine ? ' is-mine' : owner && !station.shared ? ' is-taken' : ''}`,
          station.shared
            ? mine
              ? crowd > 1
                ? `du und ${crowd - 1} andere`
                : 'du siehst zu'
              : crowd > 0
                ? `${crowd} sehen zu`
                : 'frei'
            : mine
              ? 'du sitzt hier'
              : owner
                ? this.host.nameOf(owner)
                : 'frei',
        ),
      );
      tile.append(head, el('span', 'haunt__tag', role?.tagline ?? station.tagline));
      // „Sieht:" und nicht „Sieht nicht:" — die Zeile sagt beides in einem
      // Satz, und mit der Verneinung davor stand die halbe Auskunft auf dem Kopf.
      tile.append(el('span', 'haunt__blind', `Sieht: ${role?.sees ?? station.sees}`));

      if (coming) {
        const rail = el('span', 'haunt__rail');
        const fill = el('i', '');
        // Von leer auf voll, damit man den Balken *ankommen* sieht.
        fill.style.width = `${Math.round((1 - travel / MOVE_TIME) * 100)}%`;
        rail.append(fill);
        tile.append(rail, el('span', 'haunt__tag', `Unterwegs … ${travel.toFixed(1)} s`));
      }
      out.push(tile);
    }
    return out;
  }

  private roundResult(): HTMLElement[] {
    const phase = this.host.state().phase;
    if (phase !== 'lost' && phase !== 'won') return [];
    const box = el('section', `haunt__round-result${phase === 'lost' ? ' is-lost' : ''}`);
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    box.append(
      el(
        'strong',
        '',
        phase === 'lost' ? 'Verbindung zum Techniker verloren' : 'Mission erfolgreich',
      ),
      el(
        'p',
        '',
        phase === 'lost'
          ? 'Der Anzug ist ausgefallen. Die Runde ist beendet. Ihr könnt einen neuen Einsatz starten.'
          : 'Alle Systeme sind repariert und der Techniker ist zurück in der Zentrale.',
      ),
    );
    if (this.host.restart) {
      const restart = el('button', 'haunt__chart-key', 'Neue Runde starten');
      restart.dataset['restart'] = '';
      box.append(restart);
    }
    return [box];
  }

  /**
   * **Der Fernseher.** Alles zu sehen, nichts zu bedienen.
   *
   * Er ist die einzige Station ohne einen einzigen Knopf, und das ist seine
   * ganze Bauart: Wer alles sieht *und* etwas tun kann, ist kein Zuschauer
   * mehr, sondern der vierte Spieler mit den besten Karten — und dann sind die
   * anderen drei Deko. Deshalb steht hier nur, was das Bild ist und was man
   * damit **nicht** macht.
   */
  private watchPage(): HTMLElement[] {
    const state = this.host.state();
    return [
      note(
        'live',
        'Die ganze Station, bei Tag',
        'Von schräg oben, ohne Decke, mit allem darin: den Sachen, dem Mitspieler — und dem Monster, wenn es an ist. Für den Fernseher im Raum gedacht, nicht fürs Telefon in der Hand.',
      ),
      note(
        'warn',
        'Und du sagst nichts',
        'Du siehst, was drei andere sich gerade mühsam zusammenrufen. Ein Zuruf von dir beendet die Runde schneller als das Monster — zusehen ist die ganze Rolle.',
      ),
      note(
        state.monsterOn ? 'live' : 'calm',
        state.monsterOn ? 'Das Monster ist an' : 'Das Monster ist aus',
        state.monsterOn
          ? 'Es läuft in der Station herum, und du siehst es. Die in der Zentrale sehen es nicht — der Späher hat einen Punkt, der alle paar Sekunden springt, sonst niemand etwas.'
          : 'Der VR-Spieler hat es ausgeschaltet. Solange bleibt die Station leer, und alle üben.',
      ),
    ];
  }

  // --- Eingaben ---------------------------------------------------------------

  private onClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    // Was in der Rollenansicht steht, bedient die Rolle selbst.
    if (target && this.slot.contains(target)) return;
    const hit = target?.closest<HTMLElement>(
      '[data-sit],[data-van],[data-panel],[data-technician],[data-game-menu],[data-bot-round],[data-flat-mode],[data-restart]',
    );
    if (!hit) return;

    if (hit.dataset['gameMenu'] !== undefined) {
      this.host.menu?.();
      return;
    } else if (hit.dataset['botRound'] !== undefined) {
      if (!this.host.link().vr) this.host.botRound?.();
      return;
    } else if (hit.dataset['flatMode'] !== undefined) {
      this.host.flatMode?.();
      return;
    } else if (hit.dataset['restart'] !== undefined) {
      this.host.restart?.();
      return;
    } else if (hit.dataset['technician'] !== undefined) {
      this.host.technician();
      return;
    } else if (hit.dataset['van'] !== undefined) {
      this.vanOpen = !this.vanOpen;
    } else if (hit.dataset['panel'] !== undefined) {
      this.panel = !this.panel;
    } else if (hit.dataset['sit']) {
      this.host.sit(hit.dataset['sit'] as StationId);
      this.vanOpen = false;
      // Wer sich neu hinsetzt, fängt beim ganzen Zimmer an — ein geerbter
      // Ausschnitt aus der vorigen Sitzung ist ein Bild, das niemand versteht.
      this.host.archiveHome();
    }
    this.drawn = '';
    this.refresh();
  }
}

// --- Kleinkram ---------------------------------------------------------------

function el(tag: string, className: string, text = ''): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // `textContent` und nie `innerHTML`: Durch hier gehen Spielernamen, und die
  // hat sich niemand ausgesucht.
  if (text) node.textContent = text;
  return node;
}

/**
 * Eine Kachel mit Ton: `warn` gelb, `live` in der Farbe der Station, `calm`
 * grau. Drei Töne und nicht fünf — eine Oberfläche, in der jede zweite Zeile
 * leuchtet, hat keine Betonung mehr.
 */
function note(tone: 'warn' | 'live' | 'calm', title: string, text: string): HTMLElement {
  const node = el('div', `haunt__note is-${tone}`);
  node.append(el('strong', '', title), el('span', '', text));
  return node;
}
