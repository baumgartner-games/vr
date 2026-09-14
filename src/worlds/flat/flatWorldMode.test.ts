/** @jest-environment jsdom */
import { GridPlan } from '../grid/gridPlan';
import { DIR_E, TILE } from '../nav/navTile';
import { FloorModel } from './flatFloor';
import { snapshotOf } from './flatSnapshot';
import { FlatWorldMode, type FlatWorldHost } from './flatWorldMode';

jest.mock('./flatWorld.css', () => ({}));

/**
 * **Der Bildschirm der flachen Welt**: Tasten bewegen die Figur über das
 * Bodenmodell, ein Tipp lässt sie einen Weg gehen, „Benutzen" legt die Tür
 * um, und „Zurück in 3D" gibt der Welt die Stelle.
 */
function hall(): { plan: GridPlan; host: FlatWorldHost; left: Array<{ x: number; z: number }> } {
  const plan = new GridPlan([0]);
  plan.room({ x: 0, z: 0, w: 4, d: 1 }, { walls: true });
  plan.room({ x: 4, z: 0, w: 2, d: 1 }, { walls: true });
  plan.door(3, 0, DIR_E, 0, false);
  const floor = new FloorModel(plan.graph);
  let snapshot = snapshotOf(plan.graph);
  const left: Array<{ x: number; z: number }> = [];
  const host: FlatWorldHost = {
    title: 'Halle',
    floor: () => floor,
    snapshot: () => {
      if (snapshot.version !== plan.graph.version) snapshot = snapshotOf(plan.graph);
      return snapshot;
    },
    entities: () => [],
    start: { x: 1.25, z: 1.25, level: 0, yaw: 0 },
    door: (id, open) => {
      const wall = plan.graph.doorWall(id);
      if (wall < 0) return false;
      plan.graph.mendDoor(id, open);
      return true;
    },
    leave: (figure) => {
      left.push({ x: figure.x, z: figure.z });
    },
    notify: () => {},
  };
  return { plan, host, left };
}

function press(code: string, type: 'keydown' | 'keyup' = 'keydown'): void {
  window.dispatchEvent(new KeyboardEvent(type, { code }));
}

describe('Die flache Welt', () => {
  beforeEach(() => {
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null as unknown as CanvasRenderingContext2D);
  });

  it('bewegt die Figur mit WASD, gleitend an der Wand', () => {
    const { host } = hall();
    const mode = new FlatWorldMode(host);
    press('KeyD');
    for (let i = 0; i < 10; i++) mode.update(0.1);
    press('KeyD', 'keyup');
    expect(mode.figure.x).toBeGreaterThan(3);
    // Die geschlossene Tür hält sie auf.
    press('KeyD');
    for (let i = 0; i < 40; i++) mode.update(0.1);
    press('KeyD', 'keyup');
    expect(mode.figure.x).toBeLessThan(4 * TILE);
    mode.dispose();
  });

  it('legt mit „Benutzen" die Tür in Reichweite um und kommt dann hindurch', () => {
    const { host, plan } = hall();
    const mode = new FlatWorldMode(host);
    press('KeyD');
    for (let i = 0; i < 40; i++) mode.update(0.1);
    press('KeyD', 'keyup');
    const use = mode.element.querySelector<HTMLButtonElement>('[data-action="use"]')!;
    expect(use.disabled).toBe(false);
    use.click();
    expect([...plan.graph.doorIds()].some((id) => plan.graph.door(id)?.open)).toBe(true);
    press('KeyD');
    for (let i = 0; i < 30; i++) mode.update(0.1);
    press('KeyD', 'keyup');
    expect(mode.figure.x).toBeGreaterThan(4 * TILE);
    mode.dispose();
  });

  it('geht nach einem Tipp den Weg über den Graphen dorthin', () => {
    const { host } = hall();
    const mode = new FlatWorldMode(host);
    expect(mode.walkTo({ x: 3.5 * TILE, z: 1.25, level: 0 })).toBe(true);
    for (let i = 0; i < 60; i++) mode.update(0.1);
    expect(mode.figure.x).toBeCloseTo(3.5 * TILE, 0);
    mode.dispose();
  });

  it('gibt der Welt beim Verlassen die Stelle der Figur', () => {
    const { host, left } = hall();
    const mode = new FlatWorldMode(host);
    mode.update(0.1);
    mode.element.querySelector<HTMLButtonElement>('.flat__leave')!.click();
    expect(left).toEqual([{ x: 1.25, z: 1.25 }]);
    mode.dispose();
  });
});
