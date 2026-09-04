/**
 * Die Rechnung hinter dem zweiten Justierstand.
 *
 * Sie hat genau eine Aufgabe und zwei Richtungen: die gespeicherte Handhaltung
 * als Boxhand ans Werkzeug stellen, und die verschobene Boxhand wieder als
 * Handhaltung lesen. Geht dabei ein Vorzeichen verloren, sieht man das in der
 * Brille als eine Hand, die beim Loslassen wegspringt — und zwar jedes Mal ein
 * Stück weiter, weil man dann gegen den Fehler nachjustiert.
 *
 * Also wird beides einmal nachgerechnet: dass die Kette sich wirklich schließt,
 * und dass der Griff sich herauskürzt — der Stand hält ja nichts.
 */
import { multiplyQuat, rotateVec, type Quat, type Vec3 } from '../portal/tools/aim';
import {
  composePose,
  ghostOnTool,
  handFromGhost,
  invertPose,
  toolInGrip,
  type Pose,
} from './handGrip';

const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

function axisAngle(axis: Vec3, degrees: number): Quat {
  const length = Math.hypot(axis.x, axis.y, axis.z);
  const half = (degrees * Math.PI) / 180 / 2;
  const s = Math.sin(half) / length;
  return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(half) };
}

function expectClose(a: Vec3, b: Vec3, digits = 6): void {
  expect(a.x).toBeCloseTo(b.x, digits);
  expect(a.y).toBeCloseTo(b.y, digits);
  expect(a.z).toBeCloseTo(b.z, digits);
}

function expectSameRotation(a: Quat, b: Quat, digits = 6): void {
  for (const v of [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
  ]) {
    expectClose(
      rotateVec(v, a, { x: 0, y: 0, z: 0 }),
      rotateVec(v, b, { x: 0, y: 0, z: 0 }),
      digits,
    );
  }
}

function expectSamePose(a: Pose, b: Pose): void {
  expectClose(a.position, b.position);
  expectSameRotation(a.rotation, b.rotation);
}

const TOOL: Pose = {
  position: { x: -0.3, y: 1.06, z: 1.55 },
  rotation: axisAngle({ x: 0.2, y: 1, z: -0.4 }, 37),
};

const HAND: Pose = {
  position: { x: 0.01, y: -0.02, z: 0.04 },
  rotation: axisAngle({ x: 1, y: 0.3, z: 0.1 }, 75),
};

describe('composePose', () => {
  it('kehrt sich selbst um', () => {
    expectSamePose(composePose(TOOL, invertPose(TOOL)), {
      position: { x: 0, y: 0, z: 0 },
      rotation: IDENTITY,
    });
  });

  it('setzt Versatz und Drehung in dieser Reihenfolge zusammen', () => {
    const turn: Pose = {
      position: { x: 0, y: 0, z: 0 },
      rotation: axisAngle({ x: 0, y: 1, z: 0 }, 90),
    };
    const step: Pose = { position: { x: 0, y: 0, z: -1 }, rotation: IDENTITY };
    // Erst um 90° nach links gedreht, dann einen Meter nach vorn: das ist ein
    // Meter nach links (-X), nicht einer nach vorn.
    expectClose(composePose(turn, step).position, { x: -1, y: 0, z: 0 });
  });
});

describe('toolInGrip', () => {
  it('legt die Zielkorrektur vor die eigene Drehung', () => {
    const aim = axisAngle({ x: 1, y: 0, z: 0 }, -30);
    const hold = {
      position: { x: 0, y: -0.012, z: 0.03 },
      rotation: axisAngle({ x: 0, y: 1, z: 0 }, 15),
    };
    const local = toolInGrip(hold, aim);
    expectClose(local.position, hold.position);
    expectSameRotation(local.rotation, multiplyQuat(aim, hold.rotation, { ...IDENTITY }));
  });

  it('lässt ein Werkzeug ohne Zielkorrektur in Ruhe', () => {
    const hold = {
      position: { x: 0.02, y: 0, z: 0 },
      rotation: axisAngle({ x: 0, y: 0, z: 1 }, 40),
    };
    expectSamePose(toolInGrip(hold, IDENTITY), hold);
  });
});

describe('ghostOnTool und handFromGhost', () => {
  const local = toolInGrip(
    { position: { x: 0, y: -0.012, z: 0.03 }, rotation: axisAngle({ x: 0, y: 1, z: 0 }, 20) },
    axisAngle({ x: 1, y: 0, z: 0 }, -30),
  );

  it('gibt dieselbe Haltung wieder her', () => {
    const ghost = ghostOnTool(local, HAND);
    expectSamePose(handFromGhost(local, ghost), HAND);
  });

  it('stellt die Hand an den Griff, wenn die Haltung leer ist', () => {
    const rest: Pose = { position: { x: 0, y: 0, z: 0 }, rotation: IDENTITY };
    // Ohne Haltung liegt die Boxhand genau dort, wo die haltende Hand läge —
    // also am Werkzeug minus dessen Lage im Griff.
    expectSamePose(ghostOnTool(local, rest), invertPose(local));
  });

  it('kennt den Ort des Standes nicht — und braucht ihn nicht', () => {
    // Dieselbe Rechnung, egal wo im Gang die Kopie hängt: die Boxhand ist ihr
    // Kind, und ein verschobener Stand nimmt beide gleichermaßen mit. Genau
    // deshalb steht in der Kette kein Weltpunkt mehr.
    const ghost = ghostOnTool(local, HAND);
    const world = composePose(TOOL, ghost);
    expectSamePose(handFromGhost(local, composePose(invertPose(TOOL), world)), HAND);
  });
});
