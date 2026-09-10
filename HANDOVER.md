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
- **Beim Zusammenführen mit `main`** (Pakete gameplay, audio, nav, world3d):
  `monster/monsterSession.ts` und `monster/monsterRole.test.ts` (Paket
  gameplay) setzten in ihren `RoleHost`-Objekten noch `flyTo` — die vier
  Zeilen sind raus, sonst nichts. Die Monster-Rolle hat `surface: 'map'`;
  der Rollenstreifen im Testmodus bietet deshalb nur noch Sitzplätze aus
  `stations.ts` an (`isStation`), das Monster wechselt die 2D-Welt selbst in
  ihrem Optionsmenü. Der erste Knopf heißt darum „Spielen" statt
  „Techniker".

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
## Paket gameplay — Rundenregeln, Lüftungssystem, Monster-Rolle

Branch `feat/monster-gameplay` (in der Browser-Session als
`claude/monster-gameplay-ant41n`). Drei Etappen, drei Commits; der Stand je
Etappe steht am Ende dieses Abschnitts. Neuer Code liegt in
`src/worlds/haunting/rules/**`, `vents/**` und `monster/**`; `BOUNDARIES.md`
hat dafür einen Abschnitt 6 bekommen, weil es vorher keinen gab.

### Etappe A — Rundenregeln (`rules/`)

**Das Problem.** Techniker in die Kabine, Monster reißt sie auf, Techniker in
die nächste Kabine — und die erste stand danach wieder da wie neu. In der
3D-Bot-Runde (sicherer Test) verlor der Anzug dabei nicht einmal ein Leben.
Nichts an der Runde konnte sie beenden.

**Was drin ist.**

- `rules/roundRules.ts`: `RoundRules` hält die zerstörten Kabinen und rechnet
  den Rest aus `HauntState`. `cabinStrike(crew)` macht die Kabine kaputt,
  stellt den Techniker in den Raum und kostet ein Leben — **auch wenn er
  gerade unverwundbar war**; sonst wäre die Kabine wieder ein Ausweg. Im
  sicheren Test bleibt der Anzug ganz, die Kabine ist trotzdem hin.
  `step(state)` beendet die Runde, wenn `ROUND_SECONDS - time` bei null ist.
  Anzug-Leben **sind** `crew.hp` (drei, `mission.ts`), kein zweiter Zähler;
  Sauerstoff und Rundenlimit sind **eine** Uhr (`HauntState.time`).
- Contract: `MapSnapshot.round` (`MapRound`: `phase`, `oxygen`, `limit`,
  `suit`, `suitMax`, `cabinsDestroyed`, `ending`), Schrank-Zustand
  `destroyed` mit `interactive: false`. `MapSource.round?()` und
  `WorldHandles.round?()` sind optional, damit Quellen ohne Regeln
  weiterlaufen.
- 2D-Runde (`map/flatRound.ts`): Sauerstoff-Ende, Kabinenangriff über
  `rules.cabinStrike`, zerstörte Kabinen weder als Ziel des Knopfs noch als
  Versteck; `round()` als `MapSource`. HUD zeigt `O₂ m:ss`, die Endkarte den
  Grund (`map/flatMode.ts`).
- 3D-Welt (`HauntingWorld.ts`): ein Import, ein Feld, `rules.step` nach der
  Uhr (Runde verloren, Monster weg, Ansage), `rules.destroyCabin` in
  `breakLocker`, `rules.reset` in `newRound`, `round` im `mapSnapshot`.
- `rules/technicianBot.ts` + `rules/botRound.ts`: ein Techniker aus Zahlen
  für die 2D-Runde (Aufträge, Flucht, Kabine — wie `roundSim.ts`, aber gegen
  die echte `FlatRound` mit demselben Stock und denselben Knöpfen) und
  `simulateFlatRound(seed)`, der eine ganze Runde headless ausspielt.

**Der Beleg** (`rules/botRound.test.ts`): fünf Bot-Runden auf fünf Stationen,
die Hälfte mit einem Techniker, der die Kabine dem freien Feld immer vorzieht
(`hide: 1`). Jede endet von selbst — Sauerstoff, Anzug oder Flucht —, nie
durch die Reißleine eine Minute hinter dem Limit. Das Protokoll steht im Test
als `console.info`; beim Schreiben dieses Abschnitts: siehe unten
„Stand je Etappe".

**Entscheidungen und Alternativen.**

- **Die Uhr läuft weiter, auch wenn „Lebenserhaltung stabilisieren" repariert
  ist.** Sonst wäre nach der zweiten Reparatur wieder eine Runde ohne Ende
  möglich. „Sauerstoffversorgung wiederherstellen" heißt: alle drei Systeme
  und zurück in die Zentrale. Alternative: die Uhr bei reparierter
  Lebenserhaltung anhalten — eine Zeile in `RoundRules.oxygenLeft`.
- **Kabinenangriff schlägt Unverwundbarkeit.** `takeCrewHit` lehnt einen
  Treffer binnen drei Sekunden nach dem letzten ab; für den Kabinenangriff
  wird die Frist vorher auf null gesetzt und danach neu gewährt (`mission.ts`
  unverändert).
- **Nur eine Klappe je Raum.** Räume sind hier klein (vier mal vier
  Kacheln); zwei Klappen im selben Raum wären Deko. Wer die Cafeteria
  zweifach anschließen will, fügt eine Zeile in `ventNet.data.ts` ein.
- **Der Bot der 2D-Runde erkennt Gefahr wie `roundSim.ts`** (Abstand und
  Raumkarte), nicht über das Sichtbarkeitsfeld. Ein Bot, der das Monster erst
  im Licht sieht, würde die Schleife nie erreichen, die ein Mensch mit Ohren
  erreicht. Er gewinnt gegen das 2D-Monster selten — die Balance der 2D-Runde
  ist nicht Gegenstand dieser Etappe.
- **Zwei Messstellen im Sichtbarkeitsmodell** (`map/visibility.ts`, Paket
  map): `litAt` prüft erst den Radius, dann das Polygon; `LitCache` merkt sich
  je Lampe nur den Stand der Türen in ihrer Reichweite statt aller Türen.
  Vorher warf jede automatische Tür irgendwo in der Station alle Lampenflächen
  weg — eine Bot-Runde brauchte 20 s statt 7 s, und ein Telefon rechnet
  dasselbe. Verhalten unverändert (`visibility.test.ts` grün).

**Fremde Dateien, die ich angefasst habe.** `map/flatRound.ts` (Import,
Feld, fünf kleine Hooks), `map/flatMode.ts` (HUD-Zeile, Endkarte),
`map/mapSnapshot.ts` (`MapRound`, `round?`, Doku des Schrank-Zustands),
`map/mapSource.ts`, `map/extract.ts`, `map/worldSource.ts` (je das optionale
`round`), `map/visibility.ts` (die zwei Messstellen), `map/index.ts`
(`MapRound` exportiert), `HauntingWorld.ts` (siehe oben), `BOUNDARIES.md`
(Abschnitt 6).

**Offen / nicht gemacht.**

- Die **3D-Bot-Runde** kennt jetzt die Uhr und zerstörte Kabinen, aber der
  Modelltechniker (`missionBot.ts`, über `ShipExperience`) wählt seine Kabine
  noch aus allen — dafür bräuchte `MissionBotHost` ein `cabinUsable`, das
  durch `ShipExperience` durchgereicht wird (zwei Grenzfall-Dateien). Ebenso
  kann der VR-Spieler in 3D eine zerstörte Kabine noch betreten
  (`ShipExperience.hide`). Beides endet spätestens am Sauerstoff.
