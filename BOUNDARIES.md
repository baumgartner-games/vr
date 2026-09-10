# BOUNDARIES — Eigentumskarte für die parallelen Haunting-Pakete

Fünf Pakete arbeiten gleichzeitig in eigenen Worktrees an Haunting. Diese
Datei sagt, **welcher Pfad wem gehört**. Sie ist Vertrag, nicht Vorschlag:
Wer außerhalb seines Abschnitts schreibt, tut das mit der kleinsten möglichen
Änderung, ohne Refactor, und mit einem Eintrag in `HANDOVER.md`.

Stand: Phase 0 des Pakets **2D-Kern + Sichtbarkeit**, Branch `feat/map-contract`.
Alle anderen Pakete zweigen von diesem Commit ab.

## Drei Regeln

1. **Neuer Code landet in neuen, paketeigenen Verzeichnissen.** Nicht in
   `HauntingWorld.ts`, nicht in `stationUi.ts`, nicht in `ShipExperience.ts`.
   Diese Sammeldateien sind für alle Pakete **Grenzfall** (siehe unten): Wer
   dort etwas braucht, schreibt die kleinste Andockzeile und sonst nichts.
2. **Zentrale Listen sind Registries, keine Enums.** Rollen, Ansichtsmodi und
   Assets meldet jedes Paket in einer **eigenen Datei** `<name>.register.ts`
   an (`src/worlds/haunting/registry/`). `registry/discover.ts` sammelt sie
   per Glob ein. Niemand erweitert eine fremde `switch`-Liste oder Union.
3. **Was nicht aus `map/index.ts` bzw. `registry/index.ts` exportiert wird,
   ist kein Vertrag.** Interne Dateien der anderen Pakete darf man lesen, aber
   nicht importieren — sie ändern sich heute Nacht noch.

## Pakete und Pfade

### 1. 2D-Kern + Sichtbarkeit (Paket `map`) — dieser Branch

Gehört ihm:

- `src/worlds/haunting/map/**` — `MapSnapshot`, `MapSource`, `MapView`,
  Sichtbarkeitsmodell, Extraktion aus der 3D-Welt, die 2D-Welt selbst
  (Joystick, Buttons, Overlay, Optionsmenü), CSS dazu.
- `src/worlds/haunting/registry/**` — die Registries und ihre Discovery.
- `BOUNDARIES.md`.

Vertrag nach außen (`map/index.ts`):

| Export                                                                                                                    | Was es ist                                                |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `MapSnapshot` und Teile (`MapRoom`, `MapDoor`, `MapLight`, `MapEntity`, `MapItem`, `MapSegment`)                          | Serialisierbarer Top-Down-Zustand, Meter, Norden = `-z`.  |
| `MapSource`, `ExtractMapSnapshot`                                                                                         | Was die Extraktion von der 3D-Seite liest — nur Getter.   |
| `MapView`, `MapLayers`, `MarkerPolicy`, `MapViewState`, `ALL_LAYERS`, `PANEL_LAYERS`                                      | Das Karten-Bauteil mit Layern, Pan/Pinch, Klick-Handlern. |
| `VisibilityMode`, `VisibilityInput`, `VisibilityField`, `VisionCone`, `NoiseRadius`, `LitRegion`, `SELF_RADIUS`, `inCone` | Das Sichtbarkeitsmodell.                                  |
| `tileGrid`, `spreadNoise`, `tileKeyOf`, `TileGrid`, `TileLink`, `SpreadOptions`, `NOISE_TILE`                            | Wie ein Geräusch über die freien Felder läuft.            |
| `ToolIconSource`                                                                                                          | Der Puffer der Werkzeugbilder, den `FlatMode` annimmt.    |

