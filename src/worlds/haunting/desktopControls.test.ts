import * as THREE from 'three';
import { PlayerRig } from '../../core/PlayerRig';
import { Pointer } from '../../core/Pointer';
import type { XRInput } from '../../core/XRInput';
import { desktopFlightVelocity, HauntingDesktopControls } from './desktopControls';

test('flight follows look pitch and right remains horizontal after turning', () => {
  const rising = desktopFlightVelocity(new Set(['KeyW']), { x: 0, y: 1, z: -1 });
  expect(rising.y).toBeCloseTo(Math.sqrt(8));
  expect(rising.z).toBeCloseTo(-Math.sqrt(8));
  const right = desktopFlightVelocity(new Set(['KeyD']), { x: 1, y: 1, z: 0 });
  expect(right).toEqual({ x: 0, y: 0, z: 4 });
});

test('diagonal and vertical combinations cannot exceed flight speed', () => {
  for (const keys of [['KeyW'], ['KeyW', 'KeyD'], ['KeyW', 'KeyD', 'Space']]) {
    const v = desktopFlightVelocity(new Set(keys), { x: 0, y: 0, z: -1 });
    expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(4);
  }
  const v = desktopFlightVelocity(new Set(['KeyD', 'ShiftRight']), { x: 0, y: 0, z: -1 });
  expect(v.x).toBeCloseTo(7.2);
});

test('opposed inputs cancel, Ctrl descends, and vertical look keeps strafe finite', () => {
  const stationary = desktopFlightVelocity(new Set(['KeyW', 'KeyS', 'Space', 'ControlLeft']), {
    x: 0,
    y: 0,
    z: -1,
  });
  expect(Math.hypot(stationary.x, stationary.y, stationary.z)).toBe(0);
  expect(desktopFlightVelocity(new Set(['ControlRight']), { x: 0, y: 1, z: 0 }).y).toBe(-4);
  expect(desktopFlightVelocity(new Set(['KeyD']), { x: 0, y: 1, z: 0 }).x).toBe(4);
});

let events: EventTarget;
let page: EventTarget & { activeElement: unknown; hidden: boolean };
let rig: PlayerRig;
let keys: HauntingDesktopControls;
let flight: boolean;
let enabled: boolean;
let canMove: boolean;
let trigger: jest.Mock;
let cycle: jest.Mock;
let interact: jest.Mock;

beforeEach(() => {
  events = new EventTarget();
  page = Object.assign(new EventTarget(), { activeElement: null, hidden: false });
  Object.assign(globalThis, { window: events, document: page });
  rig = new PlayerRig(
    { xr: { isPresenting: false } } as unknown as THREE.WebGLRenderer,
    new THREE.PerspectiveCamera(),
  );
  rig.updateMatrixWorld(true);
  flight = false;
  enabled = true;
  canMove = true;
  trigger = jest.fn();
  cycle = jest.fn();
  interact = jest.fn().mockReturnValue(false);
  keys = new HauntingDesktopControls({
    rig,
    pointer: { setKeyboardTrigger: trigger } as unknown as Pointer,
    enabled: () => enabled,
    presenting: () => false,
    simulation: () => flight,
    canMove: () => canMove,
    cycleHand: cycle,
    interact,
  });
});

afterEach(() => keys.dispose());

function key(code: string, type = 'keydown', repeat = false): void {
  events.dispatchEvent(
    Object.assign(new Event(type, { cancelable: true }), {
      code,
      repeat,
      altKey: false,
      metaKey: false,
    }),
  );
}

test('WASD moves the frozen simulation camera and a resumed tab cannot cause a jump', () => {
  flight = true;
  rig.frozen = rig.paused = true;
  key('KeyW');
  keys.update(0.05);
  expect(rig.position.z).toBeCloseTo(-0.2);
  keys.update(30);
  expect(rig.position.z).toBeCloseTo(-0.4);
  key('KeyW', 'keyup');
  keys.update(0.05);
  expect(rig.position.z).toBeCloseTo(-0.4);
});

