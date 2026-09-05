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
 * gezeichnete Hand am wirklich gebauten Werkzeug landet. Für den Standardgriff
 * (auch am Messer und am Hals der Sektflasche), und mit derselben Rechnung für
 * alles mit eigenem Zylinder: den Stab (Hammer, Taschenlampe), denselben Stab
 * von oben am Pinsel, die Griffe der Drohne, den Rand der Stoppuhr, den Saum
 * des Beutels, die Querstange des Hängegleiters und den Handgriff des
 * Controllers — und für das, was auf der Hand sitzt statt in ihr.
 *
 * three.js, aber kein WebGL: das hier liest Zahlen aus einem Szenengraphen.
 */
import * as THREE from 'three';
import { GhostHand } from './HandVisuals';
import {
  BAG_HAND_POSE,
  BRUSH_HAND_POSE,
  CONTROLLER_HAND_POSE,
  DRONE_HAND_POSE,
  GLIDER_HAND_POSE,
  GRIP_HAND_POSE,
  HOLD_HAND_POSE,
  IDLE_HAND_POSE_RIGHT,
  POLE_HAND_POSE,
  STOPWATCH_FINGER_MOVES,
  STOPWATCH_HAND_POSE,
  WORN_HAND_POSE,
  buttonCurls,
  defaultHoldPose,
  type HandPose,
} from './handPose';
import { CONTROLLER_GRIP, CONTROLLER_HANDLE } from './controllerGrip';
import {
  GRIP_TO_RAY,
  STANDARD_GRIP_IN_HAND,
  fistOnGrip,
  gripInHand,
} from '../worlds/portal/tools/gripFit';
import { POLE_GRIP } from '../worlds/portal/tools/poleGrip';
import { IDENTITY } from '../worlds/portal/tools/aim';
import { GRIP_NAME } from '../worlds/portal/tools/grip';
import { ghostOnTool, poseOfHand, toolInGrip } from '../worlds/tune/handGrip';
import { GripTool } from '../worlds/portal/tools/GripTool';
import { PistolTool } from '../worlds/portal/tools/PistolTool';
import { WelderTool } from '../worlds/portal/tools/WelderTool';
import { HammerTool } from '../worlds/portal/tools/HammerTool';
import { FlashlightTool } from '../worlds/portal/tools/FlashlightTool';
import { BRUSH_GRIP, BrushTool } from '../worlds/portal/tools/BrushTool';
import { KnifeTool } from '../worlds/portal/tools/KnifeTool';
import { BAR_GRIP, HangGliderTool } from '../worlds/portal/tools/HangGliderTool';
import { DRONE_GRIP, DroneTool } from '../worlds/portal/tools/DroneTool';
import {
  CROWN_Y,
  STOPWATCH_GRIP,
  STOPWATCH_TILT,
  StopwatchTool,
} from '../worlds/portal/tools/StopwatchTool';
import { BAG_GRIP, MagicBagTool } from '../worlds/portal/tools/MagicBagTool';
import { SupermanGloveTool } from '../worlds/portal/tools/SupermanGloveTool';
import { snapToGrip } from '../worlds/portal/propGrip';
import { CHAMPAGNE_GRIP } from '../worlds/portal/champagne';
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
    ['Lötkolben', () => new WelderTool()],
    // Das Messer: der Griff steht in der Faust, die Klinge ragt oben heraus —
    // nicht mehr der Stab quer durch die Faust wie an der Taschenlampe.
    ['Messer', () => new KnifeTool()],
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

/** Ein Stab: die z-Achse des gehaltenen Werkzeugs durch seinen Ursprung. */
function poleOf(tool: Tool) {
  return {
    centre: tool.getWorldPosition(new THREE.Vector3()),
    axis: new THREE.Vector3(0, 0, 1).applyQuaternion(
      tool.getWorldQuaternion(new THREE.Quaternion()),
    ),
  };
}

/** Und ein Rand: die x-Achse des gehaltenen Werkzeugs durch seinen Ursprung. */
function rimOf(tool: Tool) {
  return {
    centre: tool.getWorldPosition(new THREE.Vector3()),
    axis: new THREE.Vector3(1, 0, 0).applyQuaternion(
      tool.getWorldQuaternion(new THREE.Quaternion()),
    ),
  };
}

