/** @jest-environment jsdom */
import { MapView, PANEL_LAYERS } from './mapView';
import { FlatRound, MONSTER_ID, PLAYER_ID } from './flatRound';
import { defaultSetup, type RoundSetup } from '../rules/roundSetup';
import { emptyField } from './visibility';
import { DROP_FADE } from '../rules/blood';

function fakeContext(): CanvasRenderingContext2D {
  const calls: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, key: string) => {
      if (key === 'calls') return calls;
      if (key in target) return target[key];
      return (..._args: unknown[]) => {
        calls.push(key);
      };
    },
    set: (target, key: string, value) => {
      target[key] = value;
      return true;
    },
  });
  return ctx as unknown as CanvasRenderingContext2D;
}

let ctx: CanvasRenderingContext2D;
beforeEach(() => {
  ctx = fakeContext();
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ctx) as never;
  HTMLCanvasElement.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0 }) as DOMRect;
});

function pointer(view: MapView, type: string, id: number, x: number, y: number): void {
  const event = new Event(type, { bubbles: true }) as PointerEvent;
  Object.assign(event, { pointerId: id, clientX: x, clientY: y });
  view.canvas.dispatchEvent(event);
}

describe('MapView', () => {
  it('umrandet bei Kistengenauigkeit die Kiste und bei Raumgenauigkeit den Raum — nie einen Ring', () => {
    const view = (round: FlatRound): { view: MapView; calls: string[] } => {
      const one = new MapView({ objectives: () => round.objectives() });
      one.setSnapshot(round.snapshot());
      one.setVisibility(round.field);
      one.setView({ centreX: round.objectives()[0]!.at.x, centreZ: round.objectives()[0]!.at.z });
      (ctx as unknown as { calls: string[] }).calls.length = 0;
      one.draw();
      return { view: one, calls: [...(ctx as unknown as { calls: string[] }).calls] };
    };
    const solo = view(new FlatRound(7, { test: true, setup: defaultSetup() }));
    expect(solo.view.stats.goals).toBe(3);
    const human: RoundSetup = {
      ...defaultSetup(),
      abilities: { scout: 'off', panel: 'off', archive: 'human' },
    };
    const crew = view(new FlatRound(7, { test: true, setup: human }));
    expect(crew.view.stats.goals).toBe(3);
    // Beide zeichnen dieselbe Zahl Ziele, aber nicht dasselbe Bild: Der
    // Kistenkasten ist ein abgerundetes Rechteck, der Raum sein Umriss.
    expect(solo.calls.filter((c) => c === 'quadraticCurveTo').length).toBeGreaterThan(
      crew.calls.filter((c) => c === 'quadraticCurveTo').length,
    );
    // Und keiner der beiden legt dafür einen Ring an: gleich viele Kreise in
    // beiden Bildern, obwohl das eine drei Kisten und das andere drei Räume
    // hervorhebt.
    const rings = (calls: string[]): number => calls.filter((c) => c === 'arc').length;
    expect(rings(solo.calls)).toBe(rings(crew.calls));
  });

  it('passt die Station beim ersten Bild ins Fenster und rechnet hin und zurück', () => {
    const round = new FlatRound(5, { test: true });
    const view = new MapView();
    view.setSnapshot(round.snapshot());
    view.setVisibility(round.field);
    view.draw();
    const state = view.getView();
    const b = round.snapshot().bounds;
    expect(state.centreX).toBeCloseTo((b.minX + b.maxX) / 2);
    const corner = view.toScreen(b.minX, b.minZ);
    expect(corner.x).toBeGreaterThanOrEqual(0);
    expect(corner.y).toBeGreaterThanOrEqual(0);
    const back = view.toWorld(corner.x, corner.y);
    expect(back.x).toBeCloseTo(b.minX);
    expect(back.z).toBeCloseTo(b.minZ);
    expect(view.stats.rooms).toBe(round.snapshot().rooms.length);
    expect(view.stats.entities).toBe(1);
  });

  it('passt das Haus auch auf ein schmales Telefon, unter der festen Untergrenze', () => {
    HTMLCanvasElement.prototype.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 360,
        height: 640,
        right: 360,
        bottom: 640,
        x: 0,
        y: 0,
      }) as DOMRect;
    const round = new FlatRound(5, { test: true });
    const view = new MapView({ minScale: 6, maxScale: 60 });
    view.setSnapshot(round.snapshot());
    view.follow(PLAYER_ID);
    view.setView({ scale: 22 });
    view.follow(PLAYER_ID);
    view.draw();
    // Hundert Meter Haus bei 6 Punkten je Meter wären 600 Punkte auf 360.
    view.zoomAt(0.01, 180, 320);
    const fit = view.fitScale();
    expect(fit).toBeLessThan(6);
    expect(view.getView().scale).toBeCloseTo(fit);
    view.draw();
    const b = round.snapshot().bounds;
    const tl = view.toScreen(b.minX, b.minZ),
      br = view.toScreen(b.maxX, b.maxZ);
    expect(tl.x).toBeGreaterThanOrEqual(0);
    expect(tl.y).toBeGreaterThanOrEqual(0);
    expect(br.x).toBeLessThanOrEqual(360);
    expect(br.y).toBeLessThanOrEqual(640);
    // `fit()` kommt auf denselben Maßstab.
    view.fit();
    view.draw();
    expect(view.getView().scale).toBeCloseTo(fit);
  });

  it('zeichnet für die Schalttafel keine Marker und keine Items', () => {
    const round = new FlatRound(5);
    const view = new MapView({ layers: PANEL_LAYERS });
    view.setSnapshot(round.snapshot());
    view.draw();
    expect(view.stats.entities).toBe(0);
    expect(view.stats.items).toBe(0);
    expect(view.stats.rooms).toBeGreaterThan(0);
  });

  it('drosselt Marker auf die gewünschte Rate', () => {
    const round = new FlatRound(5);
    round.setMode('omniscient');
    round.step(1 / 30, { x: 0, z: 0, sprint: false });
    let clock = 0;
    const view = new MapView({
      markers: { hz: 2 },
      now: () => clock,
      layers: { visibility: false },
    });
    view.setSnapshot(round.snapshot());
    view.draw();
    const first = round.monster.x;
    for (let i = 0; i < 30; i++) round.step(1 / 30, { x: 0, z: 0, sprint: false });
    view.setSnapshot(round.snapshot());
    clock = 200;
    view.draw();
    const seen = () => view.current.snapshot.entities.find((e) => e.id === MONSTER_ID)!.at.x;
    // Der Snapshot ist neu, aber der gezeichnete Marker noch der alte.
    expect(seen()).not.toBe(first);
    clock = 600;
    view.draw();
    expect(view.stats.entities).toBe(2);
    expect(view.current.markers).toEqual({ hz: 2 });
  });

  it('folgt dem Spieler, bis der Nutzer zieht', () => {
    const round = new FlatRound(5, { test: true });
    const view = new MapView();
    view.setSnapshot(round.snapshot());
    view.follow(PLAYER_ID);
    view.draw();
    expect(view.getView().centreX).toBeCloseTo(round.player.x);
    pointer(view, 'pointerdown', 1, 100, 100);
    pointer(view, 'pointermove', 1, 140, 100);
    pointer(view, 'pointerup', 1, 140, 100);
    expect(view.current.following).toBeNull();
    expect(view.getView().centreX).toBeLessThan(round.player.x);
  });

  it('zoomt mit zwei Fingern um die Mitte und meldet es', () => {
    const view = new MapView({ view: { centreX: 0, centreZ: 0, scale: 10 } });
    const changes: number[] = [];
    const listening = new MapView({
      view: { centreX: 0, centreZ: 0, scale: 10 },
      onViewChange: (v) => changes.push(v.scale),
    });
    for (const one of [view, listening]) {
      pointer(one, 'pointerdown', 1, 150, 150);
      pointer(one, 'pointerdown', 2, 250, 150);
      pointer(one, 'pointermove', 1, 100, 150);
      pointer(one, 'pointermove', 2, 300, 150);
      pointer(one, 'pointerup', 1, 100, 150);
      pointer(one, 'pointerup', 2, 300, 150);
    }
    expect(view.getView().scale).toBeCloseTo(20);
    expect(changes.at(-1)).toBeCloseTo(20);
  });

  it('meldet einen Tipp auf ein Wesen, ein Item, eine Tür oder einen Raum', () => {
    const round = new FlatRound(5, { test: true });
    round.setMode('omniscient');
    round.step(1 / 30, { x: 0, z: 0, sprint: false });
    const hits: string[] = [];
    const view = new MapView({
      view: { centreX: round.player.x, centreZ: round.player.z, scale: 30 },
      onEntityClick: (id) => hits.push(`entity:${id}`),
      onItemClick: (id) => hits.push(`item:${id}`),
      onDoorClick: (id) => hits.push(`door:${id}`),
      onRoomClick: (id) => hits.push(`room:${id}`),
      onGroundClick: () => hits.push('ground'),
    });
    view.setSnapshot(round.snapshot());
    view.setVisibility(round.field);
    view.draw();
    const me = view.toScreen(round.player.x, round.player.z);
    view.tap(me.x, me.y);
    const item = round.snapshot().items.find((i) => i.kind === 'cargo')!;
    view.setView({ centreX: item.at.x, centreZ: item.at.z, scale: 30 });
    const at = view.toScreen(item.at.x, item.at.z);
    view.tap(at.x + 3, at.y + 3);
    const door = round.snapshot().doors[0]!;
    view.setView({ centreX: door.at.x, centreZ: door.at.z, scale: 30 });
    const d = view.toScreen(door.at.x, door.at.z);
    view.tap(d.x, d.y);
    const room = round.snapshot().rooms[0]!;
    view.setView({ centreX: room.centre.x, centreZ: room.centre.z, scale: 30 });
    const r = view.toScreen(room.centre.x, room.centre.z);
    view.tap(r.x, r.y);
    view.setView({ centreX: -500, centreZ: -500, scale: 30 });
    view.tap(10, 10);
    expect(hits).toEqual([
      `entity:${PLAYER_ID}`,
      `item:${item.id}`,
      `door:${door.id}`,
      `room:${room.id}`,
      'ground',
    ]);
  });
  it('zeichnet Geräuschwellen — aber nicht die eigenen, wenn man das Monster ist', () => {
    const round = new FlatRound(5, { roll: 1 });
    round.mode = 'omniscient';
    // Ein paar Schritte des Spielers: das sind Wellen auf der Karte.
    for (let i = 0; i < 30; i++) round.step(1 / 30, { x: 0, z: 1, sprint: false });
    const snapshot = round.snapshot();
    expect((snapshot.noises ?? []).some((noise) => noise.by === PLAYER_ID)).toBe(true);

    const seen = (viewerId: string) => {
      const view = new MapView({ viewerId, mode: 'omniscient' });
      document.body.append(view.element);
      view.setSnapshot(snapshot);
      view.setVisibility(round.field);
      view.setView({ centreX: round.player.x, centreZ: round.player.z, scale: 20 });
      view.draw();
      const count = view.stats.noises;
      view.dispose();
      return count;
    };
    // Der Techniker sieht seine eigenen Schritte (blau: „das war ich").
    expect(seen(PLAYER_ID)).toBeGreaterThan(0);
    // Das Monster sieht die des Technikers …
    expect(seen(MONSTER_ID)).toBeGreaterThan(0);
    // … aber nicht seine eigenen: Man hört sich nicht selbst zu.
    const own = round.snapshot();
    own.noises = (own.noises ?? []).map((noise) => ({ ...noise, by: MONSTER_ID }));
    const view = new MapView({ viewerId: MONSTER_ID, mode: 'omniscient' });
    document.body.append(view.element);
    view.setSnapshot(own);
    view.setVisibility(round.field);
    view.setView({ centreX: round.player.x, centreZ: round.player.z, scale: 20 });
    view.draw();
    expect(view.stats.noises).toBe(0);
    view.dispose();
  });
});

