# Modelle: Herkunft und Lizenz

In diesem Ordner liegen **fremde Arbeiten**. Die meisten stehen unter
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/): kommerzielle Nutzung
ist erlaubt, **Namensnennung ist Pflicht**. Diese Datei ist diese Nennung —
und deshalb bleibt sie, wo sie ist, auch wenn sie sonst niemand liest.

Eine steht unter [CC0](https://creativecommons.org/publicdomain/zero/1.0/) und
verlangt gar keine Nennung. Sie steht trotzdem hier: Diese Datei ist die
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
dreizehn Möbeln sind **fünf Knoten** übrig, 233 KB statt 480. Küchenzeile,
Herde, Spüle, Arbeitstisch, Schneidebrett, Ausgabe und Tellerausgabe kommen
heute aus `diner.glb`; hier liegen nur noch der **Mülleimer**, die
**Ausgabetheke**, das **Ausgaberegal** und zwei **Geräte**: die **Pfanne**
(ohne ihren Herd, weil an ihr die Bratregeln hängen) und der **Feuerlöscher**
(ohne seinen Hocker, der ebenfalls durch eine Arbeitsplatte aus `diner.glb`
ersetzt ist). Die Liste steht im Werkzeug, nicht nur im Ergebnis.

## `diner.glb` — der zweite Möbelkatalog

> This work is based on ["Restaurant Bits"](https://kenney.nl/assets/restaurant-bits)
> by [Kenney](https://kenney.nl) — released under
> [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain;
> Namensnennung nicht verlangt, siehe oben, warum sie trotzdem hier steht).

Aufbereitet mit `tools/diner-model.mjs`: aus 225 Einzeldateien (5,8 MB, je eine
`.gltf` und eine `.bin`) wird **eine** Datei mit 156 Knoten — ein Material, eine
Textur, 88 234 Dreiecke, 1,10 MB. Draußen bleiben 69 Stücke: Pizzen, Eintöpfe,
das Eis-Zubehör und dreißig Zutaten, für die es kein Rezept gibt. **Zehn
Zutaten kommen mit** (`KEEP_FOOD`): Brötchen ganz, als Boden und als Deckel,
das Patty roh, gebraten und verbrannt, Salat und Tomate je ganz und
geschnitten. Sie sind seit dem Umbau das Essen **beider** Küchen — die erste
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

## Nicht hier, aber aus demselben Grund erwähnt

`public/controllers` enthält die Controller-Modelle der
[Immersive Web Community Group](https://github.com/immersive-web/webxr-input-profiles)
(MIT, siehe Ordner). Sie waren die ersten Modelldateien im Projekt und der
Grund, warum es überhaupt einen Lader gibt (`core/ControllerModels.ts`).
