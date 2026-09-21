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

## Der Start: erst die Hülle, dann die Welt

**Die Seite soll dastehen, bevor sie voll ist.** Das ist keine Feinheit,
sondern seit dem KayKit-Regal eine Frage der Größenordnung: Im Netz liegen
knapp 60 MB, und wer davon beim Start auch nur das Falsche anfasst, hat eine
Seite, die auf einem Telefon minutenlang nichts zeigt.

Gemessen wurde das, bevor daran etwas geändert wurde — mit einem Chromium über
einem Server, der sich wie GitHub Pages verhält (gezippt, mit `ETag`,
`max-age=600` für alles mit Hash im Namen), bei 1,5 Mbit/s und 150 ms
Laufzeit, im Fenster eines Telefons. Der Befund war nicht der erwartete:

- **Das Regal war nie im Weg.** Vor dem ersten Bild wird davon keine einzige
  Datei angefasst, und `index.json` erst, wenn jemand das Regal aufklappt
  (`docs/agents/assetregal.md`). Die 57 MB stehen im Netz und nicht im Start.
- **Das erste Bild kam nach 1,3 s**, und es ist die fertige Startseite: Sie
  steht als HTML in `index.html`, ihr Stil ist eine Datei, und beides zusammen
  sind 11 kB gezippt.
- **Aber danach war die Seite lange stumm.** An Ort und Stelle im Modulrumpf
  von `main.ts` stand ein `void app.goTo(startWorld)`: Die Standardwelt lud
  los, sobald das Skript lief — Chunk, Physik-Engine (1 MB gezippt), Modelle
  und Töne, zusammen rund 2,6 MB — und zwar **bevor irgendjemand _Beitreten_
  gedrückt hatte**. Bis die Seite auf eine Frage antwortete, waren 556 kB
  über die Leitung gegangen; ein Klick in dieser Zeit lief ins Leere.
- **Und jeder spätere Start holte 1,6 MB, die er schon hatte.** Modelle und
  Töne beantwortet der Service Worker mit _stale-while-revalidate_ — sofort
  aus dem Speicher, und danach noch einmal im Netz nachsehen. Nur tragen sie
  die Build-Nummer in der Adresse: Es _kann_ nichts Neues geben.

### Was jetzt passiert, und in welcher Reihenfolge

1. **Die Hülle.** `index.html`, der Stil und das Hauptbündel — **ohne
   three.js**: 23,6 kB Seite, 14,4 kB Stil und 22,5 kB Skript, zusammen rund
   20 kB gezippt. Mehr braucht die Startseite nicht, und mehr wird dafür auch
   nicht angefasst (siehe _Und three.js kommt erst nach der Startseite_).
2. **Der Service Worker**, sobald `load` gefeuert hat (`core/pwa.ts`) — vorher
   nicht: Beim Start ist jedes Byte für die Hülle da.
3. **Und dann, wenn der Browser Luft hat, das Vorwärmen** — `requestIdleCallback`
   mit 1,5 s Frist und einem Zeitgeber dort, wo es die Funktion nicht gibt
   (**Safari kennt sie bis heute nicht**, und das sind genau die Geräte, auf
   denen ein warmer Speicher am meisten wert ist).

Was dabei gewärmt wird, steht in `core/warmStart.ts` — reine Rechnung mit
Test, wie `core/screenPads.ts`, und aus demselben Grund: Die Bedingung hängt
an fünf Signalen, und eine Bedingung aus fünf Signalen im Modulrumpf ist eine,
die beim nächsten Umbau nur noch halb stimmt. Zwei Schritte gibt es:

| Schritt | Was | Warum in dieser Reihenfolge |
| ------- | --- | --------------------------- |
| `welt` | Die Standardwelt betreten lassen — Chunk, Physik, ihre Modelle und Töne | Danach ist der erste Druck auf _Beitreten_ sofort da, und ein Start ohne Netz kommt in einer Welt heraus statt auf einer leeren Seite |
| `regal` | **Nur** `models/kaykit/index.json`, 31 kB gezippt | Ein Vorrat für ein Menü. Das Regal selbst — 4470 Dateien, 57 MB — wird **nie** gewärmt: Sein ganzer Entwurf ist, dass ein Ordner erst lädt, wenn jemand ihn aufklappt |

**Und fünf Gründe, es zu lassen.** Vorwärmen ist eine Freundlichkeit und kein
Auftrag; gefragt wird vor **jedem** Schritt neu, denn zwei davon schlagen
mitten im Wärmen um:

- **Die Startseite ist eine Lobby** (`#haunting`). Der einzige der fünf
  Gründe, der nichts mit Bandbreite zu tun hat — und der, der einen Abend
  gekostet hat. Wer zu einer Runde eingeladen wurde, trägt erst Namen und
  Raum-Code ein und wählt dann seinen Weg hinein; die Welt **liest diese Wahl
  beim Aufbau aus dem Speicher** und nimmt sich einen Raum, wenn sie in keinem
  ist. Eine vorgewärmte Runde steht deshalb mit der falschen Rolle da, hat sich
  ihren eigenen Raum genommen, und `App.goTo` sagt beim Druck auf den Knopf nur
  noch „bin schon da". Im Rauchtest (`tools/browser-smoke.mjs`) sah das aus wie
  eine Einsatzzentrale, die nie kommt.
