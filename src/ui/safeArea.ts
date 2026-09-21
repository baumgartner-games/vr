import './safeArea.css';

/**
 * **Der sichere Bereich** — der Teil des Bildschirms, den das Gerät nicht für
 * sich braucht.
 *
 * Gemeldet wurde es an einem Bild: Über der Überschrift des Katalogs stand
 * die Uhr des Telefons, halb im Titel, und rechts daneben die Batterie im
 * Schließen-Knopf. „Wir müssen noch darauf achten, dass wir für Menüs diese
 * noch wrappen in Safe-Area-Views." Genau das ist das hier — nur ohne
 * Rahmenwerk: Ein Kasten bekommt die Ränder des Geräts als **Polster**, und
 * sein Inhalt fängt darunter an.
 *
 * **Polster und nicht Abstand**, und das ist der ganze Trick: Der Hintergrund
 * eines Blattes soll bis unter die Uhr reichen. Ein Abstand ließe dort einen
 * helleren Streifen stehen, und das sähe nach einem Fehler aus, weil es einer
 * wäre.
 *
 * **Ränder werden einzeln bestellt.** Ein Blatt, das von unten aufzieht,
 * berührt den oberen Rand gar nicht: Ein Polster von 47 Punkten in seinem Kopf
 * wäre dort nur ein Loch. Wer den ganzen Schirm nimmt, bestellt alle vier
 * (`ui/PageMenu.ts`, `MenuEntry.full`).
 *
 * Kein three.js, kein DOM beim Laden — die Klassen stehen in `safeArea.css`,
 * und was sie bedeuten, steht dort.
 */

/** Die vier Ränder eines Bildschirms, beim Namen. */
export type SafeEdge = 'top' | 'right' | 'bottom' | 'left';

/** Alle vier — für einen Kasten, der den ganzen Schirm nimmt. */
export const SAFE_EDGES: readonly SafeEdge[] = ['top', 'right', 'bottom', 'left'];

/** Wie die Klasse zu einem Rand heißt. Eine Stelle, damit sie eine bleibt. */
export function safeClass(edge: SafeEdge): string {
  return `safe-area--${edge}`;
}

/**
 * **Diesen Kasten die genannten Ränder freihalten lassen.**
 *
 * Für alles, was es schon gibt: Das Blatt des Menüs wird in seinem
 * Konstruktor gebaut, und ein zusätzlicher Kasten drumherum wäre ein
 * zusätzlicher Kasten im Aufbau (und damit im Stil). Zurück kommt derselbe
 * Kasten, damit sich der Aufruf in eine Kette stellen lässt.
 */
export function keepSafe(element: HTMLElement, ...edges: SafeEdge[]): HTMLElement {
  for (const edge of edges.length > 0 ? edges : SAFE_EDGES) {
    element.classList.add(safeClass(edge));
  }
  return element;
}

/**
 * **Einen Rand nachträglich an- oder abschalten.**
 *
 * Dieselbe Seite ist einmal ein Blatt von unten und einmal der ganze Schirm,
 * und nur im zweiten Fall liegt ihr Kopf unter der Uhr. Gerufen wird das beim
 * Zeichnen, also oft — `classList.toggle` mit festem Zustand ändert nichts,
 * wenn sich nichts ändert.
 */
export function setSafeEdge(element: HTMLElement, edge: SafeEdge, on: boolean): void {
  element.classList.toggle(safeClass(edge), on);
}

/**
 * **Ein neuer Kasten, der die Ränder freihält** — für alles, was noch gebaut
 * wird. `className` steht vor den Rand-Klassen, damit im DOM die eigene
 * Bedeutung zuerst dasteht.
 */
export function safeArea(className = '', ...edges: SafeEdge[]): HTMLElement {
  const node = document.createElement('div');
  if (className) node.className = className;
  return keepSafe(node, ...edges);
}
