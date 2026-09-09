/** @jest-environment jsdom */
import * as THREE from 'three';
import { PlayerRig } from '../../core/PlayerRig';
import { PlayerAvatar, LAYER_SELF_ONLY } from '../../core/PlayerAvatar';
import { Pointer } from '../../core/Pointer';
import { ControllerState, type XRInput } from '../../core/XRInput';
import type { WorldContext } from '../../core/types';
import type { MenuEntry } from '../../ui/menu';
import { ShipExperience } from './ShipExperience';
import { FlashlightTool } from '../portal/tools/FlashlightTool';
import { RadarTool } from '../portal/tools/RadarTool';
import { XrayTool } from '../portal/tools/XrayTool';
import { generateHouse, roomAt } from './house';
import { TILE } from '../nav/navTile';
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
  doors: Array<{
    id: string;
    panel: { mesh: THREE.Mesh };
    light: THREE.MeshBasicMaterial;
    leaves: THREE.Mesh[];
  }>;
  cabinets: Array<{ id: string; leaf: THREE.Mesh; lootMesh: THREE.Object3D }>;
  consoles: Array<{
    repair: Repair;
    screen: { mesh: THREE.Mesh };
    training?: boolean;
    practice?: PuzzleState;
    solved?: boolean;
  }>;
  lockers: Array<{ id: string; group: THREE.Group; open: boolean; code: string }>;
  lockerEntries: Map<string, string>;
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
let ctx: WorldContext;
let restart: jest.Mock;
let equip: jest.Mock;
let testMission: jest.Mock;
let stations: jest.Mock;
let menuToggle: jest.Mock;
let floating: FlashlightTool;

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
    xr: { isPresenting: false, updateCamera: jest.fn() },
    domElement: canvas,
  } as unknown as THREE.WebGLRenderer;
  rig = new PlayerRig(renderer, new THREE.PerspectiveCamera(65, 1, 0.05, 200));
  rig.placeAt(new THREE.Vector3(COMMAND_HOME.x, 0, COMMAND_HOME.z));
  scene = new THREE.Scene();
  scene.add(rig);
  pointer = new Pointer(rig, canvas);
  input = { controllers: [], get: () => null } as unknown as XRInput;
  const avatar = new PlayerAvatar();
  scene.add(avatar);
  say = jest.fn();
  refresh = jest.fn();
  menuToggle = jest.fn();
  ctx = {
    scene,
    rig,
    camera: rig.camera,
    renderer,
    pointer,
    input,
    avatar,
    role: 'vr',
    menu: { isOpen: false, toggle: menuToggle },
    net: { peers: new Map() },
    elapsed: 0,
    wear: jest.fn(),
    refreshWorldMenu: refresh,
  } as unknown as WorldContext;
  restart = jest.fn();
  equip = jest.fn();
  testMission = jest.fn();
  stations = jest.fn();
  floating = new FlashlightTool();
  floating.position.set(COMMAND_HOME.x + 1, 1.4, COMMAND_HOME.z - 1);
  scene.add(floating);
  experience = new ShipExperience({
    ctx,
    spec: () => spec,
    state: () => state,
    say,
    configure: jest.fn(),
    start: restart,
    equip,
    floatingTorch: () => floating,
    takeFloatingTorch: () => {
      floating.visible = false;
      floating.setLit(false);
    },
    test: testMission,
    stations,
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
  floating.disposeTool();
  document.body.replaceChildren();
});

test('the desktop technician can return to station roles without opening the 3D menu', () => {
  const button = document.querySelector<HTMLButtonElement>('[data-action="stations"]')!;
  expect(button).not.toBeNull();
  expect(button.closest('details')).toBeNull();
  button.click();
  expect(stations).toHaveBeenCalledTimes(1);
  expect(menuToggle).not.toHaveBeenCalled();
  expect(restart).not.toHaveBeenCalled();
  expect(testMission).not.toHaveBeenCalled();
});

test('leaving the technician view ends its local demo and restores a safe standing position', () => {
  experience.startBotRound();
  expect(state.crew.simulation).toBe(true);
  experience.dispose();
  mounted = false;
  expect(state.crew.simulation).toBe(false);
  expect(rig.frozen).toBe(false);
  expect(rig.position.y).toBe(0);
  expect(rig.position.x).toBeCloseTo(COMMAND_HOME.x);
  expect(rig.position.z).toBeCloseTo(COMMAND_HOME.z);
});

