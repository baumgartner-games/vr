import { TILE } from '../../nav/navTile';
import { generateHouse, onApron, spacesOf, type HouseDoor, type HouseSpec } from '../house';
import {
  freshCrew,
  MONSTERS,
  PLAYER_SPRINT_SPEED,
  PLAYER_WALK_SPEED,
  puzzleFor,
  puzzleSolved,
  repairsFor,
  stationOptions,
  stepVitals,
  takeCrewHit,
  type MonsterKind,
  type Repair,
} from '../mission';
import type { HauntState } from '../net';
import { COMMAND, stationGraph, type StationGraph } from '../roomGraph';
import { stationLayout, type FloorBounds, type FloorPoint } from '../stationLayout';
import { MonsterRoutine, paceSpeed, type RoutineOutput } from '../monsterRoutine';
import { DEFAULT_TUNING, type BotTuning } from '../botTuning';
import {
  ENTITY_PROFILES,
  freshThreat,
  hearNoises,
  stepAwareness,
  takeAlert,
  type NoiseSource,
  type ThreatState,
} from '../threat';
import { Hearing, reachOf } from '../audio/hearing';
import { NOISE, stepLoudness } from '../audio/cues';
import { BOT_FOV, BOT_VISION, MONSTER_FOV } from '../perception';
import { freshSpook, stepHaunt, type Spook } from '../haunt';
import { COMMAND_HOME } from '../trainingLayout';
import { Rng } from '../rng';
import { RoundRules } from '../rules/roundRules';
import { cargoKey, cargoLabel, cargoOf, type CargoMark, type CargoSlot } from '../rules/cargo';
import { CREW_SIZE, askSeal, dueSeal, freshSeal, type DoorSeal } from '../rules/doorSeal';
import {
  HOLD_RANGE,
  SLAM_HOLD,
  chooseLock,
  freshLocks,
  holdUntil,
  pryLock,
  releaseLock,
  slamDoor,
  stepLocks,
  toggleLock,
  type DoorLocks,
} from '../rules/doorLocks';
import { freshGhosts, markGhost } from '../rules/ghosts';
import { VentNet } from '../vents/ventGraph';
import { VentTravel } from '../vents/ventTravel';
import { VentPilot } from '../vents/ventPilot';
import type { MonsterDriver } from '../monster/monsterDriver';
import { FlatNavigator } from '../navmesh';
import { doorCentre, fixtureBlocks, slide, spaceAtMetres, walkable, WALL_T } from './geometry';
import { extractMapSnapshot } from './extract';
import type { MapSource } from './mapSource';
import {
  headingOf,
  type MapEntity,
  type MapItem,
  type MapLight,
  type MapNoise,
  type MapNoiseCause,
  type MapPoint,
  type MapRound,
  type MapSnapshot,
} from './mapSnapshot';
import type { MapGoal } from './mapView';
import {
  crewSize,
  goalPrecision,
  type GoalPrecision,
  type RoundSetup,
  type SoloPowers,
} from '../rules/roundSetup';
import { applyPuzzle, type PuzzleAction } from './flatPuzzles';
import {
  computeVisibility,
  LitCache,
  inCone as inConeOf,
  lineOfSight as lineOfSightOn,
  litAt,
  type VisibilityField,
  type VisibilityMode,
} from './visibility';

/**
 * **Die Station als 2D-Runde** — gespielt, nicht nur gezeichnet.
 *
 * Kein three.js, keine Physik, kein Netz: ein Spieler, ein Monster, Fracht,
 * Konsolen, Schränke, Türen und Lampen auf dem Grundriss, in Metern. Die
 * Regeln kommen, wo es sie schon gibt, aus denselben Dateien wie im Headset:
 * das Monster aus `monsterRoutine.ts` auf der Raumkarte (`roomGraph.ts`),
 * seine Wege aus derselben Rasterwegsuche wie in 3D (`stationNavigation.ts`
 * über `navmesh/flatNavigator.ts`), Treffer und Puls aus `mission.ts`, der
 * Spuk aus `haunt.ts`, die drei Reparaturen aus `repairsFor`. Was hier neu
 * ist, ist nur die **Bewegung**
 * — Gleiten an Wänden statt Rapier — und die **Wahrnehmung** auf dem
 * Sichtbarkeitsmodell der Karte (`visibility.ts`), damit der Spieler auf der
 * Karte genau das sieht, was das Monster von ihm sieht.
 *
 * Die Runde ist `MapSource`: Der Snapshot, den die Karte zeichnet, kommt
 * durch dieselbe Extraktion wie der aus der 3D-Welt (`extract.ts`).
 */

/** Wie nah man an etwas heran muss, um damit etwas zu tun, in Metern. */
export const REACH = 1.6;
/** Der Radius des Spielers auf der Karte. */
export const PLAYER_RADIUS = 0.35;
/** Und der des Monsters — auch der Radius seiner Wegsuche. */
export const MONSTER_RADIUS = 0.4;
/** Ab hier trifft das Monster. */
const CONTACT = 1.7;
/** Wie lange Holz einen Verfolger aufhält, in Sekunden. */
const WOOD_DELAY = 2.5;
/** Wie weit die Taschenlampe leuchtet und wie breit. */
export const TORCH_RANGE = 11;
export const TORCH_FOV = (52 * Math.PI) / 180;
/** So tief muss man in einem Raum stehen, damit er als betreten gilt (`geometry.spaceAtMetres`). */
const SPACE_MARGIN = WALL_T / 2 + PLAYER_RADIUS - 0.01;
/** Der längste Zeitschritt, den die Runde rechnet — längere werden geteilt. */
const MAX_STEP = 1 / 30;
/** Wie lange ein Geräusch für die Karte aufgehoben wird, in Sekunden. */
const NOISE_MEMORY = 5;
/** Bis zu diesem Abstand gilt der Techniker als verfolgt — dann fällt die Tür zu. */
const SEAL_RANGE = 10;
/** So nah muss jemand einer automatischen Tür kommen, damit sie auffährt, in Metern. */
const DOOR_TRIGGER = 2.2;
/** Und so weit darf er sich entfernen, bevor sie wieder zugeht — der Nachlauf. */
const DOOR_HOLD = 2.6;
/** Wie oft ein Schritt als Welle auf die Karte kommt, in Sekunden — gehend und rennend. */
const STEP_PULSE = 0.55;
const SPRINT_PULSE = 0.35;

export const PLAYER_ID = 'player';
export const MONSTER_ID = 'monster';

/** Werkzeuge, die es in der 2D-Welt gibt, und wie sie heißen. */
export const TOOL_LABELS: Readonly<Record<string, string>> = {
  flashlight: 'Taschenlampe',
  radar: 'Radar',
  xray: 'Röntgengerät',
  medkit: 'Medkit',
};

export interface FlatInput {
  /** Der Stock: `x` nach Osten, `z` nach Süden, beide in [-1, 1]. */
  x: number;
  z: number;
  sprint: boolean;
}

export type FlatAction = 'cycle' | 'use' | 'interact';

export interface FlatEvent {
  kind: 'info' | 'warn' | 'good' | 'bad';
  text: string;
}

export type FlatRole = 'technician' | 'monster' | 'bot';

export interface FlatOptions {
  monster?: MonsterKind;
  tuning?: BotTuning;
  /** Ohne Monster, wie der sichere Test im Headset. */
  test?: boolean;
  roll?: number;
  mode?: VisibilityMode;
  /**
   * Wen der Spieler in der 2D-Welt spielt (nur `FlatMode`; die Runde selbst
   * ist neutral): den Techniker, das Monster — oder niemanden (`bot`), dann
   * spielt der Techniker aus Zahlen (`rules/technicianBot.ts`) und man sieht zu.
   */
  role?: FlatRole;
  /**
   * Was der Techniker aus den Bot-Plätzen der Zentrale selbst bekommt
   * (`rules/roundSetup.ts`): Peilung, Schalttafel, Akte. Nur `FlatMode`.
   */
  powers?: SoloPowers;
  /** Ob die Wege von Monster und Techniker auf der Karte liegen. Nur `FlatMode`. */
  routes?: boolean;
  /** Die ganze Verteilung, aus der `role`, `test` und `powers` kommen — für die Tafel im Optionsmenü. */
  setup?: RoundSetup;
  /**
   * Wie viele mitspielen (`rules/roundSetup.crewSize`) — entscheidet, ob die
   * Tür hinter dem Techniker sofort zufällt oder erst, nachdem er es der
   * Zentrale gesagt hat (`rules/doorSeal.ts`). Ohne Angabe aus `setup`.
   */
  players?: number;
}

