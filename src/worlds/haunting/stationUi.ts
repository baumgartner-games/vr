import './haunting.css';
import { MARKS, namesakes, roomOf, VAN_ID, type HouseRoom, type HouseSpec } from './house';
import { visibleSwitches } from './panel';
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
import { lampRefill, lampSeconds, HOP_TIME, LAMP_MIN, type DroneStatus } from './droneRoute';
import { atHome, type ArchiveView } from './archiveView';
import type { DroneState, HauntState } from './net';

/**
 * **Der Van, wie er auf einem Telefon aussieht.**
 *
 * Zuerst fürs Handy gebaut und auf dem Laptop breiter gezogen, nicht
 * andersherum: Ein Handy-Layout, das man aufzieht, ist immer benutzbar; ein
 * Laptop-Layout, das man zusammenschiebt, nie. Deshalb ist hier alles eine
 * Spalte, alles daumengroß und nichts zum Zielen.
 *
 * **Vier Stationen, vier Sprachen** (`stations.ts`) — und die Oberfläche ist
 * die Stelle, an der die Trennung wirklich durchgesetzt wird:
 *
 * - Das **Archiv** bekommt ein Bild der Welt, aber ohne alles Lebendige (die
 *   Welt blendet es beim Zeichnen aus). Namen ja, Bewegung nein. Sein Blatt
 *   ist der ganze Schirm, es lässt sich heranziehen und verschieben, und die
 *   Akte legt der Menüknopf darüber — dieselbe Form wie beim Piloten.
 * - Der **Späher** bekommt gar kein Bild der Welt, sondern gezeichnete
 *   Konturen: Wände und einen Punkt. Keine Möbel, keine Namen, kein
 *   Mitspieler. Das ist keine Sparmaßnahme — es *ist* seine Rolle.
 * - Die **Drohne** sieht ein Zimmer vollständig, aber nur eins, und der Pilot
 *   navigiert auf der Karte statt im Bild. Sein Bild ist dabei der ganze
 *   Schirm; die Karte legt der Menüknopf darüber und nimmt sie wieder weg.
 * - Die **Schalttafel** sieht vom Haus überhaupt nichts.
 * - Der **Zuschauer** sieht alles: das ganze Haus von schräg oben, bei Tag,
 *   mit allem, was darin herumläuft. Er ist keine fünfte Rolle, sondern der
 *   Fernseher im Raum — und er kann nichts bedienen, damit das so bleibt.
 *
 * Wer hier eine dieser Grenzen aufweicht, weil es „praktischer" wäre, macht
 * aus vier Rollen eine: Sobald eine Station Monster *und* Mitspieler
 * gleichzeitig sieht, lotst sie allein, und die anderen drei sind Deko.
 *
 * **Jede Station hat eine Farbe, und es ist ihre.** Sie steht an der Kachel im
 * Van, am Punkt neben dem Namen in der Kopfzeile und am Rand der eigenen
 * Seite — dieselben vier Töne, die im Haus auf den Monitoren des Vans leuchten
 * (`HauntingWorld.buildVan`). Am Tisch wird zugerufen und nicht gelesen; „ich
 * hab den grünen" ist eine Ansage, „ich hab die dritte Kachel von oben" nicht.
 */
export interface StationHost {
  spec(): HouseSpec;
  state(): HauntState;
  drone(): DroneState;
  claims(): Claim[];
  me(): string;
  nameOf(peer: string): string;
  /** An welchem Gerät ich wirklich sitze — `null`, wenn weggeschubst. */
  seat(): StationId | null;
  /** Und wohin ich unterwegs bin. */
  wanted(): StationId | null;
  /** Wie viele Sekunden das Hinlaufen noch dauert. */
  arriving(): number;
  sit(station: StationId): void;
  flip(id: string, on: boolean): void;
  flyTo(roomId: string): void;
  /** Was die Wegsuche der Drohne gerade sagt (`droneRoute.ts`). */
  droneStatus(): DroneStatus;
  /** Und in welchen Zimmern sie schon war — das Einzige, was sie behält. */
  droneSeen(): ReadonlySet<string>;
  /** Ihren Scheinwerfer umlegen. */
  droneLight(): void;
  /** Wie weit der Pilot gerade neben der Flugrichtung schaut, in Bogenmaß. */
  droneLook(): number;
  /** Und wie weit darüber oder darunter — positiv nach oben. */
  dronePitch(): number;
  /** Weiterdrehen — das Wischen quer über das Bild. */
  droneTurn(radians: number): void;
  /** Weiterkippen — dasselbe Wischen der Höhe nach. */
  droneTilt(radians: number): void;
  /** Wieder geradeaus, und zwar in beiden Achsen. */
  droneFace(): void;
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

/**
 * Wie groß der Späherschirm gezeichnet wird, in Gerätepunkten.
 *
 * Er wird beim Zeichnen an die wirkliche Breite **und** an die Pixeldichte
 * angepasst; die Zahl hier ist nur der Anfangswert, bevor das Element einmal
 * im Layout stand. Eine feste Leinwand auf einem Telefon mit dreifacher Dichte
 * ist ein verwaschenes Bild, und ausgerechnet der Späher hat nichts als
 * Konturen.
 */
const SCOUT_SIZE = 320;

/** Wie weit ein Finger wandern darf und trotzdem ein Tipp bleibt, in Punkten. */
const TAP_SLOP = 8;

/** Wie weit ein Wisch dreht, in Bogenmaß je Punkt. */
const LOOK_RATE = 0.004;

/** Wie weit zwei Finger mindestens auseinanderliegen müssen, damit gezoomt wird. */
const PINCH_MIN = 12;

/** Wie stark das Mausrad zoomt, je Punkt Raddrehung. */
const WHEEL_RATE = 0.0016;

export class StationUi {
  private readonly root = document.createElement('div');
  private readonly bar = document.createElement('header');
  private readonly quest = document.createElement('div');
  private readonly view = document.createElement('div');
  private readonly body = document.createElement('div');
  private readonly scout = document.createElement('canvas');
  /**
   * **Die Ecke oben rechts im Bild**: Menü, Licht, Zurück-Knopf.
   *
   * Sie steht als eigene Zeile zwischen Kopfzeile und Bild und nicht als
   * absolut gesetzte Ecke *im* Bild. Das Bild liegt fest im Hintergrund und
   * damit unter der Kopfzeile; eine Ecke darin läge unter ihr begraben, und
   * eine Ecke mit ausgerechnetem Abstand von oben wäre eine Zahl, die bei
   * jeder Schriftgröße neu falsch ist. Als Zeile im Fluss steht sie von selbst
   * genau unter dem, was über ihr steht.
   */
  private readonly viewTools = document.createElement('div');
  /**
   * **Die Bedienung über das Bild legen und wieder wegnehmen.**
   *
   * Der eine Knopf, den beide Stationen mit Bild teilen — und er bleibt
   * stehen, solange die Bedienung offen ist: Ein Menü, das sich nur über den
   * Umweg „irgendetwas in der Liste antippen" wieder schließen lässt, ist
   * eine Falle, und beim Piloten hieße dieser Umweg, die Drohne loszuschicken.
   */
  private readonly panelKey = document.createElement('button');
  /** Der Scheinwerfer des Piloten — der Griff, den er mitten im Sehen braucht. */
  private readonly lampKey = document.createElement('button');
  /** Und beim Archivar an derselben Stelle: zurück auf das ganze Zimmer. */
  private readonly homeKey = document.createElement('button');
  /** Der Blickstock, unten rechts, wo der Daumen ohnehin liegt. */
  private readonly lookKey = document.createElement('button');

