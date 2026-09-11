/** @jest-environment jsdom */
import * as THREE from 'three';
import { PlayerRig } from '../../core/PlayerRig';
import { PlayerAvatar, LAYER_SELF_ONLY } from '../../core/PlayerAvatar';
import { Pointer } from '../../core/Pointer';
import { ControllerState, type XRInput } from '../../core/XRInput';
import type { WorldContext } from '../../core/types';
import type { MenuEntry } from '../../ui/menu';
import { ShipExperience } from './ShipExperience';
import type { MapGoal } from './map/mapView';
import type { MapRound } from './map/mapSnapshot';
import { outlineOf } from '../../core/outlineShell';
import { FlashlightTool } from '../portal/tools/FlashlightTool';
import { RadarTool } from '../portal/tools/RadarTool';
import { XrayTool } from '../portal/tools/XrayTool';
import { generateHouse, roomAt, type HouseSpec } from './house';
import { TILE } from '../nav/navTile';
import { freshCrew, repairsFor, stationOptions, type PuzzleState, type Repair } from './mission';
import type { HauntState } from './net';
import { freshGhosts } from './rules/ghosts';
import { defaultSetup, saveSetup, withPower } from './rules/roundSetup';
import { CARGO_OPEN_SECONDS } from './rules/chore';
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
  cabinets: Array<{
    id: string;
    group: THREE.Group;
    leaf: THREE.Mesh;
    /** Was drinliegt — bei einem Missionsteil die Kennung der Aufgabe. */
    loot: string;
    lootMesh: THREE.Object3D;
    scanner: THREE.Object3D;
  }>;
  consoles: Array<{
    repair: Repair;
    screen: { mesh: THREE.Mesh };
    training?: boolean;
    practice?: PuzzleState;
    solved?: boolean;
  }>;
  lockers: Array<{
    id: string;
    group: THREE.Group;
    open: boolean;
    code: string;
    parts: THREE.Object3D[];
    wreck: THREE.Group | null;
  }>;
  /** Der Streifen im Blickfeld — `userData.paint` ist der Text, der darauf steht. */
  hud: { mesh: THREE.Mesh };
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
let spec: HouseSpec;
/** Der Stand der Runde für den Streifen im Blickfeld — ohne ihn malt er nicht. */
let round: MapRound | null;
let restart: jest.Mock;
let equip: jest.Mock;
let testMission: jest.Mock;
let stations: jest.Mock;
/** Der eine Knopf „2D von oben" im Panel des Technikers (`HauntingWorld.switchView`). */
let switchView: jest.Mock;
let menuToggle: jest.Mock;
let floating: FlashlightTool;
/** Was der Kompass gerade ansagt — die Welt rechnet es sonst selbst (`HauntingWorld.objectives`). */
let goals: MapGoal[];

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
  spec = generateHouse(20260909, 8);
  state = {
    crew: freshCrew(stationOptions({ test: true, bright: true, rooms: 8 })),
    seed: spec.seed,
    phase: 'running',
    time: 0,
    monsterOn: false,
    monster: null,
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
  switchView = jest.fn();
  goals = [];
  round = null;
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
    objectives: () => goals,
    round: () => round,
    stations,
    switchView,
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
  // Über das Optionsmenü der 2D-Welt (`map/optionsMenu.ts`): „Aufmachen →
  // Zentrale" — und das Weltmenü der Seite bleibt dabei zu.
  document.querySelector<HTMLButtonElement>('[data-action="options"]')!.click();
  const button = document.querySelector<HTMLButtonElement>('.orbital-options [data-stations]')!;
  expect(button).not.toBeNull();
  button.click();
  expect(stations).toHaveBeenCalledTimes(1);
  expect(menuToggle).not.toHaveBeenCalled();
  expect(restart).not.toHaveBeenCalled();
  expect(testMission).not.toHaveBeenCalled();
});

/**
 * **Das Menü des Technikers am Desktop zeigt dieselben drei Absichten wie der
 * Van und die Brille** (`rules/lobby.ts`). Vorher standen hier „Mission
 * starten" und „Test ohne Monster", im Van hießen dieselben Dinge „Mission
 * spielen (2D)" und „Test ohne Monster (2D)", in der Brille „TEST / ohne
 * Monster" — dreimal dasselbe, dreimal anders benannt.
 */