interface Actor {
  x: number;
  z: number;
  yaw: number;
  space: string;
}

interface Cargo {
  id: string;
  roomId: string;
  at: FloorPoint;
  /** Was herauskommt — bei einer leeren Kiste nichts. */
  loot: string;
  /** Wie der Inhalt heißt; bei einer leeren Kiste ihr eigenes Kennzeichen. */
  label: string;
  /** Was außen draufsteht: „Kiste 2 · blau". Das sieht man vor dem Öffnen. */
  mark: string;
  /** Dasselbe als Farbband und Nummer, für alles, was zeichnet. */
  badge: CargoMark;
  /**
   * Woran hängt, ob diese Kiste schon geleert ist: der Inhalt, und bei einer
   * leeren die Kiste selbst (`cargoKey`).
   */
  key: string;
  empty: boolean;
}

interface Console {
  id: string;
  repair: Repair;
  roomId: string;
  at: FloorPoint;
}

interface Locker {
  id: string;
  roomId: string;
  at: FloorPoint;
}

export class FlatRound implements MapSource {
  /** Der Bauplan und der Stand — als Felder, weil `MapSource` die Namen als Methoden braucht. */
  readonly house: HouseSpec;
  readonly haunt: HauntState;
  readonly graph: StationGraph;
  readonly player: Actor;
  readonly monster: Actor;
  /** Kabinen, Anzug, Sauerstoff — die Rundenregeln (`rules/roundRules.ts`). */
  readonly rules = new RoundRules(() => this.haunt);
  /** Das Lüftungsnetz, die Fahrt des Monsters darin und der Lotse der KI (`vents/`). */
  readonly vents: VentNet;
  readonly ventRide: VentTravel;
  private readonly ventPilot: VentPilot;
  /** Ein Spieler am Steuer des Monsters (`monster/`); `null` oder inaktiv heißt: die Routine. */
  driver: MonsterDriver | null = null;
  /** Welche Werkzeuge man hat, in Reihenfolge des Durchschaltens. */
  readonly tools: string[] = ['flashlight'];
  active = 0;
  torch = true;
  /** Die Reparatur, deren Rätsel gerade offen ist. */
  puzzle: Repair | null = null;
  mode: VisibilityMode;
  /** Das letzte Sichtbarkeitsfeld — aus `step`, für die Karte. */
  field: VisibilityField;
  private snapshotCache: MapSnapshot | null = null;
  private readonly cargo: Cargo[] = [];
  private readonly consoles: Console[] = [];
  private readonly lockers: Locker[] = [];
  private readonly routine: MonsterRoutine;
  /** Die Rasterwegsuche der 3D-Welt, mit Cursor auf der Route des Monsters (`navmesh/flatNavigator.ts`). */
  readonly navigator: FlatNavigator;
  private decision: RoutineOutput | null = null;
  /** Was das Monster wahrnimmt — dieselbe Leiter wie im Headset (`threat.ts`). */
  private readonly memory: ThreatState = freshThreat();
  /** Das Hörmodell (`audio/hearing.ts`) und die Geräusche des Spielers seit dem letzten Schritt. */
  private readonly hearing = new Hearing();
  private pendingNoises: NoiseSource[] = [];
  /** Die Geräusche der letzten Sekunden, für die Karte (`MapNoise`). */
  private readonly noiseLog: MapNoise[] = [];
  private noiseSerial = 0;
  private stepPulse = 0;
  private monsterPulse = 0;
  /** Wer welche Tür gesperrt hat, und wie lange zugefallene halten (`rules/doorLocks.ts`). */
  readonly locks: DoorLocks = freshLocks();
  /** Welche automatischen Türen gerade aufgefahren sind (`stepDoors`). */
  private readonly openDoors = new Set<string>();
  /** Die Tür, die hinter dem fliehenden Techniker zufällt (`rules/doorSeal.ts`). */
  private readonly seal: DoorSeal = freshSeal();
  /** In welchem Raum er im letzten Bild stand — daran hängt „ist er durch eine Tür?". */
  private wasSpace = COMMAND;
  /** Wie viele mitspielen: entscheidet über die Wartezeit bis zum Riegel. */
  private readonly players: number;
  /**
   * **Die Grundflächen der Möbel** (`geometry.fixtureBlocks`): Was in 3D im
   * Weg steht, steht auch hier im Weg — durch einen Tank läuft niemand mehr.
   * Die Wegsuche kannte diese Kästen längst; jetzt kennt sie auch der Schritt.
   */
  private readonly blocks: readonly FloorBounds[];
  /** Die Wegsuche des Spielers zum nächsten Ziel — nur, wenn jemand den Weg sehen will. */
  private playerNav: FlatNavigator | null = null;
  private readonly rng: Rng;
  private readonly tuning: BotTuning;
  private spook: Spook = freshSpook();
  private moving = false;
  private sprinting = false;
  private seen = false;
  private caught = '';
  /** Die Tür, an der das Monster gerade wartet, und wie lange schon. */
  private blocked: { id: string; since: number } | null = null;
  private radarPing = 0;
  /** Wo das Monster zuletzt vorankam — steht es länger, nimmt es einen Umweg über die Raummitte. */
  private stall = { x: 0, z: 0, since: 0 };
  private detourUntil = 0;
  private readonly litCache = new LitCache();
  private events: FlatEvent[] = [];
  /**
   * **Wie genau der Techniker sein Ziel genannt bekommt**
   * (`rules/roundSetup.goalPrecision`). Ohne jede Angabe ist es die Kiste: Wer
   * eine Runde ohne Verteilung aufmacht — jeder Test, jede Vorführung —, spielt
   * allein, und allein ruft einem niemand zu, welche der drei die richtige ist.
   */
  readonly precision: GoalPrecision;

  constructor(seed: number, options: FlatOptions = {}) {
    this.house = generateHouse(seed, 14);
    this.graph = stationGraph(this.house);
    this.blocks = fixtureBlocks(this.house);
    this.players = options.players ?? (options.setup ? crewSize(options.setup) : CREW_SIZE);
    this.precision = options.setup
      ? goalPrecision(options.setup)
      : options.powers && !options.powers.archive
        ? 'room'
        : 'crate';
    this.tuning = options.tuning ?? DEFAULT_TUNING;
    this.mode = options.mode ?? 'realistic';
    const crewOptions = stationOptions({
      monster: options.monster ?? 'stalker',
      test: !!options.test,
    });
    this.haunt = {
      seed,
      phase: 'running',
      crew: freshCrew(crewOptions),
      time: 0,
      monsterOn: !options.test,
      monster: null,
      shut: [],
      lit: spacesOf(this.house).map((room) => room.id),
      loud: [],
      fuse: false,
      taken: [],
      done: [],
      destroyed: [],
      technician: null,
      ride: 'out',
      ghosts: freshGhosts(),
    };
    this.rng = new Rng((seed ^ ((options.roll ?? 0) * 0x9e3779b1)) >>> 0);
    this.routine = new MonsterRoutine(this.tuning.monster);
    this.navigator = new FlatNavigator(this.house, this.graph, MONSTER_RADIUS);
    this.vents = new VentNet(this.house);
    this.ventRide = new VentTravel(this.vents);
    this.ventPilot = new VentPilot(
      this.vents,
      this.ventRide,
      MONSTERS.find((m) => m.id === crewOptions.monster)?.vent ?? 28,
      monsterBase(crewOptions.monster) * this.tuning.monster.speed,
    );
    this.player = { x: COMMAND_HOME.x, z: COMMAND_HOME.z, yaw: 0, space: COMMAND };
    const start = farthest(this.graph, this.player);
    const centre = this.graph.centre(start);
    this.monster = { x: centre.x, z: centre.z, yaw: 0, space: start };
    if (this.haunt.monsterOn) this.haunt.monster = { x: centre.x, z: centre.z };

    const layout = stationLayout(this.house);
    // Inhalt und Kennzeichen kommen aus `rules/cargo.ts` — dieselbe Liste, aus
    // der auch das Schiff seine Frachtschränke baut. Früher würfelte jede Welt
    // für sich, und das ging genau so lange gut, wie jeder Raum eine Kiste hatte.
    for (const slot of cargoOf(this.house)) {
      const cargo = layout.find((p) => p.id === slot.id);
      if (!cargo) continue;
      this.cargo.push({
        id: slot.id,
        roomId: slot.roomId,
        at: cargo.approach,
        loot: slot.loot.kind === 'empty' ? '' : cargoKey(slot),
        label: lootName(this.house, slot),
        mark: cargoLabel(slot),
        badge: slot.mark,
        key: cargoKey(slot),
        empty: slot.loot.kind === 'empty',
      });
    }
    for (const room of this.house.rooms) {
      const locker = layout.find((p) => p.id === `locker-${room.id}`);
      if (locker) this.lockers.push({ id: room.id, roomId: room.id, at: locker.approach });
    }
    for (const repair of repairsFor(this.house)) {
      const console = layout.find((p) => p.id === `console-${repair.id}`);
      if (console)
        this.consoles.push({ id: console.id, repair, roomId: repair.roomId, at: console.approach });
    }
    this.field = computeVisibility(
      { snapshot: this.snapshot(), mode: this.mode, viewerId: PLAYER_ID },
      this.litCache,
    );
  }

