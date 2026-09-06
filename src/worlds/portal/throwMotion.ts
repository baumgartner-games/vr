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

interface Sample {
  x: number;
  y: number;
  z: number;
  /** Die Drehung im selben Bild, in Radiant je Sekunde. */
  sx: number;
  sy: number;
  sz: number;
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
   */
  feed(position: Vec3, dt: number, rotation?: Quat): void {
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

    for (const sample of this.samples) sample.age += dt;
    while (this.samples.length && this.samples[0]!.age > THROW_WINDOW) this.samples.shift();
    this.samples.push({ x: vx, y: vy, z: vz, sx, sy, sz, age: 0 });
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
