import {
  KITCHEN_PIECE_LIFT,
  PLATE_PROTOTYPE,
  PLATE_STONE,
  floorPieceLift,
  floorPlate,
  underKitchenFloor,
} from './floorPlate';
import { KITCHEN_FLOOR } from './zones/kitchenPlan';
import { KITCHEN_CHECKER_LIFT } from './zones/kitchenFloor';
import { floorPlateSpots } from '../shared/plateField';
import { FIELD, KITCHEN, PODIUM } from './layout';
import { DECK } from './zones/podium';
import { SPIKES } from './zones/navigation';
import { PIT_BOXES, PIT_LANE } from '../kart/kartCourse';
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

  it('legt unter Stachelfeld und Boxengasse keinen zweiten Boden', () => {
    // Gemeldet als Z-Fighting: Die rote Falle und der Asphalt **sind** dort
    // der Boden, und eine Prototyp-Platte darunter flimmerte durch.
    for (const rect of [SPIKES, PIT_LANE, PIT_BOXES]) {
      expect(floorPlate({ col: rect.x, row: rect.z, level: 0 })).toBeNull();
      expect(
        floorPlate({ col: rect.x + rect.w - 1, row: rect.z + rect.d - 1, level: 0 }),
      ).toBeNull();
    }
    // Gleich daneben ist wieder Gelände.
    expect(floorPlate({ col: SPIKES.x - 1, row: SPIKES.z, level: 0 })).toBe(PLATE_PROTOTYPE);
    expect(floorPlate({ col: SPIKES.x + SPIKES.w, row: SPIKES.z, level: 0 })).toBe(PLATE_PROTOTYPE);
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
   * (`FIELD`, 8 085), davon gehören 20 × 11 der Küche (`KITCHEN`, 220), 3 × 3
   * dem Stachelfeld (`SPIKES`, 9) und 3 × 10 + 2 × 5 der Boxengasse
   * (`PIT_LANE`, `PIT_BOXES`, 40) — macht 7 816 Platten aus `prototype-bits/Floor_Prototype.glb` zu je 20 Dreiecken,
   * also rund 157 000 Dreiecke in **einem** Zeichenaufruf. Dazu 25 Steinplatten
   * auf dem Deck (`podium.DECK`, 5 × 5) zu je 66 Dreiecken in einem zweiten.
   *
   * Die begehbaren Kacheln (1 090 auf Ebene 0) stehen **nicht** zusätzlich
   * darin: Sie liegen auf derselben Kachel wie die Masse darunter, und dort
   * gehört genau eine Platte hin (`shared/plateField.floorPlateSpots`).
   */
  it('kostet 7 816 Prototyp- und 25 Steinplatten', () => {
    const prototype = spots.filter((one) => one.model === PLATE_PROTOTYPE);
    const stone = spots.filter((one) => one.model === PLATE_STONE);
    const own = [KITCHEN, SPIKES, PIT_LANE, PIT_BOXES].reduce((sum, r) => sum + r.w * r.d, 0);
    expect(prototype).toHaveLength(FIELD.w * FIELD.d - own);
    expect(prototype).toHaveLength(7816);
    expect(stone).toHaveLength(DECK.w * DECK.d);
    expect(spots).toHaveLength(7841);
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

describe('Bodenstücke aus dem Regal in der Küche', () => {
  it('liegen über dem Belag und draußen bündig auf null', () => {
    expect(KITCHEN_PIECE_LIFT).toBeGreaterThan(KITCHEN_CHECKER_LIFT);
    expect(KITCHEN_PIECE_LIFT).toBeLessThan(0.01);
    const inside = { x: KITCHEN.x + 0.5, z: KITCHEN.z + 0.5 };
    expect(floorPieceLift([inside])).toBe(KITCHEN_PIECE_LIFT);
    expect(floorPieceLift([{ x: KITCHEN.x - 0.5, z: KITCHEN.z + 0.5 }])).toBe(0);
  });
});

describe('unter dem Belag der Küche', () => {
  const solids = testPlan().solids();
  const hidden = solids.filter((solid) => underKitchenFloor(solid, KITCHEN_FLOOR));

  it('verschwinden der Estrich und die Bodenkacheln der Küche', () => {
    expect(hidden.some((solid) => solid.kind === 'stone')).toBe(true);
    expect(hidden.filter((solid) => solid.kind === 'floor')).toHaveLength(KITCHEN.w * KITCHEN.d);
  });

  it('und nichts, was über die Küche hinausreicht oder über ihrem Boden steht', () => {
    for (const solid of hidden) {
      expect(solid.x - solid.w / 2).toBeGreaterThanOrEqual(KITCHEN.x - 1e-6);
      expect(solid.x + solid.w / 2).toBeLessThanOrEqual(KITCHEN.x + KITCHEN.w + 1e-6);
      expect(solid.y + solid.h / 2).toBeCloseTo(KITCHEN_FLOOR, 6);
    }
    const field = solids.find((solid) => solid.kind === 'floor' && solid.w === FIELD.w);
    expect(field && underKitchenFloor(field, KITCHEN_FLOOR)).toBe(false);
  });

  it('auch den Estrich eines alten gespeicherten Umbaus — zwei Zentimeter höher', () => {
    const stone = solids.find((solid) => solid.kind === 'stone' && hidden.includes(solid))!;
    const old = { ...stone, y: stone.y + 0.02 };
    expect(underKitchenFloor(old, KITCHEN_FLOOR)).toBe(true);
    // Eine Stufe von zehn Zentimetern ist dagegen etwas, das dasteht.
    expect(underKitchenFloor({ ...stone, y: stone.y + 0.1 }, KITCHEN_FLOOR)).toBe(false);
  });
});
