/**
 * **Der Möbelkatalog der Küche** — was es gibt, wie groß es ist und wie es
 * heißt. Ohne three.js, ohne Vite, ohne Datei.
 *
 * Getrennt von `core/kitchenModel.ts` aus demselben Grund wie bei der Figur
 * (`core/chefFit.ts`): Der Lader dort braucht `GLTFLoader` und `import.meta`,
 * und beides gibt es in Jest nicht. Was ein Editor über ein Möbel wissen muss
 * — Name, Beschriftung, Grundfläche, Höhe —, sind Zahlen, und die stehen hier.
 *
 * Geschrieben werden sie von `tools/kitchen-model.mjs --list`. Wer die Quelle
 * austauscht, lässt das Werkzeug laufen und trägt die neue Liste ein — und
 * rechnet dabei `KITCHEN_SCALE` mit, siehe dort.
 */

/**
 * **Die Möbel kommen doppelt so groß, wie sie sein sollen** — also halbiert.
 *
 * Nachgemessen an der Datei: Eine Spüle ist dort 4 × 2,1 m groß und 2,3 m
 * hoch, ein Feuerlöscher 2 × 2 m und 2,5 m hoch, und der schmalste Unterschrank
 * belegt 2 × 2 m. Das ist keine Küche, das ist eine Turnhalle: Neben einem Koch
 * von 1,60 m (`core/chefFit.ts`) reichte ein Tresen bis über die Augen, und ein
 * einzelner Schrank war fünfmal so breit wie die Figur davor.
 *
 * Halbiert stimmt es: Ein Unterschrank belegt **eine** Kachel und ist einen
 * halben Meter hoch — beim Vorbild liegt die Arbeitsplatte auf einem guten
 * Drittel der Figurenhöhe, und genau dort liegt sie jetzt auch.
 *
 * Der Faktor sitzt am **Lader** (`core/kitchenModel.ts`) und nicht in der
 * Quelldatei: Die ist fremde Arbeit und wird nicht angefasst, und ein zweites
 * Aufbereiten für eine Zahl wäre 32 MB Rohdaten für einen Faktor. Die Maße in
 * diesem Katalog sind die **fertigen** — was hier steht, ist, wie groß ein
 * Möbel im Spiel ist.
 */
export const KITCHEN_SCALE = 0.5;

/** Ein Möbel im Katalog. */
export interface KitchenPiece {
  /** Der Name des Knotens in `public/models/kitchen.glb`. */
  readonly name: string;
  /** Wie es im Menü heißt. */
  readonly label: string;
  /** Wie viele Kacheln es belegt (`worlds/nav/navTile.TILE` = 1 m). */
  readonly tiles: readonly [x: number, z: number];
  /**
   * Wie hoch es ist, in Metern — für Kopffreiheit und Sicht.
   *
   * Gemessen am **Möbel** und von seinem eigenen Fuß aus, nicht vom Boden des
   * Raums: Ein Stück mit `bury` steckt ein paar Zentimeter im Estrich und ragt
   * entsprechend weniger weit heraus (`height − bury`). Der Katalog nennt
   * weiter das Maß der Quelle, damit ein zweiter Lauf des Werkzeugs nachrechnen
   * kann, was in der Datei steht.
   */
  readonly height: number;
  /**
   * Ob es **hängt** statt zu stehen: Dann ist `height` seine Oberkante und
   * darunter läuft man durch.
   *
   * **In dieser Fassung der Quelle tut es keines.** Der Katalog führte das
   * Ausgaberegal als hängendes Stück von 3,52 m — die Datei sagt etwas
   * anderes: Es fängt wie jedes andere Möbel bei y = 0 an und ist 1,13 m hoch,
   * also ein Regal, das auf dem Boden steht. Das war keine Kleinigkeit,
   * sondern ein Loch: Ein hängendes Stück bekommt weder Körper noch
   * Wegaufschlag (`worlds/test/zones/kitchen.ts`), und man lief mitten durch
   * das Regal hindurch. Das Feld bleibt trotzdem — eine Dunstabzugshaube in
   * einer nächsten Quelle braucht es wieder.
   */
  readonly hanging?: boolean;

