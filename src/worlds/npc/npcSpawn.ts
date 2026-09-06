import type { Point } from './npcBrain';

/**
 * **Woher ein NPC kommt** — die zwei Antworten, die es darauf gibt, als reine
 * Rechnung.
 *
 * - Ein **Spawnpunkt** ist eine Stelle, an der jemand auftauchen *darf*. Es
 *   gibt beliebig viele davon, und wer einen braucht, bekommt einen
 *   ausgewürfelt — mit derselben Regel, nach der ein Spieler nach dem Tod
 *   wieder ins Spiel kommt: **möglichst nicht direkt vor der Nase dessen, der
 *   schon da ist**. Ein Zombie, der einem in den Rücken geboren wird, ist kein
 *   Schreck, sondern ein Fehler.
 * - Ein **Brutkäfig** ist eine Stelle, die von selbst nachlegt (das Vorbild
 *   steht in einem Verlies aus Klötzchen): er sieht nach, ob jemand nah genug
 *   ist, zählt seine eigenen Kinder und lässt in seinem Takt eines mehr aus
 *   dem Boden — im Ring um sich herum, nie in sich selbst.
 *
 * Kein three.js, keine Physik: hinein gehen Punkte in der Ebene und Sekunden,
 * heraus kommt „diese Stelle" oder „jetzt". Damit ist es prüfbar
 * (`npcSpawn.test.ts`), und die Welt macht daraus Körper.
 */

/** Wie ein Käfig arbeitet. */
export interface SpawnerConfig {
  /** Sekunden zwischen zwei Versuchen. */
  interval: number;
  /** Wie viele eigene Kinder gleichzeitig leben dürfen. */
  max: number;
  /** Wie nah jemand sein muss, damit er überhaupt läuft, in Metern. */
  range: number;
  /** Der Ring, in dem die Kinder entstehen, in Metern. */
  radius: number;
}

export const SPAWNER_DEFAULTS: SpawnerConfig = {
  interval: 6,
  max: 3,
  range: 24,
  radius: 1.6,
};

/** Was sich ein Käfig zwischen zwei Bildern merkt. */
export interface SpawnerState {
  /** Sekunden bis zum nächsten Versuch. */
  timer: number;
}

/**
 * Ein Bild eines Käfigs: `true` heißt „jetzt eines".
 *
 * Die Uhr läuft **nur, während jemand in Reichweite ist**. Ein Käfig am
 * anderen Ende der Halle soll nicht die ganze Zeit über Zombies auswerfen, die
 * dort niemand sieht — und wer zurückkommt, soll nicht in eine Wand aus
 * dreißig Stück laufen. Sie läuft auch dann nicht weiter, wenn der Käfig
 * schon voll ist: sonst spuckt er nach jedem Todesfall sofort nach.
 */
export function spawnerTick(
  state: SpawnerState,
  config: SpawnerConfig,
  dt: number,
  distance: number,
  alive: number,
): boolean {
  if (distance > config.range || alive >= config.max) {
    // Nicht zurücksetzen, nur anhalten: wer zurückkommt, wartet den Rest des
    // Takts ab und nicht einen ganzen neuen.
    return false;
  }
  state.timer -= dt;
  if (state.timer > 0) return false;
  state.timer = config.interval;
  return true;
}

/** Ein frischer Käfig — der erste Wurf kommt sofort. */
export function newSpawnerState(): SpawnerState {
  return { timer: 0 };
}

/**
 * Eine Stelle im Ring um einen Käfig. `turn` ist die Zahl aus [0,1), die den
 * Winkel wählt — die Kinder sollen sich nicht alle auf derselben Seite
 * stapeln.
 */
export function ringPoint(center: Point, radius: number, turn: number): Point {
  const angle = turn * Math.PI * 2;
  return { x: center.x + Math.cos(angle) * radius, z: center.z + Math.sin(angle) * radius };
}

/**
 * Der Spawnpunkt, an dem der Nächste auftaucht — oder `-1`, wenn es keinen
 * gibt.
 *
 * Gesucht wird unter denen, die **weit genug** vom Spieler weg sind; unter
 * denen entscheidet der Wurf. Taugt keiner, wird nicht aufgegeben, sondern der
 * **entfernteste** genommen: „nicht ideal" ist immer noch besser als „gar
 * nicht", und in einem kleinen Raum ist gar keiner weit genug weg.
 */
export function pickSpawnPoint(
  points: readonly Point[],
  player: Point | null,
  minDistance: number,
  turn: number,
): number {
  if (points.length === 0) return -1;
  if (!player) return Math.min(points.length - 1, Math.floor(turn * points.length));

  const far: number[] = [];
  let best = 0;
  let bestRange = -1;
  for (let i = 0; i < points.length; i++) {
    const point = points[i]!;
    const range = Math.hypot(point.x - player.x, point.z - player.z);
    if (range >= minDistance) far.push(i);
    if (range > bestRange) {
      bestRange = range;
      best = i;
    }
  }
  if (far.length === 0) return best;
  return far[Math.min(far.length - 1, Math.floor(turn * far.length))]!;
}
