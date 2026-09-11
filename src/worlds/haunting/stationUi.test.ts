/** @jest-environment jsdom */
import { StationUi, type StationHost } from './stationUi';
import { homeView } from './archiveView';
import { generateHouse, roomOf } from './house';
import { freshCrew, lockerCode, repairsFor } from './mission';
import { cargoOf, taskCargo } from './rules/cargo';
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
  const notify = jest.fn();
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
    restart,
    round: () => round,
    snapshot: () => ({ ...emptySnapshot(), seed: spec.seed }),
    monsterPort: () => monster ?? null,
    notify: (text: string) => notify(text),
    vr: () => remoteTechnician,
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
        }),
    seat: () => seat,
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
  // **Die Reiter oben sind die Rollenwahl**: Die drei Fähigkeiten der Zentrale
  // heißen `data-power`, die übrigen Geräte weiterhin `data-sit`.
  open(station);
  return {
    ui,
    state,
    flip,
    menu,
    notify,
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

/**
 * Einen Reiter oben antippen — die Fähigkeiten der Zentrale über `data-power`,
 * Drohne, Fernseher und Monster über `data-sit`. Die Station `scout` hat zwei
 * Fähigkeiten (Radar und Schalttafel); gemeint ist hier das Radar.
 */
function open(station: StationId): void {
  const powers: Partial<Record<StationId, string>> = { archive: 'archive', scout: 'scout' };
  const power = powers[station];
  button(power ? `[data-power="${power}"]` : `[data-sit="${station}"]`).click();
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
    // Zurück in den Aufbau: Das Steuer wird freigegeben.
    button('[data-tab="setup"]').click();
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
      // Die Rollenwahl steht ganz oben und ist immer da — kein Umweg über
      // eine eingeklappte Liste mehr. Menü, Verbindung und VR daneben, klein.
      expect(button('[data-tab="setup"]').textContent).toBe('Aufbau');
      expect(button('[aria-label="Spielmenü öffnen"]')).not.toBeNull();
      expect(button('[aria-label="Verbindung der Seite öffnen"]')).not.toBeNull();
      // Wer die Akte hält und sich die Schalttafel dazunimmt, sitzt im
      // „Leitstand" (`roundSetup.roleName`) — das Gerät dahinter ist die
      // Einsatzkontrolle.
      button('[data-power="panel"]').click();
      expect(game.ui.station).toBe('scout');
      expect(game.ui.roleLabel).toBe('Leitstand');
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

  it('nennt auf dem Auftrag den Fundort mit Kennzeichen und markiert die richtige Kiste im Raum', () => {
    const game = crew();
    const task = game.spec.tasks[0]!;
    const slot = taskCargo(game.spec, task.id);
    button('[data-archive-tab="orders"]').click();
    const orders = document.querySelector('.haunt__tasks')?.textContent ?? '';
    expect(orders).toContain(`Fundort: ${roomOf(game.spec, task.roomId)!.name} · ${slot.clue}`);

    // Und im Raumblatt stehen alle Kisten des Raums — die richtige markiert,
    // der Inhalt der anderen nicht.
    button('[data-archive-tab="rooms"]').click();
    const select = document.querySelector<HTMLSelectElement>('select[data-room-select]')!;
    select.value = task.roomId;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const sheet = document.querySelector('.haunt__sheet')?.textContent ?? '';
    const inRoom = cargoOf(game.spec).filter((one) => one.roomId === task.roomId);
    expect(inRoom.length).toBeGreaterThan(1);
    for (const one of inRoom) expect(sheet).toContain(one.clue);
    expect(sheet).toContain(`${slot.clue} · hier liegt das Ersatzteil`);
    for (const one of inRoom)
      if (one.id !== slot.id && one.loot.kind === 'tool')
        expect(sheet).not.toContain(one.loot.tool);
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

  it('startet aus dem Aufbau und bietet nach einer verlorenen Runde den Neustart an', () => {
    const game = crew('archive', false, undefined, true);
    button('[data-tab="setup"]').click();
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
   * **Der Aufbau ist zwei Häkchen, eine Verteilung und ein Knopf.** Die drei
   * Kacheln (Spielen · Zuschauen · Trainieren), das Segment 2D|3D, „Bot-Runde
   * ansehen" und die Hilfe „Eure Dreiercrew" hat der Besitzer weghaben wollen
   * — und keines der Häkchen startet etwas.
   */
  it('zeigt zwei Häkchen statt Kacheln und startet erst mit dem einen Knopf', () => {
    const game = crew('archive', false, undefined, true);
    button('[data-tab="setup"]').click();
    const checks = [...document.querySelectorAll<HTMLElement>('[data-check]')];
    expect(checks.map((k) => k.dataset['check'])).toEqual(['view', 'test']);
    expect(checks[0]!.textContent).toContain('2D-Welt von oben');
    expect(checks[1]!.textContent).toContain('Testen');
    // Was weg ist, bleibt weg: Kacheln, Segment, alte Startknöpfe, Crew-Hilfe.
    for (const gone of [
      '[data-intent]',
      '[data-view]',
      '[data-flat-mode]',
      '[data-mission]',
      '[data-test]',
      '[data-bot-round]',
    ])
      expect(document.querySelector(gone)).toBeNull();
    expect(document.querySelector('.haunt__body')?.textContent).not.toContain('Dreiercrew');

    // **Keine Uhr und kein Anzug im Aufbau**: Der Auftragsstreifen gehört zur
    // Runde, und im Menü läuft noch keine.
    const quest = document.querySelector<HTMLElement>('.haunt__quest')!;
    expect(quest.hidden).toBe(true);
    button('[data-power="archive"]').click();
    expect(quest.hidden).toBe(false);
    button('[data-tab="setup"]').click();
    expect(quest.hidden).toBe(true);

    // Das Häkchen „2D-Welt" ist die Ansicht und sonst nichts.
    expect(checks[0]!.getAttribute('aria-pressed')).toBe('true');
    button('[data-check="view"]').click();
    expect(game.lobby.view).toBe('3d');
    // Und „Testen" ist die Absicht: kein Monster, gestartet wird trotzdem erst unten.
    button('[data-check="test"]').click();
    expect(game.setup.monster).toBe('off');
    expect(game.startSetup).not.toHaveBeenCalled();
    expect(button('[data-check="test"]').getAttribute('aria-pressed')).toBe('true');
    button('[data-check="test"]').click();
    expect(game.setup.monster).toBe('bot');
    button('[data-start-setup]').click();
    expect(game.startSetup).toHaveBeenCalledTimes(1);
  });

  /** Was auf dem Startknopf steht, kommt aus der Verteilung — ohne Ansicht dahinter. */
  it('beschriftet den einen Startknopf ohne Ansicht in Klammern', () => {
    const game = crew('archive', false, undefined, true);
    button('[data-tab="setup"]').click();
    const label = () => button('[data-start-setup]').querySelector('strong')!.textContent;
    expect(label()).toBe('Mission starten');
    button('[data-check="view"]').click();
    expect(game.lobby.view).toBe('3d');
    expect(label()).toBe('Mission starten');
    button('[data-check="test"]').click();
    expect(label()).toBe('Test starten');
  });

  /**
   * **Alle drei Fähigkeiten stehen immer da**, jede mit Bot / Mensch / Aus —
   * „+ Platz" und die Liste, die wachsen konnte, sind weg. Und wer als Mensch
   * mehrere hält, bekommt den Namen der Mischung zu lesen.
   */
  it('zeigt alle Fähigkeiten mit Bot/Mensch/Aus und nennt die Mischung beim Namen', () => {
    const game = crew('archive', false, undefined, true);
    button('[data-tab="setup"]').click();
    expect(document.querySelector('[data-setup-add]')).toBeNull();
    expect(
      [...document.querySelectorAll<HTMLElement>('[data-setup-ability]')].map(
        (k) => k.dataset['setupAbility'],
      ),
    ).toEqual(['scout', 'panel', 'archive']);
    const key = () => button('[data-setup-ability="scout"]');
    expect(key().textContent).toBe('Bot');
    key().click();
    expect(game.setup.abilities.scout).toBe('human');
    expect(key().textContent).toBe('Mensch');
    key().click();
    expect(game.setup.abilities.scout).toBe('off');
    expect(key().textContent).toBe('Aus');
    key().click();
    expect(game.setup.abilities.scout).toBe('bot');

    // Zwei Fähigkeiten bei einem Menschen heißen „Einsatzkontrolle" — das
    // Archiv hält in diesem Fenster niemand mehr (Mensch → Aus).
    button('[data-setup-ability="archive"]').click();
    button('[data-setup-ability="scout"]').click();
    button('[data-setup-ability="panel"]').click();
    expect(document.querySelector('.setup')?.textContent).toContain(
      'Mensch in der Zentrale: Einsatzkontrolle',
    );
  });

  /** Steht eine Brille im Raum, gehört ihr der Techniker — und niemand klickt ihn weg. */
  it('schreibt „VR" in die Zeile des Technikers und lässt sie nicht drücken', () => {
    const game = crew('archive', true, undefined, true);
    button('[data-tab="setup"]').click();
    const key = button('[data-setup-technician]');
    expect(key.textContent).toBe('VR');
    expect(key.disabled).toBe(true);
    key.click();
    expect(game.setup.technician).toBe('human');
    // Ohne Brille ist dieselbe Zeile ein Knopf — siehe „zeigt alle
    // Fähigkeiten …", wo sie „Mensch" heißt und sich drücken lässt.
  });

  /**
   * **„Ich" gibt es genau einmal, und es setzt einen wirklich hin.** Vorher
   * führte der Van zwei Listen über dieselben Plätze: Wer sich ans Archiv
   * setzte, blieb in der Verteilung ein Bot.
   */
  it('setzt „Ich" auf genau einen Platz und dieses Gerät an dessen Station', () => {
    const game = crew('archive', false, undefined, true);
    button('[data-tab="setup"]').click();
    const me = (slot: string) => button(`[data-setup-me="${slot}"]`);
    expect(me('technician').getAttribute('aria-pressed')).toBe('false');

    me('power:archive').click();
    expect(game.setup.abilities.archive).toBe('human');
    expect(game.seat).toBe('archive');
    expect(document.querySelectorAll('[data-setup-me][aria-pressed="true"]')).toHaveLength(1);

    // Umsetzen nimmt „Ich" am alten Platz weg — und gibt ihn den Zahlen zurück.
    me('monster').click();
    expect(game.setup.abilities.archive).toBe('bot');
    expect(game.setup.monster).toBe('human');
    expect(game.seat).toBe('monster');
    expect(document.querySelectorAll('[data-setup-me][aria-pressed="true"]')).toHaveLength(1);
    expect(me('monster').getAttribute('aria-pressed')).toBe('true');
  });

  /**
   * **Die Reiter sind die Rollenwahl** — und eine Fähigkeit, die man nimmt,
   * steht danach in der Verteilung bei einem Menschen. Wer mehrere nimmt,
   * behält sie: Das ist die Mischung, um die es dem Besitzer ging.
   */
  it('nimmt über die Reiter Fähigkeiten und mischt sie', () => {
    const game = crew('archive', false, undefined, true);
    expect(game.ui.roleLabel).toBe('Archiv');
    expect(game.setup.abilities.archive).toBe('human');
    button('[data-power="scout"]').click();
    expect(game.ui.roleLabel).toBe('Aufklärung');
    expect(game.setup.abilities.scout).toBe('human');
    expect(game.ui.station).toBe('scout');
    // Der Reiter des Archivs leuchtet weiter als „meiner", auch wenn das
    // Radar offen ist.
    expect(button('[data-power="archive"]').className).toContain('is-mine');
    // Ein Gerät, das keine Fähigkeit ist, legt die Zentrale ab.
    button('[data-sit="watch"]').click();
    expect(game.ui.roleLabel).toBe('');
    expect(game.ui.station).toBe('watch');
  });

  /**
   * **Ohne Rolle steht ein Satz da**, und er sagt, wo man sie herbekommt.
   * Mitten in einer Nicht-Test-Runde darf sie außerdem nicht jeder wechseln —
   * wer das Monster spielt, bleibt das Monster (`roundSetup.switchRights`).
   */
  it('schickt ohne Rolle zu den Reitern und lässt das Monster nicht ins Archiv', () => {
    const game = crew('monster', false, undefined, true);
    button('[data-tab="setup"]').click();
    expect(document.querySelector('.haunt__body')?.textContent).toContain(
      'Bitte wähle über den Tab oben deine Rolle aus.',
    );
    // Eine Mission läuft: Das Monster sitzt nicht in der Zentrale.
    button('[data-power="archive"]').click();
    expect(game.notify).toHaveBeenCalledWith(
      'Mitten in der Runde wechselt nur die Rolle, wer in der Einsatzzentrale sitzt.',
    );
    expect(game.ui.roleLabel).toBe('');
    // In einer Test-Runde darf jeder jede Rolle nehmen.
    game.state.crew.options.test = true;
    game.ui.refresh();
    button('[data-power="archive"]').click();
    expect(game.ui.roleLabel).toBe('Archiv');
  });

  it('sperrt den Start im Schiff, solange ein anderer Techniker spielt — in 2D nicht', () => {
    const game = crew('archive', true, undefined, false);
    button('[data-tab="setup"]').click();
    const start = () => button('[data-start-setup]');
    expect(start().disabled).toBe(true);
    expect(start().textContent).toContain('Ein Techniker spielt bereits');
    start().click();
    expect(game.startSetup).not.toHaveBeenCalled();
    // **Eine 2D-Runde ist lokal** und stört keinen Techniker im Schiff.
    button('[data-check="view"]').click();
    expect(start().disabled).toBe(false);
    start().click();
    expect(game.startSetup).toHaveBeenCalledTimes(1);
  });

  /**
   * Radar und Schalttafel sind zwei **Fähigkeiten** und keine zwei Blätter:
   * Sie hängen an den Reitern oben, nicht mehr an einer zweiten Reiterzeile
   * darunter. Wer beide hält, wechselt zwischen ihnen wie zwischen Rollen.
   */
  it('trennt Radar und Schalttafel über die Reiter und sendet Schalter genau einmal', () => {
    const { ui, flip, state } = crew('scout');
    expect(document.querySelector('.haunt__scout')).not.toBeNull();
    expect(document.querySelector('[data-flip]')).toBeNull();
    expect(document.querySelector('[data-control-tab]')).toBeNull();
    button('[data-power="panel"]').click();
    expect(document.querySelector('.haunt__scout')).toBeNull();
    const key = button('[data-flip]');
    key.click();
    expect(flip).toHaveBeenCalledTimes(1);
    expect(flip).toHaveBeenCalledWith(key.dataset['flip'], key.dataset['on'] !== '1');
    state.crew.hp = 2;
    ui.refresh();
    expect(button('[data-power="panel"]').getAttribute('aria-pressed')).toBe('true');
    button('[data-power="scout"]').click();
    expect(document.querySelector('.haunt__ecg')?.getAttribute('aria-label')).toContain(
      'Simulierter Puls',
    );
    expect(ui.viewport()).toBeNull();
  });
});
