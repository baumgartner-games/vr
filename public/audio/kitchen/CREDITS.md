# Klänge der Küche

Alle Dateien in diesem Ordner sind **CC0** ([CC0 1.0
Universal](http://creativecommons.org/publicdomain/zero/1.0/), Public Domain).
Namensnennung ist damit nicht nötig — die Urheber freuen sich trotzdem, und
deshalb steht sie hier.

Bearbeitet wurde alles mit ffmpeg auf **Mono, 44,1 kHz, Ogg Vorbis q3**, von
führender Stille befreit und auf einen festen Spitzenpegel gebracht (−1 dBFS
bei den einmaligen Tönen, −3 bis −4 dBFS bei den Schleifen, weil eine Schleife
unter allem liegt und kein Ereignis ist). Die letzten 30 ms eines einmaligen
Tons sind ausgeblendet — ein Ausschnitt, der mitten im Ausklang endet, knackt. Die **Schleifen** sind zusätzlich
geschlossen: Der Ausschnitt ist um die Blende länger geholt, und sein Ende ist
mit gleicher Leistung (`afade=curve=qsin`) über seinen Anfang gelegt — sonst
klickt jede Wiederholung.

Welche Datei zu welchem Ereignis gehört, steht in
`src/worlds/test/zones/kitchenSound.ts` (`KITCHEN_CUES`).

**Eine Zeile gehört zu einer Wahl, die noch aussteht** (`SOUND_TRIALS`
ebendort): Für die Abgabe eines Gerichts liegen drei einzelne Töne bereit
(`serve-*`). Umgeschaltet wird an zwei Knöpfen vor der Ausgabetheke. Steht die
Wahl, bleibt ein Ton übrig, und der Rest fliegt hier wieder heraus.

**Beim Messer auf dem Brett ist das schon geschehen**: Von den drei Sätzen, die
zur Wahl standen, ist das Küchenbrett geblieben (`chop-board-*`); die Kenney-Hiebe
(`chop-*`) und der Hackblock (`chop-wood-*`) sind mitsamt ihren Knöpfen weg.

## Geräusche

| Datei              | Quelle                                                   | Urheber      | Seite                                                           | Bearbeitung                     |
| ------------------ | -------------------------------------------------------- | ------------ | --------------------------------------------------------------- | ------------------------------- |
| `chop-board-0..3.ogg` | dieselbe Aufnahme, Hiebe bei 3,68 / 14,42 / 25,37 / 49,44 s | bretbernhoft | [OGA](https://opengameart.org/content/general-household-sound-effects) | Hochpass 90 Hz, Ausschnitt 0,25 s |
| `sizzle.ogg`       | `fryingpan01.wav`                                        | bretbernhoft | [OGA](https://opengameart.org/content/general-household-sound-effects) | Schleife 4 s ab 20 s      |
| `water.ogg`        | `kitchensink02.wav`                                      | bretbernhoft | [OGA](https://opengameart.org/content/general-household-sound-effects) | Schleife 2,2 s ab 40 s    |
| `combine-0.ogg`    | _100 CC0 SFX_, `plop_01.ogg`                             | rubberduck   | [OGA](https://opengameart.org/content/100-cc0-sfx)              | —                               |
| `combine-1.ogg`    | _100 CC0 SFX_, `plop_02.ogg`                             | rubberduck   | [OGA](https://opengameart.org/content/100-cc0-sfx)              | —                               |
| `crate-0.ogg`      | _100 CC0 SFX_, `wooded_box_open.ogg`                     | rubberduck   | [OGA](https://opengameart.org/content/100-cc0-sfx)              | —                               |
| `warn.ogg`         | Kenney _Interface Sounds_, `question_003.ogg`            | Kenney       | [kenney.nl](https://kenney.nl/assets/interface-sounds)          | —                               |
| `fire.ogg`         | _Fireplace Sound Loop_, `fire.wav`                       | PagDev       | [OGA](https://opengameart.org/content/fireplace-sound-loop)     | Schleife 5 s ab 6 s             |
| `spray.ogg`        | `airfryer01.wav`                                         | bretbernhoft | [OGA](https://opengameart.org/content/general-household-sound-effects) | Hochpass 700 Hz ×2, Schleife 2,2 s |
| `douse.ogg`        | _Steam Release Sounds_, `steam hisses - Marker #1.wav`   | bart         | [OGA](https://opengameart.org/content/steam-release-sounds)     | auf 1 s gekürzt                 |
| `serve-bell.ogg`   | _4 Metal Dings/Rings_, `ding.4.ogg`                      | StarNinjas   | [OGA](https://opengameart.org/content/4-metal-dingsrings)       | —                               |
| `serve-steel.ogg`  | Kenney _Music Jingles_, `jingles_STEEL09.ogg`            | Kenney       | [kenney.nl](https://kenney.nl/assets/music-jingles)             | —                               |
| `serve-sax.ogg`    | Kenney _Music Jingles_, `jingles_SAX00.ogg`              | Kenney       | [kenney.nl](https://kenney.nl/assets/music-jingles)             | —                               |
| `place-0..2.ogg`   | Kenney _Impact Sounds_, `impactWood_light_000/001/002`   | Kenney       | [kenney.nl](https://kenney.nl/assets/impact-sounds)             | —                               |
| `pick-0.ogg`       | Kenney _RPG Audio_, `handleSmallLeather.ogg`             | Kenney       | [kenney.nl](https://kenney.nl/assets/rpg-audio)                  | —                               |
| `pick-1.ogg`       | Kenney _RPG Audio_, `beltHandle1.ogg`                    | Kenney       | [kenney.nl](https://kenney.nl/assets/rpg-audio)                  | —                               |

**Die Vorratskiste hat nur noch eine Aufnahme.** Daneben lag einmal ein
Oberflächenton aus einem Bedienfeld (Kenney _Interface Sounds_,
`open_004.ogg`); im Wechsel mit der Holzkiste klang die Ausgabe dadurch nach
zwei verschiedenen Dingen — einmal nach Klappe, einmal nach Raumschiff. Eine
Kiste ist aus Holz.

**Schritte gibt es nicht mehr.** Es lagen vier hier (Kenney _Impact Sounds_
und _RPG Audio_), getaktet nach der zurückgelegten Strecke. Beim Kochen läuft
man ununterbrochen, und vier Aufnahmen im Wechsel wurden daraus ein Trommeln
unter allem, was man hören wollte.

**Der Strahl des Feuerlöschers ist eine Heißluftfritteuse**, und das ist kein
Scherz, sondern die ehrlichste Lösung: Ein Löscher macht gleichmäßiges
Rauschen, und genau das ist in den erreichbaren CC0-Quellen selten. Die
Dampfzischer daneben (`douse.ogg`) klingen binnen einer halben Sekunde ab — als
einmaliger Ton sind sie perfekt, als Schleife pumpen sie. Zweimal Hochpass bei
700 Hz nimmt der Fritteuse ihr Brummen, übrig bleibt das Zischen.

## Musik fürs Radio

Drei Sender, alle von **Cleyton Kauffman**, alle CC0. Der Autor bittet
freiwillig um die Zeile _„Music by Cleyton Kauffman —
https://soundcloud.com/cleytonkauffman"_ — hiermit gern.

| Datei         | Titel                                            | Seite                                                                  |
| ------------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| `radio-0.ogg` | _Buy Something!_ (Shop Theme), **Radio Edit**    | [OGA](https://opengameart.org/content/shop-theme)                      |
| `radio-1.ogg` | _Childhood Flavors_ (Ice Cream Truck Theme)      | [OGA](https://opengameart.org/content/ice-cream-truck-theme)           |
| `radio-2.ogg` | _Children's March Theme_                          | [OGA](https://opengameart.org/content/childrens-march-theme)           |

Alle drei sind **Mono, 32 kHz, Ogg Vorbis q0** — Musik aus einem Kofferradio
braucht keine 44,1 kHz in Stereo, und drei Sender à 90 s wären sonst das
Doppelte der ganzen übrigen Küche.

**Der erste Sender ist der Radio Edit**, und der ist der Grund, warum er der
erste ist: Der Komponist hat dieselbe Musik noch einmal bandpassgefiltert
abgemischt, „as if it's being played through elevator speakers". Ein eigener
Filter im Spiel wäre die schlechtere Fassung derselben Idee — und der Ton, den
ein kleiner Lautsprecher in einer Küche macht, ist genau der, auf den es bei
diesem Gerät ankommt.

Die Länge der Dateien ist beim Umrechnen **auf die Probe** unverändert
geblieben (88,000 s / 91,429 s / 63,994 s): Alle drei sind vom Autor als
nahtlose Schleifen gebaut, und ein Encoder, der vorn oder hinten Stille
anhängt, macht aus jeder Wiederholung ein Stolpern. Deshalb liegt hier auch
kein MP3 — das hat dieses Polster bauartbedingt.
