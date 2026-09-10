import { lockerCode, repairsFor } from './mission';
import './haunting.css';
import './stationDashboard.css';
import { describeSetup, type RoundSetup } from './rules/roundSetup';
import { SetupPanel } from './roundSetupPanel';
// Die Station `monster` ist eine Rollenansicht aus der Registry
// (`monster/monsterView.ts`); ihr CSS kommt hier mit, weil die Seite in der
// Einsatzzentrale auch ohne die 2D-Welt gebraucht wird (`monster.register.ts`
// lädt es sonst nur, wenn `registry/discover.ts` läuft).
import './monster/monster.css';
import { TILE, dirX, dirZ } from '../nav/navTile';
import {
  MARKS,
  namesakes,
  roomOf,
  spacesOf,
  VAN_ID,
  type HouseRoom,
  type HouseSpec,
} from './house';
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
import type { MapRound, MapSnapshot } from './map/mapSnapshot';
import { cabinsText, endingText, lowOxygen, roundHud } from './rules/roundHud';
import { taskCargo } from './rules/cargo';
import type { RoleView } from './registry/roles';
import type { MonsterPort } from './monster/monsterDriver';
import { mountMonsterView } from './monster/monsterView';

/** Phone dashboards for a three-person crew: isolated room dossiers and codes
 * in the archive, live radar and ship systems in control. */
export interface StationHost {
  spec(): HouseSpec;
  state(): HauntState;
  drone(): DroneState;
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
   * Der Stand als Karte (`HauntingWorld.mapSnapshot`) — für die Station
   * `monster`, deren Ansicht aus der Registry kommt und nur Snapshots liest.
   */
  snapshot?(): MapSnapshot;
  /** Das Steuer der Station `monster` übers Netz (`monster/netMonsterPort.ts`). */
  monsterPort?(): MonsterPort | null;
  /** Eine Zeile an den Spieler — was die Monster-Ansicht dem Telefon sagt. */
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
  private readonly ecg = document.createElement('canvas');
  private lastRadar = 0;
  private archiveTab: 'orders' | 'rooms' = 'rooms';
  private controlTab: 'radar' | 'switches' = 'radar';
  private readonly roomTitle = document.createElement('span');
  private readonly zoomOutKey = document.createElement('button');
  private readonly zoomInKey = document.createElement('button');

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
  /** Die Tafel der Verteilung — eine für die Lebensdauer der Seite, neu gefüllt bei jedem Schreiben. */
  private setupPanel: SetupPanel | null = null;
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
  /**
   * Die Ansicht der Station `monster`, solange man dort sitzt. Sie überlebt
   * ein `write()` (das die Seite neu baut), weil ihr Port beim Wegwerfen die
   * Station freigäbe — und weil eine Karte, die sich bei jedem Schalter neu
   * aufbaut, den Daumen vom Stock nimmt.
   */
  private monsterView: RoleView | null = null;
  private monsterAt = 0;

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
    this.roomTitle.className = 'haunt__view-title';
    this.zoomOutKey.className = 'haunt__vbtn';
    this.zoomOutKey.dataset['archiveZoom'] = 'out';
    this.zoomOutKey.textContent = '−';
    this.zoomOutKey.setAttribute('aria-label', 'Raumansicht verkleinern');
    this.zoomInKey.className = 'haunt__vbtn';
    this.zoomInKey.dataset['archiveZoom'] = 'in';
    this.zoomInKey.textContent = '+';
    this.zoomInKey.setAttribute('aria-label', 'Raumansicht vergrößern');
    this.viewTools.append(
      this.roomTitle,
      this.zoomOutKey,
      this.zoomInKey,
      this.homeKey,
      this.panelKey,
      this.lampKey,
    );
    this.view.tabIndex = 0;
    this.view.addEventListener('keydown', (event) => this.archiveKeys(event));
    // Der Stock bleibt **im** Bild: Er gehört nach unten rechts an den Daumen
    // und nicht in die Zeile mit den anderen.
    this.view.append(this.lookKey);

