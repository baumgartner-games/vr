import { doorBetween, fillRect, wallRect } from '../nav/navBuild';
import { NavGraph } from '../nav/navGraph';
import { TILE, tileKey } from '../nav/navTile';
import { fitMap, toScreen } from './mapFit';
import { markAt, pathSpots, sceneFromGraph, tileAt, type MapMark } from './mapScene';

/**
 * Ein Zimmer von 4 × 3 Kacheln mit Wänden rundherum, seine Nordwestecke im
 * Ursprung des Gitters.
 */
function room(): NavGraph {
  const graph = new NavGraph([0, 3]);
  fillRect(graph, { x: 0, z: 0, w: 4, d: 3 });
  wallRect(graph, { x: 0, z: 0, w: 4, d: 3 });
  return graph;
}

/** Eine Weltstelle als Punkt auf dem Bild — wie ein Finger ihn trifft. */
function toPoint(fit: ReturnType<typeof fitMap>, x: number, z: number): { x: number; y: number } {
  return toScreen(fit, { x, z });
}

describe('Was auf einer Karte steht', () => {
  it('nimmt jede Kachel des Gitters mit, in Metern', () => {
    const scene = sceneFromGraph(room());
    expect(scene.tiles).toHaveLength(12);
    expect(scene.tile).toBe(TILE);
    // Die Kachel (0,0) liegt in ihrer Mitte, nicht in ihrer Ecke.
    const first = scene.tiles.find((tile) => tile.x < TILE && tile.z < TILE)!;
    expect(first.x).toBeCloseTo(TILE / 2, 6);
    expect(first.z).toBeCloseTo(TILE / 2, 6);
  });

  it('umschließt die Kacheln mit dem Ausschnitt — an ihrem Rand, nicht an ihrer Mitte', () => {
    const scene = sceneFromGraph(room());
    expect(scene.bounds.minX).toBeCloseTo(0, 6);
    expect(scene.bounds.minZ).toBeCloseTo(0, 6);
    expect(scene.bounds.maxX).toBeCloseTo(4 * TILE, 6);
    expect(scene.bounds.maxZ).toBeCloseTo(3 * TILE, 6);
  });

  it('nimmt einen vorgegebenen Ausschnitt, wenn die Welt einen hat', () => {
    const box = { minX: -50, minZ: -50, maxX: 50, maxZ: 50 };
    expect(sceneFromGraph(room(), box).bounds).toEqual(box);
  });

  /**
   * Im Gitter gehört jede Wand genau einer Kachel und einer Richtung. Zwei
   * Kacheln, die sich eine Wand teilen, ergeben deshalb **eine** Linie — wer
   * das nachbaut, malt jede Innenwand doppelt und wundert sich über dicke
   * Striche.
   */
  it('zeichnet jede Wand einmal', () => {
    const scene = sceneFromGraph(room());
    // Ein Zimmer von 4 × 3 hat 2 × 4 waagerechte und 2 × 3 senkrechte Wände.
    expect(scene.walls).toHaveLength(14);
    for (const wall of scene.walls) {
      const length = Math.hypot(wall.bx - wall.ax, wall.bz - wall.az);
      expect(length).toBeCloseTo(TILE, 6);
    }
  });

  it('lässt eine offene Tür weg und zeichnet die geschlossene', () => {
    const graph = room();
    const north = { x: TILE * 1.5, z: TILE * 0.5 };
    const south = { x: TILE * 1.5, z: TILE * 1.5 };
    doorBetween(graph, north, south, 'tuer', true);
    const open = sceneFromGraph(graph).walls.length;

    graph.setDoor('tuer', { open: false, barred: true });
    const shut = sceneFromGraph(graph).walls.length;
    expect(shut).toBe(open + 1);
  });

  it('trennt Fensterbänke von Wänden — man sieht darüber, man geht nicht', () => {
    const graph = room();
    graph.setWall(tileKey(1, 1, 0), 0, { kind: 'window' });
    const scene = sceneFromGraph(graph);
    expect(scene.ledges).toHaveLength(1);
  });

  it('merkt sich, was gerade versperrt ist', () => {
    const graph = room();
    graph.setBlocked(tileKey(2, 1, 0), true);
    const scene = sceneFromGraph(graph);
    expect(scene.tiles.filter((tile) => tile.blocked)).toHaveLength(1);
  });

  it('zeichnet eine Verbindung als Linie von Kachel zu Kachel', () => {
    const graph = room();
    fillRect(graph, { x: 0, z: 0, w: 1, d: 1, level: 1 });
    graph.addLink({
      id: 'sprung',
      kind: 'drop',
      from: tileKey(0, 0, 1),
      to: tileKey(0, 0, 0),
      cost: 1,
      both: false,
      open: true,
    });
    const scene = sceneFromGraph(graph);
    expect(scene.links).toHaveLength(1);
  });

  /**
   * Die Etage ist ein **Index** und keine Höhe (`navTile.ts`) — die Karte
   * braucht sie, um das Dach über das Erdgeschoss zu malen und nicht darunter.
   */
  it('sagt zu jeder Kachel, auf welcher Etage sie liegt', () => {
    const graph = room();
    fillRect(graph, { x: 0, z: 0, w: 2, d: 2, level: 1 });
    const scene = sceneFromGraph(graph);
    expect(scene.tiles.filter((tile) => tile.level === 1)).toHaveLength(4);
    expect(scene.tiles.filter((tile) => tile.level === 0)).toHaveLength(12);
  });

  it('kommt mit einem leeren Gitter zurecht', () => {
    const scene = sceneFromGraph(new NavGraph());
    expect(scene.tiles).toHaveLength(0);
    expect(Number.isFinite(scene.bounds.minX)).toBe(true);
  });

  describe('Welche Marke ein Tipp meint', () => {
    const marks: MapMark[] = [
      { kind: 'button', color: 0xff0000, x: 0, z: 0, label: 'A' },
      { kind: 'button', color: 0xffff00, x: 3, z: 0, label: 'B' },
      { kind: 'npc', color: 0x00ff00, x: -20, z: 0 },
    ];
    // 100 Meter auf 500 Punkte: fünf Bildpunkte je Meter.
    const fit = fitMap({ minX: -50, minZ: -50, maxX: 50, maxZ: 50 }, 500, 500, {
      turn: false,
      padding: 0,
    });

    it('nimmt die nächste und nicht die erste', () => {
      const near = toPoint(fit, 2.4, 0);
      expect(markAt(marks, fit, near, 40)?.label).toBe('B');
    });

    it('nimmt nichts, was weiter weg ist als der Daumen breit', () => {
      expect(markAt(marks, fit, toPoint(fit, -20, 0), 20)).not.toBeNull();
      expect(markAt(marks, fit, toPoint(fit, -20, 0), 20)?.kind).toBe('npc');
      expect(markAt(marks, fit, toPoint(fit, -20, 20), 20)).toBeNull();
    });

    it('sucht auf Wunsch nur eine Sorte', () => {
      expect(markAt(marks, fit, toPoint(fit, -20, 0), 40, 'button')).toBeNull();
    });
  });

  describe('Welche Kachel ein Punkt meint', () => {
    it('findet die Kachel unter dem Finger', () => {
      const scene = sceneFromGraph(room());
      const tile = tileAt(scene, { x: TILE * 2.4, z: TILE * 1.4 });
      expect(tile?.x).toBeCloseTo(TILE * 2.5, 6);
      expect(tile?.z).toBeCloseTo(TILE * 1.5, 6);
    });

    /**
     * Von oben sieht man das Dach und nicht den Raum darunter — also meint ein
     * Tipp das Dach. Daran hängt, dass das Ziel auf der Etagen-Bucht des Labors
     * wirklich oben landet.
     */
    it('nimmt die oberste, wo zwei übereinanderliegen', () => {
      const graph = room();
      fillRect(graph, { x: 1, z: 1, w: 1, d: 1, level: 1 });
      const scene = sceneFromGraph(graph);
      const tile = tileAt(scene, { x: TILE * 1.5, z: TILE * 1.5 });
      expect(tile?.level).toBe(1);
      expect(tile?.y).toBeCloseTo(3, 6);
    });

    it('gibt nichts zurück, wo kein Boden ist', () => {
      const scene = sceneFromGraph(room());
      expect(tileAt(scene, { x: 100, z: 100 })).toBeNull();
    });
  });

  it('rechnet einen Weg aus Kachelschlüsseln in Weltpunkte um', () => {
    const graph = room();
    const spots = pathSpots(graph, [tileKey(0, 0, 0), tileKey(1, 0, 0)]);
    expect(spots).toHaveLength(2);
    expect(spots[1]!.x - spots[0]!.x).toBeCloseTo(TILE, 6);
  });
});
