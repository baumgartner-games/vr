import { DIR_E, DIR_N } from '../../nav/navTile';
import { generateHouse, spacesOf } from '../house';
import { DOOR_WIDTH, doorCentre, rectPolygon } from '../map/geometry';
import { pointInPolygon } from '../map/mapSnapshot';
import { VentNet, VENT_REACH } from './ventGraph';
import { STATION_VENTS } from './ventNet.data';
import { buildVentFlaps } from './ventArt';

describe('Das Lüftungsnetz aus der Datendatei', () => {
  it.each([1, 2, 3, 937])('passt mit Seed %i zum Grundriss', (seed) => {
    const spec = generateHouse(seed, 14);
    const net = new VentNet(spec);
    expect(net.flaps).toHaveLength(STATION_VENTS.flaps.length);
    const rooms = new Map(spacesOf(spec).map((room) => [room.id, room]));
    for (const flap of net.flaps) {
      const room = rooms.get(flap.roomId)!;
      const polygon = rectPolygon(room.rect);
      // Klappe und Standplatz liegen im Raum, die Klappe dicht an der Wand.
      expect(pointInPolygon(flap.at, polygon)).toBe(true);
      expect(pointInPolygon(flap.approach, polygon)).toBe(true);
      const wall = VentNet.wallPoint(flap);
      expect(Math.hypot(wall.x - flap.at.x, wall.z - flap.at.z)).toBeLessThan(0.3);
      // Nie in einer Türöffnung, und nie in einem Hüllenfenster.
      for (const door of spec.doors) {
        const centre = doorCentre(door);
        expect(Math.hypot(centre.x - wall.x, centre.z - wall.z)).toBeGreaterThanOrEqual(DOOR_WIDTH);
      }
      for (const window of spec.windows) {
        // Nur Fenster in derselben Wand zählen; eines um die Ecke stört nicht.
        if (window.dir !== flap.dir) continue;
        const centre = doorCentre(window);
        expect(Math.hypot(centre.x - wall.x, centre.z - wall.z)).toBeGreaterThanOrEqual(DOOR_WIDTH);
      }
    }
  });

  it('verbindet nicht jede Klappe mit jeder — vier getrennte Netze, keine Insel', () => {
    const net = new VentNet(generateHouse(1, 14));
    for (const flap of net.flaps) expect(net.linked(flap.id).length).toBeGreaterThan(0);
    // Zusammenhangskomponenten zählen.
    const seen = new Set<string>();
    let components = 0;
    for (const flap of net.flaps) {
      if (seen.has(flap.id)) continue;
      components++;
      const queue = [flap.id];
      while (queue.length) {
        const id = queue.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        for (const next of net.linked(id)) queue.push(next.id);
      }
    }
    expect(components).toBeGreaterThanOrEqual(3);
    expect(components).toBeLessThan(net.flaps.length);
    // Eine Fahrt geht in beide Richtungen.
    for (const [a, b] of net.links) {
      expect(net.linked(a).map((f) => f.id)).toContain(b);
      expect(net.linked(b).map((f) => f.id)).toContain(a);
    }
  });

  it('findet die nächste Klappe nur in Reichweite und misst den Schacht', () => {
    const net = new VentNet(generateHouse(1, 14));
    const flap = net.flap('vent-reactor')!;
    expect(net.nearest(flap.approach)?.id).toBe('vent-reactor');
    expect(net.nearest({ x: flap.approach.x + VENT_REACH + 1, z: flap.approach.z })).toBeNull();
    expect(net.length('vent-reactor', 'vent-lower-engine')).toBeGreaterThan(5);
    expect(net.length('vent-reactor', 'nirgends')).toBe(Infinity);
    expect(net.inRoom('r2').map((f) => f.id)).toEqual(['vent-reactor']);
  });

  it('liefert Klappen und Graph für den Snapshot', () => {
    const net = new VentNet(generateHouse(1, 14));
    const items = net.items(['vent-admin']);
    expect(items.every((item) => item.kind === 'vent' && !item.interactive)).toBe(true);
    expect(items.find((item) => item.id === 'vent-admin')?.state).toBe('open');
    expect(items.find((item) => item.id === 'vent-cafeteria')?.state).toBe('closed');
    expect(net.mapLinks()).toContainEqual({ a: 'vent-cafeteria', b: 'vent-admin' });
    expect(JSON.parse(JSON.stringify(net.mapLinks()))).toEqual(net.mapLinks());
  });

  it('weist kaputte Daten zurück', () => {
    const spec = generateHouse(1, 14);
    const good = STATION_VENTS.flaps[0]!;
    expect(() => new VentNet(spec, { flaps: [{ ...good, roomId: 'r99' }], links: [] })).toThrow(
      /unbekannter Raum/,
    );
    expect(() => new VentNet(spec, { flaps: [{ ...good, x: good.x + 40 }], links: [] })).toThrow(
      /nicht in/,
    );
    // Kachel im Raum, aber die Wand liegt mitten im Raum.
    expect(() => new VentNet(spec, { flaps: [{ ...good, dir: DIR_N }], links: [] })).toThrow(
      /Rand/,
    );
    // In der Türöffnung: die Cafeteria-Südtür bei Kachel (1, -15) nach Süden.
    expect(() => new VentNet(spec, { flaps: [{ ...good, x: 1 }], links: [] })).toThrow(
      /Türöffnung/,
    );
    expect(
      () =>
        new VentNet(spec, {
          flaps: [good, { ...good, id: 'zwei', x: good.x - 1 }],
          links: [['zwei', 'drei']],
        }),
    ).toThrow(/unbekannte Klappe/);
    expect(
      () => new VentNet(spec, { flaps: [good, { ...good, dir: DIR_E, x: 4 }], links: [] }),
    ).toThrow(/doppelte/);
  });

  it('baut die Klappen als ein paar Instanz-Meshes für die 3D-Welt', () => {
    const spec = generateHouse(1, 14);
    const group = buildVentFlaps(spec);
    expect(group.name).toBe('vent-flaps');
    expect(group.children.length).toBeGreaterThan(0);
    expect(group.children.length).toBeLessThanOrEqual(3);
    const instances = group.children.reduce(
      (sum, child) => sum + ((child as { count?: number }).count ?? 0),
      0,
    );
    expect(instances).toBe(STATION_VENTS.flaps.length * 6);
  });
});
