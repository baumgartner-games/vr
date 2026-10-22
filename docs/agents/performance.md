# Bildrate in der Brille: Leitfaden zum Schneller-Machen

Ein Kapitel des [Projektwissens](../../AGENTS.md). Gewünscht: _„Kannst du deine
Performance Verbesserungen notieren, sodass du beim nächsten Mal weist was du
machen musst?"_ Hier steht, **wie** gemessen und **was** geändert wurde
(Oktober 2026, Haunting 18 → 40 fps, Stadt 858 → 58 Zeichenaufrufe), und das
Vorgehen für das nächste Mal. Die Einzelheiten je Runde stehen in
[Haunting](haunting.md) (Abschnitte _Bildrate …_), die Messtabelle in
[`docs/quest3-referenz.md`](../quest3-referenz.md).

## Was man über die Quest 3 wissen muss

- **Jedes Bild steht eine ganze Zahl von Auffrischungen lang.** Bei 90 Hz gibt
  es nur 90 / 45 / 30 / 22,5 / 18 fps, bei 120 Hz 120 / 60 / 40 / 30 / 24.
  „30 fps" heißt also nur: das Bild braucht zwischen 22 und 33 ms. **60 fps gibt
  es nur bei 120 Hz.** Die Welt verlangt 120 Hz (`GraphicsSettings.xrRate`,
  `GraphicsQuality.applyRate`); was die Brille wirklich fährt, zeigt das Schild.
