/** @jest-environment jsdom */
import { FlatRound, PLAYER_ID } from '../map/flatRound';
import { repairsFor } from '../mission';
import { listRoles, roles, type RoleHost, type RoleView } from '../registry/roles';
import type { ArchiveDesk } from './archiveDesk';
import { mountArchiveView, type ArchiveRoleView } from './archiveRole';
import { mountPanelView, type PanelRoleView } from './panelRole';
import { mountScoutView, PING_PERIOD, type ScoutRoleView } from './scoutRole';
import { mountSeatView } from './seatRole';
import type { MapSnapshot } from '../map/mapSnapshot';
import { mountWatchView } from './watchRole';
import { RoleStrip } from './roleStrip';
import {
  NOT_IN_CENTRE,
  defaultSetup,
  switchRights,
  withPower,
  type RoundSetup,
} from '../rules/roundSetup';
import { DROPPED_SEEN } from '../rules/archiveGoals';
import { TILE } from '../../nav/navTile';
import './archive.register';
import './panel.register';
import './scout.register';
import './watch.register';

/**
 * Die drei Nicht-VR-Rollen, headless geprüft: dieselbe `MapView` wie die
 * 2D-Welt, jede mit eigenen Schichten — und drei Zusagen, die man auf einem
 * Telefon niemandem ansieht, bevor sie schiefgehen: Die Schalttafel zeigt
 * **keine** Wesen, der Späher **interpoliert nicht**, und der Archivar zeigt
 * die Fracht mit ihrem Ziel.
 */

const size = { width: 400, height: 300 };
const opened: RoleView[] = [];

beforeEach(() => {
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { value: () => {}, configurable: true },
    hasPointerCapture: { value: () => false, configurable: true },
    releasePointerCapture: { value: () => {}, configurable: true },
  });
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
  opened.splice(0).forEach((view) => view.dispose());
  document.body.replaceChildren();
  jest.restoreAllMocks();
});

function stage<T extends RoleView>(view: T): T {
  document.body.append(view.element);
  opened.push(view);
  return view;
}

function hostFor(round: FlatRound, extra?: unknown): RoleHost & { said: string[] } {
  const said: string[] = [];
  return {
    said,
    snapshot: () => round.snapshot(),
    spec: () => round.house,
    ledger: () => round.state(),
    me: () => PLAYER_ID,
    nameOf: (peer) => peer,
    door: (id) => round.lockDoor(id),
    light: (id) => round.switchLight(id),
    switches: () => round.house.switches,
    notify: (text) => said.push(text),
    ...(extra === undefined ? {} : { extra }),
  };
}

/** Einen Punkt der Karte antippen, in Metern. */
function tapAt(
  view: { map: { toScreen(x: number, z: number): { x: number; y: number } } },
  at: {
    x: number;
    z: number;
  },
): void {
  const p = view.map.toScreen(at.x, at.z);
  (view.map as unknown as { tap(x: number, y: number): void }).tap(p.x, p.y);
}

describe('Die Rollen melden sich aus je einer Datei an', () => {
  it('führt Archiv, Schalttafel, Späher und Zuschauer — und keine Drohne', () => {
    const ids = listRoles().map((role) => role.id);
    expect(ids).toEqual(expect.arrayContaining(['archive', 'hack', 'scout', 'watch']));
    expect(ids).not.toContain('drone');
    // Die drei Nicht-VR-Rollen sind Karten; der Fernseher ist die 3D-Welt.
    for (const id of ['archive', 'hack', 'scout']) expect(roles.get(id)?.surface).toBe('map');
    expect(roles.get('watch')?.surface).toBe('3d');
    expect(roles.get('watch')?.shared).toBe(true);
  });
});

