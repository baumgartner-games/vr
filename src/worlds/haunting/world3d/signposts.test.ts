import { TILE, dirX, dirZ } from '../../nav/navTile';
import { APRON, generateHouse, spacesOf, type HouseSpec, type Rect } from '../house';
import { roomsOf } from '../map/extract';
import { COMMAND } from '../roomGraph';
import {
  DETAIL_LIMIT,
  DOOR_SIGN_WIDTH,
  JUNCTION_SIGN_WIDTH,
  SIGN_CLEARANCE,
  openingsOf,
  wayfindingSigns,
} from './signposts';

/** Die feste Station mit Gängen — und der alte Zufallsgrundriss ohne. */
const SPECS: Array<[string, HouseSpec]> = [
  ['Station', generateHouse(7, 14)],
  ['Station, anderer Samen', generateHouse(4242, 14)],
  ['Altes Haus', generateHouse(7)],
];

function rectOf(spec: HouseSpec, id: string): Rect {
  if (id === COMMAND) return APRON;
  return spacesOf(spec).find((space) => space.id === id)!.rect;
}

describe.each(SPECS)('Wegweiser im Grundriss „%s"', (_name, spec) => {
  const signs = wayfindingSigns(spec);
  const names = new Map(roomsOf(spec, []).map((room) => [room.id, room.name]));

  test('jede Öffnung bekommt genau zwei Schilder, eines je Seite', () => {
    for (const opening of openingsOf(spec)) {
      const mine = signs.filter((sign) => sign.openingId === opening.id);
      expect(mine.map((sign) => sign.spaceId).sort()).toEqual([opening.a, opening.b].sort());
      for (const sign of mine)
        expect(sign.targetId).toBe(sign.spaceId === opening.a ? opening.b : opening.a);
    }
    expect(signs).toHaveLength(openingsOf(spec).length * 2);
  });

  test('die Schrift ist der Name, den die 2D-Karte für denselben Raum malt', () => {
    for (const sign of signs) {
      expect(sign.title).toBe(names.get(sign.targetId)!.toUpperCase());
      expect(sign.title.length).toBeGreaterThan(0);
    }
    // Die Zentrale heißt auf beiden Bildern gleich.
    const home = signs.find((sign) => sign.targetId === COMMAND);
    expect(home?.title).toBe(names.get(COMMAND)!.toUpperCase());
    expect(home?.spaceId).toBe(spec.entryRoom);
  });

  test('ein Schild hängt im eigenen Raum, eine Handbreit vor der Wand zur Öffnung', () => {
    for (const sign of signs) {
      const rect = rectOf(spec, sign.spaceId);
      expect(sign.x).toBeGreaterThan(rect.x * TILE);
      expect(sign.x).toBeLessThan((rect.x + rect.w) * TILE);
      expect(sign.z).toBeGreaterThan(rect.z * TILE);
      expect(sign.z).toBeLessThan((rect.z + rect.d) * TILE);
      // Zurück an die Wand gerechnet liegt die Mitte genau auf der Raumkante.
      const wallX = sign.x + dirX(sign.dir) * SIGN_CLEARANCE;
      const wallZ = sign.z + dirZ(sign.dir) * SIGN_CLEARANCE;
      const edges = [
        rect.x * TILE,
        (rect.x + rect.w) * TILE,
        rect.z * TILE,
        (rect.z + rect.d) * TILE,
      ];
      const onEdge = dirX(sign.dir) === 0 ? wallZ : wallX;
      expect(edges.some((edge) => Math.abs(edge - onEdge) < 1e-6)).toBe(true);
      // Und das Schild passt zwischen die Raumecken.
      const along = dirX(sign.dir) === 0 ? sign.x : sign.z;
      const from = dirX(sign.dir) === 0 ? rect.x * TILE : rect.z * TILE;
      const to = dirX(sign.dir) === 0 ? (rect.x + rect.w) * TILE : (rect.z + rect.d) * TILE;
      expect(along - sign.width / 2).toBeGreaterThanOrEqual(from);
      expect(along + sign.width / 2).toBeLessThanOrEqual(to);
    }
  });

  test('zwei Schilder desselben Raums überlappen sich nie', () => {
    for (const a of signs)
      for (const b of signs) {
        if (a === b || a.spaceId !== b.spaceId || a.dir !== b.dir) continue;
        const sameWall =
          dirX(a.dir) === 0 ? Math.abs(a.z - b.z) < 1e-6 : Math.abs(a.x - b.x) < 1e-6;
        if (!sameWall) continue;
        const gap = dirX(a.dir) === 0 ? Math.abs(a.x - b.x) : Math.abs(a.z - b.z);
        expect(gap).toBeGreaterThanOrEqual((a.width + b.width) / 2);
      }
  });

  test('unter einem Gang steht, wohin er führt — ohne den Raum, in dem man steht', () => {
    const spaces = new Map(spacesOf(spec).map((space) => [space.id, space]));
    const openings = openingsOf(spec);
    for (const sign of signs) {
      const target = spaces.get(sign.targetId);
      if (!target?.circulation) {
        expect(sign.detail).toBe('');
        continue;
      }
      const onward = openings
        .filter((opening) => opening.a === sign.targetId || opening.b === sign.targetId)
        .map((opening) => (opening.a === sign.targetId ? opening.b : opening.a))
        .filter((id) => id !== sign.spaceId);
      const listed = sign.detail.split(' · ').filter((entry) => entry && !entry.startsWith('+'));
      expect(listed.length).toBeLessThanOrEqual(DETAIL_LIMIT);
      expect(listed.length).toBe(Math.min(DETAIL_LIMIT, new Set(onward).size));
      for (const entry of listed) {
        const id = [...names].find(([, name]) => name === entry)?.[0];
        expect(id).toBeDefined();
        expect(onward).toContain(id);
      }
      expect(listed).not.toContain(names.get(sign.spaceId));
    }
  });

  test('Kreuzungen zweier Gänge tragen ein breites Schild statt eines je Kachel', () => {
    for (const opening of openingsOf(spec)) {
      const mine = signs.filter((sign) => sign.openingId === opening.id);
      for (const sign of mine) {
        if (opening.junction) {
          expect(opening.edges.length).toBeGreaterThanOrEqual(1);
          expect(sign.width).toBeLessThanOrEqual(JUNCTION_SIGN_WIDTH);
          expect(sign.width).toBeGreaterThanOrEqual(DOOR_SIGN_WIDTH);
          expect(sign.circulation).toBe(true);
        } else expect(sign.width).toBe(DOOR_SIGN_WIDTH);
      }
    }
  });
});

test('auf der Station fallen alle Türen zwischen zwei Gängen zu Kreuzungen zusammen', () => {
  const spec = generateHouse(7, 14);
  const halls = new Set(
    spacesOf(spec)
      .filter((space) => space.circulation)
      .map((s) => s.id),
  );
  const hallDoors = spec.doors.filter((door) => halls.has(door.a) && halls.has(door.b ?? ''));
  const junctions = openingsOf(spec).filter((opening) => opening.junction);
  expect(hallDoors.length).toBeGreaterThan(junctions.length);
  expect(junctions.reduce((sum, opening) => sum + opening.edges.length, 0)).toBe(hallDoors.length);
  // Kein Gang trägt eine Kreuzung doppelt.
  const keys = junctions.map((opening) => opening.id);
  expect(new Set(keys).size).toBe(keys.length);
});
