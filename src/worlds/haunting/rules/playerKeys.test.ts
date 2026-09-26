import { playerKeysText, type PlayerKeysInput } from './playerKeys';

const base: PlayerKeysInput = {
  device: 'keyboard',
  hintsShown: false,
  useKey: 'E',
  toolsKey: 'Tab',
  moveKeys: 'WASD',
  lightOn: false,
  left: 'Hand frei',
  right: 'Lampe',
};

describe('playerKeysText', () => {
  it('nennt mit Tastatur ohne Tastenhilfe die Tasten', () => {
    expect(playerKeysText(base)).toBe(
      'WASD · Strg ducken · E ins Leere: Licht an · Werkzeug: Tab · links: Hand frei · rechts: Lampe',
    );
  });

  it('lässt die Tasten weg, wenn die Tastenhilfe sie schon zeigt', () => {
    const text = playerKeysText({ ...base, hintsShown: true, lightOn: true });
    expect(text).toBe('E ins Leere: Licht aus · links: Hand frei · rechts: Lampe');
    expect(text).not.toContain('WASD');
  });

  it('nennt am Glas und am Pad weder Tab noch Strg', () => {
    for (const device of ['touch', 'pad'] as const) {
      const text = playerKeysText({ ...base, device, useKey: device === 'pad' ? 'Ⓐ' : 'A' });
      expect(text).not.toMatch(/Tab|Strg|WASD|\bE\b/);
      expect(text).toContain('rechts: Lampe');
    }
  });
});
