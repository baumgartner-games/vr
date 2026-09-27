/**
 * **Der Turm auf dem Hörnchen** — wie die Eiskugeln der Bewegung des
 * Hörnchens folgen. Ohne three.js.
 *
 * Gewünscht war: Die Kugeln **fallen nie** herunter und folgen dem Hörnchen
 * **nicht starr** — die unterste sitzt fest im Hörnchen, jede darüber hängt
 * weiter zurück, und zwar nicht gleichmäßig, sondern nach oben hin immer
 * mehr: Wer mit dem Eis losläuft, sieht einen **gebogenen** Turm, dessen
 * Spitze am weitesten zurückhängt. Später dazu: _„Der Turm soll schon bei
 * weniger Kugeln stärker ausschlagen"_, und beim Anhalten sollen die Kugeln
 * **einmal** auf die andere Seite schwingen und zurück — _„aber ich will kein
 * endloses Hin- und Herwackeln"_.
 *
 * **Jedes Glied für sich, getrieben vom Hörnchen.** Wie weit eine Kugel über
 * ihrem Platz auf der darunter hängt (ihr „Glied"), hängt an der
 * Geschwindigkeit `v` des Hörnchens: Das Glied **will** um
 * `u = −v · followTime(Grenze)` überhängen, der Bewegung entgegen. Die Zeit
 * wächst mit der Grenze der Kugel (`WOBBLE.lag` = 36 ms für die oberste, jede
 * darunter im Verhältnis ihrer Grenze weniger) — jedes Glied steht beim
 * gleichmäßigen Gehen also im **selben Verhältnis zu seiner Grenze**, und weil
 * die Grenzen nach oben wie `1/x` wachsen (siehe unten), wächst auch der
 * Überhang so: nicht gerade, sondern gebogen. Früher lief jede Kugel der
 * darunter mit `1 ms · i²` nach; das ließ die unteren fast starr und die
 * oberste eines Turms aus fünf Kugeln nur halb so weit ausschlagen, wie sie
 * durfte.
 *
 * **Einmal hinüber, dann Ruhe.** Dem gewünschten Überhang `u` läuft eine
 * träge Größe `s` nach, mit einer **dreifachen** Verzögerung erster Ordnung:
 * `(D + a)³ s = a³ u`, mit der Rate `a = followRate(Grenze)` (17/s für die
 * oberste, `WOBBLE.rate`; die unteren flinker, `WOBBLE.stiff`). Drei gleiche,
 * reelle Pole — diese Größe schwingt nie, weder von allein noch bei
 * zitternder Hand, und schaukelt nichts auf. Gezeigt wird aber nicht `s`,
 * sondern `s + ṡ · (1 + 2b)/a` (`linkLean`, `b = WOBBLE.rebound` = 0,75): Der
 * Anteil der Geschwindigkeit trägt die Kugel über ihr Ziel hinaus. Bleibt das
 * Hörnchen nach gleichmäßigem Gehen stehen, ist der Überhang genau
 * `U · (1 + T − b·T²) · e^(−T)` mit `T = a·t` — ein Polynom mit **genau einer**
 * positiven Nullstelle: Das Glied geht **einmal** über seinen Platz hinaus
 * (bei der obersten nach 0,17 s), am weitesten nach `(2 + 1/b)/a` (0,28 s),
 * um `(1 + 4b) · e^(−2 − 1/b)` ≈ 14 % des Überhangs davor, und kriecht von
 * drüben zurück, ohne ein zweites Mal hinüberzugehen. Gezeigt (nach der
 * weichen Begrenzung, die den Überhang davor staucht) sind es gut 20 %. Beim
 * Losgehen dasselbe andersherum: Die oberste hängt nach 0,05 s halb so weit
 * zurück wie später, holt kurz etwas weiter aus und steht dann.
 *
 * Mit der Funktion aus dem ersten Wunsch („Index, Stelle des Hörnchens,
 * letzte Stelle des Hörnchens") ist `followBall(Grenze, ziel, letztesZiel,
 * letztesGlied, dt)` gemeint: Das Ziel ist das Hörnchen; aus ihm und der
 * letzten Stelle kommt `v`, und jedes Glied trägt seinen eigenen Zustand.
 *
 * **Die Neigung.** Die Richtung des Turms ist nicht die Achse des Hörnchens,
 * sondern **folgt** ihr ohne Überschießen: Sie dreht sich mit der
 * Zeitkonstante `WOBBLE.tilt` zu ihr hin (`WobbleState.dir`). Wer das
 * Hörnchen kippt, sieht den Turm erst noch aufrecht auf der Öffnung stehen
 * und sich dann hinüberneigen (0,2 s). Zum waagerechten Anteil der Achse kommt
 * ein Stück „Durchhängen" (`WOBBLE.sag`): Ein schräg gehaltenes Hörnchen
 * trägt seinen Turm am Ende etwas schräger, als es selbst steht. Aufrecht
 * gehalten ist dieser Anteil null, und der Turm steht gerade.
 *
 * **Nie herunter: nach oben immer weiter über.** Gerechnet werden die Glieder
 * frei (`WobbleState.links`); gezeigt werden sie **weich begrenzt**
 * (`softLean`): Der Überhang wird mit `L · tanh(r / L)` gestaucht. Kleine
 * bleiben fast, wie sie sind, große kommen `L` nahe und erreichen es nie —
 * auch nicht beim Zurückschwingen. Die Grenze `L` ist **je Kugel eine
 * andere** (`leanLimit`), gemessen in Kugelgrößen (dem Durchmesser, `size` in
 * `stepWobble`): Die unterste sitzt fest, die oberste darf bis 0,9
 * Kugelgrößen über der darunter hängen (`WOBBLE.lean`), die darunter die
 * Hälfte, dann ein Drittel, ein Viertel … (`0,9 / (n − k + 1)` für Kugel `k`
 * im Turm mit der obersten Stelle `n`) — wie das obere Ende einer S-Kurve.
 * Beim Gehen (2,6 m/s) steht jedes Glied bei 0,86 seiner Grenze, die oberste
 * also bei 0,78 Kugelgrößen, schon bei drei Kugeln; bei 0,5 m/s bei 0,24 (die
 * oberste 1,8 cm über der darunter). Egal wie heftig man schüttelt, keine
 * kommt über ihre Grenze. Kommt oben eine Kugel dazu, rücken alle Grenzen
 * darunter eine Stelle weiter nach unten und werden kleiner — damit das den
 * Turm nicht springen lässt, ziehen die Grenzen (`WobbleState.limits`) ihrem
 * neuen Wert mit der Zeitkonstante `WOBBLE.relimit` nach. Mehr als
 * `WOBBLE.reach` Grenzen will kein Glied überhängen — mehr sähe man ohnehin
 * nicht, und so kommt es nach einem Ruck schnell zurück.
 *
 * **Unabhängig von der Bildrate.** Die Verzögerung wird nicht mit
 * Euler-Schritten angenähert, sondern **geschlossen** gelöst — für ein
 * Hörnchen, das während des Schritts gleichmäßig vom letzten zum neuen Ort
 * wandert. Für so eines ist ein Schritt von 1/30 s genau dasselbe wie vier
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

/**
 * **Ein Glied des Turms** — wie eine Kugel über ihrem Platz auf der darunter
 * hängt. Gespeichert ist die träge Größe, die dem gewünschten Überhang
 * nachläuft, samt ihrer ersten und zweiten Ableitung; der Überhang selbst
 * ergibt sich daraus (`linkLean`).
 */
