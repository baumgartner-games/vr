# Hände, Controller und Griffe

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

## Controller-Modelle

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

## Handhaltung

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

## Handmodell: Boxhand oder weißer Handschuh

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

### Und auf getrackten Händen

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

### Knochenfarben

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

### Was eine bloße Hand hält, hängt schräg

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

## Eingemessene Griffe

Wie eine Hand ein Werkzeug umfasst, hängt nicht am Werkzeug, sondern an dem,
**was sie umfasst** — und das ist bei achtzehn Werkzeugen derselbe Zylinder an
derselben Stelle. Die gebaute Faust (`HOLD_HAND_POSE`) ist deshalb nur der
Anfang: sie sagt, wie weit die Finger gekrümmt sind, und nicht, worum.

## Eine Faust, und sie ist gerechnet

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

## Ein Griff für alle Werkzeuge

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

### Gemessen schlägt gerechnet

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

### Die Faust gehört zum Griff

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
