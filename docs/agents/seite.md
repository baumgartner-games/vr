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
für den Rest) und **im Spiel** unter _Menü → Steuerung & Hilfe → Eingaben_ (siehe unten). Der Weg
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

## Das Menü: acht Bereiche und eine Tabelle

Gemeldet war: „Die Menüführung ist verbesserungswürdig — wie die Menüs
aufgebaut und gruppiert sind." Bis dahin hing **jeder** Eintrag an der Wurzel:
sieben aus der App (Welten, Ansicht, Verbindung, Bewegung, Eingaben, Aussehen,
Grafik), dahinter alles, was die Welt mitbrachte — in der Testwelt vierzehn
weitere, von _Werkzeuge_ über _NPC_ und _Weltänderungen_ bis _Zeiten löschen_.
Gut zwanzig Zeilen gleichen Gewichts, und die Hitboxen der Physik standen im
Grafik-Menü zwischen _Schatten_ und _Vollbild_.

Jetzt hat die Wurzel **wenige Hauptbereiche**, am Schirm (`ui/PageMenu.ts`)
und am Handgelenk (`ui/WristMenu.ts`) dieselben, weil beide denselben Baum
lesen:

| Bereich | Was darin steht (Id) |
| ------- | -------------------- |
| _Weiterspielen_ | steht über allem — das Häufigste, was man mit einem offenen Menü tut |
| **Spielen** | die Welten (`world:*`, Spiele zuerst, `WIP`/`TEST` hinten) und _Ansicht_ (`view`) |
| **_Name der Welt_** (`welt`) | was diese Welt anbietet — in der Testwelt _Zu einer Zone_, _Karts in die Box_, _Zeiten löschen_, in Haunting Runde, Plätze, Ton; _Zurücksetzen_ ganz unten (`tail`). Name, Zeile, Farbe und Schildchen kommen von der Welt (`GroupOptions.overrides`) |
| **Bauen & Gestalten** | _Spielmodus_ (aus `settings` herausgezogen), _Werkzeuge_, _Magischer Beutel_, _KayKit-Regal_, _NPC_, _Welt sichern_ |
| **Zusammen** | die Verbindung (`net`): Raum, Name, Chat, Stimme, Zuschauen |
| **Figur** | das Aussehen (`look`) |
| **Einstellungen** | _Bewegung_, _Grafik_, _Hände & Greifen_ (so heißt `settings` hier) |
| **Steuerung & Hilfe** | _Eingaben_ (`input`), und am Schirm zwei Verweise in einen neuen Tab: Eingabeseite und Werkzeugseite (`help:*`) |
| **Werkstatt** `TEST` | alles zum Prüfen und Messen — Bildrate, Position, Gitterlinien, belegte Felder, Hitboxen, Ghosting, Griffe, Trefferzonen und Navigation der NPCs, Welt-Physik, Weltänderungen, Konfig-Code, Werkzeug-Posen |

**Die Ordnung steht an einer Stelle** — `MENU_PLACEMENT` in
`ui/menuGroups.ts`, mit Test. Wer baut, baut weiter flach: `App.refreshMenu`
legt Welten, App-Menüs und `World.menu()` in **eine** Liste, und
`groupMenu` macht daraus die Wurzel. Eine Zeile der Tabelle ist eine Id und
ein Bereich; sie greift auf zwei Ebenen:

- **Ein Eintrag der Wurzel** (`tools`, `net`, `gfx`) kommt samt Untermenü in
  seinen Bereich.
- **Eine Zeile eines Untermenüs** (`gfx:hitboxes`, `setting:config`) wird aus
  ihrem Menü herausgenommen und in den Bereich gestellt — so bleibt der Code,
  der eine Einstellung kennt, bei ihr (`App.graphicsMenu` baut die Hitboxen
  weiter), und nur die Tabelle sagt, dass sie in die Werkstatt gehört. Das
  Objekt bleibt dabei dasselbe: Die Bildraten-Zeile, die die App zweimal die
  Sekunde umschreibt, kommt in der Werkstatt an.

**Einen neuen Menüpunkt einordnen:** eine Id geben und sie in
`MENU_PLACEMENT` an die Stelle schreiben, an der er im Bereich stehen soll
(die Reihenfolge der Tabelle ist die Reihenfolge im Bereich). Was dort nicht
steht, geht nicht verloren: An der Wurzel landet es im Bereich der Welt
(`DEFAULT_GROUP`, vor _Zurücksetzen_), in einem Untermenü bleibt es, wo es
ist. `tail: true` stellt eine Zeile hinter alles, auch hinter das Unbekannte. Eine neue
Welt braucht gar nichts — `world:*` fängt sie; ist sie ein Prüfstand, bekommt
ihre Definition `test: true` (Schildchen `TEST`, hinter die Spiele), eine
Baustelle `experimental: true` (`WIP`).

Drei Regeln halten den Baum ehrlich (`groupMenu`):

- **Leere Bereiche gibt es nicht.** Haunting bringt keine Werkzeuge mit, also
  steht dort kein _Bauen & Gestalten_.
- **Ein Bereich mit nur einem Untermenü _ist_ dieses Untermenü.** _Zusammen_
  öffnet direkt die Verbindung, _Figur_ direkt das Aussehen — eine Seite mit
  einer einzigen Zeile, die zur eigentlichen Seite führt, wäre ein Klick, der
  nichts erklärt. Die Zeile trägt dann die Id des Eintrags (`net`, `look`),
  der Weg dorthin bleibt also derselbe, falls einmal etwas dazukommt.
- **Die Bereichs-Ids** (`spielen`, `bauen`, …) sind Seiten im Weg
  (`menuNav.ts`) und dürfen mit keiner Eintrags-Id zusammenfallen; der Test
  prüft es.

### Wo man ist, und wie man zurückkommt

- **Brotkrumen.** Über dem Titel steht klein der Weg bis hierher — am Schirm
  „Menü › Einstellungen" als Knöpfe, jeder ein Sprung dorthin
  (`PageMenu.paintCrumbs`); am Handgelenk an der Stelle, an der sonst
  _BAUMGARTNER VR_ steht, von vorn gekürzt, wenn er zu lang wird
  (`PageOptions.crumb`, `UIPanel`).
- **`Esc` geht eine Ebene zurück** und macht erst ganz oben zu
  (`PageMenu.back`); steht ein Suchbegriff im Regal, wird zuerst der gelöscht.
  Vorher schloss `Esc` das ganze Menü, egal wie tief man stand.
- **Die Fußzeile am Handgelenk sagt, wie man zurückkommt.** Auf einer
  langen Seite unter einer anderen steht dort „Stick oder wischen blättert ·
  B/Y zurück", sonst „Andere Hand: zielen + Trigger/A · B/Y zurück". Eine
  Meldung (`notify`) nimmt den Platz nur noch **zehn Sekunden** ein
  (`UIPanel.STATUS_MS`) — vorher blieb sie stehen, bis die nächste kam, und
  weil jede Welt beim Betreten eine schickt, war der Hinweis praktisch nie zu
  sehen. Geprüft als 3D-Panel in der Ego-Ansicht (0,3 m breit, 0,45 m vor dem
  Auge): Wurzel, _Einstellungen → Grafik_, _Werkstatt_ (lang, blättert),
  _Steuerung & Hilfe → Eingaben_, _Bauen & Gestalten → Magischer Beutel_
  (Raster) — nichts abgeschnitten außer langen Unterzeilen, die mit „…"
  enden, wie gewollt. In der Brille fehlen unter _Einstellungen → Grafik_
  jetzt _Bildschirm-Steuerung_ und _Vollbild_ — beide tun dort nichts
  (`App.graphicsMenu`, wie die Links in einen neuen Tab).
