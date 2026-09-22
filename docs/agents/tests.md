# Tests

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

**Zwei Geschwindigkeiten.** `jest.config.cjs` führt eine Liste `SLOW`: die
Suiten, die ganze Runden ausspielen — Bot-Runden über die echte 2D-Runde
(`rules/botRound.test.ts`, 150 s), die 2D-Runde selbst (`map/flatRound.test.ts`,
90 s), Schächte, Glättung, Training, Modelltechniker, Fracht,
Schiffsart — und dazu die fünf, die ganze Schiffe und Navigationsnetze stellen
(unten) — zusammen gut siebeneinhalb Minuten Rechenzeit, bei zwei CI-Kernen die
Hälfte der Wartezeit. `npm test` lässt sie aus und ist in unter einer Minute
durch; `npm run test:slow` fährt genau diese Liste; die CI macht beides in
getrennten Jobs (`Build` und `Slow tests`), damit ein Push nicht an einer Uhr
scheitert, sondern nur an einem Fehler. Die langsamen Suiten sind gewollt
langsam: Sie sind der Beleg, dass eine Runde von selbst endet und die Balance
hält (`botTraining.test.ts` misst 1600 Runden nach) — Rechnung, keine
Browser-Smokes, und darum gehören sie in Jest und nicht in Playwright. Wer
eine neue Suite schreibt, die mehr als zehn Sekunden braucht, trägt sie in
`SLOW` ein.

**Und wer sie eintragen will, muss sie erst wiegen.** Die schnelle Suite war
unbemerkt auf **acht Minuten** gewachsen — die Zusage „unter einer Minute" stand
noch da, gestimmt hat sie lange nicht mehr. Zwei Dinge standen dahinter, und nur
eines davon war Absicht:

- **Eine Fixture mit einer quadratischen Schleife.**
  `npc/characterStore.test.ts` baut eine Aufnahme, die den Speicherdeckel
  sprengt (`STORE_LIMIT`), und prüfte die Größe mit einem `JSON.stringify` über
  die **ganze** Liste — in der Schleifenbedingung. Bei 36 000 Anhängen wurde die
  mitwachsende Liste also 36 000-mal neu serialisiert: rund 65 GB JSON für eine
  einzige Fixture, **312 Sekunden für acht Tests**, die nichts als eine `Map`
  anfassen. Heute wird eine Bildzeile einmal gewogen und die Anzahl gerechnet:
  **0,8 Sekunden**, dieselben acht Tests, dazu die Zusage ausdrücklich geprüft.
  Eine Suite, die lange braucht, ohne lange rechnen zu wollen, ist kein Fall für
  `SLOW`, sondern ein Fehler.
- **Fünf Suiten, die ganze Schiffe stellen.** `ShipExperience`,
  `navmesh/flatNavigation`, `haunt`, `stationLayout` und `roundSim` kosten je
  zehn bis dreißig Sekunden und rissen damit genau die Grenze, die hier steht.
  Sie sind gewollt teuer und stehen jetzt in `SLOW`.

Zusammen: **acht Minuten auf gut eine halbe** (31 s auf vier Kernen), ohne dass
ein einziger Test weggefallen ist — 4776 laufen weiter. Wer das nächste Mal
nachsehen will, wohin die Zeit geht, lässt sich die Suiten einzeln ausgeben und
nicht die Summe:

```
npx jest --silent --json --outputFile=/tmp/fast.json
node -e "JSON.parse(require('fs').readFileSync('/tmp/fast.json')).testResults \
  .map(r => [r.endTime - r.startTime, r.name]).sort((a,b) => b[0]-a[0]) \
  .slice(0,15).forEach(([ms,n]) => console.log((ms/1000).toFixed(1)+'s', n))"
```

