# Projektwissen für Agenten

Dieses Dokument ist der Eingang zum langen Gedächtnis des Projekts: alles, was
in der [README](README.md) bewusst nicht steht. Hier stehen die
**Arbeitsregeln** — sie gelten in jeder Sitzung — und darunter der
[Wegweiser](#wegweiser) durch die Kapitel in `docs/agents/`. Wer etwas ändert,
das nicht mehr stimmt, schreibt es dort auch um.

## Arbeitsregeln

**Alles geht direkt auf `main`** — kein Feature-Branch, kein Pull Request,
solange nicht ausdrücklich etwas anderes gewünscht ist. Das gilt für Menschen
wie für Agenten: entwickeln, committen, `git push -u origin main`. Wer
ausnahmsweise einen Branch will, sagt das im Auftrag dazu.

**Branches werden hinterher weggeräumt.** Wer aus irgendeinem Grund auf einem
eigenen Branch entwickelt hat und die Arbeit dann auf `main` landet — sei es
direkt gepusht oder über einen Pull Request —, löscht denselben Branch danach
sofort wieder, lokal _und_ auf `origin`:

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

**Gebaut wird aus vorhandenen Modellen.** Wände, Möbel, Böden und alles
andere, was man in einer Welt sieht, kommen aus dem Regal
(`public/models/kaykit/`, siehe [Assetregal](docs/agents/assetregal.md)) —
keine selbst gerechneten Wände oder Klötze, solange nicht ausdrücklich darum
gebeten wird. Gewünscht: _„dass ich eigentlich immer nur existierende Modelle
nutzen will, außer ich sage es explizit"_. Für Wände heißt das
`grid/shelfWalls.ts` (`planShelfWalls`, `wallRun`, `wallSlant`); ein Plan
darf Wände für die Rechnung tragen, die Welt räumt sie dann weg
(`clearPlanWalls`) und stellt die Stücke hin.

**Jeder Pull Request erhöht die Patch-Version.** Auf der Startseite steht
`0.<Build>.<Patch>` aus `package.json` (siehe
[Die Seite selbst](docs/agents/seite.md#die-version-auf-der-startseite)), und
sie ist nur etwas wert, wenn sie sich bewegt:

```
npm version patch --no-git-tag-version
```

Die CI prüft das bei jedem Pull Request gegen den Zielbranch
(`tools/version-check.mjs`) — bei einem direkten Push auf `main` gibt es
keinen Zielbranch und damit nichts zu prüfen; wer dort etwas ablädt, das
jemand merken soll, erhöht sie trotzdem. Den mittleren Teil (`Build`) setzt
von Hand, wer findet, dass etwas Großes fertig ist.

Vor dem Push laufen `npm run typecheck`, `npm run lint`, `npm run format:check`
und `npm test` — dieselben vier Schritte, die auch die CI macht
(`.github/workflows/deploy.yml`). Eine Regel, an die sich nur erinnert wird, ist
keine; deshalb prüft sie jetzt jeder Push nach. `npm test` ist **alles, was es
gibt** und in gut einer halben Minute durch (5069 Tests) — eine zweite,
langsame Suite und den CI-Job daneben gab es einmal, sie sind weg (siehe
[Tests](docs/agents/tests.md)).

### Sessions, die nicht auf `main` pushen dürfen

Claude Code im Browser (claude.ai/code) läuft in einem fremden Container und
bekommt vom Harness einen `claude/…`-Branch zugewiesen; `git push -u origin
main` ist dort nicht möglich, egal was ein paar Absätze weiter oben steht. Für
diese Sessions gilt deshalb der Umweg — aber vollständig, bis der Commit auf
`main` steht:

1. Auf dem zugewiesenen Branch entwickeln, die vier Prüfungen laufen lassen,
   pushen.
2. Pull Request eröffnen, **nicht als Draft**. Ein Draft ist für GitHub keine
   fertige Arbeit: mergen lässt er sich nicht, und Auto-Merge lässt sich auf
   ihm gar nicht erst scharfstellen.
3. Warten, bis die CI grün ist, und den PR dann **selbst mergen**. Auf einen
   Menschen wird dabei nicht gewartet: Das Ergebnis dieser Regel ist ein
   Commit auf `main` und nicht ein offener Pull Request.
4. Den Branch löschen, lokal und auf `origin` — dieselbe Aufräumregel wie oben,
   samt dem `HTTP 403`, der gesagt werden will.

Wer am Ende einen offenen PR liegen lässt, hat die Arbeit nicht abgeliefert,
sondern nur abgelegt. Fehlt das Recht zum Mergen, steht genau das im Ergebnis,
mitsamt der Nummer des PR.

Sobald auf `main` ein Ruleset mit dem Pflicht-Check `Build` liegt, ersetzt
GitHubs Auto-Merge den dritten Schritt: einmal scharfstellen, und GitHub mergt
selbst, sobald die CI durch ist. Ohne so ein Ruleset ist jeder PR von der ersten
Sekunde an mergebar, und genau dann lässt GitHub Auto-Merge nicht zu — deshalb
steht hier das Warten und nicht die Automatik.

### Linter und Formatierer

`npm run lint` ist ESLint mit einem **kleinen** Regelsatz (`eslint.config.js`).
Klein mit Absicht: Ein Linter, der über Stil schimpft, wird nach zwei Wochen
übergangen; einer, der Fehler findet, wird gelesen. Es steht also nur darin, was
hier schon einmal wehgetan hat — nicht abgewartete Promises (die Welten laden
asynchron), Methoden, die von ihrem Objekt getrennt herumgereicht werden, tote
Variablen. Über die _Form_ entscheidet Prettier, nicht ESLint.

`npm run format` formatiert die TypeScript-Dateien, `npm run format:check` prüft
nur. Absichtlich **nicht** dabei: `src/style.css` und `index.html`. Die
einzeiligen CSS-Regeln dort sind handgesetzt und gewollt, und ein Formatierer,
der sie auseinanderzieht, gewinnt nichts.

Zwei Regeln sind ausgeschaltet, und beide aus demselben Grund: Sie hielten
Absicht für Versehen. `no-unnecessary-type-assertion` hätte 268 Ausrufezeichen
hinter Array-Zugriffen wegoptimiert, die der nächsten Leserin sagen, dass dort
wirklich etwas steht; `require-await` beanstandet Methoden, die eine
Schnittstelle als `async` vorschreibt.

## Wegweiser

Das Wissen selbst steht in `docs/agents/`, ein Kapitel je Datei. Die
Aufteilung ist ein Zugeständnis an die Leser: Diese Datei war über ein Megabyte
groß, und ein Nachschlagewerk, das niemand am Stück lesen kann — kein Mensch und
erst recht kein Agent mit begrenztem Kontext —, wird nicht nachgeschlagen,
sondern durchsucht und dabei missverstanden. Oben steht deshalb, was **immer**
gilt; darunter steht, wo das Übrige liegt.

Wer etwas ändert, ändert es in dem Kapitel, in dem es steht — und trägt ein
neues Kapitel hier ein. Der Wegweiser ist die einzige Liste, die vollständig
sein muss.

**Gesucht wird quer über alle**: `grep -rn "Stichwort" docs/agents/` findet
auch, was in den beiden langen Kapiteln ohne Zwischenüberschriften steht
(_Was drin ist_, _Haunting / Orbital_ — beide sind Listen aus fetten
Stichpunkten).

### Vor jedem Push

- **[Tests](docs/agents/tests.md)** — Zwei Geschwindigkeiten, und was überhaupt geprüft wird.

### Was es gibt

- **[Was drin ist](docs/agents/inhalt.md)** — Die Welten, die Zonen und die Spiele: was es gibt und was es tut.
- **[Haunting / Orbital](docs/agents/haunting.md)** — Die Raumstation für eine Quest und zwei Mobilgeräte: Runde, Rollen, Karte, Bots. Das längste Kapitel.
- **[Das Restaurant](docs/agents/burgerladen.md)** (vormals Burgerladen, `#plateup`) — Spielküche mit Gastraum und ein Spiel nach _PlateUp!_: Gäste, Geduld, Bestellung, Tage.
  Darin: Was wo liegt · Wie es aussieht · Der Spielablauf · Steuerung · Zum Prüfen · Offen.

### Steuerung

- **[Steuerung](docs/agents/steuerung.md)** — Das einheitliche Schema (gleiche Absicht, gleicher Knopf), Menüs mit dem Pad, die Tastenhilfe — und die Tabelle: welche Taste, welcher Knopf, welcher Stick, in jeder der drei Ansichten.
- **[Greifen, Reichweite, Benutzen](docs/agents/greifen.md)** — Was ein Ding will und womit man es bekommt: Saum, Griff, Trigger und die drei Reichweiten.
  Darin: Drei Dinge, drei Reichweiten — und ihre Namen · Ein Griff ist auch für das, was kein Werkzeug ist · Vier Reichweiten? Nein — drei, und eine Einschränkung · Was ein Ding will — und womit man es bekommt · Der Feuerlöscher: wo er hingestellt wird und was ihn anmacht · Benutzen mit der Hand — die Brille · Und am Schirm trägt die Figur · Halten oder Tippen — zwei Greif-Arten, beide gültig · Abgelegt wird beim Loslassen und nicht beim Hinlangen · Was in der Brille in der Hand liegt.
- **[Die Waffe und die Kartzone](docs/agents/waffe-und-kart.md)** — Zwei Zonen, die ihre eigene Steuerung mitbringen.
  Darin: Die Waffe · Die Kartzone.
- **[Hände, Controller und Griffe](docs/agents/haende.md)** — Controller-Modelle, Handhaltung, Handmodell — und die eingemessenen Griffe der Werkzeuge.
  Darin: Controller-Modelle · Handhaltung · Handmodell: Boxhand oder weißer Handschuh · Eingemessene Griffe · Eine Faust, und sie ist gerechnet · Ein Griff für alle Werkzeuge · Und jetzt hängt ein gekauftes Netz am Halterzylinder.
- **[Konfig-Code](docs/agents/konfig-code.md)** — Alle Einstellungen als eine Zeichenkette: teilen, einlesen, zurücksetzen.
  Darin: Der Kurzcode · Über die Leitung · Live auf die Werkzeugseite.

### Architektur

- **[Architektur](docs/agents/architektur.md)** — Der Überblick: welcher Ordner was tut, und warum die Rechnung neben der Darstellung steht.
- **[Das Zellgitter](docs/agents/zellgitter.md)** — Halbe Kacheln, Figuren auf 2 × 2, Wände unter 45° — und was noch nicht auf Zellen läuft.
- **[Wie schön es aussieht](docs/agents/grafik.md)** — Licht, Schatten, Regler — und was ein Bild in der Brille kostet.
  Darin: Die schwarze Kante · Die Brille rechnet kleiner, wenn man es sagt · Die Gitterlinien · Die Hitboxen · Ghosting zeigen · Position zeigen · Griffe zeigen · Quest-3-Blickfeld und Mensch als Boxen · Info-Ansichten: ein Optionsfeld für alle · Squishy: die Figur federt beim Laufen und atmet im Stehen · Was die Kamera ansieht · Warum tausend Bodenkacheln trotzdem ein Zeichenaufruf sind · Und die Wände auch — nur nicht von oben · Wer sagt, dass er keinen Schatten wirft, wirft keinen · Zwei Zahlen, die man einmal kennen sollte · Die Messstrecke der Küche — und wer die Aufrufe verbraucht · Und eine Tafel malt sich nicht neu, wenn dasselbe daraufsteht · Die Messstrecke der Welten — was die neuen Welten kosten.
- **[Modelle im Repository](docs/agents/modelle.md)** — Welche Datei welches Netz hergibt, wie zugeschnitten wird und was es wiegt.
  Darin: Der zweite Katalog: 156 Stücke, ein Material, eine Textur · Der dritte Katalog: die Wundertüte · Das vierte: ein Regal und kein Katalog · Was aus dem Regal die gebaute Geometrie ersetzt — und was nicht · Eine Build-Nummer an jeder Adresse · Und der Ton wird aufgeschlossen, nicht eingeschaltet · Und dann zog die erste Küche in den zweiten Katalog um · Fünf Zahlen, die aus dem Katalog mehr machen als eine Liste · Anfassen in der Küche · Der Körper unter dem Möbel.
- **[Bauen](docs/agents/bauen.md)** — Der Konstrukt-Raum, aus dem die Möbel kommen — der Umbau, während man darin steht, und die drei Spielmodi.
  Darin: Der Konstrukt-Raum · Bauen, während man darin steht · Der Spielmodus und die Liste der Weltänderungen · Flächen setzen im Baukasten · Die Werkzeugleiste des Baukastens · Räume dekorieren.
- **[Das KayKit-Regal](docs/agents/assetregal.md)** — Die gekaufte Sammlung als Menü: Schubladen, Suchfeld, Ordner für Ordner, mit dem Modell in der Kachel.
  Darin: Warum ein Regal und kein zweiter Beutel · Was wo liegt · Zwei Spalten in der Brille — und so viele, wie passen, am Schirm · Der Katalog nimmt den ganzen Schirm · Drei Wege hinein: alles, Pakete, Kategorien · Schubladen: Figuren, Möbel, Natur — und sieben weitere · Wo man war, wenn man wiederkommt — und der Weg zurück an den Anfang · Und ein Suchfeld — aber nur am Schirm · Deutsch suchen — ein Wörterbuch und keine 4470 Zeilen · Das Modell in der Kachel — und wie es auf dem Telefon dorthin kommt · In der Kachel stand nur der Kopf — und warum · Ein ⓘ in der Ecke jeder Kachel — und die Seite dahinter · Die genaue Bezeichnung — die Adresse an einem Stück, und ein Knopf daneben · Geladen wird, was zu sehen ist · Fächer in der Brille — und Nachladen beim Scrollen am Schirm · Die Ids sind Adressen · Was beim Nehmen passiert · Was hingestellt wird, rastet auf dem Kachelgitter ein · Das Gitter unter dem Getragenen · Die Kisten des Regals stehen auf einem Deckel · Aus dem Regal wird in der Küche ein Möbel · Aus einem Modell wird ein Gegenstand · Eine Figur, die läuft · Ein Maßstab je Paket — und warum die Ritter zu groß waren · Keine Build-Nummer · Geteilte Geometrie · Grenzen.
- **[Spielfigur, Karte und Beutel](docs/agents/spielfigur.md)** — Wie man aussieht, was am Handgelenk hängt und was aus dem Beutel kommt.
  Darin: Wie man aussieht · Was vor einem und an der Hand steht (Brille) · Die Karte in der Hand · Was aus dem Beutel kommt.
- **[NPCs](docs/agents/npcs.md)** — Wer hier herumläuft — und wie er sich orientiert: Wegnetz, Wegsuche, Verhalten.
  Darin: Wer hier herumläuft · Charakter: übernehmen, vormachen, nachspielen · Wie sich NPCs orientieren · Verhalten: Plätze aufsuchen, warten, ausweichen.
- **[Welten, Kacheln, Portale und Spiegel](docs/agents/welten.md)** — Das Kachelgitter des Geländes, eine neue Welt dazutun, Sandbox (vormals Testwelt), Ordner von Welten und die Test Navigation, und wie Portale und Spiegel rechnen.
  Darin: Welten auf dem Kachelgitter · Eine neue Welt hinzufügen · Wie die Portale funktionieren · Wie die Spiegel funktionieren.
- **[Zusammen spielen](docs/agents/netzwerk.md)** — Peer-to-Peer, Chat, Stimmen, geteilte Objekte, Zuschauen, asymmetrisches Spielen.
  Darin: Zusammen spielen (Peer-to-Peer) · Chat: Text, und vor allem Codes · Sprechen: Stimmen im Raum · Die Welt teilen: Objekte und Portale · Zuschauen: First und Third Person · Asymmetrisches Spielen.

### Die Seiten neben dem Spiel

- **[Die Werkzeugseite](docs/agents/werkzeugseite.md)** — `tools.html`: das Regal, die Vorschau und alles, was daran eingestellt wird.
  Darin: Eine Welt laufen lassen · Bearbeiten auf der Werkzeugseite · Verbinden: zusehen, während drüben gemessen wird.
- **[Der KayKit-Editor](docs/agents/kaykit-editor.md)** — `kaykit-editor.html`: ein Element von oben auf dem Zellgitter, Größe und Lage per Regler, belegte Zellen in Rot, Änderungen als JSON.
- **[Die Seite selbst](docs/agents/seite.md)** — Eingabeseite, das Menü und seine Bereiche, die Startseite mit Weltauswahl, der Weg ins Spiel (Ladebildschirm, Willkommen, eine Meldung mit ✕, ein Stil für Leisten), Vollbild, der Start — und die Seite als App.
  Darin: Die Eingabeseite · Das Menü: acht Bereiche und eine Tabelle (Brotkrumen, Esc, alte und neue Wege) · Menü → Eingaben · Vollbild, wo keine Brille ist · Die Ränder des Geräts: der sichere Bereich · Die Startseite: eine Welt wählen, einmal drücken · Vom ersten Öffnen bis ins Spiel: der Weg eines neuen Spielers (Ladebildschirm, Willkommens-Karte, in der Brille Blende und Tafeln, `--hud-*`) · Die Version auf der Startseite · Der Start: erst die Hülle, dann die Welt · Die Seite als App: Manifest, Symbole, Service Worker · Alles herunterladen: ein Knopf, ein Balken, eine ehrliche Dauer — geprüft und geladen wird von selbst, und solange hält es _Beitreten_ auf.

### Betrieb

- **[Deployment](docs/agents/deployment.md)** — Was ein Deploy für den Service Worker bedeutet — und wie eine veraltete Seite zurückfindet.
  Darin: Veröffentlicht wird als Fortsetzung und nicht als Neuanfang · Wenn eine Seite aus einem Build läuft, den es nicht mehr gibt · Was ein Deploy für den Service Worker bedeutet · Und was ein Deploy für einen bedeutet, der alles heruntergeladen hat · Der Start nach einem Deploy: was vorgewärmt wird.
