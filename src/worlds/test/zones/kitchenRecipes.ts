/**
 * **Was es in der Küche zu essen gibt** — Zutaten, ihre Stufen, das Zusammen-
 * legen und die Rezepte daraus. Ohne three.js, ohne Datei, ohne Zone.
 *
 * Getrennt von `kitchenCarry.ts` aus demselben Grund, aus dem der Möbelkatalog
 * neben dem Lader steht (`core/kitchenFit.ts`): Dort steht, **was `A` tut**,
 * hier steht, **woraus ein Burger besteht**. Beides ändert sich unabhängig
 * voneinander — ein fünftes Rezept ist eine Zeile in `RECIPES` und keine Zeile
 * in der Regel daneben. Die **Uhr am Herd** (Braten, Verbrennen) steht in
 * `kitchenClock.ts`, die **Arbeit an einer Station** (Schneiden, Spülen) in
 * `kitchenWork.ts` — beides, weil es das einzige ist, was auch ohne
 * Knopfdruck weiterläuft.
 *
 * **Der Träger ist das Neue.** Früher war ein getragenes Ding ein einzelner
 * Name, und ein Burger entstand nur auf einer eigenen Anrichte — ein Möbel,
 * das es bei _Overcooked_ gar nicht gibt. Jetzt ist jedes Ding ein `Dish`:
 * etwas, auf dem etwas liegen **kann**. Teller, Brötchen und Pfanne nehmen
 * auf, alles andere nicht. Damit fällt die Anrichte weg und das Kombinieren
 * geht überall — in der Hand, auf der Zeile, auf dem Brett, im Herd.
 *
 * **Drei Sorten Zutat**, und der Unterschied ist die halbe Küche:
 *
 * - **Roh** (`patty`, `lettuce`, `tomato`): kommt aus der Kiste und gehört auf
 *   keinen Träger außer die Pfanne (das Patty). Wer es trotzdem auflegen will,
 *   liest, warum nicht — und was stattdessen zu tun ist.
 * - **Fertig** (`patty-cooked`, `lettuce-cut`, `tomato-cut`, `tomato-soup`):
 *   aus der Pfanne oder vom Brett, und erst das darf auf den Burger.
 * - **Verdorben** (`patty-burnt`): geht **nur noch in den Müll**. Früher durfte
 *   es auf Teller und Brötchen, damit man den Mist wieder abräumen kann — das
 *   Ergebnis war ein Burger, den man baut, an die Theke trägt und dort erst als
 *   verdorben vorgelesen bekommt. Verbranntes fällt jetzt schon beim Auflegen
 *   durch, und zwar mit dem Satz, der den Weg zum Mülleimer nennt. Aus der
 *   Pfanne kommt es ohnehin nicht heraus, ohne dass man sie auskippt.
 *
 * Das Brötchen hat keine Verarbeitung: Es kommt aus der Kiste und ist selbst
 * der Träger. Ein Brötchen, das erst aufgeschnitten werden müsste, wäre ein
 * vierter Handgriff für nichts.
 *
 * **Und dann ist da noch das Geschirr.** Ein Teller ist entweder sauber
 * (`plate`) oder dreckig (`plate-dirty`), und der dreckige ist weder Träger
 * noch Essen: Auf ihn legt man nichts, und in den Müll gehört er erst recht
 * nicht — er gehört in die Spüle (`kitchenWork.ts`). `isDishware` fasst beide
 * zusammen, weil die Spüle und die Rückgabe nach _Geschirr_ fragen und nicht
 * nach _sauber oder dreckig_.
 */

/** Was sich in der Küche tragen lässt. */
export type KitchenItem =
  /** Gerät — es wird nie zu Essen. */
  | 'pot'
  | 'pan'
  | 'extinguisher'
  /**
   * **Die Wasserpumpenzange** — das Werkzeug zum spritzenden Spülbecken
   * (`kitchenLeak.ts`).
   *
   * Sie ist für diese Küche genau das, was der Feuerlöscher für den
   * brennenden Herd ist: ein Gerät, das herumliegt, bis etwas kaputtgeht, und
   * das dann **geholt** werden muss. Deshalb steht sie in derselben Zeile wie
   * er und nicht bei den Zutaten — sie wird nie zu Essen, sie steht in keinem
   * `TAKES`, `CHOPS` oder `FRIES`, und auf einen Teller gehört sie erst recht
   * nicht.
   */
  | 'pliers'
  /** Träger: Sie nehmen auf, was fertig ist. */
  | 'plate'
  | 'bun'
  /** Geschirr, das erst durch die Spüle muss — trägt nichts. */
  | 'plate-dirty'
  /** Das Patty und seine drei Stufen. */
  | 'patty'
  | 'patty-cooked'
  | 'patty-burnt'
  /** Was geschnitten wird, und was daraus wird. */
  | 'lettuce'
  | 'lettuce-cut'
  | 'tomato'
  | 'tomato-cut'
  | 'tomato-soup'
  /**
   * **Wasser** — das einzige Ding, das nur **in** etwas vorkommt und nie für
   * sich.
   *
   * Es entsteht am Spülbecken im Topf (`kitchenCarry.atSink`) und vergeht mit
   * ihm; es steht in keiner Zeile von `TAKES`, in keinem `CHOPS`, in keinem
   * `FRIES` und in keinem `FOOD`. Warum es trotzdem ein `KitchenItem` ist und
   * nicht ein zweites Ding `'pot-water'`, steht bei `Dish`.
   */
  | 'water'
  /**
   * **Die zweite Speisekarte** — was das Test Restaurant außer Burgern kocht
   * (`worlds/testrestaurant`): Schinken, Pizza zum Mitnehmen, Suppe, Waffeln
   * mit Eis und Käse auf den Burger.
   *
   * Sie steht **in derselben Liste** und nicht in einer zweiten, obwohl die
   * Küche der Testwelt und der Laden (`worlds/plateup`) keines dieser Dinge je
   * zu sehen bekommen. Eine zweite Liste hieße zweite Regeln: ein zweites
   * `combine`, ein zweiter Mülleimer, ein zweites „was tut `A` hier" — und
   * genau die Sorte Doppelung, gegen die `kitchenCarry.kitchenDeed` als
   * **eine** Funktion steht. So ist eine Schüssel ein Träger wie der Teller,
   * und Schinken verbrennt auf derselben Grillplatte wie das Patty.
   *
   * Der **Pizzakarton** und die **Schüssel** sind Träger (`TAKES`); alles
   * andere ist Zutat in ihren Stufen.
   */
  | 'bowl'
  | 'pizzabox'
  /**
   * **Das Hörnchen** — ein Träger wie die Schüssel, nur für Eis: aus dem
   * Hörnchen-Vorrat (`elements`, `cone-stack`), an der Eiswanne eine Kugel
   * darauf.
   */
  | 'cone'
  /** Käse wird geschnitten, die Scheibe geht auf den Burger. */
  | 'cheese'
  | 'cheese-cut'
  /** Schinken und seine drei Stufen — dieselben wie beim Patty. */
  | 'ham'
  | 'ham-cooked'
  | 'ham-burnt'
  /** Die ganze Pizza und ihre Stücke — beide passen in den Karton. */
  | 'pizza'
  | 'pizza-cut'
  /** Teig wird ausgerollt, der flache Teig auf der Grillplatte zur Waffel. */
  | 'dough'
  | 'dough-flat'
  | 'waffle'
  /** Gemüse für die Suppe: geschnitten in den Topf, heraus kommt Suppe. */
  | 'carrot'
  | 'carrot-cut'
  | 'potato'
  | 'potato-cut'
  | 'onion'
  | 'onion-cut'
  | 'stew'
  /**
   * **Pommes** — die geschnittene Kartoffel, im Topf gekocht (`COOKS`).
   *
   * Gewünscht war die Kette dazu: _„Die Kartoffeln Vorräte sollen auch
   * gehighlighted werden und interagierbar sein … ich will darauf z.B. auch
   * Kartoffeln schneiden können … Es fehlt noch ein Waschbecken wo ich den
   * Topf vollmachen kann."_ Kartoffel aus der Kiste, auf dem Brett schneiden,
   * den Topf an der Spüle füllen, auf den Herd, die Kartoffel hinein — und
   * heraus kommen Pommes, die ein Teller nimmt.
   */
  | 'fries'
  /**
   * **Eiskugeln** — aus der Eiswanne direkt in die Schüssel.
   *
   * Sie gibt es nie für sich in der Hand: Die Wanne gibt eine Kugel nur in
   * eine Schüssel (`kitchenCarry.atTub`). Das Hörnchen der Eisecke im Laden
   * (`plateup/plateUpIce.ts`) ist davon getrennt und bleibt, wie es ist.
   */
  | 'ice-vanilla'
  | 'ice-strawberry';

