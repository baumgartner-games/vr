import { INTERACTION_DEFAULTS, type InteractionInput, type InteractionKind } from './interaction';

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
 * - *War das ein Halten oder ein Tippen?* (`gripPressKind` und die Sätze
 *   darum) — die vierte Frage, und die jüngste: Ein Ding kann in der Brille
 *   auf zwei Arten in die Hand kommen und auf zwei Arten wieder heraus, und
 *   welche es war, entscheidet sich zwischen Drücken und Loslassen. Ganz
 *   unten, mit ihrer Begründung.
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
  /**
   * **Womit** es das in der Brille will (`interaction.vrInputs`) — die
   * Geberliste der Ansicht `vr`, samt der Ausnahme, die ein einzelnes Ding
   * dort angemeldet hat (`InteractionSpec.views.vr`).
   *
   * Freiwillig: Fehlt sie, gilt die Ableitung aus der Absicht, und das ist
   * Zeile für Zeile das, was hier vorher fest verdrahtet stand. Angegeben wird
   * sie von dem, der eine Ausnahme hat — und den gibt es seit der Küche: Eine
   * **Fläche, auf die man etwas ablegt**, ist von oben ein Druck auf `A` und
   * in der Brille die Greif-Taste, denn abgelegt wird beim **Loslassen** und
   * nicht beim Hinlangen. Ohne diese Zeile stellte man den Topf ab, sobald man
   * mit ihm an der Arbeitsplatte vorbeikommt.
   */
  readonly inputs?: readonly InteractionInput[];
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
  // **Gefragt wird die Geberliste und nicht die Absicht.** Beides war
  // dasselbe, solange kein Ding eine Ausnahme anmeldete; seit eine Fläche in
  // der Brille die Greif-Taste will, obwohl sie ein `press` ist, wäre eine
  // Abfrage auf `kind` genau die zweite Tabelle, die `core/interaction.ts`
  // vermeiden soll. Fehlt die Liste, kommt sie aus der Ableitung — und dann
  // steht hier Zeile für Zeile das Alte.
  const inputs = find.inputs ?? INTERACTION_DEFAULTS[find.kind].vr.inputs;
  if (inputs.includes('grip')) return buttons.grip;
  if (buttons.trigger && inputs.includes('aimTrigger')) return true;
  return inputs.includes('handTouch') && find.reach === 'touch' && touchedBefore !== find.item;
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

// --- Halten oder Tippen ----------------------------------------------------

/**
 * **Zwei Greif-Arten, beide gültig** — und was sie unterscheidet.
 *
 * Der Auftrag will beides nebeneinander, ohne dass man sich vorher für eines
 * entscheidet:
 *
 * - **Halten**: Greif-Taste drücken, das Ding ist in der Hand, beim
 *   **Loslassen** wird es abgelegt. Das ist die Geste, die jede Hand in diesem
 *   Projekt ohnehin kennt (`worlds/portal/grabReach.ts`).
 * - **Tippen**: einmal drücken und **sofort wieder loslassen** — das Ding
 *   bleibt in der Hand, und der **nächste** Druck legt es ab. Das ist die
 *   Geste für alles, was länger dauert als ein Griff: quer durch die Küche
 *   laufen, sich umsehen, den Platz suchen. Eine Minute lang den Griffknopf zu
 *   drücken, weil man mit dem Topf noch zur Spüle muss, ist keine Bedienung,
 *   sondern eine Übung.
 *
 * **Die Unterscheidung ist, ob zwischen Drücken und Loslassen etwas passiert
 * ist** — und „etwas" ist hier bewusst **zweierlei**: verstrichene Zeit *oder*
 * zurückgelegte Strecke. Ein Tippen ist der kurze, **stille** Klick und sonst
 * nichts; sobald die Hand dabei gewartet oder sich bewegt hat, war es ein
 * Halten.
 *
 * Warum nicht nur die Zeit: Wer den Topf packt, ihn in einem Zug dreißig
 * Zentimeter auf die Platte schiebt und loslässt, ist in weniger als einer
 * Drittelsekunde fertig — und meint ganz sicher „ablegen". Eine reine Frist
 * hielte ihm den Topf in der Hand und ließe ihn ein zweites Mal drücken.
 *
 * Warum nicht nur die Strecke: Wer die Taste drückt und eine Sekunde lang
 * stillhält, während er überlegt, wohin, hat sich keinen Millimeter bewegt —
 * und meint trotzdem „halten". Eine reine Wegstrecke machte daraus ein Tippen
 * und klebte ihm das Ding an die Hand.
 *
 * Warum nicht „ob beim Loslassen ein Ablageplatz dasteht": Dann hinge die
 * **Art der Geste** daran, wo man gerade steht — derselbe kurze Klick wäre vor
 * der Arbeitsplatte ein Halten und einen Schritt daneben ein Tippen. Eine
 * Geste, die je nach Ort etwas anderes heißt, lernt niemand.
 *
 * Gerechnet wird beides ohne Uhr im Modul: Die Welt zählt die Bildzeit und den
 * Weg zusammen (`stepGripPress`), hier steht nur, was daraus folgt.
 */
