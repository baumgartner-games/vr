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
Zylinder, Flug; `src/core/grabSettings.ts` — Rasten und Grenzen dazu), die
Achsenzuordnung der Griffe (`src/worlds/portal/tools/axisMatch.ts`), die
gemessene Werkzeug-Pose samt Spiegelung
(`src/worlds/portal/tools/toolPose.ts`), die **Flugmathematik der Drohne**
(`src/worlds/portal/tools/droneFlight.ts` — Kopter und Jet, inklusive der
Vorzeichen, die im Headset sonst die halbe Welt verdrehen, und das Tuning aus
Tempo und Drehrate), die **Drohnen-Einstellungen**
(`src/worlds/portal/tools/droneSettings.ts` — Rasten, Grenzen und der Fall,
dass ein alter Konfig-Code diese Felder noch gar nicht kannte), die Handhaltung
(`src/core/handPose.ts` — samt der ausgelieferten Grundhaltung und ihrer
Spiegelung auf die linke Hand), die **Untersetzung der Feinjustage**
(`src/worlds/tune/fineTune.ts` — dass ein Zentimeter ein Millimeter wird, dass
die Drehung den kürzeren Bogen nimmt, und dass zehn Bilder auf demselben Weg
dort enden, wo eines endet), der **Justierstand im Schießgang**
(`src/worlds/tune/rangeSettings.ts` — Grenzen, damit eine ziehende Hand ihn
nicht in die Wand schiebt, und ein Speicher, der auch kaputt sein darf), die
**Handgesten**
(`src/core/handGestures.ts` — welche Finger an der Handfläche liegen und was
daraus Greifen und Trigger macht, samt der Hysterese, ohne die ein halb
gekrümmter Finger den Trigger dreißigmal pro Sekunde umschaltet), die Waffenwerte
(`src/worlds/portal/tools/weaponSettings.ts`), der **Lichtkegel der
Taschenlampe** (`src/worlds/portal/tools/flashlightBeam.ts` — Grenzen, das
Ziehen an der Linse und dass der schmale Kegel heller und weiter reicht, ohne
zum Scheinwerfer zu werden), die **Gürtel-Position**
(`src/worlds/portal/beltSettings.ts` — Grenzen, die Spiegelung der beiden
Hüften, dass die Höhe ein Anteil der Augenhöhe bleibt und dass ein gezogener
Zentimeter dort ankommt, wo gezogen wurde), die **Portaltiefe**
(`src/worlds/portal/portalDepth.ts` — Rasten, Grenzen und der Fall, dass im
Speicher eine Zeichenkette statt einer Zahl steht), die **Lichtstufen des
Dunkelhauses** (`src/worlds/dark/lightLevels.ts` — dass die erste Stufe
wirklich null ist, dass jede folgende heller wird und dass es nach der
hellsten wieder aus ist), der **Konfig-Code**
(`src/core/configCode.ts` — packen und wieder auspacken, inklusive Tippfehler
und abgeschnittener Zeile), die **Trefferwertung des Schießstands**
(`src/worlds/range/scoring.ts` — Ringe, Platten und der Vorlauf, ohne den die
Physik jeden Treffer verschluckt), die Zielrichtung der Werkzeuge
(`src/worlds/portal/tools/aim.ts` — der Test hält fest, dass ein Werkzeug in
der Hand exakt entlang des Pointing-Rays zeigt und nicht 30° darüber), die
**Kart-Werte** (`src/worlds/kart/kartSettings.ts`), die **Fahrphysik**
(`src/worlds/kart/kartDynamics.ts` — Höchstgeschwindigkeit, Ausrollen,
Rückwärtsgang, Lenken erst ab Tempo, Driften bei wenig Traktion), die
**Streckenführung** (`src/worlds/kart/kartTrack.ts` — Spline, nächster Punkt,
Leitplanke, Rundenzähler über die Ziellinie hinweg), das **Pizza-Rezept**
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
niemand etwas), die **Faust am Griff**
(`src/core/gripHandPose.test.ts` — dass eine am Griff eingestellte Haltung für
jedes Werkzeug mit diesem Griff gilt, eine für ein einzelnes Werkzeug aber
darüber gewinnt) und dass sie **wirklich um den Griff liegt**
(`src/core/gripFist.test.ts` — die gezeichnete Hand am gebauten Werkzeug, quer
zur Griffachse einen Millimeter genau, und die **Fingerlinie auf der
Grifflinie**: der Zeigefinger liegt gestreckt am Rahmen und zeigt den Lauf
entlang, die Hand steht dafür 17° schräg am Griff; dazu dieselbe Rechnung um
den **Stab** (Hammer, Taschenlampe — eine Faust für zwei), denselben Stab
**von oben am Pinsel**, den **Griff der Drohne**, die **Kante der Stoppuhr**, den **Saum des Beutels**,
die **Querstange des Hängegleiters** und den **Handgriff des Controllers** (aus dem
Modell des Herstellers abgelesen: entlang der Z-Achse des Griffraums), an beiden
Händen; dass Messer und Sektflaschenhals in derselben Faust liegen wie die
Pistole, und dass Handschuhe die Grundhaltung tragen; dass die drei
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
(`src/physics/playerClearance.ts` — ob ein Ding noch in der Spielerkapsel
steckt, samt der beiden Kugelkappen, dem Radius des Dings und dem Zentimeter
Luft, ohne den der Zustand an der Grenze flackert), der
**Menüweg** (`src/ui/menuNav.ts` — dass beide Handgelenke denselben Weg lesen
und dass ein Weg zu einer verschwundenen Seite bei deren Elternseite endet),
die **Welt-Physik**
(`src/core/worldPhysics.ts` — Rasten, Grenzen, und dass „Welt-Standard" die
Schwerkraft der Welt gewinnen lässt statt einer einmal getippten Zahl), die
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
Rückwärtslauf), die **Materialien** (`src/worlds/portal/tools/materials.ts` —
dass eine unbekannte Id aus dem Netz zu Lack wird statt zu `undefined`) und
der **Regler der Werkzeugseite**
(`src/tools/poseEdit.ts` — die sechs Achsen, ihre Grenzen und dass ein Wert
auf demselben Raster landet, auf dem auch gespeichert wird: ein Regler liefert
0,30000000000000004, der Konfig-Code trüge 0,3, und die Seite zeigte eine
dritte Zahl) samt den Knöpfen daneben
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
Flächen `n + 1` ergeben, wie auf einem echten Würfel) und die **beiden Listen
des Beutels** (`src/worlds/portal/props.test.ts` — dass jede angebotene Sorte
einen Namen hat und keine doppelt im Raster steht). Diese
Module kommen bewusst ohne three.js und ohne Rapier aus, deshalb braucht Jest
weder WebGL noch WebXR noch wasm.

