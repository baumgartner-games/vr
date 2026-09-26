/** @jest-environment jsdom */
import * as THREE from 'three';
import { HauntingWorld } from './HauntingWorld';
import { generateHouse, type HouseSpec } from './house';
import { freshCrew, stationOptions } from './mission';
import { AutomaticDoors } from './automaticDoors';
import { RoundRules } from './rules/roundRules';
import { DEFAULT_TUNING } from './botTuning';
import { DEFAULT_LIGHTING } from './botLighting';
import { Rng } from './rng';
import { defaultLobby, type LobbyChoice } from './rules/lobby';
import { VentNet } from './vents/ventGraph';
import { VentTravel } from './vents/ventTravel';
import {
  readHandover,
  readSetupMessage,
  readStart,
  setupMessage,
  startMessage,
  stateMessage,
  type HauntBooks,
  type HauntState,
} from './net';
import { ROUND_RUNNING, START_SENT } from './HauntingWorld';
import { FlatRound } from './map/flatRound';
import { FlatKernel } from './flatKernel';
import { KernelLocomotion } from './kernelLocomotion';
import { MonsterMemory } from './monster/monsterMemory';
import { stationGraph } from './roomGraph';
import { dropAlpha } from './rules/blood';
import { freshLocks, type DoorLocks } from './rules/doorLocks';
import { freshLamps, type Lamps } from './rules/lamps';
import { COMMAND_HOME } from './trainingLayout';
import { freshGhosts, GHOST_LIVE, GHOST_TTL } from './rules/ghosts';
import { HOST_BUSY, SHIP_NEEDS_TECHNICIAN, SHIP_OCCUPIED } from './rules/worldMenu';
import { defaultSetup, withPower, withWho, type RoundSetup } from './rules/roundSetup';
import type { Intent } from './rules/lobby';
import type { ShipActor } from './actorArt';
import type { GridPlan } from '../grid/gridPlan';
import type { MenuEntry } from '../../ui/menu';

/**
 * Ein Bild, so lang wie eines bei 60 Hz. Die Körper im Schiff sind seit
 * `actorArt.ts` Akteure mit einem Mischer, und der bekommt einen Zeitschritt
 * statt einer Uhr (`ShipActor.update`).
 */
const FRAME = 1 / 60;

jest.mock('../grid/GridWorld', () => ({
  GridWorld: class {
    menu(): unknown[] {
      return [];
    }
  },
}));
jest.mock('./haunting.css', () => ({}));
jest.mock('./stationDashboard.css', () => ({}));
jest.mock('./monster/monster.css', () => ({}));

interface ReplayWorld {
  spec: HouseSpec;
  state: HauntState;
  grid: { replaceWith: jest.Mock<void, [GridPlan]> };
  automaticDoors: AutomaticDoors;
  buildHouse: jest.Mock;
  parkDrone: jest.Mock;
  blob: ShipActor | null;
  live: THREE.Group;
  hostId: string;
  context: unknown;
  adopt(state: HauntState): void;
  applyBlob(dt: number): void;
  refreshHost(ctx: unknown): void;
  receive(data: unknown, from: string): void;
  requestBotRound(ctx: unknown): void;
  menu(): MenuEntry[];
  lobbyChoice: LobbyChoice;
  flatTechnician: boolean;
  pendingBotRound: boolean;
  /** Die Tafel der nächsten Runde (`rules/roundSetup.ts`). */
  setup: RoundSetup;
  /** Wann sie hier zuletzt selbst angefasst wurde — Schonfrist gegen den Stand des Gastgebers. */
  setupTouchedAt: number;
  applySetup(setup: RoundSetup, mine?: boolean): void;
  /** Eine Absicht, die noch auf den Anzug wartet (`rules/worldMenu.shipStart`). */
  pendingStart: Intent | null;
  startRound(what: Intent, ctx: unknown): void;
  /** Der Rechenkern (`flatKernel.ts`) und der Stock, der in ihn geht. */
  kernel: FlatKernel | null;
  kernelLoco: KernelLocomotion | null;
  stepKernel(dt: number, ctx: unknown): void;
  technicianArt: ShipActor | null;
  showTechnician(dt: number): void;
  readonly waitingHandover: boolean;
  /** Die Buchführung, die nur beim Gastgeber liegt — und beim Wechsel mitreisen muss. */
  locks: DoorLocks;
  lampBook: Lamps;
  /** Bücher, die auf den nächsten Kern warten (`loadBooks`). */
  pendingBooks: HauntBooks | null;
  handoverUntil: number;
  books(): HauntBooks;
  loadBooks(books: HauntBooks): void;
  takeHandover(state: HauntState, books: HauntBooks): void;
  stale(state: HauntState): boolean;
  bloodArt: THREE.Group | null;
  paintTrail(): void;
  /** Und die halbdurchsichtige Kopie an der zuletzt gesehenen Stelle (`rules/ghosts.ts`). */
  ghostArt: ShipActor | null;
  paintGhost(dt: number): void;
}

function snapshot(seed = 391): HauntState {
  return {
    crew: freshCrew(stationOptions({ rooms: 8 })),
    seed,
    phase: 'running',
    time: 0,
    monsterOn: true,
    monster: { x: 1, z: 2 },
    shut: [],
    lit: [],
    fuse: false,
    taken: [],
    done: [],
    destroyed: [],
    technician: null,
    ride: 'out',
    ghosts: freshGhosts(),
  };
}

