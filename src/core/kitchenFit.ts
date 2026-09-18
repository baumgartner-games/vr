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

/**
 * **Woher ein Netz kommt** — Datei und Knoten darin, ausgeschrieben.
 *
 * Zwei Baukästen stehen in dieser Küche nebeneinander, und welcher gemeint ist,
 * soll man lesen können und nicht aus einer Namensliste erschließen müssen. Ein
 * `kitchen`-Knoten heißt wie sein Katalogstück; ein `diner`-Knoten heißt, wie
 * der fremde Zeichner ihn genannt hat (`core/dinerFit.DINER_PIECES`).
 */
export interface PieceMesh {
  readonly file: 'kitchen' | 'diner';
  readonly node: string;
}

/**
 * **Ein aufgesetztes Netz** — dasselbe, plus die Höhe, auf der es **aufliegt**.
 *
 * `at` ist die Fläche, auf der der Aufsatz steht, und nicht die Arbeitsfläche
 * des fertigen Möbels: Auf die Kiste kommt der Deckel bei 0,40 m, und erst der
 * Deckel ist die Ablage bei 0,50 m. Eine Zahl, die beides meinte, stimmte bei
 * jedem zweiten Stück nicht.
 *
 * **Gemeint ist die Unterkante des Aufsatzes**, und das ist eine Korrektur:
 * Der erste Anlauf *verschob* das Netz um `at`, statt es dort aufzusetzen. Bei
 * Topf und Deckel fiel das nicht auf — die fangen in ihrer eigenen Datei bei
 * null an. Die **Pfanne** tut es nicht: Sie trägt in ihren Eckpunkten noch die
 * 0,55 m ihres alten Herds, und um 0,60 verschoben schwebte sie einen halben
 * Meter über dem Rost. Der Lader misst deshalb nach, wo der Aufsatz unten
 * aufhört, und setzt genau diese Kante auf `at` (`core/kitchenModel.ts`).
 */
export interface PieceStack extends PieceMesh {
  readonly at: number;

  /**
   * **Wie der Aufsatz gedreht liegt**, in Bogenmaß um x, y und z — und ohne
   * diese drei Zahlen liegt er so, wie der Zeichner ihn gebaut hat.
   *
   * **Das Messer ist der Fall, für den es sie gibt.** Der Baukasten liefert es
   * **stehend**: 0,575 m hoch auf einer Fläche von 12,5 × 5 cm, Spitze unten,
   * Griff oben — so, wie man es in ein Messerblock steckt. Auf einem
   * Schneidebrett steht kein Messer, es **liegt** darauf, und eine Vierteldrehung
   * um die Querachse macht aus der Höhe eine Länge.
   *
   * Gedreht wird **vor** dem Messen: Der Lader nimmt die Hülle des gedrehten
   * Netzes und setzt deren Unterkante auf `at` (`core/kitchenModel.lay`).
   * Andersherum läge ein flach gedrehtes Messer eine halbe Klingenlänge über
   * dem Brett.
   */
  readonly tilt?: readonly [number, number, number];

  /**
   * **Welcher Punkt des Aufsatzes über der Kachelmitte liegen soll**, in Metern
   * (x, z) von seiner eigenen Hüllenmitte aus gerechnet.
   *
   * Ohne ihn ist es die **Hüllenmitte** selbst, und das stimmt für alles, was
   * rund und symmetrisch ist: Topf, Deckel, Abtropfgitter.
   *
   * **Die Pfanne hat einen Stiel**, und deshalb ist ihre Hüllenmitte nicht ihre
   * Mulde: Sie liegt 22,5 cm daneben (`PAN_BOWL`, an der Quelle nachgemessen).
   * Auf die Kachelmitte gestellt lag die Mulde sichtbar neben der Flamme — und
   * zwar in jeder Ansicht. Was auf dem Rost stehen soll, ist die **Mulde**, und
   * genau das sagt dieses Feld.
   */
  readonly hub?: readonly [number, number];
}

