import {
  BAKE_DEFAULTS,
  ColumnIndex,
  bakeNav,
  floorsAt,
  guessLevels,
  levelFor,
  type NavBox,
} from './navBake';
import { findPath } from './navPath';
import { CRITTER_PROFILE, HUMAN_PROFILE, ZOMBIE_PROFILE } from './navProfile';
import { DIR_E, TILE, tileKey } from './navTile';

const human = { profile: HUMAN_PROFILE };

/** Ein Kasten aus Grundriss und Höhe — so liest sich eine Testkarte. */
function box(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): NavBox {
  return { minX: x0, minZ: z0, maxX: x1, maxZ: z1, minY: y0, maxY: y1 };
}

/** Zehn mal zehn Kacheln Boden. */
const FIELD = box(0, 0, 10 * TILE, 10 * TILE, -1, 0);
const BOUNDS = { minX: 0, minZ: 0, maxX: 10 * TILE - 0.01, maxZ: 10 * TILE - 0.01 };

function bake(boxes: NavBox[], levels?: number[]): ReturnType<typeof bakeNav> {
  return bakeNav(boxes, { bounds: BOUNDS, ...(levels ? { levels } : {}) });
}

describe('Das Abtasten', () => {
  it('macht aus einer Platte ein volles Kachelfeld', () => {
    const report = bake([FIELD], [0]);
    expect(report.tiles).toBe(100);
    expect(report.graph.tile(tileKey(0, 0, 0))?.rise).toBeCloseTo(0, 9);
    expect(report.graph.tile(tileKey(9, 9, 0))).toBeDefined();
  });

  it('legt keine Kachel dorthin, wo kein Boden ist', () => {
    // Ein Loch von einer Kachel Größe in der Mitte.
    const holed = [
      box(0, 0, 4 * TILE, 10 * TILE, -1, 0),
      box(5 * TILE, 0, 10 * TILE, 10 * TILE, -1, 0),
      box(4 * TILE, 0, 5 * TILE, 4 * TILE, -1, 0),
      box(4 * TILE, 5 * TILE, 5 * TILE, 10 * TILE, -1, 0),
    ];
    const graph = bake(holed, [0]).graph;
    expect(graph.has(tileKey(4, 4, 0))).toBe(false);
    expect(graph.has(tileKey(4, 3, 0))).toBe(true);
  });

  it('stellt eine Wand zwischen zwei Kacheln, wenn dort eine steht', () => {
    // Eine dünne Scheibe genau auf der Kante zwischen Spalte 4 und 5.
    const wall = box(5 * TILE - 0.16, 0, 5 * TILE + 0.16, 10 * TILE, 0, 3);
    const graph = bake([FIELD, wall], [0]).graph;
    expect(graph.wall(tileKey(4, 2, 0), DIR_E)?.kind).toBe('solid');
    expect(findPath(graph, tileKey(0, 2, 0), tileKey(9, 2, 0), human).complete).toBe(false);
  });

  it('lässt eine Lücke in der Wand wieder durch', () => {
    const wall = [
      box(5 * TILE - 0.16, 0, 5 * TILE + 0.16, 4 * TILE, 0, 3),
      box(5 * TILE - 0.16, 5 * TILE, 5 * TILE + 0.16, 10 * TILE, 0, 3),
    ];
    const graph = bake([FIELD, ...wall], [0]).graph;
    const path = findPath(graph, tileKey(0, 2, 0), tileKey(9, 2, 0), human);
    expect(path.complete).toBe(true);
    // Und der Weg geht durch die Lücke in Reihe 4 und nicht durch die Wand.
    expect(path.tiles.some((key) => key === tileKey(4, 4, 0))).toBe(true);
  });

  it('lässt keinen unter ein Vordach, unter das er nicht passt', () => {
    // Eine Decke einen Meter über dem Boden, und dick genug, dass ihr Dach
    // keine eigene Kachel auf dieser Etage mehr wird.
    const canopy = box(0, 0, 5 * TILE, 10 * TILE, 1, 2.4);
    const graph = bake([FIELD, canopy], [0]).graph;
    expect(graph.has(tileKey(1, 1, 0))).toBe(false);
    expect(graph.has(tileKey(7, 1, 0))).toBe(true);
  });

  it('findet den Tunnel und den Sand darüber als zwei Kacheln', () => {
    const roof = box(0, 0, 10 * TILE, 10 * TILE, 3.5, 4);
    const report = bake([FIELD, roof], [0, 4]);
    const below = tileKey(3, 3, 0);
    const above = tileKey(3, 3, 1);
    expect(report.graph.has(below)).toBe(true);
    expect(report.graph.has(above)).toBe(true);
    expect(report.graph.tile(above)?.rise).toBeCloseTo(0, 9);
    // Und man kommt nicht von der einen auf die andere, ohne eine Verbindung.
    expect(findPath(report.graph, below, above, human).complete).toBe(false);
  });

  it('geht über eine Stufe hinweg, als wäre keine da', () => {
    const stepUp = box(5 * TILE, 0, 10 * TILE, 10 * TILE, -1, 0.3);
    const graph = bake([FIELD, stepUp], [0]).graph;
    expect(graph.wall(tileKey(4, 2, 0), DIR_E)).toBeUndefined();
    expect(findPath(graph, tileKey(0, 2, 0), tileKey(9, 2, 0), human).complete).toBe(true);
  });

  it('macht aus einer Kante eine Treppe hinauf und einen Absprung hinunter', () => {
    const ledge = box(5 * TILE, 0, 10 * TILE, 10 * TILE, -1, 1.2);
    const report = bake([FIELD, ledge], [0]);
    const low = tileKey(4, 2, 0);
    const high = tileKey(5, 2, 0);

    // Über eine anderthalb Meter hohe Kante sieht man hinweg, man geht aber
    // nicht hindurch — für die Navigation ist das ein Fenster.
    expect(report.graph.wall(low, DIR_E)?.kind).toBe('window');
    expect(report.links).toBeGreaterThan(0);
    expect(findPath(report.graph, low, high, human).complete).toBe(true);
    expect(findPath(report.graph, high, low, human).complete).toBe(true);
  });

  it('trägt an einer Kante ein, dass die ganze Höhe in einer Stufe steckt', () => {
    // **Die Messung, an der eine Rampe und eine Mauer auseinandergehen**: Hier
    // ist die größte einzelne Stufe so hoch wie der ganze Höhenunterschied —
    // und damit ist es eine Kante, für die kein Winkel gilt, sondern nur die
    // Frage, wer sich 1,2 m hochzieht (`navProfile.canTraverse`).
    const ledge = box(5 * TILE, 0, 10 * TILE, 10 * TILE, -1, 1.2);
    const graph = bake([FIELD, ledge], [0]).graph;
    const link = [...graph.links()][0]!;
    expect(link.kind).toBe('drop');
    expect(Math.abs(link.rise!)).toBeCloseTo(1.2);
    expect(link.step).toBeCloseTo(1.2);
  });

  it('misst an einer Rampe die kleine Stufe und die große Höhe', () => {
    // Dieselben 1,2 m, aber in zehn Stufen von zwölf Zentimetern über zwei
    // Kacheln. Die Karte muss beides auseinanderhalten: Der Höhenunterschied
    // ist derselbe wie an der Kante, die **Stufe** ist es nicht — und nur
    // daran kann ein Profil erkennen, dass es hier gehen und dort klettern
    // müsste.
    const steps = [FIELD];
    for (let i = 0; i < 10; i++) {
      const top = 0.12 * (i + 1);
      steps.push(box(4 * TILE + i * 0.5, 0, 4 * TILE + (i + 1) * 0.5, 10 * TILE, -1, top));
    }
    steps.push(box(4 * TILE + 5, 0, 10 * TILE, 10 * TILE, -1, 1.2));
    const graph = bake(steps, [0]).graph;
    const uphill = [...graph.links()].filter((link) => Math.abs(link.rise ?? 0) > 0.3);
    expect(uphill.length).toBeGreaterThan(0);
    for (const link of uphill) {
      expect(link.kind).toBe('stairs');
      expect(link.step).toBeLessThanOrEqual(0.13);
    }
  });

  it('lässt einen hinunter, aber nicht wieder hinauf, wo es zu hoch ist', () => {
    // Vier Meter: zum Hochsteigen zu hoch für jeden, der keine Leiter hat.
    const cliff = box(5 * TILE, 0, 10 * TILE, 10 * TILE, -1, 4);
    const graph = bake([FIELD, cliff], [0, 4]).graph;
    expect(findPath(graph, tileKey(4, 2, 0), tileKey(5, 2, 1), human).complete).toBe(false);
    // **Hinunter dagegen entscheidet, wer springt.** Die Karte trägt dieselbe
    // Kante für alle ein; ein Mensch überlebt vier Meter knapp, ein Kleintier
    // nicht (`navFall.ts`) — und keiner der beiden Fälle steht irgendwo als
    // Sonderfall.
    const down = (profile: typeof HUMAN_PROFILE): boolean =>
      findPath(graph, tileKey(5, 2, 1), tileKey(4, 2, 0), { profile }).complete;
    expect(down(HUMAN_PROFILE)).toBe(true);
    expect(down(CRITTER_PROFILE)).toBe(false);
  });

  it('springt über eine Lücke von einer Kachel', () => {
    // **Was kein Nachbar ist und trotzdem ein Weg.** Zwei Platten mit einem
    // Gang dazwischen: Auf der Karte sind das zwei Kacheln, zwischen denen eine
    // fehlt — und genau daraus wird eine Sprungverbindung, ohne dass sie
    // jemand einträgt.
    const west = box(0, 0, 4 * TILE, 10 * TILE, 2, 2.4);
    const east = box(5 * TILE, 0, 10 * TILE, 10 * TILE, 2, 2.4);
    const graph = bake([west, east], [2.4]).graph;
    const from = tileKey(3, 2, 0);
    const to = tileKey(5, 2, 0);
    const leap = [...graph.links()].find((link) => link.kind === 'jump');
    expect(leap).toBeDefined();
    expect(leap!.gap).toBeCloseTo(2 * TILE);
    // Wer springt, ist drüben; wer nicht, steht an der Kante.
    expect(findPath(graph, from, to, human).complete).toBe(true);
    expect(findPath(graph, from, to, { profile: ZOMBIE_PROFILE }).complete).toBe(false);
  });

  it('springt nicht durch eine Wand, die in der Lücke steht', () => {
    const west = box(0, 0, 4 * TILE, 10 * TILE, 2, 2.4);
    const east = box(5 * TILE, 0, 10 * TILE, 10 * TILE, 2, 2.4);
    // Eine Mauer im Gang, die bis über die Dächer reicht.
    const wall = box(4 * TILE + 1, 0, 5 * TILE - 1, 10 * TILE, 0, 4);
    const graph = bake([west, east, wall], [2.4]).graph;
    expect([...graph.links()].some((link) => link.kind === 'jump')).toBe(false);
  });

  it('meldet, was es gefunden hat', () => {
    const report = bake([FIELD], [0]);
    expect(report.columns).toBe(100);
    expect(report.tiles).toBe(100);
    expect(report.millis).toBeGreaterThanOrEqual(0);
  });
});

