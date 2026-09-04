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
sofort wieder, lokal *und* auf `origin`:

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

Vor dem Push laufen `npm run typecheck` und `npm test`.

### Tests

Getestet wird das, was ohne Browser läuft und wo Fehler nicht auffallen: die
Mathematik hinter dem Ferngreifen (`src/worlds/portal/remoteGrab.ts`), die
Achsenzuordnung der Griffe (`src/worlds/portal/tools/axisMatch.ts`), die
gemessene Werkzeug-Pose samt Spiegelung
(`src/worlds/portal/tools/toolPose.ts`), die **Flugmathematik der Drohne**
(`src/worlds/portal/tools/droneFlight.ts` — Kopter und Jet, inklusive der
Vorzeichen, die im Headset sonst die halbe Welt verdrehen, und das Tuning aus
Tempo und Drehrate), die **Drohnen-Einstellungen**
(`src/worlds/portal/tools/droneSettings.ts` — Rasten, Grenzen und der Fall,
dass ein alter Konfig-Code diese Felder noch gar nicht kannte), die Handhaltung
(`src/core/handPose.ts`), die **Handgesten**
(`src/core/handGestures.ts` — welche Finger an der Handfläche liegen und was
daraus Greifen und Trigger macht, samt der Hysterese, ohne die ein halb
gekrümmter Finger den Trigger dreißigmal pro Sekunde umschaltet), die Waffenwerte
(`src/worlds/portal/tools/weaponSettings.ts`), der **Konfig-Code**
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
Leitplanke, Rundenzähler über die Ziellinie hinweg) und das **Pizza-Rezept**
(`src/worlds/shop/pizza.ts` — Kneten, Belegen, Backen, Punkte). Diese
Module kommen bewusst ohne three.js und ohne Rapier aus, deshalb braucht Jest
weder WebGL noch WebXR noch wasm.

Zwei Tests benutzen doch three.js — aber nur als Geometrie, ohne WebGL: der
**Pointer** (`src/core/Pointer.ts`) muss jeder Hand ihren eigenen Strahl und
ihren eigenen Trigger lassen, und die **Handform** (`src/core/HandVisuals.ts`)
muss links links und rechts rechts sein. Beides sind Vorzeichen, die man in der
Brille erst nach Minuten bemerkt und dann nicht mehr los wird. Alles, was schwer zu testen ist, gehört
möglichst in so ein Modul — der Rest bleibt Verdrahtung.

WebXR braucht einen sicheren Kontext. `localhost` reicht; für die Brille im
selben WLAN am einfachsten über HTTPS-Tunnel oder `vite dev --https` testen.

## Was drin ist

- **Startseite** mit großem `Enter VR`-Button (plus Flat-Modus für Desktop/Handy).
- **Hub-Welt**: helle Halle, Hände bzw. Controller, Tore zu den anderen Welten.
- **Handgelenk-Menü**: an **beiden** Händen schwebt ein Button; ein Druck öffnet ein
  Panel, das der Hand folgt — inklusive Neigung, es kippt mit dem Handgelenk.
  Es ist zweimal dasselbe Menü, und immer nur **eins offen**: das zweite geht
  zu, sobald das erste aufgeht. Ein Menü nur links war genau so lange in
  Ordnung, wie die linke Hand nichts zu tun hatte — mit einer Waffe, einer
  Drohne oder einem Lenkrad darin kam man nur noch heran, indem man das Ding
  weglegte.
  Das Panel steht senkrecht auf dem Handrücken und schaut den Kopf an.
  Ausgewählt wird mit der anderen Hand: zielen und **Trigger oder `A`** drücken
  — Hovern allein löst nichts aus, und angetippt wird auch nichts. Auf den
  Seiten **Werkzeuge** und **Magischer Beutel** nimmt dagegen nur **Greifen
  oder `A`**, damit der Zieltrigger nicht versehentlich die Hand füllt. Ohne
  getrackte Hand hängt dasselbe Menü an der Blickrichtung.
  Aufbau: **Welten** (Hub, Portal Labor, Schießstand, Dust, Gokart, Pizzeria,
  Eingaberaum),
  **Werkzeuge**
  (das ganze Regal direkt in die Hand), **Magischer Beutel** (Raster mit
  Companion Cube, Kugel, Domino, Pyramide, Quader, Planke und Zylinder),
  **Bewegung** (Sprint und Ducken), **Einstellungen** und die Aktionen der
  Welt. In beiden wird auf einen Eintrag gezielt und
  **Greifen** oder `A` gedrückt — das Werkzeug bzw. Objekt liegt dann in
  genau dieser Hand. Das Raster kommt zurück, sobald du loslässt.
  Passt eine Seite nicht aufs Panel — das Werkzeugregal tut das längst nicht
  mehr —, wird **mit dem Stick der zeigenden Hand hoch/runter geblättert**;
  rechts zeigt ein Balken, wo man gerade ist. Links/rechts bleibt der
  Snap-Turn.
  **Das Menü bleibt stehen, wo man war** — auf der Seite und in der Liste.
  Beides wurde ständig zurückgesetzt, und beides aus demselben Grund: der Baum
  wird bei jeder Änderung neu gebaut, und eine Zeile zu drücken ist ja gerade
  das, was ihre Beschriftung ändert. Ein Werkzeug aus dem Regal nehmen oder
  eine Einstellung eine Raste weiterschalten warf einen an den Anfang der
  Liste — beim Regal also vor jedem einzelnen Werkzeug erneut —, und Zumachen
  warf einen zusätzlich auf die oberste Ebene. Jetzt behält dieselbe Seite ihre
  Position, eine Seite, auf der man schon war, kommt dorthin zurück, wo man sie
  verlassen hat, und beim Schließen bleibt die Seite stehen. Wo man ist, sagt
  die Überschrift auf dem Panel und die *Zurück*-Zeile. Verschwindet eine Seite
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
- **Werkzeuggürtel**: an beiden Hüften hängt ein Platz für ein Werkzeug. Was
  in der Hand ist und in die Nähe eines Platzes kommt, lässt den Ring
  aufleuchten — dort loslassen legt es ab, Greifen nimmt es wieder. Jedes
  Werkzeug passt auf jeden Platz, sie lassen sich also frei tauschen.
