# Plan H: Haunting auf dem 1-m-Gitter, eine Kamera von oben

Dieses Dokument ist der Vertrag für das Paket **H** aus
[dem Gitter-Plan](plan-1m-gitter-overcooked.md). Wer ein Teilpaket baut, liest
es **ganz**, hält sich an die Zahlen und Namen darin und schreibt hinterher
den Haunting-Abschnitt in AGENTS.md um, wo er nicht mehr stimmt.

Ausgangsstand: Commit `c59c26b` (Welle 1 und Paket U sind gemerged). Was aus
dem alten Stand nachzulesen ist, holt man sich mit
`git show c59c26b:src/worlds/haunting/<Datei>.ts`.

## Was der Besitzer will (aus dem Gitter-Plan, Punkt 13)

Haunting wird an das neue Gitter **angepasst** — Räume in ganzen Metern, Türen
und Gänge auf den neuen Maßen — und bekommt **dieselbe 3D-Ansicht von oben
wie alle anderen Welten**: keine eigene gemalte 2D-Karte mehr, sondern die
Kamera des Kerns über derselben Szene, in der die Brille steht. Die
Spieler-UI dort gleicht der der anderen Welten: `A` benutzt, das Gemeinte
leuchtet, ein Werkzeug-Knopf, Pinch-Zoom. Die Einsatzzentrale bleibt auf den
Handys, die Startseite unter `#haunting` bleibt.

## Bestandsaufnahme: was Bild ist und was Rechnung

Der Stand nach Welle 1 hat **41 rote Suiten** unter `src/worlds/haunting/`,
und fast alle aus einem Grund: `stationLayout` packt die Möbel in Räume, die
auf einmal 4 × 4 **Meter** statt 4 × 4 Kacheln zu je 2,5 m messen —
„No safe station furniture layout". Dazu ein Dutzend Erwartungen, die in
Kacheln gedacht waren (`50` m Stationsrand, `12,5` m Lehrzimmer,
`4 · TILE` Schallweg), und `STATION_DOOR_W = TILE − 2·PLAN_WALL_T`, das mit
den neuen Konstanten `0,6` ergibt statt der `DOOR_WIDTH` der Karte.

**Rechnung** — eine Wahrheit, bleibt samt Tests:

- Das Haus (`house.ts`), der Bauplan (`plan.ts`), die Möbelstellung
  (`stationLayout.ts`, `fixtureDimensions.ts`), die Wegsuche
  (`stationNavigation.ts`, `navmesh/`), die Raumkarte (`roomGraph.ts`), das
  Hören (`audio/hearing.ts`, `perception.ts`, `map/noiseSpread.ts`), die
  Sicht (`map/visibility.ts`, `monster/monsterSight.ts`), die Geometrie der
  Karte (`map/geometry.ts`), der Snapshot (`map/extract.ts`,
  `map/mapSnapshot.ts`, `map/mapSource.ts`, `map/worldSource.ts`).
- **Die Runde** (`map/flatRound.ts`) und ihr Techniker aus Zahlen
  (`rules/technicianBot.ts`, `map/flatWalk.ts`), die Rätsel
  (`map/flatPuzzles.ts`), die Regeln (`rules/`), das Monster (`monster/`,
  `monsterRoutine.ts`), die Schächte (`vents/`), der **Rechenkern**
  (`flatKernel.ts`, `kernelLocomotion.ts`), mit dem das Schiff die Runde
  rechnet. Die Runde läuft nach diesem Paket **weiter genau so** — nur ihr
  Bild ist die 3D-Szene, aus der Brille oder von oben.
- Die **Karte der Einsatzzentrale** (`map/mapView.ts`): Das ist das Bild, das
  Archiv, Schalttafel, Späher (`views/`) und das Monster-Telefon
  (`monster/monsterView.ts`) aus dem Snapshot zeichnen. Das ist **keine
  Spielansicht**, sondern das eigene Bild der Handys — es bleibt, samt
  `map/noiseWaves.ts`, `map/joystick.ts` (der Stock des Monster-Telefons und
  des Zuschauers), `map/optionsMenu.ts` (das Optionsmenü des Schiffs im
  Browser hängt daran), `map/puzzleOverlay.ts` (das Rätsel als DOM, siehe
  H3), `map/insightOverlay.ts` (reine Rechnung für `navigationOverlay.ts`).

**Bild der 2D-Welt** — fällt weg:

- `map/flatMode.ts` (die gespielte 2D-Welt: Rollenstreifen, Stock, Knöpfe,
  Overlays, Zuschauen in 2D), `map/flatScene.ts` und `map/flatArt.ts` (die
  gemalte Szene), `map/flat.css` (Grund und Kopf der 2D-Welt),
  `map/toolIcons.ts` (die gepufferten Werkzeugbilder für ihren Knopf),
  `map/flatMap.test.ts` (prüft `FlatMode` mit `MapView`), das Zuschauen als
  2D-Rolle (`FlatRole` `watch`), der Ansichtswechsel 2D ↔ 3D
  (`HauntingWorld.switchView`, `enterFlat`/`leaveFlat`, `rules/lobby.viewSwap`,
  `View`), der Menüeintrag `haunt:view`, das Häkchen „2D-Welt von oben" im
  Aufbau.
- Die **eigene Steuerung im Schiff**: `world3d/shipControls.ts` (Stock und
  drei Knöpfe der 2D-Welt über der 3D-Szene, `map/controls.css`),
  `desktopControls.ts` (E/G/1/2/Ctrl und der Freiflug), der Bordstock-Umweg
  `ctx.touchStick(false)` beim Betreten.