/** Ein Möbel im Katalog. */
export interface KitchenPiece {
  /**
   * **Wie das Stück heißt** — der Schlüssel, an dem Aufbau, Stationen, Tests
   * und der Möbelkatalog es wiederfinden.
   *
   * **Nicht mehr zugleich der Name eines Knotens in einer Datei.** Das war er,
   * solange es eine Quelle gab; seit die Möbel aus zwei Baukästen kommen, sagt
   * `base` (und `over`), woher das Netz stammt. Ohne beide ist es der
   * gleichnamige Knoten in `public/models/kitchen.glb` — das gilt noch für
   * Feuerlöscher, Mülleimer, Ausgabetheke und Ausgaberegal.
   */
  readonly name: string;
  /** Wie es im Menü heißt. */
  readonly label: string;
  /**
   * **Der Sockel: woher das Netz kommt**, wenn nicht aus dem gleichnamigen
   * Knoten der eigenen Datei.
   *
   * Neun Möbel dieser Küche stehen seit dem Umbau auf Netzen aus dem **zweiten**
   * Baukasten (`core/dinerFit.ts`): Küchenzeile, Arbeitstisch, Schneidebrett,
   * die drei Herde, beide Spülenhälften, Ausgabe und Tellerausgabe. Ihre alten
   * Netze sind aus `public/models/kitchen.glb` verschwunden — dort blieben nur
   * die fünf, für die der zweite Baukasten keinen Ersatz hat.
   *
   * **Die Spielregel bleibt am Namen.** Ein `board` schneidet, ein `sink-basin`
   * spült, eine `serve-counter` gibt aus (`zones/kitchenPlan.stationKind`) — das
   * hängt am Katalognamen und nicht am Netz. Wer das Netz tauscht, tauscht das
   * Bild und nicht die Regel, und genau deshalb steht hier ein Feld und nicht
   * ein zweiter Katalog.
   */
  readonly base?: PieceMesh;
  /**
   * **Was auf der Arbeitsfläche des Sockels steht** — das Brett auf dem Tisch,
   * der Topf auf dem Herd, das Abtropfgitter auf der Zeile.
   *
   * Der erste Baukasten lieferte solche Paare als **ein** Netz mit zwei
   * Materialien, und `core/kitchenModel.takeUtensil` schnitt sie am Material
   * wieder auseinander. Der zweite liefert sie als **zwei Knoten**, und das ist
   * die bessere Hälfte des Tauschs: Was aufgesetzt wird, steht hier, statt aus
   * einem Materialnamen erschlossen zu werden.
   *
   * **Es dürfen mehrere sein**, und in der Reihenfolge, in der sie aufeinander
   * stehen: Auf der Zeile liegt das Brett, und im Brett steckt das Messer. Was
   * sich **herunternehmen** lässt (`holds`), ist dabei immer das **letzte** —
   * oben liegt, was man greift.
   */
  readonly over?: readonly PieceStack[];
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
   * **Dies ist eine Vorratskiste** — offen, voll, und keine Ablage.
   *
   * Ein Feld mit zwei Folgen, und beide kommen aus derselben Eigenschaft: Eine
   * Vorratskiste **zeigt ihren Inhalt**.
   *
   * - **Kein Bild darauf.** Eine Ausgabe bekommt sonst ein gerendertes Bild
   *   ihrer Zutat oben aufgeklebt (`worlds/test/zones/kitchen.addIcon`,
   *   `kitchenIcon.IconOven`). Das war richtig, solange dort eine geschlossene
   *   Kiste mit Deckel stand: Von außen sah man ihr nichts an. Eine Kiste
   *   Tomaten mit einem Bild einer Tomate darauf zeigt dieselbe Auskunft
   *   zweimal — und das Bild liegt dabei genau über dem, was es erklären soll:
   *   In der Aufsicht (`core/TopDownCamera.ts`) verdeckt der gerenderte Teller
   *   die ganze Kiste.
   * - **Und nichts darauf.** Sie ist bis oben voll; eine Pfanne, die auf
   *   einem Haufen Tomaten balanciert, ist kein Abstellplatz, sondern ein
   *   Fehler, den man sieht. Sie wird deshalb zu einer eigenen Stationsart
   *   (`worlds/test/zones/kitchenPlan.stationKind` → `'crate'`), an der man
   *   nimmt und **zurücklegt**, aber nicht ablegt.
   *
   * Es hängt am **Möbel** und nicht am Platz: Was eine Kiste zeigt, zeigt sie
   * überall — in der Küche, in der Werkhalle und im Schauraum.
   */
  readonly supply?: boolean;

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
   * (x, z) — der Ausgleich dafür, dass die Kachelmitte nicht die Mitte dessen
   * ist, was man sieht.
   *
   * **Positiv ist nach Süden und nach Osten**, und zwar in der **eigenen**
   * Drehung des Möbels: `worlds/test/zones/kitchen.ts`, `standAt`, dreht den
   * Versatz mit `turn` mit — ein um 180° gedrehter Herd rückt nach der anderen
   * Seite. Die Zeile an der Nordwand steht mit `turn: 0`, dort ist Süden also
   * „nach vorn", zum Gang hin (`worlds/test/zones/kitchenPlan.Spot.turn`).
   *
   * **Alles Weitere hängt an einem Satz: Der Ursprung liegt in der Mitte der
   * ganzen Hülle** (`tools/kitchen-model.mjs`) — und die Hülle ist nicht der
   * Korpus. Was irgendwo übersteht, zieht den Ursprung zu sich herüber, und
   * der Korpus rückt um dieselbe Strecke in die Gegenrichtung. Das ist kein
   * Fehler des Werkzeugs: Eine Hülle ist das, was ein Möbel belegt. Es heißt
   * nur, dass die Kante, an der man ausrichtet, nachzumessen ist.
   *
   * **Die Kante ist die Vorderkante der Küchenzeile, und sie liegt nicht dort,
   * wo ihr Katalogmaß es vermuten lässt.** Gemessen in der Quelle
   * (`public/models/kitchen.glb`, Knoten `counter`, Netz `Kitchen_Cabins`);
   * Quellmaß, halbiertes Spielmaß daneben (`KITCHEN_SCALE`):
   *
   * - Korpus samt Arbeitsplatte: z = −1,0612 … +0,9386, also **2,0000 tief**
   *   (Spiel 0,9999 m).
   * - Der **Türgriff** auf y = 0,3…0,5: z = +0,9291 … **+1,0612**. Er allein
   *   macht aus den 2,0000 die 2,1224, mit denen die Zeile im Katalog steht —
   *   und er ist ein Bügel von 32 cm Breite (Quelle x = ±0,3216), keine Kante.
   * - Zentriert wird über die Hülle, der **Korpus** sitzt also 0,0613 weiter
   *   nördlich als die Kachelmitte: im Spiel **3,07 cm**.
   *
   * Die Vorderkante, die man sieht, liegt damit **0,4693 m** vor der
   * Kachelmitte und nicht 0,5306 m. `plate-counter` und die beiden
   * Spülenhälften sind derselbe Korpus mit demselben Griff — sie brauchen
   * keinen Versatz, sie **sind** die Linie.
   *
   * Daran gemessen rücken drei Sorten Möbel:
   *
   * - **Brett und Löscherhocker** (`board`, `extinguisher`) haben keinen
   *   Griff: ±0,9999 in der Quelle, ebenfalls 2,0000 tief, aber mittig. Sie
   *   standen deshalb von Haus aus 3,07 cm **zu weit vorn** und gehen um genau
   *   diese 3,07 cm **nach Norden**. Danach fluchten Vorder- **und**
   *   Hinterkante mit der Zeile, denn die Korpusse sind gleich tief.
   * - **Die Herde** sind vorn kürzer, weil unter ihrer Platte die Blende mit
   *   den Knöpfen hängt: Das Blech reicht von −1,0634 bis +0,7786 (im Spiel
   *   0,9210 m tief), die Blende sitzt erst davor (+0,8180…+1,0634 auf
   *   y = 0,3…0,7). Die Kochstelle sprang damit **8 cm hinter die Zeile
   *   zurück** — und dieselben 8 cm fehlten ihr hinten zur Wand. Sie geht um
   *   **8 cm nach Süden**.
   * - **Der Herd mit der Pfanne** zusätzlich um den Pfannenstiel: Der ragt
   *   16 cm nach Süden aus der Hülle, der Korpus wandert beim Zentrieren also
   *   7,8 cm nach Norden (in der Datei −1,2198 … +0,6221). 7,8 + 8,0 =
   *   **15,8 cm**, und danach steht er wie die beiden anderen Herde.
   *
   * **Was der Versatz beim Herd ausdrücklich nicht kann: ihn ganz aus der Wand
   * holen.** Die Nordwand ist 0,2 m dick und steht auf der Kachelkante
   * (`worlds/editor/levelPlan.PLAN_WALL_T`), ihre Innenseite liegt also 0,40 m
   * nördlich der Kachelmitte. Bis zur Vorderkante der Zeile sind es von dort
   * 0,40 + 0,4693 = **0,8693 m**, und das Blech des Herds ist 0,9210 m tief —
   * es passt um **5,2 cm** nicht dazwischen. Vorn bündig heißt deshalb: hinten
   * bleiben 5,2 cm hinter der Wandinnenseite stehen. Vorher waren es 13,2 cm,
   * und die Küchenzeile daneben steckt mit ihren 13,1 cm unverändert dort — der
   * Herd ist nach dem Rücken also das Möbel der Zeile, das am **wenigsten** in
   * der Wand steht.
   *
   * Die Vorderkante gewinnt, weil man nur sie sieht: Davor steht die Figur,
   * dort greift sie zu, und eine Kante, die um Zentimeter versetzt durchläuft,
   * fällt aus 55° von oben (`core/topDownPose.TOP_DOWN_TILT`) sofort auf.
   * Hinter der Wandinnenseite ist dagegen nichts im Bild: Die Wand ist 2,8 m
   * hoch und undurchsichtig, und die Kamera steht im Süden.
   */
  readonly align?: readonly [x: number, z: number];

