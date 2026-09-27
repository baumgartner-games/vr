# Das Restaurant

Eine eigene kleine Welt (`#plateup`, Menü → _Restaurant_, Tor im Hub und im
Gang südlich der Testküche): eine eingerichtete **Spielküche mit Gastraum**
und ein Spiel nach dem Vorbild von _PlateUp!_. Gäste kommen herein, setzen
sich an einen freien Tisch und bestellen einen Burger; man brät, schneidet,
legt auf einen Teller und bringt ihn hin, bevor die Geduld reißt.

Die Küche der Testwelt ist ein **Prüfstand** — Bänder, Baumodus, Kopierer,
Werkhalle. Dieser Laden ist das Gegenteil: ein fertiger Raum, in dem genau
eine Sache passiert. Die **Regeln am Möbel** sind trotzdem dieselben
(`test/zones/kitchenCarry.kitchenDeed`), damit ein Brötchen hier nicht anders
auf den Teller geht als dort.

**Der Name.** Bis Ende September 2026 hieß die Welt _Burgerladen_; jetzt
heißt sie überall, wo ein Spieler es liest, **Restaurant** — Menü, Startseite,
Tore (`world.title`, `kitchenPlan` → `→ Restaurant`), Schilder und Tafeln
(`signText`, `buildBoards`), die Tastenhilfe (`controlHints.ZONE_LABELS`,
`xrGuide.xrHints`) und der Editor. **Nicht umbenannt** ist, woran Links und
Code hängen: die Id und der Hash `#plateup`, die Ordner und Dateien
(`worlds/plateup/`, dieses Kapitel `burgerladen.md`), die Zone `burger` und
das Tor `tor-burgerladen`. Wer „Laden" liest, liest das Verb des Spiels
(„Laden öffnen", „der Laden macht zu") — das blieb, weil es in einem
Restaurant genauso stimmt.

## Was wo liegt

| Datei                                | Was darin steht                                                                                                                                                                                                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `worlds/plateup/plateUpPlan.ts`      | **Rein**: Grundriss (14 × 12 Kacheln Laden, Gehweg davor), Stationen, Tische und Stühle, die Tore, und der Weg der Gäste (`guestRoute` über `nav/navPath.findPath` + `smoothPath` auf einem eigenen Graphen ohne Möbelkacheln)                                         |
| `worlds/plateup/plateUpGame.ts`      | **Rein**: der Tag — Kundenstrom, Zustände eines Gastes, Geduld, Bestellung, Bewertung, Kasse, Schwierigkeit, Schildtexte                                                                                                                                               |
| `worlds/plateup/plateUpStations.ts`  | **Rein**: was ein Druck an einer Station tut — `kitchenDeed` fragen und das Ergebnis auf Hand und Station anwenden; die Uhren von Brett, Grillplatte und Spüle (`kitchenWork`), das Verbrennen (`heat`, `burnShare`) und der zählende Tellerstapel (`stock`, `PLATES`) |
| `worlds/plateup/plateUpShop.ts`      | **Rein**: Einrichten zwischen den Tagen — Katalog (`SHOP_ITEMS`), Baupläne des Abends (`dayOffers`), wo etwas hindarf (`placeCheck`, mit Wegsuche), kaufen (`buy`), alle Tische samt gekauften (`allTables`)                                                           |
| `worlds/plateup/plateUpHints.ts`     | **Rein**: das Verb für die Tastenhilfe — was `A` an dieser Station bzw. diesem Tisch gerade tut (`stationAction`, `tableAction`)                                                                                                                                       |
| `worlds/plateup/plateUpTutorial.ts`  | **Rein**: die Einsteigerhilfe — ein Satz und ein Ziel aus dem Stand (`tutorialHint`), und wann sie fertig ist (`tutorialFinished`)                                                                                                                                     |
| `worlds/plateup/plateUpDecor.ts`     | **Rein**: das Inventar — Wände, Fenster, Tische, Stühle, Lampen, Bilder, Kakteen, Straße                                                                                                                                                                               |
| `worlds/plateup/PlateUpWorld.ts`     | Die Darstellung: Modelle, Körper, Anmeldungen, Figuren, Sprechblasen, Tafeln                                                                                                                                                                                           |
| `worlds/plateup/plateUp.test.ts`     | Grundriss, ein ganzer Tag, Wut und Ladenschluss, die ganze Burgerkette an den Stationen, die Tore, Verbrennen, Tellerstapel, Abwasch, Gruppen, Balance                                                                                                                 |
| `worlds/plateup/plateUpShop.test.ts` | Baupläne, Platzieren samt Begründung, Kaufen, die Einsteigerhilfe durch einen Hamburger                                                                                                                                                                                |

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
[Das Modellregal](./assetregal.md)):

- **Möbel** aus dem Restaurant-Katalog (`core/dinerModel`, halbe Größe wie in
  der Testküche — Arbeitshöhe 0,5 m, ein runder Gasttisch auf 2 × 2 Kacheln):
  Kisten mit Brötchen, Fleisch, Salat, Tomaten, Arbeitsplatten, Schneidebrett,
  zwei einflammige Herde als Grillplatten, Spüle (`kitchencounter_sink`),
  Tellerstapel (Abtropfgitter mit so vielen Tellern, wie sauber sind),
  Kühlschrank, Durchreiche, Tische mit Tischdecken, Stühle, Senf, Ketchup,
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
   nächste draußen — der Abstand läuft nicht weiter als bis null. **Ab Tag 2
   kommen auch Paare** (`dayRules.pairs`): Der Zweite setzt sich auf den
   Stuhl an der Wandseite (`TableSpot.other`, Weg über `otherApproach`) und
   bestellt für sich. Zu zweit wartet man 15 % länger; reißt einem die
   Geduld, geht, wer noch wartet, mit — und das kostet **ein** Leben, nicht
   zwei (`stepShift`, `stormed`).