Zwei Tests benutzen doch three.js — aber nur als Geometrie, ohne WebGL: der
**Pointer** (`src/core/Pointer.ts`) muss jeder Hand ihren eigenen Strahl und
ihren eigenen Trigger lassen, und die **Handform** (`src/core/HandVisuals.ts`)
muss links links und rechts rechts sein — und der weiße Handschuh muss
dasselbe Skelett tragen wie die Boxhand, mit seinen **drei schwarzen Strichen**
oben auf dem Handrücken. Beides sind Vorzeichen, die man in der
Brille erst nach Minuten bemerkt und dann nicht mehr los wird. Alles, was schwer zu testen ist, gehört
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
  vier Welten hübsch und für zehn ein Gedränge.
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
  Mond, Alpen, Dunkelhaus, Eingaberaum),
  **Werkzeuge**
  (das ganze Regal direkt in die Hand, und die Einstellungen jedes Werkzeugs
  dahinter), **Magischer Beutel** (Raster mit Companion Cube, Kugel, Domino,
  Pyramide, Quader, Planke, Zylinder, Kegel, Rampe, Stab, Murmel, Sektflasche
  und dem **Würfelsatz** W4, W6, W8, W12, W20 — siehe _Was aus dem Beutel
  kommt_),
  **Bewegung** (Haltung, Augenhöhe, Sprint und Ducken), **Einstellungen** und
  die Aktionen der Welt.
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
  eine ziehen" eine durchgehende Bewegung. Wie viele Exemplare gleichzeitig
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
  - **Pinsel** samt Palette auf der anderen Hand, mit zwei Reitern: **Farben**
    und **Material** (Lack, Metall, Gummi, Eis, Stein, Glas, Leuchtend,
    Schaum — `materials.ts`, mit Test). Ein Material ist beides zugleich, wie
    das Objekt _aussieht_ und wie es sich _verhält_: Gummi springt, Eis
    rutscht, Glas ist durchsichtig, Leuchtend leuchtet. **Lack** ist der Weg
    zurück, ohne ihn wäre jeder Strich endgültig. Ein Strich setzt immer
    beides — was die Palette zeigt, ist das, was das Objekt bekommt; eine
    Farbe, die je nach Vorgeschichte mal das Material mitnimmt und mal nicht,
    kann man in der Brille nicht lesen. Farbe und Material gehen über das Netz
    (ältere Mitspieler schicken nur die Farbe).
    Gehalten wird er am **Stiel**: der ist in Greiffarbe und liegt als Stab
    auf dem Zeigestrahl wie der Stiel des Hammers — aber **von oben** gegriffen,
    wie ein Maler seinen Pinsel hält (`BRUSH_GRIP`, `BRUSH_HAND_POSE`):
    Handrücken oben, die Finger über dem Stiel, der Daumen zur Spitze hin. Mit
    der Hammerfaust sah er aus wie ein Hammer. Kein sichtbarer Standardgriff
    mehr darunter, und er zeigt trotzdem dorthin, wohin man zeigt.
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
    geradeaus, ohne Bogen, mit der Drehung um die eigene Achse — und bleibt
    stecken, wo es auftrifft (Wand, Kiste, egal). Fünf dürfen gleichzeitig
    unterwegs oder eingeschlagen sein; der sechste Wurf holt das erste
    zurück. Die Bahn wird pro Frame selbst abgetastet statt auf einen
    Abpraller zu warten — nur so bleibt es _stecken_, statt abzuprallen.
    Es war einmal ein **Wurfstern**, und der hatte keinen Griff — er lag „in
    den Fingerspitzen", also nirgends, und die Boxhand sah an ihm nach nichts
    aus. Das Messer hat einen: den **Standardgriff**, senkrecht in der Faust
    wie ein Pistolengriff, mit derselben Faust darum; die Klinge ragt oben aus
    der Faust heraus, entlang der Griffachse, die Schneide nach vorn
    (`tools/KnifeTool.ts`). Eine Weile lag es als **Stab** quer durch die Faust
    wie die Taschenlampe, die Klinge auf dem Zeigestrahl — so hält man eine
    Lampe, kein Messer; um 90° gekippt also. Die
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
  - **Stoppuhr**: das Werkzeug, mit dem man Physik _ansieht_. Sie liegt in der
    Hand wie bei einem Zeitnehmer: Blatt zum Gesicht, Finger um die seitliche
    Kante, Daumen auf der Krone (siehe _Ein Griff für alle Werkzeuge_), und der
    Gehäusemantel trägt die Greiffarbe. Ein **Knopf** an
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
    Gehalten wird sie am **Rand** wie eine Taschenuhr: kein Standardgriff, der
    Mantel des Gehäuses in Greiffarbe, das Gehäuse steht hochkant über dem
    Griffpunkt, die Handfläche dahinter, die Finger unten herum
    (`STOPWATCH_HAND_POSE`). Und das **Zifferblatt schaut zum Kopf** (+z) —
    lange schaute es nach vorn wie ein Lauf, und man sah den Zeiger nie.
  - **Taschenlampe**: eine **Stabtaschenlampe** — das Batterierohr liegt in
    der Faust, und es _ist_ der Griff, in Greiffarbe, ein Stab wie der Stiel
    des Hammers (`POLE_HAND_POSE`). Eine Weile war sie eine „Lampe mit Griff",
    das Rohr über der Faust und der Standardgriff quer darunter; das sah aus
    wie ein Megaphon. Davor lag ihr Rohr schon einmal in der Faust, aber auf
    der _Faustachse_, und dafür bezahlte sie mit einem Kegel, der 30° über das
    hinwegging, worauf man zeigte (siehe _Ein Griff für alle Werkzeuge_). Jetzt
    liegt der Stab **quer durch die Faust auf dem Zeigestrahl**, wie ein
    Hammerstiel, und leuchtet dorthin, wohin man zeigt.
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
    sondern wie etwas, das aus der Hand fällt. Geneigt ist jetzt das Display
    am Gehäuse und nicht das ganze Gerät in der Hand. Er verändert
    **nichts** — genau deshalb kann man ihn in einen wackeligen Stapel
    halten, ohne ihn umzuwerfen. Wenn eine Kiste anders fällt als erwartet,
    ist die Frage nie „wie sieht sie aus", sondern „was steht in ihr drin".
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
    Fachgröße gerechnet, keine Strichzeichnung. Die freie Hand fährt hinein:
    das Fach unter der Fingerspitze leuchtet, ein Stups meldet es, über dem
    Beutel steht der Name, und **Greifen** holt das Ding in Originalgröße
    genau dorthin, wo die Hand ist — bei allen in der Sitzung
    (`ToolHost.conjureProp`, derselbe Weg wie aus dem Menü).
    Zwei Dinge daran sind Absicht. Er **hängt**, folgt der Hand dabei aber in
    **Gieren und Nicken**: wohin man zeigt, dorthin zeigt er, und wie schräg
    man die Hand hält, so schräg steht er. Nicht mit geht allein das
    **Rollen** — nur das könnte ihn auf den Kopf stellen und sein Raster
    ausschütten, und genau davor schützte die erste Fassung, die überhaupt nur
    die Gierachse nahm; ein Beutel, den man nicht hinhalten kann, ist dafür
    aber ein steifes Ding (`alignToAim = false` plus `hangUpright`). Zwei Vorzeichen dazu, beide
    gefunden, als „die Hand greift ihn anders herum" gemeldet wurde:
    `hangUpright` nahm die Gierachse mit `atan2(x, z)` statt `atan2(-x, -z)`
    und hängte den Beutel damit um 180° gedreht **hinter** die Hand, den Bauch
    im Unterarm — auf der Werkzeugseite unsichtbar, denn dort läuft
    `hangUpright` nie. Und aufrecht heißt nicht „im Griffraum": bei zielend
    gehaltenem Controller steht das Aufrechte um die Zielkorrektur gegen den
    Griff gedreht, also wird die Faust am Saum jetzt **mit** ihr gerechnet wie
    bei allem, das zielt (`Tool.hangsUpright`, dieselbe Frage stellen
    Werkzeugseite und Justierstände). Und die greifende Hand gehört
    ihm, solange sie über einem Fach steht (`claimsHand`) — sonst risse
    derselbe Griff die Kiste hinter dem Beutel an sich, und in einem vollen
    Labor steht immer eine Kiste dahinter.
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
- **Schießstand** (experimentell): überdachte Schießlinie mit fünf Bahnen und
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
- **Gokart** (experimentell): kleine Strecke mit vier Karts, jedes mit eigenem
  Charakter und eigenem **Klemmbrett**. Lenkrad greifen setzt dich hinein,
  rechter Trigger ist Gas, linker die Bremse, der linke Stick lenkt — oder das
  Lenkrad selbst, wenn die erste Zeile des Klemmbretts das sagt. Aussteigen
  steht die ganze Zeit auf einem Schild über dem Lenkrad. Rundenzeiten stehen
  an der Strecke.
