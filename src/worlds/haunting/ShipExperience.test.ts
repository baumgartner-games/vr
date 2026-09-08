/** @jest-environment jsdom */
import * as THREE from 'three';
import { PlayerRig } from '../../core/PlayerRig';
import { Pointer } from '../../core/Pointer';
import type { XRInput } from '../../core/XRInput';
import type { WorldContext } from '../../core/types';
import type { MenuEntry } from '../../ui/menu';
import { ShipExperience } from './ShipExperience';
import { generateHouse } from './house';
import { freshCrew, stationOptions, type PuzzleState, type Repair } from './mission';
import type { HauntState } from './net';
import {
  COMMAND_HOME,
  TRAINING_ROOMS,
  TRAINING_SPAWN_RADIUS,
  trainingRoomAt,
  trainingSpawn,
} from './trainingLayout';

jest.mock('./haunting.css', () => ({}));
jest.mock('../../core/Audio', () => ({ playTone: jest.fn(), sharedAudio: () => null }));

/**
 * Exercise real mounting, keyboard events, pointer rays, menu actions and DOM
 * buttons. Only canvas drawing and audio need browser hardware substitutes;
 * generated objects, positions, selected targets and game state stay real.
 * The harness only locates existing teaching exhibits, never calls private
 * interaction methods or sets a puzzle to its solved state.
 */
interface ExhibitLocator {
  cabinets: Array<{ id: string; leaf: THREE.Mesh; lootMesh: THREE.Object3D }>;
  consoles: Array<{
    repair: Repair;
    screen: { mesh: THREE.Mesh };
    training?: boolean;
    practice?: PuzzleState;
    solved?: boolean;
  }>;
  lockers: Array<{ id: string; group: THREE.Group; open: boolean; code: string }>;
}

let experience: ShipExperience;
let exhibits: ExhibitLocator;
let rig: PlayerRig;
let pointer: Pointer;
let input: XRInput;
let scene: THREE.Scene;
let state: HauntState;
let say: jest.Mock;
let refresh: jest.Mock;
let mounted: boolean;

beforeAll(() => {
  const gradient = { addColorStop: () => {} };
  const canvasContext = new Proxy(
    {
      measureText: (text: string) => ({ width: text.length * 8 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    },
    {
      get: (target, property) => Reflect.get(target, property) ?? (() => {}),
    },
  );
  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => canvasContext as unknown as CanvasRenderingContext2D);
});

beforeEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  const spec = generateHouse(20260909, 8);
  state = {
    crew: freshCrew(stationOptions({ test: true, bright: true, rooms: 8 })),
    seed: spec.seed,
    phase: 'running',
    time: 0,
    monsterOn: false,
    monster: null,
    shut: [],
    lit: [],
    loud: [],
    fuse: false,
    taken: [],
    done: [],
  };
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const renderer = {
    xr: { isPresenting: false },
    domElement: canvas,
  } as unknown as THREE.WebGLRenderer;
  rig = new PlayerRig(renderer, new THREE.PerspectiveCamera(65, 1, 0.05, 200));
  rig.placeAt(new THREE.Vector3(COMMAND_HOME.x, 0, COMMAND_HOME.z));
  scene = new THREE.Scene();
  scene.add(rig);
  pointer = new Pointer(rig, canvas);
  input = { controllers: [], get: () => null } as unknown as XRInput;
  const avatar = Object.assign(new THREE.Group(), { head: new THREE.Group(), bodyYaw: 0 });
  avatar.add(avatar.head);
  scene.add(avatar);
  say = jest.fn();
  refresh = jest.fn();
  const ctx = {
    scene,
    rig,
    camera: rig.camera,
    renderer,
    pointer,
    input,
    avatar,
    role: 'vr',
    menu: { isOpen: false, toggle: jest.fn() },
    net: { peers: new Map() },
    elapsed: 0,
    wear: jest.fn(),
    refreshWorldMenu: refresh,
  } as unknown as WorldContext;
  experience = new ShipExperience({
    ctx,
    spec: () => spec,
    state: () => state,
    say,
    configure: jest.fn(),
    start: jest.fn(),
    test: jest.fn(),
    door: jest.fn(),
    travel: (at) => rig.placeAt(at),
    route: () => null,
  });
  exhibits = experience as unknown as ExhibitLocator;
  scene.add(experience.root);
  mounted = true;
  frame();
});

afterEach(() => {
  if (mounted) experience.dispose();
  document.body.replaceChildren();
});

function frame(dt = 1 / 60): void {
  rig.paused = rig.frozen;
  rig.update(dt, input, false);
  scene.updateMatrixWorld(true);
  experience.update(dt);
  scene.updateMatrixWorld(true);
  pointer.update(input, false);
}

function key(code: string, type = 'keydown', repeat = false): void {
  window.dispatchEvent(new KeyboardEvent(type, { code, repeat, bubbles: true, cancelable: true }));
}

