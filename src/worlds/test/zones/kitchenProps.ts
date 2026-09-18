import * as THREE from 'three';
import { PAN_BOWL, POT_BOWL, RACK_SLOTS, SINK_BOWL } from '../../../core/kitchenFit';
import { dinerHeight, dinerPiece } from '../../../core/dinerFit';
import { canLoadModels } from '../../../core/chefFit';
import { layered, type Dish, type KitchenItem } from './kitchenRecipes';

/**
 * **Was in der Küche auf dem Teller liegt** — jedes Gericht als Netz.
 *
 * **Der Tag ist gekommen.** In dieser Datei stand jahrelang der Satz: „Ein
 * Brötchen ist eine gedrückte Kugel, ein Patty eine Scheibe, eine Tomate eine
 * Kugel mit Strunk — und dafür eine zweite Quelldatei aufzunehmen, mit Lizenz,
 * Aufbereitung und Eintrag in `public/models/CREDITS.md`, wäre viel Aufwand
 * für ein Dutzend Zylinder. Wenn eines Tages ein Zutatensatz dazukommt,
 * ersetzt er genau diese Klasse." Der Zutatensatz ist da (_Restaurant Bits_,
 * `public/models/diner.glb`), und die Zylinder sind weg.
 *
 * **Acht Zutaten kommen heute als Netz** (`FOOD_NODE`) — Brötchen, Patty in
 * drei Zuständen, Salat ganz und geschnitten, Tomate ganz und geschnitten —,
 * dazu die beiden Hälften des aufgeschnittenen Brötchens. **Gebaut bleiben
 * vier Dinge**, und jedes aus eigenem Grund:
 *
 * - **Der Teller** und **der dreckige Teller**: An ihnen hängen der Stapel
 *   (`dirtyStack`), der Verdrehwinkel, die Reste darauf und die Maße, mit
 *   denen die Spüle rechnet (`core/kitchenFit.SINK_BOWL`) — fünf Zusagen an
 *   einem Zylinder, die kein fremdes Netz mitbringt.
 * - **Die Tomatensuppe**: Was der Baukasten dafür hätte, ist Pizzasoße — eine
 *   Pfütze von 78 cm, breiter als der ganze Teller. Auf einem Brötchen wäre
 *   das keine Zutat, sondern ein Tischtuch.
 * - **Das Wasser im Topf**: Es ist gar kein Gegenstand, sondern der Spiegel in
 *   einem Gefäß, dessen Maße im Möbelkatalog stehen (`POT_BOWL`).
 *
 * **Die Netze kommen vor den Möbeln.** `view` baut synchron — die Zone legt
 * ein Patty in dieselbe Bildfolge, in der sie es aus der Kiste nimmt —, ein
 * `GLTFLoader` tut das nicht. Also holt `warm()` die zehn Knoten **einmal**,
 * bevor die Zone ihr erstes Möbel hinstellt (`zones/kitchen.ts`), und `view`
 * klont danach nur noch. Solange das nicht geschehen ist, gibt `view` für eine
 * geladene Zutat `null` — derselbe Ausgang wie ohne Datei, und der Aufrufer
 * kennt ihn schon.
 *
 * **Ein Gericht ist ein `Dish` und kein Name mehr** (`kitchenRecipes.ts`), und
 * das ist die Änderung an dieser Datei: Früher gab es drei Einstiege — eine
 * Zutat, ein Burger aus einer Teileliste, eine Holzkiste —, und die Zone
 * musste wissen, welcher gerade gilt. Jetzt gibt es **einen**: `view(d)`
 * nimmt, was da ist (nackte Tomate, belegtes Brötchen, voller Teller) und gibt
 * das passende Netz. Die Zone fragt nicht mehr „ist das ein Burger?", sie
 * reicht durch, was sie ohnehin in der Hand hält. Die Holzkiste ist ganz weg:
 * Zutaten kommen jetzt aus einem Ausgabe-Möbel des Katalogs mit einem
 * gerenderten Icon an der Front (`kitchenIcon.ts`).
 *
 * **Was hier `null` ist, kommt vom Möbel.** Topf, Pfanne und
 * Feuerlöscher stecken im Möbelnetz und werden von dort abgenommen
 * (`core/kitchenModel.takeUtensil`) — sie nachzubauen hieße, zwei Pfannen zu
 * pflegen, von denen eine schlechter aussieht. Damit trotzdem ein Patty **in**
 * der Pfanne liegen kann, gibt es `topping`: nur den Belag, zum Anhängen an
 * ein fremdes Netz. **Das Wasser im Topf geht denselben Weg**: Der Topf kommt
 * aus dem Modell, das Wasser darin baut dieser Satz und hängt es hinein
 * (`WATER_LOOK`, `water()`).
 *
 * **Und seit es die Spüle gibt, baut dieser Satz auch Geschirr, das schmutzig
 * ist.** Der dreckige Teller ist derselbe Teller mit Resten darauf, und der
 * Stapel an der Rückgabe (`dirtyStack`) ist eine Handvoll davon übereinander.
 * Beides gehört hierher und nicht in die Zone: Es ist gebaute Zutat wie alles
 * andere in dieser Datei, es teilt sich Formen und Farben mit dem sauberen
 * Teller, und es ist genau so hoch wie er.
 *
 * **Warum eine Klasse und keine Funktionen.** Aus einer Ausgabe kommt beliebig
 * oft ein Brötchen (`kitchenCarry.kitchenDeed`, `box`), und jedes davon hatte
 * einmal seine **eigenen** Materialien: Wer zehn Minuten Brötchen nimmt und
 * wegwirft, sammelte zwanzig Materialien an, die erst beim Verlassen der Zone
 * freigegeben wurden. Hier hängen Farben und Formen an **einem** Satz, der
 * geteilt und einmal weggeräumt wird (`dispose`) — dieselbe Entscheidung wie
 * beim Möbellader, der Geometrie und Material zwischen allen Tresen teilt
 * (`core/kitchenModel.ts`). **Und seit die Zutaten Netze sind, gilt das für
 * sie doppelt**: Ein Klon teilt Geometrie und Material mit seiner Vorlage, und
 * die Vorlage hängt am Satz.
 */

/**
 * **Welche Zutat auf welchem Knoten steht** — die einzige Stelle, die beide
 * Namen kennt.
 *
 * Links stehen die Namen des Spiels (`kitchenRecipes.KitchenItem`), rechts die
 * der Quelle (`core/dinerFit.ts`, aufbereitet von `tools/diner-model.mjs`).
 * Dass sie auseinanderlaufen, ist Absicht und kein Schönheitsfehler: Das rohe
 * Patty heißt in der Quelle `burger_uncooked` und das verbrannte `burger_trash`
 * — Wörter eines fremden Baukastens, die in keiner Regel dieser Küche etwas zu
 * suchen haben.
 *
 * **Was hier fehlt, baut der Satz selbst**: Tomatensuppe und Wasser (siehe der
 * Block oben, warum).
 */
