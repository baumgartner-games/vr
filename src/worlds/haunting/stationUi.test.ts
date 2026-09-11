/** @jest-environment jsdom */
import { StationUi, type StationHost } from './stationUi';
import { homeView } from './archiveView';
import { generateHouse, roomOf } from './house';
import { freshCrew, lockerCode, repairsFor } from './mission';
import { cargoOf, taskCargo } from './rules/cargo';
import { DROPPED_SEEN } from './rules/archiveGoals';
import { TILE } from '../nav/navTile';
import type { HauntState } from './net';
import { freshGhosts } from './rules/ghosts';
import type { StationId } from './stations';
import { emptySnapshot, type MapRound } from './map/mapSnapshot';
import type { MonsterPort } from './monster/monsterDriver';
import type { LobbyChoice } from './rules/lobby';
import { defaultSetup, type RoundSetup } from './rules/roundSetup';

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
  // Die Lobby gibt es nur, wenn die Welt sie anbietet (`flat` gesetzt);
  // `undefined` ist der Van ohne sie, wie in den alten Tests. `flat` sagt,
  // womit die Ansicht anfängt: `true` heißt „2D von oben".
  let lobby: LobbyChoice = { intent: 'play', view: flat ? '2d' : '3d' };
  let setup = defaultSetup();
  const mission = jest.fn();
  const test = jest.fn();
  const startSetup = jest.fn();
  const technician = jest.fn();
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
    technician,
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
          flatWanted: () => lobby.view === '2d',
          lobby: () => lobby,
          setLobby(choice: LobbyChoice) {
            lobby = choice;
            ui.refresh();
          },
          setup: () => setup,
          setSetup(next: RoundSetup) {
            setup = next;
            ui.refresh();
          },
          startSetup,
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
    startSetup,
    technician,
    archiveHome,
    archiveZoom,
    archivePan,
    get lobby() {
      return lobby;
    },
    /** An welchem Gerät dieses Telefon wirklich sitzt (`StationHost.sit`). */
    get seat() {
      return seat;
    },
    get setup() {
      return setup;
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
    expect(game.seat).toBe('monster');
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

  it('schlägt auf Zuruf die Raumakte auf — ganzseitig, ohne Karte dahinter', () => {
    const game = crew();
    const repair = repairsFor(game.spec).find((one) => one.puzzle === 'sequence')!;
    const select = document.querySelector<HTMLSelectElement>('select[data-room-select]')!;
    expect(select.options).toHaveLength(game.spec.rooms.length);
    expect(select.closest('label')?.textContent).toContain(
      'Welchen Raum beschreibt der Techniker?',
    );
    // Auf der Karte gibt es ein Bild; in der Akte nicht mehr — genau das war
    // der Befund: Unter dem Vollbild ließ sich die Akte nicht rollen.
    expect(game.ui.viewport()).not.toBeNull();
    select.value = repair.roomId;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(game.ui.selected).toBe(repair.roomId);
    expect(game.ui.viewport()).toBeNull();
    expect(document.querySelector('select[data-room-select]')).toBeNull();
    const text = document.querySelector('.haunt__sheet')?.textContent;
    expect(text).toContain(lockerCode(game.spec.seed, repair.roomId));
    expect(game.archiveHome).toHaveBeenCalledTimes(2);
    // Und zurück auf die Karte.
    button('[data-archive-back]').click();
    expect(game.ui.viewport()).not.toBeNull();
    expect(document.querySelector('select[data-room-select]')).not.toBeNull();
  });

  it('nennt im Auftrag die Kiste sofort und die Konsole erst mit dem Teil in der Hand', () => {
    const game = crew();
    const repair = repairsFor(game.spec).find((one) => one.puzzle === 'sequence')!;
    const task = game.spec.tasks.find((one) => one.id === repair.itemId)!;
    const slot = taskCargo(game.spec, task.id);
    button('[data-archive-tab="orders"]').click();
    expect(game.ui.viewport()).toBeNull();
    const before = document.querySelector('.haunt__tasks')?.textContent ?? '';
    // Was zu holen ist, steht von Anfang an da …
    expect(before).toContain(`Fundort: ${roomOf(game.spec, task.roomId)!.name} · ${slot.clue}`);
    // … wohin damit, nicht: kein Reparaturraum, kein Code, kein Knopf dorthin.
    expect(before).not.toContain(repair.code);
    expect(before).toContain('Ziel und Code erst');
    expect(document.querySelector(`[data-dossier-room="${repair.roomId}"]`)).toBeNull();

    // Sobald der Techniker das Teil trägt, ist das Ziel die Auskunft des
    // Archivars — und erst dann steht es auf seinem Blatt.
    game.state.taken.push(repair.itemId);
    game.state.crew.inventory.push(repair.itemId);
    game.ui.refresh();
    const after = document.querySelector('.haunt__tasks')?.textContent ?? '';
    expect(after).toContain(`Ziel: ${roomOf(game.spec, repair.roomId)!.name}`);
    expect(after).toContain(repair.code);
    // Der Knopf führt in die Akte des Reparaturraums — ganzseitig, ohne Karte.
    button(`[data-dossier-room="${repair.roomId}"]`).click();
    expect(game.ui.selected).toBe(repair.roomId);
    expect(game.ui.viewport()).toBeNull();
    expect(document.querySelector('.haunt__sheet')?.textContent).toContain(repair.code);
    button('[data-archive-back]').click();
    expect(button('[data-archive-tab="rooms"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('zeigt in der Raumakte alle Kisten, die richtige markiert, und die Konsole erst später', () => {
    const game = crew();
    const task = game.spec.tasks[0]!;
    const repair = repairsFor(game.spec).find((one) => one.itemId === task.id)!;
    const slot = taskCargo(game.spec, task.id);
    button('[data-archive-tab="orders"]').click();
    const orders = document.querySelector('.haunt__tasks')?.textContent ?? '';
    expect(orders).toContain(`Fundort: ${roomOf(game.spec, task.roomId)!.name} · ${slot.clue}`);

    button('[data-archive-tab="rooms"]').click();
    // Auf der Karte steht schon, was gesammelt werden muss.
    expect(document.querySelector('.haunt__sheet')?.textContent).toContain(task.label);
    button(`[data-room="${task.roomId}"]`).click();
    const sheet = document.querySelector('.haunt__sheet')?.textContent ?? '';
    const inRoom = cargoOf(game.spec).filter((one) => one.roomId === task.roomId);
    expect(inRoom.length).toBeGreaterThan(1);
    for (const one of inRoom) expect(sheet).toContain(one.clue);
    expect(sheet).toContain(`${slot.clue} · hier liegt ${task.label}`);
    for (const one of inRoom)
      if (one.id !== slot.id && one.loot.kind === 'tool')
        expect(sheet).not.toContain(one.loot.tool);
    // Der Reparaturraum dieses Auftrags verrät seinen Code noch nicht.
    button('[data-archive-back]').click();
    button(`[data-room="${repair.roomId}"]`).click();
    expect(document.querySelector('.haunt__sheet')?.textContent).not.toContain(repair.code);
  });

  it('zeigt ein abgelegtes Teil erst, wenn es lange genug liegt', () => {
    const game = crew();
    const task = game.spec.tasks[0]!;
    const room = game.spec.rooms.find((one) => one.id !== task.roomId)!;
    game.state.time = 100;
    game.state.taken.push(task.id);
    game.state.dropped = [
      {
        id: task.id,
        x: (room.rect.x + 0.5) * TILE,
        z: (room.rect.z + 0.5) * TILE,
        since: 100 - (DROPPED_SEEN - 1),
      },
    ];
    button('[data-archive-tab="orders"]').click();
    expect(document.querySelector('.haunt__tasks')?.textContent).not.toContain('Liegt in');
    game.state.time = 100 + DROPPED_SEEN;
    game.ui.refresh();
    expect(document.querySelector('.haunt__tasks')?.textContent).toContain(`Liegt in ${room.name}`);
    // Und in der Akte des Raums, in dem es liegt.
    button('[data-archive-tab="rooms"]').click();
    button(`[data-room="${room.id}"]`).click();
    expect(document.querySelector('.haunt__sheet')?.textContent).toContain('Liegt hier');
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

  it('startet aus der Lobby und bietet nach einer verlorenen Runde den Neustart an', () => {
    const game = crew('archive', false, undefined, true);
    button('[aria-label="Rolle wechseln"]').click();
    button('[data-intent="watch"]').click();
    button('[data-start-setup]').click();
    expect(game.startSetup).toHaveBeenCalledTimes(1);
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

  /**
   * **Die Lobby stellt die Runde ein, sie startet sie nicht.** Genau das war
   * der Befund: „Bot-Runde ansehen" stand als Kachel über der Verteilung,
   * obwohl es nur eine Voreinstellung davon war, und die Checkbox „2D-Welt
   * von oben" deutete die Kacheln darunter um.
   */
  it('zeigt die drei Absichten als Kacheln und startet erst mit dem einen Knopf', () => {
    const game = crew('archive', false, undefined, true);
    button('[aria-label="Rolle wechseln"]').click();
    expect(
      [...document.querySelectorAll<HTMLElement>('[data-intent]')].map((k) => k.dataset['intent']),
    ).toEqual(['play', 'watch', 'train']);
    // Die alten Kacheln und die Checkbox gibt es nicht mehr.
    for (const gone of ['[data-flat-mode]', '[data-mission]', '[data-test]', '[data-bot-round]'])
      expect(document.querySelector(gone)).toBeNull();

    // Spielen ist der Anfang, und keine Kachel startet etwas.
    expect(button('[data-intent="play"]').getAttribute('aria-pressed')).toBe('true');
    button('[data-intent="train"]').click();
    expect(game.setup.monster).toBe('off');
    expect(game.startSetup).not.toHaveBeenCalled();
    expect(button('[data-intent="train"]').getAttribute('aria-pressed')).toBe('true');
    expect(button('[data-intent="play"]').getAttribute('aria-pressed')).toBe('false');
    button('[data-start-setup]').click();
    expect(game.startSetup).toHaveBeenCalledTimes(1);
  });

  /** Was auf dem Startknopf steht, kommt aus der Verteilung — nicht aus der Kachel. */
  it('beschriftet den einen Startknopf nach Absicht und Ansicht', () => {
    const game = crew('archive', false, undefined, true);
    button('[aria-label="Rolle wechseln"]').click();
    const label = () => button('[data-start-setup]').querySelector('strong')!.textContent;
    expect(label()).toBe('Mission starten (2D)');
    button('[data-view="3d"]').click();
    expect(game.lobby.view).toBe('3d');
    expect(label()).toBe('Mission starten (3D)');
    button('[data-intent="train"]').click();
    expect(label()).toBe('Training starten (3D)');
    // Beim Zuschauen verspricht die Ansicht nichts, also steht sie nicht dabei.
    button('[data-intent="watch"]').click();
    expect(label()).toBe('Zuschauen');
    button('[data-view="2d"]').click();
    expect(label()).toBe('Zuschauen');
  });

  /**
   * **„Ich" gibt es genau einmal, und es setzt einen wirklich hin.** Vorher
   * führte der Van zwei Listen über dieselben Plätze: Wer sich ans Archiv
   * setzte, blieb in der Verteilung ein Bot.
   */
  it('setzt „Ich" auf genau einen Platz und dieses Gerät an dessen Station', () => {
    const game = crew('archive', false, undefined, true);
    button('[aria-label="Rolle wechseln"]').click();
    const me = (slot: string) => button(`[data-setup-me="${slot}"]`);
    expect(me('technician').getAttribute('aria-pressed')).toBe('false');

    me('seat:0').click();
    expect(game.setup.seats[0]!.who).toBe('human');
    expect(game.seat).toBe('archive');
    expect(document.querySelectorAll('[data-setup-me][aria-pressed="true"]')).toHaveLength(1);

    // Umsetzen nimmt „Ich" am alten Platz weg — und gibt ihn den Zahlen zurück.
    me('monster').click();
    expect(game.setup.seats[0]!.who).toBe('bot');
    expect(game.setup.monster).toBe('human');
    expect(game.seat).toBe('monster');
    expect(document.querySelectorAll('[data-setup-me][aria-pressed="true"]')).toHaveLength(1);
    expect(me('monster').getAttribute('aria-pressed')).toBe('true');
  });

  it('holt den Techniker am Desktop nur, wenn die Ansicht im Schiff steht', () => {
    const game = crew('archive', false, undefined, true);
    button('[aria-label="Rolle wechseln"]').click();
    button('[data-setup-me="technician"]').click();
    expect(game.setup.technician).toBe('human');
    // In 2D gibt es keinen Desktop-Techniker: Die Karte ist das Gerät.
    expect(game.technician).not.toHaveBeenCalled();
    button('[data-view="3d"]').click();
    button('[data-setup-me="technician"]').click();
    expect(game.technician).toHaveBeenCalledTimes(1);
  });

  it('sperrt den Start im Schiff, solange ein anderer Techniker spielt — in 2D nicht', () => {
    const game = crew('archive', true, undefined, false);
    button('[aria-label="Rolle wechseln"]').click();
    const start = () => button('[data-start-setup]');
    expect(start().disabled).toBe(true);
    expect(start().textContent).toContain('Ein Techniker spielt bereits');
    start().click();
    expect(game.startSetup).not.toHaveBeenCalled();
    // **Eine 2D-Runde ist lokal** und stört keinen Techniker im Schiff.
    button('[data-view="2d"]').click();
    expect(start().disabled).toBe(false);
    start().click();
    expect(game.startSetup).toHaveBeenCalledTimes(1);
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

/**
 * **Der Zuschauer schlüpft in die Rollen der anderen.** Der Fernseher war das
 * ganze Deck von schräg oben und sonst nichts; gewünscht war, mitten in der
 * Runde umschalten zu können — auf das Blatt des Archivars, das Bild der
 * Drohne, den Späherschirm, die Monsteransicht.
 */
describe('Die Rollenwahl des Zuschauers', () => {
  it('bietet alle Plätze an, wechselt das Bild und bleibt dabei am Fernseher sitzen', () => {
    const { ui } = crew('watch');
    expect(ui.watchLens.seat).toBe('deck');
    expect(ui.shownStation).toBe('watch');
    const seats = [...document.querySelectorAll<HTMLElement>('[data-watch-seat]')].map(
      (key) => key.dataset['watchSeat'],
    );
    expect(seats).toEqual(['deck', 'archive', 'control', 'scout', 'drone', 'monster']);

    button('[data-watch-seat="drone"]').click();
    expect(ui.watchLens.seat).toBe('drone');
    // Das Bild ist das der Drohne — der **Platz** bleibt der Fernseher.
    expect(ui.shownStation).toBe('drone');
    expect(ui.station).toBe('watch');
    expect(ui.viewport()).not.toBeNull();

    // Die Tafel bekommt er als Auskunft und nicht als Schalterwand.
    button('[data-watch-seat="control"]').click();
    expect(document.querySelector('[data-flip]')).toBeNull();
    expect(document.querySelector('.haunt__watch-panel')).not.toBeNull();
    expect(ui.viewport()).toBeNull();

    button('[data-watch-seat="scout"]').click();
    expect(document.querySelector('.haunt__scout')).not.toBeNull();
  });

  it('folgt auf Wunsch dem Techniker oder dem Monster', () => {
    const { ui } = crew('watch');
    expect(ui.watchLens.follow).toBe('free');
    button('[data-watch-follow="monster"]').click();
    expect(ui.watchLens.follow).toBe('monster');
    button('[data-watch-follow="technician"]').click();
    expect(ui.watchLens.follow).toBe('technician');
    // Die Frage „wem folgen?" gehört zum Deck; auf einem fremden Platz führt
    // die Kamera nicht mehr der Zuschauer.
    button('[data-watch-seat="archive"]').click();
    expect(document.querySelector('[data-watch-follow]')).toBeNull();
    expect(ui.watchLens.follow).toBe('technician');
  });

  it('gibt das Overlay „KI-Absichten" nur dem Zuschauer', () => {
    const { ui } = crew('watch');
    expect(ui.watchLens.insight).toBe(false);
    button('[data-watch-insight]').click();
    expect(ui.watchLens.insight).toBe(true);
    expect(button('[data-watch-insight]').getAttribute('aria-pressed')).toBe('true');
  });

  it('zeigt einem Spieler weder Rollenwahl noch Overlay-Schalter', () => {
    crew('scout');
    expect(document.querySelector('[data-watch-seat]')).toBeNull();
    expect(document.querySelector('[data-watch-insight]')).toBeNull();
  });
});
