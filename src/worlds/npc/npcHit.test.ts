import {
  BODY_DAMAGE,
  HEAD_DAMAGE,
  HEAD_FACTOR,
  bodyShape,
  damageFor,
  headOf,
  hitParts,
  hitZone,
  type HitBody,
} from './npcHit';

const body: HitBody = { feet: { x: 0, y: 0, z: 0 }, height: 1.8, radius: 0.3 };
const shape = bodyShape(body.height, body.radius);

/** Ein Schuss von zehn Metern, waagerecht, auf dieser Höhe und diesem Versatz. */
function shot(
  y: number,
  x = 0,
): [{ x: number; y: number; z: number }, { x: number; y: number; z: number }] {
  return [
    { x, y, z: -10 },
    { x, y, z: 10 },
  ];
}

describe('Wohin ein Schuss geht', () => {
  it('trifft den Kopf oben', () => {
    const head = headOf(body);
    expect(hitZone(...shot(head.center.y), body)).toBe('head');
  });

  it('trifft den Rumpf in der Mitte', () => {
    expect(hitZone(...shot(1.1), body)).toBe('body');
  });

  it('trifft die Beine unter der Hüfte', () => {
    expect(hitZone(...shot(shape.hip - 0.1), body)).toBe('body');
  });

  it('geht über den Kopf hinweg vorbei', () => {
    expect(hitZone(...shot(body.height + 0.5), body)).toBeNull();
  });

  it('geht unter den Füßen durch', () => {
    expect(hitZone(...shot(0.02), body)).toBeNull();
  });

  /**
   * **Die Zahl, wegen der diese Zone kein Zylinder mehr ist.**
   *
   * Der Collider ist 29 cm im Halbmesser, die Schultern sind 23 cm — dazwischen
   * lag früher eine Handbreit Luft, die als Rumpftreffer zählte. Wer knapp
   * daneben zielt, soll daneben treffen; wer die Schulter erwischt, trifft.
   */
  it('trifft die Schulter und nicht die Luft daneben', () => {
    expect(hitZone(...shot(1.1, shape.width / 2 - 0.02), body)).toBe('body');
    expect(hitZone(...shot(1.1, shape.width / 2 + 0.02), body)).toBeNull();
    // Und der Collider-Halbmesser ist wirklich weiter draußen als der Körper:
    // genau diese Differenz war der Fehler.
    expect(body.radius).toBeGreaterThan(shape.width / 2);
    expect(hitZone(...shot(1.1, body.radius), body)).toBeNull();
  });

  /**
   * Ein Rumpf ist **breiter als tief**, und deshalb bringt ein Treffer den
   * Gierwinkel mit. Derselbe Schuss aus derselben Richtung trifft den, der
   * quersteht, und geht an dem vorbei, der ihn ansieht.
   */
  it('dreht die Zone mit dem, der sie trägt', () => {
    const across = shape.width / 2 - 0.02;
    // Von vorn (entlang Z) ist die halbe **Breite** der Spielraum …
    expect(hitZone(...shot(1.1, across), { ...body, yaw: 0 })).toBe('body');
    // … und quer gedreht die halbe **Tiefe**, also deutlich weniger.
    expect(across).toBeGreaterThan(shape.depth / 2);
    expect(hitZone(...shot(1.1, across), { ...body, yaw: Math.PI / 2 })).toBeNull();
    expect(hitZone(...shot(1.1, shape.depth / 2 - 0.02), { ...body, yaw: Math.PI / 2 })).toBe(
      'body',
    );
  });

  it('trifft ihn genauso, wenn er woanders steht', () => {
    const moved: HitBody = { ...body, feet: { x: 4, y: 2, z: -7 }, yaw: 1.1 };
    const from = { x: 4, y: 2 + 1.1, z: -17 };
    const to = { x: 4, y: 2 + 1.1, z: 3 };
    expect(hitZone(from, to, moved)).toBe('body');
  });

  it('erkennt einen Kopfschuss aus jeder Richtung, egal wohin er schaut', () => {
    const head = headOf(body);
    for (const angle of [0, 1, 2, 3, 4, 5]) {
      const from = {
        x: Math.cos(angle) * 6,
        y: head.center.y,
        z: Math.sin(angle) * 6,
      };
      const to = { x: -from.x, y: head.center.y, z: -from.z };
      expect(hitZone(from, to, { ...body, yaw: angle })).toBe('head');
    }
  });

  it('zählt eine Strecke, die vor ihm endet, nicht als Treffer', () => {
    expect(hitZone({ x: 0, y: 1.1, z: -10 }, { x: 0, y: 1.1, z: -2 }, body)).toBeNull();
  });

  it('zählt auch einen Schuss von schräg oben', () => {
    expect(hitZone({ x: 0, y: 3, z: -3 }, { x: 0, y: 0.6, z: 0.4 }, body)).not.toBeNull();
  });

  it('nimmt den Kopf und nicht den Rumpf, wenn die Strecke beide schneidet', () => {
    // Von schräg oben durch den Schädel und weiter in die Brust: Wer beide
    // fragt und den Rumpf nimmt, hat den Kopfschuss verschenkt.
    const from = { x: 0, y: 2.4, z: -0.2 };
    const to = { x: 0, y: 0.9, z: 0.1 };
    expect(hitZone(from, to, body)).toBe('head');
    // Dieselbe Strecke, aber erst unter dem Kinn angefangen: Dann ist es ein
    // Rumpftreffer — sie geht also wirklich durch beide Teile.
    expect(hitZone({ x: 0, y: 1.4, z: 0 }, to, body)).toBe('body');
  });

  describe('Die Teile, aus denen die Zone besteht', () => {
    it('setzt den Kopf so, dass sein Scheitel die Körperhöhe erreicht', () => {
      const parts = hitParts(body);
      expect(parts.head.center.y + parts.head.radius).toBeCloseTo(body.height, 6);
      expect(parts.head.radius).toBeCloseTo(headOf(body).radius, 6);
    });

    it('stapelt Beine, Rumpf und Kopf ohne Lücke aufeinander', () => {
      const parts = hitParts(body);
      const legTop = parts.legs.center.y + parts.legs.half.y;
      const torsoBottom = parts.torso.center.y - parts.torso.half.y;
      const torsoTop = parts.torso.center.y + parts.torso.half.y;
      expect(legTop).toBeCloseTo(torsoBottom, 6);
      expect(torsoTop).toBeCloseTo(shape.shoulder, 6);
      // Der Kopf sitzt auf den Schultern: sein unterer Rand ist ihre Höhe.
      expect(parts.head.center.y - parts.head.radius).toBeCloseTo(shape.shoulder, 6);
      // Und unten bleibt ein Rest Fuß, durch den ein Schuss hindurchgeht.
      expect(parts.legs.center.y - parts.legs.half.y).toBeGreaterThan(0);
    });
  });

  it('rechnet einen Kopftreffer viermal so teuer wie einen in den Rumpf', () => {
    expect(damageFor('head')).toBe(HEAD_DAMAGE);
    expect(damageFor('body')).toBe(BODY_DAMAGE);
    expect(HEAD_DAMAGE).toBe(BODY_DAMAGE * HEAD_FACTOR);
  });

  it('nimmt die Zahl der Waffe statt einer festen', () => {
    expect(damageFor('body', 60)).toBe(60);
    expect(damageFor('head', 60)).toBe(240);
  });

  // Die Zahl, wegen der es diesen Test gibt: Ein Zombie hat hundert Leben, die
  // Pistole macht fünfundzwanzig — vier Schuss in den Rumpf, **oder einer in
  // den Kopf**. Wer an einer der beiden Zahlen dreht, bricht hier.
  it('nimmt einen Zombie in vier Pistolenschüssen um — oder in einem Kopfschuss', () => {
    const pistol = 25;
    expect(damageFor('body', pistol) * 3).toBeLessThan(100);
    expect(damageFor('body', pistol) * 4).toBeGreaterThanOrEqual(100);
    expect(damageFor('head', pistol)).toBeGreaterThanOrEqual(100);
  });
});