  /**
   * **Wo die Arbeitsfläche liegt**, in Metern über dem **Fuß des Möbels** —
   * dort landet, was jemand ablegt (`worlds/test/zones/kitchen.ts`).
   *
   * Sie ist bei den meisten Möbeln dasselbe wie `height`, und deshalb steht
   * sie nur dort, wo sie es **nicht** ist: Auf dem Herd mit dem Topf ist
   * `height` die Oberkante des **Topfes** (0,87 m) und nicht die der Platte
   * (0,55 m) — ein Brötchen, das auf `height` abgelegt würde, schwebte eine
   * Handbreit über dem Deckel.
   *
   * **Über dem Fuß und nicht über dem Boden**, seit es `bury` gibt: Wer wissen
   * will, wie hoch die Fläche im Raum liegt, fragt `kitchenWorkHeight`. Die
   * Zone rechnet ohnehin von dem Punkt aus, an dem das Möbel steht
   * (`kitchen.ts`, `standAt` gibt ihn zurück) — und der ist bei einem
   * eingelassenen Möbel nicht der Fußboden.
   */
  readonly deck?: number;

  /**
   * Ob man auf diesem Möbel **etwas ablegen** kann.
   *
   * Nicht jede waagerechte Fläche ist eine: In den Mülleimer wird geworfen
   * und nicht gelegt, und das Ausgaberegal steht über der Theke
   * (`worlds/test/zones/kitchen.ts`).
   *
   * **Umgekehrt ist jedes Möbel mit `holds` eine.** Der Hocker unter dem
   * Feuerlöscher sah lange nach keiner Ablage aus — bis der Löscher in die
   * Hand soll: Wohin er zurückgestellt wird, ist eine Fläche. Ohne dieses
   * Feld meldet sich die Stelle gar nicht erst, und dann wird auch nichts
   * abgenommen (`worlds/test/zones/kitchen.ts`, `addStations`: Ein Möbel
   * ohne Stationsart und ohne `worktop` wird übersprungen, `holds` hin oder
   * her).
   */
  readonly worktop?: boolean;

  /**
   * **Was man von diesem Möbel herunternehmen kann** — der Topf, die Pfanne,
   * der Feuerlöscher.
   *
   * Das Stück ist im Modell ein **eigenes Netz** (Material `Kitchen_Utensils`,
   * `core/kitchenModel.ts`): Ein Herd mit Topf ist eine Gruppe aus Korpus und
   * Topf, und wer den Topf nimmt, lässt einen leeren Herd stehen. Ohne dieses
   * Feld wüsste die Küche nicht, dass es dort überhaupt etwas zu greifen gibt.
   *
   * **Der Feuerlöscher gehört dazu, und das ist nachgemessen und nicht
   * angenommen.** In der Datei ist `extinguisher` genau dieselbe Bauart wie
   * ein Herd mit Topf: ein Korpus aus `Kitchen_Cabins` von y = 0,000 bis
   * 1,000 (Quellmaß, halbiert 0,500 m) — das ist der **Hocker** — und darüber
   * **ein einziges** Netz aus `Kitchen_Utensils` von y = 1,002 bis 2,497
   * (halbiert 0,501 bis 1,249 m), der Löscher selbst.
   * `core/kitchenModel.takeUtensil` nimmt das erste Netz dieses Materials und
   * findet damit ohne eine Zeile Sonderfall den Löscher — und lässt den
   * Hocker stehen, auf den er zurückgehört.
   *
   * Die Namen sind die der **getragenen Dinge**
   * (`worlds/test/zones/kitchenRecipes.KitchenItem`) und keine zweite Liste:
   * Was hier steht, legt die Küche unverändert als getragenes Ding auf die
   * Fläche darunter (`worlds/test/zones/kitchen.ts`, `addStations`).
   */
  readonly holds?: 'pot' | 'pan' | 'extinguisher';

