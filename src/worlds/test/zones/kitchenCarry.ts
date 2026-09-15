/**
 * **Was `A` in der Küche tut** — die Regel hinter dem Kochen, ohne three.js.
 *
 * In der Küche steht siebenerlei herum, das auf `A` antwortet: **Flächen**, auf
 * denen etwas liegen kann (Zeile, Tisch, Ausgaberegal), die **Kisten**, aus
 * denen die Zutaten kommen, das **Schneidebrett**, der **Herd mit der Pfanne**,
 * die **Ausgabetheke**, der **Mülleimer** und die **Halterung** des
 * Feuerlöschers. Was beim Drücken passiert, hängt an genau zwei Dingen: was die
 * Figur gerade trägt, und wovor sie steht.
 *
 * Das sind ein paar Dutzend Fälle, und sie stehen hier als **eine Funktion**
 * und nicht als sieben `if`-Ketten in der Zone daneben. Der Grund ist derselbe
 * wie überall in diesem Projekt, wo eine Rechnung von ihrer Darstellung
 * getrennt ist: Ein Fall prüft ein Test in Millisekunden nach; derselbe Fall im
 * Headset ist eine Viertelstunde Hin- und Herlaufen, und beim zehnten Umbau
 * macht es niemand mehr.
 *
 * **Die Anrichte ist weg**, und das ist die größte Änderung an dieser Datei.
 * Früher gab es ein Möbel, auf dem als einzigem ein Burger entstehen konnte,
 * und einen eigenen Fall `stack` dafür. Jetzt sind **Teller und Brötchen
 * selbst die Träger** (`kitchenRecipes.Dish`), und damit wird überall
 * kombiniert — in der Hand, auf der Zeile, auf dem Brett, am Herd, sogar an der
 * Kiste. Eine Regel weniger, ein Möbel weniger, und der Weg, den man bei
 * _Overcooked_ ohnehin geht.
 *
 * **Woraus ein Burger besteht, steht nebenan** (`kitchenRecipes.ts`), **wie
 * lange etwas dauert, daneben** (`kitchenClock.ts`). Hier steht nur, was ein
 * Druck bewirkt — die Rezeptliste und die Bratdauer ändern sich unabhängig
 * davon.
 *
 * **Warum der Topf nicht in den Müll darf.** Ein Mülleimer, der alles
 * schluckt, ist ein Mülleimer, in dem nach zwei Minuten die einzige Pfanne der
 * Küche liegt — und die kommt nur mit `B` zurück, was niemand ahnt, der gerade
 * den Deckel zugemacht hat. Er nimmt deshalb nur, was auch wirklich Abfall
 * werden kann: Essen.
 *
 * **Und warum der Teller in der Hand bleibt.** Wer einen misslungenen Burger
 * wegwirft, will den Burger loswerden und nicht den Teller: Bei _Overcooked_
 * kratzt man den Teller in den Eimer ab und stellt ihn zurück. Genau das ist
 * `scrape` — ein eigener Fall, damit niemand nach jedem Fehlgriff zur
 * Tellerausgabe läuft.
 */

import {
  ITEM_LABELS,
  chopStage,
  combine,
  dish,
  dishLabel,
  isCarrier,
  isFood,
  layered,
  served,
  whyNotServed,
  type Dish,
  type KitchenItem,
  type Recipe,
} from './kitchenRecipes';

export {
  FREESTYLE,
  ITEM_LABELS,
  RECIPES,
  STACK_ORDER,
  carries,
  chopStage,
  combine,
  contentsOf,
  dish,
  dishLabel,
  fryStage,
  isCarrier,
  isFood,
  isRaw,
  layered,
  recipeOf,
  served,
  whyNotServed,
  type Combined,
  type Dish,
  type KitchenItem,
  type Recipe,
} from './kitchenRecipes';

