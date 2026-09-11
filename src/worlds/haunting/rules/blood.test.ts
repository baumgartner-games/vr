import {
  BLEED_TIME,
  DROP_FADE,
  DROP_LIMIT,
  DROP_SPACING,
  SCENT_TRUST,
  SNIFF_RANGE,
  bleeding,
  dropAlpha,
  freshTrail,
  readDrops,
  sniff,
  stepTrail,
  wound,
  type Trail,
} from './blood';

/** Den Techniker eine gerade Strecke nach Osten laufen lassen, in Schritten von `step` Metern. */
function walk(trail: Trail, from: number, metres: number, step: number, start: number): number {
  let x = from;
  let now = start;
  for (let done = 0; done < metres; done += step) {
    x += step;
    now += step / 2.6;
    stepTrail(trail, { x, z: 0 }, now);
  }
  return now;
}

describe('Die Wunde', () => {
  it('fängt zu, trocken und ohne Tropfen an', () => {
    const trail = freshTrail();
    expect(trail.drops).toEqual([]);
    expect(bleeding(trail, 0)).toBe(false);
    // Wer nicht blutet, tropft auch nicht, egal wie weit er läuft.
    walk(trail, 0, 20, 0.5, 0);
    expect(trail.drops).toEqual([]);
  });

  it('bleibt nach einem Treffer BLEED_TIME Sekunden offen und schließt sich dann', () => {
    const trail = freshTrail();
    wound(trail, 100);
    expect(bleeding(trail, 100)).toBe(true);
    expect(bleeding(trail, 100 + BLEED_TIME - 1)).toBe(true);
    expect(bleeding(trail, 100 + BLEED_TIME)).toBe(false);
  });

  /**
   * Zwei Treffer sind nicht zwei Wunden: Sonst hätte der dritte Treffer eine
   * Frist geöffnet, die länger hält als die ganze Runde.
   */
  it('setzt ein zweiter Treffer die Frist neu, statt sie zu verlängern', () => {
    const trail = freshTrail();
    wound(trail, 100);
    wound(trail, 130);
    expect(trail.until).toBe(130 + BLEED_TIME);
  });
});

describe('Die Spur', () => {
  it('tropft nach Strecke und nicht nach Zeit', () => {
    const trail = freshTrail();
    wound(trail, 0);
    // Stehen bleiben, eine halbe Minute lang: kein einziger Tropfen.
    for (let now = 0; now < 30; now++) stepTrail(trail, { x: 5, z: 5 }, now);
    expect(trail.drops).toHaveLength(1);
    // Der eine ist der erste überhaupt — er liegt dort, wo der Schlag saß.
    expect(trail.drops[0]).toMatchObject({ x: 5, z: 5 });
  });

  it('legt die Tropfen im Abstand von DROP_SPACING', () => {
    const trail = freshTrail();
    wound(trail, 0);
    walk(trail, 0, 12, 0.25, 0);
    expect(trail.drops.length).toBeGreaterThan(6);
    for (let i = 1; i < trail.drops.length; i++) {
      const gap = trail.drops[i]!.x - trail.drops[i - 1]!.x;
      // Ein Schritt Auflösung Toleranz: Gemessen wird zwischen zwei Bildern.
      expect(gap).toBeGreaterThanOrEqual(DROP_SPACING - 0.001);
      expect(gap).toBeLessThan(DROP_SPACING + 0.3);
    }
  });

  it('räumt verblasste Tropfen weg und hält die Liste unter der Obergrenze', () => {
    const trail = freshTrail();
    wound(trail, 0);
    // Lange genug rennen, dass die Obergrenze zuschlägt.
    let now = walk(trail, 0, DROP_SPACING * DROP_LIMIT * 3, 0.5, 0);
    expect(trail.drops).toHaveLength(DROP_LIMIT);
    // Und danach stehen bleiben, bis der letzte verblasst ist.
    now += DROP_FADE + 1;
    stepTrail(trail, { x: 0, z: 0 }, now);
    expect(trail.drops).toHaveLength(0);
  });

  it('verblasst jeden Tropfen linear über DROP_FADE', () => {
    const drop = { x: 0, z: 0, since: 10 };
    expect(dropAlpha(drop, 10)).toBe(1);
    expect(dropAlpha(drop, 10 + DROP_FADE / 2)).toBeCloseTo(0.5, 6);
    expect(dropAlpha(drop, 10 + DROP_FADE)).toBe(0);
    expect(dropAlpha(drop, 10 + DROP_FADE * 4)).toBe(0);
    // Ein Stand vom Netz darf aus der Zukunft kommen; das ist kein Alter.
    expect(dropAlpha(drop, 9)).toBe(1);
  });
});

