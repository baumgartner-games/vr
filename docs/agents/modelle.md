# Modelle im Repository

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

`public/models` ist der Ordner, in dem **fremde Arbeit** liegt: die Spielfigur
(`chef.glb`) und der Rest des ersten Küchenkatalogs (`kitchen.glb`), beide
CC-BY-4.0, und der zweite Katalog (`diner.glb`, CC0), aus dem inzwischen
**beide** Küchen ihre Möbel beziehen. Die Namensnennung steht in
`public/models/CREDITS.md`, und sie ist **Pflicht**, nicht Höflichkeit — wer
ein Modell aufnimmt, trägt es dort ein, **bevor** er es einbaut. Eine Datei
ohne Zeile in dieser Liste ist eine Datei ohne Lizenz. **Auch die
CC0-Datei steht dort**, obwohl sie keine Nennung verlangt: Die Liste ist die
Herkunftsliste und nicht nur die Lizenznennung, und eine, in der die freien
Dateien fehlen, beantwortet die Frage nach der Herkunft nicht, sondern
verschweigt sie.

**Die Rohdateien liegen nicht im Repository.** Zusammen 38 MB, von denen nach
der Aufbereitung 1,7 MB übrig bleiben. Was mit ihnen geschieht, steht
vollständig in den drei Werkzeugen — `tools/chef-model.mjs`,
`tools/kitchen-model.mjs` und `tools/diner-model.mjs` —, und zwar mitsamt den
Fehlern, die dabei gemacht wurden. Sie laufen von Hand, nicht bei jedem Build:
Ein Modell ändert sich nicht, und `@gltf-transform`, `sharp` und
`meshoptimizer` gehören nicht in die Abhängigkeiten eines Spiels, das sie nie
ausführt (`npm install --no-save` beim Aufbereiten).

## Der zweite Katalog: 156 Stücke, ein Material, eine Textur

`diner.glb` kommt aus _Restaurant Bits_ von Kenney (CC0) und ist in jeder
Hinsicht das **Gegenteil** der Quelle der ersten Küche. Die ist ein aufgebautes
Bild in vier Netzen, aus dem `tools/kitchen-model.mjs` dreizehn Möbel
herausschneiden muss; diese ist ein Baukasten aus 225 Einzeldateien, alle auf
demselben Raster und alle auf **einem** Farbstreifen-Atlas von 1024 px. Zu tun
ist deshalb nicht das Zerlegen, sondern das **Zusammenlegen**
(`tools/diner-model.mjs`).

Vier Dinge sind daran wichtig genug, um sie hier zu nennen:

- **Der Ursprung bleibt stehen, und deshalb gibt es kein `align`.** Das erste
  Werkzeug zentriert jedes Möbel in seiner Hülle — und weil eine Hülle nicht
  der Korpus ist, steht hinter jedem fünften Möbel des ersten Katalogs ein
  nachgemessener Versatz (`KitchenPiece.align`, allein der Türgriff der
  Küchenzeile macht 3,07 cm). Diese Quelle ist auf einem Raster gebaut: Ein
  Hängeschrank fängt bei y = 1 an, eine Wand steht am hinteren Rand ihrer
  Zelle, eine Tür im Türsturz. Wer das geradezieht, wirft genau die
  Information weg, die er hinterher von Hand wieder nachmessen müsste. Der
  Katalog beschreibt den Ursprung statt ihn zu verschieben: `foot` (Unterkante
  über dem Ursprung), `height` (Oberkante), `at` (Mitte der Hülle) und `span`
  (das ungerundete Maß).
- **Der Katalog ist geschrieben und nicht getippt.**
  `node tools/diner-model.mjs --in=… --list --fit=src/core/dinerFit.ts` ersetzt
  die Liste in der Datei; von Hand gepflegt wird dort nichts. 156 nachgemessene
  Hüllen sind keine Liste, die jemand pflegt, ohne sich zu vertun — und der
  erste Anlauf des Schreibers bewies das gleich selbst: Er rechnete das Ende
  des Blocks mit `indexOf(…) + Länge` aus und schrieb bei `-1` ab Zeichen drei
  weiter, so dass aus einer Datei mit leerer Liste eine Datei wurde, die
  zweimal anfing. Ein Suchergebnis, das `-1` sein kann, gehört geprüft und
  nicht weitergerechnet.
- **Halbiert wird wieder** (`DINER_SCALE`, dieselbe 0,5 wie bei der ersten
  Küche), und das ist die Probe darauf, dass beide Quellen dasselbe meinen: Die
  Küchenzeile kommt damit auf 0,50 m Arbeitshöhe — auf den Zentimeter die Zahl,
  mit der die Zeile der ersten Küche dasteht. Ein Jest-Test hält genau das
  fest.
- **Ausgesiebt wird das Essen — bis auf zehn Zutaten.** 69 der 225 Stücke
  bleiben draußen: Pizzen, Eintöpfe, das Eis-Zubehör und dreißig Zutaten, für
  die es kein Rezept gibt. **Zehn kommen mit** (`KEEP_FOOD`), und sie sind
  genau das, was ein Rezept braucht: Brötchen ganz, als Boden und als Deckel,
  das Patty roh, gebraten und verbrannt, Salat und Tomate je ganz und
  geschnitten. Von der geschnittenen Tomate **eine** Scheibe
  (`food_ingredient_tomato_slice`, 220 Dreiecke) und nicht der Dreierstapel
  daneben (`…_slices`, 476): Auf einem Burger liegt eine, und drei
  übereinander machten aus jeder Tomate einen Turm. Zusammen 2 722 Dreiecke.

  Das war einmal anders, und der alte Satz stand an dieser Stelle: „Diese
  Küche baut ihr Essen selbst." Sie tat es aus Zylindern und Kugeln
  (`zones/kitchenProps.ts`), weil es nichts Besseres gab, und in der Datei
  stand seit dem ersten Tag der Satz, dass ein Zutatensatz „genau diese Klasse
  ersetzt", sobald einer da ist. Er ist da. Gebaut bleiben vier Dinge, und
  jedes aus eigenem Grund: der **Teller** und der **dreckige Teller** (an
  ihnen hängen Stapel, Verdrehwinkel, Reste und die Maße, mit denen die Spüle
  rechnet), die **Tomatensuppe** (was der Baukasten dafür hätte, ist
  Pizzasoße — eine Pfütze von 78 cm, breiter als der ganze Teller) und das
  **Wasser im Topf** (kein Gegenstand, sondern ein Spiegel in einem Gefäß).

**Und sie ist gepackt.** 156 Stücke sind roh 3,2 MB; mit quantisierter
Geometrie und `EXT_meshopt_compression` sind es 1,1 MB, die Textur
eingerechnet. Die
bleibt dabei **in voller Größe** — anders als beim ersten Katalog, wo 2048er
PNGs auf 512 geschrumpft wurden: Dort ist die Textur eine Zeichnung, hier eine
Farbtafel aus zweiunddreißig Feldern, und jede Verkleinerung rückt deren
Grenzen zusammen, an denen der Filter zwei Farben zu einer dritten mischt. Der Preis ist ein Entpacker — genommen wird der, der three.js
ohnehin beiliegt (`examples/jsm/libs/meshopt_decoder.module.js`, rund 25 KB,
von Vite mitgebündelt) und **nicht** Draco: Das hätte die Datei auf gut 600 KB
gedrückt und dafür 250 KB WebAssembly gebraucht, die jemand von Hand nach
`public/` legt. Ein halbes Megabyte gespart und ein Auslieferungsfehler mehr
möglich ist kein guter Tausch.

Die Dateien: `core/dinerFit.ts` (Maße, ohne three.js), `core/dinerModel.ts`
(Lader), `worlds/test/zones/dinerPlan.ts` (Aufbau und Stempel, ohne three.js),
`worlds/test/zones/diner.ts` (die Zone). Dieselbe Teilung wie bei der ersten
Küche und aus demselben Grund: Rechnung getrennt von Darstellung.

## Eine Build-Nummer an jeder Adresse

Modelle und Töne liegen unter **festen** Namen (`models/kitchen.glb`,
`audio/kitchen/pick-0.ogg`) — anders als die Skripte, deren Dateiname den Hash
ihres Inhalts trägt. Der Service Worker beantwortet feste Namen mit
_stale-while-revalidate_ (`core/swRoutes.ts`): sofort aus dem Speicher, und
erst **danach** wird im Netz nachgesehen. Für ein Telefon ist das genau
richtig — nur heißt es eben auch, dass man nach einem Deploy beim ersten Start
noch den alten Stand sieht.

**Und so ist es aufgefallen**: Ein Feuerlöscher stand auf einem Hocker, den es
im Repository seit zwei Builds nicht mehr gab. Man sieht einem Bild nicht an,
dass es an einem Speicher liegt und nicht am Katalog; gesucht wurde der Fehler
im Modell.

Seitdem hängt an jeder dieser Adressen die Build-Nummer
(`core/assetVersion.ts`, `versioned`): `models/kitchen.glb?v=1a2b3c`. Darauf
hat kein Speicher eine Antwort — auch der Service Worker des **vorigen**
Builds nicht, der auf dem Telefon noch läuft, während die neue Seite schon
geladen ist. Beim Aktivieren wirft der neue dann weg, was ein fremdes `v=`
trägt (`sw.ts`, `dropOldMedia`); was **kein** `v=` hat, bleibt liegen — die
Controller-Modelle ändern sich nicht mit dem Build und sollen nicht nach jedem
Deploy neu über das Netz.

Ein Hash im **Dateinamen** wäre das Übliche und geht hier nicht: Diese Dateien
liegen in `public/` und werden unverändert kopiert. Sie durch den Bündler zu
schicken, hieße 2,5 MB Modelle und Töne zu importieren, die niemand
importiert, sondern die geladen werden, wenn eine Welt sie braucht.

## Und der Ton wird aufgeschlossen, nicht eingeschaltet

**„Warum höre ich in der PWA nichts? Im Web schon."** Der Satz beschreibt den
Fehler genauer, als er klingt — denn es ist kein Fehler am Ton, sondern einer
an der **Reihenfolge**.

Web Audio darf nicht von allein loslegen: Ein `AudioContext` fängt angehalten
an und läuft erst nach einer Geste des Spielers. Nur sind die Browser sich
nicht einig, wie lange eine Geste zählt. **Chromium** kennt _sticky
activation_ — wer einmal geklickt hat, darf für den Rest der Sitzung einen
Kontext aufmachen, und der läuft sofort. **WebKit** (iPhone, iPad und jede
dorthin installierte App) kennt nur _transient activation_: Der Kontext muss
**im Ereignis selbst** entstehen oder fortgesetzt werden. Ein `resume()`
danach — aus dem Bildtakt, nach dem Laden einer Welt — wird still abgelehnt,
und der Kontext bleibt für immer angehalten.

Diese Spielwiese machte ihren Kontext genau dort auf, wo man es beim Schreiben
für sparsam hält: **beim ersten Ton**, also wenn eine Zone ihre Aufnahmen holt
(`zones/kitchenAudio.prime`). Zwischen dem Druck auf *Starten* und diesem
Augenblick liegen ein Weltmodul, ein Modell und ein paar Megabyte Ton. Auf
Chromium ging das gut, auf WebKit ist es Sekunden zu spät — und deshalb ist
„im Browser ja, in der App nein" kein Zufall, sondern das erwartbare Bild.

Seitdem gibt es `core/audioUnlock.ts`, und es sind zwei Zeilen Absicht:

- **Im Klick auf *Starten*** (`main.ts`) wird der Kontext angefasst, nicht
  danach. Das ist die Geste, die jeder Spieler ohnehin macht.
- **Und jede weitere Geste versucht es wieder** (`armAudioUnlock`:
  `pointerdown`, `pointerup`, `touchend`, `keydown`, `click`), solange der
  Kontext nicht `running` meldet. Angemeldet bleibt das **für immer**, und das
  ist der zweite Grund für die Datei: Ein laufender Kontext bleibt nicht
  laufend. iOS kennt dafür sogar einen eigenen Zustand — `interrupted`, wenn
  ein Anruf kommt oder man die App wegschiebt. Wer sich nach dem ersten Erfolg
  abmeldete, hätte nach dem ersten App-Wechsel eine stille Küche, die sich mit
  keiner Geste mehr heilen ließe. Der Preis ist ein Vergleich je Fingertipp.

Dazu der **stille Puffer**: ein einzelnes Sample, eine
Achtundvierzigtausendstelsekunde, nicht zu hören. `resume()` allein genügt
WebKit nicht immer; ein abgespieltes Sample ist der Beweis, dass es aus einer
Geste heraus geschah. Es ist die übliche und einzige Art, ein iPhone
aufzuschließen.

**Was daran zu prüfen ist, ist nicht der Klang**, sondern wann angefasst wird
und wie oft — und genau das steht im Test (`core/audioUnlock.test.ts`, an
einem nachgebauten Kontext, weil Jest kein Web Audio hat).

## Und dann zog die erste Küche in den zweiten Katalog um

Der zweite Baukasten war als **Auslage** gebaut worden — hinstellen, ansehen,
entscheiden, was brauchbar ist. Die Antwort auf diese Frage war: fast alles.
Von den sechsundzwanzig Stücken des ersten Katalogs stehen seitdem **fünfzehn**
auf Netzen aus `diner.glb`, und `kitchen.glb` ist von dreizehn Knoten auf
**fünf** zusammengeschrumpft (480 → 233 KB). Vier der fünfzehn sind gar nicht
umgezogen, sondern **dazugekommen**: die Vorratskisten, die es in der ersten
Quelle nie gab.

**Was geblieben ist und warum:**

| Knoten | Grund |
| --- | --- |
| `extinguisher` | **Nur noch der Löscher**, ohne seinen Hocker: Er ist ein getragenes Gerät (`kitchenGrab.ts`) und steht seitdem auf einer Arbeitsplatte wie die Pfanne auf einem Herd. |
| `bin` | Der Mülleimer — im zweiten Baukasten gibt es keinen. |
| `pass` | Die Ausgabetheke, zwei Kacheln breit. |
| `plate-rack` | Das Ausgaberegal darüber. |
| `pan` | **Nur noch die Pfanne**, ohne ihren Herd: An ihr hängen die Bratregeln und ein nachgemessener Muldenversatz (`PAN_BOWL`). |

Ausgedünnt wird mit `node tools/kitchen-model.mjs --trim`, und die Liste steht
im Werkzeug (`KEEP`) und nicht nur im Ergebnis: Wer die Quelle — die nicht im
Repository liegt — noch einmal aufbereitet, bekommt dieselbe schlanke Datei.

**Die Spielregel hängt am Katalognamen und nicht am Netz.** Das ist der Satz,
an dem dieser Umbau überhaupt möglich war: Ein `board` schneidet, ein
`sink-basin` spült, eine `serve-counter` gibt aus — entschieden wird das in
`zones/kitchenPlan.stationKind`, und zwar über den **Namen**. Der Katalog sagt
mit `KitchenPiece.base` nur noch, **woher das Bild kommt**. Dreiundvierzig
Aufstellorte, neun Stationsarten und rund zweihundertsiebzig Testfälle haben
den Tausch deshalb unverändert überstanden.

**Zwei neue Felder, und eines abgeschafft:**

- **`base`** — der Sockel: Datei und Knoten (`{ file: 'diner', node: … }`).
- **`over`** — eine **Liste** dessen, was daraufsteht, je mit der Höhe, auf der
  es steht: das Brett auf der Zeile **und das Messer darin**, der Topf auf dem
  Herd, das Abtropfgitter auf der Zeile, der Löscher auf der Platte, der Deckel
  auf der Ausgabekiste. Der erste Baukasten lieferte solche Paare als **ein**
  Netz mit zwei Materialien, und der Lader schnitt sie am Material wieder
  auseinander; der zweite liefert zwei Knoten, und der Katalog sagt
  ausdrücklich, welcher obendrauf gehört. **Aufgesetzt wird mit der Unterkante**
  (`kitchenModel.lay`) und nicht mit dem Ursprung: Die Pfanne trägt in ihren
  Eckpunkten noch die Höhe des Herds, auf dem sie in ihrer alten Datei stand,
  und um 0,60 verschoben schwebte sie einen halben Meter über dem Rost. Beim
  **Messer** ist die Unterkante sogar mit Absicht 10,5 cm **unter** der
  Brettoberfläche — dann steckt es darin statt darauf.
- **`align` und `bury` haben keinen Fall mehr.** Beide glichen aus, was der
  erste Baukasten schief lieferte — der Türgriff, der die Zeile um 3,07 cm
  verschob, die Herde, die 8 cm hinter sie zurücksprangen, das Brett, das um
  seine eigene Dicke im Estrich versenkt wurde. Die Möbel des zweiten stehen
  mittig auf ihrer Kachel und auf ihrem eigenen Boden. Die Felder bleiben
  trotzdem: Die nächste Quelle tut es vielleicht nicht.

**Und zwei große Blöcke sind weggefallen**, beide Notoperationen an einer
Quelle, die es nicht mehr gibt: `splitSink` (knapp zweihundert Zeilen
Geometriechirurgie, die aus einer Spüle von vier Metern zwei Kacheln schnitt —
der zweite Baukasten hat eine von **einer** Kachel) und `erasePrintedPlate`
(ein UV-Flicken gegen einen aufgedruckten Teller — die Ausgabe ist heute eine
Kiste mit Deckel).

**Nachgemessen ist wieder alles**, und zwei Zahlen haben sich dabei geändert,
die man im Spiel sieht:

- **Die Kochstellen liegen jetzt auf 0,60 m** statt 0,55 m — das ist die
  Oberkante der **Roste**; die Platte darunter liegt wie jede Arbeitsfläche
  auf 0,50 m. Die sichere Kochstelle ist mitgewachsen: Sie war schon immer so
  hoch wie ein Herd.
- **Das Spülbecken ist 19 cm tief**, und diese Zahl war eine Weile falsch. Beim
  Umzug auf den zweiten Baukasten bekam `SINK_BOWL.floor` denselben Wert wie
  `rim` — damit war die Wanne rechnerisch randvoll, `kitchenProps.SINK_TILT`
  rechnete null heraus, und der Teller lag flach obendrauf statt schräg
  darin. Nachgemessen am Becken von `kitchencounter_sink.gltf` (112 Dreiecke)
  liegt der Boden auf 0,35 und der Rand auf 0,54, das Wasser dazwischen auf
  0,445. Die Formel blieb dieselbe und liefert jetzt **23,6°**: Der Teller
  lehnt vom Beckenboden bis auf Randhöhe und steckt dabei fast zur Hälfte im
  Wasser. Dass er passt, ist kein Zufall, sondern dieselbe Rechnung —
  0,475 m · cos 23,6° = 0,435 m, und die Mulde ist 0,5 m tief.

