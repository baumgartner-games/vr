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
 * macht mit derselben Uhr sauber, mit der das Brett schneidet
 * (`kitchenWork.ts`). **Fertig gespült liegt er in der Hand** — man steht ja
 * daneben, sonst liefe die Uhr gar nicht (`kitchenWork.WORK_TO_HAND`) — und
 * von dort geht er auf das **Abtropfbrett** daneben, bis ihn jemand braucht,
 * oder gleich zur nächsten Bestellung. Ohne diesen Kreis wäre die
 * Tellerausgabe ein Brunnen und die Küche nach zehn Gästen ein Tellerlager.
 *
 * **Das Spülbecken ist zugleich der Wasserhahn.** Wer den **Topf** in der Hand
 * hat und davorsteht, füllt ihn — und zwar auch dann, wenn darin gerade ein
 * dreckiger Teller liegt. Der Topf wird nicht hineingelegt, er wird
 * untergehalten, und deshalb gehen ihn die beiden Sätze nichts an, mit denen
 * das Becken sonst ablehnt. Wasser ist dabei Inhalt des Topfes wie das Patty
 * Inhalt der Pfanne (`kitchenRecipes.Dish`), und es geht auf demselben Weg
 * wieder weg wie jeder Inhalt: über den Mülleimer. Die Begründungen im
 * Einzelnen stehen bei `atSink`.
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

import type { GrabLike } from '../../../core/grabHandles';
import type { Handedness } from '../../../core/XRInput';
import {
  INTERACTION_DEFAULTS,
  type InteractionInput,
  type InteractionKind,
  type InteractionSpec,
} from '../../../core/interaction';
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
  stoveUnder,
  type StovePhase,
  type StoveState,
  type StoveTick,
} from './kitchenClock';

