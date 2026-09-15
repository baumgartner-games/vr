/** @jest-environment jsdom */
import * as THREE from 'three';
import { PlayerRig } from '../../core/PlayerRig';
import { PlayerAvatar, LAYER_SELF_ONLY } from '../../core/PlayerAvatar';
import { Pointer } from '../../core/Pointer';
import { ControllerState, type XRInput } from '../../core/XRInput';
import type { WorldContext } from '../../core/types';
import {
  aimForward,
  pickUsable,
  USE_CHEST,
  USE_RADIUS,
  type Usable,
  type UseCandidate,
} from '../../core/usable';
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
 *
 * **Benutzen geht durch den Kern** (Plan H, `core/usable.ts`): Das Schiff
 * meldet dem Wirt an, was benutzbar ist (`ShipHost.usable`), und `E` tut,
 * was `HauntingWorld.useForward` tut — Sonderfälle, dann `pickUsable` über
 * die angemeldeten Dinge, sonst das Licht. Genau das spielt `pressUse` nach.
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
let speed: number;
let menuToggle: jest.Mock;
let floating: FlashlightTool;
/** Was der Kompass gerade ansagt — die Welt rechnet es sonst selbst (`HauntingWorld.objectives`). */
let goals: MapGoal[];
/** Was das Schiff beim Wirt als benutzbar angemeldet hat (`ShipHost.usable`). */
let usables: Map<THREE.Object3D, Usable>;
/** Und die Halbmesser, die es dabei selbst genannt hat (`BindExtra.radius`). */
let radii: Map<THREE.Object3D, number>;

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
    frame: () => null,
    wear: jest.fn(),
    refreshWorldMenu: refresh,
  } as unknown as WorldContext;
  restart = jest.fn();
  equip = jest.fn();
  testMission = jest.fn();
  stations = jest.fn();
  speed = 1;
  goals = [];
  round = null;
  usables = new Map();
  radii = new Map();
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
    simulationSpeed: () => speed,
    setSimulationSpeed: (value) => {
      speed = value;
    },
    door: jest.fn(),
    usable: (object, usable, options) => {
      usables.set(object, usable);
      if (options?.radius !== undefined) radii.set(object, options.radius);
      else radii.delete(object);
    },
    unusable: (object) => {
      usables.delete(object);
      radii.delete(object);
    },
    travel: (at) => rig.placeAt(at),
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

/**
 * **Das Tempo der Bot-Runde steht im Optionsmenü** — dort, wo es die 2D-Welt
 * auch hat (`map/optionsMenu.speedKeys`): sechs Pillen, die gewählte leuchtet,
 * und der Knopf, der reihum zählte, ist aus der Test-Tafel weg. Nur in der
 * Bot-Runde: Wer selbst spielt, hat kein Tempo zu stellen.
 */
