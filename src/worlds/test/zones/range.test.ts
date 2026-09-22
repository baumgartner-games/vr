import { RANGE, centre } from '../layout';
import { BERM, FIRING_LINE, LANES, PLATE_ROW, TARGET_ROWS, targetSpot } from './range';

/**
 * **Die Scheiben stehen vor der Linie und nicht neben ihr.**
 *
 * Geschossen wird nach Osten: Die Entfernung ist eine Strecke in X hinter der
 * Schießlinie, die Bahn liegt quer dazu in Z. Eine Zeit lang war das in den
 * vier Bauern vertauscht, und die Scheiben standen zwanzig Meter nördlich —
 * die Marken am Rand hatten es die ganze Zeit richtig. Dieser Test hält die
 * eine Rechnung, aus der jetzt alle vier lesen, vor die Linie.
 */
describe('targetSpot', () => {
  it('legt jede Scheibe genau ihre Entfernung östlich der Schießlinie', () => {
    for (const distance of [...TARGET_ROWS, PLATE_ROW]) {
      for (const lane of LANES) {
        expect(targetSpot(lane, distance).x).toBeCloseTo(FIRING_LINE + distance);
      }
    }
  });

  it('hält die Bahn in Z, innerhalb des Stands', () => {
    const north = RANGE.z;
    const south = RANGE.z + RANGE.d;
    for (const lane of LANES) {
      const { z } = targetSpot(lane, 10);
      expect(z).toBe(centre(lane));
      expect(z).toBeGreaterThan(north);
      expect(z).toBeLessThan(south);
    }
  });

  it('stellt nichts hinter den Kugelfang', () => {
    for (const distance of [...TARGET_ROWS, PLATE_ROW]) {
      expect(targetSpot(0, distance).x).toBeLessThan(BERM.x);
    }
  });
});