  /** Ob gerade die Geräteübersicht offen ist statt der eigenen Station. */
  private vanOpen = true;
  /**
   * **Ob die Bedienung gerade über dem Bild liegt.**
   *
   * Beide Stationen mit Bild haben dieselbe Form: Das Bild steht über den
   * ganzen Schirm, und die Bedienung ist ein Blatt, das der Menüknopf darüber
   * legt und wieder wegnimmt. Vorher waren es zwei — der Pilot hatte sein
   * Cockpit, der Archivar einen Kinostreifen über einer Kachelwand, den man
   * antippen musste, damit er groß wird. Zwei Oberflächen für dieselbe Sache
   * heißt: Wer das Gerät wechselt, sucht die zweite erst wieder.
   *
   * Weggeblendet und nicht abgebaut: Ein Panel, das beim Wiedereinblenden neu
   * entsteht, kommt oben statt dort zurück, wo man war.
   */
  private panel = false;
  /** Welches Zimmer der Archivar aufgeschlagen hat. */
  selected = '';
  /** Woran erkannt wird, dass die Seite neu geschrieben werden muss. */
  private drawn = '';
  /**
   * Welche Seite zuletzt geschrieben wurde — **wofür der Scrollstand gilt**.
   *
   * Ohne das sprang die Liste bei jedem Knopfdruck nach oben: Die Seite wird
   * neu geschrieben, und eine neu geschriebene Liste fängt oben an. Auf einem
   * Telefon heißt das, dass der Hacker nach jedem Schalter wieder zu seinem
   * Schalter herunterscrollt. Der Stand wird deshalb aufgehoben und nur dann
   * verworfen, wenn wirklich eine **andere** Seite kommt.
   */
  private paged = '';
  /** Der Finger, der gerade über dem Bild zieht. */
  private grab: {
    id: number;
    x: number;
    y: number;
    from: number;
    over: number;
    far: number;
  } | null = null;
  /**
   * **Alle Finger, die auf dem Bild liegen** — für die Zange des Archivars.
   *
   * Der Zoom braucht zwei, und zwei Finger sind zwei Zeiger, die einzeln
   * kommen und einzeln gehen. Ein einzelnes `grab` reicht dafür nicht: Es
   * kennt nur den letzten, und die Zange misst den Abstand zwischen beiden.
   */
  private readonly touches = new Map<number, { x: number; y: number }>();
  /** Wie weit die zwei Finger beim letzten Mal auseinanderlagen, in Punkten. */
  private span = 0;

  constructor(private readonly host: StationHost) {
    this.root.className = 'haunt';
    this.bar.className = 'haunt__bar';
    this.quest.className = 'haunt__quest';
    this.view.className = 'haunt__view';
    this.body.className = 'haunt__body';
    this.scout.className = 'haunt__scout';
    this.scout.width = SCOUT_SIZE;
    this.scout.height = SCOUT_SIZE;

    this.viewTools.className = 'haunt__vtools';
    this.panelKey.className = 'haunt__vbtn';
    this.panelKey.dataset['panel'] = '';
    this.homeKey.className = 'haunt__vbtn';
    this.homeKey.dataset['home'] = '';
    this.homeKey.textContent = '⤢';
    this.homeKey.setAttribute('aria-label', 'Wieder das ganze Zimmer zeigen');
    this.lampKey.className = 'haunt__vbtn haunt__vbtn--lamp';
    this.lampKey.dataset['lamp'] = '';
    this.lookKey.className = 'haunt__vbtn haunt__vbtn--look';
    this.lookKey.textContent = '🕹';
    this.lookKey.setAttribute('aria-label', 'Umsehen: ziehen dreht, tippen stellt geradeaus');
    this.viewTools.append(this.homeKey, this.panelKey, this.lampKey);
    // Der Stock bleibt **im** Bild: Er gehört nach unten rechts an den Daumen
    // und nicht in die Zeile mit den anderen.
    this.view.append(this.lookKey);

    this.root.append(this.bar, this.quest, this.viewTools, this.view, this.body);
    document.body.append(this.root);
    document.body.classList.add('haunt-on');

    this.root.addEventListener('click', (event) => this.onClick(event));
    this.watchDrag(this.view, false);
    this.watchDrag(this.lookKey, true);
    this.watchWheel();
  }

  dispose(): void {
    this.root.remove();
    document.body.classList.remove('haunt-on');
  }

  /** Welche Station gerade zu sehen ist — `null` heißt: die Übersicht im Van. */
  get station(): StationId | null {
    if (this.vanOpen) return null;
    const seat = this.host.seat();
    return seat && this.host.arriving() <= 0 ? seat : null;
  }

  /**
   * Wohin die Welt ihr Bild zeichnen soll, in CSS-Pixeln — oder `null`, wenn
   * diese Station keines hat.
   */
  viewport(): { x: number; y: number; w: number; h: number } | null {
    if (!this.hasView) return null;
    const box = this.view.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) return null;
    return { x: box.left, y: box.top, w: box.width, h: box.height };
  }

  /**
   * **Wie viele Punkte des Bildes oben schon vergeben sind.**
   *
   * Kopfzeile und Auftragsstreifen liegen über dem Bild — beim Piloten ist das
   * gewollt (sein Kamerabild ist der Hintergrund, und ganz oben steht ohnehin
   * Himmel), beim Archivar war es ein Fehler: Sein Grundriss ist genau so groß
   * wie das Bild, und die obere Kante des Zimmers steckte damit hinter der
   * Kopfzeile. Gemessen und nicht geschätzt — eine Zahl im Kopf ist bei der
   * nächsten Schriftgröße wieder falsch.
   */
  headroom(): number {
    const box = this.quest.getBoundingClientRect();
    return Math.max(0, box.bottom);
  }

  /**
   * **Ob das Bild hinter der Bedienung grob gerastert werden soll.**
   *
   * Die Bedienung liegt auf durchsichtigem Grund über dem Bild; ein Bild unter
   * Knöpfen zieht den Blick aber immer auf sich. Gerastert bleibt beim Piloten
   * zu sehen, dass sie fliegt und ob das Licht brennt, und beim Archivar, dass
   * unter der Akte sein Zimmer liegt — und sonst nichts, worauf man hinsehen
   * müsste. Gemacht wird es von der Welt, die die Leinwand besitzt
   * (`HauntingWorld.veilView`).
   */
  get veiled(): boolean {
    return this.hasView && this.panel;
  }

