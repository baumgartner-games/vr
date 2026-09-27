# Test Restaurant

Die zweite Welt im Ordner _Test_, neben der Test Navigation
(`worlds/testrestaurant/`, Kennung `test-restaurant`, `#test-restaurant`).
Ein Prüfstand zum Anschauen und kein Spiel: Welche Stücke aus dem Regal
gehören zu welchem Gericht, wie sähe eine Küche dafür aus, und wie ließe sich
das automatisieren? Das eigentliche Spiel ist [Das Restaurant](burgerladen.md).

Gewünscht: _„neben der Test Navigation eine Test Restaurant Welt … wo es für
jede Gericht Art eine kleine Mini Küche gibt. Also für Burger eben die Pfanne
mit dem Herd, Teller, Arbeitsplatte, Schneidebrett, Zutaten. Für das Eis
ebenfalls die cones, scope, und die Eis Sorten."_ Dazu neu: Pizza, Pizza to
Go, Suppe, Waffeln und Nachtisch, Steak, Schinken, Pommes — _„wofür du erstmal
überlegen musst wie wäre das Rezept dafür, welche Restaurant Utensilien haben
wir dafür und welche kann man dafür nutzen"_ —, ein Förderband, das einen
Burger von allein macht, und Gäste, die in einer Blase zeigen, was sie wollen.

## Was wo liegt

| Datei                                   | Was darin steht                                                                                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `testrestaurant/restaurantPlan.ts`      | **Rein**: die Küchen (`KITCHENS`, je Gericht Rezept, Fehlendes und eine Reihe Möbel), ihre Reihen, Band, Tische, Vorratsboxen                |
| `testrestaurant/burgerBelt.ts`          | **Rein**: das Band — aus der vergangenen Zeit, wo jeder Burger steht und welche Schichten er hat (`beltBurgers`)                             |
| `testrestaurant/guestWishes.ts`         | **Rein**: die Gäste — Wünsche ohne Zufall (`wishOf`), Servieren (`serveTable`), Essen und Bedanken (`stepGuests`)                            |
| `testrestaurant/TestRestaurantWorld.ts` | Die Darstellung: Möbel, Gelegtes, Tafeln, Band, Figuren, Blasen, das Getragene                                                               |
| `testrestaurant/*.test.ts`              | Jede Datei liegt im Regal, nichts steht übereinander, das Band baut von unten nach oben, Wünsche wechseln, falsches Essen bleibt in der Hand |

Die Welt erbt von `GridWorld`. Im Plan steht **nur der Boden** — dieselbe
Prototyp-Platte wie in der Test Navigation (`floorPlate` →
`test/floorPlate.PLATE_PROTOTYPE`). Alles andere sind Stücke aus dem Regal:
Möbel stehen als feste Stücke der Welt (`placeModel`, ein Körper, von oben
durchsichtig wie jede Wand), was obenauf liegt, ist nur Bild (`lay`). Gemessen
wird am geladenen Modell (`measure`), nicht abgeschrieben: Die Oberkante eines
Möbels ist die Unterkante dessen, was darauf liegt.

## Die Mini-Küchen und ihre Rezepte

Jede Küche ist eine Reihe von Möbeln mit der Vorderseite nach Süden — links
die Kisten, rechts der fertige Teller —, darüber eine Tafel mit den Schritten
und dem, was im Regal fehlt. Die Reihen brechen nach `ROW_WIDTH` = 34 Kacheln
um (`kitchenSpots`). Alles aus _Restaurant Bits_, außer wo es dasteht.

- **Burger** — Kisten Brötchen, Fleisch, Salat, Tomaten, Käse; Brett mit
  Messer und Salat; geschnittener Salat, Tomate, Käse; Herd mit Pfanne und
  gebratenem Patty; Brötchenhälften und rohes Patty; Teller mit Burger.
- **Eis** — Hörnchenstapel und Portionierer; Wannen Vanille, Erdbeere,
  Schokolade; Kirsche, Keksstange, Waffel; die Softeismaschine und ihre drei
  Sorten; drei fertige Hörnchen.
- **Pizza** — Kisten Teig, Tomaten, Käse, Pepperoni, Pilze; Nudelholz, Teig,
  ausgerollter Boden; Tomatensoße und geriebener Käse; Pepperoni auf dem
  Brett, Pilzstücke; der Pizzaofen; eine Pepperoni-Pizza auf dem Teller; je
  ein Stück Käse, Pilz, Pepperoni. _Fehlt_: Pizzaschieber, Oliven, Paprika —
  Salami gibt es nur als Pepperoni.
- **Pizza to Go** — Kartonstapel, offener Karton, die Pizza, geschlossener
  Karton, zwei aufeinander für die Abholung.