export interface WobbleLink {
  /** Die träge Größe, in Metern — sie läuft dem gewünschten Überhang nach. */
  readonly settle: Vec3;
  /** Wie schnell sie sich ändert, in Metern je Sekunde. */
  readonly speed: Vec3;
  /** Wie schnell sich das ändert, in Metern je Sekunde². */
  readonly accel: Vec3;
}

/** Der ganze Turm, von unten nach oben. */
export interface WobbleState {
  /** Wo die Kugeln gezeigt werden, von unten nach oben — weich begrenzt. */
  readonly balls: readonly Vec3[];
  /** Die Glieder dahinter, frei gerechnet — das der untersten bleibt null. */
  readonly links: readonly WobbleLink[];
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
  /**
   * Wie weit die oberste Kugel beim gleichmäßigen Gehen zurückhängt, als
   * Zeit: `v · lag` (vor der weichen Begrenzung). Jede darunter im selben
   * Verhältnis zu ihrer Grenze weniger — siehe `followTime`.
   */
  lag: 0.06,
  /**
   * Wie flink die oberste Kugel ihrem Überhang nachläuft, in 1/s — die Rate
   * `a` der dreifachen Verzögerung (`followBall`). Nach dem Anhalten ist sie
   * nach `2/a` Sekunden (0,17 s) über ihren Platz hinaus, nach `(2 + 1/rebound)/a`
   * (0,28 s) am weitesten drüben — gewünscht war ein etwas langsamerer Rückweg.
   */
  rate: 12,
  /**
   * Wie viel flinker die unteren sind: die Rate wächst mit
   * `(lean / Grenze)^stiff` — die zweitoberste um `2^stiff`, die dritte um `3^stiff` …
   */
  stiff: 0.3,
  /**
   * **Wie weit sie einmal zurückschwingt** — `b` in `(1 + T − b·T²)·e^(−T)`,
   * der Form des Rückwegs. 0 schwänge gar nicht über; bei 0,75 schwingt ein
   * Glied nach dem Anhalten um gut 14 % seines Überhangs auf die andere Seite
   * (`(1 + 4b)·e^(−2 − 1/b)`), und kommt dann **ohne ein zweites Mal** zurück.
   */
  rebound: 0.75,
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
   * Wie weit ein Glied höchstens überhängen **will**, als Vielfaches seiner
   * Grenze — darüber sähe man ohnehin nichts mehr.
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
  links: [],
  limits: [],
  dir: null,
  base: null,
  axis: null,
};

