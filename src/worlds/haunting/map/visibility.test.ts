import { emptySnapshot, type MapEntity, type MapSnapshot } from './mapSnapshot';
import { computeVisibility, litPolygon, SELF_RADIUS } from './visibility';

/** Zwei Zimmer nebeneinander, eine Tür in der Mitte der gemeinsamen Wand. */
function twoRooms(): MapSnapshot {
  const s = emptySnapshot();
  const room = (id: string, x0: number, x1: number) => ({
    id,
    name: id,
    polygon: [
      { x: x0, z: 0 },
      { x: x0, z: 10 },
      { x: x1, z: 10 },
      { x: x1, z: 0 },
    ],
    centre: { x: (x0 + x1) / 2, z: 5 },
    circulation: false,
    lit: false,
    safe: false,
  });
  s.rooms = [room('a', 0, 10), room('b', 10, 20)];
  s.walls = [
    { a: { x: 0, z: 0 }, b: { x: 20, z: 0 }, kind: 'wall' },
    { a: { x: 0, z: 10 }, b: { x: 20, z: 10 }, kind: 'wall' },
    { a: { x: 0, z: 0 }, b: { x: 0, z: 10 }, kind: 'wall' },
    { a: { x: 20, z: 0 }, b: { x: 20, z: 10 }, kind: 'wall' },
    { a: { x: 10, z: 0 }, b: { x: 10, z: 4 }, kind: 'wall' },
    { a: { x: 10, z: 6 }, b: { x: 10, z: 10 }, kind: 'wall' },
  ];
  s.doors = [
    {
      id: 'd',
      a: 'a',
      b: 'b',
      at: { x: 10, z: 5 },
      axis: 'z',
      width: 2,
      open: true,
      locked: false,
      material: 'wood',
    },
  ];
  s.bounds = { minX: 0, minZ: 0, maxX: 20, maxZ: 10 };
  return s;
}

function entity(id: string, kind: MapEntity['kind'], x: number, z: number, yaw = 0): MapEntity {
  return {
    id,
    kind,
    label: id,
    at: { x, z },
    yaw,
    roomId: '',
    concealed: false,
    moving: false,
    sprinting: false,
    held: '',
    sense: { fov: Math.PI * 0.7, range: 15, hearing: 12 },
  };
}

describe('Lichtfläche', () => {
  it('bleibt im Zimmer, geht aber durch die Tür', () => {
    const s = twoRooms();
    const polygon = litPolygon(s, { x: 5, z: 5 }, 30);
    for (const p of polygon) {
      expect(p.x).toBeGreaterThanOrEqual(-1e-6);
      expect(p.x).toBeLessThanOrEqual(20 + 1e-6);
      expect(p.z).toBeGreaterThanOrEqual(-1e-6);
      expect(p.z).toBeLessThanOrEqual(10 + 1e-6);
    }
    expect(polygon.some((p) => p.x > 10.5)).toBe(true);
  });

  it('hält an einer geschlossenen Tür', () => {
    const s = twoRooms();
    s.doors[0]!.open = false;
    const polygon = litPolygon(s, { x: 5, z: 5 }, 30);
    expect(polygon.every((p) => p.x <= 10 + 1e-6)).toBe(true);
  });
});

describe('Realitätsnah', () => {
  it('zeigt das Monster im Dunkeln nicht, im Licht schon, hinter der Wand nie', () => {
    const s = twoRooms();
    // Spieler schaut nach Osten (yaw -π/2 → +x).
    s.entities = [entity('p', 'player', 3, 5, -Math.PI / 2), entity('m', 'monster', 8, 5)];
    const dark = computeVisibility({ snapshot: s, mode: 'realistic', viewerId: 'p' });
    expect(dark.visibleEntities).toEqual(['p']);
    expect(dark.self?.radius).toBe(SELF_RADIUS);
    expect(dark.noise).toEqual([]);
    expect(dark.cones.map((c) => c.entityId)).toEqual(['p']);

    s.lights = [{ id: 'l', roomId: 'a', at: { x: 5, z: 5 }, on: true, radius: 8, kind: 'lamp' }];
    const lit = computeVisibility({ snapshot: s, mode: 'realistic', viewerId: 'p' });
    expect(lit.visibleEntities).toEqual(['p', 'm']);
    expect(lit.litRooms).toContain('a');

    // Dasselbe Licht, aber das Monster hinter der Wand im Nachbarzimmer.
    s.entities[1]!.at = { x: 12, z: 1 };
    const wall = computeVisibility({ snapshot: s, mode: 'realistic', viewerId: 'p' });
    expect(wall.visibleEntities).toEqual(['p']);
  });

  it('sieht anderthalb Meter weit auch ohne jedes Licht', () => {
    const s = twoRooms();
    s.entities = [entity('p', 'player', 3, 5, Math.PI), entity('m', 'monster', 3, 4)];
    const field = computeVisibility({ snapshot: s, mode: 'realistic', viewerId: 'p' });
    expect(field.visibleEntities).toContain('m');
  });
});

describe('Alles sehen', () => {
  it('zeigt jeden, Kegel und Geräusch eingeschlossen', () => {
    const s = twoRooms();
    const p = entity('p', 'player', 3, 5);
    p.moving = true;
    p.sprinting = true;
    s.entities = [p, entity('m', 'monster', 18, 5)];
    const field = computeVisibility({ snapshot: s, mode: 'omniscient', viewerId: 'p' });
    expect(field.visibleEntities).toEqual(['p', 'm']);
    expect(field.cones.map((c) => c.entityId).sort()).toEqual(['m', 'p']);
    expect(field.noise.map((n) => n.cause).sort()).toEqual(['monster', 'sprint']);
  });
});
