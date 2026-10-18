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
  nicht vom Stapel ab. In der normalen Runde gibt es **12 Auftragskacheln**
  (`QUEST_TILES`, `HexBoard.tasksLeft`, im Speicher als `tasks`); Leiste und
  Reiter zeigen, wie viele noch kommen (_„wie viele Aufträge es noch geben
  könnte und wie viele Spielplan-Tiles"_). Im unendlichen Spiel ohne Ende. Ihr Auftrag gilt einem ihrer Gelände (Wald, Dorf, Feld,
  Fluss oder Weg) und hat **schon beim Ziehen** seine Zahl: 4, 5 oder 6
  (`QUEST_TARGETS`). Man sieht ihn vor dem Legen — als Schild „Weizen 4"
  über der schwebenden Kachel, in der Leiste und als Zahl im Bildchen.
  Die Schilder (`hexBadge.QuestBadge`) tragen vorn das Gelände als farbiges
  Sechseck und daneben groß Art und Zahl („Stadt 2 / 5", „Fluss 4 / 6") —
  gewünscht: _„erkenne ich zwar wie viele, aber nicht was gemacht werden soll
  … ‚Stadt: 5', ‚Fluss: X', ‚Weizen: X' … ein kleines Icon"_. Seitdem heißen
  Dorf und Feld im Spiel **Stadt** und **Weizen** (`TERRAIN_LABEL`). Die Schilder liegen
  **immer über allem** (ohne Tiefenprüfung, `renderOrder` 8) — vorher
  verschwanden sie hinter hohen Bäumen (_„Bitte immer darüber setzen."_);
  „✓ Legen" und die Zeile darüber ebenso (`TextPlane` mit `front`). Und die
  schwebende Kachel wird von oben nicht mehr durchsichtig: Sie trägt
  `KEEP_SOLID`, sonst hielte das Ghosting die unsichtbare Figur unter ihr frei.
  Gewünscht: _„Es muss bei einem Auftrags-Plättchen vor dem Legen erkennbar
  sein, welcher Auftrag es ist (Stadt 4 z.B.)… immer 3 Aufträge mit entweder
  4, 5, 6 benötigten Feldern"_. Das Gebiet soll **genau** so viele Kacheln groß
  werden: dann ist die Zahl verdient; wächst es darüber, ist der Auftrag
  verpasst. Gewertet wird **beim Legen**: Ist das Gebiet in diesem
  Augenblick genau so groß, ist der Auftrag erfüllt und bleibt es, auch wenn
  das Gebiet danach weiterwächst — _„Es muss nur zum Bewertungszeitpunkt
  erfüllt sein."_ (Ein Versuch, ihn bei Weiterwachsen wieder zu entziehen,
  stand einen Commit lang drin und ist wieder raus.) Über der gelegten Kachel steht ein Schild „4 / 6".
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

Kein Stapel, keine Wertung. Die nächste Kachel kommt aus drei Quellen; sie
bleibt in der Hand, bis man eine andere wählt (jede mit neuer Deko):

- **Hexland → Kachel-Katalog → Kacheln**: 21 fertige (`catalogue`: jedes
  Gelände ganz, halb und halb, drittel, Flüsse und Wege in jeder Form, See,
  Ufer, Brücke, Sackgasse).
- **Hexland → Kachel-Katalog → Kachel bauen** (`builderMenu`): zuoberst die
  Kachel, wie sie ist, darunter ihre sechs Stücke (_Rechts_, _Unten rechts_
  … — das Stück im Bild hervorgehoben). Ein Tipp auf ein Stück fragt, was
  dorthin soll: Dorf, Wald, Feld, Wiese, Fluss, Weg. _In die Hand nehmen_
  sucht im Regal die Grundkachel, deren Wasser und Wege genau so liegen
  (`hexRules.matchBase`, mit Drehung; dafür stehen die Fluss- und Weggabeln
  `G…L` mit Gewicht 0 in `BASE_TILES` — nie im Stapel, aber baubar). Gibt es
  keine (ein Fluss mit einem Arm, Fluss und Weg durcheinander), steht dort
  _Gibt es so nicht_. Gewünscht: _„ein Hex-Tile in der Mitte sehen und auf
  die einzelnen Stücke klicken … Das Spiel schaut dann in seinem Katalog,
  welches Plättchen dafür passt."_
