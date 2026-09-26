import {
  TOP_DOWN_DISTANCES,
  TOP_DOWN_MAX,
  TOP_DOWN_MIN,
  TOP_DOWN_TILT,
  groundDirection,
  pinchFactor,
  stepFromDistance,
  topDownDistance,
  topDownPitch,
  topDownPosition,
  yawFromDirection,
  zoomScaled,
  zoomStep,
  QUARTER_TURN,
  quarterOf,
  quarterTurn,
  screenToGround,
  turnToward,
} from './topDownPose';

const DEG = Math.PI / 180;

/** Wohin eine Kamera schaut, die nur um x genickt ist: −z, gedreht. */
function forwardOf(pitch: number): { x: number; y: number; z: number } {
  return { x: 0, y: Math.sin(pitch), z: -Math.cos(pitch) };
}

/**
 * **Die Kamera von oben steht schräg über der Figur und sieht sie an.**
 *
 * Zwei Zahlen, die im Headset niemand nachmisst und die trotzdem alles
 * entscheiden: Steht die Kamera im Norden statt im Süden, läuft die Figur auf
 * dem Schirm nach unten, wenn man W drückt; stimmt der Nickwinkel nicht zur
 * Position, schaut sie am Ziel vorbei. Beides ist hier gegeneinander gerechnet
 * und nicht zweimal aufgeschrieben.
 */
describe('Die Kamera von oben', () => {
  it('steht im Süden über dem Ziel — Norden ist oben', () => {
    const at = topDownPosition({ x: 3, y: 0, z: -5 }, 16, { x: 0, y: 0, z: 0 });
    expect(at.x).toBeCloseTo(3, 6);
    // Schräg heißt: hoch **und** dahinter. 55° sind mehr Höhe als Abstand.
    expect(at.y).toBeCloseTo(16 * Math.sin(TOP_DOWN_TILT * DEG), 6);
    expect(at.z).toBeCloseTo(-5 + 16 * Math.cos(TOP_DOWN_TILT * DEG), 6);
    expect(at.y).toBeGreaterThan(at.z + 5);
    // Der Beweis fürs Vorzeichen: die Kamera ist südlich, also weiter in +z.
    expect(at.z).toBeGreaterThan(-5);
  });

  it('sieht das Ziel an — Nickwinkel und Position gehören zusammen', () => {
    for (const tilt of [35, 55, 80]) {
      const target = { x: -2, y: 1, z: 4 };
      const at = topDownPosition(target, 22, { x: 0, y: 0, z: 0 }, tilt);
      const forward = forwardOf(topDownPitch(tilt));
      const toTarget = { x: target.x - at.x, y: target.y - at.y, z: target.z - at.z };
      const length = Math.hypot(toTarget.x, toTarget.y, toTarget.z);
      expect(length).toBeCloseTo(22, 6);
      expect(toTarget.x / length).toBeCloseTo(forward.x, 6);
      expect(toTarget.y / length).toBeCloseTo(forward.y, 6);
      expect(toTarget.z / length).toBeCloseTo(forward.z, 6);
    }
  });

  it('lässt kein Gieren und kein Rollen zu: geradeaus nach Norden', () => {
    expect(forwardOf(topDownPitch()).x).toBeCloseTo(0, 12);
    expect(forwardOf(topDownPitch()).z).toBeLessThan(0);
  });
});

/**
 * Der Zoom rastet, und er rastet auch an den Enden: Ein Mausrad dreht weiter,
 * wenn die letzte Stufe längst erreicht ist, und darf dabei nichts kaputt
 * machen.
 */
