import { CELL, CellGrid, snapCell, type Slope } from './cellGrid';
import { cellRoute } from './cellRoute';
import { fillRect, setDoor } from './navBuild';
import { NavGraph } from './navGraph';
import { findPath } from './navPath';
import { HUMAN_PROFILE } from './navProfile';
import { DIR_E, tileKey, type TileKey } from './navTile';
import { NavAgent } from './navAgent';

/** Ein Feld 8 × 8 mit einer Schräge von Südwest nach Nordost quer hindurch. */
function slanted(): NavGraph {
  const graph = new NavGraph([0]);
  fillRect(graph, { x: 0, z: 0, w: 8, d: 8 });
  const slopes = new Map<TileKey, Slope>();
  // Die Diagonale von (1, 6) nach (6, 1): eine durchgehende Wand „╱".
  for (let i = 1; i <= 6; i++) slopes.set(tileKey(i, 7 - i), 'slash');
  graph.slopeAt = (key) => slopes.get(key) ?? null;
  return graph;
}

function route(graph: NavGraph, from: [number, number], to: [number, number]) {
  const a = tileKey(from[0], from[1]),
    b = tileKey(to[0], to[1]);
  const tiles = findPath(graph, a, b, { profile: HUMAN_PROFILE }).tiles;
  return cellRoute(
    graph,
    tiles,
    { x: from[0] + 0.5, z: from[1] + 0.5 },
    { x: to[0] + 0.5, z: to[1] + 0.5 },
  );
}

