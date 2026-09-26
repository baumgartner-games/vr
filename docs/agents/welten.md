# Welten, Kacheln, Portale und Spiegel

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

## Welten auf dem Kachelgitter

**Eine Welt beschreibt sich in Kacheln, nicht in Metern** (`worlds/grid/`).
Das ist die jüngste der großen Entscheidungen in diesem Projekt, und sie ist
aus einem Ärgernis entstanden, das lange als naturgegeben galt: Jede Welt stand
auf ihrer eigenen Handvoll `slab()`-Aufrufe — eine große Außenkarte hatte
siebzehn, ein Schießstand zwölf, eine Küche dreißig. Jeder einzelne ist eine
Zahl in
Metern, die niemand nachprüfen kann, ohne die Brille aufzusetzen — und genau
deshalb war eine große Welt nur am Stück zu testen, nie in Teilen.

**Eine Kachel misst einen Meter** (`nav/navTile.TILE`), und das ist die
Entscheidung vom September 2026. Vorher waren es 2,5 m — grob genug für eine
Karte mit ein paar hundert statt zehntausend Kacheln, und viel zu grob für die
Welten, die hier gebaut werden sollen: In einer Küche wie bei _Overcooked_
steht der Herd neben dem Spülbecken und nicht drei Schritte weiter, und eine Kachel,
in die ein ganzer Tisch **und** der Weg daran vorbei passen, kann so etwas
nicht beschreiben. Mit einem Meter ist eine Kachel das, was ein Mensch mit
einem Schritt überquert, und ein Grundriss liest sich in Metern, ohne dass
jemand mal zweieinhalb rechnet. Der Preis ist die Kachelzahl: Dieselbe Halle
hat sechsmal so viele. Das ist vertretbar, weil die Welten dafür kleiner
ausgelegt werden (der Hub misst elf mal elf Kacheln statt siebzehneinhalb
Metern) und weil die Wegsuche über ganze Zahlen läuft.

Daran hängen vier weitere Zahlen, und jede folgt aus der einen:

- **`PLAN_WALL_T` 0,2 m.** Die Wand steht auf der Kante, je zehn Zentimeter in
  beide Kacheln. Ein Gang von einer Kachel hat damit 0,8 m lichte Weite, und
  die Spielerkapsel misst 0,24 m im Halbmesser (`physics/playerClearance.ts`) —
  das reicht.
- **`PLAN_DOOR_W` und `PLAN_WINDOW_W` 0,8 m**: die Kachel minus zwei Pfosten.
  Türhöhe 2,1 m und Wandhöhe 2,8 m bleiben, wie sie waren.
- **Ein Baustein passt in eine Kachel.** Küchenzeile einen Meter lang und 0,6 m
  tief, Tisch 0,9 × 0,9, ein Kistenstapel aus zwei Kisten von 0,45 m. Die Regel
  ist nicht die Zahl, sondern der Satz: **nichts ragt über die Kachel**, und
  der Test misst es in allen vier Richtungen nach.
- **Der Autostep braucht eine Mindestbreite von 0,1 m**
  (`PhysicsLocomotion.enableAutostep(0.32, 0.1, …)`). Er stand auf 0,18, und
  das war der Grund, warum die Stufen der Straßenküche (0,19 m tief) klemmten:
  Der Character-Controller steigt zwar 0,32 m hoch, aber nur, wenn hinter der
  Stufe genug Platz zum Aufsetzen ist. Die Höhe war nie die Grenze, die
  **Tiefe** war es.

Vier Dateien, alle **ohne three.js**:

- **`grid/solids.ts` — der Quader.** Die einzige Form, in der hier gebaut wird:
  Mitte und Kantenlängen, dazu seine Sorte (Boden, Wand, Tür, Tafel, Holz,
  Stahl, Stein, Leuchten). Er hieß `PlanSolid` und gehörte dem Bauplatz; er
  heißt weiter so, gehört aber jetzt jeder Welt auf dem Gitter. Dazu die beiden
  Handgriffe, die vorher überall von Hand standen: an einer Kante bauen
  (`slab`), auf etwas stellen (`standing`).
- **`grid/blocks.ts` — die Bausteine.** Zwölf Stück: Küchenzeile, Regal, Tisch,
  Bank, Kisten, Säule, Geländer, Brüstung, Treppe, Rampe, Podest, Portaltafel.
  Ein Baustein ist genau das, was er bei Minecraft ist — **eine Kachel, eine
  Sorte, eine Blickrichtung** —, und mehr braucht niemand anzugeben.
- **`grid/gridPlan.ts` — der Grundriss.** Zimmer, Wände, Türen, Fenster,
  Bausteine und **Massen**. Der Plan _ist_ der Navigationsgraph
  (`nav/navGraph.ts`), also weiß ein NPC von der Küchenzeile, bevor er
  losläuft.
- **`grid/GridWorld.ts` — die Basis.** Sie baut den Plan, führt die gemeinsame
  Palette und entscheidet einmal für alle, woran ein Portal haftet — **und sie
  gibt jeder Gitterwelt den Bearbeitungsmodus** (`editor/WorldEditor.ts`, siehe
  _Bauen, während man darin steht_): Der Grundriss liegt ohnehin da, und der
  Editor kann nichts anderes, als daran zu arbeiten.

Vier Sachen sind daran wichtig, und drei davon merkt man erst hinterher.

**Gebaut wird nach Norden, gedreht wird danach.** Jeder Baustein steht in
seiner eigenen kleinen Welt: Ursprung in der Kachelmitte, Boden auf null, vorne
ist −Z. Erst `turned()` legt ihn in die Richtung, in die er zeigen soll. Das
ist der Unterschied zwischen zwölf Bausteinen und achtundvierzig Sonderfällen —
und vor allem der Grund, warum eine Küchenzeile an der Ostwand genauso aussieht
wie dieselbe an der Nordwand. Wer die vier Fälle einzeln schreibt, hat
irgendwann drei richtige und einen, bei dem die Arbeitsplatte in der Wand
steckt.

**Ein Baustein weiß, was er der Kachel antut.** Ein Podest hebt sie an
(`rise`), ein Tisch macht das Herumkommen teurer (`cost`). Kein „blockiert
ja/nein": Ein Tisch auf einer Kachel lässt daneben noch Platz — er ist nur der
Weg, den man nicht nimmt, wenn daneben einer frei ist. Beides landet im Graphen, und deshalb läuft ein NPC um den Tisch
herum und auf das Podest hinauf, ohne dass jemand die Karte von Hand
nachpinselt.

**Eine Masse ist der ehrliche Ausweg.** Nicht alles hat Kachelform: der
Kugelfang hinter den Scheiben, eine acht Meter hohe Kletterwand, der Boden
unter einem ganzen Gelände. `mass()` baut dafür **einen** Quader über ein Kachelrechteck —
grid-treu, weil seine Kanten Kachelkanten sind, aber eben einer statt tausend.
Beim Boden ist das keine Bequemlichkeit, sondern Pflicht: Jede Portalfläche
bekommt eine eigene Kollisionsgruppe, davon gibt es zehn
(`PhysicsWorld.ts`) — tausend portalfähige Bodenkacheln hießen, dass ein
Bodenportal nebenbei die Wand gegenüber aufmacht. Deshalb trägt ein Quader eine
Marke `portal`, und die setzt genau eine Fläche je Welt.

