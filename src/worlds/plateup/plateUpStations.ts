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
  isBurnt,
  pieces,
  servings,
  stackOf,
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
import { advanceFix, startFix, type LeakState } from '../test/zones/kitchenLeak';

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
  /**
   * **Ob es brennt** — nur der Herd mit Pfanne: Was darin verkohlt liegt und
   * weiter auf dem Herd bleibt, fängt nach `ignite` Sekunden Feuer
   * (`tickStation`). Solange es brennt, lehnt der Herd alles ab
   * (`kitchenCarry.kitchenDeed`, `fire`), bis der Feuerlöscher es löscht
   * (`douseStation`). Ohne Angabe: kein Feuer.
   */
  readonly fire?: boolean;
  /**
   * **Ob das Becken spritzt** — nur an der Spüle, wie in der Sandbox
   * (`test/zones/kitchenLeak`): Solange es leckt, füllt es keinen Topf, und
   * nur die Rohrzange dichtet es ab (`repair`, dann `REPAIR_SECONDS` davor
   * stehen). Ohne Angabe: dicht.
   */
  readonly leak?: LeakState;
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
    //
    // **Außer beim Abtropfgitter mit Grenze** (`StationSpot.rack`): Das hält
    // wirklich höchstens vier, und die Regel soll „voll" sagen dürfen.
    const stack = state.spot.rack
      ? Math.min(state.stock, CLEAN_STACK_MAX)
      : Math.min(state.stock, CLEAN_STACK_MAX - 1);
    const gives = stackGives(state.spot);
    const stacked = gives === 'plate' && stack <= 0 ? null : gives;
    return { kind: 'drain', stack, stacked };
  }
  return {
    kind: state.spot.kind,
    on: state.on,
    ...(state.spot.gives ? { gives: state.spot.gives } : {}),
    ...(state.fire ? { fire: true } : {}),
    ...(state.leak?.leaking ? { leaking: true } : {}),
  };
}

/** Was ein Druck hier bewirken würde — für den Saum und den Satz. */
export function stationDeed(held: Dish | null, state: StationState): KitchenDeed {
  // **Die Tomatenscheibe wird nicht noch einmal geschnitten** — gewünscht:
  // _„Tomaten kann man nun doch nur ein Mal schneiden."_ Auf dem Brett liegt
  // sie wie auf einer Platte; zur Suppe wird sie im Topf (`COOKS`). Die
  // Sandbox behält ihre zweite Schnittstufe (`kitchenRecipes.CHOPS`).
  if (state.spot.kind === 'board' && held && ONE_CHOP.has(held.item)) {
    return kitchenDeed(held, { kind: 'top', on: state.on });
  }
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
      if (state.spot.rack) return { do: 'refuse', why: 'Im Abtropfgitter steht kein Teller mehr' };
      return { do: 'refuse', why: 'Keine sauberen Teller — Geschirr abräumen und spülen' };
    }
  }
  return kitchenDeed(held, asStation(state));
}

/** Was an diesen Stationen nur einmal geschnitten wird — die Scheibe bleibt Scheibe. */
const ONE_CHOP: ReadonlySet<KitchenItem> = new Set<KitchenItem>(['tomato-cut']);

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
    // Die Zange angesetzt: Ab jetzt läuft die Reparatur (`tickStation`).
    case 'repair':
      return state.leak ? { held, station: { ...state, leak: startFix(state.leak) }, deed } : same;
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
  /** Ob in diesem Bild die Pfanne Feuer gefangen hat. */
  readonly lit?: boolean;
}

/** Wie lange ein gebratenes Patty liegen darf, wenn niemand etwas sagt (Tag 1). */
export const DEFAULT_BURN = 14;

/**
 * **Wie lange Verkohltes in der Pfanne liegen darf, bis der Herd brennt**, in
 * Sekunden — die zweite Frist nach `DEFAULT_BURN`. Gewünscht: _„wenn die Stufe
 * durch ist, ist es verkohlt wie aktuell aber dann beginnt nochmal ein
 * Countdown bis das was auf dem Herd ist anfängt zu brennen"_.
 */
