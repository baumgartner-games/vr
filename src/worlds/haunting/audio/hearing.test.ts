import { FlatRound } from '../map/flatRound';
import {
  emptySnapshot,
  pointInPolygon,
  type MapDoor,
  type MapPoint,
  type MapSnapshot,
} from '../map/mapSnapshot';
import { ENTITY_PROFILES } from '../threat';
import { NOISE } from './cues';
import { DOOR_LOSS, HEARING, Hearing, hearingGain, reachOf, VENT_LOSS, WALL_LOSS } from './hearing';

/**
 * Das Hörmodell auf der echten Station: ein `FlatRound` im Test-Modus (ohne
 * Monster) liefert Snapshot, Türen und Wände; der Spieler wird an die Tür
 * gestellt, damit sie aufgeht (automatische Türen: offen, sobald jemand
 * davorsteht).
 */
interface Corner {
  round: FlatRound;
  door: MapDoor;
  /** Vor der Tür, im Raum `a`. */
  near: MapPoint;
  /** Hinter der Tür, im Raum `b`, seitlich versetzt — ohne Sichtlinie zu `near`. */
  side: MapPoint;
}

function normal(door: MapDoor, towards: MapPoint): MapPoint {
  // Die Türachse ist die Richtung der Öffnung; die Normale steht quer dazu.
  const n = door.axis === 'x' ? { x: 0, z: 1 } : { x: 1, z: 0 };
  const sign = Math.sign((towards.x - door.at.x) * n.x + (towards.z - door.at.z) * n.z) || 1;
  return { x: n.x * sign, z: n.z * sign };
}

function corner(seed: number): Corner {
  const round = new FlatRound(seed, { test: true });
  const snapshot = round.snapshot();
  const roomOf = (id: string) => snapshot.rooms.find((room) => room.id === id)!;
  for (const door of snapshot.doors) {
    if (!door.b) continue;
    const a = roomOf(door.a),
      b = roomOf(door.b);
    const toA = normal(door, a.centre);
    const near = { x: door.at.x + toA.x, z: door.at.z + toA.z };
    const along = door.axis === 'x' ? { x: 1, z: 0 } : { x: 0, z: 1 };
    for (const shift of [3, -3]) {
      const side = {
        x: door.at.x - toA.x * 1 + along.x * shift,
        z: door.at.z - toA.z * 1 + along.z * shift,
      };
      const inside = { x: side.x - along.x * Math.sign(shift) * 0.4, z: side.z };
      if (
        pointInPolygon(near, a.polygon) &&
        pointInPolygon(side, b.polygon) &&
        pointInPolygon(inside, b.polygon) &&
        round.place(near)
      )
        return { round, door, near, side };
    }
  }
  throw new Error(`Seed ${seed}: keine Tür mit Platz dahinter`);
}

function fresh(round: FlatRound): MapSnapshot {
  round.step(1 / 30, { x: 0, z: 0, sprint: false });
  return round.snapshot();
}

/**
 * Zwei Zimmer, die nicht aneinandergrenzen und keine Tür haben — nur einen
 * Schacht zwischen zwei Klappen. Ohne ihn geht der Schall durch zwei Wände.
 */
function ventedRooms(): MapSnapshot {
  const snapshot = emptySnapshot();
  snapshot.seed = 11;
  const room = (id: string, x0: number, x1: number) => ({
    id,
    name: id,
    polygon: [
      { x: x0, z: 0 },
      { x: x0, z: 10 },
      { x: x1, z: 10 },
      { x: x1, z: 0 },
    ],
    centre: { x: (x0 + x1) / 2, z: 5 },
    circulation: false,
    lit: true,
    safe: false,
  });
  snapshot.rooms.push(room('a', 0, 10), room('b', 20, 30));
  for (const [id, x0, x1] of [
    ['a', 0, 10],
    ['b', 20, 30],
  ] as const) {
    const wall = (ax: number, az: number, bx: number, bz: number) =>
      snapshot.walls.push({ a: { x: ax, z: az }, b: { x: bx, z: bz }, roomId: id, kind: 'wall' });
    wall(x0, 0, x1, 0);
    wall(x0, 10, x1, 10);
    wall(x0, 0, x0, 10);
    wall(x1, 0, x1, 10);
  }
  const flap = (id: string, roomId: string, x: number) => ({
    id,
    kind: 'vent' as const,
    label: 'Lüftungsklappe',
    roomId,
    at: { x, z: 5 },
    state: 'closed',
    interactive: false,
  });
  snapshot.items.push(flap('vent-a', 'a', 9.8), flap('vent-b', 'b', 20.2));
  snapshot.ventLinks = [{ a: 'vent-a', b: 'vent-b' }];
  return snapshot;
}

