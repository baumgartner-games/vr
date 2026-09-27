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
sein."_). Seitdem steht hier jedes Möbel als Spielelement, sperrt seine
Kacheln, bevor ein Modell lädt, und die meisten Küchen lassen sich mit `A`
spielen, nach denselben Regeln wie die Küche der Testwelt und das Restaurant
(`kitchenCarry.kitchenDeed`).

## Was wo liegt

| Datei                                   | Was darin steht                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `testrestaurant/restaurantPlan.ts`      | **Rein**: die Küchen (`KITCHENS`, je Gericht Rezept, Fehlendes und ihre Stellen als `ElementSpot`), Band, Tische, Vorratsboxen              |
| `testrestaurant/burgerBelt.ts`          | **Rein**: das Band, also aus der vergangenen Zeit, wo jeder Burger steht und welche Schichten er hat (`beltBurgers`)                       |
| `testrestaurant/guestWishes.ts`         | **Rein**: die Gäste, also Wünsche ohne Zufall (`wishOf`), Servieren (`serveTable`), Essen und Bedanken (`stepGuests`)                      |
| `testrestaurant/TestRestaurantWorld.ts` | Die Darstellung: Elemente (`placeElement` über `elementHost`), Stationen und ihr `A`, Gelegtes, Tafeln, Band, Figuren, Blasen, Getragenes |
| `testrestaurant/*.test.ts`              | Jede Datei liegt im Regal, keine Kachel doppelt belegt, jede Küche spielbar bis zum fertigen Gericht, das Band baut von unten nach oben     |
| `elements/`                             | Der Katalog, aus dem hier alles steht ([Spielelemente](./spielelemente.md)); `itemModels.ts` sagt, wie jede Zutat aussieht                |

<!-- NACHTRAG C: Neue Dateien (etwa eine reine Rechnung für die Stationen
der Mini-Küchen) und die tatsächlichen Testnamen in die Tabelle. -->

Die Welt erbt von `GridWorld`. Im Plan steht **nur der Boden**, dieselbe
Prototyp-Platte wie in der Test Navigation (`floorPlate` →
`test/floorPlate.PLATE_PROTOTYPE`). Alles andere sind Spielelemente: Die
Sperre kommt von `GridWorld.blockSolid`, das Bodenstück steht als festes Stück
der Welt, was obenauf liegt, ist Bild. Gemessen wird am geladenen Modell,
nicht abgeschrieben: Die Oberkante eines Möbels (`PlacedElement.top`) ist die
Unterkante dessen, was darauf liegt.

<!-- ======================================================================
     AUFSTELLUNG — dieser Abschnitt beschreibt, wo was steht. Er ist
     absichtlich in sich geschlossen, damit er nach dem Umbau als Ganzes
     nachgezogen werden kann. Alles mit NACHTRAG C prüfen.
     ====================================================================== -->

## Die Aufstellung: zwei Reihen und ein Gang

Jede Mini-Küche ist ein Streifen aus **zwei Reihen mit einem Gang
dazwischen**. So steht man beim Arbeiten nie auf der Stelle, von der man gerade
etwas holt, und es ist von oben zu lesen:

- **Südlich des Gangs die Zutaten**: die Vorratskisten (und was sonst
  _ausgibt_, die Pizza-Vorratsbox, der Eisstand), mit der Vorderseite nach
  Norden zum Gang.
- **Nördlich des Gangs die Arbeit**: Brett, Arbeitsplatte, Herd, Mülleimer
  und der Stapel mit Tellern, Schüsseln oder Kartons, mit der Vorderseite nach
  Süden zum Gang.
- Über jeder Küche eine **Tafel** mit dem Namen, den Schritten und dem, was im
  Regal fehlt.

Jedes Stück sperrt seine Kachel ganz (2 × 2 Zellen, 1,40 m), der Gang ist frei.
Dass keine Kachel doppelt belegt ist, prüft der Test über alle Stellen der
Welt (`elementPlace.overlaps`).

