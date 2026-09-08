import * as THREE from 'three';
import { PLAN_DOOR_H, PLAN_DOOR_W, PLAN_WALL_H } from '../editor/levelPlan';
import { TILE, dirX, dirZ } from '../nav/navTile';
import { APRON, generateHouse } from './house';
import { buildShip } from './shipArt';

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

beforeAll(() => {
  // Geometry tests do not render labels. Only their canvas allocation is stubbed.
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => ({ getContext: () => ({ fillRect: () => {}, fillText: () => {} }) }),
    },
  });
});

afterAll(() => {
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
  else Reflect.deleteProperty(globalThis, 'document');
});

function boxesIn(group: THREE.Object3D): THREE.Box3[] {
  const boxes: THREE.Box3[] = [];
  const matrix = new THREE.Matrix4();
  group.traverse((object) => {
    if (!(object instanceof THREE.InstancedMesh) || object.geometry.type !== 'BoxGeometry') return;
    for (let i = 0; i < object.count; i++) {
      object.getMatrixAt(i, matrix);
      boxes.push(
        new THREE.Box3(
          new THREE.Vector3(-0.5, -0.5, -0.5),
          new THREE.Vector3(0.5, 0.5, 0.5),
        ).applyMatrix4(matrix),
      );
    }
  });
  return boxes;
}

describe('station hull geometry', () => {
  test.each([6, 8, 10, 12])(
    '%i rooms keep all fixtures and hull details inside their own rooms',
    (count) => {
      const spec = generateHouse(410 + count, count);
      const ship = buildShip(spec);
      for (const room of spec.rooms) {
        const interior = ship.getObjectByName(`station-room-${room.id}`)!;
        const bounds = new THREE.Box3().setFromObject(interior);
        expect(bounds.min.x).toBeGreaterThanOrEqual(room.rect.x * TILE - 0.001);
        expect(bounds.max.x).toBeLessThanOrEqual((room.rect.x + room.rect.w) * TILE + 0.001);
        expect(bounds.min.z).toBeGreaterThanOrEqual(room.rect.z * TILE - 0.001);
        expect(bounds.max.z).toBeLessThanOrEqual((room.rect.z + room.rect.d) * TILE + 0.001);
        expect(bounds.min.y).toBeGreaterThanOrEqual(-0.001);
        expect(bounds.max.y).toBeLessThanOrEqual(PLAN_WALL_H + 0.001);
        let draws = 0;
        interior.traverse((object) => {
          expect(object).not.toBeInstanceOf(THREE.Light);
          if (!(object instanceof THREE.Mesh)) return;
          expect(object.frustumCulled).toBe(true);
          draws++;
        });
        expect(draws).toBeLessThanOrEqual(16);
      }
      const command = new THREE.Box3().setFromObject(ship.getObjectByName('station-command-hull')!);
      expect(command.min.x).toBeGreaterThanOrEqual(APRON.x * TILE);
      expect(command.max.x).toBeLessThanOrEqual((APRON.x + APRON.w) * TILE);
      expect(command.min.z).toBeGreaterThanOrEqual(APRON.z * TILE);
      expect(command.max.z).toBeLessThanOrEqual((APRON.z + APRON.d) * TILE);
    },
  );

  test('wall decoration leaves every real door opening clear', () => {
    const spec = generateHouse(83, 12);
    const ship = buildShip(spec);
    for (const door of spec.doors) {
      const x = (door.x + 0.5 + dirX(door.dir) / 2) * TILE;
      const z = (door.z + 0.5 + dirZ(door.dir) / 2) * TILE;
      const alongX = dirX(door.dir) === 0;
      const half = PLAN_DOOR_W / 2 - 0.015;
      const passage = new THREE.Box3(
        new THREE.Vector3(x - (alongX ? half : 0.31), 0.08, z - (alongX ? 0.31 : half)),
        new THREE.Vector3(
          x + (alongX ? half : 0.31),
          PLAN_DOOR_H - 0.01,
          z + (alongX ? 0.31 : half),
        ),
      );
      for (const roomId of [door.a, door.b]) {
        const interior = ship.getObjectByName(`station-room-${roomId}`);
        if (!interior) continue;
        for (const box of boxesIn(interior)) expect(box.intersectsBox(passage)).toBe(false);
      }
    }
  });
});