export {
  CHOP_SECONDS,
  FIRE_SECONDS,
  FRY_SECONDS,
  BURN_SECONDS,
  COLD_STOVE,
  EMPTY_BOARD,
  advanceChop,
  advanceStove,
  chopProgress,
  douse,
  onBoard,
  onStove,
  stovePhase,
  stoveProgress,
  type ChopState,
  type ChopTick,
  type StovePhase,
  type StoveState,
  type StoveTick,
} from './kitchenClock';

/** Wovor die Figur steht. */
export type StationKind =
  /** Eine Fläche: Was darauf liegt, nimmt man; ist sie frei, legt man ab. */
  | 'top'
  /** Der Mülleimer: Essen hinein, sonst nichts. */
  | 'bin'
  /** Eine Kiste: Sie gibt aus, so oft man will. */
  | 'box'
  /** Das Schneidebrett: auflegen, und es schneidet sich von selbst. */
  | 'board'
  /** Der Herd: Was darauf steht, ist die Pfanne — und manchmal brennt er. */
  | 'stove'
  /** Die Ausgabetheke: Wer hier ein fertiges Gericht ablegt, gibt es aus. */
  | 'serve'
  /** Die Halterung des Feuerlöschers. */
  | 'rack';

/**
 * **Eine Station, so viel wie die Regel davon braucht.**
 *
 * Drei Felder für sieben Arten, und das ist keine Sparsamkeit: Alles, was in
 * der Küche irgendwo liegt, ist ein `Dish` — die Pfanne auf dem Herd mit dem
 * Patty darin, der Teller auf der Zeile mit dem halben Burger darauf, der
 * Salatkopf auf dem Brett. Eine eigene Sorte Inhalt je Stationsart wäre genau
 * die zweite Liste, die mit jeder neuen Art auseinanderläuft.
 */
export interface Station {
  readonly kind: StationKind;
  /** Was darauf liegt — beim Herd die Pfanne, in der Halterung der Löscher. */
  readonly on?: Dish | null;
  /** Was die Kiste hergibt — nur bei `box`. */
  readonly gives?: KitchenItem;
  /** Ob der Herd brennt — nur bei `stove` (`kitchenClock.StoveState.fire`). */
  readonly fire?: boolean;
}

/**
 * Was ein Druck auf `A` bewirkt — **genau eine** Sache, die die Zone ausführt.
 *
 * `refuse` trägt seinen Satz mit: Wer eine volle Fläche anfasst, soll lesen,
 * **warum** nichts passiert, und nicht raten. `nothing` ist der eine Fall, in
 * dem es auch nichts zu sagen gibt — die leere Hand vor der leeren Fläche; nur
 * er macht eine Station stumm (`kitchen.refreshStations`).
 */
export type KitchenDeed =
  /** Von der Station in die Hand — bei der Kiste ein frisches Ding. */
  | { do: 'take'; dish: Dish }
  /** Aus der Hand auf die Station; die Hand wird leer. */
  | { do: 'place'; dish: Dish }
  /** Auf das Brett legen **und sofort anfangen zu schneiden** (`onBoard`). */
  | { do: 'chop'; dish: Dish }
  /**
   * Zusammengelegt: Hand und Station bekommen beide ihren neuen Stand, `null`
   * heißt leer. An einer Kiste ist `target` immer `null` — sie hatte nie etwas
   * liegen und behält trotzdem alles.
   */
  | { do: 'combine'; held: Dish | null; target: Dish | null; moved: readonly KitchenItem[] }
  /** Alles aus der Hand in den Müll. */
  | { do: 'trash'; dish: Dish }
  /** Nur den Inhalt in den Müll; der Träger bleibt (leer) in der Hand. */
  | { do: 'scrape'; dish: Dish }
  /** Über die Theke: Das Gericht verschwindet, `held` bleibt in der Hand. */
  | { do: 'serve'; recipe: Recipe; held: Dish | null }
  /** Feuer aus — das Patty ist weg, die Pfanne bleibt. */
  | { do: 'douse' }
  | { do: 'refuse'; why: string }
  | { do: 'nothing' };