export const DEFAULT_IGNITE = 8;

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
  ignite = DEFAULT_IGNITE,
): StationTick {
  const idle = { station: state, done: false, toHand: null, burnt: false };
  // **Ein brennender Herd tut nichts mehr** — bis der Feuerlöscher kommt
  // (`douseStation`).
  if (state.fire) return idle;
  // **Das undichte Becken wird abgedichtet**, solange jemand mit angesetzter
  // Zange davorsteht (`kitchenLeak.advanceFix`).
  if (state.leak?.leaking) {
    const fix = advanceFix(state.leak, dt, near);
    return fix.state === state.leak ? idle : { ...idle, station: { ...state, leak: fix.state } };
  }
  // **Die Pfanne auf dem Herd ist eine Grillplatte zum Mitnehmen**
  // (`panOnStove`): Was darin liegt, brät und verbrennt wie auf der Platte
  // und bleibt dabei in der Pfanne.
  const panned = panOnStove(state);
  // **Und was darin verkohlt liegt, fängt Feuer** — nach `ignite` Sekunden.
  // Nur in der Pfanne: Die Grillplatte des Restaurants verkohlt, brennt aber
  // nicht, und die sichere Kochstelle verkohlt nicht einmal.
  if (panned && isBurnt(panned)) {
    const heat = state.heat + Math.max(0, dt);
    if (heat < ignite) return { ...idle, station: { ...state, heat } };
    return { ...idle, station: { ...state, heat: 0, fire: true }, lit: true };
  }
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
        on: panned ? inPan(state, black) : dish(black),
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
    //
    // **Aber nur, was unterbrochen wurde** — nicht, was eben fertig wurde:
    // Nach einer Stufe steht die Uhr leer (`IDLE_WORK`, unten), und die
    // nächste Stufe braucht einen neuen Handgriff. Gemeldet: _„Tomaten sollen
    // übrigens nicht sofort zu Tomaten Suppe werden, nur weil ich davor beim
    // Schneidebrett stehe"_ — dieselbe Regel wie in der Sandbox
    // (`kitchenWork.advanceWork`: „genau eine Stufe je Auflegen").
    const kind = STATION_WORK[state.spot.kind];
    if (!near || !kind || !state.on || state.on.on.length) return idle;
    if (work.kind !== kind || work.item !== state.on.item) return idle;
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
  // **Eine Suppe liegt in Portionen im Topf** (`kitchenRecipes.servings`):
  // acht Schüsseln, dann ist er leer.
  const on = boiling
    ? dish(
        'pot',
        Array.from({ length: servings(tick.done) }, () => tick.done!),
      )
    : panned
      ? inPan(state, tick.done)
      : stackOf(tick.done, pieces(tick.done));
  return {
    station: { ...state, on, work: IDLE_WORK, heat: 0 },
    done: true,
    toHand: null,
    burnt: false,
  };
}

/**
 * **Wie weit es auf dem Herd ist** — für Dreieck, Warnton und Feuer
 * (`elements/stationLayer`):
 *
 * - `burning`: gebraten, die Uhr läuft aufs Verkohlen zu (langsam blinken);
 * - `igniting`: verkohlt, die Uhr läuft aufs Feuer zu (schnell blinken);
 * - `fire`: es brennt.
 *
 * `null`, wenn nichts davon — auch auf der Grillplatte, die nur verkohlt.
 */
export type StovePhase = 'burning' | 'igniting' | 'fire';

export function stovePhase(state: StationState): StovePhase | null {
  if (state.fire) return 'fire';
  const panned = panOnStove(state);
  if (!panned || state.work.working) return null;
  if (isBurnt(panned)) return 'igniting';
  return burnStage(panned) ? 'burning' : null;
}

/**
 * **Das Feuer löschen** — der Herd brennt nicht mehr, und was in der Pfanne
 * verkohlt war, ist weg. Die Pfanne bleibt, wie in der Sandbox
 * (`kitchenClock.douse`, `kitchen.putOut`).
 */
export function douseStation(state: StationState): StationState {
  if (!state.fire) return state;
  const on = state.on?.item === 'pan' ? dish('pan') : state.on;
  return { ...state, fire: false, heat: 0, on, work: IDLE_WORK };
}

/** Die Pfanne mit derselben Zahl Stücke darin, alle zu `item` geworden. */
function inPan(state: StationState, item: KitchenItem): Dish {
  return dish(
    'pan',
    Array.from({ length: state.on?.on.length || 1 }, () => item),
  );
}

/**
 * **Was in der Pfanne auf dem Herd liegt** — das eine Ding darin (bei den
 * Waffeln: die eine Sorte, zu der alle darin gehören), oder `null`.
 * Die Pfanne steht dort wie in der Sandbox-Küche (`kitchenClock.stoveUnder`:
 * auf dem Herd die Pfanne, **in** ihr das Patty) und brät, was die
 * Grillplatte brät (`kitchenWork`, `'fry'`).
 */
export function panOnStove(state: StationState): KitchenItem | null {
  const on = state.on;
  if (state.spot.kind !== 'stove' || on?.item !== 'pan' || !on.on.length) return null;
  const first = on.on[0]!;
  return on.on.every((item) => item === first) ? first : null;
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
export function burnShare(
  state: StationState,
  burn = DEFAULT_BURN,
  ignite = DEFAULT_IGNITE,
): number {
  const panned = panOnStove(state);
  if (panned) {
    if (isBurnt(panned) && !state.fire) return Math.min(1, state.heat / Math.max(0.001, ignite));
    return burnStage(panned) ? Math.min(1, state.heat / Math.max(0.001, burn)) : 0;
  }
  if (state.spot.kind !== 'griddle' || !state.on || !burnStage(state.on.item)) return 0;
  return Math.min(1, Math.max(0, state.heat / Math.max(0.001, burn)));
}
