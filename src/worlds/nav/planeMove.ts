import { CELL, type CellGrid, type Slope } from './cellGrid';
import { DIR_E, DIR_N, DIR_S, DIR_W, TILE, dirX, dirZ, type Dir } from './navTile';

/**
 * **Gehen in der Ebene: Collide and Slide.**
 *
 * Gewünscht (Oktober 2026): _„Beim Laufen gegen eine schräge Wand ruckelt der
 * Spieler, statt schön sauber an der Wand smooth runterzulaufen"_ — und zwar
 * _„nicht mit der 3D-Kollision, sondern auf der 2D-Ebene. Das Spiel wird in
 * 3D gerendert, aber die Spieler bewegen sich an sich nur in der 2D-Ebene."_
 *
 * Bis dahin fragte der Spieler das Zellgitter mit Ja und Nein: erst den
 * ganzen Schritt, dann nur längs x, nur längs z, dann längs der beiden
 * Diagonalen (`cellGrid.diagonalSlides`). An einer Schräge gewann je Bild eine
 * andere dieser Möglichkeiten, und genau das war das Ruckeln — ein Zickzack
 * aus Achsen statt einer Bewegung längs der Wand.
 *
 * Jetzt ist der Spieler ein **Kreis** (`PLAYER_PLANE_RADIUS`) und die Welt
 * eine Menge von **Strecken** (`PlaneWall`): Wände auf Kachelkanten, Schrägen
 * über die Diagonale ihrer Kachel, gesperrte Zellen als Kästen. Ein Schritt
 * wird gemacht und der Kreis danach aus jeder Strecke herausgeschoben, die er
 * berührt — senkrecht zu ihr. Was vom Schritt übrig bleibt, ist genau sein
 * Anteil **längs** der Wand; das ist das Gleiten, bei jeder Wand in jedem
 * Winkel, ohne Fallunterscheidung. An einem Wandende rundet der Kreis die
 * Ecke, statt an ihr hängen zu bleiben.
 */

/**
 * **Wie nah die Mitte des Spielers einer Wand kommt**, in Metern: 0,35 — gut
 * zwei Drittel einer Zelle.
 *
 * Etwa so nah kam sie auch vorher an eine gerade Wand (die Blockmitte eine
 * halbe Kachel davor, darüber hinaus eine Achtelzelle, `cellGrid.standable`).
 * Die Zahl hat zwei Grenzen:
 *
 * - **Über Eck** (das Bild des Besitzers, `docs/agents/zellgitter.md`) liegen
 *   zwei Hindernisse, die sich schräg gegenüberstehen, √½ ≈ 0,707 m
 *   auseinander — und dort soll man hindurch. Mit 0,375 m (drei Viertel einer
 *   Zelle) passte der Kreis nicht mehr.
 * - Ein Gang und eine Lücke von einem Meter bleiben ohnehin gangbar, und der
 *   Körper (0,24 m) steht vor einer Planwand (0,1 m) frei.
 */
export const PLAYER_PLANE_RADIUS = 0.35;

/**
 * **Eine Wand in der Ebene** — eine Strecke von (`ax`, `az`) nach (`bx`, `bz`).
 *
 * `outside` macht sie zur **Einbahnwand**: Sie hält nur, wer auf der Seite
 * steht, in die dieser Vektor zeigt — die Seiten einer Treppe von außen. Wer
 * auf der Treppe steht, geht durch sie hindurch und herunter.
 */
export interface PlaneWall {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  outside?: { x: number; z: number };
}

/** In welchen Stücken ein Schritt gemacht wird: ein Viertel des Radius. */
const SUBSTEP = 0.25;
/** Wie oft je Stück aus einer Wand herausgeschoben wird — mehrmals für Ecken. */
const PUSH_ROUNDS = 8;

/**
 * **Einen Kreis um (`dx`, `dz`) bewegen und an den Wänden entlanggleiten
 * lassen.** Gibt die neue Mitte zurück.
 *
 * Der Schritt wird in Stücke von einem Viertel des Radius geteilt, damit ein
 * langes Bild durch keine Wand springt: Nach jedem Stück steht die Mitte
 * mindestens `radius` vor jeder Wand, und ein Stück bringt sie nicht über die
 * Linie.
 */
