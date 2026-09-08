import * as THREE from 'three';
import { PlayerRig } from '../../core/PlayerRig';
import type { Handedness, XRInput } from '../../core/XRInput';
import { HauntingComfort } from './HauntingComfort';
import {
  DEFAULT_COMFORT,
  comfortSettings,
  comfortVignetteTarget,
  stepComfortVignette,
} from './comfortSettings';

test('malformed preferences cannot enable arbitrary turn speeds or vibration values', () => {
  for (const value of [
    undefined,
    null,
    [],
    'smooth',
    { turn: 'smooth999', vignette: 100, haptics: 1 },
  ]) {
    expect(comfortSettings(value)).toEqual(DEFAULT_COMFORT);
  }
  expect(comfortSettings({ turn: 'smooth45', vignette: 'off', haptics: false })).toEqual({
    turn: 'smooth45',
    vignette: 'off',
    haptics: false,
  });
});

test('comfort edge is absent at rest, optional, capped, and frame-rate independent', () => {
  expect(comfortVignetteTarget('soft', 0, false)).toBe(0);
  expect(comfortVignetteTarget('off', 100, true)).toBe(0);
  expect(comfortVignetteTarget('strong', 100, true)).toBe(0.86);
  expect(comfortVignetteTarget('soft', NaN, false)).toBe(0);
  const run = (hz: number) => {
    let amount = 0;
    for (let i = 0; i < hz; i++) amount = stepComfortVignette(amount, 0.52, 1 / hz);
    for (let i = 0; i < hz; i++) amount = stepComfortVignette(amount, 0, 1 / hz);
    return amount;
  };
  expect(run(72)).toBeCloseTo(run(120), 8);
  expect(run(90)).toBeLessThan(0.003);
  expect(stepComfortVignette(NaN, Infinity, NaN)).toBe(0);
});

function setup() {
  const rig = new PlayerRig(
    { xr: { isPresenting: false } } as unknown as THREE.WebGLRenderer,
    new THREE.PerspectiveCamera(),
  );
  rig.updateMatrixWorld(true);
  const left = { thumbstick: new THREE.Vector2(), stick: { pressed: false }, pulse: jest.fn() };
  const right = {
    thumbstick: new THREE.Vector2(),
    stick: { pressed: false },
    primary: { justPressed: false },
    pulse: jest.fn(),
  };
  const input = {
    get: (hand: Handedness) => (hand === 'left' ? left : right),
  } as unknown as XRInput;
  return { rig, left, right, input };
}

test('existing rig snap turning still happens once per deflection by default', () => {
  const { rig, right, input } = setup();
  right.thumbstick.x = 1;
  rig.update(1 / 90, input, true);
  const after = rig.quaternion.clone();
  expect(new THREE.Euler().setFromQuaternion(after, 'YXZ').y).toBeCloseTo(-Math.PI / 6);
  for (let i = 0; i < 90; i++) rig.update(1 / 90, input, true);
  expect(rig.quaternion.angleTo(after)).toBeCloseTo(0);
  right.thumbstick.x = 0;
  rig.update(1 / 90, input, true);
  right.thumbstick.x = 1;
  rig.update(1 / 90, input, true);
  expect(new THREE.Euler().setFromQuaternion(rig.quaternion, 'YXZ').y).toBeCloseTo(-Math.PI / 3);
});

test('smooth turn produces the configured angle at different frame rates and respects menu capture', () => {
  for (const hz of [72, 90, 120]) {
    const { rig, right, input } = setup();
    rig.turnMode = 'smooth';
    rig.smoothTurnSpeed = Math.PI / 3;
    right.thumbstick.x = 1;
    for (let i = 0; i < hz; i++) rig.update(1 / hz, input, true);
    expect(new THREE.Euler().setFromQuaternion(rig.quaternion, 'YXZ').y).toBeCloseTo(-Math.PI / 3);
    const beforeMenu = rig.quaternion.clone();
    rig.menuStick = 'right';
    rig.update(1 / hz, input, true);
    expect(rig.quaternion.angleTo(beforeMenu)).toBeCloseTo(0);
    rig.menuStick = null;
    right.thumbstick.x = 0.1;
    rig.update(1 / hz, input, true);
    expect(rig.quaternion.angleTo(beforeMenu)).toBeCloseTo(0);
  }
});

test('leaving Haunting restores the original turn preferences and removes the comfort geometry', () => {
  const { rig, input } = setup();
  rig.snapAngle = 0.4;
  rig.smoothTurnSpeed = 1.7;
  const comfort = new HauntingComfort({
    rig,
    camera: rig.camera,
    input,
    presenting: () => true,
    enabled: () => true,
  });
  comfort.set({ turn: 'smooth90' });
  expect(rig.turnMode).toBe('smooth');
  expect(rig.smoothTurnSpeed).toBeCloseTo(Math.PI / 2);
  expect(rig.camera.getObjectByName('haunting-vr-comfort-border')).toBeDefined();
  comfort.dispose();
  expect(rig.turnMode).toBe('snap');
  expect(rig.snapAngle).toBe(0.4);
  expect(rig.smoothTurnSpeed).toBe(1.7);
  expect(rig.camera.getObjectByName('haunting-vr-comfort-border')).toBeUndefined();
});

test('real head motion does not dim the view and disabled comfort clears the edge immediately', () => {
  const { rig, input } = setup();
  const comfort = new HauntingComfort({
    rig,
    camera: rig.camera,
    input,
    presenting: () => true,
    enabled: () => true,
  });
  comfort.update(1 / 90);
  rig.camera.position.x += 0.02;
  rig.camera.rotation.y += 0.4;
  comfort.update(1 / 90);
  const mask = rig.camera.getObjectByName('haunting-vr-comfort-border')!;
  expect(mask.visible).toBe(false);
  rig.position.z += 0.03;
  comfort.update(1 / 90);
  expect(mask.visible).toBe(true);
  comfort.set({ vignette: 'off' });
  comfort.update(1 / 90);
  expect(mask.visible).toBe(false);
  comfort.dispose();
});

test('interaction pulses belong to the selecting hand, are rate limited, and respect the toggle', () => {
  const { rig, input, left, right } = setup();
  const comfort = new HauntingComfort({
    rig,
    camera: rig.camera,
    input,
    presenting: () => true,
    enabled: () => true,
  });
  comfort.pulse('door', 'left');
  comfort.pulse('door', 'left');
  expect(left.pulse).toHaveBeenCalledTimes(1);
  expect(right.pulse).not.toHaveBeenCalled();
  comfort.update(0.08);
  comfort.pulse('door', 'left');
  expect(left.pulse).toHaveBeenCalledTimes(2);
  comfort.set({ haptics: false });
  comfort.pulse('success');
  expect(right.pulse).not.toHaveBeenCalled();
  comfort.dispose();
});
