import { cloudFade, seedCloud, stepCloud } from './effectBurst';
import { findEffect, scaleEffect } from './effectKinds';

/** Ein Zufall, der keiner ist: dieselbe Wolke bei jedem Lauf. */
function fixedRandom(): () => number {
  let seed = 1;
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const ORIGIN = { x: 0, y: 1, z: 0 };

describe('Eine frische Wolke', () => {
  it('sät genau so viele Partikel, wie der Effekt sagt', () => {
    const kind = scaleEffect(findEffect('smoke'), 1);
    const cloud = seedCloud(kind, ORIGIN, fixedRandom());
    expect(cloud.count).toBe(kind.count);
    expect(cloud.positions).toHaveLength(kind.count * 3);
    expect(cloud.velocities).toHaveLength(kind.count * 3);
    expect(cloud.colors).toHaveLength(kind.count * 3);
    expect(cloud.age).toBe(0);
    expect(cloud.life).toBe(kind.life);
  });

  it('setzt sie an den Ursprung — höchstens ein halbes Partikel daneben', () => {
    const kind = findEffect('fire');
    const cloud = seedCloud(kind, ORIGIN, fixedRandom());
    for (let i = 0; i < cloud.count; i++) {
      const dx = cloud.positions[i * 3]! - ORIGIN.x;
      const dy = cloud.positions[i * 3 + 1]! - ORIGIN.y;
      const dz = cloud.positions[i * 3 + 2]! - ORIGIN.z;
      expect(Math.hypot(dx, dy, dz)).toBeLessThanOrEqual(kind.size * 0.5 + 1e-6);
    }
  });

  it('bleibt unter dem Tempo des Effekts und hat nicht überall dasselbe', () => {
    const kind = findEffect('sparks');
    const cloud = seedCloud(kind, ORIGIN, fixedRandom());
    const speeds: number[] = [];
    for (let i = 0; i < cloud.count; i++) {
      const speed = Math.hypot(
        cloud.velocities[i * 3]!,
        cloud.velocities[i * 3 + 1]!,
        cloud.velocities[i * 3 + 2]!,
      );
      expect(speed).toBeLessThanOrEqual(kind.speed + 1e-4);
      speeds.push(speed);
    }
    expect(Math.max(...speeds) - Math.min(...speeds)).toBeGreaterThan(0.5);
  });

  it('macht aus `spread = 0` eine Säule und aus `spread = 1` eine Kugel', () => {
    const column = seedCloud({ ...findEffect('fire'), spread: 0 }, ORIGIN, fixedRandom());
    for (let i = 0; i < column.count; i++) {
      expect(Math.abs(column.velocities[i * 3]!)).toBeLessThan(1e-5);
      expect(column.velocities[i * 3 + 1]!).toBeGreaterThan(0);
    }
    const ball = seedCloud({ ...findEffect('blast'), spread: 1 }, ORIGIN, fixedRandom());
    let down = 0;
    for (let i = 0; i < ball.count; i++) if (ball.velocities[i * 3 + 1]! < 0) down++;
    expect(down).toBeGreaterThan(ball.count * 0.2);
  });
});

describe('Ein Bild weiter', () => {
  it('lässt Rauch steigen und Funken fallen', () => {
    const smoke = findEffect('smoke');
    const up = seedCloud({ ...smoke, speed: 0, spread: 0 }, ORIGIN, fixedRandom());
    for (let i = 0; i < 30; i++) stepCloud(up, smoke, 1 / 60);
    expect(up.positions[1]!).toBeGreaterThan(ORIGIN.y);

    const sparks = findEffect('sparks');
    const down = seedCloud({ ...sparks, speed: 0, spread: 0 }, ORIGIN, fixedRandom());
    for (let i = 0; i < 30; i++) stepCloud(down, sparks, 1 / 60);
    expect(down.positions[1]!).toBeLessThan(ORIGIN.y);
  });

  it('lässt nichts durch den Boden fallen', () => {
    const kind = findEffect('water');
    const cloud = seedCloud(kind, { x: 0, y: 0.4, z: 0 }, fixedRandom());
    for (let i = 0; i < 240; i++) stepCloud(cloud, kind, 1 / 60);
    for (let i = 0; i < cloud.count; i++)
      expect(cloud.positions[i * 3 + 1]!).toBeGreaterThanOrEqual(0);
  });

  it('ist zu Ende, wenn die Lebenszeit um ist', () => {
    const kind = findEffect('fire');
    const cloud = seedCloud(kind, ORIGIN, fixedRandom());
    let alive = true;
    for (let i = 0; i < 1000 && alive; i++) alive = stepCloud(cloud, kind, 1 / 60);
    expect(alive).toBe(false);
    expect(cloud.age).toBeGreaterThanOrEqual(kind.life);
  });
});

describe('Das Ein- und Ausblenden', () => {
  it('kommt schnell und geht langsam', () => {
    const cloud = seedCloud(findEffect('smoke'), ORIGIN, fixedRandom());
    expect(cloudFade(cloud)).toBe(0);
    cloud.age = cloud.life * 0.1;
    expect(cloudFade(cloud)).toBeCloseTo(1, 6);
    cloud.age = cloud.life * 0.55;
    expect(cloudFade(cloud)).toBeGreaterThan(0.4);
    cloud.age = cloud.life;
    expect(cloudFade(cloud)).toBeCloseTo(0, 6);
  });
});
