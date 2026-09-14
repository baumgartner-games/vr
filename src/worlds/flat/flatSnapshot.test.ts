import { GridPlan } from '../grid/gridPlan';
import { DIR_E, DIR_S, TILE } from '../nav/navTile';
import { snapshotOf } from './flatSnapshot';

describe('Das Bild der flachen Welt', () => {
  it('zeigt jede Etage mit Boden, Wänden, Türen und der Treppe dazwischen', () => {
    const plan = new GridPlan([0, 3.1]);
    plan.room({ x: 0, z: 0, w: 2, d: 2 }, { walls: true });
    plan.room({ x: 0, z: 0, w: 2, d: 2, level: 1 }, { walls: true });
    plan.door(1, 0, DIR_E, 0, true);
    plan.stairs(0, 0, DIR_S, 0);
    const snapshot = snapshotOf(plan.graph, {
      boxes: [{ level: 1, kind: 'crate', minX: 0, minZ: 0, maxX: 1, maxZ: 1, height: 1.2 }],
      ramps: [{ level: 0, tx: 0, tz: 0, dir: DIR_S, rise: 3.1 }],
    });
    expect(snapshot.levels).toHaveLength(2);
    const [ground, upper] = snapshot.levels;
    expect(ground!.y).toBe(0);
    expect(upper!.y).toBe(3.1);
    expect(ground!.tiles).toHaveLength(4);
    // Oben fehlt die Kachel über der Treppe.
    expect(upper!.tiles).toHaveLength(3);
    const door = ground!.walls.find((wall) => wall.kind === 'door');
    expect(door?.open).toBe(true);
    expect(door?.at).toEqual({ x: 2 * TILE, z: 0.5 * TILE });
    expect(door?.alongX).toBe(false);
    expect(ground!.walls.filter((wall) => wall.kind === 'wall').length).toBeGreaterThan(4);
    const stairs = ground!.links.find((link) => link.kind === 'stairs');
    expect(stairs?.to.level).toBe(1);
    expect(stairs?.ramp?.rise).toBe(3.1);
    expect(upper!.boxes).toHaveLength(1);
    expect(snapshot.bounds).toEqual({ minX: 0, minZ: 0, maxX: 2 * TILE, maxZ: 2 * TILE });
    expect(snapshot.version).toBe(plan.graph.version);
  });
});
