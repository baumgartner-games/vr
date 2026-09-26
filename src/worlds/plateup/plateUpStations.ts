import {
  STATION_WORK,
  kitchenDeed,
  type KitchenDeed,
  type Station,
} from '../test/zones/kitchenCarry';
import { dish, type Dish } from '../test/zones/kitchenRecipes';
import {
  IDLE_WORK,
  advanceWork,
  onWork,
  workProgress,
  type WorkState,
} from '../test/zones/kitchenWork';
import type { StationSpot } from './plateUpPlan';

/**
 * **Die Stationen des Burgerladens** — was auf ihnen liegt, was daran gerade
 * gart oder geschnitten wird, und was ein Druck auf `A` daran ändert. Ohne
 * three.js.
 *
 * Die **Regel** kommt aus der Küche der Testwelt (`kitchenCarry.kitchenDeed`)
 * und wird hier nur **ausgeführt**: Welche Tat ein Druck bewirkt, entscheidet
 * dort genau eine Funktion, und hier steht, wie danach Hand und Station
 * aussehen. Ein Brötchen geht damit in beiden Küchen gleich auf den Teller,
 * und eine Kiste nimmt in beiden dasselbe zurück.
 *
 * Unveränderlich wie jeder Zustand dieser Küchen: `useStation` gibt den
 * **neuen** Stand zurück, statt am alten zu drehen — ein Test legt zwei
 * Stände nebeneinander, statt einem Objekt beim Umbauen zuzusehen.
 */
export interface StationState {
  readonly spot: StationSpot;
  /** Was darauf liegt — `null` heißt frei. */
  readonly on: Dish | null;
  /** Die Uhr am Brett und an der Grillplatte (`kitchenWork.ts`). */
  readonly work: WorkState;
}

/** Alle Stationen, leer. */
export function freshStations(spots: readonly StationSpot[]): StationState[] {
  return spots.map((spot) => ({ spot, on: null, work: IDLE_WORK }));
}

/** Die Station, wie `kitchenDeed` sie sehen will. */
export function asStation(state: StationState): Station {
  return {
    kind: state.spot.kind,
    on: state.on,
    ...(state.spot.gives ? { gives: state.spot.gives } : {}),
  };
}

/** Was ein Druck hier bewirken würde — für den Saum und den Satz. */
export function stationDeed(held: Dish | null, state: StationState): KitchenDeed {
  return kitchenDeed(held, asStation(state));
}

/** Hand und Station nach einem Druck — und die Tat, die es war. */
export interface StationUse {
  readonly held: Dish | null;
  readonly station: StationState;
  readonly deed: KitchenDeed;
}

/**
 * **Einen Druck ausführen.**
 *
 * Was `kitchenDeed` sagt, wird hier Wirklichkeit: Die Kiste gibt aus und
 * bleibt, wie sie ist; eine Ablage gibt her, was auf ihr liegt; Brett und
 * Grillplatte nehmen an und fangen an zu arbeiten. `serve` und `repair` gibt
 * es in diesem Laden nicht (keine Theke, kein Leck) — sie ändern nichts.
 */
export function useStation(held: Dish | null, state: StationState): StationUse {
  const deed = stationDeed(held, state);
  const kind = state.spot.kind;
  const same = { held, station: state, deed };
  switch (deed.do) {
    case 'take': {
      if (kind === 'crate') return { held: deed.dish, station: state, deed };
      if (kind === 'box' && !state.on) return { held: deed.dish, station: state, deed };
      return { held: deed.dish, station: { ...state, on: null, work: IDLE_WORK }, deed };
    }
    case 'place':
      return { held: null, station: { ...state, on: deed.dish, work: IDLE_WORK }, deed };
    case 'work':
      return {
        held: null,
        station: { ...state, on: deed.dish, work: onWork(deed.kind, deed.dish.item) },
        deed,
      };
    case 'combine': {
      if (kind === 'crate') return { held: deed.held, station: state, deed };
      const on = deed.target;
      return { held: deed.held, station: { ...state, on, work: restart(state, on) }, deed };
    }
    case 'trash':
    case 'stow':
      return { held: null, station: state, deed };
    case 'scrape':
      return { held: deed.dish, station: state, deed };
    default:
      return same;
  }
}

/**
 * **Die Uhr nach einem Zusammenlegen** — sie läuft weiter, wenn noch dasselbe
 * darauf liegt, und fängt neu an, wenn etwas anderes daraufgekommen ist.
 */
function restart(state: StationState, on: Dish | null): WorkState {
  if (!on) return IDLE_WORK;
  if (state.work.item === on.item && !on.on.length) return state.work;
  const kind = STATION_WORK[state.spot.kind];
  return kind && !on.on.length ? onWork(kind, on.item) : IDLE_WORK;
}

/**
 * **Ein Bild an einer Station** — `dt` Sekunden weiter.
 *
 * `near` sagt, ob jemand davorsteht: Das Brett schneidet nur mit jemandem
 * davor, die Grillplatte brät auch allein (`kitchenWork.WORK_ALONE`) — und
 * verbrennt nichts, das ist ihre Bauart.
 *
 * @returns den neuen Stand und ob in diesem Bild etwas fertig wurde
 */
export function tickStation(
  state: StationState,
  dt: number,
  near: boolean,
): { station: StationState; done: boolean } {
  let work = state.work;
  if (!work.working) {
    // **Wer zurückkommt, schneidet weiter** — von vorn, wie in der Küche
    // (`advanceWork` setzt die Uhr zurück, sobald niemand davorsteht). Ohne
    // diese Zeile bliebe ein halb geschnittener Salat für immer liegen, bis
    // ihn jemand aufnimmt und wieder hinlegt.
    const kind = STATION_WORK[state.spot.kind];
    if (!near || !kind || !state.on || state.on.on.length) return { station: state, done: false };
    work = onWork(kind, state.on.item);
    if (!work.working) return { station: state, done: false };
  }
  const tick = advanceWork(work, dt, near);
  if (!tick.done) {
    return { station: { ...state, work: tick.state }, done: false };
  }
  return { station: { ...state, on: dish(tick.done), work: tick.state }, done: true };
}

/** Der Anteil 0…1 für den Balken über der Station — 0, wenn nichts arbeitet. */
export function stationProgress(state: StationState): number {
  return workProgress(state.work);
}