/**
 * **Wie die Dinge heißen** — und jeder Name steht im **Singular**, auch die
 * Tomatenscheibe.
 *
 * Diese Namen landen mitten in Sätzen („… liegt schon drauf"), und ein Plural
 * darunter bräuchte jedes Mal ein zweites Verb. Eine Namenstabelle, die in
 * jedem Satz passt, ist mehr wert als eine, die einmal schöner klingt.
 */
export const ITEM_LABELS: Record<KitchenItem, string> = {
  pot: 'Topf',
  pan: 'Pfanne',
  extinguisher: 'Feuerlöscher',
  // **Der ganze Name und keine „Zange".** So heißt das Werkzeug, so steht es
  // im Auftrag, und der Satz über der Figur („Wasserpumpenzange nehmen") sagt
  // damit, welches der Geräte dieser Küche gemeint ist — eine „Zange" wäre in
  // einer Küche eher die, mit der man Steaks wendet.
  pliers: 'Wasserpumpenzange',
  plate: 'Teller',
  bun: 'Brötchen',
  'plate-dirty': 'Dreckiger Teller',
  patty: 'Rohes Patty',
  'patty-cooked': 'Gebratenes Patty',
  'patty-burnt': 'Verbranntes Patty',
  lettuce: 'Salatkopf',
  'lettuce-cut': 'Geschnittener Salat',
  tomato: 'Tomate',
  'tomato-cut': 'Tomatenscheibe',
  'tomato-soup': 'Tomatensuppe',
  // **„Wasser" und nicht „Topf mit Wasser".** Der Name steht für das, was
  // **im** Topf ist, und der Topf nennt sich daneben selbst: `dishLabel` baut
  // daraus „Topf (Wasser)" — dieselbe Klammer wie bei „Pfanne (Rohes Patty)".
  // Ein Eintrag „Topf mit Wasser" stünde in jedem dieser Sätze doppelt, und im
  // Hinweis der Spüle („Topf mit Wasser füllen") stünde er falsch: Gefüllt wird
  // der Topf, und **womit**, sagt dieses Wort.
  water: 'Wasser',
  bowl: 'Schüssel',
  cone: 'Hörnchen',
  pizzabox: 'Pizzakarton',
  cheese: 'Käse',
  'cheese-cut': 'Käsescheibe',
  ham: 'Roher Schinken',
  'ham-cooked': 'Gebratener Schinken',
  'ham-burnt': 'Verbrannter Schinken',
  pizza: 'Pizza',
  'pizza-cut': 'Geschnittene Pizza',
  dough: 'Teig',
  'dough-flat': 'Ausgerollter Teig',
  waffle: 'Waffel',
  carrot: 'Karotte',
  'carrot-cut': 'Geschnittene Karotte',
  potato: 'Kartoffel',
  'potato-cut': 'Geschnittene Kartoffel',
  onion: 'Zwiebel',
  'onion-cut': 'Geschnittene Zwiebel',
  // **„Gemüsesuppe" und nicht „Suppe"**: Die Tomatensuppe gibt es schon, und
  // zwei Dinge, die in einem Satz gleich heißen, sind im Satz ein Ding.
  stew: 'Gemüsesuppe',
  // „Pommes" ist im Deutschen schon Einzahl genug für jeden Satz hier.
  fries: 'Pommes',
  'ice-vanilla': 'Vanilleeis',
  'ice-strawberry': 'Erdbeereis',
};

