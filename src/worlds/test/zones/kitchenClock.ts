/**
 * **Die Uhren der Küche** — braten, verbrennen, brennen, schneiden. Ohne
 * three.js, ohne Zone, ohne Bild.
 *
 * Eine dritte Datei neben Rezept (`kitchenRecipes.ts`) und Regel
 * (`kitchenCarry.ts`), und der Grund ist ein anderer als dort: Alles in jenen
 * beiden passiert, **weil jemand `A` drückt**. Hier passiert etwas, **weil
 * Zeit vergeht** — und das ist die fehleranfälligste Stelle der ganzen Küche.
 * Ein Bild dauert 16 ms, eine Phase 4 s, und wer die Reste am Phasenende
 * wegwirft, dessen Patty verbrennt je nach Bildrate unterschiedlich schnell.
 * Deshalb steht die Rechnung hier, wo ein Test sie mit einem Schritt von 100 s
 * genauso nachrechnen kann wie mit tausend Schritten von 0,1 s.
 *
 * Die Zone gibt je Bild ihr `dt` hinein und bekommt einen neuen Zustand
 * zurück, dazu einen Anteil 0…1 für den Balken darüber (Spezifikation §7).
 * Sie merkt sich nichts selbst — der Zustand ist unveränderlich und gehört an
 * die Station.
 */

import { fryStage, chopStage, type KitchenItem } from './kitchenRecipes';

/**
 * **Wie lange ein Patty braucht**, in Sekunden.
 *
 * Vier: lang genug, dass man in der Zeit etwas anderes schneiden geht, kurz
 * genug, dass niemand vor dem Herd wartet.
 */
export const FRY_SECONDS = 4;

/**
 * **Und wie lange es dann noch gut bleibt.**
 *
 * Sechs, also anderthalbmal so lang wie das Braten: Wer das Patty holt,
 * während er nebenher schneidet, schafft es bequem; wer es vergisst, verliert
 * es. Wäre die Frist kürzer als das Braten, stünde man vor dem Herd und
 * wartete — genau das, was die vier Sekunden vermeiden sollen.
 */
export const BURN_SECONDS = 6;

/**
 * **Und wie lange das Verbrannte qualmt, bevor es brennt.**
 *
 * Fünf Sekunden mit einem roten Warndreieck darüber. Ein Feuer, das ohne
 * Vorwarnung ausbricht, ist kein Fehler des Spielers, sondern eine Falle; fünf
 * Sekunden reichen quer durch die Küche zum Feuerlöscher.
 */
export const FIRE_SECONDS = 5;

/**
 * **Wie lange ein Schnitt dauert** — je Stufe.
 *
 * Drei Sekunden statt der früheren drei Knopfdrücke: Ein Brett, an dem man
 * dreimal `A` tippt, ist ein Knopf, der die Zutat austauscht. Eine Uhr, die
 * nur läuft, solange man davorsteht, ist der Grund, warum man am Brett
 * **steht** — und bei _Overcooked_ ist genau das die Arbeit.
 */
export const CHOP_SECONDS = 3;

// --- der Herd ---------------------------------------------------------------

/** In welcher Phase der Herd steckt. */
export type StovePhase = 'cold' | 'frying' | 'burning' | 'igniting' | 'fire';

/**
 * **Was am Herd gerade vor sich geht.**
 *
 * Die Phase steht nicht mit darin, sie wird aus dem Patty **gelesen**
 * (`stovePhase`): Ein rohes Patty brät, ein gebratenes verbrennt, ein
 * verbranntes fängt gleich Feuer. Zwei Felder, die dasselbe sagen, sind eines
 * zu viel — und das eine, das man vergisst mitzuändern, ist der Fehler.
 */
export interface StoveState {
  /** Was in der Pfanne auf dem Herd liegt — `null` bei leerer oder fehlender Pfanne. */
  readonly patty: KitchenItem | null;
  /** Sekunden in der laufenden Phase. */
  readonly time: number;
  /** Ob der Herd brennt. */
  readonly fire: boolean;
}

/** Ein Herd, auf dem nichts steht. */
export const COLD_STOVE: StoveState = { patty: null, time: 0, fire: false };

/**
 * **Die Uhr fängt von vorn an** — was auf den Herd kommt, kommt frisch darauf.
 *
 * Nimmt jemand die Pfanne mit, steht die Uhr nicht nur still, ihr Rest ist
 * weg: Die **Stufe** des Pattys reist in der Pfanne mit (sie steht im `Dish`),
 * der angefangene Fortschritt bleibt am Herd. Anders müsste die Pfanne eine
 * Uhr tragen, und dann brennt es in der Hand eines Spielers, der gerade quer
 * durch die Küche läuft.
 */
export function onStove(patty: KitchenItem | null): StoveState {
  return { patty, time: 0, fire: false };
}

/** Wie lange die laufende Phase dauert — `0`, wenn keine läuft. */
function span(phase: StovePhase): number {
  switch (phase) {
    case 'frying':
      return FRY_SECONDS;
    case 'burning':
      return BURN_SECONDS;
    case 'igniting':
      return FIRE_SECONDS;
    default:
      return 0;
  }
}

/** In welcher Phase dieser Herd steckt. */
export function stovePhase(state: StoveState): StovePhase {
  if (state.fire) return 'fire';
  switch (state.patty) {
    case 'patty':
      return 'frying';
    case 'patty-cooked':
      return 'burning';
    case 'patty-burnt':
      return 'igniting';
    default:
      return 'cold';
  }
}

