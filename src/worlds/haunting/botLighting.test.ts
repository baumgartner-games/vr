import {
  BEACON_TURNS,
  DEFAULT_LIGHTING,
  LIGHTING_PRESETS,
  alarmPulse,
  beaconAngle,
  clampLighting,
  lightingPreset,
  nextLighting,
} from './botLighting';

describe('Die Beleuchtung der Bot-Runde', () => {
  it('hält jede Stellung in ihren Grenzen', () => {
    expect(clampLighting(null)).toEqual(DEFAULT_LIGHTING);
    expect(clampLighting({ ambient: 5 }).ambient).toBe(1);
    expect(clampLighting({ ambient: -2 }).ambient).toBe(0);
    expect(clampLighting({ ambient: NaN }).ambient).toBe(DEFAULT_LIGHTING.ambient);
    expect(clampLighting({ lamps: false, alarm: true }).alarm).toBe(true);
    expect(clampLighting({ lamps: false }).lamps).toBe(false);
  });

  it('erkennt jede angebotene Stellung an ihren Werten wieder', () => {
    for (const preset of LIGHTING_PRESETS)
      expect(lightingPreset(preset.lighting).id).toBe(preset.id);
    expect(lightingPreset({ ...DEFAULT_LIGHTING, ambient: 0.33 }).id).toBe('custom');
  });

  it('geht die Stellungen im Kreis durch', () => {
    let lighting = LIGHTING_PRESETS[0]!.lighting;
    const seen: string[] = [];
    for (let i = 0; i < LIGHTING_PRESETS.length; i++) {
      lighting = nextLighting(lighting);
      seen.push(lightingPreset(lighting).id);
    }
    expect(seen).toEqual([...LIGHTING_PRESETS.slice(1), LIGHTING_PRESETS[0]!].map((p) => p.id));
    // Auch aus einer eigenen Einstellung heraus landet man wieder auf einer
    // benannten Stellung und nicht im Nichts.
    expect(lightingPreset(nextLighting({ ...DEFAULT_LIGHTING, ambient: 0.31 })).id).not.toBe(
      'custom',
    );
  });

  /**
   * Ein Winkel, der immer weiterwächst, verliert nach einer Stunde die
   * Nachkommastellen, in denen die Drehung steckt — dann steht der Spiegel.
   */
  it('lässt den Drehspiegel im Kreis laufen statt weiterzuwachsen', () => {
    for (const time of [0, 3, 60, 3600, 86400]) {
      const angle = beaconAngle(time);
      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThan(Math.PI * 2 + 1e-9);
    }
    expect(beaconAngle(1 / BEACON_TURNS)).toBeCloseTo(0, 6);
    expect(beaconAngle(0.5 / BEACON_TURNS)).toBeCloseTo(Math.PI, 6);
    // Zwei Leuchten mit unterschiedlichem Versatz stehen nie gleich.
    expect(beaconAngle(2, 0.25)).not.toBeCloseTo(beaconAngle(2, 0), 3);
    expect(beaconAngle(-1)).toBeGreaterThanOrEqual(0);
  });

  it('lässt die Warnleuchte weich aufglühen statt zu blitzen', () => {
    const samples = Array.from({ length: 64 }, (_, i) => alarmPulse(i / 32));
    expect(Math.min(...samples)).toBe(0);
    expect(Math.max(...samples)).toBeGreaterThan(0.9);
    for (const value of samples) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    // Weich heißt: zwischen zwei nahen Zeitpunkten liegt kein Sprung.
    for (let i = 1; i < samples.length; i++)
      expect(Math.abs(samples[i]! - samples[i - 1]!)).toBeLessThan(0.4);
  });
});
