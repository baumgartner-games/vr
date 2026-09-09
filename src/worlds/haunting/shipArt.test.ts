import * as THREE from 'three';
import { PLAN_DOOR_H, PLAN_DOOR_W, PLAN_WALL_H, PLAN_WALL_T } from '../editor/levelPlan';
import { TILE, dirX, dirZ } from '../nav/navTile';
import { APRON, generateHouse, spacesOf } from './house';
import { animateCreature, buildCrewmate, buildShip, closedTileX } from './shipArt';

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

test('the simulation technician has its own friendly suit, visor and animated limbs', () => {
  const crew = buildCrewmate();
  expect(crew.userData.actorRole).toBe('crew');
  expect(crew.getObjectByName('crew-helmet')).toBeDefined();
  expect(crew.getObjectByName('crew-visor')).toBeDefined();
  expect(crew.getObjectByName('crew-backpack')).toBeDefined();
  expect(crew.children.filter((child) => child.name === 'arm')).toHaveLength(2);
  expect(crew.children.filter((child) => child.name === 'leg')).toHaveLength(2);
  const bounds = new THREE.Box3().setFromObject(crew);
  expect(bounds.min.y).toBeGreaterThanOrEqual(0);
  expect(bounds.max.y).toBeLessThan(1.9);
  expect(bounds.max.x - bounds.min.x).toBeLessThan(0.9);
});