**Der Küchenkatalog** (`core/kitchenFit.ts`) hat sechsundzwanzig Möbel:
Tellerkiste, Feuerlöscher, **Spülbecken**, **Abtropfgitter**, Mülleimer,
Arbeitstisch, Ausgabe, die vier **Vorratskisten** (Brötchen, Patty, Salat,
Tomate), Schneidebrett, Ausgaberegal, Ausgabetheke, Küchenzeile,
Herd, Herd mit Topf, Herd mit Pfanne — und das **Förderband**, das **Zugband**,
das **Filterband**, den **Kombinierer**, den **Mixer**, die **sichere
Kochstelle**, den **Computer-Tisch**
und den **Kopierer**, die in keiner Datei stecken, sondern gebaut werden
(`KitchenPiece.built`, siehe
_Anfassen in der Küche_). Der Katalog beschreibt, was in dieser Küche **steht**,
nicht, was gekauft wurde; wer `built` nicht liest, meldet eine fehlende Datei,
die es nicht gibt, und stellt einen grauen Würfel dorthin, wo ein Band stehen
soll.

Zweiundzwanzig aus **dreizehn Knoten**, und zwei Sachen erklären den Rest. Die
eine sind die **acht gebauten** Stücke, die in keiner Datei stehen. Die andere ist
die Spüle: Sie ist in
der Datei **ein** Möbel von vier Metern — links ein Becken, rechts ein
Abtropfbrett, in der Mitte die Armatur — und wird beim Laden in zwei Stücke von
je einer Kachel zerschnitten (`core/kitchenModel.splitSink`, siehe _Der Abwasch_
weiter unten). Teilnetze zum Trennen gibt es nicht; geschnitten wird die
Geometrie selbst, an einer **gemessenen** Naht bei x = 0.

Die dreizehn aus der Datei kommen aus einer **Schauraum-Szene**: ein Bild, das
jemand aufgebaut hat, in vier Netzen, die nur nach Material getrennt waren. Zerlegt wird sie über den
**Zusammenhang der Positionen** (nicht der Indizes — eine UV-Naht zerschneidet
sonst jedes Möbel an seinen Kanten) und dann wieder gebündelt über
**Grundriss und Höhe**. Die Höhe gehört dazu: Ohne sie klebte der Hängeschrank
am Unterschrank darunter fest, ein „Möbel" von 2,50 m mit anderthalb Metern
Luft in der Mitte.

Die Möbel sind in **Metern** gebaut — und zwar in den falschen. Nachgemessen
an der Datei ist eine Spüle dort 4 × 2,1 m groß und 2,3 m hoch, ein
Feuerlöscher 2 × 2 m und 2,5 m hoch, und der schmalste Unterschrank belegt
2 × 2 m. Das ist keine Küche, das ist eine Turnhalle: Neben einem Koch von
1,60 m (`core/chefFit.ts`) reichte ein Tresen bis über die Augen, und ein
einzelner Schrank war fünfmal so breit wie die Figur davor.

Also **halbiert** (`KITCHEN_SCALE`). Ein Unterschrank belegt damit **eine**
Kachel des Meterrasters (`worlds/nav/navTile.TILE`) und ist einen halben Meter
hoch; beim Vorbild liegt die Arbeitsplatte auf einem guten Drittel der
Figurenhöhe, und dort liegt sie jetzt auch. Der Faktor sitzt am **Lader**
(`core/kitchenModel.ts`) und nicht in der Quelldatei: Die ist fremde Arbeit und
wird nicht angefasst, und ein zweites Aufbereiten für eine Zahl wären 32 MB
Rohdaten für einen Faktor. Die Maße im Katalog sind die **fertigen** — was dort
steht, ist, wie groß ein Möbel im Spiel ist.

Die Kachelzahl ist dabei die **gerundete** Grundfläche und nicht die
aufgerundete: Ein Unterschrank ist einen Meter breit und 1,06 m tief, und wer
daraus zwei Kacheln macht, stellt eine ganze Zeile davon mit einem Meter Luft
dazwischen auf. Ein Möbel darf ein paar Zentimeter über seine Kachel
hinausragen; eine Küche mit Lücken darin ist keine Küche.

Die Namen und Maße stehen in `kitchenFit.ts`, das weder three.js noch
`import.meta` anfasst, damit Jest sie lesen kann.

**Aufgestellt sind sie in der Küche der Testwelt** (`worlds/test/zones/kitchen.ts`).
Der Katalog lag nach seinem Import ein halbes Jahr ungenutzt da: dreizehn
vermessene Möbel, eine Ladefunktion und keine Welt, die sie hinstellt. Jetzt
gibt es eine — drei **Reihen** wie in jeder Küche dieses Spiels (Geräte an der
Wand, eine Insel, die Ausgabe), dazu ein Gastraum davor, und daneben die Probe
darauf, dass die Kochfigur wirklich zu diesen Möbeln passt. („Reihen" und nicht
mehr „Bänder": Seit es ein Förderband gibt, ist das Wort vergeben.) Drei Dinge
sind daran wichtig genug, um sie hier zu nennen:

- **Der Grundriss weiß, wo ein Möbel steht**, auch wenn die Datei nie ankommt.
  Jedes Stück verteuert seine Kacheln (`stampKitchen`), und damit geht ein NPC
  um den Tresen herum statt hindurch. Ein Möbel, das nur im Bild existiert, ist
  ein Möbel, durch das gelaufen wird — ein Jest-Test hält das fest.
- **Ein Name darf mehrmals vorkommen.** Eine Küche hat mehr als einen
  Unterschrank, und seit die Möbel auf ihr richtiges Maß halbiert sind, passt
  auch eine **durchgehende Zeile** an die Wand — eine, an der man entlanggeht,
  ohne zwischen zwei Schränken ins Freie zu treten. Jedes Exemplar ist ohnehin
  eine eigene Kopie (`core/kitchenModel.ts`).
- **Ein hängendes Stück bekommt keinen Körper** (`KitchenPiece.hanging`):
  Darunter läuft man durch, und eine Kachel, die es teuer machte, wäre eine
  Kachel, um die ein NPC grundlos herumginge. **In dieser Fassung der Quelle
  tut es keines** — das Ausgaberegal stand im Katalog als hängendes Stück von
  3,52 m, und die Datei sagt etwas anderes: Es fängt wie jedes andere Möbel
  bei y = 0 an. Das war kein Schönheitsfehler, sondern ein Loch, durch das man
  mitten hindurchlief.

## Fünf Zahlen, die aus dem Katalog mehr machen als eine Liste

Der Katalog nennt zu jedem Möbel Name, Beschriftung, Grundfläche und Höhe.
Fünf weitere Felder sind dazugekommen, und jedes hat einen Fehler abgeräumt,
den man im Bild sah:

- **`align`** — wie weit ein Möbel aus der Mitte seiner Kachel rückt. Der
  Ursprung liegt in der Mitte der **ganzen** Hülle (`tools/kitchen-model.mjs`),
  und eine Hülle ist nicht der Korpus: Was übersteht, zieht den Ursprung zu
  sich und schiebt den Korpus in die Gegenrichtung. Die Linie, an der die
  Nordzeile ausgerichtet wird, ist deshalb **nachgemessen**: Der Korpus der
  _Küchenzeile_ reicht in der Datei von z = −1,0612 bis +0,9386 (2,0000 tief),
  die 2,1224 des Katalogs macht allein ihr **Türgriff** — die sichtbare
  Vorderkante liegt bei 0,4693 m vor der Kachelmitte und nicht bei 0,5306 m.
  Daran rücken fünf Möbel: _Schneidebrett_ und _Löscherhocker_ (gleich tief,
  aber mittig zentriert) um 3,07 cm nach **Norden**, die drei _Herde_ um 8 cm
  nach **Süden**, der _Herd mit Pfanne_ um weitere 7,8 cm, weil sein
  Pfannenstiel 16 cm nach Süden aus der Hülle ragt. Beim Brett stand diese Zahl
  lange mit dem falschen Vorzeichen (Hülle der Zeile gegen Korpus des Bretts
  gerechnet), und es stand 6,1 cm zu weit vorn. Bei den Herden ist es die Wand:
  Ihr Blech ist nur 0,9210 m tief, sprang vorn 8 cm hinter die Arbeitsplatten
  zurück und stand hinten 13,2 cm hinter der Innenseite der 0,2 m dicken
  Nordwand — sichtbar abgeschnitten, weil die Kochstelle ein aufgesetzter Klotz
  ist. Ganz aus der Wand kommt sie nicht: Zwischen Wandinnenseite und
  Zeilenlinie liegen 0,8693 m, 5,2 cm zu wenig. Die Vorderkante gewinnt, weil
  man nur sie sieht.
- **`deck`** — wo die Arbeitsfläche liegt, **über dem Fuß des Möbels**. Beim
  _Herd mit Topf_ ist `height` die Oberkante des **Topfes** (0,87 m) und nicht
  die der Platte (0,55 m); ein Brötchen, das auf `height` abgelegt würde,
  schwebte eine Handbreit über dem Deckel. Steht nur dort, wo es von `height`
  abweicht.
- **`bury`** — wie tief das Möbel im Boden steckt; derselbe Ausgleich wie
  `align`, nur nach unten statt zur Seite. Einen Fall gibt es, das
  **Schneidebrett**: Sein Brett liegt obenauf und ist 3,3 cm dick, also lag
  seine Arbeitsfläche 3,3 cm über der Küchenzeile daneben — eine Stufe in einer
  Reihe, die eine Platte sein soll. Versenkt wird deshalb das ganze Möbel um
  genau diese 3,3 cm; im Boden steckt Sockelleiste, oben fluchtet die Fläche.
  Wie hoch eine Arbeitsfläche **im Raum** liegt, sagt `kitchenWorkHeight` —
  `deck` allein tut es seitdem nicht mehr. Nicht zu verwechseln mit `Spot.lift`
  (`zones/kitchenPlan.ts`): Das gehört einer **Stelle** im Aufbau (das
  Ausgaberegal über der Theke) und lässt den Körper weg, `bury` gehört dem
  **Möbel** und gilt überall, wo es steht — auch im Schauraum.
- **`worktop`** — ob man darauf etwas ablegen kann. Nicht jede waagerechte
  Fläche ist eine: In den Mülleimer wird geworfen, auf einem Feuerlöscher steht
  nichts.
- **`holds`** — was sich herunternehmen lässt. Topf und Pfanne sind im Modell
  **eigene Netze** (Material `Kitchen_Utensils`), also kommt ein Herd mit Topf
  als Gruppe aus Korpus und Topf aus der Datei — und `kitchenModel.takeUtensil`
  hängt den Topf aus, gibt ihm seinen Ursprung auf seinem eigenen Boden und
  lässt einen leeren Herd stehen.

## Anfassen in der Küche

Was `A` vor einem Möbel tut, steht in **einer** Funktion
(`worlds/test/zones/kitchenCarry.ts`, `kitchenDeed`) und nicht in elf
`if`-Ketten in der Zone daneben. Sechzehn Stationsarten (`StationKind`) —
Ablage, Kiste, **Vorratskiste**, Mülleimer, Schneidebrett, Herd, Ausgabetheke,
Löscherhalterung, Spülbecken, **Abtropfgitter**, Geschirrrückgabe, Gästetisch,
Band, **Kombinierer**, **Mixer**, **sichere Kochstelle** — mal volle
oder leere Hand ergeben ein
paar Dutzend Fälle, und jeder davon ist hier eine Zeile im Test und im Headset
eine Viertelstunde Hin- und Herlaufen.

Die Küche liegt seitdem in dreiundzwanzig Dateien, dazu eine
vierundzwanzigste im `ui/`, die längst nicht mehr nur ihr gehört. Die Grenze ist jedes Mal dieselbe: **Rechnung
getrennt von Darstellung** — was ohne three.js auskommt, kommt ohne three.js
aus, und genau das ist der Grund, warum es so viele Dateien sind.

| Datei | Was darin steht |
| --- | --- |
| `zones/kitchenRecipes.ts` | Zutaten, Träger, Stufen, `combine`, Rezepte |
| `zones/kitchenClock.ts` | die Uhr des **Herdes**: braten, verbrennen, entzünden |
| `zones/kitchenWork.ts` | die Uhr der **Arbeit**: schneiden, spülen, mixen, braten — eine Rechnung |
| `zones/kitchenGuests.ts` | wer an einem Tisch isst, wie lange, und was stehen bleibt |
| `zones/kitchenBuild.ts` | welche Kachel gemeint ist und ob dort Platz ist |
| `zones/kitchenSpray.ts` | der Feuerlöscher: Kegel, Schalter, Fortschritt, Nebel |
| `zones/kitchenBelt.ts` | die Bänder: Laufzeit, Laufrichtung, Ziehen, Nachbarn, Netz |
| `zones/kitchenCombiner.ts` | der Kombinierer: seine Uhr, wann er hergibt, sein Netz |
| `zones/kitchenMixer.ts` | der Mixer: das Möbel zur Uhr aus `kitchenWork.ts` |
| `zones/kitchenGriddle.ts` | die sichere Kochstelle: das Möbel zur Bratstufe ohne Feuer |
| `zones/kitchenDesk.ts` | Computer-Tisch und Kopierer: Seite, Felder, Netz |
| `zones/kitchenGrab.ts` | welches Küchending die Hand wo anfasst |
| `zones/kitchenCarry.ts` | Stationen und `kitchenDeed`; reicht alle Uhren weiter |
| `zones/kitchenPlan.ts` | wo welches Möbel steht, der Grundriss, das Schild |
| `zones/kitchen.ts` | die Zone: Netze, Körper, Anzeigen, Anfassen |
| `zones/kitchenProps.ts` | `FoodKit`: aus einem Gericht wird ein Netz |
| `zones/kitchenIcon.ts` | der Ofen, der aus einer Zutat eine Textur backt |
| `zones/kitchenGauge.ts` | Balken, Warndreieck und Flammen über den Stationen |
| `zones/kitchenNotice.ts` | der Aushang an der Nordwand: Markdown, gesetzt an der Wand |
| `zones/kitchenFloor.ts` | der karierte Boden: Feldgröße, Töne, Fuge, die Fläche darüber |
| `zones/kitchenSound.ts` | die Rechnung der Geräusche: Tabelle, Entfernung, Takt, Schritte |
| `zones/kitchenAudio.ts` | der Spieler dazu: Stimmen, Schleifen, Dateien, Web Audio |
| `zones/kitchenRadio.ts` | das Radio: Sender, Schalter, und der Kasten dazu |
| `ui/billboard.ts` | `faceCamera`: was Auskunft gibt, steht parallel zum Bild |

Die jüngsten kamen mit dem Geschirr, den Gästen, dem Band, dem Löscher, dem
Umbau, dem Rechner und zuletzt der Bandstraße dazu, und jede ist aus demselben
Grund eine **eigene** Datei: Sie rechnet etwas aus, das man ohne Szene prüfen
kann.

- **Welche Station arbeitet, steht in einer Tabelle und nicht in einer
  `if`-Kette** (`kitchenCarry.STATION_WORK`, ein Eintrag je `StationKind`).
  Das ist keine Kosmetik, sondern die Lehre aus einem Fehler, der durch alle
  Tests kam und im Spiel sofort zu sehen war: Die sichere Kochstelle stand im
  Grundriss, ihr Möbel war gebaut, ihre Regel war geschrieben und geprüft — nur
  zählte die Zone beim Anlegen der Uhr (`settle`) und beim Weiterdrehen
  (`cook`) je drei Möbel auf und nicht vier. Also lag das Patty da und wurde
  nicht gebraten, und die Burgerstraße lieferte rohe Pattys. Eine **vollständige**
  Tabelle über `StationKind` kann diesen Fehler nicht mehr haben: Wer eine
  Stationsart dazutut, bekommt vom Übersetzer die Frage gestellt, ob an ihr
  gearbeitet wird. `null` heißt „nein" und ist ein Eintrag wie jeder andere —
  ein **fehlender** Schlüssel wäre dieselbe Lücke eine Ebene tiefer.
- **`kitchenWork.ts` ist die eine Stelle für „Arbeit an einer Station über
  Zeit".** Das Schneidebrett hatte seine Uhr einmal für sich allein (sie stand
  in `kitchenClock.ts`); mit der Spüle hätte es daneben ein zweites
  `advanceChop` gegeben, das bis auf zwei Namen dasselbe tut — samt zweitem
  Balken und zweiter Gelegenheit, eines von beidem zu vergessen. Der **Herd**
  bleibt bewusst draußen: Er läuft weiter, ob jemand davorsteht oder nicht, und
  das ist der ganze Sinn des Bratens. Hier ist es umgekehrt, und zwei
  Rechnungen mit gegenteiliger Grundannahme gehören nicht in eine Funktion.
  Wo Brett und Becken doch auseinandergehen — das Fertige bleibt liegen oder
  geht in die Hand —, steht das als **ein Tabelleneintrag** in derselben Datei
  (`WORK_TO_HAND`) und nicht als Sonderfall in der Zone.
- **`kitchenGuests.ts` ist die Uhr des Gastes** — wer isst, wie lange noch, und
  was danach auf dem Tisch stehen bleibt (`EAT_SECONDS` 8 s, `TableState`).
  Sie steht aus demselben Grund neben der Zone wie der Herd: Wer den Rest einer
  Phase am Ende wegwirft, dessen Gäste essen je nach Bildrate verschieden lang.
- **`kitchenBuild.ts` rechnet in Kacheln**, nicht in Metern: welche Kachel vor
  den Füßen liegt (`tileAhead`, `BUILD_AHEAD` = 0,7 m) und ob dort noch Platz
  ist (`buildFree`, `whyNotBuilt`). Wie herum ein Möbel steht, steht **nicht**
  darin — das rechnet `kitchenPlan.footprint` längst aus Katalogmaß und
  Drehung, und eine zweite Fassung davon wäre die zweite Wahrheit.
- **`kitchenSpray.ts` und `kitchenBelt.ts` sind je dreigeteilt**, und nur der
  mittlere Teil kennt three.js: reine Rechnung (`inSpray`, `sprayOn`,
  `advanceDouse`; `advanceBelt`, `beltStep`), dann das Netz, dann nichts weiter
  — was die Küche mit dem Ergebnis anstellt, entscheidet sie selbst.
- **`ui/billboard.ts` liegt bewusst nicht bei der Küche.** Die Rechnung stand
  vorher in `kitchenGauge.ts` und hätte beim nächsten Schild ein zweites Mal
  dagestanden; ein Ding, das der Kamera zugewandt stehen will, ist keine
  Küchenfrage. Ausführlich unter _Was die Kamera ansieht_.
