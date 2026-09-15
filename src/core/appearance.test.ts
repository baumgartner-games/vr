import {
  DEFAULT_APPEARANCE,
  appearance,
  appearanceSummary,
  clampAppearance,
  onAppearanceChange,
  saveAppearance,
} from './appearance';
import { HEADGEAR_KINDS, HEADGEAR_LABELS, asHeadgear, nextHeadgear } from './headgear';

describe('wie man aussieht', () => {
  it('liefert als barhäuptigen Koch in Weiß aus', () => {
    expect(DEFAULT_APPEARANCE).toEqual({ hat: 'none', head: 'round', body: 'white' });
  });

  it('macht aus Unsinn die Vorgabe', () => {
    // Das Aussehen kommt auch über das Netz herein (`net/NetSession.ts`), und
    // was von dort kommt, ist fremder Text.
    expect(clampAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
    expect(clampAppearance({ hat: 'sombrero' as never })).toEqual(DEFAULT_APPEARANCE);
    expect(clampAppearance({ head: 'schnabel' as never, body: 'frack' as never })).toEqual(
      DEFAULT_APPEARANCE,
    );
    expect(asHeadgear(42)).toBe('none');
    expect(asHeadgear('helmet')).toBe('helmet');
  });

  it('lässt jedes Stück einzeln stehen', () => {
    expect(clampAppearance({ hat: 'chef', head: 'beard', body: 'striped' })).toEqual({
      hat: 'chef',
      head: 'beard',
      body: 'striped',
    });
  });

  it('kennt jede Kopfbedeckung mit Namen', () => {
    for (const kind of HEADGEAR_KINDS) expect(HEADGEAR_LABELS[kind]).toBeTruthy();
  });

  it('schaltet die Kopfbedeckungen im Kreis weiter', () => {
    let kind = HEADGEAR_KINDS[0]!;
    for (let i = 0; i < HEADGEAR_KINDS.length; i++) kind = nextHeadgear(kind);
    expect(kind).toBe(HEADGEAR_KINDS[0]);
  });

  it('kennt die Kochmütze — sie ist das Vorbild', () => {
    expect(HEADGEAR_KINDS).toContain('chef');
    expect(asHeadgear('chef')).toBe('chef');
  });

  it('schreibt alle drei Stücke in eine Zeile', () => {
    expect(appearanceSummary(DEFAULT_APPEARANCE)).toBe('Rund · ohne Hut · Kochjacke weiß');
    expect(appearanceSummary({ hat: 'chef', head: 'beard', body: 'red' })).toBe(
      'Vollbart · Kochmütze · Kochjacke rot',
    );
  });

  it('überlebt einen Speicher, den es nicht gibt', () => {
    expect(appearance()).toEqual(DEFAULT_APPEARANCE);
    expect(saveAppearance({ hat: 'crown' })).toEqual({ ...DEFAULT_APPEARANCE, hat: 'crown' });
  });

  it('sagt Bescheid, wenn sich etwas ändert', () => {
    // Daran hängen zwei Dinge: der eigene Körper und die Ansage an alle im
    // Raum. Ohne die Meldung säße der Hut erst nach dem nächsten Weltwechsel.
    const seen: number[] = [];
    const stop = onAppearanceChange(() => seen.push(1));
    saveAppearance({ hat: 'cap' });
    saveAppearance({ head: 'freckles' });
    stop();
    saveAppearance({ body: 'green' });
    expect(seen).toHaveLength(2);
  });
});
