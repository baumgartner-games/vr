import { segmentHitsBox, segmentHitsSphere, type HitBox, type Point3 } from '../shared/hitBox';

/**
 * **Wo ein Schuss einen NPC trifft** — und was das kostet.
 *
 * Eine Kugel legt zwischen zwei Bildern Meter zurück; was sie durchquert hat,
 * ist eine **Strecke** und kein Punkt. Genau so rechnet der Schießstand seine
 * Treffer ab (`PortalWorld.bulletTravelled`), und genau so rechnet es hier
 * weiter: Strecke gegen Körper, nicht Kugel gegen Körper.
 *
 * **Der Körper ist das, was man sieht.** Hier stand einmal ein Zylinder um die
 * Hochachse, weil der sich nicht mitdrehen muss — bequem, aber falsch: Sein
 * Halbmesser ist der des Colliders (29 cm beim Zombie), und der ist so breit
 * wie die Schultern *und* so tief wie die Schultern breit sind. Man traf
 * damit eine Handbreit neben dem Arm noch die Luft als „Rumpf" und hielt
 * daneben für getroffen. Jetzt sind es die drei Teile, aus denen das Modell
 * gebaut ist (`NpcBody.ts`) — **Kopfkugel, Rumpfkasten, Beinkasten** —, und
 * ihre Maße stehen hier (`bodyShape`), damit gezeichnete und getroffene Form
 * dieselbe Zahl lesen. Wer sie sehen will, schaltet sie ein: dieselben Kästen
 * als Drahtgitter (`NpcBody.setHitView`).
 *
 * Die beiden Kästen drehen sich mit ihm, und deshalb bringt ein Treffer seinen
 * **Gierwinkel** mit (`HitBody.yaw`): Gerechnet wird nicht der Kasten in der
 * Welt, sondern die Strecke in *seinen* Maßen — einmal gedreht statt achtmal
 * geprüft.
 *
 * Kein three.js: Punkte hinein, ein Wort heraus (`npcHit.test.ts`).
 */

/**
 * Punkt, Kasten und die beiden Streckenrechnungen wohnen in
 * `shared/hitBox.ts` — dieselbe Frage stellt auch der Schießstand, und sie
 * zweimal zu beantworten hieß, zwei verschiedene Antworten zu haben.
 */
export type { Point3, HitBox };
export { segmentHitsBox, segmentHitsSphere };

/** Der Körper, wie ihn eine Kugel sieht: Standfläche, Höhe, Radius, Blick. */
export interface HitBody {
  /** Die Füße — der Ursprung, an dem ein NPC in der Welt steht. */
  feet: Point3;
  /** Kopf bis Fuß, in Metern. */
  height: number;
  /** Der Radius seines Colliders, in Metern — daraus folgen Breite und Tiefe. */
  radius: number;
  /** Wohin er schaut, in Bogenmaß — dasselbe `rotation.y` wie am Modell. */
  yaw?: number;
}

export type HitZone = 'head' | 'body';

/**
 * Die Kästen hier sind welche in **ihren eigenen** Maßen: Ursprung zwischen
 * den Füßen, −Z ist vorne, und der ganze Kasten dreht sich mit dem NPC
 * (`toLocal`). Deshalb genügt drüben die achsenparallele Rechnung.
 */

/** Die drei Teile, aus denen ein Treffer wird. */
export interface HitParts {
  head: { center: Point3; radius: number };
  torso: HitBox;
  legs: HitBox;
}

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
 * **Die Maße eines Körpers, an einer Stelle.**
 *
 * Beide Seiten lesen sie: das Modell baut daraus seine Klötze
 * (`NpcBody.ts`), die Trefferabfrage ihre Kästen. Solange es *eine* Rechnung
 * ist, kann die Hitbox nicht neben dem stehen, was man sieht — und genau das
 * ist hier schon einmal passiert.
 *
 * Alles hängt an der Körperhöhe und am Collider-Halbmesser: eine Haut, die
 * morgen 1,40 m groß ist, ist dann ein Kind und kein zerquetschter Erwachsener.
 */
