/** @jest-environment jsdom */
import {
  head,
  key,
  leaveKeys,
  note,
  renderOptions,
  soundKeys,
  switchViewKey,
  watchKey,
} from './optionsMenu';

/**
 * **Ein Optionsmenü für beide Welten** (`map/optionsMenu.ts`): Aus einer
 * Liste wird DOM aus den Bausteinen von `ui/widgets.ts`, die `data-*`-Schlüssel
 * bleiben erhalten, und was in beiden Welten vorkommt, heißt gleich.
 */
describe('Das geteilte Optionsmenü', () => {
  it('zeichnet Überschrift, Hinweis und Knöpfe mit ihren Schlüsseln', () => {
    const root = document.createElement('div');
    renderOptions(root, [
      head('Ansicht'),
      note('nur sehen'),
      key({ switchView: '2d' }, 'Wechseln', 'mitten in der Runde', { active: true }),
      key({ closeOptions: '' }, 'Weiterspielen'),
      key({ leave: '' }, 'Runde verlassen', 'zurück', { leave: true, pressed: false }),
    ]);
    expect(root.querySelector('.ui-head')?.textContent).toBe('Ansicht');
    expect(root.querySelector('.flat__note')?.textContent).toBe('nur sehen');
    const swap = root.querySelector<HTMLButtonElement>('[data-switch-view="2d"]')!;
    expect(swap.classList.contains('ui-option')).toBe(true);
    expect(swap.classList.contains('is-active')).toBe(true);
    expect(swap.querySelector('strong')?.textContent).toBe('Wechseln');
    expect(swap.querySelector('small')?.textContent).toBe('mitten in der Runde');
    expect(root.querySelector<HTMLButtonElement>('[data-close-options]')?.textContent).toBe(
      'Weiterspielen',
    );
    const leave = root.querySelector<HTMLButtonElement>('[data-leave]')!;
    expect(leave.classList.contains('ui-option--leave')).toBe(true);
    expect(leave.getAttribute('aria-pressed')).toBe('false');
    // Neu zeichnen ersetzt, statt anzuhängen.
    renderOptions(root, [head('Ton')]);
    expect(root.children).toHaveLength(1);
  });

  it('nennt die geteilten Einträge in beiden Welten gleich', () => {
    const on = watchKey(true),
      off = watchKey(false);
    expect(on.kind === 'key' && on.label).toBe('Zuschauen: an');
    expect(on.kind === 'key' && on.pressed).toBe(true);
    expect(off.kind === 'key' && off.label).toBe('Zuschauen: aus');
    const swap = switchViewKey('2d', '2D von oben');
    expect(swap.kind === 'key' && swap.label).toContain('2D ↔ 3D');
    expect(swap.kind === 'key' && swap.data).toEqual({ switchView: '2d' });
    const sound = soundKeys({ effects: 'normal', ambient: 'leise' });
    expect(sound.map((one) => (one.kind === 'key' ? one.label : one.text))).toEqual([
      'Ton',
      'Effekte: normal',
      'Ambiente: leise',
    ]);
    expect(leaveKeys().map((one) => (one.kind === 'key' ? one.label : ''))).toEqual([
      'Zurück zu den Rollen',
      'Weiterspielen',
    ]);
  });
});
