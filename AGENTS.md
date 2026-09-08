# Projektwissen für Agenten

Dieses Dokument ist das lange Gedächtnis des Projekts: alles, was in der
[README](README.md) bewusst nicht steht. Wer hier etwas ändert, das nicht mehr
stimmt, schreibt es hier auch um.

## Arbeitsregeln

**Alles geht direkt auf `main`** — kein Feature-Branch, kein Pull Request,
solange nicht ausdrücklich etwas anderes gewünscht ist. Das gilt für Menschen
wie für Agenten: entwickeln, committen, `git push -u origin main`. Wer
ausnahmsweise einen Branch will, sagt das im Auftrag dazu.

**Branches werden hinterher weggeräumt.** Wer aus irgendeinem Grund auf einem
eigenen Branch entwickelt hat und die Arbeit dann auf `main` landet — sei es
direkt gepusht oder über einen Pull Request —, löscht denselben Branch danach
sofort wieder, lokal _und_ auf `origin`:

```
git push origin --delete <branch>
git branch -d <branch>
```

Ein Branch, dessen Commits schon in `main` stecken, hat im Repository nichts
mehr verloren. „Direkter Push auf `main`" heißt also: am Ende steht dort ein
Commit und **kein** zusätzlicher Branch. Was ein Agent in seiner eigenen
Arbeitsumgebung tut, ist seine Sache — das Repository bleibt aufgeräumt.

Manche Agenten-Sessions dürfen zwar pushen, aber keine Refs löschen; der
Lösch-Push kommt dann als `HTTP 403` zurück. Dann wird das nicht stillschweigend
liegengelassen, sondern im Ergebnis gesagt: welcher Branch übrig ist und mit
welchem Befehl er wegkommt.

Vor dem Push laufen `npm run typecheck`, `npm run lint`, `npm run format:check`
und `npm test` — dieselben vier Schritte, die auch die CI macht
(`.github/workflows/deploy.yml`). Eine Regel, an die sich nur erinnert wird, ist
keine; deshalb prüft sie jetzt jeder Push nach.

### Linter und Formatierer

`npm run lint` ist ESLint mit einem **kleinen** Regelsatz (`eslint.config.js`).
Klein mit Absicht: Ein Linter, der über Stil schimpft, wird nach zwei Wochen
übergangen; einer, der Fehler findet, wird gelesen. Es steht also nur darin, was
hier schon einmal wehgetan hat — nicht abgewartete Promises (die Welten laden
asynchron), Methoden, die von ihrem Objekt getrennt herumgereicht werden, tote
Variablen. Über die _Form_ entscheidet Prettier, nicht ESLint.

`npm run format` formatiert die TypeScript-Dateien, `npm run format:check` prüft
nur. Absichtlich **nicht** dabei: `src/style.css` und `index.html`. Die
einzeiligen CSS-Regeln dort sind handgesetzt und gewollt, und ein Formatierer,
der sie auseinanderzieht, gewinnt nichts.

Zwei Regeln sind ausgeschaltet, und beide aus demselben Grund: Sie hielten
Absicht für Versehen. `no-unnecessary-type-assertion` hätte 268 Ausrufezeichen
hinter Array-Zugriffen wegoptimiert, die der nächsten Leserin sagen, dass dort
wirklich etwas steht; `require-await` beanstandet Methoden, die eine
Schnittstelle als `async` vorschreibt.

### Tests

Getestet wird das, was ohne Browser läuft und wo Fehler nicht auffallen: die
Mathematik hinter dem Greifen (`src/worlds/portal/grabReach.ts` — Zielen,
Zylinder, Flug **und die Reichweite, in der ein Werkzeug von einer Hand in die
andere geht**; `src/core/grabSettings.ts` — Rasten und Grenzen dazu), die
Achsenzuordnung der Griffe (`src/worlds/portal/tools/axisMatch.ts`), die
gemessene Werkzeug-Pose samt Spiegelung **und ihrer Umrechnung auf die andere
Hand** (`src/worlds/portal/tools/toolPose.ts` — gespiegelt, und die Spiegelung
ist ihre eigene Umkehrung), die **Flugmathematik der Drohne**
(`src/worlds/portal/tools/droneFlight.ts` — Kopter und Jet, inklusive der
Vorzeichen, die im Headset sonst die halbe Welt verdrehen, und das Tuning aus
Tempo und Drehrate), die **Drohnen-Einstellungen**
(`src/worlds/portal/tools/droneSettings.ts` — Rasten, Grenzen und der Fall,
dass ein alter Konfig-Code diese Felder noch gar nicht kannte), die **Bahn der
Haunting-Drohne** (`src/worlds/haunting/droneRoute.ts` — und zwar nicht der
Aufruf der Wegsuche, sondern der **Flug**: Ein Weg wird ganz abgeflogen, und
dabei darf die Bahn nie eine Wand kreuzen; dazu die Gegenprobe, dass es
überhaupt ein Zimmer gibt, für das die Luftlinie durch eine Wand ginge — sonst
wäre der Test auch für eine Drohne grün, die einfach geradeaus fliegt), die
Handhaltung
(`src/core/handPose.ts` — samt der ausgelieferten Grundhaltung und ihrer
Spiegelung auf die linke Hand), der **Versatz, mit dem eine bloße Hand hält**
(`src/core/handHold.ts` — die Spiegelung auf die andere Hand und vor allem,
**wohin** die beiden Winkel drehen: ein Vorzeichen in Grad sieht man nicht an,
ob es nach links oder nach rechts zeigt, ein gedrehter Vektor schon), die
**Untersetzung der Feinjustage**
(`src/worlds/tune/fineTune.ts` — dass ein Zentimeter ein Millimeter wird, dass
die Drehung den kürzeren Bogen nimmt, und dass zehn Bilder auf demselben Weg
dort enden, wo eines endet), der **Justierstand im Schießgang**
(`src/worlds/tune/rangeSettings.ts` — Grenzen, damit eine ziehende Hand ihn
nicht in die Wand schiebt, und ein Speicher, der auch kaputt sein darf), die
**Handgesten**
(`src/core/handGestures.ts` — welche Finger an der Handfläche liegen und was
daraus Greifen und Trigger macht, samt der Hysterese, ohne die ein halb
gekrümmter Finger den Trigger dreißigmal pro Sekunde umschaltet), die Waffenwerte
(`src/worlds/portal/tools/weaponSettings.ts` — samt dem **Schaden**, mit dem
ein Zombie vier Schuss braucht), **wann ein Schlag einer ist**
(`src/worlds/portal/tools/meleeSwing.ts` — zu langsam ist Hinhalten, zu früh
ist derselbe Schlag noch einmal, und ein Sprung der Klinge ist gar keiner), der **Lichtkegel der
Taschenlampe** (`src/worlds/portal/tools/flashlightBeam.ts` — Grenzen, das
Ziehen an der Linse und dass der schmale Kegel heller und weiter reicht, ohne
zum Scheinwerfer zu werden), die **Gürtel-Position**
(`src/worlds/portal/beltSettings.ts` — Grenzen, die Spiegelung der beiden
Hüften, dass die Höhe ein Anteil der Augenhöhe bleibt und dass ein gezogener
Zentimeter dort ankommt, wo gezogen wurde), die **Portaltiefe**
(`src/worlds/portal/portalDepth.ts` — Rasten, Grenzen und der Fall, dass im
Speicher eine Zeichenkette statt einer Zahl steht), die **Spiegelung an einer
Ebene** (`src/worlds/shared/mirrorMath.ts` — dass die Ebene selbst liegen
bleibt, dass die Rechnung ihre eigene Umkehrung ist, dass der Abstand
vorzeichenrichtig kippt, und die Zahl, wegen der es diesen Test gibt: die
**Determinante ist −1**. Einem Spiegelbild sieht man in der Brille nicht an,
dass es falsch herum ist — man merkt es erst, wenn man die Hand hebt und die
falsche zurückwinkt, und sucht den Fehler dann überall, nur nicht in vier
Zeilen Matrix), die **Lichtstufen des
Dunkelhauses** (`src/worlds/dark/lightLevels.ts` — dass die erste Stufe
wirklich null ist, dass jede folgende heller wird und dass es nach der
hellsten wieder aus ist), der **Halt an der Kletterwand**
(`src/worlds/climb/gripQuality.ts` — dass die Leiter immer voll hält, egal wie
tief, wie weit auseinander und wie erschöpft; dass eine verfehlte Kante genau
eine blanke Fläche ist; dass es das Verspreizen nur an **entgegengesetzten**
Flächen und nur bei Händen nah beieinander gibt; und dass zwei Hände mehr
tragen als eine, aber nie mehr als alles) samt der **Ausdauer** dazu
(`src/worlds/climb/stamina.ts` — dass perfektes Material nie etwas kostet,
dass glatter Fels schneller zieht als rauer, dass die Erholung **anläuft**
statt sofort zu laufen und ihren Anlauf verliert, sobald der Halt wieder
wegrutscht) und der **Vibration**, die dazu in die Hand geht
(`src/worlds/climb/gripHaptics.ts` — guter Halt kurz und hart, schlechter
schwach und lang, das Ticken schneller statt lauter; und dass beim Zupacken
selbst nicht getickt wird, weil dort schon der Schlag saß), die **Federung
der Sprungkissen** (`src/worlds/climb/crashPad.ts` — dass ein Sturz vom
höchsten Podest das Kissen nicht durchschlägt, dass der Blick dabei trotzdem
mindestens eine Zehntelsekunde in Bewegung bleibt statt in einem Bild
anzuhalten, dass eine Feder dafür genau richtig ist, weil ihre Zeit nach unten
**nicht** am Aufpralltempo hängt — anders als jede feste Bremsstrecke, die den
harten Sturz umso härter bremst —, dass sie bei 45 Hz dasselbe tut wie bei 120,
und dass die Rampe oben an der Kissenkante und unten auf dem Boden ankommt und
dabei flacher bleibt als das, was der Körper noch hinaufsteigt), die
**Laufrichtung** (`src/core/walkFrame.ts` — dass die Blickrichtung beim
Loslaufen gemerkt wird und der Kopf danach frei ist, dass sie beim Loslassen
wieder vergessen wird, dass der Snap-Turn sie mitdreht, und die Zeile, wegen
der es diesen Test gibt: **null ist eine gemerkte Richtung wie jede andere** —
nach Norden loszulaufen darf nicht heißen, dass gar nichts gemerkt wurde), der
**Konfig-Code**
(`src/core/configCode.ts` — packen und wieder auspacken, inklusive Tippfehler
und abgeschnittener Zeile), die **Trefferwertung des Schießstands**
(`src/worlds/range/scoring.ts` — Ringe, Platten und der Vorlauf, ohne den die
Physik jeden Treffer verschluckt), die Zielrichtung der Werkzeuge
(`src/worlds/portal/tools/aim.ts` — der Test hält fest, dass ein Werkzeug in
der Hand exakt entlang des Pointing-Rays zeigt und nicht 30° darüber), die
**Kart-Werte** (`src/worlds/kart/kartSettings.ts` — samt der Regel, dass das
Standardkart auf jeder Raste sitzt), die **Fahrphysik**
(`src/worlds/kart/kartDynamics.ts` — Höchstgeschwindigkeit, Ausrollen,
Rückwärtsgang, Lenken erst ab Tempo, Driften bei wenig Traktion und der
**Schlupf**, mit dem Vollgas und Vollbremsung den Seitenhalt auffressen), die
**Streckenteile** (`src/worlds/kart/kartCourse.ts` — Geraden und Kurven auf dem
Kachelgitter, jede Naht auf einer ganzen Kachel, und dass die Runde sich
schließt), die **Boxengasse** (`src/worlds/kart/kartPit.ts` — ein Boden statt
tausend Kacheln, eine Säule je Lücke, Mauern überall außer an der Ausfahrt),
der **Nachlauf des Kopfes** (`src/worlds/kart/kartView.ts` — dass der Blick der
Lenkung folgt statt an ihr festzuhängen, dass eine Ausweichbewegung innerhalb
der Totzone ihn gar nicht erst bewegt, dass der Drehratendeckel greift, wo er
greifen soll, dass er den kurzen Weg um den Vollkreis nimmt und nie weiter als
der harte Deckel zurückbleibt), die **Streckenführung**
(`src/worlds/kart/kartTrack.ts` — nächster Punkt, Leitplanke, Boxengasse und
Rundenzähler über die Ziellinie hinweg), das **Pizza-Rezept**
(`src/worlds/shop/pizza.ts` — Kneten, Belegen, Backen, Punkte), das
**Werkzeug-Budget pro Gürtelplatz**
(`src/worlds/portal/tools/looseBudget.ts` — dass eine Waffe links und eine
rechts sich nicht gegenseitig verschlucken, und dass ein Exemplar in einer
Hand zwar mitzählt, aber niemandem aus der Hand genommen wird), die
**Flugmathematik des Supermanhandschuhs**
(`src/worlds/portal/tools/supermanFlight.ts` und `supermanSettings.ts` — dass
volle Lehne die eingestellte Geschwindigkeit ergibt und nicht irgendetwas weit
jenseits eines ausgestreckten Arms, die Vorzeichen der Kurve, und wer welche
Achse bedient), der **zweite Justierstand**
(`src/worlds/tune/gripSettings.ts` — Grenzen, eine Seite, die keine ist, und
eine Werkzeug-Id, die es nicht mehr gibt) samt seiner **Rechnung**
(`src/worlds/tune/handGrip.ts` — dass die Kette Griff → Werkzeug → Hand sich
wirklich schließt und der Griff sich dabei herauskürzt, denn am Stand hält
niemand etwas, und dass die Zielkorrektur, die ein gehaltenes Werkzeug
hineinbekommt, auch wieder herausgeht: `holdFromGrip` ist die Umkehrung von
`toolInGrip`, und ohne sie stünde sie beim nächsten Zeichnen doppelt darin), die **Faust am Griff**
(`src/core/gripHandPose.test.ts` — dass eine am Griff eingestellte Haltung für
jedes Werkzeug mit diesem Griff gilt, eine für ein einzelnes Werkzeug aber
darüber gewinnt) und dass sie **wirklich um den Griff liegt**
(`src/core/gripFist.test.ts` — die gezeichnete Hand am gebauten Werkzeug, quer
zur Griffachse einen Millimeter genau, und die **Fingerlinie auf der
Grifflinie**: der Zeigefinger liegt gestreckt am Rahmen und zeigt den Lauf
entlang, die Hand steht dafür 17° schräg am Griff; dazu dieselbe Rechnung um
den **Stab** (Hammer), denselben Stab **45° nach vorn gekippt**
(das Rohr der Taschenlampe: dass es im Griffpunkt liegt, genau 45° über dem
Zeigestrahl und um keine Achse sonst, und dass dieselbe Faust es in seiner
neuen Lage umschließt),
den **Griff der Drohne**, die **Kante der Stoppuhr**, den **Saum des Beutels**,
die **Querstange des Hängegleiters** und den **Handgriff des Controllers** (aus dem
Modell des Herstellers abgelesen: entlang der Z-Achse des Griffraums), an beiden
Händen; dass Messer und Sektflaschenhals in derselben Faust liegen wie die
Pistole; dass die Hand am **Pinsel** gerade *keine* Faust ist, sondern ihn wie
einen **Stift** kneift — vier Berührungen auf der Oberfläche des Stiels, rings
um ihn herum, der Zeigefinger den Stiel entlang zur Spitze und die Handachse
deutlich quer zur Stielachse, an beiden Händen —; dass Handschuhe die
Grundhaltung tragen; dass die drei
**Handschuhe auf dem Handrücken liegen** statt als Reifen um die Hand herum
und die Manschette quer zum Unterarm steht; und
die beiden Zahlen, wegen derer es diesen Test gibt: die alte gebaute Faust
stand **90°** quer zum Zylinder, die am Stabgriff eingemessene 30°), der
**Standardgriff**
(`src/worlds/portal/tools/gripFit.ts` — dass ein Griff bei _jeder_ Haltung an
derselben Stelle in der Faust landet und die Zielkorrektur sich dabei
heraushebt, dass der Weg rückwärts derselbe ist, dass die geteilte
`holdPosition` ihn auf den Griffpunkt des Controllers legt statt 8,6 cm
daneben, und die Abweichungen, mit denen die ganze Sache begründet wurde: bis
zu 24° zwischen Werkzeugen, die gleich gehalten werden), der **Griff am Stiel**
(`src/worlds/portal/tools/poleGrip.ts` — wo eine Faust am großen Hammer liegen
darf, und vor allem die zweihändige Lage: dass beide Griffpunkte in ihren
Fäusten landen, dass eine falsche Handspanne sich gleichmäßig auf beide
verteilt statt in einer Hand einzurasten, und dass der **Kopf nach vorn** zeigt,
egal in welcher Reihenfolge die Welt die beiden Hände hereingibt — dieses
Vorzeichen bemerkt man in der Brille nur noch, man vollzieht es nicht nach), die
**Vibrationsmuster** (`src/worlds/tune/haptics.ts` — die einzige Rückmeldung,
die man _nicht sehen_ kann: dass jeder Stoß genau einmal kommt, dass der bei
null auf den ersten Frame fällt, dass ein Ruckler nicht acht Durchläufe auf
einmal in die Hand schlägt), die **Augenhöhen**
(`src/core/posture.ts` — dass die Anhebung die Differenz der beiden ist und
niemanden in den Boden drückt, der sitzend höher ist als stehend), der
**Räumung nach dem Loslassen**
(`src/physics/playerClearance.ts` — ob ein Ding noch im Spieler steckt: in der
Kapsel, samt der beiden Kugelkappen, dem Radius des Dings und dem Zentimeter
Luft, ohne den der Zustand an der Grenze flackert — **oder in einer Hand**, denn
der fallengelassene Gegenstand steckt in der Faust, aus der er fällt, und die
Kapsel ist dort längst geräumt), der
**Menüweg** (`src/ui/menuNav.ts` — dass beide Handgelenke denselben Weg lesen
und dass ein Weg zu einer verschwundenen Seite bei deren Elternseite endet),
die **Welt-Physik**
(`src/core/worldPhysics.ts` — Rasten, Grenzen, und dass „Welt-Standard" die
Schwerkraft der Welt gewinnen lässt statt einer einmal getippten Zahl), die
**Grafikstufen** (`src/core/graphicsSettings.ts` — vor allem die eine Zusage,
auf der alles andere steht: dass „Einfach" _nichts_ einschaltet und damit genau
das Bild von vorher ist, und dass ein gespeicherter Stand aus der abgeschafften
Stufe _Schön_ dorthin zurückfällt) samt dem, was sie **in einer Szene**
anrichten (`src/core/graphicsScene.ts` — wer Schatten wirft und wer nur
empfängt, dass sich alles vollständig zurücknehmen lässt, dass Nachzügler beim
nächsten Durchlauf abgeholt werden, und dass die Sonne mitwandert, ohne ihre
Richtung zu drehen) und dem, was **in die Shader der Welt eingebaut** wird
(`src/core/materialLook.ts` — Ein- und Ausbau ohne Spuren, ein eigener
Programmschlüssel je Stufenzahl, und der eigentliche Grund für den Test: dass
die `#include`-Zeile, an der der Umbau hängt, im echten Shader von three.js
noch steht — eine umbenannte fiele sonst erst in der Brille auf), **wie man
aussieht** (`src/core/appearance.ts` — dass aus fremdem Text nie eine
Kopfbedeckung wird, die es nicht gibt), **was die Karte in der Hand zeigt**
(`src/worlds/portal/tools/mapPlot.ts` — Norden oben und Osten rechts, der
Ausschnitt, der mit dem Träger wandert, Wände auf ihren Kachelkanten, offene
und geschlossene Türen, und dass ein Stockwerk gezeigt wird und nicht vier
übereinander), **wie der Kopf im Kart der Lenkung folgt**
(`src/worlds/kart/kartView.ts` — Totzone, Nachlauf und Drehratendeckel in
dieser Reihenfolge, und der harte Deckel darüber), die
**Rettung aus der Tiefe** (`src/worlds/shared/fallRescue.ts` — ab wann ein
Sturz einer ist, und dass der _höchste_ Treffer gewinnt: von unten gesucht
landet man im Keller eines Hauses, von oben auf seinem Dach), die **Dicke der
Bodenplatte** (`src/worlds/shared/ground.test.ts` — dass sie dicker ist als die
Haut der Spielerkapsel; sie war es einmal nicht, und man merkte es nur daran,
dass der Spieler beim Gehen stockte), der **Kurzcode**
(`src/worlds/portal/tools/shortCode.ts` — tausend Posen hin und zurück ohne
einen Millimeter Drift, jeder einzelne Tippfehler und jede Vertauschung
abgelehnt, und die Länge als Zusicherung statt als Hoffnung) samt seiner
**Übersetzung in die Speicher** (`gearShort.test.ts` — dass nicht mitgereiste
Finger stehen bleiben statt sich zu strecken), die
**Stoppuhr-Einstellungen** (`src/worlds/portal/tools/stopwatchSettings.ts` —
die drei Betriebsarten, das Anhalten als erlaubte Raste und kein
Rückwärtslauf), die **Pinselwerte**
(`src/worlds/portal/tools/brushSettings.ts` — dass eine Breite in ihren
Grenzen bleibt, dass Regler und Anzeige dieselbe Zahl meinen, dass ein
Farbkanal beim Hin- und Herrechnen ganz bleibt, dass die eigene Farbreihe
weder überläuft noch Doppelte sammelt, und dass die Abdrücke eines
Flachpinsels entlang einer Strecke weder Lücken lassen noch zu tausend
werden), die **Materialien** (`src/worlds/portal/tools/materials.ts` —
dass eine unbekannte Id aus dem Netz zu Lack wird statt zu `undefined`) und
der **Regler der Werkzeugseite**
(`src/tools/poseEdit.ts` — die sechs Achsen, ihre Grenzen und dass ein Wert
auf demselben Raster landet, auf dem auch gespeichert wird: ein Regler liefert
0,30000000000000004, der Konfig-Code trüge 0,3, und die Seite zeigte eine
dritte Zahl) samt dem **Rahmen, in dem er zieht**
(`src/tools/handFrame.ts` — dass „vorne" der Zeigestrahl der Hand ist und
nicht das -Z des Griffraums, dass ein Zentimeter auf einer Achse bei jedem
Werkzeug in dieselbe Richtung geht, und dass der Weg zurück in den Speicher
derselbe Weg ist) samt der **Bühnendrehung**, die die echte Hand hinstellt
(`src/tools/handStage.ts` — dass der Zeigestrahl in der Ausgangsansicht bei
jedem noch so schräg gehaltenen Werkzeug waagerecht quer durchs Bild läuft, für
die **linke Hand** quer in die andere Richtung, und dass zwei Werkzeuge wirklich
dieselbe Hand zeigen, das Rollen der Faust eingeschlossen) samt den Knöpfen daneben
(`src/tools/alignHand.ts` — dass die Fingerlinie hinterher wirklich auf der
Grifflinie liegt und nicht ungefähr, dass die Hand dabei nur so weit kippt, wie
die beiden Richtungen auseinanderliegen, dass beim Schwenken in die Zielrichtung
die Fingerspitze genau liegen bleibt, dass eine Drehung um sie herum sie auf
ihrem Punkt hält, und dass die Gegenrichtung keine Hand aus lauter Nullen
ergibt) und die **freie Kamera** derselben Seite
(`src/tools/flyCamera.ts` — die Vorzeichen, die man erst merkt, nachdem man in
die falsche Richtung geflogen ist: dass vorwärts dorthin geht, wohin man sieht,
dass seitwärts waagerecht bleibt, auch wenn der Blick zum Himmel geht, dass
hoch die Welt-Y ist und nicht die eigene, dass schräg nicht schneller ist als
geradeaus, und die Grenze beim Nicken, ohne die die Ansicht überkopf umkippt) und die **Hub-Auslegung**
(`src/worlds/hub/hubLayout.ts` — dass ein voller Gang
einen neuen aufmacht, dass jedes Tor in seinem Gang steht und dass keine zwei
aufeinander stehen), die **Flächen der Würfel**
(`src/worlds/portal/diceFaces.ts` — dass aus zwölf Dreiecken sechs Seiten
werden, dass jede Augenzahl genau einmal vorkommt und dass gegenüberliegende
Flächen `n + 1` ergeben, wie auf einem echten Würfel), die **beiden Listen
des Beutels** (`src/worlds/portal/props.test.ts` — dass jede angebotene Sorte
einen Namen hat und keine doppelt im Raster steht), das **Raster im Beutel**
(`src/worlds/portal/tools/bagGrid.ts` — wo die Fächer einer Seite liegen, dass
hinter der letzten Seite wieder die erste kommt, und dass eine **Ziellinie**
aus einem Meter dasselbe Fach meint wie ein Finger darüber), die **Leinwand**
(`src/worlds/portal/tools/paintCanvas.ts` — wo die Pinselspitze und wo der
Zielstrahl auf ihr landen: der Strich, der knapp danebengeht, der Strahl von
hinten, der parallel zur Fläche und der, der sie erst hinter der Reichweite
erreicht), der **Wurf**
(`src/worlds/portal/throwMotion.ts` — dass das Tempo der schnellste Moment im
Fenster ist und nicht das Abbremsen danach, dass ein einzelnes Ausreißerbild
keinen Wurf auslöst, worum sich ein geworfenes Messer überschlägt, und **die
Drehung der Hand**: die Winkelgeschwindigkeit zwischen zwei Lagen, der kürzere
Bogen auch dann, wenn das Vorzeichen der Drehung kippt, und null, solange gar
keine Lage mitkommt) samt seiner **Richtung** (dieselbe Datei — dass die
Zeigerichtung aus den letzten Bildern vor dem Loslassen kommt und nicht aus dem
Ausholen davor, dass der Blick den Wurf im engen Kegel ganz an sich zieht und
weit außerhalb gar nicht, und der Wurf, um den es geht: der Arm fährt beim
Zielen von oben nach unten, und die Klinge geht trotzdem waagerecht auf das
Ziel) und die **Effekte des Effektlabors**
(`src/worlds/effects/effectKinds.ts` — die Grenzen und das Raster der Größe,
dass „größer" mehr und dickere Partikel heißt, aber nie mehr als die Obergrenze,
und dass die Physik dahinter dieselbe bleibt; `effectBurst.ts` — dass eine
Wolke am Ursprung anfängt, unter dem Tempo ihres Effekts bleibt, bei
`spread = 0` eine Säule und bei 1 eine Kugel ist, dass Rauch steigt, Funken
fallen und nichts durch den Boden sinkt), die **Passung des Handschuhs auf
echte Knochen** (`src/core/gloveFit.ts` — dass Handgelenk und
Mittelfingerknöchel des gebauten Skeletts wirklich auf den gemessenen Gelenken
landen, in jeder Lage im Raum; dass eine große Hand einen großen Handschuh
bekommt und ein ausgerutschtes Gelenk keinen Punkt daraus macht; dass links und
rechts sich an genau einem Vorzeichen unterscheiden, und dass eine schiefe
Querachse — echte Knöchel stehen gestaffelt — trotzdem eine saubere Drehung
ergibt), die **Knochen einer blanken Hand**
(`src/core/handBones.ts` — der einzige Weg, der hier etwas beweist: eine Hand
aus bekannten Winkeln bauen und nachsehen, ob die Messung genau diese Winkel
wieder herausgibt, den Daumen mit seiner schrägen Ruhelage eingeschlossen; dazu
die Knochenlängen, die Dicke der Gelenkkugeln, und dass eine verschobene und
gedrehte Hand dieselbe Haltung misst — sonst stünde in jeder Messung, wo im
Zimmer man gerade steht), die **Knochenfarben**
(`src/core/boneColors.test.ts` — dass sich die Töne je Finger und die Stufen je
Knochen wirklich unterscheiden, dass ein Modell mit zwei Knochen dieselben Enden
bekommt wie eins mit dreien, dass die Namen der Brille auf die richtigen Kugeln
zeigen, und dass eine gefärbte Hand die Farben auch trägt — als Material je
Knochen an der Boxhand, als Punktfarben im Netz des Handschuhs), die **geteilte
Handhaltung** (`src/worlds/tune/handShare.ts` — hin und
zurück ohne Verlust, dass die zwanzig Gelenke nur mitgehen, wenn es sie gibt,
und dass alles, was nicht danach aussieht, verworfen wird
statt eine halbe Hand zu bauen) und die **Maße des Gangs samt Poseraum**
(`src/worlds/tune/lane.ts` — dass die Trennwand die Knöpfe stehen lässt, wo die
alte Wand stand, dass ihre Tür breit genug ist und in den Gang passt, und dass
der Schwebekasten in den Streifen dahinter passt, mitsamt dem, der davorsteht).
das **Hirn eines NPC** (`src/worlds/npc/npcBrain.ts` — dass „vorne" wirklich
-Z ist und ein Zombie einem nicht rückwärts davonläuft, dass er über den
kürzeren Bogen dreht und nur läuft, wohin er schon schaut, dass er ankommt,
auch wenn er anfangs in die andere Richtung sieht, dass er in Reichweite
stehen bleibt und im Takt seiner Wartezeit zuschlägt statt sechzigmal je
Sekunde, und dass der Schlenderer seinen gewürfelten Kurs behält, bis die Uhr
abgelaufen ist), seine **Einstellung**
(`src/worlds/npc/npcSettings.ts` — dass ein kaputter Speicher keinen Zombie
ohne Leben ergibt, dass ein Tempo von null erlaubt ist — das ist ein Hirn, das
steht —, und dass eine neue Haut ihr Leben und ein neues Hirn sein Tempo
mitbringt), **woher einer kommt** (`src/worlds/npc/npcSpawn.ts` — dass ein
Brutkäfig seinen Takt hält, nicht läuft, solange niemand in der Nähe ist,
nichts nachlegt, solange er voll ist, und dass ein Spawnpunkt nicht der ist,
auf dem der Spieler gerade steht — es sei denn, es gibt keinen anderen) und
**wo eine Kugel ihn trifft** (`src/worlds/npc/npcHit.ts` — Kopf, Rumpf,
Beine, darüber weg, daneben vorbei und unter den Füßen durch, ein Kopfschuss
aus jeder Richtung, weil der Kopf auf der Hochachse sitzt, eine Strecke, die
vor ihm endet, trifft nicht — und die Zahl, wegen der die Zone kein Zylinder
mehr ist: Die **Schulter** trifft, zwei Zentimeter daneben trifft nicht mehr,
und der Rumpf dreht sich mit ihm, weil er breiter ist als tief).
Dazu die ganze **Navigationsschicht** (`src/worlds/nav/`), und die ist mit
Absicht vollständig geprüft, weil man ihr in der Brille nicht ansieht, was sie
tut: der **Kachelschlüssel** (`navTile.ts` — drei Zahlen in einer, und die
Normierung, wegen der jede Wand nur einmal existiert; wer sie falsch hätte,
merkte es erst an einem NPC, der durch eine geschlossene Tür läuft, weil er sie
von der falschen Seite anschaut), die **Kostenprofile** (`navProfile.ts` — die
eine Zeile Tabelle, an der hängt, dass der Zombie in die Stachelgrube läuft und
der Mensch darum herum, **und was einer an einer Kante anfängt**: dass die
Stufe nach `stepUp` und `jumpUp` gefragt wird und die Rampe nach dem Winkel,
dass dieselbe Kante hinunter ein Weg ist und hinauf eine Wand, und dass ein
Sprung über eine Lücke nach der Weite fragt und nicht nach der Steigung), der
**Fallschaden** (`navFall.ts` — dass ein Absatz umsonst ist, dass die Höhe, die
einer noch überlebt, zur Rechnung passt, mit der er unten aufkommt, und dass
ein Aufprall auf dem Mond aus größerer Höhe käme als auf der Erde), das
**Material einer Tür**
(`navDoor.ts` — dass Holz nachgibt und Metall nicht, dass ein Schlag nie unter
null nimmt, und die Zahl, die man in der Brille wirklich sieht: wie lange einer
davorsteht, bis sie fällt), die **drei Schalter**
(`navSwitches.ts` — dass in jeder Welt alles an ist, denn ein Schalter, der
irgendwo aus anfängt, lässt einen den Fehler in der Wegsuche suchen, der in
einer Einstellung steckt), der **Graph** (`navGraph.ts` — was eine Wand für
Bewegung, Sicht und Schall bedeutet, dass eine geschlossene Tür für den
einen ein Umweg von drei Metern und für den anderen eine Wand ist — außer sie
ist aus Holz, dann ist sie zehn Meter und drei Sekunden Prügel —, und dass eine
eingeschlagene Tür ein Loch bleibt und sich nicht wieder zuziehen lässt), die
**Linie durch das Gitter** (`navSight.ts` — Sicht, gerader Gehweg und Schall
aus **einer** Wanderung, samt der Mauerecke, durch die niemand diagonal sehen
darf), die **Wegsuche** (`navPath.ts` — Umweg statt Durchbruch, Teilweg statt
Stillstand, Portale und Treppen, der **Schnurzug**, der aus dem Treppenmuster
der Kachelmitten eine Diagonale macht und dabei **den Halbmesser dessen
Abstand hält, der ihn läuft** — ein Weg, der die Hausecke um zwanzig Zentimeter
verfehlt, ist für einen 58 cm dicken Zombie eine Wand —, der weder über eine
Treppe hinweg abkürzt noch in die Stachelgrube gerät, dazu die **Luft**
über den eigenen Umfang hinaus (`NAV_CLEARANCE`: fünfzehn Zentimeter, die den
Unterschied zwischen „passt haargenau vorbei" und „kommt vorbei" ausmachen),
und das Strömungsfeld,
das eine Horde keine Klippe hochlaufen lässt), die **Ecke**, an der er Abstand
hält (`cornerBlocked` — und zwar auch am **Kopfende** einer Wand, wo alle vier
Seiten der Nachbarkachel frei sind und die Stirnseite des Klotzes trotzdem in
ihrer Ecke steht; dieselbe Frage beantwortet die Debug-Ansicht, und dass es
*eine* Frage ist, ist der Zweck), die **Meinung** (`navBelief.ts` — dass ein NPC gegen eine inzwischen
verschlossene Tür läuft und erst dort umplant: das ist das Ziel und nicht der
Fehler, und der Test hält es fest, damit es niemand später „repariert"; dazu
die **Freiraum-Annahme**: eine Tür, die er nie gesehen hat, hält er für offen,
und wer diese Zeile umdreht, hat die Hellsicht wieder eingebaut), die
**Sinne** (`navPerception.ts` — Kegel, Reichweite, Wand, Reaktionszeit und vor
allem die letzte bekannte Stelle), die **Fortbewegung** (`locomotion.ts` — dass
ein Fußgänger sich erst dreht und dann losgeht, dass ein Fahrzeug im Stand
**gar nicht** lenkt, weil ω = v/R ist, und dass eine Drohne sich auch seitwärts
schiebt), das **Abtasten** (`navBake.ts` — dass aus einer Platte ein Kachelfeld
wird, dass eine Wand zwischen zwei Kacheln landet und eine Lücke darin wieder
durchlässt, dass unter ein zu niedriges Vordach niemand gesetzt wird, dass
Tunnel und Sand darüber zwei Kacheln sind, und die Zahl, wegen der es diesen
Test gibt: ein Boden, der **in** einem Quader steckt, ist keiner — der Sand
unter einem Podest ist nicht begehbar, und wer ihn mitzählt, legt die Kachel
des Podests auf den Boden daneben; dazu die zwei Messungen, mit denen eine
**Rampe** und eine **Mauer** auseinandergehen, obwohl beide gleich hoch sind,
und der **Sprung über eine Lücke**, den vorher jede Welt von Hand eintragen
musste — samt der Wand, die in der Lücke steht und ihn wieder verbietet), die
**Übersetzung in die Welt**
(`navScene.ts` — dass ein gedrehter Quader seinen Schatten wirft, dass eine
offene Tür in der Debug-Ansicht keine Sperre ist, dass die **betretbare
Fläche** als einzige Ebene hinter Wänden verschwindet, dass sie am **Kopfende
einer Wand** eine Ecke ausspart und ohne besetzte Ecke trotzdem ein einziges
Rechteck je Kachel bleibt, und dass ein gezeichneter Weg durch seine
**Wegpunkte** geht und nicht über die Kachelmitten), das **Format**
(`navSerial.ts` — Hin und Zurück ohne Verlust, das **Material** einer Tür
eingeschlossen: Eine Metalltür, die als Holztür zurückkäme, wäre ein Zombie,
der durch eine Wand geht, die vor dem Speichern eine war; und jede Datei, die
es ablehnt: fremdes Format, fehlende Version, eine Karte aus
der Zukunft und eine mit einer anderen Kachelgröße) — und, seit es sie gibt,
der **Bauplan der Wandkonsole** (`navlab/consoleLayout.ts` — dass jede Taste und
jede Beschriftung auf der Platte bleibt, auch wenn eine Ebene dazukommt, dass
keine zwei übereinanderliegen und dass „Verbindungen" als Ebene und als
Schalter nicht dieselbe Taste sind), und
der **Bauplan des Editors** (`editor/levelPlan.ts` — worauf ein Zeiger trifft,
Kachel oder Kante; was die vier Werkzeuge daraus machen; und dass der
Radiergummi erst die Tür, dann die Wand und dann den Boden nimmt), die
**Geometrie dazu** (`editor/levelBuild.ts` — Pfosten, Sturz und Blatt, und der
Prüfstein: was der Editor baut, findet das Abtasten wieder), die **Bausteine
auf dem Kachelgitter** (`grid/blocks.ts` — dass jeder von ihnen in **jeder der
vier Richtungen** auf seiner Kachel bleibt und über dem Boden, dass eine
Küchenzeile an der Ostwand genauso aussieht wie an der Nordwand, und die Zahl,
wegen der es diesen Test gibt: **0,32 m**, so hoch steigt der
Character-Controller, und keine Treppenstufe darf höher werden), der
**Grundriss** dazu (`grid/gridPlan.ts` — dass ein Zimmer seine Wände außen an
die Randkacheln stellt, dass eine Decke **ein** Quader ist und nicht vierzig,
dass ein Fenster wirklich ein Loch lässt, und wieder der Prüfstein: was ein Plan
baut, findet das Abtasten wieder), das **Setzen von Bausteinen**
(`grid/gridTool.ts` — dass eine Küchenzeile ohne Kante zurückgewiesen statt
geraten wird, dass der Radiergummi erst den Baustein und dann den Boden nimmt,
dass eine Kachel danach wieder so billig ist wie vorher, und der Fehler, der
erst beim **zweiten** Laden aufflöge: dass ein Aufschlag nicht doppelt zählt),
und die **vier Grundrisse der Gitterwelten** (`dark/darkHouse.ts`,
`range/rangeStand.ts`, `dust/dustTown.ts`, `climb/climbHall.ts` — dass man vom
Startzimmer in jedes Zimmer kommt, dass jedes Haus in Dust vom Erdgeschoss aufs
Dach begehbar ist, dass kein Baustein in einer Tür steht und dass die Matte der
Kletterhalle nicht als zweite Fläche auf dem Boden liegt), die **Miniatur**
(`editor/miniature.ts` — Hin und Zurück ohne Drift, **auch bei einem gekippten
Modell**; dass eine Hand es samt Handgelenk trägt und der angefasste Punkt
dabei unter ihr bleibt; dass zwei Hände es kippen **und** rollen — das Rollen
ist die Drehung um die Achse, die man in den Händen hält, und ohne sie fehlte
genau die, die man am häufigsten will —; dass „Zu mir" ein verdrehtes Modell
wieder flach legt; und die Grenzen des Maßstabs) samt der Zusicherung, dass
sie dasselbe rechnet wie die three.js-Gruppe, die man sieht
(`editor/miniatureFrame.test.ts`), die **Vorfahrt beim Zugreifen**
(`editor/reach.ts` — dass die kleine Spielfigur mitten im großen Grundriss
gewinnt, wenn die Hand auf ihr liegt: das nächstgelegene Ding gewinnt und
nicht das mit der größeren Blase), das **Malen und die Flächen**
(`editor/planPaint.ts` — dass zwischen zwei Bildern keine Lücke bleibt, wenn
eine Hand über drei Kacheln fährt; dass die Himmelsrichtung des Ziels für den
ganzen Strich gilt, weil sonst jede zweite Wand quer stünde; dass ein Rechteck
aus **Boden** seine Fläche füllt und eines aus **Wänden** nur seinen Rand, nach
außen gerichtet — ein gefülltes Rechteck aus Wänden wäre ein Klotz, gemeint ist
ein Zimmer; und dass eine getroffene Kante die Ecke nicht um eine Kachel
verschiebt), das **Gedrückthalten des Zeigers**
(`core/pointer.test.ts` — Druck genau einmal, Halten in jedem Bild danach,
Loslassen genau einmal, auch wenn der Strahl abrutscht oder das Ziel mitten im
Strich abgemeldet wird), das **Weltformat**
(`grid/worldFile.ts` — dass eine Welt mit Dach, Möbeln und eigenen Kachelkosten
durch JSON und wieder zurück dieselbe ist; dass der Aufschlag einer Küchenzeile
über **drei** Runden konstant bleibt, statt sich zu verdoppeln; dass eine Datei
ohne Version, mit fremdem Format oder aus der Zukunft abgelehnt wird — und mit
zwei *verschiedenen* Meldungen, weil „zu neu" und „zu alt" verschiedene Sachen
sind; dass ein Baustein ohne Boden stillschweigend wegfällt, eine kaputte Masse
dagegen abbricht) und der **Speicher dahinter**
(`grid/worldStore.ts` — dass jede Welt ihren eigenen Schlüssel hat, dass Müll im
Speicher weggeworfen wird statt die Welt aufzuhalten, und dass ein privates
Fenster ohne `localStorage` ein Nein bekommt statt eines Absturzes) — und das
**ganze Labor auf einmal** (`navlab/labSim.ts`, `labSim.test.ts`, und einmal
mit echter Physik in `labPhysics.test.ts`): dieselben
Wände, dieselbe Karte, ein Körper mit Umfang und Drehrate, und je Bucht ein
**Kontrollpunkt**, an dem er vorbeigekommen sein muss — darunter der, um den es
seit den Türen geht: Vor der **Metalltür** muss der Zombie außen herum, und der
Beweis ist die Stelle, an der seine Spur die Wandlinie überschreitet; vor der
**Holztür** steht er drei Sekunden und geht dann geradeaus hindurch. Beide Male
prüft der Test zusätzlich, dass er **wirklich hingegangen** ist: Der Umweg
fängt an der Tür an und nicht am Start, sonst wusste er von einem Riegel, den
ihm niemand gezeigt hat. Der Unterschied zu allen
anderen ist die Frage: Die übrigen prüfen eine Rechnung, dieser prüft einen
**Eindruck** — „der Zombie läuft durch die verriegelte Tür" ist keine falsche
Zahl, sondern ein Weg, den man erst sieht, wenn man ihn abläuft.

Und seit es die **Schilder** gibt (`worlds/signs/`), fünf weitere: was auf
einem Schild steht (`signMarkup.ts` — die kleine Teilmenge Markdown, und vor
allem, dass ohne sie jede Zeile wörtlich stehen bleibt: wer eine Liste von
Namen mit `*` davor tippt, will Sternchen und keine Aufzählung), wie es
umbrochen wird (`signLayout.ts` — gemessen wird von außen, im Test von einer
Funktion, die Buchstaben zählt; geprüft werden der Umbruch, das zu lange Wort,
das *nicht* zerhackt wird, der Punkt links vor dem eingerückten Text und die
gedeckelte Höhe eines Bildes), wie es **rollt** (`signScroll.ts` — dass was
hineinpasst gar nicht rollt, dass oben und unten gewartet wird, und die tote
Zone, ohne die ein ruhender Stick ein Schild in einer Minute quer durch seinen
Text schöbe), wie es **aussieht** (`signSettings.ts` — Grenzen, Rasten, und die
Umrechnung, um die es eigentlich geht: die Schriftgröße steht in Zentimetern
*auf dem Schild*, damit „4 cm" auf der kleinen Tafel dasselbe heißt wie auf der
großen), und was davon **über das Netz** geht (`signShare.ts` — dass ein
fremdes Schild geprüft wird, bevor es gezeichnet wird, und dass bei gleicher
Fassung das Bekannte stehen bleibt: beim Begrüßen antworten mehrere, und ohne
diese Regel spränge der Rollstand jedes Schildes zurück an den Anfang). Dazu
die **Tastaturwahl** (`core/systemKeyboard.ts` — die Tabelle aus drei
Einstellungen mal „in der Brille" mal „auf so einem Gerät", in der man sich
sonst vertut) und die **Türen des Interaktionslabors**
(`worlds/interact/doorMotion.ts` — dass eine Tür mit Nachlauf beim zweiten
Druck *nicht* zufällt, sondern die Uhr neu setzt: eine Tür, die zugeht, während
man in ihr steht, ist eine Falle und kein Schalter) und der **alte Build**
(`core/staleBuild.ts` — die drei Sätze, mit denen die drei Browser-Familien
ein nicht mehr vorhandenes Modul melden, wörtlich, damit ein Tippfehler in der
Liste auffällt und nicht erst dann, wenn nach einem Deploy niemand mehr die
Welt wechseln kann; und die Bremse, die daraus höchstens *ein* Neuladen macht).

Diese Module kommen bewusst ohne three.js und ohne Rapier aus, deshalb braucht
Jest weder WebGL noch WebXR noch wasm.

Ein paar Tests benutzen doch three.js — aber nur als Geometrie, ohne WebGL: der
**Pointer** (`src/core/Pointer.ts`) muss jeder Hand ihren eigenen Strahl und
ihren eigenen Trigger lassen, die **Handform** (`src/core/HandVisuals.ts`)
muss links links und rechts rechts sein — und der weiße Handschuh muss
dasselbe Skelett tragen wie die Boxhand, mit seinen **drei schwarzen Strichen**
oben auf dem Handrücken; dazu muss eine **gemessene Haltung** an der
gezeichneten Hand ankommen: der zweite Knochen knickt, ohne den ersten
anzufassen, jeder Finger fächert einzeln, der Daumen eingeschlossen (den die
eine alte Spreizung nie anfasste), und eine Haltung ohne Gelenke krümmt sich
weiter wie eh und je —, der **Kopf eines NPC** muss dort sitzen, wo die Kugel ihn sucht
(`src/worlds/npc/npcBody.test.ts` — Modell und Trefferzone rechnen dieselbe
Zahl, und der Scheitel liegt auf der Körperhöhe: sonst zielt man auf die Stirn
und trifft die Luft darüber),
und die **Öffnung des magischen Beutels**
(`src/worlds/portal/tools/MagicBagTool.test.ts`) muss fassen, was in ihr liegt:
Fächer, Blätterpfeile und Seitenpunkte. Die ersten beiden sind Vorzeichen, die
man in der Brille erst nach Minuten bemerkt und dann nicht mehr los wird; das
dritte ist eine Zahl, die von oben niemand sieht — der Beutel ist ein Trichter,
und dort, wo die Felder liegen, ist er anderthalb Zentimeter enger als am Saum.
Der erste Blätterpfeil stand deshalb im Leder. Alles, was schwer zu testen ist, gehört
möglichst in so ein Modul — der Rest bleibt Verdrahtung.

WebXR braucht einen sicheren Kontext. `localhost` reicht; für die Brille im
selben WLAN am einfachsten über HTTPS-Tunnel oder `vite dev --https` testen.

## Was drin ist

- **Startseite** mit großem `Enter VR`-Button (plus Flat-Modus für Desktop/Handy).
- **Hub-Welt**: runde Halle, und von ihr gehen **Gänge** ab, an deren Wänden
  die Tore stehen — vier je Gang, zwei pro Seite und gegeneinander versetzt.
  Ist ein Gang voll, kommt der nächste dazu und alle verteilen sich neu über
  den Kreis. Ausgelegt wird das aus nichts als der Länge der Weltenliste
  (`src/worlds/hub/hubLayout.ts`, mit Test): eine neue Welt bleibt damit das,
  was sie sein soll — ein Eintrag in der Registry. Der alte 90°-Bogen war für
  vier Welten hübsch und für zehn ein Gedränge. Gebaut wird ein Gang entlang
  −Z und dann gedreht — und zwar um den **negativen** Winkel
  (`corridorYaw`, mit Test): eine Drehung um φ legt −Z auf (−sin φ, −cos φ),
  die Tore stehen aber auf `corridorDirection`. Mit dem Winkel selbst lagen
  Gang und Tore gespiegelt zueinander, und ab dem dritten Gang stand das
  letzte Tor (die Alpen) hinter der Rückwand eines fremden Gangs im Freien —
  aus dem Gang heraus war die Welt schlicht nicht da.
- **Handgelenk-Menü**: an **beiden** Händen schwebt ein Button; ein Druck öffnet ein
  Panel, das der Hand folgt — inklusive Neigung, es kippt mit dem Handgelenk.
  Es ist zweimal dasselbe Menü, und immer nur **eins offen**: das zweite geht
  zu, sobald das erste aufgeht. Ein Menü nur links war genau so lange in
  Ordnung, wie die linke Hand nichts zu tun hatte — mit einer Waffe, einer
  Drohne oder einem Lenkrad darin kam man nur noch heran, indem man das Ding
  weglegte.
  Das Panel steht senkrecht auf dem Handrücken und schaut den Kopf an.
  Ausgewählt wird mit der anderen Hand: zielen und **Trigger oder `A`** drücken
  — Hovern allein löst nichts aus, und angetippt wird auch nichts. Ohne
  getrackte Hand hängt dasselbe Menü an der Blickrichtung.
  Aufbau: **Welten** (Hub, Portal Labor, Schießstand, Dust, Gokart, Pizzeria,
  Mond, Alpen, Dunkelhaus, Kletterhalle, Effektlabor, Interaktionslabor,
  Eingaberaum, Spiel Haunting),
  **Werkzeuge**
  (das ganze Regal direkt in die Hand, und die Einstellungen jedes Werkzeugs
  dahinter), **Magischer Beutel** (Raster mit Companion Cube, Kugel, Domino,
  Pyramide, Quader, Planke, Zylinder, Kegel, Rampe, Stab, Murmel, Sektflasche
  und dem **Würfelsatz** W4, W6, W8, W12, W20 — siehe _Was aus dem Beutel
  kommt_),
  **NPC** (wer hier herumläuft — Haut und Hirn getrennt, dazu Spawnpunkte und
  Brutkäfige; siehe _Wer hier herumläuft_),
  **Bewegung** (Haltung, Augenhöhe, Sprint und Ducken), **Aussehen** (was man
  auf dem Kopf trägt — siehe _Wie man aussieht_), **Grafik** (die
  experimentelle Seite: Einfach oder Comic — siehe _Wie schön es aussieht_),
  **Einstellungen** und die Aktionen der Welt.
  Auf den Seiten **Werkzeuge** und **Magischer Beutel** nimmt **Greifen oder
  `A`** den Eintrag in genau die zeigende Hand, damit der Zieltrigger nicht
  versehentlich die Hand füllt. Das Raster kommt zurück, sobald du loslässt.
  Der **Trigger** hat dort eine andere Aufgabe: er geht in die
  **Einstellungen des Werkzeugs**, hinter den Pfeil am Zeilenende. Beides
  zugleich wäre das Schlimmste von beidem — man hätte das Ding in der Hand
  _und_ stünde eine Seite tiefer —, also merkt sich das Menü im Moment der
  Auswahl, womit gedrückt wurde.
  In der Zeile eines Werkzeugs steht statt der Strichzeichnung ein **kleines
  Modell des Werkzeugs selbst**, das sich langsam dreht: bei sechs Handschuhen
  und drei Pistolen ist eine Ikone bald keine Auskunft mehr. Es ist vom
  Regalexemplar abgeschrieben — nur die sichtbaren Netze, mit derselben
  Geometrie und demselben Material —, hängt am Panel und fängt **keinen
  Strahl** ab, die Zeile dahinter bleibt also genauso anfassbar wie vorher
  (`ui/WristMenu.ts`, `MenuEntry.preview`).
  Passt eine Seite nicht aufs Panel — das Werkzeugregal tut das längst nicht
  mehr —, wird geblättert, auf zwei Arten: **mit dem Stick der zeigenden Hand**
  hoch/runter, oder indem man den **Trigger hält und wischt**, wie auf einem
  Telefon; eine volle Panelhöhe schiebt eine volle Seite. Rechts zeigt ein
  Balken, wo man gerade ist. Links/rechts bleibt der Snap-Turn.
  Damit das Wischen nicht jedes Mal zuerst die Zeile drückt, auf der es
  anfängt, **wartet eine Auswahl im Handgelenkmenü aufs Loslassen** und fällt
  weg, sobald aus dem Druck ein Zug wird; `A` und die Maus wählen sofort aus,
  und alles außerhalb des Handgelenkmenüs bleibt, wie es war.
  Und **wer blättert, läuft nicht los**: zeigt eine Hand aufs offene Menü und
  benutzt ihren Stick, gehört der Stick diese Frame dem Menü und nicht den
  Beinen (`PlayerRig.menuStick`).
  Die **Zurück-Zeile bleibt als Kopf stehen**, egal wie weit man geblättert
  ist — wie der Kopf einer Webseite, und auf einer Rasterseite als Balken über
  den Kacheln. Vorher war sie schlicht der erste Eintrag der Liste und nach
  drei Zeilen weg; aus einer langen Seite kam man nur wieder heraus, indem man
  erst blind nach oben blätterte (`UIPanel`, `PageOptions.pinned`).
  **Das Menü bleibt stehen, wo man war** — auf der Seite und in der Liste, und
  zwar **für beide Hände gemeinsam**. Beides wurde ständig zurückgesetzt, und
  beides aus demselben Grund: der Baum
  wird bei jeder Änderung neu gebaut, und eine Zeile zu drücken ist ja gerade
  das, was ihre Beschriftung ändert. Ein Werkzeug aus dem Regal nehmen oder
  eine Einstellung eine Raste weiterschalten warf einen an den Anfang der
  Liste — beim Regal also vor jedem einzelnen Werkzeug erneut —, und Zumachen
  warf einen zusätzlich auf die oberste Ebene. Dasselbe eine Ebene höher: jedes
  Handgelenk hatte seinen eigenen Merkzettel, also fing das Menü an der rechten
  Hand wieder ganz oben an, wenn man es links drei Ebenen tief verlassen hatte
  — und genau dann macht man es rechts auf, wenn links etwas drinliegt.
  Jetzt liegt der Weg einmal da und wird von beiden Panels gelesen
  (`src/ui/menuNav.ts`, mit Test), samt der Zeile, in der man war. Wo man ist,
  sagt
  die Überschrift auf dem Panel und die _Zurück_-Zeile. Verschwindet eine Seite
  aus dem Baum, endet der Weg dorthin bei ihrer Elternseite. Die Blätterregel
  steht in `src/ui/pageScroll.ts` (mit Test), inklusive der Klemmung nach
  unten: eine Seite kann zwischen zwei Besuchen Zeilen verlieren, und ein übrig
  gebliebener Versatz zeigt sonst ein leeres Panel.
- **Zeigestrahl an beiden Händen**: jeder Controller hat seinen eigenen Strahl
  mit eigenem Cursor — was die eine Hand gerade hält, hindert die andere nicht
  am Zeigen. Das Panel eines Werkzeugs in der rechten Hand wird also mit der
  linken bedient und umgekehrt. Ruht ein Strahl auf einem Panel, gehört der
  Trigger **nur dieser einen Hand** dem Menü; die andere Hand feuert oder greift
  ungestört weiter. Zwei Ausnahmen: eine Hand, die ein Gerät mit beiden Fäusten
  hält (die Drohne), hat gar keinen Strahl, und das Handgelenk-Menü hört den
  Strahl der Hand, an der es hängt, nicht — sonst würde es beim Drehen des
  Handgelenks über den eigenen Knopf streichen.
- **Türkis heißt anfassen**: alles, was eine Hand nehmen darf, hat dieselbe
  Farbe — die Griffe der Werkzeuge, der Ring um die Linse der Taschenlampe,
  die Plätze am Gürtel, die Griffe an den Justierständen im Eingaberaum, der
  Kreis auf dem Boden davor. Eine Spülmaschine
  sagt einem auch nie, wo der Griff ist; sie färbt ihn, und danach greift
  jeder beim ersten Mal richtig. In VR wiegt das schwerer als daheim, weil ein
  Werkzeug ein Klotz aus Dreiecken ist und man ihm nicht ansieht, ob man es am
  Lauf oder am Schaft nehmen soll. Daneben ein zweiter, hellerer Ton fürs
  **Leuchten in dem Moment**, in dem die Hand nah genug ist — verwandt und
  bewusst nicht gleich, denn „das kann man nehmen" und „das kann man _jetzt_
  nehmen" sind zwei Nachrichten. Beide Zahlen stehen an genau einer Stelle
  (`src/core/colors.ts`), das Material dazu baut `grabMaterial()` in
  `tools/Tool.ts`; eine zweite türkise Zahl irgendwo im Code ist das, was die
  Regel nach drei Monaten kaputt macht.
- **Werkzeuggürtel**: an beiden Hüften hängt ein Platz für ein Werkzeug. Was
  in der Hand ist und in die Nähe eines Platzes kommt, lässt den Ring
  aufleuchten — dort loslassen legt es ab, Greifen nimmt es wieder. Jedes
  Werkzeug passt auf jeden Platz, sie lassen sich also frei tauschen.
- **Eine Hüfte merkt sich ihre Bestückung**, nicht ihr Exemplar
  (`BeltSlot.stored`). Wer die Pistole links herausnimmt, sie in die andere
  Hand gibt und rechts einsteckt, hat danach **an beiden Hüften** eine — links
  wächst nach, was dort hingehört. Vorher blieb dort ein leerer Ring zurück:
  das Umhängen war ein Weg, eine Waffe zu verlieren, und man holte sie sich im
  Regal wieder. Nachgefüllt wird nur eine Hüfte, an der wirklich etwas hing;
  ein Werkzeug aus dem Regal hat keine, und auf einer fremden Hüfte wächst
  ihm nichts nach.
- **Ein Werkzeug ist nicht ein Exemplar.** Es gibt je Id ein _gepooltes_ —
  daran hängen Beschriftung, Werte und das kleine Modell im Regal —, und
  daneben so viele Kopien, wie gebraucht werden (`PortalWorld.freshTool`).
  Vorher gab es genau eines, und damit war „zwei Pistolen" nicht vorgesehen:
  Wer sich aus dem Regal eine zweite in die andere Hand holte, bekam
  dieselbe, und sie verschwand aus der ersten Hand. Jetzt sind zwei Waffen
  zwei Waffen — einzeln zu nehmen, einzeln zu werfen, und danach liegen
  beide auf dem Boden.
- **Wo der Gürtel hängt, ist einstellbar** (`beltSettings.ts`, mit Test): drei
  Zahlen — Abstand zur Seite, Höhe als _Anteil der Augenhöhe_, Tiefe vor oder
  hinter der Körpermitte. Sie gelten für **beide** Hüften, gespiegelt; ein
  Gürtel, bei dem eine Seite tiefer hängt als die andere, ist kein Gürtel,
  sondern ein Versehen. Die Höhe steht als Anteil, damit sie mit dem
  mitwächst, der sie trägt, und im Sitzen nicht auf Brusthöhe rutscht.
  Verschoben wird mit dem **Gürtel-Justierer** (siehe unten), gespeichert wird
  im Browser (`bgvr.belt`).
- **Loslassen heißt fallen lassen**: wer ein Werkzeug irgendwo _anders_ als
  über einer Hüfte loslässt, lässt es fallen — es liegt dann als Objekt im
  Raum, kann angestoßen und von jeder Hand wieder aufgehoben oder in der Luft
  aufgefangen werden. Im selben Moment wächst auf der Hüfte, von der es kam,
  ein **neues** nach. Damit ist „Waffe ziehen, in die andere Hand geben, noch
  eine ziehen" eine durchgehende Bewegung.
  **Geworfen wird mit dem schnellsten Moment**, nicht mit dem letzten: wer
  wirft, öffnet die Hand am Ende der Bewegung, der Griffknopf meldet das ein
  paar Millisekunden später, und da bremst der Arm schon wieder ab. Ein
  geglättetes „jetzt" trifft dann genau in die Bremsphase — es fühlt sich an,
  als hätte das Spiel den Wurf einen Tick zu spät erkannt, und das hatte es
  auch. Genommen wird deshalb die schnellste Bewegung der letzten 0,14 s,
  über je zwei Bilder gemittelt, damit ein Trackingzucken keinen Wurf auslöst
  (`portal/throwMotion.ts`, mit Test).
  **Und der Drall geht mit**: ein hochgeworfener Dominostein taumelt, eine
  Taschenlampe flog lange wie ein Brett. Der Unterschied lag nicht an der
  Physik, sondern daran, woher die beiden ihre Drehung bekommen — ein
  gegriffener Gegenstand hängt als kinematischer Körper an der Hand, und Rapier
  liest seine Winkelgeschwindigkeit beim Loslassen aus zwei aufeinanderfolgenden
  Lagen ab; ein Werkzeug hängt als Kind der Hand im Szenengraph und bekommt
  seinen Körper erst in dem Moment, in dem es fällt, mit allem auf null.
  `HandSpeed` misst deshalb auch die **Drehung** der Hand (`spinBetween`, mit
  dem kürzeren Bogen, damit aus einer winzigen Drehung nicht gelegentlich eine
  fast volle in die falsche Richtung wird) und gibt sie nach derselben Regel
  weiter wie das Tempo: der schnellste Moment im Fenster. Gedeckelt bei gut
  drei Umdrehungen je Sekunde — ein Trackingaussetzer meldet sonst zweihundert
  Radiant. Das gleitende Messer behält seinen eigenen Überschlag: es dreht sich
  um die Ebene des Wurfs und nicht um das Handgelenk.
  **Und die Richtung ist nicht die Bewegungsrichtung**: Wer zielt, führt den Arm
  von oben nach unten und hält die Klinge dabei die ganze Zeit auf das Ziel —
  die Bewegung geht nach unten, gemeint ist geradeaus, und der Wurf landete im
  Boden. Zu beheben war das nicht, indem man die Hand anders bewegt; es _ist_
  die Wurfbewegung. Ein geworfenes Messer nimmt deshalb drei Antworten
  zusammen (`throwMotion.ts`, `throwDirection`, mit Test): wohin die Hand fuhr,
  **wohin sie am Ende zeigte** — der Zeigestrahl, gemittelt über die letzten
  0,06 s, in denen auch das etwas verspätet gemeldete Loslassen steckt, also
  ohne dass irgendetwas warten müsste — und **wohin geschaut wird**. Der Blick
  zieht wie in jedem Spiel mit Wurfwaffen: bis 10° zwischen Wurf und Blick ist
  er gemeint und gewinnt ganz, bis 35° verläuft sich seine Hilfe weich, darüber
  hinaus zählt nur die Hand. Wer geradeaus schaut und absichtlich nach rechts
  wirft, wirft nach rechts. Genommen wird dabei nicht die Blickrichtung,
  sondern der **Punkt, auf dem der Blick liegt** (`PortalWorld.gazeAim`, sonst
  zwölf Meter geradeaus): Der Blick geht vom Kopf aus, der Wurf von der Hand,
  und ein halber Meter Versatz sind auf fünf Meter gut fünf Grad daneben. Das
  alles gilt nur für einen **wirklichen Wurf** eines gleitenden Werkzeugs; ein
  fallengelassener Hammer fällt weiter dorthin, wohin er geschoben wurde.
- **Von Hand zu Hand**: ein gehaltenes Werkzeug kann die andere Hand
  übernehmen, ohne dass es dafür erst fallen muss. Beide Hände zusammenführen,
  die leere greift — fertig. Gemessen wird gegen den **Griffpunkt** der
  haltenden Hand und nicht gegen die Ausdehnung des Werkzeugs
  (`grabReach.ts`, `atHandGrip`/`HANDOVER_REACH`, 16 cm, mit Test): eine
  Taschenlampe ist dreißig Zentimeter lang, und wer sie übernimmt, fasst sie am
  Rohr an und nicht vorn an der Linse. Genau dort — und nur dort — leuchtet die
  Hand und öffnet sich zum Zugreifen, wie vor einem Gegenstand, plus einem
  Stups beim Ankommen; zwei Fäuste aneinander sieht man in der Brille schlecht.
  Eine Faust, die schon zu ist, bekommt das Zeichen nicht: das ist auch die
  Hand, die eben abgegeben hat, und sie soll das Werkzeug nicht im selben
  Atemzug zurücknehmen. Die Übergabe geht **vor** dem Gürtel — über einer Hüfte
  stehen die Hände nun einmal beieinander, und wer beide zusammenführt, meint
  das Werkzeug und nicht das Regal dahinter. Ein **geparktes** Werkzeug
  (Justierstand) bleibt liegen, und eines, das diese Hand ohnehin beansprucht
  (`claimsHand` — das Drohnendeck, ein Fach im Beutel), wird bedient statt
  genommen. Wie viele Exemplare gleichzeitig
  _außerhalb des Gürtels_ sein dürfen — herumliegend und in Händen zusammen —,
  sagt das Werkzeug selbst (`Tool.looseLimit`, normal eins), und zwar **pro
  Gürtelplatz**: kommt eins zu viel dazu, holt sich der Raum das älteste
  **liegende** von _diesem_ Platz zurück. Bei eins heißt das genau, was es
  soll: die frische Pistole von der linken Hüfte holt die von der linken
  Hüfte liegengelassene ein — und lässt die rechte in Ruhe. Genau daran ist
  die alte Zählung gescheitert: pro Werkzeug-Id gezählt waren eine Waffe
  links und eine rechts schon eins zu viel, und die zweite fallen zu lassen
  ließ die erste verschwinden. Zwei Hüften sind zwei Vorräte
  (`tools/looseBudget.ts`, mit Test). Beim Messer sind es fünf, also fünf
  pro Hüfte.
- **Werkzeuge** (alle in jeder Welt mit Gürtel):
  - **Portal-Waffen**: zwei einzelne und eine kombinierte (Trigger rot,
    Greifen blau, muss nicht dauerhaft gehalten werden).
  - **Größe & Position**: Blender-artige Griffe — sie erscheinen **vor dir**,
    nicht am Objekt, und wirken trotzdem auf das Objekt am anderen Ende des
    Raums. Achsen sind die des Objekts, nur nach deiner Blickrichtung sortiert.
  - **Gürtel-Justierer**: zielt auf eine Hüfte, Trigger wählt sie aus, die
    **andere Hand** greift zu und schiebt. Solange er in der Hand liegt,
    stehen um beide Hüften Kisten — die angezielte trägt die Greiffarbe, die
    gewählte leuchtet. Geschoben wird **relativ**: die Hüfte springt der Hand
    nicht entgegen, sondern nimmt mit, was die Hand seit dem Zugreifen
    zurückgelegt hat; anders ließe sich nichts um zwei Zentimeter versetzen.
    Beide Hüften bewegen sich dabei, gespiegelt. Loslassen speichert, ein
    zweiter Trigger gibt die Hüfte frei, `A`/`X` setzt zurück (dasselbe steht
    im Menü unter _Werkzeuge → Gürtel-Justierer → Gürtel_). Während eine Hüfte
    gewählt ist, gehört die andere Hand dem Gürtel (`claimsHand`): sie zieht
    dabei kein Werkzeug aus dem Halfter — sie greift ja genau dort zu.
  - **Pinsel** samt Palette auf der anderen Hand. Ausgewählt wird darauf auf
    **zwei** Arten, und beide sind Gesten, die es anderswo schon gibt:
    **antippen** mit der Pinselspitze — der kurze Weg, wenn die Hand ohnehin
    dort ist — oder **zielen und Trigger**, wie an jeder anderen Tafel. Dafür
    hängt die Palette als Pointer-Ziel im Raum (`ctx.pointer`) und hört dabei
    **nur auf die Pinselhand**: der Strahl der Hand, die sie trägt, striche
    sonst dauernd über sie hinweg und nähme genau dieser Hand ihren Trigger
    weg (`PointerTarget.ignore`). Antippen war eine Weile der einzige Weg, und
    das hieß: jede Farbe kostet einen Griff quer durch die Luft, auch wenn man
    gerade drei Meter weiter etwas anstreicht.
    Oben rechts steht ein **✕**: die Palette geht zu und bleibt zu, `A`/`X`
    macht sie wieder auf (und wieder zu). Sie ist die eine Tafel, die die ganze
    Zeit über der freien Hand schwebt — wer mit dem Pinsel in der Hand etwas
    _anderes_ tun will, soll sie wegräumen können, ohne den Pinsel wegzulegen.
    Trifft der Trigger eine **Leinwand** statt eines Objekts (die Staffelei,
    siehe unten), wird gemalt statt gestrichen: halten und ziehen ist ein
    Strich, und der Klecks wird mit dem vorigen verbunden, solange derselbe
    Strich läuft. Wo er landen würde, steht dabei schon auf dem Blatt: ein
    **Ring** in der geladenen Farbe, so breit wie der Strich selbst
    (`PaintSurface.aimAt`/`aimRay`, gezeichnet in `PaintBoard`). Aus zwei
    Metern auf eine Staffelei zu zielen hieß vorher: drücken und nachsehen —
    der Zeigestrahl endet irgendwo im Raum, und wo genau er das Blatt
    schneidet, sieht man einem Strich in der Luft nicht an. Gesucht wird er
    genau wie beim Malen (erst die Spitze, dann der Strahl, die erste Leinwand
    gewinnt), damit der Ring dort steht, wo der Trigger auch hinträfe. Liegt
    der Strahl gerade auf der **Palette**, gibt es keinen Ring: dann nimmt der
    Trigger eine Farbe und malt nicht.
    Die Palette hat drei Reiter: **Farben**, **Pinsel**
    und **Material** (Lack, Metall, Gummi, Eis, Stein, Glas, Leuchtend,
    Schaum — `materials.ts`, mit Test).
    Unter **Farben** stehen die zwölf festen Töne, darunter die **eigene
    Reihe** (sechs Plätze) und drei **Regler für Rot, Grün und Blau**. Zwölf
    Töne reichen, um eine Kiste anzustreichen; sie reichen nicht, um zu _malen_
    — jeder Ton, den sie nicht treffen, war vorher ein Ton, den es nicht gab.
    Ein Regler wird nicht getippt, sondern **gezogen**: Trigger halten und
    daran entlangfahren (oder mit der Pinselspitze daran entlangstreichen);
    ein Wert, den man nur antippen kann, stellt man in der Brille nie ein.
    _Speichern_ legt die gemischte Farbe vorn in die eigene Reihe (ohne
    Doppelte, die älteste fällt hinten heraus), _Weg_ nimmt sie wieder heraus,
    und ein leerer Platz nimmt sie auch direkt an. Sie überlebt den nächsten
    Start (`bgvr.brush`).
    Unter **Pinsel** stehen **Art** und **Breite** (`tools/brushSettings.ts`,
    mit Test). Vier Arten, und sie unterscheiden sich in dem, was man sieht:
    **Rund** (weiche Spitze, voller Ton), **Flach** (ein liegendes Rechteck,
    ein Drittel so hoch wie breit — quer gezogen ein Band, längs ein Strich),
    **Filzstift** (harte Kante) und **Sprühdose** (gestreute Punkte, jeder
    fast durchsichtig, erst das Bleiben macht sie dicht). Die Breite steht in
    **Millimetern auf der Leinwand** und nicht als Anteil des Blattes: eine
    Zahl, die man liest wie am Pinselkasten, und eine, die auf einer kleineren
    Leinwand nicht plötzlich etwas anderes bedeutet. Der Pinsel zeigt beides
    an sich selbst — die Spitze trägt die Farbe und wächst mit der Breite.
    Ein Abdruck, der keine runde Kappe ist, kann sich beim Ziehen nicht auf
    `lineCap` verlassen: Flachpinsel und Sprühdose stempeln ihn deshalb dicht
    an dicht die Strecke entlang (`stampCount`, ein Drittel der Breite
    Abstand). Ein Material ist beides zugleich, wie
    das Objekt _aussieht_ und wie es sich _verhält_: Gummi springt, Eis
    rutscht, Glas ist durchsichtig, Leuchtend leuchtet. **Lack** ist der Weg
    zurück, ohne ihn wäre jeder Strich endgültig. Ein Strich setzt immer
    beides — was die Palette zeigt, ist das, was das Objekt bekommt; eine
    Farbe, die je nach Vorgeschichte mal das Material mitnimmt und mal nicht,
    kann man in der Brille nicht lesen. Farbe und Material gehen über das Netz
    (ältere Mitspieler schicken nur die Farbe).
    Gehalten wird er am **Stiel**: der ist in Greiffarbe und liegt als Stab
    auf dem Zeigestrahl wie der Stiel des Hammers — nur **wie ein Stift**
    (`BRUSH_HAND_POSE`): Daumen und Zeigefinger kneifen ihn kurz hinter der
    Zwinge, der Mittelfinger stützt von unten, Ring- und kleiner Finger liegen
    eingerollt darunter, und der Stiel läuft nach hinten über die Schwimmhaut
    aus der Hand. Er lag davor als Stab **von oben** in der ganzen Faust, wie
    ein umgedrehter Hammerstiel — besser als die Hammerfaust davor, aber immer
    noch eine Faust, und in der Brille sah der Pinsel damit nach Werkzeug aus
    statt nach Stift. Kein sichtbarer Halterzylinder darunter, und er zeigt
    trotzdem dorthin, wohin man zeigt.
  - **Staffelei**: das Werkzeug, das eine **Leinwand hinstellt** — und damit
    das, was dem Pinsel bisher fehlte. Er konnte Dinge anstreichen; _malen_
    ging nicht, weil es nichts gab, worauf ein Strich ein Strich bleibt. In
    der Hand ist sie ein zusammengelegtes Bündel am Standardgriff; ein Kreis
    auf dem Boden zeigt, wohin sie kommt, **Trigger** stellt sie dort auf, mit
    dem Blatt zum Spieler. `A`/`X` **wischt das Blatt leer**, sonst
    wäre der erste misslungene Strich das Ende des Bildes.
    Danach ist die **Hand wieder leer**: das Bündel geht an den Gürtel
    (`ToolHost.stowTool`). Wer eine Staffelei abgestellt hat, hat sie
    abgestellt — sie danach noch als Bündel mitzutragen ist die Sorte Zustand,
    die man erst bemerkt, wenn man damit irgendwo hängenbleibt, und ein zweites
    Bündel auf dem Boden wäre eine zweite Staffelei, die keine ist.
    Umgestellt wird sie an ihren **beiden Traggriffen** an den Enden der
    Ablage: Hand daran, greifen, und sie liegt wieder im Arm
    (`ToolHost.takeTool`) — der nächste Trigger stellt _dieselbe_ woandershin,
    eine zweite holt man aus dem Regal. Die Griffe sind der Preis dafür, dass
    sie **kein Prop** ist: ohne Körper fasst keine Hand sie an, und einen
    Körper darf sie nicht haben (siehe unten). Sie sitzen weiter außen als die
    Leinwand breit ist, damit man beim Zupacken nicht ins Bild greift, und
    tiefer als deren Unterkante, damit man sie überhaupt sieht. Eine Hand, die
    schon etwas hält, greift dort nicht zu — wer mit dem Pinsel an der Leinwand
    steht, malt und räumt sie nicht ein.
    Gemalt wird mit dem Pinsel: Spitze ans Blatt oder von weiter weg
    daraufzielen, Trigger halten und ziehen; die Farbe kommt von der Palette.
    Sie ist mit Absicht **kein Hindernis** — man geht durch sie hindurch, und
    genau das ist die Bedingung fürs Malen: eine Pinselspitze muss das Blatt
    berühren dürfen, und ein Körper, der sie wegschiebt, verhindert es.
    Das Blatt steht **fünfzehn Zentimeter vor dem Dreibein** (`BOARD_Z`), und
    die Ablage wandert mit. Das ist keine Kosmetik: die beiden vorderen Beine
    kreuzen die Bildhöhe noch sieben Zentimeter vor der Achse, die Querlatte
    oben zwei — ein Blatt bei 7,5 cm lag damit _im_ Holz, von vorn sah man zwei
    Latten quer über der Leinwand, und der Pinsel malte auf einen Balken. Eine
    echte Staffelei stellt die Leinwand ohnehin **vor** die Beine auf eine
    Ablage und nicht zwischen sie.
    Die Verdrahtung dazu ist der Punkt, an dem man sie sich ansehen sollte:
    der Pinsel kennt keine Staffelei und die Staffelei keinen Pinsel. Beide
    kennen `PaintSurface` (`tools/paintCanvas.ts`), die Staffelei meldet ihre
    Leinwand über `Tool.paintSurface()`, und die Welt reicht sie über
    `ToolHost.paintSurfaces()` weiter. Wo ein Punkt oder ein Strahl auf dem
    Blatt landet, rechnet dasselbe Modul (mit Test), gezeichnet wird in
    `PaintBoard.ts`. Was gemalt wird, geht **nicht** über das Netz — ein Bild
    ist eine Leinwand voller Bildpunkte, und die schickt man nicht dreißigmal
    je Sekunde durch eine Peer-Verbindung.
  - **Pistole** mit Magazin (`x/∞` an der Seite). Unter
    _Einstellungen → Pistole_ steht jeder Wert einzeln: Stärke, Kugeltempo,
    Feuerrate, **Magazingröße**, Nachladezeit, Salvenlänge und Modus (Einzel,
    Salve, Automatik). Jede Zeile schaltet auf die nächste Raste weiter **und
    zeigt die rohe Zahl daneben** — und unter _Werte eingeben_ lässt sich jede
    davon über eine Tastatur direkt tippen. Dazu **Zielhilfen** (Rotpunkt,
    Kimme & Korn, Flugbahn, Röntgen, **Fernrohr** — oder alles ab), der
    **Zoom** des Fernrohrs (16×, 20×, 24×, 28×, 32×, 36× durchklicken oder
    zwischen 1 und 60 tippen) und die **Munition** (normal oder Leuchtspur).
  - **Messer**: das eine Werkzeug, das zum Loslassen gedacht ist. Aus der
    Bewegung heraus losgelassen fällt es nicht, sondern **fliegt weiter** —
    geradeaus, ohne Bogen, und überschlägt sich dabei **vorwärts**: die Spitze
    geht oben herum nach vorn, in der Ebene des Wurfs. Die Drehachse ist
    deshalb `oben × Flugrichtung` (`portal/throwMotion.ts`, mit Test) und
    nicht mehr die x-Achse des Werkzeugs — die liegt in der linken Hand anders
    herum als in der rechten, und aus derselben Wurfbewegung wurde einmal ein
    Überschlag nach vorn und einmal einer nach hinten. **Geflogen wird
    dorthin, wohin gezielt wurde** — aus Bewegung, Zeigerichtung der Hand und
    Blick zusammen, siehe „Loslassen heißt fallen lassen" weiter oben. Es bleibt
    stecken, wo es auftrifft (Wand, Kiste, egal). Fünf dürfen gleichzeitig
    unterwegs oder eingeschlagen sein; der sechste Wurf holt das erste
    zurück. Die Bahn wird pro Frame selbst abgetastet statt auf einen
    Abpraller zu warten — nur so bleibt es _stecken_, statt abzuprallen.
    Es war einmal ein **Wurfstern**, und der hatte keinen Griff — er lag „in
    den Fingerspitzen", also nirgends, und die Boxhand sah an ihm nach nichts
    aus. Das Messer hat einen: den **Standardgriff**, senkrecht in der Faust
    wie ein Pistolengriff, mit derselben Faust darum; die Klinge ragt oben aus
    der Faust heraus, entlang der Griffachse, die Schneide nach vorn
    (`tools/KnifeTool.ts`). Eine Weile lag es als **Stab** quer durch die Faust,
    wie die Taschenlampe damals, die Klinge auf dem Zeigestrahl — so hält man
    eine Lampe, kein Messer; um 90° gekippt also. Die
    Id heißt `knife`; im Kurzcode steht es auf dem Platz des Sterns.
  - **Großer Hammer**: ein Meter Stange, vorn ein Kopf aus Eisen — und das
    erste Werkzeug, das man **irgendwo** anfassen kann. Der türkise Belag am
    Stiel ist der Griff, und er ist absichtlich lang: weit hinten am Knauf hat
    man die ganze Reichweite, weit vorn die Kontrolle, und beides will man nicht
    als Einstellung, sondern mitten in der Bewegung. **Eine Hand** hält ihn wie
    jedes andere Werkzeug, entlang des Zeigestrahls, Kopf nach vorn — neu ist
    nur, _welcher Punkt_ des Stiels dabei in der Faust liegt. Die **zweite
    Hand** kommt dazu, sobald sie am Stiel zudrückt (sie zieht dann nichts mehr
    von der Hüfte, `claimsHand`); ab da liegt der Stab auf der Linie zwischen
    den beiden Fäusten, jede an ihrem Punkt, und der Kopf zeigt von der
    hinteren Hand weg. Vom **Boden** aufgehoben wird er dort, wo die Hand ihn
    anfasst (`Tool.onReach` — der eine Augenblick, in dem Werkzeug und Hand noch
    getrennt im Raum stehen); von der **Hüfte** kommt er im Standardgriff, denn
    dort greift man in einen Ring und nicht an eine Stelle des Werkzeugs.
    **Trigger halten** ist das Umgreifen: der Stiel bleibt
    stehen, wo er ist, und die Hände rutschen daran entlang — Loslassen, und er
    sitzt an den neuen Punkten. Kein Menü und keine Raste, sondern die Bewegung,
    die man auch mit einem echten Stiel macht. **Geschlagen** wird mit dem Kopf
    und nicht mit dem Trigger: was der Kopf schnell genug (ab 1,6 m/s) berührt,
    bekommt einen Stoß in die Richtung, in die der Kopf gerade fliegt, gedeckelt
    bei 9 m/s, damit ein Zucken nicht die halbe Halle wegschießt. Der Kopf wird
    als _Punkt_ gemessen und nicht als Strecke — in der Greifbox (Collider plus
    9 cm) verschwindet der Weg eines Bildes, ein wirklich schneller Schlag kann
    aber durch einen dünnen Dominostein hindurchgehen. Lässt die **führende**
    Hand los, fällt er, auch wenn die zweite noch am Stiel liegt: `heldBy`
    gehört der Welt, nicht dem Werkzeug (genau wie bei der Drohne). Die Rechnung
    steht in `tools/poleGrip.ts` mit Test, das Werkzeug in `tools/HammerTool.ts`.
  - **Stoppuhr**: das Werkzeug, mit dem man Physik _ansieht_. Sie liegt
    **eingemessen** in der Hand: Blatt zum Gesicht, die seitliche Kante in der
    Faust, die einen Controller hält (siehe _Ein Griff für alle Werkzeuge_),
    und der Gehäusemantel trägt die Greiffarbe. Ein **Knopf** an
    der Krone (oder `A`/`X`) öffnet ein Panel an der Uhr — dieselbe Mechanik
    wie beim Drohnen-Display —, und dort steht, was der **Trigger** tut
    (`stopwatchSettings.ts`, mit Test):
    **Zeit** legt den eingestellten Faktor an (angehalten, 0,05× Zeitlupe bis
    4× Zeitraffer) und nochmal drücken nimmt ihn weg;
    **Einzelbild** hält die Welt an, solange die Uhr in der Hand ist, und
    rechnet pro Druck die eingestellte Anzahl fester Schritte — die einzige
    Art, einen Durchschlag oder einen Portalübergang wirklich zu sehen;
    **Schnellladen** stellt die gespeicherte Aufstellung wieder her.
    **Welt speichern** und **Welt laden** stehen im Panel, und Speichern
    bewusst _nur_ dort: ein Trigger, der beides kann, überschreibt irgendwann
    genau den Stand, den man behalten wollte. Gemerkt werden Pose, Größe und
    Schwung jedes Props, im Speicher dieser Sitzung — ein Rücksetzpunkt für
    den Versuch, an dem man gerade ist, kein Spielstand. Loslassen der Uhr
    stellt die normale Geschwindigkeit wieder her.
    Mehr als 4× geht nicht: die Simulation rechnet höchstens vier feste
    Schritte pro Frame, alles darüber wäre eine Lüge im Menü. Und beim
    Schnellladen im Mehrspieler zieht der rechnende Spieler die Objekte
    wieder auf seinen Stand — es wirkt bei dem, der rechnet.
    **Für den Spieler gilt die Physik weiter, auch wenn die Welt steht.** Das
    war eine Weile nicht so, und der Fehler ist lehrreich: Rapier zieht die
    Collider ihren Körpern erst in `world.step()` nach. Solange die Welt
    Schritte macht, fällt das niemandem auf; bei angehaltener Zeit macht sie
    keine — und dann stand der Collider der Spielerkapsel für immer dort, wo die
    Uhr gedrückt wurde, während die Kapsel selbst weiterwanderte. Der
    Character-Controller tastete danach von der alten Stelle aus und fand weder
    Boden noch Wand: Man fiel durch den Boden und sprang aus dem Stand endlos
    weiter, weil er einen immer noch für stehend hielt. `PhysicsWorld.step`
    ruft deshalb `propagateModifiedBodyPositionsToColliders()`, wenn in diesem
    Bild kein Schritt fällig war — dieselbe Zeile, die auch ein Schritt als
    erstes täte. **Die Zeit steht, die Welt ist nicht weg.**
    Gehalten wird sie am **Rand** wie eine Taschenuhr: kein Standardgriff, der
    Mantel des Gehäuses in Greiffarbe, die Kante durch die Faust, das Gehäuse
    daneben in der Handfläche (`STOPWATCH_HAND_POSE` — die Faust der echten
    Hand, und die Uhr in der Brille dort hineingelegt, `RIM_HOLD`/`RIM_TILT`).
    Und das **Zifferblatt schaut zum Kopf** — lange schaute es nach vorn wie
    ein Lauf, und man sah den Zeiger nie.
  - **Taschenlampe**: eine **Stabtaschenlampe** — das Batterierohr _ist_ der
    Griff, in Greiffarbe, ein Stab wie der Stiel des Hammers (`POLE_GRIP`). Es
    liegt **im Griffpunkt**, dort, wo die Hand auch das Gerät hält
    (`holdPosition` null), und ist um **45° nach vorn gekippt**
    (`TORCH_PITCH`): die Faust steht aufrecht, das Licht geht nach vorn. Sie
    ist damit das einzige Werkzeug, das nicht entlang des Zeigestrahls zielt,
    sondern 45° darüber — eine Lampe ist kein Lauf.

    Die **Faust** dazu ist die am Stab in genau dieser Lage
    (`TORCH_HAND_POSE`: dieselben Finger und dieselbe Rolllage wie
    `POLE_HAND_POSE`, um die 45° aufgerichtet — `pitch -75` statt `-120` —,
    gerechnet mit `fistOnGrip`).

    Die beiden Umwege dorthin sind die Enden derselben Strecke. Einmal lag das
    Rohr ganz auf dem **Halterzylinder der Hand** — Achse auf Achse, gehalten
    wie das Gerät selbst — und leuchtete damit 77° an dem vorbei, worauf man
    zeigte, also fast senkrecht nach oben. Einmal lag es ganz auf dem
    **Zeigestrahl** — dann leuchtet sie zwar dorthin, wohin man zeigt, ist aber
    keine Lampe in der Faust mehr, sondern ein Rohr auf der Ziellinie, und die
    gezeichnete Hand lag eine Handbreit über der eigenen. Davor lag das Rohr im
    Griffpunkt ohne Kippung (parallel am Ziel vorbei), und ganz am Anfang war
    sie eine „Lampe mit Griff", das Rohr über der Faust und der Standardgriff
    quer darunter; das sah aus wie ein Megaphon.
    **Trigger** schaltet sie an und aus. Der **Lichtkegel**
    wird mit der _anderen_ Hand eingestellt: vorne an die Linse greifen (der
    Ring leuchtet, sobald die Hand nah genug ist) und mit gedrücktem Griff nach
    **rechts** ziehen macht ihn breit, nach **links** schmal. Genau das, was
    man an einer echten Lampe am Kopf dreht — und in einem dunklen Gang ist
    eine Geste zu finden, ein Menüeintrag nicht. Schmal ist dabei heller und
    reicht weiter, breit wäscht den Raum vor dir und stirbt nach ein paar
    Metern (`flashlightBeam.ts`, mit Jest-Test). Sie leuchtet, sobald sie in
    die Hand kommt, geht auf der Hüfte aus und **bleibt an, wenn man sie
    fallen lässt** — eine liegende Lampe ist die einzige Lichtquelle, die man
    im Dunkeln wiederfindet. Das Licht selbst bleibt immer in der Szene und
    wird nur auf null gedreht: three.js baut jeden Shader im Raum neu, wenn
    sich die _Anzahl_ der Lichter ändert, und ein Schalter ist kein Ruckler
    wert.
  - **Greifhaken**: Trigger schießt den Haken, Halten zieht dich hin; trifft
    er ein Objekt, kommt stattdessen das Objekt.
  - **Gravitationshandschuh**: Trigger zieht das anvisierte Objekt geradewegs
    in die Hand, Greifen stößt es weg. Bleibt in der Hand, bis er am Gürtel
    abgelegt wird.
    Alle drei Handschuhe werden **angezogen** (`Tool.worn`): sie zielen nicht,
    ihre Platte liegt auf dem Handrücken, die Manschette am
    Handgelenk, und ihre Lage im Griff _ist_ die Haltung der Hand, die sie
    trägt — ab Werk die Grundhaltung mit offenen Fingern (`WORN_HAND_POSE`),
    und sie folgen ihr Bild für Bild (`followHand`). Vorher hingen sie im
    Zeigestrahl, also 30° gegen die Hand verdreht und halb in der Handfläche.
    **Sie liegen jetzt wirklich auf der Hand.** `GLOVE_BACK` war die _Mitte_
    einer Platte und ist jetzt die **Haut** des Handrückens (1,7 cm — der
    dickere der beiden Handmodelle, der weiße Handschuh); jede Platte sitzt mit
    ihrer Unterseite darauf statt zur Hälfte darin. Und der **Emitter** liegt
    flach auf dem Handrücken über den Knöcheln, wie der Strahler eines
    Panzerhandschuhs: er stand aufrecht vor den Fingern, mit 4,5 cm Halbmesser
    — ein Reifen, der 7,5 cm über die Hand hinausragte und 3 cm darunter, und
    die ausgestreckten Finger gingen mitten hindurch. Die **Manschette** des
    Supermanhandschuhs lag eine Vierteldrehung falsch: ein waagerechter Teller
    von 9 cm Durchmesser um das Handgelenk, der hinter der Hand in der Luft
    endete; jetzt steht sie quer zum Unterarm und ist quer gedrückt, damit sie
    der Hand folgt (`core/gripFist.test.ts` misst beides nach).
  - **Translationshandschuh**: greift bis 30 m weit — das Objekt kommt dabei
    _nicht_ zu dir. Zwei Modi, `A` schaltet um: **Halten** lässt es genau dort
    stehen, wo es ist (Handdrehung dreht es), **Steuern** macht die Hand zum
    Joystick — Hand nach links, Objekt nach links; Hand nach vorne, Objekt nach
    vorne; je weiter aus der Mitte, desto schneller.
  - **Supermanhandschuh**: **Greifen** hebt dich vom Boden und lässt dich
    schweben, **Greifen** nochmal landet dich. Die Mitte des Handknüppels
    liegt im **Rig-Raum**, nicht im Weltraum: der Rig ist das, was fliegt, und
    eine im Zimmer festgenagelte Mitte war nach ein paar Sekunden Flug zwanzig
    Meter weit weg — der Knüppel stand dann auf Anschlag, egal wo die Hand
    war, und genau so fühlte sich „ich kann mich nicht mehr drehen" an. Mit gezogenem **Trigger** wird
    die Hand zum Flugzeug-Steuerknüppel: In der Ausgangslage (dort, wo die Hand
    beim Drücken war) fliegst du nicht; nach vorne fliegst du in Blickrichtung,
    nach oben steigst du. Zur **Seite** ist kein Seitwärtsschritt, sondern eine
    **Kurve** — die ganze Sicht dreht sich mit, damit man sitzen bleiben kann.
    Dasselbe macht der **Kopf**: schaust du im Flug nach links, ziehst du eine
    Linkskurve, und je schneller du fliegst, desto stärker. Schaust du wieder
    geradeaus, hört die Kurve auf — und „geradeaus“ ist dann die neue Richtung.
    **Volle Lehne ist volle Fahrt**, und was volle Fahrt heißt, steht unter
    _Einstellungen → Supermanhandschuh_: je eine Zahl für vorwärts, rückwärts,
    hoch, runter und quer, dazu Drehrate und Totzone, jede über eine Raste
    weiterschaltbar oder direkt tippbar. Vorher stand da ein fester Faktor pro
    Meter Handlehne, bei dem eine bequeme Bewegung keine drei Meter pro Sekunde
    gab und die Höchstgeschwindigkeit jenseits eines ausgestreckten Arms lag —
    von innen fühlte sich das nach Waten an. Dazu die Frage, die sich in der
    Brille sofort stellt: **wer lenkt welche Achse?** Vor/zurück, hoch/runter
    und links/rechts hängen wahlweise an der **Hand**, am **Kopf**, an beidem
    oder an nichts — Blick nach unten schiebt, Blick nach oben steigt, der vom
    Flugweg weggedrehte Kopf zieht die Kurve. Und wer lieber quer schiebt als
    zu drehen, schaltet die Hand auf _quer schieben_; der Kopf lenkt dann
    weiter (`tools/supermanSettings.ts`, gerechnet in `tools/supermanFlight.ts`,
    beide mit Test).
  - **Lötkolben**: eine **Lötpistole**, seit es nur noch einen Griff gibt —
    Stab über der Faust, Griff quer darunter, Spitze auf dem Zeigestrahl.
    Zwei Punkte antippen und die Objekte hängen zusammen —
    starr oder als Scharnier (Achse = Querachse des Kolbens). Der Modus wird
    mit der anderen Hand umgeschaltet (kleines Panel über ihr), _Trennen_
    löst alle Verbindungen eines Objekts wieder. Solange der Kolben in der
    Hand ist, stößt diese Hand nichts mehr an — man greift durch den Stapel,
    ohne ihn umzuwerfen.
  - **Röntgen-Scanner**: ein Bilderrahmen, den man vors Gesicht hält. Was
    darin liegt, wird durch Wände hindurch gezeichnet — begrenzt durch die
    vier Clipping-Ebenen vom Auge durch die Rahmenecken, deshalb bleibt der
    Effekt im Rahmen.
  - **Handspiegel**: derselbe Rahmen, dieselbe Faust, dasselbe Hochhalten —
    und darin steht diesmal, was **vor** ihm ist statt was hinter den Dingen
    liegt. Dazu eine Rückwand, denn ein Spiegel ist von hinten kein Fenster.
    Man sieht darin sich selbst: den eigenen Kopf, die eigene Hand, das
    Werkzeug in der anderen Faust. Vorher ging das nur, indem man sich zwei
    Portale so hinstellte, dass man sich selbst gegenübersteht. Der Trigger
    schaltet das Glas ab und wieder an, und am Gürtel ist es von selbst aus —
    ein Spiegel ist ein zweiter Durchgang durch die ganze Szene, und den soll
    nicht bezahlen, wer ihn nur mit sich herumträgt. Der große **Standspiegel**
    ist kein Werkzeug, sondern ein Ding aus dem Beutel (siehe unten); wie
    beides gerechnet wird, steht unter _Wie die Spiegel funktionieren_.
  - **Drohne**: ein flaches Gerät wie eine Handheld-Konsole — **zwei Griffe**,
    dazwischen das Display, darüber ein Knopf. Die Drohne selbst schwebt
    draußen im Raum, das Display zeigt ihr Bild, auch vom Boden aus.
    **Beide Griffe** müssen gehalten werden, dann schaltet **einer der beiden
    Trigger** (egal welcher) die Sicht hinaus auf die Drohne; nochmal Trigger,
    eine Hand loslassen oder das Werkzeug ablegen parkt sie. Während des Flugs
    sind Hände, Gürtelwerkzeuge und Handgelenk-Menü **nicht** zu sehen — sie
    fliegen ja nicht mit —, die Maschine selbst dagegen schon, und sie ist
    damit der ruhende Punkt gegen Motion Sickness. Der Knopf über dem Display
    (oder `A`/`X`) öffnet die **Drohnen-Einstellungen**: Flugmodus, **Tempo**
    (m/s) und **Drehrate** (°/s) — beide schalten pro Druck eine Raste weiter
    und zeigen die rohe Zahl daneben —, _Drohne neu setzen_, und ob das
    Herausnehmen eine alte Drohne verschrottet. Aus den zwei Zahlen baut
    `droneTuning()` das ganze Tuning: Steigrate hängt am Tempo, Nick- und
    Rollrate des Jets an der Drehrate (×1,25 bzw. ×2), damit nicht drei Regler
    gegeneinander stehen. Beide Werte liegen im Konfig-Code (hinten angehängt,
    ein alter Code liest sie als Auslieferungswerte).
    Zwei Flugmodi (`droneFlight.ts`, mit Jest-Test), und sie sehen verschieden
    aus:
    **Kopter** ist ein Hubschrauber — linker Stick schiebt sie waagerecht in
    Blickrichtung, rechter Stick dreht links/rechts **die Nase und die Sicht
    mit** und nimmt sie hoch und runter; die Lage bleibt waagerecht. Das Modell
    ist der kleine Quadrokopter, er hängt knapp unter der Blickachse.
    **Jet** ist ein kleines Flugzeug — linker Stick vor/zurück entlang der
    eigenen Nase und quer dazu, rechter Stick ist der Steuerknüppel: rollen und
    nicken um die _eigenen_ Achsen, Sicht samt Horizont kippt mit. Wer im
    Rollen zieht, fliegt eine echte Kurve. Dort **sitzt man im Cockpit**
    (`droneJet.ts`): fünf Meter Maschine mit Nase, Flächen und Leitwerk, und
    das Auge steckt in ihrer Kanzel. Alles darin ist um `JET_EYE` herum
    gebaut, nicht um den Rumpf — was ein Cockpit ausmacht, ist nicht, dass es
    da ist, sondern dass man es **sieht**, und das alte saß gute dreißig
    Zentimeter zu tief und zu weit vorn: technisch vorhanden, im Headset
    komplett unter dem Blickfeld. Jetzt liegt die Bordwand eine Handbreit
    unter dem Auge, das Instrumentenbrett schließt oben fast an den Horizont
    an, und es gibt **richtige Scheiben** statt einer Glasblase — Front, zwei
    Seiten und ein Dach, jede mit sichtbarem Rahmen. Der Rahmen ist der
    eigentliche Trick: Glas allein sieht man nicht, und was man nicht sieht,
    kann den Horizont auch nicht halten. Vorne bleibt frei (ein Rohr quer
    durchs Blickfeld ist im Headset kein Rahmen, sondern ein Balken), der
    Bügel steht hinter dem Kopf. Zwischen den Knien steht ein
    **Steuerknüppel**, der mit dem rechten Stick mitgeht — ein Cockpit, in dem
    sich nichts bewegt, ist eine Kulisse. Der Nachbrenner geht mit dem Schub
    an. Das Cockpit ist um einen _Menschen_
    gebaut, die Maschine richtet sich danach; sie wird deshalb weiter weg
    gesetzt als der Kopter und hält mehr Abstand zum Boden.
    Beim Parken richtet sie sich wieder waagerecht aus. Der Kopf bleibt in
    beiden Modi frei.
  - **Hirn**: ein Gehirn auf einem Halterzylinder, und das einzige Werkzeug,
    das nicht selbst etwas tut, sondern **jemanden hinstellt, der etwas tut**.
    Der Knopf hinten am Hirn (oder `A`/`X`) öffnet sein Panel — dieselbe
    Mechanik wie bei Drohne und Stoppuhr —, und dort stehen die zwei Hälften
    eines NPC **einzeln**: die **Haut** (Zombie, Übungspuppe, Hamster) und das **Hirn**
    (Stehen, Schlendern, Verfolgen), dazu Tempo, Leben und die zwei Zahlen
    eines Brutkäfigs. Was der **Trigger** setzt, sagt die Zeile _Setzen_: einen
    NPC, einen Spawnpunkt, einen Brutkäfig — oder er nimmt weg, worauf man
    zeigt. Ein **Kreis am Boden** sagt vorher, wohin es geht und ob es geht,
    wie beim Teleporter. Alles Weitere unter _Wer hier herumläuft_
    (`tools/BrainTool.ts`).
  - **Messband**: Trigger setzt Punkt 1, Trigger setzt Punkt 2, der Abstand
    bleibt im Raum stehen. Nimmt man das Band wieder in die Hand, ist die
    letzte Messung wieder da.
  - **Hängegleiter**: ein Drachen, unter dem man hängt — das erste Werkzeug,
    das ein Fahrzeug ist. Vom Gürtel genommen trägt man ihn auf den Schultern;
    **Trigger** (oder `A`) ist der Anlauf, oder man läuft einfach über eine
    Kante, und ab da trägt der Flügel. Gehalten wird die **Querstange** des
    Steuerbügels, mit einer Hand oder mit beiden (die zweite greift ans andere
    Ende und ist dann beansprucht, `claimsHand`). Die Stange hat **zwei Griffe
    mit fester Lage**, einen an jedem Ende, und in der Faust liegt sie quer wie
    ein Lenker (`BAR_GRIP`, `GLIDER_HAND_POSE` — von oben gehalten, Daumen zur
    Mitte). Sie ist die ganze Steuerung: **ziehen** heißt Nase runter und
    schneller, **drücken** Nase hoch und langsamer — und unter der Abrissfahrt
    trägt nichts mehr —, **kippen** legt den Flügel in die Kurve, und zwar auf
    die Seite, die dabei nach unten geht: rechte Hand tiefer, Kurve nach
    rechts; mit einer Hand kippt das Handgelenk (`barTilt`, `wristTilt`). Eine
    Weile hing am Bügel der Standardgriff senkrecht unter einem Rohr, und
    gelenkt wurde, indem man das Rohr seitlich vor dem Kopf verschob — das
    fühlte sich an wie ein Pistolengriff, der zufällig an einem Drachen hängt.
    Der Körper dreht sich mit der Bahn: wer eine Kurve
    fliegt, schaut hinterher dorthin, wohin er fliegt. Berührt die Kapsel
    wieder Boden, ist gelandet — mit dem Schwung, der noch da war.
    **Am Boden ist er ein Gegenstand wie jeder andere**: gehalten, solange die
    Hand zu ist, und losgelassen fällt er hin, liegt als gepacktes Bündel im
    Raum und wächst auf seiner Hüfte nach. Er war lange `sticky` — einmal
    nehmen, an der Hüfte wieder abgeben —, und das war die eine Stelle, an der
    ein Werkzeug sich anders benahm als alles daneben: man ließ los, und nichts
    geschah. **In der Luft gilt es nicht**: dort hängt man im Gerät, und eine
    Hand, die zwischendurch aufgeht, wirft niemanden aus zweihundert Metern
    Höhe. `GlideTool.update` setzt `sticky` deshalb Bild für Bild auf „fliegt
    gerade" — und wer beim Landen die Hand schon offen hatte, legt ihn im
    selben Augenblick hin.
    Das Segel hängt beim Fliegen **im Raum** und nicht an der Hand
    (`GlideTool`): jedes Bild wird es an die Fäuste gestellt, die Stange darin,
    das Segel darüber, gekippt und geneigt, wie der Flug es sagt. Ein zehn
    Meter breites Segel, das jedem Zucken des Handgelenks folgt, wäre kein
    Gleiter, sondern ein Fächer; in der Faust bleibt nur ein Stück Stange mit
    Griff. Solange man fliegt, steht dazu eine **Geisterstange** im Raum: die
    Ruhelage des Bügels, waagerecht, `BAR_NEUTRAL` vor dem Kopf, auf der Höhe
    der Hände — man sieht an ihr, wie weit man gezogen, gedrückt und gekippt
    hat. Am
    Gürtel ist er ein gepacktes Bündel, wie ein echter Drachen auch. Die
    Rechnung — ein Punkt mit einem Flügel dran, Auftrieb quer zur Bahn,
    Widerstand entlang, beides mit dem Quadrat der Fahrt — steht in
    `tools/glideFlight.ts` mit Test; die Zahlen sind auf Gefühl abgestimmt
    (Trimmfahrt 11 m/s, Gleitzahl 10), nicht auf ein Lehrbuch. Beide
    Fluggeräte fragen die Welt zwei Dinge, die vorher niemand fragte:
    `ToolHost.onGround()` und `playerVelocity()`.
  - **Flügel**: zwei Schwingen an den Armen, und die Arme sind die Steuerung.
    **Schlagen** — beide Hände zügig nach unten, gemessen im Raum des Rigs —
    gibt Schub schräg nach vorn und oben, vom Boden aus auch den Start; der
    Aufwärtsschlag ist das Ausholen und umsonst, und nur der gemeinsame Schlag
    zählt (die langsamere Hand). **Ausgebreitet** tragen sie, **angelegt** ist
    ein Sturzflug: wie weit die Hände auseinander sind, ist, wie viel Flügel
    da ist. Eine Hand **tiefer** als die andere kippt in die Kurve zu dieser
    Seite, beide Hände **nach vorn** heißt Nase runter, nach hinten Nase hoch.
    Steiler als der Hängegleiter (Gleitzahl 6) und wendiger — und das eine
    Gerät, mit dem man wieder **hoch**kommt, solange die Arme durchhalten. Der
    andere Arm ist beansprucht, solange man sie trägt: er ist ja ein Flügel.
    Gezeichnet werden sie im Raum, jedes Bild neu von der Schulter zur Hand
    und ein gutes Stück darüber hinaus (`WingsTool`). Am Gürtel sind sie ein
    zusammengelegtes Bündel Federn.
  - **Boxhand**: die Hand selbst, als Werkzeug. Sie sieht aus wie die
    gezeichnete Hand mit Controllern, liegt genau dort, wo diese liegt, und
    **zielt nicht** — eine Hand sitzt in der Faust und schießt nirgendwohin.
    Damit ist ihre Lage im Griff dieselbe Zahlenreihe, mit der `HandVisuals`
    die Hand zeichnet: legt man sie im Schießgang in den Halter und misst sie
    ein wie eine Pistole, landet das Ergebnis in der **Grundhaltung** dieser
    Hand und nicht im Werkzeug-Speicher (`tools/HandTool.ts`). Zu holen ist sie
    dort, wo man sie braucht: aus dem Werkzeug-Menü an der Wand des Gangs. Sie ersetzt den
    das alte Justier-Werkzeug und den Tisch mit der Geisterhand: ein Weg statt
    dreier, und der, den man ohnehin kennt.
  - **Controller links / Controller rechts**: das echte Gerät als Werkzeug,
    eines je Hand (`tools/ControllerTool.ts`). Gezeigt wird das Modell aus dem
    Repository (siehe _Controller-Modelle_), bis es geladen ist der selbst
    gebaute. Auch sie zielen nicht. Die Hand daran ist die **Faust um den
    Handgriff** des Geräts (`CONTROLLER_HAND_POSE`, gerechnet wie jede andere
    Faust): der Handgriff liegt im Griffraum **entlang der Z-Achse** — aus dem
    Modell des Herstellers abgelesen, `core/controllerGrip.ts` —, der Kopf mit
    Stick und Tasten am -Z-Ende, der Trigger darunter; der Daumen liegt am
    Kopf, der Handrücken zeigt nach außen, der Zeigefinger zum Trigger. Vorher
    trug die Hand hier die gemessene Grundhaltung als Faust, und die stand 74°
    quer zum Handgriff — der Controller lag „absolut falsch in der Hand". Der
    selbst gebaute Controller ist dabei gleich mit umgebaut worden: sein
    Handgriff zeigte nach unten statt nach hinten. Der Sinn ist
    die Frage, die alles andere
    erklärt: **wo sitzt das Gerät eigentlich in meiner Faust?** Der Griffraum,
    den die Brille meldet, ist weder der Controller noch die Hand, sondern ein
    Punkt dazwischen — und gegen ihn wird jeder Versatz gemessen. Ab Werk
    liegen sie genau darin, denn die Profile sind so gezeichnet; was man
    einmisst, ist die Abweichung. Auf der Werkzeugseite steht der linke
    Controller in der linken Hand und der rechte in der rechten — das eine
    Werkzeug, das es je Hand gibt.
  - **Duplizier-Waffe**: anzielen, Trigger — und daneben steht dasselbe noch
    einmal: Form, Farbe, Material, Größe und Masse. Der Rahmen um das Ziel
    gehört dazu, in einem Stapel verdoppelt man sonst regelmäßig die falsche
    Kiste. Was aus dem Beutel kam, kennt seine Sorte und wird auch bei den
    Mitspielern gebaut; was eine Welt selbst gebaut hat (Zielscheibe,
    Hütchen), kann die Gegenseite nicht nachbauen — solche Kopien bleiben
    bewusst lokal, statt drüben als Loch zu erscheinen.
  - **Inspektor**: anzielen, und das Display sagt Masse, Maße, Tempo,
    Drehung, Höhe, Reibung, Rückprall, Material, Collider-Form, geteilte Id
    und ob das Ding schläft, getragen wird oder fliegt. Er liegt in der Hand
    **wie eine Waffe**, ohne Zusatzneigung: er lag eine Weile 23° nach vorn
    gekippt darin, damit das Display zum Gesicht zeigt, und rollte damit so
    weit über die Faust, dass er nicht mehr aussah wie etwas, das man hält,
    sondern wie etwas, das aus der Hand fällt. Das Display steht
    **aufrecht** auf dem Gehäuse — geneigt wird weder das eine noch das
    andere. Es lag zweimal geneigt darauf (0,45 rad, dann 45° nach hinten),
    beide Male mit der Rechnung, die ablesende Hand zeige nach vorn unten und
    die Neigung nehme das heraus; sie nimmt es aber nur bei genau dieser einen
    Handhaltung heraus und legt es überall sonst dazu — in der Hand, die
    geradeaus zeigt, hing der Schirm um 45° nach vorn gebeugt und man las ihn
    von der Kante. Wie schräg die Hand steht, ist Sache der Hand. Er
    verändert
    **nichts** — genau deshalb kann man ihn in einen wackeligen Stapel
    halten, ohne ihn umzuwerfen. Wenn eine Kiste anders fällt als erwartet,
    ist die Frage nie „wie sieht sie aus", sondern „was steht in ihr drin".
  - **Karte**: ein Blatt in der Hand mit der Umgebung von oben — Norden oben,
    ein Pfeil in der Mitte für einen selbst, ein Punkt je Mitspieler, Trigger
    zoomt. Sie zeigt nirgendwohin und zielt deshalb auch nicht; gezeichnet
    wird aus dem Kachelgitter der Welt. Ausführlich in _Die Karte in der Hand_.
  - **Teleporter**: hinzeigen, Kreis ansehen, Trigger — und dort stehen. Der
    Stick trägt einen über eine Fläche, die bis zum Horizont geht, und das ist
    eine Wanderung; die Portalwaffe kann es besser, verlangt dafür aber zwei
    Schüsse und eine Wand, die Portale hält. Gezielt wird wie mit ihr, entlang
    der Zielachse, dreißig Meter weit. **Ein Kreis auf der Fläche** sagt, wo man
    landet: grün heißt, es geht; **rot** heißt, zu steil — dieselbe Grenze, die
    auch beim Gehen gilt (`MAX_SLOPE_DEG`), denn worauf man nicht hinaufkommt,
    bleibt man auch nicht stehen; **kein Kreis** heißt, dort ist nichts. Die
    **Blickrichtung bleibt**, wie sie war — wer sich beim Teleportieren auch
    noch gedreht vorfindet, muss sich hinterher erst wieder zurechtfinden, und
    genau das macht die Übelkeit, die ein Teleporter vermeiden soll. Im Kart
    oder hinter einer Drohne geht er nicht: da gehört der Körper gerade jemand
    anderem (`tools/TeleportTool.ts`).
  - **Radiergummi**: löscht Objekte — für alle in der Sitzung.
  - **Magischer Beutel**: die Rasterseite des Handgelenk-Menüs als Gegenstand
    (`tools/MagicBagTool.ts`). Gehalten wird er **von außen am Saum**, wie ein
    Eimer am Rand: er hängt vor der Hand, sein Saum läuft durch den
    Griffpunkt, die Handfläche liegt außen daran und die Finger greifen über
    den Saum hinein (`BAG_GRIP`, `BAG_HAND_POSE` — ohne Zielkorrektur
    gerechnet, denn er zielt nicht). Am Gürtel hängt ein zugezogener Lederbeutel; in
    der Hand geht er auf, und in der Öffnung liegt ein **Raster** aus
    Miniaturen — jede das Ding selbst, mit `createPropShape` gebaut und auf
    Fachgröße gerechnet, keine Strichzeichnung. Die freie Hand sucht sich eines
    aus, und dafür gibt es **zwei Wege**: sie fährt hinein, oder sie **zeigt**
    aus dem Sessel darauf — die Ziellinie trifft die Rasterebene, und das Fach
    darunter ist gemeint (`tools/bagGrid.ts`, `cellAtRay`). Der Finger hat
    dabei Vorrang, wenn er wirklich in der Öffnung steht. Das gemeinte Fach
    leuchtet, ein Stups meldet es, am Saum
    steht der Name, und **Greifen** holt das Ding in Originalgröße
    genau dorthin, wo die Hand ist — bei allen in der Sitzung
    (`ToolHost.conjureProp`, derselbe Weg wie aus dem Menü). Der Strahl kam
    dazu, weil der Finger die Hand jedes Mal bis in den Beutel führt: richtig,
    solange man ihn vor sich hält, mühsam, sobald er nur in der Hand hängt.
    Der Vorrat liegt auf **Seiten**: sechs Fächer, links und rechts ein Pfeil,
    davor ein Punkt je Seite. Geblättert wird auf **drei** Arten, im Kreis —
    hinter der letzten Seite kommt wieder die erste (`bagGrid.ts`, `turnPage`):
    ein Pfeil wird angesteuert wie ein Fach und mit **Greifen** genommen, oder
    mit dem **Trigger** derselben Hand (ein Pfeil ist ein Knopf, und auf einen
    Knopf zeigt man); und der **Trigger der Hand, die den Beutel hält**,
    blättert ganz ohne die andere eine Seite weiter (`MagicBagTool.onTrigger`).
    Die dritte Art ist die, die man am Ende nimmt: die Pfeile setzen eine freie
    zweite Hand voraus, und die ist oft nicht frei. Am Saum steht dabei, wohin
    ein angesteuerter Pfeil führt.
    Ein **Fach** bleibt beim Greifen: der Trigger holte sonst ein Ding heraus,
    sobald der Strahl der anderen Hand über den Beutel streift.
    Alle siebzehn Sorten auf einmal hieß siebzehn Fächer von
    zweieinhalb Zentimetern, dicht an dicht in einer Öffnung von einer
    Handbreite — daneben zu greifen war der Normalfall. Sechs große Fächer
    trifft man.
    Das **Schild** steht dabei auf dem Saum, und zwar an dessen **höchster
    Stelle** (`placeLabel`) — oben, über allem, was darin liegt. Der Weg dorthin
    ging über zwei Fassungen: erst hing es zwei Handbreit senkrecht über der
    Mitte und stand damit genau in dem Blick, mit dem man in den Beutel schaut;
    dann stand es am Saum **gegenüber dem Kopf**, hinter dem Raster statt
    darüber, und beides war auf einmal zu lesen. Nur ist „gegenüber dem Kopf"
    eine Stelle, die wandert, sobald man den Kopf dreht — das Schild rutschte um
    den Saum herum, und bei einem gekippten Beutel landete es unten am tiefsten
    Punkt. Der höchste Punkt wandert nicht: er hängt nur daran, wie der Beutel
    gehalten wird. Gerechnet wird er ohne Suche — die Welt-Hochachse in den Raum
    des Beutels gedreht, ihr waagerechter Anteil normiert, und dorthin zeigt der
    Halbmesser, der am weitesten nach oben führt. Steht der Beutel aufrecht, hat
    der Saum keine höchste Stelle; dann gilt weiter das alte Gegenüber zum Kopf.
    Eines daran sieht wie ein Versehen aus und ist Absicht: Er **zielt nicht**
    (`alignToAim = false`) —
    er sitzt in der Faust wie ein Handschuh und nicht auf dem Zeigestrahl wie
    eine Waffe —, und sonst bewegt er sich wie **jedes andere Werkzeug**: er
    steckt im Griff und macht mit, was die Hand tut, Gieren, Nicken _und_
    Rollen. Zwei Runden lang hing er stattdessen **aufrecht im Raum**: eine
    eigene Rechnung (`hangUpright`) nahm der Hand erst das Nicken und das
    Rollen weg, dann nur noch das Rollen, damit die Öffnung oben bleibt und das
    Raster nicht ausgeschüttet wird. Das las sich vernünftig und fühlte sich
    falsch an — ein Ding in der Hand, das einer Drehung des Handgelenks nicht
    folgt, ist keines, das man hält, sondern eines, das an einem klebt; und
    weil das Raster an seiner Drehung hängt, kippte es dabei gegen die Finger,
    die hineingreifen. Wer ihn ausschütten will, darf ihn jetzt ausschütten.
    (Die Rechnung hatte nebenbei zwei Vorzeichenfallen: `hangUpright` nahm die
    Gierachse einmal mit `atan2(x, z)` statt `atan2(-x, -z)` und hängte den
    Beutel damit um 180° gedreht **hinter** die Hand — auf der Werkzeugseite
    unsichtbar, denn dort lief sie nie. Solches Zeug fällt mit ihr weg.)
    Und die greifende Hand gehört
    ihm, solange sie auf ein Fach oder einen Pfeil zeigt (`claimsHand`) —
    sonst risse derselbe Griff die Kiste hinter dem Beutel an sich, und in
    einem vollen Labor steht immer eine Kiste dahinter.
    Warum beides, Seite _und_ Werkzeug: Ein Menü ist ein Ort, an den man geht;
    ein Beutel ist etwas, das man dabeihat. Wer eine Reihe Dominosteine
    aufstellt, greift zwanzigmal hinein, ohne dazwischen zwanzigmal ein Panel
    zu öffnen.
- **Alles einstellbar, alles kopierbar**: Werkzeug-Posen, Handhaltungen,
  Anbauteile und die Waffenwerte liegen zusammen in einem **Konfig-Code** —
  einer Zeile, die kopiert, vorgelesen und wieder eingegeben werden kann
  (_Einstellungen → Konfig-Code_). Eine **Tastatur im Raum** nimmt rohe Zahlen
  und ganze Codes entgegen.
- **Handhaltung**: wie die leere Hand aussieht und wie sie ein **Objekt**
  hält, steht unter
  _Einstellungen → Hände_; wie sie ein **Werkzeug** greift, steht beim
  Werkzeug selbst (_Werkzeuge → … → Griff_, mit dem Trigger hinein). Zwölf
  Zahlen pro Haltung (Versatz, Neigung, fünf
  Finger, Spreizung), und ein Knopf spiegelt alles auf die andere Hand. Die
  Objekthaltung liegt unter derselben Mechanik wie ein Werkzeug (Pseudo-Id
  `grab`), wird also genauso getippt, gespiegelt und im Konfig-Code
  mitgeschleppt — und sie wird tatsächlich angewandt, sobald eine Hand etwas
  trägt.
- **Werkzeug-Einstellungen hängen am Werkzeug.** Vorher stand unter
  _Einstellungen_ eine Seite „Pistole" und eine Seite „Supermanhandschuh",
  während daneben das Werkzeugregal eine zweite Liste derselben Werkzeuge war:
  wer die Feuerrate ändern wollte, ging woandershin als dorthin, wo die
  Pistole liegt. Jetzt trägt jede Regalzeile ihre eigenen Werte hinter dem
  Pfeil — die eigenen Werte, wo es welche gibt, der Griff für beide Hände und
  ein Zurücksetzen der Lage in der Hand, das nur dieses eine Werkzeug betrifft
  (`clearPose`).
- **Sitzen oder stehen**: das Einzige, was eine Brille nicht selbst weiß. Sie
  meldet den Kopf über dem Zimmerboden und hat keine Ahnung, ob darunter ein
  Stuhl steht — ein sitzender Spieler ist für jede Welt schlicht ein sehr
  kleiner, und Küchentresen, Kartsitz und Horizont gehören plötzlich jemand
  Größerem. Gefragt wird einmal auf der Startseite, umgestellt wird unter
  _Menü → Bewegung → Haltung_: „Sitzend" hebt die Sicht auf Stehhöhe an und
  lässt die Füße stehen — dieselbe Mechanik wie das Ducken, nur andersherum.

  **Wie hoch die beiden sind, weiß auch niemand von allein.** Der Ausgleich
  hing lange an einer einzigen getippten Zahl — 1,65 m Augenhöhe im Stehen,
  für alle. Wer kleiner ist, sitzt danach zu hoch; wer größer ist, zu tief,
  und man merkt es nicht am Horizont, sondern an der eigenen Hand: ein
  Justierstand auf Ellbogenhöhe steht dann irgendwo anders, weil der Boden
  unter dem Spieler um die Differenz falsch liegt. Also
  sind es **zwei eigene Zahlen**, stehend und sitzend, in Zentimetern und
  beide **messbar**: unter _Menü → Bewegung → Augenhöhe_ (und an der Wand im
  Eingaberaum) hinstellen bzw. hinsetzen, _Jetzt messen_ drücken, und die
  Brille schreibt ihre eigene Zahl hinein. Die Anhebung ist danach die
  Differenz der beiden und nicht mehr der Abstand zu einer _gerade gemessenen_
  Kopfhöhe — Vorbeugen im Sessel hob vorher die halbe Welt mit an
  (`core/posture.ts`, mit Test).

- **Portal Labor** (experimentell): Physik-Sandkasten mit den Portal-Waffen am
  Gürtel (blau links, rot rechts, aber jede Hand darf jede nehmen),
  Schwerkraft, Sprung, Companion Cubes und einer Reihe Dominosteine. Portale
  gehen auch auf Boden und Decke — samt Sturz und Schwung beim Herausfliegen.
  Hände, Waffen und Objekte werden an der Portalebene geschnitten und kommen
  auf der anderen Seite wieder heraus: Du kannst die Hand durch ein Portal
  stecken und sie drüben sehen — und damit auch dort etwas anstoßen.
- **Eigener Körper**: Torso, Arme und Beine gibt es, sie werden aber nur in
  Portalsichten gezeichnet — und, solange die Sicht mit einer Drohne draußen
  ist, auch für den eigenen Blick zurück. Der zurückgelassene Körper wird
  dabei über den **ganzen Rahmen** festgehalten, in dem er stand
  (`PlayerAvatar.leaveBehind`), nicht über eine Kopfpose im mitfliegenden
  Rig-Raum: das Skelett rechnet mit dem Boden auf y = 0, und ein Rig, das zehn
  Meter steigt und sich dreht, zog Beine, Hals und Torso jedes Mal lang. Direkt sieht man nur die eigenen Hände — und sich
  selbst, wenn man durch ein Portal schaut. Die anderen Spieler bekommen
  denselben Körper, samt Namensschild und der Waffe in ihrer Hand.
- **Schießstand** (experimentell): überdachte Schießlinie mit fünf Bahnen —
  gebaut auf dem **Kachelgitter** (`range/rangeStand.ts`), und die Schießbank
  ist dort der Baustein, der sie in Wirklichkeit ist: dieselbe **Küchenzeile**
  wie im Dunkelhaus, dieselbe Arbeitshöhe. Wer einmal nachgerechnet hat, dass
  eine Arbeitsplatte auf 90 cm liegt, hat es für beide Welten nachgerechnet.
  Zielscheiben auf 10, 25 und 50 m, zwei großen auf 75 und 100 m sowie einer
  Reihe Stahlplatten auf 18 m. Die Scheiben hängen an Scharnieren und schwingen
  beim Treffer zurück. Am Gürtel hängt hier die Pistole. Gedacht zum
  Ausprobieren der Waffeneinstellungen. **Jeder Treffer zählt**: die Scheibe
  nach dem Ring (10 bis 2), die Stahlplatte pauschal. Die Zahl erscheint
  **knapp über der Visierlinie** — nicht an der Scheibe, dort wäre sie auf
  hundert Meter unlesbar, und auch nicht mehr weit oben: fünf Zeilen stapeln
  sich nach _oben_, die oberste stand damit auf 30° über dem Auge und war nur
  mit zurückgelegtem Kopf zu finden — und ein kurzer Ton steigt mit ihr auf, je besser der
  Treffer, desto höher. Beides direkt beim Schützen, ohne Laufzeit und ohne
  Entfernung, und beides an zwei Tafeln auf der Schießlinie abschaltbar
  (anschießen oder Trigger).
- **Gokart** (experimentell): eine Strecke aus **Streckenteilen** auf dem
  Kachelgitter — vier Geraden und vier Kurven mit vier verschiedenen Radien
  (`kart/kartCourse.ts`) — und daneben eine **Boxengasse** mit vier Buchten
  unter einem Dach, in denen die Karts stehen (`kart/kartPit.ts`). Jedes hat
  seinen eigenen Charakter und sein eigenes **Klemmbrett**. Lenkrad greifen
  setzt dich hinein, rechter Trigger ist Gas, linker die Bremse, der linke
  Stick lenkt — oder das Lenkrad selbst, wenn die erste Zeile des Klemmbretts
  das sagt. Losfahren heißt: aus der Box nach rechts auf die Gerade ziehen; eine
  Ein- und Ausfahrt gibt es nicht, weil Gasse und Strecke kachelbündig
  aneinander stoßen. Der **Kopf zieht der Lenkung nach**, statt an ihr
  festzuhängen — das ist die Zeile gegen die Übelkeit, und wie weit, steht auf
  dem Klemmbrett. Aussteigen steht die ganze Zeit auf einem Schild über dem
  Lenkrad. Rundenzeiten stehen an der Strecke.
- **Pizzeria** (experimentell): Küche, Thresen, Gastraum. Teig aus der Kiste auf
  den Arbeitstisch legen und mit der **Faust** flach kneten, mit der roten
  **Kelle** Soße verteilen, **Käse** darüber streuen, ab in den **Ofen** und
  fertig auf einen Gästetisch. Der **Mülleimer** löscht, was schiefging. An der
  Wand hinter jeder Station steht, was sie will.
- **Eingaberaum** (experimentell): eine Kammer, deren einziger Zweck es ist zu
  zeigen, was die Hände tun. Alles, was man hier abliest, hängt auf **einer
  Tafelwand gut zwei Meter vor dem Spieler** (`tune/inputPanel.ts`, mit Test):
  Name des Raums, die Aufnahme, die beiden Controller-Modelle und je Hand eine
  Tafel darunter. Vorher hing es an der **Vorderwand**, vier Meter weg, und
  beides ging dabei schief: eine Tafel wird nicht dadurch lesbar, dass sie
  größer wird (die Schrift wächst mit, die Entfernung bleibt — die Lage-Tafel
  kam auf ein halbes Grad Schrifthöhe, und ihre letzte Zeile fiel ganz weg),
  und die Modelle hingen auf halbem Weg dorthin, also aus Spielersicht genau
  auf den Zahlen dahinter. Auf einer Fläche steht nichts mehr **vor** etwas
  anderem, nur noch daneben, und das rechnet der Test nach: kein Rechteck
  schneidet ein anderes, und alles zusammen bleibt in einem Blickfeld, für das
  man den Kopf nicht dreht. Die Tafeln sind dabei **kleiner** geworden und die
  Schrift doppelt so groß.

  Zwei **Controller-Modelle** schweben auf
  Augenhöhe, drehen sich mit den echten mit, jeder Knopf leuchtet beim Drücken
  auf, Stick und Trigger bewegen sich wirklich. Gezeigt wird dabei das **echte
  Modell** des Geräts, das gerade in der Hand liegt (siehe
  _Controller-Modelle_); der selbst gebaute aus Kästen und Zylindern bleibt der
  Rückfall. Mit **bloßen Händen** treten
  sie beiseite und es stehen fünf Balken da — wie weit jeder Finger an der
  Handfläche liegt — plus zwei Lampen für das, was daraus wurde. An der Wand
  steht dasselbe in Worten.

  Daneben hängt je Hand der **Zug an Trigger und Griff** als zwei Balken
  (`tune/PullGauge.ts`), mit einer Marke bei der Hälfte und einer ganz oben.
  Das sind die einzigen zwei Eingaben eines Quest-Controllers, die nicht nur an
  oder aus sind: Das Gamepad meldet für beide einen Wert zwischen 0 und 1, und
  WebXR sagt **getrennt davon**, ab wann die Laufzeitumgebung das ein „Drücken"
  nennt. Beides ging vorher verloren — ein Leuchtpunkt kennt zwei Zustände, und
  ein halb gezogener Trigger sah aus wie ein gar nicht gezogener, bis er
  umsprang. Jetzt ist der **Balken** der Zug, der **Farbumschlag** das Drücken,
  und auf der Tafel steht die Zahl dazu (`Trigger 65 %`, auf fünf Prozent
  gerundet, weil jede Änderung dieser Zeile eine neue Leinwand kostet). Wer
  wissen will, ob sein Trigger wirklich bis zum Anschlag geht oder ob der
  Auslösepunkt zu früh liegt, sieht hier beides gleichzeitig. Die Balken hängen
  an der Tafelwand und nicht am Modell: Das dreht sich mit der Hand mit, und
  eine Füllstandsanzeige darauf stünde die halbe Zeit auf dem Kopf.

  Und darunter je Hand **eine** Tafel: was gedrückt ist, und die **Lage des
  Geräts als Zahl**, in **zwei Räumen**, denn genau dazwischen liegt die
  Verwirrung (es waren einmal zwei Tafeln übereinander mit ausgeschriebenen
  Zeilen — zusammen zu viel Fläche und trotzdem zu kleine Schrift; die Zeilen
  kürzen sich zu `Strahl YXZ  Y -12°  P 34°  R -5°`):

  - **Zeigestrahl**, gelesen als Euler `YXZ` — die Reihenfolge, in der ein
    Flugzeug oder eine Kamera geführt wird: erst gieren, dann nicken, dann
    rollen. Darin heißt „geradeaus gezielt" **Pitch 0**, und ein Rollen um die
    Zeigeachse ändert **nur** den Roll. Das ist die Zeile, die man liest.
  - **Griffraum**, gelesen als Euler `XYZ` — die Schreibweise jeder
    `HandPose`. Das ist die Zeile, die man weitersagt.
  - **Griff → Strahl**: wie weit der Strahl gegen den Griff steht, wie das
    Gerät selbst es meldet — und in Klammern daneben, was im Code dafür steht
    (`GRIP_TO_RAY`). Nur nebeneinander sind die beiden eine Auskunft: eine
    gemessene Zahl allein sagt nicht, ob sie neu ist. Stehen sie auseinander,
    ist die gemessene die richtige.

  Dass die ersten beiden so weit auseinanderliegen, ist der Punkt: der
  Handgriff eines Quest-Controllers steht schräg zu seinem Strahl, und wer
  geradeaus zielt, hat im Griffraum deshalb einen kräftigen Pitch stehen — die
  gemeldeten **45°** waren keine Fehlmessung, sondern das Gerät. Und weil die
  Räume gegeneinander verdreht sind, verteilt sich ein Rollen um den Strahl im
  Griffraum auf **Yaw und Roll zugleich**; auch das ist kein Fehler, sondern
  eine Drehung, die dort um keine einzelne Achse geht.

  Eine **getrackte Hand** hat weder Griff noch Gerät; dort tritt das
  **Handgelenk** an die Stelle des Griffs. Vorher stand für sie gar nichts da,
  weil `hand.quaternion` die Ruhe ist — die Gelenke tragen die Drehung, nicht
  die Gruppe darum. Neu gezeichnet wird höchstens fünfmal je Sekunde: eine
  Zahl, die sich mit jedem Bild um ein Grad ändert, ist ein Flackern, und jedes
  Neuzeichnen malt eine Leinwand neu.

  **Und dazu die Achsen selbst**, denn eine Zahl ohne Achse ist keine Auskunft
  (`core/axesCross.ts`). Ein Kreuz steht auf dem **Boden** zwischen einem
  selbst und der Tafelwand — es stand eine Weile auf Brusthöhe mitten im Blick
  auf die Tafeln und genau dort, wo man die Hände hält — und je eines an jedem
  Controller-Modell, sodass man beide nebeneinander sieht und daran, wie schräg
  der Raum des Geräts im Zimmer steht. Die Farben sind die üblichen — **X rot,
  Y grün, Z blau**, wie in three.js und Blender —, und dazu kommt der vierte
  Pfeil, um den es eigentlich geht: **-Z in Weiß**. Vorne ist überall in diesem
  Spiel das *negative* Z; ein Kreuz, das nur +Z zeigt, zeigt genau dorthin, wo
  nichts ist. Die Legende an der Wand schreibt es aus.

  **Greifen friert die Lage ein**, ein zweites Greifen gibt sie wieder frei —
  außer während einer Aufnahme, dann setzt derselbe Knopf eine Marke.
  Der Stick bewegt in diesem Raum nichts, man steht also ohnehin still; was
  fehlte, war ein Weg, eine Zahl festzuhalten, ohne sie im selben Moment durch
  das Hinsehen zu verändern. Eingefroren steht die Tafel bernsteinfarben da,
  und neben das Modell stellt sich, was diese Lage **bedeutet**: die
  **Boxhand** in der Faust um den **Handgriff des Geräts** — derselbe rote
  Zylinder wie auf der Werkzeugseite unter _Hand in echt_
  (`core/controllerHandle.ts`, eine Geometrie für beide Stellen) und dieselbe
  gerechnete Faust (`CONTROLLER_HAND_POSE`). Man liest die Zahl also nicht
  nur, man sieht auch, was das Spiel daraus macht. Gebaut und nicht
  gespeichert: dort soll stehen, was aus der Lage **folgt**, nicht, was jemand
  vorhin eingestellt hat.

  **Die Aufnahme** steht oben auf der Tafelwand, und der Knopf daneben startet
  und beendet sie. Sie misst, **wie stark die Hand beschleunigt** — die eine
  Größe, zu der niemand ein Gefühl hat: ein Meter je Sekunde ist ein Schritt,
  aber „40 m/s²" sagt nichts, bis man es einmal neben der eigenen Bewegung
  gesehen hat. Genau solche Zahlen stehen aber in den Schwellen des Spiels (der
  Schlag des Hammers, das Tempo eines Wurfs, das Schütteln der Sektflasche), und
  bisher hieß Einstellen: probieren, bis etwas passiert. Die Tafel zeigt die
  laufende Zeit, den **Höchstwert** samt Hand und Zeitpunkt und den aktuellen
  Wert, in m/s² **und in g** — ein g kennt man.

  Während sie läuft, setzt **Greifen** eine **Marke**: der Wert genau in dem
  Moment, in dem man drückt, mit laufender Nummer und Zeit; die letzten drei
  stehen auf der Tafel, die jüngste oben. Ohne sie misst man einen Wurf und
  liest hinterher den Höchstwert des Abbremsens ab. Solange aufgenommen wird,
  gehört der Griffknopf deshalb der Marke und friert **nichts** ein — zwei
  Bedeutungen zugleich hat er nicht. Gemessen wird aus den Positionen der Hand,
  also zweimal abgeleitet und beide Male geglättet
  (`tune/accelRecord.ts`, mit Test); gefüttert wird **jedes** Bild, auch wenn
  die Tafel nur fünfmal je Sekunde neu gezeichnet wird — ein Gipfel dauert zwei
  Bilder.

  An der **rechten Wand hängen die Zahlen**, die man abliest statt sie
  anzufassen: zwei Knöpfe messen die **Augenhöhe** (siehe _Sitzen oder
  stehen_), stehend und sitzend, und daneben hängt die **Werte-Tafel** mit der
  letzten Messung und dem **Konfig-Code für genau diese Hand an genau diesem
  Werkzeug** — kurz genug zum Abtippen, weil sonst nichts drinsteht. Die
  Augenhöhe steht hier und nicht nur im Menü, weil ohne sie keine Zahl aus dem
  Gang stimmt: ein Headset kennt sie nicht.

  Dort stand einmal ein **Tisch mit einer Geisterhand**, und die Idee war gut
  — eine Handhaltung im Leeren einzustellen ist Raten, weil sich der Arm
  mitbewegt, und auf einer Tischplatte nicht. Nur war er ein **zweiter Weg** zu
  derselben Antwort, mit eigener Bedienung, eigenen Knöpfen und einer eigenen
  Gelegenheit, versehentlich etwas anderes einzustellen als nebenan. Seit die
  Hand selbst ein **Werkzeug** ist (_Boxhand_, oben), fällt er weg: man legt
  sie im Gang in den Halter wie eine Pistole.

  An der **linken Wand steht eine Bank mit einem Griff darauf**, der sich
  nicht bewegen lässt — nur anfassen. Solange man ihn hält, spielt der
  Controller das Muster, das der Knopf daneben ausgewählt hat: kein Vibrieren,
  leicht, mittel, stark, Doppelklopfen, Salve, Herzschlag, Anschwellen,
  Dauerbrummen (`tune/haptics.ts` mit Test, `tune/VibeBench.ts`). Vibration
  ist die einzige Rückmeldung des Spiels, die man **nicht sehen** kann, und
  ob eine Salve als Salve ankommt, merkt man sonst nirgends. Ein Ding, das man
  greift und das dann mitkommt, prüft die Physik; hier soll die Hand ruhig an
  etwas Festem liegen, also bewegt sich der Griff nicht.

  **Hinter dem Rücken, durch die Tür in der Rückwand, liegt der Schießgang**
  (`tune/lane.ts` hat seine Maße). Von links nach rechts gelesen ist er ein
  Arbeitsablauf: **Werkzeug-Menü**, **Halter**, **Griffstand**, **Werte** — und
  „links" heißt hier aus Sicht dessen, der im Gang nach vorn schaut, also +X,
  während rechts -X ist. Genau deshalb ist der Gang breit: vier Dinge
  nebeneinander, zwei davon mit einem Ausleger voller Griffe.

  Ein Schild am Halter macht das **Werkzeug-Menü** auf, und das erscheint
  **vor dem Spieler** statt an einer Wand: es ist dasselbe Panel wie am
  Handgelenk (`ui/WristMenu.ts` mit `anchor: 'view'`), nur ohne runden Knopf
  und frei in der Luft. Vorher war es ein Kachelraster an der Wand, und das
  hatte zwei Fehler auf einmal — es war ein **zweites** Menü mit eigener
  Bedienung und eigenem Aussehen, und es hing dort, wo es gebaut wurde, statt
  dort, wo man steht. **Trigger oder Greifen** wählt aus (das Regal ist eine
  Nimm-Seite), und die Auswahl legt das Werkzeug **direkt in den Halter**: man
  wählt es ja, um es einzumessen, und der Weg dorthin führt ohnehin nur über
  ihn. Der Griffstand bekommt dieselbe Id gleich mit.

  Dann kommen **zwei Justierstände** nebeneinander, und **jeder hat seine
  eigene Zielscheibe** am Ende des Gangs, genau vor sich. Sie beantworten die
  beiden Hälften derselben Frage: der erste _wie halte ich das Ding?_, der
  zweite _wie umfasst die Hand es?_

  Die Scheiben hängen fest — sie halten Kugeln auf, und ein Kollisionskörper,
  der jedem Schieben folgt, ist eine Fehlerquelle für einen Schönheitsfehler.
  Verschiebbar sind die **Stände**, und damit keiner quer durch den Gang auf
  die Scheibe des Nachbarn zeigt, dreht sich die **Zuordnung**: der linke Stand
  nimmt die linke Scheibe, der rechte die rechte (`tune/lane.ts`,
  `swapTargets`, mit Test). Entschieden wird nach der Reihenfolge und nicht
  nach dem kürzesten Weg — der ist genau dann unentschieden, wenn beide Stände
  auf derselben Seite stehen.

  Der **erste Stand** (`tune/ToolRange.ts`): ein Werkzeug liegt nicht richtig
  oder falsch, es **zeigt** richtig oder falsch — und wohin es zeigt, sieht man
  an nichts so gut wie an einer Scheibe am Ende eines Gangs. Ein Werkzeug, das
  man in den **Halter** hält, rastet
  ein und liegt dort exakt auf die Scheibe gerichtet; damit ist die
  Zielrichtung keine Unbekannte mehr. Dann führt man die Hand ans Werkzeug,
  dorthin, wo man es halten will, und bestätigt mit **Greifen oder Trigger**:
  was dazwischen liegt, _ist_ die Haltung (`toolPose.ts`), sie wird gespeichert
  und das Werkzeug springt damit in die Hand zurück — wo man sofort sieht, ob
  es die Scheibe trifft. `A` legt es unverändert zurück.

  Der Stand selbst ist dabei immer im Weg, also ist er **leer fast durchsichtig
  und voll unsichtbar** (`STAND_OPACITY` in `tune/StandFrame.ts`): man will die
  Hand am Werkzeug beurteilen und nicht das Möbelstück darunter, und leer muss man trotzdem sehen, wohin das Werkzeug
  soll. Sobald eines drinsitzt, läuft stattdessen eine **Linie aus dem Werkzeug
  bis in die Scheibe** — die Zielachse selbst, zu sehen statt zu glauben. Das
  Werkzeug ist dann ein _Kind_ der Aufnahme und nicht bloß an derselben Stelle:
  es kann von ihr nicht wegdriften, auch nicht, während der Stand verschoben
  wird.

  Auf dem Boden liegt dabei ein **Kreis**. Wer hineintritt, macht die Welt
  durchsichtig und seine **virtuelle Hand unsichtbar**; wer heraustritt, nimmt
  beides zurück. In einer AR-Sitzung sieht man drinnen also die **echte** Hand
  am virtuellen Werkzeug und legt sie daran, statt zu raten, wo eine Boxhand
  aufhört und die eigene anfängt. Es ist die einzige Stelle im Spiel, an der
  ein **Schritt** etwas schaltet, und sie hat einen Grund: genau hier sind
  beide Hände voll — eine hält das Werkzeug, die andere soll daneben liegen —,
  und beide Hände voll heißt, dass niemand einen Knopf drückt. Ein von Hand
  geschaltetes AR bleibt davon unberührt: der Kreis nimmt nur zurück, was er
  selbst angeschaltet hat.

  **Höhe und Ort hängen bei beiden Ständen an zwei Griffen** an einem
  Ausleger, einen halben Meter zur Seite (`tune/StandFrame.ts`,
  `tune/rangeSettings.ts` und `tune/gripSettings.ts`, beide mit Test): oben ein
  Schieber für die Höhe, unten eine Kugel für den Ort, greifen und ziehen, beim
  Loslassen gespeichert. So weit weg, weil ein Griff neben der Aufnahme von der
  Hand mitgenommen wird, die nach dem Werkzeug greift — und dann steht der
  Stand mitten in einer Messung woanders. Zwei Griffe statt eines, weil „zu
  hoch" und „zu weit links" zwei Fragen sind und ein Griff, der beides kann,
  immer auch das verstellt, was schon stimmte. Gestell, Säule und Ausleger sind
  bei beiden dieselben, damit man nicht zweimal lernt, wie ein Stand
  verschoben wird.

  Der **zweite Stand** steht **auf der anderen Seite des Gangs, außerhalb des
  Kreises** —
  dort soll die Welt ja gerade nicht durchsichtig sein, denn hier sieht man eine
  Boxhand an. Er hält eine unbewegliche **Kopie** desselben Werkzeugs und daran
  eine **feste Boxhand** (`tune/GripStand.ts`, Rechnung in `tune/handGrip.ts`
  mit Test) — fest und nicht gläsern, weil sie hier das Ding ist, um das es
  geht, und kein Vergleichsstück. Die Kopie kann man nicht nehmen, nicht
  schieben und nicht einrasten lassen: sie _ist_ der feste Punkt, und ein
  fester Punkt, den man versehentlich mitnimmt, ist keiner. Die Boxhand dagegen
  greift man, dreht sie, verschiebt sie und lässt sie los; wo sie dann liegt,
  _ist_ die Handhaltung an diesem Werkzeug. `A` bricht ab. Sie hängt dabei
  wirklich an der Hand (`Object3D.attach`) statt Bild für Bild nachgerechnet zu
  werden: was man hält, hält man 1:1, und ein Umhängen kann keine
  Rundungsfehler aufsummieren. **Darunter** hängt ein Knopf, der die Haltung
  zurücksetzt — dort, wo man steht, wenn man ihn braucht; an der Wand steht
  derselbe noch einmal. Zurückgesetzt wird **auf die Hand am Werkzeug** und
  nicht auf sechs Nullen: die Null einer Handhaltung ist der Griffpunkt des
  Controllers, und die liegt sichtbar neben dem Werkzeug (siehe _Eingemessene
  Griffe_).

  **Warum zwei Stände und nicht einer**: _wohin ein Werkzeug zeigt_ und _wie die
  Faust darum herum liegt_ sind zwei Größen. Der erste Stand misst die eine, der
  zweite die andere, und man merkt es daran, dass eine stimmen kann, während die
  andere daneben ist — die Zielrichtung genau auf dem Strahl und die Hand
  trotzdem quer am Griff. Für alles mit **Standardgriff** ist die zweite Größe
  seit der einen gerechneten Faust keine Frage mehr (siehe _Eingemessene
  Griffe_); der Stand bleibt für alles andere und für den, der es anders haben
  will.

  Die Kopie ist immer das, was man gerade einmisst: der Halter legt sie hin,
  sobald dort etwas einrastet. Wer über den Halter gar nicht geht, drückt
  _Kopie_ und bekommt das Werkzeug aus der zeigenden Hand. Die Boxhand hängt
  als **Kind der Kopie** — das ist keine Kleinigkeit, sondern die ganze
  Rechnung: ihre Lage in diesem Elternteil _ist_ die Größe, die gespeichert
  wird, und ein Stand, den man hinterher noch verschiebt, nimmt beide
  gemeinsam mit, ohne dass sich an der Messung etwas ändert.

  Und die Kopie liegt in der **Gestalt, die sie in der eingestellten Hand hat**
  (`Tool.showHeldBy`). Für fast jedes Werkzeug ist das dasselbe Bild; für die
  beiden, deren Modell sich im Griff verschiebt — Drohne und großer Hammer —
  ist es der Unterschied zwischen einer Messung und einer um den Versatz
  daneben. Beim **Hammer** heißt es außerdem, dass dort sein Auslieferungsgriff
  am Stiel liegt: eine Handhaltung ist der Versatz gegen den _Ursprung_ des
  Werkzeugs, und der ist bei ihm immer der Punkt, an dem die Faust liegt —
  einmal eingemessen gilt sie damit an jedem Punkt des Stiels, und der Stand
  braucht die anderen Punkte gar nicht zu zeigen. Warum das überhaupt eine
  Zeile Code ist, steht unter _Eingemessene Griffe_.

  Für die letzten zwei Millimeter gibt es an der linken Wand des Gangs
  **Feinjustieren**: die geltende Haltung wird geladen (`gripForHold` in
  `toolPose.ts`, die Umkehrung der Messung) und als **Geisterhand** ans
  Werkzeug gestellt, und die Hand, die den Knopf _nicht_ gedrückt hat, zieht
  sie zurecht — **um ein Zehntel untersetzt**: ein Zentimeter an der eigenen
  Hand ist ein Millimeter am Geist, ein Grad ein Zehntelgrad
  (`tune/fineTune.ts` mit Test). Eine ausgestreckte Hand zittert um mehr, als
  hier eingestellt wird; untersetzt tut sie es nicht mehr. Der Trigger legt
  fest, `A` bricht ab. An derselben Wand hängt dieselbe **Werte-Tafel** wie im
  Raum, mit denselben sechs Zahlen und dem Konfig-Code — wer im Gang steht,
  läuft für seine eigenen Zahlen nicht zurück in den Raum. Sie ist groß und
  dreizeilig, weil auf ihr **alles** stehen soll: eine Tafel, die kürzt, lässt
  den Code weg, weil der hinten steht, und der Code ist der Grund, warum man
  hinsieht. `TextPlane` verkleinert deshalb die Schrift, bis alles hineinpasst,
  statt zu kürzen, und ein `\n` bricht die Zeile, wo es steht.

  Ein Knopf dort ist **AR an/aus**: er blendet Wände, Boden und Decke
  durchsichtig (`tune/seeThrough.ts`), damit die virtuelle Hand nicht mehr
  hinter der Welt verschwindet. Ob dahinter das **echte Zimmer** auftaucht,
  entscheidet die laufende Sitzung: `App.enterVR` fragt zuerst nach
  `immersive-ar` und fällt auf `immersive-vr` zurück, und nur eine AR-Sitzung
  mischt ihr Kamerabild dazu. Wo es das nicht gibt, ist die Welt eben nur
  durchsichtig — die Hand verdeckt sie trotzdem nicht mehr. Der Raum hat
  deshalb als einziger **keine Horizontfläche**: die läge sonst als graue
  Platte über dem echten Fußboden.

  Durchsichtig wird dabei die _Welt_, **nicht der Bildpuffer** — jedenfalls
  nicht ohne Kamerabild dahinter. Ein Bild mit Alpha 0 hat der Compositor nicht
  anzuzeigen, sondern wegzublenden, und was dann durchkommt, ist auf einer
  Brille das reprojizierte letzte Bild: es zieht bei jeder Kopfdrehung hinterher,
  und kleine helle Dinge — ein Werkzeug im Stand zum Beispiel — sehen dabei aus,
  als bewegten sie sich mit dem Kopf mit. In einer VR-Sitzung bleibt der
  Hintergrund deshalb undurchsichtig, nur eben dunkel statt Himmel.

  **Rechts hinter der Trennwand liegt der Poseraum** — der Gang ist dafür nach
  rechts breiter geworden, und die alte rechte Wand ist zur Trennwand mit Tür
  geworden, damit Knöpfe und Werte-Tafel bleiben, wo sie waren. Darin hängt
  ein **Schwebekasten**: eine durchsichtige Kiste in der Luft, in der die
  Schwerkraft aufhört. Ein Werkzeug, das man darin loslässt, bleibt liegen —
  und daran legt man die **blanke** Hand, die dafür einen Handschuh trägt
  (Schalter an derselben Wand). Ein zweiter Schalter stellt den Kasten **fest**:
  dann rührt sich darin nichts mehr, und die messende Faust nimmt das Werkzeug
  auch nicht mehr an sich. Was zwischen Hand und Werkzeug liegt, ist die
  Haltung; sie steht mit ihrem Konfig-Code auf der Tafel dahinter. _Handpose
  teilen_ schickt sie live an alle im Raum — geteilt wird immer die Hand, die
  **nicht** gedrückt hat, und deren Trigger hält sie fest. Zusehen kann dabei
  auch die Werkzeugseite im Browser (`tools.html`, Menüpunkt _Verbinden_).
  Ausführlich unter _Der Poseraum_.

  **Gelaufen und
  gedreht wird hier nicht** (`PlayerRig.locked`), der Kopf natürlich schon:
  man kommt her, um eine Haltung zu halten und sie anzusehen. Weil die Tafeln
  aber rechts hängen, die Bank links steht, der Schießgang hinten liegt, und
  man im Sessel an nichts davon hinkommt, gibt es neben dem Schild
  einen **Knopf, der den Stick freigibt** — ausdrücklich und sichtbar, statt
  dass es einfach so geht. Gürtel und Werkzeugregal sind da, denn die Hand, die man
  ansieht, ist die, die man einstellt; am Gürtel hängen die **Boxhand** links
  und die **Pistole** rechts, die beiden Dinge, für die man herkommt.

- **Dust** (experimentell): große Außenkarte im Geist der Counter-Strike-Map —
  zwei Plätze, ein Tunnel, Rampen, ein begehbarer Vierstöcker mit Treppen bis
  aufs Dach und ein paar kleinere Häuser. Dieselben Werkzeuge, dieselbe Physik,
  dieselbe geteilte Sitzung wie im Portal Labor; Portale haften dort an den
  hellen Tafeln und am Boden. Die Karte steht auf dem **Kachelgitter**
  (`dust/dustTown.ts`): acht Häuser als Liste — wo eines steht, wie viele
  Stockwerke, auf welcher Seite die Tür. Die Obergeschosse haben seither
  **Fenster**, die wirklich Löcher sind, und die Treppen stehen im
  Navigationsgraphen statt nur in der Geometrie.
- **Dunkelhaus** (experimentell): ein kleines Haus ohne Fenster — Startraum,
  ein Flur quer durch, vier Zimmer und ein Hinterzimmer. Es steht auf dem
  **Kachelgitter** (`dark/darkHouse.ts`), und seit es das tut, steht auch etwas
  darin: eine **Küchenzeile** über drei Kacheln im Südostzimmer, Regale, Tische,
  eine Bank, ein Kistenstapel. Es
  gibt kein Tageslicht: das Umgebungslicht steht fast auf null, gesehen wird
  nur, was man anmacht oder trägt. Im Startraum hängt ein **Dimmer** an der
  Wand (anzielen + Trigger, oder mit dem Finger antippen), der die Deckenlampen
  des ganzen Hauses in **fünf Stufen** schaltet — _aus, dämmrig, gedimmt,
  normal, hell_, eine Stufe pro Druck, nach der hellsten wieder aus. Zwei
  Stellungen beantworten nur die Frage „ist Licht an?“; die interessanten
  liegen dazwischen: wie wenig Licht reicht für einen Flur, ab wann lohnt die
  Taschenlampe nicht mehr. Das Nordwest-Zimmer hat bewusst gar keine Lampe und
  bleibt auf jeder Stufe dunkel. Der Dimmer selbst **leuchtet immer**, auch auf
  _aus_: die Platte ist selbstleuchtend (Basic-Material, dafür braucht es kein
  Licht), sie trägt ein kleines eigenes für den Hof an der Wand, und der Knopf
  wandert mit jeder Stufe höher, während die Pips daneben mitzählen. Ein
  Lichtschalter, den man mit der Taschenlampe suchen muss, ist genau einmal
  lustig. Die Lampen leuchten hier viel stärker als in den anderen Welten
  (26 statt 9): dort ist eine Lampe ein Akzent neben Sonne und Umgebungslicht,
  hier ist sie das ganze Licht. Davor schwebt eine **eingeschaltete
  Taschenlampe** (man muss sie im Dunkeln ja finden können), auf den Kisten liegen eine
  **Leuchtkugel** zum Werfen, eine **Laterne** und zwei **Knicklichter** zum
  Liegenlassen als Wegmarke. Sonst ist alles wie im Portal Labor: derselbe
  Gürtel, dasselbe Regal, dieselbe Physik. Portale haften nur an den hellen
  Tafeln im Flur und am Boden — eine Putzwand mit Loch würde das Haus zum
  Nichts draußen aufmachen.
- **Spiel Haunting** (experimentell): das erste Spiel hier, das ohne die
  anderen nicht geht. Ein je Runde **gewürfeltes Haus** (`haunting/house.ts`),
  drei Sachen darin, und davor ein Van mit vier Stationen — Archiv, Späher,
  Drohne, Schalttafel —, von denen jede das Haus in einer anderen Sprache
  kennt. Der VR-Spieler hat als Einziger Hände, alle anderen haben Wissen, und
  niemand kann dem anderen eine Koordinate sagen. Das Monster ist **aus**, bis
  die Brille es einschaltet. Ausführlich: _Haunting: einer im Haus, die anderen
  im Van_.
- **Kletterhalle** (experimentell): die Welt, in der der **Greifknopf etwas
  anderes tut**. Überall sonst nimmt Greifen ein Ding in die Hand; hier hängt
  es den ganzen Spieler an die Wand. Von Griff zu Griff geführt wird dabei
  niemand — man fasst hin, wo man will, und die Welt rechnet aus, wie gut das
  war. Das Vorbild ist die Haltemechanik aus _Cairn_.

  **Die Halle steht auf dem Kachelgitter, die Kletterwände nicht**
  (`climb/climbHall.ts`), und die Grenze ist Absicht: Überhang, Riss und Kamin
  sind kein Mobiliar, sondern das Spiel selbst — ihre Maße sind über viele
  Sitzungen im Headset entstanden. Matte, Decke und die vier Wände sind
  dagegen austauschbar und sehen jetzt aus wie überall sonst. Nebenbei hat die
  Halle dadurch einen Boden bekommen, auf dem ein NPC herumlaufen kann.

  **Über Zimmerhöhe muss die Hülle von Hand nach** (`hallUpperWalls`). Eine
  gerasterte Wand ist `PLAN_WALL_H` hoch, also 2,80 m — die Höhe eines
  Zimmers; diese Halle ist **zehn Meter** hoch. Unten merkt das niemand, oben
  jeder: Wer auf den Podesten bei 6,50 m ankam, stand zwischen offenen Kanten
  und sah statt einer Hallenwand ins Nichts. Der fehlende Streifen sind vier
  Quader in Wanddicke auf denselben Kachelkanten wie die Wände darunter, über
  Eck geschlossen, damit in keiner Ecke ein senkrechter Schlitz bleibt. Eine
  **Masse** im Grundriss (`GridPlan.mass`) ginge dafür nicht: Die deckt ein
  Kachelrechteck ab, und die schmalste Kachel ist 2,5 m — die Wand stünde
  mitten in den Kletterwänden, die einen guten Meter davor hängen. Gerechnet
  wird sie in `climbHall.ts` und damit ohne Brille geprüft; hingestellt wird
  sie in `ClimbWorld.buildShell`.

  **Wie das Klettern selbst funktioniert.** Jede greifende Hand bekommt einen
  **Anker** in der Welt, und der Körper wird jedes Bild so weit verschoben,
  dass die Hände wieder dort sind (`ClimbWorld.driveBody`). Zieht man die Hand
  herunter, geht der Körper hinauf; mehr ist Klettern nicht. Gefahren wird das
  über den **Flugmodus** der Fortbewegung (`PhysicsLocomotion.setFlight`,
  dieselbe Tür, durch die auch der Supermanhandschuh geht) und nicht über die
  Position des Rigs — dadurch bleiben Wände Wände, man klettert nicht in die
  Halle hinein, und beim Loslassen wird aus dem letzten Zug ein **Schwung**
  (gedeckelt, damit aus einem Klimmzug kein Raketenstart wird). Solange eine
  Hand hängt, ist der **linke Stick abgeschaltet** (`PlayerRig.locked`) — wer
  hängt, geht nicht und springt nicht.

  **Gedreht wird trotzdem** (`ClimbWorld.turnAtTheWall`): Der rechte Stick
  gehört weiter dem Hals, denn wer sich an einer Wand hochzieht, will genauso
  über die Schulter schauen und die Route nebenan ansehen wie überall sonst —
  und wer es nicht kann, dreht sich körperlich im Zimmer und steht irgendwann
  mit dem Kabel um den Hals vor der Wand. Die Rastdrehung steht deshalb hier
  und nicht im Rig, denn sie hat einen Nachsatz: Sie schwenkt den ganzen
  Spieler um seinen Kopf, also auch seine Hände, während die **Anker** in der
  Welt stehen. Bliebe es dabei, hinge die Hand danach einen halben Meter neben
  ihrem Griff in der Luft, und der Zug risse einen dorthin. Also wird jeder
  Anker danach **neu auf seinen Griff gesetzt**, genau wie beim Zupacken; der
  Körper schwingt in den nächsten Bildern um die Griffe herum an seine neue
  Stelle. Das ist auch die ehrlichere Bewegung — an einer echten Wand dreht
  sich der Körper um die Hände und nicht die Hände um den Körper. Der Sitz
  (`seat`) bleibt dabei, was er beim Zupacken war: Wie gut man getroffen hat,
  ändert sich nicht dadurch, dass man sich umdreht.

  Damit der Greifknopf sich nicht mit dem normalen Greifen schlägt,
  klettert nur eine Hand, die wirklich leer ist (`PortalWorld.handFree`) — wer
  eine Kiste trägt, trägt eine Kiste. Am Gürtel hängt deshalb auch nichts.

  **Was in den Halt eingeht** (`climb/gripQuality.ts`, mit Test — reine
  Zahlen, kein three.js). Heraus kommt eine Zahl je Hand und daraus der
  **Halt** (`support`):

  - **Material** (`climb/holds.ts`): _Sprosse_ (perfekt, Grundwert 1),
    _rauer Fels_ (0,44) und _glatter, glänzender Fels_ (0,24). Dazu, was jedes
    an Ausdauer frisst: 0, 1 und 1,9.
  - **Form**, aber nur so weit die Hand wirklich daraufsitzt (`seat`): Sprosse
    und Holm +0,36, Henkel +0,34, Spalte +0,30, Kante +0,26, Ballen +0,06,
    blanke Fläche nichts. Eine um einen halben Handteller verfehlte Kante ist
    keine Kante, sondern eine Wand — und genau das ist „wer keine gute Kante
    erwischt“. Leisten, Sprossen, Risse und Holme haben dafür eine **Achse**:
    An ihnen entlang darf man überall zupacken, darüber und darunter nicht.
    Beim Holm ist das der ganze Punkt — er ist eine Strebe von zwei Metern
    Länge, an der man sich entlanghangelt (siehe **Oben ankommen**).
  - **Verspreizen** (Jamming): Stehen zwei Hände an **entgegengesetzten**
    Flächen, gibt es bis zu +0,40 — abhängig davon, wie genau sie gegeneinander
    stehen _und_ wie nah die Hände beieinander sind. Druck braucht einen
    Winkel; mit weit auseinandergerissenen Armen kann man nicht drücken.
  - **Neigung der Wand**: An einem Überhang schaut die Fläche nach unten, und
    dann gibt es nichts mehr hineinzudrücken — bis auf die Hälfte herunter,
    bei einem waagerechten Dach.
  - **Wie tief die Hände hängen**: voll von über dem Kopf bis vor die Brust,
    dann fallend bis auf die Hälfte, wenn sie auf Fußhöhe stehen.
  - **Spannweite**: bis 75 cm umsonst, ab 1,60 m bleiben 70 % übrig.
  - **Füße** auf etwas Festem: +0,18 (gemessen mit einem kurzen Strahl nach
    unten, denn `grounded` ist beim Klettern immer falsch — der Körper fliegt
    ja).
  - **Restkraft**: leere Ausdauer macht jeden Griff schlechter, aber höchstens
    auf 70 % — eine Todesspirale, aus der niemand mehr herausklettert, wäre
    keine Mechanik, sondern eine Strafe.

  Zwei Hände tragen mehr als eine (die bessere plus ein Drittel der anderen),
  einarmig hängen kostet 22 %. **Die Leiter ist von alledem ausgenommen**: Sie
  gibt immer 1, egal wie tief, wie weit, wie erschöpft. Eine Leiter, an der man
  nach zwei Minuten abrutscht, wäre keine.

  **Die Ausdauer** (`climb/stamina.ts`, mit Test) hängt an zwei Schwellen.
  Über **0,70** füllt sie sich wieder — aber **anlaufend** (1,2 s), denn wer
  sich für einen Wimpernschlag an einen Henkel hängt, hat sich nicht ausgeruht;
  eine Erholung, die sofort einsetzt, macht aus jedem guten Griff einen
  Schalter. Unter **0,18** ist es kein Halt mehr, sondern ein Streifen: Die
  Hand geht ab, und wer keine zweite mehr an der Wand hat, fällt. Dazwischen
  läuft sie aus, umso schneller je schlechter der Halt und je glatter das
  Material. Auf der Matte füllt sie sich in drei Sekunden, an der Wand in
  sechs. Was dabei herauskommt, in Sekunden bis leer: zwei raue Henkel oder
  Kanten sind eine **Rast**, zwei raue Ballen 180 s, zwei raue Flächen 55 s,
  zwei glatte Kanten 95 s, zwei glatte Flächen **9 s** — und einarmig überall
  ein Drittel davon. Am Überhang wird aus der Rast an der Kante ein Auslaufen;
  Rasten gibt es dort nur noch an den Henkeln.

  **Die Anzeige** (`climb/ClimbHud.ts`) hängt wie die Trefferanzeige an der
  **Kamera** und liegt auf `LAYER_HUD` — ein Balken, der dem Kopf ein Bild
  hinterherläuft, ist das Erste in VR, wovon einem schlecht wird. Sie sitzt am
  **unteren Bildrand**: 45 cm unter der Blicklinie auf einen Meter, also gut
  24° — und dem Auge entgegengedreht, weil eine schräg gesehene Tafel eine
  gestauchte ist. Vorher waren es 20 cm (11°), und damit hing sie die ganze
  Zeit mit an der Wand; ganz an den Rand wiederum gehört sie auch nicht, sonst
  sähe man sie nur beim Kopfsenken und könnte sie gleich weglassen. Unten in
  der Mitte die Ausdauer, links und rechts daneben je ein Haltbalken; die
  Anordnung ist die Anschrift, deshalb steht nichts daran. Auf den Haltbalken
  sitzen zwei feine Striche genau auf den beiden Schwellen — sonst wäre „gut“
  eine Farbe, die man glauben muss, statt einer Höhe, die man abliest.
  Abschaltbar im Menü.

  Zwei Zahlen daran waren lange falsch, und beide sieht man erst in der Brille.
  **Das Vorzeichen der Drehung**: Ein positives `rotation.x` kippt die Normale
  einer Tafel nach *unten* und damit vom Auge weg — die Tafel hing also nicht
  um 24° zurückgedreht, sondern um 24° weiter nach vorn, knapp 50° schräg im
  Blick statt null. Und **die Reihenfolge**: Sie liegt ohne Tiefentest auf dem
  Glas (sonst verschwände sie hinter jeder Wand, an der man gerade hängt), und
  dann entscheidet allein die Zeichenreihenfolge, wer über wem liegt. Mit den
  60 von vorher lag sie über *allem*, auch über dem aufgeklappten
  Handgelenkmenü (`UIPanel`, Reihenfolge 10). Jetzt wird sie **davor**
  gezeichnet (4) statt darüber: Drei Balken, die quer durch eine Menüseite
  laufen, sind schlimmer als drei Balken, die man kurz nicht sieht.

  **Die Vibration** (`climb/gripHaptics.ts`, mit Test) ist bewusst **kein
  Dauerbrummen, dessen Stärke den Halt anzeigt**: Ein Motor, der die ganze Zeit
  läuft, wird nach zwanzig Sekunden nicht mehr wahrgenommen, verdeckt jede
  andere Rückmeldung und leert den Akku — und man merkt eine _Änderung_ ohnehin
  viel besser als einen _Pegel_. Also drei **Ereignisse**: (1) **Der Schlag
  beim Zupacken**, genau einer, und er ist die Antwort auf „habe ich das gut
  erwischt?“ — guter Halt **kurz und hart** (1,0 / 60 ms), schlechter **schwach
  und lang** (0,15 / 190 ms); dieselben zwei Regler in die Gegenrichtung, und
  dadurch ohne Anzeige auseinanderzuhalten. (2) **Das Rutschen**: Solange ein
  Griff unter der Erholungsschwelle liegt, tickt es leicht weiter, und je
  schlechter der Halt, desto **schneller** die Folge — nicht lauter, schneller;
  ein beschleunigendes Ticken liest sich als Countdown, und das ist es auch.
  (3) **Die Warnung** ab einem Drittel Ausdauer, kurz und kräftig statt lang
  und weich, damit beide nebeneinander unterscheidbar bleiben. An der Leiter
  passiert nichts davon außer dem Schlag beim Zupacken — eine Welt, in der auch
  das sichere Material vibriert, hat kein sicheres Material mehr.

  **Die Halle** ist eine Lehrtafel: 25 × 20 m, 10 m hoch, Boden ganz aus
  Matten, zwei große **Sprungkissen** davor (siehe unten), und jede Wand
  beantwortet genau eine Frage. **Leiterwand** (perfektes
  Material, der Nullpunkt und der Weg nach oben für jeden, der erst einmal
  sehen will, wie hoch es hier ist), **Rauwand** mit einer Route von Henkeln
  über Leisten bis zu Ballen und blanken Flächen, daneben der **Riss** (eine
  senkrechte Spalte, in die die Hand hineingeht), der **Überhang** (34°,
  dieselben Griffe, aber sie schauen nach unten), die **Glattwand** (poliert
  und glänzend) und der **Kamin**: zwei Wände, 95 cm auseinander, fast ohne
  Griffe — der einzige Weg hoch ist das Verspreizen, und wer die Kanten sucht
  statt zu drücken, kommt nicht weit.

  **Oben ankommen** ist ein eigenes Stück Bauwerk, und zwar aus einem Grund,
  den man erst im Headset merkt: Die Podeste stehen **vor** ihren Wänden, in
  der Halle. Wer eine Wand hochklettert, hat sein Podest also nicht vor der
  Nase, sondern über dem Kopf, und die letzten Meter gehen zwischen Wand und
  Podestkante hindurch. Zuerst lag dort eine Handbreit Luft — 35 cm —, und
  damit endete jede Route unter dem Blech: Der Körper ist eine Kapsel von
  **48 cm Durchmesser** (`PhysicsLocomotion`), und was nicht durchpasst, hängt
  fest. Deshalb hält jedes Podest jetzt **90 cm** Abstand zu seiner Wand
  (`DECK_GAP`) — ein Schacht, durch den der Körper passt.

  Durchpassen ist aber nur die halbe Miete: Oben aus dem Schacht heraus hängt
  man zwar über Podesthöhe, doch der Boden liegt **neben** einem und nicht
  unter einem. Dafür steht in jedem Schacht eine **Ausstiegshilfe**
  (`ClimbWorld.topout`), eine je Route — Rauwand, Riss, Leiterwand, Glattwand,
  Überhang und Kamin. Sie hat die Form, die sie hat, wegen zweier Dinge, die
  beide erst im Headset auffallen:

  1. **Ein Griff auf Podesthöhe reicht nicht.** Wer sich an der Kante
     hochzieht, hängt am Ende _an_ ihr: Die Hand ist oben, die Füße baumeln im
     Schacht, und der Boden ist zwar in Reichweite, aber nicht unter einem.
     Deshalb geht die Hilfe **2,50 m über die Podestoberkante hinaus**
     (`TOPOUT_ABOVE`) — erst ein Griff weit über dem Blech lässt einen so weit
     hochziehen, dass die Füße über dessen Kante kommen, und wer oben steht,
     hat ihn immer noch in der Hand.

     **Die Zahl misst sich am Hangeln, nicht am Hochziehen**, und daran ist sie
     beim ersten Versuch gescheitert: 1,70 m waren zu wenig. Der Körper hängt
     an seinen Händen (`driveBody`), also liegen die Füße so weit unter dem
     Holm, wie die Hand über ihnen steht — bei aufgestrecktem Arm gut zwei
     Meter (`REACH_HANG` = 2,15 m). An einem waagerechten Holm auf 8,20 m
     baumelten die Beine damit auf 6,10 m, also **unter** der Podestkante bei
     6,50 m: Man stieß mit den Knien gegen das Blech, statt sich darunter
     hinüberzuhangeln. Jetzt ist es die Armlänge plus eine Handbreit Luft
     (`TOPOUT_CLEAR`).
  2. **Eine schräge Leiter steht im eigenen Weg.** Zuerst lehnte sie nach
     außen, über den Schacht — also über genau die Strecke, die der Kletterer
     nach oben nimmt —, und man stieß von unten gegen ihre Unterseite. Deshalb
     steht sie jetzt **senkrecht** im Schacht und geht oben **um die Ecke**:
     Ihre beiden Holme laufen auf Ausstiegshöhe waagerecht weiter und
     **einen Meter über die Podestkante** hinein (`TOPOUT_OVER`), mit
     Sprossen dazwischen. Dort hängt man sich lang, hangelt sich hinüber und
     lässt über dem Boden los.

  Und weil man beim Hangeln nicht nach Sprossen suchen will, ist an ihr
  **alles anfassbar**: die Sprossen ohnehin, aber auch die beiden **Holme auf
  ihrer ganzen Länge**. Das ist die Griffart `rail` (`ClimbWorld.bar`) — kein
  Punkt an einer Wand, sondern eine _Strecke_ mit Achse: Man greift hin, wo man
  gerade ist, senkrecht wie waagerecht, und die Hand hängt genau dort. Alles
  daran ist **perfektes Material**: Der Ausstieg ist der Moment, in dem die
  Ausdauer ohnehin am Ende ist, und eine Leiter, die einen dort abwirft, wäre
  keine. Sie hat mit Absicht **keinen Körper für die Physik** — der Weg des
  Kletterers führt genau durch sie hindurch, und an einem Querholm, an dem der
  Kopf hängen bleibt, hätte man nur einen zweiten Ort zum Feststecken gewonnen.
  Die rechte Spur der Rauwand bekommt dazu oben eine **Querung** aus drei
  Henkeln, weil die Leiter am Kopf der linken steht.

  **Der Weg hinunter: die Sprungkissen** (`climb/crashPad.ts`, mit Test —
  reine Zahlen, kein three.js). Jeder nimmt von oben denselben Weg zurück, und
  bis vor kurzem endete er an einer Bodenplatte: Der Kopf fällt mit gut zehn
  Metern in der Sekunde, und **im nächsten Bild steht er still**. Das ist in
  der Brille kein Aufkommen, sondern der kürzeste Weg zur Übelkeit — das Auge
  meldet eine Vollbremsung, von der der Gleichgewichtssinn nichts mitbekommen
  hat, und genau diese Lücke ist es, aus der Motion Sickness entsteht. Ein
  Fall lässt sich in VR nicht abschaffen, sein **Ende** schon. Also steht dort
  jetzt, was in einer echten Halle auch dort steht: zwei große Kissen, 1,40 m
  dick, in die man einsinkt.

  **Sie sind wirklich weich und nicht nur blau.** Jedes Kissen ist eine
  **Feder mit Dämpfer**, und seine Oberfläche ist der Boden, auf dem man steht:
  ein **kinematischer** Körper, der jedes Bild um die Einsinktiefe nach unten
  gesetzt wird, mit dem gestauchten Quader darüber. Wer daraufspringt, drückt
  ihn hinunter; der Blick fährt mit, wird langsamer, kehrt um und wird wieder
  herausgeschoben. Aus dem einen Bild werden gut acht Zehntelsekunden, und
  keines davon ist ein Ruck.

  **Warum eine Feder und keine Bremsstrecke.** Bei einer Feder hängt die Zeit
  bis zum tiefsten Punkt _nicht_ am Aufpralltempo — sie ist ihre Viertelperiode
  und damit für den Stolperer dieselbe wie für den Sprung aus sechs Metern.
  Eine feste Bremsstrecke täte das Gegenteil: Je schneller jemand ankommt,
  desto härter bremst sie ihn, und der Sturz vom höchsten Podest wäre der
  einzige, bei dem es wieder schlägt. Die eine Zahl, um die es geht, ist
  deshalb die **Kreisfrequenz** (`PAD_OMEGA` = 7 → gut anderthalb
  Zehntelsekunden nach unten); dass ein Sprung von oben trotzdem nicht
  durchschlägt, macht die **progressive Härte** — ein halb zusammengedrücktes
  Kissen wehrt sich stärker als eines in Ruhe, so wie Luft in einem Sack. Die
  Dämpfung liegt knapp unter der kritischen, damit ein Rest Rückstoß bleibt und
  einen wieder heraushebt, ohne dass es zum Trampolin wird (Überschwinger unter
  sieben Zentimetern).

  **Geführt wird der Körper über den Flugmodus** (`setFlight`) — dieselbe Tür,
  durch die auch das Klettern geht —, und zwar **nur bis zum tiefsten Punkt**.
  Danach steigt die Fläche wieder, und eine Fläche, die von unten kommt, hebt
  einen von selbst an; der Umkehrpunkt ist außerdem der Moment, in dem der
  Körper stillsteht, also der beste zum Loslassen. Der Stick ist damit nur eine
  gute Zehntelsekunde lang aus statt eine ganze Sekunde. Ein Problem der
  Reihenfolge steckt darin: Die Fortbewegung rechnet **vor** der Welt (`App`),
  wer also in derselben Frame aufkommt, hat sein Falltempo schon verloren,
  bevor das Kissen davon erfährt — ein Kissen, das mit 0 m/s zupackt, ist eine
  Bodenplatte mit Farbe. Deshalb zwei Wege ans Tempo: ein Bild **Vorhalt**
  (gefangen wird, wer im nächsten Bild ohnehin darin stünde) und das gemerkte
  Falltempo als Netz darunter.

  **Wo sie liegen, entscheiden die Podestkanten und nicht die Wände.** Ein
  Kissen am Wandfuß wäre eine Bouldermatte — die verschluckte die untersten
  Griffe jeder Route, und man finge 1,20 m über dem Boden an zu klettern. Die
  beiden liegen deshalb frei in der Halle, jedes vor der Vorderkante der
  Podeste, von denen aus gesprungen wird: das große vor Rauwand und Riss
  (bündig an die Westwand des Kamins, ein Schlitz dazwischen sähe aus wie eine
  Ritze zum Hineinfallen), das zweite vor Überhang und Glattwand. Dazwischen
  bleibt der Streifen zum Einstieg in den Kamin. Dazu **je eine Rampe**, sonst
  wäre ein Kissen eine Falle: Der Körper steigt Stufen bis 32 cm (Autostep),
  ein Kissen ist 1,40 m hoch — ein Keil von 25° ist flacher als alles, was
  diese Fortbewegung noch hinaufkommt, und ein Bauteil statt einer Treppe aus
  vieren.

  In einer **geteilten Sitzung** rechnet jeder Client seine eigenen Kissen: Man
  sieht das Kissen unter dem eigenen Sprung einsinken, nicht das unter dem
  eines Mitspielers. Das ist der billige Weg und für eine Federung, die eine
  halbe Sekunde dauert, auch der richtige.

  Wer wieder hinunter will, springt in die Kissen oder nimmt _Zurück auf die
  Matte_ im Menü. Die Griffe tragen die **Greif-Farben** aus `core/colors.ts`
  und keine zweiten: Sprossen leuchten hell, rauer Fels trägt den ruhigen Ton,
  glatter den dunklen; den Rest macht die Oberfläche, denn glatter Fels glänzt
  auch. Wer im Spiel gelernt hat, dass Türkis „hier anfassen“ heißt, sucht an
  einer Wand voller bunter Klötze zuerst das Türkis.

  Portale haften an nichts hier drin, und das ist Absicht — ein Portal an der
  Hallendecke wäre der kürzeste Weg nach oben und damit das Ende dieser Welt.
  Geklettert wird mit **Controllern oder getrackten Händen**; am Schreibtisch
  kann man die Halle ansehen und durchlaufen, aber nicht hinauf.
- **Mond** (experimentell): die Welt, die es wegen der Schwerkraft gibt —
  1,62 m/s². Ein Sprung dauert dreimal so lange, ein geworfener Stein fliegt
  bis zum nächsten Krater, ein Stapel fällt in Zeitlupe zusammen, ohne dass
  jemand die Stoppuhr angefasst hätte. Graue Ebene bis zum Horizont, Krater,
  Felsbrocken, ein Lander mit Portaltafeln als Landmarke, eine Fahne;
  schwarzer Himmel mit Sternen und der Erde darüber, die nie untergeht. Die
  Schwerkraft kann man überall einstellen — ein Ort, der von sich aus so ist,
  lädt zum Ausprobieren ein, statt es zu erlauben.
- **Alpen** (experimentell): die Welt, die es wegen zweier Werkzeuge gibt —
  Hängegleiter und Flügel brauchen beide dasselbe: Höhe, die man verlieren
  kann. Ein großer Berg (der Gipfel liegt bei gut 280 m, das Kreuz steht dort,
  wo es _wirklich_ am höchsten ist — gesucht, nicht gesetzt, weil die
  Nachbarberge die Flanke anheben), sechs kleinere drum herum, dazwischen ein
  Tal. Man fängt oben an, auf einer **Startrampe** unterhalb des Gipfels mit
  Blick ins Tal, den Gleiter an der linken und die Flügel an der rechten Hüfte;
  unten liegt eine **Landewiese** mit Windsack und Ring, daneben eine Alm mit
  ein paar Kisten. Wald bis zur Baumgrenze, Fels wo es steil ist, Schnee ab
  175 m — alles Vertexfarben aus Höhe und Steigung.
  Unten stehen zwei **rote Knöpfe** (`shared/redButton.ts`), einer auf der
  Wiese und einer vor der Alm: drücken, und man steht wieder auf der Rampe.
  Der Weg zurück nach oben wären sonst 236 Höhenmeter über eine Flanke, die
  stellenweise zu steil zum Gehen ist — eine Wartezeit zwischen zwei Flügen,
  und damit genau dort, wo an dieser Welt nichts stehen soll. Der Knopf setzt
  auch den **Blick** neu (`teleportPlayerTo` mit `yaw`): wer aus dem Tal auf
  einen Berg gebracht wird, weiß ohnehin nicht mehr, wo vorn war, und die
  Rampe zeigt ins Tal.
  Das Gelände ist ein **Höhenfeld** (`alps/alpsTerrain.ts`, mit Test): eine
  Höhe je Punkt aus Glockenkurven, Rauschen mit Gedächtnis und zwei absichtlich
  ebenen Stellen, zum Rand hin auf null auslaufend, und dahinter eine Wiese bis
  zum Horizont. Das Mesh und der Physik-Collider lesen dieselben Zahlen
  (`PhysicsWorld.addHeightfield`, Rapiers Anordnung steht dort hingeschrieben,
  weil man sie nur durch Ausprobieren erfährt), deshalb steht man nie neben
  dem, was man sieht. Ein Strahl gegen fünfzigtausend Dreiecke wäre pro
  Versuch eine Millisekunde, also läuft der Teleporter am Strahl entlang, bis
  er unter die Höhe fällt (`raycastTerrain`). **Gehen** ging dort lange kaum,
  aus drei Gründen, jeder für sich gemessen: Der Rand des Startplatzes war
  bergwärts eine Wand (gut zwanzig Meter Anstieg auf zehn Meter, über 60°) —
  er ist jetzt zum Gipfel hin breit und zum Tal hin schmal (`LAUNCH_EDGE`),
  und der Gipfel hat ein kleines ebenes Stück (`SUMMIT_CAP`); der Test läuft
  den Weg vom Plateau zum Kreuz ab und verlangt überall unter 51°. Die
  **Rutschgrenze** des Charakter-Controllers lag bei 40°, die Klettergrenze bei
  52° — dazwischen durfte man hinauf und rutschte gleichzeitig hinunter, und
  die Flanke hat fast überall 35° bis 50°; gerutscht wird jetzt erst jenseits
  dessen, was man hinaufkommt (`SLIDE_SLOPE_DEG` in `PhysicsLocomotion.ts`).
  Und das hintere Ende des Stegs stand 95 cm über dem Plateau, drei Schritte
  zu hoch für einen Schritt — davor steht jetzt ein Aufgang aus Holz, knapp
  15° steil. Der Himmel wandert mit dem Kopf:
  wer vom Gipfel dreihundert Meter weit sieht, sähe die Kugel sonst von innen
  an ihrer Naht. Portale gibt es hier keine Flächen für — ein Berg hat keine
  Wände.
- **Effektlabor** (experimentell): die Welt, die es wegen einer einzigen Frage
  gibt — _wie sieht das eigentlich aus?_ Ein Effekt dauert anderthalb Sekunden,
  und genau deshalb ist er so schwer einzustellen: bis man ihn im Spiel gesehen
  hat, ist er vorbei, und beim nächsten Versuch steht man woanders. Hier steht
  man immer gleich, und der Unterschied zwischen zwei Einstellungen ist ein
  Knopfdruck — dieselbe Idee wie im Eingaberaum, nur für das, was man _sieht_,
  statt für das, was man drückt.
  Ein geschlossener Kasten (10 × 10 m), vorn eine **Bühne** mit Kreis und
  Sockel, davor ein Pult mit einem **großen roten Knopf** (antippen oder
  anzielen + Trigger; er taucht sichtbar ein, damit man weiß, dass man
  getroffen hat). **Links daneben** die Tafel: eine Kachel je Effekt — Rauch,
  Feuer, Funken, Explosion, Staub, Zauber, Wasser — und darunter ein
  **Schieber für die Größe**, von 0,25× bis 4×. Der Schieber wird nicht nur
  angetippt, sondern **gezogen**: solange der Trigger derselben Hand unten
  bleibt, folgt der Reiter ihrem Strahl (`updateDrag`); wer lieber klickt,
  findet dieselben Werte als Rasten im Handgelenk-Menü, zusammen mit _Auslösen_
  und _Alles weg_. Die Kacheln stehen in **zwei Spalten**: sieben untereinander
  wären eine Tafel von der Decke bis zum Knie, und der Schieber läge darunter.
  Auf der Hüfte hängt die **Stoppuhr** — sie ist das eigentliche Werkzeug
  dieses Raums, denn eine Explosion in Zeitlupe ist der einzige Weg, sie
  wirklich anzusehen. Damit das trägt, laufen die Wolken in der Zeit der Welt
  und nicht in der der Wanduhr: `PortalWorld.worldTimeScale` gibt den Faktor
  heraus, mit dem auch die Physik rechnet. Daneben der **magische Beutel** —
  etwas, das im Rauch steht, sagt mehr über den Rauch als der Rauch allein, und
  dafür stehen um die Bühne herum auch drei Kisten und ein Companion Cube.
  Ein Effekt ist dabei nichts als ein Satz Zahlen (`effects/effectKinds.ts`,
  mit Test): Anzahl, Lebensdauer, Tempo, Streuung, Auftrieb, Schwerkraft,
  Luftwiderstand, Größe, Farbverlauf, Leuchten, Lichtblitz. Wer einen
  dazutut, schreibt eine Zeile in diese Liste — die Tafel im Raum baut sich
  daraus. Geflogen wird in `effectBurst.ts` (mit Test, reine Zahlenreihen),
  gezeichnet als **eine** Punktwolke je Auslösung (`Burst.ts`): Punkte und
  keine Kugeln, was leuchtet additiv gemischt, alles andere verdeckend, und
  jedes Partikel ein weicher Fleck aus einer 64er-Textur — ohne die ist ein
  Punkt ein Quadrat, und eine Rauchwolke aus Quadraten sieht aus wie ein
  Bildfehler. „Größer" heißt dabei mehr, dickere, schnellere und länger
  lebende Partikel bis zu einer festen Obergrenze — die Physik dahinter bleibt
  gleich: eine doppelt so große Explosion fällt nicht doppelt so schnell.
- **Interaktionslabor** (experimentell): eine helle Halle (32 × 22 m) im Geist
  der Testkammern aus _Portal_ und der großen Testzelle, die in Oblivion hinter
  der Karte liegt — ein Raum ohne Geschichte, in dem einmal aufgebaut steht,
  was man **anfassen** kann. Quer durch die Halle läuft eine Wand mit drei
  Öffnungen, und das ist der Punkt: Ohne eine Wand, die wirklich trennt, ist
  eine Tür ein Möbelstück, an dem man vorbeigeht.
  - **Schiebetür**, geöffnet vom **großen roten Knopf** (derselbe wie im
    Effektlabor, `worlds/shared/redButton.ts`) — mit **Nachlauf**: sechs
    Sekunden, dann fällt sie von selbst zu.
  - **Flügeltür**, zwei Blätter an ihren Scharnieren, geschaltet vom **Hebel**,
    der **rastet**: auf bleibt auf.
  - **Drucktür**, offen nur, solange etwas auf der **Druckplatte** liegt — man
    selbst, oder die Kiste, die daneben steht. Die Platte löst in *jedem* Bild
    neu aus, in dem sie gedrückt ist; deshalb fällt die Tür anderthalb Sekunden
    nach dem Verlassen zu und nicht unter dem, der darin steht
    (`interact/doorMotion.ts`, mit Test).
  Dazu ein **Kippschalter** an der Westwand für das Deckenlicht, über jeder Tür
  eine Lampe (aus, gelb in Bewegung, grün offen) und hinter der Wand die
  **Schildergalerie**: drei Tafeln, die zeigen, was ein Schild kann — Markdown,
  ein langer Aushang, der von selbst rollt, und der Text, den man selbst
  hineinschreibt. Die Türblätter sind **kinematische** Körper: sie schieben,
  was ihnen im Weg liegt, und niemand schiebt sie. Im Gürtel liegt statt der
  zweiten Portalpistole das **Schild** — in einem Raum, in dem es ums Bedienen
  geht, ist das Werkzeug, das etwas aufschreibt, wichtiger als das zweite, das
  Löcher in Wände schießt.
- **Schilder** (`src/worlds/signs/`, Werkzeug `tools/SignTool.ts`): Tafeln, die
  man irgendwo hinstellt und beschriftet. Sie sind das Gegenstück zur
  Staffelei — die stellt eine Fläche zum _Malen_ hin, das Schild eine zum
  _Lesen_ —, und sie sind das, was eine **Lobby** braucht: Was ein Raum an
  Absprachen, Regeln und Plänen mit sich trägt, steht sonst im Chat und ist
  nach dem dritten Beitritt weggescrollt.
  **Bedienung**: In der Hand ist das Werkzeug eine kleine Tafel am Griff, auf
  der schon steht, was gleich aufgestellt wird. **Trigger** stellt hin — auf
  den Boden kommt das Schild auf einen Pfosten, an eine Wand flach darauf;
  wohin es käme, zeigt ein Umriss in Schildgröße. **A/X** beschriftet: zielt
  man dabei auf ein aufgestelltes Schild, wird dieses beschriftet, sonst der
  Entwurf in der Hand. **Greifen an einem der beiden Traggriffe** nimmt ein
  aufgestelltes Schild wieder auf (dieselbe Geste wie an der Staffelei, und aus
  demselben Grund: ein Schild ist kein Prop und hat keinen Körper, den eine Hand
  fassen könnte). Und mit **leerer Hand** genügt hinzeigen und Trigger — dann
  geht die Tastatur auf. Eine Hand mit einem Werkzeug zeigt hier nicht hin; sie
  hat mit ihrem Trigger etwas anderes vor (`PointerTarget.ignore`).
  **Was auf einer Tafel steht**, ist eine kleine Teilmenge Markdown:
  Überschriften, Aufzählungen (Punkte und Nummern), Zitat, Trennlinie, Code,
  Bild — und in der Zeile fett, kursiv, Code und Links. Sie ist **selbst
  geschrieben und nicht geladen**, und das ist die eine Entscheidung, die hier
  wirklich zählt: Eine Markdown-Bibliothek gibt HTML zurück, und HTML ist in
  einer WebXR-Szene kein Bild. Was man sieht, ist eine **Leinwand**
  (`CanvasTexture`) — der Umweg über ein `foreignObject` in einem SVG malt in
  der Brille entweder gar nicht oder gar nichts mehr, sobald ein fremdes Bild
  darin steckt: Die Leinwand ist dann „vergiftet" und lässt sich nicht mehr als
  Textur hochladen. Deshalb wird jedes Bild mit `crossOrigin = 'anonymous'`
  geladen, und was der Server nicht freigibt, bekommt einen Platzhalter mit
  seinem Alternativtext statt eines schwarzen Schildes.
  Der Weg dahin sind drei Schritte, und nur der letzte kennt eine Leinwand:
  Text → Blöcke (`signMarkup.ts`) → Zeilen mit festen Plätzen
  (`signLayout.ts`) → gezeichnet (`SignBoard.ts`). Alles bis dorthin ist ohne
  Brille prüfbar, und deshalb ist die Höhe, aus der das Rollen seine Grenzen
  zieht, keine geratene Zahl.
  **Einstellbar** ist im Menü unter dem Werkzeug: **Schriftgröße** (in
  Zentimetern _auf dem Schild_, nicht in Pixeln — nur so heißt „4 cm" auf der
  kleinen Tafel dasselbe wie auf der großen), **Markdown an/aus**,
  **Ausrichtung**, **Schriftfarbe** und **Hintergrund** (sechs bzw. sieben, als
  Liste statt als Farbkreis: wer im Headset einen Farbkreis bedienen soll,
  tippt am Ende Zahlen), **automatisches Rollen** (0 bis 16 cm/s, mit Pause
  oben und unten und einem Sprung zurück an den Anfang — rückwärts laufender
  Text liest sich wie ein Fehler), **Rollen von Hand** (Daumenstick der Hand,
  die auf das Schild zeigt; solange sie rollt, wartet das Automatische) und die
  **Maße** der Tafel. Jede Zeile ändert **zweierlei**: das Schild, vor dem man
  steht, und die Vorlage für das nächste — wer die Schrift größer stellt, will
  dieses Schild größer haben und das nächste nicht wieder von Hand einstellen.
  **Über das Netz** geht ein Schild als sieben Felder (Kennung, Fassung, Lage,
  Text, Aussehen, Art der Befestigung): Wer eines aufstellt, stellt es allen im
  Raum auf, und wer später dazukommt, sagt einmal Hallo und bekommt den Bestand
  nachgereicht (`SignRoom.ts`, Kanal `signs`). Dass dabei mehrere antworten,
  ist eingeplant — die höhere **Fassungsnummer** gewinnt, die gleiche verliert
  gegen das Bekannte (`signShare.ts`, mit Test), sonst spränge der Rollstand
  jedes Schildes bei jeder Begrüßung an den Anfang. Was hereinkommt, wird
  geprüft: Ein Schild mit einer Million Zeichen ist keine Nachricht, sondern
  eine stehende Bildrate. **Aufgehoben** werden die **eigenen** Schilder je
  Welt (`signStore.ts`) — die der anderen kommen über das Netz, wenn die
  anderen da sind; sie mitzuschreiben hieße, dass ein längst abgeräumtes Schild
  beim nächsten Besuch wieder an der Wand hängt. Schilder, die zu einer **Welt**
  gehören (die Galerie im Interaktionslabor), gehören niemandem: feste Kennung,
  nicht gespeichert, nicht verschickt — jeder baut dieselbe Halle.
- **Tastatur des Geräts** (`src/core/systemKeyboard.ts`): In der Brille kann
  eine Texteingabe die **Systemtastatur** anfordern — der Meta-Quest-Browser
  blendet seine eigene ein, sobald in einer laufenden WebXR-Sitzung ein
  Eingabefeld des Dokuments den Fokus bekommt (dasselbe gilt für Wolvic und
  Pico). Sie kann Wortvorschläge, Umlaute, Diktat und die gekoppelte
  Bluetooth-Tastatur — alles, was eine selbstgemalte Tafel nie können wird.
  Drei Dinge sind daran wichtig: Sie tritt **neben** die Bordtastatur und nicht
  an ihre Stelle (ob eine Quest sie wirklich einblendet, erfährt kein Programm
  — es gibt kein Ereignis dafür, und eine Eingabe, die auf einer unsichtbaren
  Zusage beruht, hat man dann gar nicht); am **Schreibtisch** bleibt sie aus,
  weil dort die echte Tastatur steht und ein fokussiertes Feld jeden Anschlag
  doppelt zustellte; und **abgeschickt** wird nicht dort, sondern weiter mit
  _Fertig_ auf der Tafel im Raum. Unter _Werkzeuge → Schild → Tastatur_ steht
  die Wahl: _automatisch_, _Systemtastatur_, _Bordtastatur_.
  Das Tastenfeld selbst (`ui/KeyPanel.ts`) hat dafür eine vierte, **mehrzeilige**
  Belegung bekommen — vierzehn Spalten mit Umlauten, Satzzeichen und den
  Zeichen, aus denen Markdown besteht, ein hohes Feld, das die letzten Zeilen
  zeigt, und eine Eingabetaste, die eine **neue Zeile** macht statt abzuschicken
  (fertig ist man mit _Fertig_ oder `Strg`+`Eingabe`).
- **Boden bis zum Horizont**: unter _jeder_ Welt liegt eine Fläche mit Raster,
  einen Kilometer im Quadrat, begehbar und portalfähig (`createGround` in
  `worlds/shared/environment.ts`). Vorher stand jede Welt auf ihrer eigenen
  Platte, und an deren Rand war Schluss — genau die Grenze, die eine Sandkiste
  nicht haben darf. Jetzt läuft man um das Labor herum, sieht sich die
  Kartbahn von außen an und kommt wieder zurück.
- **Rettung aus der Tiefe**: wer trotzdem unter die Welt fällt — durch ein
  Bodenportal, durch eine Ritze, durch einen Handschuh — kommt an derselben
  Stelle wieder heraus, auf dem **höchsten** Punkt, der dort steht. Von unten
  gesucht landete man im Keller eines Hauses, von oben landet man auf seinem
  Dach (`worlds/shared/fallRescue.ts`, mit Test).
- **Welt-Physik** (_Einstellungen → Welt-Physik_): **Schwerkraft**
  (schwerelos, Mond, Mars, Erde, schwer — oder getippt), **Sprungkraft**,
  **Reibung** und **Rückprall**, alles sofort wirksam und im Browser gemerkt
  (`src/core/worldPhysics.ts`, mit Test). _Welt-Standard_ ist eine eigene
  Zeile: der Mond bringt seine 1,62 mit, und eine einmal getippte Zahl darf
  nicht für immer über jeder Welt stehen. Reibung und Rückprall fassen die
  Objekte erst an, wenn jemand sie wirklich verstellt — sonst überschriebe der
  Start jede im Code eingestellte Kleinigkeit (Dominos 0,6, Cubes 0,8).
  Dazu **Körper stößt an**, und das ist ein Schalter: **aus**, wie
  ausgeliefert, bleibt der eigene Rumpf zwar fest — man geht nicht durch Kisten
  und steht weiter auf ihnen —, wirft aber nichts mehr um. Der eigene Körper
  ist das Einzige in der Welt, das man nicht sieht, und er stand ständig in
  etwas drin: der Stapel, an dem man vorbeiging, fiel, und das eben Abgelegte
  war beim Umdrehen weg. Wer Kisten mit dem Knie vor sich herschieben will,
  schaltet die Zeile an. Für die **Hände** gilt das ausdrücklich nicht: mit der
  Hand hinlangen heißt anstoßen wollen.
- **Weltenregistry**: eine neue Welt ist ein Eintrag plus ein Modul.
- **Peer-to-Peer-Sitzungen** (experimentell): beide Geräte tragen denselben
  Raum-Code ein und sind danach direkt verbunden — ohne eigenen Server.
- **Geteilte Welt**: Portale, Würfel und Dominos sind bei allen dieselben —
  wer schießt, wirft oder etwas aus dem Beutel holt, tut das für alle.
- **Zuschauer-Kamera**: Spieler auswählen und zusehen, aus dessen Augen
  (First Person) oder mit weicher Verfolgung von hinten (Third Person). Am PC
  im Panel unter _Zuschauen_, in VR unter **Menü → Verbindung → Zuschauen** —
  beide Seiten haben dieselben Möglichkeiten.

## Steuerung

|                                    | VR                                                                                                                                                                    | Desktop                                                                                         | Handy                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------- |
| Bewegen                            | linker Stick                                                                                                                                                          | `WASD` (`Shift` = schneller)                                                                    | linker Touch-Stick   |
| Sprinten                           | linken Stick reindrücken                                                                                                                                              | `Shift`                                                                                         | –                    |
| Ducken                             | rechten Stick reindrücken                                                                                                                                             | –                                                                                               | –                    |
| Umsehen                            | Kopf, rechter Stick = Snap-Turn                                                                                                                                       | Maus (Klick = Pointer-Lock)                                                                     | wischen              |
| Springen                           | `A` rechts                                                                                                                                                            | `Leertaste`                                                                                     | –                    |
| Menü                               | Button an **beiden** Händen (immer nur eins offen)                                                                                                                    | Button `Menü` im HUD                                                                            | Button `Menü` im HUD |
| Auswählen                          | zielen + Trigger oder `A` — **beide Hände** haben einen Strahl; im Handgelenkmenü löst der Trigger beim **Loslassen** aus, damit Wischen nichts drückt                | Linksklick                                                                                      | tippen               |
| Werkzeug nehmen                    | Grip an der Hüfte halten (jede Hand, jedes Werkzeug)                                                                                                                  | – (immer bereit)                                                                                | –                    |
| Werkzeug ablegen                   | Grip über der Hüfte loslassen                                                                                                                                         | –                                                                                               | –                    |
| Werkzeug weiterreichen             | die leere Hand an den **Griff** der vollen führen (sie leuchtet und öffnet sich), dann greifen                                                                        | –                                                                                               | –                    |
| Werkzeug fallen lassen             | Grip woanders loslassen — es fällt, der Gürtel füllt nach (Budget pro Hüfte, links und rechts stören sich nicht)                                                      | –                                                                                               | –                    |
| Hüften verschieben                 | Gürtel-Justierer nehmen, Hüfte anzielen, Trigger, mit der anderen Hand greifen und schieben (`A`/`X` setzt zurück)                                                    | –                                                                                               | –                    |
| Messer werfen                      | im Schwung loslassen; es fliegt weiter und bleibt stecken                                                                                                             | –                                                                                               | –                    |
| Aufnahme im Eingaberaum            | Knopf auf der Tafelwand startet und beendet sie; **Greifen** setzt währenddessen eine Marke                                                                            | Linksklick auf den Knopf                                                                        | –                    |
| Großer Hammer                      | irgendwo am türkisen Stiel greifen; zweite Hand dazu = zweihändig; **Trigger halten** schiebt die Hand am Stiel; geschlagen wird mit dem Kopf                         | –                                                                                               | –                    |
| Laufrichtung                       | voreingestellt beim Loslaufen gemerkt (Kopfdrehen ändert den Weg nicht mehr); Menü → Bewegung → _Laufrichtung_ schaltet auf Blickrichtung zurück                                                                                                                            | dito                                                                                            | dito                 |
| Haltung (sitzen/stehen)            | Startseite oder Menü → Bewegung → Haltung                                                                                                                             | dito                                                                                            | dito                 |
| Greifen ohne Controller            | Mittel-, Ring- und kleiner Finger an die Handfläche                                                                                                                   | –                                                                                               | –                    |
| Trigger ohne Controller            | Zeigefinger an die Handfläche                                                                                                                                         | –                                                                                               | –                    |
| Portal schießen                    | Trigger der Hand mit der Waffe                                                                                                                                        | Links-/Rechtsklick                                                                              | –                    |
| Zweites Portal (Doppel-Waffe)      | Greifen                                                                                                                                                               | Rechtsklick                                                                                     | –                    |
| Aufheben / werfen                  | Grip mit leerer Hand am Objekt                                                                                                                                        | –                                                                                               | –                    |
| Weitergeben                        | mit der freien Hand danach greifen                                                                                                                                    | –                                                                                               | –                    |
| Anfassen                           | Hand ans Ding, Grip — die Hand leuchtet, wenn sie dran ist                                                                                                            | –                                                                                               | –                    |
| Nahgreifen                         | zielen, Grip: der Gegenstand bleibt liegen und folgt der Hand (Geisterhand zeigt, wo)                                                                                 | –                                                                                               | –                    |
| Ferngreifen                        | zielen, Grip drücken (rastet ein), Hand zum Körper zucken (ab _Zugtempo_, ab Werk 1,25 m/s — _mittel_)                                                                              | –                                                                                               | –                    |
| Nah Gefasstes doch holen           | dasselbe Zucken zum Körper                                                                                                                                            | –                                                                                               | –                    |
| Nah Gefasstes zur anderen Hand     | mit der freien Hand daraufzielen und Grip — die zweite Geisterhand zeigt, dass sie es nimmt                                                                            | –                                                                                               | –                    |
| Reichweiten einstellen             | Menü → Einstellungen → Greifen                                                                                                                                        | dito                                                                                            | dito                 |
| Grafik umstellen                   | Menü → Grafik: _Grafik-Modus_ schaltet im Kreis (Einfach → Comic)                                                                                                    | dito                                                                                            | dito                 |
| Menüseite blättern                 | Stick der zeigenden Hand hoch/runter, **oder** Trigger halten und wischen. Der Stick bewegt dabei nicht den Spieler                                                   | –                                                                                               | –                    |
| Werkzeug-Einstellungen             | im Regal auf die Zeile zielen und **Trigger** (Greifen/`A` nimmt es stattdessen in die Hand)                                                                          | Linksklick auf den Pfeil                                                                        | tippen               |
| Augenhöhe messen                   | Menü → Bewegung → Augenhöhe → _Jetzt messen_, oder die Knöpfe an der rechten Wand im Eingaberaum                                                                      | –                                                                                               | –                    |
| Werkzeug einmessen (Schießgang)    | Werkzeug in den Halter halten — es rastet auf die Scheibe gerichtet ein —, die Hand daran führen und **Greifen oder Trigger**; `A` legt es unverändert zurück         | –                                                                                               | –                    |
| Haltung feinjustieren (Schießgang) | _Feinjustieren_ an der rechten Wand drücken, dann mit der **anderen** Hand ziehen (1/10 der Bewegung); deren Trigger legt fest, `A` bricht ab                         | –                                                                                               | –                    |
| Werkzeug wählen (Schießgang)       | Schild am Halter drücken, dann im Panel vor dir eine Zeile mit **Trigger oder Greifen** — es landet direkt im Halter und **bleibt dort**, bis die Hand wieder aufgeht | –                                                                                               | –                    |
| Verbinden (in der Brille)          | Menü → _Verbindung_ → _Raum betreten_ (Code tippen) oder _Neuen Raum aufmachen_; _Name_ ändert den eigenen Namen — beides geht mitten im Spiel                        | Raum-Code auf der Startseite                                                                    | –                    |
| Chat                               | Menü → _Verbindung_ → _Chat_: letzte Zeilen lesen, _Schreiben_ macht die Tastatur auf; eine Zeile mit Konfig-Code auswählen übernimmt ihn                             | Panel _Verbindung_ → **Chat**: tippen, _Kopieren_ und _Übernehmen_ je Zeile, _Verlauf kopieren_ | dito                 |
| Einstellungen verschicken          | _Werkzeug senden_ / _Alles senden_ an der Wand des Gangs — der Code geht als Chat-Zeile an alle im Raum und steht am PC mit _Kopieren_ daneben                        | –                                                                                               | –                    |
| AR an/aus (Schießgang)             | in den **Kreis** am Halter treten (Hand wird unsichtbar, Welt durchsichtig) oder der Knopf _AR_ an der rechten Wand                                                   | –                                                                                               | –                    |
| Griff einmessen (Schießgang)       | Boxhand am **zweiten** Stand greifen, hinlegen wie sie das Werkzeug umfassen soll, loslassen; `A` bricht ab, der Knopf darunter setzt sie **zurück ans Werkzeug**     | –                                                                                               | –                    |
| Handschuh an blanken Händen        | Knopf _Handschuh_ an der Wand im **Poseraum**, oder Menü → Hände → _Blanke Hände_                                                                                     | –                                                                                               | –                    |
| Knochenfarben                      | Knopf _Knochenfarben_ an der Wand im **Poseraum**, oder Menü → Hände → _Knochenfarben_                                                                                | –                                                                                               | –                    |
| Handpose teilen (Poseraum)         | Werkzeug im **Schwebekasten** loslassen, blanke Hand daran, mit der **Controller-Hand** auf _Handpose teilen_ zeigen; **deren Trigger** speichert                     | –                                                                                               | –                    |
| Schwebekasten feststellen          | Knopf _Schwebe_ an der Wand im **Poseraum** — was darin hängt, steht still und lässt sich nicht greifen; nochmal drücken gibt es frei                                 | –                                                                                               | –                    |
| Geteilte Handpose ansehen          | –                                                                                                                                                                     | `tools.html` → Menü → _Verbinden_, Raum-Code eintragen                                          | dito                 |
| Grundhaltung einmessen             | Boxhand aus dem Werkzeug-Menü nehmen, in den Halter legen, die echte Hand danebenlegen, **Greifen oder Trigger**                                                      | –                                                                                               | –                    |
| Stand stellen (beide)              | Griffe am Ausleger greifen und ziehen: **oben** die Höhe, **unten** der Ort; Loslassen speichert                                                                      | –                                                                                               | –                    |
| Vibration ausprobieren             | Griff auf der Bank links greifen und halten                                                                                                                           | –                                                                                               | –                    |
| Greifhaken                         | Trigger (halten zieht)                                                                                                                                                | –                                                                                               | –                    |
| Gravitationshandschuh              | Trigger zieht, Greifen stößt ab                                                                                                                                       | –                                                                                               | –                    |
| Supermanhandschuh                  | Greifen schwebt, Trigger fliegt; Hand zur Seite oder Kopf drehen = Kurve. Tempo je Richtung und wer welche Achse lenkt: _Einstellungen → Supermanhandschuh_           | –                                                                                               | –                    |
| Translationshandschuh              | Trigger hält aus der Ferne, `A` wechselt Modus                                                                                                                        | –                                                                                               | –                    |
| Größe & Position                   | Trigger wählt, `A` holt die Griffe vor dich                                                                                                                           | –                                                                                               | –                    |
| Griff ziehen                       | Trigger der Werkzeughand oder Trigger/Greifen der freien Hand                                                                                                         | –                                                                                               | –                    |
| Wert eintippen                     | auf eine Taste zielen + Trigger, oder mit dem Finger antippen                                                                                                         | echte Tastatur oder Klick                                                                       | tippen               |
| Lötkolben                          | Trigger setzt Punkte, andere Hand wechselt Modus                                                                                                                      | –                                                                                               | –                    |
| Drohne                             | beide Griffe halten, dann ein Trigger; Sticks fliegen, `A` öffnet das Menü (Modus, Tempo, Drehrate)                                                                   | –                                                                                               | –                    |
| Hängegleiter                       | Trigger oder `A` = Anlauf; Stange ziehen = schneller, drücken = langsamer, kippen = Kurve (eine Hand tiefer, oder das Handgelenk); zweite Hand greift ans andere Ende; am Boden loslassen lässt ihn fallen | –                                                                                               | –                    |
| Flügel                             | beide Arme schlagen = Start und Schub; ausbreiten = gleiten, anlegen = Sturzflug; eine Hand tiefer = Kurve, Hände vor = Nase runter                                   | –                                                                                               | –                    |
| Taschenlampe                       | Trigger schaltet an/aus                                                                                                                                               | –                                                                                               | –                    |
| Lichtkegel stellen                 | mit der anderen Hand vorne an die Linse greifen und nach links/rechts ziehen                                                                                          | –                                                                                               | –                    |
| Dimmer (Dunkelhaus)                | anzielen + Trigger, oder antippen — eine Stufe pro Druck                                                                                                              | anklicken                                                                                       | tippen               |
| Haunting: Station wählen           | –                                                                                                                                                                     | Kachel im Van anklicken                                                                         | antippen             |
| Haunting: Sache aufheben           | hingehen — sie springt in den Auftrag, sobald man nah genug ist                                                                                                       | dito                                                                                            | –                    |
| Haunting: Sachen abgeben           | zurück zum Van, in die Nähe des Tisches                                                                                                                              | dito                                                                                            | –                    |
| Haunting: Sicherungskasten         | anzielen + Trigger, oder antippen — schaltet die halbe Schalttafel frei                                                                                               | anklicken                                                                                       | –                    |
| Haunting: Monster an/aus           | Menü → _Monster_ — startet **aus**                                                                                                                                    | dito                                                                                            | –                    |
| Haunting: neues Haus               | Menü → _Neues Haus_ (nur der VR-Spieler)                                                                                                                              | –                                                                                               | –                    |
| Klettern (Kletterhalle)            | **Greifen** an einem Griff hält dich daran fest (die Hand muss leer sein); Hand herunterziehen = Körper hinauf, loslassen = fallen, mit Schwung im letzten Zug. Solange du hängst, ist der linke Stick aus — der rechte dreht weiter, und die Anker gehen mit | –                                                                                               | –                    |
| Verspreizen (Kamin)                | eine Hand links, eine rechts an den gegenüberliegenden Wänden — und **nah beieinander**, sonst kann man nicht drücken                                                 | –                                                                                               | –                    |
| Sprungkissen (Kletterhalle)        | vom Podest in eines der blauen Kissen springen — es federt den Fall ab, statt ihn anzuhalten; wieder hinauf geht es über seine Rampe                                  | dito                                                                                            | dito                 |
| Halt-Anzeige (Kletterhalle)        | Menü → _Halt-Anzeige_ schaltet die drei Balken ab; _Zurück auf die Matte_ setzt dich mit voller Ausdauer auf den Boden                                                | dito                                                                                            | dito                 |
| Messband                           | Trigger Punkt 1, Trigger Punkt 2                                                                                                                                      | –                                                                                               | –                    |
| Stoppuhr                           | Trigger je nach Modus (Zeit, Einzelbild, Schnellladen), Knopf/`A` öffnet das Panel                                                                                    | –                                                                                               | –                    |
| Pinsel                             | Palette antippen **oder** anzielen + Trigger; Regler (RGB, Breite) gedrückt halten und ziehen; ✕ schließt sie, `A`/`X` öffnet sie wieder; Trigger streicht an, auf einer Leinwand malt er                  | –                                                                                               | –                    |
| Staffelei                          | Trigger stellt sie hin (Kreis am Boden zeigt wohin) und die Hand ist danach frei; **Griff an der Ablage + Greifen** nimmt sie wieder auf; `A`/`X` wischt die Leinwand; gemalt wird mit dem Pinsel                                                          | –                                                                                               | –                    |
| Schild                             | Trigger stellt es hin (Umriss zeigt wohin: Pfosten am Boden, flach an der Wand); `A`/`X` beschriftet das anvisierte Schild, sonst den Entwurf in der Hand; **Traggriff + Greifen** nimmt ein aufgestelltes wieder auf                                    | –                                                                                               | –                    |
| Schild lesen und ändern            | mit **leerer Hand** hinzeigen + Trigger öffnet die Tastatur; Daumenstick derselben Hand rollt den Text                                                                | anklicken (gerollt wird in der Brille)                                                          | tippen               |
| Tastatur (mehrzeilig)              | Tasten anzielen + Trigger; in der Brille kommt, wo es sie gibt, die Systemtastatur des Geräts dazu; `⏎ Zeile` macht eine neue Zeile, `Fertig` übernimmt                | echte Tastatur, `Strg`+`Eingabe` übernimmt, `Esc` bricht ab                                     | tippen               |
| Interaktionslabor                  | roter Knopf öffnet die Schiebetür (sechs Sekunden), Hebel rastet die Flügeltür, Kiste oder Fuß auf der Druckplatte hält die dritte auf; Kippschalter an der Westwand macht das Licht | anklicken                                                                                       | tippen               |
| Effektlabor                        | roter Knopf löst aus; links Kachel wählen und den Schieber ziehen (Trigger halten)                                                                                    | anklicken / ziehen                                                                              | tippen               |
| Duplizier-Waffe                    | zielen + Trigger legt eine Kopie daneben                                                                                                                              | –                                                                                               | –                    |
| Inspektor                          | zielen — das Display liest mit, Trigger sagt es an                                                                                                                    | –                                                                                               | –                    |
| Teleporter                         | zielen, grüner Kreis, Trigger setzt dich dorthin                                                                                                                      | –                                                                                               | –                    |
| Radiergummi                        | Trigger löscht                                                                                                                                                        | –                                                                                               | –                    |
| Sektflasche (aus dem Beutel)       | greifen: sie rastet am Hals in die Faust wie ein Pistolengriff, aufrecht oder über Kopf; kräftig schütteln, und der Korken knallt heraus                              | –                                                                                               | –                    |
| Hirn                               | Knopf/`A` öffnet das Panel (Haut, Hirn, Tempo, Leben, Käfig); zielen + Trigger setzt, was in _Setzen_ steht — oder nimmt weg, worauf du zeigst                          | –                                                                                               | –                    |
| Magischer Beutel                   | in der einen Hand halten, mit der anderen ins Raster fassen oder darauf zeigen: Greifen holt das Ding heraus; geblättert wird mit dem **Trigger** der haltenden Hand, oder über einen der beiden Pfeile (Greifen oder Trigger) | –                                                                                               | –                    |
| Kart: einsteigen                   | Lenkrad greifen, oder anzielen + Trigger                                                                                                                              | Lenkrad anklicken                                                                               | –                    |
| Kart: aus der Box fahren           | Gas geben und nach rechts auf die Gerade ziehen                                                                                                                       | `W`, dann `D`                                                                                   | –                    |
| Kart: Gas / Bremse                 | rechter / linker Trigger                                                                                                                                              | `W` / `S`                                                                                       | –                    |
| Kart: lenken                       | linker Stick — oder das Lenkrad greifen und drehen                                                                                                                    | `A` / `D`                                                                                       | –                    |
| Kart: aussteigen                   | `A`/`X` halten (Balken läuft voll)                                                                                                                                    | `E` halten                                                                                      | –                    |
| Kart: Klemmbrett                   | anzielen + Trigger, Stick blättert                                                                                                                                    | anklicken                                                                                       | –                    |
| Karte holen (Bauplatz)             | Greifen an der Hüfte, an der sie hängt                                                                                                                                | –                                                                                               | –                    |
| Karte (Werkzeug, jede Welt)        | aus dem Regal in die Hand nehmen; **Trigger** schaltet den Maßstab weiter (20 → 40 → 80 → 160 m)                                                                       | –                                                                                               | –                    |
| Grundriss malen                    | an der Palette eintunken, dann Trigger auf der Miniatur **halten** und ziehen — was der Zeiger überstreicht, wird gesetzt                                              | Linkstaste halten und den Blick schwenken                                                       | –                    |
| Fläche füllen                      | Tafel am Modell → _Fläche_, dann zwei Ecken: aufziehen und loslassen, **oder** zweimal tippen. Boden füllt die Fläche, Wand zieht ihren Rand                          | dito                                                                                            | –                    |
| Karte weglegen (Bauplatz)          | über der Hüfte loslassen, oder Menü → _Karte weglegen_ — erst dann steht das Gebaute fest da, und erst dann ist es gespeichert                                        | Menü → _Karte weglegen_                                                                         | dito                 |
| Welt speichern / mitnehmen         | Bauplatz, Menü → _Welt sichern_: im Browser speichern, als Datei exportieren, eine Datei importieren, Gespeichertes verwerfen                                          | dito — Export und Import gehen nur hier sinnvoll                                                | dito                 |
| Kopfbedeckung                      | Menü → _Aussehen_: ohne, Basecap, Helm, Bauhelm, Mütze, Zylinder, Krone — alle im Raum sehen sie                                                                       | dito                                                                                            | dito                 |
| Kart: Helm                         | Klemmbrett → _Helm_: Visierrand steht fest im Blick, gegen Übelkeit                                                                                                    | dito                                                                                            | –                    |
| Kart: Werte eintippen              | Klemmbrett → _Werte eingeben_ → Zeile, dann der Zifferblock vor dem Kopf                                                                                               | dito, mit der echten Tastatur                                                                   | –                    |
| Pizza: Teig kneten                 | Faust auf den liegenden Teig schlagen                                                                                                                                 | –                                                                                               | –                    |
| Pizza: Soße / Käse                 | Kelle bzw. Streuer greifen, Trigger halten                                                                                                                            | –                                                                                               | –                    |
| Zurücksetzen                       | `B` / `Y` oder Menü                                                                                                                                                   | `R` oder Menü                                                                                   | Menü                 |
| Zuschauen                          | Menü → Verbindung → Zuschauen                                                                                                                                         | Panel _Verbindung_ → _Zuschauen_                                                                | dito                 |
| Zuschauer-Kamera drehen            | – (Kopf bleibt deiner)                                                                                                                                                | ziehen mit der Maus                                                                             | wischen              |
| Zuschauer-Abstand                  | Menüeintrag _Abstand_                                                                                                                                                 | Mausrad oder Regler                                                                             | Regler               |

Die Seite einer prozeduralen Hand hängt an genau einer Konstante — `mirror` in
`src/core/HandVisuals.ts`. Sieht die linke Hand im Headset nach einer rechten
aus, ist das Vorzeichen dort das Einzige, was umgestellt werden muss. Wechselt
ein Controller-Slot die Hand, wird das Mesh neu gebaut, sonst behält es die
alte Seite.

**Handgesten** (mit Controllern): Grip = Pistolenhand — damit lassen sich
Dominosteine antippen. Grip + Trigger = Daumen hoch. Kommt etwas Greifbares in
Reichweite, leuchtet es auf und die Hand geht leicht in Griffhaltung.

**Ohne Controller** hat eine Hand gar keine Knöpfe, und ein Pinch musste
früher für alles herhalten — Greifen und Schießen waren dieselbe Geste, und
keine von beiden fühlte sich nach dem an, was sie war. Jetzt werden die zwei
Gesten gelesen, die eine Hand wirklich macht (`src/core/handGestures.ts`, mit
Jest-Test):

- **Greifen** — Mittel-, Ring- und kleiner Finger liegen an der Handfläche.
  Genau das tut eine Hand, die sich um etwas schließt, und Zeigefinger und
  Daumen bleiben frei, wie an einem echten Griff.
- **Trigger** — der Zeigefinger liegt an der Handfläche.

Eine Faust ist beides zugleich, und das ist richtig: eine Faust um einen
Pistolengriff _hält_ ihn und zieht durch. Gemessen wird pro Finger der Abstand
der Spitze zur Handflächenmitte, geteilt durch die Länge der Handfläche —
dieselbe Zahl für eine große und eine kleine Hand, was der ganze Grund dafür
ist, dass es ein Verhältnis ist. Zwei Schwellen (0,78 zu / 1,0 auf) verhindern,
dass ein halb gekrümmter Finger den Trigger flattern lässt. Damit gibt es
`squeeze` auf beiden Eingabearten, und der ganze Rest des Codes muss Hand und
Controller nicht mehr auseinanderhalten. Zum Ausprobieren gibt es den
**Eingaberaum**.

**Jedes** Werkzeug zielt entlang des Pointing-Rays des Controllers, nicht
entlang der Griffachse. Die beiden Posen liegen auf der Quest gut 30°
auseinander — genau so weit schossen Pistole, Pinsel und Co. früher zu hoch.
Die Korrektur steckt jetzt einmal in `Tool.applyAim()` (Mathe in
`src/worlds/portal/tools/aim.ts`, mit Jest-Test), nicht in jedem Werkzeug
einzeln: Ein neues Werkzeug bekommt sie geschenkt und kann sie nicht
vergessen. Wer ein Werkzeug bewusst starr an der Hand haben will, setzt
`alignToAim = false`; eine feste Zusatzneigung (das Drohnen-Display) kommt in
`holdRotation`. Ein **zweihändiges** Werkzeug überschreibt `applyHold` und
spannt sich selbst zwischen die beiden Griffe (die Drohne und der große Hammer
tun das); mit `Tool.claimsHand()` sagt es außerdem, dass die zweite Hand belegt
ist — sonst zieht derselbe Griff nebenbei ein Werkzeug von der Hüfte.

**Woran ein Werkzeug angefasst wird, baut es nicht selbst**, sondern holt es
sich mit `this.mountGrip()` — ein Zylinder mit Fingerrillen, an der Stelle, an
der er in der Faust landet, und die dazu gerechnete Faust gleich mit. Einen
zweiten Griff gibt es nicht mehr: ein Griff ist ein Ort in einer Faust, und
eine Faust hat nur einen. Warum das eine eigene Datei ist und wie schief
die handgesetzten Griffe vorher standen, steht unter _Eingemessene Griffe →
Ein Griff für alle Werkzeuge_.

**Ein Werkzeug, dessen Modell sich im Griff verschiebt, sagt das mit
`Tool.showHeldBy()`** und nicht in `applyHold`. Zwei tun das: die Drohne
schiebt ihr Deck zur Seite, damit der Griff _dieser_ Hand auf dem Ursprung
sitzt, der Hammer schiebt seinen Stiel entlang der Achse. Der Ursprung des
Werkzeugs bleibt dabei, wo er ist — verschoben wird nur, was man ansieht. Nötig
ist die eigene Methode, weil es **drei** Orte gibt, an denen so ein Modell
gestellt werden muss und nur einer davon eine Hand ist: die Hand
(`applyHold`), der **Halter** am ersten Justierstand (`TuneWorld.mountTool`)
und die **Kopie** am Griffstand (`TuneWorld.placeGripHand`). Die beiden
Letzteren hält niemand, also läuft `applyHold` dort nie — und genau daran ist es
einmal schiefgegangen: siehe _Eingemessene Griffe_.

Jede Waffe in der Hand zeigt ihre eigene Vorschau in ihrer Farbe; auf Boden
und Decke richtet sich das Portal nach der Waffe, mit der du zielst.

### Drei Dinge, drei Reichweiten — und ihre Namen

Damit im Code und in Aufträgen dasselbe Wort dasselbe meint, heißen die drei
Arten von Dingen so:

| Deutsch        | Code      | Was es ist                                                         | Was eine Hand damit darf                              |
| -------------- | --------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| **Szenerie**   | `scenery` | Boden, Wände, Rampen, alles Gebaute                                | nichts — man stößt dagegen                            |
| **Gegenstand** | `prop`    | Dominos, Kisten, Bälle: freie Körper ohne vorgesehene Anfassstelle | manipulieren: schieben, drehen, werfen                |
| **Griff**      | `handle`  | Werkzeuggriffe, Gürtelplätze, Standgriffe, Lenkrad — alles Türkise | in die Hand nehmen, an _der_ Stelle, in _der_ Haltung |

Der Unterschied zwischen Gegenstand und Griff ist nicht Größe oder Gewicht,
sondern: **ein Griff weiß, wie man ihn hält, ein Gegenstand nicht.** Deshalb
schnappt der eine in die Hand und der andere bleibt liegen — eine Regel, die
man nicht erklären muss.

Und damit sich das nicht beißt: **Griff** ist immer das _Ding_, **Greifen**
immer der _Vorgang_. Es heißt also nie „der Ferngriff", sondern
**Ferngreifen** — so steht es auch im Menü.

Gegriffen wird in **drei Reichweiten**. Sie unterscheiden sich nicht darin,
_wie_ man greift — gezielt wird immer, gedrückt wird immer derselbe Grip —,
sondern darin, was danach passiert:

| Deutsch         | Code     | Wann                   | Wirkung                  | Zeichen                                         |
| --------------- | -------- | ---------------------- | ------------------------ | ----------------------------------------------- |
| **Anfassen**    | `touch`  | Hand _in_ der Greifbox | fassen                   | **die Hand** leuchtet                           |
| **Nahgreifen**  | `near`   | im Zylinder um dich    | fassen, bleibt wo es ist | Gegenstand leuchtet **+ Geisterhand** daran     |
| **Ferngreifen** | `remote` | Zielstrahl bis 9 m     | holen, kommt geflogen    | Gegenstand leuchtet **+ Strahl** beim Zugreifen |

Die Achse dahinter ist es wert, benannt zu werden: **fassen** heißt, das Ding
bleibt, wo es ist, und folgt der Hand von dort; **holen** heißt, es kommt zu
dir. Ein Gegenstand wird nah gefasst und fern geholt; ein **Griff wird immer
geholt**, auf jeder Entfernung — ein Werkzeug anderthalb Meter vor sich in der
Luft zu dirigieren hilft niemandem, und es hat ja eine eingemessene Haltung,
die es haben will.

Die Greifbox ist der Collider plus 9 cm — ein fester Zuschlag, kein
prozentualer, damit ein Dominostein genauso gut in die Hand springt wie ein
Companion Cube.

**Was im Spieler steckt, ist für den Spieler nicht da.** Aus dem magischen
Beutel kommt ein Objekt genau dort, wo die Hand ist, und die ist beim
Herbeirufen selten weit vom Körper weg. Ließ man los, lag eine Kugel mitten in
der Spielerkapsel — und Rapier tat, was ein Physikmotor tun muss: es löste die
Durchdringung auf. Bei einem halben Meter Überlappung heißt das in _einem_
Schritt, und dann war die Kugel quer durch die Halle geflogen, bevor man sie
fallen sehen konnte.

Getragene Objekte ignorierten die Kapsel längst (`PhysicsWorld.setCarried`);
neu ist, dass das beim **Loslassen nicht sofort aufhört**. Ein losgelassenes
Ding bleibt für den Spieler weich, bis es wirklich draußen ist
(`physics/playerClearance.ts`, mit Test) — dann fällt es durch den eigenen
Körper auf den Boden, statt weggeschossen zu werden. Dasselbe gilt für **jeden
frisch gebauten dynamischen Körper** (`addDynamic`): ein fallengelassenes
Werkzeug entsteht buchstäblich in der Hand, und die ist am Körper.

**Zum Spieler gehören seine Hände.** Die Sonde an der Fingerspitze ist ein
fester kinematischer Kasten, der Gegenstände umstoßen soll
(`PortalWorld.placeProbe`) — und was man gerade loslässt, steckt per Definition
darin. Daran flog jeder fallengelassene Gegenstand davon, auch weit weg vom
Rumpf: die Kapsel war längst geräumt, die Faust nicht. Die Räumung rechnet
deshalb gegen Kapsel **und** Hände, und wer die Sonden setzt, meldet sie der
Physik (`PhysicsWorld.setPlayerHand`). Die Hand soll stoßen, wenn man mit ihr
hinlangt; sie soll nichts stoßen, was man eben erst aus ihr entlassen hat.

**Der Rumpf stößt gar nichts mehr an.** Der Kinematik-Controller gab bis
hierher Impulse an alles ab, wogegen er lief
(`setApplyImpulsesToDynamicBodies`); jetzt tut er das nur noch, wenn _Körper
stößt an_ eingeschaltet ist (`PhysicsLocomotion.pushesProps`,
`worldPhysics.bodyPush`). Fest bleibt er in beiden Fällen: man geht nicht durch
eine Kiste und steht weiter auf ihr — sie fliegt nur nicht mehr weg.

Dass es dabei einen Augenblick lang durch die eigenen Füße fällt, ist kein
Preis, sondern dasselbe Prinzip von der anderen Seite. Deshalb steht dort auch
**keine Zeitschranke**: eine, die abläuft, während das Ding noch drinsteckt,
holt genau den Stoß zurück, um den es geht. Die Kapsel selbst schreibt
`PhysicsLocomotion` jedes Bild in die Physik — sie ändert sich mit jedem
Schritt und jeder Kniebeuge.

**Gezielt wird auf allen drei Reichweiten.** Der Zielstrahl trifft die
tatsächliche Box eines Gegenstands — plus etwas Rand und einen Kegel, der mit
der Entfernung aufgeht, so dass ein weit entfernter Dominostein erreichbar
bleibt, ohne einem näheren Gegenstand das Ziel wegzunehmen. Nur die erste
Stufe zielt nicht: steckt die Hand in einer Greifbox, ist das die Antwort,
ohne dass irgendwohin gezeigt werden müsste.

Dass auch das **Nahgreifen** zielt, ist keine Bequemlichkeit, sondern der
Grund, warum die drei Stufen sich nicht in die Quere kommen. Nähme das
Nahgreifen einfach den nächstgelegenen Gegenstand, hätte man den Dominostein
vor dem eigenen Fuß in der Hand, während man quer durch die Halle auf eine
Kiste zielt — und käme an das Ferngreifen praktisch nie mehr heran. So gibt es
pro Hand **genau einen** Kandidaten, es leuchtet **genau einer**, und die
Stufe liest man an der Zugabe ab: leuchtende Hand, Geisterhand oder Strahl.
Der Zylinder ist dann kein Fangnetz, sondern nur die Grenze, ab der aus
_fassen_ ein _holen_ wird.

**Nahgreifen** (Einstellungen → Greifen, standardmäßig an) fasst alles im
Zylinder um den Spieler — **1,40 m** im Rund, 2,10 m hoch, beides einstellbar.
Ein Zylinder und keine Kugel um die Hand, weil „muss ich mich bücken?" eine
Frage an den **Körper** ist: der Dominostein vor den Füßen liegt außerhalb
jeder Kugel um eine Hand, die auf Hüfthöhe hängt, und ist genau der Fall, um
den es geht. Der Boden kommt dabei vom Rig (`getFloorY`) und nicht aus
`position.y` — wer sich duckt, sinkt, der Fußboden nicht.

Ab Werk stand hier einmal **ein Meter**, gerechnet auf den Boden vor den
eigenen Füßen. Genau dort braucht man die Geisterhand aber am wenigsten: Was
einen Meter weit weg liegt, hebt man auf. Sie ist das bessere Werkzeug einen
Schritt weiter — der Dominostein auf dem Tisch gegenüber, die Kiste neben dem
Regal —, und dafür muss der Zylinder so weit reichen, wie ein Mensch ohne
hinzugehen noch zeigt.

**Der Nahgriff ist verstärkt**: Der Gegenstand fährt **anderthalbmal** so weit
wie die Hand, die ihn führt (_Einstellungen → Greifen → Nahverstärkung_,
`scale`, in Prozent gespeichert und als „1,5-fach" gelesen; 100 heißt „eins zu
eins" und ist der alte Zustand). Der Grund ist derselbe wie beim größeren
Radius: Der Zylinder reicht weiter, als ein Arm langt. Vor dem Körper legt eine
Hand einen halben Meter zurück, der Gegenstand anderthalb Meter weiter soll
aber über den ganzen Tisch — die Verstärkung schließt genau diese Lücke, und
eine Handbreit an der Hand sind anderthalb am Dominostein.

Verstärkt wird nur die **Verschiebung**, in beiden Betriebsarten
(`pivotGrab` rechnet den Faktor mit, `stretchGrab` legt dem starren Griff den
Zuschlag drauf). Die Drehung bleibt Grad für Grad — ein verstärktes Handgelenk
wäre wieder der lange Arm mit dem Ausschlag, den der Drehpunkt an der
Geisterhand gerade beseitigt hat. Und in der **Faust** gilt sie nicht: dort
_ist_ die Hand am Gegenstand, und ein Würfel, der weiter fährt als die Faust,
die ihn hält, wäre kein Griff mehr, sondern ein Fehler.

Ein nah gefasster Gegenstand **fliegt nicht**. Er bleibt liegen, wo er liegt,
und folgt der Hand von dort, als hätte man ihn dort angefasst. Wie er das tut,
steht unter _Im Nahgriff_, und es sind zwei Betriebsarten:

- **Wie die eigene Hand** (Vorgabe): der Gegenstand hängt starr an der
  **Geisterhand**, und die tut Bild für Bild dasselbe wie die echte. Die Hand
  verschiebt eins zu eins, und ihre Drehung dreht den Gegenstand um genau den
  Punkt, an dem die Geisterhand ihn hält — als läge sie dort an ihm. Aus einem
  Grad am Handgelenk wird ein Grad am Würfel, ganz gleich, wie weit er weg
  liegt.
- **Starr wie in der Faust**: dieselbe Matrix wie in der Faust. Die ehrlichere
  Antwort auf „ich habe einen langen Arm" — und die unbrauchbarere, denn auf
  einen Meter wird aus jedem Grad am Handgelenk ein Ausschlag, und ein Zittern
  an der eigenen Hand zum Schlenkern am Gegenstand. Damit stellt niemand einen
  Dominostein auf.

Eine dritte gab es einmal, die _Drehung um die Objektmitte_: dieselbe Rechnung
wie heute, nur mit dem Drehpunkt in der Mitte des Gegenstands statt dort, wo
die Hand ihn anfasst. Sie ist in der Vorgabe aufgegangen — ein Drehpunkt, den
man sieht, ist besser als einer, den man sich denkt.

**Ferngreifen** (standardmäßig an) erweitert das auf 9 m und läuft in zwei
Schritten. Was getroffen ist, leuchtet auf. Mit **Grip** rastet es ein: Es
bleibt markiert, auch wenn die Hand woanders hinzeigt, und ein dünner Strahl
zwischen Hand und Gegenstand sagt, dass jetzt gezogen werden kann. **Zuckst du
die Hand danach zum Körper** — schneller als das eingestellte _Zugtempo_,
ab Werk 1,25 m/s —, kommt der Gegenstand geflogen und landet in der Hand.

Dasselbe Zucken holt auch einen **nah gefassten** Gegenstand doch noch
her — eine Geste, drei Entfernungen. Im Nahbereich hat man damit die Wahl:
dort lassen und manipulieren, oder zu sich reißen und in die Hand nehmen.

**Ein nah gefasster Gegenstand wechselt die Hand.** Was die eine Hand da
draußen führt, darf die andere anvisieren: Ihre Geisterhand stellt sich daneben
wie bei jedem anderen Ziel, und mit dem Grip übernimmt sie — dieselbe Übergabe
wie in der Faust, nur auf Armlänge plus Zylinder. Die Geisterhand der abgebenden
Hand geht dabei weg; zwei Geister an einem Ding sagen nichts mehr. So dreht man
einen Gegenstand über beide Hände weiter, statt ihn fallen zu lassen und neu zu
zielen.

Zwei Grenzen stehen dazu (`PortalWorld.takeable`): Was **in der Faust** steckt,
wechselt weiter nur von Hand zu Hand und nicht über den Strahl — ein Ding aus
der eigenen Faust quer durch den Raum anzuvisieren ist kein Wechsel, sondern
ein Versehen. Und das Ziel muss **im Zylinder** liegen, sonst wäre es ein
Ferngriff auf etwas, das eine andere Hand jedes Bild woandershin schreibt, und
beide zögen daran. Für ein **Werkzeug**, das zielt, bleibt alles, was in einer
Hand steckt, ohnehin vergeben.

Vorher war das ein **Winkel**: Handgelenk um 30° nach oben kippen. Eine Geste,
die man sich merken muss — und die beim Hantieren von selbst losging, denn wer
die Hand mit einem gefassten Ding hebt, kippt sie dabei. Ein Zucken zum Körper
ist die Bewegung, mit der ein Mensch etwas an sich zieht; die muss niemand
lernen.

Gemessen wird nicht das Tempo der Hand im Raum, sondern das **Näherkommen**:
`(Abstand vorher − Abstand jetzt) / Zeit`, gegen den Kopf, gemittelt über 50
Millisekunden (`worlds/portal/pullGesture.ts`, mit Test). Damit fällt zweierlei
von selbst weg — wer **geht**, nimmt die Hand mit und zuckt nicht, und wer die
Hand **quer** vor sich herzieht, kommt dem Körper nicht näher. Gemittelt statt
tiefpassgefiltert, weil ein Tiefpass eine Schwelle, die in Metern je Sekunde
angeschrieben steht, still nach unten zöge: eine kurze Bewegung liefe nie ganz
durch ihn hindurch.

Das **Zugtempo** steht im Menü unter _Einstellungen → Greifen_ und ist eine
Zahl wie jede andere dort (`core/grabSettings.ts`, `pull`, in Zentimetern je
Sekunde gespeichert und in Metern je Sekunde gelesen). Die Zeile schaltet
**fünf benannte Tempi** durch, je 25 cm/s auseinander (`PULL_STEPS`):

| sehr langsam | langsam | **mittel (ab Werk)** | schnell | sehr schnell |
| ------------ | ------- | -------------------- | ------- | ------------ |
| 0,75 m/s     | 1,0 m/s | **1,25 m/s**         | 1,5 m/s | 1,75 m/s     |

Der Name steht in der Zeile hinter der Zahl — „1,25 m/s · mittel" —, denn
zwischen zwei Rasten liegen 25 cm/s, und „schnell" sagt mehr als der Abstand
zur vorigen Zahl. Gelesen wird mit **zwei Nachkommastellen**, weil eine sie
verfälschte: 125 cm/s las sich gerundet als „1,3 m/s", und die nächste Raste
danach ebenfalls als „1,5".

Vorher lagen die Rasten bei 0 → 4 → 8 → 12 m/s, ab Werk auf 8 — und das ist
ein Schlag und kein Zucken: Wer den Arm zum Körper zieht, kommt selten über
anderthalb Meter je Sekunde, und so ging das Ferngreifen bei den meisten
schlicht nie los. Weil das Menü die ganze Seite speichert, sobald irgendetwas
darauf verstellt wird, stünden die alten 800 cm/s bei fast allen im Speicher
und die neue Vorgabe käme nie an — **genau dieser eine Wert wird beim Lesen
auf 125 gezogen** (`LEGACY_PULL`). Der Preis dafür: Eine von Hand getippte 800
wird ebenso gezogen; 790 und 810 bleiben stehen.

**Eine neue Vorgabe kommt sonst nie an**, und das ist der allgemeine Fall
hinter dem Sonderfall oben: Weil das Menü die ganze Seite speichert, steht bei
fast jedem auch das im Speicher, was er nie angefasst hat. Der Speicher trägt
deshalb eine **Fassungsnummer** (`version`, `VERSION`, `migrate`): Sie sagt,
gegen welche Vorgaben ein Stand geschrieben wurde, und ältere werden **einmal**
nachgezogen — so kam der neue Nahradius von 1,40 m bei denen an, die noch den
alten Meter gespeichert hatten. Der Weg über den Wert selbst (`LEGACY_PULL`)
ging dort nicht: 100 ist eine **Raste** der Zeile, und wer sie absichtlich
anklickt, muss sie behalten dürfen. Jede geschriebene Seite trägt ab jetzt die
aktuelle Nummer; wer eine Vorgabe ändert und sie ankommen lassen will, zählt
sie hoch und schreibt den Fall in `migrate`.

_Werte eingeben_ nimmt weiterhin jede Zahl von 0 bis 2000 cm/s, und
**0 heißt „ohne Zucken"**: dann kommt der Gegenstand, sobald der Grip sitzt —
das alte Verhalten für alle, denen die Geste im Weg ist. Die Null steht nur
nicht mehr im Ring der Zeile: Sie ist eine Betriebsart und keine
Geschwindigkeit.

**Die Geisterhand** steht dort, wo die echte anfassen würde: am Trefferpunkt
des Strahls, mit der Drehung der echten Hand, halbtransparent und türkis. Sie
ist erkennbar _deine_ Hand an einem anderen Ort, und das ist die ganze
Nachricht — deshalb ist sie auch in derselben Bauart wie die, die man gerade
in der Brille sieht: Boxhand am Controller, Kugelglieder beim Handtracking
(`HandVisuals.lookOf`). Solange nur gezielt wird, wandert sie mit dem Strahl;
mit dem Zugriff friert sie am Gegenstand fest und fährt von da an mit ihm mit.
Sie hängt dabei in der Welt und nicht am Gegenstand — ein Gegenstand kann
verschwinden, und ein Geist, der mit ihm entsorgt wird, nimmt seine Geometrie
mit ins Grab.

Der Flug ist bewusst _keine_ Physik: eine feste Bahn über eine feste Zeit, und
das Objekt geht dabei durch alles hindurch. Eine ballistische Kurve sieht
schöner aus, bis sie unterwegs an einer Kiste hängen bleibt — und ein
Ferngriff, der nicht ankommt, ist schlimmer als gar keiner. Die Bahn wird
jeden Frame gegen die _aktuelle_ Handposition gerechnet, eine Hand, die sich
bewegt, zieht das Objekt also mit. Genau das prüfen die Jest-Tests.

### Die Waffe

Jeder Wert der Pistole steht in `src/worlds/portal/tools/weaponSettings.ts` mit
Bereich und Einheit. Eine Menüzeile schaltet auf die nächste Raste weiter und
zeigt dabei, wo sie steht (`Stärke: stark · 0.14 kg`); _Werte eingeben_ öffnet
für dieselbe Größe die Tastatur, und alles dazwischen ist erlaubt, solange es
im Bereich liegt. Eine Zahl, die auf keiner Raste liegt, bricht das
Weiterschalten nicht: die nächste Raste ist die erste _oberhalb_ des aktuellen
Werts (mit Test).

**Zielhilfen** liegen als Raster im Menü — und weil in eine Rasterzelle zwei
Wörter passen, steht über dem Panel eine Zeile darüber, worauf gerade gezeigt
wird. Zur Wahl stehen _alles ab_, **Rotpunkt** (der Punkt sitzt 25 m weit
draußen und wird auf Größe skaliert, wandert beim Kopfbewegen also nicht),
**Kimme & Korn**, **Flugbahn** (rechnet die Parabel der nächsten Kugel voraus
und markiert, wo sie aufschlägt), das **Röntgengerät** (derselbe Scanner wie
das Handgerät, nur klein — beide benutzen `XrayScope`) und das **Fernrohr**.

Das **Fernrohr** vergrößert wirklich: eine zweite Kamera sitzt vorne im Rohr,
schaut die Rohrachse entlang und zeichnet die Szene in ein Render-Target, das
auf der hinteren Linse liegt — dieselbe Mechanik wie das Drohnendisplay
(`Attachment.renderFeed`, aufgerufen von `PortalWorld.render`). Die
Vergrößerung _ist_ damit der Öffnungswinkel dieser Kamera: 58° geteilt durch
den Faktor. Man nimmt das Okular ans Auge wie bei einem echten Zielfernrohr;
die Kamera sitzt deshalb vorn und nicht hinten, sonst fotografierte das Rohr
sich selbst und den halben Lauf. Der Zoom steht als eigene Menüzeile
(_Zoom_) und als Zahl unter _Werte eingeben_ (1 bis 60).

Die Rasten fangen bei **16×** an und gehen in Vierer-Schritten bis 36×, und
16× ist auch der Auslieferungswert. Der Grund ist ein optischer: das Bild im
Rohr liegt einen Meter vor dem Auge und das Auge hat den ganzen Raum daneben
zum Vergleich, deshalb sieht ein 4×-Zielfernrohr in der Brille aus wie eine
Lupe auf Armeslänge. Erst bei 16× liest es sich als das, was es ist.

**Munition**: normal oder **Leuchtspur**. Eine Leuchtspurkugel glüht und zieht
eine kurze Linie hinter sich her, so dass man einem Schuss zusehen kann,
statt ihn nur zu hören.

**Schaden** ist eine eigene Zeile und absichtlich **nicht** die Stärke. Die
Stärke ist die Masse der Kugel: Sie schiebt eine Kiste, wirft einen Dominostein
und lässt den Schuss auf 50 m fallen — das ist Physik. Der Schaden ist eine
Spielregel: Was ein **Rumpftreffer** einem NPC abzieht, und ein Kopftreffer das
Vierfache davon (`npc/npcHit.ts`, `HEAD_FACTOR`). Ausgeliefert wird **25**, und
diese Zahl ist keine gewürfelte: Ein Zombie hat hundert Leben
(`npc/npcKinds.ts`), also braucht er **vier Schuss in den Rumpf oder einen in
den Kopf**. Genau diese Regel begreift man nach dem dritten Schuss von selbst,
und genau sie hält `npcHit.test.ts` fest. Die Rasten (10 · 25 · 50 · 100 · 200)
laufen an den Leben der NPCs entlang; jede Zahl von 1 bis 1000 geht unter
_Werte eingeben_.

**Ducken und Sprinten** hängen an den Sticks: rechten Stick reindrücken duckt,
linken Stick reindrücken sprintet. Unter **Menü → Bewegung** lässt sich für
beide einstellen, ob gedrückt gehalten oder umgeschaltet wird (Ducken schaltet
standardmäßig um, Sprint wird gehalten), dazu Sprint-Tempo und Duck-Tiefe.

**Die Laufrichtung wird beim Loslaufen gemerkt** (`core/walkFrame.ts`, mit
Test), und das ist die Voreinstellung. Der Stick schob seit jeher entlang der
Blickrichtung, und beim *Losgehen* ist das auch genau richtig: Man schaut hin,
wo man hinwill, und drückt nach vorn. Falsch wird es im nächsten Moment, beim
Weitergehen — wer über die Schulter zurückschaut, ob ihm jemand folgt, oder
beim Laufen nach links auf ein Schild sieht, dreht damit seinen ganzen Weg mit.
Man kommt nie dort an, wo man hinwollte, und lernt sich an, den Kopf beim Gehen
stillzuhalten, was in einer Brille ungefähr das Gegenteil von dem ist, wofür
man sie aufsetzt. Also: Die Blickrichtung wird beim Loslaufen gemerkt und
bleibt stehen, solange der Stick ausgelenkt ist; beim Loslassen ist die Marke
weg, und der nächste Schritt geht wieder dorthin, wo man gerade hinsieht. **Der
Snap-Turn dreht die Marke mit** — bliebe sie stehen, liefe man nach einer
Vierteldrehung seitwärts weiter und wüßte nicht, warum. Wer es anders mag,
stellt unter **Menü → Bewegung → Laufrichtung** auf _Blickrichtung_ zurück; das
ist das alte Verhalten, Zeile für Zeile.

Geduckt wird, indem das ganze Rig sinkt — im Headset gehört die Kamera der
Brille, nicht uns, also ist das der einzige Weg. Die Füße bleiben trotzdem
stehen: `PlayerRig.getFloorY()` rechnet die Absenkung wieder drauf, und die
Charakter-Kapsel wird um genau denselben Betrag kürzer, weil sie ihre Höhe aus
`getHeadHeight()` nimmt. Eine Kapsel wird um ihre Mitte kleiner, deshalb wandert
die Mitte um die halbe verlorene Höhe mit nach unten — sonst hebt der Spieler
beim Ducken ab.

**Die Griffe von _Größe & Position_** erscheinen dort, wo die Hände sind, und
nicht am Objekt: Trigger wählt aus (mehrfach für mehrere), `A` holt die Griffe
vor dich. Pfeile verschieben, Kugeln skalieren eine Achse, die weiße Kugel in
der Mitte alles zusammen; eine dünne Linie zeigt, an welchem Objekt sie gerade
hängen, und ein kleines Display die Maße. Gezogen wird mit dem Trigger der Hand,
die das Werkzeug hält, oder mit Trigger _oder_ Greifen der freien Hand.

Die Achsen sind die **des Objekts**, aber in der Reihenfolge deiner Sicht: die
Objektachse, die am ehesten nach rechts zeigt, wird der rechte Pfeil, und so
weiter (`src/worlds/portal/tools/axisMatch.ts`, mit Jest-Test — inklusive der
Spiegelung, die sonst aus der Drehung eine ungültige Matrix machen würde).
Damit bleibt „breiter, aber nicht höher" auch für eine schief stehende Kiste
möglich, ohne dass der Pfeil dafür in eine andere Richtung zeigt als er aussieht.
Skaliert wird über das _Verhältnis_ zweier Abstände zur Mitte statt über eine
Differenz — wo genau die Hand die Kugel erwischt hat, ist damit egal.

Die **Werkzeug-Pose** (`holdPosition`, `holdRotation`) wird nicht mehr geraten,
sondern im **Schießgang des Eingaberaums** gemessen: das Werkzeug rastet im
Halter auf die Scheibe gerichtet ein, du führst die Hand daran, wie sie es
halten soll, und beim Trigger rechnet `src/worlds/portal/tools/toolPose.ts`
(mit Test) die Pose aus, die genau das ergibt — abzüglich der Aim-Korrektur,
die jedes Werkzeug ohnehin bekommt. Die Zahlen erscheinen auf der Werte-Tafel
und in der Meldung, so wie sie in den Konstruktor gehören; bis dahin merkt sich
der Browser sie (_Einstellungen → Werkzeug-Posen zurücksetzen_ wirft sie wieder
weg).

Ein **Justier-Werkzeug**, das dasselbe in der Luft tat, gab es einmal und gibt
es nicht mehr. Es konnte alles — Werkzeuge, Hände, Anbauteile —, aber gegen
nichts: das Vergleichsstück hing an einem ausgestreckten Arm und zitterte mit.
Der Stand steht still, und das ist der ganze Unterschied zwischen „ungefähr"
und „gemessen".

Die Pose eines **Anbauteils** liegt im Raum **des Werkzeugs** (nicht der Hand),
deshalb bleibt ein einmal ausgerichteter Rotpunkt ausgerichtet, egal wie die
Waffe später gehalten wird.

### Das Gokart

Ein Kart ist sieben reine Module und ein bisschen Verdrahtung:
`kartSettings.ts` (die Werte samt Bereich, Raste und Einheit — dieselbe Idee
wie `weaponSettings.ts`), `kartDynamics.ts` (ein Schritt Fahren),
`kartCourse.ts` (die Strecke als Liste von Bauteilen), `kartTrack.ts` (die
Mittellinie plus halbe Breite plus die Fläche der Boxengasse), `kartPit.ts`
(der Grundriss der Gasse), `kartView.ts` (der Nachlauf des Kopfes) und
`kartRace.ts` (Runden, Reihenfolge, Tafel). Alle sieben ohne
three.js und mit Jest-Test; `Kart.ts` und `KartWorld.ts` sind nur noch Blech.

**Die Strecke ist gebaut und nicht gezeichnet.** Sie war einmal ein Dutzend
Kontrollpunkte in Metern mit einem Catmull-Rom-Spline darüber — eine hübsche
Linie, deren Lage man nur in der Brille nachsehen konnte, die nirgends am
Raster lag, und bei der „mach die Gegengerade zwei Zellen länger" hieß, zwei
Punkte zu verschieben und zu hoffen. Jetzt ist sie eine **Liste von Teilen**
(`kartCourse.ts`), und ein Teil kennt drei Dinge: seine Sorte (Gerade, links,
rechts), wie lang bzw. wie eng es ist, und wo es aufhört. Daraus folgt alles
Übrige — Mittellinie, Ausmaße, Rundenlänge, Asphalt, Randsteine, Reifenstapel.

Drei Zahlen tragen das Ganze, und alle drei sind Kacheln:

- **Eine Zelle sind vier Kacheln** (10 m) — so lang ist eine Gerade.
- **Die Fahrbahn ist vier Kacheln breit**, und der Asphalt ist **genau** so
  breit wie der Korridor. Wäre er schmaler, läge zwischen ihm und dem Rand ein
  Streifen, der auf dem Raster zur Strecke gehört und beim Fahren nicht — und
  die Boxengasse daneben hätte eine unsichtbare Lücke, durch die niemand
  hindurchkommt.
- **Eine Kurve ist ein Viertelkreis, und ihr Radius ist ihr Versatz**: Wer mit
  Radius `r` abbiegt, kommt `r` Kacheln weiter vorn und `r` weiter zur Seite
  heraus. Aus dieser einen Zeile folgt, ob eine Runde sich schließt, und der
  Test rechnet es nach, statt es zu glauben.

Weil alle Maße ganze Kacheln sind, liegt **jede Naht auf einer Kachelkante** —
und genau deshalb passen Strecke, Boxengasse und Grundriss ohne einen einzigen
krummen Zwischenwert zusammen. Die gefahrene Bahn hat vier Kurven mit vier
verschiedenen Radien (15, 15, 10 und 20 m): eine, die man voll fährt, zwei
mittlere und eine enge, in der ein Kart mit wenig Traktion querstellt. Das
Format ist bewusst das, was eine spätere **Bauwelt** bearbeiten kann: ein Teil
anhängen, eine Kurve enger machen, eine Gerade kürzen.

**Die Boxengasse** liegt kachelbündig an der Zielgeraden (`kartPit.ts`): vier
Buchten unter einem Dach, dazwischen je eine Säule, an jeder Rückwand eine
Portaltafel, davor der Asphalt der Gasse — und darauf die vier Karts, mit der
Nase in Fahrtrichtung. **Eine Ein- und eine Ausfahrt gibt es nicht**, und das
ist keine Auslassung: Die Ostkante der Gasse *ist* der Westrand des
Streckenkorridors, die beiden Flächen berühren sich also, und wer in einer von
beiden ist, wird nicht zurückgeschoben (`confineToCourse`). Losfahren heißt
damit schlicht: das Lenkrad nach rechts. Nach vorn hört die Gasse auf, und dort
steht eine Mauer — eine Grenze, die man nicht sieht, ist eine, in die man
fährt.

**Der Boden ist eine Masse und keine tausend Kacheln**, aus demselben Grund wie
im Schießstand: Tausend Bodenplatten wären tausend Körper in der Physik für
eine Wiese, über die man geradeaus fährt, und portalfähig kann ohnehin nur eine
große Fläche sein. Die Navigationskarte kostet das nichts — sie wird aus der
gebauten Geometrie abgetastet, und eine Masse ist Geometrie wie jede andere.

**Zu zweit fahren.** Vier Karts standen auf dem Start, aber jeder bewegte nur
seine eigenen: zwei Leute konnten nebeneinander herfahren, ohne voneinander
etwas zu sehen — bei einer Rennstrecke ungefähr das Gegenteil dessen, wofür sie
gebaut ist. Jetzt läuft die Welt über einen eigenen Kanal (`kart`):

- **Wer einsteigt, beansprucht den Platz** (`seat`), und über einem fremden
  Kart steht _Besetzt · Name_ statt „Lenkrad greifen zum Einsteigen". Greifen
  zwei im selben Moment zu, gewinnt die kleinere Peer-Id — dieselbe Antwort auf
  beiden Rechnern, ohne Wahl und ohne Server.
- **Gerechnet wird ein Kart nur dort, wo jemand darin sitzt.** Das ist die
  einzige Stelle, an der Gas, Bremse und Lenkung wirklich bekannt sind; alle
  anderen bekommen zwanzigmal in der Sekunde die Pose und laufen ihr weich
  hinterher. Ein verlorenes Paket ist damit ein Ruckler und kein Kart, das
  durch die Leitplanke kriecht. Das ist bewusst **nicht** das Wirt-Modell der
  Props (`PortalSync`): dort rechnet einer für alle, hier rechnet jeder sein
  eigenes Kart, weil die Eingaben nun einmal an der Hand hängen.
- **Die Tafel wird zur Zeitnahme**: allein zeigt sie die eigene letzte und
  beste Runde, im Feld die Reihenfolge — mehr Runden zuerst, bei gleicher
  Runde der weiter Gekommene, die eigene Zeile mit einem Pfeil markiert
  (`kartRace.ts`, mit Test). Eine gefahrene Runde meldet danach nicht nur die
  Zeit, sondern auch den Platz: im Rennen ist das die eigentliche Auskunft.
- **Was noch fehlt:** zwei Karts fahren durcheinander hindurch. Beide sind für
  die Physik kinematisch, und zwei kinematische Körper stoßen sich in Rapier
  nicht — Kegel und Kisten schieben sie weiterhin beide.
- **Und noch etwas:** Beim Lenken mit dem *Lenkrad in der Hand* wandert die
  virtuelle Hand um den Kranz, solange der Kopf nachzieht — das Lenkrad hängt
  am Kart, die Hand am Rig, und die beiden drehen sich nicht mehr im selben
  Bild. Die **Eingabe** stimmt trotzdem, weil sie gegen den Blick gemessen wird
  (`Kart.handAngle`); es sieht nur aus, als rutschte die Hand. Wer lieber am
  Lenkrad lenkt, stellt den Nachlauf auf `0`, und die Frage stellt sich nicht.

**Das Fahrmodell** ist bewusst klein und arkadig: Gelenkt wird wie beim
Fahrrad — Gierrate = Tempo · tan(Einschlag) / Radstand, also dreht ein
stehendes Kart nicht. Die Drehung dreht das _Kart_, nie seine Geschwindigkeit;
was dabei seitlich übrig bleibt, ist der Drift, und die **Traktion** sagt, wie
schnell die Reifen ihn wieder auffressen. Gas, Bremse und Widerstand fassen nur
den Vorwärtsanteil an. Zum Rollwiderstand gehört ein konstanter Anteil, sonst
_nähert_ sich ein losgelassenes Kart dem Stillstand nur an und kriecht
minutenlang weiter.

**Ein Reifen hat ein Budget.** Die Traktion allein beschreibt einen, der immer
gleich gut hält — und das war der eine Punkt, an dem sich ein Kart nicht wie
eines anfühlte. Was er längs überträgt, fehlt ihm quer: Wer aus der Kurve
heraus voll aufs Gas geht, dreht durch; wer voll in sie hineinbremst,
blockiert. Genau das ist der **Reifenschlupf** (`slip`, 0 bis 1). Das Gas
dreht die Reifen dabei nur durch, _solange der Motor noch zieht_ — bei Tempo
null am schlimmsten, bei Höchstgeschwindigkeit gar nicht mehr, weil die Kraft
dort längst im Luftwiderstand steckt; die Bremse blockiert bei jedem Tempo
gleich. Beides ist analog, es zählt also, wie weit der Trigger gezogen ist.

Und **die Traktion reicht jetzt tiefer**: bis 0,02 statt bis 0,15. Bei 0,15
_rutschte_ ein Kart noch nicht, es fuhr nur unpräzise; was man eigentlich will
— eines, das die ganze Kurve quer nimmt — fängt eine Zehnerpotenz tiefer an.
Der _Drifter_ steht dort und fährt mit vollem Schlupf.

**Der Kopf ist nicht am Kart festgeschraubt** (`kartView.ts`). Vorher drehten
sich Kart und Rig im selben Bild: physikalisch richtig — ein Kopf, der in einem
Sitz steckt, dreht sich mit —, und trotzdem genau das, wovon einem in der
Brille schlecht wird. Das Auge sieht die ganze Welt herumschwenken, das
Innenohr meldet nichts dazu, und beim Lenken dauert dieser Widerspruch die
ganze Kurve. Jetzt dreht sich das **Kart** sofort und der **Blick** hinterher.
Das ist obendrein näher an der Wirklichkeit als das Festschrauben — wer fährt,
lässt den Kopf in der Kurve ein Stück zurück und schaut in den Bogen hinein.

**Drei Zahlen machen das aus**, alle drei auf dem Klemmbrett, und sie greifen
in dieser Reihenfolge ineinander — jede bremst, was die vorige zugelassen hat:

1. **Die Totzone** (`headDeadZone`, Grad) ist die erste Frage und die
   wichtigste: Bis zu wie viel Grad Unterschied dreht der Kopf **gar nicht**
   mit? Sie bestimmt nicht, _wie_ er zieht, sondern **wohin** — sein Ziel ist
   nicht die Fahrtrichtung, sondern der Rand eines Fensters von ±`dead` um sie
   herum. Eine kurze Ausweichbewegung links-rechts ist damit für den Blick
   überhaupt kein Ereignis: Das Kart wackelt, der Horizont steht still.
2. **Die Nachlaufzeit** (`headLag`, Sekunden) sagt, wie träge er dann folgt.
   Exponentiell: nach `lag` Sekunden ist knapp zwei Drittel des Rückstands
   aufgeholt. `0` schraubt ihn an den Rand der Totzone.
3. **Die Drehrate** (`headTurnRate`, Grad je Sekunde) ist der Deckel darüber.
   Der Nachlauf allein holt einen großen Rückstand mit einem großen Satz auf,
   und genau dieser Satz ist es, der in der Brille wehtut. `0` heißt: kein
   Deckel.

Zwei Dinge hängen daran, und beide stehen im Code:

- **Der Sitz kommt vom Kart, die Richtung vom Blick.** `seatDriver` schiebt den
  Rig jeden Frame auf den Augpunkt — sofort, sonst säße man neben dem Kart —
  und dreht ihn auf den nachlaufenden Winkel.
- **Ein Deckel von 25°** (`MAX_LAG`), und der ist **keine** Einstellung: In
  einer langen Kurve käme der Blick sonst quer zur Fahrtrichtung zu stehen, und
  dann fährt man seitwärts durch die Gegend. Er ist die Grenze, an der auch ein
  sehr langsam gestellter Kopf doch mitgenommen wird — deshalb reicht die
  Totzone auch nur bis 20°.
- **Das Lenkrad muss gegen den Blick gemessen werden**, nicht gegen das Kart
  (`Kart.handAngle`). Die Hand hängt am Rig, das Lenkrad am Kart; seit sich die
  beiden nicht mehr im selben Bild drehen, wanderte eine völlig stillgehaltene
  Hand um die Nabe — das Lenkrad drehte sich unter ihr weg und lenkte dabei
  weiter. Wer den Rückstand vorher aus dem Punkt herausdreht, misst wieder das,
  was die Hand getan hat, und nichts sonst.

**Die Leitplanke** ist keine Physik, sondern Geometrie: `confineToTrack` setzt
ein Kart, das über den Rand ist, exakt auf die Kante zurück, nimmt den Teil der
Geschwindigkeit weg, der in die Planke zeigte, und schrubbt den Rest ein wenig.
So rutscht man an der Bande entlang statt daran zu kleben. Steht man einmal
stumpf davor, hilft die Bremse: sie ist zugleich der Rückwärtsgang, und rückwärts
lenkt es wieder.

Darüber liegt `confineToCourse` mit **einer** Regel: Wer in irgendeiner der
Flächen ist — Strecke oder Boxengasse —, wird nicht angefasst; wer draußen ist,
kommt auf die **nächstgelegene** zurück. Nicht immer auf die Strecke, denn dann
schöbe die Box einen quer über die Wiese, sobald man in ihr an die Mauer kommt.
Die Gasse ist dabei bewusst ein **Rechteck** und keine zweite Mittellinie: Eine
offene Linie hat zwei Enden, und dort weiß `nearestOnPath` nicht mehr, ob man
noch daneben oder schon dahinter steht — wer zehn Meter über das Ende
hinausfährt, hat weiter den Abstand null und rollt fröhlich über die Wiese.

**Einsteigen** ist ein Griff ans Lenkrad — der Rig wird eingefroren
(`rig.frozen`) und jeden Frame auf den Sitz gesetzt, wobei der _Kopf_ über den
Sitz geschoben wird und nicht der Rig-Ursprung: in VR steht der Spieler in
seinem Zimmer irgendwo, nur nicht dort, wo die Brille es gern hätte.

Und zwar in **allen drei Achsen**. Früher landeten die _Füße_ auf einer festen
Tiefe und das Auge dort, wohin die eigene Körpergröße es trug — für jemanden im
Stehen genau richtig, für jemanden auf einem Stuhl vierzig Zentimeter zu tief,
und genau das ist das „ich sitze auf dem Kart statt darin". `Kart.seat` ist
deshalb der **Augpunkt** (1,02 m über dem Boden, wie in einem echten Kart) und
nicht mehr die Fußstelle; der Rest des Rigs richtet sich danach.

**Aussteigen** ist das Einzige, was ein neuer Fahrer nicht erraten kann, also
steht es die ganze Zeit auf einem Schild direkt über dem Lenkrad — `A`/`X`
halten, mit einem Balken, der währenddessen vollläuft. Kein Tastendruck: bei
Tempo 60 ist ein Druck zu leicht danebengegriffen. Dieselbe Zeile steht oben
auf dem Klemmbrett, für alle, die lieber zielen. Am Rechner tut `E` dasselbe.

Das **Klemmbrett** ist ein `UIPanel` am Kart: Lenkart, Beschleunigung,
Höchstgeschwindigkeit, Bremskraft, Traktion, Reifenschlupf, Kopfnachlauf,
Kopf-Totzone, Kopf-Drehrate, Gewicht, Lenkeinschlag, Radstand
und Rückwärtstempo, jede Zeile schaltet auf die nächste Raste und zeigt die
rohe Zahl daneben. Darunter zwei Zeilen, die keine Raste sind:

- **Helm** — ein Schalter. Von außen sitzt eine Helmschale auf dem Kopf, die
  alle im Raum sehen (`ctx.wear`, siehe _Wie man aussieht_); von innen steht
  der **Visierrand fest im Blick**, während die Welt darin schwenkt. Das ist
  der eigentliche Zweck: Übelkeit kommt daher, dass das Auge eine Bewegung
  sieht, die das Innenohr nicht meldet, und das bewährteste Gegenmittel ist
  etwas im Bild, das sich **nicht** bewegt. Der Rand hängt an der Kamera und
  liegt auf `LAYER_HUD` — wie die Trefferanzeige, und aus demselben Grund: Ein
  Rahmen, der dem Kopf ein Bild hinterherläuft, wäre das Gegenteil dessen,
  wofür es ihn gibt, und einer, den auch die Portalkameras zeichnen, schwebte
  als schwarzer Ring im Raum.
- **Werte eingeben** — dieselben Zahlen, aber **getippt** statt
  durchgeschaltet, auf dem Zifferblock vor dem Kopf (`PortalWorld.askNumber`,
  derselbe wie bei Pistole und Greifen). Rasten sind zum Ausprobieren da: Man
  tippt eine Zeile an und merkt am nächsten Bogen, ob es besser wurde. Was sie
  nicht können, ist das Ende davon — wer weiß, dass sein Kart 0,62 Traktion
  haben soll, will nicht siebenmal weiterschalten und dabei daran vorbei.
  Dieselbe Grenze (`clampKartField`), andere Eingabe.

Weil mehr Zeilen als Platz da sind, blättert der Stick der
zeigenden Hand — dieselbe Geste wie im Handgelenk-Menü, und wie dort bleibt das
Brett beim Weiterschalten stehen, wo es stand. Liegt der Strahl einer
Hand auf dem Brett, gehört _ihr_ Trigger dem Brett und nicht dem Gas — pro
Hand, damit Lesen mit der einen der anderen nicht das Gas wegnimmt. Das
Lenkrad selbst hört, sobald jemand sitzt, gar nicht mehr auf den Strahl
(`PointerTarget.ignore`): es gibt dann nichts mehr auszuwählen, und ein Strahl,
der darauf ruht, würde nur den Gastrigger schlucken.

Der Gürtel ist hier **leer**: beide Trigger haben in dieser Welt einen Job.

### Die Pizzeria

Das Rezept steht in `src/worlds/shop/pizza.ts` — vier Zahlen (Schläge, Soße,
Käse, Ofenzeit) und daraus abgeleitet Stufe, Beschriftung, Farbe und Punkte.
Wieder ohne three.js, wieder mit Test; `ShopWorld.ts` ist der Raum drumherum.

- **Kneten ohne Knopf.** Ein Teig, der auf dem Arbeitstisch zur Ruhe kommt,
  wird kinematisch und bleibt liegen; danach knetet ihn jede Hand, die schnell
  genug und in seine Richtung hineinfährt. Bewusst _ohne_ Taste: Greifen ist
  schon vergeben — mit gedrücktem Griff hebt man ihn auf. Genau das ist der
  Unterschied zwischen den beiden Gesten, und er muss nirgends erklärt werden.
- **Werkzeuge mit festem Platz.** Kelle und Streuer sind normale Props, aber
  sobald sie niemand hält, stehen sie wieder auf ihrem Fleck. Sie können also
  nicht verloren gehen, und der Platz ist nie leer, wenn man zurückkommt.
  Wer eins in der Hand hat, drückt den Trigger und schüttet über den Boden, der
  darunter liegt. Käse hält nur auf Soße.
- **Der Ofen** hat keine Klappe, nur ein Loch: was in dem Kasten liegt, backt.
  Golden ist fertig, schwarz ist zu spät, beides sagt ein Ton an.
- **Der Mülleimer** ist ein Kasten mit Boden — was hineinfällt, wird gelöscht.
- **An der Wand** hinter jeder Station steht in zwei Zeilen, was sie will. Ein
  `TextPlane` bemisst seine Schrift an seiner _Höhe_, ein höheres Schild fasst
  also weniger Text, nicht mehr — die Schilder sind deshalb breit und flach.
- **Arbeitshöhe** ist 90 cm, wie in einer echten Küche. Wer sich hier zu klein
  vorkommt, sitzt in aller Regel auf einem Stuhl; dagegen hilft nicht die
  Arbeitsplatte, sondern _Menü → Bewegung → Haltung_.
- **Grenze:** Pizzen entstehen zur Laufzeit und bekommen laufende IDs; zwei
  Küchen in derselben Sitzung meinen mit `pizza-3` nicht dasselbe. Gelöscht
  wird deshalb nur lokal. Der Raum, die Werkzeuge und alles Geworfene sind
  geteilt wie überall.

### Controller-Modelle

Der Controller, den man im Eingaberaum ansieht, ist das **echte Modell** des
Geräts: dieselben Dateien, die jede WebXR-Seite benutzt
(`@webxr-input-profiles/assets` der Immersive Web Community Group, MIT), mit
beweglichem Trigger, Griff und Stick, gebunden über das Profil, das der Browser
für das Gerät meldet.

**Sie liegen bei uns**, in `public/controllers`, und werden nicht zur Laufzeit
nachgeladen. three würde das von sich aus tun — `XRControllerModelFactory` hat
`cdn.jsdelivr.net` als Vorgabe eingebaut —, und das ist genau die Sorte
Abhängigkeit, die man erst bemerkt, wenn sie fehlt: ohne Netz, hinter einem
Filter oder wenn jsdelivr hakt, ist der Controller weg und niemand weiß warum.
`core/ControllerModels.ts` setzt den Pfad deshalb auf
`${import.meta.env.BASE_URL}controllers` — dieselbe Basis wie alles andere,
damit es auf GitHub Pages unter `/vr/` genauso stimmt wie lokal.

Mitgekommen sind **nur die Quest-Profile** (`meta-quest-touch-plus`, `-v2`,
`meta-quest-touch-pro`, `oculus-touch-v3` für die Quest 2, `oculus-touch-v2`
für die Quest 1) — zusammen 5 MB. Das ganze Paket ist knapp 100 MB groß, und
ein Repository, das 12 MB Vive-Controller mitschleppt, die hier nie jemand
anschließt, ist kein gut gepflegtes. `profilesList.json` ist entsprechend
gestutzt: es darf nichts darin stehen, was nicht danebenliegt, sonst sucht
`fetchProfile` es und bekommt einen 404. Auch die generischen Profile fehlen
mit Absicht — sie wären fast 30 MB und nur ein schlechterer Ersatz für den
Ersatz, den es schon gibt: der **selbst gebaute Controller** aus
`worlds/tune/InputModel.ts` steht immer da, wenn kein Modell kommt.

Geholt werden sie von Hand, nicht beim Bauen:

```
node --experimental-strip-types tools/controllers.ts
```

Zwei Feinheiten, die im Code stehen und hier nicht verlorengehen sollen:

- Die Fabrik von three wartet auf das `connected`-Ereignis eines Controllers.
  Wer einen Raum betritt, während die Brille längst läuft, kommt dafür zu spät.
  Sie liest daraus aber nur die `XRInputSource` heraus, und die hat `XRInput`
  ohnehin — also bekommt sie sie direkt gereicht.
- Geometrien und Materialien der geladenen Modelle liegen in einem
  Zwischenspeicher, den sich **alle** Controller teilen. Wer eine Kopie
  wegwirft, hängt sie aus und gibt nichts frei; wer sie umfärben will (der
  Controller als Werkzeug in der Hand darf umgefärbt werden, der an der Wand
  nicht), muss sich vorher eigene Materialien ziehen (`ownMaterials`).

### Handhaltung

Wie eine Hand aussieht, ist eine Einstellung wie jede andere: zwölf Zahlen —
Versatz in cm, Neigung in Grad, ein Krümmungswert je Finger (0 gestreckt,
1 geschlossen) und eine Spreizung. Davon gibt es die **Grundhaltung** (leere
Hand), die **Faust am Standardgriff** — eine einzige, für alle achtzehn
Werkzeuge, die ihn tragen —, eine eigene Haltung für jedes Werkzeug, das
trotzdem eine will, und eine für das **Objekt in der Hand**, jeweils für links
und rechts. Grundhaltung und Objekthaltung stehen
unter _Einstellungen → Hände → Linke/Rechte Hand_, die Griffe beim jeweiligen
Werkzeug (_Werkzeuge → … → Griff_). Die Objekthaltung läuft unter der
Pseudo-Id `grab` durch dieselbe Mechanik wie ein Werkzeug — eine Hand um einen
Companion Cube ist weder die leere Hand noch die Hand an der Pistole, und ohne
eigene Haltung sah sie aus wie beides gleichzeitig. Getippt wird über die Tastatur im
Raum, und die Hand bewegt sich schon _während_ getippt wird — eine Krümmung
von 0.6 sagt auf dem Papier nichts.

Die **ausgelieferte Grundhaltung** ist nicht die gebaute. Gebaut ist die Hand
auf dem Griffpunkt und geradeaus schauend (`IDLE_HAND_POSE`) — so hat aber noch
nie eine Hand einen Controller gehalten. Der liegt schräg in der Faust, und wie
schräg, sagt nur eine Messung im Eingaberaum. Gemessen wurde zweimal, einmal je
Hand, und **die beiden Messungen sind nicht dasselbe**: rechts kam x 0,5 · y
-0,4 · z 1,2 cm bei Pitch -90°, Yaw 45°, Roll 0° heraus, links später x -0,3 ·
y 2,7 · z 3,8 cm bei Pitch 75°, Yaw -45°, Roll 5°. Quer, Yaw und Roll passen
zusammen; Höhe, Tiefe und vor allem die Neigung nicht — 75° gegen -90° sind
165° auseinander, also keine Messtoleranz, sondern zwei verschiedene Haltungen.

Es gilt deshalb die **spätere** Messung, und sie gilt für **beide** Hände:
`IDLE_HAND_POSE_LEFT` steht als Zahlenreihe im Code, `IDLE_HAND_POSE_RIGHT` ist
deren Spiegelung, und `defaultIdlePose` gibt die passende heraus. Zwei getrennt
gepflegte Zahlenreihen wären genau die Sorte Abweichung, die niemand merkt —
eine Hand, die anders sitzt als die andere, sieht man nicht, man wundert sich
nur. Wer die andere Messung für die richtige hält, dreht eine Konstante um und
misst nicht zwei. Dieselbe Haltung ist auch die Maske des Konfig-Codes und der
Rückfall für einen zu kurzen: was nicht im Code steht, _ist_ die gebaute
Haltung dieser Hand, und zwar dieser und nicht der anderen.

Weil beide Hände Spiegelbilder sind, ist die andere Seite eine Kopie mit drei
umgedrehten Vorzeichen: seitlicher Versatz, Yaw und Roll. Mehr nicht — genau
das prüft der Test zu `mirrorHandPose` in `src/core/handPose.ts`, und dieselbe
Regel gilt für Werkzeug-Posen (`mirrorReadout`). _Auf die andere Hand
spiegeln_ macht es für eine Haltung, _Links auf rechts spiegeln_ für alle.

**Und die Knöpfe bewegen Finger.** Eine Haltung ist die Hand mit gedrücktem
Griffknopf — so hält man ein Werkzeug. Darüber liegt, was die beiden Knöpfe am
Controller tun (`FingerMoves`, `buttonCurls` in `handPose.ts`): der
**Griffknopf** losgelassen öffnet die Hand vom Griff (`RELEASED_CURLS`, die
Zahlen der Geste _ready_), der **Trigger** zieht einen Finger nach — am
Standardgriff den Zeigefinger vom Rahmen auf den Abzug, am Stab und am Pinsel
schließt er ihn in die Faust, und an der **Stoppuhr** ist es der **Daumen**:
fast gestreckt liegt er von hinten oben auf der Krone (Krümmung 0,25, gemessen
in `gripFist.test.ts`: die Kuppe liegt in Ruhe auf der Krone und geht beim
Drücken hinunter), und der Trigger drückt ihn darauf. An den **Handschuhen**
hält der Griffknopf nichts fest, er schließt die Faust (Superman fliegt mit
ihr), losgelassen bleibt die Hand offen; am **Hängegleiter** und den Flügeln
bleiben die Hände am Bügel, ob er gedrückt ist oder nicht. Eingestellt wird das
**einmal je Griff** und nicht je Werkzeug (`TOOL_FINGER_MOVES` nur für die
mit eigenem Griff, `fingerMovesOf` für alle) — derselbe Griff in derselben
Hand hat denselben Abzug unter demselben Finger. Im Spiel rechnet
`HandVisuals` das jedes Bild aus den Knöpfen des Controllers, auf der
Werkzeugseite schalten die Knöpfe _Grab_ und _Trigger_ im Kopf dasselbe um.
Die Faust, die ein Werkzeug selbst verlangt (Superman im Flug, der Hängegleiter
in beiden Händen), läuft getrennt davon über `setFist`: die Geste _grip_, die
die Welt jeder haltenden Hand gibt, wird von der Haltung des Werkzeugs
abgedeckt, diese hier gewinnt darüber.

### Handmodell: Boxhand oder weißer Handschuh

Wie die Hand **aussieht**, ist seit dieser Runde eine Einstellung
(`core/handLook.ts`, _Einstellungen → Hände → Handmodell_, und in der
Schublade der Werkzeugseite): die **Boxhand** aus Kästen und Kapseln, mit der
alles angefangen hat, oder der **weiße Handschuh** — ein Handschuh wie bei
Rayman oder Master Hand, mit gepolsterter runder Handfläche, dicken runden
Fingern mit Kugeln an den Gelenken und einer flachen Manschette am
Handgelenk. Ab Werk der Handschuh; er ist der Grund für die Wahl.

Es ist **dasselbe Skelett in einem anderen Kleid** (`HandVisuals.ts`,
`HandStyle`: `bones`, `limbs`, `glove`): dieselben Gelenke an denselben
Stellen, dieselbe Krümmung, dieselbe Fingerspitze. Deshalb gilt jede Haltung
und jede gerechnete Faust für beide Modelle, und der Test dazu misst genau das
nach — die Zeigefingerspitze des Handschuhs liegt dort, wo die der Boxhand
liegt. Getrackte Hände bleiben Kugeln an den Gelenken: die liefert die Brille.

**Und er ist ein Stück Stoff, keine Teile** (`core/gloveMesh.ts`). Die erste
Fassung war die Boxhand in dicker — Kapseln, Kugeln an den Gelenken, ein Ring
am Handgelenk — und sah genau so aus: zusammengesetzt. Jetzt ist der Handschuh
ein einziges **gehäutetes Netz** (`SkinnedMesh`) am Skelett der Hand: die
Handfläche ein Loft aus Ellipsen entlang der Handachse, hinten als Manschette
aufgeweitet, vorn an den Knöcheln abgerundet; jeder Finger eine durchgehende
Röhre vom Ansatz _in_ der Handfläche bis zur runden Kuppe, deren Ringe zwischen
den beiden Knochen des Fingers gewichtet sind — vor dem Mittelgelenk der eine,
dahinter der andere, um das Gelenk herum beide. So biegt sich der Stoff weich,
wo die Boxhand knickt. Die Gelenke sind dafür `Bone`s statt `Object3D`s, was
der Kette egal ist; der Wurzelknochen der Hand hängt als **letztes** Kind an
ihr, damit die Tests, die Daumen und Finger an den Kindern abzählen, sie
weiter an ihren Plätzen finden. Gebunden wird in Ruhelage, im angehängten
Modus — three.js rechnet die Bewegung der Hand selbst heraus.

**Und er hat die drei schwarzen Striche.** Micky, Rayman, Master Hand — jeder
gezeichnete Handschuh trägt sie: drei dunkle Abnäher auf dem Handrücken, die
von den Knöcheln zum Handgelenk laufen und dabei ein wenig zusammenlaufen. Sie
sind das, woran man einen gezeichneten Handschuh überhaupt als Handschuh
erkennt; ohne sie ist eine weiße Hand eine weiße Hand. Gebaut werden sie als
drei dünne Schnüre **auf** der Fläche des Lofts: für jeden Punkt wird der
Halbmesser der Ellipse an dieser Stelle ausgerechnet und ein knapper Millimeter
daraufgelegt, also liegen sie auf der Wölbung statt als drei gerade Stäbe
darüber. Ihr Material ist geteilt, je Durchsichtigkeit eines — ein Abnäher
leuchtet nie, aber ein Handschuh kann ein halb durchsichtiger Geist sein, und
drei pechschwarze Striche in einer gläsernen Hand sähen aus, als schwebten sie
darin.

Umgeschaltet wird sofort: `HandVisuals` baut eine Hand neu, sobald ihr Kleid
nicht mehr zur Einstellung passt, die Werkzeugseite stellt das Werkzeug neu
auf, das Boxhand-Werkzeug hört selbst zu. Der Handschuh ist weiß, wo immer er
steht (`GLOVE_COLOR`, auch auf der Werkzeugseite); die Boxhand behält ihr
Hellblau. Im Konfig-Code steht das Modell nicht — es ist Geschmack, keine
Messung —, und _Eigene Einstellungen löschen_ räumt es mit weg.

#### Und auf getrackten Händen

Eine Hand **ohne Controller** war bisher das, was die Brille misst: fünfundzwanzig
Gelenke, an jedem eine Kugel. Ehrlich, und es sieht nach Messgerät aus. Seit
dieser Runde gibt es daneben den Schalter **Blanke Hände: Handschuh** — unter
_Einstellungen → Hände_ und, wo man ihn wirklich braucht, an der Wand im
Poseraum. Ab Werk aus; die Kugeln sind das, was gemessen wurde, und wer eine
Geste einstellt, will genau das sehen.

Angeschaltet liegt ein Handschuh auf den echten Knochen. **Wo** die Hand steht,
sagt eine Rechnung über vier Gelenke (`core/gloveFit.ts`, mit Test, ohne
three.js):

- **Handgelenk → Mittelfingerknöchel** ist die Handachse, also das -Z der
  gebauten Hand, und ihre **Länge ist das Maß der Handfläche**: die gebaute
  misst `PALM_LENGTH` (8,3 cm, aus dem Kasten und der Fingerwurzel abgeleitet),
  die echte misst, was sie misst — eine kleine Hand bekommt eine kleine
  Handfläche. Geklemmt auf 0,6 … 1,7, denn ein Gelenk, das für ein Bild bei
  null liegt, machte sie sonst zum Punkt.
- **Zeige- → kleiner Knöchel** ist die Querachse und sagt, wohin der Handrücken
  schaut. Genau **ein Vorzeichen** darin unterscheidet links von rechts: in der
  gebauten Hand liegt der Zeigefinger auf der Daumenseite, und die ist rechts
  bei -X. Der Anteil entlang der Handachse wird herausgenommen, bevor daraus
  eine Basis wird — eine echte Hand ist kein Rechteck, ihre Knöchel stehen
  gestaffelt.

**Die Finger dagegen sind nicht gestreckt, sondern gemessen**
(`core/handBones.ts`, mit Test, ohne three.js). Vorher kamen sie aus dem
Faltmaß der Gesten (`handGestures.foldCurls`): **eine** Zahl je Finger, der
Abstand der Kuppe von der Handflächenmitte. Aus einer Zahl lässt sich ein
Finger aber nicht stellen — ob er am Grundgelenk knickt oder erst am
Mittelgelenk, ob er zur Seite steht oder geradeaus, all das fiel in dieselbe
Zahl, und eine Hand, die die Finger spreizte, spreizte sie gezeichnet nicht.
Die Brille meldet fünfundzwanzig Gelenke; fünf davon anzusehen war immer die
halbe Messung. Jetzt gilt für jeden Finger:

- **Wo seine Wurzel liegt und wie lang seine Knochen sind**, in Metern. Der
  Handschuh wird darauf **gebaut**, statt ein gebautes Modell auf einen
  Maßstab zu strecken: jede Fingerwurzel steht auf dem gemessenen Knöchel,
  jedes Gelenk des Handschuhs auf der Kugel, die die Brille dort malt, und die
  Kuppe auf der echten Kuppe. Und es sind **drei** Knochen je Finger statt
  zwei, weil eine echte Hand drei hat.
- **Wie dick seine Gelenkkugeln sind** (`jointRadius`). Der Stoff um den Finger
  ist so dick wie die Kugeln, die sonst an derselben Stelle säßen — nicht
  dünner und nicht dicker.
- **Wie weit jeder einzelne Knochen gebeugt ist** und **wie weit der Finger an
  der Wurzel zur Seite steht**, beides in Grad. Die Winkel sind genau die, die
  das Modell einsetzt — eine Fingerwurzel dreht um Y, jeder Knochen darunter um
  X, beides gegen die Ruhelage der Wurzel (beim Daumen eine Drehung, bei den
  vier Fingern die Einheit). Es gibt keinen Umrechnungsfaktor dazwischen, den
  jemand nachziehen müsste, und der Test rechnet genau das nach: eine Hand aus
  bekannten Winkeln bauen und nachsehen, ob die Messung sie wieder herausgibt.

Genäht wird **einmal**: die Knochen einer Hand ändern ihre Länge nicht, und ein
Netz je Bild neu zu nähen wäre der teuerste Weg, dasselbe zu zeigen. Neu gebaut
wird nur, wenn das Maß wirklich ein anderes ist (halbe Millimeter Spiel, damit
das Rauschen der Brille nicht dauernd näht).

Die Gelenkkugeln gehen dabei **aus** — zwei Hände am selben Ort wären das
Schlechteste von beidem —, und eine Geisterhand daneben zieht sich mit an
(`lookOf`): verglichen wird nur ehrlich, wenn das Vergleichsstück so aussieht
wie das, was man in der Brille sieht.

Gemessen wird übrigens **immer**, auch mit ausgeschaltetem Handschuh: der
Poseraum speichert die Gelenke einer blanken Hand, und ob dabei Kugeln oder
Stoff zu sehen sind, ändert an der Messung nichts.

Wozu das gut ist, steht unter _Der Poseraum_: eine Reihe Kugeln hat keine
Handfläche, an die man einen Gegenstand legen könnte, und ohne Handfläche gibt
es nichts zu messen.

#### Knochenfarben

Der dritte Schalter daneben (_Einstellungen → Hände → Knochenfarben_, und der
Knopf im Poseraum): **jeder Knochen in seiner eigenen Farbe**
(`core/bonePalette.ts`). Ab Werk aus — eine Hand ist einfarbig, und beim
Spielen soll ein Handschuh ein Handschuh sein und kein Farbfächer. Beim
**Justieren** ist genau das im Weg: fünf gleich weiße Röhren sagen nicht,
welche davon der Ringfinger ist und wo sein zweiter Knochen anfängt, und wer
eine Zahl je Knochen einstellt, sieht ohne Farben nicht, welcher sich bewegt
hat.

Die Farben sind **gerechnet und nicht ausgesucht**: ein Farbton je Finger, vom
Daumen (rot) über Zeigefinger (orange), Mittelfinger (grün) und Ringfinger
(blau) bis zum kleinen Finger (violett), und je Knochen eine Stufe heller zur
Kuppe hin. Damit sagt die Farbe zwei Dinge auf einmal — welcher Finger und der
wievielte Knochen — und beides ohne Beschriftung. Ein Modell mit zwei Knochen
je Finger bekommt dieselben Enden wie eins mit dreien, damit die gebaute Hand
am Controller und der gemessene Handschuh an derselben Stelle gleich aussehen.

Es gilt für **alles, was eine Hand sein kann**: die Boxhand und die Kugelhand
bekommen ein Material je Knochen (geteilt, je Farbe und Durchsichtigkeit eines
— wie die Abnäher des Handschuhs), der Handschuh trägt die Farben als
Punktfarben **im Netz**, weil er ein einziges Netz ist und kein Material je
Knochen tragen kann, und die Gelenkkugeln einer blanken Hand färben sich nach
den Namen, die die Brille ihnen gibt. Das Attribut wird nur geschrieben, wenn
es auch gelesen wird — ein Drittel mehr Netz für nichts wäre der falsche
Handel. Umgeschaltet wird sofort: eine gefärbte Hand ist eine anders gebaute,
also baut `HandVisuals` sie neu.

#### Was eine bloße Hand hält, hängt schräg

Mit **Controller** meldet die Brille zwei Räume: den Zeigestrahl und den
**Griffraum**, und der liegt dort, wo die Faust das Gerät hält. Jede Haltung,
jeder Halterzylinder und jede Faust dieses Spiels stehen darin. Eine
**getrackte Hand hat keinen Griffraum** — three.js lässt ihn unangetastet, weil
eine Hand keine `gripSpace` meldet —, und alles, was jemand hält, hing deshalb
im **Pinch-Strahl**: dem Strahl, den die Brille aus Daumen und Zeigefinger
baut. Der steht schräg zur Faust, und das sah man:

- **90° Roll zu weit nach rechts.** Was aufrecht in der Faust liegen sollte,
  lag quer.
- **35° Yaw zu weit nach links.** Wer mit der Hand zielte, schoss links am Ziel
  vorbei.

Die beiden Zahlen stehen in `core/handHold.ts` — an der **rechten** Hand
gemessen und für die linke gespiegelt, mit denselben zwei Vorzeichen wie jede
Haltung (`mirrorHandPose`): Yaw und Roll kippen, Pitch bleibt. Getragen werden
sie von einem eigenen Knoten je Hand, `ControllerState.hold`: am Controller ist
er der Griffraum und dreht nichts, an einer bloßen Hand der Strahl samt
Versatz. **Gedreht wird, nicht verschoben** — wer nur wissen will, _wo_ eine
Hand ist, bekommt dieselbe Antwort wie vorher.

**Nur das Halten, nicht das Aussehen.** Die Knochenhand wird davon kein Grad
gedreht: der Versatz sitzt am Knoten, an dem die Sachen hängen, und nicht an
der gezeichneten Hand. Wer die Hand selbst anders stellen will, ändert eine
`HandPose` — das hier ist der Raum, in dem sie gilt.

Daran hängen zwei Stellen, und beide dieselbe: die **Portalwelt** (`gripOf` —
Werkzeuge, Gegenstände, der Gürtel) und der **Eingaberaum** (`handAnchor` —
was dort gemessen wird, ist die Lage eines Werkzeugs gegen die Hand, und gegen
eine andere Hand gemessen wäre jede Zahl um genau diesen Versatz daneben). Ein
Werkzeug bekommt seine Zielkorrektur weiterhin nur, wenn es einen Griffraum
gibt (`aimQuaternion`); bei einer bloßen Hand trägt der Halteknoten sie schon.

### Eingemessene Griffe

Wie eine Hand ein Werkzeug umfasst, hängt nicht am Werkzeug, sondern an dem,
**was sie umfasst** — und das ist bei achtzehn Werkzeugen derselbe Zylinder an
derselben Stelle. Die gebaute Faust (`HOLD_HAND_POSE`) ist deshalb nur der
Anfang: sie sagt, wie weit die Finger gekrümmt sind, und nicht, worum.

### Eine Faust, und sie ist gerechnet

Es gibt **eine** Haltung für alles, was den Standardgriff trägt
(`GRIP_HAND_POSE` in `core/handPose.ts`), rechts geschrieben und links
gespiegelt — und sie ist nicht eingestellt, sondern **ausgerechnet**:

|                | x   | y   | z   | Pitch | Yaw  | Roll | Finger                            |
| -------------- | --- | --- | --- | ----- | ---- | ---- | --------------------------------- |
| Faust am Griff | 1,7 | 2,4 | 2,7 | −43°  | −17° | −90° | 0,55 · **0,1** · 0,85 · 0,9 · 0,9 |

Der Weg dorthin steht in `fistOnGrip` (`tools/gripFit.ts`) und wird in
`core/gripFist.test.ts` nachgerechnet. Drei Bedingungen, und sie lassen genau
eine Lage übrig: die **Faustachse** (das X der gebauten Hand, quer über die
Handfläche, um das sich die Finger schließen) liegt auf der **Griffachse**, die
**Fingerlinie liegt auf der Grifflinie**, und die **Mitte der Faust** liegt auf
der Mitte des Griffs. Wo die Faust ihren Zylinder hält, sagt dabei die Hand
selbst: der Kreis durch die drei Gelenke des Mittelfingers hat den Mittelpunkt
2,65 cm unter und 3,0 cm vor dem Handgelenk und den Halbmesser eines Griffs.
Ein gekrümmter Finger legt sich um _etwas_ — der Kreis durch seine Gelenke ist
dieses Etwas.

**Die Hand steht dabei schräg am Griff, und wie schräg, sagt der
Zeigefinger.** Die Fingerlinie soll auf der Grifflinie liegen, und ein
gekrümmter Finger zeigt unter der Handachse hindurch — also wird die Faust um
genau diesen Winkel um die Griffachse geschwenkt. Damit ist die Krümmung des
Zeigefingers keine Zierde, sondern die Haltung der ganzen Hand. Die erste
Fassung dieser Rechnung legte die Handachse gerade auf die Grifflinie — die
Faust lag dann zwar um den Zylinder, aber der Finger zeigte am Lauf vorbei nach
unten. Die zweite ließ den Finger am Abzug (Krümmung 0,35) und schwenkte die
Faust um **58°**: geometrisch richtig, und auf der Werkzeugseite trotzdem
falsch — die Handfläche stand als schräger Klotz hinter dem Griff, von unten
schien die Hand neben der Pistole zu hängen, und genau so wurde es gemeldet.
Jetzt liegt der **Zeigefinger gestreckt am Rahmen** (Krümmung 0,1), wie an
einer Waffe, die gerade nicht schießt: die Faust steht **17°** schräg, die
Handfläche längs an der rechten Seite des Griffs, die drei Finger schließen
sich davor, und der Finger zeigt über dem Griff den Lauf entlang. Die anderen
Finger sind die der allgemeinen Faust (`HOLD_HAND_POSE`), und die bleibt, was
sie war — auch als Maske des Konfig-Codes. Gemessen wird an der Linie, die man
auf der Werkzeugseite auch sieht: die bernsteinfarbene am Finger und der rosa
Pfeil am Griff liegen übereinander, wenn die Faust sitzt — derselbe Maßstab,
den der Knopf _Auf den Griff_ dort anlegt.

Nachgesehen wurde das nicht in der Brille, sondern **auf der Werkzeugseite im
Browser**: jedes Werkzeug mit der Faust, aus sechs Richtungen, als Bild — von
rechts, links, vorn, hinten, oben und schräg. Erst die Pistole, bis die Hand
dort sauber saß, dann alle anderen mit derselben Faust; wer daran weiterarbeitet,
tut gut daran, dasselbe zu tun, denn eine Zahl sieht man nicht an, ob die
Handfläche neben dem Griff hängt.

**Und im Spiel gilt sie auch.** Bis hierher galt sie nur auf der Werkzeugseite:
die Welt fordert für jede Hand, die etwas hält, die Geste `grip` an, und
`HandVisuals` malte damit die gebaute Faust über die eingestellte — der
Zeigefinger stand in der Brille immer am Abzug, egal was die Haltung sagte, und
kein Fingerwert aus dem Menü kam je an. Eine Hand, die etwas hält, trägt jetzt
die Finger dessen, was sie hält; nur eine _andere_ Geste, um die ein Werkzeug
ausdrücklich bittet, gewinnt noch darüber.

**Warum gerechnet und nicht gemessen.** Vorher standen dort zwei von Hand
eingestellte Zahlenreihen, eine je Griffart, und **keine von beiden hielt ihren
Griff**. Nachgemessen (derselbe Test hält die Zahlen fest):

| Faust                                                 | quer zur Griffachse daneben | Winkel gegen die Griffachse |
| ----------------------------------------------------- | --------------------------- | --------------------------- |
| die gebaute (`HOLD_HAND_POSE`, galt für 15 Werkzeuge) | 6,7 cm                      | **90°**                     |
| die am Stabgriff eingemessene (galt für 3)            | 3,2 cm                      | 30°                         |

90° heißt: die Faust stand **quer** zum Zylinder und schloss sich um die Luft
daneben. Man sieht so etwas in der Brille nicht als Fehler — man sieht eine
Hand und ein Werkzeug und wundert sich nur, warum es nie ganz sitzt. Genau
deshalb gehört diese Zahl in einen Test und nicht in ein Auge.

### Ein Griff für alle Werkzeuge

Vorher hatte jedes Werkzeug seinen eigenen Kasten in Greiffarbe, jeder von Hand
hingesetzt — und weil jeder für sich hingesetzt wurde, saß keiner wie der
andere. Sieben Werkzeuge werden **genau gleich** gehalten, und ihre Griffe
standen bis zu **24° gegeneinander verdreht** und bis zu **2,8 cm**
auseinander; Duplizierer und Holster lehnten sogar in die falsche Richtung.
Gemeinsam war ihnen nur die Faust — dieselben sechs Zahlen für alle —, und
damit passte sie zu höchstens einem von ihnen.

Die Zahlen, mit denen das aufgefallen ist (Abstand und Winkel gegen den
Pistolengriff, `gripFit.test.ts` hält sie fest):

| Werkzeug               | Δ Ort      | Δ Winkel |
| ---------------------- | ---------- | -------- |
| Teleporter, Greifhaken | 0,5–0,7 cm | 1°       |
| Größe & Position       | 0,7 cm     | 13°      |
| Holster                | 0,9 cm     | 24°      |
| Duplizierer            | 1,1 cm     | 23°      |
| Inspektor              | 2,8 cm     | 1°       |
| Lötkolben              | 5,9 cm     | 103°     |
| Taschenlampe           | 7,9 cm     | 48°      |
| Drohne                 | 5,5 cm     | 20°      |

Die Umkehrung ist der Ausweg: **nicht der Griff folgt dem Werkzeug, sondern das
Werkzeug dem Griff.** Ein Griff ist ein Ding mit einer festen Lage in der Faust
(`tools/gripFit.ts`), und ein Werkzeug baut ihn an der Stelle ein, an der er
dort landet — `this.mountGrip()`, eine Zeile, und die Lage ist keine
Frage des Geschmacks mehr. Wer das tut, bekommt die Faust dazu geschenkt und
muss nie an den zweiten Stand.

Der Griff selbst heißt **Halterzylinder** und ist genau das: ein
**Zylinder**, rund, gerade, gleich dick von oben bis unten (`tools/grip.ts`).
Er war eine Weile eine Ellipse mit Bauch und drei Rillen für die Finger, und
das war Formgebung an der falschen Stelle — was er darstellt, ist der
**Handgriff des Controllers**, den die echte Hand ohnehin umschließt, und der
ist ein Zylinder. Alles, was daran modelliert wurde, behauptete eine
Vorzugsrichtung, die die Rechnung gar nicht kennt, und sah sie ohnehin niemand,
sobald die Faust darum lag. Wo bei einem runden Zylinder vorne ist, sagt
deshalb nicht seine Form, sondern seine Linie (siehe unten).

Sein Rahmen ist der des Pistolengriffs — Achse auf **+Y**, oben aus der Faust
heraus, **-Z** ist „vorne", dorthin, wohin der Zeigefinger zeigt. Damit gilt
für alles, was wie eine Pistole gehalten wird: das Vorne des Griffs **ist** die
Zielrichtung des Werkzeugs.

**Ein Griff, und nur einer.** Eine Weile waren es zwei: `pistol` quer zur
Griffachse und `rod` längs dazu, für alles, dessen Rohr _in_ der Faust liegt —
Taschenlampe, Lötkolben, Hängegleiter. Das klingt nach zwei Arten anzufassen,
ist aber zwei **Orte** in derselben Faust, und eine Faust hat nur einen: das
eine ist der Griff, das andere die Stelle daneben. Jeder zweite Griff zieht
deshalb zwangsläufig eine zweite Faust nach sich, und am Ende standen die
beiden 111° gegeneinander — für denselben Zylinder.

Dazu kam, was ein Stabgriff kostet. Liegt das Rohr auf der Faustachse, dann
zeigt es dorthin, wohin die Faust zeigt, und das steht quer zum Zeigestrahl:
die Taschenlampe leuchtete **30° über das hinweg, worauf man zeigte**. Das war
die einzige Ausnahme von der Regel, dass jedes Werkzeug entlang des Strahls
zielt, und niemand hatte sie beschlossen — sie fiel bei einer Messung an und
blieb liegen. Lampe, Lötkolben und Hängegleiter trugen danach denselben Griff
quer unter sich, wie eine Lampe mit Griff oder eine Lötpistole, und zielten
wieder dorthin, wohin man zeigt — der Hängegleiter hängt inzwischen an seiner
Querstange, und der Lötkolben ist geblieben. Die **Lampe** ist wieder ein Stab
und liegt im Griffpunkt, 45° nach vorn gekippt (dazu unten): sie ist damit das
einzige Werkzeug, das nicht den Strahl entlang zielt, und zwar erklärtermaßen —
eine Lampe hält man in der Faust, und die Faust steht nun einmal quer zum
Strahl. Die 30° waren dagegen ein Rest aus einer Messung, den niemand
beschlossen hatte.

**Warum sich die Zielkorrektur dabei herauskürzt** — und warum das die ganze
Sache erst möglich macht: Ein gehaltenes Werkzeug liegt bei `(holdPosition,
aim · holdRotation)`, der Ort im Griffraum, die Drehung im Strahlraum. Der
Griff darin sitzt also bei `holdPosition + (aim · holdRotation) · gripPosition`
und `aim · holdRotation · gripRotation`. Verlangt man, dass zwei Werkzeuge
denselben Griff in dieselbe Faust legen, und haben beide **dieselbe
`holdPosition`**, dann steht auf beiden Seiten dasselbe `aim` und fällt weg.
Übrig bleiben zwei Gleichungen ohne Brille darin:

```
holdRotation · gripRotation = STANDARD.rotation
holdRotation · gripPosition = STANDARD.position
```

Deshalb — und nur deshalb — trägt jedes Werkzeug mit Standardgriff dieselbe
`holdPosition` (`GRIP_HOLD_POSITION`); ohne die geteilte Zahl wäre die
gemeinsame Faust gelogen. Die Lage des Griffs selbst ist die des
**Pistolengriffs**, wie er im Spiel schon lag: 5,5 cm unter dem Nullpunkt,
12,6° nach hinten gelehnt.

**Die `holdPosition` ist neuerdings gerechnet und nicht getippt.** Sie legt den
Griff auf den **Griffpunkt des Controllers**, also in die Mitte der Faust —
dorthin, wo die echte Hand das echte Gerät hält. Vorher stand dort die gebaute
Zahl der Pistole, und mit ihr hing der grüne Zylinder **8,6 cm neben der
Hand**: das Werkzeug lag im Griffpunkt, sein Griff fünfeinhalb Zentimeter
darunter, und die Faust musste ihn irgendwo dazwischen suchen. Jetzt liegt der
Griff in der Hand und das Werkzeug darüber, wie eine Pistole über der Faust,
die sie hält. Von 0/−1,2/3,0 cm auf 0/4,3/−3,6 cm — das ist der ganze
Unterschied, und er gilt für alle achtzehn auf einmal.

**Eine Zahl gehört dabei dem Gerät**, und sie steht seit dieser Runde einmal da
statt in jeder Messung mit drin: `GRIP_TO_RAY`, die 30° zwischen Griffraum und
Zeigestrahl auf der Quest. Eine Hand steht im Griffraum, ein gehaltenes
Werkzeug im Strahlraum — wer wissen will, wo ein Griff in der Faust landet,
kommt an dieser Drehung nicht vorbei. Es sind dieselben 30°, um die früher
jedes Werkzeug zu hoch schoss (`aim.ts`), und dieselben, die in der
eingemessenen Taschenlampe steckten (30/5/9°). Drei Wege, eine Zahl — und
**die Werkzeugseite rechnet jetzt mit ihr**: vorher nahm sie dort die Ruhe an,
zeigte Hand und Werkzeug um genau diese 30° gegeneinander verdreht und
speicherte sie als Handhaltung ab, sobald jemand sie „geradezog".

**Die Richtung gibt aber der Strahl des Geräts vor, nicht diese Konstante.** Im
Spiel liest `aimRotation` sie aus dem Controller, den jemand gerade hält, und
`Tool.applyHold` dreht das Werkzeug damit: meldet eine Brille anderer Bauart
einen anderen Winkel, zielt das Werkzeug trotzdem dorthin, wohin gezeigt wird.
`GRIP_TO_RAY` ist der **Ersatz für den Fall, dass kein Gerät da ist** — für
alles, was gebaut wird, bevor eine Brille aufgesetzt wird: die Lage eines
Griffs im Werkzeug, die Faust darum, das Bild auf der Werkzeugseite. Und
Ersatz heißt geschätzt: keiner der drei Wege oben ist eine Messung am Gerät.
Die gibt es im **Eingaberaum**, auf der Tafel der Hand, Zeile „Griff→Strahl".
Wer die dort abgelesene Zahl hier einträgt, verschiebt allerdings auch
`GRIP_HOLD_POSITION`, `STANDARD_GRIP_IN_HAND` und jede daran gerechnete Faust —
`core/gripFist.test.ts` sagt, welche.

Deshalb ist ein *gemessener Roll* an der Hand nicht die Antwort auf einen
schiefen Strahl. Kam der Vorschlag auf, der rechten Hand −100° Roll statt −90°
zu geben, damit der Strahl geradeaus geht: die −90° sind die Vierteldrehung aus
`fistOnGrip`, mit der die Faust überhaupt erst quadratisch auf dem Zylinder
sitzt (ein Schwenk landet dort im Yaw, nicht im Roll). Zehn Grad daran wären
zehn Grad schief auf dem Griff — die Richtung kommt vom Gerät, nicht aus der
Handhaltung.

**Und zwar an allem, was man in die Faust nimmt.** Lange trugen ihn nur die
sieben Pistolenwerkzeuge und die beiden Stäbe, und der Rest hielt sich an
irgendetwas fest — die Portalwaffen an einem selbstgebauten Kasten, der 0,2 rad
nach hinten lehnte, Pinsel, Messband, Radiergummi, Stoppuhr und Röntgen-Scanner
an gar nichts. Jetzt tragen sie alle den Standardgriff:

| Griff             | Werkzeuge                                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| der Standardgriff | Halterzylinder, Pistole, Duplizierer, Inspektor, Teleporter, Größe & Position, Holster, Greifhaken, die drei Portalwaffen, Messband, Radiergummi, Röntgen-Scanner, Handspiegel, Lötkolben, Messer       |

Siebzehn Werkzeuge, ein Griff, eine Faust, eine `holdPosition` — die Liste
dazu ist `STANDARD_GRIP_TOOLS` in `core/handPose.ts`, und `gripMount.test.ts`
baut sie alle und legt das Maßband an.

Der **Röntgen-Scanner** hat dabei seinen Rahmen eine Handbreit nach oben
bekommen: seine Öffnung lag auf dem Nullpunkt, also mitten in der Hand, und mit
einem sichtbaren Griff stünde ein Zylinder im Bild. Der Scanbereich rechnet
seitdem gegen den Rahmen-Knoten statt gegen das Werkzeug — `XrayScope` liest
nur eine Weltmatrix, und das ist seine. Der **Handspiegel** übernimmt beides
unverändert — derselbe Rahmen, dieselbe Handbreit darüber; nur steht in der
Öffnung Glas statt einer Durchsicht.

Was **keinen** Standardgriff trägt, sagt das auch: der große **Hammer** hat
einen Stiel, an dem jede Stelle ein Griff ist (siebenmal so lang wie eine
Faust), die **Drohne** zwei Griffe an einem
Deck, das man mit zwei Fäusten wie eine Konsole hält. Beide tragen die
Griff-_Form_, aber nicht die Standard-_Lage_, und stehen deshalb nicht in
`STANDARD_GRIP_TOOLS` — sie haben ihre **eigene Faust**, und auch die ist
gerechnet und nicht eingestellt: **eine Faust gehört zu einem Zylinder an einer
Stelle**, und wo ein anderer Zylinder an einer anderen Stelle liegt, gehört
eine eigene dazu. `fistOnGrip` nimmt dafür den Zylinder als zweites Argument
(`gripInHand` rechnet ihn aus der Lage des Werkzeugs in der Hand und der des
Griffs im Werkzeug), und die beiden Zylinder stehen dort, wo sie hingehören:
der **Stab** als `POLE_GRIP` in `poleGrip.ts` (die z-Achse durch den
Griffpunkt, die Daumenseite zur Spitze, die Handfläche innen — so hält man
einen Hammer): dort saß der **Stiel des Hammers** mit `POLE_HOLD_POSITION` und
`POLE_HAND_POSE`, bis er eingemessen wurde (siehe _Gemessen schlägt gerechnet_
weiter unten); als Rechnung um einen Stab an dieser Stelle bleibt beides
stehen, denn die Lampe leitet ihre Faust daraus ab.
Das **Batterierohr der Taschenlampe** ist derselbe Stab in
einer anderen Lage — im Griffpunkt, aber 45° nach vorn gekippt —, und dazu
gehört dieselbe Faust, um genau diese Kippung aufgerichtet
(`TORCH_HAND_POSE`). Das Messer lag eine Weile auch auf dem Stab und steht
jetzt mit dem Standardgriff in der Faust.
Der **Stiel des Pinsels** liegt auf demselben Stab, aber nicht mehr an
derselben Stelle in der Hand (`BRUSH_HOLD` in `BrushTool.ts`: gut fünf
Zentimeter höher und ein Stück weiter vorn als der Hammerstiel) — und ist als
einziger **keine Faust**: er wird wie ein Stift gehalten (`BRUSH_HAND_POSE`,
siehe unten).
Der rechte Griff der Drohne als
`DRONE_GRIP` in `DroneTool.ts` (mit einer Hand rutscht das Deck so weit, dass
er im Griffpunkt sitzt). Die **Kante der Stoppuhr** als `STOPWATCH_GRIP`: ein
um 35° gekippter Zylinder durch den Griffpunkt (`STOPWATCH_TILT`) — die Uhr
liegt in der Hand wie bei einem Zeitnehmer, Handfläche hinter dem Gehäuse,
Finger nach links oben um die seitliche Kante, der Arm von rechts unten, Daumen
oben auf der Krone; das Gehäuse rückt dafür je Hand zur Seite (`showHeldBy`,
wie das Deck der Drohne). Die erste Fassung stellte sie hochkant _auf_ die
Faust, Finger unter dem unteren Rand; die zweite legte die Hand waagerecht wie
an einen Türgriff — so hält niemand eine Uhr, und ein Foto eines Zeitnehmers
hat beides entschieden. Und der **Saum des Beutels** als `BAG_GRIP`, ebenfalls quer,
gehalten wie eine **offene Kappe**: die Hand waagerecht unter dem Saum,
Handfläche nach oben, Finger vorn hinein, Daumen außen am Saum (senkrecht wie
an einem Eimer sah es nach einem Eimer aus) — **ohne** Zielkorrektur, wie
alles, was in der Faust sitzt. Das war eine Weile andersherum: solange der
Beutel nur der **Gierachse** folgte, hing er waagerecht, während der Griff um
die Zielkorrektur gekippt war, und die Faust trug dieselben 30° eingerechnet
mit sich herum. Zu sehen war die Ausnahme auf der Werkzeugseite unter _Hand in
echt_: der Controller stand dort 30° gegen den aufrecht hängenden Beutel
gekippt — eine Hand, die so keinen Beutel hält. Inzwischen hängt er gar nicht
mehr aufrecht, sondern liegt im Griff wie jedes andere Werkzeug, das nicht
zielt; die Sonderbehandlung ist weg, die Faust bleibt, wie sie ist. Die **Querstange
des Hängegleiters** als `BAR_GRIP` in `HangGliderTool.ts`: quer (x) durch den
Griffpunkt, von oben gehalten wie ein Lenker, Handrücken oben, Daumen zur Mitte
der Stange (`GLIDER_HAND_POSE`). Und der **Handgriff des Controllers** als
`CONTROLLER_GRIP` in `core/controllerGrip.ts`, ohne Zielkorrektur, denn das
Gerät liegt im Griffraum selbst: entlang z, Daumen zum Kopf, Handrücken außen,
der Zeigefinger gestreckt zum Trigger — mit dem Trigger krümmt er sich darauf
(`CONTROLLER_HAND_POSE`).

**Und eine Ausnahme, die die Regel bestätigt: der Pinsel.** Ein Stift ist keine
Faust um einen Zylinder, und man bekommt ihn deshalb aus `fistOnGrip` auch
nicht heraus — die Rechnung legt die **Handachse auf die Zylinderachse**, und
damit stehen die Finger zwangsläufig senkrecht auf dem Stiel. Ein Stift liegt
aber **längs** in der Hand: Daumen und Zeigefinger kneifen ihn, der
Mittelfinger stützt ihn von unten, der Stiel läuft nach hinten über die
Schwimmhaut zwischen Daumen und Zeigefinger aus der Hand, und der Zeigefinger
zeigt den Stiel entlang zur Spitze. Die sechs Zahlen dazu sind trotzdem
**gemessen und nicht geraten**: zuerst als Ausgleichsrechnung über vier
Berührungen (Daumenkuppe, Zeigefingerkuppe, Mittelgelenk des Mittelfingers,
Schwimmhaut), die alle auf der Oberfläche des Stiels liegen sollen, plus der
Bedingung, dass sie ihn dabei _umschließen_ statt ihn von einer Seite zu
berühren — inzwischen **in der Brille nachjustiert** und als Kurzcode
hereingekommen (`BPGDLMh46J5ruqr3SNVh4H3V`, samt der Lage des Pinsels im Griff;
er steht in `gearShort.test.ts`, damit man sieht, woher die Zahlen kommen).
Nachgemessen wird weiter genau dasselbe (`core/gripFist.test.ts`, _die Hand am
Pinsel_) — nicht die Rechnung nachgerechnet, sondern das Ergebnis: wo die
Finger am gebauten Pinsel landen. Nur die Schranke ist die einer Hand und nicht
mehr die einer Rechnung: anderthalb Zentimeter statt einem halben, denn eine
Haltung, die man am Stiel entlangschiebt, bis sie richtig aussieht, trifft
dessen Oberfläche nicht auf den Millimeter. Wer daneben greift, ist um
Zentimeter daneben. Und der **Trigger** drückt den Zeigefinger dort auf den
Stiel (0,45 → 0,65) statt eine Faust zu machen; wer beim Malen den Finger ganz
krümmt, hält keinen Stift mehr.

#### Gemessen schlägt gerechnet

Drei Werkzeuge tragen seit einer Runde **keine gerechnete Faust** mehr:
**Stoppuhr**, **Hammer** und **Drohne**. Sie liegen in der Faust, mit der eine
echte Hand einen Controller hält (`GRIP_HAND_POSE`) — die Drohne gut
zweieinhalb Zentimeter weiter außen, denn ein Deck ist breiter als ein
Pistolengriff —, und _sie_ sind dorthin gelegt worden, wo sie in dieser Faust
hingehören. Die Zahlen kommen aus dem Justierer in der Brille und stehen als
**Kurzcode** am jeweiligen Werkzeug im Quelltext
(`BPMMCn6HFri5P_Ryc_jWiuiUGnVuWEQ`, `BPcMCn7Vw2xWajnzvwfCTCQjsWgsnUF`,
`BPVMCn8QZJYHLxAE_RBXKE2uiPpQ9pK`), damit jeder sie nachlesen und wieder
einspielen kann.

Damit dreht sich die Richtung der Rechnung um. Bisher stand der Zylinder fest,
und die Faust wurde um ihn gerechnet; jetzt steht die Faust fest — es ist die
Hand am Gerät, und die ist nicht verhandelbar —, und das Werkzeug wandert
hinein. Beides ist ehrlich, und wo sie sich widersprechen, gewinnt die Messung:
eine Rechnung sagt, wo eine Faust um einen Zylinder liegen _müsste_, eine
Messung sagt, wo das Ding in der Hand wirklich liegt.

Die Zylinder sind darüber nicht verschwunden, und der Test misst sie weiter
nach — nur mit der Genauigkeit einer Messung statt der einer Rechnung
(`expectFistAround` in `core/gripFist.test.ts`): der Stiel des Hammers läuft
zwei Millimeter neben der Faustmitte durch die Hand, die Kante der Uhr acht,
der Griff der Drohne knapp zwei Zentimeter — und schräg über die Handfläche
statt genau quer. So legt ein Mensch etwas in seine Hand.

**Eine Grenze hat das.** Gemessen wurde die **rechte** Hand. Die Lage im Griff
gehört dem Werkzeug und ist für beide Hände dieselbe (`Tool.applyHold`, der
Griffraum ist nicht gespiegelt); gespiegelt wird allein die Haltung der Hand.
Solange ein Werkzeug ungedreht im Griff hängt, geht das glatt auf — bei einer
eingemessenen Lage mit kräftiger Eigendrehung tut es das nicht mehr, und die
gezeichnete linke Hand steht schräger an der Uhr als die rechte. Das Gerät
_liegt_ in beiden Händen gleich; nur die gezeichnete Hand daneben stimmt links
weniger genau. Wer es genauso genau will, misst die linke Hand einmal ein — der
Kurzcode trägt die Seite mit sich.

Die Rahmen
der übrigen Zylinder schreibt man nicht als Winkel hin, sondern als zwei
Richtungen — wohin die Achse zeigt, wohin der Handrücken —, `gripFrame`
macht die Drehung daraus. Alle diese Fäuste sind ganz geschlossen, denn dort
zeigt kein Finger etwas an, und sie stehen in `core/handPose.ts`
(`TOOL_FISTS`), links gespiegelt. Vorher hatten Hammer und Drohne die gebaute
Faust, also dieselbe, die den Standardgriff quer hielt: die Handfläche stand
wie ein Brett auf dem Stiel.

In `TOOL_FISTS` steht auch, was **auf der Hand sitzt statt in ihr**: die drei
**Handschuhe** tragen die Grundhaltung mit offenen Fingern (`WORN_HAND_POSE`)
und folgen ihr (`Tool.worn`). Die beiden **Controller** trugen lange dieselbe
Grundhaltung als Faust; die stand aber 74° quer zum Handgriff, und seit sie um
ihn gerechnet ist (oben), sieht man das Gerät auch in der Faust liegen. Die
**Boxhand** trägt die Grundhaltung selbst:
`holdHandPose` gibt für ihre Id die Grundhaltung heraus, gespeichert oder
gebaut, damit auf der Werkzeugseite nicht zwei Hände übereinanderstehen. Ohne
jede Faust bleiben die **Flügel** — sie sitzen an den Armen. Was nicht zielt
(`alignToAim = false`), hat keinen Standardgriff: der ist im Strahlraum
eingemessen. Dass die Liste zu dem passt, was
die Werkzeuge wirklich anbauen, misst `gripMount.test.ts` nach: es baut sie und
legt das Maßband an — inzwischen zweiundzwanzig Stück. Es prüft dort gleich das
Zweite mit: dass **jedes** Werkzeug mit Griff entlang des Zeigestrahls zielt.
Eine Neigung darf sein (das Drohnendeck kippt zum Kopf), ein
halbes Rechteck ist keine Neigung mehr, sondern eine andere Richtung — genau
das war die Taschenlampe. Sie hält sich inzwischen daran, ohne in der Liste zu
stehen: ihr Rohr liegt auf derselben Zielachse wie jeder Lauf, sie _baut_ nur
keinen Standardgriff an.

#### Die Faust gehört zum Griff

Der eigentliche Gewinn steht nicht in der Geometrie, sondern im Speicher:
**eine Faust gehört zu einem Griff und nicht zu einem Werkzeug.** Achtzehn
Werkzeuge mit demselben Zylinder in derselben Hand haben _eine_ Haltung und
nicht achtzehn — wer sie zwanzigmal einstellt, stellt neunzehnmal dasselbe ein
und einmal aus Versehen etwas anderes, und merkt es an dem einen.

`holdHandPose` fragt deshalb in drei Stufen (`core/handPoseStore.ts`):

1. die für **dieses Werkzeug** gespeicherte Haltung — sie ist die spätere und
   genauere Auskunft und gewinnt;
2. sonst die Haltung des **Standardgriffs**, wenn es ihn trägt;
3. sonst die **gebaute** (`defaultHoldPose`).

Die Faust des Griffs liegt dabei unter einer gewöhnlichen Werkzeug-Id
(`GRIP_POSE_ID` in `core/handPose.ts`): `grip`, der Griff selbst. Keine neue
Art von Schlüssel, und das ist Absicht — damit tragen Speicher, Konfig-Code und
Kurzcode sie, ohne dass irgendwo ein Format wächst. Im Kurzcode steht `grip-rod`
weiterhin an seinem Platz, obwohl es den Stabgriff nicht mehr gibt: der Platz
_ist_ dort das Format, und wer eine Zeile herausnimmt, macht aus jedem alten
Code einen, der etwas anderes meint. Die Kette hält `core/gripHandPose.test.ts` fest,
mit einem `localStorage` aus einer Map.

Und `grip` ist zugleich ein **echtes Werkzeug**: der blanke **Halterzylinder**
(`GripTool.ts`), ohne Lauf, Deck oder Rohr darum herum. Wer ihn in die Hand
nimmt und daran einmisst, misst die Faust ein, die alle anderen daran erben.
Er hat keinen Trigger und keine zweite Funktion — ein Halter tut nichts, das ist
sein ganzer Sinn.

**Wo vorne ist, sagt eine Linie.** Einem Zylinder sieht man nicht an, wie herum
er in der Faust liegt. Also ein rosa Pfeil aus seiner Mitte nach **-Z**
(`createGripFront`), dorthin, wohin der Zeigefinger zeigt. Rosa, weil der
Halter grün ist, die Hand hellblau, ihr Zeigestrahl weiß und der Zielpfeil des
Werkzeugs violett — die erste Fassung war grün auf grün und damit unsichtbar.
Der Halter trägt sie über `GripOptions.front`; die Werkzeugseite hängt sie
jedem an, den sie findet (`addGripFronts`, auch den beiden am Drohnendeck).
Rosa und weiß nebeneinander sind die ganze Auskunft beim Justieren: sind sie
parallel, sitzt die Faust. Auf der Werkzeugseite stellt ein Knopf genau das her
(_Auf den Zylinder_, siehe _Bearbeiten auf der Werkzeugseite_), und dort kommt
eine dritte dazu: der **violette Zielpfeil** aus dem Nullpunkt des Werkzeugs
nach -Z. Auch der zeichnet nichts Neues — das eigene -Z eines gehaltenen
Werkzeugs _ist_ der Zeigestrahl (`tools/aim.ts`) —, er macht nur sichtbar,
wonach geschossen und geleuchtet wird, und er hängt an dem, was wirklich zielt
(`alignToAim`): Boxhand, Controller, Flügel und Beutel zeigen nirgendwohin und
bekommen keinen.

Eine Grenze bleibt: was hier entsteht, ist die **gebaute** Lage. Wer ein
Werkzeug am ersten Justierstand nachmisst, verschiebt es samt Griff gegen die
Hand — der Griff ist Geometrie und wandert nicht hinterher. Genau dafür gibt es
den zweiten Stand.

Der Speicher legt sich darüber, sobald jemand selbst justiert
(`handPoseStore.ts`); wer zurücksetzt, landet wieder hier. Im Speicher steht
außerdem, **an welcher Hand** eine Werkzeugpose gemessen wurde
(`poseStore.ts`, `storedPoseHand`) — und das ist keine Fußnote mehr, sondern
die Hand, für die die Zahlen gelten; siehe gleich darunter. Der Kurzcode trägt
die Seite ohnehin, und das Menü zeigt sie unter _Lage in der Hand
zurücksetzen_.

**Eine Haltung gehört einer Hand — die andere wird gerechnet.** Der
WebXR-Griffraum ist für beide Hände _gleich_ gebaut und nicht gespiegelt; die
gezeichnete Hand darin dagegen schon (`defaultHoldPose`, `mirrorHandPose`). Ein
Werkzeug, das in beide Hände dieselben sechs Zahlen mitbrachte, lag deshalb in
der einen ordentlich in der Faust und in der anderen daneben — bei allem, was
nicht ohnehin symmetrisch im Griff sitzt. In der Brille sah man das an der
**Stoppuhr** und am **großen Hammer**.

Also weiß `Tool`, an welcher Hand seine Haltung gemessen ist (`holdHand`, ab
Werk rechts), und die andere Hand rechnet sie daraus — **gespiegelt** an der
Mitte des Körpers, dieselbe Regel wie bei der Hand selbst: Versatz zur Seite,
Gier und Roll drehen das Vorzeichen um. Gespiegelt wird dabei die _Lage_ und
nicht das **Modell**, und das ist Mathematik, keine Wortwahl: eine gespiegelte
Drehung ist selbst wieder eine Drehung, das Ding darin bleibt, wie es gebaut
ist — keine seitenverkehrte Schrift, keine rückwärts laufenden Zeiger. Was der
rechten Hand zum Gesicht zeigt, zeigt der linken zum Gesicht.

**Die Stoppuhr hatte eine Weile eine eigene Regel, und die war falsch.**
`otherHand = 'turn'` drehte sie für die linke Hand um ihre eigene Hochachse um
180° statt sie zu spiegeln, aus der Sorge, gespiegelt liefe ihr Zeiger
rückwärts. Die Sorge war unbegründet (siehe oben), die Drehung aber nicht
harmlos: sie kippt das Blatt in der _Tiefe_ um und nimmt den Gehäuseversatz
(`showHeldBy`, ein Halbmesser neben dem Griffpunkt) mit auf die falsche Seite.
Bei der **gebauten** Lage (`RIM_HOLD`/`RIM_TILT`) fiel das nicht auf: ihr Blatt
schaut genau zur Seite und ihr Gehäuse sitzt fast auf der Griffachse, dort
ergeben Spiegelung und Drehung auf den Millimeter dasselbe — und genau diese
Zahlen zeigt die Vorschau auf der Werkzeugseite, in beiden Händen richtig. Bei
jeder **neu gemessenen** Lage aber, deren Blatt auch nur ein Stück zum Gesicht
kippt, lag die Uhr in der _anderen_ Hand verdreht und um Zentimeter neben der
Faust: links gemessen, rechts daneben, und umgekehrt. In der Brille sah man
das, in der Vorschau nicht, weil dort keine gemessene Lage im Speicher lag.
Die Regel ist weg; es gibt nur noch die Spiegelung.

Gerechnet wird sie in `holdForOtherHand` (`tools/toolPose.ts`, mit Test: die
Spiegelung stimmt mit `mirrorReadout` überein, ist ihre eigene Umkehrung, lässt
ein Blatt zum Gesicht schauen und legt ein Gehäuse neben dem Griff auf die
spiegelbildliche Seite), angewandt in `Tool.holdIn` — und von dort aus überall,
wo eine Hand im Spiel ist: `applyHold`, der Griffstand, die Werkzeugseite und
der Avatar der Mitspieler. Für alles mit **Standardgriff** ist die Umrechnung
ein Nullschritt: dessen Haltung hat weder Versatz zur Seite noch Gier oder
Roll. Es ändert sich also nur dort etwas, wo wirklich etwas schief lag.

Wer eine Haltung einmisst, schreibt die Hand mit dazu — Justierstand,
Werkzeugseite und `applyStoredPose` setzen `holdHand` zusammen mit den Zahlen.
Ohne das spränge ein links gemessenes Werkzeug in dem Moment weg, in dem die
Messung fertig ist. Zwei Werkzeuge rechnen gar nicht um: ein **angezogenes**
(die Handschuhe), dessen Lage _die_ Haltung der Hand ist und die schon je Hand
gespiegelt ankommt, und die beiden **Controller**, die es je Seite einzeln gibt.

**Am Griffstand liegt das Werkzeug so, wie es in der Hand liegt.** Die Kopie
dort hält niemand, also läuft `applyHold` für sie nie — und ein Werkzeug, das
sein Modell im Griff verschiebt, stand damit am Stand anders da als in der
Faust. Die **Drohne** ist der Fall, an dem es auffiel: einhändig rutscht ihr
Deck um einen halben Griffabstand zur Seite, damit der Griff dieser Hand auf dem
Ursprung sitzt (10,5 cm), am Stand stand sie mittig. Wer die Boxhand dort an den
sichtbaren Griff legte, mass diese 10,5 cm mit ein und hielt hinterher ein
Gerät, das neben der Hand schwebte; wer die Hand statt dessen in die _Mitte_ der
Kopie legte, hatte es richtig — was genau der falsche Weg ist, sich das zu
merken. Der Stand ruft jetzt `Tool.showHeldBy(seite)`, ebenso der Halter am
ersten Stand (`mountTool`, auch für den Fall, dass jemand das Ding zweihändig
hereintrug). An der Messung selbst ändert das nichts: die rechnet gegen den
**Ursprung** des Werkzeugs, und der bleibt liegen.

**Und in der eigenen Hand rief es lange niemand.** Derselbe Fehler, eine Ebene
weiter: Werkzeugseite, Griffstand und der Avatar der Mitspieler stellen das
Modell je Hand hin, für die eigenen Hände im Spiel tat es niemand — dort blieb
es für immer so stehen, wie der Bausatz es hingelegt hatte. Bei der **Stoppuhr**
war das die Seite der _rechten_ Handfläche (das Gehäuse sitzt einen Halbmesser
neben dem Griffpunkt, damit seine Kante in der Faust liegt), und die linke Hand
bekam die Uhr obendrein noch um die eigene Hochachse gedreht (damals
`otherHand = 'turn'`, siehe oben) — eine Drehung nimmt einen Versatz mit. Beides zusammen schob das Gehäuse links um
zwei Halbmesser aus der Faust: **3,4 cm** neben der Faustmitte rechts, **8,6 cm**
links. In der Brille hing die Uhr rechts am Daumen und links unter dem kleinen
Finger — und in der Vorschau auf der Werkzeugseite sah sie trotzdem richtig aus,
weil die genau diese Zeile schon hatte. Die Zeile steht jetzt in
`StopwatchTool.applyHold`, wo Hammer und Drohne sie aus demselben Grund auch
haben, und `core/gripFist.test.ts` hält beide Zahlen fest.

**Der Nullpunkt am zweiten Stand sitzt am Werkzeug.** Eine Handhaltung ist ein
Versatz im _Griffraum_, und die Null darin ist der Griffpunkt des Controllers,
nicht das Werkzeug — auf Null zurückgesetzt sprang die Boxhand deshalb um den
Versatz _und_ um die 30° zwischen Faust und Zeigestrahl weg und lag sichtbar
neben der Lampe. _Zurücksetzen_ schreibt jetzt die Lage des Werkzeugs im Griff
selbst (`TuneWorld.gripHomePose`), und die Hand steht danach exakt in der
Kopie; von dort justiert man nach außen, statt sich erst wieder heranzutasten.

### Konfig-Code

Alle diese Zahlen zusammen — Werkzeug-Posen, Handhaltungen, Anbauteile,
Waffenwerte, Drohne und Supermanhandschuh — passen in eine Zeile:

```
BG3AD8CBg4XPBcMBignAgnwAd8SAQEGFKsCwAwBBgEGRE-YAoQHZAzmAQMAAcACAG6MAbQBZHh4ZIwBeCCPYA
```

Das ist **kein Hash**: `tools/gearCodec.ts` schreibt die Zahlen nach einem
Schema, das beide Enden kennen (deshalb reisen keine Feldnamen, keine Klammern
und keine Anführungszeichen mit), `src/core/configCode.ts` komprimiert das
Ergebnis mit einem winzigen LZSS-Verfahren (Wörterbuch im Datenstrom, deshalb
ohne Bibliothek und ohne `CompressionStream`) und packt es in base64url mit
einer Prüfsumme hinten dran. Der Code eines einzelnen Werkzeugs ist deshalb
kurz genug für die Werte-Tafel im Eingaberaum, und der einer einzelnen
Handhaltung kurz genug zum Abtippen:

```
BG3AAEBBR4XMBcGMU0            # eine Werkzeugpose
BG3AAICP_ABY-AD3xLADPAuALiA   # eine gemessene Handhaltung
```

`decode(encode(x))` gibt exakt `x` zurück — der Jest-Test besteht darauf,
mitsamt Umlauten, leeren Objekten und einem verdrehten Zeichen, das abgelehnt
werden muss.

Ein Code trägt seit **Version 2** eine **Abschnittsmaske** vorneweg: sie sagt,
welche der sechs Sorten überhaupt darin stehen. Erst damit gibt es einen Code
für _ein_ Werkzeug — ohne sie trüge der des Pinsels zwangsläufig die
Pistolenwerte mit sich herum und würde sie beim Laden überschreiben. Was nicht
drinsteht, wird beim Laden auch nicht angefasst; innerhalb eines Abschnitts
wird eingemischt statt ersetzt.

**Version 3** ist die Fassung fürs Abtippen. Eine gemessene Handhaltung kostete
vorher 66 Zeichen und kostet jetzt 27, aus drei Gründen:

- Die **Versionsnummer steht im Prefix** (`BG3…`) statt im Payload. Ein Byte,
  also anderthalb Zeichen — bei der ganzen Ausrüstung Rauschen, bei einer Hand
  messbar. Nebenbei weiß ein Leser vor dem ersten Byte, wie er zu lesen hat.
- Vor jeder Pose steht **noch eine Maske**, eine Ebene tiefer: welche ihrer
  Zahlen überhaupt verstellt sind. Eine Handhaltung hat zwölf Werte, von denen
  eine Messung im Eingaberaum genau sechs anfasst — die anderen sechs kosten
  jetzt ein Bit statt eines Bytes. Verglichen wird auf dem Raster, auf dem
  geschrieben wird, sonst stünde eine 0.0000001 aus einer Quaternion-Rechnung
  für immer im Code.
- `toolGearCode` nimmt eine **Hand** entgegen. Die Stände im Eingaberaum geben
  die durch, an der sie gemessen haben; die andere steht nicht mehr als
  Behauptung im Code und macht ihn nicht mehr doppelt so lang.

**Version 4** ist eine einzige Zahl: der **Schaden** der Waffe. Angehängt
allein hätte es nicht gereicht — hinter dem Waffenabschnitt stehen Drohne und
Handschuh, und ein Leser, der ein Feld erwartet, das ein alter Code nicht hat,
nimmt dafür das erste Byte des nächsten Abschnitts. Der Zoom durfte seinerzeit
angehängt werden, weil er am **Ende** des Payloads stand und ein leerer Leser
Nullen liefert; ein Feld in der Mitte kostet eine Nummer. Das ist der Preis
dafür, dass die Reihenfolge zählt, und er ist einmalig zu zahlen.

Codes der Fassungen 1 bis 3 werden weiter gelesen (`tools/gearCodec.ts`, mit
Test) — geschrieben wird nur noch 4.

#### Der Kurzcode

Für den häufigsten Fall war auch Fassung 3 noch zu breit: eine Werkzeugpose
kostete **22 Zeichen** — genau so viele wie die sechs Zahlen im Klartext
(`4,-2.8,1.7,-44,26,-105`). Ein Code, der nicht kürzer ist als das, was er
ersetzt, ist keiner. Schuld war nie die Menge, sondern die **Verpackung**:
Abschnittsmaske, Feldmaske, Varints, ein Kompressions-Flag und zwei Byte
Prüfsumme sind zusammen mehr als die Nutzlast, wenn die Nutzlast sechs Zahlen
ist.

Deshalb gibt es daneben den **Kurzcode** (`tools/shortCode.ts`, mit Test), der
nur einen Fall kann — _ein_ Werkzeug an _einer_ Hand — und dafür nichts
mitschleppt:

```
BP <Platz:1> <Flags:1> <Nutzlast> <Summe:2>

BPKGSwKKT7nssF8            # ein Griff              15 Zeichen
BPNDLmS5tAj9BFkRQK7MQ3Qg   # Werkzeugpose + Griff   24 Zeichen
```

**Die Wertebereiche.** Ort −30,0…+30,0 cm in Zehntelschritten (601 Stufen je
Achse), Pitch und Roll 0…359° in ganzen Grad (360), **Yaw nur −90…+90°** (181).
0° und 360° sind derselbe Winkel, also wird nur 0…359 geführt. Und Yaw braucht
wirklich nur die halbe Runde: `eulerXYZ` bestimmt den mittleren Winkel mit
`Math.asin`, der _kann_ nicht darüber hinaus — mit 20 000 gleichverteilten
Drehungen nachgemessen, größter Wert 89,12°. Eine von Hand getippte Haltung mit
Yaw 120° geht trotzdem nicht verloren: sie wird vor dem Packen einmal durch das
Quaternion geschickt und kommt als dieselbe Drehung mit |yaw| ≤ 90 zurück.

**Das Packen.** Alles, was in einem Code steht, wird zu **einer** Ganzzahl zur
gemischten Basis — auch zwei Posen, die dann nicht einzeln aufgerundet werden.

**Wie lang das wird**, entscheidet das _Produkt_ der Stufen und nicht ihre
Summe. Das ist die Stelle, an der die naheliegende Rechnung dreimal
danebenlag — „360+360+360 = 1080, passt in zwei Zeichen" ist um sieben
Größenordnungen zu klein, und auch `601³ · 360 · 181 · 360` sind nicht 42,6
Billionen, sondern gut 5 Billiarden:

```
601³ · 360 · 181 · 360 = 5 092 218 055 137 600   ( = 52,18 bit )
59^8  =     146 830 437 604 321   zu wenig
59^9  =   8 662 995 818 654 939   reicht
```

Also **neun** Zeichen für eine Pose und **achtzehn** für zwei — nicht acht und
sechzehn. Gerechnet wird mit `BigInt`, weil zwei Posen zusammen über 2⁵³
liegen; ab dort zählt eine JavaScript-Zahl nicht mehr in Einsen. Die drei
Zahlen stehen als Test da, damit die Rechnung nicht ein viertes Mal verrutscht.

**Das Alphabet** hat 59 Zeichen statt 64: kein `0`/`O`, kein `1`/`I`/`l`. Ein
Code wird in einer Brille von einer Tafel abgelesen und mit einer Zeigehand
eingetippt — dort ist eine Null, die wie ein O aussieht, kein Schönheitsfehler,
sondern ein Fehlversuch. Alle 59 sind URL-sicher (`-` und `_` gehören zu den
_unreserved characters_ aus RFC 3986). Und es kostet nichts: 59⁹ liegt immer
noch über den 5,09·10¹⁵ Möglichkeiten, es bleibt bei neun Zeichen. Lesbarkeit
gratis.

Die **Prüfsumme** hat zwei Zeichen, weil eines nicht reichte: von 166
vertauschten Zeichen kamen vier durch, und ein Code, der in vier von hundert
Fällen still eine fremde Handhaltung einträgt, ist schlimmer als einer, der ein
Zeichen länger ist. Der Test probiert alle einzelnen Tippfehler und alle
Vertauschungen durch.

Was das bringt:

|                                | großer Code | Kurzcode |
| ------------------------------ | ----------- | -------- |
| eine Werkzeugpose              | 22          | **15**   |
| Werkzeug **und** Griff         | 66          | **24**   |
| eine Grundhaltung samt Fingern | 33          | **22**   |

Die Finger stehen nur drin, wenn sie **verstellt** sind: eine Messung fasst sie
nicht an, und was sich nicht geändert hat, gehört nicht in einen Code, den
jemand abtippt. Fehlen sie, kommen sie beim Lesen aus der gebauten Haltung
dieses Werkzeugs — nicht aus einer Null, sonst streckte ein Code, der nur den
Griff verschiebt, nebenbei alle fünf Finger.

Für die **ganze** Ausrüstung bleibt der große Code zuständig, und der ist nicht
zu lang, sondern voll: eine wirklich benutzte Konfiguration (vier eingemessene
Werkzeuge samt Griffen beider Hände) sind rund 170 Zeichen. Wer alle 24
Werkzeuge und alle 48 Griffe verstellt, hat siebzig Posen, und siebzig Posen
sind nun einmal siebzig Posen — da hilft keine Verpackung mehr.

`parseGearCode` nimmt beide Sorten entgegen; welche es ist, sagt das Präfix
(`BG3` oder `BP`). Der ganz kurzlebige Vorgänger `BGK…` wird **nicht** mehr
gelesen — er stand einen Nachmittag lang im Code, mit anderem Alphabet und
anderen Bereichen, und ein zweiter Leser dafür wäre mehr Ballast als Nutzen.

#### Über die Leitung

Im Eingaberaum stehen zwei Knöpfe an der Wand: **Werkzeug senden** und **Alles
senden**. Sie schicken den Code an alle, die gerade im Raum verbunden sind
(`NetSession.emit` auf dem Kanal `gear`), und drüben wird er wie jeder andere
gelesen, geprüft und eingetragen — inklusive der Werkzeuge, die schon in einer
Hand liegen (`applyStoredConfig`). Verschickt wird die **Zeile** und nicht der
Datensatz: dieselbe, die auch auf der Tafel steht, mit derselben Prüfsumme
davor. Damit gibt es einen Weg hinein statt zweier, die auseinanderlaufen
können. Und das ist der Punkt, an dem der Kurzcode sich auszahlt: ein Werkzeug
sind 25 Zeichen, also ein Paket.

In VR liegt der große Code unter _Einstellungen → Konfig-Code_: **Code anzeigen**
legt ihn gleich in die Zwischenablage (und in die Browser-Konsole), **Code
laden** nimmt ihn wieder entgegen — eingefügt oder Zeichen für Zeichen. Die
**Werte-Tafeln im Eingaberaum** zeigen außerdem unter jeder Messung den Code
für genau das gemessene Werkzeug an genau dieser Hand. Am Rechner geht
dasselbe auf der Kommandozeile:

```bash
npm run config -- decode BG3…        # zeigt die Einstellungen als JSON
npm run config -- encode config.json   # macht wieder einen Code daraus
npm run config -- mirror BG3… left   # linke Handhaltungen nach rechts
```

Damit ist „hier sind meine Einstellungen, mach das für die andere Hand auch"
eine Zeile statt vierzig Zahlen.

Der **Strahl** zum Gegenstand kommt erst, wenn das Ferngreifen wirklich
eingerastet ist, und sagt dann genau eine Sache: _daran kannst du jetzt
ziehen_. Beim bloßen Zielen läge er nur im Bild — dort leuchtet der Gegenstand,
und das reicht. Abschalten geht unter _Einstellungen → Greifen → Strahl beim
Ferngreifen_. Ferngreifen schaltet sich außerdem selbst ab, solange beide Hände
dicht beieinander sind und eine davon schon etwas hält — dann will man den
Gegenstand übergeben und nicht quer durch den Raum zielen.

### Der Poseraum

Rechts hinter dem Schießgang liegt seit dieser Runde ein dritter Arbeitsplatz,
und er beantwortet eine Frage, die die beiden Stände nicht können. Halter und
Griffstand messen beide die Hand **am Controller** — und eine Hand am
Controller ist eine Faust um einen Zylinder. Wie eine Hand einen Gegenstand
wirklich anfasst, sieht anders aus. Wer eine Handhaltung _realistischer_ haben
will, muss die **blanke** Hand messen, und das ging erst, seit sie einen
Handschuh tragen kann (siehe _Handmodell_).

**Der Gang ist dafür rechts breiter geworden, und nur rechts.** `LANE` hat
seither zwei halbe Breiten (`tune/lane.ts`, mit Test): links 2,2 m wie immer,
rechts 4,2 m. Die alte rechte Wand ist nicht verschwunden, sondern zur
**Trennwand mit Tür** geworden — ihre Gangseite liegt exakt dort, wo die Wand
stand, also hängen die acht Knöpfe und die Werte-Tafel keinen Zentimeter weiter
weg. Den ganzen Gang zu verbreitern wäre die naheliegende Änderung gewesen und
die falsche: eine Tafel wird nicht dadurch lesbarer, dass der Raum größer wird.
Die Tür sitzt hinter der zweiten Knopfspalte und vor der Werte-Tafel; die Tafel
ist dafür ein Stück weiter nach hinten gewandert, denn eine Tür, die eine Tafel
halbiert, ist eine Tafel weniger.

Fünf Dinge stehen darin:

- **Der Schwebekasten** (`tune/HoverBox.ts`): eine durchsichtige Kiste in der
  Luft, in der die Schwerkraft aufhört. Man hält ein Werkzeug hinein, lässt es
  los, und es bleibt liegen — samt der Lage, in der man es gehalten hat.
  Justiert wird danach, indem man es wieder anfasst und anders hinlegt. Der
  Griffstand nebenan löst dasselbe mit einer **Kopie** in einer Aufnahme, und
  das ist genau richtig, solange man vorher weiß, welches Werkzeug man ansehen
  will; hier geht es andersherum.

  Er hat **keinen Körper**: er hält nichts auf, er sagt nur, wo die Schwerkraft
  aufhört. Ein Kasten mit Wänden wäre eine Vitrine, und in eine Vitrine legt man
  nichts hinein, ohne die Tür zu öffnen. Gebaut ist er als **Kanten plus Hauch**
  (sechs Flächen bei 6 %) — sechs halbdurchsichtige Wände vor einem Werkzeug
  sind sechs Schleier, und dahinter beurteilt man nichts mehr.

  Was er tut, steht in `PortalWorld.floatZone`: eine **Zone** und kein Sonderfall
  im Loslassen. Sonst wären es zwei — ein Werkzeug fliegt über `releaseTool` aus
  der Hand, ein Gegenstand über `release` —, und hineingeworfen werden kann
  ohnehin von überall. Eine Zone, die jedes Bild nachsieht, kennt keinen dieser
  Wege und trifft trotzdem alle. Gemerkt wird dabei der **Zustand vor dem
  Eintritt** und nicht „Schwerkraft 1": ein geworfenes Messer fliegt mit
  abgeschalteter Schwerkraft geradeaus, und wer es beim Verlassen auf 1 setzte,
  ließe es mitten im Flug fallen. Gedämpft wird kräftig (4,5), damit ein
  losgelassenes Ding steht, wo man es hingelegt hat, statt langsam durch den
  Kasten zu driften.

- **Der Feststeller** (_Schwebe: frei_ / _festgestellt_) hält an, was im Kasten
  hängt, bis er wieder ausgeht. Schwerelos ist nämlich nicht dasselbe wie
  unbeweglich, und das ist beim Messen der Unterschied zwischen einer Zahl und
  einer Nachbewegung: das Werkzeug hängt weich, die Hand, die man daran legt,
  stupst es an, man rückt nach — und gemessen hat man am Ende, wie es
  ausgewichen ist. Schlimmer noch: die blanke Hand, die man zum Messen um ein
  Werkzeug schließt, _ist_ die Greifgeste (`handGestures.ts`), und sie nahm es
  einem bei jedem zweiten Versuch wieder aus dem Kasten.

  Festgestellt steht es wie angeschraubt **und lässt sich nicht mehr greifen**
  (`PortalWorld.setFloatFixed`, gesperrt in `aimGrab`). Gesperrt werden dabei
  Verschiebung und Drehung des Körpers (`lockTranslations`/`lockRotations`) und
  nicht die Schwerkraft: die ist in der Zone ohnehin aus, und ein Körper ohne
  Schwerkraft behält trotzdem jeden Stoß. Beim Freigeben steht er da, wo er
  stand, statt mit dem alten Schwung weiterzuziehen. Der Kasten sagt es in
  Bernstein statt in Grün — ein Kasten, in dem sich nichts mehr bewegt, sieht
  sonst aus wie einer, in dem sich gerade nichts bewegt, und die gesperrte Hand
  hielte man für einen Fehler. Wer den Raum verlässt, nimmt den Schalter nicht
  mit: er geht mit der Zone aus.

- **Der Schalter an der Wand** zieht getrackten Händen den Handschuh an. Er
  steht hier und nicht nur im Menü, weil man ihn genau hier braucht.

- **Der Knopf _Knochenfarben_** daneben färbt jeden Knochen einzeln ein
  (siehe _Knochenfarben_ oben). Ein- und ausschaltbar wie der Handschuh, und
  aus demselben Grund an derselben Wand: hier stellt man eine Zahl je Knochen
  ein, und fünf gleich weiße Röhren sagen nicht, welcher gerade gemeint ist.

- **Der Knopf _Handpose teilen_** schickt die Haltung der **anderen** Hand live
  an alle im Raum. Gezeigt hat die Hand mit dem Controller, geteilt wird die
  daneben, und das ist keine Höflichkeit, sondern die einzige Aufteilung, die
  aufgeht: die gemessene Hand liegt am Gegenstand und darf sich nicht rühren,
  also muss die andere drücken — und die andere ist die mit dem Gerät darin.
  Ihr **Trigger** hält die Haltung dann fest; ein Knopf an der Wand ginge auch,
  nur müsste man dafür die Hand vom Gegenstand nehmen.

**Gemessen wird mit derselben Kette wie am Griffstand** (`tune/handGrip.ts`):
die Lage der gezeichneten Hand im Raum des Werkzeugs, und daraus über
`handFromGhost` die Haltung im Griffraum. Der Griff kürzt sich heraus, und
genau das ist hier der Punkt — in der messenden Hand steckt kein Controller.
Hängt **nichts** im Kasten, bleibt die nützlichere Hälfte übrig: die **Finger**.
Eine blanke Hand misst das Headset ohnehin (`foldCurls`), und bis hierher
landete das nirgends; die Grundhaltung behält damit ihre Lage und bekommt die
Krümmung der echten Hand.

**Und jede Kugel einzeln.** Was gespeichert wird, sind nicht mehr nur fünf
Krümmungen und eine Spreizung, sondern der ganze Gelenkteil einer Haltung
(`HandPose.joints`, `core/handBones.ts`): je Finger **drei Beugungen und eine
Fächerung**, in Grad — zwanzig Zahlen, genau die, mit denen die gezeichnete
Hand ihre Knochen dreht. Die Krümmungen bleiben daneben stehen und passen dazu:
sie sind die Zusammenfassung, die auf der Tafel steht, in den Kurzcode geht und
ein Modell mit weniger Knochen bedient. Wo eine Haltung Gelenke hat, **gewinnen
sie**; wer im Menü eine Krümmung tippt, wirft sie weg (`setHandPoseField`) —
sonst änderte man eine Zahl und sähe an der Hand nichts passieren.

Gespeichert werden sie hinten an derselben Zahlenreihe, in der eine Haltung
schon immer lag (`handPoseToArray`, ab Feld 12): angehängt und nicht
dazwischengeschoben, damit jeder alte Leser weiter dieselbe Haltung liest. Der
große **Konfig-Code** liest genau zwölf Felder — mehr passen nicht in seine
Maske — und trägt sie deshalb **nicht**; die Krümmungen daneben sagen dieselbe
Haltung so genau, wie ein Modell mit fünf Zahlen sie sagen kann. Der Speicher im
Browser trägt sie, und dort werden sie gemessen.

Am Werkzeug überleben sie die Knöpfe: über eine gemessene Haltung legt sich nur
noch die Ebene der Finger, die ein Knopf wirklich bewegt (`buttonCurlLayer`) —
der Trigger zieht den Zeigefinger, und die anderen vier stehen weiter dort, wo
die Messung sie gefunden hat.

**Sieht die Brille die Hand gerade nicht** — sie liegt hinter dem Werkzeug, der
Handschuh ist aus —, dann steht statt der Messung die **eingestellte** Haltung
da, und die Tafel sagt das im Titel („— eingestellt"), denn die Zahlen sehen in
beiden Fällen gleich aus. Sie geht trotzdem über die Leitung: damit sieht ein
Zuschauer das Werkzeug im Kasten auch dann, und genau dafür ist der Kasten da.
Gespeichert wird sie nicht — eine Haltung auf sich selbst zu schreiben ist
keine Messung.

Der **Konfig-Code** dazu wird an Ort und Stelle gebaut (`packShortGear`) und
nicht aus dem Speicher geholt: was auf der Tafel steht, soll die Haltung sein,
die man gerade sieht, und nicht die, die zuletzt gespeichert wurde. Auf der
Tafel steht er unter den zwölf Zahlen, der Knopf _Pose senden_ schickt ihn als
Chat-Zeile an alle (siehe _Über die Leitung_).

#### Live auf die Werkzeugseite

Über der Leitung geht dabei **mehr als der Code** (`tune/handShare.ts`, mit
Test, ohne three.js). Ein Zuschauer im Browser hat keinen Griff, keine
Zielkorrektur und keinen Speicher, gegen den er eine Haltung aus dem Griffraum
verrechnen könnte; er müsste die halbe Kette nachbauen, und stünde die Hand
dann ein Grad anders als in der Brille, wüsste niemand, welche der beiden
stimmt. Also gehen **beide** Formen hinaus und keine wird nachgerechnet:

- `at`, `curls` und `spread` sind das **Bild**: wo die Hand am Werkzeug liegt,
  in dessen eigenem Raum, so wie sie gerade gezeichnet wird. Drüben wird das
  Werkzeug gebaut, die Hand hineingehängt, fertig.
- `joints` sind **die zwanzig Winkel**, wenn drüben eine blanke Hand gemessen
  wird: gespreizte Finger, an jedem Gelenk einzeln geknickt. Sie gehen nur mit,
  wenn es sie gibt — zwanzig Nullen hießen „flach ausgestreckt" und nicht
  „nicht gemessen" —, und ein Zuschauer, der sie nicht auswertet, zeigt weiter
  dieselbe Hand aus den Krümmungen.
- `code` ist der **Zettel**: dieselbe Zeile, die auf der Tafel steht. Sie wird
  drüben nicht gelesen, sondern kopiert.

Zwanzigmal je Sekunde, auf dem Kanal `hpose` — derselbe Weg, den auch Portale
und Gegenstände nehmen (`NetSession.emit`). Das Bild, das der Trigger festhält,
trägt `saved` und geht sofort hinaus, ohne auf den nächsten Takt zu warten.

## Architektur

```
src/
  core/      Engine, Player-Rig, Locomotion, XR-Input, Pointer, Hände, Avatar
             — darin `colors.ts`, die einzige Stelle mit den Greiffarben,
             und `grabSettings.ts`, die drei Reichweiten des Greifens
  physics/   Rapier-Wrapper und der Charakter-Controller (dynamisch geladen)
  ui/        Canvas-basierte 3D-UI (Panel, Textflächen, Handgelenk-Menüs)
             — darin `menuNav.ts`, der Weg durchs Menü, den sich beide
             Handgelenke teilen
  net/       Transport-Interface, WebRTC/BroadcastChannel, Presence, Avatare,
             Zuschauer-Kamera
  worlds/    Weltenregistry + je eine Welt pro Ordner (inkl. `PortalSync`,
             dem geteilten Zustand des Portal Labors)
             — darin `npc/`, alles, was in einer Welt herumläuft: Haut, Hirn,
             Körper und der Regisseur, der sie zusammenhält
tools/     Kommandozeile: `npm run config` liest und schreibt Konfig-Codes
```

Wie sich der Spieler bewegt, entscheidet ein austauschbares `Locomotion`:
der Hub gleitet frei über die Plattform, das Portal Labor hängt eine
Rapier-Kapsel mit Schwerkraft, Kollision und Sprung ein. Die Physik-Engine
(rund 1 MB gzip) liegt in einem eigenen Chunk und wird erst geladen, wenn eine
Welt sie braucht.

**Alles, worauf jemand steht, braucht Dicke.** Ein Collider kommt aus der
Bounding-Box der Geometrie, und eine `PlaneGeometry` hat keine — aus null wird
ein Zentimeter, das Minimum. Ein Zentimeter ist aber dünner als die **Haut** des
Character-Controllers (`CHARACTER_SKIN`, 2 cm): die Kapsel steckt dann dauernd
halb im Boden, und wer eine Durchdringung auflösen muss, gibt in dieser Frame
keine Bewegung heraus. In der Brille sieht das aus wie ein Spieler, der beim
Gehen alle paar Schritte stehenbleibt und dabei langsam einsinkt — und niemand
sucht das im Boden. Die Fläche bis zum Horizont ist deshalb ein **Kasten** von
einem halben Meter (`GROUND_THICKNESS`, mit Test), dessen Oberseite dort liegt,
wo vorher die Ebene lag.

**Und die Kapsel wird über dem Boden abgesetzt, nicht auf ihm**
(`SEAT_CLEARANCE`, 6 cm). Das ist die Zahl, wegen der man beim Stehen langsam
im Fußboden versank, nach dem nächsten Portal wieder oben drüber stand und der
Sprung mal kam und mal nicht — drei Beschwerden, ein Ursprung. Der
Character-Controller sucht den Boden nämlich nur auf der Strecke, die er gehen
soll, und was näher liegt als seine eigene Haut, sieht er überhaupt nicht: Eine
Sohle, die genau auf der Fläche steht, steht in seinem toten Winkel, wird von
ihr nicht mehr gehalten und sackt Bild für Bild tiefer, bis sie unten
herausfällt (gemessen: ein Meter in zehn Sekunden, bei manchen Bildraten der
ganze Weg aus der Welt). Genau so wurde sie aber abgesetzt, beim Betreten jeder
Welt und nach jeder Versetzung. Die paar Zentimeter, um die sie sich danach
setzt, bekommt der Spieler nicht mit: Das Rig lässt sie aus (`seatSlack`).

Dazu **misst** die Fortbewegung jedes Bild den Abstand zwischen Sohle und
Fläche, statt ihn dem Controller zu glauben (`groundGap` — ein Formwurf der
Kapsel nach unten). Liegt die Fläche in Hautnähe und der Controller hat sie
trotzdem nicht gesehen, unterbleibt der Schritt nach unten; steckt die Kapsel
schon darin, wird sie mit zwei Millimetern je Bild herausgeschoben. Das
Zweite kommt vom **Ansaugen** (`GROUND_SNAP`), das gelegentlich danebengreift:
Es stand auf 28 cm — eine ganze Treppenstufe — und riss den Spieler auf freier
Fläche dreizehn Zentimeter in die Bodenplatte hinein, wo der Controller ihn
auch nicht mehr vorwärts ließ. Das ist das Stocken beim Gehen, das aus dem
Nichts kommt und sekundenlang anhält. Jetzt sind es 8 cm; eine Treppe hält das
genauso sauber, und was höher ist, ist ohnehin ein Absatz, den man fällt.

**Ein Sprung wartet kurz auf den Boden und gilt kurz nach der Kante weiter**
(`JUMP_BUFFER` 0,15 s, `COYOTE_TIME` 0,12 s). Wer im Laufen abspringt, drückt
oft ein Bild zu früh oder ein Bild zu spät, und beides verschluckte den Sprung
ganz. Dazu kam ein zweiter Fehler mit demselben Ergebnis: Der Controller meldet
den frisch verlassenen Boden noch ein, zwei Bilder als betreten, und dort
löschte ein `min(v, 0)` die frische Sprunggeschwindigkeit wieder — aus 4,4 m/s
wurden fünf Zentimeter Hüpfer, und zwar mal so, mal so. Gemessen wird das jetzt
mit echtem Rapier bei fünf Bildraten (`physics/playerFooting.test.ts`).

**Wer einen Körper versetzt, zieht die Collider nach** (`syncColliders`).
Rapier tut das sonst als Erstes im nächsten Schritt, und abgefragt wird der
Collider, nicht der Körper: Wer den Spieler umsetzt und im selben Bild den
Character-Controller rechnen lässt, fragt sonst von der alten Stelle aus und
bekommt eine Bewegung zurück, die zu einem anderen Ort gehört — in der Brille
ein Spieler, der nach dem Portal fünf Zentimeter im Boden steht.

**Ein Körper wird höchstens einmal weggenommen** (`PhysicsWorld.remove`), und
das steht hier, weil der Preis so hoch ist: Ein zweites `removeRigidBody`
desselben Eintrags — oder eines aus einer Welt, die schon freigegeben ist —
beantwortet keine Frage, sondern reißt die wasm mit („recursive use of an
object", `RuntimeError: unreachable`), und das Spiel ist weg. Aufräumer gibt es
mehr als einen: der Bestand räumt seine NPCs weg, die Welt ihre Requisiten, ein
geworfenes Werkzeug ist beides. Also merkt sich jeder Eintrag, dass er weg ist
(`PhysicsBody.removed`), und die Welt merkt sich, dass sie freigegeben ist —
das zweite Mal passiert dann einfach nichts. `labPhysics.test.ts` hält es fest,
und zwar so, wie man es nur mit echter Engine festhalten kann: ohne die Sperre
stürzt derselbe Test mit genau dieser Meldung ab.

Der `App`-Loop ist bewusst schlank: Input → Locomotion → `world.update()` →
UI → Netzwerk → Render. Eine Welt darf über `world.render()` selbst rendern;
das Portal Labor nutzt das für seine Zusatzdurchgänge.

### Wie schön es aussieht

_Menü → Grafik_, und die Seite trägt ein **EXP** im Abzeichen: Beides hier ist
ein Experiment, beides kostet Bildrate, und keines ist ab Werk an.

Das Bild, das dieses Projekt immer hatte, ist **eine** von zwei Stufen und
heißt jetzt so:

- **Einfach** — flache Farben, ein Himmelsverlauf, drei Lichter, keine
  Schatten. Nicht „sparsam", sondern _identisch_ mit vorher: Wer nichts
  einstellt, sieht Pixel für Pixel dasselbe Bild wie gestern. Das ist keine
  Behauptung, sondern eine Prüfbedingung — jede Zahl im einfachen Profil ist
  der Wert, den `App` ohnehin setzt (`graphicsSettings.test.ts`).
- **Comic** — dieselbe Welt als Zeichnung: eine **schwarze Kontur** um jedes
  Ding, Licht, das in **Stufen** auf den Flächen liegt statt in einem Verlauf,
  **Schatten** von der hellsten Sonne der Welt (ohne sie schwebt in einer
  Zeichnung alles) und ein **schärferes Bild** in der Brille
  (`framebufferScale` 1,2, Foveation 0,3 statt 1).

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

#### Die schwarze Kante

Eine Kontur um alles gibt es auf zwei Arten, und die naheliegende fällt hier
aus: Ein **Nachbearbeitungsschritt** (Bild rendern, Kanten im Tiefen- und
Normalenbild suchen) braucht einen Zwischenpuffer für das ganze Bild, und den
gibt eine WebXR-Sitzung nicht her, ohne dass man ihr das Bild aus der Hand
nimmt, das sie selbst für zwei Augen zusammenbaut. Also der ältere Weg, den
Comic-Spiele seit zwanzig Jahren gehen: **die umgestülpte Hülle**
(`core/outlineShell.ts`). Jedes Ding wird ein zweites Mal gezeichnet, in
Schwarz, ein wenig aufgeblasen, mit den **Rückseiten** nach vorn — sichtbar
bleibt nur der Saum, der ringsum darüber hinausragt. Kostet einen zweiten
Zeichenaufruf pro Ding (Dust: 869 → 1824) und funktioniert in beiden Augen.

Vier Dinge daran sind Erfahrung und keine Theorie:

- **Geglättete Normalen.** Ein Quader aus `BoxGeometry` hat an jeder Ecke drei
  Normalen, eine je Fläche; bläst man entlang dieser auf, fahren die Flächen
  auseinander und die Kontur bekommt an jeder Ecke eine Lücke. Also liegt neben
  jeder Geometrie einmalig eine **gemittelte** Normale (`bgvrOutlineNormal`) —
  ohne die Geometrie selbst anzufassen. Über 24 000 Ecken wird das
  übersprungen: Am Alpen-Hang fällt eine Ecke nicht auf, ein Ruckler schon.
- **Gedeckelt auf einen Anteil des Dings.** Ein gleich breiter Saum auf dem
  Bildschirm heißt: in der Nähe schmal, in der Ferne (in Metern) breit. Der
  erste Versuch machte aus der **Dominoreihe im Portallabor eine Reihe
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
Null — mit ihr war das Portallabor, in dem das Licht aus zwei Deckenlampen
kommt, zur Hälfte stockschwarz. Ein Boden von 60 % lässt eine dunkle Fläche
dunkel bleiben, ohne sie auszulöschen. Die Stufenzahl steht als **Zahl im
Quelltext** und nicht als Uniform: An ihr hängt der Programmschlüssel, und eine
Uniform ändert den nicht. Die `#include`-Zeile von three.js, an der der Umbau
hängt, prüft ein Test gegen den echten Shader — eine umbenannte fiele sonst
erst in der Brille auf.

Und was in der Szene passiert, steht in `core/graphicsScene.ts` — angewendet
von `core/GraphicsQuality.ts`, das bei der **App** hängt und nicht bei einer
Welt: Ein Schatten ist keine Eigenschaft des Portallabors, und der Hub hat gar
kein Weltmenü, in das eine Grafikeinstellung passte.

- **Die Szene wird abgelaufen, nicht die Welten geändert.** Es gibt fünfzehn
  davon, sie werden nachgeladen, und jede müsste sonst dieselben vier Zeilen
  selbst schreiben — die sechzehnte würde sie vergessen. Der Durchlauf ist
  **idempotent und umkehrbar** (jeder überschriebene Wert liegt vorher unter
  `userData`) und läuft **jede Sekunde erneut**: Ein Zombie, der nach dem
  Umschalten aus dem Käfig kommt, hätte sonst als Einziger keinen Schatten.
- **Eine Kulisse wirft keinen Schatten.** `markBackdrop` ist genau dafür da:
  Der Himmel steht um alles herum, die Bodenplatte reicht bis zum Horizont, und
  beide würden die halbe Welt verdunkeln. Empfangen dürfen sie ihn. Genauso
  wenig wirft Durchsichtiges einen — ein Fenster mit einem Brett als Schatten
  ist schlimmer als eines ohne.
- **Der Schattenkasten wandert mit dem Kopf.** Eine Karte deckt 28 Meter ab,
  die Welten reichen bis zum Horizont: Die Sonne behält exakt ihre Richtung
  (sonst wanderten die Schatten beim Gehen), nur Lampe und Ziel rücken hinter
  den Spieler, eingerastet auf zwei Meter — ohne das kriechen die Ränder bei
  jedem Schritt über die Kanten, und das ist in einer Brille deutlich
  unangenehmer als ein Schatten, der alle zwei Meter einmal springt. Gerechnet
  wird in Weltkoordinaten, weil die Schattenkarte genau so liest; das Ziel eines
  Richtungslichts hängt an keiner Szene, also wird seine Weltmatrix von Hand
  gerechnet.
- **Das Grundlicht geht mit herunter** (Hemisphären- und Umgebungslicht auf
  0,7). Das ist der unscheinbarste Wert und der wichtigste: Ein Schatten ist
  nur so dunkel, wie das Licht daneben hell ist, und diese Welten leuchten mit
  1,5 aus — auf voller Stärke war der schönste Schatten ein Hauch. Weiter
  herunter geht es nicht: Zwei Farbstufen brauchen Mitteltöne zwischen sich.
  Lampen bleiben unangetastet: Der Dimmer im Dunkelhaus, die Deckenlampen im
  Interaktionslabor und der Blitz einer Explosion stellen ihre Stärke selbst
  ein.
- **Die Schattenkarte wird einmal pro Bild bestellt** (`shadowMap.autoUpdate`
  aus, `needsUpdate` im Loop). Spiegel und Portalsichten zeichnen die Szene
  mehrmals; jede dieser Zeichnungen würde sie sonst neu bauen.

Im **Konfig-Code steht davon nichts** (`configCode.ts`). Was ein Gerät leisten
kann, ist keine Einstellung, die man verschickt: Ein Code aus einer Brille darf
einem PC nicht die Schatten abschalten und einer vom PC einer Brille keine
aufzwingen.

### Wie man aussieht

_Menü → Aussehen_, und es ist die erste Sorte **Kleidung** in diesem Projekt
(`core/appearance.ts`, `core/headgear.ts`).

Bis hierher sahen alle gleich aus: derselbe Körper aus Kapseln, dieselbe Farbe
nach Gerät, ein schwarzes Visier vorn (`core/AvatarBody.ts`). Für eine
Werkstatt geht das, für eine Sitzung mit drei Leuten nicht — wer sich
unterscheiden will, hat sonst nur seinen Namen dafür.

Angefangen wird **oben**, und zwar aus zwei Gründen. Der einfache: Ein Kopf ist
das, was man von einem anderen Spieler zuerst sieht, und in VR schaut man
ohnehin ständig auf Köpfe. Der bessere: Ein **Helm ist nicht nur Schmuck**,
sondern ein Mittel gegen Übelkeit — siehe das Klemmbrett im Gokart.

Sieben Sorten, aus Zylindern, Kugeln und Quadern wie alles hier: **ohne**
(die Auslieferung), **Basecap**, **Helm**, **Bauhelm**, **Mütze**, **Zylinder**
und **Krone**. Was eine Anzugfarbe trägt, trägt die des Trägers — ein Spieler
hat eine Farbe und nicht drei.

Drei Regeln stecken darin, und alle drei sind es wert, aufgeschrieben zu
werden:

- **Der Hut hängt am Kopf des Avatars und nicht am Körper.** Das ist der ganze
  Trick daran: `setSelfView` blendet den Kopf aus, sobald man in den eigenen
  Augen steckt, und nimmt den Hut damit von selbst mit. Man sieht seinen
  eigenen im Spiegel und durch ein Portal — so wie man auch seinen eigenen
  Körper nur dort sieht.
- **Er gehört dem Spieler und keiner Welt.** Gespeichert wird er wie die
  Augenhöhe und die Grafikstufe, also im Browser und nicht in einer Welt; wer
  ihn im Hub aufsetzt, trägt ihn im Gokart auch. Eine Welt darf ihn
  **ausleihen** (`WorldContext.wear`) — das Gokart tut es für den Helm —, und
  `null` gibt den Kopf wieder der Einstellung zurück. Wer aussteigt, hat wieder
  seinen eigenen Hut auf.
- **Er geht über das Netz**, und zwar in der **Anmeldung** und nicht in der
  Pose (`net/NetSession.ts`, Feld `hat` im `hello`). Ein Hut ändert sich einmal
  am Abend, eine Pose zwanzigmal in der Sekunde: Wer ihn wechselt, sagt sich
  neu an. Das Feld ist optional — eine ältere Fassung schickt es nicht mit, und
  wer nichts sagt, geht barhäuptig. Was hereinkommt, ist fremder Text und geht
  durch `asHeadgear`.

**Von innen ist ein Helm etwas anderes als von außen.** Außen eine Schale,
innen ein **Rahmen**: ein Kreisring vor dem Auge (`visorFrame`), dessen Loch
aus einem halben Meter Abstand rund 90° freies Blickfeld lässt. Die Mitte des
Bildes bleibt vollständig, außen wird es dunkel — und genau dort, am Bildrand,
ist die schnelle Bewegung, von der einem schlecht wird. Beide haben außer dem
Namen nichts miteinander zu tun, und deshalb sind es zwei Funktionen.

### Die Karte in der Hand

Ein Werkzeug im Regal, das nichts tut außer zu sagen, wo man ist
(`portal/tools/MapTool.ts`, gerechnet in `portal/tools/mapPlot.ts`).

**Sie ist mit Absicht ein Ding und keine Anzeige im Blickfeld.** Eine Minimap
in der Ecke des Bildes ist die Antwort vom Bildschirm; in einer Brille ist sie
das, wovon einem schlecht wird — sie klebt am Kopf, hat keine Entfernung, und
man kann sie nicht weglegen. Eine Karte in der Hand hat all das: Man hebt sie
an, dreht sie ins Licht, hält sie näher ans Auge und steckt sie wieder weg.

**Woher sie weiß, wie die Welt aussieht: aus dem Kachelgitter**, das jede Welt
beim Aufbau von sich selbst abtastet (`PortalWorld.bakeNavigation`) — dasselbe,
über das auch die NPCs laufen, erreichbar über `ToolHost.navMap()`. Das ist
keine Notlösung, sondern die einzige ehrliche Quelle: Eine zweite, eigens
gepflegte Kartenbeschreibung je Welt wäre eine Liste, die nach der dritten
Änderung lügt. So gibt es nichts zu pflegen — wer eine Wand baut, hat sie damit
auf der Karte, und eine Tür, die aufgeht, geht auch dort auf.

Vier Entscheidungen:

- **Ein Ausschnitt und keine Übersicht.** Ein Kasten um den Träger, der mit ihm
  wandert. Eine Karte, die immer die ganze Welt zeigt, ist in Dust ein grauer
  Fleck und in der Kletterhalle ein Punkt. Der **Trigger** schaltet den Maßstab
  weiter: 20 → 40 → 80 → 160 m, im Kreis. Mehr Bedienung hat sie nicht.
- **Norden ist oben, immer.** Das Blatt dreht sich nicht mit, der **Pfeil**
  darauf schon. Die Alternative wäre verführerisch, aber wer die Karte in der
  Hand hält, dreht sie ohnehin selbst dorthin, wo er sie lesen will — und eine
  Karte, die sich beim Gehen unter der Hand mitdreht, ist ein Kreisel. In der
  Umrechnung steckt die eine Zeile, an der sich eine Karte verrät: In three.js
  zeigt −z nach vorn, auf dem Blatt zeigt kleines _v_ nach oben.
- **Ein Stockwerk und nicht vier übereinander.** In Dust liegen vier Etagen
  aufeinander; übereinandergelegt wären sie ein Knäuel aus Wänden, das nichts
  mehr sagt. Genommen wird die, auf deren Boden der Kopf am ehesten steht
  (`nearestLevel`).
- **Was sie zeigt, sagt etwas.** Boden als helle Felder, gesperrte Kacheln rot
  (`NavGraph.isBlocked` — die eine Auskunft, die eine Karte geben kann und ein
  Blick nicht), Wände schwarz, **Türen** in einer eigenen Farbe und offene
  gestrichelt (wer vor einer Karte steht, sucht als Erstes den Ausgang),
  Fenster dünn und blau. Dazu ein Punkt je Mitspieler aus derselben Sitzung.

Gerechnet wird alles in **Blattkoordinaten** (0…1, _v_ nach unten wie auf jeder
Leinwand) und ohne three.js, damit es ohne Brille geprüft werden kann;
`MapTool.ts` malt nur noch.

### Was aus dem Beutel kommt

Der Beutel ist die Kiste mit dem Spielzeug, und alles darin steht in
`worlds/portal/props.ts` — Sorte, Netz, Masse und Collider an _einer_ Stelle,
denn beide Seiten einer Sitzung bauen aus derselben `kind` dasselbe Ding, und
die Werkzeugseite liest dieselbe Liste (`BAG_ITEMS`). Der **Name** steht
daneben in `PROP_LABELS`: Wer nur wissen will, wie etwas heißt — die Meldung
beim Herbeirufen, der Inspektor, das Schild im Beutel —, soll dafür keine
Geometrie, kein Material und keine Textur bauen müssen.

Zu den sieben Bauklötzen der ersten Stunde sind neun dazugekommen, und sie
teilen sich in zwei Gruppen:

- **Was sich bewegt**: **Kegel** (rund, während die Pyramide derselbe Körper
  mit vier Segmenten ist — welchen von beiden man braucht, merkt man beim
  Umwerfen), **Rampe** (der Keil, mit dem eine Kugel irgendwo hinunterrollt),
  **Stab** (neunzig Zentimeter Metall, der Hebel und die Achse für alles
  Gebaute) und **Murmel** (klein, schwer und sprungfreudig — sie hat als
  einzige einen eigenen Rückprall im Bauplan).
- **Der Würfelsatz**: die **fünf platonischen Körper** als W4, W6, W8, W12 und
  W20, gebaut in `worlds/portal/dice.ts`.
- **Die Sektflasche** (`worlds/portal/champagne.ts`): das erste Ding, das man
  nicht anfasst, sondern **hält**, und das erste, das etwas **tut** — siehe
  unten.
- **Der Standspiegel** (`worlds/portal/standingMirror.ts`): 1,65 m Glas im
  Bügel auf einem Fuß, hoch genug, um sich ganz darin zu sehen.

**Warum der Standspiegel ein Ding und kein Werkzeug ist.** Die nächstliegende
Vorlage wäre die **Staffelei** gewesen: ein Werkzeug, das etwas hinstellt und
danach die Hand wieder leer macht. Aber ein Werkzeug ist etwas, das man
_benutzt_ — es hat einen Trigger, es tut etwas, es liegt in der Hand. Ein
Standspiegel tut nichts: Er steht herum, man schiebt ihn dorthin, wo man ihn
braucht, und stellt sich davor. Genau das ist ein Ding aus dem Beutel — es hat
einen Körper, es fällt um, man kann es tragen und werfen, der Duplizierer legt
ein zweites daneben, und die anderen in der Sitzung sehen es an derselben
Stelle stehen. Die Staffelei ist nur deshalb ein Werkzeug, weil sie
ausdrücklich **kein** Hindernis sein darf: Man muss mit der Pinselspitze durch
sie hindurchgreifen können. Bei einem Spiegel will man das Gegenteil. Sein
Collider ist deshalb der ganze Kasten aus Fuß, Pfosten und Rahmen — einer nur
um den Rahmen fiele bei der leisesten Berührung um, und ein Standspiegel, der
nicht steht, ist keiner.

**Ein Griff an einem Ding aus dem Beutel.** Ein Werkzeug kommt vom Gürtel in
die Hand und liegt dort, wie seine Haltung es sagt; ein Ding aus dem Beutel
wird _angefasst_: die Hand schließt sich, wo sie es berührt, und es bleibt, wie
es lag. Für einen Würfel ist das richtig, für eine Flasche nicht — die fasst
man am **Hals**. Also kann ein Beutel-Objekt einen **Griff** tragen
(`worlds/portal/propGrip.ts`, `PROP_GRIPS` in `props.ts`): einen Zylinder in
seinem eigenen Raum, und beim Zugreifen rastet der in die Faust — in dieselbe,
die den **Standardgriff** hält (`GRIP_FIST`, `GRIP_HAND_POSE`; die Hand trägt
die Haltung unter der Sorte als Id, und `gripFist.test.ts` prüft, dass der
Hals darin liegt). Der Hals steht damit senkrecht in der Faust wie ein
Pistolengriff; eine Weile war es die Faust am Hammerstiel, und die Flasche lag
quer in der Hand wie eine Taschenlampe. **Und ein Zylinder hat kein Oben**: die
Flasche lässt sich aufrecht halten und **über Kopf**, am Hals gepackt. Welche Lage
gilt, entscheidet die Hand beim Zugreifen — `snapToGrip` kippt die Achse in die
nähere der beiden Richtungen und dreht sonst nichts, auch nicht um die Achse
(mit Test). Das ist der Unterschied zu einem Werkzeug: das kommt beim ersten
Griff immer in seiner einen Haltung; ein Ding mit Griff darf man drehen, wie man
will, und der Griff nimmt es so. Beim **Nahgreifen** rastet nichts — da bleibt
das Ding liegen und folgt der Hand von dort; erst der Zug holt es her, und dann
rastet es. Ein Objekt ohne Eintrag in `PROP_GRIPS` verhält sich wie immer.

**Und der Korken knallt.** Geschüttelt wird gemessen, nicht geraten
(`ShakeMeter`, mit Test): nicht die Geschwindigkeit der Hand — ein Wurf ist
schnell und kein Schütteln —, sondern wie oft und wie hart sie die **Richtung
wechselt**, aufsummiert mit Verfall; ein Ruck allein reicht nicht, ein paar in
einer Sekunde reichen, und eine vorsichtig getragene Flasche knallt nie. Dann
löst sich der Korken vom Hals und wird ein eigener kleiner Körper, der die
Halsachse hinausfliegt und irgendwo liegen bleibt (man kann ihn aufheben),
dazu ein Schwall Schaum aus der Mündung (`Foam`, Punkte statt Kugeln) und der
Knall (`playPop`). Die Flasche bleibt offen; eine neue kommt aus dem Beutel.
Über das Netz geht nur _dass_ es geknallt hat (`pop` in `PortalSync.ts`): der
Korken ist ein Effekt und kein geteilter Gegenstand, jede Seite lässt ihren
eigenen fliegen. Wer später dazukommt, sieht die Flasche mit Korken — der Preis
dafür, dass der Zustand nirgends gespeichert wird.

Am Würfelsatz hängen zwei Dinge, die es vorher nicht gab.

**Die Zahlen werden gerechnet, nicht gezeichnet.** Ein Ikosaeder von Hand mit
einem UV-Netz zu versehen wäre eine Stunde Fleißarbeit und danach unantastbar.
Stattdessen wird das Netz gelesen: Dreiecke mit gleicher Normale sind eine
Fläche (beim Dodekaeder je drei), jede Fläche bekommt ihre Zelle in einer
Zahlen-Textur, und ihre Ecken werden in diese Zelle projiziert. Wer die Zahl
trägt, entscheidet `worlds/portal/diceFaces.ts` (mit Test) nach der Regel
echter Würfel: **gegenüberliegende Flächen ergeben zusammen `n + 1`**. Der
Tetraeder hat kein Gegenüber und zählt darum einfach durch. 6 und 9 bekommen
den Strich darunter, ohne den sie dasselbe Zeichen sind. Der W6 behält als
einziger sein eigenes UV-Netz — three.js reiht die vier Ecken einer
Kastenseite zeilenweise auf, und die gerechnete Fassung legte die Zahl damit
ausgerechnet auf dem Würfel quer, den jeder kennt.

**Und sie brauchen einen Collider, der kippt.** Bis dahin kannte die Physik
Kasten, Kugel, Zylinder und Kegel; ein W20 wäre als Kugel bis zur Wand
gerollt und nie liegen geblieben, eine Rampe als Kasten keine Rampe. Also gibt
es eine fünfte Form: **`{ kind: 'hull', points }`**, die konvexe Hülle der
Ecken (`physics/PhysicsWorld.ts`). Der Punktpuffer ist dabei die Vorlage _und_
der Maßstab: `resize` zieht ihn an Ort und Stelle mit, statt sich die
Ausgangsgröße daneben zu merken — damit landet zweimal Verdoppeln dort, wo
einmal Vervierfachen landet, und das Transformationswerkzeug funktioniert an
einem Würfel wie an einer Kiste.

### Wer hier herumläuft

Bis hierher war die Spielwiese leer: Dinge, die man anfasst, Werkzeuge, mit
denen man sie bearbeitet, und sonst niemand. **NPCs** sind die dritte
Kategorie im Handgelenk-Menü, neben Werkzeugen und Beutel, und sie sind
bewusst keine von beiden — was hier herauskommt, läuft von selbst weiter.

**Ein NPC besteht aus zwei Hälften, und sie werden einzeln ausgesucht.**

- Die **Haut** (`worlds/npc/npcKinds.ts`) sagt, wie er aussieht: Modell,
  Größe, Masse, Leben, seine Farben und ob die Arme **nach vorn** zeigen wie
  beim Zombie oder neben ihm hängen wie bei allem anderen — die eine
  Silhouette, an der man auf dreißig Meter erkennt, was da kommt. Vorne ist
  −Z, dort sitzen auch die Augen; mit dem falschen Vorzeichen streckte der
  Zombie sie eine Weile nach hinten und sah aus, als ergäbe er sich. Drei
  Häute gibt es: den **Zombie**, die **Übungspuppe** — beide sterben nach
  denselben Regeln, die Puppe hält nur mehr aus (160 statt 100) — und den
  **Hamster**, denselben Körper in klein (60 cm, 20 Leben). Er ist keine
  Zierde: Er ist die Sorte, die vor einer Dachkante stehen bleibt, weil sie den
  Aufprall nicht überlebt (`nav/navFall.ts`), und ohne ihn wäre der Fallschaden
  eine Zahl ohne sichtbare Folge. Ein eigenes Modell hat er nicht — was ihn
  ausmacht, sind zwei Zahlen und ein Profil, und dafür baut man keine zweite
  Geometrie.
- Das **Hirn** (`worlds/npc/npcBrains.ts`) sagt, was er tut: **Stehen**
  (bleibt, dreht sich zum Spieler, schlägt nie zu), **Schlendern** (läuft
  einen gewürfelten Kurs, bis ihm ein anderer einfällt, und bemerkt niemanden),
  **Verfolgen** (der Zombie: kommt, sobald man in Sichtweite ist, und
  schlägt in Reichweite zu) oder **Zum Ziel** (er hat einen Auftrag und sonst
  nichts: geht dorthin, wo er hinsoll, sieht den Spieler nicht, will ihn nicht,
  schlägt nicht zu — Sichtweite null ist dort die Aussage und keine vergessene
  Zahl). Das vierte ist das Hirn für alles, was etwas **vorführen** soll: Der
  NPC, der zeigen soll, dass man die Treppe hinaufkommt, hat genau eine
  Aufgabe, nämlich hinaufzukommen. Sein Ziel steht im NPC (`Npc.sendTo`) und
  ersetzt den Spieler in beiden Rechnungen auf einmal — der Läufer sucht den
  Weg dorthin, das Hirn bekommt es als Ziel.

Warum getrennt: Zwei mal vier ist acht, und eine Liste von acht Sorten NPC
wäre beim nächsten Modell zwölf und beim übernächsten vierundzwanzig. Vor
allem aber sind es zwei verschiedene Fragen — *wie sieht der aus* und *was
macht der* —, und wer sie zusammenlegt, kann keine davon mehr einzeln
beantworten. Eine Übungspuppe mit einem Verfolger-Hirn ist ein Trainingsgegner,
ein Zombie mit „Stehen" eine grüne Zielscheibe; beides fällt ab, ohne dass
jemand etwas dafür gebaut hätte.

**Bedient wird es zweimal, und beide lesen denselben Speicher** — genau wie
beim Beutel, den es als Rasterseite *und* als Werkzeug gibt. Im Menü unter
**NPC** stehen die Häute als Zeilen (`Zombie setzen`), dazu das eingestellte
Hirn als Unterseite, _Spawnpunkt hier_, _Brutkäfig hier_ und _Alles
wegräumen_. In der Hand tut dasselbe das **Hirn** (`tools/BrainTool.ts`): ein
Gehirn auf dem Standardgriff, mit einem Knopf, der ein Panel öffnet, und einem
Trigger, der setzt, wohin man zeigt. Die Einstellung dahinter steht in
`worlds/npc/npcSettings.ts` und liegt im Browser bei der übrigen Ausrüstung
(`gearStore.ts`, `bgvr.npc`) — wer sich seinen Zombie einmal eingestellt hat,
soll ihn nach dem Neuladen nicht noch einmal einstellen. **Tempo und Leben
sind dabei absolute Zahlen und keine Faktoren**, und sie ziehen mit: eine neue
Haut bringt ihr Leben mit, ein neues Hirn sein Tempo. Wer danach selbst an
einer der beiden dreht, hat sie gesetzt, und dann bleibt sie stehen.

**Das Hirn ist eine Rechnung, und sie steht ohne three.js da**
(`worlds/npc/npcBrain.ts`, mit Test). Hinein gehen zwei Punkte in der Ebene,
ein Gierwinkel und die Zeit; heraus kommt eine Wunschgeschwindigkeit, ein
Gierwinkel und die Frage, ob in dieser Frame ein Schlag landet. Was ein Zombie
tut, ist damit etwas, das man ansehen kann, ohne die Brille aufzusetzen — und
was man nur in der Brille ansehen kann, sieht sich niemand an. Zwei Regeln
darin sind es wert, hier zu stehen:

- **Gelaufen wird, wohin geschaut wird.** Ein NPC schiebt sich nicht seitwärts
  auf den Spieler zu; er dreht sich zu ihm (Drehrate aus dem Hirn, immer über
  den kürzeren Bogen) und geht dann los, und wie weit er schon herumgedreht
  ist, entscheidet über sein Tempo (`aheadFactor`, der Kosinus des Fehlers,
  nach hinten null). Das ist der Unterschied zwischen einem Zombie, der
  torkelt, und einem Schrank auf Schienen.
- **In Reichweite wird nicht mehr gelaufen, sondern geschlagen** — und zwischen
  zwei Schlägen gewartet. Ohne Wartezeit träfe er sechzigmal je Sekunde, und
  das ist kein Schlag mehr, sondern ein Föhn.

**Ein NPC ist ein Körper in der Physik**, ein Zylinder mit **gesperrter
Drehung** (`worlds/npc/Npc.ts`): er fällt, stößt gegen Wände, lässt sich
schieben — kippt aber nicht um, denn einer, der beim ersten Schubser auf dem
Rücken liegt, ist kein Gegner, sondern ein Kegel. Seine **Waagerechte** setzt
das Hirn jedes Bild, die **Senkrechte** bleibt bei der Schwerkraft; darum
fällt er von einer Kante und läuft trotzdem nicht in den Himmel. Weil die
Drehung gesperrt ist, schreibt `physics.sync()` sie als Einheitsdrehung
zurück — der Gierwinkel gehört deshalb dem **Modell** in der Gruppe und nicht
der Gruppe selbst, sonst sähe man ihn genau ein Bild lang.

**Der Ursprung liegt zwischen den Füßen.** Collider, Trefferzonen und der
Punkt, an den einer gesetzt wird, rechnen alle von der Standfläche aus; ein
Modell mit dem Ursprung in der Mitte versinkt bei jeder dieser Rechnungen zur
Hälfte im Boden. Das Modell selbst (`worlds/npc/NpcBody.ts`) ist ein Skelett
aus Klötzen mit vier Gelenken — zwei Hüften, zwei Schultern —, deren
X-Drehung der Schritt ist; die Schrittfrequenz hängt am Tempo, damit ein
stehender NPC nicht auf der Stelle tanzt. Die Augen leuchten auf, sobald das
Hirn jemanden bemerkt hat. **In den Händen sitzt je ein leerer Anker**
(`NpcBody.hands`): er trägt heute nichts und ist die Stelle, an der später ein
Werkzeug hängt — ein NPC mit einer Schusswaffe ist genau das, dieselbe
`Tool`-Instanz wie in einer Spielerhand, nur an diesem Anker statt am
Griffraum eines Controllers. Dass der Anker schon jetzt mitschwingt, ist der
Unterschied zwischen „später einhängen" und „später umbauen".

**Getroffen wird mit der Strecke, nicht mit der Kugel** (`worlds/npc/npcHit.ts`,
mit Test). Eine Kugel legt zwischen zwei Bildern Meter zurück; was sie
durchquert hat, ist eine Strecke — dieselbe Rechnung, mit der der Schießstand
seine Scheiben abrechnet (`bulletTravelled`, die der Schießstand jetzt an die
Halle weiterreicht). Getroffen wird dabei **der Körper, den man sieht**:
Kopfkugel, Rumpfkasten, Beinkasten, alle drei aus derselben Rechnung wie das
Modell (`bodyShape`) und deshalb genau dort, wo die Klötze stehen. Weil die
Kästen breiter als tief sind, bringt ein Treffer den **Gierwinkel** mit
(`HitBody.yaw`) — gerechnet wird nicht der Kasten in der Welt, sondern die
Strecke in seinen Maßen. Nur der Kopf sitzt auf der Hochachse und ist damit
richtungslos: ein Kopftreffer ist einer, wo der Kopf ist, egal wohin der Kopf
gerade schaut.

Hier stand einmal ein **Zylinder** um die Hochachse — bequem, weil er sich
nicht mitdrehen muss, und falsch: Sein Halbmesser ist der des Colliders (29 cm
beim Zombie), die Schultern sind 23 cm breit, und die Handbreit dazwischen
zählte als Rumpftreffer. Zusammen mit der Kugel, die an eben diesem Collider
abprallte (siehe unten), war das die Antwort auf „ich treffe ihn und es
passiert nichts": Beides zeigte auf denselben Zylinder, der weder das eine noch
das andere war.

**Kugeln fliegen durch NPCs hindurch** (`PhysicsWorld.GROUP_NPC`). Ein NPC hat
eine eigene Kollisionsgruppe, und eine Kugel filtert sie heraus — als
_physikalischer_ Körper existiert er für sie nicht. Vorher prallte sie an
seinem Zylinder ab, blieb eine Handbreit **vor** der Trefferzone stehen und
sprang zurück: Die Strecke, die anschließend gefragt wurde, hatte ihn nie
berührt, und vier Schuss richteten nichts aus. Alles andere stößt sich
weiterhin an ihm — der Spieler, seine Hände, jede Kiste.

**Man kann die Zonen ansehen**: _Menü → NPC → Trefferzonen zeigen_ (und
derselbe Schalter unter der laufenden Vorschau der Werkzeugseite) hängt jedem
NPC ein Drahtgitter genau dieser Kästen an — Kopf rot, Rumpf und Beine blau,
gezeichnet aus `hitParts()` und nicht aus einer zweiten Rechnung daneben. Es
ist die Ansicht, mit der man „ich treffe ihn nicht" von „ich ziele daneben"
unterscheiden kann.

**Was ein Treffer kostet, bringt die Waffe mit**: die Pistole ihre eingestellte
Zahl (25, also vier Rumpftreffer für einen Zombie), das Messer 50, der große
Hammer 100 — und der Kopf zählt überall vierfach (`HEAD_FACTOR`). Hier stand
einmal eine feste Zahl je Zone, und das hieß: Ein Messer tut genau so weh wie
ein Gewehr. Dass der Kopf, den man
*sieht*, auch der ist, auf den man *zielt*, hält `npcBody.test.ts` fest —
Modell und Trefferzone rechnen dieselbe Zahl (`HEAD_SHARE`), und zwei
Rechnungen, die dasselbe meinen, laufen sonst irgendwann auseinander; dasselbe
misst er inzwischen für Rumpf und Beine nach. Wer
fällt, geht sofort aus der Physik heraus, liegt ein paar Sekunden als Bild da
und verschwindet dann; ohne das Aufräumen füllt sich eine Halle mit Leichen,
und jede davon zeichnet weiter mit. **Weggeräumt wird immer beides**, Modell
und Körper (`Npc.dispose`): ein Zylinder, der ohne sein Modell in Rapier
stehen bleibt, ist ein unsichtbares Hindernis, dessen Ursache man nie findet.

**Was zuschlägt, braucht Tempo und danach eine Pause**
(`portal/tools/meleeSwing.ts`, mit Test). Eine Kugel fliegt los und trifft; ein
Messer liegt in der Hand und ist die ganze Zeit irgendwo. Wer jedes Bild fragt
„stecke ich in einem Zombie", trifft sechzigmal in der Sekunde, und ein Messer,
das man einem Zombie nur hinhält, tötet ihn dann im Zusehen. Ein Schlag zählt
deshalb nur, wenn die **Spitze** sich schnell genug bewegt (`SWING_SPEED`),
danach ist kurz Ruhe (`SWING_REST`), und ein **Sprung** der Spitze — Handwechsel,
Portal, vom Gürtel gezogen — zählt gar nicht, sonst führe die Strecke quer durch
den halben Raum. Wo die Spitze ist, sagt das Werkzeug selbst (`Tool.meleeTip`):
beim Messer die Klingenspitze, beim Hammer der Kopf. Ein **geworfenes** Messer
fragt dieselbe Strecke ab, die es ohnehin schon gegen Wände prüft — und fällt
dort zu Boden, wo es getroffen hat, statt in der Luft zu hängen, wo eben noch
ein Zombie stand.

**Über jedem NPC steht ein Lebensbalken** (`worlds/npc/NpcBody.ts`) — zwei
**Sprites** und keine Textur: Ein Sprite steht in three.js immer quer zur
Kamera, ohne dass jemand es dorthin drehen müsste, und das ist genau, was ein
Balken braucht, den man von vorn, von der Seite **und von oben** liest. Die
Füllung schrumpft nach links (`center`) und geht dabei von Grün über Gelb nach
Rot. **Die Balkengruppe dreht sich nicht mit ihm**: Ein Sprite steht zwar immer
quer zur Kamera, seine *Stelle* aber kommt aus der Kette darüber — und bei
einem, der einen ansieht (Gierwinkel um 180°), war der linke Rand plötzlich der
rechte, die Füllung stand **neben** ihrem Rahmen statt darin. Also nimmt die
Gruppe die Drehung des Modells wieder heraus. Zu sehen ist er voreingestellt **bei Schaden** — ein Balken über einem
unversehrten Zombie ist eine Zeile, die immer dasselbe sagt, und dreißig davon
sind dreißig. Unter **Menü → NPC → Lebensbalken** steht *immer* (zum Nachprüfen
der Zahlen) und *aus*; dasselbe schaltet die laufende Vorschau auf der
Werkzeugseite.

**Und andersherum:** ein Schlag, der sitzt, **schiebt den Spieler** und
rüttelt in beiden Händen. Lebenspunkte hat der Spieler nicht — es gibt in
dieser Welt nichts, was sie zählen würde —, und ein Treffer, den man nicht
spürt, ist trotzdem keiner. Wer eine Lebensanzeige will, hängt sie an genau
einer Stelle ein (`PortalWorld.takeHit`).

**Woher einer kommt, dafür gibt es zwei Antworten** (`worlds/npc/npcSpawn.ts`,
mit Test), und beide sind reine Rechnung:

- Ein **Spawnpunkt** ist eine Stelle, an der jemand auftauchen *darf* — ein
  Kreis auf dem Boden, durch den man hindurchläuft. Wer einen braucht, bekommt
  einen ausgewürfelt, und zwar nach derselben Regel, nach der ein Spieler nach
  dem Tod wieder ins Spiel kommt: **möglichst nicht direkt vor der Nase
  dessen, der schon da ist**. Taugt keiner, wird nicht aufgegeben, sondern der
  entfernteste genommen — in einem kleinen Raum ist keiner weit genug weg,
  und „nicht ideal" ist besser als „gar nicht".
- Ein **Brutkäfig** ist eine Stelle, die von selbst nachlegt; das Vorbild
  steht in einem Verlies aus Klötzchen. Er hat einen Takt, eine Grenze für
  seine eigenen Kinder und einen Ring, in dem sie entstehen. **Der Käfig sagt
  wann, der Spawnpunkt sagt wo**: Sein Kind kommt auf einem ausgewürfelten
  Spawnpunkt heraus (im Ring darum, damit drei Kinder keinen Turm bilden) — und
  wo **kein** Spawnpunkt steht, legt er gar nichts nach und sagt es einmal je
  Takt. Wer einen Zombie umlegt, will ihn liegen sehen und nicht zwei Sekunden
  später wieder vor sich haben; wer Nachschub will, setzt einen Punkt.
  Seine Uhr läuft **nur, während jemand in Reichweite ist**: ein Käfig
  am anderen Ende der Halle soll nicht die ganze Zeit Zombies auswerfen, die
  dort niemand sieht, und wer zurückkommt, soll nicht in eine Wand aus dreißig
  Stück laufen. Sie läuft auch nicht weiter, solange er voll ist, sonst spuckt
  er nach jedem Todesfall sofort nach. Angehalten wird sie, nicht
  zurückgesetzt: wer zurückkommt, wartet den Rest des Takts ab und nicht einen
  ganzen neuen.

Verwaltet wird der ganze Bestand vom **Regisseur** (`worlds/npc/NpcDirector.ts`).
Er hängt an der **Welt** und nicht am Werkzeug — ein Zombie bleibt stehen, wenn
man das Hirn weglegt, und der Käfig legt weiter nach; das Werkzeug ist die
Bedienung, nicht der Besitzer. Der Schnitt dazwischen ist derselbe wie beim
Werkzeugkasten: die Welt reicht ein paar Fähigkeiten herein (`NpcWorld`), der
Bestand reicht ein paar Befehle heraus (`NpcControl`, am Werkzeug erreichbar
über `ToolHost.npcs()`), und keiner der beiden kennt die Innereien des
anderen. _Labor zurücksetzen_ räumt sie mit weg; vierzig gleichzeitig sind die
Notbremse.

**Wer verfolgt wird, ist der Körper und nicht die Kamera.** Wer mit der Drohne
unterwegs ist, hat seine Sicht verliehen, und der Rig steht dann draußen bei
der Maschine — sein Körper ist aber hiergeblieben (`bodyHome`), und ein Zombie
läuft zu dem Körper, den er sehen kann.

**Was noch nicht geht: das Netz.** Ein NPC ist heute das, was der Sektkorken
ist — jeder sieht seinen eigenen. Zwei Spieler in einem Raum sehen also zwei
verschiedene Zombies. Der Weg dahin, dass sie denselben sehen, führt über
`PortalSync` und über eine Antwort auf die Frage, wer von beiden das Hirn
rechnet; das ist der nächste Schritt und nicht dieser.

### Wie sich NPCs orientieren

Die Navigation ist eine **eigene Schicht** unter den NPCs (`worlds/nav/`), und
sie kennt weder three.js noch Rapier. Hinein gehen Kachelschlüssel und Meter,
heraus kommen Wege, Sichtlinien und Geschwindigkeiten — deshalb ist sie
vollständig geprüft, und deshalb kann derselbe Graph eine Welt, eine
Debug-Ansicht und einen Test bedienen.

**Die Karte ist ein Kachelgitter mit Etagenindex.** Eine Kachel ist 2,5 m breit
(`TILE`), und diese Zahl ist eine Konstante und keine Einstellung: Sie steht in
jeder gespeicherten Karte im Kopf, und wer sie ändert, macht jede davon
ungültig. Die Höhe ist ein **Index** und keine Zahl — Dach, Erdgeschoss und
Tunnel darunter liegen übereinander, ohne dass irgendeine Rechnung entscheiden
müsste, ob zwei Kacheln noch dieselbe Ebene sind. Was zwischen zwei
Kachelmitten passiert, ist ausdrücklich nicht Sache des Gitters, sondern der
Fortbewegung.

**Wände stehen zwischen Kacheln und bedeuten drei Dinge auf einmal**: ob man
hindurchkommt, ob man hindurchsieht, und wie viel man hindurchhört. Ein Fenster
ist deshalb kein „solid" mit anderer Textur, sondern eine eigene Art — es hält
auf und verrät trotzdem, was dahinter passiert. Hätte jede der drei Fragen ihr
eigenes Modell, drifteten alle drei auseinander, sobald jemand eine Wand
versetzt.

**Alles, was nicht Nachbarschaft ist, ist eine Verbindung**: Treppe, Leiter,
Absprung, Portal. Ein Portal ist dabei nichts Besonderes, sondern eine
Verbindung mit Kosten nahe null, die zur Laufzeit dazukommt und wieder
verschwindet — dieselbe Bauart, die Quake III 1999 „teleporter reachability"
nannte. Welche Art wer benutzen darf, steht im Kostenprofil: Ein Zombie nimmt
keine Leiter, ein Fahrzeug keine Treppe.

**Dieselbe Karte liest jede Sorte anders.** Eine Kachel trägt nur, *was* dort
ist (Stacheln, Wasser, freies Feld); was das *kostet*, entscheidet erst das
Profil dessen, der darüberläuft (`navProfile.ts`). Der Zombie hat für Stacheln
keinen Eintrag und fällt hinein, der Mensch hat dort `Infinity` und geht außen
herum. `Infinity` heißt dabei „niemals" und nicht „sehr teuer" — wer „lieber
nicht, aber im Notfall doch" will, schreibt eine große endliche Zahl hin.

**Und dasselbe Gelände liest auch jede Sorte anders.** Das ist derselbe
Gedanke, eine Etage tiefer, und er hat das Abtasten umgebaut: Eine Verbindung
trägt nicht mehr die *Antwort* („das ist eine Treppe"), sondern die **Form** —
wie viel es hinaufgeht (`rise`), wie hoch die größte einzelne Stufe darin ist
(`step`) und wie weit es waagerecht ist (`gap`). Fünf Zahlen im Profil machen
daraus ein Ja oder ein Nein:

- **`stepUp`** — was er *tritt*, ohne etwas dafür zu tun. Die Bordsteinkante.
- **`jumpUp`** — was er sich *hochzieht*. Das ist die Zahl, an der eine
  60-cm-Stufe für einen Zombie ein Weg ist und für einen Hamster eine Wand.
- **`maxSlope`** — wie steil ein Weg noch sein darf, in Grad, gemessen über
  eine Kachel. Sie gilt nur, wo der Boden **durchläuft**; eine einzelne Kante
  ist keine Steigung, sonst wäre jede Bordsteinkante eine 9°-Rampe und jede
  Mauer eine 45°.
- **`dropDown`** — wie tief er *freiwillig* springt.
- **`leapOver`** — wie weit er über eine Lücke setzt.

Dazu kommt der **Fallschaden** (`navFall.ts`) als sechste Zahl, und er ist die
einzige, die nicht im Profil steht, sondern sich daraus ergibt: Was mehr
abzieht, als eine Sorte Leben hat, springt sie nicht. Zwei Meter für einen
Hamster, vier für einen Zombie — dieselbe Dachkante, zwei Antworten, und keine
davon steht irgendwo als Sonderfall. Dass der Sprung dann auch wirklich
wehtut, ist die andere Hälfte davon (`npc/Npc.land`): Eine Wegsuche, die
Fallschaden einrechnet, den es beim Landen gar nicht gibt, behauptet etwas, das
niemand widerlegen kann.

**Eine Kante ist damit keine Einbahnstraße mehr.** Sie steht einmal in der
Karte und gilt in beide Richtungen; welche davon geht, fragt die Wegsuche für
**die Richtung, in die gelaufen wird** (`linkFactor`) — hinunter ein Absprung,
hinauf eine Wand. Vorher entschied das Abtasten das ein für alle Mal, und weil
es nur zwei der vier Himmelsrichtungen abläuft, hing die Antwort daran, ob die
höhere Kachel im Norden oder im Süden lag.

**Was sich ändert, ändert nichts am Graphen.** Eine Kiste setzt eine Kachel auf
`blocked`, eine Tür kippt ein Flag, ein Portal fügt zwei Kanten ein. Neu
gerechnet wird nie — die Wegsuche läuft ohnehin jedes Mal neu, und die ist
billig; teuer wäre nur das Aufbauen des Gitters, und genau das passiert dabei
nicht.

**Was ein NPC weiß, ist nicht, was die Welt weiß** (`navBelief.ts`). Jeder trägt
nur eine **Abweichungsliste** gegenüber der Wahrheit mit sich: „Tür 7 war
offen, Stand t=120 s", „das Portal kenne ich nicht". Wo nichts eingetragen ist,
gilt die Welt. Ein NPC darf deshalb gegen eine inzwischen verschlossene Tür
laufen und erst dort umplanen — **das ist das gewollte Verhalten**. Wer diese
Datei später „repariert", indem er Meinung und Wahrheit abgleicht, hat die
Hellsicht wieder eingebaut, und man sieht sie einem Bot sofort an, ohne sagen
zu können, woran. Zum Planen zählt die Meinung, zum Sehen und Hören nie: Man
sieht nicht durch eine Tür, nur weil man sie für offen hält.

**Und was er nie gesehen hat, hält er für offen** (`hopeful`). Das ist die
Freiraum-Annahme, mit der Roboter seit je durch unbekannte Gänge fahren, und
sie schließt die Lücke, die „wo nichts eingetragen ist, gilt die Welt" offen
ließ: Für eine Tür, an der noch nie jemand stand, *war* die Welt eingetragen —
also wusste ein Zombie schon dreißig Meter vor einer Metalltür, dass sie zu
ist, und bog ab, ohne je dagewesen zu sein. Dieselbe Hellsicht wie oben, nur an
der Stelle, an der niemand sie vermutet. Jetzt läuft er hin, steht davor, sieht
sie an (`navAgent.doorAhead` trägt sie in dem Moment ein, in dem sie in
Reichweite ist) und plant *dort* um — außen herum bei Metall, mit den Fäusten
bei Holz. Das **Material** ist davon ausgenommen und kommt weiter aus der Welt:
Ob eine Tür aus Brettern oder aus Blech ist, sieht man ihr an; ob sie
abgeschlossen ist, nicht.

Zwei Feinheiten hängen daran, und beide sind teuer bezahlt: `seeDoor` meldet
**nur eine Änderung** als Änderung, sonst plant einer, der eine Sekunde vor
seiner Tür steht, sechzigmal neu, weil er seine eigene Meinung für eine
Neuigkeit hält. Und die **Attrappe der Vorschau** hofft ausdrücklich nicht
(`shared/previewWalk.ts`): Sie ist der Zuschauer und keine Figur im Stück, und
ein Ring, der zu einer verriegelten Tür läuft und wieder umkehrt, sähe aus wie
eine kaputte Wegsuche.

**Route und Fortbewegung sind getrennt** (`locomotion.ts`). Die Wegsuche
liefert Kacheln; was daraus wird, entscheidet die Fortbewegungsart hinter einer
gemeinsamen Schnittstelle: der **Fußgänger** dreht sich und geht los, das
**Fahrzeug** hat einen Wendekreis und lenkt im Stand gar nicht (ω = v/R), der
**Flug** nimmt die Luftlinie und das Gitter überhaupt nicht. Wer beides
zusammenlegte, hätte am Ende eine Wegsuche, die weiß, dass Autos nicht
rückwärts durch Türen fahren — und eine zweite, sobald das erste Boot kommt.

**Für viele auf einmal gibt es das Strömungsfeld** (`flowField`). Ein Dijkstra
rückwärts vom Ziel, danach ist „wohin als nächstes" ein Nachschlagen, und ob
dreißig oder dreihundert danach fragen, kostet gleich viel. Rückwärts, damit
eine einseitige Verbindung einseitig bleibt: ein vorwärts gebautes Feld ließe
die Horde Klippen hochlaufen.

**Das Dateiformat hat vom ersten Tag an eine Versionsnummer**
(`navSerial.ts`, `NAV_VERSION`). Kacheln stehen als Läufe darin (ein Zimmer ist
vier Zeilen und nicht zwanzig), Wände und Verbindungen einzeln, und dieselbe
Karte ergibt immer dieselbe Datei — sonst zeigt ein Diff Umsortierung statt
Änderung. Gesperrte Kacheln sind Laufzeit und werden nicht gespeichert, und
**das Leben einer Tür auch nicht**: Eine gespeicherte Karte hat heile Türen;
was jemand in einer Runde kaputtgeschlagen hat, ist ein Ereignis dieser Runde
und kein Bauplan. Ihr **Material** steht sehr wohl darin — dafür ist die
Version auf **2** gegangen, und eine Tür ohne Angabe stammt aus einer Datei der
Version 1: Damals gab es nur eine Sorte, und die war aus Brettern. Wer die
Version erhöht, schreibt in `migrate()` einen Zweig dazu; ein stilles „geht
schon" ist die einzige Möglichkeit, sich hier die Karten kaputtzumachen.

**Keine Welt wird „auf Kacheln umgebaut" — sie wird abgetastet**
(`navBake.ts`). Die Welten dieses Projekts bestehen aus achsenparallelen
Quadern, `slab()` baut sie und `solids` sammelt sie; daraus lässt sich das
Gitter ableiten, ohne eine einzige Weltklasse anzufassen. Über jeder
Kachelmitte werden alle Deckel gesucht, die dort liegen — Sand bei 0, die
Stockwerke bei 3,1 und 6,2, das Dach bei 12,4 —, und jeder wird eine Kachel auf
seiner Etage, sofern darüber genug Luft für einen NPC ist. Deshalb sind der
Tunnel und der Sand darüber zwei Kacheln, und deshalb entsteht unter einem zu
niedrigen Vordach gar keine. Zwischen zwei Kacheln wird gefragt, ob dort in
Kopfhöhe etwas steht; sonst entscheidet der Höhenunterschied, ob es eine Stufe,
eine Treppe, ein Absprung oder eine Wand ist. `PortalWorld` ruft das einmal nach
`buildEnvironment()`, und damit hat **jede** Welt ihr Gitter — Dust, das Labor,
der Hub, alle.

**Eine Welt auf dem Kachelgitter wird trotzdem abgetastet** (`grid/GridWorld.ts`),
und das ist kein Versehen. Sie *hätte* ihren Graphen ja schon; ihn hier
einzusetzen statt abzutasten wäre bequem und würde genau eine Sache verlieren:
die Probe. Das Abtasten liest, was wirklich gebaut wurde, und wenn dabei die
Karte des Plans herauskommt, stimmen Plan und Welt überein. Danach wird
darübergelegt, was in keinem Quader steht und nur der Plan weiß: dass eine Wand
aufgehen kann, dass auf einer Kachel eine Küchenzeile steht, dass eine Treppe
zwei Etagen verbindet.

Drei Zahlen daran sind teuer bezahlt, und alle drei standen hinter einem
Eindruck aus der Brille, den niemand erklären konnte:

- **Eine Lücke ist erst eine, wenn jemand hindurchpasst** (`edgeOpen`). Bis
  dahin lag zwischen zwei Kachelmitten genau **ein** Prüfpunkt: die Grenze
  dazwischen. Stand dort nichts, war die Kachelgrenze offen — auch dann, wenn
  links und rechts davon je einen Meter weit eine Mauer stand und der Schlitz
  dazwischen zwanzig Zentimeter breit war. Auf der Karte war das ein Durchgang,
  in der Welt eine Wand mit einem Guckloch, und der Zombie davor lief so lange
  dagegen, bis jemandem auffiel, dass er durch eine Wand *wollte*. Jetzt wird
  quer zur Laufrichtung abgetastet, vom Mittelpunkt nach beiden Seiten, und was
  frei bleibt, muss die **Schulterbreite** tragen (`BAKE_DEFAULTS.width`, 70 cm
  — ein Zombie ist 58 dick). Gemessen wird nur der Streifen um die Mitte: Eine
  freie Ecke am Rand der Kachelgrenze nützt niemandem, der von Kachelmitte zu
  Kachelmitte läuft.
- **Ein Boden, auf dem etwas steht, ist keiner.** „Vergraben" hieß bis dahin,
  dass ein anderer Kasten den Deckel *überspannt* — ein Klotz, der bei y = 0
  anfängt, saß aber genau darauf und überspannte ihn nicht. Damit blieb unter
  jedem Klotz und in jeder aufsitzenden Wand eine Kachel übrig, die es nicht
  gibt. Zugemauert war sie von allen Seiten, also lief niemand hinein — sichtbar
  gemacht (Ebene *Betretbar*) sieht man aber sofort, dass die Karte dort Boden
  behauptet, wo Beton ist.
- **Ein Absatz ist derselbe, von welcher Seite man ihn ansieht.** Abgetastet
  werden nur zwei der vier Richtungen (Nord und Ost) — jede Grenze gehört genau
  einer Kachel, sonst stünde jede Wand zweimal da. Damit hing aber daran, ob ein
  Absatz eine **Treppe** (hin und zurück) oder ein **Absprung** (nur hinunter)
  wurde, welche Himmelsrichtung er zufällig hatte: Lag die höhere Kachel im
  Norden oder Osten, kam man hinauf; lag sie im Süden oder Westen, war dieselbe
  Stufe eine Einbahnstraße nach unten. In der halben Welt kam niemand die Rampe
  hinauf, die er gerade heruntergefallen war — und man suchte den Fehler in der
  Wegsuche, weil das Gitter ja eine Verbindung zeigte. Entschieden wird jetzt
  nach der **Höhe**: Was man hinaufkommt, geht in beide Richtungen.

Eine Welt darf zwei Dinge dazu sagen: `navLevels()` nennt ihre Stockwerke
(Dust tut das, sonst würde eine Etage zu viel geraten — die Bodenplatten liegen
`WALL` über dem Stockwerk, und die Kistenpodeste bei 1,2 m sähen aus wie eine
eigene Ebene), und `navBounds()` sagt, was abgetastet wird. Voreingestellt ist
der Umriss aller gebauten Quader **ohne** die Fläche bis zum Horizont: Die ist
absichtlich riesig, und wer sie mitzählte, tastete einen halben
Quadratkilometer leeren Sand ab. Als Boden zählt sie trotzdem — sie steckt in
den Kästen, nur nicht in den Grenzen.

**Ansehen kann man es im Menü**: _NPC → Navigationsgitter zeigen_
(`navScene.ts`). Kacheln blau, Wände rot, Kanten gelb, Verbindungen violett,
Gesperrtes magenta — und die Zeile darunter sagt, wie viele Kacheln auf welcher
Etage gefunden wurden. Ein Gitter, das man nicht sieht, ist eines, dessen
Fehler man an einem NPC sucht, der komisch läuft; und dort findet man sie nie.
`navScene.ts` ist dabei die **einzige** Datei der Schicht, die three.js kennt —
alles andere rechnet mit Zahlen und läuft im Test.

**Angeschlossen ist es über den Läufer** (`navAgent.ts`). Er ist die
Buchhaltung zwischen einer Wegsuche, die einmal antwortet, und einem NPC, der
sechzigmal je Sekunde fragt: Geplant wird alle halbe Sekunde, gelaufen jedes
Bild. Kommt er eine Weile nicht voran, **sieht er nach**, was ihn aufhält
(`observe`) — in die *Laufrichtung*, nicht auf den Wegpunkt, denn nach der
Glättung liegt der oft zehn Kacheln weit weg —, trägt es in seine Meinung ein
und plant von dort neu. Das Hirn bekommt davon nur den nächsten Wegpunkt
(`npcBrain.ts`, `sense.waypoint`); **gesehen und geschlagen wird trotzdem der
Spieler**, sonst schlüge ein Zombie gegen Hausecken.

Welches Kostenprofil einer benutzt, sagt seine **Haut** und nicht sein Hirn
(`npcKinds.ts`, `profile`): Was einem wehtut, hängt daran, was man ist, und
nicht daran, was man vorhat — und dasselbe gilt für die Beine, mit denen er
Kanten und Steigungen liest. Ein **Portal** ist dabei die eine Verbindung, die
ein Körper nicht laufen kann — der Läufer meldet sie als `jump`, und `Npc`
setzt den Körper um.

**Ansehen lässt sich das alles in sieben Ebenen**, einzeln schaltbar
(`nav/navLayers.ts`): Kacheln, die **betretbare Fläche**, Wände, Verbindungen,
Sperren, die gerade gelaufenen Wege und der **Sichtbereich** der NPCs. Alles auf
einmal ist bei ein paar hundert Kacheln eine Wolke aus Linien, in der man nichts
findet — wer wissen will, warum ein Zombie stehen bleibt, schaltet die Sperren
an und den Rest aus. Voreingestellt sind **Kacheln, Fläche und Wege**: die drei
beantworten zusammen „wo kann er hin, und wo will er gerade hin"; der Rest
beantwortet „warum nicht dorthin" und wird erst gebraucht, wenn etwas nicht
stimmt.

Die beiden neuen sind es wert, einzeln erklärt zu werden, weil beide aus
derselben Beschwerde entstanden sind — „einige Zombies wollen durch eine Wand":

- **Betretbar** ist die Kachel als *Fläche* und nicht als Umriss. Ein Raster aus
  dünnen Linien zeigt, wo Kacheln liegen; aus dreißig Metern Höhe sieht man
  darin aber nicht, wo **keine** liegt — und das ist die Frage, wenn ein NPC in
  eine Lücke plant, die es nicht gibt. Sie ist die einzige Ebene, die
  `depthTest` **anlässt**: Eine Fläche, die durch jede Wand hindurchleuchtet,
  ist von oben ein blauer Teppich über dem ganzen Labor und sagt gar nichts
  mehr. Und sie **rückt von jeder Wand ab**, Seite für Seite, genau so weit, wie
  der Weg dort Abstand hält (`shrinkFor`) — dasselbe Bild, das eine
  Unity-Navmesh von ihren Rändern zeigt, nur in einem Kachelgitter, das keine
  halben Kacheln kennt: Eingezogen wird beim **Zeichnen**. Zwei verschiedene
  Zahlen dafür wären eine Ansicht, die etwas anderes zeigt, als gelaufen wird —
  und dann sucht man den Fehler dort, wo keiner ist.

  **Und an den Ecken auch.** Seite für Seite reicht nämlich nicht, und das war
  der Fehler, den man von oben sah: An einer Wand entlang rückte die Fläche
  sauber ab, an ihrem **Kopfende** nicht. Dort liegt eine Kachel, die auf allen
  vier Seiten frei ist — nur steht die Stirnseite des Klotzes eben in ihrer
  Ecke, und ein Zylinder, der dorthin plant, steckt darin. Gefragt wird deshalb
  jede der vier Ecken einzeln, und zwar mit derselben Funktion, die der
  Schnurzug an jedem Durchlass fragt (`navPath.cornerBlocked`); wo etwas steht,
  fehlt ein Quadrat von der Größe des Abstands. Aus einem Rechteck werden dabei
  bis zu neun Felder eines 3 × 3-Rasters — die übrigen werden wieder
  zusammengefasst, sonst wären ein paar hundert Kacheln ein paar tausend
  Dreiecke, wo ein Rechteck je Kachel reicht.
- **Wege** zeichnen die **Wegpunkte** und nicht die Kachelmitten
  (`navAgent.points`). Der Unterschied ist der ganze Zweck der Ebene: Eine Linie
  durch Kachelmitten schneidet jede Hausecke, um die der Läufer in Wirklichkeit
  einen Bogen macht — sie sieht aus wie ein Weg mitten durch die Wand, direkt
  neben einer betretbaren Fläche, die dort gerade abgerückt ist. Zwei Ansichten
  desselben Wegs, die sich widersprechen, sind schlimmer als eine grobe.
- **Wände** zeichnen eine **Tür in der Farbe ihres Materials**: Holz und Metall
  sind auf der Karte dieselbe Linie und bedeuten für einen Zombie das Gegenteil
  voneinander. Wer wissen will, warum einer außen herumläuft und der nächste
  geradeaus durchbricht, sieht es hier und nirgends sonst.
- **Sicht** hängt nicht am Gitter, sondern an den NPCs: Der Fächer wird an ihr
  Modell gebaut und dreht sich mit ihnen (`npc/NpcBody.setSight`). Zwei Formen,
  und der Unterschied ist die halbe Auskunft: Der **Ring** ist die Entfernung,
  auf die ein Zombie einen wirklich bemerkt (`npcBrains.ts`, `tuning.sense` —
  eine Zahl, sonst nichts, und deshalb rundherum); der **Kegel** ist die
  Richtung, in die er schaut, und die zählt heute nur für die Sinne, die eine
  Karte lesen (`nav/navPerception.ts`). Wer beides sieht, versteht sofort,
  warum einer einen im Rücken bemerkt.

**Und daneben drei Schalter, die etwas anderes tun** (`nav/navSwitches.ts`).
Der Unterschied zu den Ebenen ist der ganze Punkt und steht deshalb auch im
Menü in einer eigenen Zeile („Navigation schalten"): Eine **Ebene** macht etwas
*sichtbar*, ein **Schalter** macht es *wirksam*. „Hindernisse aus" heißt nicht,
dass die Kiste verschwindet — es heißt, dass die Wegsuche sie nicht mehr
beachtet, der Zombie mitten hindurchplant und dagegenrennt. Es sind dieselben
drei, die eine Unity-Navmesh ausmachen:

- **Fläche** (*NavMesh Surface*) — das Gitter selbst. Aus heißt: niemand sucht
  mehr einen Weg, die Hirne laufen stur auf den Spieler zu. Der einzige
  Schalter, an dem man in einem Bild sieht, was die Wegsuche den ganzen Tag
  leistet. Er hängt in der Welt (`PortalWorld.navForAgents`) und nicht im
  Graphen, denn er schaltet nichts *am* Gitter ab, sondern das Gitter selbst.
- **Hindernisse** (*NavMesh Obstacle*) — was zur Laufzeit im Weg steht
  (`setBlocked`): die Kiste, die jemand abstellt.
- **Verbindungen** (*Off-Mesh Links*) — Treppe, Absprung, Leiter, Portal. Aus
  heißt: nur noch Nachbarkacheln, und der kurze Weg ist auf einmal der lange.

Die beiden letzten sitzen im Graphen (`NavGraph.features`) und schalten das
**Zählen** und nicht den Bestand: Was gesperrt ist, bleibt gesperrt eingetragen
(`blockedKeys`), es gilt bloß nicht. Deshalb zeichnet die Debug-Ansicht
weiter, was da ist — sonst schaltete man etwas aus und sähe nichts mehr, woran
man merkt, dass es aus ist. In jeder Welt fangen alle drei **an** an; ein
Schalter, der irgendwo aus anfängt, lässt einen den Fehler in der Wegsuche
suchen, der in einer Einstellung steckt.

Umgeschaltet wird die **Sichtbarkeit** und nicht die Geometrie — jede
Linienmenge trägt den Namen ihrer Ebene. Gebaut wird das Gitter erst, wenn
wirklich etwas davon zu sehen sein soll, und wieder abgeräumt, wenn nichts mehr
an ist: Unsichtbare Linien kosten in der Brille genauso viel wie sichtbare. Die
Wege werden fünfmal je Sekunde neu gezeichnet, nicht sechzigmal — ein Weg
ändert sich, wenn neu geplant wird.

Im Labor hängen dafür **zwei Konsolen an den Seitenwänden** der mittleren
Buchten (`navlab/NavConsole.ts`), dort, wo man beim Zusehen steht — mit
**zwei Blöcken**: oben zeigen, unten schalten, dazwischen eine eigene
Überschrift. Stünden sie in derselben Reihe, hielte man die Schalter für Ebenen
und wunderte sich, warum ein Zombie plötzlich durch eine Kiste läuft; und
„Verbindungen" stünde zweimal darauf und meinte zweierlei. Deshalb tragen die
Schalter auch intern ein Präfix (`sw:`) — zwei Tasten, die dasselbe heißen und
Verschiedenes tun, sind der Fehler, den man in der Brille am schwersten findet.

Jede Taste trägt die Farbe ihrer Ebene, damit niemand die Beschriftung lesen
muss: Man drückt Violett und sieht Violett. Was an ist, leuchtet — ohne diese
Rückmeldung drückt man in der Brille zweimal.

**Wo welche Taste sitzt, ist gerechnet und nicht abgemessen**
(`navlab/consoleLayout.ts`) — und weil es eine Rechnung ist, kann ein Test
nachmessen, dass nichts aus der Platte hängt, auch wenn eine achte Ebene
dazukommt. Vier Tasten je Reihe und nicht drei: Mit dreien wäre die Platte
2,3 m hoch und ragte oben aus der 2,4 m hohen Wand heraus, an der sie hängt.
Breiter statt höher — eine Bucht ist zehn Kacheln breit, Platz nach oben hat
sie keinen.

Eine Zahl, die man dabei falsch macht: **Eine Tafel schaut nach +Z**, ein
Körper nach −Z. Wer eine Konsole wie einen NPC ausrichtet, hängt sie mit dem
Rücken zum Raum an die Wand und sieht eine schwarze Platte.

**Das Navigationslabor** (`worlds/navlab/`) ist die Welt dazu: elf Buchten,
elf rote Knöpfe, und in jeder eine Behauptung, die man nachprüfen kann —
langer Gang um zwei Ecken, Stachelgrube (Zombie hinein und liegen bleiben,
Puppe dicht daran vorbei), Kiste im
Weg, **zu enger Gang**, Tür fällt hinter dem Verfolger zu, Portal, von dem nur
einer weiß, die Dachkante, **Podest und Sprung** und die drei **Steigungen**.
Der Grundriss ist geprüft
(`scenarios.test.ts`), bevor er gebaut ist: Zwei Buchten, die sich überlappen,
sieht man in der Brille erst daran, dass ein Zombie durch eine Wand kommt.

Fünf von ihnen beantworten je eine Frage, die vorher keine Bucht stellte:

- **Zu enger Gang.** Eine Wand mit einer Lücke von einer Kachel, in die zwei
  Pfosten hineinragen, bis 45 cm übrig sind. Beide Hälften müssen stimmen: In
  der **Welt** passt ein Zombie nicht hindurch (58 cm dick, `npcKinds.ts`), und
  auf der **Karte** steht dort deshalb auch keine Lücke. Wo die zweite Hälfte
  fehlte, plante er hindurch und rannte für immer dagegen — das war der Zombie,
  der durch eine Wand *wollte*. Möglich macht es `edgeOpen` (siehe unten).
- **Podest und Sprung.** Eine Treppe aus drei Stufen führt auf ein Podest; einen
  Gang weiter steht ein zweites, freistehend, auf 2,4 m. Wer springen kann
  (`HUMAN_PROFILE`, `link.jump`), nimmt die Sprungverbindung und steht drüben;
  der Zombie hat dort `Infinity` stehen und bleibt unten im Gang, so nah am
  Podest, wie die Karte ihn lässt. Dazwischen liegt der Gang, durch den man
  hindurchgeht, wenn man unten ist. **Diese Verbindung trug einmal die Bucht
  selbst ein**, mit zwei Kachelmitten in `applyLabMap`; heute findet das
  Abtasten sie (`navBake.joinGap`), und wer das Podest um eine Kachel
  verschiebt, verschiebt den Sprung mit.
- **Flache**, **steile** und **sanfte Steigung**, drei Buchten, die dieselbe
  Höhe hinaufführen — 2,4 m auf ein Podest, auf dem der Spieler steht. Der NPC will hier **nicht** zuschlagen, sondern nach
  oben, und seit der zweiten Fassung steht das auch so in den Daten
  (`BayCast.brain`, `BayCast.goal`): Die drei Buchten, die vorführen, dass man
  irgendwo hinaufkommt — beide Steigungen und das Podest —, bekommen das Hirn
  **Zum Ziel** und eine Kachel, auf die sie wollen. Vorher hing beides am
  Spieler, und das war in der Brille kaputt: Ein NPC plant nur, wenn jemand in
  Sichtweite ist (22 m), und der Knopf stellt in der Brille niemanden hin — wer
  im Mittelgang stand und zusah, sah zwei NPCs, die sich nicht rührten; wer in
  die Bucht ging, wurde verfolgt statt vorgeführt. Was er dabei kann, hängt
  weiter an je einer Zahl seines Profils:
  - Die **flache** besteht aus vier Stufen von 60 cm, eine je Kachel. Sechzig
    Zentimeter *tritt* keiner (`stepUp`), aber jeder hier zieht sich hinauf
    (`jumpUp`) — man sieht vier Sätze, und dann steht er oben.
  - Die **steile** ist eine richtige Rampe aus 12-cm-Stufen, die sogar ein
    Hamster tritt — nur eben 1,32 m Höhe je Kachel, und das sind 28°.
    Bei jedem hier ist vorher Schluss (`maxSlope`), und deshalb bleibt er davor
    stehen: nicht an der Stufe, sondern am **Winkel**. Er stellt sich dabei so
    nah an das Podest, wie die Karte ihn lässt, und bleibt dort — genau das
    ist „er merkt, dass er nicht hochkommt". Dass er dabei *hinaufwill* und
    nicht bloß herumsteht, ist der Grund, warum auch diese Bucht das
    Auftrags-Hirn bekommt: Beide wollen hinauf, und beide bleiben unten — erst
    dann sagt die Bucht etwas.
  - Die **sanfte** ist die dritte, und sie behauptet etwas ganz anderes als die
    beiden: nämlich, dass es an der **Stufe** liegt und nicht am Winkel. 2,4 m
    über fünf Kacheln sind 10,9°, flacher als alles hier — und ihre Stufen sind
    acht Zentimeter hoch. Damit ist sie auf der Karte keine Kante mehr, sondern
    eine *Steigung* (`navProfile.canTraverse`), und in ihrem Weg steht kein
    einziger Sprung. Man sieht zwei NPCs, die die Rampe **hinaufgehen**.

  Dass ausgerechnet die flache Bucht die groben Stufen hat, ist keine
  Nachlässigkeit, sondern die Engine: **Ein NPC ist ein dynamischer Zylinder
  ohne Schrittautomatik.** Der Character-Controller, der den Spieler 32 cm
  hinaufhebt, gehört dem Spieler allein; ein Zylinder, den man waagerecht gegen
  eine Kante schiebt, bleibt daran stehen. Das ist inzwischen **gemessen und
  nicht mehr behauptet** (`labPhysics.test.ts`): Bei Stufen von 30, 15 und
  fünf Zentimetern kommt er *null* Zentimeter hinauf — bei jeder Höhe. Eine
  flache Rampe aus zwanzig feinen Stufen wäre deshalb genau das, was die Karte
  für begehbar hält und die Welt für eine Wand.

  **Deshalb hat die sanfte Rampe einen Belag** (`scenarios.rampDeck`): einen
  gekippten Quader, dessen Oberseite genau auf den Nasen ihrer Stufen liegt.
  Dieselbe Messung sagt nämlich auch die andere Hälfte: Eine **schiefe Ebene**
  geht derselbe Zylinder mühelos hinauf, bei 9° wie bei 25°. Die Stufen sind
  damit die **Karte** — achsenparallel, und nur das findet das Abtasten —, der
  Belag ist der **Boden**, auf dem wirklich gelaufen wird. Er ist der einzige
  Quader dieses Labors, der nicht achsenparallel steht, und er kommt aus
  denselben Zahlen wie die Stufen darunter: Wer die Rampe flacher macht, macht
  ihn mit. Dass er die Stufen nirgends durchstechen lässt, hält ein Test ohne
  Brille fest — steht auch nur eine einen Zentimeter durch ihn hindurch, ist
  das wieder die Kante, an der ein Zylinder stehen bleibt.
- **Und auf dem Dach steht jetzt ein Hamster** (`npcKinds.ts`,
  `CRITTER_PROFILE`). Er sieht denselben Spieler wie der Zombie neben ihm, hat
  dieselbe Karte und denselben Weg — und bleibt oben, weil ihn die einzige
  Kante nach unten umbrächte: 2,4 m kosten 36 Leben (`navFall.ts`), er hat 20.
  Wer ihm das Profil eines Zombies gibt, sieht in derselben Bucht das Gegenteil:
  Er springt und bleibt unten liegen. Genau diese Gegenprobe steht als Test da
  (`labSim.test.ts`) — sie ist der Unterschied zwischen „die Sorte bleibt oben"
  und „die Rechnung hält ihn oben".

**Am Gürtel hängt hier keine Portalkanone**, sondern ein **Teleporter** links
und eine **Pistole** rechts (`NavLabWorld.beltLoadout`). Ein Labor, in dem man
zusieht, wie NPCs Wege gehen, hat für Portale keine Verwendung — sie sind der
eine Weg durch das Gitter, den kein NPC kennt, und wer sie hier benutzt, misst
nichts mehr. Was man dagegen dauernd braucht: schnell woanders stehen (die
Bucht am anderen Ende, das Dach über der Treppe) und etwas abschießen, wenn ein
Zombie aus seinem Käfig kommt.

**Die Tür lässt sich auch einfach auf- und zumachen.** Sie hat drei gelbe
Knöpfe: *Tür auf/zu* ist ein Schalter, den man beliebig oft umlegt, auch ohne
dass ein Szenario läuft (`ScenarioAct.once` steht dort auf `false`);
*Holz/Metall* wechselt das Material; *Tür verriegeln* ist die Wendung des
Szenarios und gilt einmal je Durchlauf. Das Türblatt hängt dabei **jedes Bild**
am Zustand der Karte (`syncDoor`) und nicht mehr nur am Knopfdruck: Inzwischen
macht die Attrappe die Tür selbst auf und ein Zombie schlägt sie ein, und ein
Blatt, das dabei stehen bliebe, *ist* der Zombie, der durch die Tür läuft.

**Und das Blatt steht wirklich im Weg.** Lange war es eine bemalte Fläche und
sonst nichts: gebaut in `decorate()`, wo alles hinkommt, was *keinen* Weg
versperrt — und damit stand auf der Karte eine geschlossene Tür, durch die in
der Welt jeder mitten hindurchlief. Genau der Zombie, den diese Bucht *nicht*
zeigen soll, nur unfreiwillig. Es hat jetzt einen **kinematischen Körper**, wie
jedes Türblatt in diesem Projekt (`interact/InteractWorld`), und `syncDoor`
zieht ihn jedes Bild nach; eingeschlagen wird sein Collider abgeschaltet, denn
wo das Blatt hing, ist ein Loch. Ein Quader aus `labSolids()` durfte es dabei
**nicht** werden: Das Abtasten sieht die — für die Karte ist die Tür eine Tür
und keine Wand.

**Eine Tür ist kein Wahrheitswert mehr, sondern ein Ding aus einem Material**
(`nav/navDoor.ts`). Vorher gab es nur „offen" und „zu" und dazu die Frage, ob
jemand Klinken bedienen kann — das reicht für ein Haus mit Bewohnern und nicht
für eines mit Zombies davor: Der Zombie macht keine Tür auf, aber er läuft auch
nicht ratlos außen herum, wenn sie aus Brettern ist. Er schlägt sie ein. Drei
Zahlen je Material entscheiden das:

- **Leben.** Holz hält 80 aus, Metall `Infinity` — und das ist kein Zahlenspiel:
  Eine Metalltür, die nach fünf Minuten Prügel doch aufgeht, ist keine Wand
  mehr, und die halbe Karte hängt daran, dass sie eine ist.
- **Was der Weg durch sie kostet**, wenn man sie erst einschlagen muss: zehn
  Meter. Die Zahl ist der Umweg, ab dem sich das Einschlagen lohnt — wer außen
  herum zwanzig Meter läuft, tritt lieber die Tür ein; wer fünf läuft, geht
  außen herum. Genau so soll es aussehen, und genau so plant die Wegsuche.
- **Wie schnell einer sie kleinbekommt.** Aus Leben durch Schaden wird die Zeit,
  die man in der Brille davorsteht — drei Sekunden sind ein Ereignis, zwanzig
  sind ein Hänger.

Wer **aufmachen** kann, macht auf: drei Meter sind billiger als eine
eingetretene Tür, und niemand tritt eine Tür ein, deren Klinke er in der Hand
hält (`navGraph.wallState`, `closedDoor`). Wer nicht aufbekommt — oder vor einer
**verriegelten** steht —, schlägt zu, und ob das etwas nützt, entscheidet das
Material. Eine Barrikade ist damit etwas, das man vor eine Tür stellt, und kein
Zauberspruch: Für den Menschen ist sie eine Wand, der Zombie schlägt beides
zusammen kurz und klein. Welches Profil zuschlägt, steht in einer Zeile Tabelle
(`navProfile.ts`, `breaks`).

**Eine eingeschlagene Tür ist keine Tür mehr, sondern das Loch, in dem sie
hing**: offen für jeden, für immer, und niemand muss davon erst gehört haben —
auch eine alte Meinung („die war zu") gilt dort nicht mehr, sonst stünde ihr
Besitzer vor dem Trümmerhaufen, durch den er gerade gegangen ist. `setDoor`
lehnt es deshalb ab, sie wieder zuzuziehen; heil wird sie nur beim Aufräumen
zwischen zwei Durchläufen (`mendDoor`).

**Der Handgriff selbst liegt beim Läufer und nicht bei der Welt**: `navAgent.ts`
meldet je Bild, vor welcher Tür einer steht und was sie von ihm verlangt
(`AgentStep.door`, `doorAction`) — und zwar erst **in Reichweite**, gemessen
zur Wandlinie und nicht zur Kachelmitte, sonst ginge eine Tür auf, während man
noch zwei Meter davor steht. `Npc.workDoor` macht daraus die halbe Sekunde an
der Klinke oder das Einprügeln; die Attrappe der Vorschau tut dasselbe
(`previewWalk.ts`). Eine Welt, die fünfzig NPCs nach ihren Türen fragen müsste,
fragte jedes Bild fünfzigmal.

**Dieselbe Reichweite ist auch der Moment, in dem er sie erfährt**: Was
`doorAhead` findet, trägt er in seine Meinung ein, und zwar unabhängig davon,
ob sie etwas von ihm verlangt. Genau darum geht es bei der Metalltür — sie
verlangt gar nichts (er macht sie nicht auf und bekommt sie nicht klein), und
ohne diese Zeile stünde er davor und drückte dagegen, bis das Festfahren ihn
nachsehen lässt (`observe`). Jetzt sieht er hin, sobald er dort ist, und ist im
nächsten Bild schon außen herum unterwegs.

**Der Grundriss steht als Daten und nicht als Zeilen in einer three.js-Methode**
(`scenarios.ts`): wo eine Bucht liegt, wo ihre Wände stehen (`bayWalls`), wer in
ihr auftritt (`cast`) und wo der Spieler dabei steht (`stand`). Inzwischen gilt
das für **jeden Quader**: `labSolids()` gibt das ganze Labor als Liste von
Kästen heraus, und `NavLabWorld` gibt jedem nur noch seine Farbe. Genauso steht
alles, was in *keinem* Quader steckt, an einer Stelle (`applyLabMap`): der
**Boden über der Stachelgrube**, die Tür und der Sprung zwischen den Podesten.

**Die Stachelgrube ist eine Falle und kein Anstrich.** In der Welt ist sie ein
Loch: Der Laborboden besteht aus vier Streifen um sie herum (`labFloor`), 2,6 m
dick, damit das Loch Wände hat, und unten liegt eine rote Platte mit Stacheln
darauf. Wer hineinläuft, fällt 2,2 m tief, kommt nicht mehr heraus und ist nach
knapp zwei Sekunden hin (`PIT_DEPTH`, `PIT_DAMAGE`, `labHarm` — dieselbe
Rechnung für die Brille wie für den Test). Auf der **Karte** liegt an derselben
Stelle ein ganz normaler Weg, auf dem Stacheln stehen (`navBuild.coverRect`):
Das Abtasten findet über einem Loch keinen Boden, und ohne diese Zeile plante
niemand mehr hindurch — aus der Falle würde eine Wand, um die beide Sorten
herumgehen. Es ist die einzige Stelle im Labor, an der die Karte mit Absicht
etwas anderes sagt als die Geometrie, und genau das ist eine Falle.

Zwei Sachen hängen daran. Die Grube muss **tiefer sein als das Band**, mit dem
das Abtasten Böden einer Etage zuschlägt (`BAKE_DEFAULTS.band`, 1,6 m) — sonst
wäre sie für die Karte bloß eine tiefergelegte Kachel mit einer Treppe hinein
und wieder heraus. Und das Labor lässt die **Fläche bis zum Horizont** weg
(`horizonColor(): null`): Die ist eine einzige Platte fünf Zentimeter unter
null und zöge sich quer durch jedes Loch. Dass der Test dieselben Kästen
abtastet wie die Brille, gilt damit sogar genauer als vorher.

Der Grund für beides ist die Testbank (unten): Ein Test, der das Labor
**abtastet**, muss dieselben Kästen und dieselbe Karte bekommen wie die Brille.
Baute die Welt ihre Wände selbst und der Test seine eigenen, prüfte er eine
zweite Welt, die zufällig ähnlich aussieht — und der erste Unterschied zwischen
beiden wäre genau der Fehler, den er finden sollte.

Weiter gilt, dass ein Test die zwei Zahlen nachrechnen kann, an denen dieses
Labor zweimal gescheitert ist:

- **Jedes Maß ist ein Vielfaches der Kachel** (2,5 m, `nav/navTile.ts`). Das
  Abtasten fragt zwischen zwei Kachelmitten genau **einen** Punkt: die Grenze
  dazwischen (`navBake.ts`, `joinTiles`). Eine Wand einen halben Meter daneben
  steht in der Welt, aber nicht auf der Karte — der NPC plant seelenruhig einen
  Weg mitten hindurch und bleibt daran hängen. Genau so war das Labor lange
  gebaut (22 × 16 Meter im Raster von 2,5), und von den Wänden jeder Bucht
  kannte die Wegsuche zwei: die Rückwand fehlte, die Stirnwände fehlten, und
  ein Zombie im langen Gang lief hinten aus seiner Bucht heraus und um das
  ganze Labor herum. Jetzt sind es 25 × 15 Meter, der Gang 5, der Abstand der
  Buchten 2,5 — und wer eine Wand danebenstellt, sieht es im Test und nicht in
  der Brille.
- **Die Kachelmitte entscheidet, auch beim Anmalen** (`navBuild.paintRect`,
  `coverRect`). Eine Kachel gehört zu einem Rechteck in Weltmetern, wenn ihre
  **Mitte** darin liegt — dieselbe Regel, nach der das Abtasten Boden findet.
  Hier lief einmal eine Schleife bis einschließlich der Rechteckkante, und die
  gehört schon zur nächsten Kachel: Die sechs Kacheln breite Stachelgrube war
  auf der Karte sieben breit, und zwar nur nach Osten und nach Süden. Zu sehen
  war davon nichts als ein Mensch, der einen viel zu großen Bogen um die Grube
  lief, an der Wand der Bucht entlang — die Kachel daneben galt ihm ja als
  Grube. Ein Anmalen, das eine Kachel zu weit reicht, sieht man nie an der
  Karte, sondern immer nur an einem Weg, der komisch aussieht.
- **Der Spieler steht in der Bucht, nicht im Mittelgang.** Ein Zombie bemerkt
  einen Spieler auf **22 Meter** (`npcBrains.ts`, `sense`); vom Mittelgang zu
  den äußeren Buchten sind es fast vierzig. Fünf der sechs roten Knöpfe
  starteten damit ein Szenario, in dem niemand einen Schritt tat — und das sah
  nicht nach einer zu großen Zahl aus, sondern nach kaputter Wegsuche. Jeder
  rote Knopf stellt die Attrappe deshalb an den Platz seiner Bucht: vorne, mit
  dem Hindernis zwischen sich und dem Auftritt. Ein Knopf räumt dabei auch die
  anderen fünf Buchten ab — zwei Szenarien gleichzeitig sind zwei, von denen
  keines mehr zeigt, was es behauptet.

Außen an den Buchten steht die **Bande** dicht an ihnen und nicht am Rand des
Bodens: Der Boden steht ein Stück über, damit die Bande auf etwas steht, und
läge sie dort, liefe zwischen ihr und den Buchten ein Rundgang um das ganze
Labor — den findet die Wegsuche, und dann geht ein Zombie außen herum statt
durch die Bucht, um die es gerade geht.

**Eine Zahl daraus ist keine Geschmacksfrage**: Das Dach in der Etagen-Bucht
liegt auf 2,4 m — über dem, was sich der Beweglichste hier noch **hochzieht**
(`jumpUp`, 1,2 m), und unter dem, was ein Zombie **hinunterspringt** und
überlebt (vier Meter, `navFall.safeFall`). Damit ist diese Bucht ein Weg nach
unten und keiner nach oben — und für den Hamster daneben, der zwei Meter
überlebt, gar keiner. Dieselben Zahlen halten in der Podest-Bucht das
freistehende Podest unerreichbar für alle, die nicht springen können.

**Diese Zahlen standen einmal im Abtasten** (`climb` 2,2 m, `drop` 2,6 m) und
galten damit für jeden. Sie stehen jetzt im **Profil**, und das Abtasten hat
nur noch eine einzige Grenze (`reach`, sechs Meter): ab wann eine Kante keine
Kante mehr ist, sondern eine Hauswand. Was das ändert, sieht man an dieser
Bucht: Vorher hätte ein Hamster die Dachkante genommen wie ein Zombie, denn die
Karte kannte nur eine Sorte Bein.

**Und hinauf kommt er inzwischen doch — er springt.** Ein NPC ist ein
dynamischer Zylinder ohne Schrittautomatik: Er *steigt* keine Stufe, er kann nur
fallen oder fliegen. Also fliegt er. Der Läufer meldet zwei Sorten von
Absprung getrennt (`navAgent.ts`, `AgentStep`): `jump` ist das **Portal** —
Versetzen, denn dazwischen gibt es keinen Weg —, `leap` ist der **Sprung**, und
den rechnet `Npc.launch` als schrägen Wurf aus: aus der gewünschten Steighöhe
folgt die Absprunggeschwindigkeit, daraus die Flugzeit bis zur Zielhöhe, daraus
die waagerechte Geschwindigkeit. Die Schwerkraft kommt aus der **Welt** und
nicht aus einer Konstante — auf dem Mond springt er weiter, und das soll er
auch. Solange er fliegt, hat das Hirn nichts zu sagen: Eine Wurfparabel, in die
jedes Bild eine waagerechte Wunschgeschwindigkeit geschrieben wird, ist keine
mehr, sondern ein Schweben.

Gesprungen wird über **Sprungverbindungen** (die Lücke zwischen den Podesten)
und über **Stufen, die zu hoch zum Hinauftreten sind** — gemessen an der
größten einzelnen Stufe der Verbindung (`NavLink.step`) und nicht an ihrem
Höhenunterschied. Der Unterschied ist genau der zwischen den beiden
Steigungs-Buchten: Vier Stufen von 60 cm sind vier Sprünge; zwanzig von zwölf
Zentimetern sind ein Gang, auch wenn beide 2,4 m hoch enden. Wer für zwölf
Zentimeter hüpft, sieht aus wie ein Frosch — und wer sie geht, ohne einen
Character-Controller zu haben, steht davor. Der bleibt deshalb der sauberere
Weg und steht weiter auf der Liste.

**Das Labor läuft auch ohne Brille** — und zwar zweimal, auf zwei ganz
verschiedene Arten.

Die eine ist ein **Test**: `navlab/labSim.ts` tastet das Labor ab (`bakeLab`,
dieselben Kästen und dieselbe Karte wie in der Brille) und lässt einen NPC
darin laufen — mit **Umfang** (Zylinder, 29 cm Halbmesser aus `npcKinds.ts`),
mit **Drehrate** (`npcBrain.ts`, `aheadFactor`), mit **Sprung und Fall**, und
mit Wänden, an denen er entlangrutscht statt hindurchzugehen. Was er nicht hat,
ist Rapier: keine Trägheit, keine Reibung, kein Anschieben — ein Test, der eine
Physik-Engine startet, ist kein Test mehr, sondern ein Ladebildschirm.

Der Punkt daran ist die Art der Behauptung. `labSim.test.ts` prüft nie bloß, ob
einer **ankommt** — durch die verriegelte Tür kommt man auch an. Geprüft wird
ein **Kontrollpunkt**: „war er dabei an der Stelle, an der er vorbeigekommen
sein muss?" (`passedNear`). Vor der verriegelten Tür ist das die Lücke ganz
außen; bei der Kiste der zweite Durchgang; im langen Gang beide Ecken des Z.

Der schärfere Prüfstein ist die **Überquerung** (`crossedAt`): nicht „wie nah
kam er der Mitte einer Lücke", sondern „**an welcher Stelle** hat er die
Wandlinie überschritten". Genau daran hängt die Behauptung der Tür-Bucht, seit
es Material gibt: Bei einer **Metalltür** liegt die Stelle in der Lücke ganz
außen — er *muss* außen herum, es gibt keinen zweiten Weg. Bei einer
**Holztür** liegt sie in der Türöffnung, und daneben steht, dass er dort
wirklich drei Sekunden gestanden hat (`SimRunner.atDoor`) und die Tür hinterher
hin ist (`broke`). Wer nur „angekommen" prüfte, sähe zwischen beiden Läufen
keinen Unterschied.

**Und eine Bank mit echter Physik gibt es jetzt auch** — eine einzige Datei,
und sie hat sich verdient (`navlab/labPhysics.test.ts`, rund eine Sekunde). Sie
startet Rapier wirklich, baut dieselben Quader (`labSolids`) und lässt den
Auftritt einer Bucht darin laufen. Der Grund ist ein Fehler, den kein
nachgebauter Körper zeigt, weil er in der Engine steckt: In der Brille nahm die
Puppe die Rampe, stand oben auf dem nahen Podest, ihr Weg zeigte quer über den
Gang — und sie rührte sich nicht mehr. Karte, Weg, Sprungverbindung und
Absprunghöhe waren alle im Recht, `labSim` lief die Bucht grün.

Falsch war ein Zwanzigstelmillimeter. Ein Zylinder sinkt beim Aufliegen ein
wenig in seine Unterlage ein, und damit steht die **senkrechte Seitenfläche des
Nachbarkastens** vor seiner scharfen Bodenkante: Zwei gleich hohe Klötze, die
aneinanderstoßen — die oberste Rampenstufe und das Podest daneben —, sind für
ihn keine ebene Fläche, sondern eine Wand. Ein Zylinder steigt keine Stufe,
auch keine von zwanzig Mikrometern. Die Abhilfe ist eine **gebrochene Kante**:
Jeder Zylinder-Collider bekommt sechs Zentimeter Rundung
(`PhysicsWorld.CYLINDER_BEVEL`, `roundCylinder`, Außenmaße bleiben gleich) —
hoch genug für jede Fuge und jede Schwelle, die auf der Karte als eben gilt,
klein genug, dass niemand damit eine Stufe hinaufspaziert, die er springen
müsste. Der Test dazu ist so klein wie der Fehler: zwei Klötze, ein Zylinder,
1,5 m/s geradeaus über die Naht.

Dieselbe Bank prüft, was der Zylinder ohne sie nie täte: dass die Puppe am Ende
wirklich **auf dem freistehenden Podest** steht (nicht bloß irgendwo auf 2,4 m
Höhe — auf das nahe kommt man auch die Treppe hinauf), und dass der Zombie in
die Grube fällt und darin liegen bleibt.

Und seit es die beiden **Steigungen** gibt, prüft sie auch die: dass beide die
flache wirklich hinaufkommen und beide vor der steilen stehen bleiben. Das ist
genau die Frage, die kein nachgebauter Körper beantwortet — `labSim.ts` setzt
einen Läufer auf jeden Boden, der nicht höher liegt als sein Tritt, und ob der
Zylinder dort in Rapier hinaufkommt, weiß er nicht. (Er kommt es nicht: Ein
dynamischer Zylinder steigt auch keine Stufe von vier Zentimetern. Nur was
gesprungen wird, geht hinauf.) Dazu die Dachkante mit beiden Sorten: dass der
Zombie springt und dabei wirklich Leben verliert (`Npc.land`), und dass der
Hamster oben und unversehrt stehen bleibt.

Dieselbe Bank prüft auch die **Schalter**: Ohne Verbindungen springt die Puppe
nicht mehr auf das freistehende Podest, ohne Hindernisse plant der Zombie mitten
durch die Kiste und rennt dagegen. Eine Ansicht, die man an- und ausknipsen
kann, beweist gar nichts; ein Verhalten, das sich dabei ändert, schon.
Dazu misst `wander()` die gelaufene Strecke geteilt durch die Luftlinie — die
Zahl hinter „läuft Manhattan-mäßig".

Die andere ist die **Werkzeugseite**: Auf `tools.html#welt/navlab` steht unter
dem Bild der Knopf **Laufen lassen**. Er baut dieselbe Welt mit echter Physik,
kippt die Ansicht senkrecht nach unten und legt die elf Buchten samt ihren
Knöpfen als Zeilen daneben — dazu die sieben Debug-Ebenen als Schalter, die
**drei Schalter der Navigation** in derselben Reihe (gestrichelt umrandet, und
sie tragen ihr „aus" im Namen: an ist der Normalfall und soll ruhig sein) und
ein **Ziel**, das ein Tipp auf den Boden versetzt.

**Die Ebene „Wege" zeigt dabei auch den eigenen.** Bis dahin zeigte sie nur, was
die *anderen* laufen — wer von oben seine Figur losschickt, schaltete sie ein
und sah in einem leeren Labor gar nichts. Der eigene Weg ist derselbe Weg, den
ein NPC bekäme (`PreviewWalk.path`), und er hat eine **eigene Farbe**, denn er
beantwortet eine andere Frage: nicht „wie kommen sie zu mir", sondern „wie komme
ich dorthin".

Daneben stehen drei Tipp-Modi, von denen immer genau einer gilt: **Gehe zu**
(die Figur geht zu Fuß dorthin, statt sich versetzen zu lassen — und **bleibt
dabei an einer geschlossenen Tür stehen, bis sie auf ist**: eine halbe Sekunde,
denn eine Tür aufzumachen ist eine Handlung und kein Zustand. Vorher lief sie
einfach hindurch, und ob eine Tür hier überhaupt etwas bedeutet, war von oben
nicht zu sehen. Vor einer **verriegelten** bleibt sie stehen und sagt es), **Im Bereich**
(ein Tipp legt einen Kreis hin, und die Liste darunter zeigt nur noch, was darin
steht — plus, was im selben Kreis um die **Figur** herum liegt) und der
Normalfall, das Versetzen. **Figur weg** nimmt sie ganz aus der Welt.

Der Kreis ist **doppelt** so weit wie eine Spielerhand von selbst zugreift
(`DEFAULT_NEAR_RADIUS`, 1,40 m), und die Verdopplung ist keine Willkür: In der
Brille streckt man den Arm aus und weiß dabei, was man erwischt; von oben zeigt
man mit einem Finger auf ein Telefon, und ein Kreis von anderthalb Metern ist
auf einer Karte von hundert ein Punkt, den niemand trifft.

Die **Karte selbst** hat zwei eigene Knöpfe, und beide gab es vorher nicht:
**Ziehen** schaltet um, was ein Finger auf dem Bild tut — die Ansicht drehen und
kippen (wie bei jedem anderen Modell auf dieser Seite) oder die Karte schieben
(wie bei jeder anderen Karte). **Folgen** legt die Bildmitte auf die Figur und schaltet
dabei auf **Gehe zu** um; dann tippt man sich mit Klicks durch die Welt, statt
nach jedem Schritt nachzuschieben. Die beiden gehören zusammen: Wer die
Bildmitte an die Figur hängt und sie dann per Tipp *versetzt*, sieht nichts —
die Mitte springt im selben Bild mit. Ein Labor läuft deshalb ab jetzt als **Karte** an: Der Finger
schiebt, die Mitte hängt an der Figur. Wer die Welt drehen will, sagt es — das
ist ein Griff; nach jedem Schritt nachzuschieben sind zwanzig.

Geschoben wird dabei die **Kamera** und nicht die Bühne (`panX`, `panY` in
`tools/viewer.ts`): Verschöbe man die Bühne, wanderte der Drehpunkt mit,
dieselbe Drehung sähe danach anders aus, und ein Tipp träfe daneben. Und wer
selbst schiebt, nimmt der Mitte damit das Folgen ab — man will dorthin sehen,
wohin man geschoben hat.

Das ist die Vogelperspektive aus „was noch fehlt", ohne Brille und ohne Editor;
wie sie funktioniert, steht bei der Werkzeugseite unter *Eine Welt laufen
lassen*.

**Was noch fehlt**: das lokale Ausweichen (RVO) für Engstellen, zerstörbare
Hindernisse samt „schlag drauf, wenn kein Weg da ist" — und der
Character-Controller oben, der inzwischen der teuerste offene Punkt ist: Solange
ein NPC ein dynamischer Zylinder ist, kommt er keine Stufe hinauf, die er nicht
springt, und jede Rampe muss deshalb aus Stufen bestehen, die groß genug zum
Springen sind. Die Karte kann längst mehr, als der Körper einlöst — sie weiß,
dass eine Rampe aus 12-cm-Stufen begehbar ist (`CostProfile.stepUp`), und in
der Brille steht er davor.

### Bauen, während man darin steht

**Jede Gitterwelt lässt sich umbauen, ohne sie zu verlassen**
(`worlds/editor/WorldEditor.ts`). Das war einmal eine eigene Welt — der
**Bauplatz** —, und als erste Fassung war das richtig: Man probiert eine
Bedienung an einem Ort aus, bevor man sie überall hinhängt. Es war aber auch
die Antwort auf die falsche Frage. Die Frage lautet nicht *wo baue ich ein
Level?*, sondern *warum kann ich das Haus, in dem ich gerade stehe, nicht
umbauen?* Wer im Dunkelhaus merkt, dass der Gang zu eng ist, will ihn **dort**
verbreitern und nicht in einer zweiten Welt nachbauen.

Also hängt die Bedienung an keiner Welt mehr, sondern an einem **Grundriss**
(`grid/gridPlan.ts`) und an einem Wirt (`EditorHost`), der drei Sachen kann:
die Welt neu bauen, jemanden versetzen und etwas sagen. Jede Gitterwelt hat
beides — Dunkelhaus, Schießstand, Dust, Kletterhalle, Gokart und der Bauplatz
selbst — und bekommt den Editor damit geschenkt (`grid/GridWorld.ts`,
`editable()`).

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
  Modell, statt sich darunter zu bücken. Gerade legt es *ein* Griff wieder —
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
ein magischer Beutel (der gibt *Gegenstände* heraus, einen nach dem anderen;
beim Bauen setzt man dasselbe zwanzigmal hintereinander) — und eine Palette mit
einem Pinsel: einmal eintunken, beliebig oft setzen, den Pinsel zurück in die
Mulde, wenn man fertig ist. Genau das ist der Rhythmus eines Kacheleditors.
Steckt der Pinsel in der Mulde, baut ein Tipp auf die Miniatur **nichts** —
dann darf man darin herumfassen, ohne aus Versehen eine Wand zu setzen.

**Werkzeuge sind vier, und der Radiergummi ist eines davon**: Boden, Wand, Tür,
Löschen. Was ein Druck tut, hängt an zwei Sachen — am Werkzeug und daran, worauf
man zeigt —, und diese Kreuzung steht an *einer* Stelle (`applyTool`,
`applyGridTool`). Zwei Handgriffe daran sind eingebaute Nachsicht: Wer *Boden*
gewählt hat und auf eine **Kante** zeigt, baut die Kachel dahinter (so malt man
einen Raum von seinem Rand aus weiter, ohne die Mitte der nächsten Kachel zu
treffen); und wer *Tür* auf eine freie Kante setzt, bekommt eine Wand mit einer
Tür darin statt einer Fehlermeldung.

**Und dann gibt es die zweite Reihe der Palette: die Bausteine**
(`grid/gridTool.ts`, `grid/blocks.ts`). Küchenzeile, Regal, Tisch, Bank, Kisten,
Säule, Geländer, Brüstung, Podest — eintunken, auf die Miniatur tippen, fertig.
Ohne sie ist ein Zimmer ein leerer Kasten mit einer Tür, und genau daran merkt
man beim Bauen *nicht*, ob ein Raum funktioniert. Zwei Regeln erklären das
Setzen ganz:

- **Was an eine Wand gehört, will eine Kante.** Küchenzeile, Regal, Bank,
  Geländer, Brüstung, Portaltafel: Die Kante, auf die man zeigt, ist
  gleichzeitig die Seite, an der sie stehen. Zeigt jemand auf die Mitte einer
  Kachel, sagt der Editor das — eine geratene Küchenzeile steht in drei von vier
  Fällen falsch herum, und man sieht es erst, wenn man davorsteht.
- **Was frei steht, nimmt die Kante als Blickrichtung.** Tisch, Kiste, Säule,
  Podest: Die Kachel entscheidet, *wo* sie stehen, die Kante nur, *wohin* sie
  schauen; wer auf die Mitte zeigt, bekommt Norden.

Die zwei Reihen auf der Palette sind kein Ordnungssinn, sondern die Reihenfolge,
in der man baut: erst der Grundriss, dann das, was darin steht. Wer eine
Küchenzeile in derselben Reihe suchte, käme beim Wandmalen aus Versehen daran.

Der Radiergummi räumt in der Reihenfolge auf, in der man es meint: **erst der
Baustein**, dann die Tür, dann die Wand, dann der Boden. Wer eine Küchenzeile
löschen will, will nicht den Boden darunter los.

#### Malen und Flächen

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

#### Platz zum Weiterbauen

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

#### Wo Karte und Palette hängen

**Der Gürtel hat zwei Haken, und der Bauplatz macht mit Absicht ohne Werkzeuge
auf.** Deshalb sucht sich der Editor beim Aufmachen die **freien** Haken: Hier
sind es beide, also hängt die Karte an der einen und die Palette an der
anderen, und man zieht sie mit dem Greifknopf heraus wie jedes Werkzeug. Wo
keiner frei wäre, hingen sie an gar keinem und schwebten vor einem, statt sich
zu verstecken — der Fall kommt seit dem Wegfall der Seite *Bauen* aus dem
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
mehr nur im hellen Bauplatz steht — im Dunkelhaus ist die Umgebung mit Absicht
fast schwarz, und ein Grundriss, den man nur mit der Taschenlampe lesen kann,
ist keiner.

**Das fünfte Werkzeug, das keines ist: Hingehen.** Auf eine Kachel der Miniatur
tippen und dort stehen. Es ändert nichts am Plan und steht deshalb neben den Werkzeugen und
nicht in ihnen — aber es ist der Griff, der aus einer Zeichnung eine Karte macht:
Wer den Gang am anderen Ende gebaut hat, muss ihn nicht ablaufen, um zu sehen, ob
er zu eng ist. Versetzt wird dabei über `PortalWorld.movePlayerTo` — Rig **und**
Kapsel, denn `rig.placeAt` allein verschiebt nur das, was man sieht, und die
Fortbewegung zieht einen im nächsten Bild zurück.

#### Speichern, exportieren, importieren

**Eine gebaute Welt muss irgendwo hin**, sonst ist Bauen ein Zeitvertreib. Es
gibt dafür zwei Wege, und sie sind mit Absicht nicht dasselbe
(`grid/worldStore.ts`):

- **Der Speicher** (`localStorage`, ein Eintrag je Welt unter `vr-welt:<id>`)
  ist kein Archiv, sondern die Antwort auf eine einzige Frage: *Wer zwanzig
  Minuten baut und die Brille absetzt, soll seine Welt wiederfinden.*
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
die man nicht ändern kann, hat auch nichts aufzuheben. Die erste Zeile heißt *Im Browser speichern* und nicht „Welt
speichern" — so heißt schon der Knopf der Stoppuhr, und der merkt sich etwas
ganz anderes (wo die Kisten gerade liegen, für diese Sitzung). *Gespeichertes verwerfen* leert den Eintrag **und** baut die Welt
im selben Augenblick aus ihrem `layout()` neu — das eine ohne das andere wäre
eine Welt, die erst beim nächsten Laden wieder die richtige ist, und bis dahin
fragt man sich, ob der Knopf kaputt ist.

**Was im Browser liegt, gewinnt** — und zwar ganz. Kein Verschmelzen mit
`layout()`: Ein halb übernommener Umbau wäre eine Welt, die weder die gebaute
noch die gespeicherte ist, und man sähe es erst an der Stelle, an der beide
sich widersprechen.

**Unter welchem Namen eine Welt liegt, sagt sie selbst** (`worldId()`,
abstrakt). Naheliegend wäre `ctx.net.world` gewesen — der steht beim Bauen aber
noch auf der *vorigen* Welt (`App.loadWorld` setzt ihn erst nach `init`), und
zwei Welten, die sich still denselben Speicherplatz teilen, sind der Fehler, den
man erst bemerkt, wenn im Dunkelhaus plötzlich Dust steht.

#### Das Weltformat

**Eine Welt als Datei** (`grid/worldFile.ts`), Format `baumgartner-welt`,
Version **`0.1.0`**.

Bis hierher gab es zwei Hälften und keine Naht dazwischen. Der
Navigationsgraph hatte längst ein sauberes, versioniertes Format
(`nav/navSerial.ts`); alles andere, was eine Gitterwelt ausmacht, hatte keins.
Die **Bausteine** lagen als nacktes JSON daneben, ungeprüft und ohne Version,
und die **Massen** — das Dach über einer Halle, die Felswand um Dust, der Sand
darunter — wurden überhaupt nicht gespeichert. Ein „gespeicherter Grundriss"
war deshalb genau so lange brauchbar, wie die Welt keine hatte.

Vier Entscheidungen tragen das Format:

- **Der Graph bleibt der Graph.** Die Weltdatei *enthält* eine `nav`-Datei, sie
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
  Gelesen wird die Zeile `0.1.x`; eine Datei aus der Zukunft wird **abgelehnt**
  und nicht halb geladen, denn eine Welt, der beim Laden die Hälfte fehlt,
  sieht aus wie eine kaputte Welt und nicht wie eine zu neue. „Zu neu" und „zu
  alt" bekommen deshalb zwei verschiedene Meldungen: Sie sind das Einzige,
  woran jemand sieht, ob er ein Programm oder eine Datei aktualisieren muss.

**Streng und nachsichtig an den richtigen Stellen.** Ein Baustein auf einer
Kachel, die es nicht gibt, fällt weg; eine unbekannte Baustein-Sorte fällt weg
(wer eine Welt aus einer neueren Fassung öffnet, will sein Haus sehen und nicht
eine Fehlermeldung über einen Schrank). Bei den **Massen** ist es andersherum:
Dort wird abgebrochen. Ein fehlendes Dach ist eine Welt, in die es hineinregnet,
und eine fehlende Felswand eine, aus der man hinausläuft.

Und noch ein Unterschied, der leicht als Schlamperei durchginge: Eine kaputte
Zeile im **Speicher** wird weggeworfen und nicht gemeldet — sie kommt aus einer
Fassung, die es nicht mehr gibt, niemand kann etwas daran tun, und die Welt
soll trotzdem aufmachen. Eine **Datei**, die jemand bewusst auswählt, meldet
jeden Fehler: Wer eine Datei auswählt, hat eine Erwartung, und ein stilles
Nichts wäre die schlechteste aller Antworten.

**Was bewusst nicht in der Datei steht**, damit niemand es sucht: Eine
Weltdatei ist ein **Grundriss** und kein Spielstand. Sie kennt Kacheln, Wände,
Türen, Verbindungen, Bausteine und Massen — alles, was `GridPlan` führt. Sie
kennt **nicht**, was eine Welt darüber hinaus von Hand hinstellt
(`buildProps`): die Lampen und den Dimmer des Dunkelhauses, die Karts in der
Boxengasse, die Kisten zum Herumwerfen. Und sie kennt keine Farben — welchen
Ton eine Wand hat, entscheidet die Welt, in der sie steht (`GridWorld.tint`),
und genau deshalb sieht ein ins Bauplatz importiertes Dunkelhaus aus wie ein
Bauplan und nicht wie ein Haus. Das ist die Grenze, und sie ist gezogen und
nicht vergessen: Ein Format, das *alles* speichert, ist eines, das bei jeder
neuen Lampe eine neue Version braucht.

Der **Dateiname** ist der Name der Welt plus das Datum plus `.welt.json` — die
doppelte Endung, damit ein Betriebssystem sie als JSON öffnet und ein Mensch
trotzdem sieht, was darin steht: `dunkelhaus-2026-09-07.welt.json`. Ein
Dunkelhaus wiegt so rund neun Kilobyte.

Ein Download und eine Dateiauswahl sind in der Brille wenig wert — man sieht
von beidem nichts. Sie sind für den Rechner gedacht, und das ist keine Lücke,
sondern die Arbeitsteilung: In der Brille wird gebaut, am Rechner wird
abgelegt und weitergegeben.

#### Was der Bauplatz noch selbst macht

Von der Welt `editor/EditorWorld.ts` ist wenig übrig, und das ist ihr Erfolg und
nicht ihr Ende. Drei Sachen unterscheiden sie vom Umbauen einer fertigen Welt:

- **Sie fängt bei einem Zimmer an** (`starterGrid.ts`) und nicht bei einem Haus,
  das schon steht. Eine leere Ebene beantwortet die erste Frage nicht, die jeder
  hat — *wie sieht denn eine Wand hier aus?*
- **Er schreibt auch beim Bauen** und nicht nur beim Weglegen der Karte
  (`planEdited`, höchstens alle zwei Sekunden). Hier baut man von Grund auf, oft
  eine halbe Stunde am Stück und ohne die Karte dazwischen wegzulegen — und wer
  dabei die Brille absetzt, hätte sonst nichts. Alles Übrige am Speichern ist
  seit dem Weltformat für jede Gitterwelt dasselbe (*Speichern, exportieren,
  importieren*). Den **alten Eintrag** aus der Zeit davor (`vr-bauplatz-plan`:
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

### Die Werkzeugseite

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

**Und die Hand steht bei jedem Werkzeug gleich.** Lange stand das *Werkzeug*
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

Wozu die Seite, sieht man am Telefon: „wie sieht das eigentlich aus" ist in der
Brille ein Weg in den Eingaberaum und an einen Stand, und das ist zu weit für
eine Frage, die man im Vorbeigehen stellt.

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
Kombinationen beantwortete keine der beiden Fragen, die man hier stellt (*wie
sieht ein Zombie aus* und *was macht „Verfolgen"*). Gedreht steht die Haut im
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
  `createGround`, Sterne und Erde am Mondhimmel), wird beim Einpassen
  übersprungen und trotzdem gezeichnet: dahinter gehört es hin.
- **Ein Dach wird aufgeschnitten — über allem, was darunter steht.** Eine Welt
  mit Decke füllt beim Bauen `this.roof` (Portal Labor, Dunkelhaus, Pizzeria,
  Eingaberaum, Kletterhalle), und die Vorschau legt eine Schnittebene hinein —
  Puppenhaus statt Deckel. **Wie hoch, wird gemessen und nicht gesetzt**
  (`tools/worldCut.ts`, mit Test): Der Schnitt liegt über der höchsten
  Oberkante der Welt, nie unter Kopfhöhe und nie über der Decke — und was bis
  an die Decke reicht, zählt dabei nicht mit, denn das ist die Hülle, die ja
  gerade weg soll. Vorher lag er fest auf 2,40 m, und das war nur in einem
  Zimmer richtig: In der **Kletterhalle** stehen 9,4 m hohe Kletterwände unter
  einer Decke von 10 m, und von der ganzen Halle blieben sechs Stummel auf
  einer blauen Matte übrig — die Welt selbst war weggeschnitten. Die Ebene
  liegt im Raum, das Modell dreht sich, also wird sie in jedem Bild aus der
  Lage der Bühne nachgerechnet; sonst wanderte der Schnitt beim Drehen durch
  die Welt.
- **Flach wird enger eingepasst.** Eine Kugel um eine Welt ist so hoch wie
  breit, eine Welt aber ist ein Grundriss mit ein bisschen Höhe darauf. Mit
  Grundriss und Höhe getrennt gerechnet (`ShowOptions.flat`) steht sie doppelt
  so groß im Bild — vorher war das Dunkelhaus eine Briefmarke in einer leeren
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
  nicht — dieselbe ist im Dunkelhaus ein Katapult und in den Alpen ein
  Stillstand, deren Kulisse misst vier Kilometer im Halbmesser.
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
neun Welten nimmt eine Attrappe derselben Form alles entgegen und macht nichts
damit — was daran Rapier ist, beantwortet jeden Zugriff mit sich selbst, damit
auch `physics.world.createImpulseJoint(rapier.JointData…)` mitten im Bauen ins
Leere läuft. Rapier selbst wird dabei nie geladen. Zweitens **Licht**: die Welt
bringt ihr eigenes mit — das Bühnenlicht geht dafür aus —, aber nie weniger als
0,45; das Dunkelhaus ist mit Absicht fast schwarz (0,035), und eine schwarze
Vorschau ist keine. Der Hub baut seine Vorschau selbst (`HubWorld.preview()`,
dieselbe Halle, dieselben Gänge, dieselben wirbelnden Tore, nur ohne Zeiger) —
von oben sieht man ihm an, was er ist: ein Rad mit Speichen.

#### Eine Welt laufen lassen

Eine Vorschau ist ein **Bild**, und für „wie ist diese Welt angelegt" ist das
die richtige Antwort. Beim **Navigationslabor** ist es keine: Es besteht aus
sechs Knöpfen und dem, was danach passiert, und ein Bild davon zeigt sechs
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
*jemandem* nach, und in einer Vorschau steht niemand. `playerFeet()` gibt sie
zurück, wenn es keinen Kontext gibt; für Hirne, Wegsuche und Spawnpunkte *ist*
sie der Spieler. Ein Tipp auf den Boden versetzt sie — und genau das macht die
Draufsicht zum Werkzeug: Man setzt das Ziel und sieht, welchen Weg das Gitter
hergibt. Wie im Spiel gilt dabei die **Sichtweite** des Hirns: Wer sein Ziel
quer über die Karte setzt, sieht einen Zombie, der stehen bleibt, weil er
nichts bemerkt hat.

Zwei Knöpfe machen aus dem Ziel mehr als ein Ziel, und beide beantworten
dieselbe Frage von zwei Seiten — *stehe ich eigentlich in dieser Welt?*

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
  meldet dort *„Da komme ich nicht hin"* — eine Figur, die ohne Grund stehen
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

Geladen wird eine Welt erst beim Antippen — eine Liste mit zehn Welten wäre
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
Ansicht *in echt* der Griffraum in der Bühne selbst, das Werkzeug war ganz weg
und die Zielscheibe stand plötzlich schräg unten links: zwei Bilder, die man
nicht vergleichen konnte. Jetzt steht der Griffraum dort, wo der Controller
beim Halten *dieses* Werkzeugs wirklich stünde (`Lage-im-Griff⁻¹`), und der
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
im Eingaberaum (`tune/handGrip.ts`) und mit derselben Zielkorrektur: die kommt
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

#### Bearbeiten auf der Werkzeugseite

Der Knopf **Bearbeiten** oben in der Ecke macht aus der Ansicht einen
Justierstand — und zwar denselben, den der Eingaberaum aufstellt, nur mit einem
Daumen statt mit zwei Händen. Er trägt sein Wort und nicht nur einen Stift, und
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

Dazu steht im Bearbeiten-Modus **ein Achsenkreuz** (`core/axesCross.ts`,
dasselbe wie im Eingaberaum), und zwar genau in diesem Rahmen: am Griffpunkt,
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

#### Verbinden: zusehen, während drüben gemessen wird

Eine Sache konnte die Seite bis hierher nicht: sagen, wie eine Hand **gerade
jetzt** an einem Werkzeug liegt. Sie zeigt die eingestellte Haltung aus dem
eigenen Speicher, und das ist die Haltung von zuletzt — wer in der Brille daran
arbeitet, sah hier nichts davon. Der Menüpunkt **Verbinden** (`#verbinden`,
`tools/liveHand.ts`) schließt genau diese Lücke.

Es ist **dieselbe Sitzung** wie beim Zusammenspielen: derselbe Raum-Code,
dasselbe Trystero, dieselben Nachrichten (`net/`). Was hereinkommt, ist der
Kanal `hpose` aus dem Poseraum — die Haltung der Hand, die drüben gerade
gemessen wird, zwanzigmal je Sekunde. Oben die Leitung (Raum-Code, Name, ein
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
  drüben aus der Liste, während er zusieht, und der Poseraum meldete „noch
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

### Welten auf dem Kachelgitter

**Eine Welt beschreibt sich in Kacheln, nicht in Metern** (`worlds/grid/`).
Das ist die jüngste der großen Entscheidungen in diesem Projekt, und sie ist
aus einem Ärgernis entstanden, das lange als naturgegeben galt: Jede Welt stand
auf ihrer eigenen Handvoll `slab()`-Aufrufe. Dust hatte siebzehn, der
Schießstand zwölf, die Pizzeria dreißig. Jeder einzelne ist eine Zahl in
Metern, die niemand nachprüfen kann, ohne die Brille aufzusetzen — und genau
deshalb war eine große Welt nur am Stück zu testen, nie in Teilen.

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
  Bausteine und **Massen**. Der Plan *ist* der Navigationsgraph
  (`nav/navGraph.ts`), also weiß ein NPC von der Küchenzeile, bevor er
  losläuft.
- **`grid/GridWorld.ts` — die Basis.** Sie baut den Plan, führt die gemeinsame
  Palette und entscheidet einmal für alle, woran ein Portal haftet — **und sie
  gibt jeder Gitterwelt den Bearbeitungsmodus** (`editor/WorldEditor.ts`, siehe
  *Bauen, während man darin steht*): Der Grundriss liegt ohnehin da, und der
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
ja/nein": Eine Kachel ist zweieinhalb Meter breit, ein Tisch darin lässt
reichlich Platz — er ist nur der Weg, den man nicht nimmt, wenn daneben einer
frei ist. Beides landet im Graphen, und deshalb läuft ein NPC um den Tisch
herum und auf das Podest hinauf, ohne dass jemand die Karte von Hand
nachpinselt.

**Eine Masse ist der ehrliche Ausweg.** Nicht alles hat Kachelform: das Dach
über einer Halle, der Kugelfang hinter den Scheiben, die Felswand um Dust, der
Sand darunter. `mass()` baut dafür **einen** Quader über ein Kachelrechteck —
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
`GridPlan.stairs()` macht alle drei. Und ein Treppenhaus wechselt zwischen
**zwei** Kacheln hin und her: Alle Läufe übereinander ginge nicht, weil jeder
Lauf das Loch für seinen eigenen Kopf schlägt — genau darin müsste der nächste
stehen.

**Fünf Welten stehen darauf**: das Dunkelhaus, der Schießstand, Dust, die
Hülle der Kletterhalle und das Gokart. Der Bauplatz ist seit der dritten
Fassung selbst eine davon — er baute ohnehin schon aus derselben Liste, und was
ihn noch ausmacht, sind ein Startzimmer, ein Speicher und ein weißer Raum. Die
Alpen und der Mond stehen weiter auf ihrem Höhenfeld — ein Berg ist keine
Kachel, und die Umrechnung würde ihn nur schlechter machen.

Die Grenze ist bei der **Kletterhalle** am deutlichsten und dort mit Absicht
gezogen: Überhang, Riss und Kamin sind kein Mobiliar, sondern das Spiel selbst.
Ihre Maße sind über viele Sitzungen im Headset entstanden, und jede davon auf
eine Kachelkante zu ziehen hieße, sie noch einmal von vorn einzumessen — für
nichts. Auf das Gitter gehört die Hülle: Matte, Decke, vier Wände.

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
  ihn will, sagt `editable()` `true`, und das tut **nur der Bauplatz**: Eine
  Weile hing er an jeder Gitterwelt, über eine Seite _Bauen_ im
  Handgelenkmenü — fünfzehn Zeilen, durch die man blätterte, wann immer man
  etwas anderes suchte. Die Seite ist wieder weg; was die meisten daran
  wollten (von oben sehen, wo man ist), ist jetzt ein Werkzeug im Regal
  (_Die Karte in der Hand_) und in jeder Welt zu haben. Mit `editable()` hängt
  auch der **Speicher** zusammen (`applyStored`): eine Welt, die man nicht
  ändern kann, hat keinen eigenen Stand aufzuheben. Zwei Sachen macht die Basis
  dabei selbst: den **Umbau** (alte Quader vollständig zurücknehmen, `dropSlab`, und
  aus der Liste neu bauen — höchstens einmal je Bild, egal wie viele Kacheln
  ein Strich gesetzt hat) und das **Abtasten danach** (`rebake`), damit NPCs
  belaufen können, was gerade entstanden ist.
- **Geprüft, bevor jemand die Brille aufsetzt.** Jeder Grundriss liegt in einer
  eigenen Datei ohne three.js (`dark/darkHouse.ts`, `range/rangeStand.ts`,
  `dust/dustTown.ts`, `climb/climbHall.ts`), und sein Test läuft durch jede
  Tür und jedes Haus vom Erdgeschoss aufs Dach. Ein Zimmer ohne Tür merkt man
  sonst erst, wenn man davorsteht — nach dem Laden, nach dem Aufsetzen, nach
  dem Hinlaufen.

### Eine neue Welt hinzufügen

1. `src/worlds/<name>/<Name>World.ts` anlegen und `World` implementieren
   (`init`, `update`, optional `render`, `preview`, `dispose`).
2. In `src/worlds/index.ts` einen Eintrag in `WORLDS` ergänzen — Titel,
   Beschreibung, Akzentfarbe, unterstützte Rollen und ein `load()` mit
   dynamischem Import.

Soll die neue Welt dieselben Werkzeuge, Portale und Physik haben wie das
Portal Labor, erbt sie stattdessen von `PortalWorld` und ersetzt nur den Raum:
`buildEnvironment()`, dazu die kleinen Haken `spawnPoint()`, `spawnYaw()`,
`skyColor()`, `lightIntensity()`, `welcome()`, `beltLoadout()` (leer heißt:
beide Trigger gehören der Welt) und `worldReset()` (was `B`/`Y` in dieser Welt
zusätzlich zurücksetzt — die Karts in die Box, die Küche leer). Dazu die drei
für den Boden und die Schwerkraft: `worldGravity()` (der Mond sagt hier 1,62,
und solange niemand im Menü eine eigene Zahl setzt, gilt genau die),
`horizonColor()` (`null` lässt die Fläche bis zum Horizont weg) und
`horizonLine()` für ihr Raster. `removeProp()`
löscht ein Prop wieder, wahlweise nur lokal. `placeTool()` legt ein Werkzeug in
den _Raum_ statt auf den Gürtel — liegend oder schwebend, bis eine Hand es
nimmt (die Taschenlampe im Dunkelhaus). Genau das machen `DustWorld`,
`RangeWorld`, `KartWorld`, `ShopWorld`, `DarkWorld`, `MoonWorld` und `AlpsWorld` — die ganze Maschinerie
(Gürtel, Regal, Ferngreifen, geteilte Sitzung) kommt mit, ohne kopiert zu
werden.

Steht die neue Welt auf **Kacheln** — und das ist inzwischen der Normalfall für
alles, was Zimmer, Gänge und Türen hat —, erbt sie besser gleich von
`GridWorld` (siehe oben) und schreibt statt `buildEnvironment()` nur noch
`layout()`: einen Grundriss aus Zimmern, Kanten und Bausteinen. Geometrie,
Physik, Portalflächen und die Navigationskarte kommen mit. Der Grundriss gehört
dabei in eine **eigene Datei ohne three.js** (`darkHouse.ts`, `rangeStand.ts`,
`dustTown.ts`, `climbHall.ts`) — das ist der einzige Unterschied zwischen einer
Karte, die ein Test in einer Millisekunde abläuft, und einer, für die man die
Brille aufsetzen muss.

Mehr braucht es nicht: Menü, Hub-Tor, Deep-Link (`#<id>`), der Eintrag auf der
Werkzeugseite samt Vorschau von innen (`preview()` erbt eine `PortalWorld`
mit) und das Aufräumen beim Wechsel erledigt die Engine. Alles, was eine Welt der Szene hinzufügt,
wird beim Verlassen wieder entfernt (die Engine räumt zur Sicherheit nach).

### Wie die Portale funktionieren

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
wird so zum Schwung aus einem Wandportal.

Damit man überhaupt durch eine Wand fallen kann, ignorieren Körper innerhalb
des Portaltrichters die Kollisionsgruppe der Fläche, auf der das Portal sitzt.
Jede portalfähige Fläche hat dafür ein eigenes Bit — mit einem gemeinsamen Bit
für alle löste ein Portal an der Wand auch den Boden davor auf, und man sackte
kurz vor dem Portal ein.

Nichts springt mehr durch die Portalebene: `PortalGhosts` schneidet alles, was
gerade in einer Öffnung steckt, mit einer Clipping-Ebene ab und zeichnet eine
Kopie davon vor dem Partnerportal — mit dem umgekehrten Schnitt. Beide Hälften
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

### Wie die Spiegel funktionieren

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
ein: Spiegel stecken in Werkzeugen, in Beutel-Objekten und in Miniaturen davon,
und die wandern zwischen Hand, Gürtel, Regal und Papierkorb. Eine Liste, die
davon nichts mitbekommt, zeigt irgendwann auf etwas, das längst weg ist.
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

### Zusammen spielen (Peer-to-Peer)

Zwei Geräte, ein Raum-Code, keine eigene Infrastruktur. Auf der Startseite (oder
im HUD unter **Verbindung**) tragen beide denselben Code ein — `Würfeln` erzeugt
einen sprechbaren wie `mond-riff-47`, `Link kopieren` legt ihn als `?room=` in
die URL, damit das zweite Gerät nur noch tippen muss.

**Auch aus der Brille heraus.** Getippt wurde der Code lange nur auf der flachen
Seite, und das hieß für jemanden, der schon spielte: Brille ab, Code eintippen,
Brille auf, Sitzung neu starten. Unter _Verbindung_ stehen deshalb jetzt **Raum
betreten**, **Neuen Raum aufmachen** (würfelt und verbindet gleich) und
**Name** — getippt auf derselben Tastatur wie ein Konfig-Code
(`ui/KeyPanel.ts`, Buchstabenbelegung mit Leertaste für Namen). Raum-Code und
Name liegen in **einem** Speicher (`net/room.ts`), den sich Startseite und
Brille teilen; zwei wären zwei Namen, die auseinanderlaufen.

**Verbinden fasst nichts an außer der Verbindung.** Keine Welt wird neu
geladen, kein Startpunkt angesprungen, keine Sitzung beendet: wer sich mitten
im Spiel dazuschaltet, steht danach genau dort, wo er vorher stand. Das ist
auch das Modell dahinter — es läuft **immer**, als wäre man in einem Raum, nur
dass ohne Gegenüber nichts hinausgeht (`PortalSync.alone`). Und wenn jemand
dazukommt, bleibt, was hier in der Hand liegt, hier in der Hand: der
Schnappschuss des Gastgebers überschreibt jede Besitzerliste außer der eigenen
— sonst zöge ein frisch Dazugekommener einem das Werkzeug sichtbar aus der
Hand, weil er von ihm gar nichts wissen kann.

**Warum kein eigener Signaling-Server?** WebRTC braucht nur für den Handshake
einen Umweg (Austausch der SDP-Beschreibungen). Danach läuft alles direkt
zwischen den Browsern. Diesen Handshake übernimmt
[Trystero](https://github.com/dmotz/trystero): es legt die Angebote in ein
öffentliches Relay-Netz statt auf einen Server, den wir betreiben müssten.

| Vermittlung          | Netz                        | Anmerkung                                   |
| -------------------- | --------------------------- | ------------------------------------------- |
| **Nostr** (Standard) | hunderte öffentliche Relays | am robustesten, `wss://`                    |
| **MQTT**             | öffentliche Broker          | gute Alternative, wenn Nostr blockiert ist  |
| **BitTorrent**       | öffentliche Tracker         | funktioniert, aber Tracker kommen und gehen |

Umschalten geht im Panel unter _Vermittlung_ — hilfreich in Netzen, die eine
der Varianten wegfiltern. Findet keins der Relays einen Weg, sagt das Panel das
auch so (`Kein nostr-Relay erreichbar`), statt still zu warten.

Was **nicht** über die Relays läuft: alles Inhaltliche. Posen, Welt-Events,
Chat und Sprache gehen ausschließlich über die direkte, verschlüsselte
Verbindung. Der
Raum-Code dient zugleich als Passwort, mit dem Trystero die Handshake-Daten auf
dem Relay verschlüsselt.

**Grenzen.** Ohne TURN-Server scheitert die direkte Verbindung bei symmetrischem
NAT (manche Mobilfunknetze, strenge Firmennetze). Im selben WLAN — der
Hauptfall: Brille und PC im gleichen Raum — reicht STUN. Wer einen TURN-Server
hat, gibt ihn beim Build mit:

```bash
VITE_TURN_URL=turn:example.org:3478 VITE_TURN_USER=user VITE_TURN_CREDENTIAL=secret npm run build
```

Zum Entwickeln ohne Netz reicht `?net=local`: dann übernimmt
`BroadcastChannelTransport` und zwei Tabs im selben Browser bilden eine Session.

### Chat: Text, und vor allem Codes

Ein Chat, der nicht zum Plaudern gebaut ist. Wer in der Brille steht, misst
dort ein Werkzeug ein und hat am Ende einen **Konfig-Code**, den er am PC
bräuchte — zum Aufschreiben, zum Eintragen ins Werkzeug, zum Weiterschicken.
Vorlesen und abtippen ist genau die Sorte Arbeit, für die es Rechner gibt. Also
schickt die Brille die Zeile herüber, und am PC steht sie im Panel unter
**Chat**: mit Uhrzeit, mit der Angabe, wofür sie gilt, und mit einem Knopf
_Kopieren_ daneben. _Verlauf kopieren_ nimmt alles auf einmal mit.

Deshalb hat eine Zeile eine **Sorte**. `text` ist, was jemand getippt hat;
`code` ist eine Zeile, die eine Maschine geschrieben hat und die eine andere
wieder lesen kann. Der Eingaberaum trägt seine Codes als `code` ein und wendet
beim Empfang **nur solche** an — was jemand von Hand schreibt, wird nie
ausgeführt, auch wenn es zufällig wie ein Code aussieht. Die Knöpfe _Werkzeug
senden_ und _Alles senden_ im Schießgang gehen seither über diesen Weg; sie
lohnen auch allein im Raum, weil der Code dann im eigenen Verlauf landet statt
in einer Meldung, die nach vier Sekunden weg ist.

`chat` ist eine eigene Nachrichtensorte in `net/types.ts` und kein
Welt-Ereignis: der Verlauf gehört der App, überlebt jeden Weltwechsel und wird
nicht abbestellt, wenn eine Welt aufräumt. Der Verlauf selbst (`net/chat.ts`,
mit Test) ist eine Liste, die vorn ausfranst — 200 Zeilen —, und alles, was
hereinkommt, wird vorher **geputzt**: Steuerzeichen raus, Umbrüche zu
Leerzeichen, bei 2000 Zeichen abgeschnitten. Was über das Netz kommt, hat sich
niemand ausgesucht.

In der Brille steht derselbe Verlauf unter _Menü → Verbindung → Chat_, die
letzten acht Zeilen, neueste oben, und _Schreiben_ macht die Tastatur auf. Was
dort **nicht** steht, ist ein Kopieren-Knopf: 24 Zeichen aus einem Alphabet
ohne Bedeutung sind in einer Brille nicht zu lesen und nirgends hinzulegen.
Abgeholt wird am PC — dafür ist der Code ja geschickt worden.

**Der Verlauf übersteht einen Neuladen**: die letzten 50 Zeilen liegen im
Browser (`CHAT_KEPT`), sonst wäre der Code, den die Brille gerade
herübergeschickt hat, nach einem F5 weg. Gelesen wird der eigene Speicher
genauso misstrauisch wie das Netz — es ist derselbe fremde Text von gestern,
und dazwischen lag vielleicht eine Fassung mit anderen Feldern.

**Angewandt wird ein Code auf Knopfdruck.** Der Eingaberaum nimmt ankommende
Codes von sich aus an — dort ist das der Sinn der Sache, zwei Leute justieren
gemeinsam. Überall sonst kam ein Code bisher an, stand im Verlauf und tat
nichts, ohne dass irgendwo stand, warum. Jetzt liegt neben der Zeile ein Knopf
_Übernehmen_ (im Panel wie im Menü der Brille), und `World.reloadGear` sagt der
laufenden Welt Bescheid — was schon in einer Hand liegt, liest seine Zahlen
sonst nie wieder nach. Automatisch überall wäre die schlechtere Antwort: Was
ein anderer schickt, soll einem nicht ungefragt die Ausrüstung umstellen,
während man gerade fliegt.

### Sprechen: Stimmen im Raum

Der Chat ist für Codes gebaut und nicht zum Plaudern — in der Brille zu tippen
ist teuer, und „schau mal nach links" über eine Bildschirmtastatur zu
buchstabieren ist die Art Aufwand, für die es Stimmen gibt. Die Leitung dafür
steht längst: WebRTC trägt neben dem Datenkanal auch Ton, und Trystero hängt
einen Medienstrom an dieselben Peers, die schon die Posen bekommen.

- **Räumlich, nicht als Telefonkonferenz.** Jede ankommende Stimme läuft durch
  einen `PannerNode`, der jedes Bild an den Kopf ihres Sprechers gesetzt wird
  (`net/Voice.ts`); die Ohren des Kontextes sitzen an der Kamera. Wer hinter
  dir redet, klingt von hinten, und wer am anderen Ende der Halle steht, ist
  leise. In VR ist das kein Schmuck, sondern der Unterschied zwischen „jemand
  sagt etwas" und „der da drüben sagt etwas".
- **Aus, bis jemand es einschaltet** — _Menü → Verbindung → Mikrofon_, am PC im
  Panel unter _Sprache_. Ein Mikrofon, das mitläuft, weil man einem Raum
  beigetreten ist, ist ein Fehler und keine Bequemlichkeit; der Browser fragt
  ohnehin um Erlaubnis, und diese Frage soll auf einen Knopfdruck folgen.
  Ausschalten hängt den Strom nicht nur ab, sondern **hält ihn an**: nur so
  geht die Aufnahmeleuchte des Geräts aus, und das ist die eine Rückmeldung,
  der ein Mensch glauben können muss.
- **Wer spricht, trägt einen Punkt** auf dem Namensschild
  (`RemoteAvatars.isSpeaking`, gemessen an einem `AnalyserNode`). In einem Raum
  mit vier Leuten ist „wer redet gerade" sonst geraten.
- **Zwei Fallstricke, beide eingebaut:** Ein WebRTC-Strom fließt in Chrome erst
  dann in die Web-Audio-Welt, wenn er außerdem an einem Medienelement hängt —
  deshalb liegt an jeder Stimme ein stummes `<audio>`, ohne das der
  `MediaStreamSource` still bleibt. Und Trystero hängt einen Strom an die
  Verbindungen, die es _jetzt_ gibt; wer später dazukommt, bekommt ihn nur,
  weil `TrysteroTransport` ihn bei `onPeerJoin` noch einmal anhängt.
- **Nicht überall.** `NetTransport.addStream` ist optional: über einen
  `BroadcastChannel` zwischen zwei Tabs (`?net=local`) gibt es keine Spur, auf
  der Ton fließt. Dann sagt das Menü das, statt einen Knopf anzubieten, der
  nichts tut. Und `getUserMedia` braucht einen sicheren Kontext — über `http://`
  jenseits von `localhost` ist die Frage gar nicht erst da.

### Die Welt teilen: Objekte und Portale

Ein Raum, ein Zustand. `PortalSync` (`worlds/portal/PortalSync.ts`) hält Props
und Portale auf allen Geräten gleich und hängt am freien Nachrichten-Kanal von
`NetSession` — die Engine selbst weiß davon nichts.

- **Wer rechnet?** Wer **am längsten in dieser Welt steht** (`net/host.ts`, mit
  Test). Das kann jeder für sich ausrechnen, es braucht keine Wahl und keinen
  Server. Er simuliert die Physik und streamt die Transformationen mit 20 Hz;
  bei allen anderen sind dieselben Körper kinematisch und laufen der empfangenen
  Pose weich hinterher. Geht er, übernimmt der Nächstälteste — mitten im Spiel.

  Vorher gewann die **kleinste Peer-Id**, und die ist gewürfelt: Wer dazukam,
  übernahm damit in der Hälfte aller Fälle die Welt eines anderen und schob ihm
  im selben Moment seinen eigenen, leeren Stand hinüber. Man kommt aber in einen
  Raum _hinein_ und nicht in einen anderen _hinüber_. Angesagt wird dafür eine
  **Dauer** und kein Zeitpunkt (`since` in `hello` und beim Weltwechsel): Zwei
  Rechner sind sich über die Uhrzeit nie einig, über die Länge einer Minute
  schon. Bei exakt gleicher Standzeit entscheidet weiterhin die kleinste Id —
  irgendetwas muss entscheiden, und es muss auf beiden Seiten dasselbe sein.

- **Wer anfasst, besitzt.** Greift eine Hand einen Würfel, beansprucht sie ihn
  (`own`) und streamt ihn selbst. Sonst würde ein getragener Würfel dauernd
  zwischen Hand und Simulation hin- und herspringen. Beim Loslassen geht er
  zurück, samt Wurfgeschwindigkeit, damit der Bogen nicht am Handgelenk endet.
- **Portale** gehören niemandem: Wer trifft, schickt die Pose, alle setzen sie.
- **Beutel und Reset** laufen als eigene Nachrichten; wer neu dazukommt, fragt
  einmal nach dem kompletten Stand (`hello` → `state`), und der rechnende
  Spieler wiederholt ihn zur Sicherheit alle zwei Sekunden.
- **Körper mit Wirkung**: jeder Mitspieler bekommt im Portal Labor eine
  kinematische Kiste unter dem Kopf und zwei an den Händen. Dadurch stößt er
  beim Vorbeilaufen wirklich Dominos um, statt durch sie hindurchzugehen.

Was du davon siehst: den vollen Körper des anderen, sein Namensschild, die
Portal-Waffe in seiner Hand und ein Leuchten an dem Objekt, das er gerade hält.
Greift er durch ein Portal, wird seine Hand genauso geschnitten und auf der
anderen Seite weitergezeichnet wie deine eigene.

### Zuschauen: First und Third Person

Unter _Zuschauen_ — am PC im Panel, in VR unter **Menü → Verbindung** — wählst
du erst einen Spieler und dann die Ansicht:

- **Frei** — die normale Steuerung, eigene Kamera.
- **First Person** — die Kamera sitzt im Kopf des Spielers. Der eigene
  Avatar wird für die anderen ausgeblendet (man steckt ja in deren Kopf), und
  vom Beobachteten bleiben lokal nur die Hände sichtbar.
- **Third Person** — die Kamera schwebt hinter dem Spieler. Sie bleibt immer
  waagerecht; nur die Drehung zieht weich nach, damit das Bild nicht bei jedem
  Kopfruck mitzuckt.

**Wer zusieht, geht mit.** Steht der gewählte Spieler in einer anderen Welt,
wechselst du beim Aussuchen automatisch dorthin — und genauso, wenn er sie
**später** wechselt: Geht der VR-Spieler durch ein Portal in die Alpen, wird die
Welt bei allen Zuschauenden nachgeladen. Vorher endete das Zuschauen in dem
Moment, in dem es spannend wurde: Seine Posen kamen weiter an und gehörten zu
nichts mehr, was hier steht, und das Bild blieb stehen, ohne dass irgendwo
stand, warum.

Gehandelt wird dabei auf den **Wechsel** und nicht auf den Unterschied
(`App.followWatched`, Merker `watchedWorld`). Das ist mehr als eine Sparmaßnahme
in der Bildschleife: Ein Unterschied allein zöge einen auch dann wieder zurück,
wenn man selbst gerade im Menü eine andere Welt gewählt hat — aus dem Mitgehen
würde ein Festhalten. Und lässt sich die Welt nicht laden, bleibt es bei einem
Versuch statt einem je Bild.

Dafür sind **zwei Fragen getrennt**, die gleich aussehen: _Wem wird zugesehen?_
(`App.watched`, die Wahl allein — `net/watch.ts`, mit Test) und _Von wem gibt es
hier eine Pose?_ (`App.spectatorTarget`, dieselbe Person, aber nur solange sie
in derselben Welt steht). Nur die zweite hat die Welt als Bedingung; wer durch
ein Portal geht, hört nicht auf, der zu sein, dem man zusieht — Menü und Panel
zeigen ihn deshalb weiter als gewählt, während seine Welt lädt. Verlässt er die
Sitzung, fällt die Kamera auf _Frei_ zurück.

Der Regler **Kamera-Glättung** bestimmt, wie träge das passiert: ganz links
folgt die Kamera 1:1, ganz rechts schwenkt sie deutlich verzögert nach. In First
Person glättet derselbe Regler die Kopfbewegung; **Horizont stabilisieren** wirft
zusätzlich die Kopfneigung weg, was gegen Übelkeit hilft.

Ziehen mit Maus oder Finger dreht die Kamera zusätzlich — in Third Person orbitet
sie um den Spieler, in First Person schaut man sich aus dessen Kopf um. Das
Mausrad ändert den Abstand, _Ansicht zentrieren_ setzt den Drag zurück.

**Im Headset** gibt es dieselben Optionen, aber mit einem Unterschied: übernommen
wird nur die _Position_ des anderen Spielers, nie seine Blickrichtung. Genau das
Umdrehen des Kopfes ohne eigenes Zutun macht in VR übel. Man wird also
mitgetragen und schaut sich dabei frei um. Solange das läuft, ist die eigene
Fortbewegung eingefroren (`PlayerRig.paused`); beim Zurückschalten auf _Frei_
holt die Physik-Kapsel den Körper wieder ein.

Technisch: `NetSession` verschickt Posen mit 20 Hz, `SmoothPose` zieht dazwischen
exponentiell nach (dieselbe Glättung nutzen auch die `RemoteAvatars`). Flach
setzt `SpectatorCamera` daraus die Kamera per `PlayerRig.setHeadWorldPose()` —
der eigene Rig bleibt stehen, es wandert nur die Kamera darin. In VR gehört die
Kamera dem Headset, deshalb wandert dort per `setHeadWorldPosition()` der Rig.

### Asymmetrisches Spielen

`PlayerRole` unterscheidet `vr`, `desktop` und `handheld`; jede Welt gibt in der
Registry an, welche Rollen sie unterstützt. `NetSession` kümmert sich um
Presence, Pose-Sync und freie Nachrichten-Kanäle für Welten-Events,
`RemoteAvatars` zeichnet die anderen Spieler mit demselben `AvatarBody`, den
auch der eigene Körper benutzt — Kopf plus zwei Hände reichen als Eingabe, mehr
weiß ein Headset über seinen Träger nicht. Welten sehen nie, welcher
Transport darunter liegt — ein WebSocket-Transport ließe sich ohne Änderung an
den Welten ergänzen, er muss nur `NetTransport` implementieren.

### Haunting: einer im Haus, die anderen im Van

Das erste Spiel hier, das ohne die anderen nicht geht (`worlds/haunting/`).
Einer setzt die Brille auf und wählt im Hub **Spiel Haunting**; alle anderen
kommen auf der Startseite unter _Zusammen spielen_ herein und sitzen im Van vor
vier Geräten. Die Aufgabe ist simpel — drei Sachen finden und herausbringen —,
und schwer ist sie aus genau einem Grund:

**Das Übersetzungsproblem.** Jede Station kennt dasselbe Haus in einer
**anderen Sprache**. Der Archivar kennt Namen („Bibliothek"), der Späher kennt
Formen („L-förmig, zwei Türen"), der Pilot kennt ein Zimmer *jetzt*, der
Hacker kennt Schalter ohne Ort, und der VR-Spieler kennt nur, was in seinem
Lichtkegel steht — ist dafür aber der Einzige mit Händen. Niemand kann dem
anderen eine Koordinate sagen; das Spiel besteht darin, in Echtzeit ein
gemeinsames Wörterbuch zu bauen, während einer davon Panik hat. Das ist die
oberste Regel dieser Welt, und sie ist wichtiger als jede Bequemlichkeit:
**Keine zwei Stationen dürfen die Welt in derselben Sprache sehen.** Sobald
eine Station Monster *und* Mitspieler gleichzeitig sähe, lotste sie allein, und
die anderen drei wären Deko.

| Station | Sieht | Sieht **nicht** |
| --- | --- | --- |
| **Archiv** | ein Zimmer je Seite: Möbel, Türen, Lampe, Sicherungskasten | alles, was sich bewegt — und die Nachbarzimmer |
| **Späher** | Wände und einen Punkt, dem Monster nachgeführt | Namen, Möbel, den VR-Spieler |
| **Drohne** | ein Zimmer vollständig, in Farbe, im eigenen Scheinwerfer | alles außerhalb; macht keine Tür auf |
| **Schalttafel** | Schalter mit schlechten Beschriftungen | den Grundriss, überhaupt |

**Eine Quelle, viele Projektionen.** Über die Leitung geht der **Same** und
nicht das Haus (`haunting/house.ts`): Jedes Gerät baut denselben Grundriss
selbst. Deshalb ist die Drohnenkamera eine Kamera in der *eigenen* Kopie der
Welt und kein Videostrom, und die Akte des Archivars dieselbe Kopie von oben.
Was wirklich fließt, sind ein paar Dutzend Bytes je Sekunde — Monsterposition,
Türen, Licht, Aufgaben (`haunting/net.ts`, Kanal `haunting`). Wer diese eine
Entscheidung umdreht und Bilder überträgt, kauft sich Bandbreite, Latenz und
einen Kodierer ein für etwas, das ohnehin schon auf jedem Gerät steht.

**Der Generator muss beschreibbare Häuser bauen** (`haunting/house.ts`, mit
Test über zwanzig Samen). Ein zufälliges Labyrinth aus gleichen Kästen wäre in
zehn Zeilen gewürfelt und unspielbar — „ich bin in einem quadratischen Zimmer"
träfe dann auf sieben Zimmer zu. Also:

- **Jedes Zimmer bekommt einen Charakter** und die Merkmale dazu (Küche heißt:
  da steht ein Herd). Name im Dossier und Ding im Raum kommen aus derselben
  Zeile, sonst laufen sie auseinander.
- **Zwillinge sind gewollt**: zwei Bäder, ein Name — aber sie unterscheiden
  sich in genau einem Merkmal, das man **aussprechen** kann. Wanne gegen
  Dusche, nicht „größer": Von innen ist „groß" nichts, woran man etwas
  erkennt, und der Archivar sieht seine Zimmer einzeln und kann auch nicht
  vergleichen. Dann wäre die Verwechslung nicht lustig, sondern unlösbar.
- **Die Aufgabe zeigt auf ein Merkmal und nicht auf ein Zimmer**: „Das
  Fotoalbum liegt bei dem Klavier" kann man weitersagen, eine Kachelkoordinate
  nicht.
- Ein Zimmer im Haus hat **keine Lampe** und bleibt auf jeder Stufe dunkel.

**Die Beschriftungen der Schalttafel lügen nie, sie sind nur unvollständig**
(`haunting/panel.ts`, mit Test). `Licht Küche` schaltet immer das Licht der
Küche; `Wohnzimmer` schaltet *irgendetwas* dort; `Tür 3` sagt gar nichts über
den Ort, ist aber wirklich eine Tür. Unvollständigkeit lässt sich durch
Ausprobieren und Zurufen auflösen — eine einzige Lüge macht jede andere Zeile
wertlos und die halbe Stunde Kartierung gleich mit. (Wenn hier später ein
Verräter mitspielt, ist genau das seine Waffe. Bis dahin: keine Lügen.)

**Die Kette, wegen der es mehr als zwei Leute braucht.** Der Archivar weiß, in
welchem Zimmer der Sicherungskasten hängt → der VR-Spieler muss hin und ihn
umlegen → der Hacker bekommt die zweite Hälfte seiner Tafel. Vorher hat er vier
Schalter und langweilt sich fast, nachher zwölf und ist der wichtigste Mensch
im Van.

**Mehr Stationen als Spieler, mit Absicht** (`haunting/stations.ts`, mit Test).
Der Van ist immer unterbesetzt; die eigentliche Entscheidung ist nie „was tue
ich", sondern *was lassen wir gerade unbeobachtet*. Wem ein Gerät gehört,
entscheidet die **Sitzdauer** — dieselbe Regel wie beim Gastgeber der Welt
(`net/host.ts`) und aus demselben Grund: Jeder kennt seine eigene Dauer, Dauern
wachsen auf allen Uhren gleich schnell, und es braucht keine Wahl und keinen
Server. Wer sich auf ein besetztes Gerät setzt, wird weggeschubst und verliert
Zeit, aber nichts, was er schon weiß. Ein Wechsel **dauert** (2,5 s): Ohne die
Laufzeit wäre der Griff nach demselben Gerät ein unsichtbares Rennen, das der
mit dem schnelleren Handy gewinnt; mit ihr wird daraus eine Verhandlung, und
das Zurufen ist das Spiel.

**Wer rechnet, ist der VR-Spieler** (`pickGameHost`). Die sonst übliche Regel —
wer am längsten in der Welt steht — gäbe hier einem Web-Spieler das Monster,
und wenn der den Laptop zuklappt, nimmt er die Runde mit. Im Haus steht genau
einer, und der geht so schnell nicht weg.

**Das Monster ist aus, bis die Brille es einschaltet.** Nicht aus Vorsicht,
sondern weil es die Rollen erst spielbar macht: Wer Archiv, Späher, Drohne und
Tafel in Ruhe ausprobieren will, soll das können, ohne dass ihm dabei jemand in
den Nacken atmet. Die Entscheidung, ob es gruselig wird, trifft der, dem es
passiert. Läuft irgendwo ein **Radio**, geht der Verfolger dorthin statt zum
Spieler — dafür gibt es den Haken `PortalWorld.npcTarget`, und er ist der
einzige Hebel, den der Hacker überhaupt auf das Monster hat.

**Die Drohne macht keine Tür auf** (`DRONE_PROFILE` in `haunting/plan.ts`, mit
Test). Sie fliegt über jedes Möbel hinweg, aber wo sie hinkommt, hängt daran,
was der VR-Spieler und der Hacker offen gelassen haben — Abhängigkeit in beide
Richtungen, ohne eine einzige Sonderregel. Ihren Weg sucht sie zweimal je
Sekunde neu: Der Hacker macht Türen zu, *während* sie unterwegs ist.

**Sie fliegt nicht die Luftlinie, und das steht in einer eigenen Datei**
(`haunting/droneRoute.ts`, mit Test). Der Pilot tippt ein Zimmer an, und was
dann passiert, ist eine Wegsuche im Navigationsgraphen und kein Zusteuern auf
einen Punkt — der Unterschied ist der ganze Rest des Spiels: Eine Drohne, die
auf das angetippte Zimmer zuhält, fliegt durch die Wand, und dann ist die
geschlossene Tür Kulisse und der Hacker Deko. Drei Entscheidungen darin:

- **Kachelmitten statt Schnurzug.** Für die NPCs zieht `navPath.pullString`
  den Weg gerade, weil ein Zombie, der Ecken mitnimmt, besser aussieht. Hier
  ist das Gegenteil richtig: Die Strecke zwischen zwei Kachelmitten liegt
  *beweisbar* in diesen beiden Kacheln — der Test fliegt einen Weg ganz ab und
  schaut nach, dass die Bahn nie eine Wand kreuzt —, während eine geglättete
  Abkürzung um eine Ecke an der Wand kratzt.
- **Gedreht wird nur das Bild.** Der Ort folgt den Wegpunkten, die
  Blickrichtung dreht mit begrenzter Rate nach, und wer scharf abbiegt, fliegt
  dabei langsamer. Wer es andersherum baut — erst drehen, dann fliegen —,
  lässt eine Drohne, die noch quersteht, die Ecke schneiden.
- **Kein Weg ist eine Ansage und kein Fehler.** `findPath` gibt den besten
  Teilweg zurück; sie fliegt bis vor die geschlossene Tür und bleibt dort, und
  die Station sagt es mit Worten: *zwischen hier und dem Ziel ist etwas zu.*
  Das ist die Zeile, mit der aus einer Wegsuche ein Zuruf in den Van wird.

**Die Drohne hat einen Scheinwerfer, und er gehört allen** (`DroneState.light`,
über die Leitung). Ein Kegel nach vorn, den der Pilot umlegt — er leuchtet
sein Kamerabild aus *und* das Zimmer, in dem der VR-Spieler steht. Deshalb
steht der Drohnenkörper seit Neuestem bei **allen** in der Szene und nicht nur
bei den Web-Spielern: Ein Licht, das der Mann im Haus nicht sieht, wäre eine
Helligkeitseinstellung und keine Hilfe.

**Kein Akku, der abläuft — zwei Uhren, die sich erholen** (`droneRoute.ts`, mit
Test). Anfangs lief eine einzige Ladung durch: Sie ging vom ersten Bild an
runter, war nach gut vier Minuten leer, und danach lag die Drohne im Haus. Das
ist kein Spiel, sondern ein Countdown — der Pilot konnte nichts falsch machen,
nur zu lange dabei sein, und wer sich spät an das Gerät setzte, erbte eine
Leiche. Eine Rolle, die nach vier Minuten aufhört, ist eine Rolle weniger.
An ihre Stelle sind zwei Sachen getreten, und beide kommen zurück:

- **Die Wechselsperre** (`HOP_TIME`, 14 s): Sie wechselt das Zimmer nur alle
  paar Sekunden. Damit ist sie kein Suchscheinwerfer, der das Haus in einer
  Minute abklappert — wer sie irgendwohin schickt, hat sich entschieden und
  sieht sich das Zimmer an, statt weiterzuklicken. Genau die Frage soll im Van
  gestellt werden: *welches Zimmer als Nächstes?* Sie geht über die Leitung
  mit (`DroneState.hop`), sonst wäre der Platzwechsel am Gerät ein
  Schlupfloch: aufstehen, jemand anders setzt sich hin, weiterfliegen.
- **Die Ladung des Scheinwerfers** (`LAMP_LIFE` 45 s Licht, `LAMP_FILL` 75 s
  bis wieder voll): Sie leert sich nur, während er brennt, und **füllt sich
  wieder auf**, wenn er aus ist. Nachfüllen dauert länger als Leerbrennen —
  andersherum wäre der Knopf keine Entscheidung mehr, sondern immer an. Bei
  null geht er von selbst aus und lässt sich erst ab einem Rest (`LAMP_MIN`)
  wieder anschalten; ohne diese Schwelle klickt man an einer leeren Lampe.

Beide Uhren laufen bei **allen** im Van mit und nicht nur beim Piloten: Sonst
stünden sie still, während niemand am Gerät sitzt, und der Nächste erbte eine
Sperre von vor drei Minuten und eine Lampe, die sich nicht erholt hat.

**Ihre Kamera schaut nach vorn, und „vorn" ist +Z.** Der Gierwinkel ist
`atan2(dx, dz)`, damit zeigt die lokale +Z-Achse in die Flugrichtung — eine
three.js-Kamera von der Stange schaut aber nach −Z. Ohne die halbe Drehung
flog der Pilot rückwärts durch das Haus, und mit dem Scheinwerfer leuchtete
der auch noch hinter ihm her. Sie sitzt außerdem knapp *vor* dem Rumpf: Sonst
füllt die eigene Lampenkuppel das Bild. Und sie schwebt auf **2,15 m** unter
einer 2,8 m hohen Decke: Auf Augenhöhe des VR-Spielers stand im Bild des
Piloten eine Stuhllehne vor dem halben Zimmer, und aus der Übersicht, für die
man eine Drohne fliegt, wurde ein zweites Paar Augen auf derselben Höhe.

**Der Öffnungswinkel hängt an der Form des Bildes** (`droneRoute.droneFov`, mit
Test). `THREE.PerspectiveCamera.fov` ist der **senkrechte** Winkel, und das ist
die Falle, sobald der Pilot sein Bild vom Kinostreifen aufs Vollbild zieht:
Dieselbe Zahl ist einmal Weitwinkel und einmal Fernrohr, und er merkt nur, dass
er auf einmal nichts mehr findet. Festgehalten wird deshalb, was er wirklich
braucht — **wie viel vom Zimmer links und rechts ins Bild passt**
(`DRONE_HFOV`, 118°) —, und der senkrechte Winkel fällt daraus ab, begrenzt auf
66°…104°, damit sich das Haus an den Rändern nicht biegt.

**Umsehen dreht die Kamera, nie die Drohne.** Der Wisch über dem Vollbild (und
der Blickstock oben rechts im Bild) verstellt einen Winkel *neben* der
Flugrichtung; die Bahn kommt weiter aus der Wegsuche. Andersherum wäre das
Wischen eine zweite Steuerung, die gegen die Wegsuche arbeitet, und die eine
Regel, an der hier alles hängt („sie fliegt keine Luftlinie"), wäre durch eine
Fingerbewegung ausgehebelt. Gedreht wird in derselben Richtung wie mit der Maus
im Fenster (`core/FlatControls.ts`), begrenzt auf gut zwei Drittel einer halben
Umdrehung, und ein Tipp auf den Stock stellt wieder geradeaus — er leuchtet,
solange der Blick daneben steht, sonst sucht der Pilot ein Zimmer, das hinter
ihm liegt, und hält die Drohne für kaputt.

**Handy zuerst, Laptop breiter** (`haunting/stationUi.ts`, `haunting.css`). Ein
Handy-Layout, das man aufzieht, ist immer benutzbar; ein Laptop-Layout, das man
zusammenschiebt, nie. Neun Sachen, die dabei nicht Geschmack sind:

- **Jede Station hat eine Farbe, und es ist ihre** (`--haunt-accent` über
  `data-station` am Wurzelelement) — dieselben vier Töne, die im Haus auf den
  Monitoren des Vans leuchten. Am Tisch wird zugerufen und nicht gelesen; „ich
  hab den grünen" ist eine Ansage, „ich hab die dritte Kachel von oben" nicht.
- **Der Auftragsstreifen hat ein Feld je Sache und drei Zustände** — noch im
  Haus, in der Hand, im Van. `0/3` sagt nicht, dass eine davon gerade beim
  VR-Spieler liegt, und genau das ist am Tisch die Frage, die gestellt wird.
- **Das Bild ist ein Kinostreifen und kein Kasten** (21:9 statt 40 vh Höhe).
  Ein Zimmer ist breiter als hoch; Bildhöhe, die keiner braucht, war auf einem
  Telefon die halbe Seite, und der Pilot scrollte zu seinen eigenen Knöpfen.
  Der Archivar bekommt ein eckigeres Fenster (4:3): Seine Kamera passt das
  Zimmer in das Fenster ein, und in einem Streifen steht ein hohes Zimmer
  zwischen zwei schwarzen Balken — breit ist bei ihm *weniger* Bild.
- **Antippen macht das Bild groß, noch einmal wieder klein.** Groß heißt: Es
  liegt fest im Hintergrund über dem ganzen Schirm, und die Bedienung liegt
  darauf. „Bild frei" in der Kopfzeile blendet sie weg, der Menüknopf oben im
  Bild holt sie zurück — weggeblendet und nicht abgebaut, sonst käme die Liste
  oben statt dort zurück, wo man war. Im freigeräumten Vollbild schaltet ein
  Tipp die Größe **nicht** um: Das wäre der versehentliche Ausstieg aus genau
  der Ansicht, für die man aufgeräumt hat.
- **Tipp und Wisch trennt die Strecke, nicht die Zeit** (`TAP_SLOP`, 8 px).
  Ohne die Schwelle wäre jeder Wisch am Ende auch ein Tipp, und das Bild
  klappte bei jedem Umsehen zusammen. Dazu `touch-action: none` auf dem Bild —
  sonst nimmt der Browser die erste Fingerbewegung für sich und schickt danach
  keine Punkte mehr.
- **Ein Knopfdruck scrollt die Liste nicht nach oben.** Die Seite wird nach
  jedem Tipp neu geschrieben, und eine neu geschriebene Liste fängt oben an —
  der Hacker scrollte nach jedem Schalter wieder zu seinem Schalter. Der
  Scrollstand wird deshalb aufgehoben und nur verworfen, wenn wirklich eine
  *andere* Seite kommt.
- **Quer gehaltenes Telefon bekommt zwei Spalten** (Bild links, Bedienung
  rechts). Hochkant bleibt unter dem Streifen genug für die Liste, quer nicht,
  und dann tippt der Pilot blind. Dort stehen auch nur zwei Kacheln
  nebeneinander statt vier: Der Block für breite Fenster rechnet mit der
  Fensterbreite, die Liste steht aber in einer Spalte von 42 % davon.
- **Der Späherschirm hängt an der Pixeldichte** und nicht an einer festen
  Zahl. Ausgerechnet bei ihm ist ein verwaschener Strich kein
  Schönheitsfehler, sondern die Auskunft — er hat nichts als Konturen.
- **`overscroll-behavior: contain` auf der Liste.** Ein Zug am Ende der Seite
  lädt sonst auf dem Telefon neu, und das ist mitten in einer Runde ein
  Spielabbruch.
- **Kein `font: inherit` auf `.haunt button`.** Diese Regel hat eine Klasse
  plus ein Element und schlägt jede `font-size` darunter, die nur eine Klasse
  hat: Jeder Knopf bekäme die Schriftgröße der Kopfzeile. Vererbt wird die
  Schriftart, die Größe setzt jeder Knopf selbst.

Zwei Sichten kommen aus der Welt (Archiv und Drohne, als
Kamera in ein Loch im Overlay gezeichnet — `HauntingWorld.render` mit
Scherenschnitt), zwei zeichnet die Oberfläche selbst (Späher als 2D-Konturen,
Tafel ganz ohne Haus). Der Archivar bekommt sein eigenes Licht und einen
Sepiaton, damit sein Blatt **nicht** davon abhängt, ob im Haus jemand die Lampe
angemacht hat: Eine Akte ist eine Bauzeichnung und kein Kamerabild. Die Lichter
dafür stehen immer in der Szene und werden auf null gedreht statt
herausgenommen — three.js baut jeden Shader neu, sobald sich die *Zahl* der
Lichter ändert.

**Alle im Raum `haunting`.** Der VR-Spieler wird beim Betreten dorthin geholt
(`WorldContext.join`), die Web-Spieler kommen über den Knopf auf der
Startseite; ein Raum-Code wäre hier für jeden am Tisch dieselbe Zeile Arbeit.
Wer schon in einem anderen Raum steht, wird **nicht** herausgezogen — das wäre
ein Abbruch der laufenden Runde von jemand anderem —, sondern bekommt eine
Zeile und einen Menüpunkt.

**Was noch fehlt** und bewusst nicht in dieser ersten Fassung steht: ein
Verlieren (das Monster schlägt zu, mehr passiert nicht), Ton für Drohne und
Radio, der Van als betretbarer Ort mit sitzenden Figuren und Monitoren, die
wirklich zeigen, was die Stationen sehen — und der **Verräter**. Für den reicht
das heutige Netz nicht: `NetSession` ist ein Rundfunk, jeder bekommt jede
Nachricht, und ein Geheimnis, das über diesen Kanal geht, ist keins. Er
braucht einen autoritativen Gastgeber, der jedem nur seine Projektion schickt —
die Nachrichten sind deshalb schon heute je Projektion geschnitten und nicht
als eine Wahrheit für alle.

## Deployment

`.github/workflows/deploy.yml` baut bei **jedem Push** (und in Pull Requests)
und lädt das Ergebnis als Artefakt hoch. Pushes auf `main` werden zusätzlich
auf den Branch `gh-pages` veröffentlicht — bewusst ohne GitHub-Pages-
Environment, damit keine Environment-Protection dazwischenfunkt. Nötig ist
nur die einmalige Einstellung:

> Repository → Settings → Pages → Source: **Deploy from a branch** →
> Branch `gh-pages`, Ordner `/ (root)`

Der Basispfad kommt aus `BASE_PATH` (im Workflow `/<repo-name>/`), lokal wird
von `/` ausgegangen.

### Wenn eine Seite aus einem Build läuft, den es nicht mehr gibt

Jede Welt wird erst beim Betreten nachgeladen — ein `import()` je Eintrag in
`worlds/index.ts`, also ein eigener Chunk je Welt, und jeder Chunk trägt den
Hash seines Inhalts im Dateinamen. Der Deploy schreibt `gh-pages` komplett neu;
danach gibt es die alten Dateinamen nicht mehr.

Eine Seite, die vorher geöffnet wurde, läuft trotzdem weiter — und in einer
Brille bleibt eine Seite schnell einen halben Tag offen, während zwischendurch
dreimal deployt wurde. Nur greift dann jeder Wechsel in eine Welt, die in
**dieser Sitzung** noch nicht geladen war, ins Leere: Der Server antwortet mit
404, das `import()` scheitert, und man bleibt stehen, wo man ist. Welten, die
schon einmal geladen waren, wechseln weiter, denn ihr Modul liegt im Speicher
des Browsers. Daran erkennt man den Fehler, und er sieht überhaupt nicht nach
einem Deploy aus, sondern nach kaputtem Routing:

> „Ins Portal Labor komme ich immer zurück, aber aus einer bestimmten Welt
> komme ich manchmal in keine andere mehr rein.“

Heilen lässt sich das nur durch **Neuladen** — eine neue `index.html` bringt
die neuen Dateinamen mit. Genau das passiert jetzt von selbst: `App.goTo`
meldet einen gescheiterten Ladeversuch über den Haken `onWorldFailed` an die
Seite, `main.ts` fragt `core/staleBuild.ts` (mit Test), ob der Fehler _dieser_
Fehler war, schreibt die gewünschte Welt in die Adresse und lädt neu. Man
steht danach dort, wo man hinwollte, statt dort, wo man war.

**Höchstens einmal je Welt**, vermerkt im `sessionStorage`: Nach dem Neuladen
steht die Welt in der Adresse und wird sofort wieder geladen — scheitert sie
erneut (kein Netz, ein echter Fehler im Modul), lädt die Seite sonst wieder
neu, und der Spieler sieht nie etwas anderes als den Ladebildschirm. Gibt es
den `sessionStorage` nicht, wird lieber gar nicht neu geladen: Eine Seite in
einer Neulade-Schleife ist schlimmer als eine, die einmal eine Welt nicht
öffnet.

Dazu gehört eine zweite Bremse in `App.goTo` selbst: **Es ist immer nur die
letzte Ladung gültig.** Ein dynamischer Import dauert, und wer im Menü zweimal
hintereinander tippt, hat zwei davon unterwegs; ohne die Marke räumte die
zweite die Welt der ersten ab, während deren `init` noch mitten im Aufbauen
war. Heraus kam eine halbe Welt, in der nichts mehr ging — und der Weg dorthin
war ein doppelter Tipper.
