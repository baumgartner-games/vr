import * as THREE from 'three';
import {
  BAG_ITEMS,
  PROP_GRIPS,
  PROP_LABELS,
  WALL_OVERLAP,
  createPropShape,
  modelPropShape,
  type PropKind,
} from './props';

/**
 * Der Beutel hat zwei Listen — was er anbietet und wie es heißt —, und sie
 * stehen an zwei Stellen. Der Test hält sie zusammen: eine Sorte ohne Namen
 * stünde im Raster als leeres Fach, eine doppelte Sorte zweimal darin.
 */
describe('BAG_ITEMS', () => {
  it('bietet jede Sorte genau einmal an', () => {
    const kinds = BAG_ITEMS.map(([kind]) => kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it('hat zu jeder Sorte einen Namen', () => {
    for (const [kind] of BAG_ITEMS) {
      expect(PROP_LABELS[kind]).toBeTruthy();
    }
  });

  it('lässt keine Sorte im Beutel liegen', () => {
    const offered = new Set<PropKind>(BAG_ITEMS.map(([kind]) => kind));
    for (const kind of Object.keys(PROP_LABELS) as PropKind[]) {
      expect(offered.has(kind)).toBe(true);
    }
  });

  it('beschriftet die Würfel als Würfel', () => {
    for (const kind of ['d4', 'd6', 'd8', 'd12', 'd20'] as const) {
      expect(PROP_LABELS[kind]).toMatch(/^W\d+ · /);
    }
  });
});

describe('die Griffe der Beutel-Objekte', () => {
  it('stehen in der Tabelle und im Bauplan gleich', () => {
    // Nicht jede Sorte lässt sich ohne Browser bauen (der Würfel malt sich
    // seine Zahlen auf eine Leinwand); die mit Griff und ein Stab reichen.
    for (const kind of ['champagne', 'rod', 'sphere'] as const) {
      const blueprint = createPropShape(kind);
      expect(blueprint.grip ?? null).toBe(PROP_GRIPS[kind] ?? null);
    }
  });

  it('baut die Heizdecke als flachen Kasten, den eine Hand fassen kann', () => {
    const blanket = createPropShape('blanket');
    expect(blanket.label).toBe('Heizdecke');
    expect(blanket.shape.kind).toBe('box');
    // Flach genug, um auf jemandem zu liegen; breit genug, um ihn zu decken.
    expect(blanket.halfExtents.y).toBeLessThan(0.05);
    expect(blanket.halfExtents.x).toBeGreaterThan(0.6);
    expect(blanket.mass).toBeLessThan(3);
    expect(blanket.ccd).toBe(true);
  });

  it('gibt der Sektflasche einen — und dem Würfel keinen', () => {
    expect(PROP_GRIPS.champagne).toBeDefined();
    expect(PROP_GRIPS.cube).toBeUndefined();
  });
});

describe('Wände aus dem Regal', () => {
  const box = (w: number, h: number, d: number): THREE.Object3D => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    // Wie bei den KayKit-Dateien: der Ursprung unter den Füßen, nicht in der Mitte.
    mesh.position.set(0.3, h / 2, 0);
    const root = new THREE.Group();
    root.add(mesh);
    return root;
  };
  const drawn = (object: THREE.Object3D): THREE.Vector3 => {
    object.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  };

  it('stehen im Bild an jedem Ende um die Fase über — der Körper nicht', () => {
    const wall = modelPropShape(box(2, 2, 0.25), 'Wand');
    const size = drawn(wall.object);
    expect(size.x).toBeCloseTo(2 + 2 * WALL_OVERLAP, 9);
    expect(size.z).toBeCloseTo(0.25, 9);
    expect(wall.halfExtents.x).toBeCloseTo(1, 9);
    // Und die Mitte bleibt in der Mitte.
    const centre = new THREE.Box3().setFromObject(wall.object).getCenter(new THREE.Vector3());
    expect(centre.length()).toBeCloseTo(0, 9);
  });

  it('strecken in Nord-Süd-Richtung, wenn sie so stehen', () => {
    const size = drawn(modelPropShape(box(0.25, 2, 2), 'Wand').object);
    expect(size.z).toBeCloseTo(2 + 2 * WALL_OVERLAP, 9);
    expect(size.x).toBeCloseTo(0.25, 9);
  });

  it('lassen alles andere, wie es ist', () => {
    expect(drawn(modelPropShape(box(1, 1, 1), 'Kiste').object).x).toBeCloseTo(1, 9);
    // Flach und lang, aber niedrig: ein Brett, keine Wand.
    expect(drawn(modelPropShape(box(2, 0.1, 0.25), 'Brett').object).x).toBeCloseTo(2, 9);
  });
});

describe('die Lauffläche eines Modells', () => {
  it('ist die Oberkante über der Mitte', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2));
    mesh.position.set(0, 0.1, 0);
    const root = new THREE.Group();
    root.add(mesh);
    expect(modelPropShape(root, 'Boden').tread).toBeCloseTo(0.1, 6);
  });

  it('lässt die Stacheln einer Falle außen vor', () => {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 2));
    plate.position.set(0, 0.25, 0);
    const spikes = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.6));
    spikes.name = 'floor_spikes_trap_spikes_2x2x1_red';
    spikes.position.set(0, 0.65, 0);
    const root = new THREE.Group();
    root.add(plate, spikes);
    // Hülle 0 … 0,8 m, Mitte auf 0,4 m; die Platte endet auf 0,5 m.
    const shape = modelPropShape(root, 'Falle');
    expect(shape.halfExtents.y).toBeCloseTo(0.4, 6);
    expect(shape.tread).toBeCloseTo(0.1, 6);
  });
});