export const FOOD_NODE = {
  plate: 'plate',
  'plate-dirty': 'plate_dirty',
  bun: 'food_ingredient_bun',
  patty: 'food_ingredient_burger_uncooked',
  'patty-cooked': 'food_ingredient_burger_cooked',
  'patty-burnt': 'food_ingredient_burger_trash',
  lettuce: 'food_ingredient_lettuce',
  'lettuce-cut': 'food_ingredient_lettuce_slice',
  tomato: 'food_ingredient_tomato',
  'tomato-cut': 'food_ingredient_tomato_slice',
} as const satisfies Partial<Record<KitchenItem, string>>;

/**
 * **Und die beiden Hälften des aufgeschnittenen Brötchens.**
 *
 * Sie stehen nicht in `FOOD_NODE`, weil sie keine Zutat sind: Niemand nimmt
 * einen Brötchendeckel in die Hand, und in keinem Rezept steht einer. Sie sind
 * die zwei Teile, in die das **eine** Brötchen zerfällt, sobald etwas
 * dazwischen liegt — und die Quelle hat für beide ein Netz, das zum ganzen
 * passt: `bun_bottom` plus `bun_top` sind auf den Zehntelmillimeter so hoch
 * wie `bun` (10,00 cm + 15,36 cm = 25,36 cm). Ein aufgeschnittenes Brötchen
 * ohne Belag ist damit genau so hoch wie ein ganzes, und genau das rechnet
 * `stackHeight` nach.
 */
const BUN_BOTTOM_NODE = 'food_ingredient_bun_bottom';
const BUN_TOP_NODE = 'food_ingredient_bun_top';

/** Alles, was `warm()` aus `public/models/diner.glb` holt — zehn Knoten. */
const FOOD_NODES: readonly string[] = [...Object.values(FOOD_NODE), BUN_BOTTOM_NODE, BUN_TOP_NODE];

/**
 * **Wie hoch ein Knoten der Quelle ist**, in Metern — nachgemessen und nicht
 * hier aufgeschrieben.
 *
 * `dinerHeight` und nicht `piece.height`: Der Salat und die Salatscheibe
 * liegen ein paar Millimeter **unter** ihrem Ursprung (`DinerPiece.foot`), und
 * wer das unterschlägt, bekommt eine Zutat, die flacher gestapelt wird, als
 * sie ist. Null für einen Namen, den es nicht gibt — dann fehlt oben ein
 * Eintrag, und das sieht man am Stapel und nicht an einem Absturz.
 */
function nodeHeight(node: string): number {
  const piece = dinerPiece(node);
  return piece ? dinerHeight(piece) : 0;
}

/**
 * **Wie breit ein Brötchen ist**, als Halbmesser in Metern — die eine Zahl,
 * die dieser Satz vom Brötchen noch selbst braucht.
 *
 * Nicht mehr gewählt, sondern **abgelesen**: 17,5 cm, die halbe Grundfläche
 * des Netzes (`dinerFit`, `food_ingredient_bun.span`). Gebaut wird daraus
 * nichts mehr; sie ist das Maß, an dem sich die Tomatensuppe orientiert, die
 * als einzige Zutat gebaut geblieben ist — eine Zutat, die auf einem Brötchen
 * liegt, misst sich an dem Brötchen und nicht an einer runden Zahl.
 */
const BUN_RADIUS = (dinerPiece(FOOD_NODE.bun)?.span[0] ?? 0.35) / 2;

/** Und wie hoch es aufträgt — ganz, ungeschnitten, so wie es aus der Kiste kommt. */
export const BUN_HEIGHT = nodeHeight(FOOD_NODE.bun);

/**
 * **Der Boden des aufgeschnittenen Brötchens** und **sein Deckel** — zwei
 * Netze für das eine, das aufgeschnitten wird.
 *
 * Ein belegtes Brötchen ist nicht dasselbe Netz wie ein ganzes: Unten liegt
 * der Boden, darauf der Belag, darüber der Deckel. Zusammen sind die beiden
 * genau so hoch wie das ganze (siehe `BUN_BOTTOM_NODE`) — der Belag ist
 * damit die ganze Zunahme, und ein Burger wächst um genau das, was man
 * hineinlegt.
 */
export const BUN_BASE = nodeHeight(BUN_BOTTOM_NODE);
export const BUN_DOME = nodeHeight(BUN_TOP_NODE);

/**
 * **Der Teller** — jetzt geladen und nicht mehr nachgebaut, und deshalb stehen
 * hier zwei abgelesene Zahlen statt zweier gewählter.
 *
 * Er war ein Zylinder von 0,75 m, und diese Zahl hatte ihren Grund: Sie war am
 * Teller **auf der Tellerausgabe** des ersten Baukastens nachgemessen, den man
 * nicht herauslösen konnte, ohne das Möbel ohne Teller zu hinterlassen. Dieses
 * Möbel gibt es nicht mehr; der zweite Baukasten hat einen freistehenden
 * Teller (`plate`, 0,475 m breit und 0,05 m hoch), und der ist seitdem der
 * Teller dieser Küche.
 *
 * **Halbmesser und Höhe stehen im Katalog** (`core/dinerFit.ts`) und werden
 * hier nur gelesen: Wer die Quelle austauscht, misst an **einer** Stelle nach.
 * Gebraucht werden beide von mehr als dieser Datei — der Griff am Tellerrand
 * (`kitchenGrab.ts`), die Luft unter dem Wärmeschirm
 * (`kitchenPlan.RACK_AIR`), die Lage im Becken (`SINK_TILT`).
 */
export const PLATE_RADIUS = (dinerPiece(FOOD_NODE.plate)?.span[0] ?? 0.475) / 2;
export const PLATE_HEIGHT = nodeHeight(FOOD_NODE.plate);

