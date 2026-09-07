import { findPath } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { DIRS, TILE, tileKey, type TileKey } from '../nav/navTile';
import { solidBounds } from '../grid/solids';
import { HALL_Z, HOUSE, darkHouse } from './darkHouse';

const plan = darkHouse();
const at = (x: number, z: number): TileKey => tileKey(x, z, 0);

/** Die fünf Zimmer, an je einer Kachel, die sicher darin liegt. */
const ROOMS: Record<string, TileKey> = {
  start: at(-3, 2),
  küche: at(2, 1),
  gang: at(0, HALL_Z),
  dunkelzimmer: at(-3, -2),
  kammer: at(1, -1),
  hinterzimmer: at(3, -3),
};

describe('Das Dunkelhaus als Grundriss', () => {
  it('legt Boden über das ganze Haus und nicht darüber hinaus', () => {
    expect([...plan.graph.tileKeys()]).toHaveLength(HOUSE.w * HOUSE.d);
    expect(plan.graph.has(at(HOUSE.x, HOUSE.z))).toBe(true);
    expect(plan.graph.has(at(HOUSE.x + HOUSE.w, HOUSE.z))).toBe(false);
  });

  /**
   * **Der Test, wegen dem der Grundriss in einer eigenen Datei steht.**
   *
   * Ein Zimmer ohne Tür merkt man sonst erst, wenn man davorsteht — nach dem
   * Laden, nach dem Aufsetzen, nach dem Hinlaufen. Hier fällt es in einer
   * Millisekunde auf, und zwar für jedes Zimmer einzeln, damit in der Meldung
   * steht, *welches*.
   */
  for (const [name, tile] of Object.entries(ROOMS)) {
    it(`lässt einen vom Startzimmer bis ins ${name}`, () => {
      const path = findPath(plan.graph, ROOMS.start!, tile, { profile: HUMAN_PROFILE });
      expect(path.complete).toBe(true);
    });
  }

  it('führt jeden Weg zwischen den Hälften durch den Gang', () => {
    // Ohne den Gang wären es zwei Häuser. Der Weg von Süden nach Norden muss
    // ihn also berühren — täte er es nicht, stünde irgendwo eine Wand zu wenig.
    const path = findPath(plan.graph, ROOMS.start!, ROOMS.kammer!, { profile: HUMAN_PROFILE });
    expect(path.tiles.some((one) => one === at(0, HALL_Z) || one === at(-3, HALL_Z))).toBe(true);
  });

  it('trennt die vier Zimmer wirklich voneinander', () => {
    // Zwischen Startzimmer und Küche liegt die Längswand: der kürzeste Weg
    // geht über den Gang und ist deshalb deutlich länger als die Luftlinie.
    const direct = findPath(plan.graph, ROOMS.start!, ROOMS.küche!, { profile: HUMAN_PROFILE });
    expect(direct.complete).toBe(true);
    expect(direct.tiles.length).toBeGreaterThan(5);
  });
});

describe('Was im Dunkelhaus steht', () => {
  it('stellt eine Küchenzeile über drei Kacheln in die Küche', () => {
    const counters = plan.blocks().filter((one) => one.kind === 'counter');
    expect(counters).toHaveLength(3);
  });

  /**
   * Ein Baustein in einer Türöffnung ist der Fehler, den ein Grundriss möglich
   * macht und den vorher niemand hätte machen können, weil es gar keine
   * Bausteine gab. Also wird er hier abgefangen: Wo eine Tür ist, steht nichts.
   */
  it('stellt keinen Baustein in eine Tür', () => {
    const doors = new Set<TileKey>();
    for (const key of plan.graph.tileKeys()) {
      for (const dir of DIRS) {
        if (plan.graph.wall(key, dir)?.kind === 'door') doors.add(key);
      }
    }
    for (const block of plan.blocks()) {
      if (block.kind === 'panel') continue;
      expect(doors.has(block.tile)).toBe(false);
    }
  });

  /**
   * Die Portaltafeln sind das Gegenteil: Sie *sollen* an einer Wand hängen, und
   * zwar an einer, die es gibt. Eine Tafel an einer Kante ohne Wand schwebt.
   */
  it('hängt jede Portaltafel an einer Wand', () => {
    for (const block of plan.blocks()) {
      if (block.kind !== 'panel') continue;
      expect(plan.graph.wall(block.tile, block.dir)).toBeDefined();
    }
  });

  it('macht die Kacheln mit Möbeln teurer als die leeren', () => {
    const kitchen = plan.graph.tile(at(2, 2))!;
    const empty = plan.graph.tile(at(-3, -2))!;
    expect(kitchen.cost).toBeGreaterThan(empty.cost);
  });

  it('baut das Haus unter eine einzige Decke', () => {
    const roof = plan.solids().filter((one) => one.y > 2.5 && one.w > TILE * 4);
    expect(roof).toHaveLength(1);
  });

  it('bleibt mit allem, was es baut, innerhalb des Hauses', () => {
    const box = solidBounds(plan.solids())!;
    // Eine halbe Wandstärke Luft: Die Außenwände sitzen auf der Kante und
    // ragen deshalb zur Hälfte nach draußen.
    expect(box.minX).toBeGreaterThanOrEqual(HOUSE.x * TILE - 0.2);
    expect(box.maxX).toBeLessThanOrEqual((HOUSE.x + HOUSE.w) * TILE + 0.2);
    expect(box.minZ).toBeGreaterThanOrEqual(HOUSE.z * TILE - 0.2);
    expect(box.maxZ).toBeLessThanOrEqual((HOUSE.z + HOUSE.d) * TILE + 0.2);
  });
});
