/**
 * **Die Uhr am Herd** — braten, verbrennen, brennen. Ohne three.js, ohne Zone,
 * ohne Bild.
 *
 * Eine Datei neben Rezept (`kitchenRecipes.ts`) und Regel (`kitchenCarry.ts`),
 * und der Grund ist ein anderer als dort: Alles in jenen beiden passiert,
 * **weil jemand `A` drückt**. Hier passiert etwas, **weil Zeit vergeht** — und
 * das ist die fehleranfälligste Stelle der ganzen Küche. Ein Bild dauert
 * 16 ms, eine Phase 4 s, und wer die Reste am Phasenende wegwirft, dessen
 * Patty verbrennt je nach Bildrate unterschiedlich schnell. Deshalb steht die
 * Rechnung hier, wo ein Test sie mit einem Schritt von 100 s genauso
 * nachrechnen kann wie mit tausend Schritten von 0,1 s.
 *
 * **Das Schneidebrett stand einmal mit in dieser Datei** — es ist in
 * `kitchenWork.ts` aufgegangen, zusammen mit der Spüle. Der Unterschied, an
 * dem die Trennung hängt, ist die Figur davor: Der Herd läuft weiter, **ob
 * jemand dabeisteht oder nicht** (sonst könnte man in der Bratzeit nichts
 * anderes tun), die Arbeit dort drüben läuft **nur**, solange jemand dabeisteht.
 * Zwei Rechnungen mit gegenteiliger Grundannahme gehören nicht nebeneinander,
 * nur weil in beiden eine Zahl hochzählt.
 *
 * Die Zone gibt je Bild ihr `dt` hinein und bekommt einen neuen Zustand
 * zurück, dazu einen Anteil 0…1 für den Balken darüber (Spezifikation §7).
 * Sie merkt sich nichts selbst — der Zustand ist unveränderlich und gehört an
 * die Station.
 */

import { fryStage, type Dish, type KitchenItem } from './kitchenRecipes';

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

/**
 * **Was auf dem Herd liegt, und was das für seine Uhr heißt** — eine Zeile,
 * und sie ist die ganze Antwort auf „warum brät es in der Hand nicht weiter?".
 *
 * Auf dem Herd steht die **Pfanne**, und **in** ihr liegt das Patty
 * (`kitchenRecipes.TAKES`). Liegt dort etwas anderes — ein Teller, ein
 * Brötchen, gar nichts —, brät nichts, und genau das sagt `onStove(null)`.
 *
 * Die Rechnung stand bis eben mitten in der Zone (`kitchen.ts`, `settle`) und
 * damit an der einen Stelle, die kein Test lesen kann: Die Zone braucht
 * three.js, ein Netz und einen Wirt. Dass **jeder Griff an die Pfanne den
 * Fortschritt löscht**, war deshalb nur für `onStove` allein bewiesen und
 * nirgends für den Weg dorthin — und das ist die Hälfte, die man beim nächsten
 * Umbau kaputt macht, ohne dass etwas rot wird.
 *
 * **Immer von vorn, in beide Richtungen.** Hochheben löscht die Uhr, weil dann
 * nichts mehr darauf steht; Hinstellen löscht sie ebenso, weil `onStove` bei
 * null anfängt. Ein Fortschritt muss also **am Stück** durchlaufen, um die
 * nächste Stufe zu erreichen — wer die Pfanne eine halbe Sekunde vor dem
 * Umschlagen anhebt, fängt die Stufe danach wieder bei null an. Die erreichte
 * **Stufe** reist dabei in der Pfanne mit (sie steht im `Dish`) und geht nicht
 * verloren; nur der angefangene Rest tut es.
 */
export function stoveUnder(on: Dish | null): StoveState {
  return onStove(on?.item === 'pan' ? (on.on[0] ?? null) : null);
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