describe('Die Schalttafel', () => {
  function open(): { view: PanelRoleView; round: FlatRound; host: ReturnType<typeof hostFor> } {
    const round = new FlatRound(21, { test: true });
    const host = hostFor(round);
    const view = stage(mountPanelView(host));
    view.update(0);
    return { view, round, host };
  }

  /**
   * **Karte ohne Wesen.** Die Zusage steht nicht in einem Kommentar, sondern
   * in den Schichten: Wer sie kippt, sieht sofort einen roten Test.
   */
  it('zeichnet die Station, aber niemanden darin', () => {
    const { view } = open();
    expect(view.map.current.layers.entities).toBe(false);
    expect(view.map.current.markers).toBe('none');
    expect(view.map.stats.rooms).toBeGreaterThan(0);
    expect(view.map.stats.entities).toBe(0);
  });

  it('sperrt eine Tür per Tipp und sagt, was passiert ist', () => {
    const { view, round } = open();
    const door = round.snapshot().doors[0]!;
    expect(round.state().shut).not.toContain(door.id);
    tapAt(view, door.at);
    expect(round.state().shut).toContain(door.id);
    expect(view.element.querySelector('.role__toast')?.textContent).toContain('verriegelt');
  });

  it('schaltet eine Lampe per Tipp', () => {
    const { view, round } = open();
    const light = round.snapshot().lights.find((one) => one.kind === 'lamp')!;
    const before = round.state().lit.includes(light.id);
    tapAt(view, light.at);
    expect(round.state().lit.includes(light.id)).toBe(!before);
  });

  /**
   * **Die Schalterliste ist weg** — der Besitzer wollte sie nicht: Wer die
   * Schalttafel hat, tippt Tür und Lampe auf der Karte an, und sonst nichts.
   * Kein Blatt, kein Knopf oben rechts, keine Kippschalter.
   */
  it('hat keine Schalterliste mehr — nur die Karte mit ihren Tipps', () => {
    const { view } = open();
    expect(view.element.querySelector('[data-panel-sheet]')).toBeNull();
    expect(view.element.querySelector('.role__sheet')).toBeNull();
    expect(view.element.querySelector('[data-switch]')).toBeNull();
    expect(view.element.classList.contains('is-sheet')).toBe(false);
    expect(view.element.querySelector('.role__hud')?.textContent).toContain(
      'Tür oder Lampe antippen',
    );
  });

  /**
   * **Ein Schott, das abkühlt, sagt es** (`rules/doorLocks.ts`): Vierzig
   * Sekunden, in denen ein Tipp wortlos nichts tut, sind für den Hacker eine
   * kaputte Karte — und ab da traut er ihr nicht mehr. Also steht es im Toast.
   */
  it('sagt an einem abkühlenden Schott, dass der Riegel noch warm ist', () => {
    const { view, round } = open();
    const door = round.snapshot().doors[0]!;
    round.lockDoor(door.id);
    round.lockDoor(door.id);
    round.step(0.1, { x: 0, z: 0, sprint: false });
    view.update(0);
    tapAt(view, door.at);
    expect(round.state().shut).not.toContain(door.id);
    expect(view.element.querySelector('.role__toast')?.textContent).toContain('noch warm');
  });
});

describe('Der Späher', () => {
  function open(): { view: ScoutRoleView; round: FlatRound } {
    const round = new FlatRound(21, { role: 'watch' });
    const host = hostFor(round);
    const view = stage(mountScoutView(host));
    return { view, round };
  }

  /**
   * **Alle dreieinhalb Sekunden eine Peilung, dazwischen nichts.** Der Punkt
   * bleibt stehen, wo er gemessen wurde — er wandert nicht mit. Genau daran
   * hängt, ob Verstecken eine Möglichkeit ist oder ein Umweg.
   */
  it('misst neu erst nach PING_PERIOD und rührt den Punkt dazwischen nicht an', () => {
    const { view, round } = open();
    view.update(0);
    const first = view.pings.map((ping) => ({ ...ping.at }));
    expect(first.length).toBeGreaterThan(0);
    // Die Runde läuft weiter — der Techniker-Bot bewegt sich.
    for (let t = 0; t < PING_PERIOD - 0.5; t += 0.1) {
      round.step(0.1, { x: 0, z: 0, sprint: false });
      view.update(0.1);
    }
    expect(view.pings.map((ping) => ({ ...ping.at }))).toEqual(first);
    expect(view.nextPing).toBeGreaterThan(0);
    for (let t = 0; t < 0.7; t += 0.1) {
      round.step(0.1, { x: 0, z: 0, sprint: false });
      view.update(0.1);
    }
    expect(view.nextPing).toBeGreaterThan(PING_PERIOD - 1);
    const moved = view.pings.map((ping) => ({ ...ping.at }));
    expect(moved).not.toEqual(first);
  });

  it('zeigt den Techniker und das Monster, sonst niemanden — und keine Marker der Karte', () => {
    const { view, round } = open();
    round.state().monsterOn = true;
    view.update(PING_PERIOD);
    expect(view.pings.map((ping) => ping.label)).toEqual(['Techniker', 'Monster']);
    expect(view.map.current.layers.entities).toBe(false);
    expect(view.map.current.layers.items).toBe(false);
  });
});

