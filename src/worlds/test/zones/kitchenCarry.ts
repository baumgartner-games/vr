/**
 * **Was `A` in der Küche tut** — die Regel hinter dem Kochen, ohne three.js.
 *
 * In der Küche steht zwölferlei herum, das auf `A` antwortet: **Flächen**, auf
 * denen etwas liegen kann (Zeile, Tisch, Ausgaberegal, Gästetisch, Förderband),
 * die **Kisten**, aus denen die Zutaten kommen, das **Schneidebrett**, der
 * **Herd mit der Pfanne**, die **Ausgabetheke**, der **Mülleimer**, die
 * **Halterung** des Feuerlöschers und die **Geschirrrückgabe** — und seit die
 * Spüle zwei Möbel sind, das **Spülbecken** und das **Abtropfbrett** daneben
 * einzeln. Was beim Drücken passiert, hängt an genau zwei Dingen: was die Figur
 * gerade trägt, und wovor sie steht.
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
 * lange etwas dauert, daneben** (`kitchenClock.ts` für den Herd,
 * `kitchenWork.ts` für alles, was man selbst tut). Hier steht nur, was ein
 * Druck bewirkt — die Rezeptliste und die Bratdauer ändern sich unabhängig
 * davon.
 *
 * **Der Kreislauf des Geschirrs** ist die zweite große Änderung. Über die
 * Theke geht nur noch, was auf einem **Teller** liegt, und Teller wie Gericht
 * sind danach weg — zum Gast. Der bringt ihn dreckig zurück: an die
 * **Rückgabe**, wo sich die dreckigen Teller stapeln, oder er lässt ihn am
 * **Gästetisch** stehen. Von dort trägt man ihn ins **Spülbecken**, und das
 * macht mit derselben Uhr sauber, mit der das Brett schneidet (`kitchenWork.ts`);
 * der saubere Teller kommt auf das **Abtropfbrett** daneben, bis ihn jemand
 * braucht. Ohne diesen Kreis wäre die Tellerausgabe ein Brunnen und die Küche
 * nach zehn Gästen ein Tellerlager.
 *
 * **Warum der Topf nicht in den Müll darf.** Ein Mülleimer, der alles
 * schluckt, ist ein Mülleimer, in dem nach zwei Minuten die einzige Pfanne der
 * Küche liegt — und die kommt nur mit `B` zurück, was niemand ahnt, der gerade
 * den Deckel zugemacht hat. Er nimmt deshalb nur, was auch wirklich Abfall
 * werden kann: Essen.
 *
 * **Und warum der Teller am Mülleimer in der Hand bleibt.** Wer einen
 * misslungenen Burger wegwirft, will den Burger loswerden und nicht den
 * Teller: Bei _Overcooked_ kratzt man den Teller in den Eimer ab und stellt
 * ihn zurück. Genau das ist `scrape` — ein eigener Fall, damit niemand nach
 * jedem Fehlgriff zur Tellerausgabe läuft. An der **Theke** ist es umgekehrt
 * (`atPass`), und beides ist derselbe Gedanke: Der Teller geht dorthin, wo er
 * hingehört — im Müll landet er nie, beim Gast immer.
 */

import {
  ITEM_LABELS,
  combine,
  dish,
  dishLabel,
  isDishware,
  isFood,
  layered,
  served,
  whyNotServed,
  type Dish,
  type KitchenItem,
  type Recipe,
} from './kitchenRecipes';
import { workStage, type WorkKind } from './kitchenWork';

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
  isDishware,
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
  FIRE_SECONDS,
  FRY_SECONDS,
  BURN_SECONDS,
  COLD_STOVE,
  advanceStove,
  douse,
  onStove,
  stovePhase,
  stoveProgress,
  type StovePhase,
  type StoveState,
  type StoveTick,
} from './kitchenClock';

export {
  IDLE_WORK,
  WORK_SECONDS,
  advanceWork,
  onWork,
  workProgress,
  workStage,
  type WorkKind,
  type WorkState,
  type WorkTick,
} from './kitchenWork';

