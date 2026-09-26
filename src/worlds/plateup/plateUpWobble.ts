/**
 * **Der wackelige Turm auf dem Hörnchen** — wie die Eiskugeln der Bewegung
 * des Hörnchens folgen. Ohne three.js.
 *
 * Gewünscht war zweierlei, und beides zugleich: Die Kugeln **fallen nie**
 * herunter, aber sie folgen dem Hörnchen auch **nicht starr**. Wer mit dem Eis
 * losläuft, sieht die oberen Kugeln einen Augenblick zurückbleiben und dann
 * nachschwingen; wer das Hörnchen in der Brille schräg hält, sieht den Turm
 * sich langsam in dieselbe Richtung neigen — und dort bleiben, statt
 * abzustürzen.
 *
 * **Die Kette.** Jede Kugel hängt an einer Feder, und zwar nicht am Hörnchen,
 * sondern an der Kugel **darunter**: Ihr Ruheplatz ist die tatsächliche
 * (verspätete) Stelle der unteren Kugel plus ein Kugelabstand entlang der
 * Richtung des Turms. Damit wächst die Verspätung mit der Höhe von selbst —
 * die fünfte Kugel folgt einer vierten, die selbst schon hinterherhinkt —,
 * und dazu wird jede Feder nach oben hin etwas weicher (`WOBBLE.soften`).
 *
 * **Die Neigung.** Die Richtung des Turms ist nicht die Achse des Hörnchens,
 * sondern **folgt** ihr: Sie dreht sich mit der Zeitkonstante `WOBBLE.tilt`
 * zu ihr hin (`WobbleState.dir`). Wer das Hörnchen kippt, sieht den Turm
 * erst noch aufrecht auf der Öffnung stehen und sich dann langsam
 * hinüberneigen. Zum waagerechten Anteil der Achse kommt dabei ein Stück
 * „Durchhängen" (`WOBBLE.sag`): Ein schräg gehaltenes Hörnchen trägt seinen
 * Turm am Ende etwas schräger, als es selbst steht. Aufrecht gehalten ist
 * dieser Anteil null, und der Turm steht gerade.
 *
 * **Nie herunter.** Nach jedem Schritt wird der Abstand jeder Kugel zu ihrem
 * Ruheplatz auf `WOBBLE.lean` Kugelabstände begrenzt, und die Geschwindigkeit
 * nach außen fällt dabei weg. Das ist keine Physik, sondern das Versprechen
 * aus dem Auftrag, als Zeile geschrieben: Egal wie heftig man schüttelt, die
 * Kugel bleibt auf der unter ihr sitzen.
 *
 * **Unabhängig von der Bildrate.** Die Feder wird nicht mit Euler-Schritten
 * angenähert, sondern mit ihrer **geschlossenen Lösung** gerechnet (gedämpfte
 * Schwingung, `spring`): Für ein festes Ziel ist ein Schritt von 1/30 s genau
 * dasselbe wie vier von 1/120 s — und unbedingt stabil, auch nach einem
 * Ruckler. Die Neigung dreht um einen festen **Anteil des Winkels** je
 * Zeitspanne, und das setzt sich genauso zusammen. Was zwischen zwei Bildern
 * passiert, wird in Stücke von höchstens `WOBBLE.step` geteilt, und Hörnchen
 * und Achse wandern darin gleichmäßig von der alten zur neuen Stelle; ein Test
 * rechnet nach, dass 30 und 144 Bilder je Sekunde denselben Turm ergeben.
 */

/** Ein Punkt oder eine Richtung im Raum — so viel, wie die Rechnung braucht. */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Eine Kugel des Turms: wo sie ist und wie schnell sie gerade dorthin will. */
export interface WobbleBall {
  readonly p: Vec3;
  readonly v: Vec3;
}

/** Der ganze Turm, von unten nach oben. */
export interface WobbleState {
  readonly balls: readonly WobbleBall[];
  /** Die Richtung, in der der Turm gerade steht — sie folgt der Achse. `null`: noch keine. */
  readonly dir: Vec3 | null;
  /** Wo die Öffnung im letzten Bild war — dazwischen wird gleichmäßig gewandert. */
  readonly base: Vec3 | null;
  /** Die Achse des Hörnchens im letzten Bild. */
  readonly axis: Vec3 | null;
}