- **`kitchenDesk.ts` ist genauso geteilt**, und nur der untere Teil kennt
  three.js: Von welcher Seite jemand vor einem Möbel steht (`pieceSide`) und wo
  auf einem gedrehten Kopierer seine beiden Felder liegen (`copierSpot`,
  `copierField`) sind reine Zahlen; darunter liegt der Bausatz, der Tisch und
  Kopierer baut. Beide Möbel stecken in keiner Quelldatei — ein Rechner ist
  keines der dreizehn gekauften Stücke —, tragen deshalb `built: true` und
  werden gebaut wie das Band nebenan.
- **Der Ton ist genauso geteilt wie alles andere hier.** `kitchenSound.ts`
  rechnet und kennt weder three.js noch Web Audio: die **Tabelle** der Töne
  (`KITCHEN_CUES`, Datei, Pegel, Schleife ja/nein), die **Tabelle der Taten**
  (`DEED_SOUNDS`, ein Eintrag je `KitchenDeed['do']` — dieselbe Vollständigkeit
  wie bei `STATION_WORK`, und aus demselben Grund), das **Hörmodell**
  (`kitchenHeard`: Entfernung und Balance auf dem Boden, wie beim Anfassen;
  `kitchenNearest`: von vier brennenden Herden zählt der nächste; die
  **Reichweite** steht am Ton und nicht in der Formel, siehe unten), der **Takt**
  des Messers (`kitchenBeat` — höchstens ein Schlag je Bild, sonst macht ein
  Ruckler eine Salve daraus) und die **Auswahl** der beiden Töne, über die noch
  nicht entschieden ist (`SOUND_TRIALS`, siehe unten). **Schritte macht die
  Küche nicht**: Es gab vier Aufnahmen und eine Schrittuhr nach der Strecke,
  und beim Kochen war das ein Trommeln unter allem, was man hören wollte.
  Daneben liegt `kitchenAudio.ts` mit acht Stimmen und je Schleife einer, auf dem
  gemeinsamen Kontext aus `core/Audio.ts`; die Zone dazwischen sammelt in
  `listen(dt)` ein, was gerade zischt, und spielt in `act` **eine** Zeile ab
  statt in elf `case`-Zweigen. Die Aufnahmen sind CC0 und liegen in
  `public/audio/kitchen/` (`CREDITS.md` dort: Herkunft, Urheber, Bearbeitung).
  **Es gibt keinen synthetisierten Ersatzton**, anders als bei der Raumstation
  (`haunting/audio/cues.ts`): Bis eine Aufnahme entpackt ist, bleibt es still.
  Ein Platzhalter, der eine halbe Minute lang anders klingt als das, was danach
  kommt, ist kein Platzhalter, sondern ein zweites Geräusch.
- **Jeder Ton bringt seine eigene Reichweite mit** (`KitchenReach`,
  `KitchenCueSpec.reach`, `reachOf`). Vorher galt für alles dieselbe Kurve: ab
  dem ersten Meter leiser, nach `KITCHEN_EAR` still. Für das Zischen einer
  Pfanne ist das richtig, für das Radio nicht — „die Entfernung aus der man das
  Radio hören kann ist zu gering" —, und ein lauteres Radio hätte nur den Pegel
  daneben verschoben, nicht die Reichweite. Eine Reichweite sind deshalb **zwei**
  Zahlen: bis `full` voll, ab `gone` still, dazwischen derselbe Abfall wie
  bisher. `NEARBY` (`full: 0`) ist die alte Kurve Zahl für Zahl — ein Test hält
  das fest, und deshalb blieb jeder vorhandene Tontest unverändert grün.
  `EVERY_ROOM` reicht über die ganze Küche und fällt erst draußen ab,
  `EVERYWHERE` über das ganze Feld. Beide sind aus `layout.KITCHEN` bzw.
  `layout.FIELD` gerechnet und nicht getippt: Wächst die Küche, wächst die
  Reichweite mit. Warnung, Feueralarm und **Radio** stehen heute auf
  `EVERY_ROOM`; wer das Radio in der **ganzen Welt** hören will, tauscht in
  `KITCHEN_CUES` ein Wort.
- **Zwei Töne stehen noch zur Wahl, und die Wahl steht im Schauraum**
  (`kitchenSound.SOUND_TRIALS`, `kitchenPlan.TRIAL_BUTTONS`,
  `kitchen.addTrialButtons`). Wie das **Messer** auf dem Brett klingt und wie
  die **Abgabe** eines Gerichts, entscheidet niemand am Schreibtisch; also
  stehen je zwei rote Knöpfe vor dem Schneidebrett und vor der Ausgabetheke —
  links weiterschalten, rechts vorspielen —, und auf beiden Schildern steht,
  welche Variante gerade gilt. Eine Variante ist ein **Satz** Aufnahmen und
  keine Datei: Das Messer schlägt siebenmal je Schnitt auf, die Abgabe kommt
  einmal. Geschaltet wird der Vorrat, aus dem der Spieler würfelt
  (`kitchenAudio.choose`), also klingt die ganze Küche danach so und nicht nur
  die Vorführung. Geladen wird beim Aufbau der Zone **alles**, auch was gerade
  nicht läuft (`kitchenSoundFiles`) — wer erst beim Druck lädt, hört Stille,
  wo er vergleichen wollte. **Das ist Gerüst**: Steht die Wahl, fallen Knöpfe
  und Auswahl heraus, und übrig bleibt der Satz, der gewonnen hat.
- **Das Radio ist kein Möbel** (`kitchenRadio.ts`, `kitchenPlan.RADIO_TILE`).
  Es steht in keiner Möbelliste und lässt sich nicht umbauen — dieselbe
  Begründung wie bei den beiden roten Knöpfen: Ein Gerät, das man im Baumodus
  in eine Ecke stellen kann, spielt irgendwann und wird nicht mehr gefunden.
  Es steht in derselben Spalte an der Westwand wie sie (x = 0), und ein Test
  hält fest, dass seine Kachel frei ist. Sein Schalter ist ein **Schalter** und
  keine Liste: `A` macht an, `A` macht aus — und jedes Anmachen rückt einen
  Sender weiter (`radioToggle`). Die Musik selbst schaltet er nicht ein; er
  setzt nur ein Feld, und `listen` legt die Schleife jedes Bild auf diesen
  Stand. Wer hier eine Schleife startete, müsste sie auch beim Umbau, beim
  Weggehen und beim Verlassen der Welt wieder abstellen — und die vierte
  dieser Stellen ist die, die man vergisst.

Und das sind die Regeln, die darin stehen:

- **Träger statt Anrichte.** Es gibt genau drei Dinge, die über `combine`
  etwas aufnehmen: **Teller**, **Brötchen** und **Pfanne** (`isCarrier`). Der
  **Topf** hält zwar Wasser, steht aber mit Absicht in keiner Zeile von `TAKES`
  — sein Inhalt kommt aus dem Hahn und nicht aus einer Hand, siehe unten. Ein getragenes Ding
  ist deshalb kein Name mehr, sondern `Dish = { item, on[] }` — ein Brötchen
  mit Patty und Salat ist ein `bun` mit zwei Sachen darauf. Damit fällt das
  Möbel weg, auf dem als einzigem ein Burger entstehen konnte: Kombiniert wird
  überall, wo etwas liegt.
- **Die Reihenfolge ist egal, die Richtung auch.** `combine(held, target)`
  probiert beide Richtungen: Patty auf Brötchen und Brötchen auf Patty geben
  denselben Burger, nur einmal bleibt er an der Station und einmal in der Hand.
  Was **nicht** geht, sagt seinen Grund: Salat auf ein Patty legen geht nicht,
  weil ein Patty nichts trägt; rohes kommt mit „muss erst gebraten werden"
  zurück und nicht mit „geht nicht".
- **Das Brötchen kippt flach auf den Teller.** `plate.on` enthält `['bun',
  …]` und kein Brötchen, das seinerseits etwas trägt — jede Frage danach wäre
  sonst ein Abstieg statt eines `includes`.
- **Aus der Pfanne nimmt man nichts heraus.** Man nimmt die **Pfanne** mit dem
  Patty darin und kippt sie über Brötchen oder Teller aus; sie bleibt dabei,
  wo sie war (in der Hand oder auf dem Herd). Das ist der Griff aus
  _Overcooked_, und er erspart einen Sonderfall „Patty aus Gerät".
- **Verbranntes bleibt in der Pfanne** (`TAKES`). Es auf Teller und Brötchen
  zu erlauben, war einmal die bequeme Art, den Mist abzuräumen; in Wahrheit
  baut man damit einen Burger, den die Theke abweist — eine Sackgasse, die erst
  drei Schritte später auffällt. Die Pfanne behält es, weil es dort ohne Zutun
  entsteht, und man kippt sie in den Mülleimer aus.
- **Eine Kiste gibt aus und ist zugleich Arbeitsplatte** (`fromBox`, `'box'`).
  Das Zweite hat einen sichtbaren Grund: Wer mit vollen Händen an einer Ausgabe
  ankommt, braucht einen Platz, etwas abzulegen. Was auf dem Deckel liegt, geht
  dabei **vor** dem Frischen: Die Kiste gibt ihr Frisches ja noch beliebig oft,
  das Liegende gibt es einmal. Geblieben ist die Regel dahinter: Wer mit der
  vollen Pfanne an die Brötchenausgabe trat, bekam einmal ein Brötchen mit
  Patty, das niemandem gehörte — im Browser nachgestellt, das Patty war spurlos
  weg. Was aus dem Nichts kommt, muss deshalb in die **Hand** passen; alles
  andere ist „Erst die Hände frei machen".
- **Eine Vorratskiste gibt aus und nimmt zurück, mehr nicht** (`fromCrate`,
  `'crate'`, `KitchenPiece.supply`). Der Unterschied zur `box` ist eine Zeile:
  Auf ihr wird **nichts abgestellt** — sie ist offen und bis oben voll, und was
  jemand darauf legte, balancierte auf einem Haufen Tomaten. Dafür kann man
  hineinlegen: Wer ihre Zutat **blank** in der Hand hält, legt sie zurück
  (`'stow'`), statt den Mülleimer suchen zu müssen; ein Brötchen mit Patty
  darauf nicht, denn was dabei mit dem Patty geschähe, wäre genau das stille
  Verschwinden, gegen das der Rest dieser Liste steht. Und **leer wird sie
  nie** — das ist der Unterschied zum Abtropfgitter, das gezählten Inhalt hat.
  So kam auch die **Tellerkiste** (`plate-counter`) zu dieser Art: Sie war eine
  `box` und damit eine Ablage, auf der Teller herumstanden. Heute ist sie eine
  Kiste mit sechs sichtbaren Tellern darin, gibt beliebig viele her und nimmt
  jeden blanken zurück.

  **Und sie steht auf dem Boden**, seit einem Spieltest weiter: „Nur soll die
  Teller Kiste nicht auf einer Arbeitsplatte stehen." Eine Kachel lang stand
  sie auf einem Unterschrank, und das war wieder derselbe Widerspruch wie beim
  Abtropfgitter davor — die vier Vorratskisten **sind** ihr Möbel und stehen
  nicht auf einem. Eine fünfte Kiste mit eigenem Sockel sähe aus wie ein
  Sonderfall, den es nicht gibt. `base` ist deshalb die Kiste selbst
  (`dinerPiece('crate')`, 0,40 m), die sechs Teller stapeln sich darin von 0,05
  bis 0,35 und bleiben unter dem Rand, und wie bei den Vorratskisten ist die
  Oberkante zugleich die Ablage — ein eigener `deck` fällt damit weg.
- **Der Herd hat vier Phasen** (`kitchenClock.ts`): vier Sekunden braten,
  sechs verbrennen, fünf bis zum Feuer, dann brennt es. Dazu gehören die
  Anzeigen: Flammen unter der Pfanne, ein Fortschrittsbalken in Warm, einer in
  Rot, ein Warndreieck kurz vorher. Ein brennender Herd ist keine Fläche mehr —
  solange es brennt, geht dort nur noch eines. **Balken und Dreieck werden ohne
  Tiefenprüfung gezeichnet** (`kitchenGauge.skin`, `front`): Sie schweben eine
  Handbreit über der Platte, und genau dort steht auch das, worüber sie etwas
  sagen — von schräg oben schnitt der Balken durch das Patty, und man las die
  Hälfte. Jetzt liegt er **vor** seinem Möbel. Die **Flammen** bleiben
  ausgenommen: Sie sind Kegel im Raum, und ein Feuer, das durch die Wand des
  Nachbarraums leuchtet, ist ein Fehler und kein Hinweis.
- **Ein Griff an die Pfanne löscht die angefangene Stufe, in beide Richtungen**
  (`kitchenClock.stoveUnder`). Auf dem Herd steht die Pfanne, **in** ihr liegt
  das Patty; liegt dort etwas anderes — ein Teller, ein Brötchen, gar nichts —,
  brät nichts. Hochheben löscht die Uhr, weil dann nichts mehr darauf steht,
  Hinstellen löscht sie ebenso, weil `onStove` bei null anfängt. Eine Stufe muss
  also **am Stück** durchlaufen: Wer die Pfanne eine halbe Sekunde vor dem
  Umschlagen anhebt, fängt danach wieder bei null an. Die erreichte **Stufe**
  reist dabei in der Pfanne mit (sie steht im `Dish`) und geht nicht verloren;
  nur der angefangene Rest tut es. Die Rechnung stand bis eben mitten in der
  Zone (`kitchen.ts`, `settle`) und damit an der einen Stelle, die kein Test
  lesen kann — die Zone braucht three.js, ein Netz und einen Wirt. Bewiesen war
  deshalb nur `onStove` allein und nirgends der Weg dorthin, und das ist die
  Hälfte, die man beim nächsten Umbau kaputt macht, ohne dass etwas rot wird.
  Jetzt steht sie neben der Uhr und hat fünf Tests.
- **Der Feuerlöscher wird gehalten, nicht gedrückt** (`kitchenSpray.ts`). Er
  war einmal ein einzelner Druck auf `A` am brennenden Herd, und das ist kein
  Feuerlöscher, sondern ein Lichtschalter: Bei _Overcooked_ wie bei _PlateUp_
  **läuft** er, man hält ihn ins Feuer, und was im Strahl liegt, geht aus. Man
  nimmt ihn vom Hocker, auf dem er im Modell steht (`KitchenPiece.holds`), und
  zielt **in der Brille mit der Hand, die ihn hält** (`kitchen.aimJet`) — mit
  dem Zeigestrahl ihres Controllers, waagerecht gemacht, wie bei allem, was auf
  dem Boden gerechnet wird. Hier galt einmal auch dort der Kopf, und das war
  der gemeldete Fehler: „Ich will in die Richtung sprühen, in die meine Hand
  zeigt, nicht in der mein Körper gedreht ist." Wer sich zum brennenden Herd
  hindreht, ohne den Kopf mitzudrehen, pustete daneben. Von oben und aus den
  Augen bleibt es die Richtung, mit der auch `A` etwas erwischt — die Figur
  (der rechte Stock **ist** dort das Zielen) beziehungsweise der Kopf; dort
  gibt es keine Hand, die woandershin zeigt. Zeigt die Hand senkrecht nach
  unten, bleibt die des Körpers stehen: Ein Kegel ohne waagerechte Richtung
  löschte sonst rundum alles. Der Kegel reicht **2,5 m** weit (`SPRAY_RANGE`,
  deutlich weiter als der Griff mit 1,5 m — genau das ist der Sinn) und öffnet
  sich um **25°** zur Seite (`SPRAY_HALF_ANGLE`): auf einen Meter 0,93 m breit,
  also knapp eine Kachel, auf die volle Reichweite 2,33 m. Nah und genau, weit
  und ungefähr. Ein Herd im Strahl braucht **1,5 s** (`SPRAY_SECONDS`) — null
  wäre der alte Knopfdruck zurück, und viel mehr ginge nicht, weil eine Küche
  mit zwei brennenden Herden steht. Der alte Griff am brennenden Herd bleibt
  daneben bestehen (`kitchenDeed`, `do: 'douse'`): Wer schon davorsteht, soll
  nicht erst zielen müssen. Wie die Ansichten den Auslöser lesen, steht unter
  _Steuerung_.
- **Schneiden und Spülen sind dieselbe Uhr** (`kitchenWork.ts`,
  `WORK_SECONDS` = 3 s für beides; Mixer und sichere Kochstelle hängen mit vier
  und fünf Sekunden an derselben). Beide fangen mit dem **Ablegen** an und
  brauchen keinen zweiten Knopfdruck: Wer den Salatkopf auf das Brett legt,
  will schneiden, wer den dreckigen Teller ins Becken stellt, will spülen. Und
  beide laufen nur, solange jemand davorsteht (1,5 m um die Möbelmitte;
  `Station.live` heißt „hier gäbe es etwas zu tun" und nicht „jemand steht
  davor"). Die Tomate hat dabei zwei Stufen: Scheibe, dann Suppe.
- **Der einzige Unterschied zwischen Brett und Becken ist, wohin das Fertige
  geht** (`WORK_TO_HAND`, ein Eintrag je `WorkKind`). Am **Brett** bleibt es
  liegen — der geschnittene Salat will als Nächstes auf einen Teller, und wer
  ihn aufnimmt, hat damit schon entschieden, wohin. Aus dem **Becken** kommt
  der saubere Teller **in die Hand**: „Dreckigen Teller interagieren, dann wird
  abgewaschen. Ist es fertig, hat man einen sauberen Teller in der Hand" (aus
  dem Spieltest am Handy). Vorher stand er fertig gespült im Wasser, und der
  Weg kostete einen Griff mehr an genau der Stelle, an der man ohnehin schon
  stand — bis dahin war das Becken besetzt und der nächste dreckige Teller
  passte nicht hinein. **Ist die Hand voll**, bleibt er trotzdem stehen: Er
  drängt nichts aus der Hand, und ein Griff ans Becken holt ihn nach
  (`atSink`); die Zone sagt es dann auch an (`workWaits`). Die Tabelle ist die
  **eine** Stelle dafür — die Zone fragt `tick.toHand` und nie nach der
  Stationsart, und eine dritte Arbeitsart müsste ihren Eintrag beim Übersetzen
  nachreichen.
- **Wer weggeht, fängt von vorn an.** Früher blieb der Fortschritt stehen und
  lief beim Zurückkommen weiter — bequem, aber es machte aus dem Brett eine
  Ablage, an der man im Vorbeigehen antippt: hinlegen, zwei Sekunden warten,
  weglaufen, irgendwann wiederkommen, fertig. Arbeit, die man in Scheiben
  schneiden kann, ist keine Entscheidung mehr, sondern Buchhaltung. Jetzt
  bricht das Weggehen ab, und wer die Uhr wieder armieren will, zahlt dafür
  zwei Handgriffe: **erneut aufnehmen und erneut ablegen** (`onWork`). Damit
  steht man am Brett, weil die Küche es verlangt — und genau das ist bei
  _Overcooked_ die Arbeit. Dieselben zwei Handgriffe kosten auch die zweite
  Schnittstufe: Ist eine Stufe fertig, steht die Uhr, und aus einer Tomate wird
  nicht in einem Zug Suppe.
