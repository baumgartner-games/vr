# Plan: Die 2D-Welt wird spielbar — Hub, Portal, Interaktionswelt

Stand: September 2026, nach PR #124 („Jede Welt von oben ihre eigene").
Dieses Dokument ist ein **Arbeitsplan für Sub-Agenten**: acht Pakete, jedes
mit Zweck, Eigentum, Schnittstelle, Abnahme und einem fertigen Auftragstext,
den man einem Agenten (Opus) unverändert geben kann. Wer ein Paket nimmt,
liest zuerst diese Datei ganz, dann `AGENTS.md` (mindestens _Arbeitsregeln_
und _Jede Welt von oben_), dann `src/world2d/`.

## Was gewünscht ist, in vier Sätzen

1. **Nicht mehr pixelig.** Die Kachelwelt soll aussehen wie _Overcooked_:
   hochauflösend, rundlich, satte Farben, weiche Schatten, schräg von oben —
   nicht wie ein SNES-Spiel mit sechzehn Bildpunkten je Kachel.
2. **Der Hub ist die Startwelt in 2D.** Von dort führt ein **Portal** in die
   Interaktionswelt (und in jede andere Welt, die es gibt).
3. **Die Interaktionswelt** hat **Türen, Druckknöpfe, Druckplatten, Treppen
   und Effekte** — das 3D-Interaktionslabor (`worlds/interact/`), flach
   gelesen und spielbar.
4. **Steuerung wie auf der Konsole**: linker Stick läuft, **rechter Stick
   zielt** mit einer Waffe, **A** interagiert, **B** schießt. Tastatur und
   Maus tun dasselbe; das Telefon bekommt es nach.

## Was heute da ist (die Basis, an der nichts vorbei geht)

- `src/world2d/level.ts` — der Plan als Daten: `cols × rows`, drei Ebenen
  (`ground`, `objects`, `overlay`), `TILE_PX = 16`, `TILE_M = 1`, Speicher im
  Browser, `parseLevel` tolerant. **Ohne Phaser, ohne DOM, mit Test.**
- `src/world2d/tiles.ts` — der Katalog: neunzehn Kacheln, jede malt sich in
  Canvas 2D; Kachel 19 ist der **abgelichtete** Companion Cube
  (`modelSprite.ts`: ein 3D-Modell einmal mit orthografischer Kamera bei 55°
  fotografiert, als Sprite-Blatt). `SOLID_TILES` sagt, was fest ist.
- `src/world2d/hero.ts` — der Held, gemalt, vier Richtungen, zwei Schritte.
- `src/world2d/sample.ts` — je Welt ein gesäter Anfangsplan (`sampleLevel`).
- `src/world2d/World2D.ts` — Phaser (lazy geladen), Tilemap mit einer Ebene
  je Plan-Ebene, Held als Arcade-Körper, Kamera und Figur werden in `place()`
  auf `1/zoom` gerundet, `fixedStep: false`. Phasers Tastatur ist **aus**.
- `src/core/FlatControls.ts` — liest Tasten und den Touch-Bordstock und legt
  in `topDown` nur einen **Wunsch** ab (`wish: {x, z, sprint}`); Phaser
  bewegt, das 3D-Rig folgt dem Helden (`App.followHero`).
- `src/core/App.ts` — `levelFor(worldId)`: gemerkter Plan oder `sampleLevel`;
  `App.goTo(id)` wechselt die Welt, in 2D bleibt man in 2D.
- Reine Mathematik, die die 2D-Welt **übernehmen** kann, weil sie ohne
  three.js ist: `worlds/interact/doorMotion.ts` (Tür als Zahl 0…1, Rasten
  oder Nachlauf), `worlds/effects/effectKinds.ts` (Effekte als Zahlen: Anzahl,
  Tempo, Leben, Farbe), `worlds/hub/hubLayout.ts` (Tore aus der Länge der
  Weltenliste), `core/XRInput.ButtonState` (gedrückt, eben gedrückt,
  losgelassen).
- Es gibt **keinen** Gamepad-Leser (`navigator.getGamepads` kommt in `src/`
  nicht vor). Der VR-Controller läuft über WebXR (`XRInput.ts`), der
  Bildschirm über Tasten, Maus und einen Touch-Stick (`#touch-stick`).

## Entscheidungen, die vorab feststehen

Diese Punkte sind entschieden, damit acht Agenten nicht acht Antworten finden.

**E1 — Der Stil ist „3D abgelichtet", nicht „Pixel größer gemalt".**
Overcooked ist ein 3D-Spiel aus fester Schrägsicht mit weichem Comic-Licht.
Genau diesen Weg gibt es hier schon: `renderModelSprite` fotografiert ein
three.js-Modell einmal beim Aufbau. Also werden **Dinge** (Kiste, Fels, Mauer,
Zaun, Tür, Knopf, Platte, Treppe, Portal) als kleine 3D-Modelle gebaut oder
aus `worlds/` übernommen und **abgelichtet** — mit Umriss (`core/outlineShell.ts`)
und weichem Licht. **Böden** (Gras, Sand, Stein, Holz, Wasser) werden in
Canvas 2D mit Verläufen und weichen Kanten gemalt. Kein Bild im Repository,
das bleibt.