const ZERO: Vec3 = { x: 0, y: 0, z: 0 };
const REST: WobbleLink = { settle: ZERO, speed: ZERO, accel: ZERO };

const UP: Vec3 = { x: 0, y: 1, z: 0 };

function copy(a: Vec3): Vec3 {
  return { x: a.x, y: a.y, z: a.z };
}

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
 * **Wie weit eine Kugel beim Gehen zurückhängt, als Zeit** — bei der
 * Geschwindigkeit `v` will ihr Glied um `v · followTime(limit)` über ihrem
 * Platz hängen. `limit` ist ihre Grenze in Kugelgrößen (`leanLimit`); die
 * Zeit wächst mit ihr, jede Kugel steht also im selben Verhältnis zu ihrer
 * Grenze. Die unterste (Grenze 0) hängt gar nicht.
 */
export function followTime(limit: number): number {
  if (limit <= 0) return 0;
  return (WOBBLE.lag * limit) / WOBBLE.lean;
}

/**
 * **Wie flink eine Kugel nachläuft** — die Rate ihres Glieds, in 1/s. Die
 * oberste (Grenze `WOBBLE.lean`) mit `WOBBLE.rate`, jede darunter flinker:
 * `rate · (lean / limit)^stiff`.
 */
export function followRate(limit: number): number {
  if (limit <= 0) return Infinity;
  return WOBBLE.rate * Math.pow(WOBBLE.lean / Math.min(limit, WOBBLE.lean), WOBBLE.stiff);
}

/**
 * **Wie weit ein Glied gerade überhängt**, in Metern (vor der weichen
 * Begrenzung): die träge Größe plus ein Stück ihrer Geschwindigkeit,
 * `settle + speed · (1 + 2·rebound) / a` — dieser Anteil ist es, der sie
 * einmal über den Platz hinausschwingen lässt.
 */
export function linkLean(link: WobbleLink, limit: number): Vec3 {
  const a = followRate(limit);
  if (!Number.isFinite(a)) return ZERO;
  return add(link.settle, link.speed, (1 + 2 * WOBBLE.rebound) / a);
}

/**
 * **Wohin ein Glied in `dt` Sekunden kommt** — geschlossen gelöst.
 *
 * @param limit      die Grenze der Kugel, in Kugelgrößen (`leanLimit`) — 0
 *                   sitzt fest: Ergebnis ist die Ruhe
 * @param target     wo das Hörnchen jetzt ist
 * @param lastTarget wo es vor `dt` Sekunden war; dazwischen wandert es
 *                   gleichmäßig, mit `v = (target − lastTarget) / dt`
 * @param last       das Glied vor `dt` Sekunden
 * @param reach      weiter als so viele Meter will das Glied nicht überhängen
 *
 * Das Glied **will** um `u = −v · followTime(limit)` überhängen. Die träge
 * Größe läuft `u` mit einer **dreifachen** Verzögerung nach, `(D + a)³ s = a³ u`
 * mit `a = followRate(limit)` — drei gleiche, reelle Pole: Sie schwingt nie,
 * weder von allein noch bei zitternder Hand. Weil `u` während des Schritts
 * fest ist, gibt es die genaue Lösung: `s − u = (c₀ + c₁t + c₂t²)·e^(−at)`,
 * mit `c₀ = e₀`, `c₁ = ė₀ + a·e₀`, `c₂ = (ë₀ + 2a·ė₀ + a²·e₀)/2`. Sie ist für
 * jeden Schritt stabil, und zwei halbe sind ein ganzer.
 *
 * Gezeigt wird `s + ṡ · (1 + 2b)/a` (`linkLean`, `b = WOBBLE.rebound`). Bleibt
 * das Hörnchen stehen, ist das genau `U·(1 + T − b·T²)·e^(−T)` mit `T = a·t`
 * und `U` dem Überhang davor: Das Polynom hat **genau eine** positive
 * Nullstelle — das Glied schwingt einmal über seinen Platz hinaus, höchstens
 * um `(1 + 4b)·e^(−2 − 1/b)` (bei 0,75 gut 14 %), und kriecht von drüben
 * zurück, ohne ein zweites Mal hinüberzugehen.
 */
