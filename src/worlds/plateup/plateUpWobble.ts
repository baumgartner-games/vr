/**
 * **Der Turm auf dem Hörnchen** — wie die Eiskugeln der Bewegung des
 * Hörnchens folgen. Ohne three.js.
 *
 * Gewünscht war: Die Kugeln **fallen nie** herunter und folgen dem Hörnchen
 * auch **nicht starr**, aber sie **schwingen nicht nach**. Die unterste Kugel
 * sitzt fest im Hörnchen, die darüber folgt ein wenig später, die nächste
 * noch später — und zwar nicht gleichmäßig, sondern nach oben hin immer
 * träger. Wer mit dem Eis losläuft, sieht deshalb keinen schräg gestellten,
 * geraden Turm, sondern einen **gebogenen**, dessen Spitze am weitesten
 * zurückhängt. Bleibt man stehen, kommen die unteren Kugeln schnell zur Ruhe,
 * und die oberen holen erst **danach** richtig auf — und nie über ihren
 * Platz hinaus: kein Wackeln, keine Welle.
 *
 * **Eine Kette von Verzögerungen.** Jede Kugel läuft ihrem Platz nach, und
 * ihr Platz ist nicht am Hörnchen, sondern **auf der Kugel darunter** (ihre
 * Stelle plus ein Kugelabstand entlang der Richtung des Turms). Wie sie
 * nachläuft, ist die einfachste Verzögerung, die es gibt, erster Ordnung:
 * Der Abstand zum Platz schrumpft mit `exp(−t/τᵢ)` (`followBall`). So eine
 * Verzögerung schießt nie über das Ziel hinaus, und hintereinander gehängt
 * auch nicht — aber die Kette ergibt die gewünschte Form: Die oberen Kugeln
 * fahren weich an, laufen weiter, wenn die unteren schon stehen, und holen
 * dann auf. Die Zeitkonstante wächst mit der Höhe quadratisch
 * (`followTime`: `τᵢ = WOBBLE.lag · i^WOBBLE.curve`, höchstens
 * `WOBBLE.slowest`: 1 ms · i², höchstens 40 ms — anfangs waren es 3 ms · i²
 * und 150 ms, und das kam als _„die Eiskugeln bewegen sich zu langsam"_ an);
 * bei gleichmäßiger Bewegung hängt jedes Glied `i` damit
 * um `v · τᵢ` über, die Kugel also um `v · (τ₁ + … + τᵢ)` zurück (vor der
 * weichen Begrenzung, siehe unten), und diese Summe wächst schneller als die
 * Höhe — der Turm biegt sich, statt sich bloß schräg zu stellen.
 *
 * Mit der Funktion aus dem Wunsch („Index, Stelle des Hörnchens, letzte
 * Stelle des Hörnchens") ist `followBall(i, ziel, letztesZiel, letzteStelle,
 * dt)` gemeint: Das Ziel ist für die unterste Kugel die Öffnung des Hörnchens,
 * für jede weitere die Kugel darunter; und weil jede Kugel ihre **eigene**
 * Verspätung trägt, braucht es außer dem letzten Ziel auch ihre letzte Stelle.
 *
 * **Die Neigung.** Die Richtung des Turms ist nicht die Achse des Hörnchens,
 * sondern **folgt** ihr, ebenso ohne Überschießen: Sie dreht sich mit der
 * Zeitkonstante `WOBBLE.tilt` zu ihr hin (`WobbleState.dir`). Wer das
 * Hörnchen kippt, sieht den Turm erst noch aufrecht auf der Öffnung stehen
 * und sich dann hinüberneigen (0,2 s). Zum waagerechten Anteil der Achse kommt
 * ein Stück „Durchhängen" (`WOBBLE.sag`): Ein schräg gehaltenes Hörnchen
 * trägt seinen Turm am Ende etwas schräger, als es selbst steht. Aufrecht
 * gehalten ist dieser Anteil null, und der Turm steht gerade.
 *
 * **Nie herunter — und trotzdem gebogen: nach oben immer weiter über.**
 * Gerechnet wird die Kette frei (`WobbleState.chain`); gezeigt wird sie
 * **weich begrenzt** (`softLean`): Wie weit eine Kugel von ihrem Platz auf
 * der unteren weg ist, wird mit `L · tanh(r / L)` gestaucht. Kleine Abstände
 * bleiben fast, wie sie sind, große kommen `L` nahe und erreichen es nie; und
 * weil die Stauchung streng wächst, bleibt die Reihenfolge erhalten. Die
 * Grenze `L` ist **je Kugel eine andere** (`leanLimit`), gemessen in
 * Kugelgrößen (dem Durchmesser, `size` in `stepWobble`): Die unterste sitzt
 * fest, die oberste darf bis 0,9 Kugelgrößen über der darunter hängen
 * (`WOBBLE.lean`), die darunter die Hälfte, dann ein Drittel, ein Viertel …
 * (`0,9 / (n − k + 1)` für Kugel `k` im Turm mit der obersten Stelle `n`).
 * Nicht gerade also, sondern wie das obere Ende einer S-Kurve — gewünscht:
 * _„nicht linear … Kugel 3 nur 0,2 zur vorherigen, Kugel 4 0,5 und Kugel 5
 * 0,9"_. Beim Gehen (2,6 m/s) kommt die oberste ihrer 0,9 nahe (gut 0,8),
 * und jede darunter hängt weniger über; egal wie heftig man schüttelt, keine
 * kommt über ihre Grenze. Kommt oben eine Kugel dazu, rücken alle Grenzen
 * darunter eine Stelle weiter nach unten und werden kleiner — damit das den
 * Turm nicht springen lässt, ziehen die Grenzen (`WobbleState.limits`) ihrem
 * neuen Wert mit der Zeitkonstante `WOBBLE.relimit` nach. Die frei gerechnete
 * Kette wird bei `WOBBLE.reach` Grenzen gehalten — mehr sähe man ohnehin
 * nicht, und so kommt sie nach dem Anhalten schnell zurück.
 *
 * **Unabhängig von der Bildrate.** Die Verzögerung wird nicht mit
 * Euler-Schritten angenähert, sondern **geschlossen** gelöst — und zwar für
 * ein Ziel, das während des Schritts gleichmäßig vom letzten zum neuen Ort
 * wandert. Für so ein Ziel ist ein Schritt von 1/30 s genau dasselbe wie vier
 * von 1/120 s, und für jeden Schritt stabil, auch nach einem Ruckler. Die
 * Neigung dreht um einen festen **Anteil des Winkels** je Zeitspanne, und das
 * setzt sich genauso zusammen. Was zwischen zwei Bildern passiert, wird in
 * Stücke von höchstens `WOBBLE.step` geteilt, in denen Hörnchen und Achse
 * gleichmäßig wandern; ein Test rechnet nach, dass 30 und 144 Bilder je
 * Sekunde denselben Turm ergeben.
 */