**E2 — Eine Kachel hat 64 Bildpunkte** (`TILE_PX = 64`), `pixelArt: false`,
`antialias: true`, `image-rendering: auto`. Ein Meter bleibt ein Meter
(`TILE_M = 1`). Der Zoom läuft nicht mehr in ganzen Stufen, sondern in
Faktoren 1,25 zwischen 0,5 und 4; `place()` rundet weiter auf `1/zoom`
Schirmpunkte, damit nichts schimmert. `fitZoom` zielt weiter auf rund
achtzehn Kacheln Breite.

**E3 — Dinge mit Zustand sind Entitäten, keine Kacheln.** Eine Tür, ein Knopf,
eine Platte, ein Portal, eine Treppe, eine Effektquelle haben Kennung, Ziel
und Zustand. Das passt nicht in eine Zahl je Zelle. Der Plan bekommt deshalb
eine Liste `entities: Entity[]` (`{ id, kind, col, row, facing?, props }`),
Format-Fassung `0.2.0`, und `parseLevel` liest alte Pläne ohne die Liste
weiter. Kacheln bleiben Anstrich und Kollision des Bodens; Entitäten sind
das, was man bedient.

**E4 — Entitätsarten sind eine Registry, kein `switch`.** Jede Art liegt in
einer eigenen Datei `src/world2d/entities/<art>.ts` und meldet sich in
`src/world2d/entities/index.ts` an (`registerKind`). Eine Art bringt drei
Dinge mit: die **reine Logik** (ohne Phaser, testbar: `step(state, input, dt)`),
das **Bild** (welches Sprite bei welchem Zustand) und die **Kollision**
(fest oder nicht, je Zustand). `World2D.ts` kennt nur die Registry.

**E5 — Eingabe hat einen Weg.** `FlatControls` liest Tasten, Maus, Touch
**und Gamepad** und schreibt **einen** Wunsch, `Controls2D`, den die Szene
jedes Bild abfragt. Phaser liest keine Eingabe (außer Zeiger im Editor).
`Controls2D` wird erweitert:

```ts
interface Controls2D {
  x: number; z: number; sprint: boolean;   // wie heute: laufen
  aimX: number; aimZ: number;              // rechter Stick / Maus, Länge 0…1
  aiming: boolean;                         // Stick über der Totzone, Maus bewegt
  use: ButtonSnapshot;                     // A · E · Enter · Touch-A
  fire: ButtonSnapshot;                    // B · RT · Linksklick · Touch-B
}
interface ButtonSnapshot { pressed: boolean; justPressed: boolean; justReleased: boolean }
```

Für die Maus braucht `FlatControls` die Schirmposition des Helden; die liefert
`World2D.heroScreen()` (Zentrum der Figur in CSS-Punkten) — der einzige Weg
zurück von Phaser zur Eingabe.

**E6 — Der Hub-Plan und der Interaktions-Plan sind von Hand gebaut**, nicht
gesät (`src/world2d/plans/hub.ts`, `src/world2d/plans/interact.ts`, beide ohne
Phaser, mit Test). `sampleLevel` bleibt für alle anderen Welten. Die
**Portale des Hubs kommen aus der Registry** (`WORLDS`), jedes Mal beim Laden,
und werden nicht mitgespeichert: Eine neue Welt in `worlds/index.ts` steht im
Hub, ohne dass jemand malt — dieselbe Regel wie beim 3D-Hub (`hubLayout.ts`).

**E7 — Höhe ist eine Zahl je Zelle.** Treppen brauchen ein Oben und ein Unten.
Statt Stockwerke (zu groß) bekommt der Plan eine optionale Ebene
`height` (ganze Zahlen, 0 = Boden). Zwischen zwei Zellen mit verschiedener
Höhe steht eine **Kante**, die aufhält — außer die Zelle ist eine Treppe. Die
Kanten rechnet eine reine Funktion (`ledges(level)`), Phaser baut daraus
dünne statische Körper. Der Held wird um `height` angehoben gezeichnet
(Schatten bleibt unten) — das ist der Punkt, an dem der 3D-Stil sich lohnt.

**E8 — Der Interaktions-Plan wird zusammengesetzt.** `plans/interact.ts` baut
die Halle mit der Türwand und dem Rückportal und ruft je Paket eine
`stamp…`-Funktion aus einer paketeigenen Datei (`plans/interactStairs.ts`,
`plans/interactEffects.ts`). Die Komponistin-Datei ist Grenzfall im Sinne von
`BOUNDARIES.md`: Wer dort etwas braucht, schreibt die eine Aufrufzeile und
sonst nichts.

## Die Pakete

| #   | Paket                          | Gehört ihm                                                                                  | Hängt ab von | Parallel zu |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------- | ------------ | ----------- |
| P0  | Fundament: Daten, Entitäten, Eingabevertrag | `level.ts`, `entities/index.ts`, `World2D.ts` (Entitätsschleife, Zoom, `heroScreen`), `Controls2D` | –            | –           |
| P1  | Grafik: 64 px, abgelichtet     | `tiles.ts`, `hero.ts`, `modelSprite.ts`, `world2d.css`, `sprites/`                          | P0           | P2–P7       |
| P2  | Eingabe: Gamepad, Maus, Touch  | `FlatControls.ts`, `core/gamepad.ts`, `index.html` (Touch-Knöpfe), `style.css`               | P0           | P1, P3–P7   |
| P3  | Hub-Plan und Portale           | `plans/hub.ts`, `entities/portal.ts`, `App.levelFor`                                         | P0           | P1, P2, P4–P7 |
| P4  | Türen, Knöpfe, Platten         | `entities/door.ts`, `button.ts`, `lever.ts`, `plate.ts`, `lamp.ts`, `plans/interact.ts`      | P0           | P1–P3, P5–P7 |
| P5  | Höhe und Treppen               | `level.ts` (`height`-Ebene), `ledges.ts`, `entities/stairs.ts`, `plans/interactStairs.ts`    | P0           | P1–P4, P6, P7 |
| P6  | Waffe und Geschosse            | `weapon.ts`, `entities/bullet.ts`, `entities/crate.ts` (schiebbar)                           | P0, P2       | P1, P3–P5, P7 |
| P7  | Effekte                        | `effects2d.ts`, `entities/emitter.ts`, `plans/interactEffects.ts`                            | P0           | P1–P6       |