  /**
   * **Wie weit das Möbel aus der Mitte seiner Kachel rückt**, in Metern
   * (x, z) — der Ausgleich dafür, dass die Kachelmitte nicht immer die Mitte
   * dessen ist, was man sieht. Zwei Gründe dafür sind gemessen, und beide
   * stehen unten: ein Griff, der übersteht, und ein Möbel, das flacher ist
   * als seine Nachbarn.
   *
   * **Positiv ist nach Süden und nach Osten**, in der eigenen Drehung des
   * Möbels (`worlds/test/zones/kitchen.ts`, `place`) — ein um 180° gedrehter
   * Herd rückt nach der anderen Seite.
   *
   * Der Ursprung eines Möbels liegt in der Mitte seiner **ganzen** Hülle
   * (`tools/kitchen-model.mjs`), und beim Herd mit der Pfanne gehört der
   * Pfannenstiel dazu: Er ragt 16 cm nach Süden heraus, also wanderte der
   * **Korpus** beim Zentrieren 7,8 cm nach Norden — und stand damit als
   * einziger Herd aus der Reihe. Genau diese 7,8 cm stehen hier.
   *
   * Gemessen und nicht geschätzt: Der Korpus (Material `Kitchen_Cabins`)
   * reicht in der Datei von z = −0,610 bis z = +0,453, seine Mitte liegt also
   * bei −0,078.
   *
   * **Und beim Schneidebrett steht gar nichts über — es ist zu flach.** Die
   * Küchenzeile ist 1,0612 m tief (Quelle 2,1224 m), das Brett 0,9999 m
   * (Quelle 1,9998 m), und beide sitzen in ihrer eigenen Datei mittig um
   * z = 0. Auf einer gemeinsamen Kachelmitte sprang das Brett deshalb **vorn
   * und hinten je 3,07 cm zurück** — sichtbar als Delle in einer Zeile aus
   * Zeile, Brett, Zeile (`worlds/test/zones/kitchen.ts`, beide Bretter stehen
   * so).
   *
   * Auszugleichen ist nur **eine** Seite, denn ein flaches Möbel bleibt flach:
   * 0,5306 − 0,4999 = **0,0307 m nach Süden**. Die Vorderkante gewinnt, weil
   * man nur sie sieht — davor steht die Figur, dort greift sie zu, und eine
   * Kante, die um drei Zentimeter versetzt durchläuft, fällt sofort auf.
   * Hinten wächst die Lücke dafür auf 6,1 cm; die zeigt zur Wand und ist von
   * keinem Standpunkt aus im Bild.
   */
  readonly align?: readonly [x: number, z: number];

  /**
   * **Wie tief das Möbel im Boden steckt**, in Metern — derselbe Ausgleich wie
   * `align`, nur nach unten statt zur Seite (`worlds/test/zones/kitchen.ts`,
   * `standAt`).
   *
   * Es gibt genau einen Fall, und er hat drei Anläufe gebraucht: das
   * **Schneidebrett**. Auf seinem Korpus liegt ein Brett, das Brett ist 3,3 cm
   * dick, und damit lag seine Arbeitsfläche 3,3 cm über der der Küchenzeile
   * daneben. In einer Zeile aus Zeile, Brett, Zeile ist das eine **Stufe**, und
   * aus 55° von oben (`core/topDownPose.TOP_DOWN_TILT`) läuft sie quer durchs
   * Bild.
   *
   * **An dieser Stelle stand lange die Gegenrede**, und sie ist widerlegt: Die
   * 3,3 cm *seien* das Brett, ein Schneidebrett liege nun einmal auf der
   * Platte, also bleibe die Stufe. Gewollt ist aber eine durchgehende
   * Arbeitsfläche — und die kostet das Brett nichts, weil nicht das **Brett**
   * in die Platte versenkt wird (dann wäre es unsichtbar, es ist genau so dick
   * wie die Stufe), sondern das **ganze Möbel** um die Brettdicke tiefer steht.
   * Oben fluchtet es damit, unten verschwinden 3,3 cm im Estrich.
   *
   * **Und unten ist dort nichts, was man sehen können muss.** Gemessen an der
   * Quelle: Unter y = 0,065 steht der Korpus nur bis ±0,900 statt ±1,000, also
   * im Spiel **5 cm hinter der Kante der Deckplatte** zurück und von deren
   * Überstand verdeckt; und zwischen y = 0,015 und y = 0,427 (halbiert 0,007
   * bis 0,214 m) hat der Korpus überhaupt keine Kante — die unterste Fuge, die
   * man daran sieht, liegt 21 cm über dem Boden und damit sechsmal so hoch wie
   * das, was versenkt wird. Im Estrich steckt eine glatte Sockelleiste im
   * Schatten der Platte.
   *
   * **Was dadurch nicht kippt**: `height` und `deck` messen weiter das Möbel
   * selbst, von seinem eigenen Fuß aus — nur der Fuß liegt tiefer. Die
   * Ablagehöhe im Raum ist deshalb `kitchenWorkHeight`, und die ist beim Brett
   * auf den Millimeter die der Küchenzeile.
   *
   * **Nicht zu verwechseln mit `Spot.lift`** (`worlds/test/zones/kitchenPlan.ts`):
   * Das hebt ein Möbel an **einer Stelle** an — das Ausgaberegal über der Theke
   * — und lässt dabei den Körper weg, damit man darunter durchläuft. `bury`
   * gehört dem **Möbel**: Das Brett steht zweimal in der Küche und einmal im
   * Schauraum, und es soll überall gleich stehen.
   */
  readonly bury?: number;

