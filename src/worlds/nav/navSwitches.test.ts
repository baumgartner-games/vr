import {
  NAV_SWITCHES,
  NAV_SWITCH_IDS,
  allOn,
  allSwitchesOn,
  switchSpec,
  switchSummary,
  toggleSwitch,
} from './navSwitches';

describe('Die Schalter der Navigation', () => {
  it('fängt in jeder Welt vollständig an', () => {
    // Die wichtigste Zeile hier: Ein Schalter, der irgendwo aus anfängt, lässt
    // einen den Fehler in der Wegsuche suchen, der in einer Einstellung steckt.
    expect(allSwitchesOn(allOn())).toBe(true);
    expect(switchSummary(allOn())).toBe('Vollständig');
  });

  it('zählt auf, was gerade nicht gilt', () => {
    const state = allOn();
    expect(toggleSwitch(state, 'obstacles')).toBe(false);
    expect(allSwitchesOn(state)).toBe(false);
    expect(switchSummary(state)).toBe('Aus: Hindernisse');
    expect(toggleSwitch(state, 'obstacles')).toBe(true);
    expect(switchSummary(state)).toBe('Vollständig');
  });

  it('hat für jeden Schalter eine Beschriftung und eine eigene Farbe', () => {
    expect(NAV_SWITCH_IDS.length).toBe(NAV_SWITCHES.length);
    const colors = new Set(NAV_SWITCHES.map((one) => one.color));
    expect(colors.size).toBe(NAV_SWITCHES.length);
    for (const one of NAV_SWITCHES) {
      expect(one.label.length).toBeGreaterThan(0);
      expect(one.sub.length).toBeGreaterThan(0);
    }
  });

  it('gibt auf eine unbekannte Id den ersten Schalter zurück statt undefined', () => {
    expect(switchSpec('gibtsnicht')).toBe(NAV_SWITCHES[0]);
    expect(switchSpec(undefined)).toBe(NAV_SWITCHES[0]);
  });
});