describe('Spur und Erinnerung auf der Karte', () => {
  /** Eine Runde mit zwei Tropfen und beiden Markern im Stand. */
  function marked(): FlatRound {
    // Ohne Testmodus, damit es ein Monster gibt: Wessen Karte das ist, liest
    // die Ansicht an der Sorte des Betrachters ab.
    const round = new FlatRound(5);
    const s = round.state();
    // In die Liste der Runde hineinschreiben und nicht daneben: `state().blood`
    // *ist* `round.blood.drops` (`rules/blood.ts`).
    round.blood.drops.push(
      { x: round.player.x, z: round.player.z, since: s.time },
      { x: round.player.x + 1.5, z: round.player.z, since: s.time },
    );
    s.ghosts.monster = { x: round.player.x + 3, z: round.player.z, yaw: 0, since: s.time };
    s.ghosts.technician = { x: round.player.x - 3, z: round.player.z, yaw: 1, since: s.time };
    // Ein Schritt, damit der Snapshot neu gerechnet wird.
    round.step(1 / 30, { x: 0, z: 0, sprint: false });
    return round;
  }

  function drawn(round: FlatRound, viewerId: string, mode: 'realistic' | 'omniscient'): MapView {
    const view = new MapView({ mode, viewerId });
    view.setSnapshot(round.snapshot());
    // Ein leeres Sichtfeld heißt: Niemand ist gerade zu sehen — genau der
    // Fall, für den es die Marker gibt.
    view.setVisibility(emptyField(mode));
    view.setView({ centreX: round.player.x, centreZ: round.player.z, scale: 20 });
    view.draw();
    return view;
  }

  it('malt die Tropfen der Spur und zählt sie', () => {
    const round = marked();
    expect(drawn(round, PLAYER_ID, 'omniscient').stats.drops).toBe(2);
    // Verblasst ist verblasst: dieselben Tropfen, nur `DROP_FADE` älter.
    for (const drop of round.blood.drops) drop.since -= DROP_FADE + 1;
    expect(drawn(round, PLAYER_ID, 'omniscient').stats.drops).toBe(0);
  });

  /**
   * Dieselbe Regel wie überall (`rules/ghosts.ghostsToDraw`): „Alles sehen"
   * zeigt beide Marker, „Realitätsnah" nur den des anderen.
   */
  it('zeigt dem Zuschauer beide Marker und jedem Spieler nur den des anderen', () => {
    const round = marked();
    expect(drawn(round, PLAYER_ID, 'omniscient').stats.ghosts).toBe(2);
    expect(drawn(round, MONSTER_ID, 'realistic').stats.ghosts).toBe(1);
    expect(drawn(round, PLAYER_ID, 'realistic').stats.ghosts).toBe(1);
  });
});
