# Bauen

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

## Der Konstrukt-Raum

**Ein weißer Raum, in dem man aussucht** (`worlds/shared/construct.ts`) — der
Raum aus _Matrix_, und zwar nur für den, der ihn betritt. Wer vor dem
**Kleiderschrank** oder vor dem **Computer-Tisch** der Küche steht und `A`
drückt, sieht die Welt um sich her verblassen: Ein Kachelboden kommt herauf,
alles andere verschwindet, und nur der Gegenstand selbst bleibt stehen. Um die
Figur herum fahren die Stücke zur Auswahl aus dem Boden — Kleidung am Schrank,
Möbel am Rechner. Zurück geht es über denselben Gegenstand.

**Der Körper bleibt dabei in der alten Welt stehen**, und das ist keine
Kulisse, sondern die Bedingung, unter der das Ganze überhaupt geht. Draußen
steht die Figur weiter dort, wo sie stand, und die anderen im Raum sehen sie
dort — sie sehen nur nicht, dass die gerade in einem weißen Nichts ihre Hüte
sortiert.

**Herumgehen darf man trotzdem**, und seit September 2026 geht das auch: Ein
Regal, um das man nicht herumgehen kann, ist ein Schaufenster. Drei Dinge
zusammen machen daraus einen abgeschnittenen eigenen Raum
(`GridWorld.syncConstructBody`):

- **Die Stelle wird gemerkt** (`constructHome`, gemessen mit
  `PortalWorld.playerFeet`: waagerecht der Kopf, senkrecht der Boden des Rigs)
  und beim Verlassen über `movePlayerTo` **ohne Winkel** wieder gesetzt — die
  Füße landen exakt dort, die Blickrichtung bleibt die, in die man gerade
  sieht. Ein Ruck der Kamera ohne Anlass wäre das Gegenteil von Komfort.
- **Der Körper geht durch alles hindurch** (`PhysicsLocomotion.ghost`): keine
  Kollisionen, keine Schwerkraft, kein Boden, und die **Kapsel bleibt stehen**,
  wo sie war. Das ist der Unterschied zu `setFlight`, das ausdrücklich an
  Wänden anhält. Ohne das lief man im leeren Weiß gegen die Küchenzeile, die
  man gerade nicht sah — die Welt ist ja nur **ausgeblendet**, ihre
  Kollisionskörper stehen weiter.
- **Die Pose im Netz bleibt am Anker** (`NetSession.poseAnchor`): Kopf und
  beide Hände werden um denselben Versatz zurückgeschoben, gerechnet gegen
  dieselbe Kopfmatrix, aus der die Pose entsteht. Verschoben, nicht
  eingefroren — die anderen sehen eine Figur, die dasteht und sich umsieht,
  statt einer Statue. `hidden` wäre das Falsche gewesen: Das macht den Avatar
  bei den anderen ganz unsichtbar.

**Der Möbelkatalog kennt seit dem Umbau Grundflächen.** Vorher bekam jedes
Stück genau **eine** Kachel und wurde auf 0,8 m längste Kante gestaucht —
nebeneinander sahen ein Mülleimer und eine zwei Kacheln breite Ausgabetheke
damit gleich groß aus, und die Frage, für die man den Katalog aufmacht (passt
das noch neben das da?), war aus dem Bild verschwunden. Drei Dinge zusammen
räumen das ab:

- **`ConstructItem.tiles`** sagt, wie viele Kacheln ein Stück belegt, und
  `tileSlots` teilt ihm ebenso viele zu: nebeneinander auf **derselben**
  Ringseite (über Eck stünde ein Möbel im Knick) und nach **außen** in die
  Tiefe (innen ist der Platz, auf dem man steht). Zwei Ringe stehen zwei
  auseinander, also passt ein zwei Kacheln tiefes Stück dazwischen.
- **Ein Maßstab für alle** (`MINI_SIZE`, jetzt ein Faktor und keine
  Zielgröße): Was im Spiel doppelt so breit ist, ist es auch im Regal.
- **Ein Schild vor jedem Stück**, unten an der zur Mitte zeigenden Kante
  (`shared/showPlate.ts`, dieselbe Tafel wie in den beiden Schauräumen). Bis
  dahin stand der Name nur in `usePrompt` — und den zeigt seit dem Umbau der
  Bedienung niemand mehr an (`core/usable.ts`): Wer vor sechsundzwanzig
  Miniaturen stand, musste raten, welche davon das Filterband ist.

**Und der Katalog hat die beiden Schauräume abgelöst.** Östlich der ersten
Küche stand siebzehn Kacheln breit jedes ihrer Möbel noch einmal einzeln,
östlich des Restaurants auf vierundvierzig Kacheln jedes der 156 Stücke des
zweiten Baukastens — beide beschriftet, beide zum Abgehen. Das war die richtige
Antwort, solange es diesen Raum hier nicht gab: Ein Katalog, durch den man
**läuft**, ist besser als gar keiner. Seit man mitten in ihm steht und jedes
Stück in Reichweite hat, ist er der schlechtere, und zwei Kataloge nebeneinander
sind einer zu viel. Die beiden Zonen sind im September 2026 auf ihren
bespielten Teil geschrumpft (`worlds/test/layout.ts`: `KITCHEN` von 37 auf 20,
`DINER` von 69 auf 24 Kacheln Breite) — und die zweite Küche ist seither ganz
gegangen; geblieben ist ihr Katalog im Konstrukt-Raum.

**Und der Katalog zeigt den Katalog.** Vorher stand vor der Schleife ein Filter
auf `this.models` — gezeigt wurde nur, wovon beim Aufbauen der Küche schon eine
Vorlage angefallen war. Das ging gut, solange der Schauraum jedes Stück genau
einmal aufstellt (ein Test hält das fest), koppelte den Katalog aber an den
**Aufbau** statt an den Katalog: Wer ein Möbel eintrug, ohne es irgendwo
hinzustellen, fand es hier nicht wieder. Jetzt holt sich die Miniatur ihre
Vorlage selbst, wenn sie fehlt, und der Raum ist ohne Zutun aktuell.

Und der Raum hört an seinem Boden auf (`ConstructRoom.keepInside`, eine halbe
Kachel hinter der letzten Fuge): Ohne Schwerkraft und ohne Kollisionen hielte
einen sonst nichts davon ab, in ein weißes Nichts ohne jedes Merkmal zu laufen.

**Versucht wurde es zuerst andersherum**, mit `PlayerRig.locked`: Wer drinsteht,
soll sich gar nicht bewegen können. Das hielt aber nur in der **Brille** —
`locked` schaltet dort Stock, Sprung und Drehung ab (`PlayerRig.update`, alle
drei Prüfungen stehen in `if (presenting)`), und am Bildschirm wie am Telefon
läuft die Figur über `FlatControls.setIntent` daran vorbei. Man lief also doch,
und zwar gegen unsichtbare Wände, und stand beim Verlassen woanders.

