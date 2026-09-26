import { CELL } from '../nav/cellGrid';
import { DIR_E, DIR_S, TILE, tileKey } from '../nav/navTile';
import {
  doorEdges,
  doorMiddle,
  generateHouse,
  isPassage,
  leafDoors,
  type HouseRoom,
  type HouseSpec,
} from './house';
import {
  CORRIDOR_MAX_CELLS,
  DOOR_GAP_CELLS,
  PARALLEL_GAP_CELLS,
  corridorWidthViolations,
  doorChainViolations,
  parallelGapViolations,
  passageDoorViolations,
  stationRuleViolations,
} from './stationRules';
import { housePlan } from './plan';

/** Viele Samen: Der Grundriss ist fest, aber Türen, Fenster und Einrichtung hängen am Samen. */
const SEEDS = Array.from({ length: 60 }, (_, i) => 1 + i * 37);

describe('Die Regeln des Grundrisses', () => {
  it('zählt in Feldern — ein Feld ist eine halbe Kachel', () => {
    expect(CELL).toBe(TILE / 2);
    expect(CORRIDOR_MAX_CELLS).toBe(4);
    expect(PARALLEL_GAP_CELLS).toBe(4);
    expect(DOOR_GAP_CELLS).toBe(6);
  });

  for (const seed of SEEDS)
    it(`hält alle drei Regeln mit Samen ${seed}`, () => {
      expect(stationRuleViolations(generateHouse(seed, 14))).toEqual([]);
    });

  it('baut jeden Gang genau vier Felder breit — so breit wie eine Tür', () => {
    const spec = generateHouse(7, 14);
    for (const passage of spec.passages ?? [])
      expect({
        gang: passage.name,
        felder: (Math.min(passage.rect.w, passage.rect.d) * TILE) / CELL,
      }).toEqual({ gang: passage.name, felder: 4 });
  });

  /**
   * **Auch über eine Fuge hinweg nicht** — Raum, kurzer Gang, Raum: Die Regel
   * zählt je Raum und je Gang; zwei Türen, die sich keinen Raum teilen (zwei
   * Raumtüren beiderseits einer Fuge zwischen zwei Gangstücken), fragt sie
   * nicht. Hier wird die ganze Station gegeneinander gemessen: Nirgends
   * liegen zwei Türmitten näher als sechs Felder.
   */
  it('legt nirgends in der Station zwei Türen näher als sechs Felder — auch Raum–Gang–Raum', () => {
    const least = (DOOR_GAP_CELLS * CELL) / TILE;
    for (const seed of SEEDS.filter((_, i) => i % 6 === 0)) {
      const doors = leafDoors(generateHouse(seed, 14));
      for (let i = 0; i < doors.length; i++)
        for (let j = i + 1; j < doors.length; j++) {
          const p = doors[i]!,
            q = doors[j]!;
          // Zwei Türen in dieselben zwei Räume stehen nebeneinander (Regel 3).
          if (new Set([p.a, p.b, q.a, q.b]).size === 2) continue;
          const a = doorMiddle(p),
            b = doorMiddle(q);
          expect({
            seed,
            p: p.id,
            q: q.id,
            far: Math.hypot(a.x - b.x, a.z - b.z) >= least - 1e-9,
          }).toEqual({ seed, p: p.id, q: q.id, far: true });
        }
    }
  });

  /**
   * **Keine Tür zwischen zwei Gangstücken** — dort läuft der Gang durch: kein
   * Blatt, keine Wand im Plan, und die Kanten sind im Gitter offen.
   */
  it('legt keine Tür zwischen zwei Gangstücken — der Gang läuft offen durch', () => {
    for (const seed of [1, 7, 42]) {
      const spec = generateHouse(seed, 14);
      expect(passageDoorViolations(spec)).toEqual([]);
      const halls = new Set((spec.passages ?? []).map((space) => space.id));
      const seams = spec.doors.filter(
        (door) => door.b !== null && halls.has(door.a) && halls.has(door.b),
      );
      expect(seams.length).toBeGreaterThan(0);
      // Jede Tür mit Blatt hat einen Raum auf einer Seite.
      for (const door of leafDoors(spec))
        expect({ door: door.id, room: !halls.has(door.a) || !halls.has(door.b ?? '') }).toEqual({
          door: door.id,
          room: true,
        });
      // Im Plan steht an einer Fuge nichts: keine Wand, keine Tür.
      const graph = housePlan(spec).graph;
      for (const seam of seams)
        for (const edge of doorEdges(seam))
          expect({
            seam: seam.id,
            wall: graph.wall(tileKey(edge.x, edge.z, 0), edge.dir) ?? null,
          }).toEqual({
            seam: seam.id,
            wall: null,
          });
    }
    // Und die Regel fällt auf, wenn doch eine Tür dort steht.
    const spec = generateHouse(1, 14);
    const seam = spec.doors.find((door) => isPassage(door))!;
    const broken = {
      ...spec,
      doors: spec.doors.map((door) => (door === seam ? { ...door, passage: false } : door)),
    };
    expect(passageDoorViolations(broken)).toEqual([`${seam.id}: Tür zwischen zwei Gangstücken`]);
  });

  it('lässt jedem Raum mindestens eine Tür', () => {
    const spec = generateHouse(11, 14);
    for (const room of spec.rooms)
      expect({
        room: room.name,
        doors: spec.doors.some((d) => d.a === room.id || d.b === room.id),
      }).toEqual({
        room: room.name,
        doors: true,
      });
  });

  it('hält zwischen zwei Türen verschiedener Nachbarn mindestens sechs Felder frei', () => {
    const spec = generateHouse(3, 14);
    const spaces = new Set(spec.doors.flatMap((d) => [d.a, d.b]).filter((id) => id !== null));
    for (const space of spaces) {
      const doors = spec.doors.filter((d) => d.a === space || d.b === space);
      for (const p of doors)
        for (const q of doors) {
          const other = (d: (typeof doors)[number]): string | null => (d.a === space ? d.b : d.a);
          if (p === q || other(p) === other(q)) continue;
          const a = doorMiddle(p),
            b = doorMiddle(q);
          expect(Math.hypot(a.x - b.x, a.z - b.z) / CELL).toBeGreaterThanOrEqual(
            DOOR_GAP_CELLS - 1e-9,
          );
        }
    }
  });
});

