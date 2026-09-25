import { TILE, dirX, dirZ, type Dir } from '../../nav/navTile';
import { PLAN_WALL_T } from '../../editor/levelPlan';
import {
  APRON,
  cutWalls,
  insideSpace,
  spacesOf,
  straightWalls,
  STATION_DOOR_W,
  type HouseDoor,
  type HouseRoom,
  type HouseSpec,
  type Rect,
  doorMiddle,
  doorWidth,
} from '../house';
import { COMMAND } from '../roomGraph';
import { stationLayout, type FloorBounds } from '../stationLayout';
import type { MapPoint, MapSegment, MapSnapshot } from './mapSnapshot';

/**
 * **Vom Kachelplan zur Karte** — Rechtecke in Meter, Wände mit Türlücken,
 * Sichtlinien.
 *
 * Alles hier ist reine Rechnung auf dem `HouseSpec` und dem `MapSnapshot`;
 * three.js kommt nicht vor. Die 3D-Welt baut ihre Wände aus denselben
 * Rechtecken (`GridWorld`), also ist die Kontur hier die Bounding-Box dort —
 * ohne dass eine Szene durchsucht werden müsste.
 */

/**
 * Wie dick eine Wand auf der Karte gezeichnet und begangen wird, in Metern —
 * dieselbe Zahl wie im Schiff (`editor/levelPlan.PLAN_WALL_T`). Eine eigene
 * Zahl hier war einmal 0,25 gegen 0,2 dort: fünf Zentimeter, um die die
 * 2D-Figur mehr Abstand hielt als die Kapsel im Schiff.
 */
export const WALL_T = PLAN_WALL_T;

/**
 * **Wie breit eine Türöffnung ist**, in Metern — eine Kachel abzüglich
 * Pfosten, **in beiden Welten dieselbe Zahl** (`house.STATION_DOOR_W`, seit
 * dem Paket „Eine Türbreite"): das Türblatt, das Licht und Sicht aufhält, die
 * Lücke in der Wand, durch die das Hörmodell rechnet, das gezeichnete Blatt,
 * die begehbare Öffnung — und im Schiff die Pfosten, das Blatt und der
 * Collider (`plan.ts`). Vorher baute das Schiff 1,2 m, und der 2D-Spieler
 * lief durch Pfosten, die er nicht sah.
 */
export const DOOR_WIDTH = STATION_DOOR_W;

/** Ein Rechteck in Kacheln als Kontur in Metern, gegen den Uhrzeigersinn. */
export function rectPolygon(rect: Rect): MapPoint[] {
  const x0 = rect.x * TILE,
    z0 = rect.z * TILE,
    x1 = (rect.x + rect.w) * TILE,
    z1 = (rect.z + rect.d) * TILE;
  return [
    { x: x0, z: z0 },
    { x: x0, z: z1 },
    { x: x1, z: z1 },
    { x: x1, z: z0 },
  ];
}

export function rectCentre(rect: Rect): MapPoint {
  return { x: (rect.x + rect.w / 2) * TILE, z: (rect.z + rect.d / 2) * TILE };
}

/** Wo die Mitte einer Türöffnung liegt — auf der Wand, nicht auf der Kachel. */
export function doorCentre(door: Pick<HouseDoor, 'x' | 'z' | 'dir' | 'span'>): MapPoint {
  // Bei einer Tür über zwei Kacheln die Fuge zwischen beiden
  // (`house.doorMiddle`); ein Fenster hat keine `span` und ist eine Kante.
  return doorMiddle(door);
}

/**
 * Der Punkt **hinter** einer Tür, von `towards` aus gesehen: ein Stück
 * senkrecht durch die Öffnung, damit man sie geradeaus durchschreitet.
 * Schräg auf die Mitte des Nachbarraums zu käme man neben der Öffnung an der
 * Wand an und bliebe dort hängen.
 */
export function doorWaypoint(
  door: Pick<HouseDoor, 'x' | 'z' | 'dir'>,
  towards: MapPoint,
  depth = 0.55,
): MapPoint {
  const centre = doorCentre(door);
  const nx = dirX(door.dir),
    nz = dirZ(door.dir);
  const ahead = { x: centre.x + nx * depth, z: centre.z + nz * depth };
  const behind = { x: centre.x - nx * depth, z: centre.z - nz * depth };
  const da = Math.hypot(ahead.x - towards.x, ahead.z - towards.z);
  const db = Math.hypot(behind.x - towards.x, behind.z - towards.z);
  return da <= db ? ahead : behind;
}