- **Pizzeria** (experimentell): Küche, Thresen, Gastraum. Teig aus der Kiste auf
  den Arbeitstisch legen und mit der **Faust** flach kneten, mit der roten
  **Kelle** Soße verteilen, **Käse** darüber streuen, ab in den **Ofen** und
  fertig auf einen Gästetisch. Der **Mülleimer** löscht, was schiefging. An der
  Wand hinter jeder Station steht, was sie will.
- **Eingaberaum** (experimentell): eine Kammer, deren einziger Zweck es ist zu
  zeigen, was die Hände tun. Zwei **Controller-Modelle** schweben auf
  Augenhöhe, drehen sich mit den echten mit, jeder Knopf leuchtet beim Drücken
  auf, Stick und Trigger bewegen sich wirklich. Gezeigt wird dabei das **echte
  Modell** des Geräts, das gerade in der Hand liegt (siehe
  _Controller-Modelle_); der selbst gebaute aus Kästen und Zylindern bleibt der
  Rückfall. Mit **bloßen Händen** treten
  sie beiseite und es stehen fünf Balken da — wie weit jeder Finger an der
  Handfläche liegt — plus zwei Lampen für das, was daraus wurde. An der Wand
  steht dasselbe in Worten.

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
  hellen Tafeln und am Boden.
