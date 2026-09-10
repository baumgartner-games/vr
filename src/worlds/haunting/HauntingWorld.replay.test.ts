/** @jest-environment jsdom */
import * as THREE from 'three';
import { HauntingWorld } from './HauntingWorld';
import { generateHouse, type HouseSpec } from './house';
import { freshCrew, stationOptions } from './mission';
import { AutomaticDoors } from './automaticDoors';
import { DEFAULT_TUNING } from './botTuning';
import { DEFAULT_LIGHTING } from './botLighting';
import { Rng } from './rng';
import { defaultLobby, type LobbyChoice } from './rules/lobby';
import { StationTravelPlan } from './stationTravelPlan';
import { VentNet } from './vents/ventGraph';
import { VentTravel } from './vents/ventTravel';
import type { HauntState } from './net';
import { freshGhosts } from './rules/ghosts';
import { HOST_BUSY } from './rules/worldMenu';
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
  stepCrew(dt: number, ctx: unknown): void;
  npcTarget(target: THREE.Vector3): THREE.Vector3 | null;
  monster: unknown;
  monsterArt: THREE.Object3D | null;
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
    loud: [],
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
    routineDice: new Rng(0x4d4f4e53),
    beacons: [],
    botLighting: { ...DEFAULT_LIGHTING },
    simulationSpeed: 1,
    monster: null,
    monsterArt: null,
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
  });
  return world;
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
  world.lobbyChoice = { intent: 'play', view: '2d' };
  world.hostId = 'remote';
  const rounds = world.menu().filter((row) => row.id.startsWith('haunt:'));
  expect(rounds.slice(0, 3).map((row) => row.id)).toEqual([
    'haunt:start',
    'haunt:test',
    'haunt:bot-round',
  ]);
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