describe('Die Säule', () => {
  const index = (boxes: NavBox[]): ColumnIndex =>
    new ColumnIndex(boxes, { minX: -50, minZ: -50, maxX: 50, maxZ: 50 });

  it('gibt die Böden von unten nach oben', () => {
    const column = index([
      box(0, 0, 5, 5, -1, 0),
      box(0, 0, 5, 5, 3, 3.3),
      box(0, 0, 5, 5, 6, 6.3),
    ]);
    expect(floorsAt(column, 2.5, 2.5, 1.7)).toEqual([0, 3.3, 6.3]);
  });

  it('lässt aus, wo zu wenig Luft ist', () => {
    const column = index([box(0, 0, 5, 5, -1, 0), box(0, 0, 5, 5, 1.2, 1.5)]);
    // Der Boden bei 0 hat nur 1,2 m Luft — der Deckel darüber zählt trotzdem.
    expect(floorsAt(column, 2.5, 2.5, 1.7)).toEqual([1.5]);
  });

  it('zählt zwei Platten übereinander nur einmal', () => {
    const column = index([box(0, 0, 5, 5, -1, 0), box(0, 0, 5, 5, -0.5, 0.02)]);
    expect(floorsAt(column, 2.5, 2.5, 1.7)).toHaveLength(1);
  });

  it('kennt nur, was wirklich über dem Punkt liegt', () => {
    const column = index([box(10, 10, 15, 15, -1, 0)]);
    expect(floorsAt(column, 2.5, 2.5, 1.7)).toEqual([]);
    expect(floorsAt(column, 12.5, 12.5, 1.7)).toEqual([0]);
  });

  it('sagt, ob zwischen zwei Höhen etwas steht', () => {
    const column = index([box(0, 0, 5, 5, 0, 3)]);
    expect(column.blocks(2.5, 2.5, 1, 2)).toBe(true);
    expect(column.blocks(2.5, 2.5, 3.5, 4)).toBe(false);
    expect(column.blocks(9, 9, 1, 2)).toBe(false);
  });
});

