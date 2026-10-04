import type { ElementSpot, Face } from '../elements/elementPlace';
import { exitsIn, roadKey, roadPiece, type RoadStyle } from '../elements/roadNetwork';
import { GridPlan } from '../grid/gridPlan';

/**
 * **Der Plan der kleinen Stadt** — nur aus dem Katalogordner _Stadt_
 * (`elements/cityCatalog.ts`). Gewünscht (Oktober 2026): _„Nehme die Teile und
 * schau mal, wie eine Test-Welt ‚kleine Stadt' wäre"_, und danach: _„dass wir
 * hier Häuser aneinander stellen Rücken an Rücken und wie wir die Straßen dann
 * verbinden"_.
 *
 * **Ein Raster aus Stücken von 12 m** (`M`, so groß wie ein Straßenstück mit
 * seinen 3 m Gehweg je Seite), sieben mal sieben: Straßen in jeder dritten
 * Reihe und Spalte (`ROAD_LINES`), dazwischen vier Blöcke von 24 × 24 m. In
 * jedem Block stehen zwei Häuserreihen Rücken an Rücken, die eine schaut auf
 * die Straße im Norden, die andere auf die im Süden; an den Enden sieht man
 * von der Querstraße aus auf die Seitenwände. Je 24 m Reihe gehen auf:
 * E + H + F, A + B + C + D, oder ein Park (12 m) und A + B.
 */

/** Die Kante eines Stücks, in Metern (Kacheln). */
const M = 12;

/** Ein Element an Spalte/Reihe im Raster, mit einem Versatz in Metern. */
function at(
  id: string,
  element: string,
  col: number,
  row: number,
  face: Face = 'S',
  dx = 0,
  dz = 0,
): ElementSpot {
  return { id, element, x: col * M + dx, z: row * M + dz, face };
}

/** Wie breit ein Haus im Katalog ist, in Kacheln (`cityCatalog.house`). */
const HOUSE_WIDTH: Readonly<Record<string, number>> = {
  a: 5,
  b: 7,
  c: 5,
  d: 7,
  e: 8,
  f: 8,
  g: 8,
  h: 8,
};

/**
 * **Eine Reihe** von Spalte `col` an nach Osten, Wand an Wand: Häuser
 * (Buchstabe) oder ein ganzes Stück (Name eines Elements, 12 m).
 */
function row(
  prefix: string,
  r: number,
  col: number,
  face: Face,
  list: readonly string[],
): ElementSpot[] {
  let x = col * M;
  return list.map((one, i) => {
    const house = one.length === 1;
    const spot: ElementSpot = {
      id: `${prefix}-${i}`,
      element: house ? `city-house-${one}` : one,
      x,
      z: r * M,
      face: house ? face : 'S',
    };
    x += house ? (HOUSE_WIDTH[one] ?? M) : M;
    return spot;
  });
}

/** Wie groß das Raster ist, in Stücken — sieben mal sieben. */
const SIZE = 7;
/** Wo Straßen laufen: jede dritte Reihe und Spalte (0, 3, 6). */
const ROAD_LINES = [0, 3, 6];

/**
 * **Die Art jeder Straße** — Reihe oder Spalte → Art. Die äußeren Straßen mit
 * alten Laternen und Doppellaternen, die mittleren mit modernen, die westliche
 * als Allee.
 */
const ROW_STYLE: Readonly<Record<number, RoadStyle>> = { 0: 'old', 3: 'lamps', 6: 'double' };
const COL_STYLE: Readonly<Record<number, RoadStyle>> = { 0: 'avenue', 3: 'lamps', 6: 'plain' };
/** Wo ein Zebrastreifen liegt (`cx,cz`). */
const CROSSINGS = new Set(['3,1', '3,5', '1,3', '5,3']);

/**
 * **Das Straßennetz** — jede Zelle der Straßenzeilen und -spalten, mit dem
 * Teil, das ihre Nachbarn verlangen (`roadNetwork.roadPiece`): Ecken außen,
 * Einmündungen an den Rändern, die Kreuzung in der Mitte. Dieselbe Rechnung,
 * mit der im Spiel eine gezogene Straße ihre Kreuzungen bekommt.
 */