- **Dunkelhaus** (experimentell): ein kleines Haus ohne Fenster — Startraum,
  ein Flur quer durch, vier Zimmer und ein Gang, der nirgendwohin führt. Es
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
| Werkzeug fallen lassen             | Grip woanders loslassen — es fällt, der Gürtel füllt nach (Budget pro Hüfte, links und rechts stören sich nicht)                                                      | –                                                                                               | –                    |
| Hüften verschieben                 | Gürtel-Justierer nehmen, Hüfte anzielen, Trigger, mit der anderen Hand greifen und schieben (`A`/`X` setzt zurück)                                                    | –                                                                                               | –                    |
| Messer werfen                      | im Schwung loslassen; es fliegt weiter und bleibt stecken                                                                                                             | –                                                                                               | –                    |
| Großer Hammer                      | irgendwo am türkisen Stiel greifen; zweite Hand dazu = zweihändig; **Trigger halten** schiebt die Hand am Stiel; geschlagen wird mit dem Kopf                         | –                                                                                               | –                    |
| Haltung (sitzen/stehen)            | Startseite oder Menü → Bewegung → Haltung                                                                                                                             | dito                                                                                            | dito                 |
| Greifen ohne Controller            | Mittel-, Ring- und kleiner Finger an die Handfläche                                                                                                                   | –                                                                                               | –                    |
| Trigger ohne Controller            | Zeigefinger an die Handfläche                                                                                                                                         | –                                                                                               | –                    |
| Portal schießen                    | Trigger der Hand mit der Waffe                                                                                                                                        | Links-/Rechtsklick                                                                              | –                    |
| Zweites Portal (Doppel-Waffe)      | Greifen                                                                                                                                                               | Rechtsklick                                                                                     | –                    |
| Aufheben / werfen                  | Grip mit leerer Hand am Objekt                                                                                                                                        | –                                                                                               | –                    |
| Weitergeben                        | mit der freien Hand danach greifen                                                                                                                                    | –                                                                                               | –                    |
| Anfassen                           | Hand ans Ding, Grip — die Hand leuchtet, wenn sie dran ist                                                                                                            | –                                                                                               | –                    |
| Nahgreifen                         | zielen, Grip: der Gegenstand bleibt liegen und folgt der Hand (Geisterhand zeigt, wo)                                                                                 | –                                                                                               | –                    |
| Ferngreifen                        | zielen, Grip drücken (rastet ein), Hand >30° nach oben kippen                                                                                                         | –                                                                                               | –                    |
| Nah Gefasstes doch holen           | dieselbe Kippgeste, >30° nach oben                                                                                                                                    | –                                                                                               | –                    |
| Reichweiten einstellen             | Menü → Einstellungen → Greifen                                                                                                                                        | dito                                                                                            | dito                 |
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
| Hängegleiter                       | Trigger oder `A` = Anlauf; Stange ziehen = schneller, drücken = langsamer, kippen = Kurve (eine Hand tiefer, oder das Handgelenk); zweite Hand greift ans andere Ende | –                                                                                               | –                    |
| Flügel                             | beide Arme schlagen = Start und Schub; ausbreiten = gleiten, anlegen = Sturzflug; eine Hand tiefer = Kurve, Hände vor = Nase runter                                   | –                                                                                               | –                    |
| Taschenlampe                       | Trigger schaltet an/aus                                                                                                                                               | –                                                                                               | –                    |
| Lichtkegel stellen                 | mit der anderen Hand vorne an die Linse greifen und nach links/rechts ziehen                                                                                          | –                                                                                               | –                    |
| Dimmer (Dunkelhaus)                | anzielen + Trigger, oder antippen — eine Stufe pro Druck                                                                                                              | anklicken                                                                                       | tippen               |
| Messband                           | Trigger Punkt 1, Trigger Punkt 2                                                                                                                                      | –                                                                                               | –                    |
| Stoppuhr                           | Trigger je nach Modus (Zeit, Einzelbild, Schnellladen), Knopf/`A` öffnet das Panel                                                                                    | –                                                                                               | –                    |
| Pinsel                             | Reiter _Farben_/_Material_ antippen, Trigger streicht an                                                                                                              | –                                                                                               | –                    |
| Duplizier-Waffe                    | zielen + Trigger legt eine Kopie daneben                                                                                                                              | –                                                                                               | –                    |
| Inspektor                          | zielen — das Display liest mit, Trigger sagt es an                                                                                                                    | –                                                                                               | –                    |
| Teleporter                         | zielen, grüner Kreis, Trigger setzt dich dorthin                                                                                                                      | –                                                                                               | –                    |
| Radiergummi                        | Trigger löscht                                                                                                                                                        | –                                                                                               | –                    |
| Sektflasche (aus dem Beutel)       | greifen: sie rastet am Hals in die Faust wie ein Pistolengriff, aufrecht oder über Kopf; kräftig schütteln, und der Korken knallt heraus                              | –                                                                                               | –                    |
| Magischer Beutel                   | in der einen Hand halten, mit der anderen ins Raster fassen: Greifen holt das Ding heraus                                                                             | –                                                                                               | –                    |
| Kart: einsteigen                   | Lenkrad greifen, oder anzielen + Trigger                                                                                                                              | Lenkrad anklicken                                                                               | –                    |
| Kart: Gas / Bremse                 | rechter / linker Trigger                                                                                                                                              | `W` / `S`                                                                                       | –                    |
| Kart: lenken                       | linker Stick — oder das Lenkrad greifen und drehen                                                                                                                    | `A` / `D`                                                                                       | –                    |
| Kart: aussteigen                   | `A`/`X` halten (Balken läuft voll)                                                                                                                                    | `E` halten                                                                                      | –                    |
| Kart: Klemmbrett                   | anzielen + Trigger, Stick blättert                                                                                                                                    | anklicken                                                                                       | –                    |
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
Zylinder um den Spieler — 1 m im Rund, 2,10 m hoch, beides einstellbar. Ein
Zylinder und keine Kugel um die Hand, weil „muss ich mich bücken?" eine Frage
an den **Körper** ist: der Dominostein vor den Füßen liegt außerhalb jeder
Kugel um eine Hand, die auf Hüfthöhe hängt, und ist genau der Fall, um den es
geht. Der Boden kommt dabei vom Rig (`getFloorY`) und nicht aus `position.y` —
wer sich duckt, sinkt, der Fußboden nicht.

