import type { Face } from './elementPlace';
import { CITY_BLOCK } from './cityCatalog';

/**
 * **Das Straßennetz der Stadt** — welche Teile wo liegen.
 *
 * Gewünscht (Oktober 2026): _„beim Straßenbau ein Baumodus wie bei City
 * Skylines und den Wänden. Ich platziere z. B. eine Straße und kann diese dann
 * ziehen. Das Spiel schaut dann, wo Kreuzungen sind, und ersetzt die Teile
 * dann durch Kreuzungen. Laternen werden dann immer automatisch gesetzt bzw.
 * angepasst"_ — und danach: _„dass Straßen bzw. Kreuzungen nicht genau eine
 * Straßenbreite entfernt sind, sondern ggf. auch mal kürzer bzw. statt 12
 * Felder ggf. auch nur 1–11 Felder auseinander liegen können. […] wie bei City
 * Skylines wäre ein Snap-Grid-Modus gut (also auf ganze 12 Felder) oder auch
 * teilweise, damit wir nicht eine Manhattan-Stadt haben."_
 *
 * **Eine Straße ist ein Band** von 12 m Breite (`ROAD_WIDTH`, ein Stück des
 * Katalogs: 6 m Fahrbahn, je 3 m Gehweg), waagerecht (`h`, von West nach Ost)
 * oder senkrecht (`v`), auf dem Raster der Kacheln: Ein waagerechtes Band hat
 * seine Nordkante bei `z0` und belegt Kachel für Kachel ein Stück in x.
 *
 * **Wo sich ein waagerechtes und ein senkrechtes Band ganz überdecken**, ist
 * ein Knoten von 12 × 12 m (`roadPieces`): Welche Nachbarn er hat, sagt, was er
 * ist — Kreuzung, Einmündung, Ecke. Dazwischen liegen Geraden, so lang, wie
 * Platz ist: Stücke von 12 m und am Ende ein kürzeres (1–11 m, `shortStraight`).
 * So können zwei Kreuzungen 17 m auseinanderliegen statt 12 oder 24.
 *
 * Kein three.js und keine Welt — hier steht nur die Rechnung; gesetzt wird in
 * `grid/FurnishedWorld.commitRoad`.
 */

/** **Die Breite einer Straße**, in Metern — ein Stück des Katalogs. */
export const ROAD_WIDTH = CITY_BLOCK;

/** **Welche Art Straße** — was auf Gerade und Ecke steht. */
export type RoadStyle = 'lamps' | 'old' | 'double' | 'plain' | 'avenue' | 'crossing';

/** Die Arten der Reihe nach, wie `T` (in der Brille der Trigger) sie wählt. */
export const ROAD_STYLES: readonly RoadStyle[] = [
  'lamps',
  'old',
  'double',
  'plain',
  'avenue',
  'crossing',
];

/** Die Namen der Arten, wie sie im Spiel stehen. */
export const ROAD_STYLE_LABELS: Readonly<Record<RoadStyle, string>> = {
  lamps: 'Straße mit Laternen',
  old: 'Straße mit alten Laternen',
  double: 'Straße mit Doppellaternen',
  plain: 'Straße ohne Laternen',
  avenue: 'Allee',
  crossing: 'Zebrastreifen mit Ampeln',
};

/** Die Gerade jeder Art, 12 m lang (`cityCatalog`). */
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

/**
 * **Die kurze Gerade**, 1–11 m lang (`cityCatalog.shortRoad`). Ein
 * Zebrastreifen auf vier Metern ist keiner — kurz wird er zur Straße ohne
 * Laternen.
 */
export function shortStraight(style: RoadStyle, length: number): string {
  const base = style === 'crossing' ? STRAIGHT.plain : STRAIGHT[style];
  return `${base}-${length}`;
}

