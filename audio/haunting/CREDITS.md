# Klänge der Haunting-Station

Alle Dateien in diesem Ordner sind **CC0 1.0** (Public Domain) und stammen
aus der Sammlung [lavenderdotpet/CC0-Public-Domain-Sounds](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds)
(selbst CC0). Sie wurden mit ffmpeg auf Mono, 44,1 kHz, Ogg Vorbis q3
gebracht, auf −1 dBFS normalisiert, am Anfang von Stille befreit und zum
Teil in der Tonhöhe verschoben (`asetrate`). Nennung ist nicht nötig, aber
die Urheber freuen sich: Kenney (kenney.nl), Ben Burnes, die Ersteller der
„80 CC0 creature SFX", „100 CC0 wood/metal SFX", „30 CC0 SFX loops" und
„beast_or_animal" auf OpenGameArt.

| Datei                    | Quelle im Repository                                   | Bearbeitung          |
| ------------------------ | ------------------------------------------------------ | -------------------- |
| `player-step-0..3.ogg`   | `kenney_impactsounds/Audio/footstep_concrete_000..003` | —                    |
| `monster-walk-0..2.ogg`  | `kenney_impactsounds/Audio/footstep_wood_000..002`     | Tonhöhe ×0,68        |
| `monster-run-0..2.ogg`   | `kenney_impactsounds/Audio/impactMetal_heavy_000..002` | Tonhöhe ×0,78        |
| `monster-call-0.ogg`     | `beast_or_animal/Growl.wav`                            | Tonhöhe ×0,9         |
| `monster-call-1.ogg`     | `beast_or_animal/Growl 1.wav`                          | Tonhöhe ×0,9         |
| `monster-call-2.ogg`     | `80-CC0-creature-SFX/monster_04.ogg`                   | Tonhöhe ×0,85        |
| `monster-vent-0..2.ogg`  | `100-CC0-wood-metal-SFX/metal_sheet_01..03`            | Tonhöhe ×0,9         |
| `ambient-hum.ogg`        | `30-cc0-sfx-loops/ambient_01.ogg`                      | Schleife, 8,2 s      |
| `ambient-dark.ogg`       | `30-cc0-sfx-loops/noise_01.ogg`                        | Schleife, 7,2 s      |
| `ambient-engine.ogg`     | `sci-fi-sounds/Audio/spaceEngineLow_000.ogg`           | Schleife, 5 s, Vorrat |
| `creak-0..2.ogg`         | `kenney_rpgaudio/Audio/creak1..3`                      | —                    |
| `metal-0.ogg`            | `100-CC0-wood-metal-SFX/metal_hit_01.ogg`              | —                    |
| `metal-1.ogg`            | `100-CC0-wood-metal-SFX/metal_spring_01.ogg`           | —                    |
| `metal-2.ogg`            | `100-CC0-wood-metal-SFX/metal_falling_01.ogg`          | —                    |

Der Herzschlag hat keine Datei: Er wird synthetisiert (`audio/cues.ts`,
Platzhalter), weil in den erreichbaren CC0-Quellen keine Aufnahme lag.

Welche Datei zu welchem Cue gehört, steht in `src/worlds/haunting/audio/cues.ts`.
