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

- **45 normale Kacheln** (`NORMAL_TILES`, einstellbar unter _Partie einstellen_), eine Landkachel liegt in der Mitte.
  Wie im Brettspiel: 48 Landschaftsplättchen, 3 gehen vorher unbesehen zurück
  in die Schachtel (Anleitung, _Spielmaterial_ und _Spielaufbau_). Bis Oktober
  2026 waren es 40 Kacheln und 30 Aufträge — gemeldet: _„sind zu wenig bzw.
  unpassend viele hex tiles. Schau nach wie viele im Spiel dorfromantik
  existieren"_.
  Ist der Stapel leer, ist die Partie vorbei.
- **Immer drei Aufträge offen** (`OPEN_TASKS`): Liegen weniger als drei offene
  auf dem Brett, kommt statt einer normalen eine **Auftragskachel** — sie zählt
  nicht vom Stapel ab. Die Aufträge kommen aus einem **Auftragsstapel wie im
  Brettspiel** (`taskDeck`, `HexBoard.tasks`): je Gelände — Stadt, Weizen,
  Wald, Fluss, Weg — fünf Aufträge mit 4, 5, 5, 6, 6 (`TASK_TARGETS`),
  also 25 (`QUEST_TILES`), gemischt; so steht es in der Anleitung (25
  Auftragsplättchen, je Typ Marker 1 × 4, 2 × 5, 2 × 6). Vorher gewünscht
  waren 4, 4, 5, 5, 6, 6 je Gelände (_„Es gibt bei Städten 4, 4, 5, 5, 6, 6
  Aufträge und bei den anderen Gebieten …"_), das waren 30. Zum Auftrag wird eine Kachel gezogen, die das Gelände trägt
  (`drawTile` mit `task`) — und zwar eine, auf der das Gelände **nicht von
  Fluss oder Weg geteilt** ist (`runs` = 1; Fluss- und Weg-Aufträge
  ausgenommen). Gemeldet: _„Hier ist nicht klar, wo die Stadt zählt. Bei
  Flüssen und Straßen, die eine Mission sind (die nicht Fluss bzw. Straße
  sind), darf von der Mission nicht das Element durch den Fluss geteilt
  sein."_ Dasselbe gilt für Flaggen. Gespeichert als `deck` (Kürzel und Zahl je
  Auftrag); Stände ohne `deck` bekommen einen frisch gemischten Stapel in der
  Größe von `tasks` (Test in `hexRules.test.ts`). Leiste und Reiter zeigen,
  wie viele noch kommen (_„wie viele Aufträge es noch geben könnte und wie
  viele Spielplan-Tiles"_), der Reiter dazu je Gelände die Zahlen, die noch
  im Stapel liegen. Im unendlichen Spiel wird der Stapel neu gemischt, wenn
  er leer ist. Die Zahl steht **schon beim Ziehen** fest. Man sieht ihn vor dem Legen — als Schild „Weizen 4"
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
- **Wind** biegt Bäume, Weizen und die Büsche der Wiese (`hexView.SWAY_BEND`:
  0,3 / 2,4 / 1,6 — das Maß wächst mit dem Quadrat der Höhe, niedriges braucht
  mehr). Gewünscht: _„Weizen und Büsche sollten sich vom Wind auch bewegen
  lassen."_
- **Ufer und Wasser-Endstück** (`groundPatches`): Ufer-Kacheln bekommen wie
  Flusskacheln am Rand den Boden ihres Geländes (Wald dunkelgrün), und das
  Endstück (`coast-A`, eine Wasserkante) eine tiefere Bucht in Wasserfarbe
  (`GroundKind` `water`, `BAY_BOW`) — die des Modells war zu klein. Gemeldet:
  _„beim wasser endstück, ist das wasser noch zu klein, es sollte weiter rein
  ragen. auch sollte, wenn dort Wald ist, auch der boden davon dunkel grün
  sein wie beim wald."_
- **Auf der Wiese stehen keine Bäume** (`hexDressing.meadow`): kleine Büsche
  (_Forest Nature_, `BUSH_SHAPES`: nur die runden `1_B…1_E`, Farbe 1) und ein
  paar kleine Steine —
  Modelle aus anderen Paketen tragen ein `/` vorn (`HexModels.load`).
  Gemeldet erst _„Bitte bei den hex Feldern die z.B. kein Wald sind auch bitte
  keine Bäume platzieren."_; die Flachsblumen danach waren _„leider
  hässlich"_. Aus fünf Bildern (Grasbüschel, Büsche, Hügel, Weide, Steine)
  gewählt: _„B bitte. und etwas kleiner. Auch gerne ein paar steine, aber
  kleiner?"_, dann _„variante 1 bitte. aber auch gern runde büsche, statt
  eckige"_. Bäume stehen nur noch im Wald.
- **Die Kacheln** sind wie im Brettspiel: meist zwei Gelände, oft eines,
  selten drei, wenig bloße Wiese (`drawTile`).
- **Fluss und Weg müssen weiterlaufen** — Wasser an Wasser, Weg an Weg. Passt
  eine Kachel nirgends, darf sie ausnahmsweise überall hin.
- Gezählt wird in **Kacheln**, verbunden wird über **Stücke**
  (`segments`): Fluss und Weg teilen das Land auf einer Kachel, und jedes
  Stück gehört zu seinem eigenen Gebiet. Gemeldet: _„(Wald)(Wald Fluss
  Wald)(Wald) zählt nicht als ein 3er Wald, sondern als zwei 2er Wälder."_
  Liegen beide Stücke einer Kachel doch im selben Gebiet (ringsherum
  verbunden), zählt die Kachel einmal. Andere Gelände trennen nicht — auf
  einer Kachel ohne Fluss und Weg ist alles Land ein Stück (`drawTile` legt
  ein Gelände ohnehin am Stück). Auftrag und Flagge liegen auf dem ersten
  Stück; neue liegen ohnehin auf einem ungeteilten (`runs` = 1). Intern sind
  die Stücke Zahlen, nicht Zeichenketten — _Intelligent (optimiert)_ fragt
  `areas` für jede Lage, mit Zeichenketten lief `hexbench` 1,7× so lang.

### Übersicht, übrige Kacheln, Vorschlag

Gewünscht (Oktober 2026): _„dass ich zwar die aktuellen Missionen sehe, aber
auch sehe, welche Missionen (Icon und Zahl) ich bereits erledigt habe und
welche noch fehlen"_, _„wie viele tiles von welchen gebieten übrig sind (ggf
Missionen und normale Unterteilen?) und ein umschalt Button … um die übrigen
tiles im Detail sehen zu können"_, der Planer soll aussichtslose Aufträge
aufgeben, und _„einen Button im hex Spiel Screen (Hilfe/Lege Vorschlag
(intelligent optimiert)) …, der das Tile platziert und ich auf ein (Info
Icon) drücken kann um zu erfahren, warum er es dort hin gelegt hat"_.

- **Alle Aufträge** (`HexBoard.questOverview`): je Gelände jede Zahl der
  Partie mit Zustand — erfüllt, verpasst, offen (mit Stand), in der Hand,
  noch im Auftragsstapel. Am Schirm klappt _Alle Aufträge ▾_ über den offenen
  Aufträgen oben rechts eine Tafel auf (`drawOverview`, `questChip`: gold ✓,
  rot durchgestrichen, Rahmen in der Farbe des Geländes, gestrichelt, grau;
  gemerkt in `hexland:overview`). Im Reiter dasselbe als Seite _Aufträge im
  Überblick_ (`questMenu`) mit dem Schalter dafür.
- **Übrige Kacheln** (`HexBoard.leftOver`, `leftOverMenu`): je Gelände, wie
  viele normale Kacheln es tragen (eine Kachel mit Wald und Fluss zählt bei
  beiden) und wie viele Auftragskacheln es verlangen. _Jede Kachel einzeln
  zeigen_ schaltet auf zwei Raster um: jede Kachel im Stapel als Bild
  (gedrehte gleiche zusammen, nach Anzahl, also ohne die Reihenfolge zu
  verraten) und jede Auftragskachel mit Gelände und Zahl.
- **Der Planer zählt mit** (`hexPlanner.stackPool`, `count`, `hopelessBy`):
  In der normalen Runde kennt _Intelligent (optimiert)_, was noch im Stapel
  und in der Hand liegt (nicht die Reihenfolge). Fehlen einem Auftrag mehr
  Kacheln, als noch Kacheln mit seinem Gelände kommen (Auftragskacheln
  desselben Geländes zählen mit), oder passt keine einzige mehr an seine
  freien Felder, ist er **aussichtslos**: `assess` (Parameter `ignore`) zählt
  ihn nicht mehr — kein Wachsen, kein Verlust —, und platzt er durch eine
  Lage, bringt das `HOPE_BONUS`, solange noch Aufträge nachkommen (sein Platz
  wird frei). 200 Runden (Samen 1–200): 98,72 → 99,67 Punkte.
