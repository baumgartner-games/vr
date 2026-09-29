# Hausbau

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

Die dritte Welt im Ordner _Test_ (`worlds/house/`, Kennung `hausbau`,
`#hausbau`). Gewünscht (September 2026): _„Ich würde gerne eine weitere Test
Welt haben: Hausbau, in der wir genau die Wände und co aufbauen und anpassen
können. In der Welt können vorratskisten von den Tapeten sein, sodass man
unendlich viele davon hat."_

## Was darin steht

- **Ein kleines Haus** aus den Wänden des Katalogs (`housePlan.houseWalls`):
  10 × 6 Kacheln, zwei Zimmer (Wohnzimmer im Westen, Küche im Osten), dazwischen
  die schmale Innentür, im Süden die breite Haustür, im Norden zwei
  Fensterwände. Alles Regalwände auf den Fugen, hingestellt wie aus der Hand
  (`placeModel`) — neue zieht man im _Baukasten_ wie in _Die Sims_
  ([Bauen](./bauen.md#wand-ziehen-wie-in-die-sims)).
- **Sechs Tapetenkisten** vor der Haustür (`HOUSE_SPOTS`,
  `elementCatalog.WALLPAPER_CRATES`): Backstein, Putz weiß, Tapete beige,
  Tapete grün gestreift, Holzvertäfelung, Fliesen blau. Eine Kiste ist eine
  Station der Art `crate` und wird nie leer; wer mit derselben Tapete davor
  steht, legt sie zurück. Obenauf liegt die Bahn in ihrer Farbe.
- **Sechs Bodenkisten** rechts daneben (`elementCatalog.FLOORING_CRATES`,
  `house/flooring.ts`): Prototyp-Boden, Küchenfliesen, Küchenfliesen B,
  Dielen Gastraum, Dielen dunkel, Steinplatten — obenauf die Platte selbst.
- **Die Treppenkiste** ganz rechts (`elementCatalog.STAIR_CRATE`).
- **Das Tor zurück** in die Sandbox, links vorn.

`HausbauWorld` erbt vom [Test Restaurant](./testrestaurant.md): Kisten,
Stationen und das Getragene in der Hand sind dieselben. Die Tapeten sind
deshalb Dinge der Küche (`KitchenItem` `wallpaper-*`), die keine Regel der
Küche annimmt, und ihr Bild ist ein Banner aus dem Verlies
(`itemModels.ITEM_MODELS`, klein: `dishView.ITEM_SCALE`).

## Tapezieren wie in _PlateUp!_

Gewünscht: _„Wenn ich dann in einem Raum bin, und das Item in der Hand halte
der Tapete werden alle Wände die es betrifft gehighlithed, mit interagieren
wird dann die Tapete angewandt und das Item in der Hand aufgebraucht."_

1. **Nehmen**: aus der Kiste (`A`, am Schirm `E`) — oder aus dem **Katalog**,
   Ordner _Wände_, die ersten sechs Kacheln (_In die Hand_,
   `PortalWorld.catalogItem`/`takeCatalogItem`, `FurnitureFolder.items`). Das
   ist der Weg mit dem **Kran** im _Baukasten_: _„Beim Kran Modus können wir
   das gleiche Prinzip anwenden, also einfach über den Katalog."_
2. **Zeigen**: Je Bild sucht die Welt den Raum in Blickrichtung
   (`roomTrace.traceRoom`, siehe unten). Die Seiten, die die Tapete bekäme,
   zeigen sie schon als **Vorschau** und leuchten dazu (`wallpaperSkin.glow`).
3. **Kleben**: `A` (am Schirm `E` oder Klick) — alle diese Seiten bekommen die
   Tapete, und die in der Hand ist aufgebraucht. Eine Kiste oder Station vor
   einem geht vor (`PortalWorld.hasUsePick`); geprüft wird **vor**
   `super.update`, damit der Kran den Druck nicht als Anheben liest.

**Was ein Raum ist** (`house/roomTrace.ts`), wörtlich nach dem Wunsch: _„in
Blickrichtung des Spielers auf erste Wand treffen, dann in beide Richtungen
der Wand weiter gehen, bis die Wände sich wieder treffen (Türen und Fenster
sind in dem Sinne auch Wände). Wenn eine Wand keinen Nachbar hat, dann wird
nicht auf die Rückseite gesprungen."_

- Die Wände sind Strecken zwischen Ecken des Gitters, zerlegt in Einheiten je
  Kachel — so ist die Mitte einer zwei Kacheln langen Wand eine Ecke, an die
  eine andere stoßen kann. `PortalWorld.standingWalls` liefert sie aus den
  stehenden Regalwänden, gerade und unter 45°.
- An jeder Ecke geht es in die Wand, die am weitesten **zum Raum hin**
  abbiegt. Draußen weiterlaufende Wände bleiben so draußen, und ein Stummel
  im Raum wird von beiden Seiten genommen.
- Schließt sich der Kreis, ist der Raum fertig; eine Wand ohne Nachbarn beendet
  diese Richtung.

## Bodenbeläge

Gewünscht: _„Ich will nun auch noch neben Tapeten vorratskisten für Boden
Beläge haben wollen für Räume. Z.B. den Küchen Boden oder prototype floor oder
für Gäste. Gleiches Prinzip."_

- **Dasselbe Prinzip wie die Tapete**: aus der Kiste oder aus dem Katalog
  (Ordner _Böden_, `FurnitureFolder.items`) in die Hand (`KitchenItem`
  `floor-*`), im Raum leuchten die Kacheln, `A` legt den Belag, und der in
  der Hand ist aufgebraucht.
- **Keine Ausnahme von der Regel**: Die Beläge sind die Platten aus dem Regal,
  die die Welten ohnehin legen. Gelegt wird über `GridWorld.floorPlate` — die
  Welt merkt sich je Kachel die Platte (`HausbauWorld.floors`, sonst der
  Prototyp-Boden) und baut den Boden neu (`GridWorld.rebuildFloor`, derselbe
  Weg wie nach jedem Umbau).
- **Welche Kacheln zum Raum gehören** (`roomTrace.roomTiles`): von der Kachel
  unter dem Spieler über jede Kante ohne Wand. Türen und Fenster sind auch
  hier Wände, der Boden bleibt also im Zimmer. Eine Kachel mit einer Wand unter
  45° gehört dazu, darüber hinaus geht es nicht. Mehr als 400 Kacheln sind kein
  Raum (`ROOM_TILES_MAX`): Im Freien leuchtet nichts, und `A` legt nichts.
- **Das Leuchten** ist das Gitter des Bauens (`portal/placeGrid.ts`) über den
  Kacheln des Raums.

## Treppen und Etagen

Gewünscht: _„Eine Treppe ist 2xL lang, wobei ich bei l glaube es es 6 sind
(siehe Test Navigation Welt oder sandbox) also eigentlich 8, damit ich bei der
Ebene darüber auf einem normalen Feld stehen kann. Die Treppe belegt aber nur 2
weniger, also da wo die Treppen Elemente stehen kann man nicht gehen, das
letzte 2x2 Feld ist der Stand der oberen Etage. Wenn ich eine Treppe platziere
kann ich auf die obere Etage eines Haus, auch wenn ich das Dach aus vr/First
Person und von oben nicht sehe, die oberen Ebenen, wenn ich im Haus bin. Von
außen sehe ich dann die Ebene des Hauses komplett. Ich kann damit beliebig viele
Ebene anlegen durch eine 2x8 Treppe."_

- **Gezählt in Zellen** (eine Kachel = 2 × 2): 2 × 8 Zellen sind eine Kachel
  breit und vier lang (`stairPlan.STAIR_TILES`). Drei Kacheln Stufen
  (`STAIR_STEPS`, 0,93 m je Kachel bei 2,8 m Etagenhöhe), die vierte ist der
  Stand oben — Boden der Etage darüber. Die Stufen sperrt der Plan von der Seite
  wie jede Treppe (`planeMove.flightSides`): hinauf nur von unten.
- **Nehmen** wie Tapete und Boden: aus der Treppenkiste oder dem Katalog
  (Ordner _Treppen_, Item `stair`).
- **Zeigen**: Die vier Kacheln vor einem, in Blickrichtung auf ein Viertel
  gerundet (`stairTiles`, `stairDir`), leuchten **grün**, wenn alle Boden sind
  und keine Treppe tragen, sonst **rot** (`PlaceGrid.tint`). Steht man in
  einem Zimmer, müssen sie darin liegen (`stairFits`). **Einen Raum braucht
  sie nicht** — gewünscht: _„Ich würde Treppen gerne setzen wollen, auch ohne
  einen Raum dafür haben zu müssen. Die sollen nur dafür da sein um die Ebenen
  zu wechseln."_
- **Stellen** (`A`, `HausbauWorld.placeStair`):
  - Gibt es die Etage darüber noch nicht, kommt sie dazu, eine Etagenhöhe
    (`STOREY`, 2,8 m) höher (`graph.levels`). Eine Treppe oben legt die nächste
    an — so viele, wie man will.
  - Ihr Boden liegt über dem **ganzen Haus** (`houseTiles`): dem Zimmer der
    Treppe und jedem, in das man durch eine Tür kommt, solange es geschlossen
    ist. Die Haustür führt ins Freie, und das Freie ist kein Zimmer.
  - Steht sie nicht in einem Zimmer (im Freien, oben ohne Wände), kommt auf
    der Etage darüber nur ihr Stand dazu.
  - Die Treppe baut der Plan (`GridPlan.stairs`, drei Kacheln): Stufen, das
    Loch darüber und die Verbindung für die Wege.
- **Im Haus sieht man die Etage darüber nicht**, draußen das ganze Haus:
  - Von oben schneidet die Kamera (`TopDownCamera`, `core/cutaway.ts`) — die
    Welt meldet draußen die oberste Etage als die, auf der man steht
    (`HausbauWorld.viewLevel`), dann ist nichts darüber.
  - Aus den Augen und in der Brille schneidet die Welt selbst (`cutAbove`),
    solange über der eigenen Kachel die Etage darüber Boden hat
    (`underRoof`).
  - Wände oben tragen ihre Etage (`userData.level`, `markWallLevels`) und
    stehen für sich (`looseWalls`), damit sie mit ihr verschwinden.
- Tapete und Boden gelten auf der Etage, auf der man steht (`wallsOn`, der
  Belag je Kachel **und** Etage).
- **Wände gehören der Etage, auf der man steht** — gemeldet nach dem ersten
  Obergeschoss: _„Wände werden immer auf der Etage gesetzt wo wir uns
  befinden"_ und _„einfach so tun, als wenn wir in der Luft bauen könnten"_.
  Gezogene Wände stehen deshalb **fest** auf dem Boden der Etage
  (`PortalWorld.buildFloorY`, in der Gitterwelt die Höhe von `rigLevel`, auch
  mitten auf der Treppe) und fallen nicht mehr: Vorher fielen sie über dem
  Loch der Treppe auf die Stufen (`y` 4,16 statt 4,2 in der Liste). Und eine
  Wand oben ersetzt nicht mehr die darunter auf derselben Fuge
  (`wallsUnder`, `WALL_STOREY_GAP`).
- **Seitlich von der Treppe** (`GridPlan.stepOffFlight`,
  `PhysicsLocomotion.walkDrop`): Aus der Mitte des Laufs fällt man nach dem
  Gitter auf die Etage der Treppe — vorher steckte die Kapsel mit dem Kopf im
  Boden der Etage darüber fest (`stuckAtStep`). Von der **letzten** Kachel
  Stufen geht es nach beiden Seiten auf die Etage darüber
  (`physics/stairStepOff.test.ts`).

## Die Tapete auf der Wand

**Die Ausnahme von „nur Modelle aus dem Regal"** ist ausdrücklich gewünscht:
Das Regal hat keine Backsteinfläche und keine Tapete. Eine Tapete ist deshalb
ein **Muster aus ein paar Zahlen** (`house/wallpaper.ts`,
`wallpaperPixels`, 64 × 64, ohne Leinwand — läuft auch im Test), und die Wand
bleibt das Modell aus dem Regal.

**Gezeichnet wird im Shader, je Seite** (`house/wallpaperSkin.ts`): Jedes Netz
der Wand bekommt einen Zwilling seines Materials, der auf Flächen, die zur
Vorderseite zeigen, das eine Muster zeichnet, auf denen zur Rückseite das
andere. Kanten, Oberseite und die Leibung einer Tür bleiben, wie sie sind —
darum braucht ein Fenster oder eine Tür keine eigene Form. Gemessen wird in
der Welt, längs der Wand und in der Höhe; zwei Stücke derselben Tapete stoßen
ohne Sprung aneinander. Ein Programm für alle Wände (`customProgramCacheKey`),
was sich unterscheidet, steht in den Uniforms.

Eine tapezierte Wand steht **für sich** (`PortalWorld.looseWalls`): Aus den
Augen bündelt die Welt ihre Stücke (`ModelBatch`), und das Bündel zeichnete sie
mit den Materialien des Regals.

## Offen

- **Gespeichert werden Tapete, Boden und Etagen noch nicht** und gehen auch
  nicht übers Netz: Nach dem Neuladen sind die Wände nackt, der Boden ist
  Prototyp, und Treppen und Etagen sind weg.
- Eine Treppe lässt sich noch nicht wieder abbauen.
- Oben gibt es erst Wände, wenn man sie zieht; über den Rand der Etage fällt
  man hinunter. Sie hängt am Stück — reißt man es ab
  oder ersetzt es, ist sie weg.
- Von oben blendet die Welt Wände vor der Figur durchsichtig
  (`grid/modelGhost.ts`); der durchsichtige Zwilling kennt die Tapete nicht.
- In der Brille ist es derselbe Weg (`A`, Blick der Hand), aber noch nicht
  ausprobiert.

## Was wo liegt

| Datei | Was |
| --- | --- |
| `worlds/house/HausbauWorld.ts` | die Welt: Katalog, Raum suchen, kleben, Wände bemalen |
| `worlds/house/housePlan.ts` | Boden, Haus, Kisten, Tor, Ankunft |
| `worlds/house/roomTrace.ts` | welche Wandseiten zu einem Raum gehören |
| `worlds/house/wallpaper.ts` | die Tapeten und ihre Muster |
| `worlds/house/wallpaperSkin.ts` | das Muster auf einer Seite des Modells, das Leuchten |
| `worlds/house/flooring.ts` | die Bodenbeläge (Platten aus dem Regal) |
| `worlds/house/stairPlan.ts` | die Treppe: Kacheln, Richtung, das Haus durch die Türen |
| `elements/elementCatalog.ts` | `WALLPAPER_CRATES`, `FLOORING_CRATES`, `FurnitureFolder.items` |
| `test/zones/kitchenRecipes.ts` | die Dinge `wallpaper-*` und `floor-*` |
