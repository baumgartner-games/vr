import * as THREE from 'three';
import { bakeNav } from './navBake';
import { fillRect } from './navBuild';
import { NavGraph } from './navGraph';
import { DEFAULT_RADIUS, shrinkFor } from './navPath';
import { boxesFrom, levelCensus, navDebugView, navPathView, tileUnder } from './navScene';
import { DIR_E, DIR_S, TILE, tileKey } from './navTile';

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

  /** Die Ausdehnung der betretbaren Fläche in X, aus ihren Punkten gemessen. */
  function floorSpan(view: THREE.Object3D): number {
    const face = view.children.find((child) => child.name === 'floor') as THREE.Mesh;
    const points = face.geometry.getAttribute('position');
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < points.count; i++) {
      min = Math.min(min, points.getX(i));
      max = Math.max(max, points.getX(i));
    }
    return max - min;
  }

  it('rückt die betretbare Fläche von allem ab, was im Weg steht', () => {
    // **Das Bild zur Zahl.** Der Weg hält an einer Wand seinen Abstand
    // (`navPath.shrinkFor`); die Fläche, die man dazu ansieht, hält denselben.
    // Zwei verschiedene Zahlen wären eine Ansicht, die etwas anderes zeigt,
    // als gelaufen wird — und dann sucht man den Fehler dort, wo keiner ist.
    const inset = shrinkFor(DEFAULT_RADIUS);
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 3, d: 1 });
    // Drei Kacheln nebeneinander: außen zieht sie ein, innen läuft sie durch.
    expect(floorSpan(navDebugView(graph))).toBeCloseTo(3 * TILE - 2 * inset, 6);

    // Und eine Wand mittendrin zieht sie auch dort ein, wo keine Kachel fehlt.
    graph.setWall(tileKey(1, 0, 0), DIR_E, { kind: 'solid' });
    expect(floorSpan(navDebugView(graph))).toBeCloseTo(3 * TILE - 2 * inset, 6);
    const face = navDebugView(graph).children[0] as THREE.Mesh;
    // Sechs Punkte je Kachel, und die Lücke an der Wand ist zweimal der Abstand
    // — die Fläche ist jetzt zwei Stücke mit einem Graben dazwischen.
    expect(face.geometry.getAttribute('position').count).toBe(18);
  });

  /** Ob die betretbare Fläche diesen Punkt überhaupt bedeckt. */
  function covered(view: THREE.Object3D, x: number, z: number): boolean {
    const face = view.children.find((child) => child.name === 'floor') as THREE.Mesh;
    const points = face.geometry.getAttribute('position');
    for (let i = 0; i < points.count; i += 3) {
      const ax = points.getX(i);
      const az = points.getZ(i);
      const bx = points.getX(i + 1);
      const bz = points.getZ(i + 1);
      const cx = points.getX(i + 2);
      const cz = points.getZ(i + 2);
      const side = (px: number, pz: number, qx: number, qz: number): number =>
        (qx - px) * (z - pz) - (qz - pz) * (x - px);
      const one = side(ax, az, bx, bz);
      const two = side(bx, bz, cx, cz);
      const three = side(cx, cz, ax, az);
      if (one >= 0 && two >= 0 && three >= 0) return true;
      if (one <= 0 && two <= 0 && three <= 0) return true;
    }
    return false;
  }

  it('rückt auch vom Kopfende einer Wand ab und nicht nur von ihrer Seite', () => {
    // **Der Fehler, den man von oben sieht.** Neben der letzten Kachel einer
    // Wand liegt eine, die auf allen vier Seiten frei ist — und trotzdem steht
    // die Stirnseite des Klotzes in ihrer Ecke. Wer nur Seite für Seite
    // einzieht, malt die Fläche bis an das Wandende heran, und ein Zylinder,
    // der dorthin plant, steckt darin.
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 3, d: 3 });
    // Die Ecke, an der die vier Kacheln (1|2, 0|1) zusammenstoßen.
    const corner = { x: 2 * TILE, z: 1 * TILE };
    const inCorner = { x: corner.x + 0.2, z: corner.z + 0.2 };
    const middle = graph.worldOf(tileKey(2, 1, 0));

    // Ohne Wand ist dort Boden, und die Fläche reicht bis dorthin.
    expect(covered(navDebugView(graph), inCorner.x, inCorner.z)).toBe(true);

    // Ein Wandstück von einer Kachel Länge, das genau an dieser Ecke aufhört.
    graph.setWall(tileKey(1, 0, 0), DIR_E, { kind: 'solid' });
    const view = navDebugView(graph);
    expect(covered(view, inCorner.x, inCorner.z)).toBe(false);
    // Und zwar nur die Ecke: In der Mitte derselben Kachel steht man weiter.
    expect(covered(view, middle.x, middle.z)).toBe(true);
    // Auf der anderen Seite des Wandendes genauso.
    expect(covered(view, corner.x - 0.2, corner.z + 0.2)).toBe(false);
  });

  it('bleibt ein Rechteck je Kachel, solange keine Ecke besetzt ist', () => {
    // Neun Rechtecke je Kachel wären in der Brille dreitausend Dreiecke, wo
    // dreihundert reichen — die Felder werden wieder zusammengefasst.
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 3, d: 3 });
    const face = navDebugView(graph).children[0] as THREE.Mesh;
    expect(face.geometry.getAttribute('position').count).toBe(9 * 6);
  });

  it('zeichnet eine Tür in der Farbe ihres Materials', () => {
    // Holz und Metall sind auf der Karte dieselbe Linie und für einen Zombie
    // das Gegenteil voneinander — man muss sie unterscheiden können.
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 1, d: 3 });
    graph.setWall(tileKey(0, 0, 0), DIR_S, { kind: 'door', id: 'holz', material: 'wood' });
    graph.setWall(tileKey(0, 1, 0), DIR_S, { kind: 'door', id: 'stahl', material: 'metal' });
    const lines = navDebugView(graph).children.filter((child) => child.name === 'walls');
    expect(lines).toHaveLength(2);
    const colors = lines.map((line) =>
      ((line as THREE.LineSegments).material as THREE.LineBasicMaterial).color.getHex(),
    );
    expect(new Set(colors).size).toBe(2);
  });

  it('zeichnet einen Weg dort, wo er wirklich läuft — nicht über die Kachelmitten', () => {
    // **Der gezeichnete Weg ist der gelaufene.** Die Wegpunkte liegen nach dem
    // Schnurzug neben den Kachelmitten (`navPath.pullString`), und genau das
    // ist der Bogen um die Hausecke, den man sehen will. Eine Linie durch die
    // Mitten schnitte ihn ab und sähe aus wie ein Weg durch die Wand.
    const graph = sample();
    const route = [
      { tile: tileKey(0, 0, 0), x: 0.4, z: 0.7, tight: false },
      { tile: tileKey(1, 0, 0), x: 3.1, z: 0.9, tight: true },
      { tile: tileKey(2, 0, 0), x: 6.2, z: 1.4, tight: false },
    ];
    const line = navPathView(graph, route);
    const points = line.geometry.getAttribute('position');
    expect(points.count).toBe(3);
    expect(points.getX(1)).toBeCloseTo(3.1, 6);
    expect(points.getZ(1)).toBeCloseTo(0.9, 6);
    // Die Höhe kommt weiter von der Kachel: ein Wegpunkt hat keine.
    expect(points.getY(1)).toBeGreaterThan(graph.worldOf(tileKey(1, 0, 0)).y);
  });

  it('zählt die Kacheln je Etage', () => {
    expect(levelCensus(sample())).toEqual([16, 4]);
  });
});
