# Haunting / Orbital: Raumstation für eine Quest und zwei Mobilgeräte

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

Haunting bleibt eine `GridWorld`/`PortalWorld`. Die Einsatzzentrale ist sicher;
vier getrennte Lehrzimmer liegen östlich außerhalb der Missionskarte. Der
inhaltliche Stand in README und diese Architektur müssen zusammenpassen.

**Das 1-m-Gitter und das Ende der gemalten 2D-Welt** (Paket H, September
2026, `docs/plan-haunting-1m.md`) — was seither gilt, in Zahlen und Namen:

- **Die Kachel ist ein Meter** (`nav/navTile.TILE` = 1). Die Station steht
  in `house.ts` als Tabelle in Metern: Räume meist 10 × 10 (Cafeteria
  20 × 18, Storage 15 × 12, Electrical 10 × 12, MedBay 9 × 10), **Gänge zwei
  Kacheln breit**, `STATION_BOUNDS` = 70 × 60 m, `HOUSE` 40 × 30 m, Vorplatz
  `APRON` 40 × 5 m, Aufzug `COMMAND_LIFT` 2 × 2. Kein Raum berührt einen
  anderen (eine Kachel Fuge; `roomGraph.test` verlangt, dass es keine
  Wandnachbarn ohne Tür gibt); Räume hängen nur über Gänge zusammen, und
  **zwischen zwei Gängen steht die ganze gemeinsame Kante offen** (Kreuzung).
  Lehrzimmer: `EAST` = Ostrand + 15 m, Safe 12 × 10, Modelle 20 × 15.
- **Die Tür ist eine ganze Kachelkante**: `house.STATION_DOOR_W` = `TILE`
  = 1,0 m, **ohne Pfosten** (`levelBuild.doorParts` lässt den Pfosten bei
  Breite null weg; `stationNavigation.buildGrid` legt dann keine
  Pfostenkästen). Begründung: Auf dem 0,25-m-Raster der Wegsuche
  (`SUBDIVISIONS` = 4) passt ein Körper von `MONSTER_RADIUS` = **0,3** durch
  1,0 m (Streifen 0,4 m, Rasterpunkte bei ±0,125); mit 0,8 m und Pfosten
  läge kein Rasterpunkt mehr im Streifen. `stationRoute` nimmt 0,3 als
  Vorgabe; `PLAYER_RADIUS` bleibt 0,24. Metrische Konstanten, die vorher „eine
  Kachel" meinten, stehen jetzt in Metern: `haunt.SLAM_REACH` 3,75,
  `DOORWAY_CLEAR` 1,9, `technicianBot.DREAD_CORE` = `CONTACT` + 2,5,
  `flatNavigator.WAIT_DEPTH` 0,55, `geometry.doorPath` Tiefe 0,55.
- **Die Hülle**: `StationPlan.solids()` legt Böden je Raum und Wände in
  Läufen zusammen (`mergeFloors`, `mergeWalls`), `batchGridGeometry()` ist
  **false** — der Kern ghostet Wände vor der Figur nur je Quader. Die Decke
  bleibt als Masse auf `level + 1`; was Haunting selbst an die Decke hängt
  (Lampenscheiben, Drehleuchten), trägt `userData.level = 1`, damit die
  Kamera von oben es mit der Decke abschneidet (`core/cutaway.ts`).
  `shipArt`: eine Deckplatte je Kachel (Schachbrett), ein Pfosten je Meter
  Wand, Paneele `TILE − 0,2`; an einer Ecke mit Tür lässt die Wand daneben
  0,34 m frei (`cutPlus`/`cutMinus`), Raumschilder nie breiter als die Wand.
- **Die Ansicht von oben ist die des Kerns**: `HauntingWorld.ownsFlat` ist
  **false**; _Menü → Ansicht_ schaltet wie überall (`core/TopDownCamera.ts`,
  `App.topDown`, `FlatControls`). Der Gierwinkel der Runde kommt von oben aus
  dem Gestell (`HauntingWorld.lookYaw`), sonst aus der Kamera. **Weg** sind
  `map/flatMode.ts`, `map/flatScene.ts`, `map/flatArt.ts`, `map/toolIcons.ts`,
  `map/flat.css`, `map/controls.css` (→ `map/joystick.css`, nur der Stock),
  `map/puzzleOverlay.ts`, `monster/monsterSession.ts`, `desktopControls.ts`,
  `world3d/shipControls.ts`, `rules/lobby.View`/`viewSwap`/`VIEW_LABELS`,
  `worldMenu.opensFlat`/`flatWanted`, das Häkchen „2D-Welt von oben" und der
  Eintrag `haunt:view`, `HauntingWorld.switchView`/`openFlat`/`closeFlat`/
  `enterFlat`/`leaveFlat`/`stepFlat`/`flatShared`. Geblieben ist der
  **Rechenkern** (`flatKernel.ts`, `map/flatRound.ts`, `geometry.ts`,
  `visibility.ts`, `extract.ts`, `mapSnapshot.ts`, `noise*`, Monster, Regeln,
  Audio, Schächte) und die **Karte der Telefone** (`map/mapView.ts`, `views/`).
  Absätze weiter unten, die die gezeichnete 2D-Welt beschreiben, sind
  Geschichte — was dort über Runde, Regeln und Karte steht, gilt weiter.
- **Der Techniker am Bildschirm spielt mit dem Kern**: Alles, was
  `ShipExperience.bind` bekommt, ist beim Kern als `Usable` angemeldet
  (`ShipHost.usable` → `PortalWorld.addUsable`); `A`/`E` gehen durch
  `HauntingWorld.useForward` — Sonderfälle (`ShipExperience.useSpecial`:
  Runde vorbei, im Schrank, Medkit), dann `pickUsable`, sonst der
  Lichtschalter (`useEmpty`). Vor der **offenen** Kiste nimmt `A` das Teil;
  an der Konsole öffnet `A` den Wartungskasten und klappt die Tafel mit dem
  Rätsel auf (`useConsole`). Der Werkzeug-Knopf des Kerns (`#hud-tool`,
  `HauntingWorld.toolChoice` → `ShipExperience.toolChoice`/`chooseTool`)
  wählt Lampe, Radar, Röntgen, Medkit; die Bildschirmhand des Kerns bleibt
  leer (`defaultScreenTool` → `null`). Tasten `1`/`2`/`G`, die Knöpfe „Linke/
  Rechte Hand", Kartenübersicht und Freiflug sind weg; **`Strg` duckt**
  (plus Umschalter **Ducken** in der Tafel) — die eine Taste, die die Welt
  neben dem Kern behält. Der HUD-Streifen ist am Bildschirm DOM
  (`.orbital-hud`, `paintHudDom`), in der Brille weiter der an der Kamera.
  Der Bordstock der Seite läuft, sobald jemand den Stock nimmt
  (`syncTouchStick`). In der Bot-Runde steht das Gestell von oben auf dem
  Bot (`followBotCamera` mit `ctx.topDown`); „Freie Kamera" ist die Figur,
  die läuft. Ein Monster-Telefon ohne Techniker im Raum bekommt keine Karte
  mehr, sondern den Satz `MONSTER_NEEDS_TECHNICIAN`.
- **Die Simulation geht durch die Türen** (`roundSim.move`, `portalPoint`)
  statt auf die Mitte des Nachbarn zu, und **Gefahr ist, was zu Fuß nah ist**
  (`roomGraph.walkingGap`, in `roundSim` und `rules/technicianBot.ts`): Die
  Cafeteria ist zwanzig Meter breit, ihre Mitte liegt von jeder Tür zwölf
  Meter entfernt — gemessen über die Mitten fühlte der Techniker ein Monster
  sechs Meter hinter der Tür nie. Die Gewichte (`botTuning.DEFAULT_TUNING`)
  und `botTraining.test.BOT_RATES` sind auf dem 1-m-Gitter nachgelernt.

**Die Einsatzzentrale (`APRON`) liegt nördlich an der Cafeteria**, nicht mehr
am Südrand hinter einem eigenen Andockkorridor. Die Schleuse
(`commandDoorTile`) geht mitten in die Kantinenwand, der Rest derselben Wand
ist Glas (`commandWindows`), und `spec.entryRoom` ist damit ein echter
Missionsraum statt eines Ganges. `APRON_INNER` ist die Reihe an der
Fensterfront (Tisch der Einsatzzentrale, Terminal, Rückkehrpunkt), `APRON_OUTER` die Reihe mit den
Hüllenfenstern (Abendlicht, Aufzug `COMMAND_LIFT`). Wer eine
Position auf dem Vorplatz braucht, rechnet sie aus diesen beiden Konstanten
und nicht aus `APRON.z` plus einer geratenen Zahl.

**Karte, Geometrie und Art**

- `generateHouse(seed, roomCount)` baut für Stationsaufrufe immer die feste
  Skeld-Anordnung mit 14 Räumen; alte Raumzahlen werden auf 14 normalisiert.
  Namen, Raumtypen, Rechtecke und Türen bleiben über Seeds gleich. Seeds
  verändern Aufgaben/Einrichtung. Der historische Aufruf ohne Raumzahl bleibt
  für alte Haustests erhalten. Separate `spec.passages` werden aus Gangstreifen
  ohne Überlappung erzeugt und tragen **eigene Namen** (`namePassages`: der
  Raum mit der längsten gemeinsamen Wand plus Himmelsrichtung, etwa
  „Cafeteria-Südgang"); der Name steht auch auf dem Gangboden
  (`shipArt.addCorridorName`). Manche Räume haben wie in der Vorlage nur einen
  Eingang. `stationBounds(spec)` statt `HOUSE` für Stationsbounds verwenden,
  `missionExtent(spec)` dort, wo die Einsatzzentrale dazugehört (Wegsuche).
  Die Kontur nutzt rechtwinklige Gridmodule, noch keine 45°-Wände.
  Die Lehrzimmer liegen jetzt bei x≥26 Rasterfeldern außerhalb der Karte.
- `fixtureDimensions.ts` ist der Maßkatalog. `stationLayout.ts` reserviert
  Wandabstand, Türlandungen, Bedienpunkte, Raumdurchquerung und Schachtzugänge.
  Keine separat geratenen Positionen in Art-/Interaktionscode einführen.
  **Die Gasse zu einem Bedienplatz ist breiter als der Spieler** (`LANE`):
  Zwischen zwei Modulen blieben einmal acht Zentimeter — auf dem Papier ein
  Weg, im Raster der Wegsuche keiner, und der Techniker meldete eine ganze
  Runde lang „Weg blockiert". `roomDressing` füllt die Räume darüber hinaus:
  drei Tische, Kantinenausgabe und Wasseraufbereitung in der Kantine, in fast
  jedem anderen Raum eine Insel in der Mitte.
- `fixtureModels.ts` baut abgerundete Geräte, Tanks, Leitungen, Regale, Kojen,
  Fracht und Konsolen. Geometrie wird je Material zusammengefasst; technische
  Grenzmaße bleiben testbar. `shipArt.ts` zeichnet helle Marine-Paneele,
  Raumfarben, Deckfugen, Wegmarken, doppelseitige Schilder mit Wandabstand,
  Kreaturen und den Demo-Techniker. **Boden und Wände kommen seit September
  2026 aus dem Regal** (siehe _Boden, Wände und Türknöpfe aus dem Regal_);
  Konsolen, Geräte und Schilder sind weiter gebaut. **Wer darin herumläuft,
  kommt aus dem Regal** (siehe _Wer im Schiff einen Körper hat_).
- **Boden, Wände und Türknöpfe aus dem Regal** — die Station zieht wie die
  Testwelt auf „Grundriss gebaut, Bild aus dem Regal" um:
  - **Boden**: `HauntingWorld.floorPlate` gibt jeder Kachel
    `prototype-bits/Floor.glb` (die erste der drei Bodenplatten des Pakets);
    die Bodenquader gehen aus dem Bild, sobald die Platten liegen. Die
    gezeichneten Deckplatten (`shipArt.floor`) sind weg, die Markierungen
    darauf (Kanten, Pfeile, Gangnamen, Abteilungszeichen) bleiben.
  - **Wände**: die Prototyp-Wand mit dem gelben Sockel
    (`world3d/stationWalls.ts`, `prototype-bits/Wall.glb` und `Wall_Half.glb`,
    2 × 2 m bzw. 1 × 2 m wie die grüne Restaurantwand,
    `kaykitFit.KAYKIT_FILE_SCALE`). Jeder Wandlauf des Grundrisses
    (`wallRun`: voll hoch, eine Wanddicke, ganze Kacheln, kein Türteil) wird mit
    Stücken von zwei Kacheln und am ungeraden Ende einem halben belegt
    (`runPieces`), in die Höhe auf `PLAN_WALL_H` gestreckt und je Ende um
    `WALL_REACH` verlängert (die Ecken schließen). Die Quader bleiben als
    Körper, Wegsuche und Ghosting stehen; ihr Material (`solidMaterial`, ein
    eigenes je Welt) wird unsichtbar, sobald die Wände dastehen. Von oben steht
    jeder Lauf als eigenes Netz da und wird mit seinem Quader durchsichtig
    (`GridWorld.wallGhosted` → `StationWalls.ghost`), aus den Augen sind die
    Läufe je 16-m-Feld verschmolzen (21 Netze statt 131). Tür- und
    Fensterteile bleiben gebaute Quader im Grau der Wand (`tint`). Die
    gezeichneten Pfosten, Paneele, Sturzleisten und Rohre (`shipArt`) sind weg.
    Neu in `GridWorld` dafür: `solidMaterial`, `gridSolidBuilt`,
    `gridRebuilt`, `wallGhosted`.
  - **Türknöpfe** (`world3d/doorButtons.ts`): vor und hinter jeder Tür ein
    Knopf aus `platformer/green|red/button_base_*.glb`, grün, solange die Tür
    aufgeht, rot, solange sie gesperrt ist (`HauntingWorld.doorLocked`).
    Gewünscht: _„wenn man drauf tritt, öffnet sich die Tür (rein visuell,
    theoretisch ist die Tür immer offen) … ist eine Tür verschlossen, sind die
    Bodenplatten rot und man kann nicht durch."_ Genau so: Durchlassen tut
    weiter die Automatik (`automaticDoors.ts`, ihr Auslöser reicht über beide
    Knöpfe), die Blätter fahren aber erst auf, wenn jemand auf einem der beiden
    Knöpfe steht (`buttonPressed`, `pressButtons`, `doorOpen` in
    `mountExperience`); die Kappe sinkt dabei ein. Vier `InstancedMesh` für
    alle Knöpfe. Die Aufzugstür (`test-bay`) hat ihre Knöpfe an der Kante, die
    der Plan setzt (`COMMAND_LIFT`, nach Westen).
  - **Draußen** ist weiter der Weltraum (`world3d/spaceBackdrop.ts`); wer im
    Baukasten eine Kachel zu Weltraum machen will, legt das leere Bodenstück
    „Empty" darauf (`prototype-bits/Empty.glb`, siehe
    `docs/agents/assetregal.md`).
- **Wer im Schiff einen Körper hat** (`actorArt.ts`, `actorFit.ts`): Techniker
  und Monster sind seit dem KayKit-Regal (`docs/agents/assetregal.md`,
  _Eine Figur, die läuft_) **Akteure** und keine Gruppen mehr —
  `buildActor(kind)` gibt ein `{ root, update(dt, moving), setGhost, dispose }`
  heraus. Jeder Akteur baut **sofort** seinen gebauten Körper
  (`shipArt.buildCrewmate` / `buildCreature`) und lädt, wenn es WebGL gibt
  (`core/chefFit.canLoadModels`, dynamisches `import()` — der Lader bringt
  Jest sonst zum Stehen), die Figur nach:
  - **crew → `character-animations/…/Mannequin_Medium.glb`, 1,75 m.** Fünf
    Zentimeter unter dem gebauten Crewmate, weil dessen 1,80 m die Kuppe eines
    Helms sind.
  - **stalker → `mystery-monthly-4/12-june-2024-robot/…/Robot_Two.glb`,
    1,90 m** — der verlassene EVA-Anzug als der schlaksigere der beiden
    Roboter.
  - **sentinel → `…/Robot_One.glb`, 1,90 m** — der „defekte
    Sicherheitsroboter" ist einer.
  - **crawler → bleibt gebaut.** Das Regal hat kein sechsbeiniges Gegenstück;
    was am nächsten käme (`mystery-monthly-6/4-october-2025-monstrosity`),
    steht auf demselben mittleren Skelett wie die Roboter — aufrecht, zwei
    Beine, 1,9 m. Er sähe aus wie der Stalker in einer anderen Farbe, und drei
    Monster, die sich nur in der Farbe unterscheiden, sind eines.
  **Der Techniker selbst ist der Space Ranger mit Helm** (`ShipExperience`,
  `ctx.dress(SPACE_RANGER)` und `ctx.wear('space')`, siehe
  `docs/agents/spielfigur.md`, _Geliehen_). Das Umfärben des eigenen Körpers
  und der gebaute Brustgurt (`EVA / 03`) sind damit weg.
  **Der gebaute Körper bleibt der Ersatz** und wird beim Eintreffen der Figur
  nur ausgeblendet, nie weggeworfen (dasselbe Muster wie `core/AvatarBody`
  mit dem Koch): Eine Runde, die erst anfängt, wenn ein Monster geladen ist,
  fängt manchmal gar nicht an, und ein Checkout ohne die gekauften Pakete ist
  ein normaler Zustand. Die Höhen sind deshalb die der gebauten Körper, die
  sie ersetzen — sonst verschöbe der Ersatz stillschweigend Sichtlinien,
  Ghost und Karte.
- **Lesbarkeit im Dunkeln**, zwei Wege, und die **Datei** entscheidet:
  Beide Roboter bringen ein Material `robot_glow` mit (`emissiveFactor`
  [1,1,1], dieselbe Atlas-Textur auch als `emissiveTexture`), und das bekommt
  die Augenfarbe der Kreatur, die es ersetzt — `SHIP.amber` für den Wächter,
  `SHIP.red` sonst, `toneMapped: false` wie die gebauten Augen. Weil die
  Textur an den Augen schon rot ist, wirkt die Farbe als **Faktor**: Der
  Wächter wird bernsteinrot. Das Mannequin hat nur `Character_Material` und
  damit keine Leuchtfläche; der Techniker bekommt deshalb ein **Visier** —
  eine 3,5-cm-Kugel in `SHIP.cyan`, eingemessen am Kopfknochen (der sitzt bei
  1,75 m Höhe auf y = 0,968, das Kopfnetz reicht bis 1,75 und vorn bis
  z = −0,43; also 33 cm darüber und 40 cm davor) und mit `attach` angehängt,
  damit sie ihre Weltgröße behält. Ein Test hält beides gegen die wirklichen
  Dateien (`actorFit.test.ts` liest den JSON-Teil der `.glb`).
- **Das Tempo kommt aus dem Schritt.** `update(dt, moving)` nimmt eine Zahl in
  m/s — Weg seit dem letzten Bild durch die Zeit — und gibt sie der Figur als
  Gang weiter (`core/kaykitFigureFit.gaitFor`: steht / geht / rennt); der
  gebaute Körper schwenkt dafür weiter seine Sinuskurve und lässt im Stehen
  gedämpft sinken. Wo es nur ein `moving: boolean` gibt (der Techniker eines
  anderen Geräts kommt so über die Leitung), wird daraus ein Gehschritt
  (`actorFit.ACTOR_PACE`). Die beiden alten Uhren — `state.time` hier,
  `performance.now()` dort — sind damit weg; der Akteur hält seine eigene und
  zählt nur hoch, solange er geht.
- **Wo Akteure stehen**: das Monster beim Zuschauer (`HauntingWorld.applyBlob`),
  seine Erinnerung (`paintGhost`), der Techniker eines anderen Geräts
  (`showTechnician`), der Techniker der Bot-Runde
  (`ShipExperience.simulated`) und die drei Attrappen im Modellzimmer des
  Testdecks (`trainingDeck.ts` → `ShipExperience.bayActors`). Die Attrappen
  bekommen je Bild einen Takt mit Tempo null — ohne ein Mischerbild stünde
  eine Figur aus dem Regal in ihrer Bindepose mit ausgestreckten Armen da —,
  und nur solange das Deck sichtbar ist.
- **Aufgeräumt wird einzeln und zuerst** (`HauntingWorld.releaseActors`,
  `ShipExperience.dispose`): Die groben `dispose`-Helfer beider Dateien
  traversieren alles und kennen die Ausnahme `userData.sharedAssets` nicht —
  wer eine Figur damit erwischt, gibt die Geometrie frei, die der Vorlage im
  Speicher und allen anderen Kopien gehört. `ShipActor.dispose` hält an der
  richtigen Stelle an, nimmt den Körper aus seiner Gruppe und wirft auch eine
  Figur weg, die **nach** dem Aufräumen noch eintrifft.
- `stationVisibility.ts` kann alle Räume **und Gänge** berücksichtigen.
  Standard-Grid-Hülle und Collider bleiben bestehen; Detailgruppen sind
  raumweise sichtbar. Emissive Schilder brauchen keinen eigenen PointLight.
- **Draußen ist Geometrie, keine Löschfarbe** (`world3d/spaceBackdrop.ts`):
  eine Kugel von innen plus Sterne mit fester Pixelgröße. `App.enterVR`
  fragt zuerst `immersive-ar` an, und in einer `alpha-blend`-Sitzung löscht
  three.js den Puffer immer durchsichtig — `scene.background` als Farbe wird
  dort übergangen. Wer draußen nur die Farbe hat, sieht durch die
  Hüllenfenster das eigene Zimmer. **Wegweiser** (`world3d/signposts.ts`)
  hängen über jeder Öffnung auf beiden Seiten und nennen, was dahinter liegt
  — bei einem Gang auch die Räume an ihm; Türen zwischen zwei Gängen fallen
  zu einem Kreuzungsschild zusammen. Namen kommen aus `map/extract.roomsOf`,
  denselben wie auf der 2D-Karte. Alle Texte liegen in einem Atlas, ein Mesh
  je Raum (`signMesh.ts`) in dessen Hüllengruppe. Die Raumschilder
  (`room-identification`) hängen deshalb auf der türfreien Kachel nächst der
  Wandmitte (`shipArt.closedTileX`), nie über einer Tür.

