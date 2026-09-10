/** @jest-environment jsdom */
import { StationUi, type StationHost } from './stationUi';
import { homeView } from './archiveView';
import { generateHouse } from './house';
import { freshCrew, lockerCode, repairsFor } from './mission';
import type { HauntState } from './net';
import type { StationId } from './stations';

jest.mock('./haunting.css', () => ({}));
jest.mock('./stationDashboard.css', () => ({}));

const views: StationUi[] = [];
let canvas: CanvasRenderingContext2D;
let painted: jest.Mock;
let size = { width: 360, height: 430 };

beforeEach(() => {
  size = { width: 360, height: 430 };
  Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { value: () => {}, configurable: true },
    hasPointerCapture: { value: () => false, configurable: true },
    releasePointerCapture: { value: () => {}, configurable: true },
  });
  painted = jest.fn();
  canvas = {
    setTransform() {},
    fillRect: painted,
    strokeRect() {},
    save() {},
    restore() {},
    rect() {},
    clip() {},
    translate() {},
    rotate() {},
    clearRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillText() {},
    arc() {},
    fill() {},
    measureText: (text: string) => ({ width: text.length * 7 }),
    createRadialGradient: () => ({ addColorStop() {} }),
  } as unknown as CanvasRenderingContext2D;
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => canvas);
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: size.width,
    bottom: size.height,
    ...size,
    toJSON: () => ({}),
  }));
});

afterEach(() => {
  views.splice(0).forEach((ui) => ui.dispose());
  document.body.replaceChildren();
  jest.restoreAllMocks();
});

function crew(station: StationId = 'archive', remoteTechnician = true) {
  let spec = generateHouse(947, 10);
  const state: HauntState = {
    seed: spec.seed,
    crew: freshCrew(),
    phase: 'running',
    time: 1,
    monsterOn: false,
    monster: null,
    shut: [],
    lit: [],
    loud: [],
    fuse: false,
    taken: [],
    done: [],
    destroyed: [],
  };
  let seat: StationId | null = null;
  const flip = jest.fn();
  const menu = jest.fn();
  const botRound = jest.fn();
  const restart = jest.fn();
  const archiveHome = jest.fn();
  const archiveZoom = jest.fn();
  const archivePan = jest.fn();
  const host: StationHost = {
    spec: () => spec,
    state: () => state,
    drone: () => ({ x: 0, z: 0, yaw: 0, pitch: 0, target: '', hop: 0, lamp: 1, light: false }),
    claims: () => (seat ? [{ id: 'me', station: seat, seniority: 10 }] : []),
    me: () => 'me',
    nameOf: () => 'Mein Gerät',
    link: () => ({ peers: 2, vr: remoteTechnician, room: 'test-crew' }),
    technician() {},
    menu,
    botRound,
    restart,
    seat: () => seat,
    wanted: () => seat,
    arriving: () => 0,
    sit(value) {
      seat = value;
    },
    flip,
    flyTo() {},
    droneStatus: () => ({ kind: 'idle', here: 'van', metres: 0 }),
    droneSeen: () => new Set(),
    droneLight() {},
    droneLook: () => 0,
    dronePitch: () => 0,
    droneTurn() {},
    droneTilt() {},
    droneFace() {},
    archiveView: homeView,
    archiveZoom,
    archivePan,
    archiveHome,
  };
  const ui = new StationUi(host);
  views.push(ui);
  ui.refresh();
  button(`[data-sit="${station}"]`).click();
  return {
    ui,
    state,
    flip,
    menu,
    botRound,
    restart,
    archiveHome,
    archiveZoom,
    archivePan,
    get spec() {
      return spec;
    },
    nextRound() {
      spec = generateHouse(spec.seed + 1, 10);
      state.seed = spec.seed;
      ui.refresh();
    },
  };
}

function button(selector: string): HTMLButtonElement {
  const hit = document.querySelector<HTMLButtonElement>(selector);
  expect(hit).not.toBeNull();
  return hit!;
}

function pointer(node: HTMLElement, type: string, id: number, x: number, y: number): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: x,
    clientY: y,
  });
  Object.defineProperty(event, 'pointerId', { value: id });
  node.dispatchEvent(event);
}

