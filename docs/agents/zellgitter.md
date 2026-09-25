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
- **Der Spieler bewegt sich nur auf dem Gitter** (`PhysicsLocomotion.cellGate`,
  gestellt von `GridWorld.playerCellGate`, Regel wie `cellGrid.moveOnCells`):
  - Wände, Türen, Fenster, Schrägen und Möbel der Gitterwelten tragen
    `PlanSolid.cell` und sitzen in der Physik im eigenen Bit `GROUP_CELL`.
    Die Kapsel des Spielers geht durch sie hindurch (`PLAYER_FILTER`), denn
    über sie entscheidet allein das Gitter.
  - Böden, Treppen, Rampen, Podeste, Massen und bewegliche Kisten bleiben
    Physik.
  - Der Schritt wird ganz gemacht, nur längs x, nur längs z oder gar nicht,
    je nachdem, ob der 2 × 2-Block danach frei ist.
  - Wer auf einem gesperrten Block steht, darf heraus.
  - Außerhalb des Grundrisses schweigt das Gitter (`voidIsFree`).
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
- **Anzeige:** _Menü → Grafik → Belegte Felder_
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
  - Der Spieler (`gateStep`, `GridWorld.playerCellGate`) darf nur zurück zur
    letzten Stelle, an der er stehen durfte.
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
- **Wände aus dem Regal** gehören zum Zellgitter (`GridWorld.refreshWallSlopes`):
  - Unter 45° (`gridSnap.diagonalPose`, `PortalWorld.fitWall`) als Schrägen.
  - Gerade und eingerastet (auf einer Fuge, in einer Vierteldrehung) als
    Wände auf ihren Kanten (`propEdges`, `NavCellOptions.walls`).
  - Umgefallen oder schief geschoben hält sie nur die Physik.
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
  `gateStep` dagegen (`wallLab.test.ts`).
- **Alle Figuren gehen auf dem Gitter** (`moveOnCells`, `glides`):
  - Der Spieler über `PhysicsLocomotion.cellGate`, die NPCs über
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