/**
 * **Ein Ding in der Hand, auf einer Ablage, in der Pfanne** — und was
 * darauf liegt.
 *
 * `on` ist **flach** und eine **Menge**: Ein Teller mit einem belegten
 * Brötchen trägt `['bun', 'patty-cooked', 'tomato-cut']` und nicht ein
 * Brötchen, das seinerseits etwas trägt. Ein Baum wäre ehrlicher und wäre beim
 * ersten Rezept schon eine Rekursion — jede Frage („ist da ein gebratenes
 * Patty drin?") müsste absteigen, und die Darstellung müsste es auch. Flach
 * ist die Antwort ein `includes`.
 *
 * Alles ist unveränderlich: Eine Tat gibt den **neuen** Zustand zurück, statt
 * am alten zu drehen. Die Zone hält denselben `Dish` an zwei Stellen
 * (getragen und auf der Station gemerkt), und ein `push` an der einen wäre ein
 * Fehler an der anderen.
 *
 * **Und `on` ist auch das, was *in* etwas ist** — seit der Topf am Spülbecken
 * Wasser bekommt, ist er `dish('pot', ['water'])`. Die Alternative wäre ein
 * eigenes Ding `'pot-water'` gewesen, und sie ist an drei Stellen
 * durchgefallen:
 *
 * - **Das Netz.** Topf und Pfanne kommen aus dem Möbelmodell und werden nie neu
 *   gebaut, sondern behalten ihr Netz und tauschen nur ihren **Belag**
 *   (`worlds/test/zones/kitchen.restyle` → `kitchenProps.FoodKit.topping`). Ein
 *   `'pot-water'` mit leerem `on` hätte dort gar nichts zu tauschen — das
 *   Wasser bräuchte einen eigenen Zweig in der Zone, und der wäre der erste
 *   Sonderfall in einer Datei, die keinen hat.
 * - **Das Ausgießen.** `on` hat bereits einen Weg zurück zu leer: der
 *   Mülleimer räumt ab, was auf einem Träger liegt, und gibt den Träger zurück
 *   (`kitchenCarry.intoBin` → `scrape`). Ein zweites Ding bräuchte eine zweite
 *   Regel, damit man das Wasser wieder los wird.
 * - **Die Namen.** `ITEM_LABELS` führt Dinge im Singular und satzfähig;
 *   „Topf mit Wasser" wäre der einzige Eintrag, der seinen eigenen Träger
 *   schon im Namen trägt, und stünde in „Topf mit Wasser nehmen" einmal zu
 *   viel darin.
 *
 * **Wasser ist trotzdem keine Zutat**, und das garantiert nicht ein Kommentar,
 * sondern `TAKES`: Es steht in **keiner** Zeile rechts, also nimmt kein Träger
 * es an — kein Brötchen, kein Teller, keine Pfanne. Es kommt gar nicht über
 * `combine` in den Topf, sondern über eine eigene Tat an der Spüle. Siehe
 * dort, warum das der springende Punkt ist.
 */
export interface Dish {
  readonly item: KitchenItem;
  /** Was darauf/darin liegt — leer bei allem, was kein Träger ist. */
  readonly on: readonly KitchenItem[];
}

/** Ein Ding, kurz geschrieben — `dish('plate', ['bun'])`. */
export function dish(item: KitchenItem, on: readonly KitchenItem[] = []): Dish {
  return { item, on };
}

/**
 * **Was ein Träger aufnimmt** — und die Tabelle ist zugleich die Antwort auf
 * „warum geht Salat nicht auf ein Patty?": Ein Patty steht hier nicht links.
 *
 * Der **Teller** nimmt alles Fertige und dazu das Brötchen (samt dessen
 * Inhalt); das **Brötchen** alles Fertige außer einem zweiten Brötchen; die
 * **Pfanne** genau ein Patty, in jeder Stufe. Rohes (`patty`, `lettuce`,
 * `tomato`) steht nirgends außer in der Pfanne — es muss erst durch Herd oder
 * Brett.
 *
 * **Verbranntes steht nur noch links bei der Pfanne.** Es auf Teller und
 * Brötchen zu erlauben, war einmal die bequeme Art, den Mist abzuräumen; in
 * Wahrheit baut man damit einen Burger, der an der Theke abgewiesen wird —
 * eine Sackgasse, die erst drei Schritte später auffällt. Die Pfanne behält
 * es, weil es dort ohne Zutun entsteht, und man kippt sie in den Mülleimer
 * aus.
 *
 * Der **dreckige Teller** steht hier gar nicht: Auf ihm liegt nichts, bis er
 * gespült ist.
 *
 * **Und der Topf steht nicht links.** Er hält Wasser (`Dish.on`), und trotzdem
 * bekommt er keine Zeile: Diese Tabelle sagt, was beim **Zusammenlegen**
 * (`combine`) angenommen wird, und Wasser kommt nicht aus einer Hand, sondern
 * aus dem Hahn (`kitchenCarry.atSink`). Eine Zeile `pot: ['water']` änderte
 * daran nichts Gutes und zwei Dinge zum Schlechteren: `isCarrier('pot')` würde
 * wahr, womit `pour` den Topf plötzlich als Ziel prüft — und aus dem
 * hilfreichen „Topf und Tomatenscheibe halten nicht zusammen — es braucht ein
 * Brötchen oder einen Teller darunter" würde „Tomatenscheibe gehört nicht auf
 * Topf". Für eine Zutat, die es als freies Ding nie gibt, ist das ein
 * schlechterer Satz zum Nulltarif.
 *
 * **Umgekehrt ist genau das die Zusicherung**: Weil `water` in keiner Zeile
 * rechts steht, gibt `carries(x, 'water')` für **jedes** `x` falsch. Wasser
 * landet auf keinem Brötchen, auf keinem Teller und in keiner Pfanne — nicht
 * weil niemand daran gedacht hat, sondern weil die Tabelle es nicht hergibt.
 *
 * **Die zweite Speisekarte hängt sich hinten an.** Käse geht auf Teller und
 * Brötchen wie der Salat, gebratener Schinken auf den Teller; die **Schüssel**
 * nimmt Waffel, Suppe und Eiskugeln, der **Pizzakarton** genau eine Pizza,
 * ganz oder geschnitten (`HOLDS_ONE`). Keine der alten Zeilen verliert dabei
 * etwas — wer in der Testwelt einen Burger baut, baut ihn wie vorher.
 */