/** Ein Punkt oder eine Richtung im Raum — so viel, wie die Rechnung braucht. */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Der ganze Turm, von unten nach oben. */
export interface WobbleState {
  /** Wo die Kugeln gezeigt werden, von unten nach oben — weich begrenzt. */
  readonly balls: readonly Vec3[];
  /** Die frei gerechnete Kette dahinter, ohne Begrenzung (bis auf `WOBBLE.reach`). */
  readonly chain: readonly Vec3[];
  /**
   * Wie weit jede Kugel gerade höchstens überhängen darf, in Kugelgrößen — sie
   * folgt `leanLimit`, damit eine neue Kugel oben die Grenzen darunter nicht
   * springen lässt.
   */
  readonly limits: readonly number[];
  /** Die Richtung, in der der Turm gerade steht — sie folgt der Achse. `null`: noch keine. */
  readonly dir: Vec3 | null;
  /** Wo die Öffnung im letzten Bild war — dazwischen wird gleichmäßig gewandert. */
  readonly base: Vec3 | null;
  /** Die Achse des Hörnchens im letzten Bild. */
  readonly axis: Vec3 | null;
}

/** Die Zahlen des Turms — eine Stelle, an der man ihn träger oder flinker macht. */
export const WOBBLE = {
  /** Zeitkonstante der zweiten Kugel (über der untersten), in Sekunden. */
  lag: 0.001,
  /** Wie die Zeitkonstante nach oben wächst: `lag · i^curve` — 2 heißt quadratisch. */
  curve: 2,
  /** Träger als so wird keine Kugel, in Sekunden — auch nicht die fünfzigste. */
  slowest: 0.04,
  /** Zeitkonstante der Neigung, in Sekunden: so langsam folgt der Turm dem Kippen. */
  tilt: 0.2,
  /**
   * Wie weit die **oberste** Kugel höchstens über der darunter hängt, in
   * Kugelgrößen (Durchmessern) — nie ganz erreicht. Darunter weniger, siehe
   * `leanLimit`.
   */
  lean: 0.9,
  /** Zeitkonstante, mit der die Grenzen nachziehen, wenn eine Kugel dazukommt, in Sekunden. */
  relimit: 0.12,
  /**
   * Wie weit die frei gerechnete Kette höchstens überhängen darf, als
   * Vielfaches der Grenze jeder Kugel — darüber sähe man ohnehin nichts mehr.
   */
  reach: 3,
  /** Wie viel stärker sich der Turm neigt als das schräg gehaltene Hörnchen. */
  sag: 0.35,
  /** Das längste Stück, in dem gerechnet wird, in Sekunden. */
  step: 1 / 120,
  /** Mehr als so viel Zeit auf einmal wird nicht nachgeholt (nach einem Ruckler). */
  maxDt: 0.25,
} as const;