- **`WristMenus.back()`** ist dieselbe Treppe für jede Taste, die „zurück"
  heißen soll (`B` am Pad, in der Brille), egal welches Gesicht des Menüs
  gerade oben ist; `false` heißt, es war gar nichts offen. Die Belegung
  selbst gehört `core/inputMap.ts` — hier steht nur, was gerufen wird.
- **`openSubmenu(id)` findet die Seite unter ihrem Bereich**
  (`findMenuPath`, höchstens drei Ebenen tief): Welten rufen weiter
  `openSubmenu('bag')`, die App `openSubmenu('look')`, ohne zu wissen, dass
  darüber jetzt _Bauen & Gestalten_ bzw. _Figur_ steht.
- **Das Menü bleibt, wo man war** (`menuNav.ts`) — über Schließen und
  Wiederöffnen, an beiden Handgelenken und am Schirm. Über das **Neuladen**
  hinaus merkt es sich nur den Katalog (`menuRecall.ts`); der gilt jetzt
  auch eine Ebene tiefer: Wer _Bauen & Gestalten → KayKit-Regal_ öffnet,
  steht wieder im Ordner von vorhin.

### Alte Wege, neue Wege

In älteren Kapiteln steht oft noch der alte Weg; so heißt er jetzt:

| Früher | Jetzt |
| ------ | ----- |
| Menü → Welten | Menü → Spielen |
| Menü → Ansicht | Menü → Spielen → Ansicht |
| Menü → Zu einer Zone, Karts, Zeiten, Zurücksetzen, die Einträge von Haunting | Menü → _Name der Welt_ |
| Menü → Verbindung | Menü → Zusammen |
| Menü → Aussehen | Menü → Figur |
| Menü → Bewegung / Grafik | Menü → Einstellungen → Bewegung / Grafik |
| Menü → Einstellungen (der Welt) | Menü → Einstellungen → Hände & Greifen; _Spielmodus_ unter Bauen & Gestalten |
| Menü → Eingaben | Menü → Steuerung & Hilfe → Eingaben |
| Menü → Werkzeuge / Beutel / KayKit-Regal / NPC | Menü → Bauen & Gestalten → … |
| Menü → Grafik → Hitboxen, Bildrate, Position, Gitter, Griffe, Ghosting | Menü → Werkstatt |
| Menü → NPC → Trefferzonen, Navigation | Menü → Werkstatt |
| Menü → Einstellungen → Welt-Physik, Konfig-Code, Posen; Menü → Weltänderungen | Menü → Werkstatt |

## Menü → Eingaben

Heute unter _Steuerung & Hilfe_ (siehe oben).
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

