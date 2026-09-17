import * as THREE from 'three';
import { PAN_BOWL, SINK_BOWL } from '../../../core/kitchenFit';
import { CLEAN_STACK_MAX } from './kitchenCarry';
import { layered, type Dish, type KitchenItem } from './kitchenRecipes';

/**
 * **Was in der Küche zu sehen ist, aber nicht aus der Datei kommt** — jedes
 * Gericht als Netz, aus geteilten Formen und geteilten Farben.
 *
 * Der gekaufte Katalog hat dreizehn Möbel und **keine Zutat**
 * (`core/kitchenFit.ts`): kein Gemüse, kein Teig, kein Brötchen. Bei
 * _Overcooked_ ist die Zutat aber der halbe Bildschirm — also wird sie hier
 * gebaut, aus denselben Grundkörpern wie die Kisten der Interaktionszone
 * (`zones/interact.ts`).
 *
 * **Gebaut und nicht gemodelliert**, und das ist eine Entscheidung: Ein
 * Brötchen ist eine gedrückte Kugel, ein Patty eine Scheibe, eine Tomate eine
 * Kugel mit Strunk — und dafür eine zweite Quelldatei aufzunehmen, mit Lizenz,
 * Aufbereitung und Eintrag in `public/models/CREDITS.md`, wäre viel Aufwand
 * für ein Dutzend Zylinder. Wenn eines Tages ein Zutatensatz dazukommt,
 * ersetzt er genau diese Klasse.
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
 * **Was hier `null` ist, kommt aus dem Modell.** Topf, Pfanne und
 * Feuerlöscher stecken im gekauften Möbelnetz und werden von dort abgenommen
 * (`core/kitchenModel.takeUtensil`) — sie nachzubauen hieße, zwei Pfannen zu
 * pflegen, von denen eine schlechter aussieht. Damit trotzdem ein Patty **in**
 * der Pfanne liegen kann, gibt es `topping`: nur den Belag, zum Anhängen an
 * ein fremdes Netz.
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
 * beim Möbellader, der Geometrie und Material zwischen dreizehn Tresen teilt
 * (`core/kitchenModel.ts`).
 */

/**
 * **Wie groß ein Brötchen ist**, als Halbmesser in Metern — ein Burger und
 * kein Frühstücksbrötchen.
 *
 * Es war einmal 11 cm groß, und das war zu wenig: Der Teller auf der
 * Tellerausgabe misst **75 cm** im Durchmesser (nachgemessen in
 * `public/models/kitchen.glb`: 1,50 m in der Quelle, halbiert von
 * `core/kitchenFit.KITCHEN_SCALE`), und daneben lag eine Murmel, die ein
 * Sechstel davon bedeckte. Beim Vorbild füllt der Burger den Teller **fast**
 * aus, und genau das tut er jetzt: 60 cm breit, vier Fünftel des Tellers.
 *
 * Der Teller ist das Maß und nicht die Figur — er ist der Ort, an dem ein
 * Burger am Ende landet, und was darauf zu klein aussieht, sieht überall zu
 * klein aus.
 */
export const BUN_RADIUS = 0.3;

/**
 * **Wie flach es gedrückt ist** — ein Anteil seines Durchmessers.
 *
 * Die Zahl steht hier und nicht zweimal weiter unten: Sie geht in die Höhe
 * **und** in die Stauchung der Kugel, und zwei Stellen mit derselben Zahl
 * sind eine Stelle zu viel. Flacher als früher (0,72), weil Breite allein
 * eine Kugel wachsen lässt: 60 cm breit und 43 cm hoch wäre ein Brotball auf
 * dem Tresen, 60 cm breit und 26 cm hoch ist ein Burger.
 */
const BUN_SQUASH = 0.44;

/** Und wie hoch es damit aufträgt — es ist gedrückt, keine Kugel. */
export const BUN_HEIGHT = BUN_RADIUS * 2 * BUN_SQUASH;

/**
 * **Der Boden des aufgeschnittenen Brötchens** — knapp die Hälfte der Haube.
 *
 * Ein belegtes Brötchen ist nicht dasselbe Netz wie ein ganzes: Unten liegt
 * eine flache Scheibe, darauf der Belag, darüber die Haube. Der Boden trägt
 * also **den halben** Brötchenanteil, nicht den ganzen — sonst stünde der
 * Belag so hoch, dass die Haube den Burger zum Turm macht.
 */