/** Was in einem Element-Namen steckt: Art und Länge einer Geraden, oder ein Knoten. */
export function parseRoad(
  element: string,
):
  | { kind: 'straight'; style: RoadStyle; length: number }
  | { kind: 'node'; style: RoadStyle }
  | null {
  for (const style of ROAD_STYLES) {
    const base = STRAIGHT[style];
    if (element === base) return { kind: 'straight', style, length: ROAD_WIDTH };
    if (element.startsWith(`${base}-`)) {
      const length = Number(element.slice(base.length + 1));
      if (Number.isInteger(length) && length > 0 && length < ROAD_WIDTH)
        return { kind: 'straight', style, length };
    }
  }
  if (element === T_SPLIT || element === JUNCTION) return { kind: 'node', style: 'lamps' };
  if (element === 'city-road-corner' || element === 'city-road-curve')
    return { kind: 'node', style: 'lamps' };
  if (element === 'city-road-corner-old' || element === 'city-road-curve-old')
    return { kind: 'node', style: 'old' };
  if (element === 'city-road-corner-double' || element === 'city-road-curve-double')
    return { kind: 'node', style: 'double' };
  return null;
}

/** **Welche Art eine Gerade oder Ecke ist** — `null`, wenn es keine Straße ist. */
export function roadStyleOf(element: string): RoadStyle | null {
  return parseRoad(element)?.style ?? null;
}

/** **Ob ein Element ein Teil des Straßennetzes ist.** */
export function isRoadElement(element: string): boolean {
  return parseRoad(element) !== null;
}

/** Ein Teil des Netzes: welches Element, wo (Nordwestecke in Kacheln), wohin gedreht. */
export interface RoadPiece {
  readonly element: string;
  readonly x: number;
  readonly z: number;
  readonly face: Face;
}

/** Ein Band: Kachel → Art. */
type Band = Map<number, RoadStyle>;

/**
 * **Das Netz** — die waagerechten Bänder nach ihrer Nordkante (`h`) und die
 * senkrechten nach ihrer Westkante (`v`).
 */
export class RoadNet {
  readonly h = new Map<number, Band>();
  readonly v = new Map<number, Band>();

  /** Ein Stück Band setzen — `axis`, Kante `at`, Kacheln `from` bis vor `to`. */
  lay(axis: 'h' | 'v', at: number, from: number, to: number, style: RoadStyle): void {
    const bands = axis === 'h' ? this.h : this.v;
    let band = bands.get(at);
    if (!band) {
      band = new Map();
      bands.set(at, band);
    }
    for (let t = from; t < to; t++) band.set(t, style);
  }

  /** Ob ein Band an dieser Kante diese Kachel deckt. */
  covers(axis: 'h' | 'v', at: number, t: number): boolean {
    return (axis === 'h' ? this.h : this.v).get(at)?.has(t) ?? false;
  }

  /** Eine Kopie — zum Ausprobieren, was eine neue Linie ändert. */
  clone(): RoadNet {
    const out = new RoadNet();
    for (const [at, band] of this.h) out.h.set(at, new Map(band));
    for (const [at, band] of this.v) out.v.set(at, new Map(band));
    return out;
  }

  /**
   * **Das Netz aus den stehenden Teilen** — jede Gerade legt ihr Band, jeder
   * Knoten seine 12 × 12 m in jede Richtung, in die er weitergeht.
   */
  static fromPieces(pieces: Iterable<RoadPiece>): RoadNet {
    const net = new RoadNet();
    const W = ROAD_WIDTH;
    for (const piece of pieces) {
      const road = parseRoad(piece.element);
      if (!road) continue;
      const across = piece.face === 'E' || piece.face === 'W';
      if (road.kind === 'straight') {
        if (across) net.lay('h', piece.z, piece.x, piece.x + road.length, road.style);
        else net.lay('v', piece.x, piece.z, piece.z + road.length, road.style);
        continue;
      }
      const exits = nodeExits(piece.element, piece.face);
      if (exits.e || exits.w) net.lay('h', piece.z, piece.x, piece.x + W, road.style);
      if (exits.n || exits.s) net.lay('v', piece.x, piece.z, piece.z + W, road.style);
    }
    return net;
  }
}

/** Die vier Seiten, in die ein Knoten weitergeht. */
export interface RoadExits {
  readonly n: boolean;
  readonly e: boolean;
  readonly s: boolean;
  readonly w: boolean;
}

