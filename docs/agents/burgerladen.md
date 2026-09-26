# Der Burgerladen

Eine eigene kleine Welt (`#plateup`, Menü → _Burgerladen_, Tor im Hub und im
Gang südlich der Testküche): eine eingerichtete **Spielküche mit Gastraum**
und ein Spiel nach dem Vorbild von _PlateUp!_. Gäste kommen herein, setzen
sich an einen freien Tisch und bestellen einen Burger; man brät, schneidet,
legt auf einen Teller und bringt ihn hin, bevor die Geduld reißt.

Die Küche der Testwelt ist ein **Prüfstand** — Bänder, Baumodus, Kopierer,
Werkhalle. Dieser Laden ist das Gegenteil: ein fertiger Raum, in dem genau
eine Sache passiert. Die **Regeln am Möbel** sind trotzdem dieselben
(`test/zones/kitchenCarry.kitchenDeed`), damit ein Brötchen hier nicht anders
auf den Teller geht als dort.

## Was wo liegt

| Datei                               | Was darin steht |
| ----------------------------------- | --------------- |
| `worlds/plateup/plateUpPlan.ts`     | **Rein**: Grundriss (14 × 12 Kacheln Laden, Gehweg davor), Stationen, Tische und Stühle, die Tore, und der Weg der Gäste (`guestRoute` über `nav/navPath.findPath` + `smoothPath` auf einem eigenen Graphen ohne Möbelkacheln) |
| `worlds/plateup/plateUpGame.ts`     | **Rein**: der Tag — Kundenstrom, Zustände eines Gastes, Geduld, Bestellung, Bewertung, Kasse, Schwierigkeit, Schildtexte |
| `worlds/plateup/plateUpStations.ts` | **Rein**: was ein Druck an einer Station tut — `kitchenDeed` fragen und das Ergebnis auf Hand und Station anwenden; die Uhren von Brett und Grillplatte (`kitchenWork`) |
| `worlds/plateup/plateUpDecor.ts`    | **Rein**: das Inventar — Wände, Fenster, Tische, Stühle, Lampen, Bilder, Kakteen, Straße |
| `worlds/plateup/PlateUpWorld.ts`    | Die Darstellung: Modelle, Körper, Anmeldungen, Figuren, Sprechblasen, Tafeln |
| `worlds/plateup/plateUp.test.ts`    | Grundriss, ein ganzer Tag, Wut und Ladenschluss, die ganze Burgerkette an den Stationen, die Tore |

Die Welt erbt von `GridWorld` (siehe [Welten](./welten.md), _Eine neue Welt
hinzufügen_). Im Grundriss stehen nur **Boden, Wände und Tore**; die Möbel
stehen dort bewusst **nicht** als Bausteine, weil ein Baustein sein eigenes
Regalmodell mitbringt (`grid/blocks.BLOCK_MODELS`). Ihre Körper sind
unsichtbare Quader von 1,40 m (wie `kitchenBlocks.BLOCK_HEIGHT` — auf die
Zeile springt niemand), ihr Bild kommt aus dem Katalog. Die Wände des
Grundrisses sind ebenfalls nur Körper (`solidMaterial` gibt ein unsichtbares
Material); zu sehen sind die Wandstücke aus _Restaurant Bits_.

## Wie es aussieht

Alles aus dem KayKit-Regal, nichts Neues (siehe [Modelle](./modelle.md),
[Das KayKit-Regal](./assetregal.md)):

- **Möbel** aus dem Restaurant-Katalog (`core/dinerModel`, halbe Größe wie in
  der Testküche — Arbeitshöhe 0,5 m, ein runder Gasttisch auf 2 × 2 Kacheln):
  Kisten mit Brötchen, Fleisch, Salat, Tomaten, Arbeitsplatten, Schneidebrett,
  zwei einflammige Herde als Grillplatten, Tellerstapel, Kühlschrank,
  Hängeschränke, Durchreiche, Tische mit Tischdecken, Stühle, Senf, Ketchup,
  Speisekarten; Wände mit Fliesenspiegel, Fenstern mit roten Gardinen und
  einem Durchgang.
