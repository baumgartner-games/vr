# Die Seite selbst

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

## Die Eingabeseite

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

### Zwei Karten: wo ein Knopf sitzt, und was er tut

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

### Was der Browser der PS5 kann, und was nicht

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

## Menü → Eingaben

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

## Vollbild, wo keine Brille ist

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

## Die Seite als App: Manifest, Symbole, Service Worker

**Die Spielwiese lässt sich installieren** — auf dem Telefon, am Schreibtisch
und in der Brille —, und danach ist sie eine App mit eigenem Symbol, eigenem
Fenster und einem Start, der kein Netz braucht. Das ist keine zweite Fassung
des Projekts, sondern dieselbe Seite mit vier Zutaten: einem Manifest, Symbolen
als PNG, einem Service Worker und einem Knopf, der nur dasteht, wo er etwas
bewirkt.

Der Anlass steht einen Abschnitt weiter oben: **Auf dem iPhone ist das
Installieren der einzige Weg zum Vollbild.** Alles andere kam dazu, weil es
ohnehin danebenlag.

### Das Manifest (`public/manifest.webmanifest`)

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

### Die Symbole (`public/icon.svg`, `tools/icons.mjs`)

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

### Der Service Worker (`src/sw.ts`, `core/swRoutes.ts`)

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

### Der Knopf (`core/install.ts`, `core/pwa.ts`, `#install`)

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
