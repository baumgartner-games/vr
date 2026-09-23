# Wie schön es aussieht

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

_Menü → Grafik_, und die Seite trägt ein **EXP** im Abzeichen: Der Grafik-Modus
und die Auflösung der Brille sind Experimente, und beide kosten Bildrate.

**Schatten sind ein eigener Schalter** (`GraphicsSettings.shadows`) und ab Werk
**an**. Das war einmal anders, und die Änderung ist eine Antwort auf eine
Beschwerde: Sie hingen am Comic, also am Bild mit schwarzen Konturen und Licht
in Stufen — wer nur Schatten wollte, bekam eine Zeichnung dazu, und wer die
Zeichnung nicht wollte, bekam eine Welt, in der alles einen Zentimeter über dem
Boden schwebt. Das sind zwei Fragen, also sind es zwei Schalter. Das Vorbild
ist Overcooked: Dort sitzt jede Figur und jeder Tresen in einem weichen
Schlagschatten, und er ist es, der aus einer Ansicht von schräg oben einen
**Raum** macht und nicht eine Collage. Wem das in der Brille zu teuer ist,
macht ihn aus — er ist der erste Regler, an dem man dreht, wenn die Bildrate
klemmt.

Daneben stehen **zwei Stufen**:

- **Einfach** — flache Farben, ein Himmelsverlauf, drei Lichter, keine Kontur
  und keine Farbstufen.
- **Comic** — dieselbe Welt als Zeichnung: eine **schwarze Kontur** um jedes
  Ding, Licht, das in **Stufen** auf den Flächen liegt statt in einem Verlauf,
  und ein **schärferes Bild** in der Brille (`framebufferScale` 1,2, Foveation
  0,3 statt 1).

**Was „Einfach ist, was bisher war" heute noch heißt.** Der Satz stand hier
lange als Prüfbedingung, und an genau einer Stelle stimmt er nicht mehr: an
den Schatten. Alles andere gilt weiter, und der Test daneben prüft es — mit
`shadows: false` ist jede Zahl im einfachen Profil der Wert, den `App` ohnehin
setzt (`graphicsSettings.test.ts`).

**Es waren einmal drei.** Dazwischen stand **Schön** — Schatten,
Spiegelungen aus einem Umgebungsbild des Weltenhimmels, schärferes Bild —, und
daneben ein zweiter Schalter für **prozedurale Texturen**: ein Rauschen im
Shader, das jeder Oberfläche Körnung, Farbunruhe und eine leichte Unebenheit
gab, gerechnet aus der Weltposition statt aus einer Bilddatei. Beides ist
wieder heraus, und zwar vollständig: die Stufe, der Schalter, das
Umgebungsbild samt `PMREMGenerator` in `GraphicsQuality` und der ganze
Shader-Umbau in `materialLook.ts`. Was bleibt, ist die Frage, für die es die
Seite gibt — flach oder gezeichnet. Ein gespeicherter Stand, der noch `fancy`
sagt, fällt beim Lesen auf _Einfach_ zurück (`clampGraphics`); ein `textures:
true` daneben wird gelesen und nicht übernommen.

## Die schwarze Kante

Eine Kontur um alles gibt es auf zwei Arten, und die naheliegende fällt hier
aus: Ein **Nachbearbeitungsschritt** (Bild rendern, Kanten im Tiefen- und
Normalenbild suchen) braucht einen Zwischenpuffer für das ganze Bild, und den
gibt eine WebXR-Sitzung nicht her, ohne dass man ihr das Bild aus der Hand
nimmt, das sie selbst für zwei Augen zusammenbaut. Also der ältere Weg, den
Comic-Spiele seit zwanzig Jahren gehen: **die umgestülpte Hülle**
(`core/outlineShell.ts`). Jedes Ding wird ein zweites Mal gezeichnet, in
Schwarz, ein wenig aufgeblasen, mit den **Rückseiten** nach vorn — sichtbar
bleibt nur der Saum, der ringsum darüber hinausragt. Kostet einen zweiten
Zeichenaufruf pro Ding (in einer großen Außenwelt gemessen: 869 → 1824) und
funktioniert in beiden Augen.

Vier Dinge daran sind Erfahrung und keine Theorie:

- **Geglättete Normalen.** Ein Quader aus `BoxGeometry` hat an jeder Ecke drei
  Normalen, eine je Fläche; bläst man entlang dieser auf, fahren die Flächen
  auseinander und die Kontur bekommt an jeder Ecke eine Lücke. Also liegt neben
  jeder Geometrie einmalig eine **gemittelte** Normale (`bgvrOutlineNormal`) —
  ohne die Geometrie selbst anzufassen. Über 24 000 Ecken wird das
  übersprungen: An einem Berghang fällt eine Ecke nicht auf, ein Ruckler schon.
- **Gedeckelt auf einen Anteil des Dings.** Ein gleich breiter Saum auf dem
  Bildschirm heißt: in der Nähe schmal, in der Ferne (in Metern) breit. Der
  erste Versuch machte aus einer **Dominoreihe eine Reihe
  schwarzer Klötze** — ein Domino ist zwei Zentimeter breit, und ein Zentimeter
  Kante ringsherum ist keine Kante mehr, sondern eine Füllung. Jetzt bekommt
  jedes Ding höchstens ein Achtel seines eigenen Radius.
- **Unsichtbar für alles andere.** Der Saum wirft keinen Schatten, trägt eine
  Marke in `userData` und hat ein leeres `raycast` — sonst hätte die Hand
  plötzlich zwei Kisten unter dem Strahl und bekäme das Kind statt der Kiste.
  Und wer im Projekt **Objekte abschreibt**, muss ihn kennen: Das kleine Modell
  in der Menüzeile lässt ihn aus (`denyOutline`, sonst ein schwarzer Klotz in
  einer vier Zentimeter großen Zeile, und ein Material pro Menü-Neubau, das
  niemand wegräumt), und die Kopie eines Props nimmt ihn heraus
  (`stripOutlines` in `cloneVisual` — ein Klon teilt das Material und verliert
  dabei das leere `raycast`, das ihn harmlos macht). Beide bekommen beim
  nächsten Durchlauf ihren eigenen.
- **Ein eigenes Material je Saum**, und ein Skelett bzw. dieselben
  Instanzmatrizen, wo das Ding eines hat: Ein Wald aus 400 Bäumen soll 400
  Säume haben und nicht einen am Ursprung, ein Handschuh seinen an der Hand und
  nicht in der Grundhaltung im Raum. Geteilt wäre das Material auch nur so
  lange heil, bis die erste Welt beim Verlassen ihren Baum abräumt
  (`disposeTree`).

Und die **Farbstufen** (`materialLook.ts`) rechnen nicht auf der fertigen
Farbe, sondern auf dem Licht **ohne** sie: `directDiffuse` ist Beleuchtung mal
Grundfarbe, und wer das rundet, gibt einer dunklen Kiste eine einzige Stufe und
einer weißen fünf. Die unterste Stufe ist dabei ausdrücklich **nicht** die
Null — mit ihr war ein Zimmer, dessen Licht aus zwei Deckenlampen kommt, zur
Hälfte stockschwarz. Ein Boden von 60 % lässt eine dunkle Fläche
dunkel bleiben, ohne sie auszulöschen. Die Stufenzahl steht als **Zahl im
Quelltext** und nicht als Uniform: An ihr hängt der Programmschlüssel, und eine
Uniform ändert den nicht. Die `#include`-Zeile von three.js, an der der Umbau
hängt, prüft ein Test gegen den echten Shader — eine umbenannte fiele sonst
erst in der Brille auf.

Und was in der Szene passiert, steht in `core/graphicsScene.ts` — angewendet
von `core/GraphicsQuality.ts`, das bei der **App** hängt und nicht bei einer
Welt: Ein Schatten ist keine Eigenschaft einer einzelnen Welt, und der Hub hat
gar kein Weltmenü, in das eine Grafikeinstellung passte.

- **Die Szene wird abgelaufen, nicht die Welten geändert.** Sie werden
  nachgeladen, und jede müsste sonst dieselben vier Zeilen selbst schreiben —
  die nächste würde sie vergessen. Der Durchlauf ist
  **idempotent und umkehrbar** (jeder überschriebene Wert liegt vorher unter
  `userData`) und läuft **jede Sekunde erneut**: Ein Zombie, der nach dem
  Umschalten aus dem Käfig kommt, hätte sonst als Einziger keinen Schatten.
- **Eine Kulisse wirft keinen Schatten.** `markBackdrop` ist genau dafür da:
  Der Himmel steht um alles herum, die Bodenplatte reicht bis zum Horizont, und
  beide würden die halbe Welt verdunkeln. Empfangen dürfen sie ihn. Genauso
  wenig wirft Durchsichtiges einen — ein Fenster mit einem Brett als Schatten
  ist schlimmer als eines ohne.