export const BUN_BASE = BUN_HEIGHT * 0.45;

/**
 * **Der Teller**, halb so hoch wie ein Brötchen und ein Stück breiter.
 *
 * Nachgebaut und nicht geladen, obwohl es im Modell einen gibt: Der dort steht
 * **auf** der Tellerausgabe und ist Teil ihres Netzes (`Kitchen_Utensils`, ein
 * einziges Stück von 1,50 m in der Quelle). Ihn herauszulösen hieße, das Möbel
 * ohne Teller zu hinterlassen — eine Tellerausgabe, aus der man den letzten
 * Teller genommen hat. Der hier ist derselbe Durchmesser, nur eben beliebig
 * oft da.
 */
export const PLATE_RADIUS = 0.375;
export const PLATE_HEIGHT = 0.05;

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
 * **Der dreckige Teller** — derselbe Teller, nur benutzt (`plate-dirty`,
 * `kitchenRecipes.KitchenItem`).
 *
 * Er muss **in der Hauptansicht** vom sauberen zu unterscheiden sein, und die
 * schaut aus 55° von oben (`core/topDownPose.TOP_DOWN_TILT`). Von dort ist ein
 * Teller eine helle Scheibe und sonst nichts: Der Rand steht 5 cm hoch, davon
 * sieht man bei diesem Winkel einen Streifen von 3 cm am hinteren Bogen. Farbe
 * allein trägt deshalb nicht. Angegrautes Porzellan neben weißem ist im
 * Schatten des Ausgaberegals derselbe Grauton wie weißes Porzellan in der
 * Sonne — dasselbe Argument, das beim verbrannten Patty (`BURNT_SHRINK`) schon
 * einmal gegen „einfach dunkler" entschieden hat.
 *
 * **Also reden Reste mit.** Auf der Scheibe liegen fünf kantige Krümel und ein
 * Soßenfleck, und was von oben ankommt, ist keine glatte Scheibe mehr, sondern
 * eine mit Flecken darauf — ein Umriss, den es beim sauberen Teller nirgends
 * gibt. Kantig gegen die runde Scheibe, dunkel gegen das Porzellan, und
 * unregelmäßig verteilt: Fünf Punkte auf einem Kreisbogen wären ein Muster und
 * sähen nach Verzierung aus.
 *
 * **Gleich hoch wie der saubere Teller**, und das ist keine Schönheit, sondern
 * Pflicht: An der Rückgabe stapeln sich die Dinger (`FoodKit.dirtyStack`), und
 * ein Stapel rechnet mit `ITEM_HEIGHT` — ein dreckiger Teller, der einen
 * Millimeter mehr aufträgt, hebt den sechsten um einen halben Zentimeter aus
 * dem Bild. Die Krümel wachsen deshalb **nicht** oben drauf: Der Tellerkörper
 * ist um genau ihre Dicke flacher gestaucht, und zusammen sind beide wieder
 * `PLATE_HEIGHT` hoch. Gestaucht und nicht neu gebaut — es ist dieselbe
 * Geometrie wie beim sauberen Teller, nur mit einem anderen `scale.y`.
 */
const SCRAPS = 5;
const SCRAP_SIZE = 0.075;
const SCRAP_HEIGHT = 0.012;
const DIRTY_DISH = PLATE_HEIGHT - SCRAP_HEIGHT;

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

/** Das Patty, in drei Stufen: roh am dicksten, verbrannt am kleinsten. */
const PATTY_RADIUS = BUN_RADIUS * 0.82;
const PATTY_RAW_HEIGHT = 0.09;
const PATTY_DONE_HEIGHT = 0.075;
const PATTY_BURNT_HEIGHT = 0.06;

/**
 * **Wie stark das Verbrannte geschrumpft ist.**
 *
 * Ein verkohltes Patty muss man **auf den ersten Blick** von einem gebratenen
 * unterscheiden können — sonst räumt es niemand weg, sondern legt es aufs
 * Brötchen und wundert sich an der Ausgabe. Schwarz allein reicht dafür nicht:
 * In einer Küche mit Schlagschatten ist Dunkelbraun neben Schwarz eine Frage
 * des Lichts. Es ist deshalb auch **kleiner** und **kantiger** (zehn statt
 * achtzehn Seiten), und über den Deckel laufen helle Risse — eine Form, die
 * sich von der runden Scheibe daneben schon in der Silhouette unterscheidet.
 */