test('das Panel des Desktop-Technikers zeigt Spielen, Zuschauen und Trainieren', () => {
  const panel = document.querySelector<HTMLElement>('.orbital-player')!;
  const intents = [...panel.querySelectorAll<HTMLButtonElement>('[data-action^="intent:"]')];
  expect(intents.map((key) => key.dataset.action)).toEqual([
    'intent:play',
    'intent:watch',
    'intent:train',
  ]);
  expect(intents[0]!.textContent).toContain('Spielen');
  expect(intents[1]!.textContent).toContain('Zuschauen');
  expect(intents[2]!.textContent).toContain('Trainieren');
  // Darunter die Zeile, die sagt, wie die Runde gerade verteilt ist.
  expect(panel.querySelector('.orbital-player__setup')?.textContent).toContain('Techniker:');
  // Nach jedem Druck baut sich das Panel neu — also frisch nachschlagen.
  const key = (intent: string): HTMLButtonElement =>
    document.querySelector<HTMLButtonElement>(`[data-action="intent:${intent}"]`)!;
  key('play').click();
  expect(restart).toHaveBeenCalledTimes(1);
  key('train').click();
  expect(testMission).toHaveBeenCalledTimes(1);
});

/**
 * **Panel und Weltmenü teilen sich die linke Bildhälfte** — und lagen deshalb
 * auf 1280×800 übereinander. Wer das Menü aufmacht, will das Menü.
 */
test('das Panel weicht dem offenen Weltmenü', () => {
  const panel = document.querySelector<HTMLElement>('.orbital-player')!;
  expect(panel.hidden).toBe(false);
  (ctx.menu as { isOpen: boolean }).isOpen = true;
  frame();
  expect(panel.hidden).toBe(true);
  (ctx.menu as { isOpen: boolean }).isOpen = false;
  frame();
  expect(panel.hidden).toBe(false);
});

/**
 * **Die Kopfzeile der Seite gehört nicht über diese Welt.** „Oben das Panel
 * Menü/Verbindung/VR bitte entfernen" — sie lag mit `z-index: 5` über dem
 * oberen Rand, den das Schiff selbst braucht (Kompass, Tafel). Ausgeblendet
 * wird sie über eine Klasse am `body` (`haunting.css`, `body.orbital-on
 * #hud`), abgebaut nicht: Ihre drei Knöpfe hängen an der Seite, und das
 * Zahnrad der Tafel drückt sie stellvertretend.
 */
test('das Schiff blendet die Kopfzeile der Seite aus und holt sie beim Verlassen zurück', () => {
  expect(document.body.classList.contains('orbital-on')).toBe(true);
  const vr = document.createElement('button');
  vr.id = 'hud-vr';
  const pressed = jest.fn();
  vr.addEventListener('click', pressed);
  document.body.append(vr);
  document.querySelector<HTMLButtonElement>('[data-action="options"]')!.click();
  const options = document.querySelector<HTMLElement>('.orbital-options')!;
  expect(options.querySelector('[data-pagemenu]')).not.toBeNull();
  expect(options.querySelector('[data-pagenet]')).not.toBeNull();
  options.querySelector<HTMLButtonElement>('[data-pagevr]')!.click();
  expect(pressed).toHaveBeenCalledTimes(1);
  experience.dispose();
  mounted = false;
  expect(document.body.classList.contains('orbital-on')).toBe(false);
});

/**
 * **Zugeklappt bleibt die Titelzeile.** Die Tafel stand über der halben
 * Station („ich will das Menü zuklappen können, da es aktuell über den ganzen
 * Bildschirm ist"). Zu heißt: Anzug, Systeme und Sauerstoff bleiben lesbar,
 * und die zwei Knöpfe, die wieder hinausführen, bleiben drückbar — alles
 * andere ist weg und kommt so zurück, wie es war.
 */
