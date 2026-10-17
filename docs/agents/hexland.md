# Hexland

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

`#hexland`, eine Welt für sich (kein Ordner). Eine Landschaft aus
Sechseck-Kacheln legen, nach dem Vorbild von _Dorfromantik_. Gewünscht
(Oktober 2026), mit sechs Bildern aus _Dorfromantik_ dazu: _„Ich will mit den
hex tiles ein Spiel bauen also eine weitere Welt, die aber eben hey Tile
basiert ist. Baue sowas nach, dass ich in vr als auch von oben oder Handy eine
Welt aufbauen kann"_.

## Das Spiel

- **Ein Stapel, eine Kachel nach der anderen.** Am Anfang liegt eine
  Landkachel in der Mitte und 40 im Stapel. Gelegt wird nur an die Landschaft.
- **Sechs Kanten, jede mit einem Gelände**: Wiese, Wald, Dorf, Feld, Fluss,
  Weg. Wiese bis Feld sind **weich** — sie passen oder nicht, gelegt werden
  darf trotzdem. Fluss und Weg sind **hart**: Wasser an Wasser, Weg an Weg,
  sonst nicht. So laufen Flüsse und Wege zusammenhängend weiter.
- **Punkte**: 10 je passender Kante; eine rundum passende Kachel (sechs
  Nachbarn, alle passend) ist _perfekt_: +60 und eine Kachel zurück auf den
  Stapel.
- **Aufgaben**: Etwa jede sechste Kachel trägt eine (Wald, Dorf oder Feld).
  Beim Legen bekommt sie ein Ziel ein Stück über der Größe des Gebiets, zu dem
  sie gehört (gezählt in Kanten), und ein Schild darüber zeigt, wie viel noch
  fehlt. Erfüllt: +50 und fünf Kacheln. Ist das Gebiet ringsum zu, bevor es
  groß genug ist, ist sie verpasst.
- **Passt die oberste Kachel nirgends** (ein Fluss, für den es keine Mündung
  gibt), darf sie ausnahmsweise überall hin — das Spiel bleibt an keiner
  Kachel hängen. Wer sie nicht mag: _Menü → Hexland → Kachel unter den Stapel_.
- **Endlos legen** (Menü → Hexland): Der Stapel wird nie leer — einfach
  bauen. **Neues Spiel** leert das Brett.
- **Gespeichert wird nach jeder Kachel**, im Browser (`localStorage`,
  `hexland:board`). Wer wiederkommt, findet sein Brett.

## Bedienung — eine für alle drei Ansichten

- **Auf ein freies Feld zeigen**: Die oberste Kachel schwebt darüber, schon
  in der besten Drehung. Ein helles Sechseck darunter zeigt, wo sie landet;
  grüne und rote Striche an ihren Kanten, was zu den Nachbarn passt.
- **Auf die schwebende Kachel zeigen**: weiterdrehen — nur durch die
  Drehungen, die dort gehen (Fluss und Weg).
- **Auf das grüne ✓ darüber zeigen**: legen. Darüber steht die Zeile mit
  Punkten, Stapel und der Aufgabe der Kachel (in der Brille und aus den
  Augen; von oben steht beides in der Leiste unten).
- **In der Brille** ist „zeigen" der Strahl mit Trigger oder `A`
  (`core/Pointer.ts`). Beim Aufsetzen geht sofort der **Weltbau** an
  (`core/buildFlight.ts`), und zwar die Art, die **skaliert**
  (`PlayerRig.flightScales`, `buildFlight.flightScaleStep`): Man sieht die
  Welt von oben wie ein Modell, der linke Stick fliegt, der rechte Stick
  **vor macht das Gestell größer** (die Welt kleiner), **zurück kleiner** (die
  Welt größer, bis die Häuser doppelt so groß sind wie am Boden, Maß 0,5 …
  60), quer dreht er. Gewünscht: _„In vr will ich die Welt lieber von oben
  weiter sehen bzw. wie bei der Stadt durch hoch und runter fliegen die Welt
  größer bzw. kleiner skalieren."_ Der Strahl reicht mit dem Maß mit. Wer den
  Weltbau im Menü ausschaltet, steht am Boden und läuft; bis zum nächsten
  Aufsetzen bleibt das so. Andere Welten fliegen im Weltbau wie bisher (Maß
  10, rechter Stick hebt).