test('holding Ctrl changes real eye height without moving the feet through the floor', () => {
  rig.position.y = 5;
  const standing = rig.getHeadHeight();
  key('ControlLeft');
  for (let i = 0; i < 8; i++) keys.update(0.05);
  expect(rig.getHeadHeight()).toBeCloseTo(standing - rig.crouchDepth);
  expect(rig.getFloorY()).toBeCloseTo(5);
  keys.dispose();
  expect(rig.getHeadHeight()).toBeCloseTo(standing);
  expect(rig.getFloorY()).toBeCloseTo(5);
});

test('blur and switching to a text field cancel movement and release the aimed trigger', () => {
  flight = true;
  key('KeyW');
  key('KeyE');
  keys.update(0.05);
  events.dispatchEvent(new Event('blur'));
  keys.update(0.05);
  expect(rig.position.z).toBeCloseTo(-0.2);
  expect(trigger).toHaveBeenLastCalledWith(false, true);
  key('KeyW');
  page.activeElement = { tagName: 'TEXTAREA' };
  keys.update(0.05);
  key('Digit1');
  expect(cycle).not.toHaveBeenCalled();
  page.activeElement = null;
  keys.update(0.05);
  expect(rig.position.z).toBeCloseTo(-0.2);
});

test('1 and 2 cycle the intended hands once per press and menus suppress all actions', () => {
  key('Digit1');
  key('Digit1', 'keydown', true);
  key('Digit2');
  expect(cycle.mock.calls).toEqual([['left'], ['right']]);
  key('Digit1', 'keyup');
  key('Digit1');
  expect(cycle.mock.calls).toEqual([['left'], ['right'], ['left']]);
  enabled = false;
  key('KeyE');
  expect(trigger).not.toHaveBeenCalled();
});

test('hidden and incapacitated technicians cannot use flight movement', () => {
  flight = true;
  canMove = false;
  key('Space');
  key('KeyW');
  keys.update(0.05);
  expect(rig.position.length()).toBe(0);
});

test('leaving cover or using an equipped item consumes E before the targeted keypad', () => {
  interact.mockReturnValue(true);
  key('KeyE');
  key('KeyE', 'keydown', true);
  expect(interact).toHaveBeenCalledTimes(1);
  expect(trigger).not.toHaveBeenCalled();
  key('KeyE', 'keyup');
  interact.mockReturnValue(false);
  key('KeyE');
  expect(trigger).toHaveBeenLastCalledWith(true);
});

test('E uses the actual aimed ray and preserves press, hold, and release semantics', () => {
  const canvas = { addEventListener: () => {} } as unknown as HTMLCanvasElement;
  const pointer = new Pointer(rig, canvas);
  const input = { controllers: [] } as unknown as XRInput;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial());
  panel.position.set(0, rig.flatEyeHeight, -2);
  panel.updateMatrixWorld(true);
  const select = jest.fn(),
    hold = jest.fn(),
    release = jest.fn();
  pointer.add({ object: panel, onSelect: select, onHold: hold, onRelease: release });
  pointer.setKeyboardTrigger(true);
  pointer.update(input, false);
  pointer.update(input, false);
  expect(select).toHaveBeenCalledTimes(1);
  expect(select.mock.calls[0]![0].uv.toArray()).toEqual([0.5, 0.5]);
  expect(hold).toHaveBeenCalledTimes(1);
  pointer.setKeyboardTrigger(false);
  pointer.update(input, false);
  expect(release).toHaveBeenCalledTimes(1);
  // A quick tap between frames still selects once.
  pointer.setKeyboardTrigger(true);
  pointer.setKeyboardTrigger(false);
  pointer.update(input, false);
  expect(select).toHaveBeenCalledTimes(2);
  // Losing focus cancels a queued press; it cannot fire after returning.
  pointer.setKeyboardTrigger(true);
  pointer.setKeyboardTrigger(false, true);
  pointer.update(input, false);
  expect(select).toHaveBeenCalledTimes(2);
});
