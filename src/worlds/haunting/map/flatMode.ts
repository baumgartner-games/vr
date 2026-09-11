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
import { cargoLabel, cargoOf, taskCargo } from '../rules/cargo';
import { hudTasks } from '../rules/roundHud';
import {
  defaultSetup,
  flatRoleOf,
  powersOf,
  type RoundSetup,
  type SoloPowers,
} from '../rules/roundSetup';
import { TechnicianBot } from '../rules/technicianBot';
import { MonsterSession } from '../monster/monsterSession';
import { HauntingAudio, levelLabel } from '../audio';
import type { MapNoise, MapRound, MapSnapshot, MonsterInsight } from './mapSnapshot';
import { computeVisibility, emptyField, LitCache, type VisibilityField } from './visibility';
import { drawInsight } from './insightOverlay';
import type { ToolIconSource } from './toolIcons';

/**
 * **Die 2D-Welt** — die Station als gezeichnete Szene, gespielt mit dem Daumen.
 *
 * Links der Stock, rechts unten ein großer Knopf „Benutzen" und darüber zwei
 * kleine: Werkzeug benutzen, Werkzeug wechseln. Die Szene (`flatScene.ts`)
 * folgt dem Spieler, lässt sich ziehen und mit zwei Fingern zoomen; ein
 * Knopf holt sie zurück. Oben links der Kasten mit zwei Zeilen —
 * Sauerstoffuhr mit Anzug-Leben, darunter „Aufgaben" mit einem Kreis je
 * Auftrag —, oben rechts Zahnrad und Karte. Die Karte ist die alte `MapView` als Overlay — die
 * Übersicht bleibt erreichbar, sie ist nur nicht mehr das Spielbild. Rätsel
 * liegen als Overlay über der Szene; das Optionsmenü hat genau zwei Modi
 * (`registry/viewModes.ts`, Publikum `flat`).
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
   * **Mitten in der Runde die Ansicht wechseln** — 2D ↔ 3D. Der Knopf steht
   * im Optionsmenü; was er auslöst, gehört der Welt
   * (`HauntingWorld.switchView`), denn nur sie kennt das Schiff.
   */
  switchView?(view: '2d' | '3d'): void;
}

/** Wie lange eine Meldung stehen bleibt, in Sekunden. */
const TOAST_SECONDS = 3.2;
/** Wie oft der Späher ein neues Horchbild bekommt, in Sekunden. */
export const SCOUT_PERIOD = 3.5;
/** Wie viele Punkte unter dem HUD der Seite die Randdreiecke bleiben. */
const EDGE_TOP = 118;

