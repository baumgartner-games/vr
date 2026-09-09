/** @jest-environment jsdom */
import { FlatRound, MONSTER_ID, PLAYER_ID } from '../map/flatRound';
import { lockerCode, repairsFor } from '../mission';
import { roomOf } from '../house';
import type { RoleHost } from '../registry/roles';
import { ArchiveRole } from './archive';
import { PanelRole } from './panel';
import { ScoutRole, SCOUT_FLOOR, SCOUT_PERIOD } from './scout';
import { radioSwitch } from './switchState';
import { roundHost } from './testRoles';

/**
 * Alle drei Geräte werden **headless über die 2D-Welt** geprüft: Eine
 * `FlatRound` ist die laufende Runde, `roundHost` der Host, und die Karte
 * zeichnet in einen nachgebauten Canvas-Kontext, der nur mitschreibt.
 */
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

const STEP = 1 / 30;

function run(round: FlatRound, seconds: number): void {
  for (let t = 0; t < seconds; t += STEP) round.step(STEP, { x: 0, z: 0, sprint: false });
}

describe('Die Schalttafel auf der Karte', () => {
  it('zeigt weder Techniker noch Monster, schaltet aber Türen und Lampen per Tipp', () => {
    const round = new FlatRound(5);
    const view = new PanelRole(roundHost(round));
    document.body.append(view.element);
    view.update(0);
    expect(view.map.stats.entities).toBe(0);
    expect(view.map.stats.items).toBe(0);
    expect(view.map.stats.rooms).toBeGreaterThan(0);
    expect(document.querySelector('[data-flip]')).toBeNull();

    const door = round.snapshot().doors[0]!;
    expect(round.state().shut).not.toContain(door.id);
    view.map.setView({ centreX: door.at.x, centreZ: door.at.z, scale: 30 });
    const d = view.map.toScreen(door.at.x, door.at.z);
    view.map.tap(d.x, d.y);
    expect(round.state().shut).toContain(door.id);
    // Die Runde rechnet ihren Snapshot je Schritt; erst danach sieht die Karte die Sperre.
    run(round, STEP);
    view.update(STEP);
    expect(view.map.current.snapshot.doors.find((one) => one.id === door.id)?.locked).toBe(true);
    view.map.tap(d.x, d.y);
    expect(round.state().shut).not.toContain(door.id);
    run(round, STEP);

    const lamp = round.snapshot().lights.find((light) => light.kind === 'lamp')!;
    expect(round.state().lit).toContain(lamp.roomId);
    view.map.setView({ centreX: lamp.at.x, centreZ: lamp.at.z, scale: 30 });
    const l = view.map.toScreen(lamp.at.x, lamp.at.z);
    view.map.tap(l.x, l.y);
    expect(round.state().lit).not.toContain(lamp.roomId);
    run(round, STEP);
    view.update(STEP);
    expect(view.map.current.snapshot.lights.find((one) => one.id === lamp.id)?.on).toBe(false);
    view.dispose();
  });

  it('schaltet das Radio eines Zimmers mit einem Tipp neben die Lampe', () => {
    const round = new FlatRound(5);
    const spec = round.spec();
    const room = round.snapshot().rooms.find((one) => radioSwitch(spec, one.id))!;
    const view = new PanelRole(roundHost(round));
    view.update(0);
    // Die Lampe hängt in der Mitte; ein Meter daneben ist nur noch das Zimmer.
    view.map.setView({ centreX: room.centre.x, centreZ: room.centre.z, scale: 30 });
    const p = view.map.toScreen(room.centre.x + 1.2, room.centre.z);
    view.map.tap(p.x, p.y);
    expect(round.state().loud).toContain(room.id);
    run(round, STEP);
    view.update(STEP);
    view.map.tap(p.x, p.y);
    expect(round.state().loud).not.toContain(room.id);
    view.dispose();
  });
});

