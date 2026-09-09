/**
 * **Schnurzug über einen Rasterweg** — aus der Treppe wird eine Gerade.
 *
 * Der A* in `stationNavigation.ts` läuft auf einem Raster mit vier Nachbarn
 * (0,25 m). Ein Weg schräg durch einen Raum ist dort eine Treppe aus lauter
 * kleinen Ecken, und jede Ecke bekommt vom Kurvenschleifer noch drei bis zehn
 * Stützpunkte: Was in Wahrheit eine Diagonale von acht Metern ist, kommt als
 * zweihundert Wegpunkte an, und das Monster wackelt sie alle ab.
 *
 * Hier wird die Schnur gezogen: Vom Anker aus wird der **entfernteste**
 * Wegpunkt gesucht, den eine gerade Strecke noch erreicht, ohne anzustoßen;
 * alles dazwischen fällt weg. Wo keine Gerade geht — durch eine Tür, an einem
 * Schrank vorbei —, bleiben die Rasterpunkte stehen, und die sind vom A*
 * schon geprüft. Der Weg wird dadurch nie länger und nie enger als vorher.
 *
 * **Warum Sichtlinie und nicht Trichter** (Funnel/String-Pulling über
 * Portale): Der Trichter braucht eine Folge konvexer Polygone mit gemeinsamen
 * Kanten. Die Räume der Station sind zwar Rechtecke, aber mit Schränken,
 * Konsolen und Fracht darin, also nicht konvex frei — und die Wegsuche selbst
 * kennt nur ein Raster und Quader (`routeBlocked`). Zu dieser Datenstruktur
 * passt der Strahl gegen dieselben Quader; ein Portalnetz daneben wäre eine
 * zweite Geometrie, die man mit der ersten in Deckung halten müsste.
 *
 * **Abstand.** Wer die Strecke prüft, gibt die Prüfung mit (`SegmentClear`).
 * `stationRoute` prüft zuerst mit dem Radius der Wegsuche **plus**
 * `SMOOTH_MARGIN`: Eine Abkürzung darf zuerst nur, wo noch Luft ist. Was
 * danach als Rasterkette übrig ist — der Lauf durch eine 1,2 m breite Tür, die
 * Gasse zwischen zwei Schränken —, wird in einem zweiten Durchgang mit dem
 * Radius allein gezogen (`PullOptions.tight`): dort war der Rasterweg auch
 * nicht weiter von der Wand weg, und eine Treppe an dieser Stelle ist genau
 * das Wackeln, das man im Headset sieht.
 */

/** Ein Punkt in Metern auf dem Boden — dieselbe Form wie `FloorPoint` und `MapPoint`. */
export interface NavPoint {
  readonly x: number;
  readonly z: number;
}

/** Ob die gerade Strecke von `from` nach `to` frei ist — samt Abstand. */
export type SegmentClear = (from: NavPoint, to: NavPoint) => boolean;

/**
 * Wie viel Luft eine Abkürzung zusätzlich zum Radius der Wegsuche braucht, in
 * Metern. Ein Zehntel: Ein Weg, der eine Ecke mit genau dem Radius streift,
 * ist rechnerisch frei und sieht im Headset aus, als ginge das Monster durch
 * die Wand. Mehr, und keine Abkürzung käme mehr an einer Konsole vorbei.
 */
export const SMOOTH_MARGIN = 0.1;

/**
 * Wie viele **nicht** erreichbare Wegpunkte hinter dem letzten erreichbaren
 * noch probiert werden, bevor der Anker weiterrückt. Sichtbarkeit ist nicht
 * monoton — ein Punkt hinter der Ecke ist verdeckt, der übernächste in der
 * Raummitte nicht —, aber weit dahinter zu suchen kostet bei zweihundert
 * Treppenstufen mehr, als es bringt.
 */
export const LOOKAHEAD = 4;