<!-- NACHTRAG C: Maße (Gangbreite, Abstand der Küchen, ROW_WIDTH / Umbruch),
die Reihenfolge der Küchen in der Welt, wo Band, Tische und Vorratsboxen
jetzt liegen, und die tatsächliche Richtung der Vorderseiten. -->

## Die Küchen, die man spielt

Überall gilt die Regel der Küche (`kitchenDeed`): `A` vor einem Stück nimmt,
was darauf liegt oder was es ausgibt, und legt ab, was man hält. Eine
Vorratskiste gibt aus, so oft man will, und nimmt zurück, was man ihr
entnommen hat. Der Mülleimer nimmt Essen. Am Brett und am Nudelholz ist das
**Dabeistehen** die Arbeit, drei Sekunden (`WORK_SECONDS`). Wer weggeht,
fängt von vorn an. Herd und Suppentopf arbeiten **allein**. Was eine Stelle
ausgibt, sagt ihr `gives`.

- **Burger** — Kisten Brötchen, Fleisch (gibt das Patty), Salat, Tomaten,
  Käse; Brett, Arbeitsplatte, Herd, Mülleimer, Tellerstapel.
  1. Teller vom Stapel nehmen, auf die Arbeitsplatte legen.
  2. Patty aus der Fleischkiste, auf den Herd: Es brät allein
     (`'patty'` → `'patty-cooked'`). Liegt es zu lange, verbrennt es
     (`burnStage`), dann gehört es in den Müll.
  3. Salat, Tomate oder Käse aus der Kiste aufs Brett, dabeistehen, bis es
     geschnitten ist.
  4. Brötchen, gebratenes Patty und Geschnittenes auf den Teller legen, in
     beliebiger Reihenfolge. Welcher Burger es ist, sagt der Stapel
     (`recipeOf`).
- **Suppe** — Kisten Karotten, Kartoffeln, Zwiebeln; Brett, Herd mit Topf,
  Arbeitsplatte, Mülleimer, Schüsselstapel.
  1. Gemüse aufs Brett, schneiden.
  2. Das Geschnittene in den Topf: Es kocht allein, fünf Sekunden
     (`'cook'`), zu Suppe (`stew`). Eine Sorte reicht (`COOKS`).
  3. Schüssel vom Stapel nehmen, `A` am Topf: Die Suppe kommt in die
     Schüssel. In die bloße Hand gibt der Topf sie nicht (`atPot`).
- **Schinken** — Schinkenkiste, Herd, Arbeitsplatte, Mülleimer.
  Schinken auf den Herd, er brät wie das Patty (`ham` → `ham-cooked`) und
  verbrennt wie das Patty (`ham-burnt`). Gebraten auf die Platte, verbrannt
  in den Müll.
- **Pizza to Go** — Pizza-Vorratsbox, Brett, Arbeitsplatte, Kartonstapel,
  Mülleimer.
  1. Eine ganze Pizza aus der Box (`pizza-supply` gibt `pizza`).
  2. Wahlweise aufs Brett: Sie wird in Stücke geschnitten (`pizza-cut`).
  3. Karton vom Stapel, Pizza hinein. Der Karton nimmt **genau eine**, ganz
     oder geschnitten (`HOLDS_ONE`), eine zweite passt nicht.
- **Waffeln** — Teigkiste, Nudelbrett, Herd, Arbeitsplatte,
  Schüsselstapel, Eiswannen, Mülleimer.
  1. Teig aufs Nudelbrett, dabeistehen: flacher Teig (`'roll'`, drei
     Sekunden). Am Schneidebrett geht das nicht, und Käse lässt sich unter
     dem Nudelholz nicht schneiden (`ROLLS` ist eine eigene Tabelle).
  2. Flachen Teig auf den Herd: Er wird allein zur Waffel. Die Waffel
     verbrennt nicht.
  3. Schüssel vom Stapel, Waffel hinein, dann `A` an einer Wanne: Eine Kugel
     Vanille oder Erdbeere kommt dazu. Eine Wanne gibt ihre Kugel nur in
     eine Schüssel (`atTub`).