/** Die Drehung einer Haltung, als Quaternion. */
function rotationOf(pose: HandPose): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(pose.pitch * DEG, pose.yaw * DEG, pose.roll * DEG, 'XYZ'),
  );
}

describe('die Faust am Stab', () => {
  it('steht in `handPose.ts` als das, was `fistOnGrip` um den Stab ausrechnet', () => {
    // Kein Finger, der etwas anzeigt: ein Stab hat kein Vorne, und die Faust
    // steht ungeschwenkt so, wie `POLE_GRIP` es sagt.
    const want = fistOnGrip(
      { centre: fistCentre(POLE_HAND_POSE) },
      ownGrip(new HammerTool(), POLE_GRIP),
    );
    expectPoseIs(POLE_HAND_POSE, want);
    expect(POLE_HAND_POSE.curls[1]).toBeGreaterThanOrEqual(HOLD_HAND_POSE.curls[2]!);
  });

  it.each([
    ['Hammer', () => new HammerTool()],
    ['Taschenlampe', () => new FlashlightTool()],
  ])('ist für beide dieselbe, und sie liegt um den Stab: %s', (_name, build) => {
    // Zwei Werkzeuge, ein Stab, eine Faust: sie tragen dieselbe `holdPosition`
    // und dieselbe Haltung — sonst hielte eine Faust zwei verschiedene Stäbe.
    const tool = build();
    expect(defaultHoldPose('right', tool.toolId)).toEqual(POLE_HAND_POSE);
    expect(tool.alignToAim).toBe(true);
    for (const side of ['right', 'left'] as const) {
      // Der Stab liegt auf der z-Achse des Werkzeugs durch seinen Ursprung —
      // beim Hammer schiebt `showHeldBy` den Stiel so, dass der Griffpunkt
      // dieser Hand dort sitzt. Die Faust muss ihn dort umschließen.
      const held = hold(build(), side);
      const fist = fistOf(defaultHoldPose(side, tool.toolId), fistCentre(POLE_HAND_POSE));
      expectFistOn(fist, poleOf(held));
    }
  });

  it('hält den Stab mit der Daumenseite zur Spitze — so hält man einen Hammer', () => {
    for (const side of ['right', 'left'] as const) {
      const pole = poleOf(hold(new HammerTool(), side));
      const mirror = side === 'left' ? -1 : 1;
      const thumbSide = new THREE.Vector3(-mirror, 0, 0).applyQuaternion(
        rotationOf(defaultHoldPose(side, 'hammer')),
      );
      // Die Spitze liegt bei -z; die Daumenseite (-x der rechten Hand) zeigt dorthin.
      expect(thumbSide.dot(pole.axis)).toBeLessThan(-0.99);
    }
  });
});

describe('die Faust am Pinsel', () => {
  it('steht in `handPose.ts` als das, was `fistOnGrip` um den Stiel von oben ausrechnet', () => {
    const want = fistOnGrip(
      { centre: fistCentre(BRUSH_HAND_POSE) },
      ownGrip(new BrushTool(), BRUSH_GRIP),
    );
    expectPoseIs(BRUSH_HAND_POSE, want);
    // Der Zeigefinger liegt am Stiel, statt sich ganz darum zu schließen.
    expect(BRUSH_HAND_POSE.curls[1]).toBeLessThan(BRUSH_HAND_POSE.curls[2]!);
  });

  it.each(['right', 'left'] as const)(
    'liegt von oben um den Stiel, Handrücken oben, Daumen zur Spitze: %s',
    (side) => {
      // Derselbe Stab wie beim Hammer — dieselbe `holdPosition`, derselbe
      // Zeigestrahl —, nur die Hand liegt anders darum.
      const tool = hold(new BrushTool(), side);
      expect(tool.alignToAim).toBe(true);
      expect(tool.holdPosition).toEqual(new HammerTool().holdPosition);
      const pose = defaultHoldPose(side, 'brush');
      const fist = fistOf(pose, fistCentre(BRUSH_HAND_POSE));
      const pole = poleOf(tool);
      expectFistOn(fist, pole);
      const rotation = rotationOf(pose);
      const toolRotation = tool.getWorldQuaternion(new THREE.Quaternion());
      // Der Handrücken zeigt nach oben (+y des Werkzeugs): die Hand greift
      // von oben über den Stiel, wie ein Maler.
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(toolRotation);
      const back = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation);
      expect(back.dot(up)).toBeGreaterThan(0.99);
      // Und die Daumenseite zeigt zur Spitze (-z).
      const mirror = side === 'left' ? -1 : 1;
      const thumbSide = new THREE.Vector3(-mirror, 0, 0).applyQuaternion(rotation);
      expect(thumbSide.dot(pole.axis)).toBeLessThan(-0.99);
    },
  );
});

