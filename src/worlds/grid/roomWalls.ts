import {
  FACING,
  FRONT_ABOVE,
  FRONT_BELOW,
  GHOST_KNEE,
  blocksView,
  facingAxes,
  slantLocal,
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
 * Also, von der Kamera aus gesehen (`facingAxes`: welche Achsen zu ihr
 * zeigen — eine, wenn das Bild gerade steht, zwei, wenn es um 45° gedreht
 * ist):
 *
 * 1. **Der Raum** ist, was die Figur zu Fuß erreicht, ohne durch eine Wand
 *    zu gehen: eine Flutfüllung auf einem Raster von `ROOM_CELL`, gesperrt
 *    von jedem Kasten der Etage, der jemanden verdecken kann. Türen aus dem
 *    Regal haben einen Kasten und schließen den Raum damit wie eine Wand
 *    (wie in `house/roomTrace.ts`). Eine Decke über dem Kopf sperrt nicht
 *    (`lidLike`). Läuft die Flut bis an den Rand
 *    (`ROOM_REACH`), steht die Figur draußen, und es gibt keinen Raum.
 * 2. **Die Bombenlinie** fällt von oben (weg von der Kamera) in den Raum;
 *    was sie zuerst trifft, ist eine **obere Außenwand** und bleibt. Das
 *    heißt für eine Wand, die der Kamera ihre Fläche zeigt: Liegt auf ihrer
 *    abgewandten Seite kein Stück desselben Raums, trifft die Linie sie
 *    zuerst. Liegt dort Raum, ist sie eine Wand weiter unten — eine Front
 *    oder eine Zwischenwand — und wird durchsichtig bzw. abgeschnitten.
 *    Schräg von Südosten sind das die Wände im Süden **und** im Osten.
 * 3. **Seitenwände bleiben** — was längs zur Blickrichtung steht, verdeckt
 *    nichts, was man sehen will. Bei gerader Sicht von Süden sind das alle
 *    Wände, die von Nord nach Süd laufen; schräg gibt es keine.
 *
 * **Schrägen** (eine Wand unter 45°, `GhostBox.slant`) gehen dieselben drei
 * Schritte, nur mit ihrer eigenen Richtung: Die Flut hält an einem schrägen
 * Band an und nicht an der quadratischen Hülle, und ob die Schräge der Kamera
 * ihre Fläche zeigt und auf ihrer abgewandten Seite Raum liegt, wird quer zu
 * ihr gefragt. Von Süden gehen so die Ecken unten weg und die oben bleiben;
 * um 45° gedreht steht eine Schräge gerade vor der Kamera — und die anderen
 * beiden sind Seitenwände.
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
  if (box.slant) return box.h >= 1.2 && box.slant.thin <= 0.6;
  return box.h >= 1.2 && Math.min(box.w, box.d) <= 0.6;
}

/**
 * **Wie hoch über der Mitte der Figur ein Deckel frühestens anfängt**, in
 * Metern — die Mitte liegt knapp einen Meter über den Füßen, der Kopf knapp
 * einen Meter darüber.
 */
export const LID_ABOVE = 0.9;

/**
 * **Ist dieser Kasten ein Deckel?** Eine Decke oder ein Dach über dem Kopf:
 * flach, in beiden Richtungen breiter als jede Wand, und erst über dem Kopf
 * der Figur. Er schließt keinen Raum — man geht unter ihm hindurch.
 *
 * Gemeldet für _Haunting_ (Oktober 2026): Dort trägt jeder Raum seine Decke
 * als Quader im Plan (`GridPlan.room(…, { ceiling })`), 2,8 bis 3,1 m hoch,
 * und das liegt noch in der Etage der Figur (`FRONT_ABOVE`). Die Flut stand
 * damit schon in der ersten Zelle still, der Raum war leer, und keine Wand
 * wurde je durchsichtig — anders als im _Hausbau_, wo die Decke ein Boden der
 * Etage darüber ist. Ein Sturz über der Tür ist dagegen so dünn wie die Wand
 * und schließt den Raum weiter.
 */
