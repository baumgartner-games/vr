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

Zwei Modi, jeder mit seinem eigenen Brett (`localStorage`: `hexland:game`,
`hexland:creative`, welcher gerade gilt: `hexland:mode`). Umgeschaltet wird im
Reiter _Hexland_ (unten).

### Partie — wie _Dorfromantik — Das Brettspiel_

Gewünscht: _„Wie wäre es einfach ein Dorf Romantik Klon zu machen mit 3
aktiven Missionen und einer festen Anzahl an normalen Karten. Die hex tiles
sollten auch so sein. Und Punkte berechnen wie im Brett Spiel"_.

- **40 normale Kacheln** (`NORMAL_TILES`), eine Landkachel liegt in der Mitte.
  Ist der Stapel leer, ist die Partie vorbei.
- **Immer drei Aufträge offen** (`OPEN_TASKS`): Liegen weniger als drei offene
  auf dem Brett, kommt statt einer normalen eine **Auftragskachel** — sie zählt
  nicht vom Stapel ab. Ihr Auftrag gilt einem ihrer Gelände (Wald, Dorf, Feld,
  Fluss oder Weg) und bekommt beim Legen eine Zahl (3 bis 6, bei Fluss und Weg
  bis 7, immer größer als das Gebiet schon ist). Das Gebiet soll **genau** so
  viele Kacheln groß werden: dann ist die Zahl verdient; wächst es darüber,
  ist der Auftrag verpasst. Über der Kachel steht ein Schild „4 / 6".
- **Flaggen**: Etwa jede achte normale Kachel trägt eine Flagge (Modell
  `flag_*` aus dem Regal, grün Wald, rot Dorf, gelb Feld). Ein Gebiet mit
  Flagge, das ringsum **geschlossen** ist, zählt seine Kacheln.
- **Längster Fluss, längster Weg**: je Kachel ein Punkt.
- **Wertung** (`HexBoard.scoring`) = Aufträge + Flaggen + Fluss + Weg, jederzeit
  im Reiter zu sehen. Passende Kanten bringen keine Punkte (wie im Brettspiel),
  helfen aber, Gebiete wachsen zu lassen; die Vorschau zeigt sie grün und rot.
- **Die Kacheln** sind wie im Brettspiel: meist zwei Gelände, oft eines,
  selten drei, wenig bloße Wiese (`drawTile`).
- **Fluss und Weg müssen weiterlaufen** — Wasser an Wasser, Weg an Weg. Passt
  eine Kachel nirgends, darf sie ausnahmsweise überall hin.
- Gezählt wird in **Kacheln**: Alle Kanten desselben Geländes auf einer Kachel
  gehören zu einem Gebiet (eine Vereinfachung gegenüber dem Brettspiel, die
  man an keiner Kachel sieht).

### Kreativ-Modus

Kein Stapel, keine Wertung. Im Reiter _Hexland → Kachel-Katalog_ (21 Kacheln,
`catalogue`: jedes Gelände ganz, halb und halb, drittel, Flüsse und Wege in
jeder Form, See, Ufer, Brücke, Sackgasse) sucht man die nächste Kachel aus; sie
bleibt in der Hand, bis man eine andere wählt (jede mit neuer Deko).
Gewünscht: _„zwischen Creative Modus wechseln, wo ich dann einen Hex-Katalog
habe und mir das nächste Tile aussuchen kann"_.

### Der Reiter _Hexland_

Die Welt bringt einen **eigenen Reiter** mit (`World.menuTab`, neu im Kern):
ganz vorn, und aufgeschlagen, wenn man die Welt betritt (`App.refreshMenu`,
`worldTabFresh`). Darin: Punkte mit allen Posten, Stapel und offene Aufträge,
_Neue Partie_, der Schalter _Kreativ-Modus_, im Kreativ-Modus der Katalog und
_Kreatives Brett leeren_, sonst _So wird gewertet_.

## Bedienung — eine für alle drei Ansichten

- **Auf ein freies Feld zeigen**: Die oberste Kachel schwebt darüber, schon
  in der besten Drehung. Ein helles Sechseck darunter zeigt, wo sie landet;
  grüne und rote Striche an ihren Kanten, was zu den Nachbarn passt.
- **Auf die schwebende Kachel zeigen**: weiterdrehen — nur durch die
  Drehungen, die dort gehen (Fluss und Weg).
- **Auf das grüne ✓ darüber zeigen**: legen. Darüber steht die Zeile mit
  Punkten, Stapel und dem Auftrag der Kachel (in der Brille und aus den
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
- **Was die neue Kachel ist**, sieht man dreifach: Sie schwebt über ihrem Feld,
  ein gelber Ring pulsiert darum, und unten in der Leiste steht sie als
  Bildchen (`hexIcon.ts`) — jede Kante in ihrer Farbe, Fluss und Weg als Band,
  der Auftrag als Kreis mit Zahl, gedreht wie sie liegen wird und wie das Bild
  gedreht ist. Gewünscht: _„Dann soll erkennbar sein was das neue Tile ist."_
- **Am Schirm von oben gibt es keine Figur.** Gewünscht: _„bei von oben
  brauche ich keinen Spieler Charakter sondern kann direkt tiles auf die Welt
  legen und drehen lassen über Buttons. Auf pc mit wasd und Mausrad"_. Die
  Figur ist unsichtbar und nur noch der Punkt, dem die Kamera folgt
  (`HexlandWorld.fitView`):
  - **Bild schieben**: WASD (so schnell, wie die Kamera weit weg ist —
    `PlayerRig.pace`), oder mit Maus/Finger ziehen (`panBy`). **Zoomen**:
    Mausrad, zwei Finger auseinander und zusammen.
  - **Zwei Finger** (`twoFingers`): gemeinsam hoch oder runter **neigt** das
    Bild (hoch ist flacher, 20–90°), gegeneinander kreisen **dreht** es
    stufenlos (`TopDownCamera.twist`, `WorldContext.topDownView.twist/tilt`).
    Gewünscht: _„mit zwei Fingern gedrückt hoch und runter ändert die
    Neigung. Zwei Finger entgegengesetzt, einer hoch der andere runter,
    rotiert die Kamera-Ansicht."_
  - **Aufgeräumt**: Werkzeugknopf (Hand), _Verbindung_, Vollbild und _VR / Von
    oben_ sind in dieser Welt weg (`CLEAN_CLASS`) — gewünscht: _„Der Hand
    Button kann weg und oben die Verbindung und VR-Button/Von oben"_. Alles
    davon bleibt im Menü erreichbar.
  - **Legen**: Feld antippen oder anklicken (Vorschau dorthin), Kachel
    antippen (drehen). Unten steht eine **Leiste** mit dem Bildchen
    der Kachel, Punkten, Stapel und offenen Aufträgen, ⟲, ✓ Legen und ⟳. Tasten: `Q` dreht links, `R`/`E` rechts, Leertaste
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
  Wertung, Gebiete (Union-Find je Gelände, in Kacheln), Aufträge, Katalog, Speichern (Format 2).
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
