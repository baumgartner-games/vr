import * as THREE from 'three';
import { PLAN_DOOR_H, PLAN_WALL_H, PLAN_WALL_T } from '../editor/levelPlan';
import { DIRS, TILE, dirX, dirZ } from '../nav/navTile';
import { APRON, MARKS, roomAt, tilesOf, type HouseRoom, type HouseSpec, type Rect } from './house';
import { ventPairs, type MonsterKind } from './mission';
import { buildFixture } from './fixtureModels';
import { stationLayout, type StationPlacement } from './stationLayout';

export const SHIP = {
  hull: 0x74776d,
  dark: 0x1c2323,
  trim: 0x454d49,
  cyan: 0x75b8ad,
  amber: 0xd4a363,
  red: 0xbc5946,
};
type Triplet = [number, number, number];
type Shape = 'box' | 'pipe';

/** Room-sized batches keep distant rooms frustum-cullable, including their details. */
export class ShipBatch {
  private readonly parts = new Map<
    string,
    { color: number; glow: boolean; shape: Shape; matrices: THREE.Matrix4[] }
  >();
  box(color: number, size: Triplet, at: Triplet, glow = false, yaw = 0, pitch = 0): void {
    this.add('box', color, size, at, glow, new THREE.Euler(pitch, yaw, 0, 'YXZ'));
  }
  pipe(color: number, radius: number, length: number, at: Triplet, alongX: boolean): void {
    this.add(
      'pipe',
      color,
      [radius, length, radius],
      at,
      false,
      alongX ? new THREE.Euler(0, 0, Math.PI / 2) : new THREE.Euler(Math.PI / 2, 0, 0),
    );
  }
  private add(
    shape: Shape,
    color: number,
    size: Triplet,
    at: Triplet,
    glow: boolean,
    rotation: THREE.Euler,
  ): void {
    const key = `${shape}/${color}/${glow}`;
    let part = this.parts.get(key);
    if (!part) {
      part = { color, glow, shape, matrices: [] };
      this.parts.set(key, part);
    }
    part.matrices.push(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...at),
        new THREE.Quaternion().setFromEuler(rotation),
        new THREE.Vector3(...size),
      ),
    );
  }
  build(): THREE.Group {
    const group = new THREE.Group();
    for (const part of this.parts.values()) {
      const material = new THREE.MeshStandardMaterial({
        color: part.color,
        roughness: 0.82,
        metalness: 0.24,
        emissive: part.glow ? part.color : 0,
        emissiveIntensity: part.glow ? 0.35 : 0,
      });
      const mesh = new THREE.InstancedMesh(
        part.shape === 'box'
          ? new THREE.BoxGeometry(1, 1, 1)
          : new THREE.CylinderGeometry(1, 1, 1, 8),
        material,
        part.matrices.length,
      );
      mesh.name = `hull-${part.shape}-${part.glow ? 'indicator' : 'surface'}`;
      part.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}

export function roomAccent(kind: string): number {
  return kind === 'werkstatt' || kind === 'wohnzimmer'
    ? SHIP.red
    : kind === 'bad'
      ? 0x80ab8f
      : kind === 'esszimmer'
        ? 0x879768
        : SHIP.amber;
}

/** Physical floor, hull and equipment all share the same 2.5-metre tile system. */
export function buildShip(spec: HouseSpec): THREE.Group {
  const group = new THREE.Group();
  group.name = 'station-hull-details';
  const layout = stationLayout(spec);
  for (const room of spec.rooms) {
    const interior = buildRoomHull(spec, room);
    addRoomFixtures(
      interior,
      layout.filter((p) => p.roomId === room.id && p.kind === 'fixture'),
    );
    group.add(interior);
  }
  group.add(buildCommandHull());
  const positions = new Float32Array(240 * 3);
  for (let i = 0; i < 240; i++) {
    const angle = i * 2.399963,
      y = 1 - (i / 239) * 2,
      r = Math.sqrt(1 - y * y);
    positions[i * 3] = Math.cos(angle) * r * 100;
    positions[i * 3 + 1] = y * 100;
    positions[i * 3 + 2] = Math.sin(angle) * r * 100;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0x87938e, size: 0.12, fog: false, sizeAttenuation: true }),
  );
  stars.name = 'station-starfield';
  group.add(stars);
  return group;
}

