/**
 * **Arbeit an einer Station, die Zeit kostet** — schneiden und spülen, und
 * beides aus derselben Rechnung. Ohne three.js, ohne Zone, ohne Bild.
 *
 * Das Schneidebrett hatte diese Uhr einmal für sich allein (sie stand in
 * `kitchenClock.ts` neben dem Herd). Dann kam die Spüle dazu, und mit ihr
 * hätte es ein zweites `advanceChop` gegeben, das bis auf zwei Namen dasselbe
 * tut — samt zweitem Balken, zweitem „nur solange jemand davorsteht" und
 * zweiter Gelegenheit, eines von beidem zu vergessen. **Also gibt es die
 * Arbeit genau einmal**, und die Station sagt nur, welcher Art sie ist
 * (`WorkKind`) und was auf ihr liegt.
 *
 * **Ein einziger Unterschied bleibt**, und er steht bei `WORK_TO_HAND`: Was am
 * Brett fertig wird, liegt danach auf dem Brett; was in der Spüle fertig wird,
 * liegt danach in der **Hand**. Er steht dort als Tabelleneintrag und nicht
 * als Sonderfall der Spüle irgendwo in der Zone — sonst wären es doch wieder
 * zwei Rechnungen, nur mit einem gemeinsamen Namen davor.
 *
 * Der Herd bleibt draußen, und das ist kein Versehen: Er läuft weiter, **ob
 * jemand davorsteht oder nicht** — das ist der ganze Sinn des Bratens, man
 * geht ja in der Zeit etwas anderes tun. Hier ist es genau umgekehrt: Diese
 * Uhr läuft **nur**, solange die Figur an der Station steht. Zwei Rechnungen
 * mit gegenteiliger Grundannahme gehören nicht in eine Funktion.
 *
 * **Wer weggeht, fängt von vorn an.** Früher blieb der Fortschritt stehen und
 * lief beim Zurückkommen weiter — bequem, aber es machte aus dem Brett eine
 * Ablage, an der man im Vorbeigehen antippt: hinlegen, zwei Sekunden warten,
 * weglaufen, irgendwann wiederkommen, fertig. Arbeit, die man in Scheiben
 * schneiden kann, ist keine Entscheidung mehr, sondern Buchhaltung. Jetzt
 * bricht das Weggehen die Arbeit ab, und wer sie doch abbrechen will, zahlt
 * dafür zwei Handgriffe: **erneut aufnehmen und erneut ablegen** (`onWork`).
 * Damit steht man am Brett, weil es die Küche verlangt — und genau das ist
 * bei _Overcooked_ die Arbeit.
 *
 * Die Zone gibt je Bild ihr `dt` hinein und bekommt einen neuen Zustand
 * zurück, dazu einen Anteil 0…1 für den Balken darüber. Sie merkt sich nichts
 * selbst — der Zustand ist unveränderlich und gehört an die Station.
 */

import { chopStage, type KitchenItem } from './kitchenRecipes';

/** Welche Arbeit an einer Station getan wird. */
export type WorkKind =
  /** Am Schneidebrett: aus Rohem wird Geschnittenes. */
  | 'chop'
  /** An der Spüle: aus dreckigem Geschirr wird sauberes. */
  | 'wash';

/**
 * **Wie lange eine Stufe dauert** — je Art, in Sekunden.
 *
 * Drei beim Schneiden statt der früheren drei Knopfdrücke: Ein Brett, an dem
 * man dreimal `A` tippt, ist ein Knopf, der die Zutat austauscht. Und drei
 * beim Spülen, weil ein Teller keine größere Arbeit ist als ein Salatkopf —
 * wäre es länger, würde niemand mehr Geschirr holen, sondern lieber warten.
 */
export const WORK_SECONDS: Readonly<Record<WorkKind, number>> = {
  chop: 3,
  wash: 3,
};