  refresh(): void {
    const state = this.host.state();
    const spec = this.host.spec();
    if (!this.selected) this.selected = spec.rooms[0]?.id ?? '';

    const station = this.station;
    const drone = this.host.drone();
    const status = this.host.droneStatus();
    const sign = [
      spec.seed,
      station ?? 'van',
      this.selected,
      state.phase,
      state.fuse,
      state.monsterOn,
      state.done.length,
      state.taken.length,
      state.lit.join('|'),
      state.loud.join('|'),
      state.shut.join('|'),
      Math.ceil(this.host.arriving()),
      this.host
        .claims()
        .map((claim) => `${claim.id}:${claim.station}`)
        .sort()
        .join('|'),
      Math.round(drone.lamp * 40),
      Math.ceil(drone.hop),
      drone.target,
      drone.light,
      this.panel,
      // Der Zurück-Knopf im Bild kommt und geht mit dem Ausschnitt des
      // Archivars — mehr braucht die Seite von ihm nicht zu wissen.
      atHome(this.host.archiveView()),
      status.kind,
      status.here,
      // Nur auf ganze Meter: Eine Anzeige, die zwanzigmal je Sekunde eine
      // Nachkommastelle ändert, schriebe die Seite zwanzigmal je Sekunde neu.
      Math.round(status.metres),
      this.host.droneSeen().size,
    ].join('/');

    if (sign !== this.drawn) {
      this.drawn = sign;
      this.write();
    }
    // Der Punkt des Spähers wandert zwischen zwei Neuschriften weiter — er ist
    // das Einzige, was sich ohne Knopfdruck ändert.
    if (station === 'scout') this.drawScout();
    this.view.hidden = !this.hasView;
  }

  /** Ob diese Station überhaupt ein Bild der Welt bekommt. */
  private get hasView(): boolean {
    const station = this.station;
    return station === 'archive' || station === 'drone' || station === 'watch';
  }

  // --- schreiben -------------------------------------------------------------

  private write(): void {
    const state = this.host.state();
    const spec = this.host.spec();
    const station = this.station;
    const facts = station ? stationFacts(station) : null;

    // Die Farbe der Station hängt am Wurzelelement und nicht an jeder Kachel
    // einzeln: Von hier aus färbt sie Kopfzeile, Rand und Knöpfe über eine
    // einzige Variable, und eine fünfte Station bekommt eine Zeile im CSS.
    this.root.dataset['station'] = station ?? 'van';
    this.writeShape(station);

    const back = el('button', 'haunt__back');
    back.dataset['van'] = '';
    back.append(
      el('span', 'haunt__back-icon', this.vanOpen ? '▸' : '◂'),
      el('span', '', this.vanOpen ? 'Station' : 'Van'),
    );
    back.setAttribute(
      'aria-label',
      this.vanOpen ? 'Zurück zur eigenen Station' : 'Zur Geräteübersicht im Van',
    );

    const where = el('span', 'haunt__where');
    where.append(
      el('strong', '', facts ? facts.label : 'Van'),
      el('small', '', facts ? facts.tagline : 'Vier Geräte, ein Fernseher, nie genug Leute'),
    );

    const bar: HTMLElement[] = [
      where,
      el(
        'span',
        `haunt__state${state.monsterOn ? ' is-hot' : ''}`,
        state.monsterOn ? 'Monster an' : 'Monster aus',
      ),
    ];
    bar.push(back);
    this.bar.replaceChildren(...bar);

    this.writeQuest(state, spec);

    // **Der Scrollstand bleibt, solange dieselbe Seite bleibt.** Ein Knopf
    // schreibt die Seite neu, und eine neu geschriebene Liste fängt oben an —
    // wer unten auf einen Schalter tippt, stünde danach wieder oben.
    const page = `${station ?? 'van'}/${this.vanOpen ? 'van' : 'seat'}`;
    const keep = page === this.paged ? this.body.scrollTop : 0;
    this.paged = page;
    this.body.replaceChildren(...this.page(station));
    this.body.scrollTop = keep;
  }

  /**
   * **Die Form der Seite**: Bild ganz, Bedienung auf Zuruf.
   *
   * Hängt am Wurzelelement statt an jedem Kasten einzeln — das CSS entscheidet
   * daraus, was wohin rückt, und diese Methode muss nichts über Höhen wissen.
   * Stationen ohne Bild (Späher, Schalttafel) bekommen ihre Liste wieder in
   * den Fluss: Ein Vollbild ohne Bild wäre eine schwarze Fläche mit einem
   * Menüknopf darauf.
   */
  private writeShape(station: StationId | null): void {
    const drone = station === 'drone';
    const view = this.hasView;
    // Die offene Bedienung gehört zu dem Gerät, an dem sie aufgemacht wurde:
    // Wer aufsteht und sich woandershin setzt, sieht dort zuerst sein Bild.
    if (!view) this.panel = false;
    this.root.classList.toggle('is-view', view);
    this.root.classList.toggle('is-panel', view && this.panel);
    this.panelKey.hidden = !view;
    // **Was unter der offenen Bedienung läge, steht gar nicht erst da** — bis
    // auf den Menüknopf selbst, der sie wieder zumacht. Der Scheinwerfer steht
    // dann in der Schalttafel, der Zurück-Knopf hätte kein Bild zum Zurück.
    this.lampKey.hidden = !drone || this.panel;
    // Der Zurück-Knopf kommt erst, wenn es etwas zurückzustellen gibt: Ein
    // Knopf, der nie etwas tut, ist einer, den man beim Zielen trifft.
    this.homeKey.hidden = station !== 'archive' || this.panel || atHome(this.host.archiveView());
    if (view) this.writeKeys(drone);
    // Der Blickstock gehört dem Piloten — beim Archivar dreht sich nichts,
    // seine Kamera hängt senkrecht über dem aufgeschlagenen Zimmer.
    this.lookKey.hidden = !drone || this.panel;
    this.markLook();
    this.viewTools.hidden = !view;
  }

  /**
   * **Die Knöpfe im Bild**, jedes Mal neu beschriftet.
   *
   * Der Scheinwerfer steht hier oben *und* in der Schalttafel, und das ist
   * kein Versehen: Er ist der einzige Griff, den der Pilot mitten im Sehen
   * braucht — Licht an, hinsehen, Licht aus. Wer dafür erst ein Menü aufmachen
   * muss, macht es nicht mehr zu.
   */
  private writeKeys(drone: boolean): void {
    this.panelKey.textContent = this.panel ? '✕' : '☰';
    this.panelKey.setAttribute('aria-expanded', this.panel ? 'true' : 'false');
    const what = drone ? 'Steuerung der Drohne' : 'Akte des Archivars';
    this.panelKey.setAttribute(
      'aria-label',
      this.panel ? `${what} schließen, nur das Bild zeigen` : `${what} einblenden`,
    );
    if (!drone) return;

    const lit = this.host.drone().light;
    const flat = !lit && this.host.drone().lamp < LAMP_MIN;
    this.lampKey.textContent = lit ? '☀' : '☾';
    this.lampKey.classList.toggle('is-on', lit);
    this.lampKey.toggleAttribute('disabled', flat);
    this.lampKey.setAttribute('aria-pressed', lit ? 'true' : 'false');
    this.lampKey.setAttribute(
      'aria-label',
      lit ? 'Scheinwerfer ausschalten' : 'Scheinwerfer einschalten',
    );
  }

  /**
   * Ob der Blickstock gerade neben der Flugrichtung steht.
   *
   * Er ist die einzige Anzeige dafür: Wer sich umgesehen und es vergessen hat,
   * sucht sonst ein Zimmer, das hinter ihm liegt, und hält die Drohne für
   * kaputt. Gesetzt wird die Klasse **ohne** die Seite neu zu schreiben — beim
   * Wischen liefe sonst je Bild ein Neuaufbau der ganzen Liste.
   */
  private markLook(): void {
    const off = Math.abs(this.host.droneLook()) > 0.05 || Math.abs(this.host.dronePitch()) > 0.05;
    this.lookKey.classList.toggle('is-off', off);
  }

