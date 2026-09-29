# Test Restaurant

Die zweite Welt im Ordner _Test_, neben der Test Navigation
(`worlds/testrestaurant/`, Kennung `test-restaurant`, `#test-restaurant`).
Ein Prüfstand für Küchen aus [Spielelementen](./spielelemente.md). Das
eigentliche Spiel mit Tagen, Geduld und Kasse ist
[Das Restaurant](burgerladen.md).

**Darin steht die Burgerküche**, die der Besitzer im Spiel aus dem
Möbelkatalog zusammengestellt und als Liste der _Weltänderungen_ geschickt hat
(September 2026) — siehe [Die Burgerküche](#die-burgerküche).

## Die Burgerküche

Zwei Reihen mit einem Gang dazwischen (z = 13, dort kommt man bei
(17,5 | 13,5) auch an), jede Zeile in `SPOTS` ein Spielelement:

| z   | x = 11    | 12     | 13        | 14     | 15       | 16      | 17              | 18           |
| --- | --------- | ------ | --------- | ------ | -------- | ------- | --------------- | ------------ |
| 12  | Schinken  | Käse   | Tomaten   | Salat  | Brötchen | Fleisch | Herd mit Pfanne | Feuerlöscher |
| 14  | Mülleimer | Platte | **Brett** | Platte | Platte   | Platte  | Tellerstapel    | Tellerkiste  |

Daneben die **Eisecke** (dritte Liste, in der vierten Runde umgebaut): bei
z = 12 von x = 20 bis 27 Platte, Eisstand, Eiswanne Vanille, Schüsselstapel,
Eiswanne Erdbeere, Eiswanne Schoko, Eismaschine und die Kiste mit leeren
Wannen, alle nach Süden, und bei (20 | 14) ein Mülleimer nach Westen. Eine
Wanne nimmt man mit zur Maschine (füllt sie, jede weitere Füllung die nächste
Sorte) oder zum Mülleimer (leert sie); auf einer Platte schöpft man mit
Hörnchen oder Schüssel daraus, und sie wird nicht leer. Hörnchen, mit oder
ohne Eis, legt man auf Platten ab wie jede Zutat; ihr Turm schaukelt auch
dort. Das Hörnchen liegt in der Hand dreimal so groß wie
ein anderes Gericht (`CONE_HAND`), und sein Turm wackelt wie im Restaurant
(`shared/iceCone.stepIceCones`). In der Brille steht es **senkrecht in der
Faust**, am Halterzylinder wie jedes Getragene; einstellen lässt sich das über
_Halten einstellen_ auf der Detailseite des Möbels
([Hände → Und was die Küche in die Hand gibt](haende.md#und-was-die-küche-in-die-hand-gibt-hängt-auch-am-halterzylinder)).

Feuerlöscher und Tellerkiste kamen mit der zweiten Liste dazu.

Im Norden die **Suppenküche** (fünfte Liste): bei z = 7 von West nach Ost
Kartoffelkiste (nach Westen), Tomatenkiste (nach Osten), Karottenkiste, Herd mit
Topf, Spüle, Schüsselstapel, Feuerlöscher und — nicht in der Liste, aber
nötig, weil die Spüle kaputtgehen kann — die Rohrzange; bei z = 9 Pilzkiste
(nach Osten), dann nach Norden Zwiebelkiste, Brett, zwei Platten, Mülleimer.
Pilz- und Kartoffelkiste standen als rohe Modelle in der Liste und sind hier
die Spielelemente dazu.

Östlich davon die **Waffelecke** (sechste Liste): bei z = 9 nach Norden
Teigkiste, Schneidebrett, Platte, Schüsselstapel (20…23), bei z = 7 nach Süden
Herd mit Pfanne, Platte, Vanille-Eiswanne (21…23; in der Liste standen die alten
Eiswannen zu zweit auf einer Platte, die es nicht mehr gibt). In der Liste stand statt des
Bretts das Nudelbrett: **Waffeln werden geschnitten, nicht ausgerollt** —
ausgerollt wird der Pizzaboden, und so unterscheiden sich beide am ersten
Möbel (gefragt war: _„Teig erst schneiden dann braten oder erst ausrollen dann
schneiden dann braten? Der Unterschied muss ja zur Pizza da sein."_). Der
Ablauf: Teig aufs Brett, geschnitten liegen vier Teigstücke nebeneinander (die
rohen Waffeln, `kitchenRecipes.PIECES`), alle vier in die Hand und in die
Pfanne, gebraten die Pfanne auf einer leeren Platte auskippen, dort nimmt man
einzeln (mit der Schüssel eine hinein). Zurück in die Pfanne gelegt, brät eine
gebratene Waffel mit Warnung weiter, verkohlt und fängt Feuer wie Patty, Steak
und Schinken.

**Alle schauen nach Süden** — gewünscht: _„Diese Ausrichtung der Möbel ist
bei allen Süden, bitte anpassen."_ In der Liste standen die sechs Kisten noch
nach Norden. Die Nordreihe arbeitet man damit vom Gang aus, die Südreihe von
der Südseite (z = 15).

Was dazu im **Katalog** geändert wurde und damit in jeder Welt gilt
([Spielelemente](./spielelemente.md#die-elemente-heute)):

- **Das Möbel leuchtet, wenn es gemeint ist** (`elementLit`,
  `Usable.highlight`): Kiste samt Gemüse beim Nehmen, der Eimer beim
  Wegwerfen, die Arbeitsplatte beim Ablegen — das, was darauf liegt, beim
  Nehmen. Vorher lag dort nur ein Ring auf dem Boden.
- **Der Tellerstapel ist ein Abtropfgitter wie in der Sandbox**
  (`GameElement.rack`): höchstens vier Teller, zu Beginn voll, einzeln in den
  Fächern des leeren `dishrack` gezeigt; ein fünfter wird abgelehnt.
- **Neu: die Tellerkiste** (`crate-plates`), aus der Teller kommen, so viele
  man will — im Möbelkatalog bei Burger, Pizza und Alles.

Geschnitten und belegt wird nach der Regel der Küche, die es schon gab: Salat
oder Tomate aus der Kiste aufs Brett, und geschnitten wird sofort, solange man
höchstens 1,3 m von der Mitte des Bretts steht, auch vom Gang dahinter aus
(`NEAR_STATION`); wer weggeht, hält es an; das Geschnittene aufs Brötchen, das Brötchen mit
Belag an den Tellerstapel, und man hat den obersten Teller mit dem Burger in
der Hand. `restaurantPlan.test.ts` kocht genau das auf diesen Stellen.

## Warum sie einmal leer war

Gewünscht, im September 2026, nach einer Runde durch die alte Welt:

- _„Statt 2x1 conveyers will ich 1x1 conveyer belts haben. In der Restaurant
  Test Welt und in der normalen Restaurant Welt."_
- _„In der Test Restaurant welt sind die Vorrats Boxen mit Brötchen und Käse
  und co beim conveyer belt nicht interagierbar."_
- _„Bei der Test Welt die Pommes. Die Kartoffeln Vorräte sollen auch
  gehighlighted werden und interagierbar sein. Das Schneidebrett daneben soll
  leer sein ohne die Kartoffel drauf, aber ich will darauf z.B. auch
  Kartoffeln schneiden können. Die Arbeitsplatte daneben soll leer sein. Der
  Herd daneben soll der Herd aus der Restaurant Welt sein und nicht der mit
  den 4 Platten drauf. Der Topf darauf soll auch der sein aus der Restaurant
  Welt. Es fehlt noch ein Waschbecken wo ich den Topf vollmachen kann. Die
  Arbeitsplatte daneben soll leer sein und die Platte daneben auch."_
- _„Also wir sollten die Restaurant Test Welt komplett neu aufbauen. Mach die
  bitte einmal komplett leer. Ich will diese aus dem Model Regal selbst
  aufbauen und schicke dir dann das dazu."_

Die ersten drei Wünsche sind in den **Katalog** gegangen und nicht in die
Welt, denn dort gelten sie für jede Welt:

- **Das Band ist eine Kachel.** Das Element `belt` ist das quadratische
  `conveyor_4x4x1_yellow`, und der Lader bringt jedes `conveyor_4x4x1_*` auf
  1 × 1 × 0,5 m (`core/kaykitFit.KAYKIT_FILE_SCALE`), auch wenn es jemand aus
  dem Modellregal nimmt ([Das Modellregal](./assetregal.md)).
- **Jedes hingestellte Element mit Stationsart ist eine Station.** Die Kisten
  am alten Band standen als Elemente da, aber die Welt meldete nur an, was in
  ihrer eigenen Liste der Stationen stand, und die Kisten am Band standen
  nicht darin. Jetzt gibt es einen Weg (`elements/furnish.ts`): Hinstellen und
  Anmelden sind ein Aufruf, und welche Stellen Stationen werden, sagt das
  Element selbst.
- **Herd und Topf wie im Restaurant, dazu eine Spüle.** `stove-pot` ist der
  einflammige Herd, der Topf `pot_A` steht darauf und geht mit, `sink` füllt
  ihn, und Topf mit Wasser plus geschnittene Kartoffel auf dem Herd gibt
  Pommes für den Teller
  ([Spielelemente → Topf, Spüle und Pommes](./spielelemente.md#topf-spüle-und-pommes)).
  Das Brett (`board`) ist leer, wie jedes Brett, und schneidet Kartoffeln.

Die Welt selbst blieb leer, bis der Besitzer die Liste schickte — heute die
[Burgerküche](#die-burgerküche).

## Was noch da ist

| Datei                                   | Was darin steht                                                                                                                                                                                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `testrestaurant/restaurantPlan.ts`      | **Rein**: `SPOTS` (die Burgerküche), `ground()` (40 × 32 Kacheln ab (−3 \| −3), dieselbe Fläche wie zuletzt), `spawn()` (Mitte), `restaurantPlan()`                                                                                                              |
| `testrestaurant/TestRestaurantWorld.ts` | Die Welt: Prototyp-Boden, Himmel, Küche (`spots`), Boden (`onGround`); `elementHost`, `StationLayer` und das Getragene (`carryInHands`) stehen in `grid/FurnishedWorld.ts`                                                                                       |
| `testrestaurant/restaurantPlan.test.ts` | Boden 40 × 32, Ankunft auf dem Boden und mitten auf einer Kachel; jede Stelle auf dem Boden, ohne Überlappen, nicht auf dem Ankunftsort; jede Stelle mit Stationsart wird Station; alle nach Süden; ein Burger mit Salat und Tomate, geschnitten, auf dem Teller |

Die Welt erbt von `FurnishedWorld` (und die von `GridWorld`). Im Plan steht **nur der Boden**, dieselbe
Prototyp-Platte wie in der Test Navigation (`floorPlate` →
`test/floorPlate.PLATE_PROTOTYPE`). Man kommt bei (17,5 | 13,5) an, mit Blick
nach Norden.

## Wie Elemente wieder hineinkommen

Der Besitzer baut im Modellregal zusammen, was er haben will, und schickt die
Liste der Änderungen (Modelle, Stellen, Drehungen). **Übersetzt wird sie in
Spielelemente**, nicht in rohe Modelle ([Die Regel](./spielelemente.md#die-regel)):

1. Für jedes Möbel das passende Element aus `ELEMENTS` suchen. Fehlt eines,
   kommt es **in den Katalog** (`elements/elementCatalog.ts`), aus den Dateien
   des Regals zusammengesetzt, die der Besitzer genommen hat.
2. Eine Zeile je Möbel in `SPOTS` (`restaurantPlan.ts`):
   `{ id: 'kartoffeln', element: 'crate-potatoes', x: 4, z: 2, face: 'N' }` —
   `x`/`z` die Nordwestecke in Kacheln, `face` die Vorderseite, wahlweise
   `gives` und `label`.
3. Mehr nicht. Die Welt reicht `SPOTS` an `furnish`: Jede Stelle sperrt ihre
   Zellen, bevor ein Modell lädt, und jede, deren Element eine Stationsart hat
   (Kiste, Brett, Herd, Spüle, Stapel, Mülleimer, Platte …), antwortet auf
   `A` nach der Regel der Küche. Eine zweite Liste „welche davon sind
   Stationen" gibt es nicht und soll es nicht wieder geben.
4. `npm test` prüft die Stellen (`restaurantPlan.test.ts`). Braucht die Welt
   mehr als die Küche (Tafeln, Gäste, ein Band, das etwas fährt), kommt das
   als eigener Teil dazu, mit eigenem reinem Plan und Test.

**Oder gleich aus dem Möbelkatalog** (September 2026): Menü _Bauen &
Gestalten_ → **Möbel** gibt Arbeitsplatte, Arbeitsplatte mit Schneidebrett,
Herdplatte mit Pfanne, mit Topf und blank sowie das Waschbecken als
Spielelemente her; hingestellt sperren sie ihre Kachel und tun auf `A`, was
sie in der Küche tun. Mit Häkchen bei _Weltänderungen_ steht jedes als fertige
Zeile für `SPOTS` in der Liste
([Der Möbelkatalog im Menü](./spielelemente.md#der-möbelkatalog-im-menü)).

Das Eis braucht dabei mehr als eine Zeile: Den Eisstand (`ice-stand`) regelt
die Eisecke des Restaurants als `StationOverride` vor der Küche, und die
Brücke dafür war `restaurantIce.ts` (siehe unten).

## Das erste Test Restaurant, in der Geschichte

Bis zum Leeren stand hier eine ganze Welt: neun Mini-Küchen je Gericht
(Burger, Suppe, Schinken, Pizza to Go, Waffeln mit Eis, die Eisecke, dazu
Schauküchen für Pizza, Steak und Pommes, jede mit Tafel und Rezept), ein
Förderband aus sechs Stücken, das Burger allein baute, und zwei runde Tische
mit Gästen, die in einer Blase zeigten, was sie wollten, bedient aus
Vorratsboxen. Der letzte Stand mit allem ist **Commit `2108949`** auf `main`:

```
git show 2108949:src/worlds/testrestaurant/restaurantPlan.ts
git show 2108949:docs/agents/testrestaurant.md
```

Weg sind seitdem `burgerBelt.ts` (das Band, rein gerechnet), `guestWishes.ts`
(Gäste und Wünsche), `restaurantIce.ts` (die Eisecke auf den Elementen), die
Küchen, das Band, der Gastraum und die Vorratsboxen in `restaurantPlan.ts`,
und ihre Tests. Was davon allgemein war, lebt weiter:

- Die Abläufe der Küchen (`restaurantKitchens.test.ts`) stehen jetzt auf
  Stellen, die für sich stehen, in `elements/elementFlows.test.ts`, dazu die
  Pommes und die Suppe im Topf mit Wasser.
- Der Gang aus vier Richtungen (`restaurantFeet.test.ts`) prüft jetzt jedes
  Element des Katalogs für sich, in jeder Drehung
  (`elements/elementFeet.test.ts`).

## Von Hand zu Hand

Was man trägt — Gemüse, Teller, Hörnchen, Pfanne —, geht in der Brille an die
andere Hand wie die Pistole: die freie Hand an den Griff der tragenden führen
(`grabReach.atHandGrip`, 16 cm), sie leuchtet und stupst einmal, dann ihr
Griffknopf (`FurnishedWorld.passHands`). Eine Hand mit Werkzeug nimmt
nichts entgegen (`handFree`), und eine schon geschlossene Faust auch nicht.

## Zum Prüfen

Die reine Rechnung prüft `npm test` (`testrestaurant/*.test.ts`,
`elements/*.test.ts`). Im Browser: **Versetzen geht in zwei Schritten**,
`bgvr.rig.placeAt(new bgvr.rig.position.constructor(x, 0, z), 0)` und danach
`bgvr.rig.locomotion.resync(bgvr.rig)`. Ob man über ein Möbel läuft, zeigt
_Menü → Werkstatt → Belegte Felder_: Unter jedem Element müssen alle vier
Zellen je Kachel rot sein.

## Offen

- Nicht im Bild nachgesehen, nur gerechnet: die Teller in den Fächern des
  Tellerstapels (`stationLayer.RACK_PLATE_LIFT`, die Zahlen der Sandbox).
- Nicht im Bild nachgesehen, nur gerechnet: das Band auf einer Kachel
  (1/4,2 × 0,5 × 1/4), der Topf auf dem Rost des einflammigen Herds, die
  Pommes im Topf (`dishView.IN_POT`) und auf dem Teller, die übrigen
  Konstanten von `dishLayout`.
- Die Spüle legt ab, was man ihr lässt, auf ihrer Oberkante: Das ist beim
  `kitchencounter_sink` der Hahn (0,90 m), nicht das Becken. Für den Topf
  spielt es keine Rolle, denn gefüllt wird in der Hand.
- Der Herd mit Topf ist eine Fläche (`stove`): Ohne Topf darauf liegt dort,
  was man ablegt, auch eine rohe Kartoffel.
- Pommes haben kein eigenes Stück im Regal; sie sehen aus wie die gewürfelte
  Kartoffel.
- In der Brille ist nichts probiert.