function replay(): ReplayWorld {
  const world = Object.create(HauntingWorld.prototype) as ReplayWorld;
  const vents = new VentNet(generateHouse(391, 8));
  Object.assign(world, {
    spec: generateHouse(391, 8),
    state: snapshot(),
    grid: { replaceWith: jest.fn() },
    automaticDoors: new AutomaticDoors(),
    buildHouse: jest.fn(),
    parkDrone: jest.fn(),
    live: new THREE.Group(),
    blob: null,
    hostId: 'remote',
    rules: new RoundRules(() => world.state),
    context: { net: { localId: 'local', peers: new Map() } },
    technicians: new Map(),
    // Felder, die sonst der Konstruktor setzt — der Prototyp-Nachbau hat keinen.
    tuning: DEFAULT_TUNING,
    dash: 1,
    lamps: new Map(),
    // **Der Rechenkern** (`flatKernel.ts`): Die 2D-Runde, die im Schiff des
    // Gastgebers rechnet — Monster, Puste, Blutspur, Hörmodell, alles. Sie
    // wird im ersten Bild gestellt (`ensureKernel`); der Nachbau bringt nur
    // den Stock mit, der in sie geht.
    kernel: null,
    kernelLoco: new KernelLocomotion({ apply: () => {} }),
    kernelHead: null,
    pendingBooks: null,
    // Die Buchführung, die Tafel und Techniker vor Ort ohne Kern führen
    // (`net.HauntBooks`): Riegel und Lampen. Mit Kern sind es dessen Bücher.
    locks: freshLocks(),
    lampBook: freshLamps(),
    handoverUntil: 0,
    routineDice: new Rng(0x4d4f4e53),
    beacons: [],
    botLighting: { ...DEFAULT_LIGHTING },
    simulationSpeed: 1,
    technicianArt: null,
    flatTechnician: false,
    pendingBotRound: false,
    vents: vents,
    ventRide: new VentTravel(vents),
    ventArt: null,
    monsterDriver: null,
    // Die Wahl der Lobby (`rules/lobby.ts`) — ohne sie weiß der Nachbau
    // nicht, wer er ist (`myPlace`).
    lobbyChoice: defaultLobby('desktop'),
    // Die Tafel und ihre Schonfrist (`applySetup`, `SETUP_GRACE`).
    setup: defaultSetup(),
    setupTouchedAt: -Infinity,
  });
  return world;
}

/**
 * **Ein Gerät im Aufbau**: kein Stock, keine Brille — so, wie ein Telefon oder
 * ein Desktop dasteht, das die Runde gerade verteilt hat. Der Raum ist leer,
 * die Tafel steht auf „Techniker: Mensch".
 */
function setupStarter(): ReplayWorld {
  const world = replay();
  Object.assign(world, {
    claims: new Map(),
    seatedAt: 0,
    hostId: 'local',
    setup: defaultSetup(),
    pendingStart: null,
    lobbyChoice: { intent: 'play', me: 'technician' },
  });
  world.state.phase = 'briefing';
  return world;
}

/** Der Rahmen dazu — und auf Wunsch ein zweiter, der schon im Anzug steckt. */
function starterCtx(occupied = false) {
  return {
    ...election('desktop', occupied),
    notify: jest.fn(),
    menu: { toggle: jest.fn() },
    renderer: { xr: { isPresenting: false } },
    refreshWorldMenu: jest.fn(),
  };
}

test('a same-seed replay changing test mode rebuilds the deck, interactions and automatic-door state', () => {
  const world = replay();
  world.automaticDoors.step('d0', { x: 0, z: 0, alongX: true }, false, [{ x: 0, z: 1 }], 0.1);
  const next = snapshot();
  next.crew.options.test = true;
  world.adopt(next);
  expect(world.state).toBe(next);
  expect(world.grid.replaceWith).toHaveBeenCalledTimes(1);
  expect(world.buildHouse).toHaveBeenCalledTimes(1);
  expect(world.automaticDoors.isOpen('d0')).toBe(false);
  const normal = snapshot();
  world.adopt(normal);
  expect(world.grid.replaceWith).toHaveBeenCalledTimes(2);
  expect(world.buildHouse).toHaveBeenCalledTimes(2);
});

test('ordinary damage and inventory snapshots retain the existing scene', () => {
  const world = replay();
  const next = snapshot();
  next.crew.hp = 2;
  next.crew.inventory.push('radar');
  world.adopt(next);
  expect(world.state).toBe(next);
  expect(world.grid.replaceWith).not.toHaveBeenCalled();
  expect(world.buildHouse).not.toHaveBeenCalled();
});

test('a spectator replaces its old monster model when the host changes creature type', () => {
  const world = replay();
  world.applyBlob(FRAME);
  const old = world.blob!;
  expect(old.kind).toBe('stalker');
  expect(old.root.name).toBe('creature-stalker');
  const next = snapshot();
  next.crew.options.monster = 'sentinel';
  world.adopt(next);
  world.applyBlob(FRAME);
  expect(world.blob).not.toBe(old);
  expect(world.blob?.kind).toBe('sentinel');
  expect(world.blob?.root.name).toBe('creature-sentinel');
  expect(old.root.parent).toBeNull();
});

function election(role: 'vr' | 'desktop', remote = false) {
  return {
    role,
    net: {
      localId: 'local',
      localSeniority: 4,
      world: 'haunting',
      peers: new Map(remote ? [['remote', { id: 'remote', world: 'haunting', role: 'vr' }]] : []),
      seniorityOf: () => 5,
      // Der abtretende Gastgeber schickt eine Übergabe (`handoverMessage`) —
      // ohne Leitung wäre das ein Absturz und keine Wahl.
      emit: jest.fn(),
    },
  };
}