- **Eis** — Eisstand, Eiswannen, Mülleimer, mit der Eislogik des Restaurants
  (`plateup/plateUpIce.ts`, [Das Restaurant → Das Eis](./burgerladen.md)):
  Am Stand gibt es das Hörnchen (am Schirm zusammen mit dem Portionierer),
  an einer Wanne eine Kugel darauf, beliebig oft. In der Brille nimmt die
  eine Hand das Hörnchen und die andere den Portionierer. Das Eis ist dort
  kein `Dish`, deshalb geht es in den Müll oder auf eine Platte, aber nicht
  auf einen Teller.

<!-- NACHTRAG C: Genaue Schritte gegen den Code prüfen: Wo in der
Burgerküche Brötchen und Belag zusammenkommen (Teller auf der Platte oder in
der Hand), ob der Herd hier verbrennt (Hitze wie im Restaurant, `heat`) oder
wie die sichere Kochstelle stehen bleibt, wie viele Teller der Stapel hat
(`stock`, Infinity?), und ob das Eis hier dieselbe `IceCorner` benutzt
(dann Verweis in burgerladen.md/modelle.md). -->

## Die Schauküchen

**Pizza, Steak und Pommes** sind zum Anschauen: gebaut aus denselben
Elementen (sie sperren also ebenso), dazu das Fertige als Bild obenauf. `A`
tut dort nichts, weil die Zutaten (Salami, Pilze, Steak, Fritteuse) noch keine
`KitchenItem` sind oder im Regal fehlen.

<!-- NACHTRAG C: Welche Elemente und Auflagen die drei Schauküchen haben. -->

## Die Rezepte, und was im Regal fehlt

Alles aus _Restaurant Bits_, außer wo es dasteht. Was fehlt, steht auch auf
der Tafel der Küche. Es ist die Liste für den Fall, dass jemand ein Modell von
außerhalb will (auf Wunsch).

- **Burger** — Brötchen, Patty, Salat, Tomate, Käse; Brett mit Messer, Herd
  mit Pfanne, Teller.
- **Eis** — Hörnchenstapel und Portionierer; Wannen Vanille und Erdbeere. Im
  Paket gibt es außerdem Schokolade, Kirsche, Keksstange und die
  Softeismaschine; die Eisecke nimmt die beiden Sorten des Restaurants.
- **Pizza** — Teig, Tomaten, Käse, Pepperoni, Pilze; Nudelholz,
  ausgerollter Boden, Tomatensoße, geriebener Käse, Pizzaofen, fertige Pizza,
  Stücke. _Fehlt_: Pizzaschieber, Oliven, Paprika. Salami gibt es nur als
  Pepperoni.
- **Pizza to Go** — Kartonstapel, offener Karton (`pizzabox_open`, so sieht
  der Karton in der Hand aus), geschlossener Karton.
- **Suppe (Eintopf)** — Karotten, Kartoffeln, Zwiebeln, geschnitten;
  Mehrflammenherd mit Topf; Schüsseln. _Fehlt_: Kelle, Lauch. Suppe gibt es
  nur als Eintopf (`food_stew` für sich, `stew_bowl` in der Schüssel).
- **Waffeln & Nachtisch** — Teig, Nudelholz, Waffel
  (`icecream_waffle`, in der Schüssel `icecream_bowl_waffles`), Eiskugeln als
  Füllung der Schale (`icecream_bowl_icecream_*`). _Fehlt_: ein Waffeleisen
  (der Herd springt ein), Kuchen, Torte, Donut.
- **Steak** — Fleischkiste, Brett mit Steak, Pfanne, Steakstreifen,
  Kartoffelbrei, Tellergericht (`food_dinner`). _Fehlt_: ein eigenes
  „gebratenes Steak". Die Streifen zeigen, dass es fertig ist.
- **Schinken** — roh, gebraten, verbrannt (`food_ingredient_ham`,
  `_cooked`, `_trash`).
- **Pommes** — Kartoffel, Stäbchen (`potato_chopped`), der große Topf als
  Fritteuse, Ketchup und Senf. _Fehlt_: **Fritteuse**, Frittierkorb, Öl und
  Pommes selbst. Kein Paket hat sie.