function roads(): ElementSpot[] {
  const net = new Set<string>();
  for (let a = 0; a < SIZE; a++)
    for (const line of ROAD_LINES) {
      net.add(roadKey(a, line));
      net.add(roadKey(line, a));
    }
  const out: ElementSpot[] = [];
  for (const key of net) {
    const [cx, cz] = key.split(',').map(Number) as [number, number];
    const row = ROAD_LINES.includes(cz);
    const style: RoadStyle = CROSSINGS.has(key)
      ? 'crossing'
      : row
        ? (ROW_STYLE[cz] ?? 'lamps')
        : (COL_STYLE[cx] ?? 'lamps');
    const piece = roadPiece(exitsIn(net, cx, cz), style, row ? 'ew' : 'ns');
    out.push(at(`strasse-${cx}-${cz}`, piece.element, cx, cz, piece.face));
  }
  return out;
}

/** Alles, was in der kleinen Stadt steht. */
export const CITY_SPOTS: readonly ElementSpot[] = [
  ...roads(),
  // **Vier Blöcke, in jedem zwei Reihen Rücken an Rücken** — die nördliche
  // schaut nach Norden auf ihre Straße, die südliche nach Süden. Gewünscht:
  // _„dass wir hier Häuser aneinander stellen Rücken an Rücken und wie wir die
  // Straßen dann verbinden"_.
  // Nordwesten.
  ...row('nw-n', 1, 1, 'N', ['e', 'h', 'f']),
  ...row('nw-s', 2, 1, 'S', ['a', 'b', 'c', 'd']),
  // Nordosten.
  ...row('no-n', 1, 4, 'N', ['city-park-trees', 'a', 'b']),
  ...row('no-s', 2, 4, 'S', ['g', 'e', 'f']),
  // Südwesten.
  ...row('sw-n', 4, 1, 'N', ['a', 'd', 'c', 'b']),
  ...row('sw-s', 5, 1, 'S', ['city-park-bushes', 'b', 'a']),
  // Südosten.
  ...row('so-n', 4, 4, 'N', ['h', 'g', 'f']),
  ...row('so-s', 5, 4, 'S', ['city-plaza', 'a', 'b']),
  // Autos auf den Straßen — rechts, wie man fährt: nach Westen auf der
  // nördlichen Spur, nach Osten auf der südlichen, nach Süden auf der westlichen.
  at('taxi', 'city-car-taxi', 2, 3, 'W', 2, 4),
  at('polizei', 'city-car-police', 4, 3, 'E', 6, 7),
  at('limousine', 'city-car-sedan', 3, 2, 'S', 4, 2),
  at('kombi', 'city-car-stationwagon', 1, 6, 'E', 8, 7),
  // Straßenmöbel auf dem Platz.
  at('bank', 'city-bench', 4, 5, 'S', 3, 4),
  at('hydrant', 'city-hydrant', 4, 5, 'S', 9, 2),
  at('container', 'city-dumpster', 4, 5, 'S', 8, 8),
];

/**
 * **Der Boden** — das Raster und rundherum ein Ring von zwei Stücken, auf dem
 * man die Stadt mit gezogenen Straßen weiterbauen kann.
 */
export function cityGround(): { x: number; z: number; w: number; d: number } {
  return { x: -2 * M, z: -2 * M, w: (SIZE + 4) * M, d: (SIZE + 4) * M };
}

/** **Wo man ankommt** — auf dem Gehweg vor der Kreuzung in der Mitte. */
export function citySpawn(): { x: number; z: number } {
  return { x: 3 * M - 1.5, z: 3 * M + 1.5 };
}

/** Der Plan der Welt: nur Boden — alles andere sind Spielelemente (`CITY_SPOTS`). */
export function cityPlan(): GridPlan {
  const plan = new GridPlan([0]);
  plan.floor(cityGround());
  return plan;
}
