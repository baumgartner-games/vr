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
 * **Ein aufgesetztes Netz** — dasselbe, plus die Höhe, auf der es steht.
 *
 * `at` ist die **Oberkante des Sockels** und nicht die Arbeitsfläche des
 * fertigen Möbels: Auf die Kiste kommt der Deckel bei 0,40 m, und erst der
 * Deckel ist die Ablage bei 0,50 m. Eine Zahl, die beides meinte, stimmte bei
 * jedem zweiten Stück nicht.
 */
export interface PieceStack extends PieceMesh {
  readonly at: number;
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
   * Aufgesetzt wird auf `deck` des Sockels — nicht auf dessen Oberkante: Beim
   * Herd ist die Oberkante der Rost, und genau dort steht der Topf.
   */
  readonly over?: PieceStack;
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
 * Alles in Metern über dem **Fuß** des Möbels (`sink-basin`), Quellmaß in
 * Klammern:
 *
 * - `rim` **0,5174** (1,034858) — der Rand ringsum, die Fläche, die sich mit
 *   `SINK_SUNK` in die Zeile einreiht.
 * - `floor` **0,3732** (0,746379) — der Beckenboden. Das Becken ist damit
 *   **14,4 cm tief**.
 * - `water` **0,4453** — genau dazwischen, also **halb voll**. Ein Becken, das
 *   bis zum Rand stünde, hätte den Teller unter Wasser und von oben unsichtbar;
 *   eines mit einem Fingerbreit Wasser wäre kein Spülbecken, sondern eine
 *   Mulde. Die Mitte ist zugleich die Höhe, auf der der Teller **halb**
 *   eintaucht — siehe unten.
 * - `width` **0,8076** (1,6153) und `depth` **0,6410** (1,2821) — die Öffnung.
 * - `at` **[+0,0124, −0,0307]** — wo ihre Mitte gegenüber dem Ursprung der
 *   **Hälfte** liegt. Die Mulde sitzt in der Quelle bei x = −0,9751, die
 *   Hälfte reicht von −1,9999 bis 0 und wird um ihre Mitte (−0,99994)
 *   zentriert; es bleiben 0,0248 Quellmaß, halbiert 1,24 cm. In z sind es die
 *   3,07 cm, um die die Mulde in der Quelle nach Norden versetzt ist.
 *
 * **Warum der Teller schräg liegt und wie schräg.** Ein Teller ist 0,75 m breit
 * (`worlds/test/zones/kitchenProps.PLATE_RADIUS`), das Becken 0,81 × 0,64 m —
 * er passt also gar nicht flach hinein, und flach auf den Rand gelegt stünde
 * kein Stück von ihm im Wasser. Er lehnt deshalb: **untere Kante auf dem
 * Beckenboden, obere Kante auf Randhöhe**. Damit ist der Winkel nicht gewählt,
 * sondern ausgerechnet — er ist der, bei dem der Teller genau die Beckentiefe
 * überspannt (`kitchenProps.SINK_TILT`, 11,1°) —, und weil das Wasser auf
 * halber Tiefe steht, liegt genau die untere Hälfte darin.
 */
export const SINK_BOWL = {
  rim: 0.54,
  floor: 0.54,
  water: 0.545,
  width: 0.7,
  depth: 0.385,
  at: [0, 0.0575],
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
 * **Vierzehn Möbel aus dreizehn Knoten der Quelle und zwei gebaute dazu**, in
 * der Reihenfolge, in der sie aus der Datei fallen — mit den Maßen, die sie
 * **im Spiel** haben, also halbiert (`KITCHEN_SCALE`).
 *
 * Vierzehn aus dreizehn, weil die **Spüle** in zwei Stücke zerfällt: Der Knoten
 * `sink` der Quelle ist vier Meter breit und wird beim Laden in `sink-basin`
 * und `sink-drain` zerschnitten (siehe der Block über `SINK_SUNK`). Wer die
 * Liste am Werkzeug nachrechnet, findet dort weiter **einen** Eintrag `sink`
 * — die beiden hier sind seine Hälften, und ihre Maße stehen in den Blöcken
 * darüber.
 *
 * Die beiden gebauten sind das **Förderband** und das **Zugband**: Sie stehen
 * am Ende, sie tragen `built: true`, und sie sind die einzigen Stücke ohne
 * Knoten in der Quelle (siehe `KitchenPiece.built`). Wer das Werkzeug neu
 * laufen lässt, ersetzt die vierzehn davor und lässt die beiden stehen.
 *
 * Die Kachelzahl ist die gerundete Grundfläche und nicht die aufgerundete:
 * Ein Unterschrank ist einen Meter breit und 1,06 m tief, und wer daraus zwei
 * Kacheln macht, stellt eine ganze Reihe davon mit einem Meter Luft dazwischen
 * auf. Ein Möbel darf ein paar Zentimeter über seine Kachel hinausragen; eine
 * Küche mit Lücken darin ist keine Küche.
 *
 * Die Maße der **Quelle** stehen daneben, damit ein zweiter Lauf des Werkzeugs
 * nachrechenbar bleibt: 2 × 2 m und 1 m hoch für einen Unterschrank, 4 m breit
 * für Spüle, Ausgabetheke und Regal — bei der Spüle je 2 m auf die Hälfte.
 */
export const KITCHEN_PIECES: readonly KitchenPiece[] = [
  {
    name: 'plate-counter',
    label: 'Tellerausgabe',
    tiles: [1, 1],
    base: { file: 'diner', node: 'kitchencounter_straight_A' },
    // Ein Abtropfgitter voller Teller auf der Zeile: Man sieht von weitem,
    // dass es hier Teller gibt, und muss dafür kein Bild aufkleben.
    over: { file: 'diner', node: 'dishrack_plates', at: 0.5 },
    height: 1.0476,
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
    over: { file: 'diner', node: 'dishrack', at: 0.5 },
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
    // Eine **Kiste mit Deckel**, und der Deckel ist die Ablage: Zutaten kommen
    // aus Kisten, und welche aus welcher, malt die Küche als Bild darauf
    // (`zones/kitchenIcon.ts`). Der zweite Baukasten hat für jede Zutat auch
    // eine eigene Kiste — die stehen in seinem Schauraum; hier bliebe sonst je
    // Zutat ein eigenes Katalogstück übrig, und das ist nicht, was
    // `Spot.gives` meint.
    base: { file: 'diner', node: 'crate' },
    over: { file: 'diner', node: 'crate_lid', at: 0.4 },
    height: 0.5,
    worktop: true,
  },
  {
    name: 'board',
    label: 'Schneidebrett',
    tiles: [1, 1],
    base: { file: 'diner', node: 'kitchentable_B' },
    over: { file: 'diner', node: 'cuttingboard', at: 0.5 },
    // Das Brett ist 7,5 cm dick und liegt auf 0,50 m; die Schnittfläche liegt
    // damit 7,5 cm über der Zeile daneben. **Kein `bury` mehr**: Der alte
    // Katalog versenkte das Brett um 3,3 cm, damit seine Fläche mit der Zeile
    // fluchtete — dieses Brett liegt sichtbar **auf** einem Tisch, und ein
    // Tisch, der im Estrich steckt, ist keiner.
    height: 0.575,
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
    base: { file: 'diner', node: 'stove_multi' },
    // 0,60 m ist die Oberkante der **Roste**; die Platte darunter liegt auf
    // 0,50 m wie jede Arbeitsfläche. Abgelegt wird auf dem Rost, also ist die
    // Oberkante zugleich die Ablage.
    height: 0.6,
    worktop: true,
  },
  {
    name: 'stove-pot',
    label: 'Herd mit Topf',
    tiles: [1, 1],
    base: { file: 'diner', node: 'stove_multi' },
    over: { file: 'diner', node: 'pot_A', at: 0.6 },
    height: 0.85,
    deck: 0.6,
    worktop: true,
    holds: 'pot',
  },
  {
    name: 'stove-pan',
    label: 'Herd mit Pfanne',
    tiles: [1, 1],
    base: { file: 'diner', node: 'stove_multi' },
    // **Die Pfanne ist das einzige Stück, das aus der alten Datei geblieben
    // ist**, und sie ist es mit Absicht: An ihr hängen die Bratregeln und ein
    // nachgemessener Muldenversatz (`PAN_BOWL`), den ein fremdes Netz nicht
    // mitbringt. Der Herd darunter kommt wie die anderen aus dem zweiten
    // Baukasten.
    over: { file: 'kitchen', node: 'pan', at: 0.6 },
    height: 0.73,
    deck: 0.6,
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
    // **0,55 m, und die Zahl ist vom Herd abgeschrieben** (`stove`) — auf den
    // Millimeter. Eine Kochstelle, die neben einem Herd steht und drei
    // Zentimeter höher wäre, wäre von oben eine Stufe in einer Reihe, die
    // aussieht wie eine Reihe. Und ein Patty, das von einem Band herüberfährt,
    // führe sichtbar bergauf.
    //
    // Es ist zugleich `deck`: Auf dieser Kochstelle steht keine Pfanne, das
    // Patty liegt unmittelbar auf der Platte (`worlds/test/zones/kitchenGriddle.ts`).
    // Genau das macht sie für eine Bandstraße brauchbar — ein Band kann nichts
    // in eine Pfanne legen, die schon auf ihrer Kachel liegt, aber auf eine
    // freie Platte kann es alles legen.
    height: 0.6,
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