/**
 * **Wie schräg ein Teller im Spülbecken liegt**, im Bogenmaß — 0,1923, also
 * **11,1°**.
 *
 * Er lag vorher flach, und das war aus zwei Gründen falsch. Der eine ist der
 * Auftraggeber: „Wenn Teller gewaschen werden, sollen die Teller leicht schräg
 * sein, sodass ein Teil davon im Wasser steht." Der andere ist die Messung: Ein
 * Teller ist **0,75 m** breit (`PLATE_RADIUS`), die Beckenöffnung nur
 * 0,81 × 0,64 m (`core/kitchenFit.SINK_BOWL`) — flach passt er gar nicht
 * hinein, er läge quer über dem Rand, und im Wasser stünde nichts von ihm.
 *
 * **Der Winkel ist deshalb ausgerechnet und nicht gewählt.** Der Teller lehnt
 * so, dass seine **untere Kante auf dem Beckenboden** aufsetzt und seine
 * **obere auf Randhöhe** endet — er überspannt also genau die Beckentiefe:
 *
 * `sin α = (rim − floor) / 2 / PLATE_RADIUS = 0,1442 / 2 / 0,375 = 0,1923`
 *
 * Die Hälfte der Tiefe steht dabei, weil sich der Teller um seine **Mitte**
 * neigt: Die eine Kante geht um `r · sin α` herunter, die andere um ebenso viel
 * herauf. Und weil das Wasser auf halber Tiefe steht (`SINK_BOWL.water`), liegt
 * damit genau die **untere Hälfte** des Tellers darin — „ein Teil davon", und
 * zwar ein gut sichtbarer.
 *
 * **Gekippt wird um die x-Achse**, also nach vorn und hinten: Die vordere Kante
 * taucht ein, die hintere steht auf. Das ist die Richtung, in der man ihn aus
 * der Hauptansicht (55° von oben, `core/topDownPose.TOP_DOWN_TILT`) auch sieht
 * — die Tellerfläche dreht sich dabei zur Kamera hin statt von ihr weg. Was
 * dabei über die Beckenkante hinausragt (in z 0,75 m gegen 0,64 m Öffnung),
 * liegt **unter** dem Rand und steckt in ihm; von außen sieht man einen
 * Teller, den die Kante überdeckt, und kein Loch.
 */
export const SINK_TILT = Math.asin((SINK_BOWL.rim - SINK_BOWL.floor) / 2 / PLATE_RADIUS);

/**
 * **Der dreckige Teller** ist heute ein eigenes Netz und kein gestauchter
 * sauberer mehr.
 *
 * Er muss **in der Hauptansicht** vom sauberen zu unterscheiden sein, und die
 * schaut aus 55° von oben (`core/topDownPose.TOP_DOWN_TILT`). Von dort ist ein
 * Teller eine helle Scheibe und sonst nichts, und Farbe allein trägt nicht:
 * Angegrautes Porzellan neben weißem ist im Schatten des Ausgaberegals
 * derselbe Grauton wie weißes Porzellan in der Sonne.
 *
 * Diese Küche hat das mit fünf gebauten Krümeln und einem Soßenfleck gelöst —
 * kantig gegen die runde Scheibe, dunkel gegen das Porzellan, auf einer
 * Spirale im goldenen Winkel verteilt, damit sie nach Zufall aussehen und
 * nicht nach Zierrand. Der Baukasten löst es genauso und besser
 * (`plate_dirty`: fünf Reste auf demselben Tellerkörper), also ist von diesen
 * dreißig Zeilen eine Zeile in `FOOD_NODE` geblieben.
 *
 * **Gleich hoch wie der saubere Teller** ist er weiterhin, und das ist keine
 * Schönheit, sondern Pflicht: An der Rückgabe stapeln sich die Dinger
 * (`FoodKit.dirtyStack`), und ein Stapel rechnet mit `ITEM_HEIGHT`. Die Quelle
 * hält sich daran von selbst — beide Netze sind 0,05 m hoch, die Reste stecken
 * **im** Teller und sitzen nicht darauf.
 */

/**
 * **Wie viele dreckige Teller ein Stapel höchstens hat** — sechs, und die Zahl
 * ist von zwei Seiten gerechnet.
 *
 * - **Von oben**: Jeder Teller ist gegen den vorigen verdreht (`DIRTY_TWIST`),
 *   und daran zählt man sie. Bei 13° je Lage stehen der unterste und der
 *   sechste 65° gegeneinander; was darüber hinausgeht, sieht aus wie ein
 *   aufgefächertes Kartenspiel und nicht mehr wie ein Stapel.
 * - **Von vorn**: Sechs Teller sind 6 × 0,05 = **0,30 m**. Die Rückgabe ist
 *   ein Arbeitstisch von 0,50 m (`core/kitchenFit.KITCHEN_PIECES`, `table`),
 *   die Oberkante des Stapels liegt damit bei 0,80 m — genau auf halber Höhe
 *   der Figur (1,60 m, `core/chefFit.CHEF_HEIGHT`), also auf Brusthöhe. Ein
 *   siebter Teller stünde ihr vor dem Gesicht und verdeckte, was hinter der
 *   Rückgabe steht.
 */
export const DIRTY_STACK_MAX = 6;

/**
 * **Wie weit jeder Teller gegen den vorigen verdreht ist**, im Bogenmaß.
 *
 * Ein Stapel aus exakt fluchtenden Zylindern ist von oben **ein** Teller —
 * dasselbe Problem wie beim Häufchen aus drei Scheiben (`slices`), und
 * dieselbe Antwort. 13° sind dabei kein runder Ersatz für 15°, sondern knapp
 * darunter gewählt: Der Teller ist ein 24-Eck, eine Seite also genau 15°. Bei
 * 15° deckte sich jede Kante mit der darunter, und der Stapel stünde wieder
 * exakt in Flucht; bei 13° wandert sie in jeder Lage sichtbar weiter, und über
 * einen vollen Stapel (fünf Lagen Abstand, 5 × 13° = 65°) kommt keine Kante
 * ein zweites Mal auf dieselbe Stelle.
 */
const DIRTY_TWIST = (13 * Math.PI) / 180;

/**
 * **Die drei Zustände des Pattys sind gleich hoch** — je einen Zentimeter, und
 * das ist nicht mehr unsere Entscheidung.
 *
 * Gebaut war das Patty roh am dicksten (9 cm) und verbrannt am flachsten
 * (6 cm): Ein Zylinder, der beim Braten schrumpft, war das einzige Mittel, mit
 * dem sich drei Scheiben derselben Farbe unterscheiden ließen. Die Netze der
 * Quelle brauchen es nicht — roh ist rosa, gebraten braun, verbrannt schwarz
 * mit aufgerissener Oberfläche —, und sie sind alle drei exakt gleich hoch.
 *
 * **Das ist ein Gewinn und kein Verlust.** Ein Stapel, dessen Höhe sich beim
 * Braten ändert, musste bei jeder Verwandlung neu gerechnet werden
 * (`zones/kitchen.restyle`); jetzt bleibt ein Burger so hoch, wie er war, und
 * wechselt nur die Farbe.
 */

/**
 * **Die Tomatensuppe ohne Topf** — eine Pfütze mit einem Häufchen darin.
 *
 * Suppe ist die zweite Schnittstufe der Tomate (`kitchenRecipes.CHOPS`) und
 * damit eine **Burgerzutat**: Sie liegt auf dem Brett, wandert in die Hand und
 * am Ende zwischen Patty und Haube. Ein Topf ist dafür genau das Falsche — er
 * käme aus dem Möbelmodell, ließe sich nicht stapeln, und ein Brötchen mit
 * einem Topf darin wäre kein Suppenburger, sondern ein Witz. Was von passierter
 * Tomate übrig bleibt, wenn man den Topf wegnimmt, ist ihre **Form**: breit
 * zerlaufen, in der Mitte aufgehäuft, glänzend statt matt. Breiter als jede
 * Scheibe und flacher als sie, damit man sie auch im Stapel erkennt.
 */
