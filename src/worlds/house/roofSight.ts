/**
 * **Verdeckt eine Decke die Figur?** — von oben, wenn man draußen steht.
 *
 * Draußen zeigt der Hausbau das ganze Haus mit allen Etagen
 * (`HausbauWorld.viewLevel`); drinnen schneidet er alles über der eigenen
 * Etage weg. Steht man draußen **hinter** dem Haus, liegt die Decke über den
 * Zimmern (`ceiling.ts`) zwischen Figur und Kamera, und von der Figur bleibt
 * höchstens der Kopf. Gewünscht (September 2026): _„wenn ich hinter einem Haus
 * stehe, sollte so viel unsichtbar oder abgeschnitten werden, dass man sieht,
 * wo ich bin."_ Dann schneidet die Welt draußen genauso wie drinnen.
 *
 * Gefragt wird mit Strahlen aus der Figur zur Kamera — aus den Beinen und aus
 * dem Kopf (`SIGHT_HEIGHTS`): Wo ein Strahl die Bodenhöhe einer höheren Etage
 * kreuzt, liegt dort eine Kachel dieser Etage? Reine Rechnung, ohne Szene.
 */

/** Ein Punkt im Raum. */
export interface SightPoint {
  x: number;
  y: number;
  z: number;
}

/** Aus welchen Höhen über den Füßen gefragt wird, in Metern. */
export const SIGHT_HEIGHTS = [0.3, 1.5] as const;

/**
 * @param feet Wo die Figur steht (Füße).
 * @param eye Wo die Kamera steht.
 * @param level Die Etage der Figur.
 * @param levelYs Die Bodenhöhe jeder Etage (`NavGraph.levels`).
 * @param hasTile Ob auf dieser Etage an dieser Stelle eine Kachel liegt.
 */
export function roofOverSight(
  feet: SightPoint,
  eye: SightPoint,
  level: number,
  levelYs: readonly number[],
  hasTile: (x: number, z: number, level: number) => boolean,
): boolean {
  for (let above = level + 1; above < levelYs.length; above++) {
    const y = levelYs[above]!;
    for (const lift of SIGHT_HEIGHTS) {
      const from = feet.y + lift;
      const rise = eye.y - from;
      if (rise <= 0) continue;
      const t = (y - from) / rise;
      if (t <= 0 || t >= 1) continue;
      const x = feet.x + t * (eye.x - feet.x);
      const z = feet.z + t * (eye.z - feet.z);
      if (hasTile(Math.floor(x), Math.floor(z), above)) return true;
    }
  }
  return false;
}