export function bodyShape(
  height: number,
  radius: number,
): {
  /** Wo die Beine aufhören und der Rumpf anfängt. */
  hip: number;
  /** Wo der Rumpf aufhört und die Schultern sitzen. */
  shoulder: number;
  /** Schulterbreite. */
  width: number;
  /** Tiefe des Rumpfs (Brust nach Rücken). */
  depth: number;
  /** Tiefe eines Beins. */
  legDepth: number;
  /** Wie weit die Beine zusammen in die Breite gehen. */
  legWidth: number;
  /** Länge eines Arms, vom Schultergelenk. */
  armLength: number;
  headRadius: number;
} {
  const width = radius * 1.55;
  return {
    hip: height * 0.47,
    shoulder: height * 0.8,
    width,
    depth: radius * 1.05,
    legDepth: radius * 0.72,
    // Zwei Klötze auf ±width/4, jeder width*0.34 breit: außen also 0,42 · Breite.
    legWidth: width * 0.84,
    armLength: height * 0.34,
    headRadius: height * HEAD_SHARE,
  };
}

/**
 * Ab welcher Höhe der Beinkasten anfängt, als Anteil der Körperhöhe.
 *
 * Füße sind keine Trefferzone: Ein Schuss, der über den Boden streift, geht
 * hindurch — sonst zählt jeder Querschläger am Boden als Beinschuss.
 */
const FOOT_SHARE = 0.08;

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

/**
 * Wo der Kopf sitzt: seine Mitte und sein Radius — in **Weltmaßen**.
 *
 * Er sitzt auf der Hochachse, und deshalb ist er der eine Teil, den keine
 * Drehung verschiebt: ein Kopfschuss ist einer, wo der Kopf ist, egal wohin
 * der Kopf gerade schaut.
 */
export function headOf(body: HitBody): { center: Point3; radius: number } {
  const radius = body.height * HEAD_SHARE;
  return {
    center: { x: body.feet.x, y: body.feet.y + body.height - radius, z: body.feet.z },
    radius,
  };
}

/**
 * **Die drei Teile, in seinen eigenen Maßen** — Ursprung zwischen den Füßen,
 * −Z vorne, ungedreht.
 *
 * Genau so zeichnet das Modell sie auch (`NpcBody.setHitView`): Es hängt sie
 * als Drahtgitter an dieselben Stellen, und weil es dieselbe Funktion fragt,
 * kann gezeichnet und getroffen nicht auseinanderlaufen.
 */
export function hitParts(body: HitBody): HitParts {
  const shape = bodyShape(body.height, body.radius);
  const legBottom = body.height * FOOT_SHARE;
  return {
    head: {
      center: { x: 0, y: body.height - shape.headRadius, z: 0 },
      radius: shape.headRadius,
    },
    torso: {
      half: { x: shape.width / 2, y: (shape.shoulder - shape.hip) / 2, z: shape.depth / 2 },
      center: { x: 0, y: (shape.hip + shape.shoulder) / 2, z: 0 },
    },
    legs: {
      half: { x: shape.legWidth / 2, y: (shape.hip - legBottom) / 2, z: shape.legDepth / 2 },
      center: { x: 0, y: (shape.hip + legBottom) / 2, z: 0 },
    },
  };
}

/**
 * Welche Zone die Strecke `from → to` trifft — `null`, wenn sie vorbeigeht.
 *
 * Der Kopf zuerst: er sitzt über dem Rumpf, aber eine Strecke von schräg oben
 * schneidet beide — und wer beide fragt und dann den Rumpf nimmt, hat den
 * Kopfschuss verschenkt.
 */
export function hitZone(from: Point3, to: Point3, body: HitBody): HitZone | null {
  const parts = hitParts(body);
  const a = toLocal(from, body);
  const b = toLocal(to, body);
  if (segmentHitsSphere(a, b, parts.head.center, parts.head.radius)) return 'head';
  if (segmentHitsBox(a, b, parts.torso) || segmentHitsBox(a, b, parts.legs)) return 'body';
  return null;
}

/**
 * Ein Punkt der Welt in seinen Maßen: erst die Füße abziehen, dann um seinen
 * Gierwinkel zurückdrehen.
 */
function toLocal(point: Point3, body: HitBody): Point3 {
  const dx = point.x - body.feet.x;
  const dz = point.z - body.feet.z;
  const yaw = body.yaw ?? 0;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return {
    x: dx * cos - dz * sin,
    y: point.y - body.feet.y,
    z: dx * sin + dz * cos,
  };
}