const SOUP_RADIUS = BUN_RADIUS * 0.86;
const SOUP_POOL = 0.045;
const SOUP_HEAP = 0.03;

/**
 * **Das Wasser im Topf** — ein Körper und keine Haut.
 *
 * Es ist so hoch, wie das Wasser im Topf **tief** steht: vom Innenboden bis zum
 * Spiegel, beides gemessen (`core/kitchenFit.POT_BOWL`, 0,1646 − 0,0247 =
 * **13,99 cm**). Damit ist es ein Stück wie jedes andere in dieser Datei — Fuß
 * auf `y = 0`, Höhe gleich `ITEM_HEIGHT` —, und der Aufrufer setzt es mit
 * derselben einen Zeile an seinen Platz wie das Patty in die Pfanne
 * (`FoodKit.topping`, gehoben um `POT_BOWL.floor`).
 *
 * **Eine Scheibe wäre kürzer und wäre falsch.** Eine Ebene wie im Becken ist
 * dort richtig, weil die Beckenmulde selbst blau unterlegt sein soll und man
 * nur von oben hineinsieht. In den Topf sieht man ebenfalls von oben — aber ein
 * Stück, dessen Höhe nicht seine Höhe ist, bräuchte an der Hebestelle eine
 * Subtraktion („Spiegel minus Dicke"), und genau solche Rechnungen sind es, die
 * beim nächsten Gefäß danebengehen. Ein Körper rechnet sich selbst.
 *
 * Der Halbmesser ist der gemessene Innenradius abzüglich Sicherheitsabstand
 * (`POT_BOWL.radius`) — warum genau dieser, steht dort.
 */
const WATER_DEEP = POT_BOWL.water - POT_BOWL.floor;

/** Die eine Farbe, die von allem Gebauten blieb: die der Tomatensuppe. */
const SOUP = 0xb02a18;

/** Wie matt etwas ist — Essen schluckt Licht, Suppe wirft es zurück. */
const MATTE = 0.85;
const WET = 0.32;

/**
 * **Wie Wasser in dieser Küche aussieht** — ein Ton, eine Durchsichtigkeit,
 * eine Rauheit, und zwar für **beide** Wasser.
 *
 * Es gab dieses Wasser zuerst nur im Spülbecken, und es wurde dort in der Zone
 * gebaut (`worlds/test/zones/kitchen.addWater`), weil es am Möbel hängt und im
 * Baumodus mitfährt. Seit der Topf am Hahn gefüllt wird, gibt es ein zweites —
 * und zwei Wasser mit zwei Blautönen wären zwei Wasser: Im Bild stünde der Topf
 * mit dem einen neben dem Becken mit dem anderen, und man hielte es für zwei
 * Flüssigkeiten. Also stehen die Werte hier, wo ohnehin alle Farben dieser
 * Küche stehen, und beide Stellen lesen sie.
 *
 * Die Zahlen selbst sind die des Beckens und unverändert: **nicht** so
 * durchsichtig, dass man den Blechboden darunter sähe — dann wäre es eine blaue
 * Folie —, und **nicht** rau, weil eine ruhige Fläche spiegelt.
 */
export const WATER_LOOK = {
  color: 0x2e7ba6,
  opacity: 0.78,
  roughness: 0.12,
  metalness: 0.2,
} as const;

/**
 * **Wie hoch jede Zutat für sich aufträgt**, in Metern.
 *
 * Keine Zahl darin ist abgeschrieben: Was geladen wird, holt seine Höhe aus
 * dem nachgemessenen Katalog der Quelle (`nodeHeight`), was gebaut wird, aus
 * denselben Maßen, aus denen seine Geometrie entsteht. Eine abgeschriebene
 * Zahl wäre die eine, die beim nächsten Austausch der Quelle stehen bleibt.
 *
 * Was aus dem Möbelmodell kommt, steht mit **0** darin: Es trägt hier nichts
 * auf, weil es hier gar nicht gebaut wird.
 */
export const ITEM_HEIGHT: Record<KitchenItem, number> = {
  pot: 0,
  pan: 0,
  extinguisher: 0,
  plate: PLATE_HEIGHT,
  // **Genau so hoch wie der saubere.** Die Krümel stecken im Teller und sitzen
  // nicht darauf (siehe `DIRTY_DISH`) — nur deshalb rechnet ein Stapel aus
  // beiderlei Geschirr mit einer Zahl.
  'plate-dirty': PLATE_HEIGHT,
  // **Die acht geladenen Zutaten sind nachgemessen und nicht gerechnet.** Ihre
  // Höhe ist die ihres Netzes (`FOOD_NODE`, `core/dinerFit.ts`), und sie steht
  // hier, weil Jest kein Netz laden kann, aber jede Regel dieser Küche mit
  // Höhen rechnet — der Katalog ist die Brücke zwischen beidem.
  bun: BUN_HEIGHT,
  patty: nodeHeight(FOOD_NODE.patty),
  'patty-cooked': nodeHeight(FOOD_NODE['patty-cooked']),
  'patty-burnt': nodeHeight(FOOD_NODE['patty-burnt']),
  lettuce: nodeHeight(FOOD_NODE.lettuce),
  'lettuce-cut': nodeHeight(FOOD_NODE['lettuce-cut']),
  tomato: nodeHeight(FOOD_NODE.tomato),
  'tomato-cut': nodeHeight(FOOD_NODE['tomato-cut']),
  'tomato-soup': SOUP_POOL + SOUP_HEAP,
  // Wasser steht **im** Topf und liegt auf nichts — es trägt trotzdem eine
  // Höhe, weil sie dieselbe Zahl ist, mit der sein Netz gebaut wird. Auf einem
  // Stapel taucht es nie auf: Kein Träger nimmt es an
  // (`kitchenRecipes.TAKES`).
  water: WATER_DEEP,
};

/** Was nicht gebaut, sondern aus dem Möbelmodell genommen wird. */
const FROM_MODEL: readonly KitchenItem[] = ['pot', 'pan', 'extinguisher'];

/** Ob dieses Ding aus `core/kitchenModel.takeUtensil` kommt und nicht von hier. */
export function fromModel(item: KitchenItem): boolean {
  return FROM_MODEL.includes(item);
}

/**
 * **Der Name des Belagnetzes** — damit die Zone es an einem geladenen Netz
 * wiederfindet und abnehmen kann, ohne sich eine Referenz zu merken.
 */
export const STACK_NAME = 'kitchen-stack';

