/**
 * **Wohin der Fokus springt, wenn jemand am Steuerkreuz drückt** — als reine
 * Rechnung über Rechtecke.
 *
 * Ein Menü am Schirm ist für die Maus und den Finger gebaut: Zeilen, Kacheln
 * im Raster, ein Pfeil neben einer Zeile, ein ⓘ in der Ecke einer Kachel, ein
 * Kopf mit _Zurück_ und _Schließen_. Mit einem Gamepad gibt es keinen Zeiger,
 * sondern vier Richtungen — und die Frage, welcher Knopf „rechts von diesem"
 * liegt, beantwortet keine Liste, sondern nur die Geometrie. Eine Reihenfolge
 * im DOM wüsste nicht, dass im Raster „unten" drei Kacheln weiter ist, und
 * dass der Pfeil einer Zeile rechts von ihr liegt und nicht unter ihr.
 *
 * Also wird gemessen: Kandidat ist, wessen Mitte in der gedrückten Richtung
 * liegt; gewonnen hat, wer **auf der Hauptachse** am nächsten ist und **quer**
 * dazu am wenigsten danebenliegt. Quer zählt doppelt — sonst spränge „unten"
 * im Raster schräg in die Nachbarspalte, weil die eine Spur näher liegt.
 *
 * Kein DOM: Der Fahrer (`ui/padNav.ts`) misst mit `getBoundingClientRect` und
 * gibt hier nur Zahlen herein, damit ein Test es ohne Browser nachrechnet —
 * jsdom misst jedes Rechteck mit null.
 */

export interface NavRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export type NavDir = 'up' | 'down' | 'left' | 'right';

/** Wie stark das Danebenliegen quer zur Richtung zählt. */
const CROSS_WEIGHT = 2;

/** Ab wie viel Punkten eine Mitte als „in der Richtung" zählt — gegen Rundung. */
const EPSILON = 1;

/**
 * **Der nächste Nachbar in einer Richtung** — sein Index in `candidates`, oder
 * `-1`, wenn in dieser Richtung nichts mehr liegt (dann bleibt der Fokus, wo er
 * ist; ein Menü, das am Ende nach oben zurückspringt, verliert man).
 */
export function pickNext(from: NavRect, candidates: readonly NavRect[], dir: NavDir): number {
  const fx = from.left + from.width / 2;
  const fy = from.top + from.height / 2;
  let best = -1;
  let bestScore = Infinity;
  candidates.forEach((rect, index) => {
    if (rect.width <= 0 && rect.height <= 0) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (cx === fx && cy === fy) return;
    const main = mainGap(from, rect, dir, fx, fy, cx, cy);
    if (main === null) return;
    const cross = crossGap(from, rect, dir);
    // **Seitwärts nur in derselben Zeile.** Eine Liste hat rechts von einer
    // Zeile nichts — und „rechts" darf dann nicht schräg nach oben auf
    // _Schließen_ im Kopf springen, bloß weil das weiter rechts liegt. Der Pfeil
    // neben einer Nimm-Zeile und das ⓘ in der Ecke einer Kachel überlappen
    // ihre Zeile und bleiben erreichbar.
    if ((dir === 'left' || dir === 'right') && cross > 0) return;
    const score = main + CROSS_WEIGHT * cross;
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}

/**
 * Der Abstand auf der Hauptachse — oder `null`, wenn das Rechteck gar nicht in
 * der Richtung liegt. Gemessen von Kante zu Kante, damit eine hohe Kachel
 * neben einer flachen Zeile nicht künstlich weit weg ist.
 */
function mainGap(
  from: NavRect,
  rect: NavRect,
  dir: NavDir,
  fx: number,
  fy: number,
  cx: number,
  cy: number,
): number | null {
  switch (dir) {
    case 'down':
      if (cy <= fy + EPSILON) return null;
      return Math.max(0, rect.top - (from.top + from.height));
    case 'up':
      if (cy >= fy - EPSILON) return null;
      return Math.max(0, from.top - (rect.top + rect.height));
    case 'right':
      if (cx <= fx + EPSILON) return null;
      return Math.max(0, rect.left - (from.left + from.width));
    case 'left':
      if (cx >= fx - EPSILON) return null;
      return Math.max(0, from.left - (rect.left + rect.width));
  }
}

/** Wie weit die beiden quer zur Richtung auseinanderliegen — null bei Überlappung. */
function crossGap(from: NavRect, rect: NavRect, dir: NavDir): number {
  if (dir === 'up' || dir === 'down') {
    return spanGap(from.left, from.left + from.width, rect.left, rect.left + rect.width);
  }
  return spanGap(from.top, from.top + from.height, rect.top, rect.top + rect.height);
}

function spanGap(a0: number, a1: number, b0: number, b1: number): number {
  if (b1 < a0) return a0 - b1;
  if (b0 > a1) return b0 - a1;
  return 0;
}

/**
 * **Ein Stock, der gehalten wird, wiederholt** — erst nach einer Pause, dann
 * im Takt. Genau wie eine Taste an der Tastatur: Ein Druck ist ein Schritt,
 * und wer hält, will durch eine lange Liste fahren, ohne dreißigmal zu tippen.
 *
 * Reine Rechnung über die Zeit, die der Aufrufer mitgibt.
 */
export class RepeatGate {
  private held: NavDir | null = null;
  private next = 0;

  constructor(
    /** Wie lange der erste Schritt steht, bevor es weitergeht (ms). */
    private readonly delay = 380,
    /** Und dann der Takt (ms). */
    private readonly every = 110,
  ) {}

  /**
   * Die Richtung dieses Bildes hinein, der Schritt heraus — oder `null`, wenn
   * in diesem Bild kein Schritt fällig ist.
   */
  step(dir: NavDir | null, now: number): NavDir | null {
    if (dir === null) {
      this.held = null;
      return null;
    }
    if (dir !== this.held) {
      this.held = dir;
      this.next = now + this.delay;
      return dir;
    }
    if (now < this.next) return null;
    this.next = now + this.every;
    return dir;
  }
}

/** Ab wann ein Stock eine Richtung ist (dieselbe Größenordnung wie die Totzone). */
export const STICK_NAV = 0.5;

/**
 * **Eine Richtung aus Steuerkreuz und Stock** — das Kreuz geht vor, der Stock
 * zählt nur, wenn er deutlich in eine Achse zeigt. Schräg gehaltene Stöcke
 * entscheiden nach der stärkeren Achse; ein Menü kennt keine Diagonale.
 */
export function navDirection(
  dpad: { up: boolean; down: boolean; left: boolean; right: boolean },
  stick: { x: number; y: number },
): NavDir | null {
  if (dpad.up) return 'up';
  if (dpad.down) return 'down';
  if (dpad.left) return 'left';
  if (dpad.right) return 'right';
  const ax = Math.abs(stick.x);
  const ay = Math.abs(stick.y);
  if (Math.max(ax, ay) < STICK_NAV) return null;
  if (ay >= ax) return stick.y < 0 ? 'up' : 'down';
  return stick.x < 0 ? 'left' : 'right';
}
