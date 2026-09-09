# HANDOVER

Ein Abschnitt je Paket (`BOUNDARIES.md`). Beim Zusammenführen werden die
Abschnitte untereinander gehängt.

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

### Stand je Etappe

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
