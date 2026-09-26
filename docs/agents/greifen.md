# Greifen, Reichweite, Benutzen

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

## Drei Dinge, drei Reichweiten — und ihre Namen

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

Das **Zugtempo** steht im Menü unter _Einstellungen → Hände & Greifen_ und ist eine
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

## Ein Griff ist auch für das, was kein Werkzeug ist

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

### Der Haltezylinder — und warum die Stange nicht die Faustachse ist

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
**ansehen**: `Menü → Werkstatt → Griffe zeigen` malt ihn (siehe _Griffe zeigen_),
und der Prüfstand `handles-preview.html` (`npm run handles`) macht Bilder
davon. Genau daran wurden die drei eingemessen, und genau daran prüft man sie
nach, wenn jemand das Modell tauscht.

Die Fälle unterscheiden sich nur in der Zahl der Griffe:

| Fall                      | Beispiele                                     | Was es heißt                                      |
| ------------------------- | --------------------------------------------- | ------------------------------------------------- |
| **Kein Griff**            | Brötchen, Tomate, Salat, Patty                | „wie beim Companion Cube": zupacken, wo man fasst |
| **Ein Haltezylinder**     | Pfanne am Stiel, Löscher am Tragebügel, Schraubenschlüssel quer über den Schaft | die gemessene Stange, und sonst hält man es verkehrt |
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
ausgetauschtes Modell bringt neue Maße mit. Der **Schraubenschlüssel** hängt an
derselben Hülle und ist trotzdem der Sonderfall: Er kommt nicht aus der
Küchendatei, sondern aus dem KayKit-Regal
(`kitchenProps.WRENCH_MODEL`, `rpg-tools-bits/wrench_A.glb`), und wird beim
Laden in eine **hingeschriebene** Hülle gerechnet (`kitchenProps.PLIERS`,
`layFlat`). Damit steht sein Maß fest, auch wenn die Datei gar nicht ankommt,
und die Anteile in `GRIP_BAR` sind so gut wie gemessene Zentimeter. `across` ist
dort **0** und nicht mehr −0,62: Die gebaute Wasserpumpenzange, die hier bis
September 2026 lag, hatte ihre Griffe hinten, der gekaufte Schlüssel hat seinen
in der Mitte und an **beiden** Enden ein Maul. Die einzigen absoluten Zahlen dort
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

## Vier Reichweiten? Nein — drei, und eine Einschränkung

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

## Was ein Ding will — und womit man es bekommt

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
die Pfanne vom Herd, der Topf, der Feuerlöscher aus der Halterung, die
Wasserpumpenzange von der Arbeitsplatte, im Umbau auch das Möbel selbst. `none` ist angemeldet und trotzdem ohne Angebot: die
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

