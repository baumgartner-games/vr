/** @jest-environment jsdom */
import {
  CREW_COLORS,
  crewColor,
  drawCrewmate,
  drawMonster,
  drawName,
  drawProp,
  facingOf,
  legLift,
  linearGradient,
  monsterHeight,
  walkPhase,
} from './flatArt';

/** Ein Kontext, der nur mitschreibt: welche Methode mit welchen Argumenten. */
interface Call {
  name: string;
  args: unknown[];
}

function fakeContext(): { ctx: CanvasRenderingContext2D; calls: Call[] } {
  const calls: Call[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, key: string) => {
      if (key in target) return target[key];
      return (...args: unknown[]) => {
        calls.push({ name: key, args });
      };
    },
    set: (target, key: string, value) => {
      target[key] = value;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const named = (calls: Call[], name: string) => calls.filter((c) => c.name === name);

describe('Crewmate', () => {
  it('spiegelt den Kontext nur für den Blick nach links', () => {
    const right = fakeContext();
    drawCrewmate(right.ctx, 100, 100, {
      scale: 80,
      fill: '#0f0',
      shade: '#070',
      facing: 1,
      phase: 0,
    });
    expect(named(right.calls, 'scale')).toHaveLength(0);
    expect(named(right.calls, 'translate')[0]?.args).toEqual([100, 100]);
    const left = fakeContext();
    drawCrewmate(left.ctx, 100, 100, {
      scale: 80,
      fill: '#0f0',
      shade: '#070',
      facing: -1,
      phase: 0,
    });
    expect(named(left.calls, 'scale')).toEqual([{ name: 'scale', args: [-1, 1] }]);
    // Beide zeichnen gleich viel: Körper, Visier, Rucksack, zwei Beine, Schatten.
    expect(named(left.calls, 'fill')).toHaveLength(named(right.calls, 'fill').length);
    expect(named(left.calls, 'roundRect').length).toBeGreaterThanOrEqual(6);
    expect(named(left.calls, 'save')).toHaveLength(1);
    expect(named(left.calls, 'restore')).toHaveLength(1);
  });

  it('hebt beim Gehen abwechselnd die Beine', () => {
    expect(legLift(0)).toEqual({ left: 0, right: 0 });
    const a = legLift(0.25),
      b = legLift(0.75);
    expect(a.left).toBeCloseTo(1);
    expect(a.right).toBe(0);
    expect(b.left).toBe(0);
    expect(b.right).toBeCloseTo(1);
    // Stehend bleibt die Phase 0; gehend läuft sie um, rennend schneller.
    expect(walkPhase(3.7, false)).toBe(0);
    const walking = walkPhase(0.1, true),
      running = walkPhase(0.1, true, true);
    expect(walking).toBeGreaterThan(0);
    expect(running).toBeGreaterThan(walking);
    expect(walkPhase(1, true)).toBeLessThan(1);
    // Und auf dem Bild landen die Beine an verschiedenen Höhen.
    const y = (phase: number): number[] => {
      const { ctx, calls } = fakeContext();
      drawCrewmate(ctx, 0, 0, { scale: 100, fill: '#0f0', shade: '#070', facing: 1, phase });
      // Die Beine sind das zweite und dritte roundRect (nach dem Rucksack).
      return named(calls, 'roundRect')
        .slice(1, 3)
        .map((c) => c.args[1] as number);
    };
    const [leftDown, rightDown] = y(0);
    const [leftUp, rightStill] = y(0.25);
    expect(leftUp).toBeLessThan(leftDown!);
    expect(rightStill).toBe(rightDown);
  });

  it('gibt dem Spieler Grün und allen anderen eine stabile eigene Farbe', () => {
    expect(crewColor('player', 'player')[0]).toBe('green');
    expect(crewColor('irgendwer', 'player')[0]).toBe('green');
    const a = crewColor('peer:abc', 'peer');
    expect(crewColor('peer:abc', 'peer')).toBe(a);
    expect(a[0]).not.toBe('green');
    expect(CREW_COLORS.some((c) => c === a)).toBe(true);
    expect(crewColor('bot', 'bot')[0]).not.toBe('green');
  });

  it('entscheidet die Blickseite aus dem yaw und hält sie bei Nord und Süd', () => {
    // yaw 0 schaut nach Norden: keine Seite — die alte bleibt.
    expect(facingOf(0, -1)).toBe(-1);
    expect(facingOf(Math.PI, 1)).toBe(1);
    // Positiv dreht nach Westen (links), negativ nach Osten (rechts).
    expect(facingOf(Math.PI / 2)).toBe(-1);
    expect(facingOf(-Math.PI / 2)).toBe(1);
  });
});

describe('Monster und Requisiten', () => {
  it('zeichnet das Monster gespiegelt mit zwei glühenden Augen, je Sorte anders hoch', () => {
    const { ctx, calls } = fakeContext();
    drawMonster(ctx, 10, 20, { scale: 80, kind: 'stalker', facing: -1, phase: 0.3, time: 1 });
    expect(named(calls, 'scale')).toEqual([{ name: 'scale', args: [-1, 1] }]);
    // Schatten (ellipse) + Silhouette (fill) + je Auge Schein und Kern.
    expect(named(calls, 'arc')).toHaveLength(4);
    expect(monsterHeight('crawler')).toBeLessThan(monsterHeight('stalker'));
    expect(monsterHeight('sentinel')).toBeGreaterThan(monsterHeight('stalker'));
    const crawler = fakeContext();
    drawMonster(crawler.ctx, 0, 0, { scale: 80, kind: 'crawler', facing: 1, phase: 0, time: 0 });
    expect(named(crawler.calls, 'scale')).toHaveLength(0);
    expect(named(crawler.calls, 'lineTo').length).not.toBe(named(calls, 'lineTo').length);
  });

  it('zeichnet jede Requisite und unterscheidet ihre Zustände', () => {
    const count = (kind: string, state: string, interactive = true): number => {
      const { ctx, calls } = fakeContext();
      drawProp(ctx, 0, 0, 80, { kind: kind as never, state, interactive }, 0.5);
      expect(named(calls, 'save')).toHaveLength(1);
      expect(named(calls, 'restore')).toHaveLength(1);
      return calls.length;
    };
    for (const kind of ['cargo', 'console', 'locker', 'vent', 'fuse', 'van', 'task', 'medkit'])
      expect(count(kind, '')).toBeGreaterThan(5);
    // Ein zerstörter Schrank ist ein anderes Bild als ein heiler; eine offene Klappe als eine zu.
    expect(count('locker', 'destroyed')).not.toBe(count('locker', 'locked'));
    expect(count('cargo', 'open')).not.toBe(count('cargo', 'closed'));
    const grille = (open: boolean) => {
      const { ctx, calls } = fakeContext();
      drawProp(ctx, 0, 0, 80, { kind: 'vent', state: open ? 'open' : '', interactive: false });
      return { rect: named(calls, 'rect').length, lineTo: named(calls, 'lineTo').length };
    };
    expect(grille(false).rect).toBe(4);
    expect(grille(true).rect).toBe(0);
    expect(grille(true).lineTo).toBeGreaterThan(0);
  });

  it('schreibt Namen mit Rand und fällt ohne Verlauf auf die erste Farbe zurück', () => {
    const { ctx, calls } = fakeContext();
    drawName(ctx, 5, 6, 'Techniker');
    expect(named(calls, 'strokeText')[0]?.args).toEqual(['Techniker', 5, 6]);
    expect(named(calls, 'fillText')[0]?.args).toEqual(['Techniker', 5, 6]);
    expect(
      linearGradient(ctx, 0, 0, 0, 1, [
        [0, '#123456'],
        [1, '#000000'],
      ]),
    ).toBe('#123456');
  });
});