/** Wovor die Figur steht. */
export type StationKind =
  /** Eine Fläche: Was darauf liegt, nimmt man; ist sie frei, legt man ab. */
  | 'top'
  /** Der Mülleimer: Essen hinein, sonst nichts. */
  | 'bin'
  /** Eine Kiste: Sie gibt aus, so oft man will — und ist zugleich Arbeitsplatte. */
  | 'box'
  /** Das Schneidebrett: auflegen, und es schneidet sich von selbst. */
  | 'board'
  /** Der Herd: Was darauf steht, ist die Pfanne — und manchmal brennt er. */
  | 'stove'
  /** Die Ausgabetheke: Wer hier ein fertiges Gericht **auf dem Teller** ablegt, gibt es aus. */
  | 'serve'
  /** Die Halterung des Feuerlöschers. */
  | 'rack'
  /** Das Spülbecken: dreckiges Geschirr hinein, und es wird gespült. */
  | 'sink'
  /** Das Abtropfbrett neben dem Becken: Dort **stapeln** sich die sauberen Teller. */
  | 'drain'
  /** Die Geschirrrückgabe: Dort **stapeln** sich die dreckigen Teller. */
  | 'return'
  /** Ein Gästetisch: Dort isst ein Kunde und lässt sein Geschirr zurück. */
  | 'table'
  /** Das Förderband: eine Ablage, die weiterschiebt. */
  | 'belt';

/**
 * **Eine Station, so viel wie die Regel davon braucht.**
 *
 * Vier Felder für elf Arten, und das ist keine Sparsamkeit: Alles, was in
 * der Küche irgendwo liegt, ist ein `Dish` — die Pfanne auf dem Herd mit dem
 * Patty darin, der Teller auf der Zeile mit dem halben Burger darauf, der
 * Salatkopf auf dem Brett. Eine eigene Sorte Inhalt je Stationsart wäre genau
 * die zweite Liste, die mit jeder neuen Art auseinanderläuft.
 *
 * Die **Rückgabe** ist der eine Fall, der mit `on` nicht auskommt: Dort liegt
 * kein einzelner Teller, sondern ein **Stapel**. Ihn als `Dish` mit fünf
 * dreckigen Tellern darauf zu führen, hieße, einen Träger zu erfinden, der
 * nichts trägt, was in ein Rezept gehört — eine Zahl sagt dasselbe und lügt
 * nicht.
 */
export interface Station {
  readonly kind: StationKind;
  /** Was darauf liegt — beim Herd die Pfanne, in der Halterung der Löscher. */
  readonly on?: Dish | null;
  /** Was die Kiste hergibt — nur bei `box`. */
  readonly gives?: KitchenItem;
  /** Ob der Herd brennt — nur bei `stove` (`kitchenClock.StoveState.fire`). */
  readonly fire?: boolean;
  /** Wie viele Teller hier stapeln — bei `return` dreckige, bei `drain` saubere. */
  readonly stack?: number;
}

/**
 * **Wie viele saubere Teller auf das Abtropfbrett passen** — vier.
 *
 * Die Zahl kommt aus dem Spieltest („bis zu 4"), und sie hält auch der
 * Nachrechnung stand, mit der schon der dreckige Stapel begrenzt ist
 * (`kitchenProps.DIRTY_STACK_MAX`, sechs):
 *
 * - **Von oben**: Jeder Teller liegt gegen den vorigen verdreht
 *   (`kitchenProps.DIRTY_TWIST`, 13° je Lage). Vier Lagen fächern um 39° auf —
 *   man zählt sie auf einen Blick, und es sieht noch nach Stapel aus.
 * - **Von vorn**: Die Wanne liegt bei 0,462 m über dem Boden
 *   (`core/kitchenFit.SINK_TRAY.floor` abzüglich `SINK_SUNK`), vier Teller sind
 *   4 × 0,05 = 0,20 m, die Oberkante also 0,662 m. Das bleibt gut 14 cm unter
 *   der Brusthöhe der Figur (0,80 m), an der der dreckige Stapel seine Grenze
 *   hat — der Blick über die Zeile bleibt frei.
 *
 * **Warum die Zahl hier steht und `DIRTY_STACK_MAX` nicht.** Die Rückgabe lehnt
 * nie ab: Ein Gast, dessen Teller nirgends hinkann, wäre eine Sackgasse. Das
 * Abtropfbrett **lehnt ab**, sobald es voll ist — und was `A` bewirkt, steht in
 * dieser Datei und nirgends sonst. Der Stapel dort ist dagegen ein Bild und
 * gehört deshalb zum Zutatensatz.
 */
