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
  `WebGPURenderer`, nicht im `WebGLRenderer` dieses Projekts — ein Umstieg
  wäre ein großer Umbau (eigene Shader, `onBeforeCompile`, Comic-Look).
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