- Die Schalttafel im Van zeigt `MapSnapshot.round` noch nicht (Paket
  Rollenansichten): Timer, Anzug und Kabinen liegen im Contract bereit.
- `map/index.ts` ist aus Jest nicht importierbar (zieht `flatMode.ts` mit CSS
  nach sich); `rules/` und `monster/` importieren deshalb `map/flatRound`,
  `map/flatWalk` und `map/mapSnapshot` direkt. Vorschlag an Paket map: den
  Index in einen headless Teil und einen DOM-Teil trennen.

### Etappe B — Lüftungssystem (`vents/`)

**Was drin ist.**

- `vents/ventNet.data.ts`: **das Netz als Daten** — vierzehn Klappen (eine
  je Raum, an Innenwänden zu Gängen, nie in einer Türöffnung) und neun
  Verbindungen in vier getrennten Netzen (Reaktor–Triebwerke,
  Sicherheit–MedBay–Elektrik, Cafeteria–Admin, Lager–Kommunikation,
  Waffen–O2–Navigation–Schilde). Wer das Netz ändert, ändert diese Datei.
- `vents/ventGraph.ts`: `VentNet` baut aus Daten und Bauplan die Klappen in
  Metern (`at` an der Wand, `approach` davor) und **prüft die Daten** beim
  Bauen (Kachel im Raum, Wand am Rand, keine Türöffnung, bekannte Klappen in
  jeder Verbindung). `ventGraph.test.ts` prüft das gegen vier Samen.
- `vents/ventTravel.ts`: `VentTravel`, die Fahrt als Zustandsmaschine —
  einsteigen (1,2 s, sichtbar, Klappe offen), fahren (Länge des Schachts
  durch 3,5 m/s, mindestens 2,5 s, **unsichtbar**: `concealed`), ankommen,
  aussteigen (0,9 s, Klappe drüben offen). Die KI steigt sofort aus
  (`autoExit`), ein Spieler muss den Knopf drücken. Der Zustand liegt in der
  Maschine und nicht beim Steuernden — deshalb übersteht er einen Wechsel
  der Steuerung (Etappe C).
- `vents/ventPilot.ts`: **wie die KI fährt.** Die Routine kennt keine
  Schächte und bleibt unangetastet; der Lotse liest ihr Ziel und biegt es auf
  eine Klappe um, wenn Umweg, Ein-/Aussteigen und Fahrt zusammen mindestens
  sechs Meter Weg sparen. Pause zwischen Fahrten aus `MONSTERS[].vent`.
- `vents/ventArt.ts`: die Klappen in 3D — Rahmen, vier Lamellen, ein
  Leuchtstreifen, alles in einer `ShipBatch` (zwei Draw-Calls für die ganze
  Station). `vents/vents.register.ts` meldet Modell und Netz als Assets an.
- Contract: Klappen als `MapItem` der Sorte `vent` (`closed`/`open`, nie
  `interactive`), `MapSnapshot.ventLinks` als Graph, `MapSource.ventLinks?()`.
  Das Monster im Schacht ist `concealed` — das Sichtbarkeitsmodell nimmt es
  damit in beiden Modi aus `visibleEntities`; im Modus „Alles sehen" bleibt
  der blasse Marker an der Einstiegsklappe stehen, was für die Prüfansicht
  gewollt ist. `MapView` zeichnet eine Klappe als Gitter (kleine Ergänzung
  im `items`-Zweig).
- 2D-Runde (`map/flatRound.ts`): drei Felder, vier Zeilen im Konstruktor,
  der Fahrt-Schritt am Anfang des Monsterblocks (im Schacht wird weder
  wahrgenommen noch gelaufen noch getroffen), der Lotse vor `moveMonster`,
  Klappen in `items()`, `ventLinks()`, `concealed` am Monster, und die
  automatischen Türen ignorieren ein Monster im Schacht.
- 3D-Welt (`HauntingWorld.buildHouse`): ein Import, ein `stage.add`.

**Entscheidungen und Alternativen.**

- **Die alte Schacht-Logik der 3D-Welt bleibt, wie sie ist.** `HauntingWorld`
  lässt das Monster weiter über `mission.ventPairs` (jede gemeinsame Wand)
  mit Rauch und zwei Sekunden Unsichtbarkeit springen. Sie auf den neuen
  Graphen umzustellen hieße, `npcTarget`, `stepMonster`-Schachtteil und
  `monsterVent` umzuschreiben (~60 Zeilen der gemeinsamen Grenzfall-Datei)
  und die Fahrt mit dem NPC-Körper zu verheiraten. Das ist der nächste
  Schritt, nicht dieser: Die neuen Klappen stehen in 3D sichtbar an den
  Wänden, das Netz und die Fahrt sind headless fertig und getestet, und die
  Umstellung ist damit ein Austausch von drei Methoden. Bis dahin gibt es
  in 3D zwei Sorten Gitter: die alten hoch an den Wänden (`shipArt`) und die
  neuen Klappen unten.
- **Klappenwahl bei zwei Zielen:** `enter(rider, choice)` nimmt die
  Datenreihenfolge; die KI rechnet die bessere aus, die Monster-Rolle zeigt
  die Ziele als Knöpfe (Etappe C).
- **Der Schacht ist Luftlinie.** Die Fahrtdauer ist die Luftlinie zwischen
  den Klappen durch `VENT_SPEED`; ein echter Kanalverlauf brächte nichts,
  was man auf der Karte sähe.
- **Kein Hören im Schacht.** Das Monster nimmt während der Fahrt nichts
  wahr, sein Gedächtnis läuft in der Zeit nicht ab (der Wahrnehmungsblock
  wird übersprungen). Alternative: Gedächtnis weiterlaufen lassen — eine
  Zeile vor dem `return` im Fahrt-Schritt.

**Fremde Dateien, die ich angefasst habe.** `map/flatRound.ts` (siehe
oben), `map/mapSnapshot.ts` (`ventLinks?`), `map/mapSource.ts`,
`map/extract.ts` (je `ventLinks`), `map/mapView.ts` (Gitter für `vent`,
zwei Farben), `HauntingWorld.ts` (Import, ein Aufruf in `buildHouse`).

### Etappe C — Monster-Rolle (`monster/`)

**Was drin ist.**

- `monster/monster.register.ts`: die Rolle `monster` (`surface: 'map'`,
  nicht `shared`) über `registerRole` aus der eigenen Datei, dazu der
  Ansichtsmodus `monster:senses` für das Publikum `monster`. Keine zentrale
  Liste angefasst; `registry/discover.ts` findet die Datei per Glob. Die
  Datei lädt auch `monster.css` — deshalb importiert sie **nur** Vite.
- `monster/monsterDriver.ts`: die zwei Schnittstellen. `MonsterDriver` ist
  die Seite der Simulation (`active()`, `decide(dt): RoutineOutput` — dieselbe
  Form wie die Routine, damit Kabinenangriff, Treffer, Bewegung und Snapshot
  nicht wissen müssen, wer entschieden hat). `MonsterPort` ist die Seite der
  Ansicht (Stock, `attack`/`interact`, Schachtziel wählen, Stand);
  `monsterPortOf(host)` holt ihn geprüft aus `host.extra`.