function tap(code: string): void {
  key(code);
  frame();
  key(code, 'keyup');
  frame();
}

function entry(id: string, entries: MenuEntry[] = experience.menu()): MenuEntry | undefined {
  for (const candidate of entries) {
    if (candidate.id === id) return candidate;
    const child = candidate.children && entry(id, candidate.children);
    if (child) return child;
  }
  return undefined;
}

function menu(id: string): void {
  const action = entry(id);
  expect(action).toBeDefined();
  action!.run!(null);
  frame(0.13);
}

/** Place the eye in front of an existing surface and aim at its actual UV. */
function aim(mesh: THREE.Mesh, u = 0.5, v = 0.5): void {
  mesh.updateWorldMatrix(true, false);
  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox!;
  const target = new THREE.Vector3(
    THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, u),
    THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, v),
    bounds.max.z,
  ).applyMatrix4(mesh.matrixWorld);
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(mesh.matrixWorld);
  rig.setHeadWorldPosition(target.clone().addScaledVector(normal, 1.5));
  rig.camera.lookAt(target);
  scene.updateMatrixWorld(true);
  frame(0.13);
}

function button(text: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find((b) => b.textContent === text);
  expect(found).toBeDefined();
  return found!;
}

test('E opens a physical cargo door once, then picks up its exposed kit without mouse clicks', () => {
  menu('orbital:lab:tools');
  const cabinet = exhibits.cabinets.find((c) => c.id === 'training-kit')!;
  aim(cabinet.leaf);
  key('KeyE');
  frame();
  expect(state.crew.opened).toContain('training-kit');
  frame();
  key('KeyE', 'keydown', true);
  frame();
  expect(state.crew.opened.filter((id) => id === 'training-kit')).toHaveLength(1);
  key('KeyE', 'keyup');
  for (let i = 0; i < 30; i++) frame();
  aim(cabinet.lootMesh as THREE.Mesh);
  tap('KeyE');
  expect(state.crew.inventory).toEqual(
    expect.arrayContaining(['training-kit', 'radar', 'xray', 'medkit']),
  );
  expect(state.crew.inventory.filter((id) => id === 'medkit')).toHaveLength(1);
  tap('KeyE');
  expect(state.crew.inventory.filter((id) => id === 'medkit')).toHaveLength(1);
});

test('1 and 2 cycle found hand items including genuinely empty hands', () => {
  state.crew.inventory.push('radar', 'xray', 'medkit');
  for (let i = 0; i < 3; i++) tap('Digit1');
  tap('Digit2');
  tap('Digit2');
  frame(0.13);
  expect(document.querySelector('.orbital-player__keys')?.textContent).toContain('1: Hand frei');
  expect(document.querySelector('.orbital-player__keys')?.textContent).toContain('2: Hand frei');
  expect(experience.flashlightActive).toBe(false);
  expect(scene.getObjectByName('mission-wrist-scanner')?.visible).toBe(false);
  expect(rig.camera.getObjectByName('desktop-held-tool')?.visible).toBe(false);
});

test('room culling disables the invisible cargo controls as well as their artwork', () => {
  const cabinet = exhibits.cabinets.find((c) => c.id.startsWith('cargo-'))!;
  experience.setVisibleRooms(new Set());
  aim(cabinet.leaf);
  tap('KeyE');
  expect(state.crew.opened).not.toContain(cabinet.id);
  experience.setVisibleRooms(null);
  frame();
  tap('KeyE');
  expect(state.crew.opened).toContain(cabinet.id);
});

test('simulation WASD/Ctrl moves the frozen web camera and visiting a teaching room restores walking', () => {
  menu('orbital:simulation');
  expect(rig.frozen).toBe(true);
  const before = rig.position.clone();
  key('KeyW');
  key('ControlLeft');
  frame(0.05);
  expect(rig.position.z).toBeLessThan(before.z);
  expect(rig.position.y).toBeLessThan(before.y);
  key('KeyW', 'keyup');
  key('ControlLeft', 'keyup');
  menu('orbital:lab:safe');
  expect(state.crew.simulation).toBe(false);
  expect(rig.frozen).toBe(false);
  expect(rig.getFloorY()).toBeCloseTo(0);
  expect(trainingRoomAt(rig.position.x, rig.position.z)?.id).toBe('safe');
});