- **Loslassen heißt fallen lassen**: wer ein Werkzeug irgendwo *anders* als
  über einer Hüfte loslässt, lässt es fallen — es liegt dann als Objekt im
  Raum, kann angestoßen und von jeder Hand wieder aufgehoben oder in der Luft
  aufgefangen werden. Im selben Moment wächst auf der Hüfte, von der es kam,
  ein **neues** nach. Damit ist „Waffe ziehen, in die andere Hand geben, noch
  eine ziehen" eine durchgehende Bewegung. Wie viele Exemplare gleichzeitig
  *außerhalb des Gürtels* sein dürfen — herumliegend und in Händen zusammen —,
  sagt das Werkzeug selbst (`Tool.looseLimit`, normal eins): kommt eins zu
  viel dazu, holt sich der Raum das älteste **liegende** zurück. Bei eins
  heißt das genau, was es soll: die frische Pistole von der Hüfte holt die
  liegengelassene ein. Beim Wurfstern sind es fünf.
- **Werkzeuge** (alle in jeder Welt mit Gürtel):
  - **Portal-Waffen**: zwei einzelne und eine kombinierte (Trigger rot,
    Greifen blau, muss nicht dauerhaft gehalten werden).
  - **Größe & Position**: Blender-artige Griffe — sie erscheinen **vor dir**,
    nicht am Objekt, und wirken trotzdem auf das Objekt am anderen Ende des
    Raums. Achsen sind die des Objekts, nur nach deiner Blickrichtung sortiert.
  - **Pinsel** samt Farbpalette auf der anderen Hand.
  - **Pistole** mit Magazin (`x/∞` an der Seite). Unter
    *Einstellungen → Pistole* steht jeder Wert einzeln: Stärke, Kugeltempo,
    Feuerrate, **Magazingröße**, Nachladezeit, Salvenlänge und Modus (Einzel,
    Salve, Automatik). Jede Zeile schaltet auf die nächste Raste weiter **und
    zeigt die rohe Zahl daneben** — und unter *Werte eingeben* lässt sich jede
    davon über eine Tastatur direkt tippen. Dazu **Zielhilfen** (Rotpunkt,
    Kimme & Korn, Flugbahn, Röntgen, **Fernrohr** — oder alles ab), der
    **Zoom** des Fernrohrs (16×, 20×, 24×, 28×, 32×, 36× durchklicken oder
    zwischen 1 und 60 tippen) und die **Munition** (normal oder Leuchtspur).
  - **Wurfstern**: das eine Werkzeug, das zum Loslassen gedacht ist. Aus der
    Bewegung heraus losgelassen fällt er nicht, sondern **fliegt weiter** —
    geradeaus, ohne Bogen, mit der Drehung um die eigene Achse — und bleibt
    stecken, wo er auftrifft (Wand, Kiste, egal). Fünf dürfen gleichzeitig
    unterwegs oder eingeschlagen sein; der sechste Wurf holt den ersten
    zurück. Die Bahn wird pro Frame selbst abgetastet statt auf einen
    Abpraller zu warten — nur so bleibt er *stecken*, statt abzuprallen.
  - **Stoppuhr**: Trigger schaltet Zeitlupe an und aus, Loslassen der Uhr
    stellt die normale Geschwindigkeit wieder her.
  - **Greifhaken**: Trigger schießt den Haken, Halten zieht dich hin; trifft
    er ein Objekt, kommt stattdessen das Objekt.
  - **Gravitationshandschuh**: Trigger zieht das anvisierte Objekt geradewegs
    in die Hand, Greifen stößt es weg. Bleibt in der Hand, bis er am Gürtel
    abgelegt wird.
  - **Translationshandschuh**: greift bis 30 m weit — das Objekt kommt dabei
    *nicht* zu dir. Zwei Modi, `A` schaltet um: **Halten** lässt es genau dort
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
  - **Lötkolben**: zwei Punkte antippen und die Objekte hängen zusammen —
    starr oder als Scharnier (Achse = Querachse des Kolbens). Der Modus wird
    mit der anderen Hand umgeschaltet (kleines Panel über ihr), *Trennen*
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
    und zeigen die rohe Zahl daneben —, *Drohne neu setzen*, und ob das
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
    nicken um die *eigenen* Achsen, Sicht samt Horizont kippt mit. Wer im
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
    an. Das Cockpit ist um einen *Menschen*
    gebaut, die Maschine richtet sich danach; sie wird deshalb weiter weg
    gesetzt als der Kopter und hält mehr Abstand zum Boden.
    Beim Parken richtet sie sich wieder waagerecht aus. Der Kopf bleibt in
    beiden Modi frei.
  - **Messband**: Trigger setzt Punkt 1, Trigger setzt Punkt 2, der Abstand
    bleibt im Raum stehen. Nimmt man das Band wieder in die Hand, ist die
    letzte Messung wieder da.
  - **Werkzeug-Justierer**: setzt ein anderes Werkzeug richtig in die Hand,
    die **Hand** richtig ans Werkzeug — und einzelne Anbauteile richtig aufs
    Werkzeug. Worauf er zeigt, bekommt
    einen Rahmen und steht auf seinem Display; ein **Werkzeug** hält er beim
    Trigger in der Luft an (Hand hinlegen, wo sie es halten soll, Trigger
    nochmal), ein **Anbauteil** — der Rotpunkt etwa — hängt sich beim
    gehaltenen Trigger an die Spitze und bleibt beim Loslassen dort auf der
    Waffe. Beides zeigt danach die sechs Werte (x, y, z in cm,
    roll/pitch/yaw in Grad). **Greifen** legt den ganzen Konfig-Code in die
    Zwischenablage. Zeigt er auf eine Hand, die etwas hält, schaltet **`A`**
    um, was der Trigger meint: `Werkzeug` rückt das Ding zurecht, `Hand` rückt
    die *Hand darum* zurecht — rein optisch, das Werkzeug bewegt sich dabei
    nicht. Genau das braucht man, weil eine Waffe anders in der Hand liegt als
    ein Handschuh. Geschrieben wird dann die Griffhaltung für genau dieses
    Werkzeug; eine leere Hand schreibt die Grundhaltung, eine Hand um ein
    Objekt die Objekthaltung.
  - **Radiergummi**: löscht Objekte — für alle in der Sitzung.