  /**
   * **Dieses Stück steckt nicht in `public/models/kitchen.glb`, sondern wird
   * gebaut.**
   *
   * Das klingt nach einem Bruch des Katalogs und ist keiner: Diese Liste
   * beschreibt, **was in der Küche steht** — nicht, was gekauft wurde. Die
   * Quelle ist fremde Arbeit mit einer Lizenz (`public/models/CREDITS.md`),
   * sie hat dreizehn Möbel, und sie wird nicht angefasst. Ein Band ist
   * trotzdem ein Möbel dieser Küche: Es belegt eine Kachel, es ist 0,53 m
   * hoch, man legt etwas darauf. Genau diese Zahlen will jeder haben, der den
   * Aufbau plant (`worlds/test/zones/kitchenPlan.ts`), den Grundriss stempelt
   * (`worlds/test/testPlan.ts`) oder den Schauraum füllt — und ob das Netz
   * dahinter geladen oder aus Zylindern gebaut ist, geht keinen davon etwas
   * an. Eine zweite Liste neben dieser wäre die, die beim übernächsten Möbel
   * auseinanderläuft.
   *
   * **Was ein Lader damit tun muss**: `core/kitchenModel.kitchenModel` sucht
   * den Namen als Knoten in der Datei und gibt `null`, wenn er nicht darin
   * steht. Für ein gebautes Stück ist dieses `null` **kein Fehlschlag** —
   * nicht „Modell fehlt, nimm den Ersatzbaustein", sondern „hier ist die Zone
   * dran". Wer `built` nicht liest, meldet eine fehlende Datei, die es nicht
   * gibt, und stellt einen grauen Würfel dorthin, wo ein Band stehen soll.
   * Umgekehrt gilt es genauso: Wer ein Stück **ohne** `built` nicht in der
   * Datei findet, hat einen Tippfehler im Namen — und diese Unterscheidung
   * gibt es ohne dieses Feld nicht.
   */
  readonly built?: boolean;
}

/**
 * **Die dreizehn Möbel der Quelle und zwei gebaute dazu**, in der
 * Reihenfolge, in der sie aus der Datei fallen — mit den Maßen, die sie **im
 * Spiel** haben, also halbiert (`KITCHEN_SCALE`).
 *
 * Die beiden gebauten sind das **Förderband** und das **Zugband**: Sie stehen
 * am Ende, sie tragen `built: true`, und sie sind die einzigen Stücke ohne
 * Knoten in der Quelle (siehe `KitchenPiece.built`). Wer das Werkzeug neu
 * laufen lässt, ersetzt die dreizehn davor und lässt die beiden stehen.
 *
 * Die Kachelzahl ist die gerundete Grundfläche und nicht die aufgerundete:
 * Ein Unterschrank ist einen Meter breit und 1,06 m tief, und wer daraus zwei
 * Kacheln macht, stellt eine ganze Reihe davon mit einem Meter Luft dazwischen
 * auf. Ein Möbel darf ein paar Zentimeter über seine Kachel hinausragen; eine
 * Küche mit Lücken darin ist keine Küche.
 *
 * Die Maße der **Quelle** stehen daneben, damit ein zweiter Lauf des Werkzeugs
 * nachrechenbar bleibt: 2 × 2 m und 1 m hoch für einen Unterschrank, 4 m breit
 * für Spüle, Ausgabetheke und Regal.
 */