- **Der Spieler hat selbst etwas angefordert.** Der Knopf, das Menü, eine Welt
  in der Adresse — alle drei rufen `stopWarming`, und ein laufender
  Vorrats-Abruf wird dabei wirklich abgebrochen (`AbortController`) und nicht
  nur nicht mehr abgewartet.
- **Der Tab liegt im Hintergrund.** Kommt er zurück, ist der übersprungene
  Schritt wieder dran (`visibilitychange`).
- **Daten sparen** (`navigator.connection.saveData`) — wer das einschaltet,
  hat die Frage beantwortet, bevor wir sie stellen.
- **`effectiveType` ist `2g` oder `slow-2g`.** Auf `3g` lohnt sich die Welt
  noch, der Index eines Menüs nicht mehr.

**„Kein Netz" steht ausdrücklich nicht in dieser Liste**, und das war eine
Korrektur: Es stand einen Nachmittag lang darin, und heraus kam eine
installierte App, die im Funkloch zwar startete, aber auf der Startseite
stehenblieb — obwohl jedes Modell und jeder Ton im Speicher lag. Ohne Netz
kostet das Wärmen nichts; genau dann ist es am meisten wert.

Die Netzwerk-API ist dabei **optional**, und `undefined` heißt „keine
Auskunft" und nicht „schlecht": Sonst bekämen ausgerechnet iPhone und iPad nie
einen warmen Speicher.

### Und wer schneller drückt, als die Leitung liefert

Die Welt kommt nicht mehr von allein, also wird sie beim Druck auf _Beitreten_
angefordert (`ensureWorld` — dieselbe Promise, die auch das Vorwärmen benutzt,
nie zwei Ladungen). Ist sie schon da, passiert gar nichts Sichtbares. Ist sie
es nicht, **sagt die Seite das**: Der Knopf wird stumpf, und darunter steht
`Die Welt wird geladen …` (`#start-note`). Vorher verschwand die Startseite in
diesem Fall sofort und gab den Blick auf ein schwarzes Bild frei — das sah
schneller aus und war es nicht.

Die XR-Sitzung wird dabei **zuerst** angefragt und die Welt daneben geladen —
dieselbe Reihenfolge wie in `startHaunting` und aus demselben Grund: Ein
Browser gibt eine immersive Sitzung nur auf eine frische Geste, und die wäre
nach dem Warten auf einen Chunk verbraucht.

### Die Zahlen

Median aus drei kalten Starts je Fassung, jedes Mal ein **frischer Browser**
und nichts daneben (1,5 Mbit/s, 150 ms Laufzeit, Fenster eines Telefons).
„Antwortet" heißt: Die Seite beantwortet eine Frage aus dem Skript — genau
das, was ein Klick von ihr will. „Welt steht" heißt `App.currentWorldId`, also
nach `init` und nicht, wenn die Startseite verschwindet; gedrückt wurde in der
ersten Sekunde, in der es überhaupt ging.

| Messpunkt | vorher | nachher |
| --------- | -----: | ------: |
| Erstes Bild (FCP) | 1060 ms | 1068 ms |
| Seite antwortet | 3201 ms | 3205 ms |
| **Anfragen bis dahin** | **16** | **14** |
| **Bytes bis dahin** | **556 kB** | **305 kB** |
| Welt steht (sofort gedrückt) | 3722 ms | 3439 ms |
| Bytes bis die Welt steht | 1809 kB | 1810 kB |
| **Späterer Start: Anfragen** | **33** | **5** |
| **Späterer Start: Bytes** | **1611 kB** | **429 kB** |
| Start ohne Netz nach einem Besuch | geht | geht |

Ohne Drosselung derselbe Befund, nur deutlicher bei den Bytes: FCP
680 → 756 ms, antwortet 2021 → 2152 ms, Welt 2318 → 2379 ms — alles innerhalb
der Schwankung dieses Containers —, bis zur Antwort **755 → 305 kB**, bis zur
Welt **3265 → 1810 kB**.

**Und vier Sätze zur Ehrlichkeit dieser Tabelle:**

- **Der Gewinn war damals die Last und nicht die Uhr.** Bis die Seite
  antwortete, waren es halb so viele Bytes; die Sekunde davor blieb, wie sie
  war. Auf dieser Strecke lag nämlich three.js (202 kB gezippt, rund 1,1 s bei
  1,5 Mbit/s) und der Aufbau des Renderers — beides braucht die Startseite
  nicht, aber `main.ts` importierte es **fest**. Hier stand einmal, das
  aufzulösen sei „ein eigener Umbau" und „die nächste lohnende Sache an dieser
  Stelle". Sie ist inzwischen getan; die Zahlen dazu stehen weiter unten unter
  _Und three.js kommt erst nach der Startseite_.