export function slideCircle(
  walls: readonly PlaneWall[],
  x: number,
  z: number,
  dx: number,
  dz: number,
  radius = PLAYER_PLANE_RADIUS,
): { x: number; z: number } {
  const pieces = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (radius * SUBSTEP)));
  const sx = dx / pieces,
    sz = dz / pieces;
  let px = x,
    pz = z;
  for (let i = 0; i < pieces; i++) {
    const fromX = px,
      fromZ = pz;
    px += sx;
    pz += sz;
    // Immer zuerst aus der Wand, in der der Kreis am tiefsten steckt. An der
    // Fuge zweier Stücke derselben Wand ist das die, an der er entlanggleitet
    // — und nicht das Ende der anderen, das ihn sonst um die Fuge herum ein
    // Stück vorwärtsschöbe.
    for (let round = 0; round < PUSH_ROUNDS; round++) {
      const deepest = deepestWall(walls, px, pz, fromX, fromZ, radius);
      if (!deepest) break;
      const out = pushOut(deepest.wall, px, pz, fromX, fromZ, deepest.reach);
      px = out.x;
      pz = out.z;
    }
    // **Wo der Kreis nicht hinpasst, bleibt er stehen.** In einer Lücke, die
    // schmaler ist als er (zwischen einer Schräge und einer Mauerecke der
    // Station), schob ihn jede Wand in die andere, und er pendelte Bild für
    // Bild zwischen zwei Stellen hin und her. Steckt er nach allen Runden
    // noch in einer Wand — und tiefer als vor dem Stück —, gilt das Stück
    // nicht.
    const left = deepestWall(walls, px, pz, fromX, fromZ, radius);
    if (left && left.depth > STUCK) {
      const before = deepestWall(walls, fromX, fromZ, fromX, fromZ, radius);
      if (!before || left.depth >= before.depth - 1e-6) {
        px = fromX;
        pz = fromZ;
        break;
      }
    }
  }
  return { x: px, z: pz };
}

/** Wie tief der Kreis nach allen Runden noch in einer Wand stecken darf, in Metern. */
const STUCK = 1e-4;

/**
 * **Die Wand, in der der Kreis um (`px`, `pz`) am tiefsten steckt** — samt
 * ihrer Reichweite und der Tiefe, oder `null`, wenn er keine berührt.
 */
function deepestWall(
  walls: readonly PlaneWall[],
  px: number,
  pz: number,
  fromX: number,
  fromZ: number,
  radius: number,
): { wall: PlaneWall; reach: number; depth: number } | null {
  let best: { wall: PlaneWall; reach: number; depth: number } | null = null;
  for (const wall of walls) {
    // Eine Einbahnwand zählt nur für den, der vor dem Stück draußen stand —
    // und wer gerade erst von der Treppe heruntergeht, steckt noch halb
    // darin. Ihn hält sie nur dort, wo er schon ist: Er kommt nicht zurück
    // hinein, wird aber auch nicht mit einem Ruck hinausgeworfen.
    let reach = radius;
    if (wall.outside) {
      if (sideOf(wall, fromX, fromZ) <= 0) continue;
      reach = Math.min(radius, gapTo(wall, fromX, fromZ));
    }
    const depth = reach - gapTo(wall, px, pz);
    if (depth > (best?.depth ?? 1e-9)) best = { wall, reach, depth };
  }
  return best;
}

/** Auf welcher Seite einer Einbahnwand ein Punkt liegt: > 0 heißt draußen. */
function sideOf(wall: PlaneWall, x: number, z: number): number {
  const out = wall.outside!;
  return (x - wall.ax) * out.x + (z - wall.az) * out.z;
}

/** Wie weit ein Punkt von einer Strecke weg ist. */
function gapTo(wall: PlaneWall, x: number, z: number): number {
  const ex = wall.bx - wall.ax,
    ez = wall.bz - wall.az;
  const length2 = ex * ex + ez * ez;
  const t =
    length2 > 0 ? Math.min(1, Math.max(0, ((x - wall.ax) * ex + (z - wall.az) * ez) / length2)) : 0;
  return Math.hypot(x - wall.ax - ex * t, z - wall.az - ez * t);
}