describe('Was das Monster daraus liest', () => {
  /** Eine gerade Spur nach Osten, ein Tropfen je `DROP_SPACING`. */
  function eastward(): Trail {
    const trail = freshTrail();
    wound(trail, 0);
    walk(trail, 0, 12, 0.25, 0);
    return trail;
  }

  it('findet den jüngsten Tropfen unter den eigenen Füßen', () => {
    const trail = eastward();
    const last = trail.drops.at(-1)!;
    const scent = sniff(trail, { x: last.x, z: 0 }, 20, () => true)!;
    expect(scent.at).toEqual(last);
    expect(scent.age).toBeCloseTo(20 - last.since, 6);
  });

  it('zeigt die Richtung, in die der Getroffene weitergelaufen ist', () => {
    const trail = eastward();
    const last = trail.drops.at(-1)!;
    const scent = sniff(trail, { x: last.x, z: 0 }, 20, () => true)!;
    expect(scent.dir!.x).toBeCloseTo(1, 6);
    expect(scent.dir!.z).toBeCloseTo(0, 6);
  });

  /**
   * Die Regel gegen das Hellsehen, zweifach: Was zu weit weg liegt, wird nicht
   * gefunden, und was der Aufrufer (in der Regel: der Raum des Monsters)
   * ausschließt, auch nicht.
   */
  it('riecht nichts quer durch die Station', () => {
    const trail = eastward();
    const last = trail.drops.at(-1)!;
    expect(sniff(trail, { x: last.x + SNIFF_RANGE + 1, z: 0 }, 20, () => true)).toBeNull();
    expect(sniff(trail, { x: last.x, z: 0 }, 20, () => false)).toBeNull();
  });

  it('gibt aus einem einzelnen Tropfen keine Richtung her', () => {
    const trail = freshTrail();
    wound(trail, 0);
    stepTrail(trail, { x: 0, z: 0 }, 0);
    expect(trail.drops).toHaveLength(1);
    const scent = sniff(trail, { x: 0, z: 0 }, 1, () => true)!;
    expect(scent.dir).toBeNull();
  });

  it('glaubt einer frischen Fährte mehr als einer alten', () => {
    const trail = eastward();
    const last = trail.drops.at(-1)!;
    const fresh = sniff(trail, { x: last.x, z: 0 }, last.since, () => true)!;
    const old = sniff(trail, { x: last.x, z: 0 }, last.since + DROP_FADE * 0.75, () => true)!;
    expect(fresh.trust).toBeCloseTo(SCENT_TRUST, 6);
    expect(old.trust).toBeLessThan(fresh.trust);
    expect(old.trust).toBeGreaterThan(0);
    // Nie so sicher wie eine Sichtung — sonst schenkte ein Treffer die Runde.
    expect(SCENT_TRUST).toBeLessThan(1);
  });

  it('findet in einer verblassten Spur nichts mehr', () => {
    const trail = eastward();
    const last = trail.drops.at(-1)!;
    expect(sniff(trail, { x: last.x, z: 0 }, last.since + DROP_FADE, () => true)).toBeNull();
  });
});

describe('Was vom Netz hereinkommt', () => {
  it('macht aus fremdem Text Tropfen mit endlichen Zahlen', () => {
    expect(readDrops(undefined)).toEqual([]);
    expect(readDrops('viel Blut')).toEqual([]);
    expect(readDrops([{ x: 1e9, z: 'weit', since: NaN }, null])).toEqual([
      { x: 1000, z: 0, since: 0 },
      { x: 0, z: 0, since: 0 },
    ]);
  });

  it('nimmt höchstens DROP_LIMIT Tropfen an', () => {
    const flood = Array.from({ length: DROP_LIMIT * 20 }, (_, i) => ({ x: i, z: 0, since: 0 }));
    expect(readDrops(flood)).toHaveLength(DROP_LIMIT);
  });
});
