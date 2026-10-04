import type { ElementSpot, Face } from '../elements/elementPlace';
import { HOUSE_DEPTH } from '../elements/cityCatalog';
import {
  ROAD_WIDTH,
  RoadNet,
  parseRoad,
  roadPieces,
  type RoadStyle,
} from '../elements/roadNetwork';
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
  { depth: 12, streets: [41, 77, 120], styles: ['old', 'plain', 'double'] },
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
  [0, 'avenue'],
  [WIDTH - W, 'avenue'],
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

/** Die hohen Häuser (12 m) und die niedrigen (6,6–9,4 m). */
const TALL = 'cdgh';
const LOW = 'abef';

/** Welche Breiten sich aus Häusern genau füllen lassen — bis zur breitesten Lücke. */
const FILLS: readonly boolean[] = (() => {
  const out = [true];
  for (let n = 1; n <= WIDTH; n++)
    out.push(Object.values(HOUSE_WIDTH).some((w) => w <= n && out[n - w]));
  return out;
})();

/** **Ein fester Zufall** in [0, 1) für eine Stelle — bei jedem Laden derselbe. */
function chance(...at: number[]): number {
  let h = 2166136261;
  for (const n of at) h = Math.imul(h ^ Math.round(n * 7 + 13), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Die Mitte der Stadt — dort stehen die hohen Häuser. */
const CENTRE = { x: WIDTH / 2, z: 63 };

/**
 * **Wie wahrscheinlich hier ein hohes Haus steht** — in der Mitte fast immer,
 * am Rand selten. So hat die Stadt eine Silhouette statt einer Fläche gleich
 * hoher Dächer.
 */
function tallness(x: number, z: number): number {
  const d = Math.hypot((x - CENTRE.x) / (WIDTH / 2), (z - CENTRE.z) / 63);
  return Math.min(0.9, Math.max(0.1, 1.25 - d));
}

/**
 * **Häuser für eine Lücke**, Wand an Wand, genau `length` lang, von (`x`,
 * `z`) an entlang `axis` — je Platz hoch oder niedrig nach `tallness`, aber
 * nur ein Haus, nach dem der Rest noch aufgeht (`FILLS`).
 */
function houses(length: number, x: number, z: number, axis: 'x' | 'z'): string[] {
  const out: string[] = [];
  let left = length;
  let at = 0;
  while (left > 0) {
    const px = axis === 'x' ? x + at : x;
    const pz = axis === 'z' ? z + at : z;
    const first = chance(px, pz, 1) < tallness(px, pz) ? TALL : LOW;
    const second = first === TALL ? LOW : TALL;
    const shift = Math.floor(chance(px, pz, 2) * 4);
    const order = [...first.slice(shift), ...first.slice(0, shift), ...second];
    const pick = order.find((letter) => {
      const w = HOUSE_WIDTH[letter]!;
      return w <= left && FILLS[left - w];
    });
    if (!pick) break;
    out.push(pick);
    left -= HOUSE_WIDTH[pick]!;
    at += HOUSE_WIDTH[pick]!;
  }
  return out;
}

/** **Eine Reihe Häuser** von (`x`, `z`) an nach Osten, `face` zur Straße. */
function houseRow(prefix: string, x: number, z: number, width: number, face: Face) {
  let at = x;
  return houses(width, x, z, 'x').map((letter, i): ElementSpot => {
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

/**
 * **Eine Reihe Häuser quer** — am Ende eines Blocks, von Nord nach Süd, mit
 * der Front zur Querstraße (`face` W oder O). Ohne sie sähe man von der
 * Querstraße aus nur die Seitenwände der Reihen.
 */
function houseColumn(prefix: string, x: number, z: number, depth: number, face: Face) {
  let at = z;
  return houses(depth, x, z, 'z').map((letter, i): ElementSpot => {
    const spot: ElementSpot = {
      id: `${prefix}-${i}`,
      element: `city-house-${letter}`,
      x,
      z: at,
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
 * **Die Blöcke, die keine Häuser haben** — Band und Lücke → was dort steht.
 * Mitten in der Stadt der Stadtpark (24 × 24 m), südlich davon über die
 * Allee Café und Markt.
 */
const SPECIAL: Readonly<Record<string, readonly string[]>> = {
  '1-1': ['city-park-big'],
  '2-1': ['city-square-cafe', 'city-square-market'],
};

/**
 * **Die Blöcke** — je Band und je Lücke zwischen zwei Querstraßen zwei
 * Häuserreihen Rücken an Rücken, an beiden Enden eine Reihe quer zur
 * Querstraße, und was dazwischen Platz hat.
 */
function blocks(): ElementSpot[] {
  const out: ElementSpot[] = [];
  BANDS.forEach((band, i) => {
    const top = AVENUES[i]!.z + W;
    const bottom = top + band.depth;
    const walls = [EDGES[0]![0], ...band.streets, EDGES[1]![0]];
    for (let k = 0; k + 1 < walls.length; k++) {
      const x = walls[k]! + W;
      const width = walls[k + 1]! - x;
      const name = `block-${i}-${k}`;
      const special = SPECIAL[`${i}-${k}`];
      if (special) {
        let at = x;
        special.forEach((element, n) => {
          out.push({ id: `${name}-${n}`, element, x: at, z: top });
          at += element === 'city-park-big' ? 2 * W : W;
        });
        continue;
      }
      out.push(...houseColumn(`${name}-w`, x, top, band.depth, 'W'));
      out.push(...houseColumn(`${name}-o`, x + width - HOUSE_DEPTH, top, band.depth, 'E'));
      const inner = x + HOUSE_DEPTH;
      const span = width - 2 * HOUSE_DEPTH;
      out.push(...houseRow(`${name}-n`, inner, top, span, 'N'));
      out.push(...houseRow(`${name}-s`, inner, bottom - HOUSE_DEPTH, span, 'S'));
      const middle = band.depth - 2 * HOUSE_DEPTH;
      const fill = middle >= W ? PARKS : middle > 0 ? GARDENS : [];
      for (let t = 0; fill.length > 0 && t + W <= span; t += W)
        out.push({
          id: `${name}-m-${t}`,
          element: fill[(t / W + k) % fill.length]!,
          x: inner + t,
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

/** Die Autos der Reihe nach. */
const CARS = [
  'city-car-sedan',
  'city-car-taxi',
  'city-car-hatchback',
  'city-car-stationwagon',
  'city-car-sedan',
  'city-car-police',
  'city-car-taxi',
];

/**
 * **Verkehr** — auf gut einem Drittel der ganzen Geraden ein Auto, rechts,
 * wie man fährt: auf einer Straße von West nach Ost nach Westen auf der
 * nördlichen Spur und nach Osten auf der südlichen, auf einer von Nord nach
 * Süd nach Süden auf der westlichen. Jedes Auto sperrt seine zwei mal vier
 * Kacheln wie jedes andere.
 */
function traffic(): ElementSpot[] {
  const out: ElementSpot[] = [];
  let n = 0;
  for (const piece of roadPieces(cityNet())) {
    if (piece.element === 'city-road-crossing') continue;
    const road = parseRoad(piece.element);
    if (road?.kind !== 'straight' || road.length !== W) continue;
    if (chance(piece.x, piece.z, 3) > 0.38) continue;
    const forward = chance(piece.x, piece.z, 4) < 0.5;
    const element = CARS[n % CARS.length]!;
    const id = `auto-${n++}`;
    if (piece.face === 'E')
      out.push({
        id,
        element,
        x: piece.x + 4,
        z: piece.z + (forward ? 7 : 4),
        face: forward ? 'E' : 'W',
      });
    else
      out.push({
        id,
        element,
        x: piece.x + (forward ? 4 : 7),
        z: piece.z + 4,
        face: forward ? 'S' : 'N',
      });
  }
  return out;
}

/**
 * **Was auf den Gehwegen steht** — auf jeder dritten Geraden (außer der
 * Allee, dort stehen Bäume) ein Hydrant, eine Mülltonne, eine Bank oder ein
 * Fahrrad, zwischen den Laternen.
 */
function streetLife(): ElementSpot[] {
  const out: ElementSpot[] = [];
  let n = 0;
  for (const piece of roadPieces(cityNet())) {
    const road = parseRoad(piece.element);
    if (road?.kind !== 'straight' || road.length !== W) continue;
    if (road.style === 'avenue' || road.style === 'crossing') continue;
    const roll = chance(piece.x, piece.z, 5);
    if (roll > 0.4) continue;
    const kind = Math.floor(chance(piece.x, piece.z, 6) * 4);
    const near = roll < 0.2;
    const id = `gehweg-${n++}`;
    const h = piece.face === 'E';
    // Am nahen oder fernen Gehweg, gegenüber der Laterne dort.
    const x = h ? piece.x + (near ? 8 : 3) : piece.x + (near ? 10 : 1);
    const z = h ? piece.z + (near ? 1 : 10) : piece.z + (near ? 8 : 2);
    if (kind === 0) out.push({ id, element: 'city-hydrant', x, z });
    else if (kind === 1) out.push({ id, element: 'city-trash', x, z });
    else if (kind === 2)
      out.push(
        h
          ? { id, element: 'city-bench', x: x - 1, z, face: near ? 'S' : 'N' }
          : { id, element: 'city-bench', x, z: z - 1, face: near ? 'W' : 'E' },
      );
    else out.push({ id, element: 'city-bicycle', x, z: h ? z : z - 1, face: h ? 'E' : 'S' });
  }
  return out;
}

/**
 * **Bäume auf der Wiese rundherum** — locker, auf einem Raster von 8 m mit
 * etwas Versatz, damit der Stadtrand nicht wie abgeschnitten aussieht.
 */
function meadowTrees(): ElementSpot[] {
  const out: ElementSpot[] = [];
  const g = cityGround();
  const trees = ['city-tree-a', 'city-tree-b', 'city-tree-c'];
  for (let z = g.z + 2; z + 4 <= g.z + g.d - 2; z += 8)
    for (let x = g.x + 2; x + 4 <= g.x + g.w - 2; x += 8) {
      const inside = x + 4 > -2 && x < WIDTH + 2 && z + 4 > -2 && z < DEPTH + 2;
      if (inside || chance(x, z, 7) > 0.4) continue;
      const dx = Math.floor(chance(x, z, 8) * 3);
      const dz = Math.floor(chance(x, z, 9) * 3);
      const tx = x + dx;
      const tz = z + dz;
      if (tx + 4 > -1 && tx < WIDTH + 1 && tz + 4 > -1 && tz < DEPTH + 1) continue;
      out.push({ id: `wiese-${x}-${z}`, element: trees[out.length % 3]!, x: tx, z: tz });
    }
  return out;
}

/** Alles, was in der Stadt steht. */
export const CITY_SPOTS: readonly ElementSpot[] = [
  ...roads(),
  ...blocks(),
  ...traffic(),
  ...streetLife(),
  ...meadowTrees(),
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