describe('Der Archivar', () => {
  function open(desk?: ArchiveDesk): { view: ArchiveRoleView; round: FlatRound } {
    const round = new FlatRound(21, { test: true });
    const host = hostFor(round, desk ? { archive: desk } : undefined);
    const view = stage(mountArchiveView(host));
    view.update(0);
    return { view, round };
  }

  /**
   * **Erst die Kiste, dann das Ziel** (`rules/archiveGoals.ts`). Solange die
   * Karte von jeder Kiste eine Linie zu ihrer Konsole zog, sagte der Archivar
   * die ganze Runde in einem Satz an und wurde danach nicht mehr gebraucht.
   * Jetzt gibt es die Linie genau für das Teil, das der Techniker trägt.
   */
  it('zieht keine Linie, bis der Techniker ein Teil trägt — dann genau eine', () => {
    const { view, round } = open();
    expect(routesOf(view)).toHaveLength(0);

    const repair = repairsFor(round.house)[0]!;
    round.state().taken.push(repair.itemId);
    round.state().crew.inventory.push(repair.itemId);
    view.update(0);
    const lines = routesOf(view);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.points).toHaveLength(2);

    // Abgeliefert: Auch die eine Linie ist wieder weg.
    round.state().crew.inventory.length = 0;
    round.state().done.push(repair.itemId);
    view.update(0);
    expect(routesOf(view)).toHaveLength(0);
  });

  it('zeigt keine Wesen und kein Licht — er weiß, wo etwas liegt, nicht wo es hell ist', () => {
    const { view } = open();
    expect(view.map.current.layers.entities).toBe(false);
    expect(view.map.current.layers.lights).toBe(false);
    expect(view.map.stats.entities).toBe(0);
    expect(view.map.stats.items).toBeGreaterThan(0);
  });

  /**
   * **Ein abgelegtes Teil sieht er erst, wenn es liegen bleibt**
   * (`DROPPED_SEEN`). Wer es im Laufen verliert und wieder aufhebt, hat es
   * nicht verloren; wer es ablegt und weggeht, schon.
   */
  it('meldet ein abgelegtes Teil erst nach DROPPED_SEEN Sekunden', () => {
    const { view, round } = open();
    const task = round.house.tasks[0]!;
    const room = round.house.rooms.find((one) => one.id !== task.roomId)!;
    const state = round.state();
    state.time = 100;
    state.taken.push(task.id);
    state.dropped = [
      {
        id: task.id,
        x: (room.rect.x + 0.5) * TILE,
        z: (room.rect.z + 0.5) * TILE,
        since: 100 - (DROPPED_SEEN - 1),
      },
    ];
    view.open(room.id);
    expect(view.element.querySelector('.role__sheet')?.textContent).not.toContain('Liegt hier');
    state.time = 100 + DROPPED_SEEN;
    view.update(0);
    expect(view.element.querySelector('.role__sheet')?.textContent).toContain('Liegt hier');
  });

  /**
   * **Der Freigabecode steht erst auf dem Blatt, wenn das Teil in der Hand
   * ist.** Vorher stünde die ganze zweite Hälfte der Runde von Anfang an da.
   */
  it('verrät den Code des Reparaturraums erst mit dem Teil in der Hand', () => {
    const { view, round } = open();
    const repair = repairsFor(round.house).find((one) => one.puzzle !== 'wires')!;
    view.open(repair.roomId);
    expect(view.element.querySelector('.role__sheet')?.textContent).not.toContain(
      repair.code.split('').join(' '),
    );
    round.state().taken.push(repair.itemId);
    round.state().crew.inventory.push(repair.itemId);
    view.update(0);
    expect(view.element.querySelector('.role__sheet')?.textContent).toContain(
      repair.code.split('').join(' '),
    );
  });

  /**
   * **Ein Tipp auf ein Zimmer schlägt die Raumakte auf** — ohne
   * Schutzschrank-Code: Den Schrank betritt man ohne einen, in beiden Welten.
   */
  it('öffnet die Raumakte mit den Codes und schließt sie wieder', () => {
    const { view, round } = open();
    const room = round.snapshot().rooms.find((one) => !one.circulation && !one.safe)!;
    tapAt(view, room.centre);
    expect(view.opened).toBe(room.id);
    const sheet = view.element.querySelector('.role__sheet')!;
    expect((sheet as HTMLElement).hidden).toBe(false);
    // **Ganzseitig, ohne Karte dahinter** — das war der Befund des Besitzers:
    // Unter dem Grundriss ließ sich die Akte nicht rollen.
    expect(view.element.classList.contains('is-sheet')).toBe(true);
    expect(sheet.textContent).toContain(room.name);
    expect(sheet.textContent).not.toMatch(/Schutzschrank-Code/);
    sheet.querySelector<HTMLButtonElement>('[data-close]')!.click();
    expect(view.opened).toBe('');
    expect((sheet as HTMLElement).hidden).toBe(true);
    expect(view.element.classList.contains('is-sheet')).toBe(false);
  });

  /**
   * **Zwei Bilder, eine Akte.** In der 3D-Welt macht die Akte ein Loch auf,
   * durch das die Welt das Zimmer zeichnet; in der 2D-Welt steht dort eine
   * herangezoomte Karte, und `viewport()` bleibt leer.
   */
  it('meldet ein Loch für die 3D-Welt — und ohne Kamera keines', () => {
    const calls: string[] = [];
    const desk: ArchiveDesk = {
      open: (id) => calls.push(`open:${id}`),
      view: () => ({ zoom: 1, x: 0, z: 0 }),
      zoom: (factor) => calls.push(`zoom:${factor}`),
      pan: () => calls.push('pan'),
      home: () => calls.push('home'),
    };
    const withDesk = open(desk);
    expect(withDesk.view.viewport()).toBeNull();
    const room = withDesk.round.snapshot().rooms[0]!;
    tapAt(withDesk.view, room.centre);
    expect(calls).toContain(`open:${room.id}`);
    expect(withDesk.view.viewport()).toEqual({ x: 0, y: 0, w: size.width, h: size.height });
    withDesk.view.element.querySelector<HTMLButtonElement>('[data-picture="in"]')!.click();
    expect(calls).toContain('zoom:1.4');

    const flat = open();
    tapAt(flat.view, flat.round.snapshot().rooms[0]!.centre);
    expect(flat.view.viewport()).toBeNull();
    expect(flat.view.element.querySelector('.role__closeup')).not.toBeNull();
    expect(flat.view.element.querySelector('[data-picture]')).toBeNull();
  });
});

