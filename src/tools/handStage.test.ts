/**
 * Die Bühnendrehung der Werkzeugseite: **eine Hand für alle Werkzeuge**.
 *
 * Geprüft wird das, was man auf dem Schirm sehen soll, und nicht die Zahl, die
 * dabei herauskommt: der Zeigestrahl der echten Hand läuft in der
 * Ausgangsansicht waagerecht quer durchs Bild — bei der Pistole, bei der
 * Taschenlampe und bei jedem noch so schräg gehaltenen Ding dazwischen.
 */

import { HAND_ON_STAGE, TOOL_HOME, stageForGrip } from './handStage';
import { REAL_HAND } from './handFrame';
import { multiplyQuat, rotateVec, type Quat, type Vec3 } from '../worlds/portal/tools/aim';
import { quatFromEulerXYZ } from '../worlds/portal/tools/toolPose';

const ZERO: Vec3 = { x: 0, y: 0, z: 0 };
const IDLE: Quat = { x: 0, y: 0, z: 0, w: 1 };

/** Ein paar Griffräume, wie sie an Werkzeugen wirklich vorkommen — und schlimmer. */
const GRIPS: Quat[] = [
  IDLE,
  // Die Taschenlampe: gut 30° gegen die Zielrichtung der Hand gekippt.
  quatFromEulerXYZ({ x: (30 * Math.PI) / 180, y: 0, z: 0 }),
  quatFromEulerXYZ({ x: (-52 * Math.PI) / 180, y: (18 * Math.PI) / 180, z: 0 }),
  quatFromEulerXYZ({ x: 0.9, y: -2.1, z: 1.3 }),
  quatFromEulerXYZ({ x: -1.4, y: 2.8, z: -0.7 }),
];

/** Wohin der Zeigestrahl dieser Hand auf dem Schirm läuft, in der Ausgangsansicht. */
function onScreen(grip: Quat): Vec3 {
  const stage = stageForGrip(grip);
  const hand = multiplyQuat(multiplyQuat(stage, grip, { ...IDLE }), REAL_HAND.rotation, {
    ...IDLE,
  });
  // Und davor die Drehung der Ansicht selbst: erst gieren, dann nicken
  // (`viewer.ts`, `place`) — die Kamera sitzt danach auf +Z und blickt nach -Z.
  const view = quatFromEulerXYZ({ x: TOOL_HOME.pitch, y: TOOL_HOME.yaw, z: 0 });
  const ray = rotateVec({ x: 0, y: 0, z: -1 }, hand, { ...ZERO });
  return rotateVec(ray, view, { ...ZERO });
}

describe('die Bühne stellt die echte Hand hin', () => {
  test('der Zeigestrahl läuft bei jedem Griff waagerecht quer durchs Bild', () => {
    for (const grip of GRIPS) {
      const ray = onScreen(grip);
      // Quer nach links: ganz in der Breite, nichts in der Höhe, nichts in die
      // Tiefe. Genau das ist „die Zielscheibe steht waagerecht daneben".
      expect(ray.x).toBeCloseTo(-1, 6);
      expect(ray.y).toBeCloseTo(0, 6);
      expect(ray.z).toBeCloseTo(0, 6);
    }
  });

  test('zwei Werkzeuge zeigen dieselbe Hand', () => {
    const [first, ...rest] = GRIPS.map((grip) =>
      multiplyQuat(multiplyQuat(stageForGrip(grip), grip, { ...IDLE }), REAL_HAND.rotation, {
        ...IDLE,
      }),
    );
    for (const hand of rest) {
      // Dieselbe Drehung, nicht nur dieselbe Richtung: auch das Rollen der
      // Faust ist überall gleich, sonst stünde die Hand mal auf dem Kopf.
      const dot = Math.abs(
        hand.x * first!.x + hand.y * first!.y + hand.z * first!.z + hand.w * first!.w,
      );
      expect(dot).toBeCloseTo(1, 6);
    }
  });

  test('sie ist eine reine Gierung — die Hand hält aufrecht', () => {
    expect(HAND_ON_STAGE.x).toBeCloseTo(0, 12);
    expect(HAND_ON_STAGE.z).toBeCloseTo(0, 12);
    // Und die Hochachse der Hand bleibt oben, statt zur Seite zu kippen.
    const up = rotateVec({ x: 0, y: 1, z: 0 }, HAND_ON_STAGE, { ...ZERO });
    expect(up.y).toBeCloseTo(1, 12);
  });
});
