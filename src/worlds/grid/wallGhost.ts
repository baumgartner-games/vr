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
 * welcher Richtung die Kamera schaut (`facingAxes`), und welche Wände ganz
 * auf ihrer Seite liegen (`wallsInFront`) und die Figur draußen wirklich
 * verdecken (`wallsCovering`). Welche Wände eines Raums
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

/**
 * Ein achsenparalleler Kasten: Mitte und Kantenlängen, wie ein `PlanSolid`.
 *
 * Steht darin eine **Schräge** (`slant`), ist der Kasten nur ihre Hülle — die
 * Wand selbst liegt unter 45° darin, und wer genau fragt (`roomWalls.ts`, die
 * Strahlen von `wallsCovering`), nimmt die Schräge.
 */
export interface GhostBox {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  slant?: GhostSlant;
}

/**
 * **Eine gedrehte Wand in ihrer Hülle**: Drehung um die Hochachse wie bei
 * three.js (die lange Seite zeigt nach `(cos yaw, −sin yaw)`), Länge und
 * Dicke. Bis Oktober 2026 kam eine Wand unter 45° nur als ihre quadratische
 * Hülle an, galt damit nicht als Wand und wurde nie durchsichtig — gemeldet:
 * _„bitte auch die 45° wände von der kamera aus mit berücksichtigen"_.
 */
export interface GhostSlant {
  yaw: number;
  long: number;
  thin: number;
}

/**
 * **Der Kasten eines gedrehten Quaders** — `w` entlang seiner lokalen x-Achse,
 * `d` entlang z. Liegt er auf einer Achse, ist das ein gewöhnlicher Kasten
 * (bei einer Vierteldrehung mit getauschten Seiten); sonst die Hülle samt
 * Schräge.
 */
export function turnedBox(
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  yaw: number,
): GhostBox {
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  if (s < 1e-3) return { x, y, z, w, h, d };
  if (c < 1e-3) return { x, y, z, w: d, h, d: w };
  const box: GhostBox = { x, y, z, w: w * c + d * s, h, d: w * s + d * c };
  box.slant = w >= d ? { yaw, long: w, thin: d } : { yaw: yaw + Math.PI / 2, long: d, thin: w };
  return box;
}

/**
 * **Wo ein Punkt in der Schräge liegt**: entlang ihrer langen Seite und quer
 * dazu, von ihrer Mitte aus. Quer ist positiv zur Seite `(sin yaw, cos yaw)`.
 */
export function slantLocal(
  slant: GhostSlant,
  dx: number,
  dz: number,
): { along: number; across: number } {
  const c = Math.cos(slant.yaw);
  const s = Math.sin(slant.yaw);
  return { along: dx * c - dz * s, across: dx * s + dz * c };
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
 * **Alle Wände vor der Figur** — die Vorauswahl für draußen
 * (`wallsCovering`).
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
  const axes = facingAxes(camera, figure);
  for (const one of boxes) {
    if (!blocksView(one, knee)) continue;
    const box = one.box;
    const top = box.y + box.h / 2;
    const bottom = box.y - box.h / 2;
    if (top <= figure.y - FRONT_BELOW || bottom >= figure.y + FRONT_ABOVE) continue;
    if (turnsItsBack(box, figure, axes)) out.push(one);
  }
  return out;
}

/**
 * **Wie breit und hoch die Figur für `wallsCovering` ist**, in Metern: eine
 * halbe Schulterbreite zu jeder Seite, und Strahlen aus drei Höhen um ihre
 * Mitte — Beine, Bauch, Kopf.
 */
export const COVER_HALF_WIDTH = 0.3;
const COVER_HEIGHTS = [-0.6, 0, 0.6] as const;

/**
 * **Die Wände, die die Figur wirklich verdecken** — was gilt, wenn sie
 * **draußen** steht (`roomWalls.roomWallsToClear` gibt dann `null`).
 *
 * Gewünscht (September 2026): _„nicht aktiviert werden, wenn ich außerhalb
 * von Räumen bin, außer ich stehe direkt hinter der Wand."_ Vorher galt
 * draußen `wallsInFront`, und von einem Platz vor dem Haus aus wurde die ganze
 * Front durchsichtig, obwohl sie niemanden verdeckte.
 *
 * Also nur, was ganz auf der Kameraseite liegt (`wallsInFront`) **und** von
 * einem der Strahlen aus der Figur zur Kamera getroffen wird — aus drei Höhen
 * (`COVER_HEIGHTS`), mit dem Kasten um `COVER_HALF_WIDTH` verbreitert, damit
 * eine Wand, die nur eine Schulter abschneidet, auch zählt.
 */
