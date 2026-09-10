/** @jest-environment jsdom */
import {
  FlatScene,
  WALL_H,
  WALL_LIFTS,
  scaleForWidth,
  DEFAULT_SCALE,
  PHONE_SCALE,
} from './flatScene';
import { SPRITE_H } from './flatArt';
import { FlatRound, MONSTER_ID, PLAYER_ID } from './flatRound';
import { emptySnapshot, type MapEntity, type MapSnapshot } from './mapSnapshot';
import { emptyField, type VisibilityField } from './visibility';

/** Ein Kontext, der mitschreibt — Methodenaufrufe und gesetzte Eigenschaften. */
interface Call {
  name: string;
  args: unknown[];
}

function fakeContext(calls: Call[]): CanvasRenderingContext2D {
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, key: string) => {
      if (key in target) return target[key];
      return (...args: unknown[]) => {
        calls.push({ name: key, args });
      };
    },
    set: (target, key: string, value) => {
      target[key] = value;
      calls.push({ name: `set:${key}`, args: [value] });
      return true;
    },
  });
  return ctx as unknown as CanvasRenderingContext2D;
}

let calls: Call[];
beforeEach(() => {
  calls = [];
  HTMLCanvasElement.prototype.getContext = jest.fn(() => fakeContext(calls)) as never;
  HTMLCanvasElement.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0 }) as DOMRect;
});

const named = (name: string) => calls.filter((c) => c.name === name);

function entity(id: string, x: number, z: number, kind: MapEntity['kind'] = 'player'): MapEntity {
  return {
    id,
    kind,
    label: id,
    at: { x, z },
    yaw: 0,
    roomId: 'r',
    concealed: false,
    moving: false,
    sprinting: false,
    held: '',
  };
}

/** Ein Raum von 10 × 10 m mit einer Wand quer durch die Mitte (entlang x bei z = 5). */
function room(): MapSnapshot {
  const s = emptySnapshot();
  s.seed = 1;
  s.bounds = { minX: 0, minZ: 0, maxX: 10, maxZ: 10 };
  s.rooms.push({
    id: 'r',
    name: 'Navigation',
    polygon: [
      { x: 0, z: 0 },
      { x: 0, z: 10 },
      { x: 10, z: 10 },
      { x: 10, z: 0 },
    ],
    centre: { x: 5, z: 5 },
    circulation: false,
    lit: true,
    safe: false,
  });
  s.walls.push({ a: { x: 0, z: 5 }, b: { x: 10, z: 5 }, kind: 'wall', roomId: 'r' });
  return s;
}

function omniscient(): VisibilityField {
  const f = emptyField('omniscient');
  f.litRooms = ['r'];
  return f;
}

