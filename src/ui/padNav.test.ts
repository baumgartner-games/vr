/** @jest-environment jsdom */
import type { GamepadLike } from '../core/gamepad';
import { PadNav, type PadScope } from './padNav';

/**
 * **Der Fahrer der Menüs am Pad** (`padNav.ts`) — mit einem nachgebauten Pad
 * und Knöpfen, deren Lage von Hand gesetzt ist: jsdom misst jedes Rechteck
 * mit null, und ein Knopf ohne Fläche ist für den Fokus keiner.
 */

function fakePad(): GamepadLike & { set(index: number, on: boolean): void } {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
  return {
    axes: [0, 0, 0, 0],
    buttons,
    connected: true,
    set(index: number, on: boolean) {
      buttons[index] = { pressed: on, value: on ? 1 : 0 };
    },
  };
}

/** Ein Knopf an einer festen Stelle. */
function button(label: string, top: number, left = 0, width = 200): HTMLButtonElement {
  const node = document.createElement('button');
  node.textContent = label;
  node.getBoundingClientRect = () =>
    ({ left, top, width, height: 40, right: left + width, bottom: top + 40 }) as DOMRect;
  node.scrollIntoView = () => {};
  return node;
}

describe('PadNav', () => {
  let pad: ReturnType<typeof fakePad>;
  let nav: PadNav;
  let root: HTMLElement;
  let log: string[];
  let time = 0;

  const frame = (): void => {
    time += 16;
    nav.tick(time);
  };
  /** Ein Knopf, einmal gedrückt und wieder losgelassen. */
  const tap = (index: number): void => {
    pad.set(index, true);
    frame();
    pad.set(index, false);
    frame();
  };

  beforeEach(() => {
    document.body.innerHTML = '';
    pad = fakePad();
    nav = new PadNav(() => [pad]);
    root = document.createElement('div');
    const first = button('Eins', 0);
    const second = button('Zwei', 50);
    const third = button('Drei', 100);
    log = [];
    for (const node of [first, second, third])
      node.addEventListener('click', () => log.push(node.textContent ?? ''));
    root.append(first, second, third);
    document.body.append(root);
    time = 0;
  });

  it('macht mit ☰ das Menü auf, wenn nichts offen ist', () => {
    let opened = 0;
    nav.onMenu = () => opened++;
    tap(9);
    expect(opened).toBe(1);
    expect(nav.device).toBe('pad');
  });

  it('bewegt den Fokus, drückt mit A und geht mit B zurück', () => {
    let open = true;
    let backs = 0;
    const scope: PadScope = {
      priority: 1,
      active: () => open,
      root: () => root,
      back: () => {
        backs++;
        return backs < 2;
      },
      close: () => {
        open = false;
      },
    };
    nav.addScope(scope);
    // Der erste Druck zeigt nur, wo der Fokus steht.
    tap(13);
    expect(document.activeElement?.textContent).toBe('Eins');
    tap(13);
    expect(document.activeElement?.textContent).toBe('Zwei');
    tap(0);
    expect(log).toEqual(['Zwei']);
    // B: erst eine Seite zurück, dann — oben angekommen — zu.
    tap(1);
    expect(open).toBe(true);
    tap(1);
    expect(open).toBe(false);
  });

  it('hört weg, solange das Menü Eingaben auf einen Druck wartet', () => {
    let closed = false;
    nav.addScope({
      priority: 1,
      active: () => !closed,
      root: () => root,
      close: () => {
        closed = true;
      },
    });
    nav.paused = () => true;
    tap(9);
    expect(closed).toBe(false);
  });

  it('macht die Werkzeugliste mit Y wieder zu, das Menü nicht', () => {
    const closed: string[] = [];
    const tools = nav.addScope({
      priority: 1,
      active: () => !closed.includes('tools'),
      root: () => root,
      close: () => closed.push('tools'),
      closeOnTools: true,
    });
    tap(3);
    expect(closed).toEqual(['tools']);
    tools();
    nav.addScope({
      priority: 1,
      active: () => true,
      root: () => root,
      close: () => closed.push('menu'),
    });
    tap(3);
    expect(closed).toEqual(['tools']);
  });
});
