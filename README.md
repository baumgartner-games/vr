# Baumgartner VR

**Live: https://baumgartner-games.github.io/vr/**

**Werkzeug-Übersicht: https://baumgartner-games.github.io/vr/tools.html** —
alle Werkzeuge, Welten und der magische Beutel zum Ansehen und Drehen, ohne
Brille, auf dem Handy.

[![Baumgartner VR](public/banner.svg)](https://baumgartner-games.github.io/vr/)

WebXR-Spielwiese als Basis für weitere VR-Spiele und Experimente: Hub-Welt,
Portal Labor, Schießstand, Dust, eine Gokart-Strecke, eine Pizzeria, der Mond
mit einem Sechstel Schwerkraft, die Alpen mit Hängegleiter und Flügeln, ein
Dunkelhaus zum Ausprobieren von Licht und
ein Eingaberaum zum Einstellen von Händen und Werkzeugen, ein Werkzeuggürtel
voller Spielzeug — darunter ein **magischer Beutel** zum Hineingreifen, aus dem
Klötze, Rampen, Murmeln und ein ganzer Satz Würfel kommen — und
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
des Dunkelhauses, die Blätterposition der Menüs und den Weg durch sie, die
Augenhöhen, die Vibrationsmuster, die beiden Justierstände im Eingaberaum samt
der Rechnung hinter der Boxhand am Werkzeug, den Standardgriff, der bei jeder
Haltung an derselben Stelle in der Faust landet, die Faust am Griff (eine
Einstellung für alle Werkzeuge mit demselben Griff), die Räumung nach dem
Loslassen (ob ein Ding noch im Spieler steckt), den Griff am Stiel des großen
Hammers samt seiner zweihändigen Lage, die Fahrphysik,
Streckenführung und Rundenzählung der Karts, das Pizza-Rezept, die Welt-Physik, die Rettung aus
der Tiefe, die Stoppuhr-Einstellungen, die Materialien, die Dicke der Bodenplatte, den
Kurzcode für ein einzelnes Werkzeug (samt der Zahlen, an denen seine Länge
hängt), die Zuordnung von Stand zu Zielscheibe im Schießgang, den Chat-Verlauf
samt Putzen fremden Textes, die Wahl des Gastgebers einer geteilten Welt, die
Auslegung der Hub-Gänge und die Flächen der Würfel (dass gegenüberliegende
Seiten zusammen `n + 1` ergeben, wie auf einem echten Würfel). Diese
Module kommen ohne three.js und Rapier aus, deshalb braucht Jest weder WebGL
noch WebXR. Was schwer zu testen ist, gehört möglichst in so ein Modul — der
Rest bleibt Verdrahtung.

## Werkzeugseite

Neben dem Spiel steht **[`/tools.html`](https://baumgartner-games.github.io/vr/tools.html)**:
alle Werkzeuge als Liste, jedes einzeln in 3D zum Drehen, und die Boxhand dazu
ein- und ausschaltbar — wahlweise *in der Hand* (so liegt das Werkzeug darin)
oder *am Werkzeug* (so umfasst die Hand es), mit einer Linie daran, wohin der
Zeigefinger zeigt. Der Knopf **Bearbeiten** oben in der Ecke (an einem
einzelnen Werkzeug) macht daraus einen Justierstand fürs Telefon: oben die Achse (X, Y, Z, Yaw, Pitch, Roll — immer
nur eine), unten der Regler. Bewegt wird dabei die **Hand** — das Werkzeug steht
still —, und ein Umschalter sagt, wohin die Haltung übernommen wird: als *Lage
in der Hand* oder als *Griffhaltung am Griff*. Der Knopf **Auf den Griff** legt
die Hand mit einem Tipp dorthin, wo die Linie am Zeigefinger auf dem rosa Pfeil
des Griffs liegt — gleiche Richtung, gleicher Ursprung; von dort aus versetzt
der Regler weiter. Alles landet in denselben Speichern wie
in der Brille, und der **Konfig-Code** dazu steht gleich darunter zum Kopieren.
Über die Schublade daneben die
**Welten** (jede ganz zum Drehen, schräg von oben für den Überblick — Räume mit
Decke aufgeschnitten wie ein Puppenhaus —, dazu ein Knopf hinein) und der
**Magische Beutel** (jedes Objekt mit Masse und Maßen). Keine Brille nötig, das
Telefon reicht. Details in [AGENTS.md](AGENTS.md#die-werkzeugseite).

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
| Hängegleiter (Alpen) | Trigger = Anlauf; Bügel ziehen = schneller, drücken = langsamer, zur Seite = Kurve | – | – |
| Flügel (Alpen) | beide Arme schlagen = Start und Schub; ausbreiten = gleiten; eine Hand tiefer = Kurve | – | – |
| Taschenlampe | Trigger schaltet; andere Hand an der Linse zieht den Kegel breit/schmal | – | – |
| Aufheben / werfen | Grip mit leerer Hand am Objekt | – | – |
| Ferngreifen | zielen, Grip, Hand >30° nach oben kippen | – | – |
| Kart: einsteigen | Lenkrad greifen (oder anzielen + Trigger) | Lenkrad anklicken | – |
| Kart: fahren | rechter Trigger Gas, linker bremst, linker Stick lenkt | `W`/`S`, `A`/`D` | – |
| Kart: aussteigen | `A`/`X` halten | `E` halten | – |
| Kart: zu zweit | im selben Raum verbinden — jeder nimmt ein Kart, die Tafel zeigt die Reihenfolge | dito | – |
| Pizza: kneten | Faust auf den Teig auf dem Tisch schlagen | – | – |
| Pizza: belegen | Kelle/Streuer greifen, Trigger halten | – | – |
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
