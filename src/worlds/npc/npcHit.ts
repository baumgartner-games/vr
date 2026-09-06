/**
 * **Wo ein Schuss einen NPC trifft** — und was das kostet.
 *
 * Eine Kugel legt zwischen zwei Bildern Meter zurück; was sie durchquert hat,
 * ist eine **Strecke** und kein Punkt. Genau so rechnet der Schießstand seine
 * Treffer ab (`PortalWorld.bulletTravelled`), und genau so rechnet es hier
 * weiter: Strecke gegen Körper, nicht Kugel gegen Körper.
 *
 * Der Körper ist dabei zwei Sachen, und beide sind **drehsymmetrisch um die
 * Hochachse**: ein **Zylinder** für den Rumpf und eine **Kugel** für den Kopf.
 * Das ist keine Bequemlichkeit, sondern der Grund, warum es stimmt: ein NPC
 * dreht sich um seine Y-Achse, und ein Kasten müsste bei jedem Schuss
 * mitgedreht werden — ein Zylinder sieht von jeder Seite gleich aus. Ein
 * Kopftreffer ist einer, wo der Kopf ist, egal wohin der Kopf gerade schaut.
 *
 * Kein three.js: Punkte hinein, ein Wort heraus (`npcHit.test.ts`).
 */

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/** Der Körper, wie ihn eine Kugel sieht: Standfläche, Höhe, Radius. */
export interface HitBody {
  /** Die Füße — der Ursprung, an dem ein NPC in der Welt steht. */
  feet: Point3;
  /** Kopf bis Fuß, in Metern. */
  height: number;
  /** Der Radius des Rumpfs, in Metern. */
  radius: number;
}

export type HitZone = 'head' | 'body';

/**
 * Wie groß der Kopf ist, gemessen an der Körperhöhe.
 *
 * Die Zahl steht **hier** und nicht im Modell, obwohl das Modell sie zeichnet
 * (`NpcBody.ts` liest sie von hier): eine Trefferzone, die woanders sitzt als
 * der Kopf, den man sieht, ist der Fehler, den niemand findet — man zielt auf
 * die Stirn und trifft die Luft darüber.
 */
export const HEAD_SHARE = 0.1;

/**
 * **Was ein Treffer kostet, wenn die Waffe nichts eigenes sagt.**
 *
 * Hier stand einmal eine feste Zahl je Zone — 34 in den Rumpf, 100 in den
 * Kopf —, und das hieß: Ein Messer tut genauso weh wie ein Gewehr, weil die
 * Zone die ganze Rechnung war. Jetzt bringt **die Waffe** ihre Zahl mit
 * (`weaponSettings.ts` für die Pistole, `Tool.meleeDamage` für alles, was
 * zuschlägt), und die Zone ist nur noch der Faktor darauf.
 *
 * Diese Zahl ist der Rückfall für alles, was keine mitbringt.
 */
export const BODY_DAMAGE = 25;

/**
 * **Ein Kopftreffer wiegt vier Rumpftreffer.**
 *
 * Die Zahl ist nicht gewürfelt, sondern die Antwort auf eine Frage, die man
 * in der Brille stellt: Wie viele Schuss braucht ein Zombie? Ein Zombie hat
 * hundert Leben (`npcKinds.ts`), die Pistole macht fünfundzwanzig — also vier
 * in den Rumpf **oder einer in den Kopf**. Genau das ist die Regel, die man
 * nach dem dritten Schuss von selbst begriffen hat.
 */
export const HEAD_FACTOR = 4;

/** Was ein Kopftreffer mit der Waffe kostet, die nichts eigenes sagt. */
export const HEAD_DAMAGE = BODY_DAMAGE * HEAD_FACTOR;

/**
 * Was ein Treffer abzieht: die Zahl der Waffe, im Kopf vervierfacht.
 *
 * @param base was diese Waffe an einem Rumpftreffer kostet.
 */
export function damageFor(zone: HitZone, base: number = BODY_DAMAGE): number {
  return zone === 'head' ? base * HEAD_FACTOR : base;
}

/** Wo der Kopf sitzt: seine Mitte und sein Radius. */
export function headOf(body: HitBody): { center: Point3; radius: number } {
  const radius = body.height * HEAD_SHARE;
  return {
    center: { x: body.feet.x, y: body.feet.y + body.height - radius, z: body.feet.z },
    radius,
  };
}

/**
 * Welche Zone die Strecke `from → to` trifft — `null`, wenn sie vorbeigeht.
 *
 * Der Kopf zuerst: er steckt oben im Rumpfzylinder, und wer beide fragt und
 * dann den Rumpf nimmt, hat den Kopfschuss verschenkt.
 */
export function hitZone(from: Point3, to: Point3, body: HitBody): HitZone | null {
  const head = headOf(body);
  if (segmentHitsSphere(from, to, head.center, head.radius)) return 'head';
  // Der Rumpf reicht von knapp über dem Boden bis unter den Kopf: Füße sind
  // keine Trefferzone, dort geht ein Schuss durch.
  const top = body.feet.y + body.height - head.radius * 2;
  const bottom = body.feet.y + body.height * 0.08;
  if (segmentHitsColumn(from, to, body.feet, body.radius, bottom, top)) return 'body';
  return null;
}

/** Die kürzeste Entfernung von `point` zur Strecke `from → to`, quadriert. */
function distanceToSegmentSq(from: Point3, to: Point3, point: Point3): number {
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

/**
 * Die Strecke gegen einen **stehenden Zylinder**: erst auf das Höhenband
 * beschnitten, dann in der Ebene gegen den Kreis gemessen. Wer beides in einem
 * Rutsch rechnet, hat eine quadratische Gleichung und drei Sonderfälle; so
 * sind es zwei Zeilen, die man noch lesen kann.
 */
export function segmentHitsColumn(
  from: Point3,
  to: Point3,
  axis: { x: number; z: number },
  radius: number,
  bottom: number,
  top: number,
): boolean {
  let t0 = 0;
  let t1 = 1;
  const dy = to.y - from.y;
  if (Math.abs(dy) < 1e-9) {
    if (from.y < bottom || from.y > top) return false;
  } else {
    const enter = (bottom - from.y) / dy;
    const leave = (top - from.y) / dy;
    t0 = Math.max(0, Math.min(enter, leave));
    t1 = Math.min(1, Math.max(enter, leave));
    if (t0 > t1) return false;
  }

  const ax = from.x + (to.x - from.x) * t0;
  const az = from.z + (to.z - from.z) * t0;
  const bx = from.x + (to.x - from.x) * t1;
  const bz = from.z + (to.z - from.z) * t1;
  return (
    distanceToSegmentSq(
      { x: ax, y: 0, z: az },
      { x: bx, y: 0, z: bz },
      { x: axis.x, y: 0, z: axis.z },
    ) <=
    radius * radius
  );
}