export type GripPressKind = 'hold' | 'tap';

/**
 * **Wie lange ein Tippen höchstens dauert**, in Sekunden.
 *
 * Ein Drittel einer Sekunde ist der Klick, den ein Mensch als „einmal
 * drücken" empfindet; darüber liegt die Taste, und eine liegende Taste ist
 * ein Halten. Es ist derselbe Bereich, in dem auch Betriebssysteme einen
 * Klick von einem Gedrückthalten trennen — nicht abgeschrieben, aber ein
 * Hinweis darauf, dass die Zahl nicht willkürlich ist.
 */
export const HAND_TAP_SECONDS = 0.35;

/**
 * **Und wie weit die Hand dabei höchstens kommt**, in Metern.
 *
 * Acht Zentimeter sind das Wackeln, das eine Hand beim Drücken eines
 * Griffknopfes ohnehin macht — der Knopf sitzt unter den Fingern, und die
 * Faust zieht sich beim Zudrücken zusammen. Alles darüber ist eine Bewegung,
 * die jemand gewollt hat.
 */
export const HAND_TAP_METRES = 0.08;

/** Der Stand einer Greif-Taste zwischen Drücken und Loslassen. */
export interface GripPress {
  /** Wie lange sie schon liegt, in Sekunden. */
  readonly held: number;
  /** Wie weit die Hand seit dem Drücken höchstens weg war, in Metern. */
  readonly moved: number;
  /**
   * **Ob während dieses Drucks etwas in die Hand gekommen ist.**
   *
   * Nur dann kann das Loslassen etwas ablegen. Ein Druck ins Leere — die Hand
   * greift daneben, der Knopf war schon gedrückt — hat nichts genommen, und
   * ein Loslassen danach darf auch nichts hinstellen.
   */
  readonly took: boolean;
}

/** Eine frisch gedrückte Greif-Taste. */
export function beginGripPress(): GripPress {
  return { held: 0, moved: 0, took: false };
}

/**
 * Ein Bild weiter: die Zeit dazu, und der Weg, den die Hand seit dem Drücken
 * gemacht hat.
 *
 * `moved` ist der **größte** bisher gesehene Abstand und nicht der aktuelle:
 * Wer ausholt und zurückkommt, hat sich bewegt, auch wenn er am Ende wieder
 * dort steht, wo er losgelegt hat.
 *
 * @param travel Abstand der Hand von der Stelle, an der gedrückt wurde
 */
export function stepGripPress(grab: GripPress, dt: number, travel: number): GripPress {
  const moved = Math.max(grab.moved, Math.max(0, travel));
  return { held: grab.held + Math.max(0, dt), moved, took: grab.took };
}

/** Dieser Druck hat etwas genommen — gemerkt bis zum Loslassen. */
export function gripPressTook(grab: GripPress): GripPress {
  return grab.took ? grab : { ...grab, took: true };
}

/** Halten oder Tippen — die Regel von oben, in einer Zeile. */
export function gripPressKind(grab: GripPress): GripPressKind {
  return grab.held > HAND_TAP_SECONDS || grab.moved > HAND_TAP_METRES ? 'hold' : 'tap';
}

/**
 * **Ob das Loslassen ablegt.**
 *
 * Genau dann, wenn dieser Druck etwas genommen hat **und** er ein Halten war.
 * War es ein Tippen, bleibt das Ding in der Hand und wartet auf den nächsten
 * Druck; hat der Druck nichts genommen, gibt es nichts abzulegen.
 *
 * Das ist die ganze Antwort auf den gemeldeten Fehler: **Abgelegt wird beim
 * Loslassen und nicht beim Hinlangen.** Wer mit dem Topf an der Arbeitsplatte
 * vorbeiläuft, läuft daran vorbei.
 */
export function gripPressDrops(grab: GripPress | null | undefined): boolean {
  return !!grab && grab.took && gripPressKind(grab) === 'hold';
}
