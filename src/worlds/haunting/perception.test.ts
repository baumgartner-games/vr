import { NavGraph } from '../nav/navGraph';
import { tileKey, DIR_E, TILE } from '../nav/navTile';
import { acousticField, inView } from './perception';

test('sound turns a corner along floors but cannot jump an empty tile', () => {
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

test('a shared wall damps sound while an open door transmits it', () => {
  const graph = new NavGraph();
  graph.setTile(tileKey(0, 0));
  graph.setTile(tileKey(1, 0));
  graph.setWall(tileKey(0, 0), DIR_E, { kind: 'solid' });
  expect(acousticField(graph, { x: 1, z: 1 }, 10).has(tileKey(1, 0))).toBe(false);
  expect(acousticField(graph, { x: 1, z: 1 }, 20).get(tileKey(1, 0))).toBe(TILE + 9);
  graph.setWall(tileKey(0, 0), DIR_E, { kind: 'door', open: true });
  expect(acousticField(graph, { x: 1, z: 1 }, 10).get(tileKey(1, 0))).toBe(TILE);
});

test('vision rejects behind and distant targets', () => {
  const origin = { x: 0, z: 0 };
  expect(inView(origin, 0, { x: 0, z: -4 }, 10, Math.PI / 2)).toBe(true);
  expect(inView(origin, 0, { x: 0, z: 4 }, 10, Math.PI / 2)).toBe(false);
  expect(inView(origin, 0, { x: 0, z: -11 }, 10, Math.PI / 2)).toBe(false);
});