describe('Die Zoomstufen', () => {
  it('geht in Stufen vor und zurück', () => {
    expect(zoomStep(1, 1)).toBe(2);
    expect(zoomStep(1, -1)).toBe(0);
    expect(topDownDistance(zoomStep(1, 1))).toBe(TOP_DOWN_DISTANCES[2]);
  });

  it('rastet an beiden Enden', () => {
    expect(zoomStep(0, -1)).toBe(0);
    expect(zoomStep(0, -5)).toBe(0);
    const last = TOP_DOWN_DISTANCES.length - 1;
    expect(zoomStep(last, 1)).toBe(last);
    expect(topDownDistance(last + 3)).toBe(TOP_DOWN_DISTANCES[last]);
    expect(topDownDistance(-2)).toBe(TOP_DOWN_DISTANCES[0]);
  });

  it('wird von nah nach fern gezählt', () => {
    for (let i = 1; i < TOP_DOWN_DISTANCES.length; i++) {
      expect(TOP_DOWN_DISTANCES[i]!).toBeGreaterThan(TOP_DOWN_DISTANCES[i - 1]!);
    }
  });
});

/**
 * **Der Weg zurück vom Schirm in die Welt** — was Paket P1 für Maus und
 * Zielstick braucht. Die Stauchung nach Norden ist der ganze Witz daran.
 */
describe('Aus dem Schirm in die Welt', () => {
  it('nimmt rechts als Osten und oben als Norden', () => {
    const east = groundDirection(1, 0);
    expect(east.x).toBeCloseTo(1, 6);
    expect(east.z).toBeCloseTo(0, 6);

    const north = groundDirection(0, -1);
    expect(north.x).toBeCloseTo(0, 6);
    expect(north.z).toBeCloseTo(-1, 6);
  });

  it('rechnet die Stauchung nach Norden heraus', () => {
    // Gleich weit nach rechts und nach oben ist auf dem Boden **nicht** 45°:
    // Die Neigung drückt Nord-Süd zusammen, also liegt die Richtung nördlicher.
    const both = groundDirection(1, -1);
    expect(Math.abs(both.z)).toBeGreaterThan(Math.abs(both.x));
    expect(Math.hypot(both.x, both.z)).toBeCloseTo(1, 6);
    // Ohne Neigung (senkrecht von oben) wären es genau 45°.
    const flat = groundDirection(1, -1, { x: 0, z: 0 }, 90);
    expect(Math.abs(flat.x)).toBeCloseTo(Math.abs(flat.z), 6);
  });

  it('macht aus dem Stillstand keine Richtung', () => {
    expect(groundDirection(0, 0)).toEqual({ x: 0, z: 0 });
  });
});

/**
 * Die Figur schaut, wohin sie läuft — und ein Rig schaut entlang −z. Das eine
 * Vorzeichen, mit dem die halbe Welt spiegelverkehrt wäre.
 */
describe('Die Drehung aus der Laufrichtung', () => {
  it('lässt Norden bei null', () => {
    expect(yawFromDirection(0, -1)).toBeCloseTo(0, 12);
  });

  it('dreht nach Osten und Westen in die richtige Richtung', () => {
    // Ein positiver Gierwinkel dreht von Norden nach **Westen** (gegen den
    // Uhrzeigersinn von oben gesehen) — Osten ist also −90°.
    expect(yawFromDirection(1, 0)).toBeCloseTo(-Math.PI / 2, 12);
    expect(yawFromDirection(-1, 0)).toBeCloseTo(Math.PI / 2, 12);
    expect(Math.abs(yawFromDirection(0, 1))).toBeCloseTo(Math.PI, 12);
  });

  it('gibt für jede Richtung die, in die −z dann zeigt', () => {
    for (const [x, z] of [
      [0.6, -0.8],
      [-0.3, 0.95],
      [1, 1],
    ]) {
      const length = Math.hypot(x!, z!);
      const yaw = yawFromDirection(x!, z!);
      expect(-Math.sin(yaw)).toBeCloseTo(x! / length, 6);
      expect(-Math.cos(yaw)).toBeCloseTo(z! / length, 6);
    }
  });
});

/**
 * **Der Zoom kennt zwei Bedienungen und eine Zahl.** Rad und Bumper rasten auf
 * die vier Stufen, zwei Finger auf dem Glas ziehen stufenlos — und beides
 * landet auf demselben Abstand in Metern. Der Fehler, gegen den diese Suite
 * steht, ist der naheliegende: eine Raste, die sich ihre Stufennummer merkt
 * und nach einem Pinch dorthin zurückspringt, wo niemand mehr war.
 */
