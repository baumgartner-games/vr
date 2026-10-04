# Lampen und Lichter

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

Gewünscht, nach den leuchtenden Laternen der Stadt: _„Ja wir sollten bei
Lampen und Lichtern etwas genauer drauf achten."_ Die Szenarien dazu: die
Station, deren Lampen das Board schaltet (höchstens zwei brennen); Notlicht, das
rot blinkt oder sich dreht; eine Tischlampe, die man von Hand schaltet; Tisch-
und Deko-Lampen im Restaurant, die nachts angehen wie Straßenlaternen;
Grusellicht, das flackert. _„Ich denke default bei Nacht an wäre schonmal gut.
Und dann muss man beim Einrichtungsmodus bzw. Baumodus noch die Lampen anpassen
können … um alle Lampen vom gleichen Typ in der Welt den default zu ändern.
Diese Lampe den override zu ändern. Alle Lampen von diesem Typ mit override
finden. Alle Lampen finden bzw hervorheben (wie röntgen)."_

## Die Teile

| Teil                                               | Datei                         | three.js |
| -------------------------------------------------- | ----------------------------- | -------- |
| **Typ** — welche Modelle Lampen sind, wo ihr Licht sitzt | `core/lamps/lampTypes.ts`     | nein     |
| **Verhalten** — Betrieb, Lichtart, Farbe, Auflösung | `core/lamps/lampBehaviour.ts` | nein     |
| **Buch** — was in dieser Welt eingestellt ist       | `core/lamps/lampBook.ts`      | nein     |
| **Bild** — Schein, Lichtfleck, echtes Licht, Markierung | `core/Lamps.ts`               | ja       |
| **Menü** — Rechtsklick auf ein Element              | `worlds/grid/inspectMenu.ts`, `GridWorld.inspectAt` | wenig |

### Typ (`lampTypes.ts`)

Jede Lampe aus dem Regal steht dort mit ihrer Datei (`pack/datei`), ihrem Namen,
ihren **Leuchten** als Anteile ihres Kastens (abgemessen an der Vorderansicht;
über 1 heißt: über dem Modell, die Flamme über der Kerze), ob sie einen
**Lichtfleck** auf den Boden wirft, wie weit ihr Licht reicht (`reach`, mal ihre
Höhe), wie hell ihr echtes Licht ist (`power`), ob der Schein im Gehäuse sitzt
(`inset`) und was ab Werk gilt (`defaults`). Erkannt wird ein Modell am Namen
seiner Hülle, `…/pack/datei.glb` (`kaykitModel.copyOf`) — **keine Welt muss
etwas tun**, eine Lampe aus dem Regal leuchtet überall, auch wenn sie jemand im
Weltbau hinstellt.

Drin sind: Straßenlaterne, alte Laterne, Doppellaterne, die drei Ampeln
(city-builder-bits); Steh-, Tisch- und Schreibtischlampen (furniture-bits);
Kerzen, Kerzenbord, Kerzennische, Fackeln (dungeon, halloween-bits,
rpg-tools-bits); Laternen, Laternenpfahl, Kürbislaterne, Totenkopf mit Kerzen
(halloween-bits); Gaslaternen (holiday-bits); Lichtmast (space-base-bits).
**Eine neue Lampe** kommt in die Liste, mit einem Blick auf ihre Vorderansicht.

### Verhalten (`lampBehaviour.ts`)

- **Betrieb** (`LampMode`): _Bei Nacht_ (ab Werk: an, sobald _Grafik → Wetter →
  Tageszeit_ Abend oder Nacht ist) · _Immer an_ · _Aus_ · _Schalter_ (wie
  `on` steht — die Tischlampe).
- **Lichtart** (`LampEffect`): _Ruhig_ · _Flackern_ (Kerze, Fackel, Grusel;
  ab Werk bei allem mit Flamme) · _Blinken_ (Notlicht) · _Drehlicht_ ·
  _Pulsieren_ (Alarm) · _Ampel_ (Grün 6 s, Gelb 2, Rot 7, Rot-Gelb 1; quer
  stehende einen halben Umlauf versetzt; die Fußgängerampel grün, solange die
  Autos davor Rot haben).
- **Farbe** (`LampColor`): _Eigene_ (die der Art: warm, Flamme, kalt …) oder
  Warm, Weiß, Kalt, Rot, Grün, Blau, Lila. Ampelfarben bleiben immer.

**Drei Ebenen, die untere gewinnt** (`resolveSettings`), und zwar Feld für
Feld: der Standard des **Typs**, der Standard der **Welt** für diesen Typ, die
Abweichung **dieser einen Lampe**. Darüber liegt der **Hauptschalter**
(_Grafik → Wetter → Lampen_: Automatisch / An / Aus, `lampBurns`): _An_ zündet,
was bei Nacht brennen würde, auch am Tag; _Aus_ löscht alles; eine Lampe, die
ausdrücklich _Aus_ ist oder deren Schalter aus steht, bleibt auch unter _An_
dunkel.

Alles, was sich bewegt, hängt an der Uhr und einem **Samen je Lampe** aus ihrem
Schlüssel (`lampSeed`, `lampLevel`) — zwei Geräte sehen dasselbe Flackern, und
nicht alle Kerzen flackern im selben Takt.

### Buch (`lampBook.ts`) und Weltdatei

Es gibt **ein** Buch, das der geladenen Welt (`lampBook`). `GridWorld.init`
füllt es aus dem Speicher der Welt (`storedWorld(id).lamps`), **auch wo sonst
nichts gebaut werden darf** — eine Laterne einstellen ist kein Umbau. Jede
Änderung wird 0,8 s danach gespeichert (`stepLampSave`, echte Zeit), beim
Verlassen sofort. Export, Import und _Zurücksetzen_ nehmen die Lampen mit. Das
Buch gehört der Welt, die es geladen hat (`load(file, owner)`, `release`):
Räumt die alte Welt erst auf, nachdem die neue geladen hat, bleibt das Buch der
neuen.

