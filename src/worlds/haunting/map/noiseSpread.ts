import { VENT_LOSS } from '../audio/hearing';
import { pointInPolygon, type MapPoint, type MapSnapshot } from './mapSnapshot';

/**
 * **Wie ein Geräusch über den Boden läuft** — die Welle, die die Karte
 * zeichnet, auf denselben Wegen, auf denen auch gehört wird.
 *
 * Vorher war die Welle ein Kreis: Wer wollte, sah einen Schritt durch drei
 * Wände und über den leeren Weltraum neben der Station, weil nur der
 * Luftlinienabstand zählte. Das ist nicht, was das Hörmodell rechnet
 * (`audio/hearing.ts`, Satz 1: „Schall folgt begehbaren Wegen"), und es ist
 * auch nicht, was man sehen will. Hier läuft die Welle deshalb als **Fluten
 * über die freien Felder**: von Kachel zu Kachel, nur wo Boden ist, nie durch
 * eine Wand, durch eine Tür nur, wenn sie offen steht — und für das Monster
 * zusätzlich durch die Schächte, weil Blech gut leitet.
 *
 * Zwei Teile, mit Absicht getrennt:
 *
 * - `tileGrid` baut das Feld einer Station **einmal**: welche Kachel Boden
 *   ist und welche Nachbarn sie hat. Wände und Türen stehen fest, solange die
 *   Station steht; nur ob ein Türblatt offen ist, ändert sich, und das steht
 *   nicht im Feld, sondern wird bei jeder Frage gelesen.
 * - `spreadNoise` flutet von einer Quelle aus, bis die Reichweite erschöpft
 *   ist, und gibt je Kachel die **Weglänge in Metern** zurück. Eine Kachel,
 *   die es nicht in die Liste schafft, hört nichts.
 *
 * Kein Canvas, kein three.js: reine Rechnung auf dem Snapshot.
 */

/** Die Kantenlänge einer Kachel der Welle, in Metern (`mapView.FLOOR_TILE`). */
export const NOISE_TILE = 1.25;

/** Ein Nachbar einer Kachel — durch eine Tür nur, wenn diese offen ist. */
export interface TileLink {
  to: string;
  /** Die Länge des Schritts in Metern. */
  cost: number;
  /** Die Tür, durch die es geht; `''` für freie Nachbarschaft. */
  doorId: string;
}

export interface TileGrid {
  /** Die Kantenlänge, mit der das Feld gebaut wurde. */
  readonly size: number;
  /** Jede Bodenkachel: Schlüssel `x,z` in Kacheln → Mittelpunkt in Metern. */
  readonly tiles: ReadonlyMap<string, MapPoint>;
  readonly links: ReadonlyMap<string, readonly TileLink[]>;
  /** Die Klappen des Lüftungsnetzes, je Kachel — für den Weg durch den Schacht. */
  readonly vents: ReadonlyMap<string, readonly TileLink[]>;
}

const EMPTY: readonly TileLink[] = [];

/** Der Schlüssel einer Kachel. */
export function tileKeyOf(at: MapPoint, size = NOISE_TILE): string {
  return `${Math.floor(at.x / size)},${Math.floor(at.z / size)}`;
}

/** Der Mittelpunkt einer Kachel in Metern. */
function centreOf(tx: number, tz: number, size: number): MapPoint {
  return { x: (tx + 0.5) * size, z: (tz + 0.5) * size };
}

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * **Das Feld einer Station**: Bodenkacheln und ihre Nachbarschaft. Diagonale
 * Nachbarn zählen nur, wenn auch beide geraden Wege frei sind — sonst liefe
 * die Welle durch die Ecke zweier Wände hindurch.
 */
