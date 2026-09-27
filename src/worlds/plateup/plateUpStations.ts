import {
  CLEAN_STACK_MAX,
  STATION_WORK,
  kitchenDeed,
  type KitchenDeed,
  type Station,
} from '../test/zones/kitchenCarry';
import {
  ITEM_LABELS,
  burnStage,
  dish,
  potCooks,
  type Dish,
  type KitchenItem,
} from '../test/zones/kitchenRecipes';
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
   *
   * Gibt der Stapel etwas anderes her (`stackGives`: Schüsseln,
   * Pizzakartons), zählt dieselbe Zahl eben diese.
   */
  readonly stock: number;
  /**
   * **Wie lange das Gebratene schon liegt**, in Sekunden — nur an der
   * Grillplatte und nur bei dem, was verbrennen kann (Patty, Schinken:
   * `kitchenRecipes.burnStage`). Ab `burn` Sekunden (`plateUpGame.dayRules`)
   * ist es schwarz.
   */
  readonly heat: number;
}

/**
 * **Wie viele Teller der Laden hat** — sechs: genug für vier Tische mit je
 * einem Gast und zwei in der Spüle, zu wenig, wenn niemand abräumt.
 */
export const PLATES = 6;

/**
 * **Was ein Stapel hergibt** — `spot.gives`, ohne Angabe der Teller.
 *
 * Der Laden hatte nur einen Stapel, und der war der Tellerstapel. Das Test
 * Restaurant braucht zwei weitere — Schüsseln für Suppe und Waffeln,
 * Pizzakartons für die Pizza zum Mitnehmen —, und die unterscheiden sich vom
 * Tellerstapel in nichts als dem, was obenauf steht. Also ist es derselbe
 * `drain`, und `gives` sagt, welche Sorte; ohne Angabe bleibt alles, wie es
 * im Laden immer war.
 */
export function stackGives(spot: Pick<StationSpot, 'gives'>): KitchenItem {
  return spot.gives ?? 'plate';
}

/**
 * **Alle Stationen, leer — die Stapel voll.**
 *
 * Wie viele es je Stapel sind, sagt der Platz selbst (`StationSpot.stock`):
 * ohne Angabe `PLATES`, und `Infinity` für einen Stapel, der nie leer wird
 * (Schüsseln und Kartons, die mit dem Gericht zum Gast gehen und nicht
 * zurückkommen). Alle anderen Stationen zählen nichts.
 */
export function freshStations(spots: readonly StationSpot[]): StationState[] {
  return spots.map((spot) => ({
    spot,
    on: null,
    work: IDLE_WORK,
    stock: spot.kind === 'drain' ? (spot.stock ?? PLATES) : 0,
    heat: 0,
  }));
}