export const CLEAN_STACK_MAX = 4;

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
  /**
   * Ablegen **und sofort anfangen zu arbeiten** (`kitchenWork.onWork`) — auf
   * dem Brett schneiden, in der Spüle spülen. Ein `place` mit laufender Uhr,
   * und `kind` sagt der Zone, welche.
   */
  | { do: 'work'; kind: WorkKind; dish: Dish }
  /**
   * Zusammengelegt: Hand und Station bekommen beide ihren neuen Stand, `null`
   * heißt leer.
   *
   * **`target` ist immer der volle neue Stand der Station und nie eine
   * Abkürzung.** Gibt eine Kiste ihr Frisches in die Hand, ist das, was auf
   * ihrem Deckel liegt, an dem Handgriff nicht beteiligt — es steht trotzdem
   * hier drin, unverändert. Früher stand an dieser Stelle „an einer Kiste ist
   * `target` immer `null`", und das stimmte genau so lange, wie eine Kiste
   * keine Ablage war: Die Zone liest `null` als _hier liegt danach nichts
   * mehr_ und wirft weg, was dort lag.
   */
  | { do: 'combine'; held: Dish | null; target: Dish | null; moved: readonly KitchenItem[] }
  /** Alles aus der Hand in den Müll. */
  | { do: 'trash'; dish: Dish }
  /** Nur den Inhalt in den Müll; der Träger bleibt (leer) in der Hand. */
  | { do: 'scrape'; dish: Dish }
  /**
   * Über die Theke: Gericht **und** Teller gehen zum Gast. `held` ist deshalb
   * heute immer `null` — das Feld bleibt, weil die Zone daran abliest, was
   * danach in der Hand liegt, und das ist besser als ein stillschweigendes
   * „nichts mehr".
   */
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
      return fromBox(held, station.gives, station.on ?? null);

    case 'bin':
      return intoBin(held);

    case 'rack':
      return atRack(held, station.on ?? null);

    case 'serve':
      return atPass(held);

    case 'sink':
      return atSink(held, station.on ?? null);

    case 'drain':
      return atDrain(held, station.stack ?? 0);

    case 'return':
      return atReturn(held, station.stack ?? 0);

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
      if (held && !on && workStage('chop', held.item)) {
        return { do: 'work', kind: 'chop', dish: held };
      }
      return onTop(held, on);
    }

    // **Gästetisch und Förderband sind Flächen und sonst nichts.** Was einen
    // Gästetisch zum Gästetisch macht, ist der Kunde daran (er stellt sein
    // dreckiges Geschirr als `on` ab), und was das Band zum Band macht, ist
    // seine Bewegung — beides Sache der Zone. Für `A` sind es Ablagen, und
    // eine eigene Regel dafür wäre eine Regel, die dasselbe sagt.
    case 'table':
    case 'belt':
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
 * **Die Kiste ist Ausgabe und Arbeitsplatte zugleich** — sie gibt aus, sie
 * gibt auch in die volle Hand, und was übrig bleibt, darf obendrauf liegen.
 *
 * Wer mit dem Teller an der Brötchenkiste steht, will ein Brötchen auf den
 * Teller und nicht erst den Teller irgendwo abstellen; wer die Pfanne trägt,
 * holt sich das rohe Patty direkt hinein. **Und wer etwas abstellen will,
 * stellt es hier ab**: Vor jeder Kiste steht ein Deckel, auf den ein Brötchen,
 * ein Patty oder der Teller passt. Das ist kein Möbel mehr, sondern eine
 * Zeile Regel — und es spart den Weg zur nächsten freien Fläche, der bei
 * _Overcooked_ die Runde kostet. An der **Tellerausgabe** ist es der Weg
 * zurück: Ein Teller, den man doch nicht braucht, gehört dorthin, wo man ihn
 * hergeholt hat.
 *
 * Die Reihenfolge ist die des Wollens: erst nehmen, dann kombinieren, dann
 * ablegen, dann auf das Liegende legen.
 */
