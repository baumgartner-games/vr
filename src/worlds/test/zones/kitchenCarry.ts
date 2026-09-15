/**
 * **Was `A` in der Küche tut** — die Regel hinter dem Kochen, ohne three.js.
 *
 * In der Küche steht sechserlei herum, das auf `A` antwortet: **Flächen**, auf
 * denen etwas liegen kann (Zeile, Tisch, Herd, Ausgabe), die **Kisten**, aus
 * denen die Zutaten kommen, das **Schneidebrett**, der **Herd mit der Pfanne**,
 * die **Anrichte**, auf der der Burger entsteht, und der **Mülleimer**, in dem
 * etwas verschwindet. Was beim Drücken passiert, hängt an genau zwei Dingen:
 * was die Figur gerade trägt, und wovor sie steht.
 *
 * Das sind ein paar Dutzend Fälle, und sie stehen hier als **eine Funktion**
 * und nicht als sechs `if`-Ketten in der Zone daneben. Der Grund ist derselbe
 * wie überall in diesem Projekt, wo eine Rechnung von ihrer Darstellung
 * getrennt ist: Ein Fall prüft ein Test in Millisekunden nach; derselbe Fall im
 * Headset ist eine Viertelstunde Hin- und Herlaufen, und beim zehnten Umbau
 * macht es niemand mehr.
 *
 * **Woraus ein Burger besteht, steht nebenan** (`kitchenRecipes.ts`). Hier
 * steht nur, wann etwas darauf darf — die Liste der Rezepte ändert sich
 * unabhängig von der Frage, was ein Druck auf `A` bewirkt.
 *
 * **Warum der Topf nicht in den Müll darf.** Ein Mülleimer, der alles
 * schluckt, ist ein Mülleimer, in dem nach zwei Minuten die einzige Pfanne der
 * Küche liegt — und die kommt nur mit `B` zurück, was niemand ahnt, der gerade
 * den Deckel zugemacht hat. Er nimmt deshalb nur, was auch wirklich Abfall
 * werden kann: Essen.
 *
 * **Und warum der Teller in der Hand bleibt.** Wer einen angerichteten Burger
 * wegwirft, will den Burger loswerden und nicht den Teller: Bei _Overcooked_
 * kratzt man den Teller in den Eimer ab und stellt ihn zurück. Genau das ist
 * `scrape` — ein eigener Fall, damit niemand nach jedem Fehlgriff zur
 * Tellerausgabe läuft.
 */

import {
  CHOPS,
  ITEM_LABELS,
  chopped,
  isFood,
  missing,
  recipeOf,
  stackable,
  type KitchenItem,
} from './kitchenRecipes';

export {
  CHOPS,
  FRY_SECONDS,
  ITEM_LABELS,
  RECIPES,
  chopped,
  fried,
  isFood,
  recipeOf,
  type KitchenItem,
  type Recipe,
} from './kitchenRecipes';

/** Wovor die Figur steht. */
export type StationKind =
  /** Eine Fläche: Was darauf liegt, nimmt man; ist sie frei, legt man ab. */
  | 'top'
  /** Der Mülleimer: Essen hinein, sonst nichts. */
  | 'bin'
  /** Eine Kiste: Sie gibt aus, so oft man will. */
  | 'box'
  /** Das Schneidebrett: auflegen, schneiden, mitnehmen. */
  | 'board'
  /** Der Herd mit der Pfanne: Patty hinein, warten, herausnehmen. */
  | 'stove'
  /** Die Anrichte: Schicht für Schicht wird daraus ein Burger. */
  | 'build';

/** Eine Station, so viel wie die Regel davon braucht. */
export interface Station {
  kind: StationKind;
  /** Was gerade darauf liegt — bei `top`, `board` und `stove` (die Pfanne). */
  on?: KitchenItem | null;
  /** Was die Kiste hergibt — nur bei `box`. */
  gives?: KitchenItem;
  /** Wie oft schon geschnitten wurde — nur bei `board`. */
  chops?: number;
  /** Was in der Pfanne liegt — nur bei `stove`. */
  pan?: KitchenItem | null;
  /** Ob das in der Pfanne fertig ist — nur bei `stove`. */
  done?: boolean;
  /** Was schon aufgeschichtet ist — nur bei `build`. */
  stack?: readonly KitchenItem[];
}

/**
 * Was ein Druck auf `A` bewirkt.
 *
 * `refuse` trägt seinen Satz mit: Wer eine volle Fläche anfasst, soll lesen,
 * **warum** nichts passiert, und nicht raten. `nothing` ist der eine Fall, in
 * dem es auch nichts zu sagen gibt — die leere Hand vor der leeren Fläche.
 */
export type KitchenDeed =
  | { do: 'take'; item: KitchenItem }
  | { do: 'place'; item: KitchenItem }
  | { do: 'trash'; item: KitchenItem }
  /** Den Burger vom Teller in den Müll — der Teller bleibt in der Hand. */
  | { do: 'scrape'; item: KitchenItem }
  /** Ein Schnitt von `CHOPS`; der letzte macht aus der Zutat die geschnittene. */
  | { do: 'chop'; item: KitchenItem }
  /** Das Patty wandert in die Pfanne und fängt an zu braten. */
  | { do: 'fry'; item: KitchenItem }
  /** Eine Schicht mehr auf der Anrichte. */
  | { do: 'stack'; item: KitchenItem }
  /** Der fertige Burger vom Stapel auf den Teller in der Hand. */
  | { do: 'dish'; item: KitchenItem }
  | { do: 'refuse'; why: string }
  | { do: 'nothing' };