- Der Monster-Mensch **in der 2D-Welt** (`monster/flatMonsterControl.ts`,
  `monster/monsterSession.ts`, `monster/monsterMode.test.ts`): Wer das
  Monster spielt, spielt es weiter am Telefon (`monsterView.ts`,
  `netMonsterPort.ts`) — auch der Gastgeber, dessen Port die eigene Runde
  speist (`receive`). Nur der lokale Stock **in `FlatMode`** ist weg.

## Entscheidungen

### Das Gitter der Station

- Eine Kachel ist **ein Meter**. Alle Rechtecke in `house.ts` stehen in
  Metern, und die alten Maße werden ungefähr gehalten: Räume ≈ ×2,5 (4 Kacheln
  → 10 m), damit Tempo, Hörweiten, Sichtkegel und die gemessenen Gewichte der
  Bots weiter zu den Wegen passen. **Gänge sind 2 Kacheln breit** (lichte
  Weite 1,8 m), wie im Gitter-Plan verlangt. Die Station wird dadurch
  schmaler (70 × 60 m statt 100 × 60 m): Was an Breite fehlt, sind die
  ehemals fünf Meter breiten Gänge.
- **Der feste Skeld-Grundriss** (`stationRooms()`), in Kacheln `x, z, w, d`:

  _Nachtrag (September 2026): Die Tabelle ist Geschichte. Der Grundriss ist
  seither von der Zeichnung des Besitzers abgepaust (Gänge zwei Kacheln
  breit, Räume so klein, wie die Einrichtung es zulässt, `STATION_BOUNDS`
  55 × 30 m) — was gilt, steht in
  `house.stationRooms` und in `docs/agents/haunting.md` unter „Die Vorlage am
  Boden"._


  | Raum              | Kennung | x   | z   | w  | d  |
  | ----------------- | ------- | --- | --- | -- | -- |
  | Cafeteria         | r0      | −10 | −52 | 20 | 18 |
  | Upper Engine      | r1      | −30 | −48 | 10 | 10 |
  | Reactor           | r2      | −32 | −34 | 10 | 15 |
  | Security          | r3      | −20 | −27 | 10 | 10 |
  | MedBay            | r4      | −20 | −38 | 9  | 10 |
  | Lower Engine      | r5      | −30 | −12 | 10 | 10 |
  | Electrical        | r6      | −19 | −16 | 10 | 12 |
  | Storage           | r7      | −8  | −12 | 15 | 12 |
  | Weapons           | r8      | 20  | −48 | 10 | 10 |
  | O2                | r9      | 12  | −34 | 10 | 10 |
  | Navigation        | r10     | 28  | −32 | 10 | 10 |
  | Admin             | r11     | 6   | −23 | 10 | 10 |
  | Shields           | r12     | 24  | −8  | 10 | 10 |
  | Communications    | r13     | 8   | −2  | 10 | 10 |

  Die Gangstreifen (`strips`), 2 breit, wie bisher als Zellenmenge vereinigt
  und in Rechtecke zerlegt:

  | Gang                       | x   | z   | w  | d  |
  | -------------------------- | --- | --- | -- | -- |
  | Nordwestgang (UE ↔ Caf.)   | −20 | −44 | 10 | 2  |
  | Stich zur MedBay           | −16 | −42 | 2  | 4  |
  | Westgang                   | −22 | −38 | 2  | 26 |
  | Südwestgang                | −20 | −4  | 12 | 2  |
  | Mittelgang (Caf. ↔ Storage)| −1  | −34 | 2  | 22 |
  | Stich zu Admin             | 1   | −20 | 5  | 2  |
  | Nordostgang (Caf. ↔ Weap.) | 10  | −44 | 10 | 2  |
  | Stich zu O2                | 16  | −42 | 2  | 8  |
  | Ostgang                    | 24  | −38 | 2  | 30 |
  | Gang zur Navigation        | 22  | −28 | 6  | 2  |
  | Südostgang                 | 7   | −4  | 17 | 2  |

  `bounds` = `{ x: −32, z: −52, w: 70, d: 60 }`; die Zellenschleife läuft
  über genau dieses Rechteck, und `namePassages` nimmt es statt der
  eingetippten `{−20, −21, 40, 24}` (eine Konstante `STATION_BOUNDS`, nicht
  zweimal dieselben Zahlen). **Kein Raum berührt einen anderen Raum direkt** —
  jedes Wandpaar hat eine Tür, wie bisher (`roomGraph.test`: `wallOnlyPairs`
  leer). Deshalb die 1-m-Fugen: MedBay ist 9 breit, Security beginnt bei
  −27, Electrical bei −19, Admin bei −23. Wer am Grundriss dreht, hält das
  ein; das Hörmodell rechnet sonst durch Wände, die es vorher nicht gab.
  Probeweise eingetragen (Stand vor H1) packt `stationLayout` diesen
  Grundriss für alle geprüften Samen ohne „No safe layout".
- **Das Zufallshaus** der alten Haustests (`HOUSE`) wird mitskaliert:
  `HOUSE = { x: −20, z: −87, w: 40, d: 30 }`, `MIN_SIDE = 5` (kein Zimmer
  schmaler als fünf Meter). Es wird nur noch von `house.test.ts`,
  `haunt.test.ts` und den „gewürfelten" Fällen in `roomGraph.test.ts`
  gebaut; deren Zahlen werden nachgemessen und neu eingetragen (die Aussage
  bleibt: durch die Wand 19 statt 100 Meter — die genauen Meter ändern sich).
