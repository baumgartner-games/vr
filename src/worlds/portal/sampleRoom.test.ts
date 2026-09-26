import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { SAMPLE_ROOMS } from './sampleRoom';
import { FLOOR_STYLES, WALL_STYLES } from './surfaceDecor';

/**
 * **Die Vorlagen** (`sampleRoom.SAMPLE_ROOMS`): Jede hat einen eigenen
 * Namen, jedes Stück liegt wirklich im Regal, jedes Muster gibt es, und alles
 * steht im Startzimmer (acht mal acht Kacheln um die Mitte).
 */
describe('Vorlagen', () => {
  it('mindestens zwei, jede mit eigener Id und eigenem Namen', () => {
    expect(SAMPLE_ROOMS.length).toBeGreaterThanOrEqual(2);
    expect(new Set(SAMPLE_ROOMS.map((room) => room.id)).size).toBe(SAMPLE_ROOMS.length);
    expect(new Set(SAMPLE_ROOMS.map((room) => room.label)).size).toBe(SAMPLE_ROOMS.length);
  });

  it.each(SAMPLE_ROOMS.map((room) => [room.label, room] as const))(
    '%s: nur Stücke aus dem Regal, nur Muster, die es gibt, alles im Zimmer',
    (_label, room) => {
      expect(room.items.length).toBeGreaterThan(0);
      for (const item of room.items) {
        const file = resolve('public/models/kaykit', item.path);
        expect({ path: item.path, exists: existsSync(file) }).toEqual({
          path: item.path,
          exists: true,
        });
        expect(Math.abs(item.x)).toBeLessThan(4);
        expect(Math.abs(item.z)).toBeLessThan(4);
      }
      for (const surface of room.surfaces) {
        const list = surface.tool === 'floor' ? FLOOR_STYLES : WALL_STYLES;
        expect(list[surface.style]).toBeDefined();
      }
      // Genau ein Boden: Zwei hießen, dass der zweite den ersten wieder abräumt.
      expect(room.surfaces.filter((surface) => surface.tool === 'floor')).toHaveLength(1);
    },
  );
});
