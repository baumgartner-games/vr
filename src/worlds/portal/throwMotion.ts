/**
 * **Werfen**: wie schnell eine Hand wirklich war, und worum sich ein
 * geworfenes Messer dabei dreht.
 *
 * Zwei kleine Rechnungen, und beide sind Vorzeichen- und Zeitfragen — genau
 * die Sorte, die man in der Brille nicht mehr auseinanderhält. Deshalb stehen
 * sie hier, ohne three.js, mit Test daneben.
 *
 * ## Der Wurf kommt vor dem Loslassen
 *
 * Eine geglättete Geschwindigkeit ist für alles richtig, was *während* des
 * Haltens gefragt wird — und für den Wurf falsch. Wer wirft, öffnet die Hand
 * am Ende der Bewegung: der Griffknopf meldet das Loslassen ein paar
 * Millisekunden später, und da bremst der Arm schon wieder ab. Ein Mittelwert
 * über die letzten Bilder trifft dann genau in die Bremsphase, und das Messer
 * fällt beinahe senkrecht zu Boden, obwohl es geworfen wurde. Es fühlt sich an
 * wie „einen Tick zu spät erkannt", und das ist es auch.
 *
 * Also wird nicht der *letzte* Wert genommen, sondern der **schnellste im
 * Fenster**: was die Hand in den letzten `THROW_WINDOW` Sekunden im besten
 * Moment getan hat. Ein einzelnes Ausreißerbild kann das nicht auslösen, weil
 * je zwei benachbarte Bilder gemittelt werden — ein Wurf ist nie ein Bild
 * lang, ein Trackingzucken schon.
 *
 * ## Was fliegt, dreht sich auch
 *
 * Ein Dominostein, den man hochwirft, taumelt — ein Werkzeug flog wie ein
 * Brett. Der Unterschied lag nicht in der Physik, sondern darin, *woher* die
 * beiden ihren Drall bekommen: ein gegriffener Gegenstand hängt als
 * kinematischer Körper an der Hand, und Rapier liest seine Winkel­geschwindigkeit
 * beim Loslassen aus zwei aufeinanderfolgenden Lagen ab. Ein Werkzeug hängt
 * dagegen als Kind der Hand im Szenengraph und bekommt seinen Körper erst in
 * dem Moment, in dem es losgelassen wird — mit allem auf null.
 *
 * Also wird die **Drehung** der Hand genauso gemessen wie ihr Tempo: aus zwei
 * Lagen die kleine Drehung dazwischen, aus ihr die Achse und der Winkel je
 * Sekunde, und beim Loslassen wieder der schnellste Moment im Fenster. Was aus
 * der Hand geht, dreht sich damit weiter, wie es sich in der Hand gedreht hat.
 *
 * ## Geworfen wird nicht dorthin, wo der Arm gerade langfährt
 *
 * Das Tempo ist damit richtig, die **Richtung** war es nicht: Wer zielt, führt
 * den Arm von oben nach unten und hält die Klinge dabei die ganze Zeit auf das
 * Ziel — die Bewegung geht nach unten, gemeint ist geradeaus. Ein Wurf allein
 * aus der Bewegungsrichtung geht dann in den Boden, und es ist nicht zu
 * beheben, indem man die Hand anders bewegt: es *ist* die Wurfbewegung.
 *
 * Drei Antworten stehen bereit, und die Wahrheit liegt zwischen ihnen:
 *
 * 1. **Wohin die Hand fährt** — richtig für alles, was aus dem Handgelenk
 *    geschleudert wird, und allein zu wenig.
 * 2. **Wohin die Hand zeigt**, gemittelt über die letzten Bilder vor dem
 *    Loslassen (`AIM_TAIL`): ein einzelnes Bild ist Zittern, ein halbes
 *    Dutzend ist eine Absicht. Weil der Griffknopf das Öffnen der Hand ein
 *    paar Millisekunden zu spät meldet, liegt darin schon, wohin die Hand am
 *    Ende zeigt — das gesuchte „einen Moment warten" ist ohne Warten zu haben.
 * 3. **Wohin der Spieler schaut**. Das ist in fast jedem Spiel, das Wurfwaffen
 *    hat, die eigentliche Zielhilfe, und es ist die ehrlichste: Niemand wirft
 *    an dem vorbei, was er ansieht.
 *
 * Der Blick zieht deshalb den Wurf zu sich, aber nur, solange beide Strahlen
 * ohnehin zusammenpassen: bis `GAZE_LOCK` ist der Blick gemeint und gewinnt
 * ganz, bis `GAZE_FADE` verläuft sich seine Hilfe, und darüber hinaus zählt
 * nur die Hand. Wer nach rechts wirft und geradeaus schaut, wirft nach rechts
 * — eine Zielhilfe, die einem den Wurf aus der Hand dreht, ist keine.
 *
 * ## Ein Messer dreht sich vorwärts
 *
 * Ein geworfenes Messer überschlägt sich in der **Ebene des Wurfs**: die
 * Spitze geht oben herum nach vorn. Die Drehachse dafür ist die Waagerechte
 * quer zur Flugrichtung — `oben × Flug` —, und sie hängt damit am Wurf und
 * nicht daran, wie herum das Werkzeug gerade in der Faust liegt. Vorher war es
 * die x-Achse des Werkzeugs, und die steht in der rechten Hand anders als in
 * der linken: aus derselben Wurfbewegung wurde einmal ein Überschlag nach
 * vorn und einmal einer nach hinten.
 */

