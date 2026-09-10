/**
 * **Wann ein Wrack funkt.**
 *
 * Eine aufgerissene Kabine soll man von weitem erkennen, auch im Dunkeln und
 * auch ohne auf ihr Display zu schauen: Alle paar Sekunden springen Funken
 * aus der herausgerissenen Elektrik. Der Takt ist absichtlich unregelmäßig —
 * ein Wrack, das exakt alle vier Sekunden zuckt, klingt nach Uhr und nicht
 * nach Kurzschluss —, und jede Kabine hat ihren eigenen, damit zwei Wracks
 * im selben Gang nicht im Gleichschritt blitzen.
 *
 * Hier steht nur die Zeit. Kein three.js, keine Partikel: `ShipExperience`
 * fragt je Bild, welche Kabinen jetzt dran sind, und ruft für jede ihr
 * `burst('sparks', …)`. Deshalb lässt sich der Takt ohne Szene prüfen.
 */

/** Kürzeste Pause zwischen zwei Funkenwürfen, in Sekunden. */
export const SPARK_MIN = 3;
/** Längste Pause zwischen zwei Funkenwürfen, in Sekunden. */
export const SPARK_MAX = 6;

export class CabinWreck {
  /** Je Wrack: wie lange bis zum nächsten Funken, in Sekunden. */
  private readonly due = new Map<string, number>();

  constructor(private readonly rng: () => number = Math.random) {}

  /**
   * Ein Zeitschritt. `wrecked` ist die aktuelle Liste der zerstörten Kabinen
   * (`HauntState.destroyed`); wer daraus verschwindet — neue Runde —, hört
   * auf zu funken, wer neu dazukommt, funkt erst nach einer vollen Pause:
   * Beim Aufreißen selbst sprühen die Funken schon aus dem Angriff.
   *
   * @returns die Kabinen, die in diesem Bild Funken werfen.
   */
  step(dt: number, wrecked: readonly string[]): string[] {
    for (const id of [...this.due.keys()]) if (!wrecked.includes(id)) this.due.delete(id);
    const sparking: string[] = [];
    for (const id of wrecked) {
      let left = this.due.get(id) ?? this.pause();
      left -= Math.max(0, dt);
      if (left <= 0) {
        sparking.push(id);
        left = this.pause();
      }
      this.due.set(id, left);
    }
    return sparking;
  }

  private pause(): number {
    return SPARK_MIN + this.rng() * (SPARK_MAX - SPARK_MIN);
  }
}
