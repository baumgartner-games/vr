/** @jest-environment jsdom */
import type { WorldDefinition } from '../core/types';
import { WorldWelcome, welcomedWorlds } from './WorldWelcome';

/**
 * **Die Willkommens-Karte ist eine Meldung wie alle** (`ui/ScreenMessage.ts`):
 * dasselbe ✕, und das ✕ heißt _Verstanden_ — die Welt ist danach begrüßt und
 * kommt nicht wieder.
 */
const plateup = { id: 'plateup', title: 'Restaurant', accent: 0xf2a33a } as WorldDefinition;

beforeEach(() => {
  localStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  document.body.replaceChildren();
});

describe('WorldWelcome', () => {
  it('steht mit Name, Text und ✕ da; das ✕ nimmt sie weg und merkt die Welt', () => {
    const welcome = new WorldWelcome();
    welcome.update(plateup, true, () => [{ key: 'E', label: 'Benutzen' }]);
    expect(welcome.open).toBe(true);
    const card = welcome.element;
    expect(card.classList.contains('msg')).toBe(true);
    expect(card.classList.contains('welcome')).toBe(true);
    expect(card.querySelector('.msg__title')?.textContent).toBe('Restaurant');
    expect(card.querySelector('.msg__kicker')?.textContent).toBe('Willkommen');
    expect(welcomedWorlds().has('plateup')).toBe(true);

    const close = card.querySelector<HTMLButtonElement>('.msg__close')!;
    expect(close.getAttribute('aria-label')).toBe('Schließen');
    close.click();
    expect(welcome.open).toBe(false);

    // Begrüßt ist begrüßt: Sie kommt nicht wieder.
    welcome.update(plateup, true, () => []);
    expect(welcome.open).toBe(false);
    welcome.dispose();
  });

  it('Esc heißt ebenfalls Verstanden', () => {
    const welcome = new WorldWelcome();
    welcome.update(plateup, true, () => []);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    expect(welcome.open).toBe(false);
    welcome.dispose();
  });

  it('geht von selbst nach ein paar Sekunden', () => {
    const welcome = new WorldWelcome();
    welcome.update(plateup, true, () => []);
    jest.advanceTimersByTime(10_000);
    expect(welcome.open).toBe(false);
    welcome.dispose();
  });
});
