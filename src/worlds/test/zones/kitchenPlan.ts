import type { GridPlan } from '../../grid/gridPlan';
import { DIR_E, DIR_N, DIR_W, TILE } from '../../nav/navTile';
import { KITCHEN_PIECES, kitchenPiece, type KitchenPiece } from '../../../core/kitchenFit';
import { KITCHEN } from '../layout';
import type { KitchenItem, StationKind } from './kitchenCarry';
import { PLATE_HEIGHT } from './kitchenProps';

/**
 * **Der Aufbau der Küche** — welches Möbel wo steht, was es im Grundriss
 * belegt und welche Rolle es im Spiel übernimmt. Ohne Szene, ohne Netz, ohne
 * Zone.
 *
 * **Warum eine eigene Datei neben `kitchen.ts`.** Diese Zahlen werden an zwei
 * Stellen gebraucht, und nur eine davon spielt: `worlds/test/testPlan.ts`
 * stempelt den Grundriss, lange bevor irgendein Modell geladen ist, und
 * `testPlan.test.ts` rechnet ihn nach — beide wollen den Aufbau und nicht die
 * Küche. Die Zone daneben ist der andere Fall: Sie hängt Netze um, baut
 * Körper, backt Icons und führt Uhren. Zusammen waren das anderthalbtausend
 * Zeilen, in denen die Frage „wo steht der Herd?" zwischen zwei Absätzen über
 * Trefferkästen stand.
 *
 * Die Zone reicht alles hier weiter (`kitchen.ts`, `export *`), damit niemand
 * seine Importe umschreiben muss — und damit es **keinen Ringschluss** gibt:
 * Der Aufbau kennt die Zone nicht, die Zone kennt den Aufbau.
 */

/** Wie viele Viertelumdrehungen ein Möbel gedreht wird. */
export type Turn = 0 | 1 | 2 | 3;

/** Ein Stück in der Küche: welches, wo, wie herum — und wofür. */
export interface Spot {
  /** Der Name im Katalog (`core/kitchenFit.KITCHEN_PIECES`). */
  readonly name: string;
  /** Die nordwestliche Kachel seiner Grundfläche, relativ zur Zone. */
  readonly x: number;
  readonly z: number;
  /**
   * Viertelumdrehungen um die Hochachse; 0 ist wie geliefert, und **vorn ist
   * dann Norden** (−z). Eine Umdrehung dreht nach Westen, zwei nach Süden
   * (zum Gang hin), drei nach Osten.
   *
   * **„Vorn" heißt hier die Richtung und nicht die Schauseite des Möbels** —
   * die zeigt in dieser Quelle nach **+z**, also bei `turn: 0` nach Süden. Das
   * ist nachgemessen und stand lange nirgends: An der Küchenzeile wie an der
   * Spüle sitzen die Türgriffe auf der +z-Seite (bis z = +1,061), während die
   * Rückwand bei z = −1,061 glatt durchläuft. Die Wandzeile steht deshalb mit
   * `turn: 0` **richtig** herum — ihre Türen zeigen zum Gang, ihre Rückwand zur
   * Wand, und der Wasserhahn der Spüle steht hinten. Wer das verwechselt, dreht
   * die halbe Küche um 180°, weil ihm ein Möbel verkehrt vorkam.
   */
  readonly turn?: Turn;
  /**
   * **Wie hoch über dem Boden es steht**, in Metern — 0 für alles, was auf
   * dem Boden steht.
   *
   * Es gibt genau einen Fall, und der ist der Grund für dieses Feld: Das
   * **Ausgaberegal** mit den beiden Wärmeschirmen gehört über die
   * Ausgabetheke und nicht dahinter. Es stand eine Kachel nördlich davon —
   * zwei rote Schirme, die auf nichts zeigten. Jetzt steht es auf **derselben
   * Kachel eine Ebene höher**, also dort, wo die Schirme das beleuchten, was
   * auf der Theke liegt (`rackLift`).
   */
  readonly lift?: number;
  /**
   * **Was dieses Möbel ausgibt** — und damit zugleich, dass es eine Ausgabe
   * ist (`stationKind`).
   *
   * Die vier Zutaten und die Teller kommen nicht mehr aus gebauten Holzkisten,
   * sondern aus dem Möbel `serve-counter` des Katalogs, mit einem gerenderten
   * Bild der Zutat an der Vorderseite (`kitchenIcon.IconOven`). Eine Kiste,
   * die es nur in dieser einen Küche gibt, war ein Möbel, das nirgends im
   * Schauraum stand und in keiner Liste auftauchte.
   */
  readonly gives?: KitchenItem;
  /**
   * **Wie die Station im Hinweis heißt**, wenn der Katalogname nicht passt.
   *
   * Vier Ausgaben nebeneinander heißen im Katalog alle _Ausgabe_ — vor der
   * Salatausgabe soll aber _Salatausgabe_ stehen und nicht dreimal dasselbe
   * Wort. Der Katalog bleibt davon unberührt: Er beschreibt das gekaufte
   * Möbel, nicht seine Rolle in einem Aufbau (`core/kitchenFit.ts`).
   */
  readonly label?: string;
  /**
   * **Welche Rolle dieses Möbel an dieser Stelle spielt**, wenn nicht die aus
   * dem Katalog.
   *
   * Dieselbe Unterscheidung, die es für `gives` schon gibt, nur eine Stufe
   * allgemeiner: Der Katalog beschreibt das **gekaufte Möbel**, dieser Aufbau
   * seine **Rolle**. Ein Arbeitstisch ist im Katalog ein Arbeitstisch — in
   * dieser Küche stehen vier davon in der Reihe vor der Theke, und drei davon
   * sind **Gästetische**, an denen dreckiges Geschirr liegen bleibt, während
   * der vierte die **Geschirrrückgabe** ist, an der es sich stapelt. Dasselbe
   * Möbel, dieselbe Höhe, dieselbe Grundfläche, drei Rollen.
   *
   * Der Katalog kann das nicht entscheiden, und er soll es auch nicht: Er
   * müsste dafür dreimal `table` führen, und spätestens die nächste Küche
   * stellte einen davon wieder als Arbeitsfläche hin. `role` hat deshalb in
   * `stationKind` Vorrang vor allem anderen — auch vor `gives`: Wer hier
   * etwas hinschreibt, hat es an genau dieser Stelle so gemeint.
   */
  readonly role?: StationKind;
  /**
   * **Ob es im Schauraum steht** statt in der Küche.
   *
   * Ein Schaustück wird beschriftet, gibt nichts her und nimmt nichts an —
   * und es bekommt **keine Sperre über sich** (`BLOCK_HEIGHT`): Wer durch
   * einen Schauraum geht, soll nicht gegen Luft laufen, die dort steht, damit
   * niemand auf eine Arbeitsplatte springt.
   */
  readonly show?: boolean;
}