Ein nah gefasster Gegenstand **fliegt nicht**. Er bleibt liegen, wo er liegt,
und folgt der Hand von dort, als hätte man ihn dort angefasst. Wie er das tut,
steht unter _Im Nahgriff_: **starr** wie in der Faust (Vorgabe — man hat eben
einen langen Arm) oder als **Drehung um die Objektmitte**, die eins zu eins
verschiebt und den Gegenstand um sich selbst dreht statt um die Hand kreisen zu
lassen. Auf einen Meter wird aus jedem Grad am Handgelenk sonst ein Ausschlag.

**Ferngreifen** (standardmäßig an) erweitert das auf 9 m und läuft in zwei
Schritten. Was getroffen ist, leuchtet auf. Mit **Grip** rastet es ein: Es
bleibt markiert, auch wenn die Hand woanders hinzeigt, und ein dünner Strahl
zwischen Hand und Gegenstand sagt, dass jetzt gezogen werden kann. Kippst du
die Hand danach mehr als **30°** nach oben/hinten, kommt der Gegenstand
geflogen und landet in der Hand.

Dieselbe Kippgeste holt auch einen **nah gefassten** Gegenstand doch noch
her — eine Geste, drei Entfernungen. Im Nahbereich hat man damit die Wahl:
dort lassen und manipulieren, oder hochkippen und in die Hand nehmen.

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

**Ducken und Sprinten** hängen an den Sticks: rechten Stick reindrücken duckt,
linken Stick reindrücken sprintet. Unter **Menü → Bewegung** lässt sich für
beide einstellen, ob gedrückt gehalten oder umgeschaltet wird (Ducken schaltet
standardmäßig um, Sprint wird gehalten), dazu Sprint-Tempo und Duck-Tiefe.

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

Ein Kart ist vier reine Module und ein bisschen Verdrahtung:
`kartSettings.ts` (die Werte samt Bereich, Raste und Einheit — dieselbe Idee
wie `weaponSettings.ts`), `kartDynamics.ts` (ein Schritt Fahren),
`kartTrack.ts` (die Strecke als Mittellinie plus halbe Breite) und
`kartRace.ts` (Runden, Reihenfolge, Tafel). Alle vier ohne
three.js und mit Jest-Test; `Kart.ts` und `KartWorld.ts` sind nur noch Blech.

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