Seit Phase 1 (`feat/map-core`) sind `MapView.draw`/Gesten,
`extractMapSnapshot`, `computeVisibility` und `lineOfSight` gefüllt. Dazu
kamen: `MapViewOptions.routes` (Polylinien für Paket Navmesh),
`FlatRound`/`FlatMode` (die 2D-Welt), `worldMapSource` (der Adapter der
3D-Welt) und `HauntingWorld.mapSnapshot()` — dort holen Rollenansichten den
Stand ab. Wer in Tests keinen `FlatRound` will, baut den Snapshot mit
`emptySnapshot()` plus eigenen Räumen. `map/flatMode.ts` importiert CSS und
`registry/discover.ts` nutzt `import.meta.glob`: beides wird von
`HauntingWorld` **lazy** geladen — wer eines davon statisch importiert,
bricht die Jest-Suite der Welt. Dasselbe gilt für `map/toolIcons.ts`, die
einzige Datei des Pakets mit three.js: Sie steht mit Absicht **nicht** in
`map/index.ts` (nur ihr Vertrag `ToolIconSource` steht dort) und wird
dynamisch neben `flatMode` geladen.

### 2. Rollenansichten (Paket `views`)

Gehört ihm:

- `src/worlds/haunting/views/**` — eine Datei je Rolle plus
  `<rolle>.register.ts`, das `registerRole` aus `registry/` ruft. Steht
  seit dem Auftrag „Rollen aus der Registry": `archiveRole`, `panelRole`,
  `scoutRole`, `watchRole`, dazu `roleShell.ts`, `archiveDesk.ts`,
  `roleStrip.ts` und `views.css`.
- Grenzfall (bestehend, Minimaländerung erlaubt, HANDOVER-Pflicht):
  `stationUi.ts`, `stationUi.test.ts`, `stations.ts`, `stations.test.ts`,
  `stationDashboard.css`, `haunting.css`, `archiveView.ts`, `archiveMap.ts`.
- Nicht anfassen: `map/**` (Karte per `MapView` benutzen, nicht kopieren).

Andockstellen: `RoleDefinition.mount(host: RoleHost): RoleView`
(`registry/roles.ts`); die Karte kommt aus `new MapView({...})`, der Stand
aus `host.snapshot()`, der Grundriss aus `host.spec()`, die drei Griffe der
Schalttafel aus `host.door/light/lure`. Was eine Rolle darüber hinaus braucht,
kommt über `host.extra` — das Steuer des Monsters
(`monster/monsterDriver.monsterPortOf`) und der Tisch des Archivars
(`views/archiveDesk.archiveDeskOf`).

**Die Drohne gibt es nicht mehr** (Rolle, Ansicht, Körper, Kamera, Flug,
Netznachricht, CSS). Ihre Wegtypen leben als `navmesh/route.ts` im Paket
`nav` weiter und tragen dort Modelltechniker und Monster.

**Hinweis:** Das Paket `map` muss in Phase 1 in `stationUi.ts` **eine**
Checkbox neben der Kachel „Bot-Runde ansehen" einbauen (Auftrag). Das ist
die kleinste mögliche Änderung an einer fremden Grenzfall-Datei und steht in
`HANDOVER.md` des Pakets `map`.

### 3. Audio (Paket `audio`)

Gehört ihm:

- `src/worlds/haunting/audio/**` — **neu anlegen**; Cues werden per
  `registerAsset({ kind: 'audio', owner: 'audio', ... })` in einer eigenen
  `*.register.ts` angemeldet.
- Grenzfall: `shipAudio.ts`, `shipAudio.test.ts`, `src/core/Audio.ts`,
  `src/net/Voice.ts`.
- Nicht anfassen: `perception.ts`, `threat.ts` (das Hörmodell des Monsters ist
  Spielbalance; Änderungen daran gehen über HANDOVER an den Auftraggeber).

Andockstelle für Ereignisse: Audio liest den `MapSnapshot` (Entities mit
`moving`/`sprinting`, Türen `open`, Lichter `on`) und braucht keinen Zugriff
auf three.js-Objekte der Welt.

