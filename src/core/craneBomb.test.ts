import { bombAllowed } from './craneBomb';

describe('craneBomb', () => {
  it('gibt die Bombe nur im Baukasten, nur dem Kran und nur mit leeren Klauen', () => {
    expect(bombAllowed('creative', true, false)).toBe(true);
    expect(bombAllowed('arrange', true, false)).toBe(false);
    expect(bombAllowed('play', true, false)).toBe(false);
    expect(bombAllowed('creative', false, false)).toBe(false);
    expect(bombAllowed('creative', true, true)).toBe(false);
  });
});
