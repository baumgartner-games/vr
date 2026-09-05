import { conjugate, multiplyQuat, rotateVec, IDENTITY, type Quat, type Vec3 } from './aim';
import {
  GRIP_HOLD_POSITION,
  GRIP_TO_RAY,
  STANDARD_GRIP,
  gripDeviation,
  gripInTool,
  holdForGrip,
  type GripPose,
} from './gripFit';
import { quatFromEulerXYZ } from './toolPose';
import {
  DRONE_HAND_POSE,
  HOLD_HAND_POSE,
  STANDARD_GRIP_TOOLS,
  defaultHoldPose,
} from '../../../core/handPose';

const euler = (x: number, y = 0, z = 0): Quat => quatFromEulerXYZ({ x, y, z });

/**
 * Wo der Griff eines Werkzeugs in der Faust landet — Ort im Strahlrahmen,
 * Drehung ebenso. `aim` steht auf beiden Seiten jedes Vergleichs und kürzt sich
 * weg, solange die `holdPosition` geteilt ist; deshalb steht sie hier drin.
 */
function inHand(hold: Quat, grip: GripPose): GripPose {
  const offset = rotateVec(grip.position, hold, { x: 0, y: 0, z: 0 });
  return {
    position: {
      x: GRIP_HOLD_POSITION.x + offset.x,
      y: GRIP_HOLD_POSITION.y + offset.y,
      z: GRIP_HOLD_POSITION.z + offset.z,
    },
    rotation: multiplyQuat(hold, grip.rotation, { x: 0, y: 0, z: 0, w: 1 }),
  };
}

function angleBetweenQuats(a: Quat, b: Quat): number {
  const between = multiplyQuat(conjugate(a, { x: 0, y: 0, z: 0, w: 1 }), b, {
    x: 0,
    y: 0,
    z: 0,
    w: 1,
  });
  return (2 * Math.acos(Math.min(1, Math.abs(between.w))) * 180) / Math.PI;
}

/** Das Vorne eines Griffs (-Z), im Raum des Werkzeugs. */
const frontOf = (q: Quat): Vec3 => rotateVec({ x: 0, y: 0, z: -1 }, q, { x: 0, y: 0, z: 0 });

describe('Ein Griff für alle Werkzeuge', () => {
  it('legt den Griff bei jeder Haltung an dieselbe Stelle in der Faust', () => {
    // Das ist die ganze Behauptung: egal wie schräg ein Werkzeug in der Hand
    // liegt, `gripInTool` setzt seinen Griff so hinein, dass er in der Faust
    // dort landet, wo er hingehört. Ohne `aim`, ohne Brille.
    for (const hold of [IDENTITY, euler(0.3), euler(-0.55), euler(0.5, -0.3, 0.9)]) {
      const at = inHand(hold, gripInTool(hold));
      expect(at.position.x).toBeCloseTo(GRIP_HOLD_POSITION.x + STANDARD_GRIP.position.x, 9);
      expect(at.position.y).toBeCloseTo(GRIP_HOLD_POSITION.y + STANDARD_GRIP.position.y, 9);
      expect(at.position.z).toBeCloseTo(GRIP_HOLD_POSITION.z + STANDARD_GRIP.position.z, 9);
      expect(angleBetweenQuats(at.rotation, STANDARD_GRIP.rotation)).toBeCloseTo(0, 4);
    }
  });

  it('misst sich selbst als abweichungsfrei', () => {
    for (const hold of [IDENTITY, euler(0.3), euler(-0.55, 0.2, -0.1)]) {
      const deviation = gripDeviation(hold, gripInTool(hold));
      expect(deviation.distance).toBeCloseTo(0, 9);
      expect(deviation.angle).toBeCloseTo(0, 4);
    }
  });

  it('rechnet auch rückwärts: aus dem Griff die Haltung', () => {
    // Für alles, dessen Griff nicht frei wählbar ist. Beide Wege müssen
    // dieselbe Lage ergeben.
    for (const grip of [IDENTITY, euler(-Math.PI / 2), euler(0.4, 0.2, -0.7)]) {
      const hold = holdForGrip(grip);
      expect(
        angleBetweenQuats(
          multiplyQuat(hold, grip, { x: 0, y: 0, z: 0, w: 1 }),
          STANDARD_GRIP.rotation,
        ),
      ).toBeCloseTo(0, 4);
    }
  });

  it('hält den Griff genau dort, wo er im Spiel schon lag', () => {
    // Die Pistole ist die Messlatte: was `gripInTool` ausrechnet, muss der
    // Kasten sein, der vor dem Standardgriff von Hand dort hingesetzt war —
    // BoxGeometry(0.03, 0.1, 0.045) bei (0, -0.055, 0.01), rotation.x = -0.22.
    const at = gripInTool(IDENTITY);
    expect(at.position.y).toBeCloseTo(-0.055, 6);
    expect(at.position.z).toBeCloseTo(0.01, 6);
    expect(angleBetweenQuats(at.rotation, euler(-0.22))).toBeCloseTo(0, 4);
  });

  it('legt ihn dabei auf den Griffpunkt des Controllers — in die Mitte der Faust', () => {
    // Das ist die Aufgabe der geteilten `holdPosition`: Werkzeug plus Griff
    // ergeben null. Vorher stand dort die gebaute Zahl der Pistole, und der
    // Griff hing damit 8,6 cm neben der Hand.
    const at = rotateVec(STANDARD_GRIP.position, GRIP_TO_RAY, { x: 0, y: 0, z: 0 });
    expect(GRIP_HOLD_POSITION.x + at.x).toBeCloseTo(0, 9);
    expect(GRIP_HOLD_POSITION.y + at.y).toBeCloseTo(0, 9);
    expect(GRIP_HOLD_POSITION.z + at.z).toBeCloseTo(0, 9);
    // Und die alte Zahl lag genau so weit daneben, wie oben behauptet.
    const old = { x: 0, y: -0.012, z: 0.03 };
    expect(Math.hypot(old.x + at.x, old.y + at.y, old.z + at.z) * 100).toBeCloseTo(8.6, 1);
  });

  it('lässt den Griff nach vorn zeigen, wohin das Werkzeug zeigt', () => {
    // Das „vorne" des Griffs ist die Richtung des Zeigefingers, und bei allem,
    // was den Standardgriff trägt, ist das die Zielrichtung. Ein Grad
    // Abweichung wäre hier ein Fehler; zwölf sind die Lehne des Griffs.
    const front = frontOf(gripInTool(IDENTITY).rotation);
    expect(front.z).toBeLessThan(-0.97);
    expect(front.x).toBeCloseTo(0, 6);
  });
});