/** Die seitliche Kante der Uhr: die y-Achse des gehaltenen Werkzeugs durch seinen Ursprung. */

describe('die Faust um die Stoppuhr', () => {
  it('steht in `handPose.ts` als das, was `fistOnGrip` um die Kante ausrechnet', () => {
    const want = fistOnGrip(
      { centre: fistCentre(STOPWATCH_HAND_POSE) },
      ownGrip(new StopwatchTool(), STOPWATCH_GRIP),
    );
    expectPoseIs(STOPWATCH_HAND_POSE, want);
  });

  it.each(['right', 'left'] as const)(
    'liegt um die seitliche Kante, Handfläche hinter dem Blatt, Daumen oben: %s',
    (side) => {
      const tool = hold(new StopwatchTool(), side);
      const pose = defaultHoldPose(side, 'stopwatch');
      const fist = fistOf(pose, fistCentre(STOPWATCH_HAND_POSE));
      const mirror = side === 'left' ? -1 : 1;
      const toolRotation = tool.getWorldQuaternion(new THREE.Quaternion());
      // Die Kante als Zylinder: durch den Griffpunkt, um `STOPWATCH_TILT` aus
      // der Senkrechten gekippt — nach links oben bei der rechten Hand, nach
      // rechts oben bei der linken.
      const up = new THREE.Vector3(
        mirror * Math.sin(STOPWATCH_TILT),
        Math.cos(STOPWATCH_TILT),
        0,
      ).applyQuaternion(toolRotation);
      expectFistOn(fist, { centre: tool.getWorldPosition(new THREE.Vector3()), axis: up });
      const rotation = rotationOf(pose);
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(toolRotation);
      // Der Handrücken zeigt nach hinten (-z des Werkzeugs), das Blatt schaut
      // nach vorn zum Kopf (+z): die Hand steht hinter der Uhr und verdeckt
      // den Zeiger nicht.
      const back = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation);
      expect(back.dot(forward)).toBeGreaterThan(0.99);
      // Und die Daumenseite zeigt die Kante hinauf, zur Krone.
      const thumbSide = new THREE.Vector3(-mirror, 0, 0).applyQuaternion(rotation);
      expect(thumbSide.dot(up)).toBeGreaterThan(0.99);
      // Das Gehäuse liegt neben der Faust, auf der Seite der Handfläche: rechts
      // von einer rechten Hand, links von einer linken.
      const shell = tool.children.find((child) => child.children.length > 3)!;
      expect(Math.sign(shell.position.x)).toBe(mirror);
    },
  );
});

/**
 * Die Kuppe des **Daumens** einer Hand in dieser Haltung, im Griffraum: das Ende
 * seines zweiten Knochens, wie die Hand ihn zeichnet (`buildChain`).
 */
function thumbTip(pose: HandPose): THREE.Vector3 {
  const ghost = new GhostHand('right', pose, { opacity: 1 });
  ghost.position.set(pose.x / 100, pose.y / 100, pose.z / 100);
  ghost.quaternion.copy(rotationOf(pose));
  ghost.updateMatrixWorld(true);
  const hand = ghost.children[0]!;
  const root = hand.children.filter((child) => !(child as THREE.Mesh).isMesh)[0]!;
  const first = root.children.find((child) => !(child as THREE.Mesh).isMesh)!;
  const second = first.children.find((child) => !(child as THREE.Mesh).isMesh)!;
  return new THREE.Vector3(0, 0, -0.028).applyMatrix4(second.matrixWorld);
}