/**
 * Der Weg durch eine Tür in zwei Schritten: erst der Punkt **davor** (auf der
 * eigenen Seite), dann der Punkt **dahinter**. Wer aus dem Raum schräg auf
 * den Punkt dahinter zusteuert, schleift an der Wand neben der Öffnung
 * entlang; wer erst vor die Tür geht, kommt gerade hindurch.
 */
export function doorPath(
  door: Pick<HouseDoor, 'x' | 'z' | 'dir'>,
  towards: MapPoint,
  depth = 0.55,
): [MapPoint, MapPoint] {
  const far = doorWaypoint(door, towards, depth);
  const centre = doorCentre(door);
  return [{ x: 2 * centre.x - far.x, z: 2 * centre.z - far.z }, far];
}

/** Der nächste Schritt auf dem Weg durch eine Tür: davor, wenn man noch nicht dort war, sonst dahinter. */
export function nextThroughDoor(
  door: Pick<HouseDoor, 'x' | 'z' | 'dir'>,
  from: MapPoint,
  towards: MapPoint,
): MapPoint {
  const [near, far] = doorPath(door, towards);
  const centre = doorCentre(door);
  // Quer zur Öffnung gemessen: Wer schon in der Öffnung steht, geht weiter.
  const along = Math.hypot(far.x - centre.x, far.z - centre.z) || 1;
  const nx = (far.x - centre.x) / along,
    nz = (far.z - centre.z) / along;
  const depth = (from.x - centre.x) * nx + (from.z - centre.z) * nz;
  const off = Math.abs((from.x - centre.x) * -nz + (from.z - centre.z) * nx);
  // Ab dem Punkt davor geht es nur noch vorwärts: Die Schwelle liegt so,
  // dass der erste Schritt hinter `near` nicht wieder davor zurückführt.
  const atNear = Math.hypot(from.x - near.x, from.z - near.z) < 0.4;
  return (atNear || depth > -0.55) && off < 0.6 ? far : near;
}

/** Entlang welcher Achse die Öffnung liegt: Nord-/Südwand → `x`. */
export function doorAxis(dir: Dir): 'x' | 'z' {
  return dirZ(dir) !== 0 ? 'x' : 'z';
}

/**
 * Die Außenkanten aller Räume als Wandsegmente, **mit Lücken an den Türen**.
 *
 * Jede Raumkante wird einzeln geführt, auch wo zwei Räume eine Wand teilen:
 * Für Sichtlinien ist das dieselbe Wand zweimal, und das ist billig genug.
 * Fenster (`spec.windows`) werden als `window` markiert — Licht und Sicht
 * gehen hindurch, Personen nicht.
 */