/** Ein Gang als Rechteck, für die Gegenproben. */
function hall(id: string, x: number, z: number, w: number, d: number): HouseRoom {
  return {
    id,
    name: id,
    kind: 'kammer',
    signature: 'kiste',
    rect: { x, z, w, d },
    marks: [],
    lamp: true,
    circulation: true,
  };
}

function room(id: string, x: number, z: number, w: number, d: number): HouseRoom {
  return { ...hall(id, x, z, w, d), circulation: undefined, kind: 'kammer' };
}

function spec(
  rooms: HouseRoom[],
  passages: HouseRoom[],
  doors: HouseSpec['doors'] = [],
): HouseSpec {
  return {
    seed: 0,
    rooms,
    passages,
    bounds: { x: 0, z: 0, w: 30, d: 30 },
    doors,
    windows: [],
    entryRoom: rooms[0]?.id ?? '',
    frontDoor: '',
    fuse: { roomId: '', x: 0, z: 0, dir: DIR_E },
    tasks: [],
    switches: [],
  };
}

describe('Die Gegenproben — jede Regel sieht ihren Verstoß', () => {
  it('Regel 1: ein Gang von drei Kacheln (sechs Feldern) ist zu breit', () => {
    expect(corridorWidthViolations(spec([], [hall('p0', 2, 2, 10, 3)]))).not.toEqual([]);
    expect(corridorWidthViolations(spec([], [hall('p0', 2, 2, 10, 2)]))).toEqual([]);
  });

  it('Regel 1: eine Kreuzung zweier schmaler Gänge ist nicht breit', () => {
    const cross = [hall('p0', 2, 6, 12, 2), hall('p1', 7, 0, 2, 6), hall('p2', 7, 8, 2, 6)];
    expect(corridorWidthViolations(spec([], cross))).toEqual([]);
  });

  it('Regel 2: parallele Gänge mit Leere dazwischen liegen genau vier Felder auseinander', () => {
    const near = [hall('p0', 2, 2, 10, 2), hall('p1', 2, 5, 10, 2)]; // eine Kachel dazwischen
    const right = [hall('p0', 2, 2, 10, 2), hall('p1', 2, 6, 10, 2)]; // zwei Kacheln
    const far = [hall('p0', 2, 2, 10, 2), hall('p1', 2, 9, 10, 2)]; // fünf Kacheln
    expect(parallelGapViolations(spec([], near))).not.toEqual([]);
    expect(parallelGapViolations(spec([], right))).toEqual([]);
    expect(parallelGapViolations(spec([], far))).not.toEqual([]);
  });

  it('Regel 2: liegt ein Raum dazwischen, ist es kein Block, sondern ein Raum', () => {
    const halls = [hall('p0', 2, 2, 10, 2), hall('p1', 2, 10, 10, 2)];
    expect(parallelGapViolations(spec([room('r0', 2, 4, 10, 6)], halls))).toEqual([]);
  });

  it('Regel 3: eine Schleuse aus zwei Türen mit einer Kachel dazwischen fällt auf', () => {
    // Raum r0 — Stummel p0 (eine Kachel tief) — Gang p1.
    const rooms = [room('r0', 2, 2, 6, 6)];
    const halls = [hall('p0', 3, 8, 2, 1), hall('p1', 0, 9, 12, 2)];
    const doors: HouseSpec['doors'] = [
      { id: 'd0', a: 'r0', b: 'p0', x: 3, z: 7, dir: DIR_S, material: 'metal', span: 2 },
      { id: 'd1', a: 'p0', b: 'p1', x: 3, z: 8, dir: DIR_S, material: 'metal', span: 2 },
    ];
    expect(doorChainViolations(spec(rooms, halls, doors))).not.toEqual([]);
    // Dieselben Türen, aber der Stummel ist vier Kacheln lang: frei.
    const long = [hall('p0', 3, 8, 2, 4), hall('p1', 0, 12, 12, 2)];
    const apart: HouseSpec['doors'] = [doors[0]!, { ...doors[1]!, z: 11 }];
    expect(doorChainViolations(spec(rooms, long, apart))).toEqual([]);
  });

  it('Regel 3: zwei Türen in denselben Nachbarn stehen nebeneinander, nicht hintereinander', () => {
    const rooms = [room('r0', 2, 2, 10, 6)];
    const halls = [hall('p0', 0, 8, 14, 2)];
    const doors: HouseSpec['doors'] = [
      { id: 'd0', a: 'r0', b: 'p0', x: 3, z: 7, dir: DIR_S, material: 'metal', span: 2 },
      { id: 'd1', a: 'r0', b: 'p0', x: 6, z: 7, dir: DIR_S, material: 'metal', span: 2 },
    ];
    expect(doorChainViolations(spec(rooms, halls, doors))).toEqual([]);
  });
});
