/** @jest-environment jsdom */
import { StationUi, type StationHost } from './stationUi';
import { homeView } from './archiveView';
import { generateHouse } from './house';
import { freshCrew, lockerCode, repairsFor } from './mission';
import { taskCargo } from './rules/cargo';
import type { HauntState } from './net';
import { freshGhosts } from './rules/ghosts';
import type { StationId } from './stations';
import { emptySnapshot, type MapRound } from './map/mapSnapshot';
import type { MonsterPort } from './monster/monsterDriver';

jest.mock('./haunting.css', () => ({}));
jest.mock('./stationDashboard.css', () => ({}));
jest.mock('./monster/monster.css', () => ({}));

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

function crew(
  station: StationId = 'archive',
  remoteTechnician = true,
  monster?: MonsterPort,
  flat?: boolean,
) {
  let spec = generateHouse(947, 10);
  // Die Checkbox „2D-Welt von oben" gibt es nur, wenn die Welt sie anbietet
  // (`flat` gesetzt); `undefined` ist der Van ohne sie, wie in den alten Tests.
  let flatWanted = flat ?? false;
  const mission = jest.fn();
  const test = jest.fn();
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
    technician: null,
    ride: 'out',
    ghosts: freshGhosts(),
  };
  let seat: StationId | null = null;
  let round: MapRound | null = null;
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
    round: () => round,
    snapshot: () => ({ ...emptySnapshot(), seed: spec.seed }),
    monsterPort: () => monster ?? null,
    notify: () => {},
    ...(flat === undefined
      ? {}
      : {
          flatMode() {
            flatWanted = !flatWanted;
            ui.refresh();
          },
          flatWanted: () => flatWanted,
          mission,
          test,
        }),
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
    mission,
    test,
    restart,
    archiveHome,
    archiveZoom,
    archivePan,
    get flatWanted() {
      return flatWanted;
    },
    get spec() {
      return spec;
    },
    /** Der Stand der Rundenregeln, wie `HauntingWorld` ihn liefert — `null` heißt: keine Regeln. */
    setRound(value: Partial<MapRound> | null) {
      round = value
        ? {
            phase: 'running',
            oxygen: 600,
            limit: 600,
            suit: 3,
            suitMax: 3,
            cabinsDestroyed: [],
            ending: '',
            ...value,
          }
        : null;
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

/** Ein Port, der mitschreibt — die Ansicht der Monster-Station hängt an ihm. */
function fakePort(): MonsterPort & { calls: string[]; held: boolean } {
  const port = {
    calls: [] as string[],
    held: false,
    claim() {
      port.calls.push('claim');
      port.held = true;
      return true;
    },
    release() {
      port.calls.push('release');
      port.held = false;
    },
    claimed: () => port.held,
    input() {
      port.calls.push('input');
    },
    act(action: 'interact') {
      port.calls.push(action);
      return '';
    },
    ventTargets: () => [],
    chooseVent() {},
    // Ein Ziel in Reichweite: sonst ist der Knopf aus und nichts zu klicken.
    status: () => ({
      ride: 'out' as const,
      progress: 1,
      prompt: 'Kabine aufreißen',
      label: 'Stalker',
    }),
  };
  return port;
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

describe('Die Station Monster in der Einsatzzentrale', () => {
  /**
   * Die fünfte Kachel baut die Rollenansicht aus `monster/` — mit dem Port
   * der Welt am Steuer. Sie überlebt ein Neuschreiben der Seite (Stock in
   * der Hand) und gibt das Steuer erst frei, wenn man die Station verlässt.
   */
  it('baut die Ansicht aus der Registry, hält sie über Neuschriften und gibt sie beim Verlassen frei', () => {
    // Die Karte braucht mehr vom Canvas als der Späherschirm: alles erlaubt.
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        new Proxy({} as Record<string, unknown>, {
          get: (target, key: string) => (key in target ? target[key] : () => {}),
          set: (target, key: string, value) => {
            target[key] = value;
            return true;
          },
        }) as unknown as CanvasRenderingContext2D,
    );
    const port = fakePort();
    const game = crew('monster', true, port);
    expect(game.ui.station).toBe('monster');
    expect(document.querySelector('.haunt')?.getAttribute('data-station')).toBe('monster');
    const view = document.querySelector<HTMLElement>('.haunt__body .monster');
    expect(view).not.toBeNull();
    expect(view?.dataset['control']).toBe('player');
    // Beim Hinsetzen wird das Steuer genommen und einmal gelesen.
    expect(port.calls[0]).toBe('claim');
    expect(port.calls).toContain('input');
    // Kein Bild der Welt: Die Station ist eine Karte, kein Kamerabild.
    expect(game.ui.viewport()).toBeNull();
    // Ein Schalter irgendwo schreibt die Seite neu — dieselbe Ansicht bleibt,
    // und das Steuer wird nicht noch einmal genommen.
    game.state.lit.push('r1');
    game.ui.refresh();
    expect(document.querySelector('.haunt__body .monster')).toBe(view);
    expect(port.calls.filter((call) => call === 'claim')).toHaveLength(1);
    // Der Takt der Welt: Die Ansicht liest den Stock erneut und zeichnet.
    const reads = port.calls.filter((call) => call === 'input').length;
    jest.spyOn(performance, 'now').mockReturnValue(performance.now() + 1000);
    game.ui.refresh();
    expect(port.calls.filter((call) => call === 'input').length).toBeGreaterThan(reads);
    // Der Knopf geht an den Port — zuschlagen ist keiner mehr (`monsterHelm.ts`).
    view?.querySelector<HTMLButtonElement>('.monster__key--act')?.click();
    expect(port.calls).toContain('interact');
    // Zurück in die Übersicht: Das Steuer wird freigegeben.
    button('[aria-label="Rolle wechseln"]').click();
    expect(game.ui.station).toBeNull();
    expect(port.calls.at(-1)).toBe('release');
    expect(document.querySelector('.monster')).toBeNull();
  });

  it('zeigt ohne Karte eine Erklärung statt einer Ansicht', () => {
    const game = crew('monster');
    (game.ui as unknown as { host: { snapshot?: unknown } }).host.snapshot = undefined;
    game.state.lit.push('r1');
    game.ui.refresh();
    expect(document.querySelector('.haunt__body')?.textContent).toContain('Keine Karte');
  });
});

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
    // Seit `rules/cargo.ts` steht auf dem Blatt die Kiste und nicht das Möbel:
    // Bei zwei bis drei Kisten je Raum hilft „bei der Werkbank" niemandem mehr.
    expect(text).toContain(taskCargo(game.spec, task.id).clue);
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

  it('zeigt jedem Mitspieler Sauerstoff, Anzug-Leben und Kabinen und warnt unter einer Minute', () => {
    const game = crew('scout');
    const quest = document.querySelector('.haunt__quest')!;
    // Ohne Rundenregeln: Systeme und Anzug wie bisher, keine Uhr.
    expect(quest.textContent).not.toContain('O₂');
    expect(quest.querySelectorAll('.haunt__pip--suit.is-alive')).toHaveLength(3);
    expect(document.querySelector('[data-round-line]')).toBeNull();

    game.setRound({ oxygen: 581, suit: 2, cabinsDestroyed: ['r3'] });
    game.ui.refresh();
    expect(quest.textContent).toContain('O₂ 9:41');
    expect(quest.textContent).toContain('1 Kabine zerstört');
    expect(quest.querySelectorAll('.haunt__pip--suit.is-alive')).toHaveLength(2);
    expect(quest.querySelectorAll('.haunt__pip--suit')).toHaveLength(3);
    expect(quest.classList.contains('is-low')).toBe(false);
    expect(quest.getAttribute('aria-label')).toContain('Sauerstoff 9 Minuten 41 Sekunden');
    // Die Seite „Radar & Anzug" sagt es noch einmal groß.
    const line = document.querySelector('[data-round-line]');
    expect(line?.textContent).toContain('O₂ 9:41');
    expect(line?.textContent).toContain('1 Kabine zerstört');
    expect(line?.classList.contains('is-low')).toBe(false);

    // Die Uhr springt, ohne dass die Seite neu geschrieben wird: dieselben
    // Elemente, neuer Text — ein Daumen auf einem Schalter bleibt darauf.
    game.setRound({ oxygen: 580, suit: 2, cabinsDestroyed: ['r3'] });
    game.ui.refresh();
    expect(document.querySelector('[data-round-line]')).toBe(line);
    expect(quest.textContent).toContain('O₂ 9:40');
    expect(line?.textContent).toContain('O₂ 9:40');

    game.setRound({ oxygen: 42 });
    game.ui.refresh();
    expect(quest.classList.contains('is-low')).toBe(true);
    expect(quest.textContent).toContain('O₂ 0:42');
    expect(quest.textContent).not.toContain('Kabine');
    expect(quest.getAttribute('aria-label')).toContain('knapp');
    const low = document.querySelector('[data-round-line]');
    expect(low?.classList.contains('is-low')).toBe(true);
    expect(low?.textContent).toContain('Alle Kabinen intakt');
  });

  it('nennt an der Endkarte, woran die Runde geendet hat', () => {
    const game = crew('archive');
    game.state.phase = 'lost';
    game.setRound({ phase: 'lost', oxygen: 0, suit: 2, ending: 'oxygen' });
    game.ui.refresh();
    let box = document.querySelector<HTMLElement>('[role="status"]');
    expect(box?.dataset['ending']).toBe('oxygen');
    expect(box?.textContent).toContain('Sauerstoff');
    expect(box?.textContent).toContain('Runde ist beendet');
    expect(box?.textContent).not.toContain('Anzug');

    game.state.crew.hp = 0;
    game.setRound({ phase: 'lost', oxygen: 300, suit: 0, ending: 'suit' });
    game.ui.refresh();
    box = document.querySelector<HTMLElement>('[role="status"]');
    expect(box?.dataset['ending']).toBe('suit');
    expect(box?.textContent).toContain('Anzug ist zerstört');

    game.state.phase = 'won';
    game.setRound({ phase: 'won', oxygen: 300, suit: 3, ending: 'escaped' });
    game.ui.refresh();
    box = document.querySelector<HTMLElement>('[role="status"]');
    expect(box?.dataset['ending']).toBe('escaped');
    expect(box?.textContent).toContain('Mission erfüllt');
    expect(box?.textContent).toContain('Einsatzzentrale');
    expect(document.querySelector('[data-round-line]')).toBeNull();
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

  it('treats "2D-Welt von oben" as a setting: no round starts until a tile below is chosen', () => {
    const game = crew('archive', false, undefined, false);
    button('[aria-label="Rolle wechseln"]').click();
    const box = document.querySelector<HTMLInputElement>('[data-flat-mode]')!;
    expect(box.checked).toBe(false);
    // Ohne 2D: die alten Kacheln — Bot-Runde und der Techniker am Desktop.
    expect(document.querySelector('[data-technician]')).not.toBeNull();
    expect(document.querySelector('[data-mission]')).toBeNull();
    box.click();
    expect(game.flatWanted).toBe(true);
    expect(game.botRound).not.toHaveBeenCalled();
    expect(game.mission).not.toHaveBeenCalled();
    expect(game.test).not.toHaveBeenCalled();
    // Mit 2D: Bot-Runde, Mission und Test als drei Kacheln; der
    // Desktop-Techniker gehört zur 3D-Welt und ist weg.
    expect(document.querySelector<HTMLInputElement>('[data-flat-mode]')!.checked).toBe(true);
    expect(document.querySelector('[data-technician]')).toBeNull();
    button('[data-mission]').click();
    expect(game.mission).toHaveBeenCalledTimes(1);
    button('[data-test]').click();
    expect(game.test).toHaveBeenCalledTimes(1);
    button('[data-bot-round]').click();
    expect(game.botRound).toHaveBeenCalledTimes(1);
  });

  it('keeps the 2D bot round available while a technician plays in the ship', () => {
    const game = crew('archive', true, undefined, true);
    button('[aria-label="Rolle wechseln"]').click();
    const bot = button('[data-bot-round]');
    expect(bot.disabled).toBe(false);
    bot.click();
    expect(game.botRound).toHaveBeenCalledTimes(1);
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
