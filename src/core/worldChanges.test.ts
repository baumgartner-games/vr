import {
  changeKey,
  clearWorldChanges,
  formatChanges,
  parseChanges,
  recordFurniture,
  recordModel,
  resetWorldChangesForTest,
  setTrackingChanges,
  trackingChanges,
  worldChanges,
} from './worldChanges';

describe('worldChanges', () => {
  beforeEach(() => resetWorldChangesForTest());

  it('writes nothing down while the box is unticked', () => {
    expect(trackingChanges()).toBe(false);
    recordFurniture(changeKey('k'), 'stove', { x: 1, z: 0, turn: 0 }, { x: 4, z: 5, turn: 2 });
    expect(worldChanges()).toEqual([]);
  });

  it('keeps a balance, not a log: three moves of one stove are one change', () => {
    setTrackingChanges(true);
    const stove = changeKey('k');
    recordFurniture(stove, 'stove', { x: 1, z: 0, turn: 0 }, { x: 2, z: 2, turn: 1 });
    recordFurniture(stove, 'stove', { x: 2, z: 2, turn: 1 }, { x: 3, z: 3, turn: 1 });
    recordFurniture(stove, 'stove', { x: 3, z: 3, turn: 1 }, { x: 4, z: 5, turn: 2 });
    expect(worldChanges()).toEqual([
      {
        kind: 'furniture',
        piece: 'stove',
        from: { x: 1, z: 0, turn: 0 },
        to: { x: 4, z: 5, turn: 2 },
      },
    ]);
  });

  it('forgets a move that ends where it started', () => {
    setTrackingChanges(true);
    const stove = changeKey('k');
    recordFurniture(stove, 'stove', { x: 1, z: 0, turn: 0 }, { x: 4, z: 5, turn: 2 });
    recordFurniture(stove, 'stove', { x: 4, z: 5, turn: 2 }, { x: 1, z: 0, turn: 0 });
    expect(worldChanges()).toEqual([]);
  });

  it('keeps a piece fresh from the catalogue as new, however often it moves', () => {
    setTrackingChanges(true);
    const bin = changeKey('k');
    recordFurniture(bin, 'trash', null, { x: 2, z: 2, turn: 0 });
    recordFurniture(bin, 'trash', { x: 2, z: 2, turn: 0 }, { x: 6, z: 7, turn: 3 });
    expect(worldChanges()).toEqual([
      { kind: 'furniture', piece: 'trash', from: null, to: { x: 6, z: 7, turn: 3 } },
    ]);
  });

  it('gives two pieces two keys, even with the same name', () => {
    expect(changeKey('k')).not.toBe(changeKey('k'));
  });

  it('copies as text and pastes back to the same list, chat noise around it included', () => {
    setTrackingChanges(true);
    recordFurniture(changeKey('k'), 'stove', { x: 1, z: 0, turn: 0 }, { x: 4, z: 5, turn: 2 });
    recordFurniture(changeKey('k'), 'trash', null, { x: 6, z: 7, turn: 3 });
    recordModel(changeKey('m'), 'block-bits/barrel.glb', { x: 12.504, y: 0, z: -3.5 }, 89.7);
    const list = worldChanges();
    const text = formatChanges(list);
    expect(text.split('\n')[0]).toContain('Weltänderungen · 3');
    expect(parseChanges(`Hier meine Änderungen:\n${text}\nDanke!`)).toEqual(list);
    expect(list[2]).toEqual({
      kind: 'model',
      path: 'block-bits/barrel.glb',
      at: { x: 12.5, y: 0, z: -3.5 },
      yaw: 90,
    });
  });

  it('pastes what fits and drops what does not, and nothing from plain text', () => {
    expect(parseChanges('nichts drin')).toBeNull();
    expect(
      parseChanges('[{"kitchen":"stove","from":null,"to":[1,2,5]},{"kitchen":"x","to":"hier"},7]'),
    ).toEqual([{ kind: 'furniture', piece: 'stove', from: null, to: { x: 1, z: 2, turn: 1 } }]);
  });

  it('clears the list and leaves the tick where it was', () => {
    setTrackingChanges(true);
    recordFurniture(changeKey('k'), 'stove', null, { x: 4, z: 5, turn: 2 });
    clearWorldChanges();
    expect(worldChanges()).toEqual([]);
    expect(trackingChanges()).toBe(true);
  });
});
