import type { FloorCorner } from '../grid/solids';
import { halveSlanted } from './flooring';
import {
  closedRooms,
  slantedTiles,
  wallSideTiles,
  type RoomTile,
  type WallPiece,
} from './roomTrace';

/**
 * **Die Decke über einem geschlossenen Raum** — der Boden der Etage darüber.
 *
 * Gewünscht (September 2026): _„beim hausbau, bzw. allgemein, wenn ich einen
 * raum schließe soll direkt die decke drauf gesetzt werden (wie wenn ich eine
 * treppe setze). Ich weiß nicht wie ich damit umgehen soll, wenn ich einen raum
 * aufbreche, was dann mit den oberen stockwerken passiert"_
 *
 * - **Schließen**: Über jedem geschlossenen Raum (`closedRooms`) liegt Boden
 *   der Etage darüber — so, wie die Treppe ihn über ihr Haus legt. Was schon
 *   liegt, bleibt, wie es ist; neu gelegt heißt die Kachel **Decke**.
 * - **Aufbrechen**: Die Decke geht mit dem Raum — aber nur, wo oben nichts
 *   auf ihr steht. Eine Wand an ihrer Kante, ein Raum oben, zu dem sie
 *   gehört, ein Bodenbelag, ein Baustein des Plans, eine Treppe oder ihr Stand halten sie
 *   (`used`); dann bleibt sie als Boden, wie ein Balkon, und darüber ändert
 *   sich nichts — ein Obergeschoss stürzt nicht ein, weil unten eine Tür
 *   aufgeht. Boden, den jemand selbst gelegt
 *   hat (Treppe, Belag), ist nie Decke und geht nie von allein.
 *
 * Schlüssel sind `x,z,level`, wie der Belag je Kachel (`HausbauWorld.floors`).
 */

/** Eine Etage, wie die Decke sie sieht: ihre Wände. */
export interface CeilingStorey {
  readonly level: number;
  readonly pieces: readonly WallPiece[];
}

/** Was sich an der Decke ändert: welche Kacheln neu, welche weg. */
export interface CeilingChange {
  readonly lay: Array<RoomTile & { level: number }>;
  readonly drop: Array<RoomTile & { level: number }>;
}

export const ceilingKey = (x: number, z: number, level: number): string => `${x},${z},${level}`;

/**
 * **Was über den Räumen liegen soll** — und was an Decke übrig ist.
 *
 * @param storeys die Etagen mit ihren Wänden
 * @param ceiling die Kacheln, die schon Decke sind
 * @param floored ob auf der Kachel schon Boden liegt (auch leerer Boden über einer Treppe)
 * @param used ob oben etwas auf der Kachel steht, außer Wänden (Belag, Baustein, Treppe)
 */
export function ceilingChange(
  storeys: readonly CeilingStorey[],
  ceiling: ReadonlySet<string>,
  floored: (x: number, z: number, level: number) => boolean,
  used: (x: number, z: number, level: number) => boolean,
): CeilingChange {
  const want = new Set<string>();
  const lay: CeilingChange['lay'] = [];
  // Worauf oben gebaut ist: Kacheln an einer Wand und in einem Raum der Etage.
  const built = new Set<string>();
  for (const storey of storeys) {
    const up = storey.level + 1;
    for (const tile of wallSideTiles(storey.pieces))
      built.add(ceilingKey(tile.x, tile.z, storey.level));
    for (const room of closedRooms(storey.pieces)) {
      for (const tile of room) {
        built.add(ceilingKey(tile.x, tile.z, storey.level));
        const key = ceilingKey(tile.x, tile.z, up);
        if (want.has(key)) continue;
        want.add(key);
        if (!ceiling.has(key) && !floored(tile.x, tile.z, up)) lay.push({ ...tile, level: up });
      }
    }
  }
  const drop: CeilingChange['drop'] = [];
  for (const key of ceiling) {
    if (want.has(key)) continue;
    const [x, z, level] = key.split(',').map(Number) as [number, number, number];
    if (built.has(key) || used(x, z, level)) continue;
    drop.push({ x, z, level });
  }
  return { lay, drop };
}

/**
 * **Welche Decke über einer Schräge nur halb liegt** — je Kachel der Etage
 * darüber (`x,z,level`) die Ecke, deren Dreieck leer bleibt.
 *
 * Gemeldet (Oktober 2026): _„dass die ebenen der boden der ebene darüber bei
 * einem hausbau rechteckig sind, statt wie eigentlich gewünscht halbiert
 * (dreiecke). Sollte ich auf der ebene andere wände ziehen bzw. einen raum
 * setzen, zählt natürlich dieser."_ Die Decke folgt also dem Raum darunter:
 * Geht unten eine Wand unter 45° durch die Kachel, liegt oben nur die Hälfte
 * über dem Raum (`flooring.halveSlanted`, dieselbe Rechnung wie für den
 * Belag). Liegt auf **beiden** Seiten ein Raum, ist die Decke ganz.
 *
 * **Oben gilt, was oben steht**: Gehört die Kachel dort selbst zu einem
 * geschlossenen Raum, zählt dessen Teilung (eine Schräge oben, sonst ganz);
 * stößt oben eine Wand an sie, bleibt sie ganz.
 */
export function ceilingCuts(storeys: readonly CeilingStorey[]): Map<string, FloorCorner> {
  // Je Kachel und Etage die Hälften, die die Räume dieser Etage wollen —
  // `null` heißt: die ganze Kachel.
  const want = new Map<string, Set<FloorCorner | null>>();
  const sides = new Set<string>();
  for (const storey of storeys) {
    const slanted = slantedTiles(storey.pieces);
    for (const tile of wallSideTiles(storey.pieces))
      sides.add(ceilingKey(tile.x, tile.z, storey.level));
    for (const room of closedRooms(storey.pieces)) {
      const { tiles } = halveSlanted({ tiles: room, room: true }, slanted, { x: 0, z: 0 });
      for (const tile of tiles) {
        const key = ceilingKey(tile.x, tile.z, storey.level);
        const set = want.get(key) ?? new Set<FloorCorner | null>();
        set.add(tile.empty ?? null);
        want.set(key, set);
      }
    }
  }
  /** Die eine leere Ecke, die alle Räume auf dieser Kachel wollen — sonst `null`. */
  const single = (set: ReadonlySet<FloorCorner | null>): FloorCorner | null => {
    if (set.size !== 1) return null;
    return [...set][0]!;
  };
  const out = new Map<string, FloorCorner>();
  for (const [key, set] of want) {
    const [x, z, level] = key.split(',').map(Number) as [number, number, number];
    const above = ceilingKey(x, z, level + 1);
    const upstairs = want.get(above);
    const empty = upstairs ? single(upstairs) : sides.has(above) ? null : single(set);
    if (empty) out.set(above, empty);
  }
  return out;
}