  get phase(): HauntState['phase'] {
    return this.haunt.phase;
  }

  get activeTool(): string {
    return this.tools[this.active] ?? '';
  }

  /** Was gerade vor dem Spieler liegt — für die Beschriftung des Knopfs. */
  get target(): { kind: MapItem['kind'] | 'door' | 'light'; id: string; label: string } | null {
    const near = this.nearest();
    if (!near) return null;
    return { kind: near.kind, id: near.id, label: near.label };
  }

  /** Die Meldungen seit dem letzten Abholen. */
  drain(): FlatEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  setMode(mode: VisibilityMode): void {
    this.mode = mode;
  }

  // --- MapSource ------------------------------------------------------------

  drone(): null {
    return null;
  }

  lamps(): ReadonlyArray<{ id: string; x: number; z: number; intensity: number }> {
    return spacesOf(this.house).map((room) => {
      const centre = this.graph.centre(room.id);
      return { id: room.id, x: centre.x, z: centre.z, intensity: 1 };
    });
  }

  doorOpen(id: string): boolean {
    return this.openDoors.has(id);
  }

  /**
   * **Die automatischen Türen, einmal je Bild** — und mit Nachlauf: Wer genau
   * auf der Auslöseweite steht, ließe ein Blatt sonst je Bild auf- und
   * zufahren, und jedes davon wäre ein Geräusch.
   *
   * **Ein Blatt, das fährt, ist zu hören** (`MapNoiseCause` `door`): Für den,
   * der es sieht, sagt die Welle nur, dass da eine Tür ging — nicht, wer
   * hindurchging. Genau darum geht es: Ein Geräusch ist ein Geräusch.
   */
  private stepDoors(): void {
    for (const door of this.house.doors) {
      const at = doorCentre(door);
      const was = this.openDoors.has(door.id);
      const reach = was ? DOOR_HOLD : DOOR_TRIGGER;
      let near = false;
      for (const actor of [this.player, this.monster]) {
        if (actor === this.monster && (!this.haunt.monsterOn || this.ventRide.concealed)) continue;
        if (Math.hypot(actor.x - at.x, actor.z - at.z) < reach) near = true;
      }
      const open = near && !this.haunt.shut.includes(door.id);
      if (open === was) continue;
      if (open) this.openDoors.add(door.id);
      else this.openDoors.delete(door.id);
      this.wave('', at, NOISE.door, 'door');
    }
  }

  /** Wie lange die Sperre dieser Tür noch hält (`rules/doorLocks.ts`). */
  doorHold(id: string): { left: number; total: number } | null {
    if (!this.haunt.shut.includes(id)) return null;
    const until = holdUntil(this.locks, id);
    if (until === null) return null;
    const total = this.locks.chosen === id ? HOLD_RANGE[1] : SLAM_HOLD;
    return { left: Math.max(0, until - this.haunt.time), total };
  }

  entities(): readonly MapEntity[] {
    const kind = this.haunt.crew.options.monster;
    const profile = ENTITY_PROFILES[kind];
    const out: MapEntity[] = [
      {
        id: PLAYER_ID,
        kind: 'player',
        label: 'Techniker',
        at: { x: this.player.x, z: this.player.z },
        yaw: this.player.yaw,
        roomId: this.player.space,
        concealed: !!this.haunt.crew.hidden,
        moving: this.moving,
        sprinting: this.sprinting,
        held: this.activeTool,
        sense: { fov: BOT_FOV, range: BOT_VISION, hearing: 0 },
      },
    ];
    if (this.haunt.monsterOn)
      out.push({
        id: MONSTER_ID,
        kind: 'monster',
        label: MONSTERS.find((m) => m.id === kind)?.name ?? profile.label,
        at: { x: this.monster.x, z: this.monster.z },
        yaw: this.monster.yaw,
        roomId: this.monster.space,
        concealed: this.ventRide.concealed,
        moving: !this.ventRide.busy && (this.decision?.pace ?? 'still') !== 'still',
        sprinting: this.decision?.pace === 'hunt',
        held: '',
        sense: {
          fov: MONSTER_FOV,
          range: profile.vision * this.tuning.monster.vision,
          hearing: profile.hearing * this.tuning.monster.hearing,
        },
      });
    return out;
  }

  items(): readonly MapItem[] {
    const crew = this.haunt.crew;
    const out: MapItem[] = [];
    // **Auf einer Kiste steht ihr Kennzeichen und nicht ihr Inhalt.** Das
    // Label reiste bis hierher durch den Snapshot und damit übers Netz: Wer
    // „Kühlmittelpumpe" daraufschrieb, verriet die richtige Kiste an jeden,
    // der eine Karte offen hatte — auch dann, wenn ein Mensch am Archiv sitzt
    // und genau das seine Auskunft gewesen wäre.
    const goal = this.precision === 'crate' ? this.objectives()[0] : null;
    for (const cargo of this.cargo) {
      const taken = crew.inventory.includes(cargo.key) || this.haunt.done.includes(cargo.key);
      out.push({
        id: cargo.id,
        kind: 'cargo',
        label: cargo.mark,
        roomId: cargo.roomId,
        at: { ...cargo.at },
        state: taken ? 'taken' : crew.opened.includes(cargo.id) ? 'open' : 'closed',
        interactive: !taken,
        mark: { colour: cargo.badge.colour, number: cargo.badge.number },
        ...(goal?.id === cargo.id ? { goal: true } : {}),
      });
    }
    for (const console of this.consoles) {
      const solved = this.haunt.done.includes(console.repair.itemId);
      out.push({
        id: console.id,
        kind: 'console',
        label: console.repair.title,
        roomId: console.roomId,
        at: { ...console.at },
        state: solved ? 'solved' : 'broken',
        interactive: !solved,
      });
    }
    for (const locker of this.lockers)
      out.push({
        id: `locker-${locker.id}`,
        kind: 'locker',
        label: 'Schutzschrank',
        roomId: locker.roomId,
        at: { ...locker.at },
        state: !this.rules.cabinUsable(locker.id)
          ? 'destroyed'
          : crew.hidden === locker.id
            ? 'open'
            : 'locked',
        interactive: this.rules.cabinUsable(locker.id),
      });
    out.push({
      id: 'van',
      kind: 'van',
      label: 'Einsatzzentrale',
      roomId: COMMAND,
      at: { x: COMMAND_HOME.x, z: COMMAND_HOME.z },
      state: this.haunt.done.length >= 3 ? 'ready' : '',
      interactive: false,
    });
    const open = this.ventRide.openFlap;
    out.push(...this.vents.items(open ? [open.id] : []));
    return out;
  }