### 4. Navmesh / Pathfinding (Paket `nav`)

Gehört ihm:

- `src/worlds/haunting/navmesh/**` — inklusive `route.ts` (früher
  `droneRoute.ts`): Bahn, Pose und Weg als Punktkette.
- Grenzfall: `stationNavigation.ts`, `stationTravelPlan.ts`,
  `stationNpcNavigator.ts`, `roomGraph.ts`,
  `navigationOverlay.ts`, `src/worlds/nav/**` und die zugehörigen Tests.
- Nicht anfassen: `monsterRoutine.ts`, `roundSim.ts`, `botTraining.ts`,
  `botTuning.ts` (Balance; das Training misst 800 Runden nach).

Andockstelle: `MapSnapshot.walls` (Wandsegmente in Metern, an Türen
unterbrochen) und `MapSnapshot.doors` sind die Geometrie, die die 2D-Welt
kennt. Wer Routen auf der Karte zeigen will, füllt sie in einen eigenen Typ
und zeichnet sie über `MapView`-Layer `routes` — die Zeichenfunktion dafür
liefert Paket `map` in Phase 1 als `MapViewOptions.routes` (Liste von
Polylinien mit Farbe). Bis dahin: Layer existiert, zeichnet nichts.

### 5. 3D-Welt / Kleinkram (Paket `world3d`)

Gehört ihm:

- `src/worlds/haunting/world3d/**` — **neu anlegen** für neue Modelle,
  Effekte, Props; Modelle per `registerAsset({ kind: 'model', ... })`.
- Grenzfall: `shipArt.ts`, `fixtureModels.ts`, `fixtureDimensions.ts`,
  `marks.ts`, `ShipEffects.ts`, `stationLighting.ts`, `botLighting.ts`,
  `helmetCondensation.ts`, `trainingDeck.ts`, `trainingLayout.ts` und Tests.
- Nicht anfassen: `house.ts` (Grundriss = Vertrag für alle; Änderungen an
  Rechtecken/Türen brechen `MapSnapshot`, Tests und Netzprotokoll).

### 6. Rundenregeln / Spielzustand, Lüftungssystem, Monster-Rolle (Paket `gameplay`)

Drei Abschnitte eines Pakets, Branch `feat/monster-gameplay`. Es baut auf dem
gemergten 2D-Kern auf und benutzt `MapView`, `MapSnapshot` und das
Sichtbarkeitsmodell, wie sie in `main` stehen.

Gehört ihm:

- `src/worlds/haunting/rules/**` — **Rundenregeln/Spielzustand**: Kabinen,
  die nach einem Angriff kaputt bleiben; die drei Leben des Anzugs; der
  Sauerstoff als Rundenlimit (eine Uhr, zehn Minuten). Dazu der Techniker aus
  Zahlen für die 2D-Runde (`technicianBot.ts`) und der Rundenläufer
  (`botRound.ts`), mit denen Tests ganze Bot-Runden ausspielen.
- `src/worlds/haunting/vents/**` — **Lüftungssystem**: Klappen als Daten
  (`ventNet.data.ts`), der Graph darüber, die Fahrt (einsteigen, fahren,
  aussteigen) und die 3D-Klappen.
- `src/worlds/haunting/monster/**` — **Monster-Rolle**: `monster.register.ts`
  meldet die Rolle an, die Ansicht ist die Karte aus der Wahrnehmung des
  Monsters, gesteuert mit Stock und einem Knopf.
- Grenzfall (Minimaländerung, HANDOVER-Pflicht): `map/flatRound.ts`
  (Andockzeilen für Regeln, Vents und Monstersteuerung), `map/flatMode.ts`
  (Anzeige), `map/mapSnapshot.ts`, `map/mapSource.ts`, `map/extract.ts`,
  `map/worldSource.ts` (je ein optionales Feld im Contract).
