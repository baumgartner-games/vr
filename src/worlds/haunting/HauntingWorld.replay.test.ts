/** @jest-environment jsdom */
import * as THREE from 'three';
import { HauntingWorld } from './HauntingWorld';
import { generateHouse, type HouseSpec } from './house';
import { freshCrew, freshStamina, stationOptions } from './mission';
import { AutomaticDoors } from './automaticDoors';
import { DEFAULT_TUNING } from './botTuning';
import { DEFAULT_LIGHTING } from './botLighting';
import { Rng } from './rng';
import { defaultLobby, type LobbyChoice } from './rules/lobby';
import { StationTravelPlan } from './stationTravelPlan';
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
import { MonsterMemory } from './monster/monsterMemory';
import { stationGraph } from './roomGraph';
import { dropAlpha, freshTrail, type Trail } from './rules/blood';
import { freshLocks, type DoorLocks } from './rules/doorLocks';
import { freshLamps, type Lamps } from './rules/lamps';
import { freshSpook, type Spook } from './haunt';
import { freshGhosts, GHOST_LIVE, GHOST_TTL } from './rules/ghosts';
import { HOST_BUSY, SHIP_NEEDS_TECHNICIAN, SHIP_OCCUPIED } from './rules/worldMenu';
import { defaultSetup, withPower, withWho, type RoundSetup } from './rules/roundSetup';
import type { Intent } from './rules/lobby';
import type { GridPlan } from '../grid/gridPlan';
import type { MenuEntry } from '../../ui/menu';

jest.mock('../grid/GridWorld', () => ({ GridWorld: class {} }));
jest.mock('./haunting.css', () => ({}));
jest.mock('./stationDashboard.css', () => ({}));
jest.mock('./monster/monster.css', () => ({}));