function floor(batch: ShipBatch, rect: Rect): void {
  for (const tile of tilesOf(rect)) {
    const x = (tile.x + 0.5) * TILE,
      z = (tile.z + 0.5) * TILE;
    batch.box(SHIP.dark, [TILE - 0.04, 0.018, TILE - 0.04], [x, 0.017, z]);
    // Narrow inset deck seams: no glowing runway, no full-sized overlay faces.
    for (const side of [-1, 1])
      batch.box(SHIP.trim, [0.025, 0.01, TILE - 0.16], [x + side * (TILE / 2 - 0.13), 0.028, z]);
    batch.box(SHIP.trim, [0.26, 0.011, 0.02], [x, 0.029, z + TILE / 2 - 0.13]);
  }
}

function buildRoomHull(spec: HouseSpec, room: HouseRoom): THREE.Group {
  const group = new THREE.Group();
  group.name = `station-room-${room.id}`;
  group.userData.roomId = room.id;
  const batch = new ShipBatch(),
    accent = roomAccent(room.kind);
  floor(batch, room.rect);
  for (const tile of tilesOf(room.rect))
    for (const dir of DIRS) {
      if (roomAt(spec, tile.x + dirX(dir), tile.z + dirZ(dir))?.id === room.id) continue;
      const x = (tile.x + 0.5 + dirX(dir) / 2) * TILE,
        z = (tile.z + 0.5 + dirZ(dir) / 2) * TILE;
      const yaw = [0, -Math.PI / 2, Math.PI, Math.PI / 2][dir]!;
      const local = (u: number, y: number, v: number): Triplet => [
        x + Math.cos(yaw) * u + Math.sin(yaw) * v,
        y,
        z - Math.sin(yaw) * u + Math.cos(yaw) * v,
      ];
      const opening =
        spec.doors.some(
          (door) =>
            (door.x === tile.x && door.z === tile.z && door.dir === dir) ||
            (door.x + dirX(door.dir) === tile.x &&
              door.z + dirZ(door.dir) === tile.z &&
              (door.dir + 2) % 4 === dir),
        ) ||
        spec.windows.some(
          (window) => window.x === tile.x && window.z === tile.z && window.dir === dir,
        );
      const face = PLAN_WALL_T / 2,
        post = TILE / 2 - 0.19;
      for (const u of [-post, post]) {
        batch.box(SHIP.trim, [0.1, 2.2, 0.11], local(u, 1.15, face + 0.065), false, yaw);
        // Angled shoulders and rounded conduit break the rectangular wall silhouette.
        batch.box(SHIP.trim, [0.1, 0.28, 0.1], local(u, 2.42, face + 0.1), false, yaw, Math.PI / 5);
      }
      if (!opening) {
        batch.box(SHIP.hull, [TILE - 0.48, 1.41, 0.032], local(0, 1.365, face + 0.021), false, yaw);
        batch.box(SHIP.trim, [TILE - 0.46, 0.11, 0.043], local(0, 0.42, face + 0.03), false, yaw);
        batch.box(SHIP.dark, [TILE - 0.63, 0.075, 0.044], local(0, 1.84, face + 0.044), false, yaw);
        // One small low-level status marker is visible during a total blackout.
        batch.box(accent, [0.17, 0.015, 0.012], local(-post + 0.23, 0.31, face + 0.055), true, yaw);
      }
      // Everything crossing the wall segment is above the actual door head.
      batch.box(
        SHIP.hull,
        [TILE - 0.32, 0.13, 0.12],
        local(0, PLAN_WALL_H - 0.19, face + 0.085),
        false,
        yaw,
        Math.PI / 5,
      );
      batch.pipe(
        SHIP.trim,
        0.032,
        TILE - 0.39,
        local(0, PLAN_WALL_H - 0.42, face + 0.09),
        dirX(dir) === 0,
      );
      if (opening)
        batch.box(
          accent,
          [0.22, 0.022, 0.018],
          local(0, PLAN_DOOR_H + 0.19, face + 0.047),
          true,
          yaw,
        );
    }
  for (const vent of ventPairs(spec)) {
    if (vent.a !== room.id && vent.b !== room.id) continue;
    const inward = vent.a === room.id ? -1 : 1,
      dx = vent.dir === 1 ? inward : 0,
      dz = vent.dir === 2 ? inward : 0;
    const alongX = dx === 0,
      x = vent.x * TILE + dx * (PLAN_WALL_T / 2 + 0.063),
      z = vent.z * TILE + dz * (PLAN_WALL_T / 2 + 0.063);
    batch.box(SHIP.dark, alongX ? [0.69, 0.35, 0.045] : [0.045, 0.35, 0.69], [x, 2.38, z]);
    for (let i = 0; i < 5; i++)
      batch.box(SHIP.trim, alongX ? [0.6, 0.018, 0.017] : [0.017, 0.018, 0.6], [
        x + dx * 0.034,
        2.255 + i * 0.059,
        z + dz * 0.034,
      ]);
  }
  const sign = label(`${room.name.toUpperCase()}\n${MARKS[room.signature]}`, 1.4, 0.25, accent);
  sign.material.color.setScalar(0.46);
  sign.position.set(
    (room.rect.x + room.rect.w / 2) * TILE,
    PLAN_WALL_H - 0.33,
    room.rect.z * TILE + PLAN_WALL_T / 2 + 0.037,
  );
  sign.name = 'room-identification';
  group.add(sign, batch.build());
  return group;
}

