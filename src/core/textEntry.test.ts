/** @jest-environment jsdom */
import { beginTextEntry, endTextEntry, isTyping, takesText } from './textEntry';

describe('Wird gerade getippt?', () => {
  afterEach(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.body.replaceChildren();
  });

  it('ja, solange ein Suchfeld den Fokus hat — sonst nicht', () => {
    const search = document.createElement('input');
    search.type = 'search';
    document.body.append(search);
    expect(isTyping()).toBe(false);
    search.focus();
    // Das `m` in „lamp" ist dann ein Buchstabe und nicht die Taste des Menüs.
    expect(isTyping()).toBe(true);
    search.blur();
    expect(isTyping()).toBe(false);
  });

  it('nicht bei Häkchen, Reglern und Knöpfen', () => {
    for (const type of ['checkbox', 'range', 'button']) {
      const input = document.createElement('input');
      input.type = type;
      expect(takesText(input)).toBe(false);
    }
    const plain = document.createElement('input');
    expect(takesText(plain)).toBe(true);
    expect(takesText(document.createElement('textarea'))).toBe(true);
    expect(takesText(document.createElement('button'))).toBe(false);
  });

  it('ja, solange das Tastenfeld der Brille angemeldet ist', () => {
    beginTextEntry();
    expect(isTyping()).toBe(true);
    endTextEntry();
    expect(isTyping()).toBe(false);
  });
});
