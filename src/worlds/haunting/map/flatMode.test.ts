/** @jest-environment jsdom */
import { FlatMode } from './flatMode';
import { puzzleFor } from '../mission';
import { FlatWalker } from './flatWalk';

jest.mock('./flat.css', () => ({}));

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

function pointer(node: HTMLElement, type: string, id: number, x: number, y: number): void {
  const event = new Event(type, { bubbles: true }) as PointerEvent;
  Object.assign(event, { pointerId: id, clientX: x, clientY: y });
  node.dispatchEvent(event);
}

const DT = 1 / 30;

describe('Die 2D-Welt', () => {
  it('bewegt den Spieler mit dem Stock und beschriftet die drei Knöpfe', () => {
    const exit = jest.fn();
    const flat = new FlatMode(3, { test: true }, { exit });
    document.body.append(flat.element);
    const stick = flat.element.querySelector<HTMLElement>('.flat__stick')!;
    stick.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 300,
        width: 200,
        height: 300,
        right: 200,
        bottom: 600,
        x: 0,
        y: 300,
      }) as DOMRect;
    const start = { ...flat.round.player };
    pointer(stick, 'pointerdown', 7, 80, 500);
    pointer(stick, 'pointermove', 7, 80, 560);
    for (let i = 0; i < 30; i++) flat.update(DT);
    expect(flat.round.player.z).toBeGreaterThan(start.z);
    pointer(stick, 'pointerup', 7, 80, 560);
    const z = flat.round.player.z;
    for (let i = 0; i < 10; i++) flat.update(DT);
    expect(flat.round.player.z).toBe(z);
    const keys = [...flat.element.querySelectorAll<HTMLButtonElement>('.flat__buttons .flat__key')];
    expect(keys.map((k) => k.querySelector('small')?.textContent)).toEqual([
      'Wechseln',
      'Benutzen',
      'Interagieren',
    ]);
    expect(keys[0]!.disabled).toBe(true);
    keys[1]!.click();
    expect(flat.round.torch).toBe(false);
    expect(flat.viewport()).toBeNull();
    flat.element.querySelector<HTMLElement>('.flat__item')!.getBoundingClientRect = () =>
      ({
        left: 200,
        top: 100,
        width: 150,
        height: 90,
        right: 350,
        bottom: 190,
        x: 200,
        y: 100,
      }) as DOMRect;
    expect(flat.viewport()).toEqual({ x: 200, y: 100, w: 150, h: 90 });
    flat.dispose();
  });

  it('öffnet das Rätsel als Overlay und schließt es beim Lösen', () => {
    const flat = new FlatMode(3, { test: true }, { exit: () => {} });
    document.body.append(flat.element);
    const round = flat.round;
    const jobs = round.jobs();
    const walker = new FlatWalker(round);
    for (const job of jobs.slice(0, 2)) {
      let input = walker.input(job.at, DT);
      while (input) {
        round.step(DT, input);
        input = walker.input(job.at, DT);
      }
      round.act('interact');
      if (job.kind === 'cargo') round.act('interact');
    }
    expect(round.puzzle).not.toBeNull();
    flat.update(DT);
    const overlay = flat.element.querySelector<HTMLElement>('.flat__puzzle')!;
    expect(overlay.hidden).toBe(false);
    const repair = round.puzzle!;
    const puzzle = puzzleFor(round.state().crew, repair.id);
    const press = (selector: string) => overlay.querySelector<HTMLButtonElement>(selector)!.click();
    if (repair.puzzle === 'wires')
      for (let plug = 0; plug < 4; plug++) {
        press(`[data-plug="${plug}"]`);
        press(`[data-socket="${repair.order.indexOf(plug)}"]`);
      }
    else if (repair.puzzle === 'sequence')
      for (const digit of repair.code) press(`[data-digit="${digit}"]`);
    else {
      for (let column = 0; column < 3; column++)
        while (puzzle.digits[column] !== Number(repair.code[column]))
          press(`[data-turn="${column}"]`);
      press('[data-send]');
    }
    expect(round.puzzle).toBeNull();
    expect(round.state().done).toHaveLength(1);
    flat.update(DT);
    expect(overlay.hidden).toBe(true);
    flat.dispose();
  });

  it('bietet im Optionsmenü genau die zwei Modi an und wechselt', () => {
    const exit = jest.fn();
    const flat = new FlatMode(3, {}, { exit });
    document.body.append(flat.element);
    flat.element.querySelector<HTMLButtonElement>('.flat__options')!.click();
    const modes = [...flat.element.querySelectorAll<HTMLButtonElement>('[data-mode]')];
    expect(modes.map((m) => m.querySelector('strong')?.textContent)).toEqual([
      'Alles sehen',
      'Realitätsnah',
    ]);
    expect(flat.visibilityMode).toBe('realistic');
    modes[0]!.click();
    expect(flat.visibilityMode).toBe('omniscient');
    flat.update(DT);
    expect(flat.map.current.field.mode).toBe('omniscient');
    expect(flat.map.stats.entities).toBe(2);
    // Das Menü baut sich nach jedem Klick neu — also frisch nachschlagen.
    flat.element.querySelectorAll<HTMLButtonElement>('[data-mode]')[1]!.click();
    flat.update(DT);
    expect(flat.map.current.field.mode).toBe('realistic');
    flat.element.querySelector<HTMLButtonElement>('[data-leave]')!.click();
    expect(exit).toHaveBeenCalled();
    flat.dispose();
  });

  it('zeigt das Ende und fängt neu an', () => {
    const flat = new FlatMode(3, { test: true }, { exit: () => {} });
    flat.round.state().crew.hp = 0;
    flat.round.haunt.phase = 'lost';
    flat.update(DT);
    const ending = flat.element.querySelector<HTMLElement>('.flat__ending')!;
    expect(ending.hidden).toBe(false);
    ending.querySelector<HTMLButtonElement>('[data-restart]')!.click();
    expect(flat.round.phase).toBe('running');
    expect(ending.hidden).toBe(true);
    flat.dispose();
  });
});
