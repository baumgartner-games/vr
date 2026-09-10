import { TILE } from '../../nav/navTile';
import { generateHouse, onApron, spacesOf, type HouseSpec } from '../house';
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
import { stationLayout, type FloorPoint } from '../stationLayout';
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
import { Hearing } from '../audio/hearing';
import { NOISE, stepLoudness } from '../audio/cues';
import { BOT_FOV, BOT_VISION, MONSTER_FOV } from '../perception';
import { freshSpook, stepHaunt, type Spook } from '../haunt';
import { COMMAND_HOME } from '../trainingLayout';
import { Rng } from '../rng';
import { RoundRules } from '../rules/roundRules';
import { VentNet } from '../vents/ventGraph';
import { VentTravel } from '../vents/ventTravel';
import { VentPilot } from '../vents/ventPilot';
import type { MonsterDriver } from '../monster/monsterDriver';
import { doorCentre, nextThroughDoor, slide, spaceAtMetres, walkable, WALL_T } from './geometry';
import { extractMapSnapshot } from './extract';
import type { MapSource } from './mapSource';
import {
  headingOf,
  type MapEntity,
  type MapItem,
  type MapLight,
  type MapRound,
  type MapSnapshot,
} from './mapSnapshot';
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
 * Treffer und Puls aus `mission.ts`, der Spuk aus `haunt.ts`, die drei
 * Reparaturen aus `repairsFor`. Was hier neu ist, ist nur die **Bewegung**
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
/** Und der des Monsters. */
const MONSTER_RADIUS = 0.4;
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

export interface FlatOptions {
  monster?: MonsterKind;
  tuning?: BotTuning;
  /** Ohne Monster, wie der sichere Test im Headset. */
  test?: boolean;
  roll?: number;
  mode?: VisibilityMode;
  /** Wen der Spieler in der 2D-Welt spielt (nur `FlatMode`; die Runde selbst ist neutral). */
  role?: 'technician' | 'monster';
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
  loot: string;
  label: string;
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
  readonly rules = new RoundRules();
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
  private decision: RoutineOutput | null = null;
  /** Was das Monster wahrnimmt — dieselbe Leiter wie im Headset (`threat.ts`). */
  private readonly memory: ThreatState = freshThreat();
  /** Das Hörmodell (`audio/hearing.ts`) und die Geräusche des Spielers seit dem letzten Schritt. */
  private readonly hearing = new Hearing();
  private noises: NoiseSource[] = [];
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

  constructor(seed: number, options: FlatOptions = {}) {
    this.house = generateHouse(seed, 14);
    this.graph = stationGraph(this.house);
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
    };
    this.rng = new Rng((seed ^ ((options.roll ?? 0) * 0x9e3779b1)) >>> 0);
    this.routine = new MonsterRoutine(this.tuning.monster);
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
    let extra = 0;
    for (const room of this.house.rooms) {
      const task = this.house.tasks.find((t) => t.roomId === room.id);
      const cargo = layout.find((p) => p.id === `cargo-${room.id}`);
      if (cargo) {
        const loot = task ? task.id : ['radar', 'xray', 'medkit', 'medkit'][extra++ % 4]!;
        this.cargo.push({
          id: cargo.id,
          roomId: room.id,
          at: cargo.approach,
          loot,
          label: task ? task.label : (TOOL_LABELS[loot] ?? loot),
        });
      }
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
    if (this.haunt.shut.includes(id)) return false;
    // Automatische Türen: offen, sobald jemand davorsteht.
    const door = this.house.doors.find((d) => d.id === id);
    if (!door) return false;
    const at = doorCentre(door);
    for (const actor of [this.player, this.monster]) {
      if (actor === this.monster && (!this.haunt.monsterOn || this.ventRide.concealed)) continue;
      if (Math.hypot(actor.x - at.x, actor.z - at.z) < 2.2) return true;
    }
    return false;
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
    for (const cargo of this.cargo) {
      const taken = crew.inventory.includes(cargo.loot) || this.haunt.done.includes(cargo.loot);
      out.push({
        id: cargo.id,
        kind: 'cargo',
        label: cargo.label,
        roomId: cargo.roomId,
        at: { ...cargo.at },
        state: taken ? 'taken' : crew.opened.includes(cargo.id) ? 'open' : 'closed',
        interactive: !taken,
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
      label: 'Van',
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
      );
      this.player.x = to.x;
      this.player.z = to.z;
      const space = spaceAtMetres(this.house, this.player, this.player.space, SPACE_MARGIN);
      this.player.space =
        space === null ? this.player.space : space === COMMAND ? COMMAND : space.id;
    }
    const gap = this.haunt.monsterOn
      ? Math.hypot(this.player.x - this.monster.x, this.player.z - this.monster.z)
      : Infinity;
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
      this.haunt.shut.push(spooked.doorShut);
      this.events.push({ kind: 'warn', text: 'Irgendwo fällt eine Tür zu.' });
    }

    if (!this.haunt.monsterOn) return;

    // --- Im Schacht: nichts hören, nichts sehen, nur fahren (`vents/ventTravel.ts`).
    const piloted = this.driver?.active() === true;
    if (this.ventRide.busy) {
      this.ventRide.step(dt, this.monster, !piloted);
      this.haunt.monster = { x: this.monster.x, z: this.monster.z };
      return;
    }

    // --- Wahrnehmung des Monsters: Sehen über die Karte, Hören über das
    // Hörmodell, die Alarmleiter aus `threat.ts` — dieselbe wie im Headset.
    const profile = ENTITY_PROFILES[crew.options.monster];
    const hidden = !!crew.hidden;
    const snapshot = this.snapshot();
    if (this.moving && !hidden)
      this.noises.push({
        at: { x: this.player.x, z: this.player.z },
        loudness: stepLoudness(speed),
      });
    const heard = hidden
      ? []
      : hearNoises(this.hearing, snapshot, this.monster, this.noises, this.tuning.monster.hearing);
    this.noises.length = 0;
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
    if (decision.strike && hidden) {
      this.caught = '';
      // Die Kabine ist danach hin (`rules/roundRules.ts`).
      if (this.rules.cabinStrike(crew)) this.hit('Die Kabine wird aufgerissen.');
    }
    if (
      decision.mode === 'search' &&
      hidden &&
      decision.cue === 'sniff' &&
      this.routine.suspect === crew.hidden
    )
      this.caught = crew.hidden;
    if (decision.cue === 'scream') this.events.push({ kind: 'bad', text: 'Ein Schrei.' });
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

    // Die KI trifft durch Berührung, ein Spieler nur mit dem Knopf.
    const wantsHit = piloted ? decision.strike : !decision.strike;
    if (gap < CONTACT && !hidden && wantsHit && takeCrewHit(crew, true)) this.hit('Treffer.');
  }

