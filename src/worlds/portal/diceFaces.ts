/**
 * Aus Dreiecken werden **Würfelflächen**, und auf ihnen stehen Zahlen.
 *
 * Ein platonischer Körper kommt aus three.js als Haufen Dreiecke: zwanzig beim
 * Ikosaeder, aber sechsunddreißig beim Dodekaeder — dort sind je drei Dreiecke
 * ein Fünfeck. Eine Fläche ist also nicht ein Dreieck, sondern **alles, was
 * dieselbe Normale hat**, und genau das ist der erste Schritt hier.
 *
 * Der zweite ist die Nummerierung. Auf einem echten Würfel ergeben
 * gegenüberliegende Flächen zusammen immer `n + 1` — 1 und 6, 2 und 5, 3 und 4.
 * Das ist keine Zierde: Wer einen W20 in der Hand dreht, liest die Rückseite
 * mit, und ein Würfel, dessen Zahlen irgendwie verteilt sind, sieht auf den
 * ersten Blick falsch aus, ohne dass man sagen könnte, warum. Der Tetraeder hat
 * keine gegenüberliegenden Flächen — jede zeigt auf eine Kante —, also bekommt
 * er die Zahlen der Reihe nach.
 *
 * Das alles ist reine Rechnerei auf Zahlentripeln: kein three.js, keine
 * Geometrie, damit es sich ohne Browser testen lässt (`dice.ts` baut daraus
 * dann den Würfel).
 */

/** Eine Richtung, wie sie aus einem Positionspuffer fällt. */
export type Vec3 = readonly [number, number, number];

/** Eine Fläche des Würfels: wohin sie zeigt, woraus sie besteht, was auf ihr steht. */
export interface DieFace {
  /** Die gemeinsame Normale ihrer Dreiecke. */
  normal: Vec3;
  /** Indizes der Dreiecke, aus denen sie besteht — in der Reihenfolge der Eingabe. */
  triangles: number[];
  /** Die Augenzahl, ab 1. */
  number: number;
}

/** Ab welchem Skalarprodukt zwei Normalen als dieselbe Fläche gelten. */
const SAME = 0.999;
/** Und ab welchem als gegenüberliegende. */
const OPPOSITE = -0.999;

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Dreiecksnormalen zu Flächen zusammenfassen — die Zahlen stehen noch nicht
 * darauf, dafür ist `numberFaces` da.
 */
export function groupFaces(normals: readonly Vec3[]): DieFace[] {
  const faces: DieFace[] = [];
  for (let index = 0; index < normals.length; index++) {
    const normal = normals[index]!;
    const face = faces.find((candidate) => dot(candidate.normal, normal) > SAME);
    if (face) face.triangles.push(index);
    else faces.push({ normal, triangles: [index], number: 0 });
  }
  return faces;
}

/**
 * Schreibt die Augenzahlen auf die Flächen: gegenüberliegende ergeben `n + 1`.
 *
 * Gearbeitet wird paarweise, und immer mit der **kleinsten noch freien** Zahl:
 * sie bekommt die nächste unbeschriftete Fläche, ihre Gegenüberliegende bekommt
 * `n + 1` minus dieser Zahl. Damit bleibt die Menge der freien Zahlen unter
 * genau dieser Spiegelung symmetrisch, und die Rechnung geht bis zur letzten
 * Fläche auf. Wo es kein Gegenüber gibt (Tetraeder), wird einfach der Reihe
 * nach gezählt.
 */
export function numberFaces(faces: DieFace[]): DieFace[] {
  const total = faces.length;
  const free = new Set<number>();
  for (let value = 1; value <= total; value++) free.add(value);

  const take = (): number => {
    const smallest = Math.min(...free);
    free.delete(smallest);
    return smallest;
  };

  for (const face of faces) {
    if (face.number > 0) continue;
    const own = take();
    face.number = own;
    const opposite = faces.find(
      (candidate) => candidate.number === 0 && dot(candidate.normal, face.normal) < OPPOSITE,
    );
    if (!opposite) continue;
    const mirrored = total + 1 - own;
    // Nur nehmen, was noch frei ist. Bei den platonischen Körpern ist es das
    // immer; die Abfrage hält den Fall aus, in dem jemand hier etwas anderes
    // hineinreicht, statt zwei Flächen dieselbe Zahl tragen zu lassen.
    if (!free.delete(mirrored)) continue;
    opposite.number = mirrored;
  }
  return faces;
}

/** Beides in einem Schritt: gruppieren und beschriften. */
export function readFaces(normals: readonly Vec3[]): DieFace[] {
  return numberFaces(groupFaces(normals));
}