Dazu ganz oben die **Tastenhilfe** (an/aus) — die Zeile unten im Bild, die
sagt, welcher Knopf gerade was tut (`ui/ControlHints.ts`, siehe
[Steuerung](./steuerung.md#die-tastenhilfe--uicontrolhintsts)) — und gleich
darunter **Willkommen je Welt** (an/aus, siehe _Die Willkommens-Karte_ oben). Seit dem
einheitlichen Schema stehen am Pad auch _Zurück_ (`B`), _Menü_ (☰),
_Ansicht_ (⊟) und _Zielen_ (LT) in der Belegung, an der Tastatur _Menü_ (`M`)
und _Ansicht_ (`V`). Und das ganze Menü ist mit dem Pad bedienbar
(`ui/padNav.ts`) — Zeile wählen mit dem Steuerkreuz, `A` drücken, dann den
Knopf drücken, den sie tun soll.

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
noch einmal als Zeile unter _Menü → Einstellungen → Grafik_** (`App.fullscreenRow`): Auf einem
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

## Die Ränder des Geräts: der sichere Bereich

Ein Telefon hat keine rechteckige Anzeige mehr. Oben sitzt die Uhr in einer
Kerbe, unten liegt der Strich zum Wegschieben, und im Querformat rutscht
beides an die Seite. Die Seite nimmt trotzdem den **ganzen** Schirm
(`viewport-fit=cover` in `index.html`) — anders wäre ein Spiel mit Rändern
kein Spiel —, und deshalb muss sie selbst wissen, wo sie nichts hinschreiben
darf.

Gemeldet wurde es an einem Bild: Über der Überschrift des Katalogs stand
`20:36`, halb im Titel, und im Schließen-Knopf die Batterie. „Wir müssen noch
darauf achten, dass wir für Menüs diese noch wrappen in Safe-Area-Views."

`ui/safeArea.ts` ist genau das, nur ohne Rahmenwerk:

- Die vier Zahlen des Browsers stehen **einmal** als CSS-Variablen
  (`--safe-top` und die drei anderen, `ui/safeArea.css`) statt in jeder Datei
  noch einmal.
- Ein Kasten bekommt sie als **Polster** und nicht als Abstand. Der
  Hintergrund eines Blattes soll bis unter die Uhr reichen; ein Abstand ließe
  dort einen helleren Streifen stehen, und der sähe nach einem Fehler aus,
  weil es einer wäre. Freigehalten wird der **Inhalt**, nicht die Fläche.
- **Ränder werden einzeln bestellt** (`keepSafe(sheet, 'bottom', 'left',
  'right')`). Ein Blatt, das von unten aufzieht, berührt den oberen Rand gar
  nicht — 47 Punkte Polster in seinem Kopf wären dort nur ein Loch. Der obere
  kommt dazu, sobald eine Seite wirklich bis dorthin reicht
  (`setSafeEdge(sheet, 'top', page.full)`, also im Katalog).
- Am Schreibtisch steht das Blatt als **Kasten im Bild**, und die Ränder hält
  schon sein Hintergrund frei (`.pmenu`, `.wrobe`). Dort fällt das Polster
  des Blattes weg: Auf einem Tablet im Querformat läge sonst der doppelte
  Rand in einem Kasten von 380 Punkten.

Benutzt wird es von den beiden Blättern, die es gibt — dem Menü als Seite
(`ui/PageMenu.ts`) und der Umkleide (`ui/WardrobeMenu.ts`). Alles andere auf
der Startseite und im HUD rechnet schon länger mit `max(…, env(…))`; die
Variablen stehen jetzt daneben und lassen sich dort nachziehen, wenn jemand
ohnehin in der Datei ist.

### Die Welt geht bis an die Kante — `100%` ist nicht der ganze Schirm

Gemeldet wurde es wieder an einem Bild, diesmal vom Telefon im Hochformat:
„Die Safe Area scheint unten zu viel abzuschneiden im Hochkant-Modus. Die
UI-Elemente passen, aber den Rand unten könnte man noch für die Welt-Render
nutzen." Die Welt hörte ein gutes Stück über der Unterkante auf, darunter lag
ein schwarzer Streifen — ungefähr der Strich zum Wegschieben, und noch etwas
mehr. Die Stöcke und die Knöpfe saßen richtig.

Der Streifen war **kein Rand**, sondern der Hintergrund der Seite unter einer
Leinwand, die kürzer ist als das Fenster. `#scene` hing an `height: 100%`, und
`100%` rechnet gegen den Kasten, den der Browser der Seite zuteilt. Auf einem
iPhone, das als App vom Startbildschirm läuft, ist dieser Kasten mit
`viewport-fit=cover` **nicht** der ganze Schirm: Kerbe und Strich fehlen darin,
`window.innerHeight` meldet sie aber mit. Die Leinwand steht oben an der Kante,
also fehlt unten die Summe aus beidem — und genau deshalb war der Streifen
höher als der Strich allein. Dass niemand die Ränder abgezogen hatte, machte
die Sache dabei nicht besser: Abgezogen hat sie der Browser.

Also steht die Größe des Fensters jetzt dort, wo die vier Ränder schon stehen —
als zwei weitere Variablen in `ui/safeArea.css`, gefüllt von `trackViewport`
aus `ui/safeArea.ts`:

- `--app-width` und `--app-height` sind `window.innerWidth`/`innerHeight` in
  Pixeln, am `<html>` gesetzt und bei `resize`, `orientationchange` und am
  `visualViewport` nachgezogen. `main.ts` misst einmal, bevor irgendetwas
  anderes passiert.
- **Es sind dieselben beiden Zahlen, aus denen `core/App.ts` den Bildpuffer
  baut** (`renderer.setSize(window.innerWidth, window.innerHeight, false)`).
  Kasten und Puffer können damit gar nicht mehr auseinanderlaufen — weder
  abgeschnitten noch verzerrt.
- Die Vorgabe in `:root` ist `100%`, also das alte Verhalten, und jede Stelle
  schreibt den Ersatz noch einmal dazu (`var(--app-height, 100%)`): Zwischen
  dem ersten Stil und der ersten Zeile Skript liegt ein Augenblick, und eine
  Leinwand von null Pixeln wäre ein schlechterer Fehler als der, der hier
  behoben wird.

**Was sich nicht ändert, ist die Steuerung.** Freigehalten wird weiter der
_Inhalt_ und nicht die Fläche: Stöcke, Knöpfe, Werkzeugknopf und Blätter
rechnen unverändert mit `max(…, env(…))` beziehungsweise den vier
`--safe-*`-Variablen. Die Welt reicht ab jetzt bis unter den Strich, die Finger
bleiben davor — das ist die Aufteilung, die auf einem Telefon ohnehin die
einzig richtige ist.

Geprüft wird es in `tools/browser-smoke.mjs`, gleich nach dem ersten Bild der
Ansicht von oben: Die Leinwand muss das Fenster genau decken, und der
Bildpuffer muss sein Seitenverhältnis haben. Die Rechnung dahinter hängt an
keinem Browser und steht in `ui/safeArea.test.ts`.

## Die Startseite: eine Welt wählen, einmal drücken

Gewünscht war „ein aufgeräumter, einladender Startbildschirm mit klarer
Hauptaktion, Weltauswahl mit Bildern, sekundäre Aktionen dezent". Von oben
nach unten steht jetzt da (`index.html`, `style.css` am Ende):

1. **Titel und eine Zeile** — was das hier ist, ohne „WebXR-Basis für
   Experimente".
2. **Welt wählen** — eine Karte je Welt, mit Bild, Name und einer Zeile
   (`ui/landingWorlds.ts`, mit Test). Die Reihenfolge ist die des Menüs:
   Spiele zuerst, dann Baustellen (`WIP`), dann Prüfstände (`TEST`);
   Haunting trägt `LOBBY`. Am Schreibtisch vier nebeneinander, am Telefon
   zwei — die Karten sind ohne Scrollen zu sehen.
3. **Ansicht am Bildschirm** (oder mit Brille: die Haltung) — dieselbe Frage
   wie bisher, nur eine Reihe kleiner.
4. **Der eine Knopf**, `#enter`: groß _Spielen_ (mit Brille _In VR spielen_),
   klein darunter, wohin — „Testwelt · Aus den Augen" (`paintEnterLabel`).
   Während des Downloads steht oben „Lädt … 17 %" und die Zeile darunter
   schweigt. Die Lobby einer Runde (`#haunt-enter`) bleibt bei _Beitreten_:
   dort tritt man einer Runde bei.
5. Ladebalken, Download, Brillen-Status — unverändert.
6. **Nebenwege, dezent:** _Zusammen spielen_ zugeklappt, darunter zwei stille
   Verweise (_Controller prüfen_, _Werkzeuge & Beutel_), die Version ganz
   unten. Beide Verweise stehen auch im Menü unter _Steuerung & Hilfe_.

**Eine Karte wählt — und lädt.** `pickWorld` (`main.ts`) schreibt die Welt
in die Adresse (`replaceState`, ein Neuladen landet wieder dort), markiert
die Karte, schreibt den Knopf um, hält das Vorwärmen der Standardwelt an und
fordert die neue sofort an (`ensureWorld`): Wer eine Karte tippt, will
gleich hinein, und die Sekunden bis zum Druck sind die, die das Laden
braucht. Der Knopf wird dabei stumpf, bis die Welt steht — dieselbe Regel wie
beim Start. Damit eine ältere Ladung nichts mehr meldet, merkt sich
`loadWorld`, für welche Welt sie lief. Wählt jemand im **Menü** der
Startseite eine andere Welt, ziehen Karte und Knopf nach
(`onWorldChanged`).

**Die Lobby-Karte wählt nicht**: Haunting braucht erst Name und Raum-Code,
und welche Startseite gilt, entscheidet `main.ts` beim Laden
(`hauntLanding`). Die Karte setzt also `#haunting` und lädt einmal neu; von
dort führt _← Andere Welt wählen_ zurück.

**Die Bilder** liegen in `public/worlds/` (WebP, 480 × 270, zusammen rund
35 kB, `loading="lazy"`) und stehen in der Definition der Welt
(`WorldDefinition.preview`). Es sind Aufnahmen der Welten selbst — Hub und
Bauplatz aus den Augen, die Testwelt (Küche) von oben —, Haunting ist der
gebaute Grundriss vor einem Sternenfeld, gerechnet von
`tools/station-outline.mjs` (zusammen mit der Vorlage am Boden, siehe
[Haunting](haunting.md)). **Eine neue Welt ohne Bild** bekommt eine Fläche in ihrer
Akzentfarbe; wer ein Bild will, nimmt die Welt im Browser auf (Hände und
Handgelenk-Knopf ausblenden: `bgvr.handVisuals.hidden = true`,
`bgvr.wristMenu.visible = false`), verkleinert auf 480 × 270 und trägt den
Pfad als `preview` ein.

## Vom ersten Öffnen bis ins Spiel: der Weg eines neuen Spielers

Gewünscht war, das **Gesamterlebnis und den Ablauf** zu verbessern. Dafür
wurde der Weg einmal ganz durchgespielt, am Schreibtisch (1280 × 800) und am
Telefon hochkant (390 × 844): Startseite → Welt wählen → Laden → die ersten
Sekunden → Menü → andere Welt. Gefunden wurde:

| Stelle | Reibung | Was jetzt passiert |
| ------ | ------- | ------------------ |
| Weltwechsel im Menü | Harter Schnitt: Die alte Welt stand still, bis die neue fertig war; „Lade …" stand nur am Handgelenk-Menü, am Schirm also **nirgends**. Auf einer langsamen Leitung sah das aus wie abgestürzt. | **Ladebildschirm** mit Bild, Name, Zeile der Zielwelt und einem Balken (unten) |
| Erste Sekunden | Der Satz, den jede Welt zur Begrüßung sagt (`welcome()` → `ctx.notify`), landete ebenfalls nur am Handgelenk. Am Schirm stand man in der Welt und wusste nicht, was sie will. | **Willkommens-Karte**, einmal je Welt (unten) |
| Hub | Alle vier Tore standen hintereinander in **einem** Gang; aus der Halle sah man zwei Ringe und zwei Kanten, die anderen drei Richtungen waren leere Wände. | Der Hub ist eine **Lobby**: ein Tor je Richtung, Bogen, Schild, Lampen, Bänke ([Was drin ist](./inhalt.md), _Hub-Welt_) |
| Leisten und Schilder | Vier Stile nebeneinander: die Tastenhilfe halbdurchsichtig mit 14 px Radius, die Baukasten-Leiste in Petrol mit 10 px, die Burgerladen-Zeile mit Inline-Stil, das Haunting-Schild in Türkis. | Ein Satz **`--hud-*`**-Variablen (unten) |

Offen geblieben (für eine zweite Runde): Im **Burgerladen** steht man beim
Ankommen direkt vor der großen Erklärtafel, die das halbe Bild füllt; am
Telefon **von oben** liegt die Tastenhilfe über der Burgerladen-Karte unten.
Beides gehört der Welt und ist hier nicht angefasst.

### Der Ladebildschirm beim Weltwechsel (`ui/WorldLoader.ts`)

Sobald `App.goTo` eine neue Welt anfordert, blendet der Schirm in 180 ms auf
einen Ladebildschirm über: das Vorschaubild der Zielwelt
(`WorldDefinition.preview`, dieselben Bilder wie die Karten der Startseite,
dazu unscharf als Hintergrund), darunter „Nächste Welt", Name und Zeile,
ein Balken in der Akzentfarbe und eine Zeile, die sagt, was gerade passiert.

**Der Balken** (`core/loadProgress.ts`, mit Test) kennt drei Abschnitte, und
nur der letzte ist zählbar:

| Abschnitt | Was | Band |
| --------- | --- | ---- |
| `modul` | der Chunk der Welt (`definition.load`) | 4–45 % |
| `aufbau` | `World.init` baut | 45–60 % |
| `modelle` | was die Welt danach nachlädt — gezählt vom Lade-Manager von three.js (`AssetGate.loaded` / `total`, „Modelle und Töne · 14 von 40") | 60–98 % |

In den unzählbaren Abschnitten **kriecht** der Balken auf das Ende seines
Bands zu, ohne es zu erreichen (`creep`); er läuft nie rückwärts, auch wenn
der Lade-Manager mitten in der Welle neu zu zählen anfängt. Fertig ist er,
wenn es 400 ms still geblieben ist — höchstens nach `LOADER_CAP_MS` (8 s),
dann geht er trotzdem. Er steht **mindestens** `LOADER_MIN_MS` (0,7 s):
Eine Welt aus dem Speicher ist in 150 ms da, und ein Bildschirm, der nur
aufblitzt, ist unruhiger als keiner.

**Nur am Schirm und nur im Spiel.** In der Brille gibt es kein DOM im Bild
(geht die Brille während des Ladens auf, verschwindet er sofort) — dort blendet
es stattdessen ab, mit einer Tafel im Raum (unten, _In der Brille_), und auf der
Startseite sagt der Knopf selbst, wie weit es ist („Lädt … 17 %"). Scheitert
die Ladung, geht er ebenfalls sofort; die Meldung kommt wie bisher.

### Die Willkommens-Karte (`ui/WorldWelcome.ts`)

Beim **ersten** Betreten einer Welt kommt oben in der Mitte eine kurze
Karte: „Willkommen" und der Name, eine Zeile, was man hier tut, der erste
Schritt — im Burgerladen „Die Glocke an der Durchreiche startet den Tag" —
und die zwei, drei Knöpfe, die man dafür braucht. Die Texte stehen je Welt in
`core/worldIntro.ts` (`WORLD_INTROS`, mit Test: jede Welt der Registry hat
eine); eine neue Welt ohne Eintrag bleibt still und ist nicht kaputt.

- **Die Knöpfe passen zur Tastenhilfe**: dieselbe Belegung, dasselbe Gerät,
  dieselbe Marke (`introKeys`, wie `core/controlHints.ts`) — wer _Benutzen_
  auf `F` gelegt hat, liest `F`; am Pad `Ⓐ`/`✕`, am Glas „Stock links", `A`
  und ☰. Gezeichnet als dieselben Chips wie die Tastenhilfe.
- **Wann**: gefragt wird jedes Bild (`App.updateWelcome`), und sie kommt erst,
  wenn man die Welt **sieht** — nicht hinter der Startseite, nicht unter dem
  Ladebildschirm, nicht hinter einem Menü, nicht in der Brille (dort steht
  stattdessen eine Tafel im Raum, unten). Die erste Welt
  lädt ja, während die Startseite noch davorsteht.
- **Wie lange**: neun Sekunden, oder bis _Verstanden_. Geht ein Menü auf oder
  wechselt die Welt, geht sie mit.
- **Einmal je Welt**, gemerkt im Browser (`bgvr.welcomed`, eine Liste der
  Ids). **Abschaltbar** unter _Menü → Steuerung & Hilfe → Eingaben →
  Willkommen je Welt_ (`bgvr.welcome`); wer sie wieder einschaltet, bekommt
  alle Welten noch einmal begrüßt.

### In der Brille: Abblenden, Tafel, Beschriftung (`ui/XRGuide.ts`)

Am Schirm gab es Ladebildschirm, Willkommens-Karte und Tastenhilfe — in der
Brille nichts davon: Ein Weltwechsel war ein harter Schnitt, der Gruß der Welt
stand nur als Zeile am Handgelenk, und welcher Knopf was tut, sagte niemand.
Jetzt gibt es dort dasselbe, mit denselben Texten, Zahlen und Einstellungen,
nur **im Raum statt als DOM**. Was wann steht, rechnet `core/xrGuide.ts` (mit
Test); gezeichnet wird in `ui/XRGuide.ts` (Leinwand-Malerei in
`ui/xrCard.ts`, dieselben Farben wie `--hud-*`).

- **Abblenden beim Weltwechsel.** `App.goTo` blendet in der Brille in
  `XR_FADE_IN` (0,25 s) auf eine dunkle Farbe der Zielwelt ab (12 % der
  Akzentfarbe auf Schwarz, `fadeColor` — „Augen zu", keine bunte Wand),
  **tauscht die Welt erst, wenn es dunkel ist** (`XRGuide.whenDark`, höchstens
  0,8 s — eine Welt aus dem Speicher ist schneller da als die Blende zu), hält
  mindestens `LOADER_MIN_MS` wie am Schirm und wartet auf die Modelle
  (`assets.settle`, Deckel `LOADER_CAP_MS`), dann in `XR_FADE_OUT` (0,45 s)
  wieder auf. Die Blende ist eine Kugel an der Kamera (Innenseite, ohne
  Tiefenprüfung) — gleich dunkel in jede Richtung, also egal, ob der Kopf in
  einem ausgelassenen Bild schon weiter ist.
- **Die Ladetafel** steht über der Blende 1,5 m vor dem Spieler: das
  Vorschaubild der Zielwelt (`WorldDefinition.preview`), „Nächste Welt", Name,
  Zeile, der Balken in der Akzentfarbe und die Zeile aus `loadLine` („Modelle
  und Töne · 14 von 40"). Der Balken ist Geometrie und kriecht wie am Schirm
  (`creep`); neu gemalt wird die Leinwand nur, wenn sich die Zeile ändert.
- **Die Tafeln hängen am Rig, nicht am Kopf.** Sie stehen da, wo man beim
  Aufgehen hinsah, und rücken erst nach, wenn man sich mehr als 40° wegdreht —
  dann weich, bis sie wieder fast geradeaus stehen (`followYaw`, mit Abstand
  zwischen Anfangen und Aufhören, damit sie am Rand nicht zittern). Eine Tafel
  am Kopf ruckelte mit jedem ausgelassenen Bild mit, und beim Laden fallen
  Bilder aus.
- **Die Willkommens-Tafel**: dieselben Texte aus `core/worldIntro.ts`, 1,45 m
  vor dem Spieler, etwas unter Augenhöhe und zu ihm geneigt; die Knöpfe heißen
  wie in der Hand (`xrIntroKeys`): „Stock L Gehen · A Nehmen & Benutzen · Griff
  Greifen · ☰ Menü". _Werkzeug_ ist der Griff (man nimmt es aus dem Regal),
  _Ansicht_ fällt weg. Sie kommt nur, wenn man die Welt **sieht** — nicht unter
  der Blende, nicht hinter dem Handgelenkmenü (`xrWorldVisible`) —, steht
  zwölf Sekunden (`XR_WELCOME_SECONDS`) oder bis **Trigger (oder `A`) auf die
  Tafel** (_Verstanden_), und geht mit, wenn die Welt wechselt oder das Menü
  aufgeht. **Eine Liste für Schirm und Brille** (`welcomedWorlds`/
  `markWelcomed` in `ui/WorldWelcome.ts`, `bgvr.welcomed`): Wer eine Welt am
  Schirm begrüßt bekam, wird in der Brille nicht noch einmal begrüßt.
  Abschaltbar mit derselben Zeile _Willkommen je Welt_.
- **Die Beschriftung am Controller** — siehe
  [Steuerung](./steuerung.md#die-tastenhilfe--uicontrolhintsts): zwei, drei
  Knöpfe der Zone am rechten Controller, abschaltbar mit _Tastenhilfe_.

**Prüfen ohne Brille**: `bgvr.xrPreview = true` in der Konsole stellt alles
davon in die Ansicht aus den Augen (und lässt die Schirm-Gegenstücke schweigen,
wie mit Brille); `bgvr.xrGuide.previewHand` nimmt ein Objekt vor der Kamera
als rechte Hand für die Beschriftung. So sind die Bilder der Bild-Schleife
entstanden (Weltwechsel Hub → Burgerladen: Tafel, Blende, Ankunft).

### Ein Stil für Leisten und Schilder (`--hud-*`)

Tastenhilfe, Baukasten-Leiste, Burgerladen-Zeile und -Karte, das
Haunting-Schild (`.orbital-player`), Ladebildschirm und Willkommens-Karte
lesen dieselben Variablen aus `:root` in `style.css`: `--hud-bg` (und
`--hud-bg-soft` für die Tastenhilfe), `--hud-line`, `--hud-ink`/`--hud-dim`,
`--hud-raise`/`--hud-raise-hi` für Knöpfe, `--hud-on` für „gewählt",
`--hud-good`/`--hud-bad` für die Ampel, `--hud-radius` (14 px),
`--hud-radius-sm` (8 px) und `--hud-radius-pill`, `--hud-font`,
`--hud-shadow`, `--hud-blur`. Abgestimmt sind sie auf die Kopfzeile oben
rechts (`.hud__row`), die schon vorher so aussah. Die **Akzentfarbe** bleibt
die der Welt — als Rand (Burgerladen Orange, Haunting Türkis) oder als
Streifen (Ladebildschirm oben, Willkommen links). Wer eine neue Leiste baut,
nimmt diese Variablen und keine eigenen Farben; die Burgerladen-Zeile stand
bis dahin als `style.cssText` im Code und steht jetzt als Klasse in
`style.css`.

## Die Version auf der Startseite

Ganz unten, klein und still: `v0.1.1 · Build 96ba100782ea`. Die erste Zahl ist
`0.<Build>.<Patch>` aus `package.json`, die zweite der Commit dieses Builds
(`core/appVersion.ts`, `core/assetVersion.ts`). Gewünscht war: „Ich möchte auf
der Startseite eine Versionsnummer sehen."

**Warum beides.** Zwei Geräte mit derselben Version können aus verschiedenen
Builds laufen — ein Deploy, der die Version nicht angefasst hat, oder ein
Telefon, das noch aus seinem Speicher startet (`docs/agents/deployment.md`).
Dann ist der Commit das Einzige, was die beiden unterscheidet, und genau der
gehört in einen Fehlerbericht.

**Wer die Zahl erhöht.** Jeder Pull Request den Patch — die Regel steht in
[AGENTS.md](../../AGENTS.md), und die CI sieht nach
(`tools/version-check.mjs`, Schritt _Version bump_ in
`.github/workflows/deploy.yml`). Verglichen wird mit dem **Zielbranch**: Zwei
Pull Requests nebeneinander gehen beide von `main` aus, und wer zuletzt
mergt, merkt beim Rebase selbst, dass seine Zahl schon vergeben ist. Wer
direkt auf `main` pusht, hat keinen Zielbranch — dann läuft der Schritt gar
nicht erst.

Die Zahl steht an **einer** Stelle (`package.json`), denn eine Zahl, die an
zwei Stellen steht, ist an einer davon falsch. Vite setzt sie beim Bauen ein
(`define`, `__APP_VERSION__`); in einem Jest-Lauf ist sie leer, und dann
bleibt der Absatz leer und verschwindet (`.landing__version:empty`).

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
  die Prüfsumme ihres Inhalts in der Adresse: Es _kann_ nichts Neues geben.

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

**Der kann es gar nicht mehr.** _Beitreten_ steht stumpf da, solange die Welt
nicht geladen ist, und wird frei, sobald sie steht — nicht andersherum. Hier
stand lange die schwächere Fassung: Der Knopf war vom ersten Bild an
bedienbar, und erst **nach** dem Klick wurde er stumpf, während `ensureWorld`
lief. Das war schon besser als die Fassung davor (die Startseite verschwand
sofort und gab den Blick auf ein schwarzes Bild frei), aber es war immer noch
ein Knopf, der eine Bereitschaft behauptete, die er nicht hatte.

**„Geladen" heißt dabei mehr, als es aussieht.** `App.goTo` kommt zurück,
sobald `World.init` gebaut hat — die Modelle kommen **danach**: Die Küche holt
ihre Möbel mit `void import('core/kitchenModel').then(…)`, der Koch und die
Wundertüte ebenso, und keiner davon wird von `init` abgewartet. Gemessen (in
diesem Container, örtlicher Server, Software-Rendering, drei Läufe) steht
`App.currentWorldId` nach 2,7–3,7 s, und die Modelle kamen noch **3,5–4,6 s**
danach. Wer den Knopf bei `goTo` freigäbe, gäbe ihn dreieinhalb Sekunden zu
früh frei.

Also wartet `ensureWorld` einen zweiten Schritt: bis der **Lade-Manager von
three.js** eine Sekunde lang nichts mehr zu tun hatte (`App.assetsSettled`,
`core/assetGate.ts`). Warum an dieser einen Stelle und nicht als `assetsReady`
in jeder Welt: Eine Promise, die eine Welt aus ihren Erst-Ladungen
zusammensetzt, müsste an jeder Stelle nachgetragen werden, die etwas nachlädt
— in der Küche allein an fünf —, und eine solche Liste ist nach dem zweiten
Umbau unvollständig. Sie meldete dann „fertig", weil jemand seine Ladung
vergessen hat. Der Lade-Manager dagegen weiß von jedem `GLTFLoader` und jedem
`TextureLoader` ohne eigenen Manager — und das sind hier alle —, auch von
denen, die es morgen gibt.

**Und „still" statt „leer"**, weil ein Lade-Manager zwischen zwei Wellen leer
ist, obwohl die Welt noch lädt: Die Küche hat dann ihren Chunk, aber noch kein
Modell angefordert. Eine Sekunde Stille ist die Frist; kürzer, und die Pause
zwischen zwei Wellen sähe aus wie das Ende.

**Der Deckel: zwanzig Sekunden** (`ASSET_CAP_MS` in `main.ts`). Er ist keine
gemessene Dauer, sondern eine Grenze — eine Datei, die weder ankommt noch
scheitert, meldet sich bei keinem Lade-Manager wieder ab, und ein Knopf, der
darauf wartet, wäre für den Rest der Sitzung tot. Danach wird er frei, und
darunter steht, dass noch nachgeladen wird. Kommt die Ladung doch noch an,
verschwindet auch diese Zeile wieder.

**Die Fälle, und was der Knopf in jedem tut** — gerechnet wird das in
`core/warmStart.startButton`, einer reinen Rechnung mit Test, damit `main.ts`
nur noch ausführt:

| Lage | Knopf | Zeile darunter | Balken |
| ---- | ----- | -------------- | ------ |
| Die Welt wird vorgewärmt oder ist nach dem Klick unterwegs (`lädt`) | stumpf | `Die Welt wird geladen …` | läuft |
| Sie steht, samt ihrer Startladung (`steht`) | frei | — | weg |
| Es wird **gar nicht** vorgewärmt: Daten sparen, `2g`/`slow-2g`, Tab im Hintergrund (`ruht`) | **frei** | `Die Welt wird beim Beitreten geladen.` | steht still |
| Der Deckel war schneller als die Leitung (`dauert`) | frei | `Die Welt lädt noch — Beitreten geht trotzdem.` | läuft |
| Sie kam nicht (`fehlt`, `App.onWorldFailed`) | frei | `Die Welt kam nicht an — Beitreten versucht es noch einmal.` | steht still |
| Hinter einer Lobby (`#haunting`) | frei | — | weg |

**Die dritte Zeile ist die Entscheidung**, die man leicht andersherum trifft.
Wo nicht vorgewärmt wird, lädt niemand — ein Knopf, der dort auf das Ende
einer Ladung wartete, wartete auf nichts, und _Daten sparen_ hätte sich einen
toten Knopf eingehandelt. Die Ladung trotzdem bei der ersten Geste
anzuwerfen, wäre die andere Möglichkeit gewesen und die falsche: Wer `2g` oder
_Daten sparen_ meldet, hat die Frage nach 2,6 MB ungefragter Last schon
beantwortet. Also bleibt der Knopf bedienbar, lädt beim Druck wie eh und je,
und die Zeile darunter sagt es **vorher**. Kommt der Tab aus dem Hintergrund
zurück, malt die Seite sofort neu und fängt an zu wärmen.

**Ohne Netz** gilt dieselbe Regel und nichts Besonderes: Nach einem früheren
Besuch beantwortet der Service Worker alles aus dem Speicher — die Welt steht,
der Knopf wird frei. Ohne Netz und ohne früheren Besuch scheitert die Ladung,
`onWorldFailed` räumt sie ab, und der Knopf ist wieder frei mit der Zeile aus
der vorletzten Tabellenzeile. Einen Zustand, in dem nichts mehr geht, gibt es
in keinem der Fälle.

**Im HTML steht `disabled`** (`index.html`, `#enter`), und das ist eine
Abwägung: In der Sekunde vor dem Bündel ist die Welt mit Sicherheit nicht
geladen, ein bedienbar aussehender Knopf verspricht dort also etwas, das erst
`main.ts` einlösen kann — genau die Lücke, in der gemeldet wurde, dass der
Druck ins Leere geht. Der Preis ist ein toter Knopf, wenn das Bündel **gar
nicht** kommt; dann ist die Seite allerdings ohnehin nur ein Bild. Die
Gegenrechnung steht im Modulrumpf von `main.ts` (`paintStart`) und läuft,
sobald das Bündel ausgewertet wird.

**Der Balken ist dabei nicht mehr dasselbe wie die Zeile.** Er läuft nur, wenn
wirklich etwas unterwegs ist (`.boot--still` in `style.css` hält ihn an);
sonst behauptete er eine Arbeit, die niemand tut — und genau das war die
Bedingung, die im Abschnitt darunter schon einmal falsch war.

Die XR-Sitzung wird dabei **zuerst** angefragt und die Welt daneben geladen —
dieselbe Reihenfolge wie in `startHaunting` und aus demselben Grund: Ein
Browser gibt eine immersive Sitzung nur auf eine frische Geste, und die wäre
nach dem Warten auf einen Chunk verbraucht. Mit vorgeladener Welt ist der
Klick diese Geste, und `enterPlayground` ruft `startVR()` weiterhin vor jedem
`await`.

**In der Lobby (`#haunting`) gilt nichts davon**, und zwar mit Absicht: Dort
wird nicht vorgewärmt (die Welt nähme sich beim Aufbau einen Raum, bevor die
Lobby ihren kennt), also gibt es nichts, worauf `#haunt-enter` warten könnte.
Stumpf wird er nur, **solange er etwas tut** — und das ist seit diesem Umbau
die ganze Strecke und nicht mehr nur das Verbinden: `hauntEntering` deckt
`startHaunting` von der ersten Zeile bis zur fertigen Welt ab. Vorher gab
`joinHaunting` den Knopf in seinem `finally` wieder frei, während die Welt
noch lud — und wer schon verbunden war und im selben Raum stand, kam gar nicht
erst an `hauntBusy` vorbei: Sein zweiter Druck schickte eine zweite Runde los.

**Was hier nicht gemessen werden konnte**, damit es niemand für gemessen hält:

- **Die Zahlen oben stammen aus diesem Container** (Software-Rendering,
  Server auf demselben Rechner), nicht von einem Telefon an einer
  Mobilfunkleitung. Der Abstand zwischen „Welt steht" und „Knopf frei" ist
  dort vor allem Rechenzeit; über eine schmale Leitung wird er größer, denn
  dann liegen die Modelle wirklich im Netz.
- **Der Deckel ist nie zugeschlagen.** Zwanzig Sekunden sind hier nie
  erreicht worden; dass er greift, steht im Test von `core/assetGate.ts` und
  nicht in einer Messung.
- **Die Aufnahmen der Küche zählen nicht mit.** Die 26 `.ogg`
  (`worlds/test/zones/kitchenAudio.ts`) kommen über ein blankes `fetch` und
  werden erst entpackt, wenn der Ton aufgeschlossen ist — also **nach** dem
  Druck. Auf sie zu warten hieße, auf etwas zu warten, das ohne den Klick gar
  nicht anfängt; eine fehlende Aufnahme ist obendrein Stille und keine kaputte
  Welt. Alles andere, was hier klingt, ist ohnehin gerechnet und nicht
  geladen (`core/Audio.ts`: ein paar Oszillatoren).
- **Ebenso wenig zählen Chunks mit**, die eine Welt nachlädt: Der Browser holt
  sie ohne Lade-Manager. Dafür ist die Frist da — wer einen Chunk holt, um
  danach ein Modell zu laden, ist binnen einer Sekunde wieder zu hören.

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
  bleiben mit Absicht: Sie tragen keine Prüfsumme, weil three.js ihre Adressen
  selbst zusammenhängt, und sind damit die einzigen Dateien, die weiter
  nachgeholt werden. Gemessen ist das der schlechteste Fall — ein Browser, dessen
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
- **Eine Ausnahme ist seit dem stumpfen Knopf dazugekommen**, und sie ist
  genau derselbe Gedanke: Wo nicht gewärmt wird, steht unter dem Knopf, dass
  die Welt erst beim Druck kommt — da ist etwas zu _sagen_, aber nichts zu
  _zeigen_. Die Zeile bleibt, der Streifen hält an (`showStartNote(text,
  running)`, `.boot--still`). Was davon gilt, sagt dieselbe Rechnung wie für
  den Knopf: `core/warmStart.startButton` gibt `note` und `busy` getrennt
  zurück.

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
Adresse die **Prüfsumme ihres eigenen Inhalts** (`?v=…`,
`core/assetVersion.ts`), wird nichts nachgeholt — es _kann_ nichts Neues geben,
denn ändert sich die Datei, fragt der nächste Build unter einer neuen
Prüfsumme, und was eine fremde trägt, wirft `isStaleMedia` beim Aktivieren weg.
Ohne diese Frage kostete ein Start, dessen HTTP-Cache abgelaufen war (GitHub
Pages erlaubt zehn Minuten), **33 Anfragen und 1,6 MB** für Bytes, die schon im
Telefon lagen; mit ihr sind es **5 Anfragen und 429 kB** — und die 429 kB sind
die Controller-Modelle, die keine Prüfsumme tragen. Wer **kein** `v=` hat —
die Controller-Profile, das Manifest, das Regal —, bleibt beim Nachholen.

**Hier stand einmal die Build-Nummer**, und sie war zwar richtig, aber viel zu
grob: Sie ändert sich bei jedem Deploy, also traf die Frage nach einem Deploy
auf keinen einzigen Eintrag mehr, und 3,7 MB Töne und Modelle gingen noch
einmal über die Leitung, weil irgendwo ein Kommentar anders lautete. Die ganze
Rechnung steht in [Deployment](deployment.md#prüfsumme-statt-build-nummer--und-warum-das-9-mb-wert-war).

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
- **Drei Speicher, und nur einer trägt die Build-Nummer.**
  `bgvr-shell-<build>` hält die drei HTML-Seiten (58 kB) und wird beim
  Aktivieren des nächsten Builds gelöscht — sie nennen die Namen aller anderen
  Dateien, also darf keine alte liegenbleiben. `bgvr-assets` hält alles mit
  Hash im Namen und **überlebt den Deploy**: Ein Name mit Hash ist ein
  Versprechen über den Inhalt, und beim Aktivieren fliegt nur hinaus, was in
  der Dateiliste dieses Builds nicht mehr steht (`isStaleAsset`). `bgvr-media`
  hält die festen Namen aus `public/` und überlebt ebenfalls. Vorher lagen die
  ersten beiden in **einem** Speicher mit der Build-Nummer im Namen, und jeder
  Deploy warf 5,4 MB weg, die er danach unter genau denselben Namen wieder
  holte.
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

Der Service Worker wird deshalb **für sich allein gebaut**: `precachePlugin`
lässt esbuild `src/sw.ts` zu einer geschlossenen Datei (`iife`, dieselben
`define`s wie die Seite) bündeln und legt sie als `sw.js` neben die Seiten —
sein Geltungsbereich ist das Verzeichnis, in dem er liegt, ein
`sw-C3aB9x2Q.js` in `assets/` könnte nur `assets/` beantworten. Er muss ein
**klassisches Skript ohne `import`** sein, denn so meldet `core/pwa.ts` ihn an
(`type: 'module'` kann Safari erst ab 16.4).

Das war einmal anders, und daran ging es kaputt: Er stand als vierter Eingang
in `rollupOptions.input`, und solange er mit der Seite kein Modul teilte,
bündelte Rollup ihn zu einer Datei. Seit er `core/assetVersion.ts` braucht
(Prüfsumme statt Build-Nummer), lag dieses Modul in einem gemeinsamen Chunk,
`sw.js` begann mit `import … from "./assets/assetVersion-….js"`, und der
Browser lehnte ihn ab („ServiceWorker script evaluation failed"). Der Build war
grün und die Seite lief — nur ohne Service Worker: kein Speicher, kein Start
ohne Netz, und der automatische Download lief nie an. Jetzt bricht der Build
ab, wenn `sw.js` je wieder mit `import` oder `export` beginnt.

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
Also gab es auf der Startseite einen zweiten Knopf, **Alles herunterladen**
(heute ist er in _Beitreten_ aufgegangen, siehe unten), und dahinter liegen
71,5 MB in 4741 Dateien — das ganze Programm, alle Modelle, alle Töne und das
ganze KayKit-Regal.

### Drei Dateien, und jede tut genau eines

| Datei | Was darin steht |
| ----- | --------------- |
| `core/fullDownload.ts` | **Rein, mit Test**: der Plan, die Reihenfolge, die Stempelregel, der Fortschritt, die Restzeit — und jeder Satz, der auf dem Knopf steht |
| `core/fullDownloadRun.ts` | Das Holen: sechs Dateien gleichzeitig, zweite Versuche, Abbrechen, im Speicher nachsehen |
| `core/fullAuto.ts` | **Rein, mit Test**: ob der Download _Beitreten_ aufhält, und ob eine Prüfung gleich in einen Lauf übergeht |
| `main.ts`, `#offline` | Drei Elemente unter _Beitreten_ und ein Zustandsautomat: Balken, Zeile, Überspringen — beschriftet wird der eine Knopf |

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
zwei Sorten Datei sind: `bundle` sind die 49 erzeugten Dateien (die drei
Seiten, jeder Chunk samt Welten, three.js und der 2,8 MB großen
Physik-Engine, der Stil), `files` sind die 231 Dateien aus `public/`.

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
| `programm` | Die drei Seiten, alle Chunks, three.js, die Physik-Engine | 5,5 MB (49) |
| `medien` | Die drei gebündelten Kataloge, der Koch, die Töne, die Controller-Modelle, die Symbole | 8,8 MB (82) |
| `regal` | Der Index, die 153 Texturen, dann die 4470 Modelle | 57,2 MB (4624) |

Nach dem zweiten Abschnitt — nach einem Fünftel der Bytes — ist das **Spiel**
vollständig; die restlichen vier Fünftel sind das Regal, und genau das ist der
Teil, den man guten Gewissens abbricht. Innerhalb des Regals kommen die
Texturen **vor** den Modellen: Ein abgebrochener Download ergibt so ein Regal
mit weniger Fässern und nicht eines mit lauter weißen.

### Die Prüfsumme ist hier der teuerste Fehler

Ob an eine Adresse `?v=` gehört, muss **auf das Zeichen genau** so ausfallen
wie in dem Lader, der die Datei später wirklich anfragt. Eine Adresse mit `?v=`
ist für einen Speicher ein anderer Name: Wer hier falsch stempelt, lädt 71 MB
herunter, sieht einen Balken durchlaufen und findet im Funkloch trotzdem nichts
wieder.

Deshalb wird die Frage **nur noch einmal beantwortet**, und zwar im Build:
`isStamped` in `vite.config.ts` entscheidet, welche Datei aus `public/` eine
Prüfsumme bekommt, `assetHashes` rechnet sie aus, und beide Seiten — der Plan
hier und der Lader dort — schlagen dasselbe Verzeichnis durch dieselbe Funktion
nach (`core/assetVersion.ts`, `versionedWith`). Hier stand einmal eine zweite
Fassung derselben Regel, `stamped()`; zwei Lesarten derselben Regel sind eine,
die beim nächsten Umbau auseinanderläuft. Was im Verzeichnis steht, ist
schnell gesagt:

- **Töne und die gebündelten Kataloge** stehen darin — `audio/**` und
  `models/*.glb`.
- **Das Regal, seine Texturen und sein Index** stehen nicht darin: 4470
  gekaufte Dateien, die sich nie ändern ([Das KayKit-Regal](assetregal.md),
  _Keine Build-Nummer_). Eine `.glb` zeigt mit einer **relativen** Adresse auf
  ihre Textur, und three.js löst sie ohne Frage im Anhang auf.
- **Die Controller-Profile** stehen nicht darin (`core/ControllerModels.ts`):
  three.js hängt diese Adressen selbst zusammen.

Alles Übrige — Manifest, Symbole, Banner — fragt der **Browser** selbst an, und
der hängt nichts an. Deshalb ist „nein" die Vorgabe und nicht „ja", und deshalb
steht die Tabelle im Test.

### Wer den Speicher füllt: der Service Worker

In `core/fullDownloadRun.ts` steht **kein einziges `caches.open`** mit einem
Namen darin, und das ist die Entscheidung, die man sich merken sollte. Ein
`fetch` von der Seite läuft durch den Service Worker, und der legt die Antwort
genau dort ab, wo sie hingehört: Chunks mit Hash in `bgvr-assets`, Modelle und
Töne in `bgvr-media` — und beim Aufräumen wirft er wieder weg, was dieser Build
nicht mehr kennt.

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

### Ein Knopf: Beitreten und der Download davor

Lange waren es zwei Knöpfe: _Beitreten_, und darunter _Alles herunterladen_,
der blinkte, wenn etwas fehlte, mit einem Haken „Fehlendes automatisch
herunterladen" (`bgvr.autoload`). Gewünscht wurde dann:

> „Da man eh nicht beitreten kann, wenn nicht alle Assets da sind, sollten wir
> das anpassen, sodass der ‚Download assets' und der Beitreten-Button in eins
> sind. Also der Button zeigt an ‚Downloading' bzw. prüfen, und darunter ist
> direkt der Progress-Bar. Das ‚Fehlendes automatisch herunterladen' kann weg
> und ist default true, sonst kann man ja eh nicht spielen."

Seitdem gibt es keinen eigenen Download-Knopf, keinen Haken und kein Blinken
mehr. **Nachgesehen wird bei jedem Start**, sobald der Browser Luft hat
(`whenIdle`) und ein Service Worker antwortet — beim allerersten Besuch
übernimmt er erst nach dem Anmelden (`clients.claim`), dann wartet die Prüfung
auf `controllerchange`. Sie kostet die beiden erzeugten Listen (`offline.json`,
den Index des Regals) und einen Blick in den Speicher. **Fehlt etwas, wird es
sofort geholt** (`autoStarts`, nur aus _offen_).

Solange geprüft oder geladen wird, **hält das _Beitreten_ auf**
(`fullBlocks`), und der Knopf sagt selbst, woran er ist (`fullLabel`); der
Balken steht direkt darunter. Dasselbe gilt für `#haunt-enter` in der Lobby.
Die Zeile der Welt (`#start-note`) schweigt in dieser Zeit — zwei Balken, die
beide „lädt" sagen, sagen nichts mehr.

| Zustand | _Beitreten_ | Balken und Zeile darunter |
| ------- | ----------- | ------------------------- |
| `unbekannt` | wie immer (_Beitreten_ / _Enter VR_) | nichts |
| `prüft` | _Wird geprüft …_ (stumpf) | Balken unbestimmt, „Es wird nachgesehen, was schon da ist …" |
| `läuft` | _Lädt … 17 %_ (stumpf) | Balken, „12,4 MB von 71,5 MB · noch etwa 2 Minuten", **Überspringen** |
| `offen` | wie immer | wie viel schon da ist (nur, solange der Tab im Hintergrund war und der Lauf beim Zurückkommen anfängt) |
| `angehalten` | wie immer | Balken, „Übersprungen bei … Das Geholte bleibt, der Rest kommt beim nächsten Start." |
| `fertig` | wie immer | „Alles da — … im Gerät, die Spielwiese läuft auch ohne Netz." |
| `lückenhaft` | wie immer | Balken, „… · 3 Dateien kamen nicht an." |
| `kein-speicher` | wie immer | **warum** es nicht geht — kein Service Worker, oder kein Cache-API |
| `keine-liste` | wie immer | „Die Liste der Dateien ist nicht erreichbar." |

**Aufhalten nur, solange jemand arbeitet.** Jeder andere Zustand ist ein
Ende, und keines davon darf einen Knopf für den Rest der Sitzung tot machen:
Gespielt wird dann mit dem, was das Netz liefert. Auch _offen_ hält nicht
auf — ein Tab im Hintergrund fängt nicht an (`mayStartFull`), und ein Knopf,
der darauf wartete, wartete womöglich auf niemanden. Der Lauf kommt dann beim
Zurückkommen (`visibilitychange`).

**Überspringen** ist der Ausweg für eine schmale Leitung: Es hält den Lauf an,
das Geholte bleibt, und beim nächsten Start ist der Stand wieder _offen_ und
es geht von selbst weiter. In derselben Sitzung wird aus _angehalten_ und
_lückenhaft_ nicht von selbst wieder angefangen — das wäre eine Schleife gegen
den, der davorsitzt.

**Und ein Zustand, der nicht kann, sagt warum.** Im Entwicklungsbetrieb läuft
kein Service Worker (`core/pwa.ts`); ein `fetch` landete dann im HTTP-Cache
statt im Speicher. Dort wird deshalb gar nicht erst geprüft, und _Beitreten_
bleibt, wie es ist.

### Die Rücksichten — und welche hier nicht gelten

Vom Vorwärmen bleibt fast nichts übrig, denn **hier hat jemand gefragt**:

- `saveData` und eine schmale Leitung werden **gesagt und nicht befolgt**
  (`fullWarning`): „Achtung: ‚Daten sparen' ist eingeschaltet." Gespielt wird
  mit allem, was dazugehört; wer es eilig hat, drückt _Überspringen_.
- **Die Lobby** spielt keine Rolle: Ein Download lädt keine Welt und nimmt
  keinen Raum ein.
- **Kein Speicher** ist keine Höflichkeit, sondern Physik.
- **Im Hintergrund fängt nichts an** — ein laufender wird aber auch **nicht**
  angehalten, wenn der Reiter wegschaltet. Siebzig Megabyte anzufangen und
  dann beim Blick aufs Telefon abzubrechen wäre das Gegenteil dessen, wofür
  er da ist.

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
| Die Prüfung beim Start | derselbe Weg wie _Nochmal prüfen_: zwei erzeugte Listen und ein Blick in den Speicher, nach dem ersten vollen Lauf beides aus dem Speicher |
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
