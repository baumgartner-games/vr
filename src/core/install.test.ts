import { installState, isAppleHandheld, isStandalone } from './install';

/** Ein Browser, der auf genau die genannten Abfragen mit `true` antwortet. */
function windowWith(matching: string[], standalone?: boolean): Parameters<typeof isStandalone>[0] {
  return {
    matchMedia: (query: string) => ({ matches: matching.includes(query) }),
    standalone,
  };
}

describe('isStandalone', () => {
  it('erkennt die installierte App am Anzeigemodus', () => {
    expect(isStandalone(windowWith(['(display-mode: fullscreen)']))).toBe(true);
    expect(isStandalone(windowWith(['(display-mode: standalone)']))).toBe(true);
    expect(isStandalone(windowWith(['(display-mode: minimal-ui)']))).toBe(true);
  });

  it('erkennt sie auf Safari an dessen eigener Antwort', () => {
    // Safari kennt `display-mode` nicht und sagt es auf seine Art.
    expect(isStandalone(windowWith([], true))).toBe(true);
    expect(isStandalone(windowWith([], false))).toBe(false);
  });

  it('sagt im Browsertab nein', () => {
    expect(isStandalone(windowWith(['(display-mode: browser)']))).toBe(false);
  });

  it('kommt ohne `matchMedia` aus', () => {
    expect(isStandalone({})).toBe(false);
    expect(isStandalone(null)).toBe(false);
  });
});

describe('isAppleHandheld', () => {
  it('erkennt das iPhone', () => {
    expect(
      isAppleHandheld({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' }),
    ).toBe(true);
  });

  it('erkennt das iPad, das sich als Macintosh ausgibt', () => {
    // iPadOS ab 13: derselbe Kennstring wie ein Mac — bis auf die Finger.
    const ipad = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      maxTouchPoints: 5,
    };
    expect(isAppleHandheld(ipad)).toBe(true);
  });

  it('hält einen Mac nicht für ein iPad', () => {
    const mac = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 0 };
    expect(isAppleHandheld(mac)).toBe(false);
  });

  it('hält ein Android-Telefon nicht für ein iPhone', () => {
    expect(
      isAppleHandheld({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)', maxTouchPoints: 5 }),
    ).toBe(false);
  });
});

describe('installState', () => {
  it('fragt nicht, wer schon installiert hat', () => {
    // Auch dann nicht, wenn der Browser noch ein Angebot herumliegen hat.
    expect(installState({ standalone: true, offer: true, apple: false })).toBe('installed');
  });

  it('nimmt das Angebot des Browsers, wo es eines gibt', () => {
    expect(installState({ standalone: false, offer: true, apple: false })).toBe('prompt');
  });

  it('zeigt auf Apple-Geräten den Weg statt eines Knopfes', () => {
    expect(installState({ standalone: false, offer: false, apple: true })).toBe('manual');
  });

  it('schweigt, wo der Browser es nicht kann', () => {
    expect(installState({ standalone: false, offer: false, apple: false })).toBe('none');
  });
});
