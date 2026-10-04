import type { ElementSpot, Face } from '../elements/elementPlace';
import { HOUSE_DEPTH } from '../elements/cityCatalog';
import { ROAD_WIDTH, RoadNet, roadPieces, type RoadStyle } from '../elements/roadNetwork';
import { GridPlan } from '../grid/gridPlan';

/**
 * **Der Plan der Stadt** — nur aus dem Katalogordner _Stadt_
 * (`elements/cityCatalog.ts`). Gewünscht (Oktober 2026): _„Nehme die Teile und
 * schau mal, wie eine Test-Welt ‚kleine Stadt' wäre"_, dann _„dass wir hier
 * Häuser aneinander stellen Rücken an Rücken"_, und zuletzt: _„Kannst du die
 * Test-Stadt-Welt mal eine größere Stadt anlegen"_ — mit Kreuzungen, die
 * _„nicht genau eine Straßenbreite entfernt sind"_, _„damit wir nicht eine
 * Manhattan-Stadt haben"_.
 *
 * **Fünf Straßen von West nach Ost** (`AVENUES`) und dazwischen vier Bänder
 * von Blöcken (`BANDS`), 12, 24, 12 und 18 m tief. In jedem Band laufen
 * Querstraßen von Nord nach Süd, aber jedes Band hat seine eigenen: Sie enden
 * an den Straßen oben und unten als Einmündung, statt als ein Raster
 * durchzugehen, und die Blöcke dazwischen sind 19 bis 84 m breit. Das Netz
 * rechnet dieselbe Funktion, die im Spiel eine gezogene Straße baut
 * (`roadNetwork.roadPieces`): Ecken, Einmündungen, Kreuzungen, Geraden von
 * 12 m und kurze dazwischen.
 *
 * **In jedem Block zwei Häuserreihen Rücken an Rücken** — die nördliche
 * schaut nach Norden auf ihre Straße, die südliche nach Süden; jedes Haus ist
 * sechs Kacheln tief (`cityCatalog.HOUSE_DEPTH`). Ist das Band tiefer als
 * zwei Häuser, liegen dazwischen Gärten (6 m) oder Parks (12 m).
 */

/** Die Breite einer Straße, in Metern (Kacheln). */
const W = ROAD_WIDTH;

/** **Wie breit die Stadt ist**, in Metern — von der westlichen Straße bis hinter die östliche. */
const WIDTH = 168;

/** Eine Straße von West nach Ost: ihre Nordkante und ihre Art. */
interface Avenue {
  readonly z: number;
  readonly style: RoadStyle;
}

/** Ein Band von Blöcken zwischen zwei Straßen. */
interface Band {
  /** Wie tief, in Metern: 12 (zwei Häuser), 18 (mit Gärten) oder 24 (mit Parks). */
  readonly depth: number;
  /** Die Westkanten der Querstraßen innen — die äußeren laufen durch. */
  readonly streets: readonly number[];
  /** Ihre Art, der Reihe nach. */
  readonly styles: readonly RoadStyle[];
}

/** **Die Bänder** von Nord nach Süd. */
const BANDS: readonly Band[] = [
  { depth: 12, streets: [38, 81, 112], styles: ['lamps', 'old', 'lamps'] },
  { depth: 24, streets: [60, 96], styles: ['avenue', 'lamps'] },
  { depth: 12, streets: [45, 77, 120], styles: ['old', 'plain', 'double'] },
  { depth: 18, streets: [96], styles: ['lamps'] },
];

/** Die Art der Straßen von West nach Ost, von Nord nach Süd. */
const AVENUE_STYLES: readonly RoadStyle[] = ['old', 'lamps', 'avenue', 'lamps', 'double'];

/** **Die Straßen von West nach Ost** — die Nordkante jeder, aus den Bändern dazwischen. */
const AVENUES: readonly Avenue[] = (() => {
  const out: Avenue[] = [];
  let z = 0;
  AVENUE_STYLES.forEach((style, i) => {
    out.push({ z, style });
    z += W + (BANDS[i]?.depth ?? 0);
  });
  return out;
})();

/** Wie tief die Stadt ist, in Metern — bis hinter die südliche Straße. */
const DEPTH = AVENUES[AVENUES.length - 1]!.z + W;

/** Die Querstraße am Rand, im Westen und im Osten — durch alle Bänder. */
const EDGES: readonly [number, RoadStyle][] = [
  [0, 'plain'],
  [WIDTH - W, 'plain'],
];

/** Wo ein Zebrastreifen liegt: auf welcher Straße (Nummer), ab welcher Kachel. */
const CROSSINGS: readonly [avenue: number, x: number][] = [
  [2, 24],
  [2, 132],
  [1, 136],
];

/**
 * **Das Netz der Stadt** — die Straßen von West nach Ost, die beiden am Rand,
 * und je Band seine Querstraßen, von der Straße darüber bis über die darunter.
 */
