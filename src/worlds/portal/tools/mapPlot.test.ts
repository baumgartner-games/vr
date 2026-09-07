import { NavGraph } from '../../nav/navGraph';
import { fillRect, setDoor, wallRect } from '../../nav/navBuild';
import { DIR_N, TILE, tileKey } from '../../nav/navTile';
import { nearestLevel, onSheet, plotMap, toSheet, type MapWindow } from './mapPlot';

/** Ein Zimmer von 4 × 4 Kacheln um den Ursprung, mit Wänden ringsum. */
function room(levels: readonly number[] = [0], level = 0): NavGraph {
  const graph = new NavGraph(levels);
  const rect = { x: -2, z: -2, w: 4, d: 4, level };
  fillRect(graph, rect);
  wallRect(graph, rect);
  return graph;
}

const WINDOW: MapWindow = { x: 0, z: 0, span: 20, level: 0 };

describe('die Karte in der Hand', () => {
  describe('toSheet', () => {
    it('legt die Mitte des Ausschnitts in die Mitte des Blattes', () => {
      expect(toSheet(WINDOW, 0, 0)).toEqual({ u: 0.5, v: 0.5 });
    });

    it('legt Norden nach oben und Osten nach rechts', () => {
      // Die eine Zeile, an der sich eine Karte verrät: In three.js zeigt −z
      // nach vorn, auf dem Blatt zeigt kleines v nach oben.
      expect(toSheet(WINDOW, 0, -10).v).toBe(0);
      expect(toSheet(WINDOW, 0, 10).v).toBe(1);
      expect(toSheet(WINDOW, 10, 0).u).toBe(1);
      expect(toSheet(WINDOW, -10, 0).u).toBe(0);
    });

    it('wandert mit dem Träger mit', () => {
      const moved: MapWindow = { ...WINDOW, x: 30, z: -14 };
      expect(toSheet(moved, 30, -14)).toEqual({ u: 0.5, v: 0.5 });
    });

    it('macht aus einem engeren Ausschnitt einen größeren Maßstab', () => {
      const near: MapWindow = { ...WINDOW, span: 10 };
      expect(toSheet(near, 2.5, 0).u).toBe(0.75);
      expect(toSheet(WINDOW, 2.5, 0).u).toBe(0.625);
    });
  });

  describe('onSheet', () => {
    it('lässt den Rand mitzählen, wenn man es sagt', () => {
      expect(onSheet({ u: 1.05, v: 0.5 })).toBe(false);
      expect(onSheet({ u: 1.05, v: 0.5 }, 0.1)).toBe(true);
    });
  });

  describe('plotMap', () => {
    it('nimmt jede Kachel des Zimmers mit', () => {
      const plot = plotMap(room(), WINDOW);
      expect(plot.tiles).toHaveLength(16);
      expect(plot.scanned).toBe(16);
      // Eine Kachel ist 2,5 m breit, der Ausschnitt 20 m — also ein Achtel.
      expect(plot.tiles[0]!.size).toBeCloseTo(TILE / WINDOW.span);
    });

    it('lässt draußen, was außerhalb des Ausschnitts liegt', () => {
      // Ein Ausschnitt weit weg vom Zimmer: Nichts davon ist zu sehen, und
      // gezählt wurde trotzdem alles — daran erkennt die Karte, dass sie ein
      // Gitter hat und nur nichts davon zeigt.
      const plot = plotMap(room(), { ...WINDOW, x: 200, z: 200 });
      expect(plot.tiles).toHaveLength(0);
      expect(plot.walls).toHaveLength(0);
      expect(plot.scanned).toBe(16);
    });

    it('zeichnet die Wände ringsherum als Strecken auf der Kachelkante', () => {
      const plot = plotMap(room(), WINDOW);
      // Vier Kanten à vier Kacheln.
      expect(plot.walls).toHaveLength(16);
      expect(plot.walls.every((wall) => wall.kind === 'solid')).toBe(true);
      // Jede ist genau eine Kachel lang, und zwar entweder waagerecht oder
      // senkrecht — nie schräg.
      const cell = TILE / WINDOW.span;
      for (const wall of plot.walls) {
        const du = Math.abs(wall.to.u - wall.from.u);
        const dv = Math.abs(wall.to.v - wall.from.v);
        expect(Math.min(du, dv)).toBeCloseTo(0);
        expect(Math.max(du, dv)).toBeCloseTo(cell);
      }
    });

    it('legt die Nordwand an die Oberkante des Zimmers', () => {
      const plot = plotMap(room(), WINDOW);
      // Das Zimmer geht von z = −5 bis +5; die Nordwand liegt also bei −5,
      // und das ist auf dem Blatt 0,25 von oben.
      const top = Math.min(...plot.walls.map((wall) => wall.from.v));
      expect(top).toBeCloseTo(toSheet(WINDOW, 0, -5).v);
    });

    it('sagt, welche Tür offen steht', () => {
      const graph = room();
      setDoor(graph, tileKey(-2, -2, 0), DIR_N, 'front', true);
      const open = plotMap(graph, WINDOW).walls.filter((wall) => wall.kind === 'door');
      expect(open).toHaveLength(1);
      expect(open[0]!.open).toBe(true);

      graph.mendDoor('front', false);
      const shut = plotMap(graph, WINDOW).walls.filter((wall) => wall.kind === 'door');
      expect(shut[0]!.open).toBe(false);
    });

    it('meldet eine gesperrte Kachel', () => {
      const graph = room();
      graph.setBlocked(tileKey(0, 0, 0), true);
      const plot = plotMap(graph, WINDOW);
      expect(plot.tiles.filter((tile) => tile.blocked)).toHaveLength(1);
    });

    it('zeigt ein Stockwerk und nicht alle übereinander', () => {
      // Vier Etagen wie in Dust: Übereinandergelegt wären sie ein Knäuel aus
      // Wänden, das nichts mehr sagt.
      const graph = room([0, 3, 6, 9], 2);
      expect(plotMap(graph, { ...WINDOW, level: 2 }).tiles).toHaveLength(16);
      expect(plotMap(graph, { ...WINDOW, level: 0 }).tiles).toHaveLength(0);
      expect(plotMap(graph, { ...WINDOW, level: 2 }).walls).toHaveLength(16);
      expect(plotMap(graph, { ...WINDOW, level: 0 }).walls).toHaveLength(0);
    });
  });

  describe('nearestLevel', () => {
    const levels = [0, 3, 6, 9];

    it('nimmt die Etage, auf deren Boden der Kopf steht', () => {
      expect(nearestLevel(levels, 1.6)).toBe(0);
      expect(nearestLevel(levels, 4.6)).toBe(1);
      expect(nearestLevel(levels, 10.6)).toBe(3);
    });

    it('bleibt bei einer Welt ohne Stockwerke bei der einen', () => {
      expect(nearestLevel([0], 42)).toBe(0);
      expect(nearestLevel([], 1.6)).toBe(0);
    });
  });
});
