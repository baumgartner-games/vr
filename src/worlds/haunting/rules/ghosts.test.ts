import {
  GHOST_FADE,
  GHOST_TTL,
  freshGhosts,
  ghostAge,
  ghostAlpha,
  markGhost,
  type Ghost,
} from './ghosts';

describe('Der Marker der zuletzt gesehenen Stelle', () => {
  it('fängt leer an — niemand hat jemanden gesehen', () => {
    expect(freshGhosts()).toEqual({ monster: null, technician: null });
  });

  it('steht bei Sichtkontakt neu, mit Stelle, Blick und Zeit', () => {
    const ghost = markGhost(null, true, { x: 4, z: -12 }, 1.25, 30)!;
    expect(ghost).toEqual({ x: 4, z: -12, yaw: 1.25, since: 30 });
    // Und der nächste Sichtkontakt versetzt ihn.
    expect(markGhost(ghost, true, { x: 9, z: -3 }, -0.5, 34)).toEqual({
      x: 9,
      z: -3,
      yaw: -0.5,
      since: 34,
    });
  });

  /**
   * Der eigentliche Sinn der Sache: Ein Marker läuft nicht mit. Wer aus dem
   * Blick gerät, lässt seinen alten Punkt zurück — auch nach einer halben
   * Minute steht er noch genau dort, wo er gesetzt wurde.
   */
  it('bleibt ohne Sichtkontakt stehen, wo er war — und wird nur älter', () => {
    const ghost = markGhost(null, true, { x: 4, z: -12 }, 0, 30)!;
    let held: Ghost | null = ghost;
    for (let now = 31; now < 90; now++) held = markGhost(held, false, { x: 0, z: 0 }, 3, now);
    expect(held).toEqual(ghost);
    expect(ghostAge(ghost, 90)).toBe(60);
    // Wer nie gesehen wurde, bekommt auch keinen Marker geschenkt.
    expect(markGhost(null, false, { x: 1, z: 1 }, 0, 12)).toBeNull();
  });

  it('rechnet das Alter nie negativ', () => {
    const ghost = markGhost(null, true, { x: 0, z: 0 }, 0, 30)!;
    // Ein Stand vom Netz kann kurz aus der Zukunft kommen; das ist kein Alter.
    expect(ghostAge(ghost, 29)).toBe(0);
  });
});

describe('Wie ein Marker verblasst', () => {
  const ghost: Ghost = { x: 0, z: 0, yaw: 0, since: 100 };
  const alphaAt = (age: number): number => ghostAlpha(ghost, ghost.since + age);

  it('steht voll da, solange das Ausblenden noch nicht angefangen hat', () => {
    expect(alphaAt(0)).toBe(1);
    expect(alphaAt(GHOST_TTL - GHOST_FADE)).toBe(1);
  });

  it('blendet über GHOST_FADE Sekunden linear aus', () => {
    expect(alphaAt(GHOST_TTL - GHOST_FADE / 2)).toBeCloseTo(0.5, 6);
    expect(alphaAt(GHOST_TTL - 1)).toBeCloseTo(1 / GHOST_FADE, 6);
  });

  it('ist ab GHOST_TTL null und bleibt es', () => {
    expect(alphaAt(GHOST_TTL)).toBe(0);
    expect(alphaAt(GHOST_TTL + 600)).toBe(0);
  });

  /**
   * Die beiden Zahlen gehören zusammen: Das Ausblenden ist das Ende der
   * Lebenszeit, nicht ihr Anfang. Wer `GHOST_FADE` über `GHOST_TTL` schöbe,
   * bekäme einen Marker, der schon blass zur Welt kommt.
   */
  it('hält das Ausblenden innerhalb der Lebenszeit', () => {
    expect(GHOST_FADE).toBeGreaterThan(0);
    expect(GHOST_FADE).toBeLessThan(GHOST_TTL);
  });
});