export function wallSegments(spec: HouseSpec): MapSegment[] {
  const segments: MapSegment[] = [];
  const doorsOn = new Map<string, HouseDoor[]>();
  for (const door of spec.doors) {
    doorsOn.set(door.a, [...(doorsOn.get(door.a) ?? []), door]);
    if (door.b) doorsOn.set(door.b, [...(doorsOn.get(door.b) ?? []), door]);
  }
  for (const room of spacesOf(spec)) {
    // **Schräge Ecken** (`HouseRoom.cuts`) kürzen die geraden Wände, und
    // die schräge kommt als eigene Strecke dazu; ein geformter Raum
    // (`HouseRoom.shape`) hat so viele gerade Wände, wie er Kanten hat
    // (`straightWalls`).
    const edges: Array<{ a: MapPoint; b: MapPoint; axis: 'x' | 'z'; at: number }> =
      straightWalls(room);
    for (const wall of cutWalls(room))
      segments.push({ a: wall.a, b: wall.b, roomId: room.id, kind: 'wall' });
    for (const edge of edges) {
      const gaps: Array<{ from: number; to: number; kind: MapSegment['kind'] }> = [];
      for (const door of doorsOn.get(room.id) ?? []) {
        const centre = doorCentre(door);
        const axis = doorAxis(door.dir);
        if (axis !== edge.axis) continue;
        const across = axis === 'x' ? centre.z : centre.x;
        if (Math.abs(across - edge.at) > 1e-6) continue;
        const along = axis === 'x' ? centre.x : centre.z;
        const half = doorWidth(door) / 2;
        gaps.push({ from: along - half, to: along + half, kind: 'wall' });
      }
      for (const window of spec.windows) {
        if (window.roomId !== room.id) continue;
        const centre = doorCentre(window);
        const axis = doorAxis(window.dir);
        if (axis !== edge.axis) continue;
        const across = axis === 'x' ? centre.z : centre.x;
        if (Math.abs(across - edge.at) > 1e-6) continue;
        const along = axis === 'x' ? centre.x : centre.z;
        gaps.push({ from: along - DOOR_WIDTH / 2, to: along + DOOR_WIDTH / 2, kind: 'window' });
      }
      gaps.sort((p, q) => p.from - q.from);
      const start = edge.axis === 'x' ? edge.a.x : edge.a.z;
      const end = edge.axis === 'x' ? edge.b.x : edge.b.z;
      const point = (along: number): MapPoint =>
        edge.axis === 'x' ? { x: along, z: edge.at } : { x: edge.at, z: along };
      let cursor = start;
      for (const gap of gaps) {
        if (gap.from > cursor + 1e-6)
          segments.push({ a: point(cursor), b: point(gap.from), roomId: room.id, kind: 'wall' });
        if (gap.kind === 'window')
          segments.push({ a: point(gap.from), b: point(gap.to), roomId: room.id, kind: 'window' });
        cursor = Math.max(cursor, gap.to);
      }
      if (cursor < end - 1e-6)
        segments.push({ a: point(cursor), b: point(end), roomId: room.id, kind: 'wall' });
    }
  }
  return segments;
}

/** Ob sich zwei Strecken schneiden (Berührung eingeschlossen). */
export function segmentsCross(p: MapPoint, q: MapPoint, a: MapPoint, b: MapPoint): boolean {
  const d1 = orient(a, b, p),
    d2 = orient(a, b, q),
    d3 = orient(p, q, a),
    d4 = orient(p, q, b);
  if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  if (d1 === 0 && between(a, b, p)) return true;
  if (d2 === 0 && between(a, b, q)) return true;
  if (d3 === 0 && between(p, q, a)) return true;
  if (d4 === 0 && between(p, q, b)) return true;
  return false;
}

function orient(a: MapPoint, b: MapPoint, c: MapPoint): number {
  const v = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  return Math.abs(v) < 1e-9 ? 0 : Math.sign(v);
}

function between(a: MapPoint, b: MapPoint, p: MapPoint): boolean {
  return (
    p.x >= Math.min(a.x, b.x) - 1e-9 &&
    p.x <= Math.max(a.x, b.x) + 1e-9 &&
    p.z >= Math.min(a.z, b.z) - 1e-9 &&
    p.z <= Math.max(a.z, b.z) + 1e-9
  );
}

/**
 * Wo der Strahl `from → to` das Segment `a–b` trifft, als Anteil `t` der
 * Strecke `from → to`; `Infinity`, wenn nicht.
 */
export function rayHit(from: MapPoint, to: MapPoint, a: MapPoint, b: MapPoint): number {
  const rx = to.x - from.x,
    rz = to.z - from.z;
  const sx = b.x - a.x,
    sz = b.z - a.z;
  const denominator = rx * sz - rz * sx;
  if (Math.abs(denominator) < 1e-12) return Infinity;
  const qx = a.x - from.x,
    qz = a.z - from.z;
  const t = (qx * sz - qz * sx) / denominator;
  const u = (qx * rz - qz * rx) / denominator;
  return t >= 0 && t <= 1 && u >= -1e-9 && u <= 1 + 1e-9 ? t : Infinity;
}

/**
 * Sichtlinie über den Snapshot: Wände und **geschlossene** Türblätter
 * halten auf, Fenster und Glas nicht.
 */
export function lineOfSight(snapshot: MapSnapshot, from: MapPoint, to: MapPoint): boolean {
  for (const wall of snapshot.walls) {
    if (wall.kind !== 'wall') continue;
    if (segmentsCross(from, to, wall.a, wall.b)) return false;
  }
  for (const door of snapshot.doors) {
    if (door.open) continue;
    const [a, b] = doorLeaf(door.at, door.axis, door.width);
    if (segmentsCross(from, to, a, b)) return false;
  }
  return true;
}