/**
 * **Der Fernseher schlüpft in die Rollen der anderen** (`watchLens.ts`). Kein
 * Nachbau: Er schlägt die angemeldete Ansicht auf — nur mit einem Wirt, der
 * nichts schaltet.
 */
describe('Der Fernseher', () => {
  function open() {
    const round = new FlatRound(21, { test: true });
    const host = hostFor(round);
    const view = stage(mountWatchView(host));
    view.update(0);
    return { view, round, host };
  }

  it('fängt über dem Deck an und meldet dafür ein Loch für die 3D-Welt', () => {
    const { view } = open();
    expect(view.lens.seat).toBe('deck');
    expect(view.viewport?.()).toEqual({ x: 0, y: 0, w: size.width, h: size.height });
    expect(view.element.querySelector('.role__stage')?.hasAttribute('hidden')).toBe(true);
    const seats = [...view.element.querySelectorAll<HTMLElement>('[data-watch-seat]')].map(
      (key) => key.dataset['watchSeat'],
    );
    // Die Drohne ist gestrichen (#93) und steht auch hier nicht mehr.
    expect(seats).toEqual(['deck', 'archive', 'panel', 'scout', 'monster']);
  });

  it('schlägt die Ansicht eines Mitspielers auf und lässt sie nichts schalten', () => {
    const { view, round } = open();
    view.element.querySelector<HTMLButtonElement>('[data-watch-seat="panel"]')!.click();
    expect(view.lens.seat).toBe('panel');
    const panel = view.element.querySelector<HTMLElement>('.role--panel');
    expect(panel).not.toBeNull();
    // Dieselbe Karte, nur ohne Wirkung: Wer alles sieht und schalten dürfte,
    // wäre der fünfte Spieler mit den besten Karten. Der Wirt des Gastes gibt
    // auf `door` `''` zurück — ein Tipp auf die Karte sperrt nichts.
    expect(panel!.querySelector('[data-panel-sheet]')).toBeNull();
    const shut = [...round.state().shut];
    const canvas = panel!.querySelector<HTMLElement>('.mapview__canvas')!;
    for (const type of ['pointerdown', 'pointerup']) {
      const event = new Event(type, { bubbles: true }) as PointerEvent;
      Object.assign(event, { pointerId: 1, clientX: 200, clientY: 150, button: 0 });
      canvas.dispatchEvent(event);
    }
    expect(round.state().shut).toEqual(shut);
    // Und das Deck hat sein Bild verloren, solange ein fremder Platz offen ist.
    expect(view.element.classList.contains('is-guest')).toBe(true);
  });

  it('folgt auf Wunsch dem Techniker und gibt das Overlay „KI-Absichten" frei', () => {
    const { view } = open();
    expect(view.lens.follow).toBe('free');
    view.element.querySelector<HTMLButtonElement>('[data-watch-follow="technician"]')!.click();
    expect(view.lens.follow).toBe('technician');
    expect(view.lens.insight).toBe(false);
    view.element.querySelector<HTMLButtonElement>('[data-watch-insight]')!.click();
    expect(view.lens.insight).toBe(true);
    // „Wem folgen?" gehört zum Deck: Auf einem fremden Platz führt die Kamera
    // die Rolle, der er zusieht.
    view.element.querySelector<HTMLButtonElement>('[data-watch-seat="scout"]')!.click();
    expect(view.element.querySelector('[data-watch-follow]')).toBeNull();
  });

  /**
   * **Durch seine Augen** gibt es nur beim Techniker, dem man folgt — und
   * solange man durch sie sieht, fliegt niemand: Stock und Gesten ruhen.
   */
  it('bietet das Live-Bild nur beim Techniker an und legt dabei den Stock weg', () => {
    const { view } = open();
    expect(view.element.querySelector('[data-watch-eyes]')).toBeNull();
    const stick = view.element.querySelector<HTMLElement>('.role__watch-stick')!;
    expect(stick.hidden).toBe(false);
    view.element.querySelector<HTMLButtonElement>('[data-watch-follow="technician"]')!.click();
    const eyes = view.element.querySelector<HTMLButtonElement>('[data-watch-eyes]')!;
    expect(eyes).not.toBeNull();
    expect(view.lens.eyes).toBe(false);
    eyes.click();
    expect(view.lens.eyes).toBe(true);
    expect(view.element.querySelector<HTMLElement>('.role__watch-stick')!.hidden).toBe(true);
    // Zurück über das Deck: Der Stock liegt wieder da.
    view.element.querySelector<HTMLButtonElement>('[data-watch-eyes]')!.click();
    expect(view.lens.eyes).toBe(false);
    expect(view.element.querySelector<HTMLElement>('.role__watch-stick')!.hidden).toBe(false);
  });

  /**
   * **Ein Finger fliegt, zwei zoomen, das Rad zoomt** — auf dem Loch, in das
   * die Welt zeichnet. Und „Zurück über das Deck" vergisst beides.
   */
  it('fliegt mit dem Finger, zoomt mit zwei Fingern und dem Rad und findet nach Hause', () => {
    const { view } = open();
    const hole = view.element.querySelector<HTMLElement>('.role__hole')!;
    const pointer = (type: string, id: number, x: number, y: number): void => {
      const event = new Event(type, { bubbles: true }) as PointerEvent;
      Object.assign(event, { pointerId: id, clientX: x, clientY: y });
      hole.dispatchEvent(event);
    };
    pointer('pointerdown', 1, 100, 100);
    pointer('pointermove', 1, 64, 118);
    pointer('pointerup', 1, 64, 118);
    // Das Deck folgt dem Finger: nach links gezogen heißt nach Osten geflogen.
    expect(view.lens.pan.x).toBeCloseTo(2);
    expect(view.lens.pan.z).toBeCloseTo(-1);
    // Zwei Finger auseinander: näher heran.
    pointer('pointerdown', 1, 100, 100);
    pointer('pointerdown', 2, 200, 100);
    pointer('pointermove', 2, 300, 100);
    pointer('pointerup', 1, 100, 100);
    pointer('pointerup', 2, 300, 100);
    expect(view.lens.zoom).toBeCloseTo(2);
    hole.dispatchEvent(new WheelEvent('wheel', { deltaY: -500, bubbles: true, cancelable: true }));
    expect(view.lens.zoom).toBeGreaterThan(2);
    view.element.querySelector<HTMLButtonElement>('[data-watch-home]')!.click();
    expect(view.lens.zoom).toBe(1);
    expect(view.lens.pan).toEqual({ x: 0, z: 0 });
    // Auf einem fremden Platz ziehen die Gesten nichts mehr.
    view.element.querySelector<HTMLButtonElement>('[data-watch-seat="archive"]')!.click();
    pointer('pointerdown', 3, 100, 100);
    pointer('pointermove', 3, 50, 100);
    pointer('pointerup', 3, 50, 100);
    expect(view.lens.pan).toEqual({ x: 0, z: 0 });
  });
});