**Eine Treppe ist drei Sachen.** Der Baustein, das **Loch** in der Decke
darüber (sonst stößt man beim dritten Schritt mit dem Kopf an) und der **Weg im
Graphen** (sonst steht ein NPC unten und weiß nicht, dass es nach oben geht —
Stockwerke haben in diesem Gitter absichtlich keine Nachbarschaft). Wer die
dritte vergisst, hat eine Treppe, die man hinauflaufen kann und die für jeden
NPC nicht existiert; das sieht danach aus wie ein kaputter Character-Controller.
`GridPlan.stairs()` macht alle drei.

**Und sie ist länger als eine Kachel.** Auf 2,5-m-Kacheln passte ein ganzes
Stockwerk auf eine einzige; auf einem Meter wäre das eine Leiter mit Stufen von
sieben Zentimetern Tiefe — man bleibt an ihr hängen, und genau das war der
Vorwurf an die Treppe der Straßenküche. Also legt `GridPlan.stairs(x, z, dir,
level, length?)` den Lauf über **mehrere** Kacheln: `length` Kacheln, und ohne
Angabe so viele, wie der Anstieg bei **0,7 m je Kachel** braucht
(`STAIR_LIFT`) — bei 2,8 m Etagenhöhe also vier. Jede Kachel ist ein eigener
`stairs`-Baustein mit ihrem **Teilanstieg** (`height`) und ihrem **Fuß**
(`lift`, in der Datei `y`), im Graphen mit ihrer Feinhöhe (`rise = lift`) und
dem Loch über sich — über **jeder** Stufe, nicht nur über der ersten, sonst
stößt man auf halber Höhe an den Boden darüber. Verbunden wird erst die
**letzte**: Sie mündet auf der Kachel davor, und dort steht man auf der Etage
darüber.

**Die Stufen darin folgen aus zwei Grenzen und nicht aus einem Geschmack**
(`grid/blocks.ts`): höchstens **`STEP_RISE` 0,2 m hoch**, mindestens
**`STEP_RUN` 0,25 m tief**. Bei 0,7 m Anstieg je Kachel sind das vier Stufen
von 0,175 m auf 0,25 m — eine Treppe, die man hinaufgeht, ohne darüber
nachzudenken. Die **Rampe** (`ramp`) ist dieselbe Rechnung flacher: halb so
viel Anstieg je Kachel (`RAMP_LIFT` 0,35 m), halb so hohe Stufen, dafür doppelt
so lang.

Ein Treppenhaus wechselt dabei zwischen **zwei** Läufen hin und her: Alle
übereinander ginge nicht, weil jeder Lauf das Loch für seinen eigenen Kopf
schlägt — genau darin müsste der nächste stehen. **Und von oben ist sie die
vierte Sache**: Wer sie hinaufgeht, nimmt
auf halber Höhe die Ebene darüber mit ins Bild, und die darunter bleibt stehen
— eine Treppe ist der einzige Ort, an dem man beide Stockwerke gleichzeitig
sieht (`core/cutaway.ts`, siehe _Von oben: dieselbe Welt, eine Kamera_).

### Einbauten: was auf dem Gitter einen Zustand hat

Ein Baustein ist **still**. Das ist seine Stärke — eine Kachel, eine Sorte, eine
Blickrichtung, und daraus werden Quader —, und es ist genau die Grenze, an der
das Gitter lange aufhörte. Eine Tür ist halb offen, ein Knopf hat Nachlauf, eine
Platte ist gedrückt, solange eine Kiste darauf liegt, ein Tor führt in eine
andere Welt. Für all das gab es lange genau einen Ort, und der stand in Metern
neben dem Gitter statt darauf: das Interaktionslabor, von dem heute nur noch
die Türmathematik übrig ist (`worlds/interact/doorMotion.ts`). Wer in einer
Gitterwelt eine Tür wollte, baute sie noch einmal.

Seit P3 gibt es die zweite Sorte Ding auf der Kachel: den **Einbau**
(`grid/fixtures/`). Dieselbe Kachel, dieselbe Blickrichtung wie ein Baustein,
dazu eine **Art** (`sign`, später `gate`, `emitter`, `door`, `button`, `lever`,
`plate`, `lamp` und `wardrobe`), eine **Kennung** und ein paar
**Eigenschaften** (`target`, `hold`, `text`, …). Er steht im Grundriss, im Weltformat und in der Palette des
Editors — und `GridWorld` kennt dabei keine einzige Art beim Namen, sondern nur
die Registry.

**Eine Art ist fünf Handgriffe**, und die Trennung dazwischen ist der ganze
Zweck:

- `init` und `step` sind **rein**: kein three.js, kein Weltkontext, keine
  Physik. Sie schreiben einen Zustand fort und geben zurück, was dabei nach
  außen geht. Deshalb hat jede Art einen Test, der in Millisekunden läuft —
  die Türmathematik (`interact/doorMotion.ts`) wird importiert und nicht
  abgeschrieben.
- `solid` sagt, ob die Kachel gerade aufhält. Gefragt und nicht gespeichert:
  Eine Tür ist fest, solange sie zu ist, und das ist eine Ableitung aus dem
  Zustand und keine zweite Wahrheit daneben.
- `build` und `apply` sind das Bild — einmal bauen, jedes Bild den Zustand
  hineinschieben. Wer beides in einem machte, baute die Tür sechzigmal in der
  Sekunde neu.

**Ein Einbau kennt niemanden.** Er ruft nichts auf; er meldet **sechs** Sachen,
und `GridWorld` verteilt sie: `trigger` an eine Kennung, `goto` an den
Weltkontext (genau das, was das Hub-Tor tut), `sound` an `core/Audio`, `effect`
an eine Wolke an seiner Kachel (`effects/Burst.ts` mit den Zahlen aus
`effects/effectKinds.ts` — Tür-Staub beim Aufgehen, Funken, wenn eine Kugel
einen Knopf trifft, Rauch aus der Düse), `read` an eine **Menüseite** (siehe
_Das Schild ist ein Aushang_) — und `wardrobe` an `ctx.openWardrobe()`.
Das letzte ist das einzige **ohne Inhalt**, und das ist Absicht: Der
Kleiderschrank weiß nicht, wer davorsteht und was daraus wird, er weiß nur,
dass jemand ihn aufgemacht hat (siehe _Der Kleiderschrank und die Umkleide_).
Das ist der Unterschied
zwischen einem Knopf, den ein Test in
einer Millisekunde prüft, und einem, der eine Tür in der Hand hält. Und
**ausgelöst wird im nächsten Bild**: Die Ereignisse eines Bildes werden
gesammelt und danach zugestellt, sonst hinge es an der Reihenfolge einer Liste,
ob ein Knopf seine Tür noch in diesem Bild erwischt.

**Im Graphen zählt ein Einbau wie ein Baustein** — mit einer Ausnahme, und die
ist der Grund für den ganzen Umweg über den Plan. Was **fest** ist, macht seine
Kachel teuer wie eine Kiste; was eine **Tür** ist (`kind.door`), wird zur
Tür-Kante (`door(..., open)`) und nicht zu teurem Boden. Erst damit weiß ein NPC
von ihr, bevor er losläuft, und erst damit kann sich eine Meinung über sie irren
(`nav/navBelief.ts`). Ohne diesen Zweig hätte man eine Tür, die man selbst
aufdrücken kann und die für jeden NPC eine Wand ist.

