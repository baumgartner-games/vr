import {
  GHOST_FADE,
  GHOST_TTL,
  GHOST_WATCH,
  freshGhosts,
  ghostAge,
  ghostAgeText,
  ghostAlpha,
  ghostsToDraw,
  markGhost,
  type Ghost,
  type Ghosts,
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

describe('Wer welchen Marker zu sehen bekommt', () => {
  const both: Ghosts = {
    monster: { x: 1, z: 2, yaw: 0, since: 100 },
    technician: { x: 3, z: 4, yaw: 1, since: 100 },
  };
  const kinds = (list: ReturnType<typeof ghostsToDraw>): string[] => list.map((one) => one.kind);

  it('zeigt dem Techniker nur den Marker des Monsters — und nur ohne Sicht darauf', () => {
    expect(kinds(ghostsToDraw(both, 105, { omniscient: false, viewer: 'technician' }))).toEqual([
      'monster',
    ]);
    expect(
      ghostsToDraw(both, 105, {
        omniscient: false,
        viewer: 'technician',
        visible: (kind) => kind === 'monster',
      }),
    ).toEqual([]);
  });

  it('zeigt dem Monster nur den Marker des Technikers', () => {
    expect(kinds(ghostsToDraw(both, 105, { omniscient: false, viewer: 'monster' }))).toEqual([
      'technician',
    ]);
  });

  /**
   * Der Zuschauer sieht beides **neben** den echten Figuren — sonst sähe er
   * nicht, was die beiden voneinander glauben, und genau das ist die halbe
   * Spannung. Blass, damit er die Erinnerung nicht für einen Körper hält.
   */
  it('zeigt dem Zuschauer beide, blass und trotz Sicht', () => {
    const seen = ghostsToDraw(both, 105, {
      omniscient: true,
      viewer: 'technician',
      visible: () => true,
    });
    expect(kinds(seen)).toEqual(['monster', 'technician']);
    for (const one of seen) expect(one.alpha).toBeCloseTo(GHOST_WATCH, 6);
  });

  it('lässt verfallene Marker und fehlende Stände weg', () => {
    expect(ghostsToDraw(both, 100 + GHOST_TTL, { omniscient: true, viewer: 'monster' })).toEqual(
      [],
    );
    expect(ghostsToDraw(undefined, 0, { omniscient: true, viewer: 'monster' })).toEqual([]);
    expect(ghostsToDraw(freshGhosts(), 0, { omniscient: true, viewer: 'monster' })).toEqual([]);
  });
});

describe('Wie alt eine Erinnerung im Funk heißt', () => {
  const ghost: Ghost = { x: 0, z: 0, yaw: 0, since: 100 };

  it('zählt Sekunden, solange es Sekunden sind, und danach Minuten', () => {
    expect(ghostAgeText(ghost, 106)).toBe('vor 6 s');
    expect(ghostAgeText(ghost, 159)).toBe('vor 59 s');
    expect(ghostAgeText(ghost, 220)).toBe('vor 2 min');
  });
});