describe('der Daumen auf der Krone der Stoppuhr', () => {
  /**
   * Die Krone der gehaltenen Uhr: oben auf dem Gehäuse, das je Hand zur Seite
   * rückt — im Raum des Werkzeugs bei (±RADIUS, CROWN_Y, 0), ihr Scheitel 7 mm
   * höher. Und der Weg zurück in diesen Raum.
   */
  function crown() {
    const tool = hold(new StopwatchTool(), 'right');
    const body = tool.children.find((child) => child.children.length > 3)!;
    return {
      top: new THREE.Vector3(body.position.x, CROWN_Y + 0.007, 0).applyMatrix4(tool.matrixWorld),
      inTool: tool.matrixWorld.clone().invert(),
    };
  }

  it('liegt in Ruhe auf ihr', () => {
    const tip = thumbTip(STOPWATCH_HAND_POSE);
    expect(tip.distanceTo(crown().top)).toBeLessThan(0.015);
  });

  it('drückt sie mit dem Trigger hinunter — die Kuppe geht tiefer, nicht der Zeigefinger', () => {
    const pressed = {
      ...STOPWATCH_HAND_POSE,
      curls: buttonCurls(STOPWATCH_HAND_POSE, STOPWATCH_FINGER_MOVES, {
        grab: true,
        trigger: true,
      }),
    };
    const { inTool } = crown();
    const rest = thumbTip(STOPWATCH_HAND_POSE).applyMatrix4(inTool);
    const down = thumbTip(pressed).applyMatrix4(inTool);
    // Hinunter heißt entlang der Krone: -y des Werkzeugs, um mindestens 5 mm.
    expect(rest.y - down.y).toBeGreaterThan(0.005);
    expect(pressed.curls[1]).toBe(STOPWATCH_HAND_POSE.curls[1]);
  });
});

describe('die Faust am Hals der Sektflasche', () => {
  // Kein Werkzeug, ein Ding aus dem Beutel — aber mit Griff: beim Zugreifen
  // rastet der Hals in die Faust um den Standardgriff (`propGrip.ts`), und die
  // Hand trägt dazu dieselbe Haltung wie an der Pistole. Beides muss
  // zusammenpassen, sonst hielte die Hand den Hals daneben. Eine Weile war es
  // der Stab, und die Flasche lag in der Hand wie eine Taschenlampe.
  it.each(['right', 'left'] as const)('liegt um den Hals, aufrecht wie über Kopf: %s', (side) => {
    const pose = defaultHoldPose(side, 'champagne');
    expect(pose).toEqual(defaultHoldPose(side, 'grip'));
    const fist = fistOf(pose, fistCentre(GRIP_HAND_POSE));
    for (const flip of [0, Math.PI]) {
      const current = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), flip);
      const snap = snapToGrip(current, CHAMPAGNE_GRIP);
      const neck = {
        centre: CHAMPAGNE_GRIP.centre.clone().applyQuaternion(snap.rotation).add(snap.position),
        axis: CHAMPAGNE_GRIP.axis.clone().applyQuaternion(snap.rotation),
      };
      // Die Faust ist für rechts gerechnet; links ist ihre Spiegelung, und
      // der Griffraum ist nicht gespiegelt — also der Hals gespiegelt an ihn.
      if (side === 'left') {
        neck.centre.x = -neck.centre.x;
        neck.axis.x = -neck.axis.x;
      }
      expectFistOn(fist, neck);
    }
  });
});

describe('die Faust am Saum des Beutels', () => {
  it('steht in `handPose.ts` als das, was `fistOnGrip` mit Zielkorrektur ausrechnet', () => {
    // Der Beutel zielt nicht (`alignToAim = false`), hängt aber aufrecht im
    // Raum (`hangsUpright`) — und bei zielend gehaltenem Controller ist das
    // Aufrechte der Strahlraum. Also dieselbe Zielkorrektur wie bei allem,
    // das zielt; ohne sie stand die Hand in der Brille 30° gekippt am Saum.
    const tool = new MagicBagTool();
    expect(tool.alignToAim).toBe(false);
    expect(tool.hangsUpright).toBe(true);
    const want = fistOnGrip(
      { centre: fistCentre(BAG_HAND_POSE) },
      gripInHand(
        { position: tool.holdPosition, rotation: tool.holdRotation },
        { position: BAG_GRIP.position, rotation: BAG_GRIP.rotation },
        GRIP_TO_RAY,
      ),
    );
    expectPoseIs(BAG_HAND_POSE, want);
  });

  it.each(['right', 'left'] as const)(
    'liegt um den Saum wie unter einer offenen Kappe: %s',
    (side) => {
      // So gehalten, wie er im Spiel bei zielendem Controller hängt: mit der
      // Zielkorrektur, wie jedes Werkzeug in `hold`.
      const tool = hold(new MagicBagTool(), side);
      const fist = fistOf(defaultHoldPose(side, 'bag'), fistCentre(BAG_HAND_POSE));
      expectFistOn(fist, rimOf(tool));
      // Der Beutel hängt vor der Hand (-z des Werkzeugs), und die Hand liegt
      // wie unter einer offenen Kappe: Handfläche nach oben, der Handrücken
      // zeigt nach unten (-y des Werkzeugs), der Daumen liegt außen am Saum —
      // rechts nach rechts.
      const rotation = rotationOf(defaultHoldPose(side, 'bag'));
      const toolRotation = tool.getWorldQuaternion(new THREE.Quaternion());
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(toolRotation);
      const back = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation);
      expect(back.dot(up)).toBeLessThan(-0.99);
      const mirror = side === 'left' ? -1 : 1;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(toolRotation);
      const thumbSide = new THREE.Vector3(-mirror, 0, 0).applyQuaternion(rotation);
      expect(thumbSide.dot(right) * mirror).toBeGreaterThan(0.99);
    },
  );
});