- Nicht anfassen: `monsterRoutine.ts`, `roundSim.ts`, `botTuning.ts`
  (Balance), `mission.ts`, `net.ts`, `house.ts`.

Vertrag nach außen (über `map/index.ts`): `MapSnapshot.round` (`MapRound`:
Sauerstoff, Anzug, zerstörte Kabinen, Ende), Schrank-Zustand `destroyed`,
Klappen als `MapItem` der Sorte `vent` und `MapSnapshot.ventLinks`.

### Gemeinsame Grenzfall-Dateien (alle Pakete, Minimaländerung + HANDOVER)

- `src/worlds/haunting/HauntingWorld.ts` — der Knoten, an dem alles hängt.
  Erlaubt sind: ein Import, ein Feld, ein Aufruf. Kein Refactor, keine
  Umbenennung, keine verschobenen Methoden. Paket `map` hängt dort in Phase 1
  `MapSource`-Getter, den 2D-Modus-Schalter und `render()`-Kurzschluss ein.
- `src/worlds/haunting/ShipExperience.ts` — Items, Puzzles, Bot. Paket `map`
  liest dort (Getter für Fracht/Konsolen/Schränke), Paket `world3d` baut
  dort Modelle um.
- `src/worlds/haunting/mission.ts`, `net.ts`, `house.ts` — Regeln,
  Protokoll, Grundriss. **Nur nach Absprache.** `STATION_PROTOCOL` ist 7:
  6, seit die zerstörten Kabinen im `HauntState` stehen (`destroyed`); 7,
  seit die Monster-Station übers Netz spielt — Nachricht `monster` (Stock,
  Knöpfe als Zähler, Klappenziel) und die Felder `technician` (der
  2D-Techniker ohne Rig) und `ride` (Phase der Schachtfahrt) im Stand.
  Leser und Schreiber dafür stehen in `net.ts`; das Steuer dahinter in
  `monster/netMonsterPort.ts` (Telefon) und `monster/netMonsterControl.ts`
  (Gastgeber).
- `src/worlds/index.ts`, `src/core/**`, `package.json`, `AGENTS.md`,
  `README.md` — nur, wenn es gar nicht anders geht; jede Zeile in HANDOVER.

### HANDOVER.md

Jedes Paket schreibt **seine eigene** `HANDOVER.md` in seinen Branch, mit
einer Überschrift `## Paket <name>` ganz oben. Beim Zusammenführen werden die
Abschnitte untereinander gehängt; Konflikte sind dann Textkonflikte in einer
Markdown-Datei und keine im Code.

## Was heute schon da ist (zum Nachschlagen)

- Grundriss: `house.ts` (`HouseSpec`, `HouseRoom.rect` in Kacheln à 2,5 m,
  `HouseDoor` Kachel + Richtung, `HouseWindow`). Räume und Gänge zusammen:
  `spacesOf(spec)`.
- Laufender Stand: `net.ts` (`HauntState`: `lit`, `shut`, `monster`, `fuse`,
  `crew`), `ShipExperience` (`doorOpen`, `botPose`, Fracht/Konsolen/Schränke).
- Wahrnehmung: `perception.ts` (`BOT_FOV`, `MONSTER_FOV`, `BOT_VISION`),
  `threat.ts` (`ENTITY_PROFILES[kind].vision/hearing`).
- Headless-Runde ohne three.js: `roundSim.ts` + `roomGraph.ts`.
- Rollen heute: `registry/roles.ts` (angemeldet aus `views/*.register.ts`
  und `monster/monster.register.ts`); `stations.ts` ist nur noch die
  Sitzordnung, `stationUi.ts` nur noch der Rahmen darum.
- Bestehende 2D-Zeichner: `map/mapView.ts` (die Karte, die alle Rollen
  zeichnen), `archiveMap.ts` (Altmodul, unbenutzt, nicht wieder einbauen),
  `portal/tools/mapPlot.ts` (Karte in der Hand, andere Welt).