export const KITCHEN_PIECES: readonly KitchenPiece[] = [
  {
    name: 'plate-counter',
    label: 'Tellerausgabe',
    tiles: [1, 1],
    height: 0.56,
    deck: 0.5,
    worktop: true,
  },
  {
    name: 'extinguisher',
    label: 'Feuerlöscher',
    tiles: [1, 1],
    // 1,25 m ist die Oberkante des **Löschers**, 0,50 m die des Hockers
    // darunter — dieselbe Teilung wie beim Herd mit Topf, und aus demselben
    // Grund getrennt: Wer den Löscher abnimmt und wieder hinstellt, stellt
    // ihn auf den Hocker und nicht auf seine eigene Kappe.
    height: 1.25,
    deck: 0.5,
    worktop: true,
    holds: 'extinguisher',
  },
  { name: 'sink', label: 'Spüle', tiles: [2, 1], height: 1.15 },
  { name: 'bin', label: 'Mülleimer', tiles: [1, 1], height: 0.45 },
  { name: 'table', label: 'Arbeitstisch', tiles: [1, 1], height: 0.5, worktop: true },
  { name: 'serve-counter', label: 'Ausgabe', tiles: [1, 1], height: 0.46, worktop: true },
  {
    name: 'board',
    label: 'Schneidebrett',
    tiles: [1, 1],
    height: 0.57,
    // **0,533 m, und das ist die Oberseite des Bretts — nicht die des
    // Messers.**
    //
    // Ohne diesen Eintrag war die Ablage `height`, und `height` ist hier die
    // Spitze des **Hackmessers**, das auf dem Brett liegt: In der Datei reicht
    // das Netz aus `Kitchen_Utensils` bis y = 1,148 (halbiert 0,574 m). Ein
    // Salatkopf, der dort abgelegt wurde, schwebte eine gute Daumenbreite über
    // dem Brett — 3,7 cm, und aus 55° von oben
    // (`core/topDownPose.TOP_DOWN_TILT`) sieht man genau diesen Spalt.
    //
    // Gemessen und nicht geschätzt, alles in Quellmaß, halbiert daneben:
    //
    // - Der **Korpus** (`Kitchen_Cabins`) reicht von y = 0,000 bis 1,000 —
    //   halbiert **0,500 m**, und das ist auf den Millimeter dieselbe Zahl wie
    //   bei der Küchenzeile daneben (`counter`, ebenfalls 1,000 → 0,500 m).
    //   Die **Korpusse** standen also von Anfang an gleich hoch — die Stufe war
    //   allein das aufliegende Brett, und genau deshalb geht sie unten wieder
    //   ab und nicht oben (`bury`).
    // - Darauf **liegt das Brett**: eine Platte von y = 0,998 bis 1,065, ihre
    //   Deckfläche halbiert **0,5326 m** (die größte waagerechte Fläche des
    //   Netzes, 1,63 m² in Quellmaß — das Brett und nichts anderes).
    // - Darüber das **Messer** bis 1,148 → 0,574 m, gerundet die 0,57 von
    //   `height`.
    //
    // Die 3,3 cm, um die die Arbeitsfläche damit über dem Korpus liegt, **sind
    // das Brett**: Es ist genau so dick (0,067 in der Quelle). Deshalb wird
    // auch nicht an dieser Zahl gedreht — sie ist gemessen und stimmt.
    deck: 0.533,
    // **Und dieselben 3,3 cm gehen unten wieder ab.** Sie waren die Stufe
    // zwischen Brett und Küchenzeile, und die Zeile soll eine Linie sein und
    // keine Treppe: 0,533 − 0,033 = **0,500 m**, auf den Millimeter die
    // Arbeitsplatte von `counter` (`kitchenWorkHeight`). Versenkt wird das
    // **Möbel** und nicht das Brett — das bleibt obenauf sichtbar, im Boden
    // steckt nur Sockelleiste (siehe `KitchenPiece.bury`).
    bury: 0.033,
    worktop: true,
    // 3,07 cm nach Süden: Das Brett ist 0,9999 m tief, die Küchenzeile neben
    // ihm 1,0612 m — so fluchtet die Vorderkante (`KitchenPiece.align`).
    align: [0, 0.031],
  },
  { name: 'plate-rack', label: 'Ausgaberegal', tiles: [2, 1], height: 0.56 },
  { name: 'pass', label: 'Ausgabetheke', tiles: [2, 1], height: 0.53, worktop: true },
  { name: 'counter', label: 'Küchenzeile', tiles: [1, 1], height: 0.5, worktop: true },
  {
    name: 'stove',
    label: 'Herd',
    tiles: [1, 1],
    // **0,55 m, und die bleiben, obwohl die Zeile auf 0,50 m arbeitet.** Das
    // ist kein zweiter Fall von `board`: Das **Blech** des Herds endet in der
    // Quelle bei y = 1,000 — halbiert 0,500 m, bündig mit `counter` —, und die
    // 5 cm darüber sind die **Kochstelle** (Quelle bis 1,100). Auf der steht
    // ein Topf und nicht ein Salatkopf: Der Topf von `stove-pot` fängt bei
    // 1,110 an, sitzt also genau darauf. Wer den Herd um diese 5 cm tiefer
    // stellte, versenkte jeden Topf in der Kochstelle.
    height: 0.55,
    worktop: true,
  },
  {
    name: 'stove-pot',
    label: 'Herd mit Topf',
    tiles: [1, 1],
    height: 0.87,
    deck: 0.55,
    worktop: true,
    holds: 'pot',
  },
  {
    name: 'stove-pan',
    label: 'Herd mit Pfanne',
    tiles: [1, 1],
    height: 0.68,
    deck: 0.55,
    worktop: true,
    holds: 'pan',
    align: [0, 0.078],
  },
  {
    name: 'belt',
    label: 'Förderband',
    tiles: [1, 1],
    // **0,53 m, und die Zahl ist abgeschrieben — mit Absicht.** Ein
    // Förderband ist in dieser Küche die Verlängerung der **Ausgabetheke**:
    // Was daraufliegt, fährt weiter und wird am anderen Ende abgeholt. Damit
    // es danach aussieht, muss es auf derselben Höhe laufen wie `pass`
    // (0,53 m) — ein Band, das drei Zentimeter tiefer oder höher steht als die
    // Theke daneben, ist in der Sicht von oben eine Stufe, die niemand
    // erklären kann. Eine eigene, hübschere Zahl (0,50 wie der Arbeitstisch,
    // 0,55 wie der Herd) wäre genau das: hübscher und falsch.
    //
    // Unterschied zur Theke ist allein die Grundfläche: `pass` belegt zwei
    // Kacheln, das Band **eine** — drei davon in einer Reihe sind eine
    // Strecke, zwei Doppelkacheln wären ein zweiter Tresen.
    height: 0.53,
    worktop: true,
    built: true,
  },
  {
    name: 'belt-pull',
    label: 'Zugband',
    tiles: [1, 1],
    // **Dieselbe Zahl wie beim Förderband, und zwar dieselbe Zeile weiter
    // oben.** Ein Zugband ist ein Förderband mit einem Griff nach hinten: Es
    // steht in derselben Reihe, nimmt dieselbe Kachel ein und läuft auf
    // derselben Höhe. Wäre es auch nur einen Zentimeter höher, stünde von oben
    // eine Stufe mitten in der Bahn — an genau der Stelle, an der ein Teller
    // von einem Band auf das nächste fährt.
    //
    // Warum es trotzdem ein **zweites** Stück im Katalog ist und keine
    // Einstellung am ersten: Im Baumodus hebt man Möbel auf und stellt sie
    // wieder hin (`zones/kitchenBuild.ts`), und was man dabei in der Hand hat,
    // ist ein Katalogstück. Ein Band, das man nach dem Aufstellen erst noch
    // umschalten müsste, wäre ein Möbel mit einem unsichtbaren Schalter; zwei
    // Stücke sind zwei Möbel, und man sieht ihnen an, welches man trägt.
    height: 0.53,
    worktop: true,
    built: true,
  },
];