describe('die Faust an der Querstange des Hängegleiters', () => {
  it('steht in `handPose.ts` als das, was `fistOnGrip` um die Stange ausrechnet', () => {
    // Kein Finger, der etwas anzeigt: eine Stange hält man mit der ganzen
    // Faust, wie einen Lenker.
    const want = fistOnGrip(
      { centre: fistCentre(GLIDER_HAND_POSE) },
      ownGrip(new HangGliderTool(), BAR_GRIP),
    );
    expectPoseIs(GLIDER_HAND_POSE, want);
  });

  it.each(['right', 'left'] as const)(
    'liegt quer um die Stange, Handrücken oben, Daumen zur Mitte: %s',
    (side) => {
      const tool = hold(new HangGliderTool(), side);
      expect(tool.gripPart).toBeNull();
      const pose = defaultHoldPose(side, 'hang-glider');
      const fist = fistOf(pose, fistCentre(GLIDER_HAND_POSE));
      // Die Stange: die x-Achse des gehaltenen Werkzeugs durch seinen Ursprung.
      const bar = {
        centre: tool.getWorldPosition(new THREE.Vector3()),
        axis: new THREE.Vector3(1, 0, 0).applyQuaternion(
          tool.getWorldQuaternion(new THREE.Quaternion()),
        ),
      };
      expectFistOn(fist, bar);
      const rotation = rotationOf(pose);
      const toolRotation = tool.getWorldQuaternion(new THREE.Quaternion());
      // Von oben gehalten: der Handrücken zeigt nach oben (+y des Werkzeugs).
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(toolRotation);
      const back = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation);
      expect(back.dot(up)).toBeGreaterThan(0.99);
      // Und der Daumen zeigt zur Mitte der Stange: bei der rechten Hand am
      // rechten Ende nach links (-x), bei der linken am linken Ende nach rechts.
      const mirror = side === 'left' ? -1 : 1;
      const thumbSide = new THREE.Vector3(-mirror, 0, 0).applyQuaternion(rotation);
      expect(thumbSide.dot(bar.axis) * mirror).toBeLessThan(-0.99);
    },
  );
});