/**
 * **Wohin ein Knoten des Katalogs weitergeht**, gedreht. Ungedreht (`'S'`)
 * hat die Ecke Süd und Ost, die Einmündung Nord, Süd und Ost; eine Viertel
 * nach Osten (`'E'`) macht aus Süden Osten und aus Osten Norden
 * (`elementPlace.rotateOffset`).
 */
export function nodeExits(element: string, face: Face): RoadExits {
  const base: RoadExits =
    element === JUNCTION
      ? { n: true, e: true, s: true, w: true }
      : element === T_SPLIT
        ? { n: true, e: true, s: true, w: false }
        : { n: false, e: true, s: true, w: false };
  const turns = { S: 0, E: 1, N: 2, W: 3 }[face];
  let { n, e, s, w } = base;
  for (let i = 0; i < turns; i++) [n, e, s, w] = [e, s, w, n];
  return { n, e, s, w };
}

/**
 * **Das Teil für einen Knoten** aus seinen Nachbarn — `null`, wenn er keiner
 * ist (eine Seite oder zwei gegenüber: dann läuft die Gerade hindurch).
 */
export function nodePiece(
  exits: RoadExits,
  style: RoadStyle,
): { element: string; face: Face } | null {
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
  return null;
}

/**
 * **Alle Teile eines Netzes.**
 *
 * 1. Knoten sind die Quadrate, in denen ein waagerechtes und ein senkrechtes
 *    Band einander ganz decken. Geht es nur in einer Achse weiter (oder gar
 *    nicht), ist es kein Knoten: Dann gehört das Quadrat der Geraden dieser
 *    Achse, und das Querband endet dort.
 * 2. Was von einem Band übrig ist, wird in Läufe gleicher Art zerlegt und
 *    jeder Lauf in Geraden von 12 m, am Ende eine kürzere.
 */
export function roadPieces(net: RoadNet): RoadPiece[] {
  const W = ROAD_WIDTH;
  const out: RoadPiece[] = [];
  /** Kacheln, die ein Knoten einem Band nimmt: `h:z0` / `v:x0` → Kacheln. */
  const taken = new Map<string, Set<number>>();
  const take = (key: string, from: number): void => {
    let set = taken.get(key);
    if (!set) {
      set = new Set();
      taken.set(key, set);
    }
    for (let t = from; t < from + W; t++) set.add(t);
  };
  for (const [z0, hb] of net.h) {
    for (const [x0, vb] of net.v) {
      let full = true;
      for (let t = 0; t < W && full; t++) full = hb.has(x0 + t) && vb.has(z0 + t);
      if (!full) continue;
      const exits: RoadExits = {
        n: vb.has(z0 - 1),
        s: vb.has(z0 + W),
        w: hb.has(x0 - 1),
        e: hb.has(x0 + W),
      };
      const style = vb.get(z0) ?? hb.get(x0) ?? 'lamps';
      const node = nodePiece(exits, style === 'crossing' ? 'lamps' : style);
      if (node) {
        out.push({ ...node, x: x0, z: z0 });
        take(`h:${z0}`, x0);
        take(`v:${x0}`, z0);
      } else if (exits.e || exits.w) take(`v:${x0}`, z0);
      else take(`h:${z0}`, x0);
    }
  }
  const runs = (axis: 'h' | 'v', at: number, band: Band): void => {
    const gone = taken.get(`${axis}:${at}`);
    const tiles = [...band.keys()].filter((t) => !gone?.has(t)).sort((a, b) => a - b);
    let i = 0;
    while (i < tiles.length) {
      const style = band.get(tiles[i]!)!;
      let j = i;
      while (
        j + 1 < tiles.length &&
        tiles[j + 1] === tiles[j]! + 1 &&
        band.get(tiles[j + 1]!) === style
      )
        j++;
      const start = tiles[i]!;
      const length = tiles[j]! - start + 1;
      for (let k = 0; k < length; k += W) {
        const len = Math.min(W, length - k);
        const element = len === W ? STRAIGHT[style] : shortStraight(style, len);
        out.push(
          axis === 'h'
            ? { element, x: start + k, z: at, face: 'E' }
            : { element, x: at, z: start + k, face: 'S' },
        );
      }
      i = j + 1;
    }
  };
  for (const [z0, band] of net.h) runs('h', z0, band);
  for (const [x0, band] of net.v) runs('v', x0, band);
  return out;
}

