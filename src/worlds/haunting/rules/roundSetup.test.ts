import {
  SETUP_STORAGE,
  cycleMonster,
  defaultSetup,
  describeSetup,
  flatRoleOf,
  loadSetup,
  powersOf,
  presetFor,
  readSetup,
  roundKindOf,
  saveSetup,
} from './roundSetup';

describe('roundSetup', () => {
  test('der Anfang: Mensch als Techniker, Monster aus Zahlen, drei Bot-Plätze', () => {
    const setup = defaultSetup();
    expect(setup.technician).toBe('human');
    expect(setup.monster).toBe('bot');
    expect(setup.seats.map((s) => s.role)).toEqual(['archive', 'panel', 'scout']);
    expect(powersOf(setup)).toEqual({ scout: true, panel: true, archive: true });
  });

  test('ein Mensch auf dem Platz nimmt dem Techniker die Fähigkeit wieder ab', () => {
    const setup = defaultSetup();
    setup.seats[2] = { role: 'scout', who: 'human' };
    expect(powersOf(setup).scout).toBe(false);
    setup.seats.splice(1, 1);
    expect(powersOf(setup)).toEqual({ scout: false, panel: false, archive: true });
  });

  test('die Rolle in der 2D-Welt: Mensch als Techniker gewinnt, sonst Monster, sonst zusehen', () => {
    expect(flatRoleOf({ ...defaultSetup(), technician: 'human', monster: 'human' })).toBe(
      'technician',
    );
    expect(flatRoleOf({ ...defaultSetup(), technician: 'bot', monster: 'human' })).toBe('monster');
    expect(flatRoleOf({ ...defaultSetup(), technician: 'bot', monster: 'bot' })).toBe('bot');
    expect(flatRoleOf({ ...defaultSetup(), technician: 'bot', monster: 'off' })).toBe('bot');
  });

  test('die drei Rundenarten der 3D-Welt', () => {
    expect(roundKindOf({ ...defaultSetup(), technician: 'bot' })).toBe('bot');
    expect(roundKindOf({ ...defaultSetup(), monster: 'off' })).toBe('test');
    expect(roundKindOf(defaultSetup())).toBe('mission');
  });

  test('die Kacheln schreiben Techniker und Monster, lassen die Plätze aber stehen', () => {
    const setup = defaultSetup();
    setup.seats = [{ role: 'scout', who: 'human' }];
    expect(presetFor('bot', setup)).toMatchObject({ technician: 'bot', monster: 'bot' });
    expect(presetFor('test', setup)).toMatchObject({ technician: 'human', monster: 'off' });
    const mission = presetFor('mission', { ...setup, monster: 'human' });
    expect(mission).toMatchObject({ technician: 'human', monster: 'human' });
    expect(mission.seats).toEqual([{ role: 'scout', who: 'human' }]);
  });

  test('fremder Text wird gelesen, Unbekanntes ersetzt', () => {
    expect(readSetup(null)).toEqual(defaultSetup());
    expect(readSetup({ technician: 'alien', monster: 'off', seats: 'nope' })).toEqual({
      ...defaultSetup(),
      monster: 'off',
    });
    expect(
      readSetup({ seats: [{ role: 'panel', who: 'human' }, { role: 'x', who: 'y' }, 3] }),
    ).toMatchObject({
      seats: [
        { role: 'panel', who: 'human' },
        { role: 'archive', who: 'bot' },
      ],
    });
  });

  test('Speichern und Laden über einen Speicher, der auch fehlen darf', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };
    const setup = { ...defaultSetup(), monster: cycleMonster('bot') };
    saveSetup(setup, storage);
    expect(JSON.parse(store.get(SETUP_STORAGE)!)).toEqual(setup);
    expect(loadSetup(storage)).toEqual(setup);
    expect(loadSetup(null)).toEqual(defaultSetup());
    expect(loadSetup({ getItem: () => '{broken' })).toEqual(defaultSetup());
  });

  test('die Zusammenfassung nennt alle drei Teile', () => {
    expect(describeSetup(defaultSetup())).toBe(
      'Techniker: Mensch · Monster: Bot · Zentrale: Archivar (Bot), Schalttafel (Bot), Späher (Bot)',
    );
    expect(describeSetup({ ...defaultSetup(), seats: [] })).toMatch(/keine Plätze/);
  });
});
