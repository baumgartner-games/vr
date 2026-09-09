import { FlatRound } from '../map/flatRound';
import { pointInPolygon, type MapDoor, type MapPoint, type MapSnapshot } from '../map/mapSnapshot';
import { ENTITY_PROFILES } from '../threat';
import { DOOR_LOSS, Hearing, hearingGain, PLAYER_HEARING, reachOf, WALL_LOSS } from './hearing';

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

describe('Das Hörmodell', () => {
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

  it('gibt dem Spieler die kürzere Hörweite — jedes Monster hört weiter', () => {
    for (const profile of Object.values(ENTITY_PROFILES))
      expect(profile.hearing).toBeGreaterThan(PLAYER_HEARING);
    // Ein Schritt der Lautstärke 1 in zwölf Metern: Das Monster hört ihn, der Spieler nicht.
    expect(hearingGain(12, reachOf(1, PLAYER_HEARING))).toBe(0);
    expect(hearingGain(12, reachOf(1, ENTITY_PROFILES.stalker.hearing))).toBeGreaterThan(0);
    expect(hearingGain(12, reachOf(1, ENTITY_PROFILES.sentinel.hearing))).toBe(0);
    // Ein Ruf trägt weiter als ein Schritt.
    expect(hearingGain(20, reachOf(3.2, PLAYER_HEARING))).toBeGreaterThan(0);
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