**Das Fahrmodell** ist bewusst klein und arkadig: Gelenkt wird wie beim
Fahrrad — Gierrate = Tempo · tan(Einschlag) / Radstand, also dreht ein
stehendes Kart nicht. Die Drehung dreht das _Kart_, nie seine Geschwindigkeit;
was dabei seitlich übrig bleibt, ist der Drift, und die **Traktion** sagt, wie
schnell die Reifen ihn wieder auffressen. Gas, Bremse und Widerstand fassen nur
den Vorwärtsanteil an. Zum Rollwiderstand gehört ein konstanter Anteil, sonst
_nähert_ sich ein losgelassenes Kart dem Stillstand nur an und kriecht
minutenlang weiter.

**Die Leitplanke** ist keine Physik, sondern Geometrie: `confineToTrack` setzt
ein Kart, das über den Rand ist, exakt auf die Kante zurück, nimmt den Teil der
Geschwindigkeit weg, der in die Planke zeigte, und schrubbt den Rest ein wenig.
So rutscht man an der Bande entlang statt daran zu kleben. Steht man einmal
stumpf davor, hilft die Bremse: sie ist zugleich der Rückwärtsgang, und rückwärts
lenkt es wieder.

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
Höchstgeschwindigkeit, Bremskraft, Traktion, Gewicht, Lenkeinschlag, Radstand
und Rückwärtstempo, jede Zeile schaltet auf die nächste Raste und zeigt die
rohe Zahl daneben. Weil mehr Zeilen als Platz da sind, blättert der Stick der
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
wieder dorthin, wohin man zeigt — die Lampe liegt inzwischen wieder als Stab in
der Faust (dazu unten), der Hängegleiter an seiner Querstange, und der
Lötkolben ist geblieben.

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

**Und zwar an allem, was man in die Faust nimmt.** Lange trugen ihn nur die
sieben Pistolenwerkzeuge und die beiden Stäbe, und der Rest hielt sich an
irgendetwas fest — die Portalwaffen an einem selbstgebauten Kasten, der 0,2 rad
nach hinten lehnte, Pinsel, Messband, Radiergummi, Stoppuhr und Röntgen-Scanner
an gar nichts. Jetzt tragen sie alle den Standardgriff:

| Griff             | Werkzeuge                                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| der Standardgriff | Halterzylinder, Pistole, Duplizierer, Inspektor, Teleporter, Größe & Position, Holster, Greifhaken, die drei Portalwaffen, Messband, Radiergummi, Röntgen-Scanner, Lötkolben, Messer       |

Sechzehn Werkzeuge, ein Griff, eine Faust, eine `holdPosition` — die Liste
dazu ist `STANDARD_GRIP_TOOLS` in `core/handPose.ts`, und `gripMount.test.ts`
baut sie alle und legt das Maßband an.

Der **Röntgen-Scanner** hat dabei seinen Rahmen eine Handbreit nach oben
bekommen: seine Öffnung lag auf dem Nullpunkt, also mitten in der Hand, und mit
einem sichtbaren Griff stünde ein Zylinder im Bild. Der Scanbereich rechnet
seitdem gegen den Rahmen-Knoten statt gegen das Werkzeug — `XrayScope` liest
nur eine Weltmatrix, und das ist seine.

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
einen Hammer), und ihn tragen **zwei**: der Stiel des Hammers und das
Batterierohr der Taschenlampe, beide mit derselben
`holdPosition` (`POLE_HOLD_POSITION`) und derselben Faust (`POLE_HAND_POSE`);
das Messer lag eine Weile auch darauf und steht jetzt mit dem Standardgriff in
der Faust.
Der **Stiel des Pinsels** liegt auf demselben Stab mit derselben
`holdPosition`, aber als `BRUSH_GRIP` in `BrushTool.ts` **von oben** gehalten,
wie ein Maler: Handrücken oben, Finger über dem Stiel, Daumen zur Spitze
(`BRUSH_HAND_POSE`) — mit der Hammerfaust sah der Pinsel aus wie ein Hammer.
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
an einem Eimer sah es nach einem Eimer aus) — **mit** Zielkorrektur gerechnet,
obwohl der Beutel nicht zielt: er hängt aufrecht, und bei zielend gehaltenem
Controller ist das Aufrechte der Strahlraum (`Tool.hangsUpright`; ohne sie
gerechnet stand die Hand in der Brille 30° gekippt am Saum). Die **Querstange
des Hängegleiters** als `BAR_GRIP` in `HangGliderTool.ts`: quer (x) durch den
Griffpunkt, von oben gehalten wie ein Lenker, Handrücken oben, Daumen zur Mitte
der Stange (`GLIDER_HAND_POSE`). Und der **Handgriff des Controllers** als
`CONTROLLER_GRIP` in `core/controllerGrip.ts`, ohne Zielkorrektur, denn das
Gerät liegt im Griffraum selbst: entlang z, Daumen zum Kopf, Handrücken außen,
der Zeigefinger gestreckt zum Trigger — mit dem Trigger krümmt er sich darauf
(`CONTROLLER_HAND_POSE`). Die Rahmen
dieser Zylinder schreibt man nicht als Winkel hin, sondern als zwei
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
das war die Taschenlampe.

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
(`poseStore.ts`, `storedPoseHand`): die Pose selbst gilt für beide, aber die
Herkunft ist die einzige Auskunft darüber, warum sie so aussieht, wie sie
aussieht. Der Kurzcode trägt die Seite ohnehin, und das Menü zeigt sie unter
_Lage in der Hand zurücksetzen_.

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