**Die Kennung steht in der Datei und wird nicht neu vergeben.** Ein Knopf zeigt
über `props.target` auf eine Tür; eine Welt, die ihre Namen beim Laden
durchnummerierte, ist eine, in der nach dem Speichern die falsche Tür aufgeht.
Aus demselben Grund fällt eine **unbekannte Art beim Lesen nicht weg** (anders
als ein unbekannter Baustein): Sie bleibt in der Welt stehen und wird nur beim
**Bauen** übersprungen und gemeldet (`console.warn`). Ein Tor, das ein altes
Programm still verschluckt, nimmt jedem Knopf sein Ziel.

#### Das Schild ist ein Aushang

Das **Schild** (`fixtures/sign.ts`) war der erste Einbau und lange der
kleinste: eine Zeile an einer Wand, und wer `A` drückte, bekam sie als
**Meldung** am Handgelenk — vier Sekunden, dann war sie weg. Damit passte auf
ein Schild genau ein Satz. Ein Wegweiser mit drei Zielen, eine Hausordnung, die
Regeln eines Spiels passten nicht hinein.

Jetzt wird er **aufgeschlagen**: `step` meldet `read`, und `GridWorld` macht
daraus eine Seite im Weltmenü (`GridWorld.readAloud`, Zeilen aus
`fixtures/signRows.ts`). Am Bildschirm ist das ein Blatt von unten, in der
Brille das Panel am Handgelenk — **derselbe Baum** wie überall, und keine
zweite Art, Text zu zeigen. Gelesen wird derselbe kleine Markdown-Dialekt, den
auch die Schildwelt kann (`worlds/signs/signMarkup.ts`): Überschriften,
Aufzählungen, Zitat, Trennlinie, Code, Bild. `props.markdown: false` schaltet
ihn ab — wer eine Liste von Namen mit `*` davor aufschreibt, will Sternchen.

Drei Feinheiten stecken darin:

- **Auf der Tafel steht die erste Zeile**, nicht der ganze Aushang
  (`signSummary`). Sie ist ein Wegweiser und keine Wand voller Text.
- **Die Tafel sieht die Kamera an** (`TextPlaneOptions.face`, `ui/billboard.ts`)
  — und zwar die, aus der gerade gezeichnet wird. Von schräg oben ist eine
  Tafel, die nach Süden schaut, ein Strich; und eine, die sich zum **Kopf**
  dreht (so war es davor, `FixtureView.face`), dreht sich in der Ansicht von
  oben mit der Figur mit statt zum Bild. Ausgerichtet wird deshalb beim
  Zeichnen, samt Neigung — von oben liest man die ganze Tafel, in der Brille
  steht sie zum Auge. Gedreht wird nur die **Tafel**; der Pfosten bleibt, wo er
  steht.
- **Aufgeschlagen wird ein Bild später** (`GridWorld.openReading`).
  `WorldContext.refreshWorldMenu` merkt sich nur, dass der Baum neu zu bauen
  ist, und baut ihn am Ende des Bildes (`App.step`, `menuDirty`). Wer im selben
  Atemzug `openSubmenu` ruft, sucht eine Seite, die es noch gar nicht gibt —
  das Menü blieb dann einfach zu, und ein Schild, das man benutzt und das
  nichts tut, sieht aus wie ein kaputtes Schild.

**Wo die Arten stehen**: jede in einer eigenen Datei, angemeldet mit einer Zeile
in `fixtures/kinds.ts`; der Vertrag daneben in `fixtures/index.ts`. Zwei Dateien
und nicht eine, weil eine Art three.js baut und der Grundriss ohne auskommen
muss — `gridPlan.ts` fragt den Vertrag nach Kosten und Türkanten, und ein
Grundriss-Test soll dafür nicht die halbe Grafikbibliothek laden.

Im **Editor** ist das die dritte Reihe der Palette (_Einbauten_), gefüllt aus
der Registry: Wer eine Art anlegt, hat ihren Napf, ohne den Editor anzufassen.
Gesetzt wird wie ein Baustein — was an eine Kante gehört, will eine Kante —, der
Radiergummi räumt **erst den Einbau** weg (wer ein Schild löscht, will nicht die
Wand los, an der es hängt), und auf dem Tischmodell steht je Einbau ein Klotz
(`fixtureMarks`), damit man sieht, was man gesetzt hat. Von den Eigenschaften
lässt sich vorerst genau eine im Spiel eintippen: das **Ziel**
(_Einbauten → Ziel_, `ui/KeyPanel.ts`). Es gilt für das nächste Setzen und nicht
für das letzte — wer eine Reihe Knöpfe auf dieselbe Tür setzt, tippt den Namen
einmal. Alles andere steht in `layout()`, und das ist ehrlicher als eine Tafel
mit acht Feldern, durch die man in der Brille blättert.

Das erste Kind ist das **Schild** (`fixtures/sign.ts`): Es hält eine Zeile an
einer Wand, und wer davor steht und benutzt, liest sie am Handgelenk. Zwei
Zeilen Logik, mit Absicht — eine Registry, deren erstes Kind schon fünf Zustände
hat, ist eine, bei der man beim ersten Fehler nicht weiß, ob die Art oder die
Registry schuld ist.

Das zweite ist das **Tor** (`fixtures/gate.ts`), und es ist das, wegen dem der
Hub aufs Gitter gezogen ist: eine Kachel, auf der man steht, um woanders zu
sein. Seine Eigenschaften sind `world` (die Kennung aus `worlds/index.ts`),
`label` und `accent` — die Farbe als **Zahl**, damit `Props` flach bleibt, also
das, was in eine Datei passt. Es ist **nicht fest**: Ein Tor, gegen das man
läuft statt hindurch, wäre das Gegenteil von dem, was es sein soll. Vier
Sachen sind daran entschieden:

- **Betreten, nicht benutzen.** Wer auf der Kachel **steht** — `GATE_DWELL`,
  vier Zehntelsekunden —, geht hinüber. Das Tor war immer der Weg für die, die
  nicht wissen, dass es ein Handgelenkmenü gibt; ein Knopf davor wäre einer
  mehr. Benutzt oder von einem anderen Einbau ausgelöst geht es trotzdem
  sofort.
- **Frisch gebaut ist es taub** (`GATE_ARM`, eine Sekunde). Man kommt in einer
  Welt an, neben dem Startpunkt steht ihr Rücktor — und ohne die Sperre
  schickte einen das erste Bild der neuen Welt zurück. Die zweite Hälfte
  derselben Regel steht im Grundriss: **Der Startpunkt liegt nie auf einer
  Torkachel**, und der Test des Hubs prüft es.
- **Nur der Spieler zählt**, nicht das Gewicht auf der Kachel. Dafür gibt es
  `FixtureInput.playerOn` neben `weightOn`: Eine Druckplatte will das Gewicht
  (zwei Kisten halten sie so gut wie ein Mensch), ein Tor nimmt jemanden mit —
  und eine Kiste, die man darauf schiebt, soll niemanden in eine andere Welt
  schicken.
- **Von oben lesbar.** Die Ansicht _Von oben_ schaut immer aus derselben
  Richtung, das Tor steht aber in einer von vieren: Wer nach Norden schaut,
  zeigt der Kamera die Rückseite seines Schildes. Deshalb liegt auf dem Podest
  ein **zweites, flaches** Schild, das nach Norden oben liest, egal wohin das
  Tor gedreht ist. Das aufrechte zur Kamera zu neigen hieße, es gegen sein
  eigenes Tor zu verdrehen — in der Brille sähe man ein schief hängendes Brett.

