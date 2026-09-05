import * as THREE from 'three';
import { DICE, createDie, type DieKind } from './dice';
import type { ColliderShape } from '../../physics/PhysicsWorld';
import type { MenuIcon } from '../../ui/menu';

/** Everything the magic bag can conjure. The name travels over the network. */
export type PropKind =
  | 'cube'
  | 'domino'
  | 'sphere'
  | 'pyramid'
  | 'plank'
  | 'block'
  | 'cylinder'
  | 'cone'
  | 'ramp'
  | 'rod'
  | 'marble'
  | DieKind;

/**
 * Was der magische Beutel anbietet, in der Reihenfolge, in der das Raster es
 * zeigt — Sorte, Beschriftung, Symbol. Hier und nicht in der Welt, weil die
 * Werkzeugseite dieselbe Liste liest: ein Objekt, das es im Beutel gibt, gibt
 * es damit auch auf dem Telefon, ohne dass jemand zwei Listen pflegt.
 *
 * Die Reihenfolge ist die einer Werkstatt: erst die Bauklötze, dann das, was
 * sich bewegt — Kegel, Rampe, Stab, Murmel —, und am Ende der **Würfelsatz**.
 * Die fünf platonischen Körper stehen bewusst beieinander: sie sind ein Satz
 * und kein Sortiment, und wer den W20 sucht, sucht ihn neben dem W12.
 */
export const BAG_ITEMS: ReadonlyArray<readonly [PropKind, string, MenuIcon]> = [
  ['cube', 'Cube', 'cube'],
  ['sphere', 'Kugel', 'sphere'],
  ['domino', 'Domino', 'domino'],
  ['pyramid', 'Pyramide', 'pyramid'],
  ['block', 'Quader', 'gizmo'],
  ['plank', 'Planke', 'plank'],
  ['cylinder', 'Zylinder', 'cylinder'],
  ['cone', 'Kegel', 'cone'],
  ['ramp', 'Rampe', 'ramp'],
  ['rod', 'Stab', 'rod'],
  ['marble', 'Murmel', 'marble'],
  ['d4', 'W4', 'd4'],
  ['d6', 'W6', 'd6'],
  ['d8', 'W8', 'd8'],
  ['d12', 'W12', 'd12'],
  ['d20', 'W20', 'd20'],
];

/**
 * Wie ein Objekt heißt — ohne dass dafür eines gebaut werden muss.
 *
 * Der Beutel meldet beim Herbeirufen den Namen, der Inspektor liest ihn ab, und
 * die Miniatur im Beutel trägt ihn beim Darüberfahren. Das über
 * `createPropShape` zu holen hieße: eine Geometrie, ein Material und beim
 * Würfel eine Textur bauen, um eine Zeichenkette zu lesen.
 */
export const PROP_LABELS: Record<PropKind, string> = {
  cube: 'Companion Cube',
  domino: 'Domino',
  sphere: 'Kugel',
  pyramid: 'Pyramide',
  plank: 'Planke',
  block: 'Quader',
  cylinder: 'Zylinder',
  cone: 'Kegel',
  ramp: 'Rampe',
  rod: 'Stab',
  marble: 'Murmel',
  d4: DICE.d4.label,
  d6: DICE.d6.label,
  d8: DICE.d8.label,
  d12: DICE.d12.label,
  d20: DICE.d20.label,
};

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
  /**
   * Wie sehr es springt. Ohne Angabe nimmt die Welt ihren eigenen, sehr
   * gedämpften Wert — eine Murmel und ein Würfel wollen mehr davon.
   */
  restitution?: number;
  label: string;
}

const PROP_COLORS: Record<'sphere' | 'pyramid' | 'plank' | 'block' | 'cylinder', number> = {
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
  // Der Name kommt aus der Tabelle und nicht aus dem Bauplan: so kann ihn auch
  // ablesen, wer gar nichts bauen will (`PROP_LABELS`).
  return { ...buildProp(kind), label: PROP_LABELS[kind] };
}

