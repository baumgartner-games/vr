# Wüstenfahrt (Godot 4.3)

Ein Versuch, ein Video nachzubauen, das der Besitzer im Oktober 2026 geschickt hat: ein
weißer Pickup driftet, von schräg oben verfolgt, über Sanddünen — Staubfahnen hinter den
Hinterrädern, Reifenspuren, die im Sand liegen bleiben, helle alte Fahrwege, Felsen,
Kistenlager, Bretterwände, Weidezäune und Strommasten mit durchhängenden Leitungen.
Gewünscht: _„Können wir das mal versuchen nachzubauen. Auch gerne einfach mal in godot
aber unter /vr/godot/…?"_

## Starten

Godot **4.3** (oder neuer) öffnen → _Importieren_ → diesen Ordner (`godot/desert`) wählen →
▶. Beim ersten Öffnen importiert der Editor die Modelle.

| Taste | Gamepad | |
|---|---|---|
| W / ↑ | rechter Abzug | Gas |
| S / ↓ | linker Abzug | Bremse, rückwärts |
| A D / ← → | linker Stick | lenken |
| Leertaste | A | Handbremse (Drift) |
| R | Y | aufrichten |
| C | X | Kamera: hoch wie im Video / nah dran |

Ohne Editor, nur ein Bild (fährt selbst):

```
godot --path godot/desert -- --shot=/tmp/wueste.png --at=10   # --near: nahe Kamera
```

## Wie es gebaut ist

Alles entsteht beim Start in Code (`scripts/main.gd`), die Szene ist leer.

- **Dünen** (`terrain.gd`): Höhenfeld 480 × 480 m aus Rauschen — gestreckte Grate quer zum
  Wind, darunter weite Wellen, in der Mitte eine flache Mulde zum Losfahren. Netz und
  `HeightMapShape3D` aus denselben Höhen.
- **Sand** (`sand.gdshader`): zwei Sandtöne, Windrippel als geneigte Normale, Fahrwege hell
  und glatt. Eine **Spurkarte** (2048², RG8) liegt über dem ganzen Feld: Grün sind die alten
  Wege (beim Start gemalt), Rot die Reifenspuren — jedes Rad am Boden drückt alle 15 cm
  einen weichen Fleck hinein (`terrain.press`), der Shader macht daraus eine Rille.
  Hochgeladen wird höchstens 20-mal je Sekunde.
- **Pickup** (`car.gd`): `VehicleBody3D` (fährt nach +z), vorne lenken, hinten antreiben,
  Hinterräder mit wenig Haftung, die Handbremse nimmt ihnen noch mehr — so driftet er.
  Sand bremst ein wenig. Lenkwinkel schrumpft mit der Geschwindigkeit.
- **Staub**: je Hinterrad ein `GPUParticles3D`, weiche runde Billboards, die wachsen und
  verblassen; wie viel, hängt an Tempo, Durchdrehen und Querrutschen (`amount_ratio`).
- **Kamera**: 24 m hinter, 30 m über dem Wagen, dreht träge mit der Fahrtrichtung und
  blickt etwas voraus.
- **Licht**: Renderer _Compatibility_ (läuft auch auf Quest/Handy). Achtung: Dort wirkt die
  Sonne viel stärker — 0,34 ist richtig, 1,0 brennt alles weiß aus.

## Modelle

Aus dem Modellregal des Hauptprojekts (KayKit, CC0, Lizenzen in `models/*/LICENSE.txt`),
hierher kopiert und für Godot **entpackt** — das Regal ist meshopt-gepackt, das liest
Godots Import nicht (`tools/unpack-models.mjs`):

- `car_stationwagon` → der Pickup (weiß getönt)
- `rock_single_A–E` → Felsbrocken (sandbraun, halb eingesunken, damit man den Sockel nicht sieht)
- `box_A/B` → die hellen Kisten der Lager
- `fence_wood_straight` → Weidezäune entlang der Wege, `fence_stone_straight` → Bretterwände
- `streetlight_old_single` → Strommasten (dunkles Holz, ohne Körper: Die Hülle samt Lampenarm wäre eine breite Kiste)
- `bush` → 900 Büsche Gestrüpp als `MultiMesh`

## Offen

- Kakteen und Palmen wie im Video — im Regal gibt es keine.
- Die Spuren im Netz eindrücken (jetzt nur im Licht), Sand, der seitlich aufwirft.
- Ein Ziel: Checkpoints, Zeit, Driftpunkte.
- VR: Godot-OpenXR mit dem Wagen als Cockpit oder als Miniatur auf dem Tisch.