/** **Wie gefangen wird** — auf ganze Stücke (`grid`) oder auf jede Kachel (`free`). */
export type RoadSnap = 'grid' | 'free';

/**
 * **Ein Punkt der Linie** — die Mitte der Straße, gefangen: im Raster auf die
 * Mitte eines 12-m-Stücks, frei auf die Kachel. Und in beiden Fällen auf eine
 * Straße, die schon dort liegt: Wer nahe an ihre Mitte zielt, trifft sie, damit
 * eine neue Straße genau an ihr endet und eine Kreuzung wird.
 */
export function snapRoadPoint(
  net: RoadNet,
  x: number,
  z: number,
  snap: RoadSnap,
): [number, number] {
  const W = ROAD_WIDTH;
  const half = W / 2;
  let px = snap === 'grid' ? Math.floor(x / W) * W + half : Math.round(x);
  let pz = snap === 'grid' ? Math.floor(z / W) * W + half : Math.round(z);
  let best = half + 0.01;
  for (const x0 of net.v.keys()) {
    const d = Math.abs(x0 + half - x);
    if (d < best) {
      best = d;
      px = x0 + half;
    }
  }
  best = half + 0.01;
  for (const z0 of net.h.keys()) {
    const d = Math.abs(z0 + half - z);
    if (d < best) {
      best = d;
      pz = z0 + half;
    }
  }
  return [px, pz];
}

/**
 * **Die gezogene Linie als Band** — von Punkt zu Punkt, gerade, auf der Achse,
 * auf der der Zug weiter ging, und an beiden Enden um eine halbe Breite
 * verlängert: Ein Ende auf der Mitte einer anderen Straße deckt deren Quadrat
 * dann ganz, und dort wird eine Kreuzung.
 */
export function roadLineBand(
  from: readonly [number, number],
  to: readonly [number, number],
): { axis: 'h' | 'v'; at: number; from: number; to: number } {
  const half = ROAD_WIDTH / 2;
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  if (Math.abs(dx) > Math.abs(dz))
    return {
      axis: 'h',
      at: from[1] - half,
      from: Math.min(from[0], to[0]) - half,
      to: Math.max(from[0], to[0]) + half,
    };
  return {
    axis: 'v',
    at: from[0] - half,
    from: Math.min(from[1], to[1]) - half,
    to: Math.max(from[1], to[1]) + half,
  };
}

/** Ein Teil als Schlüssel — gleich, wenn Element, Stelle und Drehung gleich sind. */
export function pieceKey(piece: RoadPiece): string {
  return `${piece.element}|${piece.x}|${piece.z}|${piece.face}`;
}

/**
 * **Ob sich zwei Straßen schief überdecken** — zwei waagerechte, die weniger
 * als eine Breite auseinanderliegen, oder eine waagerechte und eine
 * senkrechte, die sich kreuzen, ohne einander ganz zu decken (eine endet
 * mitten in der anderen). Dafür gibt es kein Teil: Der Plan wird rot und
 * nicht gebaut.
 */
export function roadOverlaps(net: RoadNet): boolean {
  const W = ROAD_WIDTH;
  const crossing = (a: Band, from: number): number => {
    let n = 0;
    for (let t = from; t < from + W; t++) if (a.has(t)) n++;
    return n;
  };
  for (const bands of [net.h, net.v]) {
    const keys = [...bands.keys()].sort((a, b) => a - b);
    for (let i = 0; i < keys.length; i++)
      for (let j = i + 1; j < keys.length && keys[j]! - keys[i]! < W; j++) {
        const other = bands.get(keys[j]!)!;
        for (const t of bands.get(keys[i]!)!.keys()) if (other.has(t)) return true;
      }
  }
  for (const [z0, hb] of net.h)
    for (const [x0, vb] of net.v) {
      const across = crossing(hb, x0);
      const along = crossing(vb, z0);
      if (across === 0 || along === 0) continue;
      if (across !== W || along !== W) return true;
    }
  return false;
}