export function followBall(
  limit: number,
  target: Vec3,
  lastTarget: Vec3,
  last: WobbleLink,
  dt: number,
  reach: number = Infinity,
): WobbleLink {
  const lag = followTime(limit);
  if (lag <= 0) return REST;
  if (dt <= 0) return last;
  let goal = scale(sub(target, lastTarget), -lag / dt);
  const far = length(goal);
  if (far > reach) goal = scale(goal, reach / far);
  const a = followRate(limit);
  const e0 = sub(last.settle, goal);
  const c1 = add(last.speed, e0, a);
  const c2 = scale(add(add(last.accel, last.speed, 2 * a), e0, a * a), 0.5);
  const k = Math.exp(-a * dt);
  const p = add(add(e0, c1, dt), c2, dt * dt); // P(dt)
  const q = add(c1, c2, 2 * dt); // P′(dt)
  // e = P·k, ė = (P′ − aP)·k, ë = (P″ − 2aP′ + a²P)·k mit P″ = 2c₂.
  return {
    settle: add(goal, p, k),
    speed: scale(add(q, p, -a), k),
    accel: scale(add(add(scale(c2, 2), q, -2 * a), p, a * a), k),
  };
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
  // **Abgeschrieben, nicht behalten.** Die Ansicht reicht ein `THREE.Vector3`
  // herein, das sie im nächsten Bild wiederverwendet. Behielte der Zustand
  // es selbst, stünde im nächsten Bild in `state.base` schon die **neue**
  // Stelle — das Hörnchen hätte sich nie bewegt, `v` wäre immer null und der
  // Turm stünde starr (so war es nach #272, im Browser nachgemessen).
  // Die Rechnung mit Stellen (vor #272) merkte davon nichts: Sie trug die
  // Kugeln selbst als Zustand, nicht das Hörnchen.
  const now = copy(base);
  const up = copy(axis);
  const fromBase = state.base ?? now;
  const fromAxis = state.axis ?? up;
  let dir = state.dir ?? stackDirection(up);
  // Die Ansicht darf `balls` kürzen (eine neue Sorte oben), die Glieder folgen.
  const kept = Math.max(0, Math.min(count, state.balls.length));
  const links: WobbleLink[] = state.links.slice(0, kept);
  const limits: number[] = state.limits.slice(0, kept);
  // **Neue Kugeln oben drauf**, an ihrem Platz und in Ruhe: Die Kugel kommt
  // vom Portionierer und soll dort sitzen, wo man sie hingesetzt hat.
  while (links.length < count) links.push(REST);
  while (limits.length < count) limits.push(leanLimit(limits.length, count));
  const total = Math.min(Math.max(0, dt), WOBBLE.maxDt);
  const pieces = Math.max(1, Math.ceil(total / WOBBLE.step - 1e-9));
  const h = total / pieces;
  // Die Grenzen ziehen ihrem Wert nach — ohne Überschießen, geschlossen.
  const pull = 1 - Math.exp(-total / WOBBLE.relimit);
  for (let i = 0; i < limits.length; i++) {
    limits[i] = limits[i]! + (leanLimit(i, count) - limits[i]!) * pull;
  }
  if (total > 0) {
    let last = fromBase;
    for (let k = 1; k <= pieces; k++) {
      // Hörnchen und Achse wandern gleichmäßig vom letzten Bild zu diesem.
      const at = k === pieces ? now : lerp(fromBase, now, k / pieces);
      const along = normal(lerp(fromAxis, up, k / pieces), normal(up));
      dir = turnToward(dir, stackDirection(along), 1 - Math.exp(-h / WOBBLE.tilt));
      // Jedes Glied für sich, getrieben vom Hörnchen.
      for (let i = 1; i < links.length; i++) {
        const reach = WOBBLE.reach * limits[i]! * size;
        links[i] = followBall(limits[i]!, at, last, links[i]!, h, reach);
      }
      last = at;
    }
  }
  // **Gezeigt wird weich begrenzt**: jedes Glied mit seinem gestauchten
  // Überhang auf die gezeigte Kugel darunter gesetzt, jedes mit seiner Grenze.
  const balls: Vec3[] = [];
  links.forEach((link, i) => {
    if (i === 0) {
      balls.push(now);
      return;
    }
    balls.push(
      add(
        add(balls[i - 1]!, dir, spacing),
        softLean(linkLean(link, limits[i]!), limits[i]! * size),
      ),
    );
  });
  return { balls, links, limits, dir, base: now, axis: up };
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
