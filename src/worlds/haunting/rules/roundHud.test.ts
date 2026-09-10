import type { MapRound } from '../map/mapSnapshot';
import {
  cabinsText,
  endingText,
  HUD_COLOR,
  HUD_COLOR_LOW,
  LOW_OXYGEN_SECONDS,
  lowOxygen,
  roundHud,
  suitPips,
} from './roundHud';

function round(over: Partial<MapRound> = {}): MapRound {
  return {
    phase: 'running',
    oxygen: 600,
    limit: 600,
    suit: 3,
    suitMax: 3,
    cabinsDestroyed: [],
    ending: '',
    ...over,
  };
}

describe('Die Anzeige der laufenden Runde', () => {
  it('zeigt den Sauerstoff als Uhr und den Anzug als Punkte', () => {
    const hud = roundHud(round({ oxygen: 581, suit: 2 }));
    expect(hud.oxygen).toBe('O₂ 9:41');
    expect(hud.suit).toBe('●●○');
    expect(hud.cabins).toBe(0);
    expect(hud.low).toBe(false);
    expect(hud.color).toBe(HUD_COLOR);
    expect(hud.label).toBe('Sauerstoff 9 Minuten 41 Sekunden; Anzug 2 von 3');
  });

  it('warnt unter einer Minute — und genau ab dort', () => {
    expect(lowOxygen(LOW_OXYGEN_SECONDS)).toBe(false);
    expect(lowOxygen(LOW_OXYGEN_SECONDS - 0.01)).toBe(true);
    const hud = roundHud(round({ oxygen: 42.4 }));
    expect(hud.low).toBe(true);
    expect(hud.color).toBe(HUD_COLOR_LOW);
    expect(hud.oxygen).toBe('O₂ 0:43');
    expect(hud.label).toContain('knapp');
  });

  it('nennt zerstörte Kabinen nur, wenn es welche gibt', () => {
    expect(roundHud(round()).label).not.toContain('Kabine');
    const one = roundHud(round({ cabinsDestroyed: ['r3'] }));
    expect(one.cabins).toBe(1);
    expect(one.label).toContain('1 Kabine zerstört');
    expect(cabinsText(3)).toBe('3 Kabinen zerstört');
  });

  it('hält den Anzug in seinen Grenzen', () => {
    expect(suitPips({ suit: 5, suitMax: 3 })).toBe('●●●');
    expect(suitPips({ suit: -1, suitMax: 3 })).toBe('○○○');
    expect(suitPips({ suit: 0, suitMax: 3 })).toBe('○○○');
  });

  it('sagt an der Endkarte, woran es lag', () => {
    expect(endingText('oxygen')).toContain('Sauerstoff');
    expect(endingText('suit')).toContain('Anzug');
    expect(endingText('escaped')).toContain('Einsatzzentrale');
    expect(endingText('')).toBe('');
  });
});