/**
 * Die Höhe der Ausgabetheke — die Ebene, **auf** der das Regal stünde.
 *
 * Eine Funktion und keine Konstante, weil sie **vor** `KITCHEN_SPOTS`
 * gebraucht wird und aus dem Katalog kommt: Wer die Theke im Katalog ändert,
 * soll das Regal nicht nachmessen müssen.
 */
export function passTop(): number {
  return kitchenPiece('pass')?.height ?? 0.53;
}

/**
 * **Die Mindestluft zwischen Theke und Regal**, in Metern — der Rest, unter
 * den ein Teller passt.
 *
 * Das Regal stand einmal mit seinem Fuß genau auf der Theke — zwei Möbel, die
 * sich berühren, und darunter passte nichts, nicht einmal ein Blatt Papier.
 * Ein Ausgaberegal ist aber kein Deckel: Unter den Wärmeschirmen soll ein
 * Teller stehen können.
 *
 * Die Rechnung, gemessen und nicht geraten:
 *
 * - Die Ausgabetheke ist **0,53 m** hoch (`core/kitchenFit.KITCHEN_PIECES`,
 *   `pass`), das Regal selbst 0,56 m.
 * - Ein Teller ist **0,05 m** hoch (`kitchenProps.PLATE_HEIGHT`, nachgebaut
 *   aus dem Modell).
 * - 0,12 m Luft heißt also: Der Teller schiebt sich mit **7 cm Rest** unter
 *   das Regal, und man sieht von der Seite, dass da eine Fuge ist.
 *
 * **Das ist heute die Untergrenze und nicht mehr die ganze Höhe.** Dieser
 * Block erklärte lange, warum das Regal **dicht** über der Theke sitzt — dass
 * nämlich gerade ein Teller darunter passt und ein Burger ausdrücklich nicht,
 * damit die Oberkante unter dem Kopf des Kochs bleibt. In der Küche stimmte
 * die Rechnung und das Bild nicht: Ein Regal auf 0,65 bis 1,21 m hängt einer
 * Figur von 1,60 m mitten vor der Brust, verdeckt von vorn die halbe Theke und
 * von oben genau die Kachel, auf die das Gericht soll. Ein Ausgaberegal gehört
 * über Kopf, wie jede Durchreiche — deshalb kommt `RACK_RAISE` dazu, und
 * deshalb ist das mit dem Burger, der nicht darunter passen darf, hinfällig.
 * Er passt jetzt, und das ist richtig so: Auf der Theke steht das fertige
 * Gericht, die Schirme leuchten von oben darauf.
 */
export const RACK_AIR = PLATE_HEIGHT + 0.07;

/**
 * **Und der Meter, um den das Regal höher gehängt wurde.**
 *
 * Eine benannte Konstante und keine Zahl in der Rechnung, weil sie die eine
 * Stelle ist, an der man die Durchreiche verschiebt. Nachgerechnet:
 *
 * - Der **Fuß** liegt jetzt bei 0,53 (Theke) + 0,12 (`RACK_AIR`) + 1,00 =
 *   **1,65 m**, die **Oberkante** bei 1,65 + 0,56 (`plate-rack`) = **2,21 m**.
 *   Vorher waren es 0,65 m und 1,21 m.
 * - Für die **Figur** (1,60 m, `core/chefFit.CHEF_HEIGHT`): Der Fuß liegt
 *   5 cm über ihrem Scheitel. Sie läuft also darunter durch, statt dagegen zu
 *   stoßen — und was sie trägt, trägt sie vor dem Bauch (`kitchenCarry.ts`),
 *   kommt dem Regal folglich nicht einmal nahe. Das ist der Unterschied
 *   zwischen einer Durchreiche und einem Brett auf Brusthöhe.
 * - Für die **Sicht von oben** (55° über der Waagerechten,
 *   `core/topDownPose.TOP_DOWN_TILT`): Ein Ding wandert im Bild um
 *   `Höhe / tan 55°` auf die Kamera zu, also nach Süden. Ein Meter mehr sind
 *   `1 / 1,428 = 0,70 m` — gut zwei Drittel einer Kachel. Das Regal liegt im
 *   Bild damit **vor** der Theke statt darauf, und der Teller, den man dort
 *   abstellt, ist wieder zu sehen. Genau dafür ist die Hauptansicht da.
 *
 * Ein Meter und nicht 0,95 oder 1,10: Die Zahl soll ablesbar sein. Alles
 * zwischen „über dem Kopf" (ab 1,60 − 0,53 − 0,12 = 0,95 m) und „noch im
 * Raum" ist begründbar, und von den begründbaren Zahlen ist die runde die
 * beste.
 */
export const RACK_RAISE = 1;

/** Wie hoch der Fuß des Ausgaberegals über dem Boden steht, in Metern. */
export function rackLift(): number {
  return passTop() + RACK_AIR + RACK_RAISE;
}