- `monster/flatMonsterControl.ts`: beides für die 2D-Runde. Hängt sich als
  `round.driver` ein. Ziel einen Meter voraus, Tempo aus dem Sprintring,
  **Angreifen** trifft nur in Reichweite (Techniker im Freien: die Runde
  prüft den Abstand; Kabine: zwei Meter), **Interagieren** ist einsteigen,
  aussteigen, abbrechen oder eine verriegelte Holztür aufbrechen (Stahl
  hält).
- `monster/monsterView.ts`: die Ansicht. `MapView` im Modus `realistic` aus
  Sicht des Monsters (`computeVisibility` mit `viewerId: 'monster'`, also
  eigener Kegel, Licht, Sichtlinie — dasselbe Modell, mit dem die Runde
  entscheidet, ob es den Techniker sieht) **plus Hören**: Wer sich in
  Hörweite bewegt und nicht zu sehen ist, wird als Geräuschring gezeichnet,
  nicht als Marker. Stock links, rechts Angreifen und Interagieren, darüber
  die Zielwahl, wenn eine Klappe zwei Ziele hat. Ohne Port ist die Ansicht
  ein Zuschauerfenster in die Wahrnehmung des Monsters.
- `monster/monsterSession.ts`: das Bündel für die 2D-Welt — Steuer, Bot als
  Techniker (`rules/technicianBot.ts`) und Ansicht über einen `RoleHost`,
  dessen `snapshot()` aus der laufenden Runde kommt und dessen `extra.monster`
  das Steuer ist. `FlatMode` bietet im Optionsmenü „Als Monster spielen" an;
  die nächste Runde tauscht dann Stock und drei Knöpfe gegen die
  Monster-Ansicht, und die Endkarte spricht aus Sicht des Monsters.
- 2D-Runde (`map/flatRound.ts`): ein Feld `driver`; im Monsterblock
  `piloted` = Spieler am Steuer → Entscheidung vom Steuer statt von der
  Routine, Bewegung direkt über `stepMonster` (kein Türrouting, kein Lotse),
  Treffer nur mit `strike`; die Fahrt steigt bei einem Spieler nicht von
  selbst aus. `FlatOptions.role` (nur `FlatMode` liest es).

**Der Wechsel bricht keine Runde.** Der Zustand der Fahrt liegt in
`VentTravel` (Runde), nicht im Steuer. Verlässt der Spieler die Rolle
mitten im Schacht, steigt die KI drüben aus und macht weiter; setzt sich ein
Spieler, während die KI fährt, wartet die Fahrt drüben auf seinen Knopf.
Beides steht in `monsterRole.test.ts`. Die Routine wird währenddessen nicht
gerechnet und macht danach an ihrem alten Ziel weiter; das Gedächtnis des
Monsters (gesehen, gehört) läuft in beiden Fällen mit.

**Entscheidungen und Alternativen.**

- **Hören in der Ansicht ist Luftlinie mal Lärm** (Sprint 1, Gehen 0,45 der
  Hörweite aus `sense.hearing`), die Runde selbst rechnet über `earshot` der
  Raumkarte (Wände dämpfen). Die Ansicht hat nur den Snapshot; wer es genau
  will, reicht `earshot` über den Snapshot mit — oder das Paket Audio bringt
  sein Feld. So hört der Spieler eher etwas mehr als die KI, nie weniger.
- **Ein Spieler trifft nur mit dem Knopf**, die KI durch Berührung. Ein
  Monster, das beim Vorbeilaufen automatisch zuschlägt, nimmt dem Spieler
  die einzige Entscheidung, die er hat.
- **Netzspiel fehlt.** Der Port ist lokal (2D-Welt). Für den Van müsste die
  Eingabe des Monsterspielers über `net.ts` zum Gastgeber, der das Monster
  rechnet — eine neue Nachricht, also `STATION_PROTOCOL` (nur nach
  Absprache). Der `MonsterDriver` in `HauntingWorld` wäre dann ein
  Netzempfänger mit derselben `decide`-Form; die Ansicht bleibt dieselbe.
- **`Joystick` ist nicht im Contract** (`map/index.ts` exportiert ihn
  nicht); die Ansicht importiert `map/joystick.ts` direkt und nutzt dessen
  CSS-Klassen für Basis und Knopf. Vorschlag an Paket map: `Joystick` in den
  Index aufnehmen.

**Fremde Dateien, die ich angefasst habe.** `map/flatRound.ts`
(`driver`, `piloted`-Zweige, `FlatOptions.role`), `map/flatMode.ts`
(`session`, `playRole`, Menüpunkt, Endkarte, `restart`, `dispose`).

### Offene Fragen an dich

- **3D-Monster auf den Vent-Graphen umstellen?** Netz, Fahrt und Klappen
  sind fertig; offen ist nur der Umbau von `npcTarget`/`stepMonster`/
  `monsterVent` in `HauntingWorld` (Grenzfall, ~60 Zeilen). Bis dahin
  springt das 3D-Monster weiter über die alten Wandpaare.
- **Uhr bei reparierter Lebenserhaltung anhalten?** Heute nein (sonst wäre
  die Schleife wieder möglich); wenn doch, eine Zeile in `oxygenLeft`.
- **Monster-Rolle im Van übers Netz** — braucht eine Nachricht in `net.ts`
  (Protokoll 5 → 6) und einen Netz-`MonsterDriver` in `HauntingWorld`.
- **Bot der 3D-Runde und VR-Spieler bei zerstörten Kabinen** — je eine
  Zeile in `missionBot.ts`/`ShipExperience.ts`, sobald das Paket
  Rollenansichten dort ohnehin arbeitet.

### Stand je Etappe

**C — fertig.** `monster/monsterRole.test.ts` (Registry, Steuer ersetzt
die KI und gibt sie zurück, Treffer nur mit Knopf, Schachtfahrt mit Zielwahl
und Warten auf den Ausstieg, Wechsel mitten in der Fahrt in beide Richtungen,
Holztür, Karte aus Monstersicht mit Hören) und `monster/monsterMode.test.ts`
(2D-Welt als Monster, Rollenwechsel im Menü, Endkarte).

**B — fertig.** `vents/*.test.ts`: Datennetz gegen vier Samen, Fahrt
Schritt für Schritt, 2D-Runde (Klappen und Graph im Snapshot, Techniker kann
keine Klappe benutzen, Monster während der Fahrt für Techniker und
Schalttafel unsichtbar und ohne Treffer, KI nimmt über vier Samen und 240 s
mindestens eine Abkürzung).

**A — fertig.** Typecheck, Lint, Prettier und alle Tests grün. Der Testlauf
(`rules/botRound.test.ts`, Stand des Commits):

```
Seed 1: suit nach 66 s · Anzug 0/3 · 0 Kabinen zerstört · 0× versteckt · 0/3 repariert
Seed 2: escaped nach 368 s · Anzug 3/3 · 0 Kabinen zerstört · 2× versteckt · 3/3 repariert
Seed 3: oxygen nach 600 s · Anzug 1/3 · 0 Kabinen zerstört · 4× versteckt · 0/3 repariert
Seed 4: oxygen nach 600 s · Anzug 3/3 · 0 Kabinen zerstört · 10× versteckt · 2/3 repariert
Seed 5: oxygen nach 600 s · Anzug 2/3 · 1 Kabinen zerstört · 131× versteckt · 0/3 repariert
```