/**
 * **Der Rahmen eines Gastgebers in der Brille**: ein Gestell, dessen Kopf über
 * der Zentrale steht, eine Kamera, die nach -z schaut, und Hände ohne Puls.
 * Mehr braucht `stepKernel` nicht, um die Runde zu rechnen.
 */
function kernelCtx(
  role: 'vr' | 'desktop' = 'vr',
  head: { x: number; z: number } = { x: COMMAND_HOME.x, z: COMMAND_HOME.z },
) {
  const rig = new THREE.Group() as THREE.Group & {
    getHeadPosition: (out: THREE.Vector3) => THREE.Vector3;
    paused: boolean;
    sprinting: boolean;
    crouch: number;
    pace: (sprint: boolean) => number;
  };
  rig.position.set(head.x, 0, head.z);
  rig.getHeadPosition = (out) => out.set(rig.position.x, 1.6, rig.position.z);
  rig.paused = false;
  rig.sprinting = false;
  rig.crouch = 0;
  rig.pace = () => 2.6;
  const camera = new THREE.PerspectiveCamera();
  camera.rotation.set(0, 0, 0);
  return {
    ...election(role),
    rig,
    camera,
    input: { get: () => undefined },
    notify: jest.fn(),
    refreshWorldMenu: jest.fn(),
  };
}

test('handing the host role to another technician drops the local kernel without deleting the round snapshot', () => {
  const world = replay();
  world.hostId = 'local';
  const ctx = kernelCtx('desktop');
  world.context = ctx;
  world.stepKernel(0.05, ctx);
  expect(world.kernel).not.toBeNull();
  const at = world.state.monster;
  const handover = election('desktop', true);
  world.context = handover;
  world.refreshHost(handover);
  expect(world.hostId).toBe('remote');
  // Der Kern ist weg — der Stand nicht: Der Nachfolger rechnet damit weiter.
  expect(world.kernel).toBeNull();
  expect(world.state.monster).toBe(at);
  expect(world.state.monsterOn).toBe(true);
});

test('taking over an abandoned running mission continues its monster from the last shared position', () => {
  const world = replay();
  const ctx = kernelCtx('vr');
  world.context = ctx;
  world.refreshHost(ctx);
  expect(world.hostId).toBe('local');
  // Der neue Gastgeber stellt den Kern im nächsten Bild aus dem Stand: Das
  // Monster steht dort, wo der alte es zuletzt ansagte, und der Stand bleibt
  // dasselbe Objekt (`FlatResume`).
  world.stepKernel(0.05, ctx);
  const round = world.kernel!.round;
  expect(round.haunt).toBe(world.state);
  expect(round.monster.x).toBeCloseTo(1, 0);
  expect(round.monster.z).toBeCloseTo(2, 0);
  expect(world.state.monster).toEqual(expect.objectContaining({ x: expect.any(Number) }));
});

test('a former desktop technician gives up its host priority as soon as it returns to a station', () => {
  const world = replay();
  const ctx = election('desktop', true);
  const peer = ctx.net.peers.get('remote')!;
  peer.role = 'desktop';
  ctx.net.localSeniority = 10;
  world.context = ctx;
  world.receive({ kind: 'technician', active: true }, 'remote');
  world.refreshHost(ctx);
  expect(world.hostId).toBe('remote');
  world.receive({ kind: 'technician', active: false }, 'remote');
  world.refreshHost(ctx);
  expect(world.hostId).toBe('local');
});

test('a new host hides its obsolete spectator model even when no monster remains', () => {
  const world = replay();
  world.applyBlob(FRAME);
  world.hostId = 'local';
  world.state.monster = null;
  world.applyBlob(FRAME);
  expect(world.blob?.root.visible).toBe(false);
});

test.each(['vr', 'desktop'])(
  'a bot request cannot queue a later reset behind an active %s technician',
  (role) => {
    const world = replay();
    const ctx = { ...election('desktop', true), notify: jest.fn(), menu: { toggle: jest.fn() } };
    ctx.net.peers.get('remote')!.role = role;
    if (role === 'desktop') world.receive({ kind: 'technician', active: true }, 'remote');
    world.context = ctx;
    world.requestBotRound(ctx);
    expect(world.pendingBotRound).toBe(false);
    expect(world.flatTechnician).toBe(false);
    expect(ctx.notify).toHaveBeenCalledTimes(1);
    ctx.net.peers.clear();
    world.context = ctx;
    world.refreshHost(ctx);
    expect(world.pendingBotRound).toBe(false);
  },
);

