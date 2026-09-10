import { PLAN_DOOR_W, PLAN_WALL_T } from '../editor/levelPlan';
import { TILE, dirX, dirZ } from '../nav/navTile';
import { FIXTURE_CATALOG } from './fixtureDimensions';
import { generateHouse, type HouseRoom } from './house';
import { repairsFor, ROOM_COUNTS } from './mission';
import { CARGO_PER_ROOM, taskCargo } from './rules/cargo';
import { VentNet } from './vents/ventGraph';
import {
  safeRoomSpawn,
  stationLayout,
  type FloorPoint,
  type StationPlacement,
} from './stationLayout';

// Keep tight geometry loops inside this VM instead of repeatedly resolving Jest's
// proxied Math global. All samples and the original matcher tolerances are retained.
const { abs, ceil, cos, hypot, max, sin } = Math;

function distanceToFootprint(p: FloorPoint, module: StationPlacement): number {
  const dx = max(module.bounds.minX - p.x, 0, p.x - module.bounds.maxX);
  const dz = max(module.bounds.minZ - p.z, 0, p.z - module.bounds.maxZ);
  return hypot(dx, dz);
}

function checkWalkingLine(
  a: FloorPoint,
  b: FloorPoint,
  modules: readonly StationPlacement[],
): void {
  const steps = ceil(hypot(a.x - b.x, a.z - b.z) / 0.12);
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
  if (
    !(p.bounds.minX >= room.rect.x * TILE + inset - 1e-6) ||
    !(p.bounds.maxX <= (room.rect.x + room.rect.w) * TILE - inset + 1e-6) ||
    !(p.bounds.minZ >= room.rect.z * TILE + inset - 1e-6) ||
    !(p.bounds.maxZ <= (room.rect.z + room.rect.d) * TILE - inset + 1e-6)
  ) {
    throw new Error(`${p.id} escapes room ${room.id}: ${JSON.stringify(p.bounds)}`);
  }
  const rotated = abs(sin(p.yaw)) > 0.5;
  // Jest's default toBeCloseTo precision is 2: abs(actual - expected) < 0.005.
  // Negated comparisons deliberately fail for NaN as well as incorrect values.
  if (
    !(abs(p.bounds.maxX - p.bounds.minX - (rotated ? p.depth : p.width)) < 0.005) ||
    !(abs(p.bounds.maxZ - p.bounds.minZ - (rotated ? p.width : p.depth)) < 0.005)
  ) {
    throw new Error(`${p.id} has incorrect rotated dimensions: ${JSON.stringify(p)}`);
  }
  if (
    !(abs(p.approach.x - p.x - sin(p.yaw) * (p.depth / 2 + 0.58)) < 0.005) ||
    !(abs(p.approach.z - p.z - cos(p.yaw) * (p.depth / 2 + 0.58)) < 0.005)
  ) {
    throw new Error(`${p.id} has an incorrectly offset control approach: ${JSON.stringify(p)}`);
  }
}