/**
 * **Die Regel selbst** — was passiert, wenn die Figur mit `held` in der Hand
 * vor `station` steht und drückt.
 *
 * @param held was sie trägt, oder `null` für die leere Hand
 */
export function kitchenDeed(held: Dish | null, station: Station): KitchenDeed {
  switch (station.kind) {
    case 'box':
      return fromBox(held, station.gives);

    case 'bin':
      return intoBin(held);

    case 'rack':
      return atRack(held, station.on ?? null);

    case 'serve':
      return atPass(held);

    case 'stove': {
      // **Ein brennender Herd ist keine Fläche mehr.** Solange es brennt, geht
      // nur eines, und wer ohne Feuerlöscher davorsteht, liest, welches.
      if (station.fire) {
        if (held?.item === 'extinguisher') return { do: 'douse' };
        return { do: 'refuse', why: 'Der Herd brennt — das braucht den Feuerlöscher' };
      }
      // Sonst ist er eine Fläche, auf der die Pfanne steht: Man nimmt sie mit
      // Patty und allem in die Hand, statt das Patty herauszuklauben.
      return onTop(held, station.on ?? null);
    }

    case 'board': {
      const on = station.on ?? null;
      // Was geschnitten werden kann, wird geschnitten, sobald es daliegt —
      // ohne zweiten Druck. Alles andere liegt hier wie auf jeder Ablage.
      if (held && !on && chopStage(held.item)) return { do: 'chop', dish: held };
      return onTop(held, on);
    }

    case 'top':
      return onTop(held, station.on ?? null);
  }
}

/**
 * **Die Fläche** — und mit ihr der halbe Rest der Küche.
 *
 * Drei Fälle, und der dritte ist der neue: Liegt hier schon etwas, wird nicht
 * mehr abgelehnt, sondern **zusammengelegt** (`combine`). Das ist die Stelle,
 * an der aus „Hier liegt schon ein Teller" ein Burger wird.
 */
function onTop(held: Dish | null, on: Dish | null): KitchenDeed {
  if (!held) return on ? { do: 'take', dish: on } : { do: 'nothing' };
  if (!on) return { do: 'place', dish: held };
  const both = combine(held, on);
  if (!both.ok) return { do: 'refuse', why: both.why };
  return { do: 'combine', held: both.held, target: both.target, moved: both.moved };
}

/**
 * **Die Kiste gibt auch in die volle Hand** — solange etwas darin Platz hat.
 *
 * Wer mit dem Teller an der Brötchenkiste steht, will ein Brötchen auf den
 * Teller und nicht erst den Teller irgendwo abstellen; wer die Pfanne trägt,
 * holt sich das rohe Patty direkt hinein. Für alles, was kein Träger ist,
 * bleibt es beim alten Satz: erst die Hände frei machen.
 */
function fromBox(held: Dish | null, gives?: KitchenItem): KitchenDeed {
  if (!gives) return { do: 'nothing' };
  if (!held) return { do: 'take', dish: dish(gives) };
  if (!isCarrier(held.item)) return { do: 'refuse', why: 'Erst die Hände frei machen' };
  const both = combine(held, dish(gives));
  if (!both.ok) return { do: 'refuse', why: both.why };
  // Die Kiste selbst behält nichts und verliert nichts — was sie hergibt, ist
  // eine Kopie, und `target` bleibt deshalb leer.
  if (!both.held) return { do: 'refuse', why: 'Erst die Hände frei machen' };
  return { do: 'combine', held: both.held, target: null, moved: both.moved };
}

