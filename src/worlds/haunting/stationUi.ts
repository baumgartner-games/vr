import { repairsFor } from './mission';
import './haunting.css';
import './stationDashboard.css';
import { describeSetup, type RoundSetup } from './rules/roundSetup';
import { SetupPanel } from './roundSetupPanel';
// **Die Rollen melden sich selbst an**, jede aus ihrer eigenen Datei
// (`BOUNDARIES.md`). Importiert werden sie hier und nicht über
// `registry/discover.ts`: Der Glob dort ist Vite-eigen, und die Einsatzzentrale
// läuft auch in einer Welt, die nie eine 2D-Runde aufmacht.
import './views/archive.register';
import './views/panel.register';
import './views/scout.register';
import './views/watch.register';
import './monster/monster.register';
import { listRoles, roles, type RoleHost, type RoleView } from './registry/roles';
import type { ArchiveDesk } from './views/archiveDesk';
import type { HouseSpec } from './house';
import { crowdAt, MOVE_TIME, seating, shoved, type Claim, type StationId } from './stations';
import type { HauntState } from './net';
import type { MapRound, MapSnapshot } from './map/mapSnapshot';
import { cabinsText, endingText, lowOxygen, roundHud } from './rules/roundHud';
import type { LobbyChoice } from './rules/lobby';
import type { MonsterPort } from './monster/monsterDriver';

/**
 * **Die Einsatzzentrale auf dem Telefon** — eine Kopfzeile, ein Auftragsstreifen
 * und darunter die Rolle, an der man gerade sitzt.
 *
 * Diese Datei hat lange **jede** Rolle selbst gezeichnet: Radarschirm,
 * Aktenblatt, Schalterliste, Cockpit, jeweils in einer eigenen Methode, und
 * ein `if (station === …)` verteilte darauf. Das ist vorbei. Was hier steht,
 * ist der Rahmen: wer wo sitzt, was gestartet wird, wie die Runde ausgeht —
 * und ein Platz, in den die Rolle aus der **Registry** gehängt wird
 * (`registry/roles.ts`). Eine neue Rolle braucht in dieser Datei keine Zeile
 * mehr; sie legt eine `*.register.ts` an, und die Kachel steht da.
 *
 * Die Rollen selbst zeichnen dieselbe `MapView` wie die 2D-Welt, jede mit
 * eigenen Schichten (`views/`): der Archivar alles, was liegt, die Schalttafel
 * die Station ohne Wesen, der Späher zwei Punkte alle dreieinhalb Sekunden.
 * Der Fernseher ist die Ausnahme — sein Bild ist die 3D-Welt, gezeichnet in
 * das Rechteck, das seine Ansicht meldet (`RoleView.viewport`).
 */