describe('Die Etagen', () => {
  it('nimmt die nächste, die nah genug ist', () => {
    const levels = [0, 3.1, 6.2];
    expect(levelFor(levels, 0.32, BAKE_DEFAULTS.band)).toBe(0);
    expect(levelFor(levels, 3.42, BAKE_DEFAULTS.band)).toBe(1);
    expect(levelFor(levels, 20, BAKE_DEFAULTS.band)).toBe(-1);
  });

  it('lassen sich aus den Flächen raten', () => {
    const boxes = [FIELD, box(0, 0, 10 * TILE, 10 * TILE, 3, 3.4)];
    const index = new ColumnIndex(boxes, BOUNDS);
    const levels = guessLevels(index, 0, 9, 0, 9, 1.7, BAKE_DEFAULTS.band);
    expect(levels).toHaveLength(2);
    expect(levels[0]).toBeCloseTo(0, 6);
    expect(levels[1]).toBeCloseTo(3.4, 6);
  });

  it('halten ein einzelnes Podest für keine Etage', () => {
    // Ein Podest über einer einzigen Kachel — das ist Feinhöhe, keine Ebene.
    const boxes = [FIELD, box(0, 0, TILE, TILE, -1, 1.1)];
    const index = new ColumnIndex(boxes, BOUNDS);
    expect(guessLevels(index, 0, 9, 0, 9, 1.7, BAKE_DEFAULTS.band)).toHaveLength(1);
  });

  it('geben mindestens eine zurück, auch wenn nichts dasteht', () => {
    const index = new ColumnIndex([], BOUNDS);
    expect(guessLevels(index, 0, 9, 0, 9, 1.7, BAKE_DEFAULTS.band)).toEqual([0]);
  });
});