describe('station hull geometry', () => {
  test.each([6, 8, 10, 12])(
    '%i rooms keep all fixtures and hull details inside their own rooms',
    (count) => {
      const spec = generateHouse(410 + count, count);
      const ship = buildShip(spec);
      for (const room of spacesOf(spec)) {
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
          if (object instanceof THREE.Light)
            throw new Error(`${count} rooms: ${room.id}/${object.name} adds a room light`);
          if (!(object instanceof THREE.Mesh)) return;
          if (object.frustumCulled !== true)
            throw new Error(`${count} rooms: ${room.id}/${object.name} disables frustum culling`);
          draws++;
        });
        expect(draws).toBeLessThanOrEqual(20);
      }
      const command = new THREE.Box3().setFromObject(ship.getObjectByName('station-command-hull')!);
      expect(command.min.x).toBeGreaterThanOrEqual(APRON.x * TILE);
      expect(command.max.x).toBeLessThanOrEqual((APRON.x + APRON.w) * TILE);
      expect(command.min.z).toBeGreaterThanOrEqual(APRON.z * TILE);
      expect(command.max.z).toBeLessThanOrEqual((APRON.z + APRON.d) * TILE);
    },
  );

  test('room signs are full-bright and physically in front of every wall panel', () => {
    const spec = generateHouse(83, 12);
    const ship = buildShip(spec);
    for (const room of spacesOf(spec)) {
      const group = ship.getObjectByName(`station-room-${room.id}`)!;
      const signs = group.children.filter((child) => child.name === 'room-identification');
      // Eines je Nord- und Südwand — außer die Wand ist ganz offen (Kreuzung).
      const walls = ([0, 2] as const).filter((dir) => closedTileX(spec, room, dir) !== null);
      expect(signs).toHaveLength(walls.length);
      for (const sign of signs) {
        // Nie über einer Tür oder einem Fenster: dort hängt jetzt der Wegweiser.
        const tileX = Math.floor(sign.position.x / TILE);
        const onNorthWall = Math.abs(sign.position.z - room.rect.z * TILE) < 1;
        const tileZ = onNorthWall ? room.rect.z : room.rect.z + room.rect.d - 1;
        const dir = onNorthWall ? 0 : 2;
        const blocked = [...spec.doors, ...spec.windows].some(
          (edge) =>
            (edge.x === tileX && edge.z === tileZ && edge.dir === dir) ||
            (edge.x + dirX(edge.dir) === tileX &&
              edge.z + dirZ(edge.dir) === tileZ &&
              (edge.dir + 2) % 4 === dir),
        );
        expect(blocked).toBe(false);
        const mesh = sign as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
        expect(mesh.material.color.getHex()).toBe(0xffffff);
        expect(mesh.material.depthTest).toBe(true);
        expect(mesh.geometry.parameters.width).toBeGreaterThanOrEqual(2);
        const north = room.rect.z * TILE;
        const south = (room.rect.z + room.rect.d) * TILE;
        expect(
          Math.min(Math.abs(sign.position.z - north), Math.abs(sign.position.z - south)),
        ).toBeGreaterThan(PLAN_WALL_T / 2 + 0.2);
      }
    }
  });

  test('visible deck plates are smaller than the navigation grid and rooms have department stencils', () => {
    const spec = generateHouse(42, 8),
      ship = buildShip(spec);
    for (const room of spec.rooms) {
      const group = ship.getObjectByName(`station-room-${room.id}`)!;
      const plates = boxesIn(group).filter((box) => {
        const size = box.getSize(new THREE.Vector3());
        return (
          box.min.y > 0.025 &&
          box.max.y < 0.045 &&
          size.x > 0.8 &&
          size.x < 0.84 &&
          size.z > 0.8 &&
          size.z < 0.84
        );
      });
      expect(plates).toHaveLength(room.rect.w * room.rect.d * 9);
      expect(group.getObjectByName('department-floor-stencil')).toBeDefined();
    }
  });

  test('wall decoration leaves every real door opening clear', () => {
    const spec = generateHouse(83, 12);
    const ship = buildShip(spec);
    const minY = 0.08;
    const maxY = PLAN_DOOR_H - 0.01;
    // Each room participates in multiple doors. Calculate its instance bounds
    // once. Y-overlap is necessary for intersection, so floor plates completely
    // below the opening cannot obstruct it. Equality stays included, matching
    // Box3.intersectsBox's inclusive boundary semantics.
    const doorHeightBoxes = new Map<string, THREE.Box3[]>();
    for (const room of spacesOf(spec)) {
      const interior = ship.getObjectByName(`station-room-${room.id}`);
      if (interior)
        doorHeightBoxes.set(
          room.id,
          boxesIn(interior).filter((box) => !(box.max.y < minY || box.min.y > maxY)),
        );
    }
    for (const door of spec.doors) {
      const x = (door.x + 0.5 + dirX(door.dir) / 2) * TILE;
      const z = (door.z + 0.5 + dirZ(door.dir) / 2) * TILE;
      const alongX = dirX(door.dir) === 0;
      const half = PLAN_DOOR_W / 2 - 0.015;
      const passage = new THREE.Box3(
        new THREE.Vector3(x - (alongX ? half : 0.31), minY, z - (alongX ? 0.31 : half)),
        new THREE.Vector3(x + (alongX ? half : 0.31), maxY, z + (alongX ? 0.31 : half)),
      );
      for (const roomId of [door.a, door.b]) {
        if (roomId === null) continue;
        for (const box of doorHeightBoxes.get(roomId) ?? []) {
          if (box.intersectsBox(passage))
            throw new Error(
              `Seed 83: room ${roomId} obstructs door ${door.id}: detail ${JSON.stringify(box)}, opening ${JSON.stringify(passage)}`,
            );
        }
      }
    }
  });
});

test('technician steps alternate legs and counter-swing each arm', () => {
  const crew = buildCrewmate();
  animateCreature(crew, 0.25);
  const legs = crew.children.filter((c) => c.name === 'leg');
  expect(legs[0]!.rotation.x).not.toBe(0);
  expect(legs[0]!.rotation.x).toBeCloseTo(-legs[1]!.rotation.x);
  for (const leg of legs) {
    const arm = crew.children.find(
      (c) => c.name === 'arm' && Math.sign(c.position.x) === Math.sign(leg.position.x),
    )!;
    expect(arm.rotation.x).toBeCloseTo(-leg.rotation.x);
  }
});