/** Das Türblatt als Strecke — quer über die Öffnung. */
export function doorLeaf(at: MapPoint, axis: 'x' | 'z', width: number): [MapPoint, MapPoint] {
  return axis === 'x'
    ? [
        { x: at.x - width / 2, z: at.z },
        { x: at.x + width / 2, z: at.z },
      ]
    : [
        { x: at.x, z: at.z - width / 2 },
        { x: at.x, z: at.z + width / 2 },
      ];
}

/** Die Zentrale als Rechteck in Metern — der Vorplatz mit der Einsatzzentrale. */
export function commandRect(): Rect {
  return APRON;
}

/**
 * In welchem Raum, Gang oder auf welchem Vorplatz ein Punkt liegt.
 *
 * Mit `prefer` und `margin` wird der Wechsel **träge**: Ein neuer Raum zählt
 * erst, wenn der Punkt `margin` Meter tief darin steht — also durch die
 * Türnische hindurch ist. Wer genau auf der Linie zwischen Gang und Zimmer
 * steht, würde sonst in jedem Bild den Raum wechseln, und mit ihm die
 * Wegsuche, die dann jedes Bild eine andere Tür will; und wer in der Nische
 * schon als „drüben" gilt, will von dort aus schräg durch die Wand.
 */
export function spaceAtMetres(
  spec: HouseSpec,
  at: MapPoint,
  prefer = '',
  margin = 0,
): HouseRoom | typeof COMMAND | null {
  const spaces = spacesOf(spec);
  if (prefer === COMMAND && insideRect(APRON, at)) return COMMAND;
  if (prefer) {
    const known = spaces.find((room) => room.id === prefer);
    if (known && insideSpace(known, at)) return known;
  }
  for (const room of spaces) if (insideSpace(room, at, margin)) return room;
  if (insideRect(APRON, at, margin)) return COMMAND;
  if (prefer) {
    // Noch in der Nische: Der alte Raum gilt weiter.
    const known = spaces.find((room) => room.id === prefer);
    if (known) return known;
    if (prefer === COMMAND) return COMMAND;
  }
  for (const room of spaces) if (insideSpace(room, at)) return room;
  return insideRect(APRON, at) ? COMMAND : null;
}

export function insideRect(rect: Rect, at: MapPoint, inset = 0): boolean {
  return (
    at.x >= rect.x * TILE + inset &&
    at.x <= (rect.x + rect.w) * TILE - inset &&
    at.z >= rect.z * TILE + inset &&
    at.z <= (rect.z + rect.d) * TILE - inset
  );
}

const blockCache = new WeakMap<HouseSpec, readonly FloorBounds[]>();

/**
 * **Die Grundflächen der Möbel** — Schränke, Tanks, Konsolen, Kisten — als
 * Hindernisse in Metern (`stationLayout.ts`, dieselben `bounds`, mit denen
 * schon die Wegsuche rechnet, `stationNavigation.buildGrid`).
 *
 * In 3D steht der Techniker vor einem Tank; in 2D lief er hindurch, weil die
 * Bewegung nur Räume und Türen kannte. **Es gibt eine Spielwelt und zwei
 * Darstellungen** — also steht der Tank auch hier im Weg. Die Wegsuche wich
 * ihm ohnehin schon aus; erst mit dieser Liste tut es der Schritt auch.
 */
export function fixtureBlocks(spec: HouseSpec): readonly FloorBounds[] {
  let blocks = blockCache.get(spec);
  if (!blocks) {
    blocks = stationLayout(spec).map((placement) => placement.bounds);
    blockCache.set(spec, blocks);
  }
  return blocks;
}

/** Ob ein Punkt mit `radius` Körper in einer dieser Grundflächen steckt. */
export function insideBlocks(
  blocks: readonly FloorBounds[],
  at: MapPoint,
  radius: number,
): boolean {
  for (const box of blocks)
    if (
      at.x > box.minX - radius &&
      at.x < box.maxX + radius &&
      at.z > box.minZ - radius &&
      at.z < box.maxZ + radius
    )
      return true;
  return false;
}

