import {
  pointInPolygon,
  type MapDoor,
  type MapItem,
  type MapPoint,
  type MapSnapshot,
} from '../map/mapSnapshot';

/**
 * **Das Hörmodell** — wer hört was, in welcher Entfernung, und durch was.
 *
 * Es rechnet auf dem `MapSnapshot` und sonst nichts: Räume, Türen, Wände,
 * Klappen des Lüftungsnetzes. Keine Kamera, kein Rapier, kein
 * `AudioContext`. Deshalb läuft es headless in Jest, und deshalb hören der
 * Spieler, das Monster und die Trainingssimulation **dasselbe** — ein
 * Schritt, den der Spieler hört und das Monster nicht, ist ein Fehler in
 * einer Datei.
 *
 * Vier Sätze, die das ganze Modell sind:
 *
 * 1. **Schall folgt begehbaren Wegen.** Von der Quelle zur nächsten Tür,
 *    von Tür zu Tür, zum Zuhörer — die kürzeste Kette über die Türen der
 *    Räume (Dijkstra über ein paar Dutzend Durchgänge). So hört man um
 *    Ecken: Wer im Gang neben der offenen Tür steht, hört den Schritt im
 *    Zimmer, obwohl keine Sichtlinie besteht.
 * 2. **Schächte leiten.** Eine Klappe führt durch den Schacht zur anderen
 *    Klappe; das kostet die Länge des Schachts plus `VENT_LOSS`. So hört man
 *    aus der Klappe, was zwei Räume weiter passiert — in beide Richtungen.
 * 3. **Wände dämpfen, sie schneiden nicht ab.** Die Luftlinie zählt auch,
 *    aber jede gekreuzte Wand kostet `WALL_LOSS` Meter, jedes Fenster
 *    `GLASS_LOSS`, jedes geschlossene Türblatt `DOOR_LOSS` — dieselben Zahlen
 *    wie das akustische Feld in `perception.ts` (Wand 9 m, geschlossene Tür
 *    4 m). Was zählt, ist der **kürzeste** Weg — durch die Wand, um sie
 *    herum oder durch den Schacht.
 * 4. **Alle haben dieselben Ohren.** Die Hörweite `HEARING` gilt für Spieler
 *    und Monster. Wer weiter zu hören ist, ist **lauter**, nicht besser
 *    gehört: Reichweite = Lautstärke × `HEARING` (`cues.ts`).
 *
 * Das Modell gibt **effektive Meter** zurück, keine Dezibel. Wer daraus eine
 * Lautstärke will, nimmt `hearingGain(distance, reach)`.
 */

/** Hörweite für ein Geräusch der Lautstärke 1, in Metern — für alle Ohren dieselbe. */
export const HEARING = 12;
/** Was ein geschlossenes Türblatt schluckt, in Metern Hörweite (`perception.acousticField`). */
export const DOOR_LOSS = 4;
/** Was eine Wand schluckt (`perception.acousticField`). */
export const WALL_LOSS = 9;
/** Glas und Fenster: dünner als eine Wand, dichter als eine Tür. */
export const GLASS_LOSS = 6;
/** Was ein Schacht zusätzlich zu seiner Länge schluckt: Blech leitet gut. */
export const VENT_LOSS = 3;
/** Weiter sucht das Modell nicht — lauter als ein Ruf über die ganze Station ist nichts. */
const HORIZON = 90;

/**
 * Was das Modell braucht — ein Ausschnitt des Snapshots, damit Tests nicht
 * alles bauen müssen. Klappen kommen als `items` der Sorte `vent` und
 * `ventLinks` (Paket Lüftungssystem); ohne beides gibt es keine Schächte.
 */
export type HearingWorld = Pick<MapSnapshot, 'seed' | 'rooms' | 'doors' | 'walls'> &
  Partial<Pick<MapSnapshot, 'items' | 'ventLinks'>>;

export interface HearingPath {
  /** Effektive Meter: Weglänge plus Dämpfung. Das ist die Zahl, die zählt. */
  distance: number;
  /** Die Luftlinie, zum Vergleich. */
  direct: number;
  /**
   * Woher der Zuhörer das Geräusch kommen hört: von der Quelle selbst, oder
   * — wenn der Weg über Türen oder Schächte gewann — aus dem letzten
   * Durchgang davor (Tür oder Klappe in seinem Raum).
   */
  from: MapPoint;
  /** Der Weg: Quelle, Durchgänge, Zuhörer. Für Anzeigen und Tests. */
  route: MapPoint[];
  /** Ob etwas dazwischen war — Wand, Glas, geschlossenes Türblatt oder Schacht. */
  occluded: boolean;
  /** Wodurch es zuletzt kam: frei, durch eine Tür, durch einen Schacht oder durch die Wand. */
  via: 'air' | 'door' | 'vent' | 'wall';
}

