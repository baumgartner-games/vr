# Die Werkzeugseite

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

Neben dem Spiel steht eine zweite Seite: **`tools.html`**, und sie ist kein
Spiel. Kein WebXR, keine Physik, keine Welt — eine Liste aller Werkzeuge, und
wer eines antippt, dreht es mit dem Finger und schaltet die Hand daran ein
und aus. Von selbst dreht es sich **nicht** mehr: es drehte sich eine Weile,
und das nahm ihm das Einzige, was man an ihm wissen will — wo vorne ist. Dafür
steht eine **Zielscheibe** davor, auf dem **Zeigestrahl der Hand** (nicht des
Werkzeugs): das Bild aus der Brille, wenn man den Controller auf etwas richtet
— aus der Hand läuft die **weiße Linie** sauber nach vorn auf die Scheibe, und
das Werkzeug liegt dabei so in ihr, wie es eben liegt. Ob das Werkzeug
**selbst** dorthin zielt, sagt sein violetter Pfeil daneben; beim Hammer, beim
Beutel oder am Controller gibt es keinen, und genau das ist die Auskunft, wie
die Hand das Ding hält.

Die weiße Linie gehört dem **Gerät** und nicht den Fingern: sie steht im
Griffraum und ändert sich deshalb weder mit dem Trigger noch mit dem
Griffknopf. Vorher hing dort eine bernsteinfarbene Linie an der
**Fingerspitze**, die jede Krümmung mitmachte — beim Ziehen des Triggers ging
sie an der Scheibe vorbei, und aus dem Bild „so zeigt die Hand" wurde „so steht
gerade dieser eine Finger". Abstand und Größe
der Scheibe hängen an der Größe des Werkzeugs, und sie zählt beim Einpassen
mit — das Werkzeug wird dadurch kleiner, dafür gibt es das Zoomen
(`placeTarget` in `tools/viewer.ts`; der Strahl liegt im Griffraum 30° unter
dessen -Z, `GRIP_TO_RAY`, und in der Ansicht _In VR_ bei
`Lage-im-Griff⁻¹`).

**Und die Hand steht bei jedem Werkzeug gleich.** Lange stand das _Werkzeug_
aufrecht in seinem eigenen Raum und die Hand lag daran, wie dieses Werkzeug
eben gehalten wird — damit brachte jede Seite ihre eigene Schräge mit: an der
Pistole zeigte die Hand waagerecht nach vorn und die Scheibe stand ordentlich
daneben, an der Taschenlampe zeigte dieselbe Hand gut 30° in den Boden und die
Scheibe rutschte mit ihr schräg nach unten aus der Mitte. Wer zwei Werkzeuge
vergleichen wollte, verglich zuerst zwei Schrägen. Dabei ist die **Hand** das
Einzige, was an allen Werkzeugen dasselbe ist. Also steht jetzt sie und nicht
das Werkzeug: die Bühne wird so gedreht, dass der Rahmen der echten Hand
(`handFrame.ts`) überall dieselbe Lage hat und der Zeigestrahl in der
Ausgangsansicht **waagerecht quer durchs Bild** auf die Scheibe läuft
(`tools/handStage.ts`, mit Test). Die Zahl dazu ist eine reine Gierung, und sie
hängt am Gierwinkel der Ausgangsansicht: gemeinsam ergeben die beiden den
Viertelkreis, der den Strahl quer vor die Kamera legt statt in sie hinein — und
eine Querlinie kippt das Nicken der Ansicht nicht.

Gedreht wird dabei die **ganze Bühne** und nur sie: Werkzeug, Hand, Zylinder,
Strahl und Scheibe gehen miteinander, zueinander ändert sich nichts. Es ist ein
anderer Blick auf dieselbe Welt und keine andere Welt — deshalb gilt die
Drehung in allen drei Ansichten, sonst spränge beim Umschalten der Hand die
Bühne.

**Links oder rechts** steht als eigener Schalter im Kopf, neben _Hand in VR_.
Er gehört zu dem, was weiter oben unter _Eine Haltung gehört einer Hand_ steht:
gemessen ist jede Haltung an der rechten, die linke wird daraus gerechnet —
gespiegelt, oder bei der Stoppuhr um die eigene Hochachse gedreht —, und
nachsehen kann man das nur, wenn man beide zeigen darf. Der Viertelkreis der
Bühne geht dafür links **andersherum** (`handOnStage(side)`): in der Brille
sitzt der Kopf zwischen den Händen, auf die rechte sieht man von links und auf
die linke von rechts. Eine Bühne, die beide von derselben Seite zeigt, zeigt
eine davon von hinten — bei der Stoppuhr sah man dann statt des Zifferblatts
die Faust davor. Der Zeigestrahl läuft links entsprechend in die andere
Richtung quer durchs Bild, und das gehört dazu: eine linke Hand zeigt nach
links. Die sechs Zahlen im Bearbeiten-Feld gehören dabei zu der Hand, die man
_sieht_ — wer links zieht, zieht an der linken Haltung, und das Werkzeug führt
sie ab da als seine (`Tool.holdHand`). Die beiden **Controller** hören nicht
auf den Schalter: sie gibt es je Seite einzeln, sie behalten ihre, und der
Schalter zeigt das, indem er ihre Seite markiert und dabei stumpf wird. Die
Wahl bleibt im Browser (`bgvr.toolPageSide`). Schräg im Bild liegt danach nur noch, was auch in der Hand schräg liegt:
dass die Taschenlampe an der Scheibe vorbeisieht, ist keine schiefe Ansicht
mehr, sondern die Auskunft — **so hält man sie**. Beim Justieren ist die
Drehung eingefroren wie `gripBase`, und aus demselben Grund: in _Hand in VR_
steht das Werkzeug still und die gezeichnete Hand wandert daran; führte die
Bühne die echte Hand dabei nach, drehte sich stattdessen das Werkzeug unter ihr
weg.

**Die Mitte kommt in den Drehpunkt, und zwar richtig.** Eingepasst wird auf
Werkzeug und Zielscheibe: erst wird gemessen, dann wird das Gezeigte um seine
Mitte versetzt. Gemessen wird in der **Welt**, versetzt aber im **Drehpunkt**,
und der ist gedreht — eine Mitte, die man aus der Welt abliest und ungedreht
wieder einsetzt, landet um genau diese Drehung daneben. Das war das schräg im
Bild hängende Werkzeug mit der großen leeren Ecke daneben; seit die Mitte den
Weg zurück durch die Drehung nimmt, sitzt sie wirklich im Drehpunkt und bleibt
auch beim Drehen dort (`fit` in `tools/viewer.ts`).

**Ein Werkzeug dreht sich nur um seine Y-Achse.** Ziehen giert, mehr nicht: das
Nicken ist am Werkzeug abgeschaltet, und der Blickwinkel von schräg vorn, mit
dem die Seite aufmacht, bleibt der einzige. Ein Werkzeug steht in der Ansicht
so, wie es in der Hand steht, und wer daran zieht, will es von allen Seiten
sehen — nicht von oben und unten. Bei einer **Welt** bleibt das Nicken, dort
_ist_ die Vogelperspektive das, worum es geht; und in der freien Kamera
sowieso, die schaut sich um (`onMove` in `tools/viewer.ts`).