describe('Der Späher auf der Karte', () => {
  it('lässt die Punkte nur alle paar Sekunden springen und dazwischen verblassen', () => {
    const round = new FlatRound(5);
    run(round, 1);
    const view = new ScoutRole(roundHost(round));
    view.update(0);
    // Die Karte selbst zeichnet keine Wesen — die Punkte kommen vom Späher.
    expect(view.map.stats.entities).toBe(0);
    const first = view.markers();
    expect(first.map((m) => m.kind).sort()).toEqual(['monster', 'player']);
    expect(first.every((m) => m.glow === 1)).toBe(true);
    const monster = first.find((m) => m.kind === 'monster')!;
    expect(monster.at).toEqual({ x: round.monster.x, z: round.monster.z });

    // Das Monster geht weiter, der Punkt bleibt stehen und wird blasser.
    run(round, 2);
    view.update(2);
    const held = view.markers().find((m) => m.kind === 'monster')!;
    expect(held.at).toEqual(monster.at);
    expect(held.glow).toBeCloseTo(1 - 2 / SCOUT_PERIOD, 6);
    expect(
      Math.hypot(round.monster.x - monster.at.x, round.monster.z - monster.at.z),
    ).toBeGreaterThan(0.5);

    // Keine Zwischenposition: bis zur Peilung dieselbe Stelle.
    run(round, 1);
    view.update(1);
    expect(view.markers().find((m) => m.kind === 'monster')!.at).toEqual(monster.at);

    // Die Peilung: Sprung auf die aktuelle Stelle, wieder hell.
    run(round, 1);
    view.update(1);
    const next = view.markers().find((m) => m.kind === 'monster')!;
    expect(next.glow).toBe(1);
    expect(next.at).toEqual({ x: round.monster.x, z: round.monster.z });
    expect(next.at).not.toEqual(monster.at);
    expect(view.markers().find((m) => m.id === PLAYER_ID)).toBeDefined();
    expect(next.id).toBe(MONSTER_ID);
    expect(SCOUT_FLOOR).toBeGreaterThan(0);
    view.dispose();
  });

  it('hat ohne Monster nur den grünen Punkt', () => {
    const round = new FlatRound(5, { test: true });
    const view = new ScoutRole(roundHost(round));
    view.update(0);
    expect(view.markers().map((m) => m.kind)).toEqual(['player']);
    expect(view.element.textContent).toContain('Kein Monster aktiv');
    view.dispose();
  });
});

