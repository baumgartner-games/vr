/** @jest-environment jsdom */
import { StationUi, type StationHost } from './stationUi';
import { FlatRound } from './map/flatRound';
import { freshCrew } from './mission';
import type { HauntState } from './net';
import { freshGhosts } from './rules/ghosts';
import { listRoles, roles } from './registry/roles';
import type { StationId } from './stations';
import type { MapRound } from './map/mapSnapshot';
import type { MonsterPort } from './monster/monsterDriver';

jest.mock('./haunting.css', () => ({}));
jest.mock('./stationDashboard.css', () => ({}));
jest.mock('./monster/monster.css', () => ({}));
jest.mock('./views/views.css', () => ({}));

const views: StationUi[] = [];
let size = { width: 360, height: 430 };

beforeEach(() => {
  size = { width: 360, height: 430 };
  Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { value: () => {}, configurable: true },
    hasPointerCapture: { value: () => false, configurable: true },
    releasePointerCapture: { value: () => {}, configurable: true },
  });
  // Die Rollen zeichnen echte Karten: Ein Kontext, der alles annimmt, reicht.
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      new Proxy({} as Record<string, unknown>, {
        get: (target, key: string) =>
          key in target ? target[key] : () => ({ addColorStop() {}, width: 10 }),
        set: (target, key: string, value) => {
          target[key] = value;
          return true;
        },
      }) as unknown as CanvasRenderingContext2D,
  );
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
  mapless = false,
) {
  const round = new FlatRound(947, { test: true });
  let flatWanted = flat ?? false;
  const mission = jest.fn();
  const test = jest.fn();
  const state: HauntState = {
    seed: round.house.seed,
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
  let roundState: MapRound | null = null;
  const door = jest.fn(() => 'Schott gesperrt.');
  const light = jest.fn(() => 'Licht an.');
  const lure = jest.fn(() => 'Schallköder an.');
  const menu = jest.fn();
  const botRound = jest.fn();
  const restart = jest.fn();
  const host: StationHost = {
    spec: () => round.house,
    state: () => state,
    claims: () => (seat ? [{ id: 'me', station: seat, seniority: 10 }] : []),
    me: () => 'me',
    nameOf: () => 'Mein Gerät',
    link: () => ({ peers: 2, vr: remoteTechnician, room: 'test-crew' }),
    technician() {},
    menu,
    botRound,
    restart,
    round: () => roundState,
    ...(mapless ? {} : { snapshot: () => round.snapshot() }),
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
    door,
    light,
    lure,
  };
  const ui = new StationUi(host);
  views.push(ui);
  ui.refresh();
  button(`[data-sit="${station}"]`).click();
  return {
    ui,
    round,
    state,
    door,
    light,
    lure,
    menu,
    botRound,
    mission,
    test,
    restart,
    get flatWanted() {
      return flatWanted;
    },
    setRound(value: Partial<MapRound> | null) {
      roundState = value
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
    status: () => ({
      ride: 'out' as const,
      progress: 1,
      prompt: 'Kabine aufreißen',
      label: 'Stalker',
    }),
  };
  return port;
}

describe('Die Einsatzzentrale baut ihre Rollen aus der Registry', () => {
  /**
   * Die Kacheln der Übersicht kommen aus `listRoles()` und nicht aus einer
   * Liste in dieser Datei: Wer eine `*.register.ts` anlegt, steht damit auch
   * in der Übersicht — und wer die Drohne streicht, streicht sie überall.
   */
  it('zeigt je Rolle eine Kachel mit Namen, Zeile und dem, was sie nicht sieht', () => {
    crew('archive');
    button('[aria-label="Rolle wechseln"]').click();
    const ids = [...document.querySelectorAll<HTMLElement>('[data-sit]')].map(
      (tile) => tile.dataset['sit'],
    );
    expect(ids).toEqual(listRoles().map((role) => role.id));
    expect(ids).toContain('hack');
    expect(ids).not.toContain('drone');
    for (const role of listRoles()) {
      const tile = button(`[data-sit="${role.id}"]`);
      expect(tile.textContent).toContain(role.label);
      expect(tile.textContent).toContain(role.sees);
    }
  });

  it.each(['archive', 'hack', 'scout'] as const)(
    'hängt die Rollenansicht %s als Karte in die Seite',
    (id) => {
      const game = crew(id);
      expect(game.ui.station).toBe(id);
      expect(document.querySelector(`.haunt__body .role--${roleClass(id)}`)).not.toBeNull();
      // Eine Karte braucht kein Bild der Welt: Der Ausschnitt bleibt leer.
      expect(game.ui.viewport()).toBeNull();
      expect(document.querySelector('.haunt')?.classList.contains('is-view')).toBe(true);
    },
  );

  /**
   * Der Fernseher ist die Ausnahme: Sein Bild ist die 3D-Welt, und er meldet
   * dafür ein Rechteck — genau das, was `HauntingWorld.render` braucht.
   */
  it('gibt dem Zuschauer ein Loch für die Welt', () => {
    const game = crew('watch');
    expect(document.querySelector('.role--watch')).not.toBeNull();
    expect(game.ui.viewport()).toEqual({ x: 0, y: 0, w: size.width, h: size.height });
    expect(document.querySelector('.haunt')?.classList.contains('is-view')).toBe(false);
  });

  /**
   * Die Ansicht überlebt ein Neuschreiben der Seite (Stock in der Hand) und
   * gibt das Steuer erst frei, wenn man die Station verlässt.
   */
  it('hält die Monster-Ansicht über Neuschriften und gibt sie beim Verlassen frei', () => {
    const port = fakePort();
    const game = crew('monster', true, port);
    const view = document.querySelector<HTMLElement>('.haunt__body .monster');
    expect(view).not.toBeNull();
    expect(view?.dataset['control']).toBe('player');
    expect(port.calls[0]).toBe('claim');
    expect(port.calls).toContain('input');

    game.state.lit.push('r1');
    game.ui.refresh();
    expect(document.querySelector('.haunt__body .monster')).toBe(view);
    expect(port.calls.filter((call) => call === 'claim')).toHaveLength(1);

    const reads = port.calls.filter((call) => call === 'input').length;
    jest.spyOn(performance, 'now').mockReturnValue(performance.now() + 1000);
    game.ui.refresh();
    expect(port.calls.filter((call) => call === 'input').length).toBeGreaterThan(reads);

    view?.querySelector<HTMLButtonElement>('.monster__key--act')?.click();
    expect(port.calls).toContain('interact');

    button('[aria-label="Rolle wechseln"]').click();
    expect(game.ui.station).toBeNull();
    expect(port.calls.at(-1)).toBe('release');
    expect(document.querySelector('.monster')).toBeNull();
  });

  it('zeigt ohne Karte eine Erklärung statt einer Ansicht', () => {
    crew('scout', true, undefined, undefined, true);
    expect(document.querySelector('.role--scout')).toBeNull();
    expect(document.querySelector('.haunt__body')?.textContent).toContain('Keine Karte');
  });
});

describe('Der Rahmen der Einsatzzentrale', () => {
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
    expect(quest.textContent).not.toContain('O₂');
    expect(quest.querySelectorAll('.haunt__pip--suit.is-alive')).toHaveLength(3);

    game.setRound({ oxygen: 581, suit: 2, cabinsDestroyed: ['r3'] });
    game.ui.refresh();
    expect(quest.textContent).toContain('O₂ 9:41');
    expect(quest.textContent).toContain('1 Kabine zerstört');
    expect(quest.querySelectorAll('.haunt__pip--suit.is-alive')).toHaveLength(2);
    expect(quest.classList.contains('is-low')).toBe(false);
    expect(quest.getAttribute('aria-label')).toContain('Sauerstoff 9 Minuten 41 Sekunden');

    // Die Uhr springt, ohne dass die Seite neu geschrieben wird: dieselben
    // Elemente, neuer Text — ein Daumen auf einer Karte bleibt darauf.
    const clock = quest.querySelector('[data-oxygen]');
    game.setRound({ oxygen: 580, suit: 2, cabinsDestroyed: ['r3'] });
    game.ui.refresh();
    expect(quest.querySelector('[data-oxygen]')).toBe(clock);
    expect(quest.textContent).toContain('O₂ 9:40');

    game.setRound({ oxygen: 42 });
    game.ui.refresh();
    expect(quest.classList.contains('is-low')).toBe(true);
    expect(quest.textContent).toContain('O₂ 0:42');
    expect(quest.getAttribute('aria-label')).toContain('knapp');
  });

  it('nennt an der Endkarte, woran die Runde geendet hat', () => {
    const game = crew('archive');
    game.state.phase = 'lost';
    game.setRound({ phase: 'lost', oxygen: 0, suit: 2, ending: 'oxygen' });
    game.ui.refresh();
    let box = document.querySelector<HTMLElement>('[role="status"]');
    expect(box?.dataset['ending']).toBe('oxygen');
    expect(box?.textContent).toContain('Sauerstoff');

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
    expect(document.querySelector('[data-technician]')).not.toBeNull();
    expect(document.querySelector('[data-mission]')).toBeNull();
    box.click();
    expect(game.flatWanted).toBe(true);
    expect(game.botRound).not.toHaveBeenCalled();
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
});

/** Welche CSS-Klasse eine Rolle an ihr Element hängt. */
function roleClass(id: string): string {
  return roles.get(id)!.id === 'hack' ? 'panel' : id;
}