const TAKES: Partial<Record<KitchenItem, readonly KitchenItem[]>> = {
  plate: [
    'bun',
    'patty-cooked',
    'lettuce-cut',
    'tomato-cut',
    'tomato-soup',
    'cheese-cut',
    'ham-cooked',
    'fries',
  ],
  bun: ['patty-cooked', 'lettuce-cut', 'tomato-cut', 'tomato-soup', 'cheese-cut'],
  pan: ['patty', 'patty-cooked', 'patty-burnt'],
  bowl: ['waffle', 'stew', 'ice-vanilla', 'ice-strawberry'],
  cone: ['ice-vanilla', 'ice-strawberry'],
  pizzabox: ['pizza', 'pizza-cut'],
};

/**
 * **Träger, in die genau ein Ding passt** — und wie sie das im Satz sagen.
 *
 * Die Pfanne war lange der einzige, und ihre beiden Sätze standen deshalb als
 * Sonderfall in `pour`. Mit dem Pizzakarton gibt es einen zweiten: Eine Pizza
 * liegt darin, ganz oder in Stücken, und eine zweite passt nicht hinein. Eine
 * Zeile hier statt eines zweiten `if` daneben — und die Sätze der Pfanne
 * kommen Wort für Wort so heraus wie vorher.
 */
const HOLDS_ONE: Partial<
  Record<KitchenItem, { readonly inside: string; readonly into: string; readonly one: string }>
> = {
  pan: { inside: 'In der Pfanne', into: 'In die Pfanne', one: 'ein Patty' },
  pizzabox: { inside: 'Im Pizzakarton', into: 'In den Pizzakarton', one: 'eine Pizza' },
  // Das Regal hat das Hörnchen nur mit **einer** Kugel (`food_icecream_cone_*`).
  cone: { inside: 'Auf dem Hörnchen', into: 'Aufs Hörnchen', one: 'eine Kugel' },
};

/** Ob auf diesem Ding überhaupt etwas liegen kann. */
export function isCarrier(item: KitchenItem): boolean {
  return TAKES[item] !== undefined;
}

/**
 * **Ob dieses Ding Geschirr ist** — sauber oder dreckig, beides zählt.
 *
 * Spüle und Rückgabe (`kitchenCarry.StationKind`) fragen genau das: Was dort
 * hineingehört, unterscheidet sich vom Essen und vom Gerät, nicht vom
 * Zustand. `isCarrier` taugt dafür nicht — der dreckige Teller trägt nichts,
 * ist aber trotzdem Geschirr.
 */
export function isDishware(item: KitchenItem): boolean {
  return item === 'plate' || item === 'plate-dirty';
}

/** Ob dieser Träger diese Zutat aufnimmt — ohne Ansehen dessen, was schon daraufliegt. */
export function carries(carrier: KitchenItem, item: KitchenItem): boolean {
  return TAKES[carrier]?.includes(item) ?? false;
}

/**
 * **Was aus einer Zutat auf dem Brett wird** — oder `null`, weil sie dort
 * nichts zu suchen hat.
 *
 * Zwei Stufen bei der Tomate, und das ist kein Spaß, sondern die Probe darauf,
 * dass eine **zweite** Schnittstufe überhaupt geht: Wer aus Scheiben Suppe
 * macht, hat den Fortschritt zweimal von vorn laufen lassen.
 */
const CHOPS: Partial<Record<KitchenItem, KitchenItem>> = {
  lettuce: 'lettuce-cut',
  tomato: 'tomato-cut',
  'tomato-cut': 'tomato-soup',
  cheese: 'cheese-cut',
  pizza: 'pizza-cut',
  carrot: 'carrot-cut',
  potato: 'potato-cut',
  onion: 'onion-cut',
};

export function chopStage(item: KitchenItem): KitchenItem | null {
  return CHOPS[item] ?? null;
}

/**
 * **Was aus einem Patty in der Pfanne wird** — roh wird gebraten, gebraten
 * wird verbrannt, und danach ist Schluss.
 *
 * Nach `patty-burnt` kommt kein Ding mehr, sondern **Feuer**, und Feuer ist
 * kein `KitchenItem`, sondern ein Zustand des Herdes (`kitchenClock.ts`).
 * Deshalb endet die Tabelle hier und nicht bei einem `'fire'`, das niemand in
 * die Hand nehmen könnte.
 */
const FRIES: Partial<Record<KitchenItem, KitchenItem>> = {
  patty: 'patty-cooked',
  'patty-cooked': 'patty-burnt',
  // Schinken geht denselben Weg wie das Patty, Stufe für Stufe — und
  // verbrennt deshalb auch genauso (`BURNT`).
  ham: 'ham-cooked',
  'ham-cooked': 'ham-burnt',
  // **Die Waffel ist gebratener Teig**, und die Grillplatte ist das Waffeleisen:
  // ein Möbel mehr wäre ein Möbel, das dasselbe tut. Sie verbrennt nicht — nach
  // der Waffel kommt nichts mehr.
  'dough-flat': 'waffle',
};

export function fryStage(item: KitchenItem): KitchenItem | null {
  return FRIES[item] ?? null;
}

/**
 * **Was verbrannt ist** — und damit nur noch in den Müll gehört.
 *
 * Eine Liste der Ergebnisse und keine zweite Tabelle der Übergänge: Welche
 * Stufe zu welcher verbrennt, steht schon in `FRIES`. Hier steht nur, welche
 * dieser Stufen die schwarze ist. Die sichere Kochstelle lässt genau diese
 * Stufe aus (`kitchenWork.workStage`), die heiße Platte im Laden läuft genau
 * in sie hinein (`plateup/plateUpStations.tickStation`).
 */
const BURNT: readonly KitchenItem[] = ['patty-burnt', 'ham-burnt'];

/** Ob dieses Ding verbrannt ist. */
export function isBurnt(item: KitchenItem): boolean {
  return BURNT.includes(item);
}

/**
 * **Was aus diesem Ding wird, wenn es zu lange liegt** — `null`, wenn es
 * nicht verbrennen kann.
 *
 * Gebratenes Patty wird verbranntes Patty, gebratener Schinken verbrannter
 * Schinken; die Waffel und alles Rohe nicht (das Rohe wird erst gebraten).
 */
export function burnStage(item: KitchenItem): KitchenItem | null {
  const next = fryStage(item);
  return next && isBurnt(next) ? next : null;
}