/** Ein Punkt oder eine Geschwindigkeit — dieselben drei Zahlen. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Eine Drehung, wie three.js sie schreibt. */
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Wie weit ein Wurf zurückblickt, in Sekunden.
 *
 * Lang genug, dass das Loslassen und der schnellste Moment davor
 * hineinpassen (auf einer Quest sind das ein Dutzend Bilder), kurz genug, dass
 * eine Handbewegung von vorhin nicht mehr mitzählt.
 */
export const THROW_WINDOW = 0.14;

/** Wie träge das laufende Tempo folgt — für alles, was nicht der Wurf ist. */
export const SPEED_SMOOTH = 26;

/**
 * Wie weit die **Zeigerichtung** zurückblickt, in Sekunden.
 *
 * Kürzer als das Fenster für das Tempo, und aus dem umgekehrten Grund: Das
 * Tempo sucht den Gipfel *mitten* in der Bewegung, die Richtung will das
 * *Ende* — wohin die Hand zuletzt zeigte, als sie aufging. Vier, fünf Bilder
 * reichen dafür, damit ein Zucken keine Richtung wird, und sind kurz genug,
 * dass das Ausholen von vorhin nicht mehr hineinredet.
 */
export const AIM_TAIL = 0.06;

/**
 * Wie stark die Zeigerichtung der Hand gegenüber ihrer Bewegungsrichtung wiegt
 * — 0 wäre reines Schleudern, 1 reines Zeigen.
 *
 * Etwas über der Hälfte: Wer wirft, meint eher, wohin er hält, als wohin sein
 * Arm gerade fährt — aber ein Wurf über die Schulter oder von unten soll auch
 * dorthin gehen, wohin er geschleudert wurde.
 */
export const AIM_WEIGHT = 0.6;

/**
 * Bis zu diesem Winkel zwischen Wurf und Blick ist der Blick gemeint, in
 * Radiant (gut 10°) — dann fliegt das Messer genau dorthin, wohin geschaut
 * wird.
 */
export const GAZE_LOCK = 0.18;

/**
 * Und ab diesem Winkel gar nicht mehr (Radiant, 35°): Was so weit neben dem
 * Blick geworfen wird, ist absichtlich dorthin geworfen.
 */
export const GAZE_FADE = 0.61;

interface Sample {
  x: number;
  y: number;
  z: number;
  /** Die Drehung im selben Bild, in Radiant je Sekunde. */
  sx: number;
  sy: number;
  sz: number;
  /** Wohin die Hand in diesem Bild zeigte, als Einheitsvektor. */
  ax: number;
  ay: number;
  az: number;
  /** Ob zu diesem Bild überhaupt eine Zeigerichtung kam. */
  aimed: boolean;
  /** Wie lange her, in Sekunden. */
  age: number;
}

/**
 * Das Tempo einer Hand: laufend geglättet, und dazu das Beste aus dem Fenster.
 *
 * Gefüttert wird sie mit der **Position** der Hand; die Ableitung macht sie
 * selbst, denn nur so weiß sie, welche Bilder zusammengehören.
 */
export class HandSpeed {
  /** Das geglättete Tempo — was die Hand gerade tut. */
  readonly velocity: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly last: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly lastTurn: Quat = { x: 0, y: 0, z: 0, w: 1 };
  /** Ob zur Position auch eine Drehung mitkommt. */
  private turning = false;
  private known = false;
  private readonly samples: Sample[] = [];