- **Der Vorplatz**: `APRON = { x: HOUSE.x, z: HOUSE.z + HOUSE.d, w: HOUSE.w,
  d: 5 }` = `{ −20, −57, 40, 5 }`. `APRON_OUTER = APRON.z` (Reihe mit den
  Hüllenfenstern), `APRON_INNER = APRON.z + APRON.d − 1` (Reihe an der
  Fensterfront). **Alle Positionen auf dem Vorplatz stehen in Metern vom
  Vorplatzrand**, dieselben Meter wie vorher: `COMMAND_HOME = { x: 0, z:
  APRON.z + 2.5 }` (Mitte des Vorplatzes), `COMMAND_TABLE.z = APRON.z +
  APRON.d − 2.4`, Sonne und Standlampe bei `APRON.z + APRON.d − 1.0` bzw.
  `APRON.z + 2.75` — was bisher `(APRON_INNER + f) · TILE` hieß, rechnet
  jetzt `APRON.z + APRON.d − 1 + f` in Metern. Der Aufzug `COMMAND_LIFT`
  wird **2 × 2 Kacheln** in der Nordostecke (x 17…18, z −57…−56): Wand nach
  Süden und Osten, Tür nach Westen in der äußeren Reihe, Wand nach Westen in
  der inneren; die Hüllenfenster laufen von `APRON.x + 1` bis vor den Aufzug.
- **Die Lehrzimmer** (`trainingLayout.ts`) liegen 15 m östlich des
  Stationsrands: `EAST = STATION_BOUNDS.x + STATION_BOUNDS.w + 15` (= 53),
  `NORTH = STATION_BOUNDS.z`. Safe und Ausrüstung 12 × 10 m, Reparaturen
  12 × 10 m, Modelle 20 × 15 m; 5 m Luft zwischen Nachbarn (safe bei
  (EAST, NORTH), tools bei (EAST + 17, NORTH), repairs bei (EAST, NORTH + 15),
  models bei (EAST + 17, NORTH + 15)). `trainingSpawn` steht 3 m vor der
  Südwand, `TRAINING_DOOR` in der Mitte der Modellhalle wie bisher.
  `trainingDeck.ts` stellt seine Exponate in Metern — die Zahlen dort werden
  auf die neuen Räume nachgezogen, `trainingLayout.test.ts` misst in Metern
  (≥ 15 m Abstand zur Mission, ≥ 5 m zwischen den Zimmern).
- **Die Schächte** (`vents/ventNet.data.ts`): dieselben vierzehn Klappen und
  neun Verbindungen, neue Kacheln. Regel wie bisher: an einer **Innenwand**
  (zu einem Gang oder einem Nachbarraum), nie in einer Türöffnung, mindestens
  `DOOR_WIDTH` von jeder Türmitte entfernt (`ventGraph.test.ts` prüft es).
  Wo eine Wand nur zwei Kacheln mit dem Gang teilt, liegt die Tür auf der
  einen und die Klappe auf der anderen — genau eine Kachel Abstand reicht der
  Prüfung. Bevorzugt werden die langen Wände (MedBay-Westwand, Security-
  Westwand, Electrical-Südwand, Communications-Nordwand, Reactor-Ostwand).

### Die Tür der Station: eine ganze Kachelkante, 1,0 m, ohne Pfosten

`STATION_DOOR_W = TILE` (1,0 m) — **nicht** `PLAN_DOOR_W` (0,8). Der Grund
ist das Monster: Sein Wegkörper misst `MONSTER_RADIUS` im Halbmesser, und die
Wegsuche rastert in Vierteldezimetern. Eine 0,8-m-Tür lässt bei 0,3 m
Halbmesser eine Rinne von 0,2 m für die Mitte — auf einem 0,25-m-Raster liegt
darin **keine** Zelle, und das Monster stünde vor jeder Tür wie vor einer
Wand. Eine ganze Kante gibt 0,4 m Rinne, das sind zwei Rasterzellen. Dazu
passt es zum Schiff: Eine Schleuse hat keine Pfosten, sie fährt in die Wand.

Daraus folgt:

- `plan.ts`: `StationPlan.doorWidth()` gibt `TILE`. `editor/levelBuild.
  doorParts` bekommt denselben Schutz wie `windowParts`: Pfosten von
  Breite < 1 cm werden nicht gebaut (die Türbreite der anderen Welten ändert
  sich nicht — bei 0,8 m gibt es weiter zwei Pfosten von 10 cm).
- `map/geometry.ts`: `WALL_T = PLAN_WALL_T` (0,2) und `DOOR_WIDTH =
  STATION_DOOR_W` (Import aus `house.ts`), nicht mehr `TILE − 2·WALL_T`.
  `groundTruth.test` prüft `STATION_DOOR_W === DOOR_WIDTH` und `> PLAN_DOOR_W`
  — beides bleibt wahr.
- `map/flatRound.ts`: **`MONSTER_RADIUS = 0,3`** (war 0,4). Der Rapier-
  Zylinder des Modells maß ohnehin 0,29 m; die 0,4 waren die Breite eines
  2,5-m-Gitters. `PLAYER_RADIUS` bleibt 0,24 (`physics/playerClearance`).
- `stationNavigation.ts`: `SUBDIVISIONS = 4` (STEP bleibt 0,25 m — die
  Kommentare „quarter-metre" stimmen dann wieder, und das Raster hat nicht
  sechsmal so viele Zellen); die Türöffnung bekommt **keine** Pfostenquader
  mehr, wenn `STATION_DOOR_W >= TILE`. `BUCKET = TILE` bleibt (1 m Fächer).
- `stationLayout.ts`: `STATION_PLAYER_RADIUS` 0,45, `LANE`, `MODULE_GAP`,
  `CARGO_DOOR_DEPTH` 2,4, Türlandung 1,15 — alles Meter, bleibt.
  `WALL_INSET = PLAN_WALL_T / 2 + STATION_WALL_CLEARANCE` rechnet sich neu
  (0,32). `doorClearances` misst mit `STATION_DOOR_W / 2 + Radius` — bleibt.