/** Der Mülleimer: Inhalt weg, Träger behalten, Gerät gar nicht erst hinein. */
function intoBin(held: Dish | null): KitchenDeed {
  if (!held) return { do: 'nothing' };
  // **Der Träger bleibt.** Abgeräumt wird, was daraufliegt — und was in der
  // Hand zurückbleibt, steht im Ergebnis, damit die Zone nicht raten muss.
  if (held.on.length) return { do: 'scrape', dish: dish(held.item) };
  if (!isFood(held.item)) {
    return { do: 'refuse', why: `${ITEM_LABELS[held.item]} gehört nicht in den Müll` };
  }
  return { do: 'trash', dish: held };
}

/**
 * **Die Halterung** nimmt nur ihren Feuerlöscher.
 *
 * Eine gewöhnliche Ablage täte es beinahe auch — bis jemand das Brötchen
 * dorthin legt und der Löscher beim nächsten Feuer irgendwo liegt. Eine
 * Halterung, die nur eines hält, ist eine Halterung, an der man den Löscher
 * findet.
 */
function atRack(held: Dish | null, on: Dish | null): KitchenDeed {
  if (!held) return on ? { do: 'take', dish: on } : { do: 'nothing' };
  if (held.item !== 'extinguisher') {
    return { do: 'refuse', why: 'In die Halterung gehört nur der Feuerlöscher' };
  }
  if (on) return { do: 'refuse', why: 'In der Halterung hängt schon ein Feuerlöscher' };
  return { do: 'place', dish: held };
}

/**
 * **Die Ausgabetheke** nimmt fertige Gerichte und sonst nichts.
 *
 * **Der Teller bleibt in der Hand**, das Essen geht: Bei _Overcooked_ schiebt
 * man den Teller über die Theke und bekommt ihn zurück, und ein Spieler, der
 * nach jedem Gast zur Tellerausgabe läuft, verliert die Runde am Weg. Wer ohne
 * Teller serviert, hat danach die Hände frei.
 */
function atPass(held: Dish | null): KitchenDeed {
  if (!held) return { do: 'nothing' };
  if (!isCarrier(held.item) && !isFood(held.item)) {
    return { do: 'refuse', why: `${ITEM_LABELS[held.item]} gehört nicht auf die Ausgabe` };
  }
  const recipe = served(held);
  if (!recipe) return { do: 'refuse', why: whyNotServed(held) };
  return { do: 'serve', recipe, held: held.item === 'plate' ? dish('plate') : null };
}

/**
 * **Der Hinweis über der Figur** (`core/usable.Usable.usePrompt`) — derselbe
 * Satz, den `kitchenDeed` gleich ausführen wird.
 *
 * Er wird aus der Tat gebaut und nicht daneben geschrieben: Ein Hinweis, der
 * _Ablegen_ sagt und dann nichts tut, ist schlimmer als gar keiner. Die Zahl
 * der fehlenden Schnitte steht nicht mehr darin — das Schneidebrett hat jetzt
 * einen Balken über sich (`kitchenClock.chopProgress`), und der sagt es besser
 * als ein „noch 2" im Text.
 *
 * @param what wie die Station im Satz heißt — _Küchenzeile_, _Mülleimer_
 */
export function kitchenPrompt(deed: KitchenDeed, what: string): string {
  switch (deed.do) {
    case 'take':
      return `${dishLabel(deed.dish)} nehmen`;
    case 'place':
      return `${dishLabel(deed.dish)} auf ${what} legen`;
    case 'chop':
      return `${ITEM_LABELS[deed.dish.item]} schneiden`;
    case 'combine':
      return `${layered(deed.moved)
        .map((item) => ITEM_LABELS[item])
        .join(', ')} auflegen`;
    case 'trash':
      return `${dishLabel(deed.dish)} wegwerfen`;
    case 'scrape':
      return `${ITEM_LABELS[deed.dish.item]} abräumen`;
    case 'serve':
      return `${deed.recipe.label} servieren`;
    case 'douse':
      return 'Feuer löschen';
    case 'refuse':
      return deed.why;
    case 'nothing':
      return '';
  }
}
