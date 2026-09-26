/**
 * **Rückgängig und Wiederholen** (`buildHistory.ts`) — der Stapel, die
 * Gegenschritte, Gruppen und das Wiederfinden eines Stücks an seiner Lage.
 */
import {
  BuildHistory,
  type BuildPose,
  type BuildStep,
  HISTORY_LIMIT,
  describeStep,
  invertStep,
  nearestAt,
  samePose,
} from './buildHistory';

const pose = (x: number, z: number, yaw = 0, y = 0.4): BuildPose => ({ x, y, z, yaw });
const add = (path: string, x: number, z: number): BuildStep => ({
  kind: 'add',
  item: { path, pose: pose(x, z) },
});

describe('invertStep', () => {
  it('macht aus Hinstellen Abreißen und umgekehrt', () => {
    const step = add('a.glb', 1, 2);
    expect(invertStep(step)).toEqual({ kind: 'remove', item: { path: 'a.glb', pose: pose(1, 2) } });
    expect(invertStep(invertStep(step))).toEqual(step);
  });

  it('stellt ein umgestelltes Stück zurück', () => {
    const step: BuildStep = { kind: 'move', path: 'a.glb', from: pose(0, 0), to: pose(3, 1) };
    expect(invertStep(step)).toEqual({
      kind: 'move',
      path: 'a.glb',
      from: pose(3, 1),
      to: pose(0, 0),
    });
  });

  it('löst eine Gruppe rückwärts auf — erst die Tasse, dann der Tisch', () => {
    const group: BuildStep = { kind: 'group', steps: [add('tisch', 0, 0), add('tasse', 0, 0)] };
    const back = invertStep(group);
    expect(back.kind).toBe('group');
    if (back.kind !== 'group') return;
    expect(back.steps.map((one) => (one.kind === 'remove' ? one.item.path : '?'))).toEqual([
      'tasse',
      'tisch',
    ]);
  });
});

describe('BuildHistory', () => {
  it('gibt bei undo den Gegenschritt und bei redo den Schritt selbst', () => {
    const history = new BuildHistory();
    expect(history.undo()).toBeNull();
    history.push(add('a', 1, 1));
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
    expect(history.undo()?.kind).toBe('remove');
    expect(history.canRedo).toBe(true);
    expect(history.redo()?.kind).toBe('add');
    expect(history.redo()).toBeNull();
  });

  it('vergisst das Wiederholbare, sobald etwas Neues gebaut wird', () => {
    const history = new BuildHistory();
    history.push(add('a', 1, 1));
    history.push(add('b', 2, 2));
    history.undo();
    expect(history.canRedo).toBe(true);
    history.push(add('c', 3, 3));
    expect(history.canRedo).toBe(false);
    expect(history.size).toBe(2);
  });

  it('nimmt ein Umstellen an den alten Platz gar nicht erst auf', () => {
    const history = new BuildHistory();
    history.push({ kind: 'move', path: 'a', from: pose(1, 1), to: pose(1, 1) });
    expect(history.canUndo).toBe(false);
    history.push({ kind: 'move', path: 'a', from: pose(1, 1, 0), to: pose(1, 1, Math.PI / 2) });
    expect(history.canUndo).toBe(true);
  });

  it('fasst eine Gruppe zu einem Schritt zusammen — auch geschachtelt', () => {
    const history = new BuildHistory();
    history.begin();
    history.push(add('a', 0, 0));
    history.begin();
    history.push(add('b', 1, 0));
    history.end();
    history.push(add('c', 2, 0));
    expect(history.canUndo).toBe(false);
    history.end();
    expect(history.size).toBe(1);
    const back = history.undo();
    expect(back?.kind).toBe('group');
    if (back?.kind === 'group') expect(back.steps).toHaveLength(3);
  });

  it('legt eine Gruppe aus einem Schritt als diesen einen ab, eine leere gar nicht', () => {
    const history = new BuildHistory();
    history.begin();
    history.end();
    expect(history.canUndo).toBe(false);
    history.begin();
    history.push(add('a', 0, 0));
    history.end();
    expect(history.undo()?.kind).toBe('remove');
  });

  it('ein end() zu viel schadet nicht', () => {
    const history = new BuildHistory();
    history.end();
    history.push(add('a', 0, 0));
    expect(history.size).toBe(1);
  });

  it('hält höchstens so viele Schritte, wie die Grenze sagt — der älteste fällt', () => {
    const history = new BuildHistory(3);
    for (let i = 0; i < 5; i++) history.push(add(`s${i}`, i, 0));
    expect(history.size).toBe(3);
    const paths: string[] = [];
    for (let step = history.undo(); step; step = history.undo())
      if (step.kind === 'remove') paths.push(step.item.path);
    expect(paths).toEqual(['s4', 's3', 's2']);
    expect(HISTORY_LIMIT).toBeGreaterThanOrEqual(50);
  });

  it('clear() leert beide Seiten', () => {
    const history = new BuildHistory();
    history.push(add('a', 0, 0));
    history.push(add('b', 0, 0));
    history.undo();
    history.clear();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });
});

describe('samePose', () => {
  it('sieht eine volle Umdrehung als dieselbe Drehung', () => {
    expect(samePose(pose(1, 2, 0), pose(1, 2, Math.PI * 2))).toBe(true);
    expect(samePose(pose(1, 2, 0), pose(1, 2, Math.PI / 4))).toBe(false);
    expect(samePose(pose(1, 2), pose(1.5, 2))).toBe(false);
  });
});

describe('nearestAt', () => {
  it('findet das nächste Stück in Reichweite — auch übereinander', () => {
    const spots = [
      { x: 0, y: 0.4, z: 0 },
      { x: 0, y: 0.9, z: 0 },
      { x: 3, y: 0.4, z: 0 },
    ];
    expect(nearestAt(spots, pose(0, 0, 0, 0.85))).toBe(1);
    expect(nearestAt(spots, pose(0.1, 0, 0, 0.4))).toBe(0);
    expect(nearestAt(spots, pose(1.5, 0))).toBe(-1);
    expect(nearestAt([], pose(0, 0))).toBe(-1);
  });
});

describe('describeStep', () => {
  it('sagt in Worten, was geschah', () => {
    const label = (path: string): string => path.toUpperCase();
    expect(describeStep(add('tisch', 0, 0), label)).toBe('TISCH gesetzt');
    expect(describeStep(invertStep(add('tisch', 0, 0)), label)).toBe('TISCH entfernt');
    expect(
      describeStep({ kind: 'move', path: 'bild', from: pose(0, 0), to: pose(1, 0) }, label),
    ).toBe('BILD verschoben');
    expect(describeStep({ kind: 'group', steps: [add('a', 0, 0), add('b', 1, 0)] }, label)).toBe(
      '2 Schritte',
    );
  });
});
