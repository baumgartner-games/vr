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

- **Gespeichert wird die Tapete noch nicht** und geht auch nicht übers Netz:
  Nach dem Neuladen sind die Wände nackt. Sie hängt am Stück — reißt man es ab
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
| `elements/elementCatalog.ts` | `WALLPAPER_CRATES`, `FurnitureFolder.items` |
| `test/zones/kitchenRecipes.ts` | die Dinge `wallpaper-*` |