  /**
   * **Der Auftragsstreifen** — ein Feld je Sache, und drei Zustände.
   *
   * `0/3` sagt, wie viele es sind; es sagt nicht, dass eine davon gerade in der
   * Hand des VR-Spielers liegt und noch nicht im Van. Genau dieser Unterschied
   * ist am Tisch die Frage, die gestellt wird („hast du sie schon abgelegt?"),
   * und drei Kästchen beantworten sie ohne ein Wort.
   */
  private writeQuest(state: HauntState, spec: HouseSpec): void {
    const pips = spec.tasks.map((task) => {
      const done = state.done.includes(task.id);
      const held = !done && state.taken.includes(task.id);
      const pip = el('i', `haunt__pip${done ? ' is-done' : held ? ' is-held' : ''}`);
      pip.title = `${task.label} — ${done ? 'im Van' : held ? 'in der Hand' : 'noch im Haus'}`;
      return pip;
    });
    const held = spec.tasks.filter(
      (task) => state.taken.includes(task.id) && !state.done.includes(task.id),
    ).length;

    const strip = el('span', 'haunt__pips');
    strip.append(...pips);
    this.quest.replaceChildren(
      el('span', 'haunt__quest-label', 'Auftrag'),
      strip,
      el(
        'span',
        'haunt__quest-count',
        `${state.done.length}/${spec.tasks.length}${held > 0 ? ` · ${held} unterwegs` : ''}`,
      ),
    );
    this.quest.setAttribute(
      'aria-label',
      `${state.done.length} von ${spec.tasks.length} Sachen im Van`,
    );
  }

