/**
 * **Der Ausschnitt, den der Archivar über seinem Blatt hält.**
 *
 * Sein Bild ist ein Zimmer von oben, und die Kamera passt es in das Fenster
 * ein (`HauntingWorld.aimArchive`). Damit sieht er das ganze Zimmer — und
 * genau deshalb sieht er die Schrift auf dem Klavier nicht. Zoom und
 * Verschiebung sind die zwei Griffe, mit denen er näher herangeht, ohne dass
 * die Kamera dafür ein zweites Zuhause bekommt: Alles hier rechnet **relativ
 * zum eingepassten Zimmer**, und `zoom = 1` ist immer wieder genau das Blatt,
 * mit dem er angefangen hat.
 *
 * **Die Grenze fällt aus der Rechnung und ist keine gewürfelte Zahl.** Bei
 * `zoom` sieht er die Hälfte, das Drittel, das Viertel des Blattes; wandern
 * darf die Mitte deshalb um genau so viel, dass der Rand des Ausschnitts den
 * Rand des Blattes nicht überschreitet (`panLimit`). Wer weiter zöge, schöbe
 * sein Zimmer aus dem Bild und stünde vor der schwarzen Fläche, die die Welt
 * um das aufgeschlagene Zimmer legt — und hielte das Gerät für kaputt.
 *
 * Ohne Browser gerechnet und deshalb geprüft: Vorzeichen und Anschläge sind
 * das, was auf einem Telefon niemand nachmisst.
 */
export interface ArchiveView {
  /** Wie nah: 1 ist das ganze Zimmer im Bild, 4 ein Viertel davon. */
  zoom: number;
  /** Wie weit die Mitte des Ausschnitts aus der Zimmermitte wandert, in Metern. */
  x: number;
  z: number;
}

/** Weiter weg als das ganze Zimmer geht nicht: Daneben liegt nur die Maske. */
export const ZOOM_MIN = 1;

/**
 * Und näher als ein Sechstel auch nicht.
 *
 * Ein Zimmer ist fünf bis zehn Meter breit; ein Sechstel davon ist gut ein
 * Meter im Bild — die Kiste, der Tisch, das Klavier. Wer weiter hineinzöge,
 * hätte eine Fläche ohne Kanten vor sich und wüsste nicht mehr, wo er ist.
 */
export const ZOOM_MAX = 6;

/** Das aufgeschlagene Blatt, wie es der Archivar bekommt: ganz und mittig. */
export function homeView(): ArchiveView {
  return { zoom: ZOOM_MIN, x: 0, z: 0 };
}

/** Ob der Ausschnitt genau so steht — dann braucht es keinen Zurück-Knopf. */
export function atHome(view: ArchiveView): boolean {
  return view.zoom <= ZOOM_MIN && view.x === 0 && view.z === 0;
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return ZOOM_MIN;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/**
 * Wie weit die Mitte des Ausschnitts wandern darf, in Metern.
 *
 * `half` ist die halbe Kante des eingepassten Blattes. Der Ausschnitt ist
 * `half / zoom` groß, und die Mitte darf um die Differenz wandern — dann liegt
 * seine Kante genau auf der des Blattes. Bei `zoom = 1` ist das null: Wer
 * alles sieht, hat nichts zu verschieben.
 */
export function panLimit(half: number, zoom: number): number {
  return Math.max(0, half - half / clampZoom(zoom));
}

/**
 * Näher heran (`factor > 1`) oder weiter weg — **und die Verschiebung geht
 * mit**.
 *
 * Beim Herauszoomen schrumpft der erlaubte Weg, und eine Verschiebung, die
 * eben noch erlaubt war, ist es dann nicht mehr. Ohne das Nachziehen hinge das
 * Blatt nach dem Herauszoomen schief im Bild.
 */
export function zoomedView(
  view: ArchiveView,
  factor: number,
  half: number,
  tall: number,
): ArchiveView {
  return fitView({ ...view, zoom: view.zoom * (Number.isFinite(factor) ? factor : 1) }, half, tall);
}

/** Den Ausschnitt verschieben, in Metern — und am Blattrand ist Schluss. */
export function pannedView(
  view: ArchiveView,
  dx: number,
  dz: number,
  half: number,
  tall: number,
): ArchiveView {
  return fitView(
    {
      zoom: view.zoom,
      x: view.x + (Number.isFinite(dx) ? dx : 0),
      z: view.z + (Number.isFinite(dz) ? dz : 0),
    },
    half,
    tall,
  );
}

/**
 * Einen Ausschnitt auf ein Blatt zurechtstutzen.
 *
 * Wird auch von außen gebraucht: Das Blatt ändert seine Größe, sobald der
 * Archivar ein anderes Zimmer aufschlägt oder das Fenster seine Form wechselt
 * (Telefon gedreht). Ein Ausschnitt, der für das alte Blatt erlaubt war, hängt
 * dann halb daneben.
 */
export function fitView(view: ArchiveView, half: number, tall: number): ArchiveView {
  const zoom = clampZoom(view.zoom);
  const wide = panLimit(half, zoom);
  const deep = panLimit(tall, zoom);
  return {
    zoom,
    x: clamp(view.x, wide),
    z: clamp(view.z, deep),
  };
}

function clamp(value: number, limit: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(limit, Math.max(-limit, value));
}
