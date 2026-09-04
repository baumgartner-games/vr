/**
 * Wo eine Faust an einem **Stiel** liegt — die Rechnung hinter dem großen
 * Hammer.
 *
 * Jedes andere Werkzeug hat genau einen Griff, und deshalb hat es die Frage
 * nicht: sein Ursprung *ist* der Griff, `holdPosition` legt ihn in die Hand,
 * und damit ist alles gesagt. Ein Stab ist anders. Eine Lanze fasst man weit
 * hinten, um Reichweite zu haben, und weit vorn, um sie zu führen; einen Hammer
 * am Knauf, um zuzuschlagen, und am Kopf, um ihn zu tragen. Das ist keine
 * Einstellung, die man einmal trifft, sondern etwas, das man mitten in der
 * Bewegung ändert — also gehört es in die Mechanik und nicht ins Menü.
 *
 * Der Stiel liegt auf der **z-Achse** des Werkzeugs, der Kopf bei negativem z:
 * dorthin zeigt jedes Werkzeug in dieser Welt (`aim.ts`), und ein Stab, dessen
 * Spitze woanders hinschaut als die Pistole daneben, wäre die eine Ausnahme,
 * die alles wieder erklärungsbedürftig macht. Ein **Griffpunkt** ist damit eine
 * einzige Zahl: die z-Koordinate der Faust auf dieser Achse.
 *
 * Zwei Größen stehen hier, und beide sind es wert, ohne Brille geprüft zu
 * werden:
 *
 * - **Ein Griff** ist nur eine Beschneidung — man kann den Kopf nicht anfassen
 *   und hinter dem Knauf ist keine Luft mehr.
 * - **Zwei Griffe** legen den Stab *zwischen* die Hände, und das ist die
 *   Rechnung, die im Headset niemand mehr nachvollzieht: aus zwei Punkten im
 *   Raum und zwei Zahlen am Stiel wird eine Achse und ein Ursprung, und ob die
 *   Vorzeichen dabei stimmen, sieht man erst daran, ob der Hammer nach vorn
 *   oder nach hinten zeigt.
 *
 * Ohne three.js, wie `aim.ts`, `droneFlight.ts` und `handGrip.ts`, damit die
 * Vorzeichen einzeln geprüft werden können statt erst in der Brille.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Der **greifbare** Teil eines Stiels, in Metern auf dessen z-Achse. */
export interface Shaft {
  /** Vorderes Ende, kopfseitig — die kleinere Zahl, denn der Kopf liegt bei -z. */
  front: number;
  /** Hinteres Ende, am Knauf. */
  back: number;
}

/** Eine Hand am Stiel: wo sie im Raum ist, und wo sie am Stiel zupackt. */
export interface Hold {
  point: Vec3;
  /** Griffpunkt auf der z-Achse des Stiels, in Metern. */
  z: number;
}

/** Wie ein Stab im Raum liegt: sein Ursprung, und wohin sein +z zeigt. */
export interface Span {
  origin: Vec3;
  /** Einheitsvektor der **+z**-Richtung — vom Kopf weg, nach hinten. */
  axis: Vec3;
}

/**
 * Der Stiel des großen Hammers, und wo die Hand darauf ohne weiteres Zutun
 * liegt.
 *
 * Der Kopf sitzt bei -0,52 m, der Knauf bei +0,48 — ein Meter Stange. Angefasst
 * wird nicht bis in den Kopf hinein: die letzten Zentimeter davor sind Eisen,
 * und eine Faust, die dort liegt, sieht danach aus, als stecke sie im Metall.
 *
 * `HAMMER_HOME` ist der Griff, mit dem er aus dem Gürtel kommt — weit hinten,
 * weil das die Haltung ist, in der ein Hammer ein Hammer ist. Wer ihn anders
 * fassen will, schiebt die Hand daran entlang.
 */
export const HAMMER_SHAFT: Shaft = { front: -0.26, back: 0.42 };
export const HAMMER_HOME = 0.28;

/**
 * Die kleinste Spanne zwischen zwei Griffen, aus der sich noch eine Richtung
 * lesen lässt.
 *
 * Zwei Fäuste dicht beieinander sagen über die Achse eines Meterstabs nichts:
 * ein Zentimeter Wackeln an einer Hand kippt ihn dann um Dutzende Grad. Unter
 * dieser Spanne bleibt der Stab deshalb einhändig in der führenden Hand, und
 * die zweite liegt bloß daneben.
 */