Die Erfahrung dahinter: Bei 343 Suiten sieht „acht Minuten" nach zu vielen
Tests aus, und es waren in Wahrheit **eine falsche Zeile und fünf Ausreißer** —
82 % der Zeit steckten in sechs Dateien, die restlichen 337 kosteten zusammen
90 Sekunden. Wer nach Gefühl streicht, verliert die Tests und behält die
Wartezeit.

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
dass ein alter Konfig-Code diese Felder noch gar nicht kannte), die **Bahn auf
einem gesuchten Weg** (`src/worlds/haunting/navmesh/route.ts`, früher
`droneRoute.ts` — nicht der Aufruf der Wegsuche, sondern das **Abfahren**:
dass ein Bildschritt über dicht gesetzte Stützpunkte hinweg nichts an Strecke
verliert, dass genau am letzten Punkt gehalten wird und dass vier Bildraten
dieselbe Strecke ergeben; sie trägt heute den Modelltechniker und das
Monster), die **Fenster des
Haunting-Hauses** (`src/worlds/haunting/house.ts` — dass jedes in einer
Außenwand sitzt und keines in einer Tür oder hinter einem Möbel, und dass es
im Graphen aufhält wie eine Wand: durch ein Fenster geht niemand nach
draußen) und die **Türen desselben Hauses** (dass **kein Zimmer nur eine**
hat, die Haustür mitgezählt — eine Sackgasse ist die Stelle, an der ein
Verfolger einen wirklich stellt und eine zugefallene Tür jemanden einsperrt;
dazu die Gegenprobe auf den Zuschnitt, weil zwei Türen zwei Nachbarn
brauchen), die **Augen des Monsters**
(`src/worlds/haunting/monster/monsterSight.ts` — die eine Sichtrechnung für
2D und 3D: Berührungsnähe sieht im Dunkeln, sonst nur, wer im Licht der Karte
steht, im Kegel und ohne Wand dazwischen; und dass die 2D-Runde genau dann
„Es hat dich gesehen." meldet, wenn das Modul es sagt), der **Läufer des
Monsters** (`src/worlds/haunting/monster/monsterWalk.ts` — derselbe in
beiden Welten: dass Holz nach `WOOD_DELAY` splittert, dass am Stahlriegel
gezogen wird, bis er nachgibt, und dass ein Ziel, das auf der Karte des
Monsters in keinem Raum liegt, ein Stehen mit Absicht ist), **eine Wahrheit
für 2D und 3D** (`src/worlds/haunting/groundTruth.test.ts` — der Spieler auf
der Karte so dick wie seine Kapsel, die Türöffnung so schmal wie im Schiff,
die Türautomatik der 2D-Runde Bild für Bild dieselbe wie die des Schiffs, und
das Gestell, das für Tastatur, Stock und Brille die Tempo-Regel der Runde
nimmt), der **Spuk des Monsters**
(`src/worlds/haunting/haunt.ts` — dass es das Licht des Zimmers ausmacht, in
dem es steht, und keines daneben; dass es erst die Lampe holt und dann eine
Tür; dass es nach jedem Streich Ruhe hält — und vor allem die eine Zusage, an
der eine ganze Runde hängt: Es steht auf **jeder Kachel** des Hauses und wirft
zu, was es zuwerfen kann, und danach kommt man von der Haustür immer noch in
jedes Zimmer), der
**Ausschnitt des Haunting-Archivars** (`src/worlds/haunting/archiveView.ts` —
dass im ganzen Blatt gar nicht verschoben wird, dass der Ausschnitt genau bis
an den Blattrand wandert und beim Herauszoomen wieder hereingezogen wird: die
Vorzeichen und Anschläge einer Zange sieht man auf einem Telefon niemandem an,
bevor sie schiefgehen), die **Bausteine der Haunting-Oberfläche**
(`src/worlds/haunting/ui/widgets.ts` — der eine Knopf, den fünf Stellen vorher
je selbst bauten: Name und Zeile, `data-*`, `is-active`, `aria-pressed`,
`disabled`, und die Meldung, die nach ihrer Zeit Text und Ton wieder ablegt), die
Handhaltung
(`src/core/handPose.ts` — samt der ausgelieferten Grundhaltung und ihrer
Spiegelung auf die linke Hand), der **Versatz, mit dem eine bloße Hand hält**
(`src/core/handHold.ts` — die Spiegelung auf die andere Hand und vor allem,
**wohin** die beiden Winkel drehen: ein Vorzeichen in Grad sieht man nicht an,
ob es nach links oder nach rechts zeigt, ein gedrehter Vektor schon), die
**Untersetzung der Feinjustage**
(`src/worlds/tune/fineTune.ts` — dass ein Zentimeter ein Millimeter wird, dass
die Drehung den kürzeren Bogen nimmt, und dass zehn Bilder auf demselben Weg
dort enden, wo eines endet), die
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
Speicher eine Zeichenkette statt einer Zahl steht), **wodurch ein Portal
hindurchgeht** (`src/worlds/portal/portalFunnel.ts` — dass beide Böden mitgehen,
wo zwei übereinanderliegen, dass ein Wandportal den Boden davor trotzdem in
Ruhe lässt, dass ein Keller zwei Meter tiefer nicht mehr dazugehört und dass
auch die Fläche mitkommt, die nur die halbe Öffnung hinterlegt: der Fehler
davor war fünf Zentimeter groß und sah aus wie ein halb verschluckter Würfel),
der **Durchtritt durch ein Portal** (`src/worlds/portal/portalCrossing.ts` — dass der Schnitt mit der
Ebene auch den erwischt, der in einem Bild ganz hindurchfliegt, dass die Wand
neben der Öffnung Wand bleibt, dass niemand zurückgeholt wird, der gerade
herauskommt, und wohin die **Blickrichtung** danach zeigt: Ein Zombie, der
hinter einem gedrehten Portal weiter nach Norden läuft, schickt einen die
Wegsuche durchsuchen, in der nichts falsch war), die **Spiegelung an einer
Ebene** (`src/worlds/shared/mirrorMath.ts` — dass die Ebene selbst liegen
bleibt, dass die Rechnung ihre eigene Umkehrung ist, dass der Abstand
vorzeichenrichtig kippt, und die Zahl, wegen der es diesen Test gibt: die
**Determinante ist −1**. Einem Spiegelbild sieht man in der Brille nicht an,
dass es falsch herum ist — man merkt es erst, wenn man die Hand hebt und die
falsche zurückwinkt, und sucht den Fehler dann überall, nur nicht in vier
Zeilen Matrix), die **Lichtstufen eines
Dimmers** (`src/worlds/dark/lightLevels.ts` — dass die erste Stufe
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
Rundenzähler über die Ziellinie hinweg), das
**Werkzeug-Budget pro Gürtelplatz**
(`src/worlds/portal/tools/looseBudget.ts` — dass eine Waffe links und eine
rechts sich nicht gegenseitig verschlucken, und dass ein Exemplar in einer
Hand zwar mitzählt, aber niemandem aus der Hand genommen wird), die
**Flugmathematik des Supermanhandschuhs**
(`src/worlds/portal/tools/supermanFlight.ts` und `supermanSettings.ts` — dass
volle Lehne die eingestellte Geschwindigkeit ergibt und nicht irgendetwas weit
jenseits eines ausgestreckten Arms, die Vorzeichen der Kurve, und wer welche
Achse bedient), die **Einstellung des Griffstands**
(`src/worlds/tune/gripSettings.ts` — Grenzen, eine Seite, die keine ist, und
eine Werkzeug-Id, die es nicht mehr gibt) samt seiner **Rechnung**
(`src/worlds/tune/handGrip.ts` — dass die Kette Griff → Werkzeug → Hand sich
wirklich schließt und der Griff sich dabei herauskürzt, denn ein hingestelltes
Werkzeug hält niemand, und dass die Zielkorrektur, die ein gehaltenes Werkzeug
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
Pistole; dass die Hand am **Pinsel** gerade _keine_ Faust ist, sondern ihn wie
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
Kapsel ist dort längst geräumt), **Menü als Seite** (`src/ui/PageMenu.ts` — in jsdom: dass eine Zeile mit
Kindern absteigt und eine ohne läuft, dass der Weg mit den Handgelenken
geteilt ist, dass ein Neubau des Baums die Seite nicht verlässt und eine
Nimm-Seite beim Antippen nimmt), **2D oder 3D am Bildschirm**
(`src/core/screenView.ts` — Handy 2D, sonst 3D, ein kaputter Speicher wird die
Voreinstellung; dazu `startOptions`: welche der beiden Fragen die Startseite
stellt und wohin ihr einer Knopf führt), der
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
(`src/worlds/hub/hubGrid.ts` — dass ein voller Gang
einen neuen aufmacht, dass jedes Tor in seinem Gang steht, dass keine zwei
aufeinander stehen, dass der Startpunkt frei bleibt und dass jedes Tor vom
Startpunkt aus wirklich zu erreichen ist), die **Flächen der Würfel**
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
Ziel) und die **Effekte**
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
statt eine halbe Hand zu bauen).
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
_eine_ Frage ist, ist der Zweck), die **Meinung** (`navBelief.ts` — dass ein NPC gegen eine inzwischen
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
und der **Grundriss der Testwelt** (`test/testPlan.ts` — dass jede der neun
Zonen vom Startplatz aus zu erreichen ist, dass die Treppe wirklich auf dem
Podest endet, dass hinter die Türwand nur kommt, wer eine der drei Türen
aufmacht, und dass die ganze Welt eine Runde durch das Weltformat unverändert
übersteht), die **Miniatur**
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
zwei _verschiedenen_ Meldungen, weil „zu neu" und „zu alt" verschiedene Sachen
sind; dass ein Baustein ohne Boden stillschweigend wegfällt, eine kaputte Masse
dagegen abbricht) und der **Speicher dahinter**
(`grid/worldStore.ts` — dass jede Welt ihren eigenen Schlüssel hat, dass Müll im
Speicher weggeworfen wird statt die Welt aufzuhalten, und dass ein privates
Fenster ohne `localStorage` ein Nein bekommt statt eines Absturzes) und das
**Wand-Ghosting** (`grid/wallGhost.ts` — was zwischen Kamera und Figur steht
und was nicht: eine Wand ja, ein Boden nie, eine Druckplatte auch nicht).