Seed 5 ist die alte Schleife — 131-mal versteckt, das Monster kommt nicht
heran —, und sie endet jetzt am Sauerstoff. Seed 1 endet am Anzug, Seed 2
mit der Flucht in die Zentrale.

## Paket audio — Geräusche und Hörmodell

Branch: im Auftrag `feat/audio`; die Session lief auf dem zugewiesenen
Branch `claude/audio-horror-vr-v6stx1` (Claude Code im Browser). Alles Neue
liegt in `src/worlds/haunting/audio/**`; die eine Tür ist `audio/index.ts`.

### Was drin ist

- **Hörmodell** (`audio/hearing.ts`): rechnet auf dem `MapSnapshot`
  (Räume, Türen, Wände) den Weg des Schalls von einer Quelle zum Zuhörer in
  **effektiven Metern**. Zwei Wege, der kürzere zählt: die **Luftlinie** mit
  Dämpfung je gekreuzter Wand (`WALL_LOSS` 9 m), Fenster/Glas (`GLASS_LOSS`
  6 m) und geschlossenem Türblatt (`DOOR_LOSS` 4 m) — und der Weg **über die
  Türen** der Räume (Dijkstra, zwei Zustände je Tür), der um Ecken führt.
  Wände dämpfen, sie schneiden nicht ab. Zurück kommt neben der Entfernung
  auch die **Herkunft**: die Quelle selbst oder die letzte Tür, aus der es
  kommt — daran hängt die Balance im Ohr. Die Zahlen sind dieselben wie im
  akustischen Feld des Monsters (`perception.acousticField`).
- **Hörweiten**: `PLAYER_HEARING` = 9 m für ein Geräusch der Lautstärke 1.
  Jedes Monster hört weiter (`ENTITY_PROFILES[kind].hearing`: 10/14/19 m);
  ein Test hält diese Ungleichung fest. Reichweite = Lautstärke × Hörweite,
  Lautstärke aus `AUDIO_CUES` (Gehen 1, Rennen 1,6, Ruf 3,2). Darüber hinaus
  Stille, darunter `hearingGain` = (1 − d/Reichweite)².
- **Cues** (`audio/cues.ts`, `audio/cues.register.ts`): fünf Geräusche —
  eigener Schritt, Monster geht, Monster rennt, Ruf bei der Verfolgung,
  Herzschlag — als Tabelle mit Lautstärke, Zieldatei und
  **Platzhalter-Klang** (Oszillator/Rauschen). Jeder Cue ist per
  `registerAsset({ kind: 'audio', owner: 'audio' })` angemeldet.
- **Regie** (`audio/soundscape.ts`): liest den Snapshot (`moving`,
  `sprinting`, `concealed`, Türen `open`) und gibt je Schritt fertige
  `SoundEvent`s zurück — ohne Web Audio, deshalb headless prüfbar. Eigene
  Schritte im Takt `max(0,28 s, 1,45/Tempo)`; Monster-Schritte im Takt
  `ENTITY_PROFILES[kind].cadence`, beim Rennen ×0,55 mit eigenem Cue; Ruf
  alle 3–6 s während der Verfolgung (erster nach 0,4 s); Herzschlag als
  Doppelschlag aus `max(Verfolgung, Nähe)` — Verfolgung = 1 − d/18 beim
  Rennen (oder Hinweis der 3D-Welt), Nähe = (1 − d/8) × 0,7.
- **Mixer** (`audio/mixer.ts`): sechs wiederverwendete Stimmen (Hüllkurve →
  Gain → StereoPanner → Master) auf dem gemeinsamen Kontext aus
  `core/Audio.ts`. `prime()` holt beim Bau alle Cues aus der Registry
  (Platzhalter sofort, ein versprochener `AudioBuffer` wird abgewartet und
  ersetzt den Platzhalter, sobald er da ist). Kein Aufruf blockiert, nichts
  wird mitten in der Runde nachgeladen; ohne laufenden Kontext (vor der
  ersten Geste) ist alles still.
- **Andockklasse** (`audio/hauntingAudio.ts`): `HauntingAudio.update(dt,
  input)` je Bild; die Regie rechnet in 20-Hz-Schritten, klingende Stimmen
  werden mit dem Zuhörer nachgeführt (durch dieselbe Tür). `lookup()` gibt
  das Hörmodell an fremde Mixer weiter.

### Wo es angeschlossen ist

- **2D-Welt** (`map/flatMode.ts`): ein `HauntingAudio`, gefüttert mit dem
  Snapshot der Runde und der Kennung des Spielers. Erstmals Hören in 2D.
- **Headset** (`ShipExperience.stepSound`, 20 Hz): Snapshot aus
  `HauntingWorld.mapSnapshot()`, Zuhörer ausdrücklich (Kopf, Blick,
  gemessenes Tempo), Gang des Monsters aus der Routine, Verfolgung aus
  `threat.mode === 'hunt'` wie bisher. `ShipAudio` behält Türen, Funken,
  Schacht, Atem, Klacken, Schrei vor der Kabine, Aufreißen und Maschine —
  bekommt aber das Hörmodell (`frame.hearing`) für deren Entfernung und
  Richtung, und gibt Monster-Schritte, eigene Schritte und Herzschlag ab
  (`frame.footsteps = false`, `playerSpeed`/`chase` = 0).

### Fremde Dateien, die ich angefasst habe (Minimaländerungen)

- `shipAudio.ts` (Grenzfall Audio): zwei optionale Felder in
  `ShipAudioFrame` (`hearing`, `footsteps`), ein fünfter optionaler
  Parameter `heard` an `spatialMix` (effektive Meter statt Luftlinie für die
  Lautstärke; die Richtung bleibt aus der Quelle), eine private Methode
  `mixFor`, zwei Aufrufe darauf umgestellt, eine Bedingung erweitert.
  `shipAudio.test.ts`: ein Test dazu.
- `ShipExperience.ts` (gemeinsam): zwei Imports, zwei optionale Felder in
  `ShipHost` (`mapSnapshot`, `monsterPace`), ein Feld `hearingAudio`, ein
  Block in `stepSound` vor `this.audio.update`, je eine Zeile in `dispose`
  und im Ton-Schalter. Nichts verschoben oder umbenannt.
- `HauntingWorld.ts` (gemeinsam): zwei Host-Callbacks in `mountExperience`
  (`mapSnapshot: () => this.mapSnapshot()`, `monsterPace`).
- `map/flatMode.ts` (Paket map): ein Import, ein Feld, ein Aufruf in
  `update`, eine Zeile in `dispose`.

### Entscheidungen, Abweichungen

- **Imports aus `map/mapSnapshot` und `map/flatRound` statt `map/index`.**
  `map/index.ts` re-exportiert `FlatMode`, das `flat.css` importiert — Jest
  bricht damit (das steht so auch im HANDOVER von `map`). Beides sind
  Vertragsinhalte, nur der Pfad ist ein anderer. Vorschlag an Paket `map`:
  `FlatMode` aus `index.ts` herausnehmen oder das CSS lazy laden.
