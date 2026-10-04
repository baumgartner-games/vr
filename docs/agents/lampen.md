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
  Tageszeit_ Abend oder Nacht ist — oder, wo die Welt einen Tageslauf hat,
  dessen Uhr ab 17:30) · _Immer an_ · _Aus_ · _Schalter_ (wie
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

## Was die Welt gerade sagt (`Lamps.state`)

Über den drei Ebenen liegt, was in diesem Augenblick passiert — dieselbe
Rechnung für das Bild und für die Zeile „Brennt gerade" im Menü:

- **Gesteuert** (`LampMode 'controlled'`, `lampBook.controller`): Eine Welt
  sagt je Ort, ob dort Licht brennt. **Steuert eine Welt, folgt ihr jede
  Lampe, an der niemand den Betrieb eingestellt hat** — man muss eine Lampe in
  der Station nicht eigens auf _Gesteuert_ stellen. Ohne Steuerung bleibt
  _Gesteuert_ dunkel.
- **Spuk** (_Wetter → Nebel: Spuk_): Was _Ruhig_ ab Werk hat und keine eigene
  Lichtart, **flackert** — gewünscht als Grusellicht, _„bei dem Arkham Grusel
  Licht zb würde ich die gerne mal flackern lassen"_. Wer eine Lampe
  ausdrücklich auf _Ruhig_ stellt, behält sie ruhig.
- **Alarm** (`lampBook.alarm`): Lampen mit **Notlicht** (`emergency`, ab Werk
  am Lichtmast; im Menü je Lampe und je Typ) brennen rot als Drehlicht, auch
  wenn sie sonst aus wären — nur der Hauptschalter _Aus_ hält sie dunkel.

Beides, Steuerung und Alarm, gehört nicht in die Datei; das Buch leert es beim
Laden, und die Welt setzt es danach.

## Die Station

Gewünscht: _„bei der Space Station will ich diese ja über das Board steuern, da
geht immer nur eine bzw. zwei Lampen an. Dann gibt es ja auch noch den Punkt,
dass Lampen ggf dort in rot ‚Notfall' leuchten sollen und blinken bzw. wie
diese Dreh Lichter."_

- **Das Board bleibt die Instanz.** Höchstens zwei Lampen, ihre Laufzeit und
  ihr Flackern am Ende stehen weiter in `haunting/rules/lamps.ts`; die
  Raumlampen (Glasscheibe je Raum, zwei echte Lichter für die nächsten) in
  `HauntingWorld.applyLights`.
- **Lampen aus dem Regal folgen dem Board**: `HauntingWorld.init` setzt
  `lampBook.controller` auf `boardLit(x, z)` — brennt der Raum an dieser
  Stelle (`state.lit`), vor der Mission überall.
- **Notfall** (`emergency` in `applyLights`: Notlicht der Bot-Runde, Alarm der
  Bot-Runde, oder die Runde ist verloren): Die Raumlampen, die brennen, werden
  **rot und pulsieren** im Takt der Drehleuchten (`alarmPulse`), Glas wie
  Licht; die roten Drehleuchten in den Gängen laufen wie vorher
  (`applyBeacons`); und `lampBook.alarm` dreht die Lampen mit Notlicht rot.

## Im Spiel antippen

Gewünscht: _„wie eine Tisch Lampe die man manuell an und aus schalten will"_.
Was **schaltbar** ist (`LampType.switchable`: Steh-, Tisch- und
Schreibtischlampen, Kerzen, Fackeln, kleine Laternen, der Kürbis — nicht
Straßenlaternen, Ampeln, Lichtmast), meldet `GridWorld.stepLampUses` einmal je
Sekunde als **Usable** an (`aimOnly`). Beim _Spielen_ legt `A`, `E` oder der
Trigger sie um: Sie bekommt den Betrieb _Schalter_ mit der Stellung, die sie
gerade nicht hat — das steht im Buch und damit in der Weltdatei. Im
_Einrichten_ und _Baukasten_ gehört der Trigger dem Element-Menü.

Nicht antippen lassen sich Lampen in **gebündelter Deko** (`staticDecor`,
etwa die Stehlampen im Hub und im Burgerladen): Ihre Netze sind dort
unsichtbar, und ein Usable mit versteckter Geometrie gilt nicht
(`core/usable.usableShows`). Leuchten tun sie trotzdem.

## Was noch kommt

- **Mehrspieler**: Das Buch geht noch nicht übers Netz.
- **Restaurant-Szenario**: erledigt über den Tageslauf ([Grafik](grafik.md#tageslauf-wie-der-tag-in-einer-welt-voranschreitet)):
  Das Restaurant wird nach Ladenschluss von selbst Abend und Nacht, und alle
  Lampen mit _Bei Nacht_ gehen an. Im Raum stehen bisher keine — aus dem
  Katalog hinstellen.
- **Nebel und Licht**: Der Nebel des Wetters liegt über den Lichtflecken,
  statt von ihnen aufgehellt zu werden.