/**
 * **Der Aufbau der Küche** — drei Reihen, wie in jeder Küche dieses Spiels,
 * und die Ausgaben an der Westwand. („Reihen" und nicht mehr „Bänder": Seit es
 * ein Förderband gibt, ist das Wort vergeben.)
 *
 * Die Zahlen sind Kacheln **innerhalb** der Zone (`layout.KITCHEN`), damit sich
 * die ganze Küche verschieben lässt, ohne dreißig Zeilen nachzurechnen. Wie
 * groß ein Stück ist, steht nicht hier, sondern im Katalog — gemessen und
 * nicht geschätzt.
 *
 * **Die beiden Schneidebretter stehen jetzt gleich.** Vorher stand eines
 * zwischen zwei Küchenzeilen und das andere zwischen zwei Arbeitstischen, und
 * das sieht man: Eine Zeile ist 1,06 m tief, ein Tisch 1,00 m, ein Brett
 * ebenfalls 1,00 m — in der Zeile sprang das Brett also vorn und hinten drei
 * Zentimeter zurück, auf der Insel schloss es bündig ab. Zwei Bretter, die
 * verschieden stehen, sind ein Fehler, den man sieht und nicht erklären kann.
 * Beide stehen deshalb in derselben Nachbarschaft: Zeile, Brett, Zeile.
 *
 * **Nachtrag: die Delle ist weg, und zwar im Katalog.** Inzwischen rückt
 * `KitchenPiece.align` das Brett um die gemessenen 3,07 cm nach Süden, womit
 * seine **Vorderkante** mit der der Zeile fluchtet (`core/kitchenFit.ts`);
 * hinten wächst die Lücke dafür auf 6,1 cm und zeigt zur Wand. Die gleiche
 * Nachbarschaft bleibt trotzdem: Sie kostet nichts, und ein Brett zwischen
 * zwei verschieden tiefen Möbeln hätte wieder zwei verschiedene Fugen.
 *
 * **Die Anrichte ist abgeschafft.** Der Arbeitstisch ist eine Ablage wie jede
 * andere — kombiniert wird überall (`kitchenCarry.ts`), und ein Möbel, auf dem
 * als einzigem ein Burger entsteht, gibt es bei _Overcooked_ nicht.
 *
 * **Dafür gibt es jetzt einen Gastraum und zwei Bandbahnen.** In der letzten
 * Reihe (z = 10) stehen drei Gästetische und die Geschirrrückgabe — viermal
 * derselbe Arbeitstisch, dreimal in der einen und einmal in der anderen Rolle
 * (`Spot.role`). Und quer durch die Küche laufen zwei Spalten nach Süden: vier
 * Förderbänder bei x = 9, die tragen, was man darauflegt, und vier Zugbänder
 * bei x = 7, die sich vom Arbeitstisch der Insel selbst holen, was dort liegen
 * bleibt. Beides ist Aufbau und kein Möbel: Der Katalog kennt einen Tisch und
 * zwei Bänder, wofür sie hier stehen, steht nur hier.
 */
/**
 * **Wo der rote Umbauknopf steht** — Kachel der Zone, wie alles hier.
 *
 * Er ist kein Möbel und steht deshalb nicht in `KITCHEN_SPOTS`: Ein Knopf, den
 * man im Baumodus aufheben und in die Ecke stellen kann, ist ein Knopf, den
 * man irgendwann nicht mehr findet — und dann kommt man aus dem Baumodus nicht
 * mehr heraus. Die Kachel steht trotzdem hier und nicht in der Zone, damit
 * Grundriss (`stampKitchen`) und Aufbau (`kitchen.ts`) dieselbe Zahl lesen.
 *
 * Neben dem Eingang, am Südwestrand: Wer vom Gang hereinkommt, läuft daran
 * vorbei. Vorher stand hier der Hocker mit dem Feuerlöscher — und weil der
 * Knopf damals auf derselben Kachel hing, erwischte `A` immer nur ihn
 * (`core/usable.pickUsable` nimmt das Nächste) und nie den Löscher.
 */
export const BUILD_BUTTON_TILE = { x: 0, z: 9 } as const;