- **Zwei Mixer im Headset.** `ShipAudio` (8 Stimmen) bleibt, `Mixer` (6)
  kommt dazu — zusammen 14 mögliche Knotenpaare, mehr als die „acht
  Audio-Kanäle" in AGENTS.md. Grund: `ShipAudio` ist Grenzfall, und die
  Schritte samt Hörmodell dorthin zu ziehen wäre ein Refactor gewesen.
  Praktisch klingen selten mehr als vier Stimmen zugleich. Alternative
  später: die übrigen `ShipAudio`-Geräusche als Cues in die Registry und
  `ShipAudio` auflösen — dann ein Budget.
- **Platzhalter statt Dateien.** Bewusst, wie im Rest des Spiels („kein
  Asset, ein Download"); die Zieldateien stehen in `AUDIO_CUES[*].file`.
- **Das Monster hört weiter im Modell, nicht anders im Spiel.** Das
  Hörmodell bietet `hearingGain(reachOf(loudness, hearing))` für beide
  Seiten an, aber die **Wahrnehmung des Monsters** rechnet weiter in
  `threat.ts`/`perception.ts` (`roundSim.ts` über `earshot`). Wer beide auf
  `hearing.ts` vereinigen will, entscheidet über Balance — nicht ich.
- **Der Snapshot der 3D-Welt kennt das Tempo nicht** (`worldSource.player()`
  liefert `moving: false`, Monster `sprinting: false`). Deshalb bekommt die
  Regie im Headset Tempo und Gang ausdrücklich (`Listener.speed`,
  `MonsterHints.pace`); in 2D kommt beides aus dem Snapshot.
- **Kosten** (Jest, ts-jest, ohne Optimierung): ein Hörweg zwischen zwei
  beliebigen Räumen 0,14 ms, `extractMapSnapshot` 0,2 ms. Die Regie läuft
  mit 20 Hz; Quellen jenseits der Reichweite (Luftlinie ≥ Reichweite)
  kosten keine Suche. Im Headset also ≲ 0,5 ms je Regie-Schritt, alle 3–4
  Bilder, nie im Audio-Thread.

### Sounddateien, die fehlen — und wo die Platzhalter stecken

Alle fünf Cues sind heute **Platzhalter** aus `AUDIO_CUES[*].placeholder`
(`audio/cues.ts`); keine Datei liegt im Repository:

| Cue            | Zieldatei                          | Platzhalter heute                       |
| -------------- | ---------------------------------- | --------------------------------------- |
| `player-step`  | `audio/haunting/player-step.ogg`   | Sinus 105→38 Hz, 0,11 s                 |
| `monster-walk` | `audio/haunting/monster-walk.ogg`  | Sinus 62→24 Hz, 0,24 s                  |
| `monster-run`  | `audio/haunting/monster-run.ogg`   | gefärbtes Rauschen, Rate 1,6→0,9, 0,14 s |
| `monster-call` | `audio/haunting/monster-call.ogg`  | Sägezahn 160→420 Hz, 1,1 s              |
| `heartbeat`    | `audio/haunting/heartbeat.ogg`     | Sinus 58→22 Hz, 0,16 s, Doppelschlag    |

Ersetzen: in `cues.register.ts` `load()` ein `Promise<AudioBuffer>` liefern
lassen (Fetch + `decodeAudioData` auf `sharedAudio()`), der Mixer nimmt es
beim `prime()` an; die Schritt-Sorten des Monsters (Stalker/Crawler/Sentinel)
könnten dann eigene Dateien bekommen — heute unterscheiden sie sich nur im
Takt.

### Bekannte Lücken

- In der 2D-Welt klingen nur die fünf Cues; Türen, Klacken und der Schrei
  vor der Kabine (`FlatRound` meldet „Ein Schrei." nur als Text) haben in 2D
  keinen Ton.
- Mitspieler und Bot machen keine Schrittgeräusche — nur Monster und man
  selbst.
- Die Occlusion kennt nur Wände, Fenster und Türblätter des Snapshots, keine
  Einrichtung; Schächte sind akustisch nicht verbunden.
- Der Browser-Smoke prüft keinen Ton.

### Offene Fragen an dich

- Soll die Wahrnehmung des Monsters (`threat.ts`, `perception.ts`,
  `roomGraph.earshot`) auf dasselbe Hörmodell umgestellt werden? Dann hört
  es genau so um Ecken wie der Spieler, nur weiter.
- Ist 9 m Hörweite für den Spieler richtig, oder soll sie je Monster-Sorte
  relativ zur dessen Hörweite liegen?
- Sollen die übrigen `ShipAudio`-Geräusche als Cues in die Registry ziehen,
  damit es ein Budget und einen Mixer gibt?

### Tests

`src/worlds/haunting/audio/*.test.ts`: Hörmodell auf der echten Station
(Luftlinie im Raum, um die Ecke durch die offene Tür mit drei Samen,
geschlossene Tür +4 m, Wand ohne Tür endlich gedämpft, geteilte Wand nur
einmal gezählt, Spieler hört kürzer als jedes Monster, monotoner Abfall,
jedes Raumpaar endlich); Regie auf zwei synthetischen Zimmern (Takte von
Gehen/Sprint/Stand, Kennung statt Zuhörer, Monster geht/rennt/ruft, nur in
Reichweite, durch die Wand leiser und bei geschlossener Tür noch leiser,
Herzschlag bei Nähe und Verfolgung, Stille im Test, Hinweise der 3D-Welt,
Nachführen klingender Stimmen); Registry-Anmeldung; Mixer mit gefälschtem
`AudioContext` (prime mit Platzhaltern, versprochener Aufnahme und Fehler,
Stimmenbegrenzung, Freigabe, Entsorgung, aus/an, Nachführen);
`HauntingAudio` in 20-Hz-Schritten. Dazu ein Test in `shipAudio.test.ts`.

## Paket nav — Navmesh / Pathfinding

Branch: `claude/navmesh-path-smoothing-jhml50` (der Auftrag nannte
`feat/navmesh`; die Browser-Session bekommt ihren Branch vom Harness und darf
auf keinen anderen pushen — siehe „Abweichungen"). Alles Neue liegt in
`src/worlds/haunting/navmesh/**`.

### Der Befund

Die Zickzack-Wege kommen aus `stationRoute` (`stationNavigation.ts`): ein A*
auf einem Raster mit **vier** Nachbarn und 0,25 m Schritt. Ein Weg schräg durch
einen Raum ist dort eine Treppe aus Viertelmetern; der Kurvenschleifer
(`softenCorners`) rundet danach jede Stufe mit drei Stützpunkten. Vom
Eingang ins Zimmer `r2` (Seed 2, 14 Räume) kamen so 243 Wegpunkte auf 61,65 m
mit 4 585° Richtungswechsel heraus. Diesen Weg laufen das Monster in 3D
(`StationNpcNavigator`), der Bot (`missionBot`) und die Drohne. Das Monster
der **2D-Welt** (`FlatRound.moveMonster`) benutzt ihn heute nicht — es geht
Raum für Raum über Türwegpunkte und hat das Problem nicht.

### Was drin ist

- **Schnurzug** (`navmesh/pathSmoothing.ts`, `pullString`): Sichtlinien-
  Verkürzung über den fertigen Rasterweg. Vom Anker aus wird der entfernteste
  Wegpunkt genommen, den eine gerade Strecke erreicht (`SegmentClear`), mit
  vier Blicken über eine verdeckte Ecke hinweg (`LOOKAHEAD`). Zwei Durchgänge:
  erst mit dem Radius der Wegsuche **plus `SMOOTH_MARGIN` (0,1 m)**, dann
  durch die übrig gebliebenen Rasterketten (Türlauf, Gasse zwischen Modulen,
  Gang mit versetzten Türen) mit dem Radius allein (`PullOptions.tight`). Eine
  Abkürzung aus dem ersten Durchgang wird im zweiten nie wieder enger gezogen.
  Strecken zwischen benachbarten Rasterpunkten bleiben unangetastet — die hat
  der A* schon geprüft. Der Weg wird dadurch nie länger und nie enger als das
  Raster.
- **Abstandsprüfung über die 2D-Welt** (`navmesh/snapshotClearance.ts`,
  `snapshotSegmentClear`): dieselbe `SegmentClear`-Form, aber gegen
  `MapSnapshot.walls` und geschlossene Türblätter — die Geometrie aus dem
  Contract des Pakets `map`. Heute die zweite, unabhängige Prüfung in den
  Tests; morgen die Prüfung, mit der `FlatRound` denselben Schnurzug bekommen
  kann.
- **Andockung** in `stationRoute`: Der Schnurzug läuft **vor** dem
  Kurvenschleifer, der dann nur noch echte Ecken rundet. Der Vertrag des
  Pakets steht in `navmesh/index.ts`.

### Messung — dieselben Start-Ziel-Paare vorher und nachher

Drei Stationen (Seeds 2, 9, 1009, je 14 Räume), Radius 0,45 m; je Station
vom Eingangsraum in jedes Zimmer, von der Zentrale zum Eingang und quer vom
letzten ins erste Zimmer — 45 Paare. „Punkte" ist der gelieferte Weg
**einschließlich** der Bogenstützen des Kurvenschleifers (alle 12 cm; die
gibt es weiterhin, nur nicht mehr an jeder Treppenstufe). „Drehung" ist die
Summe aller Richtungswechsel — das Maß für Zickzack, das die Länge allein
nicht zeigt. Tabelle mit `NAV_METRICS=1 npx jest stationSmoothing`.

| Seed | Start → Ziel | Länge vorher (m) | Länge nachher (m) | Punkte vorher | Punkte nachher | Drehung vorher (°) | Drehung nachher (°) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | r0 → r1 | 37.82 | 37.80 | 44 | 40 | 251 | 203 |
| 2 | r0 → r2 | 61.65 | 57.66 | 243 | 98 | 4585 | 441 |
| 2 | r0 → r3 | 60.88 | 58.92 | 110 | 68 | 1975 | 424 |
| 2 | r0 → r4 | 31.34 | 31.10 | 37 | 33 | 261 | 125 |
| 2 | r0 → r5 | 73.48 | 71.72 | 93 | 47 | 1435 | 334 |
| 2 | r0 → r6 | 70.07 | 67.33 | 120 | 72 | 1665 | 329 |
| 2 | r0 → r7 | 42.50 | 42.50 | 1 | 1 | 0 | 0 |
| 2 | r0 → r8 | 25.82 | 25.59 | 44 | 40 | 348 | 211 |
| 2 | r0 → r9 | 42.32 | 39.79 | 128 | 82 | 2058 | 490 |
| 2 | r0 → r10 | 56.77 | 52.89 | 215 | 133 | 4128 | 560 |
| 2 | r0 → r11 | 44.42 | 42.64 | 75 | 54 | 1665 | 142 |
| 2 | r0 → r12 | 69.19 | 67.70 | 70 | 23 | 1125 | 90 |
| 2 | r0 → r13 | 60.70 | 57.74 | 139 | 69 | 2385 | 192 |
| 2 | command → r0 | 13.14 | 11.35 | 62 | 31 | 1130 | 112 |
| 2 | r13 → r0 | 59.35 | 58.22 | 101 | 52 | 1337 | 212 |
| 9 | r0 → r1 | 37.88 | 36.88 | 50 | 20 | 611 | 79 |
| 9 | r0 → r2 | 63.21 | 59.34 | 228 | 108 | 4045 | 461 |
| 9 | r0 → r3 | 62.63 | 61.56 | 80 | 67 | 1255 | 399 |
| 9 | r0 → r4 | 31.34 | 31.10 | 37 | 33 | 261 | 125 |
| 9 | r0 → r5 | 74.49 | 72.50 | 123 | 70 | 2065 | 335 |
| 9 | r0 → r6 | 70.00 | 67.50 | 131 | 72 | 2025 | 333 |
| 9 | r0 → r7 | 42.50 | 42.50 | 1 | 1 | 0 | 0 |
| 9 | r0 → r8 | 25.82 | 25.59 | 44 | 40 | 348 | 211 |
| 9 | r0 → r9 | 42.28 | 40.26 | 112 | 95 | 1337 | 555 |
| 9 | r0 → r10 | 57.18 | 54.05 | 183 | 95 | 3407 | 437 |
| 9 | r0 → r11 | 44.38 | 42.63 | 73 | 54 | 1485 | 149 |
| 9 | r0 → r12 | 69.24 | 67.70 | 70 | 23 | 1305 | 90 |
| 9 | r0 → r13 | 60.89 | 57.98 | 149 | 79 | 3015 | 192 |
| 9 | command → r0 | 13.14 | 11.35 | 62 | 31 | 1130 | 112 |
| 9 | r13 → r0 | 59.15 | 57.86 | 91 | 59 | 1150 | 205 |
| 1009 | r0 → r1 | 37.88 | 36.88 | 50 | 20 | 611 | 79 |
| 1009 | r0 → r2 | 62.28 | 58.47 | 257 | 104 | 4585 | 454 |
| 1009 | r0 → r3 | 61.62 | 59.35 | 115 | 92 | 1885 | 416 |
| 1009 | r0 → r4 | 31.34 | 31.10 | 37 | 33 | 261 | 125 |
| 1009 | r0 → r5 | 74.04 | 72.09 | 128 | 69 | 2155 | 335 |
| 1009 | r0 → r6 | 70.09 | 67.50 | 122 | 72 | 1665 | 333 |
| 1009 | r0 → r7 | 42.50 | 42.50 | 1 | 1 | 0 | 0 |
| 1009 | r0 → r8 | 25.82 | 25.59 | 44 | 40 | 348 | 211 |
| 1009 | r0 → r9 | 42.45 | 40.00 | 118 | 83 | 1878 | 524 |
| 1009 | r0 → r10 | 56.75 | 53.01 | 193 | 123 | 3048 | 584 |
| 1009 | r0 → r11 | 44.34 | 42.54 | 73 | 44 | 1485 | 132 |
| 1009 | r0 → r12 | 69.77 | 68.75 | 46 | 43 | 765 | 90 |
| 1009 | r0 → r13 | 61.58 | 59.83 | 79 | 77 | 1215 | 185 |
| 1009 | command → r0 | 13.14 | 11.35 | 62 | 31 | 1130 | 112 |
| 1009 | r13 → r0 | 59.29 | 58.05 | 92 | 82 | 1330 | 205 |
| Σ | 45 Paare | 2256.49 | 2178.79 | 4333 | 2604 | 70140 | 11335 |

Über alle Paare: Länge −3,4 %, Punkte −40 %, Drehung −84 %. Die Länge fällt
wenig, weil der Rasterweg ohnehin durch dieselben Türen muss und ein
Großteil jeder Strecke gerader Gang ist; was fällt, ist das Wackeln. Kein
Paar wurde länger (Test). Die Rechenzeit je Weg sinkt leicht (≈ 65 → ≈ 58 ms
in Jest, Seed 2, 14 Räume, kalter Cache je Aufruf), weil der Kurvenschleifer
weniger Ecken bekommt.

### Kollisionsfreiheit

`navmesh/stationSmoothing.test.ts` prüft jeden geglätteten Weg zweimal, mit
Geometrien, die voneinander nichts wissen: gegen die Quader der 3D-Welt
(Wände, Türrahmen aus `housePlan(spec).solids()`, Module aus `stationLayout`)
mit dem Kapseltest `routeBlocked` beim Radius — und gegen die Raumwände des
`MapSnapshot` (`wallSegments(spec)`) mit Radius plus halber Wanddicke. Dazu:
Jede Türkreuzung liegt so mittig, dass der Körper in die 1,2 m passt, und
schneidet die Türlinie mit höchstens 20° zur Senkrechten — eine Abkürzung
passt mit Radius plus Spielraum nur in ±5 cm um die Mitte, ohne Spielraum in
±15 cm. Eine geschlossene Tür wird weiterhin nicht gekürzt (Teilweg endet
davor), die Drohne (Radius 0,22, fliegt über niedrige Module) bekommt
dieselbe Glättung und bleibt frei.

### Entscheidungen und Alternativen

- **Sichtlinie statt Trichter.** Der Funnel-/String-Pulling-Algorithmus
  braucht eine Folge konvexer Polygone mit gemeinsamen Portalen. Die Räume
  sind zwar Rechtecke, aber mit Schränken, Konsolen und Fracht darin — nicht
  konvex frei —, und die Wegsuche selbst kennt nur ein Raster und Quader.
  Zu dieser Datenstruktur passt der Strahl gegen dieselben Quader
  (`segmentClear`, jetzt mit wählbarem Radius); ein Portalnetz daneben wäre
  eine zweite Geometrie, die mit der ersten in Deckung zu halten wäre. Für
  die 2D-Welt allein (Räume ohne Module) wäre der Trichter über die Türen
  exakt; sobald sie Module bekommt, gilt dort dasselbe Argument.
- **Zwei Durchgänge statt einem Radius.** Nur mit Spielraum blieben in
  Gängen mit versetzten Türen und in Gassen zwischen Modulen Treppen stehen
  (Drehung −71 % statt −84 %); nur ohne Spielraum streifte jede Abkürzung
  Ecken mit genau dem Radius. Jetzt: Luft, wo Luft ist; sonst der Radius,
  mit dem auch das Raster gültig war.
- **`SMOOTH_MARGIN` = 0,1 m.** Mehr, und keine Abkürzung käme mehr durch
  eine Gasse (`LANE` = Radius + 0,13); weniger, und man sieht das Monster
  Ecken schneiden.
- **Der Kurvenschleifer bleibt, wie er war** (Bögen mit dem Radius allein,
  Stützpunkte alle 12 cm). Er ist der Grund, warum „Punkte nachher" nicht
  stärker fällt: Jede echte Ecke kostet weiterhin bis zu 20 Stützpunkte.
  Ihn mit Spielraum rechnen zu lassen, nähme den Bogen an jeder Türlaufecke
  weg (die Kette liegt dort ohnehin näher als der Spielraum) — das wäre für
  die Drohne ein Rückschritt.
- **`stationRoute` bekommt ein optionales `smooth = true`.** Nur damit sich
  vorher und nachher auf denselben Paaren messen lassen; kein Aufrufer
  setzt es.

### Fremde Dateien, die ich angefasst habe (Minimaländerungen)

- `src/worlds/haunting/stationNavigation.ts` (Grenzfall Paket nav): ein
  Import, ein optionaler siebter Parameter `smooth`, ein `radius`-Parameter
  mit Vorgabe an `segmentClear`, ein Aufruf von `pullString` vor
  `softenCorners`. Kein Refactor.
- `HANDOVER.md`: dieser Abschnitt.

### Abweichungen

- **Branch.** Entwickelt auf `claude/navmesh-path-smoothing-jhml50` statt
  `feat/navmesh`: Diese Session bekommt ihren Branch zugewiesen und darf auf
  keinen anderen pushen (AGENTS.md, „Sessions, die nicht auf `main` pushen
  dürfen"). Der Umweg wird zu Ende gegangen: PR, grüne CI, Merge, Branch weg.
- **Tests importieren `map`-Dateien direkt** (`map/geometry`,
  `map/mapSnapshot`) statt über `map/index.ts`: Der Index zieht `flatMode.ts`
  und damit CSS, und das bricht Jest (steht so in BOUNDARIES.md). Der Code
  selbst importiert von `map/index.ts` nur Typen.
- **2D-Monster unverändert.** `FlatRound.moveMonster` (Paket map) nutzt
  keine Wegsuche, sondern Raumkarte und Türwegpunkte; die Glättung greift
  dort nicht, und der Auftrag verlangte keine Andockung. `snapshotSegmentClear`
  liegt bereit, falls das Monster der 2D-Welt einmal `stationRoute` bekommt.

### Offene Fragen an dich

- **Vorplatzhülle der Karte.** `map/extract.ts` (`apronWalls`) setzt die
  Schleusenlücke an die **Nordkante** des Vorplatzes (`z0`); in den drei
  gemessenen Stationen liegt die Haustür an der **Südkante** (`z1`, −52,5 m).
  Der Weg von der Zentrale zum Eingang schneidet auf der Karte daher ein
  „Fenster" — vorher wie nachher, also nichts, was die Glättung verursacht.
  Ich habe die Vorplatzhülle deshalb aus der Kartenprüfung gelassen und
  nichts am Paket `map` geändert. Gehört ans Paket `map`.
- **Soll das Monster der 2D-Welt** denselben Weg bekommen wie in 3D
  (`stationRoute` + Schnurzug statt Raum für Raum)? Dann lässt sich die
  Glättung auch in der 2D-Welt *sehen*, nicht nur messen.
- **Punkte je Ecke.** Wenn 20 Stützpunkte je Bogen für das Monster zu viel
  sind (die Drohne braucht sie), wäre ein eigener Schleifer mit weiterem
  Abstand der nächste Schritt — nicht in diesem Auftrag.

### Tests

`src/worlds/haunting/navmesh/pathSmoothing.test.ts` (Schnurzug, Blick über
die Ecke, zweiter Durchgang, Abstandsrechnung, Snapshot-Prüfung) und
`stationSmoothing.test.ts` (45 Paare: vollständig, nie länger, frei nach
beiden Geometrien, Türkreuzungen, Drohne, geschlossene Tür). Die bestehende
`stationNavigation.test.ts` läuft unverändert.

## Paket world3d — 3D-Welt / Kleinkram

Branch `feat/world-3d` — in dieser Session vom Harness als
`claude/world-3d-passthrough-signs-24ycry` vergeben. Alles Neue liegt in
`src/worlds/haunting/world3d/**`.

### Was drin ist

- **Weltraum statt Passthrough** (`world3d/spaceBackdrop.ts`). Ursache des
  Fehlers: `App.enterVR` fragt für jede Welt **zuerst** `immersive-ar` an
  (damit der AR-Knopf im Schießgang funktioniert). Auf der Quest meldet
  diese Sitzung `environmentBlendMode: 'alpha-blend'`, und three.js
  (`WebGLBackground.render`) löscht dann **grundsätzlich auf durchsichtig**
  — eine `scene.background`-Farbe wird ausdrücklich übergangen, damit das
  Kamerabild durchkommt. Haunting hatte draußen aber nur diese Farbe
  (`skyColor`) und 960 Punkte à 16 cm in 100 m Entfernung, kleiner als ein
  Pixel. Durch jedes Hüllenfenster war deshalb das Wohnzimmer zu sehen.
  Behoben, indem der Weltraum **Geometrie** ist: eine Kugel von innen
  (`BackSide`, undurchsichtig, dieselbe Farbe wie `skyColor`) und 1400
  Sterne als `Points` mit fester Pixelgröße, beide mit `renderOrder` nach
  der Hülle, damit der Tiefentest verdeckte Fragmente verwirft. Zwei
  Draw-Calls, in VR, AR und am Schreibtisch dasselbe Bild.
- **Wegweiser** (`world3d/signposts.ts`, reine Rechnung; `world3d/signMesh.ts`,
  three.js). Über **jeder Öffnung** zwischen zwei Räumen hängt auf beiden
  Seiten ein Schild mit dem Namen dessen, was dahinter liegt. Öffnungen sind
  die Türen aus `spec.doors`; Türen zwischen zwei Gängen (der Generator legt
  an einer Kreuzung eine je Kachel) fallen zu **einem** Kreuzungsstück mit
  einem breiteren Schild zusammen. Führt die Öffnung in einen Gang, steht
  darunter, wohin er führt: die Räume mit Tür an diesem Gang (Räume vor
  Gängen, höchstens vier, dann `+n`), ohne den Raum, in dem man steht. Die
  Namen kommen aus `map/extract.roomsOf` — exakt die der 2D-Karte, samt
  „Einsatzzentrale" für den Vorplatz.
- **Budget**: alle Texte in **einem** Canvas-Atlas (512×80 je Schild, vier
  Spalten), **ein** Material, **ein** Mesh je Raum (`wayfinding-signs`), das
  in der Raumgruppe der Hülle hängt und mit ihr vom Raum-Culler abgeschaltet
  wird. Auf der Station sind das 68 Schilder in 28 Meshes; sichtbar sind
  meist zwei bis vier. Das Schild der Zentrale hängt in `station-command-hull`.
- **Platzierung**: Band 2,40–2,74 m über dem Türkopf (Statusleuchte der
  Schiebetür bis 2,30 m, Rohr bei 2,38 m bleiben frei), 0,365 m vor der
  Wandmitte wie die bestehenden Raumschilder. Die Höhe folgt der Breite (1,7 m
  über einer Tür, bis 2,4 m über einer Kreuzung).
- **Registry**: `world3d/world3d.register.ts` meldet den Weltraum als
  `model`-Asset an. Eingebaut wird er trotzdem direkt in `shipArt.buildShip`,
  weil noch niemand Modelle aus der Registry abholt.

### Fremde Dateien, die ich angefasst habe

- `src/worlds/haunting/shipArt.ts` (Grenzfall world3d): drei Imports, die
  Punktwolke durch `buildSpaceBackdrop(spec)` ersetzt, die Schilder-Meshes in
  die Raumgruppen gehängt (`signAccent` dazu), und die beiden
  **Raumschilder** (`room-identification`) rücken auf die türfreie Kachel,
  die der Wandmitte am nächsten liegt (`closedTileX`) — vorher standen sie
  auf der Wandmitte, also oft genau über einer Tür, wo jetzt der Wegweiser
  hängt (und wo sie schon vorher die Statusleuchte der Tür verdeckten). Auf
  einer ganz offenen Wand (Kreuzung) entfällt das Raumschild.
- `src/worlds/haunting/shipArt.test.ts`: der Raumschild-Test erwartet jetzt
  ein Schild je geschlossener Nord-/Südwand und prüft, dass keines über einer
  Tür oder einem Fenster hängt.
- `AGENTS.md`: ein Absatz im Haunting-Abschnitt (Weltraum, Wegweiser).
- `HauntingWorld.ts`, `house.ts`, `map/**`: **nicht** angefasst.

### Entscheidungen und Alternativen

- **Geometrie statt Sitzungswahl.** Die Alternative wäre, in `App.enterVR`
  (`src/core/**`, nicht mein Abschnitt) `immersive-vr` zu verlangen, sobald
  eine Welt keinen Passthrough will. Das ginge nur beim Start der Sitzung,
  nicht beim Weltwechsel durch ein Portal, und es nähme dem Schießgang seinen
  AR-Knopf. Eine Welt, die einen Himmel hat, zeichnet ihn — dann ist die
  Sitzungsart egal.
- **Schilder nur an Öffnungen, nicht frei im Gang.** „Kreuzung" ist im
  Grundriss immer die Stelle, an der zwei Gangrechtecke aneinanderstoßen
  (`spec.passages` überlappen nicht); dort hängt das Schild über der
  offenen Wand. Ein hängender Wegweiser mitten im Gang hätte eigene
  Aufhängung, Kollision mit der Drohne und eine zweite Datenquelle gebraucht.
- **Eine Zeile je Ziel, keine Pfeile.** Das Schild hängt über dem Durchgang,
  den es meint; ein Pfeil sagte nichts, was die Position nicht schon sagt.
  Pfeilglyphen in `system-ui` wären auf der Quest außerdem nicht garantiert.
- **`roomsOf` aus `map/extract` statt aus `map/index`.** `map/index.ts`
  reexportiert `FlatMode`, das CSS importiert — ein statischer Import bricht
  Jest (`HANDOVER` des Pakets map sagt das selbst). `HauntingWorld` macht es
  genauso. Sobald der Index CSS-frei ist, kann der Import wandern.

### Offene Fragen an dich

- Die **Raumschilder** liegen jetzt neben der Tür statt auf der Wandmitte.
  Wenn das Bild dadurch unruhig wirkt, ist die Alternative, sie an die
  Ost-/Westwand zu hängen (dort gibt es keine) statt sie zu verschieben.
- Der Weltraum ist eine einfarbige Kugel plus Sterne. Ein Planet oder Nebel
  (eine Textur auf der Kugel, weiterhin ein Draw-Call) ist ein kleiner Schritt,
  aber Geschmack — bitte sagen, ob gewünscht.
- Nicht auf der Brille gemessen: Ich hatte keine Quest. Zwei zusätzliche
  Draw-Calls und ein 2048×1360-Atlas sollten die 72 Hz nicht berühren; die
  Zahl gehört trotzdem in `docs/orbital-qa.md`, sobald jemand misst.

### Tests

`src/worlds/haunting/world3d/*.test.ts` — Ableitung der Wegweiser (jede
Öffnung zwei Schilder, Namen gleich denen der Karte, im eigenen Raum vor der
richtigen Wand, nie überlappend, Ziel-Liste ohne den eigenen Raum, Kreuzungen
zusammengefasst; Station mit zwei Samen und das alte Haus), das Mesh (ein
Material und ein Atlas für alle, ein Mesh je Raum, Band über dem Türkopf,
Vorderseite in den Raum) und der Weltraum (undurchsichtig, von innen, nach
der Hülle gezeichnet, Sterne in Pixeln, gleichverteilt, deterministisch).

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