- **Alles einstellbar, alles kopierbar**: Werkzeug-Posen, Handhaltungen,
  Anbauteile und die Waffenwerte liegen zusammen in einem **Konfig-Code** —
  einer Zeile, die kopiert, vorgelesen und wieder eingegeben werden kann
  (*Einstellungen → Konfig-Code*). Eine **Tastatur im Raum** nimmt rohe Zahlen
  und ganze Codes entgegen.
- **Handhaltung**: wie die leere Hand aussieht, wie sie jedes einzelne
  Werkzeug greift und wie sie ein **Objekt** hält, steht unter
  *Einstellungen → Hände* — zwölf Zahlen pro Haltung (Versatz, Neigung, fünf
  Finger, Spreizung), und ein Knopf spiegelt alles auf die andere Hand. Die
  Objekthaltung liegt unter derselben Mechanik wie ein Werkzeug (Pseudo-Id
  `grab`), wird also genauso getippt, gespiegelt und im Konfig-Code
  mitgeschleppt — und sie wird tatsächlich angewandt, sobald eine Hand etwas
  trägt.
- **Sitzen oder stehen**: das Einzige, was eine Brille nicht selbst weiß. Sie
  meldet den Kopf über dem Zimmerboden und hat keine Ahnung, ob darunter ein
  Stuhl steht — ein sitzender Spieler ist für jede Welt schlicht ein sehr
  kleiner, und Küchentresen, Kartsitz und Horizont gehören plötzlich jemand
  Größerem. Gefragt wird einmal auf der Startseite, umgestellt wird unter
  *Menü → Bewegung → Haltung*: „Sitzend" hebt die Sicht auf Stehhöhe an und
  lässt die Füße stehen — dieselbe Mechanik wie das Ducken, nur andersherum.
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
  sich nach *oben*, die oberste stand damit auf 30° über dem Auge und war nur
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
  auf, Stick und Trigger bewegen sich wirklich. Mit **bloßen Händen** treten
  sie beiseite und es stehen fünf Balken da — wie weit jeder Finger an der
  Handfläche liegt — plus zwei Lampen für das, was daraus wurde. An der Wand
  steht dasselbe in Worten. **Gelaufen und gedreht wird hier nicht**
  (`PlayerRig.locked`), der Kopf natürlich schon: man kommt her, um eine
  Haltung zu halten und sie anzusehen. Gürtel, Regal und der
  Werkzeug-Justierer sind da, denn die Hand, die man ansieht, ist die, die man
  einstellt.
- **Dust** (experimentell): große Außenkarte im Geist der Counter-Strike-Map —
  zwei Plätze, ein Tunnel, Rampen, ein begehbarer Vierstöcker mit Treppen bis
  aufs Dach und ein paar kleinere Häuser. Dieselben Werkzeuge, dieselbe Physik,
  dieselbe geteilte Sitzung wie im Portal Labor; Portale haften dort an den
  hellen Tafeln und am Boden.
