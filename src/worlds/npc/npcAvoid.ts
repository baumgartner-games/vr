/**
 * **Ausweichen** — das Kleinste, was zwei NPCs auf demselben Weg brauchen.
 *
 * Die Wegsuche kennt nur Wände, Kisten und Türen; ein anderer NPC steht in
 * keiner Karte. Treffen sich zwei im Gang, schieben sich ihre Zylinder
 * gegeneinander, bis einer zufällig abrutscht — und der Zuschauer sieht zwei
 * Figuren, die sich minutenlang anrempeln. Ein ausgewachsenes lokales
 * Ausweichen (RVO) steht weiter auf der Liste (`docs/agents/npcs.md`); bis
 * dahin reicht eine Verkehrsregel, und die ist alt: **rechts ausweichen, und
 * wer steht, hat Vorrang.**
 *
 * `sidestep` fragt, ob jemand **vor** einem steht (in einem Kegel in
 * Laufrichtung, näher als `radius`), und schlägt dann einen Punkt schräg
 * rechts davor vor — ein kurzer Umweg, nach dem der Läufer wieder seinen Weg
 * nimmt. Wer steht, weicht nicht aus, sondern wartet, dass der andere es tut;
 * sonst tanzen zwei, die sich gegenüberstehen, im Gleichtakt nach links und
 * rechts.
 *
 * Reine Rechnung (`npcAvoid.test.ts`), dieselbe Richtungskonvention wie das
 * Hirn: Gierwinkel 0 schaut nach −Z.
 */

export interface Mover {
  x: number;
  z: number;
  /** Wohin er gerade geht (Einheitsvektor oder null, wenn er steht). */
  heading: { x: number; z: number } | null;
}

/** Ab welcher Entfernung ein anderer im Weg steht, in Metern. */
export const AVOID_RADIUS = 1.1;
/** Wie weit der Ausweichpunkt zur Seite liegt. */
export const AVOID_SIDE = 0.8;
/** Und wie weit nach vorn. */
export const AVOID_AHEAD = 0.9;
/** Der halbe Öffnungswinkel des Kegels „vor mir", als Kosinus (≈ 50°). */
const AHEAD_COS = 0.64;

/**
 * Ein Ausweichpunkt, oder `null`, wenn niemand im Weg steht (oder man selbst
 * gar nicht läuft).
 */
export function sidestep(
  self: Mover,
  others: readonly Mover[],
  radius = AVOID_RADIUS,
): { x: number; z: number } | null {
  const heading = self.heading;
  if (!heading) return null;
  let nearest = Infinity;
  for (const other of others) {
    const dx = other.x - self.x;
    const dz = other.z - self.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 1e-6 || distance > radius) continue;
    const ahead = (dx * heading.x + dz * heading.z) / distance;
    if (ahead < AHEAD_COS) continue;
    nearest = Math.min(nearest, distance);
  }
  if (!Number.isFinite(nearest)) return null;
  // Rechts von der Laufrichtung: (−z, x) dreht (x, z) in der Draufsicht um
  // 90° im Uhrzeigersinn — mit −Z als vorn ist das die rechte Hand.
  const right = { x: -heading.z, z: heading.x };
  return {
    x: self.x + heading.x * AVOID_AHEAD + right.x * AVOID_SIDE,
    z: self.z + heading.z * AVOID_AHEAD + right.z * AVOID_SIDE,
  };
}

/**
 * **Abstand halten** — ein Schub weg von allen, die näher sind als `radius`,
 * stärker, je näher. Für Stehende (in der Schlange, vor der Bank), die sonst
 * genau aufeinander warten würden. Zurück kommt ein Versatz in Metern.
 */
export function separation(
  self: { x: number; z: number },
  others: readonly { x: number; z: number }[],
  radius = 0.7,
): { x: number; z: number } {
  let x = 0;
  let z = 0;
  for (const other of others) {
    const dx = self.x - other.x;
    const dz = self.z - other.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 1e-6 || distance >= radius) continue;
    const push = (radius - distance) / radius;
    x += (dx / distance) * push;
    z += (dz / distance) * push;
  }
  return { x, z };
}
