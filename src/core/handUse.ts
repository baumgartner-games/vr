import type { InteractionKind } from './interaction';

/**
 * **Benutzen mit der Hand** — die Entscheidung hinter der Brille, als reine
 * Rechnung.
 *
 * Von oben und am Schreibtisch gibt es eine Figur, einen Strahl aus ihrer
 * Brust und eine Taste (`core/usable.pickUsable`). In der Brille gibt es das
 * alles auch noch, aber davor gibt es **zwei Hände**, und die sind die
 * eigentliche Antwort: Man geht hin, legt die Hand auf den Knopf, und was man
 * nehmen will, nimmt man mit der Faust. Genau das steht hier — und zwar nur
 * die Entscheidung, nicht die Geometrie: Wie weit eine Hand in einer Greifbox
 * steckt, rechnet `worlds/portal/grabReach.reachDepth`, wohin ihr Strahl
 * zeigt, `rayReach`. Beides gibt es längst, und eine zweite Nähe-Rechnung
 * daneben liefe nach der dritten Änderung anders als die erste.
 *
 * **Drei Fragen, drei Funktionen:**
 *
 * - *Welches Ding meint diese Hand?* (`pickHandUse`) — **Anfassen sticht
 *   Zeigen**, unter Gleichen gewinnt das Nächste. Dieselbe Rangfolge wie beim
 *   Greifen (`PortalWorld.aimGrab`: „steckt sie in einer Greifbox, ist das die
 *   Antwort, ohne dass irgendwohin gezielt werden müsste"), und dieselbe wie
 *   bei `pickUsable` von oben, wo der Strahl die Überlappung sticht. Es kann
 *   deshalb nie beides zugleich auslösen, auch wenn Hand **und** Strahl auf
 *   demselben Ding liegen.
 * - *Löst es jetzt aus?* (`handUseFires`) — die Geber aus `core/interaction.ts`,
 *   auf Knöpfe übersetzt.
 * - *Was muss sich die Hand bis zum nächsten Bild merken?* (`handUseMemory`) —
 *   die Entprellung, siehe unten.
 *
 * **Warum eine Berührung entprellt werden muss.** Ein Knopf, den die bloße
 * Berührung drückt, wird sechzigmal je Sekunde gedrückt, solange die Hand
 * darin liegt — und in der Küche hieße das: einmal hinlangen, und der Stapel
 * Teller wandert Bild für Bild durch die Hand. Es zählt deshalb die
 * **Eintrittsflanke**: Die Hand muss erst wieder heraus und neu hinein, bevor
 * dasselbe Ding ein zweites Mal antwortet. Gemerkt wird dafür genau ein Ding
 * je Hand, und die Welt hält es (`handUseMemory`) — hier steht keine Zeit,
 * kein Zähler und kein Zustand.
 */

/** Wie eine Hand ein Ding erreicht. */
export type HandUseReach = 'touch' | 'aim';

/**
 * **Wie weit ein Zeigen auf einen Knopf reicht**, in Metern.
 *
 * Nicht die neun Meter des Ferngreifens (`grabReach.REMOTE_RANGE`): Die sind
 * für Gegenstände gedacht, die man sich **holt**, und wer sie auf Knöpfe
 * überträgt, drückt aus Versehen die Tür am anderen Ende der Halle, weil er
 * beim Umsehen einmal dorthin gezeigt hat. Drei Meter sind, so weit man im
 * selben Raum auf etwas zeigt und dabei noch meint, was man trifft.
 */
export const HAND_USE_RANGE = 3;

/** Ein Fund einer Hand — so viel, wie die Entscheidung davon braucht. */
export interface HandUseFind<T> {
  /** Das Ding selbst; die Rechnung sieht es nie an, die Welt bekommt es zurück. */
  readonly item: T;
  readonly reach: HandUseReach;
  /**
   * Beim Anfassen die Tiefe in der Greifbox (kleiner heißt weiter drin), beim
   * Zeigen die Entfernung am Strahl. Beides „kleiner gewinnt", und beide
   * werden nie miteinander verglichen — dazwischen entscheidet die Art.
   */
  readonly distance: number;
  /** Was das Ding will (`core/interaction.ts`). */
  readonly kind: InteractionKind;
}

/** Die Flanken der beiden Knöpfe, die eine Hand in der Brille hat. */
export interface HandUseButtons {
  /** Der Trigger — der Zeigefinger am Controller, der Pinch an der Hand. */
  readonly trigger: boolean;
  /** Die Greif-Taste — der Griffknopf am Controller, die Faust an der Hand. */
  readonly grip: boolean;
}

/**
 * **Was diese Hand meint.** Anfassen sticht Zeigen; unter Gleichen das
 * Nächste. Dinge ohne Angebot (`none`) kommen gar nicht erst in Frage.
 */
export function pickHandUse<T>(finds: readonly HandUseFind<T>[]): HandUseFind<T> | null {
  let best: HandUseFind<T> | null = null;
  for (const find of finds) {
    if (find.kind === 'none') continue;
    if (!best) {
      best = find;
      continue;
    }
    if (best.reach === 'touch' && find.reach !== 'touch') continue;
    if (find.reach === 'touch' && best.reach !== 'touch') {
      best = find;
      continue;
    }
    if (find.distance < best.distance) best = find;
  }
  return best;
}

/**
 * **Ob dieser Fund jetzt auslöst** — die Geberliste aus `core/interaction.ts`,
 * in Knöpfe übersetzt.
 *
 * - `press` will berührt **oder** gezeigt-und-getriggert werden. Die
 *   Berührung löst für sich aus, aber nur beim **Hineinfassen**
 *   (`touchedBefore`); wer die Hand liegen lässt und dann den Trigger zieht,
 *   drückt ausdrücklich noch einmal, und das soll er dürfen.
 * - `grab` will die **Greif-Taste**, und zwar dieselbe, mit der man in dieser
 *   Welt jeden Gegenstand greift (`worlds/portal/grabReach.ts`). Der Trigger
 *   tut hier nichts: Er gehört dem, was man in der Hand hält, und ein
 *   Brötchen, das schon auf den Zeigefinger springt, nähme dem Greifen seine
 *   einzige unmissverständliche Geste.
 * - `none` löst nie aus.
 *
 * @param touchedBefore welches Ding dieselbe Hand im **letzten** Bild schon
 *                      angefasst hatte (`handUseMemory`)
 */
export function handUseFires<T>(
  find: HandUseFind<T> | null,
  buttons: HandUseButtons,
  touchedBefore: T | null,
): boolean {
  if (!find || find.kind === 'none') return false;
  if (find.kind === 'grab') return buttons.grip;
  if (buttons.trigger) return true;
  return find.reach === 'touch' && touchedBefore !== find.item;
}

/**
 * **Was die Hand sich bis zum nächsten Bild merkt**: das Ding, in dem sie
 * steckt — und nichts, sobald sie nur noch zeigt oder ins Leere greift.
 *
 * Damit ist die Eintrittsflanke oben vollständig beschrieben, ohne dass
 * irgendwo eine Uhr mitläuft: Wer die Hand herauszieht, vergisst; wer sie
 * hineinhält, erinnert sich.
 */
export function handUseMemory<T>(find: HandUseFind<T> | null): T | null {
  return find && find.reach === 'touch' ? find.item : null;
}