/** One mesh per finish per room even when several models use dozens of pieces. */
function addRoomFixtures(group: THREE.Group, placements: readonly StationPlacement[]): void {
  const merged = new Map<
    string,
    { positions: number[]; normals: number[]; material: THREE.Material }
  >();
  for (const placement of placements) {
    if (!placement.markId) continue;
    const fixture = buildFixture(placement.markId);
    fixture.position.set(placement.x, 0, placement.z);
    fixture.rotation.y = placement.yaw;
    fixture.updateMatrixWorld(true);
    fixture.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const finish = object.userData.fixtureFinish as string,
        material = object.material as THREE.Material;
      let output = merged.get(finish);
      if (!output) {
        output = { positions: [], normals: [], material };
        merged.set(finish, output);
      } else material.dispose();
      const geometry = object.geometry;
      geometry.applyMatrix4(object.matrixWorld);
      const positions = geometry.getAttribute('position'),
        normals = geometry.getAttribute('normal');
      for (let i = 0; i < positions.count; i++) {
        output.positions.push(positions.getX(i), positions.getY(i), positions.getZ(i));
        output.normals.push(normals.getX(i), normals.getY(i), normals.getZ(i));
      }
      geometry.dispose();
    });
  }
  for (const [finish, data] of merged) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, data.material);
    mesh.name = `room-fixtures-${finish}`;
    group.add(mesh);
  }
}

function buildCommandHull(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'station-command-hull';
  const batch = new ShipBatch();
  floor(batch, APRON);
  const south = (APRON.z + APRON.d) * TILE,
    centreX = (APRON.x + APRON.w / 2) * TILE,
    centreZ = (APRON.z + APRON.d / 2) * TILE;
  for (let column = 0; column < APRON.w; column++) {
    const x = (APRON.x + column + 0.5) * TILE;
    batch.box(
      SHIP.hull,
      [TILE - 0.25, 0.15, 0.18],
      [x, PLAN_WALL_H - 0.18, south - PLAN_WALL_T / 2 - 0.1],
    );
    batch.pipe(
      SHIP.trim,
      0.034,
      TILE - 0.2,
      [x, PLAN_WALL_H - 0.39, south - PLAN_WALL_T / 2 - 0.1],
      true,
    );
    for (const side of [-1, 1])
      batch.box(
        SHIP.trim,
        [0.09, PLAN_WALL_H - 0.12, 0.13],
        [x + side * (TILE / 2 - 0.19), PLAN_WALL_H / 2, south - PLAN_WALL_T / 2 - 0.09],
      );
  }
  // Ceiling service rail remains inside the deck; no old 3-metre bay offsets.
  batch.box(SHIP.trim, [APRON.w * TILE - 0.6, 0.11, 0.14], [centreX, PLAN_WALL_H - 0.12, centreZ]);
  const title = label(
    'HAUNTING / ORBITAL\nEINSATZZENTRALE · SICHERER BEREICH',
    Math.min(3.4, APRON.w * TILE - 0.8),
    0.42,
    SHIP.amber,
  );
  title.material.color.setScalar(0.6);
  title.position.set(centreX, PLAN_WALL_H - 0.3, APRON.z * TILE + PLAN_WALL_T / 2 + 0.037);
  group.add(batch.build(), title);
  return group;
}