Wer stattdessen in eine **eigene Szene** teleportierte, müsste drei Fragen
selbst beantworten: den Rückweg, den Verbindungsabbruch mittendrin und die, wo
die anderen die Figur solange sehen. Ein Raum, der die Welt **ausblendet**,
statt den Spieler wegzuschicken, braucht keine zweite Szene und keinen zweiten
Spielerkörper — im Netz kostet er **ein** Feld (`poseAnchor`) und keinen
zweiten Kanal. Er ist damit auch rein lokal:
Nichts daran wird geteilt, nichts daran gehört in einen Spielstand. Er ist eine
**Ansicht** und kein Ort.

**Die Sperre folgt dem Raum und nicht dem Handgriff**
(`GridWorld.syncConstructLock`). Es gibt zwei Wege hinaus, und nur einer geht
über `leaveConstruct`: Ein Stück, dessen Griff `true` meldet — der Möbelkatalog
am Rechner tut das, das Kleiderregal nicht —, schließt den Raum **von innen**
(`ConstructRoom.update`). Wer die Sperre nur beim ausdrücklichen Verlassen
löste, ließe nach so einem Griff eine Figur zurück, die sich nicht mehr von der
Stelle bewegt, und niemand fände den Grund dafür. Also wird sie jedes Bild
nachgezogen: Der Raum sagt, ob er offen ist, und die Sperre richtet sich danach.

**Verblasst wird einmal beim Betreten und nicht je Bild.** Der Raum läuft den
Weltbaum einmal ab, sammelt die Materialien ein, merkt sich `transparent`,
`opacity` und `depthWrite` und stellt sie beim Verlassen genau so wieder her.
Ein Durchlauf durch ein paar tausend Knoten kostet mehr, als ein Bild in der
Brille übrig hat (11 ms bei 90 Hz für alles zusammen), und er brächte nichts:
Was während der halben Sekunde Überblendung dazukommt, gehört zur Welt, die
gerade verschwindet. Vor allem aber hängt an dieser Liste die
**Wiederherstellung** — eine Liste, die sich je Bild ändert, verliert genau die
Materialien, die schon auf halber Deckkraft stehen, und die bleiben dann für
immer durchsichtig.

**Was sich Anker und Welt teilen, bleibt unangetastet.** Was vom Anker aus
erreichbar ist, kommt gar nicht erst in die Liste, auch wenn es sein Material
mit der halben Welt teilt: Ein geteiltes Material gehört in dem Fall beiden, und
die Welt mitzunehmen hieße, den Anker mitzunehmen. Sonst verblasste der Schrank
mit, vor dem man steht.

**Unten angekommen wird geräumt.** Ein Material auf Deckkraft 0 bleibt in der
Sortierung der durchsichtigen Dinge hängen, und die kostet je Bild mehr als der
ganze Raum: Der Renderer sortiert sie nach Tiefe, zeichnet sie in eigener
Reihenfolge und kann nichts davon wegwerfen. Unsichtbar ist billiger als
durchsichtig, also gehen am Ende der Überblendung die flachsten Äste, die den
Anker nicht enthalten, auf `visible = false` — und gemerkt wird, ob sie vorher
überhaupt zu sehen waren: Ein Möbel, das die Welt aus eigenen Gründen versteckt
hält, darf beim Verlassen nicht plötzlich dastehen.

**Der Anker wird nicht umgehängt.** Ihn in die Bühne zu hängen wäre eine Zeile
und kostete drei: Er verlöre seinen Platz im Baum und damit seine Weltmatrix,
sein Kollisionskörper (`physics/`) bliebe zurück, und wer ihn zwischendurch
sucht — Editor, Strahl, Nachbarzone — fände ihn woanders. Stehen lassen und beim
Ausblenden übergehen kostet nichts davon. Beim Kleiderschrank ist der Anker die
Gruppe des Einbaus, also die beiden Türen mit dem Spiegel; sein Korpus steht in
`view.solids`, gehört damit der Welt und verblasst mit ihr.

**Eine halbe Sekunde, hin wie zurück** (`FADE_SECONDS`). Lang genug, dass man
den Übergang als Übergang sieht und nicht als Bildfehler, kurz genug, dass
niemand auf ihn wartet — wer zehnmal hintereinander in den Schrank sieht, wartet
sonst zehnmal. Gemalt wird aus Phase und Uhr, ohne eigenes Gedächtnis: `open01`
ist der einzige Fortschritt, den es gibt, 0 ist die Welt und 1 ist das
Konstrukt, und Boden, Deckkraft und Welle hängen alle daran. Damit ein
Übergang, den man mittendrin umdreht, auch wirklich nicht kaputt aussieht,
**übernimmt das Verlassen den Stand** und stellt die Uhr nicht auf null: Beim
Hineinblenden ist `open01` gleich `clock / FADE`, beim Hinausblenden
`1 − clock / FADE` — eine Uhr, die dabei zurückgesetzt würde, spränge erst auf
*ganz offen* und blendete von dort zurück. Wer zweimal kurz hintereinander
drückt, und das tut jeder, der sich verdrückt hat, sähe die Welt einmal ganz
verschwinden, bevor sie wiederkommt. Hinein kommen die Stücke
als **Welle** (`RISE_STAGGER`, 0,04 s je Stück), hinaus alle zusammen: Nach
einer halben Sekunde ist die Welt wieder da, und ein Stück, das dann noch
versinkt, versinkt im Küchenboden.

**Und der Raum bringt sein eigenes Licht mit** (`ConstructRoom.buildLight`).
Das ist kein Schmuck, sondern ein behobener Fehler: Die Lichter einer Welt
hängen als oberstes Kind in ihrer Gruppe (`shared/environment.createLighting`),
und `hideList` blendet genau solche Kinder aus. In three.js zählt ein Licht mit
`visible = false` in keiner Lichterliste mehr — im Konstrukt stand damit eine
Auswahl aus `MeshStandardMaterial` ohne eine einzige Lampe, also **schwarze
Scherenschnitte** auf weißem Boden. Geliehen wird das Licht sich deshalb nicht
zurück, es wird mitgebracht: eine Hemisphäre und ein gerichtetes Licht von
schräg oben vorn, ohne Schatten, an der Bühne und nicht an der Welt. Damit
zeigt dieselbe Mütze im Dunkelhaus dasselbe wie in der Küche — eine Anprobe,
deren Farbe von der Welt abhinge, ist eine, der man nicht trauen kann. Sie
fahren mit der Deckkraft herauf, damit die verblassende Küche nicht kurz
doppelt beleuchtet dasteht, und gehen mit der Bühne wieder aus.

**Der weiße Boden: zwei Netze für 225 Kacheln und keine 225.** Sieben zu jeder
Seite (`FLOOR_TILES`) sind fünfzehn mal fünfzehn Kacheln, also ein Quadrat von
15 m — weit genug, dass der Rand in der Brille am Bildrand liegt und nicht vor
den Füßen, und klein genug, dass der Boden nicht so tut, als könnte man darauf
spazieren gehen. Ein Netz je Kachel wären 225 Zeichenaufrufe, in der Brille 450;
es ist deshalb ein `InstancedMesh` mit einer geteilten Kachelfläche und
**einer** dunklen Platte darunter, die durch die Fugen zu sehen ist. Die Fuge
wird also nicht gezeichnet, sondern freigelassen — das spart die Textur, und
eine Textur bräuchte eine Leinwand, die es im Testlauf nicht gibt. Beide Netze
sind `MeshBasicMaterial`: Das Konstrukt hat kein Licht und soll auch keins
haben, das Weiß ist die Aussage und nicht die Beleuchtung. Und der Boden hält
**keinen Strahl** auf; einer, der es täte, wäre das Erste, was `A` findet, und
man meinte nie wieder ein Stück.

