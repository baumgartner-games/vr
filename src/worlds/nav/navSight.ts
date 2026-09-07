import { believedWalkable, believedWallState, type NavBelief } from './navBelief';
import { newWallState, type DoorPower, type NavGraph } from './navGraph';
import {
  DIR_E,
  DIR_N,
  DIR_S,
  DIR_W,
  NO_TILE,
  TILE,
  keyLevel,
  keyX,
  keyZ,
  neighbour,
  tileKey,
  type Dir,
  type TileKey,
} from './navTile';

/**
 * **Die Linie durch das Gitter** — eine Rechnung, drei Fragen.
 *
 * Sieht der von hier nach dort? Kommt er dort in gerader Linie hin? Wie laut
 * ist ein Schuss von dort aus hier? Alle drei sind dieselbe Wanderung über die
 * Kacheln zwischen zwei Punkten, und alle drei unterscheiden sich nur darin,
 * was sie an jeder überschrittenen Wand tun: aufhören, aufhören, oder leiser
 * werden.
 *
 * Dass es **eine** Rechnung ist, ist der Punkt. Ein eigener Sichttest gegen
 * die three.js-Geometrie wäre genauer und hätte drei Nachteile: er liefe nicht
 * im Test, er kostete bei fünfzig NPCs echte Millisekunden, und er wüsste
 * nichts von der Tür, die gerade zugefallen ist. Das Gitter weiß es, weil die
 * Tür darin steht.
 *
 * Die Wanderung ist ein DDA nach Amanatides/Woo: von Kachelmitte zu
 * Kachelmitte, immer über die Wand, die der Strahl als nächste kreuzt. Trifft
 * er eine Ecke genau, werden **beide** Wände geprüft — wer dort nur eine
 * prüfte, sähe diagonal durch die Ecke zweier Mauern hindurch, und in der
 * Brille ist das der Zombie, der einen durch die Häuserecke bemerkt.
 */

/**
 * Wie weit der lauteste Lärm des Spiels trägt, in Metern.
 *
 * Der Bezugswert für alle Lautstärken: ein Schuss ist `1`, ein Schritt `0,12`.
 * Wer die Zahl ändert, macht die ganze Welt hellhöriger — deshalb steht sie
 * hier einmal und nicht in jedem Sinnesorgan neu.
 */
export const SOUND_RANGE = 45;

/** Was eine Geschossdecke vom Schall übrig lässt. */
export const FLOOR_MUFFLE = 0.45;

/**
 * Läuft die Kacheln zwischen zwei Punkten ab und ruft an jeder Wand `step`.
 *
 * `step` bekommt die Kachel, in der es gerade steht, die Richtung, in die es
 * weitergeht, und die Kachel dahinter. Gibt es `false` zurück, ist Schluss und
 * die Wanderung meldet `false`. Kommt sie an, meldet sie `true`.
 *
 * Beide Kacheln müssen auf **derselben Etage** liegen — durch Decken sieht und
 * läuft niemand. Der Schall macht es anders und rechnet die Etagen selbst
 * dazu (`soundLevel`).
 */
export function traceLine(
  from: TileKey,
  to: TileKey,
  step: (tile: TileKey, dir: Dir, next: TileKey) => boolean,
): boolean {
  if (from === to) return true;
  if (keyLevel(from) !== keyLevel(to)) return false;

  const level = keyLevel(from);
  const dx = keyX(to) - keyX(from);
  const dz = keyZ(to) - keyZ(from);
  const stepX = Math.sign(dx);
  const stepZ = Math.sign(dz);
  const dirX: Dir = stepX > 0 ? DIR_E : DIR_W;
  const dirZ: Dir = stepZ > 0 ? DIR_S : DIR_N;
  const deltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
  const deltaZ = dz === 0 ? Infinity : Math.abs(1 / dz);
  // Von der Kachelmitte aus ist die erste Kante eine halbe Kachel entfernt.
  let nextX = deltaX * 0.5;
  let nextZ = deltaZ * 0.5;

  let tx = keyX(from);
  let tz = keyZ(from);
  const goalX = keyX(to);
  const goalZ = keyZ(to);
  // Jeder Durchlauf rückt mindestens eine Achse vor, also ist der Weg über die
  // Kanten die Obergrenze. Die Zugabe ist die Versicherung gegen eine Schleife
  // ohne Ende — in einer Render-Schleife wäre die das Ende der Sitzung.
  const guard = Math.abs(dx) + Math.abs(dz) + 4;

  for (let i = 0; i < guard; i++) {
    if (tx === goalX && tz === goalZ) return true;
    const here = tileKey(tx, tz, level);
    const needX = tx !== goalX;
    const needZ = tz !== goalZ;

    if (needX && needZ && nextX === nextZ) {
      // Der Strahl trifft die Ecke genau. Dann müssen **beide** Wege um sie
      // herum frei sein — erst nach Osten und dann nach Süden, und ebenso
      // andersherum. Wer hier nur einen prüft, sieht (und läuft) diagonal
      // durch die Ecke zweier Mauern, und in der Brille ist das der Zombie,
      // der einen durch die Häuserecke bemerkt.
      const alongX = neighbour(here, dirX);
      const alongZ = neighbour(here, dirZ);
      if (alongX === NO_TILE || alongZ === NO_TILE) return false;
      const cornerA = neighbour(alongX, dirZ);
      const cornerB = neighbour(alongZ, dirX);
      if (cornerA === NO_TILE || cornerB === NO_TILE) return false;
      if (!step(here, dirX, alongX)) return false;
      if (!step(alongX, dirZ, cornerA)) return false;
      if (!step(here, dirZ, alongZ)) return false;
      if (!step(alongZ, dirX, cornerB)) return false;
      tx += stepX;
      tz += stepZ;
      nextX += deltaX;
      nextZ += deltaZ;
      continue;
    }

    if (needX && (!needZ || nextX < nextZ)) {
      const next = neighbour(here, dirX);
      if (next === NO_TILE || !step(here, dirX, next)) return false;
      tx += stepX;
      nextX += deltaX;
      continue;
    }

    const next = neighbour(here, dirZ);
    if (next === NO_TILE || !step(here, dirZ, next)) return false;
    tz += stepZ;
    nextZ += deltaZ;
  }
  return tx === goalX && tz === goalZ;
}

