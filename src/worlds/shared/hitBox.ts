/**
 * **Eine Strecke gegen einen Kasten oder eine Kugel** — die Rechnung, mit der
 * in diesem Projekt getroffen wird.
 *
 * Sie stand zweimal da: einmal für die Trefferzonen der NPCs
 * (`npc/npcHit.ts`) und einmal, mit `THREE.Box3` und einem Strahl, für die
 * beiden Schalter des Schießstands. Zweimal dieselbe Frage, zweimal eine
 * andere Antwort — und die zweite war die schlechtere: Ein `Ray` gegen eine
 * `Box3` sagt, *ob* der Strahl trifft, nicht ob die **Strecke** es tut; die
 * Länge musste hinterher von Hand nachgeprüft werden, und genau dort steckte
 * der Fehler, den niemand gesucht hätte.
 *
 * **Warum überhaupt eine Strecke.** Eine Kugel legt zwischen zwei Bildern
 * Meter zurück: bei 120 m/s sind es zwei. Wer ihre *Position* prüft, verpasst
 * alles, wodurch sie in diesem Bild hindurchgeflogen ist — und das ist bei
 * einem Ziel von 40 cm die Regel und nicht die Ausnahme.
 *
 * Ohne three.js, damit die Rechnung geprüft ist, bevor irgendwo eine Geometrie
 * entsteht.
 */

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/** Ein achsenparalleler Kasten: Mitte und halbe Kantenlängen. */
export interface HitBox {
  center: Point3;
  half: Point3;
}

const AXES = ['x', 'y', 'z'] as const;

/**
 * Die Strecke gegen einen **achsenparallelen Kasten** — das Scheibenverfahren:
 * Für jede der drei Achsen bleibt das Stück der Strecke übrig, das zwischen
 * den beiden Wänden dieser Achse liegt; bleibt am Ende nichts übrig, geht sie
 * vorbei.
 *
 * Achsenparallel geht nur, weil vorher gedreht wurde (`npcHit.ts`: `toLocal`):
 * Ein Kasten, den man mitdrehen müsste, hätte acht Ecken und drei
 * Sonderfälle; ein gedrehter Strahl hat sechs Zeilen.
 */
export function segmentHitsBox(from: Point3, to: Point3, box: HitBox): boolean {
  let t0 = 0;
  let t1 = 1;
  for (const axis of AXES) {
    const start = from[axis];
    const delta = to[axis] - start;
    const min = box.center[axis] - box.half[axis];
    const max = box.center[axis] + box.half[axis];
    if (Math.abs(delta) < 1e-9) {
      // Parallel zu dieser Scheibe: entweder liegt sie ganz darin oder gar nicht.
      if (start < min || start > max) return false;
      continue;
    }
    const enter = (min - start) / delta;
    const leave = (max - start) / delta;
    t0 = Math.max(t0, Math.min(enter, leave));
    t1 = Math.min(t1, Math.max(enter, leave));
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * Dasselbe für einen Kasten, der als Ecken vorliegt — so, wie `THREE.Box3` ihn
 * herausgibt.
 *
 * Der Umweg über Mitte und Halbmaß ist derselbe, den man sonst an jeder
 * Aufrufstelle von Hand schreibt, und man schreibt ihn irgendwann mit einem
 * `/ 2` zu wenig.
 */
export function segmentHitsBounds(from: Point3, to: Point3, min: Point3, max: Point3): boolean {
  return segmentHitsBox(from, to, {
    center: { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 },
    half: { x: (max.x - min.x) / 2, y: (max.y - min.y) / 2, z: (max.z - min.z) / 2 },
  });
}

/** Der kleinste Abstand eines Punktes zur Strecke, im Quadrat. */
export function distanceToSegmentSq(from: Point3, to: Point3, point: Point3): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const lengthSq = dx * dx + dy * dy + dz * dz;
  let t = 0;
  if (lengthSq > 1e-12) {
    t = ((point.x - from.x) * dx + (point.y - from.y) * dy + (point.z - from.z) * dz) / lengthSq;
    t = Math.min(1, Math.max(0, t));
  }
  const cx = from.x + dx * t - point.x;
  const cy = from.y + dy * t - point.y;
  const cz = from.z + dz * t - point.z;
  return cx * cx + cy * cy + cz * cz;
}

export function segmentHitsSphere(
  from: Point3,
  to: Point3,
  center: Point3,
  radius: number,
): boolean {
  return distanceToSegmentSq(from, to, center) <= radius * radius;
}