export const KITCHEN_SPOTS: readonly Spot[] = [
  // --- die Zeile an der Nordwand: Geräte, Spüle, Arbeitsfläche ---------------
  // Sie ist eine durchgehende Arbeitsplatte auf 0,500 m, und dazu gehören
  // seit dem Umbau auch die beiden Hälften der Spüle: Ihr Rand liegt in der
  // Quelle 1,74 cm höher und steckt dafür so tief im Estrich
  // (`core/kitchenFit.SINK_SUNK`).
  { name: 'counter', x: 0, z: 0 },
  { name: 'stove', x: 1, z: 0 },
  { name: 'stove-pot', x: 2, z: 0 },
  // Der **einzige** Herd mit Pfanne, und damit der einzige, auf dem etwas
  // brät: Es gibt genau eine Pfanne in dieser Küche (`kitchen.ts`).
  { name: 'stove-pan', x: 3, z: 0 },
  // **Der Löscher steht neben dem Herd**, und zwar neben dem einen, an dem es
  // brennen kann. Vorher stand er unten am Ausgang: Wer von dort aus löschen
  // wollte, lief einmal quer durch die Küche, während die Pfanne loderte —
  // und in genau den Sekunden ist ein Feuerlöscher entweder in Reichweite
  // oder nutzlos. Eine Kachel Arbeitsfläche kostet das, und sie ist es wert.
  { name: 'extinguisher', x: 4, z: 0 },
  // **Die Spüle sind zwei Möbel**, und sie stehen nebeneinander wie vorher das
  // eine: das **Becken** mit der Armatur auf x = 5, das **Abtropfbrett** auf
  // x = 6. Die Reihenfolge ist nicht frei — im Modell liegt die Mulde auf der
  // linken Hälfte und die Abtropfwanne auf der rechten (`core/kitchenFit.ts`,
  // der Block über `SINK_SUNK`), und mit `turn: 0` zeigt links nach Westen.
  // Andersherum aufgestellt hätte man zwei Hälften, deren Schnittkanten nach
  // außen zeigen statt aufeinander — aus einer Spüle würden zwei aufgesägte.
  { name: 'sink-basin', x: 5, z: 0 },
  { name: 'sink-drain', x: 6, z: 0 },
  { name: 'counter', x: 7, z: 0 },
  { name: 'board', x: 8, z: 0 },
  { name: 'counter', x: 9, z: 0 },
  { name: 'plate-counter', x: 10, z: 0, gives: 'plate' },

  // --- die Ecke nach Osten: sie trennt die Küche vom Schauraum ----------------
  { name: 'counter', x: 11, z: 1 },
  { name: 'counter', x: 11, z: 2 },
  { name: 'bin', x: 11, z: 3 },

  // --- die Ausgaben an der Westwand, zur Küche hin gedreht --------------------
  // Vier nebeneinander und nicht verteilt, seit es Rezepte gibt
  // (`kitchenRecipes.ts`): Wer für einen Deluxe vier Zutaten holt, läuft sonst
  // viermal quer durch den Raum, bevor überhaupt etwas in der Pfanne liegt.
  // Nicht auf der Ankunftskachel (`layout.SPAWNS.kitchen`, x = 1, z = 7): In
  // eine Ausgabe hineingesetzt zu werden ist ein Anfang, den niemand versteht.
  { name: 'serve-counter', x: 1, z: 3, turn: 3, gives: 'bun', label: 'Brötchenausgabe' },
  { name: 'serve-counter', x: 1, z: 4, turn: 3, gives: 'patty', label: 'Pattyausgabe' },
  { name: 'serve-counter', x: 1, z: 5, turn: 3, gives: 'lettuce', label: 'Salatausgabe' },
  { name: 'serve-counter', x: 1, z: 6, turn: 3, gives: 'tomato', label: 'Tomatenausgabe' },

  // --- die Insel in der Mitte ------------------------------------------------
  // Zeile, Brett, Zeile — dieselbe Nachbarschaft wie an der Nordwand.
  { name: 'counter', x: 3, z: 4 },
  { name: 'board', x: 4, z: 4 },
  { name: 'counter', x: 5, z: 4 },
  { name: 'bin', x: 6, z: 4 },
  { name: 'table', x: 7, z: 4 },

  // --- und vorn die Ausgabe, zum Gang hin gedreht -----------------------------
  { name: 'serve-counter', x: 3, z: 9, turn: 2 },
  { name: 'plate-counter', x: 4, z: 9, turn: 2, gives: 'plate' },
  { name: 'pass', x: 5, z: 9, turn: 2 },
  // Die Wärmeschirme: **dieselbe Kachel, eine Ebene höher** — auf der Theke
  // und nicht dahinter, mit Luft dazwischen (`rackLift`).
  { name: 'plate-rack', x: 5, z: 9, turn: 2, lift: rackLift() },
  { name: 'serve-counter', x: 7, z: 9, turn: 2 },
  // Auf `BUILD_BUTTON_TILE` stand einmal der Hocker mit dem Feuerlöscher. Die
  // Kachel gehört jetzt dem roten Umbauknopf (`kitchen.ts`,
  // `addBuildButton`), und der ist kein Möbel: Er steht in keiner Liste,
  // lässt sich nicht aufheben und nicht umbauen.

  // --- der Gastraum: drei Tische und die Rückgabe, südlich der Theke ----------
  // Dieselbe Reihe (z = 10, die letzte der Zone) und dasselbe Möbel: ein
  // Arbeitstisch, dreimal als **Gästetisch** und einmal als
  // **Geschirrrückgabe** (`Spot.role`). Der Katalog weiß davon nichts und muss
  // es nicht — ein Tisch ist ein Tisch, wozu er dasteht, entscheidet der
  // Aufbau.
  //
  // **Nicht auf x = 0…2**, und das ist keine Feinheit: Dort mündet der Gang
  // vom Podest (`layout.PATHS`, das Rechteck `{ x: 12, z: -21, w: 3, d: 4 }` —
  // in Kacheln der Zone genau x = 0…2 an der Südkante). Ein Tisch in der Tür
  // ist keine Küche, sondern ein Hindernis, das jeder beim Hereinkommen
  // umläuft. Jede zweite Kachel ab x = 4, damit zwischen zwei Tischen einer
  // durchkommt.
  { name: 'table', x: 4, z: 10, role: 'table', label: 'Gästetisch' },
  { name: 'table', x: 6, z: 10, role: 'table', label: 'Gästetisch' },
  { name: 'table', x: 8, z: 10, role: 'table', label: 'Gästetisch' },
  // Am Ende der Reihe, im Osten: Hier stapelt sich das dreckige Geschirr
  // (`kitchenProps.FoodKit.dirtyStack`), und von hier ist es der kürzeste Weg
  // zur Spüle an der Nordwand.
  { name: 'table', x: 10, z: 10, role: 'return', label: 'Geschirrrückgabe' },

  // --- zwei Bahnen von der Insel nach vorn ------------------------------------
  //
  // **Die blaue Bahn** (`belt`): vier gewöhnliche Bänder in der Spalte x = 9,
  // `turn: 2` — nach Süden gedreht, und in diese Richtung schieben sie. Am Ende
  // steht eine Küchenzeile als Ablage, auf die abgeliefert wird; ein Band, das
  // ins Leere schiebt, verliert, was daraufliegt. Was hier fährt, hat jemand
  // von Hand daraufgelegt.
  //
  // **x = 9, z = 4…8 ist frei, und das ist nachgesehen und nicht gehofft.**
  // Die Spalte x = 9 hat in dieser Küche genau einen Eintrag, die Küchenzeile
  // bei z = 0; die Ostecke steht auf x = 11 (z = 1…3), die Insel reicht mit
  // dem Arbeitstisch bis x = 7 (z = 4), und die Ausgabe vorn beginnt erst bei
  // z = 9. Zwischen z = 1 und z = 8 steht auf x = 9 also nichts.
  { name: 'belt', x: 9, z: 4, turn: 2 },
  { name: 'belt', x: 9, z: 5, turn: 2 },
  { name: 'belt', x: 9, z: 6, turn: 2 },
  { name: 'belt', x: 9, z: 7, turn: 2 },
  { name: 'counter', x: 9, z: 8 },

  // **Die orange Bahn** (`belt-pull`): vier Zugbänder in der Spalte x = 7,
  // ebenfalls nach Süden. Der Unterschied steht an ihrem **oberen** Ende: Das
  // erste bei z = 5 zieht sich von selbst herunter, was auf dem Arbeitstisch
  // der Insel (x = 7, z = 4) liegengeblieben ist — der Tisch verhält sich dafür
  // wie ein Band, ohne eines zu sein (`kitchenBelt.BeltTile.pull`). Die drei
  // dahinter sind dann eine gewöhnliche Reihe: Wer von einem Band zieht, das
  // ohnehin auf ihn zeigt, bekommt genau das, was jede Bandreihe tut.
  //
  // Am Ende steht **keine neue Ablage**, sondern die, die schon da war: die
  // Arbeitsfläche vor der Ausgabetheke (x = 7, z = 9). Damit ist die Bahn das,
  // wofür ein Zugband gebaut wird — was auf der Insel fertig wird, liegt kurz
  // darauf vorn an der Theke, ohne dass jemand dafür gelaufen ist.
  //
  // **Die Spalte x = 7 ist zwischen z = 5 und z = 8 frei** (die Insel endet bei
  // z = 4, die Ausgabe beginnt bei z = 9), und zwischen den beiden Bahnen
  // bleibt x = 8 als Gang offen: von der Nordzeile bis zum Gastraum, quer an
  // beiden Bahnen entlang.
  { name: 'belt-pull', x: 7, z: 5, turn: 2 },
  { name: 'belt-pull', x: 7, z: 6, turn: 2 },
  { name: 'belt-pull', x: 7, z: 7, turn: 2 },
  { name: 'belt-pull', x: 7, z: 8, turn: 2 },

  // --- der Schauraum: jedes Möbel einmal, einzeln und beschriftet -------------
  { name: 'plate-counter', x: 13, z: 1, show: true },
  { name: 'extinguisher', x: 15, z: 1, show: true },
  // **Die beiden Hälften stehen auch im Schauraum nebeneinander**, auf genau
  // den zwei Kacheln, die die ganze Spüle vorher belegt hat. Der Schauraum
  // zeigt sonst jedes Stück für sich, mit einer Kachel Luft — hier nicht: Ihre
  // Schnittflächen sind offen (`core/kitchenModel.splitSink`), und auf Lücke
  // gestellt sähe man in zwei aufgeschnittene Schränke. Zwei Schilder gibt es
  // trotzdem, und sie liegen nicht übereinander, weil sie über dem jeweiligen
  // Möbel hängen: das des Beckens auf 1,15 m, das des Bretts auf 0,52 m.
  { name: 'sink-basin', x: 17, z: 1, show: true },
  { name: 'sink-drain', x: 18, z: 1, show: true },
  { name: 'bin', x: 20, z: 1, show: true },
  { name: 'table', x: 22, z: 1, show: true },

  { name: 'serve-counter', x: 13, z: 4, show: true },
  { name: 'board', x: 15, z: 4, show: true },
  { name: 'plate-rack', x: 17, z: 4, show: true },
  { name: 'pass', x: 20, z: 4, show: true },

  { name: 'counter', x: 13, z: 7, show: true },
  { name: 'stove', x: 15, z: 7, show: true },
  { name: 'stove-pot', x: 17, z: 7, show: true },
  { name: 'stove-pan', x: 19, z: 7, show: true },
  // **Auch das gebaute Möbel steht hier.** Der Schauraum zeigt jedes
  // Katalogstück genau einmal (`worlds/test/testPlan.test.ts` rechnet
  // `KITCHEN_SHOWN` gegen `core/kitchenFit.KITCHEN_NAMES`), und ob ein Stück
  // aus der Datei kommt oder gebaut wird (`KitchenPiece.built`), ist dem
  // Schauraum egal — er zeigt, was in dieser Küche stehen kann.
  //
  // x = 22, z = 4 ist frei, nachgesehen in der Reihe darüber: In z = 4 stehen
  // `serve-counter` (13), `board` (15), `plate-rack` (17…18) und `pass`
  // (20…21) — rechts davon ist bis zur Ostwand (x = 23) Platz, und x = 22 ist
  // die erste freie Kachel. In der Reihe z = 1 steht dort zwar der
  // Arbeitstisch, aber das sind drei Kacheln Abstand.
  { name: 'belt', x: 22, z: 4, show: true },

  // Das Zugband steht in der dritten Reihe, im selben Takt wie die Herde
  // daneben (13, 15, 17, 19 — also 21). Dass es dort nichts zu ziehen hat, ist
  // richtig so: Der Schauraum zeigt Möbel und keine Aufbauten.
  { name: 'belt-pull', x: 21, z: 7, show: true },
];

