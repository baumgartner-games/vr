/** @jest-environment jsdom */
import { ShipControls } from './shipControls';

describe('Die Steuerung der 2D-Welt im Schiff', () => {
  /**
   * **Dieselben Klassen wie in der 2D-Welt.** Das ist keine Kosmetik: Der
   * Stock, die drei Knöpfe und ihre Plätze stehen einmal in `controls.css`, und
   * wer sie hier nachbaute, hätte in einem halben Jahr zwei Steuerungen, die
   * sich ähnlich sehen. Sie stehen deshalb in `map/controls.css`, das beide
   * Seiten einbinden; der schwarze Grund bleibt bei der 2D-Welt, denn hier
   * liegt die Station darunter.
   */
  it('hängt Stock und Knöpfe der 2D-Welt über die Szene', () => {
    const controls = new ShipControls({
      interact: () => {},
      cycleLeft: () => {},
      cycleRight: () => {},
    });
    expect(controls.element.className).toBe('flat ship3d');
    expect(controls.element.querySelector('.flat__stick')).not.toBeNull();
    expect(controls.element.querySelectorAll('.flat__key')).toHaveLength(3);
    expect(document.body.contains(controls.element)).toBe(true);
    controls.dispose();
    expect(document.body.contains(controls.element)).toBe(false);
  });

  it('schickt jeden Knopf an seine Hand — und den großen an das Ding davor', () => {
    const pressed: string[] = [];
    const controls = new ShipControls({
      interact: () => pressed.push('use'),
      cycleLeft: () => pressed.push('left'),
      cycleRight: () => pressed.push('right'),
    });
    const keys = [...controls.element.querySelectorAll<HTMLButtonElement>('.flat__key')];
    for (const key of keys) key.click();
    expect(pressed).toEqual(['left', 'right', 'use']);
    controls.dispose();
  });

  it('schreibt die Hände auf die Knöpfe und hebt den großen nur mit Ziel hervor', () => {
    const controls = new ShipControls({
      interact: () => {},
      cycleLeft: () => {},
      cycleRight: () => {},
    });
    const act = controls.element.querySelector<HTMLElement>('.flat__key--act')!;
    controls.setLabels({ left: 'Radar', right: 'Taschenlampe', target: '' });
    expect(controls.element.querySelector('.flat__key--cycle')?.textContent).toContain('Radar');
    expect(controls.element.querySelector('.flat__key--use')?.textContent).toContain(
      'Taschenlampe',
    );
    expect(act.classList.contains('is-ready')).toBe(false);
    controls.setLabels({ left: 'Radar', right: 'Taschenlampe', target: 'Fracht öffnen' });
    expect(act.textContent).toContain('Fracht öffnen');
    expect(act.classList.contains('is-ready')).toBe(true);
    controls.dispose();
  });

  /** Ein versteckter Stock schiebt niemanden: Sonst liefe man im Menü weiter. */
  it('gibt keinen Bewegungswunsch heraus, solange sie versteckt ist', () => {
    const controls = new ShipControls({
      interact: () => {},
      cycleLeft: () => {},
      cycleRight: () => {},
    });
    expect(controls.move.magnitude).toBe(0);
    controls.hidden = true;
    expect(controls.hidden).toBe(true);
    expect(controls.move.magnitude).toBe(0);
    controls.dispose();
  });
});
