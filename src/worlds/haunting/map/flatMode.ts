import './flat.css';
import { MARKS, type HouseRoom } from '../house';
import { lockerCode, repairsFor, type MonsterKind } from '../mission';
import { viewModesFor, type ViewMode } from '../registry/viewModes';
import './mapModes.register';
import {
  FlatRound,
  MONSTER_ID,
  PLAYER_ID,
  TOOL_LABELS,
  type FlatEvent,
  type FlatOptions,
  type FlatRole,
} from './flatRound';
import { Joystick } from './joystick';
import { FlatScene, scaleForWidth } from './flatScene';
import { goalRoomId, INK, MapView, type MapGoal, type MapRoute } from './mapView';
import { PuzzleOverlay, el } from './puzzleOverlay';
import { Rng } from '../rng';
import { clockText } from '../rules/roundRules';
import { VIEW_LABELS, type View } from '../rules/lobby';
import { cargoLabel, cargoOf, taskCargo } from '../rules/cargo';
import { hudTasks } from '../rules/roundHud';
import {
  defaultSetup,
  flatRoleOf,
  powersOf,
  switchRights,
  type RoundSetup,
  type SoloPowers,
} from '../rules/roundSetup';
import { visibleSwitches } from '../panel';
import { archiveRadio } from '../rules/archiveRadio';
import { TechnicianBot } from '../rules/technicianBot';
import { MonsterSession } from '../monster/monsterSession';
import { RoleStrip } from '../views/roleStrip';
import '../views/archive.register';
import '../views/panel.register';
import '../views/scout.register';
import { HauntingAudio, levelLabel } from '../audio';
import type { MapNoise, MapRound, MapSnapshot, MonsterInsight } from './mapSnapshot';
import { computeVisibility, emptyField, LitCache, type VisibilityField } from './visibility';
import { drawInsight } from './insightOverlay';
import type { RoleHost } from '../registry/roles';
import type { ToolIconSource } from './toolIcons';
import { pageHudShown, pressPageButton, showPageHud } from '../../../core/pageHud';

/**
 * **Die 2D-Welt** — die Station als gezeichnete Szene, gespielt mit dem Daumen.
 *
 * Links der Stock, rechts unten ein großer Knopf „Benutzen" und darüber zwei
 * kleine: Werkzeug benutzen, Werkzeug wechseln. Die Szene (`flatScene.ts`)
 * folgt dem Spieler, lässt sich ziehen und mit zwei Fingern zoomen — und
 * springt von selbst zurück, sobald der Spieler einen Schritt tut:
 * Verschieben ist ein Blick zur Seite, kein Zustand, den man wieder aufräumen
 * muss.
 *
 * **Der obere Rand gehört dieser Welt allein.** Der Streifen der Seite
 * (Weltname, Menü, Verbindung, VR — `index.html`, `#hud`) wird beim Betreten
 * abgeschaltet (`core/pageHud.ts`) und beim Verlassen wieder so hergestellt,
 * wie er war; `--flat-top` rückt dafür nach oben. Darunter steht **eine
 * Spalte aus drei Zeilen**, und zwar in dieser Reihenfolge:
 *
 * 1. **Die Rollen als Knöpfe in einem Panel** (`views/roleStrip.ts`) — die
 *    Station selbst, Archiv, Schalttafel, Späher, Monster, Zuschauer —, und
 *    am Ende der Zeile das Zahnrad.
 * 2. **Links beginnend der Kasten** mit Auftrag und Uhr: Sauerstoff mit
 *    Anzug-Leben, darunter der Reiter „Aufgaben" mit einem Kreis je Auftrag.
 * 3. **Die Sprungknöpfe**, im Fluss der Spalte und nicht an einer Ecke.
 *
 * Vorher hing jedes dieser vier Dinge an einem eigenen, geratenen Abstand vom
 * oberen Rand und lag damit reihum vor dem nächsten: „Zum Spieler" gab es,
 * zu sehen war der Rollenstreifen davor.
 *
 * **Und ist ein Overlay offen, ist die ganze Spalte weg** (`applyOverlay`).
 * Wer das Optionsmenü aufmacht, sieht das Menü — nicht daneben noch den Kopf
 * der Runde, den er gerade verlassen hat.
 *
 * **Ein Overlay auf einmal** (`FlatOverlay`). Karte, Rätsel, Raumakte und
 * Optionsmenü sind vier Bilder, die dieselbe Fläche wollen; solange eines
 * davon offen ist, sind HUD, Reiter, Stock, Knöpfe **und die Szene** weg. Die
 * Runde läuft dabei weiter — sie ist nur nicht zu sehen. Das steht an *einer*
 * Stelle (`applyOverlay`), weil vier Stellen, die je ein `hidden` umlegen,
 * sich genau dann widersprechen, wenn zwei davon gleichzeitig zutreffen.
 * Die Karte ist dabei die alte `MapView` — erreichbar über das Zahnrad, seit
 * der eigene 🗺-Knopf oben rechts weg ist; das Optionsmenü hat genau zwei
 * Modi (`registry/viewModes.ts`, Publikum `flat`).
 *
 * Drei Rollen (`FlatRole`): der Techniker am Stock, das Monster
 * (`monster/monsterSession.ts`) — und **Zuschauen**, bei dem niemand spielt.
 * Zuschauen gibt es dabei in zwei Sorten, und welche es wird, entscheidet der
 * Wirt und nicht die Rolle:
 *
 * - **Der Runde im Raum folgen.** Reicht der Wirt einen Stand herein
 *   (`FlatModeHost.watchSnapshot`, gefüllt aus `map/worldSource.ts`), rechnet
 *   diese Welt gar nichts mehr: kein Techniker aus Zahlen, keine Wege, keine
 *   neue Runde am Ende — Szene und Karte zeichnen, was der Gastgeber ansagt.
 *   Das war die offene Lücke: Spielten zwei Menschen (einer am Stock, einer am
 *   Monster-Telefon), konnte ihnen in 2D niemand zusehen.
 * - **Die Bot-Runde**, wenn im Raum nichts läuft: Der Techniker aus Zahlen
 *   (`rules/technicianBot.ts`) läuft seine Runde gegen das Monster, die Karte
 *   folgt ihm, Stock und Knöpfe sind weg. Das 2D-Gegenstück zu „Bot-Runde
 *   ansehen" im Van.
 *
 * Beide sehen dasselbe: beide Sprungknöpfe („Zum Techniker", „Zum Monster"),
 * den Modus „Alles sehen" — und darin das Overlay „KI-Absichten"
 * (`map/insightOverlay.ts`), das Glaubensbild, Prognose und Abfangtür des
 * Monsters über Szene und Karte legt. **Nur dort**: Wer mitspielt, sieht es
 * nie.
 *
 * **Wer allein spielt, bekommt die Zentrale dazu** (`rules/roundSetup.ts`):
 * Jeder Platz, an dem ein Bot sitzt, gibt dem Techniker die Auskunft dieses
 * Platzes auf sein eigenes Bild — die Peilung des Spähers als roter Punkt
 * alle paar Sekunden, die Schalttafel als Tipp auf Tür oder Lampe in der
 * Kartenübersicht, die Akte des Archivars als Tipp auf ein Zimmer. Ein
 * Mensch am Platz nimmt sie ihm wieder ab; dann sagt es ihm der Mitspieler,
 * oder niemand. Ziele stehen als gelbe Dreiecke am Rand der Szene, und
 * „Zielpfade" legt die Wege von Techniker und Monster darüber.
 *
 * Kein three.js hier drin — auch nicht mehr für das Werkzeug in der Hand:
 * Dessen Bild ist ein **gepuffertes Icon**, das einmal aus dem 3D-Modell
 * gerendert wurde (`toolIcons.ts`) und der Ansicht als fertiges Canvas
 * gereicht wird (`setToolIcons`). Vorher schnitt die 2D-Welt dafür ein Loch
 * in ihre Oberfläche, durch das die 3D-Welt rendern sollte — und das war
 * unsichtbar, weil die 2D-Welt über dem WebGL-Canvas liegt. Deshalb läuft
 * dieses Bauteil headless in jsdom, und deshalb kann es die Runde auch
 * dann rechnen, wenn gar kein WebGL da ist.
 */
export interface FlatModeHost {
  /** Die 2D-Welt verlassen — zurück zur Rollenwahl. */
  exit(): void;
  /** Eine Zeile an den Chat oder das Menü, wenn die Welt eine hat. */
  notify?(text: string): void;
  /**
   * **Der Stand der Runde, die im Raum wirklich läuft** (`map/worldSource.ts`).
   *
   * Ohne ihn war „Zuschauen" in 2D immer die lokale Bot-Runde: Saß ein Mensch
   * im Schiff am Stock und ein zweiter am Monster-Telefon, konnte ihnen von
   * oben niemand folgen — man sah zwei Zahlenwesen eine andere Station
   * ablaufen. Reicht der Wirt hier einen Snapshot herein, zeichnet die
   * 2D-Welt **den** und rechnet gar nichts mehr selbst.
   */
  watchSnapshot?(): MapSnapshot | null;
  /**
   * **Was das Monster glaubt und vorhat** (`MonsterInsight`), wenn der Wirt es
   * weiß. Nur der, der das Monster rechnet, weiß es; alle anderen bekommen
   * `null` und sehen die Runde eben ohne Kopf des Gegners.
   */
  insight?(): MonsterInsight | null;
  /**
   * **Die Ansicht mitten in der Runde wechseln** (`HauntingWorld.switchView`).
   *
   * Nur vorhanden, wenn dieser Mensch die Runde wirklich spielt: Wer zusieht,
   * sieht der Runde eines anderen zu, und ein Knopf, der sie ins Schiff holte,
   * nähme sie ihm weg. Fehlt der Haken, fehlt auch der Eintrag im Optionsmenü.
   */
  switchView?(view: View): void;
}