- **Die Welt kommt trotzdem nicht später.** Das war die Sorge, und sie hat
  sich nicht bestätigt: Wer in der ersten Sekunde drückt, steht dreihundert
  Millisekunden früher in der Welt als vorher. Die eigentliche Ladung fing
  ohnehin erst an, als `main.ts` fertig ausgewertet war.
- **Vorher log die Startseite.** Sie verschwand beim Druck sofort — nach
  gemessenen 755 kB von 1809 — und gab den Blick auf eine Welt frei, die es
  noch nicht gab. Jetzt bleibt sie stehen und sagt, worauf gewartet wird.
- **Die 429 kB eines späteren Starts sind die Controller-Modelle**, und sie
  bleiben mit Absicht: Sie tragen keine Build-Nummer, weil sie sich nicht mit
  dem Build ändern, und sind damit die einzigen Dateien, die weiter nachgeholt
  werden. Gemessen ist das der schlechteste Fall — ein Browser, dessen
  HTTP-Cache ganz weg ist. Solange der noch steht, beantwortet GitHub Pages
  dieselbe Frage mit `304` und ohne Inhalt.

### Der Ladebalken, der schon dasteht, bevor ein Skript läuft

Gemeldet wurde es so:

> „Der Ladebalken war nicht sichtbar. Die startete langsam Index Start Page."

Beides stimmte, und beides war dieselbe Sache. Die Startseite **stand** nach
einer halben Sekunde — aber bis sie auf eine Frage antwortete, vergingen
gemessene **2,1 Sekunden**, und in dieser Zeit sah sie fertig aus und erzählte
nichts. Wer in dieser Lücke auf _Beitreten_ drückte, drückte ins Leere; und die
einzige Anzeige, die es gab (`#start-note`), erschien erst **nach** dem Druck.

**Also steht der Balken im HTML und nicht in `main.ts`** (`index.html`,
`#boot`; der Lauf in `style.css`, `.boot__track`). Das ist der ganze Punkt:
Eine Anzeige, die das Hauptbündel baut, kommt genau dann, wenn die Wartezeit
vorbei ist. Diese hier ist da, sobald der erste Stil da ist — also im ersten
Bild.

Drei Entscheidungen stecken darin:

- **Unbestimmt, nicht prozentual.** Wie lange ein Bündel über diese Leitung
  braucht, weiß in dieser Sekunde niemand; ein geratener Prozentwert wäre eine
  Lüge mit Nachkommastelle. Der Streifen läuft, er zählt nicht.
- **Er ist dieselbe Zeile wie vorher.** `#start-note` liegt jetzt **im**
  Balken, und `showStartNote(text)` schaltet beide zusammen: Text und Balken
  gehen gemeinsam an und aus. Es gibt keinen zweiten Ort, an dem „lädt" steht.
- **Er hört auf, wenn es nichts mehr zu sagen gibt** — und das ist die
  Bedingung, die man leicht falsch macht: hinter einer Lobby sofort (dort wird
  nichts vorgewärmt), sonst, wenn die Welt steht — und **gleich**, wenn gar
  nicht gewärmt wird (Daten sparen, schmale Leitung, Tab im Hintergrund). Ein
  Balken, der ewig läuft, ist schlimmer als keiner: Er behauptet eine Arbeit,
  die niemand tut. Gefragt wird dafür dieselbe reine Rechnung wie beim
  Vorwärmen (`core/warmStart.nextWarmStep`), und nicht ein zweites Mal geraten.

Wer Bewegung abbestellt hat (`prefers-reduced-motion`), bekommt einen ruhigen
Streifen statt keiner Auskunft: Die Frage war „passiert etwas?" und nicht
„darf es wackeln?".

### Und three.js kommt erst nach der Startseite

`main.ts` importierte `core/App` und `ui/NetPanel` **fest**. Damit hingen
three.js (722 kB im Bündel), der Renderer, die Verbindungsbibliothek und die
Lobby-Regeln vor dem Augenblick, in dem die Seite auf eine Frage antwortet —
für eine Seite, die zuerst nur einen Knopf und zwei Umschalter zeigt, ist das
die falsche Reihenfolge.

Jetzt werden sie **geholt, wenn sie gebraucht werden** (`main.ts`,
`ensureApp`), und zwar von zwei Seiten, die dieselbe App bekommen:

- **im Leerlauf nach dem Start** (`bootApp`, nach `load` und
  `requestIdleCallback`), damit sie in aller Regel längst dasteht, bevor
  jemand drückt — und **vor** dem Vorwärmen, denn Vorwärmen _ist_ ein
  `App.goTo`;
- **bei der ersten Geste auf der Startseite** (`pointerdown`, `keydown`, einmal
  und dann abgemeldet) sowie in jedem Knopf, jedem Menü und jeder Welt in der
  Adresse.

Dasselbe gilt für die **Lobby-Bibliothek** (`worlds/haunting/net.ts`, 58 kB):
Sie kommt nur noch auf der Startseite einer Runde, und die Spielwiese fasst sie
nie an.

**Was dabei zu beachten war**, und es ist mehr als ein `await`:

- **Die Startseite muss ohne App vollständig bedienbar bleiben.** Haltung und
  Ansicht werden deshalb in den Speicher geschrieben, wenn es noch keine App
  gibt (`savePlayerPosture`, `saveScreenView`) — `PlayerRig` und `App` lesen
  beides beim Aufbau, es geht also nichts verloren. Die Lobby-Zeile sagt ohne
  App „noch nicht verbunden", und das ist die richtige Auskunft und kein
  Fehler.
- **`window.bgvr` kommt später.** Das ist die Konsolen-Abkürzung zum Debuggen,
  und sie steht erst, wenn die App steht.
- **Ein Gerät ohne 3D sagt es weiterhin.** Scheitert `new App` (kein WebGL),
  steht die Erklärung auf der Seite, jeder Knopf ist stumpf und der Balken
  hört auf — nur eben ein paar hundert Millisekunden später als vorher.
- **Die Hülle im Service Worker schrumpft mit.** `precacheList` nimmt die
  **festen** Importe mit; three.js ist keiner mehr. Es kommt beim ersten
  Besuch trotzdem in den Speicher, nur eben als `immutable`-Antwort beim
  Nachladen statt beim Einrichten (`core/swRoutes.ts`).

#### Die Zahlen davor und danach

Derselbe Aufbau wie oben: frischer Browser je Lauf, Fenster eines Telefons,
1,5 Mbit/s und 150 ms Laufzeit, HTTP-Cache aus, Median aus drei kalten Starts.
„Antwortet" heißt hier: Die Zeile unter der Frage steht — also der Augenblick,
ab dem ein Klick etwas bewirkt.

| Messpunkt | vorher | nachher |
| --------- | -----: | ------: |
| Erstes Bild (FCP) | 528 ms | **468 ms** |
| **Seite antwortet** | **2129 ms** | **579 ms** |
| Anfragen bis dahin | 13 | 10 |
| **Bytes bis dahin** | **294 kB** | **31 kB** |
| Welt angefordert (sofort gedrückt) | 2878 ms | 2304 ms |
| Welt steht (HUD ist da) | 4919 ms | 5642 ms |

**Drei Sätze zur Ehrlichkeit dieser Tabelle:**

- **Der Gewinn ist diesmal die Uhr.** Bis die Seite antwortet, ist sie
  **dreieinhalbmal** so schnell und braucht ein Zehntel der Bytes. Genau diese
  zwei Sekunden hat der Spieler als „startet langsam" erlebt.
- **Die Welt steht 0,7 s später, und das ist der Preis.** three.js kommt jetzt
  **nach** der Startseite statt davor; wer in der allerersten Sekunde drückt,
  wartet deshalb etwas länger auf den fertigen Aufbau. Das ist der richtige
  Tausch — die zwei Sekunden davor waren stumm, diese sind es nicht mehr: Der
  Balken läuft die ganze Zeit und sagt, worauf gewartet wird.
- **Gemessen ist der Container und nicht ein Telefon.** Er malt in Software;
  zwischen „Welt angefordert" und „Welt steht" liegt hier vor allem Rechenzeit
  und kaum Leitung. Auf einem Gerät mit GPU verschiebt sich dieser Teil, die
  Bytes bleiben.

**Ohne Netz ist es dieselbe Reihenfolge**, nur ohne Leitung: Nach einem
normalen Besuch (63 Einträge im Speicher) startet die abgeschaltete Seite in
**998 ms**, antwortet nach **1053 ms** und steht nach **5208 ms** in der Welt —
und der Balken war beim zweiten Blick auf die Startseite von selbst weg, weil
nichts mehr zu holen war. Die Hülle des Service Workers ist dabei kleiner
geworden; three.js kommt jetzt beim ersten Besuch als `immutable`-Antwort in
den Speicher und nicht mehr beim Einrichten.

#### Und ein Fehler, den nur der Rauchtest gefunden hat

Die Lobby-Bibliothek wird über eine Funktion geholt (`hauntNet()`), und ihr
Merker daneben ist ein `let`. Geschrieben stand beides zuerst **unter** der
Zeile, die es im Modulrumpf aufruft: Die Funktion wird hochgezogen, das `let`
nicht. Heraus kam ein `ReferenceError: Cannot access … before initialization`,
und zwar **nur** hinter `#haunting` — dort bricht die Auswertung des Moduls an
dieser Stelle ab, und die halbe Startseite bleibt versteckt stehen.

`npm run typecheck`, `lint`, `format:check` und `test` fanden davon nichts:
Es ist gültiges TypeScript, gültiges JavaScript und passiert erst zur Laufzeit,
auf einer Seite, die kein Jest-Test öffnet. Gefunden hat es der Rauchtest
(`tools/browser-smoke.mjs`), im zweiten Schritt, mit einem Knopf, der nicht
sichtbar wurde — das ist der zweite Fall in Folge, in dem er etwas gefunden
hat, was die vier Prüfungen nicht sehen können.

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

