import * as THREE from 'three';
import type { MarkId } from './house';
import {
  CARGO_BAND_COLORS,
  CARGO_SIZE,
  FIXTURE_CATALOG,
  LOCKER_SIZE,
  type FixtureSize,
} from './fixtureDimensions';
import type { CargoMark } from './rules/cargo';

export { CARGO_SIZE, CONSOLE_SIZE, FIXTURE_CATALOG, LOCKER_SIZE } from './fixtureDimensions';
export type { FixtureSize } from './fixtureDimensions';

type Vec = [number, number, number];
type Finish = 'shell' | 'dark' | 'metal' | 'rubber' | 'glass' | 'amber' | 'cyan' | 'green';

const FINISHES: Record<Finish, { color: number; emissive?: number }> = {
  shell: { color: 0xc0d4df },
  dark: { color: 0x172a3a },
  metal: { color: 0x668499 },
  rubber: { color: 0x334756 },
  glass: { color: 0x153e57 },
  amber: { color: 0xffc358, emissive: 0xb86617 },
  cyan: { color: 0x69e6ef, emissive: 0x2c868f },
  green: { color: 0x61b77a },
};

/**
 * Primitives are merged by finish before reaching the scene. Each returned model
 * owns its geometry and materials: normal world disposal cannot invalidate a
 * second instance. There are no textures, lights, transparency or shadow passes.
 */
class FixtureBuilder {
  private readonly parts = new Map<Finish, THREE.BufferGeometry[]>();

