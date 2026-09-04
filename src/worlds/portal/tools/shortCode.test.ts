/**
 * Der Kurzcode, nachgerechnet.
 *
 * Ein Konfig-Code ist eine Zeile, die jemand abtippt, vorliest oder in einen
 * Chat wirft. Zwei Dinge müssen deshalb stimmen, und beide fallen erst auf,
 * wenn es zu spät ist: dass **genau dasselbe** wieder herauskommt, und dass
 * ein **Tippfehler** abgelehnt wird, statt eine Haltung zu verstellen, die
 * niemand mehr zuordnen kann.
 *
 * Und die Länge: der Code war vorher genauso lang wie die Zahlen im Klartext,
 * und das ist der Grund, warum es ihn jetzt zweimal gibt. Also steht sie hier
 * als Zusicherung und nicht als Hoffnung.
 */
import {
  FINGER_CHARS,
  POSE_ALPHABET,
  POSE_CHARS,
  POSE_LIMIT,
  packPose,
  packShortGear,
  parseShortGear,
  SHORT_SLOTS,
  unpackPose,
} from './shortCode';
import { quatFromEulerXYZ } from './toolPose';

/** Zwei Winkeltripel beschreiben dieselbe Drehung. */
function expectSameTurn(a: readonly number[], b: readonly number[]): void {
  const rad = (v: readonly number[]) => ({
    x: ((v[0] ?? 0) * Math.PI) / 180,
    y: ((v[1] ?? 0) * Math.PI) / 180,
    z: ((v[2] ?? 0) * Math.PI) / 180,
  });
  const qa = quatFromEulerXYZ(rad(a));
  const qb = quatFromEulerXYZ(rad(b));
  // Ein Quaternion und sein Negatives sind dieselbe Drehung.
  const dot = Math.abs(qa.x * qb.x + qa.y * qb.y + qa.z * qb.z + qa.w * qb.w);
  expect(dot).toBeCloseTo(1, 5);
}

/** Eine Pose, wie sie von einer Messung kommt: Zehntel und ganze Grad. */
function pose(x: number, y: number, z: number, p: number, yw: number, r: number): number[] {
  return [x, y, z, p, yw, r];
}