/**
 * **Was aus einer Zutat unter dem Nudelholz wird** — der Teig wird flach.
 *
 * Eine eigene Tabelle und nicht eine Zeile in `CHOPS`, obwohl das Ausrollen
 * genauso lange dauert und genauso jemanden davor braucht: Sonst ließe sich
 * Teig auf jedem Schneidebrett ausrollen und Käse unter dem Nudelholz
 * schneiden, und das Möbel, auf dem das Nudelholz liegt, wäre nur ein Bild.
 */
const ROLLS: Partial<Record<KitchenItem, KitchenItem>> = {
  dough: 'dough-flat',
};

export function rollStage(item: KitchenItem): KitchenItem | null {
  return ROLLS[item] ?? null;
}

/**
 * **Was im Suppentopf aus Gemüse wird** — Suppe, und zwar aus **einem**
 * geschnittenen Gemüse.
 *
 * Mehrere Sorten nacheinander in denselben Topf wären ehrlicher und sind eine
 * zweite Uhr mit Inhalt; dafür gibt es heute kein Rezept, das es verlangt.
 * Kommt eines, wird aus dieser Tabelle eine Regel über `Dish.on` — bis dahin
 * ist jede Sorte für sich schon eine Suppe.
 */
const COOKS: Partial<Record<KitchenItem, KitchenItem>> = {
  'carrot-cut': 'stew',
  // **Aus der Kartoffel werden Pommes** und keine Suppe mehr — gewünscht war
  // die Pommes-Kette (`fries`). Suppe gibt es weiter aus Karotte und Zwiebel.
  'potato-cut': 'fries',
  'onion-cut': 'stew',
};

export function cookStage(item: KitchenItem): KitchenItem | null {
  return COOKS[item] ?? null;
}

/**
 * **Was im Topf mit Wasser gerade kocht** — die eine Zutat neben dem Wasser,
 * wenn der Topf sie kochen kann (`COOKS`), sonst `null`.
 *
 * Das ist der Topf, den man in die Hand nimmt (`'pot'`), und nicht der
 * eingebaute Suppentopf (`kitchenCarry.StationKind` `'pot'`): Er steht auf
 * einem Herd, bekommt am Spülbecken Wasser (`kitchenCarry.atSink`) und dann
 * eine geschnittene Zutat dazu (`pour`). Was daraus wird, ist dieselbe
 * Tabelle wie im Suppentopf — ein Topf kocht, was im Topf kocht. Die Uhr
 * dazu läuft an der Station (`plateup/plateUpStations.tickStation`), und
 * danach liegt im Topf nur noch das Gekochte: Das Wasser ist verkocht.
 */
export function potCooks(d: Dish): KitchenItem | null {
  if (d.item !== 'pot' || d.on.length !== 2 || !d.on.includes('water')) return null;
  const item = d.on.find((one) => one !== 'water') ?? null;
  return item && cookStage(item) ? item : null;
}

/**
 * **Was einer rohen Zutat fehlt**, als Partizip für den Satz „… muss erst
 * gebraten werden".
 *
 * Eine eigene kleine Tabelle statt einer Ableitung aus `CHOPS`/`FRIES`: Aus
 * `tomato-cut` wird zwar noch Suppe, roh ist sie aber nicht mehr — sie darf
 * auf den Burger. „Roh" heißt hier **muss noch**, nicht **kann noch**.
 */
const RAW: Partial<Record<KitchenItem, string>> = {
  patty: 'gebraten',
  lettuce: 'geschnitten',
  tomato: 'geschnitten',
  cheese: 'geschnitten',
  ham: 'gebraten',
  dough: 'ausgerollt',
  'dough-flat': 'gebacken',
  carrot: 'geschnitten',
  potato: 'geschnitten',
  onion: 'geschnitten',
  // **Geschnittenes Gemüse ist hier noch roh**, anders als die
  // Tomatenscheibe: Die darf auf den Burger, die Karotte gehört nur in den
  // Topf. „Muss noch" und nicht „kann noch" — genau die Regel von oben.
  'carrot-cut': 'gekocht',
  'potato-cut': 'gekocht',
  'onion-cut': 'gekocht',
};

/** Ob dieses Ding erst noch durch Herd oder Brett muss. */
export function isRaw(item: KitchenItem): boolean {
  return RAW[item] !== undefined;
}

/**
 * Was der Mülleimer nimmt — Essen, und sonst nichts. Geschirr steht auch dann
 * nicht darin, wenn es dreckig ist: Ein dreckiger Teller ist kein Abfall,
 * sondern Arbeit, und die wartet in der Spüle.
 *
 * **Wasser steht auch nicht darin**, und es braucht trotzdem keinen eigenen
 * Weg: Ein Topf mit Wasser ist ein Träger mit Inhalt, und Träger mit Inhalt
 * räumt der Mülleimer ab, statt sie zu schlucken (`kitchenCarry.intoBin` →
 * `scrape`). Wer den Topf ausgießen will, hält ihn über den Eimer — der Topf
 * bleibt in der Hand, das Wasser ist weg. Dass `isFood('water')` falsch ist,
 * betrifft nur den Fall, den es gar nicht gibt: Wasser für sich in der Hand.
 */
const FOOD: readonly KitchenItem[] = [
  'bun',
  'patty',
  'patty-cooked',
  'patty-burnt',
  'lettuce',
  'lettuce-cut',
  'tomato',
  'tomato-cut',
  'tomato-soup',
  // Die zweite Speisekarte — alles, was man essen kann, ohne die beiden
  // Träger: Schüssel und Pizzakarton bleiben am Mülleimer in der Hand wie der
  // Teller (`kitchenCarry.intoBin` → `scrape`).
  'cheese',
  'cheese-cut',
  'ham',
  'ham-cooked',
  'ham-burnt',
  'pizza',
  'pizza-cut',
  'dough',
  'dough-flat',
  'waffle',
  'carrot',
  'carrot-cut',
  'potato',
  'potato-cut',
  'onion',
  'onion-cut',
  'stew',
  'fries',
  'ice-vanilla',
  'ice-strawberry',
];

/** Ob dieses Ding in den Müll darf. */
export function isFood(item: KitchenItem): boolean {
  return FOOD.includes(item);
}

