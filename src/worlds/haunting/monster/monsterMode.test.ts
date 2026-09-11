/** @jest-environment jsdom */
import { FlatMode } from '../map/flatMode';

jest.mock('../map/flat.css', () => ({}));
jest.mock('./monster.css', () => ({}));

const DT = 1 / 30;

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(
    () =>
      new Proxy({} as Record<string, unknown>, {
        get: (target, key: string) => (key in target ? target[key] : () => {}),
        set: (target, key: string, value) => {
          target[key] = value;
          return true;
        },
      }),
  ) as never;
  HTMLCanvasElement.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0 }) as DOMRect;
});

describe('Als Monster in der 2D-Welt', () => {
  it('tauscht Stock und Knöpfe gegen die Monster-Ansicht, der Bot spielt den Techniker', () => {
    const flat = new FlatMode(3, { role: 'monster' }, { exit: () => {} });
    document.body.append(flat.element);
    expect(flat.element.dataset['role']).toBe('monster');
    expect(flat.element.querySelector('.monster')).not.toBeNull();
    expect(flat.element.querySelector<HTMLElement>('.flat__buttons')!.hidden).toBe(true);
    expect(flat.element.querySelector<HTMLElement>('.flat__map')!.hidden).toBe(true);
    expect(flat.round.driver?.active()).toBe(true);
    const start = { ...flat.round.player };
    const monster = { ...flat.round.monster };
    for (let i = 0; i < 150; i++) flat.update(DT);
    // Der Techniker ist unterwegs zu seinem ersten Auftrag, das Monster steht.
    expect(
      Math.hypot(flat.round.player.x - start.x, flat.round.player.z - start.z),
    ).toBeGreaterThan(2);
    expect(flat.round.monster.x).toBe(monster.x);
    expect(flat.element.querySelector('.flat__hud')?.textContent).toContain('O₂');
    // Das Optionsmenü sagt nur noch, *wer* man ist — gewechselt wird in der
    // Lobby. Der Zykler „Techniker / Monster / Bot-Runde", der nie zeigte,
    // was als Nächstes kommt, ist weg.
    flat.element.querySelector<HTMLButtonElement>('.flat__options')!.click();
    const panel = flat.element.querySelector<HTMLElement>('.flat__panel:not(.flat__sheet)')!;
    expect(panel.textContent).toContain('Du spielst das Monster');
    expect(panel.querySelector('[data-role]')).toBeNull();
    expect(panel.querySelector('.setup')).toBeNull();
    flat.dispose();
  });

  it('meldet das Ende aus Sicht des Monsters', () => {
    const flat = new FlatMode(3, { role: 'monster' }, { exit: () => {} });
    flat.round.state().crew.hp = 0;
    flat.round.haunt.phase = 'lost';
    flat.update(DT);
    expect(flat.element.querySelector('.flat__ending strong')?.textContent).toBe(
      'DAS MONSTER GEWINNT',
    );
    flat.dispose();
  });
});
