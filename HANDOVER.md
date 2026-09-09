# HANDOVER

Ein Abschnitt je Paket (`BOUNDARIES.md`). Beim Zusammenführen werden die
Abschnitte untereinander gehängt.

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