test('die Tafel des Technikers lässt sich zuklappen und wieder auf', () => {
  const panel = document.querySelector<HTMLElement>('.orbital-player')!;
  const fold = (): HTMLButtonElement =>
    panel.querySelector<HTMLButtonElement>('[data-action="fold"]')!;
  panel.querySelector<HTMLDetailsElement>('details[data-main]')!.open = true;

  fold().click();
  expect(panel.classList.contains('is-folded')).toBe(true);
  expect(panel.querySelector('details[data-main]')).toBeNull();
  expect(panel.querySelector('[data-action="sensor"]')).toBeNull();
  expect(panel.querySelector('strong')?.textContent).toContain('ORBITAL');
  expect(panel.querySelector('[data-action="options"]')).not.toBeNull();
  expect(fold().getAttribute('aria-expanded')).toBe('false');

  // Ein neuer Stand zeichnet die Tafel neu — zugeklappt bleibt zugeklappt.
  state.done = ['reactor'];
  frame();
  expect(panel.querySelector('details[data-main]')).toBeNull();

  fold().click();
  expect(panel.classList.contains('is-folded')).toBe(false);
  expect(panel.querySelector<HTMLDetailsElement>('details[data-main]')?.open).toBe(true);
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

/**
 * **Eine Kiste aufklappen dauert** (`rules/chore.ts`): einmal tippen, dann
 * stillstehen, bis der Balken durch ist. Wer dabei losliefe, finge von vorn
 * an — deshalb bewegt diese Hilfe nichts.
 */
function openCrate(leaf: THREE.Mesh): void {
  aim(leaf);
  tap('KeyE');
  for (let t = 0; t < CARGO_OPEN_SECONDS + 0.3; t += 0.1) frame(0.1);
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

/**
 * **Den Blick ins Leere richten** — nach oben, wo nichts hängt, was der
 * Zeiger greifen könnte. Danach ist kein Ziel in Reichweite, und „Benutzen"
 * hat nichts zu benutzen.
 */
function lookAtNothing(): void {
  const head = rig.getHeadPosition(new THREE.Vector3());
  rig.camera.lookAt(head.x, head.y + 10, head.z - 0.01);
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
  // Der Deckel braucht fünf Sekunden Stillstehen (`rules/chore.ts`).
  expect(experience.busy?.id).toBe('training-kit');
  expect(state.crew.opened).not.toContain('training-kit');
  key('KeyE', 'keyup');
  for (let t = 0; t < CARGO_OPEN_SECONDS + 0.3; t += 0.1) frame(0.1);
  expect(experience.busy).toBeNull();
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
  // **Vier Schritte links, nicht drei**: frei, Taschenlampe, Radar, Röntgen.
  // Die Lampe hängt seit dem Ersatzteil in der rechten Hand an *beiden*
  // Hüften (`HauntingWorld.beltLoadout`) und steht deshalb auch links im
  // Kreis. „Frei" bleibt erreichbar — Dunkelheit ist eine Entscheidung.
  for (let i = 0; i < 4; i++) tap('Digit1');
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

/**
 * **Die Türen gehen mit ihren Räumen.** Ein Dutzend Zeichenaufrufe je Tür,
 * gut zwei Dutzend Türen — die wurden bisher in jedem Bild gezeichnet, auch
 * die hinter drei Wänden. Eine Tür steht, solange einer ihrer zwei Räume
 * steht; die Übungsdeck-Türen immer.
 */
test('room culling hides the doors of hidden rooms and keeps those of a visible neighbour', () => {
  const door = spec.doors.find((d) => d.b)!;
  const group = scene.getObjectByName(`door-${door.id}`)!;
  const bay = scene.getObjectByName('door-test-bay')!;
  experience.setVisibleRooms(new Set());
  expect(group.visible).toBe(false);
  expect(bay.visible).toBe(true);
  // Der Raum auf der anderen Seite reicht: Die Tür gehört zu beiden.
  experience.setVisibleRooms(new Set([door.b!]));
  expect(group.visible).toBe(true);
  experience.setVisibleRooms(new Set([door.a]));
  expect(group.visible).toBe(true);
  experience.setVisibleRooms(null);
  expect(group.visible).toBe(true);
});

/**
 * **Eine Lampe, die aus ist, ist auch für den Shader aus.** three.js rechnet
 * jede sichtbare Lichtquelle in jedem Bildpunkt mit, Stärke null hin oder her;
 * unsichtbar zählt sie nicht. Die Deckenleuchte des Übungsdecks brennt nur
 * dort — und ist überall sonst kein Licht mehr.
 */
test('the bay light leaves the shader while it is off', () => {
  const light = scene.getObjectByName('training-bay-light') as THREE.PointLight | undefined;
  expect(light).toBeDefined();
  frame();
  expect(light!.intensity).toBe(0);
  expect(light!.visible).toBe(false);
});

test('a flashlight that is off takes its lights out of the shader', () => {
  const torch = new FlashlightTool();
  const lights = torch.children.filter((child) => (child as THREE.Light).isLight);
  expect(lights.length).toBeGreaterThan(0);
  expect(lights.every((light) => !light.visible)).toBe(true);
  torch.setLit(true);
  expect(lights.every((light) => light.visible)).toBe(true);
  torch.setLit(false);
  expect(lights.every((light) => !light.visible)).toBe(true);
});

test('room culling disables the invisible cargo controls as well as their artwork', () => {
  const cabinet = exhibits.cabinets.find((c) => c.id.startsWith('cargo-'))!;
  experience.setVisibleRooms(new Set());
  aim(cabinet.leaf);
  tap('KeyE');
  expect(state.crew.opened).not.toContain(cabinet.id);
  experience.setVisibleRooms(null);
  frame();
  openCrate(cabinet.leaf);
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

test('the teaching safe hides the player on one tap — no code — and E leaves without re-entering', () => {
  menu('orbital:lab:safe');
  const locker = exhibits.lockers.find((l) => l.id === 'training-safe')!;
  const keypad = locker.group.children.find(
    (o) => o.userData.locker === 'training-safe',
  )! as THREE.Mesh;
  // Kein Code mehr: Das Tastenfeld ist eine Taste, und die Tafel zeigt keine Ziffern.
  aim(keypad);
  frame(0.13);
  expect(document.querySelectorAll('[data-action^="locker:training-safe:"]')).toHaveLength(1);
  expect(document.body.textContent).toContain('ohne Code');
  expect(state.crew.hidden).toBe('');
  const approach = rig.position.clone();
  const meshes: THREE.Mesh[] = [];
  for (const part of locker.parts)
    part.traverse((node) => {
      if (node instanceof THREE.Mesh) meshes.push(node);
    });
  const before = meshes.map((mesh) => mesh.material);
  tap('KeyE');
  expect(state.crew.hidden).toBe('training-safe');
  expect(rig.frozen).toBe(true);
  // **Von innen ein Geist mit Schlitzen**: blasse Kopien der Materialien,
  // die Originale (geteilt mit allen Möbeln) bleiben unangetastet.
  const slits = locker.group.getObjectByName('locker-slits')!;
  expect(slits.visible).toBe(true);
  expect(slits.children.length).toBeGreaterThanOrEqual(4);
  for (const mesh of meshes) {
    const material = mesh.material as THREE.Material;
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeLessThan(0.5);
    expect(material.side).toBe(THREE.DoubleSide);
  }
  expect(before.every((material) => !(material as THREE.Material).transparent)).toBe(true);
  key('KeyE');
  frame();
  frame();
  expect(state.crew.hidden).toBe('');
  expect(rig.frozen).toBe(false);
  expect(rig.position.x).toBeCloseTo(approach.x);
  expect(rig.position.z).toBeCloseTo(approach.z);
  // Draußen ist der Schrank wieder der alte: dieselben Materialien, keine Schlitze.
  expect(meshes.map((mesh) => mesh.material)).toEqual(before);
  expect(slits.visible).toBe(false);
  key('KeyE', 'keyup');
});

/**
 * **Die zerstörte Kabine in 3D.** Sobald sie im Stand steht
 * (`HauntState.destroyed`), zeigt sie das Wrack, nimmt keinen Gast auf,
 * sagt es einmal, funkt alle paar Sekunden — und wird mit der neuen Runde
 * wieder heil.
 */
test('a wrecked locker swaps its model, refuses entry, sparks now and then, and heals with the round', () => {
  menu('orbital:lab:safe');
  const locker = exhibits.lockers.find((l) => l.id === 'training-safe')!;
  const keypad = locker.group.children.find(
    (o) => o.userData.locker === 'training-safe',
  )! as THREE.Mesh;
  expect(locker.wreck).toBeNull();
  state.destroyed = ['training-safe'];
  frame();
  expect(locker.wreck?.name).toBe('broken-locker');
  expect(locker.wreck!.parent).toBe(locker.group);
  expect(locker.parts.every((part) => !part.visible)).toBe(true);
  expect(keypad.visible).toBe(true);
  // Antippen: abgelehnt, und es wird gesagt.
  say.mockClear();
  aim(keypad);
  tap('KeyE');
  expect(state.crew.hidden).toBe('');
  expect(rig.frozen).toBe(false);
  expect(say.mock.calls.filter(([text]: [string]) => /zerstört/.test(text))).toHaveLength(1);
  // Auch ein Schrank, der offen war, nimmt niemanden mehr auf.
  locker.open = true;
  tap('KeyE');
  expect(state.crew.hidden).toBe('');
  expect(rig.frozen).toBe(false);
  // Die Tafel am Bildschirm: Hinweis statt Knopf.
  expect(document.querySelector('[data-action^="locker:training-safe:"]')).toBeNull();
  expect(document.body.textContent).toContain('Kabine zerstört');
  // Funken in unregelmäßigem Takt — in sieben Sekunden mindestens einmal, höchstens dreimal.
  const sparks: THREE.Vector3[] = [];
  const burst = jest.spyOn(experience, 'burst').mockImplementation((kind, at) => {
    if (kind === 'sparks') sparks.push(at.clone());
  });
  for (let i = 0; i < 60 * 7; i++) frame();
  expect(sparks.length).toBeGreaterThanOrEqual(1);
  expect(sparks.length).toBeLessThanOrEqual(3);
  expect(sparks[0]!.x).toBeCloseTo(locker.group.position.x);
  expect(sparks[0]!.z).toBeCloseTo(locker.group.position.z);
  burst.mockRestore();
  // Neue Runde: Liste leer, Modell wieder heil.
  state.destroyed = [];
  frame();
  expect(locker.wreck).toBeNull();
  expect(locker.parts.every((part) => part.visible)).toBe(true);
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
  frame(0.13);
  const enter = document.querySelector<HTMLButtonElement>(`[data-action="locker:${locker.id}:1"]`)!;
  expect(enter).not.toBeNull();
  // Move before the next DOM repaint: even a stale button must reject input.
  rig.placeAt(at);
  enter.click();
  expect(state.crew.hidden).toBe('');
  expect(rig.position.x).toBeCloseTo(at.x);
  expect(rig.position.z).toBeCloseTo(at.z);
  frame(0.13);
  expect(document.querySelector(`[data-action^="locker:${locker.id}:"]`)).toBeNull();
  // Auch die Taste am Schrank selbst nimmt von drüben niemanden auf.
  aim(keypad);
  rig.placeAt(at);
  tap('KeyE');
  expect(state.crew.hidden).toBe('');
});

test('the teaching locker accepts input only while the technician is in its own training room', () => {
  menu('orbital:lab:safe');
  const locker = exhibits.lockers.find((candidate) => candidate.id === 'training-safe')!;
  const keypad = locker.group.children.find(
    (object) => object.userData.locker === locker.id,
  )! as THREE.Mesh;
  aim(keypad);
  frame(0.13);
  const enter = document.querySelector<HTMLButtonElement>(
    '[data-action="locker:training-safe:1"]',
  )!;
  expect(enter).not.toBeNull();
  const otherRoom = trainingSpawn('tools');
  rig.placeAt(new THREE.Vector3(otherRoom.x, 0, otherRoom.z));
  enter.click();
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
  // Der erste Schritt der linken Hand ist die zweite Taschenlampe.
  tap('Digit1');
  expect(rig.camera.getObjectByName('desktop-flashlight-left')?.visible).toBe(true);
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
  // Aus dem Röntgengerät heraus ist die Hand wieder frei — vier Schritte, und
  // die Brille bekommt jeden davon als `equip` gemeldet.
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
  aim(keypad);
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

test('overview frames the whole station and free flight can rise beyond the old 14m ceiling', () => {
  experience.startBotRound();
  frame(0.13);
  button('Kartenübersicht').click();
  frame(0.05);
  expect(rig.getHeadPosition(new THREE.Vector3()).y).toBeCloseTo(90);
  key('Space');
  for (let i = 0; i < 20; i++) frame(0.05);
  key('Space', 'keyup');
  expect(rig.getHeadPosition(new THREE.Vector3()).y).toBeGreaterThan(90);
});

test('bot radio remains visible when mission and test menus are collapsed', () => {
  experience.startBotRound();
  frame(0.13);
  const log = document.querySelector('[aria-label="Simulierter Funkverkehr"]')!;
  expect(log.closest('details')).toBeNull();
  expect(log.textContent).toContain('Techniker → Zentrale');
});

/**
 * **Dieselbe Steuerung wie in der 2D-Welt, im Schiff.** Wer die Station von
 * oben gespielt hat, findet dieselben drei Knöpfe und denselben Stock wieder,
 * wenn er sie von innen läuft — die zwei kleinen sind hier die zwei Hände,
 * der große ist das, was am Desktop das `E` tut.
 */
describe('Die Steuerung der 2D-Welt über der 3D-Szene', () => {
  function stickTo(dx: number, dy: number): void {
    const zone = document.querySelector<HTMLElement>('.flat.ship3d .flat__stick')!;
    const at = (type: string, x: number, y: number): void => {
      zone.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
    };
    at('pointerdown', 100, 100);
    at('pointermove', 100 + dx, 100 + dy);
  }

  test('hängt Stock und drei Knöpfe über die Station', () => {
    frame(0.13);
    const keys = [...document.querySelectorAll<HTMLElement>('.flat.ship3d .flat__key')];
    expect(keys).toHaveLength(3);
    expect(keys[0]!.textContent).toContain('Linke Hand');
    expect(keys[1]!.textContent).toContain('Rechte Hand');
    expect(keys[2]!.textContent).toContain('Benutzen');
    // Die Tafel des Technikers rückt darüber, statt darunter zu liegen.
    expect(document.querySelector('.orbital-player')?.classList.contains('is-keys')).toBe(true);
  });

  test('schaltet mit den kleinen Knöpfen dieselben Hände wie 1 und 2', () => {
    frame(0.13);
    const keys = [...document.querySelectorAll<HTMLButtonElement>('.flat.ship3d .flat__key')];
    const right = keys[1]!;
    // Auf dem runden Knopf heißt sie „Lampe", samt ihrem Schalter: „Taschenlampe
    // an" wäre dort abgeschnitten (`ShipExperience.keyLabel`).
    expect(right.textContent).toContain('Lampe an');
    right.click();
    frame();
    expect(right.textContent).toContain('frei');
    expect(say).toHaveBeenCalledWith('Rechte Hand frei.');
  });

  test('schiebt den Spieler mit dem Stock — waagerecht und nach vorn', () => {
    frame(0.13);
    // Ohne Daumen bewegt sich waagerecht nichts; die Höhe gehört der Schwerkraft.
    const start = rig.position.clone();
    for (let i = 0; i < 6; i++) frame();
    const idle = Math.hypot(rig.position.x - start.x, rig.position.z - start.z);
    expect(idle).toBeLessThan(0.05);
    const before = rig.position.clone();
    stickTo(0, -60);
    for (let i = 0; i < 6; i++) frame();
    const walked = Math.hypot(rig.position.x - before.x, rig.position.z - before.z);
    expect(walked).toBeGreaterThan(0.2);
    // Nach vorn heißt: in die Richtung, in die der Kopf schaut.
    const look = rig.getHeadForward(new THREE.Vector3());
    const moved = new THREE.Vector3(
      rig.position.x - before.x,
      0,
      rig.position.z - before.z,
    ).normalize();
    expect(moved.dot(look.setY(0).normalize())).toBeGreaterThan(0.7);
  });

  /**
   * **Der große Knopf ist im Leeren der Lichtschalter.**
   *
   * „Wenn ich auf keine Kiste oder Tür schaue, will ich mit Benutzen die
   * Taschenlampe an- und ausmachen können" — und auf dem Knopf steht dann
   * auch, was er tut, denn ob die Lampe brennt, war vorher nirgends zu lesen.
   * Die Lampe bleibt dabei in der Hand: `cycleRight` leert sie, dieser Griff
   * nicht.
   */
  test('schaltet mit Benutzen das Licht, solange nichts vor einem liegt', () => {
    lookAtNothing();
    const keys = (): HTMLButtonElement[] => [
      ...document.querySelectorAll<HTMLButtonElement>('.flat.ship3d .flat__key'),
    ];
    const act = (): HTMLButtonElement => keys()[2]!;
    // Gelb leuchtet der Knopf nur mit einem Ziel — hier ist keines.
    expect(act().classList.contains('is-ready')).toBe(false);
    expect(act().textContent).toContain('Licht aus');
    expect(keys()[1]!.textContent).toContain('Lampe an');
    expect(experience.flashlightActive).toBe(true);

    // **Der Druck wartet auf seinen Strahl** (`armUse`): Erst wenn der nichts
    // getroffen hat, wird es der Lichtschalter — zwei Bilder später.
    act().click();
    frame();
    frame();
    expect(experience.flashlightActive).toBe(false);
    expect(say).toHaveBeenCalledWith('Taschenlampe aus.');
    expect(keys()[1]!.textContent).toContain('Lampe aus');
    expect(act().textContent).toContain('Licht an');
    // In der Hand liegt sie weiter — nur dunkel.
    expect(rig.camera.getObjectByName('desktop-held-tool')?.visible).toBe(true);

    act().click();
    frame();
    frame();
    expect(experience.flashlightActive).toBe(true);
    expect(say).toHaveBeenCalledWith('Taschenlampe an.');
  });

  test('holt die Lampe zurück in die leere Hand, statt nur zu blättern', () => {
    lookAtNothing();
    // Ohne Medkit im Inventar hat die rechte Hand zwei Stufen: Lampe und frei.
    tap('Digit2');
    frame(0.13);
    expect(experience.flashlightActive).toBe(false);
    expect(rig.camera.getObjectByName('desktop-held-tool')?.visible).toBe(false);
    document.querySelectorAll<HTMLButtonElement>('.flat.ship3d .flat__key')[2]!.click();
    frame();
    frame();
    expect(experience.flashlightActive).toBe(true);
    expect(rig.camera.getObjectByName('desktop-held-tool')?.visible).toBe(true);
  });

  /** Vor einer Kiste bleibt Benutzen das, was es immer war. */
  test('lässt das Ziel vor der Nase Vorrang haben', () => {
    const cabinet = exhibits.cabinets.find((c) => c.id.startsWith('cargo-'))!;
    aim(cabinet.leaf);
    document.querySelectorAll<HTMLButtonElement>('.flat.ship3d .flat__key')[2]!.click();
    for (let t = 0; t < CARGO_OPEN_SECONDS + 0.3; t += 0.1) frame(0.1);
    expect(state.crew.opened).toContain(cabinet.id);
    // Das Licht hat dabei nichts zu suchen.
    expect(experience.flashlightActive).toBe(true);
    expect(say).not.toHaveBeenCalledWith('Taschenlampe aus.');
  });

  /** Und `E` am Desktop tut dasselbe wie der Daumen auf dem Knopf. */
  test('schaltet auch mit E das Licht', () => {
    lookAtNothing();
    tap('KeyE');
    frame();
    expect(experience.flashlightActive).toBe(false);
    tap('KeyE');
    frame();
    expect(experience.flashlightActive).toBe(true);
  });

  /** In der Brille gibt es Controller; ein Knopf im DOM ist dort unsichtbar. */
  test('bleibt in der Brille weg', () => {
    frame(0.13);
    const root = document.querySelector<HTMLElement>('.flat.ship3d')!;
    expect(root.hidden).toBe(false);
    (ctx.renderer.xr as unknown as { isPresenting: boolean }).isPresenting = true;
    frame();
    expect(root.hidden).toBe(true);
    (ctx.renderer.xr as unknown as { isPresenting: boolean }).isPresenting = false;
    frame();
    expect(root.hidden).toBe(false);
  });
});

test('die Zielkiste trägt den Saum, sonst keine — und das Inhaltsschild ist weg', () => {
  const cabinet = exhibits.cabinets.find((c) => c.id.startsWith('cargo-'))!;
  const body = cabinet.group.children.find(
    (child) => child instanceof THREE.Mesh && child !== cabinet.leaf,
  ) as THREE.Mesh;
  // **Kein dauerhaftes Inhaltsschild mehr.** Am Schrank hängt außer dem Modell
  // des Inhalts nur noch das Kennzeichen (auf dem Blatt) und das Schild des
  // Röntgengeräts — und das ist aus.
  expect(cabinet.scanner.visible).toBe(false);
  const tags = cabinet.group.children.filter(
    (child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry,
  );
  expect(tags).toEqual([cabinet.scanner]);

  expect(outlineOf(body)).toBeNull();
  goals = [
    {
      id: cabinet.id,
      at: { x: 0, z: 0 },
      label: 'Kiste 2 · blau',
      next: true,
      kind: 'crate',
      precision: 'exact',
    },
  ];
  frame();
  expect(outlineOf(body)).not.toBeNull();
  const other = exhibits.cabinets.find((c) => c.id.startsWith('cargo-') && c.id !== cabinet.id)!;
  const otherBody = other.group.children.find(
    (child) => child instanceof THREE.Mesh && child !== other.leaf,
  ) as THREE.Mesh;
  expect(outlineOf(otherBody)).toBeNull();

  // Sitzt ein Mensch am Archiv, ist das Ziel der Raum — dann leuchtet keine Kiste.
  goals = [
    {
      id: 'room:r1',
      at: { x: 0, z: 0 },
      label: 'Frachtlager',
      next: true,
      kind: 'room',
      precision: 'room',
    },
  ];
  frame();
  expect(outlineOf(body)).toBeNull();
});

test('das Röntgengerät schaltet die Kennzeichenschilder der vollen Kisten ein', () => {
  const crates = exhibits.cabinets.filter((c) => c.id.startsWith('cargo-'));
  // Eine volle und eine leere Kiste nebeneinander: Genau das ist der Fall, für
  // den das Gerät da ist.
  const pair = crates
    .filter((one) => !!one.lootMesh)
    .flatMap((one) =>
      crates
        .filter(
          (other) => !other.lootMesh && other.group.position.distanceTo(one.group.position) < 8,
        )
        .map((other) => ({ full: one, empty: other })),
    )[0];
  expect(pair).toBeDefined();
  const { full, empty } = pair!;
  // Es ist ein Gerät für den Raum, in dem man steht: Der Techniker tritt davor.
  rig.placeAt(new THREE.Vector3(full.group.position.x, 0, full.group.position.z + 1));
  frame();
  expect(full.scanner.visible).toBe(false);
  state.crew.inventory.push('xray');
  // Zwei Schritte: erst die Taschenlampe, dann das Röntgengerät.
  menu('orbital:sensor');
  menu('orbital:sensor');
  frame();
  expect(full.scanner.visible).toBe(true);
  // Leere Kisten meldet es nicht: Es zeigt Inhalte, keine Kisten.
  expect(empty.scanner.visible).toBe(false);
  menu('orbital:sensor');
  frame();
  expect(full.scanner.visible).toBe(false);
});

/**
 * **Eine Hand, ein Ersatzteil** (`rules/archiveGoals.ts`). Die zweite Kiste
 * geht auf, das Teil darin bleibt liegen — sonst sammelte man in Ruhe alle
 * drei ein und klapperte danach die Konsolen ab.
 */
test('der Techniker bekommt kein zweites Ersatzteil in die Hand', () => {
  const parts = exhibits.cabinets.filter((one) => spec.tasks.some((t) => t.id === one.loot));
  expect(parts.length).toBeGreaterThan(1);
  const [first, second] = parts as [(typeof parts)[0], (typeof parts)[0]];
  openCrate(first.leaf);
  aim(first.lootMesh as THREE.Mesh);
  tap('KeyE');
  expect(state.crew.inventory).toContain(first.loot);
  expect(state.taken).toContain(first.loot);

  openCrate(second.leaf);
  expect(state.crew.opened).toContain(second.id);
  aim(second.lootMesh as THREE.Mesh);
  tap('KeyE');
  expect(state.crew.inventory).not.toContain(second.loot);
  expect(state.taken).not.toContain(second.loot);
  expect(say).toHaveBeenCalledWith(expect.stringContaining('Beide Hände voll'));
  // Die Kiste bleibt offen und unerledigt: Wer zurückkommt, findet sie so vor.
  expect(state.crew.inventory).not.toContain(second.id);
});

/**
 * **G legt das Teil ab** — und wo es liegt, steht im Stand, damit der Archivar
 * es melden kann (`HauntState.dropped`, sichtbar erst nach `DROPPED_SEEN`).
 */
test('G legt das Ersatzteil im Gang ab, und E nimmt es wieder auf', () => {
  const crate = exhibits.cabinets.find((one) => spec.tasks.some((t) => t.id === one.loot))!;
  openCrate(crate.leaf);
  aim(crate.lootMesh as THREE.Mesh);
  tap('KeyE');
  expect(state.crew.inventory).toContain(crate.loot);

  state.time = 42;
  tap('KeyG');
  expect(state.crew.inventory).not.toContain(crate.loot);
  expect(state.dropped).toEqual([
    { id: crate.loot, x: expect.any(Number), z: expect.any(Number), since: 42 },
  ]);
  // Die Konsole bleibt jetzt zu: `taken` heißt „war einmal draußen", nicht
  // „ist in der Hand".
  expect(state.taken).toContain(crate.loot);

  frame();
  const lying = experience.root.getObjectByName(`dropped-${crate.loot}`) as THREE.Mesh;
  expect(lying).toBeDefined();
  aim(lying);
  tap('KeyE');
  expect(state.crew.inventory).toContain(crate.loot);
  expect(state.dropped).toEqual([]);
});

/**
 * **Die Auftragszeile im Blickfeld gibt es nur solo** (`hudTasksVisible`):
 * Sitzt am Archiv ein Mensch, ist das Wissen dessen Platz, und der Techniker
 * holt es sich am Funk.
 */
test('der Streifen zeigt die Aufträge nur, wenn am Archiv ein Bot sitzt', () => {
  round = {
    phase: 'running',
    oxygen: 300,
    limit: 600,
    suit: 3,
    suitMax: 3,
    cabinsDestroyed: [],
    ending: '',
  };
  frame(0.3);
  const solo = String(exhibits.hud.mesh.userData.paint);
  expect(solo).toContain('O₂');
  expect(solo).toContain(repairsFor(spec)[0]!.title);

  // Ohne eigenes Archiv keine Auftragszeile: Die Ziele gehören dem, der die
  // Fähigkeit hält (`rules/roundSetup.powersOf`).
  saveSetup(withPower(defaultSetup(), 'technician', 'archive', false));
  frame(0.3);
  const shared = String(exhibits.hud.mesh.userData.paint);
  expect(shared).toContain('O₂');
  expect(shared).not.toContain(repairsFor(spec)[0]!.title);
});

/**
 * **Dieselbe Runde von oben statt von innen** (`HauntingWorld.switchView`). Ein
 * Knopf, und zwar genau einer: Er steht oben bei „Rolle wechseln", weil er
 * dasselbe ist — eine Ansicht und kein Neustart — und nicht unten zwischen den
 * Handgriffen, wo man ihn auf der Flucht trifft.
 */
test('der Techniker wechselt über das Optionsmenü der 2D-Welt in die Karte von oben', () => {
  // **Dasselbe Zahnrad wie in 2D** (`map/optionsMenu.ts`): ein Knopf oben im
  // Panel klappt es auf, und darin stehen dieselben Einträge mit denselben
  // Worten — kein zweites Menü mit anderen Namen.
  const gear = document.querySelector<HTMLButtonElement>('[data-action="options"]')!;
  expect(gear).not.toBeNull();
  expect(gear.closest('details')).toBeNull();
  expect(document.querySelector('[data-action="flat-view"]')).toBeNull();
  expect(document.querySelector('[data-action="stations"]')).toBeNull();
  const panel = document.querySelector<HTMLElement>('.orbital-options')!;
  expect(panel.hidden).toBe(true);
  gear.click();
  expect(panel.hidden).toBe(false);
  const labels = [...panel.querySelectorAll('strong')].map((one) => one.textContent);
  expect(labels).toEqual(
    expect.arrayContaining([
      'Ansicht',
      'Zuschauen: aus',
      'Aufmachen',
      'Menü',
      'Verbindung',
      'Ton',
      'Runde verlassen',
    ]),
  );
  const swap = panel.querySelector<HTMLButtonElement>('[data-switch-view="2d"]')!;
  expect(swap).not.toBeNull();
  expect(swap.textContent).toContain('2D von oben');
  swap.click();
  expect(switchView).toHaveBeenCalledWith('2d');
  expect(panel.hidden).toBe(true);
  // Und nichts sonst: kein Neustart, kein Test, keine Rollenwahl.
  expect(restart).not.toHaveBeenCalled();
  expect(testMission).not.toHaveBeenCalled();
  expect(stations).not.toHaveBeenCalled();
  // „Runde verlassen" führt in die Zentrale — dorthin, wo der Aufbau steht.
  gear.click();
  panel.querySelector<HTMLButtonElement>('[data-leave]')!.click();
  expect(stations).toHaveBeenCalledTimes(1);
});