- **Über die Theke geht nur, was auf einem Teller liegt** (`atPass`), und
  **Teller und Gericht gehen zusammen weg**. Vorher verschwand der Burger und
  der Teller blieb in der Hand; damit endete ein Burger im Nichts und die
  Tellerkiste war ein Brunnen. Jetzt geht der Kreis weiter: Ein Gast setzt
  sich an einen freien **Gästetisch** und isst **8 s**
  (`kitchenGuests.EAT_SECONDS`, ungefähr so lang wie ein ganzer Burger von
  vorn) — an der Theke steht dabei vier Sekunden lang, was es geworden ist
  (`Hamburger serviert`, `TICKET_SECONDS`). Diese Tafel wird wie Balken und
  Warndreieck **ohne Tiefenprüfung** gezeichnet (`TextPlaneOptions.front`):
  Auf der Theke stehen Teller und Brötchen, darüber hängen die Wärmeschirme,
  und von schräg oben schnitt ein Brötchen quer durch das Wort — zu lesen war
  „Deluxe s…". Sie ist damit auch durch eine Wand zu sehen, und das ist der
  bewusste Handel: Sie steht vier Sekunden lang genau dort, wo gerade jemand
  abgegeben hat. Die **Namensschilder im Schauraum** bekommen das deshalb
  nicht — dort verdeckt ohnehin nichts ein Schild, und achtzehn Tafeln durch
  jede Wand wären der schlechtere Tausch. Ist kein Tisch frei, landet das
  Geschirr gleich an der **Geschirrrückgabe**. Dort **stapeln** sich die
  dreckigen Teller, bis zu sechs (`DIRTY_STACK_MAX`, gerechnet aus dem
  Verdrehwinkel je Lage und aus der Brusthöhe der Figur), und von dort holt man
  sie einzeln in das **Spülbecken**. Eine Rückgabe, auf die nur ein Teller
  passt, wäre bei drei Gästen gleichzeitig eine Sackgasse.
- **Der dreckige Teller ist ein eigenes Ding** (`'plate-dirty'`) und kein
  Zustand am sauberen. Er trägt nichts (er steht in `TAKES` gar nicht), er
  gehört nicht über die Theke, und `isDishware` fasst ihn mit dem sauberen
  zusammen, weil Becken und Rückgabe genau danach fragen: Was dort hineingehört,
  unterscheidet sich vom Essen und vom Gerät, nicht vom Zustand. In das Becken
  darf deshalb auch nur **leeres** Geschirr; ein Teller mit einem halben Burger
  darauf gehört erst an den Mülleimer, und ein Becken, das ihn schluckte, wäre
  ein zweiter Mülleimer mit Wasserhahn.
- **Die Spüle sind zwei Möbel**, und der Teller liegt darin **schräg im
  Wasser**. Beides kam aus einem Spieltest am Handy: „Das Waschbecken müssen wir
  in 2 Elemente teilen… Wenn Teller gewaschen werden, sollen die Teller leicht
  schräg sein, sodass ein Teil davon im Wasser steht… Man kann saubere Teller
  (bis zu 4) auf dem Abtropf-Element sammeln. Der Wasserhahn ist falsch herum?"
  Was daraus geworden ist, in der Reihenfolge der vier Punkte:
  - **Zwei Möbel** (`sink-basin`, `sink-drain`): Ein Möbel hat genau **eine**
    Station, also könnte man davor immer nur eines von beidem tun — spülen oder
    abstellen. Das Netz der Quelle ist ein einziges Stück und wird beim Laden
    bei x = 0 zerschnitten (`core/kitchenModel.splitSink`). Die Naht ist
    gemessen und nicht gewählt: Beckenboden und Abtropfwanne liegen
    spiegelbildlich bei x = ∓0,9751, der Steg zwischen ihren Öffnungen hat
    seine Mitte bei −0,0040. Beide Hälften stecken 1,74 cm im Estrich
    (`SINK_SUNK`), damit ihr Rand mit der Zeile daneben auf 0,500 m fluchtet —
    derselbe Fall wie beim Schneidebrett, halb so hoch.
  - **Der Teller lehnt schräg im Wasser** (`kitchenProps.SINK_TILT`, heute
    23,6°): Er steht mit der Unterkante auf dem Beckenboden und mit der
    Oberkante am Rand, taucht also etwa zur Hälfte ein — genau das Bild, nach
    dem der Spieltest gefragt hatte. Eine Zeit lang lag er flach obendrauf,
    weil `SINK_BOWL.floor` beim Umzug auf den zweiten Baukasten irrtümlich auf
    Randhöhe stand und die Formel damit null Schräge herausrechnete (siehe
    oben). Dass er mit 0,475 m in die 0,8 × 0,5 m große Mulde passt, prüft ein
    Test **gekippt** und nicht flach: Quer misst er im Grundriss nur noch
    0,435 m.
  - **Vier Teller im Abtropfgitter** (`CLEAN_STACK_MAX`, `RACK_SLOTS`), und
    zwar **hochkant** in seinen vier Fächern und nicht gestapelt: Ein Gitter
    hält Teller auf der Kante, damit das Wasser abläuft, und genau so zeichnet
    der Baukasten es auch (`dishrack_plates`). Alle vier Zahlen — Fachabstand,
    Höhe, Schräge, Anzahl — sind an jenem Netz abgelesen, damit einzeln
    hineingestellte Teller dasselbe Bild ergeben wie das gezeichnete volle
    Gitter.
  - **Und es entscheidet sich beim ersten Teller**, was es ist: In ein leeres
    Gitter darf beides, sauber wie dreckig; sobald einer drinsteht, nimmt es
    nur noch dieselbe Sorte (`Station.stacked`, `kitchenCarry.inRack`). Ein
    gespülter Teller zwischen drei schmutzigen ist der, den gleich jemand auf
    die Theke stellt. Voll lehnt es ab — anders als die Rückgabe, die nie
    ablehnt, weil ein Gast ohne Abstellplatz eine Sackgasse wäre. Gefüllt wird
    es **aus der Hand**: Fertig gespült liegt der Teller dort
    (`WORK_TO_HAND`), und ein Schritt zur Seite stellt ihn ab.
  - **Der Wasserhahn war nicht verdreht.** Nachgemessen steht sein Fuß hinten
    (z = −0,90…−0,70) und der Bogen greift nach vorn über die Mulde — die
    Schauseite dieser Möbel ist ohnehin **+z**, dort sitzen die Türgriffe, und
    mit `turn: 0` zeigt sie zum Gang. Falsch war **x**: Die Armatur stand
    mittig auf dem **Steg** zwischen den beiden Mulden, goss also auf die Kante.
    Sie ist beim Schneiden um 0,9751 (Quellmaß) auf die Mitte des Beckens
    gerückt. Aus 55° von oben sieht ein 0,63 m hoher Hahn übrigens immer so
    aus, als stünde er weiter vorn, als er steht: Er wandert im Bild um
    `Höhe / tan 55° = 0,44 m` auf die Kamera zu, und das ist fast die ganze
    Tiefe des Möbels.
- **Das Becken ist zugleich der Wasserhahn**, und der **Topf** wird davor
  gefüllt (`atSink`, `KitchenDeed.fill`) — aus dem Auftrag: „Ich will einen
  Kochtopf in der Hand mit dem Waschbecken interagieren können, um ihn mit
  Wasser zu füllen… Egal ob dreckiger Teller drin ist." Genau daran hängt
  alles Weitere:
  - **Der Fall steht vor beiden Ablehnungen.** „In die Spüle gehört nur
    Geschirr" und „In der Spüle steht schon …" sind für den Topf falsch, weil
    er gar nicht **hineingelegt** wird: Er wird untergehalten. Ein dreckiger
    Teller darf also gleichzeitig darin liegen und weitergespült werden — das
    `fill` rührt die Station nicht an, und die Zone ruft dabei ausdrücklich
    kein `settle`, sonst finge die Uhr des Tellers neben dem Topf von vorn an.
  - **Wasser ist Inhalt, kein eigenes Ding.** Ein voller Topf ist
    `dish('pot', ['water'])` und nicht ein `'pot-water'` — Topf und Pfanne
    kommen aus dem Möbelmodell und tauschen nie ihr Netz, sondern nur ihren
    **Belag** (`kitchen.restyle` → `FoodKit.topping`), und ein Ding mit leerem
    `on` hätte dort nichts zu tauschen. Als Inhalt bekommt das Wasser dazu den
    Rückweg geschenkt, den jeder Inhalt hat: Über dem **Mülleimer** wird der
    Topf abgeräumt und bleibt in der Hand (`scrape`). Keine Sackgasse, keine
    zweite Regel.
  - **Und Wasser wird trotzdem nie zur Zutat.** Das garantiert `TAKES`:
    `water` steht in **keiner** Zeile rechts, also nimmt kein Träger es an —
    kein Brötchen, kein Teller, keine Pfanne —, und über die Theke geht es
    schon gar nicht. Es kommt gar nicht erst über `combine` in den Topf.
  - **Sofort und nicht mit der Uhr.** Ein dritter `WorkKind` neben `chop` und
    `wash` lag nahe und ist an zwei Dingen gescheitert: Es gibt nichts
    zuzusehen (ein Hahn ist ein Handgriff, keine Arbeit), und die Uhr gehört
    der **Station** und rechnet mit einem Ding darin — der Topf liegt aber in
    der Hand, während im Becken gespült wird. Das wären zwei Uhren an einer
    Station, und genau **eine** ist der Sinn von `kitchenWork.ts`.
  - **Bedient wird die Station**, nicht gegriffen: `fill` ist kein `take`, also
    `press` — in der Brille **Berühren oder Trigger**, von oben `A`, am
    Schreibtisch linke Maustaste oder `E`. Kein Sonderfall in einer der drei
    Ansichten, und der gelbe Saum liegt auf dem Becken und nicht auf dem
    dreckigen Teller darin (`meansContent`).
  - **Das Bild ist gemessen** (`core/kitchenFit.POT_BOWL`, Quelle
    `stove-pot`, halbiert mit `KITCHEN_SCALE`): Innenboden 0,0247 m über dem
    Fuß des Topfes, Öffnung bei 0,3044 m — 27,97 cm tief. Das Wasser steht
    **halb**, also auf 0,1646 m, dieselbe Entscheidung wie im Becken
    (`SINK_BOWL.water`) und aus demselben Grund. Aus 55° von oben
    (`TOP_DOWN_TILT`) verdeckt der nähere Rand davon 9,79 cm von 57,19 cm
    Durchmesser, also **17 %** — es bleibt eine breite blaue Ellipse; beim
    leeren Topf sieht man stattdessen den Innenboden, 28 cm tiefer und zu 34 %
    verdeckt. Ton, Deckkraft und Rauheit teilt es sich mit dem Becken
    (`kitchenProps.WATER_LOOK`, vorher in der Zone): Zwei Blautöne
    nebeneinander wären zwei Flüssigkeiten.
  - **Wozu das Wasser dann gut ist, steht absichtlich nirgends.** Verlangt war
    das Füllen; ein Suppenrezept, das niemand bestellt hat, wäre eine zweite
    Entscheidung im selben Handgriff. Die Stelle dafür ist da, falls es kommt:
    Der Herd kocht, was in seinem Gefäß liegt, und `CHOPS`/`FRIES` sind
    Tabellen — es fehlte eine Zeile, kein Zustand.
- **Die Zutaten kommen aus dem Ausgabe-Möbel** des Katalogs, nicht mehr aus
  gebauten Holzkisten, und tragen ein **zur Laufzeit gerendertes Bild** ihrer
  Zutat (`zones/kitchenIcon.ts`): Der Ofen stellt das Ding vor eigenes Licht,
  rechnet die Entfernung aus den acht Ecken seiner Hülle — eine Umkugel
  verschenkte beim flachen Patty drei Viertel des Bildes — und backt eine
  Textur. Das Schild hängt **einmal** daran, oben. Es hing eine Weile zweimal,
  oben und vorn, und beides war begründet — von oben sieht man von einem Möbel
  fast nur den Deckel, aus den Augen vor allem die Front —, nur standen dann
  vier Ausgaben nebeneinander mit **acht** Bildern derselben vier Zutaten, und
  das vordere klemmte auf einem Möbel von 0,46 m zwischen zwei Leisten. Und es
  hängt in einer Gruppe, die den halben Maßstab des Möbels wieder aufhebt
  (`KITCHEN_SCALE`), sonst ist es halb so groß und klebt auf 10 cm Höhe.
- **Ein Teller obendrauf, und sonst nichts.** `IconOven.counterSign` liefert
  keine einzelne Tafel, sondern eine **Gruppe**: unten ein **weißer Kreis** von
  70 % der Kachelkante (`BLANK_SHARE`, also 0,70 m), darauf das gerenderte Bild
  mit 65 % derselben Kante (`SIGN_SHARE`, 0,65 m). Die Reihenfolge ist zugleich
  die Tiefe. Beide Anteile messen dieselbe Deckfläche und nicht einer den
  anderen — 65 % von 70 % wären 0,46 m und sähen auf dem Kreis verloren aus.
  Vorher lag dort ein weißes **Rechteck** von 0,88 m, also fast das ganze
  Möbel: Von oben sah man eine weiße Platte mit einem kleinen Bild und vom
  Möbel nichts mehr.
- **Der aufgedruckte Teller wird jetzt wirklich entfernt**, nicht mehr
  zugedeckt (`core/kitchenModel.erasePrintedPlate`). Das große weiße Rechteck
  hatte genau diese Aufgabe; ein Kreis von 70 % schafft sie nicht mehr. Und
  ausbauen lässt sich der Aufdruck nicht: `serve-counter` ist **ein** Netz mit
  **einem** Material, der Teller mit dem Burger ist ein Bild im Atlas, und die
  Mulde besteht aus genau **zwei Dreiecken**, die dieses Bild zeigen. Also wird
  **umgeklebt**: Ihre vier Ecken bekommen alle dieselbe Texturkoordinate, und
  zwar eine, die auf das blanke Holz am Rand desselben Bildfelds zeigt. Ein
  einziger Punkt statt eines Ausschnitts ist Absicht — ohne Ableitung in der
  Fläche nimmt der Renderer die schärfste Mipmap, und aus den Nachbarfeldern
  des Atlas kann nichts hereinlaufen. Einmal an der geteilten Vorlage; die
  **Textur** selbst bleibt unangetastet, sie ist fremde Arbeit und gehört
  dreizehn Möbeln gemeinsam.
- **Auf dem Schneidebrett liegt das Essen auf dem Brett**
  (`kitchenFit.KITCHEN_PIECES`, `board.deck = 0,533`). Ohne eigenen Eintrag gilt
  als Ablagehöhe die `height` des Möbels, und die ist hier die Spitze des
  **Hackmessers**, das auf dem Brett liegt (Quellmaß 1,148, halbiert 0,574 m).
  Ein Salatkopf schwebte damit 3,7 cm über dem Brett — aus 55° von oben
  (`core/topDownPose.TOP_DOWN_TILT`) sieht man genau diesen Spalt. Gemessen:
  Korpus bis 1,000 (halbiert 0,500 m, auf den Millimeter die Höhe der
  Küchenzeile daneben — die **Korpusse** standen also von Anfang an gleich
  hoch), darauf das Brett bis 1,065 (halbiert 0,5326 m, die größte waagerechte
  Fläche des Netzes).
