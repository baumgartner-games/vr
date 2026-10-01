import * as THREE from 'three';
import type { SolidBlock } from '../grid/GridWorld';
import { bits } from './elementCatalog';
import { FALLBACK_TOP, placeElement, type ElementHost } from './elementView';

jest.mock('../../core/chefFit', () => ({ canLoadModels: () => true }));

/** Der Laubbaum und das Gras der Natur (`natureCatalog.ts`). */
const TREE = 'forest-nature/color1/Tree_1_B_Color1.glb';
const GRASS = 'forest-nature/color1/Grass_2_B_Color1.glb';

/** Die Maße der Modelle, wie sie aus dem Regal kämen (Breite, Höhe, Tiefe). */
const SIZES: Record<string, readonly [number, number, number]> = {
  [bits('kitchencounter_straight_A')]: [1, 0.5, 1],
  [bits('kitchencounter_straight_B')]: [1, 0.5, 1],
  [bits('cuttingboard')]: [0.75, 0.075, 0.5],
  [bits('knife')]: [0.125, 0.575, 0.05],
  [bits('pizza_oven')]: [1, 1.2, 1],
  [bits('icecream_container')]: [0.5, 0.25, 0.8],
  [bits('icecream_container_icecream_vanilla')]: [0.4, 0.18, 0.7],
  [bits('icecream_container_icecream_strawberry')]: [0.4, 0.18, 0.7],
  [TREE]: [2, 2.5, 2],
  [GRASS]: [0.2, 0.46, 0.2],
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
    const placed = await pending;
    expect(placed.parts[0]).not.toBeNull();
  });

  it('stellt die Platte als Bild hin — damit sie leuchten kann — und legt Brett und Messer obenauf', async () => {
    const { host: world, fixed, added } = host();
    const placed = await placeElement(world, { id: 'b', element: 'board', x: 3, z: 2 });
    // Ein Element mit Zweck leuchtet selbst (`elementLit`): Die Platte ist kein
    // Stück der Welt, sondern ein Bild, das unter die Station gehängt wird.
    expect(fixed).toHaveLength(0);
    const counter = bounds(placed.parts[0]!);
    expect(counter.min.y).toBeCloseTo(0);
    expect((counter.min.x + counter.max.x) / 2).toBeCloseTo(3.5);
    expect((counter.min.z + counter.max.z) / 2).toBeCloseTo(2.5);
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

  it('rückt mit einem Versatz das Bild und den Anker, die Sperre nicht', async () => {
    const { host: world, log } = host();
    const placed = await placeElement(world, {
      id: 'c',
      element: 'counter',
      x: 2,
      z: 1,
      offset: [0.45, -0.5],
    });
    expect(log[0]).toBe('block 2.5,1.5 1×1 1.4');
    const counter = bounds(placed.parts[0]!);
    expect((counter.min.x + counter.max.x) / 2).toBeCloseTo(2.95);
    expect((counter.min.z + counter.max.z) / 2).toBeCloseTo(1);
    expect(placed.anchor.position.x).toBeCloseTo(2.95);
    expect(placed.anchor.position.z).toBeCloseTo(1.5);
  });

  it('stellt, was nur im Weg steht, weiter als Stück der Welt hin', async () => {
    const { host: world, fixed } = host();
    await placeElement(world, { id: 'o', element: 'pizza-oven', x: 1, z: 1 });
    expect(fixed.map((one) => one.path)).toEqual([bits('pizza_oven')]);
    expect(fixed[0]!.at.toArray()).toEqual([1.5, 0.6, 1.5]);
  });

  it('sperrt unter einem Baum nur den Stamm und stellt ihn als Bild an seinen Ursprung', async () => {
    const { host: world, log, fixed } = host();
    // Der Baum belegt 2 × 2 Kacheln ab (3, 2) — die Mitte ist (4, 3).
    const placed = await placeElement(world, { id: 't', element: 'tree-leafy', x: 3, z: 2 });
    expect(log.filter((line) => line.startsWith('block'))).toEqual(['block 4,3 0.5×0.5 1.4']);
    // Kein festes Stück der Welt: Das bekäme einen Körper so breit wie die Krone.
    expect(fixed).toHaveLength(0);
    // Am Ursprung der Datei (`rooted`): Dieser Kasten ist um seine Mitte gebaut
    // und steckt deshalb zur Hälfte im Boden, wie Wurzeln.
    const tree = bounds(placed.parts[0]!);
    expect(tree.getCenter(new THREE.Vector3()).toArray()).toEqual([4, 0, 3]);
  });

  it('sperrt bei Gras gar nichts — kein Kasten, keine Zelle', async () => {
    const { host: world, log } = host();
    const placed = await placeElement(world, { id: 'g', element: 'plant-grass', x: 1, z: 1 });
    expect(log.filter((line) => line.startsWith('block'))).toEqual([]);
    expect(placed.cells).toEqual([]);
    expect(placed.parts[0]).not.toBeNull();
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
