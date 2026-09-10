import { generateHouse, spacesOf } from '../house';
import { DIR_E, DIR_N, DIR_S, DIR_W, dirX, dirZ, opposite, TILE } from '../../nav/navTile';
import {
  doorCentre,
  fixtureBlocks,
  lineOfSight,
  rectCentre,
  slide,
  walkable,
  wallSegments,
} from './geometry';
import { extractMapSnapshot, wallsOf } from './extract';
import { FlatRound } from './flatRound';

const spec = generateHouse(7, 14);

describe('Wände aus dem Grundriss', () => {
  it('lassen an jeder Tür eine Lücke und sonst keine', () => {
    const walls = wallSegments(spec);
    expect(walls.length).toBeGreaterThan(spacesOf(spec).length * 4);
    const round = new FlatRound(7, { test: true });
    const snapshot = extractMapSnapshot(round, 'flat');
    for (const door of spec.doors) {
      if (!door.b) continue;
      const at = doorCentre(door);
      const a = rectCentre(
        spec.rooms.find((r) => r.id === door.a)?.rect ??
          spec.passages!.find((r) => r.id === door.a)!.rect,
      );
      // Von der Raummitte bis kurz vor die Türmitte darf nichts im Weg sein …
      const near = { x: at.x + (a.x - at.x) * 0.02, z: at.z + (a.z - at.z) * 0.02 };
      const open = { ...snapshot, doors: snapshot.doors.map((d) => ({ ...d, open: true })) };
      expect(lineOfSight(open, at, near)).toBe(true);
    }
  });

  it('halten eine Sichtlinie quer durch eine Wand auf', () => {
    const round = new FlatRound(7, { test: true });
    const snapshot = extractMapSnapshot(round, 'flat');
    const room = spec.rooms[0]!;
    const inside = rectCentre(room.rect);
    // Ein Punkt weit außerhalb jeder Station.
    const outside = { x: inside.x + 200, z: inside.z };
    expect(lineOfSight(snapshot, inside, outside)).toBe(false);
    expect(wallsOf(spec)).toBe(wallsOf(spec));
  });
});

describe('Wo man stehen darf', () => {
  it('in der Mitte ja, in der Wand nicht, in der Tür ja', () => {
    const room = spec.rooms[0]!;
    const centre = rectCentre(room.rect);
    expect(walkable(spec, [], centre, 0.35)).toBe(true);
    const onWall = { x: room.rect.x * TILE, z: centre.z };
    expect(walkable(spec, [], onWall, 0.35)).toBe(false);
    const door = spec.doors.find((d) => d.b)!;
    expect(walkable(spec, [], doorCentre(door), 0.35)).toBe(true);
    expect(walkable(spec, [door.id], doorCentre(door), 0.35)).toBe(false);
  });

  it('gleitet an der Wand entlang statt hindurch', () => {
    // Ein Zimmer mit einer Wand ohne Tür darin — sonst wäre „hindurch" erlaubt.
    const sides = [DIR_N, DIR_E, DIR_S, DIR_W] as const;
    const found = spec.rooms
      .map((room) => {
        const used = new Set<number>();
        for (const door of spec.doors) {
          if (door.a === room.id) used.add(door.dir);
          if (door.b === room.id) used.add(opposite(door.dir));
        }
        const solid = sides.find((dir) => !used.has(dir));
        return solid === undefined ? null : { room, solid };
      })
      .find((one) => one !== null)!;
    expect(found).toBeTruthy();
    const { room, solid } = found;
    const centre = rectCentre(room.rect);
    const dx = dirX(solid) * 0.1,
      dz = dirZ(solid) * 0.1;
    // Quer dazu ein kleiner Anteil, der weitergehen soll.
    const sx = dirZ(solid) * 0.02,
      sz = -dirX(solid) * 0.02;
    let at = centre;
    for (let i = 0; i < 200; i++) at = slide(spec, [], at, dx + sx, dz + sz, 0.35);
    const wallX = (room.rect.x + (dirX(solid) > 0 ? room.rect.w : 0)) * TILE;
    const wallZ = (room.rect.z + (dirZ(solid) > 0 ? room.rect.d : 0)) * TILE;
    if (dirX(solid)) expect(Math.abs(at.x - centre.x)).toBeLessThan(Math.abs(wallX - centre.x));
    else expect(Math.abs(at.z - centre.z)).toBeLessThan(Math.abs(wallZ - centre.z));
    // Die Querbewegung ging weiter, obwohl die Wand die Längsbewegung stoppte.
    const lateral = dirX(solid) ? at.z - centre.z : at.x - centre.x;
    expect(Math.abs(lateral)).toBeGreaterThan(1);
  });
});

describe('Möbel stehen im Weg', () => {
  /**
   * **Es gibt eine Spielwelt und zwei Darstellungen.** In 3D steht der
   * Techniker vor dem Tank; in 2D lief er hindurch, weil die Bewegung nur
   * Räume und Türen kannte. Die Wegsuche wich denselben Kästen schon aus
   * (`stationNavigation.buildGrid`) — jetzt tut es auch der Schritt.
   */
  it('lässt niemanden in einer Grundfläche stehen und gleitet daran entlang', () => {
    const blocks = fixtureBlocks(spec);
    expect(blocks.length).toBeGreaterThan(10);
    const box = blocks[0]!;
    const middle = { x: (box.minX + box.maxX) / 2, z: (box.minZ + box.maxZ) / 2 };
    expect(walkable(spec, [], middle, 0.35)).toBe(true);
    expect(walkable(spec, [], middle, 0.35, blocks)).toBe(false);
    // Die Raummitte bleibt frei — dort spawnt und dreht die Wegsuche.
    for (const room of spec.rooms)
      expect(walkable(spec, [], rectCentre(room.rect), 0.35, blocks)).toBe(true);
    // Ein Schritt mitten in den Kasten hinein endet davor statt darin.
    const outside = { x: box.minX - 1, z: middle.z };
    const step = slide(spec, [], outside, 1.4, 0, 0.35, blocks);
    expect(step.x).toBeLessThan(box.minX);
    expect(walkable(spec, [], step, 0.35, blocks)).toBe(true);
  });
});