  ventLinks(): MapSnapshot['ventLinks'] {
    return this.vents.mapLinks();
  }

  /** Die Geräusche der letzten Sekunden — als Wellen für die Karte. */
  noises(): MapNoise[] {
    return this.noiseLog;
  }

  carriedLights(): readonly MapLight[] {
    if (!this.torch || this.activeTool !== 'flashlight' || this.haunt.crew.hidden) return [];
    return [
      {
        id: 'torch',
        roomId: this.player.space,
        at: { x: this.player.x, z: this.player.z },
        on: true,
        radius: TORCH_RANGE,
        kind: 'torch',
        yaw: this.player.yaw,
        fov: TORCH_FOV,
        color: '#ffe9b0',
      },
    ];
  }

  spec(): HouseSpec {
    return this.house;
  }

  state(): HauntState {
    return this.haunt;
  }

  round(): MapRound {
    return this.rules.status(this.haunt);
  }

  /** Der Snapshot dieses Bildes — einmal je Schritt gerechnet. */
  snapshot(): MapSnapshot {
    if (!this.snapshotCache) this.snapshotCache = extractMapSnapshot(this, 'flat');
    return this.snapshotCache;
  }

  // --- Ein Schritt --------------------------------------------------------

  step(dt: number, input: FlatInput): void {
    let left = Math.max(0, Math.min(0.5, dt));
    while (left > 0) {
      const slice = Math.min(MAX_STEP, left);
      left -= slice;
      this.tick(slice, input);
    }
    while (this.noiseLog.length && this.haunt.time - this.noiseLog[0]!.since > NOISE_MEMORY)
      this.noiseLog.shift();
    this.snapshotCache = null;
    this.field = computeVisibility(
      { snapshot: this.snapshot(), mode: this.mode, viewerId: PLAYER_ID },
      this.litCache,
    );
  }

  private tick(dt: number, input: FlatInput): void {
    if (this.haunt.phase !== 'running') return;
    this.haunt.time += dt;
    const out = this.rules.step(this.haunt);
    if (out) {
      this.events.push(out);
      return;
    }
    this.radarPing = Math.max(0, this.radarPing - dt);
    const crew = this.haunt.crew;
    // Zugefallene Türen gehen von selbst wieder auf (`rules/doorLocks.ts`).
    const locks = stepLocks(this.locks, this.haunt.shut, this.haunt.time);
    if (locks.opened.length) {
      this.haunt.shut = locks.shut;
      this.events.push({ kind: 'info', text: 'Eine Tür geht wieder auf.' });
    }
    this.stepDoors();

    // --- Spieler ------------------------------------------------------------
    const length = Math.hypot(input.x, input.z);
    const wants = length > 0.05 && !crew.hidden && !this.puzzle;
    this.moving = wants;
    this.sprinting = wants && input.sprint;
    let speed = 0;
    if (wants) {
      const scale = Math.min(1, length);
      speed = (input.sprint ? PLAYER_SPRINT_SPEED : PLAYER_WALK_SPEED) * scale;
      const nx = input.x / length,
        nz = input.z / length;
      this.player.yaw = Math.atan2(-nx, -nz);
      const to = slide(
        this.house,
        this.haunt.shut,
        this.player,
        nx * speed * dt,
        nz * speed * dt,
        PLAYER_RADIUS,
        this.blocks,
      );
      this.player.x = to.x;
      this.player.z = to.z;
      const space = spaceAtMetres(this.house, this.player, this.player.space, SPACE_MARGIN);
      this.player.space =
        space === null ? this.player.space : space === COMMAND ? COMMAND : space.id;
      // Jeder Schritt eine Welle auf der Karte — rennend öfter und weiter.
      this.stepPulse -= dt;
      if (this.stepPulse <= 0) {
        this.stepPulse = input.sprint ? SPRINT_PULSE : STEP_PULSE;
        this.wave(PLAYER_ID, this.player, stepLoudness(speed), input.sprint ? 'sprint' : 'walk');
      }
    } else this.stepPulse = 0;
    const gap = this.haunt.monsterOn
      ? Math.hypot(this.player.x - this.monster.x, this.player.z - this.monster.z)
      : Infinity;
    this.stepSeal(gap);
    stepVitals(crew, dt, speed, gap);

    if (
      this.haunt.done.length >= 3 &&
      onApron(Math.floor(this.player.x / TILE), Math.floor(this.player.z / TILE))
    ) {
      this.haunt.phase = 'won';
      this.events.push({ kind: 'good', text: 'MISSION ERFÜLLT · Alle Systeme online.' });
      return;
    }

    // --- Spuk ----------------------------------------------------------------
    const spooked = stepHaunt(
      this.spook,
      {
        spec: this.house,
        monster: this.haunt.monsterOn ? this.haunt.monster : null,
        lit: this.haunt.lit,
        shut: this.haunt.shut,
      },
      dt,
    );
    this.spook = spooked.spook;
    const lit = this.haunt.lit.indexOf(spooked.lightOut);
    if (spooked.lightOut && lit >= 0) {
      this.haunt.lit.splice(lit, 1);
      if (spooked.lightOut === this.player.space)
        this.events.push({ kind: 'warn', text: 'Das Licht geht aus.' });
    }
    if (spooked.doorShut && !this.haunt.shut.includes(spooked.doorShut)) {
      this.haunt.shut = slamDoor(this.locks, this.haunt.shut, spooked.doorShut, this.haunt.time);
      this.events.push({ kind: 'warn', text: 'Irgendwo fällt eine Tür zu.' });
      const door = this.house.doors.find((d) => d.id === spooked.doorShut);
      if (door) this.wave('', doorCentre(door), NOISE.slam, 'slam');
    }

    if (!this.haunt.monsterOn) return;

    // --- Im Schacht: nichts hören, nichts sehen, nur fahren (`vents/ventTravel.ts`).
    const piloted = this.driver?.active() === true;
    if (this.ventRide.busy) {
      const event = this.ventRide.step(dt, this.monster, !piloted);
      if (event === 'entered' || event === 'exited')
        this.wave(MONSTER_ID, this.monster, NOISE.monsterVent, 'vent');
      this.haunt.monster = { x: this.monster.x, z: this.monster.z };
      return;
    }

    // --- Wahrnehmung des Monsters: Sehen über die Karte, Hören über das
    // Hörmodell, die Alarmleiter aus `threat.ts` — dieselbe wie im Headset.
    const profile = ENTITY_PROFILES[crew.options.monster];
    const hidden = !!crew.hidden;
    const snapshot = this.snapshot();
    if (this.moving && !hidden)
      this.pendingNoises.push({
        at: { x: this.player.x, z: this.player.z },
        loudness: stepLoudness(speed),
      });
    const heard = hidden
      ? []
      : hearNoises(
          this.hearing,
          snapshot,
          this.monster,
          this.pendingNoises,
          this.tuning.monster.hearing,
        );
    this.pendingNoises.length = 0;
    const cone = {
      entityId: MONSTER_ID,
      at: { x: this.monster.x, z: this.monster.z },
      yaw: this.monster.yaw,
      fov: MONSTER_FOV,
      range: profile.vision * this.tuning.monster.vision,
    };
    const lineOfSight = gap < 2.5 || lineOfSightOn(snapshot, this.monster, this.player);
    const visible = !hidden && (gap < 2.5 || litAt(this.lightOnly(), this.player));
    const seen = visible && inConeOf(cone, this.player) && lineOfSight;
    const alertBefore = this.memory.alert;
    stepAwareness(
      this.memory,
      dt,
      {
        player: this.player,
        monster: this.monster,
        noises: heard,
        flashlight: this.torch,
        lineOfSight,
        insideStation: true,
        seen,
      },
      { vision: profile.vision, memory: profile.memory * this.tuning.monster.memory },
      !hidden,
    );
    if (seen && !this.seen) this.events.push({ kind: 'bad', text: 'Es hat dich gesehen.' });
    else if (!seen && alertBefore < 2 && this.memory.alert >= 2)
      this.events.push({ kind: 'warn', text: 'Etwas horcht.' });
    else if (!seen && alertBefore < 3 && this.memory.alert >= 3 && this.memory.mode === 'hunt')
      this.events.push({ kind: 'bad', text: 'Es hat dich gehört.' });
    this.seen = seen;
    // --- Was die beiden voneinander behalten (`rules/ghosts.ts`): die
    // zuletzt gesehene Stelle. Sie hängt an genau derselben Prüfung wie die
    // Alarmleiter — ein zweiter, eigener Sichttest wäre eine zweite Wahrheit,
    // und dann zeigte der Marker woandershin als das Verhalten des Monsters.
    const ghosts = this.haunt.ghosts;
    ghosts.technician = markGhost(
      ghosts.technician,
      seen,
      this.player,
      this.player.yaw,
      this.haunt.time,
    );
    // Und andersherum: Der Techniker merkt sich das Monster genau dann, wenn
    // seine eigene Sicht es zeigt — Kegel, Licht und freie Linie stecken schon
    // im Sichtfeld der Karte (`map/visibility.ts`), das jeder Schritt ohnehin
    // rechnet. In „Alles sehen" zeigt dieses Feld alles; dann läuft der Marker
    // mit dem Monster mit, und genau das sollen Zuschauer sehen.
    ghosts.monster = markGhost(
      ghosts.monster,
      this.field.visibleEntities.includes(MONSTER_ID),
      this.monster,
      this.monster.yaw,
      this.haunt.time,
    );
    if (hidden && (seen || this.monster.space === this.player.space) && this.caught !== crew.hidden)
      this.caught = crew.hidden;
    if (!hidden) this.caught = '';

    const decision = piloted
      ? this.driver!.decide(dt)
      : this.routine.step(this.graph, {
          dt,
          at: this.monster,
          here: this.monster.space,
          signal: this.memory.memory > 0 ? this.memory.target : null,
          seen,
          quarry: this.player.space,
          caught: this.caught,
          rng: () => this.rng.next(),
          ...takeAlert(this.memory),
        });
    this.decision = decision;
    if (decision.strike && decision.cabin) {
      // Die Kabine ist danach hin (`rules/roundRules.ts`) — getroffen wird
      // nur, wer genau darin steckt; eine leere Kabine ist ein Ausweg weniger.
      this.rules.destroyCabin(decision.cabin);
      if (crew.hidden === decision.cabin) {
        this.caught = '';
        if (this.rules.cabinStrike(crew)) this.hit('Die Kabine wird aufgerissen.');
      } else this.events.push({ kind: 'warn', text: 'Irgendwo wird eine Kabine aufgerissen.' });
    }
    if (decision.cue === 'scream') {
      this.events.push({ kind: 'bad', text: 'Ein Schrei.' });
      this.wave(MONSTER_ID, this.monster, NOISE.monsterCall, 'call');
    }
    const base = monsterBase(crew.options.monster);
    if (piloted) {
      // Ein Spieler steuert direkt: kein Türrouting, kein Lotse — nur Gleiten an Wänden.
      if (decision.goal)
        this.stepMonster(decision.goal, paceSpeed(base, this.tuning.monster, decision.pace), dt);
    } else {
      // Der Lotse biegt das Ziel auf eine Klappe um, wenn der Schacht lohnt (`vents/ventPilot.ts`).
      const steered = this.ventPilot.steer(decision, this.monster, this.haunt.time, this.graph);
      if (!this.ventRide.busy)
        this.moveMonster(steered, dt, paceSpeed(base, this.tuning.monster, steered.pace));
      // Wer steht und horcht, dreht sich zur Richtung des Geräuschs.
      if (decision.face && decision.pace === 'still')
        this.monster.yaw = Math.atan2(
          -(decision.face.x - this.monster.x),
          -(decision.face.z - this.monster.z),
        );
    }
    this.haunt.monster = { x: this.monster.x, z: this.monster.z };
    // Die Schritte des Monsters als Wellen: leise beim Schleichen, weit beim Rennen.
    if (decision.pace !== 'still') {
      this.monsterPulse -= dt;
      if (this.monsterPulse <= 0) {
        const hunting = decision.pace === 'hunt';
        this.monsterPulse = hunting ? SPRINT_PULSE : STEP_PULSE;
        this.wave(
          MONSTER_ID,
          this.monster,
          hunting
            ? NOISE.monsterRun
            : decision.mode === 'search'
              ? NOISE.monsterStalk
              : NOISE.monsterWalk,
          'monster',
        );
      }
    } else this.monsterPulse = 0;

    // **Das Monster schlägt um sich.** Wer in Reichweite steht, wird
    // getroffen — von der KI wie von einem Spieler am Steuer. Ein eigener
    // Angriffsknopf verlangte, im Moment der Berührung zu tippen, und in
    // diesem Moment schaut niemand auf seine Knöpfe (`monster/monsterHelm.ts`).
    if (gap < CONTACT && !hidden && takeCrewHit(crew, true)) this.hit('Treffer.');
  }

