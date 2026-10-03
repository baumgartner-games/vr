import {
  INITIAL_STATE,
  SLOTS,
  cleanState,
  deleteSaved,
  firstFree,
  loadSaved,
  newPalette,
  palettes,
  refKind,
  rename,
  resetPalettesForTest,
  saveCurrent,
  setSlot,
  updatePalettes,
} from './paintPalettes';

const chair = { ref: 'element:chair', label: 'Stuhl' };
const barrel = { ref: 'model:kaykit/barrel.glb', label: 'Fass' };
const cube = { ref: 'prop:cube', label: 'Würfel' };

describe('die Malpalette', () => {
  it('hat neun leere Fächer', () => {
    expect(INITIAL_STATE.current.slots).toHaveLength(SLOTS);
    expect(firstFree(INITIAL_STATE.current.slots)).toBe(0);
  });

  it('kennt drei Arten von Dingen', () => {
    expect(refKind(chair.ref)).toBe('element');
    expect(refKind(barrel.ref)).toBe('model');
    expect(refKind(cube.ref)).toBe('prop');
    expect(refKind('kaykit:x')).toBeNull();
    expect(refKind('element:')).toBeNull();
  });

  it('legt ab, speichert, lädt und fängt neu an', () => {
    let s = setSlot(INITIAL_STATE, 0, chair);
    s = setSlot(s, 4, barrel);
    expect(firstFree(s.current.slots)).toBe(1);
    s = rename(s, '  Küche  ');
    expect(s.current.name).toBe('Küche');

    s = saveCurrent(s);
    expect(s.saved).toHaveLength(1);
    expect(s.from).toBe(0);
    // Noch einmal speichern schreibt über dieselbe.
    s = saveCurrent(setSlot(s, 8, cube));
    expect(s.saved).toHaveLength(1);
    expect(s.saved[0]!.slots[8]).toEqual(cube);

    s = newPalette(s);
    expect(s.current.slots.every((slot) => slot === null)).toBe(true);
    expect(s.from).toBeNull();
    expect(s.current.name).toBe('Palette 2');
    s = saveCurrent(setSlot(s, 0, cube));
    expect(s.saved).toHaveLength(2);

    s = loadSaved(s, 0);
    expect(s.current.name).toBe('Küche');
    expect(s.current.slots[4]).toEqual(barrel);
    // Ändern ändert nur die aktuelle, nicht die gespeicherte.
    s = setSlot(s, 4, null);
    expect(s.saved[0]!.slots[4]).toEqual(barrel);

    s = deleteSaved(s, 0);
    expect(s.saved).toHaveLength(1);
    expect(s.from).toBeNull();
  });

  it('macht aus Unsinn einen brauchbaren Stand', () => {
    expect(cleanState(null)).toEqual(INITIAL_STATE);
    const state = cleanState({
      current: { name: 'X', slots: [chair, { ref: 'unsinn' }, 3] },
      from: 7,
      saved: [{ slots: [cube] }],
    });
    expect(state.current.slots).toHaveLength(SLOTS);
    expect(state.current.slots[0]).toEqual(chair);
    expect(state.current.slots[1]).toBeNull();
    expect(state.from).toBeNull();
    expect(state.saved[0]!.name).toBe('Palette 1');
  });

  it('merkt sich den Stand im Browser', () => {
    const store = new Map<string, string>();
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
    });
    try {
      resetPalettesForTest();
      updatePalettes((s) => setSlot(s, 2, chair));
      resetPalettesForTest();
      expect(palettes().current.slots[2]).toEqual(chair);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
      resetPalettesForTest();
    }
  });
});
