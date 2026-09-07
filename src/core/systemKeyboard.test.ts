import {
  KEYBOARD_MODES,
  clampKeyboardMode,
  nextKeyboardMode,
  supportsSystemKeyboard,
  useSystemKeyboard,
} from './systemKeyboard';

const QUEST =
  'Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/34.0 Chrome/126 VR Safari/537.36';
const DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

describe('supportsSystemKeyboard', () => {
  it('kennt den Quest-Browser', () => {
    expect(supportsSystemKeyboard(QUEST)).toBe(true);
  });

  it('und hält einen Schreibtisch-Browser nicht dafür', () => {
    expect(supportsSystemKeyboard(DESKTOP)).toBe(false);
    expect(supportsSystemKeyboard('')).toBe(false);
  });
});

describe('clampKeyboardMode', () => {
  it('macht aus Unsinn „automatisch"', () => {
    expect(clampKeyboardMode(undefined)).toBe('auto');
    expect(clampKeyboardMode('quatsch')).toBe('auto');
    expect(clampKeyboardMode('panel')).toBe('panel');
  });

  it('dreht die drei Einstellungen im Kreis', () => {
    let mode = KEYBOARD_MODES[0]!;
    const seen = new Set<string>();
    for (let i = 0; i < KEYBOARD_MODES.length; i++) {
      seen.add(mode);
      mode = nextKeyboardMode(mode);
    }
    expect(seen.size).toBe(KEYBOARD_MODES.length);
    expect(mode).toBe(KEYBOARD_MODES[0]);
  });
});

describe('useSystemKeyboard', () => {
  it('fragt sie in der Brille auf einem Gerät, das sie hat', () => {
    expect(useSystemKeyboard({ mode: 'auto', immersive: true, userAgent: QUEST })).toBe(true);
  });

  it('lässt sie am Schreibtisch aus — dort tippt die echte Tastatur', () => {
    expect(useSystemKeyboard({ mode: 'auto', immersive: false, userAgent: QUEST })).toBe(false);
    expect(useSystemKeyboard({ mode: 'auto', immersive: true, userAgent: DESKTOP })).toBe(false);
  });

  it('gehorcht der Einstellung, wenn eine getroffen wurde', () => {
    expect(useSystemKeyboard({ mode: 'panel', immersive: true, userAgent: QUEST })).toBe(false);
    expect(useSystemKeyboard({ mode: 'system', immersive: false, userAgent: DESKTOP })).toBe(true);
  });
});
