# Plan: 1-m-Gitter, Overcooked-Figuren, eine Testwelt

Dieses Dokument ist der Vertrag zwischen den Paketen des Umbaus vom September
2026. Wer ein Paket baut, liest es **ganz**, hält sich an die Zahlen und Namen
darin und schreibt hinterher AGENTS.md um, wo es nicht mehr stimmt.

Ausgangsstand: Commit `3678f32` (P8, „Phaser raus"). Wer etwas aus einer
gelöschten Welt nachlesen will, holt es sich mit
`git show 3678f32:src/worlds/<welt>/<Datei>.ts`.

## Stand

**Umgesetzt ist alles**, Haunting eingeschlossen; Paket X hat AGENTS.md, README
und die Quellkommentare nachgezogen. Was davon im Spiel steht:

- **Welten** (D): Es gibt `hub`, `editor`, `test` und `haunting`. Die vierzehn
  anderen sind gelöscht, ihre wiederverwendbaren Module stehen (`kart/`,
  `range/scoring`, `climb/`, `effects/`, `interact/doorMotion`,
  `dark/lightLevels`, `signs/`, `tune/` ohne seine Welt).
- **Gitter** (G): `TILE` 1, `PLAN_WALL_T` 0,2, `PLAN_DOOR_W` und
  `PLAN_WINDOW_W` 0,8, Bausteine ≤ 1 m, Treppen über mehrere Kacheln
  (`GridPlan.stairs(…, length?)`, `lift`, 0,7 m je Kachel, Stufen
  0,175 × 0,25), `ramp`, Autostep-Mindestbreite 0,1, Weltformat `0.3.0` mit
  dem Feld `y`, Hub 11 × 11, Bauplatz-Startzimmer 8 × 8, Gitterlinien unter
  _Menü → Grafik_, Wand-Ghosting (`grid/wallGhost.ts`), kein Dach in Hub,
  Bauplatz und Testwelt.
- **Interaktion** (I): `A` benutzt überall (in der Brille `primary` rechts, und
  springt nur, wenn nichts in Reichweite ist — `PlayerRig.useCandidate`),
  Auswahl in jeder Ansicht (`usable.aimForward`), gelber Saum
  (`core/highlight.ts`), Hinweis über der Figur in beiden Bildschirmansichten,
  Werkzeug-Knopf `#hud-tool` mit Liste (`ui/ToolButton.ts`, `World.toolChoice`,
  Hand = leer, `Tab`/`Y`), `screenTool()` als Wahl und `defaultScreenTool()`
  als Vorgabe, stufenloser Pinch-Zoom (`TopDownCamera.zoomScale`), Touch-`A`
  und `B` nebeneinander über dem Zielstock.
- **Figur** (C): der Overcooked-Koch (`core/AvatarBody.ts`,
  `core/avatarLook.ts`) — Rumpf, Kopf, Handkugeln, keine Arme und Beine;
  Aussehen `{ hat, head, body }` mit vier Köpfen, acht Hüten (samt Kochmütze)
  und fünf Jacken, im `hello` über das Netz, Menü → Aussehen mit drei Zeilen.
- **Testwelt** (W): `src/worlds/test/` mit neun Zonen in `zones/`, Grundriss in
  `testPlan.ts`, Rechtecke in `layout.ts`, Vertrag in `zones/zone.ts`,
  `editable()` wahr, Einbauten getrennt in `fitTest` (weil `planLoaded`
  zweimal läuft).
- **Umkleide** (U): Einbau `wardrobe` mit Spiegel (`grid/fixtures/wardrobe.ts`),
  Ereignis `wardrobe`, `ctx.openWardrobe()`, `ui/WardrobeMenu.ts`, in der
  Brille die Menüseite _Aussehen_.

- **Haunting** (H, eigener Plan `docs/plan-haunting-1m.md`): Die Station steht
  auf 1-m-Kacheln, ihre Türen gehen über die ganze Kachelkante, die gemalte
  2D-Welt ist weg (`World.ownsFlat` ist falsch — von oben schaut die Kamera des
  Kerns), der Rechenkern und die Karte der Telefone bleiben, und der Techniker
  spielt mit `A`, Saum und Werkzeug-Knopf wie überall.

**Offen** bleibt eine Lücke, die der Umbau gerissen hat und die keinem Paket
gehört: Mit dem Navigationslabor ist der einzige Test gefallen, der einen
**Eindruck** prüfte statt einer Rechnung (siehe AGENTS.md, _Tests_).

## Was der Besitzer will (wörtlich zusammengefasst)

1. **Figuren wie bei Overcooked**: runder Unterkörper, Kopf, zwei schwebende
   Hände, wahlweise ein Hut — statt des Kapsel-Skeletts mit Armen und Beinen.
2. **Kacheln von 1 × 1 m** statt 2,5 m, in **allen** Welten, damit sich feine
   Welten wie die Küchen von Overcooked bauen lassen. Wände stehen weiterhin
   **zwischen** Kacheln (auf Kanten).
3. **Kein Dach** auf Gebäuden und Objekten (Schießstand, Stände, Zimmer),
   damit die Kamera von oben hineinsieht. Steht der Spieler **hinter einer
   Wand**, wird die Wand durchsichtig („Ghost"), damit man ihn sieht.
4. Ein **Kleiderschrank mit Spiegel**, mit dem man interagiert: ein Umkleide-
   Menü mit der Figur in Nahaufnahme, in dem man **Kopf, Hut und Körper**
   einzeln wechselt.
5. **Alles Interagierbare liegt auf `A`** (VR: `A` rechts; Desktop: `E`/Enter;
   Glas: Knopf `A`; Gamepad: `A`). Was gerade interagierbar ist, wird
   **hervorgehoben** — wenn man nah genug steht und hinschaut; bei mehreren
   das nächste bzw. das, worauf man am ehesten zeigt. Auch ins **Gokart
   einsteigen** und **Knöpfe drücken** gehen so. Mit einem Werkzeug in der Hand
   kann man trotzdem interagieren.
6. Im Menü unter **Grafik** lassen sich die **Gitterlinien** der aktuellen Ebene
   einblenden.
7. Die **Treppe** der Straßenküche war schwer hinaufzugehen — Treppen müssen
   sich sauber gehen lassen.
8. **Pinch im oberen Bereich des Schirms** zoomt die Kamera von oben
   (Abstand näher/ferner).
9. Der Touch-Knopf **`B` sitzt zu hoch** über dem rechten Stock — beheben.
10. Ein **Werkzeug-Knopf**, der das gewählte Werkzeug zeigt; ein Druck öffnet
    die **Liste** der Werkzeuge. Erstes Werkzeug ist die **Hand (leer)** —
    dann ist kein Werkzeug aktiv.
11. **Welten sind serialisierbar** (Datei rein, Datei raus).
12. **Nur noch eine Testwelt** neben Hub, Bauplatz und Haunting. Sie enthält:
    Navigationstest, Interaktionen, Effekte, Gokarts, Portale, Schießstand,
    Klettern, Treppe/Podest, Kleiderschrank. Gelöscht werden: Portal Labor,
    Schießstand, Gokart, Pizzeria, Eingaberaum, Dust, Mond, Alpen, Effektlabor,
    Straßenküche, Interaktionslabor, Navigationslabor, Kletterhalle,
    Dunkelhaus.
13. **Haunting** wird nur an das neue Gitter angepasst — und bekommt **dieselbe
    3D-Ansicht von oben** wie alle anderen Welten (keine eigene gemalte
    2D-Karte mehr), und die Spieler-UI dort gleicht der hier beschriebenen
    (A-Knopf, Hervorhebung, Werkzeug-Knopf, Pinch-Zoom).

## Entscheidungen, die für alle gelten

### Das Gitter

- `navTile.TILE` wird **1**. Die Kachelschlüssel (±1024 Kacheln) reichen damit
  ±1024 m, mehr braucht keine Welt.
- `PLAN_WALL_T` wird **0,2** (Wand auf der Kante, je 10 cm in beide Kacheln).
  Lichte Weite eines 1-Kachel-Gangs: 0,8 m; die Spielerkapsel hat 0,24 m
  Halbmesser (`physics/playerClearance.ts`), das reicht.
- `PLAN_DOOR_W` wird **0,8** (Kachel minus zwei Pfosten von 10 cm).
  `PLAN_WINDOW_W` wird **0,8**. Türhöhe 2,1 und Wandhöhe 2,8 bleiben.
  Die Schiebetür des Einbaus (`fixtures/door.ts`) rechnet ihre Halbflügel aus
  `doorWidth`, nicht aus festen 62 cm.
- **Bausteine passen in eine Kachel**: Tisch, Bank, Kisten, Regal werden auf
  ≤ 1 m Kantenlänge gebracht (Küchenzeile 1 m lang, 0,6 m tief; Tisch
  0,9 × 0,9; Kisten ein Stapel aus zwei Kisten von 0,45 m). Die Zahlen darf
  das Gitter-Paket festlegen — die Regel ist: nichts ragt über die Kachel.
- **Treppen sind mehrere Kacheln lang.** `GridPlan.stairs(x, z, dir, level,
  length?)` legt `length` Kacheln Treppe in Richtung `dir`; ohne Angabe ist
  `length = ceil(rise / 0.7)` (bei 2,8 m Etagenhöhe also 4). Jede Kachel ist
  ein `stairs`-Baustein mit eigenem `height` (der Teilanstieg) und einem
  neuen `lift` (auf welcher Höhe über dem Etagenboden er anfängt), Stufen
  **≤ 0,2 m hoch und ≥ 0,25 m tief**. Im Graphen: jede Treppenkachel bleibt
  auf `level` mit `rise = lift`, oberhalb jeder Treppenkachel wird das Loch
  geschlagen, und die **letzte** Kachel verbindet auf die Landekachel darüber
  (`connect`, wie bisher). `BlockPlacement.lift` wird mit gespeichert
  (`worldFile.ts`, Feld `y`, fehlt bei 0 — Fassung `0.3.0`, `0.2` bleibt
  lesbar).
- `PhysicsLocomotion.enableAutostep(0.32, 0.18, …)` wird auf eine
  Mindestbreite von **0,1** gesetzt — die 0,18 waren der Grund, warum die
  Stufen der Straßenküche (0,19 m tief) klemmten.
- **Ebenenhöhe** in neuen Welten: **2,8 m** (`PLAN_WALL_H`), Podeste in der
  Testwelt ebenso.
- **Kein Dach**: `RoomOptions.ceiling` bleibt als Möglichkeit, aber keine der
  verbleibenden Welten benutzt es. Massen als Dach über Hallen gibt es nicht
  mehr.
- **Gitterlinien** (`GraphicsSettings.gridLines`, ab Werk aus, Häkchen unter
  _Menü → Grafik_): `GridWorld` zeichnet je Etage ein `LineSegments`-Netz über
  die Bodenkacheln (Kanten aller Kacheln der Ebene, 1 cm über dem Boden,
  halbtransparent), sichtbar nur für die Ebene, auf der das Rig steht
  (`rigLevel`), und nur, wenn das Häkchen an ist. `userData.level` gesetzt,
  damit das Aufschneiden es mitnimmt.
- **Wand-Ghosting** (`GridWorld`, nur `ctx.topDown`): Jedes Bild ein Strahl von
  der Kamera zur Rig-Mitte gegen die Quader des Gitters (`slabs`, Massen
  eingeschlossen; Böden ausgenommen). Was zwischen Kamera und Figur liegt und
  höher als die Figur ragt, bekommt für dieses Bild ein **durchsichtiges
  Zwillingsmaterial** (gleiche Farbe, `transparent`, `opacity 0.25`,
  `depthWrite false`) und danach sein Material zurück. Die Zwillinge liegen in
  einer zweiten Palette und werden geteilt. `batchGridGeometry()` bleibt
  `false` in allen verbleibenden Welten, damit ein einzelner Quader
  umschaltbar ist.
- **Der Hub** bleibt auf dem Gitter, wird aber auf 1-m-Kacheln neu
  ausgelegt (`hubGrid.ts`): Halle 11 × 11 Kacheln, Gänge 3 Kacheln breit,
  Tore 2 Kacheln auseinander, erstes Tor 2 Kacheln hinter dem Hallenrand.
  Der Test des Hubs prüft weiterhin Erreichbarkeit aller Tore.
- **Der Bauplatz** (`editor/`): Startzimmer und Miniatur werden auf 1-m-Kacheln
  angepasst (Startzimmer 8 × 8), die Palette bekommt die neuen Bausteine.

### Interaktion und Steuerung

- **`A` benutzt — überall.** `PlayerRig.requestUse()` wird ausgelöst von: `E`/
  Enter (Desktop), Touch-`A`, Gamepad-`A` (in jeder Bildschirmansicht, nicht
  nur von oben), **und in der Brille von `primary` der rechten Hand**
  (`XRInput`). Springen bleibt auf demselben Knopf, **solange nichts in
  Reichweite ist**: Steht etwas Benutzbares vor der Figur, benutzt `A` es und
  springt nicht — so macht es jedes Spiel mit einem Knopf. Die Leertaste
  springt am Desktop weiterhin immer.
- **Die Auswahl gilt in jeder Ansicht**, nicht nur von oben. `PortalWorld`
  rechnet jedes Bild `pickUsable` mit Ursprung Rig-Position und Richtung
  „wohin die Figur schaut": von oben die Rig-Richtung, aus den Augen und in
  der Brille die **Kopfrichtung** (`getHeadForward`, waagerecht projiziert).
  Reichweite `USE_REACH` 1,5 m bleibt.
- **Hervorhebung**: Das gewählte Ding bekommt ein **Leuchten** — ein
  gelblicher Saum (`core/outlineShell.ts`-Mechanik, Farbe `0xffd35a`, nicht
  schwarz) **oder**, wo das Ding keine Geometrie hat, ein Ring auf dem Boden.
  Umgesetzt in einer eigenen Datei `core/highlight.ts` (reine Funktion
  `highlight(object | null)`, die das vorige Ding zurücksetzt). Dazu der
  Hinweis über der Figur (`usePrompt`) wie bisher, jetzt in **allen**
  Ansichten außer der Brille (dort reicht der Saum).
- **Werkzeug-Knopf** (`#hud-tool`, unten rechts über `A`/`B`, in allen
  Bildschirmansichten; in der Brille bleibt das Regal im Handgelenkmenü): ein
  runder Knopf mit der Ikone des gewählten Werkzeugs (`drawMenuIcon`) oder
  einer offenen Hand. Ein Druck öffnet eine **Seite** (`ui/PageMenu.ts`,
  eigener Baum) mit der Liste: **Hand (leer)** zuerst, dann die Werkzeuge der
  Welt (`beltLoadout()`, sonst `TOOL_IDS`). Gewählt wird `PortalWorld.
  screenTool()` → das Werkzeug in der Bildschirmhand; **Hand** heißt `null`
  (nichts in der Hand, Trigger tut nichts). Gamepad: `Y` (Knopf 3) öffnet
  dieselbe Liste; Tastatur: `Tab`.
- **Pinch-Zoom** (`FlatControls`): Zwei Finger, die beide **in der oberen
  Hälfte** des Schirms aufsetzen (keiner auf einem Stock oder Knopf), zoomen
  stufenlos: `TopDownCamera.zoomScale(factor)` skaliert den Abstand zwischen
  `TOP_DOWN_DISTANCES[0]` und dem letzten Eintrag. Das Rad und die Bumper
  rasten weiter auf Stufen (die nächste Stufe vom aktuellen Abstand aus).
- **Touch-Knöpfe** (`style.css`): `A` und `B` sitzen **nebeneinander über dem
  Zielstock**, `B` links von `A`, beide auf derselben Höhe, mit mindestens
  12 px Luft zum Stock.

### Die Figur (`core/AvatarBody.ts`)

- **Aufbau**: ein **Rumpf** (Kapsel-/Tonnenform, ca. 0,5 m breit, vom Boden bis
  unter den Kopf, oben etwas schmaler), ein **Kopf** (Kugel, Ø ≈ 0,32 m, mit
  zwei Augen und einer Nase — von oben muss man sehen, wohin er schaut), zwei
  **Hände** (Kugeln Ø ≈ 0,12 m, schwebend, ohne Arme), und der **Hut**
  (`headgear.ts`, an den runden Kopf angepasst). Keine Beine, keine Arme.
- **Antrieb** bleibt derselbe: `update(dt, head, left, right)` mit Kopf und
  Händen; der Rumpf steht unter dem Kopf, dreht mit `bodyYaw` (Totzone wie
  bisher), seine Höhe folgt der Kopfhöhe (Ducken macht ihn kleiner).
  Nicht getrackte Hände schweben seitlich neben dem Rumpf; beim Laufen
  pendeln sie leicht.
- **Aussehen** (`core/appearance.ts`): `{ hat, head, body }`. `head` wählt
  aus einer Liste von Köpfen (Hautton + Gesicht: mindestens vier, z. B.
  `round`, `freckles`, `beard`, `moustache`), `body` aus einer Liste von
  Körpern (Kochjacke weiß, rot, blau, grün, gestreift; mindestens vier). Die
  **Anzugfarbe der Rolle** färbt weiter, was keine eigene Farbe hat (Schürze,
  Halstuch). Alles geht im `hello` über das Netz (`NetSession`, Felder `hat`,
  `head`, `body`, alle optional, unbekannte Werte → Vorgabe).
- **Menü → Aussehen** bekommt drei Zeilen (Kopf, Hut, Körper), jede schaltet im
  Kreis; das Umkleide-Menü (unten) zeigt dieselben drei Zeilen neben der Figur.
- API, die bleibt, weil andere daran hängen: `head`, `handAnchors`,
  `setColor`, `setHeadgear`, `setSelfView`, `setHandsVisible`, `update`,
  `dispose`, `bodyYaw`; neu: `setLook(look: Appearance)`.

### Der Kleiderschrank

- Einbau-Art `wardrobe` (`grid/fixtures/wardrobe.ts`): ein Schrank von einer
  Kachel Breite an einer Kante, mit einem **Spiegel** auf der Front
  (`worlds/shared/Mirror.ts`, wie der Standspiegel), fest (`solid` wahr),
  benutzbar. `use` meldet `{ type: 'wardrobe' }` als neues `FixtureEvent`;
  `GridWorld` öffnet darauf die **Umkleide**.
- **Die Umkleide** (`core/wardrobe/` oder `ui/WardrobeMenu.ts`): am Bildschirm
  eine Seite über dem Bild mit **der Figur in Nahaufnahme** (eine zweite Szene
  mit einem `AvatarBody` in Wunschansicht, gerendert in ein eigenes Canvas
  rechts, ca. 40 % der Breite) und links drei Zeilen mit ‹ › : Kopf, Hut,
  Körper, dazu _Fertig_. In der Brille: dieselben drei Zeilen als Panel vor
  dem Schrank, und der Spiegel zeigt einen — dort braucht es keine zweite
  Szene. Jede Änderung speichert sofort (`saveAppearance`), der eigene Körper
  und das Netz hören ohnehin zu.

### Die Testwelt (`worlds/test/`)

- Id `test`, Titel „Testwelt", `GridWorld`, `editable()` **wahr** (der Sinn
  des 1-m-Gitters ist, dass man feine Welten baut), `planLoaded` setzt das Tor
  zum Hub und alle Einbauten zurück, die eine Zone braucht.
- Der Grundriss steht in `test/testPlan.ts` **ohne three.js**, mit einem Test,
  der jede Zone vom Startplatz aus erreicht. Zonen liegen als eigene Dateien
  daneben (`zones/<name>.ts`, je eine Funktion `stamp<Name>(plan)` plus, wo es
  Requisiten braucht, eine Klasse, die `TestWorld` in `buildProps` ruft):
  - **Start und Tor** (Mitte): Startplatz, Tor `→ Hub`, ein Schild.
  - **Interaktionen** (Nordwest): Türen (slide/swing/plate), Knopf, Hebel,
    Druckplatte mit zwei Kisten, Lampe, Schilder.
  - **Effekte** (Nord): vier Effektquellen (Rauch, Feuer, Funken, Wasser), ein
    Knopf je Quelle.
  - **Treppe und Podest** (Nordost): ein Podest auf Ebene 1 mit Brüstung, eine
    4 Kacheln lange Treppe, ein Hebel oben, der unten eine Lampe schaltet.
  - **Navigation** (West): ein Gang mit Kiste, eine Tür, ein Stachelfeld, ein
    Knopf, der einen NPC von A nach B schickt (aus `navlab/` das Nötigste
    übernehmen: roter Startknopf, ein Ziel).
  - **Schießstand** (Ost): eine Schießlinie **ohne Dach**, Scheiben auf 5, 10,
    20 m, Stahlplatten (`range/target.ts`, `range/scoring.ts`), Pistole im
    Gürtel.
  - **Gokart** (Süd): eine kleine Strecke aus `kart/kartTrack.ts`, zwei Karts
    in einer Box; **Einsteigen mit `A`** (das Kart meldet sich als `Usable`
    mit `usePrompt` „Einsteigen"), Aussteigen mit `A` halten wie bisher.
  - **Klettern** (Südost): eine Wand mit Griffen (`climb/holds.ts`,
    `stamina.ts`, `gripQuality.ts`) — die Hülle auf dem Gitter, die Griffe in
    Metern.
  - **Portale**: helle Tafeln (`panel`-Baustein) an drei Stellen, Portal-Waffen
    im Gürtel.
  - **Kleiderschrank**: neben dem Start.
- `worlds/index.ts` führt danach genau: `hub`, `editor`, `test`, `haunting`.

### Serialisierung

- `worldFile.ts` bleibt das Format; neu ist `lift` bei Bausteinen (Fassung
  `0.3.0`). Jede verbleibende Gitterwelt hat einen Test, dass
  `readWorld(writeWorld(plan))` denselben Grundriss ergibt (Kacheln, Wände,
  Bausteine, Einbauten, Massen).
- Die Testwelt bietet _Welt sichern_ (Speichern, Exportieren, Importieren,
  Verwerfen) wie der Bauplatz.

### Haunting (eigenes Paket, eigener Plan)

Haunting bekommt am Ende einen **eigenen Plan** (`docs/plan-haunting-1m.md`),
geschrieben von einem Planungsagenten, nachdem alles andere steht. Rahmen:

- Das Haus (`house.ts`, `stationLayout.ts`, `fixtureDimensions.ts`) wird auf
  1-m-Kacheln neu bemessen: Räume in ganzen Metern, Türen 0,8 m
  (`STATION_DOOR_W` = `PLAN_DOOR_W`), Gänge 2 Kacheln breit.
- Die **gemalte 2D-Karte** (`map/flatScene.ts`, `map/mapView.ts`,
  `map/flatMode.ts`, der Bordstock der 2D-Welt, das Optionsmenü der Karte)
  fällt weg; `World.ownsFlat` wird `false`, die Ansicht von oben ist die des
  Kerns. **Der Rechenkern bleibt** (`flatKernel.ts`, `map/flatRound.ts`,
  `geometry.ts`, `visibility.ts`, `extract.ts`): Was die Runde rechnet, bleibt
  eine Wahrheit; nur das Bild dazu ist jetzt die 3D-Szene.
- Die Spieler-UI (Techniker, Stationstafel) benutzt A-Knopf, Hervorhebung,
  Werkzeug-Knopf und Pinch-Zoom des Kerns; eigene DOM-Stöcke gehen weg.
- Die Rollen der Einsatzzentrale (Späher, Archiv, Tafel, Wache) bleiben, ihre
  Karten lesen weiter den Snapshot.

## Pakete und Reihenfolge

| Paket | Inhalt | Läuft |
| ----- | ------ | ----- |
| **D** Aufräumen | Welten löschen (siehe Liste), `WORLDS` auf hub/editor/haunting, Werkzeugseite und Tests nachziehen; wiederverwendbare Module bleiben (kart/, range/, climb/, effects/, interact/doorMotion, signs/, tune/ ohne TuneWorld, dark/lightLevels) | Welle 1 |
| **G** Gitter | TILE 1, Wanddicke, Türbreite, Bausteine, Treppen, Autostep, Hub, Bauplatz, Gitterlinien, Wand-Ghosting, kein Dach, Format 0.3 | Welle 1 |
| **I** Interaktion | A überall, Auswahl in jeder Ansicht, Hervorhebung, Werkzeug-Knopf + Liste + Hand, Pinch-Zoom, Touch-Knöpfe | Welle 1 |
| **C** Figur | Overcooked-Körper, Aussehen {hat, head, body}, Hüte angepasst, Netz, Menü Aussehen | Welle 1 |
| **W** Testwelt | `worlds/test/` mit allen Zonen, Kart-Einstieg per A, Serialisierungstest | Welle 2 |
| **U** Umkleide | Einbau `wardrobe`, Spiegel, Umkleide-Menü | Welle 2 |
| **H** Haunting | eigener Plan, dann Umsetzung | Welle 3 |
| **X** Doku | AGENTS.md, README, Steuerungstabelle, dieser Plan als erledigt | Welle 4 |

Welle 1 läuft **parallel in eigenen Worktrees**; die Pakete D, G, I und C
fassen deshalb möglichst verschiedene Dateien an:

- D: `worlds/index.ts`, die gelöschten Ordner, `tools/main.ts`, Tests, die auf
  gelöschte Welten zeigen, `hub/hubGrid.test.ts` (Weltenzahl).
- G: `nav/`, `grid/`, `editor/`, `hub/`, `physics/PhysicsLocomotion.ts`,
  `core/graphicsSettings.ts`, `core/App.ts` (nur die Zeile _Gitterlinien_ im
  Grafikmenü), `core/cutaway.ts`. **Nicht** die Welten, die D löscht — deren
  Tests dürfen in G rot sein. **Nicht** `haunting/` — dessen Tests dürfen
  nach G rot sein und werden von H repariert; G schreibt in seinen Bericht,
  welche.
- I: `core/FlatControls.ts`, `core/TopDownCamera.ts`, `core/topDownPose.ts`,
  `core/XRInput.ts`, `core/PlayerRig.ts`, `core/highlight.ts` (neu),
  `core/App.ts` (Werkzeug-Knopf, Tastatur/Gamepad-Kürzel), `ui/`,
  `worlds/portal/PortalWorld.ts` (Auswahl, Hervorhebung, `screenTool`,
  Hand), `index.html`, `src/style.css`, `core/gamepad.ts`.
- C: `core/AvatarBody.ts`, `core/PlayerAvatar.ts`, `core/appearance.ts`,
  `core/headgear.ts`, `net/NetSession.ts`, `net/RemoteAvatars.ts`,
  `core/App.ts` (nur das Menü _Aussehen_), `worlds/npc/NpcBody.ts` **nicht**
  (NPCs bleiben, wie sie sind).

## Regeln für jedes Paket

- Vor dem Commit: `npm run typecheck`, `npm run lint`, `npm run format:check`
  (bzw. `npm run format`), und `npx jest <die eigenen Pfade>`. Die ganze
  Suite (`npm test`) muss erst nach Welle 3 wieder grün sein; wer sie vorher
  laufen lässt, erwartet rote Haunting-Tests und die der gelöschten Welten.
- Kein Test wird übersprungen, deaktiviert oder gelöscht, es sei denn, das
  Getestete ist selbst gelöscht.
- Kommentare und Doku auf Deutsch, im Ton des Projekts (sagen, **warum**).
- Jedes Paket schreibt am Ende in seinen Bericht: was gebaut ist, welche
  Tests rot sind und warum, welche Stellen in AGENTS.md/README nicht mehr
  stimmen (X übernimmt das Umschreiben, wer es selbst tut, sagt es).