**Ein Prüfstand ist weggefallen, und das ist eine Lücke.** Bis September 2026
lief das ganze **Navigationslabor** als Test (`navlab/labSim.ts`, und einmal
mit echter Physik): dieselben Wände, dieselbe Karte, ein Körper mit Umfang und
Drehrate, und je Bucht ein **Kontrollpunkt**, an dem er vorbeigekommen sein
musste — vor der Metalltür außen herum, vor der Holztür drei Sekunden
davorstehen und dann hindurch. Der Unterschied zu allen anderen war die Frage:
Die übrigen prüfen eine Rechnung, dieser prüfte einen **Eindruck** — „der
Zombie läuft durch die verriegelte Tür" ist keine falsche Zahl, sondern ein
Weg, den man erst sieht, wenn man ihn abläuft. Mit der Welt ist er gegangen;
die Navigationszone der Testwelt stellt dieselben Fragen wieder auf, prüft sie
aber bislang nur von Hand. Wer sie wieder rechnen lassen will, findet das alte
Gerüst in `git show 3678f32:src/worlds/navlab/labSim.ts`.

Und seit es die **Schilder** gibt (`worlds/signs/`), fünf weitere: was auf
einem Schild steht (`signMarkup.ts` — die kleine Teilmenge Markdown, und vor
allem, dass ohne sie jede Zeile wörtlich stehen bleibt: wer eine Liste von
Namen mit `*` davor tippt, will Sternchen und keine Aufzählung), wie es
umbrochen wird (`signLayout.ts` — gemessen wird von außen, im Test von einer
Funktion, die Buchstaben zählt; geprüft werden der Umbruch, das zu lange Wort,
das _nicht_ zerhackt wird, der Punkt links vor dem eingerückten Text und die
gedeckelte Höhe eines Bildes), wie es **rollt** (`signScroll.ts` — dass was
hineinpasst gar nicht rollt, dass oben und unten gewartet wird, und die tote
Zone, ohne die ein ruhender Stick ein Schild in einer Minute quer durch seinen
Text schöbe), wie es **aussieht** (`signSettings.ts` — Grenzen, Rasten, und die
Umrechnung, um die es eigentlich geht: die Schriftgröße steht in Zentimetern
_auf dem Schild_, damit „4 cm" auf der kleinen Tafel dasselbe heißt wie auf der
großen), und was davon **über das Netz** geht (`signShare.ts` — dass ein
fremdes Schild geprüft wird, bevor es gezeichnet wird, und dass bei gleicher
Fassung das Bekannte stehen bleibt: beim Begrüßen antworten mehrere, und ohne
diese Regel spränge der Rollstand jedes Schildes zurück an den Anfang). Dazu
die **Tastaturwahl** (`core/systemKeyboard.ts` — die Tabelle aus drei
Einstellungen mal „in der Brille" mal „auf so einem Gerät", in der man sich
sonst vertut) und die **Türmathematik**
(`worlds/interact/doorMotion.ts` — dass eine Tür mit Nachlauf beim zweiten
Druck _nicht_ zufällt, sondern die Uhr neu setzt: eine Tür, die zugeht, während
man in ihr steht, ist eine Falle und kein Schalter) und der **alte Build**
(`core/staleBuild.ts` — die drei Sätze, mit denen die drei Browser-Familien
ein nicht mehr vorhandenes Modul melden, wörtlich, damit ein Tippfehler in der
Liste auffällt und nicht erst dann, wenn nach einem Deploy niemand mehr die
Welt wechseln kann; und die Bremse, die daraus höchstens _ein_ Neuladen macht),
die **Wege des Service Workers** (`core/swRoutes.ts` — welche Anfrage aus dem
Speicher kommt, welche erst ins Netz geht und welche er gar nicht anfasst; ein
Fehler darin sieht nicht aus wie ein Fehler, sondern wie eine alte Welt, die
nicht weggeht, und deshalb steht die Entscheidung in einer Funktion und nicht
in einem Ereignis) und **wann das Installieren angeboten wird**
(`core/install.ts` — dass ein iPad, das sich als Macintosh ausgibt, an seinen
Berührungspunkten zu erkennen ist, und dass niemand gefragt wird, der die
Spielwiese längst installiert hat; ein iPhone steht nicht in der CI, ein
Kennstring ist alles, was man von ihm hat).

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

**Vier Tests starten wirklich Rapier**, und jeder hat sich das verdient
(`jest.config.cjs` führt sie auf): `grid/slidingDoor.test.ts` lässt ein
Türblatt wirklich fahren, `npc/npcDirector.test.ts` prüft,
woher Nachschub kommt, `physics/playerFooting.test.ts` stellt den Spieler bei
fünf Bildraten auf den Boden — und `worlds/portal/portalFall.test.ts` lässt
einen Zombie **und einen Würfel** durch ein Bodenportal fallen. Der letzte, weil
die Frage, ob ein Körper durch einen Boden fällt, keine Rechnung beantwortet,
sondern eine Kollisionsmaske in der Engine: Ein Nachbau davon prüfte den
Nachbau. Die Gegenproben stehen daneben — derselbe Zombie auf demselben Boden
bleibt ohne die Ausnahme stehen, und der Würfel bleibt fünf Zentimeter tief im
Loch liegen, wenn nur der obere von zwei Böden nachgibt; ohne sie wäre der Test
auch für einen Boden grün, den es gar nicht gibt.

WebXR braucht einen sicheren Kontext. `localhost` reicht; für die Brille im
selben WLAN am einfachsten über HTTPS-Tunnel oder `vite dev --https` testen.