**Jedes Stück steht auf einer Kachel** (`tileSlots`) — reine Rechnung, damit
ein Test nachmessen kann, dass wirklich keines davon neben dem Boden im Nichts
steht oder in einem anderen. Bis September 2026 hingen sie stattdessen in zwei
Bögen in Armlänge vor der Figur, in drei Höhen übereinander. Das war für einen
Raum gedacht, in dem man sich nicht umsieht und nicht hingeht — und es sah aus,
wie es gemeint war: Möbel, die in der Luft schweben, über einem Kachelboden, auf
dem nichts steht. Ein Kachelboden, den nichts benutzt, ist ein Kachelboden zu
viel.

Das Muster ist ein Ring um den **Anker** (`C` ist er selbst, `x` ein Stück, `o`
eine freie Kachel):

```
xxxoxxx
xooooox
xooooox
oooCooo
xooooox
xooooox
xxxoxxx
```

Zwei Kacheln um den Anker bleiben frei (`TILE_CLEAR`) — er ist selbst so groß
wie ein Möbel, und ein Regal, das ihm auf die Pelle rückt, verdeckt ausgerechnet
den Weg zurück. Dann kommt der erste Ring, **bis auf die Kreuzmitte**: Die vier
Kacheln genau vor, hinter, links und rechts vom Anker bleiben leer, und damit
bleiben vier Gassen offen, durch die man von der Mitte aus bis nach draußen
sieht. Zwanzig Stücke fasst dieser Ring — genug für die siebzehn Kleidungsstücke
dieses Projekts, und seit der Werkhalle **nicht** mehr für den Möbelkatalog:
Der hat sechsundzwanzig Stücke, und die letzten sechs gehen in den nächsten Ring
**zwei** Kacheln weiter draußen. Ein Ring direkt hinter dem anderen stünde in
dessen Lücken und wäre von der Mitte aus halb verdeckt. Reicht
der ausgelieferte Boden dafür nicht, wächst **der Boden** (`floorTilesFor`) und
nicht der Abstand — ein Stück neben dem Boden ist genau der Fehler, den dieser
Umbau beheben sollte.

**Der Boden rastet dafür auf dem Kachelgitter der Welt ein**
(`ConstructRoom.centre`). Die Mitte ist die Kachel, auf der der Anker steht, und
nicht die Stelle, an der die Füße stehen. Vorher war es umgekehrt, und man sah
es sofort: Der Kleiderschrank steht in der Welt mittig auf **seiner** Kachel,
ein Boden um die Füße herum liegt aber um jeden Betrag verschoben, den die Figur
gerade vom Kachelrand entfernt steht — und dann steht der Schrank quer über
vieren. Weil Weltgitter und Konstruktboden dieselbe Kachelgröße haben
(`nav/navTile.TILE`, 1 m), decken sie sich nach dem Einrasten vollständig.

**Und `A` reicht so weit, wie die Stücke stehen** (`ConstructRoom.reach`,
`PortalWorld.useReach`, `handUseRange`). Hingehen darf man, aber der Ring liegt
drei Kacheln weit draußen und geht einmal herum: Wer für jedes Stück, das er
sich ansehen will, erst drei Schritte und eine halbe Drehung macht, sieht sich
zwei an und hört auf. Der Raum ist ein **Schauraum** — man steht in der Mitte,
sieht sich um, und was man ansieht, kann man nehmen. Gerechnet wird die
Reichweite aus den Plätzen und nicht geraten, sonst wäre sie beim nächsten Ring
wieder falsch, und sie gilt am Schirm (Strahl aus der Brust) wie in der Brille
(Zeigen aus der Hand). Gefährlich ist sie nicht: Im Konstrukt ist außer dem
Anker und der Auswahl nichts mehr sichtbar, und was unsichtbar ist, steht gar
nicht erst zur Wahl (`PortalWorld.collectUsables`).

Der Zielzylinder je Stück ist damit **0,45 m** und nicht mehr 0,16 m: Die Stücke
stehen einen ganzen Meter auseinander, also darf die Trefferfläche fast bis an
die Fuge reichen — und wer aus vier Metern auf eine Kommode zielt, soll sie auch
treffen. Überlappen dürfen sich zwei Zylinder trotzdem nicht, sonst springt der
gelbe Saum (`core/highlight.ts`) beim kleinsten Kopfdrehen hin und her.

Gefüllt wird von innen nach außen und innerhalb eines Rings **von der
Blickrichtung aus nach beiden Seiten**: Das erste Stück steht dort, wo die Figur
nach dem Verblassen ohnehin hinsieht, das zweite daneben, und was hinter ihr
landet, kommt zuletzt.

Und jedes Stück sieht die Mitte an — **in Vierteldrehungen** (`slotTurn`): Ein
Regal, dessen Stücke alle in dieselbe Weltrichtung zeigen, zeigt der Figur die
Hälfte von hinten; eines, das den Winkel zur Mitte ausrechnet und hinschreibt,
stellt jedes Stück abseits der beiden Achsen **schräg auf seine Kachel**. Genau
das war hier zu sehen, und es sah aus wie eine Küche nach einem Erdbeben —
schlimmer noch: Ein schräg stehender Herd sagt nichts mehr darüber, wie er
später in der Küche steht, und dort gibt es nur vier Drehungen
(`test/zones/kitchenPlan.Turn`). Also gibt es hier auch nur vier, und genommen
wird die, die der Mitte am nächsten kommt. Auf den Diagonalen, wo zwei gleich
nah sind, gewinnt die Tiefe — sonst stünden zwei spiegelbildliche Kacheln nicht
spiegelbildlich, sondern die eine nach Süden und die andere nach Osten.

**Gebaut wird ein Stück erst, wenn es an der Reihe ist aufzufahren**
(`ConstructItem.object`, `ConstructRoom.raise`). Das ist die Antwort auf die
gemeldete Pause: Beim **ersten** Öffnen dauerte es spürbar, danach ging es
schneller. Siebzehn Avatarteile zu bauen kostet knapp eine Zehntelsekunde, und
achtzehn Miniaturen zu klonen kostet ähnlich — und das fiel bisher **ganz** in
das eine Bild, in dem der Raum aufging. Über die Auffahrwelle verteilt
(`RISE_STAGGER`, 0,04 s je Stück) ist es je Bild eines. Angemeldet wird ein
Stück im selben Atemzug, und auch das ist richtig so: `A` soll nur meinen, was
es sieht. Auf dem Rückweg entsteht gar nichts mehr — wer sich sofort wieder
verdrückt, baut nichts, was er nie zu sehen bekommt.

Dazu kommen zwei Zwischenspeicher, damit das **zweite** Öffnen gar nichts mehr
kostet: Das Kleiderregal baut jedes Stück genau einmal und lässt danach nur noch
den Reif wandern (`WardrobeRack.wear`), und der Möbelkatalog hält seine
Miniaturen fest (`KitchenZone.minis`). Beim Regal war das obendrein ein Leck: Es
baute je Öffnen siebzehn frische Geometrien samt Materialien, die niemand wieder
freigab.

