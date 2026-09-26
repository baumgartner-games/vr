import {
  CLEAN_STACK_MAX,
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
  /** Die Uhr am Brett, an der Grillplatte und in der Spüle (`kitchenWork.ts`). */
  readonly work: WorkState;
  /**
   * **Wie viele saubere Teller** auf dem Stapel stehen — nur beim `drain`.
   * Teller gibt es nicht beliebig: Was an den Tisch geht, kommt schmutzig
   * zurück und muss durch die Spüle, bevor es wieder hier steht.
   */
  readonly stock: number;
  /**
   * **Wie lange das gebratene Patty schon liegt**, in Sekunden — nur an der
   * Grillplatte. Ab `burn` Sekunden (`plateUpGame.dayRules`) ist es schwarz.
   */
  readonly heat: number;
}

/**
 * **Wie viele Teller der Laden hat** — sechs: genug für vier Tische mit je
 * einem Gast und zwei in der Spüle, zu wenig, wenn niemand abräumt.
 */
export const PLATES = 6;

/** Alle Stationen, leer — der Tellerstapel voll. */
export function freshStations(spots: readonly StationSpot[]): StationState[] {
  return spots.map((spot) => ({
    spot,
    on: null,
    work: IDLE_WORK,
    stock: spot.kind === 'drain' ? PLATES : 0,
    heat: 0,
  }));
}

/** Die Station, wie `kitchenDeed` sie sehen will. */
export function asStation(state: StationState): Station {
  if (state.spot.kind === 'drain') {
    // **Der Stapel ist ein Abtropfgitter ohne Obergrenze**: Die Küche zählt
    // bis vier (`CLEAN_STACK_MAX`), dieser Laden hat sechs Teller. Die Regel
    // bekommt deshalb nie mehr als drei zu sehen — damit sie nie „voll" sagt.
    const stack = Math.min(state.stock, CLEAN_STACK_MAX - 1);
    return { kind: 'drain', stack, stacked: stack > 0 ? 'plate' : null };
  }
  return {
    kind: state.spot.kind,
    on: state.on,
    ...(state.spot.gives ? { gives: state.spot.gives } : {}),
  };
}