- **Zeichenaufrufe sind die wichtigste Stellschraube.** Vom Besitzer gemessen:
  300 Aufrufe ≈ 35–40 fps, 1 200 Aufrufe ≈ 20 fps, also gut **0,03 ms je
  Aufruf**. Ohne Multiview zeichnet die Brille **jedes Auge einzeln**, jeder
  Aufruf zählt doppelt. Multiview gibt es in three r185 nur im
  `WebGPURenderer` — seit Oktober 2026 zum Ausprobieren unter _Grafik →
  Renderer: Multiview_ ([Wie schön es aussieht](grafik.md#der-renderer-webgl-oder-multiview)).
  Nachgestellte Brille, Haunting-Messstrecke: 232 → 106 Zeichenaufrufe,
  7,9 → 5,9 ms JavaScript in `render()`; die fps der Quest stehen noch aus.
  Eigene Shader müssen dafür als Knotenmaterial nachgebaut werden
  (`core/nodeLooks.ts`), was fehlt, ist dort unsichtbar.
- **Mit offenem Menü misst man ein anderes Bild**: Foveated Rendering ist dann
  aus (`GraphicsQuality.setMenuOpen`). Die fps beim Spielen stehen auf dem
  Schild unten links im Blick, nicht im Menü.
- **Lichter je Bildpunkt kosten die Grafikkarte**: Jedes sichtbare Punkt- oder
  Spotlicht rechnet jeder beleuchtete Bildpunkt mit, und eine andere Zahl
  Lichter übersetzt die Shader neu. 18 → 21 fps kamen allein daher.

## Messen — immer zuerst

1. **In der Brille**: _Grafik → Bildrate zeigen_ (F3). Das Schild
   (`core/xrStatsBadge.ts`) zeigt fps · Bildzeit · Hz und CPU · GPU · Draws.
   GPU kommt aus `EXT_disjoint_timer_query_webgl2` (`core/gpuTimer.ts`);
   ohne die Erweiterung ein Strich. **GPU ≈ Bildzeit** → Grafikkarte bremst
   (Auflösung, Licht, Durchsichtiges). **CPU ≈ Bildzeit** → Rechnung und
   Zeichenaufrufe.
2. **Hier im Container**: `npm run perf:haunting -- --runs=3`
   (`tools/perf-haunting-vr.mjs`): simulierte Brille, Übungsrunde, vor dem
   ersten Schrank. Misst `world.update`, den Matrizenlauf und die
   Zeichenaufrufe. `--lamp` mit eingeschalteter Taschenlampe. Für alle Welten
   gibt es `npm run perf:worlds` und `npm run fps`. Absolute Millisekunden
   gelten nur für diesen Rechner — vorher und nachher auf derselben Maschine
   messen, mit mehreren Läufen (die Streuung ist groß).
3. **Wer kostet?** Bewährte Sonden (Playwright, `?xr=sim`, `bgvr.enterVR()`):
   - **Zeichenaufrufe zählen und zuordnen**: `renderer.renderBufferDirect`
     umwickeln, je Aufruf den Pfad der Elternnamen sammeln. Zeigt sofort, ob
     viele gleiche Dinge einzeln gezeichnet werden.
   - **JS-Profil**: CDP `Profiler.start`, `renderer.render` durch eine leere
     Funktion ersetzen (sonst dominiert SwiftShader), inklusive Zeit je Funktion.
   - **Matrizenlauf**: `scene.updateMatrixWorld()` im echten Bild zeitmessen —
     eine enge Schleife täuscht (1 ms statt 3 ms: kalter Speicher).
4. **Eintragen**: neue Zeile in die Tabelle in `docs/quest3-referenz.md`, die
   fps des Besitzers nachtragen, sobald er sie meldet.

## Was schon gemacht ist — und wo es steht

**Zeichenaufrufe**

| Mittel | Wo | Wirkung |
| --- | --- | --- |
| Gleiche Stücke instanziert | `shared/modelBatch.ts` (Wände, `PortalWorld.stepWorldBatch`) | ein Aufruf je Feld, Geometrie und Aussehen |
| Verschiedene Modelle, ein Aufruf | `modelBatch.batchedOf` (`THREE.BatchedMesh`, nur mit `WEBGL_multi_draw`, `allowMultiDraw` im `App`; `?batch=instanced` zum Vergleich) | ein Aufruf je Feld und Aussehen — Stadt 270 → 58 |
| Editor ohne Ruck | `ModelBatch.rebuild` baut nur die Felder neu, in denen etwas kam, ging oder rückte (`Placed.stale`) | Stadt: 20 ms statt 45–80 ms, und kein Zurückfallen auf über tausend Einzelstücke |
| Element-Bilder gebündelt | `FurnishedWorld.decorBatch` | Stadt 858 → 270 |
| Möbel in sich verschmolzen | `shared/mergeByLook.ts` (Rechner der Zentrale) | Rechner 8 → 2 |
| Unsichtbare Treffer nicht zeichnen | `MeshBasicMaterial({ visible: false })` statt Deckkraft 0 (Türhebel) | 2 Aufrufe je Tür und Auge |
| Teile eines Geräts zusammengebacken | `tools/scannerModel.ts` | 10 → 3 je Gerät |
| Figuren in einem Netz | `core/figureMerge.mergeFigureParts` (`loadKaykitFigure(…, { merge: true })` für NPCs und Haunting-Figuren, nicht für den Avatar) | 6 → 1 je Figur; Haunting 300 → 232 |
| Räume hinter Wänden ausblenden | `HauntingWorld.cullRoomArt`, `showRoom` | |
| Portalsichten nur im Ausschnitt | `portal/portalView.ts`, `PortalRenderer.measure/prepareView` (siehe unten) | Haunting mit zwei Portalen 1 258 → 356, beide im Blick 1 460 → 570 (ohne Portal 232) |

**Rechnung je Bild (CPU)**

| Mittel | Wo | Wirkung |
| --- | --- | --- |
| Matrizenlauf überspringt Unsichtbares | `showRoom.skipHiddenMatrices` an der Weltwurzel | 3,4 → 1,5 ms |
| Stilles für immer einfrieren | `showRoom.freezeTree`, `holdStill`; `modelBatch.freeze/skipFrozen`; `GridWorld.freezeBatched` | |
| Schlafendes anhalten | `showRoom.pauseMatrices`, `CommandBots.setAwake`, `Npc.asleep` | |
| Brillen-Kopf einmal je Bild | `PlayerRig.updateXrHead` | fast 1 ms |
| Teure Fragen einmal je Bild | `HauntingWorld.perTick` (Karte, Ziele) | |
| Grobtest vor dem Genauen | `grabReach.rayReach/reachDepth` (Kugel um die Box), `collectUsables` (Entfernung vor `usableShows`) | |
| Physik nicht dauernd fragen | `aimTargetOf` (feste Körper alle 30 Bilder) | |
| Sekundendurchlauf nur für Neues | `graphicsScene.applySceneQuality` (Netz + Stufe + Material gemerkt) | Ruckler je Sekunde weg |
| Spiegel nur, wenn einer zu sehen ist | `Mirror.collectMirrors` | |

**Grafikkarte**: weniger Lichter (Deckenlampen nur nahe der Zentrale, kein
Glimmlicht an Lampen, Lampe auf dem Tisch aus), 120 Hz, Auflösungsregler
_Brille: Auflösung_.

## Portale (Oktober 2026)

Gemeldet: _„Leider scheinen die Portale massive fps Einbrüche zu führen. Bitte
schau nach einer Option, wie wir das vermeiden können, bzw wie das in dem Spiel
Portal gelöst wurde oder anderen wie dem minecraft Portal mod. Miss die fps
auch bitte z.B. in haunting"_.

**Warum es so teuer war**: Jedes Portal zeichnete je Ebene (_Portale in
Portalen_, ab Werk 2) die **ganze Szene** in ein Ziel von Bildgröße — mit dem
vollen Kegel der Kamera, also ohne dass three.js etwas aussortieren konnte,
und auch dann, wenn das Portal hinter einem hing. Zwei Portale × zwei Ebenen
waren vier volle Durchgänge zusätzlich. Und Haunting zeichnete in der Brille
gar keine Portalsicht (`HauntingWorld.render` gab `false` zurück) — ein Portal
dort war nur ein Wirbel; jetzt zeichnet es wie jede Welt (`super.render`).

**Wie es die anderen lösen**:

- **_Portal_ (Valve, Source)**: Die Sicht durch ein Portal wird mit dem
  Stencil-Puffer direkt ins Bild gezeichnet, nur dort, wo das Portal auf dem
  Schirm liegt; der Kegel der virtuellen Kamera wird auf das Rechteck des
  Portals zugeschnitten (Scissor + engerer Kegel zum Aussortieren), die
  Nahebene liegt schräg auf dem Ausgang. Unsichtbare Portale (außerhalb des
  Kegels, abgewandt, verdeckt) kosten nichts; die Tiefe ist klein (2), und die
  letzte Ebene zeigt nur noch ein festes Bild.
- **_Immersive Portals_ (Minecraft-Mod)**: dasselbe Prinzip — je Portal ein
  eigener, enger Kegel, aus dem nur die Chunks gezeichnet werden, die
  hineinfallen; Portale außerhalb des Blicks, zu weit weg oder zu klein werden
  übersprungen; Tiefe und Anzahl als Einstellung; Verdeckungsabfragen.

**Was hier gemacht ist** (`portal/portalView.ts`, `PortalRenderer`):

1. **Je Portal, Ebene und Auge ein Rechteck** (`portalRect`): die Ecken der
   Öffnung durch die Kamera auf den Schirm, hinter dem Auge abgeschnitten.
   Hinter einem, abgewandt oder neben dem Bild → leer, die Sicht entfällt.
   Tiefere Ebenen: das Portal, wie es in der Sicht der Ebene darüber liegt,
   geschnitten mit deren Rechteck — wird es dort nicht gesehen, entfällt auch
   die Ebene.
2. **Nur dort zeichnen**: Viewport und Schere auf das Rechteck, die Projektion
   so zugeschnitten (`cropProjection`, nach der schrägen Nahebene), dass
   dieselben Pixel herauskommen — aber three.js sortiert mit dem engen Kegel
   aus. Darum werden die Augen einzeln gezeichnet und nicht mehr als
   `ArrayCamera` (die sortiert mit dem gemeinsamen Kegel beider Augen).
3. **Geprüft**: Bilder vorher/nachher an derselben Stelle, am Schirm und in
   der simulierten Brille, pixelgleich (größte Abweichung 2 von 765).

**Gemessen** (`npm run perf:haunting -- --portals` bzw. `--portals=both`,
Zeichenaufrufe je Bild, beide Augen, alle Durchgänge):

| Szene | vorher | nachher |
| --- | ---: | ---: |
| ohne Portal | 232 | 232 |
| zwei Portale, eines im Blick, eines im Rücken | 1 258 | 356 |
| zwei Portale nebeneinander im Blick | 1 460 | 570 |

Bei gut 0,03 ms je Aufruf in der Brille sind das etwa 31 → 4 ms bzw.
37 → 10 ms für die Portale. SwiftShader hier: 0,6 → 0,9 bzw. 0,4 → 0,8
Bilder/s (ohne Portal 0,9) — nur als Verhältnis.

**Was noch ginge**, falls es nicht reicht: die innerste Ebene nicht neu
zeichnen, sondern das Bild des letzten Bildes zeigen (wie Valve); Portale über
einer Entfernung nur jedes zweite Bild; ein Stencil-Weg ohne Renderziele (spart
Speicher und Auflösungswechsel, ist aber ein großer Umbau).

## Vorgehen für das nächste Mal

1. **Fragen, wo der Besitzer misst** (Welt, Stelle, Lampe an?) und die Zahlen
   vom Schild holen lassen: fps, Hz, CPU, GPU, Draws.
2. **Hier nachstellen und zählen**: Zeichenaufrufe nach Elternpfad. Viele
   gleiche Namen → bündeln (`ModelBatch`) oder verschmelzen (`mergeByLook`).
   Ein Paar aus Geometrie und Material je Aufruf heißt: Materialien sind
   Kopien — dann nach Aussehen gruppieren (`lookOf`, `sameLook`).
3. **CPU profilieren** (siehe oben) und die drei größten Posten angehen.
   Typische Muster: etwas wird je Frage statt je Bild gerechnet; ein Lauf über
   alle Dinge statt über die nahen; Matrizen von Dingen, die sich nie bewegen.
4. **Vorher/Nachher-Bild an derselben Stelle** — das Bild muss gleich bleiben.
5. **Messen, eintragen, dem Besitzer die erwartete Wirkung nennen** und um
   seine neue Zahl bitten.

## Fallen, in die schon jemand getreten ist

- **Gepackte Geometrie**: Die Modelle aus dem Regal haben 16-Bit-normierte
  Positionen. `applyMatrix4` darauf kappt alles über 1 — der Monitor lag flach.
  Vor dem Verschmelzen in Fließkomma umwandeln (`mergeByLook.asFloat`).
- **Jede Regaldatei bringt ihre eigene Kopie desselben Texturatlas mit**: Nach
  der Textur-ID sieht nichts gleich aus. `mergeByLook.textureKey` vergleicht
  den Bildinhalt.
- **Was den Saum (Umriss) bekommt, muss einzeln stehen**: Leuchtende Elemente
  (`elementLit`) nicht bündeln; was trotzdem gebündelt ist, steht frei, solange
  es leuchtet (`PortalWorld.isHighlighted` als `loose`).
- **Eingefroren heißt: wer es bewegt, muss es wieder auftauen.** Nur einfrieren,
  was sich wirklich nie rührt; Gelenke (Türblatt, Hebelgriff) bleiben lebendig.
  Unsichtbares hat eine stehende Weltmatrix — wer sie braucht, fragt
  `getWorldPosition`.
- **`matrixWorldAutoUpdate` hält den Lauf in three r185 nicht an** — er besucht
  trotzdem jedes Kind. Wirklich spart nur, nicht hinabzusteigen
  (`skipHiddenMatrices`, `skipFrozen`).
- **Die Messung im Menü** lügt (Foveation aus), **SwiftShader-Bildzeiten**
  sagen nichts über die Brille — nur Verhältnisse und Zählwerte tragen.
- **`BatchedMesh` ohne `WEBGL_multi_draw`** zerlegt three in einen Aufruf je
  Stück — schlechter als Instanzen. Darum entscheidet `App` beim Start
  (`allowMultiDraw`), und das Schild zeigt „MD", wenn es an ist. Alle
  Geometrien eines `BatchedMesh` müssen dieselben Spalten haben;
  `modelBatch.plainOf` macht sie gleich (Fließkomma, mit Index).
- **Jedes Teil einer Figur hat sein eigenes Knochenverzeichnis** — dieselben
  Knochen, andere Reihenfolge, und eine Bindepose, die je Teil um einen festen
  Versatz verschoben ist. Zusammenlegen heißt: ein gemeinsames Verzeichnis
  (`unionSkeleton`), die Knochennummern umrechnen und die Ecken jedes Teils um
  seinen Versatz in den gemeinsamen Raum bringen. Ohne den Versatz fallen die
  Arme ab.
- **Prettier auf Markdown** formatiert ganze Kapitel um (`spielelemente.md`,
  README) — nur `src/` formatieren, Doku von Hand.
