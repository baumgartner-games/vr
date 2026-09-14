# Plan: Von oben spielen — Hub, Tor, Testwelt „Straßenküche"

Stand: September 2026, **Fassung 2**. Die erste Fassung wollte die
Overcooked-Optik in Phaser mit abgelichteten Sprites nachbauen; das war ein
Missverständnis. Gemeint ist, was Overcooked wirklich ist: **eine 3D-Szene
aus fester Schrägsicht**, und darunter ein **2D-Gitter mit mehreren Ebenen**,
das sagt, wo alles steht. Genau dieses Gitter gibt es hier schon
(`worlds/grid/`), und die 3D-Szene auch. Was fehlt, ist die Kamera von oben,
die Steuerung dazu, und zwei Welten, die darauf gebaut sind.

Dieses Dokument ist ein **Arbeitsplan für Sub-Agenten** (Opus): neun Pakete,
jedes mit Zweck, Eigentum, Schnittstelle, Abnahme und einem Auftragstext, den
man unverändert weitergeben kann. Wer ein Paket nimmt, liest zuerst diese
Datei ganz, dann `AGENTS.md` (mindestens _Arbeitsregeln_, _Welten auf dem
Kachelgitter_, _Eine neue Welt hinzufügen_, _Zuschauen_), dann den Code, der
im Paket steht.

## Stand

