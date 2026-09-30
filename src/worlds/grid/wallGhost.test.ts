import { GHOST_KNEE, blocksView, facingAxes, wallsInFront, type GhostCandidate } from './wallGhost';

/** Ein Quader: Mitte und Kantenlängen, wie ein `PlanSolid`. */
function box(
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  floor = false,
): GhostCandidate {
  return { box: { x, y, z, w, h, d }, ...(floor ? { floor: true } : {}) };
}

/**
 * Die Kamera steht im Süden schräg über der Szene, die Figur in der Mitte —
 * dieselbe Optik wie in der Ansicht _Von oben_ (`core/topDownPose.ts`).
 *
 * Aus diesem Winkel verdeckt eine Wand von 2,8 m nur, was **dicht** hinter ihr
 * steht: Der Strahl fällt schnell, und drei Meter südlich der Figur ist er
 * längst über jedem Dach. Genau das ist der Grund, warum das Ghosting so
 * wenige Wände erwischt — und warum es sich nicht so anfühlt, als fräße es die
 * halbe Welt.
 */
const CAMERA = { x: 0, y: 9, z: 12 };
const FIGURE = { x: 0, y: 0.9, z: 0 };

describe('Was gar nicht erst mitzählt', () => {
  it('lässt Böden in Ruhe', () => {
    // Wer ihn mitnähme, hätte in jedem Bild den halben Fußboden durchsichtig —
    // und darunter ist nichts als Nacht.
    const ground = box(0, -0.15, 3, 20, 0.3, 20, true);
    expect(blocksView(ground)).toBe(false);
    expect(wallsInFront(CAMERA, FIGURE, [ground])).toEqual([]);
  });

  it('lässt alles unter Kniehöhe in Ruhe', () => {
    // Eine Schwelle, eine Druckplatte, die unterste Stufe: Sie verdecken
    // niemanden, und ein Flackern an ihnen wäre reine Unruhe.
    const sill = box(0, 0.1, 1, 2, 0.2, 1);
    expect(blocksView(sill)).toBe(false);
    expect(wallsInFront(CAMERA, FIGURE, [sill])).toEqual([]);
    // Knapp darüber zählt es wieder — die **Oberkante** entscheidet und nicht
    // die Dicke.
    const higher = box(0, GHOST_KNEE, 1, 2, 0.2, 1);
    expect(blocksView(higher)).toBe(true);
  });

  it('nimmt eine Brüstung mit, die über dem Knie endet', () => {
    // Einen Meter vor der Figur, oben bis 1,9 m: eine Brüstung, die verdeckt.
    const parapet = box(0, 1.45, 1, 4, 0.9, 0.2);
    expect(blocksView(parapet)).toBe(true);
    expect(wallsInFront(CAMERA, FIGURE, [parapet])).toHaveLength(1);
  });
});

/**
 * **Das gedrehte Bild** (`TopDownCamera.turn`): Die Kamera steht dann im
 * Osten, Norden oder Westen der Figur, und die Wand, die verschwinden soll,
 * ist die auf **ihrer** Seite — nicht mehr die im Süden.
 */
