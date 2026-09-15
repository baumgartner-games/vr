/**
 * **Was `A` in der Küche tut** — die Regel hinter dem Tragen, ohne three.js.
 *
 * In der Küche steht dreierlei herum, das auf `A` antwortet: **Flächen**, auf
 * denen etwas liegen kann (Zeile, Tisch, Brett, Herd, Ausgabe), die
 * **Brötchenkiste**, aus der etwas herauskommt, und der **Mülleimer**, in dem
 * etwas verschwindet. Was beim Drücken passiert, hängt an genau zwei Dingen:
 * was die Figur gerade trägt, und wovor sie steht.
 *
 * Das sind neun Fälle, und sie stehen hier als **eine Funktion** und nicht als
 * drei `if`-Ketten in der Zone daneben. Der Grund ist derselbe wie überall in
 * diesem Projekt, wo eine Rechnung von ihrer Darstellung getrennt ist: Neun
 * Fälle prüft ein Test in Millisekunden nach; dieselben neun Fälle im Headset
 * nachzuspielen dauert eine Viertelstunde, und beim zehnten Umbau macht es
 * niemand mehr.
 *
 * **Warum der Topf nicht in den Müll darf.** Ein Mülleimer, der alles
 * schluckt, ist ein Mülleimer, in dem nach zwei Minuten die einzige Pfanne der
 * Küche liegt — und die kommt nur mit `B` zurück, was niemand ahnt, der
 * gerade den Deckel zugemacht hat. Er nimmt deshalb nur, was auch wirklich
 * Abfall werden kann: Essen.
 */

/** Was sich in der Küche tragen lässt. */
export type KitchenItem = 'pot' | 'pan' | 'bun';

export const ITEM_LABELS: Record<KitchenItem, string> = {
  pot: 'Topf',
  pan: 'Pfanne',
  bun: 'Brötchen',
};

/** Was der Mülleimer nimmt — Essen, und sonst nichts. */
export const FOOD: readonly KitchenItem[] = ['bun'];

/** Ob dieses Ding in den Müll darf. */
export function isFood(item: KitchenItem): boolean {
  return FOOD.includes(item);
}

/** Wovor die Figur steht. */
export type StationKind =
  /** Eine Fläche: Was darauf liegt, nimmt man; ist sie frei, legt man ab. */
  | 'top'
  /** Der Mülleimer: Essen hinein, sonst nichts. */
  | 'bin'
  /** Die Kiste: Sie gibt aus, so oft man will. */
  | 'box';

/** Eine Station, so viel wie die Regel davon braucht. */
export interface Station {
  kind: StationKind;
  /** Was gerade darauf liegt — nur bei `top`. */
  on?: KitchenItem | null;
  /** Was die Kiste hergibt — nur bei `box`. */
  gives?: KitchenItem;
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
      if (!isFood(carrying)) {
        return { do: 'refuse', why: `${ITEM_LABELS[carrying]} gehört nicht in den Müll` };
      }
      return { do: 'trash', item: carrying };
    }

    case 'top': {
      const on = station.on ?? null;
      if (!carrying) return on ? { do: 'take', item: on } : { do: 'nothing' };
      if (on) return { do: 'refuse', why: `Hier liegt schon ${ITEM_LABELS[on]}` };
      return { do: 'place', item: carrying };
    }
  }
}

/**
 * **Der Hinweis über der Figur** (`core/usable.Usable.usePrompt`) — derselbe
 * Satz, den `kitchenDeed` gleich ausführen wird.
 *
 * Er wird aus der Tat gebaut und nicht daneben geschrieben: Ein Hinweis, der
 * _Ablegen_ sagt und dann nichts tut, ist schlimmer als gar keiner.
 */
export function kitchenPrompt(deed: KitchenDeed, what: string): string {
  switch (deed.do) {
    case 'take':
      return `${ITEM_LABELS[deed.item]} nehmen`;
    case 'place':
      return `${ITEM_LABELS[deed.item]} auf ${what} legen`;
    case 'trash':
      return `${ITEM_LABELS[deed.item]} wegwerfen`;
    case 'refuse':
      return deed.why;
    case 'nothing':
      return '';
  }
}
