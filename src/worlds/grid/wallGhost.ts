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
 * Hier stehen die **Bausteine** dazu, als reine Rechnung über
 * achsenparallele Kästen: was überhaupt verdecken kann (`blocksView`), aus
 * welchem Viertel die Kamera schaut (`cameraQuarter`), und welche Wände ganz
 * auf ihrer Seite liegen (`wallsInFront`). Welche Wände eines Raums
 * tatsächlich weggehen, entscheidet `roomWalls.ts`; wie sie dann aussehen,
 * `wallCut.ts`.
 *
 * **Böden zählen nicht**, und alles, was flach und unter Kniehöhe liegt, auch
 * nicht (eine Schwelle, eine Rampe, eine Druckplatte).
 *
 * Bis Ende September 2026 stand hier außerdem eine Strecke von der Kamera zur Figur
 * (`wallsHiding`, die _Sichtlinie_): nur die Wand, hinter der man gerade
 * steht. Gewünscht war dann der Raum, nicht die Linie — sie ist heraus.
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
 * **Wie weit eine Wand über und unter der Mitte der Figur noch zu ihrer Etage
 * zählt**, in Metern (`wallsInFront`). Die Mitte liegt knapp einen Meter über
 * den Füßen: Was nicht über das Knie reicht, liegt eine Etage tiefer; was
 * erst zwei Meter über der Mitte anfängt, gehört zur Decke oder zur Etage
 * darüber, und die schneidet ohnehin das Aufschneiden weg (`core/cutaway.ts`).
 */
export const FRONT_BELOW = 0.4;
export const FRONT_ABOVE = 2;

/**
 * **Alle Wände vor der Figur** — was gilt, wenn sie **draußen** steht und es
 * keinen Raum gibt (`roomWalls.roomWallsToClear` gibt dann `null`).
 *
 * Jede Wand, die ganz auf der Kameraseite der Figur liegt (`turnsItsBack`),
 * zählt — auch die zehn Meter daneben. Beschränkt wird nur auf die **Etage**
 * der Figur (`FRONT_BELOW`, `FRONT_ABOVE`), sonst gingen im ersten Stock die
 * Wände des Erdgeschosses mit.
 */
export function wallsInFront<T extends GhostCandidate>(
  camera: GhostPoint,
  figure: GhostPoint,
  boxes: readonly T[],
  knee = GHOST_KNEE,
): T[] {
  const out: T[] = [];
  const quarter = cameraQuarter(camera, figure);
  const eye = toCameraSouth(camera, quarter);
  const aim = toCameraSouth(figure, quarter);
  for (const one of boxes) {
    if (!blocksView(one, knee)) continue;
    const top = one.box.y + one.box.h / 2;
    const bottom = one.box.y - one.box.h / 2;
    if (top <= figure.y - FRONT_BELOW || bottom >= figure.y + FRONT_ABOVE) continue;
    const box = quarter === 0 ? one.box : boxToCameraSouth(one.box, quarter);
    if (turnsItsBack(box, aim, eye)) out.push(one);
  }
  return out;
}

/**
 * **In welchem Viertel die Kamera steht**, von der Figur aus: 0 im Süden
 * (ungedreht), 1 im Osten, 2 im Norden, 3 im Westen — links herum gezählt
 * wie `topDownPose.quarterOf`. Senkrecht darüber zählt als Süden.
 */
export function cameraQuarter(camera: GhostPoint, figure: GhostPoint): 0 | 1 | 2 | 3 {
  const dx = camera.x - figure.x;
  const dz = camera.z - figure.z;
  if (Math.hypot(dx, dz) < 1e-6) return 0;
  const quarters = Math.round(Math.atan2(dx, dz) / (Math.PI / 2));
  return (((quarters % 4) + 4) % 4) as 0 | 1 | 2 | 3;
}

/**
 * **Einen Punkt so drehen, dass die Kamera im Süden steht** — um ganze
 * Viertel um die Hochachse, zurück um das Viertel, in dem sie steht.
 */
export function toCameraSouth(point: GhostPoint, quarter: 0 | 1 | 2 | 3): GhostPoint {
  switch (quarter) {
    case 0:
      return point;
    case 1:
      return { x: -point.z, y: point.y, z: point.x };
    case 2:
      return { x: -point.x, y: point.y, z: -point.z };
    case 3:
      return { x: point.z, y: point.y, z: -point.x };
  }
}

/** Dasselbe für einen Kasten: die Mitte gedreht, Breite und Tiefe getauscht. */
export function boxToCameraSouth(box: GhostBox, quarter: 0 | 1 | 2 | 3): GhostBox {
  const centre = toCameraSouth(box, quarter);
  const odd = quarter % 2 === 1;
  return {
    x: centre.x,
    y: box.y,
    z: centre.z,
    w: odd ? box.d : box.w,
    h: box.h,
    d: odd ? box.w : box.d,
  };
}

/**
 * **Zeigt dieser Quader der Kamera seine andere Seite?**
 *
 * Er tut es, wenn er **vollständig** auf der Kameraseite der Figur liegt: Dann
 * steht die Figur davor und die Kamera dahinter, und was zwischen beiden
 * liegt, sieht der Spieler nicht mehr. Reicht er an der Figur vorbei — eine
 * Wand, die neben ihr nach hinten weiterläuft —, sehen beide dieselbe Seite,
 * und er bleibt stehen.
 *
 * Steht die Kamera **senkrecht** über der Figur, gibt es keine Seite, auf die
 * man sich beziehen könnte; dann entscheidet allein die Strecke (der Blick
 * geht von oben durch die Decke und nicht durch eine Wand).
 */
function turnsItsBack(box: GhostBox, figure: GhostPoint, camera: GhostPoint): boolean {
  const toward = camera.z - figure.z;
  if (Math.abs(toward) < 1e-9) return true;
  const near = toward > 0 ? box.z - box.d / 2 : box.z + box.d / 2;
  return toward > 0 ? near >= figure.z : near <= figure.z;
}
