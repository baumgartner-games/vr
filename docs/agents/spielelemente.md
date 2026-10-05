# Zwei Kataloge: Rohmodelle und Spielelemente

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

**Kurz:** Was man in einer Welt als Möbel oder Station hinstellt, kommt aus dem
Katalog der **Spielelemente** (`src/worlds/elements/`). Ein Spielelement
bringt seine Grundfläche auf dem Zellgitter mit, einen Körper, die Rohmodelle,
aus denen es zusammengesetzt ist, und was man damit tut. Das **Modellregal**
(`public/models/kaykit/`, [Das Modellregal](./assetregal.md)) ist der Katalog
der **Rohmodelle**: nur Bilder. Eine Datei von dort wird nie unmittelbar als
Möbel in eine Welt gestellt, und neue Geometrie wird auch nicht gebaut.

## Warum es zwei sind

Gemeldet vom Besitzer, im September 2026: _„Es ist mir öfters aufgefallen dass
die Agenten entweder komplett neue 3d Elemente bauen oder nur die 3d Elemente
ohne Physik Info (2d Grid) platzieren in den Welten."_ Der Anlass war das
[Test Restaurant](./testrestaurant.md): Man lief über Kisten und
Arbeitsplatten, denn die Welt stellte ihre Möbel mit `placeModel` hin, und
dabei gab es einen Körper in der Physik, aber keine gesperrte Zelle. Das Gehen
fragt seit dem [Zellgitter](./zellgitter.md) nur noch die Ebene, und in der
Ebene war dort nichts.

Der Fehler ist nicht neu. Burgerladen, Hub und die Küche der Testwelt hatten
ihn alle schon, und jede Welt hat ihn für sich behoben, mit eigener Menge,
eigenem Überschreiben von `cellBlocked` und einer eigenen Zusammensetzung
derselben Arbeitsplatte (`core/kitchenFit.ts`,
`PlateUpWorld.addStationView`, `restaurantPlan.ts`). Wer die nächste Welt
baut, findet also drei Vorbilder, von denen keines _das_ Vorbild ist, und dazu
viertausendfünfhundert Dateien im Regal, die aussehen, als könnte man sie
einfach hinstellen.

Deshalb gibt es zwei Kataloge. Gewünscht: _„wir sollten einen 3d Objekt roh
Katalog haben, der nur optisch da ist aber keine fertigen Objekte sind, und
einen Spiel Element Katalog haben die man in der Welt platzieren kann, weil
diese Eigenschaften haben 2d, Interaktion etc."_ Die nächsten Agenten sollen
sich _„daraus bedienen statt direkt an die 3d Elemente zu greifen"_. Und für
das Möbel, an dem es auffiel: _„Das Element der Arbeitsplatte sollte
eigentlich sowieso bereits von Haus aus 2x2 undurchgehbar sein."_

## Die Regel

- **Möbel und Stationen einer Welt kommen aus `ELEMENTS`**
  (`worlds/elements/elementCatalog.ts`) und werden mit `placeElement`
  hingestellt. Auf diesem Weg sind die Zellen gesperrt, bevor irgendetwas
  geladen ist.
- **Ein Rohmodell wird nicht mit `placeModel` als Möbel in eine Welt
  gestellt.** `placeModel` stellt ein Bild mit einem Körper hin, aber es
  sperrt keine Zelle. Genau das ist der Fehler, den der Besitzer immer wieder
  findet.
- **Neue Geometrie wird nicht gebaut**, außer es ist ausdrücklich gewünscht
  (siehe die Arbeitsregeln). Fehlt ein Element, kommt ein neues in den
  Katalog, zusammengesetzt aus Dateien des Regals.
- **Rohmodelle sind für das Bild da.** Was obenauf liegt, was man in der Hand
  trägt, was eine Station zeigt, was im Menü in der Kachel steht: Dafür nimmt
  man Pfade aus dem Regal, und dafür gibt es `itemModels.ts`. Man steht
  nicht davor und läuft nicht dagegen.