export {
  IDLE_WORK,
  WORK_SECONDS,
  WORK_TO_HAND,
  advanceWork,
  onWork,
  workProgress,
  workStage,
  workWaits,
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
  /**
   * **Den Topf unter den Hahn halten** — er ist danach voll, die Station
   * bleibt unberührt.
   *
   * `dish` ist der **volle** neue Stand der Hand, wie bei `combine`: Die Zone
   * tauscht damit nur das Aussehen des Getragenen (`kitchen.restyle`) und
   * rechnet nichts nach.
   *
   * **Eine eigene Tat und kein `combine`.** Mechanisch ginge es als solches —
   * Hand bekommt einen neuen Stand, Station behält ihren —, aber zwei Dinge
   * wären dann falsch. Der **Saum** hinge am Liegenden (`meansContent` sagt für
   * `combine` wahr), also am dreckigen Teller im Becken, mit dem dieser
   * Handgriff gar nichts zu tun hat. Und der **Satz** hieße „Wasser auflegen".
   * Gefüllt wird an der Station, also leuchtet die Station und der Satz sagt,
   * was geschieht.
   *
   * **Und kein `work`** (`kitchenWork.ts`): Dazu weiter unten bei `atSink`.
   */
  | { do: 'fill'; dish: Dish }
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
 *
 * **Angesprochen wird der dreckige Teller, und was herauskommt, liegt in der
 * Hand.** Der Weg ist damit ein Griff und kein Hin und Her: hierher treten,
 * `A`, dabeistehen, fertig. Wo das Fertige hingeht, entscheidet die Uhr
 * (`kitchenWork.WORK_TO_HAND`) und nicht diese Datei — hier steht nur, was
 * hineindarf.
 *
 * **Die erste Zeile ist trotzdem geblieben**, und sie ist jetzt der Ausweg für
 * den einen Fall, in dem der saubere Teller doch im Becken steht: Wer mit
 * voller Hand danebenstand, bekam ihn nicht gereicht. Ein Griff mit leerer
 * Hand holt ihn nach.
 *
 * **Der Topf ist die Ausnahme, und er ist sie in beiden Sätzen.** „In die Spüle
 * gehört nur Geschirr" und „In der Spüle steht schon …" sind für ihn falsch,
 * weil er gar nicht **hineingelegt** wird: Er wird unter den Hahn gehalten und
 * ist danach voll. Deshalb steht sein Fall **vor** beiden Prüfungen — und das
 * ist die ausdrückliche Zusage: Wer den Topf füllt, füllt ihn auch dann, wenn
 * im Becken gerade ein dreckiger Teller liegt. Das Becken ist in diesem
 * Augenblick zwei Dinge auf einmal — ein Waschbecken und ein Wasserhahn —, und
 * genau so ist es in einer Küche auch.
 *
 * **Sofort und nicht mit der Uhr.** Es lag nahe, einen dritten `WorkKind` neben
 * `'chop'` und `'wash'` zu stellen; dagegen sprechen zwei Dinge, und das
 * zweite ist das schwerere:
 *
 * - **Es gibt nichts zuzusehen.** Ein Fortschrittsbalken ist die Antwort auf
 *   „das dauert, und solange musst du hier stehen bleiben". Beim Schneiden und
 *   beim Spülen ist das die Arbeit selbst; einen Hahn aufzudrehen ist ein
 *   Handgriff. Drei Sekunden Balken dafür wären drei Sekunden Buchhaltung.
 * - **Die Uhr gehört der Station, und die Station ist besetzt.** `WorkState`
 *   hängt an der Spüle und rechnet mit **einem** Ding darin (`onWork`,
 *   `advanceWork`, `WORK_TO_HAND`). Der Topf liegt aber nicht darin — er ist in
 *   der Hand, und im Becken darf gleichzeitig ein Teller gespült werden. Das
 *   wären zwei Uhren an einer Station, und genau **eine** Uhr an einer Station
 *   ist das, wofür es `kitchenWork.ts` überhaupt gibt.
 *
 * **Wohin das Wasser wieder verschwindet**, steht nicht hier, sondern ergibt
 * sich: Über dem Mülleimer wird der Topf abgeräumt und bleibt in der Hand
 * (`intoBin` → `scrape`), und abstellen und aufnehmen lässt er sich voll wie
 * leer, weil `onTop` nach dem Träger fragt und nicht nach seinem Inhalt. Eine
 * Sackgasse gibt es damit nicht.
 *
 * **Wozu das Wasser gut ist, steht absichtlich nirgends.** Verlangt war das
 * Füllen, und ein Suppenrezept, das niemand bestellt hat, wäre eine zweite
 * Entscheidung im selben Handgriff. Wenn es eines Tages kommt, ist die Stelle
 * dafür schon da: Wasser ist Inhalt des Topfes wie das Patty Inhalt der Pfanne,
 * der Herd kocht, was in seinem Gefäß liegt (`kitchenClock.onStove` liest heute
 * `on.item === 'pan'`), und `CHOPS`/`FRIES` sind Tabellen. Was fehlte, wäre eine
 * Zeile darin — kein neuer Zustand.
 */
function atSink(held: Dish | null, on: Dish | null): KitchenDeed {
  if (!held) return on ? { do: 'take', dish: on } : { do: 'nothing' };
  if (held.item === 'pot') {
    // `on` kann beim Topf nur `['water']` sein — er steht in keiner Zeile von
    // `TAKES`, nimmt über `combine` also nichts an. Ein voller Topf tut hier
    // deshalb nichts Doppeltes, sondern sagt, was los ist.
    if (held.on.length) return { do: 'refuse', why: 'Im Topf ist schon Wasser' };
    return { do: 'fill', dish: dish('pot', ['water']) };
  }
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
 * es macht den Abwasch erst zu einem Weg mit einem Ende. Aus dem Becken kommt
 * der saubere Teller in die **Hand** (`kitchenWork.WORK_TO_HAND`), und wer ihn
 * nicht sofort braucht, müsste ihn sonst auf irgendeiner Arbeitsplatte
 * zwischenlagern, wo er beim nächsten Burger im Weg liegt. Hier stellt man ihn
 * ab und spült den nächsten — einen Schritt weiter, ohne den Platz zu wechseln.
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
 * (`place`), am Brett wird **angefangen** (`work`), am Becken der Topf
 * **gefüllt** (`fill`), in den Mülleimer geworfen (`trash`, `scrape`), über die
 * Theke geschoben (`serve`), ein Herd gelöscht (`douse`). Dort ist das Möbel
 * das Ziel, und es leuchtet auch so.
 *
 * **Beim Füllen ist das der ganze Witz**: Im Becken kann ein dreckiger Teller
 * liegen, und der hat mit dem Topf unter dem Hahn nichts zu tun. Leuchtete er,
 * sähe es aus, als griffe man gleich nach ihm.
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
 * **Wie eine Tat bedient werden will** (`core/interaction.ts`) — gegriffen
 * oder gedrückt.
 *
 * Gegriffen wird genau das, was danach **in der Hand liegt**: das Brötchen aus
 * der Ausgabe, der Teller vom Stapel, die Pfanne vom Herd, der Topf, der
 * Feuerlöscher aus seiner Halterung. Alles andere ist eine Bedienung der
 * Station — ablegen, schneiden, spülen, **den Topf füllen**, wegwerfen,
 * servieren, löschen —, und das ist ein Druck, auch wenn dabei etwas die Hand
 * verlässt.
 *
 * **Und deshalb steht `fill` in keiner Zeile hier.** Es ist kein `take`, fällt
 * also in denselben Zweig wie alles andere und wird gedrückt — in der Brille
 * heißt das **Berühren oder Trigger** (`core/interaction.INTERACTION_DEFAULTS`,
 * `press` → `handTouch`/`aimTrigger`, getippt), von oben `A`, am Schreibtisch
 * linke Maustaste oder `E`. Genau der Weg, den Schneiden und Spülen schon
 * gehen; ein Sonderfall für eine der drei Ansichten kommt gar nicht erst vor.
 *
 * **Warum `combine` ein Druck ist**, obwohl es wie `take` am Inhalt leuchtet
 * (`meansContent`): Wer ein Patty auf ein Brötchen legt, greift nicht danach,
 * er legt es hin. Die beiden Fragen sind verschieden — *welches Netz ist
 * gemeint* und *was will es* —, und sie haben deshalb zwei Funktionen und
 * nicht eine mit zwei Antworten.
 *
 * **Und `nothing` ist `none`**: die leere Hand vor der leeren Fläche. Heute
 * meldet die Zone so eine Station gar nicht erst an
 * (`kitchen.refreshStations`); dass die Antwort hier trotzdem steht, macht den
 * Satz vollständig und erspart dem nächsten, der eine Station stehen lässt,
 * einen leuchtenden Saum ohne Angebot.
 */
export function kitchenInteraction(deed: KitchenDeed | null | undefined): InteractionKind {
  if (!deed || deed.do === 'nothing') return 'none';
  return deed.do === 'take' ? 'grab' : 'press';
}

/**
 * **Ob diese Tat etwas aus der Hand gibt** — und damit, ob in der Brille die
 * **Greif-Taste** zuständig ist statt der bloßen Berührung.
 *
 * Das ist der gemeldete Fehler, als Regel geschrieben: Bisher löste eine
 * Arbeitsplatte aus, sobald die Hand sie **berührte** — wer mit dem Topf daran
 * vorbeikam, hatte ihn abgestellt, ohne etwas gedrückt zu haben. Richtig ist:
 * in der Nähe sein **und** die Greif-Taste loslassen (oder erneut drücken,
 * wenn man nur getippt hatte). Sechs Taten geben etwas aus der Hand, und für
 * die sechs gilt das:
 *
 * `place`, `work` (ablegen und gleich anfangen), `combine` (auflegen oder
 * aufnehmen), `trash`, `scrape` (der Belag geht, der Träger bleibt) und
 * `serve`.
 *
 * **`douse` gehört ausdrücklich nicht dazu.** Das Feuer zu löschen nimmt der
 * Hand nichts weg — der Löscher bleibt darin. Wer mit ihm an den brennenden
 * Herd tritt, soll ihn auch weiter durch Hinlangen löschen können; das ist
 * eine Bedienung und kein Ablegen.
 *
 * **Und von oben ändert sich dadurch nichts**: `A` tut, was `A` immer getan
 * hat. Was hier entsteht, ist eine Ausnahme **nur für die Ansicht `vr`**
 * (`core/interaction.InteractionSpec.views`) — genau der Fall, für den es sie
 * gibt.
 */
export function kitchenGivesUp(deed: KitchenDeed | null | undefined): boolean {
  if (!deed) return false;
  switch (deed.do) {
    case 'place':
    case 'work':
    case 'combine':
    case 'trash':
    case 'scrape':
    case 'serve':
      return true;
    default:
      return false;
  }
}

/**
 * **Die ganze Auskunft einer Station** — Absicht, Ausnahme in der Brille und
 * die Griffe dessen, was dabei in die Hand geht.
 *
 * Eine Zeile statt dreier Felder an drei Stellen: Die Zone meldet sie an
 * (`kitchen.refreshStations`), die Hand liest sie
 * (`PortalWorld.useByHand`), und ein Test rechnet sie nach, ohne dass eine
 * Brille dafür aufgesetzt werden müsste.
 *
 * @param grab was das gemeinte Ding über das Greifen sagt
 *             (`worlds/test/zones/kitchenGrab.ts`) — Griffe und Reichweite
 * @param freeTrigger ob der Trigger in der Brille gerade frei ist. Falsch,
 *                    solange die Hand etwas hält, das ihn selbst benutzt:
 *                    den Feuerlöscher und das getragene Möbel.
 */
export function kitchenInteractionSpec(
  deed: KitchenDeed | null | undefined,
  grab?: GrabLike,
  freeTrigger = true,
): InteractionSpec {
  const kind = kitchenInteraction(deed);
  if (!kitchenGivesUp(deed)) {
    if (freeTrigger || kind === 'none') return { kind, grab };
    const base = INTERACTION_DEFAULTS[kind].vr;
    const inputs = base.inputs.filter((one) => one !== 'aimTrigger');
    return { kind, views: { vr: { inputs, press: base.press } }, grab };
  }
  // **In der Brille die Greif-Taste, und sie wird gehalten.** Gedrückt wird
  // beim Zugreifen, abgelegt beim Loslassen — dieselbe Taste, dieselbe Geste,
  // und dazwischen kann man mit dem Topf durch die halbe Küche laufen.
  //
  // **Und der Trigger daneben.** Das ist der gemeldete Fehler: Ein Steak in
  // der Pfanne ließ sich auf kein Brötchen legen, weder mit dem Trigger noch
  // mit der Greif-Taste, während es von oben mit `A` ging. Der Grund war
  // diese Zeile — sie nannte nur `grip`, und wer mit der Pfanne vor dem
  // Brötchen steht, hat seine **Faust** eine Pfannenlänge daneben: Die Mulde
  // liegt über der Platte, die Hand nicht. Gezielt wird dagegen mit dem
  // Strahl, und der trifft das Brötchen. Beide Geber nebeneinander, und die
  // Berührung bleibt weiterhin draußen — sonst legt man den Topf wieder ab,
  // sobald man mit ihm an der Arbeitsplatte vorbeikommt.
  //
  // **Es sei denn, der Trigger ist gerade vergeben** (`freeTrigger`). Er hat in
  // dieser Küche zwei angestammte Aufgaben, und beide gehören dem, was schon in
  // der Hand liegt: Er **spritzt** den Feuerlöscher (`kitchen.spray`) und
  // **wendet** ein getragenes Möbel (`kitchen.buildTurn`). Bekäme er daneben
  // das Ablegen, drückte man ihn zum Löschen und stellte den Löscher dabei auf
  // die Arbeitsplatte. Wer entscheidet, ist die Zone: Sie weiß, was in der Hand
  // liegt, und diese Datei bleibt die Regel dazu.
  const inputs: readonly InteractionInput[] = freeTrigger ? ['grip', 'aimTrigger'] : ['grip'];
  return { kind, views: { vr: { inputs, press: 'hold' } }, grab };
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
    case 'fill':
      // „Topf mit Wasser füllen" — der Träger im Nominativ, der Inhalt hinter
      // dem `mit`. Beides sind Einträge aus `ITEM_LABELS` und keine
      // geschriebenen Wörter: Käme eines Tages ein zweiter Hahn mit etwas
      // anderem daraus, steht der Satz schon richtig da.
      return `${ITEM_LABELS[deed.dish.item]} mit ${ITEM_LABELS[deed.dish.on[0] ?? 'water']} füllen`;
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

// --- zwei Hände ------------------------------------------------------------

/**
 * **An welcher Hand etwas liegt** — oder vor dem Bauch, wenn es keine gibt.
 *
 * `'body'` ist kein Notnagel, sondern der Normalfall von oben und am
 * Schreibtisch: Dort gibt es keine Hand, die zugegriffen hätte
 * (`core/usable.UseSource.hand`), und was die Figur trägt, hängt vor ihrem
 * Bauch (`kitchen.carryInHands`). In der Brille ist es eine der beiden echten
 * Hände.
 *
 * Es ist zugleich der **Schlüssel des Faches**: Die Küche führt je Seite eines,
 * und welches Fach eine Seite meint, sagt `carrySlot` darunter.
 */
export type CarrySide = Handedness | 'body';

/**
 * **Welches Fach eine Seite meint** — und hier steckt die ganze Betriebsart
 * drin (`core/grabSettings.GrabSettings.twoHands`).
 *
 * **Steht der Schalter aus**, gibt es genau **ein** getragenes Ding, und es
 * gehört der Figur und nicht einer Hand: Jede Seite bekommt dasselbe Fach
 * (`'body'`) und damit dieselbe Antwort. Das ist der Zustand, den diese Küche
 * immer hatte, Zeile für Zeile — wer mit der linken Hand nach dem Teller
 * greift, den die rechte hält, greift nach demselben Teller.
 *
 * **Steht er an**, hat jede Hand ihr eigenes Fach: links die Pfanne, rechts
 * der Burger.
 *
 * **Und ohne Hand gefragt?** Das kommt auch in der Brille vor — der fertig
 * gespülte Teller kommt aus einer **Uhr** in die Hand (`kitchenWork.WORK_TO_HAND`)
 * und nicht aus einem Griff, und die Uhr weiß von keiner Hand. Dann gilt die
 * Hand, die zuletzt etwas getan hat (`busy`): Ein drittes Fach vor dem Bauch
 * wäre ein drittes getragenes Ding, und genau das soll dieser Schalter nicht
 * hergeben.
 */
export function carrySlot(side: CarrySide, twoHands: boolean, busy: Handedness): CarrySide {
  if (!twoHands) return 'body';
  return side === 'body' ? busy : side;
}

/** Die andere der beiden Hände. */
export function otherHand(hand: Handedness): Handedness {
  return hand === 'left' ? 'right' : 'left';
}

/**
 * **Was eine Übergabe von Hand zu Hand verlangt** — fünf Bedingungen, und alle
 * fünf müssen gelten.
 *
 * Es ist dieselbe Geste wie beim Werkzeug (`PortalWorld.handoverTool`):
 * **Hände zusammen, greifen, fertig.** Gemessen wird sie auch mit derselben
 * Rechnung (`worlds/portal/grabReach.atHandGrip`, `HANDOVER_REACH`) — die steht
 * dort und wird dort geprüft, hier steht nur, wann sie überhaupt gefragt wird.
 */
export interface HandoverAsk {
  /** Nur in der Brille: von oben und am Schreibtisch gibt es keine zweite Hand. */
  readonly presenting: boolean;
  /**
   * **Die Flanke** der Greif-Taste der leeren Hand
   * (`core/XRInput.ButtonState.justPressed`) und nicht ihr Liegen: Wer sie
   * gedrückt hält, während die Hände beieinander sind, schöbe den Gegenstand
   * sonst Bild für Bild hin und her.
   */
  readonly pressed: boolean;
  /** Ob die greifende Hand leer ist — in eine volle wird nichts gelegt. */
  readonly empty: boolean;
  /** Ob die andere Hand überhaupt etwas hält. */
  readonly holding: boolean;
  /** Ob beide **Griffpunkte** nah genug beieinander sind (`atHandGrip`). */
  readonly together: boolean;
}

/**
 * **Ob der Gegenstand jetzt die Hand wechselt.**
 *
 * „Es wäre schön, wenn ich Gegenstände in der Küche auch von einer in die
 * andere Hand nehmen könnte" — das ist der Auftrag, und das hier ist er als
 * Regel. Sie gilt in **beiden** Betriebsarten: Mit dem Schalter aus wechselt
 * das eine getragene Ding die Hand, mit ihm an wandert eines der beiden in die
 * freie.
 *
 * Eine eigene Funktion und keine fünf `&&` in der Zone, weil ein Fall hier eine
 * Zeile ist und im Headset ein Hin- und Herlaufen mit aufgesetzter Brille.
 */
export function handsOver(ask: HandoverAsk): boolean {
  return ask.presenting && ask.pressed && ask.empty && ask.holding && ask.together;
}

/**
 * **Was beim Abschalten in der Hand bleibt** — genau eines, und der Rest geht
 * dorthin zurück, wo er hingehört.
 *
 * Wer `twoHands` umlegt, während beide Hände voll sind, hat einen Augenblick
 * lang zwei Dinge in einem Fach, und das ist kein Zustand, sondern ein
 * verlorener Gegenstand: Das zweite hinge an einer Hand, nach der niemand mehr
 * fragt. Bleiben darf deshalb das der Hand, die zuletzt etwas getan hat
 * (`busy`) — sie ist die, mit der gerade gearbeitet wurde. Alles andere räumt
 * die Zone nach derselben Regel weg wie der Umbau (`kitchenBuild.goesHomeOnEdit`):
 * Was einen Platz hat, an den es gehört, geht dorthin zurück; weggeworfen wird
 * nur, was keinen hat.
 *
 * `null` heißt: Es ist ohnehin nichts in der Hand.
 */
export function keptOnFold(sides: readonly CarrySide[], busy: Handedness): CarrySide | null {
  if (sides.length === 0) return null;
  return sides.includes(busy) ? busy : sides[0]!;
}