**Mit einer Einschränkung des dritten Weges**, und die ist gemessen: Trägt die
Adresse die Nummer **dieses** Builds (`?v=…`, `core/assetVersion.ts`), wird
nichts nachgeholt — es _kann_ nichts Neues geben, denn der nächste Build fragt
unter einer neuen Nummer, und was eine fremde trägt, wirft `dropOldMedia` beim
Aktivieren weg. Ohne diese Frage kostete ein Start, dessen HTTP-Cache
abgelaufen war (GitHub Pages erlaubt zehn Minuten), **33 Anfragen und 1,6 MB**
für Bytes, die schon im Telefon lagen; mit ihr sind es **5 Anfragen und
429 kB** — und die 429 kB sind die Controller-Modelle, die keine Nummer tragen.
Wer **kein** `v=` hat — die Controller-Profile, das Manifest —, bleibt beim
Nachholen: Diese Dateien ändern sich ohne Build-Nummer.

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
Mal wirklich gebraucht wird — und „wirklich gebraucht" heißt seit dem
fortschreitenden Start auch: vorgewärmt, wenn der Browser Luft hat und die
Leitung es hergibt (siehe [Der Start](#der-start-erst-die-hülle-dann-die-welt)).

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

## Alles herunterladen: ein Knopf, ein Balken, eine ehrliche Dauer

Das Vorwärmen einen Abschnitt weiter oben ist eine **Freundlichkeit**: Es holt,
was der Spieler als Nächstes wahrscheinlich anfasst, und tritt bei der
kleinsten Gelegenheit zurück. Dieser Knopf ist der **Gegenfall**, und er kam
als ein Satz:

> „Ich will dennoch einen Button haben um alle Ressourcen zu laden (für die
> PWA), sodass ich in Ruhe spielen kann und alle Dateien habe, mit Ladebalken
> und voraussichtlicher Dauer."

Wer gleich in den Zug steigt, will nicht geschont werden, sondern versorgt.
Also steht auf der Startseite unter dem Installieren ein zweiter Knopf,
**Alles herunterladen**, und dahinter liegen 71,5 MB in 4741 Dateien — das
ganze Programm, alle Modelle, alle Töne und das ganze KayKit-Regal.

### Drei Dateien, und jede tut genau eines

| Datei | Was darin steht |
| ----- | --------------- |
| `core/fullDownload.ts` | **Rein, mit Test**: der Plan, die Reihenfolge, die Stempelregel, der Fortschritt, die Restzeit — und jeder Satz, der auf dem Knopf steht |
| `core/fullDownloadRun.ts` | Das Holen: sechs Dateien gleichzeitig, zweite Versuche, Abbrechen, im Speicher nachsehen |
| `main.ts`, `#offline` | Vier Elemente und ein Zustandsautomat: Knopf, Balken, Zeile, Halteknopf |

Derselbe Schnitt wie überall hier, nur mit einem schärferen Grund als sonst:
**Ein Balken, der lügt, ist schlimmer als keiner** — und ob er lügt, sieht man
nur, wenn man die Rechnung ohne Browser nachrechnen kann.

### Die Liste steht nirgends — also schreibt der Build sie auf

Die eine Frage, an der alles hängt, ist **wie viele Bytes es sind**. Ohne Zahl
gibt es keinen Balken und erst recht keine Dauer, und die Zahl kennt zur
Laufzeit niemand: Die Chunks heißen erst nach dem Bündeln so, wie sie heißen,
und was unter `public/` liegt, weiß nur die Platte. Eine von Hand gepflegte
Liste wäre nach dem dritten Paket falsch.

Also schreibt der Build sie auf — `offline.json`, 15 kB, erzeugt von
`offlineListPlugin` in `vite.config.ts`, dem Nachbarn des `precachePlugin`,
das dem Service Worker seine Hüllenliste einsetzt. Zwei Listen darin, weil es
zwei Sorten Datei sind: `bundle` sind die 35 erzeugten Dateien (die drei
Seiten, jeder Chunk samt Welten und der 2,8 MB großen Physik-Engine, der
Stil), `files` sind die 236 Dateien aus `public/`.

**Die 4470 Modelle des Regals stehen nicht darin**, und das ist kein
Versehen: Sie stehen schon in `models/kaykit/index.json`, mit ihren Größen.
Zweimal aufgeschrieben wären sie zweimal zu pflegen und 210 kB doppelt. Ihre
**Texturen** stehen dagegen sehr wohl in `offline.json` — im Index stehen nur
`.glb` (`core/kaykitIndex.ts`), und ein heruntergeladenes Fass ohne seine
Textur ist im Funkloch ein weißes Fass.

Gelesen werden also zwei erzeugte Quellen und keine geschriebene. Wer ein Paket
dazutut, tut nichts weiter; wer eine Welt dazutut, auch nicht.

### Die Reihenfolge ist eine Aussage

Nicht nach Größe, sondern danach, **ab wann man ohne Netz spielen kann**:

| Abschnitt | Was | Wie viel |
| --------- | --- | -------: |
| `programm` | Die drei Seiten, alle Chunks, die Physik-Engine | 5,4 MB (35) |
| `medien` | Die drei gebündelten Kataloge, der Koch, die Töne, die Controller-Modelle, die Symbole | 8,8 MB (82) |
| `regal` | Der Index, die 153 Texturen, dann die 4470 Modelle | 57,2 MB (4624) |

Nach dem zweiten Abschnitt — nach einem Fünftel der Bytes — ist das **Spiel**
vollständig; die restlichen vier Fünftel sind das Regal, und genau das ist der
Teil, den man guten Gewissens abbricht. Innerhalb des Regals kommen die
Texturen **vor** den Modellen: Ein abgebrochener Download ergibt so ein Regal
mit weniger Fässern und nicht eines mit lauter weißen.

### Die Build-Nummer ist hier der teuerste Fehler

Ob an eine Adresse `?v=` gehört, entscheidet `stamped` — und es muss **auf das
Zeichen genau** so ausfallen wie in dem Lader, der die Datei später wirklich
anfragt. Eine Adresse mit `?v=` ist für einen Speicher ein anderer Name: Wer
hier falsch stempelt, lädt 71 MB herunter, sieht einen Balken durchlaufen und
findet im Funkloch trotzdem nichts wieder. Vier Regeln, und jede steht schon
woanders geschrieben:

- **Töne und die gebündelten Kataloge** tragen sie (`core/assetVersion.ts`).
- **Der Index des Regals** trägt sie, denn er ist erzeugt.
- **Das Regal selbst und seine Texturen** tragen sie nicht — 4470 gekaufte
  Dateien, die sich nie ändern ([Das KayKit-Regal](assetregal.md), _Keine
  Build-Nummer_). Eine `.glb` zeigt mit einer **relativen** Adresse auf ihre
  Textur, und three.js löst sie ohne Frage im Anhang auf.
- **Die Controller-Profile** tragen sie nicht (`core/ControllerModels.ts`).

Alles Übrige — Manifest, Symbole, Banner — fragt der **Browser** selbst an, und
der hängt nichts an. Deshalb ist „nein" die Vorgabe und nicht „ja", und deshalb
steht die Tabelle im Test.

### Wer den Speicher füllt: der Service Worker

In `core/fullDownloadRun.ts` steht **kein einziges `caches.open`** mit einem
Namen darin, und das ist die Entscheidung, die man sich merken sollte. Ein
`fetch` von der Seite läuft durch den Service Worker, und der legt die Antwort
genau dort ab, wo sie hingehört: Chunks mit Hash in die Hülle, Modelle und
Töne in die Medien — und beim Aufräumen wirft er wieder weg, was eine fremde
Build-Nummer trägt.

Die Seite **könnte** denselben Speicher selbst beschreiben; es ist derselbe
Ursprung, `caches.open('bgvr-media')` ginge. Der Grund, es nicht zu tun, ist
nicht Reinheit, sondern Haltbarkeit: Der Name des Speichers und die Regel, wer
wohin gehört, stünden dann an **zwei** Stellen, und die zweite ist die, die
beim nächsten Umbau vergessen wird. Ein Download, der 57 MB in einen Speicher
legt, den niemand mehr aufräumt, fällt erst drei Deploys später auf — wenn das
Telefon voll ist.

Daraus folgt eine Zeile, die sonst wie Unsinn aussieht: **Der Rumpf jeder
Antwort wird gelesen und weggeworfen.** Der Service Worker legt
`response.clone()` ab, und ein geklonter Rumpf, den auf der anderen Seite
niemand abholt, hält den ganzen Klon auf.

**Und warum nicht der Service Worker selbst lädt:** Weil er dafür am Leben
bleiben müsste. Ein Browser beendet ihn, sobald er nichts zu tun hat, und
„71 MB über Mobilfunk" ist eine Viertelstunde, in der er das mehrfach darf.
Die Seite dagegen steht ohnehin da, mit dem Balken darauf.

### Sechs gleichzeitig, und keine einzelne bringt den Rest zu Fall

`FULL_CONCURRENCY` ist **6** — genau so viele Verbindungen macht ein Browser
über HTTP/1.1 zu einem Server auf. Wer 4470 Anfragen auf einmal stellt, stellt
keine: Die Warteschlange wächst, jede einzelne dauert länger, und das Telefon
ist dabei zäh. `priority: 'low'` steht trotzdem an jeder Anfrage, obwohl der
Spieler sie selbst angefordert hat — er darf danebenher weiterspielen, und eine
Welt, die er gerade betritt, soll nicht hinter 4470 Fässern in der Schlange
stehen.

Bei 4741 Dateien über Mobilfunk geht garantiert eine daneben, und ein Lauf, der
daran stirbt, ist wertlos. Also: ein Netzfehler und ein `5xx` bekommen bis zu
zwei weitere Versuche mit wachsender Pause, ein `404` **keinen** — eine Datei,
die es nicht gibt, gibt es beim dritten Mal auch nicht, und drei Anläufe je
fehlender Datei wären aus einem fehlenden Paket ein zehnminütiges Warten. Was
am Ende fehlt, wird gezählt und gesagt, nicht verschwiegen.

### Fortsetzen heißt fortsetzen

Vor dem Lauf wird der Speicher **einmal am Stück** ausgelesen (`cachedUrls`),
und was darin steht, wird übersprungen. Das ist zugleich die ganze
Fortsetzung: Ein zweiter Druck rechnet denselben Plan und findet neun Zehntel
davon schon vor. Übersprungen wird dabei wirklich — der Service Worker
beantwortet Dateien ohne Build-Nummer mit _stale-while-revalidate_ und ginge
sonst für jede von ihnen noch einmal ins Netz.

Gefragt wird nicht Datei für Datei: `caches.match` je Eintrag wären nach einem
vollen Lauf 4800 einzelne Fragen an eine Datenbank. Und nachgezählt wird am
Ende ebenfalls am Speicher und nicht an der eigenen Buchführung — was der
Service Worker wirklich abgelegt hat, ist die einzige Zahl, die im Funkloch
zählt.

### Die Dauer: warum die erste Minute lügt

„Rest durch Mittelwert" wäre einfacher und wäre falsch, und zwar auf beide
Seiten: Die ersten Sekunden eines Laufs sind die schnellsten, die er je hat
(der HTTP-Cache hat noch etwas, die Verbindung ist frisch), und ein Lauf, der
zwischendurch in ein Funkloch gerät, rechnet den Einbruch für immer mit.
Beides zusammen ergibt eine Zahl, die springt — und eine springende Zahl ist
schlimmer als eine grobe, weil man ihr beim Springen zusieht, statt zu warten.

Drei Regeln halten sie ruhig:

- **Ein gleitendes Fenster** über die letzten acht Sekunden (`Throughput`).
  Vor drei Sekunden Strecke und sechs fertigen Dateien kommt gar keine Zahl
  heraus, sondern `null` — und dann steht dort _Dauer wird noch geschätzt_ und
  keine erfundene Minute.
- **Kleiner sofort, größer nur mit Anlauf** (`steadyEta`): nach oben wandert
  die Zahl erst, wenn sie um mehr als ein Viertel danebenliegt. Dann ist
  wirklich etwas passiert.
- **So grob, wie sie ehrlich ist** (`etaText`): bis zu einer Viertelminute
  „noch ein paar Sekunden", danach Zehnersekunden, ab anderthalb Minuten ganze
  Minuten, ab zehn Minuten Fünferschritte. Es steht dort „noch etwa 2 Minuten"
  und nie eine tickende Sekundenzahl.

### Was der Knopf in jedem Zustand sagt

Der **erste Druck lädt noch nichts.** Er holt die Liste, sieht im Speicher nach
und sagt dann, um wie viel es geht; erst der zweite lädt. Siebzig Megabyte sind
nichts, was auf einen unbedachten Klick hin losgehen sollte — und „wie viel ist
es denn?" ist genau die Frage, die man vorher stellt. Beim **Start** kostet das
nichts: Ungefragt wird keine Liste geholt und kein Speicher ausgelesen, denn
die Startseite hat auf ihre eigenen Bytes zu achten.

| Zustand | Knopf | Zeile darunter |
| ------- | ----- | -------------- |
| `unbekannt` | _Alles herunterladen_ | „… Ein Druck sagt, um wie viel es geht." |
| `prüft` | _Wird geprüft …_ (stumpf) | „Es wird nachgesehen, was schon da ist …" |
| `offen` | _Alles herunterladen (71,5 MB)_ bzw. _Rest herunterladen (…)_ | wie viel schon da ist — und eine Warnung, wenn die Leitung danach aussieht |
| `läuft` | _Lädt …_ (stumpf) | „12,4 MB von 71,5 MB · noch etwa 2 Minuten", Balken, **Anhalten** |
| `angehalten` | _Weiter herunterladen (…)_ | „Angehalten bei … Das Geholte bleibt." |
| `fertig` | _Nochmal prüfen_ | „Alles da — … im Gerät. Die Spielwiese läuft jetzt ohne Netz." |
| `lückenhaft` | _Fehlende holen (…)_ | „… · 3 Dateien kamen nicht an." |
| `kein-speicher` | stumpf | **warum** es nicht geht — kein Service Worker, oder kein Cache-API |
| `keine-liste` | _Alles herunterladen_ | „Die Liste der Dateien ist nicht erreichbar." |

**Fertig heißt fertig** und bietet nicht an, 71 MB ein zweites Mal zu holen:
Der Knopf wird zum Nachsehen, und das kostet eine 15-kB-Datei und einen Blick
in den Speicher.

**Und ein Knopf, der nicht kann, sagt warum.** Im Entwicklungsbetrieb läuft
kein Service Worker (`core/pwa.ts`); ein `fetch` landete dann im HTTP-Cache
statt im Speicher, und sichtbar wäre davon nichts außer einem Balken, der
durchläuft und nichts bewirkt. Genau dieser Fall steht ausgeschrieben da.

### Die Rücksichten — und welche hier nicht gelten

Vom Vorwärmen bleibt fast nichts übrig, denn **hier hat jemand gefragt**:

- `saveData` und eine schmale Leitung werden **gesagt und nicht befolgt**
  (`fullWarning`): „Achtung: ‚Daten sparen' ist eingeschaltet." Es ist seine
  Entscheidung; er soll sie nur bewusst treffen.
- **Die Lobby** spielt keine Rolle: Ein Download lädt keine Welt und nimmt
  keinen Raum ein.
- **Kein Speicher** ist keine Höflichkeit, sondern Physik.
- **Im Hintergrund fängt nichts an** — ein laufender wird aber auch **nicht**
  angehalten, wenn der Reiter wegschaltet. Siebzig Megabyte anzufangen und
  dann beim Blick aufs Telefon abzubrechen wäre das Gegenteil dessen, wofür
  der Knopf da ist.

**Und das Vorwärmen tritt zurück, solange geladen wird.** `warmSignals` meldet
`busy`, solange der große Download läuft — anders als bei `playerAsked` geht
das hinterher wieder auf `false`, und dann ist das Vorwärmen wieder dran, falls
es überhaupt noch etwas zu wärmen gibt. Nach einem vollen Lauf gibt es das
nicht: Die Welt liegt dann samt Physik-Engine im Speicher.

### Die Zahlen, gemessen

Chromium über einem Server, der sich wie GitHub Pages verhält, mit einem Proxy
davor, der die Leitung bremst. **Der Container ist dabei kein Telefon**, und
zwar auf eine Art, die man wissen muss: Er malt in Software, und eine Welt, die
hinter der Startseite gerendert wird, frisst ihm die CPU weg. Gemessen wurde
deshalb hinter `#haunting` — dort wird nichts vorgewärmt, es steht keine Welt
im Hintergrund, und man sieht den Download statt des Renderers.

| Was | Gemessen |
| --- | -------- |
| Erster Druck (Liste holen, Index holen, Speicher lesen, Plan rechnen) | **297 ms** — mit einer Welt im Hintergrund dagegen 23 s, und das ist der Renderer und nicht der Plan |
| Angekündigt | 71,5 MB in 4741 Dateien, davon 1,6 MB schon da (die Hülle aus dem Einrichten) |
| Gedrosselt auf 600 kB/s | 20,8 MB in 31 s; über die Leitung **18,9 MB** — die Skripte gehen gezippt, die Modelle nicht |
| Anhalten | sofort; vier Sekunden später **derselbe** Speicherstand (359 Einträge) |
| Fortsetzen (neue Sitzung, neuer Browserstart) | findet 22,6 MB vor, nachgesehen in **203 ms**, holt die restlichen 49,0 MB |
| Ungedrosselt | 49,0 MB in **40 s**, **4375 Anfragen** — eine je Datei, keine doppelt |
| Angekündigt gegen wirklich geholt | 49,0 MiB angekündigt, **51 337 004 B** über die Leitung: dieselbe Zahl |
| Speicher danach | **4743 Einträge** (36 Hülle, 4707 Medien) = 4741 Plandateien + `offline.json` + die Startseite |
| _Nochmal prüfen_ | 8 s, **0 Bytes** über die Leitung — Liste und Index liegen selbst im Speicher |
| Ohne Netz danach | Startseite in **265 ms**, Welt steht, Regal geht auf, Modelle **und Texturen** kommen aus dem Speicher (`dungeon_texture.webp`, 22 764 B, ohne Netz mit `200` beantwortet) |

**Und wie sich die Restzeit benommen hat** (gedrosselt auf 600 kB/s, 67 MB
offen — die ehrliche Antwort wäre „etwa 110 Sekunden"):

```
  1–4 s   Dauer wird noch geschätzt
  5–7 s   noch etwa 2 Minuten
  8–10 s  noch etwa 80 / 70 Sekunden
 11–31 s  pendelt zwischen „70 Sekunden" und „2 Minuten"
```

Die ersten vier Sekunden sagt sie nichts, und das ist richtig so. Danach steht
sie auf anderthalb Minuten und pendelt um eine Stufe — der Grund dafür ist
nicht Zufall, sondern **der Inhalt**: Das Programm geht gezippt über die
Leitung (5,4 MB werden 2), die Modelle nicht. Genau beim Übergang von
`programm` zu `medien` fällt der Durchsatz in Plan-Bytes, und die Schätzung
wird länger. Sie darf das (`steadyEta` lässt sie nach oben, wenn sie um mehr
als ein Viertel danebenliegt) — und sie tut es einmal und nicht im Sekundentakt.

**Ein Ausfall mitten im Lauf** war dabei nicht geplant und ist trotzdem
gemessen worden: Der Bremsproxy stürzte beim Umschalten ab, und ab da kam
nichts mehr an. Der Download **lief weiter**, wie er soll — jede Datei zwei
weitere Versuche, dann aufgegeben, keine Ausnahme, kein Abbruch —, und der
Balken stand still, während die Restzeit ihre letzte Zahl behielt. Genau das
war der Anlass, die Fehlschläge **schon im Lauf** in die Zeile zu schreiben
(„… · 12 Dateien kamen nicht an") und nicht erst am Ende: Ein Balken, der
steht, während daneben eine Restzeit steht, ist sonst nicht zu deuten.