  private page(station: StationId | null): HTMLElement[] {
    if (station === null) return this.vanPage();
    if (station === 'archive') return this.archivePage();
    if (station === 'scout') return this.scoutPage();
    if (station === 'drone') return this.dronePage();
    if (station === 'watch') return this.watchPage();
    return this.hackPage();
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
    const out: HTMLElement[] = [];

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
      // sei, und „besetzt" ist die eine Auskunft, um die es bei den vier
      // anderen Kacheln überhaupt geht.
      const crowd = station.shared ? crowdAt(claims, station.id) : 0;
      head.append(
        el('strong', '', station.label),
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
      tile.append(head, el('span', 'haunt__tag', station.tagline));
      // „Sieht:" und nicht „Sieht nicht:" — die Zeile sagt beides in einem
      // Satz („Räume und was darin steht — aber niemanden, der sich bewegt"),
      // und mit der Verneinung davor stand die halbe Auskunft auf dem Kopf.
      tile.append(el('span', 'haunt__blind', `Sieht: ${station.sees}`));

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

  /** Der Archivar: eine Akte, in der man **ein** Zimmer aufschlägt. */
  private archivePage(): HTMLElement[] {
    const spec = this.host.spec();
    const state = this.host.state();
    const room = roomOf(spec, this.selected) ?? spec.rooms[0];
    const out: HTMLElement[] = [];

    out.push(head('Auftrag'));
    const tasks = el('div', 'haunt__tasks');
    for (const task of spec.tasks) {
      const done = state.done.includes(task.id);
      const held = !done && state.taken.includes(task.id);
      const row = el('p', `haunt__task-row${done ? ' is-done' : held ? ' is-held' : ''}`);
      row.append(el('strong', '', task.label), el('span', '', ` ${task.hint}`));
      // Nur was vom Normalfall abweicht, bekommt ein Schild. Drei Zeilen mit
      // dreimal „noch im Haus" sind drei Schilder, die nichts unterscheiden —
      // und dann sieht man das eine nicht mehr, das etwas sagt.
      if (done || held) {
        row.append(el('span', 'haunt__chip', done ? 'im Van' : 'in der Hand'));
      }
      tasks.append(row);
    }
    out.push(tasks);

    out.push(head('Akte', `${spec.rooms.length} Zimmer`));
    const list = el('div', 'haunt__rooms');
    for (const one of spec.rooms) {
      const entry = el('button', 'haunt__room');
      entry.dataset['room'] = one.id;
      const open = one.id === room?.id;
      entry.setAttribute('aria-pressed', open ? 'true' : 'false');
      if (open) entry.classList.add('is-open');
      entry.append(el('span', '', one.name));
      if (namesakes(spec, one) > 1) entry.append(el('span', 'haunt__twin', 'zweimal im Haus'));
      list.append(entry);
    }
    out.push(list);

    if (room) {
      out.push(head(room.name, 'aufgeschlagen'));
      const sheet = el('div', 'haunt__sheet');
      sheet.append(
        fact('Darin steht', room.marks.map((m) => MARKS[m.id]).join(', ')),
        fact('Licht', room.lamp ? 'Eine Lampe unter der Decke.' : 'Keine. Bleibt dunkel.'),
      );
      const doors = spec.doors.filter((door) => door.a === room.id || door.b === room.id);
      // **Wie viele davon zu sind**, steht dabei. Das ist keine Auskunft aus
      // dem Nichts: Es steht auf seinem Blatt, seit die Türen dort gezeichnet
      // werden. Als Zahl daneben spart es das Abzählen im Bild — und es ist
      // genau der Satz, mit dem er den Hacker anruft.
      const closed = doors.filter((door) => state.shut.includes(door.id)).length;
      sheet.append(
        fact(
          doors.length === 1 ? 'Tür' : 'Türen',
          `${doors.length}${doors.some((door) => door.material === 'metal') ? ', eine davon aus Stahl' : ''}${
            closed === 0 ? '' : closed === 1 ? ' — eine steht zu' : ` — ${closed} stehen zu`
          }`,
        ),
      );
      if (spec.fuse.roomId === room.id) {
        sheet.append(fact('Achtung', 'Hier hängt der Sicherungskasten.', true));
      }
      out.push(sheet);
      // Die zwei Griffe am Bild, einmal gesagt. Sie stehen hier unten und
      // nicht als Kachel obenauf: Wer sie einmal gelesen hat, liest sie nie
      // wieder, und eine Zeile, die immer oben steht, verdeckt jedes Mal die
      // erste Zeile der Akte.
      out.push(
        el(
          'span',
          'haunt__blind',
          'Auf dem Blatt: helle Linien sind Wände, eine Lücke mit Bogen ist eine offene Tür, ein dunkler Riegel eine zu.',
        ),
      );
      out.push(
        el('span', 'haunt__blind', 'Ziehen verschiebt, zwei Finger oder das Mausrad ziehen heran.'),
      );
    }
    return out;
  }

  /** Der Späher: Konturen und ein Punkt. Sonst nichts, mit Absicht. */
  private scoutPage(): HTMLElement[] {
    const state = this.host.state();
    const frame = el('div', `haunt__radar${state.monster ? '' : ' is-empty'}`);
    frame.append(this.scout);
    if (!state.monster) {
      frame.append(
        el('span', 'haunt__radar-empty', state.monsterOn ? 'Kein Signal' : 'Schirm leer'),
      );
    }
    return [
      frame,
      note(
        state.monsterOn ? 'live' : 'calm',
        state.monsterOn ? 'Es bewegt sich' : 'Nichts im Haus',
        state.monsterOn
          ? 'Beschreib die Form — Namen hast du keine. Wände, Türlücken und ein Punkt, mehr gibt der Schirm nicht her.'
          : 'Der VR-Spieler hat das Monster ausgeschaltet. Solange er es lässt, bleibt dein Schirm dunkel.',
      ),
    ];
  }

  /**
   * **Die Schalttafel des Piloten**: Licht, Sperre und die Karte.
   *
   * Sie liegt nicht dauerhaft unter dem Bild, sondern kommt auf den Menüknopf
   * hin darüber (`panel`) — sein Bild ist der ganze Schirm. Drei Sachen kann
   * er, und sie stehen in der Reihenfolge, in der man sie braucht: sehen
   * (Scheinwerfer), wissen, wann er wieder darf (Wechselsperre), und
   * hinfliegen (Karte). Die Karte ist keine Karte, sondern eine Liste — der
   * Grundriss gehört dem Archivar, und ein Pilot mit Grundriss lotste allein.
   *
   * **Beide Anzeigen erholen sich**, und das ist der ganze Unterschied zum
   * Akku, der vorher hier stand: Wer sich verausgabt, wartet — er verliert
   * nicht seine Rolle (`droneRoute.ts`).
   */
  private dronePage(): HTMLElement[] {
    const spec = this.host.spec();
    const drone = this.host.drone();
    const status = this.host.droneStatus();
    const seen = this.host.droneSeen();
    const home = status.here === VAN_ID;
    const out: HTMLElement[] = [];

    // --- Der Scheinwerfer, mit seiner eigenen Ladung.
    const lit = drone.light;
    const flat = !lit && drone.lamp < LAMP_MIN;
    const lamp = el(
      'button',
      `haunt__lamp${lit ? ' is-on' : ''}${flat ? ' is-flat' : ''}${home ? ' is-home' : ''}`,
    );
    lamp.dataset['lamp'] = '';
    if (flat) lamp.setAttribute('disabled', '');
    lamp.setAttribute('aria-pressed', lit ? 'true' : 'false');
    const lampRail = el('span', 'haunt__rail');
    const lampFill = el('i', '');
    lampFill.style.width = `${Math.round(drone.lamp * 100)}%`;
    lampRail.append(lampFill);
    lamp.append(
      el('span', 'haunt__lamp-bulb', lit ? '☀' : '☾'),
      el('span', 'haunt__lamp-text', lit ? 'Scheinwerfer an' : 'Scheinwerfer aus'),
      lampRail,
      el('span', 'haunt__tag', lampWords(drone, home)),
    );

    // --- Die Wechselsperre: der zweite Takt, an dem der Pilot hängt.
    const free = drone.hop <= 0;
    const gauge = el('div', `haunt__gauge${free ? '' : ' is-wait'}`);
    const rail = el('span', 'haunt__rail');
    const fill = el('i', '');
    // Von leer auf voll: Man soll die Freigabe *ankommen* sehen.
    fill.style.width = `${Math.round((1 - Math.min(1, drone.hop / HOP_TIME)) * 100)}%`;
    rail.append(fill);
    gauge.append(
      el('span', 'haunt__gauge-num', free ? 'frei' : `${Math.ceil(drone.hop)} s`),
      rail,
      el(
        'span',
        'haunt__tag',
        free
          ? `Ein Zimmer antippen. Danach bleibt sie ${HOP_TIME} s, wo sie ist.`
          : 'Sie wechselt das Zimmer nicht öfter. Solange: hinsehen und ansagen.',
      ),
    );

    const cockpit = el('div', 'haunt__cockpit');
    cockpit.append(lamp, gauge);
    out.push(cockpit);

    // --- Nur was schiefgeht, bekommt eine eigene Kachel. „Unterwegs nach X"
    // stand vorher hier und sagte nichts, was nicht schon an der Zielkachel
    // steht — eine Zeile, die immer da ist, liest nach zwei Minuten niemand.
    const trouble = this.droneNote(status, drone);
    if (trouble) out.push(trouble);

    // --- Die Zimmerliste.
    out.push(
      head('Wohin?', free ? 'noch einmal antippen bricht ab' : `frei in ${Math.ceil(drone.hop)} s`),
    );

    // **Der Van steht über der Zimmerliste und nicht darin.** Er ist kein
    // Zimmer, sondern die Stelle, an der sie lädt — und ein Ziel, das man
    // *immer* ansteuern kann, gehört nicht zwischen sieben, die je nach Tür
    // gehen oder nicht.
    const back = el('button', `haunt__cell haunt__cell--van${home ? ' is-here' : ''}`);
    back.dataset['fly'] = VAN_ID;
    const backTarget = drone.target === VAN_ID;
    back.setAttribute('aria-pressed', backTarget ? 'true' : 'false');
    if (backTarget) back.classList.add('is-target');
    if (!free && !backTarget) back.setAttribute('disabled', '');
    const backLine = el('span', 'haunt__cell-head');
    // Wer schon dort steht, liest kein „zurück".
    backLine.append(el('span', '', home ? 'Am Van' : 'Zurück zum Van'));
    if (home) backLine.append(el('span', 'haunt__chip haunt__chip--here', 'hier'));
    else if (backTarget) {
      const far = status.kind === 'blocked' ? 'zu' : `${Math.max(1, Math.round(status.metres))} m`;
      backLine.append(el('span', 'haunt__chip haunt__chip--go', `Ziel · ${far}`));
    }
    back.append(
      backLine,
      el(
        'span',
        'haunt__tag',
        home
          ? 'Am Kabel: der Scheinwerfer zehrt nicht und lädt schnell.'
          : 'Draußen vor der Haustür. Dort lädt der Scheinwerfer im Schnellgang.',
      ),
    );
    out.push(back);

    const grid = el('div', 'haunt__map');
    for (const room of spec.rooms) {
      const cell = el('button', 'haunt__cell');
      cell.dataset['fly'] = room.id;
      const target = drone.target === room.id;
      const here = status.here === room.id;
      cell.setAttribute('aria-pressed', target ? 'true' : 'false');
      if (target) cell.classList.add('is-target');
      if (here) cell.classList.add('is-here');
      // Gesperrt ist nur das **nächste** Zimmer, nie der Abbruch: Ein Knopf,
      // der eine Fehleingabe vierzehn Sekunden festhält, ist eine Strafe fürs
      // Danebentippen.
      if (!free && !target) cell.setAttribute('disabled', '');
      const line = el('span', 'haunt__cell-head');
      line.append(el('span', '', room.name));
      if (here) line.append(el('span', 'haunt__chip haunt__chip--here', 'hier'));
      else if (target) {
        // Die Meter stehen an der Zielkachel und nicht in einer eigenen Zeile:
        // Sie gehören zu dem Zimmer, um das es geht.
        const far =
          status.kind === 'blocked' ? 'zu' : `${Math.max(1, Math.round(status.metres))} m`;
        line.append(el('span', 'haunt__chip haunt__chip--go', `Ziel · ${far}`));
      } else if (seen.has(room.id)) line.append(el('span', 'haunt__chip', 'gesehen'));
      cell.append(line, el('span', 'haunt__tag', shapeOf(room)));
      // Zwillinge heißen gleich, und auf einer Liste sind zwei gleiche Zeilen
      // ein Zufallsknopf. Die Nummer sagt nicht, welches welches ist — sie sagt
      // nur, dass es zwei sind, und das ist genau die Auskunft, die der Pilot
      // dem Archivar zurufen muss.
      if (namesakes(spec, room) > 1) {
        cell.append(el('span', 'haunt__twin', `Namensvetter · ${roomNumber(spec, room)}`));
      }
      grid.append(cell);
    }
    out.push(grid);
    return out;
  }

  /**
   * Die eine Zeile, in der die Wegsuche zum Piloten spricht — **oder keine**.
   *
   * Sie meldet sich nur, wenn etwas nicht geht. `blocked` ist die Zeile, auf
   * die es ankommt: die Stelle, an der aus einer Wegsuche eine Ansage an den
   * Rest des Vans wird — *irgendwo dazwischen ist zu, macht auf*. Dass sie
   * fliegt und wie weit noch, steht an ihrer Zielkachel.
   */
  private droneNote(status: DroneStatus, drone: DroneState): HTMLElement | null {
    if (status.kind !== 'blocked') return null;
    const spec = this.host.spec();
    const where = placeName(spec, status.here) ?? 'zwischen zwei Zimmern';
    const goal = placeName(spec, drone.target) ?? '';
    return note(
      'warn',
      'Kein Weg',
      `Sie steht in ${where}. Zwischen hier und ${goal} ist etwas zu — sie macht keine Tür auf. Ruf es in den Van.`,
    );
  }

  /**
   * **Der Fernseher.** Alles zu sehen, nichts zu bedienen.
   *
   * Er ist die einzige Station ohne einen einzigen Knopf, und das ist seine
   * ganze Bauart: Wer alles sieht *und* etwas tun kann, ist kein Zuschauer
   * mehr, sondern der fünfte Spieler mit den besten Karten — und dann sind die
   * anderen vier Deko. Deshalb steht hier nur, was das Bild ist und was man
   * damit **nicht** macht.
   */
  private watchPage(): HTMLElement[] {
    const state = this.host.state();
    return [
      note(
        'live',
        'Das ganze Haus, bei Tag',
        'Von schräg oben, ohne Decke, mit allem darin: den Sachen, der Drohne, dem Mitspieler — und dem Monster, wenn es an ist. Für den Fernseher im Raum gedacht, nicht fürs Telefon in der Hand.',
      ),
      note(
        'warn',
        'Und du sagst nichts',
        'Du siehst, was vier andere sich gerade mühsam zusammenrufen. Ein Zuruf von dir beendet die Runde schneller als das Monster — zusehen ist die ganze Rolle.',
      ),
      note(
        state.monsterOn ? 'live' : 'calm',
        state.monsterOn ? 'Das Monster ist an' : 'Das Monster ist aus',
        state.monsterOn
          ? 'Es läuft im Haus herum, und du siehst es. Die im Van sehen es nicht — der Späher hat einen Punkt, sonst niemand etwas.'
          : 'Der VR-Spieler hat es ausgeschaltet. Solange bleibt das Haus leer, und alle üben.',
      ),
    ];
  }

  /** Der Hacker: Schalter, und keiner sagt, wo er hingeht. */
  private hackPage(): HTMLElement[] {
    const spec = this.host.spec();
    const state = this.host.state();
    const list = visibleSwitches(spec.switches, state.fuse);
    const out: HTMLElement[] = [];

    out.push(
      note(
        state.fuse ? 'live' : 'calm',
        state.fuse ? 'Volle Tafel' : 'Halbe Tafel',
        state.fuse
          ? 'Der Sicherungskasten ist umgelegt. Mehr Schalter als das hier gibt es nicht.'
          : 'Der Rest hängt am Sicherungskasten im Haus. Der Archivar weiß, in welchem Zimmer er hängt.',
      ),
    );

    out.push(head('Tafel', `${list.length} Schalter`));
    const grid = el('div', 'haunt__switches');
    for (const entry of list) {
      const on =
        entry.kind === 'door'
          ? !state.shut.includes(entry.target)
          : entry.kind === 'light'
            ? state.lit.includes(entry.target)
            : state.loud.includes(entry.target);
      const key = el('button', `haunt__switch${on ? ' is-on' : ''}`);
      key.dataset['flip'] = entry.id;
      key.dataset['on'] = on ? '1' : '0';
      key.setAttribute('aria-pressed', on ? 'true' : 'false');
      const knob = el('span', 'haunt__knob');
      knob.append(el('i', ''));
      key.append(el('span', 'haunt__switch-label', entry.label), knob);
      grid.append(key);
    }
    out.push(grid);
    out.push(
      note(
        'calm',
        'Die Beschriftungen lügen nie',
        'Sie sind nur unvollständig. „Tür 3" ist wirklich eine Tür — wo, sagt niemand.',
      ),
    );
    return out;
  }

  // --- der Späherschirm -------------------------------------------------------

  /**
   * **Wände und ein Punkt.**
   *
   * Gezeichnet wird nur, was in der Nähe des Monsters liegt: sein Zimmer hell,
   * die angrenzenden schwach. Der Späher kann das Haus damit nicht absuchen —
   * er wird herumgeschleift und kann nur beschreiben, was er gerade sieht.
   * Genau deshalb muss ihm jemand zurufen, ob das der eigene Raum ist.
   *
   * **Die Leinwand hängt an der Pixeldichte** und nicht an einer festen Zahl.
   * Auf einem Telefon mit dreifacher Dichte war ein 260er Bild auf 320 Punkte
   * gezogen, und ausgerechnet der Späher hat nichts als Konturen — ein
   * verwaschener Strich ist bei ihm kein Schönheitsfehler, sondern die
   * Auskunft.
   */
  private drawScout(): void {
    const ctx = this.scout.getContext('2d');
    const spec = this.host.spec();
    const state = this.host.state();
    if (!ctx) return;

    const box = this.scout.getBoundingClientRect();
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const size = Math.max(120, Math.round(Math.min(box.width || SCOUT_SIZE, 420) * dpr));
    if (this.scout.width !== size) {
      this.scout.width = size;
      this.scout.height = size;
    }

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, size, size);

    // Ein Fadenkreuz, damit ein leerer Schirm nach *Schirm* aussieht und nicht
    // nach kaputtem Bild. Es sagt nichts über das Haus — es sagt nur, dass das
    // Gerät läuft.
    ctx.strokeStyle = 'rgba(90, 130, 190, 0.16)';
    ctx.lineWidth = Math.max(1, dpr * 0.5);
    for (const ring of [0.22, 0.44, 0.66]) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * ring, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
    if (!state.monster) return;

    const here = roomAtMetres(spec, state.monster.x, state.monster.z);
    if (!here) return;
    const near = spec.rooms.filter((room) => room.id === here.id || touches(room, here));

    // Der Ausschnitt folgt dem Monster und nicht dem Haus: eine feste Karte
    // wäre wieder ein Grundriss, und den hat der Archivar.
    const span = 5;
    const scale = size / (span * 2.5);
    const cx = state.monster.x;
    const cz = state.monster.z;
    const px = (x: number): number => size / 2 + (x - cx) * scale;
    const pz = (z: number): number => size / 2 + (z - cz) * scale;

    for (const room of near) {
      const own = room.id === here.id;
      ctx.strokeStyle = own ? '#8fb7ff' : '#2b3547';
      ctx.lineWidth = (own ? 2 : 1) * dpr;
      const x = px(room.rect.x * 2.5);
      const z = pz(room.rect.z * 2.5);
      ctx.strokeRect(x, z, room.rect.w * 2.5 * scale, room.rect.d * 2.5 * scale);
    }

    // Die Türen als Lücken andeuten — die Form eines Zimmers ist auch, wo man
    // hineinkommt.
    for (const door of spec.doors) {
      if (!near.some((room) => room.id === door.a || room.id === door.b)) continue;
      ctx.fillStyle = '#586880';
      const r = 3 * dpr;
      ctx.fillRect(px((door.x + 0.5) * 2.5) - r, pz((door.z + 0.5) * 2.5) - r, r * 2, r * 2);
    }

    // Der Punkt bekommt einen Hof: Auf einem hellen Telefon im Sonnenlicht ist
    // ein sechs Punkt großer Kreis auf schwarzem Grund schlicht nicht da.
    const glow = ctx.createRadialGradient(px(cx), pz(cz), 0, px(cx), pz(cz), 18 * dpr);
    glow.addColorStop(0, 'rgba(255, 90, 90, 0.55)');
    glow.addColorStop(1, 'rgba(255, 90, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(px(cx) - 18 * dpr, pz(cz) - 18 * dpr, 36 * dpr, 36 * dpr);
    ctx.beginPath();
    ctx.fillStyle = '#ff5a5a';
    ctx.arc(px(cx), pz(cz), 5 * dpr, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Eingaben ---------------------------------------------------------------

  private onClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    const hit = target?.closest<HTMLElement>(
      '[data-sit],[data-room],[data-fly],[data-flip],[data-van],[data-lamp],[data-home],[data-panel]',
    );
    if (!hit) return;

    if (hit.dataset['van'] !== undefined) {
      this.vanOpen = !this.vanOpen;
    } else if (hit.dataset['panel'] !== undefined) {
      this.panel = !this.panel;
    } else if (hit.dataset['home'] !== undefined) {
      this.host.archiveHome();
    } else if (hit.dataset['lamp'] !== undefined) {
      this.host.droneLight();
    } else if (hit.dataset['sit']) {
      this.host.sit(hit.dataset['sit'] as StationId);
      this.vanOpen = false;
      // Wer sich neu hinsetzt, fängt beim ganzen Zimmer an — ein geerbter
      // Ausschnitt aus der vorigen Sitzung ist ein Bild, das niemand versteht.
      this.host.archiveHome();
    } else if (hit.dataset['room']) {
      this.selected = hit.dataset['room'];
      // Der Ausschnitt steht wieder auf dem ganzen Zimmer statt im Zoom des
      // vorigen Blattes — ein geerbter Ausschnitt gehörte zu einem anderen
      // Grundriss. **Die Akte bleibt dabei offen**: Der Archivar blättert,
      // liest, blättert weiter, und eine Akte, die bei jedem Blatt zuklappt,
      // macht aus dem Vergleich zweier Zimmer zweimal Menü aufmachen.
      this.host.archiveHome();
    } else if (hit.dataset['fly']) {
      this.host.flyTo(hit.dataset['fly']);
      // **Losgeschickt heißt hinsehen.** Wer ein Zimmer antippt, will als
      // Nächstes das Bild — eine Schalttafel, die danach noch darüber liegt,
      // wird bei jedem Flug einmal von Hand weggeräumt.
      this.panel = false;
    } else if (hit.dataset['flip']) {
      this.host.flip(hit.dataset['flip'], hit.dataset['on'] !== '1');
    }
    this.drawn = '';
    this.refresh();
  }

  /**
   * **Ein Finger über dem Bild: Tipp, Wisch — oder zwei Finger, eine Zange.**
   *
   * Tipp und Wisch trennt die zurückgelegte Strecke und nicht die Zeit: Ohne
   * die Schwelle wäre jeder Wisch am Ende auch ein Tipp. Was der Wisch tut,
   * hängt an der Station — der Pilot sieht sich um, der Archivar schiebt sein
   * Blatt unter dem Fenster durch. Beides ist dieselbe Geste, weil beides
   * dasselbe Bedürfnis ist: *da drüben will ich hinsehen*.
   *
   * `setPointerCapture` hält den Finger am Element fest, auch wenn er darüber
   * hinauswandert — sonst bliebe die Drohne mitten im Schwenk stehen, sobald
   * der Daumen den Bildrand streift.
   *
   * @param stick ob das Element der Blickstock ist. Er dreht immer und schaltet
   *   nie etwas um; ein Tipp auf ihn stellt den Blick wieder geradeaus.
   */
  private watchDrag(node: HTMLElement, stick: boolean): void {
    node.addEventListener('pointerdown', (event: PointerEvent) => {
      // Die Knöpfe im Bild sind Knöpfe und keine Ziehfläche.
      if (!stick && (event.target as Element | null)?.closest('.haunt__vbtn')) return;
      node.setPointerCapture(event.pointerId);
      event.preventDefault();
      if (!stick) {
        this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.touches.size > 1) {
          // **Der zweite Finger macht aus dem Zug eine Zange.** Der laufende
          // Zug hört dabei auf: Sonst schöbe das Aufsetzen des zweiten Fingers
          // das Blatt einmal quer durchs Bild, bevor der Zoom anfängt.
          this.grab = null;
          this.span = this.pinchSpan();
          return;
        }
      }
      this.grab = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        from: event.clientX,
        over: event.clientY,
        far: 0,
      };
    });

    node.addEventListener('pointermove', (event: PointerEvent) => {
      const touch = this.touches.get(event.pointerId);
      if (touch) {
        touch.x = event.clientX;
        touch.y = event.clientY;
      }
      if (!stick && this.touches.size > 1) {
        this.pinchZoom();
        return;
      }

      const grab = this.grab;
      if (!grab || grab.id !== event.pointerId) return;
      const step = event.clientX - grab.from;
      const rise = event.clientY - grab.over;
      grab.from = event.clientX;
      grab.over = event.clientY;
      grab.far = Math.max(grab.far, Math.hypot(event.clientX - grab.x, event.clientY - grab.y));

      const station = this.station;
      if (station === 'drone') {
        // Nach rechts gewischt heißt nach rechts geschaut, nach oben gewischt
        // nach oben — dieselbe Richtung wie die Maus im Fenster
        // (`core/FlatControls.ts`). Beide Achsen am selben Finger: Eine Drohne,
        // die nur waagerecht schwenkt, findet nie, was unter dem Tisch liegt.
        this.host.droneTurn(-step * LOOK_RATE);
        this.host.droneTilt(-rise * LOOK_RATE);
        this.markLook();
        return;
      }
      // Beim Archivar folgt das Blatt dem Finger: Wer nach rechts zieht, zieht
      // das Zimmer nach rechts, nicht die Kamera. Gemessen wird in Anteilen des
      // Bildes — wie viele Meter ein Punkt ist, hängt am Ausschnitt, und den
      // kennt die Welt.
      if (station === 'archive' && !stick) {
        const box = this.view.getBoundingClientRect();
        this.host.archivePan(step / Math.max(1, box.width), rise / Math.max(1, box.height));
      }
    });

    const drop = (event: PointerEvent): void => {
      if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
      const pinched = !stick && this.touches.size > 1;
      this.touches.delete(event.pointerId);
      if (pinched) {
        // Von der Zange zurück auf einen Finger: Der übrig gebliebene fängt
        // dort an, wo er gerade liegt, und holt den Weg des abgehobenen nicht
        // nach. `far` steht dabei schon über der Tipp-Schwelle — was als Zange
        // angefangen hat, ist am Ende kein Tipp.
        this.span = 0;
        const [id, spot] = [...this.touches.entries()][0] ?? [];
        this.grab =
          id === undefined || !spot
            ? null
            : { id, x: spot.x, y: spot.y, from: spot.x, over: spot.y, far: TAP_SLOP + 1 };
        return;
      }

      const grab = this.grab;
      if (!grab || grab.id !== event.pointerId) return;
      this.grab = null;
      if (grab.far > TAP_SLOP) return;
      if (stick) {
        if (this.station === 'drone') this.host.droneFace();
        this.markLook();
        return;
      }
      // **Ein Tipp aufs Bild tut nichts.** Beide Stationen haben ihr Bild
      // immer ganz, und ein Finger, der beim Umsehen oder beim Schieben kurz
      // stehen bleibt, darf die Ansicht nicht umwerfen. Was es umzuschalten
      // gibt, hat einen Knopf.
    };
    node.addEventListener('pointerup', drop);
    node.addEventListener('pointercancel', drop);
  }

  /** Wie weit die zwei Finger gerade auseinanderliegen, in Punkten. */
  private pinchSpan(): number {
    const [a, b] = [...this.touches.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /**
   * **Zwei Finger auseinander heißt näher heran.**
   *
   * Verrechnet wird das Verhältnis der Abstände und nicht ihre Differenz: So
   * zieht dieselbe Fingerbewegung nah wie fern gleich weit, und die Zange
   * fühlt sich an wie überall sonst. Unter ein paar Punkten Abstand wird gar
   * nichts gerechnet — dort steht im Nenner beinahe eine Null, und der Zoom
   * spränge beim Aufsetzen an den Anschlag.
   */
  private pinchZoom(): void {
    const span = this.pinchSpan();
    if (this.span > PINCH_MIN && span > PINCH_MIN) this.host.archiveZoom(span / this.span);
    this.span = span;
  }

  /**
   * **Das Mausrad ist die Zange am Laptop.**
   *
   * `passive: false`, weil die Seite sonst mitscrollt: Ein Rad über dem Bild
   * soll das Zimmer heranziehen und nicht die Akte darunter verschieben.
   * Gerechnet wird über die Exponentialfunktion — zwei Rasten hinein und zwei
   * heraus stehen dann wieder genau dort, wo man angefangen hat.
   */
  private watchWheel(): void {
    this.view.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        if (this.station !== 'archive') return;
        event.preventDefault();
        this.host.archiveZoom(Math.exp(-wheelStep(event) * WHEEL_RATE));
      },
      { passive: false },
    );
  }
}

// --- Kleinkram ---------------------------------------------------------------

/**
 * Wie weit ein Rad gedreht wurde, in Punkten.
 *
 * Ein Mausrad meldet Punkte, manche Trackpads und Firefox melden Zeilen oder
 * ganze Seiten (`deltaMode`). Ohne die Umrechnung wären drei gemeldete Zeilen
 * drei Punkte, und das Rad täte scheinbar nichts.
 */
function wheelStep(event: WheelEvent): number {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
  return event.deltaY * unit;
}

function el(tag: string, className: string, text = ''): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // `textContent` und nie `innerHTML`: Durch hier gehen Spielernamen, und die
  // hat sich niemand ausgesucht.
  if (text) node.textContent = text;
  return node;
}

