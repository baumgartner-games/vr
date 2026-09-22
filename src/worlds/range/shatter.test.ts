import { BURST_FORWARD, BURST_OUT, BURST_SPIN, BURST_UP, pieceBurst } from './shatter';
import type { Vec3 } from './scoring';

/**
 * Geschossen wird auf dem Stand nach Osten, die Scheibe hängt senkrecht in
 * der YZ-Ebene — genau so kommen die Zahlen aus `zones/range.ts` hier an.
 */
const EAST: Vec3 = { x: 1, y: 0, z: 0 };

/** Die sechs Stücke, wie sie um die Mitte der Scheibe sitzen. */
const PIECES: Vec3[] = [0, 1, 2, 3, 4, 5].map((step) => {
  const angle = (step * Math.PI) / 3;
  // Ein Keil von 14 cm Dicke sitzt auch ein Stück **hinter** der Mitte — das
  // ist der Anteil, den die Rechnung herausnehmen muss.
  return { x: 0.07, y: Math.cos(angle) * 0.2, z: Math.sin(angle) * 0.2 };
});

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

describe('pieceBurst', () => {
  it('schickt jedes Stück von der Mitte weg', () => {
    for (const piece of PIECES) {
      const { velocity } = pieceBurst(piece, EAST);
      // Nur quer zur Schussrichtung gemessen: Der Schub nach hinten ist für
      // alle gleich und sagt nichts darüber, ob die Scheibe aufgeht.
      const radial = { x: 0, y: piece.y, z: piece.z };
      const away = { x: 0, y: velocity.y - BURST_UP, z: velocity.z };
      expect(dot(radial, away)).toBeGreaterThan(0);
    }
  });

  it('gibt allen denselben Schub in Schussrichtung', () => {
    for (const piece of PIECES) {
      expect(dot(pieceBurst(piece, EAST).velocity, EAST)).toBeCloseTo(BURST_FORWARD);
    }
  });

  it('hebt die Stücke im Mittel an, statt sie fallen zu lassen', () => {
    // Sechs Stücke rings um die Mitte heben sich nach außen gegenseitig auf;
    // was übrig bleibt, ist genau der gemeinsame Schub nach oben.
    const lift = PIECES.reduce((sum, piece) => sum + pieceBurst(piece, EAST).velocity.y, 0);
    expect(lift / PIECES.length).toBeCloseTo(BURST_UP);
  });

  it('treibt die sechs auseinander und nicht zur Seite', () => {
    // Dieselbe Summe quer zur Schussrichtung: Der Stoß nach außen hat keine
    // Vorzugsrichtung, sonst flöge die ganze Scheibe nach links.
    let sideways = 0;
    for (const piece of PIECES) sideways += pieceBurst(piece, EAST).velocity.z;
    expect(sideways).toBeCloseTo(0);
  });

  it('gibt dem Stoß nach außen die volle Geschwindigkeit', () => {
    const { velocity } = pieceBurst({ x: 0.07, y: 0.2, z: 0 }, EAST);
    expect(velocity.y).toBeCloseTo(BURST_OUT + BURST_UP);
    expect(velocity.x).toBeCloseTo(BURST_FORWARD);
  });

  it('dreht jedes Stück quer zu seiner eigenen Bahn', () => {
    for (const piece of PIECES) {
      const { velocity, spin } = pieceBurst(piece, EAST);
      expect(Math.hypot(spin.x, spin.y, spin.z)).toBeCloseTo(BURST_SPIN);
      // Die Achse steht auf der Schussrichtung senkrecht …
      expect(dot(spin, EAST)).toBeCloseTo(0);
      // … und auf dem Weg nach außen auch.
      expect(dot(spin, { x: 0, y: velocity.y - BURST_UP, z: velocity.z })).toBeCloseTo(0);
    }
  });

  /**
   * Ein Stück, dessen Mitte genau auf der Achse der Scheibe sitzt, hat keine
   * Richtung nach außen — es soll trotzdem eine Zahl bekommen und kein `NaN`.
   */
  it('kommt ohne Richtung nach außen aus', () => {
    const { velocity, spin } = pieceBurst({ x: 0.07, y: 0, z: 0 }, EAST);
    expect(velocity.x).toBeCloseTo(BURST_FORWARD);
    expect(velocity.y).toBeCloseTo(BURST_UP);
    expect(velocity.z).toBeCloseTo(0);
    expect(spin).toEqual({ x: 0, y: 0, z: 0 });
  });

  /** Und eine Schussrichtung der Länge null ist auch kein Fehler. */
  it('kommt ohne Schussrichtung aus', () => {
    const { velocity } = pieceBurst({ x: 0, y: 0.2, z: 0 }, { x: 0, y: 0, z: 0 });
    expect(velocity.x).toBeCloseTo(0);
    expect(velocity.y).toBeCloseTo(BURST_OUT + BURST_UP);
    expect(Number.isNaN(velocity.z)).toBe(false);
  });
});