function cityNet(): RoadNet {
  const net = new RoadNet();
  for (const avenue of AVENUES) net.lay('h', avenue.z, 0, WIDTH, avenue.style);
  for (const [x, style] of EDGES) net.lay('v', x, 0, DEPTH, style);
  BANDS.forEach((band, i) => {
    const top = AVENUES[i]!.z;
    const bottom = AVENUES[i + 1]!.z + W;
    band.streets.forEach((x, k) => net.lay('v', x, top, bottom, band.styles[k] ?? 'lamps'));
  });
  for (const [avenue, x] of CROSSINGS) net.lay('h', AVENUES[avenue]!.z, x, x + W, 'crossing');
  return net;
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

/** Welche Breiten sich aus Häusern genau füllen lassen — bis zur breitesten Lücke. */
const FILLS: readonly boolean[] = (() => {
  const out = [true];
  for (let n = 1; n <= WIDTH; n++)
    out.push(Object.values(HOUSE_WIDTH).some((w) => w <= n && out[n - w]));
  return out;
})();

/**
 * **Häuser für eine Lücke**, Wand an Wand, genau `width` breit — reihum aus
 * `order`, aber nur ein Haus, nach dem der Rest noch aufgeht (`FILLS`).
 */
function houses(width: number, order: string): string[] {
  const out: string[] = [];
  let left = width;
  let i = 0;
  while (left > 0) {
    let pick = '';
    for (let k = 0; k < order.length && !pick; k++) {
      const letter = order[(i + k) % order.length]!;
      const w = HOUSE_WIDTH[letter]!;
      if (w <= left && FILLS[left - w]) {
        pick = letter;
        i += k + 1;
      }
    }
    if (!pick) break;
    out.push(pick);
    left -= HOUSE_WIDTH[pick]!;
  }
  return out;
}

/** Die Reihenfolgen der Häuser — je Reihe eine andere, damit es nicht gleich aussieht. */
const ORDERS = ['ehfcgadb', 'abcdhegf', 'gdbefach', 'chaegbfd', 'fbhdacge'];

/** **Eine Reihe Häuser** von `x` an nach Osten, `face` zur Straße. */
function houseRow(prefix: string, x: number, z: number, width: number, face: Face, n: number) {
  let at = x;
  return houses(width, ORDERS[n % ORDERS.length]!).map((letter, i): ElementSpot => {
    const spot: ElementSpot = {
      id: `${prefix}-${i}`,
      element: `city-house-${letter}`,
      x: at,
      z,
      face,
    };
    at += HOUSE_WIDTH[letter]!;
    return spot;
  });
}

/** Was zwischen den Häuserreihen liegt, je 12 m: Gärten (6 m tief) oder Parks (12 m). */
const GARDENS = ['city-garden', 'city-yard', 'city-garden'];
const PARKS = ['city-park-trees', 'city-plaza', 'city-park-bushes', 'city-park-path'];

/**
 * **Die Blöcke** — je Band und je Lücke zwischen zwei Querstraßen zwei
 * Häuserreihen Rücken an Rücken, und was dazwischen Platz hat.
 */
function blocks(): ElementSpot[] {
  const out: ElementSpot[] = [];
  let row = 0;
  BANDS.forEach((band, i) => {
    const top = AVENUES[i]!.z + W;
    const bottom = top + band.depth;
    const walls = [EDGES[0]![0], ...band.streets, EDGES[1]![0]];
    for (let k = 0; k + 1 < walls.length; k++) {
      const x = walls[k]! + W;
      const width = walls[k + 1]! - x;
      const name = `block-${i}-${k}`;
      out.push(...houseRow(`${name}-n`, x, top, width, 'N', row++));
      out.push(...houseRow(`${name}-s`, x, bottom - HOUSE_DEPTH, width, 'S', row++));
      const middle = band.depth - 2 * HOUSE_DEPTH;
      const fill = middle >= W ? PARKS : middle > 0 ? GARDENS : [];
      for (let t = 0; fill.length > 0 && t + W <= width; t += W)
        out.push({
          id: `${name}-m-${t}`,
          element: fill[(t / W + k) % fill.length]!,
          x: x + t,
          z: top + HOUSE_DEPTH,
        });
    }
  });
  return out;
}

/** **Die Straßen als Stellen** — jedes Teil des Netzes (`roadPieces`). */
function roads(): ElementSpot[] {
  return roadPieces(cityNet()).map((piece) => ({
    id: `strasse-${piece.x}-${piece.z}-${piece.face}`,
    ...piece,
  }));
}

/** Alles, was in der Stadt steht. */
export const CITY_SPOTS: readonly ElementSpot[] = [
  ...roads(),
  ...blocks(),
  // Autos auf den Straßen — rechts, wie man fährt: nach Westen auf der
  // nördlichen Spur, nach Osten auf der südlichen, nach Süden auf der westlichen.
  { id: 'taxi', element: 'city-car-taxi', x: 14, z: AVENUES[2]!.z + 4, face: 'W' },
  { id: 'polizei', element: 'city-car-police', x: 110, z: AVENUES[2]!.z + 7, face: 'E' },
  { id: 'limousine', element: 'city-car-sedan', x: 64, z: 40, face: 'S' },
  { id: 'kombi', element: 'city-car-stationwagon', x: 140, z: AVENUES[4]!.z + 7, face: 'E' },
  { id: 'kleinwagen', element: 'city-car-hatchback', x: 100, z: 100, face: 'S' },
  { id: 'taxi-2', element: 'city-car-taxi', x: 126, z: AVENUES[1]!.z + 4, face: 'W' },
];

/**
 * **Der Boden** — die Stadt und rundherum ein Ring von zwei Stücken, auf dem
 * man sie mit gezogenen Straßen weiterbauen kann.
 */
export function cityGround(): { x: number; z: number; w: number; d: number } {
  return { x: -2 * W, z: -2 * W, w: WIDTH + 4 * W, d: DEPTH + 4 * W };
}

/** **Wo man ankommt** — auf dem Gehweg vor der Einmündung an der Allee. */
export function citySpawn(): { x: number; z: number } {
  return { x: 96 - 1.5, z: AVENUES[2]!.z + 1.5 };
}

/** Der Plan der Welt: nur Boden — alles andere sind Spielelemente (`CITY_SPOTS`). */
export function cityPlan(): GridPlan {
  const plan = new GridPlan([0]);
  plan.floor(cityGround());
  return plan;
}
