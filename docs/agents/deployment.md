# Deployment

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

`.github/workflows/deploy.yml` baut bei **jedem Push** (und in Pull Requests)
und lädt das Ergebnis als Artefakt hoch. Pushes auf `main` werden zusätzlich
auf den Branch `gh-pages` veröffentlicht — bewusst ohne GitHub-Pages-
Environment, damit keine Environment-Protection dazwischenfunkt. Nötig ist
nur die einmalige Einstellung:

> Repository → Settings → Pages → Source: **Deploy from a branch** →
> Branch `gh-pages`, Ordner `/ (root)`

Der Basispfad kommt aus `BASE_PATH` (im Workflow `/<repo-name>/`), lokal wird
von `/` ausgegangen.

## Veröffentlicht wird als Fortsetzung und nicht als Neuanfang

`dist` ist 76 MB groß, und vier Fünftel davon sind die 4470 gekauften Modelle,
die sich **nie** ändern. Genau daran hing ein Deploy, der teurer war, als er
aussah: Hier stand ein `git init` im frischen `dist/`, ein Commit ohne
Geschichte und ein `push --force`. Ein Repository ohne gemeinsame Geschichte
kann mit der Gegenseite nichts abgleichen — also lud jeder Deploy alle 4600
Dateien noch einmal hoch, und GitHub legte jede davon noch einmal ab. Der
Verdacht war richtig gestellt: „Bei jedem Deploy müssen die ganzen Assets neu
gebundelt bzw. gebaut werden? Wäre es nicht sinnvoller, diese auf einem extra
Branch oder so auszulagern?"

Ausgelagert wird deshalb **nichts** — die Antwort liegt eine Ebene tiefer:

1. `gh-pages` wird geholt (flach, ein Commit), geleert, mit `dist` gefüllt und
   bekommt einen **gewöhnlichen Commit** obendrauf.
2. Git schickt dann nur, was wirklich neu ist. Nach einem Deploy ohne neue
   Modelle sind das die geänderten Bündeldateien — ein paar Megabyte statt
   sechsundsiebzig. Die gekauften Dateien liegen genau **einmal** dort.
3. Ändert ein Push gar nichts am Ergebnis (Dokumentation, Workflows), gibt es
   keinen Commit und keinen Push.

Aufgeräumt wird dabei weiter: Was der Build nicht mehr erzeugt, verschwindet
auch aus dem Branch — dieselbe Zusage wie beim Kahlschlag davor, und damit
gilt der Abschnitt unten über alte Dateinamen unverändert. Ohne `--force`
kann ein zweiter Deploy dazwischenkommen; dann wird der neue Stand geholt und
derselbe Baum noch einmal daraufgesetzt (dreimal, dann scheitert der Schritt
lieber, als zu raten).

**Und das Artefakt trägt die Modelle nicht mehr mit.** Es ist zum Nachsehen da
und nicht zum Ausliefern; 60 MB bei jedem Push und jedem Pull Request hoch-
und wieder herunterzuladen kostet Minuten für etwas, das niemand ansieht — und
dieselben Dateien liegen unverändert im Repository.

**Und die Bündelei selbst?** Die bleibt, wie sie ist: `vite build` kopiert
`public/` nach `dist/`, und das sind ein paar Sekunden Plattenarbeit im
Container. Teuer war nie das Bauen, sondern das Hochladen.

## Wenn eine Seite aus einem Build läuft, den es nicht mehr gibt

Jede Welt wird erst beim Betreten nachgeladen — ein `import()` je Eintrag in
`worlds/index.ts`, also ein eigener Chunk je Welt, und jeder Chunk trägt den
Hash seines Inhalts im Dateinamen. Der Deploy ersetzt den Inhalt von
`gh-pages` vollständig; danach gibt es die alten Dateinamen nicht mehr.

Eine Seite, die vorher geöffnet wurde, läuft trotzdem weiter — und in einer
Brille bleibt eine Seite schnell einen halben Tag offen, während zwischendurch
dreimal deployt wurde. Nur greift dann jeder Wechsel in eine Welt, die in
**dieser Sitzung** noch nicht geladen war, ins Leere: Der Server antwortet mit
404, das `import()` scheitert, und man bleibt stehen, wo man ist. Welten, die
schon einmal geladen waren, wechseln weiter, denn ihr Modul liegt im Speicher
des Browsers. Daran erkennt man den Fehler, und er sieht überhaupt nicht nach
einem Deploy aus, sondern nach kaputtem Routing:

> „Ins Portal Labor komme ich immer zurück, aber aus einer bestimmten Welt
> komme ich manchmal in keine andere mehr rein.“

Heilen lässt sich das nur durch **Neuladen** — eine neue `index.html` bringt
die neuen Dateinamen mit. Genau das passiert jetzt von selbst: `App.goTo`
meldet einen gescheiterten Ladeversuch über den Haken `onWorldFailed` an die
Seite, `main.ts` fragt `core/staleBuild.ts` (mit Test), ob der Fehler _dieser_
Fehler war, schreibt die gewünschte Welt in die Adresse und lädt neu. Man
steht danach dort, wo man hinwollte, statt dort, wo man war.

**Höchstens einmal je Welt**, vermerkt im `sessionStorage`: Nach dem Neuladen
steht die Welt in der Adresse und wird sofort wieder geladen — scheitert sie
erneut (kein Netz, ein echter Fehler im Modul), lädt die Seite sonst wieder
neu, und der Spieler sieht nie etwas anderes als den Ladebildschirm. Gibt es
den `sessionStorage` nicht, wird lieber gar nicht neu geladen: Eine Seite in
einer Neulade-Schleife ist schlimmer als eine, die einmal eine Welt nicht
öffnet.

Dazu gehört eine zweite Bremse in `App.goTo` selbst: **Es ist immer nur die
letzte Ladung gültig.** Ein dynamischer Import dauert, und wer im Menü zweimal
hintereinander tippt, hat zwei davon unterwegs; ohne die Marke räumte die
zweite die Welt der ersten ab, während deren `init` noch mitten im Aufbauen
war. Heraus kam eine halbe Welt, in der nichts mehr ging — und der Weg dorthin
war ein doppelter Tipper.

## Was ein Deploy für den Service Worker bedeutet

Seit die Seite als App installierbar ist (`src/sw.ts`), liegt ein Teil von ihr
im Telefon und nicht nur auf `gh-pages`. Fünf Zusagen halten das zusammen, und
alle fünf ziehen in dieselbe Richtung wie der Abschnitt darüber:

- **Seiten kommen erst aus dem Netz.** Eine `index.html` aus dem Speicher wäre
  genau der alte Build, gegen den `core/staleBuild.ts` ankämpft — nur diesmal
  ohne 404, an dem man ihn merkt. Erst wenn das Netz nichts hat, antwortet der
  Speicher.
- **Jeder Build hat seinen eigenen Seitenspeicher**
  (`bgvr-shell-<BUILD_ID>`, in der CI die ersten zwölf Stellen von
  `GITHUB_SHA`). Der neue Service Worker löscht beim Aktivieren die Speicher
  aller anderen: Eine halbe alte Startseite kann nicht liegenbleiben. Darin
  liegen **nur die drei HTML-Seiten**, zusammen 58 kB.
- **Alles mit Hash im Namen liegt woanders und bleibt liegen**
  (`bgvr-assets`). Ein Name wie `three-vKFPiTY8.js` ist ein Versprechen über
  den Inhalt: Ändert sich der Inhalt, heißt die Datei anders. Also gibt es
  keinen Grund, sie nach einem Deploy noch einmal zu holen — und beim
  Aktivieren fliegt genau das hinaus, was in der Dateiliste dieses Builds
  nicht mehr steht (`core/swRoutes.ts`, `isStaleAsset`). Die alte Zusage „kein
  halber alter Build" hängt damit am Namen der **Datei** statt am Namen des
  **Speichers**, und das ist die schärfere der beiden Auskünfte.
- **Der Wechsel passiert beim nächsten Start**, nicht mitten in der Sitzung
  (kein `skipWaiting`). In der Zwischenzeit läuft die Seite aus dem alten
  Speicher weiter — was sie neu anfordert, hat ohnehin einen neuen Namen und
  kommt aus dem Netz.
