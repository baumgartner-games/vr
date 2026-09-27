import type { ElementSpot } from './elementPlace';
import { placeElement, type ElementHost, type PlacedElement } from './elementView';
import type { StationLayer } from './stationLayer';

/**
 * **Stellen hinstellen und Küche daraus machen** — der eine Weg, auf dem eine
 * Welt ihre Spielelemente aufstellt.
 *
 * Jede Stelle geht durch `placeElement` (die Zellen sind gesperrt, sobald der
 * Aufruf zurückkehrt, noch bevor ein Modell lädt), und **jedes hingestellte
 * Element geht an die Stationsschicht** (`StationLayer.add`). Welche davon
 * Stationen werden, entscheidet das Element selbst (`elementStations`: mit
 * Stationsart ja, Tisch und Band nein) — und nicht eine zweite Liste der
 * Welt. Genau die gab es im ersten Test Restaurant, und die Kisten am
 * Burgerband standen nicht darin: _„die Vorrats Boxen mit Brötchen und Käse
 * und co beim conveyer belt nicht interagierbar"_.
 *
 * Ein Element, das scheitert, fehlt mit einer Warnung — die Welt stirbt nicht
 * daran. Nach dem Aufräumen (`host.alive()` falsch) wird nichts mehr
 * angemeldet.
 *
 * @param then was die Welt darüber hinaus mit einem hingestellten Element tut
 * @returns die hingestellten Elemente, sobald alle da sind
 */
export async function furnish(
  host: ElementHost,
  spots: readonly ElementSpot[],
  stations: StationLayer | null,
  then?: (placed: PlacedElement) => void,
): Promise<PlacedElement[]> {
  const all = await Promise.all(
    spots.map((spot) =>
      placeElement(host, spot)
        .then((placed) => {
          if (!host.alive()) return null;
          stations?.add(placed);
          then?.(placed);
          return placed;
        })
        .catch((error: unknown) => {
          console.warn(`Spielelement ${spot.id} nicht aufgestellt`, error);
          return null;
        }),
    ),
  );
  return all.filter((one): one is PlacedElement => one !== null);
}
