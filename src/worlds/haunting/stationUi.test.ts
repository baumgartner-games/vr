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
import { defaultSetup, NOT_IN_CENTRE, type RoundSetup } from './rules/roundSetup';

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
  station: StationId | null = 'archive',
  remoteTechnician = true,
  monster?: MonsterPort,
  flat: boolean | 'none' = true,
  mapless = false,
) {
  const round = new FlatRound(947, { test: true });
  let lobby: LobbyChoice = { intent: 'play', view: flat === true ? '2d' : '3d' };
  let setup = defaultSetup();
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
  if (station) open(station);
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
 * Einen Reiter oben antippen. **Die drei Fähigkeiten der Zentrale heißen
 * `data-power`**, die übrigen Rollen (Fernseher, Monster) weiterhin
 * `data-sit` — sie sind keine Fähigkeiten, sondern Plätze.
 */
function open(station: StationId): void {
  const powers: Partial<Record<StationId, string>> = {
    archive: 'archive',
    scout: 'scout',
    hack: 'panel',
  };
  const power = powers[station];
  button(power ? `[data-power="${power}"]` : `[data-sit="${station}"]`).click();
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
   * Die Reiter kommen aus `listRoles()` und nicht aus einer Liste in dieser
   * Datei: Wer eine `*.register.ts` anlegt, steht damit auch oben — und wer
   * die Drohne streicht, streicht sie überall. Die drei Fähigkeiten der
   * Zentrale stehen dabei vor den Plätzen, die keine sind.
   */
  it('reiht Aufbau, die drei Fähigkeiten und dann die übrigen Rollen auf', () => {
    crew(null);
    const tabs = [...document.querySelectorAll<HTMLElement>('.haunt__roles button')].map(
      (key) =>
        key.dataset['tab'] ??
        (key.dataset['power'] ? `power:${key.dataset['power']}` : `sit:${key.dataset['sit']}`),
    );
    expect(tabs).toEqual([
      'setup',
      'power:scout',
      'power:panel',
      'power:archive',
      'sit:watch',
      'sit:monster',
    ]);
    expect(tabs).not.toContain('sit:drone');
    // Kein Titel „ORBITAL / EINSATZZENTRALE" mehr, und die Kopfzeile der Seite
    // ist ausgeblendet (`body.haunt-on #hud` in `haunting.css`).
    expect(document.querySelector('.haunt__bar')?.textContent).not.toContain('EINSATZZENTRALE');
    expect(document.body.classList.contains('haunt-on')).toBe(true);
    // Die drei kleinen Knöpfe der Seite stehen stellvertretend rechts.
    for (const key of ['[data-game-menu]', '[data-page-net]', '[data-page-vr]'])
      expect(document.querySelector(key)).not.toBeNull();
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

    button('[data-tab="setup"]').click();
    expect(game.ui.station).toBeNull();
    expect(port.calls.at(-1)).toBe('release');
    expect(document.querySelector('.monster')).toBeNull();
  });

  it('zeigt ohne Karte eine Erklärung statt einer Ansicht', () => {
    crew('scout', true, undefined, true, true);
    expect(document.querySelector('.role--scout')).toBeNull();
    expect(document.querySelector('.haunt__body')?.textContent).toContain('Keine Karte');
  });

  /**
   * **Der Sicherungskasten reicht bis auf die Tafel.** Die Rolle sucht sich
   * die Schalter nicht selbst aus dem Grundriss — sie bekommt sie vom Wirt
   * (`RoleHost.switches`), und der fragt den Stand. Genau daran hängt die
   * Reihenfolge, in der Archivar, Techniker und Schalttafel dran sind.
   */
  it('reicht der Schalttafel nur die freigegebenen Schalter herein', () => {
    const game = crew('hack');
    const closed = visibleSwitches(game.round.house.switches, false).length;
    expect(closed).toBeLessThan(game.round.house.switches.length);
    button('[data-panel-sheet]').click();
    expect(document.querySelectorAll('[data-switch]')).toHaveLength(closed);
    // **Kein Schallköder**: Die Tafel kennt nur Licht und Schotts.
    expect(document.querySelector('.role--panel')?.textContent).not.toContain('Schallköder');

    // Der Kasten ist umgelegt: Die andere Hälfte kommt dazu. Die Rolle
    // zeichnet sich dabei selbst nach, also muss die Drossel weiter sein.
    game.state.fuse = true;
    tick(game.ui);
    expect(document.querySelectorAll('[data-switch]').length).toBeGreaterThan(closed);
  });

  /**
   * **Die Buchführung der Runde erreicht den Archivar** (`RoleHost.ledger`):
   * Ohne sie wüsste er nicht, was erledigt ist und was der Techniker gerade
   * trägt — und genau daran hängt, was er verraten darf.
   */
  it('rechnet dem Archivar die Aufträge aus der Buchführung', () => {
    const game = crew('archive');
    const hud = () => document.querySelector('.role--archive .role__hud')?.textContent ?? '';
    const repairs = repairsFor(game.round.house);
    expect(hud()).toContain(`0 von ${repairs.length} Systemen`);
    game.state.done.push(repairs[0]!.itemId);
    tick(game.ui);
    expect(hud()).toContain(`1 von ${repairs.length} Systemen`);
  });
});