- **Am Schirm von oben gibt es keine Figur.** Gewünscht: _„bei von oben
  brauche ich keinen Spieler Charakter sondern kann direkt tiles auf die Welt
  legen und drehen lassen über Buttons. Auf pc mit wasd und Mausrad"_. Die
  Figur ist unsichtbar und nur noch der Punkt, dem die Kamera folgt
  (`HexlandWorld.fitView`):
  - **Bild schieben**: WASD (so schnell, wie die Kamera weit weg ist —
    `PlayerRig.pace`), oder mit Maus/Finger ziehen (`panBy`). **Zoomen**:
    Mausrad, zwei Finger.
  - **Legen**: Feld antippen oder anklicken (Vorschau dorthin), Kachel
    antippen (drehen). Unten steht eine **Leiste** mit Punkten, Stapel,
    ⟲, ✓ Legen und ⟳. Tasten: `Q` dreht links, `R`/`E` rechts, Leertaste
    legt — `Q` dreht hier also nicht das Bild, die Leertaste springt nicht.
  - Am Handy sind die Stöcke weg (`touchStick(false)`); ein kurzer, ruhiger
    Tipp ist „zeigen", alles andere schiebt oder zoomt.
  - Die Welt hört dafür selbst auf die Leinwand (`listenToScreen`) — von oben
    zeigt kein Strahl (`Pointer.topDown`).
- **Aus den Augen** zielt die Bildmitte, wie bei jedem Strahl am Schirm; die
  Figur ist dort wieder da.

## Wie es gebaut ist

- **Die Regeln** (`hexland/hexRules.ts`, ohne three.js): Koordinaten
  (axial, Pointy-Top — Kante `i` zeigt nach `i · 60°` von +x Richtung +z),
  die Grundkacheln, der Stapel (`drawTile`, mit eigenem Würfel), Passen,
  Punkte, Gebiete (Union-Find je Gelände) und Aufgaben, Speichern.
- **Die Grundkacheln** kommen aus dem Regal (`medieval-hexagon/tiles`), und
  welche ihrer Kanten Wasser und Weg sind, ist **ausgemessen** (von oben
  gerendert, an jeder Kantenmitte die Farbe; `BASE_TILES`). Land ist
  `hex_grass`, Flüsse `hex_river_A…F`, Wege `hex_road_A…F` und `M` (Sackgasse),
  Kreuzungen `hex_river_crossing_A/B`, Seen `hex_water` und die Ufer
  `hex_coast_B…D`. **Alles ebenerdig**: Die Kacheln des Regals sind modelliert
  (Flussbett −0,1, Seen und Ufer −0,2, eine Fase an jeder Kante −0,05). Für
  Hexland wird ihre Oberseite plattgedrückt (`hexView.flatTop`, alles über
  −0,25 auf 0, Normalen nach oben) — Wasser ist dann nur noch blau gemalt,
  und das Brett ist eine Fläche ohne Stufen und Fugen. Gewünscht: _„Die hex
  tiles sollen nicht unterschiedlich hoch sein sondern eine grade Fläche
  ergeben"_, dann _„Ne keine Stufen, alles eben erdig bitte"_. Die Flussgabeln mit vier und mehr Armen (`G…L`) sind nicht
  im Stapel — sie wären kaum je anzulegen.
- **Die Ausstattung** (`hexland/hexDressing.ts`, ohne three.js): Jede Kante hat
  ihr Dreieck der Kachel, und dort steht, was zu ihrem Gelände gehört — eine
  Baumgruppe, zwei Häuser, ein Kornfeld (`building_grain`), auf Wiese
  manchmal ein Baum oder Stein. Eine Landkachel aus einem einzigen Gelände
  bekommt das große Stück: ganzer Wald, ganzes Feld mit Mühle, Dorfring mit
  Kirche oder Markt. Gewürfelt mit dem Samen der Kachel, also immer gleich.
- **Gezeichnet in Bündeln** (`hexland/hexView.ts`): ein `InstancedMesh` je Netz
  des Regals, egal wie oft es steht — ein Brett mit hundert Kacheln wären
  sonst tausend Zeichenaufrufe (`performance.md`). Die schwebende Kachel ist
  eine einzelne Gruppe.
- **Kein Spielelement, mit Absicht.** Die Regel _Möbel als Spielelement_ gilt
  für Möbel und Stationen; Hexland-Kacheln sind das Spielbrett. Nichts darauf
  sperrt eine Zelle, man läuft über das Dorf wie über eine Modellbahn.
- **Der Boden trägt, aber man sieht ihn nicht**: Die Welt ist eine
  `FurnishedWorld` mit einem Boden von 240 × 240 m (`FIELD`), dessen Material
  unsichtbar ist. Die Kacheln liegen mit der Oberseite genau darauf, die rosa
  Fläche ringsum 3 cm darunter — das Brett liegt ebenerdig und schwebt nicht
  mehr (bis Oktober 2026 eine halbe Kachelhöhe darüber, wie in
  _Dorfromantik_).

## Offen

- **Zusammen spielen**: Das Brett ist lokal; zwei Spieler sehen jeder ihr
  eigenes.
- **Mehr Gelände**: Schienen (gibt es im Regal nicht), Gebirge
  (`mountain_*`, `hills_*` liegen bereit).
- **Die nächste Kachel** sieht man noch nicht — nur die oberste.