- **Die Schnellliste** am Schirm über der Leiste (`fillQuick`, `QUICK_TILES`):
  Dorf, Wald, Feld, Wiese, Flüsse, Wege, See, halbe Kacheln — und vorn, was
  zuletzt gebaut wurde. Gewünscht: _„in der Welt eine Schnellliste … mit
  Default-Tiles, die häufig gebraucht werden"_. In der Brille gibt es sie
  (noch) nicht, dort bleibt der Katalog im Menü.
Gewünscht: _„zwischen Creative Modus wechseln, wo ich dann einen Hex-Katalog
habe und mir das nächste Tile aussuchen kann"_.

### Spielmodus

Drei Kreise in einem Block im Reiter (`modeRows`, `MenuEntry.radio`):
**Normale Runde** (40 Kacheln), **Unendliches Spiel** (dieselben Regeln und
dieselbe Wertung, der Stapel füllt sich immer nach, `HexMode` `endless`) und
**Kreativ-Modus**. Jede Zeile öffnet die Frage _Weiterspielen_ (mit dem, was im
Speicher dieses Modus liegt) oder _Neu starten_. Jeder Modus hat sein eigenes
Brett (`hexland:game`, `hexland:endless`, `hexland:creative`). Gewünscht:
_„Beim Spielmodus will ich auch eine Select-Option haben: normale Runde,
unendliches Spiel, Creative Modus. Und beim Wechsel wird man gefragt, weiter
spielen oder neu starten."_

### Spielhilfen

Im Reiter _Hexland → Spielhilfen_, gemerkt im Browser (`hexland:help`), ab Werk
aus bzw. _In der Nähe_.

- **Kachel vordrehen** (Schalter): Ein Tipp auf ein Feld legt die Kachel gleich
  in die Drehung, die dort am besten passt (`bestRotation`: Aufträge zuerst,
  dann Kanten; bei Gleichstand bleibt die jetzige). Aus: Die Drehung des
  Spielers bleibt.
- **Felder einfärben** (Schalter, `slotColour`): gold, wo die Kachel einem
  Auftrag hilft, ohne einen anderen unmöglich zu machen; grün, je kräftiger,
  desto mehr Kanten passen; **orange**, wo jede Lage einen Auftrag
  unerfüllbar machen würde; rötlich, wo sie gar nicht liegen darf.
- **Passende Kanten als Zahl** (Schalter, `drawDigits`): auf jedem freien Feld,
  wo sie liegen darf, die Ziffer 0–6 — wie viele Kanten bestenfalls passen,
  flach am Boden und zum Bild gedreht (ein Bündel je Ziffer). Rot bleibt rot.
  Gewünscht: _„dass man bei der Anzeige wählen kann, kräftigere Farbe und
  oder Zahlen darin"_.
- **Wo die neue Kachel liegt** — drei Kreise in einem Block (`autoPlace`),
  immer gemessen von der **zuletzt gelegten** (`lastPlaced`):
  - _In der Nähe_: das nächste freie Feld daneben, in der Drehung des Spielers
    (wenn sie dort passt).
  - _An passender Grenze_: wo die meisten Kanten passen, schon gedreht; ein
    Auftrag, der dort genau fertig würde, wiegt wie zwei passende Kanten.
  - _Intelligent_ (unten): erst nach den Aufträgen, sonst nach passenden
    Kanten, schon gedreht. Für die Aufträge rechnet `HexBoard.assess` die Lage
    durch, als läge die Kachel schon: wie viel offene Aufträge wachsen, ob
    einer **genau** seine Zahl erreicht, wie nah die übrigen ihrer Zahl kommen
    (`closer`, Größe durch Zahl) — und ob einer **unerfüllbar** würde
    (Gebiet größer als die Zahl, ringsum geschlossen vor der Zahl, oder zwei
    Aufträge mit verschiedenen Zahlen im selben Gebiet; der eigene Auftrag der
    Kachel zählt mit). So eine Lage schlägt keine Hilfe mehr vor, auch _An
    passender Grenze_ und _Kachel vordrehen_ nicht. Gemeldet war: _„Einige
    Empfehlungen würden dazu führen, dass ich die Aufträge niemals schaffen
    könnte."_ Nachgerechnet über 20 Runden: nur nach Kanten 50 Aufträge
    verpasst und 84 erfüllt, mit `assess` 0 verpasst und 157 erfüllt.
    Reihenfolge in `questScore`: fertig (60) vor nah dran (20 × Größe/Zahl)
    vor bloßem Wachstum (5 je Kachel) — gewünscht: _„Bei dem Vorschlag sollte
    ggf. auch dort vorgeschlagen werden, wo Aufträge am ehesten beendet
    werden."_
    Gewünscht: _„Bei einem Auftrag und an einer passenden Grenze muss sich
    nicht ausschließen … ‚intelligent' nennen und nach unten packen."_