interface ReplayWorld {
  spec: HouseSpec;
  state: HauntState;
  grid: { replaceWith: jest.Mock<void, [GridPlan]> };
  automaticDoors: AutomaticDoors;
  travelPlan: StationTravelPlan;
  buildHouse: jest.Mock;
  parkDrone: jest.Mock;
  blob: THREE.Object3D | null;
  live: THREE.Group;
  hostId: string;
  context: unknown;
  adopt(state: HauntState): void;
  applyBlob(): void;
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
  stepCrew(dt: number, ctx: unknown): void;
  npcTarget(target: THREE.Vector3): THREE.Vector3 | null;
  monster: unknown;
  monsterArt: THREE.Object3D | null;
  technicianArt: THREE.Object3D | null;
  showTechnician(): void;
  /** Die Blutspur und ihre Flecken auf dem Boden (`rules/blood.ts`). */
  blood: Trail;
  /** Das Gedächtnis des Monsters (`monster/monsterMemory.ts`) — beim Gastgeber. */
  brain: MonsterMemory | null;
  readonly waitingHandover: boolean;
  /** Die Buchführung, die nur beim Gastgeber liegt — und beim Wechsel mitreisen muss. */
  locks: DoorLocks;
  lampBook: Lamps;
  spook: Spook;
  handoverUntil: number;
  books(): HauntBooks;
  loadBooks(books: HauntBooks): void;
  takeHandover(state: HauntState, books: HauntBooks): void;
  stale(state: HauntState): boolean;
  bloodArt: THREE.Group | null;
  paintTrail(): void;
  /** Und die halbdurchsichtige Kopie an der zuletzt gesehenen Stelle (`rules/ghosts.ts`). */
  ghostArt: THREE.Object3D | null;
  paintGhost(): void;
  director: { clear: jest.Mock; spawn: jest.Mock };
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
    travelPlan: new StationTravelPlan(),
    buildHouse: jest.fn(),
    parkDrone: jest.fn(),
    live: new THREE.Group(),
    blob: null,
    hostId: 'remote',
    context: { net: { localId: 'local' } },
    technicians: new Map(),
    director: { clear: jest.fn(), spawn: jest.fn(() => null) },
    // Felder, die sonst der Konstruktor setzt — der Prototyp-Nachbau hat keinen.
    tuning: DEFAULT_TUNING,
    // Die Puste des Technikers (`mission.ts`): `stepCrew` rechnet sie in jedem
    // Bild weiter und setzt daraus `PlayerRig.sprintScale`.
    stamina: freshStamina(),
    // Und die Blutspur (`rules/blood.ts`), die `stepCrew` in jedem Bild
    // fortschreibt — auch wenn niemand blutet.
    blood: freshTrail(),
    // Die Buchführung des Gastgebers (`net.HauntBooks`): Riegel, Lampen, Spuk.
    // Sie geht beim Wechsel des Gastgebers als Übergabe über die Leitung und
    // beim Ansichtswechsel von der einen Runde in die andere.
    locks: freshLocks(),
    lampBook: freshLamps(),
    spook: freshSpook(),
    brain: null,
    handoverUntil: 0,
    repaired: 0,
    routineDice: new Rng(0x4d4f4e53),
    beacons: [],
    botLighting: { ...DEFAULT_LIGHTING },
    simulationSpeed: 1,
    monster: null,
    monsterArt: null,
    technicianArt: null,
    flatTechnician: false,
    pendingBotRound: false,
    vents: vents,
    ventRide: new VentTravel(vents),
    npcRide: null,
    ventArt: null,
    monsterDriver: null,
    // Die Wahl der Lobby (`rules/lobby.ts`) — ohne sie hat der Nachbau keine
    // Ansicht, und `flatWanted` liest sie aus.
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
 * die Tafel steht auf „Techniker: Mensch", die Ansicht auf dem Schiff.
 */
function setupStarter(): ReplayWorld {
  const world = replay();
  Object.assign(world, {
    claims: new Map(),
    seatedAt: 0,
    hostId: 'local',
    setup: defaultSetup(),
    pendingStart: null,
    lobbyChoice: { intent: 'play', view: '3d', me: 'technician' },
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
  world.applyBlob();
  const old = world.blob!;
  expect(old.name).toBe('creature-stalker');
  const next = snapshot();
  next.crew.options.monster = 'sentinel';
  world.adopt(next);
  world.applyBlob();
  expect(world.blob?.uuid).not.toBe(old.uuid);
  expect(world.blob?.name).toBe('creature-sentinel');
  expect(old.parent).toBeNull();
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

test('handing the host role to another technician stops the old local NPC without deleting the round snapshot', () => {
  const world = replay();
  world.hostId = 'local';
  world.monster = {};
  world.monsterArt = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  const disposed = jest.fn();
  geometry.addEventListener('dispose', disposed);
  world.monsterArt.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
  world.live.add(world.monsterArt);
  const model = world.monsterArt;
  const at = world.state.monster;
  const ctx = election('desktop', true);
  world.context = ctx;
  world.refreshHost(ctx);
  expect(world.hostId).toBe('remote');
  expect(world.director.clear).toHaveBeenCalledTimes(1);
  expect(world.monster).toBeNull();
  expect(model.parent).toBeNull();
  expect(disposed).toHaveBeenCalledTimes(1);
  expect(world.state.monster).toBe(at);
  expect(world.state.monsterOn).toBe(true);
});

test('taking over an abandoned running mission recreates its monster at the last shared position', () => {
  const world = replay();
  const ctx = election('vr');
  world.context = ctx;
  world.refreshHost(ctx);
  expect(world.hostId).toBe('local');
  expect(world.director.spawn).toHaveBeenCalledWith(
    expect.objectContaining({ at: new THREE.Vector3(1, 0, 2) }),
  );
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
  world.applyBlob();
  world.hostId = 'local';
  world.state.monster = null;
  world.applyBlob();
  expect(world.blob?.visible).toBe(false);
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
  // Die Ansicht „2D von oben" darf in der Brille nichts umleiten, und ein
  // fremder Gastgeber darf den Eintrag nicht stumm machen (`rules/worldMenu.ts`).
  world.lobbyChoice = { intent: 'play', view: '2d', me: 'technician' };
  world.hostId = 'remote';
  const rounds = world.menu().filter((row) => row.id.startsWith('haunt:'));
  // Dieselben drei Absichten wie im Van und im Optionsmenü der 2D-Welt
  // (`rules/lobby.ts`), in derselben Reihenfolge.
  expect(rounds.slice(0, 3).map((row) => row.id)).toEqual([
    'haunt:play',
    'haunt:watch',
    'haunt:train',
  ]);
  // Die Ansicht steht als eigener Eintrag daneben und heißt nicht mehr
  // „2D-Welt von oben: an/aus"; in der Brille ist sie fest.
  const view = world.menu().find((row: { id: string }) => row.id === 'haunt:view')!;
  expect(view.label).toContain('3D Schiff');
  expect(world.menu().some((row: { id: string }) => row.id === 'haunt:flat')).toBe(false);
  expect(rounds[0]!.sub).toBe(HOST_BUSY);
  rounds[0]!.run!(null);
  expect(ctx.notify).toHaveBeenCalledWith(HOST_BUSY);
  expect(ctx.menu.toggle).not.toHaveBeenCalled();
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

test('safe bot rounds spawn a real patrol without reading the observer camera or damaging the suit', () => {
  const world = replay();
  world.state.crew.options.test = true;
  world.state.crew.simulation = true;
  world.state.crew.hp = 1;
  // Deliberately no rig: the free camera must never become the demo's perceived player.
  world.stepCrew(0.1, { role: 'vr' });
  expect(world.director.spawn).toHaveBeenCalledTimes(1);
  expect(world.state.monsterOn).toBe(true);
  expect(world.state.crew.hp).toBe(3);
  expect(world.npcTarget(new THREE.Vector3())).not.toBeNull();
  world.state.crew.simulation = false;
  expect(world.npcTarget(new THREE.Vector3())).toBeNull();
});

test('simulation perception reads the bot position and ignores the observer rig', () => {
  const world = replay();
  const bot = { x: 0, z: -40, yaw: 0 };
  world.state.crew.options.test = true;
  world.state.crew.simulation = true;
  world.state.monster = { x: 0, z: -37 };
  Object.assign(world, {
    experience: { botPose: bot },
    hearing: new Map(),
    sightTimer: 1,
    monsterSeesPlayer: true,
  });
  const getHeadPosition = jest.fn(() => {
    throw new Error('Observer is not the player');
  });
  world.stepCrew(0.1, { role: 'vr', rig: { getHeadPosition } });
  expect(getHeadPosition).not.toHaveBeenCalled();
  expect(world.state.crew.threat.target).toEqual({ x: bot.x, z: bot.z });
  expect(world.state.crew.hp).toBe(3);
});

/**
 * **Der Zuschauer sieht den Techniker, der in 2D spielt.** Seine Pose steckt
 * seit `STATION_PROTOCOL` 7 im Stand (`HauntState.technician`) — die 3D-Welt
 * zeichnete sie nie, und am Fernseher sah man eine leere Station, in der
 * Türen von selbst aufgingen (Paket U4).
 */
test('der 2D-Techniker bekommt einen Körper — und verschwindet im Schutzschrank', () => {
  const world = replay();
  // Ohne Pose kein Körper: Wer im Headset spielt, hat einen Avatar.
  world.showTechnician();
  expect(world.technicianArt).toBeNull();

  world.state.technician = { x: 4, z: 7, yaw: Math.PI / 2, moving: true };
  world.showTechnician();
  const body = world.technicianArt!;
  expect(body.parent).toBe(world.live);
  expect(body.visible).toBe(true);
  expect([body.position.x, body.position.z]).toEqual([4, 7]);
  // Der Crewmate schaut nach +z, die Welt rechnet Blicke nach -z.
  expect(body.rotation.y).toBeCloseTo(Math.PI / 2 + Math.PI);

  world.state.crew.hidden = 'raum-1';
  world.showTechnician();
  expect(world.technicianArt).toBe(body);
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
  world.paintGhost();
  expect(world.ghostArt?.visible ?? false).toBe(false);
  // Eine Sekunde später ist es eine Erinnerung.
  world.state.time = 100 + GHOST_LIVE + 0.5;
  world.paintGhost();
  expect(world.ghostArt!.visible).toBe(true);
  expect(world.ghostArt!.position.x).toBe(3);
  expect(world.ghostArt!.position.z).toBe(-4);
  expect(world.ghostArt!.rotation.y).toBe(1);
  // Und mit `GHOST_TTL` ist sie weg.
  world.state.time = 100 + GHOST_TTL;
  world.paintGhost();
  expect(world.ghostArt!.visible).toBe(false);
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
 * **Der Ansichtswechsel mitten in der Runde** (`HauntingWorld.switchView`).
 *
 * Geprüft wird die Naht, an der er hängt, und zwar mit dem echten Code auf
 * beiden Seiten: Die Welt packt ihre Buchführung ein (`books`), die 2D-Runde
 * übernimmt Stand und Buchführung (`FlatResume`), und die Welt nimmt beides
 * wieder entgegen (`loadBooks`). Was dabei verloren geht, ist genau das, was
 * ein Spieler beim Umschalten verlöre.
 */
describe('Ein Wechsel 3D → 2D → 3D', () => {
  /** Eine Welt mitten in einer Runde: Uhr, Anzug, Gepäck, Türen, Licht, Monster. */
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
    state.technician = { x: 6.5, z: -9.5, yaw: 1.2, moving: false };
    world.locks.chosen = 'd1';
    world.locks.until = 104;
    world.lampBook.on.push({ id: 'r1', until: 130, warned: false });
    world.spook = { room: 'r3', since: 1.5, rest: 4 };
    world.blood.until = 120;
    world.blood.drops.push({ x: 6, z: -9, since: 90 });
    state.blood = world.blood.drops;
    return world;
  }

  it('behält Zeit, Sauerstoff, Anzug, Inventar, Türen, Licht und das Monster', () => {
    const world = midRound();
    const before = world.state;
    // --- 3D → 2D: die laufende Runde übernehmen statt eine neue würfeln.
    const books = world.books();
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

    // --- Ein Bild 2D, damit die Runde wirklich gelaufen ist.
    round.step(1 / 30, { x: 0, z: 0, sprint: false });

    // --- 2D → 3D: Stand und Buchführung zurück in die Welt.
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
    expect(world.blood.until).toBe(120);
    // Eine Spur, nicht zwei (`rules/blood.ts`).
    expect(world.blood.drops).toBe(world.state.blood);
  });

  it('reicht das Gedächtnis des Monsters weiter, statt es zu vergessen', () => {
    const world = midRound();
    const graph = stationGraph(world.spec);
    const room = graph.spaces[3]!;
    const brain = new MonsterMemory(graph, () => []);
    brain.seen(room, graph.centre(room), 90);
    world.brain = brain;
    const books = world.books();
    expect(books.memory.sightings).toHaveLength(1);
    // Und andersherum: Ein frisches Gedächtnis nimmt die Spur wieder an.
    const next = new MonsterMemory(graph, () => []);
    expect(next.mostLikely()).not.toBe(room);
    world.brain = next;
    world.loadBooks(books);
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
  world.lobbyChoice = { intent: 'play', view: '3d', me: 'red' };
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
    world.lobbyChoice = { intent: 'play', view: '3d', me: 'red' };
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
