import {
  LANDING,
  LAUNCH_HEIGHT,
  LAUNCH_SITE,
  SUMMIT,
  SUMMIT_HEIGHT,
  TERRAIN_SIZE,
  alpsHeight,
  alpsSlope,
  sampleAlps,
  samplePosition,
} from './alpsTerrain';

describe('alpsHeight', () => {
  it('ist überall eine endliche Höhe über null', () => {
    for (let x = -500; x <= 500; x += 25) {
      for (let z = -500; z <= 500; z += 25) {
        const h = alpsHeight(x, z);
        expect(Number.isFinite(h)).toBe(true);
        expect(h).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('hat seinen höchsten Punkt am Gipfel, und der ist wirklich der höchste', () => {
    let best = { x: 0, z: 0, h: -1 };
    for (let x = -500; x <= 500; x += 10) {
      for (let z = -500; z <= 500; z += 10) {
        const h = alpsHeight(x, z);
        if (h > best.h) best = { x, z, h };
      }
    }
    expect(Math.hypot(best.x - SUMMIT.x, best.z - SUMMIT.z)).toBeLessThan(15);
    expect(best.h).toBeLessThanOrEqual(SUMMIT_HEIGHT + 0.01);
    expect(SUMMIT_HEIGHT).toBeGreaterThan(200);
    expect(alpsHeight(SUMMIT.x, SUMMIT.z)).toBeCloseTo(SUMMIT_HEIGHT, 6);
  });

  it('läuft am Rand auf null aus', () => {
    for (let t = -500; t <= 500; t += 50) {
      expect(alpsHeight(t, -500)).toBeCloseTo(0, 6);
      expect(alpsHeight(t, 500)).toBeCloseTo(0, 6);
      expect(alpsHeight(-500, t)).toBeCloseTo(0, 6);
      expect(alpsHeight(500, t)).toBeCloseTo(0, 6);
    }
  });

  it('ist kurz vor dem Rand schon niedrig', () => {
    for (const [x, z] of [
      [-500, -500],
      [500, -500],
      [-500, 500],
      [500, 500],
      [0, 500],
      [500, 0],
    ] as const) {
      expect(alpsHeight(x, z)).toBeLessThan(45);
    }
  });

  it('hat eine ebene Landewiese', () => {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.5) {
      for (const r of [0, 20, 40]) {
        const h = alpsHeight(LANDING.x + Math.cos(angle) * r, LANDING.z + Math.sin(angle) * r);
        expect(Math.abs(h - LANDING.height)).toBeLessThan(0.5);
      }
    }
    expect(alpsSlope(LANDING.x + 10, LANDING.z - 10)).toBeLessThan(0.02);
  });

  it('hat einen ebenen Startplatz hoch am Berg', () => {
    expect(LAUNCH_HEIGHT).toBeGreaterThan(150);
    for (const [dx, dz] of [
      [0, 0],
      [8, 0],
      [-8, 0],
      [0, 8],
      [0, -8],
    ] as const) {
      const h = alpsHeight(LAUNCH_SITE.x + dx, LAUNCH_SITE.z + dz);
      expect(Math.abs(h - LAUNCH_HEIGHT)).toBeLessThan(0.3);
    }
    // Und südlich davon geht es bergab — dorthin fliegt man.
    expect(alpsHeight(LAUNCH_SITE.x, LAUNCH_SITE.z + 80)).toBeLessThan(LAUNCH_HEIGHT - 30);
  });

  it('kommt vom Startplatz aus zu Fuß auf den Berg — bergwärts ist der Rand keine Wand', () => {
    // Vom Plateau zum Gipfel, Schritt für Schritt: nirgends steiler, als man
    // hinaufkommt (`MAX_SLOPE_DEG`, 52°) — die Flanke selbst hat gut 48°, und
    // die bleibt, wie sie ist. Mit dem alten schmalen Rand stand am Plateau
    // eine Stufe von über 60°, und der letzte Anstieg zum Kreuz lag bei 52°.
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = LAUNCH_SITE.x + (SUMMIT.x - LAUNCH_SITE.x) * t;
      const z = LAUNCH_SITE.z + (SUMMIT.z - LAUNCH_SITE.z) * t;
      const degrees = (Math.atan(alpsSlope(x, z, 1)) * 180) / Math.PI;
      expect(degrees).toBeLessThan(51);
    }
    // Zum Tal hin bleibt die Kante eine Kante: kurz hinter dem Rand fällt es ab.
    expect(alpsHeight(LAUNCH_SITE.x, LAUNCH_SITE.z + 18)).toBeLessThan(LAUNCH_HEIGHT - 4);
  });

  it('ist bei jedem Aufruf dasselbe Gelände', () => {
    expect(alpsHeight(123.4, -56.7)).toBe(alpsHeight(123.4, -56.7));
    expect(alpsHeight(-320, 210)).toBe(alpsHeight(-320, 210));
  });
});

describe('sampleAlps', () => {
  it('legt die Werte so ab, wie Rapier sie liest', () => {
    const samples = sampleAlps(8, TERRAIN_SIZE);
    expect(samples.heights.length).toBe(81);
    const n = samples.cells + 1;
    for (const [i, j] of [
      [0, 0],
      [3, 5],
      [8, 8],
      [2, 7],
    ] as const) {
      const { x, z } = samplePosition(samples, i, j);
      expect(samples.heights[i + j * n]).toBeCloseTo(alpsHeight(x, z), 3);
    }
    // Zeile null liegt am Rand mit dem kleinsten Z, Spalte null am kleinsten X.
    expect(samplePosition(samples, 0, 0)).toEqual({ x: -500, z: -500 });
    expect(samplePosition(samples, 8, 0)).toEqual({ x: -500, z: 500 });
    expect(samplePosition(samples, 0, 8)).toEqual({ x: 500, z: -500 });
  });
});