  /**
   * **Die Tür, die hinter dem Techniker zufällt** (`rules/doorSeal.ts`).
   *
   * Er hat gegen das Monster nur eines in der Hand, und das ist eine Tür.
   * Also fällt sie zu, wenn er verfolgt durch sie hindurchgeht — allein macht
   * er das selbst und sofort, mit einer Zentrale im Rücken muss er es
   * **sagen**, und bis das gehört und gedrückt ist, vergehen ein bis zwei
   * Sekunden. Steht das Monster dann schon mit im Raum, war es umsonst: Ein
   * Riegel hinter dem Verfolger ist keiner.
   *
   * Verriegelt wird über denselben einen Riegel wie überall (`chooseLock`):
   * Die vorher gewählte Tür geht dabei auf, und diese hier hält acht bis zehn
   * Sekunden, wenn das Monster sie nicht vorher aufzieht.
   */
  private stepSeal(gap: number): void {
    const here = this.player.space;
    if (here !== this.wasSpace) {
      const hunted = this.haunt.monsterOn && (this.memory.mode === 'hunt' || gap < SEAL_RANGE);
      const door = hunted ? this.doorBetween(this.wasSpace, here) : null;
      if (door) askSeal(this.seal, door.id, this.haunt.time, this.players, () => this.rng.next());
      this.wasSpace = here;
    }
    const relayed = this.seal.relayed;
    const due = dueSeal(this.seal, this.haunt.time);
    if (!due || this.haunt.shut.includes(due)) return;
    const door = this.house.doors.find((one) => one.id === due);
    // Zu spät ist zu spät: Wer schon durch ist, wird nicht mehr ausgesperrt.
    if (!door || this.monster.space === this.player.space) return;
    this.haunt.shut = chooseLock(this.locks, this.haunt.shut, due, this.haunt.time, () =>
      this.rng.next(),
    );
    this.wave('', doorCentre(door), NOISE.door, 'door');
    this.events.push({
      kind: 'good',
      text: relayed
        ? 'Die Zentrale verriegelt die Tür hinter dir.'
        : 'Die Tür fällt hinter dir zu.',
    });
  }

  /** Die Tür zwischen zwei Räumen, die dem Spieler am nächsten liegt. */
  private doorBetween(a: string, b: string): HouseDoor | null {
    let best: HouseDoor | null = null;
    let near = Infinity;
    for (const door of this.house.doors) {
      const far = door.b ?? COMMAND;
      if (!((door.a === a && far === b) || (door.a === b && far === a))) continue;
      const at = doorCentre(door);
      const d = Math.hypot(at.x - this.player.x, at.z - this.player.z);
      if (d < near) {
        near = d;
        best = door;
      }
    }
    return best;
  }

  /** Ein Geräusch des Spielers für die Ohren des Monsters (`audio/cues.ts`, `NOISE`) — und als Welle auf die Karte. */
  private noise(at: FloorPoint, loudness: number, cause: MapNoiseCause = 'interact'): void {
    this.pendingNoises.push({ at: { x: at.x, z: at.z }, loudness });
    this.wave(PLAYER_ID, at, loudness, cause);
  }

