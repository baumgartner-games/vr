import { pointInPolygon, type MapDoor, type MapPoint, type MapSnapshot } from '../map/mapSnapshot';

/**
 * **Das Hörmodell** — wer hört was, in welcher Entfernung, und durch was.
 *
 * Es rechnet auf dem `MapSnapshot` und sonst nichts: Räume, Türen, Wände.
 * Keine Kamera, kein Rapier, kein `AudioContext`. Deshalb läuft es headless
 * in Jest, und deshalb hören die 2D-Welt und das Headset **dasselbe** —
 * ein Schritt, den man auf der Karte hört und im Headset nicht, ist ein
 * Fehler in einer Datei.
 *
 * Drei Sätze, die das ganze Modell sind:
 *
 * 1. **Schall folgt begehbaren Wegen.** Von der Quelle zur nächsten Tür,
 *    von Tür zu Tür, zum Zuhörer — die kürzeste Kette über die Türen der
 *    Räume (`Dijkstra` über höchstens ein paar Dutzend Türen). So hört man
 *    um Ecken: Wer im Gang neben der offenen Tür steht, hört den Schritt im
 *    Zimmer, obwohl keine Sichtlinie besteht.
 * 2. **Wände dämpfen, sie schneiden nicht ab.** Die Luftlinie zählt auch,
 *    aber jede gekreuzte Wand kostet `WALL_LOSS` Meter, jedes Fenster
 *    `GLASS_LOSS`, jedes geschlossene Türblatt `DOOR_LOSS` — dieselben Zahlen
 *    wie das akustische Feld des Monsters in `perception.ts` (Wand 9 m,
 *    geschlossene Tür 4 m). Was am Ende zählt, ist der **kürzere** der beiden
 *    Wege — durch die Wand oder um sie herum.
 * 3. **Der Spieler hört schlechter als das Monster.** Seine Hörweite für ein
 *    Geräusch der Lautstärke 1 ist `PLAYER_HEARING`; die des Monsters steht
 *    in `ENTITY_PROFILES[kind].hearing` (`threat.ts`) und ist bei jeder Sorte
 *    größer. Reichweite = Lautstärke × Hörweite; darüber hinaus: Stille.
 *
 * Das Modell gibt **effektive Meter** zurück, keine Dezibel. Wer daraus eine
 * Lautstärke will, nimmt `hearingGain(distance, reach)`.
 */

/** Hörweite des Spielers für ein Geräusch der Lautstärke 1, in Metern. Jedes Monster hört weiter (`threat.ts`). */
export const PLAYER_HEARING = 9;
/** Was ein geschlossenes Türblatt schluckt, in Metern Hörweite (`perception.acousticField`). */
export const DOOR_LOSS = 4;
/** Was eine Wand schluckt (`perception.acousticField`). */
export const WALL_LOSS = 9;
/** Glas und Fenster: dünner als eine Wand, dichter als eine Tür. */
export const GLASS_LOSS = 6;
/** Weiter sucht das Modell nicht — lauter als ein Ruf über die ganze Station ist nichts. */
const HORIZON = 90;

/** Was das Modell braucht — ein Ausschnitt des Snapshots, damit Tests nicht alles bauen müssen. */
export type HearingWorld = Pick<MapSnapshot, 'seed' | 'rooms' | 'doors' | 'walls'>;

export interface HearingPath {
  /** Effektive Meter: Weglänge plus Dämpfung. Das ist die Zahl, die zählt. */
  distance: number;
  /** Die Luftlinie, zum Vergleich. */
  direct: number;
  /**
   * Woher der Zuhörer das Geräusch kommen hört: von der Quelle selbst, oder
   * — wenn der Weg über Türen gewann — aus der letzten Tür davor.
   */
  from: MapPoint;
  /** Der Weg: Quelle, Türen, Zuhörer. Für Anzeigen und Tests. */
  route: MapPoint[];
  /** Ob etwas dazwischen war — Wand, Glas oder geschlossenes Türblatt. */
  occluded: boolean;
}

/** Lautstärke 0…1 für ein Geräusch mit Reichweite `reach` in `distance` effektiven Metern. */
export function hearingGain(distance: number, reach: number): number {
  if (!(reach > 0) || !Number.isFinite(distance) || distance >= reach) return 0;
  const t = 1 - Math.max(0, distance) / reach;
  return t * t;
}

/** Reichweite eines Geräuschs für einen Zuhörer: Lautstärke mal Hörweite, in Metern. */
export function reachOf(loudness: number, hearing: number): number {
  return Math.max(0, loudness) * Math.max(0, hearing);
}

interface Crossing {
  t: number;
  loss: number;
}

