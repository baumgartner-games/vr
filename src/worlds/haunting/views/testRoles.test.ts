/** @jest-environment jsdom */
import { FlatRound, PLAYER_ID } from '../map/flatRound';
import { roles } from '../registry/roles';
import { generateHouse } from '../house';
import './archive.register';
import './panel.register';
import './scout.register';
import { ArchiveRole } from './archive';
import { PanelRole } from './panel';
import { ScoutRole } from './scout';
import { applySwitch } from './switchState';
import { PLAY_ID, RoleSwitcher, roundHost } from './testRoles';
import { registerRole } from '../registry/roles';

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
  HTMLCanvasElement.prototype.getContext = jest.fn(() => fakeContext()) as never;
  HTMLElement.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0 }) as DOMRect;
});

afterEach(() => {
  document.body.replaceChildren();
});

const STEP = 1 / 30;

/** Ein Bild der Welt im Testmodus: Runde rechnen, dann die Rollenansicht nachführen. */
function frame(round: FlatRound, roles: RoleSwitcher, seconds: number): void {
  for (let t = 0; t < seconds; t += STEP) {
    round.step(STEP, { x: 0, z: 0, sprint: false });
    roles.update(STEP);
  }
}

describe('Rollenwechsel im Testmodus', () => {
  it('registriert die drei Geräte aus je einer eigenen Datei', () => {
    expect(roles.get('archive')?.surface).toBe('map');
    expect(roles.get('hack')?.label).toBe('Schalttafel');
    expect(roles.get('scout')?.label).toBe('Späher');
    expect(roles.has('drone')).toBe(false);
  });

  it('wechselt die Ansicht, ohne die laufende Runde anzuhalten oder den Techniker zu verlieren', () => {
    const round = new FlatRound(7);
    const play = document.createElement('div');
    play.className = 'flat';
    document.body.append(play);
    const switcher = new RoleSwitcher(roundHost(round), { play });
    document.body.append(switcher.element);
    const chips = [...switcher.element.querySelectorAll<HTMLElement>('[data-role]')];
    expect(chips.map((chip) => chip.dataset['role'])).toEqual([
      PLAY_ID,
      'archive',
      'hack',
      'scout',
    ]);
    expect(switcher.current).toBe(PLAY_ID);
    expect(play.hidden).toBe(false);

    frame(round, switcher, 1);
    const haunt = round.state();
    const player = { ...round.player };
    const time = haunt.time;

    // Zum Späher: Die 2D-Welt wird ausgeblendet, nicht abgebaut.
    chips.find((chip) => chip.dataset['role'] === 'scout')!.click();
    expect(switcher.current).toBe('scout');
    expect(switcher.mounted).toBeInstanceOf(ScoutRole);
    expect(play.hidden).toBe(true);
    expect(play.isConnected).toBe(true);
    frame(round, switcher, 1);
    expect(round.state()).toBe(haunt);
    expect(haunt.time).toBeGreaterThan(time);
    expect(haunt.phase).toBe('running');
    expect(round.player.x).toBe(player.x);
    expect(round.player.z).toBe(player.z);
    const scout = switcher.mounted as ScoutRole;
    expect(scout.markers().some((m) => m.id === PLAYER_ID)).toBe(true);

    // Zur Schalttafel: schaltet im Stand derselben Runde.
    switcher.select('hack');
    expect(switcher.mounted).toBeInstanceOf(PanelRole);
    const panel = switcher.mounted as PanelRole;
    const door = round.snapshot().doors[0]!;
    panel.map.setView({ centreX: door.at.x, centreZ: door.at.z, scale: 30 });
    const d = panel.map.toScreen(door.at.x, door.at.z);
    panel.map.tap(d.x, d.y);
    expect(haunt.shut).toContain(door.id);
    frame(round, switcher, 0.5);

    // Zum Archiv, dann zurück zum Techniker: dieselbe Runde, dieselbe Uhr.
    switcher.select('archive');
    expect(switcher.mounted).toBeInstanceOf(ArchiveRole);
    frame(round, switcher, 0.5);
    const before = haunt.time;
    switcher.select(PLAY_ID);
    expect(switcher.mounted).toBeNull();
    expect(play.hidden).toBe(false);
    expect(round.state()).toBe(haunt);
    expect(haunt.time).toBe(before);
    expect(haunt.shut).toContain(door.id);
    expect(round.snapshot().entities.some((e) => e.id === PLAYER_ID)).toBe(true);
    expect(round.spec().seed).toBe(7);

    switcher.dispose();
    expect(play.hidden).toBe(false);
    expect(switcher.element.isConnected).toBe(false);
  });

  it('bietet weder eine unbekannte Rolle noch eine Spielrolle an', () => {
    // Eine Spielrolle mit Karte (wie das Monster) gehört der 2D-Welt selbst,
    // nicht dem Streifen: Sie ist kein Sitzplatz im Van.
    registerRole({
      id: 'player-role',
      label: 'Spielrolle',
      tagline: '',
      sees: '',
      surface: 'map',
      mount: () => ({ element: document.createElement('div'), update() {}, dispose() {} }),
    });
    const round = new FlatRound(7, { test: true });
    const play = document.createElement('div');
    const switcher = new RoleSwitcher(roundHost(round), { play });
    const offered = [...switcher.element.querySelectorAll<HTMLElement>('[data-role]')].map(
      (chip) => chip.dataset['role'],
    );
    expect(offered).toEqual([PLAY_ID, 'archive', 'hack', 'scout']);
    switcher.select('drone');
    switcher.select('player-role');
    expect(switcher.current).toBe(PLAY_ID);
    expect(play.hidden).toBe(false);
    switcher.dispose();
    roles.unregister('player-role');
  });
});

describe('Ein Schalter auf einem Stand', () => {
  it('rechnet wie der Gastgeber: Türen zu heißt in der Liste, Licht an heißt drin', () => {
    const spec = generateHouse(11, 14);
    const state = new FlatRound(11, { test: true }).state();
    const door = spec.switches.find((one) => one.kind === 'door')!;
    const light = spec.switches.find((one) => one.kind === 'light')!;
    expect(applySwitch(state, spec, door.id, false)).toBe(true);
    expect(state.shut).toContain(door.target);
    applySwitch(state, spec, door.id, true);
    expect(state.shut).not.toContain(door.target);
    applySwitch(state, spec, light.id, false);
    expect(state.lit).not.toContain(light.target);
    applySwitch(state, spec, light.id, true);
    expect(state.lit.filter((id) => id === light.target)).toHaveLength(1);
    expect(applySwitch(state, spec, 'nope', true)).toBe(false);
  });
});
