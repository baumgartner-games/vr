/** @jest-environment jsdom */
import { StationUi, type StationHost } from './stationUi';
import { homeView } from './archiveView';
import { generateHouse } from './house';
import { freshCrew, lockerCode, repairsFor } from './mission';
import type { HauntState } from './net';
import type { StationId } from './stations';
import { FlatRound } from './map/flatRound';
import { roles } from './registry/roles';
import { ArchiveRole } from './views/archive';
import { PanelRole } from './views/panel';
import { ScoutRole } from './views/scout';
import './views/archive.register';
import './views/panel.register';
import './views/scout.register';
import './registry/legacyRoles.register';

jest.mock('./haunting.css', () => ({}));
jest.mock('./stationDashboard.css', () => ({}));

const views: StationUi[] = [];
let size = { width: 360, height: 430 };

function fakeContext(): CanvasRenderingContext2D {
  const store: Record<string, unknown> = {};
  return new Proxy(store, {
    get: (target, name: string) => {
      if (name in target) return target[name];
      if (name === 'measureText') return (text: string) => ({ width: text.length * 6 });
      if (name === 'createRadialGradient' || name === 'createLinearGradient')
        return () => ({ addColorStop() {} });
      return () => {};
    },
    set: (target, name: string, value) => {
      target[name] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

beforeEach(() => {
  size = { width: 360, height: 430 };
  Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { value: () => {}, configurable: true },
    hasPointerCapture: { value: () => false, configurable: true },
    releasePointerCapture: { value: () => {}, configurable: true },
  });
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => fakeContext());
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
 * Der Van über einer **laufenden 2D-Runde**: Bauplan, Stand und Snapshot
 * kommen aus derselben `FlatRound`, wie die Welt sie im Testmodus liefert.
 */
function crew(station: StationId = 'archive', remoteTechnician = true) {
  let round = new FlatRound(947, { test: true });
  const state = (): HauntState => round.state();
  let seat: StationId | null = null;
  const flip = jest.fn((id: string, on: boolean) => {
    const entry = round.spec().switches.find((one) => one.id === id)!;
    if (entry.kind === 'door') {
      if (on) round.state().shut = round.state().shut.filter((d) => d !== entry.target);
      else round.state().shut.push(entry.target);
    }
  });
  const menu = jest.fn();
  const botRound = jest.fn();
  const restart = jest.fn();
  const archiveHome = jest.fn();
  const archiveZoom = jest.fn();
  const archivePan = jest.fn();
  const host: StationHost = {
    spec: () => round.spec(),
    state,
    snapshot: () => round.snapshot(),
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
    archiveView: homeView,
    archiveZoom,
    archivePan,
    archiveHome,
  };
  let clock = 1000;
  const ui = new StationUi(host, () => clock);
  views.push(ui);
  ui.refresh();
  button(`[data-sit="${station}"]`).click();
  return {
    ui,
    flip,
    menu,
    botRound,
    restart,
    archiveHome,
    archiveZoom,
    archivePan,
    get round() {
      return round;
    },
    get spec() {
      return round.spec();
    },
    get state() {
      return round.state();
    },
    step() {
      round.step(1 / 30, { x: 0, z: 0, sprint: false });
      clock += 50;
      ui.refresh();
    },
    nextRound() {
      round = new FlatRound(round.spec().seed + 1, { test: true });
      ui.refresh();
    },
  };
}

function button(selector: string): HTMLButtonElement {
  const hit = document.querySelector<HTMLButtonElement>(selector);
  expect(hit).not.toBeNull();
  return hit!;
}

describe('Der Van auf dem Telefon', () => {
  it.each([390, 1440])(
    'bietet bei %i px die drei Geräte und den Fernseher an und wechselt zwischen ihnen',
    (width) => {
      Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
      size = width < 600 ? { width: 390, height: 250 } : { width: 940, height: 700 };
      const game = crew();
      expect(game.ui.station).toBe('archive');
      expect(game.ui.roleView).toBeInstanceOf(ArchiveRole);
      // Keine Reiter, keine Missionsliste, keine Raumauswahl mehr.
      expect(document.querySelector('[data-archive-tab]')).toBeNull();
      expect(document.querySelector('.haunt__tasks')).toBeNull();
      expect(document.querySelector('select[data-room-select]')).toBeNull();
      expect(document.querySelector('.role--archive .mapview')).not.toBeNull();
      expect(game.ui.viewport()).toBeNull();
      expect(game.ui.headroom()).toBe(0);
      expect(game.ui.veiled).toBe(false);
      expect(button('[aria-label="Rolle wechseln"]').textContent).toContain('Menü / Rollen');
      button('[aria-label="Rolle wechseln"]').click();
      expect(document.querySelector('[data-sit="drone"]')).toBeNull();
      expect(
        [...document.querySelectorAll<HTMLElement>('[data-sit]')].map(
          (tile) => tile.dataset['sit'],
        ),
      ).toEqual(['archive', 'hack', 'scout', 'watch']);
      button('[data-sit="scout"]').click();
      expect(game.ui.station).toBe('scout');
      expect(game.ui.roleView).toBeInstanceOf(ScoutRole);
      expect(document.querySelector('.role--archive')).toBeNull();
    },
  );

  it('zeigt dem Archivar die Karte und auf Tipp die Akte mit Codes', () => {
    const game = crew();
    const archive = game.ui.roleView as ArchiveRole;
    const repair = repairsFor(game.spec).find((one) => one.puzzle === 'sequence')!;
    const room = game.round.snapshot().rooms.find((one) => one.id === repair.roomId)!;
    archive.map.setView({ centreX: room.centre.x, centreZ: room.centre.z, scale: 30 });
    const p = archive.map.toScreen(room.centre.x, room.centre.z);
    archive.map.tap(p.x, p.y);
    // Die Welt liest, welches Zimmer sie in die Akte zeichnen soll.
    expect(game.ui.selected).toBe(repair.roomId);
    expect(game.archiveHome).toHaveBeenCalled();
    game.step();
    const text = document.querySelector('.role-archive__codes')?.textContent;
    expect(text).toContain(lockerCode(game.spec.seed, repair.roomId));
    expect(text).toContain(repair.code);
    // In der 2D-Runde zeichnet die Akte selbst; die Welt bekommt kein Loch.
    expect(game.ui.viewport()).toBeNull();
    button('[data-back]').click();
    expect(game.ui.selected).toBe('');
  });

  it('lässt die Schalttafel Türen auf der Karte schalten und schickt jeden Schalter einmal', () => {
    const game = crew('hack');
    expect(game.ui.roleView).toBeInstanceOf(PanelRole);
    expect(document.querySelector('[data-flip]')).toBeNull();
    expect(document.querySelector('.haunt__switches')).toBeNull();
    const panel = game.ui.roleView as PanelRole;
    const door = game.round.snapshot().doors[0]!;
    panel.map.setView({ centreX: door.at.x, centreZ: door.at.z, scale: 30 });
    const d = panel.map.toScreen(door.at.x, door.at.z);
    panel.map.tap(d.x, d.y);
    expect(game.flip).toHaveBeenCalledTimes(1);
    expect(game.flip).toHaveBeenCalledWith(`s-door-${door.id}`, false);
    expect(game.state.shut).toContain(door.id);
    game.step();
    panel.map.tap(d.x, d.y);
    expect(game.flip).toHaveBeenLastCalledWith(`s-door-${door.id}`, true);
    expect(game.ui.viewport()).toBeNull();
  });

  it('gibt dem Späher die Karte mit Punkten statt Radar und Puls', () => {
    const game = crew('scout');
    expect(game.ui.roleView).toBeInstanceOf(ScoutRole);
    expect(document.querySelector('.haunt__scout')).toBeNull();
    expect(document.querySelector('.haunt__ecg')).toBeNull();
    expect(document.querySelector('[data-control-tab]')).toBeNull();
    const scout = game.ui.roleView as ScoutRole;
    expect(scout.markers().map((m) => m.kind)).toEqual(['player']);
    expect(game.ui.viewport()).toBeNull();
  });

  it('baut die Ansicht beim Platzwechsel ab und bei einer neuen Runde nicht neu', () => {
    const game = crew('scout');
    const first = game.ui.roleView;
    game.nextRound();
    expect(game.ui.roleView).toBe(first);
    button('[aria-label="Rolle wechseln"]').click();
    expect(game.ui.station).toBeNull();
    expect(game.ui.roleView).toBeNull();
    button('[data-sit="watch"]').click();
    expect(game.ui.station).toBe('watch');
    expect(game.ui.roleView).toBeNull();
    expect(game.ui.viewport()).toEqual({ x: 0, y: 0, w: size.width, h: size.height });
    expect(document.querySelector('.haunt__view')?.getAttribute('aria-label')).toBe(
      'Zuschaueransicht',
    );
  });

  it('zeigt einen Platzhalter, solange eine Rolle noch nicht angemeldet ist', () => {
    const scout = roles.get('scout')!;
    roles.unregister('scout');
    try {
      const game = crew('scout');
      expect(game.ui.roleView).toBeNull();
      expect(document.querySelector('.haunt__role')?.textContent).toContain('wird geladen');
      roles.register(scout);
      game.ui.refresh();
      expect(game.ui.roleView).toBeInstanceOf(ScoutRole);
    } finally {
      if (!roles.has('scout')) roles.register(scout);
    }
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

  it('funktioniert ohne Snapshot mit einer leeren Karte', () => {
    const spec = generateHouse(3, 14);
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
    const host: StationHost = {
      spec: () => spec,
      state: () => state,
      claims: () => [{ id: 'me', station: 'hack', seniority: 1 }],
      me: () => 'me',
      nameOf: () => 'ich',
      link: () => ({ peers: 1, vr: false, room: 'x' }),
      technician() {},
      seat: () => 'hack',
      wanted: () => 'hack',
      arriving: () => 0,
      sit() {},
      flip() {},
      archiveView: homeView,
      archiveZoom() {},
      archivePan() {},
      archiveHome() {},
    };
    const ui = new StationUi(host);
    views.push(ui);
    ui.refresh();
    button('[data-sit="hack"]').click();
    expect(ui.roleView).toBeInstanceOf(PanelRole);
    expect((ui.roleView as PanelRole).map.stats.rooms).toBe(0);
  });
});