/** Ein leerer Turm. */
export const NO_WOBBLE: WobbleState = {
  balls: [],
  chain: [],
  limits: [],
  dir: null,
  base: null,
  axis: null,
};

const UP: Vec3 = { x: 0, y: 1, z: 0 };

function add(a: Vec3, b: Vec3, s = 1): Vec3 {
  return { x: a.x + b.x * s, y: a.y + b.y * s, z: a.z + b.z * s };
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
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
 * **Wie träge die Kugel `index` ist** — ihre Zeitkonstante in Sekunden. Die
 * unterste (0) hat keine, sie sitzt im Hörnchen; darüber wächst sie mit
 * `index^WOBBLE.curve`.
 */
export function followTime(index: number): number {
  if (index <= 0) return 0;
  return Math.min(WOBBLE.slowest, WOBBLE.lag * Math.pow(index, WOBBLE.curve));
}

/**
 * **Wohin eine Kugel in `dt` Sekunden kommt** — die Verzögerung erster
 * Ordnung, geschlossen gelöst.
 *
 * @param index      welche Kugel, von unten gezählt (0 sitzt fest: Ergebnis
 *                   ist `target`)
 * @param target     wo sie jetzt sitzen sollte — für die unterste die Öffnung
 *                   des Hörnchens, sonst auf der Kugel darunter
 * @param lastTarget wo das vor `dt` Sekunden war; dazwischen wandert das Ziel
 *                   gleichmäßig
 * @param last       wo die Kugel vor `dt` Sekunden war
 *
 * Mit `τ = followTime(index)`, `e = exp(−dt/τ)`, `d = target − lastTarget` und
 * `r = τ/dt` ist das Ergebnis `target − d·r + (last − lastTarget + d·r)·e`:
 * die genaue Lösung von `ẋ = (Ziel − x)/τ`. Steht das Ziel still, ist das der
 * reine Abfall `target + (last − target)·e` — nie über das Ziel hinaus, und
 * zwei halbe Schritte sind ein ganzer.
 */
export function followBall(
  index: number,
  target: Vec3,
  lastTarget: Vec3,
  last: Vec3,
  dt: number,
): Vec3 {
  const tau = followTime(index);
  if (tau <= 0) return target;
  if (dt <= 0) return last;
  const e = Math.exp(-dt / tau);
  const r = tau / dt;
  const d = sub(target, lastTarget);
  return add(sub(target, scale(d, r)), add(sub(last, lastTarget), d, r), e);
}

/**
 * **Wie weit die Kugel `index` höchstens über der darunter hängen darf** —
 * in Kugelgrößen, bei einem Turm aus `count` Kugeln. Die unterste (0) sitzt
 * im Hörnchen und hängt gar nicht über. Mit der obersten Stelle `n = count − 1`
 * darf Kugel `k` höchstens `WOBBLE.lean / (n − k + 1)`: die oberste 0,9, die
 * darunter die Hälfte, dann ein Drittel, ein Viertel … — nicht gerade,
 * sondern wie das obere Ende einer S-Kurve.
 */
export function leanLimit(index: number, count: number): number {
  if (index <= 0 || index >= count) return 0;
  return WOBBLE.lean / (count - index);
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
 * @param count wie viele Kugeln es sind — neue erscheinen an ihrem Platz oben
 *              auf dem Turm, überzählige fallen weg
 * @param spacing der Abstand zweier Kugelmitten, in Metern
 * @param size  wie groß eine Kugel ist (ihr Durchmesser), in Metern — daran
 *              misst sich der Überhang (`leanLimit`); ohne Angabe der Abstand
 */
export function stepWobble(
  state: WobbleState,
  base: Vec3,
  axis: Vec3,
  count: number,
  spacing: number,
  dt: number,
  size: number = spacing,
): WobbleState {
  const fromBase = state.base ?? base;
  const fromAxis = state.axis ?? axis;
  let dir = state.dir ?? stackDirection(axis);
  // Die Ansicht darf `balls` kürzen (eine neue Sorte oben), die Kette folgt.
  const kept = Math.max(0, Math.min(count, state.balls.length));
  const chain: Vec3[] = state.chain.slice(0, kept);
  const limits: number[] = state.limits.slice(0, kept);
  // **Neue Kugeln oben drauf**, an ihrem Platz: Die Kugel kommt vom
  // Portionierer und soll dort sitzen, wo man sie hingesetzt hat.
  while (chain.length < count) {
    const below = chain[chain.length - 1];
    chain.push(below ? add(below, dir, spacing) : fromBase);
  }
  while (limits.length < count) limits.push(leanLimit(limits.length, count));
  const total = Math.min(Math.max(0, dt), WOBBLE.maxDt);
  const pieces = Math.max(1, Math.ceil(total / WOBBLE.step - 1e-9));
  const h = total / pieces;
  // Die Grenzen ziehen ihrem Wert nach — ohne Überschießen, geschlossen.
  const pull = 1 - Math.exp(-total / WOBBLE.relimit);
  for (let i = 0; i < limits.length; i++) {
    limits[i] = limits[i]! + (leanLimit(i, count) - limits[i]!) * pull;
  }
  for (let k = 1; k <= pieces; k++) {
    // Hörnchen und Achse wandern gleichmäßig vom letzten Bild zu diesem.
    const at = k === pieces ? base : lerp(fromBase, base, k / pieces);
    const along = normal(lerp(fromAxis, axis, k / pieces), normal(axis));
    const lastDir = dir;
    dir = turnToward(dir, stackDirection(along), 1 - Math.exp(-h / WOBBLE.tilt));
    // Von unten nach oben: Das Ziel jeder Kugel ist die Kugel darunter, vorher
    // und nachher — `before` hält die Stelle der unteren vor diesem Stück.
    let before = chain[0]!;
    chain[0] = at;
    for (let i = 1; i < chain.length; i++) {
      const target = add(chain[i - 1]!, dir, spacing);
      const lastTarget = add(before, lastDir, spacing);
      before = chain[i]!;
      let p = followBall(i, target, lastTarget, before, h);
      // Zum Platz hin gehalten: Weiter als `reach` Grenzen hängt nichts über.
      const reach = WOBBLE.reach * limits[i]! * size;
      const off = sub(p, target);
      const far = length(off);
      if (far > reach) p = add(target, off, reach / far);
      chain[i] = p;
    }
  }
  // **Gezeigt wird weich begrenzt**: jedes Glied mit seinem gestauchten
  // Überhang auf die gezeigte Kugel darunter gesetzt, jedes mit seiner Grenze.
  const balls: Vec3[] = [];
  chain.forEach((p, i) => {
    if (i === 0) {
      balls.push(p);
      return;
    }
    const over = sub(p, add(chain[i - 1]!, dir, spacing));
    balls.push(add(add(balls[i - 1]!, dir, spacing), softLean(over, limits[i]! * size)));
  });
  return { balls, chain, limits, dir, base, axis };
}

/**
 * **Ein Überhang, weich begrenzt** — Richtung bleibt, Länge `r` wird zu
 * `limit · tanh(r / limit)`: für kleine `r` fast unverändert, streng wachsend
 * und immer unter `limit`, dem es sich aber schon bei `r ≈ 2 · limit` bis auf
 * wenige Prozent nähert.
 */
export function softLean(over: Vec3, limit: number): Vec3 {
  const r = length(over);
  if (r < 1e-12 || limit <= 0) return { x: 0, y: 0, z: 0 };
  return scale(over, (limit * Math.tanh(r / limit)) / r);
}

/**
 * **Wie weit die Kugel `i` von ihrem Platz im starren Turm weg ist** — für
 * Tests und für jeden, der wissen will, wie weit er gerade zurückhängt.
 */
export function wobbleLag(state: WobbleState, base: Vec3, axis: Vec3, spacing: number): number[] {
  const rest = restTower(base, axis, state.balls.length, spacing);
  return state.balls.map((b, i) => length(sub(b, rest[i]!)));
}
