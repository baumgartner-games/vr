import {
  changeKey,
  clearWorldChanges,
  describeNote,
  forgetChange,
  formatChanges,
  notesIn,
  parseChanges,
  recordElement,
  recordFurniture,
  recordModel,
  recordNote,
  resetWorldChangesForTest,
  setTrackingChanges,
  trackingChanges,
  worldChanges,
} from './worldChanges';

/** Ein Speicher wie der des Browsers, für die Zeit eines Tests. */
function fakeStorage(): { restore(): void; raw(): string | null } {
  const data = new Map<string, string>();
  const was = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    },
  });
  return {
    raw: () => data.get('vr-weltaenderungen') ?? null,
    restore: () => {
      if (was) Object.defineProperty(globalThis, 'localStorage', was);
      else delete (globalThis as { localStorage?: unknown }).localStorage;
    },
  };
}

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

  describe('world and notes (Zettel)', () => {
    it('writes the world onto a model and reads lists without one', () => {
      setTrackingChanges(true);
      recordModel(
        changeKey('m'),
        'block-bits/barrel.glb',
        { x: 1, y: 0, z: 2 },
        0,
        'test-restaurant',
      );
      const [model] = worldChanges();
      expect(model).toEqual({
        kind: 'model',
        path: 'block-bits/barrel.glb',
        at: { x: 1, y: 0, z: 2 },
        yaw: 0,
        world: 'test-restaurant',
      });
      expect(formatChanges(worldChanges())).toContain('"world":"test-restaurant"');
      // Eine alte Liste, von vor der Welt: dieselbe Zeile, nur ohne sie.
      expect(parseChanges('[{"model":"block-bits/barrel.glb","at":[1,0,2],"yaw":0}]')).toEqual([
        { kind: 'model', path: 'block-bits/barrel.glb', at: { x: 1, y: 0, z: 2 }, yaw: 0 },
      ]);
    });

    it('records a note even with the box unticked, and one text edit is still one line', () => {
      expect(trackingChanges()).toBe(false);
      const key = changeKey('note');
      recordNote(key, 'Kartoffel', { x: 3.504, y: 0.3, z: 7.5 }, 89.6, 'test-restaurant');
      recordNote(key, 'Kartoffel-Vorrat', { x: 3.5, y: 0.3, z: 7.5 }, 90, 'test-restaurant');
      expect(worldChanges()).toEqual([
        {
          kind: 'note',
          text: 'Kartoffel-Vorrat',
          at: { x: 3.5, y: 0.3, z: 7.5 },
          yaw: 90,
          world: 'test-restaurant',
        },
      ]);
    });

    it('moves a note on the same line', () => {
      const key = changeKey('note');
      recordNote(key, 'Kasse', { x: 1, y: 0, z: 1 }, 0, 'test-restaurant');
      recordNote(key, 'Kasse', { x: 4, y: 0, z: 2 }, 180, 'test-restaurant');
      expect(worldChanges()).toHaveLength(1);
      expect(worldChanges()[0]).toMatchObject({ at: { x: 4, y: 0, z: 2 }, yaw: 180 });
    });

    it('drops the line of a deleted note, also with the box unticked', () => {
      const key = changeKey('note');
      recordNote(key, 'weg damit', { x: 1, y: 0, z: 1 }, 0, 'test-restaurant');
      forgetChange(key);
      expect(worldChanges()).toEqual([]);
      // Und ein Zettel, der leer wird, hat keine Zeile mehr.
      const other = changeKey('note');
      recordNote(other, 'erst', { x: 1, y: 0, z: 1 }, 0, 'test-restaurant');
      recordNote(other, '   ', { x: 1, y: 0, z: 1 }, 0, 'test-restaurant');
      expect(worldChanges()).toEqual([]);
    });

    it('copies notes as a readable sentence and as a row that pastes back', () => {
      setTrackingChanges(true);
      recordModel(
        changeKey('m'),
        'block-bits/barrel.glb',
        { x: 2, y: 0, z: 2 },
        0,
        'test-restaurant',
      );
      recordNote(
        changeKey('note'),
        'Kartoffel-Vorrat\nhier [links]',
        { x: 3.5, y: 0.3, z: 7.5 },
        90,
        'test-restaurant',
      );
      const list = worldChanges();
      const text = formatChanges(list);
      expect(text).toContain(
        'Zettel „Kartoffel-Vorrat / hier (links)" bei (3.5, 0.3, 7.5) · 90° · in test-restaurant',
      );
      expect(text).toContain('"note":"Kartoffel-Vorrat\\nhier [links]"');
      // Die eckigen Klammern im Text des Zettels verwirren das Zurücklesen nicht.
      expect(parseChanges(`Bitte umsetzen:\n${text}\nDanke`)).toEqual(list);
    });

    it('describes a note without a world without one', () => {
      expect(describeNote({ kind: 'note', text: 'Tür', at: { x: 0, y: 0, z: 1 }, yaw: 0 })).toBe(
        'Zettel „Tür" bei (0, 0, 1) · 0°',
      );
    });

    it('hands back only the notes of the world that is entered, with their keys', () => {
      const here = changeKey('note');
      recordNote(here, 'hier', { x: 1, y: 0, z: 1 }, 0, 'test-restaurant');
      recordNote(changeKey('note'), 'dort', { x: 2, y: 0, z: 2 }, 0, 'haunting');
      setTrackingChanges(true);
      recordModel(
        changeKey('m'),
        'block-bits/barrel.glb',
        { x: 2, y: 0, z: 2 },
        0,
        'test-restaurant',
      );
      expect(notesIn('test-restaurant')).toEqual([
        {
          key: here,
          note: {
            kind: 'note',
            text: 'hier',
            at: { x: 1, y: 0, z: 1 },
            yaw: 0,
            world: 'test-restaurant',
          },
        },
      ]);
      expect(notesIn('portal')).toEqual([]);
    });

    it('keeps notes when the list is cleared, and drops them on a full reset', () => {
      setTrackingChanges(true);
      recordModel(
        changeKey('m'),
        'block-bits/barrel.glb',
        { x: 2, y: 0, z: 2 },
        0,
        'test-restaurant',
      );
      recordNote(changeKey('note'), 'bleibt', { x: 1, y: 0, z: 1 }, 0, 'test-restaurant');
      clearWorldChanges();
      expect(worldChanges().map((change) => change.kind)).toEqual(['note']);
      clearWorldChanges({ notes: true });
      expect(worldChanges()).toEqual([]);
    });

    it('survives a reload: saved in the browser, read back under the same key', () => {
      const storage = fakeStorage();
      try {
        const key = changeKey('note');
        recordNote(key, 'Kartoffel-Vorrat', { x: 3.5, y: 0.3, z: 7.5 }, 90, 'test-restaurant');
        expect(storage.raw()).toContain('"note":"Kartoffel-Vorrat"');
        // Neu laden: der Speicher bleibt, alles andere fängt von vorn an.
        resetWorldChangesForTest();
        expect(notesIn('test-restaurant')).toEqual([
          {
            key,
            note: {
              kind: 'note',
              text: 'Kartoffel-Vorrat',
              at: { x: 3.5, y: 0.3, z: 7.5 },
              yaw: 90,
              world: 'test-restaurant',
            },
          },
        ]);
        // Und eine Zeile aus der Zeit vor den Welten liest sich auch.
        globalThis.localStorage.setItem(
          'vr-weltaenderungen',
          JSON.stringify({
            on: true,
            list: [['model:alt:1', { model: 'block-bits/barrel.glb', at: [1, 0, 2], yaw: 0 }]],
          }),
        );
        resetWorldChangesForTest();
        expect(worldChanges()).toEqual([
          { kind: 'model', path: 'block-bits/barrel.glb', at: { x: 1, y: 0, z: 2 }, yaw: 0 },
        ]);
        expect(trackingChanges()).toBe(true);
      } finally {
        storage.restore();
      }
    });
  });

  describe('Spielelemente aus dem Möbelkatalog', () => {
    it('writes an element as a plan line and pastes it back, only with the box ticked', () => {
      recordElement(changeKey('element'), 'board', 4, 2, 'N', 'test-restaurant');
      expect(worldChanges()).toEqual([]);
      setTrackingChanges(true);
      recordElement(changeKey('element'), 'board', 4, 2, 'N', 'test-restaurant');
      recordElement(changeKey('element'), 'hob', -1, 0, 'S');
      const text = formatChanges(worldChanges());
      expect(text).toContain(
        '{"element":"board","x":4,"z":2,"face":"N","world":"test-restaurant"}',
      );
      expect(parseChanges(text)).toEqual([
        { kind: 'element', element: 'board', x: 4, z: 2, face: 'N', world: 'test-restaurant' },
        { kind: 'element', element: 'hob', x: -1, z: 0, face: 'S' },
      ]);
    });

    it('reads an element without a face as facing south, and drops broken rows', () => {
      expect(
        parseChanges(
          '[{"element":"sink","x":1,"z":2},{"element":"sink","x":1.5,"z":2},{"element":"sink","x":1,"z":2,"face":"Q"}]',
        ),
      ).toEqual([{ kind: 'element', element: 'sink', x: 1, z: 2, face: 'S' }]);
    });
  });
});