- **Der Schattenkasten wandert mit dem Kopf.** Eine Karte deckt 32 Meter ab,
  die Welten reichen bis zum Horizont: Die Sonne behält exakt ihre Richtung
  (sonst wanderten die Schatten beim Gehen), nur Lampe und Ziel rücken hinter
  den Spieler, eingerastet auf zwei Meter — ohne das kriechen die Ränder bei
  jedem Schritt über die Kanten, und das ist in einer Brille deutlich
  unangenehmer als ein Schatten, der alle zwei Meter einmal springt. Gerechnet
  wird in Weltkoordinaten, weil die Schattenkarte genau so liest; das Ziel eines
  Richtungslichts hängt an keiner Szene, also wird seine Weltmatrix von Hand
  gerechnet.
- **Das Grundlicht geht mit herunter**, sobald Schatten an sind (Hemisphären-
  und Umgebungslicht auf 0,76, im Comic auf 0,7). Das ist der unscheinbarste
  Wert und der wichtigste: Ein Schatten ist nur so dunkel, wie das Licht
  daneben hell ist, und diese Welten leuchten mit 1,5 aus — auf voller Stärke
  war der schönste Schatten ein Hauch. Weiter herunter geht es nicht: Zwei
  Farbstufen brauchen Mitteltöne zwischen sich. Ohne Schatten bleibt es, wo es
  war — ein dunkleres Bild ohne Gegenleistung wäre ein Rückschritt.

  **Lampen bleiben unangetastet**: Ein Dimmer an der Wand, die Lampe über einer
  Tür und der Blitz einer Explosion stellen ihre Stärke selbst ein. Wer ein
  Grundlicht hat, dessen Stärke **das Spiel** setzt, markiert es mit
  `userData.dynamicIntensity = true` — sonst merkt sich der Durchlauf den Wert,
  auf dem es gerade steht, als seine Grundhelligkeit. Bei einem Licht, das beim
  Bauen auf 0 steht und erst später angeht (Archivtisch und Fernseher im
  Haunting), heißt das: Es geht sekündlich wieder aus. Solange Schatten am
  Comic hingen, fiel das niemandem auf, weil der Durchlauf in der einfachen
  Stufe gar nicht lief.
- **Der Rand ist weich** (`shadowRadius`, 1,5 Texel). Das Vorbild hat keine
  harten Kanten, und eine scharfe Silhouette auf einem Kachelboden sieht aus
  wie ein Aufkleber. Weiter weich geht nicht: Bei 2,5 Texeln blieb von einem
  Tisch nur noch ein Hauch übrig — das wurde gebaut und angesehen.
- **Die Schattenkarte wird einmal pro Bild bestellt** (`shadowMap.autoUpdate`
  aus, `needsUpdate` im Loop). Spiegel und Portalsichten zeichnen die Szene
  mehrmals; jede dieser Zeichnungen würde sie sonst neu bauen.
- **Und ohne Schatten, Kontur und Farbstufen wird die Szene nicht jede Sekunde
  abgelaufen** (`GraphicsQuality.rescans`, `touched`): Der Durchlauf stellt dann nur
  zurück, was der Comic einmal verändert hat — und wo der Comic in dieser
  Sitzung nie an war, gibt es nichts zurückzustellen. Ein Gang über ein paar
  tausend Objekte je Sekunde war ein Ruckler für nichts, in der Brille am
  deutlichsten. Einmal je Welt läuft er trotzdem (`scanned`), und sobald der
  Comic einmal an war, bleibt er an: Der Zombie, der im Käfig einen Saum bekam
  und erst nach dem Umschalten herauskommt, soll ihn wieder loswerden.

## Die Brille rechnet kleiner, wenn man es sagt

_Menü → Grafik → Brille: Auflösung_ (`GraphicsSettings.xrScale`, `XR_SCALES`:
**Voll** 1 · **Mittel** 0,85 · **Flüssig** 0,7) ist der eine Regler, der auf
einer Quest **immer** zieht: der Anteil dessen, was die Brille als Puffergröße
vorschlägt (`XRWebGLLayer.framebufferScaleFactor`, angewendet in
`GraphicsQuality.applyRenderer`, multipliziert mit dem 1,2 des Comics). Eine
dunkle Station voller Lichter ist am Füllen der Bildpunkte am teuersten, und
0,7 sind die halben Bildpunkte. Ausgeliefert wird **Voll** — wer nichts
einstellt, sieht dasselbe Bild wie gestern —, und er gilt **ab der nächsten
Sitzung**: Die Brille nimmt die Puffergröße nur beim Aufsetzen entgegen. Am
Bildschirm ändert er nichts. Die Bildrate dazu steht als erste Zeile derselben
Seite (`App.fpsEntry`, aus `FrameStats.latest` — gemessen wird auch in der
Brille, wo das F3-Feld unsichtbar bleibt) und wird alle halbe Sekunde
nachgeschrieben, solange das Menü offen ist (`WristMenus.refresh`, nur die
Zeile, nicht das Menü). Darunter das Häkchen **Bildrate im Bild**
(`showFps`, ab Werk aus): das F3-Feld unten rechts, auch am Telefon, wo es
kein F3 gibt — und F3 schaltet dasselbe Häkchen (`FrameStats.onToggle`),
damit Menü und Taste nie zweierlei sagen.

**Eine Lampe, die aus ist, ist auch für den Shader aus**
(`FlashlightTool.applyBeam`, `beam.visible`/`glow.visible`): three.js rechnet
jede _sichtbare_ Lichtquelle in jedem Bildpunkt jedes beleuchteten Materials
mit, Stärke null hin oder her. Zwei Lampen an den Hüften und die Ersatzlampe
an der Wand waren so sechs Lichter, die nichts taten und trotzdem bezahlt
wurden — in der Brille zweimal je Bild. Unsichtbar zählen sie nicht. Der
Preis: Wechselt die Zahl der Lichter, baut three.js die Programme der
Materialien neu — je Kombination **einmal**; danach liegen sie im Speicher
des Materials (`materialProperties.programs`) und werden nur noch gewählt.
Deshalb bleiben die zwei Raumleuchten des Schiffs (`lampPool`) immer
sichtbar: Die schaltet die Tafel alle halbe Minute, und jeder Wechsel wäre ein
neuer Programmbau.

Im **Konfig-Code steht davon nichts** (`configCode.ts`). Was ein Gerät leisten
kann, ist keine Einstellung, die man verschickt: Ein Code aus einer Brille darf
einem PC nicht die Schatten abschalten und einer vom PC einer Brille keine
aufzwingen.

## Die Gitterlinien

Das dritte Häkchen auf derselben Seite ist kein Grafikprofil, sondern eine
**Auskunft**: _Menü → Grafik → Gitterlinien_ (`GraphicsSettings.gridLines`, ab
Werk aus) legt das Kachelnetz der Ebene über den Boden, auf der man gerade
steht. Es steht hier und nicht im Editor, weil es keine Bedienung ist: Man baut
damit nichts, man **sieht** damit — wo eine Kachel anfängt, wie breit ein Gang
wirklich ist, ob eine Wand auf der Kante liegt oder eine daneben. Auf einem
Metergitter ist das die Frage, die man beim Bauen alle zwei Minuten hat, und
ein Netz, für das man erst die Karte vom Gürtel ziehen muss, beantwortet sie
nicht.

Vier Sachen sind daran entschieden (`GridWorld`, `buildGridLines`):

- **Je Etage ein Netz und nicht eines für alles.** Gezeichnet wird ein
  `LineSegments` über die Kanten aller Bodenkacheln dieser Ebene, einen
  Zentimeter über dem Boden. Sichtbar ist nur das der Ebene, auf der das Rig
  steht (`rigLevel`) — alle übereinander wären ein Knäuel, das sagt, dass es
  Kacheln gibt, und sonst nichts.
- **`userData.level` steht dran**, damit das Aufschneiden es mitnimmt
  (`core/cutaway.ts`). Ein Netz, das über der eigenen Ebene liegen bliebe, wäre
  ein Gitter im Himmel.
- **Ein Material für alle Etagen**, halbtransparent und ohne Tiefe zu schreiben
  (`depthWrite: false`) — sonst schneidet die Linie Löcher in alles, was hinter
  ihr steht, denn sie liegt ja _über_ dem Boden und nicht darin. Und es
  überlebt den Umbau: Ein Material je Netz wäre bei jedem Pinselstrich ein
  neues, und die alten blieben auf der Grafikkarte liegen.
- **Umgeschaltet wird die Sichtbarkeit und nicht die Geometrie.** Die Netze
  entstehen beim Bauen und stehen danach unsichtbar da; ein Häkchen, das ein
  paar tausend Linien neu baut, blitzt beim ersten Bild auf und sieht aus wie
  ein Fehler.

## Die Hitboxen

