/**
 * **Welche Wände zu einem Raum gehören** — die Rechnung hinter der Tapete.
 *
 * Gewünscht (September 2026): _„Was alle ein Raum ist könnten wir so
 * definieren: in Blickrichtung des Spielers auf erste Wand treffen, dann in
 * beide Richtungen der Wand weiter gehen, bis die Wände sich wieder treffen
 * (Türen und Fenster sind in dem Sinne auch Wände). Wenn eine Wand keinen
 * Nachbar hat, dann wird nicht auf die Rückseite gesprungen."_
 *
 * Genau das steht hier, ohne Szene:
 *
 * - **Die erste Wand im Blick** (`firstWall`): ein Strahl über den Boden, in
 *   Blickrichtung, und die nächste Wandkante, die er schneidet. Getroffen ist
 *   die Seite, die zum Spieler zeigt.
 * - **An der Wand entlang** (`traceRoom`): von beiden Enden der getroffenen
 *   Kante aus, und an jeder Ecke die Wand, die am weitesten **zum Raum hin**
 *   abbiegt. So bleibt man auf der Innenseite, auch an einer Ecke, an der
 *   draußen noch eine Wand weitergeht. Schließt sich der Kreis, ist der Raum
 *   fertig; endet eine Wand ohne Nachbarn, hört diese Richtung dort auf — sie
 *   läuft **nicht** um das Ende herum auf die Rückseite.
 *
 * Wände sind hier Strecken zwischen Ecken des Kachelgitters (`Corner`, ganze
 * Zahlen: die Fugen), gerade oder unter 45°. Ein Stück aus dem Regal, das zwei
 * Kacheln lang ist, wird in zwei Einheiten zerlegt: Stößt eine andere Wand an
 * seine Mitte, ist dort eine Ecke wie jede andere.
 */

/** Eine Ecke des Kachelgitters: dort, wo sich Fugen kreuzen. */
export interface Corner {
  readonly x: number;
  readonly z: number;
}

/**
 * **Ein Wandstück, wie es steht** — von Ecke `a` bis Ecke `b`, gerade oder
 * unter 45°, und welche Seite seine **Vorderseite** ist (die Richtung, in die
 * seine Vorderseite in der Welt zeigt).
 */
export interface WallPiece {
  readonly id: string;
  readonly a: Corner;
  readonly b: Corner;
  readonly front: { readonly x: number; readonly z: number };
}

/** Eine Seite eines Wandstücks — die, die im Raum liegt. */
export interface PieceFace {
  readonly id: string;
  /** Die Vorderseite des Stücks (`WallPiece.front`) oder die Rückseite. */
  readonly front: boolean;
}

/** Eine Einheit: ein Stück Wand über eine Kachel (oder eine Diagonale). */
interface Unit {
  readonly piece: WallPiece;
  readonly a: Corner;
  readonly b: Corner;
}

/** Wie weit der Blick eine Wand sucht, in Metern. */
export const LOOK_WALL_REACH = 12;
/** Wie viele Einheiten ein Raum höchstens hat — eine Sicherung, kein Maß. */
export const ROOM_UNITS_MAX = 2000;

const cornerKey = (c: Corner): string => `${c.x},${c.z}`;

/** Die Stücke in Einheiten zerlegt — je Kachel eine, gerade oder schräg. */
function unitsOf(pieces: readonly WallPiece[]): Unit[] {
  const units: Unit[] = [];
  const seen = new Set<string>();
  for (const piece of pieces) {
    const dx = piece.b.x - piece.a.x;
    const dz = piece.b.z - piece.a.z;
    const steps = Math.max(Math.abs(dx), Math.abs(dz));
    if (steps === 0) continue;
    // Nur gerade oder unter 45° — alles andere ist keine Wand auf dem Gitter.
    if (dx !== 0 && dz !== 0 && Math.abs(dx) !== Math.abs(dz)) continue;
    const sx = Math.sign(dx);
    const sz = Math.sign(dz);
    for (let k = 0; k < steps; k++) {
      const a = { x: piece.a.x + sx * k, z: piece.a.z + sz * k };
      const b = { x: a.x + sx, z: a.z + sz };
      // Zwei Stücke auf derselben Fuge: das erste gilt, wie `replaceWalls`.
      const key = [cornerKey(a), cornerKey(b)].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      units.push({ piece, a, b });
    }
  }
  return units;
}

/** Links von `a → b` (in x/z): die Normale, die `side = 1` meint. */
function leftNormal(a: Corner, b: Corner): { x: number; z: number } {
  return { x: -(b.z - a.z), z: b.x - a.x };
}

/** Welche Seite eines Stücks die ist, die in Richtung `normal` zeigt. */
function faceOf(unit: Unit, normal: { x: number; z: number }): PieceFace {
  const dot = normal.x * unit.piece.front.x + normal.z * unit.piece.front.z;
  return { id: unit.piece.id, front: dot >= 0 };
}

