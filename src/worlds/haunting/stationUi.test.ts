/** @jest-environment jsdom */
import { StationUi, type StationHost } from './stationUi';
import { homeView } from './archiveView';
import { archiveProjection } from './archiveMap';
import { generateHouse } from './house';
import { freshCrew, lockerCode } from './mission';
import { ENTITY_EVIDENCE } from './threat';
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
  jest.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
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

function crew(station: StationId = 'archive') {
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
  };
  let seat: StationId | null = null;
  const flip = jest.fn();
  const host: StationHost = {
    spec: () => spec,
    state: () => state,
    drone: () => ({ x: 0, z: 0, yaw: 0, pitch: 0, target: '', hop: 0, lamp: 1, light: false }),
    claims: () => (seat ? [{ id: 'me', station: seat, seniority: 10 }] : []),
    me: () => 'me',
    nameOf: () => 'Mein Gerät',
    link: () => ({ peers: 2, vr: true, room: 'test-crew' }),
    technician() {},
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
    archiveZoom() {},
    archivePan() {},
    archiveHome() {},
  };
  const ui = new StationUi(host);
  views.push(ui);
  ui.refresh();
  button(`[data-sit="${station}"]`).click();
  return {
    ui,
    state,
    flip,
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
  it('opens a visible chart preview, zooms without requesting a 3D viewport, and returns to orders', () => {
    const { ui } = crew();
    expect(document.querySelector('nav[aria-label="Archivbereiche"]')).not.toBeNull();
    expect(document.querySelector('button[aria-label="Karte vergrößern"] canvas')).not.toBeNull();
    expect(button('[data-archive-tab="orders"]').getAttribute('aria-pressed')).toBe('true');
    expect(ui.viewport()).toBeNull();
    button('button[aria-label="Karte vergrößern"]').click();
    expect(button('[data-archive-tab="map"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.haunt__archive-chart')).not.toBeNull();
    expect(document.querySelector('.haunt__mini-chart')).toBeNull();
    painted.mockClear();
    ui.refresh();
    expect(painted).not.toHaveBeenCalled();
    button('[aria-label="Karte heranzoomen"]').click();
    expect(painted).toHaveBeenCalled();
    expect(ui.viewport()).toBeNull();
    button('.haunt__chart-tools [data-archive-tab]').click();
    expect(button('[data-archive-tab="orders"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.haunt__tasks')).not.toBeNull();
  });

  it('selects a room from the 2D chart and shows its actual locker code with an accessible room selector', () => {
    const game = crew();
    button('[data-archive-tab="map"]').click();
    const room = game.spec.rooms.at(-1)!;
    const chart = document.querySelector<HTMLCanvasElement>('.haunt__archive-chart')!;
    const p = archiveProjection(game.spec, size.width, size.height, homeView());
    const x = p.x + (room.rect.x + room.rect.w / 2) * p.scale;
    const y = p.z + (room.rect.z + room.rect.d / 2) * p.scale;
    pointer(chart, 'pointerdown', 1, x, y);
    pointer(chart, 'pointerup', 1, x, y);
    expect(game.ui.selected).toBe(room.id);
    button('.haunt__chart-detail').click();
    const select = document.querySelector<HTMLSelectElement>('select[data-room-select]')!;
    expect(select.closest('label')?.textContent).toContain(
      'Welchen Raum beschreibt der Techniker?',
    );
    expect(select.value).toBe(room.id);
    expect(document.querySelector('.haunt__sheet')?.textContent).toContain(
      lockerCode(game.spec.seed, room.id),
    );
    select.focus();
    select.value = game.spec.rooms[0]!.id;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect((document.activeElement as HTMLSelectElement).value).toBe(game.spec.rooms[0]!.id);
    expect(game.ui.selected).toBe(game.spec.rooms[0]!.id);
  });

  it('treats drag and pinch as map gestures instead of accidental room selections', () => {
    const game = crew();
    button('[data-archive-tab="map"]').click();
    button('[data-map-action="in"]').click();
    const chart = document.querySelector<HTMLCanvasElement>('.haunt__archive-chart')!;
    const selected = game.ui.selected;
    painted.mockClear();
    pointer(chart, 'pointerdown', 1, 140, 170);
    pointer(chart, 'pointermove', 1, 190, 205);
    pointer(chart, 'pointerup', 1, 190, 205);
    expect(painted).toHaveBeenCalled();
    expect(game.ui.selected).toBe(selected);
    painted.mockClear();
    pointer(chart, 'pointerdown', 2, 80, 100);
    pointer(chart, 'pointerdown', 3, 200, 100);
    pointer(chart, 'pointermove', 3, 250, 100);
    pointer(chart, 'pointerup', 3, 250, 100);
    pointer(chart, 'pointerup', 2, 80, 100);
    expect(painted).toHaveBeenCalled();
    expect(game.ui.selected).toBe(selected);
    const reset = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true });
    chart.dispatchEvent(reset);
    expect(reset.defaultPrevented).toBe(true);
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

  it('derives a journal hypothesis from checked observations, never from the actual configured entity', () => {
    const game = crew();
    game.state.crew.options.monster = 'crawler';
    button('[data-archive-tab="anomalies"]').click();
    expect(document.querySelectorAll('.haunt__evidence-checklist fieldset')).toHaveLength(3);
    const findCold = () =>
      [...document.querySelectorAll<HTMLInputElement>('[data-evidence]')].find(
        (input) => input.dataset['evidence'] === ENTITY_EVIDENCE.stalker.clues[0],
      )!;
    findCold().focus();
    findCold().click();
    expect(findCold().checked).toBe(true);
    expect(document.activeElement).toBe(findCold());
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Der Verlorene');
    expect(document.querySelector('[role="status"]')?.textContent).not.toContain('Schachtläufer');
    button('[data-identify="stalker"]').click();
    expect(button('[data-identify="stalker"]').getAttribute('aria-pressed')).toBe('true');
    button('[data-archive-tab="orders"]').click();
    button('[data-archive-tab="anomalies"]').click();
    expect(findCold().checked).toBe(true);
    game.nextRound();
    expect(findCold().checked).toBe(false);
    expect(button('[data-identify="stalker"]').getAttribute('aria-pressed')).toBe('false');
  });
});