P0 geht **zuerst und allein**; alles andere zweigt danach von `main` ab.
Reihenfolge der Merges danach: egal, aber wer als Zweiter auf `main` kommt,
rebased vorher und lässt die vier Prüfungen erneut laufen.

Was **kein** Paket tut: three.js aus der 2D-Welt lesen (die 3D-Welt aus dem
Plan bauen bleibt das Fernziel, nicht dieses Vorhaben); Haunting anfassen
(`ownsFlat`); den 3D-Hub oder das 3D-Interaktionslabor ändern; Bilddateien
ins Repository legen.

---

### P0 — Fundament: Datenmodell, Entitäten, Eingabevertrag

**Zweck.** Alles, wovon die anderen sieben abhängen, in einem Commit, damit
niemand dieselbe Grundlage zweimal baut.

**Was zu tun ist.**

1. `level.ts`: `Entity` und `entities: Entity[]` am `Level`; `LEVEL_VERSION`
   auf `0.2.0`; `emptyLevel` legt `[]` an; `parseLevel` liest fehlende Listen
   als leer, prüft `col`/`row` gegen die Maße, wirft unbekannte Arten
   **nicht** weg (die Registry entscheidet später, ob sie sie kennt);
   Hilfen `entityAt(level, col, row)`, `addEntity`, `removeEntity`.
   `props` ist `Record<string, string | number | boolean>` — flach, damit die
   Reise durch JSON nichts verändert.
2. `entities/index.ts`: die Registry. Vertrag:

   ```ts
   interface EntityKind<S> {
     kind: string;
     /** Anfangszustand aus den Props — rein, testbar. */
     init(entity: Entity): S;
     /** Ein Schritt — rein, testbar. `input` sagt, ob der Held auf/vor der Zelle steht und was er drückt. */
     step(state: S, entity: Entity, input: EntityInput, dt: number): EntityEvent[];
     /** Fest oder nicht, je Zustand. */
     solid(state: S): boolean;
     /** Welches Bild — Schlüssel und Bildnummer, plus Versatz in Bildpunkten. */
     view(state: S, entity: Entity): EntityView;
   }
   ```

   `EntityInput = { heroOn: boolean; heroFacing: boolean; use: ButtonSnapshot; fire: ButtonSnapshot; hitByBullet: boolean; weightOn: number }`.
   `EntityEvent` ist eine kleine Union: `{ type: 'trigger', target: string }`,
   `{ type: 'goto', world: string }`, `{ type: 'sound', name: string }`,
   `{ type: 'effect', effect: string, col, row }`. Die Szene reicht `trigger`
   an die Zielentität weiter (`receive(state, event)` optional am Kind).
3. `World2D.ts`: die Entitätsschleife. Beim Bau je Entität ein Sprite (Textur
   nach `view`), ein statischer Körper, wenn `solid`; jedes Bild `step`,
   danach `view` anwenden, Körper an- oder abschalten. Ereignisse verteilen;
   `goto` ruft `options.onGoto(worldId)`, das `App` auf `goTo` legt.
   Dazu `heroScreen()` (Mitte der Figur in CSS-Punkten) und der Zoom in
   Faktoren (E2) — die Zahl 64 selbst setzt P1, aber die Rundung muss mit
   krummem Zoom schon stimmen.
4. `Controls2D` wie in E5; `FlatControls` füllt die neuen Felder vorerst mit
   Null und `use`/`fire` aus `KeyE`/`Space` bzw. `KeyF` — genug, damit P4 ohne
   P2 testen kann.
5. Ein Beispiel-Kind, damit die Schleife nicht leer ist: `entities/sign.ts`
   — ein Schild, das beim Drücken von `use` einen Text als Hinweis zeigt
   (`App.notify`). Ohne Zustand, fünf Zeilen Logik, ein Test.

**Abnahme.** `level.test.ts` deckt Entitäten ab (leer, hinzufügen, entfernen,
durch JSON, alte Datei ohne Liste, Zelle außerhalb wird verworfen).
`entities/index.test.ts` prüft Registrieren, doppelte Art wirft, unbekannte
Art im Plan wird beim Bau übersprungen und nicht abgestürzt. Manuell: im Hub
in 2D ein Schild aus `sample.ts` (eins je Welt reicht), `E` zeigt den Text.
AGENTS.md, Abschnitt _Jede Welt von oben_: ein neuer Unterpunkt **Entitäten**
und die neue Fassung des Formats.

**Auftragstext für den Agenten.**