    this.root.append(this.bar, this.quest, this.viewTools, this.view, this.body);
    document.body.append(this.root);
    document.body.classList.add('haunt-on');

    this.root.addEventListener('click', (event) => this.onClick(event));
    this.root.addEventListener('change', (event) => {
      const select = event.target as HTMLSelectElement | null;
      if (!select?.matches('[data-room-select]') || !roomOf(this.host.spec(), select.value)) return;
      this.selected = select.value;
      this.host.archiveHome();
      this.drawn = '';
      this.refresh();
    });
    this.watchDrag(this.view, false);
    this.watchDrag(this.lookKey, true);
    this.watchWheel();
  }

  dispose(): void {
    this.monsterView?.dispose();
    this.monsterView = null;
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
    if (this.station === 'archive') return 0;
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
    if (!roomOf(spec, this.selected)) this.selected = spec.rooms[0]?.id ?? '';

    const station = this.station;
    const drone = this.host.drone();
    const status = this.host.droneStatus();
    const round = this.host.round?.() ?? null;
    const sign = [
      spec.seed,
      station ?? 'van',
      // Von der Runde nur, was selten kippt: Leben, Kabinen, die Warnschwelle,
      // das Ende. Die Uhr selbst läuft unten in die Anzeige, ohne Neuschrift.
      round ? `${round.suit}/${round.cabinsDestroyed.length}/${lowOxygen(round.oxygen)}` : '',
      round?.ending ?? '',
      this.selected,
      this.archiveTab,
      this.controlTab,
      state.phase,
      state.fuse,
      state.crew.hp,
      state.crew.options.test,
      state.crew.hidden,
      state.crew.inventory.length,
      this.host.link().peers,
      this.host.link().vr,
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
      station === 'drone' ? Math.round(drone.lamp * 40) : '',
      station === 'drone' ? Math.ceil(drone.hop) : '',
      station === 'drone' ? drone.target : '',
      station === 'drone' ? drone.light : '',
      this.panel,
      // Die Checkbox „2D-Welt von oben" tauscht die Kacheln darunter aus.
      this.host.flatWanted?.() ?? false,
      this.host.setup ? describeSetup(this.host.setup()) : '',
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
    // Die Sauerstoff-Uhr springt jede Sekunde — und eine Seite, die deshalb
    // jede Sekunde neu geschrieben wird, nähme dem Daumen den Schalter weg.
    // Also nur der Text, in der Leiste und auf „Radar & Anzug".
    if (round) {
      const { oxygen } = roundHud(round);
      for (const clock of [this.quest, this.body])
        for (const slot of clock.querySelectorAll('[data-oxygen]'))
          if (slot.textContent !== oxygen) slot.textContent = oxygen;
    }
    // Der Punkt des Spähers wandert zwischen zwei Neuschriften weiter — er ist
    // das Einzige, was sich ohne Knopfdruck ändert.
    if (
      (station === 'scout' || station === 'hack') &&
      this.controlTab === 'radar' &&
      performance.now() - this.lastRadar > 66
    ) {
      this.lastRadar = performance.now();
      this.drawScout();
      this.drawEcg();
    }
    // Die Monster-Ansicht zeichnet sich selbst (`RoleView.update`) — Stock
    // lesen, Karte nachführen —, gedrosselt wie der Späherschirm. Wer die
    // Station verlässt, gibt sie frei: Ihr Port hält sonst das Steuer.
    if (station === 'monster' && this.monsterView) {
      const now = performance.now();
      // Das erste Bild sofort — `performance.now()` kann kurz nach dem Start
      // der Seite noch unter der Drossel liegen, und eine Ansicht ohne erstes
      // Bild hätte weder Stock gelesen noch Karte gezeichnet.
      const first = this.monsterAt === 0;
      if (first || now - this.monsterAt > 50) {
        const dt = first ? 0 : (now - this.monsterAt) / 1000;
        this.monsterAt = Math.max(now, Number.MIN_VALUE);
        this.monsterView.update(dt);
      }
    } else if (this.monsterView) {
      this.monsterView.dispose();
      this.monsterView = null;
    }
    this.view.hidden = !this.hasView;
  }

  /** Ob diese Station überhaupt ein Bild der Welt bekommt. */
  private get hasView(): boolean {
    const station = this.station;
    return (
      station === 'drone' ||
      station === 'watch' ||
      (station === 'archive' && this.archiveTab === 'rooms')
    );
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
    this.root.dataset['archivePage'] = this.archiveTab;
    this.writeShape(station);

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
      el('small', '', facts ? facts.tagline : 'Ein Außentechniker · zwei im Team'),
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
    // wer unten auf einen Schalter tippt, stünde danach wieder oben.
    const page = `${station ?? 'van'}/${this.archiveTab}/${this.controlTab}/${this.vanOpen ? 'van' : 'seat'}`;
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
    if (!view || station === 'archive') this.panel = false;
    this.root.classList.toggle('is-view', view);
    this.root.classList.toggle('is-panel', view && this.panel);
    this.panelKey.hidden = !view || station === 'archive';
    // **Was unter der offenen Bedienung läge, steht gar nicht erst da** — bis
    // auf den Menüknopf selbst, der sie wieder zumacht. Der Scheinwerfer steht
    // dann in der Schalttafel, der Zurück-Knopf hätte kein Bild zum Zurück.
    this.lampKey.hidden = !drone || this.panel;
    // Der Zurück-Knopf kommt erst, wenn es etwas zurückzustellen gibt: Ein
    // Knopf, der nie etwas tut, ist einer, den man beim Zielen trifft.
    this.homeKey.hidden = station !== 'archive' || this.panel || atHome(this.host.archiveView());
    this.roomTitle.hidden = station !== 'archive';
    this.zoomOutKey.hidden = station !== 'archive';
    this.zoomInKey.hidden = station !== 'archive';
    this.roomTitle.textContent = roomOf(this.host.spec(), this.selected)?.name ?? 'Raumakte';
    this.view.setAttribute(
      'aria-label',
      station === 'archive'
        ? `Raumansicht von oben: ${this.roomTitle.textContent}. Decke entfernt. Ziehen verschiebt, Mausrad oder zwei Finger zoomen.`
        : station === 'drone'
          ? 'Live-Kamera der Drohne'
          : 'Zuschaueransicht',
    );
    if (view && station !== 'archive') this.writeKeys(drone);
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
   * Hand des VR-Spielers liegt und noch nicht in der Zentrale. Genau dieser Unterschied
   * ist am Tisch die Frage, die gestellt wird („hast du sie schon abgelegt?"),
   * und drei Kästchen beantworten sie ohne ein Wort.
   */
  private writeQuest(state: HauntState, spec: HouseSpec): void {
    const repairs = repairsFor(spec);
    const strip = el('span', 'haunt__pips');
    for (const repair of repairs) {
      const pip = el('i', `haunt__pip${state.done.includes(repair.id) ? ' is-done' : ''}`);
      pip.title = repair.title;
      strip.append(pip);
    }
    // **Der Anzug sind Leben, keine Zahl.** Drei Punkte wie bei den Systemen —
    // wer auf einen Blick sieht, dass einer fehlt, ruft es dem Techniker zu,
    // ohne erst „2/3" lesen zu müssen. Der Sauerstoff daneben ist die eine Uhr
    // der Runde (`rules/roundRules.ts`); sie läuft auf jedem Telefon mit.
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

  private page(station: StationId | null): HTMLElement[] {
    if (station === null) return this.vanPage();
    if (station === 'archive') return this.archivePage();
    if (station === 'scout' || station === 'hack') return this.scoutPage();
    if (station === 'drone') return this.dronePage();
    if (station === 'watch') return this.watchPage();
    if (station === 'monster') return this.monsterPage();
    return [];
  }

  /**
   * **Die Station aus Monstersicht** — die Rollenansicht aus `monster/`,
   * gebaut über denselben `RoleHost` wie in der 2D-Welt. Ihr Port ist das
   * Steuer übers Netz; ohne Port (eine Welt ohne Karte) ist sie ein
   * Zuschauerfenster in die Wahrnehmung des Monsters.
   */
  private monsterPage(): HTMLElement[] {
    const host = this.host;
    if (!host.snapshot)
      return [note('warn', 'Keine Karte', 'Diese Welt liefert der Monster-Station keinen Stand.')];
    this.monsterView ??= mountMonsterView({
      snapshot: () => host.snapshot!(),
      me: () => this.host.me(),
      nameOf: (peer) => this.host.nameOf(peer),
      flip: (id, on) => this.host.flip(id, on),
      flyTo: (roomId) => this.host.flyTo(roomId),
      notify: (text) => this.host.notify?.(text),
      extra: { monster: this.host.monsterPort?.() ?? null },
    });
    return [this.monsterView.element];
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
        'Eure Dreiercrew',
        'Quest: Außentechniker. Handy 1: Archiv mit Aufträgen und Codes. Handy 2: Einsatzkontrolle mit Radar, Puls und Schaltern. Drohne und Zuschauer sind optionale Geräte.',
      ),
    ];
    // **Erst die Einstellung, dann die Runde.** Die Checkbox „2D-Welt von
    // oben" sagt nur, wie gespielt wird; gestartet wird mit den Kacheln
    // darunter — Bot-Runde, Mission, Test —, und jede davon hält sich an
    // die Checkbox. Eine 2D-Runde ist lokal: Sie stört keinen Techniker im
    // Schiff, deshalb sperrt ein spielender Techniker sie auch nicht.
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
    // **Die Verteilung**: Techniker, Monster und die Plätze der Zentrale,
    // jeder Mensch oder Bot — gilt für die nächste Runde in 2D wie in 3D.
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

  private tabs(kind: 'archive' | 'control'): HTMLElement {
    const nav = el('nav', 'haunt__tabs');
    nav.setAttribute('aria-label', kind === 'archive' ? 'Archivbereiche' : 'Einsatzkontrolle');
    const entries =
      kind === 'archive'
        ? [
            ['rooms', 'Räume & Codes'],
            ['orders', 'Aufträge'],
          ]
        : [
            ['radar', 'Radar & Anzug'],
            ['switches', 'Schalttafel'],
          ];
    for (const [id, title] of entries) {
      const button = el('button', 'haunt__tab', title!);
      button.dataset[kind === 'archive' ? 'archiveTab' : 'controlTab'] = id!;
      const active = id === (kind === 'archive' ? this.archiveTab : this.controlTab);
      button.setAttribute('aria-pressed', String(active));
      nav.append(button);
    }
    return nav;
  }

  /** The archive selects room names; only one isolated room is rendered. */
  private archivePage(): HTMLElement[] {
    return [
      this.tabs('archive'),
      ...(this.archiveTab === 'orders' ? this.archiveOrders() : this.archiveRooms()),
    ];
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

  private archiveOrders(): HTMLElement[] {
    const spec = this.host.spec();
    const state = this.host.state();
    const out: HTMLElement[] = [];
    out.push(head('Reparaturaufträge', `${state.done.length} von 3 erledigt`));
    const tasks = el('div', 'haunt__tasks');
    for (const repair of repairsFor(spec)) {
      const done = state.done.includes(repair.id);
      const row = el('div', `haunt__task-row${done ? ' is-done' : ''}`);
      row.append(
        el('strong', '', `${done ? '✓ ' : ''}${repair.title}`),
        el('span', '', repair.hint),
      );
      if (repair.puzzle !== 'wires')
        row.append(
          el(
            'span',
            'haunt__chip',
            `${repair.puzzle === 'sequence' ? 'Freigabefolge' : 'Zielfrequenzen'}: ${repair.code}`,
          ),
        );
      else row.append(el('span', 'haunt__chip', 'Vier Kabel: jeweils dasselbe Symbol verbinden'));
      if (state.taken.includes(repair.itemId))
        row.append(el('span', 'haunt__chip', `${repair.item} beim Techniker`));
      const links = el('div', 'haunt__chart-tools');
      const target = el('button', 'haunt__chart-key', 'Reparaturraum öffnen');
      target.dataset['dossierRoom'] = repair.roomId;
      links.append(target);
      const task = spec.tasks.find((item) => item.id === repair.itemId);
      if (task) {
        const source = el('button', 'haunt__chart-key', 'Fundraum öffnen');
        source.dataset['dossierRoom'] = task.roomId;
        links.append(source);
      }
      row.append(links);
      tasks.append(row);
    }
    tasks.append(
      el(
        'p',
        'haunt__blind',
        'Nach allen drei Reparaturen: Außentechniker zur Einsatzzentrale zurückführen.',
      ),
    );
    out.push(tasks);

    return out;
  }

  private archiveRooms(): HTMLElement[] {
    const spec = this.host.spec();
    const state = this.host.state();
    const room = roomOf(spec, this.selected) ?? spec.rooms[0];
    const out: HTMLElement[] = [];
    out.push(head('Raum auswählen', `${spec.rooms.length} Räume`));
    const field = el('label', 'haunt__room-select');
    field.append(el('span', '', 'Welchen Raum beschreibt der Techniker?'));
    const select = document.createElement('select');
    select.dataset['roomSelect'] = '';
    spec.rooms.forEach((one, index) => {
      const option = document.createElement('option');
      option.value = one.id;
      option.textContent = `R${String(index + 1).padStart(2, '0')} · ${one.name}`;
      option.selected = one.id === room?.id;
      select.append(option);
    });
    field.append(select);
    out.push(field);

    if (room) {
      out.push(head(room.name, 'aufgeschlagen'));
      const sheet = el('div', 'haunt__sheet');
      sheet.append(
        fact('Schutzschrank-Code', lockerCode(spec.seed, room.id), true),
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
            closed === 0 ? ' · alle freigegeben' : ` · ${closed} gesperrt`
          }`,
        ),
      );
      for (const repair of repairsFor(spec).filter((r) => r.roomId === room.id))
        sheet.append(fact('Wartungskasten', repair.title, true));
      out.push(sheet);
      const tasks = spec.tasks.filter((task) => task.roomId === room.id);
      for (const task of tasks) {
        const repair = repairsFor(spec).find((one) => one.itemId === task.id);
        // **Der Hinweis nennt die Kiste und nicht das Möbel.** Solange in
        // jedem Raum eine Kiste stand, reichte „bei dem Frachtcontainer";
        // jetzt stehen zwei bis drei nebeneinander, und der Archivar hat als
        // Einziger, was sie unterscheidet: Nummer, Farbband und Wand.
        sheet.append(
          fact('Fracht / Fundhinweis', `${task.label} · ${taskCargo(spec, task.id).clue}`, true),
        );
        if (repair) sheet.append(fact('Benötigt für', repair.title));
      }
      for (const repair of repairsFor(spec).filter((one) => one.roomId === room.id)) {
        sheet.append(fact('Reparaturhinweis', repair.hint));
        sheet.append(
          fact(
            repair.puzzle === 'wires'
              ? 'Kabelplan'
              : repair.puzzle === 'sequence'
                ? 'Freigabefolge'
                : 'Zielfrequenzen',
            repair.puzzle === 'wires'
              ? 'Verbinde jeweils zwei gleiche Symbole; die Anordnung kann abweichen.'
              : repair.code,
            true,
          ),
        );
      }
      out.push(
        el(
          'p',
          'haunt__chart-help',
          'Archivscan · nur dieser Raum · keine Personen oder Live-Positionen. Namen, Fundhinweise und Codes dem Techniker zurufen.',
        ),
      );
    }
    return out;
  }

  /** Der Späher: Konturen und ein Punkt. Sonst nichts, mit Absicht. */
  private scoutPage(): HTMLElement[] {
    const state = this.host.state();
    if (this.controlTab === 'switches') return [this.tabs('control'), ...this.hackPage()];
    const frame = el('div', `haunt__radar${state.monster ? '' : ' is-empty'}`);
    frame.append(this.scout);
    if (!state.monster) {
      frame.append(
        el('span', 'haunt__radar-empty', state.monsterOn ? 'Kein Signal' : 'Kein Monster aktiv'),
      );
    }
    const monitor = el('div', 'haunt__telemetry');
    this.ecg.className = 'haunt__ecg';
    this.ecg.setAttribute('aria-label', 'Simulierter Puls des VR-Spielers');
    monitor.append(
      el('strong', '', 'ANZUG-TELEMETRIE'),
      this.ecg,
      el('small', '', 'Spielwert · steigt bei Rennen, Verletzung und Monsternähe'),
    );
    const round = this.host.round?.() ?? null;
    if (round) {
      // Sauerstoff und Kabinen noch einmal groß: Die Leiste oben ist klein,
      // und die Einsatzkontrolle ist die Rolle, die den Rückweg ansagt.
      const hud = roundHud(round);
      const line = el('p', `haunt__round-line${hud.low ? ' is-low' : ''}`);
      line.dataset['roundLine'] = '';
      const clock = el('strong', '', hud.oxygen);
      clock.dataset['oxygen'] = '';
      line.append(
        clock,
        el('span', '', hud.cabins ? cabinsText(hud.cabins) : 'Alle Kabinen intakt'),
      );
      monitor.append(line);
    }
    return [
      this.tabs('control'),
      head('Bewegungsradar'),
      frame,
      monitor,
      note(
        state.crew.hidden ? 'calm' : 'live',
        state.crew.hidden ? 'Techniker im Schutzschrank' : `Anzugzustand: ${state.crew.hp} von 3`,
        state.crew.options.test
          ? 'Sicherer Test: kein Monster und kein Schaden.'
          : state.crew.venting > 0
            ? 'Kontakt im Wartungsschacht. Bewegung in ein Nachbarmodul.'
            : 'Radar beschreibt die Konturen. Archiv kennt Namen und Fundorte.',
      ),
    ];
  }

  private drawEcg(): void {
    const c = this.ecg.getContext('2d');
    if (!c) return;
    const state = this.host.state();
    const w = 600,
      h = 140;
    if (this.ecg.width !== w) {
      this.ecg.width = w;
      this.ecg.height = h;
    }
    c.fillStyle = '#071b22';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#173d43';
    c.lineWidth = 1;
    for (let x = 0; x < w; x += 20) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    const pulse = state.crew.hp === 0 ? 0 : state.crew.pulse;
    c.strokeStyle = pulse > 115 ? '#ffad7b' : '#81e6bd';
    c.lineWidth = 3;
    c.beginPath();
    for (let x = 0; x < 425; x++) {
      const p = (x / 150 + (performance.now() / 60000) * Math.max(60, pulse)) % 1;
      const wave =
        pulse === 0
          ? 0
          : p < 0.07
            ? Math.sin((p / 0.07) * Math.PI) * -0.22
            : p < 0.12
              ? Math.sin(((p - 0.07) / 0.05) * Math.PI)
              : p < 0.19
                ? -Math.sin(((p - 0.12) / 0.07) * Math.PI) * 0.4
                : 0;
      const y = 78 - wave * 48;
      if (x === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    c.fillStyle = '#d9f3e9';
    c.font = 'bold 48px monospace';
    c.fillText(String(pulse), 451, 79);
    c.font = '18px system-ui';
    c.fillText('BPM / SIM', 451, 108);
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

    // **Die Einsatzzentrale steht über der Zimmerliste und nicht darin.** Sie ist kein
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
    backLine.append(el('span', '', home ? 'In der Einsatzzentrale' : 'Zurück zur Zentrale'));
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
          : 'Draußen vor der Luftschleuse. Dort lädt der Scheinwerfer im Schnellgang.',
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
   * Rest der Einsatzzentrale wird — *irgendwo dazwischen ist zu, macht auf*. Dass sie
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
      `Sie steht in ${where}. Zwischen hier und ${goal} ist etwas zu — sie macht keine Tür auf. Bitte die Einsatzkontrolle, die Schotts zu öffnen.`,
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
        'Die ganze Station, bei Tag',
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
          ? 'Es läuft in der Station herum, und du siehst es. Die in der Zentrale sehen es nicht — der Späher hat einen Punkt, sonst niemand etwas.'
          : 'Der VR-Spieler hat es ausgeschaltet. Solange bleibt die Station leer, und alle üben.',
      ),
    ];
  }

  /** Der Hacker: Schalter, und keiner sagt, wo er hingeht. */
  private hackPage(): HTMLElement[] {
    const spec = this.host.spec();
    const state = this.host.state();
    const list = visibleSwitches(spec.switches, true);
    const out: HTMLElement[] = [];

    out.push(
      note(
        'calm',
        'Stationssysteme',
        'Lichter schalten, Schotts öffnen und Schallköder zur Ablenkung aktivieren. Der Techniker kann Schotts auch vor Ort öffnen.',
      ),
    );

    /**
     * **Der Hacker muss wissen, dass ihm jemand dazwischenfunkt** — sonst hält
     * er einen Schalter, der von allein umspringt, für einen kaputten Schalter
     * und hört auf, ihm zu trauen. Wo das Monster steht, geht das Licht aus
     * und fällt eine Tür zu (`haunt.ts`); rückgängig machen kann das genau
     * einer, und der sitzt hier. Wo es steht, sagt ihm die Zeile aber nicht:
     * Das weiß der Späher, und dafür muss geredet werden.
     */
    if (state.monsterOn) {
      out.push(
        note(
          'live',
          'Es macht dir die Arbeit kaputt',
          'Wo das Monster steht, flackert das Licht und geht aus, und eine Tür daneben fällt zu. Was von allein umspringt, war nicht dein Finger — und zurückdrehen kann es nur diese Tafel.',
        ),
      );
    }

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
   * die angrenzenden schwach. Der Späher kann die Station damit nicht absuchen —
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
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const size = Math.max(120, Math.round(Math.min(box.width || SCOUT_SIZE, 420) * dpr));
    if (this.scout.width !== size) {
      this.scout.width = size;
      this.scout.height = size;
    }

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, size, size);

    // Ein Fadenkreuz, damit ein leerer Schirm nach *Schirm* aussieht und nicht
    // nach kaputtem Bild. Es sagt nichts über die Station — es sagt nur, dass das
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
    const sweep = performance.now() / 1200;
    ctx.strokeStyle = 'rgba(96,220,202,.5)';
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2);
    ctx.lineTo(size / 2 + (Math.cos(sweep) * size) / 2, size / 2 + (Math.sin(sweep) * size) / 2);
    ctx.stroke();
    if (!state.monster) return;

    const here = roomAtMetres(spec, state.monster.x, state.monster.z);
    if (!here) return;
    const near = spacesOf(spec).filter((room) => room.id === here.id || touches(room, here));

    // Der Ausschnitt folgt dem Monster und nicht dem Haus: eine feste Karte
    // würde die Orientierung verraten, die sich die Crew gemeinsam erarbeitet.
    const span = 5;
    const scale = size / (span * TILE);
    const cx = state.monster.x;
    const cz = state.monster.z;
    const px = (x: number): number => size / 2 + (x - cx) * scale;
    const pz = (z: number): number => size / 2 + (z - cz) * scale;

    for (const room of near) {
      const own = room.id === here.id;
      ctx.strokeStyle = own ? '#8fb7ff' : '#2b3547';
      ctx.lineWidth = (own ? 2 : 1) * dpr;
      const x = px(room.rect.x * TILE);
      const z = pz(room.rect.z * TILE);
      ctx.strokeRect(x, z, room.rect.w * TILE * scale, room.rect.d * TILE * scale);
    }

    // Die Türen als Lücken andeuten — die Form eines Zimmers ist auch, wo man
    // hineinkommt.
    for (const door of spec.doors) {
      if (!near.some((room) => room.id === door.a || room.id === door.b)) continue;
      ctx.fillStyle = '#586880';
      const r = 3 * dpr;
      ctx.fillRect(
        px((door.x + 0.5 + dirX(door.dir) * 0.5) * TILE) - r,
        pz((door.z + 0.5 + dirZ(door.dir) * 0.5) * TILE) - r,
        r * 2,
        r * 2,
      );
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

  private archiveKeys(event: KeyboardEvent): void {
    if (this.station !== 'archive') return;
    if (event.key === '+' || event.key === '=') this.host.archiveZoom(1.4);
    else if (event.key === '-') this.host.archiveZoom(1 / 1.4);
    else if (event.key === 'Home') this.host.archiveHome();
    else if (event.key === 'ArrowLeft') this.host.archivePan(0.1, 0);
    else if (event.key === 'ArrowRight') this.host.archivePan(-0.1, 0);
    else if (event.key === 'ArrowUp') this.host.archivePan(0, 0.1);
    else if (event.key === 'ArrowDown') this.host.archivePan(0, -0.1);
    else return;
    event.preventDefault();
  }

  // --- Eingaben ---------------------------------------------------------------

  private onClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    const hit = target?.closest<HTMLElement>(
      '[data-sit],[data-room],[data-fly],[data-flip],[data-van],[data-lamp],[data-home],[data-panel],[data-technician],[data-archive-tab],[data-control-tab],[data-archive-zoom],[data-dossier-room],[data-game-menu],[data-bot-round],[data-mission],[data-test],[data-flat-mode],[data-restart],[data-start-setup]',
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
    } else if (hit.dataset['archiveZoom']) {
      this.host.archiveZoom(hit.dataset['archiveZoom'] === 'in' ? 1.4 : 1 / 1.4);
    } else if (hit.dataset['archiveTab']) {
      const tab = hit.dataset['archiveTab'];
      if (tab === 'orders' || tab === 'rooms') this.archiveTab = tab;
    } else if (hit.dataset['controlTab']) {
      this.controlTab = hit.dataset['controlTab'] === 'switches' ? 'switches' : 'radar';
    } else if (hit.dataset['dossierRoom']) {
      const room = roomOf(this.host.spec(), hit.dataset['dossierRoom']);
      if (room) {
        this.selected = room.id;
        this.archiveTab = 'rooms';
        this.host.archiveHome();
      }
    } else if (hit.dataset['technician'] !== undefined) {
      this.host.technician();
      return;
    } else if (hit.dataset['van'] !== undefined) {
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
  // An der Einsatzzentrale gibt es keine Restlaufzeit, weil nichts abläuft — und ein Zähler,
  // der eine Zahl nennt, die nicht zählt, ist eine Lüge mit Nachkommastelle.
  if (home && drone.lamp >= 1) return 'Am Kabel. Leuchte, so lange du willst.';
  if (home) return `Am Kabel · voll in ${Math.round(lampRefill(drone.lamp, true))} s`;
  if (drone.light) return `noch ~${Math.round(lampSeconds(drone.lamp))} s Licht — er frisst Ladung`;
  if (drone.lamp < LAMP_MIN) return `leer. Voll in ${Math.round(lampRefill(drone.lamp))} s`;
  if (drone.lamp < 1) return `lädt · voll in ${Math.round(lampRefill(drone.lamp))} s`;
  return 'Ein Kegel nach vorn. Er hilft dem VR-Spieler mehr als dir.';
}

/**
 * Wie ein Ort heißt, den die Drohne ansteuert — Zimmer oder Einsatzzentrale.
 *
 * `null`, wenn es keiner ist: Zwischen zwei Kacheln steht sie nirgends, und
 * ein Satz, der „sie steht in " sagt, hat dort besser gar keinen Namen.
 */
function placeName(spec: HouseSpec, id: string): string | null {
  if (id === VAN_ID) return 'Einsatzzentrale';
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
  const tx = Math.floor(x / TILE);
  const tz = Math.floor(z / TILE);
  return (
    spacesOf(spec).find(
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
