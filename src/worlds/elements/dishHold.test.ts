/**
 * **Das Ding in der Hand, über den Halterzylinder** (`dishHold.ts`).
 *
 * Geprüft wird die Rechnung selbst — dass der Zylinder im Ding, in die Hand
 * gelegt, genau im Standardgriff landet —, dass ein Teller dabei bleibt, wo er
 * immer hing, dass das Hörnchen senkrecht in der Faust steht, und dass die
 * Knöpfe der Seite auf der Raste laufen.
 */

const store = new Map<string, string>();

beforeAll(() => {
  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
});

import { conjugate, multiplyQuat, rotateVec, type Quat, type Vec3 } from '../portal/tools/aim';
import { STANDARD_GRIP_IN_HAND } from '../portal/tools/gripFit';
import { poseFromReadout } from '../portal/tools/toolPose';
import {
  DISH_GRIP,
  DISH_HOLDS,
  dishGripInHand,
  dishGripLine,
  LEGACY_HOLD,
  defaultDishHold,
  dishHold,
  dishHoldStored,
  dishInHand,
  forgetDishHolds,
  heldItemOf,
  gripHandLine,
  holdLine,
  saveDishHold,
  stepHold,
  type DishHold,
} from './dishHold';
import { elementById } from './elementCatalog';

const ZERO: Vec3 = { x: 0, y: 0, z: 0 };
const ONE: Quat = { x: 0, y: 0, z: 0, w: 1 };

/** Wo der Zylinder landet, wenn das Ding so in der Hand liegt. */
function cylinderInHand(hold: DishHold): { position: Vec3; rotation: Quat } {
  const dish = dishInHand(hold);
  const cylinder = poseFromReadout(hold);
  const offset = rotateVec(cylinder.position, dish.rotation, { ...ZERO });
  return {
    position: {
      x: dish.position.x + offset.x,
      y: dish.position.y + offset.y,
      z: dish.position.z + offset.z,
    },
    rotation: multiplyQuat(dish.rotation, cylinder.rotation, { ...ONE }),
  };
}

/** Der Winkel zwischen zwei Drehungen, in Grad. */
function angle(a: Quat, b: Quat): number {
  const d = multiplyQuat(conjugate(a, { ...ONE }), b, { ...ONE });
  return (2 * Math.acos(Math.min(1, Math.abs(d.w))) * 180) / Math.PI;
}

describe('das Ding in der Hand', () => {
  it('legt den Zylinder im Ding genau auf den Standardgriff — bei jeder Haltung', () => {
    const holds: DishHold[] = [
      LEGACY_HOLD,
      DISH_HOLDS.cone!,
      { x: 3, y: -4, z: 7.5, pitch: 30, yaw: -60, roll: 110 },
    ];
    for (const hold of holds) {
      const at = cylinderInHand(hold);
      const grip = STANDARD_GRIP_IN_HAND;
      expect(at.position.x).toBeCloseTo(grip.position.x, 9);
      expect(at.position.y).toBeCloseTo(grip.position.y, 9);
      expect(at.position.z).toBeCloseTo(grip.position.z, 9);
      expect(angle(at.rotation, grip.rotation)).toBeLessThan(1e-4);
    }
  });

  it('lässt alles ohne eigene Haltung dort hängen, wo es bisher hing', () => {
    const plate = dishInHand(defaultDishHold('plate'));
    // 2 cm unter, 8 cm vor dem Griffpunkt, ungedreht — bis auf die Rundung
    // der Haltung auf ganze Grad und Millimeter.
    expect(plate.position.x).toBeCloseTo(0, 3);
    expect(plate.position.y).toBeCloseTo(-0.02, 2);
    expect(plate.position.z).toBeCloseTo(-0.08, 2);
    expect(angle(plate.rotation, ONE)).toBeLessThan(1);
  });

  it('kippt das Hörnchen um die eingestellten 40° gegen die Achse des Zylinders', () => {
    const cone = dishInHand(defaultDishHold('cone'));
    const axis = rotateVec({ x: 0, y: 1, z: 0 }, cone.rotation, { ...ZERO });
    const grip = rotateVec({ x: 0, y: 1, z: 0 }, STANDARD_GRIP_IN_HAND.rotation, { ...ZERO });
    const cos = axis.x * grip.x + axis.y * grip.y + axis.z * grip.z;
    expect((Math.acos(cos) * 180) / Math.PI).toBeCloseTo(40, 6);
    // Die Spitze sitzt unter der Faust, 5 cm die Achse hinunter.
    const tip = cone.position;
    const fist = STANDARD_GRIP_IN_HAND.position;
    expect(Math.hypot(tip.x - fist.x, tip.y - fist.y, tip.z - fist.z)).toBeCloseTo(0.05, 6);
    expect(tip.y).toBeLessThan(fist.y);
  });

  it('spiegelt die Lage für die linke Hand', () => {
    const hold: DishHold = { x: 2, y: 5, z: -1, pitch: 10, yaw: 20, roll: 30 };
    const right = dishInHand(hold, 'right');
    const left = dishInHand(hold, 'left');
    expect(left.position.x).toBeCloseTo(-right.position.x, 9);
    expect(left.position.y).toBeCloseTo(right.position.y, 9);
    expect(left.position.z).toBeCloseTo(right.position.z, 9);
    expect(left.rotation.y).toBeCloseTo(-right.rotation.y, 9);
    expect(left.rotation.z).toBeCloseTo(-right.rotation.z, 9);
  });
});