describe('Der Aufbau — zwei Häkchen, eine Verteilung, ein Knopf', () => {
  /**
   * Die drei Kacheln (Spielen · Zuschauen · Trainieren), das Segment 2D|3D,
   * „Bot-Runde ansehen", „Mission spielen (2D)", „Test ohne Monster (2D)" und
   * die Hilfe „Eure Dreiercrew" hat der Besitzer weghaben wollen — und keines
   * der Häkchen startet etwas.
   */
  it('zeigt zwei Häkchen statt Kacheln und startet erst mit dem einen Knopf', () => {
    const game = crew('archive', false);
    button('[data-tab="setup"]').click();
    const checks = [...document.querySelectorAll<HTMLElement>('[data-check]')];
    expect(checks.map((key) => key.dataset['check'])).toEqual(['view', 'test']);
    expect(checks[0]!.textContent).toContain('2D-Welt von oben');
    expect(checks[1]!.textContent).toContain('Testen');
    for (const gone of [
      '[data-intent]',
      '[data-view]',
      '[data-flat-mode]',
      '[data-mission]',
      '[data-test]',
      '[data-bot-round]',
      '.lobby__seats',
    ])
      expect(document.querySelector(gone)).toBeNull();
    const body = document.querySelector('.haunt__body')!;
    expect(body.textContent).not.toContain('Dreiercrew');
    expect(body.textContent).not.toContain('Runde starten (2D)');

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
    const game = crew('archive', false);
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
    const game = crew('archive', false);
    button('[data-tab="setup"]').click();
    expect(document.querySelector('[data-setup-add]')).toBeNull();
    expect(
      [...document.querySelectorAll<HTMLElement>('[data-setup-ability]')].map(
        (key) => key.dataset['setupAbility'],
      ),
    ).toEqual(['scout', 'panel', 'archive']);
    const key = () => button('[data-setup-ability="scout"]');
    expect(key().textContent).toBe('Bot');
    key().click();
    expect(game.setup.abilities.scout).toBe('human');
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
    const game = crew('archive', true);
    button('[data-tab="setup"]').click();
    const key = button('[data-setup-technician]');
    expect(key.textContent).toBe('VR');
    expect(key.disabled).toBe(true);
    key.click();
    expect(game.setup.technician).toBe('human');
  });

  /**
   * **„Ich" gibt es genau einmal, und es setzt einen wirklich hin.** Vorher
   * führte der Van zwei Listen über dieselben Plätze: Wer sich ans Archiv
   * setzte, blieb in der Verteilung ein Bot.
   */
  it('setzt „Ich" auf genau einen Platz und dieses Gerät an dessen Rolle', () => {
    const game = crew('archive', false);
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

  /** Die Hilfe zählt auf, was jede angemeldete Rolle sieht (`RoleFacts.sees`). */
  it('erklärt aus der Registry, wer was sieht', () => {
    crew(null);
    const help = document.querySelector('.lobby__help')!;
    expect(help.textContent).toContain('Hilfe: Wer sieht was?');
    for (const role of listRoles()) expect(help.textContent).toContain(role.sees);
  });

  /** Eine Welt ohne Aufbau-Anschluss lässt wenigstens den Weg an den Stock offen. */
  it('bietet ohne Lobby den Desktop-Techniker an', () => {
    const game = crew(null, false, undefined, 'none');
    button('[data-technician]').click();
    expect(game.technician).toHaveBeenCalledTimes(1);
  });
});

describe('Rollen sind Fähigkeiten', () => {
  /**
   * **Die Reiter sind die Rollenwahl** — und eine Fähigkeit, die man nimmt,
   * steht danach in der Verteilung bei einem Menschen. Wer mehrere nimmt,
   * behält sie: Das ist die Mischung, um die es dem Besitzer ging.
   */
  it('nimmt über die Reiter Fähigkeiten und mischt sie', () => {
    const game = crew('archive', false);
    expect(game.ui.roleLabel).toBe('Archiv');
    expect(game.setup.abilities.archive).toBe('human');
    button('[data-power="scout"]').click();
    expect(game.ui.roleLabel).toBe('Aufklärung');
    expect(game.setup.abilities.scout).toBe('human');
    expect(game.ui.station).toBe('scout');
    // Der Reiter des Archivs leuchtet weiter als „meiner", auch wenn das
    // Radar offen ist.
    expect(button('[data-power="archive"]').className).toContain('is-mine');
    // Späher und Schalttafel zusammen heißen weiterhin Einsatzkontrolle —
    // seit #93 sind es allerdings zwei Karten und nicht zwei Reiter eines
    // Geräts.
    button('[data-power="panel"]').click();
    expect(game.ui.station).toBe('hack');
    expect(document.querySelector('.role--panel')).not.toBeNull();
    // Eine Rolle, die keine Fähigkeit ist, legt die Zentrale ab.
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
    const game = crew('monster', false);
    button('[data-tab="setup"]').click();
    expect(document.querySelector('.haunt__body')?.textContent).toContain(
      'Bitte wähle über den Tab oben deine Rolle aus.',
    );
    // Eine Mission läuft: Das Monster sitzt nicht in der Zentrale.
    button('[data-power="archive"]').click();
    expect(game.notify).toHaveBeenCalledWith(NOT_IN_CENTRE);
    expect(game.ui.roleLabel).toBe('');
    // In einer Test-Runde darf jeder jede Rolle nehmen.
    game.state.crew.options.test = true;
    game.ui.refresh();
    button('[data-power="archive"]').click();
    expect(game.ui.roleLabel).toBe('Archiv');
  });
});

describe('Der Rahmen der Einsatzzentrale', () => {
  it('gibt die Linse des Zuschauers an die Welt weiter', () => {
    const game = crew('watch');
    expect(game.ui.watchLens.seat).toBe('deck');
    expect(game.ui.shownStation).toBe('watch');
    button('[data-watch-seat="panel"]').click();
    expect(game.ui.watchLens.seat).toBe('panel');
    // Das Bild ist das der Schalttafel — der **Platz** bleibt der Fernseher.
    expect(game.ui.shownStation).toBe('hack');
    expect(game.ui.station).toBe('watch');
    button('[data-watch-insight]').click();
    expect(game.ui.watchLens.insight).toBe(true);
    // Ein Spieler bekommt weder Linse noch Overlay-Schalter.
    button('[data-power="scout"]').click();
    expect(document.querySelector('[data-watch-seat]')).toBeNull();
    expect(document.querySelector('[data-watch-insight]')).toBeNull();
    expect(game.ui.watchLens.insight).toBe(false);
  });

  it('bietet nach einer verlorenen Runde den Neustart an', () => {
    const game = crew('archive', false);
    game.state.phase = 'lost';
    game.state.crew.hp = 0;
    game.ui.refresh();
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Runde ist beendet');
    button('[data-restart]').click();
    expect(game.restart).toHaveBeenCalledTimes(1);
  });

  it('öffnet aus jeder Rolle das Spielmenü', () => {
    const game = crew('scout');
    button('[data-game-menu]').click();
    expect(game.menu).toHaveBeenCalledTimes(1);
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
});

/** Welche CSS-Klasse eine Rolle an ihr Element hängt. */
function roleClass(id: string): string {
  return roles.get(id)!.id === 'hack' ? 'panel' : id;
}