3. Über dem Gast eine **Sprechblase**: der bestellte Burger als Bild
   (Schichten von unten nach oben), sein Name, die **Tischnummer** oben links
   und darunter der **Geduldsbalken** (grün → gelb → rot; unter 35 % pulsiert
   die Blase). Die Geduld läuft erst, wenn er sitzt.
4. **Kochen**: Patty aus der Kiste auf die Grillplatte (brät allein in 5 s),
   Salat/Tomate aufs Brett (schneidet in 3 s, solange man davorsteht; wer
   weggeht und wiederkommt, fängt von vorn an). Teller vom Stapel, damit an
   die Brötchenkiste, an die Grillplatte, ans Brett — der Teller nimmt es auf.
   Ablegen geht auf jeder Arbeitsplatte und auf der Durchreiche; der Mülleimer
   nimmt den Belag und lässt den Teller in der Hand.
5. **Verbrennen**: Anders als die sichere Kochstelle der Testküche bleibt das
   gebratene Patty auf der heißen Platte, und nach `dayRules.burn` Sekunden
   ist es schwarz (`patty-burnt`, nur noch Müll). Ab dem Braten zeigt der
   Balken über der Platte rot an, wie nah es daran ist; ab der Hälfte stehen
   ein Warnzeichen und **Rauch** darüber, verbrannt steigt er fast schwarz
   (`Smoke`). Wer es rechtzeitig nimmt, setzt die Uhr zurück (`heat`).
6. **Servieren**: mit dem Teller an den Tisch. Nur das Bestellte, und nur auf
   einem Teller (`plateRecipe` ist streng, anders als die Theke der Testküche);
   sonst sagt eine Zeile, was fehlt. An einem Tisch mit Paar bekommt es der,
   der es bestellt hat. Der Gast isst 6 s, **zahlt** Preis plus Trinkgeld nach
   übriger Geduld (bis 5 Münzen), eine Münze steigt über dem Tisch auf, und er
   geht.
7. **Abwasch**: Sein Teller bleibt **schmutzig** auf dem Tisch
   (`Shift.dirty`), und an einen Tisch mit Geschirr setzt sich niemand
   (`freeTables`). `A` mit leeren Händen am Tisch räumt einen Teller ab
   (`clearDish`); in der **Spüle** (Nordwand, neben dem Stapel) wird er
   gespült, solange man davorsteht (3 s), und kommt sauber in die Hand
   zurück — in der Brille in die Hand, die ihn hineingelegt hat. Der
   **Tellerstapel** zählt (`PLATES` = 6, `StationState.stock`) und zeigt so
   viele Teller, wie noch da sind; leer sagt er, dass gespült werden muss.
8. **Zu lange gewartet**: Er steht auf, ein rotes „!" in der Blase, und geht.
   Drei davon an einem Tag, und **der Laden macht zu** — Endschild, die Glocke
   fängt bei Tag 1 wieder an (ohne Gekauftes).
9. **Ladenschluss**: Nach der Öffnungszeit kommt niemand mehr; wer sitzt, wird
   noch bedient. Ist der Letzte draußen, steht die **Tagesbilanz** da
   (bedient, verloren, verdient, Kasse, was morgen neu ist), und es beginnt
   das **Einrichten** (unten). Die Glocke öffnet den nächsten Tag; über Nacht
   wird aufgeräumt — Stationen leer, alle Teller sauber, Tische frei.

**Einrichten** (`plateUpShop.ts`), wie bei _PlateUp!_: Solange die Bilanz
dasteht, liegen im Gang rechts neben dem Durchgang aus der Küche drei
**Baupläne** auf dem Boden (`OFFER_SPOTS`) — ein blaues Blatt mit dem Modell
darauf und Name und Preis darüber. Einer ist ein **Tisch mit zwei Stühlen**
(40 Münzen, bis `MAX_TABLES` = 6), einer eine **Station** (unten), der Rest
Deko aus dem Regal (Kaktus, Stehlampe, Busch, Sessel, Kaugummiautomat, 8–14
Münzen; aus dem Würfel des Tages, `dayOffers`). `A` am Blatt nimmt den Bauplan, und vor der Figur steht
dann der **Platzierungsgeist** aus dem Baukasten (`portal/placeGhost.ts`) —
beim Tisch **samt beiden Stühlen** (`loadTableGhost`, je Seite des Raums ein
Geist, denn der zweite Stuhl steht zur Wand hin, `tableAisle`): grün, wo es
passt, rot, wo nicht — die Leiste unten sagt, warum
(`placeCheck`: nur im Gastraum, nicht auf anderem, Stühle, Tür und die
Baupläne bleiben frei, und **jeder Tisch** muss danach von der Tür und aus
der Küche noch erreichbar sein — geprüft mit derselben Wegsuche wie die
Gäste). `A` vor dem grünen Geist kauft und stellt hin (angemeldet ist das
eine halbe Armlänge vor der Figur, nicht auf der Zielkachel — die läge für
`A` zu weit weg); _Menü → Bauplan zurücklegen_ lässt es. Solange man einen
Bauplan trägt, treten Schild und (am Telefon) Karte zur Seite, und an den
Stationen wird nicht gekocht. In der Brille hängt der Bauplan als kleines
blaues Blatt mit dem Modell an der Hand, die ihn genommen hat
(`carryBlueprint`). Jeder Bauplan liegt je Abend einmal aus. Ein gekaufter Tisch ist ab dem nächsten Tag ein Tisch
mehr (`allTables`, mehr Gäste gleichzeitig), jedes Deko-Stück gibt den Gästen
6 % mehr Geduld, höchstens 30 % (`decorPatience`). Das Gekaufte bleibt, bis
die Runde endet oder `B`/`Y` alles zurücksetzt.

