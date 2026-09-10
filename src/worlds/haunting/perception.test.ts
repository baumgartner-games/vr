import { NavGraph } from '../nav/navGraph';
import { tileKey, DIR_E, TILE } from '../nav/navTile';
import { DOOR_LOSS, GLASS_LOSS, WALL_LOSS } from './audio/hearing';
import { acousticField, inView } from './perception';

test('Schall geht um die Ecke, aber nicht über eine fehlende Kachel', () => {
  const graph = new NavGraph();
  for (const [x, z] of [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [2, 0],
  ])
    graph.setTile(tileKey(x!, z!));
  const field = acousticField(graph, { x: 1, z: 1 }, 20);
  expect(field.get(tileKey(2, 0))).toBe(4 * TILE);
  graph.removeTile(tileKey(1, 1));
  expect(acousticField(graph, { x: 1, z: 1 }, 30).has(tileKey(2, 0))).toBe(false);
});

/**
 * **Zwei Räume, eine gemeinsame Wand, keine Tür** — derselbe Fall, an dem
 * `audio/hearing.test.ts` und `map/noiseSpread.test.ts` messen. Das Feld kann
 * es seit jeher: Die Nachbarkachel hinter der Wand steht in der Karte, sie
 * kostet nur `WALL_LOSS` Meter mehr. Was hier neu ist, sind die Zahlen — sie
 * stehen jetzt in `audio/hearing.ts` und nicht doppelt.
 */
test('eine geteilte Wand dämpft den Schall, die offene Tür lässt ihn durch', () => {
  const graph = new NavGraph();
  graph.setTile(tileKey(0, 0));
  graph.setTile(tileKey(1, 0));
  graph.setWall(tileKey(0, 0), DIR_E, { kind: 'solid' });
  // Gedämpft, nicht abgeschnitten: zu kurze Reichweite kommt nicht hinüber,
  // die längere schon — und zwar um genau eine Wand teurer.
  expect(acousticField(graph, { x: 1, z: 1 }, 10).has(tileKey(1, 0))).toBe(false);
  expect(acousticField(graph, { x: 1, z: 1 }, 20).get(tileKey(1, 0))).toBe(TILE + WALL_LOSS);
  graph.setWall(tileKey(0, 0), DIR_E, { kind: 'window' });
  expect(acousticField(graph, { x: 1, z: 1 }, 20).get(tileKey(1, 0))).toBe(TILE + GLASS_LOSS);
  graph.setWall(tileKey(0, 0), DIR_E, { kind: 'door', open: false });
  expect(acousticField(graph, { x: 1, z: 1 }, 20).get(tileKey(1, 0))).toBe(TILE + DOOR_LOSS);
  graph.setWall(tileKey(0, 0), DIR_E, { kind: 'door', open: true });
  expect(acousticField(graph, { x: 1, z: 1 }, 10).get(tileKey(1, 0))).toBe(TILE);
});

test('Sicht verwirft, was hinter einem oder zu weit weg ist', () => {
  const origin = { x: 0, z: 0 };
  expect(inView(origin, 0, { x: 0, z: -4 }, 10, Math.PI / 2)).toBe(true);
  expect(inView(origin, 0, { x: 0, z: 4 }, 10, Math.PI / 2)).toBe(false);
  expect(inView(origin, 0, { x: 0, z: -11 }, 10, Math.PI / 2)).toBe(false);
});
