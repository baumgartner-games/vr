import {
  DEFAULT_PORTAL_DEPTH,
  MAX_PORTAL_DEPTH,
  MIN_PORTAL_DEPTH,
  PORTAL_DEPTH_STEPS,
  clampPortalDepth,
  nextPortalDepth,
  portalDepth,
  savePortalDepth,
} from './portalDepth';

describe('Portale in Portalen', () => {
  it('liefert zwei Ebenen aus, nicht eine', () => {
    expect(DEFAULT_PORTAL_DEPTH).toBe(2);
  });

  it('holt jeden Wert in den Bereich zurück', () => {
    expect(clampPortalDepth(0)).toBe(MIN_PORTAL_DEPTH);
    expect(clampPortalDepth(-3)).toBe(MIN_PORTAL_DEPTH);
    expect(clampPortalDepth(99)).toBe(MAX_PORTAL_DEPTH);
    expect(clampPortalDepth(2.4)).toBe(2);
  });

  it('macht aus Unsinn den Auslieferungswert', () => {
    expect(clampPortalDepth(undefined)).toBe(DEFAULT_PORTAL_DEPTH);
    expect(clampPortalDepth('zwei')).toBe(DEFAULT_PORTAL_DEPTH);
    expect(clampPortalDepth(Number.NaN)).toBe(DEFAULT_PORTAL_DEPTH);
  });

  it('liest eine gespeicherte Zahl als Zeichenkette wieder', () => {
    // localStorage gibt nur Strings zurück — das ist der ganze Testfall.
    expect(clampPortalDepth('3')).toBe(3);
  });

  it('schaltet eine Raste weiter und fängt oben wieder an', () => {
    let depth: number = MIN_PORTAL_DEPTH;
    for (const expected of [...PORTAL_DEPTH_STEPS.slice(1), MIN_PORTAL_DEPTH]) {
      depth = nextPortalDepth(depth);
      expect(depth).toBe(expected);
    }
  });

  it('überlebt einen Speicher, den es nicht gibt', () => {
    // Kein localStorage im Node-Testlauf: beides muss trotzdem antworten.
    expect(portalDepth()).toBe(DEFAULT_PORTAL_DEPTH);
    expect(savePortalDepth(3)).toBe(3);
    expect(savePortalDepth(42)).toBe(MAX_PORTAL_DEPTH);
  });
});
