import {
  FLAT_STORAGE,
  INTENTS,
  LOBBY_STORAGE,
  applyIntent,
  defaultLobby,
  intentOf,
  loadLobby,
  readLobby,
  saveLobby,
  startLabel,
  viewSwap,
} from './lobby';
import { defaultSetup, type RoundSetup } from './roundSetup';

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
  test('der Anfang: spielen, und die Ansicht hängt am Gerät', () => {
    expect(defaultLobby('handheld')).toEqual({ intent: 'play', view: '2d' });
    expect(defaultLobby('desktop')).toEqual({ intent: 'play', view: '3d' });
    expect(defaultLobby('vr')).toEqual({ intent: 'play', view: '3d' });
  });

  test('spielen: ich am Stock, Monster an — ein ausgeschaltetes kommt zurück', () => {
    const setup: RoundSetup = { ...defaultSetup(), technician: 'bot', monster: 'off' };
    expect(applyIntent(setup, 'play')).toMatchObject({ technician: 'human', monster: 'bot' });
    // Ein Mensch am Monster-Telefon bleibt einer.
    expect(applyIntent({ ...setup, monster: 'human' }, 'play')).toMatchObject({
      technician: 'human',
      monster: 'human',
    });
  });

  test('spielen als Monster: der Techniker kommt aus Zahlen', () => {
    expect(applyIntent(defaultSetup(), 'play', 'monster')).toMatchObject({
      technician: 'bot',
      monster: 'human',
    });
  });

  test('zuschauen: beide aus Zahlen — außer es sitzt jemand anders dort', () => {
    expect(applyIntent(defaultSetup(), 'watch')).toMatchObject({
      technician: 'bot',
      monster: 'bot',
    });
    // Der Mensch am Monster-Telefon ist nicht ich: Ihm nehme ich die Runde nicht weg.
    expect(applyIntent({ ...defaultSetup(), monster: 'human' }, 'watch')).toMatchObject({
      technician: 'bot',
      monster: 'human',
    });
    // War ich selbst das Monster, stehe ich auf — der Techniker aus Fleisch
    // spielt weiter, und genau seiner Runde sehe ich zu.
    expect(applyIntent({ ...defaultSetup(), monster: 'human' }, 'watch', 'monster')).toMatchObject({
      technician: 'human',
      monster: 'bot',
    });
    // Ohne Monster gibt es nichts zu sehen — Zuschauen schaltet es wieder an.
    expect(applyIntent({ ...defaultSetup(), monster: 'off' }, 'watch').monster).toBe('bot');
  });

  test('trainieren: Monster aus, ich am Stock', () => {
    const trained = applyIntent({ ...defaultSetup(), technician: 'bot' }, 'train');
    expect(trained).toMatchObject({ technician: 'human', monster: 'off' });
  });

  test('keine der drei Absichten rührt die Fähigkeiten der Zentrale an', () => {
    const setup: RoundSetup = {
      ...defaultSetup(),
      abilities: { archive: 'human', scout: 'bot', panel: 'off' },
    };
    for (const intent of INTENTS)
      expect(applyIntent(setup, intent).abilities).toEqual(setup.abilities);
  });

  test('die Absicht liest sich aus der Verteilung wieder heraus', () => {
    expect(intentOf(defaultSetup())).toBe('play');
    expect(intentOf({ ...defaultSetup(), monster: 'off' })).toBe('train');
    expect(intentOf({ ...defaultSetup(), technician: 'bot' })).toBe('watch');
    // Techniker aus Zahlen, Monster aus Fleisch: Das spielt jemand, das sieht niemand an.
    expect(intentOf({ ...defaultSetup(), technician: 'bot', monster: 'human' })).toBe('play');
    for (const intent of INTENTS)
      expect(intentOf(applyIntent(defaultSetup(), intent))).toBe(intent);
  });

  /**
   * **Ohne Ansicht in Klammern.** „Mission starten (2D)" wiederholte das
   * Häkchen zwei Zeilen darüber; der Besitzer wollte die Klammer weghaben, und
   * seitdem kennt der Knopf die Ansicht gar nicht mehr.
   */
  test('der Startknopf sagt, was die Verteilung tut — und nur das', () => {
    const setup = defaultSetup();
    expect(startLabel(setup)).toBe('Mission starten');
    expect(startLabel(applyIntent(setup, 'train'))).toBe('Test starten');
    expect(startLabel(applyIntent(setup, 'watch'))).toBe('Zuschauen');
    // Das Häkchen ist aus, die Tafel hat kein Monster mehr: Die Tafel gewinnt.
    expect(startLabel({ ...setup, monster: 'off' })).toBe('Test starten');
  });

  test('fremder Text wird gelesen, Unbekanntes ersetzt', () => {
    expect(readLobby(null)).toEqual({ intent: 'play', view: '3d' });
    expect(readLobby(null, null, 'handheld')).toEqual({ intent: 'play', view: '2d' });
    expect(readLobby({ intent: 'watch', view: '2d' })).toEqual({ intent: 'watch', view: '2d' });
    expect(readLobby({ intent: 'zuhause', view: '4d' })).toEqual({ intent: 'play', view: '3d' });
    expect(readLobby('kein Objekt')).toEqual({ intent: 'play', view: '3d' });
  });

  test('der alte Schalter zählt einmal — und nur, solange die Lobby nichts weiß', () => {
    expect(readLobby(null, '1').view).toBe('2d');
    expect(readLobby(null, '0', 'handheld').view).toBe('3d');
    // Steht die Lobby erst einmal, ist der alte Schalter vergessen.
    expect(readLobby({ intent: 'play', view: '3d' }, '1').view).toBe('3d');
  });

  test('aus dem Speicher gelesen, in den Speicher geschrieben', () => {
    const storage = fakeStorage({ [FLAT_STORAGE]: '1' });
    expect(loadLobby(storage)).toEqual({ intent: 'play', view: '2d' });
    saveLobby({ intent: 'train', view: '3d' }, storage);
    expect(loadLobby(storage)).toEqual({ intent: 'train', view: '3d' });
    // Der alte Schlüssel wird nicht mehr angefasst.
    expect(storage.store.get(FLAT_STORAGE)).toBe('1');
    expect(JSON.parse(storage.store.get(LOBBY_STORAGE) ?? 'null')).toEqual({
      intent: 'train',
      view: '3d',
    });
  });

  test('Speicher fehlt oder ist kaputt: dann eben von vorn', () => {
    expect(loadLobby(null)).toEqual({ intent: 'play', view: '3d' });
    expect(loadLobby(null, 'handheld')).toEqual({ intent: 'play', view: '2d' });
    expect(loadLobby(fakeStorage({ [LOBBY_STORAGE]: '{kaputt' }))).toEqual({
      intent: 'play',
      view: '3d',
    });
    const angry = {
      getItem() {
        throw new Error('kein Speicher in diesem Fenster');
      },
      setItem() {
        throw new Error('kein Speicher in diesem Fenster');
      },
    } as unknown as Storage;
    expect(loadLobby(angry, 'handheld')).toEqual({ intent: 'play', view: '2d' });
    expect(() => saveLobby({ intent: 'play', view: '2d' }, angry)).not.toThrow();
  });
});