describe('Der Rollenstreifen über der 2D-Welt', () => {
  /** Eine Tafel: Rot hält die Schalttafel, Blau Archiv und Späher, Gelb nichts. */
  const table = (): RoundSetup => {
    let setup = withPower(defaultSetup(), 'red', 'panel', true);
    setup = withPower(setup, 'blue', 'archive', true);
    return withPower(setup, 'blue', 'scout', true);
  };

  /**
   * **Dieselben sieben Reiter wie auf dem Telefon** (`views/roleTabs.ts`):
   * die Plätze, nicht die Karten. Ein Farbplatz schlägt die eine Karte mit
   * allem auf, was er hält (`seatRole.ts`); **nichts wird neu aufgebaut** —
   * dieselbe Runde rechnet weiter, und die Rolle liest ihren Snapshot.
   */
  it('zeigt die sieben Plätze und legt einen Farbplatz über dieselbe laufende Runde', () => {
    const round = new FlatRound(21, { test: true });
    const host = hostFor(round);
    const changes: string[] = [];
    const picked: string[] = [];
    const strip = new RoleStrip({
      roleHost: () => host,
      setup: table,
      me: () => 'technician',
      onChange: (id) => changes.push(id),
      pick: (id) => picked.push(id),
    });
    document.body.append(strip.element, strip.stage);
    const keys = [...strip.element.querySelectorAll<HTMLButtonElement>('[data-role-strip]')];
    expect(keys.map((key) => key.dataset['roleStrip'])).toEqual([
      'technician',
      'red',
      'yellow',
      'blue',
      'monster',
      'watch:technician',
      'watch:all',
    ]);
    // Zweizeilig: der Platz, darunter, was er hält — so passen sieben ins Panel.
    expect(keys.map((key) => key.querySelector('strong')?.textContent)).toEqual([
      'Techniker',
      'Rot',
      'Gelb',
      'Blau',
      'Monster',
      'Zuschauer',
      'Zuschauer',
    ]);
    expect(keys[1]!.querySelector('small')?.textContent).toBe('Schalttafel');
    expect(keys[3]!.querySelector('small')?.textContent).toBe('Aufklärung');
    expect(keys[5]!.querySelector('small')?.textContent).toBe('Techniker');
    expect(keys[6]!.querySelector('small')?.textContent).toBe('Alles');
    expect(keys[0]!.classList.contains('is-mine')).toBe(true);
    expect(keys[0]!.classList.contains('is-active')).toBe(true);
    expect(strip.active).toBe('');

    strip.show('red');
    expect(strip.active).toBe('red');
    expect(changes).toEqual(['red']);
    expect(strip.stage.hidden).toBe(false);
    expect(strip.stage.querySelector('.role--seat')).not.toBeNull();
    expect(strip.stage.querySelector('.role--panel')).not.toBeNull();
    expect(strip.stage.querySelector('.role--archive')).toBeNull();
    strip.update(0);
    const before = round.state().time;
    round.step(0.1, { x: 0, z: 0, sprint: false });
    expect(round.state().time).toBeGreaterThan(before);

    // Blau hält zwei Fähigkeiten — beide auf einer Karte, die von Rot ist weg.
    strip.show('blue');
    expect(strip.active).toBe('blue');
    expect(strip.stage.querySelectorAll('.role--seat')).toHaveLength(1);
    expect(strip.stage.querySelector('.role--archive')).not.toBeNull();
    expect(strip.stage.querySelector('.role--scout')).not.toBeNull();
    expect(strip.stage.querySelector('.role--panel')).toBeNull();

    // Gelb hält nichts: kein leeres Blatt, sondern ein Satz.
    strip.show('yellow');
    expect(strip.active).toBe('blue');
    expect(host.said.at(-1)).toContain('Gelb hält keine Fähigkeit');

    // Techniker und Zuschauer schlagen nichts auf — sie gehen an den Wirt.
    strip.show('watch:all');
    expect(strip.active).toBe('');
    expect(strip.stage.hidden).toBe(true);
    expect(picked).toEqual(['watch:all']);
    strip.show('technician');
    expect(picked).toEqual(['watch:all', 'technician']);
    strip.dispose();
  });

  /**
   * **Mitten in einer Mission wechselt hier niemand die Rolle**
   * (`rules/roundSetup.switchRights`): Wer in 2D spielt, ist der Techniker und
   * steht im Anzug. In einer Test-Runde darf er alles — dafür ist sie da.
   * Zusehen und zurück an den Stock gehen immer.
   */
  it('lässt nur in einer Test-Runde wechseln und sagt sonst, warum nicht', () => {
    const round = new FlatRound(21, { test: false });
    const host = hostFor(round);
    const strip = new RoleStrip({
      roleHost: () => host,
      setup: table,
      me: () => 'technician',
      onChange: () => {},
      rights: () => {
        const rights = switchRights({
          test: round.state().crew.options.test,
          inCentre: false,
          vrTechnician: false,
        });
        return { allowed: rights.abilities, why: rights.why };
      },
    });
    document.body.append(strip.element, strip.stage);
    expect(strip.rights.allowed).toBe(false);
    const key = (id: string): HTMLButtonElement =>
      strip.element.querySelector<HTMLButtonElement>(`[data-role-strip="${id}"]`)!;
    expect(key('red').disabled).toBe(true);
    expect(key('red').title).toBe(NOT_IN_CENTRE);
    expect(key('monster').disabled).toBe(true);
    expect(key('technician').disabled).toBe(false);
    expect(key('watch:technician').disabled).toBe(false);
    strip.show('red');
    expect(strip.active).toBe('');

    round.state().crew.options.test = true;
    strip.show('red');
    expect(strip.active).toBe('red');
    strip.dispose();
  });
});

