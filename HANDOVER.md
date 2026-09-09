# HANDOVER

Ein Abschnitt je Paket (`BOUNDARIES.md`). Beim Zusammenführen werden die
Abschnitte untereinander gehängt.

## Paket views — Rollenansichten

Branch `feat/role-views` (Harness-Branch `claude/non-vr-role-views-qien4q`).
Alles Neue liegt in `src/worlds/haunting/views/**`.

### Was drin ist

- **Drei Geräte auf einer Karte.** Archiv, Schalttafel und Späher sind
  `RoleDefinition`s (`archive.register.ts`, `panel.register.ts`,
  `scout.register.ts`), jede aus ihrer eigenen Datei, und zeichnen mit
  `MapView` aus `map/` — nichts davon nachgebaut. Was eine Rolle darüber
  hinaus zeigt, malt sie auf eine zweite Leinwand über der Karte
  (`mapOverlay.ts`, `pointer-events: none`, rechnet mit `map.toScreen`).
- **Schalttafel** (`panel.ts`, Kennung `hack`): `PANEL_LAYERS` plus
  Raumnamen, keine Wesen. Tür antippen sperrt/gibt frei, Lampe antippen
  schaltet; beides über `host.flip(switchId, on)` mit dem Schalter aus
  `spec.switches`. Radios haben keine Form auf der Karte: Ein Tipp auf ein
  Zimmer mit Radio schaltet es, ein ♪-Schildchen sagt, ob es läuft.
- **Späher** (`scout.ts`): Karte ohne Items/Wesen, darüber grüne Punkte
  (Techniker, Bot, Mitspieler) und ein roter (Monster). Neue Peilung alle
  `SCOUT_PERIOD` = 3,5 s; dazwischen bleibt der Punkt stehen und verblasst
  von 1 auf `SCOUT_FLOOR` = 0,2 (nicht auf null — die letzte Stelle bleibt
  lesbar). Keine Interpolation. Radar, Puls und die Reiter sind weg.