test.each(['wires', 'sequence', 'tune'])(
  'the mounted %s practice puzzle solves and resets without completing a mission repair',
  (kind) => {
    menu('orbital:lab:repairs');
    const console = exhibits.consoles.find((c) => c.training && c.repair.puzzle === kind)!;
    aim(console.screen.mesh);
    const original = JSON.stringify({
      done: state.done,
      taken: state.taken,
      fuse: state.fuse,
      lit: state.lit,
      puzzles: state.crew.puzzles,
    });
    button('Wartungskasten öffnen').click();
    if (kind === 'wires') {
      for (const symbol of ['▲', '●', '■', '◆']) {
        button(`Start ${symbol}`).click();
        button(`Anschluss ${symbol}`).click();
      }
    } else if (kind === 'sequence') {
      for (const digit of console.repair.code) button(digit).click();
    } else {
      for (let column = 0; column < 3; column++) {
        for (let digit = 1; digit < Number(console.repair.code[column]); digit++) {
          button(`Frequenz ${column + 1}: ${digit}`).click();
        }
      }
      button('Bestätigen').click();
    }
    expect(console.solved).toBe(true);
    expect(say).toHaveBeenCalledWith(expect.stringContaining('Übung geschafft'));
    tap('KeyE');
    expect(console.solved).toBe(false);
    expect(console.practice?.open).toBe(false);
    expect(
      JSON.stringify({
        done: state.done,
        taken: state.taken,
        fuse: state.fuse,
        lit: state.lit,
        puzzles: state.crew.puzzles,
      }),
    ).toBe(original);
  },
);

test('the teaching safe accepts its displayed code, hides the player, and E leaves without re-entering', () => {
  menu('orbital:lab:safe');
  const locker = exhibits.lockers.find((l) => l.id === 'training-safe')!;
  const keypad = locker.group.children.find(
    (o) => o.userData.locker === 'training-safe',
  )! as THREE.Mesh;
  for (const digit of locker.code) {
    const index = Number(digit) - 1;
    aim(keypad, (index % 2) * 0.5 + 0.25, 0.75 - Math.floor(index / 2) * 0.5);
    tap('KeyE');
  }
  expect(locker.open).toBe(true);
  expect(state.crew.hidden).toBe('');
  const approach = rig.position.clone();
  tap('KeyE');
  expect(state.crew.hidden).toBe('training-safe');
  expect(rig.frozen).toBe(true);
  key('KeyE');
  frame();
  frame();
  expect(state.crew.hidden).toBe('');
  expect(rig.frozen).toBe(false);
  expect(rig.position.x).toBeCloseTo(approach.x);
  expect(rig.position.z).toBeCloseTo(approach.z);
  expect(locker.open).toBe(true);
  key('KeyE', 'keyup');
});

test('all teaching-room visits land at their own floor spawn and returning uses the command floor', () => {
  for (const lab of TRAINING_ROOMS) {
    menu(`orbital:lab:${lab.id}`);
    const expected = trainingSpawn(lab.id);
    expect(rig.getFloorY()).toBeCloseTo(0);
    expect(rig.position.x).toBeCloseTo(expected.x);
    expect(rig.position.z).toBeCloseTo(expected.z);
  }
  menu('orbital:home');
  expect(rig.position.x).toBe(COMMAND_HOME.x);
  expect(rig.position.z).toBe(COMMAND_HOME.z);
});

test('generated teaching exhibits leave every arrival capsule clear', () => {
  scene.updateMatrixWorld(true);
  for (const lab of TRAINING_ROOMS) {
    const spawn = trainingSpawn(lab.id);
    const standing = new THREE.Box3(
      new THREE.Vector3(spawn.x - TRAINING_SPAWN_RADIUS, 0.04, spawn.z - TRAINING_SPAWN_RADIUS),
      new THREE.Vector3(spawn.x + TRAINING_SPAWN_RADIUS, 1.9, spawn.z + TRAINING_SPAWN_RADIUS),
    );
    const overlaps: string[] = [];
    experience.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || object.name === 'mission-wrist-scanner') return;
      object.geometry.computeBoundingBox();
      const bounds = object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld);
      if (bounds.intersectsBox(standing)) {
        overlaps.push(`${lab.id}: ${object.name || object.parent?.name || object.geometry.type}`);
      }
    });
    expect(overlaps).toEqual([]);
  }
});

test('disposing restores stance and removes input, HUD, targets and camera attachments', () => {
  key('ControlLeft');
  for (let i = 0; i < 10; i++) frame(0.05);
  expect(rig.crouch).toBeGreaterThan(0.5);
  const floor = rig.getFloorY();
  experience.dispose();
  mounted = false;
  expect(rig.crouch).toBe(0);
  expect(rig.getFloorY()).toBeCloseTo(floor);
  expect(rig.frozen).toBe(false);
  expect(document.querySelector('.orbital-player')).toBeNull();
  expect(document.querySelector('.orbital-crosshair')).toBeNull();
  expect(rig.camera.getObjectByName('haunting-vr-comfort-border')).toBeUndefined();
  expect(rig.camera.getObjectByName('desktop-held-tool')).toBeUndefined();
  expect(experience.root.parent).toBeNull();
  const notifications = say.mock.calls.length;
  key('Digit2');
  key('KeyE');
  pointer.update(input, false);
  expect(say.mock.calls).toHaveLength(notifications);
  expect(pointer.hovering).toBe(false);
});