- Wände, Böden, Türen und Treppen sind keine Spielelemente. Böden, Türen und
  Treppen kommen über den Plan und sperren über den Plan
  ([Zellgitter](./zellgitter.md)), Wände sind Regalstücke auf den Fugen
  (`grid/shelfWalls.ts`) — auch die aus dem Möbelkatalog: Dort stehen die
  Regalwände der Test Navigation, aber als Modelle auf der Fuge und nicht als
  Element ([Die Wand](#die-wand-aus-der-test-navigation)).

## Was ein Spielelement ist

Ein Eintrag `GameElement` in `ELEMENTS`:

| Feld     | Was es sagt                                                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`     | Der Name, unter dem ein Plan es bestellt (`ElementSpot.element`), etwa `'board'`                                                                   |
| `label`  | Der deutsche Name                                                                                                                                  |
| `tiles`  | **Grundfläche in Kacheln**, Breite × Tiefe, für ein Element, das nach Süden schaut. Der runde Tisch `[2, 2]`, alles andere `[1, 1]`, auch das Band |
| `height` | **Wie hoch der Körper ist**, nicht das Modell: 1,40 m für jedes Möbel mit Zweck, 0,5 m für das flache Band                                         |
| `solid`  | **Was davon sperrt**, in Metern um die Mitte — ohne Angabe die ganze Grundfläche. Beim Baum nur der Stamm (`[0.5, 0.5]`, 2 × 2 Zellen), bei Gras und Blumen `[0, 0]`: nichts |
| `kind`   | Was man damit tut, eine Stationsart der Küche (`kitchenCarry.StationKind`) ; `null` für etwas, das nur im Weg steht                                |
| `work`   | Bei einem Brett: `'chop'` (schneiden) oder `'roll'` (ausrollen)                                                                                    |
| `gives`  | Was eine Kiste oder ein Stapel hergibt, als Vorschlag. Die Stelle im Plan gewinnt (`ElementSpot.gives`)                                            |
| `holds`  | Was zu Beginn **auf** der Station steht und mitgenommen werden kann, als `KitchenItem`: der Topf auf dem Herd (`stove-pot`). Kein Teil des Bilds   |
| `lit`    | **Ob das Möbel selbst leuchten kann** — ohne Angabe jedes Element mit `kind` (`elementLit`). Dann sind alle Teile Bilder unter der Station         |
| `opens`  | **Was `A` aufmacht**, wenn es keine Station ist: `'outfit'`, die Seite _Aussehen_ (die Garderobe). Dann leuchtet das ganze Möbel, sobald man darauf schaut |
| `rack`   | **Ein Abtropfgitter wie in der Sandbox**: höchstens vier Teller, zu Beginn voll, einzeln in den Fächern gezeigt. Nur beim Tellerstapel             |
| `parts`  | Die Rohmodelle, aus denen es besteht. Das erste steht auf dem Boden                                                                                |

**Die Grundfläche wird ganz gesperrt.** Eine Kachel ist ein Meter und
2 × 2 Zellen, und ein Element auf einer Kachel sperrt alle vier. Ein Tisch auf
2 × 2 Kacheln sperrt sechzehn, das Band vier wie jede Kachel. Halbe Sperren gibt
es nicht. Die Arbeitsplatte ist damit _„von Haus aus 2x2 undurchgehbar"_, egal
in welcher Welt sie steht.

**Der Körper ist 1,40 m hoch**, auch wenn die Platte nur einen halben Meter
misst. Der Spieler springt gut einen Meter hoch, und wer einmal oben stand,
lief die ganze Zeile entlang. Die ganze Rechnung dazu steht in
[Modelle → Der Körper unter dem Möbel](./modelle.md#der-körper-unter-dem-möbel).
Der Test verlangt es für jedes Element mit `kind`. Nur das Band liegt flach,
denn es hat keinen Zweck, den man mit `A` erreicht, und das Gitter sperrt es
trotzdem.

**Ein Teil (`ElementPart`)** ist eine Adresse im Regal und die Stelle, an der
sie sitzt. Alle Maße gelten für ein Element, das nach Süden schaut: x nach
Osten, z nach Süden, von der Mitte der Grundfläche aus.

- `at`: Versatz der Mitte in Metern. Ohne Angabe sitzt das Teil in der Mitte.
- `stack`: obenauf auf dem Teil davor, auf dessen gemessener Oberkante.
- `on`: auf einem früheren Teil (Index), etwa der Portionierer auf der Platte
  statt auf dem Hörnchenstapel daneben.
- `sink`: so viele Meter tiefer als die Oberkante dessen, worauf es steht,
  etwa die Teller **in** der Tellerkiste statt auf ihrem Rand.
- `inside`: im Teil davor, mit dessen Maßstab und Drehung und nicht
  nachgemessen, etwa das Eis in seiner Wanne. Die beiden Dateien haben
  denselben Ursprung und sitzen nur zusammen richtig.
- `tilt`: umlegen, bevor gemessen wird. Das Messer kommt stehend und liegt
  auf dem Brett.
- `yaw`: eine zusätzliche Drehung um die Hochachse.
- `height` bzw. `scale`: auf eine Höhe bringen oder um einen Faktor
  vergrößern, zusätzlich zum Maßstab des Pakets. `height` geht vor.
- `rooted`: an seinem Ursprung, wie die Datei es hat, statt mit der Mitte
  seiner Hülle über der Stelle und der Unterseite auf dem Boden. Für Bäume und
  tief steckende Felsen: Der Ursprung sitzt im Stamm, die Krone hängt bis
  0,3 m zur Seite, und die Wurzeln reichen bis 0,25 m unter den Boden.
- `surface`: Hier wird abgelegt (`PlacedElement.top`). Ohne diese Angabe ist
  es das erste Teil.
- `node`: nur dieses Stück aus der Datei, etwa `'Witch_Hat'` aus der Hexe —
  für das, was Figuren tragen und das Regal nicht einzeln hat. Was an
  Knochen hängt, kommt in seiner Ruhelage, als gewöhnliches Netz.
- `size`: auf Breite × Höhe × Tiefe gebracht, jede Achse für sich — derselbe
  Pfosten als Stange, Fuß oder Haken.
- `pose`: **frei in den Raum gestellt** statt auf den Boden oder ein Teil —
  der Ursprung ist die Mitte der Unterseite, gedreht wird mit `quat` oder
  `rot` (YXZ), gesetzt auf `at` (x, y, z von der Mitte der Grundfläche am
  Boden). `at` (zweistellig), `stack`, `on` und `tilt` gelten dann nicht; der
  Test verlangt das.
- `stretch`: nach `pose` um die Mitte der Grundfläche gestreckt, je Achse ein
  Faktor.

**Kein Kistendeckel in der Liste.** Den stellt der Lader unter jede Kiste von
selbst (`core/kaykitCrate.kaykitPlinth`). Zwei Deckel hießen eine Kiste zehn
Zentimeter über der Zeile daneben, und der Test verbietet es.

## Die Elemente heute

Alles aus _Restaurant Bits_ (`restaurant-bits/…`), außer wo es dasteht.
`counter_A`/`counter_B` sind `kitchencounter_straight_A`/`_B`.

| Id                                                | Name                                 | Art (`kind`)                                 | Teile                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | ------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `counter`                                         | Arbeitsplatte                        | `top`                                        | `counter_A`                                                                                                                                                                                                                                                   |
| `board`                                           | Arbeitsplatte mit Schneidebrett      | `board`, `work: 'chop'`                      | `counter_B`, `cuttingboard` (Ablage), `knife` flach und quer                                                                                                                                                                                                  |
| `rolling-board`                                   | Nudelbrett                           | `board`, `work: 'roll'`                      | `counter_A`, `rollingpin` auf 10 cm                                                                                                                                                                                                                           |
| `crate-buns` … `crate-mushrooms`                  | zwölf Vorratskisten                  | `crate`                                      | je eine Kiste mit Inhalt (`crate_buns`, `crate_steak`, …); `crate()` baut sie. Die Steakkiste gibt ein Steak (brät wie Schinken, auf dem Brett wird es zum Patty)                                                                                             |
| `crate-patties`                                   | Pattykiste                           | `crate`, gibt `patty`                        | leere `crate`, darin vier rohe Pattys (`food_ingredient_burger_uncooked`, `sink`)                                                                                                                                                                             |
| `crate-plates`                                    | Tellerkiste                          | `crate`, gibt `plate`                        | leere `crate`, darin sechs `plate`, je 13° verdreht (`sink`); gibt Teller, so viele man will, und nimmt einen leeren zurück                                                                                                                                   |
| `pizza-supply`                                    | Pizza-Vorratsbox                     | `crate`, gibt `pizza`                        | leere `crate`, obenauf `food_pizza_pepperoni_plated`                                                                                                                                                                                                          |
| `stove`                                           | Herdplatte mit Pfanne                | `stove`, `holds: 'pan'`                      | `stove_single`; die Pfanne der Sandbox-Küche (`itemModels.KITCHEN_PAN`, aus `kitchen.glb`) steht als Ding der Küche darauf, geht mit und brät darin                                                                                                           |
| `stove-pot`                                       | Herdplatte mit Topf                  | `stove`, `holds: 'pot'`                      | `stove_single`; der Topf `pot_A` ist kein Teil, sondern steht als Ding der Küche darauf und geht mit                                                                                                                                                          |
| `hob`                                             | Herdplatte                           | `stove`                                      | `stove_single`, leer; ein Topf mit Wasser darauf kocht wie auf `stove-pot`                                                                                                                                                                                    |
| `griddle`                                         | Sichere Kochstelle                   | `griddle`                                    | die gebaute Kochstelle der Sandbox (`built:griddle`, `elements/builtParts` → `kitchenGriddle.GriddleKit`, ausdrücklich gewünscht); brät ohne Pfanne allein, verkohlt nie, brennt nie                                                                          |
| `sink`                                            | Waschbecken                          | `sink`                                       | `kitchencounter_sink` (Platte mit Becken und Hahn); füllt den Topf, den man davorhält                                                                                                                                                                         |
| `extinguisher`                                    | Feuerlöscher                         | `top`, `holds: 'extinguisher'`               | `counter_A`; der Löscher (`mixed-bag/fire_extinguisher`) steht als Ding der Küche darauf und geht mit                                                                                                                                                         |
| `bin`                                             | Mülleimer                            | `bin`                                        | `block-bits/trashcan` auf 0,55 m                                                                                                                                                                                                                              |
| `plate-stack`                                     | Tellerstapel                         | `drain`, gibt `plate`, `rack`                | `counter_A`, das leere `dishrack`; die Teller (höchstens vier) zeigt die Station einzeln in den Fächern                                                                                                                                                       |
| `bowl-stack`                                      | Schüsselstapel                       | `drain`, gibt `bowl`                         | `counter_A`, zwei `bowl`                                                                                                                                                                                                                                      |
| `pizzabox-stack`                                  | Kartonstapel                         | `drain`, gibt `pizzabox`                     | `counter_A`, `pizzabox_stacked`                                                                                                                                                                                                                               |
| `ice-stand`                                       | Eisstand                             | `drain`, gibt `cone`                         | `counter_A`, `icecream_cone_stacked` (0,5 m), `icecream_scoop` (0,3 m, liegend), wie die Eisecke im Laden, nach Süden; ein Vorrat: `A` gibt ein Hörnchen                                                                                                      |
| `ice-machine`                                     | Eismaschine                          | `icemachine`                                 | `counter_A`, obenauf `icecream_machine`; füllt die Eiswanne, die man davorhält — leer mit Vanille, danach jedes Mal die nächste Sorte (`kitchenCarry.atMachine`, `kitchenRecipes.nextTrayFill`)                                                               |
| `ice-tray-vanilla` / `-strawberry` / `-chocolate` | Eiswanne Vanille / Erdbeere / Schoko | `top`, `holds: 'tray'` mit Sorte (`holdsOn`) | `counter_A`; die Wanne (`icecream_container` + Füllung) steht als Ding der Küche darauf, um 90° gedreht, eine je Platte. Man trägt sie; auf einer Platte schöpft man daraus, sie wird nie leer (`kitchenRecipes.trayScoop`); leer macht sie nur der Mülleimer |
| `crate-trays`                                     | Kiste mit Eiswannen                  | `crate`, gibt `tray`                         | leere `crate`, darin zwei leere Wannen; gibt leere Wannen und nimmt leere zurück                                                                                                                                                                              |
| `belt`                                            | Förderband                           | —                                            | `platformer/yellow/conveyor_4x4x1_yellow`, halb gedreht; eine Kachel, 0,5 m (der Lader bringt es auf 1 × 1 m)                                                                                                                                                 |
| `table-round`                                     | Runder Tisch                         | —                                            | `table_round_B_tablecloth_red`; `[2, 2]` Kacheln                                                                                                                                                                                                              |
| `chair`                                           | Stuhl                                | —                                            | `chair_A`                                                                                                                                                                                                                                                     |
| `supply-box`                                      | Vorratsbox                           | —                                            | leere `crate`; was obenauf liegt und was `A` tut, bestimmt die Welt                                                                                                                                                                                           |
| `pizza-oven`                                      | Pizzaofen                            | —                                            | `pizza_oven`, zum Ansehen                                                                                                                                                                                                                                     |

**Das Band ist eine Kachel** (September 2026): _„Statt 2x1 conveyers will ich
1x1 conveyer belts haben. In der Restaurant Test Welt und in der normalen
Restaurant Welt."_ Das quadratische Band des Regals
(`platformer/<Farbe>/conveyor_4x4x1_<Farbe>`) ist in der Quelle 4,2 × 1,0 × 4,0
und wäre mit dem Maßstab des Pakets 2 × 2 m. Der Lader gibt ihm deshalb einen
eigenen Maßstab je Achse (`core/kaykitFit.KAYKIT_FILE_SCALE`: 1/4,2 × 0,5 ×
1/4), und so liegt es in **jeder** Welt auf genau einer Kachel, 0,5 m hoch, auch
wenn es jemand aus dem Modellregal nimmt. Das schmale `conveyor_2x4x1` (1,1 ×
2 m) bleibt, wie es ist; auf eine Kachel gestaucht, wären seine Pfeile verzerrt.

**Herd, Topf und Spüle wie im Restaurant** (September 2026): _„Der Herd
daneben soll der Herd aus der Restaurant Welt sein und nicht der mit den 4
Platten drauf. Der Topf darauf soll auch der sein aus der Restaurant Welt. Es
fehlt noch ein Waschbecken wo ich den Topf vollmachen kann."_ `stove-pot` ist
der einflammige `stove_single` mit `pot_A`, wie in der Küche der Testwelt
(`kitchenFit`, `stove-pot`), und der Topf ist dort wie hier **ein Ding, das man
mitnimmt**, kein Teil des Möbels: Die Station fängt mit `on = pot` an
(`holds`), und die Stationsschicht zeichnet ihn wie alles, was auf einer
Station liegt. Den mehrflammigen `stove_multi` stellt kein Element mehr hin.

Die zwölf Kisten geben: Brötchen, Patty (die Fleischkiste `crate_steak`, wie in
der Burgerküche), Salat, Tomate, Käse, Schinken, Teig, Karotte, Kartoffel,
Zwiebel, Salami (`pepperoni`) und Pilz (`mushroom`). Salami und Pilz sind noch
keine `KitchenItem` und stehen deshalb in `SHOW_ONLY_GIVES`: nur zum Ansehen,
in Schauküchen. Eine Stelle, die sie wirklich ausgeben soll, braucht zuerst
die Zutat (siehe unten). `elementCatalog.test.ts` sieht nach, dass jedes
andere `gives` einer Kiste, eines Stapels oder einer Wanne ein Ding der Küche
ist.

**Die Art im Katalog ist nicht immer die Stationsart der Küche.** Das
übersetzt `stationLayer.stationKind`, und zwar an genau drei Stellen (die
Stationsart `pot`, der eingebaute Suppentopf, gibt es in der Regel weiter,
aber kein Element nimmt sie mehr: Gekocht wird im Topf auf dem Herd):

- `rolling-board` bleibt im Katalog ein `board` mit `work: 'roll'` und wird
  für die Regel zum Nudelholz (`roller`).
- Alles ohne Zweck (Tisch, Stuhl, Band) wird zu gar keiner Station. Der
  **Eisstand ist seit September 2026 ein Vorrat** (`drain`, gibt `cone`) und
  keine Eisecke mehr: Wer ihn benutzt, bekommt ein Hörnchen, und die Wannen
  türmen Kugeln darauf. Die Eisecke des Restaurants
  (`plateUpIceView.IceCorner`) regelt nur noch das Restaurant.

**`ElementKind` ist `StationKind`.** Die Eiswannen zu zweit auf einer Platte
(`ice-tubs`, zwei Stationen auf einem Element) sind im September 2026
entfernt worden — gemeldet: _„Bei den Waffeln gibt es anscheinend Elemente mit
zwei Eis trays auf einer Arbeitsplatte, bitte fixen."_ Eine Wanne steht auf
ihrer eigenen Platte (`ice-tray-*`). Die Mechanik mehrerer Stationen je
Element (`StationSlot.shift`, `partSlot`) ist geblieben, trägt aber nichts
mehr.

### Die Wand aus der Test Navigation

Gewünscht (September 2026): _„die Wand aus Navigation Test als Möbel
einrichten"_ — und gleich danach genauer: _„ich hatte in navigation welt die
wände nicht als "blöcke" defineirt, sondern diese waren immer zwischen platten
definiert. und ich konnte die schräg setzen. Also eigentlich das was in
modellregal wall ist, soll einfach nur nach möbel kommen, aber eben nicht als
"block""_.

Die Wände sind deshalb **keine Spielelemente**. Das _Haus_ im Katalog
(`HOUSE_FOLDER`, `BUILD_MODELS`: Wand, Putzwand, Tür, Fenster) führt statt Elementen
Regalmodelle (`FurnitureFolder.models`, alle aus `WALL_MODELS` und dazu die
Putzwand): die Fensterwand und ihre schmale Hälfte
(`shelfWalls.SHELF_WINDOW_PIECES`, die Kammern der Test Navigation), die graue
Prototypwand, mit der die Test Navigation ihre Schrägen baut (`SHELF_WALL`),
deren Hälfte, die Putzwand des Restaurants ganz und halb, den Durchgang
(`navTestPlan.GATE_MODEL`) und den breiten Durchgang. Im _Baukasten_ werden
sie gezogen wie in _Die Sims_ ([Bauen](./bauen.md#wand-ziehen-wie-in-die-sims)).
Jede Kachel ist die des Modellregals
(`kaykitIndex.fileEntry`, mit ⓘ und Steckbrief), nur die Id trägt den Ort,
und genommen wird wie dort (`PortalWorld.takeModel`): Die Wand rastet **auf
der Fuge** zwischen zwei Kacheln ein, lässt sich unter 45° setzen und ist für
das Zellgitter eine Wand an der Kante (`GridWorld.collectWalls`), kein
gesperrter Block.

Ein erster Umbau hatte die Fensterwand als Element `wall` auf zwei Kacheln
gestellt, bündig an deren Vorderkante und mit beiden Kacheln gesperrt — genau
der Block, der nicht gewünscht war. Er ist wieder weg.

### Natur: Bäume, Sträucher, Steine, Gras, Holz

Gewünscht (Oktober 2026): _„beim Katalog möchte ich nun gerne Natur als
weiteren Punkt haben. Schau aus dem Modellregal was alles Natur sein kann und
füge es hinzu. Bei Bäumen z.B. sollten wir nur den Stamm als nicht betretbar
machen."_ Die Elemente stehen in `elements/natureCatalog.ts`
(`NATURE_ELEMENTS`, `NATURE_CATALOGUE`), im Katalog als dritter Bereich
**Natur** neben Haus und Restaurant (`NATURE_FOLDER`), mit den Ordnern Bäume,
Sträucher, Steine, Gras & Blumen, Holz und Alles. Keines hat einen Zweck
(`kind: null`), und die Ordner sortieren nach dem Anfang der Id (`tree-`,
`bush-`, `rock-`, `plant-`, `wood-`).

**Unter der Krone geht man durch.** Die drei breiten Laubbäume — _Laubbaum_,
_Großer Laubbaum_, _Schirmbaum_ — belegen so viele Kacheln, wie ihre Krone
breit ist, mindestens 2 × 2. Dort fasst man sie an, und dort rasten sie ein.
Gesperrt ist aber nur der Stamm: `solid: [0.5, 0.5]`, also die 2 × 2 Zellen um
die Mitte, und der Kasten in der Physik ist ebenso klein. Weil nur die
Stammzellen frei sein müssen (`FurnishedWorld.furnishSpot` → `cellsFree`),
dürfen sich zwei Kronen überlappen, und man kann einen Wald dicht pflanzen.

**Alle anderen Bäume stehen auf einer einzigen Zelle** (Oktober 2026,
gewünscht: _„Außer: Laubbaum, großer Laub Baum, und Schirm Baum, sollen alle
Bäume nur 1 Kachel Grundfläche belegen, und daher stehen die nicht mittig auf
einer 2x2 Kachel sondern nur mittig auf einer Kachel"_ — „Kachel" meint dort
die Zelle). `natureCatalog.sapling` gibt ihnen `tiles: [0.5, 0.5]`; das ist der
einzige Fall einer Grundfläche, die kein Vielfaches einer Kachel ist
(`elementPlace.onCells`). Dann darf `ElementSpot.x`/`z` auf einer halben Kachel
liegen, `spotAround` rastet **je Zelle** ein (auf jeder der vier Zellen einer
Kachel steht ein eigener Baum), `spotTiles` nennt die Kachel, in der die Zelle
liegt, und das Gitter unter der Hand leuchtet nur diese eine Zelle
(`PortalWorld.updatePlaceGrid` → `PlaceGrid.show(…, size = CELL)`). Welches
Element man im Bau-Modus anfasst, entscheidet die Grundfläche selbst
(`spotCovers`) und nicht ihre Kachel. Die Detailseite zeichnet die Zellen in
Weltlage (`elementCellsOverlay` an einer Stelle bei 0, 0): der Baum mittig auf
seiner Zelle, die Kachellinien darum.

**Ein Element mit eigenem `solid` steht ganz als Bild da** und nicht als festes
Stück der Welt (`placeModel`), sonst bekäme die ganze Krone einen Körper.
Sträucher, Steine und Holz sperren ihre Kacheln wie ein Möbel. Gras, Blumen und
der Pilz haben `solid: [0, 0]`: keine Zelle und kein Kasten (`placeElement`
ruft dann `blockSolid` gar nicht auf). Im Katalog steht die Zeile darunter
entsprechend (_„4 Zellen gesperrt"_, _„begehbar"_), und der Steckbrief zeichnet
die ganze Grundfläche mit dem Stamm in der Mitte (`footprintRows`,
`spotFootprintCells`).

**Die anderen sieben Farben stehen unter _Farben_** (Oktober 2026,
gewünscht: _„Natur → weitere Farben: color2–8 als Herbst- oder
Fantasy-Varianten, ohne neue Formen"_): `NATURE_COLORS` nennt sie nach der
Krone des Laubbaums — Dunkelgrün, Hellgrün, Türkis, Goldgelb, Orange, Rot,
Rosa —, und `NATURE_COLOR_ELEMENTS` baut daraus jedes Element, das ganz aus
_Forest Nature_ besteht, noch einmal (Id `tree-leafy-red`, Name „Laubbaum,
Rot", dieselbe Grundfläche und Sperre). Im Ordner _Natur_ steht vor _Alles_
der Ordner _Farben_ mit einem Unterordner je Farbe (`NATURE_COLOR_FOLDER`);
_Alles_ und die Ordner nach Art bleiben in der ersten Farbe. Die Steine
wechseln mit (grau, rotbraun, sandfarben, blaugrau …).

**Aus dem Regal:** _Forest Nature_ in den Ordnern nach Art in **einer** Farbe
(`color1`; das Paket hat jedes Modell achtmal, nur in anderer Palette), daraus
je Art eine Größenstufe.
Dazu kommen die Herbstbäume und der tote Baum aus _Halloween Bits_, der
Fliegenpilz (_Mystery Monthly 5_, Hexe), die Flachsblume (_Mixed Bag_) und das
Holz aus _Resource Bits_ und _Mystery Monthly 4_. Was fehlt und warum:

- Die Bäume aus _City Builder_ und _Medieval Hexagon_ sind bei Maßstab 0,5
  Modellbahn-Bäume von einem halben Meter.
- Die Hügel und Klippen von _Forest Nature_ (`Hill_*`) sind Gelände und kein
  Möbel.
- Kiesel unter 15 cm wären auf einer Kachel nur ein Punkt.
- Der Weihnachtsbaum hat keinen Stamm, sondern eine Matte mit Geschenken —
  er steht als Möbel unter _Weihnachten_.

### Weltraum: alle Teile aus _Space Base Bits_

Gewünscht (Oktober 2026): _„beim Katalog eine weiteren Ordner anlegen:
Weltraum und darin die Space base Teile einbauen, prüfe auch für jeden eben die
Größe wie viel Platz die verbrauchen werden."_ Die Elemente stehen in
`elements/spaceCatalog.ts`, im Katalog als vierter Bereich **Weltraum**
(`SPACE_FOLDER`) mit den Ordnern Module, Versorgung, Fracht, Fahrzeuge, Tunnel,
Gelände und Alles — alle **69** Dateien des Pakets, jede genau einmal, Ids
`space-…`.

**Ein Maßstab für alles: 2 m je Einheit der Quelle** (`SPACE_SCALE` = 4 auf das
Regal mit 0,5). Das Paket ist ein Aufbauspiel im Kleinen — bei 0,5 wäre ein
Basismodul 50 cm hoch und eine Frachtkiste 25 cm. Bei 2 m ist die Frachtkiste
eine Kachel, ein Modul so hoch wie die Figur und das Landungsschiff 6 m lang;
und weil alle Teile denselben Faktor haben, passen sie aufeinander wie im Paket
(Dachmodule auf Module, Tunnel dazwischen).

**Die Grundfläche ist gemessen**, nicht geschätzt: die Hülle jeder Datei aus
ihren Knoten, mal 2, je Seite auf ganze Kacheln aufgerundet — gut 10 cm
Überstand passen noch auf die kleinere Zahl (Kiste 1,04 m → 1 Kachel,
Wassertank 4,10 m → 4). Die Maße stehen als Kommentar hinter jeder Zeile, und
`spaceCatalog.test.ts` misst die Dateien bei jedem Lauf nach. Ein Auszug:

| Teil | Maße (B × H × T) | Kacheln |
| ---- | ---------------- | ------- |
| Frachtkiste, Behälter | 1,0 × 1,0 (0,4) × 1,0 m | 1 × 1 |
| Frachtstapel | 2,0 × 2,0 × 2,0 m | 2 × 2 |
| Rover | 1,0 × 1,1 × 1,8 m | 1 × 2 |
| Hydroponik, klein | 2,8 × 1,9 × 2,8 m | 3 × 3 |
| Wassertank | 4,0 × 2,1 × 4,1 m | 4 × 4 |
| Basismodul | 4,0–4,9 × 2,0 × 4,3–4,8 m | 4–5 × 5 |
| Gelände, Hang | 4,0 × 2,0–4,0 × 4,0 m | 4 × 4 |
| Landungsschiff | 6,0 × 2,6 × 4,6 m | 6 × 5 |
| Tunnel schräg, lang | 5,9 × 1,2 × 5,9 m | 6 × 6 |

Alles sperrt seine ganze Grundfläche und hat keinen Zweck (`kind: null`). Der
Test der Füße (`elementFeet.test.ts`) stellt deshalb jedes Element auf einen
Boden von 17 × 17 Kacheln — auf den alten 9 × 9 hatte das Landungsschiff
keinen Rand mehr.

**Haunting nimmt daraus**, was es vorher roh aus dem Paket nahm
(`haunting/world3d/stationProps.FIXTURE_ELEMENTS`): Wassertank
(Dekontamination), Behälter C (Reaktor), Frachtstapel A (Frachtcontainer),
Hydroponik klein (Hydroponikbeet). Gezeichnet wird das Element
(`elementView.elementModel`), eingepasst in die Stellfläche des Raumplans
(`FIXTURE_CATALOG`) — die Station hängt an diesen Maßen, nicht an den Kacheln
des Katalogs.


### Stadt: Straßen, Plätze und Häuser aus _City Builder Bits_

Gewünscht (Oktober 2026): _„Ich will nun die großen Straßen-Elemente als
Katalog-Ordner bekommen ‚Stadt', die aber eben einen Boden mit Möbeln
darstellen (ein Preset also). Die Straßenteile müssen wir noch weiter
verbessern durch Laternen und Ampeln […]. Ich wünsche mir damit dann schneller
eine Stadt aufbauen zu können. Nimm gerne die Häuser mit auf als Elemente im
Katalog, die auch entsprechend ihre Fläche benötigen."_ Die Elemente stehen in
`elements/cityCatalog.ts`, im Katalog als Bereich **Stadt** (`CITY_FOLDER`):
Straßen, Plätze & Parks, Häuser, Straßenmöbel, Autos, Grün und Alles, Ids
`city-…`.

- **4 m je Einheit der Quelle** (`CITY_SCALE` = 8 auf das Regal). Das Paket ist
  eine Modellstadt: Bei 0,5 wäre eine Straße 1 m breit und eine Laterne 48 cm.
  So ist ein Auto 3,8 m, eine Laterne 3,8 m, ein Haus 6,6–12,2 m hoch.
- **Der Gehweg gehört zur Straße** (gewünscht: _„den Gehweg will ich bei den
  Straßen bereits inkludiert haben, sodass ich die Häuser nur noch in die
  freien Plätze stellen muss"_). Ein Straßenstück ist 12 × 12 Kacheln
  (`CITY_BLOCK`): 6 m Fahrbahn (`ROADWAY`, zwei Spuren zu 3 m) und je 3 m
  Gehweg (`WALK`) — gewünscht: _„Der Gehweg ist mir zu klein. Der sollte
  mindestens 3 Felder breit sein"_ (die erste Fassung hatte 1 m). Laternen und
  Ampeln stehen einen halben Meter vom Bordstein (`CURB`), die Bäume der Allee
  mitten auf dem Gehweg. Platz und Parks haben dieselben 12 × 12 m. Die Platten der Quelle werden dafür auf genaue Maße gebracht
  (`plate`: `ElementPart.size` mit `pose`) — die Fahrbahn auf 6 m Breite, der
  Gehweg als Streifen aus der Gehwegplatte. An Kreuzung, Einmündung und Ecke
  liegt die Fahrbahn der Quelle auf 6 × 6 m in der Mitte, zu jedem Ausgang
  drei Meter Gerade, an jeder geschlossenen Seite Gehweg und in jeder Ecke ein
  Quadrat Gehweg (`junctionParts`) — so laufen Fahrbahn, Bordstein und
  Markierung über jede Fuge durch. Die Gerade läuft nach Süden; gedreht wird
  beim Hinstellen wie jedes Element.
- **Straßen und Plätze sind Boden mit Möbeln** (`floor`, `solid: [0, 0]`): Man
  geht darüber und stellt darauf. Was an so einer Stelle steht, ist Teil des
  Elements (`onSlab`: am Ursprung der Datei, auf der Platte) — der Vorschlag:
  - _Straße mit Laternen_: zwei Laternen versetzt an beiden Bordsteinen, Arm
    über der Fahrbahn; _Straße_ ohne alles für lange Strecken.
  - _Zebrastreifen mit Ampeln_: je Seite eine Ampel mit Arm.
  - _Straßenecke_ und _Kurve_: eine Laterne auf der Insel der inneren Ecke,
    der Arm schräg in die Fahrbahn.
  - _Einmündung_: drei Ampeln, _Kreuzung_: vier Ampelbrücken — eine je
    Zufahrt.
- **Wo eine Ampel steht** (gemeldet: _„die Ampeln wirken nicht an der
  richtigen Stelle"_): vor der Kreuzung, rechts der Spur, die auf sie zufährt
  (Rechtsverkehr), das Signal dem Verkehr zugewandt, der Arm über dieser Spur.
  In der Quelle zeigt der Arm nach Westen und das Signal nach Süden —
  ungedreht also die Ampel an der Südostecke für alle, die nach Norden fahren;
  die anderen sind um Vierteldrehungen gedreht. Vorher hingen die Brücken der
  Kreuzung die Straße entlang, und zwei Richtungen hatten keine.
- **Laternen tauschen im Spiel** (gewünscht: _„bei einem Teil noch die
  Laternen austauschen können (im Spiel)"_): Straße, Ecke und Kurve gibt es in
  drei Fassungen — moderne Laterne, alte, Doppellaterne (`lampRoad`,
  `city-road`, `city-road-old`, `city-road-double`). Jede Laterne ist für sich
  angemeldet (`ElementPart.swaps`, `StationLayer.addSwappers`): Wer auf sie
  schaut, sieht sie gelb umrandet, und `A`/`E` stellt an derselben Stelle die
  nächste Fassung hin (`GameElement.opens: 'swap'`, `swap`,
  `FurnishedWorld.swapElement`), unter derselben Zeile der Weltänderungen. Im
  Ordner _Straßen_ steht nur die erste, die anderen unter _Alles_.
  - _Allee_: die Gerade mit vier Bäumen an den Bordsteinen.
  - _Gehweg_, _Park_, _Park mit Bäumen_ (mit Bank), _Park mit Büschen_,
    _Parkweg_ (Bank, alte Laterne, Büsche).
  - _Parkweg, Ecke_, _Parkweg, Abzweig_, _Parkweg, Kreuzung_ (Oktober 2026,
    gewünscht: _„Stadt → Häuser und Park ergänzen"_): die anderen
    Wegplatten der Quelle, gedreht wie die Straße — die Ecke von Süden nach
    Osten, der Abzweig nach Osten (`PARK_TSPLIT_YAW`, in der Quelle zeigt er
    nach Süden) —, mit Bäumen, Büschen, Bank und Laterne auf dem Rasen. Dazu
    unter _Straßenmöbel_ und _Grün_ der kleine Karton, der Abfall und der
    Strauch (`box_B`, `trash_B`, `bush`). Die Häuser standen schon im Katalog
    (`building_*_withoutBase`). **Die Parkmauern fehlen weiter**
    (`park_wall_*`): Ihre Mauer liegt an einer Kante einer Platte von 12 × 12
    m, und eine Sperre, die kein Rechteck um die Mitte ist, kennt der Katalog
    nicht — man liefe durch die Mauer.
- **Wie hoch**: Gehweg und Bordstein 16 cm (`SLAB_TOP`), die Fahrbahn darin
  13 cm, Platz und Park 10 cm — alles mit `plate` auf genaue Maße gebracht. Weniger geht nicht: Die Platten der Welt
  schieben ihren Tiefenwert nach vorn (`plateFloor`, `polygonOffset`), und eine
  Fahrbahn 1 cm über dem Boden war unsichtbar — nur die Bordsteine schauten
  heraus.
- **Die verzierten Parkplatten der Quelle gehen nicht** (`park_*_decorated_*`):
  Auf Maß gebracht würden ihre Bäume mit der Platte flachgedrückt. Deshalb die
  flache Platte und das Grün als eigene Teile.
- **Häuser** (`house`): so breit wie das Haus selbst (auf Kacheln
  aufgerundet: A und C 5, B und D 7, E bis H 8) und **6 m tief**
  (`HOUSE_DEPTH`, ein halbes Straßenstück) — die Häuser der Quelle sind 5,2
  oder 5,8 m tief, also stehen alle auf sechs Kacheln, und **zwei Häuser
  Rücken an Rücken füllen genau ein Straßenstück**. Gefragt: _„was ist aber
  nun mit zwei Häusern, die Rücken an Rücken stehen, geht das? Sind alle
  Häuser gleich groß von der Tiefe?"_ — vorher war jedes Haus 12 m tief mit
  Garten dahinter, Rücken an Rücken ging nur mit zwei Gärten dazwischen.
  Vorn bündig an den Gehweg der Straße, darunter Pflaster in Gehweghöhe, damit
  zwischen Haus und Gehweg kein Streifen Boden durchscheint. Gesperrt ist die
  ganze Fläche. Gemeldet an der ersten Fassung, in der jedes Haus auf 8 × 8 m
  Gehweg stand: _„Bei den Gebäuden muss der benötigte Platz reduziert werden,
  sodass links und rechts nicht diese leeren Gassen sind"_. Die Vorderseite
  schaut wie bei jedem Element nach Süden — zur Straße hin drehen; Häuser
  einer Reihe stehen Wand an Wand.
- **Garten und Hinterhof** (`city-garden`, `city-yard`): 12 × 6 m, so tief wie
  ein Haus — für Blöcke, die tiefer sind als zwei Häuser.
- **Kurze Geraden** (`shortRoads`, `city-road-7`, `city-road-old-7`,
  `city-road-avenue-7` …): jede Art in 1 bis 11 m Länge, ab 6 m mit einer
  Laterne (getauscht wie auf dem ganzen Stück) oder einem Baum. Sie legt das
  Ziehen zwischen Kreuzungen, die keine ganze Zahl Stücke auseinanderliegen
  ([Straßen ziehen](bauen.md#straßen-ziehen-wie-in-cities-skylines)); im
  Katalog stehen sie nicht, auch nicht unter _Alles_.
- **Große Plätze**: _Stadtpark_ (`city-park-big`, 24 × 24 m: Rasen,
  Wegekreuz mit Doppellaterne, Bäume, Bänke, eine Hecke aus Büschen mit einer
  Lücke an jedem Weg — die Mauerteile der Quelle sind Kacheln mit der Mauer an
  einer Kante und würden mit dem Maß gestreckt), _Platz mit Café_
  (`city-square-cafe`, vier Café-Tische mit Schirm) und _Marktplatz_
  (`city-square-market`, sechs Stände aus Gemüsekisten unter Schirmen).
- **Aus anderen Paketen, was auf Straße und Gehweg steht** — gewünscht: _„neue
  Modelle, die auf der Straße sind, dann auch in den Katalog nehmen"_:
  Sonnenschirm in vier Farben (`city-umbrella-…`, _mixed-bag_), Café-Tisch
  (`city-cafe-table`, Tisch und zwei Stühle aus _furniture-bits_ unter einem
  Schirm), Fahrrad (`city-bicycle`, _mixed-bag_), Leitkegel (`city-cone`,
  _platformer_) — auf Meter gebracht mit `ElementPart.height` (`kit`). Die
  Gemüsekisten der Marktstände (_restaurant-bits_) gibt es nur als Teil des
  Marktplatzes.
- **Die Testwelt _Stadt_** (`test-city`, siehe [Welten](welten.md)) ist
  nur aus diesem Ordner gebaut (`city/cityPlan.ts`).
- **Straßenmöbel, Autos, Grün** stehen auch einzeln: Laternen und Ampeln
  sperren nur ihren Mast (eine Zelle), Autos zwei mal vier Kacheln, die
  Stadtbäume (4 m Krone) nur ihren Stamm.

| Teil | Maße (B × H × T) | Kacheln |
| ---- | ---------------- | ------- |
| Straße (6 m Fahrbahn, 2 × 3 m Gehweg), Platz, Park | 12 × 0,16 × 12 m | 12 × 12 |
| Kurze Gerade (nur beim Ziehen) | 12 × 0,16 × 1–11 m | 12 × 1–11 |
| Garten, Hinterhof | 12 × 0,1 × 6 m | 12 × 6 |
| Haus A/B (2 Etagen) | 4,8–6,4 × 6,6 × 5,2–5,8 m | 5–7 × 6 |
| Haus C/D/G/H (hoch) | 4,8–8,0 × 11,9–12,2 × 5,2–5,8 m | 5–8 × 6 |
| Laterne / Ampel mit Arm | 1,0 × 3,8 × 0,3 m | 1 × 1 |
| Auto | 1,7 × 1,4 × 3,8 m | 2 × 4 |

### Möbel: Tische als Ablage, Kleinkram obenauf, Teppiche als Boden

Gewünscht (Oktober 2026): _„Und nun furniture als Katalog Ordner aus
Modelregal. Wobei bitte gerne darauf achten, dass man auf Teppiche noch etwas
stellen kann (also so behandeln wie ein Boden auf Boden). Monitore, desk
lampen, kleine Blumen, Cup, Bücher auch auf Boden oder Tische stellen kann.
Die Tische bitte behandeln wie Arbeitsplatten (also das man was drauf stellen
kann (nicht dass man darauf schneiden kann)). Also sollten diese Katalog
Elemente die Eigenschaft bekommen, dass man etwas darauf abstellen kann (wäre
gut es als Flag bei solchen Objekten zu speichern […])."_

Die Elemente stehen in `elements/furnitureCatalog.ts`, im Katalog als Bereich
**Möbel** gleich nach dem Haus (`FURNITURE_BITS_FOLDER`): Sitzen, Tische,
Betten, Schränke, Lampen, Schreibtisch & Technik, Kleinkram, Pflanzen,
Teppiche, Alles — 62 der 74 Dateien aus _Furniture Bits_, Ids `furniture-…`.
**Es fehlen die zwölf, die an eine Wand gehören** (Bilderrahmen groß, mittel,
klein; die Wandregale): Ihr Ursprung sitzt in der Mitte, und an Wände hängt
der Katalog noch nichts. **Maßstab des Regals** (0,5): Das Paket ist im Maß
der Restaurant-Möbel gebaut, Schreibtisch, Tisch und Arbeitsplatte sind gleich
hoch (0,5 m). Die Kacheln sind gemessen (Kommentar hinter jeder Zeile); was
höchstens 0,6 m im Quadrat misst, steht auf einer Zelle.

**Drei Merkmale am Element** (`GameElement`), je eines je Wunsch:

| Merkmal | Was es heißt | Wer es hat |
| ------- | ------------ | ---------- |
| `shelf` — **Ablage** | Darauf stellt man ab, was ablegbar ist | die Tische, Schreibtische und Kommoden ohne Deko, die Arbeitsplatte (`counter`), der runde Tisch |
| `rests` — **ablegbar** | Passt auf eine Ablage; fällt es dort hin, steht es obenauf, sonst auf dem Boden | der Computer, Spielkonsole, Stiftebecher, Tisch- und Schreibtischlampen, Becher, Tassen, Bücher, Bilderrahmen zum Hinstellen, Kissen, Kakteen |
| `floor` — **Bodenbelag** | Liegt flach, sperrt nichts (`solid: [0, 0]`), darauf stellt man, was man will | die sechs Teppiche |

**Der Computer** (`furnitureCatalog.computer`) ersetzt Monitor, Tastatur, Maus
und Mauspad als einzelne Teile — gewünscht: _„Bitte Monitor, Maus und Tastatur,
Mauspad entfernen aus dem Katalog (als einzelne Gegenstände) und dafür einen
Gegenstand 2x2 Computer (modern) anbieten (mit den vier Dingen)"_. Ein Element
auf **einer Kachel, also 2 × 2 Zellen**, ablegbar: hinten der Monitor, vorn die
Tastatur, rechts das Mauspad mit der Maus darauf. Auf den Schreibtisch passen
zwei.

**Die Pflanzen** (die vier Kakteen) stehen **doppelt so groß** wie im Regal
(`furnitureCatalog.PLANT_SCALE`, die kleinen auf einer Zelle, die großen mit
0,88 m auf einer Kachel) und sind ablegbar: auf den Boden oder eine Ablage.
Gewünscht: _„Die pflanzen alle bitte doppelt so groß und wieder aufnehmbar"_ —
und dann genauer: _„nur aufnehmbar während des Modus Einrichtung, nicht
spielen"_. Aufgenommen werden sie deshalb wie jedes Möbel mit dem Kran im
Modus _Einrichten_ (`movesFurniture`); beim _Spielen_ tut `A` an ihnen nichts.
Einen Tag lang waren sie Dinge der Küche (wie die Tomate, beim Spielen in die
Hand) — das war das Gegenteil des Gewünschten und ist zurückgenommen.

**Für die Dinge der Küche dasselbe Merkmal** (`kitchenRecipes.ITEM_RESTS`):
Pizza, Schinken, Käse, Teller, Pfanne, Feuerlöscher … — alles, was die Küche in
die Hand gibt, **außer** Tapetenbahnen, Bodenplatten und Treppe (die gehören an
die Wand oder in einen Raum). Eine Fläche (`kitchenCarry.onTop`) nimmt nur, was
ablegbar ist. **Die Tische sind Flächen der Küche** (`kind: 'top'`): Darauf legt
man Pizza oder Teller ab wie auf die Arbeitsplatte, geschnitten wird nicht
(dafür gibt es `board`). Das Kleine (`rests`) dagegen ist ein Element und
wird hingestellt wie jedes andere Möbel aus dem Katalog.

**Wie etwas auf eine Ablage kommt** (`FurnishedWorld.furnishSpot`):

- Fällt ein ablegbares Element über die Grundfläche einer Ablage
  (`shelfUnder`, auch einer, die noch lädt — eine eingefügte Liste nennt den
  Schreibtisch und gleich danach den Monitor), steht es auf ihrer Oberkante
  (`ElementSpot.y` = `PlacedElement.top`) und **sperrt keine Zellen**
  (`spotSolid` ist `[0, 0]`, sobald `y` gesetzt ist; die Ablage sperrt sie
  schon). Es ist dann nur Bild, kein Stück der Welt.
- Jede Zelle seiner Grundfläche muss auf der Ablage liegen und frei sein
  (`fitsOnShelf`): zwei Tassen auf einer Zelle gehen nicht, ein Stuhl auf dem
  Tisch auch nicht (er ist nicht ablegbar, und die Zellen sind gesperrt).
- **Die Höhe wird nicht gespeichert**: Die Liste der Weltänderungen führt nur
  `x`, `z`, `face`; beim Einfügen entscheidet, welche Ablage dann darunter
  steht.
- **Umstellen** (Kran): Gehoben wird **von oben nach unten** (`placedAt`) —
  erst was auf der Ablage steht, dann das Möbel, zuletzt der Teppich. Wer die
  Ablage hebt, nimmt mit, was darauf steht (`CarriedElement.riders`, von der
  Ablage aus gesehen: `riderPlace`). Hingestellt kommt es wieder an dieselbe
  Stelle auf ihr, mitgedreht (`riderSpot`), und in der Liste der
  Weltänderungen ändert sich seine alte Zeile (`recordElementOf`).
- Ein Teppich sperrt nichts; was auf ihm steht, steht auf dem Boden (die
  0,05 m Teppich bleiben unberücksichtigt).

### Taverne, Halloween, Weihnachten: weitere Gruppen aus dem Regal

Gewünscht (Oktober 2026), nach einer Liste, welche Pakete noch nicht im
Katalog stehen: _„Ich denke auch 4 und 3 und 2 wären gut."_ — Weihnachten
(_Holiday Bits_), Halloween (_Halloween Bits_) und Taverne (_Dungeon_). Drei
Dateien, gebaut wie `furnitureCatalog.ts`: im Maßstab des Regals (0,5, das
Maß der Restaurant-Möbel), jede Zeile mit Breite × Höhe × Tiefe dahinter,
Kacheln aufgerundet, was höchstens 0,6 m im Quadrat misst auf einer Zelle.
Tafeln und Theke sind Ablagen (`shelf`, `kind: 'top'`), Flaschen, Kerzen,
Kürbisse und Geschenke ablegbar (`rests`), Teppiche, Erde und Trittsteine
Boden (`floor`). Die Ids fangen mit dem Ordner an (`tavern-`, `halloween-`,
`holiday-`), und die Unterordner sortieren nach dem Anfang der Id.

- **Taverne** (`tavernCatalog.ts`, `TAVERN_FOLDER`): Theke (Thekenstücke
  mit Ecken, Schankregal, Zapffass, Fässer, Flaschen), Tafeln & Sitzen,
  Schlafen, Truhen & Lager, Regale & Licht. Was an eine Wand gehört (Banner,
  Wandregale, Wandfackeln, Schwert und Schild), fehlt wie bei den Möbeln, dazu
  Wände, Böden und Treppen des Pakets und das Gerüst. Truhe mit Zähnen,
  goldene Truhe und die dritte Reisekiste sehen geschlossen aus wie ihre
  Nachbarn und fehlen deshalb.
- **Halloween** (`halloweenCatalog.ts`, `HALLOWEEN_FOLDER`): Friedhof (Gräber,
  Särge, Gruft, Bildstock, Erde), Zäune & Tore, Kürbisse & Deko, Bauernhof
  (Vogelscheuche, Heu, Wagen, Traktor, Wegweiser, Maisfeld, Trittsteine) und
  Bäume (die übrigen Größen der Herbstbäume und toten Bäume, auf einer Zelle
  wie die Natur). **Die offenen Tore sperren nichts** (Torbogen, Holztor,
  Kürbistor: `solid: [0, 0]`), sonst käme niemand hindurch; das Maisfeld ist
  auf eine Kachel gebracht (`fit: 1`), damit es sich zu einem Irrgarten reiht.
- **Weihnachten** (`holidayCatalog.ts`, `HOLIDAY_FOLDER`): Tannenbaum,
  Geschenke, Schnee, Deko, Wohnzimmer (Ohrensessel, Fußbänke, Teppiche,
  Kakao, Plätzchen), Spielzeug und Lebkuchen-Bausteine. **Die Eisenbahn ist ein
  Stück** (`holiday-train`: vier Gleise, Lok, Tender und Wagen auf 1 × 2
  Kacheln) und der **Geschenkehaufen** auch — die Gleise einzeln passen nicht
  auf das Raster (die Kurve misst 1,12 m). Was hängt (Kranz, Mistelzweig,
  Glocke) und das Dach des Lebkuchenhauses fehlen.

### Die Garderobe: `A` öffnet _Aussehen_

Gewünscht (Oktober 2026): _„haben wir einen garderoben ständer als model? das
wäre mir lieber als der kleiderschrank um das aussehen menü zu öffnen (wie bei
inventar menü)"_ — und dazu _„denk dran, dass es auch gehightligheted werden
soll wenn man mit diesem interagieren will"_. Die **Garderobe** (`coat-rack`,
`elements/coatRack.ts`, im Möbelkatalog unter _Möbel → Schränke_) ersetzt den
Kleiderschrank der Sandbox. Sie stand dort neben dem Startplatz, bis die
Sandbox im Oktober 2026 leer wurde; seitdem stellt man sie aus dem Katalog hin,
wo man sie braucht.

**Im Suchfeld findet man sie auch als _Kleiderständer_** — gemeldet: _„nur
finde ich es nicht unter ‚kleiderständer'"_. Ein Element kann dafür weitere
Namen tragen (`GameElement.aka`); die Suche des Katalogs (`catalogSearch`)
liest sie mit, wie die Ordnernamen.

- **Eine Kachel, 2 × 2 Zellen, Körper 1,40 m** wie jedes Möbel. Sie ist
  1,40 m hoch; mit den Hüten reicht alles höchstens 0,49 m aus der Mitte.
- **Aus einem einzigen Pfosten** (`dungeon/post.glb`, ein Garderobenständer
  fehlt im Regal): Stange und Manschette, vier Füße schräg von der Manschette
  auf den Boden, je Seite zwei Haken — unten kurz und fast waagerecht (75° aus
  dem Lot), oben lang und steil (25°), nach einem Referenzfoto des Besitzers.
  Stange und Füße sind gestreckt (`stretch` 2 × 0,8 × 2), die Haken nicht.
- **Daran hängt, was Figuren tragen** (`node`): hinten unten der Hut der Hexe
  (`Witch_Hat`, 56 cm breit), vorn unten der Umhang des Schwarzen Ritters
  (`BlackKnight_Cape`, 72 cm), rechts oben der Helm des Paladins
  (`Paladin_Helmet`, 58 cm). Auf dem Kopf sind diese Hüte 0,9 bis 1,1 m breit —
  der Kopf einer Figur misst 64 cm —, und so passten sie nicht auf eine Kachel.
- **Die Lagen kommen aus einer Physikrechnung**, die nur dafür lief und nicht
  im Repository steht: Jeder Hut fiel mit seinem Dreiecksnetz samt Innenseite
  als Hitbox (Rapier) auf die Haken, bis er stillhing, und die Lage steht fest
  in `pose.quat`. Der Helm ist innen geschlossen und rutschte nicht; er ist
  von Hand gesetzt, der Umhang vom oberen an den unteren Haken gerückt.
- **`A` öffnet _Aussehen_** (`GameElement.opens: 'outfit'`): Die
  Stationsschicht macht daraus keine Station, sondern meldet das Element
  einmal an (`StationLayer.add` → `addOpener`, `OPENER_REACH` = 0,5 m,
  `aimOnly`), hängt **alle Teile** unter den Anker in der Mitte und lässt so
  das ganze Möbel gelb umranden, sobald man darauf schaut. Der Druck geht
  über `StationHost.open` an die Welt und von dort an
  `WorldContext.openOutfit` — dieselbe Seite wie _Aussehen anpassen_ an der
  Figur. Umstellen im Bau-Modus nimmt die Anmeldung mit (`StationLayer.remove`).

## Hinstellen

**Eine Stelle (`ElementSpot`, `elementPlace.ts`)** ist, was ein Plan über ein
Möbel sagt: `id` (eindeutig im Plan), `element`, die Kachel `x`/`z`, `face`
und wahlweise `gives`, `label` und `offset`.

- **`x`/`z` ist die Nordwestecke der Grundfläche**, wie sie nach dem Drehen
  daliegt, und nicht die Mitte. Ein Plan denkt in Kacheln. Eine Mitte bei 4,5
  für ein Band von zwei Kacheln und bei 4,0 für eines von einer wäre genau die
  Rechnung, die sonst jeder Plan selbst anstellt, und jeder etwas anders.
- **`face` sagt, wohin die Vorderseite schaut**: `'S'` (+z, ohne Angabe),
  `'E'`, `'N'`, `'W'`. Norden ist −z wie überall hier. `faceYaw`: Süden 0,
  Osten π/2, Norden π, Westen −π/2, dieselbe Drehung wie three.js'
  `rotation.y`. Nach Osten oder Westen liegt die Grundfläche quer
  (`spotSize`), ein Band `[1, 2]` nach Osten also zwei Kacheln breit.
- Rechnungen ohne Bild: `spotCentre`, `spotTiles`, `spotCells` (dieselben
  Zellen, die `GridWorld.blockFootprint` sperrt), `spotFront` (die Mitte der
  Vorderkante, dort steht, wer es benutzt), `rotateOffset`, und
  **`overlaps(spots)`**, die Kacheln, die zwei Stellen belegen. Diese Frage
  gehört in den Test jedes Plans, denn im Bild sieht man den Fehler erst, wenn
  man hindurchläuft.
- **`offset`** (in Metern) rückt Bild und Anker, die Sperre nicht.
  Das ist für ein Möbel, das nicht auf der Mitte seiner Kachel steht: Der Stuhl
  am runden Tisch steht 1,05 m von dessen Mitte, und dort sitzt der Gast.
  Gesperrt bleibt die Kachel, auf der er zum größten Teil steht, denn das
  Gitter kennt nur ganze Zellen.

**`placeElement(host, spot)`** (`elementView.ts`) stellt es hin:

1. **Zuerst die Sperre, noch bevor irgendetwas geladen wird**:
   `host.blockSolid(mitte, breite, tiefe, element.height)` sperrt die Zellen
   und stellt den unsichtbaren Kasten, sobald der Aufruf zurückkehrt, auch
   wenn danach kein Modell kommt (kein WebGL, keine Leitung, ein falscher
   Name). Ein Möbel, durch das man läuft, solange es lädt, ist eines, durch das
   man läuft.
2. Der **Anker** (`PlacedElement.anchor`) hängt schon im Bild: auf dem Boden,
   in der Mitte der Vorderkante, mit dem Element gedreht, +z zeigt zu dem, der
   davorsteht. Wer daran etwas Benutzbares hängt (den Saum für `A`, eine
   Tafel), muss nicht warten.
3. Dann die Teile. Das erste steht als festes Stück der Welt (`placeModel`,
   von oben durchsichtig wie jede Wand, gebündelt gezeichnet). Alles darauf
   ist nur Bild, gemessen und mit der Unterseite auf der Oberkante dessen,
   worauf es steht. Braucht schon das erste Teil einen Maßstab oder ein
   Umlegen, steht es ebenfalls nur als Bild da; den Körper hat ohnehin der
   Kasten.
4. Zurück kommt ein `PlacedElement` mit **`top`**, der Höhe, auf der abgelegt
   wird (die Oberkante des Teils mit `surface`, sonst des ersten; ohne Modell
   0,5 m, `FALLBACK_TOP`), dazu `cells`, `block` (für
   `GridWorld.unblockSolid`) und die Bilder der Teile.

**Was eine Welt dafür können muss** ist `ElementHost`: `blockSolid`,
`placeModel`, `measure`, `load`, `add`, `alive`, fünf Handgriffe, die eine
`GridWorld` ohnehin hat. Sie sind dort geschützt. Die Welt baut sich deshalb
ein Objekt aus Pfeilen und macht sie nicht öffentlich
(`FurnishedWorld.elementHost`). `alive` sorgt dafür, dass nach dem
Verlassen nichts mehr hingestellt wird, was noch aus dem Netz kam.

**Hingestellt wird über `furnish(host, spots, stations, then?)`**
(`elements/furnish.ts`): jede Stelle durch `placeElement`, und **jedes
hingestellte Element an die Stationsschicht** (`StationLayer.add`). Ob daraus
eine Station wird, entscheidet das Element (`elementStations`: mit
Stationsart ja, Band, Tisch und Stuhl nein), und **nicht eine zweite Liste
der Welt**. Genau die hatte das erste Test Restaurant: Die Kisten am
Burgerband standen als Elemente da, aber nicht in der Liste der Stationen,
und so kam es an: _„In der Test Restaurant welt sind die Vorrats Boxen mit
Brötchen und Käse und co beim conveyer belt nicht interagierbar."_ Ein
Element, das scheitert, fehlt mit einer Warnung, die Welt stirbt nicht daran.

## Der Möbelkatalog im Menü

**Auf der Detailseite eines Elements wird eingemessen** (Oktober 2026,
`elementTweaks.ts`, `MenuDetail.tweak`). Gewünscht: _„in der detailliert eine
checkbox haben um die Modelle zu verschieben. Dann bei aktiv sind Buttons zu
sehen: +-0,5 Kacheln in jede Richtung x,Y. Und dann kann ich den diff mit dem
Modell speichern. Zudem will ich mit checkbox besetzte boden Kacheln anpassen
[…] Unten gibt es einen Button um die Anpassungen alle zu kopieren damit ich
diese dir geben kann."_

- _Modell verschieben_ zeigt je Achse − und +, je Druck eine halbe Kachel
  (0,5 m, `TWEAK_STEP`: _„falls ein Gegenstand genau zwischen zwei Kacheln
  steht"_). Verschoben werden die Teile, nicht die Zellen
  (`PageDetail.applyShift`).
- _Belegte Zellen anpassen_ stellt die Kamera senkrecht darüber, orthogonal
  (`PageDetail.placeTop`), macht das Ding zum Geist und lässt Zellen antippen:
  gesperrt ↔ frei, auch zwei Zellen um die Grundfläche herum
  (`DetailRequest.onCell`). Gezeichnet werden die Zellen dann von der Vorschau
  selbst (`DetailOptions.cells`), nicht mehr vom Modell.
- _Speichern_ legt nur Abweichungen vom Katalog in `localStorage`
  (`bgvr.elementTweaks`); _Zurücksetzen_ holt den Katalogstand zurück.
- Ganz unten: **_Alle Anpassungen kopieren_** — JSON mit Name,
  Grundfläche, `shiftMetres` und `blockedCells` samt `blockedBefore`, Zellen
  als `'ix,iz'` ab der Nordwestecke der Grundfläche, nach Süden gedreht.

**_Spieler anzeigen_** (Oktober 2026, `DetailOptions.player`) stellt die
Spielfigur neben das Ding — gewünscht: _„eine checkbox für Spieler anzeigen,
dass ich einen Spieler im darin sehen kann"_. Es ist die Figur ab Werk
(`previewGrid.DETAIL_PLAYER`, das Mannequin aus `FIGURE_DEFAULT`), geholt über
dieselbe Fabrik wie das Ding, auf `CHEF_HEIGHT` (1,6 m) gestellt, mit den
Sohlen auf dem Boden des Dings, rechts daneben mit 0,4 m Luft, und im Idle
statt in der T-Pose (`PageDetail.takePlayer`). Die Kamera geht so weit
zurück, dass beide ins Bild passen (`frameAll`); beim Zellentippen von oben
ist sie weg. Der Schalter steht auf jeder Detailseite, auch im Modellregal,
und bleibt wie Gitterboden und Hülle von Seite zu Seite an.

**Das ist ein Werkzeug zum Einmessen, kein Teil des Spiels**: In der Welt
gilt, was im Katalog steht. Wer die kopierte Liste bekommt, überträgt sie in
`elementCatalog.ts`/`natureCatalog.ts` (`ElementPart.at` für die
Verschiebung; eine Belegung, die kein Rechteck um die Mitte ist, braucht dafür
noch eine Sperre je Zelle in `placeElement`). Der _Gitterboden_-Schalter fehlt
auf diesen Seiten: Das Raster liegt schon unter dem Ding (gemeldet: _„Die
Option mit dem Gitterboden verstehe ich nicht. Es ist bereits ein gitterboden
angezeigt."_).

**Seit Ende September 2026 heißt er _Katalog_** — gewünscht: _„das Menü
„Möbel" dahingehend erweitern bzw. auch umbenennen, dass es wie bei Sims der
Katalog ist für die Sachen die man kaufen kann und einbauen kann."_ Er steht
unter _Bauen & Gestalten_ gleich hinter dem Spielmodus und hat neben den
Möbeln das **Haus** mit Wand, Putzwand, Tür und Fenster (die kurzen Stücke,
`elementCatalog.BUILD_MODELS`). Die Bauteile sind Regalwände und
keine Spielelemente, und deshalb steht der Katalog mit ihnen in **jeder** Welt
(`PortalWorld.elementFolders`). _Setzen_ ohne Pinsel schlägt den Katalog auf
(`catalogueId`).

**Ein Katalog für alle Welten** (Ende September 2026). Gewünscht: _„mir fehlen
im Katalog die anderen Sachen wie Burger, Eis, etc.? Die sollen bitte nicht pro
Welt gelten, sondern im Katalog soll es für alle Welten einen Katalog
geben."_ Was vorher nur das Test Restaurant konnte — Möbel hinstellen,
umstellen, Stationen auf `A`, das Getragene in der Hand —, steht deshalb in
`grid/FurnishedWorld.ts`, und darauf stehen **alle Gitterwelten**: Sandbox,
Test Navigation, Bauplatz, Hub, Test Restaurant, Restaurant und Hausbau. Jede
zeigt dieselben Ordner (`FURNITURE_FOLDERS`); der Hausbau legt Böden, Treppen
und seine Kisten dazu (`super.elementFolders()`), weil nur er Tapete, Belag
und Etagen versteht. Eine Welt sagt nur noch, was sie von selbst hinstellt
(`spots`, ab Werk nichts) und wohin der Katalog darf (`onGround`, ab Werk jede
Kachel des Erdgeschosses). Die Stationen entstehen erst mit dem ersten Möbel
(`furnishing`). Ohne Katalogmöbel bleiben Haunting (ein eigenes Spiel) und die
Welten ohne Gitter (Portal-Labor, Interaktionslabor, Alpen) — dort gibt es
keine Zellen, die ein Möbel sperren könnte.

**Und das Modellregal steht wieder unter _Bauen_, gleich hinter dem Beutel**
(`ui/menuGroups.ts`, Id `assets`) — zum Ansehen, nicht zum Bauen. Eine Weile
hieß es _Rohmodelle_ und stand in der Werkstatt (gewünscht: _„das modelregal
sollten wir dahingehen runterstufen bzw umbenennen, dass es nur eher die 3d
Modelle ohne Funktion sind […] als Hilfestellung"_); dort hat es niemand
gefunden, und im Oktober 2026 kam es zurück: _„können wir das modelregal
wieder einfügen, nur um die modelle zu betrachten (ich meine nicht den
katalog)"_. Die Unterzeile sagt, was es ist — _Alle 3D-Modelle ansehen —
Rohmodelle ohne Funktion, nicht der Katalog_. Nehmen kann man daraus weiter;
gebaut wird aus dem Katalog.

Gewünscht (September 2026): _„Ich brauche bei Möbel Katalog, die Funktion
Möbel: eine Arbeitsplatte 2x2 nicht durchlaufen, Arbeitsplatte mit Schneide
Brett, Herdplatte mit Pfanne, Herdplatte mit Topf, Herdplatte.
Waschbecken"_. Das Modellregal gibt nur Bilder her; wer darin eine
Arbeitsplatte nimmt, stellt ein Fass hin, durch dessen Zellen man läuft. Der
Möbelkatalog gibt **Spielelemente** her.

- **Wo:** Menü _Bauen & Gestalten_ → **Katalog** (`PortalWorld.elementMenu`,
  Id `elements`, `ui/menuGroups.ts`). Die Möbel in jeder Gitterwelt
  (`FurnishedWorld.elementCatalogue`); in Welten ohne Gitter stehen darin nur
  Wände, Türen und Fenster.
- **Was:** `FURNITURE_CATALOGUE` in `elementCatalog.ts`, in der Reihenfolge
  des Wunsches und mit seinen Worten (die Namen der Elemente selbst):
  Arbeitsplatte
  (`counter`), Arbeitsplatte mit Schneidebrett (`board`), Herdplatte mit
  Pfanne (`stove`), Herdplatte mit Topf (`stove-pot`), Herdplatte (`hob`, neu:
  der leere Herd für den Topf) und Waschbecken (`sink`) — dazu, als Vorräte
  (_„die Arbeitsplatte mit dem scoop und cones und die Platte mit ice trays
  als Vorräte"_), der Eisstand mit Hörnchen und Portionierer (`ice-stand`)
  und die Eiswannen (`ice-tray-*`, eine je Platte). Dahinter die **Vorräte** (gewünscht:
  _„vorratskisten: Salat, Käse, Wurst, Steak, Tomaten, Teller, Schüssel,
  Zwiebel, …"_): Salat, Käse, Schinken (die Wurst), Fleisch (das Steak, gibt
  das Patty), Tomaten, Tellerstapel, Tellerkiste, Schüsselstapel, Zwiebeln, dann Brötchen,
  Teig, Karotten, Kartoffeln, Pizza-Vorratsbox, Kartonstapel, Nudelbrett und
  Mülleimer. Salami und Pilze fehlen mit Absicht: Sie sind noch keine Zutat
  (`SHOW_ONLY_GIVES`), und der Test verbietet sie hier. Jedes
  belegt eine Kachel, also 2 × 2 Zellen, alle gesperrt, und tut auf `A`, was
  es in der Küche tut.
- **Natur** ist seit Oktober 2026 der dritte Bereich: Bäume, Sträucher,
  Steine, Gras & Blumen, Holz und Alles (`NATURE_FOLDER`, siehe
  [Natur](#natur-bäume-sträucher-steine-gras-holz)). Unter einem Baum sperrt
  nur der Stamm.
- **Möbel** steht seit Oktober 2026 gleich nach dem Haus: Sitzen, Tische,
  Betten, Schränke, Lampen, Schreibtisch & Technik, Kleinkram, Pflanzen,
  Teppiche und Alles (`FURNITURE_BITS_FOLDER`, siehe
  [Möbel](#möbel-tische-als-ablage-kleinkram-obenauf-teppiche-als-boden)).
- **Weltraum** ist seit Oktober 2026 der vierte: Module, Versorgung, Fracht,
  Fahrzeuge, Tunnel, Gelände und Alles (`SPACE_FOLDER`, siehe
  [Weltraum](#weltraum-alle-teile-aus-space-base-bits)).
- **Stadt** steht seit Oktober 2026 dahinter: Straßen, Plätze & Parks, Häuser,
  Straßenmöbel, Autos, Grün und Alles (`CITY_FOLDER`, siehe
  [Stadt](#stadt-straßen-plätze-und-häuser-aus-city-builder-bits)).
- **Taverne, Halloween, Weihnachten** stehen seit Oktober 2026 am Ende
  (`TAVERN_FOLDER`, `HALLOWEEN_FOLDER`, `HOLIDAY_FOLDER`, siehe
  [Taverne, Halloween, Weihnachten](#taverne-halloween-weihnachten-weitere-gruppen-aus-dem-regal)).
- **Erst der Bereich, dann die Art** (Ende September 2026, gewünscht:
  _„Katalog Ordner besser gruppieren (Haus, Restaurant, etc.) … Ggf wie bei
  Sims"_): Die erste Seite hat nur noch zwei Ordner, **Haus** und
  **Restaurant** (`KITCHEN_FOLDERS`: Allgemein, dann nach
  Art **Kochen, Vorräte, Geschirr**, dann je Gericht, zuletzt Alles). Ein
  Ordner kann Unterordner tragen (`FurnitureFolder.folders`); wer einem
  Ordner irgendwo im Baum etwas hinzufügt, nimmt `mapFolder`. Die Menü-Ids
  tragen den ganzen Weg (`elements/restaurant/burger:board`).
- **Im _Haus_ stehen die Bauteile direkt** (gewünscht: _„wand (kann direkt das
  wand element sein) · tür · treppe · böden (ordner wie jetzt) · tapeten"_):
  Wand, Putzwand, Tür und Fenster als Kacheln (`HOUSE_FOLDER`, deutsche Namen
  aus `BUILD_LABELS`), im Hausbau dazu die Treppe und ihre Kiste und die
  Ordner **Böden** und **Tapeten** (`HausbauWorld.elementFolders`). Erst die
  Kacheln, dann die Ordner. Eine Welt ohne Gitter hat nur das Haus, und ein
  einziger Ordner steht gleich offen.
- **Keine Doppeltür im Katalog** — gewünscht: _„wenn ich eine tür über mehrere
  felder ziehe, soll er statt zwei einzel türen, dann automatisch die
  doppeltür nehmen"_. Die Tür (`Wall_Doorway`) ist das kurze Stück zur
  Doppeltür (`Wall_Doorway_Wide`) wie die halbe Wand zur ganzen
  (`wallFullOf`, `wallHalfOf`): Gezogen kommen Doppeltüren aneinander, am
  ungeraden Ende eine einfache.
- **Vorratskisten haben keinen eigenen Ordner mehr**, sondern stehen bei dem,
  was sie hergeben, und tragen **oben links eine Kiste** (`MenuEntry.mark: 'crate'`,
  `PageMenu.mark`) — jedes Element mit `kind: 'crate'`, auch in der Küche.
  Gewünscht: _„für die vorratskisten reicht es, wenn bei den jeweiligen
  elementen oben links ein Icon ist"_. Nur am Schirm; am Handgelenk steht es
  im Namen.
- **Böden und Tapeten haben keine eigene Kistenkachel** — die Kiste oben
  links auf der Kachel des Belags **ist ein Knopf** und nimmt seine
  Vorratskiste (`MenuEntry.markRun`; die Welt nennt sie über
  `catalogItem(...).crate`). Gewünscht: _„für jeden boden soll es immer
  automatisch den button oben links geben für eine vorratskiste mit dem
  boden. Dann brauche ich das vorratskisten item nicht."_ Die Kisten bleiben
  im Katalog der Welt (`elementCatalogue`), stehen aber in keinem Ordner.
  Nur am Schirm; am Handgelenk gibt es den Knopf nicht.
- **Tapeten zeigen ihr Muster** statt der Stoffbahn in der Hand
  (`wallpaperSkin.wallpaperSwatch`, Vorschau-Id `wallpaper:<id>`, über
  `PortalWorld.catalogPreview`) und haben ein ⓘ mit Steckbrief
  (`wallpaper.wallpaperFacts`; `catalogItem` darf `preview` und `facts`
  mitgeben). Das Musterstück ist nur ein Bild im Menü, kein Stück der Welt.
- **Jeder Ordner zeigt sein prägnantestes Stück** (`FurnitureFolder.cover`,
  `folderCover`): gerendert wie jede Kachel, der Herd auf _Restaurant_, der
  Durchgang auf _Haus_, die Pizza-Vorratsbox auf _Pizza_ … Ohne Angabe das
  erste Stück darin; solange es lädt, steht die Ordner-Ikone da.
- **Ein Suchfeld wie im Modellregal** (`elements/catalogSearch.ts`, an jeder
  Seite des Katalogs über `MenuEntry.find`): gesucht wird im ganzen Katalog,
  alle Wörter müssen vorkommen, Umlaute gefaltet. Die Ordnernamen zählen mit
  (`pizza` findet alles aus _Pizza_), Englisch über Id und Adresse (`cheese`),
  und das Wörterbuch des Regals übersetzt (`kiste` → `crate`). Dasselbe Möbel
  aus mehreren Ordnern steht in den Treffern einmal.
- **Die Vorschau steht still** (`previewGrid.PREVIEW_YAW`, auch am
  Handgelenk): schräg von vorn statt drehend — gewünscht: _„Die Elemente nicht
  mehr automatisch drehen in der Vorschau"_.
- **Die Ordner der Küche** (`KITCHEN_FOLDERS`, unter _Restaurant_): **Allgemein**
  (Arbeitsplatte, Waschbecken, Mülleimer, Feuerlöscher auf Arbeitsplatte),
  je Gericht **Pizza, Burger, Eis, Waffeln, Suppe** — jeder mit der
  Arbeitsplatte vorn und den Möbeln, mit denen `elementFlows.test.ts` das
  Gericht kocht, Burger und Pizza mit Tellerstapel und Tellerkiste — und **Alles** mit
  der ganzen Liste; die **Wände** mit den Regalwänden der Test
  Navigation, genommen wie im Modellregal
  ([Die Wand](#die-wand-aus-der-test-navigation)), stehen unter _Haus_. Gewünscht zuerst: _„einige Möbel doppelt gelistet …
  unterordner … Pizza, Burger, Eis, Waffeln, Suppe"_, dann: _„bei den unter
  Ordner die Arbeitsplatte jeweils rein. Und die Möbel aus dem Restaurant
  Ordner dafür raus. Dafür einen Ordner allgemein … Im Restaurant Ordner noch
  einen Ordner „alles“"_. **Doppelt ist nur die Kachel**: Dasselbe Element
  steht in mehreren Ordnern, hingestellt wird jedes Mal dasselbe. Die Menü-Ids
  tragen deshalb den Ort (`elements/restaurant/burger:board`), denn Ids im Menü sind
  Adressen. Eine Welt gibt ihre Ordner über `PortalWorld.elementFolders` her;
  ohne Ordner steht die Liste wie früher gleich auf der Seite.
- **Der Feuerlöscher** (`extinguisher`) ist eine Arbeitsplatte, auf der zu
  Beginn der Löscher steht (`holds: 'extinguisher'`, Bild
  `mixed-bag/fire_extinguisher.glb` aus `itemModels`): nehmen, mitnehmen,
  wieder abstellen, wie der Topf auf dem Herd.
- **Das ⓘ jeder Kachel** (gewünscht: _„wie im Model Regal noch die Details
  sehen, aus welchen Modellen das besteht und auch wie das Grid bzw die
  Position ist von dem ganzen (Grid Flächen Belegung)"_) schlägt dieselbe
  Detailseite auf wie im Modellregal. Im Bild steht das ganze Element und
  darunter seine **gesperrten Zellen in Rot** (`elementView.elementCellsOverlay`,
  gerechnet über `spotCells`, also genau die, die das Gitter sperrt), mit
  einer Kachel Zell- und Kachelgitter ringsum und einem grünen Pfeil an der
  Vorderseite; die Umrisse der Zellen sieht man durch das Möbel hindurch. Die
  Anzeige zählt nicht zu Maßen, Hülle und Gitterboden der Seite
  (`previewGrid.DETAIL_OVERLAY`). Der Steckbrief (`elementFacts.ts`, rein):
  Id zum Kopieren, Grundfläche, Zellen, die **Belegung** als kleines Bild aus
  `■` (Norden oben, vorn unten), Körperhöhe, Zweck, was es hergibt oder
  trägt, und dann **jedes Teil** mit seiner Adresse im Regal (zum Kopieren)
  und seiner Lage (_auf dem Boden_, _obenauf auf Teil 1_, Versatz, Höhe,
  umgelegt, gedreht, Ablage). Gibt das Möbel etwas in die Hand (Hörnchen,
  Teller, Pfanne …), steht darunter der Knopf **_Halten einstellen_**: eine
  Seite mit dem Ding in der Luft, dem Halterzylinder darin und der VR-Hand
  daran, sechs Regler für den Zylinder
  ([Hände → Und was die Küche in die Hand gibt](haende.md#und-was-die-küche-in-die-hand-gibt-hängt-auch-am-halterzylinder)).
- **Wie:** Getragen wird das **Bodenstück** des Elements wie ein Modell aus
  dem Regal (`takeElement` → `conjureModel`): in die Hand, an den Kran, `R`
  dreht, `E`/`A`/Loslassen stellt hin. Beim Hinstellen geht das getragene
  Stück, und die Welt stellt an seiner Stelle das Element hin
  (`placedElement` → `furnishAt` → `furnish`): die Kachel, auf die der Punkt
  fällt (`elementPlace.spotAround`), die Richtung aus der Drehung
  (`yawFace`). **Die Vorderseite zeigt von der Figur weg**, wie jedes Möbel
  der Sandbox-Küche (`Furnish.hold` 0: _„wer nach Süden schaut und absetzt,
  stellt es nach Süden hin"_): Das Bodenstück steckt um eine halbe Drehung
  gewendet im getragenen Körper (`PortalWorld.ELEMENT_HOLD`, `heldElement`).
  Vorher zeigte die Vorderseite zur Figur hin, und gemeldet war _„die
  Standard Ausrichtung beim platzieren des Herds ist falsch"_. Ist dort kein
  Platz (Zellen belegt, `GridWorld.cellsFree`, oder neben dem Boden), bleibt
  es mit einer Meldung in der Hand. Im _Baukasten_ kommt wie beim Regal
  gleich das nächste nach, gleich gedreht; gemalt wird damit nicht.
- **Die Kachel im Menü zeigt das ganze Element** (`elementView.elementModel`):
  gebaut von `placeElement` selbst mit einem Gastgeber, der nichts sperrt,
  samt dem, was darauf steht (Topf, Pfanne). Vorher stand dort nur das
  Bodenstück, oft gar nichts.
- **In der Liste der Weltänderungen** steht es mit Häkchen als Zeile des Plans,
  `{"element":"board","x":4,"z":2,"face":"N","world":"test-restaurant"}`
  (`worldChanges.recordElement`) — genau das, was in `SPOTS` gehört.
  _Einfügen_ stellt solche Zeilen wieder hin (`furnishSpot`); was schon steht,
  sperrt seine Zellen, also kommt nichts doppelt.
- **Umstellen im Bau-Modus** (gewünscht: _„die Sachen will ich wieder bewegen
  können über den Bau Modus wie in der Restaurant Welt"_): Als Kran
  (_Einrichten_ oder _Baukasten_, `movesFurniture`) hebt `E` mit leeren
  Klauen das Element unter dem Kran an (`PortalWorld.liftElementUnderCrane`
  → `liftElementAt`): Die Welt nimmt es weg — Stationen heraus
  (`StationLayer.remove`, ihr Stand geht mit), Zellen frei, Teile und
  Bodenstück weg —, und sein Bodenstück hängt am Kran. Hingestellt wird es
  wie aus dem Katalog, unter **derselben** Stelle (Id, Beschriftung, `gives`
  bleiben) und **samt dem, was darauf lag** (`StationLayer.add(placed,
keep)`): Der Topf bleibt auf dem Herd, die Tomate auf dem Brett, die Uhren
  laufen weiter. Ist am Ziel kein Platz, steht es wieder, wo es stand
  (`furnishBack`). In der Liste der Weltänderungen ändert das Umstellen
  dieselbe Zeile (`elementKeys`). Mit der Pipette (_Kopieren_) gibt `E` über
  einem Element ein frisches desselben. Beim _Spielen_ bleibt `E` die Küche.
- **Grenzen:** _Rückgängig_ gibt es für Elemente noch nicht,
  Umstellen nur als Kran am Schirm (in der Brille bleibt es beim Alten), und
  wie die Modelle aus dem Regal übersteht ein Element kein Neuladen — wer es
  behalten will, kopiert die Liste. Es geht auch nicht über die Leitung.

## Der Radiergummi: Elemente löschen

Gewünscht (Oktober 2026): _„bei katalog ein radiergummi […] mit welchem ich
elemente löschen kann (nicht den boden) beim radiergummi kann ich den
gegenstand dann interagieren und es wird entfernt (welt änderungen
tracking)"_. Die Kachel **Radiergummi** steht im Katalog vor allen Ordnern
(nur in Welten, die Elemente löschen können, `canEraseElements`), mit dem
Verbotszeichen wie _Wand abreißen_. In der Hand ist es der Mülleimer
(`ELEMENT_ERASER`, einen Radiergummi hat das Regal nicht).

- **Ein Druck löscht, was darunter steht** (`PortalWorld.eraseUnder`) — als
  Kran die Stelle unter dem Kran, sonst die Stelle in der Hand. Das Ziel
  leuchtet vorher (`eraserTarget`). Mit weg geht, was darauf steht; den Boden
  (`GameElement.floor`) nimmt er nicht (`FurnishedWorld.eraseElementAt`).
- **Er bleibt in der Hand** und wird nie hingestellt; weg kommt er mit
  _Kran leeren_. In der Brille löscht er beim Loslassen und ist dann weg.
- **Weltänderungen**: Ein selbst hingestelltes Element verliert seine Zeile.
  Eines, das die Welt selbst hinstellt, bekommt eine Zeile mit `"gone": true`
  (`recordElementGone`); eingefügt radiert sie es wieder weg.

## Der Schutzschrank: sich verstecken

Der Spind aus _Haunting_ (`prototype-bits/Locker.glb`) steht im Katalog unter
_Weltraum → Versorgung_ (`spaceCatalog.SPACE_LOCKER`). Gewünscht: _„aus
haunting den locker (schrank) in welchem man sich verstecken kann bitte auch
in katalog bekommen (gerne auch unter weltall)"_. `opens: 'hide'`: `A` steigt
hinein (`PortalWorld.hideIn`) — man steht in der Mitte, schaut zur Tür hinaus,
der Schrank wird von innen durchsichtig, Laufen geht nicht. Jeder Druck
steigt wieder aus, vor die Tür. Anders als in der Station sucht hier kein
Monster; es ist nur das Verstecken.

## Was `A` daran tut: die Stationsschicht

**Was man damit tut**, entscheidet nicht das Element, sondern die Küche. `kind`,
`work` und `gives` sind genau die Felder, die eine Station der Küche braucht.
Die Regel ist die des Restaurants (`plateup/plateUpStations.ts`, dahinter
`kitchenCarry.kitchenDeed`) und wird nicht neu erfunden. Was der Burgerladen
dafür in `PlateUpWorld` selbst trägt (anmelden, ticken, das Liegende zeigen,
Balken), steht für jede andere Welt einmal als Klasse in
`elements/stationLayer.ts`. Die nächste Welt schreibt es damit nicht ein
drittes Mal ab. Der Burgerladen selbst bleibt, wie er ist.

- **Rein:** `stationKind(element)` (siehe oben) und `elementStations(spot)`,
  die aus einer Stelle keine, eine oder zwei `StationSlot` macht (`spot` als
  `StationSpot` der Regel, `shift` längs der Vorderkante und `holds`, was zu
  Beginn darauf steht). `slotStates(slots)` macht daraus den frischen Stand,
  mit dem Topf auf dem Herd. **Stapel gehen nie aus** (`stock: Infinity`):
  Kein Gast bringt Geschirr zurück. **Außer dem Tellerstapel** (`rack`): Er
  ist ein Abtropfgitter wie in der Sandbox, hält höchstens vier Teller
  (`kitchenCarry.CLEAN_STACK_MAX`, `StationSpot.rack`), sagt beim fünften
  _„Im Abtropfgitter stehen schon 4 Teller"_ und leer _„Im Abtropfgitter steht
  kein Teller mehr"_; die Station zeigt die Teller einzeln in den Fächern
  (`RACK_SLOTS`, `RACK_PLATE_LIFT`). Nie leer wird die Tellerkiste
  (`crate-plates`). Ein `gives`, das kein `KitchenItem` ist
  (`SHOW_ONLY_GIVES`), wird **keine** Station, sondern bleibt ein Möbel, mit
  einer Warnung in der Konsole. Die Welt stirbt nicht an einer Kiste, und
  `furnish` fängt auch sonst jeden Fehler beim Hinstellen eines Elements ab.
- **Die Klasse:** `new StationLayer(host, gauges?, before?, burn =
DEFAULT_BURN)`, dann `add(placed)` je hingestelltem Element und jedes Bild
  `step(dt, feet)`. Darin laufen die Uhren (`tickStation`): Braten und Kochen
  laufen allein, Schneiden und Ausrollen nur, solange die Füße höchstens
  1,3 m von der **Mitte der Platte** stehen, von welcher Seite auch immer
  (`NEAR_STATION`, auch der Burgerladen nimmt diese Zahl). Bis September
  2026 zählte der Anker an der Vorderkante, und wer hinter dem Brett stand,
  konnte ablegen, aber nicht schneiden. Wer weggeht, hält die Uhr an; sie
  läuft weiter, sobald man wieder dasteht.
  Die Uhren laufen an **jeder** Station, auch fern von der Figur. Außerdem
  wird das Liegende neu gezeigt, wenn es sich ändert, Balken, Flamme und
  Warnzeichen stehen über dem, was arbeitet oder verbrennt (heiß sind
  Kochstelle, Suppentopf und der Herd, auf dem der Topf kocht) (`KitchenGauges`
  aus `test/zones/kitchenGauge.ts`, kein Rauch; gerechnet nur, solange etwas
  arbeitet oder heiß wird), und angemeldet wird neu, sobald sich die Tat
  ändert — aber **nur in der Nähe**: Stationen, deren Anker weiter als
  `REFRESH_RANGE` = 3 m von den Füßen steht, rechnen ihre Tat nicht aus.
  Wer hinausgeht, wird einmal abgemeldet und bei der Rückkehr neu
  angemeldet. Dazu `use(index, by)`, `place(id)`, `states`,
  `reset()` (stellt auch den Topf zurück auf den Herd), `dispose()`. Verbrannt ist Gebratenes nach `DEFAULT_BURN` =
  14 s, wie am ersten Tag im Restaurant.
- **Wo was hängt:** Die Anmeldung (`Usable`, der Saum für `A`) hängt an
  einem Kind des Element-Ankers **in der Mitte der Platte** (seit September
  2026; vorher an der Vorderkante), mit `STATION_REACH` = 0,55 m Halbmesser,
  bei den Eiswannen 0,3 m je Wanne. Gemeint ist so, worauf die Figur schaut,
  von vorn wie von hinten; von hinten schaute man vorher über das Ende des
  Strahls hinaus. Und **nur, wer hinschaut** (`Usable.aimOnly`): Die Füße
  allein wählen keine Station, sonst leuchtete im Gang die Kiste hinter einem
  (_„sollen auch nur die gehighlithed werden, wenn ich in deren Richtung
  schaue"_). Das Liegende hängt auf einem Kind davon, auf `top`. Die Teile des Elements hängen, wo es
  leuchten kann (`elementLit`), als **Körper** ebenfalls darunter (`attach`,
  sie bleiben stehen, wo sie stehen).
- **Was leuchtet** (`Usable.highlight`, `core/usable.highlightOf`): Der Saum
  zeigt, was ein Druck meint (`kitchenCarry.meansContent`). Beim Nehmen und
  Zusammenlegen das, was darauf liegt (die Pfanne, der Teller, die Teller im
  Gitter), sonst **das Möbel**: die Arbeitsplatte beim Ablegen, das Brett
  beim Schneiden, die Kiste samt Inhalt beim Nehmen, der Eimer beim
  Wegwerfen. Nur wo kein Körper da ist, liegt ein Ring auf dem Boden.
  Gewünscht: _„Die vorratskisten mit den Gemüse müssen alle noch
  Highlighting bekommen, wie bei der Pfanne"_, _„Der Mülleimer soll auch
  gehighlighted werden können"_, _„Beim ablegen eines Gegenstands soll z.B.
  die Arbeitsfläche gehighlithed sein"_. Der Preis: Möbel mit Zweck stehen
  als Bilder da und nicht mehr als gebündelte Stücke der Welt
  (`placeElement`); was nur im Weg steht (Tisch, Stuhl, Band, Ofen), bleibt
  eines.
- **Was die Welt reicht** (`StationHost`): `addUsable`, `removeUsable`,
  `announce` (die Ablehnungen als Zeile unten im Bild), `held`, `heldHand`,
  `setHeld`, `busy()` (volle Hände mit etwas, das kein Ding der Küche ist,
  und der Satz dazu), `dishView(dish)` und wahlweise `picked` für den Ton.
- **Was davor drankommt** (`StationOverride`: `key`, `usable`, `use`): Das
  Eis hängt sich so vor die Küche, wie es in `PlateUpWorld.useStationAt` vor
  der Küche steht. Wer ein Hörnchen hält, stellt es auf eine Platte oder
  wirft es weg, statt dass `kitchenDeed` gefragt wird.

**Wie ein Gericht aussieht**, sagt `elements/dishView.ts`: `KaykitDishView`
baut aus `dishModels` sofort eine Gruppe aus geteilten Klonen der Vorlagen,
und `dishLayout` ist die reine Stapelrechnung dazu. Auf dem Teller liegt das
erste Stück bei 0,6 × Tellerhöhe in der Mulde (`ON_PLATE`), alles Weitere
0,7 × ineinander (`NEST`). In der Schüssel sitzt die Füllung innen, und jede
weitere Kugel 0,35 × höher (`SECOND_SCOOP`). Die Pizza im Karton liegt bei
0,25 × (`IN_BOX`), was im Topf kocht, bei 0,45 × Topfhöhe (`IN_POT`). Das
Wasser hat kein Bild. Diese Zahlen sind gerechnet und noch nicht im Bild
nachgesehen ([Test Restaurant → Offen](./testrestaurant.md#offen)).

## Braten, Verkohlen, Feuer — und der Löscher

Gewünscht (September 2026): _„Alles was auf der Pfanne gebraten wird kann auch
Anfangen zu brennen. Erst: Braten, wenn gebraten, dann leuchtet ein Dreieck und
blinkt langsam mit warm Ton, wenn die Stufe durch ist, ist es verkohlt wie
aktuell aber dann beginnt nochmal ein Countdown bis das was auf dem Herd ist
anfängt zu brennen, dabei ein schnellerer warm Ton und das warm Dreieck blinkt
schneller, dann brennt es."_ Die Stufen in der Pfanne auf dem Herd
(`plateUpStations.stovePhase`):

1. **Braten** (`fry`, 5 s): kleine Flamme, Balken.
2. **`burning`** — gebraten, `DEFAULT_BURN` = 14 s bis verkohlt: das
   Warndreieck blinkt langsam (`BLINK_SLOW`), der Warnton piept langsam
   (`BEEP_SLOW`, `core/Audio.playWarn`).
3. **`igniting`** — verkohlt, `DEFAULT_IGNITE` = 8 s bis zum Feuer: Dreieck
   und Ton schneller (`BLINK_FAST`, `BEEP_FAST`).
4. **`fire`** (`StationState.fire`): große Flamme, _„Der Herd brennt —
   Feuerlöscher holen!"_, der Herd lehnt alles ab (`kitchenCarry`, `fire`).

**Waffeln sind ein Stapel** (`kitchenRecipes.stackOf`, `isStack`): Der Teig
wird auf dem Schneidebrett in **vier Teigstücke** geschnitten, die rohen
Waffeln (`CHOPS`, `PIECES`) — ausgerollt wird nur der Pizzaboden (`ROLLS`).
Sie liegen als ein `Dish` gleicher Dinge und gehen zusammen in die Hand und in
die Pfanne (bis `PAN_MAX` = 4 gleiche Waffeln, `panFits`). In der Pfanne
braten, verkohlen und brennen alle zugleich (`plateUpStations.panOnStove`
nimmt jede Pfanne mit lauter gleichen Dingen). Die volle Pfanne auf einer
leeren Platte wird ausgekippt (`kitchenCarry`, Fall `top`); von einem fertigen
Stapel nimmt die leere Hand oder die Schüssel **eine** (`servesOne`, `offer`),
Rohes und Verbranntes geht ganz.

Im Bild ist die rohe Waffel die Teigkugel auf halbe Größe
(`dishView.ITEM_SCALE`), und die vier liegen **nebeneinander**, zwei mal zwei
— auf der Platte wie in der Pfanne, wo auch gebratene nebeneinander liegen,
kleiner, damit vier hineinpassen (`dishSpread`, `PAN_FILL`). Der Stapel
gebratener Waffeln auf der Platte bleibt ein Turm. Die verbrannte Waffel ist
die Waffel, fast schwarz gefärbt (`dishView.SOUP_TINT`).

Blinken kann jedes Dreieck für sich (`KitchenGauges.warn(key, at, blink)`),
gepiept wird einmal für alle Herde, im Takt des dringendsten. Die Grillplatte
des Restaurants verkohlt weiter, brennt aber nicht; die **sichere Kochstelle**
(`griddle`) brät ohne Pfanne und verkohlt nie — im Möbelkatalog bei Burger und
Waffeln.

**Der Feuerlöscher sprüht von selbst** (`StationLayer.extinguish`): Wer ihn
trägt und damit auf einen brennenden Herd in Reichweite zeigt
(`kitchenSpray.inSpray`, 2,5 m, **45°** zu jeder Seite, `EXTINGUISH_HALF_ANGLE` —
gewünscht: _„braucht einen größeren Winkel zum löschen und detektieren 45°"_;
die Sandbox nimmt 25°; der Kegel geht **von der Figur** aus, nicht vom
Löscher, den sie ein Stück vor sich trägt; gezielt wird in der
Richtung von `A`, in der Brille mit dem Strahl der Hand), sprüht — der Nebel
ist der der Sandbox (`SprayJet`). Nach `SPRAY_SECONDS` = 1,5 s im Strahl ist
das Feuer aus (`douseStation`): Die Pfanne bleibt, leer. Gewünscht: _„wenn er
in der Nähe ist und in Richtung Feuer gezeigt wird, damit das Feuer gelöscht
werden kann"_.

**Eine Stufe je Auflegen** (`tickStation`): Wer davorsteht, schneidet weiter,
was **unterbrochen** wurde, aber nicht, was eben fertig wurde. Die Tomate wird
zu Scheiben, und erst nach neuem Auflegen zu Suppe — _„Tomaten sollen
übrigens nicht sofort zu Tomaten Suppe werden, nur weil ich davor beim
Schneidebrett stehe"_.

## Topf, Spüle und Pommes

**Suppen, Spüle und Topf** (September 2026, fünfte Runde):

- **Jede Suppe ihre Sorte** (`kitchenRecipes.COOKS`): Karotte → Gemüsesuppe
  (`stew`), Zwiebel → Zwiebelsuppe, Pilz → Pilzsuppe (neu: `mushroom`,
  `mushroom-cut`, die Pilzkiste ist jetzt eine Zutatenkiste), Tomatenscheibe →
  Tomatensuppe. Die Kartoffel gibt weiter Pommes. Jede Suppe hat ihre Farbe
  (`dishView.SOUP_TINT`, das Regal hat nur einen Eintopf).
- **Acht Schüsseln je Topf** (`SOUP_SERVINGS`): Die Suppe liegt achtmal im
  Topf, jede Schüssel nimmt eine (`offer`), gezeigt wird sie einmal.
- **Die Tomate wird an den Stationen der Spielelemente nur einmal
  geschnitten** (`plateUpStations.stationDeed`, `ONE_CHOP`); die Scheibe liegt
  auf dem Brett wie auf einer Platte. Die Sandbox behält die zweite Stufe.
- **Die Spüle hat Wasser im Becken** (`stationLayer.basinWater`, die Fläche
  der Sandbox) und **kann kaputtgehen**: beim Füllen, im Mittel jedes fünfte
  Mal (`LEAK_CHANCE`). Dann spritzt sie (`kitchenLeak.LeakJet`), füllt nichts
  mehr, und nur die **Rohrzange** (`pliers`, neues Element „Rohrzange" auf
  einer Arbeitsplatte, Bild `rpg-tools-bits/wrench_A`) dichtet sie ab:
  ansetzen, `REPAIR_SECONDS` davorstehen (`StationState.leak`).
- **Der Topf ist anderthalbmal so groß** (`dishView.POT_SCALE`, erst doppelt,
  dann ein Viertel kleiner), und **Wasser darin ist zu sehen**
  (`KaykitDishView.pourWater`, die Farbe der Sandbox). Die Scheibe misst sich
  an der **Vorlage** des Topfs, nicht an seiner Kopie in der Welt — deren
  Hülle trug Station und Hand mit, und das Wasser war eine Pfütze am Boden.
  Die Anteile (`POT_WATER`) sind im Bild nachgesehen.

Gewünscht, für die Pommes: _„Die Kartoffeln Vorräte sollen auch
gehighlighted werden und interagierbar sein. Das Schneidebrett daneben soll
leer sein ohne die Kartoffel drauf, aber ich will darauf z.B. auch Kartoffeln
schneiden können."_ Dazu Herd und Topf wie im Restaurant und eine Spüle, an
der man den Topf füllt. Die Kette mit Elementen, **ohne neue Stationsart und
ohne neue Arbeit**, nur mit Regeln, die es schon gab, und einem neuen Ding
`fries` (Pommes):

1. `crate-potatoes` gibt eine Kartoffel, das `board` (leer, wie jedes Brett)
   schneidet sie zu `potato-cut`, drei Sekunden mit jemandem davor.
2. Den Topf vom `stove-pot` nehmen (`take`), an der `sink` davorhalten: Er
   ist voll Wasser (`fill`, `kitchenCarry.atSink`, dieselbe Regel wie im
   Spülbecken der Testküche). `plateUpStations.useStation` führt `fill` jetzt
   aus: Die Hand hält danach `pot[water]`, die Spüle bleibt leer.
3. Den Topf zurück auf den Herd (`place`), die geschnittene Kartoffel hinein
   (`combine`) — oder erst die Kartoffel in den Topf in der Hand und dann auf
   den Herd. Das regelt `kitchenRecipes.pour` über `intoPot`: Der Topf nimmt
   **eine** Zutat, die `COOKS` kennt, und nur mit Wasser (_„Im Topf ist kein
   Wasser — erst an der Spüle füllen"_). Er wird dabei kein Träger (`TAKES`
   bleibt ohne Zeile `pot`, und die Sätze der Testküche bleiben dieselben).
4. Auf dem Herd kocht der Topf allein (`kitchenRecipes.potCooks`,
   `plateUpStations.tickStation`: Stationsart `stove`, Arbeit `cook`, fünf
   Sekunden, ohne jemanden davor), mit Balken und Flamme. Danach liegt im Topf
   nur noch das Gekochte, das Wasser ist verkocht: `pot[fries]`. Pommes
   verbrennen nicht.
5. Ein Teller vom `plate-stack` an den Herd: Der Topf gibt her, was in ihm
   gekocht ist (`offer`, wie die Pfanne ihr Patty), der Teller hat die
   Pommes, der leere Topf bleibt stehen. Der Mülleimer räumt Teller und Topf ab
   (`scrape`).

**Eis im Hörnchen** (September 2026): Das Hörnchen (`cone`) ist ein Träger
wie die Schüssel, nur für Eis, und trägt **so viele Kugeln, wie man will**,
auch dieselbe Sorte mehrmals (`kitchenRecipes.pour`) — gemeldet war: _„man
kann auf einmal nur eine Eis Kugel nehmen? Was soll das."_ Gezeichnet wird es
mit dem Bild des Restaurants (`plateUpIceView.IceConeView` und `BallKit`,
aus `dishView.KaykitDishView`), nicht mit eigenen Dateien. Vom Eisstand
nehmen, an den Eiswannen (`ice-tray-*`) Kugeln darauf. **Das Hörnchen ist
dreimal so groß** (`dishView.CONE_SCALE`) — im Bild selbst, also in der Hand
wie abgestellt; gemeldet: _„Abgestelltes Eis ist leider kleiner als in der
Hand"_. **In die Schüssel kommt eine Kugel**, gleich welche Sorte: Ist schon
Eis darin, lehnt sie jede weitere ab (_„In der Schüssel ist schon …"_) —
gewünscht, weil Erdbeer und Schoko die Vanille zu überschreiben schienen, aber
nicht umgekehrt: _„Ich wäre dafür, dass man das nicht überschreiben kann."_

**Die Pfanne auf dem Herd** (September 2026): `stove` ist der Herd mit der
Pfanne der **Sandbox-Küche** (`kitchen.glb`, geladen über
`itemTemplate.loadItemModel`, mit der Mulde über der Mitte:
`kitchenFit.kitchenHub`). Sie steht darauf (`holds: 'pan'`), lässt sich
nehmen und zurückstellen, und was in ihr auf dem Herd liegt, brät und
verbrennt wie auf der Grillplatte (`plateUpStations.panOnStove`,
`tickStation`); die Pfanne nimmt alles, was die Grillplatte brät (`TAKES`).
Gemeldet war: _„man kann die Pfanne nicht vom Herd nehmen … Es ist die
falsche Pfanne"_.

**Suppe geht genauso**: Karotte oder Zwiebel, geschnitten, in den Topf mit
Wasser, und die Schüssel holt die Gemüsesuppe. `COOKS` gilt für beide Töpfe,
den eingebauten Suppentopf (`pot`) und den auf dem Herd; aus der Kartoffel
werden dort seit diesem Wunsch Pommes und keine Suppe mehr. Pommes haben im
Regal kein eigenes Stück (auch keine Fritteuse): Sie sind
`food_ingredient_potato_chopped` (`itemModels.ts`).

## Ein neues Element

1. Ein Eintrag in `ELEMENTS`, zusammengesetzt aus Dateien des Regals. Für
   ein Möbel auf einer Kachel reicht `piece(id, label, kind, parts, extra)`,
   für eine Vorratskiste `crate(id, datei, gibt, label)`. Neue Elemente kommen
   **hierher und nicht in eine Welt**: Was zwei Welten gleich hinstellen, soll
   gleich aussehen.
2. Wo ein Teil sitzt, wird gemessen und nicht abgeschrieben. Zahlen in `at`
   sind Versätze auf der Platte, keine Höhen. Die Höhe ergibt sich aus der
   Oberkante darunter.
3. `npm test` prüft (`elementCatalog.test.ts`):
   - jeder Name nur einmal,
   - **jedes Teil liegt im Regal** (`public/models/kaykit/index.json`; ohne
     die Pakete wird nichts geprüft),
   - ganze Kacheln, mindestens eine, und jedes Element mit `kind` mindestens
     1,40 m hoch,
   - das erste Teil steht auf dem Boden, jedes weitere auf einem früheren,
     höchstens eine Ablage,
   - kein Kistendeckel in der Liste, und unter jeder Kiste bringt der Lader
     einen.

   Dazu `elementPlace.test.ts`: Eine Kachel belegt genau ihre vier Zellen,
   das Band in jeder Richtung eine Kachel, der Tisch sechzehn, ein langes
   Element nach Osten liegt quer (untergeschoben, der Katalog hat keines
   mehr), und die Drehung stimmt mit three.js überein. `elementView.test.ts` prüft, dass
   gesperrt wird, **bevor** geladen wird, und dass die Sperre auch ohne
   Modelle steht. Wer ein Element in einer Welt braucht, trägt seine Id
   außerdem in die Liste _„kennt die Elemente, die eine Welt braucht"_ ein.

**Den Gang aus vier Richtungen** gegen jedes Element prüft
`elements/elementFeet.test.ts`: Jedes Element aus `ELEMENTS` steht allein auf
einem Boden, einmal je Blickrichtung. Jede Zelle darunter ist gesperrt, kein
2 × 2-Block kommt aus einer der vier Richtungen hinein, und wer lange dagegen
läuft, steht nie darauf. Ein neues Element ist damit von selbst geprüft. Was
eine Welt darüber hinaus zusagt (vom Ankunftsort vor jede Station), prüft sie
über ihre eigenen Stellen.

**Dass die Küchen kochen**, prüft `elements/elementFlows.test.ts` auf Stellen,
die für sich stehen, mit derselben Regel wie in einer Welt: Burger mit Käse,
Schinken (rechtzeitig und verbrannt), Pizza to Go, Waffeln mit zwei Kugeln,
Pommes und Suppe im Topf mit Wasser, die Spüle, die den Topf füllt, und dass
jede Kiste, die `furnish` hinstellt, sich mit „nehmen" anmeldet.

## Eine neue Zutat

Was man in der Hand hält, auflegt und serviert, ist ein `KitchenItem`
(`test/zones/kitchenRecipes.ts`), und zwar in **einer** Liste für alle
Küchen. Eine zweite Liste hieße zweite Regeln: ein zweites `combine`, ein
zweiter Mülleimer, ein zweites „was tut `A` hier". Der Reihe nach:

1. **Den Namen** in `KitchenItem`. Der Übersetzer fragt danach von selbst an
   jeder vollständigen Tabelle: `ITEM_LABELS` (Singular, satzfähig),
   `ITEM_HEIGHT` (`kitchenProps.ts`, 0 und ein Eintrag in `ELSEWHERE`, wenn
   der Diner-Baukasten es nicht zeichnet), `kitchenHandles`
   (`kitchenGrab.ts`, ein `switch` ohne `default`: ein `case`, der leer
   zurückgibt, solange es keine Griffe braucht) und **`ITEM_MODELS`**
   (`elements/itemModels.ts`, der Pfad im Regal, `''`, wenn es keinen
   gibt).
2. **Was damit geschieht**, je nach Zutat: `TAKES` (was ein Träger aufnimmt;
   `HOLDS_ONE` für einen, in den genau eines passt, wie Pfanne und
   Pizzakarton), `CHOPS` (Brett), `FRIES` (Pfanne und Grillplatte; `BURNT`,
   wenn die Stufe danach die schwarze ist, wie bei Patty und Schinken),
   `ROLLS` (Nudelholz), `COOKS` (Topf: Suppentopf und Topf mit Wasser auf dem Herd), `RAW`, `FOOD`, `STACK_ORDER`
   (wo es auf dem Burger liegt).
3. **Wie es in der Schüssel aussieht**, wenn anders als für sich:
   `IN_BOWL` in `itemModels.ts` (Suppe als Füllung `stew_bowl`, Waffeln als
   `icecream_bowl_waffles`).
4. Eine **neue Stationsart** braucht einen Eintrag in `StationKind`, in
   `kitchenDeed` und in `STATION_WORK`. Eine neue Arbeit (`WorkKind`) braucht
   `WORK_SECONDS`, `WORK_TO_HAND`, `WORK_ALONE` und das Wort in
   `WORK_WORDS` (`test/zones/kitchen.ts`). Auch dort fragt der Übersetzer von selbst.

Die Küche der Testwelt und der Laden (`worlds/plateup`) zeichnen ihre Zutaten
weiter aus dem Diner-Baukasten (`kitchenProps.FoodKit`). Die Stationsschicht
der Spielelemente zeichnet dieselben Namen mit Netzen aus dem Regal (`itemModels.ts`,
`dishModels`: Träger zuerst, dann der Belag von unten nach oben, das Brötchen
aufgeschnitten, sobald etwas darin liegt).

## Was noch nicht umgezogen ist

Drei Welten stellen ihre Einrichtung noch selbst hin und sperren über ein
eigenes Überschreiben von `cellBlocked`. Das gilt weiter, neben
`blockedCells`. Jede ist ein Kandidat für einen späteren Umzug in den
Katalog. Wer dort etwas Neues hinstellt, nimmt schon ein Element:

- **Das Restaurant / Burgerladen** (`PlateUpWorld`): `fixedCells` und
  `shopCells` über `addBlock`, Stationen mit Anbauten in
  `addStationView`, die Eisecke in `plateUpIceView.ts`.
- **Der Hub** (`HubWorld`): Bänke, Lampen, Pflanzen über `blockDecor` in
  `decorCells`.
- **Die Küche der Testwelt** (`KitchenZone.addHitbox`,
  `TestWorld.cellBlocked`): ihr eigener Möbelkatalog (`core/kitchenFit.ts`)
  mit Umbau im Baumodus. Der Katalog dort kann mehr als die Spielelemente
  (umstellen, kaufen, Anbauten), und ein Umzug müsste das mitnehmen.

Haunting ist kein Kandidat: Die Station hat ihren eigenen Grundriss mit
eigenen Zellen (`HauntingWorld.cellBlocked`, `map/stationCells.ts`).

## Was wo liegt

| Datei                                 | Was darin steht                                                                                                                                                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `worlds/elements/elementCatalog.ts`   | **Rein**: `GameElement`, `ElementPart`, `ELEMENTS`, `piece`, `crate`, `elementById`/`hasElement`, `FURNITURE_CATALOGUE`/`FURNITURE_FOLDERS`. Kein three.js, kein Laden                                                                 |
| `worlds/elements/furnitureCatalog.ts` | **Rein**: der Ordner _Möbel_ — `FURNITURE_BITS_ELEMENTS`, `FURNITURE_BITS_FOLDER`; Tische als Ablage (`shelf`, `kind: 'top'`), Kleinkram ablegbar (`rests`), Teppiche als Boden (`floor`) |
| `worlds/elements/spaceCatalog.ts`     | **Rein**: der Ordner _Weltraum_ — `SPACE_ELEMENTS`, `SPACE_CATALOGUE`, `SPACE_FOLDER`, `SPACE_SCALE` (2 m je Einheit der Quelle); die Kacheln gemessen, `spaceCatalog.test.ts` misst nach |
| `worlds/elements/cityCatalog.ts`      | **Rein**: der Ordner _Stadt_ — `CITY_ELEMENTS`, `CITY_CATALOGUE`, `CITY_FOLDER`, `CITY_SCALE` (4 m je Einheit der Quelle), `CITY_BLOCK` (12 × 12 Kacheln: 6 m Fahrbahn, je 3 m Gehweg); Straßen und Plätze als Boden mit Laternen und Ampeln |
| `worlds/elements/natureCatalog.ts`    | **Rein**: der Ordner _Natur_ — `NATURE_ELEMENTS`, `NATURE_FOLDER`; die sieben anderen Farben von _Forest Nature_ als `NATURE_COLORS`, `NATURE_COLOR_ELEMENTS`, `NATURE_COLOR_FOLDER` |
| `worlds/elements/tavernCatalog.ts`    | **Rein**: der Ordner _Taverne_ aus _Dungeon_ — `TAVERN_ELEMENTS`, `TAVERN_FOLDER` |
| `worlds/elements/halloweenCatalog.ts` | **Rein**: der Ordner _Halloween_ aus _Halloween Bits_ — `HALLOWEEN_ELEMENTS`, `HALLOWEEN_FOLDER`; offene Tore ohne Sperre |
| `worlds/elements/holidayCatalog.ts`   | **Rein**: der Ordner _Weihnachten_ aus _Holiday Bits_ — `HOLIDAY_ELEMENTS`, `HOLIDAY_FOLDER`; Eisenbahn und Geschenkehaufen als ein Stück |
| `worlds/elements/elementPlace.ts`     | **Rein**: `ElementSpot`, `Face`, `faceYaw`, `spotSize`/`spotCentre`/`spotCells`/`spotFront`, `rotateOffset`, `overlaps`                                                                                                                |
| `worlds/elements/elementView.ts`      | `ElementHost`, `placeElement`, `PlacedElement` (Anker, Ablage, Zellen, Kasten), `FALLBACK_TOP`                                                                                                                                         |
| `worlds/elements/elementFacts.ts`     | **Rein**: der Steckbrief hinter dem ⓘ im Möbelkatalog — `elementFacts`, `footprintRows` (die Belegung aus `■`), `partPlace` (wo ein Teil sitzt)                                                                                        |
| `worlds/elements/stationLayer.ts`     | `stationKind`, `elementStations`, `slotStates` (**rein**), `StationLayer`, `StationHost`, `StationOverride`: was `A` an einem hingestellten Element tut                                                                                |
| `worlds/elements/furnish.ts`          | `furnish`: Stellen hinstellen und jedes Element mit Stationsart zur Station machen — der eine Weg für jede Welt                                                                                                                        |
| `worlds/elements/dishView.ts`         | `KaykitDishView` (ein Gericht als Bild aus dem Regal), `dishLayout` (**rein**: wie hoch jedes Stück auf Teller, in Schüssel und Karton liegt)                                                                                          |
| `worlds/elements/itemModels.ts`       | **Rein**: `ITEM_MODELS` (je `KitchenItem` ein Pfad im Regal), `IN_BOWL`, `BUN_BOTTOM`/`BUN_TOP`, `itemModel`, `dishModels`                                                                                                             |
| `worlds/elements/*.test.ts`           | Alles liegt im Regal, Körper hoch genug, Stapeln geht nur auf Früheres, Zellen je Kachel, Drehung wie three.js, Sperre vor dem Laden, jedes Element aus vier Richtungen unbetretbar (`elementFeet`), jede Küche kocht (`elementFlows`) |
| `worlds/grid/GridWorld.ts`            | `blockedCells`, `blockFootprint`/`unblockFootprint`, `blockSolid`/`unblockSolid`, `SOLID_BLOCK_HEIGHT` = 1,4; `cellTaken` fragt die Menge mit                                                                                          |
| `worlds/grid/blockFootprint.test.ts`  | Eine Kachel sperrt genau vier Zellen, kein 2 × 2-Block kommt hinein, ein Tisch sperrt sechzehn                                                                                                                                         |
| `worlds/test/zones/kitchenRecipes.ts` | Die Zutaten (`KitchenItem`) und ihre Tabellen                                                                                                                                                                                          |
| `worlds/test/zones/kitchenCarry.ts`   | Die Stationsarten (`StationKind`) und was `A` an ihnen tut (`kitchenDeed`)                                                                                                                                                             |
| `worlds/plateup/plateUpStations.ts`   | Der Zustand einer Station: was darauf liegt, die Uhr, der Vorrat eines Stapels (`stock`, `stackGives`), die Hitze (`burnStage`)                                                                                                        |
| `public/models/kaykit/index.json`     | Das Modellregal, der Katalog der Rohmodelle ([Das Modellregal](./assetregal.md))                                                                                                                                                       |