- **💡 Vorschlag** — nur die Lampe, rechts in der oberen Zeile der Leiste
  (bricht auch am schmalen Handy nicht um). Sie **legt nicht**, sie schiebt
  die Kachel nur auf Feld und Drehung, die _Intelligent (optimiert)_ wählt
  (`suggest`, mit Vorausschau), und die Kamera fliegt hin. Solange die Kachel
  genau so liegt (`whyHere`), steht statt der Lampe **ⓘ** (`syncSuggest`);
  es öffnet über der Leiste _Warum dort?_ (`showWhy`, Gründe aus
  `hexPlanner.explainPlacement`): welcher Auftrag fertig wird, wächst, platzt
  oder aufgegeben ist (mit der Zählung: „es fehlen 3, aber nur noch 2 Kacheln
  mit Weg kommen"), der eigene Auftrag der Kachel, Flagge, längster Fluss und
  Weg, vorbereitete Gebiete, passende Kanten und ob knapp entschieden wurde.
  Verschoben oder gedreht, wird ⓘ wieder zur Lampe. Gewünscht: _„das
  vorschlag feld soll nur die lampe sein, und das feld nicht legen, sondern
  nur dort hinbewegen … (die lampe ändert sich zum info icon) dann die
  begründung lesen. Die lampe sollte in den oberen panel kommen und nicht bei
  kleineren displays runter geben."_ In der Leiste steht der Auftrag der Kachel
  nicht mehr („Auftrag: Weizen 6") — _„Ich brauche in dem panel auch nicht
  die information ‚Auftrag Weizen'."_
- **Partie einstellen** (`setupMenu`, `hexland:setup`): Anzahl Kacheln (5–200,
  Standard 45) und Anzahl Aufträge (0–100, Standard 25), je eine Seite mit
  −10, −1, ↺ Standard, +1, +10; dazu _Neue Partie mit diesen Zahlen_. Gilt ab
  der nächsten Partie; das Brett merkt sich, womit es begann
  (`HexBoard.startTiles`, `startTasks`, im Stand als `size`). Mehr als 25
  Aufträge sind weitere ganze, je für sich gemischte Stapel
  (`taskDeckOf`). Gewünscht: _„im hex welt menü beim spiel noch einstellen
  können mit wie vielen tiles und missionen ich spielen will"_.

### Wie Aufträge auf dem Brett aussehen

- **Kleines Abzeichen** (`hexBadge.QuestBadge`): Gelände-Sechseck und „3/5",
  sonst nichts — die Erklärung („noch 2") steht in der Liste oben rechts.
  An der Kachel in der Hand nur die Zahl. Gewünscht: _„Können wir die
  Mission-Tiles anders darstellen? Aktuell verdecken diese viel … nur das
  Icon, aber mit X/Y rendern."_
- **Umrisse am Boden** (`drawQuestRims`, `HexBoard.areaOutline`,
  `hexOutline.ts`): eine **eckige Linie um das ganze Gebiet** eines offenen
  Auftrags, ohne Tiefenprüfung über Bäumen und Häusern. Jede Kachel zählt als
  sechs Dreiecke, eins je Kante; zum Gebiet gehören die Dreiecke seines Stücks
  (bei Fluss und Weg die ganze Kachel). Gezeichnet werden Außenkanten zu
  Nachbarn außerhalb und, wo das Gebiet mitten auf einer Kachel endet,
  Speichen von der Mitte zur Ecke; jede Linie weiß, auf welcher Seite ihr
  Gebiet liegt (`side`). Kanten zwischen zwei Kacheln desselben Gebiets
  bleiben frei. Gewünscht erst _„die Elemente zu highlighten"_, dann _„nur
  dort, wo es wirklich angrenzt"_ und zuletzt mit einer Skizze: _„Die
  zusammenhängenden Gebiete der Missionen sind rund, sollen aber eckig
  sein."_
  **Wie die Linie aussieht** (Oktober 2026, gemeldet: _„sollten allerdings
  schöner gemacht werden"_ — vorher Leisten über einem dunklen Saum, an jeder
  Ecke zwei Klötzchen übereinander): Die Strecken werden zu Linienzügen
  verkettet und als ein Band mit Gehrung gezeichnet — schmale helle Linie
  genau auf der Grenze, nach innen ein weicher Schein in der Farbe des
  Geländes, nach außen ein Hauch Schatten (`PROFILE` in `hexOutline.ts`, Farbe
  und Deckkraft je Ecke). Zwei Gebiete an derselben Kante leuchten jedes in
  sein Feld. **Die Linien auf dem Feld der schwebenden Kachel schweben mit**
  (`handRims` hängt an der Vorschau) — gemeldet: _„Auch schweben die Linien
  nicht mit wenn das tile schwebt vor dem legen."_
- **Was die Kachel in der Hand ändert** (`drawBadges`, `HexBoard.pretend`):
  Darf sie liegen, wo sie schwebt, rechnet das Brett probehalber mit ihr.
  **Nur X/Y**, X schon mit der Kachel, und farbig, wenn sie etwas ändert
  (`QUEST_TONE`): grün, wenn das Gebiet wächst, gold, wenn es genau fertig
  wird, rot, wenn es zu groß wird (Liste: „noch 1", „✓ wird erfüllt", „✗ wird
  zu groß"). Der eigene Auftrag der Kachel zeigt „1/6", und die Umrisse zeigen
  das Gebiet schon mit ihr. Gewünscht erst _„wie der Wert sich verändern
  würde"_ (damals „3→4/5"), dann _„nur X/Y …, wobei x dann farbig ist wenn es
  besser wird oder wenn es überschreiten wird. Oder farbig wenn komplett
  erfüllt wird"_.
- **Erfüllt oder verpasst — man sieht es** (`celebrate`, `stepFeedback`,
  `questCard`). Gewünscht: _„Bei nicht schaffen einer Mission … und bei
  schaffen einer Mission bitte in der ui Feedback geben"_. Über der
  Auftragskachel steigt ein Schild auf und verblasst („✓ +5" gold, „✗ 7/5"
  rot; Brille wie Schirm). Erfüllt: Das Gebiet springt (unten). Verpasst: Der
  Umriss des Gebiets blinkt dreimal rot und erlischt. Am Schirm kommt
  zusätzlich eine Karte über die Leiste — „Stadt-Auftrag erfüllt! · +5
  Punkte" (springt auf) oder „Wald-Auftrag verpasst · Gebiet 7 statt 5"
  (schüttelt sich) — und die Zeile unten (`notify`) sagt es dann nicht noch
  einmal; in der Brille bleibt die Zeile.

### Welt generieren

Statt _Unendliches Spiel_ steht im Menü **Welt generieren** (`world`, Speicher
`hexland:world`; das unendliche Spiel gibt es im Code weiter, im Menü nicht).
Gewünscht: _„Ich würde gerne einen Welt-Generierungs-Modus haben statt
unendlich. Dabei kann ich Feld für Feld generieren lassen. Es beginnt mit dem
Startfeld und läuft dann immer im Kreis herum. Dabei wird zufällig ausgewählt
aus allen Tiles, die daran perfekt matchen."_

- **Reihenfolge**: `spiralCell(n)` — Ring für Ring um die Mitte; `placed`
  zählt mit (steht im Spielstand).
- **Die Kachel** (`HexBoard.perfectTile`): alle Grundkacheln in allen
  Drehungen, deren Fluss und Weg genau auf die der Nachbarn treffen und deren
  Land auf Land trifft; gewürfelt nach den Gewichten des Stapels (Kacheln nur
  für den Baukasten selten, 0,15). Land an einem Nachbarn übernimmt dessen
  Gelände, freie Kanten meist das der Kante daneben (Gebiete), sonst
  gewürfelt. Verworfen wird, was ein freies Nachbarfeld unfüllbar machte
  (`slotFor` → `dead`). Nachgerechnet: 1 500 Kacheln, keine Kante falsch,
  3 Felder blieben frei.
- **Bedienung** (Leiste, `worldRow`): **+1**, **▶ Generieren** (alle 0,25 s eine,
  `stepGenerate`; noch einmal tippen hält an) und **+10**. Bei +1/+10 fliegt
  die Kamera zur letzten neuen Kachel. Keine Aufträge, keine Wertung.

- **Ein fertiger Auftrag springt** (`HexBoardView.hop`/`animate`): Wird beim
  Legen ein Auftrag erfüllt, hüpfen alle Kacheln seines Gebiets (mit allem,
  was darauf steht) 0,55 m hoch und plumpsen mit zweimal kleinem Nachfedern
  zurück, 0,75 s, je Ring Abstand von der Auftragskachel 0,06 s später — eine
  Welle. Gerechnet an den Kopien in den Bündeln (Ruhelage je Kopie gemerkt),
  kein eigenes Modell. Gewünscht: _„wenn ein Auftrag abgeschlossen ist, dass
  dann die Tiles, die dem Auftrag dazu gehörten, alle leicht nach oben gehen
  und dann runterfallen auf die normale Position wieder, wie so ein
  gemeinsamer Sprung bzw. wie bei Lego spielen, wenn am Ende das Objekt
  fertig ist."_ **Die Kamera wartet**, bis der Sprung vorbei ist
  (`pendingFlight`, `hop` gibt die Dauer zurück), und fliegt erst dann zur
  nächsten Kachel — gewünscht: _„Nach dem erfüllen einer Mission soll die
  complete Animation noch abgespielt werden komplett und danach erst die
  Kamera zum nächsten Plätchen fliegen"_. Die Regel bleibt wie im Brettspiel: Ein Auftrag, dessen
  Gebiet zu groß wird, ist verpasst und gibt seinen Platz frei.

### Spielende (normale Runde)

- **Vorbei ist es, wenn keine normale Kachel mehr da ist** (`HexBoard.over`,
  `nextHand` gibt `null`, sobald der Stapel leer ist) — auch wenn noch
  Auftragskacheln übrig wären. Gewünscht: _„Spielende ist, wenn ich keine
  normalen Tiles legen kann, auch wenn Missionen übrig sind."_
- **Die Leiste am Ende** (`drawBarIcon`, `endRow`): groß „Spielende · 82
  Punkte", darunter gelegte Kacheln und erfüllte Aufträge; statt ⟲ ✓ ⟳
  mittig **Neue Runde** und rechts **Punkte** (`toggleDetails`: Aufträge mit
  erfüllt/verpasst, Flaggen, längster Fluss, längster Weg, Gesamt — über der
  Leiste). Gewünscht: _„anstatt Legen und links/rechts gibt es einen
  Neue-Runde-Button (mittig) und Punkte-im-Detail-Button"_. Die
  Auftragsliste oben rechts verschwindet.
- **Die Kamera kreist** (`orbitEnd`): einmal Mitte des Bretts, Neigung 40°,
  Abstand so, dass das Brett auch hochkant quer hineinpasst; dann dreht sie
  sich mit `ORBIT_SPEED` (0,12 rad/s) über `topDownView.twist`. Bei einer
  neuen Runde (`startGame`, jeder Modus) kehrt die Neigung von vorher zurück,
  der Abstand geht auf höchstens 30 m (`START_ZOOM`), und die Kamera fliegt
  zu den Startkacheln in der Mitte — gewünscht: _„Bei einer neuen Runde
  fliegt die Kamera bei den Start-Tiles."_ Gewünscht: _„Dabei fliegt
  die Kamera um die Spielwelt herum im 40°-Winkel und dreht sich langsam."_
- **Während des Spiels** steht in der Leiste mit Bildchen, was noch kommt
  (`barCounts`): ein Sechseck mit der Zahl der Kacheln im Stapel, ein
  Sechseck mit Ring mit offenen Aufträgen / 3 und dem Rest im
  Auftragsstapel. Gewünscht: _„Ich will im Spiel noch sehen, wie viele Tiles
  und Missionen ich habe (ggf. mit Icons über dem Legen-Button)"_.

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
**Normale Runde** (45 Kacheln), **Unendliches Spiel** (dieselben Regeln und
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
    (Gebiet größer als die Zahl, oder es kann nicht mehr bis zur Zahl wachsen —
    ringsum geschlossen, oder die freien Felder daneben nehmen nur noch
    Sackgassen auf; der eigene Auftrag der Kachel zählt mit). So eine Lage schlägt keine Hilfe mehr vor, auch _An
    passender Grenze_ und _Kachel vordrehen_ nicht. Gemeldet war: _„Einige
    Empfehlungen würden dazu führen, dass ich die Aufträge niemals schaffen
    könnte."_ Nachgerechnet über 20 Runden: nur nach Kanten 50 Aufträge
    verpasst und 84 erfüllt, mit `assess` 0 verpasst und 157 erfüllt.
    Reihenfolge in `questScore`: fertig nach Punkten (50 je Auftrag + 4 je
    Punkt der Zahl) vor nah dran (20 × Größe/Zahl, auch für den eigenen
    Auftrag der Kachel) vor bloßem Wachstum (5 je Kachel) — gewünscht: _„Bei
    dem Vorschlag sollte ggf. auch dort vorgeschlagen werden, wo Aufträge am
    ehesten beendet werden."_ Und an zwei geteilten Spielständen gemeldet:
    _„Intelligent könnte die Stadt direkt beenden, stattdessen wird das Tile
    woanders vorgeschlagen"_ (Stadt 5 sofort fertig zählte so viel wie ein
    Weg 4) und _„Hier könnte der Weg bei dem 3er statt beim 2er vorgeschlagen
    werden"_: Zwei offene Aufträge mit verschiedenen Zahlen im selben Gebiet
    galten als unmöglich — sind sie nicht, das Gebiet wächst weiter, erst der
    kleine, dann der große. Nachgerechnet über 20 Runden: erfüllt 116 → 137,
    Punkte im Schnitt 38 → 45.
    Einen neuen Auftrag an einen offenen desselben Geländes hängen ist
    erwünscht (eine Zeit lang zählte das dagegen, `tied`; zurückgenommen nach
    _„Hier wurde der Fluss falsch vorgeschlagen, und nicht bei der
    Fluss-Mission"_ — der frühere Fall stammte noch aus einer Version mit der
    falschen Widerspruchs-Regel). Über 80 Runden: erfüllt 745 → 815, Punkte
    58,1 → 63,1.
    Dazu **vorbereitet** (`ready`, +8 je Stück, `HexBoard.readiness`): je
    Gelände und Zahl, die noch im Auftragsstapel liegt, ein offenes Gebiet
    ohne Auftrag, genau eins kleiner — dann macht die Auftragskachel es auf
    einen Schlag fertig. Gewünscht: _„dass das Spiel Städte bzw. Gebiete so
    weit vorbereitet, … dass man eine 3er-Stadt, falls noch nicht
    existierend, mit freier Kachel nebenan so weit aufbaut"_. Mit beiden über
    20 Runden: erfüllt 137 → 166, Punkte 45 → 53. Wächst ein Gebiet nur von
    „bereit für 4" zu „bereit für 5" (dasselbe Gelände verliert und gewinnt),
    zählt das leicht dagegen (−0,15): Kleiner bleiben lässt beides offen.
    Gewünscht an einem Stand: _„Hier ist es sinnvoller, den Wald nicht zu
    einem 4er-Wald zu machen, sondern ihn als 3er-Wald zu lassen und gegenüber
    vom Weizen zu setzen, falls eine 4er-Wald-Mission kommt."_ Kostet in der
    Rechnung über 80 Runden etwa 2 % Punkte (59,1 → 58,1) — die Simulation
    legt aber immer nur den Vorschlag und plant nicht weiter; gewünscht ist
    es so.
    **Wie weit ein Gebiet noch wachsen kann** (`slotFor`, `areas(…, strict)` →
    `room`): Ein freies Feld am Gebiet ist `grow`, wenn eine Kachel aus dem
    Stapel dort passt und das Gelände zu einem weiteren freien Feld führt;
    `end`, wenn nur eine Sackgasse passt; `dead`, wenn gar keine passt (etwa
    Weg und Fluss gemischt). Ohne `grow` wächst das Gebiet um höchstens eins
    je `end`-Feld — reicht das nicht bis zur Zahl, ist der Auftrag
    unerfüllbar (`breaks`). Gemeldet an einem Stand: _„hier wird ein
    Spielplan-Tile vorgeschlagen, wodurch aber zwei Missionen nie möglich sein
    werden zu beenden"_ — eine Wiese neben dem einzigen Wegende ließ dort nur
    noch eine Sackgasse zu, Weg 3/5 und Weg 3/6 wären bei 4 stehen geblieben.
    Die Wertung der Flaggen fragt weiter nur, ob wirklich geschlossen ist.
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

- **Die offenen Aufträge oben rechts** (`drawQuestList`, DOM, nur von oben am
  Schirm): je Auftrag eine Zeile mit Gelände-Sechseck und „Stadt 2 / 5" —
  ohne „noch 3" (gewünscht: _„Bei den Missionen das ‚noch' bitte
  entfernen."_); darunter steht nur „✓ wird erfüllt" oder „✗ wird zu groß",
  wenn die Kachel in der Hand das entscheidet. Ein Tipp fliegt die Kamera zur Kachel (`flyTo`, derselbe Flug
  wie nach dem Legen). Steht die Bildrate oben rechts, rückt die Liste
  darunter. Gewünscht: _„Ich würde gerne seitlich in der UI oben rechts meine
  aktiven Quests sehen, und wenn ich drauf tippe, springt die Kamera zu der
  Kachel hin."_
- **Die Schilder bleiben am Schirm gleich groß** (`sizeBadges`): ab 22 m
  Kameraabstand wachsen sie mit dem Abstand und steigen höher; die Leinwand
  ist doppelt so fein (1024 × 384) mit Anisotropie. Gemeldet: _„Der Text
  scheint schmierig bzw. unscharf zu sein, wenn ich weit raus zoome."_

- **Weiter hinaus zoomen** (`TopDownCamera.setMaxZoom`, neu im Kern über
  `WorldContext.topDownView.maxZoom`): Hexland erlaubt 240 m statt 60 m, mit
  den Stufen 85, 120, 170, 240 (`topDownPose.TOP_DOWN_FAR_DISTANCES`); beim
  Verlassen gilt wieder die gewohnte Grenze. Ab 100 m blendet `sizeBadges`
  die Schilder über dem Brett aus — dort lägen sie übereinander, die Liste
  oben rechts bleibt. Gewünscht: _„Ich will gerne noch weiter raus zoomen
  können."_

- **Spielstand teilen** (Reiter → _Spielstand teilen_, `hexShare.ts`):
  _Kopieren_ legt `HEX1.` + den Stand (`HexBoard.save`, `deflate-raw`,
  Base64url) in die Zwischenablage, rund 1 000 Zeichen nach 20 Kacheln;
  _Einfügen_ liest die Zwischenablage (sonst ein Eingabefeld), lädt den
  Stand in seinen Modus und ersetzt dessen Brett. Gewünscht: _„den aktuellen
  Map-Stand kopieren können (komprimiert) und einen Import haben wollen,
  damit du den Spielstand nutzen kannst, um zu schauen, was ich meine."_
  **Einen geschickten Stand lesen** (am Rechner, ohne Browser):

  ```sh
  node -e "const z=require('zlib');const t=process.argv[1];console.log(z.inflateRawSync(Buffer.from(t.slice(5).replace(/-/g,'+').replace(/_/g,'/'),'base64')).toString())" 'HEX1.…'
  ```

  Das JSON lädt `new HexBoard().load(json)` in einem Jest-Test oder im
  Browser (`bgvr.world.board`), um z. B. `assess` und die Spielhilfen an
  genau dem Brett nachzurechnen.

### Himmel

_Grafik → Himmel_ (`GraphicsSettings.sky`, ab Werk an), gespiegelt im Reiter
_Hexland_ (`skyRow`). Aus heißt: keine Kuppel — in der Brille sieht man durch
das Passthrough den eigenen Raum, am Schirm die Hintergrundfarbe. Die Kuppel
(`shared/environment.createSky`) wird seitdem **im Unendlichen** gezeichnet:
nur die Richtung zählt, die Tiefe liegt auf der Fernebene. Vorher war sie eine
Kugel von 560 m um den Ursprung, und hoch oben im Weltbau lag sie hinter der
Fernebene — gemeldet: _„Der Himmel ist wohl, wenn ich weiter oben bin, einfach
weg und ich sehe Passthrough mein Zimmer."_ Das gilt für alle Welten.

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
- **In der Brille und aus den Augen zielen** (`showHover`, `showAim`): Auf
  einem anderen freien Feld steht die Kachel als **Geist** (halb durchsichtig,
  in der Drehung, in der sie dort landen würde); Trigger holt sie hin, ganz
  sichtbar, aber noch nicht gelegt. Auf der Kachel in der Hand laufen **zwei
  Pfeile langsam im Uhrzeigersinn** um sie (`buildSpin`) — Trigger dreht.
  Gewünscht: _„Ziele ich auf ein unbesetztes Tile, wird das neue Tile dort
  als Ghost angezeigt, bis ich Trigger drücke … zielen auf das aktuelle Tile
  zeigt rotierende Pfeile langsam mit der Drehrichtung."_ Von oben am Schirm
  gibt es beides nicht (dort Ziffern, Leiste und Klick).
- **Neben ✓ Legen stehen ↺ und ↻** (`controls`, eine Tafel, die sich als
  Ganzes zum Blick dreht; die Pfeile sind gezeichnet, `curvedArrow`) —
  gewünscht: _„bei dem Panel ‚Legen' auch die Buttons links und rechts mit
  Drehen einbauen."_
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
- **In der Brille am Tisch** (Reiter _Hexland → In VR am Tisch spielen_,
  `hexland:table`; `enterTable`, `updateTable`, Tablett in `hexTable.ts`).
  Gewünscht: _„dass es wie auf dem Tisch liegt und ich die Tiles mit Grab in
  die Hand nehme und auf die freien Tiles loslassen kann zum Legen."_
  - Der Weltbau geht aus, man steht in Originalgröße. Das Brett (`board3d`,
    die Gruppe mit allem, was auf den Kacheln liegt) wird eine **Miniatur**
    (Maß 0,06: eine Kachel 18 cm) 75 cm vor dem Spieler auf Tischhöhe, auf
    einer **Tischplatte** (`tableTop`), die den Sockel der Kacheln verdeckt.
  - Links davor schwebt das **Tablett**: Griffstange in Griff-Farbe vorn
    (Griff dort trägt es), zwei Stapel **verdeckter Sechsecke** (normal
    beige, Aufträge lila) mit der Zahl davor; der Stapel, von dem als
    Nächstes gezogen wird, leuchtet und hat einen pulsierenden Ring. Vorn
    ↺ · ✓ Legen · ↻ (Strahl), dahinter Punkte und Stapel.
  - **Griff am leuchtenden Stapel** zieht die Kachel in die Hand. **Griff an
    der Kachel** (sechs Griffpunkte an den Ecken) nimmt sie, auch aus der
    anderen Hand. Das Handgelenk dreht sie; **Loslassen über einem freien
    Feld** legt sie dort hin, auf die nächste der sechs Lagen gedreht —
    noch nicht fest, der gelbe Ring zeigt, dass sie offen ist. Anderswo
    losgelassen, geht sie zurück auf den Stapel.
  - **Die nächste Kachel ziehen legt die liegende** (_„Nehme ich ein neues
    Tile, wird das alte Tile gelegt"_); passt sie so nicht, bleibt alles
    liegen. Bei der letzten normalen Kachel steht über dem Stapel
    _■ Beenden_.
  - **Trigger ins Leere** greift das Brett: es hängt an der Hand, und je
    näher die Hand dem Kopf kommt, desto größer wird es (Maß 0,01–0,4) —
    _„die ganze Karte an mich ranziehen und damit das Ganze reinzoomen."_
  - Die Kachel in der Hand wird knapp unter ihrer Oberfläche abgeschnitten
    (`handClip`, eigene Stoffe), sonst wäre sie ein Klotz.
- **Am Schirm von oben gibt es keine Figur.** Gewünscht: _„bei von oben
  brauche ich keinen Spieler Charakter sondern kann direkt tiles auf die Welt
  legen und drehen lassen über Buttons. Auf pc mit wasd und Mausrad"_. Die
  Figur ist unsichtbar und nur noch der Punkt, dem die Kamera folgt
  (`HexlandWorld.fitView`):
  - **Bild schieben**: WASD (so schnell, wie die Kamera weit weg ist —
    `PlayerRig.pace`), oder mit Maus/Finger ziehen (`panBy`). **Zoomen**:
    Mausrad, zwei Finger auseinander und zusammen.
  - **Kippen ist ab Werk gesperrt**, nur Drehen und Zoomen gehen
    (`TopDownCamera.tiltLocked` über `topDownView.lockTilt`; rechts Ziehen
    dreht dann nur). Freigegeben wird es im Reiter mit _Erweiterte
    Kamerasteuerung_ (`cameraRow`, `hexland:camera`). Gewünscht: _„Bei hex
    Welt soll die Kamera kippen nicht verändert werden können standardmäßig
    (drehen weiterhin). Das kippen kann nur über das hex Menü erweiterte
    Kamera Steuerung aktiviert werden."_ Rundflug am Spielende und
    _Grafik → Blickwinkel von oben_ setzen die Neigung weiter.
  - **Zwei Finger** (`twoFingers`): gemeinsam hoch oder runter **neigt** das
    Bild (nur mit _Erweiterter Kamerasteuerung_; hoch ist flacher, 20–90°), gegeneinander kreisen **dreht** es
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
  - **Kein Werkzeug in der Bildmitte**: Was die unsichtbare Figur hält (das
    gewählte Werkzeug, etwas Getragenes), ist von oben ebenfalls weg
    (`PortalWorld.screenHandShown`, `ScreenHand.setShown`). Gemeldet: eine
    graue Tonne mitten im Bild — _„Es ist wohl ein gewähltes item? Bitte
    entfernen."_
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
    `swayMaterial`: Die Spitze weicht um Höhe² aus — **nur auf der Kachel,
    auf der der Wind gerade ist** (`ANIM.gustTiles`, ausklingend auf der
    davor), sonst steht alles still. Gewünscht: _„Der Wind soll nur Felder
    beeinflussen, wenn er auf dessen Feld gerade ist. Das Weizen bewegt sich
    viel zu stark."_ (Weizen `bend` 0,6, Bäume 0,3.) Der Shader prüft, ob der
    Fuß (`instanceMatrix[3]`) im Sechseck der Kachel liegt. Nur in Bündeln —
    die Kachel in der Hand bleibt still. Schatten wiegen nicht mit.
  - Der Mühlenflügel (`building_windmill_top_fan_*`, ein eigenes Netz, mittig
    auf seiner Achse z) dreht im Shader (`fanMaterial`).
  - **Wasser fließt den Fluss hinab.** `hexDressing.riverFlow` spielt das
    Brett in der Reihenfolge des Legens nach (die steht im Spielstand, also
    kein neues Feld): Eine Flusskachel allein fließt von ihrem südlichsten
    Arm (+z) in alle anderen — gabelt sie, trennt sich das Wasser. Ein Arm an
    einem Nachbarfluss übernimmt dessen Richtung, freie Arme laufen hinaus,
    wenn Wasser hereinkommt, sonst herein. Kommt nur Wasser herein und kann
    nirgends hinaus (oder umgekehrt), **kehrt der kürzere verbundene Fluss
    um**. Gewünscht: _„dass ein Fluss eine Wasserrichtung hat, und wenn es
    mit dem nächsten Teil verbunden ist, fließt das Wasser dort weiter und
    trennt sich … zwei Flüsse, die aufeinander fließen und dann verbunden
    werden, fließen danach in eine gemeinsame Richtung, einer muss sich
    umkehren (der kürzere)."_ Ergebnis je Kachel: Arme hinein und hinaus
    (Bitmasken in den Kanten des **Modells**) und `centre`, wie weit die
    Mitte den Fluss hinab liegt. Das kommt als Spalte je Kopie (`aFlow`) an
    die Bündel der Grundkacheln (`Part.flows`); `HexBoardView.updateFlow`
    rechnet nach jeder Kachel alles neu. Im Shader (`WATER_FRAGMENT`): der
    nächste Arm und sein Gegenstück (der nächste Arm der anderen Richtung)
    bilden einen Weg — an Gabelungen gibt es mehrere, und jeder Punkt mischt
    die Wellen aller Wege nach seiner Nähe zu ihnen (vorher galt hart der
    nächste, und es blieb eine keilförmige Naht). Gegenüber: gerade durch. Sonst **ein Bogen um O**, den
    Punkt, in dem sich die beiden Kanten treffen — der Winkel um O ist die
    Strecke (Kante herein −1, Kante hinaus +1 um `centre`). Gemeldet war:
    _„Das Wasser an geraden Stücken klappt, aber nicht an den Ecken bzw.
    Kreuzungen"_ — vorher zählte jeder Arm für sich, und auf der
    Winkelhalbierenden einer Kurve sprang die Strecke. An Gabelungen bleibt
    eine feine Naht zwischen den beiden Wegen. Seen und Ufer glitzern langsam
    ungerichtet.
  - **Flussrichtung zeigen** (Schalter im Reiter, `hexland:arrows`, ohne
    Eintrag aus): je Arm ein weißer Pfeil, halb zwischen Mitte und Kante
    (`HexBoardView.showArrows`, ein `InstancedMesh`).
  - **Der Wind** (`WindGusts`, mit `FLOW_SPEED` so schnell wie das Wasser) —
    eine einzige Front, die von Kachel zu Kachel läuft. Gewünscht: _„Lass nur
    eine Windfront bewegen entlang der Hex-Tiles, der Wind bewegt sich von
    Feld zu Feld mit einer allgemeinen Richtung (z.B. Süd nach Nord) und hat
    auf den Feldern eine 50%-Chance, links oder rechts abzuweichen."_ Jeder
    Windstoß hat eine Hauptrichtung (eine Ecke der Kachel, zwischen zwei
    Kanten), tritt hinten ins Brett, läuft auf jeder Kachel im Bogen von der
    Kante, an der er kam, durch die Mitte zu einer der beiden vorderen Kanten
    (je zur Hälfte) und vorn hinaus. **Immer einer im Bild** — gewünscht:
    _„Es sollte im sichtbaren Screen immer ein Wind aktiv sein."_ Er beginnt
    hinter der hintersten Kachel, die man gerade sieht (`blowWind` reicht
    Blickpunkt und halbe Bildweite), endet, wenn er aus dem Bild oder vom
    Brett läuft, und 0,4–1,5 s später kommt der nächste. Hinter ihm
    eine weiße Spur (3 m), die herausgezoomt breiter und schneller wird
    (`HexlandWorld.blowWind`). Ein Zeichenaufruf. **Gegen Ruckeln** (gemeldet
    bei 60 fps): Er läuft gleichmäßig in Metern auf dem Bogen (`bend`, die
    Ableitung, in kleinen Schritten), die Spur hängt vorn immer am Kopf, wo
    er gerade ist (feste Punkte nur alle 6 cm), wird hinten genau auf ihre
    Länge geschnitten, und ihre Durchsichtigkeit folgt den Metern, nicht der
    Zahl der Punkte.
    **Zwei Windstöße zugleich** (`WIND_COUNT`, Oktober 2026) — gewünscht:
    _„Können wir den Wind doppelt so häufig auftreten lassen?"_ Die Pause war
    schon fast null, also läuft ein zweiter nebenher, zu Beginn 2,5 s
    versetzt; jeder hat eigene Uniformen (`gustTiles2`, `gustPush2`), der
    Shader zählt beide. Zwei Zeichenaufrufe.
  - Aus heißt: Zeit steht (Flügel stehen), Wiegen, Glitzern und Böen weg.
- **Böden in eigener Höhe** (gegen Z-Fighting, gemeldet): Stadt 0,012,
  Wald 0,018, Feld 0,024 (Maße der Kachel), mit wachsendem `polygonOffset`.
  Und `HexBoardView.add` zeichnet nichts, was schon liegt oder zu einem
  inzwischen geleerten Brett gehört (`generation`) — zwei Kopien derselben
  Stelle flimmerten ineinander.
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
- **Kachelformen** (geprüft gegen alle 129 Muster aus Wasser/Weg/Land je
  Kante, bis auf Drehung): Jede reine Fluss- und jede reine Wegform mit 1–6
  Armen hat ein Modell (seit `coast-A`, die Bucht mit einer Wasserkante, und
  `river-L`, sechs Arme, dazukamen). Gemischt Fluss + Weg gibt es nur die
  zwei Brücken (`crossing-A/B`); für die übrigen 101 gemischten Muster hat das
  Regal keine Modelle. `hex_coast_E` hat keine Wasserkante (nur ein Strand an
  einer Ecke) und ist deshalb nicht dabei.
- **Mehr Gelände**: Schienen (gibt es im Regal nicht), Gebirge
  (`mountain_*`, `hills_*` liegen bereit).
- **Die nächste Kachel** sieht man noch nicht — nur die oberste.
- **Große Bretter** (gefragt: _„Wir sollten uns was überlegen, wenn wir noch
  größere Karten später bauen, was dann?"_). Heute: ein Zeichenaufruf je
  Modell (`Batch`), egal wie viele Kacheln — das trägt Hunderte. Der Plan,
  in dieser Reihenfolge, je nachdem was zuerst klemmt:
  1. **Messen** (Dreiecke, Draws, ms) mit einem Brett von 300–500 Kacheln.
  2. **Weit draußen ohne Deko**: ab einem Abstand nur Kacheln und Böden,
     Bäume und Häuser weg (oder je Kachel ein flaches Bild). Spart die
     meisten Dreiecke — von oben sieht man sie ohnehin nicht mehr.
  3. **Bündel je Abschnitt** (z. B. 8 × 8 Kacheln) statt eines fürs ganze
     Brett: Dann kann three.js Abschnitte außerhalb des Bildes weglassen
     (`frustumCulled` steht heute aus).
  4. **Eine Übersichtskarte** als 2D-Bild (eine Farbe je Kachel) in einer
     Ecke, mit Tippen zum Hinfliegen — wie die Auftragsliste.
  5. Schatten und Wind nur nahe der Kamera.

## Optimierung von _Intelligent_

Gewünscht: _„Lass den intelligenten Modus ein paar hundert Runden spielen und
notiere in der Hex-Welt-Datei den Schnitt der Punkte. Spiele selbst ein paar
Runden und notiere, ob du über den Schnitt gekommen bist und wenn ja, welche
Verbesserungen bzw. Taktiken du genutzt hast. … Am Ende soll dann ein neuer
Vorschlag-Modus ‚intelligent optimiert' kommen, damit man mit jetzt
vergleichen kann."_

**Werkzeuge**

- `src/worlds/hexland/hexPlanner.ts`: `scorePlacement(…, 'smart' | 'optimized')`
  und `bestPlacement`. `smart` ist _Intelligent_ (eingefroren als
  Vergleich), `optimized` ist _Intelligent (optimiert)_ — die Spielhilfe
  gleichen Namens im Spiel rechnet genau damit (`autoPlace` →
  `bestPlacement`, samt Vorausschau auf die nächste Stapelkachel, Runde 2o;
  dafür legt `HexBoard.tryPlace` probehalber und stellt alles wieder her).
- `npm run hexbench -- [Runden] [erster Samen] [Strategien] [Prozesse]` —
  normale Runden, immer die beste Lage; Schnitt ± Standardfehler, Posten,
  und bei zwei Strategien der Unterschied **je Samen** (genauer).
  Tuning auf Samen 1–300, Gegenprobe auf 5001–5300 (nicht zum Tunen).
- `npm run hexplay -- new|show|place|auto <Datei> …` — von Hand spielen,
  ohne Browser: Brett, Auftragsstapel, Hand und die besten Lagen mit allen
  Posten von `assess`.

**Ausgangswert** (Oktober 2026, vor der Optimierung): _Intelligent_
**59,30 ± 1,82** Punkte je Runde (300 Runden, Samen 1–300; Aufträge 47,6,
Flaggen 1,5, Fluss 5,4, Weg 4,7; 9,6 Aufträge erfüllt, 0,03 verpasst,
2,9 am Ende noch offen).

**Ergebnis** (nach sechs Runden): _Intelligent (optimiert)_ **110,10** gegen
59,30 auf Samen 1–300 (**+50,80 ± 2,20** je Samen) und **108,62** gegen 58,90
auf der nicht getunten Gegenprobe 5001–5300 (**+49,72 ± 2,44**); Aufträge
47,6 → 88,7, Flaggen 1,5 → 5,7. Rechenzeit 2,9–3,2 × smart (≈ 3,8–3,9 s je
Runde). Den Unterschied machten: **Opfern der eigenen Auftragskachel** —
überfüllen statt festlegen, solange Aufträge nachkommen (6c/6f, +14,2),
**Festfahren** über die Chance je Auftrag samt Opfern Hoffnungsloser (3b,
+14,4), dazu der eigene Auftrag der Kachel (6b/6e, +9,5), **Sofortgewinn** an
Flaggen, Fluss und Weg (1a, +5,1), **Vorausschau** auf die nächste
Stapelkachel (2o, +3,2), `ready` nur mit andockbarem Feld (2f, +3,4) und
seltenes Gelände Fluss/Weg × 2 (2d, +2,1). Nichts brachten: Gewichte drehen
(`ready`, `side`, × 15, Schwellen), Brücken, Stapeln, Opfern nach fester Zahl
fehlender Kacheln oder nach „erwartete Treffer < Fehlende" für alle Aufträge
(4a, −3,6), Arme ins Leere, eine breitere Vorausschau (6d). Die Lehre der
Spieler: Punkte kommen aus dem **Durchsatz an Aufträgen** — ein fest
liegender Auftrag sperrt ein Drittel davon; von Hand kamen auf manchen Samen
140–165 Punkte. Im Spiel ist unter den Spielhilfen „Intelligent (optimiert)"
zum Vergleich mit „Intelligent" wählbar.

### Selbst gespielt

#### Runde 1

Von Hand (`hexplay`, nur 3 von 138 Zügen per `auto … smart`) gegen `auto 99 smart`:
Samen 1001 **165** gegen 83, Samen 1002 **162** gegen 56 — beide weit über 59,3.
Erfüllt 28 und 26 Aufträge (smart 14 und 9; bei smart lagen am Ende je **drei
Aufträge fest**, 13 bzw. 18 Aufträge kamen nie). Der Unterschied ist der
**Durchsatz an Auftragskacheln**, nicht Fluss oder Weg. Was ihn gemacht hat:

- **Stapeln**: Auftragskachel in das Gebiet eines offenen Auftrags desselben Geländes mit gleicher oder größerer Zahl (A4+A5, H6+H6, F4+F6, F5+F6, w4+w5, r6+r6) — ein Gebiet zahlt zweimal. Merkmal: Auftrag der Kachel landet in einem Gebiet mit offenem Auftrag, Zahl ≥ eigene und Größe danach ≤ eigene → etwa +15.
- **„Bereit" auch für vergebene Gebiete**: Ein Gebiet mit offenem Auftrag (Zahl T, Größe s) ist bereit für einen kommenden Auftrag s+1 ≤ T; `readiness` zählt es nicht.
- **Bereit nur, wenn eine Landkachel andocken kann**: Ein bereites Gebiet, dessen einziges freies Feld Wasser oder Weg verlangt, ist wertlos (1002: F4 kam, passte nicht). Merkmal: `ready` nur zählen, wenn ein angrenzendes freies Feld keine harte Kante fordert.
- **Brücken**: freies Feld, das zwei Gebiete desselben Geländes berührt, deren Größen + 1 genau die Zahl ergeben (A5, A6, H6 in 1001; r6+r6 in 1002 gab +14). Merkmal: je freiem Feld Summe der angrenzenden Gebietsgrößen + 1 = Zahl eines offenen Auftrags → +10.
- **Hoffnungslose Aufträge opfern**: Weg-Auftrag mit Sackgasse oder ≥ 3 fehlenden Wegkacheln, H6 ohne passendes Feld — absichtlich überfüllen (an den langen Weg hängen, +1 Weg) gibt den Platz frei; viermal getan, die nächste Auftragskachel war jedes Mal bald fertig. smart rechnet dafür −88 bis −105. Merkmal: `breaks` nur bestrafen, wenn der Auftrag realistisch noch geht; sonst +3…5, solange der Auftragsstapel nicht leer ist.
- **Seltenes Gelände zuerst**: Weg- (~12 %) und Flusskacheln (~20 %) für Weg-/Fluss-Aufträge verwenden, Wald/Stadt kommen ohnehin wieder. Weg-Sackgasse eines Auftrags an den vorhandenen Weg hängen (r6 1001: smart wollte sie allein legen); Küste w6 an den großen Fluss (5/6) statt Weizen-Fortschritt (smart 19 gegen 10). Merkmal: `progress` für Fluss/Weg ×2.
- **Flaggen schließen**: +3, +5, +7, +8 sofort — smart wertet solche Lagen mit 1–2. (Deckt sich mit Runde 1a.)
- **Keine Arme ins Leere**: Fluss-/Wegarme nicht auf Felder richten, die schon eine andere harte Kante verlangen (tote Felder) oder das einzige Wachstumsfeld eines Auftrags sind.

#### Runde 2

Alle Züge von Hand gegen `auto 99` (optimized im Stand vom Lauf, Arbeitskopie mit Runde 1a): Samen 1003 **142** (24 erfüllt, 6 verpasst — alle absichtlich) gegen smart **11** (1) und optimized **18** (1); Samen 1004 **144** (23 erfüllt, 7 absichtlich verpasst) gegen smart **31** (5) und optimized **37** (5). Von Hand kam der **ganze Auftragsstapel** (30) auf den Tisch, bei 1003 waren danach noch 13 Landkacheln übrig. Bei beiden Strategien lagen in beiden Samen **ab dem 4.–8. Zug drei Aufträge fest**: Ihr einziges freies Feld verlangt eine harte Kante plus das Gelände (1003: H6 4/6 und r4 3/4 teilen sich ein Feld, das Weg *und* Stadt braucht; 1004: A6+A5 2/x hinter einem Feld, das Wasser verlangt). `slotFor` nennt so ein Feld `grow`, weil *irgendeine* Kachel passt — in 40 Zügen kam keine.

- **Festfahren vermeiden ist der größte Hebel** (neu): Ich habe denselben Fehler einmal selbst gemacht (1004, A4 nur über ein Wasserfeld erreichbar) und ihn mit der einzigen passenden Kachel gerettet (smart wertete die Rettung 22, einen bloßen Weizen-Schritt 24). Merkmal: je offenem Auftrag die **Wahrscheinlichkeit**, dass eine Zufallskachel aus dem Stapel an einem seiner freien Felder passt und das Gebiet weiterführt (Gewichte aus `BASE_TILES`, alle Drehungen), statt nur ja/nein; Lage, die sie unter ~15 % drückt, −25; Lage, die sie von dort hebt, +15.
- **Erfüllen und Opfern mit einer Kachel** (neu, 4×, je +5…+7 sofort): Auftragskachel ins Gebiet eines offenen Auftrags derselben Art, das dadurch genau dessen Zahl erreicht, die eigene Zahl aber überschreitet (w4 → w5 fertig, w5 → w6 fertig, r4 → r5 fertig). Zwei Plätze frei, Punkte sofort; smart −7 bis −29. Merkmal: `completes` darf das `breaks` des *eigenen* Auftrags der Kachel nicht aufwiegen lassen → +Punkte×4.
- **Opfern** bestätigt (9×, je +1 Weg/Fluss): r4/r5/r6 ohne Weg in Reichweite sofort an den langen Weg; danach kam fast immer eine Auftragskachel, die sofort fertig wurde (r6-Opfer → A6 sofort +6). **Aber nicht in ein bereites Gebiet opfern**: 1004 r5 an den 5er-Weg, der für r6 bereit war — r6 kam als Nächstes (≈ −6). Merkmal: Überfüllen kostet `ready` des Zielgebiets.
- **Stapeln** bestätigt (11×, je Gebiet doppelt): auch gleiche Zahlen (A4+A4 → +8 mit einer Kachel). **Bereit/Brücken** bestätigt (≈10 Sofort-Erfüllungen, je +4…+6); Brücken über zwei Gebiete (H 3+2+1 → H6, A 3+1+1 → A5).
- **Flaggen vorbereiten** (neu): Flaggengebiete ohne Auftrag Feld für Feld zumachen (Gras/Wald an die offenen Kanten) brachte 1004 +6 und +5; ein 13er-Weizen mit Flagge blieb an einem Feld hängen, das nur eine Küstenkachel schließt. Merkmal: je geschlossenem freien Feld eines Flaggengebiets +Größe/(offene Felder), Felder mit harter Kante nicht mitzählen. optimized sieht nur den letzten Schritt (`imm`).

#### Runde 3

Samen 1005, alle 54 Züge von Hand: **76** (11 erfüllt, 1 absichtlich verpasst) gegen smart **57** (9) und optimized **58** (9; Arbeitsbaum 23:44) bzw. **70** (11; Arbeitsbaum 00:01). Diesmal lagen **bei allen dreien, auch bei mir, am Ende drei Weg-/Wasser-Aufträge fest** (ich: r5 1/5 ab Zug 10, r6+r5 3/x ab Zug 37) — weil nur bei < 3 offenen Aufträgen eine Auftragskachel kommt (`openTasks`), kamen danach 15 (smart 18) Aufträge nie. Samen 1006 nur bis Zug 23 (36 Punkte, 5 erfüllt, 2 geopfert; smart 39, optimized 108). Festfahren erkennt man **beim Legen**, nicht erst später:

- **Erwartete Treffer E gegen Fehlende m**: je offenem Auftrag m = Zahl − Größe und p = Anteil der Stapelgewichte (`BASE_TILES` × 6 Drehungen), die an mindestens einem freien Feld des Gebiets legal passen *und* das Gelände anschließen; E = p × Kacheln, die noch kommen (Stapel + 1 je noch zu erfüllendem Auftrag). Wegkachel ≈ 14 %, Flusskachel ≈ 17 %, Weg-Sackgasse (`road-M`) 1,3 %. **E < m → fest**. Mein r5 hatte ein Feld, das nur eine Sackgasse schließt (alle anderen Nachbarn belegt, weiche Kanten) und eines, das Weg auf zwei Nachbarkanten verlangt: E ≈ 17 × 0,03 = 0,5 bei m = 4 — schon beim Legen fest.
- **Arme nur ins Offene**: Weg-/Flussarm eines Auftrags auf ein Feld mit ≥ 4 freien Nachbarn richten, nie auf ein Feld, das schon eine andere harte Kante oder ≥ 3 belegte Nachbarn hat. 1006 so gelegt (r5+r5 gestapelt, beide Arme ins Leere) → +11 nach 17 Zügen.
- **Opfern, sobald E < m**: Weg-/Wasser-Auftragskachel mit E < m sofort an einen Weg/Fluss hängen, der die Zahl schon überschreitet (1006 zweimal r4 an den 6er-Weg: verpasst, +1 Weg, Platz bleibt frei; der nächste Auftrag F6 war 1 Zug später fertig). Ein fest liegender Auftrag kostet nicht seine Punkte, sondern **ein Drittel des Auftragsdurchsatzes für den Rest der Partie** (≈ 5 Aufträge × 5 Punkte, wenn er früh festliegt).
- **Zwei Weg-Aufträge in ein Gebiet stapeln** statt zwei Wege bauen: r5+r5 brauchen dann 3 statt 8 Wegkacheln. Aber nie einen dritten festen Auftrag zulassen: liegen schon 2 fest, ist jede Lage, die den dritten festlegt, die schlechteste.

#### Runde 6 (Analyse)

Fair verglichen (`hexplay auto … 1 optimized` Zug für Zug, derselbe Würfel wie von Hand): optimized auf 1001–1005 **62, 100, 74, 155, 138** gegen von Hand 165, 162, 142, 144, 76 — der Abstand liegt nicht in jedem Samen, aber wo, dann so:

- **Opfern**: von Hand je Partie 1–7 Aufträge absichtlich verpasst, optimized 0–2 (im Benchmark 0,3 je Partie). Fast immer war es die **frisch gezogene** Auftragskachel, die gleich überfüllt wurde — optimized bestrafte das mit −100 und legte sie lieber dorthin, wo ihr Auftrag „noch ging".
- **Lebensdauer** eines Auftrags von Hand 4,5–5,4 Züge, optimized 8,4–9,9; darum kamen bei optimized nur 11–20 der 30 Aufträge auf den Tisch, von Hand alle 30.
- **Festfahren mit der eigenen Kachel**: Was am Ende festlag, waren Fluss-/Weg-Aufträge (o1001: w4 1/4 ab Zug 24, 28 Züge lang; r6 2/6, r5 4/5), die **schon beim Legen** keine Chance hatten — `stuckGain` sah nur die Aufträge, die schon lagen, nicht den der Kachel selbst.
- Gestapelt wurde ähnlich oft (optimized 1–8, von Hand 5–10 je Partie); Flaggen, Fluss und Weg machen den Abstand nicht.
- Im Benchmark (Samen 1–40): 15,5 Aufträge gezogen, 12,4 erfüllt, 2,8 am Ende offen, die letzte Auftragskachel kam im Mittel bei Zug 47 von 55.

### Runden des Optimierers

| Runde | Idee | optimiert − smart (Samen 1–300) | behalten |
|---|---|---|---|
| 1a | Sofortgewinn an Flaggen, Fluss und Weg (Unterschied von `scoring()` ohne Aufträge, als läge die Kachel schon) × 8 | +5,14 ± 1,41 (Flaggen 1,5 → 4,8) | ja |
| 1b | wie 1a, aber × 15 | +3,45 ± 1,50 (gegen 1a −1,7; Aufträge 48,1 → 45,1) | nein |
| 1c | 1a + −10 je freiem Nachbarfeld, das die Lage tot macht (`slotFor` → `dead`) | +5,86 ± 1,58 (gegen 1a +0,72 ± 0,86) | nein |
| 1d | 1a, `closer` (Größe/Zahl) ersetzt durch 1/(Zahl − Größe) | gegen 1a −0,70 ± 0,84 | nein |
| 1e | 1a, `ready` 8 → 16 | gegen 1a −2,50 ± 1,26 | nein |
| 1f | 1a, `progress` 5 → 10 | gegen 1a +0,44 ± 0,46 | nein |
| 1g | 1a, `ready` 8 → 4 | gegen 1a +0,42 ± 1,41 | nein |
| 1h | 1a + −2 je offener Kante, die Gebiete mit Flagge dazubekommen (Flaggen 4,8 → 5,8, Aufträge 48,1 → 47,9) | gegen 1a +0,76 ± 1,01 | nein |
| 2-Gegenprobe | Stand 1a auf den Samen 5001–5300 (nicht getunt) | +4,58 ± 1,39 (smart 58,90, optimiert 63,49; Flaggen 1,4 → 4,4) | — |
| 2a | 1a + Opfern: kein −100, sondern +20, wenn ein Weg-/Fluss-Auftrag, dem ≥ 3 fehlen, überfüllt wird (solange der Auftragsstapel nicht leer ist) | gegen 1a −0,19 ± 0,19 | nein |
| 2b | wie 2a, schon ab 2 fehlenden | gegen 1a +0,45 ± 0,47 | nein |
| 2c | wie 2a, alle Gelände, ab 3 fehlenden (+20 auch fürs Überfüllen eines schon unmöglichen Auftrags: trat nie auf — am Ende offene Aufträge sind fast nie formal unmöglich, sondern warten auf seltene Kacheln) | gegen 1a ±0,00 ± 0,29 | nein |
| 2d | 1a, `progress` und `closer` für Fluss- und Weg-Aufträge × 2 | +7,23 ± 1,53 (gegen 1a +2,10 ± 0,63) | ja |
| 2e | 1a, `ready` auch für Gebiete mit offenem Auftrag (Größe + 1 ≤ dessen Zahl) | gegen 1a −0,72 ± 1,14 | nein |
| 2f | 1a, `ready` nur für Gebiete, an denen ein freies Feld keine harte Kante verlangt (`readiness(land)`) | +8,56 ± 1,59 (gegen 1a +3,42 ± 0,98) | ja |
| 2g | 1a + 10 je Brückenfeld (Größen der angrenzenden Gebiete + 1 = Zahl eines offenen Auftrags) | gegen 1a −1,11 ± 1,28 | nein |
| 2h | 1a − 5 je Fluss-/Wegarm auf ein freies Feld, an dem schon eine harte Kante liegt | gegen 1a +1,38 ± 1,35; auf 2d+2f +0,87 ± 1,36 | nein |
| 2i | 1a + 15 fürs Stapeln (eigener Auftrag im Gebiet eines offenen mit gleicher oder größerer Zahl) | gegen 1a +0,20 ± 0,17 | nein |
| 2j | 1a, `side` 8 → 6 / 8 → 10 | gegen 1a −0,92 ± 0,62 / −0,24 ± 0,58 | nein |
| 2k | 1a + 1c + 1h zusammen (−10 je tot gemachtem Nachbarfeld, −2 je neuer offener Kante an Flaggengebieten), Samen 1–600 | gegen 1a −0,50 ± 0,79 | nein |
| 2l | 1a + Belohnung für Gebiete Zahl−1 (≥ 2 freie Felder, 8) und Zahl−2 (4) je Auftrag im Stapel | gegen 1a −11,08 ± 1,91 (zieht alles auseinander) | nein |
| 2m | 1a + Vorausschau: die 3 besten Lagen (höchstens 15 unter der besten) probehalber legen, nächste Stapelkachel bestens dazu × 0,5 (Auftragskachel als nächste: pauschal 15) | +10,32 ± 1,77 (gegen 1a +5,19 ± 1,49), aber 3,4 × Rechenzeit von 1a | — |
| 2n | 2d + 2f zusammen | +9,50 ± 1,64 (gegen 1a +4,36 ± 1,08) | ja |
| 2o | 2n + Vorausschau mit nur 2 Lagen, höchstens 10 bzw. 5 auseinander | +12,86 ± 1,84 / **+12,70 ± 1,85** (gegen 2n +3,36 ± 1,40 / +3,20 ± 1,37); Aufträge 47,6 → 55,3, erfüllt 9,6 → 11,1 | ja (5) |
| 2-Ende | Stand 2o auf den Samen 5001–5300 (nicht getunt); Rechenzeit 3,2–3,9 × smart (`hexbench`: 332 s gegen 104 s, auf 1–300 348 s gegen 89 s) | +8,22 ± 1,59 (smart 58,90, optimiert 67,12; Aufträge 47,6 → 50,8, Flaggen 1,4 → 4,6) | — |
| 3a | Rechenzeit: Stand vor dem Zug (`HexBoard.assessBase`: Aufträge und bereite Gebiete, dazu Wertung ohne Aufträge) je Zug nur einmal statt je Lage zweimal | ±0,00 ± 0,00 gegen 2o (gleiche Züge); Rechenzeit 4620 → 2956 ms je Runde, 3,9 → 2,5 × smart | ja |
| 3b | 3a + **Festfahren**: je offenem Auftrag die Chance, dass eine Stapelkachel (Gewichte aus `BASE_TILES`, alle Drehungen, Land nach `landWeights`) an einem seiner freien Felder passt und das Gelände anlegt; nur für Aufträge neu gerechnet, an deren freien Feldern die Lage etwas ändert. Unter 15 % drücken −25, von dort heben +15; Auftrag schon davor unter 3 % opfern: kein −100, sondern +4 (solange Aufträge nachkommen). Mit 3c | +27,12 ± 2,09 (gegen 2o **+14,42 ± 1,64**; Aufträge 55,3 → 68,7); 2,6 × smart | ja |
| 3c | 3b ohne „Erfüllen und Opfern" (eigener Auftrag der Kachel zählt nicht als `breaks`, wenn die Lage einen anderen erfüllt) | gegen 3b −2,41 ± 0,78 — das Erfüllen-und-Opfern bringt also +2,4 | ja (in 3b) |
| 3d | 3b, hoffnungslos schon unter 6 % | gegen 3b −0,06 ± 0,51 | nein |
| 3-Ende | Stand 3b; Samen 1–300 und Gegenprobe 5001–5300 (nicht getunt); Rechenzeit 3128–3694 gegen 1193 ms je Runde (2,6–3,1 ×, Wiederholung schwankt), auf 5001–5300 3605 gegen 1321 ms (2,7 ×) | 1–300: **+27,12 ± 2,09** (smart 59,30, optimiert 86,42; Aufträge 47,6 → 68,7, Flaggen 1,5 → 5,2); 5001–5300: **+25,93 ± 2,04** (smart 58,90, optimiert 84,83; Aufträge 47,6 → 68,0, Flaggen 1,4 → 4,7) | — |
| 4a | 3b, statt der festen 15-%-Schwelle erwartete Treffer E = Chance × (Stapel + offene Aufträge im Auftragsstapel) gegen Fehlende m = Zahl − Größe: Kippen auf E < m −30, zurück +15; Opfern nur bei E < m (Runde 3 der Spieler) | gegen 3b −3,64 ± 1,42 (optimiert 82,77; Aufträge 68,7 → 65,4) | nein |
| 5a | 3b, Festlegen kostet −40 statt −25 | gegen 3b +0,65 ± 0,60 (optimiert 87,06) | nein |
| 5b | 3b, Befreien bringt +25 statt +15 | gegen 3b −0,16 ± 0,16 (optimiert 86,26) | nein |
| 5c | 3b, fest schon unter 10 % statt 15 % | gegen 3b +1,43 ± 1,00 (optimiert 87,84; Aufträge 68,7 → 70,3) — unter 2 SE | nein |
| 5d | 3b, fest erst unter 20 % | gegen 3b −0,14 ± 1,14 (optimiert 86,28) | nein |
| 6a | 3b, liegen alle drei offenen Aufträge unter 15 %, darf jeder davon (nicht nur unter 3 %) geopfert werden | gegen 3b +0,36 ± 0,34 (optimiert 86,78) | nein |
| 6b | 3b + der **eigene Auftrag** der Auftragskachel zählt beim Festfahren mit: liegt er nach dem Legen unter 15 %, −25 (bisher durfte sie sich gleich festlegen) | gegen 3b **+3,09 ± 0,85** (optimiert 89,51) | ja |
| 6c | 6b + **eigene Auftragskachel opfern**: Überfüllt eine Fluss- oder Weg-Auftragskachel ihren eigenen Auftrag, kein −100, sondern +4 (solange Aufträge nachkommen) | gegen 6b **+10,98 ± 1,25** (optimiert 100,49; Aufträge 72,0 → 80,9) | ja |
| 6e | 6c + eigener Auftrag auch fest, wenn Chance × Stapel < fehlende Kacheln (−25) | gegen 6c **+6,42 ± 0,92** (optimiert 106,91) | ja |
| 6f | 6e, Opfern der eigenen Auftragskachel für alle Gelände, nicht nur Fluss und Weg | gegen 6e **+3,19 ± 1,07** (optimiert 110,10; Aufträge 88,7) | ja |
| 6g | 6f, Opfern bringt +15 statt +4 | gegen 6f −6,67 ± 1,84 (optimiert 103,44) | nein |
| 6h | 6f, Opfern kostet −10 statt +4 zu bringen | gegen 6f −3,21 ± 1,21 (optimiert 106,90) | nein |
| 6d | 6f, Vorausschau über die 3 besten Lagen, höchstens 10 auseinander | gegen 6f +0,49 ± 1,11 (optimiert 110,60), Rechenzeit +31 % | nein |
| 6-Ende | Stand 6f; Samen 1–300 und Gegenprobe 5001–5300 (nicht getunt); Rechenzeit 3844 gegen 1193 ms je Runde (3,2 ×), auf 5001–5300 3894 gegen 1321 ms (2,9 ×) — längere Partien, weil mehr Aufträge kommen | 1–300: **+50,80 ± 2,20** (smart 59,30, optimiert 110,10; gegen 3b +23,68; Aufträge 47,6 → 88,7, Flaggen 1,5 → 5,7); 5001–5300: **+49,72 ± 2,44** (smart 58,90, optimiert 108,62; gegen 3b +23,79 ± 1,68; Aufträge 47,6 → 87,8) | — |