/** Die Linien, die der Archivar gerade auf die Karte legt. */
function routesOf(view: ArchiveRoleView): ReadonlyArray<{ points: unknown[] }> {
  const options = (view.map as unknown as { options: { routes?: () => unknown[] } }).options;
  return (options.routes?.() ?? []) as ReadonlyArray<{ points: unknown[] }>;
}

/**
 * **Ein Stuhl, eine Karte** (`seatRole.ts`): Was der Stuhl hält, liegt
 * zusammen auf einer `MapView` — die Schalttafel hört auf Türen und Lampen,
 * der Archivar auf Zimmer, der Späher malt seine Peilung. Keine Zeile zum
 * Blättern, keine drei Kästchen: eine Zeile oben, die alle nennt.
 */
describe('Ein Stuhl mit mehreren Fähigkeiten', () => {
  it('legt Schalttafel und Archiv auf eine Karte — Tür sperrt, Zimmer öffnet die Akte', () => {
    const round = new FlatRound(21, { test: true });
    const host = hostFor(round);
    const view = stage(mountSeatView(host, ['panel', 'archive']));
    view.update(0);
    expect(view.abilities).toEqual(['panel', 'archive']);
    expect(view.element.querySelectorAll('.mapview__canvas')).toHaveLength(1);
    expect(view.panel?.map).toBe(view.map);
    expect(view.archive?.map).toBe(view.map);
    expect(view.scout).toBeNull();
    // Die Vereinigung: Lampen (Schalttafel), Fracht (Archiv) — und niemand.
    expect(view.map.current.layers.lights).toBe(true);
    expect(view.map.current.layers.items).toBe(true);
    expect(view.map.current.layers.entities).toBe(false);
    expect(view.map.stats.entities).toBe(0);
    const bar = view.element.querySelector('.role__bar')?.textContent ?? '';
    expect(bar).toContain('SCHALTTAFEL');
    expect(bar).toContain('ARCHIV');
    expect(bar).not.toContain('SPÄHER');
    for (const hud of view.element.querySelectorAll<HTMLElement>('.role__hud'))
      expect(hud.hidden).toBe(true);

    const door = round.snapshot().doors[0]!;
    const shut = round.state().shut.length;
    tapAt(view, door.at);
    expect(round.state().shut.length).not.toBe(shut);

    // **Die Lampe sitzt in der Zimmermitte** — ein Tipp dort schaltet Licht
    // (die Schalttafel ist dran); ein Tipp daneben öffnet die Akte.
    const room = round.snapshot().rooms.find((one) => !one.circulation)!;
    const lamp = round.snapshot().lights.find((one) => one.id === room.id)!;
    const before = round.state().lit.includes(room.id);
    tapAt(view, lamp.at);
    expect(round.state().lit.includes(room.id)).toBe(!before);
    expect(view.sheetOpen).toBe(false);
    tapAt(view, freeSpot(view, round.snapshot(), room));
    expect(view.archive?.opened).toBe(room.id);
    expect(view.sheetOpen).toBe(true);
    expect(view.element.querySelector('.role--archive.is-sheet')).not.toBeNull();
  });

  it('ohne Schalttafel sagt die Karte, dass Türen niemand schaltet — und ohne Archiv nur den Raumnamen', () => {
    const round = new FlatRound(21, { test: true });
    const host = hostFor(round);
    const view = stage(mountSeatView(host, ['scout']));
    view.update(0);
    expect(view.map.current.layers.lights).toBe(false);
    expect(view.map.current.layers.items).toBe(false);
    const shut = round.state().shut.length;
    tapAt(view, round.snapshot().doors[0]!.at);
    expect(round.state().shut.length).toBe(shut);
    expect(view.element.querySelector('.role--seat > .role__toast')?.textContent).toContain(
      'Schalttafel',
    );
    const room = round.snapshot().rooms.find((one) => !one.circulation)!;
    tapAt(view, freeSpot(view, round.snapshot(), room));
    expect(view.sheetOpen).toBe(false);
    expect(view.element.querySelector('.role--seat > .role__toast')?.textContent).toBe(room.name);
    // Der Späher peilt auf der geteilten Karte wie auf seiner eigenen.
    expect(view.scout?.pings.map((ping) => ping.label)).toContain('Techniker');
  });
});