/** Die Zahlen des Turms — eine Stelle, an der man ihn steifer oder weicher macht. */
export const WOBBLE = {
  /** Eigenfrequenz der untersten Feder, in rad/s — sie sitzt im Hörnchen und ist steif. */
  omega: 26,
  /** Um wie viel jede Feder nach oben weicher wird: `omega / (1 + soften · i)`. */
  soften: 0.18,
  /** Dämpfung (1 = gerade kein Nachschwingen). Etwas darunter, damit es wackelt. */
  damping: 0.5,
  /** Zeitkonstante der Neigung, in Sekunden: so langsam folgt der Turm dem Kippen. */
  tilt: 0.35,
  /** Wie weit eine Kugel höchstens von ihrem Ruheplatz weg darf, in Kugelabständen. */
  lean: 0.45,
  /** Wie viel stärker sich der Turm neigt als das schräg gehaltene Hörnchen. */
  sag: 0.35,
  /** Das längste Stück, in dem gerechnet wird, in Sekunden. */
  step: 1 / 120,
  /** Mehr als so viel Zeit auf einmal wird nicht nachgeholt (nach einem Ruckler). */
  maxDt: 0.25,
} as const;

/** Ein leerer Turm. */
export const NO_WOBBLE: WobbleState = { balls: [], dir: null, base: null, axis: null };

const UP: Vec3 = { x: 0, y: 1, z: 0 };