export interface StationHost {
  spec(): HouseSpec;
  state(): HauntState;
  claims(): Claim[];
  me(): string;
  link(): { peers: number; vr: boolean; room: string };
  technician(): void;
  /** Das globale Spielmenü bleibt aus jeder Telefonrolle erreichbar. */
  menu?(): void;
  /** Einen sicheren Durchlauf mit einem Modelltechniker ansehen. */
  botRound?(): void;
  /**
   * Die Einstellung „2D-Welt von oben" umlegen (`map/flatMode.ts`);
   * `flatWanted` sagt, ob sie steht. Sie startet nichts: Gestartet wird
   * danach mit `botRound`, `mission` oder `test`, und die Welt entscheidet,
   * ob das in 2D oder 3D passiert.
   */
  flatMode?(): void;
  flatWanted?(): boolean;
  /**
   * Die Wahl der Lobby (`rules/lobby.ts`): die Absicht — spielen, zusehen,
   * trainieren — und die Ansicht, aus der `flatWanted` nur noch abgelesen
   * wird.
   */
  lobby?(): LobbyChoice;
  setLobby?(choice: LobbyChoice): void;
  /** Mission (mit Monster) und Test (ohne) — die Kacheln neben der Bot-Runde, wenn 2D steht. */
  mission?(): void;
  test?(): void;
  /**
   * Die Verteilung der nächsten Runde (`rules/roundSetup.ts`): Techniker,
   * Monster, Plätze der Zentrale. `startSetup` startet genau damit.
   */
  setup?(): RoundSetup;
  setSetup?(setup: RoundSetup): void;
  startSetup?(): void;
  /** Eine beendete Runde über die autorisierte Weltaktion neu beginnen. */
  restart?(): void;
  /**
   * Der Stand der Runde — Sauerstoff, Anzug, Kabinen, Ende (`rules/`). Er
   * wird aus dem `HauntState` gerechnet, also auf jedem Telefon und nicht nur
   * beim Gastgeber; ohne ihn zeigt die Leiste nur die Systeme und den Anzug.
   */
  round?(): MapRound | null;
  /**
   * Der Stand als Karte (`HauntingWorld.mapSnapshot`) — das, woraus **jede**
   * Rollenansicht ihr Bild baut. Fehlt er, gibt es nichts zu zeichnen, und die
   * Rolle bekommt eine Erklärung statt einer Karte.
   */
  snapshot?(): MapSnapshot;
  /** Das Steuer der Station `monster` übers Netz (`monster/netMonsterPort.ts`). */
  monsterPort?(): MonsterPort | null;
  /** Das Loch des Archivars in die 3D-Welt (`views/archiveDesk.ts`); `null` ohne Kamera. */
  archiveDesk?(): ArchiveDesk | null;
  /** Eine Zeile an den Spieler — was eine Rollenansicht dem Telefon sagt. */
  notify?(text: string): void;
  nameOf(peer: string): string;
  /** An welchem Gerät ich wirklich sitze — `null`, wenn weggeschubst. */
  seat(): StationId | null;
  /** Und wohin ich unterwegs bin. */
  wanted(): StationId | null;
  /** Wie viele Sekunden das Hinlaufen noch dauert. */
  arriving(): number;
  sit(station: StationId): void;
  /**
   * **Die drei Griffe der Schalttafel** (`views/panelRole.ts`), jeder mit der
   * Zeile, die er dem Spieler sagt — `''` heißt: dafür gibt es keinen Schalter.
   */
  door(doorId: string): string;
  light(roomId: string): string;
  lure(roomId: string): string;
}

/** Wie oft eine Rollenansicht nachgezogen wird, in Millisekunden. */
const ROLE_TICK = 50;

export class StationUi {
  private readonly root = document.createElement('div');
  private readonly bar = document.createElement('header');
  private readonly quest = document.createElement('div');
  private readonly body = document.createElement('div');

  /** Ob gerade die Geräteübersicht offen ist statt der eigenen Station. */
  private vanOpen = true;
  /** Die Tafel der Verteilung — eine für die Lebensdauer der Seite, neu gefüllt bei jedem Schreiben. */
  private setupPanel: SetupPanel | null = null;
  /** Woran erkannt wird, dass die Seite neu geschrieben werden muss. */
  private drawn = '';
  /**
   * Welche Seite zuletzt geschrieben wurde — **wofür der Scrollstand gilt**.
   *
   * Ohne das sprang die Liste bei jedem Knopfdruck nach oben: Die Seite wird
   * neu geschrieben, und eine neu geschriebene Liste fängt oben an.
   */
  private paged = '';
  /**
   * **Die Rollenansicht, an der man gerade sitzt** — gebaut aus der Registry,
   * und sie überlebt ein `write()`.
   *
   * Das ist nicht Bequemlichkeit: Eine Karte, die sich bei jedem Schalter neu
   * aufbaut, nimmt den Daumen vom Stock, springt an ihren Anfangsausschnitt
   * zurück und gäbe beim Monster nebenbei das Steuer frei.
   */
  private view: RoleView | null = null;
  private viewId = '';
  private viewAt = 0;

  constructor(private readonly host: StationHost) {
    this.root.className = 'haunt';
    this.bar.className = 'haunt__bar';
    this.quest.className = 'haunt__quest';
    this.body.className = 'haunt__body';
    this.root.append(this.bar, this.quest, this.body);
    document.body.append(this.root);
    document.body.classList.add('haunt-on');
    this.root.addEventListener('click', (event) => this.onClick(event));
  }

  dispose(): void {
    this.dropView();
    this.root.remove();
    document.body.classList.remove('haunt-on');
  }

  /** Welche Station gerade zu sehen ist — `null` heißt: die Übersicht in der Zentrale. */
  get station(): StationId | null {
    if (this.vanOpen) return null;
    const seat = this.host.seat();
    return seat && this.host.arriving() <= 0 ? seat : null;
  }

