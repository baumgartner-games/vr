/**
 * **Die Hand hält den Griff.**
 *
 * Das klingt nach nichts und war jahrelang nicht so. Eine Handhaltung wurde in
 * der Brille eingestellt, ein Griff im Code hingesetzt, und ob die beiden
 * einander trafen, sah niemand nach — man sieht es auch nicht: man sieht eine
 * Hand und ein Werkzeug, und dass die Faust dabei um nichts geschlossen ist,
 * fällt erst auf, wenn man es misst.
 *
 * Gemessen sieht das so aus. Die **gebaute** Faust hielt den Pistolengriff
 * 6,7 cm neben sich und um **90°** verdreht — sie stand quer zum Zylinder,
 * schloss sich also um die Luft daneben. Die am Stabgriff **eingemessene** lag
 * 3,2 cm daneben und 30° verdreht. Zwei Zahlenreihen, zwei Fehler, und beide
 * kosteten dieselbe Arbeit im Headset.
 *
 * Also nicht mehr einstellen, sondern ausrechnen: `fistOnGrip` in
 * `worlds/portal/tools/gripFit.ts` legt die Faust um den Griff, und dieser Test
 * hält fest, dass die Zahlen in `handPose.ts` genau das sind — und dass die
 * gezeichnete Hand am wirklich gebauten Werkzeug landet.
 *
 * three.js, aber kein WebGL: das hier liest Zahlen aus einem Szenengraphen.
 */
import * as THREE from 'three';
import { GhostHand } from './HandVisuals';
import { GRIP_HAND_POSE, HOLD_HAND_POSE, defaultHoldPose, type HandPose } from './handPose';
import { GRIP_TO_RAY, fistOnGrip } from '../worlds/portal/tools/gripFit';
import { ghostOnTool, poseOfHand, toolInGrip } from '../worlds/tune/handGrip';
import { GripTool } from '../worlds/portal/tools/GripTool';
import { PistolTool } from '../worlds/portal/tools/PistolTool';
import { FlashlightTool } from '../worlds/portal/tools/FlashlightTool';
import type { Tool } from '../worlds/portal/tools/Tool';

/** Eine Leinwand, die alles annimmt und nichts tut — die Pistole malt sich ihr
 * Magazin auf eine, und in Node gibt es keine. */
const ctx2d = new Proxy(
  {},
  {
    get: (_target, key) => {
      if (key === 'canvas') return { width: 256, height: 256 };
      if (key === 'measureText') return () => ({ width: 10 });
      if (key === 'createLinearGradient' || key === 'createRadialGradient')
        return () => ({ addColorStop() {} });
      if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => undefined;
    },
    set: () => true,
  },
);

beforeAll(() => {
  (globalThis as unknown as { document: unknown }).document = {
    createElement: (tag: string) =>
      tag === 'canvas'
        ? { width: 256, height: 256, getContext: () => ctx2d, style: {} }
        : { style: {}, appendChild() {}, setAttribute() {} },
  };
});

const DEG = Math.PI / 180;
const aim = new THREE.Quaternion(GRIP_TO_RAY.x, GRIP_TO_RAY.y, GRIP_TO_RAY.z, GRIP_TO_RAY.w);

/**
 * **Wo eine geschlossene Faust ihren Zylinder hält**, im Raum der gebauten Hand.
 *
 * Nicht geschätzt: der Kreis durch die drei Gelenke des Mittelfingers (Wurzel,
 * Knöchel, Spitze). Ein gekrümmter Finger legt sich um etwas herum, und der
 * Kreis durch seine Gelenke *ist* dieses Etwas — Mittelpunkt und Halbmesser
 * inklusive. Die Achse ist das X der Hand: quer über die Handfläche, die
 * Richtung, in die alle vier Finger nebeneinanderliegen.
 */