Das vierte Häkchen ist die zweite Auskunft und die ehrlichste: _Menü → Grafik →
**Hitboxen**_ (`GraphicsSettings.hitBoxes`, ab Werk aus) legt die **Körper der
Physik** als Drahtgitter über die Welt (`physics/HitboxView.ts`). Was man sieht,
ist nämlich nicht, woran man hängen bleibt — ein Tresen ist einen halben Meter
hoch und hat eine unsichtbare Sperre von 1,40 m über sich
(`worlds/test/zones/kitchen.ts`), der Spieler ist von oben eine Figur und in der
Physik eine Kapsel, und ein geladenes Möbel war lange ein Würfelchen von 20 cm,
das niemand sah. Genau diese Lücke macht das Häkchen auf.

Vier Sachen sind daran entschieden:

- **Gezeichnet wird, was Rapier selbst zeichnet** (`World.debugRender`). Die
  Umrisse aus den Formen nachzubauen hieße, jede Form ein zweites Mal zu kennen
  — Kasten, Kapsel, Zylinder, Kegel, konvexe Hülle, Höhenfeld —, und die zweite
  Fassung liefe beim ersten neuen Collider auseinander. Die Engine gibt es als
  zwei Zahlenfelder heraus: Punkte und Farben, je zwei Punkte eine Strecke.
- **Ohne Tiefenprüfung**, und das ist der Sinn der Sache: Die Linien liegen über
  allem, auch über dem Möbel, zu dem sie gehören. Ein Umriss, den das Ding
  verdeckt, dessen Umriss er ist, beantwortet keine Frage — in der Ansicht von
  oben schon gar nicht.
- **Die Achsenkreuze fliegen raus.** `debugRender` malt zu **jedem** Körper sein
  Koordinatenkreuz aus drei Strichen; in einer Welt mit anderthalbtausend
  Körpern ist das ein Teppich aus bunten Strichen, durch den man die Umrisse
  nicht mehr sieht. Abschalten lässt es sich nicht — der Modus der Pipeline
  kommt in dieser Fassung der Bindung nicht durch. Erkannt werden sie deshalb an
  ihrer **Farbe**: Ein Achsenstrich hat genau einen Farbkanal, ein Umriss nie.
  Die Schwelle dafür ist nicht die Null, sondern ein Fünfzigstel, und auch das
  ist nachgemessen: Der rote Strich kommt glatt heraus, der grüne und der blaue
  mit einem Millionstel in den Nebenkanälen — mit der Null blieben zwei von drei
  Kreuzen stehen.
- **Der Kreis um den Spieler wird zusätzlich gezeichnet**, flach auf dem Boden
  und in einem Grün, das sonst nirgends vorkommt. Rapier zeichnet die
  Spielerkapsel längst mit, aber sie ist eine von tausend gelben Umrissen, und
  in einer Küche voller Tresen findet man sie nicht wieder. Der Kreis beantwortet
  die Frage, für die man von oben spielt: **Wie breit bin ich, und passe ich da
  durch?** Er kommt aus `PhysicsWorld.playerCapsule`, also aus derselben
  Meldung, mit der die Physik jedes Bild sagt, wo der Spieler steht.

Es kostet Bildrate, und das steht auch so in der Zeile: `debugRender` läuft über
jeden Collider der Welt und legt dabei zwei frische Zahlenfelder an. Die Frage
nach dem Häkchen steht deshalb **vor** dem Aufruf und nicht danach — wer es aus
hat, merkt von der Datei nichts, und der `LineSegments` entsteht überhaupt erst
beim ersten Mal Anschalten.

## Ghosting zeigen

Das fünfte Häkchen ist die dritte Auskunft und gehört zum **Wand-Ghosting**
(_Von oben_: was zwischen Kamera und Figur steht, wird durchsichtig —
`grid/wallGhost.ts`).
_Menü → Grafik → **Ghosting zeigen**_ (`GraphicsSettings.ghostBoxes`, ab Werk
aus) legt die Kästen, über die das Ghosting entscheidet, als Drahtgitter über
die Welt (`grid/ghostView.ts`). Gewünscht mit genau diesem Zweck: „wenn wir
sehen könnten, welche Box/Felder unsichtbar werden sollen, um diesem Bug
entgegenzuwirken." Ein Fehler im Ghosting sieht im Bild immer gleich aus — die
falsche Wand wird durchsichtig —, und welcher es war, sagt erst der Kasten.

- **Gelb** ist ein Kasten, der verdecken **könnte** (`blocksView`: kein Boden,
  höher als ein Knie), es in diesem Bild aber nicht tut; **rot** ist, was
  gerade durchsichtig ist. Gezeichnet wird nur, was höchstens 14 m von der
  Figur weg ist (`GHOST_VIEW_REACH`) — ein Gelände voller gelber Gitter ist
  ein Teppich, in dem man den roten nicht findet.
- **Weiß** ist die **Spalte**, in der gefragt wird, als Streifen auf dem
  Boden: so breit wie die Schultern (`GHOST_SHOULDER`) und von der Figur bis
  unter die Kamera. Was rot ist, muss darin stehen. Als Strecke durch die Luft
  wäre sie nutzlos gewesen — sie läuft genau auf die Kamera zu, und von dort
  aus ist jede solche Strecke ein Punkt (so stand es im ersten Versuch da:
  ein waagerechter Strich quer über das Bild).
- **Ohne Tiefenprüfung** wie die Hitboxen, und nur von oben: In der Brille und
  aus den Augen wird nicht geghostet, also gibt es dort auch nichts zu zeigen.

**Und der Fehler, für den sie bestellt wurde, war beim ersten Hinsehen da.**
Gemeldet war: „teilweise am Rand der Karte ist der Offset nicht korrekt, wo die
Wand unsichtbar sein soll." `stepWallGhosts` fragte mit
`ctx.camera.position` — der Kamera der **eigenen Augen**, und die hängt als Kind
im Rig (`PlayerRig`, `this.add(camera)`). Ihre `position` ist also die Stelle
**im Rig**: `(0, Augenhöhe, 0)`, wo auch immer man steht. Gefragt wurde damit
stets aus der Reihe z = 0 heraus, und je weiter die Figur davon weg war, desto
schiefer lag die Strecke. Nahe dem Nullpunkt ging das fast gut, am Rand des
Geländes (die Küche liegt bei z = −31) wurde die falsche Wand durchsichtig
oder keine. Seither trägt der Weltkontext die Kamera, **aus der das Bild
gezeichnet wird** (`WorldContext.viewCamera`: von oben die `TopDownCamera`), und
gefragt wird mit ihrer Weltposition (`getWorldPosition`).

**Und was man selbst hinstellt, wird genauso durchsichtig**
(`grid/modelGhost.ts`). Das Ghosting kannte nur die Quader aus dem Grundriss;
eine Wand aus dem Regal ist ein Modell und blieb stehen, während die gebaute
daneben durchsichtig wurde. Jetzt kommt jedes hingestellte Modell
(`PortalWorld.placedModels`, getragene nicht) mit seinem Collider-Kasten in
**dieselbe** Rechnung, und durchsichtig wird es über einen Zwilling je Material
— einmal gebaut, geteilt, am Netz getauscht und nicht am Material, aus demselben
Grund wie die zweite Palette der Quader. Der schwarze Rand des Comics geht
solange weg, der gelbe Saum des Hervorhebens bleibt.

## Position zeigen

Noch ein Häkchen, und die einfachste Auskunft von allen: _Menü → Grafik →
**Position zeigen**_ (`GraphicsSettings.showPosition`, ab Werk aus) legt
oben links unter den Menüknopf ein Feld mit drei Zeilen
(`core/positionHud.ts`):

- `x`, `z` und `y` in Metern — Osten, Süden, Höhe der Füße, so wie three.js
  rechnet. Die Höhe steht zuletzt, weil sie von oben fast immer null ist.
- Kachel und Ebene — dasselbe Raster, auf dem gebaut und eingerastet wird.
- `?at=x,z` (samt Ebene, wenn sie nicht null ist) — die Schreibweise, die
  `worlds/test/spawnAt.ts` liest. Wer die Zeile weitergibt, gibt den Weg mit.

Gewünscht, um Stellen weitergeben zu können: „die x-, y-Pos und ggf. z-Pos in
der Welt sehen". Eine fehlende Bodenplatte, eine falsch durchsichtige Wand —
„hinter der Küche" findet niemand wieder, `?at=8,-33` schon. Geschrieben wird
höchstens alle Zehntelsekunde und nur, wenn sich die Zeile ändert; wie die
Bildrate ist es DOM und in der Brille unsichtbar.

