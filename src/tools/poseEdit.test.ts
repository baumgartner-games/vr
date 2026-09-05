import {
  EDIT_AXES,
  EDIT_TARGETS,
  axisSpec,
  clampAxis,
  clampPose,
  formatAxes,
  formatAxis,
  isEditTarget,
  nudgeAxis,
  readAxis,
  sameAxes,
  withAxis,
} from './poseEdit';
import type { PoseReadout } from '../worlds/portal/tools/toolPose';

/**
 * Der Regler auf der Werkzeugseite.
 *
 * Getestet wird das, was man im Bild **nicht** sieht: dass ein Wert auf dem
 * Raster landet, auf dem auch gespeichert wird, dass er an der Grenze stehen
 * bleibt statt darüber hinauszulaufen, und dass eine Achse nur ihre eigene Zahl
 * anfasst. Ein Regler, der nebenbei den Roll mitdreht, fällt in der Brille erst
 * auf, wenn man das Werkzeug hält.
 */

const POSE: PoseReadout = { x: 1.5, y: -2, z: 3, pitch: 10, yaw: -20, roll: 30 };

describe('die sechs Achsen', () => {
  it('führt jede genau einmal und in der Reihenfolge der Knöpfe', () => {
    expect(EDIT_AXES.map((spec) => spec.key)).toEqual(['x', 'y', 'z', 'yaw', 'pitch', 'roll']);
    expect(new Set(EDIT_AXES.map((spec) => spec.key)).size).toBe(EDIT_AXES.length);
  });

  it('erkennt ein Ziel aus dem DOM wieder', () => {
    expect(isEditTarget('grip')).toBe(true);
    expect(isEditTarget('irgendwas')).toBe(false);
  });

  it('führt beide Ziele, und keines heißt „das Werkzeug verschieben"', () => {
    expect(EDIT_TARGETS.map((entry) => entry.key)).toEqual(['hold', 'grip']);
    expect(EDIT_TARGETS.map((entry) => entry.label)).toEqual(['In der Hand', 'Am Griff']);
  });

  it('kennt für eine Achse, die es nicht gibt, trotzdem eine Antwort', () => {
    // Ein Wert aus dem Speicher darf veraltet sein; ein Absturz darf er nicht sein.
    expect(axisSpec('quatsch' as never).key).toBe('x');
  });
});

describe('klemmen und runden', () => {
  it('hält jede Achse in ihren Grenzen', () => {
    expect(clampAxis('x', 400)).toBe(30);
    expect(clampAxis('x', -400)).toBe(-30);
    expect(clampAxis('yaw', 900)).toBe(180);
    expect(clampAxis('yaw', -900)).toBe(-180);
  });

  it('legt einen Wert auf das Raster, auf dem gespeichert wird', () => {
    expect(clampAxis('x', 0.30000000000000004)).toBe(0.3);
    expect(clampAxis('x', 1.234)).toBe(1.2);
    expect(clampAxis('x', 1.28)).toBe(1.3);
    expect(clampAxis('yaw', 44.6)).toBe(45);
  });

  it('macht aus einer gerundeten -0 wieder eine 0', () => {
    expect(Object.is(clampAxis('x', -0.01), 0)).toBe(true);
  });

  it('nimmt nur eine kaputte Zahl als Null, ein Unendlich als Grenze', () => {
    expect(clampAxis('x', Number.NaN)).toBe(0);
    expect(clampAxis('yaw', Number.POSITIVE_INFINITY)).toBe(180);
  });

  it('klemmt eine ganze Pose nach denselben Regeln — sechs Achsen, ein Weg', () => {
    expect(
      clampPose({ x: 1.234, y: -400, z: 0.30000000000000004, pitch: 44.6, yaw: 900, roll: -0.01 }),
    ).toEqual({ x: 1.2, y: -30, z: 0.3, pitch: 45, yaw: 180, roll: 0 });
  });
});

describe('eine Raste weiter', () => {
  it('läuft in Zehnteln und bleibt dabei auf dem Raster', () => {
    let value = 0;
    for (let i = 0; i < 10; i++) value = nudgeAxis('x', value, 1);
    expect(value).toBe(1);
  });

  it('geht auch rückwärts und bleibt an der Grenze stehen', () => {
    expect(nudgeAxis('yaw', -180, -1)).toBe(-180);
    expect(nudgeAxis('yaw', 179, 1)).toBe(180);
    expect(nudgeAxis('yaw', 180, 1)).toBe(180);
  });
});

describe('eine Achse schreiben', () => {
  it('ändert genau eine Zahl und lässt die Pose selbst in Ruhe', () => {
    const next = withAxis(POSE, 'yaw', 45);
    expect(next.yaw).toBe(45);
    expect(POSE.yaw).toBe(-20);
    expect({ ...next, yaw: POSE.yaw }).toEqual(POSE);
  });

  it('klemmt beim Schreiben mit', () => {
    expect(withAxis(POSE, 'x', 99).x).toBe(30);
  });

  it('liest zurück, was geschrieben wurde', () => {
    for (const spec of EDIT_AXES) {
      expect(readAxis(withAxis(POSE, spec.key, 5), spec.key)).toBe(5);
    }
  });
});

describe('anzeigen', () => {
  it('schreibt Zentimeter und Grad, wie man sie liest', () => {
    expect(formatAxis('x', 1.24)).toBe('1.2 cm');
    expect(formatAxis('yaw', -45)).toBe('-45°');
  });

  it('setzt alle sechs in eine Zeile', () => {
    expect(formatAxes(POSE)).toBe('X 1.5 cm · Y -2 cm · Z 3 cm · Yaw -20° · Pitch 10° · Roll 30°');
  });

  it('vergleicht auf dem Raster und nicht auf dem Bit', () => {
    expect(sameAxes(POSE, { ...POSE, x: POSE.x + 0.0001 })).toBe(true);
    expect(sameAxes(POSE, { ...POSE, x: POSE.x + 0.1 })).toBe(false);
  });
});