/** Wo sich der Strahl und die Strecke schneiden — Abstand auf dem Strahl, oder `null`. */
function rayHit(
  ox: number,
  oz: number,
  dx: number,
  dz: number,
  a: Corner,
  b: Corner,
): number | null {
  const ex = b.x - a.x;
  const ez = b.z - a.z;
  const denom = dx * ez - dz * ex;
  if (Math.abs(denom) < 1e-9) return null;
  const qx = a.x - ox;
  const qz = a.z - oz;
  const t = (qx * ez - qz * ex) / denom;
  const u = (qx * dz - qz * dx) / denom;
  if (t < 0 || u < 0 || u > 1) return null;
  return t;
}

/** Die getroffene Kante und die Seite, die zum Spieler zeigt. */
export interface WallHit {
  readonly unit: number;
  /** `1`: die Seite links von `a → b` der Einheit, `-1`: die rechte. */
  readonly side: 1 | -1;
  readonly distance: number;
}

/**
 * **Die erste Wand in Blickrichtung** — vom Spieler (`x`, `z`) in Richtung
 * (`dx`, `dz`) über den Boden, bis `LOOK_WALL_REACH`.
 */
export function firstWall(
  pieces: readonly WallPiece[],
  x: number,
  z: number,
  dx: number,
  dz: number,
): { hit: WallHit; units: readonly Unit[] } | null {
  const length = Math.hypot(dx, dz);
  if (length < 1e-9) return null;
  const ux = dx / length;
  const uz = dz / length;
  const units = unitsOf(pieces);
  let best: WallHit | null = null;
  units.forEach((unit, index) => {
    const t = rayHit(x, z, ux, uz, unit.a, unit.b);
    if (t === null || t > LOOK_WALL_REACH || (best && t >= best.distance)) return;
    const n = leftNormal(unit.a, unit.b);
    const toward = n.x * (x - unit.a.x) + n.z * (z - unit.a.z);
    best = { unit: index, side: toward >= 0 ? 1 : -1, distance: t };
  });
  return best ? { hit: best, units } : null;
}

/**
 * **Die Seiten aller Wandstücke eines Raums** — ab der Wand im Blick
 * (`firstWall`), an ihr entlang in beide Richtungen.
 *
 * Jedes Stück kommt höchstens einmal je Seite vor. Die Reihenfolge ist die
 * des Weges: erst das getroffene Stück, dann vorwärts, dann rückwärts.
 */
export function traceRoom(
  pieces: readonly WallPiece[],
  x: number,
  z: number,
  dx: number,
  dz: number,
): PieceFace[] {
  const found = firstWall(pieces, x, z, dx, dz);
  if (!found) return [];
  const { hit, units } = found;
  const at = new Map<string, number[]>();
  units.forEach((unit, index) => {
    for (const corner of [unit.a, unit.b]) {
      const key = cornerKey(corner);
      const list = at.get(key);
      if (list) list.push(index);
      else at.set(key, [index]);
    }
  });

  const faces: PieceFace[] = [];
  const seenFace = new Set<string>();
  const add = (face: PieceFace): void => {
    const key = `${face.id}|${face.front ? 1 : 0}`;
    if (seenFace.has(key)) return;
    seenFace.add(key);
    faces.push(face);
  };
  const start = units[hit.unit]!;
  const startNormal = leftNormal(start.a, start.b);
  add(
    faceOf(start, {
      x: startNormal.x * hit.side,
      z: startNormal.z * hit.side,
    }),
  );

  /**
   * Von `from` nach `to` auf der Einheit `index` laufen, der Raum auf der
   * Seite `inside` (`1` links der Laufrichtung, `-1` rechts), und weiter, bis
   * der Kreis sich schließt oder eine Wand endet.
   */
  const walk = (index: number, from: Corner, to: Corner, inside: 1 | -1): void => {
    const visited = new Set<string>();
    let current = index;
    let a = from;
    let b = to;
    for (let guard = 0; guard < ROOM_UNITS_MAX; guard++) {
      const dxs = b.x - a.x;
      const dzs = b.z - a.z;
      let next = -1;
      let nextEnd: Corner | null = null;
      let bestTurn = -Infinity;
      for (const other of at.get(cornerKey(b)) ?? []) {
        if (other === current) continue;
        const unit = units[other]!;
        const end = cornerKey(unit.a) === cornerKey(b) ? unit.b : unit.a;
        const ex = end.x - b.x;
        const ez = end.z - b.z;
        // Links abbiegen ist in x/z (z nach Süden) ein positives Kreuzprodukt
        // — dieselbe Händigkeit wie `leftNormal`.
        const cross = dxs * ez - dzs * ex;
        const dot = dxs * ex + dzs * ez;
        const turn = inside * Math.atan2(cross, dot);
        if (turn > bestTurn) {
          bestTurn = turn;
          next = other;
          nextEnd = end;
        }
      }
      // Eine Wand ohne Nachbarn: hier hört diese Richtung auf.
      if (next < 0 || !nextEnd) return;
      if (next === hit.unit) return;
      const key = `${next}|${cornerKey(b)}`;
      if (visited.has(key)) return;
      visited.add(key);
      const unit = units[next]!;
      const n = leftNormal(b, nextEnd);
      add(faceOf(unit, { x: n.x * inside, z: n.z * inside }));
      current = next;
      a = b;
      b = nextEnd;
    }
  };

  walk(hit.unit, start.a, start.b, hit.side);
  walk(hit.unit, start.b, start.a, hit.side === 1 ? -1 : 1);
  return faces;
}