describe('Der Weg eines NPC auf Zellen', () => {
  it('läuft einen Gang von einer Kachel Breite ab — ein 2×2-Block passt hinein', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 6, d: 1 });
    const points = route(graph, [0, 0], [5, 0])!;
    expect(points).not.toBeNull();
    // Eine Gerade: Start und Ziel, nichts dazwischen.
    expect(points.map((p) => [p.x, p.z])).toEqual([
      [0.5, 0.5],
      [5.5, 0.5],
    ]);
    expect(points.every((p) => !p.tight)).toBe(true);
  });

  it('geht an einer Schräge schräg entlang und nie durch sie hindurch', () => {
    const graph = slanted();
    // Beide Punkte auf der Nordwestseite der Wand, an ihren Enden.
    const points = route(graph, [0, 5], [5, 0])!;
    expect(points).not.toBeNull();
    const grid = new CellGrid({
      floor: (tx, tz) => graph.walkable(tileKey(tx, tz)),
      open: () => true,
      slope: (tx, tz) => graph.slopeAt(tileKey(tx, tz)),
    });
    // Jeder Wegpunkt ist ein freier Block auf der richtigen Seite (x + z < 7).
    for (const p of points) {
      expect(grid.footprintFree(snapCell(p.x, p.z))).toBe(true);
      expect(p.x + p.z).toBeLessThan(7);
    }
    // Und das Stück an der Wand entlang ist wirklich schräg.
    const slant = points.some((p, i) => {
      const q = points[i + 1];
      return !!q && q.x - p.x === -(q.z - p.z) && q.x !== p.x;
    });
    expect(slant).toBe(true);
  });

  it('geht nur durch die Tür, die auch der grobe Weg nimmt', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 4, d: 2 });
    for (const z of [0, 1]) graph.setWall(tileKey(1, z), DIR_E, { kind: 'solid' });
    setDoor(graph, tileKey(1, 0), DIR_E, 'nord', true);
    const points = route(graph, [0, 1], [3, 1])!;
    expect(points).not.toBeNull();
    // Die Tür liegt in Reihe 0 auf der Kante x = 2: Dort muss ein Punkt über sie gehen.
    const through = points.some(
      (p, i) => i > 0 && points[i - 1]!.x < 2 !== p.x < 2 && Math.min(p.z, points[i - 1]!.z) < 1,
    );
    expect(through || points.some((p) => p.x === 2 && p.z <= 1)).toBe(true);
  });

  it('gibt auf, wo kein Block durchpasst — der Agent nimmt dann den alten Weg', () => {
    // Zwei Räume, dazwischen nur eine Kante mit Tür — aber die Nachbarkachel
    // im Gang fehlt: ein Durchlass, schmaler als ein Block.
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1 });
    graph.setTile(tileKey(0, 0), { hazard: 0 });
    const tiles = [tileKey(0, 0), tileKey(1, 0)];
    graph.slopeAt = (key) => (key === tileKey(1, 0) ? 'slash' : null);
    expect(cellRoute(graph, tiles, { x: 0.5, z: 0.5 }, { x: 1.5, z: 0.5 })).not.toBeNull();
    graph.slopeAt = (key) => (key === tileKey(0, 0) || key === tileKey(1, 0) ? 'slash' : null);
    expect(cellRoute(graph, tiles, { x: 0.5, z: 0.5 }, { x: 1.5, z: 0.5 })).toBeNull();
  });

  it('plant für jede Blockgröße — ein 3×3-Agent passt nicht, wo 2×2 geht', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 6, d: 1 });
    const tiles = findPath(graph, tileKey(0, 0), tileKey(5, 0), { profile: HUMAN_PROFILE }).tiles;
    const from = { x: 0.5, z: 0.5 },
      to = { x: 5.5, z: 0.5 };
    expect(cellRoute(graph, tiles, from, to, 2)).not.toBeNull();
    expect(cellRoute(graph, tiles, from, to, 1)).not.toBeNull();
    expect(cellRoute(graph, tiles, from, to, 3)).toBeNull();
  });

  it('bringt einen Läufer um eine Schräge herum ans Ziel', () => {
    const graph = slanted();
    const agent = new NavAgent({ profile: HUMAN_PROFILE });
    const at = { x: 1.5, y: 0, z: 1.5 };
    const goal = { x: 6.5, y: 0, z: 6.5 };
    let arrived = false;
    for (let t = 0; t < 20 && !arrived; t += 1 / 30) {
      const step = agent.step(graph, at, goal, 1 / 30, t);
      if (!step.waypoint) continue;
      const dx = step.waypoint.x - at.x,
        dz = step.waypoint.z - at.z;
      const length = Math.hypot(dx, dz) || 1;
      at.x += (dx / length) * 0.08;
      at.z += (dz / length) * 0.08;
      // Nie in einer gesperrten Zelle der Schräge.
      const cell = { x: Math.floor(at.x / CELL), z: Math.floor(at.z / CELL) };
      const tx = Math.floor(cell.x / 2),
        tz = Math.floor(cell.z / 2);
      if (graph.slopeAt(tileKey(tx, tz)) === 'slash') {
        expect(cell.x - tx * 2).toBe(cell.z - tz * 2);
      }
      arrived = Math.hypot(goal.x - at.x, goal.z - at.z) < 0.8;
    }
    expect(arrived).toBe(true);
  });

  it('meidet die Zellen, auf denen etwas steht (`NavGraph.cellBlocked`)', () => {
    // Ein Gang von 8 × 2 Kacheln; auf der Nordhälfte der Kacheln 3 und 4 steht
    // ein Möbel. Der Block geht südlich daran vorbei, statt hineinzuplanen.
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 8, d: 2 });
    graph.cellBlocked = (ix, iz) => ix >= 6 && ix <= 9 && iz <= 1;
    const tiles = findPath(graph, tileKey(0, 0), tileKey(7, 0), { profile: HUMAN_PROFILE }).tiles;
    const route = cellRoute(graph, tiles, { x: 0.5, z: 0.5 }, { x: 7.5, z: 0.5 })!;
    expect(route).not.toBeNull();
    const grid = new CellGrid({
      floor: (tx, tz) => graph.walkable(tileKey(tx, tz)),
      open: () => true,
      slope: () => null,
      blocked: (ix, iz) => graph.cellBlocked(ix, iz, 0),
    });
    for (const point of route) expect(grid.footprintFree(snapCell(point.x, point.z))).toBe(true);
    expect(route.some((point) => point.z > 1)).toBe(true);
  });
});