- **Weltenregistry**: eine neue Welt ist ein Eintrag plus ein Modul.
- **Peer-to-Peer-Sitzungen** (experimentell): beide Geräte tragen denselben
  Raum-Code ein und sind danach direkt verbunden — ohne eigenen Server.
- **Geteilte Welt**: Portale, Würfel und Dominos sind bei allen dieselben —
  wer schießt, wirft oder etwas aus dem Beutel holt, tut das für alle.
- **Zuschauer-Kamera**: Spieler auswählen und zusehen, aus dessen Augen
  (First Person) oder mit weicher Verfolgung von hinten (Third Person). Am PC
  im Panel unter *Zuschauen*, in VR unter **Menü → Verbindung → Zuschauen** —
  beide Seiten haben dieselben Möglichkeiten.


## Steuerung

| | VR | Desktop | Handy |
| --- | --- | --- | --- |
| Bewegen | linker Stick | `WASD` (`Shift` = schneller) | linker Touch-Stick |
| Sprinten | linken Stick reindrücken | `Shift` | – |
| Ducken | rechten Stick reindrücken | – | – |
| Umsehen | Kopf, rechter Stick = Snap-Turn | Maus (Klick = Pointer-Lock) | wischen |
| Springen | `A` rechts | `Leertaste` | – |
| Menü | Button an **beiden** Händen (immer nur eins offen) | Button `Menü` im HUD | Button `Menü` im HUD |
| Auswählen | zielen + Trigger oder `A` — **beide Hände** haben einen Strahl | Linksklick | tippen |
| Werkzeug nehmen | Grip an der Hüfte halten (jede Hand, jedes Werkzeug) | – (immer bereit) | – |
| Werkzeug ablegen | Grip über der Hüfte loslassen | – | – |
| Werkzeug fallen lassen | Grip woanders loslassen — es fällt, der Gürtel füllt nach | – | – |
| Wurfstern werfen | im Schwung loslassen; er fliegt weiter und bleibt stecken | – | – |
| Haltung (sitzen/stehen) | Startseite oder Menü → Bewegung → Haltung | dito | dito |
| Greifen ohne Controller | Mittel-, Ring- und kleiner Finger an die Handfläche | – | – |
| Trigger ohne Controller | Zeigefinger an die Handfläche | – | – |
| Portal schießen | Trigger der Hand mit der Waffe | Links-/Rechtsklick | – |
| Zweites Portal (Doppel-Waffe) | Greifen | Rechtsklick | – |
| Aufheben / werfen | Grip mit leerer Hand am Objekt | – | – |
| Weitergeben | mit der freien Hand danach greifen | – | – |
| Ferngreifen | zielen, Grip drücken (rastet ein), Hand >30° nach oben kippen | – | – |
| Menüseite blättern | Stick der zeigenden Hand hoch/runter | – | – |
| Greifhaken | Trigger (halten zieht) | – | – |
| Gravitationshandschuh | Trigger zieht, Greifen stößt ab | – | – |
| Supermanhandschuh | Greifen schwebt, Trigger fliegt; Hand zur Seite oder Kopf drehen = Kurve | – | – |
| Translationshandschuh | Trigger hält aus der Ferne, `A` wechselt Modus | – | – |
| Größe & Position | Trigger wählt, `A` holt die Griffe vor dich | – | – |
| Griff ziehen | Trigger der Werkzeughand oder Trigger/Greifen der freien Hand | – | – |
| Werkzeug-Justierer | Trigger hält an / zieht ein Anbauteil, Trigger übernimmt, Greifen kopiert den Code, `A` wechselt Werkzeug/Hand bzw. bricht ab | – | – |
| Wert eintippen | auf eine Taste zielen + Trigger, oder mit dem Finger antippen | echte Tastatur oder Klick | tippen |
| Lötkolben | Trigger setzt Punkte, andere Hand wechselt Modus | – | – |
| Drohne | beide Griffe halten, dann ein Trigger; Sticks fliegen, `A` öffnet das Menü (Modus, Tempo, Drehrate) | – | – |
| Messband | Trigger Punkt 1, Trigger Punkt 2 | – | – |
| Radiergummi | Trigger löscht | – | – |
| Kart: einsteigen | Lenkrad greifen, oder anzielen + Trigger | Lenkrad anklicken | – |
| Kart: Gas / Bremse | rechter / linker Trigger | `W` / `S` | – |
| Kart: lenken | linker Stick — oder das Lenkrad greifen und drehen | `A` / `D` | – |
| Kart: aussteigen | `A`/`X` halten (Balken läuft voll) | `E` halten | – |
| Kart: Klemmbrett | anzielen + Trigger, Stick blättert | anklicken | – |
| Pizza: Teig kneten | Faust auf den liegenden Teig schlagen | – | – |
| Pizza: Soße / Käse | Kelle bzw. Streuer greifen, Trigger halten | – | – |
| Zurücksetzen | `B` / `Y` oder Menü | `R` oder Menü | Menü |
| Zuschauen | Menü → Verbindung → Zuschauen | Panel *Verbindung* → *Zuschauen* | dito |
| Zuschauer-Kamera drehen | – (Kopf bleibt deiner) | ziehen mit der Maus | wischen |
| Zuschauer-Abstand | Menüeintrag *Abstand* | Mausrad oder Regler | Regler |

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
Pistolengriff *hält* ihn und zieht durch. Gemessen wird pro Finger der Abstand
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
spannt sich selbst zwischen die beiden Griffe (die Drohne tut das); mit
`Tool.claimsHand()` sagt es außerdem, dass die zweite Hand belegt ist — sonst
zieht derselbe Griff nebenbei ein Werkzeug von der Hüfte.