/**
 * **Die Schichtung** — in dieser Reihenfolge liegt ein Burger übereinander.
 *
 * Gelegt wird in beliebiger Reihenfolge (`Dish.on` ist eine Menge), gezeigt
 * wird in dieser: Unten das Brötchen, darauf das Patty, dann Salat, dann
 * Tomate. Die Liste steht hier und nicht in der Darstellung, weil sie zur
 * Frage „was ist ein Burger" gehört und nicht zur Frage „welches Netz liegt
 * auf welcher Höhe" — `kitchenProps` liest sie, statt sie zu wiederholen.
 */
export const STACK_ORDER: readonly KitchenItem[] = [
  'bun',
  'patty',
  'patty-cooked',
  'patty-burnt',
  // Schinken und Käse liegen wie beim Cheeseburger direkt auf dem Fleisch.
  'ham-cooked',
  'cheese-cut',
  'lettuce-cut',
  'tomato-cut',
  'tomato-soup',
  // Was in Karton und Schüssel liegt: erst das Feste, dann die Kugeln obenauf.
  'pizza',
  'pizza-cut',
  'waffle',
  'stew',
  'fries',
  'ice-vanilla',
  'ice-strawberry',
];

/** Dieselben Zutaten, von unten nach oben sortiert. */
export function layered(on: readonly KitchenItem[]): readonly KitchenItem[] {
  return [...on].sort((a, b) => STACK_ORDER.indexOf(a) - STACK_ORDER.indexOf(b));
}

/**
 * **Woraus dieses Gericht besteht** — das Essen, ohne den Teller darunter.
 *
 * Der Teller ist Geschirr und keine Zutat: Ein Hamburger auf einem Teller ist
 * derselbe Hamburger wie einer in der Hand, und genau deshalb kann man ihn mit
 * und ohne Teller ausgeben. Alles andere zählt sich selbst mit — ein Brötchen
 * ist die unterste Schicht seines eigenen Burgers.
 */
export function contentsOf(d: Dish): readonly KitchenItem[] {
  return d.item === 'plate' ? d.on : [d.item, ...d.on];
}

/** Ob und warum zwei Dinge zusammengehen. */
export type Combined =
  | {
      readonly ok: true;
      /** Was danach in der Hand ist — `null`, wenn sie leer wird. */
      readonly held: Dish | null;
      /** Was danach an der Station liegt — `null`, wenn sie frei wird. */
      readonly target: Dish | null;
      /** Was gewandert ist — für Hinweis und Meldung. */
      readonly moved: readonly KitchenItem[];
    }
  | { readonly ok: false; readonly why: string };

/** Ein Versuch in eine Richtung: Wer gibt, wer nimmt. */
type Pour =
  | { ok: true; give: Dish | null; take: Dish; moved: readonly KitchenItem[] }
  /** `sure` heißt: Dieser Satz erklärt wirklich den Fall — der andere ist nur ein „geht nicht". */
  | { ok: false; why: string; sure: boolean };

/**
 * **Was ein Ding abgibt**, wenn es mit einem Träger zusammenkommt.
 *
 * Zwei Sonderfälle, und beide stehen so in der Spezifikation: Die **Pfanne**
 * gibt ihr Patty her und bleibt selbst stehen, wo sie war — man nimmt aus der
 * Pfanne nichts heraus, man kippt sie aus. Das **Brötchen** wandert dagegen
 * mitsamt seinem Belag auf den Teller: Ein Teller mit Burger ist ein Teller,
 * auf dem ein Brötchen liegt, und kein Teller mit einem Brötchen darauf, das
 * seinerseits etwas trägt.
 */
function offer(d: Dish): { what: readonly KitchenItem[]; rest: Dish | null } {
  if (d.item === 'pan') return { what: d.on, rest: dish('pan') };
  // **Der Topf gibt her, was in ihm gekocht ist**, wie die Pfanne ihr Patty,
  // und bleibt leer zurück: Die Pommes kommen auf den Teller, nicht der Topf.
  // Nur, wenn alles darin Essen ist — ein Topf mit Wasser (in der Küche der
  // Testwelt der einzige Inhalt, den er je hat) wandert wie bisher selbst.
  if (d.item === 'pot' && d.on.length && d.on.every(isFood)) {
    return { what: d.on, rest: dish('pot') };
  }
  return { what: [d.item, ...d.on], rest: null };
}

/**
 * **Etwas in den Topf mit Wasser** — `null`, wenn es nicht um den Topf und
 * eine Zutat geht, die darin kocht (`cookStage`); dann gilt der Rest von
 * `pour` wie immer.
 *
 * Der Topf ist kein Träger (`TAKES`, dort steht warum), und er wird hier auch
 * keiner: Er nimmt **genau eine** kochbare Zutat, und nur, wenn schon Wasser
 * darin ist. Die Küche der Testwelt hat keine solche Zutat — dort ändert
 * diese Zeile nichts.
 */
function intoPot(giver: Dish, taker: Dish): Pour | null {
  if (taker.item !== 'pot' || giver.on.length || !cookStage(giver.item)) return null;
  if (!taker.on.includes('water')) {
    return { ok: false, why: 'Im Topf ist kein Wasser — erst an der Spüle füllen', sure: true };
  }
  if (taker.on.length > 1) {
    const inside = taker.on.find((item) => item !== 'water')!;
    return { ok: false, why: `Im Topf ist schon ${ITEM_LABELS[inside]}`, sure: true };
  }
  return {
    ok: true,
    give: null,
    take: dish('pot', [...taker.on, giver.item]),
    moved: [giver.item],
  };
}

/**
 * **Warum diese Zutat nicht auf diesen Träger darf** — und was stattdessen zu
 * tun ist.
 *
 * Die Reihenfolge der Fälle ist die Reihenfolge, in der sie jemandem helfen:
 * Erst das Rohe (dagegen kann man sofort etwas tun), dann das Verbrannte (dagegen
 * auch, nur andersherum), dann die Pfanne (sie ist für genau eine Sache da),
 * dann die beiden Fälle, bei denen man die Träger verwechselt hat.
 */
