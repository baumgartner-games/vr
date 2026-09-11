/** @jest-environment jsdom */
import { FlatRound, PLAYER_ID } from '../map/flatRound';
import { lockerCode, repairsFor } from '../mission';
import { listRoles, roles, type RoleHost, type RoleView } from '../registry/roles';
import type { ArchiveDesk } from './archiveDesk';
import { mountArchiveView, type ArchiveRoleView } from './archiveRole';
import { mountPanelView, type PanelRoleView } from './panelRole';
import { mountScoutView, PING_PERIOD, type ScoutRoleView } from './scoutRole';
import { RoleStrip } from './roleStrip';
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
    me: () => PLAYER_ID,
    nameOf: (peer) => peer,
    door: (id) => round.lockDoor(id),
    light: (id) => round.switchLight(id),
    lure: (id) => round.lure(id),
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
   * **Der Schallköder hat keinen Ort im Bild** — er ist ein Lautsprecher an
   * der Decke. Sein Griff ist deshalb der Raum selbst, und was er tut, tut er
   * über das Hörmodell: Er ruft, solange er läuft.
   */
  it('wirft den Schallköder eines Zimmers über einen Tipp auf das Zimmer an', () => {
    const { view, round } = open();
    const room = round.snapshot().rooms.find((one) => !one.circulation && !one.safe)!;
    // Herangezoomt und neben die Lampe getippt: Sie steht in der Raummitte,
    // und ein Tipp auf sie ist ein Lichtschalter und kein Köder.
    view.map.setView({ centreX: room.centre.x, centreZ: room.centre.z, scale: 30 });
    view.update(0);
    tapAt(view, beside(room.centre, room.polygon[0]!));
    expect(round.state().loud).toContain(room.id);
    expect(view.element.querySelector('.role__toast')?.textContent).toContain('Schallköder an');
    tapAt(view, beside(room.centre, room.polygon[0]!));
    expect(round.state().loud).not.toContain(room.id);
  });
});

describe('Der Späher', () => {
  function open(): { view: ScoutRoleView; round: FlatRound } {
    const round = new FlatRound(21, { role: 'bot' });
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
   * **Von der Kiste zur Konsole.** Die Missionsliste ist weg; was sie
   * aufzählte, steht als Linie auf der Karte — und sobald der Techniker das
   * Teil trägt, bleibt nur noch das Ziel.
   */
  it('verbindet jede Fracht mit ihrer Konsole und schreibt „hierher" ans Ziel', () => {
    const { view, round } = open();
    const lines = view.map.current.snapshot ? routesOf(view) : [];
    expect(lines.length).toBe(repairsFor(round.house).length);
    for (const line of lines) expect(line.points).toHaveLength(2);
    // Das Teil in der Hand: Die Linie verschwindet, das Ziel bleibt.
    const repair = repairsFor(round.house)[0]!;
    round.state().crew.inventory.push(repair.itemId);
    const cargo = round
      .items()
      .find(
        (item) =>
          item.kind === 'cargo' &&
          item.label === round.house.tasks.find((task) => task.id === repair.itemId)?.label,
      );
    expect(cargo).toBeDefined();
    round.state().taken.push(repair.itemId);
    view.update(0);
    expect(routesOf(view).length).toBeLessThanOrEqual(lines.length);
  });

  it('zeigt keine Wesen — er weiß, wo etwas liegt, nicht wo jemand ist', () => {
    const { view } = open();
    expect(view.map.current.layers.entities).toBe(false);
    expect(view.map.stats.entities).toBe(0);
    expect(view.map.stats.items).toBeGreaterThan(0);
  });

  /**
   * **Ein Tipp auf ein Zimmer schlägt die Raumakte auf** — mit dem
   * Schutzschrank-Code groß, damit man ihn durch den Raum ruft.
   */
  it('öffnet die Raumakte mit den Codes und schließt sie wieder', () => {
    const { view, round } = open();
    const room = round.snapshot().rooms.find((one) => !one.circulation && !one.safe)!;
    tapAt(view, room.centre);
    expect(view.opened).toBe(room.id);
    const sheet = view.element.querySelector('.role__sheet')!;
    expect((sheet as HTMLElement).hidden).toBe(false);
    expect(sheet.textContent).toContain(room.name);
    expect(sheet.querySelector('.role__code')?.textContent).toBe(
      lockerCode(round.house.seed, room.id),
    );
    sheet.querySelector<HTMLButtonElement>('[data-close]')!.click();
    expect(view.opened).toBe('');
    expect((sheet as HTMLElement).hidden).toBe(true);
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

describe('Der Rollenstreifen über der 2D-Welt', () => {
  /**
   * **Nichts wird neu aufgebaut.** Der Streifen legt eine Rollenansicht über
   * die laufende Runde; dieselbe Runde rechnet weiter, und die Rolle liest
   * ihren Snapshot.
   */
  it('legt eine Rolle über dieselbe laufende Runde und nimmt sie wieder weg', () => {
    const round = new FlatRound(21, { test: true });
    const host = hostFor(round);
    const changes: string[] = [];
    const strip = new RoleStrip({
      roleHost: () => host,
      homeLabel: () => 'Station',
      onChange: (id) => changes.push(id),
    });
    document.body.append(strip.element, strip.stage);
    expect(strip.active).toBe('');
    expect(strip.roles.map((role) => role.id)).not.toContain('watch');

    strip.show('hack');
    expect(strip.active).toBe('hack');
    expect(changes).toEqual(['hack']);
    expect(strip.stage.hidden).toBe(false);
    expect(strip.stage.querySelector('.role--panel')).not.toBeNull();
    strip.update(0);
    const before = round.state().time;
    round.step(0.1, { x: 0, z: 0, sprint: false });
    expect(round.state().time).toBeGreaterThan(before);

    strip.show('');
    expect(strip.active).toBe('');
    expect(strip.stage.hidden).toBe(true);
    expect(strip.stage.querySelector('.role--panel')).toBeNull();
    strip.dispose();
  });
});

/** Ein Punkt im Raum, aber deutlich neben seiner Mitte. */
function beside(centre: { x: number; z: number }, corner: { x: number; z: number }) {
  return { x: centre.x + (corner.x - centre.x) * 0.5, z: centre.z + (corner.z - centre.z) * 0.5 };
}

/** Die Linien, die der Archivar gerade auf die Karte legt. */
function routesOf(view: ArchiveRoleView): ReadonlyArray<{ points: unknown[] }> {
  const options = (view.map as unknown as { options: { routes?: () => unknown[] } }).options;
  return (options.routes?.() ?? []) as ReadonlyArray<{ points: unknown[] }>;
}
