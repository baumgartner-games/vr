import { addPortal, connect, fillRect, setDoor } from './navBuild';
import { DOOR_COST, NavGraph } from './navGraph';
import { findPath, flowField, flowPath, smoothPath } from './navPath';
import {
  HAZARD_SPIKES,
  HUMAN_PROFILE,
  VEHICLE_PROFILE,
  ZOMBIE_PROFILE,
  type CostProfile,
} from './navProfile';
import { DIR_E, TILE, keyLevel, keyX, keyZ, tileKey } from './navTile';

const human = { profile: HUMAN_PROFILE };
const zombie = { profile: ZOMBIE_PROFILE };

function at(x: number, z: number, level = 0): number {
  return tileKey(x, z, level);
}

describe('Der einfache Weg', () => {
  it('läuft den Gang entlang und kostet, was er lang ist', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 10, d: 1 });
    const path = findPath(graph, at(0, 0), at(9, 0), human);
    expect(path.complete).toBe(true);
    expect(path.tiles).toHaveLength(10);
    expect(path.cost).toBeCloseTo(9 * TILE, 9);
  });

  it('bleibt stehen, wenn er schon da ist', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 1 });
    const path = findPath(graph, at(1, 0), at(1, 0), human);
    expect(path).toMatchObject({ complete: true, cost: 0 });
    expect(path.tiles).toEqual([at(1, 0)]);
  });

  it('geht um eine Wand herum, statt durch sie hindurch', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 5, d: 3 });
    for (const z of [0, 1]) graph.setWall(at(2, z), DIR_E, { kind: 'solid' });
    const path = findPath(graph, at(0, 0), at(4, 0), human);
    expect(path.complete).toBe(true);
    // Der einzige Durchlass ist die untere Reihe: der Weg muss dort entlang.
    expect(path.tiles.some((key) => keyZ(key) === 2)).toBe(true);
  });

  it('gibt den besten Teilweg zurück, wenn es keinen ganzen gibt', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 6, d: 1 });
    graph.setWall(at(3, 0), DIR_E, { kind: 'solid' });
    const path = findPath(graph, at(0, 0), at(5, 0), human);
    expect(path.complete).toBe(false);
    // Bis vor die Wand, und dort stehen bleiben — nicht auf der Stelle.
    expect(path.tiles[path.tiles.length - 1]).toBe(at(3, 0));
  });

  it('meldet gar nichts, wenn schon der Start nicht begehbar ist', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 1 });
    graph.setBlocked(at(0, 0), true);
    expect(findPath(graph, at(0, 0), at(2, 0), human).tiles).toEqual([]);
  });
});

describe('Dieselbe Karte, zwei Sorten', () => {
  /** Ein Gang mit einer Stachelgrube in der Mitte, oben und unten Platz. */
  function pit(): NavGraph {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 7, d: 3 });
    for (const x of [2, 3, 4]) {
      graph.setTile(at(x, 1), { hazard: HAZARD_SPIKES });
    }
    return graph;
  }

  const spiked = (graph: NavGraph, key: number): boolean =>
    (graph.tile(key)?.hazard ?? 0) === HAZARD_SPIKES;

  it('lässt den Zombie in die Grube laufen', () => {
    const graph = pit();
    const path = findPath(graph, at(0, 1), at(6, 1), zombie);
    expect(path.complete).toBe(true);
    expect(path.tiles).toHaveLength(7);
    expect(path.tiles.some((key) => spiked(graph, key))).toBe(true);
  });

  it('lässt den Menschen darum herumgehen', () => {
    const graph = pit();
    const path = findPath(graph, at(0, 1), at(6, 1), human);
    expect(path.complete).toBe(true);
    expect(path.tiles.some((key) => spiked(graph, key))).toBe(false);
    // Der Umweg kostet zwei Kacheln mehr, und mehr auch nicht.
    expect(path.cost).toBeCloseTo(8 * TILE, 9);
  });

  it('unterscheidet „lieber nicht" von „niemals"', () => {
    // Wasser ist dem Menschen acht Meter Umweg wert. Ist der Umweg länger,
    // geht er hindurch — anders als bei den Stacheln, wo er es nie tut.
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 1 });
    graph.setTile(at(1, 0), { hazard: 1 << 2 });
    const path = findPath(graph, at(0, 0), at(2, 0), human);
    expect(path.complete).toBe(true);
    expect(path.cost).toBeCloseTo(2 * TILE + 8, 9);
  });
});