> Lies `docs/plan-2d-hub-interaktion.md` ganz und `AGENTS.md` (Arbeitsregeln,
> Jede Welt von oben). Setze **Paket P0** um, genau in dem Umfang, der dort
> steht — Datenmodell mit Entitäten (Format 0.2.0), Entitäts-Registry mit dem
> Vertrag aus dem Plan, Entitätsschleife in `World2D.ts`, `heroScreen()`,
> Zoom in Faktoren, erweitertes `Controls2D` mit Tastenbelegung als
> Platzhalter, und das Schild als erstes Kind. Ändere nichts an Grafik,
> Gamepad, Türen oder Plänen — das sind andere Pakete. Reine Logik bleibt
> ohne Phaser und ohne DOM und bekommt Tests. Vor dem Push laufen
> `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`.
> Schreibe AGENTS.md nach (Abschnitt _Jede Welt von oben_). Dann Branch,
> Pull Request ohne Draft, nach grüner CI selbst mergen, Branch löschen —
> wie in AGENTS.md beschrieben. Melde am Ende, welche Schnittstellen die
> anderen Pakete jetzt benutzen können.

---

### P1 — Grafik: 64 Bildpunkte, abgelichtet, Overcooked-Stil

**Zweck.** Der eine sichtbare Wunsch: nicht mehr pixelig.

**Was zu tun ist.**

1. `TILE_PX = 64`; Phaser-Config `pixelArt: false`, `antialias: true`;
   `world2d.css`: `image-rendering: auto`. `fitZoom` und der Rad-Zoom nach
   E2 (P0 hat die Rundung vorbereitet). Der Editor-Thumb (`drawTileThumb`)
   skaliert entsprechend.
2. **Böden** in `tiles.ts` neu malen: Canvas 2D, 64 px, Verläufe, weiche
   Flecken, keine harten Ein-Punkt-Muster. Gras, dunkles Gras, Blumen, Weg,
   Sand, Wasser (mit hellem Rand zum Ufer), Stein, Holz, Brücke. Die
   Kennungen bleiben dieselben — gespeicherte Pläne müssen weiter passen.
3. **Dinge abgelichtet**: `sprites/` mit kleinen three.js-Bauteilen (ohne
   Bilddatei): Mauerblock, Baum (Stamm + Kugelkrone), Busch, Fels, Zaun,
   Kiste, Tür (geschlossen), Dach, Baumkrone; dazu die Modelle, die P4/P6
   brauchen (roter Knopf aus `worlds/shared/redButton.ts`, Druckplatte,
   Hebel, Türblatt, Portalring aus `worlds/hub/HubWorld.ts`-Optik, Treppe,
   Pistole) — die Modelle liefert P1, die Kacheln/Bildnummern dokumentiert
   P1 in `sprites/index.ts`, damit P4–P6 sie per Schlüssel nehmen.
   `renderModelSprite` bekommt eine **Batch-Variante**
   (`renderModelSprites(models, options)`): **ein** WebGLRenderer für alle
   Modelle, nicht zehn Kontexte hintereinander. Licht: weiches Toon-Licht
   (Hemisphäre + eine Sonne), Umriss über `core/outlineShell.ts`, Schatten
   als weicher Ellipsen-Fleck auf durchsichtigem Grund. Ohne WebGL (jsdom)
   bleibt je Kachel eine flache Ersatzzeichnung — wie heute beim Würfel.
4. **Der Held** neu: rundlicher Chibi-Kerl in 64 px, gemalt in Canvas 2D
   (Kopf groß, Körper klein, wie Overcooked), vier Richtungen, **vier**
   Schrittphasen; `heroFrame` wächst mit. Wer Zeit hat: den 3D-Avatar
   (`core/PlayerAvatar.ts`) abgelichtet — aber erst, wenn der gemalte steht.
5. Tiefe: Dinge auf `objects` und der Held werden nach `y` sortiert
   (`depth = y`), damit die Figur hinter einer Kiste verschwindet, die weiter
   unten im Bild steht — das ist der halbe Overcooked-Eindruck.

