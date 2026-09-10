import { emptySnapshot, type MapSnapshot } from './mapSnapshot';
import { NOISE_TILE, spreadNoise, tileGrid, tileKeyOf } from './noiseSpread';

/**
 * Die Welle läuft über den Boden und nicht über die Luftlinie. Was hier
 * geprüft wird, ist genau der Fehler, der auf der Karte zu sehen war: ein
 * Schritt, der durch die Wand und über den leeren Weltraum ging, weil nur
 * der Abstand zählte.
 */

/**
 * Zwei Zimmer von je 10 × 10 m nebeneinander, dazwischen eine Wand bei x = 10
 * mit einer Tür in der Mitte — und weit weg, ohne Verbindung, ein drittes.
 */
function station(): MapSnapshot {
  const s = emptySnapshot();
  s.seed = 7;
  s.bounds = { minX: 0, minZ: 0, maxX: 40, maxZ: 20 };
  const box = (id: string, x0: number, z0: number, x1: number, z1: number) => {
    s.rooms.push({
      id,
      name: id,
      polygon: [
        { x: x0, z: z0 },
        { x: x0, z: z1 },
        { x: x1, z: z1 },
        { x: x1, z: z0 },
      ],
      centre: { x: (x0 + x1) / 2, z: (z0 + z1) / 2 },
      circulation: false,
      lit: true,
      safe: false,
    });
  };
  box('west', 0, 0, 10, 10);
  box('east', 10, 0, 20, 10);
  box('fern', 30, 0, 40, 10);
  // Die Trennwand, an der Tür unterbrochen — so kommt sie auch aus `extract.ts`.
  s.walls.push(
    { a: { x: 10, z: 0 }, b: { x: 10, z: 4 }, kind: 'wall' },
    { a: { x: 10, z: 6 }, b: { x: 10, z: 10 }, kind: 'wall' },
    // Die Außenhülle, damit nichts in den Weltraum läuft.
    { a: { x: 0, z: 0 }, b: { x: 20, z: 0 }, kind: 'wall' },
    { a: { x: 0, z: 10 }, b: { x: 20, z: 10 }, kind: 'wall' },
    { a: { x: 0, z: 0 }, b: { x: 0, z: 10 }, kind: 'wall' },
    { a: { x: 20, z: 0 }, b: { x: 20, z: 10 }, kind: 'wall' },
  );
  s.doors.push({
    id: 'tuer',
    a: 'west',
    b: 'east',
    at: { x: 10, z: 5 },
    axis: 'z',
    width: 2,
    open: true,
    locked: false,
    material: 'metal',
  });
  return s;
}

const OPEN = new Set(['tuer']);
const SHUT = new Set<string>();

describe('Die Ausbreitung eines Geräuschs', () => {
  it('geht durch die offene Tür und nicht durch die Wand', () => {
    const s = station();
    const grid = tileGrid(s);
    const from = { x: 5, z: 1 };
    // Weit genug, dass die Luftlinie das Nachbarzimmer überall erreicht.
    const heard = spreadNoise(grid, from, 40, { open: OPEN });
    // Gleich hinter der Wand, aber weit weg von der Tür: nur über die Tür zu
    // erreichen, also spürbar weiter als die Luftlinie von 6 m.
    const behind = { x: 11, z: 1 };
    const direct = Math.hypot(behind.x - from.x, behind.z - from.z);
    const along = heard.get(tileKeyOf(behind))!;
    expect(along).toBeGreaterThan(direct + 3);
  });

  it('kommt gar nicht hinüber, wenn die Tür zu ist', () => {
    const s = station();
    const grid = tileGrid(s);
    const heard = spreadNoise(grid, { x: 5, z: 5 }, 40, { open: SHUT });
    for (const [key] of heard) {
      const [tx] = key.split(',').map(Number) as [number];
      expect(tx * NOISE_TILE).toBeLessThan(10);
    }
    // Im eigenen Zimmer hört man es überall.
    expect(heard.size).toBeGreaterThan(30);
  });

  it('springt nicht über den leeren Weltraum in ein Zimmer ohne Verbindung', () => {
    const s = station();
    const grid = tileGrid(s);
    const heard = spreadNoise(grid, { x: 5, z: 5 }, 60, { open: OPEN });
    expect(heard.has(tileKeyOf({ x: 35, z: 5 }))).toBe(false);
  });

  it('leitet für das Monster durch den Schacht — aber nur, wenn es danach fragt', () => {
    const s = station();
    // Zwei Klappen: eine im Westzimmer, eine im abgeschnittenen Zimmer.
    s.items.push(
      {
        id: 'vent-west',
        kind: 'vent',
        label: 'Klappe',
        roomId: 'west',
        at: { x: 1, z: 1 },
        state: '',
        interactive: true,
      },
      {
        id: 'vent-fern',
        kind: 'vent',
        label: 'Klappe',
        roomId: 'fern',
        at: { x: 35, z: 5 },
        state: '',
        interactive: true,
      },
    );
    s.ventLinks = [{ a: 'vent-west', b: 'vent-fern' }];
    const grid = tileGrid(s);
    const far = tileKeyOf({ x: 35, z: 5 });
    expect(spreadNoise(grid, { x: 5, z: 5 }, 90, { open: OPEN }).has(far)).toBe(false);
    expect(spreadNoise(grid, { x: 5, z: 5 }, 90, { open: OPEN, vents: true }).has(far)).toBe(true);
  });

  it('läuft um die Ecke und nicht durch sie hindurch', () => {
    const s = station();
    const grid = tileGrid(s);
    // Jede erreichte Kachel liegt mindestens so weit weg wie ihre Luftlinie —
    // ein kürzerer Weg als die Gerade wäre ein Loch in der Rechnung.
    const from = { x: 3, z: 3 };
    for (const [key, distance] of spreadNoise(grid, from, 40, { open: OPEN })) {
      const [tx, tz] = key.split(',').map(Number) as [number, number];
      const at = { x: (tx + 0.5) * NOISE_TILE, z: (tz + 0.5) * NOISE_TILE };
      expect(distance).toBeGreaterThanOrEqual(Math.hypot(at.x - from.x, at.z - from.z) - 1.9);
    }
  });
});