- **Aus dem Regal** (`core/kaykitModel`, auf eine **Höhe** eingepasst statt
  einem Paketmaßstab zu trauen — `DecorPiece.height`/`width`): Stehlampen,
  Bilderrahmen, Kakteen, Teppich (_Furniture Bits_), Kaugummi- und
  Slushy-Automat (_Mixed Bag_), Mülleimer (_Block Bits_), Glocke (_Holiday
  Bits_), Straßenlaternen, Bänke, Büsche, ein Taxi (_City Builder Bits_),
  Münzen (_Board Game Bits_).
- **Böden**: Schachbrettfliesen in der Küche (dieselben Farben wie die
  Testküche), warme Dielen im Gastraum — je eine Fläche mit
  `checkerTexture`; der Estrich darunter bleibt Körper (`underOwnFloor`).
- **Die Südwand wird von oben durchsichtig** (eigenes, geklontes Material,
  Deckkraft 0,22 in der Draufsicht): Die Kamera schaut von Süden, und sonst
  sähe man die untere Tischreihe nicht.
- Die **Gäste** sind die acht Helden aus _Adventurers_ (`loadKaykitFigure`,
  1,15 m — so groß wie die Kochfigur, nicht wie ein Mensch). Sie laufen mit
  `Walking_A`, sitzen mit `Sit_Chair_Idle` aus
  `Rig_Medium_Simulation.glb` (wird einmal geholt, `kaykitClips`).

## Der Spielablauf

1. **Laden öffnen**: die Glocke links an der Durchreiche (`A` davor), oder
   _Menü → Laden öffnen_. Vorher steht das Startschild vor der Durchreiche.
2. **Gäste** kommen in Abständen vom Gehweg, laufen über die Wegsuche durch
   die Tür zum **Nordstuhl** eines freien Tisches (sie schauen dann nach
   Süden, also in die Kamera) und setzen sich. Ist kein Tisch frei, wartet der
   nächste draußen — der Abstand läuft nicht weiter als bis null.
3. Über dem Gast eine **Sprechblase**: der bestellte Burger als Bild
   (Schichten von unten nach oben), sein Name und darunter der
   **Geduldsbalken** (grün → gelb → rot; unter 35 % pulsiert die Blase). Die
   Geduld läuft erst, wenn er sitzt. Die offenen Bestellungen stehen auch auf
   der Tafel über der Nordwand.
4. **Kochen**: Patty aus der Kiste auf die Grillplatte (brät allein in 5 s
   und verbrennt nicht — `griddle`), Salat/Tomate aufs Brett (schneidet in 3 s,
   solange man davorsteht; wer weggeht und wiederkommt, fängt von vorn an).
   Teller vom Stapel, damit an die Brötchenkiste, an die Grillplatte, ans
   Brett — der Teller nimmt es auf. Ablegen geht auf jeder Arbeitsplatte und
   auf der Durchreiche; der Mülleimer nimmt den Belag und lässt den Teller in
   der Hand.
5. **Servieren**: mit dem Teller an den Tisch. Nur das Bestellte, und nur auf
   einem Teller (`plateRecipe` ist streng, anders als die Theke der Testküche);
   sonst sagt eine Zeile, was fehlt. Der Gast isst 6 s, **zahlt** Preis plus
   Trinkgeld nach übriger Geduld (bis 5 Münzen), eine Münze steigt über dem
   Tisch auf, und er geht.
6. **Zu lange gewartet**: Er steht auf, ein rotes „!" in der Blase, und geht.
   Drei davon an einem Tag, und **der Laden macht zu** — Endschild, die Glocke
   fängt bei Tag 1 wieder an.