  /**
   * Eine neue Handposition, und wie lange das letzte Bild gedauert hat.
   *
   * @param rotation die Lage der Hand im selben Bild. Ohne sie bleibt der
   *                 Drall null — wer nur wirft, braucht keine.
   * @param aim      wohin die Hand in diesem Bild zeigt — der Zeigestrahl,
   *                 nicht die Griffachse. Ohne ihn bleibt die Wurfrichtung
   *                 die reine Bewegungsrichtung wie früher.
   */
  feed(position: Vec3, dt: number, rotation?: Quat, aim?: Vec3): void {
    if (!(dt > 0)) return;
    if (!this.known) {
      this.last.x = position.x;
      this.last.y = position.y;
      this.last.z = position.z;
      if (rotation) copyQuat(rotation, this.lastTurn);
      this.turning = Boolean(rotation);
      this.known = true;
      return;
    }
    const vx = (position.x - this.last.x) / dt;
    const vy = (position.y - this.last.y) / dt;
    const vz = (position.z - this.last.z) / dt;
    this.last.x = position.x;
    this.last.y = position.y;
    this.last.z = position.z;

    let sx = 0;
    let sy = 0;
    let sz = 0;
    if (rotation && this.turning) {
      spinBetween(this.lastTurn, rotation, dt, _spin);
      sx = _spin.x;
      sy = _spin.y;
      sz = _spin.z;
    }
    if (rotation) {
      copyQuat(rotation, this.lastTurn);
      this.turning = true;
    }

    const blend = Math.min(1, dt * SPEED_SMOOTH);
    this.velocity.x += (vx - this.velocity.x) * blend;
    this.velocity.y += (vy - this.velocity.y) * blend;
    this.velocity.z += (vz - this.velocity.z) * blend;

    const aimed = Boolean(aim && normalize(aim, _aim));
    for (const sample of this.samples) sample.age += dt;
    while (this.samples.length && this.samples[0]!.age > THROW_WINDOW) this.samples.shift();
    this.samples.push({
      x: vx,
      y: vy,
      z: vz,
      sx,
      sy,
      sz,
      ax: aimed ? _aim.x : 0,
      ay: aimed ? _aim.y : 0,
      az: aimed ? _aim.z : 0,
      aimed,
      age: 0,
    });
  }

  /**
   * Womit ein jetzt losgelassener Gegenstand fliegt: der schnellste Moment im
   * Fenster, über je zwei benachbarte Bilder gemittelt.
   *
   * Ohne ein einziges Bild Vorgeschichte bleibt nur die Ruhe — dann ist die
   * Hand gerade erst aufgetaucht, und das ist kein Wurf.
   */
  throwVelocity(out: Vec3): Vec3 {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    let best = -1;
    for (let i = 0; i < this.samples.length; i++) {
      const a = this.samples[i]!;
      const b = this.samples[i + 1] ?? a;
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;
      const z = (a.z + b.z) / 2;
      const speed = x * x + y * y + z * z;
      if (speed <= best) continue;
      best = speed;
      out.x = x;
      out.y = y;
      out.z = z;
    }
    return out;
  }

  /**
   * Und **womit es sich dabei dreht**, in Radiant je Sekunde — nach derselben
   * Regel wie das Tempo: der schnellste Moment im Fenster, über je zwei
   * benachbarte Bilder gemittelt.
   *
   * Getrennt vom Tempo und nicht aus demselben Bild genommen: eine Hand, die
   * am Ende einer Wurfbewegung aufdreht, tut das eine Spur später als sie
   * beschleunigt, und der Drall ist gerade dann am größten, wenn losgelassen
   * wird. Ohne Drehungen im Fenster kommt Null heraus — ein Werkzeug, das
   * unverdreht abgelegt wird, fliegt auch unverdreht.
   */
  throwSpin(out: Vec3): Vec3 {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    let best = -1;
    for (let i = 0; i < this.samples.length; i++) {
      const a = this.samples[i]!;
      const b = this.samples[i + 1] ?? a;
      const x = (a.sx + b.sx) / 2;
      const y = (a.sy + b.sy) / 2;
      const z = (a.sz + b.sz) / 2;
      const rate = x * x + y * y + z * z;
      if (rate <= best) continue;
      best = rate;
      out.x = x;
      out.y = y;
      out.z = z;
    }
    return out;
  }