/** Wie weit ein Möbel eine Kachel verteuert — teurer als ein Baustein. */
const FURNITURE_COST = 8;

/** Wo die Oberkante des Küchenbodens liegt — knapp über dem Gelände. */
export const KITCHEN_FLOOR = 0.02;

/**
 * **Wie weit vor der Küche ihre Augenhöhe schon gilt**, in Metern.
 *
 * Die Küche ist nach Süden offen — dort geht man hinein (`stampKitchen`), und
 * dort steht auch die Grenze, an der der Spieler in der Brille um einen
 * Viertelmeter absackt (`kitchen.ts`, `fitEyes`). Ohne diesen Meter fiele das
 * genau in dem Schritt an, mit dem man durch die Öffnung tritt: ein Sacken des
 * Bodens, während man vorwärts geht. Einen Meter davor beginnt es, und in der
 * Türöffnung ist es vorbei.
 *
 * Ein Meter und nicht mehr: Nach Süden liegt das Podest (`layout.PODIUM`) mit
 * zwei Kacheln Abstand, und eine Küche, deren Regeln bis unter das Geländer
 * des Nachbarn reichten, wäre eine unsichtbare Stufe mitten im Weg.
 */
export const KITCHEN_EYE_MARGIN = 1;

/**
 * **Ob ein Punkt in der Küche steht** — in Weltmetern, waagerecht.
 *
 * Hier hängt „Küche" für alles, was nur dort gelten soll: die eigene
 * Augenhöhe des Spielers in der Brille (`kitchen.ts`, `fitEyes`). Eine
 * Rechnung und keine zweite Liste von Zahlen — das Rechteck steht in
 * `layout.KITCHEN` und nirgendwo sonst.
 *
 * Die Höhe zählt nicht mit: Die Küche hat keine zweite Etage, und ein Spieler,
 * der über ihr fliegt, ist ein Spieler im Sonderfall einer anderen Welt.
 */
export function inKitchen(x: number, z: number, margin = KITCHEN_EYE_MARGIN): boolean {
  return (
    x >= KITCHEN.x * TILE - margin &&
    x <= (KITCHEN.x + KITCHEN.w) * TILE + margin &&
    z >= KITCHEN.z * TILE - margin &&
    z <= (KITCHEN.z + KITCHEN.d) * TILE + margin
  );
}