- **Archivar** (`archive.ts`): ganze Karte mit Fracht, Konsolen, Türen,
  Lichtern, ohne Wesen. Von jeder liegenden Fracht eine gestrichelte Linie
  (`MapViewOptions.routes`) zur Konsole, an der sie gebraucht wird, plus
  Schildchen „Teil → Zielraum"; trägt der Techniker das Teil, steht am Ziel
  „Teil hierher". Tipp auf Raum oder Item schlägt die **Akte** auf: Codes
  groß (Schutzschrank, Freigabefolge/Zielfrequenzen, Kabelplan), darunter
  die Fakten, oben das Zimmer — in der 3D-Welt das Loch für die Welt
  (`viewport()`, Zoom/Wisch/Zange/Rad/Tasten an `archiveZoom/Pan/Home`
  weitergereicht, wie vorher in `stationUi.ts`), in der 2D-Welt eine zweite
  `MapView`, aufs Zimmer eingepasst. Die Missionsliste („Aufträge") ist weg.
- **Rollenwechsel im Testmodus** (`testRoles.ts`): `RoleSwitcher` legt einen
  Streifen (Techniker · Archiv · Schalttafel · Späher) über die 2D-Welt.
  Eine Rolle blendet `flat.element` nur aus (`hidden`); `FlatMode.update`
  läuft weiter, die `FlatRound` bleibt dieselbe, der Techniker steht, wo er
  stand. `roundHost(round)` ist der `RoleHost` über der Runde; die
  Schalttafel schaltet mit `applySwitch` (`switchState.ts`, dieselbe Regel
  wie `HauntingWorld.applyFlip`) direkt im Stand — kein Gastgeber, kein Netz.
- **`StationUi`** kennt keine Rollenseiten mehr: Van, Fernseher, Rahmen, und
  ein Slot, in den `roles.get(station).mount(host)` gebaut wird. Solange
  `views/` noch lädt, steht ein Platzhalter; der nächste `refresh` baut nach.
  `selected` setzt jetzt die Archivansicht (`ViewExtras.showRoom`), die Welt
  liest es wie vorher (`aimArchive`, `markDoors`).
- **Drohne gestrichen**: Rolle (`stations.ts`), Seite, Cockpit, Blickstock,
  Körper, Kamera, Scheinwerfer, Flug, Hangar-Ring, Netznachricht
  (`readDrone`/`droneMessage`), CSS. `STATION_PROTOCOL` bleibt 5; alte
  `drone`-Nachrichten fallen durch die Leser.

### Fremde Dateien, die ich angefasst habe

- `HauntingWorld.ts` (gemeinsam): der Drohnen-Code (Felder, `buildDrone`,
  `parkDrone`, `flyDrone`, `stepDrone`, Blick, Licht, `droneStatus`,
  `buildPad`, `receive`-Zweig, Kamera in `buildStationViews`/`render`) ist
  **gestrichen** — das ist mehr als „ein Import, ein Feld, ein Aufruf", und
  es ist so gewollt („keine Karteileiche"). Neu: `snapshot`/`notify` im
  `StationHost`, `void import('./views')` in `init`, ein Feld `roleSwitch`,
  je ein Aufruf in `tick`, `toggleFlat`, `dispose`. `worldMapSource` bekommt
  `drone: () => null`. Flips werden nur noch vom Platz `hack` angenommen
  (vorher `hack` **und** `scout`). Van-Monitore: blau statt grün für die
  Tafel. Nichts verschoben oder umbenannt.
- `stations.ts` (Grenzfall): `StationId` ohne `drone`; `hack` ist die
  Schalttafel, `scout` der Späher, mit neuen Sätzen. `stationFacts('hack')`
  liefert nicht mehr die Einsatzkontrolle.
- `stationUi.ts`, `stationUi.test.ts`, `stations.test.ts`, `haunting.css`,
  `stationDashboard.css` (Grenzfall): wie oben; die alten Regeln für Radar,
  Cockpit, Zimmerliste, Reiter und Schalter sind raus, `haunt__sheet`/`fact`
  bleiben (die Akte nutzt sie). Neu `.haunt.is-role` (durchsichtiger Grund,
  damit das Loch der Akte auf die Leinwand sieht).
- `net.ts` (nur nach Absprache): `readDrone` und `droneMessage` gestrichen.
  `DroneState` bleibt als leere Form, weil `map/mapSource.ts` und
  `map/worldSource.ts` den Typ im Vertrag führen — Paket map: `drone()` aus
  `MapSource`/`WorldHandles` streichen, dann kann der Typ mit. Ebenso die
  Zeile in `netReplay.test.ts`.
- `registry/roles.ts` (Paket map): `RoleHost.flyTo` gestrichen (Drohne).
- `registry/legacyRoles.register.ts` (meins): meldet nur noch `watch` an.
- `droneRoute.ts`, `droneRoute.test.ts` (Paket nav, Grenzfall): die
  Drohnen-Sachen (Ladung, Sperre, Öffnungswinkel, `DroneStatus`,
  `DRONE_ROOF`) sind raus; Wegtypen und Gang (`DronePose`, `DroneRoute`,
  `stepAlong`, `routeLength`, `routeTo`, `wrapAngle`) bleiben — Bot,
  Monsternavigator, `stationNavigation` und `ShipExperience` laufen darauf.
  `DRONE_Y`/`DRONE_CAP` bleiben, weil `stationNavigation.test.ts` damit
  eine Flughöhe prüft. Der Dateiname und die Typnamen sind eine Umbenennung
  in vier nav-Dateien wert (`routeWalk.ts`, `RoutePose`) — Paket nav.
- `HauntingWorld.replay.test.ts`: zwei `parkDrone`-Zeilen raus.
- `AGENTS.md`, `README.md`: die Absätze zu Rollen, Handyansichten und Drohne
  umgeschrieben; `.prettierignore`: `views/views.css`.
- **Nicht angefasst, obwohl drohnenhaft**: `house.ts` (`DRONE_HOME`, Vertrag
  für alle), `plan.ts` (`DRONE_PROFILE`, Flieger-Profil der Wegsuche, von
  `house.test.ts` geprüft), `map/**` (Entity-Art `drone`, `drone()`-Getter).

### Entscheidungen und Alternativen

- **Punkte verblassen auf 0,2, nicht auf 0.** „Verblassen, bis die nächste
  Position sie neu aufleuchten lässt" hätte auch „bis unsichtbar" heißen
  können; ein Punkt, der kurz vor der Peilung weg ist, sieht auf dem Telefon
  aus wie ein Ausfall. Alternative: `SCOUT_FLOOR = 0`.
- **Späher-Punkte auf einer Overlay-Leinwand statt über `MapView.markers`.**
  Die Drossel der Karte (`{ hz }`) hält die Stelle, kennt aber kein
  Aufleuchten und zeichnet Dreiecke in Cyan. Statt `map/**` zu ändern, liegt
  eine zweite Leinwand darüber. Alternative: `MarkerPolicy` um `fade`
  erweitern — Paket map.
- **Radios über den Raum-Tipp.** Die Vorgabe sagt „Türen und Lichter"; die
  Schallköder hätten sonst keinen Knopf mehr. Alternative: Radios ganz aus
  der Tafel nehmen.
- **Archiv-Zielräume auf der Karte, keine Liste darunter.** Linie und
  Schildchen statt einer Textzeile je Teil — eine Zeile je Teil wäre die
  Missionsliste durch die Hintertür. Die Zeile unter der Karte zählt nur.
- **Zoom/Wisch der 3D-Raumakte behalten.** „So wie der Archivar sie heute
  schon sieht" — die Gesten sind aus `stationUi.ts` nach `views/archive.ts`
  gezogen. Alternative: nur Knöpfe.
- **`hack` bleibt die Kennung der Schalttafel.** Sie geht über die Leitung
  (`claim`), und `STATION_PROTOCOL` soll bei 5 bleiben.
- **`views/` wird lazy geladen** wie die 2D-Welt (`init`, `toggleFlat`):
  `views/index.ts` importiert CSS, und ein statischer Import aus
  `HauntingWorld`/`stationUi` bräche die Jest-Suite der Welt. Tests
  importieren die `*.register.ts` einzeln.
- **Rollen importieren `map/mapView` und `map/mapSnapshot` direkt** statt
  `map/index.ts`: Der Index zieht `flatMode.ts` samt CSS mit. Beide Dateien
  sind über den Index exportiert, also Vertrag.
- **Die 2D-Raumakte zoomt eine zweite `MapView`** aufs Zimmer, statt in der
  2D-Welt ein leeres Loch zu zeigen.

### Bekannte Lücken

- Die 3D-Raumakte wurde nicht im Browser geprüft (Auftrag: 3D nicht testen).
  Das Loch liegt im Fluss der Seite; Zoom/Wisch gehen an dieselben
  Weltmethoden wie vorher. `.haunt.is-role` macht `.haunt` und `.haunt__body`
  durchsichtig, damit die Leinwand durchscheint — ob der Auftragsstreifen
  darüber das Bild anschneidet, sieht nur ein Telefon.
- `ScoutRole` zählt Mitspieler mit VR-Pose als grüne Punkte; ohne Pose
  (Zuschauer am Laptop) gibt es keinen Punkt — wie beim alten Radar.
- Der Rollenstreifen im Testmodus sitzt links unter dem HUD der 2D-Welt
  (`top: safe + 112px`); ob er auf sehr niedrigen Querformaten dem Stock in
  die Quere kommt, ist ungeprüft.
- Browser-Smoke (`npm run test:browser`) kennt die neuen Ansichten nicht.

### Offene Fragen an dich

- Soll der Späher zusätzlich den **Puls** (die alte ECG-Zeile) behalten? Die
  Vorgabe nannte nur die Karte; er ist raus. Zurückholen kostet eine Zeile
  in `scout.ts`.
- Sollen `droneRoute.ts`/`DronePose` jetzt umbenannt werden (Paket nav)?
- `plan.ts`/`DRONE_PROFILE` und `house.ts`/`DRONE_HOME`: streichen, wenn
  `house.test.ts` sein Flieger-Profil anders bekommt?

### Tests

`views/roles.test.ts` (Schalttafel: Tür, Lampe, Radio per Tipp; Späher:
Peilung alle 3,5 s, Verblassen, keine Zwischenposition; Archivar: Linien
und Zielschilder, Akte mit Codes, 3D-Loch mit Zoom/Wisch),
`views/testRoles.test.ts` (Rollenwechsel bei laufender Runde: dieselbe
`HauntState`, Uhr läuft weiter, Techniker bleibt, Schalter wirken;
`applySwitch`), `stationUi.test.ts` (Van über einer `FlatRound`: Rollen aus
der Registry, Platzhalter, Fernseher), `stations.test.ts`.

## Paket map — 2D-Kern + Sichtbarkeit

Branches: `feat/map-contract` (Phase 0, Contract + BOUNDARIES.md) und
`feat/map-core` (Phase 1, Implementierung). Alles Neue liegt in
`src/worlds/haunting/map/**` und `src/worlds/haunting/registry/**`.

### Was drin ist

- **Contract** (`map/index.ts`, `registry/index.ts`): `MapSnapshot`,
  `MapSource`, `MapView`, Sichtbarkeitsmodell, Registries für Rollen,
  Ansichtsmodi und Assets, `*.register.ts`-Discovery per `import.meta.glob`.
- **Geometrie** (`map/geometry.ts`): Wände mit Türlücken aus den
  Raumrechtecken (das *sind* die Bounding-Boxen, aus denen `GridWorld` die
  3D-Wände baut), Sichtlinien, Begehbarkeit mit Gleiten an Wänden, Türnischen,
  und der zweistufige Weg durch eine Tür (`nextThroughDoor`).
- **Sichtbarkeit** (`map/visibility.ts`): Lichtflächen per Strahlwurf gegen
  Wände und geschlossene Türblätter, Eigenradius 1,5 m, Sichtkegel,
  Geräuschradien; zwei Modi. `LitCache` hält die Flächen der Deckenlampen,
  solange keine Tür auf- oder zugeht.
- **Extraktion** (`map/extract.ts`, `map/worldSource.ts`): der Snapshot aus
  Bauplan + Stand + einer Handvoll Getter der Welt. `HauntingWorld.mapSnapshot()`
  ist die Stelle, an der Rollenansichten ihn abholen — reiner Lesezugriff.
- **2D-Welt** (`map/flatRound.ts`, `map/flatMode.ts`): eine ganze Runde ohne
  three.js — Stock, drei Knöpfe (Werkzeug wechseln / benutzen / interagieren),
  Fracht, Konsolen mit den drei Rätseln als Overlay, Schutzschränke, Türen
  ver-/entriegeln, Lampen schalten, Monster aus `monsterRoutine.ts` auf der
  Raumkarte, Spuk aus `haunt.ts`, Treffer und Puls aus `mission.ts`.
  Optionsmenü mit genau den zwei Modi aus `viewModesFor('flat')`.
  Das aktive Werkzeug wird als kleines 3D-Bild in ein Loch der Oberfläche
  gezeichnet (`map/flatStage.ts`) — der einzige WebGL-Aufruf im 2D-Modus.
- **Umschaltung**: Checkbox „2D-Welt von oben" neben der Kachel „Bot-Runde
  ansehen" im Van (`stationUi.vanPage`). Aktiv heißt: `HauntingWorld.tick`
  und `render` fassen die 3D-Welt nicht an.

### Fremde Dateien, die ich angefasst habe (Minimaländerungen)

- `src/worlds/haunting/stationUi.ts` (Paket Rollenansichten): zwei optionale
  Felder in `StationHost` (`flatMode`, `flatActive`), die Checkbox-Kachel in
  `vanPage`, ein `else if` in `onClick`. Kein Refactor.
- `src/worlds/haunting/HauntingWorld.ts` (gemeinsam): Imports, zwei Felder
  (`flat`, `flatStage`), zwei Host-Callbacks, ein Kurzschluss am Anfang von
  `tick` und von `render`, zwei Zeilen in `dispose`, und zwei neue Methoden
  (`toggleFlat`, `mapSnapshot`). Nichts Bestehendes verschoben oder umbenannt.

### Entscheidungen und Alternativen

- **Grundrisse aus den Rechtecken statt aus `THREE.Box3`.** Die Welt baut
  ihre Wände aus genau diesen Rechtecken; eine Szene zu durchsuchen hätte
  dasselbe ergeben, nur langsamer und nicht headless testbar. Alternative:
  `Box3.setFromObject` je Raumgruppe — bleibt möglich, falls das Paket 3D-Welt
  später Räume baut, die nicht mehr auf dem Kachelgitter liegen.
- **Die 2D-Welt ist eine eigene Runde, kein Spiegel der 3D-Runde.** Der
  Auftrag verlangt „ausschließlich 2D gerendert *und simuliert*". Deshalb
  läuft `FlatRound` mit eigenem Zustand, ohne Netz und ohne Host — wie die
  Bot-Runde. Alternative: die 3D-Physik weiterlaufen lassen und nur das Bild
  ersetzen; das hätte den 3D-Pfad nicht entlastet.
- **Bewegung: Gleiten an Rechtecken statt Navmesh.** Räume sind konvex, also
  reicht das für Spieler und Monster; das Monster geht Raum für Raum über
  die Türen der Raumkarte. Das Paket Navmesh kann `FlatRound.moveMonster`
  später mit einer echten Wegsuche füttern (`MapSnapshot.walls`).
- **Sprint am Stock**: jenseits von 88 % Auslenkung wird gerannt (kein
  vierter Knopf). Ausdauer gibt es in 2D nicht — der 3D-Techniker hat sie
  auch nur als Anzeige (`exertion`).
- **Türen im Einzelspiel**: Es gibt keine Schalttafel-Rolle in der 2D-Welt.
  Deshalb darf der Spieler jede Tür in Reichweite ver- und entriegeln und
  jede Lampe am Raummittelpunkt schalten. Das Monster splittert Holztüren
  nach 2,5 s, Stahl hält.
- **Radar/Röntgen** sind in 2D Textmeldungen (Richtung + Entfernung bzw.
  nächste Fracht), kein eigenes Bild.
- **Geräuschradien sind Zeichenradien** (12 m Sprint, 5 m Gehen, Hörweite
  des Monsters aus `ENTITY_PROFILES`); die echte Wahrnehmung rechnet wie
  `roundSim.ts` über `earshot` der Raumkarte. Wer die Radien mit dem
  akustischen Feld von `perception.ts` in Deckung bringen will: Paket Audio.
- **Marker-Drosselung** liegt in `MapView` (`markers: { hz }`), nicht im
  Snapshot: Der Späher soll springende Punkte sehen, die Schalttafel gar keine.

### Bekannte Lücken

- Keine Schächte für den Spieler und kein Schachtverhalten des Crawlers in 2D.
- Kein Sicherungskasten-Rätsel in 2D (`fuse` steht nur als Item auf der Karte).
- Kein Hören für den Spieler (Schritte des Monsters) — nur Sehen.
- `worldSource.player()` liefert `moving: false` (die Welt kennt die
  Laufgeschwindigkeit nicht ohne den Rig zu befragen); Sprint aus `exertion`.
- Die Drohne der 3D-Welt taucht im Snapshot auf, hat aber keinen eigenen
  2D-Modus.
- Browser-Smoke (`npm run test:browser`) kennt die Checkbox noch nicht.
- `registry/discover.ts` nutzt `import.meta.glob` — nur Vite, nie aus Jest
  importieren. Tests registrieren selbst.

### Offene Fragen an dich

- Soll die 2D-Welt später **netzfähig** sein (Host rechnet, Telefone zeigen)?
  Dann müsste `FlatRound` seinen `HauntState` über `net.ts` senden; der Typ
  passt schon, `STATION_PROTOCOL` bliebe bei 5.
- Soll die Checkbox auch dem VR-Spieler angeboten werden (Handmenü), oder
  bleibt sie im Van?
- `claude/vr-map-view-g13344` auf `origin` (6. 9.) ist ein unmerged Branch
  mit einer allgemeinen Karte für alle Welten (`shared/mapScene.ts`). Nicht
  berührt; sie überschneidet sich thematisch, aber nicht im Code.

### Tests

`src/worlds/haunting/map/*.test.ts` — Geometrie, Sichtbarkeit, Rätselregeln,
ganze headless Runden mit fünf Samen (Fracht holen, drei Konsolen lösen,
zurück zum Van), Monster über vier Samen (bleibt in der Station, trifft,
sieht nur im Licht), Stock, `MapView` (jsdom), `FlatMode` (jsdom).
Registry-Tests in `registry/registry.test.ts`.