  /**
   * **Wohin die Welt ihr Bild zeichnen soll**, in CSS-Pixeln — oder `null`.
   *
   * Die Frage beantwortet nicht mehr diese Datei, sondern die Rolle: Der
   * Fernseher will immer ein Bild, der Archivar nur, solange eine Raumakte
   * offen ist, und die anderen nie.
   */
  viewport(): { x: number; y: number; w: number; h: number } | null {
    return this.view?.viewport?.() ?? null;
  }

  /**
   * **Wie viele Punkte des Bildes oben schon vergeben sind.**
   *
   * Kopfzeile und Auftragsstreifen liegen im Fluss über dem Bild und nicht
   * darauf; gemessen wird trotzdem, statt es zu behaupten — eine Zahl im Kopf
   * ist bei der nächsten Schriftgröße wieder falsch.
   */
  headroom(): number {
    const rect = this.viewport();
    if (!rect) return 0;
    const box = this.quest.getBoundingClientRect();
    return Math.max(0, Math.min(rect.h, box.bottom - rect.y));
  }

  refresh(): void {
    const state = this.host.state();
    const station = this.station;
    const round = this.host.round?.() ?? null;
    const sign = [
      this.host.spec().seed,
      station ?? 'van',
      // Von der Runde nur, was selten kippt: Leben, Kabinen, die Warnschwelle,
      // das Ende. Die Uhr selbst läuft unten in die Anzeige, ohne Neuschrift.
      round ? `${round.suit}/${round.cabinsDestroyed.length}/${lowOxygen(round.oxygen)}` : '',
      round?.ending ?? '',
      state.phase,
      state.crew.hp,
      state.crew.options.test,
      state.crew.inventory.length,
      this.host.link().peers,
      this.host.link().vr,
      state.monsterOn,
      state.done.length,
      state.taken.length,
      Math.ceil(this.host.arriving()),
      this.host
        .claims()
        .map((claim) => `${claim.id}:${claim.station}`)
        .sort()
        .join('|'),
      // Die Checkbox „2D-Welt von oben" tauscht die Kacheln darunter aus.
      this.host.flatWanted?.() ?? false,
      this.host.setup ? describeSetup(this.host.setup()) : '',
    ].join('/');

    if (sign !== this.drawn) {
      this.drawn = sign;
      this.write();
    }
    // Die Sauerstoff-Uhr springt jede Sekunde — und eine Seite, die deshalb
    // jede Sekunde neu geschrieben wird, nähme dem Daumen den Schalter weg.
    if (round) {
      const { oxygen } = roundHud(round);
      for (const slot of this.quest.querySelectorAll('[data-oxygen]'))
        if (slot.textContent !== oxygen) slot.textContent = oxygen;
    }
    this.stepView();
  }

  /**
   * **Die Rolle zeichnet sich selbst** (`RoleView.update`), gedrosselt auf
   * Telefonrate. Das erste Bild kommt sofort: `performance.now()` kann kurz
   * nach dem Start der Seite noch unter der Drossel liegen, und eine Ansicht
   * ohne erstes Bild hätte weder Stock gelesen noch Karte gezeichnet.
   */
  private stepView(): void {
    if (!this.view) return;
    const now = performance.now();
    const first = this.viewAt === 0;
    if (!first && now - this.viewAt <= ROLE_TICK) return;
    const dt = first ? 0 : (now - this.viewAt) / 1000;
    this.viewAt = Math.max(now, Number.MIN_VALUE);
    this.view.update(dt);
  }

  private dropView(): void {
    this.view?.dispose();
    this.view = null;
    this.viewId = '';
    this.viewAt = 0;
  }

  // --- schreiben -------------------------------------------------------------

