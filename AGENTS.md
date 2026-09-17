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
keine; deshalb prüft sie jetzt jeder Push nach. `npm test` ist die **schnelle**
Suite (unter einer Minute); die Rundensimulationen laufen mit
`npm run test:slow` (siehe [Tests](#tests)) — wer an Runde, Bots oder Wegsuche
arbeitet, lässt sie vor dem Push selbst laufen, die CI tut es in jedem Fall.

### Sessions, die nicht auf `main` pushen dürfen

Claude Code im Browser (claude.ai/code) läuft in einem fremden Container und
bekommt vom Harness einen `claude/…`-Branch zugewiesen; `git push -u origin
main` ist dort nicht möglich, egal was ein paar Absätze weiter oben steht. Für
diese Sessions gilt deshalb der Umweg — aber vollständig, bis der Commit auf
`main` steht:

1. Auf dem zugewiesenen Branch entwickeln, die vier Prüfungen laufen lassen,
   pushen.
2. Pull Request eröffnen, **nicht als Draft**. Ein Draft ist für GitHub keine
   fertige Arbeit: mergen lässt er sich nicht, und Auto-Merge lässt sich auf
   ihm gar nicht erst scharfstellen.
3. Warten, bis die CI grün ist, und den PR dann **selbst mergen**. Auf einen
   Menschen wird dabei nicht gewartet: Das Ergebnis dieser Regel ist ein
   Commit auf `main` und nicht ein offener Pull Request.
4. Den Branch löschen, lokal und auf `origin` — dieselbe Aufräumregel wie oben,
   samt dem `HTTP 403`, der gesagt werden will.

Wer am Ende einen offenen PR liegen lässt, hat die Arbeit nicht abgeliefert,
sondern nur abgelegt. Fehlt das Recht zum Mergen, steht genau das im Ergebnis,
mitsamt der Nummer des PR.

Sobald auf `main` ein Ruleset mit dem Pflicht-Check `Build` liegt, ersetzt
GitHubs Auto-Merge den dritten Schritt: einmal scharfstellen, und GitHub mergt
selbst, sobald die CI durch ist. Ohne so ein Ruleset ist jeder PR von der ersten
Sekunde an mergebar, und genau dann lässt GitHub Auto-Merge nicht zu — deshalb
steht hier das Warten und nicht die Automatik.

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

**Zwei Geschwindigkeiten.** `jest.config.cjs` führt eine Liste `SLOW`: die
Suiten, die ganze Runden ausspielen — Bot-Runden über die echte 2D-Runde
(`rules/botRound.test.ts`, 150 s), die 2D-Runde selbst (`map/flatRound.test.ts`,
90 s), Schächte, Glättung, Training, Modelltechniker, Fracht,
Schiffsart — zusammen gut sechs Minuten Rechenzeit, bei zwei CI-Kernen die
Hälfte der Wartezeit. `npm test` lässt sie aus und ist in unter einer Minute
durch; `npm run test:slow` fährt genau diese Liste; die CI macht beides in
getrennten Jobs (`Build` und `Slow tests`), damit ein Push nicht an einer Uhr
scheitert, sondern nur an einem Fehler. Die langsamen Suiten sind gewollt
langsam: Sie sind der Beleg, dass eine Runde von selbst endet und die Balance
hält (`botTraining.test.ts` misst 1600 Runden nach) — Rechnung, keine
Browser-Smokes, und darum gehören sie in Jest und nicht in Playwright. Wer
eine neue Suite schreibt, die mehr als zehn Sekunden braucht, trägt sie in
`SLOW` ein.

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

## Was drin ist

- **Startseite: eine Frage, ein Knopf** (`core/screenView.startOptions`, mit
  Test). Welche Frage dasteht, entscheidet **eine** Eigenschaft des Geräts —
  ob der Browser eine immersive Sitzung starten kann:
  - **Mit Brille** gibt es „von oben oder aus den Augen" nicht (in der Brille
    ist nur das eine zu haben); gefragt wird nach **Sitzen oder Stehen**
    (`core/posture.ts`), und der Knopf heißt **Enter VR**.
  - **Ohne Brille** ist es umgekehrt: Die Haltung ändert am Bildschirm nichts,
    gefragt wird **Von oben oder Aus den Augen** (`core/screenView.ts`,
    vorbelegt nach Gerät — **Handy: von oben**, sonst aus den Augen), und der
    Knopf heißt **Beitreten**. Die Kennungen dahinter heißen weiter `2d` und
    `3d`, weil sie so im Speicher stehen; die Wörter stehen in
    `SCREEN_VIEW_LABELS`.

  Bis `detectXRSupport` antwortet, gilt „keine Brille": Das stimmt für fast
  jedes Gerät, der Knopf steht sofort da, und die Brille schreibt sich
  Millisekunden später selbst hinein — besser als ein toter Knopf „VR wird
  geprüft …", auf den jeder Schreibtisch wartet.
  **Die Wahl ist eine Zusage**: _Von oben_ führt in dieselbe Welt, nur aus der
  Kamera darüber, und die gibt es in **jeder** Welt (`core/TopDownCamera.ts`,
  siehe „Von oben: dieselbe Welt, eine Kamera") — „Beitreten" öffnet also die
  Welt, in der man ohnehin steht, nur von woanders angesehen. Vorher stand der
  Schalter da und die Spielwiese startete trotzdem den Hub in 3D: eine Wahl,
  die keine war. Umgeschaltet wird auch mitten im Spiel, unter
  **Menü → Ansicht**.
  Oben links derselbe **Menü-Knopf** wie im Spiel (`#landing-menu`): Welten,
  Bewegung, Aussehen, Grafik schon vor dem Start, als Seite (`ui/PageMenu.ts`).
  Einen **Hinweiskasten** mit fünf Zeilen Steuerung gab es hier auch einmal; er
  ist weg — was darin stand, steht im Menü, in dieser Datei und in der README,
  und auf einer Startseite liest es niemand.
  Unter `#haunting` hat sie ein zweites Gesicht: die **Startseite der Runde**
  — Name, Raum-Code, Verbinden, und derselbe eine Knopf in denselben Raum
  (`main.ts`, `data-landing="haunting"`; siehe [Haunting](#haunting--orbital-raumstation-für-eine-quest-und-zwei-mobilgeräte)).

- **Von oben: dieselbe Welt, eine Kamera** (`core/TopDownCamera.ts`,
  `core/topDownPose.ts` mit Test). Die Ansicht _Von oben_ ist kein zweites
  Spiel, sondern ein **Blickwinkel** auf die three.js-Szene, in der ein anderer
  gerade mit der Brille steht: eine feste Kamera schräg darüber, 55° geneigt,
  Norden oben, eng im Öffnungswinkel (30°) — die Optik von _Overcooked_. Man
  sieht dieselben Wände, dieselben Türen, dieselben Kisten wie in 3D, nur von
  woanders.
  - **Die Vorgeschichte in einem Absatz.** Bis September 2026 malte eine
    Spiele-Bibliothek (Phaser) dafür eine **eigene** Kachelwelt auf eine
    Leinwand über dem WebGL-Bild, und das WebGL-Bild wurde dabei nur geleert:
    1-m-Kacheln, gemalte 16-px-Sprites, ein eigener Held, ein eigener Editor.
    Das war ein Umweg, und zwar aus einem Missverständnis heraus — die Optik,
    die gemeint war (_Overcooked_), ist gar keine Pixelwelt, sondern eine
    3D-Szene aus fester Schrägsicht. Der Preis waren **zwei Wahrheiten**: Was
    man von oben umwarf, stand in 3D noch, eine Tür kannte nur ihre Hälfte,
    und wer in der Brille danebenstand, sah einen Spieler von oben gar nicht.
    Geblieben ist der richtige Gedanke darin — **dass ein 2D-Gitter sagt, wo
    alles steht** —, und der wohnt längst woanders, nämlich im Kachelgitter
    (`worlds/grid/`, Kacheln, Ebenen, Bausteine, Einbauten) mit dem
    Bauplatz als Editor (`worlds/editor/WorldEditor.ts`). Phaser und
    `src/world2d/` sind damit ersatzlos weg; der Weg dorthin und zurück steht
    in [dem Plan](docs/plan-2d-hub-interaktion.md).
  - **Wie die Kamera steht** (`topDownPose.ts`, ohne three.js, mit Test): Ziel
    ist die **Mitte des Rigs** und nicht der Kopf — sonst schöbe jedes Ducken
    das Bild —, die Kamera steht im Süden darüber (`topDownPosition`) und nickt
    genau so weit, dass sie das Ziel ansieht (`topDownPitch`). Der **Zoom**
    geht in **sechs** Stufen als Abstand: 12 · 16 · 22 · 30 · 42 · 60 m,
    Vorgabe 16, das Rad
    sammelt 50 Einheiten je Stufe wie schon in der alten Kachelwelt — und die
    nächste Stufe wird **vom Abstand aus gerechnet, der gerade gilt**, nicht
    von der zuletzt gerasterten: Sonst spränge das Bild nach einem Pinch beim
    ersten Radklick dorthin zurück, wo es vor dem Pinch stand. **Die beiden
    obersten Stufen sind nachgetragen worden**, und der Grund ist die
    Testwelt: Ihr Gelände misst 64 × 80 m, und bei 30 m Abstand sieht man
    davon einen Ausschnitt — wer wissen wollte, wo die Kartbahn relativ zur
    Kletterwand liegt, musste hinlaufen. 60 m fassen das Gelände als Ganzes;
    darüber hinaus wird die Figur zum Punkt, und ein Blickwinkel, in dem man
    sich selbst sucht, ist keiner mehr. Beides läuft
    **weich** nach (`net/PoseSmoothing.SmoothPose`, 0,12 s): Ein Rig, das an
    jeder Fuge einen Zentimeter versetzt wird, zitterte sonst im ganzen Bild.
    Perspektivisch und nicht orthografisch, weil ein Podest und der Boden
    darunter sonst auf denselben Fleck fielen.
  - **Man sieht sich selbst.** Der eigene Körper liegt auf `LAYER_SELF_ONLY`
    und wird vom eigenen Auge nie gezeichnet; von oben ist dieses Auge aber ein
    Blick **auf** die Figur, also nimmt die Maske dieser Kamera die Ebene dazu
    (`core/viewLayers.ts` — dieselbe Regel wie Spiegel und Portalsichten). Der
    Kopf folgt dabei dem **Rig** und nicht der Desktop-Kamera
    (`PlayerAvatar.headFollowsRig`), sonst schaute er beim Laufen starr in eine
    Richtung von vorhin; und die Figur bekommt ihre **Handkugeln**
    (`AvatarBody`, `hands`), weil ein Koch ohne Hände von oben abgesägt
    aussieht — in der Brille bleiben sie aus, da sind die eigenen Hände die
    getrackten.
  - **Gelaufen wird in Weltrichtungen** (`FlatControls.walkNorthUp`): W ist
    Norden (−z) und bleibt Norden, auch wenn die Figur nach Süden schaut, D ist
    Osten (+x). Über dieselbe Physik wie am Schreibtisch (`rig.setIntent`,
    `PhysicsLocomotion`) — eine feste Kamera ist ein Blickwinkel und kein
    zweiter Antrieb. Shift sprintet, Leertaste springt, die **Maus dreht
    nichts** und fängt keinen Zeiger. Läuft niemand und zielt niemand, schaut
    die Figur dorthin, wohin sie zuletzt lief, weich gedreht (Twin-Stick-Regel
    ohne zweiten Stick).
  - **Vier Geräte, eine Absicht** (`FlatControls`, `core/gamepad.ts`). Von oben
    spielt man mit Tastatur, Maus, Gamepad und Glas, oft mit zweien
    gleichzeitig — und alle vier meinen dasselbe: laufen, **zielen**,
    benutzen, schießen, zoomen. Zusammengerechnet wird das an **einer** Stelle,
    in `FlatControls`; eine Welt, die selbst Tasten abhört, hätte dieselbe
    Taste zweimal.
    - **Zielen** ist der zweite Stick, und wo keiner ist, die Maus: Die
      Richtung wird auf dem **Schirm** gemessen — vom Zeiger zur Figur
      (`TopDownCamera.project(rig)`) — und mit `topDownPose.groundDirection`
      auf den Boden zurückgerechnet, samt der Stauchung nach Norden, die die
      Neigung der Kamera hineinrechnet. Ohne diese Division zielt die Figur zu
      flach, und man merkt es erst, wenn man danebenschießt. Wer zielt, dreht
      die Figur **hart** dorthin (ein Stock, der erst in einer Zehntelsekunde
      ankommt, zielt für den Spieler daneben); lässt er los, **bleibt die
      Richtung stehen** — der Laufrichtung folgt die Figur erst wieder, wenn
      sie auch läuft, und wer im Stehen gezielt hat, sieht die Waffe nicht zur
      Mitte zurückzucken. Und eine
      Mausbewegung holt das Zielen vom Stock zurück, nicht umgekehrt: Sonst
      zöge eine Maus, die beim Spielen mit dem Pad irgendwo auf dem Schirm
      liegt, die Figur dauernd zu sich.
    - **Benutzen und Schießen gehen ans Rig** und nicht an die Welt:
      `PlayerRig.requestUse()` ist eine **Flanke** (`takeUse()` liest sie und
      löscht sie, je Bild höchstens einmal), `setTrigger(0…1)` ist der Trigger
      der rechten Hand — derselbe Wert, den in der Brille der Controller
      liefert, damit die Pistole von oben keinen zweiten Weg bekommt. Was vor
      der Figur steht und was in ihrer Hand liegt, weiß die Welt; sie fragt
      dort nach (Paket P2 aus [dem Plan](docs/plan-2d-hub-interaktion.md)).
    - **Das Gamepad ist reine Rechnung** (`core/gamepad.ts`, mit Test): kein
      Plugin, nur `navigator.getGamepads()` je Bild und das Standard-Mapping
      (Sticks 0/1 und 2/3, `A` = 0, `B` = 1, LB/RB = 4/5, RT = 7, linker Stick
      gedrückt = 10). Die **Totzone von 0,2 ist rund und nicht quadratisch** —
      eine quadratische ließe einen leicht diagonal gehaltenen Stick auf einer
      Achse durch, und die Figur zuckte nach Norden statt stillzustehen —, und
      darüber wird neu skaliert, damit es hinter der Kante langsam anläuft
      statt mit einem Fünftel Tempo anzuspringen. Die Flanken der Knöpfe macht
      `ButtonState` aus `core/XRInput.ts`, dieselbe Klasse wie in der Brille
      und keine Abschrift. Außerhalb von _Von oben_ darf der Pad mitspielen:
      linker Stick läuft, rechter sieht sich um, `A` springt.
      - **Was davon wirklich ankommt, zeigt `/inputs.html`** (siehe
        [Die Eingabeseite](#die-eingabeseite)): jeder Knopf mit seiner Nummer,
        das Bild des Controllers dazu, und darunter derselbe `readGamepad`, der
        im Spiel läuft. Sie ist der einzige Weg, ein Pad am Browser einer
        Konsole zu untersuchen — dort gibt es keine Entwicklerwerkzeuge.
      - **Und die Nummern sind nicht in Stein.** Die Knopfnummern oben sind die
        **Voreinstellung** (`DEFAULT_PLAN`); wer will, legt sie um, und wessen
        Treiber die Lage falsch meldet, richtet sie mit einer Gerätekarte
        (`core/inputMap.ts`, siehe
        [Zwei Karten](#zwei-karten-wo-ein-knopf-sitzt-und-was-er-tut)).
        `readGamepad` bekommt dafür einen `ButtonPlan`; ohne einen gilt Zeile
        für Zeile das, was immer galt.
    - **Dass es das Glas überhaupt gibt, ist eine Einstellung** — _Menü →
      Grafik → Bildschirm-Steuerung_ mit drei Rasten
      (`graphicsSettings.screenPads`, gerechnet in `core/screenPads.ts`, gesetzt
      in `main.ts`). **Automatisch** ist die Voreinstellung und heißt: nur am
      Handy (`device.detectFlatRole`), und auch dort nur, solange **kein
      Gamepad** angesteckt ist — wer eines am Tablet hängen hat, hält schon
      einen echten Stock in der Hand und braucht keinen gemalten darüber, der
      ihm das halbe Bild nimmt. **An** zeigt sie auch am Schreibtisch, **aus**
      nimmt sie auch dem Telefon. Zwei Zustände stehen **vor** der Einstellung
      und lassen sich von ihr nicht überstimmen: in der Brille sieht niemand
      auf das Glas, und eine Welt mit eigener Steuerung
      (`WorldContext.touchStick`) hätte sonst zwei Stöcke übereinander. Die
      Bedingung stand einmal dreimal in `main.ts` und kannte je nur ihre
      Hälfte — wer die Brille absetzte, bekam die Stöcke auch dann zurück, wenn
      die Welt sie gerade selbst mitbrachte.
    - **Auf dem Glas** kommt rechts unten ein zweiter Stock dazu und darüber
      zwei runde Knöpfe `A`/`B` (`#touch-aim`, `#touch-a`, `#touch-b`); sie
      stehen nur von oben, weil sie sonst nichts bedeuten. Wie der linke Stock
      sind es Zeigerflächen und keine Knöpfe: Die Leiste liegt auf
      `pointer-events: none`, die Ereignisse kommen an der Leinwand an, und
      `FlatControls` sieht nach, über welchem Feld ein Finger aufgesetzt hat.
      Die beiden liegen **nebeneinander über dem Zielstock**, `B` links von
      `A`, auf derselben Höhe und mit einer Handbreit Luft zum Stock. Vorher
      saß `B` allein darüber und `A` darunter, und der Daumen, der den Stock
      hält, erwischte auf dem Weg nach oben zuerst den falschen.
    - **Zwei Finger in der oberen Hälfte zoomen** (`TopDownCamera.zoomScale`).
      Ein Pinch ist die Geste, mit der auf einem Telefon seit jeher gezoomt
      wird, und stufenlos: Der Abstand wird mit dem Faktor der Finger skaliert
      und zwischen der nächsten und der fernsten Stufe geklemmt
      (`topDownPose.zoomScaled`). **Obere Hälfte**, weil unten die beiden
      Stöcke und die Knöpfe liegen — ein zweiter Finger auf dem Zielstock ist
      kein Zoom, sondern jemand, der gerade zielt und läuft. Und **ohne
      Nachlaufen**, anders als die Raste: Ein Pinch ist direktes Anfassen, und
      ein Bild, das dem Finger eine Fünftelsekunde hinterherhinkt, fühlt sich
      kaputt an.
  - **`A` benutzt — überall** (`core/usable.ts` mit Test,
    `PortalWorld.useForward`).
    In der Brille legt man die Hand auf einen Knopf und drückt; von oben gibt
    es keine Hand, die man irgendwo hinlegt, sondern eine Figur, die irgendwo
    steht. `A`, `E`, Enter und der Touch-Knopf `A` fragen deshalb: **Was steht
    vor mir?** — ein Strahl aus der Brust, **1,5 m** weit, und wenn der nichts
    trifft, das, was die **Füße überlappen** (0,6 m). Der Strahl sticht die
    Überlappung, unter Gleichen gewinnt das Nächste; wer vor einer Druckplatte
    steht und auf den Knopf dahinter zeigt, meint den Knopf.
    - **Und das gilt in jeder Ansicht, nicht nur von oben.** Die Auswahl
      rechnet `PortalWorld` in jedem Bild, auch aus den Augen und in der
      Brille; was sich dabei ändert, ist allein die **Richtung**
      (`usable.aimForward`): von oben die des Rigs — dort dreht die Steuerung
      die ganze Figur zum Ziel —, sonst die **Kopfrichtung**, waagerecht
      projiziert (`PlayerRig.getHeadForward`), denn dort steht die Figur still
      und sieht sich um. Wer senkrecht nach unten schaut, hat keine waagerechte
      Richtung mehr; dann gilt wieder die Figur, sonst zeigte `A` beim Blick
      auf die eigenen Füße irgendwohin.
    - **Springen und Benutzen sind derselbe Knopf**, und das ist kein Konflikt,
      sondern die Regel jedes Spiels mit einem Knopf: `A` springt **nur, wenn
      nichts in Reichweite ist**. Die Welt legt dafür jeden Frame einen Zettel
      ans Rig (`PlayerRig.useCandidate`) — sie weiß als Einzige, was gerade vor
      der Figur steht —, und `A` liest ihn. Am Schreibtisch springt die
      Leertaste weiterhin immer: Dort ist eine Taste frei, und wer vor einem
      Knopf steht und trotzdem hüpfen will, soll das können. Beim
      **Weltwechsel** wird der Zettel zurückgesetzt (`standUp`), sonst stünde
      man in der neuen Welt vor nichts und käme trotzdem nicht vom Boden.
    - **Was gemeint ist, leuchtet** (`core/highlight.ts`). Ohne das ist die
      Auswahl eine Vermutung: Man drückt und sieht danach, was passiert ist.
      Das gewählte Ding bekommt deshalb einen **gelblichen Saum** (`0xffd35a`)
      — dieselbe Mechanik wie die schwarze Comic-Kontur, eine umgestülpte
      Hülle (`core/outlineShell.ts`), weil ein Nachbearbeitungsschritt in einer
      WebXR-Sitzung nicht zu haben ist. Er trägt eine eigene Marke, ein eigenes
      Material, wirft keinen Schatten, fängt keinen Strahl und sagt für sich
      selbst jeden weiteren Saum ab — sonst bekäme der Saum einen Saum, sobald
      der Comic-Modus das nächste Mal über die Szene läuft. Wo ein Usable
      **keine Geometrie** hat (eine Zone, ein Platz), liegt stattdessen ein
      **Ring auf dem Boden**: Eine umgestülpte Hülle von nichts ist nichts.
      **Der Saum ist die ganze Auskunft**, in jeder Ansicht. Daneben stand
      einmal eine Tafel in der Bildmitte („Tomate nehmen"), und sie sagte
      dasselbe ein zweites Mal — nur eben quer über der halben Küche statt
      dort, wo das Ding steht. Sie ist weg (`showUsePrompt` samt
      `USE_PROMPT_Y`); `Usable.usePrompt` bleibt als **Satz über die Tat**, den
      eine Welt selbst melden kann und den die Tests der Küche nachrechnen
      (`zones/kitchenCarry.kitchenPrompt`).
    - **Gerechnet wird auf dem Boden**, in x und z. Ein Knopf sitzt auf
      Hüfthöhe, ein Türgriff höher, eine Druckplatte am Boden — wer davorsteht,
      meint sie alle, und ein Strahl aus der Brust verfehlte die Platte um
      genau die Höhe der Brust. Jedes benutzbare Ding ist deshalb ein stehender
      Zylinder, mindestens 40 cm breit (`USE_RADIUS`): Auf einen vier
      Zentimeter großen Kippschalter zielt von oben niemand.
    - **Es ist dieselbe Wirkung wie in VR**, nicht eine zweite. Ein Knopf
      meldet sich mit `PortalWorld.addUsable(object, { use, usePrompt })` an;
      dahinter steht dieselbe Methode, die auch der Zeiger und die Hand
      aufrufen. Angemeldet wird in einer **Liste** der Welt und nicht in der
      Szene gesucht — die Frage „was ist hier benutzbar" steht in jedem Bild
      an, weil der gelbe Saum daran hängt. Am Objekt selbst hängt dieselbe
      Auskunft als `userData.usable`.
    - **Die Tafel ist ganz weg.** Sie begann einmal mit dem Namen des Knopfes
      (_A · Brötchen nehmen_), verlor ihn und behielt die Tat („Brötchen
      nehmen") — und auch die sagt der Saum schon, und zwar am Ding. In einer
      Küche im Gedränge stand damit dauernd ein Schild vor der Arbeitsfläche.
      Mit der Tafel fiel schon vorher `PlayerRig.useLabel` (sie war der einzige
      Ort, der den Namen des Knopfes je gelesen hat) und mit ihm
      `FlatControls.padSpoke`, das sich nur gemerkt hatte, ob zuletzt eine
      Taste oder ein Knopf sprach.
    - **Die Portal-Regel: Was man drücken kann, kann man auch treffen.** Der
      rote Knopf (`worlds/shared/redButton.ts`) hat einen Kollisionskörper an
      der Kuppel, und eine Kugel, die ihn unterwegs streift, ruft sein `use`
      auf und ist danach aufgebraucht (`PortalWorld.bulletTravelled`). Die
      Trefferfläche ist dabei um `SHOT_MARGIN` größer als der Körper: Eine
      Kugel fliegt nicht *in* einen Knopf hinein, sie bleibt an ihm stehen, und
      ihre Strecke endete sonst knapp außerhalb.
  - **Die Hand am Schirm** (`worlds/portal/screenHand.ts`). Von oben sieht man
    die Figur, und sie soll etwas halten — die Pistole vor allem, denn
    **Linksklick, `B` und RT sind ihr Trigger** (`PlayerRig.setTrigger`,
    `.trigger`). Am
    Schreibtisch gab es dafür bis dahin gar keine Hand: Werkzeuge hingen am
    Gürtel und kamen nur in eine Hand, die ein Controller trackte. Gebaut ist
    sie deshalb als das, was sie ersetzt — ein `ControllerState` ohne
    Controller, am Rig statt am Kopf. Damit läuft der **ganze** bestehende Weg
    (`takeTool`, `applyHold`, `onTrigger`, Zielkorrektur, Rückstoß), und es
    gibt keinen zweiten zum Schießen; das Werkzeug zeigt entlang −z des Rigs,
    also genau dorthin, wohin die Figur schaut. Sie entsteht mit der Ansicht
    und vergeht mit ihr; der Gürtel bleibt dabei unberührt. Und der **Strahl
    vom Schirm ruht** so lange (`Pointer.topDown`): Er käme aus der Kamera im
    Rig, die von oben niemand ansieht, und nähme dem Werkzeug seinen Trigger
    weg.
    - **Was darin liegt, wählt der Spieler** (`PortalWorld.screenTool()`).
      Lange stand dort fest, was die Welt beim Bauen hineingelegt hatte —
      ausgeliefert die Pistole, denn ein Trigger ohne Waffe bedeutet nichts —,
      und wer etwas anderes wollte, hatte Pech: In der Brille greift man ins
      Regal am Handgelenk, am Bildschirm gibt es keine Hand, die irgendwo
      hingreift. Jetzt sitzt unten rechts über `A` und `B` ein runder
      **Werkzeug-Knopf** (`#hud-tool`, `ui/ToolButton.ts`), der die Ikone des
      gewählten Werkzeugs zeigt — gezeichnet mit demselben Stift wie jede
      Menüzeile (`drawMenuIcon`), sonst lernt man zwei Bilder für ein Ding —,
      und ein Druck klappt eine **Seite** auf (`ui/PageMenu.ts`, eigener Baum).
      Tastatur: `Tab`; Gamepad: `Y`.
    - **Ganz oben steht die Hand (leer)**, und das ist eine Wahl und kein
      Fehlen: `screenTool()` gibt dann `null`, die Bildschirmhand bleibt leer,
      der Trigger tut nichts. Sie steht zuerst, weil sie die Ausnahme ist, die
      man am schnellsten wieder braucht — ein Werkzeug legt man weg, um etwas
      anderes zu tun. Darunter die Werkzeuge der Welt (`beltLoadout()`, sonst
      `TOOL_IDS`), und ein Tipp wählt **und schließt**: Eine Liste, die offen
      bleibt, verdeckt genau das, worauf man gerade zielen wollte. Was die Welt
      von sich aus hineinlegte, heißt jetzt `defaultScreenTool()` und ist
      bloß die Vorgabe.
  - **Aufgeschnitten wird, was über einem liegt** (`core/cutaway.ts` mit Test,
    Plan E8). Eine Kamera schräg über der Szene hat ein Problem, das eine
    Kamera in der Brille nie hatte: Sie steht **unter** dem Dach. In einem Haus
    ohne Fenster war das Bild von oben die Decke, in einer Stadt waren es die
    Dächer. Also verschwindet vor jedem Bild alles, dessen Ebene **über** der des Rigs
    liegt, und kommt danach wieder (`TopDownCamera.cut` / `.uncut`, gerufen in
    `App.step` — vor den Spiegeln und Portalsichten, die dieselbe Szene ja
    gleich noch einmal zeichnen). In der Brille und _Aus den Augen_ ändert sich
    dadurch nichts.
    - **Die Ebene hängt am Objekt** (`userData.level`) und wird nicht geraten:
      Ein Hochbett steht höher als eine Türklinke und ist trotzdem im selben
      Zimmer. `GridWorld` setzt sie beim Bauen aus dem Grundriss — Kacheln und
      Wände aus ihrer Etage, Bausteine und Einbauten aus ihrer Kachel, Massen
      aus ihrer Unterkante. Die **Decke** ist dabei der Sonderfall, und es ist
      der wichtige: Sie gehört dem Stockwerk **darüber**, denn sie ist dessen
      Boden — sonst sähe man in kein Zimmer hinein, dessen Haus nur eine Etage
      hat. Wer ohne Gitter baut, kann dieselbe Marke von Hand setzen
      (`World.viewLevel`), und mehr braucht es nicht. In Hub, Bauplatz und
      Testwelt steht ohnehin **kein Dach**: Ein Deckel, den man jedes Bild
      wieder wegnimmt, muss gar nicht erst gebaut werden.
    - **Welche Ebene das Rig ist, sagt die Kachel unter den Füßen**
      (`NavGraph.at`, `keyLevel`) — und die Höhe hat ein Wörtchen mitzureden:
      Ein Treppenlauf gehört ganz der unteren Etage (die Kachel darüber ist
      sein Loch), also zählt ab der **halben Stockwerkshöhe** schon die obere
      (`levelAtHeight`). Darüber liegt eine **Hysterese** an derselben Linie:
      Umgeschaltet wird beim Hinauf- wie beim Hinabgehen an derselben Höhe,
      sonst flackerte das ganze Stockwerk, sobald jemand auf der obersten Stufe
      einen halben Schritt zurücktritt (`levelStep`, rein, mit Test). Eine Welt
      ohne Antwort (`World.viewLevel` → `null`) wird gar nicht aufgeschnitten
      und sieht aus wie eh und je.
    - **Und die Kamera hebt sich mit der Ebene**, nicht mit den Füßen: Ihre
      Zielhöhe ist der Boden der Etage (`NavGraph.levelY`), weich nachgezogen
      von derselben Glättung wie die Figur. Mit den Füßen führe das Bild jede
      Treppenstufe einzeln mit.
  - **Und was daneben steht, wird durchsichtig** (`grid/wallGhost.ts` mit Test,
    umgesetzt in `GridWorld`). Das Aufschneiden nimmt weg, was **über** der
    Figur liegt; eine Wand auf derselben Ebene bleibt stehen — und die Kamera
    steht im Süden, also hinter jeder Wand, die südlich von der Figur liegt.
    In _Overcooked_ und den Sims ist das seit jeher dieselbe Antwort: Die Wand
    bleibt, wird aber durchsichtig.
    - **Gerechnet wird eine Strecke, kein Strahl in die Szene.** Jedes Bild
      geht eine Linie von der Kamera zur Mitte des Rigs gegen die Kästen des
      Gitters (`slabs`, Massen eingeschlossen), und was sie schneidet, bekommt
      für dieses eine Bild ein **durchsichtiges Zwillingsmaterial** — gleiche
      Farbe, `transparent`, `opacity 0.25`, `depthWrite false` — und danach
      sein eigenes zurück. Die Zwillinge liegen in einer zweiten Palette und
      werden geteilt; ein Material je Quader wäre bei tausend Kacheln tausend.
      Die Auswahl selbst ist reine Rechnung, ohne three.js und ohne Raycaster,
      damit ein Test in Millisekunden nachrechnet, was man sonst nur in der
      Brille sieht.
    - **Böden zählen nicht.** Ein Blick von schräg oben geht über jede
      Bodenplatte hinweg, aber er **streift** sie — die Strecke zur Figur endet
      ja auf ihr. Wer Böden mitnähme, hätte in jedem Bild den halben Fußboden
      durchsichtig, und darunter ist nichts als Nacht. Also: die Sorte `floor`
      nie, und alles, was flacher als **Kniehöhe** ist, auch nicht
      (`GHOST_KNEE`) — eine Schwelle, eine Rampe, der Rand einer Druckplatte
      verdecken niemanden.
    - **Deshalb bleibt `batchGridGeometry()` in allen verbleibenden Welten
      `false`.** Zusammengefasste Geometrie spart Zeichenaufrufe und nimmt
      einem genau das, worum es hier geht: einen **einzelnen** Quader
      umzuschalten. Wer die Welten wieder zusammenfasst, hat entweder kein
      Ghosting mehr oder eine ganze Halle, die auf einmal durchsichtig wird.
  - **Umgeschaltet wird unter _Menü → Ansicht_** und auf der Startseite; die
    Wörter heißen _Von oben_ und _Aus den Augen_ und stehen an einer Stelle
    (`core/screenView.SCREEN_VIEW_LABELS`). Die **Kennungen** bleiben `2d` und
    `3d`: So stehen sie im Speicher jedes Browsers, der hier schon einmal offen
    war. In der Brille gibt es die Ansicht nicht — man steht darin.
    `World.ownsFlat` bleibt als Haken für eine Welt mit eigener Ansicht von
    oben; gesetzt hatte ihn nur Haunting, bis seine gemalte 2D-Karte mit dem
    1-m-Gitter ging (Paket H) — seither gilt auch dort die Kamera des Kerns.
    _Raster_, _Ebenen_, _Editor_ und _Plan
    zurücksetzen_ standen in diesem Menü, solange es eine eigene, gemalte
    Kachelwelt zu bemalen gab; gebaut wird jetzt im Bauplatz
    (`worlds/editor/WorldEditor.ts`).
- **Hub-Welt**: eine Halle, und von ihr gehen **Gänge** ab, an deren Wänden
  die Tore stehen — vier je Gang, zwei pro Seite und gegeneinander versetzt.
  Ausgelegt wird das aus nichts als der Länge der Weltenliste
  (`src/worlds/hub/hubGrid.ts`, mit Test): eine neue Welt bleibt damit das,
  was sie sein soll — ein Eintrag in der Registry. Der alte 90°-Bogen war für
  vier Welten hübsch und für zehn ein Gedränge.

  **Der Hub steht seit P4 auf dem Kachelgitter** (`GridWorld`, siehe _Welten
  auf dem Kachelgitter_), und das ist die Entscheidung, an der alles Weitere
  hängt: In der Brille und in der Ansicht _Von oben_ steht man im **selben**
  Raum, weil die Kamera ein Blickwinkel ist und keine zweite Welt. Boden,
  Wände und Navigationskarte kommen aus dem Grundriss; was `HubWorld` selbst
  baut, ist die Ausstattung — Himmel, Nebel, der Leuchtring auf dem
  Hallenboden, die Lichtbänder in den Gängen und die beiden Tafeln.

  Drei Sachen sind beim Umzug anders geworden, und alle drei, weil eine Welt
  auf dem Gitter genau vier Richtungen kennt: Es gibt **vier Gänge** (Nord,
  Ost, Süd, West) statt beliebig vieler auf einem Kreis — sind sie voll, werden
  sie **länger** statt mehr; die Tore schauen **zurück zur Halle** statt quer
  eingedreht, sodass man vom Eingang aus alle vier Schilder auf einmal liest;
  und die Halle ist ein **Quadrat**, dessen Rundung nur noch der Leuchtring auf
  dem Boden ist. Kein Dach über den Gängen,
  wie vorher auch: Von oben wäre ein gedeckelter Gang ein schwarzer Balken —
  aufgeschnitten wird zwar seit P7 (`core/cutaway.ts`), aber ein Deckel, den
  man ohnehin jedes Bild wieder wegnimmt, muss gar nicht erst stehen.

  **Auf Metergitter neu ausgelegt** (September 2026): Die Halle misst **elf
  mal elf** Kacheln (`HALL_HALF` = 5), die Gänge sind **drei** Kacheln breit,
  zwischen zwei Toren liegen **zwei** Kacheln, und das erste steht zwei
  Kacheln hinter dem Hallenrand. In Metern ist die Halle damit kleiner
  geworden als die sieben mal sieben von vorher (17,5 m) — und das ist der
  Punkt: Elf Meter sind ein Raum, den man in ein paar Schritten durchquert,
  und der Weg von Tor zu Tor ist keine Wanderung mehr. Was gleich geblieben
  ist, ist die Zusage des Tests: **jedes Tor ist vom Startpunkt aus wirklich
  zu erreichen**, und der Startpunkt liegt nie auf einer Torkachel.

  **Ein Tor ist ein Einbau** (`fixtures/gate.ts`, siehe _Einbauten_) und kein
  Möbel mit einem Zeigerziel daran: Man **geht hindurch**, statt darauf zu
  zeigen. Wer auf seine Kachel tritt und vier Zehntelsekunden stehen bleibt,
  ist drüben. Das Bild dazu — Podest, Ring in der Akzentfarbe, wirbelnde
  Scheibe, Schild (das sich zur Kamera dreht, siehe _Was die Kamera ansieht_) —
  steht in `hub/gate.ts`, weil die Werkzeugseite dasselbe
  Tor zeigt; dort steht es frei und in voller Größe, auf einer Kachel ein
  Sechstel kleiner, damit sein Sockel nicht in die Nachbarkachel ragt. Was
  hinter einem Tor liegt, trägt `HubWorld` beim Bauen aus `WORLDS` ein und
  nicht eine gespeicherte Datei — deshalb ist der Hub auch die eine Gitterwelt,
  an der **nicht** gebaut wird: Ein gespeicherter Hub wäre einer, in dem die
  Tore von letzter Woche stehen.

  **Der Rückweg**: Jede Gitterwelt setzt sich mit **einer Zeile** in `layout()`
  ein Tor `→ Hub` neben ihren Startpunkt — heute sind das der Bauplatz und die
  Testwelt. Neben ihren Startpunkt und nicht darauf: drei Kacheln Abstand,
  denn ein Tor direkt am Spawn ist eines, in das man beim ersten Schritt
  fällt, bevor man die Welt gesehen hat. Was kein Gitter hat, bleibt beim
  Handgelenkmenü, das ohnehin überall dasselbe kann.
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
  **Ohne Brille ist es eine Seite** (`ui/PageMenu.ts`, mit Test): Im
  Browserfenster — Startseite, Desktop, Handy — öffnet der runde Knopf **oben
  links** (`#hud-menu`, auf der Startseite `#landing-menu`) dasselbe Menü als
  DOM, mobile first: auf dem Telefon ein Blatt von unten mit Zeilen, die ein
  Daumen trifft, ab 640 Punkten Breite ein Kasten unter dem Knopf
  (`ui/pageMenu.css`, `z-index` 20, über allem). Es liest **denselben Baum**
  (`MenuEntry`) mit denselben Ikonen (`drawMenuIcon`) und **denselben Weg**
  (`menuNav.ts`): wer im Browser drei Ebenen tief steht und die Brille
  aufsetzt, steht dort auf derselben Seite. Zurück über den Pfeil im Kopf,
  Schließen über ×, Escape oder einen Tipp daneben; Schalter, Punkt,
  Abzeichen und Raster (Kacheln, Bildunterschrift darunter) wie am Arm; auf
  einer Nimm-Seite nimmt ein Tipp, und der Pfeil daneben öffnet die
  Einstellungen. Die kleinen Modelle (`preview`) gibt es dort nicht, die Ikone
  steht dafür. **Gezeichnet wird an Ort und Stelle**: Der Baum wird zweimal
  die Sekunde neu gebaut (Bildraten-Zeile), und `replaceChildren` riss dabei
  den Knopf unter dem Finger aus dem DOM — ein Tipp, der auf dem alten
  anfängt und auf dem neuen endet, ist kein Klick. Also werden frische Zeilen
  mit den stehenden verglichen (`data-key`, `outerHTML`) und nur geänderte
  getauscht; die Blätterstellung bleibt. **Welches Gesicht gilt, entscheidet
  `WristMenus`**: `presenting` (von `App` bei Sitzungsbeginn und -ende
  gesetzt) schickt `toggle`, `openSubmenu`, `isOpen`, `refresh` und
  `setStatus` an die Handgelenke oder an die Seite; beim Aufsetzen geht die
  Seite zu, beim Absetzen der Arm. Keine Welt weiß davon — `ctx.menu` ist
  dieselbe Klasse mit denselben Aufrufen. Öffnet ein Eintrag die Tastatur
  (`App.openKeys`), geht die Seite zu, weil die Tastatur ein Panel in der
  Szene ist und sonst dahinter läge. Die Kopfzeile im Web (`#hud`) ist damit
  **oben links der Menü-Knopf, oben rechts** Weltname, Verbindung und VR; auf
  einem schmalen Telefon fällt der Weltname weg, bevor ein Knopf es tut. Unten
  rechts steht der zweite runde Knopf, der **Werkzeug-Knopf** (`#hud-tool`) —
  er öffnet eine eigene Seite mit einem eigenen Baum und nicht einen Ast dieses
  Menüs, denn er beantwortet eine Frage, die man mitten im Zielen stellt
  (_Von oben_, „Die Hand am Schirm").
  Aufbau: **Welten** (Hub, Bauplatz, Testwelt, Spiel Haunting),
  **Werkzeuge**
  (das ganze Regal direkt in die Hand, und die Einstellungen jedes Werkzeugs
  dahinter), **Magischer Beutel** (Raster mit Companion Cube, Kugel, Domino,
  Pyramide, Quader, Planke, Zylinder, Kegel, Rampe, Stab, Murmel, Sektflasche
  und dem **Würfelsatz** W4, W6, W8, W12, W20 — siehe _Was aus dem Beutel
  kommt_),
  **NPC** (wer hier herumläuft — Haut und Hirn getrennt, dazu Spawnpunkte und
  Brutkäfige; siehe _Wer hier herumläuft_),
  **Bewegung** (Haltung, Augenhöhe, Sprint und Ducken), **Aussehen** (drei
  Zeilen: Kopf, Hut, Körper — siehe _Wie man aussieht_), **Grafik** (Schatten,
  Einfach oder Comic, dazu die Gitterlinien — siehe _Wie schön es aussieht_),
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
  die Plätze am Gürtel, die Griffe an einem Kletterfelsen, das Lenkrad eines
  Karts. Eine Spülmaschine
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
  (in einer Schwerelos-Zone) bleibt liegen, und eines, das diese Hand ohnehin
  beansprucht
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
    die Hand zeichnet: misst man sie ein wie eine Pistole, landet das Ergebnis
    in der **Grundhaltung** dieser Hand und nicht im Werkzeug-Speicher
    (`tools/HandTool.ts`) — auf der Werkzeugseite schreibt der Regler für
    `hand-box` deshalb in `saveIdleHandPose`. Sie ersetzt das alte
    Justier-Werkzeug und den Tisch mit der Geisterhand: ein Weg statt dreier,
    und der, den man ohnehin kennt.
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

  **Und wer versetzt wird, wird mit Anhebung versetzt** (`PlayerRig.placeAt`,
  mit Test). Das Absetzen rechnete lange nur das Ducken heraus und nicht die
  Sitz-Anhebung: Ein sitzender Spieler landete bei jedem `placeAt` und
  `placeFeetAt` um seine ganze Anhebung **unter** dem Punkt — nach dem
  Schutzschrank, beim Rundenstart, und der Rettungsknopf „Zurück auf den
  Boden" setzte ihn genauso tief wieder hin. Am Bildschirm und im Stehen war
  davon nichts zu sehen, denn dort ist die Anhebung null; der Befund hieß
  deshalb „in der Brille buggt man wieder im Boden" und kam nie vom Desktop.

  **Wie hoch die beiden sind, weiß auch niemand von allein.** Der Ausgleich
  hing lange an einer einzigen getippten Zahl — 1,65 m Augenhöhe im Stehen,
  für alle. Wer kleiner ist, sitzt danach zu hoch; wer größer ist, zu tief,
  und man merkt es nicht am Horizont, sondern an der eigenen Hand: ein
  Knopf auf Ellbogenhöhe steht dann irgendwo anders, weil der Boden
  unter dem Spieler um die Differenz falsch liegt. Also
  sind es **zwei eigene Zahlen**, stehend und sitzend, in Zentimetern und
  beide **messbar**: unter _Menü → Bewegung → Augenhöhe_ hinstellen bzw.
  hinsetzen, _Jetzt messen_ drücken, und die
  Brille schreibt ihre eigene Zahl hinein. Die Anhebung ist danach die
  Differenz der beiden und nicht mehr der Abstand zu einer _gerade gemessenen_
  Kopfhöhe — Vorbeugen im Sessel hob vorher die halbe Welt mit an
  (`core/posture.ts`, mit Test).

  **Und in der Küche stimmt die gemessene Zahl nicht mehr.** Die Küche ist
  **mit Absicht zu klein**: Ihre Möbel sind halbiert
  (`core/kitchenFit.KITCHEN_SCALE`), die Arbeitsplatten liegen auf einem halben
  Meter, und die Kochfigur dazwischen ist 1,60 m hoch mit Augen auf 0,91 m
  (`core/chefFit.ts`) — eine Küche wie bei _Overcooked_ und kein Wohnhaus. Wer
  dort mit seinen echten 1,65 m steht, hat alle Zahlen auf seiner Seite und
  trotzdem den falschen Blick: Er schaut steil von oben in eine Puppenstube,
  der Tresen liegt auf Kniehöhe, und ein Topf auf dem Herd ist ein Punkt weit
  unten. Also wird in der Küche nicht die Küche größer, sondern der **Spieler
  kleiner** — auf eine dritte, eigene Augenhöhe, ab Werk **115 cm**,
  einstellbar unter _Menü → Bewegung → Augenhöhe → In der Küche_ (100 bis
  180 cm, +5 pro Druck). Diese Zahl ist dreimal gewandert, und der Weg lohnt
  sich zu lesen: Hergeleitet standen dort **140**, weil es zwischen den beiden
  liegt, die es schon gibt (aus 120 cm schaut man der Arbeitsplatte ins
  Gesicht, aus 160 steht man wieder darüber). Im Headset fühlten sich 140 zu
  niedrig an, also **150**. Und dann hat jemand mit aufgesetzter Brille
  gekocht, am Regler gedreht, bis es stimmte, und **115** gemerkt. Die
  Richtung hat sich damit umgekehrt, und das ist kein Widerspruch, sondern der
  Unterschied zwischen *hinstellen* und *arbeiten*: Aus 150 cm sieht die Küche
  richtig aus, aus 115 cm **greift** sie sich richtig — die Platte liegt auf
  Bauchhöhe wie in einer echten Küche statt unter einem. Wer schon einmal am
  Regler gedreht hat, behält seine eigene Zahl: Der Auslieferungswert ersetzt
  eine **fehlende** und überschreibt keine gespeicherte
  (`core/posture.clampEyes`).

  **Ein Verhältnis und keine Differenz**, und daran hängt mehr, als es klingt.
  Eingestellt wird eine absolute Zahl — das ist die Frage, die man sich stellt
  („aus welcher Höhe will ich auf die Platte schauen?") —, umgesetzt wird sie
  als Faktor auf die eigene gemessene Stehhöhe: 115/165 für den
  voreingestellten Spieler, 115/195 für einen sehr großen. Beide landen damit
  auf **derselben** Höhe, was eine feste Absenkung nicht kann; sie hielte den
  Abstand und verfehlte einen von beiden. Und vor allem bleibt die Null die
  Null: Gestaucht wird der **Abstand zum Boden**, also bleibt der Boden der
  Boden. Wer sich in der Küche bückt, um etwas aufzuheben, kommt anteilig
  tiefer und nie darunter — eine feste Absenkung um 25 cm hätte den Kopf bei
  20 cm echter Augenhöhe fünf Zentimeter **unter** den Estrich gezogen, und
  die Hände lange davor (`core/posture.kitchenEyeScale`, mit Test).

  **Nur in der Brille, nur in der Küche.** Am Bildschirm — von oben wie aus den
  Augen — setzt das Spiel die Kamera selbst, dort gibt es keine echte
  Augenhöhe, die danebenliegen könnte; die Ansicht von oben ändert sich um
  keinen Millimeter. Und „Küche" ist genau ein Rechteck, `layout.KITCHEN` mit
  einem Meter Vorlauf nach außen, damit das Absacken vor der Türöffnung
  passiert und nicht mitten in ihr (`kitchenPlan.inKitchen`,
  `zones/kitchen.ts` → `fitEyes`). Gokart, Schießstand, Kletterwand, Haunting
  und Portale sehen nie etwas anderes als „unverändert"; beim Verlassen der
  Welt räumt `PlayerRig.standUp` zusätzlich auf. Im Rig ist es die dritte
  Verschiebung neben Ducken und Sitz-Anhebung und wird genauso geführt: Das
  Gestell sinkt, die **Füße bleiben stehen** (`PlayerRig.eyeScale`,
  `getFloorY`, mit Test) — und wer mittendrin versetzt wird, landet mit den
  Füßen auf dem Punkt und nicht einen Viertelmeter darunter.

  **Der Kopf bewegt sich mit — in allen drei Achsen.** Aus der Brille kam der
  Befund „wenn ich meinen Kopf bewege, scheint die Kameraposition starr zu
  bleiben; sie soll sich mitbewegen, wenn ich mich nach links, rechts oder
  vorn beuge". Die Drehung kam an, die Verschiebung nicht: 3DoF statt 6DoF.
  Das ist in der Brille nicht bloß unbequem — das Innenohr meldet eine
  Bewegung, die das Auge nicht sieht, und davon wird einem schlecht.

  Am Rig lag es nicht. Die Brille misst den Kopf, `three` setzt die Kamera im
  Rig auf genau diesen Punkt (`local-floor`, `renderer.xr.updateCamera`), und
  das Rig reicht ihn unangetastet durch. Auch die Küchen-Augenhöhe von eben
  ist unschuldig: `eyeScale` staucht den **Abstand zum Boden** und rechnet an
  `position.y` und an nichts sonst (`playerRig.test.ts`, „Der Kopfversatz der
  Brille").

  Es lag eine Etage tiefer, in `PhysicsLocomotion`. Die Kapsel folgt dem Kopf
  — wer im Zimmer einen Schritt tut, soll im Spiel nicht durch die Wand gehen
  —, und was ihr dabei **verwehrt** blieb, wurde bisher vom Rig abgezogen:
  `rig += applied − drift`. Steht die Kapsel an einem Möbel, gibt der
  Character-Controller nichts heraus, und die Rechnung schob das Rig um genau
  den Betrag zurück, den der Kopf sich gerade bewegt hatte. Der Kopf stand
  still. In der Küche ist das der Normalfall und nicht der Ausnahmefall: Man
  arbeitet dort an einem Tresen, und die Trefferkästen der Möbel reichen bis
  auf 1,40 m (`zones/kitchen.BLOCK_HEIGHT`, damit niemand auf die Küchenzeile
  springt) — also genau bis in die Augenhöhe, auf die die Küche den Spieler
  stellt. Jedes Beugen über den Herd lief gegen eine unsichtbare Wand.
  Gemessen: 40 cm Beugen kamen als 14 cm an; direkt am Möbel als null.

  **Zurückgeschoben wird jetzt nur der Schritt und nicht der Kopf.** Zwei
  Stücke. Die Kapsel wird nicht mehr um die Differenz zweier Kopfpunkte
  weitergeschoben, sondern auf den Kopf **zugesteuert** — gefragt ist der
  Rückstand (`Kopf − Kapsel`) und nicht der Schritt des letzten Bildes; ein
  Zielpunkt holt jeden Rückstand von selbst wieder ein, eine Differenz
  vergisst ihn. Und was die Welt weniger hergibt, als gefragt war, trifft
  **Schritt und Kopf anteilig** (`shareOf`): Vorher ging der ganze Fehlbetrag
  auf den Schritt und damit aufs Rig; jetzt hält eine Wand den Stock genauso
  auf wie vorher — aber sie nimmt dem Spieler nicht mehr seine eigenen Augen.

  **Beugen ist kein Gehen.** Der Kopf darf dem Körper eine halbe Armlänge
  vorauseilen (`LEAN_LIMIT`, 45 cm); darüber hinaus wird das Rig an den Körper
  zurückgeholt. Wer im Zimmer einfach weiterläuft, wo im Spiel eine Wand
  steht, kommt also 45 cm weit und dann nicht mehr — der Blick hängt nie
  beliebig weit im Nichts.

  Am Bildschirm ändert sich dadurch nichts: Dort sitzt die Kamera über dem
  Ursprung des Rigs, der Rückstand ist null, und die Rechnung ist Zeile für
  Zeile dieselbe wie vorher (`physics/playerFooting.test.ts` läuft unverändert
  durch). Gokart und Haunting rühren sie ohnehin nicht an — der Kart friert
  das Rig ein und setzt den Kopf selbst auf den Sitz, die Station lässt die
  2D-Runde laufen (`KernelLocomotion`). Geprüft wird beides mit echtem Rapier
  (`physics/playerLean.test.ts`): über den Tresen, zwischen zwei Zeilen, das
  Wiedereinholen beim Aufrichten, die Grenze an der Wand, der Stock an der
  Wand und der freie Raum.

  **Und die Küche fragt nach dem Kopf, nicht nach dem Ursprung.** In der
  Brille ist `rig.position` die Mitte des Spielraums und nicht der Spieler.
  Die Zone rechnete ihren Standpunkt daraus (`KitchenZone.aim`) — wer einen
  Meter neben der Mitte stand, arbeitete an der Station einen Meter weiter,
  zielte mit dem Löscher daneben, und die Stauchung (`fitEyes`) entschied an
  einem Punkt, der sich beim Beugen gar nicht mitbewegt. Jetzt steht dort der
  Kopf über dem Fußboden des Rigs, dieselbe Rechnung wie in
  `PlayerRig.placeFeetAt`; am Bildschirm ändert sie nichts.

- **Die Testwelt** (`src/worlds/test/`): der Prüfstand — **zehn Zonen auf einem
  Gelände**, in einer Minute zu Fuß abzulaufen.

  Bis September 2026 gab es siebzehn Welten, und jede prüfte eine Sache: eine
  für die Portale, eine für den Schießstand, eine fürs Klettern, eine für die
  Wegsuche. Das war bequem zu bauen und unmöglich zu pflegen — wer am Kern
  etwas änderte, lud siebzehn Welten hintereinander und hatte danach den
  Verdacht, die entscheidende vergessen zu haben. Jetzt gibt es **eine**, und
  was von den anderen bleibt, sind ihre Module: Kartphysik, Trefferwertung,
  Kletterhalt, Effektzahlen, Türmathematik. Wer eine gelöschte Welt nachlesen
  will, holt sie sich mit `git show 3678f32:src/worlds/<welt>/<Datei>.ts`.

  **Norden ist oben und die Mitte ist der Startplatz.** Die Himmelsrichtung ist
  die Wegbeschreibung — wer eine Zone sucht, sucht eine Richtung:

  - **Start und Tor** (Mitte): Startplatz, ein Schild, der **Kleiderschrank**
    und drei Kacheln weiter das Tor zurück in den Hub.
  - **Effektquellen** (Norden): vier Düsen nebeneinander — Rauch, Feuer,
    Funken, Wasser —, je ein Knopf eine Kachel davor. Dieselben Zahlen wie im
    alten Effektlabor (`effects/effectKinds.ts`), importiert und nicht
    abgeschrieben. Vier Knöpfe nebeneinander statt einer mit Auswahl: Im Labor
    stand man davor und sah hin, hier läuft man vorbei. Jede Düse trägt die
    Farbe ihres Effekts, damit man von oben sieht, welche die Wasserfontäne
    ist.
  - **Interaktionen** (Nordwesten): eine Wand mit drei Türen in drei
    Betriebsarten (Schiebetür, Flügeltür, Drucktür), davor je ein Auslöser —
    Knopf, Hebel, Druckplatte —, daneben zwei Kisten zum Draufschieben, dazu
    eine Lampe mit Kippschalter. Dahinter liegt ein **Hof**, und das ist der
    ganze Punkt: Eine Tür, an der man vorbeigehen kann, ist ein Möbelstück.
    Weil hier wirklich getrennt wird, lässt es sich auch prüfen — mit
    geschlossenen Türen kommt vom Startplatz aus niemand hinter die Wand.
  - **Treppe und Podest** (Nordosten): fünf mal fünf Kacheln auf Ebene 1, eine
    Brüstung ringsum, vier Säulen darunter und eine **vier Kacheln lange**
    Treppe hinauf. Oben ein Hebel, der unten eine Lampe schaltet — der Beweis,
    dass ein `trigger` keine Etagengrenze kennt. Auf Säulen und nicht auf einer
    Wand, weil man von oben sonst nur sähe, dass etwas erscheint, und nie, dass
    darunter etwas war.
  - **Navigation** (Westen): ein enger Gang mit einer Kiste darin, eine Tür an
    seinem Ende, ein Stachelfeld und ein roter Knopf, der einen NPC von A nach
    B schickt. Der Gang ist ein **Umweg und keine Sackgasse**: Man kommt auch
    außen herum, und genau das zeigt er — eine Kiste macht ihre Kachel _teuer_
    und nicht _zu_. Das Stachelfeld ist eine Kachelnotiz und kein Objekt
    (`TileFacts.hazard`), also weiß ein NPC davon, bevor er hineinläuft.
  - **Schießstand** (Osten), **ohne Dach**: eine Schießlinie, Scheiben auf 5,
    10 und 20 m, zwei Stahlplatten und ein Kugelfang als Masse dahinter. Jeder
    Treffer zählt (`range/scoring.ts`), die Scheibe nach ihrem Ring. Fünf bis
    zwanzig Meter und nicht zehn bis hundert: Der alte Stand war 125 m tief,
    und das wäre hier der ganze Osten samt halber Kartbahn. Die Bank ist das,
    was sie in Wirklichkeit ist — eine **Küchenzeile**, derselbe geprüfte
    Baustein auf derselben Arbeitshöhe.
  - **Gokart** (Süden): eine Rundstrecke von 35 × 25 m aus Streckenteilen auf
    dem Gitter und eine Boxengasse mit zwei Karts darin. **Eingestiegen wird
    mit `A`** — das Kart meldet sich als `Usable` mit dem Hinweis
    _Einsteigen_ —, ausgestiegen mit `A` halten. Ausführlich unter _Die
    Kartzone_.
  - **Klettern** (Südosten): eine Wand mit Griffen aus drei Materialien und
    zwei Sprungkissen davor. Ausführlich unter _Klettern_.
  - **Zu jeder Zone springt man auch** (_Menü → Zu einer Zone_,
    `TestWorld.jumpMenu`): neun Ziele, eines je Zone, und zwar **dieselben
    Kacheln**, an denen der Grundrisstest misst, ob eine Zone überhaupt
    erreichbar ist (`layout.ZONE_TILES`). Das Gelände misst 64 × 80 m; wer nur
    die Küche ansehen will, läuft sonst eine knappe Minute an drei Zonen
    vorbei, die er gerade nicht meint — und dieser Platz ist ein Prüfstand und
    keine Reise. Die Höhe kommt aus dem Graphen (`NavGraph.levelY`): Das Podest
    liegt auf Ebene 1, und wer dorthin auf y = 0 spränge, stünde unter seinem
    eigenen Deck.
  - **Und auf eine einzelne Kachel setzt einen die Adresse** (`spawnAt.ts`):
    `/?at=21,-24#test` fängt auf genau dieser Kachel des Geländes an,
    `/?at=18,-16,1#test` eine Ebene höher auf dem Deck des Podests, und
    `/?at=kitchen#test` nimmt denselben Namen wie das Menü. Gerechnet wird in
    **Kacheln des Geländes** — dieselben Zahlen, die in `layout.ts` stehen und
    die ein Test ausgibt, wenn er über eine Kachel stolpert: Wer „Kachel 21,-24
    hat keinen Anschluss" liest, tippt sie in die Adresse und steht daneben.
    Sie gilt für die ganze Sitzung, also auch fürs Wiedereinsetzen nach einem
    Sturz. Warum eine Adresse und kein Zifferblock im Spiel: Das hier ist kein
    Spielzug, sondern das Werkzeug dessen, der die Welt **prüft** — er kommt
    von außen, mit einer Zahl in der Hand, und eine Adresse kann man
    aufschreiben, verschicken und in ein Testskript legen. Alles, was nicht
    eindeutig ist (ein Wort statt einer Zahl, ein unbekannter Name, eine halbe
    Koordinate), gibt den gewöhnlichen Startplatz: Geraten wird nicht, sonst
    sucht man im Gelände, warum man woanders steht.
  - **Küche** (ganz im Norden, hinter dem Podest): vierundzwanzig mal elf
    Kacheln mit den Möbeln aus dem Katalog (`core/kitchenFit.ts`, siehe
    _Modelle im Repository_), und zwar in **zwei Hälften**. Unter allem liegt
    ein **karierter Boden** (`zones/kitchenFloor.ts`): cremeweiß und
    schiefergrau im Wechsel, **ein halber Meter je Feld**, also zwei mal zwei
    Felder auf jeder Kachel des Meterrasters — eine Fuge, die schräg unter der
    Küchenzeile durchliefe, wäre schlimmer als gar keine. Er ist der
    Unterschied zwischen „hier stehen Möbel auf dem Gelände" und „hier ist ein
    Raum", und er ist bewusst **gegen das Schachbrett draußen** gewählt
    (`layout.HORIZON_COLORS`): Das ist grau auf weiß mit einem Meter je Feld,
    also zwei helle kühle Töne — drinnen sind die Felder halb so groß, die Töne
    wärmer und der Sprung zwischen ihnen mehr als doppelt so groß. Damit liest
    sich die Kante zwischen beiden als Schwelle und nicht als Versehen; ein
    Jest-Test rechnet Feldgröße, Kontrast und Ausrichtung nach. Gezeichnet wird
    das Muster vom selben Schachbrettzeichner wie der Boden bis zum Horizont
    (`shared/environment.checkerTexture`, samt Farbraum, Mipmaps und
    `anisotropy` gegen das Flimmern aus der Aufsicht); die Fliesen sind ein
    **eigenes Material** der Zone und keine neunte Sorte im Gitter — eine Sorte
    dort trägt einen Ton und kein Muster, und wie oft sich das Muster
    wiederholt, weiß nur, wer die Größe der Fläche kennt. Der Steinquader aus
    dem Grundriss bleibt darunter liegen: Er ist der Körper, auf dem gelaufen
    wird, und der Belag liegt zwei Millimeter darüber, damit die beiden nicht
    um jeden Bildpunkt streiten. Im Westen die
    Küche selbst — Zeile, zwei Herde, **Spülbecken und Abtropfbrett** und die
    Tellerausgabe an der Wand, vier
    Zutatenausgaben an der Westwand, eine Insel aus Schneidebrett und
    Mülleimer, **zwei Bandbahnen** quer durch den Raum — vier Förderbänder
    (blau) und vier Zugbänder (orange), die sich von selbst holen, was auf der
    Kachel dahinter liegt —, vorn die Ausgabetheke
    mit den Wärmeschirmen einen Meter darüber, und südlich davon der
    **Gastraum**: drei Gästetische und die Geschirrrückgabe (die Türkacheln
    daneben bleiben frei, sonst stünde ein Tisch im Eingang). Dazu zwei Möbel,
    die nicht kochen, sondern die Küche selbst verwalten: der
    **Computer-Tisch** neben der Ankunft, der den **Möbelkatalog** aufmacht,
    und der **Kopierer** in der freien Mitte, der von einem Möbel ein zweites
    hergibt. Im Osten der
    **Schauraum**: jedes der achtzehn Möbel noch einmal, frei stehend und mit
    einer Tafel daneben, auf der sein Name und sein Maß stehen — bis auf die
    beiden Hälften der Spüle, die dort **nebeneinander** stehen: Ihre
    Schnittflächen sind offen, und auf Lücke gestellt sähe man in zwei
    aufgesägte Schränke. In einer Zeile
    aus acht Schränken sieht man ein einzelnes Möbel nicht; der Katalog ist
    damit ein Rundgang statt einer Liste. **Angefasst wird mit `A`**, und ein
    roter Knopf neben dem Eingang schaltet den **Baumodus** ein und wieder aus,
    in dem sich jedes Möbel samt allem, was darauf steht, versetzen lässt — das
    Einschalten räumt die Küche dabei ab, wie `B`/`Y` es täte (beides unter
    _Anfassen in der Küche_). Sie ist
    der Grund, warum das Gelände nach Norden gewachsen ist (`FIELD` ist jetzt
    64 × 80 m): Die Möbel sind groß — eine Spüle misst in der Quelle 4 × 2,1 m,
im Spiel also zwei Kacheln —, und in eine
    Lücke zwischen zwei bestehenden Zonen passt davon keine Reihe. Hinter dem
    Podest und nicht neben dem Schießstand, weil dessen Bahnen quer über den
    ganzen Osten bis zum Kugelfang laufen und eine Küche in der Schusslinie
    eine Küche mit Löchern ist. Ihr Schild ist zugleich die Probe auf den
    **Aushang**: Es trägt Überschrift, Aufzählung und Zitat, und wer es
    benutzt, schlägt es im Menü auf. An der **Nordwand** hängt dazu die
    **große Tafel** (`zones/kitchenNotice.ts`): 2,4 × 1,8 m, Markdown nicht im
    Menü, sondern gesetzt an der Wand — Überschriften, Aufzählung, Trennlinie,
    Zitat, Code. Sie dreht sich **nicht** mit (siehe _Was die Kamera ansieht_):
    Ein Text an einer Wand ist ein Gemälde. Die Nordwand ist dafür die
    richtige, weil die Kamera von oben aus dem Süden schaut — an der Westwand
    hinge derselbe Aushang für diesen Blick hochkant.
  - **Portaltafeln**: drei helle Tafeln — am Startplatz, auf dem Podest und an
    der Westwand der Navigation. Drei und nicht eine, weil ein Portal erst zu
    zweit etwas ist; die auf dem Podest ist der kürzeste Weg, die Treppe zu
    übergehen, und genau das soll man einmal ausprobiert haben.

  **Kein Dach, nirgends.** Von oben wäre jedes davon ein schwarzer Balken über
  genau dem, was man sehen will — und was die Figur verdeckt, macht ohnehin das
  Ghosting durchsichtig (siehe _Von oben_).

  **Gebaut werden darf hier** (`editable()` ist wahr), und das ist der Sinn des
  Metergitters: Wer eine feine Welt bauen will, braucht einen Ort, an dem er es
  probiert — mit Karte und Palette am Gürtel, mit Speicher und mit einer Datei
  zum Mitnehmen (_Welt sichern_, siehe _Speichern, exportieren, importieren_).
  Weil ein gespeicherter Stand den **ganzen** Grundriss ersetzt, steht alles,
  was auch danach noch gelten muss, in `planLoaded()`: das Tor zum Hub und jeder
  Einbau, den eine Zone braucht.

  **Und `planLoaded` läuft zweimal** — einmal beim Bauen und einmal nach dem
  Laden —, deshalb sind die Einbauten vom Rest des Grundrisses getrennt
  (`fitTest(plan)` neben `testPlan()`). Das geht nur mit Einbauten: Sie haben
  eine **Kennung**, und `putFixture` ersetzt nach Kennung. Ein Baustein hat
  keine; ein zweites Mal gesetzt stünde er zweimal da, und nach dem dritten
  Besuch wären es drei Bänke auf einer Kachel.

  **Die Zonen bekommen einen Vertrag und nicht diese Welt** (`zones/zone.ts`,
  `ZoneHost`). Der naheliegende Weg wäre gewesen, ihnen die `TestWorld` selbst
  in die Hand zu geben — und damit hätte jede Zone Zugriff auf den Editor, die
  Portale, das Menü und die Physik-Einstellungen. Nach dem dritten Umbau hätte
  eine davon etwas daran verstellt, und niemand wüsste welche. Sie dürfen
  bauen, anmelden und melden, und sonst nichts; dieselbe Entscheidung wie bei
  den Einbauten und aus demselben Grund. Sechs von zehn haben überhaupt Leben
  darin (Interaktionen, Navigation, Schießstand, Kart, Klettern), die anderen
  vier sind ein **Stempel** auf dem Grundriss und fertig
  (`stamp<Name>(plan)`).

  **Wo eine Zone liegt, steht in `layout.ts`** und nicht im Grundriss, und das
  ist kein Stilfehler, sondern ein Absturz weniger: Der Grundriss ruft die
  Zonen auf, und jede Zone will wissen, wo ihr Rechteck liegt — stünden die
  Rechtecke im Grundriss, importierte jede Zone ihn und er jede Zone, und beim
  ersten Import wäre die Hälfte der Konstanten `undefined`.

  **Geprüft, bevor jemand hineinläuft** (`testPlan.test.ts`, ohne three.js):
  dass jede Zone vom Startplatz aus erreichbar ist, dass die Treppe wirklich
  auf dem Podest endet, dass hinter die Türwand nur kommt, wer eine Tür
  aufmacht, und dass die ganze Welt eine Runde durch das Weltformat unverändert
  übersteht. Eine Ecke, in die man nicht kommt, merkt man sonst erst nach dem
  Laden, nach dem Aufsetzen, nach dem Hinlaufen.
- **Eigener Körper**: Rumpf, Kopf und die beiden Handkugeln gibt es, sie werden
  aber nur in Portalsichten und Spiegeln gezeichnet — und, solange die Sicht mit
  einer Drohne draußen ist, auch für den eigenen Blick zurück. Der
  zurückgelassene Körper wird
  dabei über den **ganzen Rahmen** festgehalten, in dem er stand
  (`PlayerAvatar.leaveBehind`), nicht über eine Kopfpose im mitfliegenden
  Rig-Raum: Die Figur rechnet mit dem Boden auf y = 0, und ein Rig, das zehn
  Meter steigt und sich dreht, zog sie jedes Mal lang. Direkt sieht man nur die eigenen Hände — und sich
  selbst, wenn man durch ein Portal schaut. Die anderen Spieler bekommen
  denselben Körper, samt Namensschild und der Waffe in ihrer Hand.
- **Einmessen: was vom Eingaberaum geblieben ist.** Es gab dafür eine eigene
  Welt — eine Kammer, deren einziger Zweck es war zu zeigen, was die Hände tun:
  zwei Controller-Modelle auf Augenhöhe, je Hand eine Tafel mit der Lage des
  Geräts in zwei Räumen, ein Achsenkreuz, eine Aufnahme der Handbeschleunigung,
  eine Bank mit Vibrationsmustern, und hinter der Rückwand ein Schießgang mit
  **zwei Justierständen** (der eine maß, wohin ein Werkzeug zeigt, der andere,
  wie die Faust darum liegt) und einem **Poseraum**, in dem ein Schwebekasten
  losgelassene Werkzeuge in der Luft hielt, damit man die blanke Hand daran
  legen konnte. Mit dem Umbau vom September 2026 ist sie weg.

  Was sie hervorgebracht hat, steht weiter da, und deshalb lohnt der Absatz:
  die **Rechnung** hinter beiden Ständen (`tune/handGrip.ts`, `toolPose.ts`),
  die **Feinjustage** mit ihrer Untersetzung (`tune/fineTune.ts`), die
  **Vibrationsmuster** (`tune/haptics.ts`), die **Aufnahme** der
  Beschleunigung (`tune/accelRecord.ts`), das **Controller-Modell** als
  Rückfall (`tune/InputModel.ts`), die **geteilte Handhaltung** über die
  Leitung (`tune/handShare.ts`) und jede Zahl, die damals gemessen wurde —
  `IDLE_HAND_POSE`, `GRIP_TO_RAY`, die drei Kurzcodes an Stoppuhr, Hammer und
  Drohne (siehe _Eingemessene Griffe_).

  **Justiert wird seither auf der Werkzeugseite** (`tools.html`, Knopf
  _Bearbeiten_, siehe _Bearbeiten auf der Werkzeugseite_): dieselben Speicher,
  dieselben Kurzcodes, ein Daumen statt zweier Hände. Was dabei fehlt, ist die
  Hälfte, für die es die Welt gab — eine Messung **am Gerät**, mit der eigenen
  Hand daran. Wer sie wiederhaben will, baut sie als Zone der Testwelt neu; die
  Rechnungen liegen alle bereit, und was an Aufbau nötig war, steht in
  `git show 3678f32:src/worlds/tune/`.

- **Haunting / Orbital**: eine Raumstation für eine Quest und zwei Telefone.
  Der Außentechniker sucht Gegenstände, löst Reparaturaufträge und kann nach
  drei Treffern verlieren. Die drei Nicht-VR-Rollen zeichnen dieselbe Karte
  wie die 2D-Welt, jede mit eigenen Schichten (`views/`): das **Archiv** die
  ganze Station mit Fracht und einer Raumakte je Zimmer — wohin ein Teil
  gehört, sieht es erst, wenn der Techniker es trägt —, die **Schalttafel**
  die Station ohne Wesen mit schaltbaren Türen und Lampen, dazu ihre
  Schalterliste als Blatt darüber, der **Späher** zwei Punkte alle
  dreieinhalb Sekunden. Schallköder gibt es nicht mehr. Der Zuschauer
  (3D-Puppenhaus) schlüpft auf Wunsch in jede dieser Ansichten, lesend;
  das Monster bleibt daneben. Wählbar sind
  6/8/10/12 größere Räume mit Gängen und drei Entitäten mit eigener Wahrnehmung. Sichere Tests bleiben bei ausgeschaltetem Licht gegnerfrei;
  vier Lehrzimmer liegen abseits der Missionskarte. Ausführlich:
  _Haunting / Orbital: Raumstation für eine Quest und zwei Mobilgeräte_.
- **Klettern** (`worlds/climb/`, Zone der Testwelt in `test/zones/climb.ts`):
  die Stelle, an der der **Greifknopf etwas anderes tut**. Überall sonst nimmt
  Greifen ein Ding in die Hand; hier hängt es den ganzen Spieler an die Wand.
  Von Griff zu Griff geführt wird dabei niemand — man fasst hin, wo man will,
  und die Welt rechnet aus, wie gut das war. Das Vorbild ist die Haltemechanik
  aus _Cairn_.

  **Die Wand steht auf dem Gitter, die Griffe nicht**, und die Grenze ist
  Absicht: Eine Wand ist Hülle und gehört auf Kachelkanten — hier eine **Masse**
  von acht Metern über eine Kachelreihe, denn als Kachelwände wären das zehn
  Stück von je 2,80 m und darüber Luft. Ein **Griff** dagegen ist kein
  Mobiliar, sondern das Spiel selbst, und seine Stelle auf zehn Zentimeter
  genau ist genau das, was ihn schwer oder leicht macht; auf eine Kachelkante
  gezogen wäre er neu einzumessen, für nichts. Die Wandreihe liegt dabei
  **außerhalb** der begehbaren Zone: Eine acht Meter hohe Masse auf einer
  begehbaren Kachel wäre ein Weg im Graphen, den man in Wirklichkeit nicht
  gehen kann — ein NPC liefe hinein und stünde.

  **Wie das Klettern selbst funktioniert.** Jede greifende Hand bekommt einen
  **Anker** in der Welt, und der Körper wird jedes Bild so weit verschoben,
  dass die Hände wieder dort sind. Zieht man die Hand herunter, geht der Körper
  hinauf; mehr ist Klettern nicht. Gefahren wird das über den **Flugmodus** der
  Fortbewegung (`PhysicsLocomotion.setFlight`, dieselbe Tür, durch die auch der
  Supermanhandschuh geht) und nicht über die Position des Rigs — dadurch
  bleiben Wände Wände, man klettert nicht in die Welt hinein, und beim
  Loslassen wird aus dem letzten Zug ein **Schwung** (gedeckelt, damit aus einem
  Klimmzug kein Raketenstart wird). Solange eine Hand hängt, ist der **linke
  Stick abgeschaltet** — wer hängt, geht nicht und springt nicht. Der rechte
  dreht weiter, denn wer sich an einer Wand hochzieht, will über die Schulter
  schauen wie überall sonst; danach wird jeder **Anker neu auf seinen Griff
  gesetzt**, sonst hinge die Hand einen halben Meter neben ihm in der Luft. Das
  ist auch die ehrlichere Bewegung — an einer echten Wand dreht sich der Körper
  um die Hände und nicht die Hände um den Körper.

  Damit der Greifknopf sich nicht mit dem normalen Greifen schlägt, klettert
  nur eine Hand, die wirklich **leer** ist (`PortalWorld.handFree`): Wer eine
  Kiste trägt, trägt eine Kiste. Und die Zone hört nur zu, **solange man vor
  ihr steht** (`NEAR`, vier Meter um ihr Rechteck): Ein Greifknopf, der quer
  über das ganze Gelände nach Griffen sucht, nähme der halben Welt ihr Greifen.

  **Was in den Halt eingeht** (`climb/gripQuality.ts`, mit Test — reine Zahlen,
  kein three.js). Heraus kommt eine Zahl je Hand und daraus der **Halt**
  (`support`):

  - **Material** (`climb/holds.ts`): _Sprosse_ (perfekt, Grundwert 1),
    _rauer Fels_ (0,44) und _glatter, glänzender Fels_ (0,24). Dazu, was jedes
    an Ausdauer frisst: 0, 1 und 1,9.
  - **Form**, aber nur so weit die Hand wirklich daraufsitzt (`seat`): Sprosse
    und Holm +0,36, Henkel +0,34, Spalte +0,30, Kante +0,26, Ballen +0,06,
    blanke Fläche nichts. Eine um einen halben Handteller verfehlte Kante ist
    keine Kante, sondern eine Wand — und genau das ist „wer keine gute Kante
    erwischt". Leisten, Sprossen, Risse und Holme haben dafür eine **Achse**:
    An ihnen entlang darf man überall zupacken, darüber und darunter nicht.
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
  Material. Auf dem Boden füllt sie sich in drei Sekunden, an der Wand in
  sechs. Was dabei herauskommt, in Sekunden bis leer: zwei raue Henkel oder
  Kanten sind eine **Rast**, zwei raue Ballen 180 s, zwei raue Flächen 55 s,
  zwei glatte Kanten 95 s, zwei glatte Flächen **9 s** — und einarmig überall
  ein Drittel davon.

  **Die Anzeige** (`climb/ClimbHud.ts`) hängt wie die Trefferanzeige an der
  **Kamera** und liegt auf `LAYER_HUD` — ein Balken, der dem Kopf ein Bild
  hinterherläuft, ist das Erste in VR, wovon einem schlecht wird. Sie sitzt am
  **unteren Bildrand**, 45 cm unter der Blicklinie auf einen Meter (gut 24°),
  und dem Auge entgegengedreht, weil eine schräg gesehene Tafel eine gestauchte
  ist. Unten in der Mitte die Ausdauer, links und rechts je ein Haltbalken; die
  Anordnung ist die Anschrift, deshalb steht nichts daran. Auf den Haltbalken
  sitzen zwei feine Striche genau auf den beiden Schwellen — sonst wäre „gut"
  eine Farbe, die man glauben muss, statt einer Höhe, die man abliest.
  Gezeichnet wird sie **davor** und nicht darüber (`renderOrder` 4): Drei
  Balken, die quer durch eine Menüseite laufen, sind schlimmer als drei Balken,
  die man kurz nicht sieht. Abschaltbar im Menü.

  **Die Vibration** (`climb/gripHaptics.ts`, mit Test) ist bewusst **kein
  Dauerbrummen, dessen Stärke den Halt anzeigt**: Ein Motor, der die ganze Zeit
  läuft, wird nach zwanzig Sekunden nicht mehr wahrgenommen, verdeckt jede
  andere Rückmeldung und leert den Akku — und man merkt eine _Änderung_ ohnehin
  viel besser als einen _Pegel_. Also drei **Ereignisse**: (1) **Der Schlag
  beim Zupacken**, genau einer, und er ist die Antwort auf „habe ich das gut
  erwischt?" — guter Halt **kurz und hart** (1,0 / 60 ms), schlechter **schwach
  und lang** (0,15 / 190 ms); dieselben zwei Regler in die Gegenrichtung, und
  dadurch ohne Anzeige auseinanderzuhalten. (2) **Das Rutschen**: Solange ein
  Griff unter der Erholungsschwelle liegt, tickt es leicht weiter, und je
  schlechter der Halt, desto **schneller** die Folge — nicht lauter, schneller;
  ein beschleunigendes Ticken liest sich als Countdown, und das ist es auch.
  (3) **Die Warnung** ab einem Drittel Ausdauer, kurz und kräftig statt lang
  und weich. An der Leiter passiert nichts davon außer dem Schlag beim
  Zupacken — eine Welt, in der auch das sichere Material vibriert, hat kein
  sicheres Material mehr.

  **Der Weg hinunter: das Sprungkissen** (`climb/crashPad.ts`, mit Test —
  reine Zahlen, kein three.js). Jeder nimmt von oben denselben Weg zurück, und
  bis vor kurzem endete er an einer Bodenplatte: Der Kopf fällt mit gut zehn
  Metern in der Sekunde, und **im nächsten Bild steht er still**. Das ist in
  der Brille kein Aufkommen, sondern der kürzeste Weg zur Übelkeit — das Auge
  meldet eine Vollbremsung, von der der Gleichgewichtssinn nichts mitbekommen
  hat, und genau diese Lücke ist es, aus der Motion Sickness entsteht. Ein
  Fall lässt sich in VR nicht abschaffen, sein **Ende** schon.

  Das Kissen ist deshalb eine **Feder mit Dämpfer**, und seine Oberfläche ist
  der Boden, auf dem man steht: ein **kinematischer** Körper, der jedes Bild um
  die Einsinktiefe nach unten gesetzt wird. Aus dem einen Bild werden gut acht
  Zehntelsekunden, und keines davon ist ein Ruck. **Warum eine Feder und keine
  Bremsstrecke**: Bei einer Feder hängt die Zeit bis zum tiefsten Punkt _nicht_
  am Aufpralltempo — sie ist ihre Viertelperiode und damit für den Stolperer
  dieselbe wie für den Sprung aus sechs Metern. Eine feste Bremsstrecke täte das
  Gegenteil: Je schneller jemand ankommt, desto härter bremst sie ihn. Die eine
  Zahl, um die es geht, ist deshalb die **Kreisfrequenz** (`PAD_OMEGA` = 7);
  dass ein Sprung von oben trotzdem nicht durchschlägt, macht die
  **progressive Härte** — ein halb zusammengedrücktes Kissen wehrt sich stärker
  als eines in Ruhe, so wie Luft in einem Sack. Eine **Rampe** an seiner Kante
  führt wieder hinauf, flacher als das, was der Körper noch steigt.

  Die Griffe tragen die **Greif-Farben** aus `core/colors.ts` und keine zweiten:
  Sprossen leuchten hell, rauer Fels trägt den ruhigen Ton, glatter den dunklen;
  den Rest macht die Oberfläche, denn glatter Fels glänzt auch. Wer im Spiel
  gelernt hat, dass Türkis „hier anfassen" heißt, sucht an einer Wand voller
  bunter Klötze zuerst das Türkis. Geklettert wird mit **Controllern oder
  getrackten Händen**; am Schreibtisch kann man die Wand ansehen und daran
  entlanglaufen, aber nicht hinauf.

  **Was mit der Kletterhalle gegangen ist**, und das ist der ehrliche Teil: die
  sechs Routen nebeneinander (Leiterwand, Rauwand, Riss, Überhang, Glattwand,
  Kamin), die Podeste auf 6,50 m und die **Ausstiegshilfen**, mit denen man
  oben wirklich ankam — ein Schacht von 90 cm zwischen Wand und Podest, eine
  senkrechte Leiter darin, deren Holme oben um die Ecke und einen Meter über
  die Kante laufen, damit man sich hinüberhangeln kann. Die Zahlen dazu und
  warum sie so sind, stehen in `git show 3678f32:src/worlds/climb/ClimbWorld.ts`;
  hier steht eine Wand, an der man die Rechnung ausprobiert, und kein
  Lehrpfad.

- **Der Kleiderschrank und die Umkleide** (`grid/fixtures/wardrobe.ts`,
  `worlds/shared/wardrobeRack.ts`): der erste Einbau, der nicht die Welt ändert,
  sondern **den Spieler**.

  Er steht an einer Kante wie ein Regal — eine Kachel breit, einen halben Meter
  tief, 2,1 m hoch —, ist fest und benutzbar, und auf einer seiner beiden
  Türfronten hängt ein **Spiegel** (`worlds/shared/Mirror.ts`, derselbe wie am
  Standspiegel). Wer davorsteht und `A` drückt, steht im nächsten Augenblick
  **in** seinem Kleiderschrank: Die Welt verblasst, ein weißer Kachelboden kommt
  herauf, und um die Figur herum fahren die Sachen aus dem Boden, die sie
  anziehen kann (siehe _Der Konstrukt-Raum_).

  **Er tut das über ein Ereignis und nicht selbst.** `use` meldet
  `{ type: 'wardrobe' }`, und was daraus wird, entscheidet die Welt:
  `GridWorld.openWardrobe` bekommt den Schrank als **Anker** dazu
  (`view.handle ?? view.object`) und macht damit das Konstrukt auf — ohne ihn
  wüsste es weder, was stehen bleibt, noch, worauf man drücken muss, um wieder
  herauszukommen. Ein zweiter Druck auf denselben Schrank führt hinaus. Eine
  Einbau-Art, die `saveAppearance` riefe, wäre dagegen eine, die man ohne
  Speicher nicht mehr prüfen kann — und sie wüsste Dinge, die sie nichts
  angehen: wer davorsteht, was der anhat, und ob daraus ein Regal, eine Seite
  am Bildschirm oder eine Menüseite in der Brille wird. Es ist das einzige
  `FixtureEvent` **ohne Inhalt**, und genau das ist die Nachricht: Jemand hat
  den Schrank aufgemacht.

  **Der Spiegel brauchte dafür keinen neuen Bau-Kontext.** Der erste Verdacht
  war, `FixtureBuild` um einen Haken für Spiegel zu erweitern — der
  Standspiegel sieht ja so aus, als bräuchte er Renderer, Szene und Kamera. Er
  braucht sie nicht: Eine `MirrorSurface` ist ein gewöhnliches Mesh, und wer ihr
  ihr Bild malt, **sucht sie im Szenengraphen** (`MirrorRenderer.render` über
  `collectMirrors`). Ein Spiegel, der in `ctx.group` hängt, bekommt sein Bild
  also von selbst, und der Vertrag der Einbauten bleibt so klein, wie sein
  Kommentar es verspricht. Er kostet nur eines: **Freigeben** — das Glas hält
  ein eigenes Material, und erst dessen `dispose` meldet dem Zähler der Spiegel,
  dass es eines weniger ist.

  **Korpus in `solids`, Türen im Bild.** Dieselbe Teilung wie bei jedem Einbau,
  der aufhält: Was Körper hat, gehört in `solids` — dort wird es aus der Palette
  der Welt gebaut, bekommt Physik und wird von oben durchsichtig, wenn es die
  Figur verdeckt. Die beiden Türfronten sind das, was man **anfasst**, und
  hängen deshalb in der Gruppe: Was dort hängt, bekommt den gelben Saum, und
  ein Schrank, bei dem der ganze Kasten leuchtet, sagt weniger als einer, bei
  dem die Türen leuchten. Dieselbe Teilung entscheidet im Konstrukt, was stehen
  bleibt: Der **Anker** ist die Gruppe, also stehen Türen und Spiegel im weißen
  Raum, während der Korpus mit der Welt verblasst, zu der er gehört.

  **Er meldet sich aus einem Meter**, nicht mehr aus 0,7 m (`use.radius`). Der
  Halbmesser ist der Zylinder, den der Strahl treffen muss
  (`core/usable.pickUsable`), und 0,7 m maßen genau die beiden Türblätter — mehr
  hängt ja nicht in der Gruppe. Wer schräg davorstand, zielte daran vorbei und
  sah nichts leuchten, während jedes Küchenmöbel drei Meter weiter schon von der
  Seite antwortet: Ein Möbel ohne eigene Angabe bekommt die Ausdehnung seines
  Netzes (`PortalWorld.addUsable`, `objectRadius`), bei einer Küchenzeile auf
  einer Kachel gut 0,7 m, bei der Ausgabetheke über zwei Kacheln das Doppelte.
  Ein Meter ist die halbe Diagonale der Kachel plus eine Handbreit — und damit
  antwortet der Schrank aus derselben Entfernung und unter denselben Winkeln wie
  alles andere, vor dem man stehen kann.

  **Die Umkleide ist kein Blatt mehr, sondern ein Regal**
  (`worlds/shared/wardrobeRack.ts`). Bis eben klappte ein Druck auf den Schrank
  eine Liste mit Pfeilen auf, und eine Liste mit Pfeilen ist die eine Bedienung,
  von der man in einer Brille nichts hat: Man sieht das Kleidungsstück nicht,
  man liest seinen Namen. Jetzt stehen die **siebzehn** Sachen als Sachen da —
  vier Gesichter, acht Hüte, fünf Oberteile, in genau der Reihenfolge, in der
  `ui/wardrobeRows.ts` seine drei Zeilen baut. Zwei Umkleiden, die dieselben
  Sachen verschieden sortieren, driften nach der zweiten neuen Mütze
  auseinander, und dann sucht man im Regal an der Stelle, an der im Menü etwas
  anderes stand.

  Jedes Stück wird **einmal gebaut** und danach wiederverwendet (`made`), und
  zwar erst in dem Bild, in dem es aus dem Boden kommt: Siebzehn Avatarteile je
  Öffnen kosteten knapp eine Zehntelsekunde am Stück — genau die Pause nach dem
  Druck auf den Schrank — und hinterließen siebzehn frische Geometrien samt
  Materialien, die niemand wieder freigab (`buildHead` und die beiden anderen
  bauen alles neu). Herausgegeben wird deshalb erst die **Auskunft** (Fach,
  Name, ob man es anhat) und das Netz auf Abruf (`RackPiece.object`).

  Jedes Stück ist **handgroß** (30 bis 45 cm) und steht auf seinem eigenen Fuß,
  und die drei Verkleinerungen sind je eine Zahl pro Fach (0,55 für Köpfe, 0,44
  für Hüte, 0,5 für Oberteile), aus dem größten Stück des Fachs
  zurückgerechnet. **Eine** Zahl je Fach und keine Normierung Stück für Stück:
  Ein Zylinder ist höher als eine Krone, ein Bauhelm breiter als eine Mütze, und
  genau daran erkennt man sie auch verkleinert wieder. Der Rumpf wird dabei auf
  knapp zwei Drittel gestaucht (`BODY_STAND`) — in voller Höhe ist er eine
  kopflose Figur, gestaucht ist er eine **Büste**, und so stellen
  Kleidergeschäfte Oberteile hin. Für `none` steht ein **leerer Hutständer**
  dort, Pfosten und Knauf: `buildHeadgear('none')` gibt `null`, und ein leeres
  Brett sähe nicht nach einer Möglichkeit aus, sondern nach einer Lücke — dabei
  ist ausgerechnet _Barhäuptig_ die Auslieferung, und wer einen Hut wieder
  absetzen will, muss auch etwas **benutzen** können.

  **Was man anhat, trägt einen Reif um den Fuß** (`rack-worn`), flach, warm und
  selbstleuchtend. `RackPiece.worn` sagt es dem Aufrufer, aber ein Regal, in dem
  man erst etwas anvisieren muss, um zu erfahren, ob man es schon trägt, ist
  wieder ein Menü; ein Ring sagt es auf einen Blick und aus jeder Richtung, Text
  kann das nicht. Beim Anziehen **wandert** er, statt dass das Regal neu gebaut
  wird (`GridWorld.wearable`) — siebzehn Netze für eine Marke wegzuwerfen wäre
  das eine, die Auffahrt aus dem Boden ein zweites Mal vorzuführen das andere.
  Dafür bekommt **jedes** Stück seinen Reif, und sichtbar ist einer: Wandern
  kann nur, was da ist. Ein Ring, den es erst beim nächsten Neubau gäbe, wäre
  nach dem ersten Kleiderwechsel bei **keinem** Stück mehr zu sehen — der alte
  ginge aus, ein neuer entstünde nie. Wandern lässt ihn seit September 2026 das
  Regal selbst (`WardrobeRack.wear`) und nicht mehr eine Schleife im Aufrufer:
  Es weiß, welche Stücke schon gebaut sind, und es merkt sich das Aussehen für
  die, die erst noch aufzufahren haben. Wer alle Stücke eines Fachs anfasste, um
  einen Ring umzuschalten, baute genau die vorzeitig, die der Raum gerade
  langsam nachreicht.
  Und der Raum bleibt dabei **offen**: Wer sich umzieht, probiert, und wer
  probiert, will den nächsten Hut sehen, ohne zweimal durch eine halbe Sekunde
  Überblendung zu gehen (`ConstructItem.pick` gibt `false`).

  **Der Spiegel an der Tür ist die Rückmeldung** und kein Zierrat. Er ist mit
  den Türen das Einzige, was nicht verblasst, und er zeigt die Figur in dem, was
  sie gerade angezogen hat — deshalb braucht dieses Regal keine zweite Szene und
  keine Figur in Nahaufnahme daneben. Und **das Aussehen hängt weiter am
  Spieler** und nicht an der Welt (`core/appearance.ts`): `saveAppearance`
  speichert sofort, der eigene Körper und das Netz hören über
  `onAppearanceChange` zu, und angesagt wird es in der **Anmeldung** und nicht
  in der Pose (`hello`, Felder `hat`, `head`, `body` — siehe _Wie man
  aussieht_). Wer sich hier umzieht, läuft auch in der nächsten Welt so herum.

  **Das Blatt von früher gibt es noch, aber nur als Rückfall**
  (`ui/WardrobeMenu.ts`). Ohne Netz kein Konstrukt: `GridWorld.openWardrobe`
  bekommt den Schrank als Anker mitgereicht, und wenn keiner da ist, geht es
  über `ctx.openWardrobe()` den alten Weg — am Bildschirm die Seite mit der
  Figur daneben, in der Brille die Seite _Aussehen_ am Handgelenk. Das ist kein
  Notbehelf, sondern die ehrliche Antwort: Ein Schrank ohne sichtbaren Korpus
  wäre im Konstrukt ein weißer Raum mit nichts darin.

  **Die Seite am Bildschirm** ist eine Seite über dem Bild, geschnitten wie
  das Menü (`ui/pageMenu.css`): auf dem Telefon ein Blatt von unten, am
  Schreibtisch ein Kasten in der Mitte. Links drei Zeilen mit ‹ und › — Kopf,
  Hut, Körper (`ui/wardrobeRows.ts`) —, rechts **die Figur in Nahaufnahme**,
  unten _Fertig_. Die Figur ist eine **zweite Szene**: ein eigener Renderer in
  einem eigenen Canvas, ein `AvatarBody` darin, dasselbe Licht wie im Spiel —
  und beides entsteht beim Öffnen und ist beim Schließen wieder weg. Das ist die
  Stelle, an der man es falsch machen kann: Ein zweiter Renderer, der im
  Hintergrund weiterläuft, kostet auf der Quest genau die Bilder, die dem Spiel
  fehlen. Warum überhaupt eine zweite Szene und kein Ausschnitt der ersten: Die
  eigene Figur steht auf einer Ebene, die nur Portale und Spiegel zeichnen
  (`LAYER_SELF_ONLY`), und sie steht dort, wo der Spieler steht — nicht vor
  einem Vorhang, in den man hineinschaut.

  **Die Kamera hängt an den Maßen der Figur** (`CHEF_HEIGHT`) und nicht an
  denen des Spielers, und genau das war hier einmal falsch: Die Zahlen stammten
  aus der Zeit, in der der Avatar so hoch war wie sein Spieler — Kamera auf
  1,62 m, Blick auf 1,42 m. Seit die Figur ein Modell ist, ist sie 1,60 m hoch
  und ihre Augen liegen bei 0,91 m; die Kamera schaute damit einen halben Meter
  über ihren Hut hinweg, und in der Umkleide stand eine Mütze am unteren
  Bildrand. Man suchte Köpfe aus, die man nicht sah. Gezeigt wird jetzt die
  **ganze** Figur: Sie ist gedrungen genug, dass sie ins Bild passt, ohne dass
  der Kopf klein wird, und Jacke und Hände gehören zu dem, was man hier
  aussucht.

  **In der Brille gibt es diese Seite nicht.** Fällt der Schrank dort auf den
  alten Weg zurück, springt `App.openWardrobe` an die Seite _Aussehen_ am
  Handgelenk und baut kein zweites Canvas auf: Eine zweite Figur vor der Nase
  wäre ein Bild von einem Spiegel neben einem Spiegel, und sie kostete einen
  ganzen zweiten Renderer in der Sitzung, in der die Bilder am knappsten sind.

  **Gespeichert wird sofort** (`saveAppearance`); _Fertig_ schließt nur. Es gibt
  kein _Übernehmen_: Wer vor einem Spiegel steht und die Änderung nicht sieht,
  hat kein Umkleidemenü.

  **Die Zeilen sind eine eigene Datei** (`ui/wardrobeRows.ts`) und aus demselben
  Grund, aus dem `init`/`step` einer Einbau-Art rein sind: Was eine Zeile
  schaltet, ist eine Rechnung über drei Listen, und die prüft ein Test in
  Millisekunden. Was daraus für ein Knopf wird — DOM am Bildschirm, Menüzeile am
  Handgelenk, ein Stück auf einem Brett —, ist eine zweite Frage. Dieselbe
  Grenze läuft durch das Regal: `wardrobeRack.ts` liefert die Stücke und die
  Auskunft, was Anziehen heißt; wohin sie kommen und wer den Raum wieder
  zumacht, entscheidet `worlds/shared/construct.ts`.
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
  gehören (eine Galerie, die zum Aufbau zählt), gehören niemandem: feste Kennung,
  nicht gespeichert, nicht verschickt — jeder baut dieselbe Halle. Die Tafel
  kann darüber hinaus **ohne Traggriffe** gebaut werden (`handles: false`) — für
  eine, die angeschraubt ist und nicht mitgenommen wird, wie der Aushang an der
  Küchenwand (`worlds/test/zones/kitchenNotice.ts`): Zwei türkise Griffe sagen
  in diesem Spiel „hier anfassen", und das ist ein Versprechen.
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
- **Die Eingabeseite** (`inputs.html`, `src/inputs/`, siehe
  [Die Eingabeseite](#die-eingabeseite)): jeder Knopf des Pads mit seiner
  Nummer, ein gezeichneter Controller, auf dem leuchtet, was gedrückt ist, das
  Panel mit `gamepad.buttons[N]` daneben — und darunter derselbe `readGamepad`,
  der im Spiel läuft. Sie ist für den Browser einer Konsole gebaut, wo es keine
  Entwicklerwerkzeuge gibt und ein Knopf, der nichts tut, sonst unerklärlich
  bleibt.
- **Belegung und Gerätekarte** (`core/inputMap.ts` mit Test, `inputStore.ts`;
  auf der Seite und im Spiel unter _Menü → Eingaben_): Welcher Knopf und welche
  Taste was tun — und, davon getrennt, **wo eine Nummer an diesem Gerät
  wirklich sitzt**. Das zweite gibt es, weil manche Treiber die Lage falsch
  melden (ein Backbone am iPhone meldet den unteren Gesichtsknopf als
  `buttons[1]`); ein Tausch ist ein Handgriff, gilt nur für dieses Gerät, und
  danach stimmen Bild, Liste und Spiel. Alles gespeichert, alles einzeln oder
  ganz auf Standard zurückzusetzen; ohne eigene Einstellung ändert sich nichts.
- **Vollbild, wo keine Brille ist** (`core/fullscreen.ts`, siehe
  [Vollbild, wo keine Brille ist](#vollbild-wo-keine-brille-ist)): ein Knopf auf
  der Startseite und im Streifen des Spiels. Auf einer Konsole oder am
  Fernseher kostet die Adresszeile ein Fünftel des Bildes; in der Brille gibt
  es ihn nicht, dort ist die Sitzung selbst das Vollbild.
- **Boden bis zum Horizont**: unter _jeder_ Welt liegt eine Fläche mit Raster,
  einen Kilometer im Quadrat, begehbar und portalfähig (`createGround` in
  `worlds/shared/environment.ts`). Vorher stand jede Welt auf ihrer eigenen
  Platte, und an deren Rand war Schluss — genau die Grenze, die eine Sandkiste
  nicht haben darf. Jetzt läuft man um das Labor herum, sieht sich die
  Kartbahn von außen an und kommt wieder zurück.

  Das Raster darauf ist ein **Schachbrett mit einem Meter je Feld**
  (`CHECKER_TILE`) — derselbe Meter, in dem gebaut wird (`nav/navTile.TILE`).
  Vorher war es eine einzelne Fläche mit einem Strich darum, alle vier Meter:
  eine Kachelgröße, die es in keiner Welt dieses Projekts gibt. Ein Raster, das
  nicht zu dem passt, in dem man Wände setzt, ist schlimmer als keines. Zwei
  abwechselnde Töne statt eines: Eine große einfarbige Ebene ist in der Brille
  kaum von Nebel zu unterscheiden, und ein Raster, dessen Felder man nicht
  **zählen** kann, sagt einem nicht, wie weit man gelaufen ist. Die zweite
  Farbe kommt ohne Angabe eine Spur heller als die erste heraus, damit jede
  Welt ihr Brett bekommt, ohne ihren Ton zu verlieren; wer es wie in **Portal**
  will — grau und weiß —, nennt sie (`horizonChecker()`, so macht es die
  Testwelt).

  Den Zeichner teilt sich dieser Boden inzwischen mit einem zweiten
  (`checkerTexture`): Die **Küche der Testwelt** ist ebenfalls kariert, mit
  halben Feldern und eigenen Tönen (`test/zones/kitchenFloor.ts`). Geteilt wird
  dabei nicht nur das Muster, sondern vor allem, was darum herum steht —
  sRGB-Farbraum, Mipmaps und `anisotropy`: die drei Einstellungen, ohne die ein
  Raster aus der Schrägsicht flimmert, und die man in einer zweiten Fassung
  garantiert einmal vergisst.
- **Rettung aus der Tiefe**: wer trotzdem unter die Welt fällt — durch ein
  Bodenportal, durch eine Ritze, durch einen Handschuh — kommt an derselben
  Stelle wieder heraus, auf dem **höchsten** Punkt, der dort steht. Von unten
  gesucht landete man im Keller eines Hauses, von oben landet man auf seinem
  Dach (`worlds/shared/fallRescue.ts`, mit Test).
- **Welt-Physik** (_Einstellungen → Welt-Physik_): **Schwerkraft**
  (schwerelos, Mond, Mars, Erde, schwer — oder getippt), **Sprungkraft**,
  **Reibung** und **Rückprall**, alles sofort wirksam und im Browser gemerkt
  (`src/core/worldPhysics.ts`, mit Test). _Welt-Standard_ ist eine eigene
  Zeile: Eine Welt darf ihre eigene Schwerkraft mitbringen (`worldGravity()` —
  ein Mond sagte dort 1,62), und eine einmal getippte Zahl darf nicht für immer
  über jeder Welt stehen. Reibung und Rückprall fassen die
  Objekte erst an, wenn jemand sie wirklich verstellt — sonst überschriebe der
  Start jede im Code eingestellte Kleinigkeit (alles aus dem Beutel 0,7, die
  Companion Cubes des Labors 0,8).
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

**Die Tabelle ist die Voreinstellung, nicht das Gesetz.** Tastatur und Pad sind
einstellbar — je Aktion die Taste beziehungsweise die Stelle am Pad, dazu eine
Karte für Geräte, die ihre Knöpfe falsch verorten; beides unter
_Menü → Eingaben_ und auf `/inputs.html`, beides gespeichert und jederzeit
zurücksetzbar (`core/inputMap.ts`, siehe
[Zwei Karten](#zwei-karten-wo-ein-knopf-sitzt-und-was-er-tut)). Was unten steht,
gilt für jeden, der nichts verstellt hat.

|                                                                                    | VR                                                                                                                                                                                                                                                            | Desktop                                                                                                                                                                                                                                                                                                                                        | Gamepad                                                     | Handy                                      |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------ |
| Bewegen                                                                            | linker Stick                                                                                                                                                                                                                                                  | `WASD` (`Shift` = schneller) — in der Blickrichtung; **von oben** in Weltrichtungen: `W` = Norden, `D` = Osten, und die Figur dreht sich dorthin, wohin sie läuft                                                                                                                                                                              | linker Stick — von oben in Weltrichtungen, aus den Augen in Blickrichtung | linker Touch-Stick                         |
| Sprinten                                                                           | linken Stick reindrücken                                                                                                                                                                                                                                      | `Shift`                                                                                                                                                                                                                                                                                                                                        | linken Stick reindrücken (LS)                               | –                                          |
| Ducken                                                                             | rechten Stick reindrücken                                                                                                                                                                                                                                     | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Umsehen                                                                            | Kopf, rechter Stick = Snap-Turn                                                                                                                                                                                                                               | Maus (Klick = Pointer-Lock); **von oben** dreht die Maus nichts — sie **zielt** (Zeile darunter), die Kamera steht fest und Norden ist oben                                                                                                                                                                                                                                       | rechter Stick — nur _aus den Augen_                         | wischen                                    |
| Zielen (von oben)                                                                  | – (die Hand zeigt selbst)                                                                                                                                                                                                                                     | Maus: die Figur schaut zum Zeiger (`TopDownCamera.project`)                                                                                                                                                                                                                                                                                    | rechter Stick — die zuletzt gezielte Richtung bleibt stehen | rechter Touch-Stick                        |
| Springen                                                                           | `A` rechts — **wenn nichts in Reichweite ist** (sonst benutzt `A`)                                                                                                                                                                                            | `Leertaste` (immer, auch vor einem Knopf)                                                                                                                                                                                                                                                                                                      | `A` — wenn nichts in Reichweite ist                         | Knopf `A` — wenn nichts in Reichweite ist  |
| Benutzen                                                                           | `A` rechts — was in Reichweite steht, bekommt einen **gelben Saum** (`core/highlight.ts`)                                                                                                                                                                     | `E` oder Enter                                                                                                                                                                                                                                                                                                                                 | `A`                                                         | Knopf `A`                                  |
| Schießen (von oben)                                                                | Trigger der Hand mit der Waffe                                                                                                                                                                                                                                | Linksklick                                                                                                                                                                                                                                                                                                                                     | `B` oder RT (analog, 0…1)                                   | Knopf `B`                                  |
| Menü                                                                               | Button an **beiden** Händen (immer nur eins offen)                                                                                                                                                                                                            | Knopf ☰ oben links — dasselbe Menü als Seite (`ui/PageMenu.ts`), auch auf der Startseite                                                                                                                                                                                                                                                      | –                                                           | Knopf ☰ oben links; Blatt von unten       |
| _Von oben_ ↔ _Aus den Augen_                                                       | – (in der Brille steht man in der Welt)                                                                                                                                                                                                                       | Startseite oder Menü → _Ansicht_ (`core/TopDownCamera.ts`)                                                                                                                                                                                                                                                                                     | –                                                           | dito                                       |
| Zoom (von oben)                                                                    | –                                                                                                                                                                                                                                                             | Mausrad — sechs Stufen als Abstand: 12 · 16 · 22 · 30 · 42 · 60 m, gerastet ab dem Abstand, den man gerade sieht                                                                                                                                                                                                                                          | LB heran · RB zurück                                        | zwei Finger in der **oberen** Hälfte ziehen stufenlos (`TopDownCamera.zoomScale`) |
| Auswählen                                                                          | zielen + Trigger oder `A` — **beide Hände** haben einen Strahl; im Handgelenkmenü löst der Trigger beim **Loslassen** aus, damit Wischen nichts drückt                                                                                                        | Linksklick — **aus den Augen**; von oben gehört er der Waffe (Zeile _Schießen_)                                                                                                                                                                                                                                                                | –                                                           | tippen                                     |
| Werkzeug wählen                                                                    | – (das Regal hängt am Handgelenk)                                                                                                                                                                                                                             | Knopf `#hud-tool` unten rechts oder `Tab` — Liste mit **Hand (leer)** zuerst                                                                                                                                                                                                                                                                   | `Y`                                                         | Knopf mit der Ikone des Werkzeugs, unten rechts über `A`/`B` |
| Werkzeug nehmen                                                                    | Grip an der Hüfte halten (jede Hand, jedes Werkzeug)                                                                                                                                                                                                          | – (immer bereit)                                                                                                                                                                                                                                                                                                                               | –                                                           | –                                          |
| Werkzeug ablegen                                                                   | Grip über der Hüfte loslassen                                                                                                                                                                                                                                 | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Werkzeug weiterreichen                                                             | die leere Hand an den **Griff** der vollen führen (sie leuchtet und öffnet sich), dann greifen                                                                                                                                                                | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Werkzeug fallen lassen                                                             | Grip woanders loslassen — es fällt, der Gürtel füllt nach (Budget pro Hüfte, links und rechts stören sich nicht)                                                                                                                                              | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Hüften verschieben                                                                 | Gürtel-Justierer nehmen, Hüfte anzielen, Trigger, mit der anderen Hand greifen und schieben (`A`/`X` setzt zurück)                                                                                                                                            | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Messer werfen                                                                      | im Schwung loslassen; es fliegt weiter und bleibt stecken                                                                                                                                                                                                     | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Großer Hammer                                                                      | irgendwo am türkisen Stiel greifen; zweite Hand dazu = zweihändig; **Trigger halten** schiebt die Hand am Stiel; geschlagen wird mit dem Kopf                                                                                                                 | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Laufrichtung                                                                       | voreingestellt beim Loslaufen gemerkt (Kopfdrehen ändert den Weg nicht mehr); Menü → Bewegung → _Laufrichtung_ schaltet auf Blickrichtung zurück                                                                                                              | dito                                                                                                                                                                                                                                                                                                                                           | –                                                           | dito                                       |
| Haltung (sitzen/stehen)                                                            | Startseite (nur mit Brille gefragt) oder Menü → Bewegung → Haltung                                                                                                                                                                                            | Menü → Bewegung → Haltung                                                                                                                                                                                                                                                                                                                      | –                                                           | dito                                       |
| Greifen ohne Controller                                                            | Mittel-, Ring- und kleiner Finger an die Handfläche                                                                                                                                                                                                           | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Trigger ohne Controller                                                            | Zeigefinger an die Handfläche                                                                                                                                                                                                                                 | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Portal schießen                                                                    | Trigger der Hand mit der Waffe                                                                                                                                                                                                                                | Links-/Rechtsklick                                                                                                                                                                                                                                                                                                                             | –                                                           | –                                          |
| Zweites Portal (Doppel-Waffe)                                                      | Greifen                                                                                                                                                                                                                                                       | Rechtsklick                                                                                                                                                                                                                                                                                                                                    | –                                                           | –                                          |
| Aufheben / werfen                                                                  | Grip mit leerer Hand am Objekt                                                                                                                                                                                                                                | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Weitergeben                                                                        | mit der freien Hand danach greifen                                                                                                                                                                                                                            | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Anfassen                                                                           | Hand ans Ding, Grip — die Hand leuchtet, wenn sie dran ist                                                                                                                                                                                                    | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Nahgreifen                                                                         | zielen, Grip: der Gegenstand bleibt liegen und folgt der Hand (Geisterhand zeigt, wo)                                                                                                                                                                         | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Ferngreifen                                                                        | zielen, Grip drücken (rastet ein), Hand zum Körper zucken (ab _Zugtempo_, ab Werk 1,25 m/s — _mittel_)                                                                                                                                                        | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Nah Gefasstes doch holen                                                           | dasselbe Zucken zum Körper                                                                                                                                                                                                                                    | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Nah Gefasstes zur anderen Hand                                                     | mit der freien Hand daraufzielen und Grip — die zweite Geisterhand zeigt, dass sie es nimmt                                                                                                                                                                   | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Reichweiten einstellen                                                             | Menü → Einstellungen → Greifen                                                                                                                                                                                                                                | dito                                                                                                                                                                                                                                                                                                                                           | –                                                           | dito                                       |
| Grafik umstellen                                                                   | Menü → Grafik: _Schatten_ (Häkchen, ab Werk an); _Grafik-Modus_ schaltet im Kreis (Einfach → Comic); _Brille: Auflösung_ (Voll → Mittel → Flüssig, ab der nächsten Sitzung); oben die **Bildrate** live; _Bildrate im Bild_ (Häkchen = F3)                                                      | dito                                                                                                                                                                                                                                                                                                                                           | –                                                           | dito                                       |
| Hitboxen                                                                           | Menü → Grafik → _Hitboxen_ — die Körper der Physik als Drahtgitter über allem, mit dem Kreis um den Spieler, ab Werk aus                                                                                                                                                                        | dito                                                                                                                                                                                                                                                                                                                                           | –                                                           | dito                                       |
| Gitterlinien                                                                       | Menü → Grafik → _Gitterlinien_ — die Kacheln der Ebene, auf der man steht, ab Werk aus                                                                                                                                                                        | dito                                                                                                                                                                                                                                                                                                                                           | –                                                           | dito                                       |
| Griffe zeigen                                                                      | Menü → Grafik → _Griffe zeigen_ — ein 4 cm langes Achsenkreuz an jeder Griffstelle, ohne Tiefenprüfung über allem, ab Werk aus                                                                                                                                | dito                                                                                                                                                                                                                                                                                                                                           | –                                                           | dito                                       |
| Menüseite blättern                                                                 | Stick der zeigenden Hand hoch/runter, **oder** Trigger halten und wischen. Der Stick bewegt dabei nicht den Spieler                                                                                                                                           | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Werkzeug-Einstellungen                                                             | im Regal auf die Zeile zielen und **Trigger** (Greifen/`A` nimmt es stattdessen in die Hand)                                                                                                                                                                  | Linksklick auf den Pfeil                                                                                                                                                                                                                                                                                                                       | –                                                           | tippen                                     |
| Augenhöhe messen                                                                   | Menü → Bewegung → Augenhöhe → _Jetzt messen_ — stehend und sitzend je eine Zahl                                                                                                                                                                               | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Augenhöhe in der Küche                                                              | Menü → Bewegung → Augenhöhe → _In der Küche_ — ab Werk 115 cm, 100 bis 180, +5 pro Druck; wirkt nur in der Brille und nur im Küchenrechteck                                                                                                                             | –                                                                                                                                                                                                                                                                                                                                                | –                                                             | –                                            |
| Verbinden (in der Brille)                                                          | Menü → _Verbindung_ → _Raum betreten_ (Code tippen) oder _Neuen Raum aufmachen_; _Name_ ändert den eigenen Namen — beides geht mitten im Spiel                                                                                                                | Raum-Code auf der Startseite                                                                                                                                                                                                                                                                                                                   | –                                                           | –                                          |
| Chat                                                                               | Menü → _Verbindung_ → _Chat_: letzte Zeilen lesen, _Schreiben_ macht die Tastatur auf; eine Zeile mit Konfig-Code auswählen übernimmt ihn                                                                                                                     | Panel _Verbindung_ → **Chat**: tippen, _Kopieren_ und _Übernehmen_ je Zeile, _Verlauf kopieren_                                                                                                                                                                                                                                                | –                                                           | dito                                       |
| Handschuh an blanken Händen                                                        | Menü → Hände → _Blanke Hände_                                                                                                                                                                                                                                 | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Knochenfarben                                                                      | Menü → Hände → _Knochenfarben_ — jeder Knochen in seiner eigenen Farbe                                                                                                                                                                                        | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Greifhaken                                                                         | Trigger (halten zieht)                                                                                                                                                                                                                                        | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Gravitationshandschuh                                                              | Trigger zieht, Greifen stößt ab                                                                                                                                                                                                                               | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Supermanhandschuh                                                                  | Greifen schwebt, Trigger fliegt; Hand zur Seite oder Kopf drehen = Kurve. Tempo je Richtung und wer welche Achse lenkt: _Einstellungen → Supermanhandschuh_                                                                                                   | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Translationshandschuh                                                              | Trigger hält aus der Ferne, `A` wechselt Modus                                                                                                                                                                                                                | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Größe & Position                                                                   | Trigger wählt, `A` holt die Griffe vor dich                                                                                                                                                                                                                   | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Griff ziehen                                                                       | Trigger der Werkzeughand oder Trigger/Greifen der freien Hand                                                                                                                                                                                                 | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Wert eintippen                                                                     | auf eine Taste zielen + Trigger, oder mit dem Finger antippen                                                                                                                                                                                                 | echte Tastatur oder Klick                                                                                                                                                                                                                                                                                                                      | –                                                           | tippen                                     |
| Lötkolben                                                                          | Trigger setzt Punkte, andere Hand wechselt Modus                                                                                                                                                                                                              | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Drohne                                                                             | beide Griffe halten, dann ein Trigger; Sticks fliegen, `A` öffnet das Menü (Modus, Tempo, Drehrate)                                                                                                                                                           | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Hängegleiter                                                                       | Trigger oder `A` = Anlauf; Stange ziehen = schneller, drücken = langsamer, kippen = Kurve (eine Hand tiefer, oder das Handgelenk); zweite Hand greift ans andere Ende; am Boden loslassen lässt ihn fallen                                                    | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Flügel                                                                             | beide Arme schlagen = Start und Schub; ausbreiten = gleiten, anlegen = Sturzflug; eine Hand tiefer = Kurve, Hände vor = Nase runter                                                                                                                           | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Taschenlampe                                                                       | Trigger schaltet an/aus                                                                                                                                                                                                                                       | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Lichtkegel stellen                                                                 | mit der anderen Hand vorne an die Linse greifen und nach links/rechts ziehen                                                                                                                                                                                  | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Haunting: Rolle wählen                                                             | Menü → _Techniker / Rot / Gelb / Blau / Monster_ (Mensch · Bot · Aus) und _Fähigkeiten der Plätze_                                                                                                                                                            | Reiterzeile ganz oben: _Aufbau_, Techniker, Rot, Gelb, Blau, Monster, _Zuschauer: Einzeln_, _Zuschauer: Alles_ — wer tippt, sitzt dort                                                                                                                                                                                                         | –                                                           | antippen                                   |
| Haunting: Archiv                                                                   | –                                                                                                                                                                                                                                                             | Zimmer auf der Karte antippen öffnet die Raumakte; Bild darin ziehen/zoomen                                                                                                                                                                                                                                                                    | –                                                           | dito                                       |
| Haunting: Schalttafel                                                              | –                                                                                                                                                                                                                                                             | Tür oder Lampe auf der Karte antippen schaltet sie; „Tafel" oben rechts schlägt die Schalterliste darüber auf                                                                                                                                                                                                                                  | –                                                           | dito                                       |
| Haunting: Zuschauer — wessen Platz / wem folgen / durch seine Augen / KI-Absichten | –                                                                                                                                                                                                                                                             | im Zuschauer-Panel wählen (Deck, Archiv, Schalttafel, Späher, Monster); über dem Deck: Stock links unten oder Finger fliegt, Mausrad oder zwei Finger zoomen, _Zurück über das Deck_                                                                                                                                                           | –                                                           | antippen, ziehen, zwei Finger              |
| Haunting: Schrank / Gegenstand / Rätsel                                            | anvisieren + Trigger                                                                                                                                                                                                                                          | anvisieren + `E` oder Linksklick                                                                                                                                                                                                                                                                                                               | –                                                           | als Techniker über sichtbare Schaltflächen |
| Haunting: linke / rechte Hand                                                      | Radar-/Röntgen-/Medkit-Menü; Objekte mit Trigger bedienen                                                                                                                                                                                                     | `1` wechselt Sensor, `2` Lampe/Medkit; beide enthalten freie Hand                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Haunting: Medkit                                                                   | Missionsmenü → Medkit                                                                                                                                                                                                                                         | rechts wählen + `E`, oder Missionsmenü                                                                                                                                                                                                                                                                                                         | –                                                           | –                                          |
| Haunting: Schutzschrank                                                            | Tastenfeld antippen = hinein (kein Code); beleuchteter Innenknopf zum Verlassen                                                                                                                                                                               | `E` oder Klick auf das Tastenfeld; `E` oder Menü zum Verlassen                                                                                                                                                                                                                                                                                 | –                                                           | Kabine antippen, wie in 2D                 |
| Haunting: Feststecken                                                              | Menü → _Feststecken? Zurück auf den Boden_ — mitten ins eigene Zimmer, draußen in die Zentrale                                                                                                                                                                | Menü, derselbe Eintrag                                                                                                                                                                                                                                                                                                                         | –                                                           | –                                          |
| Haunting: Ducken                                                                   | körperlich ducken                                                                                                                                                                                                                                             | `Ctrl` halten                                                                                                                                                                                                                                                                                                                                  | –                                                           | –                                          |
| Haunting: Mission / Test                                                           | Command-Panel oder Missionsmenü; Test bleibt gegnerfrei                                                                                                                                                                                                       | dito                                                                                                                                                                                                                                                                                                                                           | –                                                           | Handys besetzen Archiv/Schalttafel         |
| Haunting: 2D-Welt, Rolle wechseln                                                  | –                                                                                                                                                                                                                                                             | Panel über der Szene, dieselben sieben Reiter wie auf dem Telefon: Techniker, Rot, Gelb, Blau, Monster, Zuschauer: Einzeln, Zuschauer: Alles — Farbplätze und Monster nur in einer Test-Runde; Zahnrad = Optionsmenü (dasselbe steht im Schiff im Browser hinter _⚙ Optionen_; darin in der Bot-Runde die Simulationsgeschwindigkeit ×1 … ×16) | –                                                           | antippen                                   |
| Haunting: einzelne Lehrzimmer                                                      | Test → _Testdeck: einzelne Übungsräume_; Rückkehrknopf in jedem Raum                                                                                                                                                                                          | dito; mit `E` die echten Beispiele bedienen                                                                                                                                                                                                                                                                                                    | –                                                           | –                                          |
| Haunting: Simulationsflug                                                          | linker Stick fliegt, rechter steigt/sinkt                                                                                                                                                                                                                     | `WASD`, `Space` hoch, `Ctrl` runter, `Shift` schneller                                                                                                                                                                                                                                                                                         | –                                                           | –                                          |
| Haunting: VR-Komfort                                                               | Menü → _VR-Komfort_: Drehung, Komfortrand, Vibration                                                                                                                                                                                                          | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Haunting: Raumakte                                                                 | –                                                                                                                                                                                                                                                             | Zimmer auf der Archivkarte antippen; die Akte liegt ganzseitig darüber, „Karte" bringt den Grundriss zurück                                                                                                                                                                                                                                    | –                                                           | dito                                       |
| Haunting: Leistungsanzeige                                                         | Menü → Grafik, erste Zeile: FPS, Framezeit, CPU, Draw Calls — alle halbe Sekunde nachgeschrieben, solange das Menü offen ist                                                                                                                                  | `F3` oder Menü → Grafik → _Bildrate im Bild_: FPS, Framezeit, Draw Calls und Dreiecke                                                                                                                                                                                                                                                          | –                                                           | Menü → Grafik → _Bildrate im Bild_         |
| Klettern (Kletterwand)                                                             | **Greifen** an einem Griff hält dich daran fest (die Hand muss leer sein); Hand herunterziehen = Körper hinauf, loslassen = fallen, mit Schwung im letzten Zug. Solange du hängst, ist der linke Stick aus — der rechte dreht weiter, und die Anker gehen mit | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Verspreizen                                                                        | eine Hand links, eine rechts an gegenüberliegenden Flächen — und **nah beieinander**, sonst kann man nicht drücken                                                                                                                                            | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Sprungkissen                                                                       | von oben in das blaue Kissen springen — es federt den Fall ab, statt ihn anzuhalten; wieder hinauf geht es über seine Rampe                                                                                                                                   | dito                                                                                                                                                                                                                                                                                                                                           | –                                                           | dito                                       |
| Halt-Anzeige | sie taucht auf, sobald man vor der Kletterwand steht, und geht danach wieder weg — Ausdauer in der Mitte, je ein Haltbalken links und rechts | dito | – | dito |
| Küche: kochen | davorstellen und `A` — die Station, die `A` gerade meint, trägt den gelben Saum, und mehr braucht es nicht | `E` oder Enter | `A` | Knopf `A` |
| Küche: greifen                                                                     | **Greifen** oder **Trigger auf das Angezielte** nimmt Pfanne, Topf, Teller, Zutat und legt sie ab — nur im eigenen Feld und den acht daneben, und am nächstgelegenen Griff. Halten und beim Loslassen ablegen, **oder** tippen und beim nächsten Druck ablegen. Ein Möbel im Umbau nimmt **nur** Greifen: Der Trigger wendet es dort schon | `A`/`E` wie beim Kochen — die feinere Wahl (welches Feld, welcher Griff) gibt es nur in der Brille                                                                                                                                                                                                                                             | `A`                                                         | Knopf `A`                                  |
| Küche: Feuerlöscher | erst vom Hocker nehmen, dann den **Trigger der rechten Hand gedrückt halten**; gezielt wird mit **der Hand**, die ihn hält | **aus den Augen**: `E` gedrückt halten, gezielt mit dem Kopf. **Von oben**: ein **Schalter** — Linksklick an, noch einmal aus (oder `E`, solange nichts in Reichweite steht); gezielt mit dem rechten Stock, der dort die Figur dreht | aus den Augen `A` halten; von oben schaltet RT (oder `A`, solange nichts in Reichweite steht) | aus den Augen Knopf `A` halten; von oben schaltet Knopf `B` (oder `A`, solange nichts in Reichweite steht) |
| Küche: umbauen | roter Knopf neben dem Eingang + `A` schaltet den Baumodus um (sein Schild sagt, wohin: _Küche umbauen_ / _Küche nutzen_); das Einschalten räumt die Küche ab wie `B`/`Y`, danach hebt **Greifen** am Möbel es **samt allem, was darauf steht** auf, **Loslassen** über dem Umriss setzt es ab (grün = passt, rot = passt nicht) | dito mit `E`: `E` am Möbel hebt es samt Inhalt auf, `E` auf dem Umriss setzt es ab | dito mit `A` | dito mit Knopf `A` |
| Küche: Möbelkatalog | **vorn** an den Computer-Tisch treten und `A` — die Küche verblasst, ringsum stehen alle Möbel als Miniaturen auf den Kacheln; eines anfassen, und man hält es in der Küche in der Hand. Von der Seite oder von hinten hebt `A` im Umbau den Tisch selbst auf | dito mit `E` | dito mit `A` | dito mit Knopf `A` |
| Küche: kopieren | ein getragenes Möbel **links** auf den Kopierer legen (`A`), die durchscheinende Kopie **rechts** abholen (`A`) — die nächste wächst nach, solange die Vorlage liegt | dito mit `E` | dito mit `A` | dito mit Knopf `A` |
| Messband                                                                           | Trigger Punkt 1, Trigger Punkt 2                                                                                                                                                                                                                              | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Stoppuhr                                                                           | Trigger je nach Modus (Zeit, Einzelbild, Schnellladen), Knopf/`A` öffnet das Panel                                                                                                                                                                            | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Pinsel                                                                             | Palette antippen **oder** anzielen + Trigger; Regler (RGB, Breite) gedrückt halten und ziehen; ✕ schließt sie, `A`/`X` öffnet sie wieder; Trigger streicht an, auf einer Leinwand malt er                                                                     | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Staffelei                                                                          | Trigger stellt sie hin (Kreis am Boden zeigt wohin) und die Hand ist danach frei; **Griff an der Ablage + Greifen** nimmt sie wieder auf; `A`/`X` wischt die Leinwand; gemalt wird mit dem Pinsel                                                             | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Schild                                                                             | Trigger stellt es hin (Umriss zeigt wohin: Pfosten am Boden, flach an der Wand); `A`/`X` beschriftet das anvisierte Schild, sonst den Entwurf in der Hand; **Traggriff + Greifen** nimmt ein aufgestelltes wieder auf                                         | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Schild lesen und ändern                                                            | mit **leerer Hand** hinzeigen + Trigger öffnet die Tastatur; Daumenstick derselben Hand rollt den Text                                                                                                                                                        | anklicken (gerollt wird in der Brille)                                                                                                                                                                                                                                                                                                         | –                                                           | tippen                                     |
| Tastatur (mehrzeilig)                                                              | Tasten anzielen + Trigger; in der Brille kommt, wo es sie gibt, die Systemtastatur des Geräts dazu; `⏎ Zeile` macht eine neue Zeile, `Fertig` übernimmt                                                                                                       | echte Tastatur, `Strg`+`Eingabe` übernimmt, `Esc` bricht ab                                                                                                                                                                                                                                                                                    | –                                                           | tippen                                     |
| Duplizier-Waffe                                                                    | zielen + Trigger legt eine Kopie daneben                                                                                                                                                                                                                      | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Inspektor                                                                          | zielen — das Display liest mit, Trigger sagt es an                                                                                                                                                                                                            | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Teleporter                                                                         | zielen, grüner Kreis, Trigger setzt dich dorthin                                                                                                                                                                                                              | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Radiergummi                                                                        | Trigger löscht                                                                                                                                                                                                                                                | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Sektflasche (aus dem Beutel)                                                       | greifen: sie rastet am Hals in die Faust wie ein Pistolengriff, aufrecht oder über Kopf; kräftig schütteln, und der Korken knallt heraus                                                                                                                      | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Hirn                                                                               | Knopf/`A` öffnet das Panel (Haut, Hirn, Tempo, Leben, Käfig); zielen + Trigger setzt, was in _Setzen_ steht — oder nimmt weg, worauf du zeigst                                                                                                                | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Magischer Beutel                                                                   | in der einen Hand halten, mit der anderen ins Raster fassen oder darauf zeigen: Greifen holt das Ding heraus; geblättert wird mit dem **Trigger** der haltenden Hand, oder über einen der beiden Pfeile (Greifen oder Trigger)                                | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Kart: einsteigen                                                                   | davorstellen und `A` (das Kart steht als _Einsteigen_ in der Auswahl) — oder das Lenkrad greifen                                                                                                                                                              | davorstellen und `E`                                                                                                                                                                                                                                                                                                                           | `A`                                                         | Knopf `A`                                  |
| Kart: aus der Box fahren                                                           | Gas geben und nach rechts auf die Gerade ziehen                                                                                                                                                                                                               | `W`, dann `D`                                                                                                                                                                                                                                                                                                                                  | –                                                           | –                                          |
| Kart: Gas / Bremse                                                                 | rechter / linker Trigger                                                                                                                                                                                                                                      | `W` / `S`                                                                                                                                                                                                                                                                                                                                      | –                                                           | –                                          |
| Kart: lenken                                                                       | linker Stick — oder das Lenkrad greifen und drehen                                                                                                                                                                                                            | `A` / `D`                                                                                                                                                                                                                                                                                                                                      | –                                                           | –                                          |
| Kart: aussteigen                                                                   | `A`/`X` halten (Balken läuft voll)                                                                                                                                                                                                                            | `E` halten                                                                                                                                                                                                                                                                                                                                     | –                                                           | –                                          |
| Kart: Klemmbrett                                                                   | anzielen + Trigger, Stick blättert                                                                                                                                                                                                                            | anklicken                                                                                                                                                                                                                                                                                                                                      | –                                                           | –                                          |
| Karte holen (zum Bauen) | Greifen an der Hüfte, an der sie hängt | – | – | – |
| Karte (Werkzeug, jede Welt)                                                        | aus dem Regal in die Hand nehmen; **Trigger** schaltet den Maßstab weiter (20 → 40 → 80 → 160 m)                                                                                                                                                              | –                                                                                                                                                                                                                                                                                                                                              | –                                                           | –                                          |
| Grundriss malen                                                                    | an der Palette eintunken, dann Trigger auf der Miniatur **halten** und ziehen — was der Zeiger überstreicht, wird gesetzt                                                                                                                                     | Linkstaste halten und den Blick schwenken                                                                                                                                                                                                                                                                                                      | –                                                           | –                                          |
| Fläche füllen                                                                      | Tafel am Modell → _Fläche_, dann zwei Ecken: aufziehen und loslassen, **oder** zweimal tippen. Boden füllt die Fläche, Wand zieht ihren Rand                                                                                                                  | dito                                                                                                                                                                                                                                                                                                                                           | –                                                           | –                                          |
| Karte weglegen (zum Bauen) | über der Hüfte loslassen, oder Menü → _Karte weglegen_ — erst dann steht das Gebaute fest da, und erst dann ist es gespeichert | Menü → _Karte weglegen_ | – | dito |
| Welt speichern / mitnehmen | Bauplatz oder Testwelt, Menü → _Welt sichern_: im Browser speichern, als Datei exportieren, eine Datei importieren, Gespeichertes verwerfen | dito — Export und Import gehen nur hier sinnvoll | – | dito |
| Aussehen                                                                           | Menü → _Aussehen_: drei Zeilen — **Kopf** (vier), **Hut** (acht, von der Kochmütze bis zur Krone), **Körper** (fünf Kochjacken); alle im Raum sehen es                                                                                                        | dito                                                                                                                                                                                                                                                                                                                                           | –                                                           | dito                                       |
| Umkleide                                                                           | vor den **Kleiderschrank** stellen und `A` — die Welt verblasst, die siebzehn Sachen stehen im Ring auf den Kacheln um den Schrank herum, der Spiegel an der Tür zeigt sie an einem; noch ein Druck auf den Schrank, und man steht wieder da, wo man stand                                                                                                                 | dieselbe Taste                                                                                                                                                                                                                                                                                                                                | `A`                                                         | Knopf `A`                                  |
| Kart: Helm                                                                         | Klemmbrett → _Helm_: Visierrand steht fest im Blick, gegen Übelkeit                                                                                                                                                                                           | dito                                                                                                                                                                                                                                                                                                                                           | –                                                           | –                                          |
| Kart: Werte eintippen                                                              | Klemmbrett → _Werte eingeben_ → Zeile, dann der Zifferblock vor dem Kopf                                                                                                                                                                                      | dito, mit der echten Tastatur                                                                                                                                                                                                                                                                                                                  | –                                                           | –                                          |
| Zurücksetzen                                                                       | `B` / `Y` oder Menü                                                                                                                                                                                                                                           | `R` oder Menü                                                                                                                                                                                                                                                                                                                                  | –                                                           | Menü                                       |
| Zuschauen                                                                          | Menü → Verbindung → Zuschauen                                                                                                                                                                                                                                 | Panel _Verbindung_ → _Zuschauen_                                                                                                                                                                                                                                                                                                               | –                                                           | dito                                       |
| Zuschauer-Kamera drehen                                                            | – (Kopf bleibt deiner)                                                                                                                                                                                                                                        | ziehen mit der Maus                                                                                                                                                                                                                                                                                                                            | –                                                           | wischen                                    |
| Zuschauer-Abstand                                                                  | Menüeintrag _Abstand_                                                                                                                                                                                                                                         | Mausrad oder Regler                                                                                                                                                                                                                                                                                                                            | –                                                           | Regler                                     |

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
Controller nicht mehr auseinanderhalten. Zum Ausprobieren gab es den
**Eingaberaum**; seit er gelöscht ist, sieht man es an der Hand, die eine
Kiste greift.

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
ist die eigene Methode, weil es **mehrere** Orte gibt, an denen so ein Modell
gestellt werden muss und nur einer davon eine Hand ist: die Hand
(`applyHold`), die **Bühne der Werkzeugseite** und der **Avatar der
Mitspieler**. Dazu kamen der Halter und die Kopie an den beiden Justierständen
des Eingaberaums. Was hingestellt wird, hält niemand, also läuft `applyHold`
dort nie — und genau daran ist es einmal schiefgegangen: siehe
_Eingemessene Griffe_.

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

Alle drei gelten für Werkzeuge, Waffen, Gürtelplätze und die Gegenstände dieser
Welt. Ein einzelnes Ding darf aber sagen, dass für **es** nur der Meter gilt —
alles in der Küche tut das, und warum, steht gleich unter _Vier Reichweiten?
Nein — drei, und eine Einschränkung_.

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

### Ein Griff ist auch für das, was kein Werkzeug ist

Ein **Griff** war bisher etwas, das nur Werkzeuge haben: die Pistole, die
Taschenlampe, der Hammer — alles Türkise, alles mit eingemessener Haltung
(_Eingemessene Griffe_). Seit die Küche in der Brille gespielt wird, gilt
dasselbe für eine Pfanne: Man hält sie am Stiel, nicht an der Mulde, und man
hält einen Teller am Rand oder von unten, nicht in der Mitte.

Also ist es **dieselbe Sache und dieselbe Rechnung**. Was ein Ding über das
Greifen sagt, steht in `core/grabHandles.ts` und hängt als Feld an der Auskunft,
die es ohnehin schon gibt (`InteractionSpec.grab` in `core/interaction.ts`) —
kein zweites System daneben, sondern die zweite Hälfte derselben Antwort:
`kind` sagt, **ob** man ein Ding nimmt, `grab` sagt, **wo** und **von wo aus**.

Ein Griff ist dort eine `HoldPose` im Raum des Dings, mit dem Rahmen aus
`tools/gripFit.ts`: **+Y ist die Achse** (oben aus der Faust heraus,
Daumenseite), **-Z ist vorne** (wohin der Zeigefinger zeigt). Gebaut wird er aus
zwei Richtungen (`handle(id, at, axis, back)`), und in die Hand gelegt wird er
mit `holdForHandle` — der **Umkehrung** von `gripFit.gripInHand`. Damit landet
jeder Griff auf demselben Griffpunkt wie der einer Pistole, und eine Pfanne
liegt in derselben Faust wie jedes Werkzeug.

#### Der Haltezylinder — und warum die Stange nicht die Faustachse ist

Ein Punkt mit zwei Richtungen ist alles, was `handle()` braucht, und für den
Rand eines Tellers ist es auch alles, was es gibt. Für ein **Gerät** war es zu
wenig, und zwar zweimal hintereinander: Der Feuerlöscher zielte quer zur Hand,
der Topf hatte den **Stiel der Pfanne** mitten in seiner Suppe (er benutzte
buchstäblich dieselbe Zeile), und die Pfanne hing hochkant hinter der Faust.
Alle drei Zahlenreihen stimmten für sich, und keine ließ sich nachsehen.

Seitdem geben die drei ihre Griffe als **Haltezylinder** an
(`grabHandles.HoldBar`, gebaut mit `holdBar(id, {from, to, radius}, up, ahead)`):

| Angabe        | Was sie sagt                                                                 |
| ------------- | ---------------------------------------------------------------------------- |
| `from` / `to` | die beiden Enden der **Stange am Modell**; die Hand liegt in ihrer Mitte      |
| `radius`      | wie dick sie ist                                                             |
| `up`          | welche Richtung am Ding in der Hand **oben** bleibt — das wird die Faustachse |
| `ahead`       | wohin vom Griff aus der **Körper** des Dings liegt — das wird das Vorne (-Z)  |

Der Handrücken (`back`) fällt dabei ab und wird nicht mehr geraten:
`back = ahead × up`, und damit ist `−Z = ahead` (ein Test rechnet es nach).

**Die Stange ist ausdrücklich nicht die Faustachse**, und das ist der Fehler,
der zweimal gemacht wurde. Ein Hammer hat beides an derselben Stelle: Sein
Stiel liegt in der Faust, sein Kopf sitzt oben auf der Daumenseite. Eine
**Pfanne** hat es nicht: Ihr Stiel liegt waagerecht, und die Faustachse steht
in der Brille senkrecht — wer den Stiel in die Achse legt, bekommt eine Pfanne
hochkant, und dann liegt das Patty an der Wand. Also sagt der Zylinder, **wo**
die Hand liegt, und `up`/`ahead` sagen, **wie herum** das Ding dabei hängt. Für
alle drei Geräte ist `up` die Senkrechte des Dings und `ahead` die Richtung,
in die es vor der Faust zeigen soll — die Mulde, der Topfbauch, die Düse.

Und weil der Zylinder das gemessene Stück des Modells ist, kann man ihn
**ansehen**: `Menü → Grafik → Griffe zeigen` malt ihn (siehe _Griffe zeigen_),
und der Prüfstand `handles-preview.html` (`npm run handles`) macht Bilder
davon. Genau daran wurden die drei eingemessen, und genau daran prüft man sie
nach, wenn jemand das Modell tauscht.

Die Fälle unterscheiden sich nur in der Zahl der Griffe:

| Fall                      | Beispiele                                     | Was es heißt                                      |
| ------------------------- | --------------------------------------------- | ------------------------------------------------- |
| **Kein Griff**            | Brötchen, Tomate, Salat, Patty                | „wie beim Companion Cube": zupacken, wo man fasst |
| **Ein Haltezylinder**     | Pfanne am Stiel, Löscher am Tragebügel        | die gemessene Stange, und sonst hält man es verkehrt |
| **Mehrere**               | Teller: acht am Rand, einer von unten; Topf: beide Ohren | die **Hand** wählt: der nächste gewinnt |
| **Vier, aus einer Regel** | jedes Küchenmöbel                             | Mitte jeder Kante — siehe _Anfassen in der Küche_ |

Welcher von mehreren es wird, entscheidet `nearestHandle` — nach **Abstand** und
nicht nach Winkel: Acht Griffe am Tellerrand unterscheiden sich nur darin, wo
sie liegen, und ein Griff, der bei fast gleichem Abstand zwischen zwei Nachbarn
springt, ist schlimmer als einer, der einen halben Zentimeter danebenliegt.
Gewählt wird **einmal, beim Zugreifen**, und danach bleibt er stehen.

Die Tabelle für die Küche steht in `worlds/test/zones/kitchenGrab.ts` — dort und
nicht im `core`, weil nur die Küche weiß, was ein Stiel ist. Ihre Zahlen hängen
an der **gemessenen Hülle** des Netzes und nicht an abgeschriebenen Zentimetern:
Pfanne, Topf und Feuerlöscher kommen aus `public/models/kitchen.glb`, und ein
ausgetauschtes Modell bringt neue Maße mit. Die einzigen absoluten Zahlen dort
sind die drei **Halbmesser** der Zylinder, und die sind es aus einem Grund: Ein
Anteil wovon? Die Dicke eines Stiels hat mit der Breite einer Pfanne nichts zu
tun — sie ist die Dicke eines Rohrs, am Modell gemessen.

Drei Dinge daraus sind am Modell abgelesen und stehen deshalb im Klartext
daneben: Der **Pfannenstiel** steigt um gut 8°, weshalb seine beiden Enden
verschieden hoch liegen. Die beiden **Topfohren** stehen sich gegenüber, aber
ihre Verbindungslinie liegt 9° schräg zur x-Achse — neun Grad sind hier sechs
Zentimeter, und bei einer Stange von 2,4 cm Halbmesser der Unterschied zwischen
„der Zylinder liegt auf dem Griff" und „daneben". Und die **Düse** des Löschers
zeigt nach +x, der Bügel nach -x; vorher stand dort -z als Vorne, und genau um
diese Vierteldrehung stand er in der Faust verkehrt.

Die vierte Zeile ist die einzige, die gar keine Tabelle ist: Ein **Möbel**
bekommt seine vier Rand-Griffe aus `grabHandles.rimHandles`, generisch in der
Mitte der vier Kanten. Wofür und auf welcher Höhe, steht bei _Anfassen in der
Küche_ beim Baumodus.

### Vier Reichweiten? Nein — drei, und eine Einschränkung

Die drei Reichweiten (`touch`, `near`, `remote`) bleiben, wie sie sind. Neu ist,
dass ein Ding sagen darf, dass für **es** nur der Meter gilt:

| `GrabReach` | Wer                                                       | Was geht                                 |
| ----------- | --------------------------------------------------------- | ---------------------------------------- |
| `'all'`     | die Vorgabe: Werkzeuge, Waffen, Gürtelplätze, Gegenstände | Anfassen, Nahgreifen, Ferngreifen        |
| `'moore'`   | alles in der Küche, die Möbel eingeschlossen              | nur das eigene Feld und die acht daneben |

Die **Moore-Nachbarschaft** ist mit Absicht ein Quadrat und kein Kreis: Die
Küche steht auf Kacheln von einem Meter, und „das Feld daneben" ist die Einheit,
in der man hier denkt — ein Kreis von 1 m Halbmesser ließe genau die vier Ecken
herausfallen, die man von oben als Nachbarn sieht. Gemessen wird gegen die
**nächste Ecke** des Dings und nicht gegen seine Mitte: Ein Tresen ist zwei Meter
lang, und wer an seinem einen Ende steht, hat seine Mitte einen Meter weiter
(`grabHandles.mooreSteps`, `grabReaches`, `PortalWorld.useByHand`).

**Und das ist die Pointe:** Die Reichweite kommt weiter aus der **Figur** und
ihrer Blickrichtung, wie am Schirm. Was die Brille erlaubt, ist allein die
**feinere Wahl innerhalb** dieser Reichweite — welches der neun Felder es wird,
und an welchem Griff man anfasst. Niemand soll mit der Brille weiter abstellen
können als am Schreibtisch.

Gefragt wird die Einschränkung genau an der Stelle, an der eine **Hand** sich
ein Ding aussucht (`PortalWorld.useByHand`). Von oben und aus den Augen ändert
sie nichts: Dort gibt es die drei Stufen gar nicht, sondern `A` und den Strahl
aus der Brust mit seinen 1,5 m (`core/usable.USE_REACH`) — und der war schon
immer kürzer als ein Ferngriff.

### Was ein Ding will — und womit man es bekommt

Bis hierher gab es über ein bedienbares Ding genau **eine** Auskunft:
„benutzbar" (`core/usable.ts`). Gedrückt wurde `A`, und `A` tat je nach Möbel
etwas anderes. Das reicht, solange es nur eine Taste gibt — und es reicht in
dem Augenblick nicht mehr, in dem dieselbe Küche in drei Ansichten gespielt
wird: von oben mit `A`, aus den Augen mit Maus und `E`, in der Brille mit Hand,
Trigger und Griff.

Ein Knopf will **gedrückt** werden, ein Brötchen will **gegriffen** werden, und
das ist dieselbe Aussage in allen drei Ansichten. Was sich unterscheidet, ist
nur, womit man sie ausspricht. Genau so steht es jetzt auch im Code
(`core/interaction.ts`), in drei getrennten Stücken:

| Stück           | Code                         | Was es ist                                                  |
| --------------- | ---------------------------- | ----------------------------------------------------------- |
| **Absicht**     | `InteractionKind`            | hängt am Ding: `press`, `grab`, `none`                       |
| **Auflösung**   | `resolveInteraction`         | macht daraus je Ansicht Geber, Tippen/Halten und den Hinweis |
| **Ausnahme**    | `InteractionSpec.views`      | ein einzelnes Ding weicht in einer einzelnen Ansicht ab      |

Die Absicht ist das, was ein Mensch über das Ding sagen würde. `press` ist
alles, was man **bedient**, ohne dass danach etwas in der Hand liegt — Knopf,
Hebel, Schalter, Tür, Ausgabetheke, Mülleimer, Spüle, Schneidebrett. `grab` ist
alles, was man **nimmt** — das Brötchen aus der Ausgabe, der Teller vom Stapel,
die Pfanne vom Herd, der Topf, der Feuerlöscher aus der Halterung, im Umbau
auch das Möbel selbst. `none` ist angemeldet und trotzdem ohne Angebot: die
leere Hand vor der leeren Fläche. Es leuchtet dann kein Saum, und es steht kein
Hinweis da.

Mehr Absichten gibt es nicht, und das ist eine Entscheidung. Insbesondere ist
**`hold` keine Absicht.** Dass man in der Brille die Greif-Taste gedrückt
_hält_, liegt nicht daran, dass der Topf etwas anderes will als von oben — es
liegt daran, dass ein Controller in der Hand das so am besten ausdrückt.
_Halten_ ist deshalb eine Eigenschaft der **Bedienung** (`InteractionPress`)
und keine der Absicht. Käme eines Tages ein Ding dazu, das wirklich eine eigene
Absicht hat — ein Schalter, der umgelegt bleibt, eine Kurbel, die man dreht —,
bekommt es eine eigene Zeile und eine Begründung daneben. Vorher nicht: Eine
Absicht, die nirgends etwas anderes bewirkt, ist ein Wort und keine
Unterscheidung.

Die Ableitung steht als Tabelle da und nicht als `if`-Kette
(`INTERACTION_DEFAULTS`):

| Absicht | von oben (`topDown`) | aus den Augen (`firstPerson`) | in der Brille (`vr`)          |
| ------- | -------------------- | ----------------------------- | ----------------------------- |
| `press` | `A` / `E`, tippen    | linke Maustaste / `E`, tippen | Berühren / Trigger, tippen      |
| `grab`  | `A` / `E`, tippen    | linke Maustaste / `E`, tippen | Greifen / Trigger, **halten**   |
| `none`  | —                    | —                             | —                               |

**„Halten" heißt dabei nicht „nur halten".** Die Greif-Taste geht beim Zufassen
herunter und legt beim Loslassen ab — wer sie nur kurz antippt, behält das Ding
in der Hand und legt es mit dem **nächsten** Druck ab. Beides ist dieselbe Zeile
in der Ableitung; unterschieden wird erst beim Loslassen, und wie, steht unter
_Halten oder Tippen_.

**Und der Trigger nimmt auch.** Hier stand einmal das Gegenteil: „Der Trigger
gehört dem, was man in der Hand hält, und ein Brötchen, das schon auf den
Zeigefinger springt, nähme dem Greifen seine einzige unmissverständliche
Geste." Die erste Hälfte stimmt weiter — der Feuerlöscher spritzt mit dem
Trigger, das getragene Möbel wendet mit ihm —, die zweite hat sich in der
Brille nicht bestätigt: Wer eine Pfanne **anzielt**, will sie haben, und ohne
den Trigger muss er mit der Faust hinlangen, auch wenn sie eine Armlänge weiter
auf dem Herd steht. Seitdem stehen beide Geber nebeneinander, und keiner sticht
den anderen (`handUse.handUseFires` fragt jeden für sich, siehe unten).

Ein Ding, für das das **nicht** gelten soll, meldet weiter nur `grip` an — und
genau eines tut das: das Möbel im Umbau. Sein Trigger ist beim Tragen schon
vergeben (`kitchen.buildTurn` wendet damit), und derselbe Druck dürfte es nicht
aufheben und im selben Bild einmal weiterdrehen.

**Von oben ändert sich nichts**, und das ist Absicht: `A` (am Schreibtisch `E`)
tut, was es immer getan hat, für jede Absicht gleich. Dort gibt es keine Hand,
keinen Zeigestrahl und keine zweite Taste, an der man unterscheiden könnte —
und ein Brötchen, das man von oben plötzlich anders nähme als bisher, wäre eine
Änderung ohne Gewinn.

Welche Ansicht gerade läuft, sagt `interactionView(topDown, presenting)` — die
eine Stelle, an der aus den zwei Wahrheitswerten der Welt eine Ansicht wird,
samt Rangfolge: **die Brille sticht.**

**Die Ausnahme ist Feld für Feld.** Ein Ding, das `press` sagt, in der Brille
aber gehalten werden will, schreibt `views: { vr: { press: 'hold' } }` und
behält die Geber der Ableitung. Wer die Geberliste einer Ansicht leer räumt,
schaltet das Ding dort ab: `interactive` wird falsch, und der gelbe Saum bleibt
aus — denn ein Ding, mit dem in dieser Ansicht nichts geht, hat nichts
anzukündigen.

**Der Hinweis gehört zum Datenmodell** und wird nicht in jeder Welt neu
erfunden: „A / E", „Linke Maustaste / E", „Greifen halten". Er liest die
**eingestellte** Belegung (`core/inputMap.ts`) und nicht eine feste Tabelle —
wer _Benutzen_ im Menü auf `F` legt, liest danach „Linke Maustaste / F". Die
Aufschrift einer Taste (`keyLabel`) steht seit dieser Änderung ebenfalls in
`inputMap.ts`; sie stand vorher zweimal da — einmal in `core/App.ts`, einmal in
`src/inputs/main.ts` —, und die beiden Tabellen liefen bereits auseinander.
Solange keine Pad-Marke bekannt ist, heißt der Benutzen-Knopf `A`: Das ist
keine geratene Xbox-Aufschrift, sondern die Aufschrift des Knopfes auf dem Glas
(`index.html`, `#touch-a`).

Und die Arbeitsteilung mit dem, was schon da war:
`core/usable.ts` beantwortet **was ist gemeint** (`pickUsable`, der Strahl aus
der Brust, die Reichweiten `USE_REACH`/`USE_TOUCH`), `core/interaction.ts`
beantwortet **was will es**. Das `Usable` trägt die Absicht als Feld
(`interaction`) und weiß von Ansichten nichts; aufgelöst wird sie dort, wo
ohnehin schon feststeht, was gemeint ist (`PortalWorld.updateUsables`).
`usePrompt` bleibt, was es war — der Satz über die **Wirkung** („Tomate
nehmen"). Der Hinweis sagt das **Womit**. Beides getrennt, weil das eine am
Gericht hängt und das andere am Gerät.

In der Testküche ist die Absicht keine feste Eigenschaft eines Möbels, sondern
kommt aus der Regel, die ohnehin entscheidet, was ein Druck bewirkt
(`kitchenCarry.kitchenInteraction`): Was danach in der Hand liegt (`take`), ist
`grab`; alles, was an der Station passiert — ablegen, schneiden, spülen, **den
Topf am Becken füllen**, wegwerfen, servieren, löschen —, ist `press`. Auch `combine` ist ein Druck,
obwohl der Saum dabei am Liegenden hängt (`meansContent`): Wer ein Patty aufs
Brötchen legt, greift nicht danach, er legt es hin. Das Feld fragt bei jedem
Lesen neu, genau wie `usePrompt` daneben — dieselbe Ausgabe will einmal
gegriffen und im nächsten Augenblick gedrückt werden, ohne dass sich das Netz
dazwischen ändert.

Am Schirm aus den Augen benutzt seitdem auch die **linke Maustaste**, was vor
einem steht — aber nur, wenn wirklich etwas dasteht
(`PlayerRig.useCandidate`) und der Zeiger schon geholt ist, damit der Klick
ins Bild nicht aus Versehen bedient. Anders als `A` ist sie kein Knopf für
zwei Dinge: Ein Klick ins Leere tut nichts und springt vor allem nicht.

### Benutzen mit der Hand — die Brille

In der Brille gibt es die Figur, den Strahl aus ihrer Brust und `A` weiterhin,
aber davor gibt es **zwei Hände**, und die sind die eigentliche Antwort. Was
sie entscheiden, steht als reine Rechnung in `core/handUse.ts`, die Geometrie
dazu kommt aus dem Greifen (`worlds/portal/grabReach.ts`) und nicht aus einer
zweiten Nähe-Rechnung daneben:

- **Anfassen**: Steckt die Hand in der Greifbox des Dings — seine **echte**
  Ausdehnung plus die 9 cm aus `GRAB_MARGIN`, nicht der großzügige
  Zielhalbmesser von oben —, ist das die Antwort, ohne dass irgendwohin
  gezeigt werden müsste. Die Hand leuchtet dabei, genau wie beim Anfassen
  eines Gegenstands.
- **Zeigen**: Sonst entscheidet der Zielstrahl derselben Hand, bis
  **3 m** (`HAND_USE_RANGE`). Nicht die neun Meter des Ferngreifens: Die sind
  für Gegenstände gedacht, die man sich holt, und auf Knöpfe übertragen drückt
  man damit die Tür am anderen Ende der Halle, weil man beim Umsehen einmal
  dorthin gezeigt hat.

**Anfassen sticht Zeigen**, unter Gleichen gewinnt das Nächste — dieselbe
Rangfolge wie beim Greifen und wie bei `pickUsable` von oben. Es kann deshalb
nie beides zugleich auslösen, auch wenn Hand und Strahl auf demselben Ding
liegen.

Und dann die Knöpfe, genau wie es die Tabelle oben verspricht: Ein `press`
antwortet auf die **Berührung** selbst oder auf den **Trigger**; ein `grab` auf
die **Greif-Taste** oder ebenfalls auf den Trigger.

**Gefragt wird die Geberliste, und zwar Eintrag für Eintrag.** Hier stand
einmal `if (inputs.includes('grip')) return buttons.grip;` — eine Zeile, die
die Greif-Taste nicht nur zuließ, sondern alle anderen **abwies**. Ein Ding,
das Greifen *und* Trigger anmeldete, antwortete damit nur auf das Greifen, und
das war ein gemeldeter Fehler mit einem sehr konkreten Gesicht: Ein Steak in
der Pfanne ließ sich auf kein Brötchen legen, weder mit dem Trigger noch mit
der Greif-Taste, während es von oben mit `A` ging. Der Grund ist derselbe, aus
dem der Trigger überhaupt dazugekommen ist — wer mit der Pfanne vor dem
Brötchen steht, hat seine **Faust** eine Pfannenlänge daneben: Die Mulde liegt
über der Platte, die Hand nicht. Gezielt wird mit dem Strahl, und der trifft.

**Die Berührung muss entprellt werden**, sonst ist sie unbrauchbar: Ein Knopf,
den die bloße Berührung drückt, wird sechzigmal je Sekunde gedrückt, solange
die Hand darin liegt — in der Küche wanderte der Tellerstapel Bild für Bild
durch die Hand. Es zählt deshalb die **Eintrittsflanke**: erst wieder heraus,
dann antwortet dasselbe Ding erneut. Gemerkt wird dafür das **Objekt** und
nicht die Anmeldung, und das ist der Unterschied zwischen einer Küche, die
läuft, und einer Schleife: Eine Station meldet sich neu an, sobald sich
ändert, was ein Druck bewirkt (die Ausgabe gibt erst ein Brötchen, dann nimmt
sie einen Teller entgegen) — hinge die Entprellung an der Anmeldung, legte
dieselbe liegende Hand im nächsten Bild zurück, was sie eben genommen hat.
Der Trigger und die Greif-Taste brauchen das nicht: Sie sind selbst schon
Flanken.

**Greifen und Benutzen sind zusammengeführt und nicht nebeneinandergelegt.**
Ein `grab`-Usable ist kein zweiter Draht auf der Greif-Taste, sondern derselbe:
Ein Brötchen aus der Ausgabe *ist* ein Gegenstand, den man greifen will, es hat
nur keinen Körper in der Physik, an dem die Faust sich festhalten könnte. Die
Abfrage steht deshalb genau dort, wo die Hand sonst nach Gegenständen sucht
(`PortalWorld.updateReach`) — und ausdrücklich **hinter** ihr: Was einen Körper
hat, gewinnt. Am vorhandenen Greifen von Werkzeugen, Waffen, Gürtelplätzen und
Gegenständen ändert sich damit nichts, und das war die Bedingung.

Drei Vorfahrten stehen daneben, und alle drei sind die vorhandenen:

- Eine Hand, die schon ein **Werkzeug** hält oder einen Gegenstand greift,
  benutzt nichts — ihr Trigger gehört dem, was sie hält.
- Liegt der Strahl einer Hand auf einer **Menüseite**, gehört ihr Trigger dem
  Menü (`Pointer.hoveringWith`, dieselbe Regel wie bei den Werkzeugen). Die
  andere Hand arbeitet weiter.
- **Ein Druck, eine Wirkung**: Zwei Hände auf demselben Knopf lösen ihn im
  selben Bild einmal aus.

`A` am Controller bleibt daneben bestehen und benutzt weiter über den Strahl
aus der Brust — ein dritter Weg, der niemandem im Weg steht: Er liegt auf einem
Knopf, den weder die Hand noch der Griff belegen.

**Und in der Hand bleibt es, bis man es ablegt.** Der `grab`-Griff löst aus,
wenn die Faust **zugeht** (`squeeze.justPressed`) — genau wie beim Greifen eines
Gegenstands. Was danach passiert, ist nicht dasselbe: Ein Gegenstand fällt,
sobald man loslässt; ein genommenes Brötchen hat keinen Körper, der fallen
könnte. Ob es das Loslassen ablegt oder erst der nächste Druck, entscheidet
deshalb nicht die Physik, sondern die **Art des Drucks** — und die steht gleich
darunter.

#### Und der gelbe Saum folgt in der Brille der Hand

Hier stand bis vor Kurzem, das sei „ausdrücklich offen": Der Saum folgte in der
Brille weiter dem Strahl aus der **Brust** (`pickUsable`), während die Hand
entschied, was wirklich passiert. Zwei Auskünfte für zwei Wege, keine davon
falsch — und regelmäßig auf zwei verschiedene Dinge zeigend. In der Küche war
das kein Schönheitsfehler, sondern ein Bedienfehler: Man hielt einen Salat in
der Hand, zielte damit auf die Zeile **links**, legte ihn auch dort ab — und
sah die Zeile **vor** sich leuchten.

Jetzt wählt in der Brille die Hand, und am Schirm wählt weiter der Körper
(`PortalWorld.showUse`):

| Ansicht                    | Wer wählt                                            |
| -------------------------- | ---------------------------------------------------- |
| von oben, aus den Augen    | der Strahl aus der Brust (`core/usable.pickUsable`)  |
| in der Brille              | die Hand (`core/handUse.pickHandUse`, je Hand eine)  |

Zwischen den **beiden Händen** gilt dieselbe Rangfolge wie innerhalb einer:
Anfassen sticht Zeigen, unter Gleichen gewinnt das Nächste. Der Körper bleibt
der **Rückfall**, auch in der Brille: Zeigt keine Hand auf etwas, meint `A`
weiter, was vor der Figur steht, und dann soll das auch leuchten — ein Saum,
der in dem Augenblick ausginge, in dem die Taste noch wirkt, wäre derselbe
Fehler in der anderen Richtung.

Zwei Zeilen Ablauf hängen daran: Worauf eine Hand zeigt, steht erst in
`updateGrabs` fest, also wird der Saum **danach** gesetzt und nicht davor
(`update` ruft `updateUsables`, `updateGrabs`, `showUse`). Ein Saum, der ein
Bild hinterherhinkt, zeigt beim Umsehen regelmäßig auf das Möbel von eben.

**Was noch offen ist**: Einen Ort, an dem der Hinweistext angezeigt wird, gibt
es nicht; er steht bereit (`PortalWorld.useInteraction.hint`), die Tafel über
der Figur ist seinerzeit mit gutem Grund verschwunden.

### Halten oder Tippen — zwei Greif-Arten, beide gültig

In der Brille kommt ein Küchending auf zwei Arten in die Hand und auf zwei Arten
wieder heraus, und man muss sich vorher für keine entscheiden:

- **Halten** — Greif-Taste drücken, damit herumlaufen, beim **Loslassen** wird
  abgelegt.
- **Tippen** — einmal drücken und sofort loslassen: Das Ding bleibt in der Hand.
  Der **nächste** Druck legt es ab.

Unterschieden wird daran, ob zwischen Drücken und Loslassen **etwas passiert
ist** — und „etwas" ist zweierlei: verstrichene **Zeit** (mehr als 0,35 s,
`HAND_TAP_SECONDS`) oder zurückgelegte **Strecke** (mehr als 8 cm,
`HAND_TAP_METRES`). Ein Tippen ist der kurze, stille Klick und sonst nichts.

Beides zusammen, und zwar aus guten Gründen. Nur die Zeit wäre falsch für den,
der den Topf packt, ihn in einem Zug dreißig Zentimeter schiebt und loslässt —
das dauert keine Drittelsekunde und meint ganz sicher „ablegen". Nur die Strecke
wäre falsch für den, der drückt und eine Sekunde überlegt, wohin — der hat sich
keinen Millimeter bewegt und meint trotzdem „halten". Und „ob beim Loslassen ein
Ablageplatz dasteht" wäre am falschesten: Dann hieße derselbe kurze Klick vor der
Arbeitsplatte etwas anderes als einen Schritt daneben, und eine Geste, die je
nach Ort etwas anderes heißt, lernt niemand.

Die Regel steht in `core/handUse.ts` (`gripPressKind`, `gripPressDrops`) und wird
dort geprüft; die Uhr und das Maßband laufen in `PortalWorld.trackGripPress`.

### Abgelegt wird beim Loslassen und nicht beim Hinlangen

Das war ein Fehler: Eine Arbeitsplatte löste aus, sobald die **Hand** sie
berührte — wer mit dem Topf daran vorbeikam, hatte ihn abgestellt, ohne etwas
gedrückt zu haben. Richtig ist: in der Nähe sein **und** die Greif-Taste
loslassen (oder erneut drücken, wenn man nur getippt hatte).

Geschrieben ist das als Ausnahme für **eine einzelne Ansicht**, genau so, wie
`core/interaction.ts` sie vorsieht: Sechs Taten geben etwas aus der Hand
(`place`, `work`, `combine`, `trash`, `scrape`, `serve`), und die sechs melden
für die Ansicht `vr` Greif-Taste **und Trigger** an statt der Berührung
(`kitchenCarry.kitchenInteractionSpec`, `kitchenGivesUp`). Die **Berührung**
bleibt ausgeschlossen, und nur darum ging es hier je: Wer mit dem Topf an der
Arbeitsplatte vorbeiläuft, läuft daran vorbei. Der Trigger ist dagegen ein
ausdrücklicher Druck auf etwas Angezieltes und war von Anfang an gemeint —
ohne ihn ließ sich ein Steak aus der Pfanne auf kein Brötchen legen, weil die
Faust dabei eine Pfannenlänge neben dem Brötchen steht. **Von oben und am
Schreibtisch ändert sich dadurch nichts** — `A` tut, was `A` immer getan hat.

**Ein vergebener Trigger wird nicht zweimal vergeben.** Er hat in dieser Küche
zwei angestammte Aufgaben, und beide gehören dem, was schon in der Hand liegt:
Er **spritzt** den Feuerlöscher (`spray`) und **wendet** ein getragenes Möbel
(`buildTurn`). Solange eines davon in der Hand ist, melden die Stationen ihn
nicht mehr an (`kitchenInteractionSpec(deed, grab, freeTrigger)`, gefüttert von
`kitchen.triggerFree`) — sonst drückte man ihn zum Löschen und stellte den
Löscher dabei auf die Arbeitsplatte. Die Greif-Taste bleibt in beiden Fällen,
und die Regel steht in `kitchenCarry.ts`, wo sie ein Test nachrechnet; nur
**wissen**, was in der Hand liegt, kann die Zone.

Das **Löschen** (`douse`) gehört ausdrücklich nicht dazu: Es nimmt der Hand
nichts weg, der Löscher bleibt darin, und wer damit an den brennenden Herd
tritt, soll ihn auch weiter durch Hinlangen löschen können.

### Was in der Brille in der Hand liegt

Ein gegriffenes Küchending hängt in der Brille an `ControllerState.hold` der
Hand, die zugegriffen hat — demselben Knoten, an dem jedes Werkzeug hängt, und
der bei einer getrackten Hand schon den Versatz zum Zeigestrahl trägt
(`core/handHold.ts`). Damit dreht sich die Pfanne mit dem Handgelenk.

Von oben und am Schreibtisch bleibt alles beim Alten: Das Getragene hängt vor dem
Bauch (`core/chefFit.CHEF_CARRY`). Fällt ein Controller weg oder wird die Brille
abgesetzt, holt `kitchen.backToBelly` es dorthin zurück.

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
Blickrichtung, und beim _Losgehen_ ist das auch genau richtig: Man schaut hin,
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

Die **Werkzeug-Pose** (`holdPosition`, `holdRotation`) wird nicht geraten,
sondern **gemessen**: Das Werkzeug steht auf die Scheibe gerichtet still, die
Hand kommt daran, wie sie es halten soll, und
`src/worlds/portal/tools/toolPose.ts` (mit Test) rechnet die Pose aus, die
genau das ergibt — abzüglich der Aim-Korrektur, die jedes Werkzeug ohnehin
bekommt. Der Stand dafür war der Schießgang des Eingaberaums; heute zieht man
dieselben sechs Zahlen auf der Werkzeugseite (_Bearbeiten_). Bis sie im
Konstruktor stehen, merkt sich der Browser sie
(_Einstellungen → Werkzeug-Posen zurücksetzen_ wirft sie wieder weg).

Ein **Justier-Werkzeug**, das dasselbe in der Luft tat, gab es einmal und gibt
es nicht mehr. Es konnte alles — Werkzeuge, Hände, Anbauteile —, aber gegen
nichts: das Vergleichsstück hing an einem ausgestreckten Arm und zitterte mit.
Der Stand steht still, und das ist der ganze Unterschied zwischen „ungefähr"
und „gemessen".

Die Pose eines **Anbauteils** liegt im Raum **des Werkzeugs** (nicht der Hand),
deshalb bleibt ein einmal ausgerichteter Rotpunkt ausgerichtet, egal wie die
Waffe später gehalten wird.

### Die Kartzone

Ein Kart ist sieben reine Module und ein bisschen Verdrahtung:
`kartSettings.ts` (die Werte samt Bereich, Raste und Einheit — dieselbe Idee
wie `weaponSettings.ts`), `kartDynamics.ts` (ein Schritt Fahren),
`kartCourse.ts` (die Strecke als Liste von Bauteilen), `kartTrack.ts` (die
Mittellinie plus halbe Breite plus die Fläche der Boxengasse), `kartPit.ts`
(der Grundriss der Gasse), `kartView.ts` (der Nachlauf des Kopfes) und
`kartRace.ts` (Runden, Reihenfolge, Tafel). Alle sieben ohne three.js und mit
Jest-Test; `Kart.ts` und die Zone im Süden der Testwelt
(`test/zones/kart.ts`) sind nur noch Blech.

**Die Strecke ist gebaut und nicht gezeichnet.** Sie war einmal ein Dutzend
Kontrollpunkte in Metern mit einem Catmull-Rom-Spline darüber — eine hübsche
Linie, deren Lage man nur in der Brille nachsehen konnte, die nirgends am
Raster lag, und bei der „mach die Gegengerade zwei Zellen länger" hieß, zwei
Punkte zu verschieben und zu hoffen. Jetzt ist sie eine **Liste von Teilen**
(`kartCourse.ts`), und ein Teil kennt drei Dinge: seine Sorte (Gerade, links,
rechts), wie lang bzw. wie eng es ist, und wo es aufhört. Daraus folgt alles
Übrige — Mittellinie, Ausmaße, Rundenlänge, Asphalt, Randsteine, Reifenstapel.

Zwei Zahlen tragen das Ganze, und beide sind Kacheln:

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
krummen Zwischenwert zusammen. Auf dem Metergitter misst die Runde 35 × 25 m
mit vier Kurven in vier verschiedenen Radien: eine, die man voll fährt, zwei
mittlere und eine enge, in der ein Kart mit wenig Traktion querstellt.

**Die Boxengasse** liegt kachelbündig an der Zielgeraden (`kartPit.ts`): zwei
Buchten mit einer Säule dazwischen, an jeder Rückwand eine Portaltafel, davor
der Asphalt der Gasse — und darauf die Karts, mit der Nase in Fahrtrichtung.
**Eine Ein- und eine Ausfahrt gibt es nicht**, und das ist keine Auslassung:
Die Ostkante der Gasse _ist_ der Westrand des Streckenkorridors, die beiden
Flächen berühren sich also, und wer in einer von beiden ist, wird nicht
zurückgeschoben (`confineToCourse`). Losfahren heißt damit schlicht: das
Lenkrad nach rechts. Nach vorn hört die Gasse auf, und dort steht eine Mauer —
eine Grenze, die man nicht sieht, ist eine, in die man fährt. Ihre Nordmauer
hat dafür in der Mitte eine **Lücke**, weil hier nicht nur gefahren, sondern
auch hingelaufen wird; der Gang aus der Navigationszone endet genau darin.
**Kein Dach**, wie nirgends in dieser Welt: Von oben wäre ein gedeckelter
Boxenplatz ein schwarzer Balken über ausgerechnet den Karts, die man sucht.

**Der Boden ist eine Masse und keine tausend Kacheln.** Tausend Bodenplatten
wären tausend Körper in der Physik für eine Fläche, über die man geradeaus
fährt, und portalfähig kann ohnehin nur eine große Fläche sein. Im Gelände der
Testwelt ist das die eine Masse unter allen zehn Zonen. Die Navigationskarte
kostet das nichts — sie wird aus der gebauten Geometrie abgetastet, und eine
Masse ist Geometrie wie jede andere.

**Eingestiegen wird mit `A`.** Jedes Kart meldet sich als `Usable` an
(`core/usable.ts`, `usePrompt` „Einsteigen"), und damit geht es von oben, aus
den Augen und in der Brille mit demselben Knopf, mit dem man auch eine Tür
aufmacht — das war der Punkt der Sache: Ein Fahrzeug, in das man nur steigt,
indem man ein Lenkrad greift, ist eines, das am Bildschirm niemand fährt. In
der Brille geht der alte Weg weiter: die Hand ums Lenkrad schließen.
**Aussteigen** ist das Einzige, was ein neuer Fahrer nicht erraten kann, also
steht es die ganze Zeit auf einem Schild direkt über dem Lenkrad — `A`/`X`
halten, mit einem Balken, der währenddessen vollläuft. Kein Tastendruck: bei
Tempo 60 ist ein Druck zu leicht danebengegriffen. Am Rechner tut `E` dasselbe.

**Gefragt werden alle drei Geber**, und das ist die Lehre aus einem Kart, aus
dem man nicht mehr herauskam: In der Brille der Controller (`primary.pressed`),
am Schreibtisch `E` — und **auf dem Telefon der Knopf `A` auf dem Glas**. Der
fehlte. `PlayerRig.requestUse` ist eine **Flanke**, und für Knöpfe, Türen und
Schilder ist das richtig; ein Halten gab es dort gar nicht, also war der
Ausstieg ohne Tastatur schlicht nicht erreichbar, und das Klemmbrett half auch
nicht weiter, weil es am Zeiger hängt und den gibt es ohne Brille nicht. Dafür
gibt es jetzt `PlayerRig.useHeld` neben der Flanke: was gerade **liegt**,
gesetzt von `FlatControls` aus allen Gebern zusammen. Dazu eine kleine Regel,
die man erst merkt, wenn sie fehlt: Der Knopf muss nach dem **Einsteigen**
einmal losgelassen werden (`exitArmed`) — sonst steigt aus, wer beim Einsteigen
den Finger liegen lässt, und auf dem Glas ist das der Normalfall.

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
gleich. Beides ist analog, es zählt also, wie weit der Trigger gezogen ist. Und
**die Traktion reicht tief**: bis 0,02 statt bis 0,15. Bei 0,15 _rutschte_ ein
Kart noch nicht, es fuhr nur unpräzise; was man eigentlich will — eines, das
die ganze Kurve quer nimmt — fängt eine Zehnerpotenz tiefer an. Der _Drifter_
steht dort und fährt mit vollem Schlupf.

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
  und dreht ihn auf den nachlaufenden Winkel. Und zwar in **allen drei
  Achsen**: Früher landeten die _Füße_ auf einer festen Tiefe und das Auge
  dort, wohin die eigene Körpergröße es trug — für jemanden im Stehen genau
  richtig, für jemanden auf einem Stuhl vierzig Zentimeter zu tief, und genau
  das ist das „ich sitze auf dem Kart statt darin". `Kart.seat` ist deshalb der
  **Augpunkt** (1,02 m über dem Boden, wie in einem echten Kart) und nicht mehr
  die Fußstelle.
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
lenkt es wieder. Darüber liegt `confineToCourse` mit **einer** Regel: Wer in
irgendeiner der Flächen ist — Strecke oder Boxengasse —, wird nicht angefasst;
wer draußen ist, kommt auf die **nächstgelegene** zurück. Nicht immer auf die
Strecke, denn dann schöbe die Box einen quer über die Wiese, sobald man in ihr
an die Mauer kommt. Die Gasse ist dabei bewusst ein **Rechteck** und keine
zweite Mittellinie: Eine offene Linie hat zwei Enden, und dort weiß
`nearestOnPath` nicht mehr, ob man noch daneben oder schon dahinter steht.

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
  liegt auf `LAYER_HUD` — wie die Trefferanzeige, und aus demselben Grund.
- **Werte eingeben** — dieselben Zahlen, aber **getippt** statt
  durchgeschaltet, auf dem Zifferblock vor dem Kopf (`ZoneHost.askNumber`,
  derselbe wie bei Pistole und Greifen). Rasten sind zum Ausprobieren da: Man
  tippt eine Zeile an und merkt am nächsten Bogen, ob es besser wurde. Was sie
  nicht können, ist das Ende davon — wer weiß, dass sein Kart 0,62 Traktion
  haben soll, will nicht siebenmal weiterschalten und dabei daran vorbei.

Weil mehr Zeilen als Platz da sind, blättert der Stick der
zeigenden Hand — dieselbe Geste wie im Handgelenk-Menü. Liegt der Strahl einer
Hand auf dem Brett, gehört _ihr_ Trigger dem Brett und nicht dem Gas — pro
Hand, damit Lesen mit der einen der anderen nicht das Gas wegnimmt. Das
Lenkrad selbst hört, sobald jemand sitzt, gar nicht mehr auf den Strahl
(`PointerTarget.ignore`): es gibt dann nichts mehr auszuwählen, und ein Strahl,
der darauf ruht, würde nur den Gastrigger schlucken.

**Und das Klemmbrett gehört dem Fahrer.** Ein Kart trägt rechts vom Lenkrad sein
ganzes Einstellungsmenü mit sich herum, dazu ein Rückenbrett und den Stiel des
Schildchens vor dem Fahrer. Aus fünfzig Metern ist davon keine Zeile mehr zu
lesen, und die beiden Karts stehen von der Küche aus genau so weit weg. Also
wird es ab zehn Metern weggelassen (`kartView.showsDashboard`,
`DASHBOARD_RANGE`, `Kart.setDashboard`) — wer **darin sitzt**, sieht es dagegen
immer, egal wo das Kart gerade steht. Es sind sechs Zeichenaufrufe, und das ist
ehrlicherweise wenig: Die Schätzung vorher war das Sechsfache und lag daneben,
weil eine `UIPanel` ein einziges beschriebenes Viereck ist und kein Menü aus
siebzehn Netzen. Der Preis dafür ist genauso klein: Aus mehr als zehn Metern
lässt sich das Klemmbrett eines geparkten Karts nicht mehr anklicken. Das große
Schild **über** dem Kart („A zum Einsteigen") bleibt davon unberührt — das ist
genau das Schild, das aus der Ferne gelesen werden soll.

**Was mit der Gokart-Welt gegangen ist: das Rennen gegen andere.** Sie schickte
ihre Kart-Posen zwanzigmal je Sekunde über einen eigenen Netzkanal, beanspruchte
Plätze (`seat`, bei gleichzeitigem Griff gewann die kleinere Peer-Id — dieselbe
Antwort auf beiden Rechnern, ohne Wahl und ohne Server), rechnete ein Kart nur
dort, wo jemand darin saß, und führte eine Rangliste an der Zielgeraden. Das ist
eine halbe Welt für sich und nicht, was eine Testwelt prüft: Hier soll man
merken, ob Lenkung, Traktion, Rundenzeit und Einsteigen noch tun. Die
Buchführung dazu (`kartRace.ts`) ist unangetastet geblieben, samt Test — falls
es wieder ein Rennen geben soll, fehlt nur der Kanal.


**Die Bande ist gebündelt.** Randsteine und Reifenstapel folgen der
Mittellinie, und das sind je rund hundert gleiche Kästen — hundert
Zeichenaufrufe für etwas, das aus zwei Metern Entfernung wie eine einzige
rot-weiße Linie aussieht. Sie entstehen deshalb als `InstancedMesh`: zwei
Bündel für die Randsteine (rot und weiß, die Farbe wechselt je Schritt und
quer über die Bahn nicht — sonst sähe die Gerade aus wie ein Reißverschluss)
und eines für die Reifen. Die Plätze dazu rechnet `kartTrack.trimSpots` aus,
mit Test daneben: Ein Bündel entsteht in einem Zug und lässt sich hinterher
nicht mehr ändern, also muss die Liste beim ersten Mal stimmen.

Die **Reifenstapel** stehen dabei doppelt da: als unsichtbarer Kasten, weil
jeder einen Körper in der Physik und einen Platz in der Abtastliste braucht,
und als Eintrag im Bündel, weil das das Bild ist. Dasselbe Verfahren wie beim
Grundriss ([Wie schön es aussieht](#wie-schön-es-aussieht)), aus demselben
Grund.

### Controller-Modelle

Der Controller, den das Spiel in der Hand zeichnet, ist das **echte Modell**
des Geräts: dieselben Dateien, die jede WebXR-Seite benutzt
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
`worlds/tune/InputModel.ts` steht immer da, wenn kein Modell kommt — das eine
Stück des Eingaberaums, das ihn überlebt hat.

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
schräg, sagt nur eine Messung am Gerät. Gemessen wurde zweimal, einmal je
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
_Einstellungen → Hände_. Ab Werk aus; die Kugeln sind das, was gemessen wurde,
und wer eine Geste einstellt, will genau das sehen.

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

Gemessen wird übrigens **immer**, auch mit ausgeschaltetem Handschuh: Was
gespeichert wird, sind die Gelenke einer blanken Hand, und ob dabei Kugeln oder
Stoff zu sehen sind, ändert an der Messung nichts.

Wozu das gut ist: Eine Reihe Kugeln hat keine Handfläche, an die man einen
Gegenstand legen könnte, und ohne Handfläche gibt es nichts zu messen.

#### Knochenfarben

Der dritte Schalter daneben (_Einstellungen → Hände → Knochenfarben_):
**jeder Knochen in seiner eigenen Farbe**
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

Daran hängt die **Portalwelt** (`gripOf` — Werkzeuge, Gegenstände, der
Gürtel), und dieselbe Zahl hing am Eingaberaum: Was dort gemessen wurde, ist
die Lage eines Werkzeugs gegen die Hand, und gegen eine andere Hand gemessen
wäre jede Zahl um genau diesen Versatz daneben. Ein
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
Eine solche Messung schrieb die Tafelwand des Eingaberaums mit
(Zeile „Griff→Strahl"); die Welt ist gelöscht, die Zahl bleibt eine Schätzung.
Wer eine abgelesene Zahl hier einträgt, verschiebt allerdings auch
`GRIP_HOLD_POSITION`, `STANDARD_GRIP_IN_HAND` und jede daran gerechnete Faust —
`core/gripFist.test.ts` sagt, welche.

Deshalb ist ein _gemessener Roll_ an der Hand nicht die Antwort auf einen
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

| Griff             | Werkzeuge                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| der Standardgriff | Halterzylinder, Pistole, Duplizierer, Inspektor, Teleporter, Größe & Position, Holster, Greifhaken, die drei Portalwaffen, Messband, Radiergummi, Röntgen-Scanner, Handspiegel, Lötkolben, Messer |

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

Eine Grenze bleibt: was hier entsteht, ist die **gebaute** Lage. Wer die Lage
eines Werkzeugs im Griff nachmisst, verschiebt es samt Griff gegen die Hand —
der Griff ist Geometrie und wandert nicht hinterher. Genau dafür gibt es die
zweite Messung, die der Faust.

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

Wer eine Haltung einmisst, schreibt die Hand mit dazu — Werkzeugseite und
`applyStoredPose` setzen `holdHand` zusammen mit den Zahlen.
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

**Und der Nullpunkt einer Faust sitzt am Werkzeug, nicht bei null.** Eine
Handhaltung ist ein Versatz im _Griffraum_, und die Null darin ist der
Griffpunkt des Controllers, nicht das Werkzeug — auf Null zurückgesetzt sprang
die Boxhand um den Versatz _und_ um die 30° zwischen Faust und Zeigestrahl weg
und lag sichtbar neben der Lampe. _Zurücksetzen_ schreibt deshalb die Lage des
Werkzeugs im Griff selbst, und die Hand steht danach exakt daran; von dort
justiert man nach außen, statt sich erst wieder heranzutasten.

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
kurz genug für eine Tafel in der Brille, und der einer einzelnen
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
  eine Messung am Werkzeug genau sechs anfasst — die anderen sechs kosten
  jetzt ein Bit statt eines Bytes. Verglichen wird auf dem Raster, auf dem
  geschrieben wird, sonst stünde eine 0.0000001 aus einer Quaternion-Rechnung
  für immer im Code.
- `toolGearCode` nimmt eine **Hand** entgegen. Wer messen lässt, gibt die
  durch, an der gemessen wurde; die andere steht nicht mehr als
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

**Ein Code reist als Chat-Zeile** (`NetSession.emit` auf dem Kanal `gear`), und
drüben wird er wie jeder andere gelesen, geprüft und eingetragen — inklusive
der Werkzeuge, die schon in einer Hand liegen (`applyStoredConfig`).
Verschickt wird die **Zeile** und nicht der Datensatz: dieselbe, die auch auf
einer Tafel steht, mit derselben Prüfsumme davor. Damit gibt es einen Weg
hinein statt zweier, die auseinanderlaufen können. Und das ist der Punkt, an
dem der Kurzcode sich auszahlt: ein Werkzeug sind 25 Zeichen, also ein Paket.
Die Knöpfe dazu standen an der Wand des Eingaberaums (_Werkzeug senden_,
_Alles senden_); der Weg ist geblieben, die Wand nicht.

In VR liegt der große Code unter _Einstellungen → Konfig-Code_: **Code anzeigen**
legt ihn gleich in die Zwischenablage (und in die Browser-Konsole), **Code
laden** nimmt ihn wieder entgegen — eingefügt oder Zeichen für Zeichen. Am
Rechner geht dasselbe auf der Kommandozeile:

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

#### Live auf die Werkzeugseite

Eine **gemessene Handhaltung** ging über dieselbe Leitung, und zwar als
**mehr als der Code** (`tune/handShare.ts`, mit Test, ohne three.js). Geschickt
hat sie der Poseraum des Eingaberaums, empfangen die Werkzeugseite unter
_Verbinden_ — den Sender gibt es nicht mehr, der Empfänger und das Format
stehen weiter da, und deshalb steht hier auch weiter, wie es gedacht war.
Ein Zuschauer im Browser hat keinen Griff, keine
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
trug `saved` und ging sofort hinaus, ohne auf den nächsten Takt zu warten.

## Architektur

```
src/
  core/      Engine, Player-Rig, Locomotion, XR-Input, Pointer, Hände, Avatar
             — darin `colors.ts`, die einzige Stelle mit den Greiffarben,
             und `grabSettings.ts`, die drei Reichweiten des Greifens
  physics/   Rapier-Wrapper und der Charakter-Controller (dynamisch geladen)
  ui/        Canvas-basierte 3D-UI (Panel, Textflächen, Handgelenk-Menüs)
             — darin `menuNav.ts`, der Weg durchs Menü, den sich beide
             Handgelenke teilen, und `billboard.ts`, die einzige Stelle,
             an der sich etwas zur Kamera dreht
  net/       Transport-Interface, WebRTC/BroadcastChannel, Presence, Avatare,
             Zuschauer-Kamera
  worlds/    Weltenregistry + je eine Welt pro Ordner (inkl. `PortalSync`,
             dem geteilten Zustand der Props und Portale)
             — darin `npc/`, alles, was in einer Welt herumläuft: Haut, Hirn,
             Körper und der Regisseur, der sie zusammenhält
  sw.ts      Der Service Worker — kein Modul der Seite, sondern ein eigenes
             Programm neben ihr (`vite.config.ts`, eigener Einstiegspunkt);
             er entscheidet nichts selbst, das tut `core/swRoutes.ts`
tools/     Kommandozeile: `npm run config` liest und schreibt Konfig-Codes,
           `npm run icons` macht aus `public/icon.svg` die App-Symbole
```

Wie sich der Spieler bewegt, entscheidet ein austauschbares `Locomotion`:
Eine Welt ohne Physik gleitet frei über ihren Boden, eine Welt mit Kisten und
Treppen hängt eine Rapier-Kapsel mit Schwerkraft, Kollision und Sprung ein.
Die Physik-Engine
(rund 1 MB gzip) liegt in einem eigenen Chunk und wird erst geladen, wenn eine
Welt sie braucht.

**Ein Fehler in einem Bild friert die Brille nicht mehr ein** (`App.frame`,
`frameFailed`). `setAnimationLoop` bestellt das nächste Bild erst, wenn dieses
durch ist; eine Ausnahme irgendwo im Bild — Welt, Rig, Physik — heißt also:
kein nächstes Bild, nie wieder. Am Bildschirm steht der Fehler dann in der
Konsole, in der Brille steht gar nichts: Das Bild bleibt stehen, und der Ton
läuft weiter, weil Web Audio seinen eigenen Faden hat. Genau das war der
Befund „Ton gehört, Bild eingefroren" in der Verfolgung. Jetzt fängt die
Schleife den Fehler, schreibt ihn einmal in die Konsole und ans Handgelenk
(`notify`, „Fehler im Bild: …") und macht weiter; ein Fehler, der jedes Bild
wiederkommt, steht alle 300 Bilder noch einmal im Protokoll. Das ist keine
Ursache, sondern ihre Sichtbarkeit — wer den Text am Handgelenk liest, kann
ihn melden, wo vorher nur ein stehendes Bild war.

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
das zweite Mal passiert dann einfach nichts. Festgehalten hat das ein Test mit
**echter Engine**, denn anders geht es nicht: ohne die Sperre stürzt derselbe
Test mit genau dieser Meldung ab.

Der `App`-Loop ist bewusst schlank: Input → Locomotion → `world.update()` →
UI → Netzwerk → Render. Eine Welt darf über `world.render()` selbst rendern;
`PortalWorld` nutzt das für die Zusatzdurchgänge ihrer Portale.

### Wie schön es aussieht

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

#### Die Brille rechnet kleiner, wenn man es sagt

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

#### Die Gitterlinien

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

#### Die Hitboxen

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

#### Griffe zeigen

Das fünfte Häkchen ist die dritte Auskunft und gehört zu den Griffen, an denen
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

#### Was die Kamera ansieht

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


#### Warum tausend Bodenkacheln trotzdem ein Zeichenaufruf sind

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

#### Und die Wände auch — nur nicht von oben

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

#### Wer sagt, dass er keinen Schatten wirft, wirft keinen

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

#### Zwei Zahlen, die man einmal kennen sollte

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

#### Und eine Tafel malt sich nicht neu, wenn dasselbe daraufsteht

`TextPlane.setText` prüft seit dem Umbau, ob sich Überschrift, Text oder Akzent
überhaupt geändert haben, und tut sonst nichts. Eine Tafel neu zu beschriften
heißt, eine Leinwand von einem halben Megapixel neu zu malen und die Textur
daraus ein weiteres Mal auf die Grafikkarte zu schieben — und die Aufrufer
schreiben meistens dasselbe hin, was schon dasteht: Die Rundentafel der
Kartzone ruft viermal je Sekunde, ob jemand fährt oder nicht, und eine Runde
dauert eine halbe Minute. Der Gedanke stand vorher schon bei einem einzelnen
Aufrufer (`Kart.setTaken`); jetzt steht er an der Stelle, an der ihn nicht
jeder Nächste noch einmal haben muss.

### Modelle im Repository

`public/models` ist der Ordner, in dem **fremde Arbeit** liegt: die Spielfigur
(`chef.glb`) und die Küchenmöbel (`kitchen.glb`), beide CC-BY-4.0. Die
Namensnennung steht in `public/models/CREDITS.md`, und sie ist **Pflicht**,
nicht Höflichkeit — wer ein Modell aufnimmt, trägt es dort ein, **bevor** er
es einbaut. Eine Datei ohne Zeile in dieser Liste ist eine Datei ohne Lizenz.

**Die Rohdateien liegen nicht im Repository.** Zusammen 32 MB, von denen nach
der Aufbereitung 630 KB übrig bleiben. Was mit ihnen geschieht, steht
vollständig in den beiden Werkzeugen — `tools/chef-model.mjs` und
`tools/kitchen-model.mjs` —, und zwar mitsamt den Fehlern, die dabei gemacht
wurden. Sie laufen von Hand, nicht bei jedem Build: Ein Modell ändert sich
nicht, und `@gltf-transform` und `sharp` gehören nicht in die Abhängigkeiten
eines Spiels, das sie nie ausführt (`npm install --no-save` beim Aufbereiten).

**Der Küchenkatalog** (`core/kitchenFit.ts`) hat achtzehn Möbel: Tellerausgabe,
Feuerlöscher, **Spülbecken**, **Abtropfbrett**, Mülleimer, Arbeitstisch,
Ausgabe, Schneidebrett, Ausgaberegal, Ausgabetheke, Küchenzeile, Herd, Herd mit
Topf, Herd mit Pfanne — und das **Förderband**, das **Zugband**, den
**Computer-Tisch** und den **Kopierer**, die in keiner Datei stecken, sondern
gebaut werden (`KitchenPiece.built`, siehe
_Anfassen in der Küche_). Der Katalog beschreibt, was in dieser Küche **steht**,
nicht, was gekauft wurde; wer `built` nicht liest, meldet eine fehlende Datei,
die es nicht gibt, und stellt einen grauen Würfel dorthin, wo ein Band stehen
soll.

Achtzehn aus **dreizehn Knoten**, und zwei Sachen erklären den Rest. Die eine
sind die **vier gebauten** Stücke, die in keiner Datei stehen. Die andere ist
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

#### Fünf Zahlen, die aus dem Katalog mehr machen als eine Liste

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

#### Anfassen in der Küche

Was `A` vor einem Möbel tut, steht in **einer** Funktion
(`worlds/test/zones/kitchenCarry.ts`, `kitchenDeed`) und nicht in elf
`if`-Ketten in der Zone daneben. Zwölf Stationsarten (`StationKind`) — Ablage,
Kiste, Mülleimer, Schneidebrett, Herd, Ausgabetheke, Löscherhalterung,
Spülbecken, **Abtropfbrett**, Geschirrrückgabe, Gästetisch, Band — mal volle
oder leere Hand ergeben ein
paar Dutzend Fälle, und jeder davon ist hier eine Zeile im Test und im Headset
eine Viertelstunde Hin- und Herlaufen.

Die Küche liegt seitdem in sechzehn Dateien, dazu eine siebzehnte im `ui/`, die
längst nicht mehr nur ihr gehört. Die Grenze ist jedes Mal dieselbe: **Rechnung
getrennt von Darstellung** — was ohne three.js auskommt, kommt ohne three.js
aus, und genau das ist der Grund, warum es so viele Dateien sind.

| Datei | Was darin steht |
| --- | --- |
| `zones/kitchenRecipes.ts` | Zutaten, Träger, Stufen, `combine`, Rezepte |
| `zones/kitchenClock.ts` | die Uhr des **Herdes**: braten, verbrennen, entzünden |
| `zones/kitchenWork.ts` | die Uhr der **Arbeit**: schneiden und spülen, eine Rechnung |
| `zones/kitchenGuests.ts` | wer an einem Tisch isst, wie lange, und was stehen bleibt |
| `zones/kitchenBuild.ts` | welche Kachel gemeint ist und ob dort Platz ist |
| `zones/kitchenSpray.ts` | der Feuerlöscher: Kegel, Schalter, Fortschritt, Nebel |
| `zones/kitchenBelt.ts` | die Bänder: Laufzeit, Laufrichtung, Ziehen, Nachbarn, Netz |
| `zones/kitchenDesk.ts` | Computer-Tisch und Kopierer: Seite, Felder, Netz |
| `zones/kitchenCarry.ts` | Stationen und `kitchenDeed`; reicht alle Uhren weiter |
| `zones/kitchenPlan.ts` | wo welches Möbel steht, der Grundriss, das Schild |
| `zones/kitchen.ts` | die Zone: Netze, Körper, Anzeigen, Anfassen |
| `zones/kitchenProps.ts` | `FoodKit`: aus einem Gericht wird ein Netz |
| `zones/kitchenIcon.ts` | der Ofen, der aus einer Zutat eine Textur backt |
| `zones/kitchenGauge.ts` | Balken, Warndreieck und Flammen über den Stationen |
| `zones/kitchenNotice.ts` | der Aushang an der Nordwand: Markdown, gesetzt an der Wand |
| `zones/kitchenFloor.ts` | der karierte Boden: Feldgröße, Töne, Fuge, die Fläche darüber |
| `ui/billboard.ts` | `faceCamera`: was Auskunft gibt, steht parallel zum Bild |

Die jüngsten sieben kamen mit dem Geschirr, den Gästen, dem Band, dem Löscher,
dem Umbau und dem Rechner dazu, und jede ist aus demselben Grund eine **eigene**
Datei: Sie rechnet etwas aus, das man ohne Szene prüfen kann.

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
- **Eine Kiste gibt aus und ist zugleich Arbeitsplatte** (`fromBox`). Das
  Zweite ist neu und hat einen sichtbaren Grund: Die vier Vorratsboxen stehen
  an der Westwand nebeneinander, und wer dort mit vollen Händen ankommt, hatte
  vorher keinen Platz, etwas abzulegen. Jetzt liegt auf dem Deckel, was jemand
  genau dorthin gestellt hat — und **das** geht vor dem Frischen: Die Kiste
  gibt ihr Frisches ja noch beliebig oft, das Liegende gibt es einmal. Damit
  geht der überzählige **Teller an der Tellerausgabe zurück**, statt dass man
  ihn quer durch die Küche trägt. Geblieben ist die Regel dahinter: Wer mit der
  vollen Pfanne an die Brötchenausgabe trat, bekam einmal ein Brötchen mit
  Patty, das niemandem gehörte — im Browser nachgestellt, das Patty war spurlos
  weg. Was aus dem Nichts kommt, muss deshalb in die **Hand** passen; alles
  andere ist „Erst die Hände frei machen".
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
  `WORK_SECONDS` = 3 s für beides). Beide fangen mit dem **Ablegen** an und
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
  Tellerausgabe war ein Brunnen. Jetzt geht der Kreis weiter: Ein Gast setzt
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
  - **Der Teller liegt schräg**, und zwar um **11,1°** (`kitchenProps.SINK_TILT`).
    Der Winkel ist ausgerechnet: Ein Teller ist 0,75 m breit, die Beckenöffnung
    nur 0,81 × 0,64 m — flach passt er gar nicht hinein, sondern läge quer über
    dem Rand. Er lehnt deshalb mit der unteren Kante auf dem Beckenboden und der
    oberen auf Randhöhe, überspannt also genau die Beckentiefe von 14,4 cm. Das
    **Wasser** ist gebaut und steht auf halber Tiefe — also liegt genau die
    untere Hälfte des Tellers darin.
  - **Vier saubere Teller** auf dem Abtropfbrett (`CLEAN_STACK_MAX`), als
    derselbe Stapel wie an der Rückgabe, nur mit sauberen Tellern und einer
    anderen Grenze. Voll lehnt es ab — anders als die Rückgabe, die nie ablehnt,
    weil ein Gast ohne Abstellplatz eine Sackgasse wäre. Gefüllt wird es **aus
    der Hand**: Fertig gespült liegt der Teller dort (`WORK_TO_HAND`), und ein
    Schritt zur Seite stellt ihn ab, statt ihn auf irgendeiner Arbeitsplatte
    zwischenzulagern, wo er beim nächsten Burger im Weg läge.
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
  - **Wer ein Möbel trägt, legt es links als Miniatur ab** (`layOnPlate`) — und
    es bleibt **dasselbe** Möbel, nur klein, nicht seine Nachbildung. Klein
    heißt hier ein **Drittel** (`MINI_SCALE`) und damit eine andere Zahl als im
    Katalog, weil die Frage eine andere ist: Dort geht es darum, achtzehn Möbel
    nebeneinanderzustellen, hier darum, eines auf eine Kachel zu stellen. Ein
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
    `COPY_ALPHA` = 0,45). Sie ist so lange nichts, bis jemand sie nimmt — dann
    entsteht in der Hand ein echtes Möbel, und die nächste wächst sofort nach.
    Das Gerät gibt also unbegrenzt her, solange die Vorlage liegen bleibt; das
    ist die Absicht und kein Versehen. Die Kopie bekommt dabei **eigene**
    Materialien: Ein geklontes Netz teilt sein Material mit dem Original, und
    wer dort `opacity` verstellte, machte das Möbel in der Hand gleich mit
    durchsichtig. Sie gehen mit ihr (`clearCopy`) und nicht in die Liste der
    Welt — die Kopie entsteht bei jedem Griff neu, und eine Liste, die erst beim
    Weltwechsel geleert wird, wüchse mit jedem kopierten Möbel.
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


#### Der Körper unter dem Möbel

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

### Der Konstrukt-Raum

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
sieht. Zwanzig Stücke fasst dieser Ring, und damit beide Auswahlen dieses
Projekts — siebzehn Kleidungsstücke, achtzehn Möbel. Wer mehr mitbringt, bekommt
den nächsten Ring **zwei** Kacheln weiter draußen: Ein Ring direkt hinter dem
anderen stünde in dessen Lücken und wäre von der Mitte aus halb verdeckt. Reicht
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
landet, kommt zuletzt. Und jedes Stück sieht die Mitte an: Ein Regal, dessen
Stücke alle in dieselbe Weltrichtung zeigen, zeigt der Figur die Hälfte von
hinten.

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

### Wie man aussieht

_Menü → Aussehen_ und der **Kleiderschrank** — drei Zeilen, und dahinter die
ganze Figur (`core/AvatarBody.ts`, `core/avatarLook.ts`, `core/appearance.ts`,
`core/headgear.ts`).

**Die Figur ist ein Koch**, und seit dem dritten Anlauf ist sie ein
**Modell** statt gebauter Geometrie: „Little Chef (Overcooked like)" von
marcelosants, CC-BY-4.0 (`public/models/CREDITS.md`). Das Vorbild sind die
Köche aus _Overcooked_, und der Grund für die ganze Mühe ist die Kamera: Hier
schaut man aus **16 m** schräg von oben unter 55° auf Figuren
(`core/topDownPose.ts`).

**Warum überhaupt ein Modell**, wo doch sonst alles hier aus Grundkörpern
entsteht: Zwei Anläufe lang wurde die Figur aus Kugeln und Drehformen gebaut,
und zwei Anläufe lang fehlten die letzten zwanzig Prozent Ähnlichkeit. Ein
Modellierer, der weiß, was er tut, macht in einer Stunde, wofür `BARREL`-Kurven
einen Tag brauchen und dann nach Kegel aussehen. Die Regel „dieses Projekt lädt
keine Modelldateien" gilt weiter für **Welt und Werkzeug** — dort ist sie
richtig, weil eine Wand aus zwei Quadern in derselben Sekunde dasteht wie der
Rest. Für **Figuren und Möbel** gilt sie nicht mehr.

**Die gebaute Figur ist trotzdem noch da** (`core/avatarLook.ts`), und nicht
aus Nostalgie: Das Modell kommt über das Netz und ist erst ein paar Bilder
später da; ohne Netz kommt es nie, und in Jest gibt es kein WebGL. Bis dahin —
und notfalls für immer — steht die gebaute Figur. Niemand soll vor einem
unsichtbaren Mitspieler stehen, weil eine Datei fehlt. Dasselbe Muster wie bei
den Controllern (`core/ControllerModels.ts`).

**Die Figur ist 1,6 m hoch, und ihre Augen liegen bei 0,91 m.** Das ist die
Entscheidung, an der zwei Anläufe hingen, und sie ist es wert, aufgeschrieben
zu werden:

Ein Overcooked-Koch ist eine **Chibi-Figur** — Kopf und Mütze machen gut die
Hälfte seiner Höhe aus, ohne Mütze ist er 1,8 Kopfhöhen groß, seine Augen
sitzen bei 1,24. Skaliert man ihn so, dass seine Augen auf der Augenhöhe eines
Menschen liegen, wird er **2,84 m hoch und sein Kopf einen Meter breit**.
Neben einem Tresen von einem Meter ist das ein Riese im Puppenhaus. Es wurde
gebaut, in drei Größen nebeneinandergestellt und angesehen (`npm run avatar`),
und es war eindeutig.

Also andersherum: **Die Figur bekommt die Größe, die zur Küche passt**, und
ihre Augen liegen dann eben tiefer als die des Spielers. In der Brille steht
die Kamera damit über dem Kopf der eigenen Figur; von oben — und von dort wird
gespielt — sieht man davon nichts. Der alte Grund („sonst sehen sich zwei Leute
in der Brille nicht in die Augen") ist damit hinfällig, und mit ihm der
**Nackenversatz**: Der Kopf sitzt jetzt einfach auf dem Rumpf.

Aus derselben Entscheidung folgt, dass die Figur **immer gleich hoch ist**. Sie
duckt sich nicht mehr mit dem Spieler, denn ihre Höhe kommt nicht mehr von ihm;
ob jemand steht oder sitzt, ändert an ihr nichts. **Es gibt kein Bücken der
Figur mehr**, und das ist eine Entscheidung und kein Versehen — ein Jest-Test
hält sie fest.

Was daraus für die **Posen** folgt, steht in `core/chefFit.ts`: Der Spieler
schaut aus 1,6 m, seine Figur aus 0,91 m, also wird der **Abstand zum Kopf**
mit `POSE_SCALE` gestaucht. Was er eine Kopfhöhe unter seinen Augen hält, hält
sie eine Kopfhöhe unter ihren. Derselbe Faktor sitzt auf den Handankern, damit
ein Werkzeug darin mit der Figur kleiner wird, statt in ihrer Faust zu stecken
wie ein Balken.

**Und die Bildschirmhand rechnet rückwärts** (`worlds/portal/screenHand.ts`).
Sie hing an einer festen Höhe von 1,20 m — der Höhe, auf der ein
ausgestreckter Menschenarm eine Waffe hält —, und der **Griff**, an dem das
Werkzeug wirklich hängt, machte die Stauchung gar nicht erst mit: Die Pistole
schwebte über dem Kopf der Figur und hatte obendrein Spielergröße. Jetzt steht
die Stelle an der **Figur** fest (`CHEF_TOOL`), und `at` ist die Pose, aus der
der Avatar wieder genau diese Stelle macht. Eine Zahl, zwei Abnehmer — die Hand
und das Werkzeug darin landen an derselben Stelle, statt getrennt geraten zu
werden.

**Wo eine ungetrackte Hand ruht, wird am Modell gemessen** und nicht an seiner
Hülle: `spanAt` fragt den Rumpf nach seiner Breite **auf der Höhe, auf der die
Hand hängt**. Der Rumpf ist ein Ei, seine dickste Stelle liegt unter den
Händen, und wer die Hand nach der Hülle danebensetzt, lässt sie eine Handbreit
im Nichts schweben. Dazu kommt die halbe Breite der **Hand selbst** — ohne sie
steckte ihre Innenseite in der Jacke.

**Wie die Datei entsteht**, steht in `tools/chef-model.mjs`, und zwar
vollständig: Die Quelle ist ein Standbild-Sculpt mit 550 000 Dreiecken (allein
die Mütze 352 000), ohne Skelett, ohne Animation, und ihre Teile liegen nicht
in Knoten, sondern über fünf Materialien verteilt. Das Werkzeug zerlegt sie in
**Mütze, Kopf, Rumpf und zwei Hände** — nach Material und Ort, nicht nach
zusammenhängenden Flächen —, dezimiert jedes Stück einzeln auf zusammen 8 260
Dreiecke und stellt sie in Spielmaße. Übrig bleiben 160 KB.

Drei Fehler aus diesem Umbau stehen dort im Detail, weil sie sich sonst
wiederholen: dass **anteilige** Budgets der Mütze das Budget des Gesichts
wegfressen, dass **kleine Teile gar nicht** vereinfacht werden dürfen (die
Augen wurden zu zwei Sicheln), und dass die **Trennebene gemessen** gehört und
nicht geschätzt — sie lag zuerst im Kopf statt in der Lücke darunter, und
danach hatte der Kopf ein abgeschnittenes Kinn und die „Hände" einen halben
Meter Breite.

**Der Antrieb ist derselbe geblieben**: `update(dt, head, left, right)` mit Kopf
und Händen, wie ihn ein Headset über seinen Träger nun einmal weiß. Der Rumpf
steht unter dem Kopf und dreht mit `bodyYaw` (mit derselben Totzone wie vorher);
seine **Höhe kommt nicht mehr vom Spieler**, siehe oben. Nicht getrackte Hände
schweben seitlich neben dem Rumpf und pendeln beim Laufen leicht. Was andere
daran hängen haben, ist unverändert: `head`, `handAnchors`, `setColor`,
`setHeadgear`, `setSelfView`, `setHandsVisible`, `update`, `dispose`, `bodyYaw`
— dazu `setLook(look)`.

**`BodyShape` hat zwei Methoden** (`core/avatarLook.ts`), und beide ändern je
Bild nur `scale`, `position` und `rotation` — **niemals Geometrie**, sonst läge
je Bild ein Netz für den Sammler da: `setHeight` stellt die Figur auf ihre
Höhe, `setStride` watschelt.

**Drei Zeilen, drei Listen** (`core/avatarLook.ts`). Vorher gab es nur den Hut,
und alle sahen darunter gleich aus: derselbe Körper aus Kapseln, dieselbe Farbe
nach Gerät, ein schwarzes Visier vorn. Für eine Werkstatt geht das, für eine
Sitzung mit drei Leuten nicht — wer sich unterscheiden will, hat sonst nur
seinen Namen dafür. Jetzt sind es drei:

- **Kopf** — vier Sorten, Hautton plus ein Merkmal im Gesicht: `round` (die
  Auslieferung), `freckles`, `beard`, `moustache`. Den Hautton tragen die
  **Hände** mit, es sind ja seine (`skinTone`).
- **Hut** — acht Sorten aus Zylindern, Kugeln und Quadern wie alles hier:
  **ohne** (die Auslieferung), **Kochmütze**, **Basecap**, **Helm**,
  **Bauhelm**, **Mütze**, **Zylinder**, **Krone**. Die Kochmütze ist das
  Vorbild für alles andere: **dunkles Stirnband**, schmaler Rand, darüber eine
  Haube aus **fünf Lappen**, die über den Rand hinauskragt, das Ganze so hoch
  wie der Kopf und gut zehn Grad nach hinten gekippt. Jedes dieser Stücke ist
  nachgemessen, und jedes einzelne fehlte in der ersten Fassung — die war ein
  Marshmallow auf einem Kegel.

  Wer einen Hut baut, der den Kopf **umfasst**, rechnet mit `HEAD_SPREAD`: An
  seinen vier Ecken ist die gefaste Kiste ein Viertel weiter draußen als eine
  Kugel, und ohne diese Zahl blitzt dort die Haut durch (`around()` in
  `core/headgear.ts`).
- **Körper** — fünf Kochjacken: weiß, rot, blau, grün, gestreift.

**Alle drei Zeilen wirken auch auf das Modell**, und das ist nachgetragen
worden: Es hat **einen** Kopf und **einen** Stoff für alle Sorten, und damit
war die halbe Umkleide wirkungslos — wer _Kochjacke rot_ wählte, lief weiter in
der Farbe seiner Rolle herum, und drei der vier Köpfe sahen aus wie der erste.
Drei Zeilen richten das:

- **Die Jacke trägt die Farbe aus der Umkleide** (`avatarLook.bodyJacket`) und
  nicht mehr die der Rolle. Das Modell hat genau einen Stoff, beide wollten
  ihn, und die Rolle gewann — jetzt gewinnt, was einem selbst gehört
  (dieselbe Regel wie beim geliehenen Helm im Kart). Die Rollenfarbe bleibt am
  Hut, der sie ohnehin schon trug.
- **Bart, Schnauzer, Sommersprossen, Zöpfe und Haar werden aufgesetzt**
  (`core/chefFace.ts`). Sie sind in den **gemessenen** Maßen genau dieses
  Kopfes gebaut und nicht aus der gebauten Figur abgezweigt: Deren Schädel ist
  ein gefaster Würfel, der des Modells eine rundere, flachere Kugel, ihre Augen
  sitzen unter der Mitte, seine genau darauf. Ein Bart mit dem Maß der einen
  auf der anderen ist ein schwarzer Klumpen über dem halben Gesicht — das
  wurde gebaut und angesehen. Was auf der **Haut** liegt (Wangen,
  Sommersprossen), wird über `onSkull` auf ein Ellipsoid gelegt und nicht auf
  die vorderste Ebene des Kopfes; sonst schweben die Wangen am Rand des
  Gesichts acht Zentimeter davor.
- **`none` heißt barhäuptig, auch mit Modell.** Bis dahin behielt die Figur
  bei `none` die modellierte Kochmütze auf — die Zeile im Schrank heißt aber
  _Ohne · Barhäuptig_, und von acht Hüten taten damit zwei dasselbe. Das
  **Haar auf dem Schädel** (`FaceMarks.crown`) ist genau dann sichtbar und
  weicht jedem Hut: Bei der gebauten Figur steckte es von selbst unter der
  Mütze, auf dem runderen Kopf des Modells ragte es als brauner Fladen über
  deren Rand.

- **_Rund_ hat einen Schopf**, und der ist nachgereicht. Die Rückmeldung lautete
  „Rund sieht aus wie nichts", und sie stimmte: Die anderen drei Köpfe
  unterscheiden sich an Bart, Schnauzer und Zöpfen — _Rund_ hatte eine
  Haarkappe und zwei blasse Wangen, und von **oben**, und von dort schaut man
  in diesem Projekt auf die Figur, blieb davon der Unterschied zwischen braunem
  und schwarzem Haar übrig: keiner. Ein Schopf über der Stirn löst genau das,
  weil er die **Silhouette** ändert und nicht nur die Farbe; die Wangen sind
  dazu größer und kräftiger geworden, denn ein Kopf, der _Runde Backen_ heißt,
  muss welche haben, die man sieht. Der Schopf hängt im `crown` und geht damit
  unter jeder Mütze mit — dieselbe Regel wie für das übrige Haar.

Was eine **Anzugfarbe** trägt und keine eigene hat — Schürze, Halstuch —, trägt
die des Trägers: Ein Spieler hat eine Farbe und nicht drei.

**Wie man die Figur ansieht, bevor man sie ändert.** Die Optik ist das eine
hier, was kein Jest-Test abnehmen kann — `avatarBody.test.ts` prüft
Proportionen und Rechnung, aber ob eine Figur nach Koch aussieht, entscheidet
das Auge. Dafür gibt es den **Musterbogen**:

```
npm run dev                # in einem Fenster laufen lassen
npm run avatar             # schießt vier Ansichten nach .artifacts/avatar
npm run avatar -- --tag=nachher --walk   # zum Vergleichen, und in Bewegung
```

Die Seite ist `avatar-preview.html` (`src/preview/avatarPreview.ts`) und wird
**nicht mitgebaut** — `vite.config.ts` kennt nur `index.html`, `tools.html` und
`inputs.html`, also gibt es sie nur im Entwicklungsserver. Sie stellt alle Sorten
nebeneinander und rendert vier Ansichten: von vorn, halb schräg, von der Seite
und **die Kamera, unter der wirklich gespielt wird** (16 m, 55°, 30°
Öffnung). Was dort nicht lesbar ist, ist es nirgends. `?hat=all` geht statt
der Kochmütze das Hutregal durch, `?walk=1` lässt die Figuren laufen — daran
sieht man das Watscheln, und im Stand sieht man das nie.

Drei Regeln stecken darin, und alle drei sind es wert, aufgeschrieben zu
werden:

- **Der Hut hängt am Kopf des Avatars und nicht am Körper.** Das ist der ganze
  Trick daran: `setSelfView` blendet den Kopf aus, sobald man in den eigenen
  Augen steckt, und nimmt den Hut damit von selbst mit. Man sieht seinen
  eigenen im Spiegel und durch ein Portal — so wie man auch seinen eigenen
  Körper nur dort sieht.
- **Das Aussehen gehört dem Spieler und keiner Welt.** Gespeichert wird es wie
  die Augenhöhe und die Grafikstufe, also im Browser (`bgvr.look`) und nicht in
  einer Welt; wer im Hub eine Kochmütze aufsetzt, trägt sie in der Testwelt
  auch. Eine Welt darf den **Hut** dabei **ausleihen** (`WorldContext.wear`) —
  das Kart tut es für den Helm —, und `null` gibt den Kopf wieder der
  Einstellung zurück. Wer aussteigt, hat wieder seinen eigenen Hut auf.
- **Es geht über das Netz**, und zwar in der **Anmeldung** und nicht in der
  Pose (`net/NetSession.ts`, Felder `hat`, `head`, `body` im `hello`). Ein
  Aussehen ändert sich einmal am Abend, eine Pose zwanzigmal in der Sekunde:
  Wer etwas wechselt, sagt sich neu an (`App.applyAppearance` schickt erst,
  wenn sich wirklich etwas geändert hat). Alle drei Felder sind **optional** —
  eine ältere Fassung schickt sie nicht mit —, und was hereinkommt, ist fremder
  Text und geht durch `asHeadgear`, `asHead` und `asBody`; ein unbekannter Wert
  wird zur Vorgabe und nicht zu `undefined`.

**Geändert wird an zwei Stellen, und beide lesen denselben Speicher**: die Seite
_Aussehen_ im Menü (drei Zeilen, jede schaltet im Kreis, die Überschrift zeigt
die Wahl gleich mit — `appearanceSummary`) und die **Umkleide** am
Kleiderschrank — und die ist keine Liste mehr, sondern ein **Regal im
Konstrukt**, in dem dieselben siebzehn Sachen als Sachen dastehen und der
Spiegel an der Tür zeigt, was man gerade angezogen hat (siehe
_Der Konstrukt-Raum_ und _Der Kleiderschrank und die Umkleide_). Gespeichert
wird sofort (`saveAppearance`), und wer zuhören will, hängt sich an
`onAppearanceChange` — der eigene Körper und das Netz tun genau das.

**Von innen ist ein Helm etwas anderes als von außen.** Außen eine Schale,
innen ein **Rahmen**: ein Kreisring vor dem Auge (`visorFrame`), dessen Loch
aus einem halben Meter Abstand rund 90° freies Blickfeld lässt. Die Mitte des
Bildes bleibt vollständig, außen wird es dunkel — und genau dort, am Bildrand,
ist die schnelle Bewegung, von der einem schlecht wird. Beide haben außer dem
Namen nichts miteinander zu tun, und deshalb sind es zwei Funktionen.

**Und hinter ihr staubt es** (`worlds/shared/dustTrail.ts`, `DustTrail`). Aus
16 m Höhe ist eine rennende Figur eine Figur, die ein Stück weiter oben ist als
eben; woran man sieht, dass sie rennt, ist die Spur dahinter — bei _Overcooked_
ist der Staub hinter dem Koch deshalb kein Zierrat, sondern die Auskunft über
das Tempo. Gemessen wird am **Weg** und nicht an der Zeit (`dustDue`, mit
Test): Alle 35 cm steigt ein Wölkchen auf, also staubt es beim Rennen dicht,
beim Schleichen selten und im Stehen gar nicht. Wer in einem Bild weiter kommt
als `DUST_JUMP` (1,2 m), ist **versetzt** worden — Portal, Sprungmenü,
Sturzrettung —, und dann staubt es überhaupt nicht: Eine Spur entlang einer
Strecke, die niemand gelaufen ist, wäre eine Lüge. Gebaut ist der Effekt wie der
Löschnebel in der Küche (`SprayJet`: geteilte Form, ein Material, Felder fester
Länge, und wer nichts zeigt, kostet nichts), und die Wölkchen hängen in der
**Welt** und nicht an der Figur — was ausgestoßen ist, bleibt liegen, sonst
zöge man es hinter sich her wie einen Schal. Angehängt wird die Spur in der
Testwelt (`TestWorld.trailDust`) und nicht in der Küche: Gestaubt wird, wo
gelaufen wird, und gelaufen wird auf dem ganzen Gelände. Nur zu Fuß —
`PlayerRig.wishing` ist der Merker, den alle vier Steuerungen setzen, und
`seated` schließt das Kart aus.

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
  wandert. Eine Karte, die immer die ganze Welt zeigt, ist auf einem Gelände
  von siebzig Metern ein grauer Fleck und in einem Zimmer ein Punkt. Der
  **Trigger** schaltet den Maßstab
  weiter: 20 → 40 → 80 → 160 m, im Kreis. Mehr Bedienung hat sie nicht.
- **Norden ist oben, immer.** Das Blatt dreht sich nicht mit, der **Pfeil**
  darauf schon. Die Alternative wäre verführerisch, aber wer die Karte in der
  Hand hält, dreht sie ohnehin selbst dorthin, wo er sie lesen will — und eine
  Karte, die sich beim Gehen unter der Hand mitdreht, ist ein Kreisel. In der
  Umrechnung steckt die eine Zeile, an der sich eine Karte verrät: In three.js
  zeigt −z nach vorn, auf dem Blatt zeigt kleines _v_ nach oben.
- **Ein Stockwerk und nicht alle übereinander.** Wo Etagen aufeinander liegen,
  wären sie übereinandergelegt ein Knäuel aus Wänden, das nichts mehr sagt.
  Genommen wird die, auf deren Boden der Kopf am ehesten steht
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
allem aber sind es zwei verschiedene Fragen — _wie sieht der aus_ und _was
macht der_ —, und wer sie zusammenlegt, kann keine davon mehr einzeln
beantworten. Eine Übungspuppe mit einem Verfolger-Hirn ist ein Trainingsgegner,
ein Zombie mit „Stehen" eine grüne Zielscheibe; beides fällt ab, ohne dass
jemand etwas dafür gebaut hätte.

**Bedient wird es zweimal, und beide lesen denselben Speicher** — genau wie
beim Beutel, den es als Rasterseite _und_ als Werkzeug gibt. Im Menü unter
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
_sieht_, auch der ist, auf den man _zielt_, hält `npcBody.test.ts` fest —
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
quer zur Kamera, seine _Stelle_ aber kommt aus der Kette darüber — und bei
einem, der einen ansieht (Gierwinkel um 180°), war der linke Rand plötzlich der
rechte, die Füllung stand **neben** ihrem Rahmen statt darin. Also nimmt die
Gruppe die Drehung des Modells wieder heraus. Zu sehen ist er voreingestellt **bei Schaden** — ein Balken über einem
unversehrten Zombie ist eine Zeile, die immer dasselbe sagt, und dreißig davon
sind dreißig. Unter **Menü → NPC → Lebensbalken** steht _immer_ (zum Nachprüfen
der Zahlen) und _aus_; dasselbe schaltet die laufende Vorschau auf der
Werkzeugseite.

**Und andersherum:** ein Schlag, der sitzt, **schiebt den Spieler** und
rüttelt in beiden Händen. Lebenspunkte hat der Spieler nicht — es gibt in
dieser Welt nichts, was sie zählen würde —, und ein Treffer, den man nicht
spürt, ist trotzdem keiner. Wer eine Lebensanzeige will, hängt sie an genau
einer Stelle ein (`PortalWorld.takeHit`).

**Woher einer kommt, dafür gibt es zwei Antworten** (`worlds/npc/npcSpawn.ts`,
mit Test), und beide sind reine Rechnung:

- Ein **Spawnpunkt** ist eine Stelle, an der jemand auftauchen _darf_ — ein
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

**Durch ein Portal fällt er wie eine Kiste.** Dieselbe Kollisionsmaske,
dieselbe Traversal-Matrix, dasselbe geschnittene Abbild — nachzulesen oben bei
den Portalen. Was dabei **nicht** passiert: Er _plant_ keinen Weg hindurch. Die
Navigationskarte kennt Portale zwar als Verbindung (`navBuild.addPortal`), die
beiden geschossenen stehen aber nicht darin. Ein Zombie fällt also durch ein Bodenportal, das auf seinem Weg
liegt, und er läuft durch ein Wandportal, hinter dem er den Spieler sieht — den
Umweg durch das Portal am anderen Ende der Halle nimmt er nicht. Das ist der
nächste Schritt in dieser Ecke, und er hängt an einer Frage, die die Karte
beantworten muss: auf welcher Kachel ein eben erst geschossenes Loch liegt.

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

**Die Karte ist ein Kachelgitter mit Etagenindex.** Eine Kachel ist **einen
Meter** breit (`TILE`, seit September 2026 — vorher 2,5 m, siehe _Welten auf
dem Kachelgitter_), und diese Zahl ist eine Konstante und keine Einstellung:
Sie steht in jeder gespeicherten Karte im Kopf, und wer sie ändert, macht jede
davon ungültig. Die Höhe ist ein **Index** und keine Zahl — Dach, Erdgeschoss und
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

**Dieselbe Karte liest jede Sorte anders.** Eine Kachel trägt nur, _was_ dort
ist (Stacheln, Wasser, freies Feld); was das _kostet_, entscheidet erst das
Profil dessen, der darüberläuft (`navProfile.ts`). Der Zombie hat für Stacheln
keinen Eintrag und fällt hinein, der Mensch hat dort `Infinity` und geht außen
herum. `Infinity` heißt dabei „niemals" und nicht „sehr teuer" — wer „lieber
nicht, aber im Notfall doch" will, schreibt eine große endliche Zahl hin.

**Und dasselbe Gelände liest auch jede Sorte anders.** Das ist derselbe
Gedanke, eine Etage tiefer, und er hat das Abtasten umgebaut: Eine Verbindung
trägt nicht mehr die _Antwort_ („das ist eine Treppe"), sondern die **Form** —
wie viel es hinaufgeht (`rise`), wie hoch die größte einzelne Stufe darin ist
(`step`) und wie weit es waagerecht ist (`gap`). Fünf Zahlen im Profil machen
daraus ein Ja oder ein Nein:

- **`stepUp`** — was er _tritt_, ohne etwas dafür zu tun. Die Bordsteinkante.
- **`jumpUp`** — was er sich _hochzieht_. Das ist die Zahl, an der eine
  60-cm-Stufe für einen Zombie ein Weg ist und für einen Hamster eine Wand.
- **`maxSlope`** — wie steil ein Weg noch sein darf, in Grad, gemessen über
  eine Kachel. Sie gilt nur, wo der Boden **durchläuft**; eine einzelne Kante
  ist keine Steigung, sonst wäre jede Bordsteinkante eine 9°-Rampe und jede
  Mauer eine 45°.
- **`dropDown`** — wie tief er _freiwillig_ springt.
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
ließ: Für eine Tür, an der noch nie jemand stand, _war_ die Welt eingetragen —
also wusste ein Zombie schon dreißig Meter vor einer Metalltür, dass sie zu
ist, und bog ab, ohne je dagewesen zu sein. Dieselbe Hellsicht wie oben, nur an
der Stelle, an der niemand sie vermutet. Jetzt läuft er hin, steht davor, sieht
sie an (`navAgent.doorAhead` trägt sie in dem Moment ein, in dem sie in
Reichweite ist) und plant _dort_ um — außen herum bei Metall, mit den Fäusten
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
`buildEnvironment()`, und damit hat **jede** Welt ihr Gitter — der Hub, der
Bauplatz, die Testwelt, alle.

**Eine Welt auf dem Kachelgitter wird trotzdem abgetastet** (`grid/GridWorld.ts`),
und das ist kein Versehen. Sie _hätte_ ihren Graphen ja schon; ihn hier
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
  dagegen, bis jemandem auffiel, dass er durch eine Wand _wollte_. Jetzt wird
  quer zur Laufrichtung abgetastet, vom Mittelpunkt nach beiden Seiten, und was
  frei bleibt, muss die **Schulterbreite** tragen (`BAKE_DEFAULTS.width`, 70 cm
  — ein Zombie ist 58 dick). Gemessen wird nur der Streifen um die Mitte: Eine
  freie Ecke am Rand der Kachelgrenze nützt niemandem, der von Kachelmitte zu
  Kachelmitte läuft.
- **Ein Boden, auf dem etwas steht, ist keiner.** „Vergraben" hieß bis dahin,
  dass ein anderer Kasten den Deckel _überspannt_ — ein Klotz, der bei y = 0
  anfängt, saß aber genau darauf und überspannte ihn nicht. Damit blieb unter
  jedem Klotz und in jeder aufsitzenden Wand eine Kachel übrig, die es nicht
  gibt. Zugemauert war sie von allen Seiten, also lief niemand hinein — sichtbar
  gemacht (Ebene _Betretbar_) sieht man aber sofort, dass die Karte dort Boden
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

Eine Welt darf zwei Dinge dazu sagen: `navLevels()` nennt ihre Stockwerke —
eine Welt mit Podesten tut das, sonst würde eine Etage zu viel geraten, weil
ein Podest bei 1,2 m aussieht wie eine eigene Ebene —, und `navBounds()` sagt,
was abgetastet wird. Voreingestellt ist
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
(`observe`) — in die _Laufrichtung_, nicht auf den Wegpunkt, denn nach der
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

- **Betretbar** ist die Kachel als _Fläche_ und nicht als Umriss. Ein Raster aus
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
_sichtbar_, ein **Schalter** macht es _wirksam_. „Hindernisse aus" heißt nicht,
dass die Kiste verschwindet — es heißt, dass die Wegsuche sie nicht mehr
beachtet, der Zombie mitten hindurchplant und dagegenrennt. Es sind dieselben
drei, die eine Unity-Navmesh ausmachen:

- **Fläche** (_NavMesh Surface_) — das Gitter selbst. Aus heißt: niemand sucht
  mehr einen Weg, die Hirne laufen stur auf den Spieler zu. Der einzige
  Schalter, an dem man in einem Bild sieht, was die Wegsuche den ganzen Tag
  leistet. Er hängt in der Welt (`PortalWorld.navForAgents`) und nicht im
  Graphen, denn er schaltet nichts _am_ Gitter ab, sondern das Gitter selbst.
- **Hindernisse** (_NavMesh Obstacle_) — was zur Laufzeit im Weg steht
  (`setBlocked`): die Kiste, die jemand abstellt.
- **Verbindungen** (_Off-Mesh Links_) — Treppe, Absprung, Leiter, Portal. Aus
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

Die Schalter und die sieben Ebenen hingen im **Navigationslabor** an zwei
Wandkonsolen, dort, wo man beim Zusehen stand: oben zeigen, unten schalten,
dazwischen eine eigene Überschrift. Stünden sie in derselben Reihe, hielte man
die Schalter für Ebenen und wunderte sich, warum ein Zombie plötzlich durch
eine Kiste läuft; und „Verbindungen" stünde zweimal darauf und meinte
zweierlei. Deshalb trugen die Schalter intern ein Präfix (`sw:`) — zwei Tasten,
die dasselbe heißen und Verschiedenes tun, sind der Fehler, den man in der
Brille am schwersten findet. Die Welt ist seit September 2026 gelöscht;
geschaltet wird jetzt am Handgelenk und auf der Werkzeugseite, und die eine
Zahl daraus, die man sonst wieder falsch macht, steht hier: **Eine Tafel schaut
nach +Z**, ein Körper nach −Z. Wer eine Konsole wie einen NPC ausrichtet, hängt
sie mit dem Rücken zum Raum an die Wand und sieht eine schwarze Platte.

**Was das Labor war und wozu es gut war.** Elf Buchten, elf rote Knöpfe, und in
jeder eine Behauptung, die man nachprüfen konnte — langer Gang um zwei Ecken,
Stachelgrube, Kiste im Weg, zu enger Gang, Tür fällt hinter dem Verfolger zu,
Portal, von dem nur einer weiß, Dachkante, Podest und Sprung, drei Steigungen.
Es war der einzige Ort, an dem eine Wegsuche nicht als Zahl, sondern als
**Eindruck** geprüft wurde: „der Zombie läuft durch die verriegelte Tür" ist
keine falsche Zahl, sondern ein Weg, den man erst sieht, wenn man ihn abläuft.
Was es an Einsichten gebracht hat, steht heute dort, wo es hingehört — in
`navBake.ts`, `navProfile.ts`, `navDoor.ts` und `PhysicsWorld.ts` —, und die
**Navigationszone der Testwelt** stellt vier seiner Fragen wieder auf: enger
Gang mit Kiste, Tür, Stachelfeld, ein NPC von A nach B.

Die drei Zahlen, an denen es zweimal gescheitert ist, gelten weiter:

- **Jedes Maß ist ein Vielfaches der Kachel** (`nav/navTile.ts`, seit September
  2026 ein Meter). Das Abtasten fragt zwischen zwei Kachelmitten genau **einen**
  Punkt: die Grenze dazwischen (`navBake.ts`, `joinTiles`). Eine Wand einen
  halben Meter daneben steht in der Welt, aber nicht auf der Karte — der NPC
  plant seelenruhig einen Weg mitten hindurch und bleibt daran hängen. Genau so
  war das Labor lange gebaut (22 × 16 Meter im Raster von 2,5), und von den
  Wänden jeder Bucht kannte die Wegsuche zwei: die Rückwand fehlte, die
  Stirnwände fehlten, und ein Zombie im langen Gang lief hinten aus seiner Bucht
  heraus und um das ganze Labor herum. Wer eine Wand danebenstellt, sieht es im
  Test und nicht in der Brille.
- **Die Kachelmitte entscheidet, auch beim Anmalen** (`navBuild.paintRect`,
  `coverRect`). Eine Kachel gehört zu einem Rechteck in Weltmetern, wenn ihre
  **Mitte** darin liegt — dieselbe Regel, nach der das Abtasten Boden findet.
  Hier lief einmal eine Schleife bis einschließlich der Rechteckkante, und die
  gehört schon zur nächsten Kachel: Ein Stachelfeld von sechs Kacheln war auf
  der Karte sieben breit, und zwar nur nach Osten und nach Süden. Zu sehen war
  davon nichts als ein Mensch, der einen viel zu großen Bogen darum lief — die
  Kachel daneben galt ihm ja als Grube. Ein Anmalen, das eine Kachel zu weit
  reicht, sieht man nie an der Karte, sondern immer nur an einem Weg, der
  komisch aussieht.
- **Ein Zombie bemerkt einen Spieler auf 22 Meter** (`npcBrains.ts`, `sense`).
  Im Labor waren es vom Mittelgang zu den äußeren Buchten fast vierzig, und
  fünf von sechs roten Knöpfen starteten damit ein Szenario, in dem niemand
  einen Schritt tat — das sah nicht nach einer zu großen Zahl aus, sondern nach
  kaputter Wegsuche. Wer etwas vorführen will, stellt den Zuschauer in
  Sichtweite oder gibt dem NPC einen **Auftrag** (Hirn _Zum Ziel_) statt eines
  Spielers.

**Die Stachelgrube war eine Falle und kein Anstrich**, und daran hängt die eine
Stelle, an der eine Karte mit Absicht etwas anderes sagt als die Geometrie: In
der Welt war sie ein Loch, über dem das Abtasten keinen Boden findet — ohne eine
Zeile dagegen plante niemand mehr hindurch, und aus der Falle wäre eine Wand
geworden, um die beide Sorten herumgehen. Also liegt auf der Karte an derselben
Stelle ein ganz normaler Weg, auf dem Stacheln stehen (`navBuild.coverRect`).
Die Grube muss dafür **tiefer sein als das Band**, mit dem das Abtasten Böden
einer Etage zuschlägt (`BAKE_DEFAULTS.band`, 1,6 m) — sonst wäre sie für die
Karte bloß eine tiefergelegte Kachel mit einer Treppe hinein und wieder heraus.
Das Stachelfeld der Testwelt macht es sich einfacher: Es ist eine
**Kachelnotiz** auf ebenem Boden (`TileFacts.hazard`) und braucht kein Loch.

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
**Diese Zahlen standen einmal im Abtasten** (`climb` 2,2 m, `drop` 2,6 m) und
galten damit für jeden. Sie stehen jetzt im **Profil**, und das Abtasten hat
nur noch eine einzige Grenze (`reach`, sechs Meter): ab wann eine Kante keine
Kante mehr ist, sondern eine Hauswand. Was das ändert, sieht man an einer
Dachkante: Vorher hätte ein Hamster sie genommen wie ein Zombie, denn die Karte
kannte nur eine Sorte Bein. Und die eine Zahl, die dabei keine Geschmacksfrage
ist: Ein Dach auf **2,4 m** liegt über dem, was sich der Beweglichste noch
**hochzieht** (`jumpUp`, 1,2 m), und unter dem, was ein Zombie
**hinunterspringt** und überlebt (vier Meter, `navFall.safeFall`) — es ist damit
ein Weg nach unten und keiner nach oben, und für einen Hamster, der zwei Meter
überlebt, gar keiner.

**Und hinauf kommt er inzwischen doch — er springt.** Ein NPC ist ein
dynamischer Zylinder ohne Schrittautomatik: Er _steigt_ keine Stufe, er kann nur
fallen oder fliegen. Also fliegt er. Der Läufer meldet zwei Sorten von
Absprung getrennt (`navAgent.ts`, `AgentStep`): `jump` ist das **Portal** —
Versetzen, denn dazwischen gibt es keinen Weg —, `leap` ist der **Sprung**, und
den rechnet `Npc.launch` als schrägen Wurf aus: aus der gewünschten Steighöhe
folgt die Absprunggeschwindigkeit, daraus die Flugzeit bis zur Zielhöhe, daraus
die waagerechte Geschwindigkeit. Die Schwerkraft kommt aus der **Welt** und
nicht aus einer Konstante — bei wenig Schwerkraft springt er weiter, und das
soll er auch. Solange er fliegt, hat das Hirn nichts zu sagen: Eine Wurfparabel,
in die jedes Bild eine waagerechte Wunschgeschwindigkeit geschrieben wird, ist
keine mehr, sondern ein Schweben.

Gesprungen wird über **Sprungverbindungen** (die Lücke zwischen zwei Dächern)
und über **Stufen, die zu hoch zum Hinauftreten sind** — gemessen an der
größten einzelnen Stufe der Verbindung (`NavLink.step`) und nicht an ihrem
Höhenunterschied. Der Unterschied ist der zwischen zwei Rampen, die gleich hoch
enden: Vier Stufen von 60 cm sind vier Sprünge; zwanzig von zwölf Zentimetern
sind ein Gang. Wer für zwölf Zentimeter hüpft, sieht aus wie ein Frosch — und
wer sie geht, ohne einen Character-Controller zu haben, steht davor. Der bleibt
deshalb der sauberere Weg und steht weiter auf der Liste.

**Eine gebrochene Kante, wegen eines Zwanzigstelmillimeters.** Ein Zylinder
sinkt beim Aufliegen ein wenig in seine Unterlage ein, und damit steht die
**senkrechte Seitenfläche des Nachbarkastens** vor seiner scharfen Bodenkante:
Zwei gleich hohe Klötze, die aneinanderstoßen — die oberste Rampenstufe und das
Podest daneben —, sind für ihn keine ebene Fläche, sondern eine Wand. Ein
Zylinder steigt keine Stufe, auch keine von zwanzig Mikrometern. In der Brille
sah das so aus: Die Puppe nahm die Rampe, stand oben, ihr Weg zeigte quer über
den Gang — und sie rührte sich nicht mehr; Karte, Weg, Sprungverbindung und
Absprunghöhe waren alle im Recht. Die Abhilfe: Jeder Zylinder-Collider bekommt
sechs Zentimeter Rundung (`PhysicsWorld.CYLINDER_BEVEL`, `roundCylinder`,
Außenmaße bleiben gleich) — hoch genug für jede Fuge und jede Schwelle, die auf
der Karte als eben gilt, klein genug, dass niemand damit eine Stufe
hinaufspaziert, die er springen müsste. Der Test dazu ist so klein wie der
Fehler: zwei Klötze, ein Zylinder, 1,5 m/s geradeaus über die Naht. Das ist auch
der Grund, warum eine Bank mit **echter Physik** hier nicht durch eine Rechnung
zu ersetzen ist: Ein nachgebauter Körper zeigt so etwas nie.

**Zusehen ohne Brille: die Werkzeugseite.** Bei jeder Welt, die es kann, steht
unter dem Bild der Knopf **Laufen lassen** (`tools.html#welt/test`). Er baut
dieselbe Welt mit echter Physik, kippt die Ansicht senkrecht nach unten und
legt die Knöpfe der Welt als Zeilen daneben — dazu die sieben Debug-Ebenen als
Schalter, die **drei Schalter der Navigation** in derselben Reihe (gestrichelt
umrandet, und sie tragen ihr „aus" im Namen: an ist der Normalfall und soll
ruhig sein) und ein **Ziel**, das ein Tipp auf den Boden versetzt.

**Die Ebene „Wege" zeigt dabei auch den eigenen.** Bis dahin zeigte sie nur, was
die _anderen_ laufen — wer von oben seine Figur losschickt, schaltete sie ein
und sah in einer leeren Welt gar nichts. Der eigene Weg ist derselbe Weg, den
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
Bildmitte an die Figur hängt und sie dann per Tipp _versetzt_, sieht nichts —
die Mitte springt im selben Bild mit. Eine laufende Welt fängt deshalb als
**Karte** an: Der Finger schiebt, die Mitte hängt an der Figur. Wer die Welt
drehen will, sagt es — das ist ein Griff; nach jedem Schritt nachzuschieben sind
zwanzig.

Geschoben wird dabei die **Kamera** und nicht die Bühne (`panX`, `panY` in
`tools/viewer.ts`): Verschöbe man die Bühne, wanderte der Drehpunkt mit,
dieselbe Drehung sähe danach anders aus, und ein Tipp träfe daneben. Und wer
selbst schiebt, nimmt der Mitte damit das Folgen ab — man will dorthin sehen,
wohin man geschoben hat.

Das ist die Vogelperspektive aus „was noch fehlt", ohne Brille und ohne Editor;
wie sie funktioniert, steht bei der Werkzeugseite unter _Eine Welt laufen
lassen_.

**Was noch fehlt**: das lokale Ausweichen (RVO) für Engstellen, zerstörbare
Hindernisse samt „schlag drauf, wenn kein Weg da ist", ein **Prüfstand**, der
wieder einen Eindruck prüft statt einer Rechnung (siehe _Tests_) — und der
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

#### Speichern, exportieren, importieren

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

#### Das Weltformat

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

#### Was der Bauplatz noch selbst macht

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

#### Eine Welt laufen lassen

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

#### Bearbeiten auf der Werkzeugseite

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

#### Verbinden: zusehen, während drüben gemessen wird

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

### Die Eingabeseite

Und eine dritte Seite: **`inputs.html`** (`src/inputs/`). Sie beantwortet eine
einzige Frage, und zwar die, die sonst niemand beantworten kann: _Kommt der
Knopf, den ich gerade drücke, im Browser dieses Geräts überhaupt an — und unter
welcher Nummer?_

**Wofür sie gebaut ist**, steht nicht im Code, sondern im Gerät: der Browser
einer PS5, ein Fernseher, ein Telefon. Dort gibt es keine Entwicklerwerkzeuge,
keine Konsole und keinen Weg, `navigator.getGamepads()` selbst aufzurufen. Wenn
dort ein Knopf im Spiel nichts tut, ist die Fehlersuche vorbei, bevor sie
angefangen hat — man weiß nicht, ob der Browser den Knopf nicht meldet, ob er
ihn unter einer anderen Nummer meldet, oder ob er schlicht nicht belegt ist.
Genau diese drei Fälle trennt die Seite, und zwar von oben nach unten:

- **Gerät**: die Kennung, die der Treiber ausgibt, die erkannte Marke, und —
  wichtiger als beides — ob `mapping === 'standard'` gilt. Steht dort nicht
  `standard`, ist jede Nummer darunter die Nummer, die sich dieser Treiber
  ausgedacht hat, und die Tabelle daneben eine Vermutung. Das muss dastehen, wo
  man hinsieht, und nicht in einer Fußnote.
- **Am Controller**: ein gezeichnetes Pad, auf dem leuchtet, was gedrückt ist
  (`inputs/padDiagram.ts`). Es dreht die Richtung um — man drückt und sieht **an
  der Stelle**, wo man gedrückt hat, ob es angekommen ist; eine Liste aus
  achtzehn Zeilen beantwortet das vollständig und trotzdem nicht, weil man darin
  nachzählen muss. Gezeichnet und nicht fotografiert: Ein Foto wäre _ein_ Pad,
  angeschlossen ist irgendeines. Was mit der Marke wechselt, sind allein die
  Zeichen darauf.
- **Code des gedrückten Knopfes**: die Nummer groß, darunter `gamepad.buttons[N]`
  in genau der Schreibweise, mit der man ihn im eigenen Code wiederfindet, und
  darunter ein Protokoll. Das Protokoll führt **Flanken und keine Zustände**:
  Ein gehaltener Knopf steht einmal da und nicht sechzigmal pro Sekunde.
- **Alle Knöpfe** und **Achsen**, vollständig, auch die, die nichts tun — wer
  wissen will, ob sein Knopf ankommt, will die Liste sehen, in der er *nicht*
  aufleuchtet. Die Achsen stehen **ungerechnet** da: Dass ein ruhender Stick
  0,04 meldet, rechnet `core/gamepad.ts` im Spiel mit seiner runden Totzone weg,
  und das ist dort richtig; hier ist es die Antwort auf die Frage, warum die
  Figur von allein läuft. Eine Diagnoseseite, die schönt, taugt nichts.
- **Was die Spielwiese daraus macht** — mit `readGamepad` aus `core/gamepad.ts`,
  also **derselben** Funktion, die im Spiel läuft. Eine zweite Deutung hier wäre
  eine, die beim nächsten Umbau der Belegung stehen bleibt und dann das Falsche
  zeigt. Erst dieser Kasten trennt „der Knopf kommt nicht an" von „der Knopf ist
  nicht belegt".
- Dazu **Tastatur und Zeiger** (`event.code` ist dasselbe Rätsel wie
  `buttons[3]`, und eine Fernbedienung schickt Tasten, die auf keiner Tastatur
  stehen), **Gerät und Browser**, ein Knopf **Bericht kopieren** — von einer
  Konsole aus ist Abtippen die Alternative, und wo die Zwischenablage gesperrt
  ist, klappt der Text zum Markieren aus — und **Rütteln testen**, wo es einen
  Motor gibt: Ein Pad, dessen Knöpfe ankommen, das aber nicht rüttelt, ist halb
  angeschlossen, und das sieht man sonst nirgends.

**Die eine Erklärung, die niemand errät**, steht groß unter der Statuszeile: Ein
Browser meldet ein angestecktes Pad erst, wenn daran **einmal ein Knopf gedrückt
wurde** — die Liste der angeschlossenen Geräte wäre sonst ein Fingerabdruck für
jede Werbeseite. „Kein Pad gefunden" heißt hier also fast immer „drück mal was"
und fast nie „das Kabel ist kaputt". Aus demselben Grund ist
`gamepadconnected` hier nur eine Nachricht und keine Bedingung: Die Schleife
läuft von der ersten Sekunde an und fragt jedes Bild neu, denn ein Pad, das
schon vor dem Laden der Seite gedrückt wurde, meldet das Ereignis nie.

**Wo die Arbeit steckt, steckt sie nicht auf der Seite.** Welche Nummer welche
Taste ist und wie sie auf welchem Gerät heißt, steht in
`core/gamepadReport.ts` — kein DOM, kein `navigator`, und deshalb von einem Test
nachgerechnet; das Bild in `inputs/padDiagram.ts`, ebenso. Im Container steckt
kein Controller, und ein Stück Eingabe, das man nur mit Hardware in der Hand
prüfen kann, ist ungeprüft. Die Tabelle hat dabei **vier Spalten und keine
Fallunterscheidung nach Gerät**: Das Standard-Mapping legt die Reihenfolge fest
(unten, rechts, links, oben, dann die Schultern, dann die Mitte, dann das
Steuerkreuz), und was sich zwischen Xbox, PlayStation und Switch unterscheidet,
ist allein die Aufschrift derselben Stelle — `A` oder `✕`, `LB` oder `L1`. Ein
Pad, dessen Marke wir nicht erkennen, bekommt die neutrale Spalte und ist damit
vollständig beschrieben, nicht halb. Die Marke selbst wird aus `gamepad.id`
geraten, und zuerst an der **Herstellernummer** (`Vendor: 054c`): Ein DualShock 4
heißt in Chrome schlicht „Wireless Controller", und ein Adapter nennt sich, wie
er will.

Was auf der Seite selbst bleibt, ist die Schleife — und **eine Regel**: Es wird
nur geschrieben, was sich geändert hat. Achtzehn Knöpfe, vier Achsen und sieben
Zeilen darunter sechzigmal je Sekunde neu zu setzen heißt, dem Browser siebzigmal
pro Bild Arbeit zu machen, die niemand sieht; auf einem Konsolenbrowser ist das
der Unterschied zwischen einer flüssigen Seite und einer, die beim Knopfdruck
hakt. Dasselbe gilt für das Bild: Es wird neu gezeichnet, wenn Marke oder
Knopfzahl wechseln, und sonst nie.

Gebaut wird sie im selben Vite-Lauf wie die anderen beiden
(`rollupOptions.input` in `vite.config.ts`).

#### Zwei Karten: wo ein Knopf sitzt, und was er tut

Die Seite blieb nicht lange beim Zusehen, und der Anlass war ein Gerät:
**Ein Backbone am iPhone meldet den unteren Gesichtsknopf als `buttons[1]`**
und den rechten als `buttons[0]` — getauscht gegenüber dem Standard-Mapping.
Wer damit unten drückt, benutzt nichts, weil _Benutzen_ auf Nummer 0 liegt.
Die Seite zeigte das sofort; ändern ließ es sich nicht.

Daraus wurde `core/inputMap.ts` (reine Rechnung, mit Test) und
`core/inputStore.ts` (`localStorage`, `bgvr.inputs`). Der Kern ist, dass hier
**zwei** Dinge auseinandergehalten werden, die sich gleich anfühlen:

- Die **Gerätekarte** sagt, **welche Nummer wo sitzt**. Sie gehört dem Gerät,
  liegt unter dessen Kennung (`deviceKey`, aus `gamepad.id`) und gilt für kein
  anderes — ein Treiberfehler eines Backbones ist an einem DualSense schlicht
  falsch.
- Die **Belegung** sagt, **welche Stelle was tut**. Sie gehört dem Menschen und
  gilt für alle Geräte.

**Und deshalb hängen Aktionen an Stellen und nicht an Nummern.** _Benutzen_ ist
„der untere Gesichtsknopf", nicht „Nummer 0". Hängte die Belegung an Nummern,
wäre die Gerätekarte eine Kosmetik, die das Bild auf der Seite richtet und das
Spiel weiter falsch lässt — und man müsste an jedem Pad, das anders zählt, alles
neu einstellen. So richtet **eine** Angabe beides: Steht in der Karte, dass
Nummer 1 unten sitzt, dann benutzt Nummer 1, im Bild leuchtet unten, und in der
Liste heißt diese Nummer `✕`.

Drei Regeln stecken darin, und alle drei sind es wert:

- **Ein Tausch ist ein Handgriff.** Wer sagt „unten sitzt Nummer 1", sagt
  unvermeidlich auch etwas über Nummer 0 — sie kann nicht auch unten sitzen.
  `assignSlot` schickt sie deshalb dorthin, wo Nummer 1 herkam. Damit ist der
  häufigste Fall überhaupt — zwei verwechselte Knöpfe — **eine** Bewegung, und
  es kann keine Karte entstehen, in der eine Stelle zweimal vorkommt
  (`layoutSlots` lässt eine Abweichung gewinnen und den Rest leer laufen).
- **Eine Stelle gehört einer Sache.** `bindPad` nimmt sie allem anderen weg; ein
  Knopf, der zugleich schießt und zoomt, ist kein eingestellter Knopf, sondern
  ein unvorhersehbarer. Was dadurch leer läuft, bleibt leer und steht als „kein
  Knopf" da — eine Aktion ohne Knopf ist eine Entscheidung, kein Fehler.
- **Gespeichert wird nur der Widerspruch.** Wer heute `Tab` ausdrücklich auf die
  Werkzeugliste legt, hätte sie sonst morgen weiter dort, auch wenn die
  Voreinstellung längst eine bessere Taste kennt.

Gelesen wird beides an **einer** Stelle: `readGamepad` bekommt einen `ButtonPlan`
(Nummern je Absicht, gerechnet von `padPlan`), `FlatControls` fragt seine Tasten
über `keysFor`. Ohne Plan gilt `DEFAULT_PLAN`, und der ist Zeile für Zeile das,
was dieses Projekt immer hatte — wer nichts einstellt, merkt von dem ganzen
Apparat nichts. **Die Sticks sind nicht dabei**: Laufen und Zielen sind Achsen,
und eine Achse auf einen Knopf zu legen wäre ein anderes Gefühl und nicht
dieselbe Sache.

Einstellen kann man es an zwei Orten, und beide benutzen dieselben Funktionen:
auf der Seite (Felder in _Alle Knöpfe_ für die Karte, Zeilen unter _Belegung_
für den Rest) und **im Spiel** unter _Menü → Eingaben_ (siehe unten). Der Weg
zurück steht überall daneben — eine Einstellung ohne Rückweg ist eine Falle.

#### Was der Browser der PS5 kann, und was nicht

**Er hat die Gamepad-API nicht.** Der DualSense steuert dort einen Mauszeiger,
und mehr kommt auf einer Webseite nicht an (nachgesehen am 16.09.2026 auf einer
PS5). Das ist keine Einstellung, die man findet, sondern eine Grenze des Geräts.

Die Seite sagt das jetzt ausdrücklich: Fehlt `navigator.getGamepads`, steht dort
nicht „Kein Pad gefunden — drück mal was", sondern der Satz über den Mauszeiger.
Der Unterschied zwischen den beiden Meldungen ist der Unterschied zwischen einer
Minute und einer Stunde Suche.

Für die Spielwiese heißt das: Auf einer PS5 spielt man **mit dem Zeiger**, und
genau dafür ist die Ansicht _Von oben_ ohnehin gebaut (Maus zielt, Klick
schießt). Der Vollbildknopf ist dort besonders viel wert.

### Menü → Eingaben

Dieselbe Belegung wie auf der Eingabeseite, aber dort, wo man steht, wenn sie
einem auffällt (`App.inputsMenu`). Vier Zeilen:

- **Was gerade anliegt** — mitgeschrieben wie die Bildraten-Zeile im
  Grafik-Menü: nur die Zeile, nicht der Baum, und nur solange das Menü offen
  ist (`render`). Ohne diese Rückmeldung stellt man blind ein.
- **Belegung am Pad** und **an der Tastatur** — je Aktion eine Zeile mit dem,
  worauf sie gerade liegt.
- **Karte dieses Geräts** — je Stelle eine Zeile mit ihrer Nummer; es gibt sie
  nur mit Pad.
- **Alles auf Standard**, und in den Untermenüs die kleineren Rückwege.

Eingestellt wird überall gleich: Zeile antippen, dann drücken, was es tun soll.
Abgehört wird dabei **nichts Neues** — `FlatControls.captureNext` biegt den
nächsten Druck einmal um, statt eine zweite Stelle aufzumachen, die Tasten
liest. Solange eine Zeile wartet, spielt dieses Bild niemand: Sonst spränge man
beim Einstellen des Sprungknopfes, und die Werkzeugliste klappte auf, während
man sie neu belegt. Gesucht wird dabei die **Flanke** und nicht der Zustand —
wer die Zeile mit `A` angetippt hat, hält `A` in diesem Moment noch gedrückt.

### Vollbild, wo keine Brille ist

In der Brille stellt sich die Frage nicht: Eine XR-Sitzung _ist_ Vollbild. Am
Bildschirm ist sie die einzige Antwort auf dieselbe Klasse von Geräten, für die
die Eingabeseite gebaut ist — Konsolenbrowser, Fernseher, Telefon im Querformat:
Dort kostet die Adresszeile ein Fünftel der Fläche, und das Spiel läuft im Rest.
Also steht ein Knopf mit dem Vollbildsymbol auf der Startseite oben rechts
(`#landing-full`) und im Streifen des Spiels neben _VR_ (`#hud-full`) — derselbe
Knopf an zwei Stellen, so wie das Menü es schon ist. **Und dieselbe Handlung
noch einmal als Zeile unter _Menü → Grafik_** (`App.fullscreenRow`): Auf einem
Telefon im Querformat verdeckt genau der Streifen mit dem Knopf das, was man
loswerden will, und wer das Menü offen hat, sucht nicht darunter. Sie ist
**keine Einstellung** — Vollbild ist ein Zustand des Browsers, kein Wert im
Speicher, und eine Vollbildanfrage braucht ohnehin eine frische Geste —, also
liest die Zeile jedes Mal den Stand und beschriftet sich danach.

**Auf dem iPhone gibt es keinen davon, und das ist keine Lücke, sondern das
Gerät.** Safari kennt dort Vollbild nur für ein `<video>`; was es zeigte, wäre
der Videoplayer und nicht die Spielwiese, und `fullscreenSupported` sagt deshalb
ehrlich „nein" und blendet Knopf und Zeile aus. Der eine Weg, der dort
funktioniert, steht im Kopf von `index.html`:
`apple-mobile-web-app-capable` und ein Web-App-Manifest mit
`display: fullscreen` (`public/manifest.webmanifest`). _Zum Home-Bildschirm
hinzufügen_, und die Seite startet ohne Adresszeile und ohne Systemleiste —
auf Android genauso, nur heißt es dort _installieren_. Was alles dazugehört,
damit das mehr ist als ein Vollbildersatz — Symbole, Service Worker, der Knopf
auf der Startseite —, steht unter
[Die Seite als App](#die-seite-als-app-manifest-symbole-service-worker).

Das API dafür ist zwei Zeilen, und die zwei Zeilen sind der Grund für
`core/fullscreen.ts`: **Es gibt sie doppelt.** Safari und die WebKit-Browser der
Konsolen kennen bis heute nur `webkitRequestFullscreen`, ohne Promise, und ein
`element.requestFullscreen()` läuft dort in einen `TypeError` — ein Knopf, der
nur auf dem Schreibtisch des Entwicklers klappt, hätte genau die Geräte
verfehlt, für die er gedacht war. Drei Entscheidungen dazu:

- **Wo der Browser es nicht erlaubt, gibt es den Knopf nicht** — `hidden`, nicht
  grau. In einem `<iframe>` ohne `allow="fullscreen"` steht die Funktion da und
  wirft; ein Knopf, der eine Fähigkeit behauptet und nichts tut, ist schlimmer
  als keiner. Gefragt wird `fullscreenEnabled`, also die Erlaubnis und nicht nur
  die Existenz.
- **Beschriftet wird nach dem Stand, nicht nach dem Klick.** `Esc` beendet das
  Vollbild, die Systemtaste eines Fernsehers auch, und beide fragen niemanden;
  deshalb hängt das Umbeschriften an `fullscreenchange` (und an
  `webkitfullscreenchange`, aus demselben Grund wie oben). Welches der beiden
  Symbole man sieht, entscheidet `aria-pressed` und damit dasselbe Attribut, das
  Vorlesegeräten den Stand sagt — es kann keine zweite Wahrheit dazu geben.
- **Ein „nein" wird nicht geworfen, sondern zurückgegeben.** `toggleFullscreen`
  liefert den Stand _nach_ dem Umschalten und nicht den Wunsch: Vollbild ist
  eine Bequemlichkeit, und eine Bequemlichkeit, die eine Ausnahme in die Konsole
  schreibt, hat niemandem geholfen.

### Die Seite als App: Manifest, Symbole, Service Worker

**Die Spielwiese lässt sich installieren** — auf dem Telefon, am Schreibtisch
und in der Brille —, und danach ist sie eine App mit eigenem Symbol, eigenem
Fenster und einem Start, der kein Netz braucht. Das ist keine zweite Fassung
des Projekts, sondern dieselbe Seite mit vier Zutaten: einem Manifest, Symbolen
als PNG, einem Service Worker und einem Knopf, der nur dasteht, wo er etwas
bewirkt.

Der Anlass steht einen Abschnitt weiter oben: **Auf dem iPhone ist das
Installieren der einzige Weg zum Vollbild.** Alles andere kam dazu, weil es
ohnehin danebenlag.

#### Das Manifest (`public/manifest.webmanifest`)

Es lag schon da, als es nur um Vollbild ging, und ist jetzt vollständig:
`display: fullscreen` mit `standalone` als Rückfall, Hintergrund- und
Themenfarbe wie in `style.css`, dazu **Symbole als PNG** und drei
**Kurzbefehle** (Haunting, Werkzeuge, Eingaben — auf Android das lange
Antippen des Symbols).

Zwei Entscheidungen darin sind es wert, aufgeschrieben zu werden:

- **Alle Pfade sind relativ** (`start_url: "."`, `scope: "."`, `icon-192.png`),
  denn dieselbe Datei liegt lokal an der Wurzel und auf GitHub Pages unter
  `/vr/`. Den `href` des `<link rel="manifest">` in den drei HTML-Seiten
  schreibt Vite selbst auf die Basis um (`BASE_PATH`).
- **Kein `id`.** Fehlt es, ist die Kennung der App ihre `start_url` — und die
  stimmt an jeder Stelle, an der das Manifest liegt. Ein relatives `id` wird
  dagegen gegen den _Ursprung_ aufgelöst und nicht gegen das Manifest: Es wäre
  genau die Sorte Feld, die man einmal einträgt und drei Deploys später als
  zweite App im Startmenü wiederfindet.

#### Die Symbole (`public/icon.svg`, `tools/icons.mjs`)

Ein Manifest darf ein SVG als Symbol angeben, und Chrome nimmt es — **iOS
nicht**: Safari holt sich das Symbol für den Startbildschirm aus
`<link rel="apple-touch-icon">`, und dort zählt nur PNG. Dazu will Android ein
`maskable`-Symbol, aus dem sich jedes Gerät seine eigene Form schneidet: Kreis,
Tropfen, abgerundetes Quadrat.

Also gibt es **eine** Vorlage und einen Befehl, der die Fassungen daraus macht:

```
npm run icons     # public/icon.svg  →  icon-192, icon-512, icon-maskable-512, apple-touch-icon
```

Gerendert wird mit dem Chromium, der ohnehin für den Rauchtest da ist; die
Ergebnisse liegen im Repository, **ein Build braucht keinen Browser**. Das
Motiv sind die zwei Portale des Banners, und sie liegen in der Gruppe `#art`:
Für die `maskable`-Fassung schrumpft der Befehl **nur diese Gruppe** und lässt
Himmel und Gitter bis an den Rand laufen. Ein Symbol, das man als Ganzes
schrumpft, bekommt einen Rand in der Hintergrundfarbe, und den sieht man auf
jedem hellen Startbildschirm.

#### Der Service Worker (`src/sw.ts`, `core/swRoutes.ts`)

Er ist der Teil, der eine installierbare Seite von einer installierten App
unterscheidet: **Ohne einen Service Worker, der eine Anfrage beantworten kann,
wenn nichts da ist, bietet Chrome das Installieren gar nicht erst an.**

**Die Entscheidung steht nicht in ihm**, sondern in `core/swRoutes.ts`, als
reine Funktion mit Test. Der Grund ist derselbe wie überall hier, nur schärfer:
Ein Fehler in einem Service Worker sieht nicht aus wie ein Fehler, sondern wie
eine alte Welt, die nicht weggeht — und auf einer Brille sind das zwanzig
Minuten Sucherei, bevor überhaupt jemand auf den Speicher kommt. Vier Wege gibt
es, und mehr sollen es nicht werden:

| Weg            | Wofür                                          | Warum                                                                              |
| -------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `page`         | die drei HTML-Seiten                           | erst das Netz: Eine Seite nennt die Namen aller anderen Dateien                     |
| `immutable`    | alles unter `assets/` mit Hash im Namen        | erst der Speicher: Diese Datei ändert sich nie, sie heißt sonst anders              |
| `revalidate`   | Modelle, Töne, Controller-Profile, das Manifest | sofort da, im Hintergrund nachgeholt: feste Namen, großer Inhalt                    |
| `bypass`       | fremde Server, `POST`, `Range`, Quellkarten    | gar nichts tun — und das ist bei den Relays der Verbindung die einzige richtige Wahl |

Und fünf Dinge, die je einen Abend gekostet haben:

- **`ignoreVary: true` bei jeder Suche im Speicher.** Ohne diese Zeile findet
  der Speicher seine eigenen Dateien nicht: Ein Server, der `Vary: Origin`
  mitschickt (`vite preview` tut es), macht aus jeder abgelegten Antwort eine,
  die nur zu einer Anfrage mit derselben Herkunft passt — und Vite fragt die
  Module der Seite mit `crossorigin` an, die Liste beim Einrichten dagegen
  ohne. Das Ergebnis war eine Seite, die offline startete und dann ohne ein
  einziges Skript dastand, obwohl jede Datei im Speicher lag.
- **Ein Hash zählt nur unterhalb von `assets/`.** Vites Hashes sind
  Base64 und enthalten selbst Bindestriche (`main-Bd7_x-1a.js`) — nach dem
  Muster allein wäre `apple-touch-icon.png` eine unveränderliche Datei, und das
  Symbol ließe sich bis zum nächsten Deploy nicht mehr austauschen.
- **Zwei Speicher.** `bgvr-shell-<build>` trägt die Nummer des Builds und wird
  beim Aktivieren des nächsten gelöscht; `bgvr-media` überlebt ihn. Modelle und
  Töne sind zweistellige Megabytes mit festen Namen — sie nach jedem Deploy neu
  über Mobilfunk zu ziehen, wäre die unfreundlichste Art, einen Tippfehler zu
  korrigieren.
- **Kein `skipWaiting`.** Ein neuer Build übernimmt beim nächsten Start und
  nicht mittendrin: Wer gerade in der Brille steht, verliert sonst die Welt
  unter den Füßen, weil im Hintergrund ein Deploy lief. Solange der alte
  Service Worker weiterläuft, schadet er nichts — Seiten holt er ohnehin erst
  aus dem Netz, und jede Datei, die eine frische Seite nennt, hat einen neuen
  Namen und liegt in keinem Speicher.
- **Nur im fertigen Build** (`core/pwa.registerServiceWorker`). Im
  Entwicklungsbetrieb säße er zwischen Vite und der Seite und lieferte Module
  aus, die man gerade geändert hat — der unangenehmste Fehler, den man sich
  einbauen kann, weil er aussieht, als sei die Änderung nicht angekommen.
  Ausprobiert wird er mit `npm run build && npm run preview`.

**Und was der Build weiß und die Laufzeit nicht:** die Dateinamen. Ein kleines
Rollup-Plugin in `vite.config.ts` (`precachePlugin`) setzt nach dem Bündeln die
Liste der Hüllendateien in den fertigen `sw.js` ein — die drei Seiten, die
Chunks, die sie **fest** importieren, und deren Stil. Ohne diese Liste wäre die
Spielwiese erst beim _zweiten_ Besuch ohne Netz benutzbar: Beim ersten lädt die
Seite ihre Dateien, während der Service Worker gerade erst installiert wird,
und er sieht davon nichts. Nicht in der Liste steht, was erst beim Betreten
einer Welt geladen wird — jede Welt ist ein eigener Chunk, dazu die
Physik-Engine mit ihren 2,8 MB. Das kommt in den Speicher, sobald es das erste
Mal wirklich gebraucht wird.

Der Service Worker ist deshalb ein **eigener Einstiegspunkt** im Build
(`rollupOptions.input.sw`) mit einem Sonderfall in `entryFileNames`: Sein
Geltungsbereich ist das Verzeichnis, in dem er liegt — ein `sw-C3aB9x2Q.js` in
`assets/` könnte nur `assets/` beantworten. Er importiert nichts außer
`core/swRoutes.ts`, und deshalb bündelt Rollup ihn zu einer Datei ohne
`import`: ein klassisches Skript, wie es Firefox bis heute verlangt.

#### Der Knopf (`core/install.ts`, `core/pwa.ts`, `#install`)

„Installieren" heißt im Web dreimal etwas anderes, und `installState` ist die
Fallunterscheidung dazu — dieselbe Regel wie beim Vollbild, ein Knopf steht nur
da, wo er etwas bewirkt:

- **Chrome, Edge, der Browser der Quest** melden sich von selbst
  (`beforeinstallprompt`); das Angebot wird aufgehoben und hinter den Knopf
  gelegt. `preventDefault` gehört dazu, sonst zeigt Chrome zusätzlich seinen
  eigenen Streifen am unteren Rand — und der verdeckt auf einem Telefon im
  Querformat genau die Knöpfe, um die es geht.
- **Safari auf iPhone und iPad** meldet sich nie. Dort steht ein **Satz** statt
  eines Knopfes, und er nennt den Weg: Teilen → _Zum Home-Bildschirm_. Erkannt
  wird das Gerät am Kennstring — **und iPadOS meldet sich seit 13 als
  Macintosh**, ist davon also nur an einem zu unterscheiden: Es hat
  Berührungspunkte, ein Mac hat keine.
- **Wer schon installiert hat, wird nicht gefragt.** `isStandalone` fragt
  `display-mode` (jeder Browser) _und_ `navigator.standalone` (Safaris eigene,
  ungenormte Antwort). Eine App, die in ihrem eigenen Fenster läuft und einem
  anbietet, sich zu installieren, hat nicht verstanden, wo sie ist.
- **Alles andere schweigt.**

Geprüft wird das mit Attrappen (`install.test.ts`): ein iPhone steht nicht in
der CI, und ein Kennstring ist das Einzige, was man von einem Gerät hat, das
man nicht hat.

### Welten auf dem Kachelgitter

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

#### Einbauten: was auf dem Gitter einen Zustand hat

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

##### Das Schild ist ein Aushang

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

##### Türen, Knöpfe, Platten

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
  ein Schild, ein Tor werden alle gleich angefasst; *was* dabei passiert,
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
  fällt anderthalb Sekunden nach dem *Verlassen* zu statt unter dem, der in ihr
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
  *fährt*, braucht ein Blatt, das jedes Bild woanders steht. Beides in einem
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
  Grafik → Gitterlinien_) und die durchsichtige Wand vor der Figur kommen aus
  `GridWorld` und nicht aus der Welt — beides hängt an den Kacheln und den
  Quadern, die ohnehin dort liegen (siehe _Von oben_ und
  _Wie schön es aussieht_).

### Eine neue Welt hinzufügen

1. `src/worlds/<name>/<Name>World.ts` anlegen und `World` implementieren
   (`init`, `update`, optional `render`, `preview`, `dispose`).
2. In `src/worlds/index.ts` einen Eintrag in `WORLDS` ergänzen — Titel,
   Beschreibung, Akzentfarbe, unterstützte Rollen und ein `load()` mit
   dynamischem Import.

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
wieder lesen kann. Wer einen Code verschickt, trägt ihn als `code` ein, und
angewandt wird beim Empfang **nur solches** — was jemand von Hand schreibt,
wird nie ausgeführt, auch wenn es zufällig wie ein Code aussieht. Die Knöpfe
_Werkzeug senden_ und _Alles senden_ an der Wand des Eingaberaums gingen über
diesen Weg; sie lohnten auch allein im Raum, weil der Code dann im eigenen
Verlauf landet statt in einer Meldung, die nach vier Sekunden weg ist.

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

**Angewandt wird ein Code auf Knopfdruck.** Eine Welt darf ankommende Codes von
sich aus annehmen — im Eingaberaum war das der Sinn der Sache, zwei Leute
justierten gemeinsam. Überall sonst kam ein Code bisher an, stand im Verlauf und tat
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
- **Körper mit Wirkung**: jeder Mitspieler bekommt eine kinematische Kiste
  unter dem Kopf und zwei an den Händen. Dadurch stößt er beim Vorbeilaufen
  wirklich Dominos um, statt durch sie hindurchzugehen.

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

**Zuschauen sticht _Von oben_.** Beides sind Kameras, und es kann nur eine das
Bild sein: Wer über die Schulter eines anderen sieht, will dessen Bild und
nicht sich selbst von oben. Solange zugesehen wird, ist `App.topDown` deshalb
falsch; hört es auf, kommt die Ansicht von selbst zurück — dieselbe Regel wie
für die Brille.

**Wer zusieht, geht mit.** Steht der gewählte Spieler in einer anderen Welt,
wechselst du beim Aussuchen automatisch dorthin — und genauso, wenn er sie
**später** wechselt: Geht der VR-Spieler durch ein Tor in eine andere Welt,
wird sie bei allen Zuschauenden nachgeladen. Vorher endete das Zuschauen in dem
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
weiß ein Headset über seinen Träger nicht. Eine Welt darf dabei einen
Mitspieler **umsetzen** (`RemoteAvatars.placement`): Sie bekommt jeden, der in
ihr ist und eine Pose hat, und gibt eine andere Pose zurück, `null` für seine
eigene oder eine mit `hidden`, die ihn aus dem Bild nimmt — Haunting setzt so
die Zentrale auf ihre Hocker statt an den Spawn. Welten sehen nie, welcher
Transport darunter liegt — ein WebSocket-Transport ließe sich ohne Änderung an
den Welten ergänzen, er muss nur `NetTransport` implementieren.

### Haunting / Orbital: Raumstation für eine Quest und zwei Mobilgeräte

Haunting bleibt eine `GridWorld`/`PortalWorld`. Die Einsatzzentrale ist sicher;
vier getrennte Lehrzimmer liegen östlich außerhalb der Missionskarte. Der
inhaltliche Stand in README und diese Architektur müssen zusammenpassen.

**Das 1-m-Gitter und das Ende der gemalten 2D-Welt** (Paket H, September
2026, `docs/plan-haunting-1m.md`) — was seither gilt, in Zahlen und Namen:

- **Die Kachel ist ein Meter** (`nav/navTile.TILE` = 1). Die Station steht
  in `house.ts` als Tabelle in Metern: Räume meist 10 × 10 (Cafeteria
  20 × 18, Storage 15 × 12, Electrical 10 × 12, MedBay 9 × 10), **Gänge zwei
  Kacheln breit**, `STATION_BOUNDS` = 70 × 60 m, `HOUSE` 40 × 30 m, Vorplatz
  `APRON` 40 × 5 m, Aufzug `COMMAND_LIFT` 2 × 2. Kein Raum berührt einen
  anderen (eine Kachel Fuge; `roomGraph.test` verlangt, dass es keine
  Wandnachbarn ohne Tür gibt); Räume hängen nur über Gänge zusammen, und
  **zwischen zwei Gängen steht die ganze gemeinsame Kante offen** (Kreuzung).
  Lehrzimmer: `EAST` = Ostrand + 15 m, Safe 12 × 10, Modelle 20 × 15.
- **Die Tür ist eine ganze Kachelkante**: `house.STATION_DOOR_W` = `TILE`
  = 1,0 m, **ohne Pfosten** (`levelBuild.doorParts` lässt den Pfosten bei
  Breite null weg; `stationNavigation.buildGrid` legt dann keine
  Pfostenkästen). Begründung: Auf dem 0,25-m-Raster der Wegsuche
  (`SUBDIVISIONS` = 4) passt ein Körper von `MONSTER_RADIUS` = **0,3** durch
  1,0 m (Streifen 0,4 m, Rasterpunkte bei ±0,125); mit 0,8 m und Pfosten
  läge kein Rasterpunkt mehr im Streifen. `stationRoute` nimmt 0,3 als
  Vorgabe; `PLAYER_RADIUS` bleibt 0,24. Metrische Konstanten, die vorher „eine
  Kachel" meinten, stehen jetzt in Metern: `haunt.SLAM_REACH` 3,75,
  `DOORWAY_CLEAR` 1,9, `technicianBot.DREAD_CORE` = `CONTACT` + 2,5,
  `flatNavigator.WAIT_DEPTH` 0,55, `geometry.doorPath` Tiefe 0,55.
- **Die Hülle**: `StationPlan.solids()` legt Böden je Raum und Wände in
  Läufen zusammen (`mergeFloors`, `mergeWalls`), `batchGridGeometry()` ist
  **false** — der Kern ghostet Wände vor der Figur nur je Quader. Die Decke
  bleibt als Masse auf `level + 1`; was Haunting selbst an die Decke hängt
  (Lampenscheiben, Drehleuchten), trägt `userData.level = 1`, damit die
  Kamera von oben es mit der Decke abschneidet (`core/cutaway.ts`).
  `shipArt`: eine Deckplatte je Kachel (Schachbrett), ein Pfosten je Meter
  Wand, Paneele `TILE − 0,2`; an einer Ecke mit Tür lässt die Wand daneben
  0,34 m frei (`cutPlus`/`cutMinus`), Raumschilder nie breiter als die Wand.
- **Die Ansicht von oben ist die des Kerns**: `HauntingWorld.ownsFlat` ist
  **false**; _Menü → Ansicht_ schaltet wie überall (`core/TopDownCamera.ts`,
  `App.topDown`, `FlatControls`). Der Gierwinkel der Runde kommt von oben aus
  dem Gestell (`HauntingWorld.lookYaw`), sonst aus der Kamera. **Weg** sind
  `map/flatMode.ts`, `map/flatScene.ts`, `map/flatArt.ts`, `map/toolIcons.ts`,
  `map/flat.css`, `map/controls.css` (→ `map/joystick.css`, nur der Stock),
  `map/puzzleOverlay.ts`, `monster/monsterSession.ts`, `desktopControls.ts`,
  `world3d/shipControls.ts`, `rules/lobby.View`/`viewSwap`/`VIEW_LABELS`,
  `worldMenu.opensFlat`/`flatWanted`, das Häkchen „2D-Welt von oben" und der
  Eintrag `haunt:view`, `HauntingWorld.switchView`/`openFlat`/`closeFlat`/
  `enterFlat`/`leaveFlat`/`stepFlat`/`flatShared`. Geblieben ist der
  **Rechenkern** (`flatKernel.ts`, `map/flatRound.ts`, `geometry.ts`,
  `visibility.ts`, `extract.ts`, `mapSnapshot.ts`, `noise*`, Monster, Regeln,
  Audio, Schächte) und die **Karte der Telefone** (`map/mapView.ts`, `views/`).
  Absätze weiter unten, die die gezeichnete 2D-Welt beschreiben, sind
  Geschichte — was dort über Runde, Regeln und Karte steht, gilt weiter.
- **Der Techniker am Bildschirm spielt mit dem Kern**: Alles, was
  `ShipExperience.bind` bekommt, ist beim Kern als `Usable` angemeldet
  (`ShipHost.usable` → `PortalWorld.addUsable`); `A`/`E` gehen durch
  `HauntingWorld.useForward` — Sonderfälle (`ShipExperience.useSpecial`:
  Runde vorbei, im Schrank, Medkit), dann `pickUsable`, sonst der
  Lichtschalter (`useEmpty`). Vor der **offenen** Kiste nimmt `A` das Teil;
  an der Konsole öffnet `A` den Wartungskasten und klappt die Tafel mit dem
  Rätsel auf (`useConsole`). Der Werkzeug-Knopf des Kerns (`#hud-tool`,
  `HauntingWorld.toolChoice` → `ShipExperience.toolChoice`/`chooseTool`)
  wählt Lampe, Radar, Röntgen, Medkit; die Bildschirmhand des Kerns bleibt
  leer (`defaultScreenTool` → `null`). Tasten `1`/`2`/`G`, die Knöpfe „Linke/
  Rechte Hand", Kartenübersicht und Freiflug sind weg; **`Strg` duckt**
  (plus Umschalter **Ducken** in der Tafel) — die eine Taste, die die Welt
  neben dem Kern behält. Der HUD-Streifen ist am Bildschirm DOM
  (`.orbital-hud`, `paintHudDom`), in der Brille weiter der an der Kamera.
  Der Bordstock der Seite läuft, sobald jemand den Stock nimmt
  (`syncTouchStick`). In der Bot-Runde steht das Gestell von oben auf dem
  Bot (`followBotCamera` mit `ctx.topDown`); „Freie Kamera" ist die Figur,
  die läuft. Ein Monster-Telefon ohne Techniker im Raum bekommt keine Karte
  mehr, sondern den Satz `MONSTER_NEEDS_TECHNICIAN`.
- **Die Simulation geht durch die Türen** (`roundSim.move`, `portalPoint`)
  statt auf die Mitte des Nachbarn zu, und **Gefahr ist, was zu Fuß nah ist**
  (`roomGraph.walkingGap`, in `roundSim` und `rules/technicianBot.ts`): Die
  Cafeteria ist zwanzig Meter breit, ihre Mitte liegt von jeder Tür zwölf
  Meter entfernt — gemessen über die Mitten fühlte der Techniker ein Monster
  sechs Meter hinter der Tür nie. Die Gewichte (`botTuning.DEFAULT_TUNING`)
  und `botTraining.test.BOT_RATES` sind auf dem 1-m-Gitter nachgelernt.

**Die Einsatzzentrale (`APRON`) liegt nördlich an der Cafeteria**, nicht mehr
am Südrand hinter einem eigenen Andockkorridor. Die Schleuse
(`commandDoorTile`) geht mitten in die Kantinenwand, der Rest derselben Wand
ist Glas (`commandWindows`), und `spec.entryRoom` ist damit ein echter
Missionsraum statt eines Ganges. `APRON_INNER` ist die Reihe an der
Fensterfront (Tisch der Einsatzzentrale, Terminal, Rückkehrpunkt), `APRON_OUTER` die Reihe mit den
Hüllenfenstern (Abendlicht, Aufzug `COMMAND_LIFT`). Wer eine
Position auf dem Vorplatz braucht, rechnet sie aus diesen beiden Konstanten
und nicht aus `APRON.z` plus einer geratenen Zahl.

**Karte, Geometrie und Art**

- `generateHouse(seed, roomCount)` baut für Stationsaufrufe immer die feste
  Skeld-Anordnung mit 14 Räumen; alte Raumzahlen werden auf 14 normalisiert.
  Namen, Raumtypen, Rechtecke und Türen bleiben über Seeds gleich. Seeds
  verändern Aufgaben/Einrichtung. Der historische Aufruf ohne Raumzahl bleibt
  für alte Haustests erhalten. Separate `spec.passages` werden aus Gangstreifen
  ohne Überlappung erzeugt und tragen **eigene Namen** (`namePassages`: der
  Raum mit der längsten gemeinsamen Wand plus Himmelsrichtung, etwa
  „Cafeteria-Südgang"); der Name steht auch auf dem Gangboden
  (`shipArt.addCorridorName`). Manche Räume haben wie in der Vorlage nur einen
  Eingang. `stationBounds(spec)` statt `HOUSE` für Stationsbounds verwenden,
  `missionExtent(spec)` dort, wo die Einsatzzentrale dazugehört (Wegsuche).
  Die Kontur nutzt rechtwinklige Gridmodule, noch keine 45°-Wände.
  Die Lehrzimmer liegen jetzt bei x≥26 Rasterfeldern außerhalb der Karte.
- `fixtureDimensions.ts` ist der Maßkatalog. `stationLayout.ts` reserviert
  Wandabstand, Türlandungen, Bedienpunkte, Raumdurchquerung und Schachtzugänge.
  Keine separat geratenen Positionen in Art-/Interaktionscode einführen.
  **Die Gasse zu einem Bedienplatz ist breiter als der Spieler** (`LANE`):
  Zwischen zwei Modulen blieben einmal acht Zentimeter — auf dem Papier ein
  Weg, im Raster der Wegsuche keiner, und der Techniker meldete eine ganze
  Runde lang „Weg blockiert". `roomDressing` füllt die Räume darüber hinaus:
  drei Tische, Kantinenausgabe und Wasseraufbereitung in der Kantine, in fast
  jedem anderen Raum eine Insel in der Mitte.
- `fixtureModels.ts` baut abgerundete Geräte, Tanks, Leitungen, Regale, Kojen,
  Fracht und Konsolen. Geometrie wird je Material zusammengefasst; technische
  Grenzmaße bleiben testbar. `shipArt.ts` zeichnet helle Marine-Paneele,
  Raumfarben, Deckfugen, Wegmarken, doppelseitige Schilder mit Wandabstand,
  Kreaturen und den Demo-Techniker. Keine fremden Spielassets verwendet.
- `stationVisibility.ts` kann alle Räume **und Gänge** berücksichtigen.
  Standard-Grid-Hülle und Collider bleiben bestehen; Detailgruppen sind
  raumweise sichtbar. Emissive Schilder brauchen keinen eigenen PointLight.
- **Draußen ist Geometrie, keine Löschfarbe** (`world3d/spaceBackdrop.ts`):
  eine Kugel von innen plus Sterne mit fester Pixelgröße. `App.enterVR`
  fragt zuerst `immersive-ar` an, und in einer `alpha-blend`-Sitzung löscht
  three.js den Puffer immer durchsichtig — `scene.background` als Farbe wird
  dort übergangen. Wer draußen nur die Farbe hat, sieht durch die
  Hüllenfenster das eigene Zimmer. **Wegweiser** (`world3d/signposts.ts`)
  hängen über jeder Öffnung auf beiden Seiten und nennen, was dahinter liegt
  — bei einem Gang auch die Räume an ihm; Türen zwischen zwei Gängen fallen
  zu einem Kreuzungsschild zusammen. Namen kommen aus `map/extract.roomsOf`,
  denselben wie auf der 2D-Karte. Alle Texte liegen in einem Atlas, ein Mesh
  je Raum (`signMesh.ts`) in dessen Hüllengruppe. Die Raumschilder
  (`room-identification`) hängen deshalb auf der türfreien Kachel nächst der
  Wandmitte (`shipArt.closedTileX`), nie über einer Tür.

**Eine Wahrheit für 2D und 3D** (Paket „Eine Wahrheit")

Der Besitzer will die Runde auf dem Telefon **analysieren und einstellen** und
sich darauf verlassen, dass die Brille dasselbe Spiel spielt. Dafür muss die
Ground Truth — die Welt, die die KI sieht, und die Bewegung von Monster und
Spieler — in beiden Welten dieselbe sein. Was seit diesem Paket **geteilt**
ist, steht einmal und wird von beiden Welten gerufen:

- **Der Grundriss und die Karten**: `generateHouse`, `stationLayout`,
  `roomGraph.stationGraph`/`monsterGraph` samt `earshot`, `map/extract.ts`
  als der eine Snapshot (jetzt auch mit `noises`, mit den **gewichteten**
  Kegel- und Hörweiten des Monsters und mit `moving`/`sprinting` aus dem
  Beschluss — vorher zeigte der Späher einer Brillenrunde ein anderes Vieh
  als der einer Telefonrunde).
- **Die Augen des Monsters** (`monster/monsterSight.ts`): im Licht der Karte
  (`map/visibility.litRegions`), im Kegel mit `Profil × Gewicht`, keine Wand
  und kein Türblatt dazwischen (`geometry.lineOfSight`), oder Berührungsnähe
  `CLOSE_SIGHT` 2,5 m. Das Headset rechnet das seit jetzt **je Bild** statt
  alle 0,1 s und mit dem Snapshot statt mit einem Rapier-Strahl auf 24 m ohne
  Kegel und ohne Licht; Möbel zählen damit in keiner Welt als Sichtschutz.
  Das Gehör (`audio/hearing.ts`) war schon dasselbe, läuft in 3D jetzt aber
  ebenfalls je Bild.
- **Die Alarmleiter und das Gedächtnis** (`threat.stepAwareness`,
  `monster/monsterMemory.ts`, `monsterIntercept.ts`), **die Routine**
  (`monsterRoutine.ts`, `paceSpeed`) — mit `here`/`quarry` seit jetzt aus
  `geometry.spaceAtMetres` mit `SPACE_MARGIN`, also mit derselben Trägheit wie
  in 2D, statt von der Kachel abgelesen; die Fährte fragt `monsterGraph.spaceAt`.
- **Der Läufer** (`monster/monsterWalk.ts`, siehe unten bei „Türen und
  Navigation") und **die Türautomatik** (`automaticDoors.ts`, siehe „Die
  2D-Welt"), **der Schlag** ab `CONTACT` 1,7 m, **das Spielertempo**
  (`PlayerRig.pace`, siehe „Tempo ist eine Ungleichung").
- **Die Zahlen**: `PLAYER_RADIUS` = `physics/playerClearance.PLAYER_CAPSULE_RADIUS`
  = 0,24 m (die 2D-Figur war 0,35 m dick und hielt elf Zentimeter mehr
  Abstand zu jeder Wand), **eine Türbreite** `house.STATION_DOOR_W` =
  `TILE` = 1,0 m ohne Pfosten (seit dem 1-m-Gitter; siehe „Eine Türbreite"
  unten), der Würfel der
  Routine im Headset aus dem Samen der Station wie in 2D (`routineDice`;
  vorher eine Konstante), `MONSTER_RADIUS` **0,3** als Wegbreite (0,4 bis zum
  1-m-Gitter; der Rapier-Zylinder ist mit 0,29 m gleich breit).

**Der Rechenkern: die 2D-Runde rechnet auch im Schiff** (`flatKernel.ts`,
`kernelLocomotion.ts`, `HauntingWorld.stepKernel`)

Der Wunsch des Besitzers dahinter, wörtlich: „die 2D-Welt als Basis nehmen,
die Inputs bewegen nur den 2D-Charakter, und der 3D-Charakter wird daraus
geupdated — auch mit den ganzen Navigationen." Genau so läuft es seit diesem
Paket beim Gastgeber in der Brille:

- **Ein Stand, eine Rechnung.** `FlatKernel` baut eine `FlatRound` auf dem
  `HauntState` des Gastgebers (`FlatResume`, nicht kopiert): Was das Schiff am
  Stand ändert (Kiste, Rätsel, Schrank), sieht die Runde im selben Bild; was
  die Runde ändert (Uhr, Türen, Licht, Anzug, Phase, Treffer), sieht das
  Schiff. `ensureKernel` stellt ihn im ersten Bild und neu, sobald der Stand
  ein anderes Objekt ist oder das Haus einen anderen Samen hat (neue Runde,
  2D→3D, Übergabe) — mit den Büchern, die bis dahin warteten
  (`pendingBooks` ← `loadBooks`); `books()` liest die laufende Runde, sonst
  die wartenden Bücher, sonst Riegel und Lampen der Tafel (`this.locks`,
  `this.lampBook`, die mit Kern dessen Bücher _sind_). Die Lampen reisen
  dafür jetzt in `FlatResume.lamps` mit, und `FlatRound` meldet Flackern und
  Ausgehen über `onLamp`.
- **Der Stock geht in die Runde, nicht in die Physik.** `KernelLocomotion`
  hängt sich vor die `PhysicsLocomotion` des Gestells und hält den Wunsch nur
  fest (`wish`); `kernelInput` macht daraus den `FlatInput` der Runde —
  Richtung und Größe am Tempo des Gestells normiert (`rig.pace`), Sprint,
  Ducken (`rig.crouch > 0,15`), der Blick als `yaw` (`lookYaw`: von oben das
  Gestell, das `FlatControls` in die Laufrichtung dreht — die Kamera des
  Kerns schaut dort immer nach Norden —, sonst die Kamera) und der Schritt,
  den der Körper im Spielraum selbst getan hat, als `shift` (einmal je Bild,
  gegen Wände und Kästen geglitten). Die Runde tut den Schritt in ihren
  1/30-s-Scheiben, danach setzt `followKernel` das Gestell so, dass der Kopf
  über der Figur steht, und zieht die Rapier-Kapsel nach (`resync`) —
  Requisiten, Werkzeuge und Hände brauchen sie weiter. **Außerhalb der Karte**
  (Übungslabor, `round.canStand` falsch) und im Schrank trägt wieder die
  Physik (`KernelLocomotion.active = false`); beim Zurückkommen wird die Figur
  dorthin gestellt, wo der Kopf steht (`kernel.place`), und `movePlayerTo`
  (Zentrale, Schrank, Rettung) stellt sie ebenso um. `dash` bleibt 1: Die
  Puste rechnet die Runde, der Wunsch wird nur normiert.
- **Monster und Techniker aus Zahlen sind Figuren der Runde.** Es gibt keinen
  NPC-Körper mehr im Schiff (`Npc`, `NpcDirector`, `NpcVentRide`,
  `MissionBot`): Das Monstermodell (`blob`) steht bei allen — auch beim
  Gastgeber — dort, wo `state.monster` es nennt, mit Blick und Gangart aus
  der Runde (`round.monster.yaw`, `round.decided.pace`); getroffen wird, weil
  die Runde trifft (`hit`, `CONTACT`), das Schiff spürt es als Puls und
  Klick (`crew.hp` gefallen). Die **Bot-Runde** spielt der `TechnicianBot`
  der 2D-Welt auf dem Kern (`FlatKernel.startBot`, von `COMMAND_HOME` aus,
  mit Kollision); `ShipExperience.botPose`/`botStage` lesen ihn nur ab, und
  seine Meldungen gehen ins Funkprotokoll (`relay` → `log`). Im Test bleiben
  Anzug 3 und Monster an, wie vorher; das Gestell des Zuschauers liest der
  Kern in der Bot-Runde gar nicht erst.
- **Was das Schiff aus der Runde liest**, je Bild: `state.insight` (die
  Absicht für Zuschauer), `state.ride` und `crew.venting` (Schacht),
  `ventArt.setOpen`, Meldungen (`FlatEvent` → `relay`: `bad`/`good` als
  Ansage, alles andere als Satz), die Türen (`applyDoors` fragt
  `round.doorOpen`; nur `TRAINING_DOOR` hat noch die eigene Automatik, und die
  Störung `glitchDice` würfelt nur ohne Kern), das Flackern des Spuks
  (`round.spook`), der Lampen-Ton (`round.onLamp` → `lampSound`),
  Geräuschwellen und Monsterkopf für den Snapshot (`round.noises()`,
  `monsterYaw`, `monsterPace`), die Wege-Ebene (`kernel.botNavigation`,
  `kernel.monsterNavigation` statt eigener Läufer) und das Steuer der
  Monster-Station (`netMonster` als `round.driver`). **Die Alarmleiter ist die
  im Stand**: `FlatRound.memory` _ist_ `haunt.crew.threat` (vorher eine
  eigene Leiter je Runde), damit `ShipExperience` Absicht und Jagd daraus
  liest und sie mit dem Stand an alle Geräte geht. Neue Gewichte im Test gehen
  an `round.retune`.
- **Wer rechnet**: nur der Gastgeber im Anzug (`isHost`, Rolle `vr` — die
  Brille oder der Techniker am Bildschirm, `flatTechnician`, keine wartende
  Übergabe); ein Telefon in der Zentrale als Gastgeber lässt die Runde
  stehen. Eine Übergabe lässt den Kern los (`releaseMonster` → `kernel =
  null`) und stellt ihn aus den Büchern neu; `stateMessage` und Snapshot
  ändern sich nicht.
- **Weg ist damit** aus `HauntingWorld`: `stepCrew`, `stepLocks`, `stepLamps`,
  `stepSpook`, `trackMonster`, `noticeRepairs`, `checkItems`, `stepTrail`,
  das eigene Hörmodell samt Geräuschprotokoll, `LitCache`, `MonsterWalk`,
  `MonsterRoutine`/`MonsterMemory`/`Estimator`, `StationTravelPlan`, die
  Puste (`stamina`), der Schrank, in den das Monster jemanden flüchten sah
  (`watchedLocker` — die Kabine reißt jetzt die Runde auf, `cabinStrike`),
  `missionBot.ts` und `missionBot.test.ts`. Die Rundenregeln laufen in der
  Runde (`RoundRules` in `FlatRound`); `HauntingWorld.rules` beantwortet nur
  noch `status`. Tests: `flatKernel.test.ts`, `HauntingWorld.replay.test.ts`
  (Kern statt NPC: Gastgeberwechsel, Bot-Runde, Wahrnehmung, Bücher),
  `groundTruth.test.ts`; der Browser-Smoke liest `world.kernel`.

**Eine Türbreite** (`house.STATION_DOOR_W` = `TILE` = 1,0 m, ohne Pfosten)

Bis zum 1-m-Gitter waren die Türen des Schiffs `PLAN_DOOR_W` 1,2 m breit, das
Modell der 2D-Welt (`geometry.DOOR_WIDTH`) 2,0 m, danach beide „eine Kachel
abzüglich Wandstärke" auf der 2,5-m-Kachel. Seit Paket H ist die Öffnung
**eine ganze Kachelkante** — ein Meter, kein Pfosten: `GridPlan.doorWidth()`
ist der Haken dafür — `StationPlan` (`plan.ts`) überschreibt ihn, alle
anderen Rasterwelten behalten `PLAN_DOOR_W` (`levelBuild.planSolids` lässt
den Pfosten bei Breite null weg, `slidingDoor.ts` fragt den Plan). Das Schott
hat je Seite **zwei Teleskop-Blätter** (`ShipExperience`, `DoorLeaf` mit
`rest`/`travel`); `stationNavigation`, `stationLayout` und `automaticDoors`
(`TRIGGER_CROSS`/`OCCUPIED_CROSS`) rechnen mit `STATION_DOOR_W`, die Figur
der Runde geht `DOOR_WIDTH / 2 − Radius` breit durch (`geometry.walkable`,
`openingAlong` fasst dabei benachbarte offene Türen derselben Wandlinie zu
einer Öffnung zusammen — die Kreuzung zweier Gänge hat keinen Pfosten in der
Mitte). Auf dem Blatt des Archivars bleibt der Türbogen symbolisch
(`PAPER_ARC`). `groundTruth.test.ts` prüft, dass beide Zahlen dieselbe sind.

**Ducken ist ein Tempo** (`mission.CROUCH_FACTOR` = 0,5, `PLAYER_CROUCH_SPEED`)

In beiden Welten: Geduckt geht man halb so schnell, und leiser ist man, weil
man langsamer ist — `audio/cues.stepLoudness(speed)` wählt die Stufe nach dem
Tempo (`SNEAK_LIMIT` 2 m/s → `NOISE.sneak`, über `SPRINT_LIMIT` 3,6 →
`NOISE.sprint`, dazwischen `NOISE.walk`), nicht nach einer Haltung. Sprint
schlägt Ducken. Es kommt aus `rig.crouch` (Stick, `Strg` gehalten, der
Umschalter **Ducken** in der Tafel des Technikers, körperlich) und geht als
`FlatInput.crouch` in die Runde. Das Sichtfeld des Technikers aus Zahlen ist
das der Quest 3: `perception.BOT_FOV` = 110°.

Was **weiterhin verschieden** ist — gewusst, nicht vergessen:

- **Der Körper**: Die Rapier-Kapsel läuft unter der Figur mit und trägt
  Requisiten, Werkzeuge, Stufen und Sprung; außerhalb der Karte
  (Übungslabor) trägt sie allein. Schränke sind in 3D begehbar, in 2D ein
  Kasten — die Runde weiß vom Verstecken nur über `crew.hidden`.
- **Wer nicht rechnet**: Ein Gastgeber ohne Anzug (ein Telefon in der
  Zentrale) hat keinen Kern; seine Runde steht, bis jemand mit Anzug —
  Brille oder Techniker am Bildschirm — Gastgeber wird.
- **Die Trainingssimulation** (`roundSim.ts`) bleibt die grobe Raumkarte
  ohne Wände, Licht und Türen — mit Absicht, siehe „Gewichte, Simulation,
  Training".

**Türen und Navigation**

- `state.shut` beschreibt **Sperren**. `AutomaticDoors` steuert getrennt davon
  die tatsächliche Näherungsöffnung: von beiden Seiten, für Techniker,
  Mitspieler, Monster und Demo-Bot. Nachlauf verhindert Flattern;
  ein belegter Durchgang schließt nicht um eine Kapsel herum.
- **Ab und zu fährt ein Schott von selbst auf** (`rules/doorGlitch.ts`): alle
  `GLITCH_RANGE` = 35–70 s für `GLITCH_HOLD` = 1,8–3,2 s eine beliebige
  **nicht gesperrte** Tür, gewürfelt. Der Grund ist nicht Kulisse, sondern
  Auskunft: Ein fahrendes Blatt hieß bisher immer _jemand ist da_, und wer das
  einmal begriffen hatte, las die halbe Station aus dem Augenwinkel ab — der
  Techniker die Position des Monsters, das Monster die des Technikers.
  Angewendet wird es über dieselbe Mechanik wie jedes andere Auffahren
  (`HauntingWorld.applyDoors` reicht einen Scheinbewohner an `AutomaticDoors`,
  `FlatRound.stepDoors` setzt `near`), damit zwei Regeln sicher gelten: Eine
  **gesperrte** Tür ist nie dabei — die Rechnung bekommt nur die offenen zu
  sehen und lässt eine laufende Störung fallen, sobald ihre Tür gesperrt wird
  —, und beim Zufahren fällt niemandem das Blatt auf den Kopf, weil ein
  belegter Durchgang offen bleibt (`occupants`). Die Störung **öffnet** nur;
  geschlossen wird wie immer.
- **Wer sperrt, wie lange, und wie man es aufbekommt** (`rules/doorLocks.ts`,
  `DoorLocks` beim Gastgeber, nichts davon auf der Leitung): **Gewollt
  gesperrt ist immer nur eine Tür, und sie hält, bis sie von selbst fällt**
  — Schalttafel (`applyFlip`), Techniker vor Ort (`manualDoor`) und die
  2D-Runde (`FlatRound.lockDoor`) teilen sich diesen einen Riegel. Solange
  er hält, tut der Schalter einer zweiten Tür nichts (`lockBlock` → `'busy'`),
  und die gehaltene Tür gibt er auch nicht vorher wieder her (`'held'`);
  danach ist dieselbe Tür `LOCK_COOLDOWN` lang warm (`'cooling'`). Lange gab
  die zweite Wahl die erste frei und ein zweiter Tipp öffnete sie sofort — ein
  Schalter im Takt, und das Monster stand vor einer Wand aus Riegeln, die man
  von Tür zu Tür trug; der Besitzer wollte: gehalten bis zum Ablauf, keine
  zweite Tür solange, dieselbe danach erst einmal nicht wieder, und alles
  davon sichtbar. Jeder Grund hat seinen Satz (`LOCK_BLOCK_TEXT`), und jedes
  Gerät kennt ihn: Die gehaltene Tür reist als optionales Feld
  `HauntState.held` mit (wie `cooling`, ohne Protokollsprung), damit auch ein
  Telefon, das nicht rechnet, beim Tipp „Ein Schott ist schon gesperrt" sagt
  statt einmal umsonst zu drücken (`HauntingWorld.panelSwitch` →
  `doorBooks`). **Auch im Test-Zustand mit denselben Fristen**: Vorher
  schaltete die Tafel dort ohne Buchführung (beliebig viele Türen, kein
  Balken) — wer im Test ohne Frist schalten durfte, sah nie den Balken und
  lernte ein anderes Spiel; nur die Lampen bleiben im Test ein Schalter ohne
  Budget (`flipLampPlain`). **Keine Sperre
  hält ewig:** Zugefallene Türen (der Spuk, `slamDoor`) halten `SLAM_HOLD` =
  20 s, von Hand gesperrte `HOLD_RANGE` = 8–10 s, leicht gewürfelt, damit
  niemand mitzählen kann; `stepLocks` lässt beides je Bild ablaufen, die Tafel
  darf vorher freigeben. `holdUntil` sagt, wie lange noch — daraus wird
  `MapDoor.hold` (über `MapSource.doorHold`) und der **Balken über der Tür**
  auf Karte und 2D-Szene. Eine Sperre, die für immer hielte, wäre keine
  Entscheidung mehr, sondern eine Wand.
  **Eine Tür, die gerade frei geworden ist, bleibt lange frei**
  (`LOCK_COOLDOWN` = **40 s**, `mayLock`/`coolingUntil`): Jeder Weg aus einer
  Sperre heraus — abgelaufen, von der Tafel freigegeben, vom Monster
  aufgezogen, Holz gesplittert — kühlt die Tür ab, und solange sie warm ist,
  lässt sie sich weder wählen (`chooseLock`) noch zuschlagen (`slamDoor`).
  Ohne diese Regel war der Rest eine Einladung: Der Riegel fällt, die Tafel
  legt ihn im selben Bild wieder um, oder der Spuk trifft dieselbe Tür ein
  zweites Mal — und für den, der davor wartet, ging sie nie wieder auf. Zwölf
  Sekunden waren dafür zu wenig: Sie reichten dem, der hindurch wollte, aber
  sie reichten auch der Tafel, die den Riegel gleich wieder setzte, und das
  Monster stand nach der dritten Runde immer noch vor derselben Tür.
  Freigeben darf man, was zugefallen ist — nicht, was man hält; `toggleLock`
  meldet `blocked` mit dem Grund, damit der Schalter sagen kann, warum er
  nichts tut, statt wortlos nichts zu tun.
  **Und die Abkühlung ist sichtbar, in Grün — und sie blinkt.** Vierzig Sekunden hält man sonst
  für einen kaputten Schalter. Die Liste der abkühlenden Türen geht deshalb im
  Stand mit (`HauntState.cooling`, optional, `STATION_PROTOCOL` bleibt 8 — auf
  der Empfängerseite hängt keine Regel daran, gesperrt wird beim Gastgeber);
  `MapSource.doorHold` liefert sie mit `cooling: true`, daraus wird
  `MapDoor.cooling` und derselbe Balken über der Tür wie beim Halten, nur grün
  statt rot (`map/mapView.ts` — auch bei
  zurückgefahrenem Blatt); dazu wechselt das Blatt auf der Karte im
  Sekundentakt in die Farbe der Abkühlung, aus
  der Uhr gerechnet (`Math.sin(time · 7)`), weil ein Balken allein auf einem
  Telefon leicht übersehen wird — „muss optisch gut angezeigt werden", so
  der Besitzer. Auf der Tafel der Schalttafel-Rolle
  (`views/panelRole.ts`) steht die Restzeit unter der Beschriftung, der
  Schalter ist grün und abgeschaltet („noch warm · 27 s"). In 3D brauchte es dafür nichts: `doorLocked` liest
  `state.shut`, und eine abkühlende Tür steht dort nicht drin — ihre Leuchten
  sind ohnehin grün.
  **Und niemandem fällt die Tür auf den Kopf** (`haunt.slammable` mit
  `HauntSight.occupants`, `DOORWAY_CLEAR` = 0,75 Kacheln): Der Spuk sucht sich
  die nächstgelegene Tür, und das war mit Vorliebe die, durch die das Monster
  gerade selbst ging — danach steckte es darin. Wer im Durchgang steht, wird
  nicht eingeklemmt; die Liste ist dieselbe, mit der `AutomaticDoors` einen
  belegten Durchgang offen hält (`HauntingWorld.doorOccupants`), damit nicht
  die eine aufhält, was die andere zuschlägt.
  **Das Monster kann an einem Riegel ziehen** (`pryLock`): Der erste Zug geht
  **nie** auf, jeder weitere steht besser (`pryChance`: 0,3 und dann +0,15),
  im Takt von `PRY_COOLDOWN` = 1,1 s. Im Mittel sind das gut drei Züge und
  knapp vier Sekunden — **weniger, als das Warten kostet**, und genau das ist
  die Absicht: Wer wartet, verliert Zeit; wer zieht, macht Lärm. Sowohl der
  Spieler am Steuer (`monster/monsterHelm.interact`) als auch die KI
  (`FlatRound.moveMonster`) ziehen mit denselben Zahlen. Holz splittert
  weiterhin auf einen Schlag und geht über `releaseLock`, damit die
  Buchführung stimmt.
  **Und es zieht jetzt lieber, als herumzulaufen.** Die Wegsuche umging eine
  gesperrte Tür, solange es irgendeinen Umweg gab — daraus wurde das Spiel
  „ich schließe immer die Tür vor dem Monster", und weil der Umweg oft eine
  halbe Minute kostete, war das Vieh damit festgesetzt. `FlatNavigator.aim`
  bekommt deshalb ein `detourLimit` in Metern (`FlatRound.PRY_DETOUR` = 4 s
  mal Tempo): Kostet der Umweg um die gesperrte Tür mehr als das, führt die
  Route **vor die Tür** und `FlatLeg.door` nennt sie. Verglichen wird auf der
  Raumkarte (`StationGraph.distance` gegen einen Dijkstra ohne die gesperrten
  Kanten) und nicht mit einem zweiten Rasterlauf. Zusammen mit den 40 s
  Abkühlung ist das die Antwort auf das Einsperren: Nach dem Aufziehen bleibt
  die Tür offen, und der nächste Riegel kostet eine neue Entscheidung.
  **Warten ist kein Feststecken**: Wer vor einem Riegel steht, führt seine
  Stilluhr mit (`FlatRound.hold`) — sonst ging das Monster nach dem
  Aufziehen als Erstes den Notumweg über die Raummitte. **Und wer am Ende
  seiner Route steht, auch nicht**: Beim Absuchen bleibt es in der Raummitte
  stehen, bis die Frist um ist, und die Route hat dann keinen Wegpunkt mehr
  vor ihm. Vorher galt das nach 0,6 s als festgelaufen, der Notumweg ging
  „zurück in die Raummitte" — wo es schon stand —, bewegte nichts, die
  Stilluhr lief weiter, und alle 1,2 s kam der nächste Notumweg. Die Wegsuche
  wurde nie mehr gefragt; ein neues Ziel in einem anderen Raum lief es nie an,
  und so stand es minutenlang mit Ziel im Raum, bis eine Sichtung es losriss
  (in zwölf Bot-Runden fünfmal, bis zu 480 s). Festgelaufen ist seitdem nur,
  wer noch Wegpunkte vor sich hat (`FlatNavigator.remaining`) und trotzdem
  nicht vorankommt; `rules/monsterStuck.test.ts` spielt Seed 1 nach und
  verlangt, dass kein Stillstand mit Ziel länger dauert als die Suchfrist.
- **Licht ist knapp, und es ist eine Entscheidung** (`rules/lamps.ts`, `Lamps`
  beim Gastgeber, nichts davon auf der Leitung). **Beide Welten beginnen
  dunkel**: `startMission` setzt `state.lit = []`, und die 2D-Runde tut seit
  diesem Paket dasselbe (`FlatRound`, vorher startete sie mit allen Räumen
  hell). Es geht nirgends von selbst Licht an — auch nicht beim Betreten eines
  Raums und nicht bei einer gelösten Konsole. Wer Licht will, bittet die
  Einsatzkontrolle, und die schaltet es an ihrer Tafel (`applyFlip`,
  `kind === 'light'`, über `switchLamp`); in 2D geht `FlatRound.switchLight`
  durch **dieselbe** Buchführung, damit der Prüfstand nicht ein anderes Licht
  hat als das Spiel. Es gelten dieselben drei Regeln wie bei den Türen
  nebenan: **höchstens `LAMP_BUDGET` = 2 Lampen brennen gleichzeitig** — die
  dritte macht die älteste aus; **keine Lampe brennt ewig** (`LAMP_RANGE` =
  **25–35 s**, leicht gewürfelt: „ein paar Sekunden" ist kürzer als eine
  Minute, aber ein Licht, das nach fünf Sekunden ausgeht, ist keines), und die
  letzten `LAMP_FLICKER` = 3 s davon **flackert** sie (`lampGlow`, dieselbe
  Kurve wie das Zucken des Spuks) und sirrt dabei (`ShipAudio` `'lamp'`, am Ort
  der Lampe — zweimal: beim Flackern und beim Ausgehen); und **was das Monster
  auslöscht, zählt genauso** (`lampOut`, aus `FlatRound.stepSpook` wie aus
  `FlatRound.tick`), damit für den Hacker beides gleich aussieht. `stepLamps`
  lässt die Uhr laufen. Alles, was schon hell war, ohne dass jemand geschaltet
  hat — der helle Test, die gezeichnete Station —, lässt die Buchführung in
  Ruhe. Das Grundlicht der Station ist entsprechend klein
  (`stationLighting.ROOM_BOUNCE` = 0,12, und nur in einem Raum, in dem
  wirklich eine Lampe brennt): Die Taschenlampe des VR-Spielers ist nur dann
  etwas wert, wenn es ohne sie nichts zu sehen gibt.
  **Was noch fehlt:** Die Frist einer Lampe steht nicht auf der Leitung, also
  sieht nur der Gastgeber das Flackern; alle anderen sehen den Raum einfach
  dunkel werden, sobald der nächste Stand kommt. Anders als beim Spuk lässt es
  sich nicht aus der Monsterposition nachrechnen — dafür müsste `HauntState`
  die Fristen tragen, und das wäre ein Protokollsprung.
- `ShipExperience` liest `doorOpen` für die bewegten Blätter und `doorLocked`
  für beidseitige rote/grüne Leuchten oberhalb der Tür. Die Übungsdeck-Tür
  darf niemals `host.test()` oder einen Rundenreset auslösen.
- **Das HUD des Technikers in 3D** hängt an der Kamera (`ShipExperience`,
  `mission-hud-strip`) und ist jetzt **zwei Zeilen** — dieselben zwei wie in
  der 2D-Welt: oben Sauerstoff und Anzug-Leben, darunter drei Kreise für die
  Aufträge (voll, halb, leer) und der nächste offene im Klartext. Es gibt ihn
  **in der Brille und am Desktop**; vorher gab es ihn nur im Headset und nur
  mit der Uhr. Gerechnet wird beides in `rules/roundHud.ts` (`roundHud` für
  Uhr und Anzug, `hudTasks`/`taskPips` für die Aufträge) — dieselbe Rechnung
  wie im 2D-HUD und auf den Telefonen, damit drei Anzeigen nicht drei
  verschiedene Stände zeigen. Gemalt wird nur, wenn sich der Text ändert.
  **Die zweite Zeile gibt es nur solo** (`hudTasksVisible`, gespeist aus
  `powersOf(setup).archive`): Sitzt am Archiv ein **Mensch**, ist das Wissen
  dessen Platz — der Techniker sieht nur Uhr und Anzug und holt sich den Rest
  am Funk, und der Streifen ist dann **eine** Zeile hoch statt einer halb
  leeren Tafel. Sitzt dort ein **Bot**, sagt der ohnehin an, wohin es geht
  (`ShipExperience.targetCall`, beim Aufnehmen des Teils), und was ein Bot
  ansagt, darf auch dastehen. **In der ersten Zeile steht außerdem die
  Bildrate** — dieselbe Messung wie im Grafik-Menü (`FrameStats.latest`,
  halbe Sekunden, über `WorldContext.frame()`), klein zwischen Uhr und Anzug.
  Ob die Quest stottert, sah man vorher nur mit offenem Menü, und ein offenes
  Menü stottert anders als das Spiel.
- **Die eigenen Schritte des Technikers zählen Meter, keine Uhr**
  (`audio/soundscape.ts`, `STRIDE`): Die Regie merkt sich, wo der letzte
  Schritt fiel, und wer sich einen Meter davon entfernt hat, macht den
  nächsten — abwechselnd 20 cm links und rechts neben der Mitte
  (`FOOT_OFFSET`), in der Balance auf dieselbe Seite gerückt (`FOOT_PAN`),
  damit es zwei Füße sind und nicht ein Klopfen in der Kopfmitte. Gehen und
  Rennen klingen gleich laut (`STEP_GAIN`), Geduckt leise (`SNEAK_GAIN`, das
  Verhältnis aus `NOISE`); die Brille meldet dafür `rig.crouch`. Im Schrank,
  im Schacht, in der Bot-Runde und nach einem Sprung von mehr als
  `STRIDE_JUMP` 3 m (Teleport, Rundenstart) wandert die Marke stumm mit.
  Vorher lief ein Taktgeber aus dem gemessenen Tempo, und der stolperte
  doppelt: Das Tempo aus der Kopfbewegung springt von Bild zu Bild, und die
  Uhr lief im Stand ins Negative — beim Losgehen holte sie drei Schritte in
  einer halben Sekunde nach. Rein für die Immersion, nicht für das Gehör des
  Monsters: Was das Monster hört, rechnet weiter `stepLoudness` in
  `HauntingWorld`.
- `GridWorld.setSlidingGridDoor` verändert nur Türcollider und physische
  Navkante, nicht den ganzen Level. **Wege benutzen `StationTravelPlan`:**
  funktionale automatische Türen sind dort schon vor Annäherung passierbar,
  gesperrte Türen bleiben blockiert. Ausnahme: Eine durch Belegung noch physisch
  offen gehaltene Sperrtür bleibt bis zum Verlassen der Schwelle navigierbar
  (`occupiedOpen`); sonst sperrt das Monster beim Spuken seine eigene Startposition ein. Ohne diese Trennung endet eine partielle
  Route vor einer beliebigen Wand, und die Tür bekommt nie ein Nahsignal.
- `stationNavigation.ts` verwendet dieselben Maße wie Collider und Modelle.
  Quadratische Kurven werden mit ca.12cm Schritten und `segmentClear` geprüft;
  in engen Ecken schrumpft der Kurvenradius, nötigenfalls bleibt die Ecke.
  `stepAlong` verbraucht die ganze Framezeit über mehrere Wegpunkte, mit
  Beschleunigung und Abbremsen. Navigation wird bei Sperränderungen ungültig.
  **Eine Navigation für beide Welten**: Auch das Monster und der Techniker der
  2D-Welt laufen auf demselben Rasterweg (`navmesh/flatNavigator.ts` über
  `stationRoute` auf dem `housePlan`-Graphen mit denselben Sperren), nicht mehr
  Raum für Raum über Türwegpunkte. Der Cursor plant sparsam neu (Ziel
  weiter als 0,75 m gewandert, von der Route abgekommen, Sperre geändert), wartet
  vor einer gesperrten Tür ohne Umweg 0,9 m davor und splittert Holz nach
  2,5 s; die Fächerindizierung der Wandquader in `segmentClear` hat dabei jeden
  Weg von ≈ 88 auf ≈ 14 ms gebracht. Die
  Bahn darauf (Beschleunigen, Bremsen, Drehen) steht in
  `navmesh/route.ts` — der Datei, die `droneRoute.ts` hieß, solange es eine
  Drohne gab; ihre Typen (`RoutePath`, `RoutePose`) tragen heute die Wege von
  Monster und Techniker der 2D-Runde, `stepAlong` hat seit dem Rechenkern
  keinen Fahrer mehr im Schiff.
  **Das Monster wägt dabei ab** (`aim(..., detourLimit)`): Kostet der Umweg um
  eine gesperrte Tür mehr als `monsterWalk.PRY_DETOUR` = 4 s Laufzeit, führt die
  Route vor die Tür, und dort wird gezogen statt gelaufen. Der Techniker gibt
  keine Grenze mit und geht weiter jeden Umweg.
  **Und derselbe Läufer trägt das Monster in beiden Welten** (Paket „Eine
  Wahrheit", `monster/monsterWalk.ts`): Alles zwischen dem Beschluss der
  Routine und dem Schritt — Vorplatz-Riegel, Stillstand-Umweg über die
  Raummitte (0,6 s / 1,2 s), Umwegabwägung, Wartepunkt, Holz splittern, am
  Stahlriegel ziehen (`rules/doorLocks.pryLock`, derselbe Würfel wie die
  Routine) — steht dort einmal, mit `MONSTER_RADIUS` als Wegbreite. Die
  2D-Runde ruft es aus `moveMonster` und gleitet die Wegpunkte mit `slide`
  ab — und seit dem Rechenkern (`flatKernel.ts`, siehe „Der Rechenkern") ist
  das auch der Schritt im Schiff: Dort gibt es keinen NPC-Körper mehr, das
  Monstermodell steht, wo die Runde es hinsetzt, und der Schlag ist der der
  Runde (`hit`, `CONTACT` = 1,7 m). `stationNpcNavigator.ts` — der alte Cursor
  des Headsets, der alle 0,55 s neu plante, keinen Umweg abwog und **vor einer
  gesperrten Tür für immer stand** — ist weg, ebenso der NPC, an dem er hing.
- Weltreisen/Schrank-Ausgänge synchronisieren Rig und Physik über
  `movePlayerTo`. **Mit `yaw` schaut danach der Kopf dorthin**
  (`PlayerRig.turnHeadTo`, mit Test), nicht nur das Rig: In der Brille legt das
  Headset seine eigene Drehung obendrauf, und wer im Spielraum nach links
  gedreht stand, schaute nach dem Versetzen weiter nach links, egal was das
  Rig sagte. Am Bildschirm liest `FlatControls.look` den Winkel seither vom
  Rig statt aus seiner eigenen Zahl — sonst sprang die erste Mausbewegung in
  die alte Richtung zurück. `haunt.sealsOff` schützt Erreichbarkeit aller `spacesOf`.
  **Schächte sind das Lüftungsnetz** (`vents/ventNet.data.ts`: vierzehn
  Klappen, eine je Raum, neun Verbindungen in getrennten Netzen; `VentNet`,
  `VentTravel`, `VentPilot`). In 3D fährt das Monster damit wie in 2D
  (`vents/npcVentRide.ts`): einsteigen, fahren (verborgen, `crew.venting > 0`),
  aussteigen — kein Teleport über Wandpaare mehr, `ventPairs` gibt es nicht
  mehr. Die Klappen (`vents/ventArt.ts`) kippen ihre Lamellen, solange jemand
  ein- oder aussteigt. Wer das Netz ändert, ändert die Datendatei.
  `ShipExperience.inLockerRoom` prüft Raumzugehörigkeit vor Codeeingabe,
  Eintritt und Nahbereichsauswahl: kein Schutzschrankzugriff durch Nachbarwände.
  Übungsschränke setzen den passenden Trainingsraum und aktiven Test voraus.

**Mission, Werkzeuge und Komfort**

- `mission.ts` besitzt Optionen, drei Reparaturen, Kabel-/Folge-/Frequenzrätsel,
  Fracht, HP, simulierten Puls und Anstrengung. Drei Treffer sind
  `lost`, drei Reparaturen und Rückkehr `won`. Test, Schutzschrank und
  Schachtpassage verhindern Treffer; Medkit heilt einen. **Nach einem Treffer
  gibt es sechs Sekunden Schonfrist** (`HIT_GRACE`), und das Monster hält
  davon vier selbst inne (`HIT_LULL`, `monsterRoutine.rest`) — in beiden
  Welten; vorher klebte es dem Getroffenen an den Fersen, bis die Frist um
  war, und der nächste Schlag kam mit Anlauf. **Der Schutzschrank hat
  keinen Code mehr**: Ein Tipp auf das Tastenfeld, und man ist drin, wie in
  2D. `lockerCode` gibt es noch für den Samen der Kabinen, aber keine Akte
  und kein Panel zeigt ihn. **Hineingetippt wird mit dem Gesicht zur Tür**
  (`enterLocker`: Drehung des Schranks plus π, denn seine Front liegt auf
  lokal +z und ein Rig schaut entlang −z) — wer drinsteht, sieht durch die
  Schlitze in den Raum und das Monster kommen, statt auf die Rückwand. Von
  innen ist der Schrank ein **Geist mit
  Lüftungsschlitzen** (`ShipExperience.ghostLocker`): blasse Kopien der
  Materialien je Teil (die Originale teilen sich alle Möbel), davor sechs
  dunkle Stäbe in Augenhöhe; beim Heraustreten kommt alles zurück. In 2D
  bleibt dem Versteckten **nur der Lichtkreis um sich herum**
  (`map/visibility.ts`: Lampen weg, `self` bleibt, sichtbar ist, was in
  anderthalb Metern davor steht). Sichtbare Ergebnis-
  Panels bieten Neustart im DOM und im Headset, auch per Zeiger-Trigger.
  **Die Runde hat eine Uhr** (`rules/roundRules.ts`): der Sauerstoff, zehn
  Minuten, läuft gleichmäßig durch und wird von keiner Reparatur angehalten
  oder aufgefüllt — deshalb heißt der Auftrag `oxygen` „Nahrungsversorgung
  sichern" und nicht mehr „Lebenserhaltung". Uhr und Anzug-Leben sehen alle:
  die Telefone in der Leiste über jeder Station (`stationUi.writeQuest`, rot
  unter einer Minute), der Techniker am Desktop im Titel und in der Brille
  auf einem schmalen Streifen an der Kamera (`ShipExperience`, `rules/roundHud.ts`).
  **Kabinen gehen kaputt** (`HauntState.destroyed`, Kennung = Raum-Id, geht
  über das Netz): Eine aufgerissene Kabine wird in 3D zum Wrack
  (`fixtureModels.buildBrokenLocker`), funkt alle drei bis sechs Sekunden
  (`rules/cabinWreck.ts`), lässt niemanden mehr hinein und wird vom
  Modelltechniker gemieden.
- **Die Kisten stehen an einer Stelle** (`rules/cargo.ts`): `cargoOf(spec)`
  ist die eine Liste aller Frachtkisten einer Runde, und 2D, 3D, Netz-Snapshot
  und Archiv lesen sie, statt jeweils selbst zu würfeln. Vorher stand je Raum
  **eine** Kiste, und `ShipExperience` und `map/flatRound.ts` verteilten den
  Inhalt zweimal nach derselben Regel — was gut ging, solange „die Kiste des
  Raums" eine Kiste meinte. Jetzt stellt `stationLayout` **zwei bis drei**
  (`CARGO_PER_ROOM`, Ids `cargo-<raum>-<n>`; zwei sind Pflicht, die dritte
  fällt weg, wo der Grundriss sie nicht trägt), jede mit einem Kennzeichen aus
  Farbband und Nummer, je Raum eindeutig (`cargoLabel`: „Kiste 2 · blau"). Drin
  liegen drei Aufgabenteile — je eines im Raum aus `spec.tasks`, `taskCargo` —,
  vier Werkzeuge (radar, xray, medkit, medkit) und sonst nichts: **die leere
  Kiste ist der Preis fürs Suchen.** Sie kostet zwei Griffe, öffnen (Geräusch)
  und hineinsehen („Leer."), und gilt danach als erledigt.
  **Und Aufmachen kostet Zeit** (`rules/chore.ts`, `CARGO_OPEN_SECONDS` = 5 s):
  ein Ladebalken, während dessen man stillsteht. Umschauen ist erlaubt — gemessen
  wird die Stelle (`CHORE_LEASH` = 0,25 m), nicht der Blick —, Weggehen bricht
  ab, und derselbe Knopf bricht auch ab (ein Balken, den man nur durch Weglaufen
  loswird, wäre eine Falle). **In der Brille ist die Leine länger**
  (`CHORE_LEASH_HEADSET` = 0,6 m): Dort wird der Kopf gemessen, und wer sich zu
  einer Kiste vorbeugt, trägt ihn ohne einen Schritt gut vierzig Zentimeter weit
  — mit der kurzen Leine ging in VR keine Kiste auf. **Und die Kistentür hört
  nur auf den Trigger** (`ShipExperience.bind`, `pokeable: false`): Eine
  Berührung mit der Hand gilt dem Zeiger sonst als „Benutzen"
  (`Pointer.updatePoke`, auch mit dem Controller), und wer vor einer Kiste
  steht, hat die Hand ständig an ihrem Blatt — der Trigger fing den Balken an,
  die Hand brach ihn gleich wieder ab. Tastenfeld, Konsole und das Ersatzteil
  in der Kiste bleiben antippbar. Vorher war Aufmachen ein Knopfdruck und damit kein
  Risiko: Man nahm eine Kiste im Vorbeigehen mit, während das Monster zwei Zimmer
  weiter schon unterwegs war. Dieselbe Rechnung in beiden Welten — die 2D-Runde
  zeichnet den Balken über den Knöpfen, das Schiff malt ihn in den Streifen an
  der Kamera (also auch in der Brille) —, und **der Bot zahlt sie** in beiden
  Welten (`rules/technicianBot.ts`): Einer, der Kisten im Vorbeigehen
  aufklappt, spielt eine andere Runde als der, dem man dabei zusieht.
  **Vor einer Tür steht keine Kiste** (`stationLayout.CARGO_DOOR_DEPTH` = 2,4 m
  statt der üblichen 1,15 m, auch für die Deko-Kiste): Der übliche Türfreiraum
  hält die _Möbel_ aus der Öffnung, nicht den _Menschen_, der davorsteht und
  wühlt — in „Lower Engine" konnte man die grüne Kiste nur öffnen, indem man die
  Tür blockierte. Gewürfelt wird aus
  **eigenen Strömen** aus `spec.seed`, nie aus dem des Hauses: Die
  Wurfreihenfolge von `generateHouse` ist Vertrag. Der Archivar liest deshalb
  nicht mehr das Möbel vor („bei dem Frachtcontainer"), sondern die Kiste —
  `CargoSlot.clue`, „Kiste 2, blaues Band · Nordwand". `HouseTask.hint` bleibt
  stehen — er nennt das Merkmal des Raums („bei der Werkbank") und hängt am
  Reparaturhinweis (`mission.ts`) und an der Raumakte des Archivs
  (`views/archiveRole.ts`), die beide noch auf ihn zeigen.
- **Eine Hand, ein Ersatzteil** (`rules/archiveGoals.ts`, `carriedPart`,
  `canCarryPart`): `crew.inventory` trägt höchstens **ein** Missionsteil;
  Werkzeuge (Radar, Röntgen, Medkit) zählen nicht mit, die stecken am Gürtel.
  Eine zweite Kiste geht auf, das Teil darin bleibt liegen — mit Ansage, und
  die Kiste bleibt offen und unerledigt. Sonst sammelte man in Ruhe alle drei
  ein und klapperte danach die Konsolen ab; der halbe Weg durch das Schiff
  fiele weg. In 3D ist das Teil ein **Ding in der Hand**: am Schirm im
  Streifen neben Lampe und Medkit (`rightItem === 'part'`), in der Brille am
  Griff des rechten Controllers. **Ablegen** in der Tafel legt es ab
  (`ShipExperience.dropPart`; die Taste `G` ist mit der gemalten Karte
  gegangen), es liegt dann als Modell im Gang und wird mit Benutzen (`A`/`E`,
  ein `Usable`) wieder aufgenommen. **`taken` heißt „war einmal draußen", `inventory` heißt „ist in
  der Hand"** — die Konsole prüft seit jetzt in **beiden** Welten das Zweite:
  Wer sein Teil ablegt, sperrt damit auch die Abdeckung wieder zu.
- **Wer wissen darf, welche Kiste die richtige ist** (`rules/roundSetup.ts`,
  `goalPrecision`): Sitzt am Archiv ein **Bot**, gibt es niemanden zum
  Zurufen — dann ist das Ziel die **Kiste** (`MapGoal.kind` `'crate'`,
  `precision` `'exact'`). Sitzt dort ein **Mensch**, ist es der **Raum**
  (`room:<raum>`, Raummitte, Label = Raumname, `precision` `'room'`), und
  welche der zwei bis drei Kisten darin zählt, steht allein auf seinem Blatt.
  Kompass, Randdreieck und Zielpfad zielen unverändert auf `MapGoal.at` und
  brauchen nur das Label. **Hervorgehoben wird die Sache selbst und kein Ring
  daneben:** ein gelber Saum auf der Zielkiste (`core/outlineShell.ts`,
  `ShipExperience.seam`) — neben dem Saum des Kerns auf dem, was `A` gerade
  meint (`core/highlight.ts`); die gemalte Karte zeichnete dafür Schein,
  Umriss und Puls. **Das Kennzeichen ist immer
  sichtbar** — `MapItem.mark`, Farbband und Nummer am Modell
  (`fixtureModels.buildCargoCabinet(mark)`, Farben in
  `fixtureDimensions.CARGO_BAND_COLORS`) —, denn der Archivar spricht ja
  darüber. **Und der Snapshot trägt keinen Teilenamen mehr:** Auf einer Kiste
  steht ihr Kennzeichen (`map/flatRound.items`, `map/worldSource.ts`), und
  `MapItem.goal` wird nur bei Kistengenauigkeit gesetzt. Das dauerhafte
  amberfarbene Inhaltsschild am Frachtschrank ist **weg** — es war das größte
  Leck; was drin liegt, sagt das Röntgengerät oder die offene Kiste.
- Das vorhandene `FlashlightTool` hängt **an beiden Hüften** und kann deshalb
  nicht verloren gehen (`HauntingWorld.beltLoadout`). Lange hing nur rechts
  eine, „damit eine Hand frei bleibt" — seit der Techniker rechts ein
  Ersatzteil trägt, war genau das die Falle: Teil in der Hand, Lampe abgelegt,
  und der Weg zur Konsole ging durch ein dunkles Schiff. Eine Hüfte merkt sich
  ihre Bestückung und lässt nachwachsen, was von ihr kam
  (`PortalWorld.stowTool`), also ist auch eine hingeworfene Lampe nach dem
  nächsten Griff wieder da. Am Schirm steht sie in **beiden** Handkreisen
  (`1` links, `2` rechts); „frei" bleibt erreichbar, denn Dunkelheit ist in
  diesem Haus eine Entscheidung (`threat.ts`) und kein Verlust.
  Webhände verwenden dieselbe Toolklasse. Die schwebende Ersatzlampe ist
  im Web anvisierbar; Aufnehmen entfernt ihren echten Physikkörper.
  Haunting deaktiviert mit `setBeamGuide(false)` den geometrischen Hilfskegel;
  Spotlicht, Lichtkegelverstellung und Toolmodell bleiben erhalten. Der eigene
  Avatar ist im Web unsichtbar; nur in XR wird sein Körper ohne Kopf eingeblendet.
- `RadarTool` und `XrayTool` sind reguläre Tools mit identischem
  `scannerModel.ts`, Standardgriff und Gürtelablage. Radar zeigt Kontakte,
  Xray nahe verborgene Fracht — **Inhalte, keine Kisten**: Was leer ist, meldet
  er nicht, sonst wäre er die Antwort auf jede Suche. Er nennt dabei das
  **Kennzeichen** und den Raum, nie den Teilenamen (2D `FlatRound.useTool`, in
  3D das Schild an der Kiste, `Cabinet.scanner`) — er ist der technische
  Ausweg neben dem Archivar und nicht sein Ersatz. Kein dauerhaftes
  VR-Sensor-HUD. Nach Inventarauswahl in VR bleibt ein Tool bis zur ersten
  bewussten Griffaktion gehalten; andernfalls fällt es im nächsten
  PortalWorld-Update sofort herunter.
- **Mikrofon-Gegnerreaktion ist endgültig aus dem Spiel entfernt.** Kein
  `HauntingMicrophone`, kein Audioeingang für Gegnerwahrnehmung. Optionaler
  Sprachchat in `net/Voice.ts` bleibt unabhängig. **Gegneridentifikation ist
  vorerst entfernt:** kein EMF/Thermosensor/Audio-Logger/Anomalienjournal.
  `ENTITY_PROFILES` enthält nur verbleibende KI-/Schrittklangwerte.
- `threat.ts` prüft Bewegung, Ducken, Taschenlampe, Blickrichtung und echte Sichtlinie.
  `perception.ts` berechnet ein begrenztes akustisches Kostenfeld auf dem realen
  NavGraph: offene Kante 2,5m, geschlossene Tür zusätzlich 4m, gemeinsame Wand 9m.
  Keine Übertragung über fehlende Bodenfelder. Aktualisierung 10Hz; kein Mikrofon.
  Monster-FOV 129,6°, Techniker-FOV 111,6°/16m. Die Bot-Runde nutzt dieselbe
  Monsterwahrnehmung mit dem Bot als Signalquelle, niemals der Beobachterkamera.
  Schutzschränke unterbrechen Wahrnehmung, löschen aber nicht sofort die letzte
  Suchposition. Simulations-Snapshots bewahren Versteck und Bedrohung.
  Erinnerung verfolgt die zuletzt wahrgenommene Position, keine Hellsicht.
- Anstrengung steigt beim Sprint in 4s von 0 auf 1 und fällt in 5s ab.
  `helmetCondensation.ts` legt dafür **eine weiße Fläche** über das Visier,
  die von unten her weich einblendet — keine Punkte, kein Flackern; die
  Mitte bleibt lesbar. Kein harter Sprinttimer.
- `HauntingComfort` bietet lokale Snap-/Smooth-Drehung, Bewegungsrand und
  Haptik; reale Kopfbewegung löst keinen Rand aus. Dispose restauriert die
  gemeinsamen Rig-Einstellungen und räumt Pointer/Audio/GPU-Ressourcen auf.
- **Der Techniker am Bildschirm spielt mit dem Kern** (Paket H): Bordstock
  der Seite oder `WASD`, `A`/`E` benutzt über `HauntingWorld.useForward`
  (Sonderfälle → `pickUsable` über die angemeldeten Dinge → sonst der
  Lichtschalter, `ShipExperience.useEmpty`; ein Handgriff in der Sperrfrist
  zählt als Handgriff und legt das Licht nicht um), der Saum kommt vom Kern
  (`bind` meldet jedes Ziel als `Usable` an; sein `usePrompt` wird nicht mehr
  gezeigt, nur noch geprüft), der Werkzeug-Knopf
  (`#hud-tool`, `Tab`) wählt die Hand (`chooseTool`: Lampe/Medkit rechts,
  Radar/Röntgen links, `null` leert beide; `toolChoice.current` ist die
  letzte Wahl, solange sie noch in der Hand liegt). Eigener Stock, eigene
  Knöpfe (`world3d/shipControls.ts`) und eigene Tasten (`desktopControls.ts`:
  `1`/`2`/`G`, Freiflug) sind weg; `Strg` duckt weiter (Fensterereignis in
  `ShipExperience`, `stepCrouch`), dazu **Ducken** in der Tafel. Der
  HUD-Streifen ist am Bildschirm DOM (`.orbital-hud`), der Kompass bleibt DOM,
  der Streifen an der Kamera bleibt der Brille. `WorldContext.touchStick`
  ruht nur, solange die Zentrale über dem Bild liegt (`syncTouchStick`).
- Die **Bot-Runde im Schiff** spielt der Techniker aus Zahlen der 2D-Welt
  (`rules/technicianBot.ts`) auf dem Rechenkern (`flatKernel.ts`,
  `FlatKernel.startBot`): eine echte, schadensfreie Runde mit aktiver
  Monster-KI, mit Kollision, Furchtkern und Türpreis — dieselbe Rechnung wie
  auf dem Telefon. Das Schiff zeichnet nur nach, wo er steht
  (`ShipExperience.botPose` ← `HauntingWorld.botPose`), und schreibt seine
  Stufe (`botStage`) auf die Tafel. Der frühere Modelltechniker des Schiffs
  (`missionBot.ts`, ohne Kollision auf eigener Bahn) ist weg.
  Tempo, Puste, Vorsicht, Versteckneigung, Handgriffe und Wartezeit kommen aus
  `botTuning.ts` (`TechnicianTuning`) und werden bei jedem Zugriff neu gelesen —
  ein Regler in der Schalttafel wirkt in der laufenden Runde. Ohne Puste trabt
  er (`sprint × 0,72`) statt auf Arbeitstempo zurückzufallen: Ein Monster geht
  schneller, als er arbeitet. Nach ruhiger Phase Mission fortsetzen.
  Unterbrochene Interaktionen erfordern erneute Ankunft am Fracht-/Reparaturziel.
  Verstecke des Bots sperren die freie Beobachterkamera nicht.
  Schächte benötigen freie Zugänge/Ausgänge und führen bei Verfolgung in
  Richtung des letzten Signals.
  Gesperrte Routen warten statt zu teleportieren. Das ist keine simulierte
  menschliche Kommunikation und keine vollständige autonome Dreiercrew.
  Raumwechsel erzeugen lokale Funkmeldungen Techniker → Zentrale.
  `NavigationOverlay` liest echte Route-Cursor von Bot und Monster;
  Cyan/Rot und Zielringe sind in der Simulation sichtbar — **und beim
  Zuschauer**, sobald er im Panel „KI-Absichten" umlegt
  (`HauntingWorld.insightWanted`). Sichtflächen
  werden gegen feste Collider (inklusive Türblätter/Einrichtung) beschnitten;
  Orange zeigt das maximale akustische Feld für Sprintgeräusche. Legende und
  KI-Absichten erklären Grenzen.
  **Das Overlay „KI-Absichten"** (`NavigationOverlay.insight`) legt dazu den
  Kopf des Monsters auf den Boden: je Raum eine Fläche, so satt wie sein
  Glaubensbild (`MonsterInsight.belief`, ab 2 %), die gestrichelte Prognose des
  Technikerwegs, der Abfangring an der Tür mit beiden Ankunftszeiten
  („M 3,2 s / T 4,0 s") und der Name der Haltung am Ziel. Weltgeometrie, flach
  auf dem Boden — damit ist es auch in der Brille richtig herum. Die Zahlen
  kommen aus `RoutineOutput.insight` (`monsterRoutine.ts`) und werden nirgends
  zweimal gerechnet; auf der Karte der Telefone zeichnet dasselbe
  `map/insightOverlay.ts` (`MapViewOptions.overlay`). **Nur im Modus „Alles
  sehen"**: Ein Techniker mit
  dem Glaubensbild vor sich weiß, welche Zimmer gerade sicher sind, und die
  halbe Runde ist vorbei. **Über die Leitung geht es als optionales Feld**
  (`HauntState.insight`, `readState` stutzt Haltung, Listen und Meter zurecht,
  kein Protokollsprung): Der Gastgeber schreibt seinen Beschluss je Bild in den
  Stand, und ein Zuschauer, der das Monster nicht selbst rechnet — ein Telefon
  am Fernseher —, liest es von dort (`HauntingWorld.render`).
  Gehen/Stillstand erzeugen weniger/keinen Schall.
  Schrittanimation basiert auf Körperseite und Gliedmaßtyp statt Child-Reihenfolge:
  linkes/rechtes Bein gegensinnig, gleichseitiger Arm jeweils entgegengesetzt.
  Desktop-Demos starten mit nachgeführter Botkamera: aus den Augen schräg
  über dem Bot, **von oben steht das Gestell auf ihm** (`followBotCamera`
  mit `ctx.topDown` — die Kamera des Kerns folgt dem Gestell). **Freie
  Kamera** / **Bot folgen** wechselt die Bedienung (`setFollowBot`: frei
  heißt, die Figur läuft selbst; Freiflug und Kartenübersicht sind mit der
  gemalten Karte gegangen). `followBotCamera` läuft niemals im XR-Headset;
  dort behält der Spieler seine Blickrichtung.
- **Das Monster kennt die Einsatzzentrale nicht** (`roomGraph.monsterGraph`).
  Es gibt die Raumkarte zweimal: die ganze (`stationGraph`, mit dem Knoten
  `COMMAND` und der Schleuse) und die des Monsters, der beides fehlt. Alles,
  was für das Monster entscheidet, fragt die zweite — Routine, Gedächtnis
  (`MonsterMemory` legt seine Räume aus `world.spaces` an), Abfangrechnung,
  Reisezeiten, `FlatRound.prowl` und sein `FlatNavigator`; in 3D
  `HauntingWorld.spawnMonster`/`stepRoutine`, in der Simulation
  `roundSim.prowl`. Damit ist „das Monster geht nie in die Zentrale" keine
  Prüfung, die man an fünf Stellen vergessen kann, sondern ein Ort, den seine
  Karte nicht enthält: keine Patrouille dorthin, keine Suche, keine Vermutung,
  kein Weg — und `spaceAt` gibt für den Vorplatz `''` zurück, es kann also
  nicht einmal benennen, wo der andere da steht. Dazu zwei Riegel gegen den
  Restfall „erinnerte Stelle liegt auf dem Vorplatz": `FlatRound.moveMonster`
  läuft kein Ziel an, das auf seiner Karte in keinem Raum liegt,
  `FlatRound.stepMonster` setzt keinen Schritt auf den Vorplatz (`onApron`),
  und beides steht seit dem Paket „Eine Wahrheit" in `monster/monsterWalk.ts`,
  also auch für das Headset.
  Der Techniker läuft weiter hinein und hinaus; für ihn bleibt die Zentrale
  ein Knoten wie jeder andere. Nachgezählt wird es in hundert ausgespielten
  Runden (`RoundResult.atCommand`, `roundSim.test.ts`).
- **Die Routine des Monsters** steht in `monsterRoutine.ts` und nirgends sonst:
  vier Grundhaltungen (`patrol`, `reposition`, `stakeout`, `search`), `hunt`,
  seit M2 dazu `intercept` („Abfangen") und `ambush` („An der Tür lauern"), und
  die Kabinenkette `announce` → `breach` → `savour`. Sie ist rein — herein gehen
  Räume, Nachbarn und eine Wahrnehmung, heraus gehen Ziel, Tempo (`paceSpeed`)
  und höchstens ein Geräusch. Deshalb steuert dieselbe Datei das Monster im
  Headset **und** die Trainingssimulation.
  **Mit Gedächtnis denkt sie, ohne würfelt sie.** Bekommt `RoutineInput` ein
  `memory` (`monster/monsterMemory.ts`), einen `estimator`, das Grundtempo
  `base` und die Rundenzeit `time` — und ist die hereingereichte Welt die ganze
  Karte (`StationGraph`, erkannt an `doorsOf`/`doorPoint`) —, dann entscheidet
  nach jedem Sichtverlust `monsterIntercept.plan()`: verfolgen, abfangen,
  lauern oder absuchen, höchstens alle `REPLAN` = 1,5 s neu gerechnet. Gesucht
  wird dann im **wahrscheinlichsten** Raum statt im gewürfelten Nachbarn,
  patrouilliert wird zu den drei Räumen, in denen es am längsten nicht war
  (`leastRecentlyVisited`), der Seitenwechsel geht in den entferntesten davon,
  und `stakeout` steht an einer **Tür** statt in der Raummitte. Reicht die
  Gewissheit nicht (`FAINT` 0,15), wird gar nicht erst abgesucht — ein Monster,
  das denselben Raum dreimal durchsucht, ist das dumme Vieh von früher. Ohne
  Gedächtnis bleibt das alte Würfelverhalten stehen; das ist kein Notbehelf,
  sondern die Fassung, die ein Test aus fünf Zimmern in einer Reihe noch
  nachrechnen kann.
  **Ein Ziel, dem es nicht näher kommt, gibt es auf** (`GIVE_UP` 10 s): Die
  Routine kennt keine Wände, und ob ein Ziel erreichbar ist, weiß nur die
  Welt — eine Stelle, die auf der Karte des Monsters in keinem Raum liegt,
  läuft `FlatRound.moveMonster` gar nicht erst an, und eine Route kann vor
  einer Wand enden. Patrouille, Seitenwechsel, Absuchen und Lauern führen
  deshalb eine Uhr mit (`stranded`): Sinkt der Abstand zum Ziel zehn Sekunden
  lang nicht mehr um `HEADWAY` 0,25 m, ist das Ziel keins, und `beginPatrol`
  sucht das nächste — ohne den Raum als abgesucht zu notieren, denn erreicht
  wurde er nie. Zehn Sekunden sind länger als jeder Riegel (Holz 2,5 s, Stahl
  ein paar Züge zu 1,1 s), also wird niemand von einer Tür weggerufen; die
  Verfolgung ist ausgenommen, ihr Ziel setzt jedes Bild neu. Vorher lief eine
  Frist erst ab der Ankunft, und die Patrouille hatte gar keine: ein
  unerreichbares Ziel hieß für den Rest der Runde „unterwegs".
  **Und eine erinnerte Stelle, an der es schon steht, verfolgt es nicht mehr**
  (`monsterIntercept.CAUGHT_UP` 1,6 m): Ohne Sichtkontakt ist die Beute der
  Rechnung die Stelle aus der Prognose (`prediction.path[0]`), und wer dort
  schon steht, holt in null Sekunden auf — also war „verfolgen" jedes Bild
  aufs Neue die schnellste Wahl, die Routine trat aus `hunt` in `beginSearch`
  und von dort wieder in `hunt`, und das Vieh stand mit der Ansage
  „Verfolgung" für den Rest der Runde im Raum (Seed 7 der Bot-Runden: 560 s).
  Jetzt fällt die Entscheidung dann auf Abfangen, Lauern oder Suchen; eine
  **gesehene** Stelle bleibt Beute, auch unter den eigenen Füßen. In der
  Trainingssimulation war der stehende Verfolger ein Wachposten, der dem
  Techniker den Raum verstellte; ohne ihn stieg dessen Quote im Team von
  0,32 auf 0,38, und die Monsterseite wurde deshalb neu gelernt (wie beim
  Paket „Schalttafel": nur `'monster'`, 120 × 128 Runden mit Samen 0xbeef, 24 ×
  192 zur Feinjustage). Übernommen wurden davon **Sicht 1,7, Schub 11 s und
  Vorsprung 3 s**; das mitgelernte Grundtempo 1,2 nicht, denn einzeln
  nachgemessen treibt Tempo die Teamquote sogar hoch, und der ganze Satz stand
  mit 0,510 / 0,2975 am Bandrand. So nachgemessen 0,4825 / 0,341 — beide
  Bandmitten, das Monster läuft nicht schneller als vorher
  (`botTraining.test.ts`, dort steht die Messreihe).
  **Gefüttert wird das Gedächtnis in der Routine selbst** und nicht in den
  Welten (Abweichung von Plan M2): Sichtung, Geräusch und der eigene Raum
  gehen ohnehin durch `step`, und ein Gedächtnis, das 3D, 2D und Simulation
  jede für sich beschreiben, ist nach der ersten Änderung drei verschiedene
  Gedächtnisse. Als Sichtung zählt dabei auch Alarmstufe 3 („sicher gehört"):
  Ohne sie stand die Spur bei einer Jagd, die nur aus Geräuschen kam, still —
  und ohne Spur gibt es keine Richtung, keine Prognose und kein Abfangen. Die
  Welt besitzt das Gedächtnis, meldet ihm, was die Routine nicht sehen kann
  (`disturbed`), und liest es aus.
  **Die Fährte geht denselben Weg hinein** (`RoutineInput.scent`, seit dem
  Paket „Spuren"): Gesucht wird sie **draußen** — nur die Welt weiß, welche
  Tropfen im Raum des Monsters liegen (`rules/blood.sniff`) —, eingetragen
  wird sie **hier**, wie alles, was ins Gedächtnis geht
  (`MonsterMemory.tracked`). Sie zählt als Letztes: Wer eine Stelle hat
  (`signal`) oder gerade etwas hört, schaut nicht auf den Boden; ein Tropfen
  von vor dreißig Sekunden zöge ihn sonst von der frischen Stelle weg.
  **Blutrausch und Schub.** Je zehn Sekunden ununterbrochener Jagd steigt der
  Verfolgungsfaktor um `RAGE_STEP` 0,05, gedeckelt bei `RAGE_MAX` 0,2 und
  ohnehin bei `MONSTER_TOP_SPEED`; ein Sichtverlust setzt zurück. Dazu kommt
  `RUSH_BOOST` 0,25 für `MonsterTuning.rush` Sekunden, wenn eine Reparatur
  fertig geworden ist. Beides steht als `RoutineOutput.boost` heraus und geht
  als vierter Wert in `paceSpeed` — nur auf die Jagd, nie auf die Patrouille.
  **Was es denkt, steht als `RoutineOutput.insight`** (`MonsterInsight` in
  `map/mapSnapshot.ts`, Vertrag 4.7): Haltung, Ziel, Glaubensbild, vermuteter
  Weg und Abfangtür mit beiden Ankunftszeiten. Gezeichnet wird das noch nicht;
  `FlatRound.decided` gibt den ganzen Beschluss nach außen.
  **Wo welche Haltung wirklich vorkommt** — gemessen, damit niemand nach dem
  falschen Beleg sucht: In der **2D-Runde** mit echten Wänden ist `intercept`
  häufig (acht Bot-Runden: 293 s Abfangen gegen 201 s Verfolgen), in der
  **Trainingssimulation** dagegen fast nie (64 Runden: 98 s). Das ist kein
  Fehler, sondern die Grenze der groben Karte: Auf einem reinen Raumgraphen
  nehmen Verfolger und Verfolgter denselben kürzesten Weg, und wer denselben
  Weg nimmt, kürzt nichts ab. `ambush` bleibt überall selten (17 s auf
  64 Runden) — es verlangt ein sehr sicheres Glaubensbild in einem Raum mit
  höchstens zwei Türen, und ob eine Station so einen Raum an der richtigen
  Stelle hat, entscheidet der Bauplan. `rules/botRound.test.ts` prüft deshalb
  `intercept` über vier ganze Bot-Runden und `ambush` gar nicht.
  Nach Sichtverlust ohne Gedächtnis rät sie weiterhin
  den Nachbarraum (`guess`), sucht ihn leise ab (Klacken, manchmal der
  Schutzschrank), geht manchmal gleich weiter (`wander`) oder lauert auf
  (`stakeout`). Ein Rückzug in einen Schrank löst Schrei und Aufreißen nur aus,
  wenn er **gesehen** wurde (`HauntingWorld.watchedLocker`); die Kette danach
  läuft von selbst zu Ende, auch wenn die Meldung längst zurückgenommen ist.
  **Das Monster reißt Kabinen nur auf, in denen es jemanden vermutet**: beim
  Schnüffeln am Schrank eines verdächtigen Raums reißt es ihn auf — ob jemand
  drin ist oder nicht (`RoutineOutput.cabin`; ohne Schrei und ohne Vorsprung,
  die bleiben dem gesehenen Rückzug). Ein leerer Schrank ist danach trotzdem
  ein Versteck weniger. Kein Wissen darüber, ob der Schrank besetzt ist.
  **Was es weiß, steht daneben** — `monster/monsterMemory.ts`, seit M2
  angeschlossen: ein Glaubensbild über die Räume (je Raum eine
  Wahrscheinlichkeit, zusammen immer 1), je Raum ein Notizzettel (wann
  besucht, abgesucht, gesehen, gehört) und eine Spur der letzten sechs
  Sichtungen, aus der `track.velocity()` Richtung und Tempo schätzt. Eine
  Sichtung setzt die ganze Masse in einen Raum; ein Geräusch multipliziert die
  Likelihood aus der gedämpften Hörweite dazu (`StationGraph.earshot`, sonst
  selbst gerechnet). **`earshot` hört auch durch Wände**: Es rechnet nicht nur
  über die Türen (`DOOR_LOSS` 4 m je Türblatt), sondern auch über die
  **Wandnachbarn** aus dem Bauplan — Räume, deren Rechtecke aneinanderstoßen,
  zu `WALL_LOSS` 9 m. Vorher waren zwei Zimmer Wand an Wand ohne Tür für das
  Monster so weit auseinander wie der Umweg über den halben Gang (im
  gewürfelten Haus mit Samen 3: 100 m für 10 m Luftlinie, also taub); jetzt
  sind es 19 m. **Für die Wegsuche ändert das nichts**: `neighbours()`,
  `distance()` und `next()` bleiben Türwege, denn durch eine Wand geht
  niemand — sie dämpft nur (`roomGraph.test.ts`); ein abgesuchter Raum fällt
  auf `FLOOR` 0,01 statt auf null, damit das Monster nicht an einem Spieler
  vorbeiläuft, der hinter ihm wieder hineingegangen ist; mit der Zeit gleicht
  sich das Bild über die Türen aus (`DRIFT` 0,15/s je Tür, gesperrte Türen
  halten es auf), und nach `FORGET` 45 s ohne Sichtung oder Geräusch ist wieder alles gleich
  wahrscheinlich. Abfragen: `mostLikely`, `expected`, `certainty`, `exits`
  (die Türen eines Raums mit dem Anteil des Zuflusses dahinter),
  `leastRecentlyVisited` (Patrouille und Seitenwechsel), `snapshot` (für die
  Zuschauer, ab 2 %). Rein und deterministisch, ohne three.js und ohne Zufall.
  Dazu seit M2 `disturbed(raum, punkt, zeit)`: **ein Ereignis der Station**,
  keine Sichtung. Eine fertige Reparatur ist laut und sichtbar — die Konsole
  fährt hoch, die Sicherung fällt, im Modul flackert das Licht —, also legt sie
  die ganze Masse in diesen Raum, schreibt aber **nichts in die Spur**: Über
  die Laufrichtung sagt sie nichts, und als `seen` gebucht hätte sie der
  Prognose eine Fahrtrichtung untergeschoben, die es nie gab. Im Notizzettel
  steht sie unter `heard`. `shutPairs(spec.doors, state.shut)` übersetzt die
  Türkennungen des Bauplans (`d7`) in die Raumpaare, die der Konstruktor
  erwartet; die Haustür hängt dabei an `COMMAND`.
  Dazu seit dem Paket „Spuren" `tracked(raum, punkt, richtung, trust, zeit)`:
  **eine Blutspur auf dem Boden** (`rules/blood.ts`). Sie unterscheidet sich in
  zwei Punkten von allem anderen. Erstens landet die Masse nicht in dem Raum,
  in dem der Tropfen liegt, sondern in dem, auf den die Spur **zeigt**
  (`SCENT_LEAD` 3 m voraus über `spaceAt`, sonst der Raum des Tropfens) — ein
  Monster, das den Tropfen unter den eigenen Füßen für den Aufenthaltsort
  hält, sucht dort, wo es schon steht. Zweitens **ersetzt** sie den Glauben
  nicht, sie **mischt** sich hinein: `trust` Anteil Fährte, der Rest das alte
  Bild. Bei `trust` 1 wäre ein Tropfen so viel wert wie eine Sichtung, und ein
  einziger Treffer schenkte dem Monster den Rest der Runde; `blood.sniff`
  liefert höchstens `SCENT_TRUST` 0,55, mit dem Alter des Tropfens fallend. In
  die Spur der Sichtungen schreibt sie nichts, aus demselben Grund wie
  `disturbed`; notiert wird unter `heard`.
- **Die Blutspur** steht in `rules/blood.ts` — rein, ohne three.js, ohne DOM.
  Ein Treffer öffnet eine **Wunde** für `BLEED_TIME` 120 s (`wound`, ein
  zweiter Treffer setzt die Frist neu statt sie zu verlängern); solange sie
  offen ist, fällt alle `DROP_SPACING` 1,5 m ein Tropfen — **nach Strecke, nicht
  nach Zeit** (`stepTrail`), wer steht, blutet keinen Teppich. Ein Tropfen
  verblasst linear über `DROP_FADE` 40 s (`dropAlpha`, länger als `GHOST_TTL`
  25 s, sonst wäre die Spur nur eine umständliche zweite Erinnerung an dieselbe
  Sichtung), mehr als `DROP_LIMIT` 48 liegen nie — sonst wächst die Liste eine
  Runde lang und geht Bild für Bild über die Leitung. `stepTrail` läuft in
  **jedem** Bild, auch ohne Wunde: Nur so verschwinden die alten Tropfen.
  **Kein Hellsehen**: `sniff(spur, wo, jetzt, drin)` findet den jüngsten
  Tropfen nur in `SNIFF_RANGE` 3 m **und** unter der Prüfung des Aufrufers
  (überall: „liegt im Raum des Monsters"); die Richtung kommt aus den **zwei**
  jüngsten Tropfen derselben Auswahl, also aus zwei Punkten, die beide hier
  liegen. Geschnüffelt wird `SNIFF_EVERY` 0,5 s — eine Fährte liegt da, sie
  trifft nicht ein; deshalb hängt `SNIFF_RANGE` daran: Ein jagendes Monster
  macht in einer halben Sekunde gut zwei Meter und darf nicht über die eigene
  Fährte hinwegspringen. Angeschlossen ist sie in `map/flatRound.ts` (Wunde in
  `hit`, Spur im Schritt — seit dem Rechenkern auch für das Schiff) und in
  `roundSim.ts` — im Prüfstand, weil
  alles, was die Balance verschiebt, dort ausgespielt werden muss. **Gemessen**
  (240 Runden, acht Stationen, `DEFAULT_TUNING`): ohne Spur 79 Siege,
  589 Treffer, 881 Kontakte; mit Spur 79 Siege, 589 Treffer, 890 Kontakte. Die
  Balance bleibt also stehen, das Monster nimmt den Verfolgten aber ein Prozent
  häufiger wahr.
- **Gezeichnet wird beides** (Pakete M3b und M3c). Die Regel, **wer welchen
  Ghost sieht**, steht einmal in `rules/ghosts.ghostsToDraw` und nicht in den
  vier Zeichnern: „Realitätsnah" zeigt nur den Marker des **anderen** und nur,
  solange man den anderen nicht wirklich sieht (ein Marker neben der
  leibhaftigen Figur ist keine Erinnerung, sondern ein zweiter Gegner);
  „Alles sehen" zeigt **beide** blass (`GHOST_WATCH` 0,35) neben den echten
  Figuren. `map/mapView.ts` zeichnet auf der Karte einen gestrichelten
  Ring mit Blickstrich, und die Monster-Ansicht schreibt „Zuletzt gesehen:
  Werkstatt · vor 6 s" in ihre Kopfzeile (`ghostAgeText`). In 3D ist es
  **Weltgeometrie** und kein Bildschirmzeichen (`HauntingWorld.paintGhost`):
  eine Kopie des Monstermodells mit eigenen Materialien, `transparent`,
  `depthWrite: false`, an `state.ghosts.monster`. Sichtbar ist sie, sobald der
  Marker älter als `GHOST_LIVE` 0,5 s ist — „gerade gesehen" steht schon im
  Marker, ein zweiter Sichttest wäre eine zweite Wahrheit. Die Blutspur
  dieselbe Bauart: `drawBloodDrop` (flache Ellipse mit Spritzer, dunkelrot,
  Größe und Spritzerwinkel deterministisch aus dem Zeitstempel) in Szene und
  Karte, `HauntingWorld.paintTrail` als flache Scheiben knapp über dem Blech,
  einmal gebaut und wiederverwendet. In 2D liegen Tropfen **unter** der
  Dunkelheit: Wer nicht hinsieht, sieht auch kein Blut.
- **Prognose und Abfangen** liegen daneben in `monster/monsterIntercept.ts` und
  hängen seit M2 an der Routine. Was darin steht: `predictPlayer` verlängert die letzten
  Sichtungen geradeaus (Richtung und Tempo aus der Spur, Tempo notfalls
  `PLAYER_SPRINT_SPEED`/`PLAYER_WALK_SPEED`, Puste eingerechnet) zu einer
  Polyline über **zwei** Türen — die erste nach dem Winkel zum Kurs, die zweite
  nach dem Zufluss im Glaubensbild — mit einer Ankunftszeit je Tür. **Die
  Ankunftszeit läuft ab**: Vorgerückt wird die Sichtung höchstens `PREDICT_AGE`
  2 s, aber was seither an Sekunden vergangen ist, geht jeder Tür vom
  Vorsprung ab (`overdue`), und eine Tür ohne positiven Vorsprung ist kein
  Abfangpunkt mehr. Ohne das stand das Monster (Paket „Rechenkern",
  `monsterStuck.test.ts` Seed 1) mit einer dreißig Sekunden alten Sichtung
  vor derselben Tür, rechnete alle `REPLAN` 1,5 s dieselbe Tür aus und
  wartete bis zum Ende der Runde. `plan`
  stellt dieser Zeit die des Monsters gegenüber (`Estimator`, heute
  `graphEstimator` über `roomGraph.distance`) und entscheidet: **abfangen**, wo
  das Monster mit `SLACK` 0,8 s Luft früher an der Tür ist (der Kandidat, an
  dem es selbst am schnellsten ist); **verfolgen**, wenn schlichtes Aufholen
  schneller geht oder keine Tür passt und es überhaupt schneller ist;
  **lauern** ohne Sichtkontakt bei `certainty() ≥ 0,6` in einem Raum mit
  höchstens zwei Türen, gedeckelt auf `AMBUSH_MAX` 12 s; sonst **suchen** im
  wahrscheinlichsten Raum — nicht mehr im gewürfelten Nachbarraum. Dafür nennt
  `roomGraph.ts` jetzt auch Türen: `doorsOf(raum)` und `doorPoint(tür)` (die
  Türmitte auf der Kachel**kante**, in Metern). Das Gedächtnis, gegen das
  gerechnet wird, steht dort als Form (`TrackLike`, `MemoryLike`) und nicht als
  Import — so bleibt das Modul für sich prüfbar; die echte `MonsterMemory`
  erfüllt beide Formen.
  **Eine Tür hat zwei Namen, und daran ist die Rechnung erst einmal
  gescheitert.** Das Gedächtnis nennt sie nach den Räumen, die sie verbindet
  (`doorKey`, „flur|kombüse"), die Karte nach dem Bauplan (`d7`). Verglichen
  wurden die Zeichenketten — und damit fand `likelyDoor` **nie** eine Tür:
  Gelauert wurde immer an der ersten Tür des Raums, und die Prognose lief
  hinter der ersten statt hinter der wahrscheinlichsten weiter. M2 übersetzt
  jetzt (Raumpaar → Nachbarraum → gemeinsame Tür); `likelyExit(graph, memory,
raum)` gibt dieselbe Auskunft nach außen, und `monsterRoutine` stellt seinen
  Lauerposten damit an dieselbe Tür wie `plan()`.
- **Tempo ist eine Ungleichung und kein Geschmack** (`mission.ts`):
  `PLAYER_WALK_SPEED` 2,6 < Monstertempo (2,8/2,95/3,2) und Jagdtempo
  ≤ `MONSTER_TOP_SPEED` 4,55 < `PLAYER_SPRINT_SPEED` 4,94. Tests in
  `botTuning.test.ts` rechnen beide Enden nach, auch an den Reglergrenzen.
  **Und sie gilt seit M2 auch _getunt_** — daran war sie vorher gescheitert:
  Geprüft wurde das Grundtempo der Sorte, gelaufen wurde `Grundtempo × speed`,
  und weil das Training `speed` auf 0,75 heruntergedreht hatte, ging das
  Monster in Wahrheit mit 2,21 m/s, also langsamer als ein spazierender
  Spieler. Die Untergrenzen der Regler sind deshalb Teil der Zusage:
  `speed` ≥ 0,95 (Gehen ab 2,66 m/s), `hunt` 1,3…1,55 (Jagd rund 4,4 m/s,
  Deckel 4,55 auch mit Blutrausch und Schub).
  **Die andere Hälfte ist die Puste** (`PLAYER_STAMINA` 5 s Sprint, dann Trab
  `TROT` 0,72× = 3,56 m/s, Erholung `STAMINA_REGEN` 8 s beim Gehen, nach einem
  Treffer `HIT_BURST` 1,5 s Schub, der nichts kostet). Ohne sie war jede Jagd
  in dem Moment entschieden, in dem der Spieler den Stock nach vorn drückte:
  Wer geradeaus lief, kam immer davon, und es gab keinen Grund, eine Tür
  zuzuziehen oder eine Ecke zu brechen. Gerechnet wird sie in
  `mission.stepStamina` (rein, ohne Zustand außerhalb), angewandt in der
  2D-Runde (`map/flatRound.tick`) und in 3D über `core/PlayerRig.pace`, die
  Tempo-Regel, die `HauntingWorld.setupRole` dem Gestell für **jeden Stock**
  einhängt — Brille, Tastatur (`FlatControls`) und Bildschirmstock
  (`ShipExperience.stepStick`) fragen sie je Bild, und die Runde zehrt an der
  Puste (`FlatRound.tick`, im Schiff über den Kern), sobald jemand rennen will
  und dabei den Stock hält (`rig.sprinting`,
  `rig.wishing`). Vorher galt sie nur in der Brille: Die Tastatur ging mit
  3,2 m/s statt 2,6 und rannte 5,76 ohne Puste, der Bildschirmstock 4,94 ohne
  Puste — ein Tastaturspieler war damit schneller als jedes gehende Monster.
  Nachrechnung: Abstand 8 m,
  fünf Sekunden Sprint bringen 2,7 m Vorsprung, danach holt das Monster
  0,85 m/s auf — Kontakt nach etwa 18 s gerader Flucht, mit einem Riegel
  dazwischen etwa 22 s, mit einem Sichtabriss gar nicht.
  **Der Modelltechniker hat seine eigene Puste** (`TechnicianTuning.stamina`,
  Trab über denselben `TROT`), damit das Training sie verstellen darf.
- **Gewichte, Simulation, Training** — die drei Dateien hängen zusammen:
  `botTuning.ts` hält alle Zahlen beider Bots mit Grenzen, Namen und
  Browser-Speicher; die Verhaltensfelder dürfen nicht auf null, sonst trainiert
  sich das Monster zurück in „läuft im Kreis". `roundSim.ts` spielt eine ganze
  Runde ohne three.js/Rapier auf der Raumkarte (`roomGraph.ts`, inklusive
  gedämpfter Hörweite `earshot`) in Millisekunden aus. `botTraining.ts`
  bergsteigt darauf gegen **zwei** Ziele auf einmal (`TRAINING_TARGETS`):
  **zu zweit** (Techniker gegen Monster, sonst niemand) geht die Runde
  halbe-halbe aus, **ab drei Spielern** gewinnt das Monster zwei von drei
  Malen. Beide Zahlen gelten für **dieselben** Gewichte — was sich
  unterscheidet, ist die Besetzung und nicht die Einstellung der Bots
  (`rules/roundSetup.crewSize` zählt Techniker, Monster und jede Fähigkeit der
  Zentrale, die nicht auf „Aus" steht).
  `measure` teilt die Runden einer Messung deshalb auf beide Besetzungen auf
  statt sie zu verdoppeln, und `centreScore` bewertet den Abstand zu beiden
  Bändern zusammen; `inBand` verlangt beide. **Und keiner gewinnt öfter als
  neun von zehn Runden** (`FAIR_LIMIT` 0,9, `fair`): Die Bänder sagen, wohin
  die Suche soll, die Grenze sagt, was sie nie abliefert. Das Training in der
  Tafel fängt bei den Reglern an, wie sie gerade stehen — auch am Anschlag —,
  und das Beste aus einer aussichtslosen Lage ist nach vierzig Schritten
  immer noch eine Seite, die fast jede Runde gewinnt. `outranks` sortiert
  deshalb erst nach Fairness, dann nach Abstand, dann nach Fortschritt: Ein
  fairer Satz schlägt jeden unfairen, unter unfairen zählt weiter der Abstand,
  damit die Suche herausfindet. `TrainingState.fair` sagt es der Tafel, und
  `ShipExperience.stepTraining` spielt einen unfairen Satz **nicht** ein — die
  Regler bleiben dann, wie sie waren, und die Statuszeile sagt es.
  Dazu wie bisher: feste Stichprobe
  je Schritt (sonst klettert es auf Rauschen), Fortschritt als
  Gleichstandsbrecher mit Vorzeichen, wachsende Schrittweite in Sackgassen.
  `TrainingRun.advance(ms)` rechnet in Zeitscheiben, damit der Browser-Knopf
  den Tab nicht einfriert. `DEFAULT_TUNING` ist das Ergebnis dieses Trainings;
  `botTraining.test.ts` misst 1600 Runden nach. **Mit dem Paket „Rechenkern"
  neu trainiert**: Zwei Meter Tür in beiden Welten, Ducken als Tempo und die
  ablaufende Abfangprognose spielen eine andere Runde, und die alten Zahlen
  fielen mit 0,064 aus dem Band (0,05). Zwölf Schritte à 64 Runden von den
  alten Gewichten aus (`TrainingRun(DEFAULT_TUNING, 'both', 12, {rounds: 64},
99)`) stehen bei **0,47 / 0,31**, Abstand 0,029 — und `Schleichtempo` ist
  seither auf höchstens 0,95 gedeckelt: Der Lauf wollte 1,0, und ein
  Schleichen, das so schnell ist wie Gehen, ist keins (`botTuning.test.ts`).
  **Der Abstand zwischen Messung und Zusage ist mit M2 zu.** Die
  Vorgeschichte: Seit jeder Raum zwei bis drei Kisten hat (`rules/cargo.ts`),
  sind die Wege länger — nicht, weil der Bot die Kisten durchwühlte
  (`technicianBot` und `roundSim` gehen über `taskCargo` **direkt** an die
  richtige), sondern weil jede Kiste ein weiteres Wandmodul ist und der Packer
  daraufhin jedes Zimmer anders stellt. Gemessen fiel er dadurch von
  0,52 / 0,34 auf 0,44 / 0,25, und ein Trainingslauf, der ihn mit Gewalt ins
  Band zurückzog, tat es über Puste 2 s und Vorsicht 6 m — Zahlen, die man
  einem Bot ansieht; über beide Seiten gerechnet drückte er sogar das
  Grundtempo des Monsters unter das Gehtempo des Spielers und damit gegen die
  Ungleichung. Der Abstand gehörte also zugemacht, indem das **Spiel** besser
  wird, und genau das ist M2: Das Monster geht schneller, jagt knapp unter dem
  Sprint, sucht statt zu würfeln — und der Sprint hat eine Puste. Danach neu
  gelernt (45 Schritte à 128 Runden, `trainBots(…, 'both')`) und über
  1600 Runden nachgemessen steht `DEFAULT_TUNING` bei **0,54 / 0,315**, also
  **beide Quoten im Band**. `botTraining.test.ts` prüft weiter die Messung
  (`BOT_RATES`) _und_ jetzt zusätzlich, dass `inBand` für sie gilt — eine
  abgelesene Zahl fällt auf, wenn sie sich verschiebt, ein gerade noch
  getroffenes Band nicht.
  **Zwei Vorrichtungen im Test mussten dafür nachgezogen werden, und beide
  sagen etwas über das Spiel.** Der historische „chancenlose" Startsatz gewinnt
  mit den Kisten gemessene 0,375 und ist keiner mehr — der Test fängt bei einem
  Techniker an, der wirklich keine Chance hat. Und der „übermächtige"
  Techniker ist seit M2 nur noch **zu zweit** übermächtig: Weil die
  Untergrenzen der Tempo-Regler Teil der Ungleichung sind (`speed` ≥ 0,95,
  `hunt` ≥ 1,3), lässt sich das Monster gar nicht mehr so weit ausbremsen, dass
  es im Team chancenlos wäre — dort gewinnt selbst dieser Techniker nur 0,375.
  Im Duell räumt er mit 0,81 ab, und genau diesen Überschuss holt die Suche
  wieder herunter; das prüft der Test jetzt. Beide Vorrichtungen stehen
  ausgeschrieben statt aus `DEFAULT_TUNING` geerbt, damit ein späterer
  Trainingslauf ihnen nicht den Boden wegzieht.
  **Und eine Zusage braucht genug Runden, um überhaupt messbar zu sein**: Das
  Band ist 0,05 breit, auf 32 Runden verschiebt eine einzige Runde den
  bewerteten Mittelwert um 0,031. Der Test, der den Start im Band prüft, fährt
  deshalb 64 Runden je Schritt.
- **Die Tür hinter dem Techniker** (`rules/doorSeal.ts`) ist der Grund, warum
  aus derselben Einstellung zwei Quoten werden. Er hat gegen das Monster nur
  eines in der Hand, und das ist **eine Tür**: Wer verfolgt hindurchgeht,
  hinter dem fällt sie zu — nicht als Knopf, den man im Moment der Berührung
  findet. Verriegelt wird über denselben einen Riegel wie überall
  (`doorLocks.chooseLock`), und der Gewinn ist `SEAL_HOLD`: die **ausgerechnete**
  mittlere Zeit, die das Monster zum Aufziehen braucht (aus `pryChance`, nicht
  geraten). Der eigentliche Gewinn ist aber, dass eine Tür die **Spur abreißt**
  — kein Blick, ein gedämpftes Geräusch, und die Jagd wird wieder zur Suche.
  **Allein** macht der Techniker sie selbst zu, sofort. **Im Team** gehört sie
  der Schalttafel: Er muss es sagen, der andere muss hören und drücken, und
  das kostet `COMMAND_DELAY` = 1–2 s (`commandLag`). In der Zeit ist ein
  jagendes Monster fünf Meter weiter und manchmal schon durch — dann war der
  Riegel umsonst. Dieselbe Reibung verzögert in `roundSim.ts` auch, wann die
  Flucht überhaupt anläuft. Mehr Leute heißt hier nicht mehr Sicherheit,
  sondern mehr Reibung; die Zentrale zahlt sie mit Wissen zurück.
- **Ein Riegel im Fluchtweg ist für den Bot ein Preis, keine Wand**
  (`rules/technicianBot.ts`, `doorToll`). Auf der Flucht fällt hinter ihm eine
  Tür zu und das Monster schlägt welche zu — steht dann eine gesperrte Tür
  zwischen ihm und seiner Deckung, wartet er nicht davor, sondern **zieht sie
  auf**: derselbe Knopf, den ein Mensch dort drückt (`FlatWalker.blocked`
  meldet die Tür, vor der die Route endet; `FlatRound.lockDoor` macht sie
  auf). Bezahlt wird das bei der **Wahl der Deckung**: Jede gesperrte Tür auf
  dem Weg zählt als `DOOR_TOLL` = 6 m Umweg mit, und bis zu `1 + DOOR_HURRY`
  mal so viel, je näher das Monster schon steht — am Riegel steht er still,
  und wer hinter ihm herkommt, holt in dieser Zeit auf. Deckung ohne Tür
  dazwischen gewinnt damit von selbst; ist ringsum alles zu, geht er trotzdem.
  Unendliche Kosten wären dieselbe Ecke, in der er sonst stehen bleibt und
  stirbt — dieselbe Regel wie bei der Scheu vor dem Monster (`RouteAvoid`).
- **Die Scheu hat einen harten Kern** (`RouteAvoid.core`, `CORE_WEIGHT` = 1000
  je Rasterschritt, Radius `DREAD_CORE` = Schlagreichweite 1,7 m + 2,5 m —
  einmal „eine Kachel", seit dem 1-m-Gitter in Metern). Der weiche Trichter allein kostete vier je Schritt — einen Meter
  Umweg, und den zahlt ein Fliehender jederzeit: Der Techniker lief dem
  Monster regelmäßig durch die Arme. Tausend sind 250 m Umweg, mehr als die
  Station breit ist; hindurch geht er nur noch, wenn es gar keinen Weg daneben
  gibt (endlich teuer, nicht gesperrt — eine Wand, die sich bewegt, sperrt
  irgendwann jemanden ein). Zwei Löcher gehören dazu, ohne die der Kern nichts
  täte: Der **Schnurzug** zog den Bogen hinterher wieder gerade (er fragt nur,
  ob die Kapsel durchpasst — durch den Gang mit dem Monster passt sie), also
  ist der Kern für die Glättung eine Wand (`coreCrossed`); und eine **einmal
  geplante Route** blieb stehen, während das Monster weiterlief, also prüft der
  Navigator bei jeder Verfolgung nach, ob die laufende Route inzwischen
  hindurchführt (`navmesh/flatNavigator.crossesCore`, dazu engere Toleranzen
  `CORE_TOLERANCE`/`CORE_HOLD`).
- **Zeitraffer** (`simulationSpeed.ts`): ×1/×2/×4/×8/×12/×16 über die
  **Anzahl** der Bilder (`HauntingWorld.update` → `tick`), nie über die Länge
  eines Schritts; nur der letzte Durchgang sendet und frischt die Anzeigen
  auf. Lange echte Bilder nehmen die Stufe selbsttätig zurück. **Eingestellt
  wird sie im Optionsmenü des Schiffs** (`map/optionsMenu.speedKeys`, Reihe
  `ui-row` aus Pillen, `[data-speed]`, nur in der Bot-Runde) — der Besitzer
  wollte die Stufen einzeln wählbar, nicht einen Knopf, der reihum zählt; der
  „Tempo"-Knopf in der Test-Tafel des Schiffs ist deshalb weg. Die Stufe
  gehört der Welt (`HauntingWorld.simulationSpeed`).
- **Beleuchtung der Bot-Runde** (`botLighting.ts`): vier Stellungen, dazu
  Drehleuchten in den Gängen (`shipArt.buildCorridorBeacons`,
  `HauntingWorld.applyBeacons`). Winkel und Puls laufen im Kreis statt
  weiterzuwachsen; die Leuchten sind `MeshBasicMaterial` und keine Lichtquellen.
- `trainingLayout`/`trainingDeck` bieten getrennte Lehrzimmer. Übungspuzzles
  haben eigene Zustände; erneutes Drücken setzt nur das jeweilige Beispiel
  zurück. Dunkler Test bleibt sicher; Lampen sind tatsächlich nötig.

**Telefone und Netzwerk**

- **Das Telefon ist das Hauptgerät der Einsatzzentrale.** Die Stationen im
  Van werden von den Spielern am Handy bedient, und auch der Techniker am
  Handy spielt das Schiff (von oben oder aus den Augen, mit dem Bordstock der
  Seite). Jede UI-Entscheidung wird zuerst für ein Telefon im Hochformat
  getroffen:
  Daumenzonen unten, nichts Wichtiges in der Bildmitte, nichts unter dem
  HUD der Seite (Menü, Verbindung, VR; `z-index` 5 in `style.css`), und was
  bedienbar sein soll, ist ohne Tippen ins Leere sichtbar. Desktop und
  Querformat sind Nebenfälle, nicht der Maßstab.
- **Die gemalte 2D-Welt ist weg** (Paket H): `map/flatMode.ts`,
  `map/flatScene.ts`, `map/flatArt.ts`, `map/flat.css` zeichneten das
  Brettspiel von oben mit eigener Runde darin — Böden, Wände als Band,
  Figuren als Bohnen, Overlays für Karte, Rätsel, Akte und Menü, die Kamera,
  die beim ersten Schritt zurückkam, der Rollenstreifen über der Szene. Was
  davon **Rechnung** war, gilt weiter und steht in `map/flatRound.ts`,
  `geometry.ts`, `visibility.ts`, `noiseSpread.ts`, `automaticDoors.ts`
  (die Türautomatik: Kasten 1,8 m quer und 3,2 m vor der Tür, Nachlauf
  1,2 s, ein belegter Durchgang fällt nie um jemanden zu), `rules/` und
  `audio/`; was **Bild** war, ist das Schiff von oben (`core/TopDownCamera.ts`)
  und die Karte der Telefone (`map/mapView.ts`). Der Streifen der Seite
  (`#hud`) ist im Schiff im Browser weiter aus — über eine Klasse am `body`
  (`haunting.css`, `body.orbital-on #hud`, gesetzt von `ShipExperience`),
  weil die Seite ihr `hidden` beim Verlassen der Brille selbst wieder setzt
  (`main.ts`); Kompass und Tafel rücken dafür an den oberen Rand
  (`--orbital-top`). Der Stock der Karten-Rollen (`map/joystick.ts`,
  `map/joystick.css`: Monster, Zuschauer) hat eine **sichtbare Ruhestellung**
  unten links und springt beim Aufsetzen unter den Daumen; `.flat [hidden] {
  display: none !important }` bleibt Pflicht.
- **Die Karte hat die Handschrift eines Brettspiels** (`map/mapView.ts`,
  `INK`): helle Böden mit Kachelfugen (`FLOOR_TILE` 1,25 m), Wände als dunkler
  Kern mit heller Kante, **Türen als Blätter in Pfosten** — zu ist ein Blatt
  quer (Stahl hell, Holz holzig), offen sind nur die Stummel, gesperrt ist rot
  mit Schloss —, **Möbel als Klötze** (`MapSnapshot.fixtures` aus
  `stationLayout`, `extract.fixturesOf`, mit Kennzeichen je `MarkId`), Figuren
  als kleine Astronauten mit Visier, Rucksack, Händen und Beinen, die beim
  Gehen schwingen, das Monster als Klumpen mit Augen und Klauen. **Geräusche
  sind Wellen über die Kacheln** (`map/noiseWaves.ts`;
  `MapSnapshot.noises`, `MapNoise` mit Urheber, Reichweite `reachOf`,
  Zeit; `WAVE_SPEED` 9 m/s): eigene blau, die des Monsters rot, alles andere
  orange — **die Urheberfarbe aber nur im Modus „Alles sehen"**; wer mitspielt,
  bekommt für alles Fremde dieselbe Farbe — die 2D-Runde führt sie fünf Sekunden
  (`FlatRound.wave`: Schritte als Pulse, Türen, Zufallen, Splittern, Schrei,
  Schacht). Sie laufen über die **Felder** und nicht über die Luftlinie
  (`map/noiseSpread.ts`): Kachel für Kachel, nie über den leeren Weltraum
  neben der Station — und durch die **Schächte**, in beide Richtungen.
  **Wände dämpfen, sie schneiden nicht ab**: Ein Schritt durch eine Wand
  kostet `WALL_LOSS` 9 m, durch Glas `GLASS_LOSS` 6 m, durch ein
  geschlossenes Türblatt `DOOR_LOSS` 4 m, durch einen Schacht seine Länge
  plus `VENT_LOSS` 3 m — die Zahlen stehen **einmal**, in `audio/hearing.ts`,
  und `noiseSpread`, `perception.acousticField` und `roomGraph.earshot`
  holen sie sich dort. Was `spreadNoise` je Kachel zurückgibt, sind deshalb
  **effektive** Meter (Weg plus Dämpfung), und die Front braucht für eine
  Wand bei `WAVE_SPEED` eine knappe Sekunde länger und kommt blasser drüben
  an. Bis Herbst 2026 war das anders: Die Welle hörte an jeder Wand hart auf
  und eine geschlossene Tür sperrte sie ganz — der Spieler sah sein Geräusch
  im Zimmer bleiben, während das Monster es nebenan längst hörte. Jetzt
  zeigt das Bild dasselbe, was `audio/hearing.ts` rechnet. Gezeichnet werden
  sie **ganz hinten**, direkt auf den Böden: Eine Welle über Möbeln und
  Figuren nähme genau das Bild weg, für das sie da ist. **Wer das Monster
  spielt, sieht seine eigenen Wellen nicht** — man hört sich nicht selbst zu, weder auf der
  Karte noch auf den Ohren (`audio/soundscape.selfMonster`). Über einer
  gesperrten Tür steht ein **Balken**, wie lange die Sperre noch hält
  (`MapDoor.hold`). **Ziele** (`MapViewOptions.objectives`, `FlatRound.objectives`:
  erst Ersatzteil, dann Konsole, zuletzt Zentrale) als gelbes Dreieck am
  Bildrand mit Entfernung — und am Ort als das Ding selbst: der Kasten der
  Kiste, der Umriss des Raums, ein Ring nur noch bei Konsole und Zentrale;
  **Schächte** (`layers.vents`) als Bögen zwischen verbundenen Klappen mit dem
  Zielraum daran — in der 2D-Welt im
  Modus „Alles sehen", in der Monster-Ansicht immer. `overlay` malt zuletzt,
  was eine Ansicht selbst noch braucht. Im Modus „Realitätsnah"
  bleiben Möbel und Items im Dunkeln weg (`seen`).
- **Die Tafel der Runde hat fünf Plätze** (`rules/roundSetup.ts`, `SEATS`):
  **Techniker, Rot, Gelb, Blau, Monster**. Jeder Platz sagt, wer ihn hält
  (`SeatWho`: Mensch / Bot / Aus — der Techniker kennt kein „Aus", und mit
  Brille im Raum steht er auf **VR**, `lockTechnician`), und jeder Platz außer
  dem Monster trägt die **drei Fähigkeiten** (`Ability`: Späher, Schalttafel,
  Archiv) als Lampen, die man je Platz an- oder ausschaltet (`withPower`).
  Die Tafel liegt in `localStorage` (`bgvr.haunting.setup.v2`; v1 und die
  noch ältere `seats:[{role,who}]`-Form übersetzt `readSetup` beim Lesen) und
  ist überall dieselbe: `roundSetupPanel.ts` (`SetupPanel`) im Van, die
  Einträge `haunt:seat-<platz>` und das Untermenü `haunt:powers` in der
  Brille — so stellt auch der VR-Spieler ein, ob ein Monster mitspielt und
  ob Bots das Archiv und die anderen Posten halten.
  **Und die Tafel, die gilt, ist die des Gastgebers** (`net.setupMessage`,
  `net.readSharedSetup`, `HauntingWorld.applySetup`/`adoptSetup`): Jeder Tipp
  auf einem Gerät, das die Runde nicht rechnet, geht als ganze Tafel an den
  Gastgeber, der übernimmt sie (nur den Anzug lässt er der Brille,
  `lockTechnician`), und mit dem nächsten Stand kommt sie als Feld `setup` an
  alle zurück — ohne Protokollsprung, weil ein Gerät ohne das Feld einfach
  seine eigene behält, wie bisher. Vorher lag die Tafel **nur** im Browser
  jedes Geräts: Was ein Telefon in der Lobby einstellte, sah die Brille nie,
  und der Gastgeber prüfte Schaltbefehle gegen eine Tafel, die nur er kannte.
  Gegen das Zurückspringen — der eigene Tipp ist noch unterwegs, der alte
  Stand kommt viermal je Sekunde — hält jedes Gerät nach einem Tipp
  `SETUP_GRACE` = 1,5 s lang seine eigene Tafel (`setupTouchedAt`), und
  übernommen wird nur, was sich unterscheidet (`sameSetup`), sonst baute sich
  die Seite viermal je Sekunde neu und verschluckte jeden Tipp dazwischen.
  Wer später dazukommt, sieht so die Verteilung, die gilt, und nicht seine
  von gestern. **Wer ich bin, ist keine
  Spalte auf der Tafel mehr**, sondern die Wahl der Lobby (`LobbyChoice.me`,
  `MyRole` = ein Platz oder `watch:technician` / `watch:all`), je Gerät. Die
  **Reiterzeile** des Telefons ist diese Wahl (`stationUi.choose`): Wer einen
  Platz antippt, sitzt dort, der Platz wird „Mensch", der alte wird frei
  (Farben → Aus, Techniker/Monster → Bot) — „das Wegschubsen ist nur eine
  Metapher". Wer allein ist, sitzt als **Zuschauer: Einzeln** in der
  Zentrale (`defaultLobby` auf dem Telefon), und die Runde läuft mit Bots.
  **Wie eine Mischung heißt, rechnet `roleName`:** Späher / Schalttafel /
  Archiv einzeln; Späher + Schalttafel = **Einsatzkontrolle**, Archiv +
  Späher = **Aufklärung**, Archiv + Schalttafel = **Leitstand**, alle drei =
  **Zentrale** (`seatTitle` je Platz). `powersOf` sind die Fähigkeiten des
  **Technikerplatzes** (Späher auch, wenn ein Bot-Platz ihn hält, denn der
  funkt ihm die Punkte); ohne Archiv sieht der Techniker **keine Ziele** —
  keinen Kompass, keinen Saum auf der Karte, keine Liste
  (`goalPrecision === 'none'`, `FlatRound.objectives` und
  `HauntingWorld.objectives` geben `[]`); er hört, wo es liegt, wenn am
  Archiv ein Bot rechnet (`botArchivist`, `rules/archiveRadio.ts`), oder
  sucht. Ohne Schalttafel schaltet er keine Tür und keine Lampe per Tipp;
  Schaltbefehle nimmt die Welt nur von Farbplätzen an, die die Fähigkeit auf
  der Tafel des Gastgebers halten (`applyFlip`).
  **Die Stühle heißen Farben** (`stations.StationId` = `red | yellow | blue |
watch | monster`, `COLOUR_STATIONS`); Archiv, Schalttafel und Späher sind
  seither **Ansichten** (`ABILITY_VIEWS`: `archive`, `hack`, `scout` in der
  Registry), die ein Stuhl je nach seinen Lampen aufschlägt — **alle
  zusammen auf einer Karte** (`views/seatRole.ts`, `mountSeatView`): Die
  drei Ansichten bekommen die eine `MapView` gereicht statt je eine zu bauen,
  zeichnen sie nicht selbst und verstecken ihr Kästchen; oben steht eine
  Zeile (`.role__bar`) mit Name und Meldung je Fähigkeit. Türen und Lampen
  hört die Schalttafel (`tapDoor`, `tapLight`), Zimmer der Archivar
  (`open`), der Späher malt seine Peilung (`paint`); Fracht hat auf dieser
  Karte keinen eigenen Griff, weil sie vor den Türen geprüft würde und an
  vielen Türen eine Kiste im Fangradius steht — der Tipp fällt ins Zimmer
  und öffnet dessen Akte. Gezeigt wird die Vereinigung (Lampen mit
  Schalttafel, Fracht mit Archiv) und **nie ein Wesen**: ein heller Raum,
  aber nicht, ob das Monster darin steht. Für die Welt zählt das Archiv, wenn
  es dabei ist (`StationUi.shownView` → sein Loch für die Raumakte), sonst die
  erste Fähigkeit. Eine Zeile zum Blättern (`data-sub`) gibt es nicht mehr;
  der Besitzer wollte die Fähigkeiten nicht wechseln, sondern haben.
  `crewSize` zählt Techniker, Monster und jede Fähigkeit eines Platzes, der
  nicht auf „Aus" steht.
  **„Monster: Mensch" heißt: Wer den Platz nimmt, steuert es.** Auf der
  Tafel steht, wem der Platz gehört; wer ihn über den Reiter nimmt, sitzt an
  der Station `monster` und schickt sein Steuer (`monster/netMonsterPort.ts`)
  — auch als **Gastgeber**, dessen Port die eigene Runde speist (`receive`).
  Ist keine Brille im Raum, spielt er das Monster **auf der Karte von oben**
  (`startRound`: `flatRoleOf(setup, 'monster')`), denn im Schiff rechnet der
  Modelltechniker nur auf dem Gerät des Technikers, und ein Monster allein im
  Schiff hätte niemanden zu jagen. Sitzt niemand dort, rechnet beim Gastgeber
  die Routine weiter (`monster/netMonsterControl.ts`, `occupied`), und ein
  Satz beim Start sagt es.
  **Die Spalte „Ich" verbindet Platz und Gerät**: Ein Tipp darauf macht die
  Zeile zum Menschen _und_ setzt dieses Telefon an das Gerät, das dazugehört
  (Archiv → Archiv, Schalttafel → Schalttafel, Späher → Späher, Monster →
  Monster; `stationUi.claimSlot`, `ABILITY_STATIONS`) — ohne dabei die Seite zu
  wechseln. Seit #93 ist jede Fähigkeit eine eigene angemeldete Rolle mit
  eigener Karte; „Einsatzkontrolle" ist deshalb kein Gerät mehr, sondern nur
  noch der **Name** dafür, beide zugleich zu halten. Unter jeder Fähigkeit steht, wer sie wirklich hält (Name aus dem
  Netz, „Bot" oder „niemand"). Über das Netz sagt ein Telefon weiterhin **ein
  Gerät** an (`Claim.station`); die Fähigkeiten sind lokal — die feinere Ansage
  gehört in `net.ts` und damit in ein eigenes Paket.
  **Wer mitten in der Runde wechseln darf, rechnet `switchRights`:** in einer
  Test-Runde jeder alles; sonst nur, wer in der Zentrale sitzt (am Telefon
  also, und nicht als Monster), und den Techniker in der Brille rührt niemand
  an (`lockTechnician`, `technicianLabel` → „VR", der Knopf ist dann gesperrt).
  Verteilt wird nicht mehr mit drei Kacheln, sondern mit der Absicht
  (`lobby.applyIntent`, siehe unten); `presetFor` bleibt als Rechnung für die
  alten Namen. `flatRoleOf` sagt, wen der Spieler in 2D spielt — ein
  Mensch als Techniker gewinnt gegen ein Mensch als Monster (ein Stock, ein
  Spieler), und niemand von beiden heißt **`watch`**: zusehen, während der
  Techniker aus Zahlen läuft (`flatRoleOf` ist mit der gemalten Karte
  gegangen). `roundKindOf` sagt die Rundenart im Schiff (dort rechnet das
  Monster immer die Routine). **Ein Bot auf einem Platz gibt dem Techniker die
  Fähigkeit selbst** (`powersOf`, `SoloPowers`): Archiv heißt Kistengenauigkeit
  des Ziels (`goalPrecision`), der Saum auf der Zielkiste, die Auftragszeile
  im Streifen (`hudTasksVisible`) und der Funk des Archivars aus Zahlen
  (unten); Späher und Schalttafel wirken heute nur über die Karte der
  Telefone — das Horchbild (`SCOUT_PERIOD` = 3,5 s, eine Probe der Geräusche
  statt der Stelle des Monsters: Eine Peilung alle drei Sekunden nahm ihm jede
  Möglichkeit, sich zu verstecken) und die Tür- und Lampen-Tipps hingen an der
  gemalten Karte des Technikers und sind mit ihr gegangen. Ein Mensch am
  Platz nimmt ihm die Fähigkeit wieder ab — und mit ihr die Kistengenauigkeit
  des Ziels.
  **Und der Archivar aus Zahlen funkt jetzt auch** (`rules/archiveRadio.ts`):
  Bis hierher bekam der Techniker dessen Auskunft _still_ — die Zielkiste
  leuchtete, ein Tipp aufs Zimmer schlug die Akte auf. In der Brille schaut aber
  niemand auf eine Karte, während hinter ihm eine Tür knarrt; der Besitzer wollte
  „die Hilfe-Kommunikation vom Archivar" ausdrücklich auch dort. Gesprochen
  werden die zwei Sätze, die ein Mensch am Archiv ohnehin sagen würde: **wo es
  liegt**, und sobald das Teil in der Hand ist, **wohin damit und welche Liste
  dafür aufzuschlagen ist** (`SHEET_NAMES`: Kabelplan, Frequenzliste, Codetafel).
  Gelesen wird dabei dasselbe Blatt wie auf dem Telefon des Archivars
  (`archiveGoals`) — also gilt dieselbe Verschwiegenheit: die Konsole erst mit
  dem Teil in der Hand, ein abgelegtes Teil erst nach `DROPPED_SEEN`. Gefunkt
  wird nur bei Lagewechsel (`ArchiveCall.key`) und nur dort, wo am Archiv
  wirklich ein Bot rechnet: Sitzt ein Mensch, ist das Sagen sein Platz, und eine
  Stimme daneben nähme ihm seinen einzigen Beitrag weg. Die Wege von
  Techniker und Monster (`FlatRound.playerRoute`, ein eigener `FlatNavigator`
  mit `PLAYER_RADIUS`; `monsterRoute`, `navigator.remaining`) liegen im Schiff
  als `NavigationOverlay` auf dem Boden (Bot-Runde, „KI-Absichten"); **beim
  Zuschauen ist der Weg des Technikers der seines Bots** (`TechnicianBot.route`
  über `FlatWalker.remaining`).
- **Das Kabelrätsel zeigt Symbole** (`WIRE_SYMBOLS` in `ShipExperience`, an
  der Konsole und in der Tafel des Technikers): Stecker `i` gehört in die
  Buchse mit demselben Symbol, richtig Verbundenes leuchtet grün. Ohne die
  Symbole war das Rätsel ein Raten unter 24 Wegen. Von oben öffnet `A` an der
  Konsole den Wartungskasten und klappt die Tafel mit den Rätselknöpfen auf
  (`useConsole`); das frühere Rätsel-Overlay der gemalten Karte
  (`map/puzzleOverlay.ts`) ist weg — offen ist ohnehin immer nur eines
  (`FlatOverlay`, oben).
- **Der Kompass am oberen Bildrand** (`objectiveCompass.ts`) gehört dem
  Desktop-Techniker: Himmelsrichtungen und die Ziele (`HauntingWorld.objectives`,
  dieselbe Regel wie in 2D) als gelbe Dreiecke mit Entfernung, was hinten
  liegt klebt am Rand. `compassMarks` ist reine Rechnung mit Test; in der
  Brille gibt es ihn noch nicht (DOM ist dort unsichtbar) — ein Streifen an
  der Kamera wie `ShipExperience.status` wäre der nächste Schritt.
- **Eine Runde in der Brille starten** (`HauntingWorld.menu()`,
  `rules/worldMenu.ts`): Handgelenk-Knopf drücken, im Panel unter den fünf
  Einträgen der Engine (Welten, Verbindung, Bewegung, Aussehen, Grafik) stehen
  **zuerst** die drei Absichten der Lobby — _Spielen_, _Zuschauen_,
  _Trainieren_, die aktive mit einem Punkt davor —, dann „Zur Zentrale /
  Rolle wechseln", die feste _Ansicht: 3D Schiff_ und die Einstellungen
  (Testlicht, Station, Techniker, Monster, **je ein Eintrag für Späher,
  Schalttafel und Archiv** mit Bot / Mensch / Aus, Gegner). Ein Druck genügt, es gibt kein Untermenü, und das Panel klappt
  zu — **nur wenn wirklich etwas losgeht**: Eine Absage muss offen bleiben,
  weil `App.notify` in der Brille die Statuszeile _des Panels_ schreibt und die
  Meldung mit ihm verschwände. Danach läuft die Runde
  (`phase === 'running'`); beim Spielen ist das Monster an, Zuschauen und
  Trainieren sind der sichere Stand mit Testlicht (`startedRound`).
  **Was dabei schiefgeht, sagt der Eintrag jetzt selbst.** Die Rechnung
  darüber, welcher Eintrag dasteht, was er startet und welcher Satz an die
  Stelle einer Runde tritt, die nicht losgeht, liegt ohne three.js in
  `rules/worldMenu.ts` und wird von `worldMenu.test.ts` nachgerechnet — drei
  Hürden waren es, und jede endete vorher in einem Eintrag, der nichts tat und
  nichts sagte:
  1. **Die Ansicht ist keine Sache dieser Welt mehr.** Bis Paket H entschied
     ein Häkchen „2D von oben" (`opensFlat`), ob eine gemalte Karte aufging —
     und in der Brille stieg das wortlos aus; seither ist _Von oben_ oder
     _Aus den Augen_ das Menü des Kerns, und diese Hürde gibt es nicht mehr.
  2. **Ein fremder Gastgeber** (`mayCompute`, `HOST_BUSY`): Rechnet ein anderes
     Gerät die Runde — ein zweites Fenster, das noch als Techniker im Raum
     steht, reicht —, dann sagt der Eintrag das, statt still zu bleiben.
     Dieselbe Meldung kommt beim Druck.
  3. **Die falsche Rolle** (`NOT_TECHNICIAN`) und **ein belegter Raum**
     (`ROOM_BUSY`, nur für „Zuschauen" im Schiff: es setzt den Stand zurück).
     Auch der Startknopf im Van läuft durch dieselbe Prüfung — **aber erst,
     nachdem er den Anzug verteilt hat**, siehe den nächsten Absatz.

  **Und der Startknopf im Aufbau ist selbst der Weg an den Stock**
  (`shipStart`, `HauntingWorld.startRound`, `pendingStart`). Der vierte Befund
  war: „Der Knopf ‚Mission starten' scheint die Mission nicht zu starten." Er
  stimmte für **jedes** Gerät, das nicht schon am Stock stand — also für jedes
  Telefon und für jeden Desktop beim ersten Aufschlagen: `startMission` fragt
  `startBlocker`, das fragt `ctx.role`, und das ist dort `desktop`. Heraus kam
  `NOT_TECHNICIAN`, und der Satz dazu ging in die Statuszeile des
  Handgelenk-Menüs — ein Panel in der 3D-Szene, über dem die Einsatzzentrale
  liegt. Der Knopf tat also nichts und sagte nichts. Jetzt rechnet
  `shipStart({atStick, mine, occupied})` vier Fälle:
  `start` (steht schon am Stock), `stick` (die Tafel sieht dieses Gerät als
  Techniker: `flatTechnician = true`, die Absicht wartet in `pendingStart`
  und läuft im nächsten Bild noch einmal durch — dann mit `ctx.role === 'vr'`),
  `others` (`SHIP_OCCUPIED` — im Schiff gibt es einen Techniker je Raum) und
  `nobody` (`SHIP_NEEDS_TECHNICIAN` — wer in der Zentrale sitzt, startet keine
  Schiffsrunde ohne einen Menschen im Anzug; der Satz sagt beide Auswege).
  Die Bot-Runde geht wie bisher vorher ab (`requestBotRound`): Sie macht das
  Gerät selbst zum Techniker ihrer Vorführung.

  **Und steckt der Techniker in der Brille, startet ihn die Zentrale**
  (`net.startMessage`, `START_SENT`): Ein Gerät, das nicht der Gastgeber ist,
  während eine Brille im Raum den Anzug trägt, schickt Absicht und Tafel als
  Startwunsch hinüber statt in `others` zu enden; der Gastgeber übernimmt die
  Tafel und läuft durch dasselbe `startRound` — für ihn ist es `start`. Eine
  **laufende** Runde bricht der Wunsch nicht ab (`ROUND_RUNNING`): Ein Tipp
  aus der Zentrale ist kein Notschalter; der Knopf am Telefon ist dann auch
  gesperrt (`StationUi.shipBusy`: Brille im Raum, Ansicht Schiff, **und** die
  Runde läuft — vorher reichte die Brille allein, und genau das war der Fall,
  in dem drei Leute in der Zentrale warteten, während der Techniker am
  Handgelenk nach dem Knopf suchte). Ein Platz der Zentrale bleibt nach dem
  Wunsch an seiner Karte und sieht dort die Runde, die läuft.

  **Was die Welt sagt, steht auf dem Telefon** (`StationUi.say`,
  `.haunt__say`, `HauntingWorld.say`): eine Zeile zwischen Auftragsstreifen
  und Seite, die der nächste Tipp wieder ablöst. `ctx.notify` allein genügte
  nicht — es schreibt in die Statuszeile des Handgelenk-Menüs, und die liegt
  hinter der Einsatzzentrale. Jede Absage eines Starts geht deshalb an beide
  Stellen.

  **Die Einträge heißen jetzt überall gleich**: `startEntries` baut aus
  `INTENTS` die drei Zeilen `haunt:play` · `haunt:watch` · `haunt:train` mit
  den Worten aus `INTENT_LABELS` (Spielen · Zuschauen · Trainieren), markiert
  die aktive (`active`, aus `intentOf`) und sagt in der Zeile darunter, wenn
  eine laufende Runde damit endet. Die alten Einträge `haunt:flat` („2D-Welt
  von oben: an/aus") und `haunt:view` gibt es nicht mehr — die Ansicht ist das
  Menü des Kerns.

- **Der Aufbau ist eine Tafel und ein Knopf** (`rules/lobby.ts`,
  `LobbyChoice` = Absicht und Platz, in `localStorage` unter
  `bgvr.haunting.lobby.v1`; ein gemerktes Feld `view` aus alten Ständen wird
  beim Lesen fallen gelassen). Die **Absicht** (`Intent`) sagt, _was_
  passiert; wie man dabei zusieht — von oben oder aus den Augen — ist seit
  Paket H das Menü des Kerns und kein Häkchen mehr (`[data-check="view"]` ist
  weg, ebenso `View`, `viewSwap`, `VIEW_LABELS` und der alte Schlüssel
  `bgvr.haunting.flat.v1`). Das Häkchen „Testen" ist ebenfalls weg — ohne
  Monster spielt man, indem man den Platz **Monster auf „Aus"** stellt
  (`applyIntent('train')` tut genau das), und **in einer Runde ohne Monster
  darf jeder jederzeit jede Rolle wechseln**. Die drei Kacheln _Spielen ·
  Zuschauen · Trainieren_ sind weg: „Zuschauen" baut man nicht auf, man
  schaltet es mitten in der Runde an (Optionsmenü des Schiffs); die Absicht
  `watch` bleibt als Datum und im Brillenmenü.
  `applyIntent(setup, intent, me)` kennt dabei, wer fragt: Ein Monster-Mensch
  bleibt beim „Spielen" das Monster, und der Techniker gehört dann den Zahlen.
  Die Absicht ist keine zweite Wahrheit neben der Verteilung: `applyIntent`
  schreibt sie in die `RoundSetup` (die Fähigkeiten bleiben dabei stehen),
  `intentOf` liest sie wieder heraus, und `startLabel` beschriftet daraus den
  **einen** Startknopf — „Mission starten", „Test starten", „Zuschauen",
  **ohne Ansicht in Klammern**. Jede Runde läuft im Schiff
  (`HauntingWorld.startRound`); ein Monster-Telefon ohne Techniker im Raum
  bekommt statt einer Karte den Satz `MONSTER_NEEDS_TECHNICIAN`.
  **Alle Oberflächen zeigen denselben Aufbau**, in derselben Reihenfolge und
  mit denselben Worten:
  - **Startseite der Runde** (`index.html` `#haunt-start`, `main.ts`, unter
    `#haunting`), in zwei Schritten. **Erst die Lobby**: Name, Raum-Code,
    **Verbinden** — und dann eine Liste, wer im Raum steht (ich zuerst, dann
    jeder andere mit Name und Gerät: Brille, Bildschirm, Handy; „schon drin",
    wer die Welt schon betreten hat). Hinein geht es mit **einem Knopf**
    (`#haunt-enter`, nur in der Lobby, sichtbar erst mit der Verbindung), und
    welcher der drei Wege das ist, hat die Startseite schon entschieden
    (`core/screenView.startOptions`): mit Brille **Enter VR** (der Techniker im
    Anzug), sonst **Beitreten** — und dort, je nach „Am Bildschirm: 2D oder
    3D?", die **2D Einsatzzentrale** oder **Web 3D** (Techniker am Bildschirm,
    im Schiff). Die Zeile unter dem Knopf (`#haunt-enter-hint`) schreibt jede
    Änderung mit (`main.ts`, `showStart`); der Browser-Smoke wählt „2D" und
    drückt dann den Knopf. Und wer Haunting nicht über diese Seite, sondern aus
    dem Menü betritt, bekommt dieselbe Wahl als Voreinstellung der Lobby
    (`rules/lobby.defaultLobby(role, view)` über `storedScreenView`), solange
    die Lobby selbst noch nichts gemerkt hat.
    Alle drei bleiben im Raum: `joinHaunting` läuft vor jedem noch einmal —
    wer schon im richtigen Raum steht, bekommt höchstens den Namen
    nachgetragen (`App.setPlayerName`), wer den Code inzwischen geändert hat,
    zieht um. Der Raum kommt aus der Adresse (`net.hauntRoomFrom`: `?room=`
    oder `HAUNT_ROOM`), und ein getippter Code wandert beim Verbinden als
    `?room=` in die Adresse zurück — dieselbe Zeile, die die Welt selbst liest.
    **Die Welt lädt erst mit dem Knopf**: `joinTable` verbindet beim Betreten,
    wenn noch keine Verbindung steht, und zwei gleichzeitige
    Verbindungsaufbauten (Seite und Welt) räumten sich gegenseitig den
    Transport weg — also sammelt die Seite erst alle in der Lobby und lädt
    dann. Die zwei Web-Wege sagen der Lobby vor dem Laden, was dieses Gerät
    ist und wie es sieht (`rules/lobby.arriveAs`): „Web 3D" heißt Techniker
    und Schiff; „2D Einsatzzentrale" heißt Karte von oben, ein gemerkter Platz
    bleibt stehen, nur aus einem gemerkten Techniker wird der Zuschauer des
    Technikers. Für **Enter VR** wird die XR-Sitzung noch aus dem Klick heraus
    angefragt — ein Browser gibt sie nur auf eine frische Geste. Der Rest der
    Startseite (Spielwiese-Knopf, „Zusammen spielen") ist dann
    versteckt, nicht abgebaut (`only-generic`/`only-haunting` in `style.css`):
    `NetPanel` hängt an den Feldern. Der alte Block „In der Zentrale
    mitspielen" (nur der Name, fester Raum `haunting`) ist damit weg — eine
    zweite Gruppe braucht einen eigenen Raum, und der Techniker am Bildschirm
    einen eigenen Knopf.
  - **Wer den Anzug trägt, zählt — auch am Bildschirm** (`HauntingWorld.wearsSuit`,
    `roomHasTechnician`, `suitPeer`). Bis hierher hieß „ein Mensch ist
    Techniker" an vier Stellen `peer.role === 'vr'`: Wer über „Web 3D" kam,
    stand zwar im Schiff, war für die Zentrale aber unsichtbar — ihr Start
    (`startRound`) fing eine eigene Runde mit einem Techniker aus Zahlen an,
    die Tafel ließ „Techniker: Bot" stehen, und Späher wie Zuschauer sahen
    ihn nicht. Jetzt gilt: Brille **oder** frischer Herzschlag
    (`receive`, `kind: 'technician'`, drei Sekunden). `roomHasTechnician`
    entscheidet `lockTechnician` und ob der Start zum Gastgeber geht;
    `suitPeer` liefert die Pose des Technikers für `technicianEyes`,
    `technicianFocus` und die Karte (`worldSnapshot().player`, mit Gierwinkel
    aus der Kopfpose). `roomHasVr` bleibt die engere Frage — nur der Brille
    nimmt niemand den Anzug ab (Sperre der Techniker-Zeile, `switchRights`).
    **Und „Web 3D" steht sofort am Stock**: `init` setzt `flatTechnician`,
    wenn die Lobby Techniker + 3D sagt und keine Brille im Raum ist — vorher
    musste man erst den Reiter „Techniker" antippen, und bis dahin war man
    ein Telefon mit Schiff im Hintergrund.
  - **Kein „Ich" auf der Tafel** (`roundSetupPanel.ts`). Es stand zweimal
    dort — als Spalte, dann als Knopf je Zeile — und ist zweimal wieder weg,
    zuletzt auf ausdrücklichen Wunsch des Besitzers: „Oben die Tabs, unten
    das ‚Ich'-Feld" war dieselbe Frage an zwei Stellen. Die Tafel sagt nur
    noch, **wer** die Plätze hält und **was** jeder darf; welcher Platz der
    eigene ist, nimmt man über die Reiter — und die stehen erst über der
    Karte, nach **„Rollen testen"** (siehe „Van / Telefon"). `SetupPanelHost.me`
    bleibt nur zum Lesen („du · im Anzug"); `choose` gibt es nicht mehr.
    **Und der Anzug hat einen Namen** (`SetupPanelHost.technician`,
    `[data-setup-suit]`, aus `HauntingWorld.suitName` über `link().technician`):
    Brille und „Web 3D" kommen als Techniker herein, also zeigt die Zeile des
    Technikers dann den Namen des Menschen im Anzug („du · im Anzug" bei sich
    selbst) statt „Ich · Mensch · Bot" — nur die Lämpchen der Fähigkeiten
    bleiben. Trägt ihn niemand, stehen die Knöpfe wie bei jedem Platz.
  - **Ein Stuhl, eine Karte** (`views/seatRole.ts`, siehe oben bei den
    Fähigkeiten). Der Weg dahin: Die Zeile zum Blättern lag erst unter der
    absolut gesetzten Karte (jeder Tipp traf die Leinwand — Rot mit drei
    Fähigkeiten sah nur den Späher), dann darüber; der Besitzer wollte sie
    gar nicht: „Die Fähigkeits-Ansichten sollen nicht wechselbar sein,
    sondern direkt auf der Karte." Also liegen die drei Rollen als
    durchsichtige Schichten über der einen Karte (`views.css`,
    `.role--seat > .role { pointer-events: none }`, ihre Knöpfe und Blätter
    fangen wieder), ein Blatt nimmt die Karte wie bisher aus dem Bild, und der
    Knopf „Tafel" oben rechts hat wieder Platz (`.has-corner`).
  - **Die Zentrale sitzt im Schiff am Tisch, nicht am Spawn**
    (`world3d/commandSeats.ts`, `HauntingWorld.crewPlace`,
    `RemoteAvatars.placement`). Ein Telefon oder Bildschirm in der Zentrale
    bewegt im Schiff kein Rig; seine Pose über die Leitung ist die Stelle vom
    Betreten (`COMMAND_HOME`), und dort stand er für die Brille als Spieler
    mitten auf dem Vorplatz — mit jedem weiteren Telefon einer mehr in
    derselben Stelle. Der Wunsch des Besitzers: „nicht als Spieler gespawnt,
    sondern direkt an die Sitzplätze". Also rechnet der **Empfänger** die
    Pose: Wer kein Anzugträger ist (`wearsSuit`), ist die Zentrale; der
    Besitzer eines Geräts (`stations.seatOf`) sitzt auf dem Hocker dieses
    Geräts (`COMMAND_STOOLS` — Rot, Gelb, Blau, Monster, in den Farben der
    Reiter; dieselben Zahlen baut `buildVan`), mit dem Gesicht zum Tisch und
    sitzender Augenhöhe; wer vor dem Fernseher steht, weggeschubst ist oder
    noch kein Gerät hat, steht in der Reihe dahinter, nach Kennung sortiert.
    Vom Empfänger und nicht vom Sender, weil nur er den Tisch kennt und ein
    älteres Telefon sonst wieder am Spawn stünde; alle 250 ms neu gerechnet
    (`CREW_PLACE_RATE`), nicht je Bild. `RemoteAvatars.placement` ist der
    Haken dafür: Eine Welt gibt je Mitspieler eine Pose zurück oder `null`
    (die eigene), eine Pose mit `hidden` nimmt ihn aus dem Bild — so
    verschwindet der Avatar des **2D-Technikers**, den `showTechnician` aus
    `state.technician` ohnehin als Körper zeichnet; vorher stand er zweimal da.
    Haunting hängt den Haken in `init` ein und in `dispose` wieder aus.
  - **Ein Monster, nie zwei.** Seit dem Rechenkern (`flatKernel.ts`) gibt es
    im Schiff keinen NPC mehr: Das Monster ist eine Figur der Runde, und
    Gastgeberwechsel, 2D→3D und ein zweiter Start lassen nur den Kern los
    (`releaseMonster`) und stellen ihn neu — ein Geist, der weiterläuft und
    weiter zuschlägt, kann so nicht mehr entstehen. (`NpcDirector.update`
    läuft trotzdem über eine Abschrift der NPC-Liste, für die Welten, die
    noch NPCs haben.)
  - **Feststecken? Zurück auf den Boden** (`HauntingWorld.unstickPlayer`,
    Eintrag `haunt:rescue` in jeder Lage des Weltmenüs, Brille wie
    Bildschirm): misst, wo die Füße stehen — in einem Zimmer der Station geht
    es in dessen freie Mitte (`safeRoomSpawn`), überall sonst in die
    Einsatzzentrale (`COMMAND_HOME`); die Höhe misst `movePlayerTo` gegen
    den Boden, und ein Schutzschrank wird vorher verlassen
    (`ShipExperience.leaveLocker`, deshalb öffentlich). Die automatische
    Fallrettung der `PortalWorld` (`rescuePlayer`) bleibt daneben bestehen;
    dieser Eintrag ist für den Fall, dass man drin steckt, ohne zu fallen.
    **Versetzt werden die Füße, nicht der Ursprung des Rigs**
    (`PlayerRig.placeFeetAt`, benutzt von `PortalWorld.movePlayerTo`,
    `teleportPlayerTo`, `rescuePlayer` und dem Spawn beim Betreten): In der
    Brille ist der Ursprung die Mitte des Spielraums, und der Kopf samt
    Physik-Kapsel steht so weit daneben, wie man von dieser Mitte entfernt
    steht. `placeAt` setzte nur den Ursprung — beim Missionsstart
    (`newRound` → `movePlayerTo(spawnPoint)`) landete der Kopf damit einen
    Meter neben der Einsatzzentrale, in Wand oder Konsole, die Kapsel steckte
    fest, und die Rettung tat dasselbe noch einmal: „bugge ich im Boden fest,
    auch der Knopf hilft nicht" (Befund des Besitzers). Der Versatz wird nach
    dem Drehen zurückgerechnet, weil er sich mitdreht; am Bildschirm sitzt die
    Kamera über dem Ursprung, und nichts ändert sich. Auch `unstickPlayer`
    misst das Zimmer jetzt unter dem Kopf und nicht am Ursprung. Das Kart
    setzt weiter den Ursprung (`placeAt`, jedes Bild in den Sitz): Dort soll
    man sich im Sitz noch vorbeugen können.
  - **Van / Telefon** (`stationUi.ts`, Hochformat zuerst): **zwei Seiten,
    ein Kopf.** Der Ablauf, den der Besitzer wollte: Lobby beitreten, im
    **Aufbau** die Rollen einstellen, unten **„Rollen testen"** drücken —
    dann die Karte, und darüber genau ein Kopf.
    - Der **Aufbau** (`vanPage`, `data-page="setup"`): oben nur eine
      Überschrift („Aufbau · Rollen") und rechts drei kleine Knöpfe für
      Spielmenü, Verbindung und VR — **keine Reiter**; darunter ein Statuschip,
      die Tafel (fünf Zeilen, je Mensch/Bot/Aus und die drei Fähigkeitslampen,
      **ohne „Ich"**),
      dann **„Rollen testen"** (`[data-test-roles]`: auf die Karte, ohne dass
      etwas losgeht — **läuft im Raum schon eine Mission, heißt derselbe Knopf
      „Zur laufenden Runde"** (`[data-join]`): Wer die Seite mitten in der
      Runde neu lädt, landet hier im Aufbau, und der Weg zurück auf die Karte
      soll nicht „hell, ohne Uhr" versprechen; ein Start aus der Zentrale
      sagt dann `ROUND_RUNNING` gleich am Telefon, statt ihn an den Gastgeber
      zu schicken, der ihn nur sich selbst abwies) und **der Startknopf** (`[data-start-setup]`, beschriftet
      aus `startLabel`, darunter `describeSetup` — für den, der nicht erst
      testen will), zuletzt „Hilfe: Wer sieht was?" — ein Satz je Rolle aus
      `RoleFacts.sees`, und ein Absatz, was Test und Mission unterscheidet.
    - Die **Karte** (`data-page="live"`): erste Zeile **die Rollen als
      Reiter** (`writeBar`, `[data-me]`, gebaut aus `views/roleTabs.ts` —
      **dieselben Knöpfe im selben Panel wie im Kopf der 2D-Welt**,
      `.role-strip`) — Techniker, Rot, Gelb, Blau, Monster, _Zuschauer:
      Techniker_, _Zuschauer: Alles_, immer alle, in dieser Reihenfolge,
      zweizeilig (Platz, darunter klein, was er hält) und umbrechend statt
      scrollend — und am Ende **das Zahnrad** (`[data-options]`);
      zweite Zeile die Leiste mit Systemen, Anzug und Uhr (`writeQuest`),
      dieselbe wie beim Techniker in der 2D-Welt; darunter die Rolle aus der
      Registry. **Die Uhr läuft nur in der Mission**: Sonst steht dort
      „Test · keine Runde" (`[data-idle]`) oder „Runde vorbei" — eine Uhr, die
      vor dem Start herunterzählte, war der Befund („Aktuell zeigt er an
      ‚noch keine Runde', aber oben läuft der Timer"). Das **Zahnrad-Menü**
      (`writeMenu`, `.haunt__menu`) hat, was sich über der Karte ändert:
      **Mission starten** (`[data-start-setup]`, solange keine läuft) oder
      **Mission stoppen** (`[data-stop-round]` → `StationHost.stopRound`),
      **Zurück zu den Rollen** (`[data-setup]`: der Aufbau), und die drei
      Knöpfe der Seite (Menü, Verbindung, VR). `StationUi.goSetup()` holt den
      Aufbau von außen — die 2D-Welt ruft es, wenn sie mit „Zurück zu den
      Rollen" zugeht.
    - Weg sind: der Reiter _Aufbau_, das „Ich" der Tafel, die zweite Reihe
      Werkzeugknöpfe über der Karte, der Titel „ORBITAL / EINSATZZENTRALE",
      die Geräteliste `.lobby__seats`, das Segment 2D|3D, die
      Absichts-Kacheln und die Hilfe „Eure Dreiercrew". Die **Kopfzeile der
      Seite** (`index.html`, `#hud`) ist auf dem Telefon ausgeblendet
      (`haunting.css`, `body.haunt-on #hud`) — nur versteckt, nicht abgebaut:
      Die Knöpfe im Aufbau und im Zahnrad drücken ihre Knöpfe stellvertretend.
  - **Rollenwechsel über die Reiter**: Ein Tipp auf einen Platz **nimmt**
    ihn (`stationUi.choose`) — die Lobby merkt sich `me`, der Platz wird
    „Mensch", man sitzt an seiner Station, der alte Platz wird frei; der Name
    der Mischung seiner Fähigkeiten steht in `StationUi.roleLabel`
    (`seatTitle`). „Rollen testen" ist derselbe Tipp mit dem gemerkten Platz.
    **Der Reiter „Techniker" setzt an den Stock** (`StationHost.technician` →
    `HauntingWorld.takeStick`): Auf der Karte von oben öffnet sich sofort die
    2D-Welt — **im Test-Zustand** (unten) —, im Schiff wird man der
    Desktop-Techniker; die Brille rührt niemand an (`VR_KEEPS_TECHNICIAN`).
    **Läuft im Raum schon eine Mission, steigt der Reiter in sie ein**: Der
    Stand, den der Gastgeber ansagt (`adopt`), reist als `FlatResume` in die
    2D-Runde — derselbe Weg wie von 3D nach 2D —, und die Bücher (Riegel,
    Spuk, Wunde, Gedächtnis) kommen mit der Übergabe des alten Gastgebers
    nach (`flatResumed`, `takeFlatHandover` → `FlatRound.loadBooks`; das
    Lampenbudget führt weiter die Welt). Bis hierher machte der Reiter aus
    einer laufenden Mission einen frischen Test auf derselben Station, der
    als neuer Stand an alle ging — wer mitten in der Runde die Seite neu
    geladen hatte, konnte nicht zurück, sondern nur allen die Runde nehmen.
    Trägt schon jemand anders den Anzug, gibt es dieselbe Absage wie beim
    Öffnen (`FLAT_OCCUPIED`), bevor das Monster losgelassen wird.
    Mitten in der Mission entscheidet `switchRights`, ob das geht;
    wer nicht darf, bekommt den Grund als Meldung. **Gesperrt ist nur, wer im
    Schiff den Anzug trägt** (`inShip`: der Techniker am Bildschirm in der
    Ansicht 3D, `SHIP_KEEPS_ROLE`) — die Zentrale, das Monster am Telefon und
    der Techniker auf der Karte wechseln immer; bis hierher wechselte mitten
    in der Mission nur die Zentrale, und der Besitzer wollte es anders: „Wenn
    ich nicht VR oder 3D bin, will ich die Rollen immer wechseln können."
    Wer nichts hält, liest
    „Bitte wähle über den Tab oben deine Rolle aus." (`NO_ROLE_HINT`). Fernseher und Monster sind keine Fähigkeiten — wer dorthin geht, legt die
    Zentrale ab.
  - **Der Test-Zustand** — vor der Mission und nach dem Stopp
    (`FlatOptions.phase` `'briefing'`, `FlatRound.live`, in 3D
    `HauntState.phase === 'briefing'`): Der Techniker läuft in einer
    **hellen** Station herum (2D: jede Lampe steht in `lit`; 3D:
    `applyLights` behandelt `briefing` wie Testlicht), die Schalttafel
    schaltet Türen und Lampen — die **Türen mit denselben Fristen wie in der
    Mission** (`rules/doorLocks.ts`: ein Riegel, gehalten bis zum Ablauf, die
    nächste wartet, danach Abkühlung mit Balken und Blinken), die **Lampen
    ohne Budget** (`FlatRound.switchLight`, `HauntingWorld.flipLampPlain`)
    —, ein Mensch am Steuer darf das Monster
    bewegen (`FlatRound.driver`), aber die **Routine steht still**, niemand
    wird getroffen, kein Spuk, keine Uhr, und jeder darf jede Rolle
    (`RoleStripHost.rights`). Die Uhr des Standes (`time`) läuft trotzdem
    weiter — Wellen und Spuren hängen an ihr —, gezeigt wird sie nur in der
    Mission. **„Mission starten"** (Zahnrad auf dem Telefon, Tafel des
    Technikers oder der Knopf im Aufbau) baut die Runde **auf derselben
    Station** neu (`HauntingWorld.startMission`, `phase: 'running'`: Uhr null,
    Licht aus, Monster am anderen Ende); **„Mission stoppen"**
    (`HauntingWorld.stopRound`, `net.stopMessage`/`readStop` für den, der
    nicht rechnet) führt zurück in den Test.
    **Kein Bot auf einem Menschenplatz** (`shipStart` → `SHIP_NEEDS_TECHNICIAN`):
    Steht auf der Tafel „Techniker: Mensch" und niemand hat den Reiter
    genommen, läuft kein Techniker aus Zahlen, und die Mission startet nicht,
    bis jemand den Stock nimmt oder die Tafel den Platz einem Bot gibt; der
    Satz nennt beides. Der Schalter „Zuschauen"
    gibt den Stock dagegen ausdrücklich ab und schreibt dafür „Techniker:
    Bot" auf seine Tafel (`setWatching`).
  - **Brille** (`HauntingWorld.menu`): dieselben drei Absichten zuerst, dann
    „Zur Zentrale / Rolle wechseln", dann „Ansicht: 3D Schiff" (fest), dann die
    Einstellungen (Testlicht, Räume, die fünf Plätze `haunt:seat-<platz>`,
    das Untermenü _Fähigkeiten der Plätze_ `haunt:power-<platz>-<fähigkeit>`,
    Gegner).
  - **Techniker am Desktop** (`ShipExperience.paintDom`, `.orbital-player`):
    dieselben drei Absichten als Knöpfe (`data-action="intent:…"`), darunter
    `describeSetup`, dann Karte und Gegner. Das Panel sitzt oben links am
    oberen Rand (`--orbital-top`), unter dem Kompass, solange es ihn gibt
    (`.has-compass`, `--orbital-head`), und weicht dem offenen Weltmenü
    (`dom.hidden`). **Es ist so hoch wie sein Inhalt**: Bis hierher stand dort
    `bottom: 16px`, und der Kasten reichte auch mit drei Zeilen darin bis zum
    unteren Bildrand — auf dem Telefon lag die halbe Station hinter dunklem
    Glas. Jetzt begrenzt ihn `max-height` nach unten (`--orbital-gap`: 16 px,
    212 px über Stock und Knöpfen). **Und er lässt sich zuklappen**
    (`data-action="fold"`, `ShipExperience.folded`, `.is-folded`): Zu bleiben
    die Titelzeile — Anzug, Systeme, Sauerstoff — und die zwei Knöpfe, die
    wieder hinausführen; welche Klappen darin offen standen, merkt sich das
    Panel (`mainOpen`, `testsOpen`). Oben im Panel steht **⚙ Optionen**
    (`data-action="options"`, `ShipExperience.showOptions`) und klappt das
    Optionsmenü des Schiffs auf — nur im Browser, nie in der Brille. Wo es
    liegt, sagt `haunting.css` (`.flat.orbital-options`, `.flat__panel`,
    `.flat__note`; bis Paket H stand das in `map/flat.css`).
  - **Das Optionsmenü** (`map/optionsMenu.ts`): Was ein Optionsmenü _ist_ —
    Überschriften, Hinweise, Knöpfe mit `data-*`-Schlüssel (`OptionItem`) —
    und wie es gezeichnet wird (`renderOptions`, aus den Bausteinen `ui-head`
    und `ui-option` in `ui/widgets.ts`), steht einmal dort; die festen Namen
    in `SHARED` (`watchKey`, `soundKeys`, `leaveKeys`). Das Schiff
    (`ShipExperience.shipOptions`) baut daraus: Zuschauen an/aus (= Bot-Runde),
    in der Bot-Runde das Tempo, Aufmachen (Zentrale, Menü, Verbindung, **VR**),
    Ton, Runde verlassen, Weiterspielen. Menü, Verbindung und VR drücken die
    Knöpfe der ausgeblendeten Kopfzeile (`pressPageButton`) — seit sie im
    Schiff aus ist, ist dieses Menü der einzige Weg dorthin. Die losen Knöpfe
    „Rolle wechseln", „2D von oben" und „Missionsmenü" sind darin aufgegangen;
    „Ansicht: 2D ↔ 3D" (`switchViewKey`) ist mit der gemalten Karte gegangen.
- **Knöpfe und Panels sind Bausteine, keine Handarbeit** (`ui/dom.ts`,
  `ui/widgets.ts`, `ui/widgets.css`). Haunting hat viele davon — das
  Zahnrad-Menü der 2D-Welt, das der Zentrale, die Linse des Zuschauers, die
  Tafel der Verteilung, die Rollenreiter, die Raumakte, das Rätsel, die Tafel
  des Technikers im Schiff —, und lange baute jede Stelle ihren Knopf selbst:
  sechs Kopien derselben `el()`-Hilfe, fünfmal `strong` + `small` + `data-*`
  - `is-active` + `aria-pressed` von Hand, drei Toasts mit eigener Uhr, und im
    CSS derselbe Kasten fünfmal. Jetzt steht jedes davon **einmal**:
  * `ui/dom.ts`: `el(tag, klasse, text)` (immer `textContent`, nie
    `innerHTML` — hier gehen Spielernamen durch), `clickedKey(event)` (der
    `<button>` über dem Klickziel) und `setData(node, { watch: '' })`.
  * `ui/widgets.ts`: `key(klasse, spec)` — ein Knopf, entweder `{ text }` als
    eine Zeile oder `{ label, sub }` als Name groß und Zeile klein, dazu
    `data`, `active`, `pressed`, `disabled`, `title`, `ariaLabel`;
    `optionKey` (der Listenknopf `ui-option`, mit `tone: 'go' | 'leave'` für
    den grünen und den roten Rand) und `pillKey` (die Pille `ui-pill`);
    `captioned(caption, value)` / `labelled(label, sub)` für die Knöpfe unter
    dem Daumen (`monster__key`); `note(ton, titel, text)` (die
    Kachel `ui-note`, drei Töne), `fact(begriff, wert, { warn, valueClass })`
    (die Zeile `ui-fact`), `head(titel, beisage)` (die Überschrift `ui-head`)
    und `Toast` (`say(text, ton)`, `step(dt)`, leer unsichtbar).
  * `ui/widgets.css`: die **Form** — `ui-panel`, `ui-head`, `ui-option`,
    `ui-pill`, `ui-note`, `ui-fact`, `ui-toast`. Die **Lage** und der Ton einer
    Stelle stehen weiter in ihrem Blatt, als zweite Klasse neben der von hier
    (`ui-panel flat__panel`, `ui-toast monster__toast`); jedes dieser Blätter
    (`views.css`, `monster.css`, `haunting.css`) bindet
    `widgets.css` per `@import` **zuerst** ein, damit bei gleicher Spezifität
    die Zeile der Stelle gewinnt. Die Kachel nimmt in der Zentrale die Farben
    der Station über `var(--haunt-*, fallback)`.

  Die Regel daraus: Wer in Haunting einen Knopf, eine Kachel oder einen Kasten
  braucht, nimmt ihn von hier und gibt ihm seine Lage-Klasse mit — und legt
  keinen neuen `el()` und keinen neuen `.xy__option` an. Was im Test steht
  (`ui/widgets.test.ts`): die beiden Bauweisen des Knopfs, dass ohne Zeile kein
  leeres `small` entsteht, Schlüssel und Zustände, die Klassenlisten von
  `optionKey`/`pillKey`, die Reihenfolge von `captioned`/`labelled`, und dass
  der Toast nach `TOAST_SECONDS` Text **und** Ton wieder ablegt.

- **Jede Rolle meldet sich selbst an** (`registry/roles.ts`,
  `views/*.register.ts`, `monster/monster.register.ts`). `stations.ts` ist
  seither nur noch die **Sitzordnung** — welche Stühle es gibt, wem einer
  gehört, wie lange der Weg zum nächsten dauert; Name, Zeile und „Sieht:"
  stehen bei der Rolle. `stationUi.ts` zeichnet nur den Rahmen (Kopfzeile,
  Auftragsstreifen, Geräteübersicht) und hängt die Ansicht aus der Registry
  darunter; ein `if (station === …)` je Rolle gibt es dort nicht mehr. Eine
  neue Rolle braucht **keine Zeile** in `stationUi.ts`, `stations.ts` oder
  einer Union — nur eine eigene Datei.
- **Die drei Nicht-VR-Rollen sind Karten** (`views/`), dieselbe `MapView`
  (`map/mapView.ts`), jede mit eigenen Schichten. Was eine Rolle
  **nicht** sieht, steht deshalb nicht in einem Kommentar, sondern in ihren
  Layern — mit Test:
  - **Archiv** (`views/archiveRole.ts`): die ganze Station mit Fracht,
    Konsolen und Möbeln, `entities: false` — und `lights: false`: Ob es
    irgendwo hell ist, sieht der Techniker selbst. **Was er wann sehen darf,
    rechnet `rules/archiveGoals.ts`**: die **Kiste immer**, mit dem Namen des
    Teils daran; das **Ziel erst, wenn der Techniker das Teil trägt** — dann,
    und nur dann, gibt es die gestrichelte Linie, das „hierher" an der Konsole
    und den Freigabecode in der Akte; ein **abgelegtes Teil** erst nach
    `DROPPED_SEEN` = 5 s (`HauntState.dropped`). Vorher zog die Karte von
    jeder Kiste eine Linie zu ihrer Konsole, und der Archivar sagte die ganze
    Runde in einem Satz an. Ein Tipp auf ein Zimmer schlägt die **Raumakte**
    auf — **ganzseitig, ohne Karte dahinter** (`is-sheet`, „Karte" bringt sie
    zurück), und sie rollt: Codes groß, Fundhinweis, Türen — dazu ein Bild des
    Raums. In 3D ist das ein **Loch**, in das `HauntingWorld.render` die
    Draufsicht der wirklichen Welt zeichnet, mit Zoom und Wisch
    (`views/archiveDesk.ts` über `RoleHost.extra`, `archiveView.ts` für die
    Anschläge). Die Missionsliste ist
    weg: Sie zählte auf, was die Karte zeigt.
  - **Schalttafel** (`views/panelRole.ts`, Kennung `hack`): der Grundriss
    ohne Wesen. **Tür antippen** sperrt oder gibt frei, **Lampe antippen**
    schaltet Licht — die Lampe ist ein Kreis in der Zimmermitte, gelb
    ausgefüllt, wenn sie brennt, sonst ein grauer Ring (`map/mapView.ts`,
    mindestens fünf Punkte Radius, damit der Daumen ihn trifft). Einen
    Schallköder gibt es nicht mehr. **Und keine Schalterliste mehr**: Das
    Blatt „Tafel" mit den Kippschaltern ist gestrichen — der Besitzer wollte
    es nicht („diese Ansicht direkt löschen"); wer die Fähigkeit hat, tippt
    direkt auf die Karte. Was die Liste sagte, sagt jetzt der Tipp: Ein
    **abkühlendes Schott** antwortet „Der Riegel ist noch warm."
    (`rules/doorLocks.ts`, `LOCK_COOLDOWN` = 40 s), und wofür es keinen
    Schalter gibt, sagt die Ansicht ebenfalls. Geschaltet wird weiterhin über
    die Tafel aus `panel.ts` (`HauntingWorld.panelSwitch` sucht den Schalter
    mit diesem Ziel; die Liste gibt der Wirt über `RoleHost.switches`) — **und
    die Tafel ist vollständig**: Jede Tür und jede Lampe hat ihren Schalter
    von Anfang an. Die Hälfte lag lange hinter dem Sicherungskasten
    (`hideHalf`, `visibleSwitches`, `HauntState.fuse`); in der 2D-Welt legte
    ihn nie jemand um, im Schiff erst die erste Reparatur, und wer die
    Fähigkeit hielt, bekam für das Licht im Upper Engine oder das Schott zum
    Reaktor-Ostgang „dafür gibt es keinen Schalter". Der Besitzer nannte das
    einen Fehler, und die Verzahnung ist weg: Knapp halten die Tafel jetzt
    Riegel und Lampenbudget, nicht eine fehlende Hälfte. `HauntState.fuse`
    bleibt im Protokoll stehen (die Sicherung ist weiter ein Gegenstand auf
    der Karte), nur hängt kein Schalter mehr daran.
  - **Späher** (`views/scoutRole.ts`): alle `PING_PERIOD` = 3,5 s **eine
    Peilung** — ein grüner Punkt für den Techniker, ein roter für das Monster,
    genau dort, wo sie in dem Moment waren. Dazwischen verblassen sie und
    **wandern nicht mit**: Ein interpolierter Punkt wäre eine Verfolgung, und
    damit wäre Verstecken kein Mittel mehr, sondern ein Umweg. Der alte
    Radarschirm mit dem laufenden Punkt ist genau deshalb weg.
    Der **Zuschauer** (`views/watchRole.ts`) ist die einzige Rolle ohne eigene
    Karte: `surface: '3d'`, sein Bild ist das Puppenhaus aus der 3D-Welt. Über
    seine **Linse** (`watchLens.ts`) schlüpft er in jede andere Rolle — Deck,
    Archiv, Schalttafel, Späher, Monster (keine Drohne) —, und zwar in **deren**
    angemeldete Ansicht, nicht in einen Nachbau: Er schlägt sie aus der Registry
    auf, mit einem Wirt, dessen `door`
    und `light` `''` zurückgeben und nichts tun. Dazu „wem folgen?" (Techniker /
    Monster / frei, nur über dem Deck) und **KI-Absichten** an/aus — das Overlay
    aus Paket M4, das es nur hier gibt (`HauntingWorld.insightWanted` fragt
    `StationUi.watchLens`). `StationUi.shownStation` sagt der Welt, welche
    Kamera sie ausrichten soll.
- **Die Reiter der Rollen** (`views/roleTabs.ts`, `views/roleStrip.ts`)
  bleiben der Kopf über der Karte des Telefons: sieben Reiter, gelb umrandet,
  wer man ist; **gewechselt wird immer** (`RoleStripHost.rights` →
  `switchRights`: gesperrt ist nur, wer im Schiff den Anzug trägt — der
  Techniker am Bildschirm mitten in der Mission, `inShip`). Der Streifen über
  der gemalten 2D-Szene ist mit ihr gegangen.
- **Die Drohne ist gestrichen** — Rolle, Ansicht, Körper, Kamera, Flug,
  Netznachricht (`kind: 'drone'`) und CSS. Übrig geblieben sind die
  **Wegtypen**: `droneRoute.ts` heißt heute `navmesh/route.ts` (Paket `nav`)
  und trägt `RoutePose`/`RoutePath` samt `stepAlong` für den Modelltechniker
  und das Monster. Was nur sie hatte — Flughöhe, Öffnungswinkel, Lampenladung,
  Wechselsperre, `DRONE_PROFILE` —, ist weg.
- Stationen: Archiv, Schalttafel (`hack`), Späher (`scout`), Zuschauer
  — und **Monster** (`stations.ts`, `monster/`): ein Telefon spielt das
  Monster, während der Techniker im Schiff spielt. Die Ansicht
  ist `monster/monsterView.ts` (Karte aus Monstersicht, Stock, **ein** Knopf);
  das Telefon schickt `{kind:'monster'}` (Stock, Zähler für Interagieren,
  Klappenziel; das Feld `attack` steht nur noch für alte Gastgeber im
  Protokoll) zehnmal je Sekunde an den Gastgeber
  (`monster/netMonsterPort.ts`), der sie über `monster/netMonsterControl.ts`
  als `MonsterDriver` in derselben `decide`-Form wie die Routine ausführt —
  in 3D über `HauntingWorld.monsterDriver` (der NPC läuft dann geradeaus auf
  das Ziel, kein Rasterweg je Bild), in 2D als `FlatRound.driver`. Zähler
  statt Tastenzustände, damit bei 10 Hz kein Druck verloren geht oder doppelt
  wirkt; das erste Paket ist nur Abgleich, ausstehende Drücke ≤ 3; ohne
  Nachricht seit 3 s übernimmt die KI. Die gemeinsame Übersetzung von Stock
  und Knopf liegt in `monster/monsterHelm.ts`.
  **Zuschlagen ist kein Knopf.** Wer in Reichweite steht, wird getroffen — von
  der KI wie von einem Spieler am Steuer (`FlatRound.tick`, `CONTACT`). Der
  Knopf davor verlangte, im Moment der Berührung zu tippen, und in diesem
  Moment schaut niemand auf seine Knöpfe. **Der eine verbliebene Knopf gilt
  immer dem nächsten Ding** (`monsterHelm.nearestTarget`): Klappe, Kabine oder
  gesperrte Tür, nur eines auf einmal — und genau dieses hebt die Karte als
  pulsierenden Ring hervor (`MapViewOptions.highlight`), damit man weiß, was
  der Knopf tut, bevor man ihn drückt. Kabinen darf das Monster überall
  aufreißen, nicht nur die, in der der Techniker steckt.
  Sichtbarer Header für Rollenwechsel; keine Navigation über die FPS-Anzeige.
- Archiv hat **Räume & Codes** und **Aufträge** — und **zwei Ebenen statt zwei
  Größen**: oben die _Karte_ (die Draufsicht des aufgeschlagenen Zimmers als
  Kachel, darunter die Räume zum Antippen und die Liste „Gesucht"), und ein
  Tipp auf einen Raum **ersetzt** die Karte durch dessen Akte, ganzseitig, mit
  einem Knopf zurück. Vorher lag die Akte als Überbau über einem Vollbild —
  und unter `.is-view` ist der Überbau ausgeblendet, bis der Menüknopf ihn
  holt, den der Archivar nicht hat: Er saß vor einem Grundriss **ohne
  Rollbalken** (Befund des Besitzers). Die Kachel hängt jetzt an `.is-chart`,
  `viewport()` gibt es **nur auf der Karte**, `headroom()`=0.
  Ein Raum zeigt echte orthografische 3D-Geometrie ohne Decke als 2D-Draufsicht,
  dazu Sci-Fi-Farbton, Codes, Fundorte und Reparaturhinweise — **aber keine
  Lampen**: Die Deckenscheiben liegen knapp unter der Schnittebene und werden
  für den Archivar ausgeblendet (`HauntingWorld`, `lamps`), denn ob es hell
  ist, sieht der Techniker selbst. **Das Blatt
  führt alle Kisten des Raums** mit Kennzeichen und Wand (`CargoSlot.clue`),
  die richtige als „Fundort" markiert — den Inhalt der anderen nennt es
  nicht, sonst hätte das Suchen kein Risiko mehr.
  **Was er wann weiß, ist eine Regel** (`rules/archiveGoals.ts`,
  `archiveGoals(spec, state)`): Die **Kiste** steht von der ersten Sekunde an
  auf dem Blatt, die **Konsole** — Raum, Reparaturhinweis, Freigabecode —
  **erst, wenn der Techniker das Teil in der Hand hat**. So gibt es zweimal
  etwas zu funken statt einmal, und das zweite Mal ist genau der Moment, in
  dem der Techniker fragt. Im Reiter **Aufträge** steht
  der Fundort in einer Zeile (Raum · Kennzeichen · Wand): Sitzt hier ein
  Mensch, sieht der Techniker nur den Raum leuchten (`goalPrecision`), und
  diese Zeile ist das, was er ansagen muss. Das Kennzeichen ist auch in der
  Draufsicht zu sehen — Farbband und Nummer stehen am Modell selbst.
  **Ein abgelegtes Ersatzteil meldet das Blatt erst nach `DROPPED_SEEN` = 5 s**
  (`HauntState.dropped`) — wer es im Vorbeigehen umgreift, hat es nicht
  verloren; wer es stehen lässt, schon.
  **Keine Gesamtkarte, keine Live-Kreaturen und kein Journal.**
  Masken grenzen Nachbarräume aus.
  `archiveMap.ts` bleibt ein unbenutztes Altmodul und darf nicht wieder in die
  Archiv-UI eingebaut werden.
- Kontrolle hat **Radar & Anzug** und **Schalttafel**; Radar berücksichtigt
  die echten Stationsbounds/Gänge. DOM/Canvas aktualisiert gedrosselt.
  **Die Tafel kennt zwei Sorten Schalter: Licht und Schott** (`panel.ts`). Die
  dritte — **Schallköder**, ein Radio je zwei Zimmer, das das Monster anlockte
  — ist weg, samt `HauntState.loud` und allem, was es las. Sie war der einzige
  direkte Griff der Tafel an das Monster und genau deshalb falsch: Wer den
  richtigen Knopf gefunden hatte, parkte das Vieh in einer Ecke, und der Rest
  der Runde fand ohne es statt. `STATION_PROTOCOL` bleibt trotzdem **8** — ein
  altes Gerät, das `loud` noch mitschickt, wird gelesen wie eines, das es
  weglässt: Der Leser kennt das Feld nicht mehr, und keine Regel hängt daran.
  **Die Schalter sind doppelt so groß** (`views/views.css`, `.role__switch*`):
  eine ganze Zeile je Schalter statt zwei Spalten, ≥ 64 px hoch, Kippschalter
  58 × 32 px — das Maß ist ein hochkant gehaltenes Telefon und ein Daumen, der
  im Dunkeln nicht den Nachbarn treffen soll. Die Regeln stehen bei der Rolle
  (`views/`) und nicht mehr im Telefon-Rahmen (`stationDashboard.css`): Die
  Tafel läuft auch über der 2D-Welt, wo es keine Einsatzzentrale gibt.
- **Der Zuschauer ist ein Platz und kein Fenster mehr** (`watchLens.ts`,
  `views/watchRole.ts`). Er war das ganze Deck von schräg oben und sonst
  nichts; jetzt stehen dort zwei Fragen und ein Schalter:
  - **Wessen Platz?** — Deck, Archiv, Schalttafel, Späher, Monster (die
    **Drohne ist gestrichen**). Gewechselt wird **mitten in der Runde**, und
    gewechselt wird nur das _Bild_: `StationUi.shownStation` sagt der Welt,
    welche Kamera das Fenster füllt (`HauntingWorld.render`), der Platz bleibt
    `watch`. Gezeigt wird dabei **die angemeldete Ansicht dieser Rolle** aus
    der Registry und kein Nachbau — es gibt keine zweite Schalterliste und kein
    zweites Archivblatt, die auseinanderlaufen könnten. Bedienbar ist davon
    nichts: Der Wirt, den sie bekommt, gibt auf `door` und `light` `''`
    zurück, und das Steuer des Monsters bleibt `null` — ein Stock, der nichts
    bewegt, ist eine Zusage, die das Spiel nicht einhält. Wie viel von der
    Linse über dem fremden Bild liegt, entscheidet der Knopf „Blick" oben
    rechts.
  - **Wem folgen?** — Frei, Techniker, Monster (`aimShow`,
    `WATCH_FOLLOW_SPAN` = 9 m). „Frei" ist das ganze Deck wie bisher; sonst
    zieht die Kamera weich nach (`showFocus`, `lerp` 0,18), weil der Stand nur
    zehnmal je Sekunde ankommt.
  - **Fliegen und Zoomen** (`WatchLens.zoom`, `WatchLens.pan`, `zoomedLens`,
    `pannedLens`, `homedLens`): Über dem Deck fliegt der **Stock** links
    unten (`map/joystick.ts`, `FLY_SPEED` = 14 m/s bei Zoom 1, herangezoomt
    langsamer) oder **ein Finger** auf dem Loch, **zwei Finger** und das
    **Mausrad** zoomen (`ZOOM_MIN` 1 = das ganze Deck bis `ZOOM_MAX` 8 = ein
    Zimmer), „Zurück über das Deck" vergisst beides. Wer jemandem folgt,
    fliegt neben ihm her und bleibt an ihm hängen. Die Gesten liegen auf dem
    Loch (`role__hole`), die Knöpfe daneben behalten ihre Klicks.
  - **Durch seine Augen** (`WatchLens.eyes`, `throughEyes`,
    `HauntingWorld.technicianEyes`): das Live-Bild des Technikers, dem man
    folgt — die Kamera steht in seinem Kopf. Drei Quellen wie bei
    `technicianFocus`: die Brille schickt ihre ganze Kopfpose
    (`PeerPose.head`, Ort **und** Drehung), Modelltechniker und 2D-Techniker
    nur Ort und Gierwinkel (Augenhöhe `EYES_HEIGHT` 1,6 m, geradeaus). Dabei
    bleibt die Decke dran, der Nebel an und das Tageslicht des Puppenhauses
    aus — man sieht, was er sieht (`EYES_FOV` 78°). „Zuschauer: Einzeln"
    fängt damit an (`stationUi`: `{ follow: 'technician', eyes: true }`),
    „Zuschauer: Alles" frei über dem Deck.
  - **KI-Absichten** — das Overlay aus M4, siehe oben. Nur hier, nie für einen
    Spieler.
    **Der Techniker aus der 2D-Welt bekommt dabei einen Körper**
    (`HauntingWorld.showTechnician`, `shipArt.buildCrewmate`): Seine Pose steht
    seit Protokoll 7 im Stand (`HauntState.technician`), gezeichnet wurde sie in
    3D nie — am Fernseher sah man eine leere Station, in der Türen von selbst
    aufgingen. Er steht dort, wo der Stand ihn hinsetzt, läuft die
    Schrittanimation nur bei `moving` und verschwindet im Schutzschrank und im
    Schacht.
- **STATION_PROTOCOL=8**: der Stand trägt jetzt die zerstörten Kabinen
  (`destroyed`, seit 6), die Fahrtphase des Monsters (`ride`) und den
  2D-Techniker (`technician`, seit 7); dazu die Nachricht `monster`. **Seit 8
  auch die Ghost-Marker** (`ghosts`, `rules/ghosts.ts`): wo jede Seite die
  andere zuletzt gesehen hat — Stelle, Blick und Zeitpunkt, gesetzt beim
  Sichtkontakt und danach stehenbleibend, bis der nächste ihn versetzt. Sie
  stehen im Stand und nicht bei dem, der gerade hinsieht, weil jedes Gerät sie
  braucht: der Techniker den des Monsters, das Monster-Telefon den des
  Technikers, der Zuschauer beide. Ein Stand ohne `ghosts` wird als „noch
  niemand hat jemanden gesehen" gelesen, nicht als Fehler; die Deckkraft
  rechnet für alle Darstellungen dieselbe Formel (`ghostAlpha`, voll bis
  `GHOST_TTL` − `GHOST_FADE`, dann linear aus, ab `GHOST_TTL` = **10 s** weg —
  es waren einmal 25, und das war ungefähr die Zeit, in der jemand die halbe
  Station durchquert: Der Punkt zeigte einen Gegner an einer Stelle, an der
  schon zwei Zimmer lang keiner mehr war, und man gewöhnte sich an, ihm zu
  glauben). **Gezeichnet wird er über der Dunkelheit**, nicht darunter: Eine
  Erinnerung steht im Kopf dessen, der hinsieht, und der weiß auch im Finstern
  noch, wo der andere zuletzt stand — vorher lag sie unter dem Dunkelfeld und
  war genau dann unsichtbar, wenn sie gebraucht wurde.
  **Die Blutspur reist als optionales Feld mit** (`blood`, `rules/blood.ts`) —
  **ohne** Versionssprung, und das ist eine Entscheidung und kein Versehen: Die
  Version steigt für ein Feld, von dem die Gegenseite _abhängt_. Bei `ghosts`
  war das so; an der Blutspur hängt beim Empfänger **keine Regel**. Der
  Gastgeber sucht die Fährte in seiner eigenen Spur und entscheidet daraus das
  Verhalten des Monsters, alle anderen **malen** sie nur. Ein Gerät der
  Version 8 ohne das Feld sieht keine Tropfen und spielt ansonsten dieselbe
  Runde — ein fehlendes Bild, kein Auseinanderlaufen. Über die Leitung gehen
  nur Ort und Zeit je Tropfen, höchstens `DROP_LIMIT` 48 Stück.
  Alte Clients werden abgewiesen; nach Update **alle Geräte neu laden** —
  ein Telefon der Version 7 sieht sonst gar nichts mehr.
  **Die Übergabe beim Gastgeberwechsel hat die Version nicht bewegt**
  (`net.handoverMessage`, siehe „Spielhost"): Sie ist eine eigene
  Nachrichtensorte und kein Feld im Stand — ein Gerät, das sie nicht kennt,
  liest sie schlicht nicht und erbt wie bisher eine Runde ohne Buchführung.
  Das ist eine fehlende Erinnerung, kein Auseinanderlaufen.
  **`dropped` kam ohne Sprung dazu** (`rules/archiveGoals.DroppedPart`): die
  Ersatzteile, die im Gang liegen, je mit Ort und Zeitpunkt. Ein Stand ohne
  das Feld heißt „es liegt nichts" — das ist die Wahrheit, die ein älteres
  Gerät ohnehin annimmt, und kein Grund, es auszusperren. Die Schwelle
  (`DROPPED_SEEN`) rechnet jedes Gerät selbst aus `state.time`, damit alle zur
  selben Sekunde zum selben Schluss kommen.
  Nur Host-Snapshots übernehmen, endliche begrenzte Werte validieren.
  Schalter nur vom Besitzer der Schalttafel, Monstersteuer nur vom Besitzer
  der Monster-Station. **Die Tafel und der Start dagegen von jedem im Raum**
  (`setup`, `start` — `net.readSetupMessage`, `net.readStart`; beide gehen
  durch `rules/roundSetup.readSetup`, denselben Leser wie der
  Browser-Speicher): Wer in der Lobby sitzt, darf die Verteilung stellen und
  die Runde anwerfen, das ist der Sinn der Lobby. Der Gastgeber wendet an, und
  sein Stand trägt die Tafel als optionales Feld `setup` zurück
  (`stateMessage(state, setup)`, `readSharedSetup`) — ohne Protokollsprung,
  denn wer das Feld nicht kennt, behält seine eigene Tafel wie bisher.
  **Später dazukommen geht immer**: Der Gastgeber sagt den ganzen Stand
  viermal je Sekunde an alle, ein neues Gerät baut daraus Haus, Runde und
  jetzt auch die Tafel und nimmt sich über die Reiter einen freien Platz
  (`switchRights`: aus der Zentrale heraus jederzeit, den Techniker in der
  Brille nie). Eine Brille, die später dazukommt, wird Gastgeber und bekommt
  die Übergabe (`handover`).
- **Spielhost: Gastgeber ist, wer Techniker ist** (`net.pickGameHost`) — in der
  Brille, am Desktop oder auf der Karte von oben, das ist dieselbe Rolle in drei
  Ansichten; unter mehreren Technikern entscheidet die Standzeit, ohne jeden
  Techniker der älteste Peer. Die Regel hieß lange „VR-Techniker", weil es ihn
  nur dort gab; seit er die Ansicht **mitten in der Runde** wechseln darf, wäre
  ein Gastgeber, der an der Ansicht hängt, einer, der beim Umschalten wegfällt.
  Desktop-Techniker meldet sich im Haunt-Channel.
  **Wechselt der Techniker, wird übergeben** (`net.handoverMessage`,
  `HauntingWorld.handOver` / `takeHandover`): Der alte Gastgeber schickt dem
  neuen — an ihn gerichtet, `to` — den ganzen Stand **und die Buchführung, die
  sonst nie auf der Leitung liegt** (`HauntBooks`: `DoorLocks`, `Lamps`, Spuk,
  die offene Wunde aus `rules/blood.ts` und das Gedächtnis des Monsters als
  kompaktes `MonsterBook` — die letzten Sichtungen und die abgesuchten Räume,
  nachgespielt über `loadMemory`, nicht in die Innereien geschrieben). Eine
  **eigene** Nachricht und kein größeres `state`: Sie geht einmal beim Wechsel
  und nicht viermal je Sekunde an alle. Der neue Gastgeber rechnet
  `HANDOVER_WAIT` = 2 s lang **nicht**, bis sie da ist (`waitingHandover`) —
  sonst rechnen für einen Augenblick beide —, und ein Stand mit **älterer Zeit**
  als der eigene wird verworfen (`stale`: gleicher Seed, beide `running`).
  Bleibt die Übergabe aus (zugeklappter Laptop), läuft die Runde nach der Frist
  trotzdem weiter. **`STATION_PROTOCOL` bleibt 8**: `handover` ist eine neue
  Nachrichtensorte, die ein älteres Gerät schlicht nicht liest — es erbt dann
  wie bisher eine Runde ohne Buchführung, läuft aber nicht auseinander.
  `?net=local` ist BroadcastChannel zwischen Tabs; WLAN/
  Internet verwenden öffentliche Signalisierung/STUN, kein garantierter TURN.
- **Die Ansicht wechselt der Kern, mitten in der Runde** — _Menü →
  Ansicht_, ohne dass diese Welt etwas tut: Der Stand ist ein Datenobjekt
  (`HauntState`), der Kern rechnet weiter, nur die Kamera ist eine andere
  (`core/TopDownCamera.ts` über dem Gestell, `KernelLocomotion` fängt den
  Wunsch aus `FlatControls` genauso ab wie den aus der Brille). Bis Paket H
  war das `HauntingWorld.switchView('2d' | '3d')` mit `enterFlat`/`leaveFlat`
  — die 2D-Runde wurde aus dem laufenden Stand aufgebaut (`FlatResume`), die
  Bücher (`HauntBooks`) gingen als Abschrift hinüber und zurück; dieselbe
  Naht (`books`, `loadBooks`, `FlatRound` mit `resume`) ist heute die der
  **Übergabe** zwischen Gastgebern und wird als solche geprüft
  (`HauntingWorld.replay.test.ts`, „Die Bücher zwischen Welt und Runde").
  `rules/lobby.viewSwap` ist weg.

**Budget und Prüfung**

- Raumweise Batches, zwei Raumlichter, drei wiederverwendete Effekt-Emitter
  mit maximal48Partikeln und acht Audio-Kanäle begrenzen den Aufwand.
  Haunting-Web-DPR≤1,25, Telefon-3D≤15Hz. FrameStats misst JS/Frames/DrawCalls,
  keinen GPU-Timer. Spiegel rendert nur in Reichweite und Blickrichtung.
  **Die Türen gehen mit ihren Räumen** (`ShipExperience.setVisibleRooms`,
  `Door.rooms`): Eine Tür ist ein Dutzend eigener Zeichenaufrufe — Gehäuse,
  zwei Blätter mit Griffen, zwei Tafeln —, und gut zwei Dutzend davon wurden
  bisher in jedem Bild gezeichnet, auch die hinter drei Wänden; sie tragen
  kein `userData.roomId` wie ein Schrank, weil sie zu zwei Räumen gehören, und
  stehen, solange einer der beiden steht (die Übungsdeck-Türen immer). Die
  Deckenleuchte des Übungsdecks (`bayLight`) ist außerhalb der Lehrzimmer
  unsichtbar statt nur auf null — eine unsichtbare Lampe kostet keinen
  Bildpunkt (siehe „Die Brille rechnet kleiner"). Und das Desktop-Panel wird
  in der Brille nicht mehr achtmal je Sekunde durchgerechnet
  (`ShipExperience.paintDom`, `dom.hidden`): Wer es nicht sieht, malt es nicht.
  **Was noch keiner gemessen hat:** eine Bildrate auf einer Quest. Die Zeile
  dafür steht jetzt im Grafik-Menü; die nächsten Kandidaten, wenn sie nicht
  reicht, stehen im Code: `Pointer.castAll` wirft je Hand und Bild einen
  Strahl auf jedes angemeldete Ziel (Tafeln, Kisten, Konsolen — gut hundert),
  `ShipExperience.mesh` baut je Klotz ein eigenes Material, und die Schilder
  sind je eines eine 768 px breite Leinwand.
  `stationLighting` erlaubt im normalen eingeschalteten Deck `ambient=0.28`,
  stromlos und im dunklen Test `0`. Heller Test (`0.78`) und Simulation (`0.55`)
  haben eigene Werte; Trainingsräume verwenden lokale Beleuchtung.
- Generator-/Platzierungs-/Route-Tests prüfen viele Seeds und Raumzahlen,
  maßhaltige Modelle, Türfreiheit, Kurven, Schachtwände und sichere Spawns.
  Ganze Botrunden werden auch gegen tatsächliche automatische Türen getestet.
  XR-Zeiger-Tests prüfen Schutz-Ausgang und Tod-Neustart mit ControllerState.
- `npm run test:browser` startet echte Chromium-/Firefox-Smokes gegen einen
  laufenden Vite- oder Previewserver. Standard sind **sichtbare Fenster** und
  normale Browsergrafik; kein SwiftShader-Zwang. Optionen: `--browser=chromium`
  oder `--browser=firefox`, `--loops=3`, `--bot-seconds=120`,
  `--url=http://127.0.0.1:5173/`, `--output=.artifacts/browser-smoke/review`.
  `--headless` nur bei Bedarf (in CI automatisch), `--software` als ausdrücklicher
  Chromium-Fallback. Diese Läufe nicht als native Leistungsmessung ausgeben.
  Browser einmalig via `npm run test:browser:install` installieren; Playwright
  und Browserrevision müssen zusammenpassen.
- **Am Ende jedes Lauf steht die Eingabeseite** (`result.inputsPage`), und sie
  ist der einzige Schritt, der sein Gerät mitbringt: `navigator.getGamepads`
  wird vor dem Laden ersetzt — ein DualSense mit drei gedrückten Knöpfen —,
  denn Playwright kann kein Pad vortäuschen, und im Container steckt keines.
  Geprüft wird dabei nicht die Rechnung (die prüft Jest), sondern die
  Verdrahtung: dass die Kennung erkannt wird, dass `gamepad.buttons[10]` im
  Panel steht, dass im Bild genau die drei gedrückten Stellen leuchten und der
  Stickknopf mit der Achse wandert. Der Vollbildknopf wird an seiner Zusage
  geprüft und nicht an diesem Browser: Er ist genau dann da, wenn
  `document.fullscreenEnabled` gilt — ein „er ist sichtbar" wäre eine
  Behauptung über Chromium, die in einer Einbettung grundlos rot würde.
  Danach läuft **der Fall des Backbones** durch: Die Karte wird so gestellt,
  dass `buttons[1]` unten sitzt, und geprüft wird, dass daraufhin die
  leuchtende Stelle im Bild **und** die Zeile _Benutzen_ umschwenken — die
  ganze Kette von der Einstellung bis zu dem, was das Spiel daraus macht. Zum
  Schluss _Alles auf Standard_, und der Speicher muss wieder leer sein: Eine
  Einstellung ohne Rückweg ist eine Falle, und ein Test, der seinen Zustand
  liegen lässt, vergiftet den nächsten Durchlauf.
- CI verwendet `--no-screenshots`: Alle Funktionsprüfungen bleiben aktiv,
  aber weder Pflicht- noch Fehlerbilder werden aufgenommen. Der JSON-Report
  bleibt das CI-Artefakt; `screenshots: false`, `screenshot: null` und
  `captureMode: 'disabled'` machen den Modus ausdrücklich erkennbar.
  Lokale Läufe nehmen ohne dieses Flag weiterhin Screenshots auf.
- Browser-Smoke-Screenshots pausieren nur für die Aufnahme die WebGL-
  Animationsschleife und setzen sie in `finally` fort. So kann SwiftShader
  ein frisches Einzelbild abarbeiten, ohne ständig neue Frames zu erhalten. Bewegung
  und Frame-Samples laufen danach regulär weiter. Pflicht-Screenshots bleiben
  harte Fehler (30s); das Fehlerbild hat 10s Budget. Reports nennen den aktiven
  Schritt, die Aufnahmedauer und Fehler beim zusätzlichen Diagnosebild.
  Bewegungsprüfungen warten bei niedriger Software-Framerate bis zu 90s auf
  echte >0,5m Bewegung beider Akteure; die Distanzanforderung bleibt erhalten.
  (Einen Freiflug gibt es seit Paket H nicht mehr; ein Smoke, der ihn prüft,
  ist zu streichen.)
- `.artifacts/browser-smoke` enthält Screenshots und JSON-Reports. Entscheidend
  sind `passed`/`failure`, nicht das Vorhandensein von Bildern. `botStart`/
  `botEnd` erfassen Positionsänderung und Reparaturstand, `botText` das Protokoll;
  bei mindestens zehn Beobachtungssekunden werden >0,5m Bewegung gefordert.
  `webgl` enthält Kontext/Renderer/Gerät; `frameTiming` erfasst rAF-Abstände
  (Dauer, Frames, mittlere FPS und p95), keine GPU-Zeit und keine Quest-Framerate.
  Während Vergleichsläufen keine HMR-Edits oder parallelen schweren Tests.
  Der lokale Mac-Browserlauf ersetzt keine Quest-/Mehrgeräteabnahme; Details
  und jeweils belegte Ergebnisse stehen in `docs/orbital-qa.md`.
- `.github/workflows/browser.yml` baut bei main-Push/PR/manuellem Start einen
  Produktions-Preview und prüft ihn mit Chromium (`--software`, in CI headless).
  Das Artefakt **orbital-browser-review** enthält den JSON-Report auch bei
  Fehlern, Aufbewahrung 14 Tage. Kein nativer Leistungsbenchmark.
- Die lokale Generation `acceptance/` hat vier erfolgreiche Produktions-Smokes
  (zweimal Chromium, zweimal Firefox), jeweils ohne Browser-/Konsolenfehler oder
  Kontextverlust. E-Lampenaufnahme nutzt nach Debug-Positionierung echte Eingabe;
  der Verlustzustand wird gezielt gesetzt, der Neustart dann per UI geprüft.
  Botbewegung ist belegt; die kurze Browserbeobachtung ist kein Missionssieg.
  Drei geprüfte Screenshots ohne Personen-/Kontodaten liegen in `docs/orbital/`.
  Frame-Samples auf dem Mac unter paralleler Jest-Last nicht als Quest- oder
  isolierte FPS-Abnahme darstellen. Finale Zahlen: `docs/orbital-qa.md`.
- Typecheck, ESLint, Prettier, gesamte Tests und Produktionsbuild vor Push.
  Aktuelle Ergebnisse und verbleibende Hardwaretests: `docs/orbital-qa.md`.
  Keine Produktionsreife oder Quest-Framerate ohne echte Hardwaremessung
  behaupten; P2P und Haptik benötigen physische Geräte.

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

### Was ein Deploy für den Service Worker bedeutet

Seit die Seite als App installierbar ist (`src/sw.ts`), liegt ein Teil von ihr
im Telefon und nicht nur auf `gh-pages`. Drei Zusagen halten das zusammen, und
alle drei ziehen in dieselbe Richtung wie der Abschnitt darüber:

- **Seiten kommen erst aus dem Netz.** Eine `index.html` aus dem Speicher wäre
  genau der alte Build, gegen den `core/staleBuild.ts` ankämpft — nur diesmal
  ohne 404, an dem man ihn merkt. Erst wenn das Netz nichts hat, antwortet der
  Speicher.
- **Jeder Build hat seinen eigenen Speicher** (`bgvr-shell-<BUILD_ID>`, in der
  CI die ersten zwölf Stellen von `GITHUB_SHA`). Der neue Service Worker
  löscht beim Aktivieren die Speicher aller anderen: Ein halber alter Build
  kann nicht liegenbleiben.
- **Der Wechsel passiert beim nächsten Start**, nicht mitten in der Sitzung
  (kein `skipWaiting`). In der Zwischenzeit läuft die Seite aus dem alten
  Speicher weiter — was sie neu anfordert, hat ohnehin einen neuen Namen und
  kommt aus dem Netz.

Wer den Service Worker beim Entwickeln vom Hals haben will, braucht nichts zu
tun: Er meldet sich nur im fertigen Build an (`core/pwa.ts`). Wer ihn
ausprobieren will, nimmt `npm run build && npm run preview` — und wer ihn
loswerden will, nachdem er ihn einmal hatte, wirft ihn in den
Entwicklerwerkzeugen unter _Application → Service Workers_ hinaus.