- **Die Auswahlen sind Kreise, kein Schieber**, und stehen als Block ohne
  Lücke (`MenuEntry.radio`, neu im Menü am Schirm und in der Brille).

### Kamera und Bildrate

- **Nach dem Legen fliegt die Kamera zur neuen Kachel** (`stepFlight`): in
  fester Zeit (`FLIGHT_SECONDS`, 0,8 s), kubisch ein und aus — langsam an,
  schnell, sanft ab. Wer selbst schiebt, hält den Flug an. Gewünscht:
  _„smoothe Bewegung (Kurve bei Beschleunigung), langsame Geschwindigkeit zu
  Anfang, dann schnell, dann abbremsen. Aber in einer festen Zeit."_
- **Bildrate im Bild** steht auch im Reiter — derselbe Schalter wie unter
  _Grafik_ (`showFps`); das Feld steht jetzt überall oben rechts, in Hexland
  ganz oben (die Knopfreihe fehlt dort).
- **Pinch überall**: Zwei Finger zoomen jetzt auf dem ganzen Schirm außerhalb
  der Bedienfelder (`FlatControls.startPinch`, galt vorher nur oben).

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
- **Auf die schwebende Kachel zeigen** (oder ⟲ ⟳, `Q`/`R`): weiterdrehen —
  immer durch **alle sechs** Lagen. Geht eine Lage nicht (Fluss oder Weg
  stieße auf anderes), wird der Ring rot und aus _✓ Legen_ wird _Passt so
  nicht_. Bis Oktober 2026 sprang sie nur durch die erlaubten Lagen, an einem
  Fluss oft nur zwei: _„Ich kann immer nur zwischen zwei Ausrichtungen
  wechseln, aber nicht drehen."_
- **Die Drehung bleibt**, wenn die Kachel auf ein anderes Feld wandert, eine
  andere gewählt wird oder nach dem Legen die nächste kommt — gewünscht:
  _„Meine gespeicherte Drehung sollte auch beibehalten werden, wenn ich das
  Tile wechsle bzw. die Position."_ Die nächste Kachel sucht sich zuerst ein
  Feld, auf dem sie in dieser Drehung passt.
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
    antippen (drehen). Unten steht eine **Leiste** über die ganze
    Breite: oben die Zeile mit dem Bildchen der Kachel, Punkten, Stapel,
    offenen Aufträgen und dem Auftrag der Kachel, darunter ⟲ ganz links,
    ✓ Legen in der Mitte, ⟳ ganz rechts (im Kreativ-Modus darüber die
    Schnellliste). Die Tastenhilfe ist hier aus — sie lag über den Knöpfen. Tasten: `Q` dreht links, `R`/`E` rechts, Leertaste
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
- **Böden** (`hexDressing.groundPatches`, gezeichnet als „Modelle" `ground:…`
  in `hexView.HexModels.ground`): unter Stadt braune Erde, unter Wald ein
  dunkleres Grün, unter Weizen brauner Acker mit Furchen; darauf stehen die
  **Kornfelder mit Höhe** (`building_grain`, kleiner als ihr Stück), so dass der
  Acker ringsum als Rand bleibt — außen wie innen. Gewünscht: _„Ich will schon
  noch das Heu sehen, dass es hoch ist, nur einfach so wie jetzt den Rand drum
  herum auf dem Boden. Dazu bitte auch den Rand rein ins Innenfeld."_
  Ein Boden je **Lauf** gleicher Kanten (`runGeometry`): außen die
  Kachelkante, gerade und scharf; innen eine weiche Kurve durch die Nähe der
  Mitte (`RUN_BOW`, so gewählt, dass zwei Gebiete einer Kachel genau
  aufeinander laufen). Gewünscht: _„Die Grenzen in das Innere des Feldes
  müssen nicht so scharf kantig sein, sondern können leicht gerundet sein …
  eine scharfe Kante am äußeren Rand des Hex-Tiles, aber innen gerne
  weicher"_. Auf Fluss-, Weg- und Brückenkacheln je Kante nur der äußere
  Ring (gerade), auf See und Ufer keiner.