/** Lautstärke 0…1 für ein Geräusch mit Reichweite `reach` in `distance` effektiven Metern. */
export function hearingGain(distance: number, reach: number): number {
  if (!(reach > 0) || !Number.isFinite(distance) || distance >= reach) return 0;
  const t = 1 - Math.max(0, distance) / reach;
  return t * t;
}

/** Reichweite eines Geräuschs für einen Zuhörer: Lautstärke mal Hörweite, in Metern. */
export function reachOf(loudness: number, hearing: number = HEARING): number {
  return Math.max(0, loudness) * Math.max(0, hearing);
}

interface Crossing {
  t: number;
  loss: number;
}

/** Ein Durchgang zwischen zwei Räumen: eine Tür (ein Punkt) oder ein Schacht (zwei Klappen). */
interface Portal {
  a: string;
  b: string;
  /** Wo man auf Seite `a` hinein- und auf Seite `b` herauskommt. */
  atA: MapPoint;
  atB: MapPoint;
  /** Was der Durchgang selbst kostet, ohne Türblatt: 0 für Türen, Länge plus `VENT_LOSS` für Schächte. */
  fixed: number;
  /** Der Index der Tür im Snapshot, damit `open` je Anfrage gelesen wird; -1 bei Schächten. */
  door: number;
}

interface Node {
  portal: number;
  /** In welchem Raum der Schall nach diesem Durchgang ist. */
  room: string;
  cost: number;
  prev: number;
}

export class Hearing {
  private seed = Number.NaN;
  private doorCount = -1;
  private ventCount = -1;
  private wallCount = -1;
  private portals: Portal[] = [];
  private portalsOf = new Map<string, number[]>();
  /** Beste Kosten je Durchgangsseite — einmal angelegt, je Anfrage gelöscht. */
  private best = new Float64Array(0);
  /**
   * Umrisse der Wände (minX, minZ, maxX, maxZ je Wand) und der Räume, damit
   * ein Strahl nicht gegen jede der paar hundert Kanten der Station rechnet,
   * sondern nur gegen die, die er überhaupt erreichen kann. Die Simulation
   * fragt das Modell zehntausende Male je Runde.
   */
  private wallBounds = new Float64Array(0);
  private roomBounds = new Float64Array(0);

  /**
   * Der Weg des Schalls von `from` nach `to`. Beide in Metern auf dem Boden;
   * wer außerhalb jedes Raums steht, hört nur über die Luftlinie.
   */
  path(world: HearingWorld, from: MapPoint, to: MapPoint): HearingPath {
    this.prepare(world);
    const direct = distance(from, to);
    const straightLoss = this.straightLoss(world, from, to);
    const result: HearingPath = {
      distance: direct + straightLoss,
      direct,
      from: { x: from.x, z: from.z },
      route: [
        { x: from.x, z: from.z },
        { x: to.x, z: to.z },
      ],
      occluded: straightLoss > 0,
      via: straightLoss > 0 ? 'wall' : 'air',
    };
    if (straightLoss === 0) return result;
    const roomFrom = this.roomAt(world, from);
    const roomTo = this.roomAt(world, to);
    if (!roomFrom || !roomTo || roomFrom === roomTo) return result;

    // Dijkstra über Durchgänge: Ein Knoten ist „durch diesen Durchgang in
    // diesen Raum" — zwei Zustände je Durchgang, als Zahl, damit im Bild
    // kein String entsteht.
    const nodes: Node[] = [];
    const open: number[] = [];
    const best = this.best;
    best.fill(Infinity);
    const keyOf = (portal: number, room: string): number =>
      portal * 2 + (this.portals[portal]!.a === room ? 0 : 1);
    const push = (portal: number, room: string, cost: number, prev: number): void => {
      if (cost > HORIZON || cost >= result.distance) return;
      const key = keyOf(portal, room);
      if (best[key]! <= cost) return;
      best[key] = cost;
      nodes.push({ portal, room, cost, prev });
      open.push(nodes.length - 1);
    };
    for (const index of this.portalsOf.get(roomFrom) ?? []) {
      const portal = this.portals[index]!;
      const beyond = otherSide(portal, roomFrom);
      if (!beyond) continue;
      push(index, beyond, distance(from, entry(portal, roomFrom)) + this.loss(world, portal), -1);
    }
    let winner = -1;
    while (open.length) {
      let pick = 0;
      for (let i = 1; i < open.length; i++)
        if (nodes[open[i]!]!.cost < nodes[open[pick]!]!.cost) pick = i;
      const current = open[pick]!;
      open[pick] = open[open.length - 1]!;
      open.pop();
      const node = nodes[current]!;
      if (node.cost !== best[keyOf(node.portal, node.room)]) continue;
      const here = this.portals[node.portal]!;
      const exit = entry(here, node.room);
      if (node.room === roomTo) {
        const total = node.cost + distance(exit, to);
        if (total < result.distance) {
          result.distance = total;
          winner = current;
        }
        continue;
      }
      for (const index of this.portalsOf.get(node.room) ?? []) {
        if (index === node.portal) continue;
        const portal = this.portals[index]!;
        const beyond = otherSide(portal, node.room);
        if (!beyond) continue;
        push(
          index,
          beyond,
          node.cost + distance(exit, entry(portal, node.room)) + this.loss(world, portal),
          current,
        );
      }
    }
    if (winner >= 0) {
      const points: MapPoint[] = [];
      let last: Portal | null = null;
      for (let at = winner; at >= 0; at = nodes[at]!.prev) {
        const node = nodes[at]!;
        const portal = this.portals[node.portal]!;
        if (!last) last = portal;
        const exit = entry(portal, node.room);
        const enter = entry(portal, otherSide(portal, node.room));
        points.unshift(copy(exit));
        if (portal.door < 0) points.unshift(copy(enter));
      }
      result.route = [{ x: from.x, z: from.z }, ...points, { x: to.x, z: to.z }];
      result.from = points[points.length - 1]!;
      result.occluded = true;
      result.via = last!.door < 0 ? 'vent' : 'door';
    }
    return result;
  }