**Gekaufte Stationen**: eine **zweite Grillplatte** (30 Münzen) und ein
**zweites Schneidebrett** (20 Münzen), dieselben Möbel wie an der Nordwand
(`stove_single`, Arbeitsplatte mit Brett). Solange eine fehlt, liegt eine
davon abends aus (an geraden Tagen zuerst der Grill); jede gibt es einmal.
Hin darf sie nur in die **Küchenreihe direkt vor der Durchreiche** (`z = 2`,
`STATION_ROW`, von der Westwand bis zum Ende der Durchreiche) — die Reihe an
der Nordwand bleibt frei, denn dort steht, wer an beiden Reihen arbeitet;
der Startplatz und der Durchgang in den Gastraum auch. Dieselbe Prüfung und
derselbe Geist wie bei Tisch und Deko (`placeCheck` → `stationCheck`, der
Geist zeigt die Vorderseite nach Norden). Gekauft ist sie sofort eine volle
Station (`extraStations`: eigene Id `grill-extra-1`, dieselbe Regel, Uhr,
Verbrennen, Rauch, Anmeldung und Tastenhilfe) und wird über Nacht wie die
anderen geleert. Die Kachel der Durchreiche dahinter bedient man dann vom
Gastraum aus.

**Schwierigkeit** (`dayRules`): Öffnungszeit 75 s + 15 s je Tag (bis 150),
Abstand der Gäste 18 s − 2,5 s je Tag (ab 7 s), Geduld 70 s − 8 s je Tag (ab
35 s). Die Karte wächst: Tag 1 Hamburger, Tag 2 Salatburger, Tag 3
Tomatenburger, ab Tag 4 Burger Deluxe — und am Tag, an dem etwas dazukommt,
bestellt es jeder zweite Gast. **Tag 1 ist mit Absicht leicht**: drei bis
sieben Gäste, alle allein, und ein gebratenes Patty hält 14 s. Danach Paare
(30 % an Tag 2, je Tag 10 % mehr bis 60 %), und das Patty verbrennt jeden Tag
2 s früher, bis herunter auf 6 s. Ein Test rechnet beides nach
(`Burgerladen: Balance`).

**Die Einsteigerhilfe** (`plateUpTutorial.ts`): Am ersten Tag steht unten am
Schirm ein grüner **Tipp**, was als Nächstes zu tun ist, und ein grüner
**Pfeil** mit Ring zeigt auf die Station, den Tisch oder die Glocke (in der
Brille steht der Satz auf einer Tafel über dem Pfeil). Kein Ablauf mit
Schritten, sondern eine Frage an den Stand — wer anders anfängt, bekommt
trotzdem den passenden nächsten Satz. Nach drei bedienten Gästen oder dem
ersten Tag verabschiedet sie sich und merkt sich das
(`localStorage` `bgvr.plateup.tutorial` = `done`); _Menü → Einsteigerhilfe
aus/an_ schaltet sie von Hand.

**Und ein ✕ zum Wegklicken.** Gemeldet: „In der Brille konnte ich die
Hinweise nicht anfassen." Der Tipp hat deshalb ein ✕ — in der Brille **rechts
neben** der Tafel (nicht auf ihr, damit es kein Wort zudeckt), mit einer
unsichtbaren Trefferfläche von 56 cm um ein Zeichen von 32 cm
(`ui/CloseButton.ts`): Strahl darauf und Trigger oder `A`, oder mit dem
Finger antippen; liegt der Strahl darauf, wird das Zeichen größer. Am Schirm
ist der grüne Tipp unten eine Meldung wie alle (`ui/ScreenMessage.ts`, siehe
[Die Seite selbst](./seite.md)) mit demselben ✕ wie überall (44 × 44 px
Trefferfläche). **Was es tut**
(`closeTutorial`): Es schaltet die Einsteigerhilfe **aus**, genau wie das
Menü, und merkt sich das (`bgvr.plateup.tutorial` = `off`). Nur den einen
Satz wegzunehmen wäre sinnlos gewesen — der nächste stünde ein paar Sekunden
später an derselben Stelle, und wer die Hilfe wegklickt, will sie nicht mehr.
Zurück kommt sie über _Menü → Einsteigerhilfe an_; die Meldung beim Klick sagt
das dazu.