test('the headset menu leads with the mission and says why a start is refused', () => {
  const world = replay();
  const ctx = {
    ...election('vr'),
    notify: jest.fn(),
    menu: { toggle: jest.fn() },
    renderer: { xr: { isPresenting: true } },
  };
  world.context = ctx;
  // Ein fremder Gastgeber darf den Eintrag nicht stumm machen (`rules/worldMenu.ts`).
  world.lobbyChoice = { intent: 'play', me: 'technician' };
  world.hostId = 'remote';
  // Vor dem Start: die Übungsrunde (`rules/roundFlow.ts`).
  world.state.phase = 'briefing';
  const menu = world.menu().filter((row) => row.id.startsWith('haunt:'));
  // **Oben steht, in welcher Runde man ist** (`rules/roundFlow.ts`) — vor dem
  // Start die Übungsrunde.
  expect(menu[0]!.id).toBe('haunt:status');
  expect(menu[0]!.label).toBe('Jetzt: Übungsrunde');
  const rounds = menu.slice(1);
  // Dieselben drei Absichten wie im Van (`rules/lobby.ts`), in derselben
  // Reihenfolge.
  expect(rounds.slice(0, 3).map((row) => row.id)).toEqual([
    'haunt:play',
    'haunt:watch',
    'haunt:train',
  ]);
  // Eine Ansicht wählt diese Welt nicht mehr: Von oben oder aus den Augen ist
  // _Menü → Ansicht_ des Kerns (Plan H).
  for (const id of ['haunt:view', 'haunt:flat'])
    expect(world.menu().some((row: { id: string }) => row.id === id)).toBe(false);
  expect(rounds[0]!.sub).toBe(HOST_BUSY);
  rounds[0]!.run!(null);
  expect(ctx.notify).toHaveBeenCalledWith(HOST_BUSY);
  expect(ctx.menu.toggle).not.toHaveBeenCalled();
});

test('the headset menu names the real round and offers its abort instead of a second practice start', () => {
  const world = replay();
  world.context = {
    ...election('vr'),
    notify: jest.fn(),
    menu: { toggle: jest.fn() },
    renderer: { xr: { isPresenting: true } },
  };
  world.state.phase = 'running';
  world.state.crew.options.test = false;
  world.state.crew.simulation = false;
  const ids = world.menu().map((row) => row.id);
  const status = world.menu().find((row) => row.id === 'haunt:status')!;
  expect(status.label).toBe('Jetzt: Echte Runde');
  // „Übungsrunde" und „abbrechen" führten beide in die Übung — nur einer bleibt.
  expect(ids).toContain('haunt:stop');
  expect(ids).not.toContain('haunt:train');
  // Die Einstellungen stehen nicht mehr zwischen den Starts, sondern darunter.
  expect(ids).not.toContain('haunt:light');
  const settings = world.menu().find((row) => row.id === 'haunt:settings') as unknown as {
    children: Array<{ id: string }>;
  };
  expect(settings.children.map((row) => row.id)).toContain('haunt:light');
});

test('returning to the station menu cancels a queued solo bot round', () => {
  const world = replay();
  const ctx = {
    ...election('vr'),
    notify: jest.fn(),
    menu: { toggle: jest.fn() },
    renderer: { xr: { isPresenting: false } },
  };
  world.context = ctx;
  world.requestBotRound(ctx);
  expect(world.pendingBotRound).toBe(true);
  expect(world.flatTechnician).toBe(true);
  world.menu().find((entry) => entry.id === 'haunt:roles')!.run!(null);
  expect(world.pendingBotRound).toBe(false);
  expect(world.flatTechnician).toBe(false);
});

test('safe bot rounds run the 2D technician bot without reading the observer camera or damaging the suit', () => {
  const world = replay();
  world.state.crew.options.test = true;
  world.state.crew.simulation = true;
  world.state.crew.hp = 1;
  // Absichtlich kein brauchbares Gestell: Die freie Kamera des Zuschauers
  // darf nie zur Figur der Vorführung werden.
  const getHeadPosition = jest.fn(() => {
    throw new Error('Observer is not the player');
  });
  const ctx = { ...kernelCtx('vr'), rig: { getHeadPosition } };
  world.stepKernel(0.1, ctx);
  expect(getHeadPosition).not.toHaveBeenCalled();
  const kernel = world.kernel!;
  expect(kernel.botActive).toBe(true);
  expect(world.state.monsterOn).toBe(true);
  expect(world.state.crew.hp).toBe(3);
  // Der Techniker aus Zahlen fängt in der Zentrale an — wie auf dem Telefon.
  expect(kernel.pose.x).toBeCloseTo(COMMAND_HOME.x, 0);
  expect(kernel.pose.z).toBeCloseTo(COMMAND_HOME.z, 0);
  // Ohne Vorführung nimmt der Mensch den Stock wieder.
  world.state.crew.simulation = false;
  world.stepKernel(0.1, kernelCtx('vr'));
  expect(kernel.botActive).toBe(false);
});

test('simulation perception reads the bot position and ignores the observer rig', () => {
  const world = replay();
  world.state.crew.options.test = true;
  world.state.crew.simulation = true;
  // Zwei Meter vor dem Techniker aus Zahlen, in der Cafeteria (seit dem
  // 1-m-Gitter ist der Raum vor der Zentrale zwanzig Meter breit):
  // Berührungsnähe (`monsterSight.CLOSE_SIGHT`), gesehen also auch ohne
  // eine einzige Lampe. Was die Runde dazu meldet, sagt die Welt an — hier
  // ins Leere.
  world.state.monster = { x: 0, z: -37 };
  Object.assign(world, { announce: jest.fn() });
  const getHeadPosition = jest.fn(() => {
    throw new Error('Observer is not the player');
  });
  const ctx = { ...kernelCtx('vr'), rig: { getHeadPosition } };
  world.context = ctx;
  world.stepKernel(0.1, ctx);
  expect(world.kernel!.place({ x: 0, z: -39 })).toBe(true);
  world.stepKernel(0.1, ctx);
  world.stepKernel(0.1, ctx);
  expect(getHeadPosition).not.toHaveBeenCalled();
  // Die Alarmleiter im Stand (`threat.ts`) ist die der Runde: Was das Monster
  // gehört oder gesehen hat, zeigt auf den Techniker aus Zahlen — nicht auf
  // das Gestell des Zuschauers.
  const bot = world.kernel!.pose;
  const threat = world.state.crew.threat;
  expect(threat).toBe(world.kernel!.round.threat);
  expect(threat.awareness).toBeGreaterThan(0);
  const noticed = threat.target ?? threat.facing;
  expect(noticed).not.toBeNull();
  expect(Math.hypot(noticed!.x - bot.x, noticed!.z - bot.z)).toBeLessThan(1);
  expect(world.state.crew.hp).toBe(3);
});