**Zurück geht es über den Anker, und nur über ihn.** Alles andere ist unsichtbar
und meldet sich deshalb gar nicht mehr (`PortalWorld.collectUsables`) — der
Schrank dagegen verblasst ja nicht und ist damit der einzige Knopf, den es im
weißen Raum noch gibt. Heraus kommt man an genau der Stelle, an der man
hineingegangen ist; bewegt hat man sich nie. Macht ein Stück den Raum von innen
zu, geschieht das **ein Bild später**: `pick` läuft mitten in der
Auswahlschleife der Welt (`core/usable.ts`), und wer von dort aus Gegenstände
abmeldet, über die diese Schleife gerade läuft, räumt dem eigenen `pick` den
Boden unter den Füßen weg, bevor es zu Ende ist.

**Und es gibt genau einen Raum je Welt** (`GridWorld.construct`), nicht einen je
Schrank. Zwei offene Konstrukte hießen zwei Meinungen darüber, was gerade
sichtbar ist: Der zweite blendete die Welt ein zweites Mal aus, merkte sich
dabei die Deckkraft, die der erste gerade heruntergefahren hat, und stellte
später genau **die** wieder her. Er hängt deshalb an der **Welt** und nicht an
dem, was ihn aufmacht — der Kleiderschrank steht in der Startzone, die Möbel
stehen in der Küche, der Boden gehört der Welt, und eine Zone kennt von alledem
nur ihr eigenes Stück. Sie reicht ihre Auswahl herein und bekommt zurück, ob
gerade einer offen steht (`ZoneHost.enterConstruct`, `leaveConstruct`,
`inConstruct`); mehr braucht sie nicht, und mehr bekommt sie nicht. Entstehen
tut der Raum erst beim ersten Öffnen: Eine Welt, in der niemand vor einen
Schrank tritt, baut keinen Boden aus 225 Kacheln.

**Wem was gehört**, ist die zweite Entscheidung: Die Stücke zur Auswahl kommen
von außen und gehen beim Verlassen **unversehrt** zurück — der Raum hängt sie
aus dem Baum, gibt aber nichts frei. Was er selbst baut, gehört ihm und stirbt
mit `dispose`. Derselbe Schnitt wie beim gelben Saum, und aus demselben Grund:
Ein Raum, der fremde Geometrie entsorgt, fällt erst beim zweiten Betreten auf.
Beim Weltwechsel wird deshalb **erst herausgegangen und dann abgerissen** —
sonst bleibt eine Handvoll unsichtbarer Äste zurück, und das gesperrte Rig
überlebt den Wechsel.

**Geprüft wird das ohne Szene** (`shared/construct.test.ts`,
`shared/wardrobeRack.test.ts`): dass jeder Platz aus `tileSlots` auf einer
Kachelmitte und auf dem Boden liegt, dass zwei Kacheln um die Mitte und die
Kreuzmitte frei bleiben, dass die Ringe von innen nach außen füllen und der
Boden mitwächst, dass der Boden auf der Kachel des **Ankers** einrastet und
nicht auf den Füßen, dass `A` bis zum entferntesten Stück reicht und keinen
Meter weiter, dass die Stücke nacheinander entstehen und jedes genau einmal,
dass der Raum sein eigenes Licht anmacht und beim Verlassen wieder aus, dass er
an seinem Boden aufhört — und dass Unsinn (`NaN`, null Stücke) nichts ergibt.
Der kollisionsfreie Körper läuft dazu gegen echtes Rapier
(`physics/playerGhost.test.ts`: die Wand hält ohne ihn, hält mit ihm nicht, die
Kapsel bleibt stehen, und ein `resync` schaltet ihn ab), und der Anker im Netz
gegen einen Loopback-Transport (`net/poseAnchor.test.ts`). Das ist die Sorte Fehler,
die man in der Brille erst merkt, wenn man vor einem Stück steht, das man nicht
greifen kann.

## Bauen, während man darin steht

**Jede Gitterwelt lässt sich umbauen, ohne sie zu verlassen**
(`worlds/editor/WorldEditor.ts`). Das war einmal eine eigene Welt — der
**Bauplatz** —, und als erste Fassung war das richtig: Man probiert eine
Bedienung an einem Ort aus, bevor man sie überall hinhängt. Es war aber auch
die Antwort auf die falsche Frage. Die Frage lautet nicht _wo baue ich ein
Level?_, sondern _warum kann ich das Haus, in dem ich gerade stehe, nicht
umbauen?_ Wer beim Durchlaufen merkt, dass ein Gang zu eng ist, will ihn
**dort** verbreitern und nicht in einer zweiten Welt nachbauen.

Also hängt die Bedienung an keiner Welt mehr, sondern an einem **Grundriss**
(`grid/gridPlan.ts`) und an einem Wirt (`EditorHost`), der drei Sachen kann:
die Welt neu bauen, jemanden versetzen und etwas sagen. Jede Gitterwelt hat
beides und bekommt den Editor damit geschenkt (`grid/GridWorld.ts`,
`editable()`); gesagt haben es heute der **Bauplatz** und die **Testwelt**.

Vier Entscheidungen tragen das Ganze:

- **Der Plan ist der Navigationsgraph** (`editor/levelPlan.ts`). Kein zweites
  Datenformat: `has(key)` heißt „hier ist Boden", eine Wand steht zwischen zwei
  Kacheln, eine Tür ist eine Wand, die aufgeht — das führt `nav/navGraph.ts`
  ohnehin. Damit können NPCs sofort belaufen, was man baut, `nav/navSerial.ts`
  kann es speichern, und vor allem kann nichts auseinanderlaufen: Ein Editor,
  dessen Grundriss etwas anderes sagt als die Karte, ist einer, in dem man eine
  Tür einbaut und danach zusieht, wie ein Zombie hindurchgeht.
- **Gebaut wird aus einer Liste** (`editor/levelBuild.ts`, `grid/gridPlan.ts`).
  `solids()` macht aus dem Plan achsenparallele Quader — die Gegenrichtung von
  `navBake.ts`, und der Test prüft genau das: Was der Editor baut, muss das
  Abtasten wiederfinden. Miniatur und Lebensgröße kommen aus **derselben**
  Liste; zwei Bauanleitungen für dasselbe Zimmer laufen auseinander, und man
  merkt es an dem Tag, an dem eine Tür im Modell an einer anderen Wand hängt
  als im Raum.