Jede Waffe in der Hand zeigt ihre eigene Vorschau in ihrer Farbe; auf Boden
und Decke richtet sich das Portal nach der Waffe, mit der du zielst.

Die Greifbox ist der Collider plus 9 cm — ein fester Zuschlag, kein
prozentualer, damit ein Dominostein genauso gut in die Hand springt wie ein
Companion Cube.

**Ferngreifen** (Einstellungen → Ferngreifen, standardmäßig an) erweitert das auf 9 m und
läuft in zwei Schritten. Der Zielstrahl trifft die tatsächliche Box eines
Objekts — plus etwas Rand und einen Kegel, der mit der Entfernung aufgeht, so
dass ein weit entfernter Dominostein erreichbar bleibt, ohne einem näheren
Objekt das Ziel wegzunehmen. Was getroffen ist, leuchtet auf. Mit **Grip**
rastet es ein: Es bleibt markiert, auch wenn die Hand woanders hinzeigt.
Kippst du die Hand danach mehr als **30°** nach oben/hinten, kommt das Objekt
geflogen und landet in der Hand.

Der Flug ist bewusst *keine* Physik: eine feste Bahn über eine feste Zeit, und
das Objekt geht dabei durch alles hindurch. Eine ballistische Kurve sieht
schöner aus, bis sie unterwegs an einer Kiste hängen bleibt — und ein
Ferngriff, der nicht ankommt, ist schlimmer als gar keiner. Die Bahn wird
jeden Frame gegen die *aktuelle* Handposition gerechnet, eine Hand, die sich
bewegt, zieht das Objekt also mit. Genau das prüfen die Jest-Tests.

### Die Waffe

Jeder Wert der Pistole steht in `src/worlds/portal/tools/weaponSettings.ts` mit
Bereich und Einheit. Eine Menüzeile schaltet auf die nächste Raste weiter und
zeigt dabei, wo sie steht (`Stärke: stark · 0.14 kg`); *Werte eingeben* öffnet
für dieselbe Größe die Tastatur, und alles dazwischen ist erlaubt, solange es
im Bereich liegt. Eine Zahl, die auf keiner Raste liegt, bricht das
Weiterschalten nicht: die nächste Raste ist die erste *oberhalb* des aktuellen
Werts (mit Test).

**Zielhilfen** liegen als Raster im Menü — und weil in eine Rasterzelle zwei
Wörter passen, steht über dem Panel eine Zeile darüber, worauf gerade gezeigt
wird. Zur Wahl stehen *alles ab*, **Rotpunkt** (der Punkt sitzt 25 m weit
draußen und wird auf Größe skaliert, wandert beim Kopfbewegen also nicht),
**Kimme & Korn**, **Flugbahn** (rechnet die Parabel der nächsten Kugel voraus
und markiert, wo sie aufschlägt), das **Röntgengerät** (derselbe Scanner wie
das Handgerät, nur klein — beide benutzen `XrayScope`) und das **Fernrohr**.

Das **Fernrohr** vergrößert wirklich: eine zweite Kamera sitzt vorne im Rohr,
schaut die Rohrachse entlang und zeichnet die Szene in ein Render-Target, das
auf der hinteren Linse liegt — dieselbe Mechanik wie das Drohnendisplay
(`Attachment.renderFeed`, aufgerufen von `PortalWorld.render`). Die
Vergrößerung *ist* damit der Öffnungswinkel dieser Kamera: 58° geteilt durch
den Faktor. Man nimmt das Okular ans Auge wie bei einem echten Zielfernrohr;
die Kamera sitzt deshalb vorn und nicht hinten, sonst fotografierte das Rohr
sich selbst und den halben Lauf. Der Zoom steht als eigene Menüzeile
(*Zoom*) und als Zahl unter *Werte eingeben* (1 bis 60).

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

**Die Griffe von *Größe & Position*** erscheinen dort, wo die Hände sind, und
nicht am Objekt: Trigger wählt aus (mehrfach für mehrere), `A` holt die Griffe
vor dich. Pfeile verschieben, Kugeln skalieren eine Achse, die weiße Kugel in
der Mitte alles zusammen; eine dünne Linie zeigt, an welchem Objekt sie gerade
hängen, und ein kleines Display die Maße. Gezogen wird mit dem Trigger der Hand,
die das Werkzeug hält, oder mit Trigger *oder* Greifen der freien Hand.