/**
 * **Was ein Tipp auf „2D ↔ 3D" mitten in der Runde bedeutet** (`viewSwap`).
 *
 * Die zwei Fehler, wegen derer diese Rechnung eine eigene Funktion ist: Dem
 * Zuschauer wurde der Knopf angeboten und dann abgewiesen, und solange die
 * Bot-Runde in 2D lief, hielt die Welt sich für „schon in 3D".
 */
describe('viewSwap', () => {
  const base = {
    now: '2d' as const,
    want: '3d' as const,
    demo: false,
    technician: true,
    presenting: false,
  };

  it('tut nichts, wenn die Ansicht schon steht', () => {
    expect(viewSwap({ ...base, want: '2d' })).toBe('same');
  });

  it('kennt in der Brille keine Karte von oben', () => {
    expect(viewSwap({ ...base, now: '3d', want: '2d', presenting: true })).toBe('xr');
  });

  it('lässt den Techniker dieselbe Runde von der anderen Seite spielen', () => {
    expect(viewSwap(base)).toBe('handover');
    expect(viewSwap({ ...base, now: '3d', want: '2d' })).toBe('handover');
  });

  it('lässt den Zuschauer die Vorführung wechseln — in beide Richtungen', () => {
    expect(viewSwap({ ...base, demo: true, technician: false })).toBe('demo');
    expect(viewSwap({ ...base, now: '3d', want: '2d', demo: true, technician: false })).toBe(
      'demo',
    );
  });

  it('weist ab, wer weder Techniker noch Zuschauer einer Vorführung ist', () => {
    // Das Monster am Stock und der Zuschauer einer **echten** Runde im Netz:
    // Wer wechselte, sähe der Runde eines anderen von innen zu.
    expect(viewSwap({ ...base, technician: false })).toBe('blocked');
  });
});
