import { DIR_E, DIR_N, DIR_S, DIR_W, dirX, dirZ, type Dir } from '../nav/navTile';
import { roomTiles, type RoomTile, type WallPiece } from './roomTrace';

/**
 * **Die Treppe im Hausbau** — wo sie steht und welche Etage sie anlegt.
 *
 * Gewünscht (September 2026): _„Eine Treppe ist 2xL lang, wobei ich bei l
 * glaube es es 6 sind (siehe Test Navigation Welt oder sandbox) also
 * eigentlich 8, damit ich bei der Ebene darüber auf einem normalen Feld stehen
 * kann. Die Treppe belegt aber nur 2 weniger, also da wo die Treppen Elemente
 * stehen kann man nicht gehen, das letzte 2x2 Feld ist der Stand der oberen
 * Etage."_
 *
 * Gezählt ist in **Zellen** (eine Kachel sind 2 × 2): 2 × 8 Zellen sind eine
 * Kachel breit und vier lang. Die ersten drei Kacheln sind Stufen
 * (`STAIR_STEPS`, 2 × 6 Zellen, von der Seite nicht zu betreten), die vierte ist
 * der Stand oben — Boden der Etage darüber.
 *
 * Gebaut wird mit dem, was der Plan schon kann (`GridPlan.stairs`): Stufen je
 * Kachel, das Loch im Boden darüber, die Verbindung für die Wege.
 */

/** Wie viele Kacheln Stufen — der Stand oben kommt dazu (`STAIR_TILES`). */
export const STAIR_STEPS = 3;
/** Die ganze Treppe: Stufen und Stand. */
export const STAIR_TILES = STAIR_STEPS + 1;
/** Wie hoch eine Etage ist, in Metern — wie in der Test Navigation und der Sandbox. */
export const STOREY = 2.8;

/**
 * **In welche Richtung eine Treppe steigt** — die Blickrichtung, auf ein
 * Viertel gerundet. `forward` in x/z, z nach Süden.
 */
export function stairDir(dx: number, dz: number): Dir {
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? DIR_E : DIR_W;
  return dz > 0 ? DIR_S : DIR_N;
}

/**
 * **Die Kacheln einer Treppe**, von der untersten Stufe bis zum Stand — sie
 * beginnt auf der Kachel **vor** dem Spieler (`x`, `z` in Metern).
 */
export function stairTiles(x: number, z: number, dir: Dir): RoomTile[] {
  const sx = Math.floor(x) + dirX(dir);
  const sz = Math.floor(z) + dirZ(dir);
  return Array.from({ length: STAIR_TILES }, (_, i) => ({
    x: sx + dirX(dir) * i,
    z: sz + dirZ(dir) * i,
  }));
}

/**
 * **Das Haus um einen Punkt** — sein Zimmer und jedes, in das man von dort
 * durch eine Tür kommt, solange es ein geschlossener Raum ist
 * (`roomTiles`). Die Haustür führt ins Freie, und das Freie ist keiner — so
 * bleibt die Etage darüber auf dem Haus.
 *
 * @param doors die Ids der Stücke, die Türen sind
 */
export function houseTiles(
  pieces: readonly WallPiece[],
  doors: ReadonlySet<string>,
  x: number,
  z: number,
): RoomTile[] | null {
  const first = roomTiles(pieces, x, z);
  if (!first) return null;
  const inside = new Set(first.map((tile) => `${tile.x},${tile.z}`));
  const out = [...first];
  const queue = [first];
  const doorPieces = pieces.filter((piece) => doors.has(piece.id));
  while (queue.length > 0) {
    const room = queue.shift()!;
    const here = new Set(room.map((tile) => `${tile.x},${tile.z}`));
    for (const door of doorPieces) {
      for (const [a, b] of doorSides(door)) {
        const [from, to] = here.has(`${a.x},${a.z}`) ? [a, b] : [b, a];
        if (!here.has(`${from.x},${from.z}`) || inside.has(`${to.x},${to.z}`)) continue;
        const next = roomTiles(pieces, to.x + 0.5, to.z + 0.5);
        if (!next) continue;
        for (const tile of next) inside.add(`${tile.x},${tile.z}`);
        out.push(...next);
        queue.push(next);
      }
    }
  }
  return out;
}

/** Die Kachelpaare zu beiden Seiten einer geraden Tür. */
function doorSides(door: WallPiece): Array<[RoomTile, RoomTile]> {
  const out: Array<[RoomTile, RoomTile]> = [];
  if (door.a.z === door.b.z) {
    for (let x = Math.min(door.a.x, door.b.x); x < Math.max(door.a.x, door.b.x); x++)
      out.push([
        { x, z: door.a.z - 1 },
        { x, z: door.a.z },
      ]);
  } else if (door.a.x === door.b.x) {
    for (let z = Math.min(door.a.z, door.b.z); z < Math.max(door.a.z, door.b.z); z++)
      out.push([
        { x: door.a.x - 1, z },
        { x: door.a.x, z },
      ]);
  }
  return out;
}

/** **Ob die Treppe ganz im Raum steht** — Stufen und Stand. */
export function stairFits(room: readonly RoomTile[], tiles: readonly RoomTile[]): boolean {
  const inside = new Set(room.map((tile) => `${tile.x},${tile.z}`));
  return tiles.every((tile) => inside.has(`${tile.x},${tile.z}`));
}