Das dritte ist die **Effektquelle** (`fixtures/emitter.ts`): eine Düse auf
einer Kachel, die Rauch, Feuer, Funken oder Wasser macht — dieselben Zahlen wie
im alten Effektlabor, importiert und nicht abgeschrieben
(`effects/effectKinds.ts`). Sie ist das Kind, an dem man sieht, wozu die
Ereignisse gut sind: Ihre ganze Logik ist ein Zähler und eine Wartezeit, die
Wolke baut `GridWorld`. Vier davon stehen im Norden der Testwelt
(_Die Testwelt_).

#### Türen, Knöpfe, Platten

Seit P6 stehen die fünf Arten daneben, die es bis dahin nur im
Interaktionslabor gab — **Tür**, **Knopf**, **Hebel**, **Platte**, **Lampe** —,
und zwar auf dem Gitter statt in Metern. Was dabei entschieden wurde und warum:

- **Die Türmathematik wird importiert, nicht abgeschrieben.** `fixtures/door.ts`
  rechnet mit `interact/doorMotion.ts` — derselbe Zustand (`open` zwischen 0
  und 1, `wanted`, `hold`), dieselbe weiche Kurve, dieselbe Schwelle, ab der
  man hindurchpasst. Eine zweite Türmathematik neben der ersten wäre eine, die
  nach dem dritten Umbau anders aussieht als die, an der sie eingestellt wurde.
  Drei Betriebsarten stecken in `props.mode`: `slide` (Nachlauf, sechs
  Sekunden), `swing` (rastet, zwei Flügel an Scharnieren am Rahmen) und `plate`
  (kurzer Nachlauf).
- **Die Schiebetür hat zwei Halbflügel.** Nicht Geschmack, sondern eine
  Kachelbreite: Ein ganzes Blatt müsste um seine eigene Breite zur Seite
  fahren, träte damit über die Kachelkante und stünde in der Nachbartür — und
  in einer Wand mit drei Türen nebeneinander ist die Nachbartür genau das, was
  daneben liegt. Zwei Halbe fahren je eine halbe Türbreite und bleiben im
  Pfosten ihrer eigenen Kachel. **Gerechnet, nicht getippt**: Die Hälften
  kommen aus `PLAN_DOOR_W` und nicht aus einer festen Zahl — auf 2,5-m-Kacheln
  stand dort einmal 62 cm, auf einem Meter sind es 40 (halbe Türbreite), und
  eine getippte Zahl wäre beim ersten Gitterwechsel eine Tür, die halb offen
  in ihrem Pfosten klemmt. Wer **breiter** baut als das Gitter, baut auch die
  Tür selbst: Die Station geht über die ganze Kachelkante
  (`GridPlan.doorWidth()`, unten bei _Haunting_) und fährt ihre Blätter mit
  ihrer eigenen Türautomatik, nicht mit diesem Einbau.
- **Das Blatt gehört der Art, der Rahmen dem Grundriss.** Pfosten und Sturz
  baut `planSolids` wie bei jeder Türkante; das Blatt lässt `GridWorld` für
  Einbau-Türen weg und überlässt es der Art, die es fahren lässt. Der Quader,
  der aufhält, solange sie zu ist, steht in `view.solids` — **unsichtbar**, nur
  Körper, erkennbar am Namen der Tür (`PlanSolid.door`). Sichtbar stünde das
  Blatt zweimal da: einmal starr, einmal fahrend.
- **Benutzbar wird ein Einbau in genau einer Zeile**, und die steht in
  `GridWorld.buildFixtures` und nicht in den Arten
  (`addUsable` → `markUsed`/`markHit`, `core/usable.ts`). Ein Knopf, ein Hebel,
  ein Schild, ein Tor werden alle gleich angefasst; _was_ dabei passiert,
  entscheidet ihr `step`. Wer statt dessen je Art eine eigene Anmeldung
  schriebe, hätte beim fünften Einbau fünf Wege zum selben Haken. Der Hinweis
  über der Figur ist der Name der Art (_Knopf_). Wo man anfasst, darf die
  Art sagen (`view.handle`): Der rote Knopf gibt seine **Kuppel** an, denn eine
  Kugel auf Hüfthöhe soll den roten Punkt treffen und nicht die Säule darunter,
  und der Hebel seinen **Sockel**, denn sein Knauf wandert beim Umlegen und ein
  Ziel, das sich mit seinem eigenen Zustand verschiebt, erwischt man nach dem
  ersten Mal nicht mehr.
- **Die Portal-Regel gilt auch hier**: Was man drücken kann, kann man auch
  treffen. Beim Knopf sind `used` und `hit` derselbe Weg; dass er dabei einen
  **Nachlauf** hat, ist kein Schmuck, sondern die Bremse gegen das Dauerfeuer —
  ohne sie drückte es ihn sechzigmal in der Sekunde und eine rastende Tür
  stünde danach auf einer zufälligen Seite.
- **Staub und Funken sind gemeldet, nicht gebaut.** Eine Tür, die losfährt oder
  zufällt, gibt `effect('dust')` zurück, ein Knopf, den eine **Kugel** erwischt,
  `effect('sparks')` — und eine Hand, die denselben Knopf drückt, eben nicht.
  Gebaut wird beides von `GridWorld` aus den Zahlen in
  `effects/effectKinds.ts`; eine Art, die ihre eigene Wolke zeichnete, wäre
  eine, die man ohne Bildschirm nicht mehr prüfen kann.
- **Die Platte löst in jedem Bild neu aus**, in dem etwas auf ihr steht, und
  nicht nur beim Betreten. Nur so setzt die Tür dahinter ihre Uhr zurück und
  fällt anderthalb Sekunden nach dem _Verlassen_ zu statt unter dem, der in ihr
  steht. Gezählt wird das Gewicht als **Zahl** (`weightOn`): zwei Kisten sind
  zwei, und wer eine wegnimmt, hat immer noch eine.
- **Knopf, Hebel, Platte und Lampe halten niemanden auf** (`solid()` ist
  falsch). Eine Knopfsäule ist eine Handbreit dick; ein Quader darum wäre ein
  Knopf, um den ein NPC einen Bogen macht und vor den man sich nicht mehr
  stellen kann. Sie rücken dafür an die **Kante** ihrer Kachel statt in die
  Mitte — in der Mitte stünde die Figur in ihnen, sobald sie drückt. Der
  **Kleiderschrank** ist die Ausnahme: Er ist ein Möbel und hält auf, und
  deshalb steht sein Korpus in `view.solids` (siehe _Der Kleiderschrank und
  die Umkleide_).
- **Die Schiebetür des Gitters (`slidingDoor.ts`) bleibt, wie sie ist.** Sie
  schaltet ein Blatt zwischen auf und zu und baut es dabei neu; eine Tür, die
  _fährt_, braucht ein Blatt, das jedes Bild woanders steht. Beides in einem
  Handgriff hieße, den einen umzubauen, damit der andere hineinpasst — und
  hinterher hätte die Station eine Tür, die sich anders öffnet als vorher.

