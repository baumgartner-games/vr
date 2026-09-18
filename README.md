# Baumgartner VR

- **[Spiel starten](https://baumgartner-games.github.io/vr/)**
- **[Werkzeug-Übersicht öffnen](https://baumgartner-games.github.io/vr/tools.html)** — alle Werkzeuge, Welten, der magische Beutel und die NPCs zum Ansehen und Drehen, ohne Brille, auf dem Handy.

[![Baumgartner VR](public/banner.svg)](https://baumgartner-games.github.io/vr/)

**Jede Welt lässt sich auch von oben spielen.** Auf der Startseite steht „Von
oben oder Aus den Augen", im Spiel steht es unter _Menü → Ansicht_ — und _Von
oben_ heißt: **dieselbe** Welt, nur aus einer festen Kamera schräg darüber, wie
in _Overcooked_. Dieselben Wände, dieselben Türen, dieselben Kisten, an denen
gerade jemand anders mit der Brille steht; man sieht dabei seine eigene Figur.
Gelaufen wird in Weltrichtungen — `W` ist Norden, `D` ist Osten, und die Figur
dreht sich dorthin, wohin sie läuft —, `Shift` sprintet, die Leertaste springt,
und das Rad zoomt in vier Stufen. **`A` benutzt — überall**: was vor der Figur
steht (Knöpfe, Hebel, Türen, Tore, ein Kart zum Einsteigen), bekommt einen
**gelben Saum**, und derselbe Knopf springt nur dann, wenn nichts in Reichweite
ist. Am Schreibtisch heißt `A` schlicht `E` oder Enter, in der Brille ist es
`A` der rechten Hand. Der Linksklick **schießt** mit dem Werkzeug in der
rechten Hand — und **welches das ist, wählt man selbst**: Der runde
**Werkzeug-Knopf** unten rechts zeigt, was gerade in der Hand liegt, ein Druck
(oder `Tab`, am Pad `Y`) klappt die Liste auf, und ganz oben steht die **Hand
(leer)**. **Mit dem Gamepad wie auf der Konsole**: linker Stick läuft, rechter
zielt, `A` benutzt, `B` oder RT schießt, die Bumper zoomen. Am Handy ist _Von
oben_ vorbelegt, mit zwei Stöcken und den Flächen `A` und `B` nebeneinander
über dem rechten Stock — und zwei Finger in der oberen Hälfte des Schirms
zoomen stufenlos.

Vorher war „2D" eine **eigene**, gemalte Kachelwelt über dem Bild — zwei
Welten, zwei Wahrheiten: Was man von oben umwarf, stand in 3D noch. Die ist
samt ihrer Spiele-Bibliothek weg; geblieben ist der Gedanke, dass ein Gitter
sagt, wo alles steht, und der wohnt im Kachelgitter der Welten. Der Weg dorthin
und zurück steht in
[docs/plan-2d-hub-interaktion.md](docs/plan-2d-hub-interaktion.md).

WebXR-Spielwiese als Basis für weitere VR-Spiele und Experimente. Seit dem
Umbau vom September 2026 stehen vier Welten darin, und das ist Absicht: Es
waren siebzehn, jede prüfte eine Sache, und wer am Kern etwas änderte, lud
siebzehn Welten hintereinander und hatte danach den Verdacht, die entscheidende
vergessen zu haben. Geblieben sind der **Hub**, der **Bauplatz**, die
**Testwelt** und **Haunting / Orbital**; alles, was die gelöschten Welten an
Rechnung mitbrachten — Kartphysik, Trefferwertung, Kletterhalt, Effektzahlen,
Türmathematik —, steht weiter als Modul da und wird von der Testwelt benutzt.

Die **Testwelt** ist der Prüfstand: zehn Zonen auf einem Gelände, in einer
Minute zu Fuß abzulaufen. Vom Startplatz mit Tor und Kleiderschrank geht es
nach Norden zu vier **Effektquellen** (Rauch, Feuer, Funken, Wasser, je ein
Knopf davor), nach Nordwesten an eine **Türwand** mit Schiebetür, Flügeltür und
Drucktür samt Knopf, Hebel und Druckplatte, nach Nordosten eine **Treppe** auf
ein Podest mit Brüstung, nach Westen in die **Navigation** (enger Gang mit
Kiste, Tür, Stachelfeld und ein roter Knopf, der einen NPC losschickt), nach
Osten auf einen **Schießstand ohne Dach** mit Scheiben auf 5, 10 und 20 m, nach
Süden auf eine **Kartbahn** mit zwei Karts in der Box — eingestiegen wird mit
`A` —, und nach Südosten an eine **Kletterwand**, an der Greifen dich hält: Der
Halt wird gerechnet, aus Material, Form, Körperhaltung und dem Verspreizen,
schlechte Griffe kosten Ausdauer, und hinunter geht es in **Sprungkissen**, die
den Fall abfedern statt ihn anzuhalten. Ganz im Norden, hinter dem Podest,
steht eine **Küche** aus den Fan-Art-Möbeln: Zeile, zwei Herde, Spüle und
Tellerausgabe an der Wand, vier Zutatenausgaben an der Westwand, eine Insel aus
Schneidebrett und Mülleimer, **zwei Bandbahnen** quer durch den Raum (was
daraufliegt, gleitet weich weiter und fährt nur los, wenn vorn Platz wird —
oder frei wird, während es fährt; die orangen **Zugbänder** holen sich
obendrein von selbst, was auf der Kachel dahinter liegt, und seit Neuestem auch
aus einer **Vorratskiste**; ein getragenes Möbel
zeigt dorthin, wohin die Figur zeigt, und der Auslöser dreht es in den Händen
eine Vierteldrehung weiter), vorn die
Ausgabetheke mit den Wärmeschirmen als Durchreiche darüber und davor der
Gastraum mit drei Tischen und der Geschirrrückgabe. **Angefasst wird mit `A`**,
und daraus wird ein **Burger**: Patty in die Pfanne (es brät, es verbrennt, und
irgendwann brennt der Herd), Salat und Tomate aufs Schneidebrett, und alles
Fertige auf ein Brötchen oder einen Teller. **Träger sind Teller, Brötchen und
Pfanne**; die Reihenfolge ist egal, Patty auf Brötchen und Brötchen auf Patty
geben denselben Burger. Verbranntes kommt auf keinen von beiden — das kippt man
in den Mülleimer. Am Brett wird geschnitten, solange man davorsteht; wer
weggeht, fängt von vorn an.

**Und seit Neuestem hört man das alles.** Das Messer schlägt im Takt auf das
Brett, die Pfanne zischt, der Hahn läuft in den Topf, die Vorratskiste klappt
auf, das verbrannte Patty meldet sich mit einem Warnton, bevor es brennt, das
Feuer knistert, der Löscher zischt, und wer ein Gericht über die Theke gibt,
bekommt eine Glocke dafür. Alles hat einen Ort: Der Herd an der Nordwand ist
leiser, wenn man am Gastraum steht, und liegt auf dem Ohr, auf dem er steht.
Nur **die eigenen Schritte hört man nicht** — sie waren ein Trommeln unter
allem, was man hören wollte.

**Zwei davon stehen noch zur Wahl**, und die Wahl steht im Schauraum: vor dem
Schneidebrett und vor der Ausgabetheke je zwei rote Knöpfe — links schaltet
den Ton weiter, rechts spielt ihn vor, und auf beiden Schildern steht, welche
Variante gerade gilt. Umgeschaltet wird die ganze Küche und nicht nur die
Vorführung. Steht die Wahl, fallen die Knöpfe wieder heraus.
An der Westwand steht dazu ein **Radio** — `A` macht es an, `A` macht es wieder
aus, und jedes Anmachen ist ein Sender weiter (drei Stück, alle
gemeinfrei). Seine Skala leuchtet, solange es läuft. Die Geräusche sind CC0 und
liegen in [`public/audio/kitchen/`](public/audio/kitchen/CREDITS.md) — mit
Herkunft, Urheber und Bearbeitung je Datei.

Östlich der Küche liegt seit dem letzten Umbau die **Werkhalle** — acht freie
Spalten, in denen eine **Bandstraße** steht, die einen ganzen **Burger Deluxe**
ohne Läufer zusammensetzt: vorn stehen vier Vorratskisten, hinten liegt der
fertige Burger auf der Ausgabe, und dazwischen fasst ihn niemand an. Vier neue
Möbel machen das möglich. Der **Kombinierer** (grün) hält, was man ihm auflegt,
und holt sich von der Seite, auf die sein Pfeil zeigt, die Zutat dazu — und er
gibt erst her, was er **selbst** zusammengelegt hat, sonst nähme das nächste
Band das nackte Brötchen mit, bevor das Patty da ist. Der **Mixer** ist ein
Schneidebrett mit Motor: Er hackt, **ohne dass jemand danebensteht**, eine Stufe
je Auflegen — eine Tomate muss also zweimal hindurch, bis Suppe daraus wird. Die
**sichere Kochstelle** (rot) ist dasselbe fürs Braten: eine freie Platte ohne
Pfanne, auf die ein Band etwas hinschieben und ein anderes es abholen kann, und
sie brät die eine Stufe und hört dann auf — hier verbrennt nichts, denn eine
Bandstraße kommt nicht zurück, um die Pfanne vom Feuer zu nehmen. Und das
**Filterband** (violett) ist ein Zugband mit Gedächtnis: Wer ihm einmal etwas
auflegt, dem zieht es danach nur noch genau das, und ein kleines Bild an seiner
Greifkante sagt, was es sich gemerkt hat. In der Halle laufen damit sechs
Spalten von selbst: Das Patty geht aus der Kiste über eine Ablage auf die
Kochstelle, ein Filterband zieht nur das **gebratene** herunter, ein Kombinierer
legt es unter das Brötchen aus der zweiten Kiste — und weiter unten kommen
nacheinander geschnittener Salat und geschnittene Tomate dazu, jede aus ihrer
Kiste durch ihren Mixer und hinter ihrem Filterband her. Der Rest der Halle ist
leer und bleibt es — dort baut man seine eigene Straße.

**Über die Theke geht nur, was auf einem Teller liegt**, und der geht mit: Ein
Gast setzt sich an einen freien Tisch, isst, und lässt dreckiges Geschirr
zurück. Das stapelt sich an der Rückgabe, wandert in die Spüle und kommt sauber
wieder — ohne diesen Kreis wäre die Tellerausgabe ein Brunnen. Brennt der Herd,
nimmt man den **Feuerlöscher** vom Hocker — er steht oben in der Zeile neben
dem Herd, also dort, wo es brennt — und **hält** ihn ins Feuer, aus zwei
Kacheln Abstand; ein Druck genügt nicht mehr. In der Brille hängt er am
Tragebügel in der Faust und spritzt dorthin, wohin die **Hand** zeigt. Und ein großer roter Knopf neben
dem Eingang schaltet den **Baumodus** ein und wieder aus; sein Schild sagt,
wohin der nächste Druck führt. Ist er an, lässt sich jedes leere Möbel aufheben,
tragen wie die Pfanne und auf einer freien Kachel wieder absetzen — der Umriss
vor den Füßen sagt vorher, ob es passt. Das Einschalten **räumt die Küche
vorher ab**: Uhren aus, Flächen leer, Topf, Pfanne und Feuerlöscher zurück an
ihren Platz. Man baut um, man kocht nicht — und aufheben lässt sich ohnehin nur,
worauf nichts mehr steht.

Woher die Möbel kommen, sagt der **Computer-Tisch** neben der Ankunft: Ein Druck
von vorn, und die Küche verblasst — man steht in einem weißen Raum, in dem alle
Möbel als Miniaturen um einen herum stehen. Eines anfassen, und man hält es
wieder in der Küche in der Hand, an genau der Stelle, an der man vor dem Tisch
stand. Ein Möbel zweimal gibt es am **Kopierer** in der Mitte: links das
Original hinlegen, rechts die Kopie abholen, und die nächste wächst sofort nach.

Getragen wird mit beiden Händen vor dem Bauch, und was in der Hand liegt, lässt
jede Ablage gelb aufleuchten, auf die es darf — der Mülleimer nimmt das
Brötchen, den Topf nicht, und vom Teller nur den Inhalt. Über die Möbel
**springt** man dabei nicht: Sie sind für die Füße so hoch wie eine Wand, auch
wenn der Tresen nur einen halben Meter misst. Östlich daneben liegt der
**Schauraum**, in dem jedes der zweiundzwanzig Möbel noch einmal einzeln und
beschriftet steht. Dazu drei **Portaltafeln**, eine davon oben auf dem Podest.

Dazu kommt
ein **Bauplatz**, in dem man die Karte vom Gürtel zieht und der Grundriss als
Miniatur vor einem hängt — eine Hand trägt sie, zwei drehen, kippen und zoomen,
und sie fällt nicht; an einer Palette tunkt man Boden, Wand oder Tür ein und
setzt sie beliebig oft, und in der zweiten Reihe liegen die **Bausteine**:
Küchenzeile, Regal, Tisch, Bank, Kisten, Säule, Geländer, Brüstung, Podest —
eine Kachel, eine Sorte, eine Blickrichtung, wie bei Minecraft. Man hält den
Trigger gedrückt und **malt** eine ganze Reihe, oder zieht **zwei Ecken** auf
und füllt die Fläche dazwischen — ein Zimmer sind damit zwei Gesten statt
sechzig Trigger. Die eigene
Spielfigur steht mit im Modell und wird einfach woandershin gestellt, drumherum
ein weißer Raum — und weggelegt steht alles in Lebensgröße um einen herum.
**Und es bleibt**: Unter _Welt sichern_ liegt eine
gebaute Welt im Browser, geht als Datei herunter (`bauplatz-2026-09-07.welt.json`,
Format `baumgartner-welt` in der Fassung `0.3.0`, mit Kacheln, Wänden, Türen,
Möbeln, Einbauten und Massen darin) und kommt so auch wieder zurück. Gebaut
wird dabei auf **Kacheln von einem Meter** — fein genug für eine Küche, in der
der Herd neben der Spüle steht —, Wände stehen auf den Kanten dazwischen, und
eine Treppe zieht sich über mehrere Kacheln, damit ihre Stufen 17,5 cm hoch und
25 cm tief bleiben. Wer in einer
fertigen Welt nur wissen will, wo er gerade ist, nimmt statt eines Grundrisses
die **Karte** aus dem Werkzeugregal: ein Blatt in der Hand mit der Umgebung von
oben, Norden oben, ein Pfeil für einen selbst und ein Punkt je Mitspieler — der
Trigger zoomt. Dazu kommt ein Werkzeuggürtel
voller Spielzeug — darunter ein **magischer Beutel** zum Hineingreifen, aus dem
Klötze, Rampen, Murmeln und ein ganzer Satz Würfel kommen, und ein **Schild**,
das man irgendwo hinstellt und mit Markdown beschriftet (Überschriften, Listen,
Bilder), das von selbst rollen kann und das alle im Raum sehen — der Aushang
für eine Lobby; getippt wird in der Brille auf Wunsch mit der **Systemtastatur
der Quest** —, **NPCs**, die
einem hinterherlaufen (Haut und Hirn getrennt gewählt, dazu Spawnpunkte und
Brutkäfige, mit Lebensbalken über dem Kopf — ein Zombie hat hundert Leben, die
Pistole macht fünfundzwanzig, das Messer fünfzig und der große Hammer hundert,
Kopftreffer vierfach; getroffen wird der Körper, den man sieht, und wer
nachsehen will, schaltet die **Trefferzonen** im Menü ein — und jede Sorte
liest dieselbe Karte mit ihren eigenen Beinen: Was der eine hochspringt, ist
für den anderen eine Wand, und wer den Sturz nicht überlebt, bleibt oben
stehen — und durch ein **Portal** fallen sie wie jede Kiste: halb hier, halb
drüben, und aus einem Sturz ins Bodenportal wird der Schwung aus der Wand) und
Peer-to-Peer-Sitzungen ohne eigenen Server — mit
räumlichem Sprach-Chat und Karts, die man gegeneinander fahren kann. Hub,
Bauplatz und Testwelt stehen auf einer Fläche bis zum Horizont und **ohne
Dach**, damit die Kamera von oben hineinsieht; steht die Figur hinter einer
Wand, wird die Wand für dieses Bild durchsichtig. Orbital schwebt mit sichtbaren Deckplatten im Weltraum, die Schwerkraft steht im Menü, und
die Stoppuhr hält die Zeit an, spult Einzelbilder vor oder lädt eine
gespeicherte Aufstellung zurück.
Unter **Menü → Grafik** steht das Häkchen **Schatten** — ab Werk an: Die
hellste Sonne der Welt wirft sie, weich und über den Kopf mitwandernd, und das
Grundlicht geht dafür etwas herunter. Es ist der erste Regler, wenn die
Bildrate klemmt. Darunter der experimentelle
**Grafik-Modus**: _Einfach_ sind flache Farben, _Comic_ zeichnet dieselbe
Welt mit **schwarzen Konturen** und Licht in Stufen. Darunter
**Brille: Auflösung** — _Voll_, _Mittel_ oder _Flüssig_, für die Bildrate im
Headset, ab der nächsten Sitzung — ganz oben die **Bildrate** selbst, live,
auch in der Brille, und als Häkchen **Bildrate im Bild** das kleine Feld unten
rechts, auch am Handy —, das Häkchen **Gitterlinien**, das die Kacheln der
Ebene einblendet, auf der man gerade steht, und das Häkchen **Hitboxen**, das
die Körper der Physik als Drahtgitter **über** alles andere legt: jeden Kasten,
jede Kapsel, jede Wand — und, in Grün, den Kreis um den Spieler, der von oben
zeigt, wie breit er wirklich ist. Was man sieht, ist nämlich nicht, woran man
hängen bleibt. Daneben liegt
**Aussehen**: Die Figur ist ein **Koch wie bei Overcooked** — runder Rumpf,
großer Kopf mit Augen und Nase, zwei schwebende Hände, keine Arme und keine
Beine, weil von zwölf Metern Höhe ein Skelett nur zwei graue Striche ist. Drei
Zeilen stellen sie ein: vier **Köpfe**, acht **Hüte** von der Kochmütze bis zur
Krone und fünf **Kochjacken**. Alle drei gehen über das Netz, alle im Raum
sehen, als was man herumläuft — und wer lieber vor einem Spiegel wechselt,
stellt sich an den **Kleiderschrank**: Ein Druck auf `A`, und die Welt verblasst
— man steht in seinem Schrank, die siebzehn Sachen stehen greifbar um einen
herum, und der Spiegel an der Tür zeigt sofort, wie es an einem aussieht. Noch
ein Druck auf den Schrank, und man steht wieder da, wo man stand.
three.js + TypeScript + Vite, ohne externe Assets — alles wird prozedural
gebaut.

### Haunting / Orbital — eine Quest, zwei Handys

Eine beschädigte Raumstation, eine Dreiercrew und drei ausgefallene Systeme.
Der **Außentechniker** erkundet die Station in VR. Die drei Plätze in der
Zentrale sehen dieselbe Karte, jeder mit anderen Schichten darauf — und was
darauf fehlt, ist bei jedem die halbe Rolle. Das **Archiv** sieht die ganze
Station mit der Fracht, einer Linie von jeder Kiste zu ihrer Konsole und einer
Raumakte je Zimmer (Codes groß) — aber **niemanden, der sich bewegt**. Die
**Schalttafel** sieht die Station als Grundriss und schaltet darauf: Tür
antippen sperrt oder gibt frei, Lampe antippen schaltet Licht — **Wesen zeigt sie keine**, wer eine
Tür zuwirft, weiß also nicht, wen er einsperrt. Dazu hat sie die **Tafel**:
ein Blatt über der Karte mit einer Zeile je Schalter, so beschriftet, wie es
an der Wand steht — „Licht Kombüse", „Tür 3", „X". Die Karte weiß, _wo_ etwas
ist; die Tafel weiß, _was_ es überhaupt gibt. Der **Späher** bekommt alle
dreieinhalb Sekunden **eine Peilung**: einen grünen Punkt für den Techniker,
einen roten für das Monster, genau dort, wo sie in dem Moment waren —
dazwischen verblassen sie, und niemand weiß, was inzwischen passiert.
**Die Station ist dunkel**, und sie bleibt es, wenn niemand schaltet: Es geht
nirgends von selbst Licht an. Die Schalttafel kann höchstens **zwei Lampen
gleichzeitig** brennen lassen — die dritte macht die älteste aus —, und keine
hält länger als eine halbe Minute: Sie flackert, sirrt und geht aus. Geräuschköder
gibt es nicht mehr; sie haben das Monster in eine Ecke geparkt statt einen Zuruf
wert zu sein. Die Schalter für Licht und Schotts auf der Tafel sind **doppelt so
groß** wie früher, eine Zeile je Schalter: Man trifft sie im Dunkeln mit dem
Daumen. **Wohin ein Ersatzteil muss, erfährt das Archiv erst, wenn der
Techniker es in der Hand hat.** Wer im
Dunkeln steht, hat die Taschenlampe. Der **Zuschauer** ist der einzige Platz
ohne Karte: Er sieht die Station in 3D, von schräg oben, ohne Decke — und
sagt dafür nichts. Er kann dabei in jeden anderen Platz hineinsehen, ohne ihn
zu besetzen.

**Gemeinsam starten:** Auf allen Geräten dieselbe Adresse mit `#haunting`
öffnen — sie zeigt die **Startseite der Runde**, in zwei Schritten. Erst die
**Lobby**: Name und Raum-Code eintragen, **Verbinden**; wer denselben Code
eingibt, steht dann bei allen in der Liste (Name und Gerät). Dann drückt jeder
denselben Knopf, und alle bleiben in diesem Raum. Wohin er führt, steht schon
oben auf der Seite: **mit Brille** heißt er **Enter VR** (der Techniker im
Anzug), **am Bildschirm** heißt er **Beitreten** — und ob das **Web 3D** ist
(der Techniker am Bildschirm, im Schiff) oder die **2D Einsatzzentrale** (Handy
oder Laptop: Archiv, Schalttafel, Späher, Zuschauer oder Monster — die Karte
der Station), sagt die Wahl **„Von oben"** oder **„Aus den Augen"**; am Handy
ist _Von oben_ vorbelegt. Die Zeile unter dem Knopf sagt es vor dem Drücken. In der Zentrale erst die Tafel
einstellen, dann **Rollen testen** — über der Karte nimmt man seinen Platz
über die Reiter; ein **Ich** auf der Tafel gibt es nicht. Wer über **Enter VR** oder
**Web 3D** kommt, steht sofort im Anzug: Die Techniker-Zeile der Tafel zeigt
seinen Namen, die Zentrale sieht ihn auf der Karte, und ihr „Mission starten"
schickt den Start zu ihm. Wer in der Quest im Hub **Haunting /
Orbital** wählt, kommt ebenfalls in den Raum der Adresse. Wer in der Brille
im Boden steckt, holt sich am Handgelenk heraus: Menü → **Feststecken? Zurück
auf den Boden** setzt einen mitten ins eigene Zimmer, draußen in die Zentrale.
Ein weiteres Telefon kann das **Monster** spielen:
Es sieht nur, was das Monster sieht und hört, und steuert es mit Stock und
einem Knopf — zugeschlagen wird von selbst, wer in Reichweite steht; der Knopf
gilt dem nächsten Ding, das die Karte hervorhebt (Klappe, Kabine, gesperrte
Tür) — auch dann, wenn der Techniker die Station am Bildschirm spielt. Für
eine eigene Gruppe auf allen Geräten denselben Raum-Code
eintragen — oder gleich den Link `?room=euer-gruppenname#haunting` teilen, der
ihn vorausfüllt; ein getippter Code wandert beim Verbinden selbst in die Adresse.
Ohne Code ist der Raum `haunting`. Die Verbindungsanzeige nennt Raum und Gegenstellen. Nach einem
Update alle Geräte neu laden, damit sie dieselbe Protokollversion verwenden.

Es sind keine Konten erforderlich. WebRTC nutzt öffentliche Signalisierung und
STUN, auch im selben WLAN. Internetspiele funktionieren bei direkt erreichbaren
Peers; restriktives NAT oder gesperrte öffentliche Dienste können ohne TURN
eine Verbindung verhindern. `?net=local` verbindet ausschließlich mehrere Tabs
desselben Browsers, keine getrennten Geräte im WLAN.

**Die Mission:** Jede Runde fängt im **Aufbau** an — auf dem Handy die erste
Seite, in der Brille der Knopf am Handgelenk. Er ist kurz:

1. **Kein Häkchen.** Ob du das Schiff von oben oder aus den Augen siehst,
   ist keine Frage des Aufbaus: Das ist _Menü → Ansicht_, wie in jeder Welt,
   und du darfst es dir mitten in der Runde anders überlegen (in der Brille
   gibt es immer das Schiff). Ohne Monster spielt man, indem der Platz
   Monster auf „Aus" steht.
2. **Die Verteilung.** Techniker, Monster und die drei Fähigkeiten der
   Einsatzzentrale, jede auf Bot, Mensch oder Aus. Wer _du_ bist, steht hier
   nicht — das wählst du über der Karte.
3. **Rollen testen.** Der Knopf führt auf die Karte, **ohne dass eine Runde
   losgeht**: Die Station ist hell, keine Uhr läuft, niemand wird getroffen,
   und jeder darf jede Rolle. Über der Karte steht ein Kopf: die Rollen als
   Reiter (Techniker, Rot, Gelb, Blau, Monster, Zuschauer), das Zahnrad, und
   die Leiste mit Systemen, Anzug und — sobald sie läuft — der Uhr. Der
   Reiter **Techniker** setzt dich an den Stock: Du stehst im Schiff am
   Bildschirm — von oben oder aus den Augen, wie _Menü → Ansicht_ steht — und
   läufst los. Das Monster bewegt sich im Test nur, wenn ein Mensch es
   steuert.
4. **Mission starten** — im Zahnrad über der Karte des Telefons, in der
   Tafel des Technikers oder gleich im Aufbau, für den, der nicht erst
   testen will. Erst dann läuft die
   Uhr, das Licht geht aus, das Monster los — auf derselben Station.
   **Mission stoppen** im selben Zahnrad führt zurück in den Test, **Zurück
   zu den Rollen** in den Aufbau. **Steckt der Techniker schon in der Brille,
   drückt ihn die Zentrale trotzdem**: Die Verteilung und der Start gehen
   dann als Wunsch zu ihm, die Runde beginnt bei ihm, und die Tafel steht auf
   allen Geräten gleich — er muss dafür nicht ans Handgelenk. Nur eine Runde,
   die schon läuft, bricht der Knopf nicht ab. Und wer später dazukommt,
   bekommt Runde und Tafel, wie sie gerade stehen, und nimmt sich einen freien
   Platz. **Steht auf der Tafel „Techniker: Mensch" und niemand hat den
   Reiter genommen, läuft kein Bot an seiner Stelle** — die Mission wartet,
   bis jemand den Stock nimmt oder die Tafel den Platz einem Bot gibt.

**Die Rolle wählst du über die Reiter über der Karte**: _Techniker_, _Rot_,
_Gelb_, _Blau_ (jeder Stuhl mit dem Namen seiner Fähigkeiten), dann Monster
und Zuschauer. Wer noch nichts
gewählt hat, liest „Bitte wähle über den Tab oben deine Rolle aus."; wer einen
Stuhl antippt, nimmt ihn — und dem, der ihn hatte, wird er
abgenommen. Mitten in einer Mission darf das nur, wer in der Einsatzzentrale
sitzt; im Test jeder; der Techniker in der Brille behält seine Rolle immer. Geht gerade keine Runde los, weil
ein anderes Gerät sie rechnet oder schon jemand als Techniker spielt, steht
das im Eintrag selbst. Die feste Skeld-Karte enthält 14 benannte Räume in der
Anordnung der Vorlage: Cafeteria oben, Triebwerke/Reactor/Security links,
Weapons/O2/Navigation rechts, Storage unten und die dazwischenliegenden
Nebenräume. Eine Kachel ist ein Meter: Die meisten Räume messen 10 × 10
Meter, Cafeteria (20 × 18) und Storage (15 × 12) sind größer, die Gänge sind
zwei Meter breit, und jede Tür ist eine ganze Kachelkante (1 m) ohne Pfosten.
Die Konturen sind rechtwinklig, noch ohne 45°-Wandelemente.
Seeds verändern Aufgaben und Einrichtung, nicht Raumnamen oder Grundriss.
Modelle und Raumgestaltung verwenden eigene Assets.
Antrieb, Nahrungsversorgung und Notsignal müssen repariert werden. In jedem
Raum stehen **zwei bis drei Frachtkisten**, jede mit Farbband und Nummer
beschriftet („Kiste 2 · blau") — am Modell wie auf der Karte, immer lesbar.
Die drei Ersatzteile liegen in dreien davon, vier weitere halten Werkzeug, und
der Rest ist leer. **Wer weiß, welche die richtige ist, hängt daran, wer am
Archiv sitzt:** Ist es ein Bot, leuchtet die richtige Kiste selbst — mit einem
gelben Saum. Sitzt dort
ein **Mensch**, sieht der Techniker nur noch den **Raum** leuchten; welche
Kiste darin es ist, weiß das Archiv als Einziges und sagt es an: „Kiste 2,
blaues Band · Nordwand". Wer ohne diese Ansage sucht, öffnet Kisten — oder
nimmt das Röntgengerät, das Kennzeichen und Raum der nächsten vollen Kiste
nennt — und jede offene Kiste macht Geräusch. Der Techniker öffnet die Kiste,
nimmt den Gegenstand und entriegelt den passenden Wartungskasten. Dort werden
Kabel nach Symbolen verbunden, eine Schaltfolge eingegeben oder drei Frequenzen
eingestellt. Anschließend geht es zum nächsten Auftrag. Nach allen drei
Reparaturen zur Zentrale zurückkehren.

**Ein Ersatzteil auf einmal.** Der Techniker trägt es in der Hand — in der
Brille wirklich in der rechten —, und solange er es hat, geht keine zweite
Kiste mit einem Teil heraus: erst abliefern oder ablegen. Ablegen geht
jederzeit (Knopf **Ablegen** in der Tafel des Technikers); das Teil bleibt
liegen, wo er stand, und lässt sich mit Benutzen (`A` am Pad, `E` an der
Tastatur) wieder aufnehmen. Ohne Teil in der Hand bleibt die Abdeckung des
Wartungskastens zu. **Die Taschenlampe kann er nie verlieren:** Sie hängt von
Anfang an in beiden Holstern und steht im Werkzeug-Knopf unten rechts —
ausmachen darf er sie, das macht ihn schwerer sichtbar.

**Wer spielt mit:** Die Tafel des Aufbaus, am Telefon wie in der Brille — Techniker (Mensch
oder Bot; steht jemand mit der Brille im Raum, heißt die Zeile **VR** und
gehört ihm), Monster (Mensch, Bot oder aus) und die **drei Fähigkeiten der
Einsatzzentrale** — Späher, Schalttafel, Archiv —, jede auf **Bot, Mensch oder
Aus**. Wer am Telefon sitzt, nimmt sich über die Reiter oben so viele davon,
wie er mag; wie die Mischung heißt, steht daneben: Späher + Schalttafel ist die
**Einsatzkontrolle**, Archiv + Späher die **Aufklärung**, Archiv + Schalttafel
der **Leitstand**, alle drei die **Zentrale**. So passt die Runde auch zu
dritt, wenn nur zwei in der Zentrale sitzen. Unter jeder Fähigkeit steht, wer
sie wirklich hält. **Ein Bot auf einer Fähigkeit gibt sie dem Techniker
selbst:** Der Archivar aus Zahlen funkt ihm Fundort und Ziel, die richtige
Kiste leuchtet, und der Kompass zeigt hin. **Gewollt gesperrt ist immer nur eine Tür, und sie hält, bis sie
von selbst fällt** — acht bis zehn Sekunden, mit rotem Balken über der Tür;
solange lässt sich weder sie wieder öffnen noch eine zweite sperren, und der
Schalter sagt, warum. Das gilt im Test wie in der Mission. Türen, die das
Monster zuschlägt, gehen nach zwanzig Sekunden von selbst wieder auf oder
vorher durch die Schalttafel.

**Ein Riegel, der gefallen ist, bleibt vierzig Sekunden offen.** Die Tür wird
dabei **grün, blinkt** und zählt herunter — auf der Karte läuft derselbe
Balken wie beim Halten, nur grün statt rot, und das Blatt zuckt im
Sekundentakt in Grün. So lange lässt sie
sich nicht wieder verriegeln, und das ist Absicht: Sonst wurde aus dem Riegel
das Spiel „ich schließe immer die Tür vor dem Monster", und das Vieh stand
fest. Dazu kommt, dass es lieber **zieht** als läuft: Steht ein Umweg von mehr
als ein paar Sekunden gegen den Riegel, geht es an die Tür und reißt sie auf —
und danach ist sie vierzig Sekunden lang keine Tür mehr, sondern ein Weg.

**Und ab und zu fährt ein Schott von selbst auf**, für zwei, drei Sekunden,
ohne dass jemand davorsteht — ein Stationsfehler. Ein Blatt, das sich bewegt,
hieß sonst immer „da ist jemand", und daran hatten sich beide Seiten gewöhnt.
Gesperrte Schotts sind nie dabei, und beim Zufahren bleibt das Blatt auf,
solange jemand im Durchgang steht.

**Die Einsatzzentrale ist sicher.** Das Monster kennt sie nicht — sie steht
nicht auf seiner Karte: Es patrouilliert nicht dorthin, sucht dort nicht und
folgt auch niemandem hinein. Der Techniker läuft weiter hinein und hinaus.
Und wer die Brille trägt, sieht die Crew dort sitzen: jeder auf dem Hocker
seines Geräts am Tisch vor der Scheibe — Rot, Gelb, Blau, das Monster —, die
Zuschauer und wer noch keinen Platz hat in der Reihe dahinter. Niemand aus
der Zentrale steht als Spieler mitten auf dem Vorplatz.

**Von oben ist dasselbe Schiff.** _Menü → Ansicht_ schaltet jederzeit
zwischen _Von oben_ und _Aus den Augen_ um, ohne Neustart und ohne neue
Rolle: dieselbe Runde, dieselbe Uhr, derselbe Anzug, dasselbe Monster. Von
oben hängt die Kamera schräg über der Figur, schneidet die Decke ab, macht
Wände vor der Figur durchsichtig und zeichnet auf Wunsch die Kacheln; die
Figur läuft in Weltrichtungen, zwei Finger zoomen, und `A` benutzt, was vor
ihr steht. **In der Brille gibt es nur das Schiff.** Die gemalte 2D-Welt —
das Brettspiel von oben mit eigener Runde darin — gibt es seit dem
1-m-Gitter nicht mehr; die Zentrale am Telefon zeichnet weiter ihre Karte.
Wandert die Technikerrolle mitten in der Runde zu jemand anderem, übergibt das
alte Gerät dem neuen die ganze Runde, und zwar mitsamt allem, was sonst nur der
eine Rechner wusste — Sperrfristen, Lampenrestzeiten und das Gedächtnis des
Monsters.

**Wer zuschaut**, sieht im Schiff der Bot-Runde zu: Die Kamera folgt dem
Techniker aus Zahlen (von oben steht die Figur auf ihm), **Freie Kamera**
lässt einen selbst durch das Schiff laufen, **Bot folgen** holt einen zurück.
Am Telefon hat der Zuschauer seine Linse mit einem Stock zum Fliegen und
kann in jeden Platz hineinsehen. Die Sicht der Plätze Rot, Gelb und Blau
wählt man über die Reiter über der Karte des Telefons — auch während eine
Runde läuft.

**Die Handyansichten:** Alle drei zeichnen dieselbe Karte der Station,
jede mit eigenen Schichten. Beim **Archiv** liegt die ganze Station darauf,
mit Fracht und Konsolen. **Wohin das Teil muss, erfährt das Archiv erst, wenn
der Techniker es in der Hand hat:** Dann führt eine gestrichelte Linie zur
Konsole, und am Ziel steht „hierher". Legt er es irgendwo ab und lässt es länger
als fünf Sekunden liegen, meldet das Archiv, in welchem Raum es liegt. Ein Tipp auf ein Zimmer schlägt die **Raumakte** auf — ganzseitig, die Karte
ist so lange weg, und „Karte" bringt sie zurück: Codes groß, Fundhinweise,
Türen — und ein Bild des Raums, die Draufsicht der wirklichen Welt mit
Zoom und Wisch. Live-Positionen zeigt
es keine, Lampen auch nicht. Die **Schalttafel** zeigt
den Grundriss ohne Wesen und schaltet Türen und Lampen per Tipp — eine Lampe
ist ein Kreis in der Zimmermitte, gelb, wenn sie brennt; eine Schalterliste
gibt es nicht, und ein Schott, das gerade abkühlt, sagt es beim Tipp. Der
**Späher** zeigt zwei Punkte
und sonst nichts. Der Kopfbereich bietet einen
sichtbaren Rollenwechsel.

**Wer blutet, wird verfolgt.** Ein Treffer reißt eine Wunde, und die blutet
zwei Minuten lang: Wer sich danach bewegt, hinterlässt alle anderthalb Meter
einen dunkelroten Tropfen, einen flachen Fleck auf dem Blech. Nach gut einer
halben Minute ist ein Tropfen verblasst,
wer stehen bleibt, hinterlässt fast nichts. Das Monster **sieht nicht**, wo die
Spur liegt; es findet sie nur, wenn es im selben Raum darüberläuft — dann
allerdings liest es daraus, in welche Richtung es weitergehen muss, und sucht
dort statt irgendwo. Nach einem Treffer lohnt sich also ein Umweg: Die Spur
verrät nicht nur, dass man da war, sondern wohin man gelaufen ist.

**Überleben und beobachten:** Drei Treffer beenden die Runde; nach jedem
Treffer gibt es drei Sekunden Schutz. Ein gefundenes Medkit heilt einen
Treffer. Tod und Sieg zeigen eine klare Meldung mit **Neu starten**, auch im
Headset. Ein Schutzschrank lässt sich ohne Code betreten — ein Druck auf das
Tastenfeld hinein, ein zweiter heraus; am Bildschirm ist das Benutzen (`A`,
`E`). Die Bedienung setzt voraus, dass man sich im Raum des
Schranks befindet; durch eine Nachbarwand lässt er sich nicht benutzen.
Reißt das Monster einen Schrank auf, ist er für den Rest der Runde ein
funkendes Wrack: Niemand kommt mehr hinein, und es gibt ein Versteck weniger.
Der Sauerstoff reicht zehn Minuten und läuft gleichmäßig ab; keine Reparatur
füllt ihn auf. Uhr und Anzug-Leben stehen bei allen Mitspielern in der Leiste
und beim Techniker im Blickfeld. **Die Aufträge stehen dort nur, wenn er
allein spielt:** Sitzt am Archiv ein Mensch, sieht der Techniker im Blickfeld
nur Uhr und Anzug — wohin er muss, sagt ihm der Archivar, und wo er ist, sagt
er dem Archivar. Spielt niemand dort mit, übernimmt der Bot die Ansage, und
dann steht unter der Uhr wieder die gewohnte Zeile: drei Kreise für die
Aufträge und der nächste offene im Klartext.

Die bestehende **Taschenlampe** hängt von Anfang an in **beiden** Holstern des
Werkzeuggürtels und kann nicht verloren gehen. Die
schwebende Ersatzlampe in der Zentrale kann auch am Desktop mit `E` oder Klick
aufgenommen werden. **Radar** und **Röntgengerät** sind echte greifbare
Werkzeuge mit demselben Scannergehäuse und seitlicher Gürtelablage. Radar zeigt
nahe Bewegung, Röntgen die vollen Kisten in der Nähe — es blendet ihr
Kennzeichen ein und nennt nie den Inhalt; leere meldet es gar nicht.
Anzeigen erscheinen auf dem benutzten Gerät; ein dauerhaftes Radar-/Sensor-HUD im VR-Blick gibt es nicht.

Über jedem Schott zeigen Leuchten auf beiden Seiten seinen Zustand: **grün**
bedeutet betriebsbereit und öffnet beim Annähern, **rot** bedeutet gesperrt.
Ein belegter Durchgang bleibt offen, bis er frei ist. Die Tür zum Übungsdeck
startet oder ersetzt keine Mission; Tests werden am Terminal gestartet.

Schon nach etwa einer Sekunde Rennen beginnt der Atem am unteren Visier zu
kondensieren: weiche Wolken im Atemtakt und feine Tropfen auf dem Glas. Nach
vier Sekunden ist die Anstrengung voll aufgebaut, nach etwa fünf Sekunden
Gehen/Stehen wieder abgebaut.

**Und die Puste ist jetzt eine echte Grenze.** Der Sprint hält **fünf
Sekunden**; danach fällt das Tempo auf einen Trab, der immer noch schneller ist
als Gehen, aber langsamer als ein jagendes Monster. Beim Gehen füllt sich die
Puste in etwa acht Sekunden wieder auf. Wer getroffen wird, bekommt
anderthalb Sekunden Sprint geschenkt, die nichts kosten — gerade genug für eine
Tür. Eine gerade Flucht endet damit nach ungefähr zwanzig Sekunden; wer
entkommen will, braucht einen Riegel, eine Ecke, einen Schutzschrank oder einen
Wartungsschacht. Als Vergleich für kurze Belastungsintervalle dient
[Phasmophobias Exposition-Update von 2021](https://store.steampowered.com/news/posts/?appids=739630&enddate=1631960314&feed=steam_community_announcements)
mit drei Sekunden Sprint und fünf Sekunden Erholung.

Die Gegner unterscheiden sich weiterhin in Bewegung, Wahrnehmung und
Schachtverhalten. Schritte und eine eingeschaltete Taschenlampe können den
Techniker verraten; nach verlorenem Sichtkontakt wird die letzte bemerkte
Position abgesucht. **Die Mikrofon-Gegnerreaktion kommt nicht ins Spiel und
wurde entfernt.** Sprache beeinflusst das Monster nicht. Der davon unabhängige
optionale Sprachchat bleibt erhalten. **Gegneridentifikation über EMF,
Temperatur, Audio-Logger und ein Anomalienjournal ist vorerst gestrichen.**

**Am Desktop testen:** In der Geräteübersicht **Als Techniker am Desktop
testen** wählen. Zum Umsehen ins Bild klicken; `Esc` gibt den Mauszeiger frei.
Die Interaktionsanzeige nennt das anvisierte Objekt in Reichweite.

| Aktion                                                   | Tastatur / Maus                                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Laufen und umsehen                                       | `WASD` und Maus; `Shift` zum Rennen                                                                                 |
| Schrank öffnen, Sache aufnehmen, Konsole aufmachen      | `E` (am Pad `A`) — der gelbe Saum zeigt, was gemeint ist; Anvisieren und Linksklick gehen daneben weiter           |
| Werkzeug wechseln                                        | `Tab` oder der runde Knopf unten rechts: Taschenlampe, Radar, Röntgengerät, Medkit, leere Hand                     |
| Medkit verwenden                                         | Im Werkzeug-Knopf wählen und `E` drücken                                                                            |
| Taschenlampe an und aus                                  | `E`, wenn nichts zum Benutzen vor dir liegt                                                                         |
| Ducken                                                   | `Ctrl` halten oder **Ducken** in der Tafel                                                                          |
| Ersatzteil ablegen                                       | **Ablegen** in der Tafel                                                                                            |
| Leistungsanzeige                                         | `F3` oder Menü → Grafik → _Bildrate im Bild_ (auch am Handy); in der Brille steht dieselbe Zahl unter Menü → Grafik |

**Am Bildschirm ist die Steuerung die der Seite, wie in jeder Welt**: auf dem
Handy der Bordstock links und `A`/`B` rechts, am Laptop `WASD`, Maus, `E`.
Was `A` gerade meint — Kistenklappe, Konsole, Tastenfeld, Türtafel, das
liegende Teil —, trägt einen gelben Saum; der runde Werkzeug-Knopf unten
rechts wählt Taschenlampe, Radar, Röntgengerät oder Medkit. Über den Stock
geht es mit Arbeitstempo los; jenseits des äußeren Rings wird gerannt. In der
Brille gibt es Zeiger, Trigger und `A`.

**Und wenn nichts vor dir liegt, ist Benutzen der Lichtschalter.** Die Lampe
bleibt dabei in der Hand; sie auszumachen ist eine Entscheidung, keine leere
Hand, denn das Monster sieht eine brennende Lampe weiter als dich. In der
Tafel steht, ob sie gerade brennt.

**Der obere Rand gehört auch im Schiff dem Spiel.** Die Kopfzeile der Seite
(Menü, Verbindung, VR) ist hier ausgeblendet und kommt beim Verlassen zurück;
oben stehen der Kompass und darunter die Tafel des Technikers, unten in der
Mitte der Streifen mit Sauerstoff, Anzug und Aufträgen. Die Tafel ist nur so
hoch wie das, was darin steht, und
**lässt sich zuklappen**: „Zuklappen" räumt sie weg bis auf die Titelzeile mit
Anzug, Systemen und Sauerstoff — daneben bleibt das **⚙ Optionen** stehen, und
darin führen **Menü**, **Verbindung** und **VR** dorthin, wo sonst die
Kopfzeile hinführte.

In VR werden dieselben Objekte mit dem Zeiger und Trigger bedient. Unter
**VR-Komfort** lassen sich schrittweises oder fließendes Drehen, ein optionaler
Komfortrand bei künstlicher Bewegung und Controller-Vibration einstellen.
Diese Einstellungen bleiben lokal auf dem Gerät.

**Ohne Angst ausprobieren:** **Test ohne Monster** startet eine unverwundbare
Runde ohne aktiven Gegner. Das bleibt bei **Testlicht aus** so: Die Station
wird dunkel, Raum- und Umgebungslicht gehen aus, und die Taschenlampe wird
benötigt. Im normalen Betrieb erhalten eingeschaltete Decks etwas indirektes
Licht, damit Gehäuse und Wege erkennbar bleiben; stromlose Räume bleiben dunkel.
Die einzelnen Übungsräume haben ihr eigenes lokales Licht.

Der Testschrank enthält die Ausrüstung und Missionsgegenstände. Über den
Testdeck-Aufzug oder **Testdeck: einzelne Übungsräume** erreicht man vier
separate Räume abseits der Missionskarte:

- **Safe und Schutzschrank:** Links steht die Anleitung mit dem Code, daneben
  der echte bedienbare Schutzschrank.
- **Ausrüstung und Scanner:** Gegenstände aufnehmen, Hände wechseln und einen
  geschlossenen Container mit Röntgen untersuchen.
- **Reparaturen und Rätsel:** Drei voneinander unabhängige Übungen mit Lösungen
  daneben. Ein gelöstes Display erneut drücken setzt die Übung zurück; der
  Missionsfortschritt bleibt dabei unverändert.
- **Modelle, Schotts und Effekte:** Einzelne Module mit Maßangaben, harmlose
  Gegnerattrappen, Spiegel, Schacht und Funken-/Rauch-/Feuerprüfung.

Jeder Übungsraum hat Rückkehr- und Wechselknöpfe. Testbesuche in Missionsräumen
verwenden freie Ankunftsplätze.

**Zuschauen** (im Optionsmenü der laufenden Runde, in der Brille auch im Menü —
und zwar immer) heißt: der Runde folgen, die im Raum wirklich läuft. Spielt
jemand im Schiff, siehst du **ihn** auf der Karte des Telefons: dieselbe
Station, dieselben Türen, dasselbe Monster, mit der Linse des Zuschauers und
dem Modus „Alles sehen". Eingaben hast du keine; ein Zuruf von dir beendet
die Runde schneller als das Monster.

Am **Zuschauerplatz der Zentrale** wählst du dazu, **wessen Platz** du gerade
ansiehst — Deck (das ganze Schiff von schräg oben, ohne Decke), Archiv,
Schalttafel, Späher oder Monster —, und das mitten in der Runde: Du siehst
genau das Bild, das der andere vor sich hat — seine Karte, seine Akte, seine
Tafel —, aber nie seine Knöpfe. Über dem Deck folgt die Kamera auf Wunsch
dem **Techniker** oder dem **Monster** oder bleibt frei. Ein Schalter
**„KI-Absichten"** legt offen, was das Monster denkt: die Zimmer, in denen es
dich vermutet, eingefärbt nach seiner Sicherheit, der gestrichelte Weg, den es
dich laufen sieht, und die Tür, an der es dich abfangen will — mit beiden
Ankunftszeiten („M 3,2 s / T 4,0 s") und dem Namen seiner Haltung. Das gibt es
**nur beim Zuschauen**; wer mitspielt, sieht davon nie etwas.

Läuft im Raum gar keine Runde, springt „Zuschauen" wie bisher als Vorführung
ein: Ein Techniker aus Zahlen läuft durch die echte Station, öffnet
Frachtschränke, holt die drei Ersatzteile, löst die Reparaturen und kehrt zur
Zentrale zurück. Lokale Meldungen erklären seine Schritte. Gesperrte Wege
halten ihn auf, bis eine Route wieder möglich ist. Der Techniker priorisiert
Überleben: Er unterbricht Arbeit, sprintet mit Erholung zu erreichbarer Deckung,
versteckt sich ungesehen in einem Schutzschrank und setzt anschließend die Mission fort.
Der sichere Test bleibt dabei ohne Schaden.

**Das Monster hat sechs Haltungen** und darüber die Verfolgung: _Patrouille_
(zügig von Raum zu Raum — und zwar dorthin, wo es am längsten nicht war),
_Seitenwechsel_ (nach mehreren erfolglosen Zielen quer über die Karte),
_Auflauern_ (stehen bleiben und warten, an einer **Tür** statt mitten im
Raum), _Absuchen_, _Abfangen_ und _An der Tür lauern_. Es **rät nicht mehr**,
wohin sein Gegenüber verschwunden ist: Es führt ein Bild davon, wo es ihn
vermutet, streicht die Räume heraus, die es selbst abgesucht hat, rechnet
Geräusche ein und sucht dort, wo es am wahrscheinlichsten ist. Aus den letzten
Sichtungen schätzt es Richtung und Tempo und rechnet für die Türen vor ihm aus,
wer zuerst dort ist — passt es, läuft es nicht hinterher, sondern **kürzt ab**
und steht in der Tür. Glaubt es, sein Gegenüber sitze in einem Raum mit nur
einem Ausgang, stellt es sich davor und wartet, aber nie länger als ein paar
Sekunden. Beim Absuchen geht es leise hinein, macht dort Klack-Geräusche,
öffnet manchmal den Schutzschrank und reißt ihn dann auf, weil es dort
jemanden vermutet — ob jemand drin ist oder nicht — oder lässt den Raum stehen
und geht gleich weiter. Hat es jemanden in eine Kabine flüchten **sehen**, geht es hin,
**schreit davor** als Ankündigung, reißt sie mit Rauch und Funken auf und
bleibt danach kurz stehen, um Vorsprung zu gewähren. Bei einer Verfolgung hört
man den eigenen Herzschlag, schneller und lauter, je näher es kommt; je länger
die Jagd ohne Sichtabriss läuft, desto näher kommt es seinem Höchsttempo. Ein
Monster **geht schneller als ein Spieler geht** und **rennt langsamer, als ein
Spieler rennt** — wer nur spaziert, wird eingeholt; wer rennt, kommt davon,
solange die Puste reicht.

**„Zuletzt gesehen."** Beide Seiten spielen gegen jemanden, den sie fast nie
sehen — deshalb merkt sich jede, wo sie den anderen zuletzt gesehen hat. Der
Marker steht als **gestrichelte Silhouette** dort, wo der andere war, mit dem
Blick, den er dabei hatte, und verblasst über eine knappe halbe Minute; in der
Brille ist es eine halbdurchsichtige Kopie des Monsters, die wirklich im Raum
steht. Er läuft **nicht mit**: Wer weiß, dass sein Verfolger einen alten Punkt
hat, läuft woandershin. Man sieht immer nur den Marker des _anderen_, und nur
solange man ihn nicht wirklich sieht; wer das Monster spielt, liest dazu auf
der Karte „Zuletzt gesehen: Werkstatt · vor 6 s". Nur beim **Zuschauen**
(„Alles sehen") stehen beide Marker blass neben den echten Figuren — dort will
man ja gerade sehen, was die beiden voneinander glauben.

**Eine fertige Reparatur bleibt nicht unbemerkt.** Die Konsole fährt hoch, die
Sicherung fällt, im Modul flackert das Licht — das Monster weiß danach, in
welchem Raum eben jemand gearbeitet hat, und legt für ein paar Sekunden
merklich zu. Es sieht nicht durch Wände; es hat nur gehört, was die halbe
Station gehört hat. Schächte durch gemeinsame Wände benutzt es weiterhin.

**Zeitraffer, Regler und Training.** In der Bot-Runde laufen ×2, ×4, ×8, ×12
und ×16 (beschleunigt wird über die Zahl der Bilder, nicht über ihre Länge);
eingestellt wird das im Optionsmenü des Schiffs. Die
Beleuchtung schaltet zwischen voller Beleuchtung, Wachbetrieb,
Alarmbeleuchtung und Notstrom — im Alarm drehen sich rote Leuchten in den
Gängen. Unter **Bots justieren & trainieren** stehen alle Gewichte beider Bots
als Regler, dazu drei Knöpfe: _Monster trainieren_, _Techniker trainieren_,
_beide_. Das Training spielt hunderte Runden ohne Bild aus und sucht Gewichte, mit
denen eine Runde so ausgeht, wie sie ausgehen soll: **zu zweit** (Techniker
gegen Monster) halbe-halbe, **ab drei Spielern** zwei von drei Runden für das
Monster. Den Unterschied macht die Tür hinter dem Techniker — allein schlägt
er sie selbst zu, im Team muss er es der Schalttafel sagen, und der Zuruf
braucht ein bis zwei Sekunden. Das Training rechnet zwischen den Bildern
weiter und friert den Tab nicht ein.
Cyan zeigt den Technikerweg und Rot den Monsterweg.
Zielringe markieren die jeweiligen Ziele. Cyan/rote Flächen zeigen die an echten
Wänden und Einrichtungen abgeschnittenen Blickfelder. Orange zeigt den maximalen
Hörbereich für Sprintgeräusche: Schall folgt Stationsboden, wird durch Türen und
angrenzende Wände gedämpft und überquert keine leeren Raumlücken. Langsames Gehen
und Ducken sind leiser. Aktuelle KI-Absichten stehen unter der Legende. Die Linien lesen die tatsächlich
verwendeten Navigationswege. Das lokale Funkprotokoll zeigt Raumwechsel des
Technikers an die Zentrale sowie die Archivhinweise. Es ist keine autonome
Dreiercrew und kein zusätzlicher Sprachchat.
**Bot-Runde.** Am Bildschirm folgt die Kamera dem Bot — von oben steht die
Figur auf ihm, aus den Augen schwebt sie schräg darüber; **Freie Kamera**
lässt dich selbst durch das Schiff laufen, die Übersicht ist von oben der
Zoom. **Bot folgen** schaltet zurück. Im XR-Headset gibt es keine automatische
Blicknachführung. Zum Verlassen **Simulation beenden** oder **Zur Einsatzzentrale**
wählen. Techniker-Bot und Monster folgen geprüften Kurven mit Beschleunigung
und sanftem Abbremsen (`navmesh/route.ts`).

Die Station verwendet vermessene Einrichtungsmodelle mit reservierten Tür- und
Laufwegen, abgerundeten Gehäusen, Rohren und raumspezifischen Aggregaten.
Zusammengefasste Geometrie, das Ausblenden verdeckter Räume, wenige Lichter und
begrenzte Effekt- und Audiopools halten den Aufwand klein. Die Web-Auflösung ist
für Haunting begrenzt; der Übungsspiegel rendert nur in seiner Nähe. Hub,
Bauplatz und Testwelt bleiben erhalten.

90–120 Hz auf Quest 3 sind ein Leistungsziel, keine hier gemessene Zusage.
Automatisierte Logik-, Physik- und DOM-Tests ersetzen weder die Prüfung der
Grafik auf dem Headset noch einen P2P-Test mit drei echten Geräten. Der reproduzierbare
Browser-Test unter `npm run test:browser` prüft zusätzlich die echte Web-App
in Chromium und Firefox und speichert Screenshots sowie Fehlerberichte.
Vier Produktions-Browserläufe — je zwei in Chromium und Firefox — haben Rollen,
Raumakten, E-Lampenaufnahme, Verlustanzeige/Neustart und Botbewegung erfolgreich
geprüft. Ergebnisse und Grenzen stehen in [docs/orbital-qa.md](docs/orbital-qa.md),
die Einzelresultate im [Browserreport](docs/orbital/browser-report.json).
Screenshots: [Archiv](docs/orbital/archive-desktop.png),
[Botbeobachtung](docs/orbital/bot-observation.png),
[Firefox bei Telefonbreite](docs/orbital/archive-mobile-firefox.png).

> **Hinweis für Agenten:** Entwickelt und gepusht wird **direkt auf `main`** —
> kein Feature-Branch, kein Pull Request, solange nichts anderes im Auftrag
> steht. Das ganze Projektwissen — Features im Detail, vollständige Steuerung,
> Architektur, Portale, Netzwerk, Deployment — steht in **[AGENTS.md](AGENTS.md)**:
> die Arbeitsregeln dort, alles Weitere in `docs/agents/`, ein Kapitel je Datei.

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Typecheck + Produktionsbuild nach dist/
npm run preview  # gebautes Ergebnis lokal servieren
npm test         # Jest (schnell); npm run test:slow für die Rundensimulationen
npm run icons    # public/icon.svg → die PNG-Symbole der App (braucht Chromium)
npm run fps      # Bildraten-Matrix gegen einen laufenden Dev-Server (braucht Chromium)
npm run perf:kitchen  # Zeichenaufrufe der Küche, Rundumblick aus Augenhöhe
```

Der **Service Worker** meldet sich nur im fertigen Build an; im
Entwicklungsbetrieb säße er zwischen Vite und der Seite. Wer ihn und das
Installieren ausprobieren will, nimmt `npm run build && npm run preview`.

WebXR braucht einen sicheren Kontext; `localhost` reicht, für die Brille im
selben WLAN am einfachsten über HTTPS-Tunnel oder `vite dev --https`.

## Tests

Die Haunting-Handyoberflächen werden mit jsdom geprüft: Raumakten, Codes,
Rollenwechsel, Reiterbedienung und Eingabefokus. Automatische Türen und
vollständige Botrunden haben eigene Navigationstests. Das Gamepad ist reine
Rechnung und wird als solche geprüft (`core/gamepad.ts`,
`core/gamepadReport.ts`) — im Container steckt kein Controller, und der
Browserlauf am Ende schiebt der Eingabeseite ein erfundenes Pad unter, um die
Verdrahtung zu prüfen. Für die echte 3D-App:

```bash
npm run test:browser:install     # einmalig Chromium + Firefox
npm run dev                     # in einem Terminal laufen lassen
npm run test:browser            # Screenshots/Report unter .artifacts/browser-smoke
```

Der Browserloop öffnet standardmäßig Chromium und Firefox als sichtbare Fenster
mit normaler Grafik-Konfiguration. `--browser=chromium` oder `--browser=firefox`
begrenzt die Auswahl; `--loops=2 --bot-seconds=30` wiederholt den Durchlauf und
beobachtet die Bot-Demo länger. `--headless` ist für Läufe ohne Fenster gedacht
(in CI automatisch aktiv). Nur bei Bedarf erzwingt `--software` für Chromium
SwiftShader; dessen Bildrate ist kein Vergleichswert für native Grafik.
`--no-screenshots` lässt alle Prüfungen laufen, speichert aber ausschließlich
den Report und nimmt auch bei Fehlern kein Bild auf.

Screenshots und `report.json` dokumentieren Ansichten, Browserfehler,
WebGL-Renderer, Botbewegung und ein kurzes Frame-Timing. Der Loop prüft auch,
dass der Archivar nur einen Raum sieht und das mobile Layout nicht überläuft.
Ein kurzer Botlauf ersetzt weder den Integrationstest einer vollständigen Mission
noch eine Quest-Abnahme mit echten VR-Controllern und mehreren Mobilgeräten.
Details und noch offene Hardwaretests: [Orbital-QA](docs/orbital-qa.md).

Die **Bildrate** misst `npm run fps` (`tools/fps-bench.mjs`): eine Matrix aus
Grafikeinstellungen über Hub und Testwelt, mit mittlerer Bildzeit und
1-%-Perzentil. Die Referenzeinstellung für die Quest 3, das Bildzeit-Budget und
die Grenzen der Messung stehen in
[Quest-3-Referenz](docs/quest3-referenz.md). SwiftShader liefert dabei keine
vorhersagbaren fps — nur Verhältnisse.

**Wer** die Zeichenaufrufe verbraucht, zählt das Schwesterwerkzeug
`npm run perf:kitchen` (`tools/perf-kitchen.mjs`): aus der Augenperspektive
eines Kochs in der Küche, einmal um die eigene Achse, je Objekt, je Material,
je Netz und je Blickrichtung — dazu die JavaScript-Zeit nach Aufrufern. Die
**Zählwerte** gelten überall, die **Zeiten** nur auf dem Rechner, der misst;
eine Bildrate für eine Brille fällt auch hier nicht ab (AGENTS.md, „Die
Messstrecke der Küche").

Der Workflow [Browser smoke](.github/workflows/browser.yml) prüft den gebauten
Stand zusätzlich mit Chromium und `--no-screenshots` in CI. Der Report bleibt dort
14 Tage als Artefakt **orbital-browser-review** verfügbar, auch bei einem
fehlgeschlagenen Lauf. Die Softwaregrafik dieses CI-Tests ist kein FPS-Benchmark.

Jest testet überwiegend Rechen-Logik ohne Browser — Ferngreifen, Achsenzuordnung,
Werkzeug-Pose, Handhaltung, Handgesten, Waffenwerte, Zielrichtung,
Konfig-Code, den Lichtkegel der Taschenlampe, die Gürtel-Position samt der
Spiegelung beider Hüften, die Portaltiefe, den Durchtritt durch ein Portal, die Grafikstufen, das Aussehen,
den Ausschnitt der Karte in der Hand, die Lichtstufen
eines Dimmers, den Halt an der Kletterwand samt Ausdauer und der Vibration
dazu, die **Federung der Sprungkissen** (dass ein Sturz aus sieben Metern nicht
durchschlägt und der Blick trotzdem nicht in einem Bild stehen bleibt),
die Blätterposition der Menüs und den Weg durch sie, die
Augenhöhen, die Vibrationsmuster, die Feinjustage und
die Rechnung hinter der Boxhand am Werkzeug, den Standardgriff, der bei jeder
Haltung an derselben Stelle in der Faust landet, die Faust am Griff (eine
Einstellung für alle Werkzeuge mit demselben Griff), die Räumung nach dem
Loslassen (ob ein Ding noch im Spieler steckt), den Griff am Stiel des großen
Hammers samt seiner zweihändigen Lage, die Fahrphysik,
Streckenführung und Rundenzählung der Karts, die Welt-Physik, die Rettung aus
der Tiefe, die **Bausteine auf dem Kachelgitter** (dass jeder in jeder der vier
Richtungen auf seiner Kachel bleibt, dass keine Treppenstufe höher wird als der
Spieler steigt) samt dem **Grundriss der Testwelt** (dass jede der zehn Zonen
vom Startplatz aus zu erreichen ist, dass die Treppe wirklich auf dem Podest
endet und dass jedes Küchenmöbel seine Kacheln verteuert, auch wenn seine Datei
nie ankommt), das **Wand-Ghosting** (was zwischen Kamera und Figur steht und was
nicht), die Stoppuhr-Einstellungen, den Markdown-Umbruch der Schilder samt
ihrem Rollen und dem, was von ihnen über das Netz geht, die Türmathematik
(dass eine Tür mit Nachlauf beim zweiten Druck die Uhr neu setzt statt
zuzufallen), die Pinselwerte (Breite, Art und die eigene
Farbreihe), die Materialien, die Dicke der Bodenplatte, den
Kurzcode für ein einzelnes Werkzeug (samt der Zahlen, an denen seine Länge
hängt), die Trefferwertung des Schießstands, den Chat-Verlauf
samt Putzen fremden Textes, die Wahl des Gastgebers einer geteilten Welt, die
Auslegung der Hub-Gänge, die Flächen der Würfel (dass gegenüberliegende
Seiten zusammen `n + 1` ergeben, wie auf einem echten Würfel), die Passung des
Handschuhs auf die Knochen einer getrackten Hand, die **Messung dieser Knochen**
(eine Hand aus bekannten Winkeln bauen und nachsehen, ob die Messung sie wieder
herausgibt), die **Knochenfarben**, die geteilte Handhaltung auf
dem Weg über die Leitung, den **Bauplan des Editors**
(worauf ein Zeiger trifft — Kachel oder Kante —, was die vier Werkzeuge daraus
machen, und dass die gebauten Quader vom Abtasten wiedergefunden werden) samt
der **Miniatur** (Hin und Zurück ohne Drift, und dass der Punkt zwischen den
Fingern beim Ziehen liegen bleibt), dem **Malen** (dass zwischen zwei
Bildern keine Lücke bleibt, und dass ein Rechteck aus Boden seine Fläche füllt,
eines aus Wänden dagegen nur seinen Rand — sonst wäre es ein Klotz und kein
Zimmer) und dem **Weltformat** (dass eine Welt mit Massen und Möbeln durch die
Datei und wieder zurück dieselbe ist, dass der Fuß einer Treppenkachel dabei
mitreist, dass der Aufschlag einer Küchenzeile
nicht jedes Mal mitwächst, und dass eine Datei aus der Zukunft abgelehnt
statt halb geladen wird) und **was ein NPC an einer Kante anfängt**
(wie hoch er tritt, wie hoch er sich hochzieht, wie steil ein Weg für ihn noch
einer ist und ab welcher Höhe ein Sprung nach unten ihn umbrächte). Diese
Module kommen ohne three.js und Rapier aus, deshalb braucht Jest weder WebGL
noch WebXR. Was schwer zu testen ist, gehört möglichst in so ein Modul — der
Rest bleibt Verdrahtung.

## Werkzeugseite

Neben dem Spiel steht **[`/tools.html`](https://baumgartner-games.github.io/vr/tools.html)**:
alle Werkzeuge als Liste, jedes einzeln in 3D zum Drehen, und die Hand dazu
ein- und ausschaltbar — als zwei verschiedene Hände: _Hand in VR_ (die
gezeichnete Hand am Werkzeug, so sieht es in der Brille aus) und _Hand in echt_
(die eigene Hand am roten Handgriff des Geräts, mit dem Werkzeug als Geist
daneben). Werkzeug und Zielscheibe bleiben dabei an derselben Stelle; was
wechselt, ist die Hand. Aus ihr läuft die **weiße Linie** des Zeigestrahls
sauber nach vorn auf die Zielscheibe, genau wie in der Brille. Der Knopf **Bearbeiten** oben in der Ecke (an einem
einzelnen Werkzeug) macht daraus einen Justierstand fürs Telefon: oben die Achse (X, Y, Z, Yaw, Pitch, Roll — immer
nur eine), unten der Regler. Bewegt wird dabei die **Hand** — das Werkzeug steht
still —, und ein Umschalter sagt, wohin die Haltung übernommen wird: als _Lage
in der Hand_ oder als _Griffhaltung am Griff_. Wohin ein Werkzeug **zielt**,
sagt ein violetter Pfeil an allem, was zielt. Zwei Knöpfe legen die Hand mit
einem Tipp an eine dieser Richtungen: **Auf den Zylinder** (Richtung und
Ursprung — die Fingerspitze landet im Halter) und **In Zielrichtung** (nur die Richtung, die
Spitze bleibt liegen). Und der Regler dreht die Hand um die **Fingerspitze**
statt um ihr Handgelenk, damit die aufgelegte Linie beim Drehen und Rollen
liegen bleibt. Alles landet in denselben Speichern wie
in der Brille, und der **Konfig-Code** dazu steht gleich darunter zum Kopieren.
Über die Schublade daneben die
**Welten** (jede ganz zum Drehen, schräg von oben für den Überblick, Räume mit
Decke aufgeschnitten wie ein Puppenhaus — über allem, was darin steht, damit
eine Halle ihre Wände behält —, und beliebig nah heranzuzoomen — zwei
Finger schieben und zoomen dabei wie auf einer Karte; mit
**Freie Kamera** fliegt man wie mit einer Drohne hindurch — W A S D und
hoch/runter als Knöpfe oder Tasten, Wischen dreht den Blick —, dazu ein Knopf
hinein) — und **Laufen lassen**: dieselbe Welt mit echter Physik, Gitter und
NPCs, senkrecht von oben, mit den Knöpfen der Welt als Zeilen daneben, den
sieben Debug-Ebenen des Navigationsgitters als Schalter — darunter die
**betretbare Fläche** und der **Sichtkegel** der NPCs, dazu Lebensbalken und
**Trefferzonen** — und einem **Ziel**, das
ein Tipp auf den Boden versetzt und dem die NPCs nachlaufen. Mit **Gehe zu**
geht die eigene Figur stattdessen zu Fuß dorthin — über dasselbe Gitter wie die
NPCs, durch dieselben Türen und Portale —, mit **Im Bereich** legt ein Tipp
einen Kreis hin und die Liste zeigt nur noch, was darin (oder in Reichweite der
Figur) zu drücken ist, und mit **Figur weg** steht man gar nicht erst in der
Welt. Die Karte selbst hat zwei eigene Knöpfe: **Ziehen** schaltet zwischen
Drehen und Schieben um, **Folgen** legt die Bildmitte auf die Figur. In der
[Testwelt](https://baumgartner-games.github.io/vr/tools.html#welt/test)
ist das die ganze Brille, die man zum Zusehen braucht. Dazu der
**Magische Beutel** (jedes Objekt mit Masse und Maßen) und die **NPCs** (jede
Haut geht auf der Stelle, jedes Hirn mit seinen Zahlen daneben). Keine Brille
nötig, das Telefon reicht.

Und **Verbinden**: derselbe Raum-Code wie beim Zusammenspielen, aber ohne Spiel
darin — eine einzelne Hand am Werkzeug, live über die Leitung, mit ihrem
Konfig-Code darunter in einem Feld zum Herauskopieren. Die Gegenstelle dazu war
der Poseraum des Eingaberaums, und den gibt es seit dem Umbau nicht mehr;
diese Seite hört weiter zu, es schickt bloß gerade niemand. Details in
[Die Werkzeugseite](docs/agents/werkzeugseite.md).

## Eingabeseite

Und **[`/inputs.html`](https://baumgartner-games.github.io/vr/inputs.html)** —
eine Frage, und zwar die, die sonst niemand beantworten kann: _Kommt der Knopf,
den ich gerade drücke, in diesem Browser überhaupt an, und unter welcher
Nummer?_ Gedacht für die Geräte, an denen man das nicht nachsehen kann: den
Browser einer **PS5**, einen Fernseher, ein Telefon. Dort gibt es keine
Entwicklerwerkzeuge.

Zu sehen ist, über die **Gamepad-API**: das erkannte Gerät samt Kennung und
Mapping, ein **gezeichneter Controller**, auf dem leuchtet, was gedrückt ist
(mit der Aufschrift des Geräts — `✕ ○ □ △` oder `A B X Y`), ein Panel mit dem
**Code des gedrückten Knopfes** (`gamepad.buttons[7]`, groß daneben die Nummer)
und einem Protokoll der letzten Drücke, **alle Knöpfe** und **Achsen** als
Liste — ungerechnet, also mitsamt der Drift eines ruhenden Sticks —, und
darunter, mit derselben Funktion wie im Spiel, **was die Spielwiese daraus
macht** (laufen, zielen, benutzen, schießen). Dazu `event.code` der Tastatur,
Gerät und Browser, ein Knopf **Bericht kopieren** für Fehlerberichte und, wo es
einen Motor gibt, **Rütteln testen**.

Wenn dort „Kein Pad gefunden" steht: Ein Browser meldet ein angestecktes Pad
erst, wenn daran **einmal ein Knopf gedrückt wurde**. Details in
[Die Seite selbst](docs/agents/seite.md#die-eingabeseite).

### Belegung ändern — und die Karte des Geräts

Manche Treiber melden die Knöpfe nicht dort, wo das Standard-Mapping sie
hinlegt: Ein **Backbone am iPhone** meldet den unteren Gesichtsknopf als
`buttons[1]`, wo `buttons[0]` erwartet wird. Wer damit unten drückt, benutzt
nichts. Dafür gibt es zwei Einstellungen, die **auf der Seite** und **im Spiel**
unter _Menü → Eingaben_ dieselben sind:

- **Karte dieses Geräts** — wo eine Nummer wirklich sitzt. Ein Tausch ist ein
  Handgriff (der andere Knopf zieht mit um), gilt nur für dieses Gerät, und
  danach stimmen Bild, Liste **und** Spiel.
- **Belegung** — welcher Knopf und welche Taste was tun. Zeile antippen, dann
  drücken, was es tun soll. Eine Stelle gehört immer nur einer Sache.

Beides wird auf dem Gerät gespeichert und lässt sich jederzeit einzeln oder
ganz **auf Standard zurücksetzen**. Ohne eigene Einstellung läuft alles genau
wie bisher. Laufen und Zielen bleiben am Pad die Sticks.

**Der Browser der PS5 hat keine Gamepad-API**: Der DualSense steuert dort einen
Mauszeiger, Knöpfe und Sticks erreichen die Seite nicht (nachgesehen am
16.09.2026). Die Eingabeseite sagt das ausdrücklich, statt nach einem Knopfdruck
zu fragen, der nichts ändern kann — gespielt wird dort mit dem Zeiger, in der
Ansicht _Von oben_.

## Vollbild

Wo keine Brille ist, geht **Vollbild**: ein Knopf mit dem Vollbildsymbol auf der
Startseite oben rechts und im Streifen des Spiels neben _VR_. Auf einer Konsole
oder am Fernseher kostet die Adresszeile sonst ein Fünftel des Bildes. In der
Brille gibt es ihn nicht — eine XR-Sitzung ist Vollbild —, und in Browsern, die
es nicht erlauben, auch nicht: Ein Knopf, der nichts tut, ist schlimmer als
keiner. `Esc` beendet es, und der Knopf weiß das (`core/fullscreen.ts`).
Dieselbe Handlung steht auch als Zeile unter **Menü → Grafik** — auf dem Handy
im Querformat verdeckt der Streifen mit dem Knopf genau das, was weg soll.

**Auf dem iPhone gibt es beides nicht**, weil Safari dort Vollbild nur für ein
Video kennt. Der Weg, der dort funktioniert, ist _Zum Home-Bildschirm
hinzufügen_ — siehe den nächsten Abschnitt.

## Als App installieren

Die Spielwiese ist eine **PWA**: Sie lässt sich auf dem Telefon, auf dem
Schreibtisch und in der Brille ablegen wie eine App — eigenes Symbol, eigenes
Fenster ohne Adresszeile, eigener Eintrag im Umschalter — und sie **startet
auch ohne Netz**.

| Gerät                          | Weg                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Android** (Chrome, Edge)     | Knopf **Als App installieren** auf der Startseite — oder Browsermenü → _App installieren_                                              |
| **iPhone / iPad** (Safari)     | Teilen-Menü → **Zum Home-Bildschirm**. Einen Knopf dafür gibt es dort nicht, also steht auf der Startseite der Satz, der den Weg nennt |
| **Windows / macOS / Linux**    | Chrome und Edge: das Symbol rechts in der Adresszeile, oder derselbe Knopf auf der Startseite                                          |
| **Meta Quest** (Browser)       | Menü → _Website speichern_/_Installieren_; danach liegt sie in der Bibliothek und startet ins Vollbild                                 |
| **Firefox am Schreibtisch**    | gar nicht — Firefox kennt das Installieren dort nicht, und dann steht auf der Startseite auch nichts davon                             |

Wer sie schon installiert hat, bekommt den Knopf nicht mehr zu sehen: Die Seite
merkt, dass sie in ihrem eigenen Fenster läuft (`core/install.ts`).

**Ohne Netz** startet sie in die Hub-Welt, und jede Welt, jedes Modell und
jeder Ton, der einmal geladen war, ist danach da: Ein Service Worker legt die
Hülle der Anwendung beim Installieren ab und alles Weitere beim ersten
Gebrauch (`src/sw.ts`). Was ohne Netz **nicht** geht, ist alles, wozu ein
zweites Gerät gehört: zusammen spielen, Sprache, die Lobby einer Runde.

### Was eine PWA heute kann — und was nicht

Für dieses Projekt sortiert; der Stand ist September 2026.

**Geht, und zwar überall:**

- **Vollbild ohne Browserrahmen**, auch auf dem iPhone — dort ist es sogar der
  einzige Weg dorthin.
- **Offline starten** und weiterspielen, samt Modellen und Tönen.
- **Eigenes Symbol, eigenes Fenster**, eigener Eintrag im App-Umschalter, auf
  Android auch **Kurzbefehle** beim langen Antippen des Symbols (hier:
  _Haunting_, _Werkzeuge_, _Eingaben_).
- **WebGL/WebGPU, WebXR, Gamepad, Mikrofon, WebRTC, Vibration, Sensoren,
  `localStorage`** — eine installierte PWA kann genau das, was der Browser
  kann, denn sie _ist_ der Browser. Die Brillen-Sitzung startet aus der
  installierten App wie aus dem Tab.
- **Bildschirm wachhalten** (`Screen Wake Lock`), Ausrichtung sperren,
  Zwischenablage, Dateien öffnen und speichern (`File System Access`, auf
  Safari nur Download/Upload).

**Geht, aber nicht überall:**

- **Push-Nachrichten und Badges**: Android und Desktop ja; auf iOS erst seit
  16.4 und **nur**, wenn die Seite wirklich über _Zum Home-Bildschirm_ abgelegt
  wurde.
- **Hintergrund-Synchronisierung** (`Background Sync`, `Periodic Sync`): nur
  Chromium.
- **Bluetooth, USB, serielle Schnittstellen, MIDI**: nur Chromium — Safari und
  Firefox lehnen sie aus Datenschutzgründen ab.
- **Als Ziel zum Teilen auftauchen** (`share_target`) und **Dateitypen
  übernehmen** (`file_handlers`): nur Chromium.
- **Fenstergröße und -position merken**, mehrere Fenster, `window-controls-overlay`:
  nur am Schreibtisch.

**Geht nicht:**

- **In einen App-Store** — außer über einen Verpacker (TWA bei Google Play,
  PWABuilder bei Microsoft). Apple nimmt keine reine PWA.
- **WebXR auf iPhone und iPad**: Safari kennt es bis heute nicht, auch nicht
  installiert. Dort läuft die Spielwiese am Bildschirm, nicht in der Brille.
- **Im Hintergrund weiterrechnen**, wenn die App zu ist: Ein Service Worker
  lebt Sekunden, keine Minuten.
- **An die Dateien des Systems, an andere Apps, an das Adressbuch** — was eine
  Webseite nicht darf, darf eine installierte Webseite auch nicht.
- **Automatisch aktualisieren, während man spielt**: Ein neuer Stand wird
  geladen, übernimmt aber erst beim nächsten Start. Das ist Absicht — mitten in
  einer VR-Sitzung die Welt zu tauschen, wäre schlimmer als ein Tag alter Code.

## Query-/Hash-Parameter

| Parameter            | Wirkung                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#test`              | startet direkt in dieser Welt (jede Welt-ID funktioniert: `hub`, `editor`, `test`, `haunting`)                                                                    |
| `?world=test`        | dasselbe als Query-Parameter                                                                                                                                      |
| `?room=mond-riff-47` | trägt den Raum-Code ins Verbindungs-Formular ein (Einladungslink) — unter `#haunting` in die Startseite der Runde, die ihn beim Verbinden auch selbst hier ablegt |
| `?net=local`         | nutzt `BroadcastChannel` statt WebRTC — zwei Tabs auf einem Rechner                                                                                               |

Im Browser liegt die App zum Debuggen auf `window.bgvr`.

## Steuerung

Die Tabelle ist die **Voreinstellung**: Tastatur und Controller lassen sich
unter _Menü → Eingaben_ (und auf [`/inputs.html`](#eingabeseite)) umlegen,
gespeichert und jederzeit auf Standard zurücksetzbar.

|                               | VR                                                                                                                                                                         | Desktop                                                                | Handy                    |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------ |
| Bewegen                       | linker Stick (reindrücken = Sprint)                                                                                                                                        | `WASD`, `Shift`                                                        | linker Touch-Stick (Menü → Grafik → _Bildschirm-Steuerung_: automatisch / an / aus; automatisch heißt „nur am Handy, und nur ohne Gamepad") |
| Umsehen                       | Kopf, rechter Stick = Snap-Turn                                                                                                                                            | Maus (Klick = Pointer-Lock)                                            | wischen                  |
| Springen / Ducken             | `A` rechts (springt nur, wenn nichts in Reichweite ist) / rechten Stick reindrücken                                                                                        | `Leertaste`                                                            | Knopf `A`, siehe links   |
| Menü                          | Button an beiden Händen (immer nur eins offen)                                                                                                                             | Knopf ☰ oben links (dasselbe Menü als Seite, auch auf der Startseite) | Knopf ☰ oben links      |
| Von oben ↔ Aus den Augen      | –                                                                                                                                                                          | Startseite oder Menü → _Ansicht_; Mausrad zoomt                        | dito; zwei Finger in der oberen Hälfte zoomen |
| Benutzen                      | `A` rechts — was in Reichweite steht, bekommt einen gelben Saum                                                                                                            | `E` oder Enter — der gelbe Saum sagt, was gemeint ist                  | Knopf `A`                |
| Werkzeug wählen               | – (das Regal hängt am Handgelenk)                                                                                                                                          | Knopf unten rechts oder `Tab` — die Liste fängt mit _Hand (leer)_ an   | derselbe Knopf, antippen |
| Zielen / Schießen (von oben)  | Trigger der Hand mit der Waffe                                                                                                                                             | Maus zielt, Linksklick schießt                                         | rechter Stick, Knopf `B` |
| Auswählen                     | zielen + Trigger oder `A`                                                                                                                                                  | Linksklick                                                             | tippen                   |
| Werkzeug nehmen/ablegen       | Grip an der Hüfte; woanders loslassen lässt es fallen                                                                                                                      | –                                                                      | –                        |
| Hüften verschieben            | Gürtel-Justierer: Hüfte anzielen, Trigger, mit der anderen Hand schieben                                                                                                   | –                                                                      | –                        |
| Ohne Controller               | 3 Finger an die Handfläche = Greifen, Zeigefinger = Trigger                                                                                                                | –                                                                      | –                        |
| Sitzen oder stehen            | Startseite (nur dort gefragt) oder Menü → Bewegung → Haltung                                                                                                               | Menü → Bewegung → Haltung                                              | dito                     |
| Verbinden                     | Menü → Verbindung → _Raum betreten_; geht mitten im Spiel, ohne die Sitzung zu verlassen                                                                                   | Raum-Code auf der Startseite                                           | dito                     |
| Chat                          | Menü → Verbindung → Chat (lesen, _Schreiben_ öffnet die Tastatur)                                                                                                          | Panel _Verbindung_: tippen, je Zeile _Kopieren_ und _Übernehmen_       | dito                     |
| Sprechen                      | Menü → Verbindung → _Mikrofon_ — die Stimmen kommen aus der Richtung, in der die anderen stehen                                                                            | Panel _Verbindung_ → _Sprache_                                         | dito                     |
| Werkzeug benutzen             | Trigger (Greifen = zweite Funktion)                                                                                                                                        | Links-/Rechtsklick                                                     | –                        |
| Großer Hammer                 | irgendwo am Stiel greifen, zweite Hand dazu; Trigger halten schiebt die Hand am Stiel                                                                                      | –                                                                      | –                        |
| Hängegleiter                  | Trigger = Anlauf; Bügel ziehen = schneller, drücken = langsamer, zur Seite = Kurve; loslassen am Boden lässt ihn fallen                                                    | –                                                                      | –                        |
| Flügel                        | beide Arme schlagen = Start und Schub; ausbreiten = gleiten; eine Hand tiefer = Kurve                                                                                      | –                                                                      | –                        |
| Taschenlampe                  | Trigger schaltet; andere Hand an der Linse zieht den Kegel breit/schmal                                                                                                    | –                                                                      | –                        |
| Pinsel                        | Palette an der anderen Hand: antippen **oder** anzielen + Trigger; Regler für RGB und Strichbreite gedrückt halten und ziehen; ✕ schließt sie, `A`/`X` öffnet sie          | Linksklick                                                             | –                        |
| Staffelei                     | Trigger stellt sie auf den Boden und die Hand ist danach frei; Griff an der Ablage + Greifen nimmt sie wieder auf; `A`/`X` wischt die Leinwand; gemalt wird mit dem Pinsel | –                                                                      | –                        |
| Aufheben / werfen             | Grip mit leerer Hand am Objekt                                                                                                                                             | –                                                                      | –                        |
| Küche: nehmen und ablegen     | Grip **oder** Trigger auf das, was man anzielt — Pfanne, Topf, Teller, Zutat; halten und beim Loslassen ablegen, oder tippen und beim nächsten Druck                        | Linksklick oder `E`                                                    | `A`                      |
| Ferngreifen                   | zielen, Grip, Hand zum Körper zucken (ab 8 m/s, einstellbar)                                                                                                               | –                                                                      | –                        |
| Kart: einsteigen              | davorstellen und `A` — oder das Lenkrad greifen                                                                                                                            | davorstellen und `E`                                                   | Knopf `A`                |
| Kart: fahren                  | rechter Trigger Gas, linker bremst, linker Stick lenkt                                                                                                                     | `W`/`S`, `A`/`D`                                                       | –                        |
| Kart: aussteigen              | `A`/`X` halten                                                                                                                                                             | `E` halten                                                             | –                        |
| Kart: zu zweit                | im selben Raum verbinden — jeder nimmt ein Kart, die Tafel zeigt die Reihenfolge                                                                                           | dito                                                                   | –                        |
| Küche: Feuerlöscher | vom Hocker nehmen und den Trigger der rechten Hand **halten**; gezielt wird mit der Hand, die ihn hält | aus den Augen `E` halten; von oben ein Schalter — Linksklick an, noch einmal aus, gezielt mit dem rechten Stock | aus den Augen `A` halten; von oben schaltet `B` |
| Küche: umbauen | der Knopf in der Küche schaltet um (und räumt dabei ab), dann `A` am leeren Möbel und `A` auf dem Umriss davor | dito mit `E` | dito mit `A` |
| Küche: Möbel holen | vorn an den Computer-Tisch und `A` — im Katalog ringsum eines anfassen; auf dem Kopierer links ablegen, rechts die Kopie abholen | dito mit `E` | dito mit `A` |
| Küche: Radio | an der Westwand, neben der Tomatenausgabe: `A` macht an, `A` macht aus — und jedes Anmachen ist ein Sender weiter | dito mit `E` | dito mit `A` |
| Küche: Ton wählen | im Schauraum vor dem Schneidebrett und vor der Ausgabetheke: linker Knopf schaltet den Ton weiter, rechter spielt ihn vor | dito mit `E` | dito mit `A` |
| Aussehen                      | Menü → _Aussehen_: Kopf, Hut, Körper — oder vor den Kleiderschrank stellen und `A`, dann greift man sich die Sachen im Schrank                                              | dito                                                                   | dito                     |
| Hitboxen                      | Menü → Grafik → _Hitboxen_ — die Körper der Physik über allem, mit dem Spielerkreis                                                                                                             | dito                                                                   | dito                     |
| Gitterlinien                  | Menü → Grafik → _Gitterlinien_ — die Kacheln der eigenen Ebene                                                                                                             | dito                                                                   | dito                     |
| Zurücksetzen                  | `B` / `Y` oder Menü                                                                                                                                                        | `R` oder Menü                                                          | Menü                     |

Die vollständige Tabelle samt aller Werkzeuge steht im [Kapitel Steuerung](docs/agents/steuerung.md).

## Konfig-Code

Werkzeug-Posen, Handhaltungen, Anbauteile und Waffenwerte passen zusammen in
eine kopierbare Zeile (`BG3…`) — und ein einzelnes Werkzeug an einer einzelnen
Hand in eine so kurze, dass man sie abtippt. In VR unter
_Einstellungen → Konfig-Code_,
am Rechner über die Kommandozeile:

```bash
npm run config -- decode BG3…          # zeigt die Einstellungen als JSON
npm run config -- encode config.json   # macht wieder einen Code daraus
npm run config -- mirror BG3… left     # linke Handhaltungen nach rechts
```
