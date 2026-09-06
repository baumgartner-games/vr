/**
 * **Die Aufnahme**: wie stark eine Hand beschleunigt, und was davon der größte
 * Wert war.
 *
 * Ein Schlag, ein Wurf, ein Zucken — das sind alles Bewegungen, deren Zahl man
 * kennen will, bevor man eine Schwelle dafür in den Code schreibt (den Schlag
 * des Hammers, das Tempo eines Wurfs, das Schütteln der Sektflasche). Bisher
 * war die Antwort darauf „probier es aus und schau, ob etwas passiert". Hier
 * ist sie eine Aufnahme: Knopf an der Wand drücken, die Bewegung machen, und
 * an der Tafel steht, wie stark sie war.
 *
 * **Beschleunigung und nicht Tempo**, weil das die Größe ist, die man nicht
 * schätzen kann: ein Meter je Sekunde ist ein Schritt, den jeder kennt; 40 m/s²
 * ist eine Zahl, zu der niemand ein Gefühl hat, bis er sie einmal neben der
 * eigenen Bewegung gesehen hat. Deshalb steht sie doppelt da — in m/s² und in
 * **g**, denn ein g kennt man.
 *
 * Gemessen wird aus den **Positionen** der Hand, also zweimal abgeleitet, und
 * das rauscht: aus einem halben Millimeter Trackingzittern werden bei 72 Bildern
 * je Sekunde schnell zweistellige Werte. Beide Ableitungen laufen deshalb durch
 * dieselbe Glättung, und zwar in dieser Reihenfolge: erst das Tempo glätten,
 * dann daraus die Beschleunigung, dann die glätten. Was übrig bleibt, ist die
 * Bewegung und nicht der Sensor.
 *
 * Ohne three.js wie die übrige geprüfte Mathematik, damit man die Zahlen ohne
 * Brille nachrechnen kann.
 */

/** Drei Zahlen — ein Ort, ein Tempo oder eine Beschleunigung. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Wie schnell die Glättung dem Tempo folgt, in „je Sekunde". */
export const VELOCITY_SMOOTH = 24;
/** Und dasselbe für die Beschleunigung — träger, weil sie doppelt rauscht. */
export const ACCEL_SMOOTH = 14;

/** Erdbeschleunigung, damit neben der Zahl steht, wie viel g das sind. */
export const G = 9.81;

/**
 * Ein Messwerk für **eine** Hand: Tempo, Beschleunigung und der größte Wert
 * seit dem letzten `reset`.
 */
export class AccelMeter {
  /** Der Betrag der geglätteten Beschleunigung, in m/s². */
  now = 0;
  /** Das Größte, was seit dem Start gemessen wurde. */
  peak = 0;
  /** Und wann das war, in Sekunden seit dem Start. */
  peakAt = 0;

  private readonly last: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly velocity: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly accel: Vec3 = { x: 0, y: 0, z: 0 };
  private known = false;
  private moved = false;

  /**
   * Ein Bild weiter.
   *
   * @param position wo die Hand jetzt ist
   * @param dt       wie lange das Bild gedauert hat
   * @param clock    wie lange die Aufnahme schon läuft — nur damit ein Gipfel
   *                 seinen Zeitpunkt bekommt
   */
  feed(position: Vec3, dt: number, clock: number): void {
    if (!(dt > 0)) return;
    if (!this.known) {
      this.last.x = position.x;
      this.last.y = position.y;
      this.last.z = position.z;
      this.known = true;
      return;
    }
    const vx = (position.x - this.last.x) / dt;
    const vy = (position.y - this.last.y) / dt;
    const vz = (position.z - this.last.z) / dt;
    this.last.x = position.x;
    this.last.y = position.y;
    this.last.z = position.z;

    // Das erste Bild mit Tempo ist keine Beschleunigung, sondern der Sprung
    // von null auf die Bewegung, die schon lief: die Glättung fängt deshalb
    // bei diesem Wert an und nicht bei der Ruhe. Ohne das meldete jede
    // Aufnahme in ihrer ersten Zehntelsekunde einen Ruck, den es nicht gab.
    if (!this.moved) {
      this.moved = true;
      this.velocity.x = vx;
      this.velocity.y = vy;
      this.velocity.z = vz;
      return;
    }

    const before = { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z };
    const vBlend = Math.min(1, dt * VELOCITY_SMOOTH);
    this.velocity.x += (vx - this.velocity.x) * vBlend;
    this.velocity.y += (vy - this.velocity.y) * vBlend;
    this.velocity.z += (vz - this.velocity.z) * vBlend;

    const aBlend = Math.min(1, dt * ACCEL_SMOOTH);
    this.accel.x += ((this.velocity.x - before.x) / dt - this.accel.x) * aBlend;
    this.accel.y += ((this.velocity.y - before.y) / dt - this.accel.y) * aBlend;
    this.accel.z += ((this.velocity.z - before.z) / dt - this.accel.z) * aBlend;

    this.now = Math.hypot(this.accel.x, this.accel.y, this.accel.z);
    if (this.now > this.peak) {
      this.peak = this.now;
      this.peakAt = clock;
    }
  }

