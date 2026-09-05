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
 * gezeichnete Hand am wirklich gebauten Werkzeug landet. Für den Standardgriff,
 * und mit derselben Rechnung für die beiden Werkzeuge mit eigenem Zylinder: den
 * Stiel des Hammers und die Griffe der Drohne.
 *
 * three.js, aber kein WebGL: das hier liest Zahlen aus einem Szenengraphen.
 */
import * as THREE from 'three';
import { GhostHand } from './HandVisuals';
import {
  DRONE_HAND_POSE,
  GRIP_HAND_POSE,
  HAMMER_HAND_POSE,
  HOLD_HAND_POSE,
  defaultHoldPose,
  type HandPose,
} from './handPose';
import {
  GRIP_TO_RAY,
  STANDARD_GRIP_IN_HAND,
  fistOnGrip,
  gripInHand,
} from '../worlds/portal/tools/gripFit';
import { HAMMER_GRIP } from '../worlds/portal/tools/poleGrip';
import { GRIP_NAME } from '../worlds/portal/tools/grip';
import { ghostOnTool, poseOfHand, toolInGrip } from '../worlds/tune/handGrip';
import { GripTool } from '../worlds/portal/tools/GripTool';
import { PistolTool } from '../worlds/portal/tools/PistolTool';
import { FlashlightTool } from '../worlds/portal/tools/FlashlightTool';
import { HammerTool } from '../worlds/portal/tools/HammerTool';
import { DRONE_GRIP, DroneTool } from '../worlds/portal/tools/DroneTool';
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
const toQuat = (q: { x: number; y: number; z: number; w: number }) =>
  new THREE.Quaternion(q.x, q.y, q.z, q.w);

/**
 * **Wo eine geschlossene Faust ihren Zylinder hält**, im Raum der gebauten Hand.
 *
 * Nicht geschätzt: der Kreis durch die drei Gelenke des Mittelfingers (Wurzel,
 * Knöchel, Spitze). Ein gekrümmter Finger legt sich um etwas herum, und der
 * Kreis durch seine Gelenke *ist* dieses Etwas — Mittelpunkt und Halbmesser
 * inklusive. Die Achse ist das X der Hand: quer über die Handfläche, die
 * Richtung, in die alle vier Finger nebeneinanderliegen.
 *
 * Gerechnet mit den Fingern **dieser** Haltung: die Faust am Griff und die am
 * Stiel krümmen den Mittelfinger gleich weit, aber das ist eine Auskunft der
 * Haltung und keine Voraussetzung der Rechnung.
 */
