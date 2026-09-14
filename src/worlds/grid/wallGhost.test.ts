import { GHOST_KNEE, blocksView, boxesBetween, type GhostCandidate } from './wallGhost';

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

describe('Was zwischen Kamera und Figur steht', () => {
  it('findet die Wand, die dazwischen steht', () => {
    // Einen Meter vor der Figur, zwei Meter achtzig hoch.
    const wall = box(0, 1.4, 1, 4, 2.8, 0.2);
    expect(boxesBetween(CAMERA, FIGURE, [wall])).toEqual([wall]);
  });

  it('lässt die Wand stehen, die hinter der Figur liegt', () => {
    // **Der Fall, wegen dem gegen eine Strecke und nicht gegen einen Strahl
    // gerechnet wird.** Was hinter der Figur steht, verdeckt sie nicht — ein
    // Strahl ohne Ende nähme die halbe Welt mit.
    const behind = box(0, 1.4, -1, 4, 2.8, 0.2);
    expect(boxesBetween(CAMERA, FIGURE, [behind])).toEqual([]);
  });

  it('lässt die Wand stehen, die daneben steht', () => {
    const beside = box(8, 1.4, 1, 4, 2.8, 0.2);
    expect(boxesBetween(CAMERA, FIGURE, [beside])).toEqual([]);
  });

  it('lässt die Wand stehen, unter der der Blick hindurchgeht', () => {
    // Dieselbe Wand fünf Meter weiter südlich: Dort ist der Strahl schon fünf
    // Meter hoch und geht über sie hinweg. Sie verdeckt nichts, also bleibt
    // sie stehen — ein Ghosting, das jede Wand im Süden mitnimmt, ist eines,
    // bei dem von der Welt nichts übrig bleibt.
    const far = box(0, 1.4, 6, 4, 2.8, 0.2);
    expect(boxesBetween(CAMERA, FIGURE, [far])).toEqual([]);
  });

  it('nimmt die Wand mit, in der die Kamera selbst steckt', () => {
    // Dann schaut man aus einer Wand heraus, und sie gehört erst recht weg.
    const around = box(0, 9, 12, 2, 2.8, 2);
    expect(boxesBetween(CAMERA, FIGURE, [around])).toHaveLength(1);
  });

  it('kommt mit einer senkrechten Sicht zurecht', () => {
    // Keine Bewegung in x und z: Ohne den Sonderfall wäre das eine Division
    // durch null — und aus jeder Wand daneben würde eine Wand davor.
    const above = box(0, 3, 0, 2, 0.3, 2);
    const beside = box(4, 3, 0, 2, 0.3, 2);
    const straight = { x: 0, y: 9, z: 0 };
    expect(boxesBetween(straight, FIGURE, [above, beside])).toEqual([above]);
  });

  it('gibt jede Wand zurück, die dazwischen steht, und nicht nur die erste', () => {
    // Drei Wände hintereinander sind drei durchsichtige Wände: Wer nur die
    // vorderste nähme, sähe die Figur hinter der zweiten immer noch nicht.
    const walls = [
      box(0, 1.4, 2.5, 6, 2.8, 0.2),
      box(0, 1.4, 1.5, 6, 2.8, 0.2),
      box(0, 1.4, 0.5, 6, 2.8, 0.2),
    ];
    expect(boxesBetween(CAMERA, FIGURE, walls)).toHaveLength(3);
  });
});

describe('Was gar nicht erst mitzählt', () => {
  it('lässt Böden in Ruhe', () => {
    // Die Strecke endet auf dem Boden unter der Figur und streift ihn deshalb
    // immer. Wer ihn mitnähme, hätte in jedem Bild den halben Fußboden
    // durchsichtig — und darunter ist nichts als Nacht.
    const ground = box(0, -0.15, 3, 20, 0.3, 20, true);
    expect(blocksView(ground)).toBe(false);
    expect(boxesBetween(CAMERA, FIGURE, [ground])).toEqual([]);
  });

  it('lässt alles unter Kniehöhe in Ruhe', () => {
    // Eine Schwelle, eine Druckplatte, die unterste Stufe: Sie verdecken
    // niemanden, und ein Flackern an ihnen wäre reine Unruhe.
    const sill = box(0, 0.1, 1, 2, 0.2, 1);
    expect(blocksView(sill)).toBe(false);
    expect(boxesBetween(CAMERA, FIGURE, [sill])).toEqual([]);
    // Knapp darüber zählt es wieder — die **Oberkante** entscheidet und nicht
    // die Dicke.
    const higher = box(0, GHOST_KNEE, 1, 2, 0.2, 1);
    expect(blocksView(higher)).toBe(true);
  });

  it('nimmt eine Brüstung mit, die über dem Knie endet', () => {
    // Auf einem Podest von einem Meter, einen Meter vor der Figur: Genau das
    // ist der Fall, in dem eine Brüstung eine Figur verdeckt.
    const parapet = box(0, 1.45, 1, 4, 0.9, 0.2);
    expect(blocksView(parapet)).toBe(true);
    expect(boxesBetween(CAMERA, FIGURE, [parapet])).toHaveLength(1);
  });
});
