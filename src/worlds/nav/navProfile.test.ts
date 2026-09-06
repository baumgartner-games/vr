import {
  HAZARD_FIRE,
  HAZARD_NONE,
  HAZARD_NAMES,
  HAZARD_COUNT,
  HAZARD_SPIKES,
  HAZARD_WATER,
  HUMAN_PROFILE,
  LINK_KINDS,
  VEHICLE_PROFILE,
  ZOMBIE_PROFILE,
  canUseLink,
  hazardCost,
  profileOf,
} from './navProfile';

describe('Die Gefahren', () => {
  it('haben zu jeder einen Namen', () => {
    expect(HAZARD_NAMES).toHaveLength(HAZARD_COUNT);
  });

  it('kosten nichts, wo keine ist', () => {
    for (const profile of [HUMAN_PROFILE, ZOMBIE_PROFILE, VEHICLE_PROFILE]) {
      expect(hazardCost(profile, HAZARD_NONE)).toBe(0);
    }
  });

  it('addieren sich, wenn mehrere auf einer Kachel liegen', () => {
    const wet = hazardCost(ZOMBIE_PROFILE, HAZARD_WATER);
    expect(hazardCost(ZOMBIE_PROFILE, HAZARD_WATER | HAZARD_SPIKES)).toBe(wet);
    expect(hazardCost(HUMAN_PROFILE, HAZARD_WATER)).toBe(8);
  });

  it('machen aus einem „niemals" auch dann ein „niemals", wenn Gutes danebenliegt', () => {
    expect(hazardCost(HUMAN_PROFILE, HAZARD_WATER | HAZARD_FIRE)).toBe(Infinity);
  });

  it('trennen den, der die Grube sieht, von dem, der sie nicht sieht', () => {
    // Die eine Zeile Tabelle, an der das ganze Verhalten hängt.
    expect(hazardCost(HUMAN_PROFILE, HAZARD_SPIKES)).toBe(Infinity);
    expect(hazardCost(ZOMBIE_PROFILE, HAZARD_SPIKES)).toBe(0);
  });
});

describe('Die Profile', () => {
  it('sagen, welche Verbindung wer nehmen kann', () => {
    expect(canUseLink(HUMAN_PROFILE, 'ladder')).toBe(true);
    expect(canUseLink(ZOMBIE_PROFILE, 'ladder')).toBe(false);
    expect(canUseLink(VEHICLE_PROFILE, 'stairs')).toBe(false);
    expect(canUseLink(VEHICLE_PROFILE, 'portal')).toBe(true);
  });

  it('haben zu jeder Verbindungsart eine Zahl — auch zu einer neuen', () => {
    for (const profile of [HUMAN_PROFILE, ZOMBIE_PROFILE, VEHICLE_PROFILE]) {
      for (const kind of LINK_KINDS) {
        expect(typeof profile.link[kind]).toBe('number');
      }
      expect(profile.hazard).toHaveLength(HAZARD_COUNT);
    }
  });

  it('fallen auf den Menschen zurück, wenn die Id Unsinn ist', () => {
    expect(profileOf('gibt-es-nicht')).toBe(HUMAN_PROFILE);
    expect(profileOf(undefined)).toBe(HUMAN_PROFILE);
    expect(profileOf('zombie')).toBe(ZOMBIE_PROFILE);
  });
});
