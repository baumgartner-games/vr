import {
  GHOST_KNEE,
  blocksView,
  cameraQuarter,
  wallsHiding,
  type GhostCandidate,
} from './wallGhost';

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
    expect(wallsHiding(CAMERA, FIGURE, [wall])).toEqual([wall]);
  });

  it('lässt die Wand stehen, die hinter der Figur liegt', () => {
    // **Der Fall, wegen dem gegen eine Strecke und nicht gegen einen Strahl
    // gerechnet wird.** Was hinter der Figur steht, verdeckt sie nicht — ein
    // Strahl ohne Ende nähme die halbe Welt mit.
    const behind = box(0, 1.4, -1, 4, 2.8, 0.2);
    expect(wallsHiding(CAMERA, FIGURE, [behind])).toEqual([]);
  });

  it('lässt die Wand stehen, die daneben steht', () => {
    const beside = box(8, 1.4, 1, 4, 2.8, 0.2);
    expect(wallsHiding(CAMERA, FIGURE, [beside])).toEqual([]);
  });

  /**
   * **Die Seitenwand bleibt stehen**, auch wenn sie dicht neben der Figur
   * steht — der gemeldete Befund: „Ich will nicht die Wände links und rechts
   * vom Spieler durchsichtig haben." Sie läuft an ihr vorbei nach hinten,
   * also sieht die Kamera dieselbe Seite wie die Figur, und es geht nichts
   * verloren.
   */
  it('lässt die Wand stehen, die neben der Figur entlangläuft', () => {
    const along = box(1.1, 1.4, 0, 0.2, 2.8, 6);
    expect(wallsHiding(CAMERA, FIGURE, [along])).toEqual([]);
  });

  /**
   * **Und der Versatz, der den Befund ausgelöst hat.** Die Kamera zieht der
   * Figur weich nach (`TopDownCamera`, `FOLLOW_TAU`); wer nach Westen läuft,
   * hat sie einen halben Meter im Osten. Ein Strahl von dort erwischte die
   * Wand **neben** der Figur statt der vor ihr — und nach Osten gelaufen
   * dieselbe Wand auf der anderen Seite. Beide Richtungen stehen hier: Die
   * Wand vor der Figur geht auf, die daneben nicht, egal wohin die Kamera
   * gerade hinterherhinkt.
   */
  it('hängt nicht daran, wie weit die Kamera gerade nachhinkt', () => {
    const ahead = box(0, 1.4, 1, 1, 2.8, 0.2);
    const west = box(-1, 1.4, 1, 1, 2.8, 0.2);
    const east = box(1, 1.4, 1, 1, 2.8, 0.2);
    for (const lag of [-0.6, 0, 0.6]) {
      const camera = { x: FIGURE.x + lag, y: CAMERA.y, z: CAMERA.z };
      expect([lag, wallsHiding(camera, FIGURE, [ahead, west, east])]).toEqual([lag, [ahead]]);
    }
  });

  it('lässt die Wand stehen, unter der der Blick hindurchgeht', () => {
    // Dieselbe Wand fünf Meter weiter südlich: Dort ist der Strahl schon fünf
    // Meter hoch und geht über sie hinweg. Sie verdeckt nichts, also bleibt
    // sie stehen — ein Ghosting, das jede Wand im Süden mitnimmt, ist eines,
    // bei dem von der Welt nichts übrig bleibt.
    const far = box(0, 1.4, 6, 4, 2.8, 0.2);
    expect(wallsHiding(CAMERA, FIGURE, [far])).toEqual([]);
  });

  it('nimmt die Wand mit, in der die Kamera selbst steckt', () => {
    // Dann schaut man aus einer Wand heraus, und sie gehört erst recht weg.
    const around = box(0, 9, 12, 2, 2.8, 2);
    expect(wallsHiding(CAMERA, FIGURE, [around])).toHaveLength(1);
  });

  it('kommt mit einer senkrechten Sicht zurecht', () => {
    // Keine Bewegung in x und z: Ohne den Sonderfall wäre das eine Division
    // durch null — und aus jeder Wand daneben würde eine Wand davor.
    const above = box(0, 3, 0, 2, 0.3, 2);
    const beside = box(4, 3, 0, 2, 0.3, 2);
    const straight = { x: 0, y: 9, z: 0 };
    expect(wallsHiding(straight, FIGURE, [above, beside])).toEqual([above]);
  });

  it('gibt jede Wand zurück, die dazwischen steht, und nicht nur die erste', () => {
    // Drei Wände hintereinander sind drei durchsichtige Wände: Wer nur die
    // vorderste nähme, sähe die Figur hinter der zweiten immer noch nicht.
    const walls = [
      box(0, 1.4, 2.5, 6, 2.8, 0.2),
      box(0, 1.4, 1.5, 6, 2.8, 0.2),
      box(0, 1.4, 0.5, 6, 2.8, 0.2),
    ];
    expect(wallsHiding(CAMERA, FIGURE, walls)).toHaveLength(3);
  });
});

describe('Was gar nicht erst mitzählt', () => {
  it('lässt Böden in Ruhe', () => {
    // Die Strecke endet auf dem Boden unter der Figur und streift ihn deshalb
    // immer. Wer ihn mitnähme, hätte in jedem Bild den halben Fußboden
    // durchsichtig — und darunter ist nichts als Nacht.
    const ground = box(0, -0.15, 3, 20, 0.3, 20, true);
    expect(blocksView(ground)).toBe(false);
    expect(wallsHiding(CAMERA, FIGURE, [ground])).toEqual([]);
  });

  it('lässt alles unter Kniehöhe in Ruhe', () => {
    // Eine Schwelle, eine Druckplatte, die unterste Stufe: Sie verdecken
    // niemanden, und ein Flackern an ihnen wäre reine Unruhe.
    const sill = box(0, 0.1, 1, 2, 0.2, 1);
    expect(blocksView(sill)).toBe(false);
    expect(wallsHiding(CAMERA, FIGURE, [sill])).toEqual([]);
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
    expect(wallsHiding(CAMERA, FIGURE, [parapet])).toHaveLength(1);
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

  it('erkennt, in welchem Viertel die Kamera steht', () => {
    expect(cameraQuarter(CAMERA, FIGURE)).toBe(0);
    expect([1, 2, 3].map((q) => cameraQuarter(turned(CAMERA, q), FIGURE))).toEqual([1, 2, 3]);
    // Senkrecht darüber: wie ungedreht.
    expect(cameraQuarter({ x: 0, y: 20, z: 0 }, FIGURE)).toBe(0);
  });

  it('findet in jedem Viertel dieselbe Wand wie ungedreht — und nur die', () => {
    const between = box(0, 1.4, 1, 4, 2.8, 0.2);
    const behind = box(0, 1.4, -1, 4, 2.8, 0.2);
    const along = box(1.1, 1.4, 0, 0.2, 2.8, 6);
    for (const quarter of [1, 2, 3]) {
      const camera = turned(CAMERA, quarter);
      const walls = [between, behind, along].map((one) => turnedBox(one, quarter));
      expect(wallsHiding(camera, FIGURE, walls)).toEqual([walls[0]]);
    }
  });

  it('lässt die Südwand stehen, wenn die Kamera im Norden steht', () => {
    const south = box(0, 1.4, 1, 4, 2.8, 0.2);
    expect(wallsHiding(turned(CAMERA, 2), FIGURE, [south])).toEqual([]);
  });
});
