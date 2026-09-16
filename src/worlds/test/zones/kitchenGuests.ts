/**
 * **Die Gäste** — wer gerade isst, wie lange noch, und was danach auf dem Tisch
 * stehen bleibt. Ohne three.js, ohne Zone, ohne Bild.
 *
 * Bis eben endete ein Burger an der Ausgabetheke: Er verschwand, eine Tafel
 * sagte kurz, was es geworden war, und damit war die Runde zu Ende. Das ist
 * der halbe Kreislauf. Der ganze geht weiter — der Teller geht **mit** über
 * die Theke, ein Gast isst davon, und was er zurücklässt, ist Arbeit: ein
 * dreckiger Teller, der zurückgeräumt, gestapelt und gespült werden will.
 *
 * **Zwei Wege für dasselbe Geschirr**, und beide stehen so im Auftrag: Entweder
 * es landet an einem **Gästetisch** (dort sitzt jemand, isst, und lässt es
 * stehen) oder gleich an der **Geschirrrückgabe**, wo sich die dreckigen Teller
 * stapeln. Welcher Weg gilt, entscheidet sich an einer einzigen Frage — ist
 * gerade ein Tisch frei? Ein Gericht, das an einem besetzten Tisch abgestellt
 * würde, wäre ein zweiter Teller auf demselben Platz, und der erste wäre weg.
 *
 * **Warum die Uhr hier steht und nicht in der Zone.** Aus demselben Grund wie
 * beim Herd und beim Brett (`kitchenClock.ts`, `kitchenWork.ts`): Ein Bild
 * dauert 16 ms, eine Mahlzeit ein paar Sekunden, und wer den Rest am Ende
 * einer Phase wegwirft, dessen Gäste essen je nach Bildrate verschieden lang.
 * Ein Test rechnet das mit einem Schritt von 100 s genauso nach wie mit
 * tausend Schritten von 0,1 s.
 */

/**
 * **Wie lange ein Gast isst**, in Sekunden.
 *
 * Acht: lang genug, dass man in der Zeit den nächsten Burger anfängt, statt
 * neben dem Tisch auf das Geschirr zu warten — und kurz genug, dass bei drei
 * Tischen nicht alle drei gleichzeitig belegt sind, während in der Küche die
 * fertigen Teller stehen bleiben. Zum Vergleich: Ein Patty braucht vier
 * Sekunden (`kitchenClock.FRY_SECONDS`), ein Schnitt drei
 * (`kitchenWork.WORK_SECONDS`) — eine Mahlzeit ist also ungefähr so lang wie
 * ein ganzer Burger von vorn.
 */
export const EAT_SECONDS = 8;

/**
 * **Was an einem Gästetisch los ist.**
 *
 * Drei Zustände, und sie hängen an zwei Zahlen: leer (`left === 0`,
 * `dirty === false`), es wird gegessen (`left > 0`), und das Geschirr steht da
 * (`dirty`). Ein eigenes Feld für „besetzt" wäre die zweite Wahrheit, die beim
 * nächsten Umbau ausschert — dieselbe Entscheidung wie beim Herd, dessen Phase
 * aus dem Patty **gelesen** und nicht mitgeführt wird (`kitchenClock.ts`).
 *
 * Unveränderlich, wie jeder Zustand in dieser Küche: Eine Uhr gibt den
 * **neuen** Stand zurück, statt am alten zu drehen.
 */
export interface TableState {
  /** Sekunden, die der Gast noch isst — 0, wenn niemand isst. */
  readonly left: number;
  /** Ob das benutzte Geschirr auf dem Tisch steht. */
  readonly dirty: boolean;
}

/** Ein Tisch, an dem niemand sitzt und nichts steht. */
export const CLEAR_TABLE: TableState = { left: 0, dirty: false };

/**
 * **Ob hier ein Gericht hinkann** — nur an einen Tisch, an dem weder gegessen
 * wird noch Geschirr steht.
 */
export function tableFree(state: TableState): boolean {
  return state.left <= 0 && !state.dirty;
}

/**
 * **Welcher Tisch das nächste Gericht bekommt** — der erste freie, oder `-1`.
 *
 * Der **erste** und nicht der zufällige: Ein Tisch, der sich nicht vorhersagen
 * lässt, ist ein Tisch, den man suchen muss. Wer serviert, soll wissen, wo er
 * gleich abräumt.
 */
export function freeTable(tables: readonly TableState[]): number {
  return tables.findIndex(tableFree);
}

/** Ein Gast setzt sich und fängt an — der Tisch war frei, siehe `freeTable`. */
export function seat(): TableState {
  return { left: EAT_SECONDS, dirty: false };
}

/** Das Geschirr ist abgeräumt: der Tisch ist wieder frei. */
export function cleared(state: TableState): TableState {
  return state.dirty ? CLEAR_TABLE : state;
}

/** Was ein Bild am Tisch geändert hat. */
export interface TableTick {
  readonly state: TableState;
  /** Ob in diesem Bild aufgegessen wurde — dann steht ab jetzt Geschirr da. */
  readonly finished: boolean;
}

/**
 * **Ein Bild am Gästetisch** — `dt` Sekunden weiter.
 *
 * Niemand isst, niemand fängt hier von selbst an: Ein Gast kommt nur, wenn
 * jemand serviert (`seat`). Ist aufgegessen, bleibt das Geschirr **liegen**,
 * bis es jemand holt — ein Tisch, der sich selbst abräumt, wäre ein Tisch ohne
 * Arbeit, und die Arbeit ist hier der Sinn.
 */
export function advanceTable(state: TableState, dt: number): TableTick {
  if (state.left <= 0) return { state, finished: false };
  const left = state.left - Math.max(0, dt);
  if (left > 0) return { state: { left, dirty: state.dirty }, finished: false };
  return { state: { left: 0, dirty: true }, finished: true };
}

/** Der Anteil 0…1 für den Balken über dem Tisch — voll heißt: gleich fertig. */
export function eatProgress(state: TableState): number {
  if (state.left <= 0) return 0;
  return Math.min(1, Math.max(0, (EAT_SECONDS - state.left) / EAT_SECONDS));
}