export function tileGrid(snapshot: MapSnapshot, size = NOISE_TILE): TileGrid {
  const tiles = new Map<string, MapPoint>();
  for (const room of snapshot.rooms) {
    let minX = Infinity,
      minZ = Infinity,
      maxX = -Infinity,
      maxZ = -Infinity;
    for (const p of room.polygon) {
      minX = Math.min(minX, p.x);
      minZ = Math.min(minZ, p.z);
      maxX = Math.max(maxX, p.x);
      maxZ = Math.max(maxZ, p.z);
    }
    for (let tx = Math.floor(minX / size); tx * size < maxX; tx++)
      for (let tz = Math.floor(minZ / size); tz * size < maxZ; tz++) {
        const centre = centreOf(tx, tz, size);
        if (pointInPolygon(centre, room.polygon)) tiles.set(`${tx},${tz}`, centre);
      }
  }

  // Wände und Türöffnungen in Fächer je Kachel, damit ein Schritt nicht die
  // ganze Station abklappern muss — eine Station hat mehrere hundert Wände.
  const walls = bucket(
    snapshot.walls.map((wall) => ({ a: wall.a, b: wall.b, id: '' })),
    size,
  );
  const doors = bucket(
    snapshot.doors.map((door) => ({
      a:
        door.axis === 'x'
          ? { x: door.at.x - door.width / 2, z: door.at.z }
          : { x: door.at.x, z: door.at.z - door.width / 2 },
      b:
        door.axis === 'x'
          ? { x: door.at.x + door.width / 2, z: door.at.z }
          : { x: door.at.x, z: door.at.z + door.width / 2 },
      id: door.id,
    })),
    size,
  );

  const links = new Map<string, TileLink[]>();
  const step = (from: string, fromAt: MapPoint, to: string, toAt: MapPoint): TileLink | null => {
    for (const wall of candidates(walls, from, to))
      if (crosses(fromAt, toAt, wall.a, wall.b)) return null;
    let doorId = '';
    for (const door of candidates(doors, from, to))
      if (crosses(fromAt, toAt, door.a, door.b)) doorId = door.id;
    return { to, cost: Math.hypot(toAt.x - fromAt.x, toAt.z - fromAt.z), doorId };
  };

  for (const [key, at] of tiles) {
    const [tx, tz] = key.split(',').map(Number) as [number, number];
    const list: TileLink[] = [];
    const open = new Set<string>();
    for (const [dx, dz] of DIRS) {
      const next = `${tx + dx},${tz + dz}`;
      const to = tiles.get(next);
      if (!to) continue;
      if (dx && dz) {
        // Diagonal nur, wenn beide geraden Wege offen sind (Ecken sind dicht).
        if (!open.has(`${tx + dx},${tz}`) || !open.has(`${tx},${tz + dz}`)) continue;
      }
      const link = step(key, at, next, to);
      if (!link) continue;
      if (!dx || !dz) open.add(next);
      list.push(link);
    }
    links.set(key, list);
  }

  return { size, tiles, links, vents: ventLinks(snapshot, tiles, size) };
}

/** Die Schächte als Sprünge von Klappe zu Klappe — Länge plus `VENT_LOSS`. */
function ventLinks(
  snapshot: MapSnapshot,
  tiles: ReadonlyMap<string, MapPoint>,
  size: number,
): Map<string, TileLink[]> {
  const out = new Map<string, TileLink[]>();
  const flaps = new Map<string, MapPoint>();
  for (const item of snapshot.items) if (item.kind === 'vent') flaps.set(item.id, item.at);
  for (const link of snapshot.ventLinks ?? []) {
    const a = flaps.get(link.a),
      b = flaps.get(link.b);
    if (!a || !b) continue;
    const keyA = tileKeyOf(a, size),
      keyB = tileKeyOf(b, size);
    if (!tiles.has(keyA) || !tiles.has(keyB) || keyA === keyB) continue;
    const cost = Math.hypot(b.x - a.x, b.z - a.z) + VENT_LOSS;
    push(out, keyA, { to: keyB, cost, doorId: '' });
    push(out, keyB, { to: keyA, cost, doorId: '' });
  }
  return out;
}

function push(map: Map<string, TileLink[]>, key: string, link: TileLink): void {
  const list = map.get(key);
  if (list) list.push(link);
  else map.set(key, [link]);
}

export interface SpreadOptions {
  /** Die Türen, die gerade offen stehen; alles andere hält den Schall auf. */
  open?: ReadonlySet<string>;
  /** Ob der Schall auch durch die Schächte läuft — für das Monster und seine Ohren. */
  vents?: boolean;
}

/**
 * **Die Welle fluten lassen.** Dijkstra über die freien Felder, abgebrochen
 * bei `radius` Metern Weglänge. Was herauskommt, ist je Kachel die Länge des
 * kürzesten begehbaren Wegs dorthin — die Zahl, aus der die Karte Helligkeit
 * und Front macht.
 */