**Eine Wahrheit für 2D und 3D** (Paket „Eine Wahrheit")

Der Besitzer will die Runde auf dem Telefon **analysieren und einstellen** und
sich darauf verlassen, dass die Brille dasselbe Spiel spielt. Dafür muss die
Ground Truth — die Welt, die die KI sieht, und die Bewegung von Monster und
Spieler — in beiden Welten dieselbe sein. Was seit diesem Paket **geteilt**
ist, steht einmal und wird von beiden Welten gerufen:

- **Der Grundriss und die Karten**: `generateHouse`, `stationLayout`,
  `roomGraph.stationGraph`/`monsterGraph` samt `earshot`, `map/extract.ts`
  als der eine Snapshot (jetzt auch mit `noises`, mit den **gewichteten**
  Kegel- und Hörweiten des Monsters und mit `moving`/`sprinting` aus dem
  Beschluss — vorher zeigte der Späher einer Brillenrunde ein anderes Vieh
  als der einer Telefonrunde).
- **Die Augen des Monsters** (`monster/monsterSight.ts`): im Licht der Karte
  (`map/visibility.litRegions`), im Kegel mit `Profil × Gewicht`, keine Wand
  und kein Türblatt dazwischen (`geometry.lineOfSight`), oder Berührungsnähe
  `CLOSE_SIGHT` 2,5 m. Das Headset rechnet das seit jetzt **je Bild** statt
  alle 0,1 s und mit dem Snapshot statt mit einem Rapier-Strahl auf 24 m ohne
  Kegel und ohne Licht; Möbel zählen damit in keiner Welt als Sichtschutz.
  Das Gehör (`audio/hearing.ts`) war schon dasselbe, läuft in 3D jetzt aber
  ebenfalls je Bild.
- **Die Alarmleiter und das Gedächtnis** (`threat.stepAwareness`,
  `monster/monsterMemory.ts`, `monsterIntercept.ts`), **die Routine**
  (`monsterRoutine.ts`, `paceSpeed`) — mit `here`/`quarry` seit jetzt aus
  `geometry.spaceAtMetres` mit `SPACE_MARGIN`, also mit derselben Trägheit wie
  in 2D, statt von der Kachel abgelesen; die Fährte fragt `monsterGraph.spaceAt`.
- **Der Läufer** (`monster/monsterWalk.ts`, siehe unten bei „Türen und
  Navigation") und **die Türautomatik** (`automaticDoors.ts`, siehe „Die
  2D-Welt"), **der Schlag** ab `CONTACT` 1,7 m, **das Spielertempo**
  (`PlayerRig.pace`, siehe „Tempo ist eine Ungleichung").
- **Die Zahlen**: `PLAYER_RADIUS` = `physics/playerClearance.PLAYER_CAPSULE_RADIUS`
  = 0,24 m (die 2D-Figur war 0,35 m dick und hielt elf Zentimeter mehr
  Abstand zu jeder Wand), **eine Türbreite** `house.STATION_DOOR_W` =
  `TILE` = 1,0 m ohne Pfosten (seit dem 1-m-Gitter; siehe „Eine Türbreite"
  unten), der Würfel der
  Routine im Headset aus dem Samen der Station wie in 2D (`routineDice`;
  vorher eine Konstante), `MONSTER_RADIUS` **0,3** als Wegbreite (0,4 bis zum
  1-m-Gitter; der Rapier-Zylinder ist mit 0,29 m gleich breit).

**Der Rechenkern: die 2D-Runde rechnet auch im Schiff** (`flatKernel.ts`,
`kernelLocomotion.ts`, `HauntingWorld.stepKernel`)

Der Wunsch des Besitzers dahinter, wörtlich: „die 2D-Welt als Basis nehmen,
die Inputs bewegen nur den 2D-Charakter, und der 3D-Charakter wird daraus
geupdated — auch mit den ganzen Navigationen." Genau so läuft es seit diesem
Paket beim Gastgeber in der Brille:

- **Ein Stand, eine Rechnung.** `FlatKernel` baut eine `FlatRound` auf dem
  `HauntState` des Gastgebers (`FlatResume`, nicht kopiert): Was das Schiff am
  Stand ändert (Kiste, Rätsel, Schrank), sieht die Runde im selben Bild; was
  die Runde ändert (Uhr, Türen, Licht, Anzug, Phase, Treffer), sieht das
  Schiff. `ensureKernel` stellt ihn im ersten Bild und neu, sobald der Stand
  ein anderes Objekt ist oder das Haus einen anderen Samen hat (neue Runde,
  2D→3D, Übergabe) — mit den Büchern, die bis dahin warteten
  (`pendingBooks` ← `loadBooks`); `books()` liest die laufende Runde, sonst
  die wartenden Bücher, sonst Riegel und Lampen der Tafel (`this.locks`,
  `this.lampBook`, die mit Kern dessen Bücher _sind_). Die Lampen reisen
  dafür jetzt in `FlatResume.lamps` mit, und `FlatRound` meldet Flackern und
  Ausgehen über `onLamp`.
- **Der Stock geht in die Runde, nicht in die Physik.** `KernelLocomotion`
  hängt sich vor die `PhysicsLocomotion` des Gestells und hält den Wunsch nur
  fest (`wish`); `kernelInput` macht daraus den `FlatInput` der Runde —
  Richtung und Größe am Tempo des Gestells normiert (`rig.pace`), Sprint,
  Ducken (`rig.crouch > 0,15`), der Blick als `yaw` (`lookYaw`: von oben das
  Gestell, das `FlatControls` in die Laufrichtung dreht — die Kamera des
  Kerns schaut dort immer nach Norden —, sonst die Kamera) und der Schritt,
  den der Körper im Spielraum selbst getan hat, als `shift` (einmal je Bild,
  gegen Wände und Kästen geglitten). Die Runde tut den Schritt in ihren
  1/30-s-Scheiben, danach setzt `followKernel` das Gestell so, dass der Kopf
  über der Figur steht, und zieht die Rapier-Kapsel nach (`resync`) —
  Requisiten, Werkzeuge und Hände brauchen sie weiter. **Außerhalb der Karte**
  (Übungslabor, `round.canStand` falsch) und im Schrank trägt wieder die
  Physik (`KernelLocomotion.active = false`); beim Zurückkommen wird die Figur
  dorthin gestellt, wo der Kopf steht (`kernel.place`), und `movePlayerTo`
  (Zentrale, Schrank, Rettung) stellt sie ebenso um. `dash` bleibt 1: Die
  Puste rechnet die Runde, der Wunsch wird nur normiert.
- **Monster und Techniker aus Zahlen sind Figuren der Runde.** Es gibt keinen
  NPC-Körper mehr im Schiff (`Npc`, `NpcDirector`, `NpcVentRide`,
  `MissionBot`): Das Monstermodell (`blob`) steht bei allen — auch beim
  Gastgeber — dort, wo `state.monster` es nennt, mit Blick und Gangart aus
  der Runde (`round.monster.yaw`, `round.decided.pace`); getroffen wird, weil
  die Runde trifft (`hit`, `CONTACT`), das Schiff spürt es als Puls und
  Klick (`crew.hp` gefallen). Die **Bot-Runde** spielt der `TechnicianBot`
  der 2D-Welt auf dem Kern (`FlatKernel.startBot`, von `COMMAND_HOME` aus,
  mit Kollision); `ShipExperience.botPose`/`botStage` lesen ihn nur ab, und
  seine Meldungen gehen ins Funkprotokoll (`relay` → `log`). Im Test bleiben
  Anzug 3 und Monster an, wie vorher; das Gestell des Zuschauers liest der
  Kern in der Bot-Runde gar nicht erst.
- **Was das Schiff aus der Runde liest**, je Bild: `state.insight` (die
  Absicht für Zuschauer), `state.ride` und `crew.venting` (Schacht),
  `ventArt.setOpen`, Meldungen (`FlatEvent` → `relay`: `bad`/`good` als
  Ansage, alles andere als Satz), die Türen (`applyDoors` fragt
  `round.doorOpen`; nur `TRAINING_DOOR` hat noch die eigene Automatik, und die
  Störung `glitchDice` würfelt nur ohne Kern), das Flackern des Spuks
  (`round.spook`), der Lampen-Ton (`round.onLamp` → `lampSound`),
  Geräuschwellen und Monsterkopf für den Snapshot (`round.noises()`,
  `monsterYaw`, `monsterPace`), die Wege-Ebene (`kernel.botNavigation`,
  `kernel.monsterNavigation` statt eigener Läufer) und das Steuer der
  Monster-Station (`netMonster` als `round.driver`). **Die Alarmleiter ist die
  im Stand**: `FlatRound.memory` _ist_ `haunt.crew.threat` (vorher eine
  eigene Leiter je Runde), damit `ShipExperience` Absicht und Jagd daraus
  liest und sie mit dem Stand an alle Geräte geht. Neue Gewichte im Test gehen
  an `round.retune`.
- **Wer rechnet**: nur der Gastgeber im Anzug (`isHost`, Rolle `vr` — die
  Brille oder der Techniker am Bildschirm, `flatTechnician`, keine wartende
  Übergabe); ein Telefon in der Zentrale als Gastgeber lässt die Runde
  stehen. Eine Übergabe lässt den Kern los (`releaseMonster` → `kernel =
  null`) und stellt ihn aus den Büchern neu; `stateMessage` und Snapshot
  ändern sich nicht.
- **Weg ist damit** aus `HauntingWorld`: `stepCrew`, `stepLocks`, `stepLamps`,
  `stepSpook`, `trackMonster`, `noticeRepairs`, `checkItems`, `stepTrail`,
  das eigene Hörmodell samt Geräuschprotokoll, `LitCache`, `MonsterWalk`,
  `MonsterRoutine`/`MonsterMemory`/`Estimator`, `StationTravelPlan`, die
  Puste (`stamina`), der Schrank, in den das Monster jemanden flüchten sah
  (`watchedLocker` — die Kabine reißt jetzt die Runde auf, `cabinStrike`),
  `missionBot.ts` und `missionBot.test.ts`. Die Rundenregeln laufen in der
  Runde (`RoundRules` in `FlatRound`); `HauntingWorld.rules` beantwortet nur
  noch `status`. Tests: `flatKernel.test.ts`, `HauntingWorld.replay.test.ts`
  (Kern statt NPC: Gastgeberwechsel, Bot-Runde, Wahrnehmung, Bücher),
  `groundTruth.test.ts`; der Browser-Smoke liest `world.kernel`.

**Eine Türbreite** (`house.STATION_DOOR_W` = `TILE` = 1,0 m, ohne Pfosten)

Bis zum 1-m-Gitter waren die Türen des Schiffs `PLAN_DOOR_W` 1,2 m breit, das
Modell der 2D-Welt (`geometry.DOOR_WIDTH`) 2,0 m, danach beide „eine Kachel
abzüglich Wandstärke" auf der 2,5-m-Kachel. Seit Paket H ist die Öffnung
**eine ganze Kachelkante** — ein Meter, kein Pfosten: `GridPlan.doorWidth()`
ist der Haken dafür — `StationPlan` (`plan.ts`) überschreibt ihn, alle
anderen Rasterwelten behalten `PLAN_DOOR_W` (`levelBuild.planSolids` lässt
den Pfosten bei Breite null weg, `slidingDoor.ts` fragt den Plan). Das Schott
hat je Seite **zwei Teleskop-Blätter** (`ShipExperience`, `DoorLeaf` mit
`rest`/`travel`); `stationNavigation`, `stationLayout` und `automaticDoors`
(`TRIGGER_CROSS`/`OCCUPIED_CROSS`) rechnen mit `STATION_DOOR_W`, die Figur
der Runde geht `DOOR_WIDTH / 2 − Radius` breit durch (`geometry.walkable`,
`openingAlong` fasst dabei benachbarte offene Türen derselben Wandlinie zu
einer Öffnung zusammen — die Kreuzung zweier Gänge hat keinen Pfosten in der
Mitte). Auf dem Blatt des Archivars bleibt der Türbogen symbolisch
(`PAPER_ARC`). `groundTruth.test.ts` prüft, dass beide Zahlen dieselbe sind.

**Ducken ist ein Tempo** (`mission.CROUCH_FACTOR` = 0,5, `PLAYER_CROUCH_SPEED`)

In beiden Welten: Geduckt geht man halb so schnell, und leiser ist man, weil
man langsamer ist — `audio/cues.stepLoudness(speed)` wählt die Stufe nach dem
Tempo (`SNEAK_LIMIT` 2 m/s → `NOISE.sneak`, über `SPRINT_LIMIT` 3,6 →
`NOISE.sprint`, dazwischen `NOISE.walk`), nicht nach einer Haltung. Sprint
schlägt Ducken. Es kommt aus `rig.crouch` (Stick, `Strg` gehalten, der
Umschalter **Ducken** in der Tafel des Technikers, körperlich) und geht als
`FlatInput.crouch` in die Runde. Das Sichtfeld des Technikers aus Zahlen ist
das der Quest 3: `perception.BOT_FOV` = 110°.

Was **weiterhin verschieden** ist — gewusst, nicht vergessen:

- **Der Körper**: Die Rapier-Kapsel läuft unter der Figur mit und trägt
  Requisiten, Werkzeuge, Stufen und Sprung; außerhalb der Karte
  (Übungslabor) trägt sie allein. Schränke sind in 3D begehbar, in 2D ein
  Kasten — die Runde weiß vom Verstecken nur über `crew.hidden`.
- **Wer nicht rechnet**: Ein Gastgeber ohne Anzug (ein Telefon in der
  Zentrale) hat keinen Kern; seine Runde steht, bis jemand mit Anzug —
  Brille oder Techniker am Bildschirm — Gastgeber wird.
- **Die Trainingssimulation** (`roundSim.ts`) bleibt die grobe Raumkarte
  ohne Wände, Licht und Türen — mit Absicht, siehe „Gewichte, Simulation,
  Training".

**Türen und Navigation**

- `state.shut` beschreibt **Sperren**. `AutomaticDoors` steuert getrennt davon
  die tatsächliche Näherungsöffnung: von beiden Seiten, für Techniker,
  Mitspieler, Monster und Demo-Bot. Nachlauf verhindert Flattern;
  ein belegter Durchgang schließt nicht um eine Kapsel herum.
- **Ab und zu fährt ein Schott von selbst auf** (`rules/doorGlitch.ts`): alle
  `GLITCH_RANGE` = 35–70 s für `GLITCH_HOLD` = 1,8–3,2 s eine beliebige
  **nicht gesperrte** Tür, gewürfelt. Der Grund ist nicht Kulisse, sondern
  Auskunft: Ein fahrendes Blatt hieß bisher immer _jemand ist da_, und wer das
  einmal begriffen hatte, las die halbe Station aus dem Augenwinkel ab — der
  Techniker die Position des Monsters, das Monster die des Technikers.
  Angewendet wird es über dieselbe Mechanik wie jedes andere Auffahren
  (`HauntingWorld.applyDoors` reicht einen Scheinbewohner an `AutomaticDoors`,
  `FlatRound.stepDoors` setzt `near`), damit zwei Regeln sicher gelten: Eine
  **gesperrte** Tür ist nie dabei — die Rechnung bekommt nur die offenen zu
  sehen und lässt eine laufende Störung fallen, sobald ihre Tür gesperrt wird
  —, und beim Zufahren fällt niemandem das Blatt auf den Kopf, weil ein
  belegter Durchgang offen bleibt (`occupants`). Die Störung **öffnet** nur;
  geschlossen wird wie immer.
- **Wer sperrt, wie lange, und wie man es aufbekommt** (`rules/doorLocks.ts`,
  `DoorLocks` beim Gastgeber, nichts davon auf der Leitung): **Gewollt
  gesperrt ist immer nur eine Tür, und sie hält, bis sie von selbst fällt**
  — Schalttafel (`applyFlip`), Techniker vor Ort (`manualDoor`) und die
  2D-Runde (`FlatRound.lockDoor`) teilen sich diesen einen Riegel. Solange
  er hält, tut der Schalter einer zweiten Tür nichts (`lockBlock` → `'busy'`),
  und die gehaltene Tür gibt er auch nicht vorher wieder her (`'held'`);
  danach ist dieselbe Tür `LOCK_COOLDOWN` lang warm (`'cooling'`). Lange gab
  die zweite Wahl die erste frei und ein zweiter Tipp öffnete sie sofort — ein
  Schalter im Takt, und das Monster stand vor einer Wand aus Riegeln, die man
  von Tür zu Tür trug; der Besitzer wollte: gehalten bis zum Ablauf, keine
  zweite Tür solange, dieselbe danach erst einmal nicht wieder, und alles
  davon sichtbar. Jeder Grund hat seinen Satz (`LOCK_BLOCK_TEXT`), und jedes
  Gerät kennt ihn: Die gehaltene Tür reist als optionales Feld
  `HauntState.held` mit (wie `cooling`, ohne Protokollsprung), damit auch ein
  Telefon, das nicht rechnet, beim Tipp „Ein Schott ist schon gesperrt" sagt
  statt einmal umsonst zu drücken (`HauntingWorld.panelSwitch` →
  `doorBooks`). **Auch im Test-Zustand mit denselben Fristen**: Vorher
  schaltete die Tafel dort ohne Buchführung (beliebig viele Türen, kein
  Balken) — wer im Test ohne Frist schalten durfte, sah nie den Balken und
  lernte ein anderes Spiel; nur die Lampen bleiben im Test ein Schalter ohne
  Budget (`flipLampPlain`). **Keine Sperre
  hält ewig:** Zugefallene Türen (der Spuk, `slamDoor`) halten `SLAM_HOLD` =
  20 s, von Hand gesperrte `HOLD_RANGE` = 8–10 s, leicht gewürfelt, damit
  niemand mitzählen kann; `stepLocks` lässt beides je Bild ablaufen, die Tafel
  darf vorher freigeben. `holdUntil` sagt, wie lange noch — daraus wird
  `MapDoor.hold` (über `MapSource.doorHold`) und der **Balken über der Tür**
  auf Karte und 2D-Szene. Eine Sperre, die für immer hielte, wäre keine
  Entscheidung mehr, sondern eine Wand.
  **Eine Tür, die gerade frei geworden ist, bleibt lange frei**
  (`LOCK_COOLDOWN` = **40 s**, `mayLock`/`coolingUntil`): Jeder Weg aus einer
  Sperre heraus — abgelaufen, von der Tafel freigegeben, vom Monster
  aufgezogen, Holz gesplittert — kühlt die Tür ab, und solange sie warm ist,
  lässt sie sich weder wählen (`chooseLock`) noch zuschlagen (`slamDoor`).
  Ohne diese Regel war der Rest eine Einladung: Der Riegel fällt, die Tafel
  legt ihn im selben Bild wieder um, oder der Spuk trifft dieselbe Tür ein
  zweites Mal — und für den, der davor wartet, ging sie nie wieder auf. Zwölf
  Sekunden waren dafür zu wenig: Sie reichten dem, der hindurch wollte, aber
  sie reichten auch der Tafel, die den Riegel gleich wieder setzte, und das
  Monster stand nach der dritten Runde immer noch vor derselben Tür.
  Freigeben darf man, was zugefallen ist — nicht, was man hält; `toggleLock`
  meldet `blocked` mit dem Grund, damit der Schalter sagen kann, warum er
  nichts tut, statt wortlos nichts zu tun.
  **Und die Abkühlung ist sichtbar, in Grün — und sie blinkt.** Vierzig Sekunden hält man sonst
  für einen kaputten Schalter. Die Liste der abkühlenden Türen geht deshalb im
  Stand mit (`HauntState.cooling`, optional, `STATION_PROTOCOL` bleibt 8 — auf
  der Empfängerseite hängt keine Regel daran, gesperrt wird beim Gastgeber);
  `MapSource.doorHold` liefert sie mit `cooling: true`, daraus wird
  `MapDoor.cooling` und derselbe Balken über der Tür wie beim Halten, nur grün
  statt rot (`map/mapView.ts` — auch bei
  zurückgefahrenem Blatt); dazu wechselt das Blatt auf der Karte im
  Sekundentakt in die Farbe der Abkühlung, aus
  der Uhr gerechnet (`Math.sin(time · 7)`), weil ein Balken allein auf einem
  Telefon leicht übersehen wird — „muss optisch gut angezeigt werden", so
  der Besitzer. Auf der Tafel der Schalttafel-Rolle
  (`views/panelRole.ts`) steht die Restzeit unter der Beschriftung, der
  Schalter ist grün und abgeschaltet („noch warm · 27 s"). In 3D brauchte es dafür nichts: `doorLocked` liest
  `state.shut`, und eine abkühlende Tür steht dort nicht drin — ihre Leuchten
  sind ohnehin grün.
  **Und niemandem fällt die Tür auf den Kopf** (`haunt.slammable` mit
  `HauntSight.occupants`, `DOORWAY_CLEAR` = 0,75 Kacheln): Der Spuk sucht sich
  die nächstgelegene Tür, und das war mit Vorliebe die, durch die das Monster
  gerade selbst ging — danach steckte es darin. Wer im Durchgang steht, wird
  nicht eingeklemmt; die Liste ist dieselbe, mit der `AutomaticDoors` einen
  belegten Durchgang offen hält (`HauntingWorld.doorOccupants`), damit nicht
  die eine aufhält, was die andere zuschlägt.
  **Das Monster kann an einem Riegel ziehen** (`pryLock`): Der erste Zug geht
  **nie** auf, jeder weitere steht besser (`pryChance`: 0,3 und dann +0,15),
  im Takt von `PRY_COOLDOWN` = 1,1 s. Im Mittel sind das gut drei Züge und
  knapp vier Sekunden — **weniger, als das Warten kostet**, und genau das ist
  die Absicht: Wer wartet, verliert Zeit; wer zieht, macht Lärm. Sowohl der
  Spieler am Steuer (`monster/monsterHelm.interact`) als auch die KI
  (`FlatRound.moveMonster`) ziehen mit denselben Zahlen. Holz splittert
  weiterhin auf einen Schlag und geht über `releaseLock`, damit die
  Buchführung stimmt.
  **Und es zieht jetzt lieber, als herumzulaufen.** Die Wegsuche umging eine
  gesperrte Tür, solange es irgendeinen Umweg gab — daraus wurde das Spiel
  „ich schließe immer die Tür vor dem Monster", und weil der Umweg oft eine
  halbe Minute kostete, war das Vieh damit festgesetzt. `FlatNavigator.aim`
  bekommt deshalb ein `detourLimit` in Metern (`FlatRound.PRY_DETOUR` = 4 s
  mal Tempo): Kostet der Umweg um die gesperrte Tür mehr als das, führt die
  Route **vor die Tür** und `FlatLeg.door` nennt sie. Verglichen wird auf der
  Raumkarte (`StationGraph.distance` gegen einen Dijkstra ohne die gesperrten
  Kanten) und nicht mit einem zweiten Rasterlauf. Zusammen mit den 40 s
  Abkühlung ist das die Antwort auf das Einsperren: Nach dem Aufziehen bleibt
  die Tür offen, und der nächste Riegel kostet eine neue Entscheidung.
  **Warten ist kein Feststecken**: Wer vor einem Riegel steht, führt seine
  Stilluhr mit (`FlatRound.hold`) — sonst ging das Monster nach dem
  Aufziehen als Erstes den Notumweg über die Raummitte. **Und wer am Ende
  seiner Route steht, auch nicht**: Beim Absuchen bleibt es in der Raummitte
  stehen, bis die Frist um ist, und die Route hat dann keinen Wegpunkt mehr
  vor ihm. Vorher galt das nach 0,6 s als festgelaufen, der Notumweg ging
  „zurück in die Raummitte" — wo es schon stand —, bewegte nichts, die
  Stilluhr lief weiter, und alle 1,2 s kam der nächste Notumweg. Die Wegsuche
  wurde nie mehr gefragt; ein neues Ziel in einem anderen Raum lief es nie an,
  und so stand es minutenlang mit Ziel im Raum, bis eine Sichtung es losriss
  (in zwölf Bot-Runden fünfmal, bis zu 480 s). Festgelaufen ist seitdem nur,
  wer noch Wegpunkte vor sich hat (`FlatNavigator.remaining`) und trotzdem
  nicht vorankommt; `rules/monsterStuck.test.ts` spielt Seed 1 nach und
  verlangt, dass kein Stillstand mit Ziel länger dauert als die Suchfrist.
- **Licht ist knapp, und es ist eine Entscheidung** (`rules/lamps.ts`, `Lamps`
  beim Gastgeber, nichts davon auf der Leitung). **Beide Welten beginnen
  dunkel**: `startMission` setzt `state.lit = []`, und die 2D-Runde tut seit
  diesem Paket dasselbe (`FlatRound`, vorher startete sie mit allen Räumen
  hell). Es geht nirgends von selbst Licht an — auch nicht beim Betreten eines
  Raums und nicht bei einer gelösten Konsole. Wer Licht will, bittet die
  Einsatzkontrolle, und die schaltet es an ihrer Tafel (`applyFlip`,
  `kind === 'light'`, über `switchLamp`); in 2D geht `FlatRound.switchLight`
  durch **dieselbe** Buchführung, damit der Prüfstand nicht ein anderes Licht
  hat als das Spiel. Es gelten dieselben drei Regeln wie bei den Türen
  nebenan: **höchstens `LAMP_BUDGET` = 2 Lampen brennen gleichzeitig** — die
  dritte macht die älteste aus; **keine Lampe brennt ewig** (`LAMP_RANGE` =
  **25–35 s**, leicht gewürfelt: „ein paar Sekunden" ist kürzer als eine
  Minute, aber ein Licht, das nach fünf Sekunden ausgeht, ist keines), und die
  letzten `LAMP_FLICKER` = 3 s davon **flackert** sie (`lampGlow`, dieselbe
  Kurve wie das Zucken des Spuks) und sirrt dabei (`ShipAudio` `'lamp'`, am Ort
  der Lampe — zweimal: beim Flackern und beim Ausgehen); und **was das Monster
  auslöscht, zählt genauso** (`lampOut`, aus `FlatRound.stepSpook` wie aus
  `FlatRound.tick`), damit für den Hacker beides gleich aussieht. `stepLamps`
  lässt die Uhr laufen. Alles, was schon hell war, ohne dass jemand geschaltet
  hat — der helle Test, die gezeichnete Station —, lässt die Buchführung in
  Ruhe. Das Grundlicht der Station ist entsprechend klein
  (`stationLighting.ROOM_BOUNCE` = 0,12, und nur in einem Raum, in dem
  wirklich eine Lampe brennt): Die Taschenlampe des VR-Spielers ist nur dann
  etwas wert, wenn es ohne sie nichts zu sehen gibt.
  **Was noch fehlt:** Die Frist einer Lampe steht nicht auf der Leitung, also
  sieht nur der Gastgeber das Flackern; alle anderen sehen den Raum einfach
  dunkel werden, sobald der nächste Stand kommt. Anders als beim Spuk lässt es
  sich nicht aus der Monsterposition nachrechnen — dafür müsste `HauntState`
  die Fristen tragen, und das wäre ein Protokollsprung.
- `ShipExperience` liest `doorOpen` für die bewegten Blätter und `doorLocked`
  für beidseitige rote/grüne Leuchten oberhalb der Tür. Die Übungsdeck-Tür
  darf niemals `host.test()` oder einen Rundenreset auslösen.
- **Das HUD des Technikers in 3D** hängt an der Kamera (`ShipExperience`,
  `mission-hud-strip`) und ist jetzt **zwei Zeilen** — dieselben zwei wie in
  der 2D-Welt: oben Sauerstoff und Anzug-Leben, darunter drei Kreise für die
  Aufträge (voll, halb, leer) und der nächste offene im Klartext. Es gibt ihn
  **in der Brille und am Desktop**; vorher gab es ihn nur im Headset und nur
  mit der Uhr. Gerechnet wird beides in `rules/roundHud.ts` (`roundHud` für
  Uhr und Anzug, `hudTasks`/`taskPips` für die Aufträge) — dieselbe Rechnung
  wie im 2D-HUD und auf den Telefonen, damit drei Anzeigen nicht drei
  verschiedene Stände zeigen. Gemalt wird nur, wenn sich der Text ändert.
  **Die zweite Zeile gibt es nur solo** (`hudTasksVisible`, gespeist aus
  `powersOf(setup).archive`): Sitzt am Archiv ein **Mensch**, ist das Wissen
  dessen Platz — der Techniker sieht nur Uhr und Anzug und holt sich den Rest
  am Funk, und der Streifen ist dann **eine** Zeile hoch statt einer halb
  leeren Tafel. Sitzt dort ein **Bot**, sagt der ohnehin an, wohin es geht
  (`ShipExperience.targetCall`, beim Aufnehmen des Teils), und was ein Bot
  ansagt, darf auch dastehen. **In der ersten Zeile steht außerdem die
  Bildrate** — dieselbe Messung wie im Grafik-Menü (`FrameStats.latest`,
  halbe Sekunden, über `WorldContext.frame()`), klein zwischen Uhr und Anzug.
  Ob die Quest stottert, sah man vorher nur mit offenem Menü, und ein offenes
  Menü stottert anders als das Spiel.
- **Die eigenen Schritte des Technikers zählen Meter, keine Uhr**
  (`audio/soundscape.ts`, `STRIDE`): Die Regie merkt sich, wo der letzte
  Schritt fiel, und wer sich einen Meter davon entfernt hat, macht den
  nächsten — abwechselnd 20 cm links und rechts neben der Mitte
  (`FOOT_OFFSET`), in der Balance auf dieselbe Seite gerückt (`FOOT_PAN`),
  damit es zwei Füße sind und nicht ein Klopfen in der Kopfmitte. Gehen und
  Rennen klingen gleich laut (`STEP_GAIN`), Geduckt leise (`SNEAK_GAIN`, das
  Verhältnis aus `NOISE`); die Brille meldet dafür `rig.crouch`. Im Schrank,
  im Schacht, in der Bot-Runde und nach einem Sprung von mehr als
  `STRIDE_JUMP` 3 m (Teleport, Rundenstart) wandert die Marke stumm mit.
  Vorher lief ein Taktgeber aus dem gemessenen Tempo, und der stolperte
  doppelt: Das Tempo aus der Kopfbewegung springt von Bild zu Bild, und die
  Uhr lief im Stand ins Negative — beim Losgehen holte sie drei Schritte in
  einer halben Sekunde nach. Rein für die Immersion, nicht für das Gehör des
  Monsters: Was das Monster hört, rechnet weiter `stepLoudness` in
  `HauntingWorld`.
- `GridWorld.setSlidingGridDoor` verändert nur Türcollider und physische
  Navkante, nicht den ganzen Level. **Wege benutzen `StationTravelPlan`:**
  funktionale automatische Türen sind dort schon vor Annäherung passierbar,
  gesperrte Türen bleiben blockiert. Ausnahme: Eine durch Belegung noch physisch
  offen gehaltene Sperrtür bleibt bis zum Verlassen der Schwelle navigierbar
  (`occupiedOpen`); sonst sperrt das Monster beim Spuken seine eigene Startposition ein. Ohne diese Trennung endet eine partielle
  Route vor einer beliebigen Wand, und die Tür bekommt nie ein Nahsignal.
- `stationNavigation.ts` verwendet dieselben Maße wie Collider und Modelle.
  Quadratische Kurven werden mit ca.12cm Schritten und `segmentClear` geprüft;
  in engen Ecken schrumpft der Kurvenradius, nötigenfalls bleibt die Ecke.
  `stepAlong` verbraucht die ganze Framezeit über mehrere Wegpunkte, mit
  Beschleunigung und Abbremsen. Navigation wird bei Sperränderungen ungültig.
  **Eine Navigation für beide Welten**: Auch das Monster und der Techniker der
  2D-Welt laufen auf demselben Rasterweg (`navmesh/flatNavigator.ts` über
  `stationRoute` auf dem `housePlan`-Graphen mit denselben Sperren), nicht mehr
  Raum für Raum über Türwegpunkte. Der Cursor plant sparsam neu (Ziel
  weiter als 0,75 m gewandert, von der Route abgekommen, Sperre geändert), wartet
  vor einer gesperrten Tür ohne Umweg 0,9 m davor und splittert Holz nach
  2,5 s; die Fächerindizierung der Wandquader in `segmentClear` hat dabei jeden
  Weg von ≈ 88 auf ≈ 14 ms gebracht. Die
  Bahn darauf (Beschleunigen, Bremsen, Drehen) steht in
  `navmesh/route.ts` — der Datei, die `droneRoute.ts` hieß, solange es eine
  Drohne gab; ihre Typen (`RoutePath`, `RoutePose`) tragen heute die Wege von
  Monster und Techniker der 2D-Runde, `stepAlong` hat seit dem Rechenkern
  keinen Fahrer mehr im Schiff.
  **Das Monster wägt dabei ab** (`aim(..., detourLimit)`): Kostet der Umweg um
  eine gesperrte Tür mehr als `monsterWalk.PRY_DETOUR` = 4 s Laufzeit, führt die
  Route vor die Tür, und dort wird gezogen statt gelaufen. Der Techniker gibt
  keine Grenze mit und geht weiter jeden Umweg.
  **Und derselbe Läufer trägt das Monster in beiden Welten** (Paket „Eine
  Wahrheit", `monster/monsterWalk.ts`): Alles zwischen dem Beschluss der
  Routine und dem Schritt — Vorplatz-Riegel, Stillstand-Umweg über die
  Raummitte (0,6 s / 1,2 s), Umwegabwägung, Wartepunkt, Holz splittern, am
  Stahlriegel ziehen (`rules/doorLocks.pryLock`, derselbe Würfel wie die
  Routine) — steht dort einmal, mit `MONSTER_RADIUS` als Wegbreite. Die
  2D-Runde ruft es aus `moveMonster` und gleitet die Wegpunkte mit `slide`
  ab — und seit dem Rechenkern (`flatKernel.ts`, siehe „Der Rechenkern") ist
  das auch der Schritt im Schiff: Dort gibt es keinen NPC-Körper mehr, das
  Monstermodell steht, wo die Runde es hinsetzt, und der Schlag ist der der
  Runde (`hit`, `CONTACT` = 1,7 m). `stationNpcNavigator.ts` — der alte Cursor
  des Headsets, der alle 0,55 s neu plante, keinen Umweg abwog und **vor einer
  gesperrten Tür für immer stand** — ist weg, ebenso der NPC, an dem er hing.
- Weltreisen/Schrank-Ausgänge synchronisieren Rig und Physik über
  `movePlayerTo`. **Mit `yaw` schaut danach der Kopf dorthin**
  (`PlayerRig.turnHeadTo`, mit Test), nicht nur das Rig: In der Brille legt das
  Headset seine eigene Drehung obendrauf, und wer im Spielraum nach links
  gedreht stand, schaute nach dem Versetzen weiter nach links, egal was das
  Rig sagte. Am Bildschirm liest `FlatControls.look` den Winkel seither vom
  Rig statt aus seiner eigenen Zahl — sonst sprang die erste Mausbewegung in
  die alte Richtung zurück. `haunt.sealsOff` schützt Erreichbarkeit aller `spacesOf`.
  **Schächte sind das Lüftungsnetz** (`vents/ventNet.data.ts`: vierzehn
  Klappen, eine je Raum, neun Verbindungen in getrennten Netzen; `VentNet`,
  `VentTravel`, `VentPilot`). In 3D fährt das Monster damit wie in 2D
  (`vents/npcVentRide.ts`): einsteigen, fahren (verborgen, `crew.venting > 0`),
  aussteigen — kein Teleport über Wandpaare mehr, `ventPairs` gibt es nicht
  mehr. Die Klappen (`vents/ventArt.ts`) kippen ihre Lamellen, solange jemand
  ein- oder aussteigt. Wer das Netz ändert, ändert die Datendatei.
  `ShipExperience.inLockerRoom` prüft Raumzugehörigkeit vor Codeeingabe,
  Eintritt und Nahbereichsauswahl: kein Schutzschrankzugriff durch Nachbarwände.
  Übungsschränke setzen den passenden Trainingsraum und aktiven Test voraus.

**Mission, Werkzeuge und Komfort**

- `mission.ts` besitzt Optionen, drei Reparaturen, Kabel-/Folge-/Frequenzrätsel,
  Fracht, HP, simulierten Puls und Anstrengung. Drei Treffer sind
  `lost`, drei Reparaturen und Rückkehr `won`. Test, Schutzschrank und
  Schachtpassage verhindern Treffer; Medkit heilt einen. **Nach einem Treffer
  gibt es sechs Sekunden Schonfrist** (`HIT_GRACE`), und das Monster hält
  davon vier selbst inne (`HIT_LULL`, `monsterRoutine.rest`) — in beiden
  Welten; vorher klebte es dem Getroffenen an den Fersen, bis die Frist um
  war, und der nächste Schlag kam mit Anlauf. **Der Schutzschrank hat
  keinen Code mehr**: Ein Tipp auf das Tastenfeld, und man ist drin, wie in
  2D. `lockerCode` gibt es noch für den Samen der Kabinen, aber keine Akte
  und kein Panel zeigt ihn. **Hineingetippt wird mit dem Gesicht zur Tür**
  (`enterLocker`: Drehung des Schranks plus π, denn seine Front liegt auf
  lokal +z und ein Rig schaut entlang −z) — wer drinsteht, sieht durch die
  Schlitze in den Raum und das Monster kommen, statt auf die Rückwand. Von
  innen ist der Schrank ein **Geist mit
  Lüftungsschlitzen** (`ShipExperience.ghostLocker`): blasse Kopien der
  Materialien je Teil (die Originale teilen sich alle Möbel), davor sechs
  dunkle Stäbe in Augenhöhe; beim Heraustreten kommt alles zurück. In 2D
  bleibt dem Versteckten **nur der Lichtkreis um sich herum**
  (`map/visibility.ts`: Lampen weg, `self` bleibt, sichtbar ist, was in
  anderthalb Metern davor steht). Sichtbare Ergebnis-
  Panels bieten Neustart im DOM und im Headset, auch per Zeiger-Trigger.
  **Die Runde hat eine Uhr** (`rules/roundRules.ts`): der Sauerstoff, zehn
  Minuten, läuft gleichmäßig durch und wird von keiner Reparatur angehalten
  oder aufgefüllt — deshalb heißt der Auftrag `oxygen` „Nahrungsversorgung
  sichern" und nicht mehr „Lebenserhaltung". Uhr und Anzug-Leben sehen alle:
  die Telefone in der Leiste über jeder Station (`stationUi.writeQuest`, rot
  unter einer Minute), der Techniker am Desktop im Titel und in der Brille
  auf einem schmalen Streifen an der Kamera (`ShipExperience`, `rules/roundHud.ts`).
  **Kabinen gehen kaputt** (`HauntState.destroyed`, Kennung = Raum-Id, geht
  über das Netz): Eine aufgerissene Kabine wird in 3D zum Wrack
  (`fixtureModels.buildBrokenLocker`), funkt alle drei bis sechs Sekunden
  (`rules/cabinWreck.ts`), lässt niemanden mehr hinein und wird vom
  Modelltechniker gemieden.
- **Die Kisten stehen an einer Stelle** (`rules/cargo.ts`): `cargoOf(spec)`
  ist die eine Liste aller Frachtkisten einer Runde, und 2D, 3D, Netz-Snapshot
  und Archiv lesen sie, statt jeweils selbst zu würfeln. Vorher stand je Raum
  **eine** Kiste, und `ShipExperience` und `map/flatRound.ts` verteilten den
  Inhalt zweimal nach derselben Regel — was gut ging, solange „die Kiste des
  Raums" eine Kiste meinte. Jetzt stellt `stationLayout` **zwei bis drei**
  (`CARGO_PER_ROOM`, Ids `cargo-<raum>-<n>`; zwei sind Pflicht, die dritte
  fällt weg, wo der Grundriss sie nicht trägt), jede mit einem Kennzeichen aus
  Farbband und Nummer, je Raum eindeutig (`cargoLabel`: „Kiste 2 · blau"). Drin
  liegen drei Aufgabenteile — je eines im Raum aus `spec.tasks`, `taskCargo` —,
  vier Werkzeuge (radar, xray, medkit, medkit) und sonst nichts: **die leere
  Kiste ist der Preis fürs Suchen.** Sie kostet zwei Griffe, öffnen (Geräusch)
  und hineinsehen („Leer."), und gilt danach als erledigt.
  **Und Aufmachen kostet Zeit** (`rules/chore.ts`, `CARGO_OPEN_SECONDS` = 5 s):
  ein Ladebalken, während dessen man stillsteht. Umschauen ist erlaubt — gemessen
  wird die Stelle (`CHORE_LEASH` = 0,25 m), nicht der Blick —, Weggehen bricht
  ab, und derselbe Knopf bricht auch ab (ein Balken, den man nur durch Weglaufen
  loswird, wäre eine Falle). **In der Brille ist die Leine länger**
  (`CHORE_LEASH_HEADSET` = 0,6 m): Dort wird der Kopf gemessen, und wer sich zu
  einer Kiste vorbeugt, trägt ihn ohne einen Schritt gut vierzig Zentimeter weit
  — mit der kurzen Leine ging in VR keine Kiste auf. **Und die Kistentür hört
  nur auf den Trigger** (`ShipExperience.bind`, `pokeable: false`): Eine
  Berührung mit der Hand gilt dem Zeiger sonst als „Benutzen"
  (`Pointer.updatePoke`, auch mit dem Controller), und wer vor einer Kiste
  steht, hat die Hand ständig an ihrem Blatt — der Trigger fing den Balken an,
  die Hand brach ihn gleich wieder ab. Tastenfeld, Konsole und das Ersatzteil
  in der Kiste bleiben antippbar. Vorher war Aufmachen ein Knopfdruck und damit kein
  Risiko: Man nahm eine Kiste im Vorbeigehen mit, während das Monster zwei Zimmer
  weiter schon unterwegs war. Dieselbe Rechnung in beiden Welten — die 2D-Runde
  zeichnet den Balken über den Knöpfen, das Schiff malt ihn in den Streifen an
  der Kamera (also auch in der Brille) —, und **der Bot zahlt sie** in beiden
  Welten (`rules/technicianBot.ts`): Einer, der Kisten im Vorbeigehen
  aufklappt, spielt eine andere Runde als der, dem man dabei zusieht.
  **Vor einer Tür steht keine Kiste** (`stationLayout.CARGO_DOOR_DEPTH` = 2,4 m
  statt der üblichen 1,15 m, auch für die Deko-Kiste): Der übliche Türfreiraum
  hält die _Möbel_ aus der Öffnung, nicht den _Menschen_, der davorsteht und
  wühlt — in „Lower Engine" konnte man die grüne Kiste nur öffnen, indem man die
  Tür blockierte. Gewürfelt wird aus
  **eigenen Strömen** aus `spec.seed`, nie aus dem des Hauses: Die
  Wurfreihenfolge von `generateHouse` ist Vertrag. Der Archivar liest deshalb
  nicht mehr das Möbel vor („bei dem Frachtcontainer"), sondern die Kiste —
  `CargoSlot.clue`, „Kiste 2, blaues Band · Nordwand". `HouseTask.hint` bleibt
  stehen — er nennt das Merkmal des Raums („bei der Werkbank") und hängt am
  Reparaturhinweis (`mission.ts`) und an der Raumakte des Archivs
  (`views/archiveRole.ts`), die beide noch auf ihn zeigen.
- **Eine Hand, ein Ersatzteil** (`rules/archiveGoals.ts`, `carriedPart`,
  `canCarryPart`): `crew.inventory` trägt höchstens **ein** Missionsteil;
  Werkzeuge (Radar, Röntgen, Medkit) zählen nicht mit, die stecken am Gürtel.
  Eine zweite Kiste geht auf, das Teil darin bleibt liegen — mit Ansage, und
  die Kiste bleibt offen und unerledigt. Sonst sammelte man in Ruhe alle drei
  ein und klapperte danach die Konsolen ab; der halbe Weg durch das Schiff
  fiele weg. In 3D ist das Teil ein **Ding in der Hand**: am Schirm im
  Streifen neben Lampe und Medkit (`rightItem === 'part'`), in der Brille am
  Griff des rechten Controllers. **Ablegen** in der Tafel legt es ab
  (`ShipExperience.dropPart`; die Taste `G` ist mit der gemalten Karte
  gegangen), es liegt dann als Modell im Gang und wird mit Benutzen (`A`/`E`,
  ein `Usable`) wieder aufgenommen. **`taken` heißt „war einmal draußen", `inventory` heißt „ist in
  der Hand"** — die Konsole prüft seit jetzt in **beiden** Welten das Zweite:
  Wer sein Teil ablegt, sperrt damit auch die Abdeckung wieder zu.
- **Wer wissen darf, welche Kiste die richtige ist** (`rules/roundSetup.ts`,
  `goalPrecision`): Sitzt am Archiv ein **Bot**, gibt es niemanden zum
  Zurufen — dann ist das Ziel die **Kiste** (`MapGoal.kind` `'crate'`,
  `precision` `'exact'`). Sitzt dort ein **Mensch**, ist es der **Raum**
  (`room:<raum>`, Raummitte, Label = Raumname, `precision` `'room'`), und
  welche der zwei bis drei Kisten darin zählt, steht allein auf seinem Blatt.
  Kompass, Randdreieck und Zielpfad zielen unverändert auf `MapGoal.at` und
  brauchen nur das Label. **Hervorgehoben wird die Sache selbst und kein Ring
  daneben:** ein gelber Saum auf der Zielkiste (`core/outlineShell.ts`,
  `ShipExperience.seam`) — neben dem Saum des Kerns auf dem, was `A` gerade
  meint (`core/highlight.ts`); die gemalte Karte zeichnete dafür Schein,
  Umriss und Puls. **Das Kennzeichen ist immer
  sichtbar** — `MapItem.mark`, Farbband und Nummer am Modell
  (`fixtureModels.buildCargoCabinet(mark)`, Farben in
  `fixtureDimensions.CARGO_BAND_COLORS`) —, denn der Archivar spricht ja
  darüber. **Und der Snapshot trägt keinen Teilenamen mehr:** Auf einer Kiste
  steht ihr Kennzeichen (`map/flatRound.items`, `map/worldSource.ts`), und
  `MapItem.goal` wird nur bei Kistengenauigkeit gesetzt. Das dauerhafte
  amberfarbene Inhaltsschild am Frachtschrank ist **weg** — es war das größte
  Leck; was drin liegt, sagt das Röntgengerät oder die offene Kiste.
- Das vorhandene `FlashlightTool` hängt **an beiden Hüften** und kann deshalb
  nicht verloren gehen (`HauntingWorld.beltLoadout`). Lange hing nur rechts
  eine, „damit eine Hand frei bleibt" — seit der Techniker rechts ein
  Ersatzteil trägt, war genau das die Falle: Teil in der Hand, Lampe abgelegt,
  und der Weg zur Konsole ging durch ein dunkles Schiff. Eine Hüfte merkt sich
  ihre Bestückung und lässt nachwachsen, was von ihr kam
  (`PortalWorld.stowTool`), also ist auch eine hingeworfene Lampe nach dem
  nächsten Griff wieder da. Am Schirm steht sie in **beiden** Handkreisen
  (`1` links, `2` rechts); „frei" bleibt erreichbar, denn Dunkelheit ist in
  diesem Haus eine Entscheidung (`threat.ts`) und kein Verlust.
  Webhände verwenden dieselbe Toolklasse. Die schwebende Ersatzlampe ist
  im Web anvisierbar; Aufnehmen entfernt ihren echten Physikkörper.
  Haunting deaktiviert mit `setBeamGuide(false)` den geometrischen Hilfskegel;
  Spotlicht, Lichtkegelverstellung und Toolmodell bleiben erhalten. Der eigene
  Avatar ist im Web unsichtbar; nur in XR wird sein Körper ohne Kopf eingeblendet.
- `RadarTool` und `XrayTool` sind reguläre Tools mit identischem
  `scannerModel.ts`, Standardgriff und Gürtelablage. Radar zeigt Kontakte,
  Xray nahe verborgene Fracht — **Inhalte, keine Kisten**: Was leer ist, meldet
  er nicht, sonst wäre er die Antwort auf jede Suche. Er nennt dabei das
  **Kennzeichen** und den Raum, nie den Teilenamen (2D `FlatRound.useTool`, in
  3D das Schild an der Kiste, `Cabinet.scanner`) — er ist der technische
  Ausweg neben dem Archivar und nicht sein Ersatz. Kein dauerhaftes
  VR-Sensor-HUD. Nach Inventarauswahl in VR bleibt ein Tool bis zur ersten
  bewussten Griffaktion gehalten; andernfalls fällt es im nächsten
  PortalWorld-Update sofort herunter.
- **Mikrofon-Gegnerreaktion ist endgültig aus dem Spiel entfernt.** Kein
  `HauntingMicrophone`, kein Audioeingang für Gegnerwahrnehmung. Optionaler
  Sprachchat in `net/Voice.ts` bleibt unabhängig. **Gegneridentifikation ist
  vorerst entfernt:** kein EMF/Thermosensor/Audio-Logger/Anomalienjournal.
  `ENTITY_PROFILES` enthält nur verbleibende KI-/Schrittklangwerte.
- `threat.ts` prüft Bewegung, Ducken, Taschenlampe, Blickrichtung und echte Sichtlinie.
  `perception.ts` berechnet ein begrenztes akustisches Kostenfeld auf dem realen
  NavGraph: offene Kante 2,5m, geschlossene Tür zusätzlich 4m, gemeinsame Wand 9m.
  Keine Übertragung über fehlende Bodenfelder. Aktualisierung 10Hz; kein Mikrofon.
  Monster-FOV 129,6°, Techniker-FOV 111,6°/16m. Die Bot-Runde nutzt dieselbe
  Monsterwahrnehmung mit dem Bot als Signalquelle, niemals der Beobachterkamera.
  Schutzschränke unterbrechen Wahrnehmung, löschen aber nicht sofort die letzte
  Suchposition. Simulations-Snapshots bewahren Versteck und Bedrohung.
  Erinnerung verfolgt die zuletzt wahrgenommene Position, keine Hellsicht.
- Anstrengung steigt beim Sprint in 4s von 0 auf 1 und fällt in 5s ab.
  `helmetCondensation.ts` legt dafür **eine weiße Fläche** über das Visier,
  die von unten her weich einblendet — keine Punkte, kein Flackern; die
  Mitte bleibt lesbar. Kein harter Sprinttimer.
- `HauntingComfort` bietet lokale Snap-/Smooth-Drehung, Bewegungsrand und
  Haptik; reale Kopfbewegung löst keinen Rand aus. Dispose restauriert die
  gemeinsamen Rig-Einstellungen und räumt Pointer/Audio/GPU-Ressourcen auf.
- **Der Techniker am Bildschirm spielt mit dem Kern** (Paket H): Bordstock
  der Seite oder `WASD`, `A`/`E` benutzt über `HauntingWorld.useForward`
  (Sonderfälle → `pickUsable` über die angemeldeten Dinge → sonst der
  Lichtschalter, `ShipExperience.useEmpty`; ein Handgriff in der Sperrfrist
  zählt als Handgriff und legt das Licht nicht um), der Saum kommt vom Kern
  (`bind` meldet jedes Ziel als `Usable` an; sein `usePrompt` wird nicht mehr
  gezeigt, nur noch geprüft), der Werkzeug-Knopf
  (`#hud-tool`, `Tab`) wählt die Hand (`chooseTool`: Lampe/Medkit rechts,
  Radar/Röntgen links, `null` leert beide; `toolChoice.current` ist die
  letzte Wahl, solange sie noch in der Hand liegt). Eigener Stock, eigene
  Knöpfe (`world3d/shipControls.ts`) und eigene Tasten (`desktopControls.ts`:
  `1`/`2`/`G`, Freiflug) sind weg; `Strg` duckt weiter (Fensterereignis in
  `ShipExperience`, `stepCrouch`), dazu **Ducken** in der Tafel. Der
  HUD-Streifen ist am Bildschirm DOM (`.orbital-hud`), der Kompass bleibt DOM,
  der Streifen an der Kamera bleibt der Brille. `WorldContext.touchStick`
  ruht nur, solange die Zentrale über dem Bild liegt (`syncTouchStick`).
- Die **Bot-Runde im Schiff** spielt der Techniker aus Zahlen der 2D-Welt
  (`rules/technicianBot.ts`) auf dem Rechenkern (`flatKernel.ts`,
  `FlatKernel.startBot`): eine echte, schadensfreie Runde mit aktiver
  Monster-KI, mit Kollision, Furchtkern und Türpreis — dieselbe Rechnung wie
  auf dem Telefon. Das Schiff zeichnet nur nach, wo er steht
  (`ShipExperience.botPose` ← `HauntingWorld.botPose`), und schreibt seine
  Stufe (`botStage`) auf die Tafel. Der frühere Modelltechniker des Schiffs
  (`missionBot.ts`, ohne Kollision auf eigener Bahn) ist weg.
  Tempo, Puste, Vorsicht, Versteckneigung, Handgriffe und Wartezeit kommen aus
  `botTuning.ts` (`TechnicianTuning`) und werden bei jedem Zugriff neu gelesen —
  ein Regler in der Schalttafel wirkt in der laufenden Runde. Ohne Puste trabt
  er (`sprint × 0,72`) statt auf Arbeitstempo zurückzufallen: Ein Monster geht
  schneller, als er arbeitet. Nach ruhiger Phase Mission fortsetzen.
  Unterbrochene Interaktionen erfordern erneute Ankunft am Fracht-/Reparaturziel.
  Verstecke des Bots sperren die freie Beobachterkamera nicht.
  Schächte benötigen freie Zugänge/Ausgänge und führen bei Verfolgung in
  Richtung des letzten Signals.
  Gesperrte Routen warten statt zu teleportieren. Das ist keine simulierte
  menschliche Kommunikation und keine vollständige autonome Dreiercrew.
  Raumwechsel erzeugen lokale Funkmeldungen Techniker → Zentrale.
  `NavigationOverlay` liest echte Route-Cursor von Bot und Monster;
  Cyan/Rot und Zielringe sind in der Simulation sichtbar — **und beim
  Zuschauer**, sobald er im Panel „KI-Absichten" umlegt
  (`HauntingWorld.insightWanted`). Sichtflächen
  werden gegen feste Collider (inklusive Türblätter/Einrichtung) beschnitten;
  Orange zeigt das maximale akustische Feld für Sprintgeräusche. Legende und
  KI-Absichten erklären Grenzen.
  **Das Overlay „KI-Absichten"** (`NavigationOverlay.insight`) legt dazu den
  Kopf des Monsters auf den Boden: je Raum eine Fläche, so satt wie sein
  Glaubensbild (`MonsterInsight.belief`, ab 2 %), die gestrichelte Prognose des
  Technikerwegs, der Abfangring an der Tür mit beiden Ankunftszeiten
  („M 3,2 s / T 4,0 s") und der Name der Haltung am Ziel. Weltgeometrie, flach
  auf dem Boden — damit ist es auch in der Brille richtig herum. Die Zahlen
  kommen aus `RoutineOutput.insight` (`monsterRoutine.ts`) und werden nirgends
  zweimal gerechnet; auf der Karte der Telefone zeichnet dasselbe
  `map/insightOverlay.ts` (`MapViewOptions.overlay`). **Nur im Modus „Alles
  sehen"**: Ein Techniker mit
  dem Glaubensbild vor sich weiß, welche Zimmer gerade sicher sind, und die
  halbe Runde ist vorbei. **Über die Leitung geht es als optionales Feld**
  (`HauntState.insight`, `readState` stutzt Haltung, Listen und Meter zurecht,
  kein Protokollsprung): Der Gastgeber schreibt seinen Beschluss je Bild in den
  Stand, und ein Zuschauer, der das Monster nicht selbst rechnet — ein Telefon
  am Fernseher —, liest es von dort (`HauntingWorld.render`).
  Gehen/Stillstand erzeugen weniger/keinen Schall.
  Schrittanimation basiert auf Körperseite und Gliedmaßtyp statt Child-Reihenfolge:
  linkes/rechtes Bein gegensinnig, gleichseitiger Arm jeweils entgegengesetzt.
  Desktop-Demos starten mit nachgeführter Botkamera: aus den Augen schräg
  über dem Bot, **von oben steht das Gestell auf ihm** (`followBotCamera`
  mit `ctx.topDown` — die Kamera des Kerns folgt dem Gestell). **Freie
  Kamera** / **Bot folgen** wechselt die Bedienung (`setFollowBot`: frei
  heißt, die Figur läuft selbst; Freiflug und Kartenübersicht sind mit der
  gemalten Karte gegangen). `followBotCamera` läuft niemals im XR-Headset;
  dort behält der Spieler seine Blickrichtung.
- **Das Monster kennt die Einsatzzentrale nicht** (`roomGraph.monsterGraph`).
  Es gibt die Raumkarte zweimal: die ganze (`stationGraph`, mit dem Knoten
  `COMMAND` und der Schleuse) und die des Monsters, der beides fehlt. Alles,
  was für das Monster entscheidet, fragt die zweite — Routine, Gedächtnis
  (`MonsterMemory` legt seine Räume aus `world.spaces` an), Abfangrechnung,
  Reisezeiten, `FlatRound.prowl` und sein `FlatNavigator`; in 3D
  `HauntingWorld.spawnMonster`/`stepRoutine`, in der Simulation
  `roundSim.prowl`. Damit ist „das Monster geht nie in die Zentrale" keine
  Prüfung, die man an fünf Stellen vergessen kann, sondern ein Ort, den seine
  Karte nicht enthält: keine Patrouille dorthin, keine Suche, keine Vermutung,
  kein Weg — und `spaceAt` gibt für den Vorplatz `''` zurück, es kann also
  nicht einmal benennen, wo der andere da steht. Dazu zwei Riegel gegen den
  Restfall „erinnerte Stelle liegt auf dem Vorplatz": `FlatRound.moveMonster`
  läuft kein Ziel an, das auf seiner Karte in keinem Raum liegt,
  `FlatRound.stepMonster` setzt keinen Schritt auf den Vorplatz (`onApron`),
  und beides steht seit dem Paket „Eine Wahrheit" in `monster/monsterWalk.ts`,
  also auch für das Headset.
  Der Techniker läuft weiter hinein und hinaus; für ihn bleibt die Zentrale
  ein Knoten wie jeder andere. Nachgezählt wird es in hundert ausgespielten
  Runden (`RoundResult.atCommand`, `roundSim.test.ts`).
- **Die Routine des Monsters** steht in `monsterRoutine.ts` und nirgends sonst:
  vier Grundhaltungen (`patrol`, `reposition`, `stakeout`, `search`), `hunt`,
  seit M2 dazu `intercept` („Abfangen") und `ambush` („An der Tür lauern"), und
  die Kabinenkette `announce` → `breach` → `savour`. Sie ist rein — herein gehen
  Räume, Nachbarn und eine Wahrnehmung, heraus gehen Ziel, Tempo (`paceSpeed`)
  und höchstens ein Geräusch. Deshalb steuert dieselbe Datei das Monster im
  Headset **und** die Trainingssimulation.
  **Mit Gedächtnis denkt sie, ohne würfelt sie.** Bekommt `RoutineInput` ein
  `memory` (`monster/monsterMemory.ts`), einen `estimator`, das Grundtempo
  `base` und die Rundenzeit `time` — und ist die hereingereichte Welt die ganze
  Karte (`StationGraph`, erkannt an `doorsOf`/`doorPoint`) —, dann entscheidet
  nach jedem Sichtverlust `monsterIntercept.plan()`: verfolgen, abfangen,
  lauern oder absuchen, höchstens alle `REPLAN` = 1,5 s neu gerechnet. Gesucht
  wird dann im **wahrscheinlichsten** Raum statt im gewürfelten Nachbarn,
  patrouilliert wird zu den drei Räumen, in denen es am längsten nicht war
  (`leastRecentlyVisited`), der Seitenwechsel geht in den entferntesten davon,
  und `stakeout` steht an einer **Tür** statt in der Raummitte. Reicht die
  Gewissheit nicht (`FAINT` 0,15), wird gar nicht erst abgesucht — ein Monster,
  das denselben Raum dreimal durchsucht, ist das dumme Vieh von früher. Ohne
  Gedächtnis bleibt das alte Würfelverhalten stehen; das ist kein Notbehelf,
  sondern die Fassung, die ein Test aus fünf Zimmern in einer Reihe noch
  nachrechnen kann.
  **Ein Ziel, dem es nicht näher kommt, gibt es auf** (`GIVE_UP` 10 s): Die
  Routine kennt keine Wände, und ob ein Ziel erreichbar ist, weiß nur die
  Welt — eine Stelle, die auf der Karte des Monsters in keinem Raum liegt,
  läuft `FlatRound.moveMonster` gar nicht erst an, und eine Route kann vor
  einer Wand enden. Patrouille, Seitenwechsel, Absuchen und Lauern führen
  deshalb eine Uhr mit (`stranded`): Sinkt der Abstand zum Ziel zehn Sekunden
  lang nicht mehr um `HEADWAY` 0,25 m, ist das Ziel keins, und `beginPatrol`
  sucht das nächste — ohne den Raum als abgesucht zu notieren, denn erreicht
  wurde er nie. Zehn Sekunden sind länger als jeder Riegel (Holz 2,5 s, Stahl
  ein paar Züge zu 1,1 s), also wird niemand von einer Tür weggerufen; die
  Verfolgung ist ausgenommen, ihr Ziel setzt jedes Bild neu. Vorher lief eine
  Frist erst ab der Ankunft, und die Patrouille hatte gar keine: ein
  unerreichbares Ziel hieß für den Rest der Runde „unterwegs".
  **Und eine erinnerte Stelle, an der es schon steht, verfolgt es nicht mehr**
  (`monsterIntercept.CAUGHT_UP` 1,6 m): Ohne Sichtkontakt ist die Beute der
  Rechnung die Stelle aus der Prognose (`prediction.path[0]`), und wer dort
  schon steht, holt in null Sekunden auf — also war „verfolgen" jedes Bild
  aufs Neue die schnellste Wahl, die Routine trat aus `hunt` in `beginSearch`
  und von dort wieder in `hunt`, und das Vieh stand mit der Ansage
  „Verfolgung" für den Rest der Runde im Raum (Seed 7 der Bot-Runden: 560 s).
  Jetzt fällt die Entscheidung dann auf Abfangen, Lauern oder Suchen; eine
  **gesehene** Stelle bleibt Beute, auch unter den eigenen Füßen. In der
  Trainingssimulation war der stehende Verfolger ein Wachposten, der dem
  Techniker den Raum verstellte; ohne ihn stieg dessen Quote im Team von
  0,32 auf 0,38, und die Monsterseite wurde deshalb neu gelernt (wie beim
  Paket „Schalttafel": nur `'monster'`, 120 × 128 Runden mit Samen 0xbeef, 24 ×
  192 zur Feinjustage). Übernommen wurden davon **Sicht 1,7, Schub 11 s und
  Vorsprung 3 s**; das mitgelernte Grundtempo 1,2 nicht, denn einzeln
  nachgemessen treibt Tempo die Teamquote sogar hoch, und der ganze Satz stand
  mit 0,510 / 0,2975 am Bandrand. So nachgemessen 0,4825 / 0,341 — beide
  Bandmitten, das Monster läuft nicht schneller als vorher
  (`botTraining.test.ts`, dort steht die Messreihe).
  **Gefüttert wird das Gedächtnis in der Routine selbst** und nicht in den
  Welten (Abweichung von Plan M2): Sichtung, Geräusch und der eigene Raum
  gehen ohnehin durch `step`, und ein Gedächtnis, das 3D, 2D und Simulation
  jede für sich beschreiben, ist nach der ersten Änderung drei verschiedene
  Gedächtnisse. Als Sichtung zählt dabei auch Alarmstufe 3 („sicher gehört"):
  Ohne sie stand die Spur bei einer Jagd, die nur aus Geräuschen kam, still —
  und ohne Spur gibt es keine Richtung, keine Prognose und kein Abfangen. Die
  Welt besitzt das Gedächtnis, meldet ihm, was die Routine nicht sehen kann
  (`disturbed`), und liest es aus.
  **Die Fährte geht denselben Weg hinein** (`RoutineInput.scent`, seit dem
  Paket „Spuren"): Gesucht wird sie **draußen** — nur die Welt weiß, welche
  Tropfen im Raum des Monsters liegen (`rules/blood.sniff`) —, eingetragen
  wird sie **hier**, wie alles, was ins Gedächtnis geht
  (`MonsterMemory.tracked`). Sie zählt als Letztes: Wer eine Stelle hat
  (`signal`) oder gerade etwas hört, schaut nicht auf den Boden; ein Tropfen
  von vor dreißig Sekunden zöge ihn sonst von der frischen Stelle weg.
  **Blutrausch und Schub.** Je zehn Sekunden ununterbrochener Jagd steigt der
  Verfolgungsfaktor um `RAGE_STEP` 0,05, gedeckelt bei `RAGE_MAX` 0,2 und
  ohnehin bei `MONSTER_TOP_SPEED`; ein Sichtverlust setzt zurück. Dazu kommt
  `RUSH_BOOST` 0,25 für `MonsterTuning.rush` Sekunden, wenn eine Reparatur
  fertig geworden ist. Beides steht als `RoutineOutput.boost` heraus und geht
  als vierter Wert in `paceSpeed` — nur auf die Jagd, nie auf die Patrouille.
  **Was es denkt, steht als `RoutineOutput.insight`** (`MonsterInsight` in
  `map/mapSnapshot.ts`, Vertrag 4.7): Haltung, Ziel, Glaubensbild, vermuteter
  Weg und Abfangtür mit beiden Ankunftszeiten. Gezeichnet wird das noch nicht;
  `FlatRound.decided` gibt den ganzen Beschluss nach außen.
  **Wo welche Haltung wirklich vorkommt** — gemessen, damit niemand nach dem
  falschen Beleg sucht: In der **2D-Runde** mit echten Wänden ist `intercept`
  häufig (acht Bot-Runden: 293 s Abfangen gegen 201 s Verfolgen), in der
  **Trainingssimulation** dagegen fast nie (64 Runden: 98 s). Das ist kein
  Fehler, sondern die Grenze der groben Karte: Auf einem reinen Raumgraphen
  nehmen Verfolger und Verfolgter denselben kürzesten Weg, und wer denselben
  Weg nimmt, kürzt nichts ab. `ambush` bleibt überall selten (17 s auf
  64 Runden) — es verlangt ein sehr sicheres Glaubensbild in einem Raum mit
  höchstens zwei Türen, und ob eine Station so einen Raum an der richtigen
  Stelle hat, entscheidet der Bauplan. `rules/botRound.test.ts` prüft deshalb
  `intercept` über vier ganze Bot-Runden und `ambush` gar nicht.
  Nach Sichtverlust ohne Gedächtnis rät sie weiterhin
  den Nachbarraum (`guess`), sucht ihn leise ab (Klacken, manchmal der
  Schutzschrank), geht manchmal gleich weiter (`wander`) oder lauert auf
  (`stakeout`). Ein Rückzug in einen Schrank löst Schrei und Aufreißen nur aus,
  wenn er **gesehen** wurde (`HauntingWorld.watchedLocker`); die Kette danach
  läuft von selbst zu Ende, auch wenn die Meldung längst zurückgenommen ist.
  **Das Monster reißt Kabinen nur auf, in denen es jemanden vermutet**: beim
  Schnüffeln am Schrank eines verdächtigen Raums reißt es ihn auf — ob jemand
  drin ist oder nicht (`RoutineOutput.cabin`; ohne Schrei und ohne Vorsprung,
  die bleiben dem gesehenen Rückzug). Ein leerer Schrank ist danach trotzdem
  ein Versteck weniger. Kein Wissen darüber, ob der Schrank besetzt ist.
  **Was es weiß, steht daneben** — `monster/monsterMemory.ts`, seit M2
  angeschlossen: ein Glaubensbild über die Räume (je Raum eine
  Wahrscheinlichkeit, zusammen immer 1), je Raum ein Notizzettel (wann
  besucht, abgesucht, gesehen, gehört) und eine Spur der letzten sechs
  Sichtungen, aus der `track.velocity()` Richtung und Tempo schätzt. Eine
  Sichtung setzt die ganze Masse in einen Raum; ein Geräusch multipliziert die
  Likelihood aus der gedämpften Hörweite dazu (`StationGraph.earshot`, sonst
  selbst gerechnet). **`earshot` hört auch durch Wände**: Es rechnet nicht nur
  über die Türen (`DOOR_LOSS` 4 m je Türblatt), sondern auch über die
  **Wandnachbarn** aus dem Bauplan — Räume, deren Rechtecke aneinanderstoßen,
  zu `WALL_LOSS` 9 m. Vorher waren zwei Zimmer Wand an Wand ohne Tür für das
  Monster so weit auseinander wie der Umweg über den halben Gang (im
  gewürfelten Haus mit Samen 3: 100 m für 10 m Luftlinie, also taub); jetzt
  sind es 19 m. **Für die Wegsuche ändert das nichts**: `neighbours()`,
  `distance()` und `next()` bleiben Türwege, denn durch eine Wand geht
  niemand — sie dämpft nur (`roomGraph.test.ts`); ein abgesuchter Raum fällt
  auf `FLOOR` 0,01 statt auf null, damit das Monster nicht an einem Spieler
  vorbeiläuft, der hinter ihm wieder hineingegangen ist; mit der Zeit gleicht
  sich das Bild über die Türen aus (`DRIFT` 0,15/s je Tür, gesperrte Türen
  halten es auf), und nach `FORGET` 45 s ohne Sichtung oder Geräusch ist wieder alles gleich
  wahrscheinlich. Abfragen: `mostLikely`, `expected`, `certainty`, `exits`
  (die Türen eines Raums mit dem Anteil des Zuflusses dahinter),
  `leastRecentlyVisited` (Patrouille und Seitenwechsel), `snapshot` (für die
  Zuschauer, ab 2 %). Rein und deterministisch, ohne three.js und ohne Zufall.
  Dazu seit M2 `disturbed(raum, punkt, zeit)`: **ein Ereignis der Station**,
  keine Sichtung. Eine fertige Reparatur ist laut und sichtbar — die Konsole
  fährt hoch, die Sicherung fällt, im Modul flackert das Licht —, also legt sie
  die ganze Masse in diesen Raum, schreibt aber **nichts in die Spur**: Über
  die Laufrichtung sagt sie nichts, und als `seen` gebucht hätte sie der
  Prognose eine Fahrtrichtung untergeschoben, die es nie gab. Im Notizzettel
  steht sie unter `heard`. `shutPairs(spec.doors, state.shut)` übersetzt die
  Türkennungen des Bauplans (`d7`) in die Raumpaare, die der Konstruktor
  erwartet; die Haustür hängt dabei an `COMMAND`.
  Dazu seit dem Paket „Spuren" `tracked(raum, punkt, richtung, trust, zeit)`:
  **eine Blutspur auf dem Boden** (`rules/blood.ts`). Sie unterscheidet sich in
  zwei Punkten von allem anderen. Erstens landet die Masse nicht in dem Raum,
  in dem der Tropfen liegt, sondern in dem, auf den die Spur **zeigt**
  (`SCENT_LEAD` 3 m voraus über `spaceAt`, sonst der Raum des Tropfens) — ein
  Monster, das den Tropfen unter den eigenen Füßen für den Aufenthaltsort
  hält, sucht dort, wo es schon steht. Zweitens **ersetzt** sie den Glauben
  nicht, sie **mischt** sich hinein: `trust` Anteil Fährte, der Rest das alte
  Bild. Bei `trust` 1 wäre ein Tropfen so viel wert wie eine Sichtung, und ein
  einziger Treffer schenkte dem Monster den Rest der Runde; `blood.sniff`
  liefert höchstens `SCENT_TRUST` 0,55, mit dem Alter des Tropfens fallend. In
  die Spur der Sichtungen schreibt sie nichts, aus demselben Grund wie
  `disturbed`; notiert wird unter `heard`.
- **Die Blutspur** steht in `rules/blood.ts` — rein, ohne three.js, ohne DOM.
  Ein Treffer öffnet eine **Wunde** für `BLEED_TIME` 120 s (`wound`, ein
  zweiter Treffer setzt die Frist neu statt sie zu verlängern); solange sie
  offen ist, fällt alle `DROP_SPACING` 1,5 m ein Tropfen — **nach Strecke, nicht
  nach Zeit** (`stepTrail`), wer steht, blutet keinen Teppich. Ein Tropfen
  verblasst linear über `DROP_FADE` 40 s (`dropAlpha`, länger als `GHOST_TTL`
  25 s, sonst wäre die Spur nur eine umständliche zweite Erinnerung an dieselbe
  Sichtung), mehr als `DROP_LIMIT` 48 liegen nie — sonst wächst die Liste eine
  Runde lang und geht Bild für Bild über die Leitung. `stepTrail` läuft in
  **jedem** Bild, auch ohne Wunde: Nur so verschwinden die alten Tropfen.
  **Kein Hellsehen**: `sniff(spur, wo, jetzt, drin)` findet den jüngsten
  Tropfen nur in `SNIFF_RANGE` 3 m **und** unter der Prüfung des Aufrufers
  (überall: „liegt im Raum des Monsters"); die Richtung kommt aus den **zwei**
  jüngsten Tropfen derselben Auswahl, also aus zwei Punkten, die beide hier
  liegen. Geschnüffelt wird `SNIFF_EVERY` 0,5 s — eine Fährte liegt da, sie
  trifft nicht ein; deshalb hängt `SNIFF_RANGE` daran: Ein jagendes Monster
  macht in einer halben Sekunde gut zwei Meter und darf nicht über die eigene
  Fährte hinwegspringen. Angeschlossen ist sie in `map/flatRound.ts` (Wunde in
  `hit`, Spur im Schritt — seit dem Rechenkern auch für das Schiff) und in
  `roundSim.ts` — im Prüfstand, weil
  alles, was die Balance verschiebt, dort ausgespielt werden muss. **Gemessen**
  (240 Runden, acht Stationen, `DEFAULT_TUNING`): ohne Spur 79 Siege,
  589 Treffer, 881 Kontakte; mit Spur 79 Siege, 589 Treffer, 890 Kontakte. Die
  Balance bleibt also stehen, das Monster nimmt den Verfolgten aber ein Prozent
  häufiger wahr.
- **Gezeichnet wird beides** (Pakete M3b und M3c). Die Regel, **wer welchen
  Ghost sieht**, steht einmal in `rules/ghosts.ghostsToDraw` und nicht in den
  vier Zeichnern: „Realitätsnah" zeigt nur den Marker des **anderen** und nur,
  solange man den anderen nicht wirklich sieht (ein Marker neben der
  leibhaftigen Figur ist keine Erinnerung, sondern ein zweiter Gegner);
  „Alles sehen" zeigt **beide** blass (`GHOST_WATCH` 0,35) neben den echten
  Figuren. `map/mapView.ts` zeichnet auf der Karte einen gestrichelten
  Ring mit Blickstrich, und die Monster-Ansicht schreibt „Zuletzt gesehen:
  Werkstatt · vor 6 s" in ihre Kopfzeile (`ghostAgeText`). In 3D ist es
  **Weltgeometrie** und kein Bildschirmzeichen (`HauntingWorld.paintGhost`):
  ein **zweiter Akteur** derselben Sorte (`actorArt.ts`, siehe _Wer im Schiff
  einen Körper hat_), den `setGhost(deckkraft)` zur Erinnerung macht —
  `transparent`, `depthWrite: false`, kalt leuchtend (`GHOST_GLOW`), ohne
  Schatten —, an `state.ghosts.monster`. Materialien muss dafür niemand mehr
  klonen: `buildCreature` gibt jedem Aufruf eigene, und die Figur aus dem
  Regal bekommt sie je Kopie (`core/kaykitModel.freshCopy`). Die
  **Material-Flags liegen genau einmal** und je Bild wird nur noch die
  Deckkraft gesetzt — `transparent` umzustellen kostet three.js eine neue
  Übersetzung des Shaders. Trifft die Figur erst **nach** dem ersten
  `setGhost` ein, bekommt sie den Anstrich beim Einhängen: Sonst stünde ein
  leibhaftiges zweites Monster an der Erinnerungsstelle. Die Erinnerung geht
  nicht, bekommt aber trotzdem einen Takt mit Tempo null — sonst stünde sie in
  ihrer Bindepose. Sichtbar ist sie, sobald der
  Marker älter als `GHOST_LIVE` 0,5 s ist — „gerade gesehen" steht schon im
  Marker, ein zweiter Sichttest wäre eine zweite Wahrheit. Die Blutspur
  dieselbe Bauart: `drawBloodDrop` (flache Ellipse mit Spritzer, dunkelrot,
  Größe und Spritzerwinkel deterministisch aus dem Zeitstempel) in Szene und
  Karte, `HauntingWorld.paintTrail` als flache Scheiben knapp über dem Blech,
  einmal gebaut und wiederverwendet. In 2D liegen Tropfen **unter** der
  Dunkelheit: Wer nicht hinsieht, sieht auch kein Blut.
- **Prognose und Abfangen** liegen daneben in `monster/monsterIntercept.ts` und
  hängen seit M2 an der Routine. Was darin steht: `predictPlayer` verlängert die letzten
  Sichtungen geradeaus (Richtung und Tempo aus der Spur, Tempo notfalls
  `PLAYER_SPRINT_SPEED`/`PLAYER_WALK_SPEED`, Puste eingerechnet) zu einer
  Polyline über **zwei** Türen — die erste nach dem Winkel zum Kurs, die zweite
  nach dem Zufluss im Glaubensbild — mit einer Ankunftszeit je Tür. **Die
  Ankunftszeit läuft ab**: Vorgerückt wird die Sichtung höchstens `PREDICT_AGE`
  2 s, aber was seither an Sekunden vergangen ist, geht jeder Tür vom
  Vorsprung ab (`overdue`), und eine Tür ohne positiven Vorsprung ist kein
  Abfangpunkt mehr. Ohne das stand das Monster (Paket „Rechenkern",
  `monsterStuck.test.ts` Seed 1) mit einer dreißig Sekunden alten Sichtung
  vor derselben Tür, rechnete alle `REPLAN` 1,5 s dieselbe Tür aus und
  wartete bis zum Ende der Runde. `plan`
  stellt dieser Zeit die des Monsters gegenüber (`Estimator`, heute
  `graphEstimator` über `roomGraph.distance`) und entscheidet: **abfangen**, wo
  das Monster mit `SLACK` 0,8 s Luft früher an der Tür ist (der Kandidat, an
  dem es selbst am schnellsten ist); **verfolgen**, wenn schlichtes Aufholen
  schneller geht oder keine Tür passt und es überhaupt schneller ist;
  **lauern** ohne Sichtkontakt bei `certainty() ≥ 0,6` in einem Raum mit
  höchstens zwei Türen, gedeckelt auf `AMBUSH_MAX` 12 s; sonst **suchen** im
  wahrscheinlichsten Raum — nicht mehr im gewürfelten Nachbarraum. Dafür nennt
  `roomGraph.ts` jetzt auch Türen: `doorsOf(raum)` und `doorPoint(tür)` (die
  Türmitte auf der Kachel**kante**, in Metern). Das Gedächtnis, gegen das
  gerechnet wird, steht dort als Form (`TrackLike`, `MemoryLike`) und nicht als
  Import — so bleibt das Modul für sich prüfbar; die echte `MonsterMemory`
  erfüllt beide Formen.
  **Eine Tür hat zwei Namen, und daran ist die Rechnung erst einmal
  gescheitert.** Das Gedächtnis nennt sie nach den Räumen, die sie verbindet
  (`doorKey`, „flur|kombüse"), die Karte nach dem Bauplan (`d7`). Verglichen
  wurden die Zeichenketten — und damit fand `likelyDoor` **nie** eine Tür:
  Gelauert wurde immer an der ersten Tür des Raums, und die Prognose lief
  hinter der ersten statt hinter der wahrscheinlichsten weiter. M2 übersetzt
  jetzt (Raumpaar → Nachbarraum → gemeinsame Tür); `likelyExit(graph, memory,
raum)` gibt dieselbe Auskunft nach außen, und `monsterRoutine` stellt seinen
  Lauerposten damit an dieselbe Tür wie `plan()`.
- **Tempo ist eine Ungleichung und kein Geschmack** (`mission.ts`):
  `PLAYER_WALK_SPEED` 2,6 < Monstertempo (2,8/2,95/3,2) und Jagdtempo
  ≤ `MONSTER_TOP_SPEED` 4,55 < `PLAYER_SPRINT_SPEED` 4,94. Tests in
  `botTuning.test.ts` rechnen beide Enden nach, auch an den Reglergrenzen.
  **Und sie gilt seit M2 auch _getunt_** — daran war sie vorher gescheitert:
  Geprüft wurde das Grundtempo der Sorte, gelaufen wurde `Grundtempo × speed`,
  und weil das Training `speed` auf 0,75 heruntergedreht hatte, ging das
  Monster in Wahrheit mit 2,21 m/s, also langsamer als ein spazierender
  Spieler. Die Untergrenzen der Regler sind deshalb Teil der Zusage:
  `speed` ≥ 0,95 (Gehen ab 2,66 m/s), `hunt` 1,3…1,55 (Jagd rund 4,4 m/s,
  Deckel 4,55 auch mit Blutrausch und Schub).
  **Die andere Hälfte ist die Puste** (`PLAYER_STAMINA` 5 s Sprint, dann Trab
  `TROT` 0,72× = 3,56 m/s, Erholung `STAMINA_REGEN` 8 s beim Gehen, nach einem
  Treffer `HIT_BURST` 1,5 s Schub, der nichts kostet). Ohne sie war jede Jagd
  in dem Moment entschieden, in dem der Spieler den Stock nach vorn drückte:
  Wer geradeaus lief, kam immer davon, und es gab keinen Grund, eine Tür
  zuzuziehen oder eine Ecke zu brechen. Gerechnet wird sie in
  `mission.stepStamina` (rein, ohne Zustand außerhalb), angewandt in der
  2D-Runde (`map/flatRound.tick`) und in 3D über `core/PlayerRig.pace`, die
  Tempo-Regel, die `HauntingWorld.setupRole` dem Gestell für **jeden Stock**
  einhängt — Brille, Tastatur (`FlatControls`) und Bildschirmstock
  (`ShipExperience.stepStick`) fragen sie je Bild, und die Runde zehrt an der
  Puste (`FlatRound.tick`, im Schiff über den Kern), sobald jemand rennen will
  und dabei den Stock hält (`rig.sprinting`,
  `rig.wishing`). Vorher galt sie nur in der Brille: Die Tastatur ging mit
  3,2 m/s statt 2,6 und rannte 5,76 ohne Puste, der Bildschirmstock 4,94 ohne
  Puste — ein Tastaturspieler war damit schneller als jedes gehende Monster.
  Nachrechnung: Abstand 8 m,
  fünf Sekunden Sprint bringen 2,7 m Vorsprung, danach holt das Monster
  0,85 m/s auf — Kontakt nach etwa 18 s gerader Flucht, mit einem Riegel
  dazwischen etwa 22 s, mit einem Sichtabriss gar nicht.
  **Der Modelltechniker hat seine eigene Puste** (`TechnicianTuning.stamina`,
  Trab über denselben `TROT`), damit das Training sie verstellen darf.
- **Gewichte, Simulation, Training** — die drei Dateien hängen zusammen:
  `botTuning.ts` hält alle Zahlen beider Bots mit Grenzen, Namen und
  Browser-Speicher; die Verhaltensfelder dürfen nicht auf null, sonst trainiert
  sich das Monster zurück in „läuft im Kreis". `roundSim.ts` spielt eine ganze
  Runde ohne three.js/Rapier auf der Raumkarte (`roomGraph.ts`, inklusive
  gedämpfter Hörweite `earshot`) in Millisekunden aus. `botTraining.ts`
  bergsteigt darauf gegen **zwei** Ziele auf einmal (`TRAINING_TARGETS`):
  **zu zweit** (Techniker gegen Monster, sonst niemand) geht die Runde
  halbe-halbe aus, **ab drei Spielern** gewinnt das Monster zwei von drei
  Malen. Beide Zahlen gelten für **dieselben** Gewichte — was sich
  unterscheidet, ist die Besetzung und nicht die Einstellung der Bots
  (`rules/roundSetup.crewSize` zählt Techniker, Monster und jede Fähigkeit der
  Zentrale, die nicht auf „Aus" steht).
  `measure` teilt die Runden einer Messung deshalb auf beide Besetzungen auf
  statt sie zu verdoppeln, und `centreScore` bewertet den Abstand zu beiden
  Bändern zusammen; `inBand` verlangt beide. **Und keiner gewinnt öfter als
  neun von zehn Runden** (`FAIR_LIMIT` 0,9, `fair`): Die Bänder sagen, wohin
  die Suche soll, die Grenze sagt, was sie nie abliefert. Das Training in der
  Tafel fängt bei den Reglern an, wie sie gerade stehen — auch am Anschlag —,
  und das Beste aus einer aussichtslosen Lage ist nach vierzig Schritten
  immer noch eine Seite, die fast jede Runde gewinnt. `outranks` sortiert
  deshalb erst nach Fairness, dann nach Abstand, dann nach Fortschritt: Ein
  fairer Satz schlägt jeden unfairen, unter unfairen zählt weiter der Abstand,
  damit die Suche herausfindet. `TrainingState.fair` sagt es der Tafel, und
  `ShipExperience.stepTraining` spielt einen unfairen Satz **nicht** ein — die
  Regler bleiben dann, wie sie waren, und die Statuszeile sagt es.
  Dazu wie bisher: feste Stichprobe
  je Schritt (sonst klettert es auf Rauschen), Fortschritt als
  Gleichstandsbrecher mit Vorzeichen, wachsende Schrittweite in Sackgassen.
  `TrainingRun.advance(ms)` rechnet in Zeitscheiben, damit der Browser-Knopf
  den Tab nicht einfriert. `DEFAULT_TUNING` ist das Ergebnis dieses Trainings;
  `botTraining.test.ts` misst 1600 Runden nach. **Mit dem Paket „Rechenkern"
  neu trainiert**: Zwei Meter Tür in beiden Welten, Ducken als Tempo und die
  ablaufende Abfangprognose spielen eine andere Runde, und die alten Zahlen
  fielen mit 0,064 aus dem Band (0,05). Zwölf Schritte à 64 Runden von den
  alten Gewichten aus (`TrainingRun(DEFAULT_TUNING, 'both', 12, {rounds: 64},
99)`) stehen bei **0,47 / 0,31**, Abstand 0,029 — und `Schleichtempo` ist
  seither auf höchstens 0,95 gedeckelt: Der Lauf wollte 1,0, und ein
  Schleichen, das so schnell ist wie Gehen, ist keins (`botTuning.test.ts`).
  **Der Abstand zwischen Messung und Zusage ist mit M2 zu.** Die
  Vorgeschichte: Seit jeder Raum zwei bis drei Kisten hat (`rules/cargo.ts`),
  sind die Wege länger — nicht, weil der Bot die Kisten durchwühlte
  (`technicianBot` und `roundSim` gehen über `taskCargo` **direkt** an die
  richtige), sondern weil jede Kiste ein weiteres Wandmodul ist und der Packer
  daraufhin jedes Zimmer anders stellt. Gemessen fiel er dadurch von
  0,52 / 0,34 auf 0,44 / 0,25, und ein Trainingslauf, der ihn mit Gewalt ins
  Band zurückzog, tat es über Puste 2 s und Vorsicht 6 m — Zahlen, die man
  einem Bot ansieht; über beide Seiten gerechnet drückte er sogar das
  Grundtempo des Monsters unter das Gehtempo des Spielers und damit gegen die
  Ungleichung. Der Abstand gehörte also zugemacht, indem das **Spiel** besser
  wird, und genau das ist M2: Das Monster geht schneller, jagt knapp unter dem
  Sprint, sucht statt zu würfeln — und der Sprint hat eine Puste. Danach neu
  gelernt (45 Schritte à 128 Runden, `trainBots(…, 'both')`) und über
  1600 Runden nachgemessen steht `DEFAULT_TUNING` bei **0,54 / 0,315**, also
  **beide Quoten im Band**. `botTraining.test.ts` prüft weiter die Messung
  (`BOT_RATES`) _und_ jetzt zusätzlich, dass `inBand` für sie gilt — eine
  abgelesene Zahl fällt auf, wenn sie sich verschiebt, ein gerade noch
  getroffenes Band nicht.
  **Zwei Vorrichtungen im Test mussten dafür nachgezogen werden, und beide
  sagen etwas über das Spiel.** Der historische „chancenlose" Startsatz gewinnt
  mit den Kisten gemessene 0,375 und ist keiner mehr — der Test fängt bei einem
  Techniker an, der wirklich keine Chance hat. Und der „übermächtige"
  Techniker ist seit M2 nur noch **zu zweit** übermächtig: Weil die
  Untergrenzen der Tempo-Regler Teil der Ungleichung sind (`speed` ≥ 0,95,
  `hunt` ≥ 1,3), lässt sich das Monster gar nicht mehr so weit ausbremsen, dass
  es im Team chancenlos wäre — dort gewinnt selbst dieser Techniker nur 0,375.
  Im Duell räumt er mit 0,81 ab, und genau diesen Überschuss holt die Suche
  wieder herunter; das prüft der Test jetzt. Beide Vorrichtungen stehen
  ausgeschrieben statt aus `DEFAULT_TUNING` geerbt, damit ein späterer
  Trainingslauf ihnen nicht den Boden wegzieht.
  **Und eine Zusage braucht genug Runden, um überhaupt messbar zu sein**: Das
  Band ist 0,05 breit, auf 32 Runden verschiebt eine einzige Runde den
  bewerteten Mittelwert um 0,031. Der Test, der den Start im Band prüft, fährt
  deshalb 64 Runden je Schritt.
- **Die Tür hinter dem Techniker** (`rules/doorSeal.ts`) ist der Grund, warum
  aus derselben Einstellung zwei Quoten werden. Er hat gegen das Monster nur
  eines in der Hand, und das ist **eine Tür**: Wer verfolgt hindurchgeht,
  hinter dem fällt sie zu — nicht als Knopf, den man im Moment der Berührung
  findet. Verriegelt wird über denselben einen Riegel wie überall
  (`doorLocks.chooseLock`), und der Gewinn ist `SEAL_HOLD`: die **ausgerechnete**
  mittlere Zeit, die das Monster zum Aufziehen braucht (aus `pryChance`, nicht
  geraten). Der eigentliche Gewinn ist aber, dass eine Tür die **Spur abreißt**
  — kein Blick, ein gedämpftes Geräusch, und die Jagd wird wieder zur Suche.
  **Allein** macht der Techniker sie selbst zu, sofort. **Im Team** gehört sie
  der Schalttafel: Er muss es sagen, der andere muss hören und drücken, und
  das kostet `COMMAND_DELAY` = 1–2 s (`commandLag`). In der Zeit ist ein
  jagendes Monster fünf Meter weiter und manchmal schon durch — dann war der
  Riegel umsonst. Dieselbe Reibung verzögert in `roundSim.ts` auch, wann die
  Flucht überhaupt anläuft. Mehr Leute heißt hier nicht mehr Sicherheit,
  sondern mehr Reibung; die Zentrale zahlt sie mit Wissen zurück.
- **Ein Riegel im Fluchtweg ist für den Bot ein Preis, keine Wand**
  (`rules/technicianBot.ts`, `doorToll`). Auf der Flucht fällt hinter ihm eine
  Tür zu und das Monster schlägt welche zu — steht dann eine gesperrte Tür
  zwischen ihm und seiner Deckung, wartet er nicht davor, sondern **zieht sie
  auf**: derselbe Knopf, den ein Mensch dort drückt (`FlatWalker.blocked`
  meldet die Tür, vor der die Route endet; `FlatRound.lockDoor` macht sie
  auf). Bezahlt wird das bei der **Wahl der Deckung**: Jede gesperrte Tür auf
  dem Weg zählt als `DOOR_TOLL` = 6 m Umweg mit, und bis zu `1 + DOOR_HURRY`
  mal so viel, je näher das Monster schon steht — am Riegel steht er still,
  und wer hinter ihm herkommt, holt in dieser Zeit auf. Deckung ohne Tür
  dazwischen gewinnt damit von selbst; ist ringsum alles zu, geht er trotzdem.
  Unendliche Kosten wären dieselbe Ecke, in der er sonst stehen bleibt und
  stirbt — dieselbe Regel wie bei der Scheu vor dem Monster (`RouteAvoid`).
- **Die Scheu hat einen harten Kern** (`RouteAvoid.core`, `CORE_WEIGHT` = 1000
  je Rasterschritt, Radius `DREAD_CORE` = Schlagreichweite 1,7 m + 2,5 m —
  einmal „eine Kachel", seit dem 1-m-Gitter in Metern). Der weiche Trichter allein kostete vier je Schritt — einen Meter
  Umweg, und den zahlt ein Fliehender jederzeit: Der Techniker lief dem
  Monster regelmäßig durch die Arme. Tausend sind 250 m Umweg, mehr als die
  Station breit ist; hindurch geht er nur noch, wenn es gar keinen Weg daneben
  gibt (endlich teuer, nicht gesperrt — eine Wand, die sich bewegt, sperrt
  irgendwann jemanden ein). Zwei Löcher gehören dazu, ohne die der Kern nichts
  täte: Der **Schnurzug** zog den Bogen hinterher wieder gerade (er fragt nur,
  ob die Kapsel durchpasst — durch den Gang mit dem Monster passt sie), also
  ist der Kern für die Glättung eine Wand (`coreCrossed`); und eine **einmal
  geplante Route** blieb stehen, während das Monster weiterlief, also prüft der
  Navigator bei jeder Verfolgung nach, ob die laufende Route inzwischen
  hindurchführt (`navmesh/flatNavigator.crossesCore`, dazu engere Toleranzen
  `CORE_TOLERANCE`/`CORE_HOLD`).
- **Zeitraffer** (`simulationSpeed.ts`): ×1/×2/×4/×8/×12/×16 über die
  **Anzahl** der Bilder (`HauntingWorld.update` → `tick`), nie über die Länge
  eines Schritts; nur der letzte Durchgang sendet und frischt die Anzeigen
  auf. Lange echte Bilder nehmen die Stufe selbsttätig zurück. **Eingestellt
  wird sie im Optionsmenü des Schiffs** (`map/optionsMenu.speedKeys`, Reihe
  `ui-row` aus Pillen, `[data-speed]`, nur in der Bot-Runde) — der Besitzer
  wollte die Stufen einzeln wählbar, nicht einen Knopf, der reihum zählt; der
  „Tempo"-Knopf in der Test-Tafel des Schiffs ist deshalb weg. Die Stufe
  gehört der Welt (`HauntingWorld.simulationSpeed`).
- **Beleuchtung der Bot-Runde** (`botLighting.ts`): vier Stellungen, dazu
  Drehleuchten in den Gängen (`shipArt.buildCorridorBeacons`,
  `HauntingWorld.applyBeacons`). Winkel und Puls laufen im Kreis statt
  weiterzuwachsen; die Leuchten sind `MeshBasicMaterial` und keine Lichtquellen.
- `trainingLayout`/`trainingDeck` bieten getrennte Lehrzimmer. Übungspuzzles
  haben eigene Zustände; erneutes Drücken setzt nur das jeweilige Beispiel
  zurück. Dunkler Test bleibt sicher; Lampen sind tatsächlich nötig. Im
  **Modellzimmer** stehen die drei Monster als Attrappen — und zwar als
  dieselben Akteure wie im Ernstfall (`actorArt.buildActor`, siehe _Wer im
  Schiff einen Körper hat_), samt Figur aus dem Regal, wo es eine gibt. Wer
  hier nachsieht, wie ein Wächter aussieht, soll im Gang nicht etwas anderes
  treffen. Sie stehen still (das Schild sagt es: „ATTRAPPE · GEHT NICHT LOS ·
  HARMLOS"), bekommen aber über `TrainingDeckHost.actor` einen Takt aus der
  Bildschleife des Schiffs — das Deck selbst hat keine.

**Telefone und Netzwerk**

- **Das Telefon ist das Hauptgerät der Einsatzzentrale.** Die Stationen im
  Van werden von den Spielern am Handy bedient, und auch der Techniker am
  Handy spielt das Schiff (von oben oder aus den Augen, mit dem Bordstock der
  Seite). Jede UI-Entscheidung wird zuerst für ein Telefon im Hochformat
  getroffen:
  Daumenzonen unten, nichts Wichtiges in der Bildmitte, nichts unter dem
  HUD der Seite (Menü, Verbindung, VR; `z-index` 5 in `style.css`), und was
  bedienbar sein soll, ist ohne Tippen ins Leere sichtbar. Desktop und
  Querformat sind Nebenfälle, nicht der Maßstab.
- **Die gemalte 2D-Welt ist weg** (Paket H): `map/flatMode.ts`,
  `map/flatScene.ts`, `map/flatArt.ts`, `map/flat.css` zeichneten das
  Brettspiel von oben mit eigener Runde darin — Böden, Wände als Band,
  Figuren als Bohnen, Overlays für Karte, Rätsel, Akte und Menü, die Kamera,
  die beim ersten Schritt zurückkam, der Rollenstreifen über der Szene. Was
  davon **Rechnung** war, gilt weiter und steht in `map/flatRound.ts`,
  `geometry.ts`, `visibility.ts`, `noiseSpread.ts`, `automaticDoors.ts`
  (die Türautomatik: Kasten 1,8 m quer und 3,2 m vor der Tür, Nachlauf
  1,2 s, ein belegter Durchgang fällt nie um jemanden zu), `rules/` und
  `audio/`; was **Bild** war, ist das Schiff von oben (`core/TopDownCamera.ts`)
  und die Karte der Telefone (`map/mapView.ts`). Der Streifen der Seite
  (`#hud`) ist im Schiff im Browser weiter aus — über eine Klasse am `body`
  (`haunting.css`, `body.orbital-on #hud`, gesetzt von `ShipExperience`),
  weil die Seite ihr `hidden` beim Verlassen der Brille selbst wieder setzt
  (`main.ts`); Kompass und Tafel rücken dafür an den oberen Rand
  (`--orbital-top`). Der Stock der Karten-Rollen (`map/joystick.ts`,
  `map/joystick.css`: Monster, Zuschauer) hat eine **sichtbare Ruhestellung**
  unten links und springt beim Aufsetzen unter den Daumen; `.flat [hidden] {
  display: none !important }` bleibt Pflicht.
- **Die Karte hat die Handschrift eines Brettspiels** (`map/mapView.ts`,
  `INK`): helle Böden mit Kachelfugen (`FLOOR_TILE` 1,25 m), Wände als dunkler
  Kern mit heller Kante, **Türen als Blätter in Pfosten** — zu ist ein Blatt
  quer (Stahl hell, Holz holzig), offen sind nur die Stummel, gesperrt ist rot
  mit Schloss —, **Möbel als Klötze** (`MapSnapshot.fixtures` aus
  `stationLayout`, `extract.fixturesOf`, mit Kennzeichen je `MarkId`), Figuren
  als kleine Astronauten mit Visier, Rucksack, Händen und Beinen, die beim
  Gehen schwingen, das Monster als Klumpen mit Augen und Klauen. **Geräusche
  sind Wellen über die Kacheln** (`map/noiseWaves.ts`;
  `MapSnapshot.noises`, `MapNoise` mit Urheber, Reichweite `reachOf`,
  Zeit; `WAVE_SPEED` 9 m/s): eigene blau, die des Monsters rot, alles andere
  orange — **die Urheberfarbe aber nur im Modus „Alles sehen"**; wer mitspielt,
  bekommt für alles Fremde dieselbe Farbe — die 2D-Runde führt sie fünf Sekunden
  (`FlatRound.wave`: Schritte als Pulse, Türen, Zufallen, Splittern, Schrei,
  Schacht). Sie laufen über die **Felder** und nicht über die Luftlinie
  (`map/noiseSpread.ts`): Kachel für Kachel, nie über den leeren Weltraum
  neben der Station — und durch die **Schächte**, in beide Richtungen.
  **Wände dämpfen, sie schneiden nicht ab**: Ein Schritt durch eine Wand
  kostet `WALL_LOSS` 9 m, durch Glas `GLASS_LOSS` 6 m, durch ein
  geschlossenes Türblatt `DOOR_LOSS` 4 m, durch einen Schacht seine Länge
  plus `VENT_LOSS` 3 m — die Zahlen stehen **einmal**, in `audio/hearing.ts`,
  und `noiseSpread`, `perception.acousticField` und `roomGraph.earshot`
  holen sie sich dort. Was `spreadNoise` je Kachel zurückgibt, sind deshalb
  **effektive** Meter (Weg plus Dämpfung), und die Front braucht für eine
  Wand bei `WAVE_SPEED` eine knappe Sekunde länger und kommt blasser drüben
  an. Bis Herbst 2026 war das anders: Die Welle hörte an jeder Wand hart auf
  und eine geschlossene Tür sperrte sie ganz — der Spieler sah sein Geräusch
  im Zimmer bleiben, während das Monster es nebenan längst hörte. Jetzt
  zeigt das Bild dasselbe, was `audio/hearing.ts` rechnet. Gezeichnet werden
  sie **ganz hinten**, direkt auf den Böden: Eine Welle über Möbeln und
  Figuren nähme genau das Bild weg, für das sie da ist. **Wer das Monster
  spielt, sieht seine eigenen Wellen nicht** — man hört sich nicht selbst zu, weder auf der
  Karte noch auf den Ohren (`audio/soundscape.selfMonster`). Über einer
  gesperrten Tür steht ein **Balken**, wie lange die Sperre noch hält
  (`MapDoor.hold`). **Ziele** (`MapViewOptions.objectives`, `FlatRound.objectives`:
  erst Ersatzteil, dann Konsole, zuletzt Zentrale) als gelbes Dreieck am
  Bildrand mit Entfernung — und am Ort als das Ding selbst: der Kasten der
  Kiste, der Umriss des Raums, ein Ring nur noch bei Konsole und Zentrale;
  **Schächte** (`layers.vents`) als Bögen zwischen verbundenen Klappen mit dem
  Zielraum daran — in der 2D-Welt im
  Modus „Alles sehen", in der Monster-Ansicht immer. `overlay` malt zuletzt,
  was eine Ansicht selbst noch braucht. Im Modus „Realitätsnah"
  bleiben Möbel und Items im Dunkeln weg (`seen`).
- **Die Tafel der Runde hat fünf Plätze** (`rules/roundSetup.ts`, `SEATS`):
  **Techniker, Rot, Gelb, Blau, Monster**. Jeder Platz sagt, wer ihn hält
  (`SeatWho`: Mensch / Bot / Aus — der Techniker kennt kein „Aus", und mit
  Brille im Raum steht er auf **VR**, `lockTechnician`), und jeder Platz außer
  dem Monster trägt die **drei Fähigkeiten** (`Ability`: Späher, Schalttafel,
  Archiv) als Lampen, die man je Platz an- oder ausschaltet (`withPower`).
  Die Tafel liegt in `localStorage` (`bgvr.haunting.setup.v2`; v1 und die
  noch ältere `seats:[{role,who}]`-Form übersetzt `readSetup` beim Lesen) und
  ist überall dieselbe: `roundSetupPanel.ts` (`SetupPanel`) im Van, die
  Einträge `haunt:seat-<platz>` und das Untermenü `haunt:powers` in der
  Brille — so stellt auch der VR-Spieler ein, ob ein Monster mitspielt und
  ob Bots das Archiv und die anderen Posten halten.
  **Und die Tafel, die gilt, ist die des Gastgebers** (`net.setupMessage`,
  `net.readSharedSetup`, `HauntingWorld.applySetup`/`adoptSetup`): Jeder Tipp
  auf einem Gerät, das die Runde nicht rechnet, geht als ganze Tafel an den
  Gastgeber, der übernimmt sie (nur den Anzug lässt er der Brille,
  `lockTechnician`), und mit dem nächsten Stand kommt sie als Feld `setup` an
  alle zurück — ohne Protokollsprung, weil ein Gerät ohne das Feld einfach
  seine eigene behält, wie bisher. Vorher lag die Tafel **nur** im Browser
  jedes Geräts: Was ein Telefon in der Lobby einstellte, sah die Brille nie,
  und der Gastgeber prüfte Schaltbefehle gegen eine Tafel, die nur er kannte.
  Gegen das Zurückspringen — der eigene Tipp ist noch unterwegs, der alte
  Stand kommt viermal je Sekunde — hält jedes Gerät nach einem Tipp
  `SETUP_GRACE` = 1,5 s lang seine eigene Tafel (`setupTouchedAt`), und
  übernommen wird nur, was sich unterscheidet (`sameSetup`), sonst baute sich
  die Seite viermal je Sekunde neu und verschluckte jeden Tipp dazwischen.
  Wer später dazukommt, sieht so die Verteilung, die gilt, und nicht seine
  von gestern. **Wer ich bin, ist keine
  Spalte auf der Tafel mehr**, sondern die Wahl der Lobby (`LobbyChoice.me`,
  `MyRole` = ein Platz oder `watch:technician` / `watch:all`), je Gerät. Die
  **Reiterzeile** des Telefons ist diese Wahl (`stationUi.choose`): Wer einen
  Platz antippt, sitzt dort, der Platz wird „Mensch", der alte wird frei
  (Farben → Aus, Techniker/Monster → Bot) — „das Wegschubsen ist nur eine
  Metapher". Wer allein ist, sitzt als **Zuschauer: Einzeln** in der
  Zentrale (`defaultLobby` auf dem Telefon), und die Runde läuft mit Bots.
  **Wie eine Mischung heißt, rechnet `roleName`:** Späher / Schalttafel /
  Archiv einzeln; Späher + Schalttafel = **Einsatzkontrolle**, Archiv +
  Späher = **Aufklärung**, Archiv + Schalttafel = **Leitstand**, alle drei =
  **Zentrale** (`seatTitle` je Platz). `powersOf` sind die Fähigkeiten des
  **Technikerplatzes** (Späher auch, wenn ein Bot-Platz ihn hält, denn der
  funkt ihm die Punkte); ohne Archiv sieht der Techniker **keine Ziele** —
  keinen Kompass, keinen Saum auf der Karte, keine Liste
  (`goalPrecision === 'none'`, `FlatRound.objectives` und
  `HauntingWorld.objectives` geben `[]`); er hört, wo es liegt, wenn am
  Archiv ein Bot rechnet (`botArchivist`, `rules/archiveRadio.ts`), oder
  sucht. Ohne Schalttafel schaltet er keine Tür und keine Lampe per Tipp;
  Schaltbefehle nimmt die Welt nur von Farbplätzen an, die die Fähigkeit auf
  der Tafel des Gastgebers halten (`applyFlip`).
  **Die Stühle heißen Farben** (`stations.StationId` = `red | yellow | blue |
watch | monster`, `COLOUR_STATIONS`); Archiv, Schalttafel und Späher sind
  seither **Ansichten** (`ABILITY_VIEWS`: `archive`, `hack`, `scout` in der
  Registry), die ein Stuhl je nach seinen Lampen aufschlägt — **alle
  zusammen auf einer Karte** (`views/seatRole.ts`, `mountSeatView`): Die
  drei Ansichten bekommen die eine `MapView` gereicht statt je eine zu bauen,
  zeichnen sie nicht selbst und verstecken ihr Kästchen; oben steht eine
  Zeile (`.role__bar`) mit Name und Meldung je Fähigkeit. Türen und Lampen
  hört die Schalttafel (`tapDoor`, `tapLight`), Zimmer der Archivar
  (`open`), der Späher malt seine Peilung (`paint`); Fracht hat auf dieser
  Karte keinen eigenen Griff, weil sie vor den Türen geprüft würde und an
  vielen Türen eine Kiste im Fangradius steht — der Tipp fällt ins Zimmer
  und öffnet dessen Akte. Gezeigt wird die Vereinigung (Lampen mit
  Schalttafel, Fracht mit Archiv) und **nie ein Wesen**: ein heller Raum,
  aber nicht, ob das Monster darin steht. Für die Welt zählt das Archiv, wenn
  es dabei ist (`StationUi.shownView` → sein Loch für die Raumakte), sonst die
  erste Fähigkeit. Eine Zeile zum Blättern (`data-sub`) gibt es nicht mehr;
  der Besitzer wollte die Fähigkeiten nicht wechseln, sondern haben.
  `crewSize` zählt Techniker, Monster und jede Fähigkeit eines Platzes, der
  nicht auf „Aus" steht.
  **„Monster: Mensch" heißt: Wer den Platz nimmt, steuert es.** Auf der
  Tafel steht, wem der Platz gehört; wer ihn über den Reiter nimmt, sitzt an
  der Station `monster` und schickt sein Steuer (`monster/netMonsterPort.ts`)
  — auch als **Gastgeber**, dessen Port die eigene Runde speist (`receive`).
  Ist keine Brille im Raum, spielt er das Monster **auf der Karte von oben**
  (`startRound`: `flatRoleOf(setup, 'monster')`), denn im Schiff rechnet der
  Modelltechniker nur auf dem Gerät des Technikers, und ein Monster allein im
  Schiff hätte niemanden zu jagen. Sitzt niemand dort, rechnet beim Gastgeber
  die Routine weiter (`monster/netMonsterControl.ts`, `occupied`), und ein
  Satz beim Start sagt es.
  **Die Spalte „Ich" verbindet Platz und Gerät**: Ein Tipp darauf macht die
  Zeile zum Menschen _und_ setzt dieses Telefon an das Gerät, das dazugehört
  (Archiv → Archiv, Schalttafel → Schalttafel, Späher → Späher, Monster →
  Monster; `stationUi.claimSlot`, `ABILITY_STATIONS`) — ohne dabei die Seite zu
  wechseln. Seit #93 ist jede Fähigkeit eine eigene angemeldete Rolle mit
  eigener Karte; „Einsatzkontrolle" ist deshalb kein Gerät mehr, sondern nur
  noch der **Name** dafür, beide zugleich zu halten. Unter jeder Fähigkeit steht, wer sie wirklich hält (Name aus dem
  Netz, „Bot" oder „niemand"). Über das Netz sagt ein Telefon weiterhin **ein
  Gerät** an (`Claim.station`); die Fähigkeiten sind lokal — die feinere Ansage
  gehört in `net.ts` und damit in ein eigenes Paket.
  **Wer mitten in der Runde wechseln darf, rechnet `switchRights`:** in einer
  Test-Runde jeder alles; sonst nur, wer in der Zentrale sitzt (am Telefon
  also, und nicht als Monster), und den Techniker in der Brille rührt niemand
  an (`lockTechnician`, `technicianLabel` → „VR", der Knopf ist dann gesperrt).
  Verteilt wird nicht mehr mit drei Kacheln, sondern mit der Absicht
  (`lobby.applyIntent`, siehe unten); `presetFor` bleibt als Rechnung für die
  alten Namen. `flatRoleOf` sagt, wen der Spieler in 2D spielt — ein
  Mensch als Techniker gewinnt gegen ein Mensch als Monster (ein Stock, ein
  Spieler), und niemand von beiden heißt **`watch`**: zusehen, während der
  Techniker aus Zahlen läuft (`flatRoleOf` ist mit der gemalten Karte
  gegangen). `roundKindOf` sagt die Rundenart im Schiff (dort rechnet das
  Monster immer die Routine). **Ein Bot auf einem Platz gibt dem Techniker die
  Fähigkeit selbst** (`powersOf`, `SoloPowers`): Archiv heißt Kistengenauigkeit
  des Ziels (`goalPrecision`), der Saum auf der Zielkiste, die Auftragszeile
  im Streifen (`hudTasksVisible`) und der Funk des Archivars aus Zahlen
  (unten); Späher und Schalttafel wirken heute nur über die Karte der
  Telefone — das Horchbild (`SCOUT_PERIOD` = 3,5 s, eine Probe der Geräusche
  statt der Stelle des Monsters: Eine Peilung alle drei Sekunden nahm ihm jede
  Möglichkeit, sich zu verstecken) und die Tür- und Lampen-Tipps hingen an der
  gemalten Karte des Technikers und sind mit ihr gegangen. Ein Mensch am
  Platz nimmt ihm die Fähigkeit wieder ab — und mit ihr die Kistengenauigkeit
  des Ziels.
  **Und der Archivar aus Zahlen funkt jetzt auch** (`rules/archiveRadio.ts`):
  Bis hierher bekam der Techniker dessen Auskunft _still_ — die Zielkiste
  leuchtete, ein Tipp aufs Zimmer schlug die Akte auf. In der Brille schaut aber
  niemand auf eine Karte, während hinter ihm eine Tür knarrt; der Besitzer wollte
  „die Hilfe-Kommunikation vom Archivar" ausdrücklich auch dort. Gesprochen
  werden die zwei Sätze, die ein Mensch am Archiv ohnehin sagen würde: **wo es
  liegt**, und sobald das Teil in der Hand ist, **wohin damit und welche Liste
  dafür aufzuschlagen ist** (`SHEET_NAMES`: Kabelplan, Frequenzliste, Codetafel).
  Gelesen wird dabei dasselbe Blatt wie auf dem Telefon des Archivars
  (`archiveGoals`) — also gilt dieselbe Verschwiegenheit: die Konsole erst mit
  dem Teil in der Hand, ein abgelegtes Teil erst nach `DROPPED_SEEN`. Gefunkt
  wird nur bei Lagewechsel (`ArchiveCall.key`) und nur dort, wo am Archiv
  wirklich ein Bot rechnet: Sitzt ein Mensch, ist das Sagen sein Platz, und eine
  Stimme daneben nähme ihm seinen einzigen Beitrag weg. Die Wege von
  Techniker und Monster (`FlatRound.playerRoute`, ein eigener `FlatNavigator`
  mit `PLAYER_RADIUS`; `monsterRoute`, `navigator.remaining`) liegen im Schiff
  als `NavigationOverlay` auf dem Boden (Bot-Runde, „KI-Absichten"); **beim
  Zuschauen ist der Weg des Technikers der seines Bots** (`TechnicianBot.route`
  über `FlatWalker.remaining`).
- **Das Kabelrätsel zeigt Symbole** (`WIRE_SYMBOLS` in `ShipExperience`, an
  der Konsole und in der Tafel des Technikers): Stecker `i` gehört in die
  Buchse mit demselben Symbol, richtig Verbundenes leuchtet grün. Ohne die
  Symbole war das Rätsel ein Raten unter 24 Wegen. Von oben öffnet `A` an der
  Konsole den Wartungskasten und klappt die Tafel mit den Rätselknöpfen auf
  (`useConsole`); das frühere Rätsel-Overlay der gemalten Karte
  (`map/puzzleOverlay.ts`) ist weg — offen ist ohnehin immer nur eines
  (`FlatOverlay`, oben).
- **Der Kompass am oberen Bildrand** (`objectiveCompass.ts`) gehört dem
  Desktop-Techniker: Himmelsrichtungen und die Ziele (`HauntingWorld.objectives`,
  dieselbe Regel wie in 2D) als gelbe Dreiecke mit Entfernung, was hinten
  liegt klebt am Rand. `compassMarks` ist reine Rechnung mit Test; in der
  Brille gibt es ihn noch nicht (DOM ist dort unsichtbar) — ein Streifen an
  der Kamera wie `ShipExperience.status` wäre der nächste Schritt.
- **Eine Runde in der Brille starten** (`HauntingWorld.menu()`,
  `rules/worldMenu.ts`): Handgelenk-Knopf drücken, im Panel unter den fünf
  Einträgen der Engine (Welten, Verbindung, Bewegung, Aussehen, Grafik) stehen
  **zuerst** die drei Absichten der Lobby — _Spielen_, _Zuschauen_,
  _Trainieren_, die aktive mit einem Punkt davor —, dann „Zur Zentrale /
  Rolle wechseln", die feste _Ansicht: 3D Schiff_ und die Einstellungen
  (Testlicht, Station, Techniker, Monster, **je ein Eintrag für Späher,
  Schalttafel und Archiv** mit Bot / Mensch / Aus, Gegner). Ein Druck genügt, es gibt kein Untermenü, und das Panel klappt
  zu — **nur wenn wirklich etwas losgeht**: Eine Absage muss offen bleiben,
  weil `App.notify` in der Brille die Statuszeile _des Panels_ schreibt und die
  Meldung mit ihm verschwände. Danach läuft die Runde
  (`phase === 'running'`); beim Spielen ist das Monster an, Zuschauen und
  Trainieren sind der sichere Stand mit Testlicht (`startedRound`).
  **Was dabei schiefgeht, sagt der Eintrag jetzt selbst.** Die Rechnung
  darüber, welcher Eintrag dasteht, was er startet und welcher Satz an die
  Stelle einer Runde tritt, die nicht losgeht, liegt ohne three.js in
  `rules/worldMenu.ts` und wird von `worldMenu.test.ts` nachgerechnet — drei
  Hürden waren es, und jede endete vorher in einem Eintrag, der nichts tat und
  nichts sagte:
  1. **Die Ansicht ist keine Sache dieser Welt mehr.** Bis Paket H entschied
     ein Häkchen „2D von oben" (`opensFlat`), ob eine gemalte Karte aufging —
     und in der Brille stieg das wortlos aus; seither ist _Von oben_ oder
     _Aus den Augen_ das Menü des Kerns, und diese Hürde gibt es nicht mehr.
  2. **Ein fremder Gastgeber** (`mayCompute`, `HOST_BUSY`): Rechnet ein anderes
     Gerät die Runde — ein zweites Fenster, das noch als Techniker im Raum
     steht, reicht —, dann sagt der Eintrag das, statt still zu bleiben.
     Dieselbe Meldung kommt beim Druck.
  3. **Die falsche Rolle** (`NOT_TECHNICIAN`) und **ein belegter Raum**
     (`ROOM_BUSY`, nur für „Zuschauen" im Schiff: es setzt den Stand zurück).
     Auch der Startknopf im Van läuft durch dieselbe Prüfung — **aber erst,
     nachdem er den Anzug verteilt hat**, siehe den nächsten Absatz.

  **Und der Startknopf im Aufbau ist selbst der Weg an den Stock**
  (`shipStart`, `HauntingWorld.startRound`, `pendingStart`). Der vierte Befund
  war: „Der Knopf ‚Mission starten' scheint die Mission nicht zu starten." Er
  stimmte für **jedes** Gerät, das nicht schon am Stock stand — also für jedes
  Telefon und für jeden Desktop beim ersten Aufschlagen: `startMission` fragt
  `startBlocker`, das fragt `ctx.role`, und das ist dort `desktop`. Heraus kam
  `NOT_TECHNICIAN`, und der Satz dazu ging in die Statuszeile des
  Handgelenk-Menüs — ein Panel in der 3D-Szene, über dem die Einsatzzentrale
  liegt. Der Knopf tat also nichts und sagte nichts. Jetzt rechnet
  `shipStart({atStick, mine, occupied})` vier Fälle:
  `start` (steht schon am Stock), `stick` (die Tafel sieht dieses Gerät als
  Techniker: `flatTechnician = true`, die Absicht wartet in `pendingStart`
  und läuft im nächsten Bild noch einmal durch — dann mit `ctx.role === 'vr'`),
  `others` (`SHIP_OCCUPIED` — im Schiff gibt es einen Techniker je Raum) und
  `nobody` (`SHIP_NEEDS_TECHNICIAN` — wer in der Zentrale sitzt, startet keine
  Schiffsrunde ohne einen Menschen im Anzug; der Satz sagt beide Auswege).
  Die Bot-Runde geht wie bisher vorher ab (`requestBotRound`): Sie macht das
  Gerät selbst zum Techniker ihrer Vorführung.

  **Und steckt der Techniker in der Brille, startet ihn die Zentrale**
  (`net.startMessage`, `START_SENT`): Ein Gerät, das nicht der Gastgeber ist,
  während eine Brille im Raum den Anzug trägt, schickt Absicht und Tafel als
  Startwunsch hinüber statt in `others` zu enden; der Gastgeber übernimmt die
  Tafel und läuft durch dasselbe `startRound` — für ihn ist es `start`. Eine
  **laufende** Runde bricht der Wunsch nicht ab (`ROUND_RUNNING`): Ein Tipp
  aus der Zentrale ist kein Notschalter; der Knopf am Telefon ist dann auch
  gesperrt (`StationUi.shipBusy`: Brille im Raum, Ansicht Schiff, **und** die
  Runde läuft — vorher reichte die Brille allein, und genau das war der Fall,
  in dem drei Leute in der Zentrale warteten, während der Techniker am
  Handgelenk nach dem Knopf suchte). Ein Platz der Zentrale bleibt nach dem
  Wunsch an seiner Karte und sieht dort die Runde, die läuft.

  **Was die Welt sagt, steht auf dem Telefon** (`StationUi.say`,
  `.haunt__say`, `HauntingWorld.say`): eine Zeile zwischen Auftragsstreifen
  und Seite, die der nächste Tipp wieder ablöst. `ctx.notify` allein genügte
  nicht — es schreibt in die Statuszeile des Handgelenk-Menüs, und die liegt
  hinter der Einsatzzentrale. Jede Absage eines Starts geht deshalb an beide
  Stellen.

  **Die Einträge heißen jetzt überall gleich**: `startEntries` baut aus
  `INTENTS` die drei Zeilen `haunt:play` · `haunt:watch` · `haunt:train` mit
  den Worten aus `INTENT_LABELS` (Spielen · Zuschauen · Trainieren), markiert
  die aktive (`active`, aus `intentOf`) und sagt in der Zeile darunter, wenn
  eine laufende Runde damit endet. Die alten Einträge `haunt:flat` („2D-Welt
  von oben: an/aus") und `haunt:view` gibt es nicht mehr — die Ansicht ist das
  Menü des Kerns.

- **Der Aufbau ist eine Tafel und ein Knopf** (`rules/lobby.ts`,
  `LobbyChoice` = Absicht und Platz, in `localStorage` unter
  `bgvr.haunting.lobby.v1`; ein gemerktes Feld `view` aus alten Ständen wird
  beim Lesen fallen gelassen). Die **Absicht** (`Intent`) sagt, _was_
  passiert; wie man dabei zusieht — von oben oder aus den Augen — ist seit
  Paket H das Menü des Kerns und kein Häkchen mehr (`[data-check="view"]` ist
  weg, ebenso `View`, `viewSwap`, `VIEW_LABELS` und der alte Schlüssel
  `bgvr.haunting.flat.v1`). Das Häkchen „Testen" ist ebenfalls weg — ohne
  Monster spielt man, indem man den Platz **Monster auf „Aus"** stellt
  (`applyIntent('train')` tut genau das), und **in einer Runde ohne Monster
  darf jeder jederzeit jede Rolle wechseln**. Die drei Kacheln _Spielen ·
  Zuschauen · Trainieren_ sind weg: „Zuschauen" baut man nicht auf, man
  schaltet es mitten in der Runde an (Optionsmenü des Schiffs); die Absicht
  `watch` bleibt als Datum und im Brillenmenü.
  `applyIntent(setup, intent, me)` kennt dabei, wer fragt: Ein Monster-Mensch
  bleibt beim „Spielen" das Monster, und der Techniker gehört dann den Zahlen.
  Die Absicht ist keine zweite Wahrheit neben der Verteilung: `applyIntent`
  schreibt sie in die `RoundSetup` (die Fähigkeiten bleiben dabei stehen),
  `intentOf` liest sie wieder heraus, und `startLabel` beschriftet daraus den
  **einen** Startknopf — „Mission starten", „Test starten", „Zuschauen",
  **ohne Ansicht in Klammern**. Jede Runde läuft im Schiff
  (`HauntingWorld.startRound`); ein Monster-Telefon ohne Techniker im Raum
  bekommt statt einer Karte den Satz `MONSTER_NEEDS_TECHNICIAN`.
  **Alle Oberflächen zeigen denselben Aufbau**, in derselben Reihenfolge und
  mit denselben Worten:
  - **Startseite der Runde** (`index.html` `#haunt-start`, `main.ts`, unter
    `#haunting`), in zwei Schritten. **Erst die Lobby**: Name, Raum-Code,
    **Verbinden** — und dann eine Liste, wer im Raum steht (ich zuerst, dann
    jeder andere mit Name und Gerät: Brille, Bildschirm, Handy; „schon drin",
    wer die Welt schon betreten hat). Hinein geht es mit **einem Knopf**
    (`#haunt-enter`, nur in der Lobby, sichtbar erst mit der Verbindung), und
    welcher der drei Wege das ist, hat die Startseite schon entschieden
    (`core/screenView.startOptions`): mit Brille **Enter VR** (der Techniker im
    Anzug), sonst **Beitreten** — und dort, je nach „Am Bildschirm: 2D oder
    3D?", die **2D Einsatzzentrale** oder **Web 3D** (Techniker am Bildschirm,
    im Schiff). Die Zeile unter dem Knopf (`#haunt-enter-hint`) schreibt jede
    Änderung mit (`main.ts`, `showStart`); der Browser-Smoke wählt „2D" und
    drückt dann den Knopf. Und wer Haunting nicht über diese Seite, sondern aus
    dem Menü betritt, bekommt dieselbe Wahl als Voreinstellung der Lobby
    (`rules/lobby.defaultLobby(role, view)` über `storedScreenView`), solange
    die Lobby selbst noch nichts gemerkt hat.
    Alle drei bleiben im Raum: `joinHaunting` läuft vor jedem noch einmal —
    wer schon im richtigen Raum steht, bekommt höchstens den Namen
    nachgetragen (`App.setPlayerName`), wer den Code inzwischen geändert hat,
    zieht um. Der Raum kommt aus der Adresse (`net.hauntRoomFrom`: `?room=`
    oder `HAUNT_ROOM`), und ein getippter Code wandert beim Verbinden als
    `?room=` in die Adresse zurück — dieselbe Zeile, die die Welt selbst liest.
    **Die Welt lädt erst mit dem Knopf**: `joinTable` verbindet beim Betreten,
    wenn noch keine Verbindung steht, und zwei gleichzeitige
    Verbindungsaufbauten (Seite und Welt) räumten sich gegenseitig den
    Transport weg — also sammelt die Seite erst alle in der Lobby und lädt
    dann. Die zwei Web-Wege sagen der Lobby vor dem Laden, was dieses Gerät
    ist und wie es sieht (`rules/lobby.arriveAs`): „Web 3D" heißt Techniker
    und Schiff; „2D Einsatzzentrale" heißt Karte von oben, ein gemerkter Platz
    bleibt stehen, nur aus einem gemerkten Techniker wird der Zuschauer des
    Technikers. Für **Enter VR** wird die XR-Sitzung noch aus dem Klick heraus
    angefragt — ein Browser gibt sie nur auf eine frische Geste. Der Rest der
    Startseite (Spielwiese-Knopf, „Zusammen spielen") ist dann
    versteckt, nicht abgebaut (`only-generic`/`only-haunting` in `style.css`):
    `NetPanel` hängt an den Feldern. Der alte Block „In der Zentrale
    mitspielen" (nur der Name, fester Raum `haunting`) ist damit weg — eine
    zweite Gruppe braucht einen eigenen Raum, und der Techniker am Bildschirm
    einen eigenen Knopf.
  - **Wer den Anzug trägt, zählt — auch am Bildschirm** (`HauntingWorld.wearsSuit`,
    `roomHasTechnician`, `suitPeer`). Bis hierher hieß „ein Mensch ist
    Techniker" an vier Stellen `peer.role === 'vr'`: Wer über „Web 3D" kam,
    stand zwar im Schiff, war für die Zentrale aber unsichtbar — ihr Start
    (`startRound`) fing eine eigene Runde mit einem Techniker aus Zahlen an,
    die Tafel ließ „Techniker: Bot" stehen, und Späher wie Zuschauer sahen
    ihn nicht. Jetzt gilt: Brille **oder** frischer Herzschlag
    (`receive`, `kind: 'technician'`, drei Sekunden). `roomHasTechnician`
    entscheidet `lockTechnician` und ob der Start zum Gastgeber geht;
    `suitPeer` liefert die Pose des Technikers für `technicianEyes`,
    `technicianFocus` und die Karte (`worldSnapshot().player`, mit Gierwinkel
    aus der Kopfpose). `roomHasVr` bleibt die engere Frage — nur der Brille
    nimmt niemand den Anzug ab (Sperre der Techniker-Zeile, `switchRights`).
    **Und „Web 3D" steht sofort am Stock**: `init` setzt `flatTechnician`,
    wenn die Lobby Techniker + 3D sagt und keine Brille im Raum ist — vorher
    musste man erst den Reiter „Techniker" antippen, und bis dahin war man
    ein Telefon mit Schiff im Hintergrund.
  - **Kein „Ich" auf der Tafel** (`roundSetupPanel.ts`). Es stand zweimal
    dort — als Spalte, dann als Knopf je Zeile — und ist zweimal wieder weg,
    zuletzt auf ausdrücklichen Wunsch des Besitzers: „Oben die Tabs, unten
    das ‚Ich'-Feld" war dieselbe Frage an zwei Stellen. Die Tafel sagt nur
    noch, **wer** die Plätze hält und **was** jeder darf; welcher Platz der
    eigene ist, nimmt man über die Reiter — und die stehen erst über der
    Karte, nach **„Rollen testen"** (siehe „Van / Telefon"). `SetupPanelHost.me`
    bleibt nur zum Lesen („du · im Anzug"); `choose` gibt es nicht mehr.
    **Und der Anzug hat einen Namen** (`SetupPanelHost.technician`,
    `[data-setup-suit]`, aus `HauntingWorld.suitName` über `link().technician`):
    Brille und „Web 3D" kommen als Techniker herein, also zeigt die Zeile des
    Technikers dann den Namen des Menschen im Anzug („du · im Anzug" bei sich
    selbst) statt „Ich · Mensch · Bot" — nur die Lämpchen der Fähigkeiten
    bleiben. Trägt ihn niemand, stehen die Knöpfe wie bei jedem Platz.
  - **Ein Stuhl, eine Karte** (`views/seatRole.ts`, siehe oben bei den
    Fähigkeiten). Der Weg dahin: Die Zeile zum Blättern lag erst unter der
    absolut gesetzten Karte (jeder Tipp traf die Leinwand — Rot mit drei
    Fähigkeiten sah nur den Späher), dann darüber; der Besitzer wollte sie
    gar nicht: „Die Fähigkeits-Ansichten sollen nicht wechselbar sein,
    sondern direkt auf der Karte." Also liegen die drei Rollen als
    durchsichtige Schichten über der einen Karte (`views.css`,
    `.role--seat > .role { pointer-events: none }`, ihre Knöpfe und Blätter
    fangen wieder), ein Blatt nimmt die Karte wie bisher aus dem Bild, und der
    Knopf „Tafel" oben rechts hat wieder Platz (`.has-corner`).
  - **Die Zentrale sitzt im Schiff am Tisch, nicht am Spawn**
    (`world3d/commandSeats.ts`, `HauntingWorld.crewPlace`,
    `RemoteAvatars.placement`). Ein Telefon oder Bildschirm in der Zentrale
    bewegt im Schiff kein Rig; seine Pose über die Leitung ist die Stelle vom
    Betreten (`COMMAND_HOME`), und dort stand er für die Brille als Spieler
    mitten auf dem Vorplatz — mit jedem weiteren Telefon einer mehr in
    derselben Stelle. Der Wunsch des Besitzers: „nicht als Spieler gespawnt,
    sondern direkt an die Sitzplätze". Also rechnet der **Empfänger** die
    Pose: Wer kein Anzugträger ist (`wearsSuit`), ist die Zentrale; der
    Besitzer eines Geräts (`stations.seatOf`) sitzt auf dem Hocker dieses
    Geräts (`COMMAND_STOOLS` — Rot, Gelb, Blau, Monster, in den Farben der
    Reiter; dieselben Zahlen baut `buildVan`), mit dem Gesicht zum Tisch und
    sitzender Augenhöhe; wer vor dem Fernseher steht, weggeschubst ist oder
    noch kein Gerät hat, steht in der Reihe dahinter, nach Kennung sortiert.
    Vom Empfänger und nicht vom Sender, weil nur er den Tisch kennt und ein
    älteres Telefon sonst wieder am Spawn stünde; alle 250 ms neu gerechnet
    (`CREW_PLACE_RATE`), nicht je Bild. `RemoteAvatars.placement` ist der
    Haken dafür: Eine Welt gibt je Mitspieler eine Pose zurück oder `null`
    (die eigene), eine Pose mit `hidden` nimmt ihn aus dem Bild — so
    verschwindet der Avatar des **2D-Technikers**, den `showTechnician` aus
    `state.technician` ohnehin als Körper zeichnet; vorher stand er zweimal da.
    Haunting hängt den Haken in `init` ein und in `dispose` wieder aus.
  - **Ein Monster, nie zwei.** Seit dem Rechenkern (`flatKernel.ts`) gibt es
    im Schiff keinen NPC mehr: Das Monster ist eine Figur der Runde, und
    Gastgeberwechsel, 2D→3D und ein zweiter Start lassen nur den Kern los
    (`releaseMonster`) und stellen ihn neu — ein Geist, der weiterläuft und
    weiter zuschlägt, kann so nicht mehr entstehen. (`NpcDirector.update`
    läuft trotzdem über eine Abschrift der NPC-Liste, für die Welten, die
    noch NPCs haben.)
  - **Feststecken? Zurück auf den Boden** (`HauntingWorld.unstickPlayer`,
    Eintrag `haunt:rescue` in jeder Lage des Weltmenüs, Brille wie
    Bildschirm): misst, wo die Füße stehen — in einem Zimmer der Station geht
    es in dessen freie Mitte (`safeRoomSpawn`), überall sonst in die
    Einsatzzentrale (`COMMAND_HOME`); die Höhe misst `movePlayerTo` gegen
    den Boden, und ein Schutzschrank wird vorher verlassen
    (`ShipExperience.leaveLocker`, deshalb öffentlich). Die automatische
    Fallrettung der `PortalWorld` (`rescuePlayer`) bleibt daneben bestehen;
    dieser Eintrag ist für den Fall, dass man drin steckt, ohne zu fallen.
    **Versetzt werden die Füße, nicht der Ursprung des Rigs**
    (`PlayerRig.placeFeetAt`, benutzt von `PortalWorld.movePlayerTo`,
    `teleportPlayerTo`, `rescuePlayer` und dem Spawn beim Betreten): In der
    Brille ist der Ursprung die Mitte des Spielraums, und der Kopf samt
    Physik-Kapsel steht so weit daneben, wie man von dieser Mitte entfernt
    steht. `placeAt` setzte nur den Ursprung — beim Missionsstart
    (`newRound` → `movePlayerTo(spawnPoint)`) landete der Kopf damit einen
    Meter neben der Einsatzzentrale, in Wand oder Konsole, die Kapsel steckte
    fest, und die Rettung tat dasselbe noch einmal: „bugge ich im Boden fest,
    auch der Knopf hilft nicht" (Befund des Besitzers). Der Versatz wird nach
    dem Drehen zurückgerechnet, weil er sich mitdreht; am Bildschirm sitzt die
    Kamera über dem Ursprung, und nichts ändert sich. Auch `unstickPlayer`
    misst das Zimmer jetzt unter dem Kopf und nicht am Ursprung. Das Kart
    setzt weiter den Ursprung (`placeAt`, jedes Bild in den Sitz): Dort soll
    man sich im Sitz noch vorbeugen können.
  - **Van / Telefon** (`stationUi.ts`, Hochformat zuerst): **zwei Seiten,
    ein Kopf.** Der Ablauf, den der Besitzer wollte: Lobby beitreten, im
    **Aufbau** die Rollen einstellen, unten **„Rollen testen"** drücken —
    dann die Karte, und darüber genau ein Kopf.
    - Der **Aufbau** (`vanPage`, `data-page="setup"`): oben nur eine
      Überschrift („Aufbau · Rollen") und rechts drei kleine Knöpfe für
      Spielmenü, Verbindung und VR — **keine Reiter**; darunter ein Statuschip,
      die Tafel (fünf Zeilen, je Mensch/Bot/Aus und die drei Fähigkeitslampen,
      **ohne „Ich"**),
      dann **„Rollen testen"** (`[data-test-roles]`: auf die Karte, ohne dass
      etwas losgeht — **läuft im Raum schon eine Mission, heißt derselbe Knopf
      „Zur laufenden Runde"** (`[data-join]`): Wer die Seite mitten in der
      Runde neu lädt, landet hier im Aufbau, und der Weg zurück auf die Karte
      soll nicht „hell, ohne Uhr" versprechen; ein Start aus der Zentrale
      sagt dann `ROUND_RUNNING` gleich am Telefon, statt ihn an den Gastgeber
      zu schicken, der ihn nur sich selbst abwies) und **der Startknopf** (`[data-start-setup]`, beschriftet
      aus `startLabel`, darunter `describeSetup` — für den, der nicht erst
      testen will), zuletzt „Hilfe: Wer sieht was?" — ein Satz je Rolle aus
      `RoleFacts.sees`, und ein Absatz, was Test und Mission unterscheidet.
    - Die **Karte** (`data-page="live"`): erste Zeile **die Rollen als
      Reiter** (`writeBar`, `[data-me]`, gebaut aus `views/roleTabs.ts` —
      **dieselben Knöpfe im selben Panel wie im Kopf der 2D-Welt**,
      `.role-strip`) — Techniker, Rot, Gelb, Blau, Monster, _Zuschauer:
      Techniker_, _Zuschauer: Alles_, immer alle, in dieser Reihenfolge,
      zweizeilig (Platz, darunter klein, was er hält) und umbrechend statt
      scrollend — und am Ende **das Zahnrad** (`[data-options]`);
      zweite Zeile die Leiste mit Systemen, Anzug und Uhr (`writeQuest`),
      dieselbe wie beim Techniker in der 2D-Welt; darunter die Rolle aus der
      Registry. **Die Uhr läuft nur in der Mission**: Sonst steht dort
      „Test · keine Runde" (`[data-idle]`) oder „Runde vorbei" — eine Uhr, die
      vor dem Start herunterzählte, war der Befund („Aktuell zeigt er an
      ‚noch keine Runde', aber oben läuft der Timer"). Das **Zahnrad-Menü**
      (`writeMenu`, `.haunt__menu`) hat, was sich über der Karte ändert:
      **Mission starten** (`[data-start-setup]`, solange keine läuft) oder
      **Mission stoppen** (`[data-stop-round]` → `StationHost.stopRound`),
      **Zurück zu den Rollen** (`[data-setup]`: der Aufbau), und die drei
      Knöpfe der Seite (Menü, Verbindung, VR). `StationUi.goSetup()` holt den
      Aufbau von außen — die 2D-Welt ruft es, wenn sie mit „Zurück zu den
      Rollen" zugeht.
    - Weg sind: der Reiter _Aufbau_, das „Ich" der Tafel, die zweite Reihe
      Werkzeugknöpfe über der Karte, der Titel „ORBITAL / EINSATZZENTRALE",
      die Geräteliste `.lobby__seats`, das Segment 2D|3D, die
      Absichts-Kacheln und die Hilfe „Eure Dreiercrew". Die **Kopfzeile der
      Seite** (`index.html`, `#hud`) ist auf dem Telefon ausgeblendet
      (`haunting.css`, `body.haunt-on #hud`) — nur versteckt, nicht abgebaut:
      Die Knöpfe im Aufbau und im Zahnrad drücken ihre Knöpfe stellvertretend.
  - **Rollenwechsel über die Reiter**: Ein Tipp auf einen Platz **nimmt**
    ihn (`stationUi.choose`) — die Lobby merkt sich `me`, der Platz wird
    „Mensch", man sitzt an seiner Station, der alte Platz wird frei; der Name
    der Mischung seiner Fähigkeiten steht in `StationUi.roleLabel`
    (`seatTitle`). „Rollen testen" ist derselbe Tipp mit dem gemerkten Platz.
    **Der Reiter „Techniker" setzt an den Stock** (`StationHost.technician` →
    `HauntingWorld.takeStick`): Auf der Karte von oben öffnet sich sofort die
    2D-Welt — **im Test-Zustand** (unten) —, im Schiff wird man der
    Desktop-Techniker; die Brille rührt niemand an (`VR_KEEPS_TECHNICIAN`).
    **Läuft im Raum schon eine Mission, steigt der Reiter in sie ein**: Der
    Stand, den der Gastgeber ansagt (`adopt`), reist als `FlatResume` in die
    2D-Runde — derselbe Weg wie von 3D nach 2D —, und die Bücher (Riegel,
    Spuk, Wunde, Gedächtnis) kommen mit der Übergabe des alten Gastgebers
    nach (`flatResumed`, `takeFlatHandover` → `FlatRound.loadBooks`; das
    Lampenbudget führt weiter die Welt). Bis hierher machte der Reiter aus
    einer laufenden Mission einen frischen Test auf derselben Station, der
    als neuer Stand an alle ging — wer mitten in der Runde die Seite neu
    geladen hatte, konnte nicht zurück, sondern nur allen die Runde nehmen.
    Trägt schon jemand anders den Anzug, gibt es dieselbe Absage wie beim
    Öffnen (`FLAT_OCCUPIED`), bevor das Monster losgelassen wird.
    Mitten in der Mission entscheidet `switchRights`, ob das geht;
    wer nicht darf, bekommt den Grund als Meldung. **Gesperrt ist nur, wer im
    Schiff den Anzug trägt** (`inShip`: der Techniker am Bildschirm in der
    Ansicht 3D, `SHIP_KEEPS_ROLE`) — die Zentrale, das Monster am Telefon und
    der Techniker auf der Karte wechseln immer; bis hierher wechselte mitten
    in der Mission nur die Zentrale, und der Besitzer wollte es anders: „Wenn
    ich nicht VR oder 3D bin, will ich die Rollen immer wechseln können."
    Wer nichts hält, liest
    „Bitte wähle über den Tab oben deine Rolle aus." (`NO_ROLE_HINT`). Fernseher und Monster sind keine Fähigkeiten — wer dorthin geht, legt die
    Zentrale ab.
  - **Der Test-Zustand** — vor der Mission und nach dem Stopp
    (`FlatOptions.phase` `'briefing'`, `FlatRound.live`, in 3D
    `HauntState.phase === 'briefing'`): Der Techniker läuft in einer
    **hellen** Station herum (2D: jede Lampe steht in `lit`; 3D:
    `applyLights` behandelt `briefing` wie Testlicht), die Schalttafel
    schaltet Türen und Lampen — die **Türen mit denselben Fristen wie in der
    Mission** (`rules/doorLocks.ts`: ein Riegel, gehalten bis zum Ablauf, die
    nächste wartet, danach Abkühlung mit Balken und Blinken), die **Lampen
    ohne Budget** (`FlatRound.switchLight`, `HauntingWorld.flipLampPlain`)
    —, ein Mensch am Steuer darf das Monster
    bewegen (`FlatRound.driver`), aber die **Routine steht still**, niemand
    wird getroffen, kein Spuk, keine Uhr, und jeder darf jede Rolle
    (`RoleStripHost.rights`). Die Uhr des Standes (`time`) läuft trotzdem
    weiter — Wellen und Spuren hängen an ihr —, gezeigt wird sie nur in der
    Mission. **„Mission starten"** (Zahnrad auf dem Telefon, Tafel des
    Technikers oder der Knopf im Aufbau) baut die Runde **auf derselben
    Station** neu (`HauntingWorld.startMission`, `phase: 'running'`: Uhr null,
    Licht aus, Monster am anderen Ende); **„Mission stoppen"**
    (`HauntingWorld.stopRound`, `net.stopMessage`/`readStop` für den, der
    nicht rechnet) führt zurück in den Test.
    **Kein Bot auf einem Menschenplatz** (`shipStart` → `SHIP_NEEDS_TECHNICIAN`):
    Steht auf der Tafel „Techniker: Mensch" und niemand hat den Reiter
    genommen, läuft kein Techniker aus Zahlen, und die Mission startet nicht,
    bis jemand den Stock nimmt oder die Tafel den Platz einem Bot gibt; der
    Satz nennt beides. Der Schalter „Zuschauen"
    gibt den Stock dagegen ausdrücklich ab und schreibt dafür „Techniker:
    Bot" auf seine Tafel (`setWatching`).
  - **Brille** (`HauntingWorld.menu`): dieselben drei Absichten zuerst, dann
    „Zur Zentrale / Rolle wechseln", dann „Ansicht: 3D Schiff" (fest), dann die
    Einstellungen (Testlicht, Räume, die fünf Plätze `haunt:seat-<platz>`,
    das Untermenü _Fähigkeiten der Plätze_ `haunt:power-<platz>-<fähigkeit>`,
    Gegner).
  - **Techniker am Desktop** (`ShipExperience.paintDom`, `.orbital-player`):
    dieselben drei Absichten als Knöpfe (`data-action="intent:…"`), darunter
    `describeSetup`, dann Karte und Gegner. Das Panel sitzt oben links am
    oberen Rand (`--orbital-top`), unter dem Kompass, solange es ihn gibt
    (`.has-compass`, `--orbital-head`), und weicht dem offenen Weltmenü
    (`dom.hidden`). **Es ist so hoch wie sein Inhalt**: Bis hierher stand dort
    `bottom: 16px`, und der Kasten reichte auch mit drei Zeilen darin bis zum
    unteren Bildrand — auf dem Telefon lag die halbe Station hinter dunklem
    Glas. Jetzt begrenzt ihn `max-height` nach unten (`--orbital-gap`: 16 px,
    212 px über Stock und Knöpfen). **Und er lässt sich zuklappen**
    (`data-action="fold"`, `ShipExperience.folded`, `.is-folded`): Zu bleiben
    die Titelzeile — Anzug, Systeme, Sauerstoff — und die zwei Knöpfe, die
    wieder hinausführen; welche Klappen darin offen standen, merkt sich das
    Panel (`mainOpen`, `testsOpen`). Oben im Panel steht **⚙ Optionen**
    (`data-action="options"`, `ShipExperience.showOptions`) und klappt das
    Optionsmenü des Schiffs auf — nur im Browser, nie in der Brille. Wo es
    liegt, sagt `haunting.css` (`.flat.orbital-options`, `.flat__panel`,
    `.flat__note`; bis Paket H stand das in `map/flat.css`).
  - **Das Optionsmenü** (`map/optionsMenu.ts`): Was ein Optionsmenü _ist_ —
    Überschriften, Hinweise, Knöpfe mit `data-*`-Schlüssel (`OptionItem`) —
    und wie es gezeichnet wird (`renderOptions`, aus den Bausteinen `ui-head`
    und `ui-option` in `ui/widgets.ts`), steht einmal dort; die festen Namen
    in `SHARED` (`watchKey`, `soundKeys`, `leaveKeys`). Das Schiff
    (`ShipExperience.shipOptions`) baut daraus: Zuschauen an/aus (= Bot-Runde),
    in der Bot-Runde das Tempo, Aufmachen (Zentrale, Menü, Verbindung, **VR**),
    Ton, Runde verlassen, Weiterspielen. Menü, Verbindung und VR drücken die
    Knöpfe der ausgeblendeten Kopfzeile (`pressPageButton`) — seit sie im
    Schiff aus ist, ist dieses Menü der einzige Weg dorthin. Die losen Knöpfe
    „Rolle wechseln", „2D von oben" und „Missionsmenü" sind darin aufgegangen;
    „Ansicht: 2D ↔ 3D" (`switchViewKey`) ist mit der gemalten Karte gegangen.
- **Knöpfe und Panels sind Bausteine, keine Handarbeit** (`ui/dom.ts`,
  `ui/widgets.ts`, `ui/widgets.css`). Haunting hat viele davon — das
  Zahnrad-Menü der 2D-Welt, das der Zentrale, die Linse des Zuschauers, die
  Tafel der Verteilung, die Rollenreiter, die Raumakte, das Rätsel, die Tafel
  des Technikers im Schiff —, und lange baute jede Stelle ihren Knopf selbst:
  sechs Kopien derselben `el()`-Hilfe, fünfmal `strong` + `small` + `data-*`
  - `is-active` + `aria-pressed` von Hand, drei Toasts mit eigener Uhr, und im
    CSS derselbe Kasten fünfmal. Jetzt steht jedes davon **einmal**:
  * `ui/dom.ts`: `el(tag, klasse, text)` (immer `textContent`, nie
    `innerHTML` — hier gehen Spielernamen durch), `clickedKey(event)` (der
    `<button>` über dem Klickziel) und `setData(node, { watch: '' })`.
  * `ui/widgets.ts`: `key(klasse, spec)` — ein Knopf, entweder `{ text }` als
    eine Zeile oder `{ label, sub }` als Name groß und Zeile klein, dazu
    `data`, `active`, `pressed`, `disabled`, `title`, `ariaLabel`;
    `optionKey` (der Listenknopf `ui-option`, mit `tone: 'go' | 'leave'` für
    den grünen und den roten Rand) und `pillKey` (die Pille `ui-pill`);
    `captioned(caption, value)` / `labelled(label, sub)` für die Knöpfe unter
    dem Daumen (`monster__key`); `note(ton, titel, text)` (die
    Kachel `ui-note`, drei Töne), `fact(begriff, wert, { warn, valueClass })`
    (die Zeile `ui-fact`), `head(titel, beisage)` (die Überschrift `ui-head`)
    und `Toast` (`say(text, ton)`, `step(dt)`, leer unsichtbar).
  * `ui/widgets.css`: die **Form** — `ui-panel`, `ui-head`, `ui-option`,
    `ui-pill`, `ui-note`, `ui-fact`, `ui-toast`. Die **Lage** und der Ton einer
    Stelle stehen weiter in ihrem Blatt, als zweite Klasse neben der von hier
    (`ui-panel flat__panel`, `ui-toast monster__toast`); jedes dieser Blätter
    (`views.css`, `monster.css`, `haunting.css`) bindet
    `widgets.css` per `@import` **zuerst** ein, damit bei gleicher Spezifität
    die Zeile der Stelle gewinnt. Die Kachel nimmt in der Zentrale die Farben
    der Station über `var(--haunt-*, fallback)`.

  Die Regel daraus: Wer in Haunting einen Knopf, eine Kachel oder einen Kasten
  braucht, nimmt ihn von hier und gibt ihm seine Lage-Klasse mit — und legt
  keinen neuen `el()` und keinen neuen `.xy__option` an. Was im Test steht
  (`ui/widgets.test.ts`): die beiden Bauweisen des Knopfs, dass ohne Zeile kein
  leeres `small` entsteht, Schlüssel und Zustände, die Klassenlisten von
  `optionKey`/`pillKey`, die Reihenfolge von `captioned`/`labelled`, und dass
  der Toast nach `TOAST_SECONDS` Text **und** Ton wieder ablegt.

- **Jede Rolle meldet sich selbst an** (`registry/roles.ts`,
  `views/*.register.ts`, `monster/monster.register.ts`). `stations.ts` ist
  seither nur noch die **Sitzordnung** — welche Stühle es gibt, wem einer
  gehört, wie lange der Weg zum nächsten dauert; Name, Zeile und „Sieht:"
  stehen bei der Rolle. `stationUi.ts` zeichnet nur den Rahmen (Kopfzeile,
  Auftragsstreifen, Geräteübersicht) und hängt die Ansicht aus der Registry
  darunter; ein `if (station === …)` je Rolle gibt es dort nicht mehr. Eine
  neue Rolle braucht **keine Zeile** in `stationUi.ts`, `stations.ts` oder
  einer Union — nur eine eigene Datei.
- **Die drei Nicht-VR-Rollen sind Karten** (`views/`), dieselbe `MapView`
  (`map/mapView.ts`), jede mit eigenen Schichten. Was eine Rolle
  **nicht** sieht, steht deshalb nicht in einem Kommentar, sondern in ihren
  Layern — mit Test:
  - **Archiv** (`views/archiveRole.ts`): die ganze Station mit Fracht,
    Konsolen und Möbeln, `entities: false` — und `lights: false`: Ob es
    irgendwo hell ist, sieht der Techniker selbst. **Was er wann sehen darf,
    rechnet `rules/archiveGoals.ts`**: die **Kiste immer**, mit dem Namen des
    Teils daran; das **Ziel erst, wenn der Techniker das Teil trägt** — dann,
    und nur dann, gibt es die gestrichelte Linie, das „hierher" an der Konsole
    und den Freigabecode in der Akte; ein **abgelegtes Teil** erst nach
    `DROPPED_SEEN` = 5 s (`HauntState.dropped`). Vorher zog die Karte von
    jeder Kiste eine Linie zu ihrer Konsole, und der Archivar sagte die ganze
    Runde in einem Satz an. Ein Tipp auf ein Zimmer schlägt die **Raumakte**
    auf — **ganzseitig, ohne Karte dahinter** (`is-sheet`, „Karte" bringt sie
    zurück), und sie rollt: Codes groß, Fundhinweis, Türen — dazu ein Bild des
    Raums. In 3D ist das ein **Loch**, in das `HauntingWorld.render` die
    Draufsicht der wirklichen Welt zeichnet, mit Zoom und Wisch
    (`views/archiveDesk.ts` über `RoleHost.extra`, `archiveView.ts` für die
    Anschläge). Die Missionsliste ist
    weg: Sie zählte auf, was die Karte zeigt.
  - **Schalttafel** (`views/panelRole.ts`, Kennung `hack`): der Grundriss
    ohne Wesen. **Tür antippen** sperrt oder gibt frei, **Lampe antippen**
    schaltet Licht — die Lampe ist ein Kreis in der Zimmermitte, gelb
    ausgefüllt, wenn sie brennt, sonst ein grauer Ring (`map/mapView.ts`,
    mindestens fünf Punkte Radius, damit der Daumen ihn trifft). Einen
    Schallköder gibt es nicht mehr. **Und keine Schalterliste mehr**: Das
    Blatt „Tafel" mit den Kippschaltern ist gestrichen — der Besitzer wollte
    es nicht („diese Ansicht direkt löschen"); wer die Fähigkeit hat, tippt
    direkt auf die Karte. Was die Liste sagte, sagt jetzt der Tipp: Ein
    **abkühlendes Schott** antwortet „Der Riegel ist noch warm."
    (`rules/doorLocks.ts`, `LOCK_COOLDOWN` = 40 s), und wofür es keinen
    Schalter gibt, sagt die Ansicht ebenfalls. Geschaltet wird weiterhin über
    die Tafel aus `panel.ts` (`HauntingWorld.panelSwitch` sucht den Schalter
    mit diesem Ziel; die Liste gibt der Wirt über `RoleHost.switches`) — **und
    die Tafel ist vollständig**: Jede Tür und jede Lampe hat ihren Schalter
    von Anfang an. Die Hälfte lag lange hinter dem Sicherungskasten
    (`hideHalf`, `visibleSwitches`, `HauntState.fuse`); in der 2D-Welt legte
    ihn nie jemand um, im Schiff erst die erste Reparatur, und wer die
    Fähigkeit hielt, bekam für das Licht im Upper Engine oder das Schott zum
    Reaktor-Ostgang „dafür gibt es keinen Schalter". Der Besitzer nannte das
    einen Fehler, und die Verzahnung ist weg: Knapp halten die Tafel jetzt
    Riegel und Lampenbudget, nicht eine fehlende Hälfte. `HauntState.fuse`
    bleibt im Protokoll stehen (die Sicherung ist weiter ein Gegenstand auf
    der Karte), nur hängt kein Schalter mehr daran.
  - **Späher** (`views/scoutRole.ts`): alle `PING_PERIOD` = 3,5 s **eine
    Peilung** — ein grüner Punkt für den Techniker, ein roter für das Monster,
    genau dort, wo sie in dem Moment waren. Dazwischen verblassen sie und
    **wandern nicht mit**: Ein interpolierter Punkt wäre eine Verfolgung, und
    damit wäre Verstecken kein Mittel mehr, sondern ein Umweg. Der alte
    Radarschirm mit dem laufenden Punkt ist genau deshalb weg.
    Der **Zuschauer** (`views/watchRole.ts`) ist die einzige Rolle ohne eigene
    Karte: `surface: '3d'`, sein Bild ist das Puppenhaus aus der 3D-Welt. Über
    seine **Linse** (`watchLens.ts`) schlüpft er in jede andere Rolle — Deck,
    Archiv, Schalttafel, Späher, Monster (keine Drohne) —, und zwar in **deren**
    angemeldete Ansicht, nicht in einen Nachbau: Er schlägt sie aus der Registry
    auf, mit einem Wirt, dessen `door`
    und `light` `''` zurückgeben und nichts tun. Dazu „wem folgen?" (Techniker /
    Monster / frei, nur über dem Deck) und **KI-Absichten** an/aus — das Overlay
    aus Paket M4, das es nur hier gibt (`HauntingWorld.insightWanted` fragt
    `StationUi.watchLens`). `StationUi.shownStation` sagt der Welt, welche
    Kamera sie ausrichten soll.
- **Die Reiter der Rollen** (`views/roleTabs.ts`, `views/roleStrip.ts`)
  bleiben der Kopf über der Karte des Telefons: sieben Reiter, gelb umrandet,
  wer man ist; **gewechselt wird immer** (`RoleStripHost.rights` →
  `switchRights`: gesperrt ist nur, wer im Schiff den Anzug trägt — der
  Techniker am Bildschirm mitten in der Mission, `inShip`). Der Streifen über
  der gemalten 2D-Szene ist mit ihr gegangen.
- **Die Drohne ist gestrichen** — Rolle, Ansicht, Körper, Kamera, Flug,
  Netznachricht (`kind: 'drone'`) und CSS. Übrig geblieben sind die
  **Wegtypen**: `droneRoute.ts` heißt heute `navmesh/route.ts` (Paket `nav`)
  und trägt `RoutePose`/`RoutePath` samt `stepAlong` für den Modelltechniker
  und das Monster. Was nur sie hatte — Flughöhe, Öffnungswinkel, Lampenladung,
  Wechselsperre, `DRONE_PROFILE` —, ist weg.
- Stationen: Archiv, Schalttafel (`hack`), Späher (`scout`), Zuschauer
  — und **Monster** (`stations.ts`, `monster/`): ein Telefon spielt das
  Monster, während der Techniker im Schiff spielt. Die Ansicht
  ist `monster/monsterView.ts` (Karte aus Monstersicht, Stock, **ein** Knopf);
  das Telefon schickt `{kind:'monster'}` (Stock, Zähler für Interagieren,
  Klappenziel; das Feld `attack` steht nur noch für alte Gastgeber im
  Protokoll) zehnmal je Sekunde an den Gastgeber
  (`monster/netMonsterPort.ts`), der sie über `monster/netMonsterControl.ts`
  als `MonsterDriver` in derselben `decide`-Form wie die Routine ausführt —
  in 3D über `HauntingWorld.monsterDriver` (der NPC läuft dann geradeaus auf
  das Ziel, kein Rasterweg je Bild), in 2D als `FlatRound.driver`. Zähler
  statt Tastenzustände, damit bei 10 Hz kein Druck verloren geht oder doppelt
  wirkt; das erste Paket ist nur Abgleich, ausstehende Drücke ≤ 3; ohne
  Nachricht seit 3 s übernimmt die KI. Die gemeinsame Übersetzung von Stock
  und Knopf liegt in `monster/monsterHelm.ts`.
  **Zuschlagen ist kein Knopf.** Wer in Reichweite steht, wird getroffen — von
  der KI wie von einem Spieler am Steuer (`FlatRound.tick`, `CONTACT`). Der
  Knopf davor verlangte, im Moment der Berührung zu tippen, und in diesem
  Moment schaut niemand auf seine Knöpfe. **Der eine verbliebene Knopf gilt
  immer dem nächsten Ding** (`monsterHelm.nearestTarget`): Klappe, Kabine oder
  gesperrte Tür, nur eines auf einmal — und genau dieses hebt die Karte als
  pulsierenden Ring hervor (`MapViewOptions.highlight`), damit man weiß, was
  der Knopf tut, bevor man ihn drückt. Kabinen darf das Monster überall
  aufreißen, nicht nur die, in der der Techniker steckt.
  Sichtbarer Header für Rollenwechsel; keine Navigation über die FPS-Anzeige.
- Archiv hat **Räume & Codes** und **Aufträge** — und **zwei Ebenen statt zwei
  Größen**: oben die _Karte_ (die Draufsicht des aufgeschlagenen Zimmers als
  Kachel, darunter die Räume zum Antippen und die Liste „Gesucht"), und ein
  Tipp auf einen Raum **ersetzt** die Karte durch dessen Akte, ganzseitig, mit
  einem Knopf zurück. Vorher lag die Akte als Überbau über einem Vollbild —
  und unter `.is-view` ist der Überbau ausgeblendet, bis der Menüknopf ihn
  holt, den der Archivar nicht hat: Er saß vor einem Grundriss **ohne
  Rollbalken** (Befund des Besitzers). Die Kachel hängt jetzt an `.is-chart`,
  `viewport()` gibt es **nur auf der Karte**, `headroom()`=0.
  Ein Raum zeigt echte orthografische 3D-Geometrie ohne Decke als 2D-Draufsicht,
  dazu Sci-Fi-Farbton, Codes, Fundorte und Reparaturhinweise — **aber keine
  Lampen**: Die Deckenscheiben liegen knapp unter der Schnittebene und werden
  für den Archivar ausgeblendet (`HauntingWorld`, `lamps`), denn ob es hell
  ist, sieht der Techniker selbst. **Das Blatt
  führt alle Kisten des Raums** mit Kennzeichen und Wand (`CargoSlot.clue`),
  die richtige als „Fundort" markiert — den Inhalt der anderen nennt es
  nicht, sonst hätte das Suchen kein Risiko mehr.
  **Was er wann weiß, ist eine Regel** (`rules/archiveGoals.ts`,
  `archiveGoals(spec, state)`): Die **Kiste** steht von der ersten Sekunde an
  auf dem Blatt, die **Konsole** — Raum, Reparaturhinweis, Freigabecode —
  **erst, wenn der Techniker das Teil in der Hand hat**. So gibt es zweimal
  etwas zu funken statt einmal, und das zweite Mal ist genau der Moment, in
  dem der Techniker fragt. Im Reiter **Aufträge** steht
  der Fundort in einer Zeile (Raum · Kennzeichen · Wand): Sitzt hier ein
  Mensch, sieht der Techniker nur den Raum leuchten (`goalPrecision`), und
  diese Zeile ist das, was er ansagen muss. Das Kennzeichen ist auch in der
  Draufsicht zu sehen — Farbband und Nummer stehen am Modell selbst.
  **Ein abgelegtes Ersatzteil meldet das Blatt erst nach `DROPPED_SEEN` = 5 s**
  (`HauntState.dropped`) — wer es im Vorbeigehen umgreift, hat es nicht
  verloren; wer es stehen lässt, schon.
  **Keine Gesamtkarte, keine Live-Kreaturen und kein Journal.**
  Masken grenzen Nachbarräume aus.
  `archiveMap.ts` bleibt ein unbenutztes Altmodul und darf nicht wieder in die
  Archiv-UI eingebaut werden.
- Kontrolle hat **Radar & Anzug** und **Schalttafel**; Radar berücksichtigt
  die echten Stationsbounds/Gänge. DOM/Canvas aktualisiert gedrosselt.
  **Die Tafel kennt zwei Sorten Schalter: Licht und Schott** (`panel.ts`). Die
  dritte — **Schallköder**, ein Radio je zwei Zimmer, das das Monster anlockte
  — ist weg, samt `HauntState.loud` und allem, was es las. Sie war der einzige
  direkte Griff der Tafel an das Monster und genau deshalb falsch: Wer den
  richtigen Knopf gefunden hatte, parkte das Vieh in einer Ecke, und der Rest
  der Runde fand ohne es statt. `STATION_PROTOCOL` bleibt trotzdem **8** — ein
  altes Gerät, das `loud` noch mitschickt, wird gelesen wie eines, das es
  weglässt: Der Leser kennt das Feld nicht mehr, und keine Regel hängt daran.
  **Die Schalter sind doppelt so groß** (`views/views.css`, `.role__switch*`):
  eine ganze Zeile je Schalter statt zwei Spalten, ≥ 64 px hoch, Kippschalter
  58 × 32 px — das Maß ist ein hochkant gehaltenes Telefon und ein Daumen, der
  im Dunkeln nicht den Nachbarn treffen soll. Die Regeln stehen bei der Rolle
  (`views/`) und nicht mehr im Telefon-Rahmen (`stationDashboard.css`): Die
  Tafel läuft auch über der 2D-Welt, wo es keine Einsatzzentrale gibt.
- **Der Zuschauer ist ein Platz und kein Fenster mehr** (`watchLens.ts`,
  `views/watchRole.ts`). Er war das ganze Deck von schräg oben und sonst
  nichts; jetzt stehen dort zwei Fragen und ein Schalter:
  - **Wessen Platz?** — Deck, Archiv, Schalttafel, Späher, Monster (die
    **Drohne ist gestrichen**). Gewechselt wird **mitten in der Runde**, und
    gewechselt wird nur das _Bild_: `StationUi.shownStation` sagt der Welt,
    welche Kamera das Fenster füllt (`HauntingWorld.render`), der Platz bleibt
    `watch`. Gezeigt wird dabei **die angemeldete Ansicht dieser Rolle** aus
    der Registry und kein Nachbau — es gibt keine zweite Schalterliste und kein
    zweites Archivblatt, die auseinanderlaufen könnten. Bedienbar ist davon
    nichts: Der Wirt, den sie bekommt, gibt auf `door` und `light` `''`
    zurück, und das Steuer des Monsters bleibt `null` — ein Stock, der nichts
    bewegt, ist eine Zusage, die das Spiel nicht einhält. Wie viel von der
    Linse über dem fremden Bild liegt, entscheidet der Knopf „Blick" oben
    rechts.
  - **Wem folgen?** — Frei, Techniker, Monster (`aimShow`,
    `WATCH_FOLLOW_SPAN` = 9 m). „Frei" ist das ganze Deck wie bisher; sonst
    zieht die Kamera weich nach (`showFocus`, `lerp` 0,18), weil der Stand nur
    zehnmal je Sekunde ankommt.
  - **Fliegen und Zoomen** (`WatchLens.zoom`, `WatchLens.pan`, `zoomedLens`,
    `pannedLens`, `homedLens`): Über dem Deck fliegt der **Stock** links
    unten (`map/joystick.ts`, `FLY_SPEED` = 14 m/s bei Zoom 1, herangezoomt
    langsamer) oder **ein Finger** auf dem Loch, **zwei Finger** und das
    **Mausrad** zoomen (`ZOOM_MIN` 1 = das ganze Deck bis `ZOOM_MAX` 8 = ein
    Zimmer), „Zurück über das Deck" vergisst beides. Wer jemandem folgt,
    fliegt neben ihm her und bleibt an ihm hängen. Die Gesten liegen auf dem
    Loch (`role__hole`), die Knöpfe daneben behalten ihre Klicks.
  - **Durch seine Augen** (`WatchLens.eyes`, `throughEyes`,
    `HauntingWorld.technicianEyes`): das Live-Bild des Technikers, dem man
    folgt — die Kamera steht in seinem Kopf. Drei Quellen wie bei
    `technicianFocus`: die Brille schickt ihre ganze Kopfpose
    (`PeerPose.head`, Ort **und** Drehung), Modelltechniker und 2D-Techniker
    nur Ort und Gierwinkel (Augenhöhe `EYES_HEIGHT` 1,6 m, geradeaus). Dabei
    bleibt die Decke dran, der Nebel an und das Tageslicht des Puppenhauses
    aus — man sieht, was er sieht (`EYES_FOV` 78°). „Zuschauer: Einzeln"
    fängt damit an (`stationUi`: `{ follow: 'technician', eyes: true }`),
    „Zuschauer: Alles" frei über dem Deck.
  - **KI-Absichten** — das Overlay aus M4, siehe oben. Nur hier, nie für einen
    Spieler.
    **Der Techniker aus der 2D-Welt bekommt dabei einen Körper**
    (`HauntingWorld.showTechnician`, `shipArt.buildCrewmate`): Seine Pose steht
    seit Protokoll 7 im Stand (`HauntState.technician`), gezeichnet wurde sie in
    3D nie — am Fernseher sah man eine leere Station, in der Türen von selbst
    aufgingen. Er steht dort, wo der Stand ihn hinsetzt, läuft die
    Schrittanimation nur bei `moving` und verschwindet im Schutzschrank und im
    Schacht.
- **STATION_PROTOCOL=8**: der Stand trägt jetzt die zerstörten Kabinen
  (`destroyed`, seit 6), die Fahrtphase des Monsters (`ride`) und den
  2D-Techniker (`technician`, seit 7); dazu die Nachricht `monster`. **Seit 8
  auch die Ghost-Marker** (`ghosts`, `rules/ghosts.ts`): wo jede Seite die
  andere zuletzt gesehen hat — Stelle, Blick und Zeitpunkt, gesetzt beim
  Sichtkontakt und danach stehenbleibend, bis der nächste ihn versetzt. Sie
  stehen im Stand und nicht bei dem, der gerade hinsieht, weil jedes Gerät sie
  braucht: der Techniker den des Monsters, das Monster-Telefon den des
  Technikers, der Zuschauer beide. Ein Stand ohne `ghosts` wird als „noch
  niemand hat jemanden gesehen" gelesen, nicht als Fehler; die Deckkraft
  rechnet für alle Darstellungen dieselbe Formel (`ghostAlpha`, voll bis
  `GHOST_TTL` − `GHOST_FADE`, dann linear aus, ab `GHOST_TTL` = **10 s** weg —
  es waren einmal 25, und das war ungefähr die Zeit, in der jemand die halbe
  Station durchquert: Der Punkt zeigte einen Gegner an einer Stelle, an der
  schon zwei Zimmer lang keiner mehr war, und man gewöhnte sich an, ihm zu
  glauben). **Gezeichnet wird er über der Dunkelheit**, nicht darunter: Eine
  Erinnerung steht im Kopf dessen, der hinsieht, und der weiß auch im Finstern
  noch, wo der andere zuletzt stand — vorher lag sie unter dem Dunkelfeld und
  war genau dann unsichtbar, wenn sie gebraucht wurde.
  **Die Blutspur reist als optionales Feld mit** (`blood`, `rules/blood.ts`) —
  **ohne** Versionssprung, und das ist eine Entscheidung und kein Versehen: Die
  Version steigt für ein Feld, von dem die Gegenseite _abhängt_. Bei `ghosts`
  war das so; an der Blutspur hängt beim Empfänger **keine Regel**. Der
  Gastgeber sucht die Fährte in seiner eigenen Spur und entscheidet daraus das
  Verhalten des Monsters, alle anderen **malen** sie nur. Ein Gerät der
  Version 8 ohne das Feld sieht keine Tropfen und spielt ansonsten dieselbe
  Runde — ein fehlendes Bild, kein Auseinanderlaufen. Über die Leitung gehen
  nur Ort und Zeit je Tropfen, höchstens `DROP_LIMIT` 48 Stück.
  Alte Clients werden abgewiesen; nach Update **alle Geräte neu laden** —
  ein Telefon der Version 7 sieht sonst gar nichts mehr.
  **Die Übergabe beim Gastgeberwechsel hat die Version nicht bewegt**
  (`net.handoverMessage`, siehe „Spielhost"): Sie ist eine eigene
  Nachrichtensorte und kein Feld im Stand — ein Gerät, das sie nicht kennt,
  liest sie schlicht nicht und erbt wie bisher eine Runde ohne Buchführung.
  Das ist eine fehlende Erinnerung, kein Auseinanderlaufen.
  **`dropped` kam ohne Sprung dazu** (`rules/archiveGoals.DroppedPart`): die
  Ersatzteile, die im Gang liegen, je mit Ort und Zeitpunkt. Ein Stand ohne
  das Feld heißt „es liegt nichts" — das ist die Wahrheit, die ein älteres
  Gerät ohnehin annimmt, und kein Grund, es auszusperren. Die Schwelle
  (`DROPPED_SEEN`) rechnet jedes Gerät selbst aus `state.time`, damit alle zur
  selben Sekunde zum selben Schluss kommen.
  Nur Host-Snapshots übernehmen, endliche begrenzte Werte validieren.
  Schalter nur vom Besitzer der Schalttafel, Monstersteuer nur vom Besitzer
  der Monster-Station. **Die Tafel und der Start dagegen von jedem im Raum**
  (`setup`, `start` — `net.readSetupMessage`, `net.readStart`; beide gehen
  durch `rules/roundSetup.readSetup`, denselben Leser wie der
  Browser-Speicher): Wer in der Lobby sitzt, darf die Verteilung stellen und
  die Runde anwerfen, das ist der Sinn der Lobby. Der Gastgeber wendet an, und
  sein Stand trägt die Tafel als optionales Feld `setup` zurück
  (`stateMessage(state, setup)`, `readSharedSetup`) — ohne Protokollsprung,
  denn wer das Feld nicht kennt, behält seine eigene Tafel wie bisher.
  **Später dazukommen geht immer**: Der Gastgeber sagt den ganzen Stand
  viermal je Sekunde an alle, ein neues Gerät baut daraus Haus, Runde und
  jetzt auch die Tafel und nimmt sich über die Reiter einen freien Platz
  (`switchRights`: aus der Zentrale heraus jederzeit, den Techniker in der
  Brille nie). Eine Brille, die später dazukommt, wird Gastgeber und bekommt
  die Übergabe (`handover`).
- **Spielhost: Gastgeber ist, wer Techniker ist** (`net.pickGameHost`) — in der
  Brille, am Desktop oder auf der Karte von oben, das ist dieselbe Rolle in drei
  Ansichten; unter mehreren Technikern entscheidet die Standzeit, ohne jeden
  Techniker der älteste Peer. Die Regel hieß lange „VR-Techniker", weil es ihn
  nur dort gab; seit er die Ansicht **mitten in der Runde** wechseln darf, wäre
  ein Gastgeber, der an der Ansicht hängt, einer, der beim Umschalten wegfällt.
  Desktop-Techniker meldet sich im Haunt-Channel.
  **Wechselt der Techniker, wird übergeben** (`net.handoverMessage`,
  `HauntingWorld.handOver` / `takeHandover`): Der alte Gastgeber schickt dem
  neuen — an ihn gerichtet, `to` — den ganzen Stand **und die Buchführung, die
  sonst nie auf der Leitung liegt** (`HauntBooks`: `DoorLocks`, `Lamps`, Spuk,
  die offene Wunde aus `rules/blood.ts` und das Gedächtnis des Monsters als
  kompaktes `MonsterBook` — die letzten Sichtungen und die abgesuchten Räume,
  nachgespielt über `loadMemory`, nicht in die Innereien geschrieben). Eine
  **eigene** Nachricht und kein größeres `state`: Sie geht einmal beim Wechsel
  und nicht viermal je Sekunde an alle. Der neue Gastgeber rechnet
  `HANDOVER_WAIT` = 2 s lang **nicht**, bis sie da ist (`waitingHandover`) —
  sonst rechnen für einen Augenblick beide —, und ein Stand mit **älterer Zeit**
  als der eigene wird verworfen (`stale`: gleicher Seed, beide `running`).
  Bleibt die Übergabe aus (zugeklappter Laptop), läuft die Runde nach der Frist
  trotzdem weiter. **`STATION_PROTOCOL` bleibt 8**: `handover` ist eine neue
  Nachrichtensorte, die ein älteres Gerät schlicht nicht liest — es erbt dann
  wie bisher eine Runde ohne Buchführung, läuft aber nicht auseinander.
  `?net=local` ist BroadcastChannel zwischen Tabs; WLAN/
  Internet verwenden öffentliche Signalisierung/STUN, kein garantierter TURN.
- **Die Ansicht wechselt der Kern, mitten in der Runde** — _Menü →
  Ansicht_, ohne dass diese Welt etwas tut: Der Stand ist ein Datenobjekt
  (`HauntState`), der Kern rechnet weiter, nur die Kamera ist eine andere
  (`core/TopDownCamera.ts` über dem Gestell, `KernelLocomotion` fängt den
  Wunsch aus `FlatControls` genauso ab wie den aus der Brille). Bis Paket H
  war das `HauntingWorld.switchView('2d' | '3d')` mit `enterFlat`/`leaveFlat`
  — die 2D-Runde wurde aus dem laufenden Stand aufgebaut (`FlatResume`), die
  Bücher (`HauntBooks`) gingen als Abschrift hinüber und zurück; dieselbe
  Naht (`books`, `loadBooks`, `FlatRound` mit `resume`) ist heute die der
  **Übergabe** zwischen Gastgebern und wird als solche geprüft
  (`HauntingWorld.replay.test.ts`, „Die Bücher zwischen Welt und Runde").
  `rules/lobby.viewSwap` ist weg.

**Budget und Prüfung**

- Raumweise Batches, zwei Raumlichter, drei wiederverwendete Effekt-Emitter
  mit maximal48Partikeln und acht Audio-Kanäle begrenzen den Aufwand.
  Haunting-Web-DPR≤1,25, Telefon-3D≤15Hz. FrameStats misst JS/Frames/DrawCalls,
  keinen GPU-Timer. Spiegel rendert nur in Reichweite und Blickrichtung.
  **Die Türen gehen mit ihren Räumen** (`ShipExperience.setVisibleRooms`,
  `Door.rooms`): Eine Tür ist ein Dutzend eigener Zeichenaufrufe — Gehäuse,
  zwei Blätter mit Griffen, zwei Tafeln —, und gut zwei Dutzend davon wurden
  bisher in jedem Bild gezeichnet, auch die hinter drei Wänden; sie tragen
  kein `userData.roomId` wie ein Schrank, weil sie zu zwei Räumen gehören, und
  stehen, solange einer der beiden steht (die Übungsdeck-Türen immer). Die
  Deckenleuchte des Übungsdecks (`bayLight`) ist außerhalb der Lehrzimmer
  unsichtbar statt nur auf null — eine unsichtbare Lampe kostet keinen
  Bildpunkt (siehe „Die Brille rechnet kleiner"). Und das Desktop-Panel wird
  in der Brille nicht mehr achtmal je Sekunde durchgerechnet
  (`ShipExperience.paintDom`, `dom.hidden`): Wer es nicht sieht, malt es nicht.
  **Was noch keiner gemessen hat:** eine Bildrate auf einer Quest. Die Zeile
  dafür steht jetzt im Grafik-Menü; die nächsten Kandidaten, wenn sie nicht
  reicht, stehen im Code: `Pointer.castAll` wirft je Hand und Bild einen
  Strahl auf jedes angemeldete Ziel (Tafeln, Kisten, Konsolen — gut hundert),
  `ShipExperience.mesh` baut je Klotz ein eigenes Material, und die Schilder
  sind je eines eine 768 px breite Leinwand.
  `stationLighting` erlaubt im normalen eingeschalteten Deck `ambient=0.28`,
  stromlos und im dunklen Test `0`. Heller Test (`0.78`) und Simulation (`0.55`)
  haben eigene Werte; Trainingsräume verwenden lokale Beleuchtung.
- Generator-/Platzierungs-/Route-Tests prüfen viele Seeds und Raumzahlen,
  maßhaltige Modelle, Türfreiheit, Kurven, Schachtwände und sichere Spawns.
  Ganze Botrunden werden auch gegen tatsächliche automatische Türen getestet.
  XR-Zeiger-Tests prüfen Schutz-Ausgang und Tod-Neustart mit ControllerState.
- `npm run test:browser` startet echte Chromium-/Firefox-Smokes gegen einen
  laufenden Vite- oder Previewserver. Standard sind **sichtbare Fenster** und
  normale Browsergrafik; kein SwiftShader-Zwang. Optionen: `--browser=chromium`
  oder `--browser=firefox`, `--loops=3`, `--bot-seconds=120`,
  `--url=http://127.0.0.1:5173/`, `--output=.artifacts/browser-smoke/review`.
  `--headless` nur bei Bedarf (in CI automatisch), `--software` als ausdrücklicher
  Chromium-Fallback. Diese Läufe nicht als native Leistungsmessung ausgeben.
  Browser einmalig via `npm run test:browser:install` installieren; Playwright
  und Browserrevision müssen zusammenpassen.
- **Am Ende jedes Lauf steht die Eingabeseite** (`result.inputsPage`), und sie
  ist der einzige Schritt, der sein Gerät mitbringt: `navigator.getGamepads`
  wird vor dem Laden ersetzt — ein DualSense mit drei gedrückten Knöpfen —,
  denn Playwright kann kein Pad vortäuschen, und im Container steckt keines.
  Geprüft wird dabei nicht die Rechnung (die prüft Jest), sondern die
  Verdrahtung: dass die Kennung erkannt wird, dass `gamepad.buttons[10]` im
  Panel steht, dass im Bild genau die drei gedrückten Stellen leuchten und der
  Stickknopf mit der Achse wandert. Der Vollbildknopf wird an seiner Zusage
  geprüft und nicht an diesem Browser: Er ist genau dann da, wenn
  `document.fullscreenEnabled` gilt — ein „er ist sichtbar" wäre eine
  Behauptung über Chromium, die in einer Einbettung grundlos rot würde.
  Danach läuft **der Fall des Backbones** durch: Die Karte wird so gestellt,
  dass `buttons[1]` unten sitzt, und geprüft wird, dass daraufhin die
  leuchtende Stelle im Bild **und** die Zeile _Benutzen_ umschwenken — die
  ganze Kette von der Einstellung bis zu dem, was das Spiel daraus macht. Zum
  Schluss _Alles auf Standard_, und der Speicher muss wieder leer sein: Eine
  Einstellung ohne Rückweg ist eine Falle, und ein Test, der seinen Zustand
  liegen lässt, vergiftet den nächsten Durchlauf.
- CI verwendet `--no-screenshots`: Alle Funktionsprüfungen bleiben aktiv,
  aber weder Pflicht- noch Fehlerbilder werden aufgenommen. Der JSON-Report
  bleibt das CI-Artefakt; `screenshots: false`, `screenshot: null` und
  `captureMode: 'disabled'` machen den Modus ausdrücklich erkennbar.
  Lokale Läufe nehmen ohne dieses Flag weiterhin Screenshots auf.
- Browser-Smoke-Screenshots pausieren nur für die Aufnahme die WebGL-
  Animationsschleife und setzen sie in `finally` fort. So kann SwiftShader
  ein frisches Einzelbild abarbeiten, ohne ständig neue Frames zu erhalten. Bewegung
  und Frame-Samples laufen danach regulär weiter. Pflicht-Screenshots bleiben
  harte Fehler (30s); das Fehlerbild hat 10s Budget. Reports nennen den aktiven
  Schritt, die Aufnahmedauer und Fehler beim zusätzlichen Diagnosebild.
  Bewegungsprüfungen warten bei niedriger Software-Framerate bis zu 90s auf
  echte >0,5m Bewegung beider Akteure; die Distanzanforderung bleibt erhalten.
  (Einen Freiflug gibt es seit Paket H nicht mehr; ein Smoke, der ihn prüft,
  ist zu streichen.)
- `.artifacts/browser-smoke` enthält Screenshots und JSON-Reports. Entscheidend
  sind `passed`/`failure`, nicht das Vorhandensein von Bildern. `botStart`/
  `botEnd` erfassen Positionsänderung und Reparaturstand, `botText` das Protokoll;
  bei mindestens zehn Beobachtungssekunden werden >0,5m Bewegung gefordert.
  `webgl` enthält Kontext/Renderer/Gerät; `frameTiming` erfasst rAF-Abstände
  (Dauer, Frames, mittlere FPS und p95), keine GPU-Zeit und keine Quest-Framerate.
  Während Vergleichsläufen keine HMR-Edits oder parallelen schweren Tests.
  Der lokale Mac-Browserlauf ersetzt keine Quest-/Mehrgeräteabnahme; Details
  und jeweils belegte Ergebnisse stehen in `docs/orbital-qa.md`.
- `.github/workflows/browser.yml` baut bei main-Push/PR/manuellem Start einen
  Produktions-Preview und prüft ihn mit Chromium (`--software`, in CI headless).
  Das Artefakt **orbital-browser-review** enthält den JSON-Report auch bei
  Fehlern, Aufbewahrung 14 Tage. Kein nativer Leistungsbenchmark.
- Die lokale Generation `acceptance/` hat vier erfolgreiche Produktions-Smokes
  (zweimal Chromium, zweimal Firefox), jeweils ohne Browser-/Konsolenfehler oder
  Kontextverlust. E-Lampenaufnahme nutzt nach Debug-Positionierung echte Eingabe;
  der Verlustzustand wird gezielt gesetzt, der Neustart dann per UI geprüft.
  Botbewegung ist belegt; die kurze Browserbeobachtung ist kein Missionssieg.
  Drei geprüfte Screenshots ohne Personen-/Kontodaten liegen in `docs/orbital/`.
  Frame-Samples auf dem Mac unter paralleler Jest-Last nicht als Quest- oder
  isolierte FPS-Abnahme darstellen. Finale Zahlen: `docs/orbital-qa.md`.
- Typecheck, ESLint, Prettier, gesamte Tests und Produktionsbuild vor Push.
  Aktuelle Ergebnisse und verbleibende Hardwaretests: `docs/orbital-qa.md`.
  Keine Produktionsreife oder Quest-Framerate ohne echte Hardwaremessung
  behaupten; P2P und Haptik benötigen physische Geräte.