describe('station module placement', () => {
  test.each(ROOM_COUNTS)(
    '%i rooms: modules, doors, controls and teleport floor stay separated',
    (count) => {
      for (let seed = 1; seed <= 100; seed++) {
        try {
          const spec = generateHouse(seed, count),
            layout = stationLayout(spec),
            vents = new VentNet(spec);
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
            const lockers = modules.filter((p) => p.kind === 'locker').length;
            if (lockers !== 1)
              throw new Error(`Room ${room.id} needs exactly one locker; found ${lockers}`);
            // **Zwei bis drei Kisten je Raum** (`CARGO_PER_ROOM`): Erst mehr
            // Kisten als Inhalte machen aus dem Zugreifen ein Suchen. Zwei
            // sind Pflicht, die dritte fällt weg, wo der Grundriss sie nicht
            // trägt — mehr als drei darf es nie werden.
            const boxes = modules.filter((p) => p.kind === 'cargo');
            if (boxes.length < CARGO_PER_ROOM[0] || boxes.length > CARGO_PER_ROOM[1])
              throw new Error(`Room ${room.id} has ${boxes.length} cargo modules`);
            for (const box of boxes)
              if (!new RegExp(`^cargo-${room.id}-[1-9]\\d*$`).test(box.id))
                throw new Error(`Cargo id ${box.id} does not belong to room ${room.id}`);
            const fixture = modules.find(
              (p) => p.kind === 'fixture' && p.markId === room.signature,
            );
            if (!fixture) throw new Error(`Room ${room.id} is missing signature ${room.signature}`);
            if (fixture.width !== FIXTURE_CATALOG[room.signature].width)
              throw new Error(`Room ${room.id} signature ${fixture.id} has width ${fixture.width}`);
            checkWalkingLine(spawn, spawn, modules);
            // Vor jeder Klappe bleibt der Standplatz frei, und von dort führt
            // eine Gasse zur Raummitte — sonst käme das Monster nicht heraus.
            for (const flap of vents.inRoom(room.id)) {
              checkWalkingLine(flap.approach, spawn, modules);
              for (const p of modules)
                if (!(distanceToFootprint(flap.approach, p) >= 0.45))
                  throw new Error(`${p.id} steht vor der Klappe ${flap.id}`);
            }
            for (const p of modules) {
              checkInside(room, p);
              checkWalkingLine(
                spawn,
                p.approach,
                modules.filter((other) => other !== p),
              );
              const approachGap = distanceToFootprint(p.approach, p);
              if (!(approachGap >= 0.45))
                throw new Error(
                  `${p.id} control approach is only ${approachGap} m from its footprint`,
                );
              for (const other of modules)
                if (other !== p) {
                  const xGap = max(
                    p.bounds.minX - other.bounds.maxX,
                    other.bounds.minX - p.bounds.maxX,
                  );
                  const zGap = max(
                    p.bounds.minZ - other.bounds.maxZ,
                    other.bounds.minZ - p.bounds.maxZ,
                  );
                  const gap = max(xGap, zGap);
                  if (!(gap >= 0.12 - 1e-6))
                    throw new Error(`${p.id} and ${other.id} have only ${gap} m clearance`);
                }
            }
            for (const door of spec.doors.filter((d) => d.a === room.id || d.b === room.id)) {
              const dx = dirX(door.dir),
                dz = dirZ(door.dir);
              const p = {
                x: (door.x + 0.5 + dx * 0.5) * TILE,
                z: (door.z + 0.5 + dz * 0.5) * TILE,
              };
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
          // Die Aufgabenkiste steht in dem Raum, den `spec.tasks` nennt —
          // sonst schickt der Archivar den Techniker in den falschen.
          for (const task of spec.tasks) {
            const slot = taskCargo(spec, task.id);
            if (slot.roomId !== task.roomId)
              throw new Error(`Task ${task.id} sits in ${slot.roomId}, not in ${task.roomId}`);
            if (!layout.some((p) => p.id === slot.id && p.kind === 'cargo'))
              throw new Error(`Task cargo ${slot.id} is not placed`);
          }
        } catch (error) {
          throw new Error(`${count} rooms, seed ${seed}: ${String(error)}`);
        }
      }
    },
  );

  test('compact MedBay keeps varied equipment and a reachable treatment bed clear of walls', () => {
    const spec = generateHouse(42, 8);
    const room = spec.rooms.find((candidate) => candidate.kind === 'bad')!;
    const fixtures = stationLayout(spec).filter(
      (item) => item.roomId === room.id && item.kind === 'fixture',
    );
    expect(new Set(fixtures.map((item) => item.markId)).size).toBeGreaterThanOrEqual(3);
    const bed = fixtures.find((item) => item.markId === 'bett')!;
    expect(bed).toBeDefined();
    expect(
      Math.min(
        bed.bounds.minX - room.rect.x * TILE,
        (room.rect.x + room.rect.w) * TILE - bed.bounds.maxX,
        bed.bounds.minZ - room.rect.z * TILE,
        (room.rect.z + room.rect.d) * TILE - bed.bounds.maxZ,
      ),
    ).toBeGreaterThan(PLAN_WALL_T / 2 + 0.22 - 1e-6);
    checkWalkingLine(
      safeRoomSpawn(spec, room.id),
      bed.approach,
      stationLayout(spec).filter((item) => item.roomId === room.id && item !== bed),
    );
  });

  test('equivalent seeds create the same positions without mutating the shared specification', () => {
    const spec = generateHouse(87832, 12),
      before = JSON.stringify(spec);
    expect(stationLayout(spec)).toEqual(stationLayout(generateHouse(87832, 12)));
    expect(JSON.stringify(spec)).toBe(before);
    expect(() => safeRoomSpawn(spec, 'missing-room')).toThrow('Unknown station room');
  });
});