Die Achsen sind die **des Objekts**, aber in der Reihenfolge deiner Sicht: die
Objektachse, die am ehesten nach rechts zeigt, wird der rechte Pfeil, und so
weiter (`src/worlds/portal/tools/axisMatch.ts`, mit Jest-Test — inklusive der
Spiegelung, die sonst aus der Drehung eine ungültige Matrix machen würde).
Damit bleibt „breiter, aber nicht höher" auch für eine schief stehende Kiste
möglich, ohne dass der Pfeil dafür in eine andere Richtung zeigt als er aussieht.
Skaliert wird über das *Verhältnis* zweier Abstände zur Mitte statt über eine
Differenz — wo genau die Hand die Kugel erwischt hat, ist damit egal.

Die **Werkzeug-Pose** (`holdPosition`, `holdRotation`) wird nicht mehr geraten:
der **Werkzeug-Justierer** hält das Werkzeug der anderen Hand in der Luft an,
du legst die Hand hin, wie sie es halten soll, und beim zweiten Trigger rechnet
`src/worlds/portal/tools/toolPose.ts` (mit Test) die Pose aus, die genau das
ergibt — abzüglich der Aim-Korrektur, die jedes Werkzeug ohnehin bekommt. Die
Zahlen erscheinen auf dem Display und in der Meldung, so wie sie in den
Konstruktor gehören; bis dahin merkt sich der Browser sie
(*Einstellungen → Werkzeug-Posen zurücksetzen* wirft sie wieder weg).

Derselbe Justierer nimmt sich auch **einzelne Anbauteile** vor. Er zieht dabei
einen Strahl aus seiner Spitze: Was er trifft — ein Anbauteil oder das ganze
Werkzeug — bekommt einen Drahtrahmen und steht auf seinem Display. Ein
Anbauteil wird nicht geparkt, sondern *gezogen*: Trigger halten, es hängt an
der Spitze, loslassen setzt es fest. Seine Pose liegt im Raum **des Werkzeugs**
(nicht der Hand), deshalb bleibt ein einmal ausgerichteter Rotpunkt
ausgerichtet, egal wie die Waffe später gehalten wird.

### Das Gokart

Ein Kart ist drei reine Module und ein bisschen Verdrahtung:
`kartSettings.ts` (die Werte samt Bereich, Raste und Einheit — dieselbe Idee
wie `weaponSettings.ts`), `kartDynamics.ts` (ein Schritt Fahren) und
`kartTrack.ts` (die Strecke als Mittellinie plus halbe Breite). Alles drei ohne
three.js und mit Jest-Test; `Kart.ts` und `KartWorld.ts` sind nur noch Blech.

**Das Fahrmodell** ist bewusst klein und arkadig: Gelenkt wird wie beim
Fahrrad — Gierrate = Tempo · tan(Einschlag) / Radstand, also dreht ein
stehendes Kart nicht. Die Drehung dreht das *Kart*, nie seine Geschwindigkeit;
was dabei seitlich übrig bleibt, ist der Drift, und die **Traktion** sagt, wie
schnell die Reifen ihn wieder auffressen. Gas, Bremse und Widerstand fassen nur
den Vorwärtsanteil an. Zum Rollwiderstand gehört ein konstanter Anteil, sonst
*nähert* sich ein losgelassenes Kart dem Stillstand nur an und kriecht
minutenlang weiter.

**Die Leitplanke** ist keine Physik, sondern Geometrie: `confineToTrack` setzt
ein Kart, das über den Rand ist, exakt auf die Kante zurück, nimmt den Teil der
Geschwindigkeit weg, der in die Planke zeigte, und schrubbt den Rest ein wenig.
So rutscht man an der Bande entlang statt daran zu kleben. Steht man einmal
stumpf davor, hilft die Bremse: sie ist zugleich der Rückwärtsgang, und rückwärts
lenkt es wieder.

**Einsteigen** ist ein Griff ans Lenkrad — der Rig wird eingefroren
(`rig.frozen`) und jeden Frame auf den Sitz gesetzt, wobei der *Kopf* über den
Sitz geschoben wird und nicht der Rig-Ursprung: in VR steht der Spieler in
seinem Zimmer irgendwo, nur nicht dort, wo die Brille es gern hätte.

Und zwar in **allen drei Achsen**. Früher landeten die *Füße* auf einer festen
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
Hand auf dem Brett, gehört *ihr* Trigger dem Brett und nicht dem Gas — pro
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
  genug und in seine Richtung hineinfährt. Bewusst *ohne* Taste: Greifen ist
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
  `TextPlane` bemisst seine Schrift an seiner *Höhe*, ein höheres Schild fasst
  also weniger Text, nicht mehr — die Schilder sind deshalb breit und flach.
- **Arbeitshöhe** ist 90 cm, wie in einer echten Küche. Wer sich hier zu klein
  vorkommt, sitzt in aller Regel auf einem Stuhl; dagegen hilft nicht der
  Tisch, sondern *Menü → Bewegung → Haltung*.