/**
 * **Die Regel selbst** — was passiert, wenn die Figur mit `carrying` in der
 * Hand vor `station` steht und drückt.
 *
 * @param carrying was sie trägt, oder `null` für die leere Hand
 */
export function kitchenDeed(carrying: KitchenItem | null, station: Station): KitchenDeed {
  switch (station.kind) {
    case 'box': {
      const gives = station.gives;
      if (!gives) return { do: 'nothing' };
      if (carrying) return { do: 'refuse', why: 'Erst die Hände frei machen' };
      return { do: 'take', item: gives };
    }

    case 'bin': {
      if (!carrying) return { do: 'nothing' };
      // **Der Teller bleibt.** Abgekratzt wird der Burger, und was in der Hand
      // zurückbleibt, steht im Ergebnis — sonst müsste die Zone raten, was aus
      // einem `plate-burger` ohne Burger wird.
      if (carrying === 'plate-burger') return { do: 'scrape', item: 'plate' };
      if (!isFood(carrying)) {
        return { do: 'refuse', why: `${ITEM_LABELS[carrying]} gehört nicht in den Müll` };
      }
      return { do: 'trash', item: carrying };
    }

    case 'board': {
      const on = station.on ?? null;
      if (carrying) {
        if (on) return { do: 'refuse', why: `Hier liegt schon ${ITEM_LABELS[on]}` };
        return { do: 'place', item: carrying };
      }
      if (!on) return { do: 'nothing' };
      // Was noch zu schneiden ist, wird geschnitten; alles andere nimmt man
      // einfach wieder mit — ein Brett ist auch eine Ablage.
      return chopped(on) ? { do: 'chop', item: on } : { do: 'take', item: on };
    }

    case 'stove': {
      // **Ohne Pfanne ist der Herd eine Fläche.** Sie lässt sich abnehmen und
      // irgendwo abstellen, und dann liegt hier eben ein Brötchen. Ein Herd,
      // der ohne Pfanne gar nichts mehr annähme, wäre ein Loch in der Reihe.
      if (station.on !== 'pan') return top(carrying, station.on ?? null);
      const inside = station.pan ?? null;
      if (!carrying) {
        if (!inside) return { do: 'take', item: 'pan' };
        if (!station.done) return { do: 'refuse', why: `${ITEM_LABELS[inside]} brät noch` };
        return { do: 'take', item: inside };
      }
      if (inside) return { do: 'refuse', why: `In der Pfanne liegt schon ${ITEM_LABELS[inside]}` };
      if (carrying === 'patty') return { do: 'fry', item: carrying };
      return { do: 'refuse', why: `${ITEM_LABELS[carrying]} gehört nicht in die Pfanne` };
    }

    case 'build': {
      const stack = station.stack ?? [];
      const done = recipeOf(stack) !== null;
      if (!carrying) {
        if (done) return { do: 'take', item: 'burger' };
        if (!stack.length) return { do: 'nothing' };
        return { do: 'refuse', why: missing(stack) };
      }
      // **Der Teller holt den Burger ab.** Das ist der Griff, für den es die
      // Tellerausgabe gibt: anrichten, und dann mit beidem in der Hand los.
      if (carrying === 'plate') {
        if (!done) return { do: 'refuse', why: missing(stack) };
        return { do: 'dish', item: 'plate-burger' };
      }
      const may = stackable(stack, carrying);
      if (!may.ok) return { do: 'refuse', why: may.why };
      return { do: 'stack', item: carrying };
    }

    case 'top':
      return top(carrying, station.on ?? null);
  }
}

/** Die Fläche: voll oder leer, mehr ist daran nicht. */
function top(carrying: KitchenItem | null, on: KitchenItem | null): KitchenDeed {
  if (!carrying) return on ? { do: 'take', item: on } : { do: 'nothing' };
  if (on) return { do: 'refuse', why: `Hier liegt schon ${ITEM_LABELS[on]}` };
  return { do: 'place', item: carrying };
}

/**
 * **Der Hinweis über der Figur** (`core/usable.Usable.usePrompt`) — derselbe
 * Satz, den `kitchenDeed` gleich ausführen wird.
 *
 * Er wird aus der Tat gebaut und nicht daneben geschrieben: Ein Hinweis, der
 * _Ablegen_ sagt und dann nichts tut, ist schlimmer als gar keiner.
 *
 * @param left beim Schneiden: wie viele Schnitte noch fehlen
 */
export function kitchenPrompt(deed: KitchenDeed, what: string, left = CHOPS): string {
  switch (deed.do) {
    case 'take':
      return `${ITEM_LABELS[deed.item]} nehmen`;
    case 'place':
      return `${ITEM_LABELS[deed.item]} auf ${what} legen`;
    case 'trash':
      return `${ITEM_LABELS[deed.item]} wegwerfen`;
    case 'scrape':
      return 'Burger abkratzen';
    case 'chop':
      // Die Zahl steht mit dabei: Wer drückt und nichts passieren sieht, hört
      // sonst nach dem ersten Mal auf.
      return `${ITEM_LABELS[deed.item]} schneiden (noch ${left})`;
    case 'fry':
      return `${ITEM_LABELS[deed.item]} braten`;
    case 'stack':
      return `${ITEM_LABELS[deed.item]} auflegen`;
    case 'dish':
      return 'Burger anrichten';
    case 'refuse':
      return deed.why;
    case 'nothing':
      return '';
  }
}