export function label(
  text: string,
  width: number,
  height: number,
  color = SHIP.cyan,
): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = Math.max(64, Math.round((768 * height) / width));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0a1922';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, 7, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  ctx.font = `600 ${Math.min(48, canvas.height / (lines.length + 1))}px system-ui`;
  lines.forEach((line, i) =>
    ctx.fillText(
      line,
      canvas.width / 2,
      canvas.height * ((i + 0.5) / lines.length),
      canvas.width - 40,
    ),
  );
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
}

export function buildCreature(kind: MonsterKind): THREE.Group {
  const root = new THREE.Group();
  root.name = `creature-${kind}`;
  const shell = new THREE.MeshStandardMaterial({
    color: kind === 'sentinel' ? 0x72848d : kind === 'crawler' ? 0x303840 : 0xb2aaa0,
    roughness: 0.78,
    metalness: 0.22,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111b24, roughness: 0.82 });
  const eye = new THREE.MeshBasicMaterial({
    color: kind === 'sentinel' ? SHIP.amber : SHIP.red,
    toneMapped: false,
  });
  const box = (
    parent: THREE.Object3D,
    material: THREE.Material,
    size: [number, number, number],
    at: [number, number, number],
  ): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    m.position.set(...at);
    parent.add(m);
    return m;
  };
  if (kind === 'crawler') {
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.45, 3, 8), shell);
    back.rotation.z = Math.PI / 2;
    back.position.y = 0.5;
    root.add(back);
    box(root, dark, [0.34, 0.18, 0.32], [0, 0.48, -0.42]);
    for (const side of [-1, 1]) {
      box(root, eye, [0.06, 0.04, 0.04], [side * 0.1, 0.51, -0.59]);
      for (let i = 0; i < 3; i++) {
        const limb = new THREE.Group();
        limb.name = 'leg';
        limb.position.set(side * 0.19, 0.5, -0.3 + i * 0.3);
        root.add(limb);
        const thigh = box(limb, shell, [0.43, 0.075, 0.075], [side * 0.15, -0.1, 0]);
        thigh.rotation.z = side * -0.4;
        box(limb, dark, [0.065, 0.29, 0.055], [side * 0.34, -0.33, 0]);
      }
    }
  } else {
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(kind === 'sentinel' ? 0.29 : 0.23, 0.4, 4, 10),
      shell,
    );
    torso.position.y = 1.16;
    root.add(torso);
    box(root, dark, [0.33, 0.22, 0.17], [0, 1.24, -0.22]);
    box(root, eye, [0.22, 0.035, 0.035], [0, 1.26, -0.318]);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.205, 12, 8), shell);
    head.position.y = 1.72;
    root.add(head);
    box(root, dark, [0.34, 0.17, 0.07], [0, 1.72, -0.15]);
    box(root, eye, [0.22, 0.025, 0.025], [0, 1.72, -0.19]);
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.name = 'arm';
      arm.position.set(side * 0.31, 1.36, 0);
      root.add(arm);
      box(arm, shell, [0.14, 0.39, 0.16], [0, -0.15, 0]);
      box(arm, dark, [0.11, 0.28, 0.12], [0, -0.47, -0.07]);
      for (let n = 0; n < 3; n++)
        box(arm, shell, [0.022, 0.14, 0.022], [-0.035 + n * 0.035, -0.64, -0.1]);
      const leg = new THREE.Group();
      leg.name = 'leg';
      leg.position.set(side * 0.14, 0.83, 0);
      root.add(leg);
      box(leg, shell, [0.17, 0.36, 0.18], [0, -0.15, 0]);
      box(leg, dark, [0.14, 0.34, 0.16], [0, -0.49, 0]);
      box(leg, shell, [0.19, 0.13, 0.3], [0, -0.74, -0.05]);
    }
    box(root, dark, [0.32, 0.5, 0.16], [0, 1.23, 0.26]);
  }
  return root;
}

export function animateCreature(root: THREE.Object3D, time: number): void {
  let index = 0;
  for (const child of root.children)
    if (child.name === 'arm' || child.name === 'leg') {
      child.rotation.x = Math.sin(time * 4.4 + index++ * Math.PI) * 0.2;
    }
}
