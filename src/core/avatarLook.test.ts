import {
  BODY_KINDS,
  BODY_LABELS,
  BODY_SUBS,
  HEAD_KINDS,
  HEAD_LABELS,
  HEAD_SUBS,
  asBody,
  asHead,
  nextBody,
  nextHead,
  skinTone,
} from './avatarLook';

/**
 * Die Listen sind der Vertrag zwischen Menü, Umkleide und Netz: Das Menü
 * schaltet sie durch, die Umkleide zeigt ihre Namen, und über das Netz kommen
 * ihre Schlüssel als fremder Text herein. Geprüft wird deshalb genau das —
 * nicht, wie ein Kopf aussieht, das sieht man.
 */
describe('Köpfe und Körper', () => {
  it('hat mindestens vier von jedem', () => {
    expect(HEAD_KINDS.length).toBeGreaterThanOrEqual(4);
    expect(BODY_KINDS.length).toBeGreaterThanOrEqual(4);
  });

  it('kennt jede Sorte mit Namen und Untertitel', () => {
    for (const kind of HEAD_KINDS) {
      expect(HEAD_LABELS[kind]).toBeTruthy();
      expect(HEAD_SUBS[kind]).toBeTruthy();
    }
    for (const kind of BODY_KINDS) {
      expect(BODY_LABELS[kind]).toBeTruthy();
      expect(BODY_SUBS[kind]).toBeTruthy();
    }
  });

  it('gibt jedem Kopf einen eigenen Hautton', () => {
    // Daran hängen auch die Hände: Es ist derselbe Mensch.
    const tones = new Set(HEAD_KINDS.map(skinTone));
    expect(tones.size).toBe(HEAD_KINDS.length);
  });

  it('macht aus fremdem Text die Vorgabe', () => {
    expect(asHead(undefined)).toBe('round');
    expect(asHead('kürbis')).toBe('round');
    expect(asHead(7)).toBe('round');
    expect(asHead('beard')).toBe('beard');
    expect(asBody(null)).toBe('white');
    expect(asBody('frack')).toBe('white');
    expect(asBody('striped')).toBe('striped');
  });

  it('schaltet im Kreis weiter', () => {
    let head = HEAD_KINDS[0]!;
    for (let i = 0; i < HEAD_KINDS.length; i++) head = nextHead(head);
    expect(head).toBe(HEAD_KINDS[0]);

    let body = BODY_KINDS[0]!;
    for (let i = 0; i < BODY_KINDS.length; i++) body = nextBody(body);
    expect(body).toBe(BODY_KINDS[0]);
  });

  it('lässt beim Weiterschalten keine Sorte aus', () => {
    const seen = new Set<string>();
    let body = BODY_KINDS[0]!;
    for (let i = 0; i < BODY_KINDS.length; i++) {
      seen.add(body);
      body = nextBody(body);
    }
    expect(seen.size).toBe(BODY_KINDS.length);
  });
});