  /** Eine Welle auf der Karte: wer, wo, wie weit (`reachOf`), wann. */
  private wave(by: string, at: FloorPoint, loudness: number, cause: MapNoiseCause): void {
    this.noiseLog.push({
      id: `n${this.noiseSerial++}`,
      by,
      at: { x: at.x, z: at.z },
      radius: reachOf(loudness),
      cause,
      since: this.haunt.time,
    });
  }

  /** Der Würfel der Runde — damit ein Steuer denselben Zufall nimmt wie sie. */
  roll(): number {
    return this.rng.next();
  }

  /** Der Alarm des Monsters — für Anzeigen und Tests. */
  get threat(): Readonly<ThreatState> {
    return this.memory;
  }

  private hit(text: string): void {
    const crew = this.haunt.crew;
    if (crew.hp <= 0) {
      this.haunt.phase = 'lost';
      this.events.push({ kind: 'bad', text: 'MISSION GESCHEITERT · Anzug zerstört.' });
    } else this.events.push({ kind: 'bad', text: `${text} Anzug ${crew.hp}/3.` });
  }

  /** Das Feld nur aus Lampen und Taschenlampe — wofür das Monster Augen hat. */
  private lightOnly(): Pick<VisibilityField, 'lit' | 'self'> {
    return { lit: this.field.lit, self: null };
  }

  /**
   * Das Monster geht den Rasterweg der 3D-Welt (`navmesh/flatNavigator.ts`):
   * Wegpunkt für Wegpunkt, mit dem ganzen Zeitschritt über mehrere Punkte
   * hinweg, gleitend an Wänden. Eine gesperrte Tür umgeht es, wenn es einen
   * Umweg gibt; gibt es keinen, führt die Route bis vor die Tür — Holz hält
   * es dort kurz auf, Stahl für immer, dann wählt die Routine irgendwann ein
   * anderes Ziel.
   */
  private moveMonster(decision: RoutineOutput, dt: number, speed: number): void {
    const goal = decision.goal;
    if (!goal || speed <= 0) return;
    // Wer sich festläuft, rechnet erst neu; hilft das nicht, geht er zurück in
    // die Mitte seines Raums und von dort noch einmal los. Wer vor einer
    // gesperrten Tür wartet, steht mit Absicht.
    if (Math.hypot(this.monster.x - this.stall.x, this.monster.z - this.stall.z) > 0.05) {
      this.stall = { x: this.monster.x, z: this.monster.z, since: this.haunt.time };
    } else if (
      !this.blocked &&
      this.haunt.time - this.stall.since > 0.6 &&
      this.haunt.time > this.detourUntil
    ) {
      this.detourUntil = this.haunt.time + 1.2;
      this.stall.since = this.haunt.time;
      this.navigator.invalidate();
    }
    if (this.haunt.time < this.detourUntil) {
      const centre = this.graph.centre(this.monster.space);
      this.stepMonster(centre, speed, dt);
      return;
    }
    const leg = this.navigator.aim(this.monster, goal, this.haunt.shut, this.haunt.time);
    // **Wer vor der Tür steht, arbeitet an ihr.** Der Zähler hängt an der
    // Tür, nicht am Ziel des Moments: Die Alarmleiter (`threat.ts`) lässt die
    // Routine zwischen dem Geräusch hinter der Tür und dem eigenen Raum
    // pendeln, und ein Zähler, der bei jedem Wechsel neu anfinge, ließe
    // Holz nie splittern. Er endet erst, wenn das Monster die Tür verlässt
    // oder sie nicht mehr gesperrt ist.
    const near = (d: (typeof this.house.doors)[number]): boolean => {
      const at = doorCentre(d);
      return Math.hypot(at.x - this.monster.x, at.z - this.monster.z) < 1.6;
    };
    const held = this.blocked
      ? (this.house.doors.find((d) => d.id === this.blocked!.id) ?? null)
      : null;
    const door =
      leg.door && this.haunt.shut.includes(leg.door.id) && near(leg.door)
        ? leg.door
        : held && this.haunt.shut.includes(held.id) && near(held)
          ? held
          : null;
    if (door) {
      if (!this.blocked || this.blocked.id !== door.id)
        this.blocked = { id: door.id, since: this.haunt.time };
      if (door.material === 'wood' && this.haunt.time - this.blocked.since > WOOD_DELAY) {
        this.haunt.shut = releaseLock(this.locks, this.haunt.shut, door.id);
        this.events.push({ kind: 'warn', text: 'Holz splittert.' });
        this.wave(MONSTER_ID, doorCentre(door), NOISE.slam, 'slam');
        this.blocked = null;
      } else if (door.material !== 'wood') {
        // **Stahl hält nicht mehr für immer.** Die KI zieht am Riegel wie ein
        // Spieler am Knopf, mit denselben Zahlen (`rules/doorLocks.ts`): nie
        // beim ersten Zug, danach mit wachsender Aussicht. Der Takt steckt in
        // `pryLock`; jedes Bild zu fragen kostet deshalb nichts.
        const out = pryLock(this.locks, this.haunt.shut, door.id, this.haunt.time, () =>
          this.rng.next(),
        );
        this.haunt.shut = out.shut;
        if (out.tries) this.wave(MONSTER_ID, doorCentre(door), NOISE.monsterWalk, 'door');
        if (out.opened) {
          this.events.push({ kind: 'warn', text: 'Ein Riegel gibt nach.' });
          this.wave(MONSTER_ID, doorCentre(door), NOISE.slam, 'slam');
          this.blocked = null;
        }
      }
    } else this.blocked = null;
    // Der ganze Zeitschritt wird verbraucht, auch über mehrere Wegpunkte hinweg —
    // die Bogenstützen des Kurvenschleifers liegen enger als ein Schritt.
    let budget = speed * dt;
    for (let hops = 0; hops < 16 && budget > 1e-3; hops++) {
      const step = this.navigator.next(this.monster);
      if (!step) break;
      const fromX = this.monster.x,
        fromZ = this.monster.z;
      this.stepMonster(step, budget / dt, dt);
      const moved = Math.hypot(this.monster.x - fromX, this.monster.z - fromZ);
      if (moved < 1e-4) break;
      budget -= moved;
    }
  }

