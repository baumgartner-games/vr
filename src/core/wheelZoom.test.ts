/** @jest-environment jsdom */
import {
  WHEEL_LINE,
  WHEEL_NOTCH,
  WHEEL_PAGE,
  scrollsItself,
  wheelPixels,
  wheelStep,
  wheelTakenByUi,
} from './wheelZoom';

/**
 * Das Rad von oben (`core/TopDownCamera.ts`) — die drei Fälle, die im Browser
 * je einen Abend kosten: die Einheit, der Richtungswechsel und das Menü, über
 * dem gedreht wird.
 */

describe('how much a turn of the wheel is', () => {
  it('takes pixels as they come', () => {
    expect(wheelPixels({ deltaY: 100, deltaMode: 0 })).toBe(100);
    expect(wheelPixels({ deltaY: -53, deltaMode: 0 })).toBe(-53);
  });

  /**
   * **Firefox meldet Zeilen**: eine Raste sind dort `3`, und gegen die alte
   * Schwelle von 50 Bildpunkten war das nichts. Genau so fühlte es sich an —
   * das Rad tat scheinbar nichts, bis man ein Dutzend Rasten weit drehte.
   */
  it('turns lines and pages into pixels', () => {
    expect(wheelPixels({ deltaY: 3, deltaMode: 1 })).toBe(3 * WHEEL_LINE);
    expect(wheelPixels({ deltaY: 1, deltaMode: 2 })).toBe(WHEEL_PAGE);
  });

  it('reads an unknown unit as pixels rather than losing the turn', () => {
    expect(wheelPixels({ deltaY: 100, deltaMode: 7 })).toBe(100);
  });

  /** Und damit ist **eine** Raste überall **eine** Stufe. */
  it('makes one notch one step in either browser', () => {
    expect(wheelStep(0, wheelPixels({ deltaY: 100, deltaMode: 0 })).step).toBe(1);
    expect(wheelStep(0, wheelPixels({ deltaY: -3, deltaMode: 1 })).step).toBe(-1);
  });
});

describe('the collector behind the wheel', () => {
  it('adds up what a trackpad sends in crumbs', () => {
    const first = wheelStep(0, 12);
    expect(first.step).toBe(0);
    const second = wheelStep(first.acc, 12);
    expect(second.step).toBe(0);
    expect(second.acc).toBe(24);
    expect(wheelStep(second.acc, WHEEL_NOTCH).step).toBe(1);
  });

  /**
   * **Ein Richtungswechsel fängt neu an.** Sonst rechnete die erste Drehung
   * zurück gegen das, was vorwärts gesammelt war — zwei Rasten hin und zwei
   * her, und das Rad stand bei null.
   */
  it('starts over when the direction flips', () => {
    const forward = wheelStep(0, 30);
    expect(forward.acc).toBe(30);
    const back = wheelStep(forward.acc, -30);
    expect(back.acc).toBe(-30);
    expect(back.step).toBe(0);
  });

  it('empties itself with every step, so the next one needs a full notch', () => {
    const stepped = wheelStep(0, 4 * WHEEL_NOTCH);
    expect(stepped.step).toBe(1);
    expect(stepped.acc).toBe(0);
  });

  it('survives a wheel that reports nonsense', () => {
    expect(wheelStep(0, Number.NaN)).toEqual({ acc: 0, step: 0 });
  });
});

describe('who owns the turn', () => {
  const overflowOf = (node: Element): string => (node as HTMLElement).style.overflowY;

  it('knows which boxes scroll by themselves', () => {
    expect(scrollsItself('auto')).toBe(true);
    expect(scrollsItself('scroll')).toBe(true);
    expect(scrollsItself('overlay')).toBe(true);
    expect(scrollsItself('hidden')).toBe(false);
    expect(scrollsItself('visible')).toBe(false);
  });

  /**
   * Der gemeldete Fehler: Der Zeiger steht im geöffneten Menü, das Rad
   * scrollt die Liste — und die Welt dahinter zoomte mit.
   */
  it('leaves the zoom alone while the pointer is in a scrolling menu', () => {
    const menu = document.createElement('div');
    menu.style.overflowY = 'auto';
    const row = document.createElement('button');
    menu.append(row);
    document.body.append(menu);
    expect(wheelTakenByUi(row, overflowOf)).toBe(true);
  });

  it('zooms over the canvas and over the bar with the world name', () => {
    const canvas = document.createElement('canvas');
    const hud = document.createElement('div');
    const name = document.createElement('span');
    hud.append(name);
    document.body.append(canvas, hud);
    expect(wheelTakenByUi(canvas, overflowOf)).toBe(false);
    expect(wheelTakenByUi(name, overflowOf)).toBe(false);
    expect(wheelTakenByUi(null, overflowOf)).toBe(false);
  });
});
