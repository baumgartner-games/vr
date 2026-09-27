import { elementById, hasElement } from '../elements/elementCatalog';
import { overlaps, spotTiles } from '../elements/elementPlace';
import { elementStations, stationKind } from '../elements/stationLayer';
import { tileKey } from '../nav/navTile';
import { SPOTS, ground, restaurantPlan, spawn } from './restaurantPlan';

/**
 * **Das leere Test Restaurant** — Boden, Ankunftsort und die Liste, in die der
 * Neuaufbau kommt (`SPOTS`).
 */
describe('Test Restaurant — der Plan', () => {
  it('hat einen Boden von 40 × 32 Kacheln, und man kommt darauf an', () => {
    const g = ground();
    expect([g.w, g.d]).toEqual([40, 32]);
    const plan = restaurantPlan();
    const at = spawn();
    const tile = { x: Math.floor(at.x), z: Math.floor(at.z) };
    expect(plan.graph.has(tileKey(tile.x, tile.z, 0))).toBe(true);
    // Mitten auf einer Kachel, damit die Figur (2 × 2 Zellen) frei steht.
    expect(at.x - tile.x).toBe(0.5);
    expect(at.z - tile.z).toBe(0.5);
  });

  it('stellt nur Elemente hin, die es gibt, auf den Boden, ohne Überlappen und nicht auf den Ankunftsort', () => {
    const g = ground();
    const at = spawn();
    const start = `${Math.floor(at.x)},${Math.floor(at.z)}`;
    for (const spot of SPOTS) {
      expect(hasElement(spot.element)).toBe(true);
      for (const tile of spotTiles(spot)) {
        const [x, z] = tile.split(',').map(Number) as [number, number];
        expect(x >= g.x && x < g.x + g.w && z >= g.z && z < g.z + g.d).toBe(true);
        expect(tile).not.toBe(start);
      }
    }
    expect(overlaps(SPOTS)).toEqual([]);
    expect(new Set(SPOTS.map((spot) => spot.id)).size).toBe(SPOTS.length);
  });

  it('macht aus jeder Stelle mit Stationsart eine Station — ohne zweite Liste', () => {
    // Heute ist `SPOTS` leer; sobald der Neuaufbau kommt, gilt dieselbe Regel
    // für jede Zeile: Wer eine Stationsart hat, antwortet auf `A`.
    for (const spot of SPOTS) {
      const kind = stationKind(elementById(spot.element));
      expect({ id: spot.id, stations: elementStations(spot).length > 0 }).toEqual({
        id: spot.id,
        stations: kind !== null,
      });
    }
  });
});