interface Node {
  door: number;
  /** In welchem Raum der Schall nach dieser Tür ist. */
  room: string;
  cost: number;
  prev: number;
}

export class Hearing {
  private seed = Number.NaN;
  private doorCount = -1;
  private doorsOf = new Map<string, number[]>();
  /** Beste Kosten je Türzustand — einmal angelegt, je Anfrage gelöscht. */
  private best = new Float64Array(0);

  /**
   * Der Weg des Schalls von `from` nach `to`. Beide in Metern auf dem Boden;
   * wer außerhalb jedes Raums steht, hört nur über die Luftlinie.
   */
  path(world: HearingWorld, from: MapPoint, to: MapPoint): HearingPath {
    this.prepare(world);
    const direct = Math.hypot(to.x - from.x, to.z - from.z);
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
    };
    if (straightLoss === 0) return result;
    const roomFrom = roomIdAt(world, from);
    const roomTo = roomIdAt(world, to);
    if (!roomFrom || !roomTo || roomFrom === roomTo) return result;

    // Dijkstra über Türen: Ein Knoten ist „durch diese Tür in diesen Raum"
    // — zwei Zustände je Tür, als Zahl, damit im Bild kein String entsteht.
    const nodes: Node[] = [];
    const open: number[] = [];
    const best = this.best;
    best.fill(Infinity);
    const keyOf = (door: number, room: string): number =>
      door * 2 + (world.doors[door]!.a === room ? 0 : 1);
    const push = (door: number, room: string, cost: number, prev: number): void => {
      if (cost > HORIZON || cost >= result.distance) return;
      const key = keyOf(door, room);
      if (best[key]! <= cost) return;
      best[key] = cost;
      nodes.push({ door, room, cost, prev });
      open.push(nodes.length - 1);
    };
    for (const index of this.doorsOf.get(roomFrom) ?? []) {
      const door = world.doors[index]!;
      const beyond = otherSide(door, roomFrom);
      if (!beyond) continue;
      push(index, beyond, distance(from, door.at) + doorLoss(door), -1);
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
      if (node.cost !== best[keyOf(node.door, node.room)]) continue;
      const here = world.doors[node.door]!;
      if (node.room === roomTo) {
        const total = node.cost + distance(here.at, to);
        if (total < result.distance) {
          result.distance = total;
          winner = current;
        }
        continue;
      }
      for (const index of this.doorsOf.get(node.room) ?? []) {
        if (index === node.door) continue;
        const door = world.doors[index]!;
        const beyond = otherSide(door, node.room);
        if (!beyond) continue;
        push(index, beyond, node.cost + distance(here.at, door.at) + doorLoss(door), current);
      }
    }
    if (winner >= 0) {
      const doors: MapPoint[] = [];
      for (let at = winner; at >= 0; at = nodes[at]!.prev) {
        const door = world.doors[nodes[at]!.door]!;
        doors.unshift({ x: door.at.x, z: door.at.z });
      }
      result.route = [{ x: from.x, z: from.z }, ...doors, { x: to.x, z: to.z }];
      result.from = doors[doors.length - 1]!;
      result.occluded = true;
    }
    return result;
  }

  /** Türen je Raum — einmal je Station, nicht je Bild. Der Zustand der Türen wird je Anfrage gelesen. */
  private prepare(world: HearingWorld): void {
    if (world.seed === this.seed && world.doors.length === this.doorCount) return;
    this.seed = world.seed;
    this.doorCount = world.doors.length;
    this.best = new Float64Array(world.doors.length * 2);
    this.doorsOf = new Map();
    world.doors.forEach((door, index) => {
      for (const room of [door.a, door.b]) {
        if (!room) continue;
        const list = this.doorsOf.get(room);
        if (list) list.push(index);
        else this.doorsOf.set(room, [index]);
      }
    });
  }

  /**
   * Was die Luftlinie an Dämpfung sammelt. Eine geteilte Wand steht im
   * Snapshot zweimal (je Raum eine Kante); Treffer an derselben Stelle des
   * Strahls zählen deshalb nur einmal.
   */
  private straightLoss(world: HearingWorld, from: MapPoint, to: MapPoint): number {
    const crossings: Crossing[] = [];
    for (const wall of world.walls) {
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
}

function roomIdAt(world: HearingWorld, at: MapPoint): string {
  for (const room of world.rooms) if (pointInPolygon(at, room.polygon)) return room.id;
  return '';
}

function otherSide(door: MapDoor, room: string): string {
  return door.a === room ? (door.b ?? '') : door.b === room ? door.a : '';
}

function doorLoss(door: MapDoor): number {
  return door.open ? 0 : DOOR_LOSS;
}

function distance(a: MapPoint, b: MapPoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
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