/** Die Namen allein — für Listen, die keine Maße brauchen. */
export const KITCHEN_NAMES: readonly string[] = KITCHEN_PIECES.map((piece) => piece.name);

/** Ein Möbel nach Namen, oder `undefined` — Fremdtext kommt über das Netz. */
export function kitchenPiece(name: string): KitchenPiece | undefined {
  return KITCHEN_PIECES.find((piece) => piece.name === name);
}

/**
 * **Wo auf diesem Möbel etwas liegt**, in Metern über seinem Fuß.
 *
 * Eine Zeile und keine drei an jeder Aufrufstelle: `deck` steht nur dort im
 * Katalog, wo es von `height` abweicht (siehe `KitchenPiece.deck`), und wer
 * das von Hand nachschlägt, vergisst es beim nächsten Möbel.
 */
export function kitchenDeck(piece: KitchenPiece): number {
  return piece.deck ?? piece.height;
}

/**
 * **Wie hoch die Arbeitsfläche über dem Boden liegt**, in Metern — dieselbe
 * Fläche wie `kitchenDeck`, nur von unten gemessen statt vom Fuß des Möbels.
 *
 * Das ist die Zahl, über die sich in der Küche eine **Zeile** bildet: Küchenzeile
 * und Schneidebrett und Tellerausgabe sollen nebeneinander eine durchgehende
 * Platte ergeben, und ob ein Möbel dafür ein paar Zentimeter im Estrich steckt
 * (`KitchenPiece.bury`), ist die Sache des Möbels und nicht die dessen, der die
 * Zeile ansieht. Vorher war diese Zahl `kitchenDeck` — und solange kein Möbel
 * eingelassen war, war das dasselbe; beim Brett ist es das nicht mehr, und wer
 * die beiden verwechselt, misst die Stufe wieder herbei, die gerade abgeräumt
 * wurde.
 *
 * Die Zone braucht sie nicht: Sie rechnet vom Fuß aus, den sie beim Hinstellen
 * ohnehin in der Hand hat (`worlds/test/zones/kitchen.ts`, `standAt`). Gebraucht
 * wird sie da, wo zwei Möbel **verglichen** werden.
 */
