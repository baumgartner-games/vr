# Die Waffe und die Kartzone

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

## Die Waffe

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

**Zu sehen ist inzwischen ein gekauftes Netz.** Die Pistole war das erste
Werkzeug, das sein Bild aus dem KayKit-Regal bekommen hat
(`prototype-bits/Gun_Pistol.glb`), und der Griff, an dem das bisher
scheiterte, wird jetzt am Netz **gefunden** statt geraten — die Rechnung dazu
steht in [Hände](./haende.md), _Und jetzt hängt ein gekauftes Netz am
Halterzylinder_. Für diese Seite zählen drei Folgen:

- **Kein Schlittenweg mehr.** Die Datei hat zwei Knoten, Waffe und Magazin,
  und keinen davon als Schlitten; die ganze Waffe zurückzuschieben hieße, sie
  durch die Faust rutschen zu lassen. Der sichtbare Rückstoß ist deshalb
  allein das **Hochschlagen der Mündung** — dieselbe Zahl, dieselbe
  Abklingzeit, nur ohne das Klacken daneben.
- **Mündung, Zielschiene und Rundenzähler sind umgezogen**, auf gemessene
  Stellen am Modell. Die Schiene rückt um genau die Strecke, um die die
  Mündung nach vorn und die Oberkante nach oben gewandert ist: Damit behält
  jede Zielhilfe ihren Abstand zur Mündung — die **Visierlinie**, auf die es
  bei einer Kimme ankommt — und ihre Handbreit über dem Gehäuse. Wer eine
  davon am Justierstand verschoben hat, behält seine Verschiebung; sie steht
  gegenüber der Schiene und nicht gegenüber dem Werkzeug. Der Zähler klebt
  jetzt auf dem Magazin, und zwar aufrecht: Das gebaute steckte schräg im
  Griff, dieses steht gerade unter dem Lauf.
- **Und die Kugeln sind Patronen.** `spawnBullet` zeigt statt einer Kugel in
  Gelb `prototype-bits/Bullet.glb`, auf ihre Flugrichtung gelegt. Der Körper
  bleibt eine **Kugel**, ihr Halbmesser hängt weiter an der Masse, und
  getroffen wird weiter gegen die **Strecke** und nicht gegen ein Netz.
  „Doppelt so groß" ist dabei auf die Länge gerechnet — 5,6 cm statt 2,8 cm
  Kugeldurchmesser, damit 1,87 cm dick: von der Seite knapp das Doppelte, von
  vorn **weniger** als vorher. Die Leuchtspur glüht voll orange, die
  gewöhnliche gedämpft gelb.
- **Und seit September 2026 ist beides größer.** Die Patrone ist zehnmal so
  lang wie zuvor (`bulletFit.BULLET_VIEW_GROWTH`: 56 cm statt 5,6 cm), das
  Kügelchen ohne Modell ebenso — nur das Bild, Körper und Treffer bleiben beim
  Halbmesser der Masse. Und die Waffe in der Hand ist doppelt so groß
  (`PistolTool.GUN_SIZE`): Die Griffmitte bleibt auf dem Halterzylinder, die
  Waffe wächst um die Faust herum.

Ohne WebGL und in einem Checkout ohne die gekauften Pakete bleibt beides
gebaut — das ist der normale Ausgang und keine Notlösung.