**Abnahme.** Screenshot mit `npm run test:browser`-Werkzeug oder Playwright
in `tools/` (ein Skript, das `#hub` in 2D lädt und ein PNG in den Scratch
schreibt — das PNG kommt **nicht** ins Repository). `tiles` hat weiter
jede Kennung genau einmal (`level.test.ts` läuft grün). Alte gespeicherte
Pläne laden unverändert. AGENTS.md: der Absatz zum SNES-Look wird ersetzt.

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` und setze **Paket P1** um — nur
> Grafik. Vorgabe ist Entscheidung E1/E2: 64 px je Kachel, Böden in Canvas 2D
> mit Verläufen, Dinge als abgelichtete three.js-Modelle über
> `renderModelSprite` (mit neuer Batch-Variante, ein Renderer), Held als
> Chibi-Figur, Tiefe nach y. Keine Bilddateien. Die Kennungen im Katalog
> bleiben. Liefere in `sprites/index.ts` die Schlüssel und Bildnummern für
> Knopf, Platte, Hebel, Türblatt, Portal, Treppe, Pistole, damit die Pakete
> P3–P6 sie benutzen können. Vier Prüfungen, AGENTS.md nachziehen, Branch →
> PR ohne Draft → grün → selbst mergen → Branch löschen.

---

### P2 — Eingabe: Gamepad, Maus, Touch

**Zweck.** Rechter Stick zielt, A benutzt, B schießt — auf jedem Gerät.

**Was zu tun ist.**

1. `core/gamepad.ts`: liest `navigator.getGamepads()` je Bild (Standard-
   Mapping: Sticks 0/1 und 2/3, A = 0, B = 1, RT = 7, LS-Druck = 10),
   Totzone 0,2 mit Skalierung darüber, reine Funktion
   `readGamepad(pad): GamepadFrame` mit Test (Totzone, Normierung, fehlende
   Achsen). Kein Phaser-Gamepad-Plugin (E5).
2. `FlatControls`: in `topDown` fließen Tastatur, Touch und Gamepad in
   **einen** `Controls2D`: laufen = linker Stick oder WASD oder Touch-Stick;
   zielen = rechter Stick, sonst Maus relativ zu `World2D.heroScreen()`,
   sonst Touch-Zielstick; `use` = A/E/Enter/Touch-A; `fire` = B/RT/
   Linksklick/Touch-B. Flanken (`justPressed`) über `ButtonState` aus
   `XRInput.ts` (exportieren, nicht kopieren). Beim Zielen mit dem Stick
   bleibt die letzte Richtung stehen, wenn der Stick losgelassen wird
   (`aiming = false`, `aimX/aimZ` bleiben) — sonst zuckt die Waffe zur Mitte.
3. Außerhalb von `topDown` soll der Gamepad das Rig laufen lassen (linker
   Stick) und umsehen (rechter Stick) — das ist **erlaubt, aber nicht
   verlangt**; wenn, dann im selben Paket und mit einer Zeile in der
   Steuerungstabelle.
4. Touch: rechts unten ein zweiter Stick (`#touch-aim`) und zwei runde
   Knöpfe A/B, nur sichtbar in 2D auf Touch-Geräten (`index.html`,
   `style.css` — beide sind absichtlich nicht im Formatierer, Regeln
   einzeilig lassen). Zeiger-Ereignisse wie beim linken Stick.
5. Steuerungstabelle in AGENTS.md: Zeilen _Zielen_, _Benutzen_, _Schießen_
   mit einer Spalte für den Gamepad.

**Abnahme.** `gamepad.test.ts` (Totzone, Normierung, Tasten, fehlender Pad).
Manuell mit einem Xbox-/PS-Controller im Browser: laufen, zielen, A und B;
mit Maus: die Zielrichtung folgt dem Zeiger; auf dem Telefon: beide Sticks
und beide Knöpfe. Kein Phaser-Code liest Eingabe.

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` und setze **Paket P2** um: ein
> Gamepad-Leser in `core/gamepad.ts` (rein, mit Test), die Zusammenführung von
> Tastatur, Maus, Touch und Gamepad in `FlatControls` zu genau einem
> `Controls2D` nach Entscheidung E5, Touch-Zielstick und A/B-Knöpfe. Phaser
> liest keine Eingabe. Steuerungstabelle in AGENTS.md ergänzen. Vier
> Prüfungen, Branch → PR ohne Draft → grün → selbst mergen → Branch löschen.

---

### P3 — Hub-Plan und Portale

**Zweck.** Die Startwelt in 2D ist ein gebauter Ort, und von dort kommt man
überall hin.

**Was zu tun ist.**

1. `plans/hub.ts` (ohne Phaser, mit Test): eine runde Halle aus Steinboden,
   Blumenrand, Wege sternförmig nach außen — je **Gang** vier Portale, zwei
   je Seite, versetzt, so viele Gänge, wie `WORLDS` braucht. Die Zahlen
   dürfen aus `worlds/hub/hubLayout.ts` kommen (Meter = Kacheln), müssen aber
   nicht: Was zählt, ist, dass die Anordnung **aus der Länge der Weltenliste**
   folgt und nicht aus Handkoordinaten. Der Held startet in der Mitte.
2. `entities/portal.ts`: Art `portal`, Props `{ world: string, label: string }`.
   Nicht fest. Steht der Held **0,4 s** auf der Zelle, feuert `goto`
   (Nachlauf, damit man nicht beim Vorbeigehen verschwindet; die Zahl steht
   als Konstante mit Kommentar). Bild: Portalring in der Akzentfarbe der Welt
   (Tönung über Phaser `setTint`), Schild mit dem Titel darüber (Phaser-Text,
   Tiefe über allem). Das Rückportal in jeder Welt heißt `→ Hub`.
3. `App.levelFor`: für `hub` und `interact` die gebauten Pläne statt
   `sampleLevel`; die Portale des Hubs werden **nach dem Laden** aus `WORLDS`
   eingesetzt, auch in einen gemerkten Plan (E6: nie mitgespeichert —
   `saveLevel` lässt Entitäten mit `props.registry === true` weg, oder der
   Hub wird nicht gespeichert; das Paket entscheidet und begründet in
   AGENTS.md).
4. Jeder gesäte Plan (`sample.ts`) bekommt ein Rückportal in den Hub nahe
   dem Start — so ist das Netz geschlossen, auch für Welten, die noch keinen
   gebauten Plan haben.
5. Beim Wechsel in 2D bleibt man in 2D (`App.goTo` tut das schon; prüfen,
   dass der Held am Spawn der neuen Welt steht und nicht auf dem Portal, das
   ihn gleich zurückschickt: nach `goto` eine Sperre von einer Sekunde, oder
   Spawn nie auf einer Portalzelle — Test dafür in `plans/hub.test.ts`).

**Abnahme.** `hub.test.ts`: ein Portal je Welt außer `hub`, keine zwei auf
einer Zelle, alle erreichbar (Flutfüllung über nicht-feste Zellen vom Spawn
aus — die Funktion darf in `level.ts` liegen, andere Pakete brauchen sie
auch), Spawn frei. Manuell: Hub in 2D, zum Portal _Interaktionslabor_ laufen,
drüben stehen, zurück. AGENTS.md: Hub-Absatz um die 2D-Fassung ergänzen.

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` und setze **Paket P3** um: der
> gebaute Hub-Plan in `plans/hub.ts` mit Portalen aus der Weltenliste (E6),
> die Entitätsart `portal` nach dem Registry-Vertrag aus P0, das Rückportal
> in jedem Plan, die Anbindung in `App.levelFor`. Reine Logik ohne Phaser,
> mit Tests (Erreichbarkeit, ein Portal je Welt, Spawn frei). Vier Prüfungen,
> AGENTS.md, Branch → PR ohne Draft → grün → selbst mergen → Branch löschen.