  /** Durchgänge je Raum — einmal je Station, nicht je Bild. Der Zustand der Türen wird je Anfrage gelesen. */
  private prepare(world: HearingWorld): void {
    const vents = world.ventLinks?.length ?? 0;
    if (
      world.seed === this.seed &&
      world.doors.length === this.doorCount &&
      world.walls.length === this.wallCount &&
      vents === this.ventCount
    )
      return;
    this.seed = world.seed;
    this.doorCount = world.doors.length;
    this.wallCount = world.walls.length;
    this.ventCount = vents;
    this.wallBounds = new Float64Array(world.walls.length * 4);
    world.walls.forEach((wall, index) => {
      this.wallBounds[index * 4] = Math.min(wall.a.x, wall.b.x);
      this.wallBounds[index * 4 + 1] = Math.min(wall.a.z, wall.b.z);
      this.wallBounds[index * 4 + 2] = Math.max(wall.a.x, wall.b.x);
      this.wallBounds[index * 4 + 3] = Math.max(wall.a.z, wall.b.z);
    });
    this.roomBounds = new Float64Array(world.rooms.length * 4);
    world.rooms.forEach((room, index) => {
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
      this.roomBounds.set([minX, minZ, maxX, maxZ], index * 4);
    });
    this.portals = world.doors.map((door, index) => ({
      a: door.a,
      b: door.b ?? '',
      atA: door.at,
      atB: door.at,
      fixed: 0,
      door: index,
    }));
    if (world.ventLinks && world.items) {
      const flaps = new Map<string, MapItem>();
      for (const item of world.items) if (item.kind === 'vent') flaps.set(item.id, item);
      for (const link of world.ventLinks) {
        const a = flaps.get(link.a),
          b = flaps.get(link.b);
        if (!a || !b) continue;
        this.portals.push({
          a: a.roomId,
          b: b.roomId,
          atA: a.at,
          atB: b.at,
          fixed: distance(a.at, b.at) + VENT_LOSS,
          door: -1,
        });
      }
    }
    this.best = new Float64Array(this.portals.length * 2);
    this.portalsOf = new Map();
    this.portals.forEach((portal, index) => {
      for (const room of [portal.a, portal.b]) {
        if (!room) continue;
        const list = this.portalsOf.get(room);
        if (list) list.push(index);
        else this.portalsOf.set(room, [index]);
      }
    });
  }

  private loss(world: HearingWorld, portal: Portal): number {
    if (portal.door < 0) return portal.fixed;
    return world.doors[portal.door]!.open ? 0 : DOOR_LOSS;
  }