/**
 * **Wie diese Drehung heißt** — für den Satz, den der Umbau sagt, wenn jemand
 * ein Möbel weiterdreht (`kitchen.ts`, `turnPiece`).
 *
 * Himmelsrichtungen und nicht „links/rechts": Die Küche wird von oben gespielt,
 * Norden liegt dort oben (`core/topDownPose.ts`), und ein Band, das „nach
 * rechts" schöbe, hieße aus den Augen etwas anderes als von oben. Die
 * Reihenfolge ist die von `Spot.turn` und `kitchenBelt.beltStep`: 0 Norden,
 * 1 Westen, 2 Süden, 3 Osten.
 */
export const TURN_LABELS: readonly string[] = ['Norden', 'Westen', 'Süden', 'Osten'];

/** Die Grundfläche eines Stücks in Kacheln, gedreht wie es steht. */
export function footprint(piece: KitchenPiece, turn: Turn): { w: number; d: number } {
  const [w, d] = piece.tiles;
  return turn % 2 === 0 ? { w, d } : { w: d, d: w };
}

/**
 * **Der Grundriss der Zone** — drei Wände und die Kacheln, auf denen Möbel
 * stehen.
 *
 * Nach Süden bleibt sie offen: Dort kommt man herein, und eine Küche mit einer
 * Tür wäre eine Küche, in der zwei Köche sich im Durchgang begegnen.
 */
export function stampKitchen(plan: GridPlan): void {
  const east = KITCHEN.x + KITCHEN.w - 1;
  const south = KITCHEN.z + KITCHEN.d - 1;

  // **Der Estrich.** Ohne ihn steht die Küche auf der Wiese des Geländes, und
  // eine Spüle im Gras sieht aus wie ein Versehen. Er liegt knapp über dem
  // Gelände, damit sich die beiden nicht um jedes Pixel streiten — dieselbe
  // Handbreit wie der Asphalt der Boxengasse.
  //
  // **Zu sehen ist er nur noch von der Seite**: Oben liegen seit dem Spieltest
  // am Handy die karierten Fliesen (`kitchenFloor.ts`), zwei Millimeter
  // darüber. Der Quader hier bleibt trotzdem genau so stehen, wie er steht —
  // er ist der **Körper**, auf dem gelaufen wird, und seine Oberkante ist die
  // Höhe, auf der jedes Möbel der Küche aufsetzt (`KITCHEN_FLOOR`). Der Belag
  // ist nur das Bild; wer ihn zum Körper machte, hätte zwei Kollider
  // übereinander für eine Fläche.
  //
  // Warum die Fliesen kein neunter Eintrag in `grid/solids.PlanSolidKind`
  // sind, steht in `kitchenFloor.ts`: Eine Sorte dort trägt einen Ton und kein
  // Muster, und die Wiederholung kennt nur, wer weiß, wie groß die Fläche ist.
  plan.mass('stone', KITCHEN, -0.06, KITCHEN_FLOOR);

  plan.run(KITCHEN.x, KITCHEN.z, KITCHEN.w, 'x', (x, z) => plan.wall(x, z, DIR_N));
  for (let z = KITCHEN.z; z <= south; z++) {
    plan.wall(KITCHEN.x, z, DIR_W);
    plan.wall(east, z, DIR_E);
  }

  // **Was ein Möbel belegt, ist teuer zu begehen** — und zwar im Graphen und
  // nicht bloß im Bild. Ohne diese Schleife liefe ein NPC durch den Herd.
  //
  // Seit die Zutatenausgaben Möbel aus dem Katalog sind, steht hier **eine**
  // Schleife und nicht mehr zwei: Die vier Kisten an der Westwand brauchten
  // vorher ihren eigenen Aufschlag, weil sie in keiner Möbelliste standen.
  //
  // Ein **gehobenes** Stück zählt nicht mit: Das Ausgaberegal steht über der
  // Theke, und deren Kacheln sind schon teuer. Zweimal derselbe Aufschlag auf
  // dieselbe Kachel wäre eine Kachel, um die ein NPC grundlos weiter
  // herumginge.
  for (const spot of KITCHEN_SPOTS) {
    const piece = kitchenPiece(spot.name);
    if (!piece || piece.hanging || spot.lift) continue;
    const size = footprint(piece, spot.turn ?? 0);
    for (let dz = 0; dz < size.d; dz++) {
      for (let dx = 0; dx < size.w; dx++) {
        plan.floor(
          { x: KITCHEN.x + spot.x + dx, z: KITCHEN.z + spot.z + dz, w: 1, d: 1 },
          { cost: FURNITURE_COST },
        );
      }
    }
  }

  // Der rote Umbauknopf ist kein Möbel und steht in keiner Liste — seine
  // Säule steht trotzdem im Weg (`kitchen.ts`, `addBuildButton`). Derselbe
  // Aufschlag wie für ein Möbel: Ein NPC geht darum herum, statt hindurch.
  plan.floor(
    { x: KITCHEN.x + BUILD_BUTTON_TILE.x, z: KITCHEN.z + BUILD_BUTTON_TILE.z, w: 1, d: 1 },
    { cost: FURNITURE_COST },
  );
}

/**
 * **Die Einbauten dieser Zone** — und nur sie.
 *
 * Getrennt vom Rest, weil `TestWorld.planLoaded` sie **nach** einem
 * gespeicherten Umbau noch einmal aufsetzt: Ein Einbau hat eine **Kennung**,
 * und `putFixture` ersetzt nach Kennung — es entsteht also kein zweiter
 * daneben. Wände und Bausteine haben keine, und wer eine Wand wegbaut, hat sie
 * weggebaut.
 *
 * **Das Schild hier ist zugleich die Probe auf den Aushang** (`fixtures/sign.ts`):
 * Es trägt mehr als eine Zeile, mit Überschrift und Aufzählung, und wer es
 * benutzt, schlägt es im Menü auf. Ein Schild mit einer Zeile beweist nicht,
 * dass Markdown ankommt.
 *
 * **Und es beschreibt den Weg, den es wirklich gibt.** Es stand hier lange ein
 * Rezept mit Anrichte und dreimal Drücken — beides gibt es nicht mehr, und ein
 * Aushang, der einen abgeschafften Handgriff erklärt, ist schlimmer als keiner:
 * Wer ihn liest, sucht danach ein Möbel, das nirgends steht.
 *
 * **Deshalb wird er jetzt schon wieder nachgezogen**, und zwar an fünf
 * Stellen: Serviert wird nur noch mit Teller, es gibt einen Abwasch (Tische,
 * Rückgabe, Spüle), es gibt ein Förderband, verbranntes Patty kommt auf keinen
 * Burger mehr, und der Feuerlöscher wird gehalten statt auf den Herd gedrückt.
 * Jede dieser fünf Änderungen macht einen Satz im alten Text falsch — und ein
 * falscher Satz auf einem Schild kostet mehr Zeit als drei fehlende.
 */