export function spreadNoise(
  grid: TileGrid,
  from: MapPoint,
  radius: number,
  options: SpreadOptions = {},
): Map<string, number> {
  const reached = new Map<string, number>();
  if (!(radius > 0)) return reached;
  const start = tileKeyOf(from, grid.size);
  if (!grid.tiles.has(start)) return reached;
  const open = options.open;
  // Ein kleiner Haufen genügt: Eine Welle deckt selten mehr als ein paar
  // hundert Kacheln, und ein sortiertes Einfügen wäre hier teurer.
  const queue: Array<{ key: string; cost: number }> = [{ key: start, cost: 0 }];
  reached.set(start, 0);
  while (queue.length) {
    let best = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i]!.cost < queue[best]!.cost) best = i;
    const here = queue.splice(best, 1)[0]!;
    if (here.cost > (reached.get(here.key) ?? Infinity)) continue;
    const links = grid.links.get(here.key) ?? EMPTY;
    const through = options.vents ? [...links, ...(grid.vents.get(here.key) ?? EMPTY)] : links;
    for (const link of through) {
      if (link.doorId && open && !open.has(link.doorId)) continue;
      const cost = here.cost + link.cost;
      if (cost > radius) continue;
      if (cost >= (reached.get(link.to) ?? Infinity)) continue;
      reached.set(link.to, cost);
      queue.push({ key: link.to, cost });
    }
  }
  return reached;
}

interface Bar {
  a: MapPoint;
  b: MapPoint;
  id: string;
}

/** Sperren in Fächer je Kachel legen; jede liegt in allen Fächern, die sie berührt. */
function bucket(bars: readonly Bar[], size: number): Map<string, Bar[]> {
  const out = new Map<string, Bar[]>();
  for (const bar of bars) {
    const minX = Math.floor(Math.min(bar.a.x, bar.b.x) / size) - 1;
    const maxX = Math.floor(Math.max(bar.a.x, bar.b.x) / size) + 1;
    const minZ = Math.floor(Math.min(bar.a.z, bar.b.z) / size) - 1;
    const maxZ = Math.floor(Math.max(bar.a.z, bar.b.z) / size) + 1;
    for (let tx = minX; tx <= maxX; tx++)
      for (let tz = minZ; tz <= maxZ; tz++) {
        const key = `${tx},${tz}`;
        const list = out.get(key);
        if (list) list.push(bar);
        else out.set(key, [bar]);
      }
  }
  return out;
}

/** Die Sperren, die für einen Schritt von `from` nach `to` in Frage kommen. */
function candidates(map: ReadonlyMap<string, Bar[]>, from: string, to: string): Bar[] {
  const a = map.get(from) ?? [];
  const b = map.get(to) ?? [];
  if (!a.length) return b;
  if (!b.length) return a;
  return a.concat(b.filter((bar) => !a.includes(bar)));
}

/** Ob sich die Strecken `p→q` und `a→b` schneiden — Berührung zählt. */
export function crosses(p: MapPoint, q: MapPoint, a: MapPoint, b: MapPoint): boolean {
  const d1 = side(a, b, p),
    d2 = side(a, b, q),
    d3 = side(p, q, a),
    d4 = side(p, q, b);
  if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  // Berührungen: ein Endpunkt liegt genau auf der anderen Strecke.
  if (d1 === 0 && between(a, b, p)) return true;
  if (d2 === 0 && between(a, b, q)) return true;
  if (d3 === 0 && between(p, q, a)) return true;
  if (d4 === 0 && between(p, q, b)) return true;
  return false;
}

function side(a: MapPoint, b: MapPoint, p: MapPoint): number {
  const value = (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
  return Math.abs(value) < 1e-9 ? 0 : Math.sign(value);
}

function between(a: MapPoint, b: MapPoint, p: MapPoint): boolean {
  return (
    p.x >= Math.min(a.x, b.x) - 1e-9 &&
    p.x <= Math.max(a.x, b.x) + 1e-9 &&
    p.z >= Math.min(a.z, b.z) - 1e-9 &&
    p.z <= Math.max(a.z, b.z) + 1e-9
  );
}
