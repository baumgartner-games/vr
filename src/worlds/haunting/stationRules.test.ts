import { CELL } from '../nav/cellGrid';
import { DIR_E, DIR_S, TILE } from '../nav/navTile';
import { doorMiddle, generateHouse, type HouseRoom, type HouseSpec } from './house';
import {
  CORRIDOR_MAX_CELLS,
  DOOR_GAP_CELLS,
  PARALLEL_GAP_CELLS,
  corridorWidthViolations,
  doorChainViolations,
  parallelGapViolations,
  stationRuleViolations,
} from './stationRules';

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