/**
 * **Der Zuschauer sieht den Techniker, der in 2D spielt.** Seine Pose steckt
 * seit `STATION_PROTOCOL` 7 im Stand (`HauntState.technician`) — die 3D-Welt
 * zeichnete sie nie, und am Fernseher sah man eine leere Station, in der
 * Türen von selbst aufgingen (Paket U4).
 */
test('der Techniker aus dem Stand bekommt einen Körper — und verschwindet im Schutzschrank', () => {
  const world = replay();
  // Ohne Pose kein Körper: Wer im Headset spielt, hat einen Avatar.
  world.showTechnician(FRAME);
  expect(world.technicianArt).toBeNull();

  world.state.technician = { x: 4, z: 7, yaw: Math.PI / 2, moving: true };
  world.showTechnician(FRAME);
  const actor = world.technicianArt!;
  const body = actor.root;
  expect(actor.kind).toBe('crew');
  // Ohne WebGL bleibt es beim gebauten Crewmate — in Jest ist das der Normalfall.
  expect(actor.built).toBe(true);
  expect(body.parent).toBe(world.live);
  expect(body.visible).toBe(true);
  expect([body.position.x, body.position.z]).toEqual([4, 7]);
  // Der Crewmate schaut nach +z, die Welt rechnet Blicke nach -z.
  expect(body.rotation.y).toBeCloseTo(Math.PI / 2 + Math.PI);

  world.state.crew.hidden = 'raum-1';
  world.showTechnician(FRAME);
  expect(world.technicianArt).toBe(actor);
  expect(body.visible).toBe(false);
});

/**
 * **Der Ghost in der Welt** (Paket M3c). Er ist Weltgeometrie und kein
 * Bildschirmzeichen — nur deshalb steht er auch in der Brille. Sichtbar wird
 * er erst, wenn der Techniker das echte Monster **nicht** mehr sieht, und er
 * verschwindet mit der Lebenszeit des Markers.
 */
test('der Ghost des Monsters erscheint nach dem Sichtverlust und verfällt mit der TTL', () => {
  const world = replay();
  world.state.monsterOn = true;
  world.state.time = 100;
  world.state.ghosts.monster = { x: 3, z: -4, yaw: 1, since: 100 };
  // Gerade eben gesehen: kein Doppelgänger neben dem echten Vieh.
  world.paintGhost(FRAME);
  expect(world.ghostArt?.root.visible ?? false).toBe(false);
  // Eine Sekunde später ist es eine Erinnerung.
  world.state.time = 100 + GHOST_LIVE + 0.5;
  world.paintGhost(FRAME);
  expect(world.ghostArt!.root.visible).toBe(true);
  expect(world.ghostArt!.root.position.x).toBe(3);
  expect(world.ghostArt!.root.position.z).toBe(-4);
  expect(world.ghostArt!.root.rotation.y).toBe(1);
  // Und mit `GHOST_TTL` ist sie weg.
  world.state.time = 100 + GHOST_TTL;
  world.paintGhost(FRAME);
  expect(world.ghostArt!.root.visible).toBe(false);
});

test('die Blutflecken liegen flach auf dem Boden und werden wiederverwendet', () => {
  const world = replay();
  world.state.time = 50;
  world.state.blood = [
    { x: 1, z: 2, since: 49 },
    { x: 2.5, z: 2, since: 50 },
  ];
  world.paintTrail();
  const spots = world.bloodArt!.children as THREE.Mesh[];
  expect(spots).toHaveLength(2);
  expect(spots.every((spot) => spot.visible)).toBe(true);
  // Flach: um die x-Achse gekippt, ein Fingerbreit über dem Blech.
  expect(spots[0]!.rotation.x).toBeCloseTo(-Math.PI / 2, 6);
  expect(spots[0]!.position.y).toBeGreaterThan(0);
  expect(spots[0]!.position.y).toBeLessThan(0.05);
  // Der ältere ist blasser als der frische (`dropAlpha`).
  const opacity = (i: number): number => (spots[i]!.material as THREE.MeshBasicMaterial).opacity;
  expect(opacity(0)).toBeLessThan(opacity(1));
  expect(dropAlpha(world.state.blood![0]!, 50)).toBeLessThan(1);
  // Eine kürzere Spur wirft die Scheiben nicht weg, sie schaltet sie ab.
  world.state.blood = [{ x: 1, z: 2, since: 50 }];
  world.paintTrail();
  expect(world.bloodArt!.children).toHaveLength(2);
  expect((world.bloodArt!.children[1] as THREE.Mesh).visible).toBe(false);
});

/**
 * **Die Bücher reisen mit** — die Naht zwischen Welt und Runde, mit dem
 * echten Code auf beiden Seiten: Die Welt packt ihre Buchführung ein
 * (`books`), eine Runde übernimmt Stand und Buchführung (`FlatRound`,
 * `resume`), und die Welt nimmt beides wieder entgegen (`loadBooks`). Das ist
 * derselbe Weg wie eine Übergabe zwischen Gastgebern, nur ohne Netz; was
 * dabei verloren ginge, verlöre ein Spieler beim Wechsel des Gastgebers.
 */