function add(a: Vec3, b: Vec3, s = 1): Vec3 {
  return { x: a.x + b.x * s, y: a.y + b.y * s, z: a.z + b.z * s };
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function length(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

function normal(a: Vec3, fallback: Vec3 = UP): Vec3 {
  const l = length(a);
  return l > 1e-9 ? { x: a.x / l, y: a.y / l, z: a.z / l } : fallback;
}

/**
 * **Die Richtung, in der gestapelt wird, wenn der Turm zur Ruhe kommt** — die
 * Achse des Hörnchens, dazu das Durchhängen in ihre waagerechte Richtung.
 * Aufrecht (oder genau kopfüber) ist das die Achse selbst.
 */
export function stackDirection(axis: Vec3, sag: number = WOBBLE.sag): Vec3 {
  const a = normal(axis);
  const flat = sub(a, { x: 0, y: a.y, z: 0 });
  return normal(add(a, flat, sag), a);
}

/**
 * **Eine Richtung ein Stück zur anderen hin drehen** — um den Anteil `share`
 * des Winkels dazwischen, auf dem Großkreis. Zweimal die Hälfte ist damit
 * dasselbe wie einmal das Ganze.
 */
export function turnToward(from: Vec3, to: Vec3, share: number): Vec3 {
  const a = normal(from);
  const b = normal(to);
  const cos = Math.max(-1, Math.min(1, dot(a, b)));
  const angle = Math.acos(cos);
  if (angle < 1e-9) return b;
  // Genau entgegengesetzt gibt es keinen Großkreis — dann über irgendeine
  // Seite, die senkrecht auf `a` steht.
  const other = Math.abs(a.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 0, z: 1 };
  const d = dot(a, other);
  const perpendicular = normal(sub(other, { x: a.x * d, y: a.y * d, z: a.z * d }));
  const side = normal(sub(b, { x: a.x * cos, y: a.y * cos, z: a.z * cos }), perpendicular);
  const t = angle * Math.max(0, Math.min(1, share));
  return normal(
    add({ x: a.x * Math.cos(t), y: a.y * Math.cos(t), z: a.z * Math.cos(t) }, side, Math.sin(t)),
  );
}

/**
 * **Die gedämpfte Feder, geschlossen gelöst** — Auslenkung `x` und
 * Geschwindigkeit `v` nach `t` Sekunden, für ein festes Ziel bei 0.
 *
 * Für `zeta < 1` die schwingende Lösung, sonst die kritisch gedämpfte (stärker
 * gedämpft braucht der Turm nicht). Beides ist exakt und damit für jedes `t`
 * stabil: Die Auslenkung wird nie größer, als die Energie hergibt.
 */
export function spring(
  x: number,
  v: number,
  omega: number,
  zeta: number,
  t: number,
): [number, number] {
  if (t <= 0) return [x, v];
  if (zeta >= 1) {
    const e = Math.exp(-omega * t);
    const k = (v + omega * x) * t;
    return [(x + k) * e, (v - omega * k) * e];
  }
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const e = Math.exp(-zeta * omega * t);
  const c = Math.cos(wd * t);
  const s = Math.sin(wd * t);
  const nx = e * (x * c + ((v + zeta * omega * x) / wd) * s);
  const nv = e * (v * c - ((omega * omega * x + zeta * omega * v) / wd) * s);
  return [nx, nv];
}

/** Wo die Kugeln ruhen würden, wenn nichts wackelte — der starre Turm. */
export function restTower(base: Vec3, axis: Vec3, count: number, spacing: number): Vec3[] {
  const dir = stackDirection(axis);
  const out: Vec3[] = [];
  for (let i = 0; i < count; i++) out.push(add(base, dir, i * spacing));
  return out;
}

/**
 * **Ein Bild des Turms** — `dt` Sekunden weiter.
 *
 * @param base  wo die unterste Kugel ruht (die Mitte der Öffnung des Hörnchens,
 *              etwas darüber), in Weltkoordinaten
 * @param axis  die Achse des Hörnchens (nach oben aus der Öffnung heraus)
 * @param count wie viele Kugeln es sind — neue erscheinen an ihrem Ruheplatz
 *              oben auf dem Turm, überzählige fallen weg
 * @param spacing der Abstand zweier Kugelmitten, in Metern
 */
export function stepWobble(
  state: WobbleState,
  base: Vec3,
  axis: Vec3,
  count: number,
  spacing: number,
  dt: number,
): WobbleState {
  const fromBase = state.base ?? base;
  const fromAxis = state.axis ?? axis;
  let dir = state.dir ?? stackDirection(axis);
  const balls: WobbleBall[] = state.balls.slice(0, Math.max(0, count)).map((b) => ({ ...b }));
  // **Neue Kugeln oben drauf**, in Ruhe an ihrem Platz: Die Kugel kommt vom
  // Portionierer und soll dort sitzen, wo man sie hingesetzt hat.
  while (balls.length < count) {
    const below = balls[balls.length - 1];
    const p = below ? add(below.p, dir, spacing) : fromBase;
    balls.push({ p, v: below ? below.v : { x: 0, y: 0, z: 0 } });
  }
  const total = Math.min(Math.max(0, dt), WOBBLE.maxDt);
  const pieces = Math.max(1, Math.ceil(total / WOBBLE.step - 1e-9));
  const h = total / pieces;
  const limit = WOBBLE.lean * spacing;
  for (let k = 1; k <= pieces; k++) {
    // Hörnchen und Achse wandern gleichmäßig vom letzten Bild zu diesem.
    const at = lerp(fromBase, base, k / pieces);
    const along = normal(lerp(fromAxis, axis, k / pieces), normal(axis));
    dir = turnToward(dir, stackDirection(along), 1 - Math.exp(-h / WOBBLE.tilt));
    for (let i = 0; i < balls.length; i++) {
      const target = i === 0 ? at : add(balls[i - 1]!.p, dir, spacing);
      const omega = WOBBLE.omega / (1 + WOBBLE.soften * i);
      const ball = balls[i]!;
      const off = sub(ball.p, target);
      const [ox, vx] = spring(off.x, ball.v.x, omega, WOBBLE.damping, h);
      const [oy, vy] = spring(off.y, ball.v.y, omega, WOBBLE.damping, h);
      const [oz, vz] = spring(off.z, ball.v.z, omega, WOBBLE.damping, h);
      let offset: Vec3 = { x: ox, y: oy, z: oz };
      let v: Vec3 = { x: vx, y: vy, z: vz };
      // **Nie herunter**: Weiter als `lean` Kugelabstände geht es nicht, und
      // was nach außen drängt, ist danach weg.
      const far = length(offset);
      if (far > limit) {
        const n = normal(offset);
        offset = { x: n.x * limit, y: n.y * limit, z: n.z * limit };
        const out = dot(v, n);
        if (out > 0) v = add(v, n, -out);
      }
      balls[i] = { p: add(target, offset), v };
    }
  }
  return { balls, dir, base, axis };
}

/**
 * **Wie weit die Kugel `i` von ihrem Platz im starren Turm weg ist** — für
 * Tests und für jeden, der wissen will, wie sehr es gerade wackelt.
 */
export function wobbleLag(state: WobbleState, base: Vec3, axis: Vec3, spacing: number): number[] {
  const rest = restTower(base, axis, state.balls.length, spacing);
  return state.balls.map((b, i) => length(sub(b.p, rest[i]!)));
}
