/**
 * Wie viele Exemplare eines Werkzeugs gleichzeitig neben dem Gürtel sein
 * dürfen — **pro Gürtelplatz**, nicht pro Werkzeug.
 *
 * Die Regel dahinter ist alt: wer ein Werkzeug loslässt, lässt es fallen, und
 * auf der Hüfte, von der es kam, wächst sofort ein neues nach. Ohne Obergrenze
 * liegt nach zehn Minuten der halbe Raum voller Pistolen, also holt sich der
 * Raum das älteste *liegende* Exemplar zurück, sobald eins zu viel draußen ist.
 *
 * Gezählt wurde das anfangs pro Werkzeug-Id, und genau daran ist es
 * gescheitert: mit einer Waffe links und einer rechts sind zwei Exemplare
 * draußen, also eins zu viel — die zweite auf den Boden zu werfen hat die
 * erste verschwinden lassen. Das ist offensichtlich falsch; zwei Hüften, die
 * beide dasselbe Werkzeug tragen, sind zwei Vorräte und kein gemeinsamer.
 *
 * Also zählt jeder Platz für sich. `looseLimit` heißt jetzt „so viele pro
 * Hüfte", und die Voreinstellung eins liest sich weiter genau richtig: die
 * frische Pistole von der *linken* Hüfte holt die von der linken Hüfte
 * liegengelassene ein und lässt die rechte in Ruhe.
 *
 * Reine Buchführung, kein three.js — die Vorzeichen dieser Regel merkt man in
 * der Brille erst, wenn das falsche Ding weg ist.
 */

/** Ein Exemplar, das nicht am Gürtel hängt: in einer Hand oder im Raum. */
export interface LooseEntry<T> {
  /**
   * Der Platz, von dem es kam. `null` für eines, das nie an einem Gürtel hing
   * — aus dem Regal direkt in die Hand etwa; die bilden zusammen einen
   * eigenen Topf.
   */
  home: string | null;
  /**
   * Nur was im Raum liegt, kann zurückgeholt werden. Ein Exemplar in einer
   * Hand zählt mit, wird aber niemandem aus der Hand genommen.
   */
  spare: boolean;
  value: T;
}

/**
 * Was zu viel ist, in der Reihenfolge, in der es losgelassen wurde — ältestes
 * zuerst.
 *
 * @param entries alle Exemplare *einer* Werkzeug-Id, in Einlagerungsreihenfolge
 * @param limit   wie viele pro Platz draußen sein dürfen
 */
export function overBudget<T>(entries: readonly LooseEntry<T>[], limit: number): T[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const key = slotKey(entry.home);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const doomed: T[] = [];
  for (const entry of entries) {
    const key = slotKey(entry.home);
    const count = counts.get(key) ?? 0;
    // Innerhalb des Budgets, oder nichts, was man zurückholen dürfte.
    if (count <= limit || !entry.spare) continue;
    counts.set(key, count - 1);
    doomed.push(entry.value);
  }
  return doomed;
}

/** `null` ist ein Platz wie jeder andere — der Topf „von keiner Hüfte". */
function slotKey(home: string | null): string {
  return home ?? '';
}