  private write(): void {
    const state = this.host.state();
    const station = this.station;
    const role = station ? roles.get(station) : undefined;

    // Die Farbe der Station hängt am Wurzelelement und nicht an jeder Kachel
    // einzeln: Von hier aus färbt sie Kopfzeile, Rand und Knöpfe über eine
    // einzige Variable, und eine weitere Rolle bekommt eine Zeile im CSS.
    this.root.dataset['station'] = station ?? 'van';
    // Eine Rolle mit Karte bekommt die ganze Fläche unter der Leiste; der
    // Fernseher bekommt eine rollende Liste, weil sein Bild darin steht.
    this.root.classList.toggle('is-view', role?.surface === 'map');

    const back = el('button', 'haunt__back');
    back.dataset['van'] = '';
    back.append(
      el('span', 'haunt__back-icon', this.vanOpen ? '←' : '☰'),
      el('span', '', this.vanOpen && this.host.seat() ? 'Zurück' : 'Menü / Rollen'),
    );
    back.setAttribute('aria-label', this.vanOpen ? 'Zurück zur eigenen Station' : 'Rolle wechseln');
    back.setAttribute('aria-expanded', String(this.vanOpen));

    const where = el('span', 'haunt__where');
    where.append(
      el('strong', '', role ? role.label : 'ORBITAL / EINSATZZENTRALE'),
      el('small', '', role ? role.tagline : 'Ein Außentechniker · zwei im Team'),
    );

    this.bar.replaceChildren(
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
      back,
    );

    this.writeQuest(state);

    // **Der Scrollstand bleibt, solange dieselbe Seite bleibt.** Ein Knopf
    // schreibt die Seite neu, und eine neu geschriebene Liste fängt oben an —
    // wer unten auf einen Schalter tippt, stünde danach wieder oben.
    const page = `${station ?? 'van'}/${this.vanOpen ? 'van' : 'seat'}`;
    const keep = page === this.paged ? this.body.scrollTop : 0;
    this.paged = page;
    this.body.replaceChildren(...this.roundResult(), ...this.page(station));
    this.body.scrollTop = keep;
  }

  /**
   * **Der Auftragsstreifen** — ein Feld je Sache, und drei Zustände.
   *
   * `0/3` sagt, wie viele es sind; es sagt nicht, dass eine davon gerade in der
   * Hand des VR-Spielers liegt und noch nicht in der Zentrale. Genau dieser
   * Unterschied ist am Tisch die Frage, die gestellt wird.
   */
  private writeQuest(state: HauntState): void {
    const repairs = repairsFor(this.host.spec());
    const strip = el('span', 'haunt__pips');
    for (const repair of repairs) {
      const pip = el('i', `haunt__pip${state.done.includes(repair.id) ? ' is-done' : ''}`);
      pip.title = repair.title;
      strip.append(pip);
    }
    // **Der Anzug sind Leben, keine Zahl.** Wer auf einen Blick sieht, dass
    // einer fehlt, ruft es dem Techniker zu, ohne erst „2/3" lesen zu müssen.
    const round = this.host.round?.() ?? null;
    const suit = round ? round.suit : state.crew.hp;
    const suitMax = round ? round.suitMax : 3;
    const lives = el('span', 'haunt__pips haunt__pips--suit');
    for (let i = 0; i < suitMax; i++)
      lives.append(el('i', `haunt__pip haunt__pip--suit${i < suit ? ' is-alive' : ''}`));
    const hud = round ? roundHud(round) : null;
    const parts: HTMLElement[] = [
      el('span', 'haunt__quest-label', 'SYSTEME'),
      strip,
      el('span', 'haunt__quest-label', 'ANZUG'),
      lives,
    ];
    if (hud) {
      const oxygen = el('span', 'haunt__quest-oxygen', hud.oxygen);
      oxygen.dataset['oxygen'] = '';
      parts.push(oxygen);
      if (hud.cabins > 0) parts.push(el('span', 'haunt__quest-cabins', cabinsText(hud.cabins)));
    }
    parts.push(el('span', 'haunt__quest-count', `${state.done.length}/3`));
    this.quest.replaceChildren(...parts);
    this.quest.classList.toggle('is-low', !!hud?.low);
    this.quest.setAttribute(
      'aria-label',
      `${state.done.length} von 3 Systemen repariert; ` +
        (hud ? hud.label : `Anzug ${suit} von ${suitMax}`),
    );
  }

  /**
   * **Die Seite unter der Leiste**: die Geräteübersicht — oder die Rolle aus
   * der Registry, gebaut über einen `RoleHost`, den alle teilen.
   */
  private page(station: StationId | null): HTMLElement[] {
    if (station === null) {
      this.dropView();
      return this.vanPage();
    }
    const role = roles.get(station);
    if (!role) {
      this.dropView();
      return [note('warn', 'Unbekannte Rolle', `Für „${station}" ist keine Ansicht angemeldet.`)];
    }
    if (!this.host.snapshot)
      return [note('warn', 'Keine Karte', 'Diese Welt liefert den Rollen keinen Stand.')];
    if (this.viewId !== role.id) {
      this.dropView();
      this.view = role.mount(this.roleHost());
      this.viewId = role.id;
    }
    return [this.view!.element];
  }