describe('eine Pose in neun Zeichen', () => {
  it('braucht genau neun', () => {
    expect(POSE_CHARS).toBe(9);
    expect(packPose(pose(4, -2.8, 1.7, -44, 26, -105))).toHaveLength(9);
  });

  it('schreibt nur Zeichen, die man nicht verwechselt', () => {
    expect(POSE_ALPHABET).toHaveLength(59);
    expect(new Set(POSE_ALPHABET).size).toBe(59);
    for (const forbidden of '0O1Il') expect(POSE_ALPHABET).not.toContain(forbidden);
    // URL-sicher: nur die unreserved characters aus RFC 3986.
    expect(POSE_ALPHABET).toMatch(/^[A-Za-z0-9\-_.~]+$/);
  });

  it('bringt einen zu großen Yaw in die Normalform statt ihn zu beschneiden', () => {
    // Yaw 120° ist dieselbe Drehung wie eine mit |yaw| ≤ 90 — nur anders
    // aufgeschrieben. Was zurückkommt, muss dieselbe Drehung sein.
    const back = unpackPose(packPose(pose(0, 0, 0, 10, 120, 30)))!;
    expect(Math.abs(back[4]!)).toBeLessThanOrEqual(90);
    // Und zweimal durch dieselbe Mühle ändert nichts mehr.
    expect(unpackPose(packPose(back))).toEqual(back);
  });

  it('gibt dieselben Zahlen wieder her', () => {
    const values = pose(4, -2.8, 1.7, -44, 26, -105);
    expect(unpackPose(packPose(values))).toEqual(values);
  });

  it('trifft jede Ecke des Bereichs — als Drehung, nicht als Zahlentripel', () => {
    for (const corner of [
      pose(-POSE_LIMIT, -POSE_LIMIT, -POSE_LIMIT, -180, -90, -180),
      pose(POSE_LIMIT, POSE_LIMIT, POSE_LIMIT, 179, 90, 179),
      pose(0, 0, 0, 0, 0, 0),
      pose(0.1, -0.1, 0.1, 1, -1, 1),
    ]) {
      const back = unpackPose(packPose(corner))!;
      expect(back.slice(0, 3)).toEqual(corner.slice(0, 3));
      // Bei |yaw| = 90 steht die Achse senkrecht, und Pitch und Roll sind
      // dieselbe Drehung — `eulerXYZ` schreibt den Rest dann in den Pitch und
      // setzt Roll auf null. Das Zahlentripel ändert sich dabei, die **Drehung**
      // nicht, und nur die ist die Zusicherung.
      expectSameTurn(back.slice(3), corner.slice(3));
    }
  });

  it('überlebt tausend zufällige Posen ohne einen einzigen Millimeter Drift', () => {
    let seed = 20260904;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 1000; i++) {
      const values = pose(
        // `+ 0` macht aus einer gewürfelten negativen Null wieder eine Null:
        // der Codec führt keine, und das ist Absicht (siehe `core/handPose.ts`).
        Math.round((next() * 2 - 1) * POSE_LIMIT * 10) / 10 + 0,
        Math.round((next() * 2 - 1) * POSE_LIMIT * 10) / 10 + 0,
        Math.round((next() * 2 - 1) * POSE_LIMIT * 10) / 10 + 0,
        // −179…179: +180 und −180 sind derselbe Winkel, und geführt wird er
        // als −180 (die Ecken-Prüfung oben deckt genau das ab).
        Math.round(next() * 358) - 179,
        // Yaw nur ±90: mehr liefert `eulerXYZ` nicht, und genau darauf ist die
        // mittlere Stelle gebaut.
        Math.round(next() * 178) - 89,
        Math.round(next() * 358) - 179,
      );
      expect(unpackPose(packPose(values))).toEqual(values);
    }
  });

  it('beschneidet, was außerhalb liegt, statt es umlaufen zu lassen', () => {
    const back = unpackPose(packPose(pose(999, -999, 0, 0, 0, 0)))!;
    expect(back[0]).toBe(POSE_LIMIT);
    expect(back[1]).toBe(-POSE_LIMIT);
  });
});

describe('die Zahlen, an denen das Format hängt', () => {
  it('zählt die Zustände einer Pose richtig', () => {
    // Kombinationen **multiplizieren** sich, sie addieren sich nicht — der
    // Fehler, der diesem Format dreimal eine falsche Länge verpasst hat.
    const states = 601 ** 3 * 360 * 181 * 360;
    expect(states).toBe(5_092_218_055_137_600);
    expect(Math.log2(states)).toBeCloseTo(52.18, 2);
  });

  it('braucht neun Zeichen, weil acht nicht reichen', () => {
    const states = 601 ** 3 * 360 * 181 * 360;
    expect(59 ** 8).toBeLessThan(states);
    expect(59 ** 9).toBeGreaterThan(states);
    expect(POSE_CHARS).toBe(9);
  });

  it('packt zwei Posen in achtzehn', () => {
    const code = packShortGear({
      toolId: 'pistol',
      hand: 'right',
      pose: pose(1, 2, 3, 4, 5, 6),
      grip: pose(-1, -2, -3, -4, -5, -6),
    });
    // Rahmen (BP + Platz + Flags + zwei Summenzeichen) plus 18 Nutzlast.
    expect(code).toHaveLength(6 + 18);
  });
});

