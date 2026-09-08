import * as THREE from 'three';
import { PLAN_WALL_H } from '../editor/levelPlan';
import { DIRS, TILE, dirX, dirZ } from '../nav/navTile';
import { BLOCKS } from '../grid/blocks';
import { blockFor } from './plan';
import { HOUSE, MARKS, roomAt, roomCentre, tilesOf, type HouseSpec, type MarkAt } from './house';
import { ventPairs, type MonsterKind } from './mission';

export const SHIP = {
  hull: 0x8295a6,
  dark: 0x142431,
  trim: 0x344f62,
  cyan: 0x65dce5,
  amber: 0xffc178,
  red: 0xe95648,
};

/** One box geometry and one draw per finish, even for hundreds of hull details. */
export class ShipBatch {
  private readonly parts = new Map<
    string,
    { color: number; glow: boolean; matrices: THREE.Matrix4[] }
  >();
  box(
    color: number,
    size: [number, number, number],
    at: [number, number, number],
    glow = false,
    yaw = 0,
  ): void {
    const key = `${color}/${glow}`;
    let part = this.parts.get(key);
    if (!part) {
      part = { color, glow, matrices: [] };
      this.parts.set(key, part);
    }
    part.matrices.push(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...at),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
        new THREE.Vector3(...size),
      ),
    );
  }
  build(): THREE.Group {
    const group = new THREE.Group();
    for (const part of this.parts.values()) {
      const material = part.glow
        ? new THREE.MeshBasicMaterial({ color: part.color, toneMapped: false })
        : new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.66, metalness: 0.32 });
      const mesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        material,
        part.matrices.length,
      );
      part.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
    return group;
  }
}

export function roomAccent(kind: string): number {
  return kind === 'werkstatt' || kind === 'wohnzimmer'
    ? SHIP.red
    : kind === 'bad'
      ? 0x69dab6
      : kind === 'esszimmer'
        ? 0x87c46c
        : SHIP.cyan;
}

export function buildShip(spec: HouseSpec): THREE.Group {
  const group = new THREE.Group();
  group.name = 'station-hull-details';
  const batch = new ShipBatch();
  for (const tile of tilesOf({ ...HOUSE, d: HOUSE.d + 2 })) {
    const x = (tile.x + 0.5) * TILE,
      z = (tile.z + 0.5) * TILE;
    batch.box(0x354753, [TILE - 0.07, 0.025, TILE - 0.07], [x, 0.015, z]);
    for (const side of [-1, 1]) {
      batch.box(0x566976, [0.045, 0.027, TILE - 0.15], [x + side * 1.27, 0.025, z]);
      batch.box(SHIP.dark, [0.12, 0.018, 0.35], [x + side * 1.12, 0.035, z - 1.12]);
    }
  }
  for (const room of spec.rooms) {
    const accent = roomAccent(room.kind);
    const c = roomCentre(room);
    const cx = (c.x + 0.5) * TILE,
      cz = (c.z + 0.5) * TILE;
    batch.box(SHIP.dark, [room.rect.w * TILE - 0.3, 0.12, 0.4], [cx, PLAN_WALL_H - 0.13, cz]);
    batch.box(accent, [room.rect.w * TILE - 0.6, 0.025, 0.09], [cx, PLAN_WALL_H - 0.205, cz], true);
    for (const tile of tilesOf(room.rect))
      for (const dir of DIRS) {
        const neighbour = roomAt(spec, tile.x + dirX(dir), tile.z + dirZ(dir));
        if (neighbour?.id === room.id) continue;
        const dx = dirX(dir),
          dz = dirZ(dir),
          alongX = dx === 0;
        const x = (tile.x + 0.5 + dx * 0.44) * TILE;
        const z = (tile.z + 0.5 + dz * 0.44) * TILE;
        const door = spec.doors.some(
          (d) =>
            (d.x === tile.x && d.z === tile.z && d.dir === dir) ||
            (d.x + dirX(d.dir) === tile.x &&
              d.z + dirZ(d.dir) === tile.z &&
              (d.dir + 2) % 4 === dir),
        );
        const window = spec.windows.some((w) => w.x === tile.x && w.z === tile.z && w.dir === dir);
        for (const offset of [-1.26, 1.26])
          batch.box(SHIP.trim, alongX ? [0.09, PLAN_WALL_H, 0.11] : [0.11, PLAN_WALL_H, 0.09], [
            x + (alongX ? offset : 0),
            PLAN_WALL_H / 2,
            z + (alongX ? 0 : offset),
          ]);
        if (!door && !window) {
          batch.box(SHIP.hull, alongX ? [2.43, 1.74, 0.025] : [0.025, 1.74, 2.43], [x, 1.62, z]);
          batch.box(SHIP.trim, alongX ? [2.38, 0.14, 0.05] : [0.05, 0.14, 2.38], [
            x - dx * 0.025,
            0.44,
            z - dz * 0.025,
          ]);
          batch.box(
            accent,
            alongX ? [0.5, 0.035, 0.035] : [0.035, 0.035, 0.5],
            [x - dx * 0.04, 0.28, z - dz * 0.04],
            true,
          );
        }
        batch.box(SHIP.trim, alongX ? [2.5, 0.14, 0.13] : [0.13, 0.14, 2.5], [x, 2.85, z]);
      }
    for (const mark of room.marks) addEquipment(batch, mark);
    const sign = label(`${room.name.toUpperCase()}\n${MARKS[room.signature]}`, 1.55, 0.32, accent);
    sign.position.set(cx, 2.6, room.rect.z * TILE + 0.22);
    group.add(sign);
  }
  for (const vent of ventPairs(spec)) {
    const x = vent.x * TILE,
      z = vent.z * TILE;
    const alongX = vent.dir === 2;
    batch.box(SHIP.dark, alongX ? [0.72, 0.46, 0.32] : [0.32, 0.46, 0.72], [x, 2.6, z]);
    for (let n = 0; n < 5; n++)
      batch.box(0x637986, alongX ? [0.64, 0.022, 0.34] : [0.34, 0.022, 0.64], [
        x,
        2.43 + n * 0.078,
        z,
      ]);
  }
  // Command deck and docking window; the exterior is a point field, no panorama download.
  batch.box(SHIP.dark, [16.9, 0.32, 0.5], [-3, 2.75, 14.65]);
  for (let x = -11; x <= 5; x += 2) {
    batch.box(SHIP.cyan, [1.4, 0.025, 0.1], [x, 2.57, 12], true);
    batch.box(SHIP.trim, [0.07, 2.8, 0.12], [x, 1.4, 14.75]);
  }
  const title = label('HAUNTING / ORBITAL\nEINSATZZENTRALE · SICHERER BEREICH', 4, 0.55, SHIP.cyan);
  title.position.set(-3.8, 2.4, 9.25);
  group.add(title);
  const positions = new Float32Array(360 * 3);
  for (let i = 0; i < 360; i++) {
    const a = i * 2.399963;
    const y = 1 - (i / 359) * 2;
    const r = Math.sqrt(1 - y * y);
    positions[i * 3] = Math.cos(a) * r * 100;
    positions[i * 3 + 1] = y * 100;
    positions[i * 3 + 2] = Math.sin(a) * r * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  group.add(
    new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xb9d6ee, size: 0.16, fog: false, sizeAttenuation: true }),
    ),
  );
  group.add(batch.build());
  return group;
}

