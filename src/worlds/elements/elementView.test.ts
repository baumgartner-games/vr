import * as THREE from 'three';
import type { SolidBlock } from '../grid/GridWorld';
import { bits } from './elementCatalog';
import { FALLBACK_TOP, placeElement, type ElementHost } from './elementView';

jest.mock('../../core/chefFit', () => ({ canLoadModels: () => true }));

/** Die Maße der Modelle, wie sie aus dem Regal kämen (Breite, Höhe, Tiefe). */
const SIZES: Record<string, readonly [number, number, number]> = {
  [bits('kitchencounter_straight_A')]: [1, 0.5, 1],
  [bits('kitchencounter_straight_B')]: [1, 0.5, 1],
  [bits('cuttingboard')]: [0.75, 0.075, 0.5],
  [bits('knife')]: [0.125, 0.575, 0.05],
  [bits('icecream_container')]: [0.5, 0.25, 0.8],
  [bits('icecream_container_icecream_vanilla')]: [0.4, 0.18, 0.7],
  [bits('icecream_container_icecream_strawberry')]: [0.4, 0.18, 0.7],
};

/** Ein Kasten mit der Mitte im Ursprung — wie eine Datei, die um ihre Mitte gebaut ist. */
function box(path: string): THREE.Object3D | null {
  const size = SIZES[path];
  if (!size) return null;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]));
  mesh.name = path;
  return mesh;
}

/** Ein Gastgeber, der mitschreibt, was in welcher Reihenfolge geschah. */
function host(): {
  host: ElementHost;
  log: string[];
  added: THREE.Object3D[];
  fixed: Array<{ path: string; at: THREE.Vector3; yaw: number }>;
} {
  const log: string[] = [];
  const added: THREE.Object3D[] = [];
  const fixed: Array<{ path: string; at: THREE.Vector3; yaw: number }> = [];
  return {
    log,
    added,
    fixed,
    host: {
      blockSolid(cx, cz, w, d, height): SolidBlock {
        log.push(`block ${cx},${cz} ${w}×${d} ${height}`);
        return { cells: [`${cx},${cz}`], mesh: new THREE.Mesh() };
      },
      placeModel(path, at, yaw) {
        log.push(`place ${path}`);
        fixed.push({ path, at: at.clone(), yaw });
        return Promise.resolve(null);
      },
      measure(path) {
        log.push(`measure ${path}`);
        const size = SIZES[path];
        return Promise.resolve(size ? new THREE.Vector3(...size) : null);
      },
      load(path) {
        log.push(`load ${path}`);
        return Promise.resolve(box(path));
      },
      add(object) {
        added.push(object);
      },
      alive: () => true,
    },
  };
}

/** Die Hülle eines Objekts in der Welt. */
function bounds(object: THREE.Object3D): THREE.Box3 {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object);
}

describe('Spielelemente — hingestellt', () => {
  it('sperrt, bevor irgendetwas geladen wird', async () => {
    const { host: world, log, fixed } = host();
    const pending = placeElement(world, { id: 'b', element: 'board', x: 3, z: 2 });
    // Noch nichts abgewartet: Die Sperre steht als Erstes, bestellt ist, was
    // geladen wird — und hingestellt ist noch nichts.
    expect(log[0]).toBe('block 3.5,2.5 1×1 1.4');
    expect(log.filter((line) => line.startsWith('block'))).toHaveLength(1);
    expect(fixed).toHaveLength(0);
    await pending;
    expect(fixed).toHaveLength(1);
  });

  it('stellt die Platte als Stück der Welt hin und legt Brett und Messer obenauf', async () => {
    const { host: world, fixed, added } = host();
    const placed = await placeElement(world, { id: 'b', element: 'board', x: 3, z: 2 });
    expect(fixed).toHaveLength(1);
    expect(fixed[0]!.path).toBe(bits('kitchencounter_straight_B'));
    expect(fixed[0]!.at.toArray()).toEqual([3.5, 0.25, 2.5]);
    // Abgelegt wird auf dem Brett: 0,50 + 0,075.
    expect(placed.top).toBeCloseTo(0.575);
    const [, board, knife] = placed.parts;
    expect(bounds(board!).min.y).toBeCloseTo(0.5);
    // Das Messer liegt: 5 cm dick, quer (längs x) und auf dem Brett.
    const lying = bounds(knife!);
    expect(lying.min.y).toBeCloseTo(0.575);
    expect(lying.max.y - lying.min.y).toBeCloseTo(0.05);
    expect(lying.max.x - lying.min.x).toBeCloseTo(0.575);
    expect((lying.min.z + lying.max.z) / 2).toBeCloseTo(2.5 + 0.12);
    // Der Anker hängt an der Vorderkante, im Süden.
    expect(placed.anchor.position.toArray()).toEqual([3.5, 0, 3]);
    expect(added).toContain(placed.anchor);
    expect(placed.cells).toEqual(['3.5,2.5']);
  });

  it('dreht Versatz und Anker mit, wenn das Element nach Osten schaut', async () => {
    const { host: world } = host();
    const placed = await placeElement(world, { id: 'b', element: 'board', x: 3, z: 2, face: 'E' });
    expect(placed.anchor.position.toArray()).toEqual([4, 0, 2.5]);
    expect(placed.anchor.rotation.y).toBeCloseTo(Math.PI / 2);
    // Das Messer liegt jetzt auf der Ostseite des Bretts, längs z.
    const lying = bounds(placed.parts[2]!);
    expect((lying.min.x + lying.max.x) / 2).toBeCloseTo(3.5 + 0.12);
    expect(lying.max.z - lying.min.z).toBeCloseTo(0.575);
  });

  it('setzt das Eis in seine Wanne, mit demselben Maßstab', async () => {
    const { host: world } = host();
    const placed = await placeElement(world, { id: 'i', element: 'ice-tubs', x: 0, z: 0 });
    const [, tub, fill] = placed.parts;
    // Die Wanne auf 0,66 m Länge gebracht, auf der Platte, links der Mitte.
    const outer = bounds(tub!);
    expect(outer.max.z - outer.min.z).toBeCloseTo(0.66);
    expect(outer.min.y).toBeCloseTo(0.5);
    expect((outer.min.x + outer.max.x) / 2).toBeCloseTo(0.5 - 0.23);
    // Das Eis hängt in derselben Hülle wie die Wanne: gleiche Mitte.
    expect(fill).toBe(tub);
  });

  it('rückt mit einem Versatz das Bild und den Anker, die Sperre nicht', async () => {
    const { host: world, log, fixed } = host();
    const placed = await placeElement(world, {
      id: 'c',
      element: 'counter',
      x: 2,
      z: 1,
      offset: [0.45, -0.5],
    });
    expect(log[0]).toBe('block 2.5,1.5 1×1 1.4');
    expect(fixed[0]!.at.x).toBeCloseTo(2.95);
    expect(fixed[0]!.at.z).toBeCloseTo(1);
    expect(placed.anchor.position.x).toBeCloseTo(2.95);
    expect(placed.anchor.position.z).toBeCloseTo(1.5);
  });

  it('weiß auch ohne Modelle, wo es steht', async () => {
    const { host: world } = host();
    world.load = () => Promise.resolve(null);
    world.measure = () => Promise.resolve(null);
    const placed = await placeElement(world, { id: 'c', element: 'counter', x: 0, z: 0 });
    expect(placed.top).toBe(FALLBACK_TOP);
    expect(placed.cells).toEqual(['0.5,0.5']);
  });
});