/** Eine Kachel: Spalte und Reihe (die Kachel von `x` bis `x + 1`). */
export interface RoomTile {
  readonly x: number;
  readonly z: number;
}

/** Wie viele Kacheln ein Raum für den Boden höchstens hat — sonst ist er keiner. */
export const ROOM_TILES_MAX = 400;

/**
 * **Die Kacheln eines Raums** — für den Bodenbelag: von der Kachel unter dem
 * Spieler aus über jede Kante, auf der keine Wand steht. Türen und Fenster
 * sind Wände wie bei der Tapete. Eine Kachel, durch die eine Wand unter 45°
 * geht, gehört dazu, aber über sie hinaus geht es nicht weiter.
 *
 * `null`, wenn der Raum nicht zu ist: Wer im Freien steht, bekommt keinen
 * Boden bis zum Horizont (`ROOM_TILES_MAX`).
 */
export function roomTiles(
  pieces: readonly WallPiece[],
  x: number,
  z: number,
  max = ROOM_TILES_MAX,
): RoomTile[] | null {
  const blocked = new Set<string>();
  const slanted = new Set<string>();
  for (const unit of unitsOf(pieces)) {
    const dx = unit.b.x - unit.a.x;
    const dz = unit.b.z - unit.a.z;
    const minX = Math.min(unit.a.x, unit.b.x);
    const minZ = Math.min(unit.a.z, unit.b.z);
    // Eine Kante heißt nach der Kachel und der Seite, zu der sie gehört:
    // `h` die Nordkante der Kachel (x, z), `v` die Westkante.
    if (dz === 0) blocked.add(`h${minX},${unit.a.z}`);
    else if (dx === 0) blocked.add(`v${unit.a.x},${minZ}`);
    else slanted.add(`${minX},${minZ}`);
  }
  const start = { x: Math.floor(x), z: Math.floor(z) };
  const seen = new Set<string>([`${start.x},${start.z}`]);
  const out: RoomTile[] = [];
  const queue: RoomTile[] = [start];
  while (queue.length > 0) {
    const tile = queue.shift()!;
    out.push(tile);
    if (out.length > max) return null;
    if (slanted.has(`${tile.x},${tile.z}`) && out.length > 1) continue;
    const steps: Array<[RoomTile, string]> = [
      [{ x: tile.x, z: tile.z - 1 }, `h${tile.x},${tile.z}`],
      [{ x: tile.x, z: tile.z + 1 }, `h${tile.x},${tile.z + 1}`],
      [{ x: tile.x - 1, z: tile.z }, `v${tile.x},${tile.z}`],
      [{ x: tile.x + 1, z: tile.z }, `v${tile.x + 1},${tile.z}`],
    ];
    for (const [next, edge] of steps) {
      const key = `${next.x},${next.z}`;
      if (blocked.has(edge) || seen.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return out;
}

/**
 * **Die Kacheln an den Wänden** — zu beiden Seiten jeder Einheit, und bei einer
 * Wand unter 45° die Kachel, durch die sie geht. Von hier aus sucht
 * `closedRooms` die Räume, und hier steht, worauf oben eine Wand steht.
 */
export function wallSideTiles(pieces: readonly WallPiece[]): RoomTile[] {
  const out = new Map<string, RoomTile>();
  const add = (x: number, z: number): void => {
    out.set(`${x},${z}`, { x, z });
  };
  for (const unit of unitsOf(pieces)) {
    const minX = Math.min(unit.a.x, unit.b.x);
    const minZ = Math.min(unit.a.z, unit.b.z);
    if (unit.a.z === unit.b.z) {
      add(minX, minZ - 1);
      add(minX, minZ);
    } else if (unit.a.x === unit.b.x) {
      add(minX - 1, minZ);
      add(minX, minZ);
    } else {
      // Die Kachel, durch die sie geht, und je Seite eine daneben — aus der
      // Kachel selbst liefe `roomTiles` nach beiden Seiten.
      add(minX, minZ);
      add(minX + 1, minZ);
      add(minX, minZ + 1);
      add(minX - 1, minZ);
      add(minX, minZ - 1);
    }
  }
  return [...out.values()];
}

/**
 * **Alle geschlossenen Räume** einer Etage — für die Decke: jeder Raum, der
 * an einer Wand liegt und zu ist (`roomTiles`). Das Freie ist keiner, es ist
 * größer als `max`.
 */
export function closedRooms(pieces: readonly WallPiece[], max = ROOM_TILES_MAX): RoomTile[][] {
  const seen = new Set<string>();
  const rooms: RoomTile[][] = [];
  for (const start of wallSideTiles(pieces)) {
    if (seen.has(`${start.x},${start.z}`)) continue;
    const room = roomTiles(pieces, start.x + 0.5, start.z + 0.5, max);
    if (!room) continue;
    for (const tile of room) seen.add(`${tile.x},${tile.z}`);
    rooms.push(room);
  }
  return rooms;
}
