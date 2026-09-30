import {
  FRONT_ABOVE,
  FRONT_BELOW,
  GHOST_KNEE,
  blocksView,
  boxToCameraSouth,
  cameraQuarter,
  toCameraSouth,
  type GhostBox,
  type GhostCandidate,
  type GhostPoint,
} from './wallGhost';

/**
 * **Welche Wände des eigenen Raums weg dürfen** — _Durchsichtig_ und
 * _Abgeschnitten (Sims)_ (`GraphicsSettings.wallOcclusion`).
 *
 * Gewünscht (September 2026): _„nur alle Wände in diesem Raum … nimm den
 * obersten Punkt des Raumes aus Blickwinkel der Kamera, dann spanne eine
 * horizontale Linie. Diese Linie geht nach unten (wie bei Worms, wenn ein
 * Bombenangriff von oben kommt), alle diese getroffenen Wände brauchen nicht
 * angepasst werden. Alle anderen Wände eben Ghost oder Sims. … Wenn eine Wand
 * vertikal steht zur Kamera (wie die Wände links und rechts), dann brauchen
 * diese das nicht."_
 *
 * Also, alles in der Drehung, in der die Kamera im Süden steht
 * (`toCameraSouth`):
 *
 * 1. **Der Raum** ist, was die Figur zu Fuß erreicht, ohne durch eine Wand
 *    zu gehen: eine Flutfüllung auf einem Raster von `ROOM_CELL`, gesperrt
 *    von jedem Kasten der Etage, der jemanden verdecken kann. Türen aus dem
 *    Regal haben einen Kasten und schließen den Raum damit wie eine Wand
 *    (wie in `house/roomTrace.ts`). Läuft die Flut bis an den Rand
 *    (`ROOM_REACH`), steht die Figur draußen, und es gibt keinen Raum.
 * 2. **Die Bombenlinie** fällt von oben (Norden, weg von der Kamera) in den
 *    Raum; was sie in jeder Spalte zuerst trifft, ist eine **obere
 *    Außenwand** und bleibt. Das heißt für eine quer liegende Wand: Liegt
 *    nördlich von ihr kein Stück desselben Raums, trifft die Linie sie zuerst.
 *    Liegt dort Raum, ist sie eine Wand weiter unten — eine Front oder eine
 *    Zwischenwand — und wird durchsichtig bzw. abgeschnitten.
 * 3. **Seitenwände bleiben** — was längs zur Blickrichtung steht (tiefer als
 *    breit), verdeckt nichts, was man sehen will.
 *
 * Nur **Wände** zählen (`wallLike`): hoch und dünn. Ein Kühlschrank oder ein
 * Block von einem Meter sperrt die Flut, wird aber nie weggenommen.
 *
 * Reine Rechnung, ohne three.js — wie `wallGhost.ts`.
 */

/** Die Kantenlänge einer Rasterzelle, in Metern — dünner als jede Wand, die hier steht. */
export const ROOM_CELL = 0.25;

/** Wie weit die Flut höchstens läuft, in Metern je Richtung — weiter ist draußen. */
export const ROOM_REACH = 16;

/** Wie weit neben einer Wand noch nach Raum gesucht wird, in Zellen. */
const ROOM_PROBE = 3;

/** Die Raster werden jedes Bild gebraucht — einmal angelegt, danach wiederverwendet. */
const scratch = {
  blocked: new Uint8Array(0),
  reached: new Uint8Array(0),
  queue: new Int32Array(0),
};

/**
 * **Ist dieser Kasten eine Wand?** Hoch (mindestens 1,2 m) und dünn (höchstens
 * 0,6 m in einer Richtung). Ein Möbel ist das nicht und ein ganzer Block auch
 * nicht.
 */
export function wallLike(box: GhostBox): boolean {
  return box.h >= 1.2 && Math.min(box.w, box.d) <= 0.6;
}

/**
 * **Die Wände, die weg dürfen** — oder `null`, wenn die Figur in keinem Raum
 * steht (die Flut ist bis an den Rand gelaufen). Dann entscheidet der Aufrufer
 * selbst, was draußen gilt.
 */
export function roomWallsToClear<T extends GhostCandidate>(
  camera: GhostPoint,
  figure: GhostPoint,
  boxes: readonly T[],
  knee = GHOST_KNEE,
): T[] | null {
  const quarter = cameraQuarter(camera, figure);
  const aim = toCameraSouth(figure, quarter);
  const size = Math.ceil((2 * ROOM_REACH) / ROOM_CELL);
  const x0 = aim.x - ROOM_REACH;
  const z0 = aim.z - ROOM_REACH;
  const cells = size * size;
  if (scratch.blocked.length !== cells) {
    scratch.blocked = new Uint8Array(cells);
    scratch.reached = new Uint8Array(cells);
    scratch.queue = new Int32Array(cells);
  }
  const { blocked, reached, queue } = scratch;
  blocked.fill(0);
  reached.fill(0);
  const turned: { one: T; box: GhostBox }[] = [];

  for (const one of boxes) {
    if (!blocksView(one, knee)) continue;
    const top = one.box.y + one.box.h / 2;
    const bottom = one.box.y - one.box.h / 2;
    if (top <= figure.y - FRONT_BELOW || bottom >= figure.y + FRONT_ABOVE) continue;
    const box = quarter === 0 ? one.box : boxToCameraSouth(one.box, quarter);
    turned.push({ one, box });
    // Jede Zelle, die der Kasten auch nur berührt, ist zu.
    const ax = Math.max(0, Math.floor((box.x - box.w / 2 - x0) / ROOM_CELL));
    const bx = Math.min(size - 1, Math.floor((box.x + box.w / 2 - x0) / ROOM_CELL));
    const az = Math.max(0, Math.floor((box.z - box.d / 2 - z0) / ROOM_CELL));
    const bz = Math.min(size - 1, Math.floor((box.z + box.d / 2 - z0) / ROOM_CELL));
    for (let iz = az; iz <= bz; iz++) for (let ix = ax; ix <= bx; ix++) blocked[iz * size + ix] = 1;
  }

  // Die Flut, von der Zelle der Figur aus, in vier Richtungen.
  const start = Math.floor(size / 2) * size + Math.floor(size / 2);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  reached[start] = 1;
  while (head < tail) {
    const at = queue[head++]!;
    const ix = at % size;
    const iz = (at - ix) / size;
    if (ix === 0 || iz === 0 || ix === size - 1 || iz === size - 1) return null;
    for (let k = 0; k < 4; k++) {
      const next = k === 0 ? at - 1 : k === 1 ? at + 1 : k === 2 ? at - size : at + size;
      if (reached[next] || blocked[next]) continue;
      reached[next] = 1;
      queue[tail++] = next;
    }
  }

  const out: T[] = [];
  for (const { one, box } of turned) {
    if (!wallLike(box) || box.d > box.w) continue;
    // Die Zeilen direkt nördlich der Wand, über ihre ganze Breite.
    const ax = Math.max(0, Math.floor((box.x - box.w / 2 - x0) / ROOM_CELL));
    const bx = Math.min(size - 1, Math.floor((box.x + box.w / 2 - x0) / ROOM_CELL));
    const edge = Math.floor((box.z - box.d / 2 - z0) / ROOM_CELL);
    let below = false;
    for (let iz = edge - 1; iz >= edge - ROOM_PROBE && iz >= 0 && !below; iz--) {
      for (let ix = ax; ix <= bx; ix++) {
        if (reached[iz * size + ix]) {
          below = true;
          break;
        }
      }
    }
    if (below) out.push(one);
  }
  return out;
}