describe('FlatScene', () => {
  it('folgt dem Spieler und rechnet Bild und Welt hin und zurück', () => {
    const round = new FlatRound(5, { test: true });
    const scene = new FlatScene();
    scene.setSnapshot(round.snapshot());
    scene.setVisibility(round.field);
    scene.follow(PLAYER_ID);
    scene.draw();
    const view = scene.getView();
    expect(view.centreX).toBeCloseTo(round.player.x);
    // Die Figur wächst nach oben: die Mitte liegt etwas nördlich der Füße.
    expect(view.centreZ).toBeLessThan(round.player.z);
    expect(view.centreZ).toBeGreaterThan(round.player.z - SPRITE_H);
    expect(scene.stats.rooms).toBeGreaterThan(0);
    expect(scene.stats.walls).toBeGreaterThan(0);
    expect(scene.stats.entities).toBe(1);
    const p = scene.toScreen(round.player.x, round.player.z);
    expect(p.x).toBeCloseTo(200);
    const back = scene.toWorld(p.x, p.y);
    expect(back.x).toBeCloseTo(round.player.x);
    expect(back.z).toBeCloseTo(round.player.z);
    const corner = scene.toWorld(0, 0);
    const there = scene.toScreen(corner.x, corner.z);
    expect(there.x).toBeCloseTo(0);
    expect(there.y).toBeCloseTo(0);
    expect(scaleForWidth(390)).toBe(PHONE_SCALE);
    expect(scaleForWidth(1024)).toBe(DEFAULT_SCALE);
    scene.dispose();
  });

  it('lässt die Kamera los, sobald der Nutzer zieht, und zoomt um den Finger', () => {
    const round = new FlatRound(5, { test: true });
    const scene = new FlatScene();
    scene.setSnapshot(round.snapshot());
    scene.follow(PLAYER_ID);
    scene.draw();
    const before = scene.getView();
    scene.panBy(40, 0);
    expect(scene.current.following).toBeNull();
    expect(scene.getView().centreX).toBeLessThan(before.centreX);
    const anchor = scene.toWorld(100, 100);
    scene.zoomAt(1.5, 100, 100);
    expect(scene.getView().scale).toBeCloseTo(before.scale * 1.5);
    const after = scene.toWorld(100, 100);
    expect(after.x).toBeCloseTo(anchor.x);
    expect(after.z).toBeCloseTo(anchor.z);
    scene.dispose();
  });

  it('zeichnet eine Figur hinter der Wand vor ihr und eine davor nach ihr', () => {
    const order = (z: number): { wall: number; figure: number } => {
      calls = [];
      const s = room();
      s.entities.push(entity('e', 5, z));
      const scene = new FlatScene({ view: { centreX: 5, centreZ: 5, scale: 30 } });
      scene.setSnapshot(s);
      scene.setVisibility(omniscient());
      scene.draw();
      // Die Wandvorderseite ist der einzige lineare Verlauf; die Figur das erste roundRect.
      const wall = calls.findIndex((c) => c.name === 'createLinearGradient');
      const figure = calls.findIndex((c) => c.name === 'roundRect');
      expect(wall).toBeGreaterThan(-1);
      expect(figure).toBeGreaterThan(-1);
      expect(scene.stats.entities).toBe(1);
      return { wall, figure };
    };
    const behind = order(4);
    expect(behind.figure).toBeLessThan(behind.wall);
    const front = order(6);
    expect(front.figure).toBeGreaterThan(front.wall);
    // Die Wandvorderseite reicht auf dem Bild um WALL_H nach oben, nicht nach unten.
    expect(WALL_H).toBeGreaterThan(0);
  });

  it('legt Dunkelheit nur außerhalb der Sicht — und im Modus „Alles sehen" gar keine', () => {
    const s = room();
    s.entities.push(entity('player', 5, 6));
    const scene = new FlatScene({ view: { centreX: 5, centreZ: 5, scale: 30 } });
    scene.setSnapshot(s);
    const field = emptyField('realistic');
    field.visibleEntities = ['player'];
    field.self = {
      lightId: 'self:player',
      at: { x: 5, z: 6 },
      radius: 1.5,
      polygon: [
        { x: 3.5, z: 4.5 },
        { x: 3.5, z: 7.5 },
        { x: 6.5, z: 7.5 },
        { x: 6.5, z: 4.5 },
      ],
    };
    field.lit.push({
      lightId: 'lamp',
      at: { x: 2, z: 2 },
      radius: 3,
      polygon: [
        { x: 0, z: 0 },
        { x: 0, z: 4 },
        { x: 4, z: 4 },
        { x: 4, z: 0 },
      ],
    });
    scene.setVisibility(field);
    scene.draw();
    // Zwei Ausschnitte (Lampe, Eigenradius), die Decke wird darübergelegt.
    expect(scene.stats.cuts).toBe(2);
    expect(scene.stats.dimmed).toBe(0);
    expect(named('set:globalCompositeOperation').map((c) => c.args[0])).toEqual([
      'source-over',
      'destination-out',
      'source-over',
    ]);
    // Jede Fläche wird mehrfach geschnitten: einmal auf dem Boden und dann
    // stufenweise um die Wandhöhe nach Norden, damit die Wand, vor der man
    // steht, nicht im Schwarzen bleibt.
    expect(named('createRadialGradient').length).toBe(2 * WALL_LIFTS.length);
    // Und der Schnitt zieht wirklich nach oben: derselbe Mittelpunkt, kleinere y.
    const lamp = named('createRadialGradient').slice(0, WALL_LIFTS.length);
    expect(lamp.every((call) => call.args[0] === lamp[0]!.args[0])).toBe(true);
    expect(Number(lamp.at(-1)!.args[1])).toBeLessThan(Number(lamp[0]!.args[1]));
    expect(named('drawImage')).toHaveLength(1);
    // Alles sehen: keine Decke, ein unbeleuchteter Raum wird nur abgedunkelt.
    calls = [];
    const all = omniscient();
    all.litRooms = [];
    scene.setVisibility(all);
    scene.draw();
    expect(scene.stats.cuts).toBe(0);
    expect(scene.stats.dimmed).toBe(1);
    expect(named('drawImage')).toHaveLength(0);
    expect(named('set:globalCompositeOperation')).toHaveLength(0);
    scene.dispose();
  });

  it('schreibt Namen nur über sichtbare Figuren — und zeichnet nur die', () => {
    const s = room();
    s.entities.push(entity('player', 4, 6), entity('monster', 6, 6, 'monster'));
    const scene = new FlatScene({ view: { centreX: 5, centreZ: 5, scale: 30 } });
    scene.setSnapshot(s);
    const field = emptyField('realistic');
    field.visibleEntities = ['player'];
    scene.setVisibility(field);
    scene.draw();
    expect(scene.stats.entities).toBe(1);
    expect(scene.stats.names).toBe(1);
    expect(named('fillText').map((c) => c.args[0])).toContain('player');
    expect(named('fillText').map((c) => c.args[0])).not.toContain('monster');
    // Die Namen kommen nach der Decke.
    const cover = calls.findIndex((c) => c.name === 'drawImage');
    const name = calls.findIndex((c) => c.name === 'fillText' && c.args[0] === 'player');
    expect(name).toBeGreaterThan(cover);
    scene.setVisibility(omniscient());
    scene.draw();
    expect(scene.stats.entities).toBe(2);
    expect(scene.stats.names).toBe(2);
    // Verborgen (im Schacht) ist das Monster weg, auch wenn man alles sieht.
    s.entities[1]!.concealed = true;
    scene.draw();
    expect(scene.stats.entities).toBe(1);
    scene.dispose();
  });

  it('trifft mit einem Tipp Figur, Requisite und Raum', () => {
    const round = new FlatRound(5, { test: true });
    round.setMode('omniscient');
    round.step(1 / 30, { x: 0, z: 0, sprint: false });
    const hits: string[] = [];
    const scene = new FlatScene({
      view: { centreX: round.player.x, centreZ: round.player.z, scale: 60 },
      onEntityClick: (id) => hits.push(`entity:${id}`),
      onItemClick: (id) => hits.push(`item:${id}`),
      onRoomClick: (id) => hits.push(`room:${id}`),
      onGroundClick: () => hits.push('ground'),
    });
    scene.setSnapshot(round.snapshot());
    scene.setVisibility(round.field);
    scene.draw();
    // Die Figur steht über ihrem Punkt: ein Tipp auf die Brust trifft sie.
    const me = scene.toScreen(round.player.x, round.player.z);
    scene.tap(me.x, me.y - 0.6 * 60);
    const item = round.snapshot().items.find((i) => i.kind === 'cargo')!;
    scene.setView({ centreX: item.at.x, centreZ: item.at.z, scale: 60 });
    const at = scene.toScreen(item.at.x, item.at.z);
    scene.tap(at.x + 3, at.y - 10);
    const first = round.snapshot().rooms[0]!;
    scene.setView({ centreX: first.centre.x, centreZ: first.centre.z, scale: 60 });
    const r = scene.toScreen(first.centre.x, first.centre.z);
    scene.tap(r.x, r.y);
    scene.setView({ centreX: -500, centreZ: -500, scale: 60 });
    scene.tap(10, 10);
    expect(hits).toEqual([`entity:${PLAYER_ID}`, `item:${item.id}`, `room:${first.id}`, 'ground']);
    // Ein unsichtbares Monster trifft man nicht.
    const s = room();
    s.entities.push(entity('monster', 5, 5, 'monster'));
    hits.length = 0;
    scene.setSnapshot(s);
    scene.setVisibility(emptyField('realistic'));
    scene.setView({ centreX: 5, centreZ: 5, scale: 60 });
    const m = scene.toScreen(5, 5);
    scene.tap(m.x, m.y - 30);
    expect(hits).toEqual(['room:r']);
    expect(MONSTER_ID).toBe('monster');
    scene.dispose();
  });
  it('stellt die Möbel der 3D-Räume auch in die 2D-Szene', () => {
    const round = new FlatRound(5, { test: true });
    round.setMode('omniscient');
    round.step(1 / 30, { x: 0, z: 0, sprint: false });
    const snapshot = round.snapshot();
    const fixtures = (snapshot.fixtures ?? []).filter((one) => one.kind === 'fixture');
    // Der Bauplan stellt Tische, Werkbänke und Inseln in die Räume …
    expect(fixtures.length).toBeGreaterThan(5);
    const table = fixtures.find((one) => one.mark === 'esstisch') ?? fixtures[0]!;
    const scene = new FlatScene({
      view: { centreX: table.at.x, centreZ: table.at.z, scale: 60 },
    });
    scene.setSnapshot(snapshot);
    scene.setVisibility(omniscient());
    scene.draw();
    // … und die Szene zeichnet sie, nicht nur die Karte.
    expect(scene.stats.fixtures).toBeGreaterThan(0);
    // Ein Tipp auf den Tisch ist ein Tipp auf sein Zimmer, nicht ins Leere.
    const hits: string[] = [];
    const clickable = new FlatScene({
      view: { centreX: table.at.x, centreZ: table.at.z, scale: 60 },
      onRoomClick: (id) => hits.push(`room:${id}`),
      onGroundClick: () => hits.push('ground'),
    });
    clickable.setSnapshot(snapshot);
    clickable.setVisibility(omniscient());
    clickable.draw();
    const p = clickable.toScreen(table.at.x, table.at.z);
    clickable.tap(p.x, p.y);
    expect(hits).toEqual([`room:${table.roomId}`]);
    scene.dispose();
    clickable.dispose();
  });
});