**Und darunter steht _Kopieren_** (`positionLine`). Gewünscht: „ein
Kopierband, dass ich die aktuellen Position kopieren kann." Abschreiben ist
genau die Fehlerquelle, die das Feld abschaffen sollte. Kopiert werden alle
drei Zeilen als **eine**, mit `·` dazwischen —
`x 8.40 · z −33.10 · y 0.00 · Kachel 8 | -34 · Ebene 0 · ?at=8,-34` —, weil
eine Chatzeile mit Umbrüchen beim Einfügen in drei Nachrichten zerfällt. Der
Knopf sagt anderthalb Sekunden lang _Kopiert ✓_; lässt der Browser die
Zwischenablage nicht zu, steht dort _Markiert_, und `Strg+C` tut den Rest
(`ui/clipboard.ts`, dieselbe Ersatzantwort wie an jedem anderen
_Kopieren_). Das Feld selbst lässt Klicks weiter durch, nur der Knopf nicht.

## Griffe zeigen

Das sechste Häkchen ist die vierte Auskunft und gehört zu den Griffen, an denen
eine Hand ein Ding anfasst (_Ein Griff ist auch für das, was kein Werkzeug ist_).
Ein Griff ist absichtlich nichts, was man sieht — man nimmt die Pfanne am Stiel
und nicht einen Punkt am Stiel. Nur lässt sich eine Lage, die man nicht sieht,
auch nicht beurteilen. Deshalb gibt es unter _Menü → Grafik → **Griffe zeigen**_
(`GraphicsSettings.showHandles`, ab Werk aus) ein kleines Achsenkreuz an jeder
Griffstelle, **4 cm** lang (`core/handleView.HANDLE_AXES_SIZE`), ohne
Tiefenprüfung über allem — sonst sähe man den Griff unter dem Teller nie, und er
ist einer der beiden, um die es beim Teller geht.

Ein Achsenkreuz und keine Kugel, weil eine Kugel nur sagt, **wo** ein Griff
liegt: Die größere Hälfte der Auskunft ist, **wie herum** — die Achse, an der die
Faust hängt, und das Vorne, wohin der Zeigefinger zeigt. Das Kreuz
(`core/axesCross.ts`) zeigt beides, und sein weißer Arm (`AXIS_FRONT`) ist genau
das -Z, das ein Griff „vorne" nennt.

**Und wo ein Haltezylinder dabeisteht, steht er auch da** — eine
durchscheinende grüne Röhre in derselben Farbe wie der +Y-Arm daneben
(`HANDLE_BAR_COLOR`, `HANDLE_BAR_ALPHA`), offen an beiden Enden, damit man die
Stange **darin** sieht. Das Kreuz sagt, wie herum ein Griff liegt; der Zylinder
sagt, **worauf**. Erst mit ihm lässt sich die Frage beantworten, um die es beim
Einmessen geht — deckt sich der Griff mit dem Stiel der Pfanne, mit den Ohren
des Topfes, mit dem Bügel des Löschers? —, und genau weil sie vorher nicht zu
beantworten war, standen alle drei eine Weile falsch herum. Gedreht wird er in
`bar.along` und nicht in die Drehung des Griffs: Beides fällt bei einem Hammer
zusammen und bei einer Pfanne nicht (siehe _Der Haltezylinder_).

Es ist eine Werkstattansicht wie die Hitboxen: ein Maßband, kein Bühnenbild.
Wer die Brille dafür nicht aufsetzen will, bekommt dieselben Bilder am Schirm:
`handles-preview.html` (`src/preview/handlesPreview.ts`) stellt jedes Gerät
einmal roh mit seinen Zylindern und einmal in einer groben Hand hin,
`npm run handles` schießt alle Ansichten nach `.artifacts/handles` — derselbe
Weg wie beim Musterbogen des Avatars, und aus demselben Grund: Ob etwas in
einer Hand richtig liegt, entscheidet kein Jest-Test.

## Squishy: die Figur federt beim Laufen und atmet im Stehen

Unter den Häkchen steht eine eigene Seite: _Menü → Grafik → **Animationen**_
(`App.animationMenu`). Sie ist eine andere Frage als alles darüber — dort geht
es darum, was ein Bild kostet und was es zeigt, hier darum, wie sich eine
**Figur** bewegt. Inzwischen stehen zwei Bewegungen darauf, und jede hat
dieselben drei Zeilen: **Schalter, Stärke, Tempo**. Die nächste Animation
hängt sich an diese Seite und nicht an das Ende einer Liste, die dann keine
mehr ist.

**Squishy Movement** (`GraphicsSettings.squish`, ab Werk **aus**) staucht und
streckt die Figur, während sie läuft. Der Anlass ist eine Lücke: Diese
Figuren haben **keine Auf-und-ab-Bewegung**, die man ihnen abnimmt. Der Kopf
darf nicht wippen — in der Brille gehört er dem Menschen davor, und am Schirm
ist ein nickendes Bild keine Gehbewegung, sondern Übelkeit —, und Beine, die
abwechselnd aufsetzen, gibt es gar nicht: Unter dem Jackensaum sitzt eine
geschlossene Kuppel (_Spielfigur_). Bleibt der Weg, den der Zeichentrick seit
achtzig Jahren geht: **squash and stretch**. Wer aufsetzt, wird flach und
breit; wer sich abstößt, wird lang und schmal.

**Und dafür eine Hermite-Kurve** (`core/squish.ts`, `squishCurve`). Ein Sinus
wäre die naheliegende Kurve und die falsche: Er ist symmetrisch, und diese
Bewegung ist es nicht — das Strecken beim Abstoßen geht schnell, das
Zurücksinken zieht sich, und daran erkennt das Auge einen Schritt statt eines
Pulsierens. Eine kubische Hermite-Kurve bekommt zu jedem Stützpunkt **eine
Steigung dazu**, und damit lässt sich genau das hinschreiben: vier Stützpunkte
(Aufsetzen −1, Abstoßen +0,9 bei 0,28, Absinken +0,1 bei 0,62, Aufsetzen −1),
und weil der letzte Punkt Wert **und** Steigung des ersten hat, läuft die Kurve
über die Naht zwischen zwei Schritten ohne Knick weiter. Ein Knick dort wäre
ein Zucken bei jedem Schritt — `squish.test.ts` misst die Steigung links und
rechts der Naht und vergleicht sie.

Gerechnet wird der Ausschlag als **Anteil der Höhe** (`SQUISH_AMPLITUDE`, 9 %
— auf 1,6 m knapp fünfzehn Zentimeter zwischen der flachsten und der längsten
Haltung), mal der Stärke aus dem Menü (`squishScale`, acht Rasten von **×0,25
bis ×2 in Vierteln**, im Kreis schaltbar) und mal dem **Lauftempo**: Im Stehen steht
die Figur still, im Schlendern federt sie halb so weit wie im Rennen. Die
Breite ist der Kehrwert der Wurzel aus der Höhe — **Breite mal Breite mal Höhe
bleibt 1**, also behält die Figur ihr Volumen. Eine, die sich beim Strecken nur
längt, sieht aus, als zöge man sie am Kopf hoch.

**Und wie oft sie federt, ist eine zweite Frage** (`squishSpeed`, dieselben
acht Rasten **×0,25 bis ×2 in Vierteln**, ab Werk **×0,5**). Die erste Fassung hatte sie nicht, und
das war der Fehler: Sie federte einmal je Schritt, und das ist zu schnell —
der Takt des Watschelns ist schon zweimal je Doppelschritt, und eine Figur,
die dazu ebenso oft ihre Höhe wechselt, flimmert, statt zu federn. Bei ×0,5
zieht sich ein Federn über **zwei** Schritte und legt damit eine ruhige Welle
über das schnellere Watscheln. Gerechnet wird der Faktor auf die **Phase**
(`squishPose(phase * tempo …)`) und nicht auf den Ausschlag: Wie weit die
Figur federt, sagt die Stärke, und mit einem Regler für beides ließe sich ein
zu schnelles Federn nur kleiner machen und nicht langsamer.

