import {
  NOT_IN_CENTRE,
  SETUP_STORAGE,
  VR_KEEPS_TECHNICIAN,
  crewSize,
  cycleAbility,
  cycleMonster,
  defaultSetup,
  describeSetup,
  flatRoleOf,
  humanAbilities,
  loadSetup,
  lockTechnician,
  powersOf,
  presetFor,
  readSetup,
  roleName,
  roundKindOf,
  saveSetup,
  switchRights,
  technicianLabel,
} from './roundSetup';

describe('roundSetup', () => {
  test('der Anfang: Mensch als Techniker, Monster aus Zahlen, drei Bot-Fähigkeiten', () => {
    const setup = defaultSetup();
    expect(setup.technician).toBe('human');
    expect(setup.monster).toBe('bot');
    expect(setup.abilities).toEqual({ scout: 'bot', panel: 'bot', archive: 'bot' });
    expect(powersOf(setup)).toEqual({ scout: true, panel: true, archive: true });
  });

  test('ein Mensch nimmt dem Techniker die Fähigkeit ab, „Aus" auch', () => {
    const setup = defaultSetup();
    setup.abilities.scout = 'human';
    expect(powersOf(setup).scout).toBe(false);
    setup.abilities.panel = 'off';
    expect(powersOf(setup)).toEqual({ scout: false, panel: false, archive: true });
    // „Aus" heißt: niemand hat sie — auch der Techniker nicht.
    expect(humanAbilities(setup)).toEqual(['scout']);
  });

  /**
   * Die Tafel der Namen. Sie steht im Doc-Kommentar von `roundSetup.ts` und
   * hier noch einmal als Zusage: Wer eine Mischung umbenennt, bricht einen
   * Test und nicht bloß eine Anzeige.
   */
  test('wie die Mischungen heißen', () => {
    expect(roleName([])).toBe('');
    expect(roleName(['scout'])).toBe('Späher');
    expect(roleName(['panel'])).toBe('Schalttafel');
    expect(roleName(['archive'])).toBe('Archiv');
    expect(roleName(['scout', 'panel'])).toBe('Einsatzkontrolle');
    expect(roleName(['archive', 'scout'])).toBe('Aufklärung');
    expect(roleName(['archive', 'panel'])).toBe('Leitstand');
    expect(roleName(['panel', 'archive', 'scout'])).toBe('Zentrale');
    // Eine Menge und keine Liste: Die Reihenfolge des Nehmens zählt nicht.
    expect(roleName(['panel', 'scout'])).toBe(roleName(['scout', 'panel']));
  });

  test('der Techniker gehört der Brille — und lässt sich dann nicht wegklicken', () => {
    const setup = { ...defaultSetup(), technician: 'bot' as const };
    expect(technicianLabel(setup, false)).toBe('Bot');
    expect(technicianLabel(setup, true)).toBe('VR');
    expect(lockTechnician(setup, true).technician).toBe('human');
    expect(lockTechnician(setup, false)).toBe(setup);
  });

  test('wer mitten in der Runde wechseln darf', () => {
    // Test-Runde: jeder alles, das ist ihr ganzer Zweck.
    expect(switchRights({ test: true, inCentre: false, vrTechnician: true })).toEqual({
      abilities: true,
      technician: true,
      why: '',
    });
    // Sonst nur aus der Zentrale heraus …
    expect(switchRights({ test: false, inCentre: false, vrTechnician: false })).toMatchObject({
      abilities: false,
      technician: false,
      why: NOT_IN_CENTRE,
    });
    // … und den Techniker in der Brille rührt niemand an.
    expect(switchRights({ test: false, inCentre: true, vrTechnician: true })).toMatchObject({
      abilities: true,
      technician: false,
      why: VR_KEEPS_TECHNICIAN,
    });
    expect(switchRights({ test: false, inCentre: true, vrTechnician: false })).toEqual({
      abilities: true,
      technician: true,
      why: '',
    });
  });

  test('die Rolle in der 2D-Welt: Mensch als Techniker gewinnt, sonst Monster, sonst zusehen', () => {
    expect(flatRoleOf({ ...defaultSetup(), technician: 'human', monster: 'human' })).toBe(
      'technician',
    );
    expect(flatRoleOf({ ...defaultSetup(), technician: 'bot', monster: 'human' })).toBe('monster');
    expect(flatRoleOf({ ...defaultSetup(), technician: 'bot', monster: 'bot' })).toBe('watch');
    expect(flatRoleOf({ ...defaultSetup(), technician: 'bot', monster: 'off' })).toBe('watch');
  });

  test('die drei Rundenarten der 3D-Welt', () => {
    expect(roundKindOf({ ...defaultSetup(), technician: 'bot' })).toBe('bot');
    expect(roundKindOf({ ...defaultSetup(), monster: 'off' })).toBe('test');
    expect(roundKindOf(defaultSetup())).toBe('mission');
  });

  test('wie viele mitspielen: Techniker, Monster und jede Fähigkeit, die an ist', () => {
    expect(crewSize(defaultSetup())).toBe(5);
    expect(crewSize({ ...defaultSetup(), monster: 'off' })).toBe(4);
    expect(
      crewSize({ ...defaultSetup(), abilities: { scout: 'human', panel: 'off', archive: 'off' } }),
    ).toBe(3);
  });

  test('die Rundenart schreibt Techniker und Monster, lässt die Fähigkeiten aber stehen', () => {
    const setup = {
      ...defaultSetup(),
      abilities: { scout: 'human', panel: 'off', archive: 'bot' },
    } as const;
    expect(presetFor('bot', setup)).toMatchObject({ technician: 'bot', monster: 'bot' });
    expect(presetFor('test', setup)).toMatchObject({ technician: 'human', monster: 'off' });
    const mission = presetFor('mission', { ...setup, monster: 'human' });
    expect(mission).toMatchObject({ technician: 'human', monster: 'human' });
    expect(mission.abilities).toEqual(setup.abilities);
  });

  test('fremder Text wird gelesen, Unbekanntes ersetzt', () => {
    expect(readSetup(null)).toEqual(defaultSetup());
    expect(readSetup({ technician: 'alien', monster: 'off', abilities: 'nope' })).toEqual({
      ...defaultSetup(),
      monster: 'off',
    });
    expect(readSetup({ abilities: { scout: 'human', panel: 'off', archive: 'x' } })).toMatchObject({
      abilities: { scout: 'human', panel: 'off', archive: 'bot' },
    });
  });

  /**
   * **Die alten Plätze im Speicher.** Wer das Update einspielt, hat dort noch
   * `seats` liegen; die Verteilung soll dabei nicht auf den Anfang
   * zurückfallen. Ein Mensch schlägt einen Bot, was nicht vorkam, ist aus.
   */
  test('alte Plätze aus dem Speicher werden zu Fähigkeiten', () => {
    expect(
      readSetup({
        seats: [
          { role: 'panel', who: 'human' },
          { role: 'panel', who: 'bot' },
          { role: 'archive', who: 'bot' },
        ],
      }).abilities,
    ).toEqual({ scout: 'off', panel: 'human', archive: 'bot' });
    // Ganz ohne Plätze: niemand in der Zentrale.
    expect(readSetup({ seats: [] }).abilities).toEqual({
      scout: 'off',
      panel: 'off',
      archive: 'off',
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

  test('eine Fähigkeit durchschalten: Bot → Mensch → Aus → Bot', () => {
    expect(cycleAbility('bot')).toBe('human');
    expect(cycleAbility('human')).toBe('off');
    expect(cycleAbility('off')).toBe('bot');
  });

  test('die Zusammenfassung nennt alle drei Teile', () => {
    expect(describeSetup(defaultSetup())).toBe(
      'Techniker: Mensch · Monster: Bot · Zentrale: Späher (Bot), Schalttafel (Bot), Archiv (Bot)',
    );
    expect(
      describeSetup({
        ...defaultSetup(),
        abilities: { scout: 'off', panel: 'off', archive: 'human' },
      }),
    ).toMatch(/Archiv \(Mensch\)/);
  });
});