  /**
   * **Wie tief das Möbel im Boden steckt**, in Metern — derselbe Ausgleich wie
   * `align`, nur nach unten statt zur Seite (`worlds/test/zones/kitchen.ts`,
   * `standAt`).
   *
   * Der erste Fall hat drei Anläufe gebraucht: das **Schneidebrett**. Auf
   * seinem Korpus liegt ein Brett, das Brett ist 3,3 cm dick, und damit lag
   * seine Arbeitsfläche 3,3 cm über der der Küchenzeile daneben. In einer Zeile
   * aus Zeile, Brett, Zeile ist das eine **Stufe**, und aus 55° von oben
   * (`core/topDownPose.TOP_DOWN_TILT`) läuft sie quer durchs Bild.
   *
   * Der zweite und dritte sind die beiden Hälften der **Spüle**: Ihr Rand liegt
   * 1,74 cm über der Zeile, und sie stehen mitten darin (`SINK_SUNK`).
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

/*
 * **Die Spüle ist zwei Möbel**, und die drei Blöcke hierunter sind die Zahlen
 * dazu.
 *
 * In der Quelle ist `sink` **ein** Möbel von vier Metern Breite: links ein
 * Becken, rechts ein Abtropfbrett, dazwischen ein Steg und darauf die Armatur.
 * Im Spiel sind das zwei Stücke von je einem Meter (`sink-basin`,
 * `sink-drain`), und das ist keine Schönheit, sondern die Küche: Ein Becken,
 * in dem gespült wird, und eine Ablage, auf der die sauberen Teller stehen,
 * sind zwei Handgriffe an zwei Stellen — als ein Möbel hätten sie **eine**
 * Station, und wer davorsteht, könnte immer nur eines von beidem tun.
 *
 * **Zerschnitten wird das Netz beim Laden** (`core/kitchenModel.splitSink`),
 * denn Teilnetze zum Trennen gibt es nicht — der ganze Knoten ist ein einziges
 * Netz mit 1350 Ecken und einem Material. Die Naht liegt bei **x = 0**, und
 * das ist gemessen und nicht gewählt: Der Beckenboden reicht von x = −1,7828
 * bis −0,1675 (Mitte −0,9751), die Abtropfwanne von +0,2083 bis +1,7419
 * (Mitte +0,9751) — die beiden Mulden liegen spiegelbildlich um x = 0, und der
 * Steg zwischen ihren Öffnungen (−0,1660 bis +0,1580) hat seine Mitte bei
 * −0,0040. Zwei Millimeter Quellmaß, einer im Spiel.
 *
 * Alle Zahlen hier sind **halbiert** (`KITCHEN_SCALE`) und ab **Fuß des
 * Möbels** gemessen, wie `deck`; die Quellmaße stehen daneben, damit ein
 * zweiter Lauf des Werkzeugs nachrechnen kann.
 */

/**
 * **Wie tief die beiden Hälften im Estrich stecken** — derselbe Fall wie beim
 * Schneidebrett (`KitchenPiece.bury`), nur andersherum begründet.
 *
 * Der Beckenrand liegt in der Quelle bei y = 1,034858, halbiert **0,5174 m**.
 * Die Küchenzeile daneben liegt bei 1,000 → **0,5000 m**. In der Nordzeile
 * stehen Zeile, Herde, Löscherhocker, **Spüle**, Zeile, Brett, Zeile,
 * Tellerausgabe nebeneinander, und alle bis auf die Spüle arbeiten auf 0,500 m
 * — die Spüle sprang um **1,74 cm** heraus. Das ist die halbe Stufe, die das
 * Schneidebrett gekostet hat (3,3 cm), und aus 55° von oben
 * (`core/topDownPose.TOP_DOWN_TILT`) läuft sie über zwei Kacheln quer durchs
 * Bild.
 *
 * Also gehen die 1,74 cm unten wieder ab, und zwar bei **beiden** Hälften
 * gleich: Zwei Hälften eines Möbels, die verschieden tief stünden, hätten
 * zwischen sich eine Kante, die es in der Quelle nicht gibt.
 *
 * **Und unten ist nichts, was man sehen können muss.** Gemessen an der Quelle:
 * Unterhalb von y = 0,05 steht der Korpus nur bis x = ±1,900 und z = −0,988…
 * +0,866, also 5 cm (im Spiel) hinter der Kante der Deckplatte (±2,000 /
 * ±1,061) und in ihrem Schatten; zwischen y = 0,02 und y = 0,05 hat er
 * überhaupt keine Ecke. Im Estrich steckt eine glatte Sockelleiste.
 */
export const SINK_SUNK = 0;

/**
 * **Das Becken** — wo das Wasser steht und wie der Teller darin liegt.
 *
 * Alles in Metern über dem **Fuß** des Möbels (`sink-basin`), nachgemessen an
 * `kitchencounter_sink` des zweiten Baukastens — und zwar an der **Mulde**,
 * dem Bauteil, das für sich in der Quelle steht (112 Dreiecke, x −0,80…0,80,
 * y 0,70…1,08, z −0,40…0,60 im Quellmaß, halbiert von `DINER_SCALE`):
 *
 * - `rim` **0,54** — der Rand ringsum.
 * - `floor` **0,35** — der Beckenboden. Das Becken ist damit **19 cm tief**.
 * - `water` **0,445** — genau dazwischen, also **halb voll**. Ein Becken, das
 *   bis zum Rand stünde, hätte den Teller unter Wasser und von oben unsichtbar;
 *   eines mit einem Fingerbreit Wasser wäre kein Spülbecken, sondern eine
 *   Mulde. Die Mitte ist zugleich die Höhe, auf der der Teller **halb**
 *   eintaucht — siehe unten.
 * - `width` **0,80** und `depth` **0,50** — die Öffnung.
 * - `at` **[0, +0,05]** — wo ihre Mitte gegenüber dem Ursprung des Möbels
 *   liegt: in z um 5 cm nach vorn, weil hinter der Mulde die Armatur steht
 *   (z −0,365…−0,018).
 *
 * **Hier stand `floor: 0.54`, und das war ein Ablesefehler mit Folgen.** Beim
 * Umzug in den zweiten Baukasten wurde der Boden auf die **Randhöhe** gesetzt —
 * ein Becken ohne Tiefe. Die Folge war eine Rechnung, die sich selbst auf null
 * brachte: `kitchenProps.SINK_TILT` ist `asin((rim − floor) / 2 / Halbmesser)`,
 * und bei rim = floor ist das null. Der dreckige Teller lag flach auf dem
 * Beckenrand, und aus dem Spülen wurde ein Abstellen.
 *
 * **Warum der Teller schräg liegt und wie schräg.** Er lehnt: **untere Kante
 * auf dem Beckenboden, obere Kante auf Randhöhe**. Damit ist der Winkel nicht
 * gewählt, sondern ausgerechnet — er ist der, bei dem der Teller genau die
 * Beckentiefe überspannt (`kitchenProps.SINK_TILT`, 23,6°) —, und weil das
 * Wasser auf halber Tiefe steht, liegt genau die untere Hälfte darin.
 *
 * **Und er passt hinein**, seit er aus dem Baukasten kommt: 0,475 m breit
 * gegen eine Öffnung von 0,80 m, und so gekippt belegt er in der Tiefe
 * 0,475 · cos 23,6° = 0,435 m von 0,50 m. Der gebaute Teller von 0,75 m
 * konnte das nicht; er lag quer über dem Rand, und der Winkel war ein
 * Kompromiss mit einer Mulde, in die nichts hineinging.
 */
export const SINK_BOWL = {
  rim: 0.54,
  floor: 0.35,
  water: 0.445,
  width: 0.8,
  depth: 0.5,
  at: [0, 0.05],
} as const;

/**
 * **Das Abtropfbrett** — dieselbe Lesart, andere Hälfte.
 *
 * - `floor` **0,4794** (0,958739) — der Boden der Wanne, und damit die Fläche,
 *   auf der die sauberen Teller stehen. Sie liegt nur **7,6 cm** unter dem Rand
 *   (`SINK_BOWL.rim`): eine flache Riffelwanne und kein zweites Becken — genau
 *   daran unterscheidet die Quelle die beiden Seiten, und genau deshalb ist
 *   diese hier das Abtropfbrett.
 * - `width` **0,7668** (1,5336), `depth` **0,6002** (1,2004) — die Wanne.
 * - `at` **[−0,0124, −0,0307]** — spiegelbildlich zum Becken.
 */
export const SINK_TRAY = {
  floor: 0.525,
  width: 0.48,
  depth: 0.6,
  at: [0, 0],
} as const;

/**
 * **Wie hoch der Rost einer Kochstelle liegt**, in Metern — nachgemessen am
 * einflammigen Herd des zweiten Baukastens (`core/dinerFit.ts`, `stove_single`:
 * 0,6038 m).
 *
 * **Eine Zahl für drei Möbel und eine gebaute Platte.** Herd, Herd mit Topf,
 * Herd mit Pfanne und die sichere Kochstelle stehen in derselben Reihe, und
 * eine Reihe sieht nur dann wie eine aus, wenn ihre Flächen auf einem Millimeter
 * liegen: Ein Patty, das von einem Band auf die nächste Platte fährt, führe
 * sonst sichtbar bergauf. Vorher stand viermal 0,60 in der Datei — eine runde
 * Zahl, die zum vierflammigen Herd der alten Quelle gehörte und zum neuen um
 * knapp vier Millimeter danebenlag. Das reicht, damit ein Topf schwebt.
 *
 * **Nicht 0,50 wie die Arbeitsplatten daneben**, und das ist keine Stufe,
 * sondern ein Rost: Auf einem Herd steht ein Topf, und der steht auf Gusseisen
 * und nicht in der Platte.
 */
export const HOB_TOP = 0.6038;

/**
 * **Die vier Fächer eines Abtropfgitters** — wo ein Teller darin steht und wie
 * schräg.
 *
 * Alle vier Zahlen sind **am Netz abgelesen** und keine gewählten: Der
 * Baukasten liefert das Gitter zweimal, leer (`dishrack`) und mit vier Tellern
 * darin (`dishrack_plates`), und beide teilen sich denselben Rahmen. Wer die
 * Teller des zweiten in seine Zusammenhangskomponenten zerlegt, bekommt vier
 * gleiche Körper — und damit genau das Maß, nach dem die Küche ihre eigenen
 * Teller hineinstellen muss, damit es aussieht wie das gezeichnete Stück.
 *
 * Aufgestellt wird nämlich das **leere** Gitter (`sink-drain`), und die Teller
 * kommen einzeln dazu, sobald jemand welche hineinstellt. Das gezeichnete
 * volle Gitter steht nur im Schauraum und auf der Tellerausgabe, wo es nichts
 * zu zählen gibt.
 *
 * **Die Schräge ist die eine Zahl, die gerechnet ist.** Ein Teller liegt flach
 * 0,475 m breit und 0,05 m dick; im Gitter misst seine Hülle 0,4722 m in der
 * Höhe und 0,1274 m in der Tiefe. Aus beiden Gleichungen zusammen kommt ein
 * Winkel von **80°** heraus — nicht ganz senkrecht, und genau das sieht man
 * auch: Die Teller lehnen leicht nach hinten an die Sprossen.
 */
export const RACK_SLOTS = {
  /** Wie viele Teller hineinpassen — vier Fächer, vier Teller. */
  count: 4,
  /**
   * Wie hoch die **Mitte** eines Tellers über der Ablagehöhe des Möbels liegt
   * (`kitchenDeck`, beim `sink-drain` 0,525 m): Die Teller des Netzes stehen
   * 0,5754 bis 1,0476 m über dem Fuß des Möbels, ihre Mitte also auf 0,8115 m.
   */
  lift: 0.2865,
  /** Wo das erste Fach liegt, in Metern von der Kachelmitte nach hinten. */
  first: -0.1732,
  /** Und wie weit das nächste davon entfernt ist. */
  step: 0.1,
  /** Wie schräg ein Teller darin steht, im Bogenmaß — 80°. */
  tilt: (80 * Math.PI) / 180,
} as const;

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

/**
 * **Wo der Arbeitspunkt eines abgenommenen Geräts liegt** — in Metern (x, z)
 * von seinem Ursprung aus.
 *
 * Ein Gerät, das von seinem Möbel genommen wird, bekommt seinen Ursprung in
 * die **Mitte seiner Hülle** gesetzt (`core/kitchenModel.takeUtensil`,
 * `stand`), und das ist für das Tragen genau richtig: Die Hand fasst es an
 * einem gemessenen Griff, der ebenfalls von dieser Mitte aus beschrieben ist
 * (`worlds/test/zones/kitchenGrab.ts`, `PAN_STALK`).
 *
 * **Zum Hinstellen ist die Hüllenmitte aber die falsche Zahl.** Eine Pfanne
 * steht nicht mit ihrer Hüllenmitte auf der Flamme, sondern mit ihrer
 * **Mulde** — und die liegt 22,5 cm daneben, weil der Stiel die halbe Hülle
 * ausmacht. Genau so stand sie: Die Mulde saß auf der hinteren Kante der
 * Kachel, der Rost lag zur Hälfte frei davor, und im Bild von oben sah es aus,
 * als hätte jemand die Pfanne an die Wand geschoben.
 *
 * Es ist dieselbe Zahl wie `PAN_BOWL` und trotzdem eine eigene Funktion: Dort
 * ist sie die Stelle, an die ein **Belag** kommt (`kitchenProps.topping`),
 * hier die Stelle, die über der **Kachelmitte** liegen soll. Beides fällt beim
 * Topf zusammen und bei der Pfanne nicht, und ein gemeinsamer Name hätte die
 * beiden verwechselbar gemacht.
 */
export function kitchenHub(item: string): readonly [x: number, z: number] {
  return item === 'pan' ? PAN_BOWL : ORIGIN_HUB;
}

const ORIGIN_HUB: readonly [x: number, z: number] = [0, 0];

/**
 * **Die vier Vorratskisten** — je Zutat eine, und in jeder liegt das, was sie
 * hergibt.
 *
 * Vorher standen an ihrer Stelle vier gleiche Kisten mit Deckel
 * (`serve-counter`), und was in welcher steckte, sagte ein **Bild**: Die Küche
 * rendert die Zutat in eine Textur und klebt sie oben auf
 * (`worlds/test/zones/kitchenIcon.ts`). Das war der Umweg, den es gab, solange
 * die Zutaten aus Zylindern gebaut waren und es gar kein Netz gab, das man
 * hätte hinstellen können. Der zweite Baukasten hat für jede Zutat eine
 * **offene Kiste mit genau dieser Zutat darin** — ein Aufkleber daneben wäre
 * die zweite Antwort auf dieselbe Frage.
 *
 * **Vier Einträge und nicht ein Eintrag mit vier Netzen**, und das ist die
 * Frage, an der man sich hier vertut: `Spot.gives` gehört dem **Platz**
 * (`worlds/test/zones/kitchenPlan.ts`), der Katalog beschreibt das **Möbel**.
 * Ein `serve-counter`, dessen Netz vom `gives` seines Platzes abhinge, wäre
 * ein Möbel, das an zwei Stellen verschieden aussieht — und im Möbelmenü am
 * Computer (`shared/construct.ts`) ließe es sich gar nicht zeigen, weil dort
 * kein Platz danebensteht. Vier Kisten dagegen kann man dort aufstellen,
 * ansehen und einzeln in die Küche setzen.
 *
 * **Keine Ablage.** Auf einer offenen Kiste voller Tomaten liegt kein Teller;
 * sie braucht `worktop` auch nicht, um zu wirken — was `gives` trägt, ist eine
 * Ausgabe (`kitchenPlan.stationKind`, Regel 2), und das genügt.
 *
 * **Und kein Bild und keine Ablage** (`supply`): Jede zeigt ihren Inhalt,
 * siehe dort.
 *
 * Die Höhen sind die gemessenen Oberkanten der Netze (`core/dinerFit.ts`) und
 * damit zugleich `deck`: Ausgegeben wird **oben aus der Kiste**.
 */
const SUPPLY_CRATES: readonly KitchenPiece[] = [
  {
    name: 'crate-buns',
    label: 'Brötchenkiste',
    tiles: [1, 1],
    base: { file: 'diner', node: 'crate_buns' },
    height: 0.4012,
    supply: true,
  },
  {
    name: 'crate-patty',
    label: 'Pattykiste',
    tiles: [1, 1],
    // `crate_steak` heißt sie in der Quelle, und was darin liegt, ist das rohe
    // Patty dieser Küche (`food_ingredient_burger_uncooked`) — eine Kiste
    // „Steaks" gibt es hier nicht, ein Rezept dafür auch nicht.
    base: { file: 'diner', node: 'crate_steak' },
    height: 0.4385,
    supply: true,
  },
  {
    name: 'crate-lettuce',
    label: 'Salatkiste',
    tiles: [1, 1],
    base: { file: 'diner', node: 'crate_lettuce' },
    height: 0.499,
    supply: true,
  },
  {
    name: 'crate-tomatoes',
    label: 'Tomatenkiste',
    tiles: [1, 1],
    base: { file: 'diner', node: 'crate_tomatoes' },
    height: 0.4617,
    supply: true,
  },
];

/**
 * **Sechsundzwanzig Möbel aus drei Herkünften** — mit den Maßen, die sie **im
 * Spiel** haben, also in Metern der Welt.
 *
 * Die drei Herkünfte stehen am Eintrag und nicht in einer Liste daneben, und
 * ein Möbel gehört zu genau einer (geprüft in `kitchenFit.test.ts`, _lässt nur
 * gebaute und geliehene Möbel ohne eigenen Knoten durchgehen_):
 *
 * - **Fünfzehn leihen ihr Netz vom zweiten Baukasten** (`KitchenPiece.base`,
 *   oft mit einem `over` darauf): Küchenzeile, Arbeitstisch, Spülbecken,
 *   Abtropfseite, Tellerausgabe, Ausgabe, Schneidebrett samt Messer,
 *   Löscherplatte, die drei Herde und die vier Vorratskisten
 *   (`SUPPLY_CRATES`). Ihre Maße misst niemand hier nach — sie stehen in
 *   `core/dinerFit.ts`, geschrieben vom Werkzeug, das die Quelle aufbereitet
 *   hat, und was hier steht, ist daraus gerechnet.
 * - **Drei haben noch einen eigenen Knoten** in `public/models/kitchen.glb`:
 *   Mülleimer, Ausgabetheke, Ausgaberegal. Mehr ist von den dreizehn Möbeln des
 *   ersten Baukastens nicht geblieben (`tools/kitchen-model.mjs --trim`), und
 *   ihre Maße sind die halbierten der Quelle (`KITCHEN_SCALE`).
 * - **Acht werden gebaut** (`built: true`): die drei Bänder, Kombinierer,
 *   Mixer, sichere Kochstelle, Computer-Tisch und Kopierer. Sie haben kein Netz
 *   und sind trotzdem vollwertige Möbel — siehe `KitchenPiece.built`.
 *
 * Die Kachelzahl ist die gerundete Grundfläche und nicht die aufgerundete:
 * Ein Unterschrank ist einen Meter breit und 1,06 m tief, und wer daraus zwei
 * Kacheln macht, stellt eine ganze Reihe davon mit einem Meter Luft dazwischen
 * auf. Ein Möbel darf ein paar Zentimeter über seine Kachel hinausragen; eine
 * Küche mit Lücken darin ist keine Küche.
 */
export const KITCHEN_PIECES: readonly KitchenPiece[] = [
  {
    name: 'plate-counter',
    label: 'Tellerkiste',
    tiles: [1, 1],
    // **Eine Kiste voller Teller, und sie steht auf dem Boden.** Beides sind
    // Korrekturen aus demselben Spieltest, und die zweite ist die ältere.
    //
    // Hier stand zuerst ein **Abtropfgitter** voller Teller, und es sah gut
    // aus — nur sagte es das Falsche: Ein Abtropfgitter hat eine Kapazität und
    // einen Inhalt, den man leer räumen kann (`sink-drain`, `RACK_SLOTS`).
    // Diese Ausgabe wird nie leer, so wie die vier Vorratskisten an der
    // Westwand auch nicht. Zwei Möbel, die dasselbe zeigen und Verschiedenes
    // bedeuten, sind eins zu viel.
    //
    // Dann stand die Kiste eine Weile **auf einer Arbeitsplatte**, und das war
    // wieder dieselbe Sorte Widerspruch: Die vier Vorratskisten stehen auf dem
    // Boden — sie **sind** das Möbel und stehen nicht darauf. Eine fünfte
    // Kiste, die als Einzige einen Unterschrank mitbringt, sähe aus wie ein
    // Sonderfall, den es nicht gibt; und ein Stapel auf 0,85 m ist keine
    // Ausgabe mehr, sondern ein Regalbrett über Hüfthöhe. Der Unterschrank ist
    // deshalb weg: `base` ist die Kiste selbst, wie bei `SUPPLY_CRATES`.
    //
    // Der Boden der Kiste liegt 5 cm über ihrem Fuß (`crate`, nachgemessen),
    // also fangen die Teller bei 0,05 an; sechs davon zu je 5 cm
    // (`dinerPiece('plate').height`) stapeln sich bis 0,35 und bleiben damit
    // unter dem Rand bei 0,40.
    //
    // **Und jeder liegt verdreht auf dem vorigen.** Ein Stapel aus fluchtenden
    // Scheiben ist von oben **ein** Teller — dieselbe Überlegung wie beim
    // Stapel an der Rückgabe (`zones/kitchenProps.DIRTY_TWIST`, 13°), und hier
    // ausgeschrieben, weil der Katalog keine Zone kennt.
    base: { file: 'diner', node: 'crate' },
    over: [
      { file: 'diner', node: 'plate', at: 0.05, tilt: [0, 0.0, 0] },
      { file: 'diner', node: 'plate', at: 0.1, tilt: [0, 0.2269, 0] },
      { file: 'diner', node: 'plate', at: 0.15, tilt: [0, 0.4538, 0] },
      { file: 'diner', node: 'plate', at: 0.2, tilt: [0, 0.6807, 0] },
      { file: 'diner', node: 'plate', at: 0.25, tilt: [0, 0.9076, 0] },
      { file: 'diner', node: 'plate', at: 0.3, tilt: [0, 1.1345, 0] },
    ],
    // Kein eigener `deck`: Wie bei den vier Vorratskisten ist die Oberkante
    // zugleich die Ablage — ausgegeben wird **oben aus der Kiste**.
    height: 0.4,
    supply: true,
  },
  {
    name: 'extinguisher',
    label: 'Feuerlöscher',
    tiles: [1, 1],
    // **Auf der Arbeitsplatte wie alles andere**, und das ist eine Korrektur:
    // Der Löscher stand bis zum Umbau auf seinem eigenen **Hocker** aus dem
    // ersten Baukasten — anderes Holz, andere Kante, andere Höhe als die Zeile
    // ringsum, und in einer Reihe aus Möbeln des zweiten Baukastens sah man
    // genau ihn. Der Hocker ist aus der Datei geflogen
    // (`tools/kitchen-model.mjs`, `LOOSE`); geblieben ist der Löscher.
    base: { file: 'diner', node: 'kitchencounter_straight_A' },
    over: [{ file: 'kitchen', node: 'extinguisher', at: 0.5 }],
    // 0,748 m Löscher auf 0,50 m Zeile — auf den Millimeter dieselbe Oberkante
    // wie vorher auf dem Hocker, denn der war auch einen halben Meter hoch.
    height: 1.2479,
    deck: 0.5,
    worktop: true,
    holds: 'extinguisher',
  },
  {
    name: 'sink-basin',
    label: 'Spülbecken',
    tiles: [1, 1],
    base: { file: 'diner', node: 'kitchencounter_sink' },
    // 0,90 m ist die Oberkante der **Armatur** und nicht die des Möbels; die
    // Wanne liegt bei 0,54 m (`SINK_BOWL`).
    height: 0.9008,
    deck: SINK_BOWL.water,
  },
  {
    name: 'sink-drain',
    label: 'Abtropfbrett',
    tiles: [1, 1],
    base: { file: 'diner', node: 'kitchencounter_straight_A' },
    // Dasselbe Gitter wie an der Tellerausgabe, nur leer: Dort kommen Teller
    // heraus, hier hinein.
    over: [{ file: 'diner', node: 'dishrack', at: 0.5 }],
    height: 0.8,
    deck: SINK_TRAY.floor,
  },
  { name: 'bin', label: 'Mülleimer', tiles: [1, 1], height: 0.45 },
  {
    name: 'table',
    label: 'Arbeitstisch',
    tiles: [1, 1],
    base: { file: 'diner', node: 'kitchentable_A' },
    height: 0.5,
    worktop: true,
  },
  {
    name: 'serve-counter',
    label: 'Ausgabe',
    tiles: [1, 1],
    // Eine **Kiste mit Deckel**, und der Deckel ist die Ablage. Sie gibt
    // seitdem nur noch **Teller** aus und steht sonst als Durchreiche in der
    // Zeile: Für die vier Zutaten gibt es eigene Kisten (gleich darunter), und
    // die zeigen ihren Inhalt selbst, statt ihn als Bild aufgeklebt zu
    // bekommen.
    base: { file: 'diner', node: 'crate' },
    over: [{ file: 'diner', node: 'crate_lid', at: 0.4 }],
    height: 0.5,
    worktop: true,
  },
  ...SUPPLY_CRATES,
  {
    name: 'board',
    label: 'Schneidebrett',
    tiles: [1, 1],
    // **Dieselbe Zeile wie nebenan**, und auch das ist eine Korrektur: Darunter
    // stand ein `kitchentable_B`, und der ist in diesem Baukasten **türkis** —
    // ein grüner Tisch zwischen lauter Küchenzeilen.
    base: { file: 'diner', node: 'kitchencounter_straight_A' },
    over: [
      { file: 'diner', node: 'cuttingboard', at: 0.5 },
      // **Und das Messer liegt darauf** — flach, wie ein Messer auf einem
      // Brett eben liegt. Der Baukasten liefert es stehend (siehe
      // `PieceStack.tilt`); eine Vierteldrehung um die Querachse legt es hin,
      // und aufgesetzt wird es dann auf die Brettoberfläche (0,575 m).
      //
      // Es stand hier einmal **im** Brett, um 10,5 cm versenkt — das war der
      // Versuch, aus einem stehenden Messer ein steckendes zu machen, und aus
      // der Nähe sah es aus wie ein Messer, das jemand in die Arbeitsplatte
      // gerammt hat.
      { file: 'diner', node: 'knife', at: 0.575, tilt: [Math.PI / 2, 0, 0] },
    ],
    // Das Brett ist 7,5 cm dick und liegt auf 0,50 m; die Schnittfläche liegt
    // damit 7,5 cm über der Zeile daneben. **Kein `bury` mehr**: Der alte
    // Katalog versenkte das Brett um 3,3 cm, damit seine Fläche mit der Zeile
    // fluchtete — dieses Brett liegt sichtbar **auf** einer Zeile.
    //
    // Darüber liegt nur noch das Messer, und flach ist es 5 cm dick (seine
    // Breite in der Quelle, `dinerFit`, `knife.span`). Es stand hier einmal
    // aufrecht, und das machte aus einem Brett ein Möbel von 1,05 m.
    height: 0.625,
    deck: 0.575,
    worktop: true,
  },
  { name: 'plate-rack', label: 'Ausgaberegal', tiles: [2, 1], height: 0.56 },
  { name: 'pass', label: 'Ausgabetheke', tiles: [2, 1], height: 0.53, worktop: true },
  {
    name: 'counter',
    label: 'Küchenzeile',
    tiles: [1, 1],
    base: { file: 'diner', node: 'kitchencounter_straight_A' },
    height: 0.5,
    worktop: true,
  },
  {
    name: 'stove',
    label: 'Herd',
    tiles: [1, 1],
    // **Einflammig und nicht vierflammig**: Eine Kachel ist ein Kochplatz, und
    // vier Flammen auf einer Kachel sind drei Plätze, die das Spiel nicht
    // kennt. Der vierflammige steht im Schauraum der zweiten Küche.
    base: { file: 'diner', node: 'stove_single' },
    // `HOB_TOP` ist die Oberkante des **Rosts**; die Platte darunter liegt auf
    // 0,50 m wie jede Arbeitsfläche. Abgelegt wird auf dem Rost, also ist die
    // Oberkante zugleich die Ablage.
    height: HOB_TOP,
    worktop: true,
  },
  {
    name: 'stove-pot',
    label: 'Herd mit Topf',
    tiles: [1, 1],
    base: { file: 'diner', node: 'stove_single' },
    over: [{ file: 'diner', node: 'pot_A', at: HOB_TOP }],
    // Rost plus 25 cm Topf.
    height: HOB_TOP + 0.25,
    deck: HOB_TOP,
    worktop: true,
    holds: 'pot',
  },
  {
    name: 'stove-pan',
    label: 'Herd mit Pfanne',
    tiles: [1, 1],
    base: { file: 'diner', node: 'stove_single' },
    // **Die Pfanne ist das einzige Möbelteil, das aus der alten Datei geblieben
    // ist**, und sie ist es mit Absicht: An ihr hängen die Bratregeln und ein
    // nachgemessener Muldenversatz (`PAN_BOWL`), den ein fremdes Netz nicht
    // mitbringt. Der Herd darunter kommt wie die anderen aus dem zweiten
    // Baukasten.
    // `hub` ist der Muldenversatz: Auf dem Rost soll die **Mulde** stehen und
    // nicht die Mitte aus Mulde und Stiel.
    over: [{ file: 'kitchen', node: 'pan', at: HOB_TOP, hub: PAN_BOWL }],
    // Rost plus 12,78 cm Pfanne.
    height: HOB_TOP + 0.1278,
    deck: HOB_TOP,
    worktop: true,
    holds: 'pan',
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
  {
    name: 'belt-smart',
    label: 'Filterband',
    tiles: [1, 1],
    // **Und wieder dieselbe Zahl, zum dritten Mal.** Ein Filterband ist ein
    // Zugband, das sich merkt, was es holen darf — mechanisch dasselbe Möbel
    // mit einem Gedächtnis (`worlds/test/zones/kitchenBelt.beltWants`). Es
    // steht in denselben Reihen wie die beiden anderen, also läuft es auf
    // derselben Höhe; alles andere wäre eine Stufe mitten in der Bahn.
    //
    // Drittes Katalogstück und keine Einstellung am Zugband, und die
    // Begründung ist wörtlich die des Zugbands: Im Baumodus trägt man
    // Katalogstücke, und ein Band, das man nach dem Aufstellen erst noch
    // umschalten müsste, wäre ein Möbel mit einem unsichtbaren Schalter. Der
    // **Filter** ist dagegen keine zweite Sorte Band, sondern das, was dieses
    // eine gelernt hat — man sieht ihn ihm an (`kitchen.showFilter`).
    height: 0.53,
    worktop: true,
    built: true,
  },
  {
    name: 'combiner',
    label: 'Kombinierer',
    tiles: [1, 1],
    // **0,53 m, zum vierten Mal, und hier ist es am wichtigsten.** Der
    // Kombinierer steht mitten in einer Bandbahn: Von hinten kommt das Patty,
    // oben liegt das Brötchen, nach vorn geht der Burger weiter. Drei Möbel in
    // einer Linie, und eines davon auf einer anderen Höhe, wäre genau die
    // Stufe, über die ein Teller fährt.
    height: 0.53,
    worktop: true,
    built: true,
  },
  {
    name: 'mixer',
    label: 'Mixer',
    tiles: [1, 1],
    // **0,92 m ist die Oberkante des Motorblocks**, nicht die der Schüssel.
    // Derselbe Fall wie beim Herd mit Topf: `height` ist, was im Weg steht,
    // `deck` ist, wo etwas liegt. Die Zahlen stehen am Netz
    // (`worlds/test/zones/kitchenMixer.ts`) und werden hier abgeschrieben —
    // dieser Katalog kommt ohne three.js aus, und ein Test daneben hält beide
    // Seiten zusammen.
    height: 0.92,
    // **0,50 m, und das ist auf den Millimeter die Arbeitsplatte des
    // Arbeitstisches** (`table`) — denn genau der steht hier unten drin. Der
    // Mixer ist ein Arbeitstisch mit einer Schüssel darauf, und was gemixt
    // wird, steht **in** der Schüssel auf der Tischplatte: Der Rand ist 8,5 cm
    // hoch (`worlds/test/zones/kitchenMixer.ts`, `BOWL_WALL`) und damit
    // niedriger als jede Zutat dieser Küche. Von oben sieht man in die
    // Schüssel hinein und liest, was darin liegt — und das ist die Ansicht, in
    // der diese Küche gespielt wird.
    //
    // Der Eintrag steht trotzdem hier, obwohl er gleich `table` ist: `height`
    // ist die Oberkante des **Motorblocks**, und ohne `deck` läge das
    // Geschnittene 42 cm darüber in der Luft.
    deck: 0.5,
    worktop: true,
    built: true,
  },
  {
    name: 'griddle',
    label: 'Sichere Kochstelle',
    tiles: [1, 1],
    // **Die Höhe ist die des Herdrosts** (`HOB_TOP`) — gelesen und nicht
    // abgeschrieben. Eine Kochstelle, die neben einem Herd steht und drei
    // Zentimeter höher wäre, wäre von oben eine Stufe in einer Reihe, die
    // aussieht wie eine Reihe. Und ein Patty, das von einem Band herüberfährt,
    // führe sichtbar bergauf. Abgeschrieben stand hier lange 0,55 und danach
    // 0,60; beide Male ging der Herd darunter weiter und die Platte nicht mit.
    //
    // Es ist zugleich `deck`: Auf dieser Kochstelle steht keine Pfanne, das
    // Patty liegt unmittelbar auf der Platte (`worlds/test/zones/kitchenGriddle.ts`).
    // Genau das macht sie für eine Bandstraße brauchbar — ein Band kann nichts
    // in eine Pfanne legen, die schon auf ihrer Kachel liegt, aber auf eine
    // freie Platte kann es alles legen.
    height: HOB_TOP,
    worktop: true,
    built: true,
  },
  {
    name: 'desk',
    label: 'Computer-Tisch',
    tiles: [1, 1],
    // **1,21 m, und das ist die Oberkante des Bildschirms.** Die Zahlen stehen
    // am Netz (`worlds/test/zones/kitchenDesk.ts`, `DESK_HEIGHT`,
    // `SCREEN_FOOT`, `SCREEN_HIGH`) und werden hier abgeschrieben statt
    // eingebunden: Dieser Katalog kommt ohne three.js aus, und ein `import`
    // von dort holte die halbe Zone in einen Test, der nur Maße nachschlägt.
    // Dass beide dasselbe sagen, prüft `kitchenDesk.test.ts` nach — die eine
    // Stelle, an der ohnehin beides zusammenliegt.
    height: 1.21,
    // **0,75 m ist die Platte**, ein Viertelmeter höher als jede
    // Arbeitsplatte dieser Küche (0,50 m). Das ist kein Versehen: Ein
    // Schreibtisch, an dem man steht, hat seine Platte in Bauchhöhe und nicht
    // in Kniehöhe — und auf diesen hier legt ohnehin niemand einen Salatkopf.
    deck: 0.75,
    // **Und deshalb kein `worktop`.** Ohne die Marke bekommt er keine Station
    // (`worlds/test/zones/kitchenPlan.stationKind`), und genau so ist es
    // gemeint: Der Tisch hat eine einzige Wirkung, und die sitzt vorn am
    // Bildschirm.
    built: true,
  },
  {
    name: 'copier',
    label: 'Kopierer',
    // **Zwei Kacheln, und die zweite ist kein Beiwerk.** Links liegt die
    // Kopierfläche, rechts die Kopie-Zone (`kitchenDesk.COPIER_PLATE`,
    // `COPIER_ZONE`, je eine Kachelmitte). Ein Kopierer auf einer Kachel wäre
    // ein Gerät, bei dem Vorlage und Kopie übereinanderstehen.
    tiles: [2, 1],
    // Oberkante der vier Eckpfosten der Kopie-Zone
    // (`kitchenDesk.COPIER_HEIGHT`).
    height: 0.8,
    // **Beide Felder liegen auf 0,50 m** — auf der Arbeitshöhe der
    // Küchenzeile, und beide auf derselben. Ein Gerät, das behauptet
    // „dasselbe Ding, noch einmal", und dessen Kopie zwei Zentimeter höher
    // steht als die Vorlage, behauptet es nicht überzeugend
    // (`kitchenDesk.COPIER_DECK`).
    deck: 0.5,
    // Kein `worktop`: Was hier abgelegt wird, ist ein **Möbel** und kein
    // Gericht, und das läuft nicht über eine Station.
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
 * **In welchem Maßstab dieses Möbel in der Szene steht** — seit dem Umbau
 * **eins**, und zwar für jedes Stück.
 *
 * Die Zahl war einmal die Hälfte: Der Lader reichte ein halbiertes Netz heraus
 * (`KITCHEN_SCALE`), und wer etwas **an** ein Möbel hängte statt daneben — das
 * Bild der Zutat auf dem Deckel, das Wasser im Becken, die Griffkreuze, das
 * Getragene —, musste die Halbierung wieder aufheben. Ein gebautes Stück stand
 * dagegen schon in Metern da, und deshalb gab es die Unterscheidung überhaupt.
 *
 * Seit die Möbel aus **zwei** Dateien zusammengesetzt werden
 * (`core/kitchenModel.ts`), gibt es sie nicht mehr: Der Lader hängt Sockel und
 * Aufsatz in eine Gruppe, jeder Teil trägt seinen eigenen Maßstab, und die
 * Gruppe steht auf **1**. Was man an sie hängt, steht in Metern der Welt — bei
 * jedem Möbel gleich.
 *
 * **Die Funktion bleibt trotzdem stehen.** Sie ist die Stelle, an der diese
 * Zusage steht, und ein Test hält sie fest; die zwölf Aufrufer rechnen seither
 * mit eins und sind damit richtig. Wer eines Tages wieder ein Stück in einem
 * anderen Maßstab hereinreicht, ändert eine Zeile statt zwölf.
 */
export function kitchenPieceScale(_piece: KitchenPiece): number {
  return 1;
}

/**
 * **Wo im abgenommenen Topf das Wasser steht** — der Innenraum, in Metern über
 * seinem **Fuß**, und der Innenradius dazu.
 *
 * Dieselbe Lesart wie `SINK_BOWL` und dieselbe Quelle wie `PAN_BOWL`: gemessen
 * an `public/models/kitchen.glb`, Knoten `stove-pot`, Netz `Kitchen_Utensils`,
 * Quellmaß in Klammern, halbiert mit `KITCHEN_SCALE`. Der Topf ist **oben
 * offen** — das ist keine Annahme, sondern steht in der Datei: Über der
 * Gefäßwand liegen zwei Ringe zu je 50 Ecken (außen 1,7181 bei r = 0,6339,
 * innen 1,7182 bei r = 0,5627) und darüber die Deckfläche des umgeschlagenen
 * Randes (1,7331, r = 0,5772…0,6188). Ein Deckel käme als geschlossene Kappe,
 * und die gibt es nicht.
 *
 * - `floor` **0,0247** (1,1588 gegen den Fuß bei 1,1095) — der Innenboden, eine
 *   Scheibe von r = 0,5661. Der Topf ist damit **27,97 cm tief**, bei 31,18 cm
 *   Gesamthöhe: 3,2 cm Blech und Rand.
 * - `rim` **0,3044** (1,7182) — die Öffnung, gemessen an der **Unterseite** des
 *   Randes und nicht an seiner Oberkante (0,3118). Wasser steht im Gefäß, nicht
 *   im Rand.
 * - `water` **0,1646** — genau dazwischen, also **halb voll**, und das ist
 *   dieselbe Entscheidung wie beim Spülbecken (`SINK_BOWL.water`) samt
 *   derselben Begründung: Ein Topf bis zum Rand ist beim ersten Schritt
 *   übergelaufen, ein Fingerbreit Wasser ist eine Pfütze. Nachgerechnet für die
 *   Hauptansicht (55° von oben, `core/topDownPose.TOP_DOWN_TILT`): Der
 *   Spiegel liegt 13,98 cm unter dem Rand, der nähere Rand verdeckt davon
 *   13,98 / tan 55° = 9,79 cm eines Durchmessers von 57,19 cm — **17 %**. Es
 *   bleibt eine breite Ellipse und kein Sichelchen. Zum Vergleich der leere
 *   Topf: Sein Boden liegt 27,97 cm tief, davon verdeckt der Rand 34 % — dunkel
 *   und weit unten gegen hell und knapp unter der Kante, das unterscheidet sich
 *   auf einen Blick.
 * - `radius` **0,281** — der Wasserspiegel als Scheibe. Die Innenwand läuft
 *   nach oben leicht zusammen (0,2903 bei y = 0,0319, 0,2860 auf Spiegelhöhe,
 *   0,2813 am Rand), und die engste Stelle zwischen Boden und Spiegel ist die
 *   Kante des Bodens selbst mit 0,2831. 0,281 bleibt überall **innerhalb** der
 *   Wand — ein Wasser, das durch das Blech tritt, sieht man von außen als
 *   blauen Ring um den Topf.
 *
 * **Warum das hier steht und nicht im Zutatensatz.** Es ist an der Quelldatei
 * gemessen wie `align`, `deck` und `PAN_BOWL` — das ist die Liste, die man beim
 * Austausch der Quelle nachmisst. Der Satz, der das Wasser **baut**
 * (`worlds/test/zones/kitchenProps.ts`), kennt kein geladenes Modell.
 *
 * **Anders als bei der Pfanne braucht es keinen Versatz in x/z.** Der Ursprung
 * eines abgenommenen Geräts liegt in der Mitte seiner ganzen Hülle
 * (`core/kitchenModel.takeUtensil`), und beim Topf ist das zugleich seine
 * Achse: Seine beiden Griffe stehen sich gegenüber und ziehen die Hülle nach
 * keiner Seite (x −0,8659…+0,8498, Mitte −0,0081; z −0,7785…+0,4826, Mitte
 * −0,1480 — und das ist auf den Millimeter die Achse der Ringe). Der Stiel der
 * Pfanne steht nur auf einer Seite, und genau dafür gibt es `PAN_BOWL`.
 */
export const POT_BOWL = {
  floor: 0.025,
  rim: 0.25,
  water: 0.1375,
  radius: 0.225,
} as const;