export function fitKitchen(plan: GridPlan): void {
  plan.putFixture({
    id: 'schild-kueche',
    kind: 'sign',
    x: KITCHEN.x + 1,
    z: KITCHEN.z + KITCHEN.d - 1,
    dir: DIR_W,
    props: {
      text: [
        '# Die Küche',
        '',
        'Möbel aus *Overcooked Kitchen Assets (Fan Art)* von Arun Kumar S,',
        'CC-BY-4.0 — siehe `public/models/CREDITS.md`. Die beiden Bänder stehen',
        'in keiner Datei, sie sind gebaut.',
        '',
        '- An der Westwand: vier Ausgaben — Brötchen, Patty, Salat, Tomate',
        '- An der Nordwand: Zeile, drei Herde, **Spülbecken** und',
        '  **Abtropfbrett**, Tellerausgabe',
        '- In der Mitte: Schneidebrett, Mülleimer, Arbeitstisch',
        '- Quer hindurch: zwei Bahnen nach Süden — vier **Förderbänder**',
        '  (blau) im Osten, vier **Zugbänder** (orange) neben der Insel',
        '- Vorn: die Ausgabetheke mit den Wärmeschirmen darüber',
        '- Ganz im Süden: drei Gästetische und die **Geschirrrückgabe**',
        '- Im Osten: der Schauraum — jedes Möbel einmal, beschriftet',
        '',
        '## Ein Burger',
        '',
        '1. **Patty** an der Ausgabe holen und in die **Pfanne** auf dem Herd',
        '   legen. Der Balken darüber zeigt, wie weit es ist — und er läuft',
        '   weiter: Aus gebraten wird verbrannt, aus verbrannt wird Feuer.',
        '   **Verbranntes kommt auf keinen Burger mehr**, es gehört in den',
        '   Mülleimer.',
        '2. **Salat** und **Tomate** auf ein **Schneidebrett** legen. Es',
        '   schneidet von selbst, solange jemand davorsteht; wer weggeht,',
        '   findet den Fortschritt wieder, wo er ihn gelassen hat.',
        '3. Alles Fertige auf ein **Brötchen** oder einen **Teller** legen —',
        '   die Reihenfolge ist egal, und kombiniert wird überall: in der Hand,',
        '   auf der Zeile, am Brett, an der Ausgabe. Auf eine **Ausgabe** legt',
        '   man auch ab wie auf jede Arbeitsplatte — und einen Teller, den man',
        '   nicht mehr braucht, gibt man an der **Tellerausgabe** zurück.',
        '4. Der Burger kommt auf einen **Teller**, der Teller über die',
        '   **Ausgabetheke**. **Serviert wird nur mit Teller**: Teller und',
        '   Burger gehen zusammen hinaus, und an der Theke steht kurz, was es',
        '   geworden ist.',
        '',
        'Fünf Rezepte: Hamburger, Salatburger, Tomatenburger, Suppenburger,',
        'Burger Deluxe — wer etwas anderes zusammenstellt, serviert es als',
        '*Burger nach Art des Hauses*.',
        '',
        '## Der Abwasch',
        '',
        'Die Gäste an den Tischen im Süden lassen ihr Geschirr stehen. Dreckige',
        'Teller stapeln sich an der **Geschirrrückgabe** am Ostende der Reihe;',
        'von dort nimmt man sie und legt sie in das **Spülbecken**, und dort',
        'werden sie sauber. Das Becken läuft wie das Brett schneidet: solange',
        'jemand davorsteht. Nur wartet es **nicht** auf einen, der weggeht — wer',
        'zwischendurch etwas anderes tut, nimmt das Geschirr hinterher **erneut',
        'auf und setzt es nochmal ab**.',
        '',
        'Der Teller liegt dabei **schräg im Wasser**, mit der unteren Kante auf',
        'dem Beckenboden — daran sieht man von oben, dass gerade gespült wird.',
        'Neben dem Becken steht das **Abtropfbrett**: Dort sammeln sich bis zu',
        'vier saubere Teller, und wer einen holt, nimmt den obersten. Damit',
        'muss man nicht zu jedem Gericht erst spülen gehen.',
        '',
        '## Die beiden Bänder',
        '',
        'Was auf einem **Förderband** liegt (blaue Pfeile), schiebt es in',
        'Pfeilrichtung weiter, Kachel um Kachel, bis auf die Ablage am Ende.',
        'Wer quer durch die Küche tragen müsste, legt es stattdessen auf und',
        'geht schon vor.',
        '',
        'Ein **Zugband** (orange Pfeile) tut dasselbe und **holt sich obendrein',
        'von selbst**, was auf der Kachel dahinter liegt — am hellen Streifen',
        'an seiner Hinterkante sieht man, von wo. Dort muss kein Band stehen:',
        'Eine Arbeitsplatte, ein Schneidebrett, ein Gästetisch oder ein anderes',
        'Band wird für diesen Handgriff selbst zum Band.',
        '',
        'Solange es **frei** ist, merkt es sich beim Nachbarn vor, und der gibt',
        'dann nicht weiter: Was dort **liegen bleibt**, geht quer weg. Was schon',
        '**fährt**, fährt zu Ende, und ein **volles** Zugband hält niemanden auf',
        '— dann schiebt das Band wie immer. Vom Herd und aus der',
        'Löscherhalterung zieht es nichts (das ist Gerät, keine Ware), und was',
        'gerade unter dem Messer liegt, lässt es liegen.',
        '',
        'Beide lassen sich im **Umbau** aufheben und **drehen**: Der Auslöser',
        'dreht das getragene Möbel um eine Vierteldrehung weiter, und es zeigt',
        'schon in den Händen dorthin, wohin es nachher schiebt.',
        '',
        '## Wenn es brennt',
        '',
        'Ein vergessenes Patty qualmt erst (rotes Warndreieck) und brennt dann.',
        'Ein brennender Herd nimmt nichts mehr an: Den **Feuerlöscher** vom',
        'Hocker an der Westwand holen. Er wird **gehalten** und pustet, solange',
        'er an ist — von oben schaltet `A` ihn an und wieder aus, am Schirm aus',
        'der Ich-Sicht und in der Brille hält man die Taste. Damit auf das',
        'Feuer richten, bis es aus ist; ein Druck auf den Herd tut nichts mehr.',
        '',
        'Am Mülleimer fliegt weg, was auf dem Träger liegt — der Teller bleibt',
        'in der Hand. Topf, Pfanne und Feuerlöscher gehören nicht hinein.',
        '',
        '`A` nimmt, legt ab und legt zusammen; getragen wird mit beiden Händen',
        'vor dem Bauch. Was in der Hand liegt, lässt jede Ablage leuchten.',
        '',
        '---',
        '',
        '> Der Koch ist 1,60 m hoch. Der Tresen ist einen halben Meter hoch.',
        '> Genau dafür wurde er so skaliert.',
      ].join('\n'),
    },
  });
}