  /**
   * Was die Luftlinie an Dämpfung sammelt. Eine geteilte Wand steht im
   * Snapshot zweimal (je Raum eine Kante); Treffer an derselben Stelle des
   * Strahls zählen deshalb nur einmal.
   */
  private straightLoss(world: HearingWorld, from: MapPoint, to: MapPoint): number {
    const crossings: Crossing[] = [];
    const minX = Math.min(from.x, to.x),
      minZ = Math.min(from.z, to.z),
      maxX = Math.max(from.x, to.x),
      maxZ = Math.max(from.z, to.z);
    const bounds = this.wallBounds;
    for (let index = 0; index < world.walls.length; index++) {
      const at = index * 4;
      if (
        bounds[at + 2]! < minX ||
        bounds[at]! > maxX ||
        bounds[at + 3]! < minZ ||
        bounds[at + 1]! > maxZ
      )
        continue;
      const wall = world.walls[index]!;
      const t = rayParameter(from, to, wall.a, wall.b);
      if (t === null) continue;
      crossings.push({ t, loss: wall.kind === 'wall' ? WALL_LOSS : GLASS_LOSS });
    }
    for (const door of world.doors) {
      if (door.open) continue;
      const [a, b] = leafOf(door);
      const t = rayParameter(from, to, a, b);
      if (t !== null) crossings.push({ t, loss: DOOR_LOSS });
    }
    if (crossings.length === 0) return 0;
    crossings.sort((p, q) => p.t - q.t);
    let loss = 0;
    let last = -Infinity;
    for (const crossing of crossings) {
      if (crossing.t - last < 1e-6) continue;
      last = crossing.t;
      loss += crossing.loss;
    }
    return loss;
  }

  /** Wie `roomIdAt`, aber erst der Umriss, dann das Polygon. */
  private roomAt(world: HearingWorld, at: MapPoint): string {
    const bounds = this.roomBounds;
    for (let index = 0; index < world.rooms.length; index++) {
      const b = index * 4;
      if (
        at.x < bounds[b]! ||
        at.x > bounds[b + 2]! ||
        at.z < bounds[b + 1]! ||
        at.z > bounds[b + 3]!
      )
        continue;
      const room = world.rooms[index]!;
      if (pointInPolygon(at, room.polygon)) return room.id;
    }
    return '';
  }
}

/** In welchem Raum ein Punkt liegt — für Aufrufer, die den Snapshot haben. */
export function roomIdAt(world: Pick<HearingWorld, 'rooms'>, at: MapPoint): string {
  for (const room of world.rooms) if (pointInPolygon(at, room.polygon)) return room.id;
  return '';
}

function otherSide(portal: Portal, room: string): string {
  return portal.a === room ? portal.b : portal.b === room ? portal.a : '';
}

/** Der Punkt des Durchgangs auf der Seite dieses Raums. */
function entry(portal: Portal, room: string): MapPoint {
  return portal.a === room ? portal.atA : portal.atB;
}

function copy(p: MapPoint): MapPoint {
  return { x: p.x, z: p.z };
}

/** `Math.sqrt` statt `Math.hypot`: gleich genau für zwei Achsen, ein Vielfaches schneller. */
function distance(a: MapPoint, b: MapPoint): number {
  const dx = a.x - b.x,
    dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Das Türblatt als Strecke quer über die Öffnung — wie `map/geometry.doorLeaf`, das kein Vertrag ist. */
function leafOf(door: MapDoor): [MapPoint, MapPoint] {
  const half = door.width / 2;
  return door.axis === 'x'
    ? [
        { x: door.at.x - half, z: door.at.z },
        { x: door.at.x + half, z: door.at.z },
      ]
    : [
        { x: door.at.x, z: door.at.z - half },
        { x: door.at.x, z: door.at.z + half },
      ];
}

/**
 * Wo der Strahl `from → to` die Strecke `a–b` kreuzt, als Anteil `t` des
 * Strahls; `null`, wenn gar nicht. Endpunkte, die genau auf der Strecke
 * liegen, zählen nicht: Wer in der Tür steht, steht nicht hinter ihr.
 */
function rayParameter(from: MapPoint, to: MapPoint, a: MapPoint, b: MapPoint): number | null {
  const rx = to.x - from.x,
    rz = to.z - from.z;
  const sx = b.x - a.x,
    sz = b.z - a.z;
  const denominator = rx * sz - rz * sx;
  if (Math.abs(denominator) < 1e-12) return null;
  const qx = a.x - from.x,
    qz = a.z - from.z;
  const t = (qx * sz - qz * sx) / denominator;
  const u = (qx * rz - qz * rx) / denominator;
  return t > 1e-6 && t < 1 - 1e-6 && u >= -1e-9 && u <= 1 + 1e-9 ? t : null;
}
