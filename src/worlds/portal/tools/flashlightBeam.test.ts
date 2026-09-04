import {
  BEAM_DEGREES_PER_METRE,
  DEFAULT_BEAM_ANGLE,
  MAX_BEAM_ANGLE,
  MIN_BEAM_ANGLE,
  beamAngleFromDrag,
  beamIntensity,
  beamLabel,
  beamRange,
  clampBeamAngle,
} from './flashlightBeam';

describe('Lichtkegel der Taschenlampe', () => {
  it('hält den Winkel in seinen Grenzen', () => {
    expect(clampBeamAngle(0)).toBe(MIN_BEAM_ANGLE);
    expect(clampBeamAngle(180)).toBe(MAX_BEAM_ANGLE);
    expect(clampBeamAngle(Number.NaN)).toBe(DEFAULT_BEAM_ANGLE);
  });

  it('öffnet den Kegel nach rechts und schließt ihn nach links', () => {
    const drag = 0.05;
    expect(beamAngleFromDrag(20, drag)).toBeCloseTo(20 + drag * BEAM_DEGREES_PER_METRE);
    expect(beamAngleFromDrag(20, -drag)).toBeCloseTo(20 - drag * BEAM_DEGREES_PER_METRE);
  });

  it('läuft an den Enden nicht davon', () => {
    // Eine ganze Armlänge nach links macht keinen negativen Kegel.
    expect(beamAngleFromDrag(20, -0.8)).toBe(MIN_BEAM_ANGLE);
    expect(beamAngleFromDrag(20, 0.8)).toBe(MAX_BEAM_ANGLE);
  });

  it('macht den schmalen Kegel heller und weitreichender als den breiten', () => {
    expect(beamIntensity(MIN_BEAM_ANGLE)).toBeGreaterThan(beamIntensity(DEFAULT_BEAM_ANGLE));
    expect(beamIntensity(DEFAULT_BEAM_ANGLE)).toBeGreaterThan(beamIntensity(MAX_BEAM_ANGLE));
    expect(beamRange(MIN_BEAM_ANGLE)).toBeGreaterThan(beamRange(MAX_BEAM_ANGLE));
  });

  it('bleibt auch am schmalsten Ende eine Taschenlampe', () => {
    // Ohne Deckel wäre der 6°-Kegel dreizehnmal so hell wie der normale.
    expect(beamIntensity(MIN_BEAM_ANGLE) / beamIntensity(DEFAULT_BEAM_ANGLE)).toBeLessThanOrEqual(
      3,
    );
    expect(beamRange(MIN_BEAM_ANGLE)).toBeLessThan(40);
  });

  it('schreibt die volle Kegelbreite hin, nicht den halben Winkel', () => {
    expect(beamLabel(22)).toBe('44° breit');
  });
});