/**
 * **Wohin das Fertige geht** — und das ist die **einzige** Stelle, an der
 * Schneiden und Spülen auseinandergehen.
 *
 * Am **Brett** bleibt liegen, was fertig ist, und das ist richtig: Der
 * geschnittene Salat will als Nächstes auf einen Teller oder in die Pfanne,
 * und wer ihn aufnimmt, hat damit schon entschieden, wohin. Ein Brett ist eine
 * Arbeitsfläche, und auf einer Arbeitsfläche liegt das Zwischenergebnis.
 *
 * Das **Becken** ist keine. Wer abwäscht, will keinen Teller im Wasser stehen
 * haben, sondern einen sauberen in der Hand — so kam es aus dem Spieltest am
 * Handy zurück: „Ist es fertig, hat man einen sauberen Teller in der Hand."
 * Vorher war genau dieser Griff die Zumutung: Der Teller wurde sauber und
 * blieb stehen, man drückte ein zweites Mal an derselben Stelle, an der man
 * ohnehin schon stand, und bis dahin war das Becken besetzt — der nächste
 * dreckige Teller passte nicht hinein (`kitchenCarry.atSink` lehnt ab). Drei
 * Sekunden Arbeit, zwei Handgriffe Buchhaltung.
 *
 * **Eine Tabelle wie `WORK_SECONDS` und kein `if` in `advanceWork`**, obwohl
 * heute nur ein Eintrag `true` ist: Kommt eine dritte Art dazu, fragt der
 * Übersetzer nach ihrem Eintrag. Ein `if (kind === 'wash')` fragt nichts.
 */
export const WORK_TO_HAND: Readonly<Record<WorkKind, boolean>> = {
  chop: false,
  wash: true,
};

/**
 * **Was an einer Station liegt und wie weit die Arbeit daran ist.**
 *
 * `working` ist der Grund, warum aus einer Tomate nicht in einem Zug Suppe
 * wird: Ist eine Stufe fertig, steht die Uhr, und das Ergebnis liegt da. Wer
 * weiterschneiden will, nimmt es und legt es wieder hin — ein Handgriff, der
 * zeigt, dass die zweite Stufe gewollt war und nicht passiert ist.
 *
 * `kind` steht mit im Zustand und nicht nur an der Station, damit
 * `workProgress` und `advanceWork` mit einem einzigen Argument auskommen: Ein
 * Balken, der seine Dauer erst von woanders holen müsste, ist ein Balken, der
 * irgendwann die falsche bekommt.
 */
export interface WorkState {
  readonly kind: WorkKind | null;
  readonly item: KitchenItem | null;
  /** Sekunden an dieser Stufe. */
  readonly time: number;
  /** Ob gerade gearbeitet wird. */
  readonly working: boolean;
}

/** Eine Station, an der nichts liegt und nichts läuft. */
export const IDLE_WORK: WorkState = { kind: null, item: null, time: 0, working: false };

/**
 * **Was aus diesem Ding bei dieser Arbeit wird** — oder `null`, weil es dort
 * nichts zu suchen hat.
 *
 * Das Schneiden holt sich die Antwort aus der Zutatenkunde (`chopStage`), das
 * Spülen kennt genau einen Fall. Eine zweite Tabelle für den einen Fall wäre
 * eine Tabelle, die man pflegen muss; ein `if` nicht.
 */
export function workStage(kind: WorkKind, item: KitchenItem): KitchenItem | null {
  if (kind === 'chop') return chopStage(item);
  return item === 'plate-dirty' ? 'plate' : null;
}

/**
 * **Frisch abgelegt** — und damit fängt die Arbeit sofort an.
 *
 * Kein zusätzlicher Druck auf `A`: Wer einen Salatkopf auf ein Schneidebrett
 * legt, will schneiden, und wer den dreckigen Teller in die Spüle stellt, will
 * spülen. Alles andere darf trotzdem daliegen — ein Brett ist auch eine
 * Ablage —, nur die Uhr läuft dann nicht.
 *
 * **Nur hier wird armiert**, und daran hängt die Regel von oben: Ein
 * abgebrochenes `working` kommt durch bloßes Zurückkommen nicht wieder, es
 * braucht diesen Aufruf — und den macht die Zone erst, wenn jemand das Ding
 * erneut abgelegt hat. `onWork(null, null)` ist `IDLE_WORK`.
 */
export function onWork(kind: WorkKind | null, item: KitchenItem | null): WorkState {
  const working = kind !== null && item !== null && workStage(kind, item) !== null;
  return { kind, item, time: 0, working };
}

/** Der Anteil 0…1 für den Balken über der Station. */
export function workProgress(state: WorkState): number {
  if (!state.working || !state.kind) return 0;
  return Math.min(1, state.time / WORK_SECONDS[state.kind]);
}

