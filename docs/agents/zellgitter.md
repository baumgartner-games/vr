# Das Zellgitter: halbe Kacheln, Figuren auf 2 × 2, Wände unter 45°

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

**Gewünscht (September 2026):** Jede Kachel wird in vier kleine Felder geteilt,
und zwar in der ganzen Welt. Eine mittelgroße Figur belegt davon 2 × 2, wie in
D&D. Wände unter 45° sperren in ihrer Kachel `[ ][x] / [x][ ]`. Möbel bleiben
1 × 1 m und werden weiter nur auf ganzen Metern gesetzt, damit es optisch bei
den großen Kacheln bleibt.

## Was gilt

- **Gebaut wird auf Metern, gestanden auf halben** (`nav/cellGrid.ts`).
  - `TILE` bleibt 1 m (`nav/navTile.ts`): Wände auf Kachelkanten, Möbel und
    Einbauten auf ganzen Kacheln, Weltdateien in Kacheln.
  - `CELL` = 0,5 m. Eine Figur steht **logisch** auf einem Block von 2 × 2
    Zellen (`CellPos`, die Mitte in halben Metern: `snapCell`), **optisch**
    dazwischen.
  - In VR bleibt der Kopf frei. Logisch zählt, wohin die Füße gerundet
    werden.
- **Ein Block ist frei** (`CellGrid.footprintFree`), wenn:
  - alle vier Zellen Boden haben,
  - keine davon von einer Schräge gesperrt ist,
  - und keine Wand, kein Fenster und keine geschlossene Tür über eine Fuge
    *innerhalb* des Blocks läuft.

  Eine Figur kann also auf der Fuge zweier Kacheln stehen, wo keine Wand ist,
  und mitten in einer Tür.
- **Ein Schritt geht in acht Richtungen, und es zählt nur der Block am Ziel**
  (`CellGrid.canStep`). Die beiden geraden Zwischenstellungen eines
  Schrägschritts müssen nicht frei sein.

  Diese Regel hat der Besitzer festgelegt, mit genau diesem Bild: An einer
  Außenecke zweier Hindernisse, die sich nur über Eck berühren, schlüpft die
  Figur schräg hindurch:

  ```
  [w][ ][ ]      [w][p][p]
  [p][p][ ]  →   [ ][p][p]
  [p][p][w]      [ ][ ][w]
  ```

  An einer 45°-Wand läuft man damit schräg entlang, ohne Zickzack.
  `findPath` ist A\* über genau diese Schritte (gerade 1, schräg √2).