describe('Die Bücher zwischen Welt und Runde', () => {
  /**
   * Eine Welt mitten in einer Runde: Uhr, Anzug, Gepäck, Türen, Licht,
   * Monster — und ein Kern, der sie rechnet, mit Riegeln, Lampen, Spuk und
   * Wunde in seinen Büchern.
   */
  function midRound(): ReplayWorld {
    const world = replay();
    const state = world.state;
    state.time = 96.5;
    state.crew.hp = 2;
    state.crew.inventory.push('radar');
    state.shut = ['d1'];
    state.lit = ['r1'];
    state.done = ['t0'];
    state.monster = { x: 12, z: -30 };
    state.blood = [{ x: 6, z: -9, since: 90 }];
    world.hostId = 'local';
    world.loadBooks({
      locks: { chosen: 'd1', until: 104, slams: [], pries: [], cooling: [] },
      lamps: { on: [{ id: 'r1', until: 130, warned: false }] },
      spook: { room: 'r3', since: 1.5, rest: 4 },
      trail: { until: 120, from: null, walked: 0 },
      memory: { sightings: [], searched: [] },
    });
    world.stepKernel(0, kernelCtx('vr', { x: 6.5, z: -9.5 }));
    return world;
  }

  it('behält Zeit, Sauerstoff, Anzug, Inventar, Türen, Licht und das Monster', () => {
    const world = midRound();
    const before = world.state;
    // Die Bücher, die beim Umschalten warteten, sind die des Kerns geworden.
    expect(world.kernel!.round.locks.chosen).toBe('d1');
    expect(world.locks).toBe(world.kernel!.round.locks);
    // --- Welt → Runde: die laufende Runde übernehmen statt eine neue würfeln.
    const books = world.books();
    expect(books.spook.room).toBe('r3');
    expect(books.trail.until).toBe(120);
    before.technician = { x: 6.5, z: -9.5, yaw: 1.2, moving: false };
    const round = new FlatRound(before.seed, {
      resume: {
        state: before,
        locks: books.locks,
        spook: books.spook,
        trail: books.trail,
        memory: books.memory,
      },
    });
    expect(round.state()).toBe(before);
    expect(round.player.x).toBeCloseTo(6.5);
    expect(round.monster.x).toBeCloseTo(12);

    // --- Ein Bild, damit die Runde wirklich gelaufen ist.
    round.step(1 / 30, { x: 0, z: 0, sprint: false });

    // --- Runde → Welt: Stand und Buchführung zurück in die Welt.
    const carried = round.books();
    world.state = round.state();
    world.loadBooks({ ...carried, lamps: world.lampBook });

    expect(world.state.time).toBeGreaterThanOrEqual(96.5);
    // Der Sauerstoff *ist* die Uhr (`rules/roundRules.oxygenLeft`) — eine Runde,
    // die beim Wechsel auf null zurückspränge, gäbe ihn geschenkt.
    expect(world.state.time).toBeLessThan(97.5);
    expect(world.state.crew.hp).toBe(2);
    expect(world.state.crew.inventory).toContain('radar');
    expect(world.state.shut).toEqual(['d1']);
    expect(world.state.lit).toEqual(['r1']);
    expect(world.state.monster).toEqual(expect.objectContaining({ x: expect.any(Number) }));
    expect(world.locks.chosen).toBe('d1');
    expect(world.locks.until).toBe(104);
    // Die Lampe brennt weiter mit ihrer Restzeit — sonst ginge beim Umschalten
    // von selbst das Licht an oder aus.
    expect(world.lampBook.on).toEqual([{ id: 'r1', until: 130, warned: false }]);
    expect(carried.trail.until).toBe(120);
    // Der nächste Kern rechnet mit genau diesen Büchern weiter — und mit
    // derselben Blutspur, nicht mit einer zweiten (`rules/blood.ts`).
    world.stepKernel(0, kernelCtx('vr', { x: 6.5, z: -9.5 }));
    expect(world.kernel!.round.books().trail.until).toBe(120);
    expect(world.kernel!.round.books().locks.chosen).toBe('d1');
    expect(world.state.blood).toBe(round.state().blood);
  });

  it('reicht das Gedächtnis des Monsters weiter, statt es zu vergessen', () => {
    const world = midRound();
    const graph = stationGraph(world.spec);
    const room = graph.spaces[3]!;
    const centre = graph.centre(room);
    // Was der alte Gastgeber wusste, kommt als Buch (`net.packMemory`) und
    // wird zum Gedächtnis des nächsten Kerns (`FlatRound.loadBooks`).
    world.loadBooks({
      ...world.books(),
      memory: {
        sightings: [{ x: centre.x, z: centre.z, time: 90, sprinting: false }],
        searched: [],
      },
    });
    world.stepKernel(0, kernelCtx('vr', { x: 6.5, z: -9.5 }));
    const books = world.books();
    expect(books.memory.sightings).toHaveLength(1);
    expect(books.memory.sightings[0]).toEqual(expect.objectContaining({ time: 90 }));
    // Und ein frisches Gedächtnis nimmt die Spur wieder an, so wie der Kern es tat.
    const next = new MonsterMemory(graph, () => []);
    expect(next.mostLikely()).not.toBe(room);
    next.seen(room, centre, 90);
    expect(next.mostLikely()).toBe(room);
  });
});

/**
 * **Die Übergabe beim Wechsel des Gastgebers** — und die Sperre dagegen, dass
 * für einen Augenblick zwei dieselbe Runde rechnen.
 */