/**
 * Zwei Zimmer von je 10 × 10 m, eine gemeinsame Wand bei x = 10, **keine
 * Tür**. Derselbe Grundriss, an dem `map/noiseSpread.test.ts` und
 * `perception.test.ts` messen — vier Stellen rechnen Schall, und an dieser
 * einen Form muss bei allen vieren dasselbe herauskommen.
 */
function wandAnWand(): MapSnapshot {
  const snapshot = emptySnapshot();
  snapshot.seed = 23;
  const box = (id: string, x0: number, x1: number) => {
    snapshot.rooms.push({
      id,
      name: id,
      polygon: [
        { x: x0, z: 0 },
        { x: x0, z: 10 },
        { x: x1, z: 10 },
        { x: x1, z: 0 },
      ],
      centre: { x: (x0 + x1) / 2, z: 5 },
      circulation: false,
      lit: true,
      safe: false,
    });
  };
  box('west', 0, 10);
  box('east', 10, 20);
  // Die geteilte Wand steht zweimal darin, je Raum eine Kante — genau so
  // liefert `extract.ts` sie.
  snapshot.walls.push(
    { a: { x: 10, z: 0 }, b: { x: 10, z: 10 }, roomId: 'west', kind: 'wall' },
    { a: { x: 10, z: 0 }, b: { x: 10, z: 10 }, roomId: 'east', kind: 'wall' },
    { a: { x: 0, z: 0 }, b: { x: 20, z: 0 }, kind: 'wall' },
    { a: { x: 0, z: 10 }, b: { x: 20, z: 10 }, kind: 'wall' },
    { a: { x: 0, z: 0 }, b: { x: 0, z: 10 }, kind: 'wall' },
    { a: { x: 20, z: 0 }, b: { x: 20, z: 10 }, kind: 'wall' },
  );
  return snapshot;
}