Wozu die Seite, sieht man am Telefon: „wie sieht das eigentlich aus" hieß in
der Brille einmal, in den Eingaberaum zu laufen und sich an einen Stand zu
stellen, und das ist zu weit für eine Frage, die man im Vorbeigehen stellt.
Seit diese Welt gelöscht ist, ist die Seite nicht mehr der kürzere Weg, sondern
der einzige.

**Vier Regale, ein Zuschauerplatz, eine Schublade.** Hinter dem Burger-Symbol
liegen **Werkzeuge**, **Welten**, der **Magische Beutel** und die **NPCs**,
darunter
**Verbinden** (siehe unten), dazu der Weg zurück in die Spielwiese
und zum Quellcode; das Regal, in dem man steht, trägt ein Lesezeichen. Ganz
unten, in Warnfarbe, steht **Eigene Einstellungen löschen**: der Weg zurück auf
die ausgelieferten Zahlen für dieses Gerät. Er gehört hierher, weil hier
eingestellt wird — wer eine Haltung verzogen hat und nicht mehr weiß, welche,
käme sonst nur über die Entwicklerwerkzeuge des Browsers wieder heraus —, und
er gehört in die Schublade und nicht neben den Regler: der Knopf dort heißt
auch _Zurücksetzen_ und meint **eine** Haltung. Gelöscht wird alles unter
`bgvr.` — Handhaltungen und Werkzeuglagen, aber ebenso Gürtel, Waffenwerte und
Drohne, denn es ist derselbe Speicher derselben Herkunft. Die Rückfrage sagt
das vorher; rückgängig macht es niemand.