function whyNot(carrier: KitchenItem, item: KitchenItem): string {
  const fix = RAW[item];
  if (fix) return `${ITEM_LABELS[item]} muss erst ${fix} werden`;
  // **Das Verbrannte bekommt seinen eigenen Satz**, und der nennt den einzigen
  // Weg, der ihm noch bleibt. Ohne ihn stünde hier „Verbranntes Patty gehört
  // nicht auf Teller" — richtig, aber ratlos.
  if (isBurnt(item)) return `${ITEM_LABELS[item]} gehört in den Müll`;
  const one = HOLDS_ONE[carrier];
  if (one) return `${one.into} gehört nur ${one.one}`;
  if (item === 'bun') return 'Zwei Brötchen werden kein Burger — dafür braucht es einen Teller';
  if (item === 'plate') return 'Ein Teller gehört unter das Essen und nicht darauf';
  // Eine Schüssel hat ein Innen und kein Oben — „gehört nicht auf Schüssel"
  // wäre der Satz, bei dem man merkt, dass ihn eine Tabelle gebaut hat.
  if (carrier === 'bowl') return `${ITEM_LABELS[item]} gehört nicht in die Schüssel`;
  if (carrier === 'cone') return `Aufs Hörnchen gehört nur Eis`;
  return `${ITEM_LABELS[item]} gehört nicht auf ${ITEM_LABELS[carrier]}`;
}

/** Ein Versuch: `giver` kippt in `taker`. */
function pour(giver: Dish, taker: Dish): Pour {
  const pot = intoPot(giver, taker);
  if (pot) return pot;
  if (!isCarrier(taker.item)) {
    return {
      ok: false,
      why: `Auf ${ITEM_LABELS[taker.item]} lässt sich nichts legen`,
      sure: false,
    };
  }
  const { what, rest } = offer(giver);
  // Nur die Pfanne kann leer abgeben — jeder andere Träger wandert selbst mit.
  if (!what.length) return { ok: false, why: 'In der Pfanne liegt nichts', sure: true };
  const one = HOLDS_ONE[taker.item];
  if (one) {
    if (taker.on.length) {
      return {
        ok: false,
        why: `${one.inside} liegt schon ${ITEM_LABELS[taker.on[0]]}`,
        sure: true,
      };
    }
    if (what.length > 1) return { ok: false, why: `${one.into} passt nur ${one.one}`, sure: true };
  }
  for (const item of what) {
    if (!carries(taker.item, item)) return { ok: false, why: whyNot(taker.item, item), sure: true };
    if (taker.on.includes(item)) {
      return { ok: false, why: `${ITEM_LABELS[item]} liegt schon drauf`, sure: true };
    }
  }
  return { ok: true, give: rest, take: dish(taker.item, [...taker.on, ...what]), moved: what };
}

/** Wenn keiner von beiden ein Träger ist: der hilfreichste Satz dazu. */
function nothingHolds(a: Dish, b: Dish): string {
  const raw = isRaw(a.item) ? a.item : isRaw(b.item) ? b.item : null;
  if (raw) return `${ITEM_LABELS[raw]} muss erst ${RAW[raw]} werden`;
  return `${ITEM_LABELS[a.item]} und ${ITEM_LABELS[b.item]} halten nicht zusammen — es braucht ein Brötchen oder einen Teller darunter`;
}

/**
 * **Zwei Dinge zusammenlegen** — was in der Hand liegt und was an der Station.
 *
 * **Die Reihenfolge ist egal**, und das ist der ganze Witz an dieser Funktion:
 * Es wird beides versucht. Zutat in der Hand auf den Teller an der Zeile, oder
 * Teller in der Hand an die Zutat auf der Zeile — es kommt derselbe Teller
 * dabei heraus, einmal liegen bleibend und einmal in der Hand. Wer bei
 * _Overcooked_ mit dem Teller zur Zutat läuft statt umgekehrt, soll nicht
 * dastehen und nichts verstehen.
 *
 * Geht **keine** Richtung, entscheidet `sure`, welcher der beiden Sätze
 * herauskommt: Der Satz eines Trägers, der die Zutat abgelehnt hat, hilft
 * weiter („muss erst gebraten werden"); der Satz „auf ein Patty lässt sich
 * nichts legen" ist nur die halbe Wahrheit, solange die andere Richtung noch
 * ungeprüft ist.
 */
export function combine(held: Dish, target: Dish): Combined {
  const into = pour(held, target);
  if (into.ok) return { ok: true, held: into.give, target: into.take, moved: into.moved };
  const out = pour(target, held);
  if (out.ok) return { ok: true, held: out.take, target: out.give, moved: out.moved };
  if (into.sure) return { ok: false, why: into.why };
  if (out.sure) return { ok: false, why: out.why };
  return { ok: false, why: nothingHolds(held, target) };
}

/**
 * **Nur eine Richtung: `offer` legt auf `base` auf** — und was dabei entsteht,
 * bleibt auf `base`.
 *
 * Der Unterschied zu `combine` ist die **Unbestimmtheit**, die dort gewollt
 * ist und hier schädlich wäre. `combine` versucht beide Richtungen, weil ein
 * Spieler mit dem Teller zur Tomate laufen darf oder mit der Tomate zum
 * Teller — es kommt derselbe Teller heraus, einmal in der Hand und einmal auf
 * der Zeile. Ein **Möbel** hat diese Freiheit nicht: Der Kombinierer
 * (`kitchenCombiner.ts`) hat ein Oben und eine Seite, und was er baut, muss
 * oben liegen bleiben. Ließe man ihn `combine` fragen, stünde der fertige
 * Burger die Hälfte der Zeit auf der **Zulieferkachel** — bei einem Teller
 * oben und einem Brötchen von der Seite genau so: `pour(Brötchen, Teller)`
 * schlägt fehl, `pour(Teller, Brötchen)` gelingt, und das Ergebnis landete
 * dort, wo das Brötchen herkam.
 *
 * Deshalb dieselbe Rechnung, nur einmal statt zweimal — und deshalb ist es
 * eine Zeile hier und keine zweite in `kitchenCombiner.ts`: `pour` ist die
 * Stelle, an der steht, was auf was darf, und sie soll es einmal sagen.
 *
 * `moved` ist wie bei `combine` das Gewanderte; `held` ist, was dem Anbieter
 * bleibt (die leere Pfanne — sonst `null`), `target` der neue Stand von
 * `base`.
 */