- **Und das Möbel steckt um die Dicke des Bretts im Boden**
  (`board.bury = 0,033`), damit die Zeile eine Linie ergibt. **Hier stand
  zweimal das Gegenteil** — die 3,3 cm *seien* das Brett, ein Schneidebrett
  liege nun einmal auf der Platte, also bleibe die Stufe —, und dreimal kam
  dieselbe Rückmeldung: In einer Reihe aus Zeile, Brett, Zeile ist das eine
  **Treppe**, und aus 55° von oben läuft sie quer durchs Bild. Aufgelöst wird
  der Widerspruch nicht am Brett, sondern am Fuß: Versenkt wird das **ganze
  Möbel**, nicht das Brett in seiner Platte (das wäre unsichtbar, es ist genau
  so dick wie die Stufe). Oben fluchtet die Arbeitsfläche damit bei 0,500 m mit
  `counter`, unten verschwinden 3,3 cm Sockelleiste — und die steht ohnehin 5 cm
  hinter der Kante der Deckplatte zurück (Quelle: unter y = 0,065 reicht der
  Korpus nur bis ±0,900 statt ±1,000), liegt also in deren Schatten. `height`
  und `deck` messen weiter ab **Fuß des Möbels**; wie hoch eine Fläche im Raum
  liegt, sagt `kitchenFit.kitchenWorkHeight`, und die Zone rechnet vom Fuß aus,
  den sie beim Hinstellen ohnehin hat (`kitchen.ts`, `standAt`). Der **Herd**
  bleibt bei 0,55 m und ist keine zweite Stufe: Sein Blech liegt bei 0,500 m
  wie die Zeile, die 5 cm darüber sind die Kochstelle, und darauf steht ein
  Topf. Festgehalten ist die Zusage in `kitchenPlan.test.ts` („die
  Arbeitsflächen der Zeile") — über den **Aufbau**, nicht über einzelne Möbel:
  Gleich hoch sein müssen die, die nebeneinanderstehen.
- **Das Patty sitzt in der Mulde, nicht auf dem Stiel** (`kitchenFit.PAN_BOWL`).
  Ein abgenommenes Gerät bekommt seinen Ursprung in der Mitte seiner **ganzen**
  Hülle (`kitchenModel.takeUtensil`), und zur Hülle einer Pfanne gehört der
  Stiel — der Belag landete deshalb 22,5 cm neben der Mulde und lag halb über
  dem Pfannenrand. Die Zahl ist an der Quelldatei gemessen (Mulde ohne Stiel
  als Drehkörper: gleicher Durchmesser in x und z) und steht im Katalog neben
  `align` und `deck`, also in der Liste, die man beim Austausch der Quelle
  nachmisst. Der Teller bekommt den Versatz nicht: Er ist rund und hat keinen
  Griff.
- **Und dieselbe Mulde bestimmt auch, wo die Pfanne steht** (`kitchenHub`,
  `kitchen.restOn`). Derselbe Ursprung in der Hüllenmitte, der den Belag
  verschob, verschiebt auch die Pfanne selbst: Auf die Kachelmitte gesetzt,
  landet dort die Mitte aus Mulde **und** Stiel — also die Mulde 22,5 cm zu
  weit hinten, während der Stiel nach vorn über den Herd ragt. Im Bild ist das
  eine Pfanne, die halb neben ihrem Rost sitzt. Gerechnet stimmte alles: Die
  Hülle des Katalogstücks ist mittig, weil `KitchenPiece.holds` die Pfanne gar
  nicht als Aufsatz aufstellt, sondern als **loses Gerät** (`takeUtensil`), und
  das war die Stelle, an der niemand nachsah. Gefunden wurde es mit einem
  magentafarbenen Zylinder auf `spot.deck` in der laufenden Szene — die
  Kachelmitte war sichtbar woanders als die Mulde. Seitdem legt **eine**
  Funktion jedes abgesetzte Gerät ab (`restOn`), und sie fragt vorher
  `kitchenHub(item)`: Für die Pfanne kommt `PAN_BOWL` zurück, für alles andere
  der Ursprung. Ein Hinstellen richtet sich nach dem Teil, das auf der Fläche
  aufsteht, nicht nach dem, was darüber hinausragt.
- **Getragen wird mit beiden Händen vor dem Körper** (`core/chefFit.CHEF_CARRY`),
  0,72 m vor der Figur und 0,62 m hoch. Beide Zahlen sind gemessen und nicht
  geraten: Der Kopf dieser Chibi-Figur ist 0,5 m breit, und ein Teller dicht
  vor der Brust verschwand von oben darunter; und das höchste Stück Küche, an
  dem man vorbeiträgt, ist das Schneidebrett mit 0,537 m über dem Boden (die
  Spitze des Hackmessers darauf, seit das Möbel um die Brettdicke tiefer steht)
  — wer tiefer trägt, schiebt den Topf beim Vorbeilaufen **durch** die
  Herdplatte. Die **Arbeitsplatte** selbst liegt seitdem überall auf 0,50 m,
  nur die Kochstelle des Herds 5 cm darüber.
- **Der Kopf wippt beim Tragen mit, die Kamera nie** (`AvatarBody.headBob`).
  Das Wippen sitzt am Kopf der **Figur**, und die zeichnet nur, wer sie von
  außen sieht (`LAYER_SELF_ONLY`) — eine Kamera, die im Takt der Schritte
  nickt, ist am Schirm kein Gefühl von Gehen, sondern Übelkeit, und in der
  Brille schlicht verboten.
- **Eine Ablage meldet sich nur, wenn sie etwas zu sagen hat**: `A` ist genau
  dann angemeldet, wenn `kitchenDeed` etwas anderes als `nothing` liefert. Der
  gelbe Saum (`core/highlight.ts`) umfasst damit immer genau das, was `A`
  gerade meint.
- **Der Mülleimer nimmt nur Essen.** Einer, der alles schluckt, ist einer, in
  dem nach zwei Minuten die einzige Pfanne der Küche liegt. Der leere Teller
  ist genauso wenig Abfall wie sie; ein voller verliert nur seinen Inhalt.
- **Und ein Band liefert in den Mülleimer ab — was dort ankommt, ist weg.**
  Vorher war der Eimer das Gegenteil: kein Ziel für ein Band, mit der
  Begründung, ein Teller, den ein Band von selbst in den Müll trägt, wäre der
  teuerste Unfall dieser Küche. Der Stau war der teurere. Ein Band, das auf
  einen Mülleimer zeigt und dann nicht abliefert, steht — und die halbe Reihe
  dahinter steht mit; gebaut wird so ein Band mit Absicht, und man sieht am
  laufenden Pfeil, wohin es schiebt. Weggeworfen wird über **denselben
  Handgriff**, den auch `A` auslöst (`kitchenCarry.kitchenDeed`, `trash` und
  `scrape`) und nicht über eine zweite Lösch-Mechanik daneben: Zwei Wege, ein
  Ding aus der Küche zu nehmen, sind der Anfang von zwei Wegen, die sich
  unterscheiden. Also gilt am Band Zeile für Zeile, was in der Hand gilt — der
  Topf bleibt draußen, und ein Teller mit einem halben Burger darauf wird
  **abgeräumt**: Der Belag geht hinein, der leere Teller bleibt auf dem Band
  liegen, so wie er beim Spieler in der Hand bliebe. Gefragt wird **vor** der
  Fahrt (`kitchen.beltTarget`): Ein Kochtopf, der erst zwei Sekunden zum Eimer
  führe und dort abgewiesen würde, führe alle zwei Sekunden wieder los. Und weil
  ein Mülleimer nie belegt ist, staut sich vor ihm auch nichts — eine volle
  Reihe Bänder rückt nach, alle zwei Sekunden eines
  (`kitchenBelt.beltTrashes`, `kitchen.dumpInBin`, mit Test).
- **Das Ausgaberegal hängt einen Meter höher** (`kitchenPlan.RACK_RAISE`): Fuß
  bei **1,65 m**, Oberkante bei **2,21 m** statt bei 0,65 und 1,21. Es steht
  auf derselben Kachel wie die Ausgabetheke, eine Ebene darüber, und mit dem
  Meter wird daraus das, was es sein soll — eine **Durchreiche** und kein Brett
  auf Brusthöhe. Zwei Rechnungen dazu: Der Fuß liegt 5 cm über dem Scheitel der
  Figur (1,60 m), sie läuft also darunter durch; und in der Ansicht von oben
  (55°, `core/topDownPose.TOP_DOWN_TILT`) wandert ein Ding je Meter Höhe um
  `1 / tan 55° = 0,70 m` nach Süden — das Regal liegt im Bild damit **vor** der
  Theke statt darauf, und der Teller darunter ist zu sehen. Ein Stück mit
  `Spot.lift` bekommt keinen Körper; sonst stünde eine unsichtbare Wand in der
  Luft.
- **Das Förderband ist das erste gebaute Möbel im Katalog**
  (`core/kitchenFit.KitchenPiece.built`, `zones/kitchenBelt.ts`). Es steckt in
  keiner Quelldatei — der gekaufte Katalog hat dreizehn Stücke und kein Band —,
  und eine zweite Quelldatei mit Lizenz, Aufbereitung und Eintrag in
  `public/models/CREDITS.md` wäre viel Aufwand für drei Quader. Trotzdem steht
  es im Katalog: Die Liste beschreibt, was in dieser Küche steht, nicht, was
  gekauft wurde, und wer den Grundriss stempelt oder den Schauraum füllt, will
  Grundfläche und Höhe haben und nicht wissen, woher das Netz kommt. Es ist
  eine Kachel groß und **0,53 m** hoch — die Zahl der Ausgabetheke, abgeschrieben
  mit Absicht: Ein Band, das drei Zentimeter höher stünde als die Theke daneben,
  wäre von oben eine Stufe, die niemand erklären kann. Ein Ding braucht **2 s**
  über eine Kachel (`BELT_SECONDS`), also einen halben Meter je Sekunde, und
  damit ist es **langsamer als Laufen** (2,6 m/s): Ein Band kauft keine Zeit,
  es kauft **Hände**. Wohin geschoben wird, sagen wandernde Sparren und nicht
  ein aufgemalter Pfeil — ein stehender Pfeil ist eine Beschriftung, ein
  laufender ist die Maschine selbst. **Der Trog nimmt die ganze Kachel ein**, und
  das ist eine Korrektur, die man erst sieht, wenn die Küche steht: Er war
  72 cm breit, links und rechts blieb ein Streifen heller Platte stehen — und
  vier Bänder in einem Quadrat von zwei mal zwei Kacheln, jedes um eine
  Vierteldrehung versetzt, sind damit vier dunkle Rechtecke um eine Mitte mit
  hellen Fugen dazwischen: ein **Hakenkreuz**, gebaut aus der Fuge und nicht
  aus dem Pfeil. Seit der Umbau jede Drehung erlaubt, legt das früher oder
  später jemand. Über die volle Kachel gibt es den hellen Streifen nicht mehr,
  und dieselben vier Kacheln sind eine dunkle Fläche mit acht Pfeilen darauf.
  Die **Sparren** bleiben, wie sie waren, und laufen weiter auf 72 cm
  (`ARROW_WIDE`) — ein Pfeil, den man auf einen Meter zieht, ist ein
  breitgedrückter Pfeil. Am Ende der Reihe steht eine Ablage
  (`beltStep` sagt, an welche Kachel weitergereicht wird).
- **Und daneben das Zugband** (`belt-pull`, `BeltTile.pull`): dasselbe Möbel,
  dieselbe Höhe, dieselbe Kachel — es holt sich obendrein **von selbst**, was
  auf der Kachel **hinter** ihm liegt. Dort muss kein Band stehen, und das ist
  der ganze Witz daran: Eine Arbeitsplatte, ein Schneidebrett, ein Gästetisch,
  ein anderes Band wird für diesen einen Handgriff selbst zum Band. Gerechnet
  wird das in **einer** Zeile — das Zugband schreibt der Kachel hinter sich sich
  selbst als Ziel —, und danach gilt für sie ohne eine zweite Rechnung alles,
  was für ein Band gilt: Kettenausnahme, `BELT_HOLD`, Anstehen, das Bild
  dazwischen. Vier Dinge entscheiden die Fälle, die ein Grundriss irgendwann
  herstellt:
  - **Gezogen wird per Vormerkung, und die steht schon, bevor etwas da ist.**
    Ein **freies** Zugband schreibt sich bei seinem Nachbarn ein; der weiß
    damit, dass er nicht weitergeben muss, und was dort **zur Ruhe kommt**, geht
    quer weg statt geradeaus weiter — auch auf einem Band, das selbst schiebt.
    Ist das Zugband dagegen **voll**, gibt es keine Vormerkung, und das Band
    schiebt wie immer: Ein Stau nebenan hält die Bahn nicht mit an.
  - **Was schon fährt, wird nicht umgeleitet.** Hat ein Ding seine Fahrt
    angefangen, gilt sie (`BeltState.to`), auch wenn nebenan gerade ein Zugband
    frei wird. Sonst wechselte es auf halber Strecke die Richtung — und
    Losfahren ist hier ein Versprechen. Gezogen wird also nur, was **liegt**.
  - **Eine Kachel wird von genau einem Zugband gezogen.** Stehen zwei daran,
    bekommt sie das erste, das gerade vormerken kann — ist das erste voll und
    das zweite frei, greift das zweite. Erst das macht aus zwei Zugbändern zwei
    Abnehmer.
  - **Gerät ist keine Ware**: Vom Herd (dort steht die Pfanne) und aus der
    Löscherhalterung zieht es nichts, und von der Ausgabetheke ebenso wenig —
    was man nicht hinschieben darf, zieht man auch nicht heraus. **Aus dem
    Mülleimer erst recht nicht**, und er ist der eine Nachbar, bei dem die
    Frage nicht mehr spiegelbildlich ist: hinein ja, heraus nie. Ein Zugband,
    das den Müll wieder ausräumt, wäre die zweite Hälfte einer Endlosschleife,
    und weggeworfen ist weggeworfen. Beide Regeln stehen als **reine
    Funktionen** neben der Rechnung (`beltDelivers`, `beltReleases`) und nicht
    in der Zone: Welche Station nebenan steht, weiß nur die Zone; ob sie darf,
    ist eine Frage über Stationsarten, und die prüft ein Test über **alle
    zwölf** statt über die drei, die gerade zufällig neben einem Band stehen.
    Auf einen **Stapel** — Geschirrrückgabe und Abtropfbrett — liefert dabei
    keines ab: Dort liest die Regel nur die Zahl, also läge das Abgelieferte
    obendrauf und würde nie wieder angefasst.
  - **Was unter dem Messer liegt, bleibt liegen**: Solange am Brett oder in der
    Spüle jemand davorsteht und die Uhr läuft (`WorkState.working`), zieht das
    Band nichts weg. Sobald sie steht, fährt das Fertige los.
  Zu sehen ist der Unterschied an der **Farbe der Sparren** — blau schiebt,
  orange zieht (`BELT_COLORS`) — und an einem hellen Streifen an der
  **Hinterkante** des Zugbands, der sagt, von welcher Kachel es sich etwas
  holt. Die Farbe sitzt an den Sparren und nicht am Korpus, weil die Sparren
  das Einzige sind, was man aus 16 m Höhe wirklich liest.
- **Zwei Bahnen stehen in der Testküche**: vier Förderbänder in der Spalte
  x = 9 nach Süden auf eine Ablage, und vier Zugbänder in der Spalte x = 7, von
  denen das erste den Arbeitstisch der Insel leerzieht und das letzte vorn
  neben der Ausgabetheke abliefert. Dazwischen bleibt x = 8 als Gang frei —
  zwei Spalten Möbel quer durch die Küche sind zwei Wände, und ohne die Reihe
  dazwischen liefe man von der Nordzeile bis zum Gastraum ums ganze Haus.
- **Und ein Zugband zieht auch aus einer Vorratskiste** (`beltRefills`). Für
  die Rechnung ist eine Kachel belegt oder frei; eine Kiste ist von beidem
  nichts — auf ihr liegt nichts, und trotzdem ist dort etwas zu holen. Sie
  meldet sich deshalb als **belegt**, und was das Band abholt, entsteht in dem
  Bild, in dem es losfährt (`kitchen.sprout`): zwei Sekunden lang liegt es
  sichtbar auf dem Deckel und fährt herüber. Das ist der Anfang jeder
  Bandstraße, die ohne Läufer auskommt — und die Kiste bleibt dabei eine
  Ablage: Liegt etwas auf ihrem Deckel, holt das Band **das**, denn das hat
  jemand dort hingestellt.
- **Das Filterband** (`belt-smart`, violette Sparren) ist ein Zugband mit
  Gedächtnis: Es greift nur nach dem, was man ihm einmal **von Hand**
  aufgelegt hat (`beltWants`, `beltLearns`), und ein kleiner Aufkleber an
  seiner Greifkante zeigt, was das ist. Drei Entscheidungen stecken darin:
  - **Ohne Filter zieht es nichts.** Die Alternative — bis zur ersten Lehre
    ziehen wie ein gewöhnliches Zugband — wäre ein Möbel, das seine Regel
    wechselt, sobald man es benutzt: Man baut es in eine laufende Bahn, es
    schleppt erst alles weg und hört genau dann damit auf, wenn man ihm etwas
    auflegt. Das ist kein Filter, das ist eine Falle.
  - **Gelernt wird nur von Hand**, nicht von der eigenen Fracht. Ein Band, das
    von dem lernte, was es selbst herbeischafft, hätte nach der ersten Fuhre
    einen Filter, den niemand gesetzt hat, und danach nie wieder einen anderen.
  - **Gemerkt wird das Ding, nicht sein Belag.** Ein Teller mit Burger ist ein
    `plate`; am Ende einer Bahn will man „alle Teller" und nicht „alle Teller
    mit genau diesem Burger" — dafür gibt es die Rezepte und nicht das Band.
  In der Rechnung selbst ist es **kein** Sonderfall: `advanceBelts` kennt nur
  `BeltTile.pull`, und ob dort ein Schlüssel steht, entscheidet die Zone, die
  als Einzige weiß, was nebenan liegt (`kitchen.beltSource`).
- **Der Zustand springt, das Bild nicht** (`kitchenBelt.advanceBelts`,
  `kitchen.runBelts`). Ein Ding gehört logisch immer genau einer Kachel;
  gezeichnet wird es währenddessen linear zwischen den beiden Kachelmitten
  überblendet — linear und ungeglättet, weil die Sparren darunter mit derselben
  gleichbleibenden Geschwindigkeit laufen und ein weich anfahrendes Ding
  sichtbar anders führe als sein Untergrund.
- **Losfahren ist ein Versprechen, kein Umzug.** Eine Fahrt hat zwei Stufen:
  **losfahren** darf, wessen Ziel frei ist _oder_ wessen Ziel zwar belegt ist,
  das Belegende aber selbst schon losgefahren ist (die **Kettenausnahme** —
  fließt vorn einer ab, setzt sich das ganze Band in **einem** Bild in
  Bewegung); **ankommen** darf nur, wessen Ziel wirklich leer ist. Die alte
  Kachel wird dabei erst beim Ankommen frei, nicht beim Losfahren: Sonst läge
  ein Ding zwei Sekunden lang logisch dort, wo es sichtbar nicht ist — `A`
  griffe ins falsche Feld (`stationAt` fragt die Kachel, nicht das Bild), und
  ein unterwegs abgeräumtes Ding müsste von einer Kachel genommen werden, die
  es nie erreicht hat. Wer nicht ankommen kann, bleibt bei `BELT_HOLD` (0,625
  Kachel, ein Tellerradius vor der Mitte) **stehen** statt zurückzuspringen:
  Ein Teller, der rückwärts fährt, liest sich nicht als „besetzt", sondern als
  kaputtes Spiel. Ein Band, das ins Leere schiebt, fährt gar nicht erst los —
  vorher verlor es, was daraufliegt. Und ein voller Ring steht, ohne dass es
  dafür einen Sonderfall bräuchte: Losfahren breitet sich von einer Kachel mit
  wirklich freiem Ziel nach hinten aus, und ohne eine solche fängt nichts an.
- **Gerechnet wird je Bild für alle Kacheln auf einmal**, nicht je Kachel. Ein
  Band hängt am Band davor, und wer jede Kachel für sich rechnet, fällt auf die
  Reihenfolge herein: von vorn gerechnet fährt ein volles Band in einem Bild
  los, von hinten gerechnet braucht es so viele Bilder, wie es Kacheln hat.
  Gemeldet wird dabei **jede** Station und nicht nur die Bänder — eine Ablage
  ist in dieser Rechnung eine Kachel ohne Ziel, und dass ein Band ins Nichts
  denselben Fall ergibt, ist die ganze Antwort auf „was, wenn da vorn nichts
  ist". Eine Kachel, auf die etwas zufährt, ist leer und trotzdem vergeben:
  Wer dort ablegen will, bekommt es gesagt (`beltBound`), statt den Stau erst
  zu bauen.
- **Der Kombinierer** (`combiner`, `zones/kitchenCombiner.ts`, grüne
  Markierungen) ist das Möbel, das aus einer Bandbahn eine **Küche** macht. Ein
  Band kann alles transportieren und nichts **zusammenlegen**: Es liefert nur
  auf eine freie Kachel ab, und ein Brötchen mit Patty entsteht nun einmal
  dadurch, dass zwei Dinge auf **derselben** Kachel landen. Er hält also, was
  man ihm auflegt, und holt sich von der Kachel, auf die sein Pfeil zeigt, die
  Zutat dazu (`beltReach`, dieselbe Richtung wie beim Zugband). Vier
  Entscheidungen:
  - **Oben liegt die Grundlage, von der Seite kommt die Zutat**, und das ist
    gerichtet: Er fragt `kitchenRecipes.stackOn` und nicht `combine`. `combine`
    ist absichtlich richtungslos — ein Spieler darf mit dem Teller zur Tomate
    laufen oder umgekehrt —, ein Möbel hat diese Freiheit nicht: Was es baut,
    muss oben liegen bleiben, sonst stünde der fertige Burger auf der
    Zulieferkachel und die halbe Bahn liefe rückwärts. Deshalb liegt in der
    Werkhalle der **Teller** oben und der Burger kommt von der Seite und nicht
    andersherum: Ein Teller gehört unter das Essen.
  - **Er zieht nicht über die Bandrechnung.** Der naheliegende Weg wäre ein
    `BeltTile.pull` gewesen — nur beruht `advanceBelts` auf dem Satz „auf eine
    belegte Kachel fährt nichts", und ein Kombinierer ist **gerade dann**
    aufnahmebereit, wenn er belegt ist. Ihn dort als frei zu melden, hieße, die
    Rechnung in genau der Aussage anzulügen, auf der sie steht. Also eine
    eigene Uhr, wie am Brett — und **zwei Sekunden**, genau die Zeit, die ein
    Band für eine Kachel braucht: Die Fahrt **ist** der Handgriff, und wäre er
    schneller, baute man Kombinierer statt Bändern.
  - **Ein angefangener Handgriff gehört einer Kachel** (`CombineState.from`).
    Wird dort etwas weggenommen oder wechselt der Zulieferer, fängt er von vorn
    an, statt etwas aufzulegen, das er nie geholt hat.
  - **Und was er gerade herüberholt, schiebt kein Band weg.** Die Zone streicht
    der beanspruchten Kachel für dieses Bild ihr Ziel (`runBelts`, `claimed`)
    und lässt auch kein Zugband daran; umgekehrt gibt ein Kombinierer mitten im
    Handgriff selbst nichts her (`beltReleases` bekommt seine Uhr mitgereicht).
    Sonst entschiede die Reihenfolge der Stationen, wer das Patty bekommt.
  - **Er gibt nur her, was er selbst zusammengelegt hat** (`combinerHolds`),
    und ohne diese Regel funktionierte die ganze Straße nicht. Der Fehler war
    im Bild sofort zu sehen und in der Rechnung fast unsichtbar: Das Brötchen
    kam an, lag eine Sekunde auf dem Kombinierer — und das Zugband dahinter
    nahm es mit, **bevor das Patty da war**. Für die Bandrechnung völlig
    richtig (dort liegt etwas, also darf man es holen), und die Straße lieferte
    trotzdem nie einen Burger, sondern eine Reihe nackter Brötchen.

    Der erste Anlauf las die Antwort aus dem **Ding**: Was einzeln daliegt, ist
    eine Unterlage und wartet; was etwas trägt, ist fertig und fährt weiter
    (`Dish.on`). Das ist für **einen** Kombinierer richtig und für eine
    **Kette** falsch, und daran ist die Burgerstraße gescheitert: Ab dem
    zweiten Kombinierer kommt die Unterlage schon beladen an — Brötchen mit
    Patty —, trägt also etwas, und wäre nach dieser Lesart in dem Augenblick
    abholbereit, in dem sie ankommt. Der Salat kam nie darauf.

    Jetzt steht die Antwort im **Möbel** (`CombineState.made`): Ein
    Kombinierer hält alles, was man ihm hinstellt, und lässt genau dann los,
    wenn **er** einen Handgriff daran getan hat. Das ist ein Merker, den der
    Umbau verliert — und das ist richtig so: Ein abgebautes und
    wieder hingestelltes Möbel hat nichts zusammengelegt. Und er gilt nur
    gegen die **Maschine**: Mit `A` nimmt man das Brötchen mit wie von jeder
    Arbeitsplatte, sonst wäre der Kombinierer eine Sackgasse.
- **Der Mixer** (`mixer`, `zones/kitchenMixer.ts`) ist ein Schneidebrett mit
  Motor, und der Unterschied zum Brett steht in **einer** Tabellenzeile:
  `kitchenWork.WORK_ALONE`. Am Brett **ist** das Danebenstehen die Arbeit — wer
  weggeht, hat abgebrochen —, der Mixer läuft weiter. Erst damit ist eine
  Bandstraße möglich: Ein Zugband legt den Salatkopf hinein, der Mixer
  schneidet, das nächste holt ihn heraus, und in der ganzen Kette steht
  niemand. Alles andere ist Wort für Wort das Brett: dieselbe Uhr
  (`advanceWork`), **dieselbe Stufenfolge** (`kitchenRecipes.CHOPS` über
  `workStage`), eine Stufe je Auflegen, das Fertige bleibt liegen. Daraus folgt
  ohne eine weitere Zeile der Satz aus dem Auftrag: Eine Tomate muss **zweimal
  durch den Mixer**, bis Suppe daraus wird. Er kostet dafür **vier** statt drei
  Sekunden je Stufe — ein Möbel, das einem die Anwesenheit abnimmt **und**
  schneller ist, macht das Brett wertlos, und dann ist es kein zweites Möbel,
  sondern ein Ersatz. Gebaut wie die Bänder: Arbeitstisch (0,50 m, die Zahl von
  `table`), eine Schüssel mit 8,5 cm Rand darauf — niedriger als jede Zutat,
  damit man von oben hineinsieht — und ein Motorblock an der Nordkante bis
  0,92 m. Solange er läuft, gibt er nichts her (`beltReleases('mixer', true)`);
  ohne diese Zeile risse ein Zugband ihm den halb gehackten Salat weg.
- **Die sichere Kochstelle** (`griddle`, `zones/kitchenGriddle.ts`, rote
  Kochplatte) ist für das Braten, was der Mixer für das Schneiden ist — und sie
  ist das Möbel, ohne das die Burgerstraße **nicht liefern konnte**. Zwei Sätze
  über den **Herd** erklären, warum:
  - **In eine Pfanne legt kein Band etwas hinein.** Auf dem Herd steht die
    Pfanne, die Kachel ist damit belegt, und eine belegte Kachel nimmt nichts
    an (`advanceBelts`). Die Kochstelle trägt deshalb **keine Pfanne**: Das
    rohe Patty liegt unmittelbar auf der Platte, so wie der Salatkopf auf dem
    Brett liegt — ein Band schiebt hin, ein anderes holt ab
    (`beltDelivers('griddle')`, `beltReleases('griddle')`, und `'stove'` steht
    in beiden Listen nicht: Von dort nähme ein Band die einzige Pfanne der
    Küche mit).
  - **Und ein Herd, den niemand bewacht, brennt.** Gebraten, verbrannt, Feuer —
    das ist die Folge am Herd (`kitchenClock.ts`) und dort der ganze Reiz: Man
    muss zurückkommen. **Eine Bandstraße kommt nicht zurück.** Die Platte geht
    deshalb **die eine Stufe** und bleibt dann stehen (`workStage` für
    `'fry'`): Sie fragt dieselbe Tabelle wie der Herd
    (`kitchenRecipes.fryStage`), geht aber die Stufe zum Verbrannten nicht mit.
    Kein zweites Rezept, ein `null` an der richtigen Stelle.

  Der Rest ist Wort für Wort der Mixer: dieselbe Uhr (`advanceWork` mit
  `WORK_ALONE.fry`), dasselbe Bleiben-Lassen des Fertigen
  (`WORK_TO_HAND.fry === false`, damit ein Filterband es abholen kann), und
  dieselbe **Sekunde Aufpreis** (`WORK_SECONDS.fry` gegen
  `kitchenClock.FRY_SECONDS`) — ein Gerät, das einem die Anwesenheit abnimmt
  **und** schneller ist, macht die Pfanne wertlos, und die Pfanne ist das
  Herzstück dieser Küche. Gebaut auf **Herdhöhe** (0,55 m, die Zahl von
  `stove`), damit eine Reihe eine Reihe bleibt, und obendrauf eine Kochplatte
  aus einem Kern und drei Ringen: Aus 16 m Höhe (`core/topDownPose.ts`) ist
  eine volle rote Scheibe ein roter Fleck, drei Ringe sind sofort eine
  Kochplatte. Sie hat als einziges Küchenmöbel **keine Vorderseite** — rund in
  der Mitte, von jeder Seite belieferbar —, und ihr Rot (`#ff5a3c`) ist
  absichtlich kein Bandton, sondern das der Herde: Wer von oben über die Halle
  sieht, findet die Stelle, an der gebraten wird, ohne die Beschriftung zu
  lesen.
- **Die Werkhalle** (`kitchenPlan.PIPELINE`) ist der Platz dafür. Die Küche ist
  dafür **acht Kacheln nach Osten gewachsen**, und der Schauraum ist mit nach
  Osten gerückt (`kitchenPlan.SHOW_X`) statt sitzen zu bleiben: Eine Halle
  hinter dem Schauraum wäre zwei Zimmer von der Küche weg, und die Straße soll
  dort anfangen, wo die Küche aufhört. Nach Süden ging es nicht — dort liegt
  das Podest. Die Halle hat **keine eigene Wand und keine eigene Tür**: Sie
  ist die Küche, nur größer; ab z = 4 geht man geradeaus hinüber. Mit der
  sicheren Kochstelle ist noch **eine** Kachel dazugekommen und mit den vier
  Vorratskisten noch **vier** (`layout.KITCHEN` ist seitdem 37 breit und
  `FIELD` entsprechend 77): Die vier Reihen des Schauraums waren bis zur
  Ostwand belegt, und ein weiteres Möbel braucht einen Platz
  neben seinesgleichen und nicht in der nächsten Reihe. Darin steht
  eine **Burgerstraße**, die vorn vier Vorratskisten hat und hinten einen
  **Burger Deluxe** (`kitchenRecipes.RECIPES`: Brötchen, gebratenes Patty,
  geschnittener Salat, Tomatenscheibe) — und dazwischen fasst sie niemand an.
  Sie belegt **sechs** der acht Spalten; die anderen zwei sind leer und bleiben
  es, denn genau dafür ist die Halle da: Wer eine eigene Straße bauen will,
  braucht Spalten am Stück und nicht Einzelkacheln zwischen zwei Herden. Der
  Aufbau, von der Zutat zum Gericht:
  - **Spalte 13, das Patty**: Kiste → Zugband → **Ablage** → Zugband →
    **sichere Kochstelle** → Filterband (`patty-cooked`) → Übergabekachel. Die
    Ablage in der Mitte ist keine Zierde: Sie ist die Stelle, an der man von
    Hand eingreifen kann, ohne die Kette anzuhalten.
  - **Spalte 14, der Burger**: Kiste → Zugband → Band → **Kombinierer 1**
    (Brötchen oben, Patty von Westen) → Zugband → **Kombinierer 2** (Salat von
    Osten) → Zugband → **Kombinierer 3** (Tomate von Osten) → und von dort ein
    Zugband nach Westen auf die **Burgerausgabe**.
  - **Spalte 16 und 17, das Gemüse**: je Kiste → Zugband → Mixer → Filterband
    (`lettuce-cut` beziehungsweise `tomato-cut`) → Bänder nach Westen auf die
    Übergabekacheln in Spalte 15.

  **Warum drei Kombinierer und nicht einer.** Ein Kombinierer legt in einem
  Handgriff **eine** Zutat auf; danach gilt sein Ergebnis als fertig und darf
  abgeholt werden (`combinerHolds`). Drei Zutaten sind drei Handgriffe, also
  drei Stufen hintereinander — und genau so ist es gemeint: Die Zutaten kommen
  **nacheinander** und nicht auf einmal, man sieht jede Stufe einzeln, und man
  kann an jeder abgreifen, wenn man nur einen Hamburger will.

  **Warum die Übergabekacheln Arbeitsplatten sind und keine Bänder.** Ein Band
  davor schöbe die Zutat auf den Kombinierer, sobald der leer ist — sie läge
  dort als Unterlage, und das Brötchen käme nicht mehr darauf. Eine stehende
  Ablage lässt sich nur **ziehen**, und ziehen tut dort nur der Kombinierer,
  dessen Pfeil darauf zeigt. Dieselbe Überlegung gilt der **Pattyablage** in
  Spalte 13.

  Die **Filter der drei Filterbänder stehen schon im Grundriss**
  (`Spot.filter`): Eine Straße, die erst läuft, nachdem jemand drei Bändern
  etwas aufgelegt hat, zeigt nichts, sondern steht herum.

  **Und dass sie wirklich liefert, steht als Test da**
  (`zones/kitchenLine.test.ts`) — mit einer Grenze, die man kennen muss: Er
  rechnet mit den **Regeln** und nicht mit der Zone. Dass die Zone jede dieser
  Regeln auch anstöpselt, ist eine andere Frage, und sie hat genau einmal nein
  gelautet (siehe `STATION_WORK` weiter oben). Deshalb steht neben ihm die
  Runde im Browser und nicht statt ihrer. Er baut aus `KITCHEN_SPOTS` — dem echten
  Grundriss, nicht einer Nachbildung — eine Halle ohne three.js, dreht sie eine
  Minute lang mit 60 Bildern je Sekunde und sieht dann auf der Burgerausgabe
  nach. Dort liegt ein Brötchen mit gebratenem Patty, geschnittenem Salat und
  Tomatenscheibe, und `recipeOf` nennt es **Burger Deluxe**. Dazu, was auf dem
  Weg dorthin nicht passieren darf: nichts Verbranntes irgendwo, kein
  Filterband, das etwas anderes trägt als seinen Filter, kein Stück, das
  verschwindet oder sich verdoppelt — und nach dem Abräumen kommt der nächste.
  Wer an Grundriss, Uhren oder Regeln etwas ändert, erfährt es hier und nicht
  im Browser.
- **Der Baumodus hängt an einem Knopf in der Küche** (`zones/kitchenBuild.ts`).
  Bei _Overcooked_ steht die Küche, wie sie steht; bei _PlateUp_ baut man sie
  zwischen zwei Tagen um, und genau das ist gemeint. Es ist der **große rote
  Knopf** auf seiner Säule — derselbe, der an den Effektquellen die Funken
  auslöst (`shared/redButton.ts`) —, und er ist **selbst ein benutzbares Ding**
  und kein Menüeintrag: hingehen, gelber Saum, `A`. Sein Schild sagt, was der
  nächste Druck tut, und wechselt deshalb mit: _Küche umbauen_, solange
  gekocht wird, _Küche nutzen_, solange umgebaut wird. Er steht auf der Kachel
  neben dem Eingang (`kitchenPlan.BUILD_BUTTON_TILE`), und die gehört ihm
  allein: Dort stand einmal der Hocker mit dem Feuerlöscher, und weil `A` immer
  nur **das Nächste** nimmt (`core/usable.pickUsable`), erwischte man den
  Schalter und nie den Löscher. Der Hocker steht seitdem oben in der Nordzeile
  neben dem Herd mit der Pfanne — also neben dem einzigen, an dem es brennen
  kann. Ist der Baumodus an, lässt sich **jedes** Möbel aufheben und tragen wie
  die Pfanne (dieselbe Hand, derselbe Knopf, dasselbe Vor-dem-Bauch-Tragen), und
  vor den Füßen liegt ein **Umriss**, der grün oder rot ist. Der Umriss ist
  ebenfalls ein Usable, und das ist kein Trick, sondern die einzige ehrliche
  Antwort auf „wohin drücke ich?": Ein Möbel in der Hand hat kein Ziel, auf das
  man zeigen könnte, also bekommt es eines. Gemeint ist die Kachel **0,7 m** vor
  der Figur (`BUILD_AHEAD`) — weit genug über die eigene Kachelkante bei 0,5 m
  hinaus und noch innerhalb der nächsten; mit einer ganzen Kachel sprang das
  Ziel bei jedem Schritt um zwei Felder. Beim Anschalten wandern die Hände frei,
  denn wer mit einem Teller in der Hand umzubauen anfängt, hätte ein Möbel
  **und** einen Teller darin — **frei heißt aber nicht fort**
  (`kitchenBuild.goesHomeOnEdit`): Was einen Platz hat, an den es gehört, geht
  dorthin zurück, und nur was keinen hat, wird weggeworfen. Für ein Brötchen
  stimmte das blanke Wegwerfen noch, es kommt aus der Ausgabe und kommt von dort
  wieder; Pfanne, Topf und Feuerlöscher werden beim Aufbau **einmal** aus dem
  Modell gelöst (`takeUtensil`), und wer den Umbau mit der Pfanne in der Hand
  anschaltete, warf die einzige Pfanne dieser Küche aus der Szene — gemerkt hätte
  man es nicht beim Anschalten, sondern zehn Minuten später am leeren Herd. Ist
  der Platz inzwischen belegt, weil ein Zugband etwas daraufgeschoben hat, wird
  trotzdem entsorgt: `layOn` schriebe sonst kommentarlos über, was dort steht.

  **Und mit den Händen hört die ganze Küche auf zu arbeiten** (`calmStations`):
  Das Anschalten macht dasselbe wie `B`/`Y` — alle Uhren aus, alle Flächen
  leer, der Gast vom Tisch, die Bänder halten, die Stapel weg. Bis eben räumte
  es nur die Hände und ließ alles andere laufen, und ein Herd, der brennt,
  während man das Möbel daneben verrückt, ist kein Bauzustand, sondern ein
  Unfall mit einem Zeitlimit: Man baut um, man kocht nicht. Dass ein brennender
  Herd sich nicht aufheben lässt (`whyNotLifted`, siehe unten), ist damit kein
  Fall mehr, in den man hineingerät, sondern einer, den man selbst herbeiführen
  muss.

  Zwei Ränder hat das Abräumen. **Was getragen wird oder auf einer
  Kopierfläche steht, bleibt, wie es ist**: Darauf liegt das, was mit dem Möbel
  fährt (`carryLoad`), und es dort abzustellen hieße, den Topf auf der Kachel
  abzusetzen, auf der sein Herd einmal stand. Und **das Umschalten macht in
  beide Richtungen die Hände frei**: Beim Ausschalten war das schon so, beim
  Einschalten ist es nötig, seit ein Möbel auch ohne Umbau in die Hand kommt
  (`takeFromCatalogue`).

  Dass das Schild dabei mitwechselt, steht in `showBuildLabel` und an **einer**
  Stelle: `reset()` legte `editing` um, ohne die Beschriftung mitzudrehen, und
  dann stand nach dem Aufräumen weiter _Küche nutzen_ auf dem Knopf, während
  längst wieder gekocht wurde. Eine Beschriftung, die das Gegenteil dessen
  sagt, was der nächste Druck tut, ist schlimmer als gar keine.

  **Ein Möbel fährt samt Inhalt um** (`kitchen.carryLoad`, `unloadLoad`). Hier
  stand lange eine Sperre: Wer einen Herd mit der Pfanne darauf aufheben wollte,
  bekam _„Herd ist nicht leer — erst abräumen"_ zu lesen. Das war keine Regel,
  sondern eine fehlende Zeile. Steht eine Pfanne auf dem Herd und der Herd wird
  versetzt, geht die Pfanne mit; dasselbe gilt für die Teller auf der Ausgabe,
  den Stapel auf dem Abtropfbrett und den Teller im Spülbecken, der dabei schräg
  im Wasser stehen bleibt. Technisch ist es ein **Träger am Möbel**: Was auf der
  Ablage stand, hängt sich beim Aufheben in eine Gruppe am Modell und steht dort
  auf derselben Höhe über dessen Fuß — von da an macht es jeden Schritt, jede
  Drehung und jedes Absetzen von allein mit, ohne dass je Bild etwas
  nachgerechnet würde. Der Träger hebt dabei den halben Maßstab des geladenen
  Modells wieder auf (`core/kitchenFit.kitchenPieceScale`), wie das Schild auf
  dem Deckel und das Wasser im Becken.

  **Was arbeitet, hält an — es bricht nicht ab.** Ein getragenes Möbel wird gar
  nicht erst gefragt (`kitchen.cook` überspringt, was in den Händen liegt), und
  beim Absetzen läuft die Uhr dort weiter, wo sie stand: Es gibt absichtlich
  **kein** `settle` beim Abstellen. Das halb gebratene Patty bleibt halb
  gebraten, der halbe Schnitt bleibt ein halber Schnitt. Die beiden
  Gegenentwürfe sind beide schlechter. _Weiterbraten, während der Herd fährt_
  hieße, dass er nach einer Weile in den Händen **anfängt zu brennen**
  (`kitchenClock`) — und dann hat man beide Hände voll Herd und bekommt den
  Feuerlöscher nicht mehr zu fassen. _Abbrechen und von vorn_ bestrafte genau
  den Handgriff, den dieser Modus anbietet: Der Teller verlässt seinen Platz
  nicht, das Möbel wandert **unter** ihm.

  **Einen Grund, ein Möbel stehen zu lassen, gibt es noch, und es ist das
  Feuer** (`kitchenBuild.whyNotLifted`). Ein brennender Herd ist der eine
  Zustand dieser Küche, der nicht wartet, und ausgemacht wird er mit dem
  Feuerlöscher **in der Hand** (`kitchenSpray.sprayOn`). Es gibt keinen zweiten
  Weg — also darf das Feuer gar nicht erst in die Hände: _„Herd brennt — erst
  löschen"_.

  **Die Fälle daneben lösen sich von selbst, und das ist kein Zufall.** Ein
  **Band, dessen Nachbar wegzieht**, meldet sein Ziel nicht mehr an (`stationAt`
  überspringt Getragenes), und `kitchenBelt.advanceBelts` streicht ein Ziel, von
  dem die Zone nichts erzählt — das Ding bleibt liegen, statt in der Luft zu
  hängen. Eine **belegte Kachel** bleibt belegt: Was mitfährt, ändert die
  Grundfläche nicht, und `whyNotBuilt` sagt weiter _„Hier steht schon etwas"_.
  Und **volle Hände** gibt es im Umbau nicht: Das Anschalten räumt sie, und
  solange umgebaut wird, behandelt die Spüle den Umbau wie eine volle Hand und
  lässt den sauberen Teller im Wasser stehen, statt ihn jemandem in die Finger zu
  drücken, der gerade einen Herd trägt.

  **Gedreht wird mit dem Blick, und zwar jedes Möbel** (`facePiece`,
  `kitchenBuild.turnAhead`): Was in den Händen liegt, zeigt dorthin, wohin die
  Figur zeigt — wer nach Süden schaut und absetzt, stellt es nach Süden hin.
  Beim **Förderband** ist das zugleich die Laufrichtung (`beltStep` hat
  dieselbe Reihenfolge), bei der **Ausgabe** die Seite mit der Mulde, beim
  **Herd** die Seite mit den Knöpfen. Gerundet wird auf die nähere der beiden
  Achsen, und genau auf der Diagonale gewinnt Nord-Süd — damit dieselbe
  Richtung immer dieselbe Drehung ergibt und nichts flackert. Hier stand lange
  das Gegenteil: dass die Blickrichtung nicht tauge, weil der Bauplatz die
  Kachel **vor** der Figur ist und man zum Verlängern einer Südbahn nördlich
  davon stehen müsste, wo schon das Band von eben steht. Das stimmt für die
  **Füße** und nicht für den **Blick** — von oben zielt die Maus (am Pad der
  rechte Stock) unabhängig davon, wohin gelaufen wird (`FlatControls.aimYaw`):
  Man läuft die Bahn rückwärts entlang und hält den Zeiger dorthin, wohin sie
  schieben soll; um die Ecke geht sie, indem man den Zeiger dreht.
  **Der Auslöser dreht dazu, wie es in den Händen liegt** (`turnPiece`,
  `Furnish.hold`) — in der Brille der Trigger der rechten Hand, von oben die
  linke Maustaste, `RT` am Pad und der rote Knopf auf dem Glas; wer ein Möbel
  trägt, trägt keinen Feuerlöscher, der Auslöser ist also frei. Er hängt
  **nicht mehr am Umbau**, sondern nur noch daran, dass etwas in der Hand liegt:
  Seit es den Möbelkatalog gibt, kommt ein Möbel auch ohne Umbau in die Hand,
  und eines, das sich nicht wenden lässt, ist eines, das man nur in einer
  Richtung hinstellen kann. Wer nichts trägt, drückt weiter ins Leere. Er
  dreht **nicht** die Welt, sondern den Versatz zur Figur, und die Weltdrehung
  wird daraus gerechnet (`turn = Blickviertel + hold`). Der Unterschied ist
  der Fall, für den es ihn gibt: die Ausgabe an der Westwand, deren Mulde nach
  Osten zeigen soll, während man die Reihe von Norden nach Süden entlangläuft.
  Eine Weltdrehung wäre im nächsten Bild von der Blickrichtung überschrieben;
  ein Versatz zur Figur bleibt, auch wenn sie sich umdreht — deshalb nennt der
  Satz dazu die Seite („Vorderseite nach links") und nicht die
  Himmelsrichtung.
  **Und es wird für den Träger klein** (`shrinkPiece`, ein Drittel — dieselbe
  Zahl wie die Vorlage auf der Kopierfläche, `MINI_SCALE`). Eine Ausgabetheke
  ist zwei Meter breit; vor dem Bauch getragen füllt sie **in der Brille und
  aus den Augen** das halbe Bild, und man trägt sie zum Bauplatz, ohne den
  Bauplatz noch zu sehen. **Von oben bleibt sie groß**: Dort schaut man von
  hinten oben auf die Figur, das Möbel liegt vor ihr und verdeckt Boden, den
  niemand braucht. Und für **Mitspieler** bleibt sie es auch — das ist hier
  gratis zu haben, denn ein getragenes Möbel hängt am Rig seines Trägers und
  wird gar nicht übertragen; was von außen zu sehen ist, rechnet jeder Client
  selbst. Beim Absetzen steht wieder das Möbel da (`dropPiece` setzt den
  Maßstab zurück).

  **Das getragene Möbel dreht sich mit der Figur** (`aimHeld`), wie die Pfanne
  und wie der Teller: Es hängt am Rig, und im Netz steht nur noch der Versatz.
  Hier wurde einmal der Gierwinkel des Rigs **herausgerechnet**, damit ein
  getragenes Möbel in Weltrichtung stehen blieb — seit die Drehung dem Blick
  folgt, hielt diese Rechnung das Möbel starr in der Welt, während die Figur
  sich darunter wegdrehte, und das sah aus, als klebte es in der Luft. Der
  Hinweis am Bauplatz nennt beim Band die Himmelsrichtung („Förderband nach
  Süden absetzen"), damit die Laufrichtung vor dem Absetzen dasteht und nicht
  erst danach. `B`/`Y` stellt es zurück an seinen alten Platz **und in seine
  alte Drehung** — quer gedreht in eine Lücke gezwängt, in der es längs stand,
  schöbe es sich ins Möbel daneben.
  **Das Schild auf dem Deckel dreht sich als Einziges nicht mit** (`aimIcon`):
  Es wird von oben gelesen, und dort liegt Norden oben. Die vier Ausgaben an
  der Westwand stehen gedreht (`turn: 3`), und ihre Bilder lagen deshalb auf
  der Seite — ein Brötchen im Profil ist kein Brötchen. Die Zone rechnet die
  Drehung des Möbels im Schild wieder heraus, und weil das an `Furnish.turn`
  hängt, gilt es auch für jedes Möbel, das gerade frei gedreht wird.
  Und dazu kommt ein neuer Punkt im Zonenvertrag:
  **`ZoneHost.removeSolid`** (`zones/zone.ts`). Ohne ihn bliebe die alte Sperre
  stehen, wo nichts mehr steht — eine unsichtbare Wand auf einer leeren Kachel,
  die niemand wiederfindet. Es ist der einzige Grund für diesen Handgriff;
  alles andere in dieser Welt stellt einmal hin und lässt stehen.

  **Und die Möbel bekommen ihre Griffe aus einer Regel**
  (`zones/kitchenGrab.pieceHandles`, `core/grabHandles.rimHandles`). Ein
  Küchenmöbel hat vier unsichtbare Griffe an den Kanten, je einer in der Mitte
  jeder Seite — und zwar **jedes**, ohne dass irgendwo eine Tabelle stünde. Der
  Mülleimer braucht keinen eigenen Eintrag, die Küchenzeile auch nicht, und ein
  siebzehntes Möbel im Katalog bekommt seine vier geschenkt. Das ist die
  ausdrückliche Bedingung des Auftrags, und ein Test rechnet sie über den
  **ganzen** Katalog nach, statt sechzehn Möbel einzeln nachzuschlagen: Wer die
  Regel durch eine Liste ersetzte, bekäme ihn rot.

  **Die Grundfläche ist die Kachelzahl** aus dem Katalog (`KitchenPiece.tiles`),
  eine halbe Faust (6 cm, `RIM_GRIP_IN`) nach innen gerückt — genau auf der
  Kante läge die Hand zur Hälfte neben dem Möbel. Ein Anteil statt der sechs
  Zentimeter machte den Griff am breiten Möbel breiter, ohne dass die Hand dabei
  wüchse.

  **Auf welcher Höhe, ist die eigentliche Entscheidung — und es ist die
  Arbeitsfläche** (`kitchenFit.kitchenDeck`) und nicht die Oberkante. Die
  Oberkante wäre die naheliegende Antwort und ist beim Nachschlagen sofort
  falsch: `height` ist beim Spülbecken die Spitze der **Armatur** (1,15 m), beim
  Feuerlöscher die Kappe des **Löschers** (1,25 m), beim Herd mit Topf der
  **Topfdeckel** (0,87 m). Vier Griffe am Wasserhahn sind keine Griffe. `deck`
  ist dagegen genau die Zahl, die im Katalog eingeführt wurde, um „die Fläche des
  Möbels" von „das Höchste, was darauf steht" zu trennen. Nachgerechnet liegt sie
  über den ganzen Katalog zwischen **0,45 m** (Spülbecken und Mülleimer) und
  **0,56 m** (Ausgaberegal) — Hüfthöhe bei einem Koch von 1,60 m, also dort, wo
  ein Mensch ein Möbel anfasst, um es zu schieben. Eine feste Zahl für alle wäre
  bequemer und stünde beim Mülleimer in der Luft; eine Ausnahmeliste wäre das,
  was der Auftrag nicht will. **Es braucht keine** — und das ist der Prüfstein,
  nicht die Bequemlichkeit.

  Einen Deckel nach oben (`PIECE_GRIP_HIGH`, die Traghöhe des Kochs) gab es
  dazwischen **einen Umbau lang**, und er ist wieder weg. Er stand da für die
  Tellerkiste, solange sie auf einer Arbeitsplatte stand und ihre Teller auf
  0,85 m auslegte — ein Griff dort oben wäre eine Schulter gewesen und keine
  Hüfte. Seit die Kiste auf dem Boden steht, gibt es kein Möbel mehr über der
  Grenze, und eine Grenze, die nichts mehr begrenzt, ist eine Zeile, die beim
  nächsten Lesen erklärt werden muss. Die untere Grenze im Test ist dafür
  **einschließend** geworden: Eine Kiste ist genau 0,40 m hoch, und ein Möbel
  abzulehnen, während sein Nachbar 1,2 mm höher durchgeht, prüfte eine Rundung
  und keine Regel.

  **Die gegriffene Kante bleibt einem zugewandt** (`kitchenBuild.holdForRim`).
  Wer in der Brille den Herd an seiner rechten Seite packt, hält ihn rechts, und
  rechts steht er nachher auch — man dreht ein Möbel nicht um, nur weil man es
  anhebt. Welche der vier Kanten gemeint ist, entscheidet der **Abstand zur
  Hand** (`grabHandles.nearestHandle`), dieselbe Rechnung wie beim Teller. Von
  oben und am Schreibtisch gibt es keine Hand, die irgendwo zufasst, und dort ist
  die Antwort `0` — also genau das, was dort immer galt: „aufgenommen wird mit
  der Vorderseite nach vorn". Das alte Verhalten ist nicht abgelöst, es ist der
  Fall „hinten angefasst".

  **In der Brille gilt für ein Möbel dasselbe wie für einen Topf**: die
  **Greif-Taste**, nur im **Meter** (`kitchenGrab.KITCHEN_REACH`, `'moore'`) —
  kein Nahgreifen, kein Ferngreifen, eine Küchenzeile kommt nicht aus drei Metern
  geflogen. Gedrückt wird beim Zufassen, **abgelegt beim Loslassen** (nach einem
  Halten) oder **beim zweiten Druck** (nach einem Tippen,
  `core/handUse.gripPressDrops`). Das gilt auch für den Umriss am Bauplatz: Ein
  Bauplatz, der stattdessen auf Berührung oder Trigger hörte, setzte das Möbel
  ab, sobald man beim Umsehen einmal darüberfährt. Sichtbar werden die vier
  Griffe mit demselben Häkchen wie alle anderen — _Grafik → Griffe zeigen_.
- **Der Computer-Tisch ist das erste Möbel mit zwei Bedeutungen an einem Netz**
  (`zones/kitchenDesk.ts`), und welche gilt, entscheidet die **Seite**, von der
  man herantritt (`pieceSide`): Vorn steht der Bildschirm, also wird vorn
  bedient; von der Seite und von hinten greift man nach dem Tisch selbst. Das
  ist keine Spitzfindigkeit, sondern die einzige Aufteilung, bei der beides
  erreichbar bleibt — ein Tisch, den man nur über einen Modus aufhebt, wäre im
  Umbau nicht zu versetzen, und einer, den jeder Druck aufhebt, hätte keinen
  Rechner. Aufgehoben wird trotzdem **nur im Umbau**: Wer beim Kochen hinter den
  Tisch tritt, will nicht mit ihm in den Händen dastehen, und bekommt es gesagt.
  - **120° vorn, 120° hinten, je 60° Flanke** (`SIDE_COS` = 0,5). Die
    naheliegende Aufteilung wäre ein Viertel je Seite und ist falsch herum
    gedacht: Vor einen Rechner **stellt** man sich nicht wie vor ein Foto, man
    kommt schräg heran und bleibt einen Schritt neben der Tastatur stehen. Bei
    90° Vorderseite ist das schon die Flanke, und der Tisch antwortet nicht
    mehr; mit 120° hat man eine Handbreit Spielraum nach beiden Seiten und
    trifft ihn im Vorbeigehen. Nach hinten dieselben 120°, und zwar aus
    Symmetrie und nicht aus Bedarf — eine Rückseite, die schmaler wäre als die
    Vorderseite, machte aus jedem Schritt um den Tisch herum ein Ratespiel.
  - **Die Grenze gehört zum großen Feld**, vorn wie hinten, und dafür steht eine
    Toleranz von 1e-9 im Code. Genau 60° ergeben je nach Herkunft der beiden
    Zahlen einen Kosinus von 0,5000000000000001 oder 0,4999999999999999; ohne
    sie entschiede über „vorn" oder „seitlich" das letzte Bit einer Wurzel, und
    der Tisch antwortete an derselben Stelle mal so und mal so. Vorder- und
    Rückseite sind deshalb geschlossen, die beiden Flanken offen.
  - **Wer genau auf dem Möbel steht, steht davor.** Beide Abstände nahe null
    ergeben keine Richtung, und dann muss eine der drei Antworten die
    voreingestellte sein. Es ist `'front'`, weil das die **harmlose** ist: Wer
    im Gedränge in die Ecke des Tisches läuft, will an den Rechner und nicht den
    Tisch in der Hand haben. Aus demselben Grund fällt auch eine kaputte Zahl
    (`NaN`) hierher — der Vergleich ist verneint geschrieben, damit sie nicht
    zur Rückseite durchrutscht.
  - **Die Platte liegt auf 0,75 m** und mit Absicht nicht in der
    Arbeitsplattenreihe (0,50 m): Ein Schreibtisch, an dem man steht, hat seine
    Platte in Bauchhöhe, und auf diesen hier legt ohnehin niemand einen
    Salatkopf. Er trägt deshalb auch **kein `worktop`** und bekommt keine
    Station (`stationKind` gibt `null`); seine einzige Wirkung sitzt vorn am
    Bildschirm. Er steht an der Westwand neben der Ankunftskachel und schaut ihr
    ins Gesicht (`turn: 3`) — ein Möbelkatalog, den man erst suchen muss, ist
    einer, den niemand aufmacht —, und zwei Kacheln weiter südlich steht der
    rote Umbauknopf: Der Knopf macht den Umbau auf, der Rechner gibt die Möbel
    dazu her.
- **Der Möbelkatalog ist das Konstrukt hinter dem Bildschirm** (`openCatalogue`,
  siehe _Der Konstrukt-Raum_). Die Küche verblasst, der Tisch bleibt stehen, und
  ringsum fahren alle Katalogstücke als **Miniaturen** aus dem Boden. Wer eines
  anfasst, hat es in der Hand und steht im selben Augenblick wieder in der Küche
  — an genau der Stelle, an der er vor dem Tisch stand, denn bewegt hat er sich
  nie. Im Konstrukt zählt die Seite dann nicht mehr: Dort ist der Tisch das
  Einzige, was noch dasteht, und damit der einzige Weg zurück.
  **Mit vollen Händen geht er nicht auf.** Die Figur trägt genau **ein** Ding
  vor dem Bauch (`carryInHands`), Essen und Möbel teilen sich diesen Platz. Wer
  mit einem Brötchen in der Hand ein Möbel zöge, bekäme ein Möbel, das dreißig
  Meter neben ihm herflöge, weil es niemand hinstellt.
  - **Die Miniaturen werden geklont, nicht gebaut** (`miniature`). Von jeder
    Sorte merkt sich die Zone das erste Netz, das ohnehin gebaut wird — und weil
    der **Schauraum** jedes Katalogstück genau einmal zeigt
    (`KITCHEN_SHOWN`, gegen `KITCHEN_NAMES` geprüft), ist diese Sammlung
    vollständig, ohne dass jemand eine zweite Liste führt. Geklont wird mit
    `Object3D.clone()`, Formen und Materialien bleiben also **geteilt**: eine
    Miniatur kostet einen Knoten und keine Geometrie. Ein zweiter Ladevorgang
    nur für Miniaturen wäre dieselbe Datei ein zweites Mal — 32 MB für ein
    Regal. Geklont wird **einmal** und danach aufgehoben (`minis`): Achtzehn
    Klone samt `Box3` je Öffnen waren die Hälfte der Pause vor dem ersten Regal.
  - **Ein Klon eines ausgeblendeten Netzes ist ausgeblendet** (`cloneModel`).
    Der Konstrukt-Raum setzt beim Betreten jedes oberste Kind der Weltgruppe auf
    `visible = false` — und die Vorlagen in `models` sind genau solche Kinder.
    Beim Verlassen wird das **Original** wieder sichtbar, weil es auf der Liste
    `hidden` steht; ein Klon, der erst danach entstand, steht dort nie drauf und
    bleibt für immer unsichtbar. Ein Möbel aus dem Katalog war deshalb weder in
    der Hand noch auf seiner Kachel zu sehen, obwohl es beides gab und beides
    funktionierte. Jeder Klon bekommt seine Sichtbarkeit jetzt an **einer**
    Stelle zurück, und zwar nur auf der Wurzel: Was darunter aus eigenen Gründen
    unsichtbar ist, soll es bleiben.
  - **Auf 80 cm gerechnet, nicht auf einen festen Faktor** (`MINI_SIZE`, längste
    Kante). Jedes Stück steht allein auf einer Kachel, und eine Kachel ist einen
    Meter breit (`shared/construct.TILE_SIZE`): 80 cm lassen zu jeder Seite eine
    Handbreit Luft zur Fuge, und der Nachbar steht ohnehin einen ganzen Meter
    weiter. Die Zahl darf sich damit danach richten, was man **sieht**, statt
    danach, was noch dazwischenpasst — und sehen muss man es aus drei, vier
    Metern, denn so weit steht der Ring vom Anker weg. Bis September 2026 waren
    es 28 cm, gerechnet auf den Abstand zweier Bretter im alten Bogen. Und
    zwischen einem Mülleimer (45 cm) und einer Ausgabetheke über zwei Kacheln
    liegt der Faktor vier: Mit einem festen Maßstab wäre entweder die Theke zu
    groß für ihre Kachel oder der Eimer ein Krümel. Der Ursprung wandert dabei
    nach unten in die Mitte, weil der Konstrukt-Raum seine Stücke auf eine
    Kachelmitte stellt und nicht an ihrem Modellursprung aufhängt.
  - **Ein Stück aus dem Katalog entsteht neu und bekommt trotzdem eine
    Heimatkachel** (`takeFromCatalogue`, `freeTile`). Das ist kein Beiwerk:
    `B`/`Y` stellt jedes getragene Möbel heim, und eines ohne Zuhause landete
    dann auf einer Kachel, auf der schon etwas steht. Gesucht wird deshalb eine
    freie, von Norden nach Süden gelesen wie der Aufbau selbst — und ist die
    Küche voll, gibt es eben kein neues Möbel. **Getragene Möbel belegen dabei
    ihre Heimat und nicht ihren Standort**: Sonst bekämen zwei nacheinander
    geholte Mülleimer dieselbe Heimatkachel (die war ja frei, als der zweite
    geholt wurde) und stünden beim Aufräumen ineinander. Ohne **Gerät** kommt
    es dazu:
    `takeUtensil` gäbe eine zweite Pfanne heraus, und es gibt genau eine.
  - **Gezeigt wird, was geladen ist**, und nicht, was im Katalog steht. Ohne
    WebGL und ohne Modelldatei gibt es keine Netze, und ein Regal aus leeren
    Gruppen wäre ein weißer Raum, in dem man nichts findet; dann sagt der Tisch
    das auch. Die **gebauten** Stücke — Bänder, Tisch, Kopierer — stehen immer
    darin, sie hängen an keiner Datei.
- **Der Kopierer hat zwei Felder nebeneinander** (`zones/kitchenDesk.ts`,
  `useCopier`): links die **Kopierfläche**, rechts die **Kopie-Zone**, beide auf
  0,50 m und damit auf der Arbeitshöhe der Zeile. Ein Gerät, das „dasselbe Ding,
  noch einmal" behauptet und dessen Kopie zwei Zentimeter höher steht als die
  Vorlage, behauptet es nicht überzeugend. Zwei Kacheln misst es deshalb auch:
  Auf einer stünden Vorlage und Kopie übereinander. Es steht in der freien Mitte
  zwischen Insel und Gastraum und nicht an einer Wand — was man kopiert, trägt
  man vom Rechner her heran und danach irgendwohin, und ein Gerät in der Ecke
  wäre zweimal derselbe Weg.

  - **Es erklärt sich ohne ein einziges Wort** — drei Zeichen, kein Schild.

    Die **Sparrenspur** (`LANE_MARKS`, fünf Spitzen je Längsseite) läuft von der
    Mitte der Kopierfläche zur Mitte der Kopie-Zone, und ein Licht wandert sie
    entlang (`DeskKit.update`, `LANE_SECONDS` = 1,2 s). Sie ersetzt den einen
    23-cm-Pfeil, der vorher an der Vorderkante lag: Gelesen wird dieses Möbel
    aus 16 m Höhe, und dort war er ein Strich — und er lag nur **vorn**, obwohl
    `copierField` das Gerät von jeder Seite bedienen lässt. Dass die Spur
    läuft, ist dieselbe Entscheidung wie bei den Sparren auf dem Band, samt
    Begründung: Eine Richtung, die sich bewegt, liest man, ohne sie zu suchen,
    und sie läuft auch ohne Vorlage — wer erst dann zeigt, wohin es geht, zeigt
    es zu spät. Je Spitze eine eigene Farbe, über alle Kopierer einer Küche
    geteilt: Zwei Geräte, die verschieden blinkten, sähen aus wie zwei
    verschiedene Geräte.

    Der **Zielrahmen** auf dem Glas (`MARK_LONG`) ist vier offene Winkel in den
    Ecken der Kopierfläche — die Markierung eines Scanners: Hier legt man etwas
    hinein. Der **Bühnenrahmen** um die Kopie-Zone (`PAD_BAR`) ist dagegen
    geschlossen, und die vier Pfosten stehen auf seinen Ecken. Ohne ihn ist das
    dunkle, matte Feld aus 16 m Höhe ein **Loch**, und ein Loch lädt dazu ein,
    etwas hineinzulegen — also zu genau dem Gegenteil dessen, was die Zone tut.

    Zwei Felder, zwei Zeichen, eine Richtung dazwischen. Ein Schild („rein",
    „raus") wäre die vierte Sprache in dieser Küche und die einzige, die man
    übersetzen muss.
  - **Wer ein Möbel trägt, legt es links als Miniatur ab** (`layOnPlate`) — und
    es bleibt **dasselbe** Möbel, nur klein, nicht seine Nachbildung. Klein
    heißt hier ein **Drittel** (`MINI_SCALE`) und damit eine andere Zahl als im
    Katalog, weil die Frage eine andere ist: Dort geht es darum, sechsundzwanzig
    Möbel nebeneinanderzustellen, hier darum, eines auf eine Kachel zu stellen. Ein
    Faktor und kein gerechnetes Maß — so bleibt der Größenunterschied zwischen
    Mülleimer und Ausgabetheke auf der Platte sichtbar, und man sieht der
    Vorlage an, was man kopiert.

    **Ein Faktor auf das Grundmaß und nicht auf die Eins** (`pieceScale`), und
    das ist die Zeile, die man vergisst: Ein geladenes Möbel kommt halbiert aus
    der Datei (`core/kitchenModel.ts` setzt `KITCHEN_SCALE` auf das **Netz**,
    nicht auf die Geometrie), ein gebautes steht auf 1. Wer beide auf `1/3`
    setzte, machte aus jeder Küchenzeile zwei Drittel ihrer selbst statt ein
    Drittel — und wer sie danach mit `setScalar(1)` „wieder normal" machte,
    verdoppelte sie, während ihre Hülle blieb, wo sie war: Die kommt aus dem
    Katalog und nicht aus dem Netz. Das Grundmaß wird deshalb beim ersten
    Aufstellen gemerkt und überall von dort geholt. Es bleibt
    ein `Furnish` mit `held = true`: kein Körper, keine Kachel, nichts, was der
    Bauplatz für belegt hält. Sein Netz hängt fortan am Kopierer und nicht mehr
    am Gestell des Spielers, damit die Vorlage mitfährt, falls jemand das Gerät
    später versetzt. Wer sie herunternimmt, bekommt genau dieses Möbel zurück,
    in voller Größe und in die Hand.
  - **Rechts steht daraufhin eine durchscheinende Kopie** (`showCopy`,
    `COPY_ALPHA` = 0,55). Sie ist so lange nichts, bis jemand sie nimmt — dann
    entsteht in der Hand ein echtes Möbel, und die nächste wächst sofort nach.
    Das Gerät gibt also unbegrenzt her, solange die Vorlage liegen bleibt; das
    ist die Absicht und kein Versehen. Die Kopie bekommt dabei **eigene**
    Materialien: Ein geklontes Netz teilt sein Material mit dem Original, und
    wer dort `opacity` verstellte, machte das Möbel in der Hand gleich mit
    durchsichtig. Sie gehen mit ihr (`clearCopy`) und nicht in die Liste der
    Welt — die Kopie entsteht bei jedem Griff neu, und eine Liste, die erst beim
    Weltwechsel geleert wird, wüchse mit jedem kopierten Möbel.

    **Ein einzelnes Material bleibt dabei ein einzelnes**, und genau das tat es
    lange nicht: Die Schleife holte sich `[mesh.material]`, färbte um und
    hängte die **Liste** wieder ein — auch dort, wo vorher ein einzelnes
    Material hing. Ein Netz mit einer Materialliste rendert three.js über
    `geometry.groups`, und eine Geometrie aus einer glTF-Datei hat keine: Was
    dabei herauskam, war kein blasses Möbel, sondern **gar keines**. Die Kopie
    gab es, man konnte sie nehmen, sie stand nur nicht da — das Gerät sah
    kaputt aus, ohne es zu sein. Dieselbe Falle steht überall dort, wo
    `Array.isArray(mesh.material) ? … : [mesh.material]` nicht nur **gelesen**,
    sondern auch wieder zurückgeschrieben wird.

    **Und sie leuchtet im Grün des Geräts** (`COPY_GLOW`, `emissiveIntensity`
    0,3). Ein Möbel, das nur halb durchsichtig ist, verschwindet auf der matten,
    dunklen Wiege — ausgerechnet ein brauner Unterschrank wird dort zu einem
    braunen Schatten auf Schwarz. Mit dem Grün trägt die Kopie ihr eigenes
    Licht, egal welche Farbe das Möbel hat, und sagt zugleich, was sie ist:
    nicht das Möbel, sondern das, was der Kopierer davon zeigt. 0,3 und nicht
    mehr, denn wer eine Küchenzeile kopiert, soll eine Küchenzeile sehen und
    keinen grünen Klotz.
  - **Solange die Vorlage liegt, lässt sich das Gerät nicht aufheben.** Ein
    Kopierer, den man mit der Vorlage darauf durch die Küche trägt, wäre ein
    Möbel mit einem Möbel darin, und beim Absetzen wüsste niemand, wo die
    Vorlage hingehört. Aus demselben Grund räumt `reset()` **jede**
    Kopierfläche mit ab (`clearPlates`): Was dort steht, geht über die Hand
    heim — `takeFromPlate` und `dropPiece(true)` sind die beiden Handgriffe,
    die ein Möbel schon richtig zurückschicken (Körper, Kachel, Station,
    Anzeigen), und ein dritter Weg dorthin wäre der, der eines davon vergisst.
    Ohne das stünde nach dem Aufräumen eine Vorlage auf einem Kopierer, den
    niemand mehr aufheben kann.

    **Von beiden Hälften geht es**, solange keine Vorlage liegt: Wer im Umbau
    vor der leeren Kopie-Zone steht, soll das Gerät nicht erst umrunden müssen.

    Und es gibt so viele Kopierer, wie jemand sich holt: Welches Möbel sich
    selbst bedient, entscheidet seine **Sorte** (`selfServed`) und kein Merker
    auf ein bestimmtes Stück — ein Merker zeigte nach dem zweiten Kopierer aus
    dem Katalog auf den neuen, und der erste stünde als totes Möbel herum.
    Belegt ist deshalb auch nicht *die* Kopierfläche, sondern eine Karte von
    Kopierer zu Vorlage (`plates`).
  - **Welches Feld ein Druck meint, rechnet `copierField`** aus den
    **gedrehten** Feldmitten (`copierSpot`, dieselbe Vierteldrehung wie
    `standAt` — und mit ganzzahligen Kosinus, damit eine Feldmitte auf der
    Kachel liegt, auf die sie gehört, und nicht ein Zehnbillionstel daneben).
    Genau in der Mitte zwischen beiden gewinnt die Kopierfläche: Dort fängt jede
    Benutzung an, und ein leeres Feld wäre die unbrauchbarere Antwort.
  - **Eine Anmeldung und nicht eine je Feld**, was naheliegender aussähe und
    falsch ist: Die Auswahl nimmt das **nächstgelegene** Ding, dessen
    Zielzylinder der Strahl trifft (`core/usable.pickUsable`), und der Zylinder
    des ganzen Kopierers ist mit über einem Meter größer als der Abstand der
    beiden Feldmitten. Er gewönne damit gegen jedes kleine Ding, das man auf
    eines der Felder stellt — auch dann, wenn man genau davorsteht. Ein Möbel,
    zwei Felder, eine Anmeldung: Der gelbe Saum umfasst das ganze Gerät, und das
    ist die ehrlichere Auskunft, denn bedient wird der Kopierer und nicht die
    Glasplatte.
- **Rechner und Kopierer melden sich selbst an** (`refreshSpecials`, `setSelf`)
  und hängen an keiner Station: Für `stationKind` sind sie nichts, also käme in
  der Schleife über die Stationen nie eine Anmeldung für sie zustande. Wer das
  ist, entscheidet die **Sorte** (`selfServed`) und kein Merker auf ein
  bestimmtes Stück — der Möbelkatalog gibt jedes Katalogstück her, den Rechner
  eingeschlossen, und ein Merker zeigte nach dem zweiten auf den neuen, während
  der erste als totes Möbel dastünde. Ihre gilt
  in **beiden** Betriebsarten — auch beim Kochen soll man den Katalog aufmachen
  können, und kopieren auch dann, wenn gerade nicht umgebaut wird. Was ein Druck
  bedeutet und ob er `press` oder `grab` heißt, wird bei **jedem Lesen** neu
  gerechnet, wie bei den Stationen nebenan: Derselbe Rechner wird von vorn
  gedrückt und von hinten gegriffen, ohne dass sich sein Netz dazwischen ändert.
  Mit einem Möbel in der Hand hört der **Kopierer** weiter zu (auf ihn legt man
  es ja), der **Rechner** nicht — dort holt man eines, und zwei auf einmal trägt
  niemand; abgemeldet gewinnt stattdessen der Bauplatz vor den Füßen, und das
  ist auch das, was man dann will. **Im Konstrukt schweigt der Kopierer von
  selbst**, ohne dass ihn jemand abmeldet: Die Auswahl übergeht, was unsichtbar
  ist (`PortalWorld.collectUsables`), und der Raum blendet alles aus außer dem
  Anker. Genau deshalb bleibt umgekehrt der **Rechner** ansprechbar — er ist der
  Anker und damit der Weg zurück.
- **Nicht schießbar** (`addUsable`, `shot: 0`): Eine Kugel, die den Topf vom
  Herd holt, ist ein Scherz und keine Regel.
- **Was in Jest steht und was nicht.** Die Regeln, die Uhren, die Rezepte, der
  Strahl des Löschers, die Laufzeit des Bandes, der Platz auf dem Grundriss,
  die Rechnung des Icon-Ofens, die Seite vor einem Möbel samt den beiden
  Feldern des Kopierers (`kitchenDesk.test.ts`) und die Zuordnung Möbel →
  Stationsart sind
  geprüft (rund 270 Fälle). Die Zone selbst ist es nicht: In der Testumgebung
  gibt es kein WebGL, also entstehen dort gar keine Stationen. Wer sie anfasst,
  spielt einen Durchgang im Browser durch — Patty braten, Pfanne über dem
  Brötchen auskippen, Teller holen, servieren, dem Gast beim Essen zusehen, das
  Geschirr abräumen und spülen, ein Feuer mit dem gehaltenen Löscher ausmachen,
  den Umbau anschalten (und nachsehen, dass danach nichts mehr läuft und die
  Pfanne wieder auf ihrem Herd steht), ein Möbel versetzen und mit dem Auslöser
  drehen, ein Band aufheben und es in allen vier Richtungen absetzen, am
  Rechner den Katalog aufmachen und ein Möbel herausgreifen, es auf den
  Kopierer legen und die Kopie daneben abholen, `B` drücken.


## Der Körper unter dem Möbel

Hier lag der Fehler, wegen dem man **durch** die Küche lief: `addSolid` misst
die Hülle des Objekts, das es bekommt (`PhysicsWorld.halfExtentsOf`), und ein
geladenes Möbel ist eine **Gruppe** ohne eigene Geometrie. Für die bleibt der
Notnagel von 10 cm Halbmaß — ein Würfelchen von 20 cm mitten im Herd, im Boden
zur Hälfte versenkt. Von einer Küche aus dreißig Möbeln war damit nichts fest
außer dreißig Kieselsteinen.

Jedes Stück bekommt deshalb einen eigenen, **unsichtbaren Kasten** in der Größe
seiner Kachelfläche. Zwei Dinge daran sind es wert, aufgeschrieben zu werden:

- **In der Küche ist er mindestens 1,40 m hoch**, auch wenn der Tresen nur
  einen halben Meter misst. Der Spieler springt mit 4,4 m/s ab, das ist gut ein
  Meter Scheitelhöhe (`PhysicsLocomotion.jumpSpeed`) — wer einmal oben stand,
  lief die ganze Wand entlang, über Spüle und Herd hinweg. Bei _Overcooked_ ist
  genau das der Witz an einer Küche: Man geht **herum**, nicht darüber. Im
  Schauraum bleibt es bei der echten Höhe; dort gibt es kein „darüber hinweg",
  nur ein Möbel zum Ansehen.
- **Und es bleibt bei einem Kasten.** Der erste Versuch setzte die Sperre als
  zweiten Körper auf den ersten, damit eine Kugel über den Tresen fliegen kann.
  Zwei Körper übereinander an derselben Stelle sind für die Spielerkapsel aber
  keine Wand, sondern eine **Falle**: Sie blieb beim Springen dagegen auf
  halber Höhe davor hängen und fiel nicht mehr herunter — im Browser gemessen,
  an derselben Stelle, an der eine gewöhnliche Wand einen sauber abprallen
  lässt. Eine Wand ist ein Kasten, also ist auch das hier einer.