- **Und die Prüfsumme an einem Modell ist ein Versprechen, keine Notiz.**
  Was `?v=<Prüfsumme>` trägt, holt der Service Worker nicht mehr nach, sondern
  beantwortet aus dem Speicher (`core/swRoutes.ts`, `isPinned`) — es kann sich
  unter dieser Adresse nichts geändert haben. Das spart einem späteren Start
  gemessene 28 Anfragen und 1,2 MB, und es hat einen Preis, den man kennen
  muss: **Wer eine Datei unter `public/` austauscht, ohne dass ein neuer Build
  entsteht, kommt an kein Telefon mehr heran.** Auf `gh-pages` gibt es diesen
  Fall nicht — jeder Deploy rechnet die Prüfsummen neu —, wohl aber beim
  Herumprobieren an einem von Hand hochgeladenen `dist`. Dort hilft nur, den
  Speicher zu leeren.

### Prüfsumme statt Build-Nummer — und warum das 9 MB wert war

Gemeldet wurde es so:

> „Ich will nicht nach jedem GitHub-Pages-Build nochmal 6 MB laden müssen,
> obwohl sich kaum eine Datei geändert hat. Was wird da denn so großartig neu
> geladen?"

Nachgemessen an zwei Builds desselben Quelltextes mit verschiedenem
`GITHUB_SHA` waren es **9,4 MB**, und sie kamen aus **zwei** Quellen, die
beide dieselbe Ursache hatten: An zu vielen Stellen stand die **Build-Nummer**,
und die ändert sich bei jedem Deploy — auch bei einem, der ein Komma in einem
Kommentar verschiebt.

1. **22 Chunks mit neuen Namen, 2,2 MB, ohne eine einzige geänderte Zeile.**
   Die Build-Nummer stand in `core/assetVersion.ts`, einem Modul von 175
   Bytes, das zehn Chunks importierten. Rollup rechnet den Hash eines Chunks
   **über die Namen seiner Importe** mit — also hieß nach jedem Deploy alles
   anders, was diese 175 Bytes nannte: der Hub, die Küche, das
   Gespenster-Raumschiff, three.js. Dazu warf der Service Worker beim
   Aktivieren den ganzen Hüllenspeicher weg, also kamen auch die **unverändert
   gebliebenen** Dateien noch einmal über die Leitung.
2. **4,0 MB Töne, Modelle und der Regal-Index.** Sie trugen `?v=<BUILD_ID>` in
   der Adresse, `dropOldMedia` warf nach jedem Deploy jede fremde Nummer
   hinaus, und die neue Seite holte dieselben Bytes unter der neuen Nummer
   zurück.

Abgestellt ist beides an der Wurzel, und die Wurzel ist **dieselbe**: Was an
einer Adresse oder in einem Modul steht, muss sich ändern, **wenn sich etwas
ändert**, und sonst nicht.

- **An `public/`-Adressen hängt die Prüfsumme des Inhalts** statt der
  Build-Nummer: acht Stellen aus SHA-256, gerechnet beim Bauen
  (`vite.config.ts`, `assetHashes`), nachgeschlagen zur Laufzeit
  (`core/assetVersion.ts`, `versioned`). Gleiche Datei, gleiche Adresse,
  gleicher Speichereintrag.
- **Die Build-Nummer steht in keinem Modul mehr**, sondern als `<meta>` in den
  drei HTML-Seiten (`core/buildId.ts`, `vite.config.ts`, `buildTagPlugin`) —
  in den einzigen Dateien also, die sich ohnehin bei jedem Deploy ändern und
  die der Service Worker erst aus dem Netz holt.
- **Gekaufte Bibliotheken bekommen ihren eigenen Chunk.** Rollup hatte
  three.js mit 49 eigenen Modulen in einer Datei von 741 kB
  zusammengelegt; jetzt liegt der Kern in `three-<hash>.js` und ändert sich
  nur, wenn `package-lock.json` sich ändert (`vite.config.ts`, `manualChunks`).
- **Und `dropOldMedia` fragt nicht mehr nach der Build-Nummer**, sondern ob
  das `v=` einer Adresse die Prüfsumme **dieser** Datei ist
  (`core/swRoutes.ts`, `isStaleMedia`). Dieselbe Rechnung wie `isPinned`, und
  mit Absicht: Weggeworfen werden soll genau das, was der Speicher hinterher
  nicht mehr beantworten würde.