  private stepMonster(step: FloorPoint, speed: number, dt: number): void {
    const dx = step.x - this.monster.x,
      dz = step.z - this.monster.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 1e-3) return;
    this.monster.yaw = Math.atan2(-dx, -dz);
    const travel = Math.min(distance, speed * dt);
    const to = slide(
      this.house,
      this.haunt.shut,
      this.monster,
      (dx / distance) * travel,
      (dz / distance) * travel,
      MONSTER_RADIUS,
      this.blocks,
    );
    this.monster.x = to.x;
    this.monster.z = to.z;
    const space = spaceAtMetres(this.house, this.monster, this.monster.space, SPACE_MARGIN);
    if (space) this.monster.space = space === COMMAND ? COMMAND : space.id;
  }

  // --- Knöpfe ---------------------------------------------------------------

  act(action: FlatAction): void {
    if (this.haunt.phase !== 'running') return;
    if (action === 'cycle') {
      if (this.tools.length > 1) this.active = (this.active + 1) % this.tools.length;
      this.events.push({ kind: 'info', text: TOOL_LABELS[this.activeTool] ?? this.activeTool });
    } else if (action === 'use') this.use();
    else this.interact();
  }

  private use(): void {
    const crew = this.haunt.crew;
    const tool = this.activeTool;
    if (tool) this.noise(this.player, tool === 'flashlight' ? NOISE.light : NOISE.click);
    if (tool === 'flashlight') {
      this.torch = !this.torch;
      this.events.push({ kind: 'info', text: this.torch ? 'Lampe an.' : 'Lampe aus.' });
    } else if (tool === 'medkit') {
      if (crew.hp >= 3) {
        this.events.push({ kind: 'info', text: 'Anzug ist unversehrt.' });
        return;
      }
      crew.hp = Math.min(3, crew.hp + 1);
      this.dropTool('medkit');
      this.events.push({ kind: 'good', text: `Medkit benutzt · Anzug ${crew.hp}/3.` });
    } else if (tool === 'radar') {
      if (!this.haunt.monsterOn) {
        this.events.push({ kind: 'info', text: 'Radar: kein Kontakt.' });
        return;
      }
      const dx = this.monster.x - this.player.x,
        dz = this.monster.z - this.player.z;
      this.radarPing = 3;
      this.events.push({
        kind: 'warn',
        text: `Radar: Kontakt ${Math.round(Math.hypot(dx, dz))} m ${compass(dx, dz)}.`,
      });
    } else if (tool === 'xray') {
      // Das Röntgengerät zeigt Inhalte, keine Kisten: Leere meldet es nicht.
      const open = this.cargo.filter(
        (c) => !c.empty && !crew.inventory.includes(c.key) && !this.haunt.done.includes(c.key),
      );
      const near = open
        .map((c) => ({ c, d: Math.hypot(c.at.x - this.player.x, c.at.z - this.player.z) }))
        .sort((p, q) => p.d - q.d)[0];
      // **Das Röntgen nennt die Kiste, nie ihren Inhalt.** Es ist der
      // technische Ausweg des Technikers, wenn niemand am Archiv sitzt oder
      // der Archivar schweigt — und es soll ihm dieselbe Auskunft geben wie
      // ein Mensch am Telefon: Kennzeichen und Raum.
      this.events.push({
        kind: 'info',
        text: near
          ? `Röntgen: ${near.c.mark} in ${Math.round(near.d)} m (${roomName(this.house, near.c.roomId)}).`
          : 'Röntgen: keine Fracht mehr.',
      });
    }
  }

  private dropTool(id: string): void {
    const index = this.tools.indexOf(id);
    if (index >= 0) this.tools.splice(index, 1);
    const held = this.haunt.crew.inventory.indexOf(id);
    if (held >= 0) this.haunt.crew.inventory.splice(held, 1);
    this.active = Math.min(this.active, this.tools.length - 1);
  }

  /** Ob das Radar gerade das Monster zeigt. */
  get radarActive(): boolean {
    return this.radarPing > 0;
  }

  private nearest(): {
    kind: MapItem['kind'] | 'door' | 'light';
    id: string;
    label: string;
    at: FloorPoint;
  } | null {
    const crew = this.haunt.crew;
    if (crew.hidden) {
      const locker = this.lockers.find((l) => l.id === crew.hidden)!;
      return { kind: 'locker', id: locker.id, label: 'Schrank verlassen', at: locker.at };
    }
    const candidates: Array<{
      kind: MapItem['kind'] | 'door' | 'light';
      id: string;
      label: string;
      at: FloorPoint;
    }> = [];
    for (const cargo of this.cargo) {
      if (crew.inventory.includes(cargo.key) || this.haunt.done.includes(cargo.key)) continue;
      candidates.push({
        kind: 'cargo',
        id: cargo.id,
        label: !crew.opened.includes(cargo.id)
          ? `${cargo.mark} öffnen`
          : cargo.empty
            ? `${cargo.mark} durchsuchen`
            : `${cargo.label} nehmen`,
        at: cargo.at,
      });
    }
    for (const console of this.consoles)
      if (!this.haunt.done.includes(console.repair.itemId))
        candidates.push({
          kind: 'console',
          id: console.id,
          label: console.repair.title,
          at: console.at,
        });
    for (const locker of this.lockers)
      if (this.rules.cabinUsable(locker.id))
        candidates.push({
          kind: 'locker',
          id: locker.id,
          label: 'Im Schrank verstecken',
          at: locker.at,
        });
    for (const door of this.house.doors) {
      const locked = this.haunt.shut.includes(door.id);
      candidates.push({
        kind: 'door',
        id: door.id,
        label: locked ? 'Tür entriegeln' : 'Tür verriegeln',
        at: doorCentre(door),
      });
    }
    for (const room of spacesOf(this.house))
      candidates.push({
        kind: 'light',
        id: room.id,
        label: this.haunt.lit.includes(room.id) ? 'Licht aus' : 'Licht an',
        at: this.graph.centre(room.id),
      });
    let best: (typeof candidates)[number] | null = null;
    let bestDistance = REACH;
    const heading = headingOf(this.player.yaw);
    for (const candidate of candidates) {
      const dx = candidate.at.x - this.player.x,
        dz = candidate.at.z - this.player.z;
      const distance = Math.hypot(dx, dz);
      const reach =
        candidate.kind === 'door' ? REACH * 1.1 : candidate.kind === 'light' ? REACH * 0.8 : REACH;
      if (distance > reach) continue;
      // Was vor einem liegt, gewinnt gegen das, was hinter einem liegt.
      const facing = distance < 0.3 ? 0 : -(dx * heading.x + dz * heading.z) / distance;
      const score = distance + facing * 0.5;
      if (score < bestDistance) {
        bestDistance = score;
        best = candidate;
      }
    }
    return best;
  }

  private interact(): void {
    const crew = this.haunt.crew;
    const near = this.nearest();
    if (!near) {
      this.events.push({ kind: 'info', text: 'Hier ist nichts.' });
      return;
    }
    // Hantieren macht Lärm — eine Tür mehr als ein Schalter (`audio/cues.ts`).
    this.noise(
      near.at,
      near.kind === 'door' ? NOISE.door : near.kind === 'light' ? NOISE.light : NOISE.interact,
      near.kind === 'door' ? 'door' : 'interact',
    );
    if (near.kind === 'locker') {
      if (crew.hidden) {
        crew.hidden = '';
        this.events.push({ kind: 'info', text: 'Schrank verlassen.' });
      } else {
        crew.hidden = near.id;
        this.player.x = near.at.x;
        this.player.z = near.at.z;
        this.events.push({ kind: 'info', text: 'Versteckt. Still bleiben.' });
      }
      return;
    }
    if (near.kind === 'cargo') {
      const cargo = this.cargo.find((c) => c.id === near.id)!;
      if (!crew.opened.includes(cargo.id)) {
        crew.opened.push(cargo.id);
        this.events.push({ kind: 'info', text: `${cargo.mark} geöffnet.` });
        return;
      }
      // **Die leere Kiste kostet zwei Griffe**, nicht einen: aufmachen,
      // hineinsehen. Erst danach ist sie erledigt und steht dem Techniker
      // nicht mehr als Ziel im Weg.
      if (cargo.empty) {
        crew.inventory.push(cargo.key);
        this.events.push({ kind: 'info', text: 'Leer.' });
        return;
      }
      crew.inventory.push(cargo.loot);
      if (this.house.tasks.some((t) => t.id === cargo.loot)) {
        this.haunt.taken.push(cargo.loot);
        this.events.push({ kind: 'good', text: `${cargo.label} mitgenommen.` });
      } else {
        if (!this.tools.includes(cargo.loot)) this.tools.push(cargo.loot);
        this.events.push({ kind: 'good', text: `${cargo.label} eingesteckt.` });
      }
      return;
    }
    if (near.kind === 'console') {
      const console = this.consoles.find((c) => c.id === near.id)!;
      if (!crew.inventory.includes(console.repair.itemId)) {
        this.events.push({
          kind: 'warn',
          text: `Abdeckung verriegelt: ${console.repair.item} fehlt.`,
        });
        return;
      }
      puzzleFor(crew, console.repair.id).open = true;
      this.puzzle = console.repair;
      return;
    }
    if (near.kind === 'door') {
      this.events.push({ kind: 'info', text: this.lockDoor(near.id) });
      return;
    }
    if (near.kind === 'light') this.events.push({ kind: 'info', text: this.switchLight(near.id) });
  }

  /**
   * **Eine Tür gewollt sperren oder freigeben** — vor Ort oder von der
   * Schalttafel aus: Gewollt gesperrt ist immer nur eine; die vorherige geht
   * dabei auf (`rules/doorLocks.ts`). Zugefallene darf man jederzeit freigeben.
   *
   * @returns die Zeile für den Spieler.
   */
  lockDoor(id: string): string {
    const door = this.house.doors.find((d) => d.id === id);
    if (!door || this.haunt.phase !== 'running') return '';
    const before = this.locks.chosen;
    const out = toggleLock(this.locks, this.haunt.shut, id, this.haunt.time, () => this.rng.next());
    this.haunt.shut = out.shut;
    if (!out.locked) return 'Tür entriegelt.';
    return before && before !== id
      ? 'Tür verriegelt · die vorherige ist wieder offen.'
      : 'Tür verriegelt.';
  }

  /** **Das Licht eines Raums umlegen** — vor Ort oder von der Schalttafel aus. */
  switchLight(roomId: string): string {
    if (this.haunt.phase !== 'running') return '';
    const on = this.haunt.lit.includes(roomId);
    if (on) this.haunt.lit = this.haunt.lit.filter((id) => id !== roomId);
    else this.haunt.lit.push(roomId);
    return on ? 'Licht aus.' : 'Licht an.';
  }

  /**
   * **Die Ziele des Technikers, in Reihenfolge**: je Reparatur erst das
   * Ersatzteil, dann die Konsole; sind alle drei erledigt, die Zentrale.
   * Das erste ist das nächste — das mit dem Dreieck am Bildrand.
   */
  objectives(): MapGoal[] {
    const crew = this.haunt.crew;
    const out: MapGoal[] = [];
    for (const repair of repairsFor(this.house)) {
      if (this.haunt.done.includes(repair.itemId)) continue;
      const cargo = this.cargo.find((c) => c.loot === repair.itemId);
      const console = this.consoles.find((c) => c.repair.id === repair.id);
      if (cargo && !crew.inventory.includes(repair.itemId))
        out.push(
          this.precision === 'crate'
            ? {
                id: cargo.id,
                at: { ...cargo.at },
                label: cargo.label,
                next: false,
                kind: 'crate',
                precision: 'exact',
              }
            : this.roomGoal(cargo.roomId),
        );
      else if (console)
        out.push({
          id: console.id,
          at: { ...console.at },
          label: repair.title,
          next: false,
          kind: 'console',
          precision: 'exact',
        });
    }
    if (!out.length)
      out.push({
        id: 'van',
        at: { x: COMMAND_HOME.x, z: COMMAND_HOME.z },
        label: 'Zurück zur Zentrale',
        next: false,
        kind: 'van',
        precision: 'exact',
      });
    out[0]!.next = true;
    return out;
  }

  /**
   * **Das Ziel, wenn nur der Raum verraten werden darf**: seine Mitte, sein
   * Name, seine Kennung. Der Weg dorthin ist derselbe wie zu jeder Kiste darin
   * — welche es ist, sagt der Archivar.
   */
  private roomGoal(roomId: string): MapGoal {
    const centre = this.graph.centre(roomId);
    return {
      id: `room:${roomId}`,
      at: { x: centre.x, z: centre.z },
      label: roomName(this.house, roomId),
      next: false,
      kind: 'room',
      precision: 'room',
    };
  }

  /** Der Weg, den das Monster gerade geht — leer, wenn ein Spieler es steuert oder es steht. */
  monsterRoute(): MapPoint[] {
    if (!this.haunt.monsterOn || this.driver?.active() || this.ventRide.busy) return [];
    const points = this.navigator.remaining;
    if (!points.length) return [];
    return [{ x: this.monster.x, z: this.monster.z }, ...points.map((p) => ({ x: p.x, z: p.z }))];
  }

  /**
   * Der Weg des Spielers zum nächsten Ziel — dieselbe Wegsuche wie die des
   * Monsters (`navmesh/flatNavigator.ts`), mit dem Radius des Spielers; nur
   * gerechnet, wenn jemand ihn sehen will, und nur so oft, wie der Navigator
   * selbst neu plant.
   */
  playerRoute(): MapPoint[] {
    const goal = this.objectives()[0];
    if (!goal || this.haunt.crew.hidden) return [];
    this.playerNav ??= new FlatNavigator(this.house, this.graph, PLAYER_RADIUS);
    this.playerNav.aim(this.player, goal.at, this.haunt.shut, this.haunt.time);
    const points = this.playerNav.remaining.map((p) => ({ x: p.x, z: p.z }));
    return [{ x: this.player.x, z: this.player.z }, ...points];
  }

  // --- Rätsel --------------------------------------------------------------

  /** Ein Zug im offenen Rätsel. Gelöst heißt: repariert und zu. */
  solve(action: PuzzleAction): { solved: boolean; wrong: boolean } {
    const repair = this.puzzle;
    if (!repair) return { solved: false, wrong: true };
    const puzzle = puzzleFor(this.haunt.crew, repair.id);
    const outcome = applyPuzzle(repair, puzzle, action);
    this.noise(this.player, NOISE.click);
    if (outcome.solved && puzzleSolved(repair, puzzle)) {
      this.haunt.done.push(repair.itemId);
      const held = this.haunt.crew.inventory.indexOf(repair.itemId);
      if (held >= 0) this.haunt.crew.inventory.splice(held, 1);
      this.puzzle = null;
      this.events.push({
        kind: 'good',
        text:
          this.haunt.done.length >= 3
            ? `${repair.title}: erledigt. Zurück zur Zentrale!`
            : `${repair.title}: erledigt (${this.haunt.done.length}/3).`,
      });
    }
    return outcome;
  }

  closePuzzle(): void {
    this.puzzle = null;
  }

  /** Nur für Tests: den Spieler irgendwohin stellen, wo man stehen darf. */
  place(at: FloorPoint): boolean {
    if (!walkable(this.house, this.haunt.shut, at, PLAYER_RADIUS, this.blocks)) return false;
    this.player.x = at.x;
    this.player.z = at.z;
    const space = spaceAtMetres(this.house, at);
    this.player.space = space === null ? this.player.space : space === COMMAND ? COMMAND : space.id;
    this.snapshotCache = null;
    return true;
  }

  /** Die Zielpunkte, in Reihenfolge — für Tests und die Bot-Vorschau. */
  jobs(): Array<{ kind: 'cargo' | 'console'; id: string; at: FloorPoint; roomId: string }> {
    const out: Array<{ kind: 'cargo' | 'console'; id: string; at: FloorPoint; roomId: string }> =
      [];
    for (const repair of repairsFor(this.house)) {
      const cargo = this.cargo.find((c) => c.loot === repair.itemId);
      const console = this.consoles.find((c) => c.repair.id === repair.id);
      if (cargo) out.push({ kind: 'cargo', id: cargo.id, at: cargo.at, roomId: cargo.roomId });
      if (console)
        out.push({ kind: 'console', id: console.id, at: console.at, roomId: console.roomId });
    }
    return out;
  }
}

