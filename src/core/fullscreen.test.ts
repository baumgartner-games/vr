import {
  fullscreenActive,
  fullscreenSupported,
  onFullscreenChange,
  toggleFullscreen,
  type FullscreenDocument,
  type FullscreenElement,
} from './fullscreen';

/**
 * Ein `document` zum Anfassen: Es merkt sich, was im Vollbild liegt, und tut
 * dabei so, wie der Browser es täte — die moderne Schreibweise mit Promise.
 */
function modern(): FullscreenDocument & FullscreenElement & { calls: string[] } {
  const state: { element: Element | null } = { element: null };
  const fake = {
    calls: [] as string[],
    fullscreenEnabled: true,
    get fullscreenElement(): Element | null {
      return state.element;
    },
    requestFullscreen(): Promise<void> {
      fake.calls.push('request');
      state.element = {} as Element;
      return Promise.resolve();
    },
    exitFullscreen(): Promise<void> {
      fake.calls.push('exit');
      state.element = null;
      return Promise.resolve();
    },
  };
  return fake;
}

/**
 * Und einer, wie die WebKit-Browser der Konsolen ihn haben: nur die
 * `webkit`-Namen, **ohne** Promise. `await` auf `undefined` ist erlaubt, ein
 * `element.requestFullscreen()` dort ein `TypeError`.
 */
function webkit(): FullscreenDocument & FullscreenElement & { calls: string[] } {
  const state: { element: Element | null } = { element: null };
  const fake = {
    calls: [] as string[],
    webkitFullscreenEnabled: true,
    get webkitFullscreenElement(): Element | null {
      return state.element;
    },
    webkitRequestFullscreen(): void {
      fake.calls.push('request');
      state.element = {} as Element;
    },
    webkitExitFullscreen(): void {
      fake.calls.push('exit');
      state.element = null;
    },
  };
  return fake;
}

/**
 * **Vollbild hat zwei Schreibweisen, und die zweite ist die, auf die es hier
 * ankommt.**
 *
 * Der Knopf ist für die Geräte gebaut, die keine Brille sind — Konsolenbrowser,
 * Fernseher, Telefon im Querformat —, und gerade die laufen auf WebKit und
 * kennen nur `webkitRequestFullscreen`, ohne Promise. Ein Knopf, der nur auf
 * dem Schreibtisch des Entwicklers klappt, hätte genau die Geräte verfehlt,
 * für die er gedacht war. Also steht hier beides nachgerechnet, samt dem Fall,
 * den ein Browser jederzeit hat: „nein".
 */
describe('Vollbild', () => {
  it('kann beide Schreibweisen — und erkennt, wo es keine gibt', () => {
    const now = modern();
    const old = webkit();
    expect(fullscreenSupported(now, now)).toBe(true);
    expect(fullscreenSupported(old, old)).toBe(true);
    // Ein Browser ohne beides: kein Knopf, statt eines, der nichts tut.
    expect(fullscreenSupported({}, {})).toBe(false);
    expect(fullscreenSupported(null, null)).toBe(false);
  });

  it('zeigt keinen Knopf, wo der Rahmen es verbietet', () => {
    // In einem `<iframe>` ohne `allow="fullscreen"` ist die Funktion da und
    // wirft. `fullscreenEnabled` ist die Frage nach der Erlaubnis.
    const framed = { ...modern(), fullscreenEnabled: false };
    expect(fullscreenSupported(framed, framed)).toBe(false);
    const framedWebkit = { ...webkit(), webkitFullscreenEnabled: false };
    expect(fullscreenSupported(framedWebkit, framedWebkit)).toBe(false);
  });

  it('schaltet hin und zurück und gibt den Stand zurück, nicht den Wunsch', async () => {
    for (const doc of [modern(), webkit()]) {
      expect(fullscreenActive(doc)).toBe(false);
      expect(await toggleFullscreen(doc, doc)).toBe(true);
      expect(fullscreenActive(doc)).toBe(true);
      expect(await toggleFullscreen(doc, doc)).toBe(false);
      expect(doc.calls).toEqual(['request', 'exit']);
    }
  });

  it('nimmt ein „nein" hin, statt eine Ausnahme fliegen zu lassen', async () => {
    // Ohne frische Nutzergeste lehnt jeder Browser ab — und auf manchen
    // Geräten immer. Der Knopf soll danach richtig dastehen, nicht die Seite
    // mit einem Fehler in der Konsole.
    const stubborn: FullscreenDocument & FullscreenElement = {
      fullscreenEnabled: true,
      fullscreenElement: null,
      requestFullscreen: () => Promise.reject(new Error('not allowed')),
    };
    await expect(toggleFullscreen(stubborn, stubborn)).resolves.toBe(false);

    // Dasselbe für die Variante, die synchron wirft.
    const throwing: FullscreenDocument & FullscreenElement = {
      webkitFullscreenEnabled: true,
      webkitFullscreenElement: null,
      webkitRequestFullscreen: () => {
        throw new Error('nope');
      },
    };
    await expect(toggleFullscreen(throwing, throwing)).resolves.toBe(false);

    // Und ein Vollbild, aus dem es keinen Ausgang gibt, hängt nicht.
    const noExit: FullscreenDocument & FullscreenElement = {
      fullscreenEnabled: true,
      fullscreenElement: {} as Element,
    };
    await expect(toggleFullscreen(noExit, noExit)).resolves.toBe(true);
  });

  it('hört auf beide Ereignisnamen und hört auch wieder auf', () => {
    const heard: string[] = [];
    const target = {
      addEventListener: (type: string) => heard.push(`+${type}`),
      removeEventListener: (type: string) => heard.push(`-${type}`),
    };
    const stop = onFullscreenChange(target, () => undefined);
    expect(heard).toEqual(['+fullscreenchange', '+webkitfullscreenchange']);
    stop();
    expect(heard).toEqual([
      '+fullscreenchange',
      '+webkitfullscreenchange',
      '-fullscreenchange',
      '-webkitfullscreenchange',
    ]);
  });
});