- **Die Miniatur ist ein Gegenstand** (`editor/miniature.ts`): Standort,
  Drehung, Maßstab — und die Drehung ist seit der zweiten Fassung ein
  **Quaternion** und kein Gierwinkel mehr. Eine Hand **trägt** das Modell, samt
  allem, was das Handgelenk dabei tut; **zwei Hände** ziehen es größer,
  **kippen** und drehen es, in allen drei Achsen (Kippen aus der kürzesten
  Drehung zwischen alter und neuer Handverbindung, Rollen aus dem Anteil der
  Handdrehungen **um** diese Achse — ohne den zweiten Teil ließe sich ein
  Modell um genau die Achse nicht drehen, die man in den Händen hält). Nur
  fallen tut es nicht: Losgelassen bleibt es stehen, und genau deshalb hat man
  beim Bauen zwei Hände frei. Die eine Regel, ohne die sich jede Karte falsch
  anfühlt, steht dort als eine Zeile: **Der Punkt zwischen den Fingern bleibt
  liegen.** Gerechnet wird gegen den Stand beim Zugreifen und nicht gegen das
  letzte Bild — sonst liegt die Geste nach zwei Sekunden Zittern um zehn
  Prozent daneben. Dass ein Grundriss dabei schief hängen darf, ist kein
  Versehen, sondern der Zweck: Wer eine Wand von unten sehen will, kippt das
  Modell, statt sich darunter zu bücken. Gerade legt es _ein_ Griff wieder —
  „Zu mir" ist gleichzeitig die Wasserwaage.
- **Die Welt tritt zur Seite, solange die Karte draußen ist.** Ihre Quader
  werden unsichtbar und kommen aus der Physik heraus, und was in ihr
  herumliegt, hält still (`PhysicsWorld.setFrozen`). Drei Gründe, und jeder
  allein reicht: Ein Grundriss vor der Nase, hinter dem eine Wand steht, ist
  einer, den man nicht sieht — ein Zimmer ist ein geschlossener Kasten, und man
  steht darin. Wer eine Wand quer durch den Raum malt, in dem er steht, steckt
  sonst darin. Und eine Wand, die man nicht sieht, aber gegen die man läuft,
  ist schlimmer als eine, die im Weg steht — also gehören Sichtbarkeit und
  Körper zusammen. Was bleibt, ist der Boden bis zum Horizont, der Himmel und
  alles, was nicht aus dem Grundriss kommt; wo man selbst dabei steht, sagt die
  Figur in der Miniatur. **Fest wird das Gebaute beim Weglegen der Karte**:
  Dann werden die Quader mit Körpern neu gebaut und die Navigationskarte neu
  abgetastet, denn was man gebaut hat, sollen NPCs auch belaufen können.

**Ausgesucht wird an einer Palette** (`editor/Palette.ts`). Drei Antworten
standen zur Wahl, wie man in der Brille ein Bauteil aussucht: ein Menü (dreimal
Aufklappen je Wechsel — die Sorte Bedienung, nach der man aufhört zu bauen),
ein magischer Beutel (der gibt _Gegenstände_ heraus, einen nach dem anderen;
beim Bauen setzt man dasselbe zwanzigmal hintereinander) — und eine Palette mit
einem Pinsel: einmal eintunken, beliebig oft setzen, den Pinsel zurück in die
Mulde, wenn man fertig ist. Genau das ist der Rhythmus eines Kacheleditors.
Steckt der Pinsel in der Mulde, baut ein Tipp auf die Miniatur **nichts** —
dann darf man darin herumfassen, ohne aus Versehen eine Wand zu setzen.

**Werkzeuge sind vier, und der Radiergummi ist eines davon**: Boden, Wand, Tür,
Löschen. Was ein Druck tut, hängt an zwei Sachen — am Werkzeug und daran, worauf
man zeigt —, und diese Kreuzung steht an _einer_ Stelle (`applyTool`,
`applyGridTool`). Zwei Handgriffe daran sind eingebaute Nachsicht: Wer _Boden_
gewählt hat und auf eine **Kante** zeigt, baut die Kachel dahinter (so malt man
einen Raum von seinem Rand aus weiter, ohne die Mitte der nächsten Kachel zu
treffen); und wer _Tür_ auf eine freie Kante setzt, bekommt eine Wand mit einer
Tür darin statt einer Fehlermeldung.

**Und dann gibt es die zweite Reihe der Palette: die Bausteine**
(`grid/gridTool.ts`, `grid/blocks.ts`). Küchenzeile, Regal, Tisch, Bank, Kisten,
Säule, Geländer, Brüstung, Podest — eintunken, auf die Miniatur tippen, fertig.
Ohne sie ist ein Zimmer ein leerer Kasten mit einer Tür, und genau daran merkt
man beim Bauen _nicht_, ob ein Raum funktioniert. Zwei Regeln erklären das
Setzen ganz:

- **Was an eine Wand gehört, will eine Kante.** Küchenzeile, Regal, Bank,
  Geländer, Brüstung, Portaltafel: Die Kante, auf die man zeigt, ist
  gleichzeitig die Seite, an der sie stehen. Zeigt jemand auf die Mitte einer
  Kachel, sagt der Editor das — eine geratene Küchenzeile steht in drei von vier
  Fällen falsch herum, und man sieht es erst, wenn man davorsteht.
- **Was frei steht, nimmt die Kante als Blickrichtung.** Tisch, Kiste, Säule,
  Podest: Die Kachel entscheidet, _wo_ sie stehen, die Kante nur, _wohin_ sie
  schauen; wer auf die Mitte zeigt, bekommt Norden.

Die zwei Reihen auf der Palette sind kein Ordnungssinn, sondern die Reihenfolge,
in der man baut: erst der Grundriss, dann das, was darin steht. Wer eine
Küchenzeile in derselben Reihe suchte, käme beim Wandmalen aus Versehen daran.

Der Radiergummi räumt in der Reihenfolge auf, in der man es meint: **erst der
Baustein**, dann die Tür, dann die Wand, dann der Boden. Wer eine Küchenzeile
löschen will, will nicht den Boden darunter los.

### Malen und Flächen

**Ein Druck ist eine Kachel, und das ist die falscheste Bedienung, die es für
einen Boden gibt.** Für eine Tür ist sie richtig; für ein Zimmer von acht mal
acht Kacheln sind es vierundsechzig Trigger, und spätestens beim dreißigsten
hört man auf, Räume zu bauen, die größer als eine Stube sind. Zwei Gesten
nehmen das weg (`editor/planPaint.ts`), und beide kennt jeder aus jedem
Malprogramm:

- **Malen**: drücken, ziehen, loslassen. Was der Zeiger dabei überstreicht,
  wird gesetzt. Der einzelne Tipp ist dabei kein eigener Modus, sondern der
  kürzestmögliche Strich — wer einmal drückt und sofort losläßt, setzt genau
  eine Kachel und muss dafür nichts umgestellt haben.
- **Fläche**: zwei Ecken, und dazwischen wird gefüllt. Aufziehen und zweimal
  tippen sind dasselbe: Wer beim Loslassen woanders steht als beim Drücken, hat
  aufgezogen; wer auf derselben Kachel losläßt, hat getippt, und die Ecke
  wartet auf den zweiten Tipp. Aus der Ferne hält niemand den Arm für einen
  langen Zug ruhig, und wer nah davorsteht, will nicht zweimal tippen.

Drei Rechnungen stehen dahinter, und die dritte ist die, an der ein
Kacheleditor sonst scheitert:

