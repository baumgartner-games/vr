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
 */
export function advanceWork(state: WorkState, dt: number, near: boolean): WorkTick {
  if (!near) {
    if (!state.working && state.time === 0) return { state, done: null };
    return { state: { ...state, time: 0, working: false }, done: null };
  }
  if (!state.working || !state.kind || !state.item) return { state, done: null };
  const time = state.time + Math.max(0, dt);
  if (time < WORK_SECONDS[state.kind]) return { state: { ...state, time }, done: null };
  const done = workStage(state.kind, state.item);
  // Kann daraus nichts mehr werden, hätte gar nicht gearbeitet werden dürfen —
  // die Uhr hält an, statt weiterzulaufen und nie fertig zu werden.
  if (!done) return { state: { ...state, time: 0, working: false }, done: null };
  // Genau **eine** Stufe je Auflegen, auch wenn das Bild lang war: Der Rest
  // verfällt, weil die nächste Stufe einen neuen Handgriff braucht.
  return { state: { kind: state.kind, item: done, time: 0, working: false }, done };
}