- **Grenze:** Pizzen entstehen zur Laufzeit und bekommen laufende IDs; zwei
  Küchen in derselben Sitzung meinen mit `pizza-3` nicht dasselbe. Gelöscht
  wird deshalb nur lokal. Der Raum, die Werkzeuge und alles Geworfene sind
  geteilt wie überall.

### Handhaltung

Wie eine Hand aussieht, ist eine Einstellung wie jede andere: zwölf Zahlen —
Versatz in cm, Neigung in Grad, ein Krümmungswert je Finger (0 gestreckt,
1 geschlossen) und eine Spreizung. Davon gibt es die **Grundhaltung** (leere
Hand), je eine **Griffhaltung pro Werkzeug** und eine für das **Objekt in der
Hand**, jeweils für links und rechts:
*Einstellungen → Hände → Linke/Rechte Hand*. Die Objekthaltung läuft unter der
Pseudo-Id `grab` durch dieselbe Mechanik wie ein Werkzeug — eine Hand um einen
Companion Cube ist weder die leere Hand noch die Hand an der Pistole, und ohne
eigene Haltung sah sie aus wie beides gleichzeitig. Getippt wird über die Tastatur im
Raum, und die Hand bewegt sich schon *während* getippt wird — eine Krümmung
von 0.6 sagt auf dem Papier nichts.

Weil beide Hände Spiegelbilder sind, ist die andere Seite eine Kopie mit drei
umgedrehten Vorzeichen: seitlicher Versatz, Yaw und Roll. Mehr nicht — genau
das prüft der Test zu `mirrorHandPose` in `src/core/handPose.ts`, und dieselbe
Regel gilt für Werkzeug-Posen (`mirrorReadout`). *Auf die andere Hand
spiegeln* macht es für eine Haltung, *Links auf rechts spiegeln* für alle.

### Konfig-Code

Alle diese Zahlen zusammen — Werkzeug-Posen, Handhaltungen, Anbauteile,
Waffenwerte — passen in eine Zeile:

```
BGVR1mAL_eyJ2IjoxLCL_dCI6eyJwaXP_dG9sIjpbMCy_LTEuMiwzAGAy_ywwLDBd…
```

Das ist **kein Hash**, sondern gepacktes JSON: `src/core/configCode.ts`
schreibt die Einstellungen kompakt, komprimiert sie mit einem winzigen
LZSS-Verfahren (Wörterbuch im Datenstrom, deshalb ohne Bibliothek und ohne
`CompressionStream`) und packt das Ergebnis in base64url mit einer Prüfsumme
hinten dran. `decode(encode(x))` gibt exakt `x` zurück — der Jest-Test besteht
darauf, mitsamt Umlauten, leeren Objekten und einem verdrehten Zeichen, das
abgelehnt werden muss.

In VR liegt der Code unter *Einstellungen → Konfig-Code*: **Code anzeigen**
legt ihn gleich in die Zwischenablage (und in die Browser-Konsole), **Code
laden** nimmt ihn wieder entgegen — eingefügt oder Zeichen für Zeichen. Am
Rechner geht dasselbe auf der Kommandozeile:

```bash
npm run config -- decode BGVR1…        # zeigt die Einstellungen als JSON
npm run config -- encode config.json   # macht wieder einen Code daraus
npm run config -- mirror BGVR1… left   # linke Handhaltungen nach rechts
```

Damit ist „hier sind meine Einstellungen, mach das für die andere Hand auch"
eine Zeile statt vierzig Zahlen.

Die **Linie** zwischen Hand und Objekt ist standardmäßig aus (sie steht meist
im Weg) und lässt sich unter *Einstellungen → Ferngreifen → Linie anzeigen*
einschalten. Ferngreifen schaltet sich außerdem selbst ab, solange beide Hände
dicht beieinander sind und eine davon schon etwas hält — dann will man das
Objekt übergeben und nicht quer durch den Raum zielen.

## Architektur

```
src/
  core/      Engine, Player-Rig, Locomotion, XR-Input, Pointer, Hände, Avatar
  physics/   Rapier-Wrapper und der Charakter-Controller (dynamisch geladen)
  ui/        Canvas-basierte 3D-UI (Panel, Textflächen, Handgelenk-Menüs)
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

Der `App`-Loop ist bewusst schlank: Input → Locomotion → `world.update()` →
UI → Netzwerk → Render. Eine Welt darf über `world.render()` selbst rendern;
das Portal Labor nutzt das für seine Zusatzdurchgänge.

### Eine neue Welt hinzufügen

1. `src/worlds/<name>/<Name>World.ts` anlegen und `World` implementieren
   (`init`, `update`, optional `render`, `dispose`).
2. In `src/worlds/index.ts` einen Eintrag in `WORLDS` ergänzen — Titel,
   Beschreibung, Akzentfarbe, unterstützte Rollen und ein `load()` mit
   dynamischem Import.

Soll die neue Welt dieselben Werkzeuge, Portale und Physik haben wie das
Portal Labor, erbt sie stattdessen von `PortalWorld` und ersetzt nur den Raum:
`buildEnvironment()`, dazu die kleinen Haken `spawnPoint()`, `spawnYaw()`,
`skyColor()`, `lightIntensity()`, `welcome()`, `beltLoadout()` (leer heißt:
beide Trigger gehören der Welt) und `worldReset()` (was `B`/`Y` in dieser Welt
zusätzlich zurücksetzt — die Karts in die Box, die Küche leer). `removeProp()`
löscht ein Prop wieder, wahlweise nur lokal. Genau das machen `DustWorld`,
`RangeWorld`, `KartWorld` und `ShopWorld` — die ganze Maschinerie (Gürtel,
Regal, Ferngreifen, geteilte Sitzung) kommt mit, ohne kopiert zu werden.

Mehr braucht es nicht: Menü, Hub-Tor, Deep-Link (`#<id>`) und das Aufräumen
beim Wechsel erledigt die Engine. Alles, was eine Welt der Szene hinzufügt,
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