- **Zwischen zwei Bildern darf keine Lücke bleiben** (`strokeSpots`). Eine Hand
  fährt in einem Sechzigstel leicht über drei Kacheln; wer nur die unter dem
  Zeiger setzt, malt gestrichelt. Gerechnet wird deshalb in Kachelschritten und
  nicht in Metern — zwischen zwei Kacheln liegt eine ganze Zahl von Kacheln.
  Die **Kante des Ziels gilt für den ganzen Strich**: Wer eine Wand entlang
  malt, zeigt auf Nordkanten, und sie aus jeder Zwischenkachel neu zu raten
  stellte an jedem zweiten Schritt eine Wand quer.
- **Was „füllen" heißt, hängt am Werkzeug** (`areaSpots`). Was auf eine
  **Kachel** gehört — Boden, Radiergummi, ein Tisch —, füllt die Fläche. Was an
  eine **Kante** gehört — Wand, Tür, Regal, Geländer —, zieht ihren **Rand**,
  nach außen gerichtet wie bei `wallRect`. Ein gefülltes Rechteck aus Wänden
  wäre ein Klotz aus Wänden; gemeint ist ein Zimmer. Damit ist ein Zimmer zwei
  Gesten: eine Fläche Boden, ein Rechteck Wände.
- **Die Ecke ist immer eine Kachel**, auch wenn der Zeiger auf einer Fuge lag.
  Ein Rechteck, dessen Ecke je nach getroffener Kante um eine Kachel springt,
  bekommt man nicht zweimal gleich hin.

Gehalten wird das vom Zeiger selbst (`core/Pointer.ts`): Neben `onSelect` gibt
es jetzt `onHold` — jedes Bild, solange die Taste unten bleibt — und
`onRelease`. Zwei Fallen stecken darin, und beide sind abgefangen: Ein Ziel,
das mitten im Ziehen **abgemeldet** wird (die Karte wandert an die Hüfte,
während der Finger noch am Trigger liegt), muss trotzdem sein Loslassen
bekommen, sonst malt der nächste Druck an dem alten Strich weiter. Und die
**Zeigefläche der Miniatur entsteht nur einmal** und wird beim Umbauen nur
nachgezogen — eine Fläche, die bei jeder gesetzten Kachel neu entstünde, nähme
dem Zeiger mitten im Strich sein Ziel weg, und der Strich wäre nach einer
Kachel zu Ende.

Im flachen Modus geht dasselbe mit der Maus: gedrückt halten und den Blick
schwenken. Dafür musste eine alte Ungereimtheit weg — mit gefangener Maus
(Pointer-Lock) friert der Browser `clientX/clientY` dort ein, wo er sie
gefangen hat, und der Strahl zeigte für den Rest der Sitzung dorthin, wo der
Mauszeiger beim ersten Klick zufällig stand. Jetzt zeigt er auf die Bildmitte,
also dorthin, wo auch das Fadenkreuz ist.

### Platz zum Weiterbauen

**Man muss neben alles zeigen können, was schon steht** — auch dorthin, wo noch
gar nichts ist. Der Teller unter dem Modell ist der Plan plus eine Kachel; die
**Fläche, auf die man zeigen kann, ist der Plan plus fünf** (`FIELD_MARGIN`),
und das Raster darauf zeigt genau, wo das ist. Ein Editor, in dem man nur an
vorhandene Kacheln andocken kann, ist einer, in dem man keinen zweiten Flügel
anbaut; und in einer Welt, in der an dieser Stelle noch nichts steht, ist es der
Unterschied zwischen bauen und nicht bauen können. Ein **leerer** Plan bekommt
denselben Rand als Ganzes — sonst hätte, wer bei null anfängt, nichts, worauf er
zeigen könnte.

**Ob eine Kachel oder ihre Kante gemeint ist, entscheidet ein Streifen**
(`spotAt`, 70 cm). Das ist die Rechnung, an der ein Kacheleditor steht oder
fällt: Die Mitte einer Kachel ist ein großes Ziel, ihre Kante eine Linie — und
eine Linie trifft man in der Brille auf drei Meter Entfernung nicht ohne Hilfe.

### Wo Karte und Palette hängen

**Der Gürtel hat zwei Haken, und der Bauplatz macht mit Absicht ohne Werkzeuge
auf.** Deshalb sucht sich der Editor beim Aufmachen die **freien** Haken: Hier
sind es beide, also hängt die Karte an der einen und die Palette an der
anderen, und man zieht sie mit dem Greifknopf heraus wie jedes Werkzeug. Wo
keiner frei wäre, hingen sie an gar keinem und schwebten vor einem, statt sich
zu verstecken — der Fall kommt seit dem Wegfall der Seite _Bauen_ aus dem
Handgelenkmenü nicht mehr vor (`GridWorld.editable`), die Vorsorge steht
trotzdem. Zwei Sachen an demselben Haken hieße, dass ein Griff dorthin eine von
beiden verschluckt, und welche, wüsste niemand.

**Man selbst steht mit im Modell** (`editor/PlayerPin.ts`). Eine Karte hat einen
Punkt „Sie sind hier", und weil man ihn anfassen kann, ist er gleichzeitig der
Weg dorthin: Figur nehmen, ans andere Ende des Gangs stellen, loslassen — dort
steht man. Auf eine Kachel, die es nicht gibt, geht niemand; dort wäre der
nächste Schritt ein Sturz. Gebaut ist sie in **Planmetern** und nicht in
Zentimetern: Sie hängt in der Miniatur, die trägt den Maßstab, und damit ist die
Figur bei jedem Zoom so groß wie ein Mensch im Grundriss.

Damit schweben drei Dinge in derselben Luft, und wer zugreift, greift irgendwo
hin. Die Vorfahrt steht in `editor/reach.ts` und ist **das nächstgelegene
gewinnt**, mit einer Reichweite am Ding statt am Griff: Die Figur hat eine
kleine, der Grundriss eine große. Ohne diese Regel hat jeder Editor denselben
Fehler — man will die Figur versetzen und schiebt den ganzen Grundriss weg, weil
das Modell größer ist und deshalb immer zuerst antwortet.

**Das Modell bringt sein eigenes Licht mit.** Eine kleine Lampe schwebt einen
halben Meter darüber, und sie hängt **neben** dem Modell in der Welt statt
darin: Ein Licht in einer Gruppe, die auf ein Zwanzigstel geschrumpft ist,
leuchtet auch nur ein Zwanzigstel weit. Sie muss sein, seit der Editor nicht
mehr nur im hellen Bauplatz steht — in einer dunklen Welt ist die Umgebung mit
Absicht fast schwarz, und ein Grundriss, den man nur mit der Taschenlampe lesen
kann, ist keiner.

**Das fünfte Werkzeug, das keines ist: Hingehen.** Auf eine Kachel der Miniatur
tippen und dort stehen. Es ändert nichts am Plan und steht deshalb neben den Werkzeugen und
nicht in ihnen — aber es ist der Griff, der aus einer Zeichnung eine Karte macht:
Wer den Gang am anderen Ende gebaut hat, muss ihn nicht ablaufen, um zu sehen, ob
er zu eng ist. Versetzt wird dabei über `PortalWorld.movePlayerTo` — Rig **und**
Kapsel, denn `rig.placeAt` allein verschiebt nur das, was man sieht, und die
Fortbewegung zieht einen im nächsten Bild zurück.

### Speichern, exportieren, importieren