export function stackOn(offer: Dish, base: Dish): Combined {
  const filled = pour(offer, base);
  if (!filled.ok) return { ok: false, why: filled.why };
  return { ok: true, held: filled.give, target: filled.take, moved: filled.moved };
}

/** Ein Rezept: wie es heißt und was daraufgehört. */
export interface Recipe {
  readonly id: string;
  readonly label: string;
  /** Die Zutaten — als **Menge** gelesen, nicht als Reihenfolge. */
  readonly needs: readonly KitchenItem[];
}

/**
 * **Die fünf Burger**, vom nackten bis zum vollen.
 *
 * Alle sind Obermengen des ersten, und das ist Absicht: Man legt auf, was man
 * hat, und bekommt das Rezept, zu dem es passt — statt vorher eines zu wählen
 * und dann die Liste abzuarbeiten. Bei _Overcooked_ sagt der Zettel, was
 * gebraucht wird; hier gibt es noch keine Runde, die Zettel austeilt
 * (`AGENTS.md`), also sagt der Stapel, was daraus geworden ist.
 *
 * **Brötchen und gebratenes Patty sind in jedem drin.** Ein „Burger" aus Salat
 * und Tomate ist ein Salat, und ein Brötchen allein ist ein Brötchen — beides
 * sind keine Rezepte, sondern ein unfertiger Stapel. Der _Suppenburger_ steht
 * mit in der Liste, weil die zweite Schnittstufe sonst nirgends ankäme.
 */
export const RECIPES: readonly Recipe[] = [
  { id: 'hamburger', label: 'Hamburger', needs: ['bun', 'patty-cooked'] },
  { id: 'salat', label: 'Salatburger', needs: ['bun', 'patty-cooked', 'lettuce-cut'] },
  { id: 'tomate', label: 'Tomatenburger', needs: ['bun', 'patty-cooked', 'tomato-cut'] },
  { id: 'suppe', label: 'Suppenburger', needs: ['bun', 'patty-cooked', 'tomato-soup'] },
  {
    id: 'deluxe',
    label: 'Burger Deluxe',
    needs: ['bun', 'patty-cooked', 'lettuce-cut', 'tomato-cut'],
  },
];

/**
 * **Alles, was gebraten ist und trotzdem in keiner Liste steht** — Suppe mit
 * Salat, Tomate mit Suppe, und was sonst noch jemandem einfällt.
 *
 * Ohne diesen Auffangposten wäre jede Zutatenmischung außerhalb der fünf
 * Rezepte an der Ausgabe ein `refuse` — und der Spieler bekäme für zwei
 * ehrliche Arbeitsschritte ein „das ist kein Burger" zu lesen, obwohl ein
 * Brötchen mit gebratenem Patty in seiner Hand liegt. `needs` ist hier das
 * **Mindeste** und nicht die genaue Menge; `recipeOf` gibt ihn nie zurück, er
 * kommt nur aus `served`.
 */
export const FREESTYLE: Recipe = {
  id: 'eigen',
  label: 'Burger nach Art des Hauses',
  needs: ['bun', 'patty-cooked'],
};

/**
 * **Welches Rezept diese Zutaten sind** — oder `null`, solange es keines ist.
 *
 * Verglichen wird als Menge: Wer erst die Tomate und dann das Patty auflegt,
 * hat denselben Burger. Die Reihenfolge entscheidet nur, wie er **aussieht**
 * (`layered`).
 */
export function recipeOf(parts: readonly KitchenItem[]): Recipe | null {
  return (
    RECIPES.find(
      (recipe) =>
        recipe.needs.length === parts.length && recipe.needs.every((need) => parts.includes(need)),
    ) ?? null
  );
}

/**
 * **Reicht das für die Ausgabe?** — das Rezept, unter dem es über die Theke
 * geht, oder `null`.
 *
 * Die Bedingung ist absichtlich weich: ein **Brötchen** und mindestens ein
 * **gebratenes** Patty, mit oder ohne Teller darunter, Extras erlaubt. Hart
 * ist nur das Verbrannte — wer ein schwarzes Patty einbaut, serviert es nicht,
 * sondern räumt es ab. Eine Küche, die nur die fünf Listen annimmt, bestraft
 * das Ausprobieren, und Ausprobieren ist hier der ganze Sinn.
 */
export function served(d: Dish): Recipe | null {
  const parts = contentsOf(d);
  if (parts.some(isBurnt)) return null;
  if (!parts.includes('bun') || !parts.includes('patty-cooked')) return null;
  return recipeOf(parts) ?? FREESTYLE;
}

/**
 * **Warum das noch nicht über die Theke geht** — ein Satz, der sagt, was
 * fehlt.
 *
 * Es gibt genau drei Gründe, und jeder hat seinen eigenen nächsten Schritt:
 * kein Brötchen, kein gebratenes Patty, oder etwas Verbranntes dazwischen.
 */
export function whyNotServed(d: Dish): string {
  const parts = contentsOf(d);
  if (parts.some(isBurnt)) return 'Verbranntes wird nicht serviert — ab in den Müll';
  if (!parts.includes('bun')) return 'Dafür fehlt noch das Brötchen';
  if (!parts.includes('patty-cooked')) return 'Dafür fehlt noch ein gebratenes Patty';
  return 'Das ist noch kein Burger';
}

/**
 * **Wie ein Gericht heißt, wenn etwas darauf liegt.**
 *
 * Ein fertiges Gericht heißt nach seinem Rezept („Teller mit Hamburger"), ein
 * unfertiges zählt auf, was daraufliegt („Pfanne (Rohes Patty)"). Die Klammer
 * statt eines „mit" ist kein Geschmack, sondern Deutsch: „mit Rohes Patty"
 * wäre falsch, und die richtige Beugung bräuchte eine zweite Namenstabelle nur
 * für den Dativ — zu viel Aufwand für einen Hinweis über einer Figur.
 */
export function dishLabel(d: Dish): string {
  if (!d.on.length) return ITEM_LABELS[d.item];
  const recipe = served(d);
  if (recipe) return `${ITEM_LABELS[d.item]} mit ${recipe.label}`;
  return `${ITEM_LABELS[d.item]} (${layered(d.on)
    .map((item) => ITEM_LABELS[item])
    .join(', ')})`;
}
