/**
 * **Die Zeilen der Positionsanzeige** (`positionHud.ts`) — Meter, Kachel, Ebene
 * und die Adresse, die `worlds/test/spawnAt.ts` wieder liest.
 */
import { positionLine, positionText } from './positionHud';
import { spawnAt } from '../worlds/test/spawnAt';

describe('positionText', () => {
  it('nennt Meter, Kachel, Ebene und die Adresse dorthin', () => {
    expect(positionText(12.345, 0, -31.2, 0)).toBe(
      'x 12.35 · z −31.20 · y 0.00\nKachel 12 | -32 · Ebene 0\n?at=12,-32',
    );
  });

  it('nimmt die Ebene in die Adresse, wenn sie nicht null ist', () => {
    const text = positionText(17.5, 2.8, -16.5, 1);
    expect(text).toContain('Ebene 1');
    expect(text.endsWith('?at=17,-17,1')).toBe(true);
  });

  it('führt mit ihrer Adresse genau auf die Kachel zurück', () => {
    const at = positionText(-8.9, 0, 3.1, 0).split('\n')[2]!;
    expect(spawnAt(at)).toEqual({ x: -9, z: 3, level: 0 });
  });

  it('lässt die Ebene weg, wo es keine gibt, und hält Unsinn aus', () => {
    expect(positionText(1, 0, 1, null)).not.toContain('Ebene');
    expect(positionText(-0.001, 0, 0, null)).toContain('x 0.00');
    expect(positionText(Number.NaN, 0, 0, 0)).toBe('Position unbekannt');
  });

  it('kopiert alle drei Zeilen als eine', () => {
    expect(positionLine(positionText(12.345, 0, -31.2, 0))).toBe(
      'x 12.35 · z −31.20 · y 0.00 · Kachel 12 | -32 · Ebene 0 · ?at=12,-32',
    );
  });
});
