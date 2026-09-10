import { dirX, dirZ, type Dir } from '../../nav/navTile';
import { spacesOf, type HouseSpec } from '../house';
import { DOOR_WIDTH, doorCentre } from '../map/geometry';
import type { MapItem, MapPoint } from '../map/mapSnapshot';
import { STATION_VENTS, type VentNetData } from './ventNet.data';
import { FLAP_INSET, flapApproach, flapWall } from './ventPlacement';

/**
 * **Der Vent-Graph** — Klappen in Metern und wer mit wem verbunden ist.
 *
 * Aus den Daten (`ventNet.data.ts`) und dem Bauplan wird je Klappe ein
 * Punkt an der Wand (`at`, für die Karte und das 3D-Modell) und ein Punkt
 * davor (`approach`, wo das Monster steht, um einzusteigen). Die Daten
 * werden beim Bauen **geprüft**: Kachel im Raum, Wand am Rand des Raums,
 * keine Türöffnung an dieser Stelle, jede Verbindung zwischen zwei bekannten
 * Klappen. Eine Datendatei, die nicht zum Grundriss passt, fällt so beim
 * ersten Test auf und nicht beim ersten Spieler.
 */
export interface VentFlap {
  id: string;
  roomId: string;
  /** Die Klappe selbst — an der Wand, ein Stück in den Raum gerückt. */
  at: MapPoint;
  /** Wo man davorsteht, um sie zu benutzen. */
  approach: MapPoint;
  /** In welche Wand sie eingelassen ist. */
  dir: Dir;
  /** Der Blick auf die Klappe, als `yaw` (`mapSnapshot.headingOf`). */
  yaw: number;
}

/** Wie nah man an eine Klappe heran muss, in Metern. */
export const VENT_REACH = 1.5;

export class VentNet {
  readonly flaps: readonly VentFlap[];
  readonly links: ReadonlyArray<readonly [string, string]>;
  private readonly byId = new Map<string, VentFlap>();
  private readonly neighbours = new Map<string, VentFlap[]>();

  constructor(spec: HouseSpec, data: VentNetData = STATION_VENTS) {
    const rooms = new Map(spacesOf(spec).map((room) => [room.id, room]));
    const flaps: VentFlap[] = [];
    for (const flap of data.flaps) {
      const room = rooms.get(flap.roomId);
      if (!room) throw new Error(`Vent ${flap.id}: unbekannter Raum ${flap.roomId}`);
      const r = room.rect;
      const inside = flap.x >= r.x && flap.x < r.x + r.w && flap.z >= r.z && flap.z < r.z + r.d;
      if (!inside) throw new Error(`Vent ${flap.id}: Kachel liegt nicht in ${flap.roomId}`);
      const nx = dirX(flap.dir),
        nz = dirZ(flap.dir);
      const beyondX = flap.x + nx,
        beyondZ = flap.z + nz;
      const onEdge = beyondX < r.x || beyondX >= r.x + r.w || beyondZ < r.z || beyondZ >= r.z + r.d;
      if (!onEdge) throw new Error(`Vent ${flap.id}: Wand liegt nicht am Rand von ${flap.roomId}`);
      // Dieselbe Rechnung wie für das Layout (`ventPlacement.ts`) — Klappe
      // und freigehaltener Platz davor müssen dieselbe Stelle meinen.
      const wall = flapWall(flap);
      for (const door of spec.doors) {
        const centre = doorCentre(door);
        if (Math.hypot(centre.x - wall.x, centre.z - wall.z) < DOOR_WIDTH)
          throw new Error(`Vent ${flap.id}: sitzt in der Türöffnung ${door.id}`);
      }
      if (this.byId.has(flap.id)) throw new Error(`Vent ${flap.id}: doppelte Kennung`);
      const built: VentFlap = {
        id: flap.id,
        roomId: flap.roomId,
        at: { x: wall.x - nx * FLAP_INSET, z: wall.z - nz * FLAP_INSET },
        approach: flapApproach(flap),
        dir: flap.dir,
        yaw: Math.atan2(-nx, -nz),
      };
      flaps.push(built);
      this.byId.set(built.id, built);
      this.neighbours.set(built.id, []);
    }
    for (const [a, b] of data.links) {
      const from = this.byId.get(a),
        to = this.byId.get(b);
      if (!from || !to) throw new Error(`Vent-Verbindung ${a}–${b}: unbekannte Klappe`);
      if (from === to) throw new Error(`Vent-Verbindung ${a}: mit sich selbst`);
      this.neighbours.get(a)!.push(to);
      this.neighbours.get(b)!.push(from);
    }
    this.flaps = flaps;
    this.links = data.links.map(([a, b]) => [a, b] as const);
  }

  flap(id: string): VentFlap | null {
    return this.byId.get(id) ?? null;
  }

  /** Wohin man von dieser Klappe aus fahren kann, in Datenreihenfolge. */
  linked(id: string): readonly VentFlap[] {
    return this.neighbours.get(id) ?? [];
  }

  /** Die Klappen eines Raums. */
  inRoom(roomId: string): VentFlap[] {
    return this.flaps.filter((flap) => flap.roomId === roomId);
  }

  /** Die nächste Klappe in Reichweite eines Punkts — vom Standplatz aus gemessen. */
  nearest(at: MapPoint, reach = VENT_REACH): VentFlap | null {
    let best: VentFlap | null = null;
    let near = reach;
    for (const flap of this.flaps) {
      const d = Math.hypot(flap.approach.x - at.x, flap.approach.z - at.z);
      if (d < near) {
        near = d;
        best = flap;
      }
    }
    return best;
  }

  /** Luftlinie zwischen zwei Klappen, in Metern — die Länge des Schachts. */
  length(a: string, b: string): number {
    const from = this.byId.get(a),
      to = this.byId.get(b);
    if (!from || !to) return Infinity;
    return Math.hypot(from.at.x - to.at.x, from.at.z - to.at.z);
  }

  /** Die Klappen als Karteneinträge; `busy` heißt: dort steigt gerade jemand ein oder aus. */
  items(busy: readonly string[] = []): MapItem[] {
    return this.flaps.map((flap) => ({
      id: flap.id,
      kind: 'vent',
      label: 'Lüftungsklappe',
      roomId: flap.roomId,
      at: { ...flap.at },
      state: busy.includes(flap.id) ? 'open' : 'closed',
      interactive: false,
    }));
  }

  /** Die Verbindungen für den Contract (`MapSnapshot.ventLinks`). */
  mapLinks(): Array<{ a: string; b: string }> {
    return this.links.map(([a, b]) => ({ a, b }));
  }

  /** Die Klappe in Metern auf der Wandlinie — für das 3D-Modell und Prüfungen. */
  static wallPoint(flap: VentFlap): MapPoint {
    return {
      x: flap.at.x + dirX(flap.dir) * FLAP_INSET,
      z: flap.at.z + dirZ(flap.dir) * FLAP_INSET,
    };
  }
}