describe('Wenn das Bild gedreht ist', () => {
  /** Die Szene von oben, um ganze Viertel links herum um die Figur gedreht. */
  function turned<T extends { x: number; z: number }>(p: T, quarter: number): T {
    let { x, z } = p;
    for (let i = 0; i < quarter; i++) [x, z] = [z, -x];
    return { ...p, x, z };
  }
  function turnedBox(one: GhostCandidate, quarter: number): GhostCandidate {
    const odd = quarter % 2 === 1;
    const centre = turned(one.box, quarter);
    return {
      box: { ...centre, w: odd ? one.box.d : one.box.w, d: odd ? one.box.w : one.box.d },
    };
  }

  it('erkennt, welche Achsen zur Kamera zeigen — eine gerade, zwei schräg', () => {
    expect(facingAxes(CAMERA, FIGURE)).toEqual({ x: 0, z: 1 });
    expect([1, 2, 3].map((q) => facingAxes(turned(CAMERA, q), FIGURE))).toEqual([
      { x: 1, z: 0 },
      { x: 0, z: -1 },
      { x: -1, z: 0 },
    ]);
    // Um 45° gedreht: von Südosten zeigen x und z.
    expect(facingAxes({ x: 9, y: 9, z: 9 }, FIGURE)).toEqual({ x: 1, z: 1 });
    // Senkrecht darüber: wie ungedreht.
    expect(facingAxes({ x: 0, y: 20, z: 0 }, FIGURE)).toEqual({ x: 0, z: 1 });
  });

  it('nimmt schräg von Südosten die Wand im Süden und die im Osten', () => {
    const south = box(0, 1.4, 1, 4, 2.8, 0.2);
    const east = box(1, 1.4, 0, 0.2, 2.8, 4);
    const west = box(-1, 1.4, 0, 0.2, 2.8, 4);
    expect(wallsInFront({ x: 9, y: 9, z: 9 }, FIGURE, [south, east, west])).toEqual([south, east]);
  });

  it('findet in jedem Viertel dieselbe Wand wie ungedreht — und nur die', () => {
    const between = box(0, 1.4, 1, 4, 2.8, 0.2);
    const behind = box(0, 1.4, -1, 4, 2.8, 0.2);
    const along = box(1.1, 1.4, 0, 0.2, 2.8, 6);
    for (const quarter of [1, 2, 3]) {
      const camera = turned(CAMERA, quarter);
      const walls = [between, behind, along].map((one) => turnedBox(one, quarter));
      expect(wallsInFront(camera, FIGURE, walls)).toEqual([walls[0]]);
    }
  });

  it('lässt die Südwand stehen, wenn die Kamera im Norden steht', () => {
    const south = box(0, 1.4, 1, 4, 2.8, 0.2);
    expect(wallsInFront(turned(CAMERA, 2), FIGURE, [south])).toEqual([]);
  });
});

describe('Alle Wände vor der Figur (Ghost Walls, Wall Cutaway)', () => {
  it('nimmt jede Wand der Etage auf der Kameraseite — auch weit daneben', () => {
    const front = box(0, 1.4, 1, 4, 2.8, 0.2);
    const farFront = box(9, 1.4, 5, 4, 2.8, 0.2);
    const behind = box(0, 1.4, -1, 4, 2.8, 0.2);
    // Die Seitenwand reicht an der Figur vorbei nach hinten: Sie bleibt.
    const side = box(1, 1.4, 0, 0.2, 2.8, 4);
    expect(wallsInFront(CAMERA, FIGURE, [front, farFront, behind, side])).toEqual([
      front,
      farFront,
    ]);
  });

  it('lässt Böden, niedrige Kästen und andere Etagen stehen', () => {
    const floor = box(0, 0, 2, 4, 0.1, 4, true);
    const kerb = box(0, 0.2, 2, 4, 0.4, 0.2);
    const upstairs = box(0, 4.4, 2, 4, 2.8, 0.2);
    expect(wallsInFront(CAMERA, FIGURE, [floor, kerb, upstairs])).toEqual([]);
    // Eine Etage höher gilt dieselbe Wand dort wieder.
    const up = { x: 0, y: 3.9, z: 0 };
    expect(wallsInFront({ x: 0, y: 12, z: 12 }, up, [upstairs])).toEqual([upstairs]);
  });

  it('dreht mit der Kamera: von Osten zählt, was östlich steht', () => {
    const east = box(1, 1.4, 0, 0.2, 2.8, 4);
    const west = box(-1, 1.4, 0, 0.2, 2.8, 4);
    expect(wallsInFront({ x: 12, y: 9, z: 0 }, FIGURE, [east, west])).toEqual([east]);
  });
});