Nachgemessen an denselben zwei Builds:

| Was | Größe | Vorher je Deploy | Jetzt |
| --- | ----: | ---------------- | ----- |
| **Chunks mit neuem Namen** (unveränderter Quelltext) | — | 22 Dateien, **2,2 MB** | **0 Dateien, 0 MB** |
| **Der Rest der Hülle** (`bgvr-assets`, 46 Dateien) | 5,4 MB | **weg** — der Hüllenspeicher hieß nach der Build-Nummer und wurde gelöscht | **bleibt** |
| **Töne und Modelle mit `?v=`** | 3,7 MB | **weg** — `dropOldMedia` warf jede fremde Nummer hinaus | **bleibt** |
| **Der Index des Regals** | 215 kB | **weg** — das Vorwärmen holte ihn unter einem `?v=`, das sonst niemand anfragte | **bleibt** |
| **Die drei HTML-Seiten** | 58 kB | neu | neu — sie tragen die Build-Nummer |
| **`offline.json`** | 15 kB | neu | neu — die Liste gibt es in jedem Build wirklich neu |
| **`sw.js`** | 3 kB | neu | neu — er geht nie über einen Speicher |
| **Controller-Modelle, Symbole, Manifest** | 5,1 MB | bleibt | bleibt |
| **Das Regal**: 4470 Modelle und 153 Texturen | 57,2 MB | bleibt | bleibt |

**Aus 9,4 MB sind 76 kB geworden**, und das ist der Fall „nichts am Quelltext
geändert". Ein Deploy mit einer echten Änderung kostet zusätzlich genau die
Chunks, deren Inhalt sich geändert hat — eine Zeile in einem Modul, das im
Einstiegs-Chunk landet, sind `main.js` (23 kB) und `App.js` (113 kB), weil die
Welten sich aus dem Einstiegs-Chunk bedienen. Auch das ist ein Fünfzehntel
dessen, was vorher jeder Deploy kostete.

**Und die Frage nach dem extra Branch für die Modelle** — „die Model-Assets
sollten ja nicht zusätzlich gebündelt werden, sondern liegen idealerweise auf
einem extra Branch oder so?" — beantwortet sich damit endgültig: Gebündelt
werden sie ohnehin nicht (`public/` wird kopiert, nicht importiert), auf
`gh-pages` liegen sie genau **einmal** und werden bei keinem Deploy neu
hochgeladen (siehe oben, _Veröffentlicht wird als Fortsetzung_), und im
Telefon liegen sie jetzt über Deploys hinweg still. Ein zweiter Branch würde
daran nichts verbessern, sondern nur einen zweiten Ort schaffen, an dem etwas
veralten kann.

## Und was ein Deploy für einen bedeutet, der alles heruntergeladen hat