In der **Weltdatei** ab Fassung `0.5` (`grid/worldFile.ts`):

```json
"lamps": {
  "types": { "furniture-bits/lamp_table": { "mode": "switch", "on": true } },
  "lamps": { "element:park-3/city-builder-bits/streetlight_old_double#0": { "effect": "flicker", "color": "green" } }
}
```

Was nicht stimmt, fällt weg (`cleanWorldLamps`, mit Test) — eine falsch
geschriebene Farbe nimmt die Welt nicht mit.

**Der Schlüssel einer Lampe** (`Lamps.keyOf`): Gehört sie zu einem
Spielelement, dessen Stelle und ihre Nummer darin
(`element:<stelle>/<typ>#<n>`) — sie zieht mit um, wenn das Element umgestellt
wird. Dafür trägt jedes Teil eines Elements `userData.elementSpot` und
`elementId` (`elementView.ts`): Die Teile stehen **neben** dem Anker in der
Welt, nicht darin. Sonst Modell und Ort auf zehn Zentimeter
(`<typ>@x,y,z`) — wer eine frei stehende Lampe verschiebt, hat eine neue Lampe.

### Bild (`core/Lamps.ts`)

Hängt an `GraphicsQuality` wie die Schatten-Kreise und sucht die Szene jede
Sekunde ab (am Tag ohne Einstellungen und ohne brennende Modelle nur alle zehn
Sekunden). **Drei Zeichenaufrufe für alle Lampen**: ein additiver Schein je
Leuchte (`THREE.Points`, Größe, Farbe und Vorziehen zur Kamera je Punkt), ein
additiver Lichtfleck je Lampe (`InstancedMesh`) und die Markierungen zum Finden
(`depthTest` aus, Ring mit Punkt, türkis wie der Standard, gelb mit
Abweichung). **Echtes Licht** (`PointLight`) bekommen nur die nächsten
brennenden Lampen am Kopf — sechs am Schirm, zwei in der Brille. Die Zahl bleibt
fest, solange irgendetwas brennt (ungenutzte stehen auf 0), weil jede andere
Zahl Lichter bedeutet, mit der three.js jedes Material neu übersetzt.

Wer nach den Lampen fragt: `lampsInScene()` — `instances()`, `pick(ray)`,
`worldBox(lamp)`, `rescan()`.

## Das Element-Menü im Einrichten

Gewünscht: _„Im Bau und Einrichtungs Modus will ich mit rechtsklick auf
Elemente ein Menü öffnen wo ich weiteres darüber erfahren kann oder einstellen
kann. In vr mit trigger bei mobile Touch länger gedrückt halten."_

Nur im _Einrichten_ und im _Baukasten_ (`movesFurniture`):

- **Schirm:** Rechtsklick. `GridWorld.bindInspect` hört in der **Fangphase**
  auf `pointerdown` und `mousedown` und nimmt den Klick nur, wenn er ein Element
  trifft — dann geht er nicht weiter (`stopImmediatePropagation`). Trifft er
  nichts, oder hängt etwas am Kran, ist er der Rechtsklick von vorher: Kran
  leeren, Abrissbombe, Portal B.
- **Handy:** einen Finger 0,55 s liegen lassen, ohne mehr als 12 Bildpunkte zu
  wandern.
- **Brille:** Trigger mit leerer Hand, nicht aufs Menü gezeigt (`stepInspect`).

Getroffen wird über **Kästen**, nicht über Netze — gebündelte Deko
(`staticDecor`) zeichnet ihre Netze woanders hin. Eine Lampe gewinnt, wenn sie
nicht deutlich hinter dem Element liegt (Laternen stehen als Teile auf
Straßenstücken). Die Seite (`INSPECT_PAGE`, versteckt im Menü) wird **zwei
Bilder später** aufgeschlagen: Der Klick kommt zwischen zwei Bildern an, im
ersten wird der Baum gebaut.

Auf der Seite: das Element (Name, Zweck, Grundfläche, ⓘ mit dem Steckbrief des
Katalogs), Modell und Ort, und bei einer Lampe:

- ob sie gerade brennt und warum;
- **Diese Lampe** — Betrieb, (bei _Schalter_) der Schalter, Lichtart, Farbe;
  _zurück auf Standard_;
- **Alle vom Typ … in dieser Welt** — Betrieb, Lichtart, Farbe; _Standard
  zurücksetzen_. Eigene Einstellungen einzelner Lampen bleiben dabei;
- **Finden** — dieser Typ mit eigener Einstellung, alle dieses Typs, alle
  Lampen; _Markierung aus_. Das Menü geht dabei zu, damit man es sieht.

## Was noch kommt

- **Antippen im Spiel**: Lampen im Betrieb _Schalter_ mit `A`/`E`/Trigger
  umlegen (`Usable`).
- **Station**: Die Raumlampen über das Lampen-System — das Board bleibt die
  Instanz (`haunting/rules/lamps.ts`, Budget 2), ein Betrieb _Gesteuert_ hängt
  sie an einen Kanal; der Alarm legt Notlicht (rot, Blinken/Drehlicht) darüber.
  Heute hat die Station ihr eigenes Licht (`HauntingWorld.applyLights`, zwei
  echte Lichter) und ihre roten Drehlichter (`shipArt.buildCorridorBeacons`).
- **Szenarien**: Restaurant-Deko auf _Bei Nacht_, Grusel-Flackern in der
  Spukstadt als Weltstandard.
- **Mehrspieler**: Das Buch geht noch nicht übers Netz.
