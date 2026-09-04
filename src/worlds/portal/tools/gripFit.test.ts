import { conjugate, multiplyQuat, rotateVec, IDENTITY, type Quat, type Vec3 } from './aim';
import {
  GRIP_HOLD_POSITIONS,
  STANDARD_GRIPS,
  gripDeviation,
  gripInTool,
  holdForGrip,
  type GripPose,
} from './gripFit';
import { quatFromEulerXYZ } from './toolPose';
import { GRIP_HAND_POSES, TOOL_GRIPS, defaultHoldPose } from '../../../core/handPose';

const D = Math.PI / 180;
const euler = (x: number, y = 0, z = 0): Quat => quatFromEulerXYZ({ x, y, z });

/**
 * Wo der Griff eines Werkzeugs in der Faust landet — Ort im Strahlrahmen,
 * Drehung ebenso. `aim` steht auf beiden Seiten jedes Vergleichs und kürzt sich
 * weg, solange die `holdPosition` geteilt ist; deshalb steht sie hier drin.
 */
function inHand(hold: Quat, holdPosition: Vec3, grip: GripPose): GripPose {
  const offset = rotateVec(grip.position, hold, { x: 0, y: 0, z: 0 });
  return {
    position: {
      x: holdPosition.x + offset.x,
      y: holdPosition.y + offset.y,
      z: holdPosition.z + offset.z,
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

/** Die Achse eines Griffs (+Y) und sein Vorne (-Z), im Raum des Werkzeugs. */
const axisOf = (q: Quat): Vec3 => rotateVec({ x: 0, y: 1, z: 0 }, q, { x: 0, y: 0, z: 0 });
const frontOf = (q: Quat): Vec3 => rotateVec({ x: 0, y: 0, z: -1 }, q, { x: 0, y: 0, z: 0 });

describe('Ein Griff für alle Werkzeuge', () => {
  it('legt den Griff bei jeder Haltung an dieselbe Stelle in der Faust', () => {
    // Das ist die ganze Behauptung: egal wie schräg ein Werkzeug in der Hand
    // liegt, `gripInTool` setzt seinen Griff so hinein, dass er in der Faust
    // dort landet, wo er hingehört. Ohne `aim`, ohne Brille.
    for (const kind of ['pistol', 'rod'] as const) {
      for (const hold of [IDENTITY, euler(0.3), euler(-0.55), euler(0.5, -0.3, 0.9)]) {
        const at = inHand(hold, GRIP_HOLD_POSITIONS[kind], gripInTool(kind, hold));
        const want = STANDARD_GRIPS[kind];
        expect(at.position.x).toBeCloseTo(GRIP_HOLD_POSITIONS[kind].x + want.position.x, 9);
        expect(at.position.y).toBeCloseTo(GRIP_HOLD_POSITIONS[kind].y + want.position.y, 9);
        expect(at.position.z).toBeCloseTo(GRIP_HOLD_POSITIONS[kind].z + want.position.z, 9);
        expect(angleBetweenQuats(at.rotation, want.rotation)).toBeCloseTo(0, 4);
      }
    }
  });

  it('misst sich selbst als abweichungsfrei', () => {
    for (const kind of ['pistol', 'rod'] as const) {
      for (const hold of [IDENTITY, euler(0.3), euler(-0.55, 0.2, -0.1)]) {
        const deviation = gripDeviation(kind, hold, gripInTool(kind, hold));
        expect(deviation.distance).toBeCloseTo(0, 9);
        expect(deviation.angle).toBeCloseTo(0, 4);
      }
    }
  });

  it('rechnet auch rückwärts: aus dem Griff die Haltung', () => {
    // Für alles, dessen Griff nicht frei wählbar ist — das Rohr einer Lampe
    // liegt, wo es liegt. Beide Wege müssen dieselbe Lage ergeben.
    for (const kind of ['pistol', 'rod'] as const) {
      for (const grip of [IDENTITY, euler(-Math.PI / 2), euler(0.4, 0.2, -0.7)]) {
        const hold = holdForGrip(kind, grip);
        expect(
          angleBetweenQuats(
            multiplyQuat(hold, grip, { x: 0, y: 0, z: 0, w: 1 }),
            STANDARD_GRIPS[kind].rotation,
          ),
        ).toBeCloseTo(0, 4);
      }
    }
  });

  it('hält den Pistolengriff genau dort, wo er im Spiel schon lag', () => {
    // Die Pistole ist die Messlatte: was `gripInTool` für sie ausrechnet, muss
    // der Kasten sein, der vorher von Hand dort hingesetzt war —
    // BoxGeometry(0.03, 0.1, 0.045) bei (0, -0.055, 0.01), rotation.x = -0.22.
    const at = gripInTool('pistol', IDENTITY);
    expect(at.position.y).toBeCloseTo(-0.055, 6);
    expect(at.position.z).toBeCloseTo(0.01, 6);
    expect(angleBetweenQuats(at.rotation, euler(-0.22))).toBeCloseTo(0, 4);
  });

  it('gibt jedem Stab dieselbe Lage in der Hand wie der Taschenlampe', () => {
    // Der Lötkolben schreibt die 30/5/9° nicht ab, sondern rechnet sie sich aus
    // (`rodHoldRotation` in `grip.ts`, dasselbe wie hier). Dass dabei genau die
    // eingemessene Zahl herauskommt, hält dieser Test fest — sonst driftete das
    // eine vom anderen weg, sobald jemand die Lampe nachmisst.
    const derived = holdForGrip('rod', euler(-Math.PI / 2));
    expect(angleBetweenQuats(derived, euler(30 * D, 5 * D, 9 * D))).toBeCloseTo(0, 4);
  });

  it('legt den Stabgriff auf die eigene Achse der Taschenlampe', () => {
    // Und die Lampe ist die Messlatte des Stabgriffs: ihr `holdRotation` von
    // 30/5/9° ist am ersten Justierstand gemessen, und der Griff, den es
    // fordert, liegt genau auf ihrem Rohr — Achse entlang -Z, drei Zentimeter
    // vor dem Nullpunkt.
    const at = gripInTool('rod', euler(30 * D, 5 * D, 9 * D));
    expect(at.position.x).toBeCloseTo(0, 6);
    expect(at.position.y).toBeCloseTo(0, 6);
    expect(at.position.z).toBeCloseTo(-0.03, 6);
    const axis = axisOf(at.rotation);
    expect(axis.z).toBeCloseTo(-1, 6);
  });

  it('lässt den Pistolengriff nach vorn zeigen, wohin das Werkzeug zeigt', () => {
    // Das „vorne" des Griffs ist die Richtung des Zeigefingers, und bei allem,
    // was wie eine Pistole gehalten wird, ist das die Zielrichtung. Ein Grad
    // Abweichung wäre hier ein Fehler; zwölf sind die Lehne des Griffs.
    const front = frontOf(gripInTool('pistol', IDENTITY).rotation);
    expect(front.z).toBeLessThan(-0.97);
    expect(front.x).toBeCloseTo(0, 6);
    // Beim Stabgriff geht das gerade **nicht**: dort liegt die Zielrichtung auf
    // der Griffachse, und der Zeigefinger zeigt quer dazu.
    const rod = gripInTool('rod', euler(30 * D, 5 * D, 9 * D));
    expect(Math.abs(frontOf(rod.rotation).z)).toBeLessThan(0.2);
  });
});

describe('Was die Werkzeuge vorher hatten', () => {
  /**
   * Die Griffe, wie sie vor dem Standardgriff von Hand hingesetzt waren. Der
   * Test hält die Zahlen fest, mit denen die Sache begründet wurde — sie sind
   * der Grund für die ganze Datei und sollen nachlesbar bleiben.
   */
  const before: Array<[string, Quat, Vec3, GripPose, number, number]> = [
    // Name, holdRotation, holdPosition, alter Griff, Δ cm, Δ Grad
    [
      'Duplizierer',
      IDENTITY,
      { x: 0, y: -0.015, z: 0.03 },
      { position: { x: 0, y: -0.05, z: 0.02 }, rotation: euler(0.18) },
      1.1,
      23,
    ],
    [
      'Inspektor',
      euler(-0.4),
      { x: 0, y: -0.015, z: 0.03 },
      { position: { x: 0, y: -0.05, z: 0.015 }, rotation: euler(0.2) },
      2.8,
      1,
    ],
    [
      'Größe & Position',
      IDENTITY,
      { x: 0, y: -0.01, z: 0.02 },
      { position: { x: 0, y: -0.05, z: 0.015 }, rotation: IDENTITY },
      0.7,
      13,
    ],
    [
      'Holster',
      IDENTITY,
      { x: 0, y: -0.014, z: 0.03 },
      { position: { x: 0, y: -0.048, z: 0.015 }, rotation: euler(0.2) },
      0.9,
      24,
    ],
    [
      'Teleporter',
      IDENTITY,
      { x: 0, y: -0.01, z: 0.02 },
      { position: { x: 0, y: -0.05, z: 0.01 }, rotation: euler(-0.2) },
      0.5,
      1,
    ],
    [
      'Greifhaken',
      IDENTITY,
      { x: 0, y: -0.01, z: 0.02 },
      { position: { x: 0, y: -0.05, z: 0.005 }, rotation: euler(-0.2) },
      0.7,
      1,
    ],
    [
      'Lötkolben',
      IDENTITY,
      { x: 0, y: -0.01, z: 0.02 },
      { position: { x: 0, y: 0, z: -0.01 }, rotation: euler(Math.PI / 2) },
      5.9,
      103,
    ],
  ];

  it.each(before)('%s lag %s', (_name, hold, _holdPosition, grip, distance, angle) => {
    const deviation = gripDeviation('pistol', hold, grip);
    expect(deviation.distance * 100).toBeCloseTo(distance, 0);
    expect(deviation.angle).toBeCloseTo(angle, 0);
  });

  it('erklärt, warum eine Faust für alle nicht reichte', () => {
    // Sieben Werkzeuge, dieselbe Faust, und die Griffe darunter bis zu 24°
    // gegeneinander verdreht. Der Lötkolben lag sogar um 103° anders — er wird
    // wie ein Stab gehalten und hat deshalb jetzt den Stabgriff.
    const worst = before
      .filter(([name]) => name !== 'Lötkolben')
      .reduce(
        (max, [, hold, , grip]) => Math.max(max, gripDeviation('pistol', hold, grip).angle),
        0,
      );
    expect(worst).toBeGreaterThan(20);
  });
});

describe('Die Faust gehört zum Griff, nicht zum Werkzeug', () => {
  it('gibt jedem Werkzeug mit Standardgriff die Faust seiner Griffart', () => {
    for (const [toolId, kind] of Object.entries(TOOL_GRIPS)) {
      expect(defaultHoldPose('right', toolId)).toEqual(GRIP_HAND_POSES[kind]);
    }
  });

  it('teilt sich die Faust zwischen allen Werkzeugen derselben Griffart', () => {
    expect(defaultHoldPose('right', 'flashlight')).toEqual(defaultHoldPose('right', 'welder'));
    expect(defaultHoldPose('right', 'pistol')).toEqual(defaultHoldPose('right', 'holster'));
    // Und zwischen den beiden Arten gerade nicht — sonst wäre die Trennung
    // umsonst.
    expect(defaultHoldPose('right', 'pistol')).not.toEqual(defaultHoldPose('right', 'flashlight'));
  });

  it('spiegelt sie auf die linke Hand, statt sie zweimal zu pflegen', () => {
    const right = defaultHoldPose('right', 'flashlight');
    const left = defaultHoldPose('left', 'flashlight');
    expect(left.x).toBeCloseTo(-right.x, 6);
    expect(left.yaw).toBeCloseTo(-right.yaw, 6);
    expect(left.pitch).toBeCloseTo(right.pitch, 6);
  });

  it('lässt ein Werkzeug ohne Standardgriff bei der allgemeinen Faust', () => {
    expect(TOOL_GRIPS['drone']).toBeUndefined();
    expect(defaultHoldPose('right', 'drone')).toEqual(defaultHoldPose('right', 'brush'));
  });
});
