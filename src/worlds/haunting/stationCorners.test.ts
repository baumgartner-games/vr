import { CellGrid, navCellSource, snapCell } from '../nav/cellGrid';
import { tileKey } from '../nav/navTile';
import {
  cutAt,
  doorEdges,
  generateHouse,
  insideSpace,
  roomAt,
  roomOutline,
  spacesOf,
  type HouseRoom,
} from './house';
import { wallSegments } from './map/geometry';
import { housePlan } from './plan';
import { stationLayout } from './stationLayout';
import { STATION_VENTS } from './vents/ventNet.data';

const spec = generateHouse(7, 14);
const cafeteria = spec.rooms.find((room) => room.name === 'Cafeteria')!;

/** Die Kachel neben einer Kante. */
function across(edge: { x: number; z: number; dir: number }): { x: number; z: number } {
  return {
    x: edge.x + (edge.dir === 1 ? 1 : edge.dir === 3 ? -1 : 0),
    z: edge.z + (edge.dir === 2 ? 1 : edge.dir === 0 ? -1 : 0),
  };
}

/** Ob eine Kachel in einer schrägen Ecke irgendeines Raums liegt. */
function inCut(x: number, z: number): HouseRoom | null {
  for (const room of spacesOf(spec)) {
    const r = room.rect;
    if (x < r.x || x >= r.x + r.w || z < r.z || z >= r.z + r.d) continue;
    const cut = cutAt(room, x, z);
    // Hinter der Schräge eines geformten Raums (`HouseRoom.shape`) kann ein
    // anderer liegen — sein Rechteck ragt über fremde Kacheln.
    if (cut !== null && !(room.shape && cut === 'out')) return room;
  }
  return null;
}