- **Die Ausstattung** (`hexland/hexDressing.ts`, ohne three.js): Jede Kante hat
  ihr Dreieck der Kachel, und dort steht, was zu ihrem Gelände gehört — eine
  Baumgruppe, zwei Häuser, ein Kornfeld (`building_grain`), auf Wiese
  manchmal ein Baum oder Stein. Eine Landkachel aus einem einzigen Gelände
  bekommt das große Stück: ganzes Feld mit Mühle, Dorfring mit Kirche oder
  Markt — nur der ganze Wald nicht: Er sind sieben kleine Baumgruppen (eine je
  Kante, eine in der Mitte), wie auf den gemischten Kacheln. Gewünscht: _„Die
  Wälder, wo komplett Wald ist, sollen nicht so groß sein, sondern lieber
  viele kleine wie bei den anderen auch."_ Gewürfelt mit dem Samen der
  Kachel, also immer gleich.
- **Animationen** (`hexland/hexAnimate.ts`, Schalter _Animationen_ im Reiter,
  gemerkt unter `hexland:animations`, ohne Eintrag an). Gewünscht: _„Dann
  soll sich die Windmühle drehen oder das Wasser leicht fließen und die Bäume
  leicht wackeln durch einen Wind, ggf. wäre ein kleines Wind-System schön,
  was vom Bildschirmrand ab und zu in einer sichtbaren Welle (in weiß)
  fliegt."_ Alles im Shader der Bündel, kein JavaScript je Baum:
  - Bäume und Weizen bekommen eine eigene Kopie des Materials der Vorlage
    (`HexModels.animated`, die Vorlage teilen sich alle KayKit-Welten) mit
    `swayMaterial`: Die Spitze weicht um Höhe² aus, leise aus fester Richtung
    und stark, wo die Front der Böe gerade ist (`ANIM.gust`). Nur in
    Bündeln — die Kachel in der Hand bleibt still. Schatten wiegen nicht mit.
  - Der Mühlenflügel (`building_windmill_top_fan_*`, ein eigenes Netz, mittig
    auf seiner Achse z) dreht im Shader (`fanMaterial`).
  - Wasser glitzert im Shader der Kacheln (`bevelEdges` + `WATER_FRAGMENT`):
    wo die Textur blau ist, ziehen helle Wellen in Brettkoordinaten.
  - Die Böe (`WindGusts`): alle 5–11 s sechs weiße Bänder mit Kringel, vom
    Rand des Bildes quer übers Bild in 4,5 s — Größe und Weite rechnet
    `HexlandWorld.blowWind` aus Blickpunkt und Sichtfeld der Kamera, damit
    sie auch weit herausgezoomt zu sehen sind. Sechs Zeichenaufrufe, nur
    während einer Böe.
  - Aus heißt: Zeit steht (Flügel stehen), Wiegen, Glitzern und Böen weg.
- **Die Kante jeder Kachel** (`hexView.bevelEdges`, ein Zusatz im Shader der
  Kacheln und Böden): nah am Rand eine dunkle Fuge, knapp davor eine helle
  Rundung — die Kacheln liegen sichtbar als Plättchen nebeneinander, ohne
  dass ein Modell angefasst wird. Gewünscht: _„sollen nicht nahtlos
  aneinander liegen, sondern am Rand etwas eingedrückt bzw. abgerundet … über
  einen Shader statt das Model anzufassen"_. Gerechnet wird mit der Lage im
  eigenen Netz (`position`, Kante zu Kante 2) — sie ist für jede Drehung
  dieselbe.
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