/**
 * **Den Kreis um (`px`, `pz`) aus einer Wand schieben**, bis er sie nur noch
 * berührt. Liegt die Mitte genau auf der Linie, entscheidet die Seite,
 * von der das Stück kam (`fromX`, `fromZ`).
 */
function pushOut(
  wall: PlaneWall,
  px: number,
  pz: number,
  fromX: number,
  fromZ: number,
  radius: number,
): { x: number; z: number } {
  const ex = wall.bx - wall.ax,
    ez = wall.bz - wall.az;
  const length2 = ex * ex + ez * ez;
  const t =
    length2 > 0
      ? Math.min(1, Math.max(0, ((px - wall.ax) * ex + (pz - wall.az) * ez) / length2))
      : 0;
  const qx = wall.ax + ex * t,
    qz = wall.az + ez * t;
  let nx = px - qx,
    nz = pz - qz;
  const gap = Math.hypot(nx, nz);
  if (gap > 1e-9) {
    nx /= gap;
    nz /= gap;
  } else {
    // Genau auf der Linie: senkrecht zu ihr, zur Seite, von der man kam.
    const len = Math.sqrt(length2) || 1;
    nx = -ez / len;
    nz = ex / len;
    if ((fromX - qx) * nx + (fromZ - qz) * nz < 0) {
      nx = -nx;
      nz = -nz;
    }
  }
  return { x: qx + nx * radius, z: qz + nz * radius };
}

/**
 * **Die Wände des Zellgitters um eine Stelle, als Strecken** — alles, was in
 * den Kacheln `tx0…tx1` × `tz0…tz1` auf dieser Etage steht:
 *
 * - **Kanten**, über die man nicht kommt (Wand, Fenster, geschlossene Tür,
 *   eingerastete Regalwand) — gefragt von beiden Seiten, denn am Rand des
 *   Grundrisses weiß nur die eine davon.
 * - **Schrägen** als Diagonale ihrer Kachel, von Ecke zu Ecke. Früher waren sie
 *   zwei gesperrte Zellen `[ ][x] / [x][ ]`, an deren Ecken man hängen blieb;
 *   als Linie gleitet man an ihr so glatt wie an einer geraden Wand.
 * - **Gesperrte Zellen** (Möbel, fehlender Boden) als Kästen — nur die Seiten,
 *   hinter denen keine gesperrte Zelle liegt.
 * - **Die Seiten einer Treppe** als Einbahnwände (`PlaneWall.outside`): Wer
 *   daneben steht, kommt nicht seitlich hinauf; wer auf ihr steht, darf
 *   herunter. Liegt daneben ein Lauf derselben Richtung (eine breite Treppe),
 *   ist dort keine Seite.
 */