export function wallsCovering<T extends GhostCandidate>(
  camera: GhostPoint,
  figure: GhostPoint,
  boxes: readonly T[],
  knee = GHOST_KNEE,
): T[] {
  return wallsInFront(camera, figure, boxes, knee).filter((one) => {
    const box = one.box;
    const slant = box.slant;
    if (slant) {
      // In die Schräge gedreht, dort ist sie ein gewöhnlicher Kasten.
      const local = (p: GhostPoint): GhostPoint => {
        const { along, across } = slantLocal(slant, p.x - box.x, p.z - box.z);
        return { x: along, y: p.y, z: across };
      };
      const wide = {
        x: 0,
        y: box.y,
        z: 0,
        w: slant.long + 2 * COVER_HALF_WIDTH,
        h: box.h,
        d: slant.thin + 2 * COVER_HALF_WIDTH,
      };
      const to = local(camera);
      return COVER_HEIGHTS.some((dy) =>
        segmentHits(local({ x: figure.x, y: figure.y + dy, z: figure.z }), to, wide),
      );
    }
    const wide = {
      ...box,
      w: box.w + 2 * COVER_HALF_WIDTH,
      d: box.d + 2 * COVER_HALF_WIDTH,
    };
    return COVER_HEIGHTS.some((dy) =>
      segmentHits({ x: figure.x, y: figure.y + dy, z: figure.z }, camera, wide),
    );
  });
}

/** Schneidet die Strecke von `from` nach `to` diesen Kasten? (Plattenverfahren) */
function segmentHits(from: GhostPoint, to: GhostPoint, box: GhostBox): boolean {
  let near = 0;
  let far = 1;
  const axes: [number, number, number, number][] = [
    [from.x, to.x - from.x, box.x, box.w],
    [from.y, to.y - from.y, box.y, box.h],
    [from.z, to.z - from.z, box.z, box.d],
  ];
  for (const [start, delta, centre, size] of axes) {
    const low = centre - size / 2;
    const high = centre + size / 2;
    if (Math.abs(delta) < 1e-9) {
      if (start < low || start > high) return false;
      continue;
    }
    const a = (low - start) / delta;
    const b = (high - start) / delta;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return false;
  }
  return true;
}

/**
 * **Ab welchem Anteil eine Achse zur Kamera zeigt** — der Sinus von 22,5°.
 * Gerade von Süden zeigt nur z zur Kamera; um 45° gedreht zeigen beide Achsen
 * gleich stark (je 0,71), und beide zählen.
 */
export const FACING = Math.sin(Math.PI / 8);

/**
 * **Welche Achsen zur Kamera zeigen**, von der Figur aus: je Achse +1 (die
 * Kamera steht auf der Plusseite), −1 oder 0 (die Achse läuft quer zum
 * Blick). Senkrecht darüber zeigt nichts — dann gilt nur z, wie ungedreht.
 */
export function facingAxes(
  camera: GhostPoint,
  figure: GhostPoint,
): { x: -1 | 0 | 1; z: -1 | 0 | 1 } {
  const dx = camera.x - figure.x;
  const dz = camera.z - figure.z;
  const length = Math.hypot(dx, dz);
  if (length < 1e-6) return { x: 0, z: 1 };
  const x = dx / length;
  const z = dz / length;
  return {
    x: x > FACING ? 1 : x < -FACING ? -1 : 0,
    z: z > FACING ? 1 : z < -FACING ? -1 : 0,
  };
}

/**
 * **Zeigt dieser Quader der Kamera seine andere Seite?**
 *
 * Er tut es, wenn er entlang einer Achse, die zur Kamera zeigt, **vollständig**
 * auf der Kameraseite der Figur liegt: Dann steht die Figur davor und die
 * Kamera dahinter. Reicht er an der Figur vorbei — eine Wand, die neben ihr
 * nach hinten weiterläuft —, sehen beide dieselbe Seite, und er bleibt stehen.
 */
function turnsItsBack(
  box: GhostBox,
  figure: GhostPoint,
  axes: { x: -1 | 0 | 1; z: -1 | 0 | 1 },
): boolean {
  if (axes.z > 0 && box.z - box.d / 2 >= figure.z) return true;
  if (axes.z < 0 && box.z + box.d / 2 <= figure.z) return true;
  if (axes.x > 0 && box.x - box.w / 2 >= figure.x) return true;
  if (axes.x < 0 && box.x + box.w / 2 <= figure.x) return true;
  return false;
}