describe('Der Wechsel des Gastgebers', () => {
  it('schickt dem Nachfolger den Stand samt Buchführung, bevor es loslässt', () => {
    const world = replay();
    world.state.phase = 'running';
    world.hostId = 'local';
    world.stepKernel(0.05, kernelCtx('vr'));
    world.locks.chosen = 'd1';
    const ctx = election('desktop', true);
    world.context = ctx;
    world.refreshHost(ctx);
    expect(world.hostId).toBe('remote');
    const sent = ctx.net.emit.mock.calls.map(([, message]) => message);
    const handover = sent.map((one) => readHandover(one)).find((one) => one);
    expect(handover?.to).toBe('remote');
    // **Erst einpacken, dann loslassen**: `releaseMonster` wirft das Gedächtnis
    // weg, und danach eingepackt wäre die Buchführung leer.
    expect(handover?.books.locks.chosen).toBe('d1');
  });

  it('lässt den neuen Gastgeber warten, statt sofort mitzurechnen', () => {
    const world = replay();
    world.state.phase = 'running';
    world.hostId = 'remote';
    const ctx = election('vr');
    world.context = ctx;
    world.refreshHost(ctx);
    expect(world.hostId).toBe('local');
    expect(world.waitingHandover).toBe(true);
    // Die Übergabe beendet das Warten — und bringt die Buchführung mit.
    const books: HauntBooks = {
      locks: { chosen: 'd2', until: 30, slams: [], pries: [], cooling: [] },
      lamps: { on: [{ id: 'r1', until: 40, warned: false }] },
      spook: { room: 'r2', since: 1, rest: 2 },
      trail: { until: 50, from: null, walked: 0 },
      memory: { sightings: [], searched: [] },
    };
    world.takeHandover({ ...world.state, time: 42 }, books);
    expect(world.waitingHandover).toBe(false);
    expect(world.locks.chosen).toBe('d2');
    expect(world.lampBook.on).toHaveLength(1);
    expect(world.state.time).toBe(42);
  });

  it('verwirft einen Stand, der hinter dem eigenen zurückliegt', () => {
    const world = replay();
    world.state.phase = 'running';
    world.state.time = 40;
    world.hostId = 'remote';
    const ctx = election('desktop', true);
    world.context = ctx;
    // Die letzte Ansage des alten Gastgebers, noch unterwegs: Sie würde die
    // Uhr zurückdrehen und eine reparierte Konsole wieder aufmachen.
    const late = { ...snapshot(world.spec.seed), time: 12, done: [] };
    world.receive(JSON.parse(JSON.stringify(stateMessage(late))), 'remote');
    expect(world.state.time).toBe(40);
    // Ein neuerer Stand geht durch wie immer.
    const fresh = { ...snapshot(world.spec.seed), time: 41 };
    world.receive(JSON.parse(JSON.stringify(stateMessage(fresh))), 'remote');
    expect(world.state.time).toBe(41);
  });
});

/**
 * **Der Befund des Besitzers**: „Der Knopf ‚Mission starten' scheint die
 * Mission nicht zu starten." Er stimmte für jedes Gerät, das nicht schon am
 * Stock stand — also für jedes Telefon und jeden Desktop, der die Runde im
 * Aufbau verteilt hatte: `startMission` fragte `ctx.role`, fand `desktop` und
 * stieg wortlos aus (`rules/worldMenu.shipStart`).
 */
test('the setup page start button puts a desktop on the stick and then really starts the round', () => {
  const world = setupStarter();
  const ctx = starterCtx();
  world.context = ctx;
  world.startRound('play', ctx);
  // Kein „geht nicht" mehr — der Aufbau ist der Weg an den Stock.
  expect(world.flatTechnician).toBe(true);
  expect(world.pendingStart).toBe('play');
  expect(ctx.notify).not.toHaveBeenCalled();
  // Und das, was `update` im nächsten Bild tut: Die Rolle steht am Stock
  // (`ctx.role === 'vr'`), und dieselbe Absicht läuft noch einmal durch.
  world.pendingStart = null;
  const stick = { ...ctx, role: 'vr' };
  world.context = stick;
  // Das Haus selbst baut der Nachbau nicht auf (`newRound` braucht Szene und
  // Spieler); geprüft wird, dass die Mission jetzt wirklich losgeht.
  Object.assign(world, { newRound: jest.fn(), announce: jest.fn() });
  world.startRound('play', stick);
  expect(world.state.phase).toBe('running');
  expect(world.state.monsterOn).toBe(true);
  expect(stick.menu.toggle).toHaveBeenCalledWith(false);
});

test('a seat in the centre is told that the ship round has nobody in the suit', () => {
  const world = setupStarter();
  const ctx = starterCtx();
  world.context = ctx;
  world.lobbyChoice = { intent: 'play', me: 'red' };
  world.startRound('play', ctx);
  expect(world.flatTechnician).toBe(false);
  expect(world.pendingStart).toBeNull();
  expect(ctx.notify).toHaveBeenCalledWith(SHIP_NEEDS_TECHNICIAN);
});

test('the start is refused while another technician wears the suit — with a reason', () => {
  const world = setupStarter();
  const ctx = starterCtx(true);
  world.context = ctx;
  world.startRound('play', ctx);
  expect(world.flatTechnician).toBe(false);
  expect(ctx.notify).toHaveBeenCalledWith(SHIP_OCCUPIED);
});