Codes der Fassungen 1 und 2 werden weiter gelesen (`tools/gearCodec.ts`, mit
Test).

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

Der `App`-Loop ist bewusst schlank: Input → Locomotion → `world.update()` →
UI → Netzwerk → Render. Eine Welt darf über `world.render()` selbst rendern;
das Portal Labor nutzt das für seine Zusatzdurchgänge.

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
dessen -Z, `GRIP_TO_RAY`, und in der Ansicht _Am Werkzeug_ bei
`Lage-im-Griff⁻¹`). Wozu die Seite, sieht man am Telefon: „wie sieht das eigentlich aus" ist in der
Brille ein Weg in den Eingaberaum und an einen Stand, und das ist zu weit für
eine Frage, die man im Vorbeigehen stellt.

**Drei Regale, eine Schublade.** Hinter dem Burger-Symbol liegen **Werkzeuge**,
**Welten** und der **Magische Beutel**, dazu der Weg zurück in die Spielwiese
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
Collider-Form als Zeile. Beide Listen kommen aus dem Spiel (`WORLDS`,
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
- **Ein Dach wird aufgeschnitten.** Eine Welt mit Decke füllt beim Bauen
  `this.roof` (Portal Labor, Dunkelhaus, Pizzeria, Eingaberaum), und die
  Vorschau legt eine Schnittebene knapp darunter — Puppenhaus statt Deckel. Die
  Ebene liegt im Raum, das Modell dreht sich, also wird sie in jedem Bild aus
  der Lage der Bühne nachgerechnet; sonst wanderte der Schnitt beim Drehen
  durch die Welt.
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
Werkzeuge behalten den nackten Hash, damit alte Links halten), `#welt/alps`
und `#objekt/cube` für die beiden anderen Regale, `#welten` und `#beutel` für
ihre Übersichten. Ein Hash, den es nicht gibt, endet in der Werkzeug-Übersicht
und nicht in einer leeren Seite.

Im Kopf steht außerdem der Umschalter für die **Boxhand**, und seine drei
Zustände sind nicht drei Ansichten desselben Bildes, sondern zwei verschiedene
Bezugspunkte:

- **Hand aus** — nur das Werkzeug, für die Form.
- **In der Hand** — der _Griffraum_: die Hand steht still, das Werkzeug liegt
  darin, dort, wohin `holdPosition` und `holdRotation` es legen. Das Bild aus
  der Brille: „so halte ich das Ding."
- **Am Werkzeug** — der _Werkzeugraum_: das Werkzeug steht still, die Hand liegt
  daran. Das Bild vom zweiten Justierstand: „so umfasst die Hand es."

Die beiden zeigen dabei **verschieden viel**: der **Halterzylinder** steht nur
_Am Werkzeug_. Er ist das Gerüst, an dem eingemessen wird — der Handgriff des
Controllers, um den die Faust liegt —, und _In der Hand_ geht es um das fertige
Bild: dass der Pinsel wie ein Stift in der Hand liegt und nicht wie ein Hammer.
Ein türkiser Zylinder quer dadurch beantwortet dort eine Frage, die niemand
gestellt hat. Beim Halterzylinder selbst bleibt er stehen — sonst wäre die
Bühne leer. Und die Hand ist auf dieser Seite **nicht durchsichtig**: gläsern
ist ein Geist, den man neben die eigene Hand hält, und hier gibt es keine
eigene Hand dahinter.

Daneben stehen **Grab** und **Trigger** — die beiden Knöpfe am Controller, als
Schalter, unabhängig voneinander. Gehalten wird mit gedrücktem Griffknopf, so
fängt die Seite an; Trigger dazu, und der Zeigefinger zieht ihn, an der
Stoppuhr der Daumen die Krone; Grab weg, und die Hand öffnet sich vom Griff —
dieselbe Rechnung wie in der Brille (`buttonCurls`, siehe _Handhaltung_). Nur
die Finger bewegen sich, die Hand bleibt liegen — und die **weiße Linie** auch:
sie kommt aus dem Controller und nicht aus dem Zeigefinger, also ändert der
Trigger nichts an ihr. Beim Justieren gilt trotzdem immer die haltende Hand:
der Regler richtet die Richtung des Zeigefingers aus, und ein Finger am Abzug
zeigt woandershin als einer am Rahmen.

