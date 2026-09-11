/** @jest-environment jsdom */
import { StationUi, type StationHost } from './stationUi';
import { FlatRound } from './map/flatRound';
import { freshCrew, repairsFor } from './mission';
import type { HauntState } from './net';
import { freshGhosts } from './rules/ghosts';
import { listRoles, roles } from './registry/roles';
import { visibleSwitches } from './panel';
import type { StationId } from './stations';
import type { MapRound } from './map/mapSnapshot';
import type { MonsterPort } from './monster/monsterDriver';
import type { LobbyChoice } from './rules/lobby';
import {
  defaultSetup,
  NOT_IN_CENTRE,
  withPower,
  type MyRole,
  type RoundSetup,
} from './rules/roundSetup';

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

/**
 * Eine Einsatzzentrale mit allem, was `HauntingWorld` ihr hereinreicht.
 *
 * `flat` sagt, womit die Ansicht anfängt (`true` heißt „2D von oben");
 * `'none'` ist eine Welt **ohne** Aufbau-Anschluss — es gibt sie (ältere
 * Wirte, Tests), und sie muss wenigstens den Weg an den Stock offenlassen.
 */
function crew(
  me: MyRole | null = 'red',
  remoteTechnician = true,
  monster?: MonsterPort,
  flat: boolean | 'none' = true,
  mapless = false,
) {
  const round = new FlatRound(947, { test: true });
  let lobby: LobbyChoice = {
    intent: 'play',
    view: flat === true ? '2d' : '3d',
    me: 'watch:technician',
  };
  // **Die Tafel dieser Tests**: Rot hält das Archiv, Gelb den Späher, Blau
  // die Schalttafel — je eine Karte je Stuhl, damit ein Reiter eine Ansicht
  // meint. Wer mischen will, schaltet die Lämpchen im Test selbst um.
  let setup = withPower(
    withPower(withPower(defaultSetup(), 'red', 'archive', true), 'yellow', 'scout', true),
    'blue',
    'panel',
    true,
  );
  const state: HauntState = {
    seed: round.house.seed,
    crew: freshCrew(),
    phase: 'running',
    time: 1,
    monsterOn: false,
    monster: null,
    shut: [],
    lit: [],
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
  const menu = jest.fn();
  const notify = jest.fn();
  const restart = jest.fn();
  const startSetup = jest.fn();
  const technician = jest.fn();
  const host: StationHost = {
    spec: () => round.house,
    state: () => state,
    claims: () => (seat ? [{ id: 'me', station: seat, seniority: 10 }] : []),
    me: () => 'me',
    nameOf: () => 'Mein Gerät',
    link: () => ({ peers: 2, vr: remoteTechnician, room: 'test-crew' }),
    technician,
    menu,
    restart,
    vr: () => remoteTechnician,
    round: () => roundState,
    ...(mapless ? {} : { snapshot: () => round.snapshot() }),
    monsterPort: () => monster ?? null,
    notify: (text: string) => notify(text),
    ...(flat === 'none'
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
    door,
    light,
  };
  const ui = new StationUi(host);
  views.push(ui);
  ui.refresh();
  if (me) open(me);
  return {
    ui,
    round,
    state,
    door,
    light,
    menu,
    notify,
    restart,
    startSetup,
    technician,
    get lobby() {
      return lobby;
    },
    get setup() {
      return setup;
    },
    setSetup(next: RoundSetup) {
      host.setSetup?.(next);
    },
    /** An welchem Gerät dieses Telefon wirklich sitzt (`StationHost.sit`). */
    get seat() {
      return seat;
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

/**
 * Einen Reiter oben antippen — die Antwort auf „wer bin ich"
 * (`rules/roundSetup.MY_ROLES`): jeder Reiter trägt `data-me`.
 */
function open(me: MyRole): void {
  button(`[data-me="${me}"]`).click();
}

/**
 * Die Rollenansicht ein Bild weiterdrehen. Sie zeichnet sich selbst und ist
 * dabei auf Telefonrate gedrosselt (`ROLE_TICK`) — ohne Sprung in der Uhr
 * bliebe sie beim Bild von eben stehen.
 */
function tick(ui: StationUi): void {
  jest.spyOn(performance, 'now').mockReturnValue(performance.now() + 1000);
  ui.refresh();
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
   * **Die Reiter sind die Antwort auf „wer bin ich"** (`rules/roundSetup.
   * MY_ROLES`): Aufbau, Techniker, die drei Stühle, das Monster, die zwei
   * Zuschauer — in dieser Reihenfolge, immer alle. Ein Stuhl trägt den Namen
   * seiner Fähigkeiten mit.
   */
  it('reiht Aufbau, Techniker, die drei Stühle, das Monster und die Zuschauer auf', () => {
    crew(null);
    const keys = [...document.querySelectorAll<HTMLElement>('.haunt__roles button')];
    expect(keys.map((key) => key.dataset['tab'] ?? key.dataset['me'])).toEqual([
      'setup',
      'technician',
      'red',
      'yellow',
      'blue',
      'monster',
      'watch:technician',
      'watch:all',
    ]);
    expect(keys.map((key) => key.textContent)).toEqual([
      'Aufbau',
      'Techniker',
      'Rot · Archiv',
      'Gelb · Späher',
      'Blau · Schalttafel',
      'Monster',
      'Zuschauer: Techniker',
      'Zuschauer: Alles',
    ]);
    expect(document.querySelector('.haunt__bar')?.textContent).not.toContain('EINSATZZENTRALE');
    expect(document.body.classList.contains('haunt-on')).toBe(true);
    for (const key of ['[data-game-menu]', '[data-page-net]', '[data-page-vr]'])
      expect(document.querySelector(key)).not.toBeNull();
  });

  it.each([
    ['red', 'red', 'archive'],
    ['blue', 'blue', 'hack'],
    ['yellow', 'yellow', 'scout'],
  ] as const)('hängt auf Stuhl %s die Karte seiner Fähigkeit in die Seite', (me, station, view) => {
    const game = crew(me);
    expect(game.ui.station).toBe(station);
    expect(game.ui.shownView).toBe(view);
    expect(document.querySelector(`.haunt__body .role--${roleClass(view)}`)).not.toBeNull();
    // Eine Karte braucht kein Bild der Welt: Der Ausschnitt bleibt leer.
    expect(game.ui.viewport()).toBeNull();
    expect(document.querySelector('.haunt')?.classList.contains('is-view')).toBe(true);
    // Und die Wahl steht in der Lobby: Das ist „wer bin ich".
    expect(game.lobby.me).toBe(me);
    expect(game.setup.seats[me].who).toBe('human');
  });

  /**
   * Der Fernseher ist die Ausnahme: Sein Bild ist die 3D-Welt, und er meldet
   * dafür ein Rechteck — genau das, was `HauntingWorld.render` braucht. Beide
   * Zuschauer sitzen dort; sie bringen nur je ihre Linse mit.
   */
  it('gibt dem Zuschauer ein Loch für die Welt — und seine Linse', () => {
    const game = crew('watch:all');
    expect(document.querySelector('.role--watch')).not.toBeNull();
    expect(game.ui.viewport()).toEqual({ x: 0, y: 0, w: size.width, h: size.height });
    expect(document.querySelector('.haunt')?.classList.contains('is-view')).toBe(false);
    expect(game.ui.watchLens).toMatchObject({ seat: 'deck', follow: 'free' });
    open('watch:technician');
    expect(game.ui.station).toBe('watch');
    expect(game.ui.watchLens).toMatchObject({ seat: 'deck', follow: 'technician' });
  });

  it('hält die Monster-Ansicht über Neuschriften und gibt sie beim Verlassen frei', () => {
    const port = fakePort();
    const game = crew('monster', true, port);
    const view = document.querySelector<HTMLElement>('.haunt__body .monster');
    expect(view).not.toBeNull();
    expect(view?.dataset['control']).toBe('player');
    expect(port.calls[0]).toBe('claim');
    expect(port.calls).toContain('input');
    expect(game.setup.seats.monster.who).toBe('human');

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

    button('[data-tab="setup"]').click();
    expect(game.ui.station).toBeNull();
    expect(port.calls.at(-1)).toBe('release');
    expect(document.querySelector('.monster')).toBeNull();
  });

  it('zeigt ohne Karte eine Erklärung statt einer Ansicht', () => {
    crew('yellow', true, undefined, true, true);
    expect(document.querySelector('.role--scout')).toBeNull();
    expect(document.querySelector('.haunt__body')?.textContent).toContain('Keine Karte');
  });

  /** Ein Stuhl ohne Fähigkeit ist ein Stuhl ohne Karte — und die Seite sagt, wo sie herkommt. */
  it('sagt auf einem Stuhl ohne Fähigkeit, dass die Tafel ihm eine geben muss', () => {
    const game = crew(null);
    game.setSetup(withPower(game.setup, 'red', 'archive', false));
    open('red');
    expect(game.ui.station).toBe('red');
    expect(game.ui.shownView).toBeNull();
    expect(document.querySelector('.haunt__body')?.textContent).toContain('keine Fähigkeit');
  });

  /**
   * **Zwei Karten auf einem Stuhl: eine Zeile zum Blättern.** Rot hält Archiv
   * und Späher; die erste Karte ist offen, ein Tipp auf die Zeile blättert.
   */
  it('blättert auf einem Stuhl mit zwei Fähigkeiten zwischen den Karten', () => {
    const game = crew(null);
    game.setSetup(withPower(game.setup, 'red', 'scout', true));
    open('red');
    expect(game.ui.roleLabel).toBe('Aufklärung');
    expect(game.ui.shownView).toBe('scout');
    expect(document.querySelectorAll('[data-sub]')).toHaveLength(2);
    button('[data-sub="archive"]').click();
    expect(game.ui.shownView).toBe('archive');
    expect(document.querySelector('.role--archive')).not.toBeNull();
  });

  it('reicht der Schalttafel nur die freigegebenen Schalter herein', () => {
    const game = crew('blue');
    const closed = visibleSwitches(game.round.house.switches, false).length;
    expect(closed).toBeLessThan(game.round.house.switches.length);
    button('[data-panel-sheet]').click();
    expect(document.querySelectorAll('[data-switch]')).toHaveLength(closed);
    expect(document.querySelector('.role--panel')?.textContent).not.toContain('Schallköder');
    game.state.fuse = true;
    tick(game.ui);
    expect(document.querySelectorAll('[data-switch]').length).toBeGreaterThan(closed);
  });

  it('rechnet dem Archivar die Aufträge aus der Buchführung', () => {
    const game = crew('red');
    const hud = () => document.querySelector('.role--archive .role__hud')?.textContent ?? '';
    const repairs = repairsFor(game.round.house);
    expect(hud()).toContain(`0 von ${repairs.length} Systemen`);
    game.state.done.push(repairs[0]!.itemId);
    tick(game.ui);
    expect(hud()).toContain(`1 von ${repairs.length} Systemen`);
  });
});

describe('Der Aufbau — ein Häkchen, eine Verteilung, ein Knopf', () => {
  /**
   * **Ein Häkchen, nicht zwei.** „Testen" ist weg: Auf der Tafel steht
   * „Monster: Aus", und das ist dieselbe Aussage an der Stelle, an die sie
   * gehört. Keines startet etwas.
   */
  it('zeigt ein Häkchen statt Kacheln und startet erst mit dem einen Knopf', () => {
    const game = crew('red', false);
    button('[data-tab="setup"]').click();
    const checks = [...document.querySelectorAll<HTMLElement>('[data-check]')];
    expect(checks.map((key) => key.dataset['check'])).toEqual(['view']);
    expect(checks[0]!.textContent).toContain('2D-Welt von oben');
    expect(document.body.textContent).not.toContain('Testen');
    for (const gone of [
      '[data-intent]',
      '[data-setup-me]',
      '[data-setup-ability]',
      '.lobby__seats',
    ])
      expect(document.querySelector(gone)).toBeNull();

    const quest = document.querySelector<HTMLElement>('.haunt__quest')!;
    expect(quest.hidden).toBe(true);
    open('red');
    expect(quest.hidden).toBe(false);
    button('[data-tab="setup"]').click();
    expect(quest.hidden).toBe(true);

    expect(checks[0]!.getAttribute('aria-pressed')).toBe('true');
    button('[data-check="view"]').click();
    expect(game.lobby.view).toBe('3d');
    // Kein Monster heißt Test — über die Tafel, nicht über ein Häkchen.
    button('[data-seat="monster"] [data-setup-who="off"]').click();
    expect(game.setup.seats.monster.who).toBe('off');
    expect(game.startSetup).not.toHaveBeenCalled();
    button('[data-start-setup]').click();
    expect(game.startSetup).toHaveBeenCalledTimes(1);
  });

  it('beschriftet den einen Startknopf ohne Ansicht in Klammern', () => {
    const game = crew('red', false);
    button('[data-tab="setup"]').click();
    const label = () => button('[data-start-setup]').querySelector('strong')!.textContent;
    expect(label()).toBe('Mission starten');
    button('[data-check="view"]').click();
    expect(game.lobby.view).toBe('3d');
    expect(label()).toBe('Mission starten');
    button('[data-seat="monster"] [data-setup-who="off"]').click();
    expect(label()).toBe('Test starten');
  });

  /**
   * **Fünf Zeilen, je drei Knöpfe und drei Lämpchen.** Die Fähigkeiten hängen
   * am Platz; unter einem Stuhl mit zweien steht der Name der Mischung.
   */
  it('zeigt alle Plätze mit Mensch/Bot/Aus und die Fähigkeiten als Lämpchen', () => {
    const game = crew('red', false);
    button('[data-tab="setup"]').click();
    expect(
      [...document.querySelectorAll<HTMLElement>('[data-seat]')].map((row) => row.dataset['seat']),
    ).toEqual(['technician', 'red', 'yellow', 'blue', 'monster']);
    // Der Techniker kennt kein „Aus".
    expect(document.querySelectorAll('[data-seat="technician"] [data-setup-who]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-seat="monster"] [data-setup-power]')).toHaveLength(0);
    const lamp = () => button('[data-seat="red"] [data-setup-power="scout"]');
    expect(lamp().getAttribute('aria-pressed')).toBe('false');
    lamp().click();
    expect(game.setup.seats.red.powers.scout).toBe(true);
    expect(lamp().classList.contains('is-on')).toBe(true);
    expect(document.querySelector('[data-seat="red"]')?.textContent).toContain('Aufklärung');
    lamp().click();
    expect(game.setup.seats.red.powers.scout).toBe(false);
    button('[data-seat="yellow"] [data-setup-who="bot"]').click();
    expect(game.setup.seats.yellow.who).toBe('bot');
  });

  it('schreibt „VR" in die Zeile des Technikers und lässt sie nicht drücken', () => {
    const game = crew('red', true);
    button('[data-tab="setup"]').click();
    const key = button('[data-seat="technician"] [data-setup-who="human"]');
    expect(key.textContent).toBe('VR');
    expect(key.disabled).toBe(true);
    key.click();
    expect(game.setup.seats.technician.who).toBe('human');
  });

  /**
   * **Ein Reiter setzt einen wirklich hin.** Wer Rot antippt, hält Rot in der
   * Verteilung als Mensch und sitzt an dessen Gerät; wer weiterzieht, gibt den
   * alten Stuhl frei. Die Spalte „Ich" ist dafür weg.
   */
  it('setzt über die Reiter genau einen Platz auf „Mensch" und dieses Gerät an dessen Gerät', () => {
    const game = crew(null, false);
    expect(document.querySelector('[data-setup-me]')).toBeNull();
    open('red');
    expect(game.setup.seats.red.who).toBe('human');
    expect(game.seat).toBe('red');
    expect(game.lobby.me).toBe('red');
    open('monster');
    expect(game.setup.seats.red.who).toBe('off');
    expect(game.setup.seats.monster.who).toBe('human');
    expect(game.seat).toBe('monster');
    expect(game.lobby.me).toBe('monster');
    // Zurück in die Zentrale als Zuschauer: Das Monster fällt an die Zahlen.
    // Mitten in einer Mission dürfte es das nicht (`switchRights`); im Test schon.
    game.state.crew.options.test = true;
    game.ui.refresh();
    open('watch:all');
    expect(game.setup.seats.monster.who).toBe('bot');
    expect(game.seat).toBe('watch');
  });

  it('sperrt den Start im Schiff, solange ein anderer Techniker spielt — in 2D nicht', () => {
    const game = crew('red', true, undefined, false);
    button('[data-tab="setup"]').click();
    const start = () => button('[data-start-setup]');
    expect(start().disabled).toBe(true);
    expect(start().textContent).toContain('Ein Techniker spielt bereits');
    start().click();
    expect(game.startSetup).not.toHaveBeenCalled();
    button('[data-check="view"]').click();
    expect(start().disabled).toBe(false);
    start().click();
    expect(game.startSetup).toHaveBeenCalledTimes(1);
  });

  it('erklärt aus der Registry, wer was sieht', () => {
    crew(null);
    const help = document.querySelector('.lobby__help')!;
    expect(help.textContent).toContain('Hilfe: Wer sieht was?');
    for (const role of listRoles()) expect(help.textContent).toContain(role.sees);
  });

  it('bietet ohne Lobby den Desktop-Techniker an', () => {
    const game = crew(null, false, undefined, 'none');
    button('[data-technician]').click();
    expect(game.technician).toHaveBeenCalledTimes(1);
  });
});

describe('Rollen sind Plätze mit Fähigkeiten', () => {
  it('hält, was auf dem Stuhl liegt — und nichts, wenn man den Stuhl verlässt', () => {
    const game = crew('red', false);
    expect(game.ui.roleLabel).toBe('Archiv');
    open('yellow');
    expect(game.ui.roleLabel).toBe('Späher');
    expect(game.ui.station).toBe('yellow');
    expect(game.setup.seats.yellow.who).toBe('human');
    expect(game.setup.seats.red.who).toBe('off');
    open('watch:all');
    expect(game.ui.roleLabel).toBe('');
    expect(game.ui.station).toBe('watch');
  });

  /**
   * **Ohne Rolle steht ein Satz da**, und mitten in einer Nicht-Test-Runde darf
   * sie nicht jeder wechseln — wer das Monster spielt, bleibt das Monster
   * (`roundSetup.switchRights`).
   */
  it('lässt das Monster mitten in der Mission nicht in die Zentrale', () => {
    const game = crew('monster', false);
    open('red');
    expect(game.notify).toHaveBeenCalledWith(NOT_IN_CENTRE);
    expect(game.ui.station).toBe('monster');
    game.state.crew.options.test = true;
    game.ui.refresh();
    open('red');
    expect(game.ui.roleLabel).toBe('Archiv');
  });

  it('nennt dem Techniker seinen Platz und schickt ihn zum Startknopf', () => {
    const game = crew('technician', false);
    expect(game.lobby.me).toBe('technician');
    expect(game.setup.seats.technician.who).toBe('human');
    expect(game.ui.station).toBeNull();
    expect(document.querySelector('.haunt__body')?.textContent).toContain('Du bist der Techniker');
    expect(document.querySelector('[data-start-setup]')).not.toBeNull();
  });
});

describe('Der Rahmen der Einsatzzentrale', () => {
  it('gibt die Linse des Zuschauers an die Welt weiter', () => {
    const game = crew('watch:all');
    expect(game.ui.watchLens.seat).toBe('deck');
    expect(game.ui.shownView).toBe('watch');
    button('[data-watch-seat="panel"]').click();
    expect(game.ui.watchLens.seat).toBe('panel');
    // Das Bild ist das der Schalttafel — der **Platz** bleibt der Fernseher.
    expect(game.ui.shownView).toBe('hack');
    expect(game.ui.station).toBe('watch');
    button('[data-watch-insight]').click();
    expect(game.ui.watchLens.insight).toBe(true);
    open('yellow');
    expect(document.querySelector('[data-watch-seat]')).toBeNull();
    expect(document.querySelector('[data-watch-insight]')).toBeNull();
    expect(game.ui.watchLens.insight).toBe(false);
  });

  it('bietet nach einer verlorenen Runde den Neustart an', () => {
    const game = crew('red', false);
    game.state.phase = 'lost';
    game.state.crew.hp = 0;
    game.ui.refresh();
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Runde ist beendet');
    button('[data-restart]').click();
    expect(game.restart).toHaveBeenCalledTimes(1);
  });

  it('öffnet aus jeder Rolle das Spielmenü', () => {
    const game = crew('yellow');
    button('[data-game-menu]').click();
    expect(game.menu).toHaveBeenCalledTimes(1);
  });

  it('zeigt jedem Mitspieler Sauerstoff, Anzug-Leben und Kabinen und warnt unter einer Minute', () => {
    const game = crew('yellow');
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
    const game = crew('red');
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
});

/** Welche CSS-Klasse eine Rolle an ihr Element hängt. */
function roleClass(id: string): string {
  return roles.get(id)!.id === 'hack' ? 'panel' : id;
}