/**
 * **Die Zentrale startet die Runde der Brille.** Steckt der Techniker in der
 * Brille, ist er der Gastgeber — und bis hierher hieß das für jedes Telefon:
 * Tafel nur für sich, Startknopf gesperrt. Jetzt gehen Tafel und Start als
 * Wunsch zu ihm (`net.setupMessage`, `net.startMessage`), er wendet sie an,
 * und mit dem nächsten Stand steht die Tafel überall gleich.
 */
describe('Die Tafel und der Start über die Leitung', () => {
  /** Ein Telefon in der Zentrale, eine Brille im Raum, die den Anzug trägt. */
  function phone(): { world: ReplayWorld; ctx: ReturnType<typeof starterCtx> } {
    const world = setupStarter();
    world.hostId = 'remote';
    world.lobbyChoice = { intent: 'play', me: 'red' };
    const ctx = starterCtx(true);
    world.context = ctx;
    return { world, ctx };
  }

  /** Und die Brille selbst: Gastgeber, ein Telefon im Raum. */
  function headset(): { world: ReplayWorld; ctx: ReturnType<typeof starterCtx> } {
    const world = setupStarter();
    const ctx = {
      ...starterCtx(),
      role: 'vr' as const,
      renderer: { xr: { isPresenting: true } },
    };
    ctx.net.peers.set('phone', { id: 'phone', world: 'haunting', role: 'handheld' });
    world.context = ctx;
    Object.assign(world, { newRound: jest.fn(), announce: jest.fn() });
    return { world, ctx };
  }

  it('schickt jeden Tipp auf die Tafel an den Gastgeber', () => {
    const { world, ctx } = phone();
    const next = withPower(withWho(world.setup, 'red', 'human'), 'red', 'panel', true);
    world.applySetup(next);
    const sent = ctx.net.emit.mock.calls.map(([, message]) => readSetupMessage(message));
    expect(sent.filter((one) => one)).toEqual([next]);
    // Und was vom Netz kam, geht nicht wieder hin.
    ctx.net.emit.mockClear();
    world.applySetup(withWho(next, 'yellow', 'bot'), false);
    expect(ctx.net.emit).not.toHaveBeenCalled();
  });

  it('startet bei der Brille statt in SHIP_OCCUPIED zu enden', () => {
    const { world, ctx } = phone();
    world.startRound('play', ctx);
    expect(world.flatTechnician).toBe(false);
    expect(world.pendingStart).toBeNull();
    expect(ctx.notify).not.toHaveBeenCalledWith(SHIP_OCCUPIED);
    expect(ctx.notify).toHaveBeenCalledWith(START_SENT);
    const starts = ctx.net.emit.mock.calls
      .map(([, message]) => readStart(message))
      .filter((one) => one);
    expect(starts).toHaveLength(1);
    expect(starts[0]!.intent).toBe('play');
    // Die Tafel geht mit — mit dem Platz, den dieses Telefon sich genommen hat.
    expect(starts[0]!.setup.seats.technician.who).toBe('human');
  });

  it('übernimmt beim Gastgeber die Tafel eines Telefons — und lässt der Brille den Anzug', () => {
    const { world } = headset();
    const wish = withWho(withWho(defaultSetup(), 'red', 'human'), 'technician', 'bot');
    world.receive(JSON.parse(JSON.stringify(setupMessage(wish))), 'phone');
    expect(world.setup.seats.red.who).toBe('human');
    expect(world.setup.seats.technician.who).toBe('human');
  });

  it('fängt beim Gastgeber auf einen Startwunsch an — aber nicht mitten in der Runde', () => {
    const { world, ctx } = headset();
    const wish = withWho(defaultSetup(), 'monster', 'off');
    world.receive(JSON.parse(JSON.stringify(startMessage('train', wish))), 'phone');
    expect(world.state.phase).toBe('running');
    expect(world.setup.seats.monster.who).toBe('off');
    expect(ctx.menu.toggle).toHaveBeenCalledWith(false);
    // Läuft die Runde, bricht ein zweiter Wunsch sie nicht ab.
    ctx.notify.mockClear();
    world.receive(JSON.parse(JSON.stringify(startMessage('play', defaultSetup()))), 'phone');
    expect(world.setup.seats.monster.who).toBe('off');
    expect(ctx.notify).toHaveBeenCalledWith(ROUND_RUNNING);
  });

  it('nimmt die Tafel des Gastgebers aus dem Stand — außer gleich nach dem eigenen Tipp', () => {
    const { world, ctx } = phone();
    world.state.phase = 'running';
    const theirs = withWho(defaultSetup(), 'blue', 'bot');
    const wire = JSON.parse(JSON.stringify(stateMessage({ ...world.state, time: 1 }, theirs)));
    world.receive(wire, 'remote');
    expect(world.setup).toEqual(theirs);
    expect(ctx.refreshWorldMenu).toHaveBeenCalledTimes(1);
    // Derselbe Stand noch einmal baut keine Anzeige neu.
    world.receive(wire, 'remote');
    expect(ctx.refreshWorldMenu).toHaveBeenCalledTimes(1);
    // Ein eigener Tipp gilt, bis er vom Gastgeber zurückkommt.
    const mine = withWho(theirs, 'yellow', 'human');
    world.applySetup(mine);
    world.receive(wire, 'remote');
    expect(world.setup).toEqual(mine);
    // Von einem, der nicht der Gastgeber ist, kommt keine Tafel.
    world.setupTouchedAt = -Infinity;
    world.receive(wire, 'someone');
    expect(world.setup).toEqual(mine);
  });
});