function buildProp(kind: PropKind): Omit<PropBlueprint, 'label'> {
  switch (kind) {
    case 'cube':
      return {
        mesh: createCompanionCube(0.32),
        mass: 4,
        shape: { kind: 'box' },
        halfExtents: new THREE.Vector3(0.16, 0.16, 0.16),
      };
    case 'domino': {
      const mesh = createDominoes(1, 0xff3b2f)[0]!;
      return {
        mesh,
        mass: 2,
        shape: { kind: 'box' },
        halfExtents: DOMINO_SIZE.clone().multiplyScalar(0.5),
        ccd: true,
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
      };
    }
    case 'cone': {
      // Der runde Kegel — die Pyramide ist derselbe Körper mit vier Segmenten,
      // und was von beiden man braucht, merkt man beim Umwerfen.
      const radius = 0.15;
      const height = 0.42;
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 26),
        solid(EXTRA_COLORS.cone),
      );
      mesh.name = 'prop-cone';
      return {
        mesh,
        mass: 2.5,
        shape: { kind: 'cone' },
        halfExtents: new THREE.Vector3(radius, height / 2, radius),
      };
    }
    case 'ramp': {
      const size = new THREE.Vector3(0.6, 0.26, 0.34);
      const mesh = new THREE.Mesh(rampGeometry(size), solid(EXTRA_COLORS.ramp));
      mesh.name = 'prop-ramp';
      return {
        mesh,
        mass: 6,
        // Eine Rampe als Kasten wäre keine: die schiefe Ebene *ist* das
        // Objekt, und ein Würfel rollte darüber hinweg statt hinunter.
        shape: { kind: 'hull', points: meshPoints(mesh) },
        halfExtents: size.clone().multiplyScalar(0.5),
      };
    }
    case 'rod': {
      const radius = 0.035;
      const height = 0.9;
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, height, 18),
        new THREE.MeshStandardMaterial({
          color: EXTRA_COLORS.rod,
          roughness: 0.3,
          metalness: 0.7,
        }),
      );
      mesh.name = 'prop-rod';
      return {
        mesh,
        mass: 2.5,
        shape: { kind: 'cylinder' },
        halfExtents: new THREE.Vector3(radius, height / 2, radius),
      };
    }
    case 'marble': {
      const radius = 0.055;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 24, 16),
        new THREE.MeshStandardMaterial({
          color: EXTRA_COLORS.marble,
          roughness: 0.08,
          metalness: 0.35,
        }),
      );
      mesh.name = 'prop-marble';
      return {
        mesh,
        // Klein und schwer: eine Murmel, die wie ein Luftballon wegkullert,
        // ist keine.
        mass: 1.2,
        shape: { kind: 'ball' },
        halfExtents: new THREE.Vector3(radius, radius, radius),
        restitution: 0.45,
        ccd: true,
      };
    }
    case 'd4':
    case 'd6':
    case 'd8':
    case 'd12':
    case 'd20': {
      const mesh = createDie(kind);
      const radius = DICE[kind].radius;
      return {
        mesh,
        mass: DICE[kind].mass,
        // Der W6 ist ein Kasten und braucht keine Hülle; die anderen vier
        // schon, sonst rollen sie wie Kugeln (`dice.ts`).
        shape: kind === 'd6' ? { kind: 'box' } : { kind: 'hull', points: meshPoints(mesh) },
        halfExtents:
          kind === 'd6'
            ? new THREE.Vector3(1, 1, 1).multiplyScalar(radius / Math.sqrt(3))
            : new THREE.Vector3(radius, radius, radius),
        restitution: 0.28,
      };
    }
  }
}

/** Die Farben der Nachzügler — dieselbe Sättigung wie die der ersten sieben. */
const EXTRA_COLORS = {
  cone: 0xff8a5c,
  ramp: 0x7fd4c1,
  rod: 0xb9c4d6,
  marble: 0x6fe3ff,
} as const;

/**
 * Ein Keil: das Dreieck von der Seite, in die Breite gezogen.
 *
 * `ExtrudeGeometry` legt das Profil in die XY-Ebene und zieht es entlang Z —
 * das passt hier von selbst: lang in X, hoch in Y, breit in Z. Zentriert wird
 * trotzdem, denn das Profil beginnt in einer Ecke, und ein Objekt, dessen
 * Ursprung in seiner Ecke sitzt, dreht sich in der Hand um diese Ecke.
 */
function rampGeometry(size: THREE.Vector3): THREE.BufferGeometry {
  const profile = new THREE.Shape();
  profile.moveTo(0, 0);
  profile.lineTo(size.x, 0);
  profile.lineTo(0, size.y);
  profile.closePath();
  const geometry = new THREE.ExtrudeGeometry(profile, { depth: size.z, bevelEnabled: false });
  geometry.center();
  return geometry;
}

/** Die Ecken eines Netzes, wie Rapier sie für eine konvexe Hülle nimmt. */
function meshPoints(mesh: THREE.Mesh): Float32Array {
  return new Float32Array(mesh.geometry.getAttribute('position').array);
}
