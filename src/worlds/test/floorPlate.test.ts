import { PLATE_PROTOTYPE, floorPlate } from './floorPlate';
import { floorPlateSpots } from '../shared/plateField';
import { PIT_BOXES, PIT_LANE } from '../kart/kartCourse';
import { KART_WORLD, zonePlan } from './zoneWorlds';

/**
 * **Welche Platte wo liegt, nachgerechnet.** Der Boden ist ein Bild; die
 * **Entscheidung** darüber ist eine Funktion mit einer Zeile, und die ist in
 * Millisekunden zu prüfen.
 */
describe('floorPlate', () => {
  it('legt überall den Prototyp-Boden', () => {
    expect(floorPlate({ col: 0, row: 0, level: 0 })).toBe(PLATE_PROTOTYPE);
    expect(floorPlate({ col: -300, row: 200, level: 0 })).toBe(PLATE_PROTOTYPE);
  });

  it('legt unter die Boxengasse keinen zweiten Boden', () => {
    // Gemeldet als Z-Fighting: Der Asphalt **ist** dort der Boden, und eine
    // Prototyp-Platte darunter flimmerte durch.
    for (const rect of [PIT_LANE, PIT_BOXES]) {
      expect(floorPlate({ col: rect.x, row: rect.z, level: 0 })).toBeNull();
      expect(
        floorPlate({ col: rect.x + rect.w - 1, row: rect.z + rect.d - 1, level: 0 }),
      ).toBeNull();
    }
    // Gleich daneben ist wieder Gelände.
    expect(floorPlate({ col: PIT_LANE.x + PIT_LANE.w, row: PIT_LANE.z, level: 0 })).toBe(
      PLATE_PROTOTYPE,
    );
  });
});

describe('der Plattenboden der Test Rennstrecke', () => {
  const spots = floorPlateSpots(zonePlan(KART_WORLD).solids(), floorPlate);

  it('legt auf keine Kachel zwei Platten', () => {
    const seen = new Set(spots.map((one) => `${one.x}|${one.y}|${one.z}`));
    expect(seen.size).toBe(spots.length);
  });

  it('lässt in der Boxengasse wirklich nichts liegen', () => {
    const inLane = spots.filter(
      (spot) =>
        spot.x > PIT_LANE.x &&
        spot.x < PIT_LANE.x + PIT_LANE.w &&
        spot.z > PIT_LANE.z &&
        spot.z < PIT_LANE.z + PIT_LANE.d,
    );
    expect(inLane).toEqual([]);
  });
});