describe('Die schrägen Ecken der Station', () => {
  it('schneidet jede Ecke unter 45°: Schrägen auf der Diagonale, dahinter nichts', () => {
    const r = cafeteria.rect;
    const south = r.z + r.d - 1,
      east = r.x + r.w - 1;
    // Die Cafeteria nach der Vorlage (`stationMap.ts`) ist ein Achteck.
    // Südwest, vier Kacheln: die Ecke fällt weg, die Diagonale trägt „╲".
    expect(cutAt(cafeteria, r.x, south)).toBe('out');
    expect(cutAt(cafeteria, r.x + 1, south - 1)).toBe('out');
    expect(cutAt(cafeteria, r.x + 3, south)).toBe('backslash');
    expect(cutAt(cafeteria, r.x, south - 3)).toBe('backslash');
    expect(cutAt(cafeteria, r.x + 2, south - 2)).toBeNull();
    // Südost „╱", und auch die Nordecken sind schräg — die Glasfront zur
    // Zentrale liegt dazwischen (`house.commandWindows`).
    expect(cutAt(cafeteria, east - 4, south)).toBe('slash');
    expect(cutAt(cafeteria, r.x, r.z)).toBe('out');
    // Die Ecke ist leer — die Kachel ganz außen gehört schon der MedBay.
    expect(roomAt(spec, r.x + 1, south - 1)).toBeNull();
    expect(roomAt(spec, r.x + 3, south)?.id).toBe(cafeteria.id);
    // Der Umriss hat acht Ecken, und ein Punkt hinter der Schräge liegt draußen.
    expect(roomOutline(cafeteria)).toHaveLength(8);
    expect(insideSpace(cafeteria, { x: r.x + 0.5, z: r.z + r.d - 0.5 })).toBe(false);
    expect(insideSpace(cafeteria, { x: r.x + 2.5, z: r.z + r.d - 2.5 })).toBe(true);
  });

  it('rechnet den Umriss einer geformten Form nur einmal (er wird je Bild gefragt)', () => {
    const shaped = spacesOf(spec).filter((room) => room.shape);
    expect(shaped.length).toBeGreaterThan(0);
    for (const room of shaped) {
      const first = roomOutline(room);
      // Dieselbe Liste und nicht nur dieselben Zahlen: gerechnet wurde nicht noch einmal.
      expect(roomOutline(room)).toBe(first);
      // Und sie ist trotzdem der Umriss dieser Form — ein Ring aus Ecken in Metern.
      expect(first.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('lässt Türen, Klappen, Fenster, Merkmale und Aufgaben außerhalb der Ecken', () => {
    for (const door of spec.doors)
      for (const edge of doorEdges(door)) {
        expect({ door: door.id, cut: inCut(edge.x, edge.z)?.id ?? null }).toEqual({
          door: door.id,
          cut: null,
        });
        const far = across(edge);
        expect({ door: door.id, cut: inCut(far.x, far.z)?.id ?? null }).toEqual({
          door: door.id,
          cut: null,
        });
      }
    for (const flap of STATION_VENTS.flaps) expect(inCut(flap.x, flap.z)).toBeNull();
    for (const window of spec.windows) expect(inCut(window.x, window.z)).toBeNull();
    for (const room of spec.rooms)
      for (const mark of room.marks) expect(inCut(mark.x, mark.z)).toBeNull();
    for (const task of spec.tasks) expect(inCut(task.x, task.z)).toBeNull();
    expect(inCut(spec.fuse.x, spec.fuse.z)).toBeNull();
  });

  it('baut die Ecke in den Plan: Schräge, kein Boden dahinter, keine Wand quer davor', () => {
    const plan = housePlan(spec);
    const r = cafeteria.rect;
    const south = r.z + r.d - 1;
    expect(plan.slopeAt(tileKey(r.x + 3, south))).toBe('backslash');
    expect(plan.graph.walkable(tileKey(r.x + 1, south - 1))).toBe(false);
    expect(plan.graph.walkable(tileKey(r.x + 3, south))).toBe(true);
    // Die Schrägkachel hat nach Westen keine Wand — dort ist die Schräge die
    // Grenze.
    expect(plan.graph.wall(tileKey(r.x, south - 3), 3)).toBeUndefined();
    // Die Schrägen stehen als gedrehte Wände im Plan.
    expect(plan.solids().filter((solid) => solid.yaw).length).toBeGreaterThan(20);
  });

  it('sperrt auf dem Zellgitter die Diagonale und lässt innen einen Block an ihr entlang', () => {
    const plan = housePlan(spec);
    const grid = new CellGrid(navCellSource(plan.graph, (key) => plan.slopeAt(key)));
    const r = cafeteria.rect;
    const south = r.z + r.d - 1;
    // „╲" sperrt Nordwest und Südost ihrer Kachel; Nordost ist innen und frei.
    expect(grid.cellFree((r.x + 3) * 2, south * 2)).toBe(false);
    expect(grid.cellFree((r.x + 3) * 2 + 1, south * 2)).toBe(true);
    // Ein 2×2-Block steht innen an der Schräge, einer auf ihr nicht.
    expect(grid.footprintFree(snapCell(r.x + 4, south))).toBe(true);
    expect(grid.footprintFree(snapCell(r.x + 3, south + 0.5))).toBe(false);
  });

  it('zeichnet die schrägen Wände auf die Karte', () => {
    const r = cafeteria.rect;
    const diagonal = wallSegments(spec).filter(
      (s) => s.roomId === cafeteria.id && s.a.x !== s.b.x && s.a.z !== s.b.z,
    );
    expect(diagonal).toHaveLength(4);
    // Keine gerade Wand reicht mehr bis in die abgeschnittene Ecke.
    const straight = wallSegments(spec).filter(
      (s) => s.roomId === cafeteria.id && (s.a.x === s.b.x || s.a.z === s.b.z),
    );
    for (const s of straight)
      for (const p of [s.a, s.b]) expect(p.x === r.x && p.z === r.z + r.d).toBe(false);
  });

  it('stellt kein Möbel über eine schräge Wand', () => {
    for (const placement of stationLayout(spec)) {
      const room = spec.rooms.find((one) => one.id === placement.roomId)!;
      const b = placement.bounds;
      for (const at of [
        { x: b.minX, z: b.minZ },
        { x: b.maxX, z: b.minZ },
        { x: b.minX, z: b.maxZ },
        { x: b.maxX, z: b.maxZ },
      ])
        expect({ id: placement.id, inside: insideSpace(room, at) }).toEqual({
          id: placement.id,
          inside: true,
        });
    }
  });
});