<!-- ================= Ende der Aufstellung ================= -->

## Das Förderband

Eine gerade Linie aus sechs Elementen **`belt`**
(`platformer/yellow/conveyor_2x4x1_yellow`, eine Kachel breit, zwei lang und
0,5 m hoch, so hoch wie eine Arbeitsplatte), die Pfeile nach Osten. Das Band
sperrt seine Zellen wie jedes Element, bleibt aber flach. An der Nordseite
die Stationen (`BELT_STATIONS`): Brötchenkiste (untere Hälfte), Herd mit
Pfanne (Patty), Salat, Tomate, Käse, noch einmal Brötchen (Deckel). Jede legt
ihre Schicht auf, sobald ein Burger die Mitte ihrer Kachel erreicht. Am
Ostende steht er als fertiger Burger auf dem Teller auf einer Arbeitsplatte
und wird nach `BELT_REST` = 3 s abgeholt. Alle `BELT_EVERY` = 4 s kommt ein
neues Brötchen, das Band läuft 0,6 m/s, die Tafel zählt mit.

Rein gerechnet und ohne eigene Uhr (`beltBurgers(time, length)`); die Welt
fragt jedes Bild. Das ist **nicht** das Band der Testküche
(`test/zones/kitchenBelt.ts`, Kacheln mit Schub und Zug, echte Gegenstände).
Hier geht es ums Zusehen. Wer die Linie spielbar will, baut sie dort.

## Gäste mit Wünschen

Zwei runde Tische mit roter Decke (`table-round`, 2 × 2 Kacheln), je drei
Stühle (West, Nord, Ost; der Süden bleibt frei, dort steht, wer bringt).
Darauf sitzen Helden aus _Adventurers_ in 1,15 m wie im Restaurant
(`Sit_Chair_Idle`). Über jedem eine **weiße Sprechblase**, und in ihr dreht
sich das gewünschte Gericht als kleines Modell (`stepIcon`: eigene
Materialien ohne Tiefenprüfung, durchsichtig gezählt, damit es nach der Blase
gezeichnet wird).

Die Karte (`MENU`): Burger, Pizza, Eis, Suppe, Steak. Südlich der Tische
steht je Gericht eine **Vorratsbox**, eine offene Kiste mit dem fertigen Essen
obenauf und dem Namen darüber. `A` an der Box nimmt es (nochmal `A` legt es
zurück), `A` am Tisch legt es vor den Gast, der genau das wollte. Er isst
5 s, zeigt ein grünes ✓ und wünscht sich danach etwas anderes
(`wishOf`: an einem Tisch nie zweimal dasselbe, nie zweimal hintereinander).
Will es an diesem Tisch niemand, bleibt es in der Hand, und eine Zeile sagt,
was der Tisch will. Getragen wird wie im Restaurant (`carryInHands`): von oben
vor dem Bauch, aus den Augen unten im Bild, in der Brille halb so groß in der
Hand, die es genommen hat.

<!-- NACHTRAG C: Ob die Vorratsboxen jetzt Elemente sind und ob ein in einer
Mini-Küche gekochtes Gericht auch an den Tisch gebracht werden kann. -->

## Zum Prüfen

Die reine Rechnung prüft `npm test` (`testrestaurant/*.test.ts`,
`elements/*.test.ts`), darunter, dass jede Datei im Regal liegt, dass keine
Kachel doppelt belegt ist und dass jede Stelle ihre Zellen sperrt. Im Browser
(SwiftShader, sehr wenige Bilder je Sekunde) lässt sich das Band mit
`bgvr.world.beltTime = 26` vorspulen;
`bgvr.rig.placeAt(new bgvr.rig.position.constructor(7, 0, 22), 0)` stellt die
Figur vor Band und Tische. Ob man über ein Möbel läuft, zeigt _Menü →
Werkstatt → Belegte Felder_: Unter jedem Element müssen alle vier Zellen je
Kachel rot sein.

<!-- NACHTRAG C: Koordinaten für placeAt nach dem Umbau, und die Namen der
Tests, die eine Küche von der Kiste bis zum fertigen Gericht durchspielen. -->