**Alle Welten stehen darauf**, die überhaupt Zimmer, Gänge und Türen haben:
der **Hub** (seit P4, siehe _Hub-Welt_), der **Bauplatz** und die
**Testwelt**. Der Bauplatz ist seit der dritten Fassung selbst eine davon — er
baute ohnehin schon aus derselben Liste, und was ihn noch ausmacht, sind ein
Startzimmer, ein Speicher und ein weißer Raum. Es gab einmal Welten, die nicht
darauf standen: Ein Berg ist keine Kachel, und ein Höhenfeld auf das Gitter zu
ziehen hätte es nur schlechter gemacht.

Die Grenze ist an der **Kletterwand** am deutlichsten und dort mit Absicht
gezogen: Ein Überhang, ein Riss und ein Kamin sind kein Mobiliar, sondern das
Spiel selbst. Ihre Maße sind über viele Sitzungen im Headset entstanden, und
jede davon auf eine Kachelkante zu ziehen hieße, sie noch einmal von vorn
einzumessen — für nichts. Auf das Gitter gehört die Hülle.

**Was jede Welt dabei geschenkt bekommt**, und was vorher jede einzeln
erarbeiten musste:

- **Fenster sind Löcher.** Der Graph kannte die Wandsorte immer schon — sie
  hält auf, lässt aber Sicht und Geräusch durch —, gebaut wurde daraus eine
  ganz normale massive Wand. Dahinter stand ein NPC im ersten Stock, der einen
  durch eine Wand sah, durch die man selbst nichts sah, und niemand hätte je
  vermutet, dass das Fenster daran schuld ist.
- **Türen stehen im Graphen**, nicht nur als Loch in einer Wand. Erst damit
  kann sich eine Meinung über sie irren (`nav/navBelief.ts`).
- **Eine gemeinsame Palette.** Acht Töne für alle Gitterwelten (`GRID_COLORS`),
  und eine Welt verstellt daran einzelne (`tint()`), statt sich sechs eigene
  Materialien anzulegen. Das ist die „einheitliche Sache", die man an Böden und
  Wänden zuerst bemerkt.
- **Der Bearbeitungsmodus.** Karte, Palette, Tischmodell, Malen und Flächen —
  eine Zeile Verdrahtung, weil `layout()` ohnehin einen `GridPlan` liefert. Wer
  ihn will, sagt `editable()` `true`, und das tun der **Bauplatz** und die
  **Testwelt**: Eine Weile hing er an jeder Gitterwelt, über eine Seite _Bauen_
  im Handgelenkmenü — fünfzehn Zeilen, durch die man blätterte, wann immer man
  etwas anderes suchte. Die Seite ist wieder weg; was die meisten daran
  wollten (von oben sehen, wo man ist), ist jetzt ein Werkzeug im Regal
  (_Die Karte in der Hand_) und in jeder Welt zu haben. Mit `editable()` hängt
  auch der **Speicher** zusammen (`applyStored`): eine Welt, die man nicht
  ändern kann, hat keinen eigenen Stand aufzuheben. Und weil ein gespeicherter
  Stand den ganzen Grundriss ersetzt, gibt es daneben `planLoaded()` — den
  Haken für das, was **auch danach** noch gelten muss. Der Bauplatz setzt dort
  sein Tor zurück in den Hub, die Testwelt alle Einbauten ihrer zehn Zonen
  (`fitTest`): eines, das nur in `layout()` stünde, wäre beim ersten Besuch da
  und ab dem zweiten weg, und dann säße man in der selbstgebauten Welt ohne
  Ausgang. **Er läuft deshalb zweimal** — einmal beim Bauen, einmal nach dem
  Laden —, und das geht nur mit **Einbauten**: Sie haben eine Kennung, und
  `putFixture` ersetzt nach Kennung. Ein Baustein hat keine und stünde beim
  zweiten Mal zweimal da. Zwei Sachen macht die Basis
  dabei selbst: den **Umbau** (alte Quader vollständig zurücknehmen, `dropSlab`, und
  aus der Liste neu bauen — höchstens einmal je Bild, egal wie viele Kacheln
  ein Strich gesetzt hat) und das **Abtasten danach** (`rebake`), damit NPCs
  belaufen können, was gerade entstanden ist.
- **Geprüft, bevor jemand die Brille aufsetzt.** Jeder Grundriss liegt in einer
  eigenen Datei ohne three.js (`hub/hubGrid.ts`, `editor/starterGrid.ts`,
  `test/testPlan.ts`), und sein Test läuft durch jede Tür und auf jede Etage.
  Ein Zimmer ohne Tür merkt man sonst erst, wenn man davorsteht — nach dem
  Laden, nach dem Aufsetzen, nach dem Hinlaufen.
- **Gitterlinien und Wand-Ghosting.** Das Netz der eigenen Ebene (_Menü →
  Werkstatt → Gitterlinien_) und die durchsichtige Wand vor der Figur kommen aus
  `GridWorld` und nicht aus der Welt — beides hängt an den Kacheln und den
  Quadern, die ohnehin dort liegen (siehe _Von oben_ und
  _Wie schön es aussieht_).

## Sandbox, Ordner und die Test Navigation

**Die Testwelt heißt seit September 2026 _Sandbox_** (Kennung `sandbox`,
gewünscht: _„die „Test" Welt sollte in sandbox Welt umbenannt werden"_). Wo in
diesen Kapiteln noch _Testwelt_ steht, ist sie gemeint; der Quelltext liegt
weiter unter `src/worlds/test/`. Der alte Name lebt als **Alias** weiter
(`worlds/index.WORLD_ALIASES`): `#test` in der Adresse und `findWorld('test')`
führen in die Sandbox, ein Umbau unter `vr-welt:test` zieht beim ersten Laden
nach `vr-welt:sandbox` um (`grid/worldStore.adoptFormer`), und die Schilder
unter altem Namen gelten weiter (`signs/signStore.storedSigns`).

**Welten können in einem Ordner stehen** (`WorldDefinition.folder`,
`worlds/index.WORLD_FOLDERS`). Gewünscht: _„eine Test Ordner Welt …, wenn ich
drauf drücke habe ich Auswahl eine erste und einzige Welt: Test Navigation
Welt"_. Im Menü _Spielen_ ist ein Ordner eine Zeile, die aufgeht
(`App.refreshMenu`, Kennung `world:folder:<id>`) — `groupMenu` zieht die
Welten darin nicht einzeln heraus, weil sie in denselben Bereich gehörten.
Auf der Startseite ist er eine Karte _ORDNER · n_, die sich aufschlägt, mit
einer Karte zurück davor (`ui/landingWorlds.renderWorldCards`). Die Ordnung
rechnet `ui/menuGroups.folderWorlds`: Ein Ordner steht, wo seine erste Welt
stünde. Die Tore im Hub bleiben eines je Welt.

**Die Test Navigation** (`worlds/testnav/`, Kennung `test-navigation`, im
Ordner _Test_) sind vier Kammern aus Fensterwänden (`navTestPlan.ts`), vor
jeder ein roter Knopf, drinnen eine **grüne Startplatte** und eine **blaue
Zielplatte** (immer sichtbar, ohne Tiefenprüfung).