describe('Türen', () => {
  /** Zwei Räume, dazwischen eine Wand mit einer einzigen Tür. */
  function house(open: boolean, barred = false): NavGraph {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 7, d: 3 });
    for (const z of [0, 1, 2]) graph.setWall(at(3, z), DIR_E, { kind: 'solid' });
    setDoor(graph, at(3, 1), DIR_E, 'tuer-7', open);
    if (barred) graph.setDoor('tuer-7', { barred: true });
    return graph;
  }

  it('geht durch die offene Tür, ohne Aufschlag', () => {
    const path = findPath(house(true), at(0, 1), at(6, 1), human);
    expect(path.complete).toBe(true);
    expect(path.cost).toBeCloseTo(6 * TILE, 9);
  });

  it('macht die geschlossene auf und bezahlt dafür', () => {
    const path = findPath(house(false), at(0, 1), at(6, 1), human);
    expect(path.complete).toBe(true);
    expect(path.cost).toBeCloseTo(6 * TILE + DOOR_COST, 9);
  });

  it('lässt den Zombie vor der geschlossenen Tür stehen', () => {
    const graph = house(false);
    const path = findPath(graph, at(0, 1), at(6, 1), zombie);
    expect(path.complete).toBe(false);
    expect(keyX(path.tiles[path.tiles.length - 1]!)).toBe(3);
  });

  it('macht aus der verbarrikadierten Tür für alle eine Wand', () => {
    expect(findPath(house(false, true), at(0, 1), at(6, 1), human).complete).toBe(false);
  });
});

describe('Verbindungen', () => {
  it('nimmt das Portal, weil es fast nichts kostet', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 3 });
    fillRect(graph, { x: 20, z: 0, w: 3, d: 3 });
    expect(findPath(graph, at(1, 1), at(21, 1), human).complete).toBe(false);

    addPortal(graph, 'portal-3', at(1, 1), at(21, 1));
    const path = findPath(graph, at(1, 1), at(21, 1), human);
    expect(path.complete).toBe(true);
    expect(path.tiles).toEqual([at(1, 1), at(21, 1)]);
  });

  it('steigt die Treppe, aber nur, wer es kann', () => {
    const graph = new NavGraph([0, 3.1]);
    fillRect(graph, { x: 0, z: 0, w: 4, d: 4 });
    fillRect(graph, { x: 0, z: 0, w: 4, d: 4, level: 1 });
    connect(graph, 'treppe', at(3, 3, 0), at(3, 3, 1), 'stairs');

    const up = findPath(graph, at(0, 0, 0), at(0, 0, 1), human);
    expect(up.complete).toBe(true);
    expect(up.tiles.some((key) => keyLevel(key) === 1)).toBe(true);

    // Ein Fahrzeug nimmt keine Treppe — dieselbe Karte, kein Weg.
    const car: { profile: CostProfile } = { profile: VEHICLE_PROFILE };
    expect(findPath(graph, at(0, 0, 0), at(0, 0, 1), car).complete).toBe(false);
  });

  it('lässt einen Absprung nur in eine Richtung zu', () => {
    const graph = new NavGraph([0, 3.1]);
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1 });
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1, level: 1 });
    connect(graph, 'kante', at(0, 0, 1), at(0, 0, 0), 'drop');
    expect(findPath(graph, at(1, 0, 1), at(1, 0, 0), human).complete).toBe(true);
    expect(findPath(graph, at(1, 0, 0), at(1, 0, 1), human).complete).toBe(false);
  });
});