export function lidLike(box: GhostBox, figureY: number): boolean {
  const narrow = Math.min(box.w, box.d);
  return narrow > 0.6 && box.h < narrow && box.y - box.h / 2 >= figureY + LID_ABOVE;
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
  const axes = facingAxes(camera, figure);
  const size = Math.ceil((2 * ROOM_REACH) / ROOM_CELL);
  const x0 = figure.x - ROOM_REACH;
  const z0 = figure.z - ROOM_REACH;
  const cells = size * size;
  if (scratch.blocked.length !== cells) {
    scratch.blocked = new Uint8Array(cells);
    scratch.reached = new Uint8Array(cells);
    scratch.queue = new Int32Array(cells);
  }
  const { blocked, reached, queue } = scratch;
  blocked.fill(0);
  reached.fill(0);
  const walls: T[] = [];

  for (const one of boxes) {
    if (!blocksView(one, knee)) continue;
    const box = one.box;
    const top = box.y + box.h / 2;
    const bottom = box.y - box.h / 2;
    if (top <= figure.y - FRONT_BELOW || bottom >= figure.y + FRONT_ABOVE) continue;
    if (lidLike(box, figure.y)) continue;
    if (wallLike(box)) walls.push(one);
    if (box.slant) {
      blockSlant(box, x0, z0, size, blocked);
      continue;
    }
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

  const cellX = (x: number): number => Math.floor((x - x0) / ROOM_CELL);
  const cellZ = (z: number): number => Math.floor((z - z0) / ROOM_CELL);
  /** Liegt in diesem Streifen von Zellen irgendwo Raum? */
  const anyReached = (ax: number, bx: number, az: number, bz: number): boolean => {
    for (let iz = Math.max(0, az); iz <= Math.min(size - 1, bz); iz++) {
      for (let ix = Math.max(0, ax); ix <= Math.min(size - 1, bx); ix++) {
        if (reached[iz * size + ix]) return true;
      }
    }
    return false;
  };

  const out: T[] = [];
  const toCamera = Math.hypot(camera.x - figure.x, camera.z - figure.z);
  for (const one of walls) {
    const box = one.box;
    const slant = box.slant;
    if (slant) {
      // Zeigt sie der Kamera ihre Fläche? Gefragt wie bei `facingAxes`, nur
      // quer zur Schräge statt entlang einer Achse.
      if (toCamera < 1e-6) continue;
      const { across } = slantLocal(slant, camera.x - figure.x, camera.z - figure.z);
      const facing = across / toCamera;
      if (Math.abs(facing) <= FACING) continue;
      // Abgewandt ist die Seite, auf der die Kamera nicht steht.
      const away = facing > 0 ? -1 : 1;
      const near = slant.thin / 2;
      const far = near + (ROOM_PROBE + 1) * ROOM_CELL;
      let hit = false;
      const ax = cellX(box.x - box.w / 2) - ROOM_PROBE - 1;
      const bx = cellX(box.x + box.w / 2) + ROOM_PROBE + 1;
      const az = cellZ(box.z - box.d / 2) - ROOM_PROBE - 1;
      const bz = cellZ(box.z + box.d / 2) + ROOM_PROBE + 1;
      for (let iz = Math.max(0, az); iz <= Math.min(size - 1, bz) && !hit; iz++) {
        for (let ix = Math.max(0, ax); ix <= Math.min(size - 1, bx); ix++) {
          if (!reached[iz * size + ix]) continue;
          const at = slantLocal(
            slant,
            x0 + (ix + 0.5) * ROOM_CELL - box.x,
            z0 + (iz + 0.5) * ROOM_CELL - box.z,
          );
          const off = at.across * away;
          if (Math.abs(at.along) <= slant.long / 2 && off > near && off <= far) {
            hit = true;
            break;
          }
        }
      }
      if (hit) out.push(one);
      continue;
    }
    if (box.w >= box.d) {
      // Quer zur z-Achse: zeigt der Kamera ihre Fläche, wenn die z-Achse zu
      // ihr zeigt. Abgewandt ist die Seite, von der die Kamera weg ist.
      if (axes.z === 0) continue;
      const ax = cellX(box.x - box.w / 2);
      const bx = cellX(box.x + box.w / 2);
      const hit =
        axes.z > 0
          ? anyReached(ax, bx, cellZ(box.z - box.d / 2) - ROOM_PROBE, cellZ(box.z - box.d / 2) - 1)
          : anyReached(ax, bx, cellZ(box.z + box.d / 2) + 1, cellZ(box.z + box.d / 2) + ROOM_PROBE);
      if (hit) out.push(one);
    } else {
      if (axes.x === 0) continue;
      const az = cellZ(box.z - box.d / 2);
      const bz = cellZ(box.z + box.d / 2);
      const hit =
        axes.x > 0
          ? anyReached(cellX(box.x - box.w / 2) - ROOM_PROBE, cellX(box.x - box.w / 2) - 1, az, bz)
          : anyReached(cellX(box.x + box.w / 2) + 1, cellX(box.x + box.w / 2) + ROOM_PROBE, az, bz);
      if (hit) out.push(one);
    }
  }
  return out;
}

/**
 * **Eine Schräge sperrt ein schräges Band** und nicht ihre Hülle: jede Zelle,
 * die sie auch nur berührt — die Mitte höchstens eine halbe Zellendiagonale
 * von ihr weg. So ist das Band für eine Flut in vier Richtungen dicht, und
 * an den Enden reicht es um dieselbe halbe Diagonale über die Ecke hinaus,
 * bis in die gerade Wand, an die sie stößt.
 */
function blockSlant(
  box: GhostBox,
  x0: number,
  z0: number,
  size: number,
  blocked: Uint8Array,
): void {
  const slant = box.slant!;
  const reach = ROOM_CELL * Math.SQRT1_2;
  const ax = Math.max(0, Math.floor((box.x - box.w / 2 - x0) / ROOM_CELL) - 1);
  const bx = Math.min(size - 1, Math.floor((box.x + box.w / 2 - x0) / ROOM_CELL) + 1);
  const az = Math.max(0, Math.floor((box.z - box.d / 2 - z0) / ROOM_CELL) - 1);
  const bz = Math.min(size - 1, Math.floor((box.z + box.d / 2 - z0) / ROOM_CELL) + 1);
  for (let iz = az; iz <= bz; iz++) {
    for (let ix = ax; ix <= bx; ix++) {
      const at = slantLocal(
        slant,
        x0 + (ix + 0.5) * ROOM_CELL - box.x,
        z0 + (iz + 0.5) * ROOM_CELL - box.z,
      );
      if (
        Math.abs(at.along) <= slant.long / 2 + reach &&
        Math.abs(at.across) <= slant.thin / 2 + reach
      )
        blocked[iz * size + ix] = 1;
    }
  }
}