**Aus den Augen am Schirm** hält die Hand ihr Werkzeug jetzt auch — vorher
tat sie das nur von oben, und aus den Augen war weder eine Hand zu sehen noch
zu schießen (gemeldet: _„in aus den Augen kann ich gar nicht schießen"_). Die
Bildschirmhand (`screenHand.ts`) hängt dort **an der Kamera**, unten rechts im
Bild (`eyeHand.EYE_GRIP`), und gezeichnet wird sie von denselben
`HandVisuals` wie in der Brille (`HandVisuals.setScreenHands`). Das geht, weil
ihr Griff gegen ihren Zeigestrahl genau so steht wie an einem Controller
(`GRIP_TO_RAY`): Die Zielkorrektur jedes Werkzeugs ist damit die der Brille,
und die eingemessene Faust liegt um dieselbe Pistole. Mit leerer Hand steht
links eine zweite Hand daneben, nur zum Ansehen (`ScreenHand.offHand`); mit
einem Werkzeug geht sie aus dem Bild.

- **Gezielt wird aufs Fadenkreuz.** In der Mitte steht ein Kreuz
  (`.eye-crosshair`), solange ein Werkzeug in der Hand liegt. Die Hand sitzt
  aber rechts unten, und ein Lauf parallel zur Blickachse schösse eine
  Handbreit daneben — deshalb dreht `eyeHand.eyeGripRotation` den Griff so,
  dass die Laufachse durch den Punkt geht, den das Kreuz gerade trifft (ein
  Strahl gegen die festen Flächen, geglättet, 1,5 bis 60 m; mit Test).
  Gerechnet wird aus der **Haltung** und nicht aus der Lage der Waffe, sonst
  drehte die Hand den Rückstoß jedes Mal wieder weg.
- **Der Linksklick ist der Trigger** (`PlayerRig.armed`, `FlatControls`),
  dazu RT und der Auslöser-Knopf auf dem Glas (bis zum einheitlichen Schema
  in [Steuerung](./steuerung.md) auch `B` am Pad) — und zwar **vor** dem Benutzen, anders als
  von oben: Aus den Augen liegt `E` neben `WASD`, und eine Pistole, die in der
  Küche nicht schießt, weil ein Topf in Reichweite steht, sähe kaputt aus.
  Portale schießt die Maus nur noch mit leerer Hand; der Vorschauring geht mit
  einem Werkzeug in der Hand aus.
- **Das Werkzeug bleibt über den Ansichtswechsel in der Hand.** Es kommt
  einmal mit der Bildschirmhand und wechselt danach nur über den
  Werkzeug-Knopf (`#hud-tool`, `Tab`).
- **Aus den Augen ist alles halb so groß** (`eyeHand.EYE_SCALE`). In echter
  Größe füllte die doppelt große Pistole das halbe Bild, und eine Tomate
  davor deckte die Küche zu (gemeldet: _„viel zu groß, man erkennt nichts im
  Bild"_). Gestaucht wird der Halter der Hand, also Faust und Werkzeug
  zusammen; was getragen wird, zeichnet `PortalWorld.shrinkScreenCarry` im
  selben Maß — **nur das Bild**: Körper, Einrasten und Gitter rechnen mit der
  echten Größe, und beim Loslassen ist das Ding sofort wieder so groß wie im
  Raum. **Von oben und in der Brille bleibt alles in echter Größe**: Von oben
  ist die Kamera weit weg, und in der Brille muss ein Ding so groß sein, wie
  die Hand es fühlt.
- **Zielen über die Waffe: rechte Maustaste oder LT halten** (bis zum
  einheitlichen Schema LB, siehe [Steuerung](./steuerung.md))
  (`PlayerRig.sighting`). Die Waffe kommt in `EYE_SIGHT_TIME` ans Auge, bis
  ihre Visierlinie auf der Blickachse liegt (`eyeHand.eyeSightPose`, mit
  Test); das Fadenkreuz geht dabei weg. Welche Linie, sagt das Werkzeug
  (`Tool.sightLine`): an der Pistole die beste Zielhilfe auf der Schiene —
  **Fernrohr** vor **Rotpunkt** vor **Kimme & Korn** —, und ohne eine die
  Oberkante der Waffe. Kimme und Korn sitzen mitten auf der großen Pistole,
  also rückt sie so weit weg, dass ihr hinteres Ende 20 cm vor dem Auge
  bleibt (`eyeSightRelief`, `EYE_REAR_CLEAR`). Das **Fernrohr** kommt als einziges in
  echter Größe ans Auge (`eyeSightScale`): Halb so groß wäre seine Linse ein
  Knopf. Gerechnet wird wieder aus Haltung und Schiene, nicht aus der Lage,
  damit der Rückstoß im Anschlag zu sehen bleibt. LB ist von oben der Zoom
  und aus den Augen sonst frei. Und weil eine **zweite** Maustaste kein
  `pointerdown` bekommt, sondern nur ein `pointermove` mit neuer Maske, liest
  `FlatControls.chordButtons` die Tasten dort — sonst schösse, wer rechts
  zielt, links nie.

## Die Kartzone

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

**Die Fahrbahn ist die Straße der KayKit-Stadt** (`kart/kartRoad.ts`,
`KartZone.fillRoad`, seit September 2026). Gewünscht war: _„die
Go-Kart-Straßen durch KayKit-Streets ersetzen."_ Die Stadt hat Kacheln von
einem Meter — Gerade, Ecke, Kurve —, und ihre Kurve hat genau **ein**
Verhältnis von Breite zu Radius; die Bahn hier ist vier Meter breit und hat
Kurven von 4, 6, 9 und 11 m. Die Strecke nach der Kachel umzubauen hätte das
Fahren umgebaut. Also wird **`city-builder-bits/road_straight`** genommen,
auf die Breite der Bahn gezogen, in zehn Scheiben je Kachel quer zur
Fahrtrichtung geschnitten (`sliceAlong`) und Scheibe für Scheibe auf die
Mittellinie gelegt (`bendRoad`) — so folgen gelber Rand, weiße Striche und
Bordstein jedem Bogen. Eine Kachel ist so lang wie breit, heraus kommt **ein**
Netz mit **einem** Material für die ganze Runde. Die Oberkante des Asphalts
der Kachel (0,035) liegt auf `TARMAC_TOP`, also ohne Stufe zur Boxengasse.
Bis die Datei da ist — oder ohne die gekauften Pakete für immer —, liegt das
gebaute graue Band mit den weißen Linien. Die Rot-Weiß-Randsteine und die
Bande bleiben, wie sie waren; an der Boxengasse steht jetzt der Bordstein der
Kachel, ein paar Zentimeter hoch und nur fürs Auge (die Fahrbahn ist kein
Körper). Geprüft wird ohne Szene (`kartRoad.test.ts`): kein Dreieck über
eine Scheibengrenze, keine Fläche verloren, die Kanten auf den Kanten der
Bahn, die Normalen oben.

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
Grundriss ([Wie schön es aussieht](./grafik.md#wie-schön-es-aussieht)), aus demselben
Grund.

**Und ein Stapel waren sie nie.** Sie hießen so und waren ein
anthrazitfarbener Quader; seit dem Umbau sind sie ein **Stein** aus dem
KayKit-Regal (`block-bits/bricks_B.glb`), fünfundvierzig Stück, weiter in
**einem** Bündel — 844 Dreiecke hat einer, einzeln wären das fünfundvierzig
Zeichenaufrufe, in der Brille je Auge. Der Name bleibt, damit man beides noch
findet.

Der Stein ist in der Datei ein Würfel von einem Meter, der Kasten hier ist
1 × 0,6 × 1. **Also wird die Höhe gestaucht und nicht der ganze Würfel**
(`test/zones/propFit.ts`): Gleichmäßig auf 0,60 m verkleinert wäre der Stein
auch nur 0,60 m **breit** und stünde 20 cm schmaler da als der Körper, der ihn
trägt — ein Hindernis, gegen das man läuft, bevor man es sieht, auf einer
Strecke, auf der mit 60 km/h gefahren wird. Den Körper auf die natürlichen
1,00 m zu bringen wäre die andere Möglichkeit gewesen und hätte die Bande um
zwei Drittel erhöht: keine Frage des Bildes mehr, sondern eine Änderung daran,
was ein Kart trifft. Der Preis sind Ziegelreihen, die 40 % flacher sind als
beim Zeichner; das merkt im Vorbeifahren niemand.
