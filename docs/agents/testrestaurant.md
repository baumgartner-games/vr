# Test Restaurant

Die zweite Welt im Ordner _Test_, neben der Test Navigation
(`worlds/testrestaurant/`, Kennung `test-restaurant`, `#test-restaurant`).
Ein Prüfstand: Welche Stücke aus dem Regal gehören zu welchem Gericht, wie
sieht eine Küche dafür aus, und lässt sie sich spielen? Das eigentliche Spiel
mit Tagen, Geduld und Kasse ist [Das Restaurant](burgerladen.md).

Gewünscht: _„neben der Test Navigation eine Test Restaurant Welt … wo es für
jede Gericht Art eine kleine Mini Küche gibt. Also für Burger eben die Pfanne
mit dem Herd, Teller, Arbeitsplatte, Schneidebrett, Zutaten. Für das Eis
ebenfalls die cones, scope, und die Eis Sorten."_ Dazu neu: Pizza, Pizza to
Go, Suppe, Waffeln und Nachtisch, Steak, Schinken, Pommes. _„wofür du erstmal
überlegen musst wie wäre das Rezept dafür, welche Restaurant Utensilien haben
wir dafür und welche kann man dafür nutzen"_. Außerdem ein Förderband, das
einen Burger von allein macht, und Gäste, die in einer Blase zeigen, was sie
wollen.