---

### P4 — Türen, Knöpfe, Platten (und der Interaktions-Plan)

**Zweck.** Das 3D-Interaktionslabor, flach: dieselben drei Türen, dieselben
Auslöser, dieselbe Mathematik.

**Was zu tun ist.**

1. `entities/door.ts`: Art `door`, Props `{ mode: 'slide' | 'swing' | 'plate', time, hold, axis: 'x' | 'z', width: 1 | 2 }`.
   Zustand ist `DoorState` aus `worlds/interact/doorMotion.ts` — **importieren,
   nicht kopieren** (die Datei ist ohne three.js). `solid` = `!passable(state)`.
   Bild: Schiebetür fährt (Sprite-Versatz nach `slideOffset`), Drehtür dreht
   (Sprite-Rotation nach `swingAngle`, Ankerpunkt am Scharnier), Lampe über
   der Tür (aus, gelb, grün — wie in 3D). Empfängt `trigger`.
2. `entities/button.ts` (roter Knopf, Nachlauf, drückbar mit `use` **oder**
   durch ein Geschoss `hitByBullet` — Portal-Regel), `entities/lever.ts`
   (rastet, `use` schaltet um), `entities/plate.ts` (gedrückt, solange
   `weightOn > 0`: der Held oder eine Kiste — P6 liefert die Kiste, bis dahin
   nur der Held), `entities/lamp.ts` (Deckenlicht: eine Kachel, die ihre Tönung
   wechselt, plus ein Dunkel-Overlay über der Halle, das der Schalter hebt).
   Alle mit Props `target: string` (Kennung der Tür/Lampe) und mit Ton
   (`sound`-Ereignis → `core/Audio.playSwitch`/`playTone`, das `App`
   abspielt).
3. `plans/interact.ts` (ohne Phaser, mit Test): die Halle 32 × 22 mit
   Steinboden, Mauerrand, **eine Wand quer** mit drei Öffnungen (Schiebe-,
   Dreh-, Plattentür) wie in 3D (`SLIDE_X`, `SWING_X`, `PLATE_X`), die
   Auslöser davor, Rückportal am Südrand, Spawn im Süden; dazu die zwei
   Aufrufe `stampStairs(level)` und `stampEffects(level)` als **leere
   Platzhalter** in eigenen Dateien, die P5 und P7 füllen (E8).
4. Für `heroFacing` (steht der Held vor dem Ding und schaut es an): eine
   reine Funktion in `entities/index.ts` oder `facing.ts`, aus Heldenzelle,
   Blickrichtung und Zielzelle — mit Test.