/**
 * Ob man von hier nach dort **sieht**.
 *
 * Immer über die Wahrheit und nie über eine Meinung: durch eine Tür, die man
 * für offen hält, sieht man trotzdem nicht (`navBelief.ts`).
 */
export function canSee(graph: NavGraph, from: TileKey, to: TileKey): boolean {
  const scratch = newWallState();
  return traceLine(
    from,
    to,
    (tile, dir) => believedWallState(null, graph.wall(tile, dir), true, scratch).see,
  );
}

/**
 * Ob man von hier nach dort in **gerader Linie laufen** kann.
 *
 * Das ist die Frage, mit der ein gefundener Weg geglättet wird: Wenn der Weg
 * über sieben Kacheln geht, man aber von der ersten die vierte direkt
 * erreicht, fallen zwei Ecken weg. Hier zählt die **Meinung** — wer eine Tür
 * für offen hält, glättet durch sie hindurch und rennt vor sie.
 *
 * `forbid` sagt, welche Kacheln dabei tabu sind: Was die Wegsuche wegen seiner
 * Kosten gemieden hat, darf die Glättung nicht wieder hineinziehen.
 */
export function canWalkLine(
  graph: NavGraph,
  from: TileKey,
  to: TileKey,
  power: boolean | DoorPower = true,
  belief: NavBelief | null = null,
  forbid?: (tile: TileKey) => boolean,
): boolean {
  const scratch = newWallState();
  if (!believedWalkable(belief, graph, from)) return false;
  return traceLine(from, to, (tile, dir, next) => {
    if (!believedWalkable(belief, graph, next)) return false;
    // `forbid` ist die Stachelgrube: Die Glättung darf keine Kachel betreten,
    // um die die Wegsuche gerade herumgegangen ist. Ohne diese Zeile hebelt
    // ein einziger Glättungsschritt das ganze Kostensystem aus — der Mensch
    // plant sauber außen herum und läuft dann quer hindurch.
    if (forbid?.(next)) return false;
    const state = believedWallState(belief, graph.wall(tile, dir), power, scratch);
    // Beim Glätten zählt nur, ob es **ohne Halt** durchgeht: eine Tür, die
    // erst aufgemacht werden muss, ist keine gerade Linie.
    return state.walk && state.cost === 0;
  });
}

/**
 * Wie laut ein Geräusch von `at` an der Stelle `ear` ankommt, in [0,1].
 *
 * Drei Dinge machen es leiser, und alle drei sind gewollt: die **Entfernung**
 * (linear, denn eine physikalisch richtige Kurve hört man in der Brille nicht,
 * stellt sich aber deutlich schlechter ein), jede **Wand** dazwischen mit
 * ihrem eigenen Anteil, und jede **Decke**, wenn der Hörer eine Etage höher
 * oder tiefer steht.
 *
 * Etagen werden dabei nur gezählt, nicht durchwandert: Der Weg des Schalls
 * durch ein Treppenhaus wäre die ehrlichere Rechnung, aber niemand hört einer
 * Rechnung an, dass sie ehrlich war.
 */
export function soundLevel(
  graph: NavGraph,
  at: TileKey,
  ear: TileKey,
  loudness: number,
  range = SOUND_RANGE,
): number {
  const dx = (keyX(at) - keyX(ear)) * TILE;
  const dz = (keyZ(at) - keyZ(ear)) * TILE;
  const distance = Math.hypot(dx, dz);
  if (distance >= range) return 0;

  let level = loudness * (1 - distance / range);
  const floors = Math.abs(keyLevel(at) - keyLevel(ear));
  if (floors > 0) level *= Math.pow(FLOOR_MUFFLE, floors);
  if (level <= 0) return 0;

  // Gelaufen wird auf der Etage des Hörers: die Wände dort sind die, die er
  // zwischen sich und dem Lärm hat.
  const source = tileKey(keyX(at), keyZ(at), keyLevel(ear));
  const scratch = newWallState();
  traceLine(source, ear, (tile, dir) => {
    level *= believedWallState(null, graph.wall(tile, dir), true, scratch).hear;
    // Nie abbrechen: Schall hört nicht auf, er wird nur leiser. Erst wenn
    // nichts mehr übrig ist, lohnt das Weiterlaufen nicht.
    return level > 0.001;
  });
  return level;
}
