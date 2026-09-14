import {
  TOP_DOWN_DISTANCES,
  TOP_DOWN_TILT,
  groundDirection,
  topDownDistance,
  topDownPitch,
  topDownPosition,
  yawFromDirection,
  zoomStep,
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