**Und der Speicher darf kaputt sein.** Ein Eintrag ohne `position` warf in
`applyStoredPose` eine Ausnahme — mitten im Aufbau der Seite, also _bevor_
irgendein Knopf hing, und damit war auch der Löschknopf weg. Eine Seite, die an
ihrem eigenen Speicher stirbt, kann ihn nicht mehr zurücksetzen; also wird dort
geprüft, was zurückkommt, und Unsinn wird still übergangen
(`tools/poseStore.ts`). Eine
Welt zeigt **sich selbst** (siehe unten), darunter die Beschreibung aus der
Registry, für wen sie ist, ob sie experimentell ist, und einen Knopf _Welt
betreten_, der auf `./#<id>` führt. Ein Beutel-Objekt zeigt sich selbst,
gebaut mit demselben `createPropShape` wie im Spiel, mit Masse, Maßen und
Collider-Form als Zeile. Im **NPC-Regal** stehen die beiden Hälften
nebeneinander und einzeln, so wie sie es im Spiel auch sind: eine **Haut**
steht da und **geht auf der Stelle** — ein NPC, der still steht, ist ein
Kleiderständer, und das Einzige, was man an ihm ansehen will, ist sein Gang —,
daneben liegen die **Hirne** als eigene Kacheln mit ihren Zahlen: Tempo,
Drehrate, Sichtweite, Reichweite und Wartezeit. Eine Liste aus sechs
Kombinationen beantwortete keine der beiden Fragen, die man hier stellt (_wie
sieht ein Zombie aus_ und _was macht „Verfolgen"_). Gedreht steht die Haut im
**Dreiviertelprofil**: genau auf die Kamera zu sind die ausgestreckten Arme
eines Zombies zwei Stummel, und die Silhouette ist bei ihm die Auskunft. Beide Listen kommen aus dem Spiel (`WORLDS`,
`BAG_ITEMS` — die Beutel-Liste ist dafür aus `PortalWorld` nach `props.ts`
gewandert): ein Regal, das man von Hand pflegt, ist nach dem dritten Werkzeug
veraltet. Was kein Werkzeug ist, stellt der Viewer über `showObject` auf die
Bühne — ohne Boxhand, mit einem `animate`-Haken für alles, was sich von selbst
bewegt.

**Eine Welt liegt da wie ein Ding im Regal.** Vorher stand hier ihr Tor aus dem
Hub: hübsch, aber es zeigt von einer Welt genau das, was an jeder Welt gleich
aussieht. Jetzt baut die Welt sich selbst auf — `World.preview()`, mit
demselben Code wie im Spiel — und wird angesehen wie ein Werkzeug: **ganz
drauf, schräg von oben** (gut 30°), zum Drehen mit dem Finger. Darum geht es
dabei: um den Überblick. Wer wissen will, ob ihm eine Welt gefällt, will
zuerst ihren Grundriss sehen — die Runde, das Tal, die vier Zimmer — und erst
danach, wie es darin aussieht; dafür gibt es den Knopf _Welt betreten_.

Drei Dinge machen daraus einen Überblick statt eines Kastens:

- **Kulisse zählt nicht mit.** Der Himmel einer Welt ist eine Kugel von 560
  Metern, ihr Boden eine Platte von tausend — auf beide eingepasst wäre jede
  Welt ein Punkt in der Mitte. Was `markBackdrop` trägt (`createSky`,
  `createGround`, dazu was eine Welt sonst an Himmel mitbringt), wird beim
  Einpassen übersprungen und trotzdem gezeichnet: dahinter gehört es hin.
- **Ein Dach wird aufgeschnitten — über allem, was darunter steht.** Eine Welt
  mit Decke füllt beim Bauen `this.roof`, und die Vorschau legt eine
  Schnittebene hinein — Puppenhaus statt Deckel. **Wie hoch, wird gemessen und
  nicht gesetzt** (`tools/worldCut.ts`, mit Test): Der Schnitt liegt über der
  höchsten Oberkante der Welt, nie unter Kopfhöhe und nie über der Decke — und
  was bis an die Decke reicht, zählt dabei nicht mit, denn das ist die Hülle,
  die ja gerade weg soll. Vorher lag er fest auf 2,40 m, und das war nur in
  einem Zimmer richtig: In einer Halle mit 9,4 m hohen Kletterwänden unter
  einer Decke von 10 m blieben sechs Stummel auf einer blauen Matte übrig — die
  Welt selbst war weggeschnitten. Die Ebene liegt im Raum, das Modell dreht
  sich, also wird sie in jedem Bild aus der Lage der Bühne nachgerechnet; sonst
  wanderte der Schnitt beim Drehen durch die Welt. **Heute steht nirgends mehr
  ein Dach** (siehe _Von oben_); die Rechnung bleibt, weil eine Welt eines
  bauen darf.
- **Flach wird enger eingepasst.** Eine Kugel um eine Welt ist so hoch wie
  breit, eine Welt aber ist ein Grundriss mit ein bisschen Höhe darauf. Mit
  Grundriss und Höhe getrennt gerechnet (`ShowOptions.flat`) steht sie doppelt
  so groß im Bild — vorher war ein Haus eine Briefmarke in einer leeren
  Fläche.

**Und man kommt hinein.** Der Überblick beantwortet die erste Frage; die
zweite — wie sieht es _darin_ aus — beantworten zwei Dinge:

- **Näher heran.** Eine Welt darf bis auf ein Zwanzigstel des eingepassten
  Abstands herangezoomt werden (`ZOOM_MIN_WORLD`), ein Werkzeug weiterhin nur
  bis auf knapp die Hälfte: vor einer Zange ist ein halber Meter nah, vor einem
  Tal ist ein halber Kilometer die Übersicht. Dazu hängt die **vordere
  Schnittebene** am wirklichen Abstand und nicht mehr am eingepassten — sonst
  wird beim Herankommen alles durchsichtig, was man ansehen wollte. Und ein
  **Zangengriff ist kein Doppeltipp**: der zweite Finger kam bisher genauso
  schnell hinterher wie ein zweiter Tipp und stellte die Ansicht damit jedes
  Mal zurück, kaum dass man zu zoomen anfing. Gezählt wird jetzt nur, was
  _allein_ aufgesetzt hat.
- **Und dorthin, wo man hinsieht.** Zwei Finger **zoomen und schieben**
  zugleich, wie auf jeder Karte: Der Zoom sitzt am Punkt zwischen den Fingern
  (das Rad genauso, am Zeiger), und was die Mitte zwischen ihnen wandert, wandert
  das Bild mit. Ohne das Schieben ist eine herangeholte Draufsicht eine
  Sackgasse — man sieht eine Ecke groß und kommt nicht zur nächsten, ohne
  wieder ganz herauszuzoomen. Verschoben wird dabei die **Kamera**
  (`panX`, `panY` in `viewer.ts`) und nicht die Bühne: Die dreht sich um ihren
  Drehpunkt, und ein Versatz dort ließe dieselbe Drehung anders aussehen und
  jeden Tipp danebentreffen. Weiter als der Halbmesser des Gezeigten geht es
  nicht — sonst wischt man sich mit zwei Fingern in eine schwarze Fläche und
  findet die Welt nicht wieder. Zurück in die Mitte kommt sie mit dem
  Doppeltipp, mit **Von oben** und mit jedem neuen Einpassen.
- **Die freie Kamera** (Knopf oben in der Ecke, nur bei Welten). Sie fliegt wie
  eine **Drohne**: die Welt steht still, die Kamera geht darin herum, und zwar
  ohne Schwerkraft, ohne Wände und ohne Boden — wer sich eine Kulisse ansieht,
  will auch über sie hinweg und in sie hinein. Bedient wird sie mit den Knöpfen
  über dem Bild (links **W A S D**, rechts **hoch und runter**) und mit
  denselben Tasten, wenn eine Tastatur da ist; **Wischen** dreht dabei den
  Blick, Rad und zwei Finger schieben vor und zurück. Der Doppeltipp stellt
  auch sie zurück — an den Platz, an dem sie losgeflogen ist.

Vier Dinge daran sind Entscheidungen und keine Nebensache:

- **Kein Schnitt im Bild.** Beim Einschalten übernimmt die Kamera genau die
  Ansicht, die gerade zu sehen ist: die Bühne dreht sich in ihre eigene Lage
  zurück, die Kamera nimmt die Drehung auf sich (gelesen aus den Matrizen, nicht
  aus Winkeln hergeleitet). Das ist mehr als Höflichkeit — von außen liegt die
  Welt schräg, weil man von schräg oben auf sie sieht, und flöge man in dieser
  Lage los, ginge „hoch" um genau diese Schräge daneben. Wer nah heran will,
  zoomt vorher: die freie Kamera fängt dort an, wo die Ansicht steht.
- **Kein Rollen.** Der Blick sind zwei Winkel — Gieren um die Welt-Y, Nicken um
  die eigene X —, und der Horizont bleibt damit waagerecht, was auch immer man
  tut. Eine Kamera, die beim Umsehen langsam kippt, verliert man nach zehn
  Sekunden.
- **Geschwindigkeit nach Abstand.** Nicht in festen Metern je Sekunde, sondern
  gemessen bis an die Kugel um das Gezeigte: von weit draußen legt ein Druck
  Kilometer zurück, mitten in der Welt Meter, und weil der Abstand beim
  Anfliegen schrumpft, bremst der Flug von selbst ab. Eine feste Zahl kann das
  nicht — dieselbe ist in einem Zimmer ein Katapult und über einem Gebirge ein
  Stillstand, dessen Kulisse vier Kilometer im Halbmesser misst.
- **Das Dach bleibt drauf.** Der Schnitt durch eine Welt mit Decke ist die
  Antwort auf die Vogelperspektive; wer drin ist, will das Zimmer, wie es ist.
  Im Flug gilt er deshalb nicht.

Die Rechnung dazu steht in `src/tools/flyCamera.ts` (mit Test, ohne three.js),
die Knöpfe hält `tools/main.ts` als Menge gedrückter Richtungen — Knopf und
Taste sind dieselbe — und der Betrachter macht daraus Bild für Bild eine
Bewegung. Ein Tipp je Schritt wäre ein Ruckeln und kein Flug.

Damit das ohne Spiel geht, bekommt `PortalWorld.preview()` zwei Dinge
untergeschoben. Erstens eine **Physik, die nichts tut**
(`physics/silentPhysics.ts`): die Bauzeilen legen jede Wand, jede Kiste und
jedes Gelände in die Simulation, und statt fünfzig `if (physics)` quer durch
jede Welt nimmt eine Attrappe derselben Form alles entgegen und macht nichts
damit — was daran Rapier ist, beantwortet jeden Zugriff mit sich selbst, damit
auch `physics.world.createImpulseJoint(rapier.JointData…)` mitten im Bauen ins
Leere läuft. Rapier selbst wird dabei nie geladen. Zweitens **Licht**: die Welt
bringt ihr eigenes mit — das Bühnenlicht geht dafür aus —, aber nie weniger als
0,45; eine Welt darf mit Absicht fast schwarz sein (0,035), und eine schwarze
Vorschau ist keine. Der Hub baut seine Vorschau selbst (`HubWorld.preview()`,
dieselbe Halle, dieselben Gänge, dieselben wirbelnden Tore, nur ohne Zeiger) —
von oben sieht man ihm an, was er ist: ein Rad mit Speichen.

## Eine Welt laufen lassen

Eine Vorschau ist ein **Bild**, und für „wie ist diese Welt angelegt" ist das
die richtige Antwort. Bei der **Testwelt** ist es keine: Sie besteht aus
Knöpfen, Türen und dem, was danach passiert, und ein Bild davon zeigt ein paar
Kuppeln. Unter der Bühne steht deshalb bei jeder Welt, die es kann, ein Knopf
**Laufen lassen** — und danach steht dort dieselbe Welt **in Betrieb**.

Der Unterschied ist genau eine Zeile und alles, was daran hängt:
`World.previewLive()` (`PortalWorld.previewLive`) baut mit einer **echten
Physik** statt der Attrappe. Damit stehen die Wände wirklich, das Gitter wird
abgetastet wie im Spiel (`bakeNavigation`) und der Bestand an NPCs
(`NpcDirector`) hat einen Raum, in dem er laufen kann. Gebaut wird mit
**denselben Zeilen** wie in `init`; was fehlt, ist alles, wofür es einen
**Spieler** braucht — Portale, Gürtel, Werkzeuge, Netz, Menü. Asynchron ist die
Methode deshalb, weil Rapier dafür wirklich geladen wird; wer nur ein Bild
will, nimmt weiter `preview()` und wartet auf nichts.

**An die Stelle des Spielers tritt eine Attrappe** — ein Ring auf dem Boden mit
einem Stab darin (`createGhostTarget`). Sie ist nicht Kosmetik, sondern der
Grund, warum eine laufende Vorschau überhaupt etwas zeigt: Ein Zombie geht
_jemandem_ nach, und in einer Vorschau steht niemand. `playerFeet()` gibt sie
zurück, wenn es keinen Kontext gibt; für Hirne, Wegsuche und Spawnpunkte _ist_
sie der Spieler. Ein Tipp auf den Boden versetzt sie — und genau das macht die
Draufsicht zum Werkzeug: Man setzt das Ziel und sieht, welchen Weg das Gitter
hergibt. Wie im Spiel gilt dabei die **Sichtweite** des Hirns: Wer sein Ziel
quer über die Karte setzt, sieht einen Zombie, der stehen bleibt, weil er
nichts bemerkt hat.

Zwei Knöpfe machen aus dem Ziel mehr als ein Ziel, und beide beantworten
dieselbe Frage von zwei Seiten — _stehe ich eigentlich in dieser Welt?_

- **Gehe zu** ist ein **Modus** wie in den Sims und kein Druck: Solange er an
  ist, heißt ein Tipp auf den Boden nicht „stell dich dorthin", sondern „geh
  dorthin". Gegangen wird über **dieselbe Wegsuche wie ein NPC**
  (`shared/previewWalk.ts` um `nav/navAgent.ts`) — dasselbe Gitter, dieselben
  Türen, dieselben Portale, und die nimmt sie auch. Das ist keine
  Bequemlichkeit, sondern der Sinn: Wer im Gehe-zu-Modus vor einer
  verriegelten Tür stehen bleibt, hat gerade gesehen, dass sie verriegelt ist.
  Zwei Unterschiede zum NPC sind Absicht. Sie **irrt sich nicht**: Ein NPC
  läuft nach seiner Meinung über die Karte (`navBelief.ts`) und darf gegen eine
  Tür rennen, die er offen glaubte; die Attrappe ist der Zuschauer und nimmt
  den Graphen, wie er ist. Und sie hat **keine Physik**: Ihre Höhe holt sie
  sich von der Kachel, auf der sie steht, statt sich schieben zu lassen.
  Führt kein Weg ans Ziel, geht sie den Teilweg bis vor das Hindernis und
  meldet dort _„Da komme ich nicht hin"_ — eine Figur, die ohne Grund stehen
  bleibt, sieht kaputt aus.
- **Figur weg** nimmt sie ganz heraus, und zwar wörtlich: nicht unsichtbar,
  sondern **nicht da**. `playerFeet()` gibt danach `null` zurück, und damit hat
  kein Zombie mehr jemanden, dem er nachläuft. Das ist der Unterschied zwischen
  „ich sehe meine Figur nicht" und „ich stehe nicht in dieser Welt" — gemeint
  ist das zweite: Wer eine Karte von oben ansehen will, will nicht, dass ihm
  dabei sechs Zombies entgegenkommen. Ein roter Knopf holt sie zurück, denn ein
  Szenario ohne jemanden wäre ein Knopf ohne Wirkung.

Was die Seite daraus macht, steht in einer kleinen Schnittstelle
(`worlds/shared/livePreview.ts`) und ist absichtlich klein — fünf Sachen:

- **Knöpfe mit Namen.** Dieselben Objekte und dieselben Handgriffe wie in der
  Brille (`previewButtons()`), nur mit Beschriftung: Unter dem Bild stehen sie
  als Zeilen, nach Buchten gruppiert und im Farbstreifen ihres Gegenstücks.
  Antippen im Bild geht auch — aber „Stachelgrube · START" trifft man auf einem
  Telefon sicherer als eine Kuppel von vier Pixeln. Knöpfe, für die es daneben
  schon eine Bedienung gibt, sind `quiet`: die Wandkonsolen des Labors bleiben
  antippbar, ohne die fünf Ebenen ein zweites Mal aufzulisten.
- **Ein Schritt.** `step(dt)` rechnet ein Bild — dieselbe Reihenfolge wie in
  `update`, nur ohne alles, was einen Spieler voraussetzt. Was eine Welt
  jedes Bild für sich selbst tut (die Uhr des Labors, seine Zeitschaltungen),
  steht dafür in `simulate(dt)` und nicht in `update`: von dort läuft es in der
  Brille **und** auf dem Telefon.
- **Die Debug-Ebenen** (`nav/navLayers.ts`) als Schalter, dazu die
  Lebensbalken. Sie stehen im Labor an **drei** Stellen — Handgelenk,
  Wandkonsole, Werkzeugseite —, und alle drei ziehen einander nach; eine
  Anzeige, die das nicht tut, glaubt man danach keiner mehr.
- **Meldungen.** `announce()` in `PortalWorld` ersetzt das `ctx?.notify`, das
  in einer Vorschau jede Antwort auf jeden Knopfdruck verschluckte: Im Spiel
  geht sie ans Handgelenk, hier in die Zeile unter der Bühne.
- **Die Draufsicht.** `lookDown()` kippt fast senkrecht (nicht ganz: bei 90°
  sieht man von einer Wand nur die Oberkante) und passt dabei das **Rechteck**
  statt des Kreises darum ein. Gemessen wird das am **ungedrehten** Kasten
  (`extent`) — der Kasten um eine gekippte Welt ist so hoch wie breit, und aus
  ihm gelesen stünden im Labor 48 Meter Höhe, wo drei Meter Wand stehen. Ist
  das Bild **hochkant** und die Welt breit, wird sie dabei um eine
  Vierteldrehung quer gelegt: Auf einem Telefon ist das der Unterschied
  zwischen einem Drittel Bild und dem ganzen.

**Ein Tipp ist dabei keine Drehung.** Auf dieser Bühne wird gedreht, gezoomt
und geflogen, und jede dieser Bewegungen fängt mit einem Finger auf dem Glas
an. Als Tipp zählt deshalb nur, was an einer Stelle anfängt und aufhört
(`TAP_SLOP`, `TAP_TIME`) — alles andere war eine Drehung.

Geladen wird eine Welt erst beim Antippen — eine Liste voller Welten wäre
sonst das ganze Spiel auf einmal —, und weil das ein `import()` ist, entscheidet
eine laufende Nummer, wessen Antwort noch jemand sehen will: wer weiterblättert,
bekommt nicht die vorherige Welt nachgeschoben. Lässt eine Welt sich nicht ohne
Spiel bauen, steht wieder ihr Tor da (`buildGate`) und der Grund in der Konsole:
eine leere Bühne wäre die schlechtere Antwort.

Zwei Zustände je Regal, ein Kopf: die Übersicht trägt links das
**Burger-Symbol**, ein einzelnes Ding den **Pfeil zurück**, und der führt in
die Übersicht _seines_ Regals. Welcher Zustand gilt, steht im **Hash** und
nicht in einer Variablen — damit tut der Zurück-Knopf des Browsers dasselbe wie
der im Kopf, und ein Link ist ein Link: `tools.html#hammer` wie eh und je (die
Werkzeuge behalten den nackten Hash, damit alte Links halten), `#welt/alps`,
`#objekt/cube`, `#npc/zombie` und `#hirn/chase` für die anderen Regale,
`#welten`, `#beutel` und `#npcs` für ihre Übersichten. Ein Hash, den es nicht
gibt, endet in der Werkzeug-Übersicht und nicht in einer leeren Seite.

Im Kopf steht außerdem der Umschalter für die Hand, und seine drei Zustände
sind **zwei verschiedene Hände** und nicht zweimal dieselbe aus zwei Winkeln.
Die Namen sagen, welche:

- **Hand aus** — nur das Werkzeug, für die Form.
- **Hand in VR** — die **gezeichnete** Hand am Werkzeug, so wie sie in der
  Brille aussieht: sie liegt so daran, wie die Haltung dieses Werkzeugs es
  sagt. Hier soll der Pinsel wie ein Stift gehalten aussehen und die Pistole
  wie eine Pistole.
- **Hand in echt** — die **eigene** Hand am Gerät, also nur eine Handhaltung:
  nach vorn ausgestreckt wie an einer Pistole, der **Halterzylinder** aufrecht
  darin (rot, weil er hier nicht das Werkzeug meint, sondern das Gerät), und
  der Zeigestrahl läuft von seiner **oberen Kante** geradeaus auf die Scheibe.
  Das ist die Haltung, an der man sich orientiert. Das Werkzeug bleibt dabei
  stehen, wo es wäre — **fest und nicht gläsern**: es war eine Weile
  durchsichtig, weil in der echten Hand ja keines liegt, nur ist genau das die
  Ansicht, in der man seine Lage beurteilt, und ein Ding bei 22 % Deckkraft
  beurteilt niemand. Wo die eigene Hand ist, sagt der rote Handgriff; das
  Werkzeug ist das, was man ansieht. Hand und Zylinder sind deshalb für jedes
  Werkzeug dasselbe Bild, und das ist keine Schwäche, sondern die Auskunft:
  **echt hält man den Pinsel wie die Waffe.**

  Dort stand eine Weile die Faust um den **Handgriff des Geräts**
  (`CONTROLLER_HAND_POSE` um `CONTROLLER_HANDLE`, ein Zylinder entlang der
  Z-Achse des Griffraums) — gemeldet als „die Hand ist um 45° falsch". Sie war
  es: die beiden Fäuste stehen **47° in Pitch** auseinander. Es sind zwei
  Modelle desselben Handgriffs, und nur eines kann stimmen; genommen wird das,
  an dem jede Faust, jedes Werkzeug und jede Zahl dieses Spiels hängt. Der
  Zeigestrahl beginnt dabei an der **oberen Kante** des Zylinders und nicht in
  seiner Mitte: der Nullpunkt des Griffraums ist die Mitte der Faust, und ein
  Strahl von dort läuft eine Handbreit unter dem Lauf des Werkzeugs her — zwei
  parallele Linien, von denen man keine glaubt. Verschoben wird nur das Bild;
  die Zielscheibe wandert mit.

Lange waren die beiden dasselbe Bild in zwei Rahmen — einmal stand die Hand
still, einmal das Werkzeug —, und wer sich den Pinsel ansah, sah zweimal genau
dasselbe. „Da ist kein Unterschied" war die richtige Beobachtung; den
Unterschied gibt es, er liegt nur zwischen echter und gezeichneter Hand.

**Und die Welt bleibt dabei stehen.** Werkzeug und Zielscheibe stehen in jeder
Ansicht an derselben Stelle — das Werkzeug aufrecht in seinem eigenen Raum, die
Scheibe davor auf dem Zeigestrahl —, und die Kamera passt sich nur an die
beiden an (`fit`, `placeTarget` messen das Werkzeug, nicht die Hand). Was sich
beim Umschalten bewegt, ist die Hand und sonst nichts. Vorher lag in der
Ansicht _in echt_ der Griffraum in der Bühne selbst, das Werkzeug war ganz weg
und die Zielscheibe stand plötzlich schräg unten links: zwei Bilder, die man
nicht vergleichen konnte. Jetzt steht der Griffraum dort, wo der Controller
beim Halten _dieses_ Werkzeugs wirklich stünde (`Lage-im-Griff⁻¹`), und der
rote Zylinder liegt genau im grünen Halterzylinder des Geists.

Der grüne **Halterzylinder** gehört dabei zum Werkzeug und bleibt, wo er ist:
er ist das, was alle Waffen einander ähnlich macht. Der rote daneben ist etwas
anderes — nicht Teil eines Werkzeugs, sondern das Gerät in der echten Hand;
deshalb rot und nicht türkis, denn türkis heißt „hier fasst die Hand das
Werkzeug an". Und die Hand ist auf dieser Seite **nicht durchsichtig**: gläsern
ist ein Geist, den man neben die eigene Hand hält, und hier gibt es keine
eigene Hand dahinter.

Daneben stehen **Grab** und **Trigger** — die beiden Knöpfe am Controller, als
Schalter, unabhängig voneinander. Gehalten wird mit gedrücktem Griffknopf, so
fängt die Seite an; Trigger dazu, und der Zeigefinger zieht ihn; Grab weg, und
die Hand öffnet sich vom Griff — dieselbe Rechnung wie in der Brille
(`buttonCurls`, siehe _Handhaltung_). Nur
die Finger bewegen sich, die Hand bleibt liegen — und die **weiße Linie** auch:
sie kommt aus dem Controller und nicht aus dem Zeigefinger, also ändert der
Trigger nichts an ihr.

Und sie bewegen **jede** Hand, die auf der Bühne steht. In _Hand in echt_ sind
das zwei: die feste Hand am Halterzylinder und, beim Justieren, die gezeichnete
als Geist am Werkzeug. Der Geist blieb lange stehen, während die feste den
Finger zog — und die feste bekam dabei die Finger des _Werkzeugs_ statt die des
Griffs, den sie wirklich hält. Beides zeigte etwas anderes an, als der Knopf
oben sagte; jetzt fragt jede Hand die Bewegung ihres eigenen Griffs.

Beim Justieren gilt trotzdem immer die haltende Hand:
der Regler richtet die Richtung des Zeigefingers aus, und ein Finger am Abzug
zeigt woandershin als einer am Rahmen. **Das sagen die Knöpfe jetzt auch**: sie
stehen dann auf dem Stand der Bühne — Grab an, Trigger aus — und nehmen keinen
Druck an, statt hell zu leuchten, während der Finger nicht zieht.

In VR sieht man beides zugleich: ob der Halterzylinder in der Faust sitzt und
wohin das Ding dabei zeigt. Gerechnet wird mit derselben Kette wie
am Griffstand (`tune/handGrip.ts`) und mit derselben Zielkorrektur: die kommt
sonst aus einem Controller, im Browser gibt es keinen, also steht sie als Zahl
da (`GRIP_TO_RAY`) — und zwar **nur für Werkzeuge, die zielen**. Was in der
Faust sitzt (`alignToAim = false`: Controller, Boxhand, Flügel, Handschuhe und
der Beutel), bekommt die Ruhe (`viewer.aimOf`), wie im Spiel. Eine Weile bekam
es auf der Seite die 30° trotzdem, und die Controller saßen dort sichtbar
schief in der Hand, während sie in der Brille richtig lagen; und noch eine
Weile rechnete der Regler der Seite (`toolInGripNow` in `tools/main.ts`) mit
`GRIP_TO_RAY` für alle, während der Betrachter die Ruhe zeichnete — er fragt
jetzt denselben `viewer.aimOf`.

Im Griffraum hängt außerdem die **weiße Linie des Zeigestrahls** — dieselbe,
die in der Brille aus dem Controller kommt. Sie gehört dem **Gerät** und nicht
den Fingern: sie steht im Griffraum, 30° unter dessen -Z (`GRIP_TO_RAY`), und
ändert sich deshalb weder mit dem Trigger noch mit dem Griffknopf. Vorher hing
dort eine bernsteinfarbene Linie an `GhostHand.indexTip`, die jede Krümmung
mitmachte — beim Ziehen des Triggers ging sie an der Scheibe vorbei, und aus
dem Bild „so zeigt die Hand" wurde „so steht gerade dieser eine Finger". Die
Richtung der Fingerspitze gibt es weiter, sie wird nur nicht mehr gezeichnet:
der Regler richtet sie aus (`viewer.handAim`). Und die Linie ist eine `Line`
und kein Mesh: die Kamera misst nur sichtbare Meshes, also passt sie sich
weiter an das Werkzeug an und nicht an eine Linie, die absichtlich über den
Rand hinausgeht.

## Bearbeiten auf der Werkzeugseite

Der Knopf **Bearbeiten** oben in der Ecke macht aus der Ansicht einen
Justierstand — und zwar denselben, den der Eingaberaum aufstellte, nur mit
einem Daumen statt mit zwei Händen; seit die Welt gelöscht ist, ist er der
einzige. Er trägt sein Wort und nicht nur einen Stift, und
das ist kein Geschmack: als nackter 38-Pixel-Umriss zwischen Titel und
Umschalter war er auf dem Telefon schlicht nicht zu finden, und genau so wurde
er auch gemeldet. Läuft der Modus, heißt derselbe Knopf **Fertig** und leuchtet.
Über dem Werkzeugregal steht dazu **eine Zeile**, die den Weg sagt — den Knopf
gibt es nur an einem einzelnen Werkzeug, und wer das nicht weiß, sucht ihn auf
der Liste, wo es ihn nicht geben kann. Oben unter dem Kopf stehen dann **sechs Achsen**, unten am Rand
ein **Regler**, und dazwischen bleibt das Bild: man zieht und sieht im selben
Moment, was daraus wird. Immer nur **eine** Achse zugleich — sechs Regler
untereinander sind auf einem Telefon kein Werkzeug, sondern ein Formular.
Neben dem Regler stehen zwei Rasten-Knöpfe, denn ein Zehntel Zentimeter ist auf
360 Bildpunkten Reglerweg nicht zu treffen.

**Was der Regler verschiebt, sagt der Umschalter im Kopf** — derselbe, der
sonst nur die Ansicht wählt. Er bleibt beim Justieren stehen, und das ist der
Punkt: was man ansieht, ist das, was man verstellt.

- **Hand in VR** — das Werkzeug steht aufrecht in seinem eigenen Raum, und die
  **gezeichnete Hand** wandert daran, wie man eine echte Hand an ein echtes
  Ding legt. Übernommen wird das als **Griffhaltung der Hand**
  (`handPoseStore`, `bgvr.handPoses`) — und zwar nur in ihren sechs Zahlen:
  Finger und Spreizung sind keine Frage von „wo liegt die Hand" und bleiben
  stehen.
- **Hand in echt** — die eigene Hand steht, und an ihr gibt es nichts
  einzustellen: sie hält einen Controller. Also wandert das **Werkzeug** darin.
  Übernommen wird das als seine **Lage im Griff** (`poseStore`,
  `bgvr.holdPoses`, also `holdPosition`/`holdRotation`) — dieselben Zahlen, die
  im Kurzcode stehen, ohne Umweg über eine Hand, die dort gar nicht bewegt
  wird.

  Dafür wechselt beim Justieren der **Nullpunkt der Bühne**: er liegt sonst im
  Werkzeug (damit ein Wechsel der Ansicht die Welt nicht springen lässt), hier
  aber im **Griffraum**. Sonst stünde das Werkzeug still und die Hand wanderte
  darunter weg — dieselbe Verkehrung, nur andersherum, und genauso falsch:
  „die Hand in echt soll sich nicht mitbewegen".

  **Die Bühne kippt dabei nicht.** Der Griffraum steht nicht aufrecht, sondern
  genau dort, wo er beim _Ansehen_ stand: seine Lage wird eingefroren, sobald
  das Justieren anfängt (`gripBase` in `tools/viewer.ts`), und das Werkzeug
  liegt darin bei `eingefroren · Lage-im-Griff`. Im ersten Bild heben sich die
  beiden auf — der Anblick ist derselbe wie eine Sekunde vorher, Zeigestrahl
  und Zielscheibe eingeschlossen. Vorher stand der Griffraum aufrecht und das
  Werkzeug schräg darin, und weil das die ganze Lage-im-Griff ist, kippte die
  Bühne beim Druck auf _Bearbeiten_ um genau diesen Winkel weg: bei der
  Taschenlampe gut 30°, und es sah aus, als hätte sich die Kamera verstellt.
  **Eingefroren** und nicht nachgeführt, denn nachgeführt wäre es das
  Gegenteil des Gewollten: dann stünde das Werkzeug im Bild still und die Hand
  drehte sich darunter. Ein anderes Werkzeug, ein Wechsel der Ansicht oder
  _Fertig_ tauen sie wieder auf — der nächste Anlauf friert die Lage neu ein,
  die dann gilt.

  **Und zwar beide zusammen.** Eingefroren sind zwei Dinge: die Lage des
  Griffraums (`gripBase`) und die Drehung der Bühne auf die echte Hand
  (`align`, `tools/handStage.ts`). Sie gehören zusammen — die eine sagt, wo die
  Hand steht, die andere, wie das Bild darauf schaut —, und beim Wechsel der
  Ansicht wurde lange nur die erste neu genommen. Danach standen sie auf zwei
  verschiedenen Ständen: die Bühne schaute noch auf die Hand von vorhin, der
  Griffraum stand schon auf dem Stand von jetzt, und jedes Grad, das man
  inzwischen am Regler gedreht hatte, drehte die **ganze Vorschau** mit. „Ich
  ändere Roll, und die Ansicht dreht sich, obwohl das nur den Gegenstand
  betreffen sollte" — genau das, und es fing erst nach einem Tabwechsel an.
  Zusammen aufgetaut heben sie sich im ersten Bild wieder auf: die Hand steht
  im Bild, wo sie stehen soll, und schräg ist wieder nur das Werkzeug.

  Und die **gezeichnete Hand** steht dabei als Geist am Werkzeug: sie hängt
  daran und geht deshalb mit, während die eigene bleibt, wo sie ist. Gläsern
  gegen die feste echte — fest ist, was wirklich da ist.

Vorher war das ein **zweiter Umschalter** unter dem Regler, mit eigenen Namen
(„In der Hand", „Am Griff"), während der obere so lange verschwand — zwei
Schalter, die dasselbe meinten und die man im Kopf zusammenhalten musste. Und
bewegt wurde immer die Hand, auch dort, wo sie das Einzige ist, was feststeht.

**Und geschoben wird im Rahmen der echten Hand — immer.** Was sich bewegt,
wechselt mit der Ansicht; die **Richtungen** tun es nicht mehr. Die sechs
Zahlen unter dem Regler stehen in beiden Ansichten und an jedem Werkzeug im
selben Raum (`src/tools/handFrame.ts`, mit Test):

- **Nullpunkt** ist der Griffpunkt — die Mitte der Faust, dort, wo das Gerät
  wirklich liegt. Null bleibt damit dasselbe Null wie im Speicher.
- **-Z ist die Blickrichtung der Hand**, also der weiße Zeigestrahl, und nicht
  das -Z des Griffraums: die beiden liegen `GRIP_TO_RAY` auseinander, auf der
  Quest 30°. Y geht nach oben aus der Faust, X nach rechts, +Z nach hinten zum
  Handgelenk.

Vorher hing der Rahmen an dem, was man gerade verstellte: in _Hand in VR_ am
**Werkzeug** (`ghostOnTool`), in _Hand in echt_ am **Griffraum**. Dieselbe
Achse zog damit je nach Ansicht und Werkzeug in eine andere Richtung — bei der
Taschenlampe zeigte „X nach rechts" dorthin, wo bei der Pistole halb „vorne"
war —, und keine der beiden Richtungen war die, in der ein Mensch beim
Justieren denkt: der sitzt hinter seiner eigenen Hand. Jetzt heißt „X ein Stück
weiter" überall dasselbe, und Yaw, Pitch und Roll drehen um die Achsen dieser
Hand, Roll also um die Blickrichtung.

Gespeichert wird davon nichts: eine Drehung später ist die Lage wieder im
Griffraum, und dort landet sie in denselben Speichern und im selben Kurzcode
wie zuvor (`fromRealHand`, und für das Werkzeug `holdFromGrip` — die
Zielkorrektur muss wieder heraus, mit der der Betrachter es hineingerechnet
hat). Der Rahmen ist eine **Bedienung** und kein zweiter Zustand daneben. Die
Zeile unter dem Regler sagt deshalb auch dazu, was sie zeigt: _Werkzeug in der
echten Hand_ beziehungsweise _Hand in der echten Hand_ — es sind nicht mehr die
Zahlen aus dem Speicher.

Dazu steht im Bearbeiten-Modus **ein Achsenkreuz** (`core/axesCross.ts`),
und zwar genau in diesem Rahmen: am Griffpunkt,
gedreht auf den Zeigestrahl, sein weißer Arm auf der weißen Linie. X rot, Y
grün, Z blau, -Z weiß nach vorn, und die Beschriftung der drei Drehregler sagt
dazu, um welche Achse sie greifen (_Pitch — nicken um X (rot)_). Sechs Zahlen
ohne ein Kreuz daneben sind sechs Zahlen. Es waren einmal zwei — eines im
Werkzeug, eines im Griffraum —, weil die Zahlen je nach Ansicht in einem der
beiden Räume galten; ein Kreuz, zu dem kein Regler gehört, sagt beim Justieren
nur, dass man sich die Achse falsch gemerkt hat.

**Und der kürzeste Weg:** _Hand in echt übernehmen_ nimmt die Faust, mit der
die eigene Hand das Gerät hält (`GRIP_POSE_ID`, siehe _Die Faust gehört zum
Griff_), und macht sie zur gezeichneten Haltung dieses Werkzeugs — samt Fingern,
denn eine Faust ohne ihre Krümmung ist eine andere. „Halte es so, wie ich es
wirklich halte." Für alles mit Halterzylinder kommt dabei die Faust heraus, die
es ohnehin erbt; interessant ist der Knopf bei allem anderen — Pinsel, Beutel,
Stoppuhr liegen danach so in der Hand, wie der Controller darin liegt. Es gibt
ihn nur in _Hand in VR_ (dort bewegt sich die Hand) und nicht an der Boxhand
(die _ist_ die Hand).

**Drei Richtungen, zwei Knöpfe, ein Drehpunkt.** Im Bild stehen drei
Richtungen, und sie sind die eigentliche Auskunft beim Justieren: die des
**Zeigefingers** (wohin die Hand zeigt — gezeichnet wird sie nicht mehr, beim
Justieren liegt der Finger ohnehin am Rahmen), der **rosa** Pfeil am
Halterzylinder (wohin der Zylinder zeigt) und der **violette** Pfeil am
Werkzeug (wohin es zielt — dazu gleich). Dazu die **weiße** Linie des
Zeigestrahls, die keine dieser drei ist: sie gehört dem Gerät, lässt sich nicht
ausrichten und ist das, worauf man ausrichtet. Zwei Richtungen zur Deckung zu
bringen ist das, worum es geht, und es über sechs Achsen einzeln zu erwürgen
ist Arbeit für eine Rechnung:

- **Auf den Zylinder** nimmt Richtung _und_ Ursprung: die Fingerspitze landet im
  Mittelpunkt des Halterzylinders und der Finger auf dem rosa Pfeil.
- **In Zielrichtung** nimmt nur die _Richtung_: die Fingerspitze bleibt liegen,
  wo sie ist, und die Faust schwenkt um sie herum auf den violetten Pfeil. Denn ein
  Ziel ist eine Richtung und kein Ort — der Nullpunkt eines Werkzeugs ist sein
  Griffpunkt, und dort gehört keine Fingerspitze hin. Die beiden sind deshalb
  keine Alternative, sondern ein **Weg**: erst auf den Zylinder, dann aufs Ziel.

Gedreht wird beide Male auf dem **kürzesten Bogen** — um die Linie herum bleibt
ein Freiheitsgrad offen, den niemand vorgibt, also behält die Hand ihre Rolllage
und kippt nur so weit, wie sie muss.

**Und der Regler dreht um die Fingerspitze**, nicht um das Handgelenk. Das ist
der Rest desselben Gedankens: um das Handgelenk gedreht wandert die Spitze weg,
und man hat die Linie, die man eben aufgelegt hat, mit dem ersten Grad Roll
wieder heruntergedreht. Um die Spitze gedreht bleibt sie liegen, und man dreht
die Faust _an ihr_ — so wie man eine Hand um einen Griff dreht, den man schon
hält. Yaw, Pitch und Roll ziehen die drei Versätze also mit; X, Y und Z schieben
weiter, wie sie es immer taten, und verlegen dabei den Punkt. Festgehalten wird
er für die ganze Ziehbewegung und nicht Bild für Bild neu genommen: gespeichert
wird auf Zehntelzentimeter, und ein Punkt, der sich jedes Mal aus der gerundeten
Lage neu ergibt, wandert über zweihundert Regler-Ticks um Millimeter davon.

Das gilt allerdings nur, solange die **Hand** das ist, was wandert, also in
_Hand in VR_. In _Hand in echt_ dreht sich das **Werkzeug** um seinen eigenen
Nullpunkt und bleibt liegen, wo es liegt — um die Spitze einer Hand gedreht,
die sich gar nicht bewegt, spränge es bei jedem Grad quer durch die Faust.

Die Rechnung zu allen dreien steht in `src/tools/alignHand.ts` (mit Test, ohne
three.js), die Linien holt die Seite aus den Weltmatrizen der Bühne
(`viewer.handAim`, `viewer.gripAim`, `viewer.toolAim`) statt sie nachzurechnen:
sie hängen an der Fingerspitze, am Griff und am Werkzeug, gehen also jede
Krümmung und jeden Anbau mit, und damit ist ausgerichtet, was man auch sieht.
Herausgegeben werden sie alle im **Rahmen der echten Hand** (`viewer.intoHand`)
— derselbe Raum, in dem der Regler zieht; der Rechnung selbst ist er egal, sie
verlangt nur, dass Hand, Fingerlinie und Ziellinie im _selben_ stehen.
Trägt ein Werkzeug **mehrere** Griffe — das Drohnendeck hat zwei —, gewinnt der,
der der Fingerspitze am nächsten liegt; ohne Standardgriff (Hammer, Handschuhe)
gibt es den einen Knopf gar nicht erst, ohne Ziel (Boxhand, Controller, Flügel,
Beutel) den anderen. Geschrieben wird das Ergebnis wie jeder Regler-Wert: in das
gewählte Ziel, sofort, und auf demselben Raster (`clampPose`) — es gibt keinen
zweiten Weg in den Speicher, auf dem andere Zahlen gelten.

Die eingestellte Lage wird dabei **gehalten** und nicht bei jedem Regler-Tick
neu aus dem Speicher gerechnet: der Weg dorthin geht über zwei Verkettungen und
eine Rundung auf Zehntel und ganze Grad, und ein Regler feuert beim Ziehen
hundert Mal. Ohne diesen Entwurf wanderten die fünf Achsen, an denen gerade
niemand zieht, um je eine halbe Rundung mit.

Gespeichert wird **sofort** und nicht auf einen Knopf: es ist derselbe
Speicher, den die Brille liest, und ein „Übernehmen", das man vergisst, ist
eine Einstellung, die man zweimal macht. Deshalb stehen unter dem Regler auch
gleich die beiden **Konfig-Codes** — der kurze für dieses Werkzeug an dieser
Hand (`toolGearCode`) und der lange für alles (`gearCode`) —, jeder eine Zeile,
angetippt kopiert. Damit ist der Weg vom Telefon in die Brille das, was er sein
soll: einstellen, Code kopieren, drüben eintippen.

Zwei Dinge, die dabei auffielen und die man nicht sieht:

- Die **Boxhand** ist die Hand selbst, und ihre Lage „in der Hand" ist die
  **Grundhaltung dieser Hand** und nicht die Pose eines Werkzeugs
  (`HandTool.storeMeasured`). Wer sie hier verschöbe wie eine Pistole, schriebe
  in einen Speicher, den das Spiel für dieses eine Werkzeug gar nicht liest —
  die Einstellung wäre gemacht und in der Brille nicht da. Also schreibt der
  Regler für `hand-box` in `saveIdleHandPose`, und beim Aufstellen holt die
  Seite sich von dort, was `HandTool.onTake` sich beim Zugreifen holt.
- `SHORT_SLOTS` in `shortCode.ts` kannte **Holster, Hängegleiter und Flügel
  nicht**. `packShortGear` fällt für eine unbekannte Id auf Platz 0 zurück, und
  Platz 0 ist „leere Hand": der Kurzcode für den Gürtel-Justierer hätte still
  die Grundhaltung verstellt. Die drei sind jetzt **angehängt** und nicht
  einsortiert — der Platz _ist_ das Format, und wer die Reihenfolge ändert,
  macht aus jedem alten Code einen, der etwas anderes meint.

Die Zahlen dazu — Achsen, Grenzen, Raster, die beiden Ziele — stehen in
`src/tools/poseEdit.ts` mit Test, ohne three.js und ohne DOM; der Rest ist
Verdrahtung. Die Grenzen sind nicht frei gewählt: ±30 cm ist genau das, was ein
Kurzcode tragen kann, und ein Regler, der weiter geht als der Code, stellt
etwas ein, das man nicht weitergeben kann.

Beim Ziehen passt die Kamera sich **nicht** neu ein. Sie richtet sich nach
allem, was auf der Bühne steht — schiebt man das Werkzeug drei Zentimeter aus
der Hand, rückte sie anderthalb hinterher, und die halbe Bewegung wäre wieder
weg. Wer dabei etwas aus dem Bild geschoben hat, holt es mit dem **Doppeltipp**
zurück; der passt jetzt auch wieder ein und stellt nicht nur die Drehung
zurück.

Gebaut werden die Modelle mit **demselben `createTool`** wie im Spiel, und die
Symbole der Kacheln zeichnet **dasselbe `drawMenuIcon`** wie im
Handgelenk-Menü. Eine Seite mit eigenen, hübscheren Kopien zeigt irgendwann
etwas anderes als das Spiel, und dann ist sie schlimmer als keine. Aus
demselben Grund liest die Liste `TOOL_IDS`: ein neues Werkzeug steht dort,
sobald es im Spiel steht.

## Verbinden: zusehen, während drüben gemessen wird

Eine Sache konnte die Seite bis hierher nicht: sagen, wie eine Hand **gerade
jetzt** an einem Werkzeug liegt. Sie zeigt die eingestellte Haltung aus dem
eigenen Speicher, und das ist die Haltung von zuletzt — wer in der Brille daran
arbeitet, sah hier nichts davon. Der Menüpunkt **Verbinden** (`#verbinden`,
`tools/liveHand.ts`) schloss genau diese Lücke — **bis der Sender wegfiel**.
Er steht hier trotzdem: Empfänger, Format und Bühne sind unangetastet, und
wenn wieder jemand eine Hand teilt, tut die Seite, was hier steht.

Es ist **dieselbe Sitzung** wie beim Zusammenspielen: derselbe Raum-Code,
dasselbe Trystero, dieselben Nachrichten (`net/`). Was hereinkommt, ist der
Kanal `hpose` — die Haltung der Hand, die drüben gerade gemessen wird,
zwanzigmal je Sekunde. Geschickt hat sie der Poseraum des Eingaberaums; seit
er gelöscht ist, wartet die Seite auf einen Sender, den es nicht gibt (siehe
_Live auf die Werkzeugseite_). Oben die Leitung (Raum-Code, Name, ein
Knopf, eine Statuszeile), in der Mitte die Bühne, unten der Konfig-Code in
einem **Textfeld**: dieser Code wird nicht angesehen, sondern mitgenommen, und
ein Feld kann man auch dort noch markieren, wo es keine Zwischenablage gibt.

Gezeigt wird **eine** Hand und sonst nichts — wer beim Einstellen zusieht, will
die Hand am Ding sehen und nicht einen halben Spieler drumherum. Gebaut wird
sie mit demselben `createTool` und derselben `GhostHand` wie überall, und sie
hängt als **Kind des Werkzeugs**, denn genau das ist die geteilte Zahl: ihre
Lage in dessen eigenem Raum. Neu gebaut wird nur, wenn Werkzeug oder Seite
wechseln; die Bewegung dazwischen ist ein Verschieben, sonst stünde zwanzigmal
je Sekunde ein frisches Modell auf der Bühne.

Drei Kleinigkeiten, die dabei nötig waren:

- Die **Leitung bleibt**, wenn man weiterblättert. Wer zwischendurch ein
  Werkzeug nachsieht, soll nicht neu verbinden müssen; die Codes laufen derweil
  weiter ins Feld, nur die Bühne gehört dann jemand anderem.
- Ein **`hello` alle drei Sekunden**. Die Sitzung wirft einen Mitspieler nach
  acht Sekunden Stille hinaus, und ein Zuschauer schickt keine Pose — er fiele
  drüben aus der Liste, während er zusieht, und die Gegenstelle meldete „noch
  niemand verbunden".
- `Section` ist nicht mehr dasselbe wie ein **Regal**. Kacheln gibt es nur in
  Regalen (`Shelf`), der Zuschauerplatz hat keine; er bringt die Bühne mit und
  sonst nichts.

Zwei Kleinigkeiten, an denen es zuerst scheiterte und die man wiederfindet, wenn
man eine dritte Seite baut: Die Kamera passt sich an das an, was man **sieht** —
`Box3.setFromObject` nimmt auch die ausgeschalteten Geometrien, und bei der
Taschenlampe ist das ein sechs Meter langer Lichtkegel, vor dem die Kamera
zurückwich, bis die Lampe ein Punkt war. Und die **Leinwand liegt nicht im
Fluss**, sondern absolut in einer Bühne: ein `<canvas>` bringt seine
Attributgröße als eigene Größe mit, und die ist die Bildpunktdichte mal der
Fläche — im Fluss schiebt jedes Retina-Display die Seite ein Stück auf.

Gebaut wird sie im selben Vite-Lauf (`rollupOptions.input` in `vite.config.ts`);
ohne diesen Eintrag landete nur `index.html` im `dist`.