describe('Die Glättung', () => {
  it('macht aus dem Treppenmuster eine Linie', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 6, d: 6 });
    const path = findPath(graph, at(0, 0), at(5, 5), human);
    expect(path.tiles.length).toBeGreaterThan(2);
    expect(smoothPath(graph, path.tiles, human)).toEqual([at(0, 0), at(5, 5)]);
  });

  it('lässt die Ecke stehen, um die wirklich herumgelaufen wird', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 6, d: 6 });
    for (const z of [0, 1, 2, 3]) graph.setWall(at(2, z), DIR_E, { kind: 'solid' });
    const path = findPath(graph, at(0, 0), at(5, 0), human);
    const smooth = smoothPath(graph, path.tiles, human);
    expect(smooth.length).toBeGreaterThan(2);
    // Und keine der übrig gebliebenen Strecken darf durch die Wand gehen.
    for (let i = 1; i < smooth.length; i++) {
      expect(findPath(graph, smooth[i - 1]!, smooth[i]!, human).complete).toBe(true);
    }
  });

  it('kürzt nicht über eine Treppe hinweg ab', () => {
    const graph = new NavGraph([0, 3.1]);
    fillRect(graph, { x: 0, z: 0, w: 4, d: 1 });
    fillRect(graph, { x: 0, z: 0, w: 4, d: 1, level: 1 });
    connect(graph, 'treppe', at(3, 0, 0), at(3, 0, 1), 'stairs');
    const path = findPath(graph, at(0, 0, 0), at(0, 0, 1), human);
    const smooth = smoothPath(graph, path.tiles, human);
    // Beide Enden der Treppe müssen stehen bleiben, sonst läuft er durch die Decke.
    expect(smooth).toContain(at(3, 0, 0));
    expect(smooth).toContain(at(3, 0, 1));
  });

  it('lässt einen Weg aus zwei Punkten in Ruhe', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1 });
    expect(smoothPath(graph, [at(0, 0), at(1, 0)], human)).toEqual([at(0, 0), at(1, 0)]);
  });
});

describe('Das Strömungsfeld', () => {
  it('führt von überall zum Ziel', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 8, d: 8 });
    const goal = at(7, 7);
    const field = flowField(graph, [goal], human);
    for (const start of [at(0, 0), at(0, 7), at(4, 2)]) {
      const walk = flowPath(field, start);
      expect(walk[walk.length - 1]).toBe(goal);
    }
  });

  it('kennt die Kosten von jeder Kachel aus', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 5, d: 1 });
    const field = flowField(graph, [at(4, 0)], human);
    expect(field.cost.get(at(0, 0))).toBeCloseTo(4 * TILE, 9);
    expect(field.cost.get(at(4, 0))).toBe(0);
  });

  it('umgeht die Gefahren desselben Profils wie die Einzelsuche', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 7, d: 3 });
    for (const x of [2, 3, 4]) graph.setTile(at(x, 1), { hazard: HAZARD_SPIKES });
    const field = flowField(graph, [at(6, 1)], human);
    const walk = flowPath(field, at(0, 1));
    expect(walk.some((key) => keyZ(key) === 1 && keyX(key) === 3)).toBe(false);
    expect(walk[walk.length - 1]).toBe(at(6, 1));
  });

  it('lässt die Horde keine Klippe hochlaufen', () => {
    const graph = new NavGraph([0, 3.1]);
    fillRect(graph, { x: 0, z: 0, w: 3, d: 1 });
    fillRect(graph, { x: 0, z: 0, w: 3, d: 1, level: 1 });
    connect(graph, 'kante', at(0, 0, 1), at(0, 0, 0), 'drop');
    // Ziel unten: von oben kommt man herunter.
    expect(flowField(graph, [at(2, 0, 0)], human).cost.has(at(2, 0, 1))).toBe(true);
    // Ziel oben: von unten kommt man nicht hinauf.
    expect(flowField(graph, [at(2, 0, 1)], human).cost.has(at(2, 0, 0))).toBe(false);
  });

  it('sperrt eine Kachel aus, auf der etwas steht', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 5, d: 1 });
    graph.setBlocked(at(2, 0), true);
    const field = flowField(graph, [at(4, 0)], human);
    expect(field.cost.has(at(0, 0))).toBe(false);
    expect(field.cost.has(at(3, 0))).toBe(true);
  });
});

describe('Die Reißleine', () => {
  it('hört nach so vielen Kacheln auf und liefert trotzdem etwas', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 60, d: 60 });
    const path = findPath(graph, at(0, 0), at(59, 59), { ...human, maxNodes: 50 });
    expect(path.complete).toBe(false);
    expect(path.visited).toBeLessThanOrEqual(50);
    expect(path.tiles.length).toBeGreaterThan(1);
  });
});
