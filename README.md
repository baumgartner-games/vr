# Baumgartner VR

**Live: https://baumgartner-games.github.io/vr/**

**Werkzeug-Übersicht: https://baumgartner-games.github.io/vr/tools.html** —
alle Werkzeuge, Welten, der magische Beutel und die NPCs zum Ansehen und
Drehen, ohne Brille, auf dem Handy.

[![Baumgartner VR](public/banner.svg)](https://baumgartner-games.github.io/vr/)

WebXR-Spielwiese als Basis für weitere VR-Spiele und Experimente: Hub-Welt,
Portal Labor, Schießstand, Dust, eine Gokart-Strecke, eine Pizzeria, der Mond
mit einem Sechstel Schwerkraft, die Alpen mit Hängegleiter und Flügeln, ein
Dunkelhaus zum Ausprobieren von Licht, eine **Kletterhalle**, in der Greifen
dich an der Wand hält — der Halt wird gerechnet, aus Material, Form,
Körperhaltung und dem Verspreizen im Kamin, und schlechte Griffe kosten
Ausdauer —, ein **Effektlabor** mit einem großen
roten Knopf für Rauch, Feuer, Funken und Explosionen und
ein **Bauplatz**, in dem der Grundriss als Miniatur vor einem schwebt — greifen
und schieben, zwei Hände drehen und zoomen, tippen setzt Boden, Wände und Türen,
und alles wächst in Lebensgröße um einen herum —, und
ein Eingaberaum zum Einstellen von Händen und Werkzeugen — mit einem
**Poseraum**, in dem ein Schwebekasten losgelassene Werkzeuge in der Luft hält,
damit man die blanke Hand daran einmessen kann — samt jedem einzelnen Gelenk —, ein Werkzeuggürtel
voller Spielzeug — darunter ein **magischer Beutel** zum Hineingreifen, aus dem
Klötze, Rampen, Murmeln und ein ganzer Satz Würfel kommen, und ein **Schild**,
das man irgendwo hinstellt und mit Markdown beschriftet (Überschriften, Listen,
Bilder), das von selbst rollen kann und das alle im Raum sehen — der Aushang
für eine Lobby; getippt wird in der Brille auf Wunsch mit der **Systemtastatur
der Quest** —, **NPCs**, die
einem hinterherlaufen (Haut und Hirn getrennt gewählt, dazu Spawnpunkte und
Brutkäfige, mit Lebensbalken über dem Kopf — ein Zombie hat hundert Leben, die
Pistole macht fünfundzwanzig, das Messer fünfzig und der große Hammer hundert,
Kopftreffer vierfach) und
Peer-to-Peer-Sitzungen ohne eigenen Server — mit
räumlichem Sprach-Chat und Karts, die man gegeneinander fahren kann. Jede Welt
steht auf einer Fläche bis zum Horizont, die Schwerkraft steht im Menü, und
die Stoppuhr hält die Zeit an, spult Einzelbilder vor oder lädt eine
gespeicherte Aufstellung zurück.
three.js + TypeScript + Vite, ohne externe Assets — alles wird prozedural
gebaut.

> **Hinweis für Agenten:** Entwickelt und gepusht wird **direkt auf `main`** —
> kein Feature-Branch, kein Pull Request, solange nichts anderes im Auftrag
> steht. Das ganze Projektwissen — Features im Detail, vollständige Steuerung,
> Architektur, Portale, Netzwerk, Deployment — steht in **[AGENTS.md](AGENTS.md)**.

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Typecheck + Produktionsbuild nach dist/
npm run preview  # gebautes Ergebnis lokal servieren
npm test         # Jest
```

WebXR braucht einen sicheren Kontext; `localhost` reicht, für die Brille im
selben WLAN am einfachsten über HTTPS-Tunnel oder `vite dev --https`.

## Tests

Jest testet die reine Rechen-Logik ohne Browser — Ferngreifen, Achsenzuordnung,
Werkzeug-Pose, Handhaltung, Handgesten, Waffenwerte, Zielrichtung,
Konfig-Code, den Lichtkegel der Taschenlampe, die Gürtel-Position samt der
Spiegelung beider Hüften, die Portaltiefe, die Lichtstufen
des Dunkelhauses, den Halt an der Kletterwand samt Ausdauer und der Vibration
dazu, die Blätterposition der Menüs und den Weg durch sie, die
Augenhöhen, die Vibrationsmuster, die beiden Justierstände im Eingaberaum samt
der Rechnung hinter der Boxhand am Werkzeug, den Standardgriff, der bei jeder
Haltung an derselben Stelle in der Faust landet, die Faust am Griff (eine
Einstellung für alle Werkzeuge mit demselben Griff), die Räumung nach dem
Loslassen (ob ein Ding noch im Spieler steckt), den Griff am Stiel des großen
Hammers samt seiner zweihändigen Lage, die Fahrphysik,
Streckenführung und Rundenzählung der Karts, das Pizza-Rezept, die Welt-Physik, die Rettung aus
der Tiefe, die Stoppuhr-Einstellungen, den Markdown-Umbruch der Schilder samt
ihrem Rollen und dem, was von ihnen über das Netz geht, die Türen des
Interaktionslabors, die Pinselwerte (Breite, Art und die eigene
Farbreihe), die Materialien, die Dicke der Bodenplatte, den
Kurzcode für ein einzelnes Werkzeug (samt der Zahlen, an denen seine Länge
hängt), die Zuordnung von Stand zu Zielscheibe im Schießgang, den Chat-Verlauf
samt Putzen fremden Textes, die Wahl des Gastgebers einer geteilten Welt, die
Auslegung der Hub-Gänge, die Flächen der Würfel (dass gegenüberliegende
Seiten zusammen `n + 1` ergeben, wie auf einem echten Würfel), die Passung des
Handschuhs auf die Knochen einer getrackten Hand, die **Messung dieser Knochen**
(eine Hand aus bekannten Winkeln bauen und nachsehen, ob die Messung sie wieder
herausgibt), die **Knochenfarben**, die geteilte Handhaltung auf
dem Weg über die Leitung, die Maße des Poseraums, den **Bauplan des Editors**
(worauf ein Zeiger trifft — Kachel oder Kante —, was die vier Werkzeuge daraus
machen, und dass die gebauten Quader vom Abtasten wiedergefunden werden) samt
der **Miniatur** (Hin und Zurück ohne Drift, und dass der Punkt zwischen den
Fingern beim Ziehen liegen bleibt) und das **ganze Navigationslabor auf einmal**
(ein Körper mit Umfang und Drehrate läuft jede Bucht ab, und je Bucht prüft ein
Kontrollpunkt, dass er den richtigen Weg genommen hat). Diese
Module kommen ohne three.js und Rapier aus, deshalb braucht Jest weder WebGL
noch WebXR. Was schwer zu testen ist, gehört möglichst in so ein Modul — der
Rest bleibt Verdrahtung.

## Werkzeugseite

Neben dem Spiel steht **[`/tools.html`](https://baumgartner-games.github.io/vr/tools.html)**:
alle Werkzeuge als Liste, jedes einzeln in 3D zum Drehen, und die Hand dazu
ein- und ausschaltbar — als zwei verschiedene Hände: *Hand in VR* (die
gezeichnete Hand am Werkzeug, so sieht es in der Brille aus) und *Hand in echt*
(die eigene Hand am roten Handgriff des Geräts, mit dem Werkzeug als Geist
daneben). Werkzeug und Zielscheibe bleiben dabei an derselben Stelle; was
wechselt, ist die Hand. Aus ihr läuft die **weiße Linie** des Zeigestrahls
sauber nach vorn auf die Zielscheibe, genau wie in der Brille. Der Knopf **Bearbeiten** oben in der Ecke (an einem
einzelnen Werkzeug) macht daraus einen Justierstand fürs Telefon: oben die Achse (X, Y, Z, Yaw, Pitch, Roll — immer
nur eine), unten der Regler. Bewegt wird dabei die **Hand** — das Werkzeug steht
still —, und ein Umschalter sagt, wohin die Haltung übernommen wird: als *Lage
in der Hand* oder als *Griffhaltung am Griff*. Wohin ein Werkzeug **zielt**,
sagt ein violetter Pfeil an allem, was zielt. Zwei Knöpfe legen die Hand mit
einem Tipp an eine dieser Richtungen: **Auf den Zylinder** (Richtung und
Ursprung — die Fingerspitze landet im Halter) und **In Zielrichtung** (nur die Richtung, die
Spitze bleibt liegen). Und der Regler dreht die Hand um die **Fingerspitze**
statt um ihr Handgelenk, damit die aufgelegte Linie beim Drehen und Rollen
liegen bleibt. Alles landet in denselben Speichern wie
in der Brille, und der **Konfig-Code** dazu steht gleich darunter zum Kopieren.
Über die Schublade daneben die
**Welten** (jede ganz zum Drehen, schräg von oben für den Überblick, Räume mit
Decke aufgeschnitten wie ein Puppenhaus, und beliebig nah heranzuzoomen — zwei
Finger schieben und zoomen dabei wie auf einer Karte; mit
**Freie Kamera** fliegt man wie mit einer Drohne hindurch — W A S D und
hoch/runter als Knöpfe oder Tasten, Wischen dreht den Blick —, dazu ein Knopf
hinein) — und **Laufen lassen**: dieselbe Welt mit echter Physik, Gitter und
NPCs, senkrecht von oben, mit den Knöpfen der Welt als Zeilen daneben, den
sieben Debug-Ebenen des Navigationsgitters als Schalter — darunter die
**betretbare Fläche** und der **Sichtkegel** der NPCs — und einem **Ziel**, das
ein Tipp auf den Boden versetzt und dem die NPCs nachlaufen. Mit **Gehe zu**
geht die eigene Figur stattdessen zu Fuß dorthin — über dasselbe Gitter wie die
NPCs, durch dieselben Türen und Portale —, mit **Im Bereich** legt ein Tipp
einen Kreis hin und die Liste zeigt nur noch, was darin (oder in Reichweite der
Figur) zu drücken ist, und mit **Figur weg** steht man gar nicht erst in der
Welt. Die Karte selbst hat zwei eigene Knöpfe: **Ziehen** schaltet zwischen
Drehen und Schieben um, **Folgen** legt die Bildmitte auf die Figur. Im
[Navigationslabor](https://baumgartner-games.github.io/vr/tools.html#welt/navlab)
ist das die ganze Brille, die man zum Zusehen braucht. Dazu der
**Magische Beutel** (jedes Objekt mit Masse und Maßen) und die **NPCs** (jede
Haut geht auf der Stelle, jedes Hirn mit seinen Zahlen daneben). Keine Brille
nötig, das Telefon reicht.

Und **Verbinden**: derselbe Raum-Code wie beim Zusammenspielen, aber ohne Spiel
darin. Wer in der Brille im **Poseraum** _Handpose teilen_ drückt, dessen Hand
steht hier live am Werkzeug — nur die eine Hand, nichts drumherum —, und ihr
Konfig-Code steht darunter in einem Feld zum Herauskopieren. Details in
[AGENTS.md](AGENTS.md#die-werkzeugseite).

## Query-/Hash-Parameter

| Parameter | Wirkung |
| --- | --- |
| `#portal` | startet direkt in dieser Welt (jede Welt-ID funktioniert) |
| `?world=portal` | dasselbe als Query-Parameter |
| `?room=mond-riff-47` | trägt den Raum-Code ins Verbindungs-Formular ein (Einladungslink) |
| `?net=local` | nutzt `BroadcastChannel` statt WebRTC — zwei Tabs auf einem Rechner |

Im Browser liegt die App zum Debuggen auf `window.bgvr`.

## Steuerung

| | VR | Desktop | Handy |
| --- | --- | --- | --- |
| Bewegen | linker Stick (reindrücken = Sprint) | `WASD`, `Shift` | linker Touch-Stick |
| Umsehen | Kopf, rechter Stick = Snap-Turn | Maus (Klick = Pointer-Lock) | wischen |
| Springen / Ducken | `A` rechts / rechten Stick reindrücken | `Leertaste` | – |
| Menü | Button an beiden Händen (immer nur eins offen) | `Menü` im HUD | `Menü` im HUD |
| Auswählen | zielen + Trigger oder `A` | Linksklick | tippen |
| Werkzeug nehmen/ablegen | Grip an der Hüfte; woanders loslassen lässt es fallen | – | – |
| Hüften verschieben | Gürtel-Justierer: Hüfte anzielen, Trigger, mit der anderen Hand schieben | – | – |
| Ohne Controller | 3 Finger an die Handfläche = Greifen, Zeigefinger = Trigger | – | – |
| Sitzen oder stehen | Startseite oder Menü → Bewegung → Haltung | dito | dito |
| Verbinden | Menü → Verbindung → *Raum betreten*; geht mitten im Spiel, ohne die Sitzung zu verlassen | Raum-Code auf der Startseite | dito |
| Chat | Menü → Verbindung → Chat (lesen, *Schreiben* öffnet die Tastatur) | Panel *Verbindung*: tippen, je Zeile *Kopieren* und *Übernehmen* | dito |
| Sprechen | Menü → Verbindung → *Mikrofon* — die Stimmen kommen aus der Richtung, in der die anderen stehen | Panel *Verbindung* → *Sprache* | dito |
| Werkzeug benutzen | Trigger (Greifen = zweite Funktion) | Links-/Rechtsklick | – |
| Großer Hammer | irgendwo am Stiel greifen, zweite Hand dazu; Trigger halten schiebt die Hand am Stiel | – | – |
| Hängegleiter (Alpen) | Trigger = Anlauf; Bügel ziehen = schneller, drücken = langsamer, zur Seite = Kurve; loslassen am Boden lässt ihn fallen | – | – |
| Flügel (Alpen) | beide Arme schlagen = Start und Schub; ausbreiten = gleiten; eine Hand tiefer = Kurve | – | – |
| Taschenlampe | Trigger schaltet; andere Hand an der Linse zieht den Kegel breit/schmal | – | – |
| Pinsel | Palette an der anderen Hand: antippen **oder** anzielen + Trigger; Regler für RGB und Strichbreite gedrückt halten und ziehen; ✕ schließt sie, `A`/`X` öffnet sie | Linksklick | – |
| Staffelei | Trigger stellt sie auf den Boden und die Hand ist danach frei; Griff an der Ablage + Greifen nimmt sie wieder auf; `A`/`X` wischt die Leinwand; gemalt wird mit dem Pinsel | – | – |
| Aufheben / werfen | Grip mit leerer Hand am Objekt | – | – |
| Ferngreifen | zielen, Grip, Hand zum Körper zucken (ab 8 m/s, einstellbar) | – | – |
| Kart: einsteigen | Lenkrad greifen (oder anzielen + Trigger) | Lenkrad anklicken | – |
| Kart: fahren | rechter Trigger Gas, linker bremst, linker Stick lenkt | `W`/`S`, `A`/`D` | – |
| Kart: aussteigen | `A`/`X` halten | `E` halten | – |
| Kart: zu zweit | im selben Raum verbinden — jeder nimmt ein Kart, die Tafel zeigt die Reihenfolge | dito | – |
| Pizza: kneten | Faust auf den Teig auf dem Tisch schlagen | – | – |
| Pizza: belegen | Kelle/Streuer greifen, Trigger halten | – | – |
| Handpose einmessen (Poseraum) | Werkzeug im Schwebekasten loslassen, blanke Hand daran, mit der Controller-Hand auf *Handpose teilen* zeigen; deren Trigger speichert | – | – |
| Schwebekasten feststellen | Knopf *Schwebe* an der Wand im Poseraum — was darin hängt, steht still und lässt sich nicht greifen | – | – |
| Zurücksetzen | `B` / `Y` oder Menü | `R` oder Menü | Menü |

Die vollständige Tabelle samt aller Werkzeuge steht in [AGENTS.md](AGENTS.md#steuerung).

## Konfig-Code

Werkzeug-Posen, Handhaltungen, Anbauteile und Waffenwerte passen zusammen in
eine kopierbare Zeile (`BG3…`) — und ein einzelnes Werkzeug an einer einzelnen
Hand in eine so kurze, dass man sie abtippt. In VR unter
*Einstellungen → Konfig-Code*,
am Rechner über die Kommandozeile:

```bash
npm run config -- decode BG3…          # zeigt die Einstellungen als JSON
npm run config -- encode config.json   # macht wieder einen Code daraus
npm run config -- mirror BG3… left     # linke Handhaltungen nach rechts
```