function fistCentre(): THREE.Vector3 {
  const ghost = new GhostHand('right', HOLD_HAND_POSE, { opacity: 1 });
  ghost.updateMatrixWorld(true);
  const hand = ghost.children[0]!;
  const roots = hand.children.filter((child) => !(child as THREE.Mesh).isMesh);
  const joints: THREE.Vector3[] = [];
  let node: THREE.Object3D = roots[2]!; // Daumen, Zeige, **Mittel**, Ring, Klein
  for (;;) {
    joints.push(node.getWorldPosition(new THREE.Vector3()));
    const next = node.children.find((child) => !(child as THREE.Mesh).isMesh);
    if (!next) break;
    node = next;
  }
  // Wurzel, (Knoten), Knöchel, (Knoten), Spitze — die Kette trägt zwischen den
  // Gelenken je einen Mitnehmer.
  const [a, , b, , c] = joints as [THREE.Vector3, unknown, THREE.Vector3, unknown, THREE.Vector3];
  const A = 2 * (b.y - a.y);
  const B = 2 * (b.z - a.z);
  const C = b.y * b.y + b.z * b.z - a.y * a.y - a.z * a.z;
  const D = 2 * (c.y - b.y);
  const E = 2 * (c.z - b.z);
  const F = c.y * c.y + c.z * c.z - b.y * b.y - b.z * b.z;
  const det = A * E - B * D;
  return new THREE.Vector3(0, (C * E - B * F) / det, (A * F - C * D) / det);
}

/**
 * **Wohin der Zeigefinger zeigt**, im Raum der gebauten Hand.
 *
 * Das -Z der Fingerspitze, an der auf der Werkzeugseite auch die
 * bernsteinfarbene Linie hängt. Es ist *nicht* das -Z der Hand: der Finger liegt
 * am Trigger, also halb gekrümmt, und zeigt gut ein halbes Rechteck darunter
 * hindurch. Genau diese Krümmung ist die Schräge, mit der eine Hand an einem
 * Waffengriff liegt.
 */
function fingerDirection(): THREE.Vector3 {
  const ghost = new GhostHand('right', HOLD_HAND_POSE, { opacity: 1 });
  ghost.update(1);
  ghost.updateMatrixWorld(true);
  return new THREE.Vector3(0, 0, -1).applyQuaternion(
    ghost.indexTip.getWorldQuaternion(new THREE.Quaternion()),
  );
}

/** Die Faust einer Hand, die diese Haltung hat: Mitte und Achse im Griffraum. */
function fistOf(pose: HandPose, centre: THREE.Vector3) {
  const rotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(pose.pitch * DEG, pose.yaw * DEG, pose.roll * DEG, 'XYZ'),
  );
  return {
    centre: centre
      .clone()
      .applyQuaternion(rotation)
      .add(new THREE.Vector3(pose.x / 100, pose.y / 100, pose.z / 100)),
    axis: new THREE.Vector3(1, 0, 0).applyQuaternion(rotation),
  };
}

/** Und derselbe Zylinder am gehaltenen Werkzeug: Mitte und Achse (+Y). */
function gripOf(tool: Tool) {
  tool.position.copy(tool.holdPosition);
  tool.quaternion.copy(aim).multiply(tool.holdRotation);
  tool.updateMatrixWorld(true);
  const part = tool.gripPart!;
  const rotation = part.getWorldQuaternion(new THREE.Quaternion());
  return {
    centre: part.getWorldPosition(new THREE.Vector3()),
    axis: new THREE.Vector3(0, 1, 0).applyQuaternion(rotation),
  };
}

/** Winkel zwischen zwei Achsen in Grad; eine Achse hat keine Richtung. */
function between(a: THREE.Vector3, b: THREE.Vector3): number {
  return (Math.acos(Math.min(1, Math.abs(a.dot(b)))) * 180) / Math.PI;
}