describe('was ein Möbel in die Hand gibt', () => {
  it('der Eisstand das Hörnchen, der Herd seine Pfanne, die Wanne sich selbst', () => {
    expect(heldItemOf(elementById('ice-stand'))).toBe('cone');
    expect(heldItemOf(elementById('stove'))).toBe('pan');
    expect(heldItemOf(elementById('ice-tray-vanilla'))).toBe('tray');
    expect(heldItemOf(elementById('counter'))).toBeNull();
  });
});

describe('die Knöpfe der Seite', () => {
  it('laufen in 10°-Schritten und springen von zwischendrin zuerst auf die Raste', () => {
    expect(stepHold(0, 10, 1, true)).toBe(10);
    expect(stepHold(-43, 10, 1, true)).toBe(-40);
    expect(stepHold(-43, 10, -1, true)).toBe(-50);
    expect(stepHold(-40, 10, -1, true)).toBe(-50);
    expect(stepHold(180, 10, 1, true)).toBe(-170);
    expect(stepHold(-170, 10, -1, true)).toBe(180);
    expect(stepHold(8, 0.5, 1, false)).toBe(8.5);
    expect(stepHold(2.3, 0.5, -1, false)).toBe(2);
  });

  it('schreiben eine Zeile, die so in DISH_HOLDS stehen kann', () => {
    expect(holdLine('cone', DISH_HOLDS.cone!)).toBe(
      'cone: { x: 0, y: 5, z: 0, pitch: 40, yaw: 0, roll: 0 },',
    );
    expect(holdLine('plate-dirty', DISH_HOLDS.cone!)).toMatch(/^'plate-dirty': /);
  });
});

describe('der Speicher', () => {
  beforeEach(() => {
    store.clear();
    forgetDishHolds();
  });

  it('gibt die eingestellte Haltung heraus und nach dem Zurücksetzen wieder die aus dem Code', () => {
    expect(dishHold('cone')).toEqual(DISH_HOLDS.cone);
    expect(dishHoldStored('cone')).toBe(false);
    const mine: DishHold = { x: 1, y: 6, z: -0.5, pitch: 10, yaw: 0, roll: -20 };
    saveDishHold('cone', mine);
    forgetDishHolds();
    expect(dishHold('cone')).toEqual(mine);
    expect(dishHoldStored('cone')).toBe(true);
    saveDishHold('cone', null);
    expect(dishHold('cone')).toEqual(DISH_HOLDS.cone);
  });
});

describe('gripHandLine', () => {
  it('gibt die sechs Zahlen der Hand und sagt, woher sie kommen', () => {
    const pose = { x: 1.7, y: 2.4, z: 2.7, pitch: -43, yaw: -17, roll: -90 };
    expect(gripHandLine(pose, false)).toBe(
      'GRIP_HAND_POSE (rechts, aus dem Code): { x: 1.7, y: 2.4, z: 2.7, pitch: -43, yaw: -17, roll: -90 },',
    );
    expect(gripHandLine(pose, true)).toMatch(/^GRIP_HAND_POSE \(rechts, eingestellt\)/);
  });
});

describe('die Neigung des Zylinders für alle', () => {
  it('ist ohne Einstellung genau der Standardgriff', () => {
    const grip = dishGripInHand(DISH_GRIP);
    expect(grip.position.x).toBeCloseTo(STANDARD_GRIP_IN_HAND.position.x, 9);
    expect(grip.position.y).toBeCloseTo(STANDARD_GRIP_IN_HAND.position.y, 9);
    expect(grip.position.z).toBeCloseTo(STANDARD_GRIP_IN_HAND.position.z, 9);
    expect(angle(grip.rotation, STANDARD_GRIP_IN_HAND.rotation)).toBeLessThan(1e-4);
  });

  it('dreht mit Roll um den Pfeil: der Pfeil bleibt, die Achse kippt', () => {
    const tilt: DishHold = { ...DISH_GRIP, roll: 40 };
    const grip = dishGripInHand(tilt);
    const arrow = rotateVec({ x: 0, y: 0, z: -1 }, grip.rotation, { ...ZERO });
    const before = rotateVec({ x: 0, y: 0, z: -1 }, STANDARD_GRIP_IN_HAND.rotation, { ...ZERO });
    expect(arrow.x).toBeCloseTo(before.x, 9);
    expect(arrow.y).toBeCloseTo(before.y, 9);
    expect(arrow.z).toBeCloseTo(before.z, 9);
    expect(angle(grip.rotation, STANDARD_GRIP_IN_HAND.rotation)).toBeCloseTo(40, 6);
  });

  it('legt den Zylinder jedes Dings in den geneigten Griff', () => {
    const tilt: DishHold = { x: 1, y: -2, z: 0.5, pitch: 10, yaw: 0, roll: 30 };
    const hold = DISH_HOLDS.pan!;
    const dish = dishInHand(hold, 'right', tilt);
    const cylinder = poseFromReadout(hold);
    const offset = rotateVec(cylinder.position, dish.rotation, { ...ZERO });
    const want = dishGripInHand(tilt);
    expect(dish.position.x + offset.x).toBeCloseTo(want.position.x, 9);
    expect(dish.position.y + offset.y).toBeCloseTo(want.position.y, 9);
    expect(dish.position.z + offset.z).toBeCloseTo(want.position.z, 9);
    expect(
      angle(multiplyQuat(dish.rotation, cylinder.rotation, { ...ONE }), want.rotation),
    ).toBeLessThan(1e-4);
  });

  it('schreibt eine Zeile für DISH_GRIP', () => {
    expect(dishGripLine({ ...DISH_GRIP, roll: 40 })).toBe(
      'DISH_GRIP: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 40 },',
    );
  });
});