function frame(dt = 1 / 60): void {
  rig.paused = rig.frozen;
  rig.update(dt, input, false);
  scene.updateMatrixWorld(true);
  experience.update(dt);
  scene.updateMatrixWorld(true);
  pointer.update(input, ctx.renderer.xr.isPresenting);
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
  expect(scene.getObjectByName('mission-wrist-scanner')).toBeUndefined();
  expect(rig.camera.getObjectByName('desktop-held-scanner')?.visible).toBe(false);
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
  button('Freie Kamera').click();
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

test('the bot starts framed from above, follows smoothly, and allows a free camera', () => {
  experience.startBotRound();
  frame(0.13);
  const bot = experience.botPosition!;
  const eye = rig.getHeadPosition(new THREE.Vector3());
  expect(eye.x - bot.x).toBeCloseTo(8);
  expect(eye.y - bot.y).toBeCloseTo(12);
  expect(eye.z - bot.z).toBeCloseTo(10);
  const towardBot = bot
    .clone()
    .add(new THREE.Vector3(0, 1, 0))
    .sub(eye)
    .normalize();
  expect(rig.camera.getWorldDirection(new THREE.Vector3()).dot(towardBot)).toBeCloseTo(1);
  expect(document.querySelector<HTMLDetailsElement>('details[data-main]')!.open).toBe(false);
  expect(document.querySelector<HTMLDetailsElement>('details[data-tests]')!.open).toBe(false);
  const before = eye.clone();
  key('KeyW');
  frame(0.05);
  key('KeyW', 'keyup');
  expect(rig.getHeadPosition(new THREE.Vector3()).distanceTo(before)).toBeCloseTo(0);
  button('Freie Kamera').click();
  rig.setHeadWorldPosition(eye.clone().add(new THREE.Vector3(6, 0, 0)));
  const free = rig.getHeadPosition(new THREE.Vector3());
  frame(0.05);
  expect(rig.getHeadPosition(new THREE.Vector3()).distanceTo(free)).toBeCloseTo(0);
  button('Bot folgen').click();
  frame(0.05);
  const following = rig.getHeadPosition(new THREE.Vector3());
  expect(following.x).toBeLessThan(free.x);
  expect(following.x).toBeGreaterThan(eye.x);
});

test('bot observation never redirects the VR headset', () => {
  ctx.renderer.xr.isPresenting = true;
  rig.camera.rotation.set(0.12, 0.42, 0.03);
  const before = rig.camera.quaternion.clone();
  experience.startBotRound();
  frame(0.05);
  expect(rig.camera.quaternion.angleTo(before)).toBeCloseTo(0);
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

test('a locker cannot be entered or coded from the adjacent passage behind its wall', () => {
  const spec = generateHouse(state.seed, state.crew.options.rooms);
  const candidates = exhibits.lockers.flatMap((locker) =>
    (spec.passages ?? []).map((passage) => {
      const r = passage.rect;
      const at = new THREE.Vector3(
        THREE.MathUtils.clamp(locker.group.position.x, r.x * TILE + 0.2, (r.x + r.w) * TILE - 0.2),
        0,
        THREE.MathUtils.clamp(locker.group.position.z, r.z * TILE + 0.2, (r.z + r.d) * TILE - 0.2),
      );
      return { locker, passage, at, distance: at.distanceTo(locker.group.position) };
    }),
  );
  const nearest = candidates.sort((a, b) => a.distance - b.distance)[0]!;
  expect(nearest.distance).toBeLessThan(3.2);
  const { locker, passage, at } = nearest;
  expect(roomAt(spec, Math.floor(at.x / TILE), Math.floor(at.z / TILE))?.id).toBe(passage.id);
  const keypad = locker.group.children.find(
    (object) => object.userData.locker === locker.id,
  )! as THREE.Mesh;
  aim(keypad);
  const digitButton = document.querySelector<HTMLButtonElement>(
    `[data-action="locker:${locker.id}:1"]`,
  )!;
  expect(digitButton).not.toBeNull();
  // Move before the next DOM repaint: even a stale button must reject input.
  rig.placeAt(at);
  digitButton.click();
  expect(exhibits.lockerEntries.get(locker.id)).toBeUndefined();
  frame(0.13);
  expect(document.querySelector(`[data-action^="locker:${locker.id}:"]`)).toBeNull();

  aim(keypad);
  for (const digit of locker.code)
    document
      .querySelector<HTMLButtonElement>(`[data-action="locker:${locker.id}:${digit}"]`)!
      .click();
  expect(locker.open).toBe(true);
  const enter = button('Verstecken');
  rig.placeAt(at);
  enter.click();
  expect(state.crew.hidden).toBe('');
  expect(rig.position.x).toBeCloseTo(at.x);
  expect(rig.position.z).toBeCloseTo(at.z);
});

test('the teaching locker accepts input only while the technician is in its own training room', () => {
  menu('orbital:lab:safe');
  const locker = exhibits.lockers.find((candidate) => candidate.id === 'training-safe')!;
  const keypad = locker.group.children.find(
    (object) => object.userData.locker === locker.id,
  )! as THREE.Mesh;
  aim(keypad);
  const digit = document.querySelector<HTMLButtonElement>(
    '[data-action="locker:training-safe:1"]',
  )!;
  expect(digit).not.toBeNull();
  const otherRoom = trainingSpawn('tools');
  rig.placeAt(new THREE.Vector3(otherRoom.x, 0, otherRoom.z));
  digit.click();
  expect(exhibits.lockerEntries.get(locker.id)).toBeUndefined();
  expect(state.crew.hidden).toBe('');
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

test('desktop and VR use real tools; there is no persistent scanner or status HUD in a living VR view', () => {
  expect(rig.camera.getObjectByName('desktop-flashlight')).toBeInstanceOf(FlashlightTool);
  state.crew.inventory.push('radar', 'xray');
  tap('Digit1');
  expect(rig.camera.getObjectByName('desktop-held-scanner')?.visible).toBe(true);
  expect(rig.camera.getObjectByName('tool-radar')).toBeInstanceOf(RadarTool);
  tap('Digit1');
  expect(rig.camera.getObjectByName('tool-xray')).toBeInstanceOf(XrayTool);
  (ctx.renderer.xr as unknown as { isPresenting: boolean }).isPresenting = true;
  frame(0.13);
  expect(rig.camera.getObjectByName('desktop-held-scanner')?.visible).toBe(false);
  expect(rig.camera.getObjectByName('desktop-held-tool')?.visible).toBe(false);
  expect(rig.camera.getObjectByName('mission-status-panel')?.visible).toBe(false);
  expect(scene.getObjectByName('mission-wrist-scanner')).toBeUndefined();
  menu('orbital:sensor');
  expect(equip).toHaveBeenCalledWith('off', 'left');
});

test('the floating world flashlight is pickable with an ordinary web E interaction', () => {
  tap('Digit2');
  expect(experience.flashlightActive).toBe(false);
  const casing = floating.children.find((object) => object instanceof THREE.Mesh)! as THREE.Mesh;
  aim(casing);
  tap('KeyE');
  expect(floating.visible).toBe(false);
  expect(experience.flashlightActive).toBe(true);
  expect(rig.camera.getObjectByName('desktop-flashlight')).toBeInstanceOf(FlashlightTool);
  expect(document.querySelector<HTMLElement>('.orbital-crosshair')?.dataset.label).not.toBe(
    'E: Taschenlampe aufnehmen',
  );
});

test('desktop hides the real local avatar while XR shows its body and always hides its head', () => {
  const body = ctx.avatar.children.find((object) => object instanceof THREE.Mesh)!;
  const headMeshes: THREE.Object3D[] = [];
  ctx.avatar.head.traverse((object) => headMeshes.push(object));
  expect(body.layers.isEnabled(0)).toBe(false);
  expect(body.layers.isEnabled(LAYER_SELF_ONLY)).toBe(true);
  expect(rig.camera.getObjectByName('desktop-held-tool')?.visible).toBe(true);
  ctx.renderer.xr.isPresenting = true;
  frame();
  expect(body.layers.isEnabled(0)).toBe(true);
  expect(headMeshes.every((object) => !object.layers.isEnabled(0))).toBe(true);
  expect(rig.camera.getObjectByName('desktop-held-tool')?.visible).toBe(false);
  const unchanged = jest.spyOn(body.layers, 'enable');
  frame();
  expect(unchanged).not.toHaveBeenCalled();
  unchanged.mockRestore();
  ctx.renderer.xr.isPresenting = false;
  frame();
  expect(body.layers.isEnabled(0)).toBe(false);
  expect(headMeshes.every((object) => !object.layers.isEnabled(0))).toBe(true);
  expect(rig.camera.getObjectByName('desktop-held-tool')?.visible).toBe(true);
});

test.each(['lost', 'won'] as const)(
  'a %s round exposes restart outside the collapsed menu, via E and in VR',
  (phase) => {
    state.phase = phase;
    if (phase === 'lost') state.crew.hp = 0;
    frame(0.13);
    const restartButton = button('Runde neu starten');
    expect(restartButton.closest('details')).toBeNull();
    expect(restartButton.closest('[role="alert"]')).not.toBeNull();
    restartButton.click();
    expect(restart).toHaveBeenCalledTimes(1);
    tap('KeyE');
    expect(restart).toHaveBeenCalledTimes(2);
    menu('orbital:restart');
    expect(restart).toHaveBeenCalledTimes(3);
    (ctx.renderer.xr as unknown as { isPresenting: boolean }).isPresenting = true;
    frame(0.13);
    expect(rig.camera.getObjectByName('mission-status-panel')?.visible).toBe(true);
  },
);

test('a shelter always presents an interior exit and ignores a second stale selection after leaving', () => {
  menu('orbital:lab:safe');
  const locker = exhibits.lockers.find((l) => l.id === 'training-safe')!;
  const keypad = locker.group.children.find(
    (object) => object.userData.locker === locker.id,
  )! as THREE.Mesh;
  for (const digit of locker.code) {
    const index = Number(digit) - 1;
    aim(keypad, (index % 2) * 0.5 + 0.25, 0.75 - Math.floor(index / 2) * 0.5);
    tap('KeyE');
  }
  tap('KeyE');
  expect(state.crew.hidden).toBe(locker.id);
  expect(rig.camera.getObjectByName('mission-status-panel')?.visible).toBe(true);
  const exit = [...document.querySelectorAll('button')].find(
    (b) => b.textContent === 'Schutzschrank verlassen' && !b.closest('details'),
  );
  expect(exit).toBeDefined();
  exit!.click();
  const after = rig.position.clone();
  exit!.click();
  frame();
  expect(state.crew.hidden).toBe('');
  expect(rig.frozen).toBe(false);
  expect(rig.position.distanceTo(after)).toBeLessThan(0.001);
  expect(rig.camera.getObjectByName('mission-status-panel')?.visible).toBe(false);
});

test('mission controls and training kits have no microphone or identification equipment', () => {
  expect(document.body.textContent).not.toMatch(/Mikrofon|EMF|Thermosensor|Audio-Logger/);
  expect(entry('orbital:microphone')).toBeUndefined();
  menu('orbital:lab:tools');
  const cabinet = exhibits.cabinets.find((c) => c.id === 'training-kit')!;
  aim(cabinet.leaf);
  tap('KeyE');
  for (let i = 0; i < 30; i++) frame();
  aim(cabinet.lootMesh as THREE.Mesh);
  tap('KeyE');
  expect(state.crew.inventory).not.toEqual(expect.arrayContaining(['emf']));
  expect(state.crew.inventory).not.toEqual(expect.arrayContaining(['thermal']));
  expect(state.crew.inventory).not.toEqual(expect.arrayContaining(['audio']));
});

test('using the command-side training door never starts or resets the station', () => {
  const door = exhibits.doors.find((item) => item.id === 'test-bay')!;
  expect(door).toBeDefined();
  const seed = state.seed;
  const progress = ['engine'];
  state.done = [...progress];
  aim(door.panel.mesh);
  tap('KeyE');
  expect(testMission).not.toHaveBeenCalled();
  expect(restart).not.toHaveBeenCalled();
  expect(state.done).toEqual(progress);
  expect(state.seed).toBe(seed);
  state.crew.options.test = false;
  frame(0.13);
  tap('KeyE');
  expect(testMission).not.toHaveBeenCalled();
  expect(say).toHaveBeenCalledWith(expect.stringContaining('Test am Terminal'));
});

test('a locked door shows red on both sides and an available door shows green', () => {
  const door = exhibits.doors.find(
    (item) => item.id !== 'test-bay' && item.id !== 'training-door',
  )!;
  state.shut.push(door.id);
  frame(0.13);
  expect(door.light.color.getHex()).toBe(0xff5267);
  const housing = experience.root.getObjectByName(`door-status-${door.id}`)!;
  expect(housing.children).toHaveLength(2);
  expect(housing.children.map((child) => Math.sign(child.position.z))).toEqual([-1, 1]);
  state.shut = [];
  frame(0.13);
  expect(door.light.color.getHex()).toBe(0x78ffd0);
});

test.each(['lost', 'hidden'])(
  'a real XR trigger ray can operate the %s panel without opening the wrist menu',
  (condition) => {
    if (condition === 'lost') {
      state.phase = 'lost';
      state.crew.hp = 0;
    } else state.crew.hidden = 'training-safe';
    (ctx.renderer.xr as unknown as { isPresenting: boolean }).isPresenting = true;
    const ray = new THREE.Group();
    const controller = new ControllerState(
      0,
      ray,
      new THREE.Group(),
      new THREE.Group() as THREE.XRHandSpace,
    );
    controller.connected = true;
    controller.handedness = 'right';
    input.controllers.push(controller);
    input.get = (hand) => (hand === 'right' ? controller : null);
    scene.add(ray);
    frame(0.13);
    const panel = rig.camera.getObjectByName('mission-status-panel')!;
    const target = panel.getWorldPosition(new THREE.Vector3());
    rig.getHeadPosition(ray.position);
    ray.position.x += 0.15;
    ray.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().lookAt(ray.position, target, new THREE.Vector3(0, 1, 0)),
    );
    scene.updateMatrixWorld(true);
    pointer.update(input, true);
    expect(pointer.hoveringWith('right')).toBe(true);
    controller.trigger.press();
    controller.trigger.beginFrame();
    pointer.update(input, true);
    if (condition === 'lost') expect(restart).toHaveBeenCalledTimes(1);
    else expect(state.crew.hidden).toBe('');
  },
);