**Eine gebaute Welt muss irgendwo hin**, sonst ist Bauen ein Zeitvertreib. Es
gibt dafür zwei Wege, und sie sind mit Absicht nicht dasselbe
(`grid/worldStore.ts`):

- **Der Speicher** (`localStorage`, ein Eintrag je Welt unter `vr-welt:<id>`)
  ist kein Archiv, sondern die Antwort auf eine einzige Frage: _Wer zwanzig
  Minuten baut und die Brille absetzt, soll seine Welt wiederfinden._
  Geschrieben wird beim **Weglegen der Karte** — das ist der Augenblick, in dem
  jemand fertig ist, und der einzige, an dem ein Schreiben weder sechzigmal in
  der Sekunde passiert noch zu spät kommt — und beim Verlassen der Welt, falls
  die Karte dabei noch draußen war. Der Bauplatz schreibt zusätzlich beim
  Bauen, höchstens alle zwei Sekunden: Dort baut man von Grund auf, oft eine
  halbe Stunde am Stück, ohne die Karte dazwischen wegzulegen.
- **Die Datei** ist das Archiv. Sie geht als Download vom Gerät herunter und
  über die Dateiauswahl wieder hinein, und sie ist das Einzige, was einen Umbau
  vom nächsten Browser, vom nächsten Rechner und von der nächsten
  Programmfassung trennt.

Beide schreiben **dasselbe Format**. Ein Speicher mit einem eigenen, kürzeren
Format wäre das zweite Format neben dem ersten, und das zweite Format ist
immer das, das eine Kleinigkeit vergisst.

Im Menü liegen die vier Handgriffe unter **Welt sichern**, und zwar ganz
oben — und nur im Bauplatz, denn nur dort wird gebaut (`GridWorld.editable`):
Speichern und Mitnehmen ist keine Fußnote unter den Werkzeugen, und eine Welt,
die man nicht ändern kann, hat auch nichts aufzuheben. Die erste Zeile heißt _Im Browser speichern_ und nicht „Welt
speichern" — so heißt schon der Knopf der Stoppuhr, und der merkt sich etwas
ganz anderes (wo die Kisten gerade liegen, für diese Sitzung). _Gespeichertes verwerfen_ leert den Eintrag **und** baut die Welt
im selben Augenblick aus ihrem `layout()` neu — das eine ohne das andere wäre
eine Welt, die erst beim nächsten Laden wieder die richtige ist, und bis dahin
fragt man sich, ob der Knopf kaputt ist.

**Was im Browser liegt, gewinnt** — und zwar ganz. Kein Verschmelzen mit
`layout()`: Ein halb übernommener Umbau wäre eine Welt, die weder die gebaute
noch die gespeicherte ist, und man sähe es erst an der Stelle, an der beide
sich widersprechen.

**Unter welchem Namen eine Welt liegt, sagt sie selbst** (`worldId()`,
abstrakt). Naheliegend wäre `ctx.net.world` gewesen — der steht beim Bauen aber
noch auf der _vorigen_ Welt (`App.loadWorld` setzt ihn erst nach `init`), und
zwei Welten, die sich still denselben Speicherplatz teilen, sind der Fehler, den
man erst bemerkt, wenn im Bauplatz plötzlich die Testwelt steht.

### Das Weltformat

**Eine Welt als Datei** (`grid/worldFile.ts`), Format `baumgartner-welt`,
Version **`0.3.0`**.

Bis hierher gab es zwei Hälften und keine Naht dazwischen. Der
Navigationsgraph hatte längst ein sauberes, versioniertes Format
(`nav/navSerial.ts`); alles andere, was eine Gitterwelt ausmacht, hatte keins.
Die **Bausteine** lagen als nacktes JSON daneben, ungeprüft und ohne Version,
und die **Massen** — das Dach über einer Halle, eine Felswand, der Sand
darunter — wurden überhaupt nicht gespeichert. Ein „gespeicherter Grundriss"
war deshalb genau so lange brauchbar, wie die Welt keine hatte.

Vier Entscheidungen tragen das Format:

- **Der Graph bleibt der Graph.** Die Weltdatei _enthält_ eine `nav`-Datei, sie
  ersetzt sie nicht. Damit erbt sie jede Prüfung, die dort schon steht
  (Kachelgröße, Version, Kachelläufe), und wer nur die Karte braucht, greift
  sich `nav` heraus.
- **Gespeichert wird der Grundwert, nicht das Ergebnis.** In den Kacheldaten
  eines laufenden Plans stecken die Aufschläge der Bausteine schon drin: Eine
  Küchenzeile macht ihre Kachel teurer. Wer diese Zahl speichert, sie beim
  Laden als Grundwert nimmt und die Bausteine danach anwendet, zählt jeden
  Aufschlag zweimal — nach dem dritten Laden ist die Küche unbegehbar. Also
  steht in `nav` der Plan **ohne** Möbel (`GridPlan.bare()`), und die
  Aufschläge werden beim Laden neu gerechnet (`GridPlan.restore()`). Ein Test
  fährt drei Runden und prüft, dass die Zahl dabei stehen bleibt.
- **Koordinaten sind Zahlen, keine Schlüssel.** Eine Kachel steht als `x`, `z`,
  `l` in der Datei und nicht als `TileKey`. Der Schlüssel ist eine gepackte
  Ganzzahl (`navTile.ts`), also ein Implementierungsdetail: Wer seine Packung
  ändert, macht damit sonst still jede gespeicherte Welt kaputt — und niemand
  sähe es, weil die Datei weiterhin gültig aussieht.
- **Die Version ist Semver, als Zeichenkette.** Solange die Hauptnummer `0`
  ist, gilt eine neue Nebennummer als Bruch — so liest man Semver vor 1.0.
  Gelesen werden die Zeilen `0.1.x`, `0.2.x` und `0.3.x`: `0.1` blieb lesbar,
  weil der Sprung auf `0.2` nur eine Liste hinzugefügt hat (die **Einbauten**),
  und `0.2` bleibt es, weil `0.3` nur ein **Feld** hinzufügt — den Fuß einer
  Treppenkachel (`y`, siehe unten). Eine fehlende Liste ist eine leere, ein
  fehlendes Feld eine Null. Andersherum gilt das nicht: Wer eine
  `0.3`-Welt in ein altes Programm lädt, verlöre ihre Treppen still.
  Eine Datei aus der Zukunft wird **abgelehnt** und nicht halb geladen, denn
  eine Welt, der beim Laden die Hälfte fehlt, sieht aus wie eine kaputte Welt
  und nicht wie eine zu neue. „Zu neu" und „zu
  alt" bekommen deshalb zwei verschiedene Meldungen: Sie sind das Einzige,
  woran jemand sieht, ob er ein Programm oder eine Datei aktualisieren muss.

**Ein Baustein hat seit `0.3` einen Fuß**, und er heißt `y`. Eine Treppe liegt
auf dem Metergitter über **mehrere** Kacheln, und jede einzelne weiß zwei
Dinge: wie viel sie steigt (`height`) und wie hoch über dem Etagenboden sie
anfängt (`BlockPlacement.lift`). Ohne die zweite Zahl läge ein gespeicherter
Lauf beim nächsten Laden flach auf dem Boden — vier Stufen nebeneinander statt
einer Treppe. Sie heißt in der Datei `y` und nicht `lift`, weil dort schon `x`
und `z` stehen und drei Buchstaben derselben Sorte sich leichter lesen als zwei
plus ein Wort; und sie fehlt bei null, denn das ist der Normalfall — jeder
Baustein, der nicht steigt, spart sie sich.

