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
- Wände, Böden, Türen und Treppen sind keine Spielelemente. Sie kommen über
  den Plan und `grid/shelfWalls.ts` und sperren über den Plan
  ([Zellgitter](./zellgitter.md)).

## Was ein Spielelement ist

Ein Eintrag `GameElement` in `ELEMENTS`:

| Feld     | Was es sagt                                                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`     | Der Name, unter dem ein Plan es bestellt (`ElementSpot.element`), etwa `'board'`                                                                   |
| `label`  | Der deutsche Name                                                                                                                                  |
| `tiles`  | **Grundfläche in Kacheln**, Breite × Tiefe, für ein Element, das nach Süden schaut. Der runde Tisch `[2, 2]`, alles andere `[1, 1]`, auch das Band |
| `height` | **Wie hoch der Körper ist**, nicht das Modell: 1,40 m für jedes Möbel mit Zweck, 0,5 m für das flache Band                                         |
| `kind`   | Was man damit tut, eine Stationsart der Küche (`kitchenCarry.StationKind`) oder `'ice-tubs'`; `null` für etwas, das nur im Weg steht               |
| `work`   | Bei einem Brett: `'chop'` (schneiden) oder `'roll'` (ausrollen)                                                                                    |
| `gives`  | Was eine Kiste oder ein Stapel hergibt, als Vorschlag. Die Stelle im Plan gewinnt (`ElementSpot.gives`)                                            |
| `holds`  | Was zu Beginn **auf** der Station steht und mitgenommen werden kann, als `KitchenItem`: der Topf auf dem Herd (`stove-pot`). Kein Teil des Bilds   |
| `lit`    | **Ob das Möbel selbst leuchten kann** — ohne Angabe jedes Element mit `kind` (`elementLit`). Dann sind alle Teile Bilder unter der Station         |
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
- `surface`: Hier wird abgelegt (`PlacedElement.top`). Ohne diese Angabe ist
  es das erste Teil.

**Kein Kistendeckel in der Liste.** Den stellt der Lader unter jede Kiste von
selbst (`core/kaykitCrate.kaykitPlinth`). Zwei Deckel hießen eine Kiste zehn
Zentimeter über der Zeile daneben, und der Test verbietet es.

## Die Elemente heute

Alles aus _Restaurant Bits_ (`restaurant-bits/…`), außer wo es dasteht.
`counter_A`/`counter_B` sind `kitchencounter_straight_A`/`_B`.

| Id                                                | Name                                        | Art (`kind`)                                 | Teile                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `counter`                                         | Arbeitsplatte                               | `top`                                        | `counter_A`                                                                                                                                                                                                                                                   |
| `board`                                           | Arbeitsplatte mit Schneidebrett             | `board`, `work: 'chop'`                      | `counter_B`, `cuttingboard` (Ablage), `knife` flach und quer                                                                                                                                                                                                  |
| `rolling-board`                                   | Nudelbrett                                  | `board`, `work: 'roll'`                      | `counter_A`, `rollingpin` auf 10 cm                                                                                                                                                                                                                           |
| `crate-buns` … `crate-mushrooms`                  | zwölf Vorratskisten                         | `crate`                                      | je eine Kiste mit Inhalt (`crate_buns`, `crate_steak`, …); `crate()` baut sie. Die Steakkiste gibt ein Steak (brät wie Schinken, auf dem Brett wird es zum Patty)                                                                                             |
| `crate-patties`                                   | Pattykiste                                  | `crate`, gibt `patty`                        | leere `crate`, darin vier rohe Pattys (`food_ingredient_burger_uncooked`, `sink`)                                                                                                                                                                             |
| `crate-plates`                                    | Tellerkiste                                 | `crate`, gibt `plate`                        | leere `crate`, darin sechs `plate`, je 13° verdreht (`sink`); gibt Teller, so viele man will, und nimmt einen leeren zurück                                                                                                                                   |
| `pizza-supply`                                    | Pizza-Vorratsbox                            | `crate`, gibt `pizza`                        | leere `crate`, obenauf `food_pizza_pepperoni_plated`                                                                                                                                                                                                          |
| `stove`                                           | Herdplatte mit Pfanne                       | `stove`, `holds: 'pan'`                      | `stove_single`; die Pfanne der Sandbox-Küche (`itemModels.KITCHEN_PAN`, aus `kitchen.glb`) steht als Ding der Küche darauf, geht mit und brät darin                                                                                                           |
| `stove-pot`                                       | Herdplatte mit Topf                         | `stove`, `holds: 'pot'`                      | `stove_single`; der Topf `pot_A` ist kein Teil, sondern steht als Ding der Küche darauf und geht mit                                                                                                                                                          |
| `hob`                                             | Herdplatte                                  | `stove`                                      | `stove_single`, leer; ein Topf mit Wasser darauf kocht wie auf `stove-pot`                                                                                                                                                                                    |
| `griddle`                                         | Sichere Kochstelle                          | `griddle`                                    | die gebaute Kochstelle der Sandbox (`built:griddle`, `elements/builtParts` → `kitchenGriddle.GriddleKit`, ausdrücklich gewünscht); brät ohne Pfanne allein, verkohlt nie, brennt nie                                                                          |
| `sink`                                            | Waschbecken                                 | `sink`                                       | `kitchencounter_sink` (Platte mit Becken und Hahn); füllt den Topf, den man davorhält                                                                                                                                                                         |
| `extinguisher`                                    | Feuerlöscher                                | `top`, `holds: 'extinguisher'`               | `counter_A`; der Löscher (`mixed-bag/fire_extinguisher`) steht als Ding der Küche darauf und geht mit                                                                                                                                                         |
| `bin`                                             | Mülleimer                                   | `bin`                                        | `block-bits/trashcan` auf 0,55 m                                                                                                                                                                                                                              |
| `plate-stack`                                     | Tellerstapel                                | `drain`, gibt `plate`, `rack`                | `counter_A`, das leere `dishrack`; die Teller (höchstens vier) zeigt die Station einzeln in den Fächern                                                                                                                                                       |
| `bowl-stack`                                      | Schüsselstapel                              | `drain`, gibt `bowl`                         | `counter_A`, zwei `bowl`                                                                                                                                                                                                                                      |
| `pizzabox-stack`                                  | Kartonstapel                                | `drain`, gibt `pizzabox`                     | `counter_A`, `pizzabox_stacked`                                                                                                                                                                                                                               |
| `ice-stand`                                       | Eisstand                                    | `drain`, gibt `cone`                         | `counter_A`, `icecream_cone_stacked` (0,5 m), `icecream_scoop` (0,3 m, liegend), wie die Eisecke im Laden, nach Süden; ein Vorrat: `A` gibt ein Hörnchen                                                                                                      |
| `ice-tubs`                                        | Eiswannen (alt, nicht mehr im Möbelkatalog) | `ice-tubs`                                   | `counter_A`, zwei `icecream_container` (×0,825), darin Vanille und Erdbeere (`inside`); es leuchtet die gemeinte Wanne samt Eis (`stationLayer.partSlot`)                                                                                                     |
| `ice-machine`                                     | Eismaschine                                 | `icemachine`                                 | `counter_A`, obenauf `icecream_machine`; füllt die Eiswanne, die man davorhält — leer mit Vanille, danach jedes Mal die nächste Sorte (`kitchenCarry.atMachine`, `kitchenRecipes.nextTrayFill`)                                                               |
| `ice-tray-vanilla` / `-strawberry` / `-chocolate` | Eiswanne Vanille / Erdbeere / Schoko        | `top`, `holds: 'tray'` mit Sorte (`holdsOn`) | `counter_A`; die Wanne (`icecream_container` + Füllung) steht als Ding der Küche darauf, um 90° gedreht, eine je Platte. Man trägt sie; auf einer Platte schöpft man daraus, sie wird nie leer (`kitchenRecipes.trayScoop`); leer macht sie nur der Mülleimer |
| `crate-trays`                                     | Kiste mit Eiswannen                         | `crate`, gibt `tray`                         | leere `crate`, darin zwei leere Wannen; gibt leere Wannen und nimmt leere zurück                                                                                                                                                                              |
| `belt`                                            | Förderband                                  | —                                            | `platformer/yellow/conveyor_4x4x1_yellow`, halb gedreht; eine Kachel, 0,5 m (der Lader bringt es auf 1 × 1 m)                                                                                                                                                 |
| `table-round`                                     | Runder Tisch                                | —                                            | `table_round_B_tablecloth_red`; `[2, 2]` Kacheln                                                                                                                                                                                                              |
| `chair`                                           | Stuhl                                       | —                                            | `chair_A`                                                                                                                                                                                                                                                     |
| `supply-box`                                      | Vorratsbox                                  | —                                            | leere `crate`; was obenauf liegt und was `A` tut, bestimmt die Welt                                                                                                                                                                                           |
| `pizza-oven`                                      | Pizzaofen                                   | —                                            | `pizza_oven`, zum Ansehen                                                                                                                                                                                                                                     |

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
- `ice-tubs` wird zu **zwei** Stationen `tub`, `<id>:vanilla` links und
  `<id>:strawberry` rechts, je 0,25 m neben der Mitte der Vorderkante
  (`TUB_SHIFT`).
- Alles ohne Zweck (Tisch, Stuhl, Band) wird zu gar keiner Station. Der
  **Eisstand ist seit September 2026 ein Vorrat** (`drain`, gibt `cone`) und
  keine Eisecke mehr: Wer ihn benutzt, bekommt ein Hörnchen, und die Wannen
  türmen Kugeln darauf. Die Eisecke des Restaurants
  (`plateUpIceView.IceCorner`) regelt nur noch das Restaurant.

**`ElementKind` ist `StationKind` und dazu `'ice-tubs'`** (zwei Wannen auf
einer Platte, also zwei Stationen).

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
(`TestRestaurantWorld.elementHost`). `alive` sorgt dafür, dass nach dem
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

Gewünscht (September 2026): _„Ich brauche bei Möbel Katalog, die Funktion
Möbel: eine Arbeitsplatte 2x2 nicht durchlaufen, Arbeitsplatte mit Schneide
Brett, Herdplatte mit Pfanne, Herdplatte mit Topf, Herdplatte.
Waschbecken"_. Das Modellregal gibt nur Bilder her; wer darin eine
Arbeitsplatte nimmt, stellt ein Fass hin, durch dessen Zellen man läuft. Der
Möbelkatalog gibt **Spielelemente** her.

- **Wo:** Menü _Bauen & Gestalten_ → **Möbel**, gleich hinter dem Modellregal
  (`PortalWorld.elementMenu`, Id `elements`, `ui/menuGroups.ts`). Nur in einer
  Welt, die Stationen führt und es sagt (`elementCatalogue`); heute das
  [Test Restaurant](./testrestaurant.md). Anderswo fehlt der Eintrag.
- **Was:** `FURNITURE_CATALOGUE` in `elementCatalog.ts`, in der Reihenfolge
  des Wunsches und mit seinen Worten (die Namen der Elemente selbst):
  Arbeitsplatte
  (`counter`), Arbeitsplatte mit Schneidebrett (`board`), Herdplatte mit
  Pfanne (`stove`), Herdplatte mit Topf (`stove-pot`), Herdplatte (`hob`, neu:
  der leere Herd für den Topf) und Waschbecken (`sink`) — dazu, als Vorräte
  (_„die Arbeitsplatte mit dem scoop und cones und die Platte mit ice trays
  als Vorräte"_), der Eisstand mit Hörnchen und Portionierer (`ice-stand`)
  und die Eiswannen (`ice-tubs`). Dahinter die **Vorräte** (gewünscht:
  _„vorratskisten: Salat, Käse, Wurst, Steak, Tomaten, Teller, Schüssel,
  Zwiebel, …"_): Salat, Käse, Schinken (die Wurst), Fleisch (das Steak, gibt
  das Patty), Tomaten, Tellerstapel, Tellerkiste, Schüsselstapel, Zwiebeln, dann Brötchen,
  Teig, Karotten, Kartoffeln, Pizza-Vorratsbox, Kartonstapel, Nudelbrett und
  Mülleimer. Salami und Pilze fehlen mit Absicht: Sie sind noch keine Zutat
  (`SHOW_ONLY_GIVES`), und der Test verbietet sie hier. Jedes
  belegt eine Kachel, also 2 × 2 Zellen, alle gesperrt, und tut auf `A`, was
  es in der Küche tut.
- **Nur Ordner auf der Seite _Möbel_** (`FURNITURE_FOLDERS`): **Allgemein**
  (Arbeitsplatte, Waschbecken, Mülleimer, Feuerlöscher auf Arbeitsplatte),
  je Gericht **Pizza, Burger, Eis, Waffeln, Suppe** — jeder mit der
  Arbeitsplatte vorn und den Möbeln, mit denen `elementFlows.test.ts` das
  Gericht kocht, Burger und Pizza mit Tellerstapel und Tellerkiste — und **Alles** mit
  der ganzen Liste. Gewünscht zuerst: _„einige Möbel doppelt gelistet …
  unterordner … Pizza, Burger, Eis, Waffeln, Suppe"_, dann: _„bei den unter
  Ordner die Arbeitsplatte jeweils rein. Und die Möbel aus dem Restaurant
  Ordner dafür raus. Dafür einen Ordner allgemein … Im Restaurant Ordner noch
  einen Ordner „alles“"_. **Doppelt ist nur die Kachel**: Dasselbe Element
  steht in mehreren Ordnern, hingestellt wird jedes Mal dasselbe. Die Menü-Ids
  tragen deshalb den Ort (`elements/burger:board`), denn Ids im Menü sind
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
  umgelegt, gedreht, Ablage).
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
- **Grenzen:** Abreißen und _Rückgängig_ gibt es für Elemente noch nicht,
  Umstellen nur als Kran am Schirm (in der Brille bleibt es beim Alten), und
  wie die Modelle aus dem Regal übersteht ein Element kein Neuladen — wer es
  behalten will, kopiert die Liste. Es geht auch nicht über die Leitung.

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
nehmen, an den `ice-tubs` Kugeln darauf; die Wanne sagt ohne Träger
_„… braucht eine Schüssel oder ein Hörnchen"_.

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