- `automaticDoors.ts` (`TRIGGER_CROSS`, `OCCUPIED_CROSS` aus
  `STATION_DOOR_W`), `monster/monsterWalk.ts` (0,9 m vor der Tür) — Meter,
  bleiben. `haunt.ts`: `DOORWAY_CLEAR` wird **1,9 m** und rechnet in Metern
  (bisher 0,75 Kacheln, umgerechnet über `TILE`). `rules/technicianBot.ts`:
  `DREAD_CORE = CONTACT + 2.5` ausgeschrieben — der Kern war „Schlagreichweite
  plus eine Kachel", und gemeint waren zweieinhalb Meter, nicht eine Kachel.
- Das Schott im Schiff (`ShipExperience.buildDoors`) rechnet schon in
  `STATION_DOOR_W`: vier Teleskop-Blätter zu je einem Viertel, die in die Wand
  fahren; Gehäuse, Leuchten und Tafel daneben skalieren mit. Der Pfosten,
  in den sie fuhren, ist jetzt die Wand selbst.
- Die 2D-Figur geht `DOOR_WIDTH / 2 − Radius` breit durch (`geometry.walkable`)
  — 0,2 m für das Monster, 0,26 m für den Spieler.

### Die Hülle: Böden je Raum, Wände in Läufen, keine Bündel

`GridWorld` baut je Bodenkachel und je Wandkante einen Quader — auf der neuen
Station wären das rund 4 500 Böden und 1 000 Wandstücke, jeder mit Körper.
Bisher bündelte Haunting sie in `InstancedMesh`es (`batchGridGeometry()`
wahr); **das Wand-Ghosting des Kerns schaltet aber einzelne Quader um**, und
in einem Bündel ist kein Quader einzeln. Deshalb:

- `StationPlan.solids()` (`plan.ts`) **fasst zusammen**: alle Bodenkacheln
  eines Rechtecks (Raum, Gang, Vorplatz, Lehrzimmer) zu **einem** Bodenquader
  je Rechteck; alle geraden Wandkanten zwischen zwei Unterbrechungen (Tür,
  Fenster, Ecke, Aufzugswand) zu **einem** Wandquader je Lauf, mit derselben
  `level`-Marke. Türteile (Sturz, Blatt) und Fensterteile bleiben je Kante.
  Damit hat die Hülle ein paar hundert Quader statt fünfeinhalbtausend, und
  das Ghosting macht eine ganze Wand durchsichtig statt eines Meters davon.
- `HauntingWorld.batchGridGeometry()` gibt **false** (H2).
- `stationNavigation.buildGrid` baut seine Wandkästen selbst aus dem Graphen
  und merkt davon nichts; `setSlidingGridDoor` findet Türblätter weiter an
  `PlanSolid.door`.

### Die Decke bleibt — als Masse auf `level + 1`

Die Station ist ein Schiff; in der Brille und aus den Augen braucht sie ihre
Decke, sonst sieht man durch jeden Raum ins All. `plan.room(rect, { ceiling:
PLAN_WALL_H })` legt sie schon heute als Masse auf `level + 1`, und genau das
schneidet die Kamera von oben ab (`core/cutaway.ts`). Es bleibt so. Was
Haunting **selbst** an die Decke hängt — die Deckenscheiben der Lampen
(`HauntingWorld.lamps`, `glass`), die Deckenleuchte des Übungsdecks
(`bayLight`), die Drehleuchten der Gänge, die Deckfugen-Leisten unter der
Decke —, bekommt `userData.level = 1`, damit es von oben mitgeht (H2). Der
Zuschauer der Zentrale hebt die Decke weiter mit seiner Schnittebene
(`liftLid`); daran ändert sich nichts.

### Die Ansicht von oben ist die des Kerns

- `HauntingWorld.ownsFlat` wird **false**. Damit gilt in Haunting, was
  überall gilt: _Menü → Ansicht_ schaltet zwischen _Von oben_ und _Aus den
  Augen_, `App` setzt die `TopDownCamera` über das Rig, schneidet auf
  (`viewLevel` erbt Haunting von `GridWorld`), ghostet Wände, zeichnet
  Gitterlinien, und `FlatControls` läuft die Figur in Weltrichtungen.
- **Der Kern bleibt der Antrieb**: `KernelLocomotion` fängt den Wunsch des
  Rigs ab, egal ob er von der Brille, der Tastatur, dem Pad oder dem
  Bordstock der Seite kommt; `kernelInput` gibt ihn als `FlatInput` in die
  Runde. Nur der **Gierwinkel** kommt von oben nicht mehr aus der Kamera
  (die schaut immer nach Norden), sondern aus dem Rig: `yaw` = Rig-Richtung,
  wenn `ctx.topDown`, sonst wie bisher die Kamera.
- **Der Bordstock der Seite** (`#touch`, Stock, Zielstock, `A`/`B`) ist die
  Steuerung des Technikers auf dem Handy. `ctx.touchStick(false)` ruft die
  Welt nur noch, solange die **Seite der Zentrale** (`StationUi`) über dem
  Bild liegt, und `true`, sobald jemand den Stock nimmt (`takeStick`) oder
  die Welt verlässt.
- **Das Handy in der Zentrale** rendert weiter selbst (`HauntingWorld.render`
  gibt `true` zurück, wenn `this.ui` steht): Archivblatt, Puppenhaus des
  Zuschauers, Linse, Durch-seine-Augen. Das ist das eigene Bild der Handys
  und keine Spielansicht; es bleibt. Die Kamera des Kerns läuft dann zwar mit,
  zeichnet aber nichts.
