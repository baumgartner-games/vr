import { showScreenPads } from './screenPads';
import {
  DEFAULT_GRAPHICS,
  SCREEN_PADS,
  clampGraphics,
  graphicsSummary,
  nextScreenPads,
  type ScreenPads,
} from './graphicsSettings';

/** Ein Handy ohne Pad, in einer Welt, die den Stock der Seite will. */
const phone = {
  role: 'handheld' as const,
  gamepad: false,
  presenting: false,
  worldWantsStick: true,
};
/** Und derselbe Fall am Schreibtisch. */
const desk = { ...phone, role: 'desktop' as const };

describe('Bildschirm-Steuerung', () => {
  /**
   * **Automatisch ist die Voreinstellung**, und ihre ganze Frage lautet: Ist
   * ein Finger hier wirklich das einzige Eingabegerät? Am Schreibtisch nie —
   * dort liegt eine Maus, und zwei gemalte Daumenflächen darüber wären Zierde.
   */
  it('zeigt die Stöcke ab Werk nur am Handy', () => {
    expect(DEFAULT_GRAPHICS.screenPads).toBe('auto');
    expect(showScreenPads({ ...phone, setting: 'auto' })).toBe(true);
    expect(showScreenPads({ ...desk, setting: 'auto' })).toBe(false);
    // Ohne Angabe gilt dieselbe Voreinstellung und nicht „aus".
    expect(showScreenPads({ role: 'handheld' })).toBe(true);
    expect(showScreenPads({ role: 'desktop' })).toBe(false);
  });

  /**
   * **Ein Pad am Tablet ist ein echter Stock in der Hand.** Genau das konnte
   * die alte Zeile `detectFlatRole() === 'handheld'` nicht sehen — sie legte
   * zwei gemalte Daumen über ein Bild, das schon gesteuert wurde.
   */
  it('tritt in der Automatik zurück, sobald ein Gamepad angesteckt ist', () => {
    expect(showScreenPads({ ...phone, setting: 'auto', gamepad: true })).toBe(false);
    // Abgezogen kommen sie wieder — deshalb hört `main.ts` auf beide Ereignisse.
    expect(showScreenPads({ ...phone, setting: 'auto', gamepad: false })).toBe(true);
    // Am Schreibtisch ändert das Pad nichts: Dort gab es sie ohnehin nie.
    expect(showScreenPads({ ...desk, setting: 'auto', gamepad: true })).toBe(false);
  });

  /**
   * **Das Wort des Spielers gilt** — auch gegen das Gerät. `an` ist die Zeile
   * für den, der die Stöcke am Schreibtisch sehen will; `aus` die für das
   * Telefon, das mit einem Pad oder einer Tastatur gespielt wird.
   */
  it('überstimmt mit an und aus das Gerät, aber nicht den Zustand', () => {
    expect(showScreenPads({ ...desk, setting: 'on' })).toBe(true);
    expect(showScreenPads({ ...desk, setting: 'on', gamepad: true })).toBe(true);
    expect(showScreenPads({ ...phone, setting: 'off' })).toBe(false);
    // In der Brille sieht niemand auf das Glas, und eine Welt mit eigener
    // Steuerung hätte zwei Stöcke übereinander. Gegen beides hilft kein „an".
    expect(showScreenPads({ ...desk, setting: 'on', presenting: true })).toBe(false);
    expect(showScreenPads({ ...desk, setting: 'on', worldWantsStick: false })).toBe(false);
    expect(showScreenPads({ ...phone, setting: 'auto', presenting: true })).toBe(false);
    expect(showScreenPads({ ...phone, setting: 'auto', worldWantsStick: false })).toBe(false);
  });

  it('schaltet im Kreis und fängt bei der Automatik wieder an', () => {
    let pads: ScreenPads = 'auto';
    for (const expected of [...SCREEN_PADS.slice(1), SCREEN_PADS[0]]) {
      pads = nextScreenPads(pads);
      expect(pads).toBe(expected);
    }
    expect(pads).toBe('auto');
  });

  /**
   * Ein gespeicherter Stand von gestern kennt die Raste nicht — und bekommt die
   * Automatik. Ein Telefon, das gestern noch Stöcke hatte, stünde sonst heute
   * ohne da.
   */
  it('gibt einem alten Speicher die Automatik und nennt nur die Abweichung', () => {
    expect(clampGraphics({ mode: 'simple' }).screenPads).toBe('auto');
    expect(clampGraphics({ screenPads: 'aus' as never }).screenPads).toBe('auto');
    expect(clampGraphics({ screenPads: 'off' }).screenPads).toBe('off');
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, screenPads: 'auto' })).toBe('Einfach');
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, screenPads: 'on' })).toBe(
      'Einfach · Bildschirm-Steuerung an',
    );
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, screenPads: 'off' })).toBe(
      'Einfach · Bildschirm-Steuerung aus',
    );
  });
});