/**
 * **Wie hoch ein Stapel Zutaten aufträgt** — dieselbe Rechnung, die `pile`
 * baut, nur ohne Netz.
 *
 * Drei Fälle, und der mittlere ist der, den man vergisst: Ohne Brötchen liegen
 * die Scheiben einfach übereinander; ein Brötchen **ohne** Belag ist gar nicht
 * aufgeschnitten und damit nur so hoch wie es selbst; erst ein belegtes
 * Brötchen ist Boden **plus** Belag **plus** Haube.
 */
export function stackHeight(items: readonly KitchenItem[]): number {
  const rest = items.filter((item) => item !== 'bun');
  const filling = rest.reduce((sum, item) => sum + ITEM_HEIGHT[item], 0);
  if (!items.includes('bun')) return filling;
  if (!rest.length) return BUN_HEIGHT;
  // Boden plus Belag plus Deckel — und weil Boden und Deckel zusammen das
  // ganze Brötchen ergeben, ist ein belegtes genau um seinen Belag höher als
  // ein unbelegtes.
  return BUN_BASE + filling + BUN_DOME;
}

/**
 * **Der Zutatensatz einer Küche** — alle Formen, alle Farben, ein `dispose`.
 *
 * Ein Satz je Zone, und alles, was er ausgibt, teilt sich seine Materialien
 * und seine Geometrien. Was er nicht kennt, gibt er als `null` zurück: Topf,
 * Pfanne und Feuerlöscher kommen aus dem Möbelmodell
 * (`core/kitchenModel.takeUtensil`) und nicht von hier.
 */
export class FoodKit {
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>();
  private readonly shapes = new Map<string, THREE.BufferGeometry>();
  /** Die geladenen Vorlagen, eine je Knoten — geklont, nie herausgegeben. */
  private readonly nodes = new Map<string, THREE.Object3D>();
  /** Der eine Ladelauf; ein zweiter Aufruf hängt sich an denselben. */
  private warming: Promise<void> | null = null;

  /**
   * **Die zehn Zutatennetze holen** — einmal je Zone, und zwar **bevor** die
   * Zone etwas davon braucht.
   *
   * Der Rest dieser Klasse ist synchron, und das ist keine Bequemlichkeit: Ein
   * Patty wird in derselben Bildfolge gebaut, in der jemand danach greift
   * (`zones/kitchen.make`), und ein Bild einer Vorratskiste wird in derselben
   * gebacken, in der die Kiste hingestellt wird (`zones/kitchen.addIcon`, und
   * der Ofen behält, was er einmal gebacken hat). Ein `await` an einer dieser
   * Stellen wäre eine leere Hand und ein leeres Schild.
   *
   * Also hier, an **einer** Stelle, vor allem anderen. Die Zone ruft es im
   * selben Lauf auf, in dem sie ihre Möbel lädt — beide Dateien liegen dann
   * ohnehin schon im Netz-Zwischenspeicher des Browsers.
   *
   * **Ohne WebGL passiert gar nichts** (`core/chefFit.canLoadModels`): In Jest
   * bringt `GLTFLoader` samt `import.meta` den Lauf zum Stehen, und was diese
   * Klasse dort noch beantwortet — Höhen, Stapel, Rezepte —, braucht kein Netz.
   */
  async warm(): Promise<void> {
    this.warming ??= this.load();
    await this.warming;
  }

  private async load(): Promise<void> {
    if (!canLoadModels()) return;
    const { dinerModel } = await import('../../../core/dinerModel');
    for (const node of FOOD_NODES) {
      const model = await dinerModel(node);
      // Ein fehlender Knoten ist kein Abbruch: Dann fehlt genau diese Zutat,
      // und der Rest der Küche läuft weiter (`view` gibt dafür `null`).
      if (model) this.nodes.set(node, onFoot(model));
    }
  }

  /**
   * **Ein Gericht als Netz** — Träger samt Belag, der Ursprung auf seinem Fuß,
   * die Mitte auf `x/z = 0`.
   *
   * Derselbe Ursprung wie bei jedem Möbel und bei jedem abgenommenen Gerät
   * (`core/kitchenModel.takeUtensil`): **unten in der Mitte**. Damit legt die
   * Küche alles, was sie zeigt, mit derselben Zeile ab und muss sich nicht je
   * Ding erinnern, wo dessen Null liegt.
   *
   * Es gibt vier Fälle, und sie stehen alle in einem `Dish`:
   *
   * - **nackte Zutat** (`dish('tomato')`) — das Stück für sich,
   * - **belegtes Brötchen** (`dish('bun', ['patty-cooked'])`) — Boden, Belag,
   *   Haube; ohne Belag ein ganzes, ungeschnittenes Brötchen,
   * - **voller Teller** (`dish('plate', ['bun', 'patty-cooked'])`) — der
   *   Teller und darauf das Gericht. `Dish.on` ist **flach**: Liegt ein
   *   Brötchen darin, gehört alles Übrige **hinein** und nicht daneben — sonst
   *   läge das Patty neben dem Burger auf dem Porzellan.
   * - **Gerät** (`dish('pan', ['patty'])`) — `null`, siehe `topping`.
   */
  view(d: Dish): THREE.Object3D | null {
    if (fromModel(d.item)) return null;
    if (d.item === 'plate') {
      const dish = this.piece('plate');
      if (!dish) return null;
      const plate = new THREE.Group();
      plate.name = 'kitchen-dish-plate';
      plate.add(dish);
      const food = this.topping(d, PLATE_HEIGHT);
      if (food) plate.add(food);
      return plate;
    }
    // Das Brötchen ist die unterste Schicht seines eigenen Burgers
    // (`kitchenRecipes.contentsOf`) — deshalb geht es mit in den Stapel und
    // nicht darunter. Alles andere trägt nichts (`kitchenRecipes.TAKES`).
    if (d.item === 'bun') return this.pile([d.item, ...d.on]);
    return this.piece(d.item);
  }

  /**
   * **Nur der Belag eines Gerichts**, zum Anhängen an ein geladenes Netz —
   * das Patty in der Pfanne, das Essen auf einem Teller aus dem Modell.
   *
   * `lift` ist die Höhe, auf der der Belag **aufsitzt**, gemessen im Raum des
   * Netzes, an das er gehängt wird: bei der Pfanne die Innenkante, beim Teller
   * dessen Rand. Wer sie falsch angibt, sieht es sofort — das Patty steckt im
   * Pfannenboden oder schwebt darüber —, und genau deshalb gibt der Satz sie
   * nicht selbst vor: Wie hoch der Rand einer **geladenen** Pfanne liegt, weiß
   * nur, wer sie gemessen hat (`core/kitchenModel.looseHeight`).
   *
   * Gibt `null`, wenn nichts darauf liegt. Das Netz heißt `STACK_NAME`, damit
   * es sich am fremden Träger wiederfinden und abnehmen lässt.
   *
   * **Und in der Pfanne rückt der Belag zur Seite** (`kitchenFit.PAN_BOWL`).
   * Das ist die einzige Stelle, an der ein Belag nicht auf `x/z = 0` sitzt, und
   * sie hat einen gemessenen Grund: Der Ursprung der abgenommenen Pfanne liegt
   * in der Mitte aus Mulde **und Stiel**, also 22,5 cm neben der Mulde. Ein
   * Patty auf der Null des Trägers lag deshalb halb auf dem Griff — sichtbar
   * schief, und zwar in jeder Ansicht. Die Zahl steht im Katalog und nicht
   * hier: Sie ist an der Quelldatei gemessen wie `align` und `deck`, und dieser
   * Satz hier baut nur, was auf ihr liegt.
   *
   * Ein Teller bekommt den Versatz **nicht** — er ist rund und hat keinen
   * Griff, und sein Ursprung ist seine Mitte.
   */
  topping(d: Dish, lift = 0): THREE.Object3D | null {
    if (!d.on.length) return null;
    const stack = this.pile(d.on);
    if (!stack) return null;
    const [dx, dz] = d.item === 'pan' ? PAN_BOWL : [0, 0];
    stack.position.set(dx, lift, dz);
    return stack;
  }