describe('die Faust am Standardgriff', () => {
  it('umschließt einen Zylinder von der Dicke eines Griffs', () => {
    const centre = fistCentre();
    // Der Kreis durch die Gelenke läuft außen um den Griff herum: ein Knochen
    // ist 1,3 cm dick, und was übrig bleibt, ist der Griff selbst (Halbmesser
    // 1,65 bis 2,3 cm). Wäre das weit daneben, hielte diese Hand keinen Griff,
    // sondern eine Dose.
    const ghost = new GhostHand('right', HOLD_HAND_POSE, { opacity: 1 });
    ghost.updateMatrixWorld(true);
    expect(centre.x).toBe(0);
    expect(centre.y).toBeCloseTo(-0.0265, 3);
    expect(centre.z).toBeCloseTo(-0.0297, 3);
  });

  it('steht in `handPose.ts` als das, was `fistOnGrip` ausrechnet', () => {
    const want = fistOnGrip({ centre: fistCentre(), finger: fingerDirection() });
    const euler = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion(want.rotation.x, want.rotation.y, want.rotation.z, want.rotation.w),
      'XYZ',
    );
    // Gerundet wie jede Handhaltung, die man eintippt: Millimeter und Grad.
    expect(GRIP_HAND_POSE.x).toBeCloseTo(want.position.x * 100, 0);
    expect(GRIP_HAND_POSE.y).toBeCloseTo(want.position.y * 100, 0);
    expect(GRIP_HAND_POSE.z).toBeCloseTo(want.position.z * 100, 0);
    expect(GRIP_HAND_POSE.pitch).toBeCloseTo(euler.x / DEG, 0);
    expect(GRIP_HAND_POSE.yaw).toBeCloseTo(euler.y / DEG, 0);
    expect(GRIP_HAND_POSE.roll).toBeCloseTo(euler.z / DEG, 0);
    // Und die Finger sind die der Faust: eine Haltung ist Lage *und* Krümmung.
    expect(GRIP_HAND_POSE.curls).toEqual(HOLD_HAND_POSE.curls);
  });

  it.each([
    ['Griff', () => new GripTool()],
    ['Pistole', () => new PistolTool()],
    ['Taschenlampe', () => new FlashlightTool()],
  ])('liegt am gebauten Werkzeug wirklich um den Griff: %s', (_name, build) => {
    const centre = fistCentre();
    const fist = fistOf(defaultHoldPose('right', 'grip'), centre);
    const grip = gripOf(build());
    // Auf dem Zylinder: quer zur Achse einen halben Millimeter, entlang der
    // Achse ist Luft (eine Faust darf am Griff höher oder tiefer sitzen).
    const offset = grip.centre.clone().sub(fist.centre);
    const across = offset.clone().sub(grip.axis.clone().multiplyScalar(offset.dot(grip.axis)));
    expect(across.length()).toBeLessThan(0.0005);
    expect(Math.abs(offset.dot(grip.axis))).toBeLessThan(0.0005);
    expect(between(fist.axis, grip.axis)).toBeLessThan(0.5);
  });

  it('liegt an der linken Hand genauso, gespiegelt', () => {
    const centre = fistCentre();
    const fist = fistOf(defaultHoldPose('left', 'grip'), centre);
    const grip = gripOf(new GripTool());
    // Dieselbe Rechnung mit der linken Hand: der Griff ist nicht gespiegelt,
    // die Hand schon — und trotzdem muss die Faust auf demselben Zylinder
    // sitzen, sonst hielte ein Werkzeug nur in einer Hand richtig.
    const offset = grip.centre.clone().sub(fist.centre);
    const across = offset.clone().sub(grip.axis.clone().multiplyScalar(offset.dot(grip.axis)));
    expect(across.length()).toBeLessThan(0.0005);
    expect(between(fist.axis, grip.axis)).toBeLessThan(0.5);
  });

  it('sitzt auch auf der Werkzeugseite auf dem Griff', () => {
    // Die Seite zeichnet Hand und Werkzeug in dessen *eigenem* Raum
    // (`ghostOnTool` in `tune/handGrip.ts`) und hat keinen Controller, aus dem
    // eine Zielkorrektur käme. Nimmt sie dort die Ruhe an, steht die Hand um
    // genau diese 30° neben dem Griff — und wer sie dann „geradezieht", trägt
    // die 30° in den Speicher ein. Also dieselbe Zahl auch dort.
    const tool = new GripTool();
    tool.showHeldBy('right');
    const local = toolInGrip(
      { position: tool.holdPosition, rotation: tool.holdRotation },
      GRIP_TO_RAY,
    );
    const at = ghostOnTool(local, poseOfHand(defaultHoldPose('right', 'grip')));
    const rotation = new THREE.Quaternion(
      at.rotation.x,
      at.rotation.y,
      at.rotation.z,
      at.rotation.w,
    );
    const fist = fistCentre()
      .applyQuaternion(rotation)
      .add(new THREE.Vector3(at.position.x, at.position.y, at.position.z));
    const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(rotation);
    // Und der Griff steht im Raum des Werkzeugs genau dort, wo er gebaut ist.
    const part = tool.gripPart!;
    const gripAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(part.quaternion);
    const offset = part.position.clone().sub(fist);
    const across = offset.clone().sub(gripAxis.clone().multiplyScalar(offset.dot(gripAxis)));
    expect(across.length()).toBeLessThan(0.0005);
    expect(between(axis, gripAxis)).toBeLessThan(0.5);
  });

  it('legt die Fingerlinie auf die Grifflinie — die Hand steht schräg am Griff', () => {
    // Der Maßstab der Werkzeugseite, als Zahl: die bernsteinfarbene Linie am
    // Zeigefinger und der rosa Pfeil am Griff liegen übereinander. Damit zeigt
    // der Finger dorthin, wohin das Werkzeug zielt — bei einer Waffe also den
    // Lauf entlang.
    const pose = defaultHoldPose('right', 'grip');
    const ghost = new GhostHand('right', pose, { opacity: 1 });
    ghost.position.set(pose.x / 100, pose.y / 100, pose.z / 100);
    ghost.quaternion.setFromEuler(
      new THREE.Euler(pose.pitch * DEG, pose.yaw * DEG, pose.roll * DEG, 'XYZ'),
    );
    ghost.update(1);
    ghost.updateMatrixWorld(true);
    const finger = new THREE.Vector3(0, 0, -1).applyQuaternion(
      ghost.indexTip.getWorldQuaternion(new THREE.Quaternion()),
    );

    const tool = new GripTool();
    tool.position.copy(tool.holdPosition);
    tool.quaternion.copy(aim).multiply(tool.holdRotation);
    tool.updateMatrixWorld(true);
    const front = new THREE.Vector3(0, 0, -1).applyQuaternion(
      tool.gripPart!.getWorldQuaternion(new THREE.Quaternion()),
    );
    // Dieselbe Richtung, nicht nur dieselbe Achse: ein Finger, der nach hinten
    // zeigt, läge auf derselben Linie und wäre trotzdem falsch herum.
    expect((Math.acos(Math.min(1, finger.dot(front))) * 180) / Math.PI).toBeLessThan(0.5);

    // Und die Schräge, um die es geht: die Hand steht **nicht** gerade am
    // Griff. Ihre eigene Achse zeigt gut ein halbes Rechteck neben dem Lauf
    // vorbei — genau um die Krümmung des Fingers, der auf ihm liegt.
    const straight = new THREE.Vector3(0, 0, -1).applyQuaternion(
      ghost.getWorldQuaternion(new THREE.Quaternion()),
    );
    expect((Math.acos(Math.min(1, straight.dot(front))) * 180) / Math.PI).toBeCloseTo(58, 0);
  });

  it('hielt vorher gar nichts — die Zahlen, wegen derer das hier steht', () => {
    const centre = fistCentre();
    const grip = gripOf(new GripTool());
    const off = (pose: HandPose) => {
      const fist = fistOf(pose, centre);
      const offset = grip.centre.clone().sub(fist.centre);
      const across = offset.clone().sub(grip.axis.clone().multiplyScalar(offset.dot(grip.axis)));
      return { across: across.length() * 100, angle: between(fist.axis, grip.axis) };
    };
    // Die gebaute Faust: quer zum Zylinder, also um nichts geschlossen. Der
    // Winkel ist die eigentliche Auskunft — er hängt an keiner `holdPosition`
    // und war schon immer diese 90°.
    const built = off(HOLD_HAND_POSE);
    expect(built.angle).toBeCloseTo(90, 0);
    expect(built.across).toBeGreaterThan(3);
    // Die am Stabgriff eingemessene Faust — näher dran, aber auch daneben.
    const rod: HandPose = {
      ...HOLD_HAND_POSE,
      x: 3.6,
      y: -1.8,
      z: 2.5,
      pitch: -59,
      yaw: 23,
      roll: -99,
    };
    expect(off(rod).angle).toBeGreaterThan(20);
  });
});
