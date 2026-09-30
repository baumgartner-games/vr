import * as THREE from 'three';
import type { FloorCorner } from '../grid/solids';

/**
 * **Eine Platte aus dem Regal, diagonal halbiert** — für den halben Belag
 * unter einer Wand unter 45° (`GridWorld.halfPlates`, Hausbau).
 *
 * Gewünscht (September 2026): _„beim setzen des boden gibt es bei diagonalen
 * wänden noch ein problem. In der welt haunting haben wir das gelöst, dass
 * auch nur diagonale bodenteile eingefärbt werden können. Das soll an sich
 * auch möglich sein, wenn ich einen boden lege."_ Die Platte selbst gibt es
 * nicht als Dreieck; also wird die ganze geschnitten, und zwar an ihrer
 * Geometrie und nicht mit einer Schnittebene im Material: Die hinge an der
 * Welt und nicht an der Kachel, und ein Bündel (`PlateFloor`) hat nur eines.
 *
 * `shape` liegt wie in `PlateFloor.build` mittig über dem Nullpunkt, eine
 * Kachel (`size`) breit. Weg fällt das Dreieck an der Ecke `empty` — die
 * Diagonale durch die beiden Nachbarecken ist der Schnitt. Jedes Dreieck, das
 * sie kreuzt, wird an ihr geteilt, alle Eigenschaften (Normale, Textur, Farbe)
 * dazwischen gemittelt. Die Schnittkante bleibt offen: Auf ihr steht die Wand.
 */
export function cutPlate(
  shape: THREE.BufferGeometry,
  empty: FloorCorner,
  size = 1,
): THREE.BufferGeometry {
  const flat = shape.index ? shape.toNonIndexed() : shape;
  const names = Object.keys(flat.attributes);
  const sources = names.map((name) => flat.getAttribute(name) as THREE.BufferAttribute);
  const position = flat.getAttribute('position') as THREE.BufferAttribute;
  const cx = empty === 'ne' || empty === 'se' ? 1 : -1;
  const cz = empty === 'se' || empty === 'sw' ? 1 : -1;
  // Wie weit ein Punkt auf der Seite der leeren Ecke liegt; bleiben darf ≤ 0.
  // Ein Hauch Spielraum, damit Eckpunkte genau auf der Diagonale nicht zittern.
  const slack = size * 1e-6;
  const side = (i: number): number => cx * position.getX(i) + cz * position.getZ(i) - slack;

  const out: number[][] = names.map(() => []);
  const vertex = (i: number, j: number, t: number): number[][] =>
    sources.map((source) => {
      const values: number[] = [];
      for (let k = 0; k < source.itemSize; k++) {
        const a = source.getComponent(i, k);
        values.push(a + (source.getComponent(j, k) - a) * t);
      }
      return values;
    });
  const emit = (corners: number[][][]): void => {
    for (let n = 1; n + 1 < corners.length; n++) {
      for (const one of [corners[0]!, corners[n]!, corners[n + 1]!]) {
        one.forEach((values, a) => out[a]!.push(...values));
      }
    }
  };

  for (let first = 0; first + 2 < position.count; first += 3) {
    const ids = [first, first + 1, first + 2];
    const d = ids.map(side);
    // Sutherland–Hodgman gegen eine einzige Ebene: aus einem Dreieck wird
    // keines, ein Dreieck oder ein Viereck (zwei Dreiecke).
    const kept: number[][][] = [];
    for (let e = 0; e < 3; e++) {
      const i = ids[e]!,
        j = ids[(e + 1) % 3]!;
      const di = d[e]!,
        dj = d[(e + 1) % 3]!;
      if (di <= 0) kept.push(vertex(i, i, 0));
      if (di <= 0 !== dj <= 0) kept.push(vertex(i, j, di / (di - dj)));
    }
    if (kept.length >= 3) emit(kept);
  }

  const cut = new THREE.BufferGeometry();
  names.forEach((name, a) => {
    const source = sources[a]!;
    cut.setAttribute(
      name,
      new THREE.Float32BufferAttribute(out[a]!, source.itemSize, source.normalized),
    );
  });
  if (flat !== shape) flat.dispose();
  cut.computeBoundingBox();
  cut.computeBoundingSphere();
  return cut;
}
