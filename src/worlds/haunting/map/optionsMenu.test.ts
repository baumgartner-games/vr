/** @jest-environment jsdom */
import {
  head,
  key,
  leaveKeys,
  note,
  renderOptions,
  soundKeys,
  speedKeys,
  watchKey,
} from './optionsMenu';

/**
 * **Das Optionsmenü des Schiffs** (`map/optionsMenu.ts`): Aus einer Liste
 * wird DOM aus den Bausteinen von `ui/widgets.ts`, die `data-*`-Schlüssel
 * bleiben erhalten, und die festen Einträge heißen überall gleich.
 */
describe('Das geteilte Optionsmenü', () => {
  it('zeichnet Überschrift, Hinweis und Knöpfe mit ihren Schlüsseln', () => {
    const root = document.createElement('div');
    renderOptions(root, [
      head('Ansicht'),
      note('nur sehen'),
      key({ watch: '' }, 'Wechseln', 'mitten in der Runde', { active: true }),
      key({ closeOptions: '' }, 'Weiterspielen'),
      key({ leave: '' }, 'Runde verlassen', 'zurück', { leave: true, pressed: false }),
    ]);
    expect(root.querySelector('.ui-head')?.textContent).toBe('Ansicht');
    expect(root.querySelector('.flat__note')?.textContent).toBe('nur sehen');
    const swap = root.querySelector<HTMLButtonElement>('[data-watch]')!;
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

  it('nennt die festen Einträge immer gleich', () => {
    const on = watchKey(true),
      off = watchKey(false);
    expect(on.kind === 'key' && on.label).toBe('Zuschauen: an');
    expect(on.kind === 'key' && on.pressed).toBe(true);
    expect(off.kind === 'key' && off.label).toBe('Zuschauen: aus');
    const sound = soundKeys({ effects: 'normal', ambient: 'leise' });
    expect(
      sound.map((one) => (one.kind === 'key' ? one.label : one.kind === 'head' ? one.text : '')),
    ).toEqual(['Ton', 'Effekte: normal', 'Ambiente: leise']);
    expect(leaveKeys().map((one) => (one.kind === 'key' ? one.label : ''))).toEqual([
      'Rollen & Aufbau',
      'Weiterspielen',
    ]);
  });

  /**
   * **Das Tempo ist eine Reihe, kein Zähler**: sechs Pillen, die gewählte
   * leuchtet, jede trägt ihre Stufe als `data-speed`. Wer von ×16 auf ×2
   * will, drückt einmal.
   */
  it('zeichnet die Stufen des Zeitraffers als Reihe mit der gewählten leuchtend', () => {
    const root = document.createElement('div');
    renderOptions(root, speedKeys(4));
    expect(root.querySelector('.ui-head')?.textContent).toBe('Simulationsgeschwindigkeit');
    const pills = [...root.querySelectorAll<HTMLButtonElement>('.ui-row [data-speed]')];
    expect(pills.map((pill) => pill.dataset['speed'])).toEqual(['1', '2', '4', '8', '12', '16']);
    expect(pills.map((pill) => pill.textContent)).toEqual(['×1', '×2', '×4', '×8', '×12', '×16']);
    expect(
      pills.filter((pill) => pill.classList.contains('is-active')).map((p) => p.dataset['speed']),
    ).toEqual(['4']);
    expect(pills[2]!.getAttribute('aria-pressed')).toBe('true');
    expect(pills[0]!.getAttribute('aria-pressed')).toBe('false');
    // Eine Stufe, die es nicht gibt, rastet auf die nächste darunter.
    renderOptions(root, speedKeys(13));
    expect(root.querySelector<HTMLButtonElement>('.ui-row .is-active')?.dataset['speed']).toBe(
      '12',
    );
  });
});
