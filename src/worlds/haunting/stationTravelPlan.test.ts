import { tileKey } from '../nav/navTile';
import { generateHouse } from './house';
import { StationTravelPlan } from './stationTravelPlan';
import { TRAINING_DOOR } from './trainingLayout';

test('functional doors are routeable, logical locks update in place, and a new station gets a new graph', () => {
  const spec = generateHouse(37, 8);
  const routes = new StationTravelPlan();
  const graph = routes.graph(spec, [], false);
  const door = spec.doors[0]!;
  const at = tileKey(door.x, door.z, 0);
  expect(graph.wall(at, door.dir)?.open).toBe(true);
  const initialVersion = graph.version;
  expect(routes.graph(spec, [], false)).toBe(graph);
  expect(graph.version).toBe(initialVersion);
  expect(routes.graph(spec, [door.id], false)).toBe(graph);
  expect(graph.wall(at, door.dir)?.open).toBe(false);
  expect(graph.version).toBeGreaterThan(initialVersion);
  routes.graph(spec, [], false);
  expect(graph.wall(at, door.dir)?.open).toBe(true);
  expect(routes.graph(generateHouse(38, 8), [], false)).not.toBe(graph);
});

test('test-deck transitions and disposal discard the old cached navigation graph', () => {
  const spec = generateHouse(38, 12);
  const routes = new StationTravelPlan();
  const normal = routes.graph(spec, [], false);
  const testDeck = routes.graph(spec, [], true);
  expect(testDeck).not.toBe(normal);
  const door = TRAINING_DOOR;
  const key = tileKey(door.x, door.z, 0);
  expect(testDeck.wall(key, door.dir)?.open).toBe(true);
  routes.graph(spec, [door.id], true);
  expect(testDeck.wall(key, door.dir)?.open).toBe(false);
  routes.clear();
  const reopened = routes.graph(spec, [], true);
  expect(reopened).not.toBe(testDeck);
  expect(reopened.wall(key, door.dir)?.open).toBe(true);
});