  /**
   * **Ein Stapel dreckiger Teller** — `count` Stück übereinander, Fuß auf
   * y = 0.
   *
   * Das ist, was an der **Geschirrrückgabe** steht
   * (`kitchenPlan.KITCHEN_SPOTS`, `role: 'return'`): Die Gäste lassen ihr
   * Geschirr an den Tischen, es wandert zur Rückgabe, und dort wächst ein
   * Turm, an dem man auf einen Blick sieht, wie viel Arbeit wartet. Genau
   * dafür ist es **ein** Netz aus `count` Tellern und nicht `count` einzeln
   * abgelegte Gerichte: Der Stapel ist eine Anzeige und keine Ablage.
   *
   * `count` wird auf **1 bis `DIRTY_STACK_MAX`** geklemmt (siehe dort, warum
   * sechs). Null Teller wären ein leerer Sockel, den man für ein Möbel hält;
   * wer keinen Stapel will, baut keinen.
   *
   * Jeder Teller sitzt `PLATE_HEIGHT` über dem vorigen — dieselbe Zahl, mit
   * der `ITEM_HEIGHT` rechnet, also ist der Stapel genau
   * `count × PLATE_HEIGHT` hoch — und ist um `DIRTY_TWIST` gegen ihn verdreht,
   * damit er von oben als Stapel zu erkennen ist und nicht als **ein** Teller.
   */
  dirtyStack(count: number): THREE.Object3D {
    return this.plateStack(
      count,
      DIRTY_STACK_MAX,
      () => this.piece('plate-dirty'),
      'kitchen-dirty-stack',
    );
  }

  /**
   * **Die Teller im Abtropfgitter** — `count` Stück **hochkant** in seinen
   * Fächern, nicht übereinander (`core/kitchenFit.RACK_SLOTS`).
   *
   * Der Unterschied zum Stapel an der Rückgabe ist der ganze Sinn des Möbels:
   * Ein Gitter hält Teller **auf der Kante**, damit das Wasser abläuft, und
   * genau so zeichnet der Baukasten es auch (`dishrack_plates`). Vier Fächer,
   * vier Teller, 10 cm auseinander, 80° schräg — alle vier Zahlen sind an
   * jenem Netz abgelesen, damit unsere einzeln hineingestellten Teller
   * dasselbe Bild ergeben wie das gezeichnete volle Gitter.
   *
   * **Die Sorte steht dabei nicht fest**: In ein leeres Gitter darf beides,
   * und was drinsteht, sieht man ihm an (`kitchenCarry.inRack`). Deshalb
   * nimmt diese Zeile den Namen der Zutat entgegen und entscheidet ihn nicht
   * selbst.
   *
   * Der Ursprung der Gruppe ist die **Ablagehöhe** des Möbels
   * (`core/kitchenFit.kitchenDeck`) in der Mitte seiner Kachel — dorthin setzt
   * die Zone sie (`kitchen.setStack`).
   */
  rackPlates(count: number, item: KitchenItem): THREE.Object3D {
    const want = Math.round(count);
    const plates = Number.isNaN(want) ? 1 : Math.min(RACK_SLOTS.count, Math.max(1, want));
    const rack = new THREE.Group();
    rack.name = 'kitchen-rack-plates';
    for (let i = 0; i < plates; i++) {
      // Dasselbe wie beim Stapel: Das **Fach** entsteht immer, das Netz kommt
      // hinein, wenn es da ist.
      const slot = new THREE.Group();
      slot.name = 'kitchen-rack-fach';
      slot.rotation.x = RACK_SLOTS.tilt;
      slot.position.set(0, RACK_SLOTS.lift, RACK_SLOTS.first + i * RACK_SLOTS.step);
      const plate = this.piece(item);
      if (plate) {
        // Gedreht wird um die Querachse, und der Ursprung eines Tellers ist
        // seine Unterseite — nach der Drehung läge die neben der Fachmitte.
        // Eine halbe Tellerhöhe tiefer gehängt, dreht er sich um sich selbst.
        plate.position.y = -PLATE_HEIGHT / 2;
        slot.add(plate);
      }
      rack.add(slot);
    }
    return rack;
  }

  private plateStack(
    count: number,
    most: number,
    one: () => THREE.Object3D | null,
    name: string,
  ): THREE.Object3D {
    // Geklemmt und nicht geprüft: `count` kommt aus einem Zähler, der auch
    // einmal danebenliegen darf — eine Ausnahme dafür zu werfen hieße, eine
    // Küche wegen eines Tellers zu viel anzuhalten. `NaN` fällt dabei durch
    // jeden Vergleich, also wird es vorher abgefangen.
    const want = Math.round(count);
    const plates = Number.isNaN(want) ? 1 : Math.min(most, Math.max(1, want));
    const stack = new THREE.Group();
    stack.name = name;
    for (let i = 0; i < plates; i++) {
      // **Eine Lage ist eine Gruppe, auch wenn ihr Netz fehlt.** Der Stapel ist
      // eine Rechnung — Lagenhöhe, Verdrehwinkel, Klemmung —, und die gilt
      // auch ohne geladene Datei. Wer erst das Netz holte und bei `null`
      // abbräche, hätte in Jest einen Stapel aus null Lagen und damit keine
      // Rechnung mehr zu prüfen (`kitchenProps.test.ts`).
      const layer = new THREE.Group();
      layer.name = `${name}-lage`;
      layer.position.y = i * PLATE_HEIGHT;
      layer.rotation.y = i * DIRTY_TWIST;
      const plate = one();
      if (plate) layer.add(plate);
      stack.add(layer);
    }
    return stack;
  }