**Der Umbau (September 2026).** Zuerst war jede Küche eine Reihe von
Rohmodellen, mit `placeModel` hingestellt, und man lief über Kisten und
Arbeitsplatten, weil keine Zelle gesperrt war. Das war der Anlass für den
[Katalog der Spielelemente](./spielelemente.md) (_„Das Element der
Arbeitsplatte sollte eigentlich sowieso bereits von Haus aus 2x2 undurchgehbar
sein."_). Seitdem ist hier **alles ein Element**: Küchen, Bandstücke und
Bandstationen, die Endplatte, Tische, Stühle und Vorratsboxen gehen durch
`placeElement` und sperren ihre Zellen samt Körper, bevor ein Modell lädt. Es
sind 404 gesperrte Zellen, also 101 Kacheln. Im Browser (SwiftShader,
Draufsicht) ist die Figur ohne Fehler am Rand der Reihen stehen geblieben und
frei durch die Gänge gegangen. Fünf Küchen und die Eisecke lassen sich mit `A`
spielen, nach denselben Regeln wie die Küche der Testwelt und das Restaurant
(`kitchenCarry.kitchenDeed`).

## Was wo liegt

| Datei                                        | Was darin steht                                                                                                                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `testrestaurant/restaurantPlan.ts`           | **Rein**: die Küchen (`KITCHENS`), ihre Reihen und Stellen, Band, Tische, Vorratsboxen, `allElements`, `occupiedTiles`                                                     |
| `testrestaurant/burgerBelt.ts`               | **Rein**: das Band, also aus der vergangenen Zeit, wo jeder Burger steht und welche Schichten er hat (`beltBurgers`); `BELT_STATIONS` mit ihrem `element`                  |
| `testrestaurant/guestWishes.ts`              | **Rein**: die Gäste, also Wünsche ohne Zufall (`wishOf`), Servieren (`serveTable`), Essen und Bedanken (`stepGuests`), die Karte (`MENU`)                                 |
| `testrestaurant/restaurantIce.ts`            | Die Eisecke des Restaurants in der Eis-Küche: `RestaurantIce`, ein `StationOverride` vor der Küche                                                                        |
| `testrestaurant/TestRestaurantWorld.ts`      | Die Darstellung: Elemente (`elementHost`), Stationen (`StationLayer` über `stationHost`), Eis, Tafeln, Band, Figuren, Blasen, was in der Hand liegt                        |
| `testrestaurant/restaurantPlan.test.ts`      | Nur Elemente, die es gibt, nur Dateien im Regal, keine Kachel doppelt, zwei Reihen mit freiem Gang, vor jeder spielbaren Station eine freie Kachel, Stühle am Sitzplatz |
| `testrestaurant/restaurantKitchens.test.ts`  | Aus welchen Elementen welche Stationen werden, und jede spielbare Küche von der Kiste bis zum fertigen Gericht                                                            |
| `testrestaurant/restaurantFeet.test.ts`      | Jedes Element aus vier Richtungen unbetretbar, und vom Ankunftsort kommt man vor jede Station                                                                               |
| `testrestaurant/burgerBelt.test.ts`, `guestWishes.test.ts` | Das Band baut von unten nach oben, Wünsche wechseln, falsches Essen bleibt in der Hand                                                                          |
| `elements/`                                  | Katalog, Hinstellen, Stationsschicht (`stationLayer.ts`) und Bild der Gerichte (`dishView.ts`, `itemModels.ts`), siehe [Spielelemente](./spielelemente.md)               |

Die Welt erbt von `GridWorld`. Im Plan steht **nur der Boden**, dieselbe
Prototyp-Platte wie in der Test Navigation (`floorPlate` →
`test/floorPlate.PLATE_PROTOTYPE`). Alles andere sind Spielelemente:
`allElements(MENU-Ids)` listet sie alle, `occupiedTiles` rechnet ihre Kacheln
aus den Stellen (`spotTiles`), und der Test prüft sie mit
`elementPlace.overlaps`. Gemessen wird am geladenen Modell, nicht
abgeschrieben: Die Oberkante eines Möbels (`PlacedElement.top`) ist die
Unterkante dessen, was darauf liegt.

<!-- ======================================================================
     AUFSTELLUNG: Dieser Abschnitt beschreibt, wo was steht. Er ist in sich
     geschlossen, damit er beim nächsten Umbau als Ganzes ersetzt werden kann.
     ====================================================================== -->

## Die Aufstellung

**Eine Küche im Plan** (`MiniKitchen`) hat `id`, `title`, `recipe` (die
Schritte auf der Tafel), wahlweise `missing` (was im Regal fehlt), einen
`mode` und `rows`, eine oder zwei Reihen aus `KitchenPiece` (`element`,
wahlweise `gives`, `label`, und für die Schauküche `show`: was obenauf liegt,
mit `stack` aufeinander statt nebeneinander). Der `mode` sagt, was die Küche
kann:

- `'play'`: spielbar. Jede Kiste, jedes Brett, jeder Herd tut auf `A`, was er
  im Restaurant tut (`stationElements` gibt alle Stellen an die
  Stationsschicht).
- `'ice'`: die Eisecke des Restaurants. Alle Stellen außer Eisstand und
  Wannen (`ICE_CORNER`) gehen an die Stationsschicht, die beiden an die Ecke.
- `'show'`: eine Schauküche. Die Möbel stehen und sperren wie überall,
  obenauf liegt das Rezept zum Ansehen, und `A` tut dort nichts.

**Zwei Reihen und ein Gang.** Eine Küche mit zwei Reihen hat die
**Arbeitsreihe** bei `z` mit der Vorderseite nach Süden, den **Gang** bei
`z + 1` und die **Vorratsreihe** bei `z + 2` mit der Vorderseite nach Norden.
Man steht im Gang, vor sich das Brett und hinter sich die Kisten, und steht nie
auf der Stelle, von der man gerade etwas holt. Eine Reihe allein schaut nach
Süden. `x`/`z` ist wie immer die Nordwestecke (`ElementSpot`).

Maße (`restaurantPlan.ts`): `AISLE` = 1 Kachel Gang, `ROW_ROOM` = 3 Kacheln
Platz vor jeder Reihe von Küchen (ersetzt `ROW_PITCH`), `ROW_WIDTH` = 34, ab
der eine Reihe umbricht, `KITCHEN_GAP` = 2 zwischen zwei Küchen. Helfer:
`kitchenWidth`, `kitchenDepth` (1, oder 3 bei zwei Reihen), `kitchenSpots`,
`kitchenElements(spot)` (Ids `küche-element`, bei Wiederholung
`küche-element-n`), `stationElements(spot)`, `beltPieces`, `beltStationSpots`,
`beltEndSpot`, `diningElements`, `supplyElements`.

Wo was steht (Kacheln, Nordwestecke):

| Wo            | Küche                           | Elemente                                                                                                                                           |
| ------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| z = 0, x 0–4  | **Burger** (zwei Reihen)        | Nord: `board`, `counter`, `stove`, `bin`, `plate-stack`. Süd (z = 2): `crate-buns`, `crate-steak` (gibt `patty`), `crate-lettuce`, `crate-tomatoes`, `crate-cheese` |
| z = 0, x 7–11 | **Suppe** (zwei Reihen)         | Nord: `board`, `counter`, `stove-pot`, `bin`, `bowl-stack`. Süd (x 7–9): `crate-carrots`, `crate-potatoes`, `crate-onions`                          |
| z = 0, x 14–17 | **Schinken**                   | `crate-ham`, `stove`, `counter`, `bin`                                                                                                             |
| z = 0, x 20–24 | **Pizza to Go**                | `pizza-supply`, `board`, `counter`, `pizzabox-stack`, `bin`                                                                                        |
| z = 0, x 27–33 | **Waffeln mit Eis** (eine Reihe) | `crate-dough`, `rolling-board`, `stove`, `counter`, `bowl-stack`, `ice-tubs`, `bin`                                                             |
| z = 6, x 0–3  | **Eis**                         | `ice-stand`, `ice-tubs`, `counter` (zum Abstellen des Hörnchens), `bin`                                                                            |
| z = 6, x 6–17 | Pizza (Schau)                   | zwölf Stücke: fünf Kisten, Nudelbrett, Platten mit Soße und Belag, `pizza-oven`, Pizza auf dem Teller, drei Stücke                                |
| z = 6, x 20–26 | Steak (Schau)                  | Fleischkiste, Brett mit Steak, Herd mit Steak, Streifen, Kartoffelkiste, Kartoffelbrei, Tellergericht                                              |
| z = 10, x 0–5 | Pommes (Schau)                  | Kartoffelkiste, Brett mit Kartoffel, Stäbchen, `stove-pot` als Fritteuse, Teller mit Stäbchen, Ketchup und Senf                                   |
| z = 15, x 0–11 | Band                           | sechs `belt` nach Osten; Stationen bei z = 14 (`crate-buns`, `stove`, Salat, Tomaten, Käse, `crate-buns`); Endplatte `counter` bei (12, 15)       |
| z = 22        | Gastraum                        | zwei `table-round`, Mitte (4, 22) und (10, 22); Stühle mit `offset` genau am Sitzplatz                                                             |
| z = 25, x 3–11 | Vorratsboxen                   | fünf `supply-box` bei x 3, 5, 7, 9, 11                                                                                                             |

Man kommt bei (16,5 | 18,5) an, zwischen Band und Tischen, mit Blick nach
Norden auf die Küchen. Über jeder Küche steht eine **Tafel** mit dem Namen,
den Schritten und dem, was im Regal fehlt.

<!-- ================= Ende der Aufstellung ================= -->

## Die Küchen, die man spielt

Überall gilt die Regel der Küche (`kitchenDeed`) über die Stationsschicht
(`elements/stationLayer.ts`). `A` vor einem Stück nimmt, was darauf liegt oder
was es ausgibt, und legt ab, was man hält. Eine Vorratskiste gibt aus, so oft
man will, und nimmt zurück, was man ihr entnommen hat. Der Mülleimer nimmt
Essen. **Stapel gehen nie aus** (`stock: Infinity`), und es gibt keine Spüle.
Am Brett und am Nudelholz ist das **Dabeistehen** die Arbeit, drei Sekunden
(`WORK_SECONDS`), und nur, solange die Füße höchstens 1,3 m vom Anker stehen
(`NEAR_STATION`). Wer weggeht, fängt von vorn an. Herd und Suppentopf
arbeiten **allein**. Über allem, was arbeitet oder verbrennt, steht ein Balken
(`KitchenGauges`). Durchgespielt in `restaurantKitchens.test.ts`:

- **Burger** — Salat, Tomate oder Käse aus der Kiste aufs Brett und
  dabeistehen, bis es geschnitten ist. Das Patty aus der Fleischkiste auf den
  Herd, es brät allein. Einen Teller vom Stapel, und darauf alles: Brötchen,
  gebratenes Patty, Geschnittenes, in beliebiger Reihenfolge. Welcher Burger
  es ist, sagt der Stapel (`recipeOf`). Getestet mit Käse.
- **Schinken** — Schinken aus der Kiste auf den Herd, er brät wie das Patty
  (`ham` → `ham-cooked`). Wer ihn rechtzeitig nimmt, hat ihn gebraten. Liegt
  er `DEFAULT_BURN` = 14 s weiter, ist er verbrannt (`ham-burnt`), und wer ihn
  auf die Platte legen will, liest _„… — ab in den Mülleimer!"_. Also in den
  Mülleimer.
- **Pizza to Go** — Eine ganze Pizza aus der Box (`pizza-supply` gibt
  `pizza`), aufs Brett, in Stücke schneiden (`pizza-cut`), einen Karton vom
  Stapel, die Pizza hinein. Der Karton nimmt **genau eine**, ganz oder
  geschnitten (`HOLDS_ONE`).
- **Waffeln mit Eis** — Teig aus der Kiste aufs Nudelbrett, dabeistehen:
  flacher Teig (`'roll'`). Am Schneidebrett geht das nicht (`ROLLS` ist eine
  eigene Tabelle, und das Nudelbrett ist für die Regel ein `roller`). Den
  flachen Teig auf den Herd, er wird allein zur Waffel, und die Waffel
  verbrennt nicht. Eine Schüssel vom Stapel, die Waffel hinein, dann an die
  Wannen: eine Kugel Vanille, eine Erdbeere. Eine zweite Vanille lehnt die
  Schüssel ab. Ohne Schüssel gibt die Wanne nichts (`atTub`). Die beiden
  Wannen sind zwei Stationen, Vanille links, Erdbeere rechts
  (`elementStations`, `TUB_SHIFT`).
- **Suppe** — Eine Karotte (oder Kartoffel, Zwiebel) aufs Brett, schneiden,
  in den Topf. Ungeschnittenes lehnt der Topf ab. Er kocht allein zu Eintopf
  (`'cook'`, fünf Sekunden), und heraus kommt die Suppe nur in eine Schüssel
  (`atPot`).
- **Eis** — Die Regeln des Restaurants (`plateup/plateUpIce.ts`,
  [Das Restaurant → Das Eis](./burgerladen.md#das-eis)), nachgebildet in
  `restaurantIce.ts`. Am Schirm gibt ein Druck am Stand Hörnchen samt
  Portionierer, und ein Druck an einer Wanne setzt eine Kugel auf (`pickTub`
  wählt die Wanne). In der Brille nimmt die eine Hand das Hörnchen, die
  andere den Portionierer, und eingetaucht und abgesetzt wird mit der Hand.
  Das Hörnchen lässt sich auf die Platte stellen, wieder aufnehmen und in den
  Mülleimer werfen. Die Ecke ist dieselbe `IceCorner` wie im Restaurant, hier
  mit `face` Süd, den Sorten `['strawberry', 'vanilla']` (Vanille im
  Westen) und `furnish: false`: Die Möbel stehen schon als Elemente da, und
  die Ecke übernimmt Stapel und Portionierer (`adopt`).

**In der Hand liegt höchstens eines**: ein Ding der Küche (`carried`), ein
fertiges Essen aus einer Vorratsbox oder ein Eis. Die Sätze dazu:

- Wer an einer Vorratsbox schon etwas anderes hält, liest _„Erst die Hände frei
  machen"_.
- Wer mit fertigem Essen an eine Station kommt, liest _„Erst … an den Tisch
  bringen — oder zurück in die Vorratsbox"_.
- Wer ein Küchengericht an den Tisch bringt, liest _„Die Gäste wollen ihr Essen
  aus den Vorratsboxen"_.

Die Gäste werden also weiter **nur aus den Vorratsboxen** bedient. Was in der
Küche entsteht, zeigt, dass die Kette geht, aber es wird nicht serviert.

## Die Schauküchen

**Pizza, Steak und Pommes** sind zum Anschauen: gebaut aus denselben
Elementen (sie sperren also ebenso), dazu obenauf, was der Plan in `show`
nennt, höchstens drei Dinge je Element (`restaurantPlan.test.ts`). `A` tut
dort nichts, weil die Zutaten (Salami, Pilze, Steak, Fritteuse) noch keine
`KitchenItem` sind oder im Regal fehlen. Neu dafür ist das Element
`pizza-oven`.

## Die Rezepte, und was im Regal fehlt

Alles aus _Restaurant Bits_, außer wo es dasteht. Was fehlt, steht auch auf
der Tafel der Küche (`missing`). Es ist die Liste für den Fall, dass jemand ein
Modell von außerhalb will (auf Wunsch).

- **Burger** — Brötchen, Patty, Salat, Tomate, Käse; Brett mit Messer, Herd
  mit Pfanne, Teller.
- **Eis** — Hörnchenstapel und Portionierer; Wannen Vanille und Erdbeere.
  _Fehlt_ in der Wanne: Schokolade; kein Softeis. Die Ecke ist die des
  Restaurants.
- **Pizza** — Teig, Tomaten, Käse, Pepperoni, Pilze; Nudelholz,
  ausgerollter Boden, Tomatensoße, geriebener Käse, Pizzaofen, fertige Pizza,
  Stücke. _Fehlt_: Pizzaschieber, Oliven, Paprika. Salami gibt es nur als
  Pepperoni.
- **Pizza to Go** — Kartonstapel, offener Karton (`pizzabox_open`, so sieht
  der Karton in der Hand aus).
- **Suppe (Eintopf)** — Karotten, Kartoffeln, Zwiebeln, geschnitten;
  Mehrflammenherd mit Topf; Schüsseln. _Fehlt_: Kelle (die Schüssel holt die
  Suppe selbst), Lauch. Suppe gibt es nur als Eintopf (`food_stew` für sich,
  `stew_bowl` in der Schüssel).
- **Waffeln mit Eis** — Teig, Nudelholz, Waffel (`icecream_waffle`, in der
  Schüssel `icecream_bowl_waffles`), Eiskugeln als Füllung der Schale
  (`icecream_bowl_icecream_*`). _Fehlt_: ein Waffeleisen (der Herd backt),
  eine einzelne Waffel (die Eiswaffel ist die Waffel), Kuchen, Donut. Kekse
  und Kakao stehen nicht mehr dabei.
- **Steak** — Fleischkiste, Brett mit Steak, Herd mit Steak, Steakstreifen,
  Kartoffelbrei, Tellergericht (`food_dinner`). _Fehlt_: ein eigenes
  „gebratenes Steak". Die Streifen zeigen, dass es fertig ist.
- **Schinken** — roh, gebraten, verbrannt (`food_ingredient_ham`,
  `_cooked`, `_trash`).
- **Pommes** — Kartoffel, Stäbchen (`potato_chopped`), der Topf auf dem Herd
  als Fritteuse, Ketchup und Senf. _Fehlt_: **Fritteuse**, Frittierkorb und
  Pommes selbst. Kein Paket hat sie.

## Das Förderband

Eine gerade Linie aus sechs Elementen **`belt`**
(`platformer/yellow/conveyor_2x4x1_yellow`, eine Kachel breit, zwei lang und
0,5 m hoch, so hoch wie eine Arbeitsplatte), nach Osten gedreht, die Pfeile
nach Osten. Das Band sperrt seine Zellen wie jedes Element, bleibt aber flach.
An der Nordseite stehen die Stationen (`BELT_STATIONS`, jede mit ihrem
`element`): Brötchenkiste (untere Hälfte), Herd mit Pfanne (Patty), Salat,
Tomate, Käse, noch einmal Brötchen (Deckel). Jede legt ihre Schicht auf,
sobald ein Burger die Mitte ihrer Kachel erreicht. Am Ostende steht er als
fertiger Burger auf dem Teller auf der Endplatte und wird nach `BELT_REST` =
3 s abgeholt. Alle `BELT_EVERY` = 4 s kommt ein neues Brötchen, das Band läuft
0,6 m/s, die Tafel zählt mit.

Rein gerechnet und ohne eigene Uhr (`beltBurgers(time, length)`); die Welt
fragt jedes Bild. Das ist **nicht** das Band der Testküche
(`test/zones/kitchenBelt.ts`, Kacheln mit Schub und Zug, echte Gegenstände).
Hier geht es ums Zusehen. Wer die Linie spielbar will, baut sie dort.
(`burgerBelt.ts` holt `bits` aus `elementCatalog` und nicht aus dem Plan, sonst
gäbe es einen Importzyklus.)

## Gäste mit Wünschen

Zwei runde Tische mit roter Decke (`table-round`, 2 × 2 Kacheln), je drei
Stühle (West, Nord, Ost; der Süden bleibt frei, dort steht, wer bringt). Die
Stühle stehen mit `ElementSpot.offset` genau dort, wo der Gast sitzt, 1,05 m
von der Tischmitte (`SEAT_REACH`), und sperren die Kachel, auf der sie zum
größten Teil stehen. Darauf sitzen Helden aus _Adventurers_ in 1,15 m wie im
Restaurant (`Sit_Chair_Idle`). Über jedem eine **weiße Sprechblase**, und in
ihr dreht sich das gewünschte Gericht als kleines Modell (`stepIcon`: eigene
Materialien ohne Tiefenprüfung, durchsichtig gezählt, damit es nach der Blase
gezeichnet wird).

Die Karte (`MENU`): Burger, Pizza, Eis, Suppe, Steak. Südlich der Tische
steht je Gericht eine **Vorratsbox**, das Element `supply-box` mit dem
fertigen Essen obenauf und dem Namen darüber. `A` an der Box nimmt es
(nochmal `A` legt es zurück), `A` am Tisch legt es vor den Gast, der genau das
wollte. Er isst 5 s, zeigt ein grünes ✓ und wünscht sich danach etwas anderes
(`wishOf`: an einem Tisch nie zweimal dasselbe, nie zweimal hintereinander).
Will es an diesem Tisch niemand, bleibt es in der Hand, und eine Zeile sagt,
was der Tisch will. Getragen wird wie im Restaurant (`carryInHands`): von oben
vor dem Bauch, aus den Augen unten im Bild, in der Brille halb so groß in der
Hand, die es genommen hat.

## Zum Prüfen

Die reine Rechnung prüft `npm test` (`testrestaurant/*.test.ts`,
`elements/*.test.ts`). Im Browser (SwiftShader, sehr wenige Bilder je Sekunde)
lässt sich das Band mit `bgvr.world.beltTime = 26` vorspulen. **Versetzen geht
in zwei Schritten:**
`bgvr.rig.placeAt(new bgvr.rig.position.constructor(x, 0, z), 0)` allein
teleportiert nicht mehr. Die Ebene gleitet von der alten Stelle dorthin und
bleibt an gesperrten Zellen hängen. Danach also
`bgvr.rig.locomotion.resync(bgvr.rig)`. Ob man über ein Möbel läuft, zeigt
_Menü → Werkstatt → Belegte Felder_: Unter jedem Element müssen alle vier
Zellen je Kachel rot sein.

## Offen

Nicht im Bild nachgesehen, nur gerechnet oder vermutet:

- Die Konstanten von `dishLayout` (`ON_PLATE`, `NEST`, `SECOND_SCOOP`,
  `IN_BOX`).
- `pizzabox_open` sieht von oben geschlossen aus. Die Pizza darin ist nicht zu
  sehen.
- Der Kartonstapel und die ganze Pizza auf dem Brett ragen über die Platte.
- Eine Schüssel mit Waffel und zwei Kugeln zeigt sichtbar nur eine Kugel.
- Die Grundfläche des `pizza-oven` (eine Kachel) ist nicht gemessen.
- In der Brille ist nichts probiert.
- Die Anker der beiden Wannen liegen 0,5 m auseinander. Ohne `pickTub` (in
  der Waffelküche, die über die Stationsschicht geht) trifft man am Schirm
  womöglich die Nachbarwanne.