**Die Wände sind nur aus dem Regal** (gewünscht: _„keine eigenen Wände
nutzen, sondern nur die kaykit Wall Elemente"_): Die Kammern und die
Brüstungen der Podeste sind `prototype-bits/Wall_Window_Closed` (zwei
Kacheln) und `…_Narrow` (eine), die beiden Schrägen `Wall.glb` unter 45°
(`navTestWalls`, `shelfWalls.SHELF_WINDOW_PIECES`). Im Plan stehen sie als
feste Wände, damit `navTestPlan.test.ts` ohne Szene rechnen kann;
`NavTestWorld.layout` räumt sie weg (`clearPlanWalls`), und eingerastet sind
die Stücke für Zellgitter und NPCs Wände wie jede andere. Welche Etage eine
Wand aus dem Regal sperrt, sagt jetzt die Höhe ihrer Unterkante
(`shelfNav.wallLevel`) — vorher die Kachel hinter ihrer Mitte, und die ist am
Rand eines Podests Luft, sodass die Brüstung oben die Kante unten sperrte.

1. **Schräger Gang** — zwei Wände unter 45° von Wand zu Wand der Kammer,
   dazwischen der einzige Weg.
2. **Treppe** — hinauf aufs Podest, oben das Ziel.
3. **Treppe und Lava** — oben geradeaus liegt Lava (`HAZARD_FIRE`) zwischen
   Treppe und Ziel, rechts ist die Kammer zu Ende: Der NPC muss links herum.
   Wer doch auf der Lava steht, stirbt (`NavTestWorld.burn`,
   `NpcDirector.harm`).
4. **Enger schräger Gang** — dieselbe Kammer wie der erste, die zweite
   Schräge eine Kachel näher (`x + z = 8` statt `9` in der Kammer;
   gewünscht: _„45° Wände die aber einen näher aneinander stehen"_).

**Jede Kammer hat ein Tor, durch das nur der Spieler kommt** (gewünscht:
_„zu allen Bereichen auch ein Tor … über welches nur der Spieler rein und
raus kann"_): `prototype-bits/Wall_Doorway.glb` in der Südwand, an der Kachel
der Startplatte (`NavTest.gate`, `GATE_MODEL`). Für das Zellgitter des
Spielers ist der Durchgang offen (`MODEL_ARCHES`, `gridSnap.wallCells`); im
Graphen der NPCs steht an derselben Kante eine feste Wand
(`NavTestWorld.navReady`, und im Plan für `navTestPlan.test.ts`), also plant
keine Puppe hinaus.

Der Knopf stellt eine Übungspuppe auf die grüne Platte und schickt sie bis
auf die blaue (`sendTo`, 0,3 m statt `ERRAND_REACH`); am Ziel sagt die Welt
_„… am Ziel"_. **Der berechnete Weg ist immer zu sehen** — die Ebene _Wege_
der Navigationsansicht ist ab dem Aufbau an (`setNavLayer('paths')`).

Was die Welt dafür an der Wegsuche aufgedeckt hat (Kapitel
[Zellgitter](zellgitter.md)):

- **Der Graph der NPCs ist hier der des Plans** (`GridWorld.navFromPlan`):
  Das Abtasten fand über der Treppe Kacheln der Etage darüber, am Podest
  Absprünge in jede Richtung und einen Sprung quer über den Lauf.
- **Über einer Treppe liegt kein Boden** — auch im abgetasteten Graphen der
  anderen Welten nimmt `GridWorld.navReady` die Kacheln darüber heraus.
- **Seitlich auf eine hohe Stufe plant niemand** (`navPath.sidestep`,
  `cellRoute.flightEdge`, `NavGraph.flightAt`).
- **NPCs gehen Treppen wie der Spieler**: Auf dem Lauf trägt sie die Höhe
  (`Npc.stairLift`, `NpcWorld.stairs` → `GridPlan.flightFloor`); ihr Zylinder
  kam vorher keine Stufe hinauf.

Nachgelaufen ohne Szene in `testnav/navTestPlan.test.ts` (Wege, Treppe,
links um die Lava) und im echten Browser mit allen drei Knöpfen: Alle drei
Puppen stehen auf ihrer blauen Platte, keine stirbt.

## Womit die Seite aufmacht

**Ohne Adresse landet man in der Sandbox (vormals Testwelt), und dort in der Küche**
(`worlds/index.DEFAULT_WORLD`, `test/TestWorld.spawnPoint`,
`test/layout.KITCHEN_SPAWN`). Hier stand der Hub, und er war richtig, solange
er der Ort war, an dem etwas passiert: eine ruhige Halle mit einem Menü an der
Wand. Gearbeitet wird aber in der Küche, und jeder Start war derselbe Umweg —
Menü auf, Testwelt wählen, laden, dreißig Meter nach Norden laufen.

Drei Zahlen hängen daran, und sie stehen deshalb an **einer** Stelle
(`layout.KITCHEN_SPAWN`): die Ankunft der Welt, das Ziel im Sprungmenü
(`ZONE_TILES`) und `?at=kitchen` in der Adresse (`spawnAt.ts`). Eine Küche, die
umzieht, nimmt alle drei mit; zwei Zahlen, die auseinanderlaufen, wären ein
Startplatz in einer Wand. Ein Test rechnet nach, dass die Kachel begehbar ist
und dass man von ihr in jede Zone kommt (`testPlan.test.ts`).

Der Hub ist damit nicht weg, nur nicht mehr der Anfang: `#hub` in der Adresse
führt hin, und das Tor am Startplatz der Testwelt tut es auch
(`test/zones/start.ts`).

## Eine neue Welt hinzufügen

1. `src/worlds/<name>/<Name>World.ts` anlegen und `World` implementieren
   (`init`, `update`, optional `render`, `preview`, `dispose`).
2. In `src/worlds/index.ts` einen Eintrag in `WORLDS` ergänzen — Titel,
   Beschreibung, Akzentfarbe, unterstützte Rollen und ein `load()` mit
   dynamischem Import. Wahlweise `topDownSpan`: wie viele Meter um den
   Startpunkt von oben beim Betreten ganz im Bild stehen sollen — der
   Start-Zoom, passend zum Seitenverhältnis (`topDownPose.topDownFit`; der Hub
   nimmt 11,5 m, damit die Lobby auch hochkant am Telefon ganz dasteht).

Soll die neue Welt dieselben Werkzeuge, Portale und dieselbe Physik haben wie
die Testwelt, erbt sie stattdessen von `PortalWorld` und ersetzt nur den Raum:
`buildEnvironment()`, dazu die kleinen Haken `spawnPoint()`, `spawnYaw()`,
`skyColor()`, `lightIntensity()`, `welcome()`, `beltLoadout()` (leer heißt:
beide Trigger gehören der Welt) und `worldReset()` (was `B`/`Y` in dieser Welt
zusätzlich zurücksetzt — die Karts in die Box, die Kisten an ihren Platz).
Dazu die drei für den Boden und die Schwerkraft: `worldGravity()` (eine Welt
mit weniger Schwerkraft sagt hier ihre Zahl, und solange niemand im Menü eine
eigene setzt, gilt genau die), `horizonColor()` (`null` lässt die Fläche bis
zum Horizont weg) und `horizonLine()` für ihr Raster. `removeProp()`
löscht ein Prop wieder, wahlweise nur lokal. `placeTool()` legt ein Werkzeug in
den _Raum_ statt auf den Gürtel — liegend oder schwebend, bis eine Hand es
nimmt. Dazu `toolChoice()`, die Liste hinter dem Werkzeug-Knopf am Bildschirm,
und `defaultScreenTool()` — was darin liegt, bis jemand etwas anderes wählt.
Wer davon erbt, bekommt die ganze Maschinerie (Gürtel, Regal, Ferngreifen,
geteilte Sitzung) mit, ohne sie zu kopieren.

Steht die neue Welt auf **Kacheln** — und das ist inzwischen der Normalfall für
alles, was Zimmer, Gänge und Türen hat —, erbt sie besser gleich von
`GridWorld` (siehe oben) und schreibt statt `buildEnvironment()` nur noch
`layout()`: einen Grundriss aus Zimmern, Kanten und Bausteinen. Geometrie,
Physik, Portalflächen und die Navigationskarte kommen mit. Der Grundriss gehört
dabei in eine **eigene Datei ohne three.js** (`hubGrid.ts`, `starterGrid.ts`,
`testPlan.ts`) — das ist der einzige Unterschied zwischen einer Karte, die ein
Test in einer Millisekunde abläuft, und einer, für die man die Brille aufsetzen
muss. Wächst sie über ein Zimmer hinaus, wird sie eine **Komponistin**, die
Stempel aufruft: `stamp<Name>(plan)` je Ecke, die Rechtecke in einer eigenen
Datei daneben (siehe _Die Testwelt_).

Mehr braucht es nicht: Menü, Hub-Tor, Deep-Link (`#<id>`), der Eintrag auf der
Werkzeugseite samt Vorschau von innen (`preview()` erbt eine `PortalWorld`
mit) und das Aufräumen beim Wechsel erledigt die Engine. Alles, was eine Welt der Szene hinzufügt,
wird beim Verlassen wieder entfernt (die Engine räumt zur Sicherheit nach).

## Wie die Portale funktionieren

Jedes Portal rendert die Sicht seines Partners in ein eigenes Render-Target.
Das Target hat exakt das Layout des gerade gezeichneten Framebuffers — in VR
also beide Augen nebeneinander —, deshalb kann die Portalfläche einfach ihre
eigene Bildschirmposition nachschlagen und das Bild sitzt auch in Stereo.
Die Near-Plane der virtuellen Kamera wird schräg auf die Portalebene gelegt
(Lengyels Oblique-Clipping), damit nichts zwischen Kamera und Portal ins Bild
läuft. Beim Durchschreiten wird der Player-Rig mit derselben Matrix versetzt,
mit der auch die virtuelle Kamera berechnet wird.

Portale auf Boden und Decke richten sich nach der Blickrichtung aus, damit man
immer sauber hineinfällt. Beim Durchgehen wandert nicht nur der Spieler, sondern auch jedes Objekt und
dessen Geschwindigkeit durch dieselbe Matrix — ein Sturz in ein Bodenportal
wird so zum Schwung aus einem Wandportal. **Wer herumläuft, geht genauso
hindurch**: Ein NPC ist in der Physik ein Zylinder wie jede Kiste, und er
bekommt dieselben drei Dinge — die Wand wird für ihn durchlässig, die Matrix
versetzt ihn, und sein Abbild steht drüben (`PortalWorld.traverseNpcs`,
`Npc.warp`). Mitgedreht wird dabei auch seine **Blickrichtung**, und sein
geplanter Weg wird weggeworfen: Der lag auf der anderen Seite.

Damit man überhaupt durch eine Wand fallen kann, ignorieren Körper innerhalb
des Portaltrichters die Kollisionsgruppen aller Flächen, die das Loch
**durchstößt** —
der Spieler, die Kisten und jeder, der herumläuft (`updatePhasing`). Das ist die
Voraussetzung für alles Weitere und nicht eine Feinheit: Ohne sie stößt ein
Zombie vor dem Portal gegen den Beton, in dem es hängt, und zappelt dort. Man
sieht das Loch, er läuft dagegen.
Jede portalfähige Fläche hat dafür ein eigenes Bit — mit einem gemeinsamen Bit
für alle löste ein Portal an der Wand auch den Boden davor auf, und man sackte
kurz vor dem Portal ein.

**Welche Bits das sind, wird beim Schießen gemessen** (`portalFunnel.ts`, mit
Test): neun Strahlen entgegen der Normalen, von der Mitte und vom Rand der
Öffnung, so tief wie der Trichter reicht — alles, was sie treffen, kommt in die
Maske. Vorher stand dort nur die eine Fläche, auf der das Portal klebt, und
genau daran scheiterte es: Im Labor liegt die Fläche bis zum Horizont fünf
Zentimeter unter dem gebauten Boden (`GROUND_TOP`), beide sind portalfähig, und
ein Bodenportal löste nur den oberen auf. Der Companion Cube fiel fünf
Zentimeter, setzte auf und blieb im Loch stehen — man sah ihn darin liegen und
hielt die Physik für kaputt, dabei fehlte ein Bit.

Nichts springt mehr durch die Portalebene: `PortalGhosts` schneidet alles, was
gerade in einer Öffnung steckt, mit einer Clipping-Ebene ab und zeichnet eine
Kopie davon vor dem Partnerportal — mit dem umgekehrten Schnitt. Angemeldet
sind dafür beide Hände, das Werkzeug darin, die Hände der anderen Spieler,
jedes Prop **und jeder, der herumläuft**; wer aus dem Bestand verschwindet,
wird im nächsten Bild wieder abgemeldet, sonst bliebe sein Abbild vor dem
Ausgang stehen. Beide Hälften
zusammen ergeben ein durchgehendes Objekt. Für die Hände sitzt zusätzlich ein
zweiter Kollisionsfühler in der herausragenden Hälfte, damit sie drüben auch
etwas anstoßen kann. Kurz vor dem Durchschreiten rutscht die Portalfläche ein
Stück auf das Auge zu, sonst würde die Near-Plane sie wegschneiden und für ein
paar Zentimeter die nackte Wand zeigen — genau das ließ den Durchgang wie eine
Teleportation wirken.

**Portale in Portalen** sind eine Einstellung, keine Konstante:
_Einstellungen → Portale in Portalen_ schaltet zwischen 1 und 4 Ebenen durch,
**ausgeliefert wird 2**. Jede Ebene ist ein weiterer kompletter Durchgang durch
den Raum — pro Portal und pro Auge —, deshalb gehört die Zahl dem Spieler:
Eine Brille, die ins Stocken gerät, geht auf 1 zurück, ein PC verträgt 4. Der
Wert liegt im Browser (`portalDepth.ts`, mit Jest-Test) und überlebt den
Reload.

Gerendert wird von innen nach außen: Zuerst die tiefste Ebene (dort zeigen alle
Portale ihren Ruhewirbel), dann jede weitere mit der Ebene darunter in den
Portalflächen, zuletzt die, die der Spieler ansieht. Die Kamera einer Ebene ist
die Traversal-Matrix des Portals, `k+1`-mal angewandt — genau das ist der
Korridor, den zwei sich gegenüberstehende Portale bilden. Die inneren Ebenen
werden **kleiner** gerendert (0,6 pro Stufe): ein Portal im Portal ist ein
kleines Ding auf dem Bildschirm, und ein volles Target dafür sind Megabytes
Brillenspeicher, die niemand aus der Nähe ansieht. Weil die Portalfläche ihr
Bild über die _Bildschirmposition_ nachschlägt, bekommt sie vor jedem Durchgang
gesagt, wie groß das Bild ist, das gerade gezeichnet wird — sonst säße das
innere Bild verschoben.

Bekannte Grenzen des Prototyps: Portale nur auf ebenen Flächen, und die
inneren Ebenen zeigen ein Nachbarportal mit der Kamera der eigenen Kette —
für zwei sich gegenüberstehende Portale (der Fall, den man ansieht) stimmt es,
für zwei über Eck ist es eine Näherung.

**Zwei Render-Ebenen** halten auseinander, wer was sieht: `LAYER_SELF_ONLY` (3)
trägt den eigenen Körper — den zeichnen _nur_ die Portalkameras und die
Spiegel, direkt sieht man von sich die Hände. `LAYER_HUD` (4, in
`src/ui/ScoreHud.ts`) ist das
Gegenstück: das HUD hängt an der Kamera und darf in keiner zweiten Kamera
auftauchen, sonst schwebt es in der Portalsicht, im Drohnendisplay oder im
Fernrohr mitten im Raum. `viewLayers` (in `core/viewLayers.ts`) setzt für jede
solche Sicht das eine Bit und löscht das andere; es steht dort und nicht mehr
im Portal-Renderer, weil der Spiegel dieselbe Regel braucht — und zwei
Auskünfte mit derselben Regel laufen irgendwann auseinander. Drohne und Fernrohr
bringen eigene Kameras mit, die von Haus aus nur Ebene 0 zeichnen.

## Wie die Spiegel funktionieren

Ein Spiegel ist der Portalsicht so ähnlich, dass er denselben Bau benutzt, und
er unterscheidet sich in genau einem Vorzeichen. Ein Portal **versetzt** die
Kamera — eine Drehung samt Verschiebung, Determinante `+1`. Ein Spiegel
**klappt** sie um: die Householder-Spiegelung an der Glasebene
(`worlds/shared/mirrorMath.ts`, mit Test), Determinante `−1`. Das ist der ganze
Unterschied, und es ist auch der Grund, warum das Gegenüber im Spiegel die
andere Hand hebt.

Alles Übrige ist geerbt: Das Bild entsteht in einem Render-Target mit dem
Layout des gerade gezeichneten Framebuffers (in VR beide Augen nebeneinander),
die Fläche schlägt darin ihre eigene Bildschirmposition nach — damit stimmt es
in Stereo —, und die Near-Plane liegt schräg auf der Glasebene, sonst stünde
die Wand hinter dem Spiegel mitten im Bild. Die **Projektion bleibt dieselbe**
wie die des echten Auges, und das ist kein Zufall: Ein Punkt landet unter
`P·(M·C)⁻¹` genau dort, wo sein gespiegeltes Gegenstück unter `P·C⁻¹` landet.
Genau deshalb darf die Fläche in Bildschirmkoordinaten ablesen.

**Das umgeklappte Vorzeichen kostet eine Zeile Aufwand**, und ohne sie sieht
man gar nichts: Weil das Bild seitenverkehrt ist, laufen alle Dreiecke darin
andersherum, und die normale Aussortierung wirft genau die Flächen weg, die man
sehen will. Für den Durchgang wird sie deshalb umgedreht
(`renderer.state.setCullFace(CullFaceFront)`). Ein Spiegel ohne das ist kein
falscher Spiegel, sondern ein leerer — genau so sah es beim ersten Versuch aus.

**Es bleibt bei einer Rückspiegelung.** Was in einem Spiegelbild selbst ein
Spiegel ist, zeigt blindes Glas; zwei Spiegel gegeneinander wären sonst ein
unendlicher Gang, und jede Stufe davon kostet die ganze Szene noch einmal.
Aus demselben Grund gibt es ein **Budget**: höchstens zwei Spiegel bekommen
gleichzeitig ein Bild, und ausgewählt werden nicht die nächsten, sondern die,
die im Blickfeld am meisten Platz einnehmen (Fläche durch Abstand im Quadrat).
Ein Handspiegel vor der Nase gewinnt damit gegen den Standspiegel drei Meter
weiter — und so hält man ihn ja auch hin. Wer zu klein ist (unter 10 cm),
wer hinter einem steht und wer weiter als 14 Meter weg ist, bleibt Glas. Die
Größengrenze ist dabei nicht Kosmetik: Der Standspiegel liegt im Beutel als
dreieinhalb Zentimeter hohe **Miniatur** im Fach, und ohne sie zeichnete der
Beutel die ganze Welt in jede dieser Briefmarken.

Die Flächen werden **in der Szene gesucht** und tragen sich nicht in eine Liste
ein: Spiegel stecken in Werkzeugen, in Beutel-Objekten, in Miniaturen davon und
seit dem **Kleiderschrank** auch in einem Einbau auf dem Gitter, und die wandern
zwischen Hand, Gürtel, Regal, Wand und Papierkorb. Eine Liste, die davon nichts
mitbekommt, zeigt irgendwann auf etwas, das längst weg ist.

**Genau deshalb kostet ein Spiegel im Grundriss keine Zeile Vertrag.** Der
Kleiderschrank (`grid/fixtures/wardrobe.ts`) hängt eine `MirrorSurface` in die
Gruppe der Welt, und mehr tut er nicht: Der Renderer steht einmal in `App`,
läuft über die ganze Szene und findet sie. Ein Haken für Spiegel in
`FixtureBuild` hätte jeder Art Renderer, Szene und Kamera in die Hand gegeben,
damit eine einzige eine Fläche aufhängen kann. Was er dafür verlangt, ist das
**Freigeben**: Das Glas hält ein eigenes Material, und erst dessen `dispose`
meldet dem Zähler, dass es einen Spiegel weniger gibt.
Gezählt wird trotzdem mit — solange es gar keinen Spiegel gibt, entfällt auch
das Durchsuchen. Der Zähler hängt an der **Material-Entsorgung** und nicht an
einer eigenen `dispose`-Methode, denn weggeräumt wird mit `disposeTree` und
`disposeToolTree`, und die wissen von einer Spiegelfläche nichts.

Gezeichnet wird bei der **App** und nicht bei einer Welt (`core/App.ts`, vor
dem Weltrender und damit vor den Portalsichten). Ein Spiegel ist ein Ding wie
jedes andere: Er kommt als Handspiegel aus dem Regal oder als Standspiegel aus
dem Beutel, und beide reisen mit ihrem Träger durch jede Welt. Eine Welt, die
von Spiegeln wüsste, wäre eine Welt, in der man einen vergessen kann.

Portalfläche und Spiegelfläche haben dabei dieselbe Eigenschaft, und sie steht
inzwischen als solche da (`worlds/shared/screenSurface.ts`): Beide lesen ihr
Bild in Bildschirmkoordinaten ab und müssen deshalb wissen, wie groß der
Puffer ist, in den sie _gerade_ gezeichnet werden. Der Spiegel-Renderer stellt
vor seinem Durchgang **alle** solchen Flächen auf seine Zielgröße und danach
wieder zurück — sonst zeigte ein Portal im Spiegelbild einen um den
Auflösungsfaktor verschobenen Ausschnitt.

Bekannte Grenze in der anderen Richtung: Ein Spiegel **in** einer Portalsicht
zeigt das Bild, das für das echte Auge gerechnet wurde. Der Ausschnitt sitzt
richtig, die Blickrichtung nicht — für eine eigene Rechnung pro Portalebene
müsste jede Spiegelung noch einmal durch die ganze Szene, und das ist ein
Preis für einen Fall, den man im Vorbeigehen sieht.
