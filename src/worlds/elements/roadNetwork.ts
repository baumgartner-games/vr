import type { Face } from './elementPlace';
import { CITY_BLOCK } from './cityCatalog';

/**
 * **Das Straßennetz der Stadt** — welche Straßenzelle welches Teil braucht.
 *
 * Gewünscht (Oktober 2026): _„beim Straßenbau ein Baumodus wie bei City
 * Skylines und den Wänden. Ich platziere z. B. eine Straße und kann diese dann
 * ziehen. Das Spiel schaut dann, wo Kreuzungen sind, und ersetzt die Teile
 * dann durch Kreuzungen. Laternen werden dann immer automatisch gesetzt bzw.
 * angepasst, wenn die Straße angepasst wird."_
 *
 * Eine Straße liegt auf **Zellen von 12 × 12 m** (`ROAD_CELL`, so groß wie ein
 * Straßenstück des Katalogs, `cityCatalog.CITY_BLOCK`), die Zelle (cx, cz)
 * deckt x = cx·12 … cx·12 + 12. Welches Teil auf einer Zelle steht, folgt nur
 * aus ihren vier Nachbarn (`roadPiece`): keiner oder einer gegenüber — die
 * Gerade, zwei über Eck — die Ecke, drei — die Einmündung, vier — die
 * Kreuzung. Die Art (`RoadStyle`: Laternen, alte Laternen, Allee …) gilt für
 * Gerade und Ecke; Einmündung und Kreuzung haben immer ihre Ampeln.
 *
 * Kein three.js und keine Welt — hier steht nur die Rechnung; gesetzt wird in
 * `grid/FurnishedWorld.planRoad`.
 */

/** **Die Kante einer Straßenzelle**, in Metern. */
export const ROAD_CELL = CITY_BLOCK;

/** **Welche Art Straße** — was auf Gerade und Ecke steht. */
export type RoadStyle = 'lamps' | 'old' | 'double' | 'plain' | 'avenue' | 'crossing';

/** Die Namen der Arten, wie sie im Spiel stehen. */
export const ROAD_STYLE_LABELS: Readonly<Record<RoadStyle, string>> = {
  lamps: 'Straße mit Laternen',
  old: 'Straße mit alten Laternen',
  double: 'Straße mit Doppellaternen',
  plain: 'Straße ohne Laternen',
  avenue: 'Allee',
  crossing: 'Zebrastreifen mit Ampeln',
};

/** Die Gerade jeder Art (`cityCatalog`). */
const STRAIGHT: Readonly<Record<RoadStyle, string>> = {
  lamps: 'city-road',
  old: 'city-road-old',
  double: 'city-road-double',
  plain: 'city-road-plain',
  avenue: 'city-road-avenue',
  crossing: 'city-road-crossing',
};

/** Die Ecke jeder Art — eine Ecke hat immer eine Laterne, ohne heißt modern. */
const CORNER: Readonly<Record<RoadStyle, string>> = {
  lamps: 'city-road-corner',
  old: 'city-road-corner-old',
  double: 'city-road-corner-double',
  plain: 'city-road-corner',
  avenue: 'city-road-corner',
  crossing: 'city-road-corner',
};

const T_SPLIT = 'city-road-tsplit';
const JUNCTION = 'city-road-junction';

/** **Welche Art eine Gerade oder Ecke ist** — `null`, wenn es keine Straße ist. */
export function roadStyleOf(element: string): RoadStyle | null {
  for (const style of Object.keys(STRAIGHT) as RoadStyle[]) {
    if (STRAIGHT[style] === element) return style;
  }
  if (element === 'city-road-corner' || element === 'city-road-curve') return 'lamps';
  if (element === 'city-road-corner-old' || element === 'city-road-curve-old') return 'old';
  if (element === 'city-road-corner-double' || element === 'city-road-curve-double')
    return 'double';
  return null;
}

