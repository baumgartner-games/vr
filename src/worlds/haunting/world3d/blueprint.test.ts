import { generateHouse } from '../house';
import { BLUEPRINT, blueprintArea, blueprintPoint } from './blueprint';

/**
 * Die Räume der Vorlage als Pixelrechteck (links, oben, rechts, unten) —
 * gemessen an den Füllflächen der Zeichnung, ohne die Wandlinien.
 */
const TRACED: Record<string, readonly [number, number, number, number]> = {
  Cafeteria: [580, 32, 914, 372],
  Weapons: [978, 104, 1114, 262],
  'Upper Engine': [180, 126, 322, 284],
  MedBay: [432, 244, 612, 412],
  Reactor: [62, 266, 192, 510],
  O2: [888, 286, 998, 392],
  Security: [330, 298, 408, 458],
  Navigation: [1232, 298, 1338, 438],
  Admin: [826, 414, 974, 550],
  Electrical: [458, 448, 610, 616],
  Storage: [614, 490, 794, 768],
  'Lower Engine': [180, 502, 322, 660],
  Shields: [978, 530, 1116, 690],
  Communications: [812, 652, 962, 768],
};

describe('Die Grundriss-Vorlage am Boden', () => {
  const spec = generateHouse(1, 14);

  it('legt die Cafeteria-Mitte auf x = 0, 24 Pixel je Meter', () => {
    expect(blueprintPoint(BLUEPRINT.anchor.px, BLUEPRINT.anchor.py)).toEqual({ x: 0, z: -55 });
    const area = blueprintArea();
    expect(area.w).toBeCloseTo(1400 / 24);
    expect(area.d).toBeCloseTo(800 / 24);
  });

  it('deckt jeden Raum der Station — die Mitte höchstens zweieinhalb Meter daneben', () => {
    // Zweieinhalb Meter, weil das Raster keine Schrägen kennt und ein Raum für
    // seine Pflichtmöbel rund sechs Meter braucht: Kleine Räume der Zeichnung
    // sind gebaut größer, große (die Cafeteria) kleiner (`house.stationRooms`).
    for (const room of spec.rooms) {
      const traced = TRACED[room.name];
      expect(traced).toBeDefined();
      const [left, top, right, bottom] = traced!;
      const a = blueprintPoint(left, top);
      const b = blueprintPoint(right, bottom);
      const cx = room.rect.x + room.rect.w / 2;
      const cz = room.rect.z + room.rect.d / 2;
      expect(Math.abs(cx - (a.x + b.x) / 2)).toBeLessThanOrEqual(2.5);
      expect(Math.abs(cz - (a.z + b.z) / 2)).toBeLessThanOrEqual(2.5);
      expect(Math.abs(room.rect.w - (b.x - a.x))).toBeLessThanOrEqual(4.5);
      expect(Math.abs(room.rect.d - (b.z - a.z))).toBeLessThanOrEqual(4.5);
    }
    expect(spec.rooms).toHaveLength(Object.keys(TRACED).length);
  });

  it('liegt über der Station — höchstens einen Meter ragt etwas hinaus', () => {
    const area = blueprintArea();
    for (const space of [...spec.rooms, ...(spec.passages ?? [])]) {
      expect(space.rect.x).toBeGreaterThanOrEqual(area.x - 1);
      expect(space.rect.z).toBeGreaterThanOrEqual(area.z - 1);
      expect(space.rect.x + space.rect.w).toBeLessThanOrEqual(area.x + area.w + 1);
      expect(space.rect.z + space.rect.d).toBeLessThanOrEqual(area.z + area.d + 1);
    }
  });
});
