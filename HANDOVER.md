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
