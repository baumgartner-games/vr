import {
  BELT_LIMITS,
  DEFAULT_BELT,
  beltLabel,
  beltOffset,
  beltSlotPoint,
  clampBelt,
  clearBelt,
  dragBelt,
  saveBelt,
} from './beltSettings';

const HEAD = 1.6;

describe('Gürtel-Position', () => {
  it('liefert die Zahlen aus, die vorher fest im Code standen', () => {
    expect(DEFAULT_BELT).toEqual({ side: 0.26, height: 0.5, forward: -0.04 });
  });

  it('holt jeden Wert in die Grenzen zurück', () => {
    const wide = clampBelt({ side: 9, height: 9, forward: 9 });
    expect(wide.side).toBe(BELT_LIMITS.side.max);
    expect(wide.height).toBe(BELT_LIMITS.height.max);
    expect(wide.forward).toBe(BELT_LIMITS.forward.max);

    const tight = clampBelt({ side: -9, height: -9, forward: -9 });
    expect(tight.side).toBe(BELT_LIMITS.side.min);
    expect(tight.height).toBe(BELT_LIMITS.height.min);
    expect(tight.forward).toBe(BELT_LIMITS.forward.min);
  });

  it('macht aus Unsinn und aus Lücken den Auslieferungswert', () => {
    expect(clampBelt(undefined)).toEqual(DEFAULT_BELT);
    expect(clampBelt({})).toEqual(DEFAULT_BELT);
    expect(clampBelt({ side: 'weit' })).toEqual(DEFAULT_BELT);
    expect(clampBelt({ side: Number.NaN, height: null })).toEqual(DEFAULT_BELT);
    // Ein Speicher von gestern kannte die Tiefe noch nicht: der Rest gilt.
    expect(clampBelt({ side: 0.3, height: 0.4 })).toEqual({
      side: 0.3,
      height: 0.4,
      forward: DEFAULT_BELT.forward,
    });
  });

  it('rundet auf Millimeter', () => {
    expect(clampBelt({ ...DEFAULT_BELT, side: 0.2612345 }).side).toBe(0.261);
  });

  it('spiegelt die beiden Hüften', () => {
    const left = beltSlotPoint(DEFAULT_BELT, 'left', HEAD, 0);
    const right = beltSlotPoint(DEFAULT_BELT, 'right', HEAD, 0);
    expect(right.x).toBeCloseTo(-left.x, 6);
    expect(right.x).toBeCloseTo(DEFAULT_BELT.side, 6);
    expect(right.y).toBeCloseTo(left.y, 6);
    expect(right.z).toBeCloseTo(left.z, 6);
  });

  it('hängt die Hüften auf halber Augenhöhe auf', () => {
    expect(beltSlotPoint(DEFAULT_BELT, 'right', HEAD, 0).y).toBeCloseTo(0.8, 6);
    // Wer sitzt, hat den Gürtel tiefer — die Höhe ist ein Anteil, keine Zahl.
    expect(beltSlotPoint(DEFAULT_BELT, 'right', 1.2, 0).y).toBeCloseTo(0.6, 6);
  });

  it('legt die Voreinstellung hinter die Körpermitte, nicht davor', () => {
    // Ein Körper ohne Drehung schaut nach −Z; „hinten" ist also +Z.
    expect(beltSlotPoint(DEFAULT_BELT, 'right', HEAD, 0).z).toBeGreaterThan(0);
  });

  it('dreht die Hüften mit den Schultern', () => {
    const straight = beltSlotPoint(DEFAULT_BELT, 'right', HEAD, 0);
    const turned = beltSlotPoint(DEFAULT_BELT, 'right', HEAD, Math.PI / 2);
    // Eine Vierteldrehung: was rechts lag, liegt jetzt vorn.
    expect(turned.x).toBeCloseTo(straight.z, 6);
    expect(turned.z).toBeCloseTo(-straight.x, 6);
    // Gedreht wird, nicht gestreckt.
    const radius = (p: { x: number; z: number }): number => Math.hypot(p.x, p.z);
    expect(radius(turned)).toBeCloseTo(radius(straight), 6);
  });

  it('macht aus einem Zug an einer Hüfte einen Gürtel', () => {
    const wider = dragBelt(DEFAULT_BELT, { right: 0.1, up: 0, forward: 0 }, 'right', HEAD);
    expect(wider.side).toBeCloseTo(0.36, 6);
    // Dieselbe Bewegung an der linken Hüfte zieht sie nach *innen*.
    const tighter = dragBelt(DEFAULT_BELT, { right: 0.1, up: 0, forward: 0 }, 'left', HEAD);
    expect(tighter.side).toBeCloseTo(0.16, 6);
    // Und nach außen heißt links das andere Vorzeichen — derselbe Gürtel.
    const alsoWider = dragBelt(DEFAULT_BELT, { right: -0.1, up: 0, forward: 0 }, 'left', HEAD);
    expect(alsoWider.side).toBeCloseTo(wider.side, 6);
  });

  it('rechnet gezogene Zentimeter in Anteile der Augenhöhe um', () => {
    const raised = dragBelt(DEFAULT_BELT, { right: 0, up: 0.16, forward: 0 }, 'right', HEAD);
    expect(raised.height).toBeCloseTo(0.6, 6);
    // Dieselbe Höhe soll auch dort herauskommen, wo sie gezogen wurde.
    expect(beltSlotPoint(raised, 'right', HEAD, 0).y).toBeCloseTo(0.96, 6);
  });

  it('schiebt beide Hüften nach vorn', () => {
    const front = dragBelt(DEFAULT_BELT, { right: 0, up: 0, forward: 0.1 }, 'left', HEAD);
    expect(front.forward).toBeCloseTo(0.06, 6);
    expect(beltSlotPoint(front, 'left', HEAD, 0).z).toBeCloseTo(-0.06, 6);
  });

  it('bleibt an den Grenzen stehen, statt in die Wand zu wandern', () => {
    let belt = DEFAULT_BELT;
    for (let i = 0; i < 50; i += 1) {
      belt = dragBelt(belt, { right: 0.1, up: 0.1, forward: 0.1 }, 'right', HEAD);
    }
    expect(belt.side).toBe(BELT_LIMITS.side.max);
    expect(belt.height).toBe(BELT_LIMITS.height.max);
    expect(belt.forward).toBe(BELT_LIMITS.forward.max);
  });

  it('lässt die Höhe stehen, solange keine Augenhöhe bekannt ist', () => {
    const belt = dragBelt(DEFAULT_BELT, { right: 0, up: 0.2, forward: 0 }, 'right', 0);
    expect(belt.height).toBe(DEFAULT_BELT.height);
  });

  it('schreibt die drei Zahlen so auf, wie sie in der Brille zu lesen sind', () => {
    expect(beltLabel(DEFAULT_BELT)).toBe('26 cm · 0.50 · 4 cm hinten');
    expect(beltLabel({ side: 0.3, height: 0.42, forward: 0.12 })).toBe('30 cm · 0.42 · 12 cm vorn');
  });

  it('übersteht einen Speicher, den es nicht gibt', () => {
    // Kein localStorage im Node-Testlauf: alle drei müssen trotzdem antworten.
    expect(beltOffset()).toEqual(DEFAULT_BELT);
    expect(saveBelt({ side: 0.3, height: 0.6, forward: 0 })).toEqual({
      side: 0.3,
      height: 0.6,
      forward: 0,
    });
    expect(clearBelt()).toEqual(DEFAULT_BELT);
  });
});
