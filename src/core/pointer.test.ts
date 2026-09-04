/**
 * The pointer's bookkeeping: one laser per hand, each with its own hover.
 *
 * three.js is in here, but no WebGL — a raycaster against a plane is plain
 * geometry. What is worth holding on to is the rule that took two evenings in
 * the headset to get right: a hand that is holding something must never take
 * the ray away from the other one, and a ray resting on a panel may only ever
 * swallow *its own* hand's trigger.
 */
import * as THREE from 'three';
import { Pointer, type PointerHit } from './Pointer';
import { ControllerState, type Handedness, type XRInput } from './XRInput';
import type { PlayerRig } from './PlayerRig';

interface Panel {
  mesh: THREE.Mesh;
  hovers: Array<Handedness | null>;
  selects: Array<Handedness | null>;
}

let scene: THREE.Scene;
let pointer: Pointer;
let controllers: Record<Handedness, ControllerState>;
let input: XRInput;

beforeAll(() => {
  // The pointer listens for the pointer lock; nothing else needs a DOM.
  (globalThis as unknown as { document: unknown }).document ??= { addEventListener: () => {} };
});

beforeEach(() => {
  scene = new THREE.Scene();
  const rig = { camera: new THREE.PerspectiveCamera(), parent: scene } as unknown as PlayerRig;
  const canvas = {
    addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  } as unknown as HTMLCanvasElement;
  pointer = new Pointer(rig, canvas);

  controllers = { left: controller(0, -0.3), right: controller(1, 0.3) };
  input = {
    controllers: [controllers.left, controllers.right],
    get: (hand: Handedness) => controllers[hand],
  } as unknown as XRInput;
});

/** A controller at `x`, looking straight ahead. */
function controller(index: number, x: number): ControllerState {
  const targetRay = new THREE.Group();
  targetRay.position.set(x, 0, 0);
  scene.add(targetRay);
  const state = new ControllerState(
    index,
    targetRay,
    new THREE.Group(),
    new THREE.Group() as unknown as THREE.XRHandSpace,
  );
  state.connected = true;
  state.handedness = index === 0 ? 'left' : 'right';
  return state;
}

/** A panel a metre in front of one hand, registered with the pointer. */
function panel(x: number, ignore?: (hand: Handedness | null) => boolean): Panel {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial());
  mesh.position.set(x, 0, -1);
  scene.add(mesh);
  const entry: Panel = { mesh, hovers: [], selects: [] };
  pointer.add({
    object: mesh,
    ignore,
    onHover: (hit: PointerHit) => entry.hovers.push(hit.hand),
    onSelect: (hit: PointerHit) => entry.selects.push(hit.hand),
  });
  return entry;
}

function frame(): void {
  scene.updateMatrixWorld(true);
  pointer.update(input, true);
}

test('both hands point at once, each at its own panel', () => {
  const left = panel(-0.3);
  const right = panel(0.3);
  frame();

  expect(left.hovers).toEqual(['left']);
  expect(right.hovers).toEqual(['right']);
  expect(pointer.hoveringWith('left')).toBe(true);
  expect(pointer.hoveringWith('right')).toBe(true);
});

test('a trigger selects only what its own hand is aiming at', () => {
  const left = panel(-0.3);
  const right = panel(0.3);
  controllers.left.trigger.justPressed = true;
  frame();

  expect(left.selects).toEqual(['left']);
  expect(right.selects).toEqual([]);
});

test('a hand with its fists full has no ray, the other one keeps hers', () => {
  const left = panel(-0.3);
  const right = panel(0.3);
  pointer.busy.add('right');
  frame();

  expect(right.hovers).toEqual([]);
  expect(pointer.hoveringWith('right')).toBe(false);
  expect(left.hovers).toEqual(['left']);
  expect(pointer.hoveringWith('left')).toBe(true);
});

test('a panel that ignores the hand it rides on leaves that trigger alone', () => {
  const own = panel(-0.3, (hand) => hand === 'left');
  controllers.left.trigger.justPressed = true;
  frame();

  expect(own.hovers).toEqual([]);
  expect(own.selects).toEqual([]);
  expect(pointer.hoveringWith('left')).toBe(false);
});

test('the pointer switched off drops every hover', () => {
  const left = panel(-0.3);
  frame();
  expect(pointer.hovering).toBe(true);

  pointer.enabled = false;
  frame();
  expect(pointer.hovering).toBe(false);
  expect(pointer.hoveringWith('left')).toBe(false);
  expect(left.hovers).toEqual(['left']);
});