  /**
   * **Wie hoch das aufträgt, was dieser Satz für dieses Gericht baut**, in
   * Metern — die Zahl, mit der der Aufrufer weiterstapelt.
   *
   * Für Topf, Pfanne und Feuerlöscher ist das die Höhe des **Belags** und
   * nicht die des Geräts: Das Gerät baut dieser Satz nicht, und seine Höhe
   * steht dort, wo es herkommt (`core/kitchenModel.looseHeight`). So passt die
   * Zahl immer zu dem, was `view` beziehungsweise `topping` zurückgibt — und
   * ein Aufrufer, der beides addiert, rechnet nichts doppelt.
   */
  height(d: Dish): number {
    if (fromModel(d.item)) return stackHeight(d.on);
    if (d.item === 'plate') return PLATE_HEIGHT + stackHeight(d.on);
    if (d.item === 'bun') return stackHeight([d.item, ...d.on]);
    return ITEM_HEIGHT[d.item];
  }

  /** Alles weg — einmal je Zone, nicht je Brötchen. */
  dispose(): void {
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
    for (const shape of this.shapes.values()) shape.dispose();
    this.shapes.clear();
    // **Die Vorlagen werden nur vergessen und nicht freigegeben.** Geometrie
    // und Material darin gehören der geladenen Datei und werden von jedem
    // Möbel derselben Quelle mitbenutzt (`core/dinerModel.ts`); wer sie hier
    // freigäbe, nähme der zweiten Küche nebenan ihre Netze weg. Ein neuer
    // `warm()`-Lauf holt sie aus demselben Zwischenspeicher zurück.
    this.nodes.clear();
    this.warming = null;
  }

  // --- der Stapel -----------------------------------------------------------

  /**
   * **Ein Stapel Zutaten**, von unten nach oben in der Reihenfolge, in der ein
   * Burger aufgebaut ist (`kitchenRecipes.layered`).
   *
   * Gelegt wird in beliebiger Reihenfolge, gezeigt in dieser — wer die Tomate
   * zuletzt auflegt, will sie nicht über der Haube liegen sehen. Jede Schicht
   * sitzt genau auf der Oberkante der vorigen: Die Höhe, um die weitergerückt
   * wird, ist dieselbe aus `ITEM_HEIGHT`, mit der `stackHeight` rechnet, und
   * damit kann ein Gericht weder in sich zusammenfallen noch auseinanderfliegen.
   */
  private pile(items: readonly KitchenItem[]): THREE.Object3D | null {
    const stack = new THREE.Group();
    stack.name = STACK_NAME;
    const order = layered(items);
    const bread = order.includes('bun');
    const filling = order.filter((item) => item !== 'bun');

    // Ein Brötchen ohne Belag ist nicht aufgeschnitten, sondern ein Brötchen.
    if (bread && !filling.length) {
      const whole = this.piece('bun');
      if (!whole) return null;
      stack.add(whole);
      return stack;
    }

    let y = 0;
    if (bread) {
      // Der Boden liegt immer unten — auch wenn jemand das Brötchen zuletzt
      // auf den Teller gelegt hat. Ein Burger mit dem Deckel unter dem Fleisch
      // wäre ein Stapel und kein Burger.
      const base = this.node(BUN_BOTTOM_NODE, 'kitchen-bun-base');
      if (base) stack.add(base);
      y += BUN_BASE;
    }
    for (const item of filling) {
      const piece = this.piece(item);
      // Geräte liegen auf keinem Burger (`kitchenRecipes.TAKES`); käme doch
      // eines, fehlte hier ein Netz und nicht eine Höhe — `ITEM_HEIGHT` ist
      // für sie 0, der Stapel rückt also gar nicht weiter. **Und dasselbe gilt
      // für ein Netz, das noch nicht geladen ist** (`warm`): Die Lücke im Bild
      // schließt sich beim nächsten `restyle`, die Höhe stimmt sofort.
      if (!piece) continue;
      piece.position.y = y;
      stack.add(piece);
      y += ITEM_HEIGHT[item];
    }
    if (bread) {
      const dome = this.node(BUN_TOP_NODE, 'kitchen-bun-top');
      if (dome) {
        dome.position.y = y;
        stack.add(dome);
      }
    }
    // **Ein leerer Stapel ist kein Stapel, sondern nichts.** Er entsteht nur
    // vor `warm()`, und eine leere Gruppe wäre dort das schlechtere `null`: Sie
    // wird abgelegt, vermessen (`zones/kitchen.markHandles`) und bekommt
    // Griffe von null Zentimetern.
    return stack.children.length ? stack : null;
  }

  /**
   * **Ein geladenes Netz, geklont und benannt** — oder `null`, solange
   * `warm()` nicht durch ist.
   *
   * Der Name ist der des Spiels und nicht der der Quelle: Die Zone sucht im
   * Stapel nach `kitchen-patty-cooked` und nicht nach
   * `food_ingredient_burger_cooked` (`wrap`, und dieselbe Begründung).
   *
   * Geklont wird mit `true`, also mit allem darunter; Geometrie und Material
   * bleiben dabei geteilt — ein Burger mit drei Lagen kostet drei Knoten und
   * keine drei Netze.
   */
  private node(node: string, name: string): THREE.Object3D | null {
    const template = this.nodes.get(node);
    if (!template) return null;
    const copy = template.clone(true);
    copy.name = name;
    return copy;
  }

  // --- die Stücke selbst ----------------------------------------------------

  /**
   * **Ein einzelnes Stück**, mit dem Fuß auf `y = 0` — dasselbe Netz, ob es
   * auf dem Brett liegt oder im Burger steckt.
   */
  private piece(item: KitchenItem): THREE.Object3D | null {
    // **Erst die Tabelle, dann das Gebaute.** Acht der Zutaten sind Netze
    // (`FOOD_NODE`), und dass sie es sind, steht dort und nicht hier — ein
    // `case` je Knoten wäre die zweite Liste derselben acht Namen.
    const node = FOOD_NODE[item as keyof typeof FOOD_NODE] as string | undefined;
    if (node) return this.node(node, `kitchen-${item}`);
    switch (item) {
      case 'tomato-soup':
        return this.soup();
      case 'water':
        return this.water();
      default:
        return null;
    }
  }

  /** Die Tomatensuppe — eine glänzende Pfütze mit einem Häufchen darin. */
  private soup(): THREE.Object3D {
    const pool = this.mesh(
      'soup-pool',
      () => new THREE.SphereGeometry(SOUP_RADIUS, 18, 8),
      SOUP,
      WET,
    );
    pool.scale.set(1, SOUP_POOL / (2 * SOUP_RADIUS), 1);
    pool.position.y = SOUP_POOL / 2;
    const heap = this.mesh(
      'soup-heap',
      () => new THREE.SphereGeometry(SOUP_RADIUS * 0.45, 14, 8),
      SOUP,
      WET,
    );
    // Die Kugel steckt zur Hälfte in der Pfütze: Was heraussteht, ist genau
    // `SOUP_HEAP` — dieselbe Zahl, mit der `ITEM_HEIGHT` rechnet.
    heap.scale.set(1, SOUP_HEAP / (SOUP_RADIUS * 0.45), 1);
    heap.position.y = SOUP_POOL;
    return wrap('kitchen-tomato-soup', pool, heap);
  }