describe('Das Hörmodell', () => {
  /**
   * **Das Versprechen aus dem Doc-Kommentar, nachgemessen** (Satz 3: „Wände
   * dämpfen, sie schneiden nicht ab"). Zwei Räume, eine Wand, keine Tür — und
   * es kommt eine endliche Zahl heraus, nicht `Infinity` und nicht die
   * Luftlinie.
   */
  it('hört durch eine Wand ohne Tür: Luftlinie plus WALL_LOSS, einmal', () => {
    const snapshot = wandAnWand();
    const path = new Hearing().path(snapshot, { x: 5, z: 5 }, { x: 15, z: 5 });
    expect(path.direct).toBeCloseTo(10, 6);
    expect(path.distance).toBeCloseTo(10 + WALL_LOSS, 6);
    expect(path.occluded).toBe(true);
    expect(path.via).toBe('wall');
    // Gedämpft heißt: leiser, aber nicht still. Ein Ruf trägt 42 m weit.
    expect(hearingGain(path.distance, reachOf(NOISE.monsterCall))).toBeGreaterThan(0);
  });

  it('rechnet im selben Raum die Luftlinie, ohne Dämpfung', () => {
    const round = new FlatRound(1, { test: true });
    const snapshot = round.snapshot();
    const room = snapshot.rooms.find((r) => !r.circulation && !r.safe)!;
    const from = room.centre;
    const to = { x: room.centre.x + 1, z: room.centre.z + 0.5 };
    expect(pointInPolygon(to, room.polygon)).toBe(true);
    const path = new Hearing().path(snapshot, from, to);
    expect(path.distance).toBeCloseTo(Math.hypot(1, 0.5), 6);
    expect(path.direct).toBe(path.distance);
    expect(path.occluded).toBe(false);
    expect(path.via).toBe('air');
    expect(path.from).toEqual(from);
    expect(path.route).toEqual([from, to]);
  });

  it.each([1, 2, 3])(
    'hört mit Seed %i um die Ecke: durch die offene Tür statt durch die Wand',
    (seed) => {
      const { round, door, near, side } = corner(seed);
      const snapshot = fresh(round);
      expect(snapshot.doors.find((d) => d.id === door.id)!.open).toBe(true);
      const hearing = new Hearing();
      const path = hearing.path(snapshot, side, near);
      const direct = Math.hypot(side.x - near.x, side.z - near.z);
      // Um die Ecke ist länger als die Luftlinie, aber deutlich kürzer als
      // durch die Wand — und es kommt aus der Tür.
      expect(path.occluded).toBe(true);
      expect(path.via).toBe('door');
      expect(path.distance).toBeGreaterThan(direct);
      expect(path.distance).toBeLessThan(direct + WALL_LOSS);
      expect(path.from).toEqual(door.at);
      expect(path.route).toHaveLength(3);
      const viaDoor =
        Math.hypot(side.x - door.at.x, side.z - door.at.z) +
        Math.hypot(near.x - door.at.x, near.z - door.at.z);
      expect(path.distance).toBeCloseTo(viaDoor, 6);
      // Dieselbe Frage rückwärts gibt dieselbe Antwort.
      expect(hearing.path(snapshot, near, side).distance).toBeCloseTo(path.distance, 6);
    },
  );

  it('dämpft eine geschlossene Tür um DOOR_LOSS, schneidet sie aber nicht ab', () => {
    const { round, door, near, side } = corner(1);
    const open = new Hearing().path(fresh(round), side, near);
    round.haunt.shut.push(door.id);
    const shut = fresh(round);
    expect(shut.doors.find((d) => d.id === door.id)!.open).toBe(false);
    const closed = new Hearing().path(shut, side, near);
    expect(Number.isFinite(closed.distance)).toBe(true);
    expect(closed.distance).toBeCloseTo(open.distance + DOOR_LOSS, 6);
    expect(closed.from).toEqual(door.at);
  });

  it('lässt Schall durch eine Wand ohne Tür — gedämpft, nicht abgeschnitten', () => {
    const round = new FlatRound(2, { test: true });
    const snapshot = round.snapshot();
    const rooms = snapshot.rooms.filter((r) => !r.safe);
    const linked = new Set(snapshot.doors.map((d) => [d.a, d.b].sort().join('|')));
    let found = 0;
    for (const a of rooms)
      for (const b of rooms) {
        if (a.id >= b.id || linked.has([a.id, b.id].sort().join('|'))) continue;
        // Nur unmittelbare Nachbarn: Mittelpunkte, deren Luftlinie kein drittes Zimmer kreuzt.
        const crossesThird = rooms.some(
          (r) =>
            r !== a &&
            r !== b &&
            pointInPolygon(
              { x: (a.centre.x + b.centre.x) / 2, z: (a.centre.z + b.centre.z) / 2 },
              r.polygon,
            ),
        );
        if (crossesThird) continue;
        const gap = Math.hypot(a.centre.x - b.centre.x, a.centre.z - b.centre.z);
        if (gap > 12) continue;
        const path = new Hearing().path(snapshot, a.centre, b.centre);
        expect(Number.isFinite(path.distance)).toBe(true);
        expect(path.occluded).toBe(true);
        expect(path.distance).toBeGreaterThan(path.direct);
        // Eine einzelne Wand kostet höchstens WALL_LOSS — ein Weg über Türen
        // darf kürzer sein. Kreuzt die Luftlinie noch einen Gang, wird es mehr.
        if (path.distance <= path.direct + WALL_LOSS + 1e-6) found++;
      }
    expect(found).toBeGreaterThan(0);
  });

  it('zählt eine geteilte Wand nur einmal, obwohl sie im Snapshot zweimal steht', () => {
    const round = new FlatRound(3, { test: true });
    const snapshot = round.snapshot();
    const door = snapshot.doors.find((d) => d.b && !d.open)!;
    const a = snapshot.rooms.find((r) => r.id === door.a)!;
    const b = snapshot.rooms.find((r) => r.id === door.b)!;
    // Zwei Punkte dicht an der gemeinsamen Wand, weit weg von der Tür: Die
    // Luftlinie kreuzt genau eine Wand (zwei Kanten), also kostet sie WALL_LOSS.
    const toA = normal(door, a.centre);
    const along = door.axis === 'x' ? { x: 1, z: 0 } : { x: 0, z: 1 };
    for (const shift of [2.5, -2.5]) {
      const p = {
        x: door.at.x + toA.x * 0.3 + along.x * shift,
        z: door.at.z + toA.z * 0.3 + along.z * shift,
      };
      const q = {
        x: door.at.x - toA.x * 0.3 + along.x * shift,
        z: door.at.z - toA.z * 0.3 + along.z * shift,
      };
      if (!pointInPolygon(p, a.polygon) || !pointInPolygon(q, b.polygon)) continue;
      const path = new Hearing().path(snapshot, p, q);
      // Über die Tür: 0,3 + 2,5 hin und zurück plus Türblatt = 5,6 + 4; durch
      // die Wand: 0,6 + 9. Beides ist möglich — aber nie zweimal die Wand.
      expect(path.distance).toBeLessThanOrEqual(0.6 + WALL_LOSS + 1e-6);
      return;
    }
    throw new Error('keine Stelle an der Wand gefunden');
  });

  it('leitet Schall durch den Schacht, in beide Richtungen, aus der Klappe heraus', () => {
    const snapshot = ventedRooms();
    const hearing = new Hearing();
    const source = { x: 2, z: 5 },
      listener = { x: 28, z: 5 };
    const path = hearing.path(snapshot, source, listener);
    // Durch zwei Wände wären es 26 + 18 m; durch den Schacht 7,8 + 10,4 + 3 + 7,8.
    const viaVent = 7.8 + 10.4 + VENT_LOSS + 7.8;
    expect(path.via).toBe('vent');
    expect(path.distance).toBeCloseTo(viaVent, 6);
    expect(path.distance).toBeLessThan(path.direct + 2 * WALL_LOSS);
    expect(path.from).toEqual({ x: 20.2, z: 5 });
    expect(path.route).toEqual([source, { x: 9.8, z: 5 }, { x: 20.2, z: 5 }, listener]);
    const back = hearing.path(snapshot, listener, source);
    expect(back.distance).toBeCloseTo(path.distance, 6);
    expect(back.from).toEqual({ x: 9.8, z: 5 });
    // Ohne die Verbindung bleibt nur die Wand.
    snapshot.ventLinks = [];
    expect(new Hearing().path(snapshot, source, listener).via).toBe('wall');
  });

  it('kennt die Schächte der echten Station', () => {
    const round = new FlatRound(1, { test: true });
    const snapshot = round.snapshot();
    const cafeteria = snapshot.items.find((i) => i.id === 'vent-cafeteria')!;
    const admin = snapshot.items.find((i) => i.id === 'vent-admin')!;
    const path = new Hearing().path(snapshot, cafeteria.at, admin.at);
    // Klappe zu Klappe: höchstens die Länge des Schachts plus Dämpfung.
    expect(path.distance).toBeLessThanOrEqual(path.direct + VENT_LOSS + 1e-6);
  });

  it('gibt allen dieselben Ohren — lauter trägt weiter, nicht besser gehört', () => {
    for (const profile of Object.values(ENTITY_PROFILES)) expect(profile.hearing).toBe(HEARING);
    // Ein gehender Spieler ist 6 m weit zu hören, ein gehendes Monster 14,4 m,
    // ein rennendes 24 m, ein Ruf 42 m.
    expect(reachOf(NOISE.walk)).toBe(6);
    expect(reachOf(NOISE.monsterWalk)).toBeCloseTo(14.4, 9);
    expect(reachOf(NOISE.monsterRun)).toBe(24);
    expect(reachOf(NOISE.monsterCall)).toBe(42);
    expect(hearingGain(7, reachOf(NOISE.walk))).toBe(0);
    expect(hearingGain(7, reachOf(NOISE.monsterWalk))).toBeGreaterThan(0);
    // In jeder Gangart ist das Monster lauter als der Spieler in seiner.
    expect(NOISE.monsterStalk).toBeGreaterThan(NOISE.sneak);
    expect(NOISE.monsterWalk).toBeGreaterThan(NOISE.walk);
    expect(NOISE.monsterRun).toBeGreaterThan(NOISE.sprint);
  });

  it('fällt mit der Entfernung stetig ab und ist jenseits der Reichweite still', () => {
    const samples = [0, 2, 5, 8, 9, 12].map((d) => hearingGain(d, 9));
    expect(samples[0]).toBe(1);
    for (let i = 1; i < samples.length; i++)
      expect(samples[i]!).toBeLessThanOrEqual(samples[i - 1]!);
    expect(samples[4]).toBe(0);
    expect(hearingGain(NaN, 9)).toBe(0);
    expect(hearingGain(3, 0)).toBe(0);
  });

  it('liefert für jedes Raumpaar der Station einen endlichen Weg, nie kürzer als die Luftlinie', () => {
    const round = new FlatRound(4, { test: true });
    const snapshot = round.snapshot();
    const hearing = new Hearing();
    for (const a of snapshot.rooms)
      for (const b of snapshot.rooms) {
        const path = hearing.path(snapshot, a.centre, b.centre);
        expect(Number.isFinite(path.distance)).toBe(true);
        expect(path.distance).toBeGreaterThanOrEqual(path.direct - 1e-9);
        expect(path.route[0]).toEqual(a.centre);
        expect(path.route.at(-1)).toEqual(b.centre);
      }
  });
});
