import {
  INTENTS,
  LOBBY_STORAGE,
  applyIntent,
  arriveAs,
  defaultLobby,
  intentOf,
  loadLobby,
  readLobby,
  saveLobby,
  startLabel,
} from './lobby';
import { defaultSetup, withPower, withWho } from './roundSetup';

/** Ein Speicher, der nur ein paar Zeilen hält — und einer, der kaputt ist. */
function fakeStorage(
  entries: Record<string, string> = {},
): Storage & { store: Map<string, string> } {
  const store = new Map(Object.entries(entries));
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  } as unknown as Storage & { store: Map<string, string> };
}

describe('lobby', () => {
  test('der Anfang: spielen — und das Telefon sieht zu', () => {
    expect(defaultLobby('handheld')).toEqual({ intent: 'play', me: 'watch:technician' });
    expect(defaultLobby('desktop')).toEqual({ intent: 'play', me: 'technician' });
    expect(defaultLobby('vr')).toEqual({ intent: 'play', me: 'technician' });
  });

  test('spielen als Techniker: ich am Stock, Monster an — ein ausgeschaltetes kommt zurück', () => {
    const setup = withWho(withWho(defaultSetup(), 'technician', 'bot'), 'monster', 'off');
    expect(applyIntent(setup, 'play').seats).toMatchObject({
      technician: { who: 'human' },
      monster: { who: 'bot' },
    });
    // Ein Mensch am Monster-Telefon bleibt einer.
    expect(applyIntent(withWho(setup, 'monster', 'human'), 'play').seats).toMatchObject({
      technician: { who: 'human' },
      monster: { who: 'human' },
    });
  });

  test('spielen als Monster: der Techniker kommt aus Zahlen', () => {
    expect(applyIntent(defaultSetup(), 'play', 'monster').seats).toMatchObject({
      technician: { who: 'bot' },
      monster: { who: 'human' },
    });
  });

  test('spielen aus der Zentrale: die Tafel sagt, wer den Anzug trägt', () => {
    // Ein Telefon auf Rot rührt Techniker und Monster nicht an — wer den Anzug
    // trägt, steht auf der Tafel (ein Mensch an der Brille, sonst ein Bot).
    const setup = withWho(defaultSetup(), 'technician', 'bot');
    expect(applyIntent(setup, 'play', 'red').seats.technician.who).toBe('bot');
    expect(applyIntent(setup, 'play', 'watch:all').seats.technician.who).toBe('bot');
    expect(applyIntent(defaultSetup(), 'play', 'red').seats.technician.who).toBe('human');
  });

  test('zuschauen: beide aus Zahlen — außer es sitzt jemand anders dort', () => {
    expect(applyIntent(defaultSetup(), 'watch').seats).toMatchObject({
      technician: { who: 'bot' },
      monster: { who: 'bot' },
    });
    // Der Mensch am Monster-Telefon ist nicht ich: Ihm nehme ich die Runde nicht weg.
    expect(applyIntent(withWho(defaultSetup(), 'monster', 'human'), 'watch').seats).toMatchObject({
      technician: { who: 'bot' },
      monster: { who: 'human' },
    });
    // Ohne Monster gibt es nichts zu sehen — Zuschauen schaltet es wieder an.
    expect(applyIntent(withWho(defaultSetup(), 'monster', 'off'), 'watch').seats.monster.who).toBe(
      'bot',
    );
  });

  test('trainieren heißt nur: kein Monster — das Häkchen „Testen" ist die Tafel', () => {
    const trained = applyIntent(withWho(defaultSetup(), 'technician', 'bot'), 'train');
    expect(trained.seats).toMatchObject({
      technician: { who: 'human' },
      monster: { who: 'off' },
    });
  });

  test('keine der drei Absichten rührt die Stühle der Zentrale an', () => {
    let setup = withWho(withPower(defaultSetup(), 'red', 'archive', true), 'red', 'human');
    setup = withWho(withPower(setup, 'blue', 'scout', true), 'blue', 'bot');
    for (const intent of INTENTS) {
      const next = applyIntent(setup, intent);
      expect(next.seats.red).toEqual(setup.seats.red);
      expect(next.seats.yellow).toEqual(setup.seats.yellow);
      expect(next.seats.blue).toEqual(setup.seats.blue);
    }
  });

  test('die Absicht liest sich aus der Verteilung wieder heraus', () => {
    expect(intentOf(defaultSetup())).toBe('play');
    expect(intentOf(withWho(defaultSetup(), 'monster', 'off'))).toBe('train');
    expect(intentOf(withWho(defaultSetup(), 'technician', 'bot'))).toBe('watch');
    // Techniker aus Zahlen, Monster aus Fleisch: Das spielt jemand, das sieht niemand an.
    expect(
      intentOf(withWho(withWho(defaultSetup(), 'technician', 'bot'), 'monster', 'human')),
    ).toBe('play');
    for (const intent of INTENTS)
      expect(intentOf(applyIntent(defaultSetup(), intent))).toBe(intent);
  });

  test('der Startknopf sagt, was die Verteilung tut — und nur das', () => {
    const setup = defaultSetup();
    expect(startLabel(setup)).toBe('Echte Runde starten');
    expect(startLabel(applyIntent(setup, 'train'))).toBe('Übungsrunde starten');
    expect(startLabel(applyIntent(setup, 'watch'))).toBe('Bots spielen lassen');
    expect(startLabel(withWho(setup, 'monster', 'off'))).toBe('Übungsrunde starten');
  });

  test('fremder Text wird gelesen, Unbekanntes ersetzt — und ein altes Feld für die Ansicht vergessen', () => {
    expect(readLobby(null)).toEqual({ intent: 'play', me: 'technician' });
    expect(readLobby(null, 'handheld')).toEqual({ intent: 'play', me: 'watch:technician' });
    // Die Karte von oben ist weg; ein gemerktes `view` reist nicht mehr mit.
    expect(readLobby({ intent: 'watch', view: '2d', me: 'red' })).toEqual({
      intent: 'watch',
      me: 'red',
    });
    expect(readLobby({ intent: 'zuhause', view: '4d', me: 'drone' })).toEqual({
      intent: 'play',
      me: 'technician',
    });
    expect(readLobby('kein Objekt')).toEqual({ intent: 'play', me: 'technician' });
  });

  test('aus dem Speicher gelesen, in den Speicher geschrieben', () => {
    const storage = fakeStorage();
    expect(loadLobby(storage)).toEqual({ intent: 'play', me: 'technician' });
    saveLobby({ intent: 'train', me: 'blue' }, storage);
    expect(loadLobby(storage)).toEqual({ intent: 'train', me: 'blue' });
    expect(JSON.parse(storage.store.get(LOBBY_STORAGE) ?? 'null')).toEqual({
      intent: 'train',
      me: 'blue',
    });
  });

  test('Speicher fehlt oder ist kaputt: dann eben von vorn', () => {
    expect(loadLobby(null)).toEqual({ intent: 'play', me: 'technician' });
    expect(loadLobby(null, 'handheld')).toEqual({ intent: 'play', me: 'watch:technician' });
    expect(loadLobby(fakeStorage({ [LOBBY_STORAGE]: '{kaputt' }))).toEqual({
      intent: 'play',
      me: 'technician',
    });
    const angry = {
      getItem() {
        throw new Error('kein Speicher in diesem Fenster');
      },
      setItem() {
        throw new Error('kein Speicher in diesem Fenster');
      },
    } as unknown as Storage;
    expect(loadLobby(angry, 'handheld')).toEqual({ intent: 'play', me: 'watch:technician' });
    expect(() => saveLobby({ intent: 'play', me: 'red' }, angry)).not.toThrow();
  });
});

