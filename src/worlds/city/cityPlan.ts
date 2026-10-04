import type { ElementSpot, Face } from '../elements/elementPlace';
import { GridPlan } from '../grid/gridPlan';

/**
 * **Der Plan der kleinen Stadt** — nur aus dem Katalogordner _Stadt_
 * (`elements/cityCatalog.ts`). Gewünscht (Oktober 2026): _„Nehme die Teile und
 * schau mal, wie eine Test-Welt ‚kleine Stadt' wäre."_
 *
 * **Ein Raster aus Stücken von 8 m** (`M`): sieben Spalten, sechs Reihen.
 * Zwei Straßen laufen von West nach Ost (Reihe 1 und 4), eine von Nord nach
 * Süd (Spalte 3); wo sie sich treffen, ist eine Kreuzung. Dazwischen stehen die
 * Häuser — so breit, wie sie sind, Wand an Wand, vorn am Gehweg der Straße
 * (der Gehweg gehört zur Straße), hinten der Garten. Wo eine Reihe keine 24 m
 * Häuser füllt, ist ein Park oder ein Platz.
 */

/** Die Kante eines Stücks, in Metern (Kacheln). */
const M = 8;

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

/**
 * **Eine Reihe Häuser** von Spalte `col` an nach Osten, Wand an Wand. Die
 * Breiten sind die der Häuser im Katalog, auf Kacheln aufgerundet.
 */
function houses(
  prefix: string,
  row: number,
  col: number,
  face: Face,
  list: readonly string[],
): ElementSpot[] {
  let x = col * M;
  return list.map((letter, i) => {
    const spot: ElementSpot = {
      id: `${prefix}-${i}`,
      element: `city-house-${letter}`,
      x,
      z: row * M,
      face,
    };
    x += HOUSE_WIDTH[letter] ?? M;
    return spot;
  });
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

/** Eine Straße von West nach Ost in Reihe `row`, mit der Kreuzung in Spalte 3. */
function avenue(row: number, crossings: readonly number[]): ElementSpot[] {
  const out: ElementSpot[] = [];
  for (let col = 0; col < 7; col++) {
    const id = `strasse-${row}-${col}`;
    if (col === 3) out.push(at(id, 'city-road-junction', col, row));
    else if (crossings.includes(col)) out.push(at(id, 'city-road-crossing', col, row, 'E'));
    else if (col === 0 || col === 6) out.push(at(id, 'city-road-plain', col, row, 'E'));
    else out.push(at(id, col % 2 ? 'city-road' : 'city-road-old', col, row, 'E'));
  }
  return out;
}

/** Alles, was in der kleinen Stadt steht. */
export const CITY_SPOTS: readonly ElementSpot[] = [
  // Die beiden Straßen von West nach Ost, die Kreuzungen in Spalte 3.
  ...avenue(1, [2]),
  ...avenue(4, [4]),
  // Die Straße von Nord nach Süd: oben eine Allee, dazwischen ein Zebrastreifen.
  at('nord-0', 'city-road-avenue', 3, 0),
  at('nord-2', 'city-road', 3, 2),
  at('nord-3', 'city-road-crossing', 3, 3),
  at('nord-5', 'city-road-double', 3, 5),
  // Reihe 0 — nördlich der ersten Straße, die Häuser schauen nach Süden.
  ...houses('r0w', 0, 0, 'S', ['e', 'h', 'f']),
  ...houses('r0o', 0, 4, 'S', ['a', 'b', 'c', 'd']),
  // Reihe 2 — südlich der ersten Straße, die Häuser schauen nach Norden.
  ...houses('r2w', 2, 0, 'N', ['a', 'd', 'c', 'b']),
  ...houses('r2o', 2, 4, 'N', ['g']),
  at('park-2', 'city-park-trees', 5, 2),
  ...houses('r2o2', 2, 6, 'N', ['e']),
  // Reihe 3 — nördlich der zweiten Straße, nach Süden.
  at('park-3', 'city-park-bushes', 0, 3),
  ...houses('r3w', 3, 1, 'S', ['h', 'f']),
  ...houses('r3o', 3, 4, 'S', ['f', 'g', 'h']),
  // Reihe 5 — südlich der zweiten Straße, nach Norden.
  ...houses('r5w', 5, 0, 'N', ['g', 'e']),
  at('platz-5', 'city-plaza', 2, 5),
  at('parkweg-5', 'city-park-path', 4, 5, 'E'),
  ...houses('r5o', 5, 5, 'N', ['b', 'a']),
  // Autos auf den Straßen — rechts, wie man fährt: nach Westen auf der
  // nördlichen Spur, nach Osten auf der südlichen, nach Süden auf der westlichen.
  at('taxi', 'city-car-taxi', 1, 1, 'W', 2, 1),
  at('polizei', 'city-car-police', 5, 1, 'E', 2, 4),
  at('limousine', 'city-car-sedan', 3, 2, 'S', 2, 2),
  at('kombi', 'city-car-stationwagon', 2, 4, 'E', 2, 4),
  // Straßenmöbel auf dem Platz.
  at('bank', 'city-bench', 2, 5, 'S', 2, 3),
  at('hydrant', 'city-hydrant', 2, 5, 'S', 6, 1),
  at('container', 'city-dumpster', 2, 5, 'S', 5, 5),
];

/** **Der Boden** — das Raster und rundherum ein Rand von vier Kacheln. */
export function cityGround(): { x: number; z: number; w: number; d: number } {
  return { x: -4, z: -4, w: 7 * M + 8, d: 6 * M + 8 };
}

/** **Wo man ankommt** — auf dem Gehweg der ersten Straße, vor der Kreuzung. */
export function citySpawn(): { x: number; z: number } {
  return { x: 2 * M + 4.5, z: 1 * M + 7.5 };
}

/** Der Plan der Welt: nur Boden — alles andere sind Spielelemente (`CITY_SPOTS`). */
export function cityPlan(): GridPlan {
  const plan = new GridPlan([0]);
  plan.floor(cityGround());
  return plan;
}