export function cellPlaneWalls(
  grid: CellGrid,
  tx0: number,
  tz0: number,
  tx1: number,
  tz1: number,
  level = 0,
): PlaneWall[] {
  const out: PlaneWall[] = [];
  const edgeClosed = (tx: number, tz: number, dir: Dir): boolean =>
    !grid.edgeOpen(tx, tz, dir, level) ||
    !grid.edgeOpen(tx + dirX(dir), tz + dirZ(dir), ((dir + 2) % 4) as Dir, level);
  for (let tz = tz0; tz <= tz1; tz++)
    for (let tx = tx0; tx <= tx1; tx++) {
      const x = tx * TILE,
        z = tz * TILE;
      // Nord- und Westkante jeder Kachel, dazu Ost und Süd am Rand des Fensters.
      if (edgeClosed(tx, tz, DIR_N)) out.push({ ax: x, az: z, bx: x + TILE, bz: z });
      if (edgeClosed(tx, tz, DIR_W)) out.push({ ax: x, az: z, bx: x, bz: z + TILE });
      if (tx === tx1 && edgeClosed(tx, tz, DIR_E))
        out.push({ ax: x + TILE, az: z, bx: x + TILE, bz: z + TILE });
      if (tz === tz1 && edgeClosed(tx, tz, DIR_S))
        out.push({ ax: x, az: z + TILE, bx: x + TILE, bz: z + TILE });
      const slope = grid.slopeAt(tx, tz, level);
      if (slope) out.push(diagonal(tx, tz, slope));
      const climb = grid.flightAt(tx, tz, level);
      if (climb !== null) flightSides(grid, out, tx, tz, climb, level);
    }
  // Die gesperrten Zellen, als Kästen ohne ihre Innenseiten.
  const ix0 = tx0 * 2,
    ix1 = tx1 * 2 + 1,
    iz0 = tz0 * 2,
    iz1 = tz1 * 2 + 1;
  const solid = (ix: number, iz: number): boolean => grid.cellSolid(ix, iz, level);
  for (let iz = iz0; iz <= iz1; iz++)
    for (let ix = ix0; ix <= ix1; ix++) {
      if (!solid(ix, iz)) continue;
      const x = ix * CELL,
        z = iz * CELL;
      if (!solid(ix, iz - 1)) out.push({ ax: x, az: z, bx: x + CELL, bz: z });
      if (!solid(ix, iz + 1)) out.push({ ax: x, az: z + CELL, bx: x + CELL, bz: z + CELL });
      if (!solid(ix - 1, iz)) out.push({ ax: x, az: z, bx: x, bz: z + CELL });
      if (!solid(ix + 1, iz)) out.push({ ax: x + CELL, az: z, bx: x + CELL, bz: z + CELL });
    }
  return out;
}

/** Die Diagonale einer Schräge: „╱" von Südwest nach Nordost, „╲" von Nordwest nach Südost. */
function diagonal(tx: number, tz: number, slope: Slope): PlaneWall {
  const x = tx * TILE,
    z = tz * TILE;
  return slope === 'slash'
    ? { ax: x, az: z + TILE, bx: x + TILE, bz: z }
    : { ax: x, az: z, bx: x + TILE, bz: z + TILE };
}

/** Die beiden Seiten einer Treppenkachel als Einbahnwände nach außen. */
function flightSides(
  grid: CellGrid,
  out: PlaneWall[],
  tx: number,
  tz: number,
  climb: Dir,
  level: number,
): void {
  const x = tx * TILE,
    z = tz * TILE;
  for (const side of climb === DIR_N || climb === DIR_S ? [DIR_W, DIR_E] : [DIR_N, DIR_S]) {
    const nx = dirX(side as Dir),
      nz = dirZ(side as Dir);
    if (grid.flightAt(tx + nx, tz + nz, level) === climb) continue;
    const outside = { x: nx, z: nz };
    if (side === DIR_W) out.push({ ax: x, az: z, bx: x, bz: z + TILE, outside });
    else if (side === DIR_E) out.push({ ax: x + TILE, az: z, bx: x + TILE, bz: z + TILE, outside });
    else if (side === DIR_N) out.push({ ax: x, az: z, bx: x + TILE, bz: z, outside });
    else out.push({ ax: x, az: z + TILE, bx: x + TILE, bz: z + TILE, outside });
  }
}

/**
 * **Ein Schritt des Spielers auf dem Zellgitter, in der Ebene** — die Wände
 * um Start und Ziel einsammeln (`cellPlaneWalls`) und darin gleiten
 * (`slideCircle`).
 */
export function slideOnCells(
  grid: CellGrid,
  x: number,
  z: number,
  dx: number,
  dz: number,
  level = 0,
  radius = PLAYER_PLANE_RADIUS,
): { x: number; z: number } {
  const reach = radius + 0.5;
  const tx0 = Math.floor((Math.min(x, x + dx) - reach) / TILE),
    tx1 = Math.floor((Math.max(x, x + dx) + reach) / TILE),
    tz0 = Math.floor((Math.min(z, z + dz) - reach) / TILE),
    tz1 = Math.floor((Math.max(z, z + dz) + reach) / TILE);
  return slideCircle(cellPlaneWalls(grid, tx0, tz0, tx1, tz1, level), x, z, dx, dz, radius);
}
