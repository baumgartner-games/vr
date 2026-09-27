import type { ElementSpot } from '../elements/elementPlace';
import { GridPlan } from '../grid/gridPlan';

/**
 * **Test Restaurant** — die zweite Welt im Ordner _Test_, neben der Test
 * Navigation. **Leer, mit Absicht.**
 *
 * Gewünscht, im September 2026: _„Also wir sollten die Restaurant Test Welt
 * komplett neu aufbauen. Mach die bitte einmal komplett leer. Ich will diese
 * aus dem Model Regal selbst aufbauen und schicke dir dann das dazu."_ Übrig
 * sind der Boden und der Ankunftsort. Die Küchen, das Burgerband, die Gäste,
 * die Vorratsboxen und die Eisecke stehen in der Geschichte des Repositorys
 * (`docs/agents/testrestaurant.md` nennt den Commit).
 *
 * **Was der Besitzer aus dem Modellregal zusammenstellt, kommt als
 * Spielelemente hierher** (`elements/elementCatalog.ELEMENTS`), eine Zeile je
 * Möbel in `SPOTS` — und sonst nirgends. Die Welt stellt jede Stelle hin
 * (`elementView.placeElement`: Zellen gesperrt, bevor ein Modell lädt), und
 * **jede Stelle, deren Element eine Stationsart hat, wird eine Station**
 * (`elementStations`), ohne zweite Liste. Genau so eine zweite Liste war der
 * Grund, warum die Kisten am alten Band nicht auf `A` antworteten.
 *
 * **Reine Rechnung, ohne Szene**: Boden, Ankunftsort, Stellen. Der Test
 * daneben (`restaurantPlan.test.ts`) sieht nach, dass die Stellen auf dem
 * Boden stehen, sich nicht überlappen und den Ankunftsort frei lassen.
 */

/**
 * **Die Möbel der Welt** — heute keines.
 *
 * Eine Zeile je Element, etwa
 * `{ id: 'kartoffeln', element: 'crate-potatoes', x: 4, z: 2, face: 'N' }`
 * (`x`/`z` die Nordwestecke in Kacheln, `face` die Vorderseite). Mehr braucht
 * es nicht: Hinstellen, Sperren und — wo das Element einen Zweck hat — die
 * Station erledigt die Welt für jede Zeile gleich.
 */
export const SPOTS: readonly ElementSpot[] = [];

/**
 * **Der Boden**, in Kacheln — 40 × 32, so groß wie zuletzt mit allen Küchen,
 * Band und Gastraum, damit Platz für den Neuaufbau ist.
 */
export function ground(): { x: number; z: number; w: number; d: number } {
  return { x: -3, z: -3, w: 40, d: 32 };
}

/** **Wo man ankommt** — mitten auf dem Boden, auf der Mitte einer Kachel. */
export function spawn(): { x: number; z: number } {
  const g = ground();
  return { x: g.x + Math.floor(g.w / 2) + 0.5, z: g.z + Math.floor(g.d / 2) + 0.5 };
}

/** Der Plan der Welt: nur Boden — alles andere sind Spielelemente (`SPOTS`). */
export function restaurantPlan(): GridPlan {
  const plan = new GridPlan([0]);
  plan.floor(ground());
  return plan;
}