/** **Ob ein Element ein Teil des Straßennetzes ist** — Gerade, Ecke, Einmündung, Kreuzung. */
export function isRoadElement(element: string): boolean {
  return element === T_SPLIT || element === JUNCTION || roadStyleOf(element) !== null;
}

/** Die vier Nachbarn, die eine Zelle hat oder nicht. */
export interface RoadExits {
  readonly n: boolean;
  readonly e: boolean;
  readonly s: boolean;
  readonly w: boolean;
}

/** Ein Teil des Netzes: welches Element, wohin gedreht. */
export interface RoadPiece {
  readonly element: string;
  readonly face: Face;
}

/**
 * **Das Teil für eine Zelle** aus ihren Nachbarn.
 *
 * Die Teile des Katalogs liegen ungedreht (`face: 'S'`) so: die Gerade von
 * Nord nach Süd, die Ecke mit Ausgängen nach Süden und Osten, die Einmündung
 * mit der geschlossenen Seite im Westen. Eine Drehung um eine Viertel nach
 * Osten (`'E'`) macht aus Süden Osten und aus Osten Norden
 * (`elementPlace.rotateOffset`) — daraus die Tabellen unten.
 *
 * @param along wohin eine Gerade ohne Nachbarn läuft (die Richtung der Linie)
 */
export function roadPiece(
  exits: RoadExits,
  style: RoadStyle,
  along: 'ns' | 'ew' = 'ns',
): RoadPiece {
  const { n, e, s, w } = exits;
  const count = Number(n) + Number(e) + Number(s) + Number(w);
  if (count === 4) return { element: JUNCTION, face: 'S' };
  if (count === 3) {
    // Die geschlossene Seite → die Drehung der Einmündung.
    const face: Face = !w ? 'S' : !s ? 'E' : !e ? 'N' : 'W';
    return { element: T_SPLIT, face };
  }
  if (count === 2 && n !== s) {
    // Über Eck: Süd+Ost ungedreht, Ost+Nord nach Osten, Nord+West nach
    // Norden, West+Süd nach Westen.
    const face: Face = s && e ? 'S' : e && n ? 'E' : n && w ? 'N' : 'W';
    return { element: CORNER[style], face };
  }
  const ew = count === 0 ? along === 'ew' : e || w;
  return { element: STRAIGHT[style], face: ew ? 'E' : 'S' };
}

/** Eine Zelle als Schlüssel (`cx,cz`). */
export function roadKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

/** Die Zelle unter einem Punkt (Meter). */
export function roadCellAt(x: number, z: number): [number, number] {
  return [Math.floor(x / ROAD_CELL), Math.floor(z / ROAD_CELL)];
}

/**
 * **Die Zellen einer gezogenen Straße** — vom Start in einer Geraden zum Ende,
 * entlang der Achse, auf der der Zug weiter ging (City Skylines zieht auch
 * gerade). Der Start ist immer dabei.
 */
export function roadLine(
  from: readonly [number, number],
  to: readonly [number, number],
): { cells: [number, number][]; along: 'ns' | 'ew' } {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const along = Math.abs(dx) >= Math.abs(dz) && dx !== 0 ? 'ew' : 'ns';
  const steps = along === 'ew' ? Math.abs(dx) : Math.abs(dz);
  const sign = Math.sign(along === 'ew' ? dx : dz);
  const cells: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    cells.push(along === 'ew' ? [from[0] + sign * i, from[1]] : [from[0], from[1] + sign * i]);
  }
  return { cells, along };
}

/** Die Nachbarn einer Zelle in einem Netz (Menge von `roadKey`). */
export function exitsIn(net: ReadonlySet<string>, cx: number, cz: number): RoadExits {
  return {
    n: net.has(roadKey(cx, cz - 1)),
    e: net.has(roadKey(cx + 1, cz)),
    s: net.has(roadKey(cx, cz + 1)),
    w: net.has(roadKey(cx - 1, cz)),
  };
}