  /**
   * **Das Wasser im Topf** — ein Zylinder in der gemessenen Weite der
   * Topföffnung, so tief, wie das Wasser steht (`WATER_DEEP`).
   *
   * **Zu sehen ist davon nur die Deckfläche**, und das ist kein Mangel, sondern
   * der Punkt: Der Topf ist aus Blech und undurchsichtig, also sieht man in ihn
   * hinein und sonst nirgendwohin. Was die Deckfläche leistet, ist an der
   * Quelle nachgerechnet (`core/kitchenFit.POT_BOWL.water`): Aus der
   * Hauptansicht (55° von oben) verdeckt der nähere Rand 17 % der Scheibe, es
   * bleibt eine breite blaue Ellipse knapp unter der Kante. Ein **leerer** Topf
   * zeigt an derselben Stelle seinen Innenboden — dunkel, 28 cm tief und zu
   * 34 % verdeckt. Voll und leer sind damit zwei verschiedene Bilder und nicht
   * zwei Farbtöne.
   *
   * **Achtzehn Seiten** und nicht sechzehn wie beim Brötchen: Der Rand des
   * Topfes ist im Modell ein glatter Kreis, und ein sichtbar eckiger
   * Wasserspiegel darin fiele auf — anders als unter einer Brötchenhaube, die
   * selbst aus Kanten gebaut ist.
   */
  private water(): THREE.Object3D {
    const water = this.mesh(
      'pot-water',
      () => new THREE.CylinderGeometry(POT_BOWL.radius, POT_BOWL.radius, WATER_DEEP, 18),
      WATER_LOOK.color,
      WATER_LOOK.roughness,
      true,
    );
    water.position.y = WATER_DEEP / 2;
    // **Kein Schatten.** Ein Wasserspiegel, der in den Topf hinein einen
    // schwarzen Zylinder wirft, verdunkelt genau das, wofür er da ist — und
    // geworfen würde er auf das Blech, das ihn ohnehin verdeckt.
    water.castShadow = false;
    return wrap('kitchen-water', water);
  }

  // --- geteilte Formen und Farben -------------------------------------------

  private mesh(
    key: string,
    make: () => THREE.BufferGeometry,
    color: number,
    gloss = MATTE,
    clear = false,
  ): THREE.Mesh {
    let shape = this.shapes.get(key);
    if (!shape) {
      shape = make();
      this.shapes.set(key, shape);
    }
    const mesh = new THREE.Mesh(shape, this.material(color, gloss, clear));
    mesh.castShadow = true;
    return mesh;
  }

  /**
   * Die Rauheit gehört mit in den Schlüssel: Dieselbe Farbe einmal matt und
   * einmal nass ist zweierlei Material, und ohne sie bekäme die Suppe den
   * Glanz der Tomate daneben — oder umgekehrt, je nachdem, wer zuerst gebaut
   * wird.
   *
   * **Und die Durchsichtigkeit gehört aus demselben Grund dazu.** Sie gibt es
   * bisher genau einmal — für das Wasser —, und ein Schlüssel ohne sie wäre
   * eine Falle für den Tag, an dem jemand denselben Blauton matt und
   * undurchsichtig haben will. Was durchsichtig ist, holt sich Deckkraft und
   * Metallanteil aus `WATER_LOOK`: Es gibt nur ein Wasser in dieser Küche, und
   * eine zweite Zahlenreihe daneben wäre der Anfang zweier.
   */
  private material(color: number, gloss: number, clear = false): THREE.MeshStandardMaterial {
    const key = `${color}-${gloss}${clear ? '-klar' : ''}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color,
        roughness: gloss,
        ...(clear
          ? { transparent: true, opacity: WATER_LOOK.opacity, metalness: WATER_LOOK.metalness }
          : {}),
      });
      this.materials.set(key, material);
    }
    return material;
  }
}

/**
 * **Ein Stück unter einem Namen** — jedes gebaute Ding ist eine Gruppe, und
 * jede Gruppe heißt nach ihrer Zutat.
 *
 * Der Name ist kein Schmuck: Er ist der Griff, an dem die Zone eine Schicht
 * aus einem Stapel wiederfindet (`Object3D.getObjectByName`), ohne sich beim
 * Bauen jede Referenz zu merken. Und die Gruppe darüber ist der Grund, warum
 * eine Schicht im Stapel mit **einer** Zeile verschoben wird, egal aus wie
 * vielen Teilen sie besteht.
 */
function wrap(name: string, ...parts: readonly THREE.Object3D[]): THREE.Object3D {
  const group = new THREE.Group();
  group.name = name;
  for (const part of parts) group.add(part);
  return group;
}

/**
 * **Ein geladenes Netz auf den eigenen Fuß und in die eigene Mitte stellen.**
 *
 * Jedes gebaute Stück dieser Datei steht mit dem Fuß auf `y = 0` und mit der
 * Mitte auf `x/z = 0` — daran hängt alles, was die Küche damit tut: der
 * Stapel, der jede Schicht auf die Oberkante der vorigen setzt, die Hand, die
 * ein Ding vor den Bauch hängt, das Bild, das der Ofen davon backt.
 *
 * Ein Netz aus der Quelle hält sich daran **fast**: Der Salatkopf liegt 5 mm
 * unter seinem Ursprung und 2,6 cm daneben, die Salatscheibe 1,7 cm darunter,
 * die geschnittene Tomate 1,25 cm zur Seite. Statt diese vier Zahlen je Zutat
 * nachzuschlagen, wird **einmal gemessen**: Die Hülle sagt, wo unten und wo
 * die Mitte ist, und die Vorlage wird entsprechend gerückt. Danach stimmt es
 * für jeden Klon und für jeden Knoten, der später dazukommt.
 *
 * Gerückt wird der Knoten **in** einer Gruppe darüber, und nicht der Knoten
 * selbst: Er trägt seine eigene Umrechnung aus der Quantisierung
 * (`core/dinerModel.ts`), und wer daran dreht, bekommt lauter gleich große
 * Würfel.
 */
function onFoot(model: THREE.Object3D): THREE.Object3D {
  const holder = new THREE.Group();
  holder.add(model);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  model.position.set(
    model.position.x - (box.min.x + box.max.x) / 2,
    model.position.y - box.min.y,
    model.position.z - (box.min.z + box.max.z) / 2,
  );
  return holder;
}

/** Wie hoch ein gebautes Ding ist — gemessen und nicht je Ding aufgeschrieben. */
export function heightOf(object: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(object);
  return Math.max(box.max.y - box.min.y, 0.01);
}