/** Was ein Druck hier bewirken würde — für den Saum und den Satz. */
export function stationDeed(held: Dish | null, state: StationState): KitchenDeed {
  if (state.spot.kind === 'drain') {
    // Schmutziges gehört in die Spüle und nicht auf den Stapel — in ein leeres
    // Gitter ließe die Küche es sonst hinein.
    if (held?.item === 'plate-dirty') {
      return { do: 'refuse', why: 'Schmutzige Teller erst spülen — die Spüle ist daneben' };
    }
    if (!held && state.stock <= 0) {
      return { do: 'refuse', why: 'Keine sauberen Teller — Geschirr abräumen und spülen' };
    }
  }
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
  if (kind === 'drain') {
    // Der Stapel zählt nur: Nehmen (auch mit dem Brötchen, das dabei auf den
    // Teller springt) nimmt einen weg, Abstellen stellt einen dazu.
    if (deed.do === 'take') {
      return { held: deed.dish, station: { ...state, stock: state.stock - 1 }, deed };
    }
    if (deed.do === 'combine') {
      return { held: deed.held, station: { ...state, stock: state.stock - 1 }, deed };
    }
    if (deed.do === 'place') {
      return { held: null, station: { ...state, stock: state.stock + 1 }, deed };
    }
    return same;
  }
  switch (deed.do) {
    case 'take': {
      if (kind === 'crate') return { held: deed.dish, station: state, deed };
      if (kind === 'box' && !state.on) return { held: deed.dish, station: state, deed };
      return { held: deed.dish, station: { ...state, on: null, work: IDLE_WORK, heat: 0 }, deed };
    }
    case 'place':
      return { held: null, station: { ...state, on: deed.dish, work: IDLE_WORK, heat: 0 }, deed };
    case 'work':
      return {
        held: null,
        station: { ...state, on: deed.dish, work: onWork(deed.kind, deed.dish.item), heat: 0 },
        deed,
      };
    case 'combine': {
      if (kind === 'crate') return { held: deed.held, station: state, deed };
      const on = deed.target;
      const heat = on && state.on && on.item === state.on.item ? state.heat : 0;
      return { held: deed.held, station: { ...state, on, work: restart(state, on), heat }, deed };
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

/** Was ein Bild an einer Station geändert hat. */
export interface StationTick {
  readonly station: StationState;
  /** Ob in diesem Bild etwas fertig wurde (gebraten, geschnitten, gespült). */
  readonly done: boolean;
  /** Der saubere Teller aus der Spüle, der **in die Hand** gehen soll — sonst `null`. */
  readonly toHand: Dish | null;
  /** Ob in diesem Bild ein Patty verbrannt ist. */
  readonly burnt: boolean;
}

/** Wie lange ein gebratenes Patty liegen darf, wenn niemand etwas sagt (Tag 1). */
export const DEFAULT_BURN = 14;

/**
 * **Ein Bild an einer Station** — `dt` Sekunden weiter.
 *
 * `near` sagt, ob jemand davorsteht: Brett und Spüle arbeiten nur mit jemandem
 * davor, die Grillplatte brät auch allein (`kitchenWork.WORK_ALONE`).
 *
 * **Anders als in der Testküche verbrennt hier etwas**: Die Grillplatte der
 * Küche ist die sichere Kochstelle, und die bleibt beim Gebratenen stehen.
 * Im Laden liegt das Patty danach weiter auf der heißen Platte, und nach
 * `burn` Sekunden ist es schwarz (`patty-burnt`) — das geht nur noch in den
 * Müll. Die Zeit dafür zählt `heat`, und sie steht hier und nicht in
 * `kitchenWork`, weil sie nur diesen Laden betrifft.
 *
 * `handFree` sagt, ob der saubere Teller aus der Spüle in die Hand darf
 * (`kitchenWork.WORK_TO_HAND`).
 */
export function tickStation(
  state: StationState,
  dt: number,
  near: boolean,
  handFree = false,
  burn = DEFAULT_BURN,
): StationTick {
  const idle = { station: state, done: false, toHand: null, burnt: false };
  if (
    state.spot.kind === 'griddle' &&
    state.on?.item === 'patty-cooked' &&
    !state.on.on.length &&
    !state.work.working
  ) {
    const heat = state.heat + Math.max(0, dt);
    if (heat < burn) return { ...idle, station: { ...state, heat } };
    return {
      ...idle,
      station: { ...state, on: dish('patty-burnt'), heat: 0, work: IDLE_WORK },
      burnt: true,
    };
  }
  let work = state.work;
  if (!work.working) {
    // **Wer zurückkommt, schneidet weiter** — von vorn, wie in der Küche
    // (`advanceWork` setzt die Uhr zurück, sobald niemand davorsteht). Ohne
    // diese Zeile bliebe ein halb geschnittener Salat für immer liegen, bis
    // ihn jemand aufnimmt und wieder hinlegt.
    const kind = STATION_WORK[state.spot.kind];
    if (!near || !kind || !state.on || state.on.on.length) return idle;
    work = onWork(kind, state.on.item);
    if (!work.working) return idle;
  }
  const tick = advanceWork(work, dt, near, handFree);
  if (!tick.done) {
    return { ...idle, station: { ...state, work: tick.state } };
  }
  if (tick.toHand) {
    return {
      station: { ...state, on: null, work: IDLE_WORK, heat: 0 },
      done: true,
      toHand: dish(tick.done),
      burnt: false,
    };
  }
  return {
    station: { ...state, on: dish(tick.done), work: tick.state, heat: 0 },
    done: true,
    toHand: null,
    burnt: false,
  };
}

/** Der Anteil 0…1 für den Balken über der Station — 0, wenn nichts arbeitet. */
export function stationProgress(state: StationState): number {
  return workProgress(state.work);
}

/**
 * **Wie nah das Patty am Verbrennen ist** — 0…1, 0 wenn nichts Gebratenes
 * auf der Grillplatte liegt. Ab der Hälfte warnt die Welt (Rauch, roter
 * Balken).
 */
export function burnShare(state: StationState, burn = DEFAULT_BURN): number {
  if (state.spot.kind !== 'griddle' || state.on?.item !== 'patty-cooked') return 0;
  return Math.min(1, Math.max(0, state.heat / Math.max(0.001, burn)));
}