/**
 * **Welches Möbel welche Rolle spielt** — und alles, was hier nicht steht, ist
 * eine gewöhnliche Ablage (`KitchenPiece.worktop`).
 *
 * Eine Tabelle und keine Kette aus `if`: Sie ist die eine Stelle, an der ein
 * gekauftes Möbel zu einer Spielregel wird. Wer den Mülleimer gegen die Spüle
 * tauschen will, ändert genau eine Zeile.
 *
 * Die **Ausgaben** stehen nicht darin, und das ist der Unterschied zwischen
 * Möbel und Aufbau: Ob ein `serve-counter` Brötchen ausgibt oder bloß eine
 * Ablage vor der Theke ist, entscheidet `Spot.gives` — dasselbe Möbel steht in
 * dieser Küche in beiden Rollen. Dasselbe gilt seit dem Gastraum für den
 * Arbeitstisch (`Spot.role`): Er steht hier nicht, weil er dreierlei ist.
 *
 * **Die Spüle steht zweimal darin, weil sie zwei Möbel ist.** Im **Becken**
 * wird gespült: Wer einen dreckigen Teller hineinlegt, bekommt einen sauberen
 * heraus, und wie am Schneidebrett läuft es, solange jemand davorsteht. Auf dem
 * **Abtropfbrett** daneben stapeln sich die sauberen, bis zu vier
 * (`kitchenCarry.CLEAN_STACK_MAX`). Ein Möbel, das schon so heißt, braucht
 * dafür keine Zeile im Aufbau — ein Spülbecken ist überall ein Spülbecken,
 * anders als ein Tisch.
 *
 * **Und das Förderband genauso.** Es ist die einzige Sorte Möbel, die es nur
 * in dieser einen Rolle gibt: Ein Band, das nicht schiebt, ist ein schmales
 * Brett. Deshalb steht es hier und nicht in `Spot.role`.
 *
 * **Zwei Möbel, eine Rolle**: Das Zugband (`belt-pull`) ist für `A` dasselbe
 * wie das Förderband — eine Ablage, die weiterschiebt. Dass es sich obendrein
 * von selbst etwas holt, ist keine Sache des Anfassens, sondern der Bandrechnung
 * (`kitchenBelt.BeltTile.pull`), und eine zwölfte Stationsart wäre eine, die in
 * `kitchenDeed` neben `belt` stünde und Zeile für Zeile dasselbe täte.
 */
const STATION_KINDS: Readonly<Record<string, StationKind>> = {
  bin: 'bin',
  board: 'board',
  'stove-pan': 'stove',
  pass: 'serve',
  extinguisher: 'rack',
  'sink-basin': 'sink',
  'sink-drain': 'drain',
  belt: 'belt',
  'belt-pull': 'belt',
};

/**
 * **Was dieses Möbel an dieser Stelle ist** — oder `null`, wenn `A` daran
 * nichts bewirkt (das Ausgaberegal).
 *
 * Die Reihenfolge ist die Entscheidung, und sie läuft vom **Platz** zum
 * **Möbel**:
 *
 * 1. Steht am Platz eine `role`, gilt sie — **vor allem anderen**, auch vor
 *    `gives`. Sie ist das, was jemand an dieser einen Stelle ausdrücklich
 *    hingeschrieben hat, und wer sie überstimmen ließe, hätte ein Feld, das
 *    manchmal wirkt.
 * 2. Was ausgibt, ist eine **Ausgabe**, egal welches Möbel darunter steht.
 * 3. Danach zählt die Tabelle der Möbel, die immer dasselbe sind (Mülleimer,
 *    Brett, Herd mit Pfanne, Theke, Halterung, Spülbecken, Abtropfbrett,
 *    Förderband).
 * 4. Und alles, was im Katalog eine Arbeitsfläche ist, ist eine **Ablage**.
 *
 * Zwei Möbel wechseln damit ihre Rolle je nach Platz — der `serve-counter`
 * über `gives`, der `table` über `role` —, und genau dafür sind die beiden
 * Felder da.
 */
export function stationKind(
  name: string,
  gives?: KitchenItem,
  role?: StationKind,
): StationKind | null {
  if (role) return role;
  if (gives) return 'box';
  const kind = STATION_KINDS[name];
  if (kind) return kind;
  return kitchenPiece(name)?.worktop ? 'top' : null;
}

/** Die Namen, die dieser Aufbau benutzt — für den Test daneben. */
export const KITCHEN_USED: readonly string[] = KITCHEN_SPOTS.map((spot) => spot.name);

/** Und die, die er (noch) nicht benutzt — dieselbe Liste, andersherum gelesen. */
export function unusedKitchenPieces(): readonly string[] {
  return KITCHEN_PIECES.filter((piece) => !KITCHEN_USED.includes(piece.name)).map(
    (piece) => piece.name,
  );
}

/** Die Möbel, die der Schauraum einzeln zeigt — jedes genau einmal. */
export const KITCHEN_SHOWN: readonly string[] = KITCHEN_SPOTS.filter((spot) => spot.show).map(
  (spot) => spot.name,
);
