import {
  DEFAULT_APPEARANCE,
  appearance,
  appearanceSummary,
  clampAppearance,
  onAppearanceChange,
  saveAppearance,
} from './appearance';
import { HEADGEAR_KINDS, HEADGEAR_LABELS, asHeadgear, nextHeadgear } from './headgear';

describe('was man auf dem Kopf trägt', () => {
  it('liefert barhäuptig aus', () => {
    expect(DEFAULT_APPEARANCE).toEqual({ hat: 'none' });
  });

  it('macht aus Unsinn barhäuptig', () => {
    // Der Hut kommt auch über das Netz herein (`net/NetSession.ts`), und was
    // von dort kommt, ist fremder Text.
    expect(clampAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
    expect(clampAppearance({ hat: 'sombrero' as never })).toEqual(DEFAULT_APPEARANCE);
    expect(asHeadgear(42)).toBe('none');
    expect(asHeadgear('helmet')).toBe('helmet');
  });

  it('kennt jede Sorte mit Namen', () => {
    for (const kind of HEADGEAR_KINDS) expect(HEADGEAR_LABELS[kind]).toBeTruthy();
  });

  it('schaltet im Kreis weiter', () => {
    let kind = HEADGEAR_KINDS[0]!;
    for (let i = 0; i < HEADGEAR_KINDS.length; i++) kind = nextHeadgear(kind);
    expect(kind).toBe(HEADGEAR_KINDS[0]);
  });

  it('schreibt die Wahl in eine Zeile', () => {
    expect(appearanceSummary({ hat: 'none' })).toBe('Ohne Kopfbedeckung');
    expect(appearanceSummary({ hat: 'helmet' })).toBe('Kopf: Helm');
  });

  it('überlebt einen Speicher, den es nicht gibt', () => {
    expect(appearance()).toEqual(DEFAULT_APPEARANCE);
    expect(saveAppearance({ hat: 'crown' })).toEqual({ hat: 'crown' });
  });

  it('sagt Bescheid, wenn sich etwas ändert', () => {
    // Daran hängen zwei Dinge: der eigene Körper und die Ansage an alle im
    // Raum. Ohne die Meldung säße der Hut erst nach dem nächsten Weltwechsel.
    const seen: number[] = [];
    const stop = onAppearanceChange(() => seen.push(1));
    saveAppearance({ hat: 'cap' });
    saveAppearance({ hat: 'none' });
    stop();
    saveAppearance({ hat: 'tophat' });
    expect(seen).toHaveLength(2);
  });
});