/**
 * Ein Punkt im Zimmer, an dem nichts anderes im Fangradius liegt — keine
 * Lampe, keine Tür, keine Fracht: Dort meint ein Tipp das Zimmer selbst.
 */
function freeSpot(
  view: { map: { toScreen(x: number, z: number): { x: number; y: number } } },
  snapshot: MapSnapshot,
  room: MapSnapshot['rooms'][number],
): { x: number; z: number } {
  const busy = [...snapshot.lights, ...snapshot.doors, ...snapshot.items].map((one) =>
    view.map.toScreen(one.at.x, one.at.z),
  );
  // Auf der kleinen Testkarte ist ein Meter ein paar Punkte: Die Kandidaten
  // liegen deshalb auf einem Drittel des Wegs von der Mitte zu den Ecken.
  const xs = room.polygon.map((point) => point.x);
  const zs = room.polygon.map((point) => point.z);
  const corners = [
    [Math.min(...xs), Math.min(...zs)],
    [Math.max(...xs), Math.min(...zs)],
    [Math.min(...xs), Math.max(...zs)],
    [Math.max(...xs), Math.max(...zs)],
  ];
  for (const share of [0.35, 0.55, 0.7]) {
    for (const [cx, cz] of corners) {
      const at = {
        x: room.centre.x + (cx! - room.centre.x) * share,
        z: room.centre.z + (cz! - room.centre.z) * share,
      };
      const p = view.map.toScreen(at.x, at.z);
      if (busy.every((b) => Math.hypot(b.x - p.x, b.y - p.y) > 20)) return at;
    }
  }
  return room.centre;
}