describe('Geräusche auf dem Boden der Szene', () => {
  /**
   * **Was man hört, sieht man auch** — dieselben Wellen wie auf der Karte,
   * nur dort, wo gespielt wird. Und die Ansicht entscheidet, welche: Die
   * eigenen Schritte bleiben weg, alles andere kommt in einer Farbe.
   */
  it('malt die Wellen der Runde, aber nur die, die die Ansicht durchlässt', () => {
    const snapshot = room();
    snapshot.time = 1;
    snapshot.noises = [
      { id: 'n0', by: PLAYER_ID, at: { x: 5, z: 2 }, radius: 6, cause: 'walk', since: 0.9 },
      { id: 'n1', by: MONSTER_ID, at: { x: 5, z: 3 }, radius: 6, cause: 'monster', since: 0.9 },
      { id: 'n2', by: '', at: { x: 5, z: 4 }, radius: 6, cause: 'door', since: 0.9 },
    ];
    // Ohne Auskunft über die Farben bleibt der Boden still.
    const quiet = new FlatScene({ view: { centreX: 5, centreZ: 5, scale: 20 } });
    quiet.setSnapshot(snapshot);
    quiet.setVisibility(omniscient());
    quiet.draw();
    expect(quiet.stats.noises).toBe(0);
    // Der Spieler: eigener Schritt weg, die anderen beiden in derselben Farbe.
    const seen: string[] = [];
    const scene = new FlatScene({
      view: { centreX: 5, centreZ: 5, scale: 20 },
      noiseInk: (noise) => {
        if (noise.by === PLAYER_ID && noise.cause === 'walk') return null;
        seen.push(noise.id);
        return '#ff8a3d';
      },
    });
    scene.setSnapshot(snapshot);
    scene.setVisibility(omniscient());
    scene.draw();
    expect(seen).toEqual(['n1', 'n2']);
    expect(scene.stats.noises).toBe(2);
    // Und sie liegen ganz hinten: vor den Figuren, direkt auf den Böden.
    const first = calls.findIndex((c) => c.name === 'set:globalAlpha');
    const crew = calls.findIndex((c) => c.name === 'set:fillStyle' && c.args[0] === '#3ec7ff');
    expect(first).toBeGreaterThan(0);
    if (crew >= 0) expect(first).toBeLessThan(crew);
    quiet.dispose();
    scene.dispose();
  });
});