describe('Was die Werkzeuge vorher hatten', () => {
  /**
   * Die Griffe, wie sie vor dem Standardgriff von Hand hingesetzt waren. Der
   * Test hält die Zahlen fest, mit denen die Sache begründet wurde — sie sind
   * der Grund für die ganze Datei und sollen nachlesbar bleiben.
   */
  const before: Array<[string, Quat, GripPose, number, number]> = [
    // Name, holdRotation, alter Griff, Δ cm, Δ Grad
    [
      'Duplizierer',
      IDENTITY,
      { position: { x: 0, y: -0.05, z: 0.02 }, rotation: euler(0.18) },
      1.1,
      23,
    ],
    [
      'Inspektor',
      euler(-0.4),
      { position: { x: 0, y: -0.05, z: 0.015 }, rotation: euler(0.2) },
      2.8,
      1,
    ],
    [
      'Größe & Position',
      IDENTITY,
      { position: { x: 0, y: -0.05, z: 0.015 }, rotation: IDENTITY },
      0.7,
      13,
    ],
    [
      'Holster',
      IDENTITY,
      { position: { x: 0, y: -0.048, z: 0.015 }, rotation: euler(0.2) },
      0.9,
      24,
    ],
    [
      'Teleporter',
      IDENTITY,
      { position: { x: 0, y: -0.05, z: 0.01 }, rotation: euler(-0.2) },
      0.5,
      1,
    ],
    [
      'Greifhaken',
      IDENTITY,
      { position: { x: 0, y: -0.05, z: 0.005 }, rotation: euler(-0.2) },
      0.7,
      1,
    ],
    [
      'Lötkolben',
      IDENTITY,
      { position: { x: 0, y: 0, z: -0.01 }, rotation: euler(Math.PI / 2) },
      5.9,
      103,
    ],
  ];

  it.each(before)('%s lag %s', (_name, hold, grip, distance, angle) => {
    const deviation = gripDeviation(hold, grip);
    expect(deviation.distance * 100).toBeCloseTo(distance, 0);
    expect(deviation.angle).toBeCloseTo(angle, 0);
  });

  it('erklärt, warum eine Faust für alle nicht reichte', () => {
    // Sieben Werkzeuge, dieselbe Faust, und die Griffe darunter bis zu 24°
    // gegeneinander verdreht.
    const worst = before
      .filter(([name]) => name !== 'Lötkolben')
      .reduce((max, [, hold, grip]) => Math.max(max, gripDeviation(hold, grip).angle), 0);
    expect(worst).toBeGreaterThan(20);
  });
});

describe('Die Faust gehört zum Griff, nicht zum Werkzeug', () => {
  it('gibt jedem Werkzeug mit Standardgriff dieselbe Faust', () => {
    const grip = defaultHoldPose('right', 'grip');
    for (const toolId of STANDARD_GRIP_TOOLS) {
      expect(defaultHoldPose('right', toolId)).toEqual(grip);
    }
    // Auch quer über das, was einmal zwei Griffarten waren: die Lampe hält
    // ihren Griff genauso wie die Pistole, weil es derselbe Griff ist.
    expect(defaultHoldPose('right', 'flashlight')).toEqual(defaultHoldPose('right', 'pistol'));
  });

  it('spiegelt sie auf die linke Hand, statt sie zweimal zu pflegen', () => {
    const right = defaultHoldPose('right', 'flashlight');
    const left = defaultHoldPose('left', 'flashlight');
    expect(left.x).toBeCloseTo(-right.x, 6);
    expect(left.yaw).toBeCloseTo(-right.yaw, 6);
    expect(left.roll).toBeCloseTo(-right.roll, 6);
    expect(left.pitch).toBeCloseTo(right.pitch, 6);
  });

  it('lässt ein Werkzeug ohne Standardgriff nicht an dessen Faust', () => {
    expect(STANDARD_GRIP_TOOLS.has('drone')).toBe(false);
    // Wer keinen Standardgriff trägt, erbt auch keine Haltung daran: die
    // Drohne hat ihre eigene Faust um ihren eigenen Zylinder (`DRONE_HAND_POSE`,
    // nachgerechnet in `core/gripFist.test.ts`) …
    expect(defaultHoldPose('right', 'drone')).toEqual(DRONE_HAND_POSE);
    expect(defaultHoldPose('right', 'drone')).not.toEqual(defaultHoldPose('right', 'brush'));
    // … und was gar keinen Zylinder hat, bleibt bei der allgemeinen Faust.
    expect(STANDARD_GRIP_TOOLS.has('shuriken')).toBe(false);
    expect(defaultHoldPose('right', 'shuriken')).toEqual(HOLD_HAND_POSE);
  });
});