**Essen liegt in der Brille halb so groß in der Hand**
(`kitchenGrab.HAND_FOOD_SCALE`, `carryInHands`). Gemeldet: Tomate, Salat,
Brötchen, Bulette und jeder Burger seien richtig groß, versperrten aber die
Sicht — ein Teller von 47 cm eine Handbreit vor der Brille deckt die halbe
Küche zu. Vorher stand dort 0,8, jetzt 0,5, und **nur in der Hand**: Auf
Platte, Durchreiche und Tisch steht ohnehin ein eigenes Netz in voller Größe
(`setHeld` baut das Getragene neu, sobald es die Hand wechselt). Ohne
getrackten Controller hängt es wie bisher mit 0,8 vor der Brust, aus den Augen
am Schirm mit 0,42 unten im Bild. Die Testküche macht dasselbe, siehe
[Greifen](./greifen.md#was-in-der-brille-in-der-hand-liegt).

**Wo man den Stand sieht.** Drei Stellen, jede für eine Ansicht:

- die **Tafel über der Nordwand** (im Raum, dreht sich um die Hochachse zur
  Kamera): Tag, Uhr, bedient, verloren, Kasse und die offenen Bestellungen —
  **nur in der Brille**; am Schirm lag sie genau hinter der Zeile und sagte
  dasselbe kleiner;
- die **Zeile am Schirm** oben in der Mitte (DOM, nur außerhalb der Brille,
  nur während offen ist) — damit die Uhr auch im Gastraum im Bild ist; im
  Hochformat kürzer (`✓`/`✗` statt Wörtern). Am Glas steht dort schon die
  Tastenhilfe (`controlHints.css`), also rücken Zeile und Zettel darunter
  (`style.css`, `body:has(.hints[data-device="touch"])`). Darunter die **Bestellzettel**
  (`ticket`): je wartendem Gast Tischnummer, Burger und Geduldsbalken, der
  Ungeduldigste zuerst, dazu „Tisch n: abräumen" für schmutziges Geschirr;
- die **Leiste unten** über der Tastenleiste: welcher Bauplan und ob er
  passt (was man in der Hand hat, steht dort bewusst nicht — man sieht es),
  und darüber der Tipp der Einsteigerhilfe. Wie hoch, rechnet
  `plateUpHints.clearanceAbove` aus: über der Tastenhilfe, am Glas (wo die
  oben steht) über Stöcken, Knöpfen und dem Werkzeug-Knopf;
- das **Schild** vor der Durchreiche (Start, Tagesbilanz, Ende). **Am Schirm
  erklärt vor dem ersten Tag immer nur eines** (`quietStart`): Solange die
  Willkommens-Karte (`ui/WorldWelcome.ts`) steht, schweigen Tipp und
  Starttafel; danach sagt der Tipp der Einsteigerhilfe, was zu tun ist, und
  die Starttafel (am Handy die Karte) kommt nur, wenn die Hilfe aus ist. In
  der Brille steht die Tafel wie immer. Im
  Hochformat wäre es zu klein zum Lesen, dort steht derselbe Text als
  **Karte** unten am Schirm — von oben **und aus den Augen**. Die Karte hat
  ein ✕ (`ScreenMessage`, `Esc` geht auch): Weggeklickt bleibt sie weg, bis
  das Schild etwas anderes sagt (`cardClosed` — nächster Tag, Ende), und die
  Tafel im Raum kommt dafür nicht zurück; die Tafeln im
  Raum schrumpfen dann auf die Bildbreite. **Aus den Augen am Schirm** hängt
  das Schild nicht 2,2 m vor dem Startplatz (dort füllte es das ganze Bild,
  und wer durch die Tür kam, lief hinein), sondern kleiner (0,72), mitten im
  Gastraum und mit der Unterkante über Kopfhöhe (`EGO_SIGN`: 7 | 2,6 | 7);
  von oben und in der Brille bleibt es an seinem Platz (`SIGN_SPOT`).

Die Eingaben bleiben dabei die der Welt: Die Zeile und die Karte fangen keine
Berührung ab (`pointer-events: none`) — außer dem ✕ an Karte und Tipp.

`B`/`Y` (`worldReset`) räumt alles ab: Stationen leer, Hand leer, Gäste weg,
zurück vor Tag 1.

## Steuerung

**Die Tastenhilfe unten sagt das Verb** (`plateUpHints.ts`, über
`HintZone.action`): „Servieren", wenn der Teller in der Hand zum wartenden
Gast passt (sonst „Passt nicht"), „Abräumen" am schmutzigen Tisch, „Spülen"
an der Spüle, „Patty auflegen"/„Patty nehmen"/„Patty auf den Teller" am Grill,
„Schneiden" am Brett, „Brötchen nehmen" an der Kiste, „Hinstellen" mit dem
Bauplan. Gewählt ist, was unter dem gelben Saum liegt
(`PortalWorld.pickedObject`); in der Brille greift die Hand, dort bleibt die
Tafel bei _Nehmen_/_Ablegen_.

Dieselbe wie in der Testküche — die Stationen melden sich mit
`kitchenInteractionSpec` an:

- **Von oben / aus den Augen**: `A` bzw. `E`/Maus an der Station, auf die die
  Figur schaut (gelber Saum). Getragen wird vor dem Bauch (von oben) bzw. unten
  im Bild (aus den Augen).
- **Gamepad**: `A`, wie überall.
- **In der Brille**: Hand an die Station, **greifen** nimmt, **loslassen** legt
  ab (dieselbe Regel wie in der Testküche, siehe
  [Greifen](./greifen.md)); das Getragene liegt in der Hand, die es genommen
  hat, Essen und Teller dort halb so groß (siehe oben). In der Küche gilt die Küchen-Augenhöhe (`posture.kitchenEyeScale`), und
  gesprungen wird im Laden nicht (`jumpLock`).

## Das Eis

Neben den Burgern gibt es im Restaurant **Eis im Hörnchen** — ohne Gäste, die
es bestellen (das kann später kommen), aber mit allem, was man dafür in der
Hand braucht. Gleich östlich der Stelle, an der man morgens anfängt, in der
Stationsreihe vor der Durchreiche, steht die **Eisecke**: zwei
Arbeitsplatten mit der Vorderseite nach Norden in den Gang
(`plateUpPlan.ICE_STAND` auf 8 | 2, `ICE_TUBS` auf 9 | 2, `ICE_FACE` Nord —
beide in `blockedTiles`, also mit Körper und frei von gekauften Stationen).
Man bedient sie vom Gang `z = 1` aus, mit dem Blick nach Süden.

- Auf der westlichen Platte ein **Stapel Hörnchen**, der nie leer wird, und
  daneben auf einer dunklen Matte der **Portionierer**.
- Auf der östlichen zwei **Eiswannen**: Vanille (cremegelb) und Erdbeere
  (rosa).

**Die Ecke steht auch woanders** (September 2026): `IceCorner` nimmt ihre
Stellung als Parameter, `new IceCorner(place = PLATEUP_ICE)` mit
`IceCornerPlace = { stand, tubs, face, flavors?, furnish? }`, gedreht über
`iceYaw(face)`. Mit `furnish: false` stellt sie keine Möbel hin und übernimmt
mit `adopt(top, cones, scoop)` Platte, Stapel und Portionierer der
Spielelemente `ice-stand` und `ice-tubs`. So stand sie in der Eis-Küche des
[Test Restaurants](./testrestaurant.md) (`restaurantIce.ts`, seit dem Leeren
der Welt nur noch in der Geschichte). Der Laden hier ruft sie unverändert.

**Warum dort und nicht mehr an der Westwand.** Zuerst stand die Eisecke auf
0 | 1 und 0 | 2, südlich des Kühlschranks — und kam so an: _„ich sehe den
Eisbereich überhaupt nicht"_. Im Browser nachgesehen hatte es drei Gründe.
Die Ecke stand am äußersten Rand des Bildes von oben, und auf dem Telefon,
dessen Bild gut vier Kacheln breit ist, gar nicht, solange man nicht eigens
hinlief. Die Wannen waren nur das **Eis** aus
`icecream_container_icecream_<sorte>` — die Datei ist die Füllung ohne
Kasten, eine flache Platte —, also von oben zwei blasse Zettel. Und alles war
auf echte Maße gebracht (Stapel 26 cm, Wannen 30 cm), in einem Laden, dessen
Möbel halb so groß sind wie echte: Krümel. Jetzt steht sie neben der Figur
im ersten Bild (auch auf dem Telefon), die Wannen sind Kasten
(`icecream_container`) **plus** Eis, so groß wie im Paket (66 cm lang, zwei
nebeneinander füllen die Platte), der Stapel ist 50 cm hoch
(`plateUpIceView.CORNER_SIZE`). Was in der Hand ist, bleibt in den alten
Maßen (`ICE_SIZE`). Und kommt ein Modell nicht, steht ein schlichter Körper
in denselben Maßen da (`plateUpIceView.fallback`) — die Ecke wird nie
unsichtbar. Geprüft in `plateUpIceView.test.ts` (ohne WebGL, also mit
Ersatz) und in `plateUpIce.test.ts` (neben dem Startplatz, vor jeder Platte
frei, erreichbar, der Weg in den Gastraum offen).

| Datei                               | Was darin steht                                                                                                                                                                                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `worlds/plateup/plateUpIce.ts`      | **Rein**: Sorten, was die Hände vom Eis halten (`IceHands`), was ein Druck an Stand, Wanne und Station tut (`useStand`, `useTub`, `useCounter`), welche Wanne gemeint ist (`pickTub`, `tubUnder`), über welchem Hörnchen der Portionierer ist (`coneUnder`), Verben, Sätze |
| `worlds/plateup/plateUpWobble.ts`   | **Rein**: der Turm auf dem Hörnchen — je Glied eine dreifache Verzögerung, einmal Nachschwingen, geschlossen gelöst, je Kugel weich begrenzt (`followBall`, `linkLean`, `leanLimit`, `softLean`, `stepWobble`)                                                             |
| `worlds/plateup/plateUpIceView.ts`  | Die Darstellung: Eisecke (gedreht nach `ICE_FACE`, `ICE_YAW`), Hörnchen mit Kugeln (`IceConeView`), Portionierer (`ScoopView`), was in den Händen und auf den Platten steht, Ersatzkörper (`fallback`)                                                                     |
| `worlds/plateup/plateUpIce.test.ts` | Stapel ohne Ende, beide Bedienungen, Abstellen und Wegwerfen, die eine Wanne, der Turm (Nachhinken, Grenze je Kugel, genau einmal Nachschwingen, zitternde Hand, Neigen, nie herunter, kein Sprung bei neuer Kugel, 30 gegen 144 Bilder je Sekunde)                        |

**In der Brille sind es zwei Dinge für zwei Hände.** Eine Hand greift am
Stapel ein Hörnchen (Greif-Taste oder Trigger), die **andere** den
Portionierer — dieselbe Hand nimmt nicht beides (`standDeed`). Den
Portionierer **in eine Wanne tauchen**: Steckt seine Schale im Kasten der
Wanne (`tubUnder`, oben 3 cm Luft), trägt er eine Kugel dieser Sorte; das
geht ohne Knopf, und ebenso über die Anmeldung der Wanne (Berührung oder
Trigger mit der Hand des Portionierers). **Über das Hörnchen halten**: Kommt
die Schale der Spitze des Turms auf 9 cm nahe (`coneUnder`), sitzt die Kugel
oben drauf — auch auf einem Hörnchen, das auf einer Platte steht. Beliebig
oft. Zurückgelegt wird der Portionierer an seiner Matte (Greif-Taste halten
und dort loslassen), ein leeres Hörnchen auf den Stapel.

**Am Schirm gibt es eine Hand, also einen Druck.** `A`/`E` am Stand gibt
**Hörnchen samt Portionierer** (`IceHands.coneHand = null` — der Portionierer
gehört dann zum Hörnchen und ist kein eigenes Ding), und `A` an einer Wanne
setzt gleich eine Kugel aufs Hörnchen (`scoop`). Der Portionierer ist dabei
neben dem Hörnchen zu sehen. Ein leeres Hörnchen geht mit `A` am Stand
zurück.

**Nur die eine Wanne leuchtet.** Die beiden stehen eine Handbreit
nebeneinander, und jede ist ein eigener Anker (`IceCorner.tubs`) — ein
gemeinsamer hätte beide zugleich umrandet. Am Schirm reicht das nicht: Die
Auswahl des Kerns rechnet mit Zylindern von mindestens 40 cm
(`usable.USE_RADIUS`), die sich hier fast ganz überdecken, und dann gewinnt
die nähere Vorderkante — schräg davor also die nähere Wanne und nicht die
angeschaute. Deshalb ist am Schirm **nur eine** angemeldet, die mit dem
kleinsten Winkel zum Blick (`pickTub`: von oben die Richtung der Figur, aus
den Augen die des Kopfes). In der Brille sind beide angemeldet, denn dort
wählt die Hand mit einer Greifbox so groß wie die Wanne.

**Der Turm folgt verzögert, schwingt einmal nach und fällt nie**
(`plateUpWobble.ts`). Die unterste Kugel sitzt genau im Hörnchen; für jede
weitere wird ihr „Glied" gerechnet — wie weit sie über ihrem Platz auf der
Kugel darunter hängt —, und zwar jedes für sich, getrieben von der
Geschwindigkeit `v` des Hörnchens: Es **will** um `v · followTime` zurück
hängen, und `followTime` ist 120 ms für die oberste (`WOBBLE.lag`, für
Kugeln von 8 cm — größere, etwa von oben mit 2,2-fachem Eis, im Verhältnis
ihrer Größe mehr, damit der Turm dort genauso aussieht) und für jede
darunter im Verhältnis ihrer Grenze weniger. Beim gleichmäßigen Gehen
steht so jedes Glied im selben Verhältnis zu seiner Grenze, und weil die
Grenzen wie `1/x` wachsen (unten), ist der Turm **gebogen** statt
schräg-gerade. Die Richtung des Turms folgt der Achse des Hörnchens mit einer
Zeitkonstante von 0,2 s (`WOBBLE.tilt`, ohne Überschießen) und hängt am
Ende etwas weiter durch als das Hörnchen (`WOBBLE.sag`): Schräg gehalten
neigt er sich in dieselbe Richtung.

**Einmal hinüber und zurück, kein Wackeln.** Dem gewünschten Überhang läuft
eine träge Größe mit einer **dreifachen** Verzögerung nach (`followBall`:
`(D + a)³ s = a³ u`, drei gleiche reelle Pole, Rate `a` = 12/s für die
oberste, `WOBBLE.rate`, die unteren flinker mit `(0,8 / Grenze)^0,3`,
`WOBBLE.stiff`) — die schwingt nie, auch nicht bei zitternder Hand. Gezeigt
wird `s + ṡ · (1 + 2b)/a` (`linkLean`, `b` = 0,75, `WOBBLE.rebound`): Bleibt
das Hörnchen stehen, ist der Überhang genau `U · (1 + T − b·T²) · e^(−T)`
mit `T = a·t` — ein Polynom mit **genau einer** positiven Nullstelle. Jedes
Glied geht also **einmal** über seinen Platz hinaus (die oberste nach
0,17 s), am weitesten nach 0,28 s um `(1 + 4b) · e^(−2 − 1/b)` ≈ 14 % des
gewollten Überhangs (gezeigt, nach der weichen Begrenzung, aus vollem
Gehtempo 0,27 Kugelgrößen bei der obersten), und kriecht dann zurück,
**ohne ein zweites Mal** hinüberzugehen. Beim Losgehen dasselbe
andersherum: Die oberste ist nach 0,07 s bei 80 % ihres Überhangs und steht
nach 0,1 s.

**Wie es dazu kam.** Zuerst lief jede Kugel der darunter mit einer
Verzögerung erster Ordnung nach, `3 ms · i²`, höchstens 0,15 s — _„die
Eiskugeln bewegen sich zu langsam"_; dann `1 ms · i²`, höchstens 40 ms, mit
der Grenze je Kugel. Das schoss nie über, ließ aber die unteren fast starr
und die oberste eines Turms aus fünf Kugeln nur gut halb so weit
ausschlagen, wie sie durfte (0,03 / 0,12 / 0,26 / 0,47 Kugelgrößen). Der
Wunsch danach: _„Der Turm soll schon bei weniger Kugeln stärker
ausschlagen"_, und am Ende _„höchstens noch einmal in die andere Richtung
ausschlagen und dann zurück … aber ich will kein endloses Hin- und
Herwackeln"_. Eine gedämpfte Feder je Kugel (Dämpfung 0,5–0,55) war
ausprobiert: Sie schwingt ein zweites Mal um 2–3 mm zurück — die dreifache
Verzögerung mit dem Anteil der Geschwindigkeit tut es beweisbar nicht.

**Oben weiter über als unten — und nie herunter.** Die Glieder werden frei
gerechnet (`WobbleState.links`), gezeigt werden sie weich begrenzt
(`softLean`: der Überhang `r` wird zu `L · tanh(r / L)` — streng wachsend,
nie ganz `L`, auch nicht beim Zurückschwingen), und `L` ist je Kugel eine
andere (`leanLimit`, gewünscht _„nicht linear, sondern wie `(1/x) · 0,9`"_,
später _„Max Abstand auf 0,8"_): Bei der obersten Stelle `n` darf Kugel `k`
höchstens `0,8 / (n − k + 1)` **Kugelgrößen** (Durchmesser, 8 cm in der
Hand; `WOBBLE.lean`) — die oberste 0,8, die darunter 0,4, dann 0,27, 0,2 …
Gemessen im Test (in Kugelgrößen, von unten): Bei 2,6 m/s steht jedes Glied
bei 0,99 seiner Grenze — fünf Kugeln 0,20 / 0,26 / 0,39 / 0,79, fünfzehn
0,06 / 0,06 / 0,07 … 0,20 / 0,26 / 0,39 / 0,79. Bei 0,5 m/s (ein ruhiger
Schwenk mit der Hand) schon bei 0,73 der Grenze: fünf Kugeln 0,15 / 0,20 /
0,29 / 0,59, fünfzehn 0,04 … 0,15 / 0,20 / 0,29 / 0,59. Keine kommt über
ihre Grenze, auch nicht beim wilden Schütteln. Kommt oben eine Kugel dazu, werden alle Grenzen darunter
kleiner; damit das nicht springt, ziehen sie ihrem neuen Wert mit 0,12 s
nach (`WobbleState.limits`, `WOBBLE.relimit` — Test: unter 1 cm je Bild).
Mehr als 2,5 Grenzen will kein Glied überhängen (`WOBBLE.reach`) — mehr
sähe man nicht (`tanh(2,5)` ≈ 0,99), und das Hinüberschwingen danach bliebe
nicht mäßig. Nach dem Anhalten aus vollem Gehtempo steht ein Turm — ob drei,
zehn oder fünfzig Kugeln — ohne Schaukeln in 0,8 s bis auf 1 mm.

**Früher ausschlagen, langsamer zurück.** Gewünscht: _„Die Eiskugeln
dürfen sich schon früher bewegen bzw. mehr Abstand haben und die
Rückwärtsbewegung ein wenig langsamer"_. Dafür hängt die oberste länger
nach (`WOBBLE.lag` 36 → 60 ms) und läuft träger (`WOBBLE.rate` 17 → 12/s):
Der Ausschlag bei 0,5 m/s steigt von 0,22 auf 0,35 Kugelgrößen, beim Gehen
von 0,78 auf 0,88, und Hinüber- wie Zurückschwingen dauern rund 40 % länger
— die Form (genau einmal hinüber) bleibt.

**Früher am Anschlag, 0,8 statt 0,9.** Auf dem Handy (von oben, ein Turm aus
rund 15 Kugeln) hing der Turm beim Gehen gleichmäßig schräg statt gebogen —
_„Max Abstand auf 0,8, aber das Maximum soll früher erreicht werden"_, dazu
eine Skizze: unten dicht am Hörnchen, oben weit hinaus. Zwei Gründe: Die
Zeit `lag` galt in Metern, das Eis von oben ist aber 2,2-mal so groß — dort
stand die oberste beim Gehen nur bei 0,75 ihrer Grenze. Und 60 ms waren
auch in der Hand zu wenig, um bei ruhigen Schwenks nahe an die Grenze zu
kommen. Jetzt misst `followTime` in Kugelgrößen (`WOBBLE.ball` = 8 cm), `lag`
ist 120 ms, `reach` 2,5 statt 3: Bei 0,5 m/s steht jedes Glied bei 0,73
seiner Grenze (vorher 0,39), bei 2,6 m/s bei 0,99, und beim Losgehen ist die
oberste nach 0,07 s bei 80 %. Der Rückweg bleibt, wie er war: Rate 12/s,
einmal hinüber nach 0,17 s, am weitesten nach 0,28 s. Eine schnellere
Anstiegsrate als Abfallrate war nicht nötig — die größere Zeit sättigt die
weiche Begrenzung ohnehin früh, und die eine Rate hält den Beweis „genau
einmal hinüber" (das Polynom oben) intakt.

**Im Stehen schaukelt er sanft.** _„Im Idle den Turm leicht wackeln lassen:
max 0,3 zur vorderen/unteren Kugel (wieder mit der indexbasierten Höhe)"_.
Steht das Hörnchen still (unter 0,1 m/s, `WOBBLE.idleSpeed`), kommt nach
0,5 s (`idleDelay` — erst schwingt der Turm vom Anhalten aus) zum Überhang
jedes Glieds ein langsames Schaukeln quer zum Turm dazu, in 1 s sanft
eingeblendet (`idleFade`) und beim Losgehen in 0,3 s wieder weg (`idleOut`),
sodass das Gehen aussieht wie vorher. Die Form (`idleShape`) ist ein Hin
und Her von 2,3 s, dessen Weite mit 7,3 s atmet und dessen Richtung mit
11,1 s um ±50° wandert, dazu ein kleines Quer von 1,7 s — deterministisch,
die Uhr steckt im Zustand (`WobbleState.clock`, `still`, `calm`). Jedes
Glied schaukelt im Verhältnis seiner Grenze: höchstens `idleLimit` =
`0,3 / (n − k + 1)` Kugelgrößen (`WOBBLE.idle`) — die oberste 0,3, die
darunter 0,15, 0,1 …, die unteren um bis zu 0,25 s voraus
(`WOBBLE.idleTrail`), sodass die oberen nachschaukeln. Es läuft durch
dieselbe dreifache Verzögerung, die dafür ein gleichmäßig wanderndes Ziel
geschlossen löst. Gemessen: die oberste schlägt gezeigt 0,2 bis 0,28
Kugelgrößen aus, über 20 Minuten nie mehr als 0,28 (0,92 ihrer Grenze);
30 und 144 Bilder je Sekunde ergeben denselben Turm. Nur das Eis in der
Hand schaukelt — ein abgestelltes steht still (`IceConeView(kit, 0)`).

Gerechnet wird in der Welt und erst danach in den Raum des Hörnchens
zurückgelegt. Die Verzögerung ist geschlossen gelöst für ein Ziel, das
während des Schritts gleichmäßig wandert, und ein Bild wird in Stücke von
1/120 s geteilt — 30 und 144 Bilder je Sekunde ergeben denselben Turm (Test:
unter 1 mm nach zwei Sekunden Schwenken).

**Im Spiel stand er nach #272 starr — ein geteiltes `THREE.Vector3`.**
_„Das Eis schwingt gar nicht mehr nach hinten"_: Im Browser nachgemessen hing
die Spitze beim Gehen um **0,00** Kugelgrößen über, und beim Anhalten kam
nichts. Die Ansicht (`IceConeView.step`) schreibt die Stelle des Hörnchens
jedes Bild in **dasselbe** `THREE.Vector3` (`_base`, ebenso die Achse), und
`stepWobble` behielt genau dieses Objekt als `WobbleState.base` — im nächsten
Bild stand darin schon die neue Stelle, „letzte" und „jetzige" Stelle waren
gleich, `v` immer null. Die Rechnung mit Stellen davor (#271) merkte davon
nichts, weil sie die Kugeln selbst als Zustand trug; die Rechnung mit der
Geschwindigkeit hängt ganz daran. Die reinen Tests reichten jedes Bild ein
neues Objekt herein und waren grün. Jetzt **schreibt `stepWobble` Stelle und
Achse ab**, statt sie zu behalten. Zwei Tests halten das fest: einer der
reinen Rechnung mit einem wiederverwendeten Objekt (`plateUpIce.test.ts`) und
einer, der durch `IceCorner.carry` geht, mit einer gehenden Figur — von oben
und mit dem Hörnchen im Controller der Brille, dessen `hold` im Raum der Figur
still steht und nur in der Welt wandert (`plateUpIceView.test.ts`).
Nachgemessen im Spiel (von oben, vier Kugeln, 2,6 m/s, 60 Bilder je Sekunde,
Spitze gegen die Öffnung in Kugelgrößen): vorher 0,00 beim Gehen, 0,00
danach; jetzt 0,88 zurück beim Gehen, nach dem Anhalten einmal 0,13 hinüber
(nach 0,17 s) und in Ruhe; aus den Augen 1,31 und 0,24.

**Wohin mit dem Eis.** Es belegt dieselbe Hand wie ein Teller: Wer es hält,
nimmt nichts anderes, bedient keinen Tisch und nimmt keinen Bauplan. Es geht
auf eine **freie Arbeitsplatte** oder die **Durchreiche** und von dort
wieder in die Hand, und in den **Mülleimer** (`counterDeed`). Die Hand mit
dem Portionierer bedient keine Station. Das Eis ist bewusst **kein `Dish`**:
Der Belag eines `Dish` ist eine Menge (zwei Kugeln Vanille gäbe es darin
nicht), und jede neue Sorte wäre eine Zeile in den Tabellen der Testküche.
Über Nacht und mit `B`/`Y` ist alles Eis weg, in den Händen wie auf den
Platten.

**Modelle** aus _Restaurant Bits_ im Regal (`core/kaykitModel`, auf Maß
gebracht statt dem Paketmaßstab zu trauen): `icecream_cone` (14 cm),
`icecream_cone_stacked` (in der Ecke 50 cm), `icecream_scoop` (20 cm in der
Hand, 30 cm auf der Matte; die Datei steht aufrecht, Schale oben — in der
Hand umgelegt, Schale nach vorn) und je Wanne `icecream_container` mit
`icecream_container_icecream_vanilla`/`_strawberry` darin (66 cm lang).
Gebaut sind nur die Kugeln: eine Kugelgeometrie und ein Material je Sorte
für alle.
Ein Turm kostet eine Zeichnung je Kugel. Auf einer Platte steht ein Eis 1,6-
mal so groß, von oben vor dem Bauch 2,2-mal — sonst sähe man es nicht.

Zum Prüfen: `window.bgvr.world.debugIce(['vanilla', 'strawberry'])` legt ein
Eis mit diesen Kugeln in die Hand (wie am Schirm).

**Offen beim Eis**: Kein Gast bestellt es, und auf einen Teller geht es nicht.
Nicht geteilt (wie der ganze Laden). Die Lage des Portionierers in der Hand
und die 9 cm zum Absetzen sind ohne Brille eingestellt und nicht in einer
nachgemessen; der Portionierer hängt nicht an den Griffen aus
`core/grabHandles.ts`, sondern an einer festen Stelle von `ControllerState.hold`.

## Zum Prüfen

Die Welt hat ein paar Handgriffe für die Bild-Schleife, aufrufbar über
`window.bgvr.world`: `debugOpen()`, `debugSpeed(n)` (die Uhr des Ladens
n-fach — im Browser ohne Grafikkarte kommen drei Bilder je Sekunde an),
`debugMove(x, z, yaw)`, `debugHold(rezept)`, `debugServe(tisch)`,
`debugTable(tisch)` (servieren oder abräumen), `debugUse(stationsId)`,
`debugDay(n)`, `debugEvening(kasse)` (Tag zu, Kasse gefüllt — die
Einrichten-Phase), `debugBlueprint(id)`, `debugPlace(id, x, z)`,
`debugTutorial(an)` und `state` (der ganze `Shift`).

## Offen

- **Nicht geteilt**: Gäste, Stationen und Kasse laufen nur lokal; eine zweite
  Person in derselben Sitzung sieht ihren eigenen Laden.
- **Kein Feuer**: Ein verbranntes Patty raucht, aber die Platte brennt nicht
  (die Testküche kann das am Herd, `kitchenClock`). Und eingerichtet wird
  nur dazu — kein Verschieben dessen, was schon steht, und nur je eine
  zusätzliche Grillplatte und ein Brett.
- **Gruppen nur zu zweit**: Die Tische haben zwei Stühle; größere Gruppen
  bräuchten zusammengestellte Tische.
- **Der Bauplan in der Brille** hängt an der Hand, hingestellt wird aber
  weiter mit derselben Anmeldung wie an einer Station (vor dem Blick, nicht
  vor der Hand) — in der Bild-Schleife ohne Brille nicht nachgeprüft.
- **Ton nur gerechnet**: Glocke, Aufnehmen/Ablegen, Servieren, Kasse und der
  hungrige Gast sind Töne aus `core/Audio.playTone` — keine Aufnahmen wie in
  der Testküche (`kitchenSound.ts`).