7. **Ladenschluss**: Nach der Öffnungszeit kommt niemand mehr; wer sitzt, wird
   noch bedient. Ist der Letzte draußen, steht die **Tagesbilanz** da
   (bedient, verloren, verdient, Kasse, was morgen neu ist), und die Glocke
   öffnet den nächsten Tag.

**Schwierigkeit** (`dayRules`): Öffnungszeit 75 s + 15 s je Tag (bis 150),
Abstand der Gäste 18 s − 2,5 s je Tag (ab 7 s), Geduld 70 s − 8 s je Tag (ab
35 s). Die Karte wächst: Tag 1 Hamburger, Tag 2 Salatburger, Tag 3
Tomatenburger, ab Tag 4 Burger Deluxe — und am Tag, an dem etwas dazukommt,
bestellt es jeder zweite Gast.

**Wo man den Stand sieht.** Drei Stellen, jede für eine Ansicht:

- die **Tafel über der Nordwand** (im Raum, dreht sich um die Hochachse zur
  Kamera): Tag, Uhr, bedient, verloren, Kasse und die offenen Bestellungen —
  in der Brille die einzige, und von oben zu sehen, solange die Kamera in der
  Küche steht;
- die **Zeile am Schirm** oben in der Mitte (DOM, nur außerhalb der Brille,
  nur während offen ist) — damit die Uhr auch im Gastraum im Bild ist; im
  Hochformat kürzer (`✓`/`✗` statt Wörtern);
- das **Schild** vor der Durchreiche (Start, Tagesbilanz, Ende). Im
  Hochformat wäre es zu klein zum Lesen, dort steht derselbe Text als
  **Karte** unten am Schirm; die Tafeln im Raum schrumpfen dann auf die
  Bildbreite.

Die Eingaben bleiben dabei die der Welt: Die Zeile und die Karte fangen keine
Berührung ab (`pointer-events: none`).

`B`/`Y` (`worldReset`) räumt alles ab: Stationen leer, Hand leer, Gäste weg,
zurück vor Tag 1.

## Steuerung

Dieselbe wie in der Testküche — die Stationen melden sich mit
`kitchenInteractionSpec` an:

- **Von oben / aus den Augen**: `A` bzw. `E`/Maus an der Station, auf die die
  Figur schaut (gelber Saum). Getragen wird vor dem Bauch (von oben) bzw. unten
  im Bild (aus den Augen).
- **Gamepad**: `A`, wie überall.
- **In der Brille**: Hand an die Station, **greifen** nimmt, **loslassen** legt
  ab (dieselbe Regel wie in der Testküche, siehe
  [Greifen](./greifen.md)); das Getragene liegt in der Hand, die es genommen
  hat. In der Küche gilt die Küchen-Augenhöhe (`posture.kitchenEyeScale`), und
  gesprungen wird im Laden nicht (`jumpLock`).

## Zum Prüfen

Die Welt hat ein paar Handgriffe für die Bild-Schleife, aufrufbar über
`window.bgvr.world`: `debugOpen()`, `debugSpeed(n)` (die Uhr des Ladens
n-fach — im Browser ohne Grafikkarte kommen drei Bilder je Sekunde an),
`debugMove(x, z, yaw)`, `debugHold(rezept)`, `debugServe(tisch)`,
`debugUse(stationsId)` und `state` (der ganze `Shift`).

## Offen

- **Nicht geteilt**: Gäste, Stationen und Kasse laufen nur lokal; eine zweite
  Person in derselben Sitzung sieht ihren eigenen Laden.
- Kein Abwasch (die Teller verschwinden nach dem Essen), kein Feuer, keine
  Gruppen an einem Tisch, keine Einrichtung zwischen den Tagen wie bei
  _PlateUp!_.
- **Ton nur gerechnet**: Glocke, Aufnehmen/Ablegen, Servieren, Kasse und der
  hungrige Gast sind Töne aus `core/Audio.playTone` — keine Aufnahmen wie in
  der Testküche (`kitchenSound.ts`).