**Fertig.** Alle neun Pakete sind auf `main`: P0 (#127), P1 (#128), P3 (#129),
P2 (#130), P5 (#131), P4 (#132), P7 (#133), P6 (#134) und dieses Aufräumen
(#135). _Von oben_ ist eine Kamera über der echten Szene (E1), es gibt nur das
eine Kachelgitter (E2), Phaser und `src/world2d/` sind weg (E3), gelaufen wird
in Weltrichtungen (E4), `A`/`E` benutzt über `core/usable.ts` (E5), alles mit
Zustand ist ein Einbau in `grid/fixtures/` (E6), der Hub ist eine Gitterwelt
mit Toren als Einbauten (E7), Ebenen über dem Spieler werden aufgeschnitten
(E8), und keine einzige Bilddatei ist dazugekommen (E9). Beschrieben ist das
alles in AGENTS.md — _Von oben: dieselbe Welt, eine Kamera_, _Welten auf dem
Kachelgitter → Einbauten_, _Was drin ist → Straßenküche_ —, nicht hier. Dieses
Dokument bleibt als Dokument der **Entscheidungen** liegen.

**Was bewusst offen blieb**, aus den Meldungen der Pakete:

- **Passanten über den Zebrastreifen** (P5, Punkt 5): weggelassen. Ein
  Wegpunkt-Hirn für Passanten ist mehr als die Stunde, die dafür stand; NPCs
  lassen sich in jeder Welt über das Menü setzen.
- **Vom Einbau lässt sich im Bauplatz nur `target` eintippen** (P3). Die
  übrigen Eigenschaften (`mode`, `hold`, `effect`, `burst`, …) stehen im
  Weltformat und im Quelltext der Welten, aber noch nicht in der Palette.
- **Die Kochmechanik von _Overcooked_** war nie gemeint (siehe _Das
  Referenzbild, in Worten_): Aus dem Bild zählt die Anordnung und der Ton, und
  die Straßenküche ist eine Testwelt für Türen, Knöpfe, Treppen und Effekte.
- **Haunting behält seine eigene Runde von oben** (`World.ownsFlat`) und wurde
  von keinem Paket angefasst — so stand es in der Aufgabe und so ist es
  geblieben.
- **Der Zoom hat vier Stufen und keinen stufenlosen Weg dazwischen** (P0, E1);
  ob perspektivisch richtig war, ist entschieden (ja, sonst fielen Podest und
  Boden darunter auf denselben Fleck) und braucht keine zweite Runde.

## Was gewünscht ist, in vier Sätzen

1. **Overcooked-Optik heißt 3D von oben.** Feste Kamera schräg über der Szene
   (rund 55° Neigung, Norden oben), rundliche Formen, satte Farben, weiche
   Schatten, kleine Figuren mit großem Kopf. Keine Pixel, keine Sprites.
2. **Der Hub ist die Startwelt** — auf dem Kachelgitter gebaut, von oben
   gespielt, mit einem **Tor** in jede Welt, vor allem in die Testwelt.
3. **Die Testwelt** ist die Straßenkreuzung aus dem Referenzbild (siehe
   unten): Küchenzeilen, Marktstände, Zebrastreifen — und darin **Türen,
   Druckknöpfe, Druckplatten, Treppen und Effekte** zum Ausprobieren.
4. **Steuerung wie auf der Konsole**: linker Stick läuft, **rechter Stick
   zielt** mit der Waffe, **A** benutzt, **B** schießt. Tastatur und Maus
   tun dasselbe; das Telefon bekommt es nach.

## Das Referenzbild, in Worten

Overcooked, Straßenlevel, von schräg oben. Die Szene ist ein Kreuzungsstück
mit Bordsteinen, gelben Mittellinien und einem breiten **Zebrastreifen** in
der Mitte. Links und rechts davon **Küchenzeilen** aus hellem Holz, L-förmig:
links eine lange Zeile mit zwei **Herdplatten** (roter Sockel, Kochtopf
darauf), rechts eine kurze Zeile mit Feuerlöscher und Mülleimer, darunter
Teller und drei **Zutatenkisten** (Pilz, Tomate, Zwiebel). Unten links eine
Zeile mit Schneidbrettern. Am Rand **Marktstände** mit gestreiften Markisen
(blau-weiß, rot-weiß), ein Spülbecken, Parkbänke, Verkehrshüte, Blumenkübel,
ein grüner Lieferwagen, Tauben. Die Figuren sind Köche mit Mütze, Kopf so
groß wie der Rumpf; Passanten laufen über den Zebrastreifen und stehen im
Weg. Oben links die Bestellungen, unten rechts die Uhr.

Für die Testwelt zählt davon **die Anordnung** (Kreuzung, Zeilen, Stände am
Rand, ein freier Platz in der Mitte) und **der Ton** (hell, Holz und Beton,
gestreifte Markisen, Comic-Umriss) — nicht die Kochmechanik.

## Was heute da ist

- **Das Kachelgitter mit Ebenen** (`worlds/grid/`): `GridPlan` mit
  `levels` (Stockwerke), `floor`, `room`, `wall`, `door`, `window`,
  `put(block)`, `stairs` (Baustein, Deckenloch und Graphweg in einem),
  `mass`; zwölf Bausteine (`blocks.ts`: Küchenzeile, Regal, Tisch, Bank,
  Kisten, Säule, Geländer, Brüstung, Treppe, Rampe, Podest, Portaltafel);
  Schiebetüren im Gitter (`slidingDoor.ts`, `GridWorld.setSlidingGridDoor`);
  ein Weltformat mit Fassung (`worldFile.ts`); der **Editor** beim Bauplatz
  (`editor/WorldEditor.ts`). **Eine Kachel ist 2,5 m.** Der Plan _ist_ der
  Navigationsgraph, NPCs laufen darauf.
- **Das Interaktionslabor in 3D** (`worlds/interact/`): Schiebetür,
  zweiflügelige Drehtür, Plattentür; roter Knopf (`shared/redButton.ts`),
  Hebel, Kippschalter, Druckplatte; die Türmathematik ohne three.js in
  `doorMotion.ts`. Gebaut in Metern auf `PortalWorld`, **nicht** auf dem
  Gitter.
- **Effekte** (`worlds/effects/`): Rauch, Feuer, Funken, Wasser als Zahlen
  (`effectKinds.ts`), gezeichnet von `Burst.ts`, ausgelöst vom roten Knopf.
- **Der Hub in 3D** (`worlds/hub/`): runde Halle, Gänge, vier Tore je Gang,
  ausgelegt aus der Länge der Weltenliste (`hubLayout.ts`). Nicht auf dem
  Gitter.
- **Kameras**: die Brille, die Desktop-Kamera im Rig (`FlatControls`: Maus
  dreht, WASD läuft in Blickrichtung), die Zuschauerkamera
  (`net/SpectatorCamera.ts`: `free`, `first`, `third` — über der Schulter,
  mit Glättung und Abstand). Der eigene Körper (`core/PlayerAvatar.ts`) liegt
  auf `LAYER_SELF_ONLY` und wird nur von Portalsichten gezeichnet.
- **„2D" heute**: Phaser zeichnet eine eigene Kachelwelt (`src/world2d/`,
  1-m-Kacheln, gemalte 16-px-Sprites) über dem WebGL-Bild, das dabei nur
  geleert wird; das Rig folgt dem Phaser-Helden. Das war der Weg, der jetzt
  nicht mehr gemeint ist.
- **Eingabe**: kein Gamepad-Leser in `src/` (`navigator.getGamepads` kommt
  nicht vor). Werkzeuge sind am Bildschirm „immer bereit" (Steuerungstabelle).
  `core/Pointer.ts` zielt mit einem Strahl, `XRInput.ButtonState` kennt
  gedrückt/eben gedrückt/losgelassen.

## Entscheidungen, die vorab feststehen

**E1 — „2D" ist eine Kamera, keine zweite Welt.** Die Ansicht _Von oben_ ist
ein Kameramodus über der echten three.js-Szene: feste Neigung (55°, als
Konstante mit Kommentar), Norden oben, folgt dem Rig mit Glättung, Zoom in
Stufen (Rad, Bumper). Dieselbe Welt, in der ein anderer gerade in der Brille
steht — Türen, Kisten, NPCs, alles einmal. Ob perspektivisch mit engem
Öffnungswinkel (Overcooked: ~30°) oder orthografisch, entscheidet P0 im
Headset-freien Vergleich und schreibt es auf; Vorgabe ist **perspektivisch,
eng**, weil Höhe dann lesbar bleibt.

**E2 — Das Gitter ist das Gitter.** Es gibt genau ein 2D-Gitter mit Ebenen,
und das ist `GridPlan` (2,5-m-Kacheln, Stockwerke als `levels`). Kein zweites
in 1 m. Neue Welten für dieses Vorhaben erben von `GridWorld` und schreiben
`layout()`. Der Maßstab bleibt der der VR-Welten — eine Figur ist 1,8 m, eine
Kachel 2,5 m, die Kamera steht einfach höher als in Overcooked.

**E3 — Phaser geht.** `src/world2d/` (Phaser, `level.ts`, `tiles.ts`,
`hero.ts`, `sample.ts`, `Editor.ts`) war der Weg zu einer zweiten Wahrheit
und wird am Ende entfernt, samt Abhängigkeit in `package.json` (P8). Bis
dahin bleibt der Code liegen und wird nur nicht mehr angezeigt (P0 hängt die
Ansicht um). Was daran gut war — Karte, Palette, Malen — hat das Gitter
schon (`editor/WorldEditor.ts`, `MapTool`).

**E4 — Von oben steuert man die Figur, nicht den Kopf.** In der Ansicht
_Von oben_ läuft das Rig in **Weltrichtungen** (oben = Norden = −Z), über
dieselbe Physik wie am Desktop (`PhysicsLocomotion`), und der eigene Körper
ist sichtbar. Der rechte Stick setzt die **Drehung** des Rigs (Yaw); das
Werkzeug in der Hand zeigt dorthin. Nicht gezielt heißt: Die Figur schaut,
wohin sie läuft (Twin-Stick-Regel). Ein Weg für die Eingabe: `FlatControls`
liest Tasten, Maus, Touch und Gamepad und schreibt **eine** Absicht.

**E5 — Benutzen ist ein kurzer Strahl nach vorn.** `A` (oder `E`, Enter,
Touch-A) prüft mit einem Strahl aus der Brust der Figur (1,5 m, als
Konstante) und mit dem Überlappen der Füße, was da ist, und ruft dessen
`use()`. Welche Dinge das können, sagt eine kleine Schnittstelle `Usable`
(`core/usable.ts`), an die sich Knöpfe, Hebel, Türgriffe und Tore hängen —
dieselben Objekte, die in VR die Hand berührt. `B` (RT, Linksklick,
Touch-B) ist der **Trigger des Werkzeugs** in der rechten Hand, also die
Pistole, wenn sie drin ist (`weaponSettings.ts` bleibt, wie es ist).

**E6 — Einbauten sind eine Registry auf dem Gitter.** Bausteine (`blocks.ts`)
sind still. Was Zustand hat — Tür, Knopf, Hebel, Platte, Lampe, Tor,
Effektquelle —, ist ein **Einbau** (`worlds/grid/fixtures/`): eine Kachel,
eine Blickrichtung, eine Art, Eigenschaften (`target`, `hold`, …), im
Weltformat gespeichert (Fassung hoch), im Editor setzbar. Jede Art in einer
eigenen Datei, angemeldet in `fixtures/index.ts`; `GridWorld` kennt nur die
Registry (Bau, `update`, `use`, `trigger`). Die reine Logik einer Art liegt
ohne three.js daneben und hat einen Test — `doorMotion.ts` ist das Vorbild.

**E7 — Der Hub wird eine Gitterwelt, und es gibt nur einen.** Der neue Hub
erbt von `GridWorld`, legt Halle und Gänge in Kacheln aus derselben Rechnung
wie heute (`hubLayout.ts`, Meter durch 2,5) und stellt je Welt ein
**Tor** als Einbau auf. VR-Spieler und Spieler von oben stehen im selben Hub;
das Tor sieht aus wie heute (Podest, Ring in Akzentfarbe, Schild — aus
`HubWorld.ts` nach `hub/gate.ts` herausgezogen, weil die Werkzeugseite es
auch zeigt).

**E8 — Ebenen werden aufgeschnitten.** Von oben sieht man ein Stockwerk nur,
wenn darüber nichts liegt. Alles auf Ebenen **über** der des Spielers wird
ausgeblendet (Decken, Böden, Wände, Einbauten der höheren Ebene), wie in
Overcooked und den Sims; steigt der Spieler die Treppe hinauf, kommt die
nächste Ebene ins Bild. Der Graph hat die Ebene schon (`keyLevel`); die
Geometrie braucht sie als Marke am Objekt (`userData.level`), die
`GridWorld` beim Bau setzt.

**E9 — Keine Bilddateien im Repository.** Markisenstreifen, Zebrastreifen,
Holz: Farben und einfache Geometrie, notfalls eine Canvas-Textur zur
Laufzeit (`CanvasTexture`), wie beim Companion Cube. Das Referenzbild wird
nicht eingecheckt; es steht oben in Worten.

## Die Pakete

| #   | Paket                                     | Gehört ihm                                                                                                    | Hängt ab von | Parallel zu  |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------ | ------------ |
| P0  | Kamera von oben und Laufen in Weltrichtung | `core/TopDownCamera.ts`, `App.ts` (Ansicht, `step`), `FlatControls.ts` (topDown-Zweig), `PlayerAvatar.ts`      | –            | –            |
| P1  | Eingabe: Gamepad, Maus, Touch             | `core/gamepad.ts`, `FlatControls.ts` (Leser), `index.html`/`style.css` (Touch-Stick, A/B)                     | P0           | P2–P7        |
| P2  | Benutzen und Schießen                     | `core/usable.ts`, `PortalWorld.ts` (Haken `useForward`), `interact/InteractWorld.ts` (Knöpfe werden `Usable`) | P0           | P1, P3–P7    |
| P3  | Einbauten-Registry auf dem Gitter         | `grid/fixtures/**`, `GridWorld.ts` (Andocken), `worldFile.ts` (Fassung), `editor/Palette.ts` (Einbauten)      | P0           | P1, P2, P4   |
| P4  | Hub auf dem Gitter mit Toren              | `hub/HubWorld.ts` (neu auf `GridWorld`), `hub/hubGrid.ts`, `hub/gate.ts`, `fixtures/gate.ts`                   | P0, P3       | P1, P2, P5–P7 |
| P5  | Testwelt „Straßenküche"                   | `worlds/street/**`, Eintrag in `worlds/index.ts`, `stampDoors/Stairs/Effects` als Platzhalter                 | P0, P3       | P1, P2, P4, P6, P7 |
| P6  | Türen, Knöpfe, Platten als Einbauten      | `fixtures/door.ts`, `button.ts`, `lever.ts`, `plate.ts`, `lamp.ts`, `street/stampDoors.ts`                    | P2, P3, P5   | P4, P7       |
| P7  | Treppen, Ebenen, Aufschneiden; Effekte    | `fixtures/emitter.ts`, `street/stampStairs.ts`, `street/stampEffects.ts`, `TopDownCamera.ts` (Cut-away)       | P0, P3, P5   | P4, P6       |
| P8  | Aufräumen: Phaser raus, Docs              | `src/world2d/**` (löschen), `package.json`, `AGENTS.md`, `README.md`, `screenView.ts` (Wortlaut)              | alle         | –            |

Reihenfolge: **P0 zuerst und allein.** Danach P1, P2, P3 parallel. P4 und
P5 brauchen P3. P6 braucht P2, P3, P5. P7 braucht P3, P5. P8 zuletzt. Wer
als Zweiter auf `main` kommt, rebased vorher und lässt die vier Prüfungen
erneut laufen.

Was **kein** Paket tut: Haunting anfassen (`ownsFlat`, eigene Runde von
oben); die VR-Steuerung ändern; Bilddateien einchecken; das Kachelmaß
ändern; ein zweites Gitter anlegen.

---

### P0 — Kamera von oben und Laufen in Weltrichtung

**Zweck.** Die Ansicht _Von oben_ wird die echte Szene mit fester Kamera.
Alles Weitere baut darauf.

**Was zu tun ist.**

1. `core/TopDownCamera.ts`: eine `PerspectiveCamera` (Öffnungswinkel 30°,
   als Konstante) über dem Rig — Neigung 55°, Yaw 0 (Norden oben), Abstand
   nach Zoomstufe (Stufen 12 · 16 · 22 · 30 m, Vorgabe 16), Position folgt der
   Rigmitte mit einer Zeitkonstante von 0,12 s (`SmoothPose` aus
   `net/PoseSmoothing.ts` wiederverwenden). Blickziel ist der Rig, nicht der
   Kopf: Ducken und Umsehen verschieben das Bild nicht. Reine Rechnung
   (Position aus Ziel, Neigung, Abstand) in `topDownPose.ts` mit Test.
2. `App.ts`: die Ansicht `'2d'` bedeutet jetzt: `topDown` ist wahr → im
   `step` wird die Szene mit dieser Kamera gezeichnet (Spiegel und
   Portalsichten laufen weiter, sie zeichnen ja jetzt in ein Bild, das man
   sieht). Der Phaser-Zweig (`world2d.show`, `followHero`, Clear) wird
   ausgehängt — Code bleibt bis P8 liegen, wird nur nicht mehr erreicht.
   `Menü → Ansicht` zeigt _Von oben_ statt _2D — Kachelwelt_; Raster, Ebenen,
   Editor und _Plan zurücksetzen_ verschwinden aus dem Menü (der Editor der
   Gitterwelten ist ein anderer und bleibt, wo er ist). `screenView.ts`
   behält seine Kennungen `'2d' | '3d'` (Speicher, Startseite), nur der
   Wortlaut wird _Von oben_ / _Aus den Augen_ — mit Test nachziehen.
3. `FlatControls`, `topDown`-Zweig: nicht mehr `wish` schreiben, sondern
   `rig.setIntent` in **Weltrichtungen** (x rechts = Osten, z unten = Süden),
   Sprint wie am Desktop, Springen bleibt Leertaste. Die Maus dreht in
   diesem Modus **nichts** und fängt keinen Zeiger; `look()` bleibt aus wie
   heute. Die Drehung des Rigs folgt vorerst der Laufrichtung (P1 bringt den
   rechten Stick). `syncFromRig` beim Umschalten zurück auf 3D.
4. Der eigene Körper: In der Ansicht von oben zeichnet die Kamera auch
   `LAYER_SELF_ONLY` (Layer-Maske der Top-Down-Kamera), damit man sich
   sieht. Der Kopf des Avatars folgt sonst der Desktop-Kamera; hier folgt
   er dem Rig-Yaw (`PlayerAvatar` bekommt dafür einen Schalter, kleinste
   Änderung). Prüfen, dass Hände und Werkzeug in der Hand sichtbar sind —
   die Pistole soll man von oben sehen.
5. Umschalten mitten im Spiel (`Menü → Ansicht`) und von der Startseite
   (_2D_ → _Beitreten_) landen beide hier; die Brille bleibt davon unberührt
   (`topDown` ist falsch, solange `xr.isPresenting`).

**Abnahme.** `topDownPose.test.ts` (Kamera steht schräg über dem Ziel, sieht
es an, Zoomstufen rasten). Manuell: Startseite _2D_ → _Beitreten_: der Hub
(noch der alte 3D-Hub) von oben, die eigene Figur läuft mit WASD nach
Norden/Süden/Osten/Westen, das Bild folgt weich, Rad zoomt in Stufen, im
Dunkelhaus und in Dust sieht man Räume von oben. `Menü → Ansicht` wechselt
hin und zurück, und in 3D steht man, wo die Figur zuletzt stand. AGENTS.md:
der Abschnitt _Jede Welt von oben_ wird **ersetzt** durch _Von oben:
dieselbe Welt, eine Kamera_ (kurz; die Vorgeschichte in zwei Sätzen, warum
Phaser wieder geht, mit Verweis auf P8), die Steuerungstabelle nachziehen.

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` ganz und `AGENTS.md` (Arbeitsregeln,
> Jede Welt von oben, Zuschauen). Setze **Paket P0** um: die Ansicht „2D" wird
> eine feste Kamera schräg über der echten three.js-Szene
> (`core/TopDownCamera.ts`, Entscheidung E1), das Rig läuft in Weltrichtungen
> (E4), der eigene Körper ist sichtbar, der Phaser-Zweig in `App.step` wird
> ausgehängt, aber nicht gelöscht (E3, das macht P8). Menü und Startseite
> zeigen den neuen Wortlaut. Reine Kamerarechnung mit Test. Ändere nichts
> an Gamepad, Benutzen, Hub oder Gitter — andere Pakete. Vier Prüfungen,
> AGENTS.md nachziehen, Branch → PR ohne Draft → grün → selbst mergen →
> Branch löschen. Melde am Ende, welche Schnittstellen die anderen Pakete
> jetzt benutzen können.

---

### P1 — Eingabe: Gamepad, Maus, Touch

**Zweck.** Rechter Stick zielt, A benutzt, B schießt — auf jedem Gerät.

**Was zu tun ist.**

1. `core/gamepad.ts`: liest `navigator.getGamepads()` je Bild (Standard-
   Mapping: Sticks 0/1 und 2/3, A = 0, B = 1, RB/LB = 5/4 für Zoom, RT = 7,
   LS-Druck = 10 Sprint), Totzone 0,2 mit Skalierung darüber; reine
   Funktion `readGamepad(pad): GamepadFrame` mit Test (Totzone, Normierung,
   fehlende Achsen, kein Pad).
2. `FlatControls` bekommt eine Absicht `Intent2D` (intern): laufen (linker
   Stick, WASD, Touch-Stick), **zielen** (rechter Stick; Maus relativ zur
   Schirmposition der Figur — die liefert `TopDownCamera.project(rig)`;
   Touch-Zielstick), `use` (A, E, Enter, Touch-A), `fire` (B, RT, Linksklick,
   Touch-B), Zoom (RB/LB, Rad). Flanken über `ButtonState` aus `XRInput.ts`
   (exportieren, nicht kopieren). Beim Zielen setzt `FlatControls` den Yaw
   des Rigs auf die Zielrichtung; ohne Zielen folgt der Yaw der
   Laufrichtung, und die **letzte Zielrichtung bleibt stehen**, wenn der
   Stick losgelassen wird (sonst zuckt die Waffe zur Mitte).
3. `use` und `fire` werden an das Rig gereicht (`rig.requestUse()`,
   `rig.setTrigger(value)`), P2 verdrahtet die Empfänger. Bis P2 auf `main`
   ist, läuft `fire` auf den bestehenden Weg, über den am Desktop schon
   geschossen wird (Linksklick, `Pointer`/Trigger der rechten Hand — prüfen,
   was heute die Pistole am Bildschirm auslöst, und **daran** andocken).
4. Außerhalb von _Von oben_ darf der Gamepad das Rig laufen lassen und
   umsehen — erlaubt, nicht verlangt; wenn, dann mit Zeile in der Tabelle.
5. Touch: rechts unten ein zweiter Stick (`#touch-aim`) und zwei runde
   Knöpfe A/B, nur sichtbar in _Von oben_ auf Touch-Geräten (`index.html`,
   `style.css` sind absichtlich nicht im Formatierer — einzeilige Regeln
   lassen). Zeiger-Ereignisse wie beim linken Stick.
6. Steuerungstabelle in AGENTS.md: Spalte _Gamepad_, Zeilen _Zielen_,
   _Benutzen_, _Schießen_, _Zoom_.

**Abnahme.** `gamepad.test.ts`. Manuell mit Xbox-/PS-Controller im Browser:
laufen, zielen (die Figur dreht sich zum Stick, die Pistole zeigt hin),
Sprint, Zoom; mit Maus: Figur schaut zum Zeiger; Telefon: beide Sticks,
beide Knöpfe. Keine Eingabe läuft an `FlatControls` vorbei.

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` und setze **Paket P1** um: ein
> Gamepad-Leser in `core/gamepad.ts` (rein, mit Test), die Zusammenführung
> von Tastatur, Maus, Touch und Gamepad in `FlatControls` zu einer Absicht
> (E4), rechter Stick und Maus setzen den Yaw des Rigs, `use`/`fire` gehen
> ans Rig, Touch-Zielstick und A/B-Knöpfe. Braucht P0 auf `main`. Vier
> Prüfungen, Steuerungstabelle in AGENTS.md, Branch → PR ohne Draft → grün →
> selbst mergen → Branch löschen.

---

### P2 — Benutzen und Schießen

**Zweck.** A tut etwas mit dem, was vor der Figur steht; B schießt mit dem,
was in der Hand ist.

**Was zu tun ist.**

1. `core/usable.ts`: Schnittstelle `Usable { use(by: UseSource): boolean; usePrompt?(): string }`
   und eine Registry am `Object3D` (`userData.usable`), dazu die reine
   Auswahl `pickUsable(candidates, origin, forward)`: was der Strahl aus
   der Brust (1,5 m) trifft, sonst was die Füße überlappen (0,6 m), das
   Nächste zuerst — mit Test.
2. `PortalWorld` (und damit jede Welt): Haken `useForward()` — vom Rig
   gerufen, wenn `requestUse` ansteht; sammelt `Usable` im Umkreis
   (Raycast gegen eine Gruppe `usables`, keine Szene-weite Suche je Bild),
   ruft `use`. Ein kurzer Hinweis über der Figur (_E: Knopf drücken_)
   ist erlaubt, wenn `usePrompt` etwas liefert — als `TextPlane`, nur in
   _Von oben_.
3. Das Interaktionslabor (`interact/InteractWorld.ts`): roter Knopf, Hebel,
   Kippschalter werden `Usable` — dieselbe Wirkung wie die Hand in VR,
   kleinste Änderung, kein Umbau. Das ist der Beweis, dass P2 ohne die
   Gitterpakete geht.
4. Schießen: `fire` wird zum Trigger der **rechten Hand** des Rigs, so wie
   der VR-Trigger — die Pistole aus dem Gürtel (`PistolTool`) feuert dann
   ohne Sonderweg. Am Desktop ist das Werkzeug „immer bereit"; prüfen, dass
   die Pistole in _Von oben_ in der Hand liegt und **entlang des Rig-Yaw**
   zeigt (die Hand ist am Desktop ans Rig gebunden — `aim.ts` und
   `toolPose.ts` sagen, wie).
5. Was ein Treffer auslöst, bleibt, wie es ist (`npcHit`, Kisten schieben);
   nur die **Knöpfe** reagieren neu auch auf Kugeln (Portal-Regel): der
   rote Knopf bekommt einen Kollisionskörper, den ein Geschoss trifft, und
   ruft sich selbst `use` — im Labor als Vorlage, die Einbauten (P6)
   übernehmen es.

**Abnahme.** `usable.test.ts` (Strahl vor Überlappung, das Nächste gewinnt,
nichts in Reichweite → null). Manuell im Interaktionslabor von oben: vor
den roten Knopf stellen, A → Tür fährt; Hebel; Kippschalter; mit B auf den
Knopf schießen. AGENTS.md: Absatz _Benutzen von oben_ im neuen Abschnitt.

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` und setze **Paket P2** um:
> `core/usable.ts` mit reiner Auswahl und Test (E5), der Haken `useForward`
> in `PortalWorld`, die Knöpfe des Interaktionslabors als `Usable`, und
> `fire` als Trigger der rechten Hand, sodass die Pistole von oben entlang
> des Rig-Yaw schießt. Kein Umbau des Labors, kleinste Andockzeilen. Braucht
> P0 auf `main`. Vier Prüfungen, AGENTS.md, Branch → PR ohne Draft → grün →
> selbst mergen → Branch löschen.

---

### P3 — Einbauten-Registry auf dem Gitter

**Zweck.** Dinge mit Zustand bekommen einen Platz im Plan, im Weltformat
und im Editor — einmal, für alle Arten.

**Was zu tun ist.**

1. `grid/fixtures/index.ts`: der Vertrag.

   ```ts
   interface FixturePlacement { id: string; kind: string; x: number; z: number; dir: Dir; level: number; props: Props }
   interface FixtureKind<S> {
     kind: string;
     init(place: FixturePlacement): S;                       // rein
     step(state: S, place: FixturePlacement, input: FixtureInput, dt: number): FixtureEvent[]; // rein
     solid(state: S): boolean;                               // hält die Kachelkante/Kachel auf?
     build(place: FixturePlacement, ctx: FixtureBuild): FixtureView; // three.js: Objekte, Körper, Usable
     apply(view: FixtureView, state: S): void;               // Zustand ins Bild
   }
   ```

   `FixtureInput = { used: boolean; hit: boolean; weightOn: number; triggered: boolean }`,
   `FixtureEvent = trigger(target) | goto(world) | sound(name) | effect(kind, at)`.
   Registrieren, doppelte Art wirft, unbekannte Art im Plan wird beim Bau
   übersprungen und gemeldet, nicht abgestürzt.
2. `GridPlan`: `fixtures()` und `putFixture(place)`; im Graphen zählt ein
   fester Einbau wie ein Baustein (`cost`/blockiert), eine Tür als
   Tür-Kante (`door(..., open)`), damit NPCs sie kennen.
3. `worldFile.ts`: Einbauten im Format, Fassung hoch, alte Dateien ohne die
   Liste lesen weiter (Test).
4. `GridWorld`: baut Einbauten nach den Bausteinen, führt ihre Zustände,
   ruft `step` je Bild mit `FixtureInput` (Benutzt: aus P2 `Usable`;
   getroffen: Kollisionskörper; Gewicht: Überlappen von Rig, NPC und
   Physikkörpern; ausgelöst: Ereignis eines anderen), verteilt Ereignisse
   (`trigger` an die Zielkennung, `goto` an `App`, `sound` an `Audio`,
   `effect` vorerst ins Leere — P7). `solid` schaltet den Körper. Beim
   Umbau im Editor werden Einbauten wie Bausteine zurückgenommen und neu
   gebaut.
5. Editor (`editor/Palette.ts`, `planPaint.ts`): eine Palettengruppe
   _Einbauten_ aus der Registry; Setzen wie ein Baustein (Kachel, Richtung);
   Eigenschaften vorerst nur `target` per Tastatur (`textEntry`).
6. Ein erstes Kind, damit die Schleife nicht leer ist: `fixtures/sign.ts`
   — ein Schild, `use` zeigt seinen Text (`App.notify`). Fünf Zeilen Logik,
   ein Test.

**Abnahme.** `fixtures/index.test.ts` (Registry), `gridPlan.test.ts`
(Einbau zählt im Graphen), `worldFile.test.ts` (Fassung, alte Datei).
Manuell im Bauplatz: Schild setzen, speichern, neu laden, A davor. AGENTS.md:
_Welten auf dem Kachelgitter_ bekommt den Absatz **Einbauten**.

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` und setze **Paket P3** um: die
> Einbauten-Registry `grid/fixtures/` nach dem Vertrag aus dem Plan (E6),
> Einbauten im `GridPlan`, im Weltformat (Fassung hoch, alte Dateien laufen
> weiter) und in der Palette des Editors, die Schleife in `GridWorld`, und
> das Schild als erstes Kind. Reine Logik ohne three.js, mit Tests. Braucht
> P0 auf `main` (nicht P2 — `used` bleibt bis dahin falsch). Vier Prüfungen,
> AGENTS.md, Branch → PR ohne Draft → grün → selbst mergen → Branch löschen.

---

### P4 — Hub auf dem Gitter mit Toren

**Zweck.** Die Startwelt ist eine Gitterwelt, und von dort kommt man
überall hin — von oben und in der Brille, im selben Raum.

**Was zu tun ist.**

1. `hub/gate.ts`: das Tor (Podest, Ring in Akzentfarbe, Scheibe, Schild) aus
   `HubWorld.ts` herausziehen — die Werkzeugseite zeigt es weiter.
2. `fixtures/gate.ts`: Art `gate`, Props `{ world, label, accent }`. Nicht
   fest. Betritt das Rig die Kachel, feuert nach **0,4 s** (Konstante mit
   Kommentar: nicht beim Vorbeigehen verschwinden) `goto`. Bild: `gate.ts`.
   Von oben zeigt das Schild nach oben lesbar (auf dem Boden vor dem Tor
   ein zweites, flaches Schild — oder das Schild neigt sich zur Kamera; das
   Paket entscheidet).
3. `hub/hubGrid.ts` (rein, mit Test): Halle und Gänge in Kacheln aus
   `hubLayout.ts` (Meter durch `TILE`), vier Tore je Gang, zwei je Seite,
   versetzt; Spawn in der Mitte, nie auf einer Torkachel; alle Tore vom
   Spawn erreichbar (über den Graphen: `findPath` oder `flowField` aus
   `nav/navPath.ts`, wie es die Grundriss-Tests der Gitterwelten tun).
4. `hub/HubWorld.ts` neu auf `GridWorld`: `layout()` aus `hubGrid`, Palette
   getönt (hell, ruhig, wie heute), `editable()` falsch, Himmel und Licht
   wie heute. Die Tore kommen **beim Bau aus `WORLDS`**, nicht aus einer
   gespeicherten Datei (E7).
5. In jeder anderen Gitterwelt ein Tor `→ Hub` nahe dem Spawn (eine Zeile in
   `layout()` je Welt: Dunkelhaus, Schießstand, Dust, Kletterhalle, Gokart,
   Bauplatz) — bei den Welten ohne Gitter (Alpen, Mond, Pizzeria, Portal,
   Labore) bleibt das Handgelenkmenü der Rückweg.

**Abnahme.** `hubGrid.test.ts` (ein Tor je Welt außer Hub, keine zwei auf
einer Kachel, alle erreichbar, Spawn frei). Manuell: von oben durch den Hub
zum Tor _Straßenküche_ (oder, solange P5 fehlt, _Dust_), drüben stehen,
zurück. In der Brille: der Hub sieht aus wie vorher, die Tore stehen in den
Gängen. AGENTS.md: der Hub-Absatz beschreibt die Gitterfassung.

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` und setze **Paket P4** um: das Tor
> als eigene Datei und als Einbau (`gate`), die Hub-Auslegung in Kacheln aus
> `hubLayout.ts` (rein, mit Test), der Hub neu auf `GridWorld` mit Toren aus
> der Weltenliste (E7), Rücktore in den Gitterwelten. Der VR-Hub darf nicht
> schlechter werden. Braucht P0 und P3 auf `main`. Vier Prüfungen,
> AGENTS.md, Branch → PR ohne Draft → grün → selbst mergen → Branch löschen.

---

### P5 — Testwelt „Straßenküche"

**Zweck.** Das Referenzbild als Gitterwelt — der Ort, an dem alles Weitere
ausprobiert wird.

**Was zu tun ist.**

1. `worlds/street/streetPlan.ts` (rein, mit Test): 24 × 16 Kacheln, eine
   Ebene, dazu ein Podest (Ebene 1) im Norden für P7. Anordnung nach dem
   Referenzbild:

   ```
   Spalten 0…23, Zeilen 0…15, Norden oben. B Bordstein/Beton, S Straße,
   Z Zebrastreifen, K Küchenzeile, H Herd (Küchenzeile + Marke), M Marktstand
   (Masse mit Markise), b Bank, k Kiste, T Tor → Hub, P Podest (Ebene 1),
   ^ Treppe hinauf, . frei.

   Z 0  B B B B B B B B B B B B B B B B B B B B B B B B
   Z 1  B P P P ^ . . . . . . . . . . . . . M M M . . B
   Z 2  B P P P . . . . M M M . . . . . . . . . . . . B
   Z 3  B . . . . . . . . . . . . . . . . . . . . . . B
   Z 4  B . K K H K H K K . . Z Z . . K K K K k . . . B
   Z 5  B . . . . . . . K . . Z Z . . K . . . . . . . B
   Z 6  B M . . . . . . . . . Z Z . . K . . . . . b . B
   Z 7  B M . . . . . . . . . Z Z . . K . . . . . . . B
   Z 8  B . . . . . . . . . . Z Z . . K . . . k . . . B
   Z 9  B . . K K K K K K . . Z Z . . K K K k k . . . B
   Z 10 B . . . . . . . . . . Z Z . . . . . . . . . . B
   Z 11 B . . . M M M . . . . . . . . . . . M M M . . B
   Z 12 B . . . . . . . . . . . . . . . . . . . . . . B
   Z 13 B . . . . . . . . . . T . . . . . . . . . . . B
   Z 14 B b . . . . . . . . . . . . . . . . . . . b . B
   Z 15 B B B B B B B B B B B B B B B B B B B B B B B B
   ```

   Die Zeichnung ist Vorgabe für die **Anordnung**, nicht für jede Kachel;
   das Paket darf verschieben, was sich beim Laufen als eng erweist, und
   sagt es im Test (Erreichbarkeit aller freien Kacheln vom Spawn bei Zeile
   12, Spalte 12 — über `flowField` aus `nav/navPath.ts`).
2. `worlds/street/StreetWorld.ts` auf `GridWorld`: Palette getönt (Beton
   hell, Holz warm, Straße dunkelgrau), Zebrastreifen und gelbe Mittellinie
   als flache Massen (E9: Farbe, keine Textur — oder eine `CanvasTexture`
   zur Laufzeit), Marktstände als Massen mit gestreifter Markise (zwei
   Farben, Streifen als Geometrie oder Canvas), Küchenzeilen aus `counter`,
   Bänke aus `bench`, Kisten aus `crate` (schiebbar: wie im Portallabor,
   `props.ts`), Verkehrshüte und Blumenkübel als kleine Props. Herdplatten:
   roter Sockel auf der Küchenzeile, ohne Funktion. Tageslicht, warmer Ton,
   Umriss (`core/outlineShell.ts`), weiche Schatten. Tor `→ Hub` bei T.
   `worldReset()` stellt die Kisten zurück.
3. Eintrag in `worlds/index.ts`: `street`, Titel _Straßenküche_, Tagline
   _Türen, Knöpfe, Treppen — von oben_, Rollen `vr`, `desktop`, `handheld`.
4. Drei Aufrufe in `layout()` als **leere Platzhalter** in eigenen Dateien
   (E8 der ersten Fassung, hier weiter gültig): `stampDoors(plan)` (P6),
   `stampStairs(plan)` und `stampEffects(plan)` (P7). Die Komponistin-Datei
   ist Grenzfall: andere schreiben dort nur ihre Aufrufzeile.
5. Zwei, drei NPC-Passanten, die über den Zebrastreifen laufen (`worlds/npc/`,
   Wegpunkte hin und zurück), sind erlaubt, wenn es in einer Stunde geht —
   sie machen den Platz lebendig und stehen im Weg, wie im Bild.

**Abnahme.** `streetPlan.test.ts` (Maße, Erreichbarkeit, Spawn frei, Tor
vorhanden). Manuell von oben: die Kreuzung sieht nach dem Bild aus, Kisten
lassen sich schieben, Tor zurück in den Hub; in der Brille begehbar.
AGENTS.md: die Welt im Abschnitt _Was drin ist_.

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` (vor allem _Das Referenzbild, in
> Worten_ und die Kachelzeichnung in P5) und setze **Paket P5** um: die
> Gitterwelt `street` mit Plan (rein, mit Test) und Welt auf `GridWorld`,
> Eintrag in der Registry, leere `stampDoors/Stairs/Effects`. Keine
> Bilddateien (E9). Braucht P0 und P3 auf `main`. Vier Prüfungen,
> AGENTS.md, Branch → PR ohne Draft → grün → selbst mergen → Branch löschen.

---

### P6 — Türen, Knöpfe, Platten als Einbauten

**Zweck.** Das Interaktionslabor, auf dem Gitter und von oben — dieselben
drei Türen, dieselben Auslöser, dieselbe Mathematik.

**Was zu tun ist.**

1. `fixtures/door.ts`: Art `door`, Props `{ mode: 'slide' | 'swing' | 'plate', time, hold }`;
   Zustand ist `DoorState` aus `interact/doorMotion.ts` (**importieren**);
   `solid = !passable(state)`; im Graphen eine Tür-Kante, deren `open` mit
   dem Zustand nachgeführt wird (NPCs kennen sie). Bild: Schiebetür fährt
   (`slideOffset`), Drehtür schwingt zweiflügelig (`swingAngle`, Scharnier
   am Rahmen), Lampe darüber (aus, gelb, grün — wie im Labor). Empfängt
   `trigger`. Die Schiebetür des Gitters (`slidingDoor.ts`) darf darin
   aufgehen, wenn das ohne Umbau geht — sonst bleibt sie, wie sie ist.
2. `fixtures/button.ts` (roter Knopf, Nachlauf; `used` **oder** `hit`),
   `fixtures/lever.ts` (rastet), `fixtures/plate.ts` (gedrückt, solange
   `weightOn > 0`: Rig, NPC oder Kiste), `fixtures/lamp.ts` (Deckenlicht:
   ein Punktlicht und ein Leuchtkörper, `trigger` schaltet). Alle mit
   `target`, alle `Usable` (P2), alle mit Ton (`sound` → `Audio`). Modelle:
   `shared/redButton.ts` wiederverwenden; Hebel und Platte klein und rund,
   mit Umriss.
3. `street/stampDoors.ts`: im Osten der Straßenküche eine kurze Wand mit den
   drei Türen (Schiebe-, Dreh-, Plattentür) und den Auslösern davor, zwei
   Kisten neben der Platte; die Lampe über der Kreuzung mit Kippschalter.
4. Das 3D-Labor (`interact/`) bleibt, wie es ist — es ist der Beweis für
   VR. Wer Zeit hat, baut es **zusätzlich** als Gitterwelt nach; das ist
   nicht Teil von P6.

**Abnahme.** Tests je Art (Tür fährt in `time`, Plattentür fällt nach `hold`,
Hebel rastet, Knopf mit Kugel); Plan-Test: hinter der Türwand nur mit
offener Tür erreichbar. Manuell von oben: alle drei Türen per Knopf, Hebel,
Platte; Kiste auf der Platte hält die Tür; Knopf aus der Ferne mit B
treffen; Licht aus und an. AGENTS.md: Absatz zu den Einbauten um die
Türen.

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` und setze **Paket P6** um: die
> Einbauten Tür (mit `doorMotion.ts` als Rechenkern, nicht kopiert), Knopf,
> Hebel, Platte, Lampe nach dem Registry-Vertrag aus P3, alle `Usable` nach
> P2, und `stampDoors` für die Straßenküche. Reine Logik mit Tests, Plan-Test
> über Erreichbarkeit. Braucht P2, P3 und P5 auf `main`. Vier Prüfungen,
> AGENTS.md, Branch → PR ohne Draft → grün → selbst mergen → Branch löschen.

---

### P7 — Treppen, Ebenen, Aufschneiden; Effekte

**Zweck.** Ein Oben, das man von oben sieht — und Rauch, Feuer, Funken aus
denselben Zahlen wie in 3D.

**Was zu tun ist.**

1. `street/stampStairs.ts`: das Podest im Nordwesten (Ebene 1, `platform`
   oder `room` auf `levels: [0, 1]`) mit `plan.stairs(...)` hinauf, oben ein
   Hebel (P6), der unten die Lampe schaltet, Brüstung am Rand (`parapet`);
   eine zweite Treppe hinauf auf Ebene 2 als Aussichtspunkt, wenn es in den
   Plan passt.
2. **Aufschneiden** (E8): `GridWorld` markiert beim Bau jedes Objekt mit
   seiner Ebene (`userData.level`, Massen mit der Ebene ihrer Unterkante);
   `TopDownCamera` blendet vor dem Zeichnen alles aus, dessen Ebene **über**
   der des Rigs liegt (Ebene des Rigs aus `keyLevel` der Kachel unter den
   Füßen, mit Hysterese auf der Treppe: die halbe Höhe), und danach wieder
   ein — in VR ändert sich nichts. Die Kamera hebt sich mit der Ebene des
   Rigs (Zielhöhe = Bodenhöhe der Ebene), weich.
3. `fixtures/emitter.ts`: Art `emitter`, Props `{ effect, size, on, burst }`;
   `trigger` schaltet um oder feuert einmal; Bild: `effects/Burst.ts` mit
   `EFFECTS` aus `effectKinds.ts` — **importieren**, keine neuen Zahlen.
4. `GridWorld` nimmt `effect`-Ereignisse anderer Einbauten an (Tür-Staub
   beim Öffnen, Funken beim Kugeltreffer auf einen Knopf, Schimmer am Tor)
   und lässt einen Einmal-Burst an der Kachel laufen.
5. `street/stampEffects.ts`: im Südosten vier Emitter (Rauch, Feuer, Funken,
   Wasser) mit je einem Knopf davor — das Effektlabor als Ecke.

**Abnahme.** Test für die Ebenenwahl des Rigs (Hysterese auf der Treppe) und
für die Ausblendliste (rein: welche Ebenen bei Rig-Ebene n unsichtbar sind).
Manuell von oben: Treppe hinauf, das Podest wird sichtbar, oben den Hebel,
unten geht das Licht; die zweite Ebene verdeckt nichts, solange man unten
ist. Knöpfe: Wolke, Feuer, Funken, Wasser; Tür-Staub. Bildrate mit allen
vier Emittern bleibt bei 60 (`Menü → Grafik → Bildrate im Bild`). AGENTS.md:
_Eine Treppe ist drei Sachen_ bekommt den vierten Satz (von oben: die
Ebene darüber verschwindet).

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` und setze **Paket P7** um: Podest
> und Treppen in der Straßenküche über `GridPlan.stairs`, das Aufschneiden
> der Ebenen über der des Spielers in der Kamera von oben (E8, rein
> getestete Ebenenwahl mit Hysterese), der Einbau `emitter` auf `Burst.ts`
> und `effectKinds.ts`, Einmal-Effekte auf Ereignisse, `stampStairs` und
> `stampEffects`. Keine neuen Effektzahlen. Braucht P0, P3 und P5 auf `main`.
> Vier Prüfungen, AGENTS.md, Branch → PR ohne Draft → grün → selbst mergen →
> Branch löschen.

---

### P8 — Aufräumen: Phaser raus, Docs

**Zweck.** Eine Wahrheit, ein Gitter, keine tote Bibliothek.

**Was zu tun ist.**

1. `src/world2d/**` löschen, `phaser` aus `package.json` und
   `package-lock.json` (`npm uninstall phaser`), `App.ts` von den Resten
   (`world2d`, `levels`, `levelFor`, `resetLevel`, `followHero`,
   `phaserLine`) befreien, `FlatControls.wish` weg, `world2d.css` weg.
   `modelSprite.ts` geht mit — der Companion Cube braucht kein Bildchen mehr,
   er steht als Modell in der Welt.
2. AGENTS.md: _Jede Welt von oben_ endgültig durch _Von oben: dieselbe
   Welt, eine Kamera_ ersetzt (P0 hat den Kern geschrieben; hier die
   Vorgeschichte in einem Absatz: Phaser war ein Umweg, warum, was daraus
   blieb — die Idee, dass das Gitter die Wahrheit ist, die aber schon in
   `worlds/grid/` wohnt). Steuerungstabelle, _Was drin ist_, README
   (Weltenliste, Steuerung) nachziehen. Die Test-Liste in AGENTS.md
   (_Die 2D-Welt als Daten_) streichen.
3. `tools/browser-smoke.mjs`: falls er 2D über Phaser prüft, auf die Kamera
   von oben umstellen (Startseite _2D_ → _Beitreten_ → ein Bild).

**Abnahme.** `npm run build` ohne Phaser-Brocken im `dist`; alle vier
Prüfungen; `npm run test:browser`. Kein `import('phaser')` mehr im Code.

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` und setze **Paket P8** um: Phaser
> und `src/world2d/` restlos entfernen (E3), `App.ts` und `FlatControls`
> von den Resten befreien, AGENTS.md und README nachziehen, Browser-Smoke
> anpassen. Braucht alle anderen Pakete auf `main`. Vier Prüfungen plus
> `npm run test:browser`, Branch → PR ohne Draft → grün → selbst mergen →
> Branch löschen.

---

## Regeln für alle Pakete

- **Branch, PR ohne Draft, selbst mergen, Branch löschen** (AGENTS.md,
  _Sessions, die nicht auf `main` pushen dürfen_). Vor dem PR auf `main`
  rebasen; nach dem Rebase die vier Prüfungen erneut. Ein offener PR ist
  kein Ergebnis.
- **Reine Logik ohne three.js, mit Test**, in eigener Datei — Türmathematik,
  Kamerapose, Auslegung, Erreichbarkeit, Ebenenwahl. Neue Suiten über zehn
  Sekunden kommen in `SLOW` (`jest.config.cjs`).
- **Eigentum nach der Tabelle.** Fremde Dateien nur mit der kleinsten
  Andockzeile, im PR gesagt. `GridWorld.ts`, `PortalWorld.ts`, `App.ts`
  sind nach P0/P3 für alle Grenzfall: neue Dinge laufen über die Registries
  (`fixtures/`, `Usable`), nicht über neue `if`-Zweige.
- **Keine Bilddateien im Repository** (E9).
- **Das Kachelmaß bleibt 2,5 m**, es gibt ein Gitter (E2), und VR wird nicht
  schlechter: Jedes Paket prüft seine Welt einmal aus den Augen (Desktop
  3D reicht, wo keine Brille da ist).
- **AGENTS.md wird mitgeschrieben**, im Ton des Bestands: was entschieden
  wurde und warum. Die Steuerungstabelle bekommt jede neue Taste.
- **Deutsch** in Kommentaren, Commits und Docs.

## Woran man am Ende sieht, dass es fertig ist

Ohne Brille, Browser, Startseite _2D_ → _Beitreten_: Man sieht sich selbst
von schräg oben in einer hellen Halle mit Gängen, in jedem Gang Tore mit
Ringen in den Farben der Welten. Mit dem Gamepad zum Tor _Straßenküche_,
kurz stehen, drüben sein: eine Kreuzung mit Zebrastreifen, Küchenzeilen,
gestreiften Marktständen, Passanten. Linker Stick läuft, rechter dreht die
Figur samt Pistole, B trifft den roten Knopf, die Schiebetür fährt auf, die
Lampe darüber wird grün. Eine Kiste auf die Platte schieben, die dritte Tür
bleibt offen. Die Treppe hinauf — das Podest erscheint, das vorher nicht im
Weg stand —, oben den Hebel, unten geht das Licht aus. In der Ecke Rauch und
Feuer per Knopf. Zurück durch das Tor `→ Hub`. `Menü → Ansicht → Aus den
Augen`: Man steht in derselben Straßenküche, dort, wo die Figur gerade
stand, und ein Freund in der Brille stand die ganze Zeit daneben.