export function kitchenWorkHeight(piece: KitchenPiece): number {
  return kitchenDeck(piece) - (piece.bury ?? 0);
}

/**
 * **Wo in der abgenommenen Pfanne die Mulde liegt**, in Metern (x, z) — der
 * Versatz von ihrem Ursprung zur Mitte des Bratraums.
 *
 * Ein abgenommenes Gerät bekommt seinen Ursprung in der Mitte seiner **ganzen**
 * Hülle (`core/kitchenModel.takeUtensil`), und zur Hülle einer Pfanne gehört
 * der **Stiel**. Genau daran lag das Patty schief: Es wird auf `x/z = 0` des
 * Trägers gelegt (`worlds/test/zones/kitchen.ts`, `restyle` →
 * `kitchenProps.FoodKit.topping`), und dieser Punkt ist nicht die Mulde,
 * sondern die Mitte aus Mulde **und** Stiel — also ein gutes Stück zum Griff
 * hin. Auf dem Bild lag das Fleisch halb über dem Pfannenrand.
 *
 * **Aus der Geometrie gerechnet und nicht geschätzt** (Quellmaß aus
 * `public/models/kitchen.glb`, Knoten `stove-pan`, Netz `Kitchen_Utensils`):
 *
 * - Die ganze Hülle reicht in z von −0,9372 bis +1,2198; ihre Mitte liegt bei
 *   **+0,1413** — dorthin setzt `takeUtensil` den Ursprung.
 * - Die **Mulde ohne Stiel** ist ein Drehkörper: In x misst sie −0,6316 bis
 *   +0,6244, also 1,2560 breit, und breiter wird die Pfanne nirgends — der
 *   Stiel ist mit |x| ≤ 0,115 ein schmaler Balken. Derselbe Durchmesser gilt
 *   in z, und weil die Mulde bei z = −0,9372 anfängt, liegt ihre Mitte bei
 *   −0,9372 + 0,6280 = **−0,3092**. Der Stiel schließt dort an und läuft bis
 *   +1,2198.
 * - In x fallen beide Mitten auf −0,0036 zusammen: Der Stiel steht mittig.
 *
 * Bleibt in z ein Unterschied von −0,4505 in Quellmaß, halbiert
 * (`KITCHEN_SCALE`) **−0,225 m** — knapp drei Viertel des Muldenhalbmessers
 * (0,314 m). Genau so weit lag das Patty daneben.
 *
 * **Warum die Zahl hier steht und nicht am Netz.** Der Belag hängt nicht an der
 * Pfanne, sondern neben ihr am selben Träger (`worlds/test/zones/kitchen.ts`,
 * `addStation`), und der Zutatensatz, der ihn baut, kennt kein geladenes Modell
 * (`kitchenProps.ts`). Ein gemessenes Maß aus der Quelldatei gehört damit in
 * denselben Katalog wie `align` und `deck` — das ist die Liste, die man beim
 * Austausch der Quelle nachmisst.
 */
export const PAN_BOWL: readonly [x: number, z: number] = [0, -0.225];