/** Was der Schnurzug außer der Streckenprüfung noch wissen darf. */
export interface PullOptions {
  /** Wie viele verdeckte Punkte hinter dem letzten sichtbaren probiert werden; `LOOKAHEAD`. */
  lookahead?: number;
  /**
   * Die Prüfung **ohne** Spielraum — mit dem Radius, mit dem auch die
   * Rasterpunkte gültig sind. Sie kommt nur an die Stücke, die der erste
   * Durchgang als Rasterkette stehen ließ (Türlauf, Gasse zwischen zwei
   * Schränken, Gang mit versetzten Türen), und zieht dort die Treppe gerade,
   * wo mit Spielraum keine Gerade hindurchpasst. Eine Abkürzung, die der
   * erste Durchgang **mit** Spielraum gesetzt hat, bleibt: Sie wird nicht
   * hinterher wieder enger gezogen.
   */
  tight?: SegmentClear;
}

/**
 * Zieht die Schnur: gibt eine Teilfolge von `points` zurück, die mit demselben
 * letzten Punkt endet, bei der jede eingesetzte Gerade `clear` (oder, in den
 * Rasterketten, `tight`) bestanden hat und die Strecken zwischen
 * **benachbarten** Originalpunkten unverändert bleiben (die hat die Wegsuche
 * schon geprüft).
 */
export function pullString(
  from: NavPoint,
  points: readonly NavPoint[],
  clear: SegmentClear,
  options: PullOptions = {},
): NavPoint[] {
  const lookahead = options.lookahead ?? LOOKAHEAD;
  if (points.length < 2) return [...points];
  const kept = pull(from, points, clear, lookahead);
  if (!options.tight) return kept.map((index) => points[index]!);
  const result: NavPoint[] = [];
  let i = 0;
  while (i < kept.length) {
    // Eine Kette: Punkte, die noch über ihr Rasterstück am Vorgänger hängen.
    const linked = (at: number): boolean =>
      at === 0 ? kept[0] === 0 : kept[at] === kept[at - 1]! + 1;
    if (!linked(i)) {
      result.push(points[kept[i]!]!);
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < kept.length && linked(j + 1)) j++;
    const anchor = result[result.length - 1] ?? from;
    const chain = kept.slice(i, j + 1).map((index) => points[index]!);
    result.push(...pull(anchor, chain, options.tight, lookahead).map((index) => chain[index]!));
    i = j + 1;
  }
  return result;
}

/** Der eigentliche Zug: welche Indizes von `points` stehen bleiben. */
function pull(
  from: NavPoint,
  points: readonly NavPoint[],
  clear: SegmentClear,
  lookahead: number,
): number[] {
  const kept: number[] = [];
  let anchor: NavPoint = from;
  let index = 0;
  while (index < points.length) {
    let far = index;
    // So weit wie möglich vorrücken — mit ein paar Blicken über die Ecke.
    let probe = index + 1;
    let misses = 0;
    while (probe < points.length && misses <= lookahead) {
      if (clear(anchor, points[probe]!)) {
        far = probe;
        misses = 0;
      } else misses++;
      probe++;
    }
    anchor = points[far]!;
    kept.push(far);
    index = far + 1;
  }
  return kept;
}

/** Die Länge des Wegs, in Metern. */
export function pathLength(from: NavPoint, points: readonly NavPoint[]): number {
  let sum = 0;
  let previous = from;
  for (const point of points) {
    sum += Math.hypot(point.x - previous.x, point.z - previous.z);
    previous = point;
  }
  return sum;
}

/**
 * Wie viel der Weg insgesamt **dreht**, in Bogenmaß — die Summe aller
 * Richtungswechsel. Eine Treppe aus Viertelmetern dreht an jeder Stufe um
 * neunzig Grad, die Diagonale daneben gar nicht: Das ist das Maß für Zickzack,
 * das die bloße Länge nicht zeigt.
 */
export function totalTurn(from: NavPoint, points: readonly NavPoint[]): number {
  let turn = 0;
  let previous = from;
  for (let i = 0; i < points.length - 1; i++) {
    const at = points[i]!,
      next = points[i + 1]!;
    const ax = at.x - previous.x,
      az = at.z - previous.z,
      bx = next.x - at.x,
      bz = next.z - at.z;
    const la = Math.hypot(ax, az),
      lb = Math.hypot(bx, bz);
    if (la > 1e-9 && lb > 1e-9)
      turn += Math.acos(Math.max(-1, Math.min(1, (ax * bx + az * bz) / (la * lb))));
    previous = at;
  }
  return turn;
}