  /**
   * **Wohin die Hand am Ende zeigte** — der Mittelwert der letzten `AIM_TAIL`
   * Sekunden, als Einheitsvektor.
   *
   * Gemittelt und nicht das letzte Bild genommen: Eine Hand, die sich öffnet,
   * kippt dabei ein wenig, und die Handverfolgung zappelt im selben Moment am
   * meisten — beides zusammen ist genau das Bild, auf das man den Wurf nicht
   * stellen will.
   *
   * @returns `false`, wenn im Fenster keine Zeigerichtung steht; `out` bleibt
   *          dann unberührt.
   */
  throwAim(out: Vec3): boolean {
    let x = 0;
    let y = 0;
    let z = 0;
    for (const sample of this.samples) {
      if (!sample.aimed || sample.age > AIM_TAIL) continue;
      x += sample.ax;
      y += sample.ay;
      z += sample.az;
    }
    _sum.x = x;
    _sum.y = y;
    _sum.z = z;
    return normalize(_sum, out);
  }

  /** Die Hand ist weg — was sie vorhin tat, ist kein Wurf mehr. */
  forget(): void {
    this.known = false;
    this.turning = false;
    this.samples.length = 0;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;
  }
}

const _spin: Vec3 = { x: 0, y: 0, z: 0 };
const _aim: Vec3 = { x: 0, y: 0, z: 0 };
const _sum: Vec3 = { x: 0, y: 0, z: 0 };
const _handAim: Vec3 = { x: 0, y: 0, z: 0 };
const _gazeAim: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * Normiert `v` nach `out`.
 *
 * @returns `false`, wenn `v` keine Richtung hat — `out` bleibt dann unberührt,
 *          damit „keine Antwort" nicht als Nullvektor durchgeht.
 */
export function normalize(v: Vec3, out: Vec3): boolean {
  const length = Math.hypot(v.x, v.y, v.z);
  if (!Number.isFinite(length) || length < 1e-6) return false;
  out.x = v.x / length;
  out.y = v.y / length;
  out.z = v.z / length;
  return true;
}

/**
 * Wie stark der Blick den Wurf an sich zieht, nach dem Winkel zwischen beiden.
 *
 * Innerhalb von `GAZE_LOCK` ganz, jenseits von `GAZE_FADE` gar nicht, und
 * dazwischen weich (`3t²−2t³`) statt in einer Kante: Ein Sprung mitten im
 * Kegel wäre in der Brille zu spüren — zwei fast gleiche Würfe gingen an
 * verschiedene Orte, und niemand käme darauf, dass ein Grad Unterschied das
 * gemacht hat.
 */
export function gazeWeight(angle: number): number {
  if (!Number.isFinite(angle)) return 0;
  if (angle <= GAZE_LOCK) return 1;
  if (angle >= GAZE_FADE) return 0;
  const t = (GAZE_FADE - angle) / (GAZE_FADE - GAZE_LOCK);
  return t * t * (3 - 2 * t);
}

/**
 * Dreht `from` um den Anteil `t` nach `to` — beide als Einheitsvektoren, das
 * Ergebnis wieder normiert.
 *
 * Kein echtes Slerp: Über die Winkel, um die es hier geht (keiner über 35°),
 * ist der Unterschied kleiner als die Handverfolgung wackelt, und ein normiert
 * gemischter Vektor kann nicht in einen Nullvektor laufen — außer bei genau
 * entgegengesetzten Richtungen, und die kommen aus dem Kegel nie heraus.
 */
function towards(from: Vec3, to: Vec3, t: number, out: Vec3): void {
  if (!(t > 0)) return;
  _sum.x = from.x + (to.x - from.x) * t;
  _sum.y = from.y + (to.y - from.y) * t;
  _sum.z = from.z + (to.z - from.z) * t;
  normalize(_sum, out);
}

/** Der Winkel zwischen zwei Einheitsvektoren, in Radiant. */
function angleBetween(a: Vec3, b: Vec3): number {
  return Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z)));
}