| Absicht | von oben (`topDown`)              | aus den Augen (`firstPerson`) | in der Brille (`vr`)          |
| ------- | --------------------------------- | ----------------------------- | ----------------------------- |
| `press` | `A` / `E` / linke Maustaste, tippen | linke Maustaste / `E`, tippen | Berühren / Trigger, tippen      |
| `grab`  | `A` / `E` / linke Maustaste, tippen | linke Maustaste / `E`, tippen | Greifen / Trigger, **halten**   |
| `none`  | —                                 | —                             | —                               |

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
**Hält die Hand ein Werkzeug** (`PlayerRig.armed`), ist sie aus den Augen
zuerst dessen Trigger und benutzt nichts mehr — dafür bleibt `E`; siehe
[Die Waffe](./waffe-und-kart.md#die-waffe), _Aus den Augen am Schirm_.

**Und von oben tut sie dasselbe** (`FlatControls`, der Zweig `topDownOn` in
`pointerdown`). Wer eine Küche am Schreibtisch spielt, führt die Figur mit der
Maus — sie zielt, also dreht sie die Figur —, und griff bisher für jedes
Brötchen zur Tastatur. Der Klick ist dort jetzt derselbe Geber wie `E`, mit
derselben Rangfolge wie `A`: Steht etwas in Reichweite, gehört der Klick dem
Ding davor; steht nichts da, bleibt er der **Auslöser** dessen, was die Figur
trägt (der Feuerlöscher, die Waffe — `PlayerRig.setTrigger`). Zwei Wirkungen
auf einen Klick gibt es damit nie, und der Löscher verliert seinen Knopf nur
dort, wo ohnehin etwas Näheres gemeint ist — und das sind **die Flächen, auf
denen er abgestellt wird** (`kitchenCarry.EXTINGUISHER_REST`, siehe den
nächsten Abschnitt). Vor allem anderen, auch vor der brennenden Herdplatte,
meldet sich keine Station mehr an, solange er in der Hand liegt, und der Knopf
gehört ihm.

## Der Feuerlöscher: wo er hingestellt wird und was ihn anmacht

Er ist das einzige Ding dieser Spielwiese, das **selbst einen Knopf hat**, und
deshalb steht seine Regel doppelt geschrieben: einmal als Frage an die Station
davor (`kitchenCarry.extinguisherRests`) und einmal als Frage an den Auslöser
(`kitchenSpray.ts`). Die beiden hängen zusammen — was die Station anbietet,
nimmt dem Löscher den Knopf weg (`PlayerRig.useCandidate`), und was sie nicht
anbietet, lässt ihn ihm.

**Abgestellt wird er auf Flächen, und das sind vier Sorten**: die
**Arbeitsplatte**, die **Kiste** (sie ist „zugleich Arbeitsplatte"), seine
**Halterung** — und seit Neuestem das **Förderband**. Das Band fehlte, und es
fehlte nicht aus einem Grund, sondern aus Vorsicht: Die Tabelle zählte drei
Möbel auf, und alles Übrige blieb stumm. Für `A` ist ein Band aber eine Ablage
wie die Zeile, also geht der Löscher darauf wie jedes andere Ding — **und fährt
mit**. Die Bandrechnung musste dafür nicht angefasst werden: Sie kennt belegte
und freie Kacheln und keine Zutaten (`kitchenBelt.ts`). Wer den Löscher am
anderen Ende der Küche braucht, schickt ihn also hinüber, statt ihn zu tragen.

**Und die Herdplatte entscheidet nach ihrem Stand.** Sie war ausdrücklich keine
Ablage, und der Satz dazu stimmte auch — nur stimmte er zu weit: Vor dem
**brennenden** Herd soll der Knopf dem Löscher gehören, das ist der ganze Sinn
der Sache. Eine Platte, auf der **nichts** steht, ist aber eine Fläche wie die
Zeile daneben; wer den Löscher dort abstellen will, soll das dürfen. Also:
**leere Platte = ablegen, belegte Platte = löschen**, und „belegt" heißt, was
es sagt — die Pfanne darauf, ob sie brennt oder bloß brät. Die Frage „steht da
etwas?" ist an einem Herd zugleich die Frage „kann das gleich brennen?".

Das ist **eine** Zeile Regel, und deshalb gilt es in allen drei Ansichten: In
der Brille legt die Greif-Taste vor der leeren Platte ab, von oben und am
Schirm derselbe `A`, der sonst den Löscher anmacht. Keine der drei fragt etwas
anderes — sie fragen alle `kitchenDeed`.

**Angemacht wird er mit dem Auslöser — und am Schirm auch mit dem Zielstock.**
In der Brille ist es der Trigger **der Hand**, die ihn hält, am Schirm der
Benutzen-Knopf (gehalten), von oben ein **Schalter** (`kitchenSpray.sprayOn`,
`sprayHold`). Dazu kommt der rechte Stock: Wer am Schirm mit dem Löscher in der
Hand den **Stock** auslenkt, pustet dabei, und beim Loslassen hört es auf
(`kitchenSpray.sprayAims`, gefüttert von `core/PlayerRig.aiming` und
`core/gamepad.aimHeld`). Die **Maus**, die von oben ebenfalls zielt, gehört
ausdrücklich nicht dazu: Dort ist die linke Taste schon der Auslöser, und ein
Löscher, der beim bloßen Bewegen des Zeigers anginge, wäre einer, den man gar
nicht mehr ausbekommt. Der Grund ist der Daumen — am Pad wie auf dem Glas
liegt er beim Zielen ohnehin auf diesem Stock, und ein Gerät, das man ins Feuer
hält, ist ein Handgriff und nicht zwei. Gemessen wird dieselbe Totzone für
beide Geber: Der Stock am Pad hat seine schon hinter sich, der gemalte auf dem
Glas bekommt sie hier, sonst machte ein verrutschter Finger den Löscher an.

Der **Schalter von oben bleibt daneben stehen und merkt sich seinen Stand**;
der Stock merkt sich nichts. An ist der Löscher, wenn einer von beiden es sagt
— hätten beide denselben Merker, bliebe er nach dem Loslassen an, ohne dass ihn
jemand angemacht hätte.

**Für andere Werkzeuge gilt das ausdrücklich nicht.** Die Regel steht in der
Datei des Feuerlöschers und fragt nach ihm; die Waffe von oben hängt weiter an
ihrem Auslöser (`PlayerRig.trigger`, [Die Waffe und die
Kartzone](./waffe-und-kart.md)). Der Unterschied ist kein Geschmack: Ein
Löscher richtet nichts an, eine Kugel schon — eine Pistole, die schon beim
Zielen schießt, ist keine Pistole.

## Benutzen mit der Hand — die Brille

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
  andere Hand arbeitet weiter. **Das gilt für jedes Zeigerziel**, nicht nur
  für Menüs — wer ein Ding zugleich beim Zeiger und beim Kern anmeldet, nimmt
  der Hand damit Saum und Greif-Taste. Dafür gibt es `PointerTarget.rayPasses`:
  Der Laser geht hindurch, Berühren (`pokeable`) bleibt. So machen es die
  Schränke in Haunting für eine freie Hand
  ([Haunting](./haunting.md), `shipHandUse.ts`).
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

### Und der gelbe Saum folgt in der Brille der Hand

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
Anfassen sticht Zeigen, unter Gleichen gewinnt das Nächste
(`core/handUse.betterHandUse` — eine Rechnung für beide Fragen, nicht zwei
Abschriften). Der Körper bleibt der **Rückfall**, auch in der Brille: Zeigt
keine Hand auf etwas, meint `A` weiter, was vor der Figur steht, und dann soll
das auch leuchten — ein Saum, der in dem Augenblick ausginge, in dem die Taste
noch wirkt, wäre derselbe Fehler in der anderen Richtung.

**Und unter Gleichen führt die Hand, die zuletzt etwas getan hat**
(`core/handUse.leadHandUse`, `PortalWorld.lastActHand`). Das ist die nächste
Meldung aus der Brille, und sie ist die Kehrseite der eben beschriebenen:
Sobald man **trägt**, sprang der Saum zwischen den Händen hin und her, weil er
immer dem näheren der beiden Funde folgte — mit der Pfanne in der Linken
streift die freie Rechte beim Gehen ständig irgendeine Arbeitsplatte, und dann
leuchtete die. Wer eines in der Hand hat, meint mit dieser Hand weiter.

Führend ist, wer zuletzt wirklich **gehandelt** hat: gegriffen (`attach`), ein
Werkzeug genommen (`takeTool`, `catchLooseTool`) oder gedrückt, wo der Druck
etwas bewirkt hat (`useByHand`). **Zeigen führt nicht** — sonst wäre es
dasselbe Hin und Her mit einem Bild Verzögerung. Und zeigt die führende Hand
ins Leere, gilt wieder der bessere Fund: Ein Saum, der ausgeht, weil der Arm
gerade herunterhängt, wäre derselbe Fehler noch einmal.

**Mit zwei Gegenständen bekommt jede Hand ihren eigenen Saum.** Steht
`core/grabSettings.GrabSettings.twoHands`, kann jede Hand etwas Eigenes
greifen, und dann ist „was meint die Hand?" zweimal zu beantworten — links die
Pfanne, rechts der Burger, und beide Hände zeigen woandershin. `PortalWorld`
hält dafür einen **zweiten** `Highlight` (zwei Instanzen und keine Liste: Die
Klasse verspricht, dass genau ein Ding leuchtet, und zwei Hände sind zwei
solcher Versprechen). Zeigen beide auf dasselbe Ding, leuchtet es einmal. Der
Rückfall auf den Körper entfällt dabei mit Absicht: Er ist die Auskunft für die
**Figur** und nicht für eine Hand, und eine leere Hand soll in dieser
Betriebsart auch leer aussehen.

Zwei Zeilen Ablauf hängen daran: Worauf eine Hand zeigt, steht erst in
`updateGrabs` fest, also wird der Saum **danach** gesetzt und nicht davor
(`update` ruft `updateUsables`, `updateGrabs`, `showUse`). Ein Saum, der ein
Bild hinterherhinkt, zeigt beim Umsehen regelmäßig auf das Möbel von eben.

**Was noch offen ist**: Einen Ort, an dem der Hinweistext angezeigt wird, gibt
es nicht; er steht bereit (`PortalWorld.useInteraction.hint`), die Tafel über
der Figur ist seinerzeit mit gutem Grund verschwunden.

## Und am Schirm trägt die Figur

Alles bisher Gesagte setzt eine **Hand** voraus, und die gibt es nur in der
Brille. Von oben und aus den Augen gab es deshalb lange gar kein Greifen: Was
aus dem magischen Beutel oder aus dem [KayKit-Regal](./assetregal.md) kam,
entstand 70 cm vor dem Kopf und fiel zu Boden. Das war kein Vorsatz, sondern
eine Lücke — und sie wurde als Fehler gemeldet: _„Wenn ich ein Asset gewählt
habe, hat der Spieler es in der Hand."_

**Die Bildschirmhand kann jetzt tragen** (`worlds/portal/screenHand.ts`). Sie
ist, was sie immer war: ein `ControllerState` ohne Controller, an dem das
Werkzeug der Figur hängt. Neu sind drei Dinge.

### Ein zweiter Anker, und zwar nicht der Griff

Ein Werkzeug liegt an der rechten Faust der Figur (`core/chefFit.CHEF_TOOL`),
und dieser Griff ist auf **Figurenmaß** gestaucht (`POSE_SCALE`), damit eine
Pistole darin kein Balken ist. Ein Fass aus dem Regal soll aber so groß bleiben,
wie es ist — es liegt ja auch nach dem Loslassen so im Raum. Also hat die Hand
einen zweiten Anker (`ScreenHand.carry`), ungestaucht, direkt am Rig.

**Wohin er zeigt, ist eine Rechnung** und steht deshalb neben der Darstellung
(`core/screenCarry.ts`, mit Test):

| Ansicht       | Wo                                                                                |
| ------------- | --------------------------------------------------------------------------------- |
| von oben      | vor dem Bauch der Figur — dieselbe Stelle wie in der Küche (`chefFit.CHEF_CARRY`) |
| aus den Augen | vor der Kamera, eine Handbreit unter der Blickachse                                |

Und in **beiden** bleibt die Unterkante über dem Boden. Von oben ist das
offensichtlich; aus den Augen war es genauso nötig: Ein Ritter von 1,78 m,
dessen Oberkante eine Handbreit unter der Blickachse hängt, hat seine Füße
einen Vierteilmeter **unter** dem Fußboden — und den sieht man zwei Meter vor
sich liegen.

Übernommen und nicht neu erfunden: Die Küche trägt seit jeher vor dem Bauch
(`kitchen.carryInHands`), und der Grund dort ist der Grund hier — von oben
verschwindet alles, was dicht an der Figur hängt, unter ihrem Kopf. Aus den
Augen sieht man die Figur gar nicht, also muss das Getragene **ins Bild**.

**Und beide Male entscheidet die Größe mit.** Das Regal gibt viertausend
Modelle her, vom Schlüssel bis zum Baum von vier Metern; ein fester Punkt wäre
für das eine unsichtbar und für das andere eine Wand vor dem Gesicht. Also
rückt das Ding um seine eigene halbe Ausdehnung vor — und von oben steigt es
so weit, dass es nicht im Boden steckt. Aus den Augen zählt dabei die
**größere** der beiden Halben und nicht nur die Breite: Ein Ritter ist 1,78 m
hoch und 1,36 m breit, und nach der Breite gerechnet hing er anderthalb Meter
vor der Kamera — im ersten Bild davon sah man seinen Helm und sonst nichts.

### Dieselbe Buchführung, kein zweiter Weg

Was an diesem Anker hängt, steht in **derselben** Karte wie ein Griff in der
Brille (`PortalWorld.grabs`, unter der Seite der Bildschirmhand) und geht durch
dieselben drei Stellen: `attach` beim Zugreifen, `carryGrab` in jedem Bild,
`release` beim Ablegen. Der Körper ist dabei kinematisch und für den Spieler
weich (`PhysicsWorld.setCarried`), und beim Loslassen greift die
[Räumung](#drei-dinge-drei-reichweiten--und-ihre-namen) wie überall.

Ein zweiter Weg, etwas in der Hand zu halten, wäre der, den beim nächsten Umbau
jemand vergisst. Genau eine Zeile musste dafür weichen: Die Schleife über die
Controller lässt fallen, was eine Hand ohne Tracking hält — und die
Bildschirmhand hat nie eins. Sie ist davon ausgenommen, und nur sie.

### Eine Hand, ein Ding — Werkzeug oder Vorrat

Werkzeug und Getragenes schließen sich aus (seit September 2026, gemeldet als
_„es kann nicht sein, dass ich eine Tomate und eine Pistole halte"_). Was die
Bildschirmhand auffängt (`screenCatch`), ersetzt das Werkzeug darin, und der
Werkzeug-Knopf zeigt danach **Hand (leer)**; wer umgekehrt im Knopf ein
Werkzeug — oder die leere Hand — wählt, lässt fallen, was die Figur trug
(`chooseScreenTool`). Fallen und nicht hinstellen: Hingestellt holte der
_Baukasten_ sofort die nächste Kopie in dieselbe Hand.

**Und der Gürtel ist am Schirm unsichtbar** (`ToolBelt.setWorn`). An ihn greift
nur eine getrackte Hand; am Rig hing er trotzdem, in Spielergröße, und war von
oben eine zweite, große Pistole vor der Brust der Figur.

### Der Benutzen-Knopf legt ab

Am Schirm gibt es keine Greif-Taste. Es gibt `A` auf dem Glas, `A` am Pad, `E`
und Enter, und die heißen alle _Benutzen_ (`core/inputMap.ts`,
[Steuerung](./steuerung.md)). Solange die Figur etwas trägt, gehört dieser
Knopf dem Getragenen: Er springt dann nicht (`PlayerRig.useBusy`, dieselbe
Regel wie beim Feuerlöscher der Küche), und er bedient auch nicht, was vor der
Figur steht — der Druck wird abgeholt, bevor `updateUsables` danach fragt.

**Und darüber gilt _Halten oder Tippen_**, dieselbe Regel wie in der Brille
(`core/handUse.gripPressKind`, 0,35 s oder 8 cm): Wer drückt, geht und
**loslässt**, legt ab; wer nur **tippt**, behält es in der Hand, und der
nächste Druck legt es ab. Die Strecke ist hier die der Figur und nicht die
einer Faust — wer mit dem Fass losgeht, meint „ich trage es dorthin".

**Und ein Tippen sagt, dass es bleibt.** „_Ritter_ bleibt in der Hand ·
nochmal drücken legt ab" — einmal je Tippen, nicht je Bild. Der Satz muss
dastehen: Beim Auffangen hat die Meldung gerade „A / E legt ab" versprochen,
und ein Knopf, der sichtbar nichts tut, sieht kaputt aus.

Die Flanke kommt dabei aus **zwei** Quellen, und sie muss aus beiden kommen:
`E` und Enter rasten sie ein (`FlatControls` → `PlayerRig.requestUse`), der
Knopf auf dem Glas und das Pad **liegen** nur (`PlayerRig.useHeld`). Wer kürzer
drückt, als ein Bild dauert, löst nur die erste aus — und ein Ablegen, das an
der Bildrate hängt, ist keins.

### Was am Schirm weiter fehlt

**Aufheben.** Was einmal liegt, bleibt liegen: Es gibt am Schirm keinen Griff,
mit dem man danach greift, und der Benutzen-Knopf gehört dem, was vor der Figur
steht (`core/usable.ts`). In die Hand kommt etwas nur, indem man es aus dem
Beutel oder dem Regal holt. Das ist eine Grenze und keine Entscheidung gegen
das Aufheben — wer es baut, baut es dort, wo `useByHand` in der Brille steht.

## Halten oder Tippen — zwei Greif-Arten, beide gültig

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

**Und sie gilt auch ohne Brille**, seit die Bildschirmhand trägt: Dort steht
statt der Greif-Taste der **Benutzen-Knopf**, und das Maßband misst statt der
Faust die Figur (`PortalWorld.updateScreenCarry`, siehe _Und am Schirm trägt
die Figur_). Zwei Zahlen, eine Regel, drei Ansichten — genau dafür steht sie im
`core`.

## Abgelegt wird beim Loslassen und nicht beim Hinlangen

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

Das **Abdichten** (`repair`) gehört ausdrücklich nicht dazu: Es nimmt der Hand
nichts weg, die Zange bleibt darin, und der Druck wirft nur die Uhr an. Hier
stand bis September 2026 das **Löschen** (`douse`) mit demselben Satz — die Tat
gibt es nicht mehr, weil die belegte Herdplatte einer Hand mit dem Löscher
darin gar nichts mehr anbietet (`kitchenCarry.extinguisherRests`).

## Was in der Brille in der Hand liegt

Ein gegriffenes Küchending hängt in der Brille an `ControllerState.hold` der
Hand, die zugegriffen hat — demselben Knoten, an dem jedes Werkzeug hängt, und
der bei einer getrackten Hand schon den Versatz zum Zeigestrahl trägt
(`core/handHold.ts`). Damit dreht sich die Pfanne mit dem Handgelenk.

**Essen liegt dort halb so groß** (`kitchenGrab.kitchenHandScale`,
`HAND_FOOD_SCALE` = 0,5): jede Zutat, jeder Burger, jeder Teller, auch der
dreckige. Gemeldet war, dass Tomate, Salat, Brötchen und Bulette zwar richtig
groß sind, in der Hand aber die Sicht versperren — in echter Größe hält man
einen Teller von 47 cm eine Handbreit vor der Brille. **Geräte bleiben groß**
(Pfanne, Topf, Löscher, Schlüssel). Gestaucht wird **um den Griff**
(`grabHandles.holdForScaled`): Wer den Teller am Rand hält, behält den Rand in
der Faust, und der Teller rückt zu ihr hin, statt mit dem halben Maßstab aus
ihr herauszurutschen. Volle Größe gibt es zurück, sobald es die Hand verlässt
— beim Ablegen (`restOn`, die eine Stelle, an der alles auf eine Station
kommt) und vor dem Bauch (`backToBelly`, `fullSize`). Das Restaurant macht
dasselbe mit derselben Zahl ([Das Restaurant](./burgerladen.md)).

Von oben und am Schreibtisch bleibt alles beim Alten: Das Getragene hängt vor dem
Bauch (`core/chefFit.CHEF_CARRY`). Fällt ein Controller weg oder wird die Brille
abgesetzt, holt `kitchen.backToBelly` es dorthin zurück. Ein **Gegenstand der
Welt** — einer mit Körper, aus dem Beutel oder dem Regal — hängt dort seit
Kurzem ebenfalls, nur an einem eigenen Anker: siehe _Und am Schirm trägt die
Figur_.