- **Suppe (Eintopf)** — Kisten Karotten, Kartoffeln, Zwiebeln; Brett mit
  Karotte; geschnittenes Gemüse; Mehrflammenherd mit Eintopftopf und
  Suppentopf; Schüsseln und Löffel; Schüssel mit Eintopf und Tellergericht
  Eintopf. _Fehlt_: Kelle (der Löffel springt ein), Lauch; Suppe gibt es nur
  als Eintopf (`food_stew`, `stew_bowl`, `stew_pot`, `pot_*_stew`).
- **Waffeln & Nachtisch** — Teigkiste; die kleine Kochplatte als Waffeleisen
  mit einer Waffel darauf; Waffel und Schale mit Waffeln; Kirsche,
  Keksstange, leere Schale; zwei verzierte Eisbecher; Keks und heiße
  Schokolade (_Holiday Bits_). _Fehlt_: Waffeleisen, eine einzelne Waffel
  (die Eiswaffel `icecream_waffle` steht dafür), Kuchen, Torte, Donut.
- **Steak** — Fleischkiste; Brett mit Steak; Herd mit Pfanne und Steak;
  Steakstreifen; Kartoffelkiste; Kartoffelbrei; Teller mit Tellergericht
  (`food_dinner`). _Fehlt_: ein eigenes „gebratenes Steak" — die Streifen
  zeigen, dass es fertig ist.
- **Schinken** — Kiste; roher Schinken; Pfanne mit gebratenem; verbrannter
  (`ham_trash`); Teller mit gebratenem.
- **Pommes** — Kartoffelkiste; Brett mit Kartoffel; Stäbchen
  (`potato_chopped`); der große Topf auf dem Mehrflammenherd als Fritteuse;
  Teller mit Stäbchen; Ketchup und Senf. _Fehlt_: **Fritteuse**,
  Frittierkorb, Öl und Pommes selbst — kein Paket hat sie. Wer das Gericht
  ernst meint, braucht dafür ein Modell von außerhalb (auf Wunsch).

## Das Förderband

Eine gerade Linie aus sechs Förderbändern (`platformer/yellow/conveyor_2x4x1_yellow`,
1 × 2 m und 0,5 m hoch — so hoch wie eine Arbeitsplatte), die Pfeile nach
Osten. An der Nordseite die Stationen (`BELT_STATIONS`): Brötchenkiste (untere
Hälfte), Herd mit Pfanne (Patty), Salat, Tomate, Käse, noch einmal Brötchen
(Deckel). Jede legt ihre Schicht auf, sobald ein Burger die Mitte ihrer Kachel
erreicht; am Ostende steht er als fertiger Burger auf dem Teller auf einer
Arbeitsplatte und wird nach `BELT_REST` = 3 s abgeholt. Alle `BELT_EVERY` = 4 s
kommt ein neues Brötchen, das Band läuft 0,6 m/s, die Tafel zählt mit.

Rein gerechnet und ohne eigene Uhr (`beltBurgers(time, length)`); die Welt
fragt jedes Bild. Das ist **nicht** das Band der Testküche
(`test/zones/kitchenBelt.ts`, Kacheln mit Schub und Zug, echte Gegenstände) —
hier geht es ums Zusehen. Wer die Linie spielbar will, baut sie dort.

## Gäste mit Wünschen

Zwei runde Tische mit roter Decke, je drei Stühle (West, Nord, Ost — der Süden
bleibt frei, dort steht, wer bringt). Darauf sitzen Helden aus _Adventurers_
in 1,15 m wie im Restaurant (`Sit_Chair_Idle`). Über jedem eine **weiße
Sprechblase**, und in ihr dreht sich das gewünschte Gericht als kleines
Modell (`stepIcon`: eigene Materialien ohne Tiefenprüfung, durchsichtig
gezählt, damit es nach der Blase gezeichnet wird).

Die Karte (`MENU`): Burger, Pizza, Eis, Suppe, Steak. Südlich der Tische
steht je Gericht eine **Vorratsbox** — eine offene Kiste, das fertige Essen
obenauf, der Name darüber. `A` an der Box nimmt es (nochmal `A` legt es
zurück), `A` am Tisch legt es vor den Gast, der genau das wollte. Er isst
5 s, zeigt ein grünes ✓ und wünscht sich danach etwas anderes
(`wishOf`: an einem Tisch nie zweimal dasselbe, nie zweimal hintereinander).
Will es an diesem Tisch niemand, bleibt es in der Hand, und eine Zeile sagt,
was der Tisch will. Getragen wird wie im Restaurant (`carryInHands`): von oben
vor dem Bauch, aus den Augen unten im Bild, in der Brille halb so groß in der
Hand, die es genommen hat.

## Zum Prüfen

Die reine Rechnung prüft `npm test` (`testrestaurant/*.test.ts`), darunter,
dass jede Datei im Regal liegt. Im Browser (SwiftShader, sehr wenige Bilder
je Sekunde) lässt sich das Band mit `bgvr.world.beltTime = 26` vorspulen;
`bgvr.rig.placeAt(new bgvr.rig.position.constructor(7, 0, 22), 0)` stellt die
Figur vor Band und Tische.
