# Modelle: Herkunft und Lizenz

In diesem Ordner liegen **fremde Arbeiten**. Die meisten stehen unter
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/): kommerzielle Nutzung
ist erlaubt, **Namensnennung ist Pflicht**. Diese Datei ist diese Nennung —
und deshalb bleibt sie, wo sie ist, auch wenn sie sonst niemand liest.

Drei stehen unter [CC0](https://creativecommons.org/publicdomain/zero/1.0/) und
verlangen gar keine Nennung. Sie stehen trotzdem hier: Diese Datei ist die
**Herkunftsliste** und nicht nur die Lizenznennung. Wer in einem Jahr wissen
will, woher ein Modell kommt und ob man es weitergeben darf, sieht hier nach —
und eine Liste, in der die CC0-Dateien fehlen, beantwortet die Frage nicht,
sondern verschweigt sie.

Wer ein weiteres Modell aufnimmt, trägt es hier ein, **bevor** er es einbaut.
Eine Datei ohne Zeile in dieser Liste ist eine Datei ohne Lizenz.

## `chef.glb` — die Spielfigur

> This work is based on
> ["Little Chef (Overcooked like)"](https://sketchfab.com/3d-models/little-chef-overcooked-like-9d90b46796b4471687a350c0c1f6f556)
> by [marcelosants](https://sketchfab.com/marcelosants) licensed under
> [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/)

Aufbereitet mit `tools/chef-model.mjs`: 550 604 → 8 260 Dreiecke, zerlegt in
Mütze, Kopf, Rumpf und zwei Hände, auf 1,6 m gestellt. Die Quelle (23 MB) liegt
**nicht** im Repository — was von ihr bleibt, sind 160 KB.

## `kitchen.glb` — was vom ersten Katalog blieb

> This work is based on
> ["Overcooked Kitchen Assets (Fan Art)"](https://sketchfab.com/3d-models/overcooked-kitchen-assets-fan-art-ec99c64c346347a89454f569054ddb86)
> by [Arun Kumar S](https://sketchfab.com/arun-kumar) licensed under
> [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/)

Aufbereitet mit `tools/kitchen-model.mjs`: eine Schauraum-Szene, zerlegt in
einzeln platzierbare Möbel, Texturen verkleinert.

**Und seitdem zusammengestrichen** (`tools/kitchen-model.mjs --trim`): Von den
dreizehn Möbeln sind **vier Knoten** übrig, 193 KB statt 480. Küchenzeile,
Herde, Spüle, Arbeitstisch, Schneidebrett, Ausgabe und Tellerausgabe kommen
heute aus `diner.glb`, der **Feuerlöscher** aus `mixedbag.glb`; hier liegen nur
noch der **Mülleimer**, die **Ausgabetheke**, das **Ausgaberegal** und **ein**
Gerät: die **Pfanne**, ohne ihren Herd, weil an ihr die Bratregeln hängen. Die
Liste steht im Werkzeug, nicht nur im Ergebnis.

## `diner.glb` — der zweite Möbelkatalog

> This work is based on ["Restaurant Bits"](https://kenney.nl/assets/restaurant-bits)
> by [Kenney](https://kenney.nl) — released under
> [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain;
> Namensnennung nicht verlangt, siehe oben, warum sie trotzdem hier steht).

Aufbereitet mit `tools/diner-model.mjs`: aus 225 Einzeldateien (5,8 MB, je eine
`.gltf` und eine `.bin`) wird **eine** Datei mit 156 Knoten — ein Material, eine
Textur, 87 978 Dreiecke, 1,09 MB. Draußen bleiben 69 Stücke: Pizzen, Eintöpfe,
das Eis-Zubehör und dreißig Zutaten, für die es kein Rezept gibt. **Zehn
Zutaten kommen mit** (`KEEP_FOOD`): Brötchen ganz, als Boden und als Deckel,
das Patty roh, gebraten und verbrannt, Salat und Tomate je ganz und
geschnitten. Von der geschnittenen Tomate ist es **eine** Scheibe
(`food_ingredient_tomato_slice`, 220 Dreiecke) und nicht der Dreierstapel
(`…_tomato_slices`, 476): Auf einem Burger liegt eine, und drei übereinander
machten aus jeder Tomate einen Turm. Zusammen wiegen die zehn 2 722 Dreiecke.
Sie sind seit dem Umbau das Essen **beider** Küchen — die erste
baute es bis dahin aus Zylindern (`worlds/test/zones/kitchenProps.ts`). Die
Geometrie ist quantisiert und mit
`EXT_meshopt_compression` gepackt (roh wären es 3,1 MB); die Textur ist eine
Farbtafel von 1024 px und bleibt in voller Größe, verlustfrei als WebP —
verkleinert mischt ihr Filter an den Feldgrenzen Farben, die es im Atlas nicht
gibt. Die Quelle liegt **nicht** im Repository.

Aufgestellt wird sie in `worlds/test/zones/diner.ts`, vermessen in
`core/dinerFit.ts`. Aus derselben Datei kommen auch die Möbel der **ersten**
Küche (`core/kitchenFit.ts`, `KitchenPiece.base`) und ihre Zutaten
(`worlds/test/zones/kitchenProps.ts`, `FOOD_NODE`).

## `mixedbag.glb` — die Wundertüte

> This work is based on ["KayKit - Mixed Bag 1"](https://kaylousberg.itch.io/mixed-bag-1)
> by [Kay Lousberg](https://kaylousberg.itch.io) — released under
> [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain;
> „Free for personal and commercial use, no attribution required" — warum die
> Zeile trotzdem hier steht, siehe oben).

Aufbereitet mit `tools/mixedbag-model.mjs`: aus 59 Einzeldateien (2,6 MB, je
eine `.gltf` und eine `.bin`) wird **eine** Datei mit 59 Knoten — 51 412
Dreiecke, 600 KB, ein Farbstreifen-Atlas von 1024 px (verlustfrei als WebP) und
zwei Materialien. Das zweite ist **Glas** und hat keine Textur: die Kuppel des
Kaugummiautomaten, die drei Slush-Tanks, die Wasserflasche B. Die
Platzhalterflächen der Quelle — fünf Stücke, auf deren Textur „replace this
with your own" steht — bekommen statt dessen eine UV auf ein dunkles Feld des
Atlas. Die Geometrie ist quantisiert und mit `EXT_meshopt_compression` gepackt;
die Quelle liegt **nicht** im Repository.

Gebraucht wird daraus bisher **ein** Stück: der **Feuerlöscher** der ersten
Küche (`core/kitchenFit.ts`, `extinguisher`). Der Rest ist ein Katalog auf
Vorrat, vermessen in `core/mixedbagFit.ts`.

## `kaykit/` — die gekaufte Sammlung

> This work is based on
> ["The Complete KayKit Collection v7"](https://www.kaylousberg.com)
> by [Kay Lousberg](https://www.kaylousberg.com) — released under
> [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain;
> „This content is free to use in personal, educational and commercial
> projects", Namensnennung nicht verlangt — warum die Zeile trotzdem hier steht,
> siehe oben).

**Gekauft**, und das ist der Unterschied zu allem anderen in diesem Ordner: Die
Sammlung kostet Geld, die 23 Pakete darin stehen danach unter CC0. Der Wortlaut
der Lizenz liegt deshalb nicht nur hier, sondern **im Ordner selbst** —
`kaykit/LICENSE.txt` und noch einmal in jedem der 23 Paketordner, damit ein
Paket seine Lizenz auch dann dabei hat, wenn es jemand einzeln weitergibt.
Daneben steht `kaykit/README.md` und sagt dasselbe auf Deutsch.

Aufbereitet mit `tools/kaykit-model.mjs`: aus 4 470 der 4 492 Quelldateien
(154 MB `.gltf` + `.bin` + `.glb`) werden **4 470** einzelne `.glb` mit 50,8 MB
— quantisiert und mit `EXT_meshopt_compression` gepackt, 67 % weniger. Dazu
kommen 6,2 MB Texturen: 153 Bilder, je Paket einmal und **außerhalb** der
Modelle, verlustfrei als WebP, wo das kleiner ist als das PNG der Quelle.
Zusammen **57 MB** in 4 648 Dateien. Verkleinert wurde dabei kein einziges
Bild — auch die 80 Wappen der Brettspielkiste nicht, die allein 5,0 MB wiegen.

Draußen bleiben die 994 MB `.blend`, `.fbx`, `.obj` und `.mtl`, die
Unity-Varianten, die Vorschaubilder, das Handbuch — und **22 Kopien der
Animationsbibliothek**: Sieben Pakete liefern denselben Ordner `Animations/`
mit byteweise denselben Dateien, und ausgeliefert wird er nur von _Character
Animations_, dem Paket, das nichts anderes **ist** als diese Bibliothek. Die
Rohsammlung selbst liegt **nicht** im Repository.

**Und `mixedbag.glb` bleibt, wie es ist.** Die _Mixed Bag 1_ ist eines der 23
Pakete und liegt seitdem zweimal hier: einmal gebündelt als `mixedbag.glb`
(59 Knoten, 600 KB) und einmal als 59 einzelne Dateien in `kaykit/mixed-bag/`
(0,8 MB). Das ist kein Versehen. An der gebündelten Datei hängt der
**Feuerlöscher** der ersten Küche — `core/mixedbagFit.ts` beschreibt alle 59
Stücke im Spielmaß, `core/mixedbagModel.ts` lädt sie, und ein Jest-Test hält die
Maße fest. Der Regal-Ordner dagegen ist zum **Blättern** da: eine Datei je
Stück, ohne Katalog und ohne nachgemessene Hülle. Wer die 600 KB sparen will,
muss vorher den Katalog auf Einzeldateien umbauen — das ist eine Arbeit an
`mixedbagFit.ts` und nicht eine an diesem Ordner. 600 KB sind dafür der falsche
Anlass.

## Nicht hier, aber aus demselben Grund erwähnt

`public/controllers` enthält die Controller-Modelle der
[Immersive Web Community Group](https://github.com/immersive-web/webxr-input-profiles)
(MIT, siehe Ordner). Sie waren die ersten Modelldateien im Projekt und der
Grund, warum es überhaupt einen Lader gibt (`core/ControllerModels.ts`).
