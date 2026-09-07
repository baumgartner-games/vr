import { mergeSign, sanitizeSign, signId, type SharedSign } from './signShare';
import { DEFAULT_SIGN, MAX_FONT_CM } from './signSettings';
import { MAX_SIGN_CHARS } from './signMarkup';

const pose: SharedSign['pose'] = [1, 2, 3, 0, 0, 0, 1];

describe('sanitizeSign', () => {
  it('nimmt ein vollständiges Schild an', () => {
    const sign = sanitizeSign({ id: 'a-1', rev: 3, pose, text: 'Hallo', mount: 'wall' });
    expect(sign).toEqual({
      id: 'a-1',
      rev: 3,
      pose,
      text: 'Hallo',
      settings: DEFAULT_SIGN,
      mount: 'wall',
    });
  });

  it('weist zurück, was keine Kennung oder keine Lage hat', () => {
    expect(sanitizeSign(null)).toBeNull();
    expect(sanitizeSign({ pose })).toBeNull();
    expect(sanitizeSign({ id: 'a', pose: [1, 2, 3] })).toBeNull();
    expect(sanitizeSign({ id: 'a', pose: [1, 2, 3, 0, 0, 0, Number.NaN] })).toBeNull();
  });

  it('kürzt einen Text, der als Nachricht gemeint war', () => {
    const sign = sanitizeSign({ id: 'a', pose, text: 'x'.repeat(MAX_SIGN_CHARS * 2) });
    expect(sign!.text).toHaveLength(MAX_SIGN_CHARS);
  });

  it('holt fremde Einstellungen in die Grenzen zurück', () => {
    const sign = sanitizeSign({ id: 'a', pose, settings: { fontCm: 900, autoScroll: -4 } });
    expect(sign!.settings.fontCm).toBe(MAX_FONT_CM);
    expect(sign!.settings.autoScroll).toBe(0);
  });

  it('macht aus einer fehlenden Fassung die nullte, aus einer Wand keinen Pfosten', () => {
    const sign = sanitizeSign({ id: 'a', pose, rev: -5, mount: 'unsinn' });
    expect(sign!.rev).toBe(0);
    expect(sign!.mount).toBe('post');
  });
});

describe('mergeSign', () => {
  const base: SharedSign = {
    id: 'a',
    rev: 2,
    pose,
    text: 'alt',
    settings: DEFAULT_SIGN,
    mount: 'post',
  };

  it('nimmt ein Schild an, das noch keiner kennt', () => {
    expect(mergeSign(undefined, base)).toBe(base);
  });

  it('lässt die höhere Fassung gewinnen', () => {
    const newer = { ...base, rev: 3, text: 'neu' };
    expect(mergeSign(base, newer)).toBe(newer);
  });

  it('behält bei gleicher Fassung das Bekannte — die Begrüßung antwortet doppelt', () => {
    expect(mergeSign(base, { ...base, text: 'doppelt' })).toBe(base);
    expect(mergeSign(base, { ...base, rev: 1 })).toBe(base);
  });
});

describe('signId', () => {
  it('trägt den Absender, damit zwei gleichzeitig aufstellen können', () => {
    expect(signId('p-abc', 5)).toBe('p-abc-5');
    expect(signId('p-abc', 40)).not.toBe(signId('p-xyz', 40));
  });
});
