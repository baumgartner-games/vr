import {
  BODY_DAMAGE,
  HEAD_DAMAGE,
  HEAD_FACTOR,
  damageFor,
  headOf,
  hitZone,
  type HitBody,
} from './npcHit';

const body: HitBody = { feet: { x: 0, y: 0, z: 0 }, height: 1.8, radius: 0.3 };

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

  it('geht über den Kopf hinweg vorbei', () => {
    expect(hitZone(...shot(body.height + 0.5), body)).toBeNull();
  });

  it('geht unter den Füßen durch', () => {
    expect(hitZone(...shot(0.02), body)).toBeNull();
  });

  it('geht neben ihm vorbei', () => {
    expect(hitZone(...shot(1.1, body.radius + 0.2), body)).toBeNull();
    // Und knapp daneben ist noch getroffen: der Rumpf hat eine Breite.
    expect(hitZone(...shot(1.1, body.radius - 0.05), body)).toBe('body');
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
      expect(hitZone(from, to, body)).toBe('head');
    }
  });

  it('zählt eine Strecke, die vor ihm endet, nicht als Treffer', () => {
    expect(hitZone({ x: 0, y: 1.1, z: -10 }, { x: 0, y: 1.1, z: -2 }, body)).toBeNull();
  });

  it('zählt auch einen Schuss von schräg oben', () => {
    expect(hitZone({ x: 0, y: 3, z: -3 }, { x: 0, y: 0.6, z: 0.4 }, body)).not.toBeNull();
  });

  it('rechnet einen Kopfschuss viermal so teuer wie einen in den Rumpf', () => {
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
