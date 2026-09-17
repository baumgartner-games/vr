# Quest 3: Referenzeinstellung und Bildzeit-Budget

Dieses Dokument beantwortet eine Frage, die aus der Brille kam: **In der
Testwelt stehen auf der Quest 3 konstant 29–32 fps, egal welche Einstellung —
in der Hub-Welt 80.** Gesucht sind 60 fps.

Es enthält die **empfohlene Einstellung**, die Messreihe, aus der sie folgt, die
Zielmarken in Millisekunden und — genauso wichtig — den Absatz darüber, was
diese Messung **nicht** sagt.

Gemessen wird mit `tools/fps-bench.mjs` (`npm run fps`). Die Messung lief am
17. September 2026 gegen `npm run dev` auf einem ruhigen Arbeitsbaum, Stand
`bf092f3`.

> **Diese Zahlen sind der Stand _vor_ zwei Eingriffen in die Szene.** Unmittelbar
> nach der Messung sind zwei Befunde behoben worden, die genau das tun, was der
> Abschnitt [_Und der Befund, um den es eigentlich geht_](#und-der-befund-um-den-es-eigentlich-geht)
> verlangt — Dinge wegräumen statt am Menü drehen:
>
> - **Der Spiegel im Kleiderschrank** neben dem Start zeichnete die ganze Welt
>   ein zweites Mal (`worlds/shared/Mirror.ts`): 2,31 ms und bis zu 301
>   Zeichenaufrufe je Bild. Seine Sichtweite hängt jetzt an dem, was die Scheibe
>   am Auge einnimmt, statt an pauschalen 14 Metern.
> - **2764 unsichtbare Objekte** liefen dreimal je Bild durch den Matrizenlauf
>   (`GridWorld.freezeBatched`, `WorldEditor.showMini`):
>   `scene.updateMatrixWorld()` 1,09 ms → 0,25 ms.
>
> Gemessen haben die beiden zusammen **−24 % Bild-CPU** in der Testwelt (am
> Startplatz 3,80 → 2,90 ms JavaScript je Bild), im Hub unverändert 0,30 ms.
> Für 60 fps reicht das **nicht** — siehe
> [_Was noch offen ist_](#was-noch-offen-ist).
>
> Die Tabellen unten bleiben trotzdem stehen, und zwar als **Ausgangslage**: Sie
> sind die Messung, aus der die beiden Eingriffe folgten. Wer die Wirkung sehen
> will, misst neu — `npm run fps`, zwei Befehle am Ende dieses Dokuments.

## Die empfohlene Einstellung für die Quest 3

Zeile für Zeile, so wie sie unter _Menü → Grafik_ steht
(`src/core/graphicsSettings.ts`):

| Zeile | Empfehlung | Was sie kostet, was sie bringt |
| --- | --- | --- |
| **Stufe** (`mode`) | **Einfach** | Comic zeichnet jedes Ding **zweimal** — einmal die Fläche, einmal die Kontur (`core/outlineShell.ts`). In der Testwelt steigen die Zeichenaufrufe dabei von **607 auf 988** und die Bildzeit um **18 %**, im Hub um **22 %**. Das ist der teuerste einzelne Schalter im Menü, und er kauft nichts als Aussehen. |
| **Schatten** (`shadows`) | **Aus** in der Testwelt, **an** im Hub | Der zweite Renderdurchgang für die Schattenkarte kostet in der Testwelt **126 zusätzliche Zeichenaufrufe** und **34 % Bildzeit**, im Hub 8 Aufrufe und 25 %. Das ist der **größte Gewinn, den das Menü hier hergibt** — und trotzdem meldet die Brille, dass Schatten an oder aus dort **nichts** ändert. Beides stimmt: Hier rastert eine CPU, und ein zweiter Durchgang über die Schattenkarte kostet sie Füllrate; auf der Quest erledigt das die GPU, die sich langweilt. **Die 34 % übertragen sich also nicht.** Mitnehmen kann man sie trotzdem, sie kosten nichts. Im Hub bleiben Schatten an: Dort sind 25 % von einer Bildzeit, die ohnehin unter dem Budget liegt, gut angelegtes Geld für ein Bild, das nicht schwebt. |
| **Brille** (`xrScale`) | **0,7 (Flüssig)** in der Testwelt, **0,85 (Mittel)** im Hub | Der eine Regler, der **nur** in XR zieht (`GraphicsQuality.applyRenderer` → `setFramebufferScaleFactor`). Am Bildschirm ist er nachweislich wirkungslos (siehe die Kontrollzeilen unten); sein Stellvertreter am Schirm — derselbe Faktor auf den Bildpuffer — spart im Hub **39 %**, in der Testwelt aber nur **24 %**. Genau diese Hälfte ist die Aussage: In der Testwelt hängt die Bildzeit **nicht** an den Bildpunkten. |
| **Bildrate im Bild** (`showFps`) | **An**, solange gestimmt wird | Kostet nichts (ein DOM-Feld, in der Brille unsichtbar), misst aber weiter — das Handgelenk-Menü zeigt die Zahl. Ohne sie stellt man in der Brille blind ein. |
| **Bildschirm-Steuerung** (`screenPads`) | **Automatisch** | In der Brille ohne Wirkung; die Stöcke auf dem Glas gibt es dort nicht. Steht hier nur, damit die Zeile nicht als vergessen gilt. |
| **Gitterlinien** (`gridLines`) | **Aus** | Werkstattansicht. Halbtransparente Kanten über dem ganzen Boden sind zusätzliche, durchsichtige Flächen — das Teuerste, was eine Füllrate kennt. |
| **Hitboxen** (`hitBoxes`) | **Aus** | Werkstattansicht, **ohne Tiefenprüfung** gezeichnet: jeder Kasten, jede Kapsel, jeder Zylinder der Physik als eigener Zeichenaufruf über allem. |
| **Griffe** (`showHandles`) | **Aus** | Ein Achsenkreuz je Griffstelle; dasselbe Argument wie eine Zeile darüber. |

**In drei Zeilen:** Einfach statt Comic, Schatten in der Testwelt aus, Brille
auf 0,7. Zusammen rund die Hälfte der Bildzeit — **auf dem Papier und auf dieser
Maschine.** Warum das in der Brille nicht dasselbe ist, steht unter
[_Die Zielmarken_](#die-zielmarken); die kurze Fassung: Das Menü hat keinen
Regler für die Zahl der Dinge, und genau daran hängt die Testwelt.

## Die Messtabelle

`npm run fps -- --size=640x360 --sizes=1280x720,960x540 --seconds=7
--min-frames=35 --max-seconds=22 --repeats=3`, kopfloses Chromium mit
SwiftShader, Basisfenster 640 × 360, drei verschränkte Durchgänge, Median.

Gemessen wird aus den Augen (nicht von oben), nach einer verworfenen
Aufwärmphase von 2,5 s.

| Welt | Fall | ⌀ Bildzeit | Median | 1 % ≥ | CPU je Bild | Draws | Dreiecke |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| hub | Basis (Einfach, Schatten an) | 173,0 ms | 166,7 ms | 499,9 ms | 2,0 ms | 30 | 17 412 |
| hub | Schatten aus | 127,1 ms | 116,7 ms | 333,3 ms | 1,9 ms | 22 | 9 960 |
| hub | Comic, Schatten an | 206,5 ms | 200,0 ms | 533,3 ms | 2,2 ms | 38 | 24 864 |
| hub | Comic, Schatten aus | 145,0 ms | 149,9 ms | 399,9 ms | 1,9 ms | 30 | 17 412 |
| hub | xrScale 0,85 | 156,2 ms | 150,0 ms | 333,3 ms | 2,1 ms | 30 | 17 412 |
| hub | xrScale 0,7 | 171,9 ms | 166,6 ms | 500,0 ms | 2,1 ms | 30 | 17 412 |
| hub | Bildpuffer 0,85 | 133,6 ms | 133,3 ms | 350,0 ms | 5,6 ms | 30 | 17 412 |
| hub | Bildpuffer 0,7 | 103,9 ms | 100,0 ms | 266,7 ms | 2,4 ms | 30 | 17 412 |
| hub | Fenster 960 × 540 | 300,9 ms | 283,3 ms | 716,6 ms | 1,9 ms | 30 | 17 412 |
| hub | Fenster 1280 × 720 | 483,8 ms | 466,6 ms | 1233,3 ms | 3,9 ms | 30 | 17 412 |
| **test** | **Basis (Einfach, Schatten an)** | **580,5 ms** | 500,0 ms | 2166,7 ms | **23,6 ms** | **607** | **127 678** |
| test | Schatten aus | 382,4 ms | 300,0 ms | 2199,9 ms | 12,3 ms | 481 | 92 584 |
| test | Comic, Schatten an | 684,7 ms | 616,7 ms | 2183,3 ms | 18,2 ms | 988 | 213 944 |
| test | Comic, Schatten aus | 503,8 ms | 433,4 ms | 2033,2 ms | 15,0 ms | 862 | 178 850 |
| test | xrScale 0,85 | 601,4 ms | 516,7 ms | 2466,6 ms | 12,1 ms | 607 | 127 678 |
| test | xrScale 0,7 | 584,7 ms | 516,6 ms | 2349,9 ms | 14,9 ms | 607 | 127 678 |
| test | Bildpuffer 0,85 | 511,4 ms | 416,6 ms | 2216,6 ms | 15,7 ms | 607 | 127 678 |
| test | Bildpuffer 0,7 | 442,4 ms | 366,6 ms | 2233,3 ms | 15,0 ms | 607 | 127 678 |
| test | Fenster 960 × 540 | 777,4 ms | 699,9 ms | 2466,6 ms | 18,6 ms | 607 | 127 678 |
| test | Fenster 1280 × 720 | 1003,4 ms | 966,7 ms | 2216,6 ms | 11,6 ms | 607 | 127 678 |

**1 % ≥** ist das 1-%-Perzentil der Bildzeit: die langsamsten ein Prozent der
Bilder. Das ist der Ruckler, den man in der Brille spürt und den ein Mittelwert
versteckt. **CPU je Bild** ist die JavaScript-Zeit eines Schritts
(`core/FrameStats.ts`), nicht die Zeit der Grafik.

### Was jeder Schalter bringt

Gerechnet wird **paarweise innerhalb eines Durchgangs** (Fall gegen Basis
derselben Welt in derselben Minute), darüber der Median — sonst misst man die
Schwankung der Maschine und nennt sie Ergebnis.

| Fall | Hub | Testwelt |
| --- | ---: | ---: |
| Schatten aus | **−25 %** | **−34 %** |
| Comic an | +22 % | +18 % |
| Comic an, dafür Schatten aus | −14 % | −14 % |
| **xrScale 0,85** | −8 % | +4 % |
| **xrScale 0,7** | +2 % | +7 % |
| Bildpuffer 0,85 | −21 % | −12 % |
| Bildpuffer 0,7 | **−39 %** | **−24 %** |
| Fenster 960 × 540 (2,25× Bildpunkte) | +78 % | +41 % |
| Fenster 1280 × 720 (4× Bildpunkte) | +178 % | +73 % |

**Der Schalter, der nichts bringt, ist der wichtigste Befund.** Die beiden
`xrScale`-Zeilen stehen bei −8 % bis +7 %, und das **muss** so sein: `xrScale`
wird ausschließlich an `renderer.xr.setFramebufferScaleFactor` weitergereicht,
und ohne Brille fasst diesen Wert niemand an (`App.resizeWebBuffer` rechnet am
Bildschirm mit `devicePixelRatio`). Die beiden Zeilen sind also **Nullproben**:
Was dort steht, ist das Rauschen der Maschine. **Alles unter ±10 % in dieser
Tabelle bedeutet nichts.**

### Und der Befund, um den es eigentlich geht

Zwei Zahlen aus derselben Tabelle, bei **gleicher** Auflösung:

- Die Testwelt braucht **3,4× die Bildzeit** des Hubs — 580,5 ms gegen 173,0 ms.
- Sie zeichnet dafür **607 statt 30** Zeichenaufrufe und **128 000 statt 17 000**
  Dreiecke, und ihr JavaScript braucht **23,6 statt 2,0 ms** je Bild.

Und die entscheidende Beobachtung: **Auflösung senken hilft in der Testwelt nur
halb so viel wie im Hub** (−24 % gegen −39 %), und **Auflösung erhöhen kostet
dort nur halb so viel** (+73 % gegen +178 % für die vierfache Bildpunktzahl).

Eine Welt, deren Bildzeit sich bei vierfacher Bildpunktzahl nur um 73 % erhöht,
hängt **nicht an den Bildpunkten**. Sie hängt an dem, was pro **Ding** anfällt:
Zeichenaufrufe, Zustandswechsel, Szenendurchläufe, Vertex-Arbeit — und an den
23,6 ms JavaScript. Genau das erklärt die Meldung aus der Brille: Das Grafikmenü
kennt keinen Regler für die Zahl der Dinge. Wer 607 Zeichenaufrufe hat, dreht an
`xrScale`, an den Schatten und an der Stufe — und sieht 29–32 fps, egal was er
einstellt.

**Die Bildrate der Testwelt wird nicht im Grafikmenü gewonnen, sondern in der
Szene.**

## Die Zielmarken

Die Quest 3 läuft mit 72, 80, 90 oder 120 Hz. Daraus folgt das Bildbudget — die
Zeit, die ein vollständiges Bild (beide Augen) höchstens brauchen darf:

| Bildwiederholrate | Budget je Bild |
| --- | ---: |
| 72 Hz | 13,9 ms |
| 80 Hz | 12,5 ms |
| 90 Hz | 11,1 ms |
| 120 Hz | 8,3 ms |
| **Auftragsziel: 60 fps** | **16,7 ms** |

**Wo die Testwelt heute steht** (gemessen auf dem Gerät, nicht hier): 29–32 fps
sind **31,3 bis 34,5 ms je Bild**.

**Was eingespart werden muss:**

| Ziel | Budget | Einzusparen (von 34,5 ms) | Einzusparen (von 31,3 ms) |
| --- | ---: | ---: | ---: |
| 60 fps | 16,7 ms | 17,8 ms = **52 %** | 14,6 ms = **47 %** |
| 72 Hz | 13,9 ms | 20,6 ms = **60 %** | 17,4 ms = **56 %** |
| 80 Hz | 12,5 ms | 22,0 ms = **64 %** | 18,8 ms = **60 %** |

Zum Vergleich der Hub: 80 fps sind 12,5 ms, und das ist die **Anzeigerate der
Brille**, nicht die Grenze der Welt — der Hub ist dort am Anschlag und hat Luft.

**Reicht die Referenzeinstellung?** Auf dem Papier knapp: Schatten aus (−34 %)
und ein kleinerer Bildpuffer (−24 %) ergeben zusammen 0,66 × 0,76 ≈ **0,50**,
also 34,5 ms → 17,3 ms oder 31,3 ms → 15,7 ms. Das liegt genau auf der
16,7-ms-Marke und **unter** keiner der Hz-Marken der Brille.

In der Brille reicht es nach Auskunft des Geräts **nicht** — dort ändert keine
Einstellung etwas. Das ist kein Widerspruch, sondern der Beleg für den Befund
darüber: Der Anteil der Bildzeit, den die Regler überhaupt erreichen, ist auf
der Quest kleiner als hier, weil dort die **607 Zeichenaufrufe pro Auge** die
Bildzeit bestimmen und nicht die Bildpunkte. Wer 60 fps will, muss in der
Testwelt Dinge zusammenlegen, wegräumen oder aus dem Bild nehmen — die
Einstellungen oben sind das, was man **zusätzlich** mitnimmt, nicht der Weg zum
Ziel.

## Was diese Messung NICHT sagt

Ein Absatz, ohne den die Tabellen oben gefährlich wären.

- **SwiftShader ist keine mobile GPU.** Gemessen wurde mit einem
  Software-Rasterizer auf vier CPU-Kernen. Absolute Bildzeiten von hier (173 ms,
  580 ms) haben mit der Brille **nichts** zu tun; sie sind ein bis zwei
  Größenordnungen daneben. Übertragbar sind ausschließlich **Verhältnisse**, und
  auch die nur so weit, wie beide Maschinen für dieselbe Sache bezahlen.
- **Ein Schirm ist nicht zwei Augen.** Die Brille zeichnet jedes Bild zweimal,
  aus zwei Positionen. Alles, was pro Auge anfällt — und das sind die
  Zeichenaufrufe —, verdoppelt sich dort; alles, was einmal je Bild anfällt —
  Physik, Netz, Spiellogik —, nicht. Das verschiebt das Verhältnis von CPU zu
  Grafik gegenüber dieser Tabelle.
- **Kein Reprojection.** Die Quest zeigt ein Bild, das sie nicht rechtzeitig
  bekommt, trotzdem an — verzerrt aus dem letzten. Eine gemessene Bildrate von
  30 auf einem 72-Hz-Panel ist deshalb etwas anderes als 30 hier.
- **Keine Foveation.** `GraphicsQuality` stellt in XR `setFoveation` (1 im
  einfachen Bild, 0,3 im Comic); der Bildschirm kennt das nicht. Am Rand des
  Blickfelds rechnet die Brille also gröber, als hier irgendwo abgebildet ist —
  das macht Auflösungsgewinne dort **kleiner**, als die Spalte „Bildpuffer"
  suggeriert.
- **`xrScale` wurde nicht gemessen, sondern ausgeschlossen.** Playwright hat
  keine XR-Sitzung. Die Zeilen `xrScale 0,85 / 0,7` belegen nur, dass der Regler
  **am Bildschirm** nichts tut — über seine Wirkung in der Brille sagen sie
  nichts. Der Stellvertreter dafür ist die Zeile „Bildpuffer", die denselben
  Faktor auf `renderer.setPixelRatio` legt.
- **Das 1-%-Perzentil steht auf wenigen Bildern.** Bei 580 ms je Bild passen in
  ein Messfenster von 22 Sekunden nur 35 Bilder; das „1 % ≥" ist dann faktisch
  das langsamste Bild. Es taugt als Größenordnung (die Testwelt ruckelt auf das
  **Vierfache** ihrer mittleren Bildzeit hoch, der Hub auf das Dreifache) und
  nicht als Zahl auf die Nachkommastelle.
- **Ein Standort ist nicht die Welt.** Gemessen wird am Startpunkt jeder Welt,
  aus den Augen, ohne Bewegung. Wer in der Testwelt in die Küche läuft, sieht
  andere Zahlen.

## Was noch offen ist

Die Ursachenrechnung hinter diesem Abschnitt steht ausführlich im
Untersuchungsbericht zu diesem Auftrag; hier die Posten, an denen die nächste
Runde ansetzt, in der Reihenfolge, in der sie sich lohnen.

**Erledigt** — beide oben im Kasten, zusammen gemessen −24 % Bild-CPU:

| | | gemessen |
| --- | --- | --- |
| **M1** | Der Spiegel im Kleiderschrank (`worlds/shared/Mirror.ts`) | Bild bis 5 m statt bis 12 m; dort, wo er lief: 1,8–2,0 ms und 188–213 Zeichenaufrufe je Bild → 0 |
| **M2** | 2764 unsichtbare Objekte aus dem Matrizenlauf (`GridWorld.freezeBatched`, `WorldEditor.showMini`) | `scene.updateMatrixWorld()` 1,10 → 0,74 ms je Aufruf, dreimal je Bild |

**Offen**, und der erste Posten ist der entscheidende:

| | | Schätzung Quest | Aufwand · Risiko |
| --- | --- | --- | --- |
| **M3** | **Küchenmöbel verschmelzen oder instanzieren** (`kitchenProps.ts`, `kitchenBelt.ts`). Ziel: von 607 auf unter 200 Zeichenaufrufe. Ein Tresen besteht aus 29 Meshes, ein Band aus 30, und es stehen 9 bzw. 10 davon herum. Zu prüfen ist dabei, was einzeln greifbar bleiben muss (`kitchenGrab.ts`, `kitchenCarry.ts`) — diese Teile bleiben eigene Meshes. | **−8 bis −14 ms** | groß · mittel |
| **M4** | Die **Schattenkarte** nur neu bestellen, wenn ihr Anker springt (`core/GraphicsQuality.ts`). `aimSun` rastet den Kasten ohnehin auf ein 2-m-Gitter; solange man in derselben Zelle steht, ist die vorhandene Karte richtig. Spart 118 Zeichenaufrufe und einen Szenendurchlauf in fast jedem Bild. | −3 bis −6 ms | klein · klein |
| **M5** | Den **Sekundendurchlauf** entschärfen (`core/GraphicsQuality.ts`, `RESCAN`). Er läuft einmal je Sekunde über alle 6000 Objekte — das ist der Ruckler hinter „29 ↔ 32 fps", nicht die Bildrate selbst. | gegen das Ruckeln | klein · klein |
| **M6** | **Multiview** prüfen: Ob `OVR_multiview2` auf der Quest 3 da ist und three es nutzt, ließ sich hier nicht messen — der Container hat keine Brille. Wenn ja, halbiert das die Absetzkosten aller Zeichenaufrufe. Die größte verbleibende Schraube, falls M3 und M4 nicht reichen. | — | mittel |
| **M7** | **Auf der Quest nachmessen.** Alle Zahlen dieses Dokuments sind Verhältnisse aus einem Software-Rasterizer. Die eine Messung, die zählt, steht noch aus: dieselbe Runde durch die Testwelt, vorher und nachher, mit der Bildratenanzeige aus dem Grafikmenü. | — | klein |

**Die ehrliche Hochrechnung für die Brille**: Aus den 33 ms von heute werden mit
M1 und M2 geschätzt **22–25 ms, also 40–45 fps** — spürbar besser, aber noch
nicht das Ziel. Die 60 fps hängen an **M3**: Es ist der einzige offene Posten,
der die 607 Zeichenaufrufe anfasst, und die zählen in der Brille doppelt, weil
jedes Auge sie einzeln bezahlt.

## Wie man die Messung wiederholt

Zwei Befehle, zwei Terminals:

```sh
npm run dev -- --port 5183
```

```sh
npm run fps -- --url=http://127.0.0.1:5183/ --size=640x360 \
  --sizes=1280x720,960x540 --seconds=7 --min-frames=35 --max-seconds=22 \
  --repeats=3 --out=.artifacts/fps-bench/lauf.json
```

`npm run fps -- --help` listet alle Schalter und Fälle. Im Container ohne
Playwright-Download zeigt `SMOKE_EXECUTABLE` auf den vorinstallierten Browser —
dieselbe Variable wie beim Rauchtest:

```sh
SMOKE_EXECUTABLE=/opt/pw-browsers/chromium npm run fps -- --url=http://127.0.0.1:5183/
```

**Gemessen wird auf einer ruhigen Maschine.** Ein zweiter Jest-Lauf oder ein
zweiter Agent auf denselben Kernen verschiebt die Bildzeit um den Faktor zwei —
die verschränkten Durchgänge und die paarweisen Quotienten fangen das teilweise
ab, die Spalte „Streuung" im Bericht sagt, wie gut. Und: Solange jemand unter
`src/` schreibt, lädt der Dev-Server die Seite mitten in der Messung neu; das
Werkzeug klemmt den HMR-Client deshalb ab, aber eine Welt, die gerade nicht
übersetzt, misst sich trotzdem nicht.

Wer eine echte GPU hat, misst zusätzlich `npm run fps -- --gpu` und stellt beide
Tabellen nebeneinander. In diesem Container gibt es keine: Chromium fällt auch
ohne `--use-angle=swiftshader` auf SwiftShader zurück
(`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)`).