/** Der Anteil 0…1 für den Balken über dem Herd. */
export function stoveProgress(state: StoveState): number {
  const phase = stovePhase(state);
  if (phase === 'fire') return 1;
  const full = span(phase);
  return full ? Math.min(1, state.time / full) : 0;
}

/** Was ein Bild am Herd geändert hat. */
export interface StoveTick {
  readonly state: StoveState;
  /** Die Stufe, die in diesem Bild fertig wurde — die Zone tauscht das Netz. */
  readonly turned: KitchenItem | null;
  /** Ob in diesem Bild das Feuer ausgebrochen ist. */
  readonly lit: boolean;
}

/**
 * **Ein Bild am Herd** — `dt` Sekunden weiter.
 *
 * Aufgerufen wird sie nur, solange eine Pfanne auf dem Herd steht; ein Herd
 * ohne Pfanne bekommt `COLD_STOVE` und fragt gar nicht erst.
 *
 * **Der Rest einer Phase läuft in die nächste über.** Das ist der Unterschied
 * zwischen einer Uhr und einem Zähler: Wer bei 3,9 s ein Bild von 0,3 s
 * bekommt, ist 0,2 s im Verbrennen und nicht bei null. Sonst hinge die
 * Bratdauer an der Bildrate — im Test mit einem einzigen großen Schritt fiele
 * es sofort auf, im Headset nie.
 */
export function advanceStove(state: StoveState, dt: number): StoveTick {
  let { patty, time, fire } = state;
  let turned: KitchenItem | null = null;
  let lit = false;
  let left = Math.max(0, dt);
  while (patty && !fire && left > 0) {
    const full = span(stovePhase({ patty, time, fire }));
    if (time + left < full) {
      time += left;
      break;
    }
    left -= full - time;
    time = 0;
    const next = fryStage(patty);
    if (next) {
      patty = next;
      turned = next;
      continue;
    }
    // Nach dem verbrannten Patty kommt kein Ding mehr, sondern Feuer. Das
    // Patty bleibt liegen: Es verschwindet erst, wenn jemand gelöscht hat —
    // sonst stünde da ein brennender Herd mit leerer Pfanne.
    fire = true;
    lit = true;
  }
  return { state: { patty, time, fire }, turned, lit };
}

/**
 * **Gelöscht** — das Patty ist weg, die Pfanne bleibt.
 *
 * Die Pfanne steht nicht in diesem Zustand, sondern als `Dish` an der Station:
 * Was hier verschwindet, ist nur ihr Inhalt. Die Zone leert sie und setzt den
 * Herd zurück.
 */
export function douse(state: StoveState): StoveState {
  return state.fire ? COLD_STOVE : state;
}

// --- das Schneidebrett ------------------------------------------------------

/**
 * **Was auf dem Brett liegt und wie weit es geschnitten ist.**
 *
 * `cutting` ist der Grund, warum aus einer Tomate nicht in einem Zug Suppe
 * wird: Ist eine Stufe fertig, steht die Uhr, und das Ergebnis liegt da. Wer
 * weiterschneiden will, nimmt es und legt es wieder hin — ein Handgriff, der
 * zeigt, dass die zweite Stufe gewollt war und nicht passiert ist.
 */
export interface ChopState {
  readonly item: KitchenItem | null;
  /** Sekunden an dieser Stufe. */
  readonly time: number;
  /** Ob noch geschnitten wird. */
  readonly cutting: boolean;
}

/** Ein leeres Brett. */
export const EMPTY_BOARD: ChopState = { item: null, time: 0, cutting: false };

/**
 * **Frisch aufgelegt** — und damit fängt das Schneiden sofort an.
 *
 * Kein zusätzlicher Druck auf `A`: Wer etwas Schneidbares auf ein
 * Schneidebrett legt, will es schneiden. Alles andere darf trotzdem daliegen —
 * ein Brett ist auch eine Ablage —, nur die Uhr läuft dann nicht.
 */
export function onBoard(item: KitchenItem | null): ChopState {
  return { item, time: 0, cutting: item !== null && chopStage(item) !== null };
}

/** Der Anteil 0…1 für den Balken über dem Brett. */
export function chopProgress(state: ChopState): number {
  return state.cutting ? Math.min(1, state.time / CHOP_SECONDS) : 0;
}

/** Was ein Bild am Brett geändert hat. */
export interface ChopTick {
  readonly state: ChopState;
  /** Was in diesem Bild fertig geschnitten wurde. */
  readonly cut: KitchenItem | null;
}

/**
 * **Ein Bild am Brett** — `dt` Sekunden weiter, aber nur, wenn jemand
 * danebensteht.
 *
 * `live` ist die Figur am Brett. Geht sie weg, hört das Schneiden auf und der
 * **Fortschritt bleibt stehen**, statt zurückzufallen: Bei _Overcooked_ ist
 * das Weglaufen vom Brett eine Entscheidung („ich hole schon mal das
 * Brötchen") und keine Strafe. Zurückgesetzt wird nur, wer die Zutat in die
 * Hand nimmt — dann legt die Zone `EMPTY_BOARD` hin.
 */
export function advanceChop(state: ChopState, dt: number, live: boolean): ChopTick {
  if (!live || !state.cutting || !state.item) return { state, cut: null };
  const time = state.time + Math.max(0, dt);
  if (time < CHOP_SECONDS) return { state: { ...state, time }, cut: null };
  const cut = chopStage(state.item);
  if (!cut) return { state: { ...state, cutting: false }, cut: null };
  // Genau **eine** Stufe je Auflegen, auch wenn das Bild lang war: Der Rest
  // verfällt, weil die nächste Stufe einen neuen Handgriff braucht.
  return { state: { item: cut, time: 0, cutting: false }, cut };
}
