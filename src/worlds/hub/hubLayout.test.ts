import {
  CORRIDOR_WIDTH,
  GATES_PER_CORRIDOR,
  HALL_RADIUS,
  corridorDirection,
  layoutHub,
} from './hubLayout';

/** Abstand zweier Tore in der Ebene. */
function distance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

describe('Hub-Auslegung', () => {
  it('kommt mit gar keiner Welt zurecht', () => {
    const layout = layoutHub(0);
    expect(layout.gates).toHaveLength(0);
    expect(layout.corridors).toHaveLength(0);
  });

  it('setzt das erste Tor in den Gang geradeaus', () => {
    const layout = layoutHub(1);
    expect(layout.corridors).toHaveLength(1);
    expect(layout.corridors[0]!.angle).toBe(0);
    // Geradeaus ist −Z, und dort liegt das Tor auch.
    expect(layout.gates[0]!.z).toBeLessThan(-HALL_RADIUS);
  });

  it('macht einen neuen Gang auf, wenn der alte voll ist', () => {
    expect(layoutHub(GATES_PER_CORRIDOR).corridors).toHaveLength(1);
    expect(layoutHub(GATES_PER_CORRIDOR + 1).corridors).toHaveLength(2);
    expect(layoutHub(GATES_PER_CORRIDOR * 3).corridors).toHaveLength(3);
  });

  it('behält die Reihenfolge der Registry', () => {
    const layout = layoutHub(9);
    expect(layout.gates.map((gate) => gate.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('lässt jedes Tor im eigenen Gang stehen', () => {
    const layout = layoutHub(11);
    for (const gate of layout.gates) {
      const corridor = layout.corridors[gate.corridor]!;
      const direction = corridorDirection(corridor.angle);
      const side = { x: -direction.z, z: direction.x };
      const along = gate.x * direction.x + gate.z * direction.z;
      const across = gate.x * side.x + gate.z * side.z;
      expect(Math.abs(across)).toBeLessThanOrEqual(CORRIDOR_WIDTH / 2);
      expect(along).toBeGreaterThan(HALL_RADIUS);
      expect(along).toBeLessThanOrEqual(corridor.length);
    }
  });

  it('stellt keine zwei Tore aufeinander', () => {
    // Genau der Fehler, den der alte Bogen mit neun Welten hatte.
    const layout = layoutHub(12);
    for (const a of layout.gates) {
      for (const b of layout.gates) {
        if (a === b) continue;
        expect(distance(a, b)).toBeGreaterThan(3);
      }
    }
  });

  it('wächst mit den Welten, statt enger zu werden', () => {
    expect(layoutHub(12).extent).toBeGreaterThan(layoutHub(2).extent);
    expect(layoutHub(2).extent).toBeGreaterThan(HALL_RADIUS);
  });

  it('legt bei gleicher Zahl immer dasselbe hin', () => {
    expect(layoutHub(7)).toEqual(layoutHub(7));
  });
});