function monsterBase(kind: MonsterKind): number {
  return MONSTERS.find((m) => m.id === kind)?.speed ?? 2.8;
}

function farthest(graph: StationGraph, from: FloorPoint): string {
  let best = graph.rooms[0] ?? graph.spaces[0]!;
  let far = -1;
  for (const id of graph.rooms) {
    const centre = graph.centre(id);
    const distance = Math.hypot(centre.x - from.x, centre.z - from.z);
    if (distance > far) {
      far = distance;
      best = id;
    }
  }
  return best;
}

function roomName(spec: HouseSpec, id: string): string {
  return spacesOf(spec).find((room) => room.id === id)?.name ?? id;
}

/**
 * Wie der Inhalt einer Kiste heißt — und bei einer leeren die Kiste selbst:
 * „Leer" ist kein Name, „Kiste 2 · blau" schon, und auf der Karte steht ein
 * Name.
 */
function lootName(house: HouseSpec, slot: CargoSlot): string {
  const loot = slot.loot;
  if (loot.kind === 'part')
    return house.tasks.find((t) => t.id === loot.taskId)?.label ?? loot.taskId;
  if (loot.kind === 'tool') return TOOL_LABELS[loot.tool] ?? loot.tool;
  return cargoLabel(slot);
}

function compass(dx: number, dz: number): string {
  const angle = Math.atan2(dx, -dz);
  const names = [
    'nördlich',
    'nordöstlich',
    'östlich',
    'südöstlich',
    'südlich',
    'südwestlich',
    'westlich',
    'nordwestlich',
  ];
  const index = Math.round(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
  return names[index]!;
}