/** Wie lange eine Meldung stehen bleibt, in Sekunden. */
const TOAST_SECONDS = 3.2;
/** Wie oft der Späher ein neues Horchbild bekommt, in Sekunden. */
export const SCOUT_PERIOD = 3.5;
/**
 * Wie viele Punkte vom oberen Rand die Randdreiecke wegbleiben — so hoch ist
 * die Spalte oben (`.flat__top`: Rollen mit Zahnrad, Kasten, Sprungknöpfe).
 */
const EDGE_TOP = 158;
/**
 * **Ab wie viel Bewegung je Bild die Kamera von selbst zum Spieler
 * zurückspringt**, in Metern.
 *
 * Ein Techniker, der die Szene zur Seite zieht, will dort etwas nachsehen —
 * und danach weiterspielen. Vorher blieb die Kamera, wo er sie hingezogen
 * hatte, und er lief aus dem eigenen Bild heraus, bis er den Knopf fand.
 * Deshalb ist Verschieben nur so lange ein Blick zur Seite, wie er still
 * steht: Der erste Schritt holt die Kamera zurück. Der Schwellwert ist klein
 * genug für einen Schritt und groß genug, dass Rundungsreste eines
 * stehenden Spielers ihn nicht auslösen.
 */
const CAMERA_RETURN = 0.01;

const NO_POWERS: SoloPowers = { scout: false, panel: false, archive: false };

/**
 * **Was gerade über der Szene liegt** — genau eines davon, nie zwei.
 *
 * Die vier wollen dieselbe Fläche und dieselbe Aufmerksamkeit: Wer an der
 * Konsole ein Rätsel löst, will keine Karte darunter sehen, und wer die Karte
 * aufschlägt, will nicht raten, welcher der zwei Knöpfe am Rand jetzt noch
 * zur Szene gehört. `'none'` ist das Spiel selbst.
 */
export type FlatOverlay = 'none' | 'map' | 'puzzle' | 'sheet' | 'options';

/**
 * Wie die eigene Rolle im Optionsmenü heißt. Sie steht dort als Auskunft über
 * dem Schalter „Zuschauen": Der dreistufige Zykler, der weiterzählte, ohne zu
 * zeigen, was als Nächstes kommt, ist weg — zwei Zustände, ein Schalter.
 */
const ROLE_LABELS: Record<FlatRole, string> = {
  technician: 'Du spielst den Techniker',
  monster: 'Du spielst das Monster',
  watch: 'Du siehst zu',
};

/** Ohne Tafel: die Verteilung, die Rolle und Test der alten Optionen meinen. */
function setupFromOptions(options: FlatOptions): RoundSetup {
  const role = options.role ?? 'technician';
  return {
    ...defaultSetup(),
    technician: role === 'technician' ? 'human' : 'bot',
    monster: options.test ? 'off' : role === 'monster' ? 'human' : 'bot',
  };
}

export class FlatMode {
  readonly element = el('div', 'flat');
  round: FlatRound;
  /** Das Spielbild: die gezeichnete Szene. */
  readonly scene: FlatScene;
  /** Die Kartenübersicht im Overlay — die alte Karte, auf Knopfdruck. */
  readonly map: MapView;
  private readonly mapOverlay = el('div', 'flat__map');
  private readonly stick = new Joystick();
  /**
   * **Der obere Rand als eine Spalte**, nicht als drei Dinge mit je einem
   * Abstand von oben: erste Zeile HUD und Zahnrad, zweite Zeile die
   * Sprungknöpfe. Wer untereinander steht, verdeckt sich nicht.
   */
  private readonly top = el('div', 'flat__top');
  private readonly topRow = el('div', 'flat__top-row');
  /** Zweite Zeile, links beginnend: der Kasten mit Auftrag und Uhr. */
  private readonly hudRow = el('div', 'flat__top-row flat__top-row--hud');
  private readonly hud = el('div', 'flat__hud');
  private readonly vitals = el('div', 'flat__vitals');
  private readonly tasks = el('div', 'flat__tasks');
  /** Der Reiter „Aufgaben:": waagerecht, mit einem Kreis je Auftrag, und ein Knopf. */
  private readonly tab = el('button', 'flat__tab');
  private readonly pips = el('span', 'flat__pips');
  private readonly toast = el('div', 'flat__toast');
  /**
   * **Der Ladebalken eines Handgriffs** (`rules/chore.ts`): Er steht über den
   * Knöpfen, dort, wo die Hände hinsehen, und sagt in einer Zeile, woran
   * gearbeitet wird und dass Stillstehen dazugehört.
   */
  private readonly chore = el('div', 'flat__chore');
  private readonly choreLabel = el('span', 'flat__chore-label');
  private readonly choreFill = el('i', 'flat__chore-fill');
  private readonly buttons = el('div', 'flat__buttons');
  private readonly cycleKey = el('button', 'flat__key flat__key--cycle');
  private readonly useKey = el('button', 'flat__key flat__key--use');
  private readonly actKey = el('button', 'flat__key flat__key--act');
  /** Die zwei Sprungknöpfe rechts: zum Spieler, und für Zuschauer zum Monster. */
  private readonly jump = el('div', 'flat__jump');
  private readonly centreKey = el('button', 'flat__corner flat__centre', 'Zum Spieler');
  private readonly monsterKey = el(
    'button',
    'flat__corner flat__centre flat__centre--monster',
    'Zum Monster',
  );
  private readonly optionsKey = el('button', 'flat__corner flat__options', '⚙');
  /**
   * **Der Rollenstreifen über der Szene** (`views/roleStrip.ts`): Archiv,
   * Schalttafel, Späher — jede liest dieselbe laufende Runde, und nichts wird
   * dafür neu aufgebaut.
   */
  private readonly strip: RoleStrip;
  private readonly options = el('div', 'flat__panel');
  private readonly sheet = el('div', 'flat__panel flat__sheet');
  private readonly ending = el('div', 'flat__ending');
  /** Das gepufferte Comic-Bild des aktiven Werkzeugs (`toolIcons.ts`). */
  private readonly icon = el('canvas', 'flat__icon');
  private icons: ToolIconSource | null = null;
  private iconTool = '\u0000';
  private puzzle: PuzzleOverlay;
  /** Wenn der Spieler das Monster spielt: Steuer, Techniker-Bot und Ansicht (`monster/`). */
  private session: MonsterSession | null = null;
  /** In der Bot-Runde: der Techniker aus Zahlen am Stock statt des Spielers. */
  private bot: TechnicianBot | null = null;
  private toastLeft = 0;
  private mode: ViewMode;
  private seed: number;
  private readonly options_: FlatOptions;
  private readonly dice = new Rng(Date.now() >>> 0);
  /** Schritte, Monster und Herzschlag auf dem Hörmodell der Karte (Paket Audio). */
  private readonly audio = new HauntingAudio();
  /** Die Verteilung der Runde und was der Techniker daraus bekommt. */
  private setup: RoundSetup;
  private powers: SoloPowers;
  private routes: boolean;
  /** Das letzte Horchbild des Spähers: die Geräusche einer Probe, neu gestempelt. */
  private heard: MapNoise[] = [];
  private scoutClock = 0;
  /** Der Schlüssel des letzten Archiv-Funkspruchs (`rules/archiveRadio.ts`). */
  private radioed = '';
  /**
   * **Ob hier einer Runde im Netz zugesehen wird** statt einer eigenen.
   *
   * Steht der Wirt mit `watchSnapshot` bereit, rechnet diese 2D-Welt gar
   * nichts: Kein Techniker aus Zahlen läuft los, die eigene Runde bleibt
   * stehen, und gezeichnet wird der Stand, den der Gastgeber ansagt. Das ist
   * der Unterschied zwischen „Zuschauen" und „Vorführung": Vorher gab es in
   * 2D nur die Vorführung, egal wer im Raum wirklich spielte.
   */
  private readonly netWatch: boolean;
  /** Der zuletzt gelesene Stand aus dem Netz — `null`, solange keiner kam. */
  private netSnapshot: MapSnapshot | null = null;
  private netField: VisibilityField = emptyField('omniscient');
  /**
   * Die Lampenflächen des Netz-Snapshots werden gepuffert wie in der eigenen
   * Runde: Sieben Lampen je Bild neu gegen alle Wände zu strahlen, kostet mehr
   * als alles andere in diesem Bauteil zusammen.
   */
  private readonly netLights = new LitCache();
  /** Was gerade über der Szene liegt — genau eines (`FlatOverlay`). */
  private overlay: FlatOverlay = 'none';
  /**
   * Wo der Spieler beim letzten Bild stand — daran hängt das Zurückspringen
   * der Kamera (`CAMERA_RETURN`).
   */
  private lastAt = { x: 0, z: 0 };

