import {
  SHIP_KEEPS_ROLE,
  SETUP_STORAGE,
  VR_KEEPS_TECHNICIAN,
  abilityWho,
  botArchivist,
  crewSize,
  cycleTechnician,
  cycleWho,
  defaultSetup,
  describeSetup,
  flatRoleOf,
  goalPrecision,
  humanAbilities,
  loadSetup,
  lockTechnician,
  powersOf,
  presetFor,
  readSetup,
  roleName,
  roundKindOf,
  saveSetup,
  seatTitle,
  switchRights,
  technicianLabel,
  withPower,
  withWho,
} from './roundSetup';

describe('roundSetup', () => {
  test('der Anfang: ein Mensch im Anzug mit allen drei Fähigkeiten, die Stühle leer, das Monster aus Zahlen', () => {
    const setup = defaultSetup();
    expect(setup.seats.technician.who).toBe('human');
    expect(setup.seats.technician.powers).toEqual({ scout: true, panel: true, archive: true });
    for (const seat of ['red', 'yellow', 'blue'] as const) {
      expect(setup.seats[seat].who).toBe('off');
      expect(setup.seats[seat].powers).toEqual({ scout: false, panel: false, archive: false });
    }
    expect(setup.seats.monster.who).toBe('bot');
    expect(powersOf(setup)).toEqual({ scout: true, panel: true, archive: true });
  });

  /**
   * **Die Fähigkeiten hängen am Platz.** Der Techniker schaltet Lampen nur
   * mit eigener Schalttafel und sieht Ziele nur mit eigenem Archiv — was ein
   * anderer Platz hält, gibt ihm nichts. Nur das Horchbild eines Bot-Spähers
   * kommt bei ihm an: Melden ist die ganze Arbeit dieses Bots.
   */
  test('was der Techniker selbst bekommt — und was nicht', () => {
    let setup = defaultSetup();
    setup = withPower(setup, 'technician', 'panel', false);
    setup = withPower(setup, 'technician', 'archive', false);
    setup = withPower(setup, 'technician', 'scout', false);
    expect(powersOf(setup)).toEqual({ scout: false, panel: false, archive: false });
    expect(goalPrecision(setup)).toBe('none');
    // Ein Bot auf Rot mit Tafel und Archiv: Der Techniker schaltet trotzdem
    // nicht selbst und sieht keine Ziele — aber der Archivar funkt ihm.
    setup = withWho(setup, 'red', 'bot');
    setup = withPower(setup, 'red', 'panel', true);
    setup = withPower(setup, 'red', 'archive', true);
    expect(powersOf(setup)).toEqual({ scout: false, panel: false, archive: false });
    expect(botArchivist(setup)).toBe(true);
    // Der Bot-Späher meldet — das Horchbild kommt an.
    setup = withPower(setup, 'red', 'scout', true);
    expect(powersOf(setup).scout).toBe(true);
    // Ein Mensch auf Rot meldet selbst, per Zuruf: kein Horchbild, kein Funk.
    setup = withWho(setup, 'red', 'human');
    expect(powersOf(setup).scout).toBe(false);
    expect(botArchivist(setup)).toBe(false);
    // Mit eigenem Archiv leuchtet die Kiste wieder.
    setup = withPower(setup, 'technician', 'archive', true);
    expect(goalPrecision(setup)).toBe('crate');
  });

  test('wer eine Fähigkeit in der Zentrale hält: Mensch schlägt Bot schlägt niemand', () => {
    let setup = defaultSetup();
    expect(abilityWho(setup, 'scout')).toBe('off');
    setup = withWho(withPower(setup, 'yellow', 'scout', true), 'yellow', 'bot');
    expect(abilityWho(setup, 'scout')).toBe('bot');
    setup = withWho(withPower(setup, 'blue', 'scout', true), 'blue', 'human');
    expect(abilityWho(setup, 'scout')).toBe('human');
    expect(humanAbilities(setup)).toEqual(['scout']);
    // Ein ausgeschalteter Platz hält nichts, was er auch hält.
    setup = withWho(withWho(setup, 'blue', 'off'), 'yellow', 'off');
    expect(abilityWho(setup, 'scout')).toBe('off');
  });

  test('das Monster hält keine Fähigkeit — auch nicht, wenn man es versucht', () => {
    const setup = withPower(defaultSetup(), 'monster', 'archive', true);
    expect(setup.seats.monster.powers.archive).toBe(false);
  });

  /**
   * Die Tafel der Namen. Sie steht im Doc-Kommentar von `roundSetup.ts` und
   * hier noch einmal als Zusage: Wer eine Mischung umbenennt, bricht einen
   * Test und nicht bloß eine Anzeige.
   */
  test('wie die Mischungen heißen — und wie ein Stuhl damit gerufen wird', () => {
    expect(roleName([])).toBe('');
    expect(roleName(['scout'])).toBe('Späher');
    expect(roleName(['panel'])).toBe('Schalttafel');
    expect(roleName(['archive'])).toBe('Archiv');
    expect(roleName(['scout', 'panel'])).toBe('Einsatzkontrolle');
    expect(roleName(['archive', 'scout'])).toBe('Aufklärung');
    expect(roleName(['archive', 'panel'])).toBe('Leitstand');
    expect(roleName(['panel', 'archive', 'scout'])).toBe('Zentrale');
    expect(roleName(['panel', 'scout'])).toBe(roleName(['scout', 'panel']));
    let setup = defaultSetup();
    expect(seatTitle(setup, 'red')).toBe('Rot');
    setup = withPower(withPower(setup, 'red', 'panel', true), 'red', 'archive', true);
    expect(seatTitle(setup, 'red')).toBe('Rot · Leitstand');
  });

  test('der Techniker gehört der Brille — und lässt sich dann nicht wegklicken', () => {
    const setup = withWho(defaultSetup(), 'technician', 'bot');
    expect(technicianLabel(setup, false)).toBe('Bot');
    expect(technicianLabel(setup, true)).toBe('VR');
    expect(lockTechnician(setup, true).seats.technician.who).toBe('human');
    expect(lockTechnician(setup, false)).toBe(setup);
  });

  test('wer mitten in der Runde wechseln darf', () => {
    // Im Test jeder alles — auch der im Schiff.
    expect(switchRights({ test: true, inShip: true, vrTechnician: true })).toEqual({
      abilities: true,
      technician: true,
      why: '',
    });
    // Wer im Schiff den Anzug trägt, bleibt darin.
    expect(switchRights({ test: false, inShip: true, vrTechnician: false })).toMatchObject({
      abilities: false,
      technician: false,
      why: SHIP_KEEPS_ROLE,
    });
    // Alle anderen wechseln — nur den Techniker der Brille nimmt keiner.
    expect(switchRights({ test: false, inShip: false, vrTechnician: true })).toMatchObject({
      abilities: true,
      technician: false,
      why: VR_KEEPS_TECHNICIAN,
    });
    expect(switchRights({ test: false, inShip: false, vrTechnician: false })).toEqual({
      abilities: true,
      technician: true,
      why: '',
    });
  });

  test('die Rolle in der 2D-Welt kommt aus der eigenen Wahl', () => {
    const setup = defaultSetup();
    expect(flatRoleOf(setup, 'technician')).toBe('technician');
    expect(flatRoleOf(setup, 'monster')).toBe('monster');
    expect(flatRoleOf(setup, 'red')).toBe('watch');
    expect(flatRoleOf(setup, 'watch:all')).toBe('watch');
    // Wer sich Techniker nennt, während der Anzug ein Bot ist, sieht zu.
    expect(flatRoleOf(withWho(setup, 'technician', 'bot'), 'technician')).toBe('watch');
  });

  test('die drei Rundenarten der 3D-Welt', () => {
    expect(roundKindOf(withWho(defaultSetup(), 'technician', 'bot'))).toBe('bot');
    expect(roundKindOf(withWho(defaultSetup(), 'monster', 'off'))).toBe('test');
    expect(roundKindOf(defaultSetup())).toBe('mission');
  });

  test('wie viele mitspielen: Techniker, Monster und jeder Stuhl, der nicht leer ist', () => {
    expect(crewSize(defaultSetup())).toBe(2);
    expect(crewSize(withWho(defaultSetup(), 'monster', 'off'))).toBe(1);
    const three = withWho(withWho(defaultSetup(), 'red', 'human'), 'blue', 'bot');
    expect(crewSize(three)).toBe(4);
  });

  test('die Rundenart schreibt Techniker und Monster, lässt die Stühle aber stehen', () => {
    const setup = withPower(withWho(defaultSetup(), 'red', 'human'), 'red', 'scout', true);
    expect(presetFor('bot', setup).seats).toMatchObject({
      technician: { who: 'bot' },
      monster: { who: 'bot' },
    });
    expect(presetFor('test', setup).seats).toMatchObject({
      technician: { who: 'human' },
      monster: { who: 'off' },
    });
    const mission = presetFor('mission', withWho(setup, 'monster', 'human'));
    expect(mission.seats).toMatchObject({
      technician: { who: 'human' },
      monster: { who: 'human' },
    });
    expect(mission.seats.red).toEqual(setup.seats.red);
  });

  test('fremder Text wird gelesen, Unbekanntes ersetzt', () => {
    expect(readSetup(null)).toEqual(defaultSetup());
    expect(readSetup({ seats: { red: { who: 'alien', powers: 'nope' } } })).toEqual(defaultSetup());
    const read = readSetup({
      seats: { blue: { who: 'human', powers: { scout: true, archive: 'x' } } },
    });
    expect(read.seats.blue).toEqual({
      who: 'human',
      powers: { scout: true, panel: false, archive: false },
    });
  });

  /**
   * **Die alten Fassungen im Speicher.** Wer das Update einspielt, hat dort
   * `{technician, monster, abilities}` liegen, und davor `seats: [{role,
   * who}]`. Ein Bot auf einer Fähigkeit hieß „der Techniker bekommt sie
   * selbst" — also landet sie auf seinem Platz; ein Mensch bekommt den ersten
   * freien Stuhl; aus bleibt aus.
   */
  test('die alte Verteilung wird zu Plätzen übersetzt', () => {
    const read = readSetup({
      technician: 'bot',
      monster: 'off',
      abilities: { scout: 'bot', panel: 'human', archive: 'off' },
    });
    expect(read.seats.technician).toEqual({
      who: 'bot',
      powers: { scout: true, panel: false, archive: false },
    });
    expect(read.seats.red).toEqual({
      who: 'human',
      powers: { scout: false, panel: true, archive: false },
    });
    expect(read.seats.yellow.who).toBe('off');
    expect(read.seats.monster.who).toBe('off');
    const older = readSetup({
      seats: [
        { role: 'panel', who: 'human' },
        { role: 'panel', who: 'bot' },
        { role: 'archive', who: 'bot' },
      ],
    });
    expect(older.seats.technician.powers).toEqual({ scout: false, panel: false, archive: true });
    expect(older.seats.red).toMatchObject({ who: 'human', powers: { panel: true } });
  });

  test('Speichern und Laden über einen Speicher, der auch fehlen darf', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };
    const setup = withWho(defaultSetup(), 'monster', 'human');
    saveSetup(setup, storage);
    expect(JSON.parse(store.get(SETUP_STORAGE)!)).toEqual(setup);
    expect(loadSetup(storage)).toEqual(setup);
    expect(loadSetup(null)).toEqual(defaultSetup());
    expect(loadSetup({ getItem: () => '{broken' })).toEqual(defaultSetup());
  });

  test('einen Platz durchschalten: Mensch → Bot → Aus → Mensch; der Techniker kennt kein Aus', () => {
    expect(cycleWho('human')).toBe('bot');
    expect(cycleWho('bot')).toBe('off');
    expect(cycleWho('off')).toBe('human');
    expect(cycleTechnician('human')).toBe('bot');
    expect(cycleTechnician('bot')).toBe('human');
  });

  test('die Zusammenfassung nennt alle fünf Plätze', () => {
    expect(describeSetup(defaultSetup())).toBe(
      'Techniker: Mensch · Späher + Schalttafel + Archiv · Rot: Aus · Gelb: Aus · Blau: Aus · Monster: Bot',
    );
    const shared = withPower(withWho(defaultSetup(), 'blue', 'human'), 'blue', 'archive', true);
    expect(describeSetup(shared)).toMatch(/Blau: Mensch · Archiv/);
  });
});