describe('Der Zoom von oben', () => {
  it('klemmt den stufenlosen Zoom auf die äußeren Stufen', () => {
    expect(zoomScaled(16, 1)).toBe(16);
    // Die Hälfte von 16 ist seit den beiden neuen Stufen unten kein Anschlag
    // mehr, sondern ein Abstand wie jeder andere.
    expect(zoomScaled(16, 0.5)).toBe(8);
    expect(zoomScaled(16, 2)).toBe(32);
    expect(zoomScaled(16, 1.1)).toBeCloseTo(17.6, 6);
    expect(zoomScaled(12, 0.01)).toBe(TOP_DOWN_MIN);
    expect(zoomScaled(60, 100)).toBe(TOP_DOWN_MAX);
    expect(TOP_DOWN_MIN).toBe(TOP_DOWN_DISTANCES[0]);
    expect(TOP_DOWN_MAX).toBe(TOP_DOWN_DISTANCES[TOP_DOWN_DISTANCES.length - 1]);
  });

  it('lässt einen unmöglichen Faktor den Abstand in Ruhe', () => {
    expect(zoomScaled(16, 0)).toBe(16);
    expect(zoomScaled(16, -2)).toBe(16);
    expect(zoomScaled(16, Number.NaN)).toBe(16);
  });

  it('rechnet den Pinch als Verhältnis — auseinander heißt heran', () => {
    // Finger auseinander (100 auf 200 Punkte): der Abstand halbiert sich.
    expect(pinchFactor(100, 200)).toBeCloseTo(0.5, 6);
    // Zusammen: doppelt so weit weg.
    expect(pinchFactor(200, 100)).toBeCloseTo(2, 6);
    expect(pinchFactor(0, 100)).toBe(1);
    expect(pinchFactor(100, 0)).toBe(1);
  });

  it('rastet vom Abstand aus, den man gerade sieht — nicht von einer Nummer', () => {
    // Mitten zwischen 16 und 22 (nach einem Pinch): heran ist 16, zurück 22.
    expect(stepFromDistance(18, -1)).toBe(16);
    expect(stepFromDistance(18, 1)).toBe(22);
    // Genau auf einer Stufe: die nächste, nicht dieselbe noch einmal.
    expect(stepFromDistance(16, 1)).toBe(22);
    expect(stepFromDistance(16, -1)).toBe(12);
    // Und weiter heran, bis an die neue engste Stufe.
    expect(stepFromDistance(12, -1)).toBe(8);
    expect(stepFromDistance(8, -1)).toBe(5);
    // An den Enden rastet es.
    expect(stepFromDistance(5, -1)).toBe(5);
    expect(stepFromDistance(30, 1)).toBe(42);
    expect(stepFromDistance(60, 1)).toBe(60);
    expect(stepFromDistance(9, -1)).toBe(8);
    expect(stepFromDistance(70, 1)).toBe(60);
    // Keine Richtung heißt: nur klemmen.
    expect(stepFromDistance(18, 0)).toBe(18);
    expect(stepFromDistance(99, 0)).toBe(60);
  });

  it('bringt Radklicks von ganz nah nach ganz fern und zurück', () => {
    let distance: number = TOP_DOWN_MIN;
    for (let i = 0; i < 10; i++) distance = stepFromDistance(distance, 1);
    expect(distance).toBe(TOP_DOWN_MAX);
    for (let i = 0; i < 10; i++) distance = stepFromDistance(distance, -1);
    expect(distance).toBe(TOP_DOWN_MIN);
  });
});

/**
 * **Das Bild in Vierteln drehen** (`TopDownCamera.turn`) — und dabei bleibt
 * oben im Bild oben: `W` läuft dorthin, wohin die Kamera schaut.
 */