/** Was ein Bild an der Station geändert hat. */
export interface WorkTick {
  readonly state: WorkState;
  /** Was in diesem Bild fertig geworden ist — die Zone tauscht das Netz. */
  readonly done: KitchenItem | null;
  /**
   * Ob das Fertige **in die Hand** gewandert ist (`WORK_TO_HAND`) — dann ist
   * die Station leer, und die Zone hängt das Netz an die Figur statt es liegen
   * zu lassen.
   *
   * Es steht hier und nicht als Frage an die Zone („ist es eine Spüle?"),
   * damit der ganze Ausgang eines Bildes an **einer** Stelle steht: Wer
   * `state.item === null` liest und `toHand` nicht, sähe einen Teller, der
   * sich in Luft aufgelöst hat.
   */
  readonly toHand: boolean;
}

/**
 * **Ein Bild an der Station** — `dt` Sekunden weiter, aber nur, wenn jemand
 * danebensteht.
 *
 * `near` ist die Figur an der Station. Geht sie weg, **bricht die Arbeit ab**:
 * `working` fällt auf `false`, die Zeit auf null, und nur ein neues `onWork`
 * fängt wieder an. Zurückkommen allein genügt nicht — sonst wäre das Weggehen
 * eine Pause statt einer Entscheidung (siehe oben).
 *
 * Ist schon abgebrochen, kommt **derselbe** Zustand zurück und kein gleich
 * aussehender: Die Zone vergleicht auf Identität, um nicht in jedem Bild einer
 * unbenutzten Station ein Netz anzufassen.
 *
 * `handFree` ist die leere Hand der Figur, und sie zählt nur für Arbeit, deren
 * Ergebnis in die Hand gehört (`WORK_TO_HAND`) — also heute für die Spüle.
 * **Ist die Hand voll, bleibt der saubere Teller im Becken stehen**: Er
 * verschwindet nicht, und er drängt auch nichts aus der Hand. Ein Griff an das
 * Becken holt ihn dann nach (`kitchenCarry.atSink` gibt her, was darin steht)
 * — derselbe Weg, den es vor dieser Änderung immer gab, jetzt nur noch als
 * Ausnahme. Am Brett ist der Wert gleichgültig, deshalb darf er fehlen.
 */
export function advanceWork(
  state: WorkState,
  dt: number,
  near: boolean,
  handFree = false,
): WorkTick {
  if (!near) {
    if (!state.working && state.time === 0) return { state, done: null, toHand: false };
    return { state: { ...state, time: 0, working: false }, done: null, toHand: false };
  }
  if (!state.working || !state.kind || !state.item) return { state, done: null, toHand: false };
  const time = state.time + Math.max(0, dt);
  if (time < WORK_SECONDS[state.kind]) {
    return { state: { ...state, time }, done: null, toHand: false };
  }
  const done = workStage(state.kind, state.item);
  // Kann daraus nichts mehr werden, hätte gar nicht gearbeitet werden dürfen —
  // die Uhr hält an, statt weiterzulaufen und nie fertig zu werden.
  if (!done) return { state: { ...state, time: 0, working: false }, done: null, toHand: false };
  // Der saubere Teller geht in die Hand und ist damit **von** der Station weg;
  // der geschnittene Salat bleibt liegen. Beides ist derselbe Satz, nur mit
  // dem einen Eintrag aus `WORK_TO_HAND` darin.
  const toHand = WORK_TO_HAND[state.kind] && handFree;
  // Genau **eine** Stufe je Auflegen, auch wenn das Bild lang war: Der Rest
  // verfällt, weil die nächste Stufe einen neuen Handgriff braucht.
  return {
    state: { kind: state.kind, item: toHand ? null : done, time: 0, working: false },
    done,
    toHand,
  };
}

/**
 * **Fertig geworden, aber die Hand war voll** — das Ergebnis wartet an der
 * Station, statt in die Hand zu gehen.
 *
 * Es ist eine Frage an die Tat und nicht an das Möbel, und deshalb steht sie
 * hier: Die Zone soll sagen können, **warum** der saubere Teller im Becken
 * steht, ohne dafür zu wissen, dass ein Becken anders ist als ein Brett. Am
 * Brett ist die Antwort immer `false` — dort ist Liegenbleiben kein
 * Ausweichen, sondern der Normalfall, und eine Meldung darüber wäre eine
 * Meldung über nichts.
 */
export function workWaits(tick: WorkTick): boolean {
  if (!tick.done || tick.toHand || !tick.state.kind) return false;
  return WORK_TO_HAND[tick.state.kind];
}