**Alle vier Regler gehen dieselbe Leiter** (`SQUISH_SCALES`, acht Rasten in
Vierteln von ×0,25 bis ×2). Erst waren es fünf Stärken mit einem Loch zwischen
×1 und ×1,5 und drei Tempi mit einer Decke bei ×1; spätestens neben dem Atmen
war das nicht mehr zu halten — vier Regler mit drei verschiedenen Leitern sind
vier, die man einzeln lernen muss. Die Decke bei ×1 war ohnehin eine
Vorsichtsmaßnahme („schneller will niemand"), und wer einen Trickfilm will,
darf jetzt darüber hinaus.

Ein gespeicherter Stand aus der ersten Fassung kennt das Feld nicht und bekommt
damit genau das, was die Zeile beheben soll: das halbe Tempo (`clampGraphics`).

Angewendet wird das in `AvatarBody.update`, und zwar auf **Rumpf und Kopf
zusammen** — die ganze Figur wird flacher, nicht nur ihr Bauch. Der Rumpf steht
mit seiner eigenen Null auf dem Boden, wird also um die **Sohlen** gestreckt;
der Kopf fährt mit, indem seine Höhe mitwächst (`eyeY * height`), und die
ungetrackten Hände tun dasselbe. Andersherum stünde die Figur beim Stauchen im
Boden. Es liegt **über** dem Watscheln (`BodyShape.setStride`, eine Gruppe
tiefer) und ersetzt es nicht: Das Watscheln bleibt auch, wenn hier nichts
eingestellt ist.

### Und im Stehen atmet sie

**Idle Squish** (`GraphicsSettings.idleSquish`, ab Werk **aus**) ist die zweite
Bewegung derselben Seite und dieselbe Rechnung noch einmal — nur **flacher und
langsamer**. Der Anlass ist die Lücke, die die erste offen ließ: Eine Figur,
die beim Laufen federt und im Stand zur Statue wird, sieht in dem Moment tot
aus, in dem man sie am längsten ansieht — vor dem Tresen, im Menü, beim Warten
auf die anderen.

Drei Unterschiede zum Federn, und jeder ist einer aus dem Bild:

- **Ein Sinus, und zwar mit Absicht** (`breathCurve`). Für den Schritt war er
  falsch, weil dort etwas aufsetzt; ein Atemzug ist ein Hin und Her ohne
  Ereignis, ein und aus dauern gleich lang. Bei `u = 0` steht die Figur in
  ihrer natürlichen Höhe — ein Atem, den man einschaltet, soll sie nicht im
  selben Bild um fünf Zentimeter kürzer machen.
- **Ein Drittel des Ausschlags** (`IDLE_AMPLITUDE`, 3 % der Höhe gegen 9 %).
  Damit heißt ×1 hier und ×1 dort beides „ruhig" und nicht dieselbe Strecke,
  und selbst ×2 bleibt flacher als ein Schritt bei ×1.
- **Eine eigene Uhr** (`IDLE_PERIOD`, drei Sekunden je Atemzug bei ×1,
  `AvatarBody.idleClock`). Die Taktphase des Laufens steht im Stand still, und
  eine Figur, deren Atem daran hinge, hielte beim Warten die Luft an. Die Uhr
  läuft auch beim Gehen weiter, damit der Atem nicht bei jedem Halt von vorn
  anfängt und einen Ruck setzt.

**Überblendet wird über `stride`**, nicht addiert: Im Stand ist die Figur ganz
beim Atem, im vollen Lauf ganz beim Schritt, dazwischen liegt genau die
Mischung, die man auch sieht. Beide Gewichte zusammen sind immer eins, also
blitzt beim Losgehen nichts auf. Zwei Wellen übereinander gäben eine dritte,
die keiner von beiden gehört.

### Und was die Figur hält, geht mit

Von oben hängt ein **Werkzeug** an einer festen Stelle vor ihrer rechten Faust
(`worlds/portal/screenHand.ts`, `CHEF_TOOL`) und ein **getragener Gegenstand**
vor ihrem Bauch (`core/screenCarry.ts`, `CHEF_CARRY`) — beide am **Rig** und
nicht an der Figur, denn in der Brille gibt es diese Hand gar nicht. Damit
bekamen sie die Stauchung nicht geschenkt: Die Pistole stand ruhig in der Luft,
während die Faust darunter bei jedem Schritt auf und ab ging.

Deshalb gibt jede Figur ihre Höhe nach außen (`AvatarBody.stretch`, 1 heißt
ungestaucht) — das Gegenstück zu `bob`, das schon immer das Wippen
weiterreichte. Beide Stellen nehmen sie mal: `CHEF_TOOL.y * stretch` und
`CHEF_CARRY.y * stretch + bob`, und dieselbe Zahl geht an die **Hände** der
Figur (`PlayerAvatar.carry`, `kitchen.carryY`) — zwei Rechnungen für eine
Stelle wären zwei, die auseinanderlaufen. Die **Waagerechte** bleibt dabei, wie
sie ist: Beim Strecken wird die Figur schmaler, und ein Werkzeug, das dabei
nach innen rutschte, steckte im Ärmel. Der Boden sticht die Stauchung ebenfalls
(`CARRY_FLOOR`): Im Fußboden steckt auch dann nichts, wenn die Figur am
flachsten ist. Gelesen wird die Zahl des **vorigen** Bildes — die Welt rechnet
vor dem Avatar (`App.update`) —, und ein Bild Versatz sieht niemand.

Aus den Augen bleibt alles, wie es war: Dort sieht man die Figur gar nicht, und
ein Teller, der vor der Kamera im Takt fremder Schritte hüpfte, wäre ein
Wackeln ohne Grund.

Zwei Dinge daran sind Absicht:

- **Es sitzt an der Figur, nicht an der Kamera** — dieselbe Regel wie beim
  Wippen des Tragenden (_Spielfigur_). Zu sehen ist es von oben, im Spiegel und
  durch ein Portal; aus den eigenen Augen ist davon nichts zu sehen und nichts
  zu spüren.
- **Gelesen wird die Einstellung einmal je Änderung**, nicht je Bild und Figur:
  Jede Figur hört beim Bau auf das Menü (`onGraphicsChange`) und hält die
  vier Werte als vier Zahlen (`AvatarBody.squish`, 0 heißt aus,
  `AvatarBody.squishSpeed`, `AvatarBody.idleSquish`, `AvatarBody.idleSquishSpeed`).
  Damit federt und atmet auch der
  Mitspieler mit, den hier niemand neu baut (`net/RemoteAvatars.ts`) — und ein
  Test oder eine Vorschau ohne Menü setzt die Zahl einfach selbst.

## Was die Kamera ansieht

Ein Schild, ein Fortschrittsbalken, ein Warndreieck: Alles, was Auskunft gibt,
will dem Auge zugewandt stehen und nicht hochkant im Bild. Die Rechnung dafür
steht an **einer** Stelle im Projekt (`ui/billboard.ts`, `faceCamera`). Sie
stand vorher in `worlds/test/zones/kitchenGauge.ts` und hätte beim nächsten
Schild ein zweites Mal dagestanden — ein Ding, das der Kamera zugewandt stehen
will, ist keine Küchenfrage.

**Zur Kamera heißt: parallel zum Bild** — und nicht „mit der Nase auf die
Linse". Der Unterschied fällt erst am Rand des Bildes auf, und dort sofort. Ein
Schild, das auf die **Stelle** zielt, an der die Kamera steht, behält seine
Hochachse in der senkrechten Ebene durch Schild und Kamera; bei einer Kamera,
die von schräg oben blickt, steht die umso schiefer im Bild, je weiter das
Schild neben der Blickachse liegt. Von oben lagen die Beschriftungen des
Küchenkatalogs damit wie hingeworfen — jede in einem anderen Winkel, keine
davon waagerecht. Gerechnet wird deshalb aus der **Rückachse der Kamera**
(ihrem +Z, also der Richtung, in der der Betrachter hinter der Linse sitzt):
Das Schild bekommt genau die Neigung und das Gieren, aus denen die Kamera
schaut. Alle Schilder im Bild stehen damit gleich, alle Zeilen waagerecht,
keine verkürzt. Die **Rolle** der Kamera wird dabei nicht übernommen — wer in
der Brille den Kopf zur Seite legt, soll ein Schild sehen, das steht, und
keines, das mitkippt.

**Ausgerichtet wird beim Zeichnen, nicht im `update`**, und das ist der
eigentliche Punkt. Eine Welt bekommt in `update` genau **eine** Kamera gereicht
(`WorldContext.camera`), und das ist die aus den Augen; der Tausch auf die
Kamera von oben passiert in `core/App.ts` erst fürs **Bild** (`viewContext`).
Wer sich im `update` danach richtete, stand in der Ansicht von oben zur Figur
gedreht statt zur Kamera — fast hochkant, und genau das war am Schirm zu sehen.
`Object3D.onBeforeRender` bekommt dagegen **die Kamera, aus der gerade wirklich
gezeichnet wird**: von oben, aus den Augen, im Spiegel, je XR-Auge einmal. Es
muss niemand eine Kamera durchreichen, und jeder Client richtet dasselbe Schild
für seinen eigenen Blick aus — der Spieler in der Brille sieht es zu sich
gedreht, während es am Schirm daneben zur Kamera von oben steht.

Drei Fallen stecken darin, und alle drei sind teuer bezahlt:

- **three ruft `onBeforeRender` nicht auf einer `Group`.** Der Renderer ruft
  ihn nur für das, was er wirklich zeichnet — `Mesh`, `Line`, `Points`,
  `Sprite`. Ein Balken ist aber eine Gruppe aus Grund und Füllung, und die
  hätte den Handler nie gesehen. `faceCamera` hängt ihn deshalb **zusätzlich an
  alles Gezeichnete darunter**: Jedes Teil richtet vor seinem eigenen Zug die
  Gruppe aus. Daraus folgt die Regel für Aufrufer — **erst bauen, dann
  `faceCamera`**. Was danach hineingehängt wird, löst nichts aus.
- **Die Matrix muss von Hand nachgezogen werden** (`updateMatrixWorld`). three
  baut die Matrizen der Szene vor dem Zeichnen; wer im Handler nur `rotation`
  setzt, sieht die Drehung ein Bild zu spät — und bei zwei Ansichten
  nebeneinander die des jeweils anderen Auges.
- **Ein Schild lehnt sich mindestens 30° zurück** (`BILLBOARD_LEAN_MIN`). Nicht
  für die Kamera von oben: Die steht mit 55° (`core/topDownPose.TOP_DOWN_TILT`)
  ohnehin darüber und bekommt ihren echten Winkel. Der Mindestwert regelt den
  anderen Fall — eine Kamera **auf oder unter** der Höhe des Schildes, wo es
  bolzengerade stünde oder nach vorn kippte und seine Rückseite nach oben
  zeigte. Aus den Augen (0,914 m, `core/chefFit.CHEF_EYE`) steht die Kamera
  kaum über einem Balken auf 0,85 m; 30° zurück sind auf zwei Meter Abstand
  kaum von „genau angesehen" zu unterscheiden (`cos 30° = 0,87`), lassen den
  Balken aber wie ein Schild über der Pfanne aussehen und nicht wie einen
  Aufkleber in der Luft. `upright` gibt es dazu für Schilder, die senkrecht
  stehen sollen: nur gieren, nicht neigen.

**Was sich dreht und was hängt.** Die Regel dazu ist eine Zeile, und sie gilt
in jeder Welt: **Alles, was frei im Raum steht und Auskunft gibt, sieht die
Kamera an — Text an einer Wand nicht.** Ein Schild am Pfosten
(`grid/fixtures/sign.ts`), die Tafel über dem roten Knopf
(`shared/redButton.ts`), das Schild am Tor (`hub/gate.ts`), die Beschriftung
eines Schaustücks, der Zielmast der Navigation, der Name über einem leeren Kart,
die Balken und Warndreiecke der Küche: alle mit `face`. Ein **Aushang an der
Wand** dagegen ist ein Gemälde und bleibt, wo er hängt
(`worlds/test/zones/kitchenNotice.ts`); dasselbe gilt für Beschriftungen, die
zu einem Gerät gehören — das Schild im Armaturenbrett des Karts, die Tasten
einer Bedientafel, die Mulde der Palette, das HUD auf dem Glas — und für die
Aufschrift über der Mündung des Hub-Gangs, die zur Wand gehört und nicht in
den Gang.

Zwei Umwege sind dieser Regel zum Opfer gefallen, und beide sind es wert,
aufgeschrieben zu bleiben:

- **Die zweite, flache Tafel auf dem Torpodest** ist weg (`hub/gate.ts`). Sie
  lag waagerecht auf dem Sockel und las nach Norden oben, weil das aufrechte
  Schild je nach Torrichtung der Kamera von oben den Rücken zeigte. Das
  aufrechte zu neigen schien ausgeschlossen: Es stünde dann gegen sein eigenes
  Tor verdreht, von innen ein schief hängendes Brett. Der Denkfehler war,
  Ausrichtung für etwas zu halten, das **einmal** in der Szene steht — sie
  passiert je Kamera, und der Spieler in der Brille bekommt dasselbe Schild zu
  **seinem** Auge gedreht, während es am Schirm daneben zur Kamera von oben
  steht.
- **`FixtureView.face(head)` gibt es nicht mehr** (`grid/fixtures/index.ts`).
  Ein Einbau bekam damit je Bild den Kopf des Spielers gereicht und drehte sich
  danach; das **Schild** war die einzige Kundschaft. Es war der halbe Weg: Eine
  Tafel, die dem Kopf folgt, steht in der Ansicht von oben zur **Figur** gedreht
  und nicht zur **Kamera** — sie dreht sich also mit, sobald sich die Figur
  dreht. Genau das war zu sehen: Wer sich einmal um sich selbst drehte, sah
  seinen Wegweiser einmal um sich selbst kippen.

Angehängt wird **einmal beim Bauen** und nicht je Bild; abgemeldet werden muss
nichts, weil der Handler am Objekt lebt und mit ihm verschwindet
(`unfaceCamera` gibt es trotzdem, und zweimal Anhängen ersetzt statt zu
stapeln). Die reine Rechnung steht als `billboardAngles` daneben, damit ein
Test sie ohne Szene nachrechnen kann — steht die Kamera **senkrecht** über dem
Schild, ist jede Richtung gleich richtig, und dann bleibt das bisherige Gieren
stehen, statt auf den kleinsten Rechenfehler hin herumzuspringen.


## Warum tausend Bodenkacheln trotzdem ein Zeichenaufruf sind

Eine Gitterwelt beschreibt sich als Grundriss, und der Grundriss wird Kachel
für Kachel gebaut: Jeder `PlanSolid` ist ein eigenes `THREE.Mesh`. Das ist beim
Bauen richtig — jede Kachel hat ihren eigenen Körper in der Physik, ihren
eigenen Platz in der Abtastliste, und eine Wand muss sich einzeln durchsichtig
schalten lassen. Beim **Zeichnen** ist es falsch: Die Testwelt hat 1 364
Quader, und aus der Küche heraus liegen davon rund 950 gleichzeitig im Bild —
die Küche steht ganz im Norden, die Kartstrecke ganz im Süden, und dazwischen
liegt das Gelände offen da. Gemessen waren das **1 924 Zeichenaufrufe je Bild
gegenüber 792**, wenn man in die andere Richtung sah. Genau dieser Unterschied
war der Einbruch der Bildrate, den man in der Brille als fünfzehn Bilder
merkte.

Die Antwort heißt `InstancedMesh`: tausend gleiche Kästen in **einem** Aufruf.
Es gab sie schon (`GridWorld.batchGridGeometry()`), und sie stand aus einem
guten Grund überall auf `false` — ein Bündel hat **ein** Material, und das
Wand-Ghosting braucht das Gegenteil. Von oben wird durchsichtig, was zwischen
Kamera und Figur steht, und zwar *diese* eine Wand; gebündelt würde stattdessen
jede Wand derselben Sorte auf derselben Ebene durchsichtig.

Der Einwand gilt nur nicht für alle Quader. `wallGhost.blocksView` beantwortet
längst die Frage, ob ein Quader überhaupt jemanden verdecken kann — **Böden
nie, alles unter Kniehöhe auch nicht**. In der Testwelt sind das 1 130 von
1 360: Bodenkacheln, Schwellen, Rampen, Druckplattenränder. Keiner davon wird
je durchsichtig, also kostet es auch nichts, sie zusammenzufassen. Genau das
steht in `grid/gridBatch.ts`, und zwar als **Umkehrung** von `blocksView` und
nicht als zweite, ähnliche Regel daneben: Was ghosten kann, bleibt einzeln; was
nicht ghosten kann, darf zusammen. Zwei Sorten kommen trotzdem nicht hinein,
obwohl sie flach liegen — **Portalflächen** (ein Portal haftet an *einer*
Fläche mit ihrer eigenen Kollisionsgruppe; gebündelt risse ein Bodenportal jede
andere Bodenkachel mit auf) und **Türblätter** (sie gehen auf und zu, und ein
Bündel hat genau eine Sichtbarkeit für alle darin).

Der Trick, der das billig macht: **Die einzelnen Quader bleiben stehen und
werden nur unsichtbar.** three prüft beim Abtasten keine Sichtbarkeit, beim
Zeichnen dagegen schon — also arbeiten Körper, Abtastliste und jeder Strahl
unverändert weiter, und gesehen wird das Bündel. Zusammengefasst wird je
Material **und** je Ebene, denn das Aufschneiden von oben (`core/cutaway.ts`)
hängt an `userData.level`, und ein Bündel über zwei Stockwerke ließe sich nicht
mehr aufschneiden.

Wer `batchGridGeometry()` weiterhin anschaltet, bekommt wie bisher **alles** im
Bündel und verzichtet dafür aufs Ghosting; das ist der Weg für eine Welt mit
zehntausend Kacheln.

Gemessen, aus derselben Pose in der Küche mit Blick auf die Strecke:

|                          | vorher | nachher |
| ------------------------ | ------ | ------- |
| Draw Calls je Bild       | 1 924  | **668** |
| davon Schattendurchgang  | ~600   | ~120    |
| Meshes im Blickkegel     | 1 231  | 399     |
| Dreiecke je Bild         | 73 k   | 92 k    |

Die Dreiecke steigen, und das ist kein Versehen: Ein Bündel ist **ein** Objekt
und wird als Ganzes ausgesiebt oder gar nicht — der halbe Boden hinter dem
Rücken wird also mitgezeichnet. Neunzehntausend Dreiecke mehr sind der Preis
für tausendzweihundertfünfzig Aufrufe weniger, und das ist auf jeder Hardware
dieses Jahrzehnts ein gutes Geschäft.

## Und die Wände auch — nur nicht von oben

Der Abschnitt davor bündelte alles, was **nie** ghosten kann, und ließ die
Wände in Ruhe: Ein Bündel hat ein Material, das Wand-Ghosting braucht das
Gegenteil. Danach waren aus derselben Pose 666 Zeichenaufrufe je Bild übrig
(die Tabelle oben nennt 668 — zwei Messungen derselben Stelle gehen um ein paar
Aufrufe auseinander), und die größte einzelne Gruppe darin waren genau diese
Wände: **156 von 414** im Hauptdurchgang und **90 von 243** im
Schattendurchgang, zusammen 37 % eines Bildes. Quader von zwölf Dreiecken,
einer je Aufruf.

Der Einwand gegen das Bündeln steht aber nicht für alle Zeiten, sondern für
**eine Ansicht**, und das steht in der ersten Zeile von
`GridWorld.stepWallGhosts`:

```ts
if (!ctx.topDown) { this.clearWallGhosts(); return; }
```

**Geghostet wird ausschließlich von oben.** In der Brille steht man _in_ der
Welt; eine Wand, die dort durchsichtig würde, weil der Kopf zufällig
dahintersteht, wäre ein Fehler und kein Hilfsmittel — das stand dort schon
immer. Der Einwand gilt also ausgerechnet für die Ansicht, die auf keiner
Brille läuft.

Also bekommen die Wände ein **zweites Bündel** (`gridBatch.joinsGhostBatch`,
`GridWorld.showGhostBatches`), und umgeschaltet wird an derselben Frage, die
auch über das Ghosting entscheidet:

|                              | das Bündel | die einzelnen Quader                  |
| ---------------------------- | ---------- | ------------------------------------- |
| aus den Augen, in der Brille | sichtbar   | unsichtbar                            |
| von oben                     | unsichtbar | sichtbar, und eines wird durchsichtig |

Das Ghosting bleibt dabei **Zeile für Zeile, wie es war** — es läuft ja nur in
der Ansicht, in der wieder jeder Quader für sich dasteht. Und wie beim
Grundriss gilt: Körper, Abtastliste und jeder Strahl arbeiten unverändert
weiter, weil three beim Abtasten keine Sichtbarkeit prüft. Anders als dort
bekommen diese Quader ihren **Saum** (`outlineShell`) aber behalten: Sie kommen
von oben wieder zum Vorschein, und dann brauchen sie ihn. Er hängt als Kind an
ihnen und ist unsichtbar, solange sie es sind.

Zwei Sorten bleiben wieder außen vor, dieselben und aus denselben Gründen wie
beim ersten Bündel: **Portalflächen** und **Türblätter**. Die beiden Listen sind
ausdrücklich komplementär — was in das eine Bündel darf, darf nie in das andere,
und ein Test rechnet genau das nach.

Gemessen, aus derselben Pose in der Küche mit Blick auf die Strecke:

|                                            | Runde eins | Runde zwei |
| ------------------------------------------ | ---------- | ---------- |
| Zeichenaufrufe je Bild                     | 666        | **383**    |
| davon Hauptdurchgang                       | 414        | 262        |
| davon Schattendurchgang                    | 243        | 121        |
| **in der Brille** (Hauptdurchgang je Auge) | 1 071      | **645**    |
| Dreiecke je Bild                           | 90 537     | 90 098     |
| sichtbare Meshes                           | 669        | 444        |

**Die Dreiecke bleiben diesmal gleich.** In der Runde davor kamen beim Bündeln
neunzehntausend dazu, weil ein Bündel als Ganzes ausgesiebt wird oder gar nicht
— der halbe Boden hinter dem Rücken wurde mitgezeichnet. Bei den Wänden fällt
das weg: Sie stehen ohnehin über das ganze Gelände verteilt, es gab also nichts,
was vorher weggesiebt wurde.

**Und was kostet es?** Von oben nichts und alles: Die Ansicht am Bildschirm
zeichnet weiter jede Wand einzeln und hat nichts gewonnen. Das ist die
Entscheidung — sie ist die Ansicht, die das Ghosting braucht, und sie läuft auf
einem Rechner und nicht auf einer Brille.

## Wer sagt, dass er keinen Schatten wirft, wirft keinen

`applySceneQuality` läuft über die ganze Szene und schaltet an jedem
undurchsichtigen Ding `castShadow` ein. Das ist für fast alles richtig — ein
Mesh kommt mit `castShadow = false` auf die Welt, das ist die Voreinstellung von
three.js, und dass es trotzdem einen Schatten wirft, ist der Sinn dieses
Durchlaufs. Es war nur zu grob: Wer am Modell ausdrücklich `castShadow = false`
schrieb, bekam es beim nächsten Durchlauf wieder auf `true` gesetzt. Der
aufgemalte Pfeil auf einem Laufband sagt seit jeher, dass er keinen Schatten
wirft — ein Pfeil ohne Dicke, dessen Schatten ein schwarzes Blatt wäre —, und
gehört hat es niemand.

Gesagt wird es deshalb jetzt dort, wo es gelesen wird: `denyShadow(mesh)` in
`core/graphicsScene.ts`, dieselbe Bauart wie `denyOutline` für die Kontur.

Wofür man es braucht, außer für aufgemalte Pfeile: **Kästen, die genau
übereinanderstehen, werfen zusammen den Schatten des breitesten.** Ein Laufband
der Küche ist Korpus, Platte und Trog auf einer Kachel von einem Meter; die
Platte ist die breiteste und liegt zwischen den beiden anderen. Drei Werfer
waren drei Zeichenaufrufe je Kachel für ein Bild, und die beiden Bänder der
Küche waren damit **45 von 243** Aufrufen im Schattendurchgang. Jetzt sind es
zehn.

## Zwei Zahlen, die man einmal kennen sollte

Die erste erklärt, warum Zeichenaufrufe hier härter zählen als anderswo:

> **In der Brille wird der Hauptdurchgang zweimal gezeichnet.** three.js hat für
> den WebGL-Renderer kein Multiview; `renderer.xr` zeichnet die Szene je Auge
> einmal. Der Schattendurchgang läuft dagegen **einmal** je Bild
> (`GraphicsQuality`: `shadowMap.autoUpdate = false`, `needsUpdate` genau einmal
> je Bild), und Spiegel und Portalsichten ebenso. Wer eine Zahl aus
> `renderer.info` liest, rechnet für die Brille also _Hauptdurchgang × 2 +
> Schatten_.

Die zweite erledigt eine ganze Klasse von Vermutungen:

> **Die Spielschleife ist nicht das Problem.** Abschnittsweise gemessen
> (`performance.now()` um jeden Abschnitt von `App.step` und
> `PortalWorld.update`) kostet in der Testwelt alles außerhalb des Zeichnens
> zusammen **rund 1,4 ms je Bild** — `world.update` 0,99, die Physik 0,19, alle
> zehn Zonen zusammen 0,15. Bei 72 fps stehen 13,9 ms zur Verfügung. Wer hier
> optimiert, optimiert das Zehntel; das Bild liegt im anderen.

## Die Messstrecke der Küche — und wer die Aufrufe verbraucht

Die Messstrecke für die **Bildrate** (`npm run fps`, `docs/quest3-referenz.md`)
beantwortet, was ein Regler kostet. Ihr offener Hauptposten heißt dort **M3**:
607 Zeichenaufrufe in der Testwelt, und die Küchenmöbel stehen im Verdacht. Wer
sie verschmelzen will, muss vorher wissen, **wer** die Aufrufe verbraucht — und
das steht in keiner Bildzeit. Dafür gibt es das Schwesterwerkzeug
`tools/perf-kitchen.mjs` (`npm run perf:kitchen`), mit derselben
Seitenvorbereitung: HMR abgeklemmt, Service Worker aus, Grafikeinstellungen
vollständig geschrieben, aus den Augen und nicht von oben.

Gemessen wird **dort, wo ein Koch steht** — `?at=kitchen#test` setzt die Füße
auf die Ankerkachel der Küche (13,5 / −23,5), also die Stelle, an der auch der
Grundrisstest misst —, und für zwölf Blickrichtungen je 30°: Die Aufrufe hängen
in dieser Welt kaum davon ab, wo man steht, sondern wohin man sieht.

**Die Augenhöhe der Brille gilt am Schreibtisch nicht.** `zones/kitchen.fitEyes`
staucht den Körper auf die 115 cm des Küchenblicks (`posture.DEFAULT_EYES`) nur
in einer XR-Sitzung; ein Browser ohne Brille steht mit 165 cm da. Das Werkzeug
setzt die Höhe deshalb für das Bild selbst, unmittelbar vor `render` — dort
entscheidet die Projektionsmatrix, was ausgesiebt wird. Dieselbe Stelle setzt
wahlweise ein Sichtfeld wie ein Auge der Quest (96° senkrecht, Seitenverhältnis
0,935); es kommt fast dasselbe heraus wie mit den 70°/16:10 des Bildschirms
(396 gegen 399 Aufrufe im Mittel), denn **waagerecht** sind beide ähnlich weit.

Gezählt wird, indem `renderBufferDirect` umhüllt wird — die eine Stelle, durch
die jeder Zeichenaufruf geht, im Haupt- wie im Schattendurchgang. Keine Zeile im
Spiel ändert sich dafür.

| Blick | Aufrufe je Bild | Hauptdurchgang | Schattendurchgang | Dreiecke |
| ----: | --------------: | -------------: | ----------------: | -------: |
| 0° (Norden) | 243 | 48 | 195 | 76 138 |
| 30° | 234 | 39 | 195 | 71 501 |
| 60° | 258 | 63 | 195 | 70 389 |
| 90° (Westen) | 327 | 132 | 195 | 81 833 |
| 120° | 460 | 265 | 195 | 93 071 |
| 150° | 473 | 278 | 195 | 94 721 |
| 180° (Süden) | 439 | 244 | 195 | 90 201 |
| 210° | 330 | 135 | 195 | 79 119 |
| 240° | 529 | 334 | 195 | 90 536 |
| 270° (Osten) | 543 | 348 | 195 | 90 072 |
| 300° | **558** | **357** | 201 | 96 557 |
| 330° | 391 | 190 | 201 | 86 919 |

Drei Sachen stehen in dieser Tabelle:

**Der Schattendurchgang ist blickfest.** 195 bis 201 Aufrufe, egal wohin man
sieht — er zeichnet aus der Sicht der Sonne und nicht aus der des Spielers. Im
Mittel über die Runde ist er **die Hälfte des Bildes** (196 von 399). Wer nach
Norden sieht, zahlt für den Schatten viermal so viel wie für das, was er sieht.
Das ist der Posten hinter **M4** in `docs/quest3-referenz.md`, und es ist die
Zahl, die dort fehlte.

**Zwei Drittel des Hauptdurchgangs sind sechs gebaute Maschinen.** In der
teuersten Richtung (300°, nach Osten in die Werkhalle) sind von 357
Aufrufen **226** der Kopierer, das Zugband, das Förderband, der Mixer, das
Filterband und der Kombinierer — und die zeichnen zusammen gut **3 000
Dreiecke**. Der Kopierer allein sind 60 Aufrufe für 500 Dreiecke, aus 9
Materialien und 10 Geometrien: Er ist aus fünf Dutzend kleinen Quadern gebaut,
und jeder einzelne ist ein eigenes `Mesh` mit eigenem Material. Dasselbe gilt
für alles, was `KitchenPiece.built` selbst zusammensetzt. **M3 zielt damit auf
die richtige Zone, aber auf die falschen Möbel:** Nicht die Stücke aus
`kitchen.glb` sind der Posten, sondern die gebauten.

**Die Möbel aus der Datei stehen trotzdem doppelt und dreifach im Bild.**
`counter` liefert in derselben Richtung 12 Aufrufe aus **einer** Geometrie und
**einem** Material — zwölfmal dasselbe Ding, zwölfmal einzeln gezeichnet.

Die vollständigen Ranglisten — je Objekt, je Material, je Netz — schreibt der
Lauf nach `.artifacts/perf-kitchen/<Zeitstempel>/`.

**Und die Rechenzeit?** Im selben Lauf hängt sich ein CPU-Profil an
(`Profiler.start` über CDP) und teilt die Bildschleife nach Aufrufern auf. Das
Ergebnis ist eindeutig und hat nichts mit der Küche zu tun: **Knapp 60 % der
JavaScript-Zeit außerhalb des Renderers stecken in
`Object3D.updateMatrixWorld`** — in dem einen erzwungenen Durchlauf, den
`PortalRenderer.render` vor
jedem Bild macht (`scene.updateMatrixWorld(true)`, acht Zeilen bevor geprüft
wird, ob überhaupt ein Portal gesetzt ist). **Das ist nicht dasselbe wie M2:**
Dort sind 2 764 unsichtbare Knoten stillgelegt worden, und sie kosten jetzt
keine Multiplikation mehr — durchlaufen werden sie weiterhin. Gezählt, nicht
geschätzt: Der Szenengraph hat nach M2 **6 556 Knoten** (4 740 Netze, 680
sichtbar), und er wird je Bild **zweimal** vollständig durchgerechnet — einmal
erzwungen von dort, einmal sanft von three selbst —, dazu kommt ein drittes
`traverseVisible` für die Spiegelsuche (`collectMirrors`, 7 % der Zeit
außerhalb des Renderers).

> **Zählwerte überträgt der Container ehrlich, Zeiten nicht.** Aufrufe,
> Objekte, Materialien und Dreiecke kommen aus dem Renderer und gelten
> unabhängig von der Grafikkarte darunter. Die Millisekunden nicht: Dort
> zeichnet SwiftShader in Software, und dort liegen 93 % der Bildschleife. Das
> Werkzeug trennt beides deshalb ausdrücklich und weist nur Anteile aus. **Aus
> diesem Lauf folgt keine Bildzeit und kein Prozentgewinn für die Quest 3** —
> dieselbe Falle wie bei den 34 % für Schatten aus.

**Was daraus geworden ist.** Zwei der drei Posten sind erledigt, der dritte ist
größer geworden, als er aussah:

1. **Der erzwungene Matrizenlauf ist weg, solange kein Portal steht**
   (`PortalRenderer.render`, `portalMatrixWalk.test.ts`). Aus zwei
   vollständigen Durchläufen über den Szenengraphen je Bild wurde einer.
2. **Der Kopierer ist von 44,3 auf 14,3 Zeichenaufrufe je Bild gefallen**
   (Mittel über die zwölf Richtungen, −68 %), und zwar aus zwei Gründen, die
   zusammengehören:
   - **Seine Zeichen warfen Schatten.** `castShadow = false` allein hält gegen
     `applySceneQuality` nicht — das schaltet sekündlich an jedem
     undurchsichtigen Netz den Schatten wieder an, außer an dem, das
     ausdrücklich `denyShadow` sagt. Zweiundzwanzig aufgemalte Rechtecke je
     Gerät standen deshalb im Schattendurchgang: 29 von 196 Aufrufen. Jetzt
     sind es 7. **Dieselbe Falle lohnt anderswo einen Blick** — wer
     `castShadow = false` schreibt und `denyShadow` nicht kennt, hat sie.
   - **Und sie sind jetzt je Farbe ein Netz** (`kitchenMerge.ts`,
     `DeskKit.joinPaint`): zweiundzwanzig Rechtecke werden sechs. Verschmolzen
     wird **je Material** und nur Aufgemaltes; Sockel, Glas, Wiege und die vier
     Pfosten bleiben einzeln, denn sie tragen und werfen Schatten. Die fünf
     Farben der Spur bleiben ebenfalls getrennt: Durch sie läuft das Licht.
3. **Und der große Posten steht noch** — er heißt aber nicht „verschmelzen",
   sondern **instanzieren**. Gezählt in der teuersten Blickrichtung: 357
   Aufrufe im Hauptdurchgang aus nur **113 verschiedenen Paaren aus Geometrie
   und Material**. Dieselbe Kiste steht dreiundzwanzigmal da (die Quader der
   elf Zugbänder), derselbe Tresen zwölfmal — und jedes Mal einzeln gezeichnet.
   Innerhalb **eines** Möbels ist da nichts mehr zu holen: Ein Band besteht aus
   vier Netzen mit vier Materialien. Der Gewinn liegt **zwischen** den Möbeln,
   und das ist genau die Rechnung, die `grid/gridBatch.ts` für die
   Bodenkacheln schon macht — eine `InstancedMesh` je Paar. Der Haken ist auch
   derselbe wie dort: Ein Möbel, das man aufnimmt und woanders hinstellt
   (`kitchenCarry.ts`, `kitchenBuild.ts`), muss aus dem Bündel heraus und
   einzeln weiterleben.

Gemessen nach den ersten beiden: **399 → 379 Aufrufe je Bild** im Mittel, der
Schattendurchgang von 196 auf 176. Der Rest liegt in Posten 3.

## Und eine Tafel malt sich nicht neu, wenn dasselbe daraufsteht

`TextPlane.setText` prüft seit dem Umbau, ob sich Überschrift, Text oder Akzent
überhaupt geändert haben, und tut sonst nichts. Eine Tafel neu zu beschriften
heißt, eine Leinwand von einem halben Megapixel neu zu malen und die Textur
daraus ein weiteres Mal auf die Grafikkarte zu schieben — und die Aufrufer
schreiben meistens dasselbe hin, was schon dasteht: Die Rundentafel der
Kartzone ruft viermal je Sekunde, ob jemand fährt oder nicht, und eine Runde
dauert eine halbe Minute. Der Gedanke stand vorher schon bei einem einzelnen
Aufrufer (`Kart.setTaken`); jetzt steht er an der Stelle, an der ihn nicht
jeder Nächste noch einmal haben muss.
