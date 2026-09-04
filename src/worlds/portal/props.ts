import * as THREE from 'three';
import type { ColliderShape } from '../../physics/PhysicsWorld';

/** Everything the magic bag can conjure. The name travels over the network. */
export type PropKind = 'cube' | 'domino' | 'sphere' | 'pyramid' | 'plank' | 'block' | 'cylinder';

/** Weighted Companion Cube — canvas texture, no asset download. */
export function createCompanionCube(size = 0.5): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c9d2e0';
  ctx.fillRect(0, 0, 256, 256);

  // Corner plates
  ctx.fillStyle = '#7f8ea6';
  const plate = 44;
  for (const [x, y] of [
    [0, 0],
    [256 - plate, 0],
    [0, 256 - plate],
    [256 - plate, 256 - plate],
  ] as const) {
    ctx.fillRect(x, y, plate, plate);
  }

  ctx.strokeStyle = '#6b7a92';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 248);

  // Centre disc with a heart
  ctx.beginPath();
  ctx.arc(128, 128, 62, 0, Math.PI * 2);
  ctx.fillStyle = '#eef2f8';
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#7f8ea6';
  ctx.stroke();

  ctx.fillStyle = '#ff6ea3';
  ctx.beginPath();
  ctx.moveTo(128, 168);
  ctx.bezierCurveTo(74, 132, 88, 86, 128, 108);
  ctx.bezierCurveTo(168, 86, 182, 132, 128, 168);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0.2 }),
  );
  cube.name = 'companion-cube';
  return cube;
}

/** Twice the old size: big enough to line up and knock over with a whole hand. */
export const DOMINO_SIZE = new THREE.Vector3(0.18, 0.36, 0.05);

/** A row of dominoes, ready to be knocked over. */
export function createDominoes(count: number, accent: number): THREE.Mesh[] {
  const geometry = new THREE.BoxGeometry(DOMINO_SIZE.x, DOMINO_SIZE.y, DOMINO_SIZE.z);
  const dominoes: THREE.Mesh[] = [];
  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accent).lerp(new THREE.Color(0xffffff), i / count),
      roughness: 0.35,
      metalness: 0.1,
    });
    const domino = new THREE.Mesh(geometry, material);
    domino.name = `domino-${i}`;
    dominoes.push(domino);
  }
  return dominoes;
}

/** Mesh plus the physics the bag should give it. */
export interface PropBlueprint {
  mesh: THREE.Mesh;
  mass: number;
  shape: ColliderShape;
  /** Half size of the collider, for the grab boxes. */
  halfExtents: THREE.Vector3;
  ccd?: boolean;
  label: string;
}

const PROP_COLORS: Record<Exclude<PropKind, 'cube' | 'domino'>, number> = {
  sphere: 0xffb35c,
  pyramid: 0x5ee0a0,
  plank: 0xd2a06a,
  block: 0x9d7bff,
  cylinder: 0x4aa8ff,
};

function solid(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.15 });
}

/**
 * One conjured object. Everything the bag offers goes through here, so the
 * mesh, the collider and the mass can never drift apart — and both sides of a
 * session build the very same thing from the same `kind`.
 */
export function createPropShape(kind: PropKind): PropBlueprint {
  switch (kind) {
    case 'cube':
      return {
        mesh: createCompanionCube(0.32),
        mass: 4,
        shape: { kind: 'box' },
        halfExtents: new THREE.Vector3(0.16, 0.16, 0.16),
        label: 'Companion Cube',
      };
    case 'domino': {
      const mesh = createDominoes(1, 0xff3b2f)[0]!;
      return {
        mesh,
        mass: 2,
        shape: { kind: 'box' },
        halfExtents: DOMINO_SIZE.clone().multiplyScalar(0.5),
        ccd: true,
        label: 'Domino',
      };
    }
    case 'sphere': {
      const radius = 0.16;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 26, 18),
        solid(PROP_COLORS.sphere),
      );
      mesh.name = 'prop-sphere';
      return {
        mesh,
        mass: 3,
        shape: { kind: 'ball' },
        halfExtents: new THREE.Vector3(radius, radius, radius),
        label: 'Kugel',
      };
    }
    case 'pyramid': {
      const radius = 0.24;
      const height = 0.36;
      // Four radial segments make a cone a square pyramid.
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 4),
        solid(PROP_COLORS.pyramid),
      );
      mesh.name = 'prop-pyramid';
      return {
        mesh,
        mass: 3,
        shape: { kind: 'cone' },
        halfExtents: new THREE.Vector3(radius, height / 2, radius),
        label: 'Pyramide',
      };
    }
    case 'plank': {
      const size = new THREE.Vector3(0.7, 0.05, 0.18);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size.x, size.y, size.z),
        solid(PROP_COLORS.plank),
      );
      mesh.name = 'prop-plank';
      return {
        mesh,
        mass: 2,
        shape: { kind: 'box' },
        halfExtents: size.clone().multiplyScalar(0.5),
        label: 'Planke',
      };
    }
    case 'block': {
      const size = new THREE.Vector3(0.44, 0.22, 0.28);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size.x, size.y, size.z),
        solid(PROP_COLORS.block),
      );
      mesh.name = 'prop-block';
      return {
        mesh,
        mass: 5,
        shape: { kind: 'box' },
        halfExtents: size.clone().multiplyScalar(0.5),
        label: 'Quader',
      };
    }
    case 'cylinder': {
      const radius = 0.13;
      const height = 0.34;
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, height, 22),
        solid(PROP_COLORS.cylinder),
      );
      mesh.name = 'prop-cylinder';
      return {
        mesh,
        mass: 3,
        shape: { kind: 'cylinder' },
        halfExtents: new THREE.Vector3(radius, height / 2, radius),
        label: 'Zylinder',
      };
    }
  }
}