describe('Phone dashboard DOM and Canvas interaction', () => {
  it.each([390, 1440])(
    'opens only an isolated room viewport at %i px and keeps role/menu access visible',
    (width) => {
      Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
      size = width < 600 ? { width: 390, height: 250 } : { width: 940, height: 700 };
      const game = crew();
      expect(document.querySelector('nav[aria-label="Archivbereiche"]')).not.toBeNull();
      expect(button('[data-archive-tab="rooms"]').getAttribute('aria-pressed')).toBe('true');
      expect(document.querySelector('[data-archive-tab="map"]')).toBeNull();
      expect(document.querySelector('[data-archive-tab="anomalies"]')).toBeNull();
      expect(
        document.querySelector('.haunt__archive-chart, .haunt__mini-chart, [data-identify]'),
      ).toBeNull();
      expect(game.ui.viewport()).toEqual({ x: 0, y: 0, w: size.width, h: size.height });
      expect(game.ui.headroom()).toBe(0);
      expect(game.ui.veiled).toBe(false);
      expect(document.querySelector('.haunt__view')?.getAttribute('aria-label')).toContain(
        'Decke entfernt',
      );
      expect(button('[aria-label="Rolle wechseln"]').textContent).toContain('Menü / Rollen');
      expect(document.querySelector('[aria-label="Spielmenü öffnen"]')).toBeNull();
      button('[aria-label="Rolle wechseln"]').click();
      expect(button('[data-sit="scout"]')).not.toBeNull();
      button('[data-sit="scout"]').click();
      expect(game.ui.station).toBe('scout');
    },
  );

  it('selects names and shows real protection codes and repair clues without exposing a whole station map', () => {
    const game = crew();
    const repair = repairsFor(game.spec).find((one) => one.puzzle === 'sequence')!;
    const select = document.querySelector<HTMLSelectElement>('select[data-room-select]')!;
    expect(select.options).toHaveLength(game.spec.rooms.length);
    expect(select.closest('label')?.textContent).toContain(
      'Welchen Raum beschreibt der Techniker?',
    );
    select.focus();
    select.value = repair.roomId;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(game.ui.selected).toBe(repair.roomId);
    expect((document.activeElement as HTMLSelectElement).value).toBe(repair.roomId);
    const text = document.querySelector('.haunt__sheet')?.textContent;
    expect(text).toContain(lockerCode(game.spec.seed, repair.roomId));
    expect(text).toContain(repair.code);
    expect(text).toContain(repair.hint);
    expect(game.archiveHome).toHaveBeenCalledTimes(2);
    button('[data-archive-tab="orders"]').click();
    expect(game.ui.viewport()).toBeNull();
    expect(document.querySelector('.haunt__tasks')?.textContent).toContain(repair.code);
    button(`[data-dossier-room="${repair.roomId}"]`).click();
    expect(button('[data-archive-tab="rooms"]').getAttribute('aria-pressed')).toBe('true');
    expect(game.ui.selected).toBe(repair.roomId);
  });

  it('shows the actual cargo clue on its source room sheet', () => {
    const game = crew();
    const task = game.spec.tasks[0]!;
    const select = document.querySelector<HTMLSelectElement>('select[data-room-select]')!;
    select.value = task.roomId;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const text = document.querySelector('.haunt__sheet')?.textContent;
    expect(text).toContain(task.label);
    expect(text).toContain(task.hint);
  });

  it('pans and zooms a room with touch, wheel and keyboard without selecting another room', () => {
    const game = crew();
    const view = document.querySelector<HTMLElement>('.haunt__view')!;
    const selected = game.ui.selected;
    pointer(view, 'pointerdown', 1, 140, 170);
    pointer(view, 'pointermove', 1, 190, 205);
    pointer(view, 'pointerup', 1, 190, 205);
    expect(game.archivePan).toHaveBeenCalled();
    pointer(view, 'pointerdown', 2, 80, 100);
    pointer(view, 'pointerdown', 3, 200, 100);
    pointer(view, 'pointermove', 3, 250, 100);
    pointer(view, 'pointerup', 3, 250, 100);
    pointer(view, 'pointerup', 2, 80, 100);
    expect(game.archiveZoom).toHaveBeenCalled();
    expect(game.ui.selected).toBe(selected);
    const wheel = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
    view.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);
    const reset = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true });
    view.dispatchEvent(reset);
    expect(reset.defaultPrevented).toBe(true);
    expect(game.archiveHome).toHaveBeenCalledTimes(2);
    button('[aria-label="Raumansicht vergrößern"]').click();
    expect(game.archiveZoom).toHaveBeenLastCalledWith(1.4);
  });

  it('exposes a bot round on the role screen and a restart action after a lost round', () => {
    const game = crew('archive', false);
    button('[aria-label="Rolle wechseln"]').click();
    button('[data-bot-round]').click();
    expect(game.botRound).toHaveBeenCalledTimes(1);
    game.state.phase = 'lost';
    game.state.crew.hp = 0;
    game.ui.refresh();
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Runde ist beendet');
    button('[data-restart]').click();
    expect(game.restart).toHaveBeenCalledTimes(1);
  });

  it('disables bot demos while another technician is playing and explains why', () => {
    const game = crew('archive', true);
    button('[aria-label="Rolle wechseln"]').click();
    const bot = button('[data-bot-round]');
    expect(bot.disabled).toBe(true);
    expect(bot.textContent).toContain('Ein Techniker spielt bereits');
    bot.click();
    expect(game.botRound).not.toHaveBeenCalled();
  });

  it('keeps system switches and radar on separate labelled tabs and sends switch actions once', () => {
    const { ui, flip, state } = crew('scout');
    expect(document.querySelector('.haunt__scout')).not.toBeNull();
    expect(document.querySelector('[data-flip]')).toBeNull();
    expect(button('[data-control-tab="radar"]').textContent).toBe('Radar & Anzug');
    button('[data-control-tab="switches"]').click();
    expect(document.querySelector('.haunt__scout')).toBeNull();
    const key = button('[data-flip]');
    key.click();
    expect(flip).toHaveBeenCalledTimes(1);
    expect(flip).toHaveBeenCalledWith(key.dataset['flip'], key.dataset['on'] !== '1');
    state.crew.hp = 2;
    ui.refresh();
    expect(button('[data-control-tab="switches"]').getAttribute('aria-pressed')).toBe('true');
    button('[data-control-tab="radar"]').click();
    expect(document.querySelector('.haunt__ecg')?.getAttribute('aria-label')).toContain(
      'Simulierter Puls',
    );
    expect(ui.viewport()).toBeNull();
  });
});