  constructor(
    seed: number,
    options: FlatOptions,
    private readonly host: FlatModeHost,
  ) {
    this.seed = seed;
    this.options_ = options;
    // Zuschauen am Netz braucht beides: die Rolle **und** einen Wirt, der den
    // Stand der laufenden Runde hereinreicht. Fehlt einer davon, bleibt es bei
    // der lokalen Bot-Runde.
    this.netWatch = (options.role ?? 'technician') === 'watch' && !!host.watchSnapshot;
    this.setup = options.setup ?? setupFromOptions(options);
    this.powers = options.powers ?? (options.setup ? powersOf(options.setup) : NO_POWERS);
    this.routes = options.routes ?? false;
    const modes = viewModesFor('flat');
    this.mode = modes.find((m) => m.visibility === (options.mode ?? 'realistic')) ?? modes[0]!;
    this.round = new FlatRound(seed, { ...options, mode: this.mode.visibility });
    this.puzzle = new PuzzleOverlay(this.round);
    const onRoomClick = (id: string): void => this.tapRoom(id);
    const onEntityClick = (id: string): void =>
      this.say(this.view().entities.find((e) => e.id === id)?.label ?? id);
    const onItemClick = (id: string): void => this.tapItem(id);
    this.scene = new FlatScene({
      mode: this.mode.visibility,
      onRoomClick,
      onEntityClick,
      onItemClick,
      noiseInk: (noise) => this.sceneNoiseInk(noise),
      goalRoom: () => goalRoomId(this.round.objectives()[0]),
      overlay: (ctx) => this.drawSceneOverlay(ctx),
    });
    this.scene.element.classList.add('flat__scene');
    this.scene.setScale(scaleForWidth(typeof window === 'undefined' ? 1024 : window.innerWidth));
    this.scene.follow(PLAYER_ID);
    this.map = new MapView({
      layers: this.mode.layers,
      markers: this.mode.markers,
      mode: this.mode.visibility,
      viewerId: PLAYER_ID,
      minScale: 6,
      maxScale: 60,
      edge: { top: 24, bottom: 24, left: 18, right: 18 },
      routes: () => this.routeLines(),
      objectives: () => (this.session || this.netWatch ? [] : this.round.objectives()),
      noises: () => this.mapNoises(),
      onRoomClick,
      onEntityClick,
      onItemClick,
      onDoorClick: (id) => this.tapDoor(id),
      onLightClick: (id) => this.tapLight(id),
      overlay: (ctx, view) => this.drawMapOverlay(ctx, (x, z) => view.toScreen(x, z)),
    });
    this.map.follow(PLAYER_ID);
    this.map.setView({ scale: 22 });
    this.map.follow(PLAYER_ID);
    const mapClose = el('button', 'flat__map-close', 'Schließen');
    mapClose.addEventListener('click', () => this.showMap(false));
    this.mapOverlay.append(this.map.element, mapClose);
    this.mapOverlay.hidden = true;
    this.optionsKey.setAttribute('aria-label', 'Optionen');
    // Der Kasten oben links: Uhr und Anzug, darunter der Reiter mit den Kreisen.
    this.tab.append(
      el('span', 'flat__tab-label', 'Aufgaben:'),
      this.pips,
      el('b', 'flat__caret', ''),
    );
    // Eingeklappt ist der Anfang: Die Liste nahm den halben oberen Rand ein,
    // und wer sie braucht, tippt einmal auf den Reiter.
    this.hud.classList.add('is-collapsed');
    this.hud.append(this.vitals, this.tab, this.tasks);
    this.tab.addEventListener('click', () => {
      const open = this.hud.classList.toggle('is-collapsed');
      this.tab.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
    this.tab.setAttribute('aria-expanded', 'false');

    this.cycleKey.dataset['action'] = 'cycle';
    this.useKey.dataset['action'] = 'use';
    this.actKey.dataset['action'] = 'interact';
    this.buttons.append(this.cycleKey, this.useKey, this.actKey);
    this.buttons.addEventListener('click', (event) => {
      const key = (event.target as HTMLElement | null)?.closest('button');
      const action = key?.dataset['action'];
      if (action === 'cycle' || action === 'use' || action === 'interact') {
        this.round.act(action);
        this.refreshKeys();
      }
    });
    this.centreKey.addEventListener('click', () => {
      this.scene.follow(PLAYER_ID);
      this.map.follow(PLAYER_ID);
      this.refreshCorners();
    });
    this.monsterKey.addEventListener('click', () => {
      this.scene.follow(MONSTER_ID);
      this.map.follow(MONSTER_ID);
      this.refreshCorners();
    });
    this.jump.append(this.centreKey, this.monsterKey);
    this.optionsKey.addEventListener('click', () =>
      this.setOverlay(this.overlay === 'options' ? 'none' : 'options'),
    );
    this.options.hidden = true;
    this.options.addEventListener('click', (event) => this.optionClick(event));
    this.sheet.hidden = true;
    this.sheet.addEventListener('click', (event) => this.optionClick(event));
    this.ending.hidden = true;
    this.ending.addEventListener('click', (event) => this.optionClick(event));
    this.icon.hidden = true;
    const bar = el('div', 'flat__chore-bar');
    bar.append(this.choreFill);
    this.chore.append(this.choreLabel, bar);
    this.chore.hidden = true;
    this.chore.setAttribute('role', 'progressbar');
    // **Der obere Rand als eine Spalte, drei Zeilen** (siehe `flat.css`):
    // oben die Rollen als Knöpfe in einem Panel und ganz rechts das Zahnrad,
    // darunter — links beginnend — der Kasten mit Auftrag und Uhr, und
    // darunter die Sprungknöpfe. Der Rollenstreifen hing vorher als eigenes
    // Ding an einem geratenen Abstand von oben und lag damit über dem
    // Sprungknopf: „Zum Spieler" gab es, zu sehen war der Reiter davor.
    this.hudRow.append(this.hud);
    this.top.append(this.topRow, this.hudRow, this.jump);
    this.strip = new RoleStrip({
      roleHost: () => this.roleHost(),
      homeLabel: () => 'Station',
      onChange: () => this.applyOverlay(),
      // **Wer hier sitzt, ist der Techniker** — und der wechselt mitten in
      // einer Mission die Rolle nicht (`rules/roundSetup.switchRights`): Er
      // steht im Anzug und kann nicht nebenbei ins Archiv greifen. In einer
      // Test-Runde darf er alles; genau dafür ist das Häkchen „Testen" da.
      rights: () => {
        const allowed = switchRights({
          test: this.round.state().crew.options.test,
          inCentre: false,
          vrTechnician: false,
        });
        return { allowed: allowed.abilities, why: allowed.why };
      },
      // **Zuschauer steht in derselben Zeile wie die Rollen.** Er beantwortet
      // dieselbe Frage — wessen Bild sehe ich? —, schlägt aber nichts auf: Er
      // gibt den Stock dem Techniker aus Zahlen und macht die Karte allwissend
      // (`registry/viewModes.ts`, „Alles sehen"). Am Netz ist er ohnehin der
      // Zustand; dort ist der Knopf nur die Anzeige davon.
      extras: () => [
        {
          id: 'watch',
          label: 'Zuschauer',
          active: this.role === 'watch',
          title: 'Alles sehen · der Techniker aus Zahlen spielt weiter',
        },
      ],
      onExtra: (id) => {
        if (id !== 'watch') return;
        this.setWatching(this.role !== 'watch');
      },
    });
    // Der Rollenstreifen ist die erste Zeile des Kopfs und kein eigenes
    // Schwebendes mehr — dadurch verschwindet er mit ihm, sobald ein Overlay
    // offen ist, und verdeckt nichts mehr.
    this.topRow.append(this.strip.element, this.optionsKey);
    this.element.append(
      this.scene.element,
      this.top,
      this.toast,
      this.chore,
      this.stick.element,
      this.buttons,
      this.mapOverlay,
      this.strip.stage,
      this.puzzle.element,
      this.sheet,
      this.options,
      this.ending,
    );
    // `flat--world` unterscheidet die gespielte 2D-Welt von denselben
    // Knöpfen über der 3D-Szene (`world3d/shipControls.ts`, `.flat.ship3d`):
    // Nur hier ist der Streifen der Seite weg, und nur hier rückt `--flat-top`
    // deshalb nach oben.
    this.element.classList.add('flat--world');
    this.element.dataset['mode'] = this.mode.visibility;
    showPageHud(false);
    this.applyLayers();
    this.playRole(options.role ?? 'technician');
    this.lastAt = { x: this.round.player.x, z: this.round.player.z };
    this.refreshKeys();
    this.renderHud();
  }

  /**
   * Techniker, Monster oder Bot: Wer das Monster spielt, bekommt dessen
   * Ansicht statt Stock und Knöpfen; wer dem Bot zusieht, behält die Szene
   * und den Knopf, der sie zurück zum Techniker holt.
   */
  private playRole(role: FlatRole): void {
    this.session?.dispose();
    this.session = null;
    this.bot = null;
    if (role === 'monster') {
      this.session = new MonsterSession(
        this.round,
        (text) => this.say(text),
        this.options_.tuning?.technician,
      );
      this.element.insertBefore(this.session.element, this.top);
    } else if (role === 'watch' && !this.netWatch) {
      // Nur die **lokale** Vorführung braucht einen Techniker aus Zahlen. Wer
      // einer echten Runde im Netz zusieht, hätte sonst zwei Techniker: einen
      // gezeichneten aus dem Netz und einen, der daneben herläuft.
      this.bot = new TechnicianBot(this.round, this.options_.tuning?.technician, () =>
        this.dice.next(),
      );
    }
    this.element.dataset['role'] = role;
    // Die Rolle wechselt, was sichtbar ist — aber sie entscheidet es nicht
    // selbst: Das tut `applyOverlay`, damit es genau eine Stelle bleibt.
    if (role === 'monster' && this.overlay === 'map') this.overlay = 'none';
    this.applyOverlay();
    this.heard = [];
    this.scoutClock = 0;
    this.applyOverlay();
    this.refreshCorners();
  }

  // --- Ein Overlay auf einmal ----------------------------------------------------

  /** Was gerade über der Szene liegt — für Tests und die Anzeige. */
  get openOverlay(): FlatOverlay {
    return this.overlay;
  }

  /** Umschalten und sofort anwenden. */
  private setOverlay(next: FlatOverlay): void {
    if (next === this.overlay) return;
    this.overlay = next;
    if (next === 'options') this.renderOptions();
    this.applyOverlay();
  }

  /**
   * **Die eine Stelle, an der Sichtbarkeit entschieden wird.**
   *
   * Zwei Fragen, mehr nicht: Liegt ein Overlay über der Szene? Und welche
   * Rolle spielt der, der hier sitzt? Vorher legte jeder Knopf sein eigenes
   * `hidden` um — das Rätsel schloss das Menü, das Menü schloss die Akte, die
   * Akte wusste nichts von der Karte —, und übrig blieb ein Bild, in dem die
   * Aufgabenliste über einem Kabelrätsel stand und der Stock darunter noch
   * lief.
   *
   * Die **Szene** geht dabei mit weg. Sie rechnet weiter (die Runde läuft
   * nicht langsamer, weil jemand eine Akte liest), aber sie ist nicht zu
   * sehen: Ein Rätsel vor einer Station, auf der das Monster um die Ecke
   * biegt, ist kein Rätsel mehr, sondern eine Ablenkung mit Hintergrund.
   */
  private applyOverlay(): void {
    const open = this.overlay !== 'none';
    // **Eine aufgeschlagene Rolle** (`views/roleStrip.ts`) liegt wie ein
    // Overlay über der Szene: Wer der Runde beim Archiv zusieht, sieht
    // nicht daneben noch den Stock.
    const guest = !!this.strip.active;
    const role = this.role;
    this.element.dataset['overlay'] = this.overlay;
    this.mapOverlay.hidden = this.overlay !== 'map';
    this.sheet.hidden = this.overlay !== 'sheet';
    this.options.hidden = this.overlay !== 'options';
    // **Der obere Rand ist weg, solange ein Overlay offen ist** — Karte,
    // Rätsel, Akte, Optionsmenü. Wer das Menü offen hat, sieht das Menü und
    // nicht noch einmal den Kopf dahinter; geschlossen wird über den eigenen
    // Knopf des Overlays.
    this.top.hidden = open;
    // **Eine aufgeschlagene Rolle lässt die erste Zeile stehen.** Sie ist der
    // Rückweg: Wer die Schalttafel offen hat und den Streifen mit versteckte,
    // säße darin fest. Uhr und Sprungknöpfe gehören dagegen der Szene und
    // gehen mit ihr weg.
    this.hudRow.hidden = role === 'monster' || guest;
    this.jump.hidden = role === 'monster' || guest;
    this.scene.element.hidden = open || guest || role === 'monster';
    if (open || guest) this.chore.hidden = true;
    if (this.session) this.session.element.hidden = open || guest;
    for (const node of [this.stick.element, this.buttons])
      node.hidden = open || guest || role !== 'technician';
  }

  /**
   * **Das Rätsel gehört der Runde, nicht einem Knopf** — es geht auf, wenn der
   * Techniker an einer Konsole steht, und zu, wenn es gelöst ist. Deshalb wird
   * der Overlay-Zustand danach nachgezogen und nicht umgekehrt; ein offenes
   * Rätsel schiebt Karte, Akte und Menü beiseite.
   */
  private syncOverlay(): void {
    if (this.round.puzzle) this.setOverlay('puzzle');
    else if (this.overlay === 'puzzle') this.setOverlay('none');
    else this.applyOverlay();
  }

  /**
   * **Was eine aufgeschlagene Rolle von der Runde bekommt.** Nur Getter und
   * die zwei Griffe der Schalttafel; gestartet oder verworfen wird nichts —
   * die Runde läuft weiter, während jemand ihr beim Archiv zusieht.
   */
  private roleHost(): RoleHost {
    return {
      snapshot: () => this.round.snapshot(),
      spec: () => this.round.house,
      ledger: () => this.round.state(),
      me: () => PLAYER_ID,
      nameOf: (peer) => peer,
      door: (id) => this.round.lockDoor(id),
      light: (id) => this.round.switchLight(id),
      // Die halbe Tafel liegt hinter dem Sicherungskasten (`panel.ts`) — auch
      // hier, wo der Techniker sie sich selbst aufschlägt.
      switches: () => visibleSwitches(this.round.house.switches, this.round.state().fuse),
      notify: (text) => this.say(text),
    };
  }

  /**
   * **Der Archivar sagt es auch hier, wenn er ein Bot ist**
   * (`rules/archiveRadio.ts`) — dieselben zwei Sätze wie im Schiff, damit die
   * 2D-Runde nicht die stille Fassung derselben Runde ist. Ein Mensch am
   * Archiv schweigt das Funkgerät: Dann ist das Sagen sein Platz.
   */
  private stepArchiveRadio(): void {
    if (!this.powers.archive || this.netWatch || this.round.phase !== 'running') {
      this.radioed = '';
      return;
    }
    const call = archiveRadio(this.round.house, this.round.state());
    if (!call || call.key === this.radioed) return;
    this.radioed = call.key;
    this.say(call.text);
  }

  /** Wer gerade spielt — für Tests und die Anzeige. */
  get role(): FlatRole {
    return this.session ? 'monster' : this.bot || this.netWatch ? 'watch' : 'technician';
  }

  /**
   * **Zuschauen an und wieder aus.** Wer zusieht, überlässt den Stock dem
   * Techniker aus Zahlen (`rules/technicianBot.ts`); wer zurückkommt, nimmt
   * ihn wieder — dieselbe Runde, dieselbe Karte, ein anderer Kopf.
   *
   * **Und er sieht dabei alles.** Das war die halbe Rolle und stand doch in
   * einem zweiten Menü: Ein Zuschauer, der nur so viel sieht wie der Anzug des
   * anderen hergibt, sieht einem schwarzen Bild zu. Wer zurück an den Stock
   * geht, bekommt die realitätsnahe Sicht wieder — sonst spielte er weiter mit
   * dem Wissen des Zuschauers.
   */
  setWatching(watching: boolean): void {
    if ((this.role === 'watch') === watching) return;
    this.playRole(watching ? 'watch' : 'technician');
    const modes = viewModesFor('flat');
    const wanted = watching ? 'omniscient' : 'realistic';
    const mode = modes.find((one) => one.visibility === wanted);
    if (mode && mode.id !== this.mode.id) this.setMode(mode);
    this.strip.refresh();
  }

  /** Der Modus, den die Karte gerade zeigt. */
  get visibilityMode(): ViewMode['visibility'] {
    return this.mode.visibility;
  }

  get activeTool(): string {
    return this.round.activeTool;
  }

  /** Was der Techniker aus den Bot-Plätzen bekommt — für Tests und die Anzeige. */
  get soloPowers(): Readonly<SoloPowers> {
    return this.powers;
  }

  /** Ob die Wege auf Szene und Karte liegen. */
  get routesShown(): boolean {
    return this.routes;
  }

  /**
   * **Die gepufferten Werkzeugbilder nachreichen.** Die 2D-Welt selbst lädt
   * kein three.js; wer sie öffnet (`HauntingWorld`), rendert die Modelle
   * einmal und gibt den Puffer hier herein. Ohne Puffer bleibt der Knopf beim
   * Namen des Werkzeugs — kein zweites, von Hand gemaltes Bild.
   */
  setToolIcons(icons: ToolIconSource | null): void {
    this.icons = icons;
    this.iconTool = '\u0000';
    this.refreshIcon();
  }

  /** Das Icon im Wechseln-Knopf nachziehen, wenn sich das Werkzeug geändert hat. */
  private refreshIcon(): void {
    const tool = this.round.activeTool;
    if (tool === this.iconTool) return;
    this.iconTool = tool;
    const image = tool ? (this.icons?.icon(tool) ?? null) : null;
    const ctx = image ? this.icon.getContext('2d') : null;
    if (!image || !ctx) {
      this.icon.hidden = true;
      return;
    }
    const size = Number((image as HTMLCanvasElement).width) || 64;
    this.icon.width = size;
    this.icon.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(image, 0, 0, size, size);
    this.icon.hidden = false;
  }

  /** Ein Bild: Stock lesen, Runde rechnen, Karte und Anzeigen nachführen. */
  update(dt: number): void {
    if (this.netWatch) this.readNet();
    else if (this.session) this.session.update(dt);
    else if (this.bot) this.bot.step(dt);
    else {
      const stick = this.stick.value;
      this.round.step(dt, { x: stick.x, z: stick.z, sprint: stick.sprint });
    }
    // Die Meldungen der eigenen Runde gehören dem, der sie spielt. Der
    // Zuschauer am Netz hat keine — seine Runde steht still, und was sie beim
    // Anhalten noch in der Warteschlange hatte, ist nicht seine Nachricht.
    if (!this.netWatch) for (const event of this.round.drain()) this.show(event);
    const shown = this.view();
    this.audio.update(dt, {
      snapshot: shown,
      // Wer das Monster spielt, hört mit dessen Ohren.
      listener: this.session ? MONSTER_ID : PLAYER_ID,
      kind: this.monsterKind,
      active: this.netWatch
        ? shown.entities.some((entity) => entity.kind === 'monster')
        : this.round.state().monsterOn,
    });
    this.toastLeft = Math.max(0, this.toastLeft - dt);
    if (this.toastLeft <= 0 && this.toast.textContent) {
      this.toast.textContent = '';
      this.toast.className = 'flat__toast';
    }
    this.strip.update(dt);
    if (!this.session && !this.strip.active) {
      this.stepArchiveRadio();
      this.stepScout(dt);
      this.followPlayer();
      this.scene.setSnapshot(shown);
      this.scene.setVisibility(this.field());
      this.scene.draw();
      if (!this.mapOverlay.hidden) {
        this.map.setSnapshot(shown);
        this.map.setVisibility(this.field());
        this.map.draw();
      }
      this.puzzle.sync();
      this.refreshKeys();
      this.renderChore();
      this.refreshCorners();
    }
    this.syncOverlay();
    this.renderHud();
    if (this.phaseNow() !== 'running' && this.ending.hidden) this.renderEnding();
  }

  // --- Zuschauen am Netz ---------------------------------------------------------

  /**
   * **Den Stand aus dem Netz holen** und das Sichtbarkeitsfeld dazu rechnen.
   * Betrachter ist niemand (`viewerId: null`) — ein Zuschauer hat keinen
   * Körper in der Station, und „Alles sehen" schneidet ohnehin nichts weg.
   */
  private readNet(): void {
    const next = this.host.watchSnapshot?.() ?? null;
    if (!next) return;
    this.netSnapshot = next;
    this.netField = computeVisibility(
      { snapshot: next, mode: 'omniscient', viewerId: null },
      this.netLights,
    );
  }

  /** Der Stand, der gezeichnet wird: der aus dem Netz, sonst der eigene. */
  private view(): MapSnapshot {
    return this.netSnapshot ?? this.round.snapshot();
  }

  /** Und das Sichtbarkeitsfeld dazu. */
  private field(): VisibilityField {
    return this.netSnapshot ? this.netField : this.round.field;
  }

  /** Der Stand der Rundenregeln — aus dem Netz, wenn er von dort kommt. */
  private roundNow(): MapRound {
    return this.netSnapshot?.round ?? this.round.round();
  }

  /** Und die Phase; ohne Netz die der eigenen Runde. */
  private phaseNow(): MapRound['phase'] {
    return this.netSnapshot?.round?.phase ?? this.round.phase;
  }

  /** Ob überhaupt ein Monster in der gezeigten Runde herumläuft. */
  private monsterAbout(): boolean {
    return this.netWatch
      ? this.view().entities.some((entity) => entity.kind === 'monster')
      : this.round.state().monsterOn;
  }

  /**
   * **Was das Monster glaubt und vorhat** — und nur für den, der alles sehen
   * darf (Paket M4). Im realitätsnahen Modus gibt es das nie: Ein Techniker
   * mit dem Glaubensbild vor sich weiß, welche Zimmer gerade sicher sind.
   *
   * Woher es kommt, hängt daran, wer rechnet: In der lokalen Vorführung steht
   * es im letzten Beschluss der eigenen Runde, am Netz weiß es nur der
   * Gastgeber — wer nur zusieht, bekommt dort `null` und sieht die Runde eben
   * ohne den Kopf des Gegners.
   */
  private insight(): MonsterInsight | null {
    if (this.mode.visibility !== 'omniscient') return null;
    const shared = this.host.insight?.() ?? null;
    if (shared) return shared;
    return this.netWatch ? null : (this.round.decided?.insight ?? null);
  }

  /** Das Overlay auf der Kartenübersicht — dieselben Zahlen wie auf der Szene. */
  private drawMapOverlay(
    ctx: CanvasRenderingContext2D,
    pen: (x: number, z: number) => { x: number; y: number },
  ): void {
    const insight = this.insight();
    if (insight) drawInsight(ctx, insight, this.view(), pen);
  }

  /** Die Kartenübersicht ein- oder ausblenden — sie zeichnet nur, solange sie offen ist. */
  showMap(open: boolean): void {
    this.setOverlay(open ? 'map' : this.overlay === 'map' ? 'none' : this.overlay);
    if (open) {
      this.map.fit();
      this.map.setSnapshot(this.round.snapshot());
      this.map.setVisibility(this.round.field);
      this.map.draw();
    }
  }

  /** Nur für Tests: ob die Kartenübersicht offen ist. */
  get mapOpen(): boolean {
    return !this.mapOverlay.hidden;
  }

  // --- Die Zentrale auf dem eigenen Bild -----------------------------------------

  /**
   * **Das Horchbild des Spähers.** Der Späher sieht das Monster nicht mehr —
   * eine Peilung, die alle drei Sekunden sagt, wo es steht, nimmt ihm jede
   * Möglichkeit, sich zu verstecken oder aufzulauern, und ein Schacht ist
   * dann nur noch ein schnellerer Weg. Was er bekommt, ist, was ein Ohr an
   * der Wand bekäme: **Geräusche**, und die auch nur als Probe alle
   * `SCOUT_PERIOD` Sekunden. Wer still steht, kommt darin nicht vor.
   *
   * Die Probe wird dabei **neu gestempelt**: Die Wellen laufen vom Moment der
   * Probe an los, klingen aus, und bis zur nächsten bleibt die Karte still.
   */
  private stepScout(dt: number): void {
    if (!this.powers.scout || this.mode.visibility === 'omniscient') {
      this.heard = [];
      return;
    }
    this.scoutClock -= dt;
    if (this.scoutClock > 0) return;
    this.scoutClock = SCOUT_PERIOD;
    const now = this.round.state().time;
    this.heard = this.round
      .noises()
      .filter((noise) => noise.by !== PLAYER_ID && now - noise.since <= SCOUT_PERIOD)
      .map((noise) => ({ ...noise, by: '', cause: 'interact' as const, since: now }));
  }

  /** Das letzte Horchbild — für Tests. */
  get scoutNoises(): readonly MapNoise[] {
    return this.heard;
  }

  /**
   * **Was die Kartenübersicht an Geräuschen zeigt.** Im Modus „Alles sehen"
   * alles, wie eh und je. Realitätsnah ist die Karte das Bild der Zentrale
   * und nicht das eigene Ohr: Dort steht nur, was der Späher zuletzt gehört
   * hat — und ohne Späher steht dort nichts. Was der Techniker selbst
   * wahrnimmt, sieht er auf dem Boden der Szene.
   */
  private mapNoises(): readonly MapNoise[] {
    if (this.netWatch) return this.view().noises ?? [];
    if (this.mode.visibility === 'omniscient') return this.round.noises();
    return this.powers.scout ? this.heard : [];
  }

  /**
   * **Die Farben der Wellen auf dem Boden.** Wer zusieht, darf sie
   * auseinanderhalten: eigene blau, die des Monsters rot, alles andere
   * orange. **Wer mitspielt, darf das nicht** — für ihn ist ein Geräusch ein
   * Geräusch, ob es aus einer Tür, einem Mitspieler oder dem Monster kam;
   * sonst wäre der Boden ein Ortungsgerät. Und die **eigenen Schritte** bleiben
   * ganz weg: Man sieht sich nicht selbst zu.
   */
  private sceneNoiseInk(noise: MapNoise): string | null {
    if (this.bot || this.netWatch || this.mode.visibility === 'omniscient')
      return noise.cause === 'monster' || noise.by === MONSTER_ID
        ? INK.noiseMonster
        : noise.by === PLAYER_ID
          ? INK.noiseOwn
          : INK.noiseOther;
    if (noise.by === PLAYER_ID)
      return noise.cause === 'walk' || noise.cause === 'sprint' ? null : INK.noiseOwn;
    return INK.noiseOther;
  }

  /**
   * Was über der Szene liegt: die Wege (wenn gewollt) und die Ziele — als
   * Ring am Ort und gelbes Dreieck am Rand des Bildes.
   */
  private drawSceneOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.session) return;
    const scene = this.scene;
    const { width: w, height: h } = scene.canvas.getBoundingClientRect();
    const width = w || 320,
      height = h || 320;
    // **Zuerst die Absichten des Monsters** (Paket M4): Die Raumtönung gehört
    // unter die Wege und Ziele, sonst deckt eine Fläche die Linien zu, für die
    // sie den Hintergrund abgeben soll.
    const insight = this.insight();
    if (insight) drawInsight(ctx, insight, this.view(), (x, z) => scene.toScreen(x, z));
    for (const route of this.routeLines()) {
      ctx.strokeStyle = route.color;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      route.points.forEach((point, i) => {
        const p = scene.toScreen(point.x, point.z);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const inset = { top: EDGE_TOP, right: 18, bottom: 130, left: 18 };
    const t = Date.now() / 1000;
    // Die Ziele sind die des Technikers dieser Runde — am Netz kennt sie das
    // Gerät des Zuschauers nicht, und geratene Ziele wären eine Lüge im Bild.
    if (!this.netWatch)
      for (const goal of this.round.objectives())
        this.drawGoal(ctx, scene, goal, width, height, inset, t);
  }

  private drawGoal(
    ctx: CanvasRenderingContext2D,
    scene: FlatScene,
    goal: MapGoal,
    w: number,
    h: number,
    inset: { top: number; right: number; bottom: number; left: number },
    t: number,
  ): void {
    const p = scene.toScreen(goal.at.x, goal.at.z);
    const inside =
      p.x >= inset.left && p.x <= w - inset.right && p.y >= inset.top && p.y <= h - inset.bottom;
    ctx.fillStyle = goal.next ? INK.goal : INK.goalDim;
    ctx.strokeStyle = goal.next ? INK.goal : INK.goalDim;
    if (inside) {
      const pulse = goal.next ? 1 + 0.15 * Math.sin(t * 4) : 1;
      const r = 14 * pulse;
      ctx.lineWidth = goal.next ? 3 : 1.5;
      // **Kiste und Raum leuchten selbst** (`flatArt.drawCargo`,
      // `flatScene`) — die Ellipse daneben war die zweite Marke für dieselbe
      // Sache und ist es nur noch dort, wo nichts leuchtet: Konsole, Zentrale.
      if (goal.kind !== 'crate' && goal.kind !== 'room') {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r * 1.3, r * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (goal.next) {
        const y = p.y - 44 - 4 * Math.sin(t * 4);
        ctx.beginPath();
        ctx.moveTo(p.x, y + 14);
        ctx.lineTo(p.x - 9, y);
        ctx.lineTo(p.x + 9, y);
        ctx.closePath();
        ctx.fill();
      }
      return;
    }
    const cx = (inset.left + w - inset.right) / 2,
      cy = (inset.top + h - inset.bottom) / 2;
    const dx = p.x - cx,
      dy = p.y - cy;
    const hw = (w - inset.left - inset.right) / 2,
      hh = (h - inset.top - inset.bottom) / 2;
    const k = Math.min(hw / Math.max(1e-6, Math.abs(dx)), hh / Math.max(1e-6, Math.abs(dy)));
    const ex = cx + dx * k,
      ey = cy + dy * k;
    const angle = Math.atan2(dy, dx);
    const size = goal.next ? 14 : 10;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, -size * 0.7);
    ctx.lineTo(-size * 0.35, 0);
    ctx.lineTo(-size * 0.7, size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1d2126';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    if (goal.next) {
      const metres = Math.round(
        Math.hypot(goal.at.x - this.round.player.x, goal.at.z - this.round.player.z),
      );
      const lx = ex - Math.cos(angle) * 26,
        ly = ey - Math.sin(angle) * 26;
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(`${metres} m`, lx + 1, ly + 1);
      ctx.fillStyle = INK.goal;
      ctx.fillText(`${metres} m`, lx, ly);
    }
  }

  /** Die Wege, wenn sie gewollt sind: das Monster rot, der Techniker cyan. */
  private routeLines(): MapRoute[] {
    // Am Netz gibt es keine Wegsuche auf diesem Gerät — die Wege wären die der
    // stillstehenden eigenen Runde und zeigten quer durch die Station.
    if (!this.routes || this.session || this.netWatch) return [];
    const out: MapRoute[] = [];
    if (this.mode.visibility === 'omniscient' || this.powers.scout) {
      const monster = this.round.monsterRoute();
      if (monster.length > 1)
        out.push({ id: 'monster', points: monster, color: INK.monster, goal: true });
    }
    const player = this.round.playerRoute();
    if (player.length > 1) out.push({ id: 'player', points: player, color: INK.player });
    return out;
  }

  /** Ein Tipp auf eine Tür: mit der Schalttafel sperren oder freigeben, sonst nur benennen. */
  private tapDoor(id: string): void {
    if (!this.powers.panel || this.session) {
      const door = this.view().doors.find((d) => d.id === id);
      this.say(door ? (door.locked ? 'Tür gesperrt.' : 'Tür offen.') : id);
      return;
    }
    const text = this.round.lockDoor(id);
    if (text) this.say(`Schalttafel: ${text}`);
  }

  /** Ein Tipp auf eine Lampe: mit der Schalttafel schalten. */
  private tapLight(id: string): void {
    if (!this.powers.panel || this.session) {
      this.say(this.view().lights.find((one) => one.id === id)?.on ? 'Licht an.' : 'Licht aus.');
      return;
    }
    const text = this.round.switchLight(id);
    if (text) this.say(`Schalttafel: ${text}`);
  }

  private tapItem(id: string): void {
    const item = this.view().items.find((i) => i.id === id);
    if (!item) return;
    if (this.powers.archive && item.roomId && item.kind !== 'van') this.openSheet(item.roomId);
    else this.say(item.label);
  }

  /** Ein Tipp auf ein Zimmer: mit dem Archiv die Akte, sonst nur den Namen. */
  private tapRoom(id: string): void {
    if (this.powers.archive && !this.session) this.openSheet(id);
    else this.say(this.view().rooms.find((r) => r.id === id)?.name ?? id);
  }

  /**
   * **Die Akte des Archivars**, aufgeschlagen für ein Zimmer: was darin
   * steht, der Schutzschrank-Code, die Fracht und die Konsole mit dem, was
   * ihr Rätsel braucht — dieselben Fakten wie am Telefon des Archivars
   * (`stationUi.ts`), nur eben auf dem eigenen Bild.
   */
  openSheet(roomId: string): void {
    const spec = this.round.house;
    const snapshot = this.round.snapshot();
    const room = snapshot.rooms.find((r) => r.id === roomId);
    if (!room) return;
    const house: HouseRoom | undefined = spec.rooms.find((r) => r.id === roomId);
    const parts: HTMLElement[] = [el('strong', '', `Akte · ${room.name}`)];
    const line = (key: string, value: string, warn = false) => {
      const row = el('div', `flat__fact${warn ? ' is-warn' : ''}`);
      row.append(el('span', '', key), el('b', '', value));
      parts.push(row);
    };
    if (house) {
      line('Darin steht', MARKS[house.signature]);
      line('Schutzschrank-Code', lockerCode(spec.seed, house.id));
    } else line('Bereich', room.circulation ? 'Gang' : room.safe ? 'sicher' : '');
    const doors = snapshot.doors.filter((d) => d.a === roomId || d.b === roomId);
    const locked = doors.filter((d) => d.locked).length;
    line(
      'Türen',
      `${doors.length}${doors.some((d) => d.material === 'metal') ? ' · eine aus Stahl' : ''}${locked ? ` · ${locked} gesperrt` : ''}`,
      locked > 0,
    );
    line('Licht', room.lit ? 'an' : 'aus', !room.lit);
    for (const item of snapshot.items.filter((i) => i.roomId === roomId)) {
      if (item.kind === 'cargo') {
        // **Über die Id, nicht über das Label.** Auf einer Kiste steht ihr
        // Kennzeichen, seit der Snapshot keine Teilenamen mehr trägt; wer hier
        // Labels mit Aufgabennamen verglich, fand nie wieder eine Kiste.
        const slot = cargoOf(spec).find((one) => one.id === item.id);
        const loot = slot?.loot;
        const task =
          loot && loot.kind === 'part' ? spec.tasks.find((t) => t.id === loot.taskId) : undefined;
        line(
          'Fracht',
          `${slot ? cargoLabel(slot) : item.label} · ${item.state === 'taken' ? 'mitgenommen' : item.state === 'open' ? 'geöffnet' : 'verschlossen'}`,
        );
        // Der Fundhinweis ist die Auskunft des Archivars — die Kiste und ihre
        // Wand (`rules/cargo.ts`), nicht mehr das Möbel daneben. Er steht nur
        // auf dem Blatt dessen, der die Akte auch hat.
        if (task && item.state !== 'taken' && this.powers.archive)
          line('Fundhinweis', `${task.label} · ${taskCargo(spec, task.id).clue}`);
      } else if (item.kind === 'console') {
        const repair = repairsFor(spec).find((r) => r.title === item.label);
        line('Konsole', `${item.label} · ${item.state === 'solved' ? 'repariert' : 'defekt'}`);
        if (repair && item.state !== 'solved') {
          line('Benötigt', repair.item);
          line(
            repair.puzzle === 'wires'
              ? 'Kabelplan'
              : repair.puzzle === 'sequence'
                ? 'Freigabefolge'
                : 'Zielfrequenzen',
            repair.puzzle === 'wires'
              ? 'Stecker an die Buchse mit gleichem Symbol'
              : repair.code.split('').join(' '),
          );
        }
      } else if (item.kind === 'locker')
        line(
          'Schutzschrank',
          item.state === 'destroyed' ? 'zerstört' : 'benutzbar',
          item.state === 'destroyed',
        );
      else if (item.kind === 'vent') {
        const links = (snapshot.ventLinks ?? []).filter((l) => l.a === item.id || l.b === item.id);
        const targets = links.map((l) => {
          const other = snapshot.items.find((i) => i.id === (l.a === item.id ? l.b : l.a));
          return snapshot.rooms.find((r) => r.id === other?.roomId)?.name ?? '?';
        });
        line('Schacht', targets.length ? `nach ${targets.join(', ')}` : 'ohne Anschluss');
      }
    }
    parts.push(
      el(
        'small',
        'flat__hint',
        'Archivscan · nur dieser Raum · keine Personen oder Live-Positionen',
      ),
    );
    const close = el('button', 'flat__option', 'Zurück');
    close.dataset['closeSheet'] = '';
    parts.push(close);
    this.sheet.replaceChildren(...parts);
    this.setOverlay('sheet');
  }

  private say(text: string): void {
    this.show({ kind: 'info', text });
  }

  private show(event: FlatEvent): void {
    this.toast.textContent = event.text;
    this.toast.className = `flat__toast is-${event.kind}`;
    this.toastLeft = TOAST_SECONDS;
    if (event.kind === 'good' || event.kind === 'bad') this.host.notify?.(event.text);
  }

  /**
   * **Der Balken über den Knöpfen**, solange ein Handgriff läuft — und weg,
   * sobald er fertig oder abgebrochen ist. Er steht nicht im Kasten oben:
   * Wer eine Kiste aufklappt, sieht auf seine Hände und auf das, was hinter
   * ihm passiert, nicht auf den Sauerstoffstand.
   */
  private renderChore(): void {
    const chore = this.round.busy;
    this.chore.hidden = !chore || this.overlay !== 'none' || !!this.strip.active;
    if (!chore) return;
    const done = Math.round(this.round.busyProgress * 100);
    if (this.choreLabel.textContent !== chore.label) this.choreLabel.textContent = chore.label;
    this.choreFill.style.width = `${done}%`;
    this.chore.setAttribute('aria-valuenow', String(done));
    this.chore.setAttribute('aria-label', `${chore.label} · stillstehen`);
  }

  private refreshKeys(): void {
    const tool = this.round.activeTool;
    this.cycleKey.replaceChildren(
      el('small', '', 'Wechseln'),
      this.icon,
      el('strong', '', TOOL_LABELS[tool] ?? tool),
    );
    this.cycleKey.disabled = this.round.tools.length < 2;
    this.refreshIcon();
    this.useKey.textContent = '';
    const use =
      tool === 'flashlight'
        ? this.round.torch
          ? 'Lampe aus'
          : 'Lampe an'
        : tool === 'medkit'
          ? 'Heilen'
          : tool === 'radar'
            ? 'Orten'
            : tool === 'xray'
              ? 'Durchleuchten'
              : 'Benutzen';
    this.useKey.append(el('small', '', 'Werkzeug'), el('strong', '', use));
    const target = this.round.target;
    this.actKey.textContent = '';
    this.actKey.append(el('strong', '', 'Benutzen'), el('small', '', target?.label ?? ''));
    this.actKey.classList.toggle('is-ready', !!target);
  }

  /**
   * **Der erste Schritt holt die Kamera zurück** (`CAMERA_RETURN`).
   *
   * Der Techniker zieht die Szene zur Seite, um nachzusehen, was hinter der
   * nächsten Wand liegt — und läuft dann weiter. Vorher blieb die Kamera
   * liegen, wo er sie hingezogen hatte, und er lief aus dem eigenen Bild
   * heraus; „Zum Spieler" war ein Zustand, den man selbst aufräumen musste.
   * Jetzt ist Verschieben ein Blick zur Seite, der endet, sobald er sich
   * bewegt — und der Knopf steht nur da, solange er wirklich etwas tut.
   *
   * **Nur für den, der spielt.** In der Vorführung und beim Zuschauen läuft
   * der Techniker ununterbrochen; dieselbe Regel nähme dort jedes Verschieben
   * schon im nächsten Bild wieder zurück.
   */
  private followPlayer(): void {
    const at = this.round.player;
    const moved = Math.hypot(at.x - this.lastAt.x, at.z - this.lastAt.z);
    this.lastAt = { x: at.x, z: at.z };
    if (this.bot || this.netWatch || moved < CAMERA_RETURN) return;
    if (this.scene.current.following !== PLAYER_ID) this.scene.follow(PLAYER_ID);
  }

  /**
   * **Die zwei Sprungknöpfe.** Wer die Kamera ohnehin am Spieler hat, braucht
   * keinen Knopf, der sie dorthin holt — er nimmt nur Platz vor der Szene
   * weg. **Wer zusieht**, hat keinen eigenen Spieler und beide Seiten zu
   * verfolgen: Für ihn stehen beide Knöpfe immer da, auch der zum Monster.
   */
  private refreshCorners(): void {
    const watching = !!this.bot || this.netWatch;
    const following = this.scene.current.following;
    // Der Zuschauer springt nicht „zum Spieler" — er hat keinen. Er springt zu
    // dem, der die Station repariert, und der heißt hier überall Techniker.
    const centre = watching ? 'Zum Techniker' : 'Zum Spieler';
    if (this.centreKey.textContent !== centre) this.centreKey.textContent = centre;
    this.centreKey.hidden = !watching && following === PLAYER_ID;
    this.centreKey.classList.toggle('is-active', following === PLAYER_ID);
    this.monsterKey.hidden = !watching || !this.monsterAbout();
    this.monsterKey.classList.toggle('is-active', following === MONSTER_ID);
    this.jump.classList.toggle('is-empty', this.centreKey.hidden && this.monsterKey.hidden);
  }

  /**
   * **Der Kasten oben links: zwei Zeilen, mehr nicht.** Oben die Uhr und die
   * Anzug-Leben, darunter der Reiter „Aufgaben:" mit einem Kreis je Auftrag;
   * ein Tipp klappt die Liste auf — erledigte grün, mit `(n/2)`, weil jede
   * Reparatur zwei Schritte hat: das Teil aus der Fracht holen, dann die
   * Konsole lösen.
   *
   * **Was hier nicht mehr steht, steht woanders**: Welches Monster mitspielt,
   * wer welchen Platz besetzt und welcher Sichtmodus läuft, ändert sich
   * während der Runde nicht — das gehört ins Optionsmenü und nicht an den
   * oberen Bildschirmrand. Der Rand gehört dem, was sich ändert; ein Balken,
   * der dasselbe zählt wie die drei Kreise darunter, gehört gar nicht dorthin.
   *
   * Gebaut wird nur, wenn sich der Text ändert; die Uhr allein schreibt keine
   * neue Liste.
   */
  private renderHud(): void {
    const state = this.round.state();
    const crew = state.crew;
    const round = this.roundNow();
    // **Herzen statt Pips.** Zwei Reihen Punkte nebeneinander — der Balken
    // und der Anzug — hießen auf dem Telefon zweimal dasselbe Zeichen und
    // zweimal raten; ein Herz sagt von selbst, dass es ums Leben geht.
    const hp = '♥'.repeat(round.suit) + '♡'.repeat(Math.max(0, round.suitMax - round.suit));
    const shown = this.view();
    const rooms = shown.rooms;
    // **Am Netz zählen die Konsolen und nicht der eigene Stand.** Der Snapshot
    // führt keine Aufgabenliste — er führt Gegenstände mit Zustand, und eine
    // reparierte Konsole steht dort als `solved`. Das ist dieselbe Auskunft,
    // nur von der anderen Seite gelesen; die eigene Runde steht still und
    // wüsste gar nichts.
    const done = this.netWatch
      ? shown.items.filter((item) => item.kind === 'console' && item.state === 'solved')
      : [];
    // Wie weit die Aufträge sind, rechnet `rules/roundHud.ts` — dieselbe
    // Rechnung wie im Streifen der Brille, damit beide dasselbe zählen.
    const repairs = repairsFor(this.round.house);
    const lines = hudTasks({
      repairs,
      roomName: (id) => rooms.find((room) => room.id === id)?.name ?? id,
      done: this.netWatch
        ? repairs.filter((r) => done.some((item) => item.label === r.title)).map((r) => r.itemId)
        : state.done,
      taken: this.netWatch ? [] : state.taken,
      inventory: this.netWatch ? [] : crew.inventory,
    });
    const key = [hp, clockText(round.oxygen), ...lines.map((l) => l.text)].join('|');
    if (this.hud.dataset['text'] === key) return;
    this.hud.dataset['text'] = key;
    this.vitals.replaceChildren(
      el('strong', 'flat__oxygen', `O₂ ${clockText(round.oxygen)}`),
      el('strong', 'flat__suit', hp),
    );
    this.vitals.classList.toggle('is-low', round.oxygen < 60);
    this.tasks.replaceChildren(
      ...lines.map((l) => {
        const node = el('div', 'flat__task', l.text);
        node.classList.toggle('is-done', l.step === 2);
        node.classList.toggle('is-partial', l.step === 1);
        return node;
      }),
    );
    // Eingeklappt bleibt genau so viel stehen, wie man im Vorbeigehen liest:
    // ein Kreis je Auftrag — voll, halb, leer.
    this.pips.replaceChildren(
      ...lines.map((l) => {
        const pip = el('i', 'flat__pip');
        pip.classList.toggle('is-done', l.step === 2);
        pip.classList.toggle('is-partial', l.step === 1);
        return pip;
      }),
    );
    this.tab.setAttribute(
      'aria-label',
      `Aufgaben · ${lines.filter((l) => l.step === 2).length} von ${lines.length} erledigt`,
    );
  }

  /**
   * **Das Zahnrad zeigt nur noch, was sich mitten in der Runde ändert.**
   *
   * Vorher stand hier alles auf einmal: Ansicht, „Neue Runde", „Mit Monster",
   * ein Rollenknopf, der dreistufig weiterzählte, und die ganze Verteilung —
   * eine 1200 Punkte lange Rolle, in der die zwei Schalter untergingen, die
   * man wirklich noch braucht. Wer die *nächste* Runde anders haben will, geht
   * in den Aufbau; hier bleiben Ansicht, Zielpfade und Ton — und die drei
   * Dinge, die mitten in einer Runde wirklich vorkommen: **Zuschauen** an und
   * aus, **2D ↔ 3D** und **Runde verlassen**.
   *
   * **Die Ansicht ist keine Wahl für den, der mitspielt.** „Alles sehen" ist
   * die Sicht des Zuschauers; ein Techniker, der sie anschaltet, sieht das
   * Monster durch Wände und spielt ein anderes Spiel. Er bekommt sie deshalb
   * als Zeile und nicht als Knopf.
   */
  private renderOptions(): void {
    const watching = this.role === 'watch';
    const parts: HTMLElement[] = [
      el('strong', '', ROLE_LABELS[this.role]),
      el('strong', '', 'Ansicht'),
    ];
    if (watching)
      for (const mode of viewModesFor('flat')) {
        const key = el('button', 'flat__option');
        key.dataset['mode'] = mode.id;
        key.classList.toggle('is-active', mode.id === this.mode.id);
        key.append(el('strong', '', mode.label), el('small', '', mode.description));
        parts.push(key);
      }
    else
      parts.push(
        el(
          'small',
          'flat__note',
          `${this.mode.label} · wer mitspielt, sieht so viel wie sein Anzug hergibt`,
        ),
      );
    if (this.netWatch)
      parts.push(
        el(
          'small',
          'flat__note',
          'Du siehst die Runde, die im Raum wirklich läuft — Szene und Karte kommen über das Netz. ' +
            'Solange sie läuft, gibt es hier keine Wege und keine neue Runde.',
        ),
      );
    else {
      const routes = el('button', 'flat__option');
      routes.dataset['routes'] = '';
      routes.classList.toggle('is-active', this.routes);
      routes.append(
        el('strong', '', `Zielpfade: ${this.routes ? 'an' : 'aus'}`),
        el('small', '', 'Der Weg des Technikers zum nächsten Ziel · der des Monsters in Rot'),
      );
      parts.push(routes);
      // **Zuschauen ist keine Rundenart mehr, sondern ein Schalter.** Der
      // Besitzer wollte es ausdrücklich hier haben und „immer" — deshalb steht
      // er zwischen den zwei anderen Dingen, die man mitten in der Runde
      // wirklich braucht, und nicht mehr als Kachel im Aufbau.
      const watch = el('button', 'flat__option');
      watch.dataset['watch'] = '';
      watch.classList.toggle('is-active', watching);
      watch.setAttribute('aria-pressed', watching ? 'true' : 'false');
      watch.append(
        el('strong', '', `Zuschauen: ${watching ? 'an' : 'aus'}`),
        el(
          'small',
          '',
          watching
            ? 'Der Techniker aus Zahlen spielt weiter — antippen holt dich zurück an den Stock'
            : 'Der Techniker aus Zahlen übernimmt, du siehst der Runde zu',
        ),
      );
      parts.push(watch);
    }
    // **Wessen Sicht?** Techniker und Monster hängen an den zwei Sprungknöpfen
    // rechts — die sind während der Runde da und brauchen kein Menü. Die
    // Plätze der Zentrale haben eigene Ansichten (Archiv, Einsatzkontrolle,
    // Drohne), und dorthin führt die Lobby.
    if (watching)
      parts.push(
        el('strong', '', 'Wessen Sicht?'),
        el(
          'small',
          'flat__note',
          'Techniker und Monster: die zwei Sprungknöpfe rechts, mitten in der Runde. ' +
            'Archiv, Schalttafel, Späher und Drohne haben eigene Ansichten — die wählst du in der Lobby.',
        ),
      );
    // **Was vorher als Knopf am Rand hing.** Die Karte hatte oben rechts ein
    // eigenes 🗺 neben dem Zahnrad — zwei runde Knöpfe, die sich mit den
    // Sprungknöpfen um dieselbe Ecke stritten. Menü und Verbindung standen im
    // Streifen der Seite, und der ist in der 2D-Welt abgeschaltet
    // (`core/pageHud.ts`). Alle drei stehen deshalb hier, wo Platz für eine
    // Zeile Erklärung ist.
    parts.push(el('strong', '', 'Aufmachen'));
    const map = el('button', 'flat__option');
    map.dataset['map'] = '';
    map.append(
      el('strong', '', 'Karte'),
      el('small', '', 'Die Übersicht der Station über der Szene'),
    );
    const menu = el('button', 'flat__option');
    menu.dataset['pagemenu'] = '';
    menu.append(
      el('strong', '', 'Menü'),
      el(
        'small',
        '',
        // Das Menü der Seite ist ein Panel in der 3D-Szene und liegt damit
        // **hinter** der 2D-Welt. Es allein aufzumachen hieße, auf ein
        // schwarzes Bild zu tippen — deshalb kommt der Streifen der Seite
        // dafür zurück, und der nächste Tipp nimmt ihn wieder weg.
        pageHudShown()
          ? 'Kopfzeile der Seite wieder ausblenden'
          : 'Menü, Verbindung und VR am oberen Rand der Seite',
      ),
    );
    const net = el('button', 'flat__option');
    net.dataset['pagenet'] = '';
    net.append(
      el('strong', '', 'Verbindung'),
      el('small', '', 'Raum-Code, Mitspieler, Sprache und Chat'),
    );
    parts.push(map, menu, net);
    // Ton: zwei Regler mit drei Stufen (Paket Audio, `audio/settings.ts`).
    parts.push(el('strong', '', 'Ton'));
    for (const which of ['effects', 'ambient'] as const) {
      const key = el('button', 'flat__option');
      key.dataset['audio'] = which;
      key.append(
        el(
          'strong',
          '',
          `${which === 'effects' ? 'Effekte' : 'Ambiente'}: ${levelLabel(this.audio.levels[which])}`,
        ),
        el(
          'small',
          '',
          which === 'effects'
            ? 'Schritte, Monster, Herzschlag'
            : 'Brummen der Station, Dunkelheit, Knarren',
        ),
      );
      parts.push(key);
    }
    // **2D ↔ 3D, mitten in der Runde** (`HauntingWorld.switchView`). Kein
    // Neustart und keine neue Rolle: derselbe Stand, dieselbe Uhr, dasselbe
    // Monster — nur von oben statt von innen. Deshalb steht der Eintrag hier
    // und nicht bei „Zurück zur Lobby", wo alles die Runde beendet.
    if (this.host.switchView) {
      const swap = el('button', 'flat__option');
      swap.dataset['switchView'] = '3d';
      swap.append(
        el('strong', '', `Ansicht: 2D ↔ 3D — zu „${VIEW_LABELS['3d']}"`),
        el('small', '', 'Mitten in der Runde · Stand, Uhr, Türen und Monster bleiben'),
      );
      parts.push(swap);
    }
    // Zurück zur Lobby: Dort steht, was eine *neue* Runde wird — Was, Wer,
    // Wie. Genau die drei Knöpfe, die hier standen und jedes Mal eine halbe
    // Lobby nachbauten.
    const leave = el('button', 'flat__option flat__option--leave');
    leave.dataset['leave'] = '';
    leave.append(
      el('strong', '', 'Runde verlassen'),
      el('small', '', 'Beendet die Runde · zurück zum Aufbau'),
    );
    const close = el('button', 'flat__option', 'Weiterspielen');
    close.dataset['closeOptions'] = '';
    parts.push(leave, close);
    this.options.replaceChildren(...parts);
  }

  private renderEnding(): void {
    const won = this.phaseNow() === 'won';
    this.ending.hidden = false;
    const again = el('button', 'flat__option', 'Neue Runde');
    again.dataset['restart'] = '';
    const leave = el('button', 'flat__option flat__option--leave', '2D-Welt verlassen');
    leave.dataset['leave'] = '';
    const ending = this.roundNow().ending;
    const headline = this.session
      ? won
        ? 'DER TECHNIKER ENTKOMMT'
        : 'DAS MONSTER GEWINNT'
      : this.netWatch
        ? won
          ? 'DER TECHNIKER ENTKOMMT'
          : 'DAS MONSTER GEWINNT'
        : this.bot
          ? won
            ? 'BOT-RUNDE: DER TECHNIKER GEWINNT'
            : 'BOT-RUNDE: DAS MONSTER GEWINNT'
          : won
            ? 'MISSION ERFÜLLT'
            : 'MISSION GESCHEITERT';
    this.ending.replaceChildren(
      el('strong', '', headline),
      el(
        'span',
        '',
        won
          ? 'Alle Systeme online, Crew zurück in der Zentrale.'
          : ending === 'oxygen'
            ? 'Der Sauerstoff ist aufgebraucht. Noch einmal?'
            : 'Anzug zerstört. Noch einmal?',
      ),
      // **Am Netz gibt es hier keine neue Runde.** Sie zu starten hieße, sie
      // dem wegzunehmen, der sie gerade spielt; der Zuschauer geht zurück in
      // die Lobby und sucht sich eine neue Rolle.
      ...(this.netWatch ? [] : [again]),
      leave,
    );
  }

  private optionClick(event: Event): void {
    const key = (event.target as HTMLElement | null)?.closest('button');
    if (!key) return;
    const data = key.dataset;
    if (data['mode']) {
      const mode = viewModesFor('flat').find((m) => m.id === data['mode']);
      if (mode) this.setMode(mode);
      this.renderOptions();
    } else if (data['routes'] !== undefined) {
      this.routes = !this.routes;
      this.renderOptions();
    } else if (data['restart'] !== undefined) {
      // Nur noch der Knopf im Endbildschirm („Noch einmal?"). Im Optionsmenü
      // steht keine neue Runde mehr — die wird im Aufbau verteilt.
      this.restart();
    } else if (data['watch'] !== undefined) {
      this.setWatching(this.role !== 'watch');
      this.renderOptions();
    } else if (data['switchView'] === '2d' || data['switchView'] === '3d') {
      // Das Menü geht zu: Der Wechsel nimmt diese ganze Ansicht mit, und ein
      // offenes Panel über einem Schiff wäre ein Rest der alten.
      this.options.hidden = true;
      this.host.switchView?.(data['switchView']);
    } else if (data['leave'] !== undefined) {
      this.host.exit();
    } else if (data['audio'] === 'effects' || data['audio'] === 'ambient') {
      this.audio.cycle(data['audio']);
      this.renderOptions();
    } else if (data['map'] !== undefined) {
      this.showMap(true);
    } else if (data['pagemenu'] !== undefined) {
      // Erst den Streifen der Seite zurückholen (oder wieder wegnehmen),
      // dann drücken: Das Menü ist ein Panel in der 3D-Szene und läge sonst
      // hinter der 2D-Welt.
      const back = !pageHudShown();
      showPageHud(back);
      // Steht der Streifen wieder da, rückt der obere Rand der 2D-Welt unter
      // ihn — sonst wäre er genau das, was er vorher war: ein fremder Knopf
      // über dem Aufgabenkasten.
      this.element.classList.toggle('is-paged', back);
      pressPageButton('menu');
      this.setOverlay('none');
    } else if (data['pagenet'] !== undefined) {
      // Das Verbindungs-Panel der Seite liegt mit `z-index: 6` über allem —
      // dafür braucht es die Kopfzeile nicht.
      pressPageButton('net');
      this.setOverlay('none');
    } else if (data['closeOptions'] !== undefined || data['closeSheet'] !== undefined) {
      this.setOverlay('none');
    }
  }

  setMode(mode: ViewMode): void {
    this.mode = mode;
    this.round.setMode(mode.visibility);
    this.map.setLayers(mode.layers);
    this.map.setMarkers(mode.markers);
    this.element.dataset['mode'] = mode.visibility;
    this.applyLayers();
  }

  /** Schächte liegen auf der Karte, wenn man alles sieht — der Techniker fährt nicht damit. */
  private applyLayers(): void {
    this.map.setLayers({ vents: this.mode.visibility === 'omniscient' });
  }

  /**
   * Eine neue Runde mit neuem Samen — Werkzeuge und Karte von vorn, mit der
   * Verteilung, wie sie jetzt auf der Tafel steht.
   */
  restart(options?: FlatOptions): void {
    const setup = options?.setup ?? this.setup;
    const next: FlatOptions = {
      ...this.options_,
      ...options,
      // **Eine neue Runde setzt nichts fort.** `resume` kam einmal herein, um
      // eine laufende Runde zu übernehmen (`FlatResume`); bliebe es stehen,
      // würfelte „Noch einmal?" einen neuen Samen und spielte trotzdem den
      // alten Stand weiter.
      resume: undefined,
      setup,
      test: setup.monster === 'off',
      role: flatRoleOf(setup),
      powers: powersOf(setup),
      routes: this.routes,
    };
    this.setup = setup;
    this.powers = next.powers!;
    this.seed = this.dice.int(0x7fffffff);
    this.round = new FlatRound(this.seed, { ...next, mode: this.mode.visibility });
    this.puzzle.element.remove();
    this.puzzle = new PuzzleOverlay(this.round);
    this.element.insertBefore(this.puzzle.element, this.sheet);
    this.ending.hidden = true;
    this.setOverlay('none');
    this.lastAt = { x: this.round.player.x, z: this.round.player.z };
    this.strip.show('');
    this.scene.follow(PLAYER_ID);
    this.map.fit();
    this.map.follow(PLAYER_ID);
    this.playRole(next.role ?? 'technician');
    this.refreshKeys();
  }

  /** Nur für Tests: die Erscheinung des Monsters der laufenden Runde. */
  get monsterKind(): MonsterKind {
    return this.round.state().crew.options.monster;
  }

  dispose(): void {
    // Der Streifen der Seite kommt so zurück, wie er vor dem Betreten stand
    // (`core/pageHud.ts`) — auch dann, wenn ihn zwischendurch jemand über das
    // Zahnrad wieder hervorgeholt hat.
    showPageHud(true);
    this.strip.dispose();
    this.session?.dispose();
    this.audio.dispose();
    this.stick.dispose();
    this.scene.dispose();
    this.map.dispose();
    this.element.remove();
  }
}
