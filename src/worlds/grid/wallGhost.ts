/**
 * **Wand-Ghosting: was zwischen der Kamera und der Figur steht, wird
 * durchsichtig.**
 *
 * Die Ansicht _Von oben_ steht schräg über der Szene (`core/TopDownCamera.ts`),
 * und damit steht sie hinter jeder Wand, die südlich von der Figur liegt. Das
 * Aufschneiden (`core/cutaway.ts`) nimmt nur weg, was **über** ihr liegt —
 * Decken und Dächer; eine Wand auf derselben Ebene bleibt stehen, und hinter
 * ihr ist die Figur weg. In Overcooked und den Sims ist das seit jeher
 * dieselbe Antwort: Die Wand bleibt, wird aber durchsichtig.
 *
 * Hier steht die **Auswahl** dazu, und zwar als reine Rechnung: welche
 * achsenparallelen Kästen eine Strecke schneidet. Kein three.js, kein
 * Raycaster, keine Szene — damit ein Test in Millisekunden nachrechnen kann,
 * was sonst nur in der Brille auffällt. `GridWorld` ruft sie einmal je Bild
 * und tauscht danach Materialien; wie eine durchsichtige Wand *aussieht*,
 * steht dort und nicht hier.
 *
 * **Böden zählen nicht.** Ein Blick von schräg oben geht über jede Bodenplatte
 * hinweg, aber er streift sie — die Strecke zur Figur endet ja auf ihr. Wer
 * Böden mitnähme, hätte in jedem Bild den halben Fußboden durchsichtig, und
 * darunter ist nichts als Nacht. Also: die Sorte `floor` nie, und alles, was
 * flach und unter Kniehöhe liegt, auch nicht (eine Schwelle, eine Rampe, eine
 * Druckplatte).
 */

/** Ein Punkt im Raum. */
export interface GhostPoint {
  x: number;
  y: number;
  z: number;
}

/** Ein achsenparalleler Kasten: Mitte und Kantenlängen, wie ein `PlanSolid`. */
export interface GhostBox {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

/** Was von einem Quader gebraucht wird, um über ihn zu entscheiden. */
export interface GhostCandidate {
  box: GhostBox;
  /** Ob er ein Boden ist (`PlanSolid.kind === 'floor'`). */
  floor?: boolean;
}

/**
 * Bis zu welcher Höhe ein flacher Quader als Boden durchgeht, in Metern.
 *
 * Kniehöhe: Was darunter bleibt, verdeckt niemanden — eine Stufe, eine
 * Schwelle, der Rand einer Druckplatte. Was darüber ragt, kann eine Figur
 * verdecken und wird deshalb behandelt wie eine Wand.
 */
export const GHOST_KNEE = 0.5;

/**
 * **Kann dieser Quader überhaupt jemanden verdecken?**
 *
 * Die Frage steht vor der Strecke, weil sie sich einmal beantworten lässt und
 * nicht jedes Bild neu: Ein Quader wird nicht plötzlich zum Boden.
 */
export function blocksView(one: GhostCandidate, knee = GHOST_KNEE): boolean {
  if (one.floor) return false;
  // Flach **und** tief liegend: Die Oberkante zählt, nicht die Dicke — ein
  // Podest von zehn Zentimetern auf zwei Metern Höhe ist eine Decke.
  return one.box.y + one.box.h / 2 > knee;
}

/**
 * **Welche Kästen zwischen zwei Punkten liegen.**
 *
 * Die Strecke läuft von `from` (der Kamera) nach `to` (der Figur); gesucht ist,
 * was **davor** liegt, also alles, was sie schneidet, bevor sie ankommt. Was
 * hinter der Figur steht, verdeckt sie nicht — und weil die Strecke dort endet,
 * fällt es von selbst heraus.
 *
 * Gerechnet wird mit dem **Plattenverfahren** (slab test): Für jede Achse die
 * beiden Parameter, bei denen die Strecke die beiden Seitenflächen kreuzt, das
 * Maximum der Eintritte gegen das Minimum der Austritte. Überholt der Eintritt
 * den Austritt, geht die Strecke daneben. Das sind neun Zeilen und keine
 * Bibliothek — und es ist dieselbe Rechnung, die jeder Raycaster für eine
 * Bounding Box macht.
 *
 * Ein Kasten, **in** dem die Kamera steckt, zählt mit: Dann ist der Eintritt
 * negativ, der Austritt positiv, und man schaut aus einer Wand heraus. Genau
 * dann soll sie weg.
 */
export function boxesBetween<T extends GhostCandidate>(
  from: GhostPoint,
  to: GhostPoint,
  boxes: readonly T[],
  knee = GHOST_KNEE,
): T[] {
  const out: T[] = [];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  for (const one of boxes) {
    if (!blocksView(one, knee)) continue;
    if (crosses(from, dx, dy, dz, one.box)) out.push(one);
  }
  return out;
}

/**
 * Schneidet die Strecke diesen Kasten, bevor sie ankommt?
 *
 * Die Strecke ist `from + t · d` mit `t` zwischen 0 und 1. Eine Achse, in der
 * sie sich gar nicht bewegt, wird zur Ja-oder-Nein-Frage: Entweder liegt der
 * Anfang zwischen den beiden Flächen, oder die Strecke kann den Kasten nie
 * treffen. Ohne diesen Zweig entstünde eine Division durch null, und aus einer
 * Wand daneben würde eine Wand davor.
 */
function crosses(from: GhostPoint, dx: number, dy: number, dz: number, box: GhostBox): boolean {
  let near = 0;
  let far = 1;
  const axes: [number, number, number, number][] = [
    [from.x, dx, box.x, box.w],
    [from.y, dy, box.y, box.h],
    [from.z, dz, box.z, box.d],
  ];
  for (const [start, delta, centre, size] of axes) {
    const low = centre - size / 2;
    const high = centre + size / 2;
    if (Math.abs(delta) < 1e-9) {
      if (start < low || start > high) return false;
      continue;
    }
    const first = (low - start) / delta;
    const second = (high - start) / delta;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return false;
  }
  return true;
}