test('the bot round takes its speed from the options menu, one pill per step', () => {
  // Die Tafel zeichnet sich nach jedem Druck neu — das Zahnrad also jedes Mal
  // frisch nachschlagen.
  const gear = (): HTMLButtonElement =>
    document.querySelector<HTMLButtonElement>('[data-action="options"]')!;
  gear().click();
  const panel = document.querySelector<HTMLElement>('.orbital-options')!;
  expect(panel.hidden).toBe(false);
  expect(panel.querySelector('[data-speed]')).toBeNull();
  gear().click();
  expect(panel.hidden).toBe(true);
  experience.startBotRound();
  frame();
  expect(document.querySelector('[data-action="tempo"]')).toBeNull();
  gear().click();
  expect(panel.hidden).toBe(false);
  const pills = [...panel.querySelectorAll<HTMLButtonElement>('[data-speed]')];
  expect(pills.map((pill) => pill.dataset['speed'])).toEqual(['1', '2', '4', '8', '12', '16']);
  expect(panel.querySelector<HTMLButtonElement>('[data-speed].is-active')?.dataset['speed']).toBe(
    '1',
  );
  panel.querySelector<HTMLButtonElement>('[data-speed="12"]')!.click();
  expect(speed).toBe(12);
  // Das Menü bleibt offen und zeigt die neue Stufe.
  expect(panel.hidden).toBe(false);
  expect(panel.querySelector<HTMLButtonElement>('[data-speed].is-active')?.dataset['speed']).toBe(
    '12',
  );
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

/**
 * Eine Taste. `E` läuft nicht mehr über ein Fenster-Ereignis dieser Welt,
 * sondern über den Kern (`FlatControls` → `PlayerRig.requestUse` →
 * `HauntingWorld.useForward`); hier steht dafür `pressUse` — einmal je Druck,
 * nie beim Wiederholen. `Strg` bleibt das Fenster-Ereignis, das das Schiff
 * selbst hört (Ducken).
 */
function key(code: string, type = 'keydown', repeat = false): void {
  if (code === 'KeyE') {
    if (type === 'keydown' && !repeat) pressUse();
    return;
  }
  window.dispatchEvent(new KeyboardEvent(type, { code, repeat, bubbles: true, cancelable: true }));
}

/** Die angemeldeten Dinge als Kandidaten — wie `PortalWorld.collectUsables`. */
function candidates(): UseCandidate[] {
  const out: UseCandidate[] = [];
  for (const [object, usable] of usables) {
    if (!object.visible) continue;
    const box = new THREE.Box3().setFromObject(object);
    const size = box.isEmpty() ? 0 : Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
    out.push({
      usable,
      position: object.getWorldPosition(new THREE.Vector3()),
      radius: Math.max(radii.get(object) ?? size, USE_RADIUS),
      object,
    });
  }
  return out;
}

/** Was `HauntingWorld.useForward` tut, ohne Welt: Sonderfälle, das Ding vor der Figur, sonst das Licht. */
function pressUse(): void {
  if (experience.useSpecial()) return;
  rig.updateMatrixWorld(true);
  const at = new THREE.Vector3(rig.position.x, rig.getFloorY() + USE_CHEST, rig.position.z);
  const rigAhead = new THREE.Vector3(0, 0, -1).applyQuaternion(
    rig.getWorldQuaternion(new THREE.Quaternion()),
  );
  const forward = aimForward(
    false,
    rigAhead,
    rig.getHeadForward(new THREE.Vector3()),
    new THREE.Vector3(),
  );
  const pick = pickUsable(candidates(), at, forward);
  if (pick && pick.candidate.usable.use({ kind: 'player', at, forward })) return;
  experience.useEmpty();
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

/**
 * Place the eye in front of an existing surface and aim at its actual UV.
 * `side` −1 steht auf der anderen Seite der Fläche — für ein Ding, das man
 * von dort erreicht, wo man es abgelegt hat.
 */
function aim(mesh: THREE.Mesh, u = 0.5, v = 0.5, side = 1): void {
  mesh.updateWorldMatrix(true, false);
  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox!;
  const target = new THREE.Vector3(
    THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, u),
    THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, v),
    bounds.max.z,
  ).applyMatrix4(mesh.matrixWorld);
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(mesh.matrixWorld);
  // Eine Armlänge und noch eine halbe davor (`USE_REACH`): so weit reicht `A`.
  rig.setHeadWorldPosition(target.clone().addScaledVector(normal, 1.2 * side));
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

/**
 * **In der Brille zählt eine Berührung als „Benutzen"** (`Pointer.updatePoke`,
 * auch mit dem Controller). Für die Kistentür war das die Falle: Der Trigger
 * fing den Balken an, die Hand am Blatt brach ihn gleich wieder ab — derselbe
 * Knopf bricht ab —, und die Kiste ging in VR nie auf. Die Tür hört deshalb
 * nur auf den Trigger; das Ersatzteil dahinter darf man weiter greifen.
 */
test('a controller touching the cargo door neither opens it nor cancels the running chore', () => {
  menu('orbital:lab:tools');
  const cabinet = exhibits.cabinets.find((c) => c.id === 'training-kit')!;
  const tip = new THREE.Vector3();
  (input.controllers as unknown as object[]).push({
    tracked: true,
    handedness: 'right',
    getFingertip: (target: THREE.Vector3) => target.copy(tip),
  });
  // Die Hand liegt mitten auf dem Türblatt.
  cabinet.leaf.updateWorldMatrix(true, false);
  cabinet.leaf.getWorldPosition(tip);
  frame();
  frame();
  expect(experience.busy).toBeNull();
  expect(state.crew.opened).not.toContain('training-kit');
  // Der Trigger fängt an — und die Hand am Blatt nimmt es nicht wieder zurück.
  aim(cabinet.leaf);
  tap('KeyE');
  expect(experience.busy?.id).toBe('training-kit');
  (ctx.renderer.xr as unknown as { isPresenting: boolean }).isPresenting = true;
  tip.set(0, 10, 0);
  frame(0.1);
  cabinet.leaf.getWorldPosition(tip);
  for (let t = 0; t < CARGO_OPEN_SECONDS + 0.3; t += 0.1) frame(0.1);
  expect(experience.busy).toBeNull();
  expect(state.crew.opened).toContain('training-kit');
  // Das Ersatzteil dahinter lässt sich weiterhin mit der Hand nehmen.
  tip.set(0, 10, 0);
  frame(0.1);
  cabinet.lootMesh!.updateWorldMatrix(true, false);
  cabinet.lootMesh!.getWorldPosition(tip);
  frame(0.1);
  expect(state.crew.inventory).toContain('training-kit');
});

/**
 * **Im Headset ist der Kopf der Mensch** (`rules/chore.ts`,
 * `CHORE_LEASH_HEADSET`): Wer sich zur Kiste vorbeugt, trägt ihn ohne einen
 * Schritt gut vierzig Zentimeter weit. Am Schirm wäre das ein Abbruch — dort
 * steht der Kopf, wo die Tastatur ihn hinstellt.
 */
test('leaning towards the crate in the headset keeps the chore running, a step breaks it', () => {
  menu('orbital:lab:tools');
  const cabinet = exhibits.cabinets.find((c) => c.id === 'training-kit')!;
  const head = new THREE.Vector3();
  const lean = (metres: number): void => {
    rig.getHeadPosition(head);
    rig.setHeadWorldPosition(head.clone().setX(head.x + metres));
    scene.updateMatrixWorld(true);
  };
  aim(cabinet.leaf);
  tap('KeyE');
  expect(experience.busy?.id).toBe('training-kit');
  (ctx.renderer.xr as unknown as { isPresenting: boolean }).isPresenting = true;
  lean(0.4);
  frame(0.1);
  expect(experience.busy?.id).toBe('training-kit');
  lean(0.3);
  frame(0.1);
  expect(experience.busy).toBeNull();
  expect(say).toHaveBeenCalledWith(expect.stringContaining('abgebrochen'));
  expect(state.crew.opened).not.toContain('training-kit');
  // Am Schirm gilt weiter die kurze Leine.
  (ctx.renderer.xr as unknown as { isPresenting: boolean }).isPresenting = false;
  say.mockClear();
  aim(cabinet.leaf);
  tap('KeyE');
  expect(experience.busy?.id).toBe('training-kit');
  lean(0.4);
  frame(0.1);
  expect(experience.busy).toBeNull();
  expect(say).toHaveBeenCalledWith(expect.stringContaining('abgebrochen'));
});

test('the tool button offers found hand items and genuinely empty hands', () => {
  state.crew.inventory.push('radar', 'xray', 'medkit');
  // **Der Werkzeug-Knopf des Kerns** (`core/types.ToolChoice`): Lampe, Radar,
  // Röntgen — und Medkit, sobald eines im Inventar liegt. Die Tasten `1` und
  // `2` sind mit der gemalten Karte gegangen (Plan H).
  const choice = experience.toolChoice();
  expect(choice.options.map((one) => one.id)).toEqual(['flashlight', 'radar', 'xray', 'medkit']);
  expect(choice.current).toBe('flashlight');
  choice.choose('radar');
  frame(0.13);
  expect(experience.toolChoice().current).toBe('radar');
  expect(rig.camera.getObjectByName('desktop-held-scanner')?.visible).toBe(true);
  choice.choose('medkit');
  expect(experience.toolChoice().current).toBe('medkit');
  // „Frei" bleibt erreichbar — Dunkelheit ist eine Entscheidung.
  choice.choose(null);
  frame(0.13);
  expect(experience.toolChoice().current).toBeNull();
  expect(document.querySelector('.orbital-player__keys')?.textContent).toContain(
    'links: Hand frei',
  );
  expect(document.querySelector('.orbital-player__keys')?.textContent).toContain(
    'rechts: Hand frei',
  );
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

test('the free camera in the bot round is the walking figure, and a teaching room ends the round', () => {
  menu('orbital:simulation');
  // Solange die Kamera dem Bot folgt, steht das Gestell still; „Freie
  // Kamera" gibt es frei — die Figur läuft dann selbst durch das Schiff
  // (der Freiflug ist mit der gemalten Karte gegangen, Plan H).
  expect(rig.frozen).toBe(true);
  button('Freie Kamera').click();
  expect(rig.frozen).toBe(false);
  expect(document.querySelector('[data-action="overview"]')).toBeNull();
  expect(document.querySelector('[data-action="up"]')).toBeNull();
  button('Bot folgen').click();
  expect(rig.frozen).toBe(true);
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

test('from above the rig stands on the bot, because the top-down camera follows the rig', () => {
  (ctx as { topDown: boolean }).topDown = true;
  experience.startBotRound();
  frame(0.13);
  const bot = experience.botPosition!;
  expect(rig.position.x).toBeCloseTo(bot.x);
  expect(rig.position.z).toBeCloseTo(bot.z);
  expect(rig.position.y).toBeCloseTo(0);
  // Der Bot geht weiter — das Gestell zieht nach, ohne die Kamera zu drehen.
  const before = rig.camera.quaternion.clone();
  bot.x += 3;
  for (let i = 0; i < 40; i++) frame(0.05);
  expect(rig.position.x).toBeCloseTo(bot.x, 1);
  expect(rig.camera.quaternion.angleTo(before)).toBeCloseTo(0);
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
  expect(document.querySelector('.orbital-hud')).toBeNull();
  // Beim Kern ist nichts mehr angemeldet, und `Strg` duckt niemanden mehr.
  expect(usables.size).toBe(0);
  key('ControlLeft');
  for (let i = 0; i < 10; i++) rig.update(0.05, input, false);
  expect(rig.crouch).toBe(0);
  key('ControlLeft', 'keyup');
  pointer.update(input, false);
  expect(pointer.hovering).toBe(false);
});

test('desktop and VR use real tools; there is no persistent scanner or status HUD in a living VR view', () => {
  expect(rig.camera.getObjectByName('desktop-flashlight')).toBeInstanceOf(FlashlightTool);
  state.crew.inventory.push('radar', 'xray');
  // Der erste Schritt der linken Hand am Handgelenk ist die zweite Taschenlampe.
  menu('orbital:sensor');
  expect(rig.camera.getObjectByName('desktop-flashlight-left')?.visible).toBe(true);
  experience.toolChoice().choose('radar');
  frame(0.13);
  expect(rig.camera.getObjectByName('desktop-held-scanner')?.visible).toBe(true);
  expect(rig.camera.getObjectByName('tool-radar')).toBeInstanceOf(RadarTool);
  experience.toolChoice().choose('xray');
  frame(0.13);
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
  experience.toolChoice().choose(null);
  frame(0.13);
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
  // Die Jacke, mit Namen: Seit die Figur Ärmel und Beine hat, ist kein Netz
  // mehr **unmittelbares** Kind des Avatars — das erste, was `children.find`
  // hier fand, war früher eine Handkugel und ist heute eine Gruppe.
  const body = ctx.avatar.getObjectByName('avatar-coat')!;
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

test('bot radio remains visible when mission and test menus are collapsed', () => {
  experience.startBotRound();
  // Was der Techniker aus Zahlen der Runde meldet, kommt über die Welt
  // (`HauntingWorld.relay` → `log`) im selben Bild — und steht dann hier.
  experience.log('Techniker → Zentrale: Ersatzteil gefunden.');
  frame(0.13);
  const log = document.querySelector('[aria-label="Simulierter Funkverkehr"]')!;
  expect(log.closest('details')).toBeNull();
  expect(log.textContent).toContain('BOT-RUNDE');
  expect(log.textContent).toContain('Techniker → Zentrale');
});

/**
 * **Benutzen geht durch den Kern** (`core/usable.ts`, Plan H): Was im Schiff
 * `bind` bekommt, ist beim Wirt als `Usable` angemeldet — `A` von oben und
 * `E` am Schreibtisch finden es über `pickUsable`, der Saum des Kerns und der
 * Hinweis über der Figur kommen mit. Einen eigenen Stock und eigene Knöpfe
 * hat das Schiff nicht mehr; der Bordstock der Seite und der Werkzeug-Knopf
 * des Kerns tun das.
 */
describe('Benutzen über den Kern', () => {
  test('meldet Klappen, Teile, Konsolen, Tastenfelder und Türtafeln als benutzbar an', () => {
    const cabinet = exhibits.cabinets.find((c) => c.id.startsWith('cargo-') && c.loot)!;
    expect(usables.get(cabinet.leaf)?.usePrompt?.()).toBe('Frachtschrank öffnen / schließen');
    expect(usables.get(cabinet.lootMesh)?.usePrompt?.()).toMatch(/ nehmen$/);
    const console = exhibits.consoles.find((c) => !c.training)!;
    expect(usables.get(console.screen.mesh)?.usePrompt?.()).toBe(console.repair.title);
    const door = exhibits.doors.find((d) => d.id !== 'test-bay' && d.id !== 'training-door')!;
    expect(usables.get(door.panel.mesh)?.usePrompt?.()).toBe('Schiebetür bedienen');
    const locker = exhibits.lockers[0]!;
    const keypad = locker.group.children.find((o) => o.userData.locker === locker.id)!;
    expect(usables.get(keypad)?.usePrompt?.()).toBe('In den Schutzschrank');
    // Der Hinweis über der Figur trägt kein „E: " — die Taste sagt der Kern.
    for (const usable of usables.values()) expect(usable.usePrompt?.() ?? '').not.toMatch(/^E:/);
    // Kein eigener Stock, keine eigenen Knöpfe über der Szene.
    expect(document.querySelector('.flat.ship3d')).toBeNull();
    expect(document.querySelector('.flat__key')).toBeNull();
    expect(document.querySelector('.flat__stick')).toBeNull();
  });

  /**
   * **Im Leeren ist Benutzen der Lichtschalter.** „Wenn ich auf keine Kiste
   * oder Tür schaue, will ich mit Benutzen die Taschenlampe an- und ausmachen
   * können." Der Kern hat nichts gefunden, also gilt der Druck der Lampe — und
   * sie bleibt dabei in der Hand.
   */
  test('schaltet mit Benutzen das Licht, solange nichts vor einem liegt', () => {
    lookAtNothing();
    expect(experience.flashlightActive).toBe(true);
    tap('KeyE');
    expect(experience.flashlightActive).toBe(false);
    expect(say).toHaveBeenCalledWith('Taschenlampe aus.');
    expect(rig.camera.getObjectByName('desktop-held-tool')?.visible).toBe(true);
    tap('KeyE');
    expect(experience.flashlightActive).toBe(true);
    expect(say).toHaveBeenCalledWith('Taschenlampe an.');
  });

  test('holt die Lampe zurück in die leere Hand, statt nur zu blättern', () => {
    lookAtNothing();
    experience.toolChoice().choose(null);
    frame(0.13);
    expect(experience.flashlightActive).toBe(false);
    expect(rig.camera.getObjectByName('desktop-held-tool')?.visible).toBe(false);
    tap('KeyE');
    expect(experience.flashlightActive).toBe(true);
    expect(rig.camera.getObjectByName('desktop-held-tool')?.visible).toBe(true);
  });

  /** Vor einer Kiste bleibt Benutzen das, was es immer war. */
  test('lässt das Ziel vor der Nase Vorrang haben', () => {
    const cabinet = exhibits.cabinets.find((c) => c.id.startsWith('cargo-'))!;
    aim(cabinet.leaf);
    tap('KeyE');
    for (let t = 0; t < CARGO_OPEN_SECONDS + 0.3; t += 0.1) frame(0.1);
    expect(state.crew.opened).toContain(cabinet.id);
    // Das Licht hat dabei nichts zu suchen — auch nicht beim zweiten Druck
    // in die Sperrfrist hinein.
    tap('KeyE');
    expect(experience.flashlightActive).toBe(true);
    expect(say).not.toHaveBeenCalledWith('Taschenlampe aus.');
  });

  /**
   * **Vor der offenen Kiste nimmt `A` das Teil.** Das Blatt liegt vor dem
   * Teil, und `pickUsable` nähme sonst immer das Blatt — die Kiste ginge zu,
   * statt dass man bekäme, wofür man sie aufgemacht hat.
   */
  test('nimmt aus der offenen Kiste das Teil, statt sie zu schließen', () => {
    const cabinet = exhibits.cabinets.find((one) => spec.tasks.some((t) => t.id === one.loot))!;
    openCrate(cabinet.leaf);
    expect(usables.get(cabinet.leaf)?.usePrompt?.()).toMatch(/ nehmen$/);
    tap('KeyE');
    expect(state.crew.inventory).toContain(cabinet.loot);
    expect(state.crew.opened).toContain(cabinet.id);
    expect(usables.get(cabinet.leaf)?.usePrompt?.()).toBe('Frachtschrank öffnen / schließen');
  });

  /**
   * **`A` an der Konsole** öffnet den Wartungskasten; das Rätsel selbst steht
   * als Knöpfe in der Tafel — von oben zielt niemand auf eine Stelle der
   * Konsolentafel.
   */
  test('öffnet an der Konsole den Wartungskasten und verweist auf die Tafel', () => {
    menu('orbital:lab:repairs');
    const console = exhibits.consoles.find((c) => c.training && c.repair.puzzle === 'wires')!;
    aim(console.screen.mesh);
    const panel = document.querySelector<HTMLDetailsElement>('details[data-main]')!;
    panel.open = false;
    tap('KeyE');
    expect(console.practice?.open).toBe(true);
    expect(document.querySelector<HTMLDetailsElement>('details[data-main]')!.open).toBe(true);
    expect(button('Start ▲')).toBeDefined();
    tap('KeyE');
    expect(say).toHaveBeenCalledWith(expect.stringContaining('Rätsel in der Tafel'));
    expect(console.practice?.open).toBe(true);
  });

  test('bietet nur an, was in der Fracht war', () => {
    const choice = experience.toolChoice();
    expect(choice.options.map((one) => one.id)).toEqual(['flashlight', 'radar', 'xray']);
    choice.choose('radar');
    expect(say).toHaveBeenCalledWith(expect.stringContaining('liegt noch in der Fracht'));
    expect(experience.toolChoice().current).toBe('flashlight');
    choice.choose('medkit');
    expect(say).toHaveBeenCalledWith('Kein Medkit im Inventar.');
    expect(experience.toolChoice().current).toBe('flashlight');
  });

  /**
   * **Ducken bleibt** — die eine Taste dieser Welt neben dem Kern, weil das
   * Spiel an der Lautstärke hängt (`mission.CROUCH_FACTOR`): `Strg` gehalten,
   * oder der Umschalter in der Tafel.
   */
  test('duckt sich mit Strg und mit dem Umschalter in der Tafel', () => {
    key('ControlLeft');
    for (let i = 0; i < 10; i++) frame(0.05);
    expect(rig.crouch).toBeGreaterThan(0.5);
    key('ControlLeft', 'keyup');
    for (let i = 0; i < 40; i++) frame(0.05);
    expect(rig.crouch).toBeLessThan(0.2);
    const toggle = (): HTMLButtonElement =>
      document.querySelector<HTMLButtonElement>('[data-action="crouch"]')!;
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    toggle().click();
    for (let i = 0; i < 10; i++) frame(0.05);
    expect(rig.crouch).toBeGreaterThan(0.5);
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    toggle().click();
    for (let i = 0; i < 40; i++) frame(0.05);
    expect(rig.crouch).toBeLessThan(0.2);
  });

  /**
   * **Der Streifen am Bildschirm ist DOM** (`.orbital-hud`), in der Brille
   * hängt er an der Kamera: Die Kamera von oben ist eine andere, und einen
   * Streifen an der Rig-Kamera sähe man dort nie.
   */
  test('zeigt den Streifen am Bildschirm als DOM und in der Brille an der Kamera', () => {
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
    const strip = document.querySelector<HTMLElement>('.orbital-hud')!;
    expect(strip.hidden).toBe(false);
    expect(strip.textContent).toContain('O₂');
    expect(exhibits.hud.mesh.visible).toBe(false);
    (ctx.renderer.xr as unknown as { isPresenting: boolean }).isPresenting = true;
    frame(0.3);
    expect(strip.hidden).toBe(true);
    expect(exhibits.hud.mesh.visible).toBe(true);
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
 * **„Ablegen" in der Tafel legt das Teil ab** — und wo es liegt, steht im
 * Stand, damit der Archivar es melden kann (`HauntState.dropped`, sichtbar
 * erst nach `DROPPED_SEEN`). Die Taste `G` ist mit der gemalten Karte gegangen.
 */
test('Ablegen legt das Ersatzteil im Gang ab, und E nimmt es wieder auf', () => {
  const crate = exhibits.cabinets.find((one) => spec.tasks.some((t) => t.id === one.loot))!;
  openCrate(crate.leaf);
  aim(crate.lootMesh as THREE.Mesh);
  tap('KeyE');
  expect(state.crew.inventory).toContain(crate.loot);

  state.time = 42;
  frame(0.13);
  document.querySelector<HTMLButtonElement>('[data-action="drop"]')!.click();
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
  // Von der Kiste weg: Zwischen Teil und Kiste stünde man in deren Blatt.
  aim(lying, 0.5, 0.5, -1);
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
 * **Das Zahnrad des Technikers** (`map/optionsMenu.ts`): ein Knopf oben im
 * Panel klappt es auf. Einen Knopf „2D von oben" gibt es darin nicht mehr —
 * von oben oder aus den Augen ist _Menü → Ansicht_ des Kerns (Plan H,
 * `docs/plan-haunting-1m.md`), kein Eintrag dieser Welt.
 */
test('das Zahnrad des Technikers öffnet das Optionsmenü — ohne Knopf für die Karte von oben', () => {
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
      'Zurück zu den Rollen',
    ]),
  );
  expect(panel.querySelector('[data-switch-view]')).toBeNull();
  expect(panel.textContent).not.toContain('2D von oben');
  // Und nichts sonst: kein Neustart, kein Test, keine Rollenwahl.
  expect(restart).not.toHaveBeenCalled();
  expect(testMission).not.toHaveBeenCalled();
  expect(stations).not.toHaveBeenCalled();
  // „Zurück zu den Rollen" führt in die Zentrale — dorthin, wo der Aufbau steht.
  panel.querySelector<HTMLButtonElement>('[data-leave]')!.click();
  expect(stations).toHaveBeenCalledTimes(1);
});
