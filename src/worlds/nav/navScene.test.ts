import * as THREE from 'three';
import { bakeNav } from './navBake';
import { fillRect } from './navBuild';
import { NavGraph } from './navGraph';
import { boxesFrom, levelCensus, navDebugView, navPathView, tileUnder } from './navScene';
import { DIR_E, TILE, tileKey } from './navTile';

/** Ein Quader, wie ihn `slab()` in einer Welt baut. */
function slab(size: [number, number, number], at: [number, number, number], yaw = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]));
  mesh.position.set(at[0], at[1], at[2]);
  mesh.rotation.y = yaw;
  mesh.updateWorldMatrix(true, false);
  return mesh;
}

describe('Aus der Welt in Kästen', () => {
  it('nimmt einen Quader so, wie er dasteht', () => {
    const boxes = boxesFrom([slab([4, 1, 6], [10, 2, -3])]);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toEqual({
      minX: 8,
      minY: 1.5,
      minZ: -6,
      maxX: 12,
      maxY: 2.5,
      maxZ: 0,
    });
  });

  it('nimmt von einem gedrehten seinen Schatten', () => {
    // Ein um 45° gedrehter Quader hat keinen achsenparallelen Umriss mehr; die
    // Näherung ist absichtlich die größere Kiste, denn eine schräge Wand soll
    // die Kacheln dahinter sperren und nicht halb durchlassen.
    const [box] = boxesFrom([slab([4, 1, 1], [0, 0, 0], Math.PI / 4)]);
    const footprint = (box!.maxX - box!.minX) * (box!.maxZ - box!.minZ);
    expect(footprint).toBeGreaterThan(4 * 1);
    // Quer zur langen Seite wächst er deutlich — dort steht die schräge Wand.
    expect(box!.maxZ).toBeGreaterThan(1.5);
  });

  it('geht durch eine ganze Gruppe hindurch', () => {
    const group = new THREE.Group();
    group.position.set(5, 0, 0);
    group.add(slab([2, 2, 2], [0, 1, 0]));
    group.updateWorldMatrix(true, true);
    const [box] = boxesFrom([group]);
    expect(box!.minX).toBeCloseTo(4, 6);
    expect(box!.maxY).toBeCloseTo(2, 6);
  });

  it('lässt weg, was keine Ausdehnung hat', () => {
    expect(boxesFrom([new THREE.Group()])).toHaveLength(0);
  });
});

describe('Aus Kästen ein Gitter — und zurück in die Welt', () => {
  /** Ein Häuschen: Bodenplatte, vier Wände, eine Lücke als Tür. */
  function cottage(): THREE.Object3D[] {
    const parts: THREE.Object3D[] = [slab([5 * TILE, 0.4, 5 * TILE], [6.25, -0.2, 6.25])];
    // Nordwand mit einer Lücke in der Mitte.
    parts.push(slab([TILE, 3, 0.3], [1.25, 1.5, 0]));
    parts.push(slab([TILE * 3, 3, 0.3], [8.75, 1.5, 0]));
    parts.push(slab([0.3, 3, 5 * TILE], [0, 1.5, 6.25]));
    parts.push(slab([0.3, 3, 5 * TILE], [12.5, 1.5, 6.25]));
    parts.push(slab([5 * TILE, 3, 0.3], [6.25, 1.5, 12.5]));
    return parts;
  }

  it('macht aus einem gebauten Häuschen ein begehbares Gitter', () => {
    const report = bakeNav(boxesFrom(cottage()), {
      bounds: { minX: 0.1, minZ: 0.1, maxX: 12.4, maxZ: 12.4 },
      levels: [0],
    });
    expect(report.tiles).toBe(25);
    // Die Außenwände sind da, die Lücke in der Nordwand nicht.
    expect(report.graph.wall(tileKey(0, 0, 0), DIR_E)).toBeUndefined();
    expect(report.graph.walkable(tileKey(2, 2, 0))).toBe(true);
  });

  it('findet die Kachel unter einem Punkt in der Welt', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 4, d: 4 });
    const point = new THREE.Vector3(2 * TILE + 1, 0.2, 1 * TILE + 1);
    expect(tileUnder(graph, point)).toBe(tileKey(2, 1, 0));
  });
});

describe('Die Debug-Ansicht', () => {
  function sample(): NavGraph {
    const graph = new NavGraph([0, 3.1]);
    fillRect(graph, { x: 0, z: 0, w: 4, d: 4 });
    fillRect(graph, { x: 0, z: 0, w: 2, d: 2, level: 1 });
    graph.setWall(tileKey(1, 1, 0), DIR_E, { kind: 'solid' });
    graph.setWall(tileKey(2, 2, 0), DIR_E, { kind: 'window', muffle: 0 });
    graph.setBlocked(tileKey(3, 3, 0), true);
    graph.addLink({
      id: 'treppe',
      from: tileKey(0, 0, 0),
      to: tileKey(0, 0, 1),
      kind: 'stairs',
      cost: 4,
      both: true,
      open: true,
    });
    return graph;
  }

  it('zeichnet Kacheln, Wände, Kanten, Sperren und Verbindungen — je eine Linienmenge', () => {
    const view = navDebugView(sample());
    // Fläche, Kacheln, Gesperrte, Wand, Kante, Verbindung: sechs Objekte.
    expect(view.children).toHaveLength(6);
    expect(view.children.map((child) => child.name)).toEqual([
      'floor',
      'tiles',
      'blocked',
      'walls',
      'walls',
      'links',
    ]);
    // Alles außer der betretbaren Fläche ist eine Linienmenge; die eine
    // Ausnahme ist der Grund, warum es sie gibt — man sieht eine Fläche.
    for (const child of view.children.slice(1)) {
      expect(child).toBeInstanceOf(THREE.LineSegments);
    }
    expect(view.children[0]).toBeInstanceOf(THREE.Mesh);
  });

  it('zeichnet eine offene Tür nicht als Sperre', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1 });
    graph.setWall(tileKey(0, 0, 0), DIR_E, { kind: 'door', open: true, id: 'tuer' });
    // Nur die Fläche und die Kachelumrisse, keine Wandlinie.
    expect(navDebugView(graph).children).toHaveLength(2);
    graph.setDoor('tuer', { open: false });
    expect(navDebugView(graph).children).toHaveLength(3);
  });

  it('legt die Linien über alles, damit eine Wand sie nicht verschluckt', () => {
    for (const child of navDebugView(sample()).children) {
      expect(child.renderOrder).toBeGreaterThan(0);
      // Die **Fläche** ist die Ausnahme, und zwar mit Absicht: Sie soll den
      // Boden einfärben, den man sieht, und nicht durch jede Wand hindurch
      // einen blauen Teppich über die ganze Welt legen.
      const behindWalls = child.name === 'floor';
      expect((child as THREE.LineSegments).material).toMatchObject({ depthTest: behindWalls });
    }
  });

  it('zeichnet einen Weg als eine Linie durch alle seine Punkte', () => {
    const graph = sample();
    const path = [tileKey(0, 0, 0), tileKey(1, 0, 0), tileKey(2, 0, 0)];
    const line = navPathView(graph, path);
    expect(line.geometry.getAttribute('position').count).toBe(3);
  });

  it('zählt die Kacheln je Etage', () => {
    expect(levelCensus(sample())).toEqual([16, 4]);
  });
});