function addEquipment(b: ShipBatch, mark: MarkAt): void {
  const x = (mark.x + 0.5) * TILE,
    z = (mark.z + 0.5) * TILE;
  const base = BLOCKS[blockFor(mark.id)].height;
  const yaw = [Math.PI, -Math.PI / 2, 0, Math.PI / 2][mark.dir] ?? 0;
  const box = (
    color: number,
    size: [number, number, number],
    at: [number, number, number],
    glow = false,
  ): void => {
    b.box(
      color,
      size,
      [
        x + Math.cos(yaw) * at[0] + Math.sin(yaw) * at[2],
        at[1],
        z - Math.sin(yaw) * at[0] + Math.cos(yaw) * at[2],
      ],
      glow,
      yaw,
    );
  };
  if (mark.id === 'werkbank' || mark.id === 'kamin') {
    box(SHIP.dark, [1.55, 0.4, 0.7], [0, base + 0.2, 0]);
    for (let i = 0; i < 5; i++) {
      box(SHIP.trim, [0.14, 0.7, 0.8], [-0.6 + i * 0.3, base + 0.42, 0]);
      box(SHIP.red, [0.045, 0.34, 0.84], [-0.6 + i * 0.3, base + 0.4, 0], true);
    }
    box(SHIP.amber, [0.28, 0.06, 0.15], [0, base + 0.78, 0], true);
  } else if (mark.id === 'buecher' || mark.id === 'standuhr' || mark.id === 'dusche') {
    for (let i = 0; i < 5; i++) {
      box(SHIP.dark, [0.56, 0.13, 0.38], [0, 0.32 + i * 0.29, 0.27]);
      box(
        i % 2 ? SHIP.cyan : SHIP.amber,
        [0.24, 0.025, 0.025],
        [-0.05, 0.32 + i * 0.29, 0.48],
        true,
      );
    }
  } else if (mark.id === 'wanne' || mark.id === 'bett') {
    box(0x879daa, [1.45, 0.14, 0.65], [0, base + 0.08, 0]);
    box(SHIP.dark, [1.23, 0.075, 0.48], [0, base + 0.19, 0]);
    box(SHIP.cyan, [1.42, 0.035, 0.055], [0, base + 0.2, 0.33], true);
    box(0xe3e8da, [0.3, 0.12, 0.43], [-0.5, base + 0.24, 0]);
  } else if (mark.id === 'esstisch' || mark.id === 'schaukelpferd') {
    box(SHIP.dark, [1.3, 0.12, 0.7], [0, base + 0.06, 0]);
    for (let i = 0; i < 4; i++) {
      box(0x76a765, [0.19, 0.34, 0.17], [-0.45 + i * 0.3, base + 0.27, 0]);
      box(0x557f55, [0.3, 0.05, 0.29], [-0.45 + i * 0.3, base + 0.25, 0]);
    }
  } else {
    box(SHIP.trim, [1.25, 0.4, 0.55], [0, base + 0.2, -0.1]);
    box(SHIP.dark, [1.08, 0.29, 0.03], [0, base + 0.22, 0.19]);
    for (let i = 0; i < 4; i++)
      box(
        i % 2 ? SHIP.cyan : SHIP.amber,
        [0.18, 0.03, 0.02],
        [-0.38 + i * 0.25, base + 0.22, 0.213],
        true,
      );
    box(0xa1b5bd, [1.2, 0.035, 0.26], [0, base + 0.035, 0.4]);
  }
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
