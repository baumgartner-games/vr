import { PLATE_PROTOTYPE, PLATE_STONE, floorPlate } from './floorPlate';
import { floorPlateSpots } from '../shared/plateField';
import { FIELD, KITCHEN, PODIUM } from './layout';
import { DECK } from './zones/podium';
import { testPlan } from './testPlan';

/**
 * **Welche Platte wo liegt, nachgerechnet.**
 *
 * Der Boden ist ein Bild und lässt sich nur in der Brille beurteilen; die
 * **Entscheidung** darüber ist eine Funktion mit drei Zeilen, und die ist in
 * Millisekunden zu prüfen. Vier Fälle sind es, und jeder einzelne ist in der
 * Brille eine Beschwerde:
 *
 * - **Gelände → Prototyp.** Sonst bleibt das Grün stehen, um das es ging.
 * - **Küche → keine.** Sonst liegt unter den Fliesen ein zweiter Belag und
 *   streitet mit ihnen um jeden Bildpunkt.
 * - **Ebene 1 → Stein.** So bestellt: „für die obere Ebene einen Steinboden
 *   statt des Prototyp-Bodens."
 * - **Draußen → Prototyp.** Die Schürze jenseits des Geländes gehört zum
 *   selben Boden; eine Kachel, die dort anders entschiede, wäre die Kante, die
 *   niemand sehen soll.
 *
 * Und darunter dasselbe noch einmal am **wirklichen Grundriss** (`testPlan()`):
 * Die Zahlen dort sind die, die das Bild bezahlt.
 */

describe('floorPlate', () => {
  it('legt auf das Gelände den Prototyp-Boden', () => {
    // Der Startplatz in der Mitte — Ebene 0, weit weg von der Küche.
    expect(floorPlate({ col: 0, row: 0, level: 0 })).toBe(PLATE_PROTOTYPE);
  });

  it('lässt die Küche aus — und zwar genau ihr Rechteck', () => {
    expect(floorPlate({ col: KITCHEN.x, row: KITCHEN.z, level: 0 })).toBeNull();
    const east = KITCHEN.x + KITCHEN.w - 1;
    const south = KITCHEN.z + KITCHEN.d - 1;
    expect(floorPlate({ col: east, row: south, level: 0 })).toBeNull();
    // Eine Kachel weiter ist wieder Gelände: Der Belag der Küche deckt genau
    // dieses Rechteck ab (`zones/kitchenFloor.ts`), keinen Meter mehr.
    expect(floorPlate({ col: east + 1, row: south, level: 0 })).toBe(PLATE_PROTOTYPE);
    expect(floorPlate({ col: east, row: south + 1, level: 0 })).toBe(PLATE_PROTOTYPE);
    expect(floorPlate({ col: KITCHEN.x - 1, row: KITCHEN.z, level: 0 })).toBe(PLATE_PROTOTYPE);
  });

  it('legt auf das Obergeschoss Stein', () => {
    expect(floorPlate({ col: DECK.x, row: DECK.z, level: 1 })).toBe(PLATE_STONE);
    expect(floorPlate({ col: PODIUM.x, row: PODIUM.z, level: 1 })).toBe(PLATE_STONE);
    // Dieselbe Kachel eine Etage tiefer ist Gelände: Unter dem Podest läuft
    // man durch, und dort liegt kein Stein.
    expect(floorPlate({ col: DECK.x, row: DECK.z, level: 0 })).toBe(PLATE_PROTOTYPE);
  });

  it('legt auch draußen vor dem Gelände den Prototyp-Boden', () => {
    expect(floorPlate({ col: FIELD.x - 40, row: FIELD.z - 40, level: 0 })).toBe(PLATE_PROTOTYPE);
    expect(floorPlate({ col: FIELD.x + FIELD.w + 40, row: 0, level: 0 })).toBe(PLATE_PROTOTYPE);
  });
});

describe('der Plattenboden der Testwelt', () => {
  const spots = floorPlateSpots(testPlan().solids(), floorPlate);

  /**
   * **Die Zahl, die das Bild bezahlt.** Das Gelände ist 77 × 105 Kacheln
   * (`FIELD`, 8 085), davon gehören 20 × 11 der Küche (`KITCHEN`, 220) — macht
   * 7 865 Platten aus `prototype-bits/Floor_Prototype.glb` zu je 20 Dreiecken,
   * also rund 157 000 Dreiecke in **einem** Zeichenaufruf. Dazu 25 Steinplatten
   * auf dem Deck (`podium.DECK`, 5 × 5) zu je 66 Dreiecken in einem zweiten.
   *
   * Die begehbaren Kacheln (1 090 auf Ebene 0) stehen **nicht** zusätzlich
   * darin: Sie liegen auf derselben Kachel wie die Masse darunter, und dort
   * gehört genau eine Platte hin (`shared/plateField.floorPlateSpots`).
   */
  it('kostet 7 865 Prototyp- und 25 Steinplatten', () => {
    const prototype = spots.filter((one) => one.model === PLATE_PROTOTYPE);
    const stone = spots.filter((one) => one.model === PLATE_STONE);
    expect(prototype).toHaveLength(FIELD.w * FIELD.d - KITCHEN.w * KITCHEN.d);
    expect(prototype).toHaveLength(7865);
    expect(stone).toHaveLength(DECK.w * DECK.d);
    expect(spots).toHaveLength(7890);
  });

  it('legt auf keine Kachel zwei Platten', () => {
    const seen = new Set(spots.map((one) => `${one.x}|${one.y}|${one.z}`));
    expect(seen.size).toBe(spots.length);
  });

  it('lässt in der Küche wirklich nichts liegen', () => {
    for (const spot of spots) {
      const inX = spot.x > KITCHEN.x && spot.x < KITCHEN.x + KITCHEN.w;
      const inZ = spot.z > KITCHEN.z && spot.z < KITCHEN.z + KITCHEN.d;
      expect(inX && inZ).toBe(false);
    }
  });

  it('legt den Stein auf die Höhe des Decks und nicht auf das Gelände', () => {
    for (const spot of spots.filter((one) => one.model === PLATE_STONE)) {
      expect(spot.y).toBeCloseTo(2.8, 9);
    }
  });
});