const NO_POWERS: SoloPowers = { scout: false, panel: false, archive: false };

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
  private readonly hud = el('div', 'flat__hud');
  private readonly vitals = el('div', 'flat__vitals');
  private readonly tasks = el('div', 'flat__tasks');
  /** Der Reiter „Aufgaben:": waagerecht, mit einem Kreis je Auftrag, und ein Knopf. */
  private readonly tab = el('button', 'flat__tab');
  private readonly pips = el('span', 'flat__pips');
  private readonly toast = el('div', 'flat__toast');
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
  private readonly mapKey = el('button', 'flat__corner flat__mapkey', '🗺');
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
    this.mapKey.addEventListener('click', () => this.showMap(this.mapOverlay.hidden));
    this.mapKey.setAttribute('aria-label', 'Karte');
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
    this.optionsKey.addEventListener('click', () => {
      this.options.hidden = !this.options.hidden;
      this.sheet.hidden = true;
      if (!this.options.hidden) this.renderOptions();
    });
    this.options.hidden = true;
    this.options.addEventListener('click', (event) => this.optionClick(event));
    this.sheet.hidden = true;
    this.sheet.addEventListener('click', (event) => this.optionClick(event));
    this.ending.hidden = true;
    this.ending.addEventListener('click', (event) => this.optionClick(event));
    this.icon.hidden = true;
    this.element.append(
      this.scene.element,
      this.hud,
      this.toast,
      this.stick.element,
      this.buttons,
      this.jump,
      this.mapKey,
      this.optionsKey,
      this.mapOverlay,
      this.puzzle.element,
      this.sheet,
      this.options,
      this.ending,
    );
    this.element.dataset['mode'] = this.mode.visibility;
    this.applyLayers();
    this.playRole(options.role ?? 'technician');
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
      this.element.insertBefore(this.session.element, this.hud);
    } else if (role === 'watch' && !this.netWatch) {
      // Nur die **lokale** Vorführung braucht einen Techniker aus Zahlen. Wer
      // einer echten Runde im Netz zusieht, hätte sonst zwei Techniker: einen
      // gezeichneten aus dem Netz und einen, der daneben herläuft.
      this.bot = new TechnicianBot(this.round, this.options_.tuning?.technician, () =>
        this.dice.next(),
      );
    }
    for (const node of [this.scene.element, this.jump, this.mapKey])
      node.hidden = role === 'monster';
    if (role === 'monster') this.showMap(false);
    for (const node of [this.stick.element, this.buttons]) node.hidden = role !== 'technician';
    this.element.dataset['role'] = role;
    this.heard = [];
    this.scoutClock = 0;
    this.refreshCorners();
  }

  /** Wer gerade spielt — für Tests und die Anzeige. */
  get role(): FlatRole {
    return this.session ? 'monster' : this.bot || this.netWatch ? 'watch' : 'technician';
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
    if (!this.session) {
      this.stepScout(dt);
      this.scene.setSnapshot(shown);
      this.scene.setVisibility(this.field());
      this.scene.draw();
      if (!this.mapOverlay.hidden) {
        this.map.setSnapshot(shown);
        this.map.setVisibility(this.field());
        this.map.draw();
      }
      // Ein offenes Rätsel liegt über allem: Optionsmenü und Akte gehen dabei zu.
      if (this.round.puzzle && !this.options.hidden) this.options.hidden = true;
      if (this.round.puzzle && !this.sheet.hidden) this.sheet.hidden = true;
      this.puzzle.sync();
      this.refreshKeys();
      this.refreshCorners();
    }
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
    this.mapOverlay.hidden = !open;
    this.mapKey.classList.toggle('is-active', open);
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
    this.sheet.hidden = false;
    this.options.hidden = true;
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
    // **2D ↔ 3D**, mitten in der Runde. Der Knopf steht hier, weil die Frage
    // „von oben oder im Schiff?" keine Frage des Aufbaus ist: Man merkt erst
    // beim Spielen, dass man lieber das andere hätte.
    const swap = el('button', 'flat__option');
    swap.dataset['switchView'] = '';
    swap.append(
      el('strong', '', 'Ansicht: 3D Schiff'),
      el('small', '', 'Von der Karte von oben ins Schiff wechseln'),
    );
    parts.push(swap);
    // Und der Weg hinaus: Er beendet die Runde und stellt den Aufbau wieder
    // hin — dort steht, was eine *neue* Runde wird.
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
      // **Zuschauen an und wieder aus.** Wer zusieht, überlässt den Stock dem
      // Techniker aus Zahlen (`rules/technicianBot.ts`); wer zurückkommt,
      // nimmt ihn wieder — dieselbe Runde, dieselbe Karte, ein anderer Kopf.
      this.playRole(this.role === 'watch' ? 'technician' : 'watch');
      this.renderOptions();
    } else if (data['switchView'] !== undefined) {
      this.host.switchView?.('3d');
      this.options.hidden = true;
    } else if (data['leave'] !== undefined) {
      this.host.exit();
    } else if (data['audio'] === 'effects' || data['audio'] === 'ambient') {
      this.audio.cycle(data['audio']);
      this.renderOptions();
    } else if (data['closeOptions'] !== undefined) {
      this.options.hidden = true;
    } else if (data['closeSheet'] !== undefined) {
      this.sheet.hidden = true;
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
    this.options.hidden = true;
    this.sheet.hidden = true;
    this.showMap(false);
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
    this.session?.dispose();
    this.audio.dispose();
    this.stick.dispose();
    this.scene.dispose();
    this.map.dispose();
    this.element.remove();
  }
}
