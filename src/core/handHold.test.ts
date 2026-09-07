/**
 * Der Versatz, mit dem eine **bloße Hand** ihre Sachen hält.
 *
 * Zwei Sorten Prüfung stehen hier, und die zweite ist die, wegen der es diese
 * Datei gibt: die Zahlen selbst — gespiegelt, und die Spiegelung ist ihre
 * eigene Umkehrung — und **wohin sie drehen**. Ein Vorzeichen in Grad sieht
 * man nicht an, ob es nach links oder nach rechts zeigt; ein gedrehter Vektor
 * schon, und im Headset wäre die falsche Richtung genau der Fehler, den es zu
 * beheben galt: doppelt so weit daneben wie vorher.
 */
import * as THREE from 'three';
import {
  HAND_HOLD_TILT_LEFT,
  HAND_HOLD_TILT_RIGHT,
  NO_TILT,
  handHoldTilt,
  mirrorHoldTilt,
  type HoldTilt,
} from './handHold';

const DEG = Math.PI / 180;

/** Die Neigung als Drehung — dieselbe Reihenfolge, in der `XRInput` sie liest. */
function quatOf(tilt: HoldTilt): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(tilt.pitch * DEG, tilt.yaw * DEG, tilt.roll * DEG, 'XYZ'),
  );
}

describe('handHoldTilt', () => {
  it('gibt der rechten Hand 90° Roll und 35° Yaw', () => {
    expect(handHoldTilt('right')).toEqual({ pitch: 0, yaw: -35, roll: 90 });
  });

  it('spiegelt die linke Hand aus der rechten', () => {
    expect(handHoldTilt('left')).toEqual(mirrorHoldTilt(HAND_HOLD_TILT_RIGHT));
    expect(handHoldTilt('left')).toEqual({ pitch: 0, yaw: 35, roll: -90 });
  });

  it('kippt keine Null ins Minus', () => {
    expect(Object.is(HAND_HOLD_TILT_LEFT.pitch, 0)).toBe(true);
    expect(Object.is(mirrorHoldTilt(NO_TILT).yaw, 0)).toBe(true);
    expect(Object.is(mirrorHoldTilt(NO_TILT).roll, 0)).toBe(true);
  });
});

describe('mirrorHoldTilt', () => {
  it('ist ihre eigene Umkehrung', () => {
    expect(mirrorHoldTilt(mirrorHoldTilt(HAND_HOLD_TILT_RIGHT))).toEqual(HAND_HOLD_TILT_RIGHT);
    expect(mirrorHoldTilt(HAND_HOLD_TILT_LEFT)).toEqual(HAND_HOLD_TILT_RIGHT);
  });

  it('lässt den Pitch stehen und kippt Yaw und Roll', () => {
    const tilt = mirrorHoldTilt({ pitch: 12, yaw: -40, roll: 7 });
    expect(tilt).toEqual({ pitch: 12, yaw: 40, roll: -7 });
  });
});

describe('wohin der Versatz dreht', () => {
  it('zielt die rechte Hand um 35° weiter nach rechts', () => {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quatOf(HAND_HOLD_TILT_RIGHT));
    // Nach rechts heißt +X, und die Höhe bleibt, wo sie war: ein Zielfehler
    // zur Seite wird nicht zu einem nach oben.
    expect(forward.x).toBeCloseTo(Math.sin(35 * DEG), 6);
    expect(forward.y).toBeCloseTo(0, 6);
    expect(forward.z).toBeLessThan(0);
  });

  it('und die linke um dieselben 35° nach links', () => {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quatOf(HAND_HOLD_TILT_LEFT));
    expect(forward.x).toBeCloseTo(-Math.sin(35 * DEG), 6);
    expect(forward.y).toBeCloseTo(0, 6);
  });

  it('rollt die rechte Hand um 90° nach links', () => {
    // Der Roll allein: was oben war, liegt danach auf der linken Seite (-X)
    // und nicht auf der rechten. Genau darum geht es — ein Gegenstand stand
    // 90° zu weit nach rechts gedreht in der Faust.
    const roll = quatOf({ pitch: 0, yaw: 0, roll: HAND_HOLD_TILT_RIGHT.roll });
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(roll);
    expect(up.x).toBeCloseTo(-1, 6);
    expect(up.y).toBeCloseTo(0, 6);
  });

  it('und die linke um 90° nach rechts', () => {
    const roll = quatOf({ pitch: 0, yaw: 0, roll: HAND_HOLD_TILT_LEFT.roll });
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(roll);
    expect(up.x).toBeCloseTo(1, 6);
  });

  it('lässt die Zeigerichtung liegen, wo der Roll sie fand', () => {
    // Ein Roll dreht um die Zeigeachse: er darf am Zielen nichts ändern,
    // sonst wären die 35° Yaw daneben gemessen.
    const roll = quatOf({ pitch: 0, yaw: 0, roll: HAND_HOLD_TILT_RIGHT.roll });
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(roll);
    expect(forward.x).toBeCloseTo(0, 6);
    expect(forward.y).toBeCloseTo(0, 6);
    expect(forward.z).toBeCloseTo(-1, 6);
  });

  it('dreht die beiden Hände gegeneinander gespiegelt', () => {
    const right = new THREE.Vector3(0, 1, 0).applyQuaternion(quatOf(HAND_HOLD_TILT_RIGHT));
    const left = new THREE.Vector3(0, 1, 0).applyQuaternion(quatOf(HAND_HOLD_TILT_LEFT));
    // Spiegelung an der Ebene x = 0: quer kippt um, hoch und tief bleiben.
    expect(left.x).toBeCloseTo(-right.x, 6);
    expect(left.y).toBeCloseTo(right.y, 6);
    expect(left.z).toBeCloseTo(right.z, 6);
  });

  it('ist für einen Controller gar keine Drehung', () => {
    expect(quatOf(NO_TILT).angleTo(new THREE.Quaternion())).toBeCloseTo(0, 9);
  });
});