  /** Was jede Rollenansicht von der Zentrale bekommt (`registry/roles.ts`). */
  private roleHost(): RoleHost {
    const host = this.host;
    return {
      snapshot: () => host.snapshot!(),
      spec: () => host.spec(),
      me: () => host.me(),
      nameOf: (peer) => host.nameOf(peer),
      door: (id) => host.door(id),
      light: (id) => host.light(id),
      lure: (id) => host.lure(id),
      notify: (text) => host.notify?.(text),
      extra: { monster: host.monsterPort?.() ?? null, archive: host.archiveDesk?.() ?? null },
    };
  }

  /**
   * **Die Geräteübersicht.** Wer wo sitzt, und was frei ist.
   *
   * Hier steht auch, was eine Rolle ausdrücklich *nicht* sieht. Das ist keine
   * Hilfe für Anfänger, sondern die halbe Spielregel: Wer nicht weiß, was er
   * nicht sieht, hält seine Lücke für die Wahrheit und meldet sie als solche.
   * Die Zeilen kommen aus der Registry und nicht aus einer Liste hier — eine
   * Rolle, die sich anmeldet, steht damit auch in der Übersicht.
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
        'Eure Dreiercrew',
        'Quest: Außentechniker. Handy 1: Archiv mit Fracht, Zielräumen und Codes. Handy 2: Schalttafel mit Türen, Lampen und Ködern. Späher und Zuschauer sind weitere Plätze.',
      ),
    ];
    // **Erst die Einstellung, dann die Runde.** Die Checkbox „2D-Welt von
    // oben" sagt nur, wie gespielt wird; gestartet wird mit den Kacheln
    // darunter — Bot-Runde, Mission, Test —, und jede davon hält sich an die
    // Checkbox.
    const flat = !!this.host.flatMode && (this.host.flatWanted?.() ?? false);
    if (this.host.flatMode) {
      const tile = el('label', 'haunt__tile haunt__tile--flat');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.dataset['flatMode'] = '';
      box.checked = flat;
      tile.append(
        box,
        el('strong', '', ' 2D-Welt von oben'),
        el(
          'span',
          'haunt__tag',
          'Karte statt 3D für Bot-Runde, Mission und Test · Stock links, drei Knöpfe rechts',
        ),
      );
      out.push(tile);
    }
    if (this.host.botRound) {
      const bot = el('button', 'haunt__tile haunt__tile--simulation');
      bot.dataset['botRound'] = '';
      const busy = link.vr && !flat;
      bot.append(
        el('strong', '', 'Bot-Runde ansehen'),
        el(
          'span',
          'haunt__tag',
          busy
            ? 'Ein Techniker spielt bereits. Die Bot-Demo ist verfügbar, sobald er die Rolle verlässt.'
            : flat
              ? 'Station von oben · Techniker aus Zahlen gegen das Monster · alles sichtbar'
              : 'Sicherer Test · Station von oben · Techniker auf automatischer Route',
        ),
      );
      bot.toggleAttribute('disabled', busy);
      out.push(bot);
    }
    // **Die Verteilung**: Techniker, Monster und die Plätze der Zentrale.
    if (this.host.setup && this.host.setSetup) {
      this.setupPanel ??= new SetupPanel({
        setup: () => this.host.setup!(),
        onChange: (setup) => this.host.setSetup!(setup),
        humanMonster: flat,
      });
      this.setupPanel.render();
      const tile = el('div', 'haunt__tile haunt__tile--setup');
      tile.append(el('strong', '', 'Verteilung der nächsten Runde'), this.setupPanel.element);
      if (this.host.startSetup) {
        const start = el('button', 'haunt__tile haunt__tile--simulation');
        start.dataset['startSetup'] = '';
        const busy = link.vr && !flat;
        start.append(
          el('strong', '', flat ? 'Runde starten (2D)' : 'Runde starten'),
          el(
            'span',
            'haunt__tag',
            busy ? 'Ein Techniker spielt bereits.' : describeSetup(this.host.setup()),
          ),
        );
        start.toggleAttribute('disabled', busy);
        tile.append(start);
      }
      out.push(tile);
    }
    if (flat) {
      const mission = el('button', 'haunt__tile haunt__tile--simulation');
      mission.dataset['mission'] = '';
      mission.append(
        el('strong', '', 'Mission spielen (2D)'),
        el('span', 'haunt__tag', 'Mit Monster · drei Reparaturen, dann zurück zur Zentrale'),
      );
      const test = el('button', 'haunt__tile haunt__tile--simulation');
      test.dataset['test'] = '';
      test.append(
        el('strong', '', 'Test ohne Monster (2D)'),
        el('span', 'haunt__tag', 'Sicher üben · Stock, Werkzeuge und Rätsel kennenlernen'),
      );
      out.push(mission, test);
    } else if (!link.vr) {
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

    for (const role of listRoles()) {
      const id = role.id as StationId;
      const owner = seats.get(id);
      const mine = owner === me;
      const coming = wanted === id && travel > 0;
      const tile = el('button', 'haunt__tile');
      tile.dataset['sit'] = id;
      tile.dataset['accent'] = id;
      tile.setAttribute('aria-pressed', mine ? 'true' : 'false');
      if (mine) tile.classList.add('is-mine');
      else if (owner && !role.shared) tile.classList.add('is-taken');
      if (coming) tile.classList.add('is-coming');

      const head = el('span', 'haunt__tile-head');
      // **Vor dem Fernseher ist immer Platz** — dort steht eine Zahl statt
      // eines Namens: Ein einzelner Name wäre dort die Lüge, dass er besetzt
      // sei, und „besetzt" ist die eine Auskunft, um die es bei den anderen
      // Kacheln überhaupt geht.
      const crowd = role.shared ? crowdAt(claims, id) : 0;
      head.append(
        el('strong', '', role.label),
        el(
          'span',
          `haunt__seat${mine ? ' is-mine' : owner && !role.shared ? ' is-taken' : ''}`,
          role.shared
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
      tile.append(head, el('span', 'haunt__tag', role.tagline));
      // „Sieht:" und nicht „Sieht nicht:" — die Zeile sagt beides in einem
      // Satz, und mit der Verneinung davor stand die halbe Auskunft auf dem Kopf.
      tile.append(el('span', 'haunt__blind', `Sieht: ${role.sees}`));

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
    const state = this.host.state();
    const phase = state.phase;
    if (phase !== 'lost' && phase !== 'won') return [];
    // Der Grund kommt aus den Rundenregeln (`MapRound.ending`); ohne sie bleibt
    // die alte Lesart: Ein Anzug ohne Leben ist zerstört, sonst war es die Uhr.
    const ending =
      this.host.round?.()?.ending ||
      (phase === 'won' ? 'escaped' : state.crew.hp <= 0 ? 'suit' : 'oxygen');
    const box = el('section', `haunt__round-result${phase === 'lost' ? ' is-lost' : ''}`);
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    box.dataset['ending'] = ending;
    box.append(
      el(
        'strong',
        '',
        phase === 'lost'
          ? ending === 'oxygen'
            ? 'Sauerstoff aufgebraucht'
            : 'Verbindung zum Techniker verloren'
          : 'Mission erfüllt',
      ),
      el(
        'p',
        '',
        phase === 'lost'
          ? `${endingText(ending)} Die Runde ist beendet. Ihr könnt einen neuen Einsatz starten.`
          : endingText(ending),
      ),
    );
    if (this.host.restart) {
      const restart = el('button', 'haunt__chart-key', 'Neue Runde starten');
      restart.dataset['restart'] = '';
      box.append(restart);
    }
    return [box];
  }

  // --- Eingaben ---------------------------------------------------------------

  private onClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    const hit = target?.closest<HTMLElement>(
      '[data-sit],[data-van],[data-technician],[data-game-menu],[data-bot-round],[data-mission],[data-test],[data-flat-mode],[data-restart],[data-start-setup]',
    );
    if (!hit) return;

    if (hit.dataset['gameMenu'] !== undefined) {
      this.host.menu?.();
      return;
    } else if (hit.dataset['botRound'] !== undefined) {
      if (!this.host.link().vr || this.host.flatWanted?.()) this.host.botRound?.();
      return;
    } else if (hit.dataset['mission'] !== undefined) {
      this.host.mission?.();
      return;
    } else if (hit.dataset['test'] !== undefined) {
      this.host.test?.();
      return;
    } else if (hit.dataset['startSetup'] !== undefined) {
      if (!this.host.link().vr || this.host.flatWanted?.()) this.host.startSetup?.();
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
    } else if (hit.dataset['sit']) {
      this.host.sit(hit.dataset['sit'] as StationId);
      this.vanOpen = false;
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