function fistCentre(pose: HandPose = HOLD_HAND_POSE): THREE.Vector3 {
  const ghost = new GhostHand('right', pose, { opacity: 1 });
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
 * bernsteinfarbene Linie hängt. Es ist *nicht* das -Z der Hand: ein gekrümmter
 * Finger zeigt darunter hindurch, und genau diese Krümmung ist die Schräge, mit
 * der die Hand am Griff steht.
 */
function fingerDirection(pose: HandPose): THREE.Vector3 {
  const ghost = new GhostHand('right', pose, { opacity: 1 });
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

/** Ein gehaltenes Werkzeug, so wie `applyHold` es in den Griffraum legt. */
function hold(tool: Tool, side: 'left' | 'right' = 'right'): Tool {
  tool.showHeldBy(side);
  tool.position.copy(tool.holdPosition);
  tool.quaternion.copy(aim).multiply(tool.holdRotation);
  tool.updateMatrixWorld(true);
  return tool;
}

/** Ein Zylinder am gehaltenen Werkzeug: Mitte und Achse (+Y) im Griffraum. */
function cylinderOf(part: THREE.Object3D) {
  const rotation = part.getWorldQuaternion(new THREE.Quaternion());
  return {
    centre: part.getWorldPosition(new THREE.Vector3()),
    axis: new THREE.Vector3(0, 1, 0).applyQuaternion(rotation),
  };
}

/** Der Standardgriff am gehaltenen Werkzeug. */
function gripOf(tool: Tool) {
  return cylinderOf(hold(tool).gripPart!);
}

/** Winkel zwischen zwei Achsen in Grad; eine Achse hat keine Richtung. */
function between(a: THREE.Vector3, b: THREE.Vector3): number {
  return (Math.acos(Math.min(1, Math.abs(a.dot(b)))) * 180) / Math.PI;
}

/**
 * Dass eine Faust wirklich um einen Zylinder liegt: Mitte auf der Achse, Achse
 * auf der Achse — auf einen Millimeter und ein Grad, denn so grob steht eine
 * Haltung im Code (Zehntelzentimeter, ganze Grad), und drei gerundete Zahlen
 * dürfen sich zu so viel addieren. Entlang der Achse ist Luft, wo der Aufrufer
 * sie lässt — eine Faust darf an einem Stiel überall sitzen.
 */
function expectFistOn(
  fist: { centre: THREE.Vector3; axis: THREE.Vector3 },
  grip: { centre: THREE.Vector3; axis: THREE.Vector3 },
  along = 0.001,
): void {
  const offset = grip.centre.clone().sub(fist.centre);
  const across = offset.clone().sub(grip.axis.clone().multiplyScalar(offset.dot(grip.axis)));
  expect(across.length()).toBeLessThan(0.001);
  expect(Math.abs(offset.dot(grip.axis))).toBeLessThan(along);
  expect(between(fist.axis, grip.axis)).toBeLessThan(1);
}

/** Die sechs Zahlen einer Haltung gegen eine gerechnete Lage, gerundet wie getippt. */
function expectPoseIs(pose: HandPose, want: ReturnType<typeof fistOnGrip>): void {
  const euler = new THREE.Euler().setFromQuaternion(toQuat(want.rotation), 'XYZ');
  // Gerundet wie jede Handhaltung, die man eintippt: Millimeter und Grad.
  expect(pose.x).toBeCloseTo(want.position.x * 100, 0);
  expect(pose.y).toBeCloseTo(want.position.y * 100, 0);
  expect(pose.z).toBeCloseTo(want.position.z * 100, 0);
  expect(pose.pitch).toBeCloseTo(euler.x / DEG, 0);
  expect(pose.yaw).toBeCloseTo(euler.y / DEG, 0);
  expect(pose.roll).toBeCloseTo(euler.z / DEG, 0);
}

describe('die Faust am Standardgriff', () => {
  it('umschließt einen Zylinder von der Dicke eines Griffs', () => {
    const centre = fistCentre(GRIP_HAND_POSE);
    // Der Kreis durch die Gelenke läuft außen um den Griff herum: ein Knochen
    // ist 1,3 cm dick, und was übrig bleibt, ist der Griff selbst (Halbmesser
    // 1,65 bis 2,3 cm). Wäre das weit daneben, hielte diese Hand keinen Griff,
    // sondern eine Dose.
    expect(centre.x).toBe(0);
    expect(centre.y).toBeCloseTo(-0.0265, 3);
    expect(centre.z).toBeCloseTo(-0.0297, 3);
  });

  it('legt den Zeigefinger an den Rahmen, die anderen Finger sind die der Faust', () => {
    // Der Finger, der die Schräge der Hand bestimmt, liegt gestreckt am
    // Rahmen und nicht am Abzug — siehe `GRIP_HAND_POSE`. Der Rest der Hand
    // ist die allgemeine Faust, denn die hält den Zylinder.
    expect(GRIP_HAND_POSE.curls[1]).toBeLessThan(HOLD_HAND_POSE.curls[1]!);
    expect(GRIP_HAND_POSE.curls.slice(2)).toEqual(HOLD_HAND_POSE.curls.slice(2));
    expect(GRIP_HAND_POSE.curls[0]).toBe(HOLD_HAND_POSE.curls[0]);
  });

  it('steht in `handPose.ts` als das, was `fistOnGrip` ausrechnet', () => {
    const want = fistOnGrip({
      centre: fistCentre(GRIP_HAND_POSE),
      finger: fingerDirection(GRIP_HAND_POSE),
    });
    expectPoseIs(GRIP_HAND_POSE, want);
  });

  it('nimmt ohne Angabe den Standardgriff, und der liegt im Griffpunkt', () => {
    // `GRIP_HOLD_POSITION` legt den Griff auf den Griffpunkt des Controllers —
    // also ist seine Mitte in der Hand die Null, und `fistOnGrip` ohne zweites
    // Argument ist die Faust um genau diesen Zylinder.
    expect(STANDARD_GRIP_IN_HAND.position.x).toBeCloseTo(0, 9);
    expect(STANDARD_GRIP_IN_HAND.position.y).toBeCloseTo(0, 9);
    expect(STANDARD_GRIP_IN_HAND.position.z).toBeCloseTo(0, 9);
    const fist = { centre: fistCentre(), finger: fingerDirection(GRIP_HAND_POSE) };
    expect(fistOnGrip(fist)).toEqual(fistOnGrip(fist, STANDARD_GRIP_IN_HAND));
  });

  it.each([
    ['Griff', () => new GripTool()],
    ['Pistole', () => new PistolTool()],
    ['Taschenlampe', () => new FlashlightTool()],
  ])('liegt am gebauten Werkzeug wirklich um den Griff: %s', (_name, build) => {
    const centre = fistCentre(GRIP_HAND_POSE);
    const fist = fistOf(defaultHoldPose('right', 'grip'), centre);
    // Auf dem Zylinder: quer zur Achse einen Millimeter genau, und auch
    // entlang der Achse auf seiner Mitte.
    expectFistOn(fist, gripOf(build()));
  });

  it('liegt an der linken Hand genauso, gespiegelt', () => {
    const centre = fistCentre(GRIP_HAND_POSE);
    const fist = fistOf(defaultHoldPose('left', 'grip'), centre);
    const grip = gripOf(new GripTool());
    // Dieselbe Rechnung mit der linken Hand: der Griff ist nicht gespiegelt,
    // die Hand schon — und trotzdem muss die Faust auf demselben Zylinder
    // sitzen, sonst hielte ein Werkzeug nur in einer Hand richtig.
    expectFistOn(fist, grip);
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
    const rotation = toQuat(at.rotation);
    const fist = fistCentre(GRIP_HAND_POSE)
      .applyQuaternion(rotation)
      .add(new THREE.Vector3(at.position.x, at.position.y, at.position.z));
    const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(rotation);
    // Und der Griff steht im Raum des Werkzeugs genau dort, wo er gebaut ist.
    const part = tool.gripPart!;
    const gripAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(part.quaternion);
    expectFistOn({ centre: fist, axis }, { centre: part.position.clone(), axis: gripAxis });
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

    const tool = hold(new GripTool());
    const front = new THREE.Vector3(0, 0, -1).applyQuaternion(
      tool.gripPart!.getWorldQuaternion(new THREE.Quaternion()),
    );
    // Dieselbe Richtung, nicht nur dieselbe Achse: ein Finger, der nach hinten
    // zeigt, läge auf derselben Linie und wäre trotzdem falsch herum.
    expect((Math.acos(Math.min(1, finger.dot(front))) * 180) / Math.PI).toBeLessThan(1);

    // Und die Schräge, um die es geht: die Hand steht **nicht** gerade am
    // Griff, sondern um genau die Krümmung des Fingers geschwenkt, der am
    // Rahmen liegt. Gestreckt sind das 17°; mit dem Finger am Abzug waren es
    // 58°, und die Handfläche stand als schräger Klotz hinter dem Griff.
    const straight = new THREE.Vector3(0, 0, -1).applyQuaternion(
      ghost.getWorldQuaternion(new THREE.Quaternion()),
    );
    expect((Math.acos(Math.min(1, straight.dot(front))) * 180) / Math.PI).toBeCloseTo(17, 0);
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

/**
 * Der Zylinder eines Werkzeugs ohne Standardgriff, so wie er in der Hand liegt:
 * aus der gebauten Lage des Werkzeugs und der seines Griffs darin.
 */
function ownGrip(
  tool: Tool,
  grip: { position: THREE.Vector3Like; rotation: THREE.QuaternionLike },
) {
  return gripInHand(
    { position: tool.holdPosition, rotation: tool.holdRotation },
    { position: grip.position, rotation: grip.rotation },
  );
}

describe('die Faust am Stiel des Hammers', () => {
  it('steht in `handPose.ts` als das, was `fistOnGrip` um den Stiel ausrechnet', () => {
    // Kein Finger, der etwas anzeigt: ein Stiel hat kein Vorne, und die Faust
    // steht ungeschwenkt so, wie `HAMMER_GRIP` es sagt.
    const want = fistOnGrip(
      { centre: fistCentre(HAMMER_HAND_POSE) },
      ownGrip(new HammerTool(), HAMMER_GRIP),
    );
    expectPoseIs(HAMMER_HAND_POSE, want);
    expect(HAMMER_HAND_POSE.curls[1]).toBeGreaterThanOrEqual(HOLD_HAND_POSE.curls[2]!);
  });

  it.each(['right', 'left'] as const)('liegt am gebauten Hammer um den Stiel: %s', (side) => {
    // Der Stiel liegt auf der z-Achse des Werkzeugs, und `showHeldBy` schiebt
    // ihn so, dass der Griffpunkt dieser Hand auf dem Ursprung sitzt — die
    // Faust muss also den Ursprung umschließen, mit ihrer Achse auf z.
    const tool = hold(new HammerTool(), side);
    const pole = {
      centre: tool.getWorldPosition(new THREE.Vector3()),
      axis: new THREE.Vector3(0, 0, 1).applyQuaternion(
        tool.getWorldQuaternion(new THREE.Quaternion()),
      ),
    };
    const fist = fistOf(defaultHoldPose(side, 'hammer'), fistCentre(HAMMER_HAND_POSE));
    expectFistOn(fist, pole);
    // Und die Daumenseite der Faust zeigt zum Kopf (-z): so hält man einen Hammer.
    const thumbSide = new THREE.Vector3(-1, 0, 0).applyQuaternion(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          defaultHoldPose(side, 'hammer').pitch * DEG,
          defaultHoldPose(side, 'hammer').yaw * DEG,
          defaultHoldPose(side, 'hammer').roll * DEG,
          'XYZ',
        ),
      ),
    );
    const mirror = side === 'left' ? -1 : 1;
    expect(thumbSide.clone().multiplyScalar(mirror).dot(pole.axis)).toBeLessThan(-0.99);
  });
});

describe('die Faust am Griff der Drohne', () => {
  it('steht in `handPose.ts` als das, was `fistOnGrip` um ihren Griff ausrechnet', () => {
    const want = fistOnGrip(
      { centre: fistCentre(DRONE_HAND_POSE) },
      ownGrip(new DroneTool(), DRONE_GRIP),
    );
    expectPoseIs(DRONE_HAND_POSE, want);
  });

  it.each(['right', 'left'] as const)(
    'liegt am gebauten Deck um den Griff dieser Hand: %s',
    (side) => {
      // Das Deck rutscht mit einer Hand zur Seite, damit der Griff dieser Seite
      // im Griffpunkt sitzt (`showHeldBy`). Von den beiden Zylindern am Deck ist
      // das der, der der Faust am nächsten liegt — und um den muss sie liegen.
      const tool = hold(new DroneTool(), side);
      const fist = fistOf(defaultHoldPose(side, 'drone'), fistCentre(DRONE_HAND_POSE));
      const shapes: THREE.Object3D[] = [];
      tool.traverse((object) => {
        if (object.name === `${GRIP_NAME}-shape`) shapes.push(object);
      });
      expect(shapes).toHaveLength(2);
      const grips = shapes.map(cylinderOf);
      grips.sort((a, b) => a.centre.distanceTo(fist.centre) - b.centre.distanceTo(fist.centre));
      expectFistOn(fist, grips[0]!);
      // Und der andere Griff ist wirklich der andere: einen Deckbreite weiter.
      expect(grips[1]!.centre.distanceTo(fist.centre)).toBeGreaterThan(0.15);
    },
  );

  it('ist nicht die Faust des Standardgriffs — die läge daneben', () => {
    // Die Zahl, wegen der die Drohne ihre eigene Faust braucht: der Griff am
    // Deck sitzt nicht dort, wo ein Pistolengriff liegt.
    const own = ownGrip(new DroneTool(), DRONE_GRIP);
    const gap = new THREE.Vector3(own.position.x, own.position.y, own.position.z).length();
    expect(gap * 100).toBeGreaterThan(3);
    expect(
      between(
        new THREE.Vector3(0, 1, 0).applyQuaternion(toQuat(own.rotation)),
        new THREE.Vector3(0, 1, 0).applyQuaternion(toQuat(STANDARD_GRIP_IN_HAND.rotation)),
      ),
    ).toBeGreaterThan(15);
  });
});