describe('Der Archivar auf der Karte', () => {
  it('führt von jeder Fracht zu ihrem Zielraum und zeigt, was der Techniker schon trägt', () => {
    const round = new FlatRound(5, { test: true });
    const view = new ArchiveRole(roundHost(round));
    view.update(0);
    expect(view.map.stats.entities).toBe(0);
    expect(view.map.stats.items).toBeGreaterThan(0);
    const repairs = repairsFor(round.spec());
    const routes = view.routes();
    expect(routes.map((r) => r.id).sort()).toEqual(repairs.map((r) => r.id).sort());
    for (const route of routes) {
      const repair = repairs.find((r) => r.id === route.id)!;
      const cargo = round
        .snapshot()
        .items.find(
          (item) =>
            item.kind === 'cargo' &&
            item.roomId === round.spec().tasks.find((t) => t.id === repair.itemId)!.roomId,
        )!;
      const console = round
        .snapshot()
        .items.find((item) => item.kind === 'console' && item.roomId === repair.roomId)!;
      expect(route.points).toEqual([cargo.at, console.at]);
      expect(route.goal).toBe(true);
    }

    // Beim Techniker: kein Weg mehr von der Fracht, nur noch das Ziel.
    const carried = repairs[0]!;
    round.state().taken.push(carried.itemId);
    round.state().crew.inventory.push(carried.itemId);
    run(round, STEP);
    view.update(STEP);
    const goal = view.routes().find((r) => r.id === carried.id)!;
    expect(goal.points[0]).toEqual(goal.points[1]);
    // Geliefert: nichts mehr.
    round.state().done.push(carried.itemId);
    run(round, STEP);
    view.update(STEP);
    expect(view.routes().map((r) => r.id)).not.toContain(carried.id);
    expect(view.element.textContent).toContain('2 Teile noch');
    view.dispose();
  });

  it('schlägt auf einen Tipp die Akte des Zimmers auf — mit den Codes groß und ohne Missionsliste', () => {
    const round = new FlatRound(5, { test: true });
    const view = new ArchiveRole(roundHost(round));
    document.body.append(view.element);
    view.update(0);
    const repair = repairsFor(round.spec()).find((one) => one.puzzle !== 'wires')!;
    const room = round.snapshot().rooms.find((one) => one.id === repair.roomId)!;
    view.map.setView({ centreX: room.centre.x, centreZ: room.centre.z, scale: 30 });
    const p = view.map.toScreen(room.centre.x, room.centre.z);
    view.map.tap(p.x, p.y);
    expect(view.selected).toBe(room.id);
    view.update(STEP);
    const codes = view.element.querySelector('.role-archive__codes')!;
    expect(codes.textContent).toContain(lockerCode(round.spec().seed, room.id));
    expect(codes.textContent).toContain(repair.code);
    expect(view.element.querySelector('.role-archive__title')?.textContent).toContain(room.name);
    expect(view.element.querySelector('.haunt__tasks')).toBeNull();
    expect(view.element.querySelector('[data-archive-tab]')).toBeNull();
    // In der 2D-Welt zeichnet die Akte das Zimmer selbst: kein Loch für die 3D-Welt.
    expect(view.viewport()).toBeNull();
    expect(view.roomMap.element.parentElement).not.toBeNull();
    expect(view.roomMap.getView().centreX).toBeCloseTo(room.centre.x);

    (view.element.querySelector('[data-back]') as HTMLButtonElement).click();
    expect(view.selected).toBe('');
    view.dispose();
  });

  it('gibt der 3D-Welt ein Loch und reicht Zoom und Wisch an sie weiter', () => {
    const round = new FlatRound(5, { test: true });
    const showRoom = jest.fn();
    const archiveZoom = jest.fn();
    const archivePan = jest.fn();
    const base = roundHost(round);
    const host: RoleHost = {
      ...base,
      snapshot: () => ({ ...round.snapshot(), source: '3d' }),
      extra: {
        spec: () => round.spec(),
        state: () => round.state(),
        showRoom,
        archiveView: () => ({ zoom: 1, x: 0, z: 0 }),
        archiveZoom,
        archivePan,
        archiveHome: () => {},
      },
    };
    const view = new ArchiveRole(host);
    document.body.append(view.element);
    view.update(0);
    const room = round.snapshot().rooms.find((one) => roomOf(round.spec(), one.id))!;
    view.open(room.id);
    view.update(STEP);
    expect(showRoom).toHaveBeenLastCalledWith(room.id);
    expect(view.viewport()).toEqual({ x: 0, y: 0, w: 400, h: 300 });
    expect(view.roomMap.element.parentElement).toBeNull();

    const scan = view.element.querySelector<HTMLElement>('.role-archive__scan')!;
    const wheel = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
    scan.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);
    expect(archiveZoom).toHaveBeenCalled();
    const pointer = (type: string, id: number, x: number, y: number) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
      });
      Object.defineProperty(event, 'pointerId', { value: id });
      scan.dispatchEvent(event);
    };
    pointer('pointerdown', 1, 100, 100);
    pointer('pointermove', 1, 140, 130);
    pointer('pointerup', 1, 140, 130);
    expect(archivePan).toHaveBeenCalledWith(0.1, 0.1);
    (view.element.querySelector('[data-zoom="in"]') as HTMLButtonElement).click();
    expect(archiveZoom).toHaveBeenLastCalledWith(1.4);
    view.close();
    expect(showRoom).toHaveBeenLastCalledWith('');
    view.dispose();
  });
});
