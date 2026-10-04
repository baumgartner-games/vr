import type { ElementSpot, Face } from '../elements/elementPlace';
import { GridPlan } from '../grid/gridPlan';

/**
 * **Der Plan der kleinen Stadt** — nur aus dem Katalogordner _Stadt_
 * (`elements/cityCatalog.ts`). Gewünscht (Oktober 2026): _„Nehme die Teile und
 * schau mal, wie eine Test-Welt ‚kleine Stadt' wäre."_
 *
 * **Ein Raster aus Stücken von 12 m** (`M`, so groß wie ein Straßenstück mit
 * seinen 3 m Gehweg je Seite): fünf Spalten, sechs Reihen. Zwei Straßen laufen
 * von West nach Ost (Reihe 1 und 4), eine von Nord nach Süd (Spalte 2); wo sie
 * sich treffen, ist eine Kreuzung. Dazwischen stehen die Häuser — so breit,
 * wie sie sind, Wand an Wand, vorn am Gehweg der Straße, hinten der Garten.
 * Je 24 m Häuserreihe gehen auf: E + H + F, A + B + C + D, oder ein Park
 * (12 m) und A + B.
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

/** Eine Straße von West nach Ost in Reihe `r`, mit der Kreuzung in Spalte 2. */
function avenue(r: number, crossing: number): ElementSpot[] {
  const out: ElementSpot[] = [];
  for (let col = 0; col < 5; col++) {
    const id = `strasse-${r}-${col}`;
    if (col === 2) out.push(at(id, 'city-road-junction', col, r));
    else if (col === crossing) out.push(at(id, 'city-road-crossing', col, r, 'E'));
    else out.push(at(id, col % 2 ? 'city-road' : 'city-road-old', col, r, 'E'));
  }
  return out;
}

/** Alles, was in der kleinen Stadt steht. */
export const CITY_SPOTS: readonly ElementSpot[] = [
  // Die beiden Straßen von West nach Ost, die Kreuzungen in Spalte 2.
  ...avenue(1, 1),
  ...avenue(4, 3),
  // Die Straße von Nord nach Süd: oben eine Allee, dazwischen ein Zebrastreifen.
  at('nord-0', 'city-road-avenue', 2, 0),
  at('nord-2', 'city-road', 2, 2),
  at('nord-3', 'city-road-crossing', 2, 3),
  at('nord-5', 'city-road-double', 2, 5),
  // Reihe 0 — nördlich der ersten Straße, die Häuser schauen nach Süden.
  ...row('r0w', 0, 0, 'S', ['e', 'h', 'f']),
  ...row('r0o', 0, 3, 'S', ['a', 'b', 'c', 'd']),
  // Reihe 2 — südlich der ersten Straße, nach Norden.
  ...row('r2w', 2, 0, 'N', ['a', 'd', 'c', 'b']),
  ...row('r2o', 2, 3, 'N', ['city-park-trees', 'a', 'b']),
  // Reihe 3 — nördlich der zweiten Straße, nach Süden.
  ...row('r3w', 3, 0, 'S', ['city-park-bushes', 'b', 'a']),
  ...row('r3o', 3, 3, 'S', ['f', 'g', 'h']),
  // Reihe 5 — südlich der zweiten Straße, nach Norden.
  ...row('r5w', 5, 0, 'N', ['city-plaza', 'a', 'b']),
  ...row('r5o', 5, 3, 'N', ['city-park-path', 'b', 'a']),
  // Autos auf den Straßen — rechts, wie man fährt: nach Westen auf der
  // nördlichen Spur, nach Osten auf der südlichen, nach Süden auf der westlichen.
  at('taxi', 'city-car-taxi', 0, 1, 'W', 4, 4),
  at('polizei', 'city-car-police', 3, 1, 'E', 4, 7),
  at('limousine', 'city-car-sedan', 2, 2, 'S', 4, 2),
  at('kombi', 'city-car-stationwagon', 0, 4, 'E', 6, 7),
  // Straßenmöbel auf dem Platz.
  at('bank', 'city-bench', 0, 5, 'S', 3, 4),
  at('hydrant', 'city-hydrant', 0, 5, 'S', 9, 2),
  at('container', 'city-dumpster', 0, 5, 'S', 8, 8),
];

/** **Der Boden** — das Raster und rundherum ein Rand von vier Kacheln. */
export function cityGround(): { x: number; z: number; w: number; d: number } {
  return { x: -4, z: -4, w: 5 * M + 8, d: 6 * M + 8 };
}

/** **Wo man ankommt** — auf dem Gehweg der ersten Straße, vor der Kreuzung. */
export function citySpawn(): { x: number; z: number } {
  return { x: 1 * M + 8.5, z: 1 * M + 1.5 };
}

/** Der Plan der Welt: nur Boden — alles andere sind Spielelemente (`CITY_SPOTS`). */
export function cityPlan(): GridPlan {
  const plan = new GridPlan([0]);
  plan.floor(cityGround());
  return plan;
}