export const MIN_SPAN = 0.1;

/** Ab dieser Kopfgeschwindigkeit zählt eine Bewegung als Schlag, in m/s. */
export const SWING_MIN = 1.6;
/** Und schneller als das wird nichts mehr — ein Zucken soll nichts wegschießen. */
export const SWING_MAX = 9;
/** Wie viel vom Tempo des Kopfes im getroffenen Ding ankommt. */
export const SWING_TRANSFER = 0.75;

/** Ein Griffpunkt, der wirklich am Stiel liegt. */
export function clampShaftGrip(shaft: Shaft, z: number): number {
  if (!Number.isFinite(z)) return shaft.back;
  return Math.min(shaft.back, Math.max(shaft.front, z));
}

/**
 * Wie ein Stab zwischen zwei Fäusten liegt.
 *
 * Gesucht ist die Lage, in der der Stielpunkt `a.z` in der Hand `a` und der
 * Stielpunkt `b.z` in der Hand `b` liegt. Die **Achse** folgt aus der
 * Reihenfolge der beiden am Stiel und nicht daraus, welche Hand die führende
 * ist: die Hand mit dem größeren `z` sitzt weiter hinten, also zeigt +z von der
 * vorderen zur hinteren — und der Kopf bei -z damit nach vorn, dorthin, wohin
 * der Stab geschwungen wird. Genau dieses Vorzeichen ist der Grund für diese
 * Datei.
 *
 * Der **Ursprung** ist ein Mittelwert und keine Wahl: die Hände stehen selten
 * genau so weit auseinander wie ihre Griffpunkte am Stiel, und ein Stab, der
 * dann in einer der beiden Hände einrastet, rutscht sichtbar durch die andere.
 * So verteilt sich die Differenz gleichmäßig auf beide — der Stab bleibt so
 * lang, wie er ist, und liegt symmetrisch falsch statt einseitig richtig.
 *
 * @returns `null`, wenn die beiden Griffe zu dicht beieinander liegen oder die
 *          Hände im selben Punkt stehen. Dann gibt es keine Achse, nur Rauschen.
 */
export function spanPole(a: Hold, b: Hold): Span | null {
  const gap = a.z - b.z;
  if (!Number.isFinite(gap) || Math.abs(gap) < MIN_SPAN) return null;
  const dx = a.point.x - b.point.x;
  const dy = a.point.y - b.point.y;
  const dz = a.point.z - b.point.z;
  const length = Math.hypot(dx, dy, dz);
  if (!Number.isFinite(length) || length < 1e-4) return null;
  // Der Betrag steckt in der Normierung, das Vorzeichen in der Reihenfolge am
  // Stiel: `gap > 0` heißt „a liegt hinten", und dann zeigt +z von b nach a.
  const scale = (gap > 0 ? 1 : -1) / length;
  const axis = { x: dx * scale, y: dy * scale, z: dz * scale };
  return {
    origin: {
      x: (a.point.x - a.z * axis.x + (b.point.x - b.z * axis.x)) / 2,
      y: (a.point.y - a.z * axis.y + (b.point.y - b.z * axis.y)) / 2,
      z: (a.point.z - a.z * axis.z + (b.point.z - b.z * axis.z)) / 2,
    },
    axis,
  };
}

/**
 * Was ein Schlag im getroffenen Ding anrichtet, als Geschwindigkeit in m/s.
 *
 * Kein Impuls, sondern ein Tempo: die Welt setzt einem angestoßenen Objekt die
 * Geschwindigkeit (`ToolHost.pushProp`), und damit fliegt eine Kiste so weit
 * wie ein Dominostein. Das ist die Untertreibung, die man in Kauf nimmt — die
 * Alternative wäre eine Masse pro Objekt in einer Rechnung, die keine Physik
 * ist und auch keine sein will.
 *
 * Unter `SWING_MIN` passiert gar nichts: eine Hand steht nie still, und ein
 * Hammer, der beim Danebenhalten schon schubst, ist ein Hammer, mit dem man
 * nichts mehr hinstellen kann.
 */
export function swingPush(speed: number): number {
  if (!Number.isFinite(speed) || speed < SWING_MIN) return 0;
  return Math.min(speed, SWING_MAX) * SWING_TRANSFER;
}