**Abnahme.** Tests: Tür fährt in `time` auf, Plattentür fällt nach `hold` zu,
Hebel rastet, Knopf mit Geschoss; Plan-Test: ohne offene Tür ist der Norden
vom Spawn aus **nicht** erreichbar, mit allen Türen offen schon (Flutfüllung
aus P3 — ist P3 noch nicht gemergt, eigene kleine Kopie in der Testdatei,
und beim Rebase gegen die aus `level.ts` tauschen). Manuell: alle drei Türen
per Knopf, Hebel, Platte; Licht aus und an. AGENTS.md: Absatz zum
Interaktionslabor um die 2D-Fassung.

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` und setze **Paket P4** um: die
> Entitätsarten Tür (mit `doorMotion.ts` als Rechenkern, nicht kopiert),
> Knopf, Hebel, Platte, Lampe nach dem Registry-Vertrag aus P0, und den
> gebauten Interaktions-Plan mit der Türwand nach dem Vorbild von
> `worlds/interact/InteractWorld.ts`, samt leerer `stampStairs`/`stampEffects`
> für P5/P7 (E8). Reine Logik ohne Phaser, mit Tests, Plan-Test über
> Erreichbarkeit. Vier Prüfungen, AGENTS.md, Branch → PR ohne Draft → grün →
> selbst mergen → Branch löschen.

---

### P5 — Höhe und Treppen

**Zweck.** Eine Treppe ist von oben nur dann eine, wenn es ein Oben gibt.

**Was zu tun ist.**

1. `level.ts`: optionale Ebene `height` (`kind: 'height'`, Werte 0…7, im
   Editor als Palette „Höhe"), `heightAt(level, col, row)`; `parseLevel`
   toleriert das Fehlen. Ebenen-Tiefe: Höhe malt nichts selbst.
2. `ledges.ts` (rein, mit Test): `ledges(level, stairs: Set<cellKey>)` gibt
   die Kanten zwischen Zellen verschiedener Höhe zurück, die aufhalten —
   **außer** die Kante gehört zu einer Treppenzelle in ihrer Laufrichtung.
   `World2D` baut je Kante einen statischen Körper (4 px dick, entlang der
   Kante). Der Rand des Plans bleibt `setBounds`.
3. `entities/stairs.ts`: Art `stairs`, Props `{ facing: 'n' | 'e' | 's' | 'w' }`;
   nicht fest; die Zelle verbindet die Höhe hinter ihr mit der davor. Der Held
   wird auf der Treppe zwischen beiden Höhen interpoliert gezeichnet.
4. Zeichnen: der Held (und jede Entität) bekommt `y -= height × RISE_PX`
   (`RISE_PX` = 20 bei 64 px — die Zahl steht als Konstante mit Kommentar);
   der Schatten (P1) bleibt auf dem Boden. Hohe Zellen bekommen eine
   sichtbare Vorderkante (Kachel „Podestkante" im Katalog, abgelichtet, oder
   ein Phaser-Graphics-Streifen — das Paket entscheidet, P1 liefert das
   Modell, wenn gewünscht).
5. `plans/interactStairs.ts`: `stampStairs(level)` setzt im Norden der Halle
   ein Podest (Höhe 1) mit Treppe hinauf, darauf ein Hebel, der unten etwas
   schaltet — und eine zweite Treppe auf Höhe 2 mit Blick über die Wand.

**Abnahme.** `ledges.test.ts`: zwei Höhen ohne Treppe → vier Kanten um das
Podest; mit Treppe fehlt genau die eine; Flutfüllung über Höhen mit
Treppen erreicht das Podest, ohne nicht. Manuell: hinauf, oben laufen, an
der Kante stehen bleiben, hinunter; von oben über die Türwand hinweg.
AGENTS.md: _Eine Treppe ist drei Sachen_ bekommt eine 2D-Fußnote (hier
sind es zwei: Kante und Verbindung).

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` und setze **Paket P5** um: die
> Höhen-Ebene, die reine Kantenrechnung `ledges.ts` mit Test, die Art
> `stairs`, das Anheben beim Zeichnen, und `stampStairs` für den
> Interaktions-Plan (E7, E8). Keine Stockwerke, keine zweite Karte. Vier
> Prüfungen, AGENTS.md, Branch → PR ohne Draft → grün → selbst mergen → Branch
> löschen.

---

### P6 — Waffe und Geschosse

**Zweck.** Der rechte Stick hat einen Sinn.

**Was zu tun ist.**

1. `weapon.ts` (rein, mit Test): Zielrichtung aus `Controls2D` (Stick oder
   Maus, letzte Richtung bleibt), Feuerrate (`FIRE_HZ`, 4/s bei gehaltenem
   `fire`, jeder `justPressed` sofort), Mündung 0,5 Kacheln vor dem Helden.
   Kein Schaden, keine Munition — das ist ein Werkzeug fürs Auslösen, kein
   Shooter.
2. Bild: Pistolen-Sprite (P1) am Helden, dreht mit dem Ziel, spiegelt sich
   links; ein kleiner Zielpunkt zwei Kacheln weit draußen, nur bei `aiming`.
   Der Held dreht seine Blickrichtung **nach dem Ziel**, wenn er zielt, sonst
   nach dem Laufen (Twin-Stick-Regel; `heroDir` bekommt dafür eine Vorrangs-
   Eingabe) — und `HeroState.yaw`, das das 3D-Rig liest, folgt derselben Regel.
3. `entities/bullet.ts`: nicht im Plan gespeichert, sondern zur Laufzeit
   erzeugt (die Registry braucht dafür `spawn`/`despawn` in der Szene — die
   kleinste Ergänzung, die das kann). Arcade-Körper, 12 Kacheln/s, verschwindet
   an festen Kacheln und festen Entitäten, setzt dort `hitByBullet` für ein
   Bild (Knopf aus P4 reagiert), lebt höchstens 1,5 s. Kleiner Funkeneffekt
   beim Aufschlag (P7 liefert `effect`-Ereignis; ohne P7 ein Phaser-Kreis,
   der ausblendet).
4. `entities/crate.ts`: schiebbare Kiste (Arcade-Körper, `pushable`, Dämpfung
   hoch), fest, Gewicht 1 auf Platten (`weightOn`), ein Geschoss schubst sie
   um eine Kachel. Der Interaktions-Plan von P4 stellt zwei davon neben die
   Plattentür.