/**
 * **Die zwei Web-Wege der Startseite** (`arriveAs`): „Web 3D" heißt Techniker
 * im Schiff, „2D Einsatzzentrale" heißt ein Platz in der Zentrale. Eine
 * Ansicht wählt die Lobby seit dem 1-m-Gitter nicht mehr — von oben oder aus
 * den Augen ist _Menü → Ansicht_, wie in jeder Welt.
 */
describe('arriveAs', () => {
  test('„Web 3D" macht dieses Gerät zum Techniker im Schiff — egal, was es war', () => {
    expect(arriveAs({ ...defaultLobby('handheld') }, 'technician')).toMatchObject({
      me: 'technician',
    });
    expect(arriveAs({ ...defaultLobby('desktop'), me: 'red' }, 'technician').me).toBe('technician');
  });

  test('die 2D-Zentrale lässt einen gemerkten Platz stehen', () => {
    expect(arriveAs({ ...defaultLobby('handheld'), me: 'red' }, 'centre').me).toBe('red');
    expect(arriveAs({ ...defaultLobby('handheld'), me: 'monster' }, 'centre').me).toBe('monster');
    expect(arriveAs({ ...defaultLobby('desktop'), me: 'watch:all' }, 'centre')).toMatchObject({
      me: 'watch:all',
    });
  });

  test('wer als Techniker gemerkt war, fängt in der Zentrale wie ein Telefon an', () => {
    const choice = defaultLobby('desktop');
    expect(choice.me).toBe('technician');
    expect(arriveAs(choice, 'centre')).toEqual({ ...choice, me: 'watch:technician' });
  });

  test('die Absicht bleibt, wie sie war', () => {
    const choice = { ...defaultLobby('desktop'), intent: 'train' as const };
    expect(arriveAs(choice, 'technician')).toEqual({ ...choice, me: 'technician' });
    expect(arriveAs(choice, 'centre')).toEqual({ ...choice, me: 'watch:technician' });
  });
});