Zwischen beiden liegt dieselbe Messung; unterschiedlich ist nur, welches von
beiden aufrecht steht. Am Werkzeug sieht man, ob der Griff in der Faust sitzt,
in der Hand, wohin das Ding dabei zeigt. Gerechnet wird mit derselben Kette wie
im Eingaberaum (`tune/handGrip.ts`) und mit derselben Zielkorrektur: die kommt
sonst aus einem Controller, im Browser gibt es keinen, also steht sie als Zahl
da (`GRIP_TO_RAY`) — und zwar **nur für Werkzeuge, die zielen**, und für den
Beutel, der aufrecht im Raum hängt (`Tool.hangsUpright`). Was in der
Faust sitzt (`alignToAim = false`: Controller, Boxhand, Flügel,
Handschuhe), bekommt die Ruhe (`viewer.aimOf`), wie im Spiel. Eine Weile bekam
es auf der Seite die 30° trotzdem, und die Controller saßen dort sichtbar
schief in der Hand, während sie in der Brille richtig lagen; und noch eine
Weile rechnete der Regler der Seite (`toolInGripNow` in `tools/main.ts`) mit
`GRIP_TO_RAY` für alle, während der Betrachter die Ruhe zeichnete — er fragt
jetzt denselben `viewer.aimOf`.

An der Hand hängt außerdem eine **Linie am Zeigefinger**, in der Farbe des
Beutels und nicht in der der Hand. Man sieht einer Faust nicht an, wohin sie
zeigt, und ob ein Werkzeug entlang des Fingers liegt oder dreißig Grad daneben,
ist die halbe Frage, um die es beim Justieren überhaupt geht. Sie hängt an
`GhostHand.indexTip` — die Spitze weiß selbst, wohin sie zeigt, ihr -Z _ist_
die Richtung —, geht also jede Krümmung mit, ohne dass irgendwo etwas
nachgerechnet würde. Und sie ist eine `Line` und kein Mesh: die Kamera misst
nur sichtbare Meshes, also passt sie sich weiter an das Werkzeug an und nicht
an eine Linie, die absichtlich über den Rand hinausgeht.

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

Bewegt wird dabei **immer die Hand**, nie das Werkzeug. Das Werkzeug ist das,
was man ansieht: es steht aufrecht in seinem eigenen Raum und bleibt dort
stehen, und die Hand legt man daran, wie man eine echte Hand an ein echtes Ding
legt. Die sechs Zahlen am Regler sind deshalb die Lage der **Hand im Raum des
Werkzeugs** — genau die Größe, die der zweite Justierstand misst und die der
Betrachter ohnehin zeichnet (`ghostOnTool` in `tune/handGrip.ts`). Deswegen
weicht der Ansichts-Umschalter im Kopf, solange justiert wird: es gilt die
Ansicht _Am Werkzeug_, und danach kommt die zurück, die vorher galt. Im
Griffraum wanderte sonst für das eine Ziel das Werkzeug unter der stehenden
Hand weg — genau der falsche Film, und genau der, der als „ich will das
Werkzeug nicht bewegen" zurückkam.

Der zweite Umschalter, unten links, sagt deshalb nicht mehr, _was_ sich bewegt,
sondern **wohin die eingestellte Handlage übernommen wird**. Dieselbe Lage kann
auf zwei Arten wahr werden, und es sind die Antworten der beiden Justierstände:

- **In der Hand** — übernommen als **Lage des Werkzeugs im Griff**
  (`poseStore`, `bgvr.holdPoses`, also `holdPosition`/`holdRotation`). Die
  Handhaltung bleibt; was sich ändert, ist, wie das Ding in der Faust liegt und
  wohin es damit zeigt. Gerechnet als `Lage-im-Griff = Haltung ·
Hand-am-Werkzeug⁻¹`.
- **Am Griff** — übernommen als **Griffhaltung der Hand** (`handPoseStore`,
  `bgvr.handPoses`), und zwar nur in ihren sechs Zahlen: Finger und Spreizung
  sind keine Frage von „wo liegt die Hand" und bleiben stehen. Gerechnet als
  `Haltung = Lage-im-Griff · Hand-am-Werkzeug` (`handFromGhost`).

Auf dem Schirm sehen beide gleich aus — dieselbe Hand wandert an dasselbe
stehende Werkzeug. Der Unterschied liegt in der Brille, und deshalb steht er
als Satz unter dem Regler und nicht nur als Knopfbeschriftung.

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

Die Rechnung zu allen dreien steht in `src/tools/alignHand.ts` (mit Test, ohne
three.js), die Linien holt die Seite aus den Weltmatrizen der Bühne
(`viewer.handAim`, `viewer.gripAim`, `viewer.toolAim`) statt sie nachzurechnen:
sie hängen an der Fingerspitze, am Griff und am Werkzeug, gehen also jede
Krümmung und jeden Anbau mit, und damit ist ausgerichtet, was man auch sieht.
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
trägt den eigenen Körper — den zeichnen _nur_ die Portalkameras, direkt sieht
man von sich die Hände. `LAYER_HUD` (4, in `src/ui/ScoreHud.ts`) ist das
Gegenstück: das HUD hängt an der Kamera und darf in keiner zweiten Kamera
auftauchen, sonst schwebt es in der Portalsicht, im Drohnendisplay oder im
Fernrohr mitten im Raum. `PortalRenderer.viewLayers` setzt für jede Portalsicht
das eine Bit und löscht das andere; Drohne und Fernrohr bringen eigene Kameras
mit, die von Haus aus nur Ebene 0 zeichnen.

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

Steht der gewählte Spieler in einer anderen Welt, wechselst du automatisch
dorthin. Verlässt er die Sitzung, fällt die Kamera auf _Frei_ zurück.

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