Bekannte Grenzen des Prototyps: Portale nur auf ebenen Flächen, und es gibt
eine Rekursionsstufe — im Portal zeigt das gegenüberliegende seinen Ruhewirbel.

**Zwei Render-Ebenen** halten auseinander, wer was sieht: `LAYER_SELF_ONLY` (3)
trägt den eigenen Körper — den zeichnen *nur* die Portalkameras, direkt sieht
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

**Warum kein eigener Signaling-Server?** WebRTC braucht nur für den Handshake
einen Umweg (Austausch der SDP-Beschreibungen). Danach läuft alles direkt
zwischen den Browsern. Diesen Handshake übernimmt
[Trystero](https://github.com/dmotz/trystero): es legt die Angebote in ein
öffentliches Relay-Netz statt auf einen Server, den wir betreiben müssten.

| Vermittlung | Netz | Anmerkung |
| --- | --- | --- |
| **Nostr** (Standard) | hunderte öffentliche Relays | am robustesten, `wss://` |
| **MQTT** | öffentliche Broker | gute Alternative, wenn Nostr blockiert ist |
| **BitTorrent** | öffentliche Tracker | funktioniert, aber Tracker kommen und gehen |

Umschalten geht im Panel unter *Vermittlung* — hilfreich in Netzen, die eine
der Varianten wegfiltern. Findet keins der Relays einen Weg, sagt das Panel das
auch so (`Kein nostr-Relay erreichbar`), statt still zu warten.

Was **nicht** über die Relays läuft: alles Inhaltliche. Posen, Welt-Events und
Chat gehen ausschließlich über den direkten, verschlüsselten Datenkanal. Der
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

### Die Welt teilen: Objekte und Portale

Ein Raum, ein Zustand. `PortalSync` (`worlds/portal/PortalSync.ts`) hält Props
und Portale auf allen Geräten gleich und hängt am freien Nachrichten-Kanal von
`NetSession` — die Engine selbst weiß davon nichts.

- **Wer rechnet?** Der Spieler mit der kleinsten Peer-ID. Das kann jeder für
  sich ausrechnen, es braucht keine Wahl und keinen Server. Er simuliert die
  Physik und streamt die Transformationen mit 20 Hz; bei allen anderen sind
  dieselben Körper kinematisch und laufen der empfangenen Pose weich hinterher.
  Geht er, übernimmt der Nächste in der Reihe — mitten im Spiel.
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

Unter *Zuschauen* — am PC im Panel, in VR unter **Menü → Verbindung** — wählst
du erst einen Spieler und dann die Ansicht:

- **Frei** — die normale Steuerung, eigene Kamera.
- **First Person** — die Kamera sitzt im Kopf des Spielers. Der eigene
  Avatar wird für die anderen ausgeblendet (man steckt ja in deren Kopf), und
  vom Beobachteten bleiben lokal nur die Hände sichtbar.
- **Third Person** — die Kamera schwebt hinter dem Spieler. Sie bleibt immer
  waagerecht; nur die Drehung zieht weich nach, damit das Bild nicht bei jedem
  Kopfruck mitzuckt.

Steht der gewählte Spieler in einer anderen Welt, wechselst du automatisch
dorthin. Verlässt er die Sitzung, fällt die Kamera auf *Frei* zurück.

Der Regler **Kamera-Glättung** bestimmt, wie träge das passiert: ganz links
folgt die Kamera 1:1, ganz rechts schwenkt sie deutlich verzögert nach. In First
Person glättet derselbe Regler die Kopfbewegung; **Horizont stabilisieren** wirft
zusätzlich die Kopfneigung weg, was gegen Übelkeit hilft.

Ziehen mit Maus oder Finger dreht die Kamera zusätzlich — in Third Person orbitet
sie um den Spieler, in First Person schaut man sich aus dessen Kopf um. Das
Mausrad ändert den Abstand, *Ansicht zentrieren* setzt den Drag zurück.

**Im Headset** gibt es dieselben Optionen, aber mit einem Unterschied: übernommen
wird nur die *Position* des anderen Spielers, nie seine Blickrichtung. Genau das
Umdrehen des Kopfes ohne eigenes Zutun macht in VR übel. Man wird also
mitgetragen und schaut sich dabei frei um. Solange das läuft, ist die eigene
Fortbewegung eingefroren (`PlayerRig.paused`); beim Zurückschalten auf *Frei*
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
