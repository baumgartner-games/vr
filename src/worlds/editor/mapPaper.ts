/**
 * **Wie ein Grundriss auf ein Blatt kommt** — die Rechnung hinter der
 * Draufsicht auf der Karte in der Hand (`PlanCard.ts`).
 *
 * Zwei Zeilen Mathematik, und trotzdem eine eigene Datei: Eine Karte, die um
 * ein paar Pixel danebenliegt, sieht in der Brille aus wie eine Karte — man
 * merkt es erst daran, dass die eigene Figur neben dem Gang steht statt darin,
 * und sucht den Fehler dann in der Figur. Hier ist er nachrechenbar
 * (`mapPaper.test.ts`).
 *
 * **Norden ist oben.** Auf dem Blatt wächst `y` nach unten, in der Welt wächst
 * `z` nach Süden — beides zeigt in dieselbe Richtung, und deshalb steht in der
 * Umrechnung kein Vorzeichen. Das ist kein Zufall, sondern der Grund, warum
 * Draufsichten überhaupt so herum gezeichnet werden.
 *
 * **Der Maßstab ist für beide Achsen derselbe.** Ein Blatt, das die schmalere
 * Richtung streckt, bis es voll ist, zeigt einen Gang, der breiter aussieht,
 * als er ist — und genau das will man an einem Grundriss nie.
 */

/** Der Ausschnitt, der aufs Blatt soll, in Planmetern. */
export interface PlanBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Und wie er darauf liegt. */
export interface Paper {
  /** Pixel je Planmeter. */
  scale: number;
  /** Wo die Planmitte auf dem Blatt liegt, in Pixeln. */
  cx: number;
  cy: number;
  /** Die Planmitte selbst, in Planmetern. */
  midX: number;
  midZ: number;
}

/**
 * Den Ausschnitt mittig auf ein Blatt legen, mit Rand.
 *
 * `margin` ist der Rand **je Seite**, in Pixeln. Ein Grundriss ohne Rand
 * klebt an der Kante des Blattes, und dort liegt bei einer Karte in der Hand
 * der Daumen.
 */
export function fitPaper(box: PlanBox, width: number, height: number, margin = 12): Paper {
  const spanX = Math.max(1e-6, box.maxX - box.minX);
  const spanZ = Math.max(1e-6, box.maxZ - box.minZ);
  const room = { x: Math.max(1, width - margin * 2), y: Math.max(1, height - margin * 2) };
  return {
    scale: Math.min(room.x / spanX, room.y / spanZ),
    cx: width / 2,
    cy: height / 2,
    midX: (box.minX + box.maxX) / 2,
    midZ: (box.minZ + box.maxZ) / 2,
  };
}

/** Ein Punkt des Plans auf dem Blatt. */
export function onPaper(paper: Paper, x: number, z: number): { x: number; y: number } {
  return {
    x: paper.cx + (x - paper.midX) * paper.scale,
    y: paper.cy + (z - paper.midZ) * paper.scale,
  };
}

/** Eine Länge in Planmetern als Länge auf dem Blatt. */
export function onPaperLength(paper: Paper, metres: number): number {
  return metres * paper.scale;
}