Seit es auf der Startseite den Knopf **Alles herunterladen** gibt (die ganze
Mechanik steht in [Die Seite selbst](seite.md#alles-herunterladen-ein-knopf-ein-balken-eine-ehrliche-dauer)),
liegen auf manchen Geräten 71,5 MB in 4741 Dateien. Ein Deploy macht davon
einen Teil ungültig, und es lohnt sich, genau zu wissen, welchen — denn seit
dem Umbau auf Prüfsummen ist dieser Teil **winzig**:

| Was | Nach einem Deploy | Wie viel |
| --- | ----------------- | -------: |
| **Die drei HTML-Seiten** (`bgvr-shell-<build>`) | **weg** — sie tragen die Build-Nummer und kommen ohnehin erst aus dem Netz | 58 kB |
| **`offline.json` und `sw.js`** | **neu** — beide gibt es in jedem Build wirklich neu | 19 kB |
| **Die Chunks** (`bgvr-assets`): Hülle, Welten, three.js, die Physik-Engine | **bleiben**, bis auf die, deren Inhalt sich wirklich geändert hat | 5,4 MB |
| **Was `?v=` trägt**: Töne und die gebündelten Kataloge | **bleiben** — die Prüfsumme ihres Inhalts ist dieselbe | 3,7 MB |
| **Was keins trägt**: die Controller-Modelle, die Symbole, das Manifest | **bleiben** | 5,1 MB |
| **Das Regal**: 4470 Modelle, 153 Texturen und der Index | **bleiben** | 57,4 MB |

**Nachzuholen sind 76 kB** statt der 9,4 MB, die hier bis zum Umbau standen —
und das ist der Fall „am Quelltext hat sich nichts geändert", nachgemessen an
zwei Builds mit verschiedenem `GITHUB_SHA`. Kommt eine echte Änderung dazu,
kommen genau die Chunks dazu, deren Inhalt anders ist: eine Zeile in einem
Modul des Einstiegs-Chunks sind `main.js` und `App.js`, zusammen 136 kB.

Drei Dinge folgen daraus für den Betrieb:

- **Der Knopf sagt das von selbst.** Wer nach einem Deploy die Seite aufmacht
  und drückt, liest _Rest herunterladen (76 kB)_ und nicht die volle Zahl:
  Der Plan wird frisch gerechnet, der Speicher frisch ausgelesen, und was
  schon da ist, wird übersprungen. Es gibt keinen Zustand, in dem er 71 MB
  ein zweites Mal holen möchte.
- **Ungefragt passiert dabei gar nichts.** Der vollständige Download wird
  nicht automatisch erneuert — weder beim Start noch nach einem Deploy. Was
  von allein nachkommt, ist das Vorwärmen des nächsten Abschnitts, und das
  sind die Standardwelt und ein Index.
- **Und `offline.json` selbst trägt die Build-Nummer.** Die Liste entsteht in
  jedem Build neu (`vite.config.ts`, `offlineListPlugin`); mit `?v=` ist sie
  nach einem Deploy eine andere Datei, wird einmal geholt und liegt danach im
  Speicher — auch das ist der Grund, warum die Frage „ist alles da?" ohne Netz
  beantwortet werden kann. Sie ist zugleich die **einzige** Adresse, an der
  noch eine Build-Nummer hängt, und `isStaleMedia` wirft ihre Vorgängerin beim
  Aktivieren hinaus, weil zu ihr keine Prüfsumme im Verzeichnis steht.

## Der Start nach einem Deploy: was vorgewärmt wird

Seit die Seite fortschreitend startet, holt sie nach dem ersten Bild von sich
aus die Standardwelt nach — im Leerlauf, abbrechbar und nur, wenn die Leitung
es hergibt (`core/warmStart.ts`; die ganze Reihenfolge samt Zahlen steht in
[Die Seite selbst](seite.md#der-start-erst-die-hülle-dann-die-welt)). Für den
Betrieb sind daran zwei Dinge wichtig:

- **Ein Deploy kostet jedem laufenden Gerät fast nichts mehr.** Hier stand bis
  zum Umbau auf Prüfsummen das Gegenteil: „genau einen warmen Speicher" — die
  Adressen trugen eine neue Build-Nummer, der neue Service Worker warf die
  alten weg, und das Vorwärmen holte Welt, Physik-Engine, Modelle und Töne
  beim nächsten Start noch einmal. Jetzt heißen die Chunks gleich, solange ihr
  Inhalt gleich ist, und an den Modellen hängt die Prüfsumme ihres Inhalts:
  Gewärmt wird nur noch, was sich wirklich geändert hat.
- **Und der Index des Regals wurde dabei doppelt geholt.** `main.ts` wärmte
  ihn unter `?v=<BUILD_ID>` vor, `core/kaykitModel.ts` fragte ihn blank an —
  zwei Adressen für eine Datei, also 215 kB, die in einem Speicher lagen, den
  nie jemand befragte, und nach jedem Deploy noch einmal dieselben 215 kB.
  Beide fragen jetzt dieselbe blanke Adresse.
- **Das Vorwärmen läuft durch den Service Worker und nicht daran vorbei.**
  Angemeldet wird er auf `load`, gewärmt wird erst danach — sonst läge das
  Gewärmte im HTTP-Cache und wäre beim nächsten Start ohne Netz nicht da.

Wer den Service Worker beim Entwickeln vom Hals haben will, braucht nichts zu
tun: Er meldet sich nur im fertigen Build an (`core/pwa.ts`). Wer ihn
ausprobieren will, nimmt `npm run build && npm run preview` — und wer ihn
loswerden will, nachdem er ihn einmal hatte, wirft ihn in den
Entwicklerwerkzeugen unter _Application → Service Workers_ hinaus.
