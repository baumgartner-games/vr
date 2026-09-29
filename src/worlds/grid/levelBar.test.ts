import { levelName, stepLevel } from './levelBar';

/** **Die Ebenen des Baukastens** (`levelBar.ts`): hoch, runter, und wie sie heißen. */
describe('Ebenen-Leiste', () => {
  it('geht eine Etage hoch und runter', () => {
    expect(stepLevel(0, 1, 3)).toBe(1);
    expect(stepLevel(2, -1, 3)).toBe(1);
  });

  it('bleibt oben und unten am Rand stehen', () => {
    expect(stepLevel(2, 1, 3)).toBe(2);
    expect(stepLevel(0, -1, 3)).toBe(0);
  });

  it('nennt die unterste Erdgeschoss', () => {
    expect(levelName(0)).toBe('Ebene 0 · Erdgeschoss');
    expect(levelName(2)).toBe('Ebene 2');
  });
});