  /** Die Hand ist weg oder die Aufnahme fängt von vorn an. */
  reset(): void {
    this.now = 0;
    this.peak = 0;
    this.peakAt = 0;
    this.known = false;
    this.moved = false;
    this.velocity.x = this.velocity.y = this.velocity.z = 0;
    this.accel.x = this.accel.y = this.accel.z = 0;
  }
}

/** Welche Hand: dieselben beiden Namen wie überall. */
export type Side = 'left' | 'right';

/** Ein festgehaltener Augenblick während der Aufnahme. */
export interface Mark {
  /** Der wievielte, ab eins — so steht er auch auf der Tafel. */
  index: number;
  /** Sekunden seit dem Start der Aufnahme. */
  at: number;
  /** Wer gedrückt hat. */
  hand: Side;
  /** Was diese Hand in dem Moment gemessen hat, in m/s². */
  value: number;
}

/** Wie viele Marken die Tafel zeigt — die jüngsten zuerst. */
export const MARKS_SHOWN = 3;

/**
 * Eine laufende Aufnahme: zwei Messwerke und die Marken dazu.
 *
 * Die Marken sind der Grund, warum eine Aufnahme mehr ist als eine Anzeige:
 * „was war der Höchstwert" beantwortet das Messwerk von selbst, „was war der
 * Wert **in dem Moment, in dem ich es gemacht habe**" beantwortet nur ein
 * Druck auf den Knopf — und die Hand, die drückt, ist ja gerade beschäftigt.
 * Deshalb zählt jede Hand für sich, und die Marke merkt sich, welche es war.
 */
export class AccelRecording {
  /** Sekunden seit dem Start. */
  elapsed = 0;
  readonly marks: Mark[] = [];
  private readonly meters: Record<Side, AccelMeter> = {
    left: new AccelMeter(),
    right: new AccelMeter(),
  };

  meter(hand: Side): AccelMeter {
    return this.meters[hand];
  }

  /** Ein Bild weiter, für eine Hand. `null` heißt: diese Hand ist gerade weg. */
  feed(hand: Side, position: Vec3 | null, dt: number): void {
    const meter = this.meters[hand];
    if (!position) {
      meter.reset();
      return;
    }
    meter.feed(position, dt, this.elapsed);
  }

  /** Die Uhr, einmal je Bild — vor dem Füttern, damit Marken dieselbe Zeit tragen. */
  tick(dt: number): void {
    if (dt > 0) this.elapsed += dt;
  }

  /** Den Augenblick festhalten, den diese Hand gerade misst. */
  mark(hand: Side): Mark {
    const entry: Mark = {
      index: this.marks.length + 1,
      at: this.elapsed,
      hand,
      value: this.meters[hand].now,
    };
    this.marks.push(entry);
    return entry;
  }

  /** Der größte Wert der Aufnahme, über beide Hände — und wessen er war. */
  peak(): { value: number; hand: Side; at: number } {
    const left = this.meters.left;
    const right = this.meters.right;
    const hand: Side = right.peak >= left.peak ? 'right' : 'left';
    const meter = this.meters[hand];
    return { value: meter.peak, hand, at: meter.peakAt };
  }
}

/** Eine Beschleunigung, wie sie auf der Tafel steht: m/s² und g nebeneinander. */
export function formatAccel(value: number): string {
  if (!Number.isFinite(value)) return '–';
  return `${value.toFixed(1)} m/s² · ${(value / G).toFixed(1)} g`;
}

function handLabel(hand: Side): string {
  return hand === 'left' ? 'links' : 'rechts';
}

/**
 * Was während (und nach) einer Aufnahme auf der Tafel steht — eine Zeile je
 * Auskunft, kurz genug, dass sie in einer Zeile bleibt.
 *
 * Ohne Aufnahme steht dort, was der Knopf tut. Das ist die Zeile, die man
 * liest, bevor man ihn zum ersten Mal drückt, und sie ist deshalb keine
 * Verlegenheit, sondern die Anleitung.
 */
export function recordLines(recording: AccelRecording | null, done: AccelRecording | null): string {
  const source = recording ?? done;
  if (!source) {
    return 'Knopf drückt Start · Greifen setzt eine Marke\nGemessen wird, wie stark die Hand beschleunigt';
  }
  const peak = source.peak();
  const lines = [
    recording
      ? `läuft · ${source.elapsed.toFixed(1)} s`
      : `beendet · ${source.elapsed.toFixed(1)} s`,
    peak.value > 0
      ? `Max ${formatAccel(peak.value)} (${handLabel(peak.hand)}, ${peak.at.toFixed(1)} s)`
      : 'Max — noch nichts gemessen',
  ];
  if (recording) {
    const now = Math.max(recording.meter('left').now, recording.meter('right').now);
    lines.push(`jetzt ${formatAccel(now)}`);
  }
  for (const mark of source.marks.slice(-MARKS_SHOWN).reverse()) {
    lines.push(
      `Marke ${mark.index}: ${formatAccel(mark.value)} (${handLabel(mark.hand)}, ${mark.at.toFixed(1)} s)`,
    );
  }
  if (!source.marks.length) lines.push('Greifen setzt eine Marke');
  return lines.join('\n');
}