- **Die Schräge** (`Slope`: `slash` „╱" von Südwest nach Nordost, `backslash`
  „╲" von Nordwest nach Südost) steht im **Bauplan** und nicht im Graphen:
  - Setzen: `GridPlan.slope(x, z, slope | null)`, abfragen:
    `GridPlan.slopeAt(key)`.
  - Der Graph kennt nur Kanten zwischen Kacheln, eine Schräge teilt aber eine
    Kachel.
  - Für die Wegsuche über ganze Kacheln (`nav/navPath.ts`, NPCs) wird die
    Kachel teuer (`SLOPE_COST` = 6), nicht gesperrt.
  - Gebaut wird sie als eine Wand voller Höhe über die Diagonale, um ±45°
    gedreht (`gridPlan.slopeSolid`, `PlanSolid.yaw`).
  - `PortalWorld.slab` dreht das Mesh vor dem Collider, und das Bündeln
    übernimmt die Drehung.
  - Wer nur Kästen kennt (`solidBounds`, Ghosting), sieht einen Kasten um die
    Mitte.
- **Der Spieler geht in der Ebene** (`PhysicsLocomotion.plane`, gestellt von
  `GridWorld.playerPlane`, Rechnung in `nav/planeMove.ts`, seit Oktober 2026):
  - Gewünscht: _„nicht mit der 3D-Kollision, sondern auf der 2D-Ebene … die
    Spieler bewegen sich an sich nur in der 2D-Ebene."_ Das Verhalten heißt in
    Spielen **Wall Sliding** bzw. **Collide and Slide**.
  - Der Spieler ist ein **Kreis** (`PLAYER_PLANE_RADIUS` = 0,35 m — klein
    genug, dass er über Eck durch das Bild oben schlüpft), die Welt
    eine Menge von **Strecken** (`cellPlaneWalls`): geschlossene Kanten (Wand,
    Fenster, geschlossene Tür, eingerastete Regalwand, von beiden Seiten
    gefragt), Schrägen als Diagonale ihrer Kachel, gesperrte Zellen (Möbel,
    fehlender Boden) als Kästen.
  - Ein Schritt wird in Stücken von einem Viertel des Radius gemacht, danach
    wird der Kreis aus der Wand geschoben, in der er am tiefsten steckt —
    senkrecht zu ihr (`slideCircle`). Übrig bleibt der Anteil **längs** der
    Wand: gleiten an jeder Wand, in jedem Winkel, ohne Fallunterscheidung. An
    einem Wandende rundet der Kreis die Ecke.
  - Vorher probierte der Schritt „ganz, nur x, nur z, längs der Diagonalen"
    (`diagonalSlides`, `gateStep`) — an einer Schräge gewann je Bild eine andere
    Möglichkeit, und das war das Ruckeln (gemeldet: _„Beim Laufen gegen eine
    schräge Wand ruckelt der Spieler"_).
  - Wände, Türen, Fenster, Schrägen und Möbel der Gitterwelten tragen
    `PlanSolid.cell` und sitzen in der Physik im eigenen Bit `GROUP_CELL`.
    Die Kapsel des Spielers geht durch sie hindurch (`PLAYER_FILTER`), denn
    über sie entscheidet allein die Ebene. Die Physik trägt den Spieler nur
    noch in der Höhe: Böden, Podeste, Massen und bewegliche Kisten.
  - Gefragt wird auf der Etage, auf der die Füße stehen; außerhalb des
    Grundrisses auf Etage 0, dort ist das Nichts frei (`voidIsFree`).
  - **Die Treppe ist ein Gang mit Einbahnwänden** (`CellSource.flight`,
    `GridPlan.flightOn`): Ihre Seiten halten nur von außen
    (`PlaneWall.outside`) — hinauf geht es nur von unten, herunter überall.
    Wer halb auf ihr steht, wird nicht mit einem Ruck hinausgeworfen, er kommt
    nur nicht zurück. Neben einem Lauf derselben Richtung (breite Treppe) ist
    keine Seite.
  - **Wo der Lauf nur eine Stufe hoch ist, ist die Seite offen**
    (`GridPlan.flightSideOpen`, `CellSource.flightSide`): Jede Seite einer
    Treppenkachel zählt als zwei Hälften zu einer Zelle, und eine Hälfte ist
    keine Wand, wenn der Lauf auf ihr höchstens 0,35 m (`FLIGHT_SIDE_STEP`,
    dieselbe Zahl wie `FLIGHT_CATCH`) über oder unter dem Boden daneben liegt.
    Gewünscht: _„an der untersten Treppe … dass diese 2x2 Treppe über der
    unteren 2x1 auch von beiden Seiten betreten werden kann — bzw. generell
    Treppenarten, die auf einer der Ebenen anfangen"_. Bei einer Treppe, die
    auf einer Etage anfängt, ist das die untere Hälfte ihrer untersten Kachel
    (0,175 m bis 0,525 m), bei einer Rampe die ganze unterste Kachel, neben
    einem Podest die Hälften auf seiner Höhe. Die Bewegung selbst ist
    unverändert: Hinter der offenen Hälfte fängt der Schritt die Füße wie am
    Fuß des Laufs. Der Graph (Bots, NPCs) verband die Treppenkacheln seitlich
    schon immer; Haunting hat keine Treppen und fragt nicht.
  - **Auf der Treppe wird nur die Höhe bewegt** (`GridPlan.flightFloor`): Kein
    Controller klettert Stufe für Stufe, die Höhe folgt einer Linie über die
    Vorderkanten der Stufen — unten die erste Stufe, oben die letzte, nie in
    einer Stufe. Gilt für Treppe und Rampe, sobald die Füße höchstens 0,35 m
    daneben sind (`FLIGHT_CATCH`).
  - **Springen gibt es dort nicht**: Über eine Wand, die nur in der Ebene steht,
    springt man nicht hinweg (_„Springen kann an sich dann auch raus"_). Welten
    ohne Gitter springen weiter.
  - **Die Physik berührt den Boden nicht mehr seitlich** (`walkPlane`): Der
    waagerechte Schritt wird eine Stufe (0,32 m) über dem Boden gerechnet —
    dort halten nur Kisten, Brüstungen, Säulen —, die Höhe kommt aus einem
    Formwurf nach unten. Vorher hakte der Character-Controller mit der Sohle an
    den Fugen zwischen den Bodenkörpern und schluckte alle paar Dutzend Bilder
    einen ganzen Schritt, auch wenn die Ebene ihn hergab. Gemessen im
    Wandparcours; das war das Stocken beim Gleiten (_„klappt manchmal und
    manchmal nicht"_).
  - **Wo der Kreis nicht hinpasst, bleibt er stehen**: Steckt er nach allen
    Runden des Herausschiebens noch in einer Wand (eine Lücke schmaler als er,
    etwa zwischen einer Schräge und einer Mauerecke der Station), gilt das
    Stück des Schritts nicht. Vorher pendelte er dort Bild für Bild zwischen
    zwei Stellen.
  - **Haunting ebenso** (`StationCells.slide`): Der Techniker — und damit der
    Spieler in der 3D-Station, der durch die Runde geht (`flatKernel.ts`) —
    gleitet in der Ebene. Die Runde bewegte ihn bis dahin noch mit
    `moveOnCells`, und an den schrägen Ecken stockte er (gemeldet: _„auf der
    Testwelt klappt das Wandgleiten super, bei Haunting anscheinend nicht"_).
    Das Monster geht weiter auf Blöcken (`moveOnCells`).
  - Getestet mit echtem Rapier an Treppe und Podest und an einem Boden aus
    einzelnen Kacheln (`physics/playerPlane.test.ts`), dazu an den Schrägen
    der Station (`haunting/map/stationSlide.test.ts`).
- **Einrichtung, die nicht im Plan steht, sperrt über `cellBlocked`** —
  gemeldet: _„im Burgerladen kann ich über die Möbel laufen … Wir wollten die
  2D-Welt als Ground Truth nutzen, 3D-Physik nur zum Anzeigen."_ Burgerladen
  (Stationen, Theke, Tische, Deko, am Abend Gekauftes) und Hub (Bänke, Lampen,
  Pflanzen) stellten ihre Stücke nur als unsichtbare Physik-Körper auf; die
  Ebene des Spielers kannte sie nicht, und `walkPlane` hob die Figur auf ihre
  Oberkante. Jetzt trägt jede Grundfläche ihre Zellen ein
  (`cellGrid.footprintCellKeys`, dieselbe 15-cm-Regel wie `furnitureCells`),
  und die Welt meldet sie über `GridWorld.cellBlocked` — wie
  `HauntingWorld` die Einrichtung der Station. **Wer eine neue Welt mit
  eigener Einrichtung baut, geht diesen Weg**, nicht über einen Physik-Körper
  allein.
- **Möbel sperren Zellen** (`GridPlan.furnitureCells`, `boxCells`):
  - Gesperrt ist jede Zelle, in die ein Quader eines Bausteins mindestens
    15 cm hineinragt (`CELL_OVERLAP`) und der höher ist als eine Stufe
    (30 cm).
  - Treppe, Rampe und Podest sperren nichts.
  - Ein Einbau mit Körper sperrt seine Kachel.
  - Eine Welt kann weitere Zellen sperren (`GridWorld.cellBlocked`).
  - Was keine Zelle sperrt, zum Beispiel ein dünnes Geländer, bleibt für den
    Spieler Physik.
- **Blöcke jeder Größe** (`size`, `blockStart`, `cellsFor`):
  - Ein Agent sagt, wie viele Zellen je Seite er belegt.
  - Bei gerader Größe liegt die Stellung auf einer Zellecke, bei ungerader
    in einer Zellmitte.
  - Jede Kachelkante im Inneren des Blocks wird geprüft.
- **Anzeige:** _Menü → Werkstatt → Belegte Felder_ oder _Hitboxen (2D-Gitter)_
  zeigt das Gitter **auf dem Boden** (`grid/cellHitboxView.ts`, seit Oktober
  2026). Gewünscht: _„alle Gitter-Felder sehen, ob diese mit Wand belegt sind
  oder frei … bei der Treppe … mit einem Pfeil … immer auf dem Boden"_.
  - Jede halbe Kachel der Etage, auf der man steht (nicht mehr nur acht Meter
    um den Spieler): grün frei, rot belegt (Möbel, Pfosten, kein Boden, von
    einer Schräge durchschnitten), blau auf Treppe und Rampe.
  - Rote Linien: die Wände der Ebene (Kanten, Schrägen).
  - Weiße Pfeile auf jeder Treppenkachel: bergauf in der Mitte, nach außen an
    jeder Seite, die nur von außen hält — an einer halb offenen nur vor der
    Hälfte, die hält.
  - Die Felder liegen auf dem Boden, auf der Treppe schräg auf ihrem Lauf, und
    werden verdeckt wie der Boden; nur die Pfeile liegen immer obenauf.
- **Anzeige:** _Menü → Werkstatt → Belegte Felder_
  (`graphicsSettings.cellFootprints`, `grid/footprintView.ts`).
  - Unter Spieler, Mitspielern und NPCs liegt ihr 2 × 2-Block, grün frei,
    rot gesperrt.
  - _Gitterlinien_ zeigen die halben Kacheln blass zwischen den ganzen.
- **Editor:** Werkzeug _Schräge_ (`levelPlan.PLAN_TOOLS`,
  `gridTool.turnSlope`).
  - Jedes Tippen dreht weiter: keine → ╱ → ╲ → keine.
  - _Löschen_ nimmt sie nach Einbau und Baustein weg.
  - Das Tischmodell zeigt sie gedreht.
- **Weltdatei `0.4.0`** (`grid/worldFile.ts`):
  - Die Schrägen stehen als `slopes: [{ x, z, l?, slope }]` darin.
  - Ohne Schrägen fehlt die Zeile.
  - `0.1` bis `0.3` werden weiter gelesen.

- **NPCs laufen als 2 × 2-Block** (`nav/cellRoute.ts`, `NavAgent.plan`).
  Die Wegsuche über ganze Kacheln (`navPath.findPath`) bleibt die grobe
  Planung, denn nur sie kennt Meinung, Türen, Gefahren, Treppen, Portale und
  Sprünge.
  - In einem Schlauch aus diesen Kacheln sucht `CellGrid.findPath` den Weg
    eines 2 × 2-Blocks. Der Schlauch umfasst die Kacheln des Wegs und ihre
    Nachbarn, Nachbarn aber nur ohne Gefahr.
  - Offen gilt dabei **nur die Tür, durch die der grobe Weg geht**. Eine
    andere Tür im Schlauch ist womöglich die verriegelte, um die er
    herumführt.
  - Wegpunkte stehen nur dort, wo der Block die Richtung wechselt, und
    sind **eng** (`tight`).
  - An Verbindungen (andere Etage, keine Nachbarschaft, Wand mit Treppe)
    wird geteilt. Die Enden jedes Stücks tragen ihre Kachel, damit
    `NavAgent.hop` Sprung und Portal erkennt wie bisher.
  - Passt in einem Stück kein Block durch (ein Durchlass unter einem
    Meter), bleibt es beim Schnurzug über Kacheln (`pullString`).
  - Die Schrägen kommen über `NavGraph.slopeAt` in den Graphen der NPCs:
    `GridPlan` hängt sie in seinen Graphen, `GridWorld.navReady` in den
    abgetasteten.

- **Wo eine Figur stehen darf** (`standable`, seit Oktober 2026):
  - Logisch auf einem freien Block, gezeichnet nur **zwischen** freien
    Blöcken: auf der Verbindung zweier freier Nachbarn (gerade oder schräg)
    mit einer Achtelzelle Spiel zu jeder Seite, oder in einem Feld, dessen
    vier Blockmitten frei sind.
  - Vorher durfte sie eine Viertelzelle in jede Richtung über ihren Block
    hinaus, auch zur Wand hin — dann steckte ihr Körper in der Wand (gemeldet
    in der Küche der Testwelt).
  - **Über Eck** ist nur der schmale Streifen zwischen den beiden freien
    Blöcken erlaubt, nicht das ganze Quadrat.
  - `glides` prüft eine Strecke in Viertelzellen, damit ein langes Bild nicht
    über etwas springt.
- **Aus einem gesperrten Block** (abgesetzt, geschoben) geht es heraus, aber
  nicht über eine Wand:
  - Der Spieler wird aus jeder Wand, in der er steckt, zu der Seite
    geschoben, auf der seine Mitte steht (`planeMove.slideCircle`) — über die
    Linie kommt er so nicht.
  - Früher war von einem gesperrten Block aus jeder Schritt erlaubt. Über den
    Streifen über Eck kam man an einer 45°-Wand so auf einen gesperrten Block
    und von dort ins Leere hinter der Station — gemeldet als Sturz aus
    Haunting.
  - `moveOnCells` lässt eine gestrandete Figur innerhalb ihres Blocks und auf
    einen freien.
- **Wer doch durch die Welt fällt**, bekommt oben eine Box mit dem Weg dorthin
  zum Kopieren (`shared/fallTrail.ts`, `ui/fallReport.ts`). In **allen**
  Welten beginnt er danach am Startpunkt der Welt (`fallRespawnAtStart`) —
  gewünscht: _„nicht einfach nach oben teleportiert, sondern wirklich zum
  spawn der welt"_.
- **Wände aus dem Regal** gehören zum Zellgitter (`GridWorld.refreshWallSlopes`,
  `gridSnap.wallCells`):
  - Unter 45° (`gridSnap.diagonalPose`, `PortalWorld.fitWall`) als Schrägen.
  - Gerade und eingerastet (auf einer Fuge, in einer Vierteldrehung) als
    Wände auf ihren Kanten (`propEdges`, `NavCellOptions.walls`).
  - **Eingerastet hält ihr Kasten Spieler und NPCs nicht mehr auf**
    (`PhysicsBody.gridWall`, `PhysicsWorld.setGridWall`) — das tut allein
    das Gitter, wie bei jeder gebauten Wand. Kisten, Würfe und Kugeln prallen
    weiter an ihr ab. Gewünscht: _„ja, nur gitter"_ — ein System statt zwei.
  - Umgefallen oder schief geschoben ist sie wieder ein Körper.
  - **Ein Durchgang** (`props.MODEL_ARCHES`, z. B.
    `restaurant-bits/wall_doorway.glb`, 2 m mit 0,8 m Öffnung) sperrt keine
    Kante, sondern nur die Zellen an seinen Pfosten (`WallCells.cells`,
    `GridWorld.propCells`). Dazwischen bleiben zwei Zellen frei, und ein
    2×2-Block geht hindurch.
  - **Eine neue Wand ersetzt die alte**: Was eine Fuge oder schräge Kachel mit
    ihr teilt, leuchtet beim Darüberhalten rot (`PortalWorld.markReplaced`) und
    verschwindet beim Loslassen (`replaceWalls`). Durchgang und Fenster zählen
    dabei in voller Länge.
  - **Außerhalb des Grundrisses** fragt die Zellsperre des Spielers auf
    Etage 0 weiter. Vorher schwieg sie dort, und eine Wand auf dem Gelände
    hielt nur von innen.
- **An einer schrägen Wand entlang gleiten** — für den Spieler in der Ebene
  (siehe oben); für die NPCs weiter mit `diagonalSlides`: Nach „ganz, nur x,
  nur z" versucht der Schritt noch seine Anteile längs der beiden Diagonalen.
  Damit das an den Blockmitten nicht hängen bleibt, ist die Zone um eine
  Mitte eine Raute, so breit wie der schräge Streifen, und ein Streifen wird
  auch im Nachbarfeld gefunden (`standable`, `inSquare`).
  - **Dreiecke aus drei freien Mitten** zählen ganz: Ist die vierte Ecke eines
    Feldes an einer Schräge gesperrt, ist das Dreieck der anderen drei frei.
    Vorher lag darin ein Loch, in dem man mitten vor der Wand stehen blieb
    (gemeldet: _„rutsche ich die wand nicht weiter entlang"_). Seitdem ist die
    Grenze vor einer Schräge eine gerade Linie.
- **Die Küchenwände der Testwelt** kommen aus dem Regal
  (`test/zones/kitchenWalls.ts`), so wie der Besitzer sie gebaut hat.
  - Beim Hinstellen zeigt das Gitter unter dem Kran die Fuge, bei einer
    Schräge einen schrägen Strich je Kachel (`PlaceGrid.showSlants`).
- **Die Testwelt hat keine Planwände mehr** (`testPlan.clearPlanWalls`, auch
  für einen gespeicherten Stand in `TestWorld.planLoaded`): gewünscht _„alle
  normalen wände komplett zu entfernen. Ich will nur noch mit den kaykit
  wänden arbeiten."_ Türen und Fenster bleiben. Der Wandparcours steht aus
  Regalwänden (`wallLabModels`, aufgestellt mit `PortalWorld.placeModel`, das
  nichts in die Weltänderungen schreibt). Was `placeModel` aufstellt, gehört
  der Welt: Es steht als **fester** Körper, geht nicht über die Leitung (jedes
  Gerät baut es selbst) und wird aus den Augen gebündelt gezeichnet
  (`shared/modelBatch.ts`) — siehe [Haunting](haunting.md), „Das Ruckeln".
  Im Baukasten aufgenommen, ist es wie jedes andere Stück beweglich.
- **Wandtests mit Bodenmarken** (`grid/fixtures/mark.ts`, `grid/markCheck.ts`):
  - Drei Einbauten, gesetzt unter _Einrichten → Einbauten_: _Start (Wandtest)_
    (blau), _Darf hin_ (grün) und _Darf nicht hin_ (rot).
  - Gewünscht: _„test cases definieren, wo der spieler hin dürfte und wohin
    nicht … floor tiles 1x1 (grün und rot, start punkt des spielers)"_.
  - Die Welt flutet alle 0,4 s von den Startmarken aus das Zellgitter mit der
    Regel des Gehens (`canStep`, 2×2-Block), `MARK_MARGIN` Kacheln um die
    Marken herum.
  - Grün ist bestanden, wenn erreicht, rot, wenn nicht. Der Rahmen der Marke
    ist dann weiß; durchgefallen blinkt er magenta.
  - Am Handgelenk steht „Wandtests: n von m bestanden", sobald sich die Zahl
    ändert.
  - Alle Starts fluten gemeinsam: Rot hält nur in einem abgeschlossenen
    Bereich.
- **Der Wandparcours der Testwelt** (`test/zones/wallLab.ts`, im Menü
  _Wandparcours_) hat gerade Wand, Ecke, Lücke, Gang, beide Schrägen, einen
  schrägen Gang und einen Knick wie an der Station. Ein gespeicherter Stand
  von vorher bekommt ihn dazu (`ensureWallLab` in `TestWorld.planLoaded`). Die Tests laufen mit
  `planeMove.slideOnCells` dagegen (`wallLab.test.ts`).
- **Alle Figuren gehen auf dem Gitter** (`moveOnCells`, `glides`):
  - Der Spieler in der Ebene (`PhysicsLocomotion.plane`), die NPCs über
    `NpcWorld.cells` (`GridWorld.cellsForAgents`): `Npc.update` schneidet die
    Geschwindigkeit des Hirns mit `moveOnCells` zu, ihr Zylinder geht durch
    `GROUP_CELL` hindurch.
  - Schiebt die Physik einen NPC (ein Stoß) auf einen gesperrten Block, holt
    ihn `Npc.holdOnCells` auf die letzte freie Stelle zurück — außer über
    Eck.
  - **Über Eck gleiten** (`standable`): Stetig gerundet wechselt eine Figur
    erst in einer Achse. Der Block dazwischen darf gesperrt sein, solange
    sie im Streifen zwischen den beiden freien Blöcken bleibt — sonst käme
    niemand durch die Lücke aus dem Bild oben.
- **Die Größe des Agenten** (`NpcSkin.cells`, `AgentTuning.cells`, Vorgabe
  2): Auf Blöcken dieser Größe plant `cellRoute` und geht `moveOnCells`.
- **Getroffen wird auf dem festen Block**: Die Reichweite des Hirns misst von
  Blockmitte zu Blockmitte (`BrainSense.range`), in Haunting ebenso
  (`stationCells.blockGap`). Gezeichnet wird dazwischen interpoliert.
- **Haunting läuft auf demselben Gitter** (`haunting/map/stationCells.ts`,
  `docs/agents/haunting.md`): Bewegung und Wegsuche der Runde, die
  Einrichtung als gesperrte Zellen — und die schrägen Ecken der Station
  (`HouseRoom.cuts`) als Schrägen im Bauplan.

## Was noch nicht auf Zellen läuft

1. **Möbel im Graphen der NPCs.**
   - Für die grobe Planung über Kacheln ist ein Möbel weiter ein
     Kostenfaktor (`GridPlan.refresh`); gesperrt sind seine Zellen erst auf
     dem Gitter.
2. **Kleinere Dinge auf halbe Kacheln** (der Blumentopf an den Rand einer
   Kachel).
   - Möbel bleiben vorerst auf ganzen Metern, so ist es gewünscht.
   - Das Zellgitter trüge auch halbe, sobald Bausteine es tun.
