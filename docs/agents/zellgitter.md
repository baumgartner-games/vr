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
- **Der Spieler** (`PhysicsLocomotion.cellGate`, gestellt von
  `GridWorld.playerCellGate`):
  - Die Physik hält weiter die Wände auf. Danach wird der Schritt gegen das
    Gitter geprüft: erst ganz, dann nur längs x, dann nur längs z.
  - Ein Schritt auf einen gesperrten Block wird nicht gemacht.
  - Wer schon auf einem gesperrten Block steht (abgesetzt, durch ein Portal
    gekommen), bleibt nicht kleben.
  - Außerhalb des Grundrisses schweigt das Gitter (`voidIsFree`), denn dort
    trägt die Physik.
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

## Was noch nicht auf Zellen läuft

Der Umbau ist in Stufen geplant. Stufe 1 ist der Kern oben.

1. **NPCs auf Zellen.**
   - `nav/navAgent.ts` plant heute über ganze Kacheln (`findPath`) und
     meidet Schrägen nur über ihre Kosten.
   - Umstellen heißt: `CellGrid.findPath` als Wegsuche des Agenten, dazu
     Möbel als gesperrte Zellen.
   - Möbel sind im Graphen heute nur ein Kostenfaktor (`GridPlan.refresh`).
2. **Haunting.**
   - Die Station rechnet mit eigenem Kern (`haunting/map/geometry.ts`
     `walkable`/`slide`, `stationNavigation.ts` mit einem Raster von 0,25 m,
     `roomGraph.ts`). Die Rechtecke dort kennen keine Schrägen.
   - Die schrägen Ecken der Vorlage (`docs/orbital/station-vorlage.webp`)
     kommen erst, wenn dieser Kern auf das Zellgitter umgezogen ist.
3. **Kleinere Dinge auf halbe Kacheln** (der Blumentopf an den Rand einer
   Kachel).
   - Möbel bleiben vorerst auf ganzen Metern, so ist es gewünscht.
   - Das Zellgitter trüge auch halbe, sobald Bausteine es tun.