/**
 * **Ob man hier stehen darf** — innerhalb eines Raums mit Abstand zur Wand,
 * oder in einer Türöffnung, die nicht gesperrt ist, und in keinem Fall
 * mitten in einem Möbel (`blocks`, aus `fixtureBlocks`).
 *
 * Die Türöffnung ist ein kleines Rechteck quer über die Wand, so lang wie die
 * Wand dick ist plus der Abstand, den der Raum sonst verlangt: Wer in der
 * Öffnung steht, ist in keinem Raum „mit Abstand", und ohne diese Insel käme
 * niemand durch eine Tür.
 */
export function walkable(
  spec: HouseSpec,
  shut: readonly string[],
  at: MapPoint,
  radius: number,
  blocks: readonly FloorBounds[] = [],
): boolean {
  if (insideBlocks(blocks, at, radius)) return false;
  const inset = WALL_T / 2 + radius;
  for (const room of spacesOf(spec)) if (insideSpace(room, at, inset)) return true;
  if (insideRect(APRON, at, inset)) return true;
  for (const door of spec.doors) {
    if (shut.includes(door.id)) continue;
    const centre = doorCentre(door);
    const axis = doorAxis(door.dir);
    // **Zwei Türen Kante an Kante sind eine Öffnung.** Zwischen zwei Gängen
    // steht auf jeder gemeinsamen Kachelkante eine Tür, und seit eine Tür die
    // ganze Kante misst, gibt es zwischen ihnen keinen Pfosten mehr — auch
    // nicht auf der Karte: Wer genau auf der Fuge zwischen beiden steht, steht
    // in einer offenen Tür und nicht in einer Wand.
    const [from, to] = openingAlong(spec, shut, door);
    const depth = inset + 0.05;
    const along = axis === 'x' ? at.x - centre.x : at.z - centre.z;
    const across = axis === 'x' ? at.z - centre.z : at.x - centre.x;
    if (along >= from + radius && along <= to - radius && Math.abs(across) <= depth) return true;
  }
  return false;
}

/**
 * Die Öffnung, zu der eine Tür gehört, entlang ihrer Wand — von `door` aus
 * gemessen: die eigene Kante plus jede offene Tür, die auf derselben Wand
 * unmittelbar daneben steht, in beide Richtungen.
 */
function openingAlong(spec: HouseSpec, shut: readonly string[], door: HouseDoor): [number, number] {
  const centre = doorCentre(door);
  const axis = doorAxis(door.dir);
  let from = -doorWidth(door) / 2;
  let to = doorWidth(door) / 2;
  const neighbours = spec.doors.filter((other) => {
    if (other === door || shut.includes(other.id) || doorAxis(other.dir) !== axis) return false;
    const at = doorCentre(other);
    const across = axis === 'x' ? at.z - centre.z : at.x - centre.x;
    return Math.abs(across) < 1e-6;
  });
  const offsets = neighbours.map((other) => {
    const at = doorCentre(other);
    return { at: axis === 'x' ? at.x - centre.x : at.z - centre.z, half: doorWidth(other) / 2 };
  });
  let grew = true;
  while (grew) {
    grew = false;
    for (const { at: offset, half } of offsets) {
      if (Math.abs(offset - half - to) < 1e-6) {
        to = offset + half;
        grew = true;
      } else if (Math.abs(offset + half - from) < 1e-6) {
        from = offset - half;
        grew = true;
      }
    }
  }
  return [from, to];
}

/**
 * Einen Schritt gehen, mit Gleiten an Wänden **und an Möbeln**: erst beide
 * Achsen, dann jede für sich. Was nicht geht, wird verworfen — es gibt kein
 * Durchdrücken.
 */
export function slide(
  spec: HouseSpec,
  shut: readonly string[],
  from: MapPoint,
  dx: number,
  dz: number,
  radius: number,
  blocks: readonly FloorBounds[] = [],
): MapPoint {
  const tries: MapPoint[] = [
    { x: from.x + dx, z: from.z + dz },
    { x: from.x + dx, z: from.z },
    { x: from.x, z: from.z + dz },
  ];
  for (const to of tries) if (walkable(spec, shut, to, radius, blocks)) return to;
  return from;
}
