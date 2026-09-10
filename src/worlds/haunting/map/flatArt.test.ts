/** @jest-environment jsdom */
import { CARGO_BAND_COLORS, FIXTURE_CATALOG, LOCKER_SIZE, markHeight } from '../fixtureDimensions';
import type { MapItem } from './mapSnapshot';
import {
  ART,
  CREW_COLORS,
  crewColor,
  drawCrewmate,
  drawFixture,
  drawMonster,
  drawName,
  drawProp,
  facingOf,
  fixtureHeight,
  hull,
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
  it('nimmt für ein Möbel die Höhe seines Bausteins, nicht die Hülle der Aufstellung', () => {
    // `FIXTURE_CATALOG` sagt, wie viel Platz ein Möbel beim Stellen braucht —
    // samt Griffen und Luft darüber. Auf dem Bild ist das die falsche Zahl:
    // Ein Esstisch von 1,6 m sähe aus wie ein Schrank. Gezeichnet wird die
    // Höhe des Klotzes, aus dem auch das 3D-Modell gebaut wird.
    const table = markHeight('esstisch');
    expect(table).toBeLessThan(FIXTURE_CATALOG.esstisch.height);
    expect(fixtureHeight({ kind: 'fixture', mark: 'esstisch' })).toBe(table);
    // Ein Regal steht höher als ein Tisch, eine Bank niedriger.
    expect(markHeight('buecher')).toBeGreaterThan(table);
    expect(markHeight('bett')).toBeLessThan(table);
    // Module bringen ihre eigene Höhe mit — die ist beim Modul die richtige.
    expect(fixtureHeight({ kind: 'locker' })).toBe(LOCKER_SIZE.height);
    // Und ein Möbel ohne Sorte fällt auf einen Meter zurück statt auf NaN.
    expect(fixtureHeight({ kind: 'fixture' })).toBe(1);
  });

  it('zeichnet ein Möbel als Klotz mit Umriss und Deckfläche', () => {
    const { ctx, calls } = fakeContext();
    drawFixture(ctx, 40, 60, 50, {
      kind: 'fixture',
      mark: 'esstisch',
      yaw: 0,
      width: 1.8,
      depth: 1,
    });
    // Schatten, Körper und Deckel: drei geschlossene Pfade.
    expect(named(calls, 'closePath').length).toBe(3);
    expect(named(calls, 'fill').length).toBe(3);
    expect(named(calls, 'stroke').length).toBe(2);
    // Der Körper reicht um die Höhe des Tisches nach Norden über die Grundfläche.
    const ys = named(calls, 'lineTo')
      .concat(named(calls, 'moveTo'))
      .map((call) => call.args[1] as number);
    expect(Math.min(...ys)).toBeCloseTo(-(markHeight('esstisch') * 50) - (1 * 50) / 2, 5);
    expect(Math.max(...ys)).toBeCloseTo((1 * 50) / 2, 5);
  });

  it('legt die Hülle eines gedrehten Klotzes gegen den Uhrzeigersinn', () => {
    // Acht Punkte, vier davon innen: Der Umriss ist die konvexe Hülle aus
    // Grundfläche und verschobener Deckfläche.
    const square = hull([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0.5, 0.5],
    ]);
    expect(square).toHaveLength(4);
    expect(square).toEqual(
      expect.arrayContaining([
        [0, 0],
        [1, 1],
      ]),
    );
  });
});

/** Wie `fakeContext`, aber er merkt sich auch gesetzte Farben und Schriften. */
function paintingContext(): { ctx: CanvasRenderingContext2D; calls: Call[] } {
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
      calls.push({ name: `set:${key}`, args: [value] });
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe('Frachtkiste', () => {
  const crate = (
    extra: Partial<MapItem>,
  ): Pick<MapItem, 'kind' | 'state' | 'interactive' | 'mark' | 'goal'> => ({
    kind: 'cargo',
    state: 'closed',
    interactive: true,
    mark: { colour: 'blau', number: 2 },
    ...extra,
  });

  it('trägt ihr Kennzeichen auch ohne Ziel — Farbband aus mark, Nummer als Schrift', () => {
    const { ctx, calls } = paintingContext();
    drawProp(ctx, 0, 0, 80, crate({}), 0.5);
    const band = `#${CARGO_BAND_COLORS.blau.toString(16).padStart(6, '0')}`;
    expect(named(calls, 'set:fillStyle').map((c) => c.args[0])).toContain(band);
    expect(named(calls, 'fillText')[0]?.args[0]).toBe('2');
    // Eine andere Farbe ist ein anderes Band.
    const other = paintingContext();
    drawProp(other.ctx, 0, 0, 80, crate({ mark: { colour: 'rot', number: 1 } }), 0.5);
    expect(named(other.calls, 'set:fillStyle').map((c) => c.args[0])).not.toContain(band);
  });

  it('leuchtet als Ziel selbst — mehr Zeichnung als dieselbe Kiste ohne Ziel', () => {
    const plain = paintingContext();
    drawProp(plain.ctx, 0, 0, 80, crate({}), 0.5);
    const lit = paintingContext();
    drawProp(lit.ctx, 0, 0, 80, crate({ goal: true }), 0.5);
    expect(lit.calls.length).toBeGreaterThan(plain.calls.length);
    // Schein darunter, Umriss darum: der Verlauf und das Gelb des Kompasses.
    expect(named(lit.calls, 'createRadialGradient').length).toBe(1);
    expect(named(lit.calls, 'set:strokeStyle').map((c) => c.args[0])).toContain(ART.goal);
    expect(named(plain.calls, 'set:strokeStyle').map((c) => c.args[0])).not.toContain(ART.goal);
    // Eine geleerte Kiste leuchtet nicht mehr, auch wenn jemand sie noch meldet.
    const done = paintingContext();
    drawProp(done.ctx, 0, 0, 80, crate({ state: 'taken', goal: true }), 0.5);
    expect(named(done.calls, 'set:strokeStyle').map((c) => c.args[0])).not.toContain(ART.goal);
  });
});