**Streng und nachsichtig an den richtigen Stellen.** Ein Baustein auf einer
Kachel, die es nicht gibt, fällt weg; eine unbekannte Baustein-Sorte fällt weg
(wer eine Welt aus einer neueren Fassung öffnet, will sein Haus sehen und nicht
eine Fehlermeldung über einen Schrank). Bei einem **Einbau** fällt die
unbekannte Art dagegen _nicht_ weg — sie hat eine Kennung, auf die andere
zeigen, und ein Tor, das beim Speichern verschwände, nähme jedem Knopf sein
Ziel; übersprungen wird sie erst beim Bauen, und dann mit einer Meldung. Bei
den **Massen** ist es andersherum: Dort wird abgebrochen. Ein fehlendes Dach ist
eine Welt, in die es hineinregnet, und eine fehlende Felswand eine, aus der man
hinausläuft.

Und noch ein Unterschied, der leicht als Schlamperei durchginge: Eine kaputte
Zeile im **Speicher** wird weggeworfen und nicht gemeldet — sie kommt aus einer
Fassung, die es nicht mehr gibt, niemand kann etwas daran tun, und die Welt
soll trotzdem aufmachen. Eine **Datei**, die jemand bewusst auswählt, meldet
jeden Fehler: Wer eine Datei auswählt, hat eine Erwartung, und ein stilles
Nichts wäre die schlechteste aller Antworten.

**Was bewusst nicht in der Datei steht**, damit niemand es sucht: Eine
Weltdatei ist ein **Grundriss** und kein Spielstand. Sie kennt Kacheln, Wände,
Türen, Verbindungen, Bausteine, Einbauten und Massen — alles, was `GridPlan`
führt. Sie kennt **nicht**, was eine Welt darüber hinaus von Hand hinstellt
(`buildProps`): die Lampen an den Türen, die Karts in der Boxengasse, die
Kisten zum Herumwerfen. Und sie kennt keine Farben — welchen Ton eine Wand hat,
entscheidet die Welt, in der sie steht (`GridWorld.tint`), und genau deshalb
sieht eine in den Bauplatz importierte Welt aus wie ein Bauplan und nicht wie
ein Haus. Das ist die Grenze, und sie ist gezogen und
nicht vergessen: Ein Format, das _alles_ speichert, ist eines, das bei jeder
neuen Lampe eine neue Version braucht.

Der **Dateiname** ist der Name der Welt plus das Datum plus `.welt.json` — die
doppelte Endung, damit ein Betriebssystem sie als JSON öffnet und ein Mensch
trotzdem sieht, was darin steht: `bauplatz-2026-09-07.welt.json`. Ein
Startzimmer wiegt so ein paar Kilobyte, das Gelände der Testwelt ein paar
Dutzend.

Ein Download und eine Dateiauswahl sind in der Brille wenig wert — man sieht
von beidem nichts. Sie sind für den Rechner gedacht, und das ist keine Lücke,
sondern die Arbeitsteilung: In der Brille wird gebaut, am Rechner wird
abgelegt und weitergegeben.

### Was der Bauplatz noch selbst macht

Von der Welt `editor/EditorWorld.ts` ist wenig übrig, und das ist ihr Erfolg und
nicht ihr Ende. Drei Sachen unterscheiden sie vom Umbauen einer fertigen Welt:

- **Sie fängt bei einem Zimmer an** (`starterGrid.ts`) und nicht bei einem Haus,
  das schon steht. Eine leere Ebene beantwortet die erste Frage nicht, die jeder
  hat — _wie sieht denn eine Wand hier aus?_
- **Er schreibt auch beim Bauen** und nicht nur beim Weglegen der Karte
  (`planEdited`, höchstens alle zwei Sekunden). Hier baut man von Grund auf, oft
  eine halbe Stunde am Stück und ohne die Karte dazwischen wegzulegen — und wer
  dabei die Brille absetzt, hätte sonst nichts. Alles Übrige am Speichern ist
  seit dem Weltformat für jede Gitterwelt dasselbe (_Speichern, exportieren,
  importieren_). Den **alten Eintrag** aus der Zeit davor (`vr-bauplatz-plan`:
  die nackte Karte plus Mobiliar, ohne Version und ohne Massen) liest er noch
  einmal, schreibt ihn im neuen Format und räumt ihn weg — wer zwei Wochen an
  einem Grundriss gebaut hat, verliert ihn nicht, weil das Programm inzwischen
  ein richtiges Format hat.
- **Beim Bearbeiten steht man in einem weißen Raum.** Wo eine fertige Welt nur
  zur Seite tritt, tauscht der Bauplatz seine Kulisse: Boden bis zum Horizont
  und ein weißer Himmel statt des dunklen. Der Grund ist derselbe wie beim
  Tischmodell — wer einen Grundriss von Grund auf zieht, steht nicht
  gleichzeitig darin. Beide Kulissen liegen von Anfang an übereinander da;
  umgeschaltet wird nur die Sichtbarkeit, und der Körper des dunklen Bodens
  trägt für beide. Zwei kleine Zahlen, die man sonst falsch macht: Der Boden bis
  zum Horizont liegt hier **zwei Zentimeter tiefer** als sonst, weil er sich mit
  den Bodenplatten des Plans sonst um jedes Pixel streitet; und die Mitte des
  Plans wandert beim Anbauen, weshalb `recentre` das Modell um genau so viel
  zurückschiebt — ohne das springt der Grundriss bei jedem Druck ein Stück zur
  Seite, und man baut ihm hinterher.

**Was noch fehlt**: Etagen (der Graph kann sie, der Editor zeigt nur die erste —
und damit fehlen auch die beiden Bausteine, die zwischen Etagen führen: Treppe
und Rampe), Rückgängig, Fenster als Werkzeug (gebaut werden sie längst, gesetzt
bisher nur von Welten in ihrem Grundriss), und ein Weg, eine **eigene** Welt aus
einer Datei zu laden statt sie in eine vorhandene zu importieren: Heute
überschreibt ein Import den Grundriss der Welt, in der man gerade steht, und wer
zwei gebaute Welten nebeneinander haben will, braucht zwei Wirte dafür.

Eine rauhe Kante gibt es dazu, und sie steht hier, damit sie niemand für einen
Zufall hält: **Der Greifknopf gehört beim Bauen zwei Herren.** Die Welt greift
weiter nach Requisiten (`PortalWorld`), der Editor nach Modell, Palette und
Figur — und wer in einer Welt mit Kisten mitten in der Miniatur greift, kann
beides auf einmal erwischen. Im Bauplatz fällt das nicht auf (dort liegt nichts
herum), anderswo ist es selten (die Requisiten sind beim Bauen eingefroren und
das Haus ist unsichtbar), aber es ist da. Der saubere Weg wäre, dass die Welt
ihr Greifen abgibt, solange die Karte draußen ist.