/** Eine Zwischenüberschrift mit einer kleinen Beisage rechts. */
function head(title: string, aside = ''): HTMLElement {
  const node = el('h2', 'haunt__h');
  node.append(el('span', '', title));
  if (aside) node.append(el('span', 'haunt__h-aside', aside));
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

/** Eine Zeile im Aktenblatt: Begriff links, Auskunft rechts. */
function fact(label: string, value: string, warn = false): HTMLElement {
  const row = el('div', `haunt__fact${warn ? ' is-warn' : ''}`);
  row.append(el('span', 'haunt__fact-key', label), el('span', 'haunt__fact-value', value));
  return row;
}

/**
 * **Was unter dem Lichtknopf steht** — und es sind drei verschiedene Sätze.
 *
 * Brennt er, zählt die Ladung herunter; ist er aus und nicht voll, zählt sie
 * hinauf. Nur die volle Lampe bekommt den Satz, der sagt, wofür der Knopf
 * überhaupt da ist: Eine Zahl, die nichts mehr zu melden hat, ist Platz für
 * die Regel.
 */
function lampWords(drone: DroneState, home: boolean): string {
  // Am Van gibt es keine Restlaufzeit, weil nichts abläuft — und ein Zähler,
  // der eine Zahl nennt, die nicht zählt, ist eine Lüge mit Nachkommastelle.
  if (home && drone.lamp >= 1) return 'Am Kabel. Leuchte, so lange du willst.';
  if (home) return `Am Kabel · voll in ${Math.round(lampRefill(drone.lamp, true))} s`;
  if (drone.light) return `noch ~${Math.round(lampSeconds(drone.lamp))} s Licht — er frisst Ladung`;
  if (drone.lamp < LAMP_MIN) return `leer. Voll in ${Math.round(lampRefill(drone.lamp))} s`;
  if (drone.lamp < 1) return `lädt · voll in ${Math.round(lampRefill(drone.lamp))} s`;
  return 'Ein Kegel nach vorn. Er hilft dem VR-Spieler mehr als dir.';
}

/**
 * Wie ein Ort heißt, den die Drohne ansteuert — Zimmer oder Van.
 *
 * `null`, wenn es keiner ist: Zwischen zwei Kacheln steht sie nirgends, und
 * ein Satz, der „sie steht in " sagt, hat dort besser gar keinen Namen.
 */
function placeName(spec: HouseSpec, id: string): string | null {
  if (id === VAN_ID) return 'am Van';
  return roomOf(spec, id)?.name ?? null;
}

/** Die Form eines Zimmers, wie man sie einem Späher zurufen würde. */
function shapeOf(room: HouseRoom): string {
  const { w, d } = room.rect;
  if (w === d) return `${w}×${d}, quadratisch`;
  return `${w}×${d}, ${w > d ? 'quer' : 'hoch'}`;
}

/** Das wievielte Zimmer dieses Namens es in der Liste ist — 1, 2, … */
function roomNumber(spec: HouseSpec, room: HouseRoom): number {
  return spec.rooms.filter((one) => one.name === room.name).indexOf(room) + 1;
}

function roomAtMetres(spec: HouseSpec, x: number, z: number): HouseRoom | null {
  const tx = Math.floor(x / 2.5);
  const tz = Math.floor(z / 2.5);
  return (
    spec.rooms.find(
      (room) =>
        tx >= room.rect.x &&
        tx < room.rect.x + room.rect.w &&
        tz >= room.rect.z &&
        tz < room.rect.z + room.rect.d,
    ) ?? null
  );
}

/** Ob zwei Zimmer aneinandergrenzen — für „und was liegt daneben". */
function touches(a: HouseRoom, b: HouseRoom): boolean {
  const overlapX = a.rect.x < b.rect.x + b.rect.w && b.rect.x < a.rect.x + a.rect.w;
  const overlapZ = a.rect.z < b.rect.z + b.rect.d && b.rect.z < a.rect.z + a.rect.d;
  const sideBySide = a.rect.x + a.rect.w === b.rect.x || b.rect.x + b.rect.w === a.rect.x;
  const stacked = a.rect.z + a.rect.d === b.rect.z || b.rect.z + b.rect.d === a.rect.z;
  return (sideBySide && overlapZ) || (stacked && overlapX);
}