describe('Die gedrehte Draufsicht', () => {
  /** Wohin die Kamera mit Gieren `heading` und Nicken `pitch` schaut (Euler YXZ). */
  function lookOf(heading: number, pitch: number): { x: number; y: number; z: number } {
    const flat = forwardOf(pitch);
    // Erst nicken (oben), dann um die Hochachse gieren — wie three.js mit `YXZ`.
    return {
      x: flat.x * Math.cos(heading) + flat.z * Math.sin(heading),
      y: flat.y,
      z: -flat.x * Math.sin(heading) + flat.z * Math.cos(heading),
    };
  }

  it('steht nach einer Vierteldrehung links im Osten und schaut nach Westen', () => {
    const at = topDownPosition({ x: 0, y: 0, z: 0 }, 16, { x: 0, y: 0, z: 0 }, 55, QUARTER_TURN);
    expect(at.x).toBeGreaterThan(5);
    expect(at.z).toBeCloseTo(0, 9);
  });

  it('sieht das Ziel auch gedreht an', () => {
    for (const heading of [QUARTER_TURN, Math.PI, -QUARTER_TURN, 0.3]) {
      const target = { x: 3, y: 1, z: -2 };
      const at = topDownPosition(target, 12, { x: 0, y: 0, z: 0 }, 55, heading);
      const look = lookOf(heading, topDownPitch(55));
      const to = { x: target.x - at.x, y: target.y - at.y, z: target.z - at.z };
      const length = Math.hypot(to.x, to.y, to.z);
      expect(to.x / length).toBeCloseTo(look.x, 6);
      expect(to.y / length).toBeCloseTo(look.y, 6);
      expect(to.z / length).toBeCloseTo(look.z, 6);
    }
  });

  it('läuft oben im Bild dorthin, wohin die Kamera schaut', () => {
    for (const heading of [0, QUARTER_TURN, Math.PI, -QUARTER_TURN]) {
      const up = screenToGround(0, -1, heading);
      const look = lookOf(heading, topDownPitch());
      const flat = Math.hypot(look.x, look.z);
      expect(up.x).toBeCloseTo(look.x / flat, 9);
      expect(up.z).toBeCloseTo(look.z / flat, 9);
    }
    // Ungedreht bleibt alles, wie es war: rechts ist Osten.
    expect(screenToGround(1, 0, 0)).toEqual({ x: 1, z: 0 });
    // Links herum gedreht zeigt oben nach Westen, rechts nach Norden.
    const west = screenToGround(0, -1, QUARTER_TURN);
    expect(west.x).toBeCloseTo(-1, 9);
    expect(west.z).toBeCloseTo(0, 9);
    const north = screenToGround(1, 0, QUARTER_TURN);
    expect(north.x).toBeCloseTo(0, 9);
    expect(north.z).toBeCloseTo(-1, 9);
  });

  it('zielt mit der Maus gedreht dorthin, wohin sie im Bild zeigt', () => {
    const plain = groundDirection(0, -1);
    const turned = groundDirection(0, -1, undefined, TOP_DOWN_TILT, Math.PI);
    expect(turned.x).toBeCloseTo(-plain.x, 9);
    expect(turned.z).toBeCloseTo(-plain.z, 9);
  });

  it('dreht in ganzen Vierteln, rundherum und zurück', () => {
    let heading = 0;
    for (let i = 0; i < 4; i++) heading = quarterTurn(heading, 1);
    expect(heading).toBeCloseTo(0, 9);
    expect(quarterTurn(0, -1)).toBeCloseTo(-QUARTER_TURN, 9);
    // Ein krummer Stand rastet beim nächsten Druck auf ein ganzes Viertel.
    expect(quarterTurn(0.2, 1)).toBeCloseTo(QUARTER_TURN, 9);
    expect([0, 1, 2, 3].map((q) => quarterOf(q * QUARTER_TURN))).toEqual([0, 1, 2, 3]);
    expect(quarterOf(-QUARTER_TURN)).toBe(3);
  });

  it('dreht weich den kürzeren Weg', () => {
    // Von knapp unter +π nach −π/2 sind es 90° nach links, nicht 270° zurück.
    const from = Math.PI - 0.01;
    const half = turnToward(from, -QUARTER_TURN, 0.5);
    expect(Math.abs(half)).toBeGreaterThan(Math.PI * 0.7);
    expect(turnToward(0.1, 0.1, 0.3)).toBe(0.1);
    expect(turnToward(0, QUARTER_TURN, 1)).toBeCloseTo(QUARTER_TURN, 9);
  });
});