**Abnahme.** `weapon.test.ts` (Richtung bleibt beim Loslassen, Feuerrate,
Mündung), Kiste auf Platte hält die Tür offen (Test der Plattenlogik mit
`weightOn`). Manuell: mit dem Stick um den Helden zielen, Knopf aus der Ferne
treffen, Kiste auf die Platte schieben. Steuerungstabelle in AGENTS.md.

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` und setze **Paket P6** um: die reine
> Waffenlogik `weapon.ts` mit Test, das Pistolen-Sprite mit Zielpunkt, die
> Twin-Stick-Blickrichtung des Helden, Geschosse als Laufzeit-Entitäten mit
> `hitByBullet`, und die schiebbare Kiste mit Gewicht. Keine Munition, kein
> Schaden. Braucht P0 und P2 auf `main`. Vier Prüfungen, AGENTS.md, Branch →
> PR ohne Draft → grün → selbst mergen → Branch löschen.

---

### P7 — Effekte

**Zweck.** Rauch, Feuer, Funken, Wasser — aus denselben Zahlen wie in 3D.

**Was zu tun ist.**

1. `effects2d.ts` (rein, mit Test): `EFFECTS` aus `worlds/effects/effectKinds.ts`
   **importieren** und in Phaser-Partikel-Konfiguration übersetzen — Meter
   je Sekunde × `TILE_PX`, Auftrieb als negatives `gravityY`, Fall als
   positives, Farbe als `tint`-Verlauf, `glow` als `blendMode: ADD`, Leben in
   Millisekunden. Test: Rauch steigt (gravityY < 0), Funken fallen, die Anzahl
   skaliert mit der Größe.
2. `entities/emitter.ts`: Art `emitter`, Props `{ effect: string, size: number, on: boolean }`;
   `trigger` schaltet um oder feuert einmal (`burst: true`). Bild: ein
   Phaser-`ParticleEmitter` je Entität, Textur ein weicher Kreis (Canvas,
   kein Bild). Tiefe über dem Helden.
3. Die Szene nimmt `effect`-Ereignisse anderer Entitäten an (Tür-Staub beim
   Öffnen, Funken beim Geschoss-Aufschlag aus P6, Portal-Schimmer): ein
   Einmal-Emitter an der Zelle, der sich selbst abräumt.
4. `plans/interactEffects.ts`: `stampEffects(level)` setzt im Osten der Halle
   vier Emitter (Rauch, Feuer, Funken, Wasser) mit je einem Knopf davor — das
   Effektlabor als Ecke.

**Abnahme.** `effects2d.test.ts`; manuell: Knopf drücken, Wolke sehen, Tür
öffnen, Staub sehen. Leistung: mit allen vier Emittern an bleibt Phasers FPS
(Menü → Grafik → Bildrate im Bild) auf einem Laptop bei 60. AGENTS.md:
Effektlabor-Absatz um die 2D-Fassung.

**Auftragstext.**

> Lies `docs/plan-2d-hub-interaktion.md` und setze **Paket P7** um: die
> Übersetzung von `effectKinds.ts` in Phaser-Partikel (rein, mit Test), die
> Art `emitter`, Einmal-Effekte auf `effect`-Ereignisse, und `stampEffects`
> für den Interaktions-Plan (E8). Keine neuen Effektzahlen — die stehen in
> `effectKinds.ts`. Vier Prüfungen, AGENTS.md, Branch → PR ohne Draft → grün →
> selbst mergen → Branch löschen.

---

## Regeln für alle Pakete

- **Branch, PR ohne Draft, selbst mergen, Branch löschen** (AGENTS.md,
  _Sessions, die nicht auf `main` pushen dürfen_). Vor dem PR auf `main`
  rebasen; nach dem Rebase die vier Prüfungen erneut. Ein offener PR ist
  kein Ergebnis.
- **Reine Logik ohne Phaser und ohne DOM, mit Test.** Phaser ist der Zeichner
  und der Beweger; was man ohne Brille und ohne Browser prüfen kann, liegt
  in einer eigenen Datei. Neue Suiten über zehn Sekunden kommen in `SLOW`
  (`jest.config.cjs`).
- **Eigentum nach der Tabelle oben.** Wer fremde Dateien braucht, schreibt die
  kleinste Andockzeile (E8) und sagt es im PR. `World2D.ts` ist nach P0 für
  alle Grenzfall: Sprites, Körper und Ereignisse laufen über die Registry,
  nicht über neue `if`-Zweige in der Szene.
- **Keine Bilddateien im Repository.** Kacheln werden gemalt oder abgelichtet.
- **AGENTS.md wird mitgeschrieben**, im Ton des Bestands: was entschieden
  wurde und warum, nicht was der Code tut. Die Steuerungstabelle bekommt
  jede neue Taste.
- **Deutsch** in Kommentaren, Commits und Docs — wie der Rest.
- **Was 3D angeht, bleibt 3D.** Der 3D-Hub, das 3D-Labor, das Rig und die
  Portale in three.js werden nicht angefasst; `App.followHero` bleibt der
  einzige Rückweg von 2D nach 3D.

## Woran man am Ende sieht, dass es fertig ist

Ohne Brille, Browser, Startseite _2D_ → _Beitreten_: Man steht in einer
rundlichen, weich gezeichneten Halle, in jedem Gang ein Portalring je Welt.
Zum Ring _Interaktionslabor_ laufen, kurz stehen, drüben sein. Mit dem
Gamepad: linker Stick läuft, rechter dreht die Pistole, B schießt auf den
roten Knopf, die Schiebetür fährt auf und die Lampe wird grün. Eine Kiste
auf die Platte schieben, die dritte Tür bleibt offen. Die Treppe hinauf,
oben den Hebel umlegen. In der Ecke Rauch und Feuer per Knopf. Zurück durch
das Portal `→ Hub`. Und beim Umschalten auf 3D steht man dort, wo der Held
zuletzt stand.