  /** Ein Geräusch des Spielers für die Ohren des Monsters (`audio/cues.ts`, `NOISE`). */
  private noise(at: FloorPoint, loudness: number): void {
    this.noises.push({ at: { x: at.x, z: at.z }, loudness });
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
   * Das Monster geht Raum für Raum: Im Zielraum geradeaus, sonst zur Tür in
   * den nächsten Raum der Karte. Eine gesperrte Holztür hält es kurz auf,
   * Stahl für immer — dann wählt die Routine irgendwann ein anderes Ziel.
   */
  private moveMonster(decision: RoutineOutput, dt: number, speed: number): void {
    const goal = decision.goal;
    if (!goal || speed <= 0) return;
    const goalSpace = this.graph.spaceAt(goal) || this.monster.space;
    // Wer sich in einer Türnische an der Wand festläuft, geht erst zurück in
    // die Mitte seines Raums und von dort noch einmal los.
    if (Math.hypot(this.monster.x - this.stall.x, this.monster.z - this.stall.z) > 0.05) {
      this.stall = { x: this.monster.x, z: this.monster.z, since: this.haunt.time };
    } else if (this.haunt.time - this.stall.since > 0.6 && this.haunt.time > this.detourUntil) {
      this.detourUntil = this.haunt.time + 1.2;
      this.stall.since = this.haunt.time;
    }
    if (this.haunt.time < this.detourUntil) {
      const centre = this.graph.centre(this.monster.space);
      this.stepMonster(centre, speed, dt);
      return;
    }
    let step: FloorPoint = goal;
    let door: (typeof this.house.doors)[number] | null = null;
    if (goalSpace !== this.monster.space) {
      const nextSpace = this.graph.next(this.monster.space, goalSpace);
      door =
        this.house.doors.find(
          (d) =>
            (d.a === this.monster.space && (d.b ?? COMMAND) === nextSpace) ||
            ((d.b ?? COMMAND) === this.monster.space && d.a === nextSpace),
        ) ?? null;
      if (door) step = nextThroughDoor(door, this.monster, this.graph.centre(nextSpace));
    }
    if (door && this.haunt.shut.includes(door.id)) {
      const at = doorCentre(door);
      if (Math.hypot(at.x - this.monster.x, at.z - this.monster.z) < 1.6) {
        if (!this.blocked || this.blocked.id !== door.id)
          this.blocked = { id: door.id, since: this.haunt.time };
        if (door.material === 'wood' && this.haunt.time - this.blocked.since > WOOD_DELAY) {
          this.haunt.shut = this.haunt.shut.filter((id) => id !== door.id);
          this.events.push({ kind: 'warn', text: 'Holz splittert.' });
          this.blocked = null;
        }
      }
    } else this.blocked = null;
    this.stepMonster(step, speed, dt);
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
      const open = this.cargo.filter(
        (c) => !crew.inventory.includes(c.loot) && !this.haunt.done.includes(c.loot),
      );
      const near = open
        .map((c) => ({ c, d: Math.hypot(c.at.x - this.player.x, c.at.z - this.player.z) }))
        .sort((p, q) => p.d - q.d)[0];
      this.events.push({
        kind: 'info',
        text: near
          ? `Röntgen: ${near.c.label} in ${Math.round(near.d)} m (${roomName(this.house, near.c.roomId)}).`
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
      if (crew.inventory.includes(cargo.loot) || this.haunt.done.includes(cargo.loot)) continue;
      candidates.push({
        kind: 'cargo',
        id: cargo.id,
        label: crew.opened.includes(cargo.id) ? `${cargo.label} nehmen` : 'Fracht öffnen',
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
        this.events.push({ kind: 'info', text: `Fracht geöffnet: ${cargo.label}.` });
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
      const locked = this.haunt.shut.includes(near.id);
      if (locked) this.haunt.shut = this.haunt.shut.filter((id) => id !== near.id);
      else this.haunt.shut.push(near.id);
      this.events.push({ kind: 'info', text: locked ? 'Tür entriegelt.' : 'Tür verriegelt.' });
      return;
    }
    if (near.kind === 'light') {
      const on = this.haunt.lit.includes(near.id);
      if (on) this.haunt.lit = this.haunt.lit.filter((id) => id !== near.id);
      else this.haunt.lit.push(near.id);
      this.events.push({ kind: 'info', text: on ? 'Licht aus.' : 'Licht an.' });
    }
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
    if (!walkable(this.house, this.haunt.shut, at, PLAYER_RADIUS)) return false;
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
