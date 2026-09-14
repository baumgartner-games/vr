/** @jest-environment jsdom */
import { GridPlan } from '../grid/gridPlan';
import { DIR_S } from '../nav/navTile';
import { snapshotOf } from './flatSnapshot';
import { BLUR_PER_LEVEL, FADE_PER_LEVEL, LevelMap } from './levelMap';

/**
 * **Die Ebenen-Karte** zeichnet die Etage des Betrachters scharf, die darunter
 * verschwommen und blass, die darüber gar nicht. jsdom hat kein Canvas — der
 * Kontext wird nachgestellt und mitgeschrieben, was er gesetzt bekommt.
 */
interface Recorded {
  filters: string[];
  alphas: number[];
  fills: number;
}

function fakeContext(record: Recorded): CanvasRenderingContext2D {
  const ctx: Record<string, unknown> = {
    filter: 'none',
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
  };
  const noop = (): void => {};
  for (const name of [
    'setTransform',
    'strokeRect',
    'beginPath',
    'moveTo',
    'lineTo',
    'stroke',
    'fill',
    'arc',
    'fillText',
  ])
    ctx[name] = noop;
  ctx['fillRect'] = (): void => {
    record.fills++;
  };
  ctx['save'] = noop;
  // Beim Zurücklegen steht fest, womit gezeichnet wurde.
  ctx['restore'] = (): void => {
    record.filters.push(ctx['filter'] as string);
    record.alphas.push(ctx['globalAlpha'] as number);
    ctx['filter'] = 'none';
    ctx['globalAlpha'] = 1;
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

function twoStoreys(): GridPlan {
  const plan = new GridPlan([0, 3.1, 6.2]);
  for (let level = 0; level < 3; level++)
    plan.room({ x: 0, z: 0, w: 2, d: 2, level }, { walls: true });
  plan.stairs(0, 0, DIR_S, 0);
  plan.stairs(0, 1, DIR_S, 1);
  return plan;
}

describe('Die Ebenen-Karte', () => {
  it('zeichnet die Etage des Betrachters scharf und die darunter verschwommen', () => {
    const record: Recorded = { filters: [], alphas: [], fills: 0 };
    const map = new LevelMap({ gestures: false });
    const ctx = fakeContext(record);
    jest.spyOn(map.canvas, 'getContext').mockReturnValue(ctx as never);
    const snapshot = snapshotOf(twoStoreys().graph);
    snapshot.entities = [{ id: 'player', x: 1, z: 1, level: 2, yaw: 0, kind: 'player' }];
    map.setSnapshot(snapshot);
    map.follow('player');
    map.draw();
    expect(map.level).toBe(2);
    // Drei Etagen gezeichnet: die unterste am weichsten, die eigene ohne Filter.
    expect(record.filters[0]).toBe(`blur(${(BLUR_PER_LEVEL * 2).toFixed(1)}px)`);
    expect(record.alphas[0]).toBeCloseTo(1 - FADE_PER_LEVEL * 2);
    expect(record.filters[1]).toBe(`blur(${BLUR_PER_LEVEL.toFixed(1)}px)`);
    expect(record.filters[2]).toBe('none');
    expect(record.alphas[2]).toBe(1);
    expect(record.fills).toBeGreaterThan(0);
  });

  it('zeichnet nichts von den Etagen über dem Betrachter', () => {
    const record: Recorded = { filters: [], alphas: [], fills: 0 };
    const map = new LevelMap({ gestures: false });
    jest.spyOn(map.canvas, 'getContext').mockReturnValue(fakeContext(record) as never);
    const snapshot = snapshotOf(twoStoreys().graph);
    snapshot.entities = [{ id: 'player', x: 1, z: 1, level: 0, yaw: 0, kind: 'player' }];
    map.setSnapshot(snapshot);
    map.follow('player');
    map.draw();
    // Nur die eigene Etage: ein `save` je gezeichneter Etage plus einer für die Figur.
    expect(record.filters).toHaveLength(2);
    expect(record.filters[0]).toBe('none');
  });

  it('rechnet Bild und Welt ineinander um und meldet einen Tipp in Metern', () => {
    const taps: Array<{ x: number; z: number; level: number }> = [];
    const map = new LevelMap({
      gestures: false,
      onTap: (at, level) => taps.push({ ...at, level }),
    });
    map.setSnapshot(snapshotOf(twoStoreys().graph));
    map.setViewerLevel(1);
    const p = map.toScreen(2.5, 2.5);
    const back = map.toWorld(p.x, p.y);
    expect(back.x).toBeCloseTo(2.5);
    expect(back.z).toBeCloseTo(2.5);
    map.tap(p.x, p.y);
    expect(taps[0]!.level).toBe(1);
    expect(taps[0]!.x).toBeCloseTo(2.5);
  });
});