const BURNT_SHRINK = 0.78;
const BURNT_FACES = 10;

/** Der Salatkopf und die Tomate, wie sie aus der Ausgabe kommen. */
const HEAD_RADIUS = 0.22;
const HEAD_SQUASH = 0.86;
const TOMATO_RADIUS = 0.19;
const TOMATO_SQUASH = 0.9;
const STALK_HEIGHT = 0.06;

/**
 * **Geschnittenes, in drei Scheiben** — und in **einer** Größe.
 *
 * Früher gab es jede Scheibe zweimal: als Häufchen auf dem Brett und flacher
 * im Burger. Mit dem `Dish` ist dieselbe Zutat aber dasselbe Ding, egal wo sie
 * liegt — auf dem Brett, auf dem Teller, im Brötchen —, und zwei Größen hießen
 * zwei Höhen, von denen die Zone die falsche stapeln kann. Eine Größe, eine
 * Höhe, ein Netz.
 */
const SLICES = 3;
const LEAF_RADIUS = BUN_RADIUS * 0.9;
const LEAF_THICK = 0.02;
const TOMATO_SLICE_RADIUS = BUN_RADIUS * 0.73;
const TOMATO_SLICE_THICK = 0.025;

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

/** Die Farben — Krume, Kruste, Fleisch, Kohle, Grün, Tomate, Porzellan. */
const CRUST = 0xd9a253;

/**
 * **Die Krume ist gebräunt und nicht weiß.** Sie war `0xf0dcb4` und damit um
 * 32 % heller als die Kruste (relative Helligkeit 221 gegen 168) — und das war
 * ein Ton zu viel: Der Boden trägt den Belag, ragt also unter der Haube hervor,
 * und ein fast weißer Ring unter einer braunen Kuppe liest sich nicht als
 * aufgeschnittenes Brötchen, sondern als **Teller mit Deckel darauf**. Von oben
 * ist das noch deutlicher als von vorn: In der Aufsicht
 * (`core/topDownPose.TOP_DOWN_TILT`, 55°) sieht man vom Burger fast nur die
 * Haube und genau diesen Rand.
 *
 * Jetzt ist es derselbe warme Ton wie die Kruste, nur um 9 % heller (183 gegen
 * 168). Ganz gleich hell darf er nicht sein: Die Schnittkante zwischen Boden
 * und Haube ist das, woran man ein **aufgeschnittenes** Brötchen erkennt, und
 * ohne jeden Unterschied verschwände sie im Schatten der Kuppe. Neun Prozent
 * sind der Kompromiss — genug für die Kante, zu wenig für einen Ring, der von
 * oben als eigenes Ding durchgeht.
 */
const CRUMB = 0xe6b16a;
const MEAT_RAW = 0xc4675c;
const MEAT_DONE = 0x6f3f24;
const CHAR = 0x211c19;
const ASH = 0x6e645b;
const LEAF = 0x63a83c;
const LEAF_PALE = 0x8cc75c;
const TOMATO = 0xd23f2b;
const TOMATO_PALE = 0xe4705c;
const SOUP = 0xb02a18;
const STALK = 0x4e7a2a;
const CHINA = 0xf4f2ec;

/**
 * Und der Ton des benutzten Geschirrs: angegrautes Porzellan, ein Krümel, ein
 * Soßenfleck. Das Grau ist mit Bedacht **nicht** weit weg von `CHINA` — ein
 * dunkelgrauer Teller wäre ein anderes Geschirr und keines, das gleich wieder
 * sauber wird. Erkannt wird er an den Resten, nicht am Ton (siehe oben).
 */
const CHINA_DIRTY = 0xd9d3c4;
const SCRAP = 0x7d5533;
const SAUCE = 0x9c3a22;

/** Wie matt etwas ist — Essen schluckt Licht, Suppe wirft es zurück. */
const MATTE = 0.85;
const WET = 0.32;

/**
 * Und benutztes Porzellan ist stumpf: Die Glasur eines sauberen Tellers wirft
 * eine Kante Licht zurück, ein angetrockneter Teller nicht. Das ist der zweite,
 * kleinere Unterschied zum sauberen Teller — er kostet nichts, weil `material`
 * die Rauheit ohnehin im Schlüssel führt.
 */
const DULL = 0.97;

