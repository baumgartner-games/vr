import { WORLDS } from '../worlds';
import { bindKey, bindPad, defaultInputConfig } from './inputMap';
import {
  formatSeen,
  introKeys,
  parseSeen,
  shouldShowIntro,
  worldIntro,
  type IntroGate,
} from './worldIntro';

const config = defaultInputConfig();

describe('worldIntro — die Willkommens-Karte je Welt', () => {
  it('hat für jede Welt der Registry eine Karte', () => {
    for (const world of WORLDS) expect(worldIntro(world.id)).not.toBeNull();
  });

  it('nennt im Burgerladen die Glocke', () => {
    expect(worldIntro('plateup')!.first).toMatch(/Glocke/);
  });

  it('liest dieselbe Belegung wie die Tastenhilfe', () => {
    const tips = worldIntro('plateup')!.tips;
    const keys = introKeys(tips, { device: 'keyboard', padKind: 'xbox', config });
    expect(keys.map((one) => one.key)).toEqual(['WASD', 'E', 'M']);
    const moved = bindKey(config, 'use', 'KeyF');
    expect(introKeys(tips, { device: 'keyboard', padKind: 'xbox', config: moved })[1]!.key).toBe(
      'F',
    );
  });

  it('schreibt am Pad die Aufschrift der Marke', () => {
    const tips = worldIntro('plateup')!.tips;
    const xbox = introKeys(tips, { device: 'pad', padKind: 'xbox', config });
    expect(xbox.map((one) => one.key)).toEqual(['LS', 'A', '☰']);
    const ps = introKeys(tips, { device: 'pad', padKind: 'playstation', config });
    expect(ps[1]!.key).toBe('✕');
    const swapped = bindPad(config, 'use', 'face-left');
    expect(introKeys(tips, { device: 'pad', padKind: 'xbox', config: swapped })[1]!.key).toBe('X');
  });

  it('nennt am Glas die Knöpfe, die dort stehen, und lässt den Rest weg', () => {
    const keys = introKeys(worldIntro('sandbox')!.tips, {
      device: 'touch',
      padKind: 'xbox',
      config,
    });
    expect(keys.map((one) => one.key)).toEqual(['Stock links', 'A', '☰']);
  });

  it('merkt sich begrüßte Welten als Zeile und verwirft Unsinn', () => {
    expect([...parseSeen('plateup, hub,,<x>,hub')]).toEqual(['plateup', 'hub']);
    expect(parseSeen(null).size).toBe(0);
    expect(formatSeen(new Set(['test', 'hub']))).toBe('hub,test');
  });

  it('kommt nur, wenn man die Welt sieht, sie an ist und noch nicht begrüßt hat', () => {
    const gate: IntroGate = { world: 'plateup', visible: true, enabled: true, seen: new Set() };
    expect(shouldShowIntro(gate)).toBe(true);
    expect(shouldShowIntro({ ...gate, visible: false })).toBe(false);
    expect(shouldShowIntro({ ...gate, enabled: false })).toBe(false);
    expect(shouldShowIntro({ ...gate, seen: new Set(['plateup']) })).toBe(false);
    expect(shouldShowIntro({ ...gate, world: 'unbekannt' })).toBe(false);
    expect(shouldShowIntro({ ...gate, world: '' })).toBe(false);
  });
});