  private add(
    geometry: THREE.BufferGeometry,
    finish: Finish,
    at: Vec,
    rotation: Vec = [0, 0, 0],
  ): void {
    geometry.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...at),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    const parts = this.parts.get(finish) ?? [];
    parts.push(geometry);
    this.parts.set(finish, parts);
  }

  box(size: Vec, at: Vec, finish: Finish, bevel = 0.025, rotation: Vec = [0, 0, 0]): void {
    const [w, h, d] = size;
    const r = Math.min(bevel, w / 5, h / 5, d / 5);
    const shape = new THREE.Shape();
    const x = w / 2 - r;
    const y = h / 2 - r;
    shape.moveTo(-x, -y);
    shape.lineTo(x, -y);
    shape.lineTo(x, y);
    shape.lineTo(-x, y);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: d - r * 2,
      bevelEnabled: r > 0,
      bevelSegments: Math.min(w, h, d) > 0.08 ? 2 : 1,
      steps: 1,
      bevelSize: r,
      bevelThickness: r,
      curveSegments: 1,
    });
    geometry.translate(0, 0, -d / 2 + r);
    this.add(geometry, finish, at, rotation);
  }

  cylinder(
    radius: number,
    height: number,
    at: Vec,
    finish: Finish,
    axis: 'x' | 'y' | 'z' = 'y',
  ): void {
    this.add(
      new THREE.CylinderGeometry(radius, radius, height, 16),
      finish,
      at,
      axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0],
    );
  }

  capsule(size: Vec, at: Vec, finish: Finish, horizontal = false): void {
    const geometry = new THREE.CapsuleGeometry(1, 1, 4, 16);
    if (horizontal) geometry.rotateZ(Math.PI / 2);
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox!.getSize(new THREE.Vector3());
    geometry.scale(size[0] / bounds.x, size[1] / bounds.y, size[2] / bounds.z);
    this.add(geometry, finish, at);
  }

  ring(radius: number, tube: number, at: Vec, finish: Finish, axis: 'x' | 'y' | 'z' = 'z'): void {
    this.add(
      new THREE.TorusGeometry(radius, tube, 5, 16),
      finish,
      at,
      axis === 'x' ? [0, Math.PI / 2, 0] : axis === 'y' ? [Math.PI / 2, 0, 0] : [0, 0, 0],
    );
  }

  feet(width: number, depth: number, y = 0.08): void {
    for (const x of [-width / 2, width / 2])
      for (const z of [-depth / 2, depth / 2]) this.box([0.14, y * 2, 0.15], [x, y, z], 'rubber');
  }

  screen(width: number, height: number, at: Vec): void {
    this.box([width, height, 0.065], at, 'dark', 0.02);
    this.box([width - 0.09, height - 0.075, 0.008], [at[0], at[1], at[2] + 0.037], 'glass', 0.002);
    this.box(
      [width * 0.49, 0.013, 0.008],
      [at[0] - width * 0.1, at[1] + height * 0.2, at[2] + 0.045],
      'cyan',
      0.002,
    );
    for (let i = 0; i < 3; i++)
      this.box(
        [width * (0.46 - i * 0.07), 0.008, 0.007],
        [at[0] - width * (0.115 + i * 0.035), at[1] + height * 0.03 - i * 0.032, at[2] + 0.045],
        'metal',
        0.001,
      );
  }

  vents(width: number, rows: number, at: Vec): void {
    for (let i = 0; i < rows; i++)
      this.box([width, 0.018, 0.018], [at[0], at[1] + i * 0.055, at[2]], 'dark', 0.004);
  }

  gauge(radius: number, at: Vec): void {
    this.cylinder(radius, 0.03, at, 'metal', 'z');
    this.cylinder(radius * 0.8, 0.008, [at[0], at[1], at[2] + 0.02], 'dark', 'z');
    this.box(
      [0.012, radius * 1.1, 0.009],
      [at[0] + radius * 0.15, at[1] + radius * 0.1, at[2] + 0.03],
      'amber',
      0.001,
      [0, 0, -0.5],
    );
  }

  build(name: string): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    for (const [finish, parts] of this.parts) {
      const positions: number[] = [];
      const normals: number[] = [];
      for (const part of parts) {
        const flat = part.index ? part.toNonIndexed() : part;
        const position = flat.getAttribute('position');
        const normal = flat.getAttribute('normal');
        for (let i = 0; i < position.count; i++) {
          positions.push(position.getX(i), position.getY(i), position.getZ(i));
          normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
        }
        if (flat !== part) flat.dispose();
        part.dispose();
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const definition = FINISHES[finish];
      const material = new THREE.MeshStandardMaterial({
        color: definition.color,
        roughness: finish === 'glass' ? 0.24 : finish === 'rubber' ? 0.88 : 0.57,
        metalness: finish === 'metal' ? 0.58 : finish === 'glass' ? 0.35 : 0.16,
        emissive: definition.emissive ?? 0,
        emissiveIntensity: 0.35,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${name}-${finish}`;
      mesh.userData.fixtureFinish = finish;
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}

/** Low-poly industrial fittings, floor at Y=0, front at +Z. */
export function buildFixture(id: MarkId, style: 'default' | 'canteen' = 'default'): THREE.Group {
  const b = new FixtureBuilder();
  switch (id) {
    case 'wanne': {
      b.feet(1.45, 0.62, 0.12);
      b.capsule([2.06, 0.68, 1.05], [0, 0.58, 0], 'shell', true);
      b.capsule([1.66, 0.42, 0.8], [0, 0.95, 0], 'glass', true);
      for (const x of [-0.76, 0.76]) {
        b.box([0.16, 0.6, 0.92], [x, 0.72, 0], 'metal', 0.055);
        b.box([0.05, 0.035, 0.42], [x, 1.04, 0.2], 'cyan', 0.008);
      }
      b.screen(0.33, 0.2, [0.65, 0.65, 0.507]);
      break;
    }
    case 'dusche': {
      b.box([1.36, 0.13, 1.2], [0, 0.065, 0], 'metal', 0.04);
      b.box([1.36, 0.19, 1.2], [0, 2.29, 0], 'shell', 0.05);
      for (const x of [-0.59, 0.59]) {
        b.box([0.18, 2.16, 1.05], [x, 1.16, -0.025], 'shell', 0.035);
        b.cylinder(0.03, 1.8, [x * 0.8, 1.2, -0.34], 'metal');
        for (const y of [0.65, 1.3, 1.9])
          b.cylinder(0.032, 0.11, [x * 0.8, y, -0.26], 'metal', 'z');
      }
      b.box([1.07, 2.07, 0.06], [0, 1.19, -0.57], 'dark', 0.025);
      b.box([0.86, 0.035, 0.065], [0, 2.16, 0.46], 'cyan', 0.01);
      b.box([0.9, 0.025, 0.8], [0, 0.143, 0], 'rubber', 0.008);
      for (const x of [-0.3, 0, 0.3]) b.box([0.02, 0.018, 0.75], [x, 0.162, 0], 'metal', 0.004);
      break;
    }
    case 'ofen': {
      b.feet(0.86, 0.56);
      b.box([1.1, 1.48, 0.73], [0, 0.86, -0.02], 'shell', 0.06);
      b.box([0.8, 0.52, 0.032], [0, 0.8, 0.36], 'dark', 0.025);
      b.box([0.67, 0.37, 0.015], [0, 0.82, 0.382], 'rubber', 0.02);
      b.box([0.8, 0.075, 0.33], [0, 0.52, 0.2], 'metal', 0.025);
      b.screen(0.47, 0.22, [-0.17, 1.34, 0.343]);
      b.gauge(0.08, [0.34, 1.33, 0.348]);
      b.vents(0.65, 3, [0, 0.25, 0.35]);
      break;
    }
    case 'spuele': {
      b.feet(1.1, 0.53);
      b.box([1.42, 0.74, 0.78], [0, 0.48, -0.01], 'shell', 0.045);
      for (const x of [-0.48, 0.45]) {
        b.capsule([0.36, 0.65, 0.37], [x, 1.15, -0.03], 'metal');
        b.ring(0.18, 0.025, [x, 1.27, -0.03], 'dark', 'y');
        b.cylinder(0.04, 0.26, [x, 1.48, -0.03], 'metal');
      }
      b.cylinder(0.035, 0.95, [0, 1.58, -0.03], 'metal', 'x');
      b.gauge(0.11, [0, 1.26, 0.2]);
      b.screen(0.42, 0.25, [0, 0.57, 0.372]);
      b.box([0.12, 0.22, 0.02], [-0.54, 0.45, 0.39], 'amber');
      break;
    }
    case 'bett': {
      b.feet(1.55, 0.72, 0.13);
      b.box([2.06, 0.24, 1.08], [0, 0.43, 0], 'metal', 0.06);
      b.capsule([1.87, 0.15, 0.91], [0, 0.61, 0.025], 'rubber', true);
      b.capsule([0.4, 0.19, 0.69], [-0.69, 0.73, 0.025], 'shell', true);
      b.box([0.16, 0.78, 1.08], [-0.94, 0.72, 0], 'shell', 0.035);
      b.box([1.92, 0.35, 0.12], [0, 0.92, -0.49], 'shell', 0.035);
      b.box([0.83, 0.055, 0.018], [0.05, 1.075, -0.418], 'cyan', 0.009);
      b.screen(0.37, 0.22, [0.69, 0.88, -0.395]);
      break;
    }
    case 'buecher': {
      b.box([1.3, 2.1, 0.73], [0, 1.075, -0.025], 'dark', 0.045);
      for (const x of [-0.59, 0.59]) b.box([0.1, 2.08, 0.75], [x, 1.075, -0.02], 'shell', 0.025);
      for (let i = 0; i < 6; i++) {
        const y = 0.31 + i * 0.29;
        b.box([1.05, 0.215, 0.075], [0, y, 0.335], 'metal', 0.02);
        b.vents(0.54, 2, [-0.11, y - 0.04, 0.379]);
        b.cylinder(0.023, 0.016, [0.38, y + 0.015, 0.38], i % 3 ? 'cyan' : 'amber', 'z');
      }
      b.feet(1.02, 0.56, 0.035);
      break;
    }
    case 'werkbank': {
      b.feet(1.4, 0.77, 0.12);
      b.box([1.83, 0.23, 1.07], [0, 0.32, 0], 'dark', 0.06);
      b.cylinder(0.35, 1.5, [0, 0.95, -0.03], 'metal', 'x');
      for (const x of [-0.69, -0.35, 0, 0.35, 0.69]) {
        b.cylinder(0.42, 0.12, [x, 0.95, -0.03], 'dark', 'x');
        b.ring(0.36, 0.018, [x + 0.067, 0.95, -0.03], 'amber', 'x');
      }
      for (const x of [-0.65, 0.65]) {
        b.box([0.18, 0.59, 0.82], [x, 0.61, -0.03], 'shell', 0.025);
        b.cylinder(0.044, 0.3, [x, 1.48, -0.03], 'metal');
      }
      b.cylinder(0.044, 1.3, [0, 1.61, -0.03], 'metal', 'x');
      b.screen(0.48, 0.24, [0, 0.5, 0.505]);
      break;
    }
    case 'klavier': {
      b.feet(1.17, 0.65, 0.11);
      b.box([1.48, 0.67, 0.77], [0, 0.48, -0.04], 'dark', 0.06);
      b.box([1.59, 0.15, 0.87], [0, 0.89, 0.035], 'shell', 0.045);
      b.box([1.49, 0.62, 0.2], [0, 1.19, -0.31], 'shell', 0.045);
      b.screen(0.81, 0.4, [-0.2, 1.22, -0.175]);
      b.gauge(0.11, [0.48, 1.27, -0.175]);
      b.gauge(0.075, [0.49, 1.0, -0.17]);
      for (let i = 0; i < 6; i++)
        b.box(
          [0.12, 0.032, 0.13],
          [-0.48 + i * 0.19, 0.987, 0.25],
          i === 5 ? 'amber' : 'metal',
          0.008,
        );
      b.vents(0.7, 3, [0, 0.31, 0.353]);
      break;
    }
    case 'kamin': {
      b.cylinder(0.65, 0.17, [0, 0.085, 0], 'dark');
      b.cylinder(0.43, 1.6, [0, 1.12, 0], 'metal');
      for (const y of [0.4, 0.83, 1.28, 1.71, 2.06]) {
        b.cylinder(0.53, 0.12, [0, y, 0], 'dark');
        b.ring(0.43, 0.021, [0, y + 0.073, 0], 'amber', 'y');
      }
      for (const x of [-0.59, 0.59]) {
        b.cylinder(0.065, 1.96, [x, 1.11, 0], 'shell');
        b.box([0.22, 0.14, 0.3], [x, 2.16, 0], 'metal', 0.035);
      }
      b.cylinder(0.33, 0.16, [0, 2.19, 0], 'shell');
      b.screen(0.4, 0.3, [0, 0.53, 0.574]);
      break;
    }
    case 'standuhr': {
      b.box([1.16, 0.15, 0.87], [0, 0.075, 0], 'dark', 0.04);
      for (const x of [-0.28, 0.28]) {
        b.capsule([0.46, 1.57, 0.53], [x, 1.015, -0.035], 'shell');
        for (const y of [0.55, 1.36]) b.ring(0.232, 0.025, [x, y, -0.035], 'metal', 'y');
        b.cylinder(0.055, 0.25, [x, 1.91, -0.035], 'metal');
        b.ring(0.11, 0.023, [x, 1.98, -0.035], 'amber', 'y');
      }
      b.cylinder(0.035, 0.56, [0, 1.89, -0.035], 'metal', 'x');
      b.gauge(0.12, [0, 1.64, 0.28]);
      b.box([0.18, 0.23, 0.018], [-0.28, 0.98, 0.237], 'cyan');
      break;
    }
    case 'sessel': {
      b.cylinder(0.39, 0.09, [0, 0.045, 0.02], 'metal');
      b.cylinder(0.09, 0.42, [0, 0.28, 0.02], 'dark');
      b.box([0.72, 0.12, 0.81], [0, 0.54, 0.03], 'shell', 0.04);
      b.capsule([0.65, 0.14, 0.7], [0, 0.65, 0.07], 'rubber', true);
      b.box([0.75, 0.86, 0.17], [0, 1.03, -0.33], 'shell', 0.045, [-0.12, 0, 0]);
      b.box([0.6, 0.59, 0.13], [0, 1.04, -0.216], 'rubber', 0.04, [-0.12, 0, 0]);
      b.capsule([0.43, 0.22, 0.24], [0, 1.5, -0.39], 'rubber', true);
      for (const x of [-0.45, 0.45]) {
        b.cylinder(0.033, 0.35, [x, 0.72, 0.02], 'metal');
        b.box([0.13, 0.12, 0.66], [x, 0.93, 0.04], 'rubber', 0.035);
      }
      b.cylinder(0.026, 0.11, [0.45, 1.04, 0.27], 'dark');
      break;
    }
    case 'kiste': {
      b.box([1.45, 0.99, 0.95], [0, 0.58, 0], 'shell', 0.085);
      b.box([1.47, 0.12, 0.97], [0, 1.075, 0], 'dark', 0.045);
      b.feet(1.1, 0.7, 0.05);
      for (const x of [-0.51, 0.51]) {
        b.box([0.09, 0.91, 0.028], [x, 0.56, 0.481], 'metal', 0.012);
        b.box([0.19, 0.16, 0.026], [x, 0.95, 0.479], 'dark', 0.014);
        b.box([0.08, 0.08, 0.008], [x, 0.94, 0.494], 'amber', 0.002);
      }
      b.box([0.46, 0.23, 0.02], [0, 0.68, 0.48], 'dark', 0.012);
      b.box([0.26, 0.015, 0.006], [-0.04, 0.73, 0.494], 'shell', 0.001);
      b.box([0.17, 0.01, 0.006], [-0.085, 0.665, 0.494], 'shell', 0.001);
      break;
    }
    case 'schaukelpferd': {
      b.feet(0.93, 0.55);
      b.box([1.23, 0.57, 0.78], [0, 0.44, -0.015], 'shell', 0.045);
      b.box([1.23, 0.12, 0.78], [0, 1.71, -0.015], 'shell', 0.035);
      b.box([1.08, 0.99, 0.045], [0, 1.16, -0.36], 'dark', 0.02);
      for (const x of [-0.55, 0.55]) b.cylinder(0.045, 1.01, [x, 1.17, 0.24], 'metal');
      for (const x of [-0.31, 0, 0.31]) {
        b.cylinder(0.105, 0.53, [x, 1.04, 0.02], 'glass');
        b.cylinder(0.12, 0.065, [x, 0.75, 0.02], 'metal');
        b.cylinder(0.12, 0.055, [x, 1.33, 0.02], 'metal');
        b.capsule([0.09, 0.28, 0.12], [x, 1.06, 0.12], 'green');
      }
      b.box([0.87, 0.025, 0.055], [0, 1.637, 0.16], 'cyan', 0.008);
      b.screen(0.49, 0.2, [0, 0.49, 0.355]);
      break;
    }
    case 'ausgabe': {
      // Eine Kantinenausgabe: Unterschrank, Tablettschiene, drei
      // Wärmebecken und ein Spuckschutz darüber. Sie steht an der Wand und
      // schaut in den Raum — das lange Ding, an dem man sich anstellt.
      b.feet(1.9, 0.6, 0.12);
      b.box([2.24, 1.02, 0.86], [0, 0.62, -0.02], 'shell', 0.06);
      b.box([2.1, 0.09, 0.78], [0, 1.17, -0.02], 'metal', 0.03);
      for (const x of [-0.68, 0, 0.68]) {
        b.box([0.56, 0.07, 0.5], [x, 1.14, -0.04], 'dark', 0.02);
        b.box([0.48, 0.02, 0.42], [x, 1.185, -0.04], 'amber', 0.008);
      }
      b.cylinder(0.032, 2.06, [0, 1.28, 0.36], 'metal', 'x');
      b.box([2.16, 0.03, 0.05], [0, 1.66, 0.12], 'glass', 0.01);
      for (const x of [-1.02, 1.02]) b.box([0.05, 0.5, 0.08], [x, 1.42, 0.12], 'metal', 0.015);
      b.screen(0.5, 0.22, [0.66, 0.86, 0.425]);
      b.vents(0.9, 3, [-0.5, 0.34, 0.42]);
      break;
    }
    case 'esstisch': {
      if (style === 'canteen') {
        b.cylinder(0.22, 0.075, [0, 0.038, 0], 'metal');
        b.cylinder(0.09, 0.69, [0, 0.4, 0], 'dark');
        b.capsule([1.2, 0.095, 1.0], [0, 0.81, 0], 'shell', true);
        b.capsule([1.08, 0.024, 0.87], [0, 0.864, 0], 'cyan', true);
        for (const x of [-0.76, 0.76]) {
          b.box([0.12, 0.5, 0.54], [x, 0.26, 0], 'metal', 0.02);
          b.capsule([0.29, 0.105, 0.84], [x, 0.56, 0], 'rubber');
        }
        for (const x of [-0.23, 0.23]) {
          b.cylinder(0.11, 0.014, [x, 0.885, 0.12], 'metal');
          b.cylinder(0.038, 0.09, [x, 0.926, -0.15], 'shell');
        }
        break;
      }
      for (const x of [-0.73, 0.73]) {
        b.box([0.12, 0.86, 0.77], [x, 0.43, 0], 'metal', 0.03);
        b.cylinder(0.035, 0.66, [x, 1.24, -0.37], 'metal');
      }
      b.box([1.78, 0.25, 0.94], [0, 0.85, 0], 'shell', 0.065);
      b.box([1.54, 0.018, 0.73], [0, 0.984, 0], 'dark', 0.006);
      for (let i = 0; i < 5; i++) {
        const x = -0.61 + i * 0.305;
        b.cylinder(0.036, 0.25, [x, 1.105, 0], 'green');
        for (const side of [-1, 1])
          b.box([0.19, 0.035, 0.135], [x + side * 0.064, 1.145, 0], 'green', 0.008, [
            0,
            side * 0.35,
            side * 0.4,
          ]);
      }
      b.box([1.72, 0.08, 0.22], [0, 1.55, -0.3], 'dark', 0.025);
      b.box([1.54, 0.012, 0.12], [0, 1.504, -0.29], 'cyan', 0.003);
      break;
    }
  }
  const model = b.build(`fixture-${id}`);
  model.userData.fixtureSize = FIXTURE_CATALOG[id];
  return model;
}

export interface CabinetModel {
  root: THREE.Group;
  /** Closed centre is already set. Animate X or rotate the returned leaf. */
  door: THREE.Mesh;
  size: FixtureSize;
  /** Root-local mounting positions. Convert to door-local when attaching to it. */
  screenMount: THREE.Vector3;
  lootMount: THREE.Vector3;
}

/**
 * **Der Frachtschrank — mit Kennzeichen, wenn er eines hat.**
 *
 * Das Kennzeichen ist Farbband und Nummer (`rules/cargo.ts`), und es steht
 * **immer** am Modell, nicht nur am Ziel: Der Archivar sagt „Kiste 2, blaues
 * Band", und der Techniker muss sie daran wiederfinden — auch die zwei
 * falschen daneben müssen also lesbar sein, sonst ist die Auskunft keine.
 *
 * Das Band läuft um den Kasten, die Nummer steht als Punkte auf einem dunklen
 * Schild darunter: Ein Modell hier hat keine Schrift und keine Textur, aber
 * einen bis drei Punkte zählt man auch aus fünf Metern im Halbdunkel.
 */
export function buildCargoCabinet(mark?: CargoMark): CabinetModel {
  return cabinet(false, mark);
}

export function buildSafetyLocker(): CabinetModel {
  return cabinet(true);
}

/**
 * Wie hoch das Farbband am Kasten sitzt, als Anteil seiner Höhe.
 *
 * Es saß einmal bei 0,66 — und damit genau auf dem Schild (`screenMount`,
 * halbe Höhe plus 14 cm): Das Band verdeckte das Kennzeichen, das es
 * eigentlich lesbar machen sollte. Unter dem Schild ist Platz.
 */
const BAND_AT = 0.4;
/** Und wie breit es ist, in Metern. */
const BAND_H = 0.1;

function cabinet(safety: boolean, mark?: CargoMark): CabinetModel {
  const size = safety ? LOCKER_SIZE : CARGO_SIZE;
  const { width: w, height: h, depth: d } = size;
  const body = new FixtureBuilder();
  body.box([w - 0.02, 0.12, d - 0.02], [0, 0.06, 0], 'dark', 0.025);
  body.box([w - 0.02, 0.11, d - 0.02], [0, h - 0.055, 0], 'shell', 0.025);
  body.box([w - 0.13, h - 0.2, 0.065], [0, h / 2, -d / 2 + 0.035], 'dark', 0.015);
  for (const x of [-w / 2 + 0.055, w / 2 - 0.055])
    body.box([0.11, h - 0.17, d - 0.03], [x, h / 2, 0], 'shell', 0.025);
  body.box([w - 0.19, 0.045, d - 0.14], [0, safety ? 0.21 : 0.39, -0.02], 'metal', 0.012);
  if (safety) {
    body.box([0.54, 0.09, 0.46], [0, 0.64, -0.06], 'rubber', 0.025);
    body.box([0.08, 0.5, 0.3], [0, 0.36, -0.13], 'metal', 0.02);
  }
  if (!safety && mark)
    // Der Punktbalken der Nummer liegt auf einem dunklen Schild — es teilt
    // sich seine Zeichnung mit dem Rest der dunklen Teile und kostet keinen
    // zweiten Zeichenaufruf (`build` fasst je Finish zusammen). Deshalb steht
    // es hier oben, vor `build`: Was danach kommt, baut niemand mehr.
    body.box([w - 0.34, 0.14, 0.02], [0, h * BAND_AT - 0.15, d / 2 - 0.016], 'dark', 0.01);
  const root = body.build(safety ? 'safety-locker' : 'cargo-cabinet');
  root.userData.fixtureSize = size;
  const leaf = new FixtureBuilder();
  leaf.box([w - 0.23, h - 0.27, 0.06], [0, 0, 0], 'shell', 0.025);
  const details = new FixtureBuilder();
  details.box(
    [w - 0.35, safety ? 0.8 : 0.51, 0.015],
    [0, safety ? 0.12 : 0.14, 0.041],
    'dark',
    0.025,
  );
  details.vents(w - 0.46, safety ? 4 : 3, [0, -h * 0.31, 0.039]);
  details.box(
    [0.04, safety ? 0.27 : 0.2, 0.05],
    [(w - 0.3) / 2 - 0.03, -0.03, 0.039],
    'metal',
    0.01,
  );
  details.box([0.028, 0.028, 0.016], [-(w - 0.37) / 2, h * 0.35, 0.042], 'amber', 0.004);
  const leafGroup = leaf.build('cabinet-door');
  const door = leafGroup.children[0] as THREE.Mesh;
  leafGroup.remove(door);
  door.position.set(0, h / 2, d / 2 - 0.07);
  door.add(details.build('door-hardware'));
  root.add(door);
  if (!safety && mark) root.add(markBand(mark, w, h, d));
  return {
    root,
    door,
    size,
    screenMount: new THREE.Vector3(0, h / 2 + (safety ? 0.12 : 0.14), d / 2 - 0.014),
    lootMount: new THREE.Vector3(0, safety ? 0.75 : 0.5, -0.025),
  };
}

/**
 * Farbband und Nummernpunkte als **ein** Netz in der Farbe des Bandes.
 *
 * Es wird mit dem Finish `amber` gebaut und danach umgefärbt: Der Bauplan
 * kennt vier feste Finishes, das Kennzeichen aber vier Farben, die aus der
 * Runde kommen. `amber` ist dabei kein Zufall, sondern die einzige Vorlage mit
 * einem Eigenleuchten — ein Band, das in einer dunklen Station gar nichts
 * zurückwirft, kann niemand zurufen.
 */
function markBand(mark: CargoMark, w: number, h: number, d: number): THREE.Group {
  const band = new FixtureBuilder();
  band.box([w - 0.015, BAND_H, d - 0.028], [0, h * BAND_AT, 0], 'amber', 0.012);
  for (let i = 0; i < mark.number; i++) {
    const step = 0.075;
    const x = (i - (mark.number - 1) / 2) * step;
    band.box([0.045, 0.045, 0.014], [x, h * BAND_AT - 0.15, d / 2 - 0.008], 'amber', 0.006);
  }
  const group = band.build('cargo-mark');
  const colour = CARGO_BAND_COLORS[mark.colour];
  for (const child of group.children) {
    const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    mesh.material.color.setHex(colour);
    mesh.material.emissive.setHex(colour);
    mesh.material.emissiveIntensity = 0.22;
    mesh.userData.fixtureFinish = 'cargo-mark';
  }
  return group;
}

export interface WreckModel {
  root: THREE.Group;
  size: FixtureSize;
}

/**
 * **Die aufgerissene Kabine** — was von einem Schutzschrank bleibt, nachdem
 * das Monster ihn hatte (`rules/roundRules.ts`).
 *
 * Man soll ihr von der Tür aus ansehen, dass sie nichts mehr taugt: Das Blatt
 * ist heraus — ein Rest hängt schief am oberen Scharnier nach innen, der
 * untere Teil liegt verbogen auf dem Boden der Kabine —, der rechte Pfosten
 * ist eingedrückt, an den Wänden sitzen Beulen und Brandflecken, und aus dem
 * Rahmen glimmt die herausgerissene Elektrik bernsteinfarben. Die Funken
 * dazu wirft `ShipEffects` in unregelmäßigem Takt (`rules/cabinWreck.ts`).
 *
 * Alles bleibt **innerhalb von `LOCKER_SIZE`**, damit das Wrack dieselbe
 * Kachel belegt wie der heile Schrank: weder Collider noch Wegsuche noch
 * Bedienpunkt (`stationLayout`) müssen davon wissen. Ein Blatt, das nach
 * außen in den Raum schwänge, stünde in der Gasse, die `LANE` frei hält.
 */
export function buildBrokenLocker(): WreckModel {
  const size = LOCKER_SIZE;
  const { width: w, height: h, depth: d } = size;
  const body = new FixtureBuilder();
  // Boden, Deckel, Rückwand wie beim heilen Schrank — nur die Rückwand hat
  // einen Brandfleck und einen Riss aus hellem Blech.
  body.box([w - 0.02, 0.12, d - 0.02], [0, 0.06, 0], 'dark', 0.025);
  body.box([w - 0.02, 0.11, d - 0.02], [0, h - 0.055, 0], 'shell', 0.025);
  body.box([w - 0.13, h - 0.2, 0.065], [0, h / 2, -d / 2 + 0.035], 'dark', 0.015);
  body.box([0.42, 0.7, 0.012], [0.12, 1.25, -d / 2 + 0.075], 'rubber', 0.01, [0, 0, 0.3]);
  body.box([0.05, 0.62, 0.014], [-0.18, 1.5, -d / 2 + 0.076], 'metal', 0.004, [0, 0, 0.18]);
  // Linker Pfosten heil, rechter eingedrückt: unten steht er, oben knickt er
  // nach innen — und bleibt dabei innerhalb der Breite des Schranks.
  body.box([0.11, h - 0.17, d - 0.03], [-w / 2 + 0.055, h / 2, 0], 'shell', 0.025);
  body.box([0.11, 0.95, d - 0.03], [w / 2 - 0.055, 0.56, 0], 'shell', 0.025);
  body.box([0.11, 0.98, d - 0.05], [w / 2 - 0.15, 1.58, 0], 'shell', 0.025, [0, 0, 0.12]);
  // Beulen: kleine Platten, die aus den Pfosten nach innen stehen.
  body.box([0.08, 0.16, 0.2], [-w / 2 + 0.12, 0.95, 0.08], 'metal', 0.01, [0.3, 0, 0.25]);
  body.box([0.09, 0.14, 0.18], [w / 2 - 0.19, 0.78, -0.1], 'metal', 0.01, [0, 0.4, 0.2]);
  // Der Sitz ist noch da, die Ablage ist schief.
  body.box([w - 0.19, 0.045, d - 0.14], [0, 0.21, -0.02], 'metal', 0.012, [0, 0, 0.07]);
  body.box([0.54, 0.09, 0.46], [0, 0.64, -0.06], 'rubber', 0.025);
  body.box([0.08, 0.5, 0.3], [0, 0.36, -0.13], 'metal', 0.02);
  // Das Blatt: ein Rest hängt am oberen Scharnier schief nach innen …
  body.box([0.52, 0.86, 0.06], [-0.23, 1.62, 0.15], 'shell', 0.025, [-0.42, 0, 0.1]);
  // … und der untere Teil liegt verbogen auf der Ablage.
  body.box([0.6, 0.05, 0.4], [0.08, 0.27, -0.04], 'shell', 0.02, [0.1, 0.5, 0]);
  // Herausgerissene Kabel vom Deckel her.
  body.cylinder(0.012, 0.42, [0.28, 1.86, 0.22], 'rubber');
  body.cylinder(0.012, 0.36, [0.36, 1.85, 0.12], 'rubber', 'y');
  body.box([0.018, 0.3, 0.018], [0.2, 1.7, 0.28], 'rubber', 0.004, [0.4, 0, 0.5]);
  // Und aus dem Rahmen glimmt, was einmal die Verriegelung war.
  const rim = d / 2 - 0.05;
  body.box([0.02, h - 0.45, 0.02], [-(w - 0.23) / 2 + 0.01, h / 2, rim], 'amber', 0.004);
  body.box([0.02, h - 0.55, 0.02], [(w - 0.23) / 2 - 0.05, h / 2 - 0.08, rim], 'amber', 0.004);
  body.box([w - 0.3, 0.02, 0.02], [0, h - 0.13, rim], 'amber', 0.004);
  body.box([0.05, 0.05, 0.03], [0.34, 1.4, rim - 0.02], 'amber', 0.006, [0, 0, 0.6]);
  body.box([0.04, 0.04, 0.03], [-0.38, 0.9, rim - 0.02], 'amber', 0.006, [0, 0, 0.3]);
  const root = body.build('broken-locker');
  root.userData.fixtureSize = size;
  return { root, size };
}