function fromBox(held: Dish | null, gives: KitchenItem | undefined, on: Dish | null): KitchenDeed {
  if (!held) {
    // Was auf dem Deckel liegt, geht vor: Es ist das Ding, das jemand genau
    // hier hingestellt hat — die Kiste gibt ihr Frisches ja noch beliebig oft.
    //
    // **Zurück kommt dasselbe `on`**, nicht eine gleich aussehende Kopie: Nur
    // daran erkennt die Zone, dass sie hier das **Liegende** aufnehmen und die
    // Fläche räumen soll, statt wie sonst an einer Kiste ein neues Ding zu
    // bauen (`kitchen.pickUp`) — sonst läge die Tomate hinterher zweimal in
    // der Küche.
    if (on) return { do: 'take', dish: on };
    return gives ? { do: 'take', dish: dish(gives) } : { do: 'nothing' };
  }
  if (gives) {
    const fresh = combine(held, dish(gives));
    // **Was nicht in die Hand geht, wäre weg.** Frisches aus der Kiste kommt
    // aus dem Nichts, und wenn beide Seiten hinterher etwas halten, gehört
    // eine davon niemandem: Wer mit der Pfanne voll gebratenem Patty an die
    // Brötchenausgabe tritt, bekäme ein Brötchen mit Patty, das im selben
    // Atemzug in der Luft hängt — im Browser nachgestellt, war das Patty
    // spurlos weg und in der Hand lag eine leere Pfanne. Also zählt hier nur
    // der Fall, in dem die **Hand** das Neue aufnimmt (Teller an der
    // Brötchenausgabe, leere Pfanne an der Pattykiste). Welche der beiden
    // Seiten hinterher in der Hand liegt, entscheidet, wer wen aufgenommen
    // hat: Die Pfanne nimmt das rohe Patty (`held`), der frische Teller nimmt
    // den Burger aus der Hand (`target`). Beides ist derselbe Handgriff, nur
    // andersherum gelesen. **Neu ist, was danach kommt**: Früher endete es
    // hier mit „erst die Hände frei machen"; jetzt fängt der Deckel der Kiste
    // das Getragene auf, statt den Handgriff abzulehnen.
    //
    // **Und `target` ist deshalb `on` und nicht `null`.** Das Frische kommt aus
    // dem Nichts und geht in die Hand — was auf dem Deckel liegt, ist an diesem
    // Handgriff gar nicht beteiligt und bleibt deshalb unangetastet liegen. Ein
    // `null` hieße „hier liegt danach nichts mehr", und die Zone nimmt das
    // wörtlich: Sie räumt die Fläche und wirft weg, was darauf war
    // (`kitchen.merge`). Wer mit dem Teller an der Brötchenausgabe stand, auf
    // deren Deckel eine Tomate lag, bekam das Brötchen — und die Tomate war
    // weg. Dasselbe spurlose Verschwinden wie oben, nur von der anderen Seite,
    // und es fiel erst auf, seit eine Kiste überhaupt etwas liegen haben kann.
    if (fresh.ok && !(fresh.held && fresh.target)) {
      const one = fresh.target ?? fresh.held;
      if (one) return { do: 'combine', held: one, target: on, moved: fresh.moved };
    }
  }
  if (!on) return { do: 'place', dish: held };
  const both = combine(held, on);
  if (!both.ok) return { do: 'refuse', why: both.why };
  return { do: 'combine', held: both.held, target: both.target, moved: both.moved };
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
 * **Die Ausgabetheke** nimmt fertige Gerichte **auf einem Teller** und sonst
 * nichts.
 *
 * **Ohne Teller geht nichts über die Theke**, und danach ist der Teller weg —
 * beides zusammen ist die Regel, und einzeln wäre jede Hälfte falsch. Ein
 * Burger, den man in der bloßen Hand über die Theke reicht, ist kein Gericht,
 * sondern ein Imbiss; ein Teller, der beim Servieren in der Hand bleibt, macht
 * die Tellerausgabe zum Brunnen und die Spüle zur Deko. Der Gast nimmt beides
 * mit und bringt den Teller dreckig zurück (`'return'`, `'table'`) — **das**
 * ist der Kreis, um den es geht.
 *
 * Wer ohne Teller davorsteht, bekommt deshalb zwei verschiedene Sätze: Fehlt
 * nur der Teller, steht das im Satz; fehlt am Gericht noch etwas, ist der
 * Teller das kleinere Problem und `whyNotServed` sagt das Größere zuerst.
 */
function atPass(held: Dish | null): KitchenDeed {
  if (!held) return { do: 'nothing' };
  if (held.item !== 'plate') {
    if (served(held)) return { do: 'refuse', why: 'Ohne Teller geht nichts über die Theke' };
    return { do: 'refuse', why: whyNotServed(held) };
  }
  const recipe = served(held);
  if (!recipe) return { do: 'refuse', why: whyNotServed(held) };
  return { do: 'serve', recipe, held: null };
}

/**
 * **Die Spüle** macht aus dreckigem Geschirr sauberes — mit derselben Uhr, mit
 * der das Brett schneidet (`kitchenWork.ts`).
 *
 * Dass Spülen und Schneiden dieselbe Rechnung sind, sieht man hier am besten:
 * Der Fall unten ist Zeile für Zeile der Fall am Brett, nur heißt die Arbeit
 * anders. Was hineingehört, ist enger als am Brett — **nur Geschirr**, und
 * zwar leeres. Ein Teller mit einem halben Burger darauf gehört erst an den
 * Mülleimer; eine Spüle, die ihn schluckte, wäre ein zweiter Mülleimer mit
 * Wasserhahn.
 */
function atSink(held: Dish | null, on: Dish | null): KitchenDeed {
  if (!held) return on ? { do: 'take', dish: on } : { do: 'nothing' };
  if (!isDishware(held.item) || held.on.length) {
    return { do: 'refuse', why: 'In die Spüle gehört nur Geschirr' };
  }
  if (on) return { do: 'refuse', why: `In der Spüle steht schon ${ITEM_LABELS[on.item]}` };
  if (held.item !== 'plate-dirty') return { do: 'place', dish: held };
  return { do: 'work', kind: 'wash', dish: held };
}

/**
 * **Das Abtropfbrett** ist die Rückgabe, nur andersherum: Hier stapelt sich das
 * **saubere** Geschirr.
 *
 * Es ist die zweite Hälfte der Spüle (`core/kitchenFit.ts`, `sink-drain`), und
 * es macht den Abwasch erst zu einem Weg mit einem Ende: Vorher kam aus dem
 * Becken ein sauberer Teller in die Hand, und wer ihn nicht sofort brauchte,
 * musste ihn irgendwo auf einer Arbeitsplatte zwischenlagern — die Spüle blieb
 * so lange besetzt. Jetzt stellt man ihn daneben ab und spült den nächsten.
 *
 * Der Fall ist Zeile für Zeile `atReturn`, mit zwei Unterschieden, und beide
 * sind gewollt:
 *
 * - Hier gehört der **saubere** Teller hin und nichts sonst — ein dreckiger
 *   zwischen vier sauberen ist der, den jemand gleich auf die Theke stellt.
 *   Ein Teller **mit Belag** ebenfalls nicht: Das Brett ist eine Ablage für
 *   Geschirr und keine zweite Arbeitsplatte.
 * - Und es ist **voll** (`CLEAN_STACK_MAX`), während die Rückgabe nie voll ist.
 *   Der Grund steht dort.
 */
function atDrain(held: Dish | null, stack: number): KitchenDeed {
  if (!held) return stack > 0 ? { do: 'take', dish: dish('plate') } : { do: 'nothing' };
  if (held.item !== 'plate' || held.on.length) {
    return { do: 'refuse', why: 'Auf das Abtropfbrett gehören nur saubere Teller' };
  }
  if (stack >= CLEAN_STACK_MAX) {
    return { do: 'refuse', why: `Auf dem Abtropfbrett stehen schon ${CLEAN_STACK_MAX} Teller` };
  }
  return { do: 'place', dish: held };
}

/**
 * **Die Geschirrrückgabe** ist ein Stapel und keine Fläche.
 *
 * Deshalb zählt sie (`Station.stack`), statt einen einzelnen `Dish` zu halten:
 * Hier landet alles, was die Gäste zurückgeben, und wer spülen geht, holt sich
 * einen Teller nach dem anderen. Eine Rückgabe, auf die nur ein Teller passt,
 * wäre bei drei Gästen gleichzeitig eine Sackgasse.
 *
 * Und sie nimmt **nur** dreckige Teller: Ein Brötchen, das jemand hier
 * abstellt, liegt zwischen dem schmutzigen Geschirr und wird nie wieder
 * gefunden.
 */
function atReturn(held: Dish | null, stack: number): KitchenDeed {
  if (!held) return stack > 0 ? { do: 'take', dish: dish('plate-dirty') } : { do: 'nothing' };
  if (held.item !== 'plate-dirty') {
    return { do: 'refuse', why: 'Hier wird nur dreckiges Geschirr abgestellt' };
  }
  return { do: 'place', dish: held };
}

/**
 * **Ob diese Tat das meint, was auf der Station liegt** — und nicht die
 * Station selbst.
 *
 * Die Frage stellt sich genau einmal, und zwar dort, wo der **gelbe Saum**
 * gesetzt wird (`core/highlight.ts`, `worlds/test/zones/kitchen.aimAt`): Er
 * umfasst immer das, was `A` gerade meint, und beantwortet damit vorab die
 * Frage „was passiert, wenn ich jetzt drücke?". Liegt ein Teller auf dem
 * Tisch, ist die Antwort **der Teller** — man nimmt ihn auf, der Tisch bleibt
 * stehen. Ein leuchtender Tisch sagt an dieser Stelle das Falsche.
 *
 * Zwei Taten fassen das Liegende an, und nur diese beiden:
 *
 * - **`take`** nimmt es in die Hand.
 * - **`combine`** legt etwas darauf oder nimmt es auf — gewandert ist in
 *   beiden Richtungen das, was dort lag.
 *
 * Alles andere meint wirklich die Station: Auf eine Fläche wird **abgelegt**
 * (`place`), am Brett wird **angefangen** (`work`), in den Mülleimer geworfen
 * (`trash`, `scrape`), über die Theke geschoben (`serve`), ein Herd gelöscht
 * (`douse`). Dort ist das Möbel das Ziel, und es leuchtet auch so.
 *
 * **Warum das hier steht und nicht in der Zone.** Es ist eine Aussage über
 * Taten und nicht über Netze — dieselbe Trennung wie bei `kitchenPrompt`
 * darunter, und aus demselben Grund: Ein Test rechnet alle Fälle nach, und
 * die nächste Tat, die dazukommt, wird hier einsortiert statt in einer
 * zweiten Liste in der Zone vergessen.
 */
export function meansContent(deed: KitchenDeed): boolean {
  return deed.do === 'take' || deed.do === 'combine';
}

/**
 * **Der Hinweis über der Figur** (`core/usable.Usable.usePrompt`) — derselbe
 * Satz, den `kitchenDeed` gleich ausführen wird.
 *
 * Er wird aus der Tat gebaut und nicht daneben geschrieben: Ein Hinweis, der
 * _Ablegen_ sagt und dann nichts tut, ist schlimmer als gar keiner. Die Zahl
 * der fehlenden Schnitte steht nicht mehr darin — das Schneidebrett hat jetzt
 * einen Balken über sich (`kitchenWork.workProgress`), und der sagt es besser
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
    case 'work':
      // Geschnitten wird eine bestimmte Zutat („Salatkopf schneiden"),
      // gespült wird Geschirr — „Dreckiger Teller spülen" wäre falsches
      // Deutsch, und der Dativ dafür stünde in keiner Tabelle.
      return deed.kind === 'chop' ? `${ITEM_LABELS[deed.dish.item]} schneiden` : 'Geschirr spülen';
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
