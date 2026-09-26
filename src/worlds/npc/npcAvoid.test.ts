import { AVOID_RADIUS, separation, sidestep } from './npcAvoid';

describe('Ausweichen', () => {
  const north = { x: 0, z: -1 };

  it('weicht rechts aus, wenn jemand vorne im Weg steht', () => {
    const step = sidestep({ x: 0, z: 0, heading: north }, [{ x: 0, z: -0.8, heading: null }]);
    expect(step).not.toBeNull();
    // Nach Norden gehend ist rechts Osten (+x) — und es geht trotzdem voran.
    expect(step!.x).toBeGreaterThan(0.5);
    expect(step!.z).toBeLessThan(0);
  });

  it('kümmert sich nicht um den hinter oder neben sich, und nicht um den weit weg', () => {
    const self = { x: 0, z: 0, heading: north };
    expect(sidestep(self, [{ x: 0, z: 0.6, heading: null }])).toBeNull();
    expect(sidestep(self, [{ x: 0.7, z: 0, heading: null }])).toBeNull();
    expect(sidestep(self, [{ x: 0, z: -(AVOID_RADIUS + 0.2), heading: null }])).toBeNull();
  });

  it('geht dem Vordermann nach, statt ihn zu überholen', () => {
    expect(
      sidestep({ x: 0, z: 0, heading: north }, [{ x: 0, z: -0.8, heading: north }]),
    ).toBeNull();
  });

  it('lässt den Stehenden stehen — er hat Vorrang', () => {
    expect(sidestep({ x: 0, z: 0, heading: null }, [{ x: 0, z: -0.5, heading: north }])).toBeNull();
  });

  it('zwei, die sich begegnen, weichen zu verschiedenen Seiten der Welt aus', () => {
    const a = { x: 0, z: 0, heading: north };
    const b = { x: 0, z: -1, heading: { x: 0, z: 1 } };
    const stepA = sidestep(a, [b])!;
    const stepB = sidestep(b, [a])!;
    // Jeder nach seiner rechten Seite — in der Welt also auseinander.
    expect(Math.sign(stepA.x)).toBe(-Math.sign(stepB.x));
  });

  it('schiebt Stehende auseinander, stärker je näher', () => {
    const far = separation({ x: 0, z: 0 }, [{ x: 0.6, z: 0 }]);
    const near = separation({ x: 0, z: 0 }, [{ x: 0.2, z: 0 }]);
    expect(far.x).toBeLessThan(0);
    expect(near.x).toBeLessThan(far.x);
    expect(separation({ x: 0, z: 0 }, [{ x: 2, z: 0 }])).toEqual({ x: 0, z: 0 });
  });
});
