import { PLAN_DOOR_W, PLAN_WALL_T } from '../editor/levelPlan';
import { TILE, dirX, dirZ } from '../nav/navTile';
import { FIXTURE_CATALOG } from './fixtureDimensions';
import { generateHouse, type HouseRoom } from './house';
import { repairsFor, ROOM_COUNTS, ventPairs } from './mission';
import {
  safeRoomSpawn,
  stationLayout,
  type FloorPoint,
  type StationPlacement,
} from './stationLayout';

function distanceToFootprint(p: FloorPoint, module: StationPlacement): number {
  const dx = Math.max(module.bounds.minX - p.x, 0, p.x - module.bounds.maxX);
  const dz = Math.max(module.bounds.minZ - p.z, 0, p.z - module.bounds.maxZ);
  return Math.hypot(dx, dz);
}

function checkWalkingLine(
  a: FloorPoint,
  b: FloorPoint,
  modules: readonly StationPlacement[],
): void {
  const steps = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 0.12);
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    const p = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    for (const module of modules) {
      if (distanceToFootprint(p, module) < 0.45 - 1e-6)
        throw new Error(`Walking path obstructed by ${module.id} at ${p.x}, ${p.z}`);
    }
  }
}

function checkInside(room: HouseRoom, p: StationPlacement): void {
  const inset = PLAN_WALL_T / 2 + 0.22;
  expect(p.bounds.minX).toBeGreaterThanOrEqual(room.rect.x * TILE + inset - 1e-6);
  expect(p.bounds.maxX).toBeLessThanOrEqual((room.rect.x + room.rect.w) * TILE - inset + 1e-6);
  expect(p.bounds.minZ).toBeGreaterThanOrEqual(room.rect.z * TILE + inset - 1e-6);
  expect(p.bounds.maxZ).toBeLessThanOrEqual((room.rect.z + room.rect.d) * TILE - inset + 1e-6);
  const rotated = Math.abs(Math.sin(p.yaw)) > 0.5;
  expect(p.bounds.maxX - p.bounds.minX).toBeCloseTo(rotated ? p.depth : p.width);
  expect(p.bounds.maxZ - p.bounds.minZ).toBeCloseTo(rotated ? p.width : p.depth);
  expect(p.approach.x - p.x).toBeCloseTo(Math.sin(p.yaw) * (p.depth / 2 + 0.58));
  expect(p.approach.z - p.z).toBeCloseTo(Math.cos(p.yaw) * (p.depth / 2 + 0.58));
}

describe('station module placement', () => {
  test.each(ROOM_COUNTS)(
    '%i rooms: modules, doors, controls and teleport floor stay separated',
    (count) => {
      for (let seed = 1; seed <= 100; seed++) {
        const spec = generateHouse(seed, count),
          layout = stationLayout(spec);
        expect(stationLayout(spec)).toBe(layout);
        expect(new Set(layout.map((p) => p.id)).size).toBe(layout.length);
        expect(
          layout
            .filter((p) => p.kind === 'console')
            .map((p) => p.repairId)
            .sort(),
        ).toEqual(
          repairsFor(spec)
            .map((r) => r.id)
            .sort(),
        );
        for (const room of spec.rooms) {
          const modules = layout.filter((p) => p.roomId === room.id),
            spawn = safeRoomSpawn(spec, room.id);
          expect(modules.filter((p) => p.kind === 'cargo')).toHaveLength(1);
          expect(modules.filter((p) => p.kind === 'locker')).toHaveLength(1);
          const fixture = modules.find((p) => p.kind === 'fixture' && p.markId === room.signature)!;
          expect(fixture).toBeDefined();
          expect(fixture.width).toBe(FIXTURE_CATALOG[room.signature].width);
          checkWalkingLine(spawn, spawn, modules);
          for (const vent of ventPairs(spec).filter((v) => v.a === room.id || v.b === room.id)) {
            const sign = vent.a === room.id ? -1 : 1;
            const exit = {
              x: vent.x * TILE + (vent.dir === 1 ? (sign * TILE) / 2 : 0),
              z: vent.z * TILE + (vent.dir === 2 ? (sign * TILE) / 2 : 0),
            };
            checkWalkingLine(exit, spawn, modules);
          }
          for (const p of modules) {
            checkInside(room, p);
            checkWalkingLine(
              spawn,
              p.approach,
              modules.filter((other) => other !== p),
            );
            expect(distanceToFootprint(p.approach, p)).toBeGreaterThanOrEqual(0.45);
            for (const other of modules)
              if (other !== p) {
                const xGap = Math.max(
                  p.bounds.minX - other.bounds.maxX,
                  other.bounds.minX - p.bounds.maxX,
                );
                const zGap = Math.max(
                  p.bounds.minZ - other.bounds.maxZ,
                  other.bounds.minZ - p.bounds.maxZ,
                );
                expect(Math.max(xGap, zGap)).toBeGreaterThanOrEqual(0.12 - 1e-6);
              }
          }
          for (const door of spec.doors.filter((d) => d.a === room.id || d.b === room.id)) {
            const dx = dirX(door.dir),
              dz = dirZ(door.dir);
            const p = { x: (door.x + 0.5 + dx * 0.5) * TILE, z: (door.z + 0.5 + dz * 0.5) * TILE };
            checkWalkingLine(p, spawn, modules);
            // Sweep the full opening, padded for shoulders, 1.15 m into EACH room.
            const sign = door.a === room.id ? -1 : 1;
            for (const offset of [-PLAN_DOOR_W / 2, 0, PLAN_DOOR_W / 2]) {
              const edge = { x: p.x + dz * offset, z: p.z + dx * offset };
              checkWalkingLine(
                edge,
                { x: edge.x + dx * sign * 0.7, z: edge.z + dz * sign * 0.7 },
                modules,
              );
            }
          }
        }
      }
    },
  );

  test('equivalent seeds create the same positions without mutating the shared specification', () => {
    const spec = generateHouse(87832, 12),
      before = JSON.stringify(spec);
    expect(stationLayout(spec)).toEqual(stationLayout(generateHouse(87832, 12)));
    expect(JSON.stringify(spec)).toBe(before);
    expect(() => safeRoomSpawn(spec, 'missing-room')).toThrow('Unknown station room');
  });
});