describe('der ganze Kurzcode', () => {
  const grip = { curls: [0.55, 0.35, 0.85, 0.9, 0.9], spread: 0 };

  it('trägt Werkzeug, Hand, Pose und Griff — und ist kürzer als die Zahlen', () => {
    const code = packShortGear({
      toolId: 'flashlight',
      hand: 'right',
      pose: pose(1.2, -3.4, 5.6, -44, 26, -105),
      grip: pose(4, -2.8, 1.7, -44, 26, -105),
    });
    // Zwei Posen wandern in *eine* Zahl; hier sind das dieselben 18 Zeichen.
    expect(code).toHaveLength(2 + 2 + POSE_CHARS * 2 + 2);
    // Die blanken Zahlen *einer* Pose sind schon 22 Zeichen; hier stehen zwei.
    expect(code.length).toBeLessThan('4,-2.8,1.7,-44,26,-105'.length * 2);
    expect(parseShortGear(code)).toEqual({
      toolId: 'flashlight',
      hand: 'right',
      pose: pose(1.2, -3.4, 5.6, -44, 26, -105),
      grip: pose(4, -2.8, 1.7, -44, 26, -105),
    });
  });

  it('kostet für eine Pose allein fünfzehn Zeichen', () => {
    const code = packShortGear({
      toolId: 'pistol',
      hand: 'left',
      pose: pose(0, -1.2, 3, 0, 0, 0),
    });
    expect(code).toHaveLength(15);
    expect(parseShortGear(code)?.hand).toBe('left');
    expect(parseShortGear(code)?.grip).toBeUndefined();
  });

  it('nimmt die Finger mit, wenn sie drinstehen', () => {
    const code = packShortGear({
      toolId: 'pistol',
      hand: 'right',
      grip: pose(0, 0, 0, 0, 0, 0),
      fingers: grip,
    });
    expect(code).toHaveLength(2 + 2 + POSE_CHARS + FINGER_CHARS + 2);
    expect(parseShortGear(code)?.fingers).toEqual(grip);
  });

  it('kennt die leere Hand', () => {
    const code = packShortGear({ toolId: '', hand: 'right', grip: pose(-0.3, 2.7, 3.8, 75, -45, 5) });
    expect(parseShortGear(code)?.toolId).toBe('');
  });

  it('lehnt ab, was keiner von uns ist', () => {
    expect(parseShortGear('BG3AAEBEj8YQ3BXNNEBS8o')).toBeNull();
    expect(parseShortGear('')).toBeNull();
    expect(parseShortGear('BP')).toBeNull();
    // Ein alter Kurzcode aus der Zeit vor diesem Format.
    expect(parseShortGear('BGKMDgF8upohGzigZ5hfz6PDu')).toBeNull();
  });

  it('lehnt jeden einzelnen Tippfehler ab', () => {
    const code = packShortGear({
      toolId: 'flashlight',
      hand: 'right',
      pose: pose(1.2, -3.4, 5.6, -44, 26, -105),
      grip: pose(4, -2.8, 1.7, -44, 26, -105),
    });
    let caught = 0;
    let tried = 0;
    for (let i = 2; i < code.length; i++) {
      for (const replacement of 'AZaz29-_') {
        if (code[i] === replacement) continue;
        tried++;
        const typo = code.slice(0, i) + replacement + code.slice(i + 1);
        if (parseShortGear(typo) === null) caught++;
      }
    }
    expect(tried).toBeGreaterThan(100);
    expect(caught).toBe(tried);
  });

  it('merkt zwei vertauschte Zeichen', () => {
    const code = packShortGear({
      toolId: 'flashlight',
      hand: 'right',
      pose: pose(1.2, -3.4, 5.6, -44, 26, -105),
    });
    let caught = 0;
    let tried = 0;
    for (let i = 2; i < code.length - 2; i++) {
      if (code[i] === code[i + 1]) continue;
      tried++;
      const swapped =
        code.slice(0, i) + code[i + 1] + code[i] + code.slice(i + 2);
      if (parseShortGear(swapped) === null) caught++;
    }
    expect(tried).toBeGreaterThan(4);
    expect(caught).toBe(tried);
  });

  it('führt jedes Werkzeug genau einmal', () => {
    expect(new Set(SHORT_SLOTS).size).toBe(SHORT_SLOTS.length);
    expect(SHORT_SLOTS.length).toBeLessThanOrEqual(64);
  });
});