/**
 * **Wohin ein Wurf geht**: aus der Bewegung der Hand, ihrer Zeigerichtung und
 * dem Blick — als Einheitsvektor, das Tempo legt der Aufrufer daneben.
 *
 * Erst wird die Bewegungsrichtung zur Zeigerichtung hin gedreht (`AIM_WEIGHT`),
 * dann das Ergebnis zum Blick (`gazeWeight`). In dieser Reihenfolge, weil der
 * Blick über den fertigen Wurf entscheidet und nicht über einen Zwischenstand:
 * Ob eine Zielhilfe greift, soll davon abhängen, wohin geworfen wird, und
 * nicht davon, wie die Hand dabei lag.
 *
 * Eine Zeigerichtung, die dem Wurf entgegensteht, wird übergangen: Wer beim
 * Ausholen nach hinten zeigt, wirft trotzdem nach vorn, und ein halb
 * umgedrehter Wurf wäre schlimmer als gar keine Hilfe.
 *
 * @param aim  wohin die Hand am Ende zeigte, oder `null`
 * @param gaze wohin der Spieler von der Klinge aus schaut, oder `null`
 * @returns `false`, wenn die Bewegung keine Richtung hergibt — dann ist das
 *          kein Wurf, und `out` bleibt unberührt.
 */
export function throwDirection(
  motion: Vec3,
  aim: Vec3 | null,
  gaze: Vec3 | null,
  out: Vec3,
): boolean {
  if (!normalize(motion, out)) return false;
  if (aim && normalize(aim, _handAim)) {
    const along = out.x * _handAim.x + out.y * _handAim.y + out.z * _handAim.z;
    if (along > 0) towards(out, _handAim, AIM_WEIGHT, out);
  }
  if (gaze && normalize(gaze, _gazeAim)) {
    towards(out, _gazeAim, gazeWeight(angleBetween(out, _gazeAim)), out);
  }
  return true;
}

function copyQuat(from: Quat, to: Quat): void {
  to.x = from.x;
  to.y = from.y;
  to.z = from.z;
  to.w = from.w;
}

/**
 * Die **Winkelgeschwindigkeit** zwischen zwei Lagen, in Radiant je Sekunde.
 *
 * Der Weg von `from` nach `to` ist die Drehung `to · from⁻¹`; ihr Vektoranteil
 * ist für kleine Winkel die halbe Achse mal dem Winkel, also `ω = 2·v/dt`. Bei
 * 72 Bildern je Sekunde ist „klein" jede Drehung, die ein Handgelenk schafft.
 *
 * Das Vorzeichen der Drehung ist frei — `q` und `−q` sind dieselbe Lage —, und
 * ohne die Umkehrung bei negativem `w` käme aus einer winzigen Drehung
 * gelegentlich eine fast volle heraus, in die falsche Richtung.
 */
export function spinBetween(from: Quat, to: Quat, dt: number, out: Vec3): Vec3 {
  // to · from⁻¹, mit from⁻¹ = (−x, −y, −z, w) für eine normierte Drehung.
  let x = to.w * -from.x + to.x * from.w + to.y * -from.z - to.z * -from.y;
  let y = to.w * -from.y - to.x * -from.z + to.y * from.w + to.z * -from.x;
  let z = to.w * -from.z + to.x * -from.y - to.y * -from.x + to.z * from.w;
  const w = to.w * from.w - to.x * -from.x - to.y * -from.y - to.z * -from.z;
  if (w < 0) {
    x = -x;
    y = -y;
    z = -z;
  }
  const scale = 2 / dt;
  out.x = x * scale;
  out.y = y * scale;
  out.z = z * scale;
  return out;
}

/**
 * Worum sich ein geworfenes Messer dreht: die Waagerechte quer zum Flug, so
 * dass die Spitze **oben herum nach vorn** geht.
 *
 * `oben × Flug` ist genau diese Achse. Sie kommt normiert heraus, die
 * Umdrehungen pro Sekunde legt der Aufrufer daneben.
 *
 * @returns `false`, wenn der Wurf senkrecht nach oben oder unten geht — dann
 *          gibt es keine Ebene, in der ein Überschlag „vorwärts" hieße, und
 *          `out` bleibt unberührt.
 */
export function tumbleAxis(velocity: Vec3, out: Vec3): boolean {
  // oben × Flug, mit oben = (0, 1, 0) — von Hand ausgeschrieben bleiben zwei
  // Komponenten übrig.
  const x = velocity.z;
  const z = -velocity.x;
  const length = Math.hypot(x, z);
  if (!Number.isFinite(length) || length < 1e-4) return false;
  out.x = x / length;
  out.y = 0;
  out.z = z / length;
  return true;
}