/**
 * **Wie hoch jede Zutat für sich aufträgt**, in Metern.
 *
 * Die Tabelle ist die Rechnung zu den Formen weiter unten und wird aus
 * denselben Maßen gebildet, aus denen die Geometrie entsteht — eine
 * abgeschriebene Zahl wäre die eine, die beim nächsten Umbau stehen bleibt.
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
  bun: BUN_HEIGHT,
  patty: PATTY_RAW_HEIGHT,
  'patty-cooked': PATTY_DONE_HEIGHT,
  'patty-burnt': PATTY_BURNT_HEIGHT,
  lettuce: HEAD_RADIUS * 2 * HEAD_SQUASH,
  'lettuce-cut': LEAF_THICK * SLICES,
  tomato: TOMATO_RADIUS * 2 * TOMATO_SQUASH + STALK_HEIGHT / 2,
  'tomato-cut': TOMATO_SLICE_THICK * SLICES,
  'tomato-soup': SOUP_POOL + SOUP_HEAP,
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
  return BUN_BASE + filling + BUN_HEIGHT;
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
      const plate = new THREE.Group();
      plate.name = 'kitchen-dish-plate';
      plate.add(this.plate());
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
    return this.plateStack(count, DIRTY_STACK_MAX, () => this.dirtyPlate(), 'kitchen-dirty-stack');
  }

  /**
   * **Und derselbe Turm aus sauberen Tellern** — der auf dem **Abtropfbrett**
   * (`core/kitchenFit.ts`, `sink-drain`).
   *
   * Zwei Aufrufe derselben Schleife und nicht zwei Schleifen: Ein Stapel ist
   * ein Stapel, und der Unterschied zwischen den beiden ist genau ein Teller —
   * derselbe Verdrehwinkel, dieselbe Lagenhöhe, dieselbe Klemmung. Zwei
   * Fassungen davon wären zwei Stellen, an denen `DIRTY_TWIST` nachzuziehen
   * ist, und eine davon würde vergessen.
   *
   * Höchstens `CLEAN_STACK_MAX` (vier, siehe dort) statt sechs: Das Brett lehnt
   * ab, wenn es voll ist, die Rückgabe nie.
   */
  cleanStack(count: number): THREE.Object3D {
    return this.plateStack(count, CLEAN_STACK_MAX, () => this.plate(), 'kitchen-clean-stack');
  }

  private plateStack(
    count: number,
    most: number,
    one: () => THREE.Object3D,
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
      const plate = one();
      plate.position.y = i * PLATE_HEIGHT;
      plate.rotation.y = i * DIRTY_TWIST;
      stack.add(plate);
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
  private pile(items: readonly KitchenItem[]): THREE.Object3D {
    const stack = new THREE.Group();
    stack.name = STACK_NAME;
    const order = layered(items);
    const bread = order.includes('bun');
    const filling = order.filter((item) => item !== 'bun');

    // Ein Brötchen ohne Belag ist nicht aufgeschnitten, sondern ein Brötchen.
    if (bread && !filling.length) {
      stack.add(this.bun());
      return stack;
    }

    let y = 0;
    if (bread) {
      // Der Boden liegt immer unten — auch wenn jemand das Brötchen zuletzt
      // auf den Teller gelegt hat. Ein Burger mit dem Deckel unter dem Fleisch
      // wäre ein Stapel und kein Burger.
      stack.add(this.bunBase());
      y += BUN_BASE;
    }
    for (const item of filling) {
      const piece = this.piece(item);
      // Geräte liegen auf keinem Burger (`kitchenRecipes.TAKES`); käme doch
      // eines, fehlte hier ein Netz und nicht eine Höhe — `ITEM_HEIGHT` ist
      // für sie 0, der Stapel rückt also gar nicht weiter.
      if (!piece) continue;
      piece.position.y = y;
      stack.add(piece);
      y += ITEM_HEIGHT[item];
    }
    if (bread) {
      const dome = this.dome();
      dome.position.y = y;
      stack.add(dome);
    }
    return stack;
  }

  // --- die Stücke selbst ----------------------------------------------------

  /**
   * **Ein einzelnes Stück**, mit dem Fuß auf `y = 0` — dasselbe Netz, ob es
   * auf dem Brett liegt oder im Burger steckt.
   */
  private piece(item: KitchenItem): THREE.Object3D | null {
    switch (item) {
      case 'bun':
        return this.bun();
      case 'plate':
        return this.plate();
      case 'plate-dirty':
        return this.dirtyPlate();
      case 'patty':
        return this.patty('patty', MEAT_RAW, PATTY_RAW_HEIGHT);
      case 'patty-cooked':
        return this.patty('patty-cooked', MEAT_DONE, PATTY_DONE_HEIGHT);
      case 'patty-burnt':
        return this.burnt();
      case 'lettuce':
        return this.lettuce();
      case 'lettuce-cut':
        return this.slices('lettuce-cut', LEAF, LEAF_PALE, LEAF_RADIUS, LEAF_THICK);
      case 'tomato':
        return this.tomato();
      case 'tomato-cut':
        return this.slices(
          'tomato-cut',
          TOMATO,
          TOMATO_PALE,
          TOMATO_SLICE_RADIUS,
          TOMATO_SLICE_THICK,
        );
      case 'tomato-soup':
        return this.soup();
      default:
        return null;
    }
  }

  /** Das ganze Brötchen: Boden und Haube, so wie es aus der Ausgabe kommt. */
  private bun(): THREE.Object3D {
    // Der Fuß **steckt** in der Haube und trägt sie nicht: Ein ganzes Brötchen
    // ist so hoch wie seine Kruste (`BUN_HEIGHT`), und die gedrückte Kugel läuft
    // nach unten spitz zu — ohne den Zylinder darin stünde das Brötchen auf
    // einem Punkt statt auf einem Rand. Seit die Krume denselben warmen Ton
    // trägt wie die Kruste (`CRUMB`), ist er reine Silhouette und kein
    // Farbkontrast mehr; zu sehen ist er trotzdem, weil die Kugel am Boden auf
    // einen Punkt zuläuft und der Zylinder dort 0,26 m misst (0,86 ·
    // `BUN_RADIUS`). Erst auf seiner Oberkante treffen sich beide: 0,276 m
    // gegen 0,275 m Kugelradius auf dieser Höhe.
    const base = this.mesh(
      'bun-foot',
      () => new THREE.CylinderGeometry(BUN_RADIUS * 0.92, BUN_RADIUS * 0.86, BUN_HEIGHT * 0.3, 16),
      CRUMB,
    );
    base.position.y = BUN_HEIGHT * 0.15;
    return wrap('kitchen-bun', base, this.dome());
  }

  /** Der Boden des aufgeschnittenen Brötchens — was den Belag trägt. */
  private bunBase(): THREE.Object3D {
    const base = this.mesh(
      'bun-base',
      () => new THREE.CylinderGeometry(BUN_RADIUS * 0.92, BUN_RADIUS * 0.86, BUN_BASE, 16),
      CRUMB,
    );
    base.position.y = BUN_BASE / 2;
    return wrap('kitchen-bun-base', base);
  }

  /** Die Haube — eine gedrückte Kugel mit dem Fuß auf y = 0. */
  private dome(): THREE.Object3D {
    const dome = this.mesh('bun-dome', () => new THREE.SphereGeometry(BUN_RADIUS, 16, 10), CRUST);
    dome.scale.set(1, BUN_SQUASH, 1);
    dome.position.y = BUN_HEIGHT / 2;
    return wrap('kitchen-bun-top', dome);
  }

  /** Das Patty — roh hell und dick, gebraten dunkel und flacher. */
  private patty(name: string, color: number, height: number): THREE.Object3D {
    const patty = this.mesh(
      `${name}-${height}`,
      () => new THREE.CylinderGeometry(PATTY_RADIUS, PATTY_RADIUS * 0.95, height, 18),
      color,
    );
    patty.position.y = height / 2;
    return wrap(`kitchen-${name}`, patty);
  }

  /**
   * **Das verbrannte Patty** — schwarz, geschrumpft, kantig und aufgerissen.
   *
   * Die hellen Risse sind der eigentliche Trick: Schwarz auf Schwarz sieht man
   * im Schatten nicht, ein aschgrauer Sprung quer über den Deckel schon. Sie
   * liegen bündig mit der Oberkante, damit das Ding nicht höher aufträgt, als
   * `ITEM_HEIGHT` sagt.
   */
  private burnt(): THREE.Object3D {
    const radius = PATTY_RADIUS * BURNT_SHRINK;
    const patty = this.mesh(
      'patty-burnt',
      () => new THREE.CylinderGeometry(radius, radius * 0.9, PATTY_BURNT_HEIGHT, BURNT_FACES),
      CHAR,
    );
    patty.position.y = PATTY_BURNT_HEIGHT / 2;
    const parts: THREE.Object3D[] = [patty];
    const crack = 0.012;
    for (let i = 0; i < 3; i++) {
      const line = this.mesh(
        'patty-burnt-crack',
        () => new THREE.BoxGeometry(radius * 1.7, crack, crack),
        ASH,
      );
      line.position.y = PATTY_BURNT_HEIGHT - crack / 2;
      line.rotation.y = i * 1.05;
      parts.push(line);
    }
    return wrap('kitchen-patty-burnt', ...parts);
  }

  /** Der Salatkopf — eine Kugel, oben etwas gedrückt. */
  private lettuce(): THREE.Object3D {
    const head = this.mesh(
      'lettuce-head',
      () => new THREE.SphereGeometry(HEAD_RADIUS, 14, 10),
      LEAF,
    );
    head.scale.set(1, HEAD_SQUASH, 1);
    head.position.y = HEAD_RADIUS * HEAD_SQUASH;
    return wrap('kitchen-lettuce', head);
  }

  /** Die Tomate — Kugel und Strunk, damit sie kein roter Ball ist. */
  private tomato(): THREE.Object3D {
    const body = this.mesh(
      'tomato-body',
      () => new THREE.SphereGeometry(TOMATO_RADIUS, 14, 10),
      TOMATO,
    );
    body.scale.set(1, TOMATO_SQUASH, 1);
    body.position.y = TOMATO_RADIUS * TOMATO_SQUASH;
    const stalk = this.mesh(
      'tomato-stalk',
      () => new THREE.CylinderGeometry(0.03, 0.045, STALK_HEIGHT, 8),
      STALK,
    );
    // Halb in der Frucht, halb darüber — so trägt der Strunk genau seine halbe
    // Höhe auf, und genau damit rechnet `ITEM_HEIGHT`.
    stalk.position.y = TOMATO_RADIUS * 2 * TOMATO_SQUASH;
    return wrap('kitchen-tomato', body, stalk);
  }

  /**
   * **Geschnitten**: drei Scheiben übereinander, jede ein Stück versetzt.
   *
   * Versetzt und nicht gestapelt, weil ein bündiger Stapel aus drei Zylindern
   * von oben wie **einer** aussieht — und dann sieht man dem Brett nicht an,
   * dass dort gearbeitet wurde. Der Versatz ist symmetrisch (−1, 0, +1), damit
   * die Mitte des Häufchens trotzdem auf `x/z = 0` bleibt.
   */
  private slices(
    name: string,
    dark: number,
    pale: number,
    radius: number,
    thick: number,
  ): THREE.Object3D {
    // **Der Schlüssel trägt die Maße mit.** Salat und Tomate teilen sich diese
    // Methode und nicht ihre Form — ein Schlüssel ohne die Maße gäbe der
    // zweiten die Größe der ersten.
    const key = `slice-${radius}-${thick}`;
    const parts: THREE.Object3D[] = [];
    for (let i = 0; i < SLICES; i++) {
      const slice = this.mesh(
        key,
        () => new THREE.CylinderGeometry(radius, radius, thick, 16),
        i === 1 ? pale : dark,
      );
      slice.position.set((i - 1) * 0.02, thick / 2 + i * thick, (i - 1) * 0.015);
      slice.rotation.y = i * 0.6;
      parts.push(slice);
    }
    return wrap(`kitchen-${name}`, ...parts);
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

  /** Der Teller — eine flache Schale, unten enger als oben. */
  private plate(): THREE.Object3D {
    const plate = this.mesh('plate-dish', () => this.plateShape(), CHINA);
    plate.position.y = PLATE_HEIGHT / 2;
    return wrap('kitchen-plate', plate);
  }

  /**
   * **Der dreckige Teller** — dieselbe Schale, gestaucht, stumpf, mit Resten
   * darauf (siehe der Block bei `SCRAPS`).
   *
   * Die Schale ist **dieselbe Geometrie** wie beim sauberen Teller, nur mit
   * `scale.y` flachgedrückt: So bleibt es eine geteilte Form, und die Krümel
   * darüber machen zusammen mit ihr wieder genau `PLATE_HEIGHT`.
   *
   * Die Reste liegen auf einer Spirale im goldenen Winkel (137,5°, hier als
   * 2,4 im Bogenmaß) und in drei wechselnden Abständen von der Mitte. Das ist
   * die billigste Art, fünf Punkte zu verteilen, die nach **Zufall** aussehen
   * und trotzdem in jedem Bild gleich liegen — ein echter Zufall wäre ein
   * Teller, der bei jedem Blick anders aussieht, und ein Kreis aus fünf
   * Krümeln sähe aus wie ein Zierrand.
   */
  private dirtyPlate(): THREE.Object3D {
    const plate = this.mesh('plate-dish', () => this.plateShape(), CHINA_DIRTY, DULL);
    plate.scale.y = DIRTY_DISH / PLATE_HEIGHT;
    plate.position.y = DIRTY_DISH / 2;
    const parts: THREE.Object3D[] = [plate];

    // Der Soßenfleck: flach zerlaufen, glänzend, nicht in der Mitte — eine
    // Pfütze in der Tellermitte wäre wieder ein Kreis im Kreis. Die Kugel
    // steckt zur Hälfte im Porzellan, was heraussteht, ist `SCRAP_HEIGHT / 2`.
    const smear = this.mesh(
      'plate-dirty-smear',
      () => new THREE.SphereGeometry(PLATE_RADIUS * 0.4, 14, 6),
      SAUCE,
      WET,
    );
    smear.scale.set(1, SCRAP_HEIGHT / (2 * PLATE_RADIUS * 0.4), 0.72);
    smear.position.set(-PLATE_RADIUS * 0.18, DIRTY_DISH, PLATE_RADIUS * 0.12);
    parts.push(smear);

    for (let i = 0; i < SCRAPS; i++) {
      const scrap = this.mesh(
        'plate-dirty-scrap',
        () => new THREE.BoxGeometry(SCRAP_SIZE, SCRAP_HEIGHT, SCRAP_SIZE * 0.6),
        SCRAP,
      );
      const angle = i * 2.4;
      // Höchstens 0,48 Halbmesser weit heraus: Ein Krümel von 7,5 cm bringt
      // seine halbe Diagonale (5,3 cm) mit, zusammen bleibt er mit 0,23 m gut
      // innerhalb der Scheibe (0,375 m). Das ist kein Schönheitsmaß — die
      // Hülle des ganzen Tellers muss die der Scheibe bleiben, sonst sitzt
      // seine Mitte nicht mehr auf x/z = 0.
      const reach = PLATE_RADIUS * (0.22 + 0.13 * (i % 3));
      scrap.position.set(
        Math.cos(angle) * reach,
        DIRTY_DISH + SCRAP_HEIGHT / 2,
        Math.sin(angle) * reach,
      );
      scrap.rotation.y = i * 0.9;
      parts.push(scrap);
    }
    return wrap('kitchen-plate-dirty', ...parts);
  }

  /** Die Form beider Teller — einmal gebaut, von sauber und dreckig geteilt. */
  private plateShape(): THREE.BufferGeometry {
    return new THREE.CylinderGeometry(PLATE_RADIUS, PLATE_RADIUS * 0.7, PLATE_HEIGHT, 24);
  }

  // --- geteilte Formen und Farben -------------------------------------------

  private mesh(
    key: string,
    make: () => THREE.BufferGeometry,
    color: number,
    gloss = MATTE,
  ): THREE.Mesh {
    let shape = this.shapes.get(key);
    if (!shape) {
      shape = make();
      this.shapes.set(key, shape);
    }
    const mesh = new THREE.Mesh(shape, this.material(color, gloss));
    mesh.castShadow = true;
    return mesh;
  }

  /**
   * Die Rauheit gehört mit in den Schlüssel: Dieselbe Farbe einmal matt und
   * einmal nass ist zweierlei Material, und ohne sie bekäme die Suppe den
   * Glanz der Tomate daneben — oder umgekehrt, je nachdem, wer zuerst gebaut
   * wird.
   */
  private material(color: number, gloss: number): THREE.MeshStandardMaterial {
    const key = `${color}-${gloss}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness: gloss });
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

/** Wie hoch ein gebautes Ding ist — gemessen und nicht je Ding aufgeschrieben. */
export function heightOf(object: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(object);
  return Math.max(box.max.y - box.min.y, 0.01);
}