describe('die Faust am Handgriff des Controllers', () => {
  it('steht in `handPose.ts` als das, was `fistOnGrip` um den Handgriff ausrechnet', () => {
    // Der Controller liegt im Griffraum selbst (`holdPosition` null, keine
    // Zielkorrektur), sein Handgriff darin entlang z. Der Zeigefinger liegt
    // gestreckt am Rahmen wie an der Pistole — zum Trigger hinunter.
    const want = fistOnGrip(
      { centre: fistCentre(GRIP_HAND_POSE), finger: fingerDirection(GRIP_HAND_POSE) },
      gripInHand({ position: { x: 0, y: 0, z: 0 }, rotation: IDENTITY }, CONTROLLER_GRIP, IDENTITY),
    );
    expectPoseIs(CONTROLLER_HAND_POSE, want);
    expect(CONTROLLER_HAND_POSE.curls).toEqual(GRIP_HAND_POSE.curls);
  });

  it.each(['right', 'left'] as const)(
    'liegt um den Handgriff, Daumen zum Kopf des Geräts, Handrücken außen: %s',
    (side) => {
      const mirror = side === 'left' ? -1 : 1;
      const pose = defaultHoldPose(side, `controller-${side}`);
      const fist = fistOf(pose, fistCentre(GRIP_HAND_POSE));
      // Der Handgriff im Griffraum, für die linke Schale gespiegelt.
      const handle = {
        centre: new THREE.Vector3(
          mirror * CONTROLLER_HANDLE.centre.x,
          CONTROLLER_HANDLE.centre.y,
          CONTROLLER_HANDLE.centre.z,
        ),
        axis: new THREE.Vector3(0, 0, 1),
      };
      expectFistOn(fist, handle);
      const rotation = rotationOf(pose);
      // Der Daumen liegt am Kopf des Geräts (-z), wo Stick und Tasten sind.
      const thumbSide = new THREE.Vector3(-mirror, 0, 0).applyQuaternion(rotation);
      expect(thumbSide.z).toBeLessThan(-0.99);
      // Der Handrücken zeigt nach außen: rechts nach rechts, links nach links.
      const back = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation);
      expect(back.x * mirror).toBeGreaterThan(0.9);
    },
  );

  it('hält den Handgriff dort, wo das Modell des Herstellers ihn hat', () => {
    // Aus dem Profil des Quest Touch Plus abgelesen: der Griff läuft von kurz
    // vor dem Ursprung nach hinten heraus, und der Trigger hängt am -Z-Ende
    // unter dem Kopf. Wäre der Griff woanders — nach unten, wie in der ersten
    // Fassung des gebauten Controllers —, hielte die Faust Luft.
    expect(CONTROLLER_HANDLE.from).toBeLessThan(CONTROLLER_HANDLE.centre.z);
    expect(CONTROLLER_HANDLE.to).toBeGreaterThan(CONTROLLER_HANDLE.centre.z);
    expect(CONTROLLER_HANDLE.to - CONTROLLER_HANDLE.from).toBeGreaterThan(0.06);
  });
});

describe('was auf der Hand sitzt statt in ihr', () => {
  it('trägt die Grundhaltung: der Handschuh sitzt, wo die Hand ohne ihn säße', () => {
    expect(WORN_HAND_POSE).toMatchObject({
      x: IDLE_HAND_POSE_RIGHT.x,
      y: IDLE_HAND_POSE_RIGHT.y,
      z: IDLE_HAND_POSE_RIGHT.z,
      pitch: IDLE_HAND_POSE_RIGHT.pitch,
      yaw: IDLE_HAND_POSE_RIGHT.yaw,
      roll: IDLE_HAND_POSE_RIGHT.roll,
      curls: IDLE_HAND_POSE_RIGHT.curls,
    });
    for (const id of ['gravity-glove', 'translate-glove', 'superman-glove']) {
      expect(defaultHoldPose('right', id)).toEqual(WORN_HAND_POSE);
    }
    // Der Controller nicht: der liegt *in* der Hand, und die Faust darum ist
    // um seinen Handgriff gerechnet (siehe oben) — nicht die Grundhaltung.
    expect(defaultHoldPose('right', 'controller-right')).toEqual(CONTROLLER_HAND_POSE);
    expect(CONTROLLER_HAND_POSE.pitch).not.toBe(IDLE_HAND_POSE_RIGHT.pitch);
  });

  it('folgt der Hand: der Handschuh liegt im Griff genau dort, wo die Haltung sagt', () => {
    // `Tool.worn`: die Lage im Griff *ist* die Handhaltung — für die Hand, die
    // ihn trägt, und ohne Zielkorrektur.
    const glove = new SupermanGloveTool();
    expect(glove.worn).toBe(true);
    expect(glove.alignToAim).toBe(false);
    for (const side of ['right', 'left'] as const) {
      glove.showHeldBy(side);
      const pose = defaultHoldPose(side, 'superman-glove');
      expect(glove.holdPosition.x).toBeCloseTo(pose.x / 100, 9);
      expect(glove.holdPosition.y).toBeCloseTo(pose.y / 100, 9);
      expect(glove.holdPosition.z).toBeCloseTo(pose.z / 100, 9);
      expect(glove.holdRotation.angleTo(rotationOf(pose))).toBeLessThan(1e-6);
    }
    // Der Controller dagegen liegt im Griffraum und bleibt dort: er ist das
    // Gerät (`ControllerTool.ts`, `holdPosition` null). Gebaut wird er hier
    // nicht — sein Modul zieht den GLTF-Lader aus three mit, den Jest ohne
    // ESM nicht laden kann; die Hand daran ist oben geprüft.
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