- **Der Techniker am Bildschirm** spielt von oben oder aus den Augen — auch
  auf dem Handy („Web 3D" führt ins Schiff, und `screenView` ist dort ab Werk
  _Von oben_). Die Startseite bleibt, wie sie ist: Brille → Enter VR;
  _Von oben_ → die Zentrale am Handy; _Aus den Augen_ → Techniker im Schiff
  (`main.ts`, `ENTRY_HINTS`). Was weg ist, ist nur, dass _Von oben_ als
  Techniker die gemalte Karte öffnete.
- **Die Bot-Runde im Schiff** („Zuschauen" am Bildschirm) läuft auf dem Kern
  wie bisher (`FlatKernel.startBot`). Von oben folgt die Kamera dem Rig, also
  setzt die Welt in der Bot-Runde **das Rig auf den Bot** (`followBotCamera`
  versetzt bei `ctx.topDown` das Rig statt der Kamera); aus den Augen bleibt
  „Bot folgen"/„Freie Kamera" wie bisher, nur der **Freiflug** (WASD in der
  Luft, `desktopFlightVelocity`) fällt mit `desktopControls.ts` weg — die
  freie Kamera ist dann die Figur, die im Schiff herumläuft.
- **Weg** aus `HauntingWorld`: `flat`, `flatShared`, `flatWanted`,
  `flatIcons`, `openFlat`, `closeFlat`, `enterFlat`, `leaveFlat`, `stepFlat`,
  `switchView`, `watchSnapshot`, der Import von `map/flatMode`; aus
  `rules/lobby.ts` der Typ `View`, das Feld `view`, `viewSwap`,
  `VIEW_LABELS`, der alte Schlüssel `bgvr.haunting.flat.v1`; aus
  `rules/worldMenu.ts` `opensFlat`, `flatWanted`, der Eintrag `haunt:view`
  und der Satz „Als 2D-Karte von oben"; aus `stationUi.ts` das Häkchen
  `[data-check="view"]` und `switchView`; aus `ShipExperience` der Knopf
  „2D von oben" (`data-action="flat-view"`) und `switchViewKey`.
  `arriveAs('technician' | 'centre')` bleibt (die Startseite braucht es).
- `HauntingWorld.replay.test.ts`: Die Fälle zum Ansichtswechsel (ab Zeile
  ≈ 558) fallen mit dem Wechsel; alles zu Kern, Gastgeber, Bot-Runde,
  Büchern, Tafel bleibt und wird grün.

### Die Spieler-UI des Technikers

Vier Dinge des Kerns ersetzen Haunting-eigene Wege:

- **`A` benutzt** (`PlayerRig.requestUse` → `PortalWorld.useForward` →
  `core/usable.pickUsable`): Jedes Ding, das im Schiff `bind` bekommt —
  Kistenklappen, Konsolen, Tastenfelder der Schutzschränke, Türtafeln, die
  schwebende Lampe, abgelegte Teile, das Terminal der Zentrale —, wird
  **zusätzlich** als `Usable` angemeldet (`usePrompt` = die bisherige
  `interactionLabel` ohne „E: "), über einen Haken des Wirts
  (`ShipHost.usable(object, usable, options)` / `unusable(object)`, in
  `HauntingWorld` als `addUsable`/`removeUsable`). Der Zeiger (`bind`) bleibt
  für Hand und Trigger in der Brille und für den Strahl aus den Augen; `A`
  von oben und `E` am Schreibtisch gehen durch den Kern. Was `pressUse`
  vorher an Sonderfällen kannte — Runde vorbei → neu starten, im Schrank →
  raus, Medkit in der Hand → heilen, nichts vor einem → Licht schalten —,
  läuft weiter, als `useForward`-Überschreibung in `HauntingWorld`, die
  zuerst den Kern fragt und bei „nichts getroffen" das Licht umlegt.
- **Die Hervorhebung** ist der Saum des Kerns (`core/highlight.ts`,
  `PortalWorld.updateUsables`). Der gelbe Saum auf der Zielkiste
  (`ShipExperience.seam`) bleibt daneben — er meint etwas anderes.
- **Der Werkzeug-Knopf** (`World.toolChoice`, `#hud-tool`): `HauntingWorld`
  überschreibt `toolChoice()` mit der Liste _Hand (leer)_ (vom Kern),
  _Taschenlampe_, _Radar_, _Röntgen_, _Medkit_ (nur mit Medkit im Inventar);
  `choose(id)` setzt in `ShipExperience` die Hand: Lampe/Medkit rechts,
  Radar/Röntgen links (dieselben zwei Reihen wie bisher), `null` leert beide.
  Die Tasten `1` und `2` und die Knöpfe „Linke Hand"/„Rechte Hand" fallen
  weg. Das **Ersatzteil** ist kein Werkzeug: Es steht im Streifen und wird
  mit dem Knopf **Ablegen** im Panel abgelegt (der Knopf gibt es schon,
  `G` fällt weg); aufgenommen wird es mit `A` (es ist ein `Usable`).
- **Pinch-Zoom** und Rad/Bumper kommen vom Kern; `Kartenübersicht` (90 m
  hoch) und der Freiflug fallen weg — von oben ist die Übersicht der Zoom.
- **Ducken**: Der Kern hat am Bildschirm keine Duck-Taste. Haunting behält
  dafür **eine** Taste (`Ctrl` gehalten) und einen Umschalter **Ducken** im
  Panel des Technikers — die eine Ausnahme, ausdrücklich, weil das Spiel an
  der Lautstärke hängt (`CROUCH_FACTOR`).
- **Der HUD-Streifen** (Sauerstoff, Anzug, Bildrate, Aufträge, Ladebalken):
  am Bildschirm ein **DOM-Streifen** (`.orbital-hud`, dieselbe Rechnung
  `rules/roundHud.ts`), in der Brille weiter der Streifen an der Kamera. Der
  Streifen an der Kamera hing an `ctx.camera`, und die Kamera von oben ist
  eine andere — deshalb DOM. Kompass (`objectiveCompass.ts`) bleibt DOM.
- **Die Konsolen** haben in der Brille und aus den Augen ihre Tafel mit
  UV-Treffern. Von oben zielt niemand mit UV; `A` an einer Konsole öffnet
  deshalb das **Rätsel als DOM** (`map/puzzleOverlay.ts`, bisher die
  2D-Welt) über dem Bild, gespeist aus derselben `PuzzleState`/`puzzleFor`-
  Rechnung (`mission.ts`), die die Tafel benutzt. Am Schreibtisch aus den
  Augen darf `A` dasselbe tun.
- **Das Optionsmenü des Schiffs** (`ShipExperience.shipOptions`,
  `map/optionsMenu.ts`) bleibt: Zuschauen an/aus, Zeitraffer, Zentrale,
  Menü, Verbindung, VR, Ton, Runde verlassen. Weg sind „Ansicht: 2D ↔ 3D"
  und die Einträge, die nur die 2D-Welt hatte. Seine Klassen (`ui-option`,
  `ui-head`, `ui-panel`) kommen aus `ui/widgets.css`; die **Lage** über dem
  Schiff (`.flat__panel`-Rolle) wandert nach `haunting.css`, `map/flat.css`
  fällt. `map/controls.css` wird zu `map/joystick.css` mit nur dem Stock
  (`.flat__stick*`), den `monsterView` und der Zuschauer weiter brauchen;
  die Knöpfe (`.flat__buttons`, `.flat__key*`) fallen.

### Netz und Protokoll

`STATION_PROTOCOL` bleibt 8. `HauntState.technician` (die Stelle des
2D-Technikers) bleibt im Protokoll stehen, wird aber von niemandem mehr
gefüllt außer dem Kern beim Aufbau; ein altes Telefon liest weiter dieselben
Felder. Der Gastgeber ist, wer Techniker ist (`net.pickGameHost`) — am
Bildschirm heißt das jetzt immer das Schiff, von oben oder aus den Augen.

## Pakete

Die Dateilisten überlappen sich **nicht**; wer eine Datei braucht, die einem
anderen Paket gehört, sagt es im Bericht statt sie anzufassen. Reihenfolge:
**H1 zuerst** (ohne den Grundriss ist jede Suite rot und nichts prüfbar),
**dann H2 und H3 parallel**, **dann H4**.

### H1 — Haus und Layout auf 1 m

Dateien: `house.ts`, `plan.ts`, `stationLayout.ts`, `fixtureDimensions.ts`,
`stations.ts`, `stationNavigation.ts`, `stationTravelPlan.ts`,
`map/geometry.ts`, `map/extract.ts`, `map/flatRound.ts` (nur
`MONSTER_RADIUS`), `haunt.ts`, `rules/technicianBot.ts` (nur `DREAD_CORE`),
`rules/cargo.ts`, `roomGraph.ts`, `perception.ts`, `audio/hearing.ts`,
`vents/ventNet.data.ts`, `vents/ventPlacement.ts`, `vents/ventGraph.ts`,
`trainingLayout.ts`, `trainingDeck.ts`, `world3d/commandSeats.ts`,
`world3d/signposts.ts`, `world3d/spaceBackdrop.ts`, `shipArt.ts`,
`fixtureModels.ts`, `marks.ts`, `navigationOverlay.ts`,
`src/worlds/editor/levelBuild.ts` (nur der Pfostenschutz) — und **alle Tests
dazu**: `house.test`, `stationLayout.test`, `stationArchitecture.test`,
`stationNavigation.test`, `stationTravelPlan.test`, `roomGraph.test`,
`perception.test`, `audio/hearing.test`, `geometry.test`, `groundTruth.test`,
`haunt.test`, `vents/*.test` (außer `flatVents`), `trainingLayout.test`,
`world3d/*.test`, `shipArt.test`, `fixtureModels.test`, `navigationOverlay.
test`, `navmesh/*.test` (außer die langsamen), `monster/*.test`,
`rules/*.test` (außer `botRound`, `monsterStuck`), `roundSim.test`,
`archiveMap.test`, `stationVisibility.test`, `flatKernel.test`,
`netReplay.test`, `net.test`, `mission.test`.

Ziel: **Jede schnelle Suite unter `haunting/`, die nicht zu H2/H3 gehört,
ist grün** — H2/H3 gehören `HauntingWorld.replay.test`, `ShipExperience.test`,
`stationUi.test`, `views/roles.test`, `map/flatMode.test`, `map/flatMap.test`,
`map/flatScene.test`, `map/flatArt.test`, `map/flatBooks.test`,
`map/mapView.test`, `desktopControls.test`, `world3d/shipControls.test`,
`monster/monsterMode.test`, `monster/monsterRole.test`. Dazu `npm run
typecheck`, `lint`, `format:check`. Die langsamen Suiten laufen in H4.

Was zu tun ist, steht oben unter _Entscheidungen_; dazu: `shipArt.ts`
rechnet Deckplatten, Wandpaneele (`TILE − 0.48` und `post = TILE / 2 −
0.19` sind Maße einer 2,5-m-Kachel — Paneele auf die Wandläufe, Pfosten
weg), Raumschilder (`closedTileX`) und Gangnamen in Metern nach; `marks.ts`
stellt ein Merkmal auf die Kachelmitte (bleibt); `navigationOverlay.ts`
zeichnet seine Bodenflächen `TILE · 0.94` — Meter, bleibt; `signposts.ts`
misst Schilder über Öffnungen aus `edges.length · TILE` — mit 1-m-Türen
sind das schmale Schilder, `JUNCTION_SIGN_WIDTH` deckelt nach oben, unten
bleibt ein Mindestmaß von 0,7 m. `spaceBackdrop` nimmt die Mitte aus
`missionExtent`. `world3d/commandSeats.ts` und `trainingLayout.ts` rechnen
aus `APRON` in Metern (siehe oben).

### H2 — 2D-Karte raus, Kern-Kamera

Dateien: `HauntingWorld.ts`, `HauntingWorld.replay.test.ts`,
`map/flatMode.ts` (löschen), `map/flatScene.ts` (löschen), `map/flatArt.ts`
(löschen), `map/toolIcons.ts` (löschen), `map/flatMode.test.ts`,
`map/flatScene.test.ts`, `map/flatArt.test.ts`, `map/flatMap.test.ts`,
`map/flatBooks.test.ts` (die Buchführungs-Fälle wandern nach
`flatKernel.test.ts` oder `flatRound.test.ts`, wenn sie `FlatMode` brauchen),
`map/mapView.test.ts` (nur, was `FlatMode` importiert), `map/index.ts`,
`map/mapSource.ts`, `map/worldSource.ts`, `monster/monsterSession.ts`
(löschen), `monster/monsterMode.test.ts` (löschen),
`monster/flatMonsterControl.ts` (**bleibt**, nur die Doku: Es ist das eine
Steuer, das `MonsterDriver` und `MonsterPort` ohne Leitung an einer
`FlatRound` zusammensteckt — kein Bild, kein DOM —, und daran drehen
`monster/monsterHelm.test.ts` und `monster/monsterRole.test.ts`; sie auf
das Netz umzuschreiben prüfte das Protokoll statt den Helm), `monster/
monsterHelm.ts` (Kommentare), `rules/lobby.ts`, `rules/lobby.test.ts`,
`rules/worldMenu.ts`, `rules/worldMenu.test.ts`, `stationUi.ts`,
`stationUi.test.ts`, `views/roles.test.ts`, `src/main.ts` (nur
`ENTRY_HINTS`/Kommentare, falls sie die gemalte Karte versprechen).

Ziel: `ownsFlat = false`, kein Import von `map/flatMode` mehr, das Schiff
läuft von oben mit der Kamera des Kerns; `batchGridGeometry()` false;
Deckenkram mit `userData.level = 1`; `touchStick` nur an der Zentrale;
`kernelInput` mit Rig-Gier von oben; Bot-Runde von oben über das Rig;
alle Tests dieser Liste grün, dazu die vier Prüfungen.

**Was mit der Karte wegfällt:** Ein Telefon am Steuer des Monsters, das
allein im Raum ist, bekam bisher die gemalte Karte mit einem Techniker aus
Zahlen. Das Schiff rechnet nur dort, wo ein Techniker steht (`stepKernel`,
Rolle `vr`); ohne Techniker im Raum sagt der Start jetzt, was fehlt
(`HauntingWorld.MONSTER_NEEDS_TECHNICIAN`): eine Brille, „Web 3D" oder
„Zuschauen" auf einem zweiten Bildschirm. Ein Gastgeber-Telefon, das die
Bot-Runde hinter seiner Zentrale rechnet, wäre der nächste Schritt, nicht
dieser.

`ShipExperience.ts` gehört **H3** — H2 fasst es nicht an. Damit H2 den
`switchView`-Haken des Wirts abbauen kann, ohne H3 zu berühren, lässt H2
`ShipHost.switchView` als **optionales** Feld stehen und übergibt es nicht
mehr; H3 streicht es.

### H3 — Spieler-UI auf A-Knopf, Usable, Werkzeug-Knopf

Dateien: `ShipExperience.ts`, `ShipExperience.test.ts`, `ShipEffects.ts`,
`desktopControls.ts` (löschen), `desktopControls.test.ts` (löschen),
`world3d/shipControls.ts` (löschen), `world3d/shipControls.test.ts`
(löschen), `map/flat.css` (löschen), `map/controls.css` → `map/joystick.css`,
`map/optionsMenu.ts`, `map/optionsMenu.test.ts`, `map/puzzleOverlay.ts`,
`haunting.css`, `stationDashboard.css`, `views/views.css`,
`monster/monster.css`, `objectiveCompass.ts`, `helmetCondensation.ts`,
`comfortSettings.ts`, `HauntingComfort.ts`.

Der Wirt-Haken für Usables: H3 **darf** in `HauntingWorld.ts` genau diese
Zeilen ergänzen — in der Erzeugung der `ShipExperience` die Felder
`usable: (object, usable, options) => this.addUsable(object, usable, options)`
und `unusable: (object) => this.removeUsable(object)`, dazu die Überschreibung
von `toolChoice()`/`screenTool()`/`defaultScreenTool()` und `useForward()`
(Sonderfälle, dann Kern, sonst Licht) — und **sonst nichts** in dieser Datei;
weil H2 dieselbe Datei umbaut, setzt H3 diese Zeilen **erst nach H2** ein
(H3 fängt mit `ShipExperience` und den Stilblättern an und wartet mit
`HauntingWorld.ts`, bis H2 committet hat; steht H2 schon, entfällt das
Warten).

Ziel: Der Techniker spielt von oben und aus den Augen mit `A`, Saum,
Werkzeug-Knopf, Pinch; kein eigener Stock, keine eigenen Tasten außer
`Ctrl` (Ducken); HUD als DOM-Streifen; Konsolen von oben über das
Rätsel-DOM; alle Tests dieser Liste grün, dazu die vier Prüfungen.

**Abweichungen bei der Umsetzung:** Das Rätsel-DOM ist die **Tafel des
Technikers** (`ShipExperience.paint`, `near.console`), die die Knöpfe des
Rätsels schon immer hatte — `A` an der Konsole öffnet den Wartungskasten
und klappt die Tafel auf (`useConsole`); `map/puzzleOverlay.ts` (an eine
`FlatRound` gebunden) ist damit ohne Nutzer und weg. `A` vor der **offenen**
Kiste nimmt das Teil statt die Kiste zu schließen (das Blatt liegt vor dem
Teil, `pickUsable` nähme sonst immer das Blatt). Die Bildschirmhand des
Kerns bleibt leer (`defaultScreenTool` → `null`): Was in den Händen liegt,
zeichnet das Schiff weiter selbst vor der Kamera. Die Lampe der Zentrale
meldet sich mit eigenem Halbmesser an (`BindExtra.radius`) — die Ausdehnung
einer Lampe ist ihr Lichtkegel.

### H4 — Nacharbeit

Alles, was danach noch rot ist: Nav, Monster und Bots auf den neuen Maßen.
Die Rundensimulationen, die das früher nachwiesen (`npm run test:slow` mit
`rules/botRound.test`, `map/flatRound.test`, `botTraining.test` und den
übrigen elf), sind mit dem langsamen Lauf gegangen — wer die Balance wieder
nachmessen will, holt sie aus der Geschichte (`docs/agents/tests.md`)
(`TrainingRun(DEFAULT_TUNING, 'both', 12, { rounds: 64 }, 99)`, Ergebnis mit
Messreihe in den Test) — die Ungleichung der Tempi (`botTuning.test`) bleibt
dabei unangetastet. Dazu `npm test` ganz, `npm run build`, und die Liste der
Stellen in AGENTS.md/README, die nicht mehr stimmen.

**Was H4 gefunden hat:**

- `stationSmoothing.test`/`flatWalk.test` maßen mit 0,45 bzw. 0,4 + 0,05 —
  durch eine 1-m-Tür auf dem 0,25-m-Raster passt das nicht; die Tests messen
  jetzt mit `MONSTER_RADIUS` (0,3). Die Wandlinien des Snapshots werden für
  die Prüfung an den Enden um die halbe Dicke gekürzt (am Pfosten ist eine
  Wand nicht dicker), und Türen zwischen zwei Gängen (ganze Kante offen)
  haben keine Mitte, an der eine Strecke vorbeimüsste.
- `shipArt`: Wanddekor lässt an einer Ecke mit Tür 0,34 m frei (die Öffnung
  reicht bis in die Ecke), Raumschilder sind nie breiter als die Wand, eine
  Deckplatte je Kachel.
- `roundSim.move` lief auf die Mitte des Nachbarraums zu und schnitt dabei
  die Ecke eines dritten Raums — der Techniker pendelte bis zum Rundenende
  (`timeout` ohne einen einzigen Kontakt). Jetzt geht er durch die Tür
  (`roomGraph.portalPoint`).
- Die Gefahr des Technikers (`roundSim`, `rules/technicianBot.ts`) maß über
  die Raummitten (`graph.distance` < 1,5 · Vorsicht); in der zwanzig Meter
  breiten Cafeteria fühlte er ein Monster sechs Meter hinter der Tür nie.
  Jetzt zählt der Weg zu Fuß über die Türen (`roomGraph.walkingGap`).
- Nachgelernt: `trainBots('both')` fand mit 96 Runden je Schritt einen Satz,
  der auf 4 × 400 Runden nicht hielt (0,61 / 0,24) — der Abstand zwischen zu
  zweit und im Team hängt am Zuruf (`commandLag`) und nicht an den Gewichten
  des Monsters. Ein Raster über Vorsicht und Wartezeit fand
  `caution` 13 m, `nerve` 5 s (Techniker; Monster unverändert); gemessen wie
  im Test treffen beide Bänder. `roundSim.test` prüft die Handgriffe seither
  über die Dauer gewonnener Runden: Schneller arbeiten heißt auf dieser
  Station schneller fertig, nicht öfter gewinnen (Laufen ist die Zeit, in der
  man gehört wird).

## Regeln für jedes Paket

- Vor dem Commit: `npm run typecheck`, `npm run lint`, `npm run format:check`
  (bzw. `npm run format`), `npx jest <die eigenen Pfade>`. Committet wird
  mit `git add <eigene Dateien>` — **nie `git add -A`**, nie `git stash`, nie
  ein `checkout` fremder Dateien: Andere Pakete arbeiten im selben Worktree.
- Kein Test wird übersprungen, deaktiviert oder gelöscht, es sei denn, das
  Getestete ist selbst gelöscht — dann steht im Commit, warum.
- Kommentare und Doku auf Deutsch, im Ton des Projekts (sagen, **warum**).
- Nicht anfassen: `src/worlds/test/`, `src/worlds/kart/`, `src/worlds/range/`,
  `src/worlds/climb/`, `src/worlds/index.ts`, `src/worlds/grid/`, `src/core/`
  (nur wenn ein Haken für Haunting unvermeidbar fehlt — dann minimal, mit
  Test, im Bericht nennen).
- Jedes Paket schreibt in seinen Bericht: Branch-Stand, was gebaut ist, welche
  Tests rot sind und warum, welche Stellen in AGENTS.md/README nicht mehr
  stimmen.