/** Die Station, wie `kitchenDeed` sie sehen will. */
export function asStation(state: StationState): Station {
  if (state.spot.kind === 'drain') {
    // **Der Stapel ist ein Abtropfgitter ohne Obergrenze**: Die Küche zählt
    // bis vier (`CLEAN_STACK_MAX`), dieser Laden hat sechs Teller. Die Regel
    // bekommt deshalb nie mehr als drei zu sehen — damit sie nie „voll" sagt.
    //
    // **Und `stacked` ist, was der Stapel hergibt** (`stackGives`) — beim
    // Tellerstapel wie immer der saubere Teller, sobald einer dasteht. Ein
    // Stapel aus Schüsseln oder Kartons nennt seine Sorte auch leer: Nur so
    // weiß die Regel, dass dort nichts anderes hingestellt werden darf.
    const stack = Math.min(state.stock, CLEAN_STACK_MAX - 1);
    const gives = stackGives(state.spot);
    const stacked = gives === 'plate' && stack <= 0 ? null : gives;
    return { kind: 'drain', stack, stacked };
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
    const gives = stackGives(state.spot);
    // Schmutziges gehört in die Spüle und nicht auf den Stapel — in ein leeres
    // Gitter ließe die Küche es sonst hinein. Vor einem Stapel Schüsseln sagt
    // es die Regel selbst (`kitchenCarry.inRack`), und die Spüle muss dort
    // nicht daneben sein.
    if (gives === 'plate' && held?.item === 'plate-dirty') {
      return { do: 'refuse', why: 'Schmutzige Teller erst spülen — die Spüle ist daneben' };
    }
    if (!held && state.stock <= 0) {
      if (gives !== 'plate') return { do: 'refuse', why: `Kein ${ITEM_LABELS[gives]} mehr da` };
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
      // Kiste und Eiswanne geben aus dem Nichts in die Hand und bleiben, wie
      // sie sind.
      if (kind === 'crate' || kind === 'tub') return { held: deed.held, station: state, deed };
      const on = deed.target;
      const heat = on && state.on && on.item === state.on.item ? state.heat : 0;
      return { held: deed.held, station: { ...state, on, work: restart(state, on), heat }, deed };
    }
    case 'trash':
    case 'stow':
      return { held: null, station: state, deed };
    // Der Topf unter dem Hahn: Er ist danach voll, die Spüle bleibt, wie sie
    // war (`kitchenCarry.atSink`).
    case 'fill':
      return { held: deed.dish, station: state, deed };
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
  /** Ob in diesem Bild etwas verbrannt ist — Patty oder Schinken. */
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
  // **Die Pfanne auf dem Herd ist eine Grillplatte zum Mitnehmen**
  // (`panOnStove`): Was darin liegt, brät und verbrennt wie auf der Platte
  // und bleibt dabei in der Pfanne.
  const panned = panOnStove(state);
  // **Was verbrennen kann, verbrennt** — das Patty wie der Schinken
  // (`kitchenRecipes.burnStage`). Die Waffel steht nicht darin: Sie bleibt
  // auf der heißen Platte, wie sie ist.
  const black = panned
    ? burnStage(panned)
    : state.on && !state.on.on.length
      ? burnStage(state.on.item)
      : null;
  if ((state.spot.kind === 'griddle' || panned) && black && !state.work.working) {
    const heat = state.heat + Math.max(0, dt);
    if (heat < burn) return { ...idle, station: { ...state, heat } };
    return {
      ...idle,
      station: {
        ...state,
        on: panned ? dish('pan', [black]) : dish(black),
        heat: 0,
        work: IDLE_WORK,
      },
      burnt: true,
    };
  }
  let work = state.work;
  // **Der Topf mit Wasser auf dem Herd kocht, was darin liegt**
  // (`kitchenRecipes.potCooks`) — allein, wie der Suppentopf (`'cook'`,
  // `kitchenWork.WORK_ALONE`). Die Uhr wird angelegt, sobald Topf und Zutat
  // zusammen auf dem Herd stehen, egal in welcher Reihenfolge sie kamen.
  const boiling = state.spot.kind === 'stove' && state.on ? potCooks(state.on) : null;
  if (!work.working && boiling) {
    work = onWork('cook', boiling);
  } else if (!work.working && panned) {
    work = onWork('fry', panned);
    if (!work.working) return idle;
  } else if (!work.working) {
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
  // Im Topf auf dem Herd bleibt das Gekochte **im Topf** — das Wasser ist
  // verkocht, der Topf nicht.
  const on = boiling
    ? dish('pot', [tick.done])
    : panned
      ? dish('pan', [tick.done])
      : dish(tick.done);
  return {
    station: { ...state, on, work: tick.state, heat: 0 },
    done: true,
    toHand: null,
    burnt: false,
  };
}

/**
 * **Was in der Pfanne auf dem Herd liegt** — das eine Ding darin, oder `null`.
 * Die Pfanne steht dort wie in der Sandbox-Küche (`kitchenClock.stoveUnder`:
 * auf dem Herd die Pfanne, **in** ihr das Patty) und brät, was die
 * Grillplatte brät (`kitchenWork`, `'fry'`).
 */
export function panOnStove(state: StationState): KitchenItem | null {
  const on = state.on;
  if (state.spot.kind !== 'stove' || on?.item !== 'pan' || on.on.length !== 1) return null;
  return on.on[0]!;
}

/** Der Anteil 0…1 für den Balken über der Station — 0, wenn nichts arbeitet. */
export function stationProgress(state: StationState): number {
  return workProgress(state.work);
}

/**
 * **Wie nah das Gebratene am Verbrennen ist** — 0…1, 0 wenn nichts auf der
 * Grillplatte liegt, das verbrennen kann (`kitchenRecipes.burnStage`). Ab der
 * Hälfte warnt die Welt (Rauch, roter Balken).
 */
export function burnShare(state: StationState, burn = DEFAULT_BURN): number {
  const panned = panOnStove(state);
  if (panned) return burnStage(panned) ? Math.min(1, state.heat / Math.max(0.001, burn)) : 0;
  if (state.spot.kind !== 'griddle' || !state.on || !burnStage(state.on.item)) return 0;
  return Math.min(1, Math.max(0, state.heat / Math.max(0.001, burn)));
}
