# Das KayKit-Regal

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

## Warum ein Regal und kein zweiter Beutel

Der [magische Beutel](./spielfigur.md#was-aus-dem-beutel-kommt) ist eine Kiste
mit Spielzeug: achtzehn Sorten, jede von Hand gebaut, jede mit Name, Symbol,
Masse und Collider an einer Stelle (`worlds/portal/props.ts`). Das ist genau
richtig für achtzehn Dinge und unmöglich für viertausendfünfhundert.

Denn gekauft wurde die **ganze** KayKit-Sammlung: rund 23 Pakete, rund 4500
`.glb`-Dateien, vom Ritter über den Waldweg bis zum Sechseck-Kachelsatz. Wer
daraus achtzehnhundert Menüzeilen schreiben wollte, schriebe sie nie fertig —
und wer sie hätte, fände darin nichts. Eine Sammlung ist kein Sortiment: Man
sucht darin nicht nach einer Sorte, sondern **blättert** durch Ordner, so wie
man es auf jeder Festplatte tut.

Also ist das Regal das, wonach es aussieht: ein **Dateibrowser im Menü**.
Ordner zuerst, dann die Modelle; ein Ordner geht auf, wenn man ihn drückt; und
in jeder Kachel steht kein Symbol, sondern **das Ding selbst**, langsam
gedreht. Genommen wird wie im Beutel — zielen und greifen —, und was man nimmt,
liegt in der Hand.

## Was wo liegt

| Datei                          | Was darin steht |
| ------------------------------ | --------------- |
| `public/models/kaykit/`        | Die aufbereiteten Pakete, je Paket mit eigener `LICENSE.txt` und eigenem `textures/`-Ordner |
| `…/kaykit/index.json`          | Der erzeugte Verzeichnisbaum — geschrieben von `tools/kaykit-model.mjs` |
| `core/kaykitIndex.ts`          | **Rein**: Typen des Index, Adressen, Beschriftungen, und der Menübaum daraus (`kaykitMenu`) |
| `core/kaykitFit.ts`            | **Rein**: `KAYKIT_SCALE` als Vorgabe, `KAYKIT_PACK_SCALE` je Paket, `kaykitScale(pfad)` |
| `core/kaykitCrate.ts`          | **Rein**: unter welche Adresse ein Kistendeckel als Sockel gehört |
| `core/kaykitClips.ts`          | **Rein**: welches Skelett eine Figur hat, welche Dateien seine Bewegungen tragen, wie eine Spur im Feld heißt |
| `core/kaykitFigureFit.ts`      | **Rein**: der Gang zum Tempo (`gaitFor`), die Clipnamen je Gang und Aktion, die Knochennamen, der Maßstab auf eine erklärte Höhe, die Blickrichtung |
| `core/kaykitFigure.ts`         | Der Lader für **laufende Figuren**: `loadKaykitFigure(pfad, höhe)` — Skelett, Mischer, Gänge, Aktionen, Anker, Aufräumen |
| `ui/detailDrag.ts`             | **Rein**: wem ein Finger auf der großen Vorschau gehört — Mitte oder Saum —, und was ein Wisch, ein Kneifen und eine Raste daraus machen |
| `ui/PageDetail.ts`             | Die große Vorschau: eigener Renderer, Kamera um das Ding herum, Gitterboden, Hülle, Mischer |
| `core/kitchenShelf.ts`         | **Rein**: welche Adresse in der Küche ein **funktionierendes Möbel** ist |
| `ui/pageCols.ts`               | **Rein**: wie viele Spalten in ein Fenster passen, und die beiden Knöpfe |
| `worlds/portal/placeGrid.ts`   | Das Gitter unter dem Getragenen — eine Fläche und ein Rahmen je Kachel |
| `core/kaykitModel.ts`          | Der Lader: `loadKaykitIndex`, `kaykitModel`, `kaykitModelNow` |
| `core/screenCarry.ts`          | **Rein**: wo ein getragener Gegenstand am Schirm hängt — von oben und aus den Augen |
| `worlds/portal/props.ts`       | `ModelKind` (`model:<pfad>`) und `modelPropShape` — wie aus einem Modell ein Gegenstand wird |
| `worlds/portal/gridSnap.ts`    | **Rein**: Kachelmitte, Vierteldrehung, und ab wann ein Loslassen ein Wurf ist |
| `worlds/portal/screenHand.ts`  | Die Bildschirmhand mit ihrem zweiten Anker (`carry`) |
| `worlds/portal/PortalWorld.ts` | Der Menüeintrag `assets`, `conjureModel`, `screenCatch`/`updateScreenCarry`, die Modellfabrik |

**Die Dateien sind nicht die gekauften.** `tools/kaykit-model.mjs` baut jede
einzeln neu — verschweißt, entdoppelt, beschnitten, quantisiert
(`KHR_mesh_quantization`) und mit `EXT_meshopt_compression` gepackt; aus 154 MB
werden 51. Die Texturen liegen dabei **neben** den Modellen
(`<paket>/textures/`) und sind verlustfrei WebP, wo das kleiner ist. Was bleibt,
sind die Namen: Der Ordnerbaum ist die Adresse, und die Lizenz jedes Pakets
liegt unverändert darin. Wer eine Datei im Original sucht, sucht sie beim
Verkäufer und nicht hier.

Ein Browser kann kein Verzeichnis auflisten; er kann nur holen, was er beim
Namen kennt. Deshalb der Index: Ein Werkzeug schreibt den Baum einmal auf, und
die Seite liest diese eine Datei. Ihr Format ist ein **Vertrag** zwischen zwei
Programmen und steht in `core/kaykitIndex.ts`; was dort optional ist, darf
fehlen, und auf `size` verlässt sich nichts.

## Zwei Spalten in der Brille — und so viele, wie passen, am Schirm

Ein Raster im Menü hatte immer drei Spalten (`ui/UIPanel.ts`, `GRID_COLS`) —
für Strichzeichnungen ist das die richtige Zahl. Im Regal steht in der Kachel
aber das Modell, und bei drei Spalten ist es so klein, dass zwei ähnliche
Fässer gleich aussehen. Genau das soll es ja nicht.

Also kann eine Seite sagen, wie viele Spalten sie will: `MenuEntry.cols`
→ `PageOptions.cols` → die Kachelbreite. Das Regal nimmt **zwei**
(`core/kaykitIndex.SHELF_COLS`); alles andere bleibt bei drei, ohne dass
irgendwo etwas geändert werden musste.

**Am Schirm ist diese Zahl nur noch die Vorgabe**, und das war ein gemeldeter
Befund: „Auf Desktop sind 2 Columns sehr klein." Stimmt — zwei Kacheln auf
1600 Bildpunkten sind zwei Briefmarken mit sehr viel Luft daneben. Dort
rechnet die Seite deshalb selbst (`ui/pageCols.ts`, `fitColumns`): **eine
Spalte je 190 Bildpunkte**, abgerundet, höchstens zehn. 190, weil ein Telefon
genau das liefert — 390 Punkte, zwei Spalten —, und was dort lesbar ist, ist
es am Schreibtisch auch; es passt nur mehr davon nebeneinander. Ein Fenster
von 1600 Punkten bekommt damit acht.

**Und zwei Knöpfe daneben.** Über der Liste stehen `−` und `+` mit der Zahl
dazwischen (`.pmenu__cols`); ein Druck darauf ist eine **Entscheidung** und
bleibt: Sie steht danach im Speicher des Browsers (`readColumns`,
`writeColumns`), und ein anders breites Fenster ändert nichts mehr daran.
Solange niemand gedrückt hat, richtet sich das Raster nach dem Fenster — wer
das Telefon dreht oder das Fenster zieht, bekommt die passende Zahl, ohne
etwas einzustellen. An den Enden halten die Knöpfe an, statt umzuspringen: Ein
Knopf, der von zehn auf eins fällt, ist einer, den man nicht gedrückt halten
kann.

**In der Brille bleibt es bei zwei.** Dort ist das Panel so groß, wie es ist,
und eine Spaltenzahl, die man mit zwei Knöpfen nachstellt, wäre zwei Knöpfe zu
viel in einer Bedienfläche, die ohnehin schon mit einem Strahl bedient wird.

## Der Katalog nimmt den ganzen Schirm

`MenuEntry.full` ist ein Feld, das nur die Seite kennt: Sie legt das Blatt
dann über den ganzen Bildschirm, in der Breite **und** in der Höhe. Am Telefon
war es immer so breit; am Schreibtisch war es ein Kasten von 380 Punkten unter
dem Knopf oben links, und das war für ein Menü richtig und für einen Katalog
falsch.

Gewünscht war beides: „Zudem kann der Katalog auch gern mehr Breite von dem
Screen einnehmen. Ich hätte nichts dagegen, wenn dieser den gesamten Screen
breit ist, wie es beim Handy bereits ist." Und: „die Höhe des Katalogmenüs
kann meinetwegen auch gerne die gesamte Höhe des Bildschirm einnehmen, sodass
dann der Menü-Button verdeckt ist, wie auch Welt, Verbindung, Fullscreen VR."

Genau das tut es. Verdeckt wird dabei nichts zugebaut: Das Blatt liegt auf
`z-index: 20`, die Knöpfe darunter auf 5 — zugemacht wird es mit demselben
Kreuz wie vorher. Und es gilt **nur für die Seiten des Regals**: Wer im Menü
die Einstellungen aufschlägt, bekommt weiter den Kasten oben links. Ein
Katalog, in dem in jeder Kachel ein Modell steht, hat für Platz die beste
Verwendung; eine Liste mit vier Schaltern hat sie nicht.

## Drei Wege hinein: alles, Pakete, Kategorien

Die erste Seite des Regals ist eine **Frage** und keine Liste: _Alles
anschauen_, _Nach Paketen_, _Nach Kategorien_. Vorher standen die elf
Schubladen und die Kachel _Pakete_ nebeneinander, und das war eine Liste aus
zwei Sorten Dingen — man musste erst lesen, was davon eine Kategorie und was
ein Paket ist. Gewünscht war die Gabelung: „Ich will bei dem Katalog auswählen
können zu Beginn: Alles anschauen, Nach Packs, nach Kategorien und dann wird
das jeweilige Menü gezeigt."

- **Alles anschauen** — die ganze Sammlung als eine Liste, in der Reihenfolge
  des Baumes. In der Brille zerfällt sie in Fächer zu sechzig, am Schirm
  wächst sie beim Scrollen. Für „zeig mir einfach alles" der kürzeste Weg.
- **Nach Paketen** — der Ordnerbaum, wie er immer war (`kaykitPackMenu`).
  Er beantwortet „Was ist eigentlich in `mixed-bag`?".
- **Nach Kategorien** — die elf Schubladen. Sie beantworten „Ich will ein
  Bett".

Gebaut wird der Baum weiter **auf einmal** — er besteht aus Zeichenketten —,
aber nur noch **einmal je Index**: Die Welt hebt ihn auf (`PortalWorld.shelfMenu`).
Das Menü wird bei jeder Änderung neu gesetzt, und mit den drei Wegen hängen
über zehntausend Einträge daran; sie bei jedem Tastendruck neu zu bauen wäre
Arbeit für nichts.

## Schubladen: Figuren, Möbel, Natur — und sieben weitere

Der Ordnerbaum ist die Adresse und bleibt es. Als **Sortiment** taugt er
nicht: Wer ein Bett sucht, weiß nicht, dass es in `furniture-bits` liegt, und
wer eine Figur sucht, findet sie in sieben Paketen verteilt. Gewünscht war
deshalb eine zweite Ordnung: „Ich denke auch Kategorien wären sinnvoll für die
einzelnen Elemente wie z. B. Charaktere, Möbel, Items, etc."

Elf Schubladen stehen hinter _Nach Kategorien_
(`core/kaykitIndex.KAYKIT_CATEGORIES`): Figuren, Essen & Trinken, Möbel,
Natur, Gebäude & Bauteile, Waffen, Werkzeug, Kisten & Fässer, Spiel &
Freizeit, Deko — und **Alles Übrige**.

**Entschieden wird an Paket und Dateinamen**, nicht an einer Liste mit
viertausendfünfhundert Zeilen — die pflegt niemand. Ein Paket, das ganz einer
Schublade gehört (`packs`), entscheidet; sonst zählt ein **ganzes Wort** im
Dateinamen (`words`, also ist `boxer` keine Kiste). Die letzte Schublade hat
weder `packs` noch `words` und fängt alles auf; ohne sie fiele ein Modell aus
dem Regal, nur weil niemand ein Wort dafür aufgeschrieben hat.

**Eine Datei liegt in jeder Schublade, auf die sie passt** — und nicht in der
ersten davon. Das war einmal anders und war falsch: `crate_buns.glb` ist eine
Kiste **und** Essen, und wer Kisten durchsieht, will sie dort finden, auch
wenn Essen in der Tabelle weiter oben steht. Der Auftrag sagt es selbst:
„Jedes Modell soll mehrere Kategorien zugewiesen bekommen, sodass ich danach
suchen kann." Die Reihenfolge der Tabelle ist damit keine Entscheidung mehr,
sondern nur noch die Reihenfolge der Kacheln — und die erste passende bleibt
die _Haupt_kategorie (`kaykitCategoryOf`) für alles, was genau eine braucht.
Gerechnet wird das **einmal je Datei** beim Aufbau der flachen Liste
(`KaykitFileRef.cats`): Die Suche fragt sie bei jedem Buchstaben.

**Eine Datei steht damit an mehreren Stellen** — in _Alles_, in ihrem Paket
und in jeder ihrer Schubladen —, und das ist der Sinn der Sache. Ids müssen
deshalb nur **unter Geschwistern** eindeutig sein und nicht im ganzen Baum:
Der Weg durchs Menü merkt sich Seiten (`ui/menuNav.ts`), und eine Seite wird
immer bei ihren Geschwistern gesucht.

## Wo man war, wenn man wiederkommt — und der Weg zurück an den Anfang

Der Katalog ist tief: drei Wege hinein, darunter Pakete, Ordner, Fächer, und
ganz unten viertausendfünfhundert Kacheln. Zwei Dinge gehören deshalb dazu,
und sie sind Gegenstücke.

**Der Weg wird gemerkt.** Innerhalb einer Sitzung tat er das immer schon — der
Weg durchs Menü liegt einmal da und wird von beiden Handgelenken und von der
Seite gelesen (`ui/menuNav.ts`), und wie weit eine Seite geblättert war, steht
daneben. Jetzt überlebt der **Katalogweg** auch ein Neuladen
(`ui/menuRecall.ts`, `localStorage` unter `bgvr.katalog`): „Es soll sich auch
gemerkt werden, in welchem Ordner/Kategorie/Scroll-Bereich ich bin, wenn ich
das Menü erneut öffne."

Gemerkt wird **nur der Katalog** und nicht das ganze Menü: Eine Seite, die
nach dem Neuladen mitten in den Grafikeinstellungen aufgeht, wäre keine
Freundlichkeit, sondern ein Rätsel. Zwei Feinheiten hängen daran:

- Der Zettel wird nur beschrieben, **während man im Katalog steht**. Wer
  danebensteht, ändert ihn nicht.
- Der gemerkte Weg zeigt drei Ebenen tief in ein Regal, dessen Verzeichnis in
  diesem Augenblick erst geholt wird — bis dahin steht dort „Lädt …". Ein Weg,
  der dann gekürzt _und vergessen_ würde, wäre nach dem ersten Neuaufbau weg.
  Also hält `MenuNav` ihn als **Wunsch** fest, bis es seine Seiten wirklich
  gibt, und zeigt in der Zwischenzeit so viel davon, wie schon da ist.

**Und am Schirm fängt die gemerkte Stelle auch wirklich wieder dort an.** Eine
Seite wird mit sechzig Kacheln aufgeschlagen und wächst erst beim Scrollen;
wer das Regal bei Punkt 4000 zumachte, bekam eine Liste, die 900 Punkte hoch
war, und `scrollTop` landete am Ende. Jetzt legt die Seite so lange nach, bis
die gemerkte Stelle erreichbar ist (`ui/PageMenu.fill`).

**Der Weg zurück an den Anfang** ist das Gegenstück: `MenuEntry.home` markiert
die Seite, an der die Frage „wie willst du hineingehen?" steht. Darunter steht
im Kopf ein Knopf, der dorthin springt — „Über den Header gibt es beim Menü
auch die Möglichkeit von vorne durch den Katalog zu starten." Am Schirm ist es
das Haus neben dem Titel, in der Brille die Zeile _Von vorne_ neben _Zurück_.

In der Brille steht sie **nur auf Listenseiten fest**: Ein festgehaltener
Kopfbalken kostet im Raster eine ganze Kachelreihe, und aus vier Kacheln je
Seite zwei zu machen, wäre ein Katalog, durch den man in Zweierschritten
blättert. Im Raster fährt _Von vorne_ deshalb als erste Kachel mit.

## Und ein Suchfeld — aber nur am Schirm

„Ein Suchfeld wäre die richtige Antwort — nur will in einer Brille niemand
tippen." Der Satz stand hier, und er stimmt weiter; er stimmt nur nicht **am
Schirm**, wo eine Tastatur liegt. Gewünscht: „dass ich oben auch eine
Suchleiste habe, bei der ich einen Begriff eingeben kann und dann gefiltert
wird, was dazu alles gefunden wird."

`MenuEntry.find` ist deshalb ein Feld, das nur die Seite liest: Steht es da,
zeigt sie über der Liste ein Suchfeld, und was zurückkommt, steht statt ihrer
Liste da. Das Regal hängt es an **jede** seiner Seiten (`offerSearch`), und
gesucht wird immer über die **ganze** Sammlung: Wer drei Ebenen tief im
Waldpaket steht und `lantern` eintippt, will wissen, ob es überhaupt eine
gibt, und nicht, ob im Wald eine liegt.

Gesucht wird in einer flachen Liste, die einmal je Index gerechnet wird
(`kaykitFiles`, `PortalWorld.shelfFiles`): viertausendfünfhundert Zeichenketten
und kein einziges Modell. **Alle Wörter müssen vorkommen**, im Dateinamen oder
im Pfad — `dungeon barrel` ist damit ein Filter auf ein Paket.

**Und die Schubladen zählen mit.** `möbel` findet den Sessel, dessen Datei
nirgends `furniture` heißt, `furniture` findet ihn auch (die Id der Kategorie
zählt wie ihre Beschriftung), und `möbel holz` filtert innerhalb der
Schublade weiter. Genau dafür bekommt jede Datei mehrere Kategorien: „sodass
ich danach suchen kann". Umlaute werden dabei gefaltet (`möbel` → `mobel`) —
sonst zerfiele das Wort am Zerteiler in `m` und `bel`, und wer auf einem
englischen Pad tippt, schreibt es ohnehin ohne. Erst ab **drei Zeichen** darf
ein Wort eine Schublade meinen: Ein einzelnes `d` passt auf `decor` und damit
auf ein Zehntel der Sammlung, und ein Filter, der alles durchlässt, ist
keiner. `holz kiste` findet weiter nichts, weil die Sammlung englisch heißt
und keine Schublade so heißt. **Sortiert wird nach
Güte**: Wer mit dem Gesuchten anfängt, steht vor dem, der es enthält, der vor
dem, bei dem es nur im Ordnernamen steht — und ganz hinten der, bei dem nur
die Schublade passt. Sonst stünde bei `chair` die
Kachel `restaurant-bits/chair_A` hinter dreißig Dateien aus einem Ordner, der
zufällig `chairs` heißt. Mehr als `SEARCH_LIMIT` (200) Treffer gibt es nicht:
Wer nach `tree` sucht, bekommt im Wald über tausend, und die letzten
neunhundert sieht niemand an.

**Das Feld steht im Kopf und nicht in der Liste**, und das ist kein Zufall:
Die Liste wird bei jedem Neuzeichnen ausgetauscht (zweimal die Sekunde, siehe
`ui/PageMenu.ts`), und ein Eingabefeld darin hätte beim dritten Buchstaben den
Fokus verloren. **Und eine andere Seite fängt ohne Suchbegriff an** — ein Feld,
das beim Hineingehen stehen bliebe, filterte die neue Seite nach dem, was
jemand auf der alten gesucht hat, und niemand sähe, warum sie fast leer ist.

## Das Modell in der Kachel — und wie es auf dem Telefon dorthin kommt

Am Handgelenk zeichnet das Panel seine Vorschauen selbst (`ui/WristMenu.ts`):
eine Leinwand, ein Bild, fertig. Im Browserfenster ist das Menü dagegen DOM
(`ui/PageMenu.ts`, siehe [Die Seite selbst](./seite.md)), und ein Knopf im DOM
kann kein Fass drehen. Die Seite hält deshalb nur den **Platz** frei — ein
Quadrat je Kachel (`.pmenu__prev`) —, und wer zeichnen will, hängt sich als
Schicht ein (`ui/previewGrid.ts`, `PagePreviewLayer`). Im Spiel tut das
`ui/PagePreviews.ts`, im Test eine Attrappe aus zehn Zeilen; kommt niemand,
steht im Quadrat die Ikone, die dort ohnehin stünde.

Gezeichnet wird mit **einer** Leinwand für das ganze Raster und nicht mit einer
je Kachel: Ein Browser gibt eine Handvoll WebGL-Kontexte her, und ein Fach hat
sechzig Kacheln. Darauf steht eine Szene mit einer **orthografischen Kamera,
die in Bildpunkten rechnet** — links 0, rechts die Breite —, und jedes Modell
steht an der Stelle seiner Kachel, skaliert auf deren Kantenlänge. Das ist ein
einziger `render` je Bild statt eines Scherenschnitts je Kachel; dass ein
Modell in seinem Fach bleibt, ist deshalb keine Schere, sondern eine Rechnung
(`PREVIEW_FILL`, 0,68). Die Buchführung daneben — wer ist zu sehen, wer wird
wann wieder gefragt, wer gibt sein Modell her — liegt ohne three.js in
`ui/previewGrid.ts` und hat ihren eigenen Test.

### In der Kachel stand nur der Kopf — und warum

Gemeldet wurde es als Bild: Im Katalog standen unter _Characters_ vier
Kacheln — _Hiker_, _Hoarder_, _Knight_, _Lorekeeper_ —, und in jeder war nur
ein **Kopf** zu sehen, quer über die ganze Kachel. „Ich möchte die Charaktere
voll dargestellt sehen in dem Katalog."

Es war kein Zuschnitt, und es war auch nicht die Einpassung allein. Die
Ursache liegt zwei Stockwerke tiefer, und sie hängt an der Aufbereitung: Jede
Datei der Sammlung ist **quantisiert** (`tools/kaykit-model.mjs`,
`KHR_mesh_quantization`). Bei einem gewöhnlichen Netz steckt die Rückrechnung
dieser Quantisierung im Knoten darüber; bei einem **gehäuteten** geht das
nicht — dort steckt sie in den **Bind-Matrizen des Skeletts**.

Die Kachel schrieb das Netz aber ab, und zwar als gewöhnliches Netz:
`new THREE.Mesh(geometrie, material)` (`ui/menuMiniature.ts`). Damit war es
kein `SkinnedMesh` mehr, wurde ungehäutet gezeichnet — und zeigte die **rohen**
Eckpunkte, die je Körperteil auf einen Würfel von −1 bis 1 normiert sind.
Nachgemessen am Ritter: Kopf, Rumpf, Arme, Umhang, Helm lagen alle als Kästen
von rund 2,0 Kantenlänge übereinander im Ursprung. Der Kopf ist davon der
größte, also sah man den Kopf.

**Und die Einpassung log gleich mit.** `Box3.setFromObject` fragt einen
`SkinnedMesh` nach seiner **gehäuteten** Hülle und ein gewöhnliches `Mesh`
nach der rohen Geometrie. Gemessen wurden deshalb 2,00 × 2,00 × 1,87 um den
Ursprung statt der wirklichen Figur von 1,94 × 2,54 × 1,31, die mit den Füßen
auf null steht — eine Kachel, die einen Würfel einpasst, wo eine Figur steht.

Die Antwort ist kein Klon, sondern dasselbe Abschreiben, nur richtig: Aus
einem `SkinnedMesh` wird wieder ein `SkinnedMesh`, gebunden an **dasselbe**
Skelett wie die Vorlage (`bind` mit deren `bindMatrix`). Das kostet genauso
wenig wie vorher — ein paar Zeiger — und stimmt in beidem, im Bild wie in der
Hülle. Ein eigenes Skelett bräuchte nur, wer die Kopie anders bewegen will als
die Vorlage, und eine Kachel will das nicht; wer es doch will, findet den Weg
im Lader (`SkeletonUtils.clone`, siehe _Wer sich die Geometrie teilt_).

Zwei Kleinigkeiten hängen daran:

- **Die Hülle fürs Aussortieren geht aus** (`frustumCulled = false`). Sie wird
  aus der rohen Geometrie gerechnet, und die liegt bei einer quantisierten
  Figur ganz woanders als die Figur — eine Kachel, die je nach Blickwinkel leer
  bleibt, wäre der nächste Fehlerbericht.
- **Das Handgelenk rechnet jetzt mit.** `ui/WristMenu.ts` hatte eine eigene,
  wortgleiche Fassung dieser Rechnung; derselbe Fehler steckte darin, und er
  wäre in der Brille ein zweites Mal zu finden gewesen. Sie ist weg, das Panel
  ruft `menuMiniature`.

### Die Leinwand scrollt mit, und das war ein gemeldeter Fehler

„Beim Scrollen wackeln die 3D-Previews nach." — Sie taten es, und sie mussten
es tun. Die Leinwand lag zuerst **über** dem sichtbaren Ausschnitt, fest im
Rahmen, während die Liste darunter scrollte; jedes Bild las die Schleife die
Rechtecke der Kacheln (`getBoundingClientRect`) und setzte die Modelle dorthin.
Auf einem Standbild stimmt das immer, in Bewegung nie: **Gescrollt wird im
Compositor, gerechnet im Hauptstrang.** Zwischen dem Bild, in dem die Rechtecke
gelesen wurden, und dem Bild, das auf dem Schirm landet, ist der Inhalt schon
weiter — die Kachel steht an der neuen Stelle, ihr Modell noch an der alten.
Kein `scroll`-Ereignis behebt das: Das kommt aus demselben Hauptstrang, der
ohnehin zu spät ist, und beim Ausrollen unter dem Finger kommt es obendrein
zusammengefasst.

Nachgemessen wurde nicht in Bildern je Sekunde, sondern in **Bildpunkten und
innerhalb eines Bildes**: Ein Screencast liefert genau die Bilder, die der
Compositor zeigt, und in jedem davon stehen die Kachel und ihr Modell
nebeneinander. Vorher liefen die Modelle beim Scrollen bis zu **50 Bildpunkte**
hinter ihren Kacheln her, ein Drittel aller Bilder über zehn; nachher misst
dasselbe Verfahren höchstens **zehn** — und das ist der Rest, den es selbst
erzeugt, wenn zwischendurch Modelle kommen und gehen. In Ruhe lag der Messwert
beide Male bei null.

Also liegt die Leinwand jetzt **im** scrollenden Kasten: `.pmenu__stage`
scrollt, und sie ist dessen zweites Kind neben der Liste. Damit bewegt sie
dieselbe Hand wie die Kacheln, und nachlaufen kann nichts mehr — der Compositor
schiebt beides zusammen, ganz ohne JavaScript. Abgeschnitten wird am Rand des
Kastens statt am Rand der Leinwand, also mit demselben Schnitt, den auch die
Kachel bekommt.

**So hoch wie der Inhalt ist sie deshalb nicht.** Sechzig Kacheln in zwei
Spalten sind rund 6700 Bildpunkte, auf einem Telefon mit doppelter Punktdichte
also ein Zeichenpuffer von 13 400 Zeilen — mehr, als viele Geräte überhaupt
hergeben (oft ist bei 8192 oder gar 4096 Schluss), und jedes Bild würde eine
Fläche gelöscht, von der man ein Zehntel sieht. Die Leinwand ist deshalb ein
**Blatt**: der sichtbare Ausschnitt plus `PREVIEW_OVERSCAN` (vier Zehntel) an
jedem Ende, im Inhalt verankert und nur dann umgehängt, wenn der Ausschnitt
seinem Rand nahe kommt (`previewSheet`). Gemessen sind das 388 × 1051 Punkte
statt 388 × 6734. Der Rand ist der Puffer für das, was der Finger zwischen zwei
Bildern noch schafft; das Umhängen selbst sieht niemand, weil es in demselben
Bild geschieht, in dem die Modelle ihre neuen Plätze auf dem Blatt bekommen.

Zwei weitere Wege wurden verworfen, und beide aus demselben Grund: Sie lassen
die Leinwand stehen, wo sie war. **Zusätzlich beim `scroll`-Ereignis zeichnen**
ist billig, kommt aber aus dem zu späten Hauptstrang; **die Leinwand per
`transform` aus JavaScript nachführen** nimmt den Wert für die Verschiebung aus
derselben verspäteten Ablesung. `position: sticky` wäre sogar genau die alte
Bauweise — nur ohne den JavaScript-Anteil, der sie bisher überhaupt in die Nähe
der Kacheln brachte.

Was das Blatt **nicht** kann: Wer sehr schnell scrollt, sieht am einlaufenden
Rand für ein Bild eine Kachel ohne Modell. Das ist dieselbe Lücke, die eine
frisch sichtbare Kachel ohnehin hat, solange ihre Datei noch geholt wird — ein
leeres Quadrat, kein wackelndes Modell.

## Ein ⓘ in der Ecke jeder Kachel — und die Seite dahinter

Eine Kachel des Regals hatte bisher genau ein Ziel: Antippen **nimmt** das
Modell in die Hand. Das ist richtig für jemanden, der einrichtet, und zu wenig
für jemanden, der aussucht — man sieht ein Fass von 160 Punkten Kantenlänge
und weiß weder, wie groß es wirklich ist, noch, aus welchem Paket es kommt.
Gewünscht war deshalb ein zweites Ziel: „Jede Kachel hat zudem oben rechts
einen Button, um mehr anzuzeigen."

**Der Knopf nimmt nicht.** Das ist die ganze Zusage: Die Kachel behält ihr
Verhalten, und in ihrer oberen rechten Ecke sitzt ein kleiner runder Knopf,
der eine Seite tiefer führt. Ein Knopf **im** Knopf ist kein gültiges DOM,
also liegt er neben der Kachel und wird über sie gelegt (`.pmenu__card`) —
dieselbe Bauweise wie beim Pfeil einer Nimm-Zeile (`.pmenu__pair`), nur über
Eck statt nebeneinander. Er trägt dieselbe `data-more`-Kennung wie jener
Pfeil, also geht er auch denselben Weg durch die Bedienung
(`ui/PageMenu.onListClick`).

**Warum ⓘ und nicht ⤢.** Beide wären zu haben. Das Pfeilkreuz verspricht ein
**größeres Bild** — dieselbe Kachel, nur formatfüllend; hier kommt aber eine
ganze Seite mit Namen, Zahlen und Schaltern, und die ist kein Vollbild,
sondern eine Auskunft. Das ⓘ verspricht genau das. Gezeichnet ist es wie jedes
andere Zeichen im Kopf der Seite: ein einziger `<path>` in einem `viewBox`
von 24, ohne Füllung, mit `stroke-linecap: round` — der Punkt über dem Strich
ist ein Strich von einem Zehntel Punkt Länge, den die runde Kappe zu einem
Punkt macht. Ein zweiter Pfad wäre ein zweiter Pfad für einen Punkt.

**In der Brille gibt es ihn nicht.** Das Feld, an dem er hängt
(`MenuEntry.detail`), kennt nur die Seite; das Panel am Handgelenk liest es
nicht und zeigt deshalb weiter eine Kachel mit einem Ziel. Das ist Absicht und
keine Lücke: Die Seite dahinter lebt von Wischen, Kneifen und Scrollen, und
davon hat ein Strahl nichts. Wer in der Brille wissen will, wie groß ein Fass
ist, nimmt es in die Hand — das ist dort die bessere Antwort.

### Was die Seite zeigt

Von oben nach unten, und alles in **einem** scrollenden Kasten:

1. **Der Name** im Kopf, dazu der Pfeil _Zurück_, das Haus _Von vorne_ und das
   Kreuz _Schließen_ wie auf jeder anderen Seite des Katalogs. Sie nimmt auch
   denselben ganzen Schirm (`MenuEntry.full`) und hält dieselben Geräteränder
   frei (`ui/safeArea.ts`, `setSafeEdge`).
2. **Das Modell**, groß: ein eigener Renderer mit **perspektivischer** Kamera
   in Metern (`ui/PageDetail.ts`) und nicht das orthografische Raster von
   nebenan. Gedreht wird dabei die **Kamera** und nicht das Modell — sonst
   kippte der Gitterboden mit, und eine Hülle, die sich mitdreht, ist keine
   achsenparallele Hülle mehr.
3. **Die Schalter**: _Gitterboden_ legt ein Raster in Kachelschritten auf die
   Höhe des tiefsten Punktes (dieselbe Kachel wie überall, 1 m — man sieht
   damit, wie viele Kacheln das Ding belegen wird, siehe _Das Gitter unter dem
   Getragenen_); _Bounding Box_ zeigt genau die Hülle, aus der beim Hinstellen
   der Collider und die Masse werden (`props.modelPropShape`).
4. **Die Animation**, wenn es eine gibt — siehe unten.
5. **_Als Figur tragen_**, aber nur bei einer **Figur**
   (`ui/menu.MenuDetail.action`, `core/kaykitIndex.figureAction`): der eine
   Knopf dieser Seite, der etwas **tut** statt etwas zu zeigen. Er macht aus
   dem Ding, das man gerade vor sich hat, die eigene Spielfigur
   (`saveAppearance({ figure })`, siehe [Spielfigur](spielfigur.md),
   _Und eine vierte Zeile: die Figur_) — im Spiegel, im Kleiderschrank und für
   alle im Raum. Er steht hier und nicht nur im Kleiderschrank, weil der dort
   nur zwölf Ständer hat: Über diesen Weg ist **jede** der rund 85 Figuren der
   Sammlung wählbar, und man sieht sie vorher groß, mit Gitterboden, Hülle und
   der Bewegung, die man sich ausgesucht hat. Gezeigt wird er nach derselben
   Auskunft, nach der auch das Regal einsortiert (die Schublade _Figuren_,
   `kaykitCategoriesOf`) — es gibt keine zweite Liste, die morgen etwas
   anderes sagt. Ohne Wippe, dafür mit farbigem Rand: Er ist kein Zustand.
6. **Der Steckbrief**: Paket, Ordner, Datei, Dateigröße und Schubladen kommen
   aus dem Verzeichnis und stehen sofort da; Maße in **Metern**, Dreiecke und
   die Zahl der Bewegungen werden am geladenen Modell gemessen und
   nachgereicht (`DetailFacts`). Die Maße sind dabei die der **Welt**, also mit
   dem Maßstab des Pakets darin (siehe _Ein Maßstab je Paket_) — das ist die
   Zahl, für die jemand nachsieht.

### Die Mitte dreht, der Saum scrollt

Auf einem Telefon liegen über der Vorschau zwei Gesten übereinander: Wischen
dreht das Modell, Wischen scrollt die Seite. Ein Finger kann nur eine davon
meinen, und eine Vorschau, die die ganze Breite für sich nimmt, wäre eine
Seite, aus der man nicht mehr herunterscrollt. Genau davor hat der Auftrag
gewarnt: „seitlich sollte etwas Platz sein, da ich runterscrollen möchte."

Also gehört dem Modell nur die **Mitte**. Links und rechts bleibt je ein Saum
von 14 % der Breite (`ui/detailDrag.ts`, `DETAIL_GUTTER`), höchstens 90
Bildpunkte — auf einem Telefon von 390 Punkten sind das 55, breit genug für
einen Daumen; am Schreibtisch wären 14 % von 1400 Punkten eine Wüste, deshalb
die Deckelung. Entschieden wird das nicht in JavaScript, sondern im Stil: Über
der Mitte liegt ein Kasten mit `touch-action: none` (`.pmenu__grab`), der Rest
der Fläche trägt `pan-y`. Damit scrollt der Browser am Saum wie überall sonst,
ganz ohne dass der Hauptstrang gefragt würde — und die Zahl, mit der der
Kasten gesetzt wird, ist dieselbe, die auch `detailZone` rechnet.

Darauf liegen drei Gesten: **ein Finger** dreht (waagerecht eine ganze
Umdrehung über die Breite) und kippt (senkrecht, gedeckelt bei rund 83° — genau
über dem Modell fiele der Blick mit der Hochachse zusammen und die Ansicht
spränge um ihre eigene Achse); **zwei Finger** kneifen den Zoom, von halb bis
dreifach; das **Mausrad** tut dasselbe in Rasten, über dieselbe Umrechnung wie
der Zoom von oben (`core/wheelZoom.ts`). Wer mit zwei Fingern zieht, dreht
dabei nicht nebenher — ein Kneifen mit Schlenker ist kein Kneifen.

### Animationen: Die Figur bringt keine mit, ihr Skelett schon

„Bei Charakteren will ich die Animation auswählen können (Idle, Running, was
diese eben noch so anbieten)." Der Haken daran steht in den Dateien:
Nachgezählt über alle 4470 haben **78 ein Skelett, aber nur 14 eine
Animationsspur** — und diese vierzehn sind die **Bibliotheken** unter
`character-animations/animations/`, nicht die Figuren. KayKit liefert die
Bewegungen einmal je Skelett und die Figuren dazu.

Das ist kein Mangel, sondern der Entwurf, und er trägt: Alle Figuren der
Sammlung stehen auf denselben zwei Skeletten mit denselben 23 Knochen
(`root`, `hips`, `spine`, `upperarm.l`, …). Ein `AnimationMixer` bindet eine
Spur über den **Namen** des Knotens — eine Spur aus `Rig_Medium_General.glb`
passt deshalb auf jede Figur, ohne dass etwas umgerechnet werden müsste.

`core/kaykitClips.ts` ist die Tabelle dazu, und sie ist kurz:

- **Welches Skelett** — entschieden an der **Höhe** und nicht am Namen
  (`KAYKIT_LARGE_RIG`, 3,2 in den Maßen der Quelle). Am Namen ginge es nicht:
  `Barbarian_Large.glb` sagt es zwar, aber `Skeleton_Golem.glb` (4,23 hoch) und
  `FrostGolem.glb` (4,16) stehen ebenso auf dem großen Skelett, ohne es im
  Namen zu tragen. An der Höhe geht es mit großem Abstand — zwischen 2,6
  (Skelett-Krieger) und 3,98 (Mannequin_Large) liegt nichts.
- **Welche Dateien** — drei je Skelett und nicht alle acht: `General` bringt
  das Stehen, das Einstecken und das Sterben, `MovementBasic` das Gehen,
  Laufen und Springen, `CombatMelee` den Angriff. Das sind 936 kB für das
  mittlere Skelett und 676 kB für das große, geholt erst beim Aufschlagen
  einer Figur und danach im Speicher wie jedes andere Modell des Regals. Alle
  acht wären 2,8 MB für eine Vorschau. Die dritte Datei kam dazu, als die
  Figuren laufen lernten (siehe _Eine Figur, die läuft_): Ohne sie gibt es in
  der ganzen Sammlung keinen Schlag, und ein Monster, das nur herangeht, ist
  keines. Bezahlt hat es die Vorschau mit 380 bzw. 340 kB.

Die Namen stehen, wie der Zeichner sie schrieb, nur ohne Unterstriche
(`Idle_A` → „Idle A"); doppelte fallen weg (beide Bibliotheken bringen eine
`T-Pose` mit), und ganz oben steht **keine**. Abgespielt wird über einen
`AnimationMixer` auf dem Modell der Vorschau — und nur dort: Was man aus dem
Regal in die Hand nimmt, steht weiter still (siehe _Grenzen_).

### Aufgeräumt wird beim Verlassen

Eine Detailseite macht einen **zweiten** WebGL-Kontext auf, und davon gibt ein
Telefon eine Handvoll her. Also gilt hier dieselbe Disziplin wie überall in
diesem Menü, nur schärfer:

- **Nie zwei zugleich.** Sobald eine Detailseite aufgeht, hält die Schleife des
  Rasters an (`PageMenu.syncPreviews`) — und zwar *bevor* die große Leinwand
  gebaut wird. Beim Zurückgehen läuft sie wieder an.
- **Weg ist weg.** Beim Verlassen der Seite, beim Zumachen des Menüs und beim
  Wechsel der Vorschauschicht geht alles: Schleife, Zuhörer, Mischer, Gitter,
  Hülle, `renderer.dispose()` und `forceContextLoss()`.
- **Das Modell selbst nicht.** Seine Geometrie gehört der Vorlage im Speicher
  und allen anderen Kopien (siehe _Wer sich die Geometrie teilt_); weggeräumt
  wird nur der Rahmen darum.

## Geladen wird, was zu sehen ist — und nur das

Drei Stufen, und jede ist nötig:

1. **Der Index kommt beim Aufschlagen**, nicht beim Weltstart. Er ist ein paar
   hundert Kilobyte groß, und wer heute nur Portale schießt, soll sie nicht
   herunterladen. Dafür gibt es `MenuEntry.onOpen`: Beide Bedienflächen rufen
   es, bevor sie eine Ebene tiefer gehen (`ui/WristMenu.ts`, `ui/PageMenu.ts`).
   Bis der Index da ist, steht im Regal eine graue Zeile _Lädt …_; gibt es ihn
   nicht, steht dort _Kein Regal_. **Werfen darf dabei nichts** — ein Checkout
   ohne die gekauften Pakete ist ein normaler Zustand, kein Fehler.
2. **Modelle kommen je sichtbarer Kachel.** Auf einer Rasterseite mit zwei
   Spalten sind vier Kacheln zu sehen, also werden vier Dateien geholt — nicht
   1588, weil jemand den Waldordner aufgemacht hat. Gefragt wird nur, wofür
   `rowAnchor` eine Stelle hergibt.
3. **Und sie gehen wieder.** Was aus dem Bild scrollt, wird aus dem Panel
   entfernt; ein Ordner, den man verlässt, gibt seine Vorschauen her. Geteilt
   sind Geometrie und Material ohnehin mit der Vorlage im Speicher, hier fällt
   also nur der Rahmen weg — aber ohne diese Zeile wüchse das Panel mit jedem
   Ordner, den man je aufgemacht hat.

### Der Vertrag der Modellfabrik: `null` heißt „noch nicht"

Das Menü fragt die Welt nach dem kleinen Modell zu einer Id
(`MenuModelFactory`, gesetzt mit `WristMenus.setModelFactory`). Diese Frage
kommt aus einer Zeichenschleife und kann nicht warten — eine Datei, die erst
geholt wird, kann sie also nicht abwarten.

Deshalb gilt: **`null` ist keine Absage, sondern ein „später nochmal".**
`kaykitModelNow(path)` stößt das Laden an und gibt sofort `null` zurück; ist
die Datei da, gibt derselbe Aufruf das Modell. Das Menü merkt sich ein `null`
**nicht** — es fragt alle `PREVIEW_RETRY` (0,5 s) wieder, solange die Kachel zu
sehen ist. Ein zwischengespeichertes `null` wäre ein Fach, das für immer leer
bleibt.

PortalWorld setzt genau **eine** Fabrik für beide Regale
(`PortalWorld.menuModel`): Ids, die mit `kaykit:` anfangen, beantwortet der
Lader, alles andere ist eine Werkzeug-Id wie bisher. Die Vorschau-Id eines
Modells ist dabei seine Zeilen-Id — `kaykit:<pfad>`, mit dem Pfad ohne
`models/kaykit/` davor.

## Fächer in der Brille — und Nachladen beim Scrollen am Schirm

Der Waldordner hat rund 1588 Modelle, der Sechseck-Satz 404. In zwei Spalten
und zwei Zeilen je Seite wären das vierhundert Seiten Blättern; mit dem Stick
dauert das über eine Minute, und niemand kommt dort je an.

Also zerfällt ein Ordner mit mehr als `KAYKIT_CHUNK` (60) Dateien in **Fächer**
zu je sechzig, und die stehen als Kacheln davor: `1–60`, `61–120`, darunter
jeweils der erste und der letzte Name. Fünfzehn Seiten bis zum letzten Fach,
vier bis zur letzten Datei darin. **In der Brille ist das weiter die Antwort**:
Dort blättert ein Stick, dort tippt niemand, und die Fächer fallen aus dem Baum
heraus, ohne dass jemand eine Tastatur braucht.

**Am Schirm sind sie weg**, und das war ein gemeldeter Befund: „Ich denke diese
Gruppierung 1–60, 61–120 brauche ich nicht, dafür kann dann einfach Lazy
Loading die Elemente nachgeladen werden beim Scrollen." Dort wird gescrollt,
und ein Zwischenschritt „1–60" ist ein Klick, der nichts erklärt.

Gelöst ist das mit **einem Feld statt mit einem zweiten Baum**:
`MenuEntry.flatten` sagt „diese Zwischenseite darf übersprungen werden", und
die Seite hängt ihre Kinder an ihrer Stelle in die Liste (`ui/PageMenu.ts`,
`spread`). Wer das Feld nicht kennt — das Panel am Handgelenk —, sieht die
Fächer wie bisher. Ein zweiter Baum wäre die zweite Wahrheit gewesen, und
die Ids, an denen der Weg durchs Menü hängt, hätten auseinanderlaufen müssen.

**Und die Liste wächst beim Scrollen.** 1588 echte Knöpfe im DOM sind kein
Menü mehr, also stehen erst `PAGE_WINDOW` (60) davon da — dieselbe Zahl wie
die eines Fachs —, und sobald das Ende auf `GROW_EDGE` (600 Bildpunkte)
herankommt, kommen sechzig dazu. Die Blätterstellung bleibt dabei stehen: Nur
eine **andere** Liste fängt oben an, ein Nachschub hängt unten an. Unter der
Liste steht, wie weit man ist (`60 von 1668`) — ohne diese Zahl sähe ein
Ordner mit 1588 Modellen aus wie einer mit sechzig.

Nachgeladen wird beim `scroll`-Ereignis, und das ist hier gut genug: Es kommt
aus dem Hauptstrang und damit zu spät für eine Leinwand (siehe oben), aber
nicht zu spät für sechzig Knöpfe, die 600 Punkte vor dem Ende bestellt werden.
Dazu ein zweiter Weg (`fill`): Passt der erste Schwung gar nicht erst in den
Kasten — acht Spalten auf einem breiten Schirm sind sechzig Kacheln in acht
Zeilen —, kommt sofort nachgelegt, denn ein `scroll` kommt nie, wenn nichts zu
scrollen ist.

## Die Ids sind Adressen

Jeder Eintrag heißt `kaykit:<pfad>`, ein Fach `kaykit:<ordner>#<n>`, eine
Schublade `kaykit#cat:<id>` und der Ordnerbaum `kaykit#packs`. Das ist
kein Schmuck: Der Weg durchs Menü und die Blätterstellung jeder Seite werden
**nach Id** gemerkt (`ui/menuNav.ts`), von beiden Handgelenken und der Seite
gemeinsam. Derselbe Index ergibt deshalb zweimal denselben Baum, auch nach
einem neuen Build — wer drei Ebenen tief steht und das Menü an der anderen Hand
aufmacht, steht dort genauso.

Wenn der Index nachträglich eintrifft, wird der Weltmenü-Baum neu gebaut
(`WorldContext.refreshWorldMenu`). Der Weg überlebt das, weil er aus Ids
besteht und nicht aus Einträgen; wer gerade auf _Lädt …_ schaut, sieht im
nächsten Bild die Pakete.

## Was beim Nehmen passiert

In der **Brille**: zielen, Greifen oder `A` — das Modell wird geladen, bekommt
einen Körper und landet über `attach` in genau dieser Hand, an derselben
Stelle, an der jeder Griff dieser Welt endet. Das Panel geht dabei sofort zu:
Ein Menü, das nach dem Zugreifen noch stehen bleibt, fühlt sich an wie ein
Fehlgriff.

**Und es geht beim Hinstellen nicht wieder auf**, anders als der Beutel — das
war ein gemeldeter Fehler („wenn ich die platziere, soll sich das Menü nicht
platzieren"). Der Beutel ist eine Kiste, aus der man greift: Wer daraus etwas
holt, holt meistens noch etwas, also schlägt er seine eine Seite beim
Loslassen wieder auf. Das Regal ist ein **Katalog, mit dem man einrichtet**,
und zwischen zwei Stücken liegt ein Blick auf das, was man gerade hingestellt
hat — kein Panel vor der Nase. Aufgeschlagen wird es wieder von Hand, und dann
an derselben Stelle: Der Weg durchs Menü bleibt beim Zumachen stehen
(`ui/menuNav.ts`).

Dauert das Laden, sagt es das: `Lädt …` am Handgelenk. Kommt nichts an, steht
dort `… nicht geladen`, und sonst passiert nichts.

**Am Bildschirm und auf dem Telefon** liegt es ebenfalls in der Hand — seit
die **Bildschirmhand** (`worlds/portal/screenHand.ts`) nicht nur Werkzeuge
hält, sondern auch trägt. Hier stand einmal, das Modell entstehe 70 cm vor dem
Kopf und falle zu Boden, und genau das war der gemeldete Fehler: _„Wenn ich ein
Asset gewählt habe, hat der Spieler es in der Hand."_

Drei Stücke waren dafür nötig; die lange Fassung steht in
[Greifen](./greifen.md), _Und am Schirm trägt die Figur_:

- **Ein zweiter Anker an der Bildschirmhand** (`ScreenHand.carry`) — nicht der
  Griff, in dem die Pistole steckt. Wo er hängt, rechnet `core/screenCarry.ts`:
  von oben vor dem Bauch der Figur wie in der Küche
  (`core/chefFit.CHEF_CARRY`), aus den Augen vor der Kamera, beide Male um die
  eigene Größe des Dings vorgerückt — ein Baum muss weiter weg als ein
  Schlüssel.
- **Dieselbe Buchführung wie in der Brille**: `attach`, `carryGrab`, `release`,
  und der Körper ist dabei kinematisch und für den Spieler weich
  (`PhysicsWorld.setCarried`). Kein zweiter Weg, etwas in der Hand zu halten.
- **Der Benutzen-Knopf legt ab** — `A` auf dem Glas, `A` am Pad, `E` oder
  Enter. Solange getragen wird, gehört er dem Getragenen und springt nicht
  (`PlayerRig.useBusy`, dieselbe Regel wie beim Feuerlöscher der Küche), und
  _Halten oder Tippen_ gilt wie in der Brille (`core/handUse.ts`).

**Der Beutel geht denselben Weg mit.** Er hatte dasselbe Problem und war der
Grund, aus dem das Regal es geerbt hatte — jetzt fängt die Bildschirmhand beide
auf (`PortalWorld.screenCatch`).

## Was hingestellt wird, rastet auf dem Kachelgitter ein

Ein Modell aus dem Regal ist ein **Möbel**: ein Fass, ein Zaun, eine Truhe,
eine Wand. Die Möbel dieses Spiels stehen auf Kacheln und schauen in eine der
vier Himmelsrichtungen — die Küche tut es (`test/zones/kitchenPlan.Spot`), der
Editor tut es (`grid/gridTool.ts`), und der Konstrukt-Raum stellt seine Auswahl
aus demselben Grund in Vierteldrehungen hin. Wer aus dem Regal eine Reihe
Fässer hinstellt, will genau das: eine **Reihe** und keine Sammlung schräg
stehender Fässer, die sich um ein paar Zentimeter verfehlen.

Also rastet ein abgelegtes Modell ein (`worlds/portal/gridSnap.ts`,
`PortalWorld.snapPlaced`), und zwar in beidem:

- **Die Kachelmitte** in x und z. Dieselbe Kachel wie überall sonst
  (`nav/navTile.TILE`, 1 m), also decken sich Regal, Küche und Editor ohne eine
  zweite Zahl. Gerundet wird mit `Math.floor` und nicht mit `Math.round`:
  Gesucht ist die Kachel, auf der das Ding **steht**, und die reicht von ihrer
  Fuge bis zur nächsten. Sonst spränge ein Fass, das genau in der Kachelmitte
  steht, beim nächsten Ablegen eine Kachel weiter.
- **Die Vierteldrehung** um die Hochachse, und der Rest der Lage fällt weg: Ein
  Fass, das man schief in der Faust hielt, steht danach aufrecht. Nicken und
  Rollen zu behalten hieße, ein Möbel auf die Kante zu stellen, das man gerade
  hinstellen wollte.

**Die Höhe bleibt, wie sie ist**, und das ist Absicht: Wo der Boden unter einem
Punkt liegt, weiß hier niemand — es kann der Estrich sein, ein Tisch oder das
Dach eines Hauses. Also bleibt y stehen, Geschwindigkeit und Drall gehen auf
null, und den letzten Zentimeter macht die Schwerkraft. Ein Kasten, der ohne
Drall aufrecht auf eine ebene Fläche fällt, bleibt aufrecht stehen.

**Geworfen wird trotzdem noch.** Einrasten soll, was jemand *hinstellt* — wer
ein Fass durch den Raum wirft, meint etwas anderes, und ein Wurf, der mitten im
Flug auf eine Kachelmitte springt, sähe aus wie ein Fehler. Die Grenze ist
`PLACE_SPEED` (1,5 m/s), gemessen an derselben Zahl, die auch den Wurf antreibt
(`grab.velocity`). **Am Schirm** sagt es der Ablegen-Knopf ausdrücklich: Dort
ist ein Druck ein Hinstellen, auch wenn die Figur dabei gerade läuft.

**Nur das Regal, nicht der Beutel.** Der gibt Spielzeug her — Würfel rollen,
Murmeln kullern, Dominosteine stehen auf Lücke —, und ein Würfel, der beim
Loslassen auf eine Kachelmitte springt, wäre kein Würfel mehr. Entschieden wird
das an der **Sorte** (`props.modelPathOf`), also an derselben Zeichenkette, die
auch über das Netz reist.

## Das Gitter unter dem Getragenen

Einrasten ist eine Rechnung, die man bis eben erst **nach** dem Loslassen sah.
Gemeldet wurde genau das: „auch beim Platzieren der Gegenstände würde ich
gerne die Grid-Kachel/n gehighlighted sehen wollen, damit ich weiß wohin ich
das platzieren werde."

Also liegt jetzt ein Rechteck auf dem Boden, solange etwas getragen wird, das
einrastet (`worlds/portal/placeGrid.ts`, `PortalWorld.updatePlaceGrid`). Eine
Fläche **je Kachel** und nicht eine große: Ein zwei Kacheln breites Möbel soll
man als zwei Kacheln sehen, sonst weiß man nachher nicht, ob die Nachbarkachel
noch frei ist. Die Fugen dazwischen sind der ganze Sinn der Anzeige.

Gerechnet wird mit **derselben** Rechnung, die `snapPlaced` gleich ausführen
wird — dieselbe eingerastete Lage, dieselbe Hülle des Colliders
(`props.modelPropShape`), dieselben Kacheln. Zwei Rechnungen wären zwei
Antworten, und die zweite fiele erst auf, wenn das Fass neben dem leuchtenden
Feld landet. Nur Modelle aus dem Regal bekommen es, aus demselben Grund wie
beim Einrasten selbst: Ein Gitter unter einem Würfel verspräche etwas, das
nicht passiert.

### Eine Kachel zählt ab der Hälfte

`gridSnap.tilesCovered` nimmt eine Kachel, wenn **mindestens ihre Hälfte**
bedeckt ist, und diese Zahl ist der Unterschied zwischen einer Anzeige und
einem Ärgernis. Nachgemessen am Apfel aus `block-bits`: Er ist **1,025 m**
breit, steht mit seinem Ursprung auf der Kachelmitte und ragt damit 1,2 cm
über beide Fugen. Wer jede berührte Kachel zählt, leuchtet dafür **neun**
Kacheln an — ein Gitter, das dreimal so groß ist wie das Ding darüber,
beantwortet die Frage nicht mehr, für die es da ist. Mit der Hälfte als
Schwelle ist es eine.

**Die Hälfte zählt dabei mit**, und das ist die andere Seite derselben Regel:
Ein zwei Meter breites Möbel steht mit seinem Ursprung auf einer Kachelmitte
und liegt damit auf einer ganzen und zwei halben Kacheln. Alle drei leuchten —
es ragt wirklich dorthin, und ob daneben noch Platz ist, ist die Frage, für
die das Gitter da ist.

### Warum ein Rahmen und nicht nur eine Fläche

Die Fläche allein ist genau dann nicht zu sehen, wenn man sie braucht: Das
Getragene hängt vor der Figur, und von oben wie aus den Augen liegt die Kachel
**dahinter**. Ein Apfel von 1,02 m deckt seine eigene Kachel vollständig ab.

Über der Fläche liegt deshalb ein **Rahmen** von 8 cm, und der wird ohne
Tiefenprüfung gezeichnet (`depthTest: false`): Er liegt über allem, auch über
dem, was man trägt. Schmal genug, dass er das Modell nicht einfärbt, breit
genug, dass man ihn aus der Aufsicht erkennt. Die Fläche darunter bleibt
tiefengeprüft — sie ist das, was auf freiem Boden gut aussieht, und soll nicht
durch Wände scheinen.

### Und es liegt auf Fußhöhe

Das Einrasten kennt keinen Boden (siehe oben): Es setzt x, z und die Drehung,
die Höhe macht die Schwerkraft. Einen Boden zu suchen hieße, hier eine zweite
Antwort auf eine Frage zu geben, die das Einrasten bewusst offen lässt — und
die beiden liefen beim ersten Tisch auseinander. Also liegt das Gitter auf der
Höhe, auf der die **Figur** steht (`PlayerRig.getFloorY`). Wer auf einem Dach
steht, sieht es auf dem Dach.

## Die Kisten des Regals stehen auf einem Deckel

Eine Kiste aus `restaurant-bits` ist 0,40 m hoch, eine Arbeitsplatte 0,50 m.
In der Küche stand deshalb jede Kiste eine Handbreit unter der Zeile daneben —
eine Stufe, die niemand erklären kann, und zu tief zum Hineingreifen. Die
Antwort dort war ein **Kistendeckel als Sockel**
(`core/kitchenFit.CRATE_PLINTH`): derselbe Baukasten, dasselbe Holz, dieselbe
Kante, und oben schließt alles bündig ab.

Im Regal stand dieselbe Kiste weiterhin ohne Sockel, und genau das war der
Bruch beim Einrichten: Wer aus dem Regal eine Kiste neben eine Küchenzeile
stellte, bekam die Stufe zurück, die in der Küche gerade weggerechnet worden
war. Gemeldet als: „dass bei dem KayKit-Regal-Menü die Crates immer wie in der
Küche modifiziert sind."

Also gilt die Änderung jetzt für **jede** Kiste dieses Pakets — in der Kachel
des Menüs, in der Hand und auf dem Boden. `core/kaykitCrate.kaykitPlinth`
beantwortet für eine Adresse, ob ein zweites Netz darunter gehört, und der
Lader setzt beide zusammen (`kaykitModel.copyOf`): der Deckel mit seiner
Unterkante auf null, die Kiste auf dessen Oberkante. **Gemessen wird dabei am
geklonten Netz** und nicht am Katalog — der Deckel ist fremde Arbeit, und eine
abgeschriebene Höhe wäre die Zahl, die beim nächsten Paket-Update stehen
bleibt.

Erkannt wird an Paket und Dateinamen und nicht an einer Liste: Was in
`restaurant-bits` mit `crate` anfängt, ist eine Kiste. Der **Deckel selbst**
bekommt keinen — er *ist* der Sockel, und ein Deckel auf einem Deckel wäre ein
Brett von 0,20 m, das niemand bestellt hat. Und `kaykitModelNow` gibt eine
Kiste erst heraus, wenn **beide** Dateien da sind: Sie ohne Sockel zu zeigen
und im nächsten Bild zu verschieben wären zwei Bilder von derselben Kiste.

## Aus dem Regal wird in der Küche ein Möbel

Ein Modell aus dem Regal ist ein **Bild**: eine Hülle als Collider, eine
Masse, und damit ein Fass, durch das man nicht hindurchgeht. Ein Möbel der
Küche ist dagegen eine **Regel**: Eine Vorratskiste gibt Brötchen heraus, ein
Herd brät, ein Becken spült.

Der Unterschied war bis eben unsichtbar, denn **beide zeigen dasselbe Netz**:
Die Möbel der Küche stehen auf Netzen aus `restaurant-bits`
(`core/kitchenFit.KitchenPiece.base`), und dieselben Dateien liegen einzeln im
Regal. Wer die Brötchenkiste aus dem Regal nahm, bekam also die Kiste, die in
der Küche Brötchen ausgibt — nur eben als Fass. Gemeldet: „die platzierten
Elemente sollen dann auch funktionsfähig sein wenn ich z. B. Crate
Vorratskiste mit Brötchen hinstelle oder Herd, Waschbecken etc."

`core/kitchenShelf.ts` schließt die Lücke: dreizehn Zeilen, links eine
Adresse, rechts ein Möbel des Küchenkatalogs. Steht die Figur **in der Küche**
und nimmt eine davon, entsteht statt des Fasses das Stück, das auch im
Konstrukt-Raum im Regal stünde — mitsamt Station, Ablage und Uhr
(`KitchenZone.takeShelfPiece` → `takeFromCatalogue`). Es liegt dann in den
Händen wie jedes andere Möbel im Umbau und wird mit `A` hingestellt.

Den Weg dorthin öffnet ein Haken in der Welt: `PortalWorld.takeFurniture`
antwortet überall `nein`, und nur die Testwelt reicht die Frage an ihre Küche
weiter. **Draußen bleibt es ein Fass**, und das ist die richtige Antwort: Eine
Vorratskiste auf der Wiese hätte niemanden, dem sie etwas ausgeben könnte —
und sie käme obendrein sofort auf eine freie Kachel **der Küche** zurück,
sobald jemand `B` drückt.

**Warum eine Tabelle und keine Rechnung.** Aus dem Katalog der Küche ließe
sich die Zuordnung fast ableiten — jedes Möbel nennt den Knoten, auf dem es
steht. Fast: Vier Vorratskisten, die Tellerkiste und die Ausgabe stehen
**alle** auf `crate_lid`, und drei Möbel teilen sich `kitchencounter_straight_A`.
Eine Rechnung müsste raten; dreizehn Zeilen liest man. Der Test daneben hält
sie ehrlich: Jeder Name muss ein Möbel sein, das es wirklich gibt, und jede
Adresse eine Datei, die wirklich im Regal liegt.

## Aus einem Modell wird ein Gegenstand

Ein Ding aus dem Beutel ist eine **Sorte** (`PropKind`), aus der beide Seiten
einer Sitzung dasselbe bauen. Ein Modell aus dem Regal ist das auch — nur ist
seine Sorte der **Pfad**: `model:<pfad>` (`ModelKind`). Wer ihn hat, lädt
dieselbe Datei und bekommt dasselbe Fass.

Das ist die ganze Netzwerkänderung: Die `spawn`-Nachricht trägt weiter ein
einziges Feld `kind` (`worlds/portal/PortalSync.ts`), es steht nur etwas
anderes darin. Kein zweites Feld, kein zweites Protokoll — und der Duplizierer,
der Inspektor und das Anmalen bekommen es gratis mit, weil sie ohnehin nur die
Sorte lesen. Wer die Nachricht empfängt, lädt die Datei und stellt das Ding
dann hin; dass das einen Wimpernschlag dauert, sieht man höchstens daran, dass
es drüben eher umfällt.

**Form und Masse kommen aus der Bounding-Box** (`props.modelPropShape`): ein
Kasten als Collider und 150 kg je Kubikmeter, nachgerechnet am Beutel (der
Companion Cube wiegt 4 kg bei 32 cm, das sind 122 kg/m³). Eine konvexe Hülle
über ein paar tausend Ecken kostete bei jedem Herbeirufen spürbar Zeit, und ein
Fass, das sich anfühlt wie eine Kiste, ist immer noch besser als eines, durch
das man hindurchgreift. Das Modell wird dabei **in seine Mitte gerückt**, denn
der Collider sitzt im Ursprung des Körpers — und diese Dateien haben ihren
Ursprung meist unter den Füßen.

## Eine Figur, die läuft

Ein Fass aus dem Regal ist ein Netz: laden, hinstellen, fertig. Eine **Figur**
ist das nicht, und deshalb hat sie einen eigenen Lader
(`core/kaykitFigure.ts`, `loadKaykitFigure(pfad, höhe)`), der fünf Dinge tut,
die ein Fass nie braucht:

- **Ein Skelett, das wirklich ihres ist.** Die Kopie kommt aus
  `SkeletonUtils.clone` (siehe _Ein Maßstab je Paket_) — sonst hinge jede Figur
  an den Knochen der Vorlage und alle bewegten sich gleichzeitig.
- **Fremde Bewegungen.** Keine Figur bringt eine eigene mit; die Spuren liegen
  bei den beiden Skeletten (`core/kaykitClips.ts`) und binden über die
  **Namen** der Knochen.
- **Einen Mischer**, der je Bild weiterläuft, und ein Umschalten zwischen den
  Gängen, das überblendet statt springt.
- **Eine Drehung**, weil KayKit in die andere Richtung schaut als dieses Spiel.
- **Eine Höhe in Metern** statt eines Paketmaßstabs.

### Die Höhe ist die erklärte, nicht die gemessene

`loadKaykitFigure(pfad, 1.7)` liefert eine Figur, die **genau 1,70 m** hoch
ist, mit dem Ursprung zwischen den Füßen auf y=0 und dem Blick nach −Z. Die
Richtung ist Absicht und steht auch so im Code: Die Hülle einer Zone —
Collider, Trefferzone, Augenhöhe, Greifweite — ist eine feste Zahl, und die
Figur richtet sich danach. Umgekehrt hätte jede neue Figur eine andere Hülle,
und eine Übungspuppe von 1,68 m (Dummy) und ein Mannequin von 1,54 m wären
zwei verschiedene Gegner mit denselben Regeln.

Gerechnet wird das in `core/kaykitFigureFit.figureScale`: Der Paketmaßstab
(0,7 für alle Figurenpakete) bleibt, wo er ist, und darüber kommt ein
**zusätzlicher Faktor**. Die Quellhöhe dafür wird am geladenen Modell gemessen
— Box3, in der Bindepose, **vor** dem ersten Bild —, durch den Paketmaßstab
geteilt und an `kaykitRigOf` weitergereicht: An dieser einen Zahl hängt, ob die
Figur die Spuren des mittleren oder des großen Skeletts bekommt. Nachgemessen
im Browser (Quelle / daraus mit 0,7):

| Datei | Quelle | mit 0,7 | Skelett |
| ----- | ------ | ------- | ------- |
| `character-animations/mannequin-character/characters/Mannequin_Medium.glb` | 2,204 | 1,543 m | medium |
| `character-animations/mannequin-character/characters/Mannequin_Large.glb` | 3,981 | 2,787 m | large |
| `prototype-bits/character/Dummy.glb` | 2,396 | 1,677 m | medium |
| `mystery-monthly-4/12-june-2024-robot/characters/Robot_One.glb` | 2,175 | 1,522 m | medium |
| `mystery-monthly-4/12-june-2024-robot/characters/Robot_Two.glb` | 2,405 | 1,683 m | medium |

### Drei Gänge und drei Aktionen

`gait(tempo)` nimmt Meter je Sekunde und macht daraus Stehen, Gehen oder
Laufen (`gaitFor`); überblendet wird **nur beim Wechsel**, sonst liefe jedes
Bild ein neuer Clip an. Die Schwellen sind an den Tempi dieses Spiels gemessen:
unter 0,05 m/s steht die Figur (ein Bot am Ziel bekommt aus der Wegsuche
Millimeter, und die sollen ihn nicht zappeln lassen), ab 2,2 m/s rennt sie. Die
NPCs gehen mit 1,1 bis 1,8 m/s (`worlds/npc/npcKinds.ts`), die Bots der
Raumstation traben mit 3,56 und sprinten mit 4,94
(`worlds/haunting/mission.ts`) — die Schwelle liegt dazwischen.

`act('attack' | 'hit' | 'death')` spielt **einmal** und hält am Ende
(`clampWhenFinished`); danach nimmt die Figur den Gang wieder auf, den sie
inzwischen gemeint hat — außer beim Tod, denn wer tot ist, geht nicht mehr.
Welche Spur das ist, steht in `GAIT_CLIPS` und `FIGURE_ACTIONS`, und zwar als
**Liste bevorzugter Namen**: Die beiden Skelette können verschieden viel und
nennen dieselbe Bewegung verschieden — das mittlere hat `Walking_A`…`C`,
`Running_A`/`B` und `Melee_1H_Attack_Chop`, das große je eine Spur und
`Melee_1H_Slash`. `pickClip` nimmt den ersten Namen, den es gibt, und `null`
ist auch hier ein gültiger Ausgang: Eine Figur ohne Gehspur geht eben nicht,
statt zu stürzen.

Der Angriff kostete eine dritte Bibliothek je Skelett (`CombatMelee`, 380 bzw.
340 kB, siehe oben) — es ist die einzige in der ganzen Sammlung, in der
überhaupt jemand zuschlägt.

### Die Blickrichtung — nachgesehen, nicht angenommen

Alles mit einer Vorderseite schaut in diesem Spiel nach **−Z**: NpcBody,
Crewmate, Koch, Küchenmöbel. glTF schreibt das Gegenteil vor („the front of
the object faces +Z"), und KayKit hält sich daran — die Figur wird also um π um
die Hochachse gedreht (`FIGURE_FACING`, **eine** Konstante, damit es eine Zeile
bleibt, falls ein Paket es einmal anders macht).

Geraten ist das nicht: Ein Playwright-Bild vom `Mannequin_Medium.glb` mit der
Kamera bei +Z zeigt das Gesicht, dasselbe Bild von −Z den Rücken; und in der
Bindepose liegen die Zehen **vor** dem Fuß in +Z (`toes.l` bei z = +0,0675,
`foot.l` bei z = −0,013, bei allen sieben nachgemessenen Figuren gleich). Nach
der Drehung sieht die gehende Figur eine Kamera an, die bei −Z steht.

### Die Knochen heißen im Baum anders als in der Datei

`figure.bones` gibt die drei Anker heraus, an die etwas gehängt wird: rechte
Hand, linke Hand, Kopf. In der Datei heißen sie `handslot.r`, `handslot.l` und
`head` — im Szenenbaum `handslotr`, `handslotl`, `head`: Der `GLTFLoader`
schickt jeden Namen durch `PropertyBinding.sanitizeNodeName`, und der Punkt ist
dort reserviert, weil er in einem Spurnamen den Knoten von der Eigenschaft
trennt (`handslotr.quaternion`). `figureBoneName` macht dieselbe Umformung, und
der Test hält beide Schreibweisen gegeneinander.

**Und nicht jede Figur hat jeden Knochen.** `tools/kaykit-model.mjs` wirft beim
Aufbereiten weg, was nichts häutet, und `handslot` ist kein Gelenk der
Häutung: `Mannequin_Medium.glb` hat ihn **nicht**, `Dummy.glb`, die beiden
Roboter, der Ritter und der Skelett-Krieger haben ihn. Deshalb steht in
`FIGURE_BONES` hinter `handslot.r` noch `hand.r` — und deshalb wirft der Lader
beim Laden jede Spur weg, die auf einen Knochen zeigt, den diese Figur nicht
hat. Sonst stünde bei jeder Figur dieselbe Zeile in der Konsole, und eine
Konsole, in der immer dasselbe steht, liest niemand mehr.

### Kein Jest-Import — nur dynamisch hinter `canLoadModels()`

`core/kaykitFigure.ts` hängt über `core/kaykitModel.ts` an `GLTFLoader` und
`import.meta`, und beides bringt einen Jest-Lauf zum Stehen. Die Regel ist
dieselbe wie beim Küchenrechner (`worlds/test/zones/kitchenDesk.ts`,
`fillComputer`): **Erst fragen, dann laden.**

```ts
if (!canLoadModels()) return;
void import('../../../core/kaykitFigure').then(async (module) => {
  const figure = await module.loadKaykitFigure(path, 1.7);
  if (!figure) return; // Kein Regal, keine Figur — und die Zone läuft weiter.
  anchor.add(figure.root);
});
```

Gerechnet wird deshalb nebenan, in `core/kaykitFigureFit.ts` — ohne three.js,
und das ist die Datei mit dem Test. Er prüft die Namen **gegen die wirklichen
Dateien**: Der JSON-Teil einer `.glb` liegt unverpackt darin, auch wenn alles
andere `EXT_meshopt_compression` ist, und dort stehen `animations[].name` und
`nodes[].name`. Ein Clipname, der sich verschreibt, ist sonst eine Figur, die
stumm mit ausgestreckten Armen im Raum steht — und das sucht niemand in einer
Namensliste.

`dispose()` räumt Mischer und Gruppe ab und hält dabei an
`userData.sharedAssets` an (siehe _Wer sich die Geometrie teilt_): Geometrie
und Textur gehören der Vorlage im Speicher und allen anderen Kopien.

## Ein Maßstab je Paket — und warum die Ritter zu groß waren

`KAYKIT_SCALE` ist **0,5**, dieselbe Zahl wie bei der Wundertüte
(`core/mixedbagFit.ts`) und beim Diner (`core/dinerFit.ts`): Diese Werkstatt
baut in „Blender-Metern", in denen eine Kachel zwei sind. Nachgemessen an den
Dateien stimmt das für die Requisiten — `dungeon/barrel_large.glb` ist 1,80 ×
2,00 × 1,80 und wird zu einem Fass von 0,90 × 1,00 × 0,90 m, `dungeon/wall.glb`
zu einer Wand von 2,00 m, `furniture-bits/bed_double_A.glb` zu einem Doppelbett
von 1,55 × 1,50 m.

Für die **Figuren** stimmt es nicht, und der gemeldete Fehler („die Figuren
sind doppelt so groß") hatte zwei Ursachen, die sich addierten:

1. **Der Maßstab kam bei ihnen gar nicht an.** Eine Kopie mit
   `Object3D.clone` nimmt bei einem `SkinnedMesh` die **Knochen nicht mit** —
   sie zeigt weiter auf das Skelett der Vorlage, und weil der Vertex-Shader
   beim Häuten allein die Knochen fragt, blieb die Gruppe mit ihrem `0.5`
   wirkungslos. Ein Ritter stand mit seinen vollen 2,54 m im Raum, während das
   Fass daneben brav halbiert war. `core/kaykitModel.ts` kopiert Figuren
   deshalb mit `SkeletonUtils.clone` — 85 von 4470 Dateien haben ein Skelett,
   nur für die kostet es etwas.
2. **Und halbiert wären sie zu klein.** Alle Figuren der Sammlung stehen auf
   **zwei** Skeletten (`character-animations`): das mittlere ist 1,98 × 2,20 ×
   1,01, das große 5,64 × 3,98 × 1,40. Eine mittlere Figur ist damit rund 2,3
   hoch — halbiert 1,15 m, und das reicht einem Koch von 1,60 m
   (`core/chefFit.CHEF_HEIGHT`) bis zur Brust.

Also bekommen die **sieben Pakete mit Figuren** ihre eigene Zahl,
`KAYKIT_FIGURE_SCALE` = **0,7** (`core/kaykitFit.KAYKIT_PACK_SCALE`):
`adventurers`, `skeletons`, `character-animations`, `mystery-monthly-4`,
`mystery-monthly-5`, `mystery-monthly-6` und `prototype-bits`. Der Ritter steht
damit auf 1,78 m, das Mannequin auf 1,54 m, der Skelett-Krieger auf 1,81 m —
Menschen neben einer Spielfigur.

`prototype-bits` steht mit in der Liste, obwohl es „Bits" heißt: Es bringt
dieselbe Figur mit (`character/Dummy.glb`, 2,40 hoch), und seine Tür ist 2,80
hoch — halbiert 1,40 m, mit 0,7 dagegen 1,96 m. Durch die halbierte Tür käme
die Figur nicht, die im selben Paket liegt.

**Der Maßstab gehört dem Paket und nicht dem Modell**, und das ist die ganze
Pointe: Innerhalb eines Pakets ist alles in derselben Einheit gebaut. In
`adventurers` wächst mit dem Ritter auch sein Schwert (1,78 → 1,25 m) und seine
Munitionskiste (0,57 → 0,40 m) — und genau so soll es sein. Sieben Zeilen liest
man; viertausendfünfhundert nicht. Die Tests daneben halten die Tabelle
ehrlich: Jeder Schlüssel muss ein Paket sein, das im Index wirklich steht.

## Keine Build-Nummer an diesen Adressen

Alles andere unter `public/` trägt eine (`core/assetVersion.ts`, `versioned`),
damit ein geändertes Modell nach einem Deploy auch ankommt — siehe
[Modelle](./modelle.md), „Eine Build-Nummer an jeder Adresse". Für das Regal
wäre das falsch, und zwar zweifach:

- Diese Dateien **ändern sich nicht**. Sie sind gekauft und liegen fest; was
  sich ändert, ist höchstens ein neues Paket — und das hat einen neuen Namen.
- Eine Nummer ist für den Speicher ein **neuer Name**. Nach jedem Deploy wären
  alle je angesehenen Modelle wieder fremd. Bei hunderten kleiner Dateien ist
  das der Unterschied zwischen einem Regal, das aufgeht, und einem, das lädt.

Der Service Worker verträgt das von sich aus: Beim Aufräumen wirft er nur weg,
was eine **veraltete** Nummer trägt; was gar keine hat, bleibt liegen
(`core/swRoutes.ts`, `dropOldMedia`) — genau wie bei den Controller-Modellen.

**Und der Index trägt seit dem Befund „das Regal lädt ewig" auch keine.** Er
trug sie, weil er erzeugt ist und mit jedem neuen Paket wandert; das stimmt und
war trotzdem die falsche Antwort. An ihm hängt, ob das Regal überhaupt aufgeht
— bis er da ist, steht dort „Lädt …" (`PortalWorld.assetMenu`) —, und mit `?v=`
ist er nach jedem Deploy ein Name, auf den kein Speicher eine Antwort hat.
Gemeldet wurde es so: „lädt ewig lang bei schlechtem Internet, obwohl alle
Dateien lokal vorliegen", und genau das war es: 215 kB über eine schlechte
Leitung vor einem Regal, dessen 4470 Modelle längst im Gerät lagen. Ohne Nummer
antwortet der Service Worker sofort aus dem Speicher und sieht im Hintergrund
nach (`revalidate`); ein neues Paket steht dann spätestens beim nächsten Start
im Regal. Dieselbe Adresse nennt der vollständige Download, und **müssen** muss dabei
niemand mehr: Welche Datei aus `public/` eine Prüfsumme bekommt, entscheidet
seit dem Umbau auf Prüfsummen genau eine Stelle (`vite.config.ts`,
`isStamped`), und `models/kaykit/` steht nicht darin — Plan und Lader schlagen
dasselbe Verzeichnis nach und **können** nicht mehr auseinanderlaufen. Das
Vorwärmen der Startseite tat es vorher: Es holte den Index unter einem
`?v=<BUILD_ID>`, das sonst niemand anfragte
([Deployment](deployment.md#der-start-nach-einem-deploy-was-vorgewärmt-wird)).

## Wer sich die Geometrie teilt, gibt sie nicht frei

Jede Kopie eines Modells teilt sich die Geometrie mit der Vorlage im Speicher
und mit allen anderen Kopien; nur die **Materialien** bekommt jede für sich,
damit der Pinsel und der Greif-Schimmer nicht in alle Fässer zugleich
schreiben.

**Ein Skelett teilt sich dagegen nichts**, und das ist die Ausnahme:
`Object3D.clone` lässt eine kopierte Figur auf den Knochen der **Vorlage**
stehen, und dann bewegt und skaliert sich die Kopie gar nicht mehr (siehe
_Ein Maßstab je Paket_). Deshalb geht eine Datei mit `SkinnedMesh` durch
`SkeletonUtils.clone` und alles andere durch `clone(true)`.

Daraus folgt eine Regel, die man sonst erst in der Brille bemerkt:
`disposeTree` hört an einem Knoten mit `userData.sharedAssets` auf
(`worlds/shared/environment.ts`). Ohne sie nähme das Wegräumen **eines** Fasses
allen anderen den Puffer unter dem Netz weg — auch der Vorlage, aus der das
nächste gebaut würde —, und danach stünde dort ein Fass, das aus nichts
besteht. Das passiert beim Zurücksetzen der Welt, beim Weltwechsel und bei
jedem `removeProp`, also an drei Stellen, die niemand im Verdacht hätte.

## Grenzen

- **Der Speicher wächst mit dem Blättern.** Wer viele Ordner durchsieht, sammelt
  Vorlagen an; freigegeben wird keine, weil vielleicht noch ein Fass daran
  hängt. Das sind kleine Dateien, aber unbegrenzt ist es nicht.
- **Der Maßstab ist einer je Paket** und nicht einer für alle — siehe
  _Ein Maßstab je Paket_ weiter oben. Was darin **nicht** steckt: ein Maß je
  Modell. Ein Becher aus `furniture-bits` ist halbiert 26 cm hoch, und das ist
  er auch weiterhin — die Sammlung ist so gebaut, und eine Tabelle mit
  viertausendfünfhundert Ausnahmen pflegt niemand.
- **Was am Schirm einmal liegt, bleibt liegen.** In die Hand kommt ein Modell
  dort nur aus dem Regal (oder dem Beutel); ein **Aufheben** gibt es ohne
  Brille nicht — siehe [Greifen](./greifen.md), _Was am Schirm weiter fehlt_.
- **Die Figur trägt eines.** Wer am Schirm etwas Neues aus dem Regal holt,
  legt ab, was er hatte. Ein **Werkzeug** bleibt dabei in der Faust — es hängt
  an einer anderen Stelle der Figur (`chefFit.CHEF_TOOL`), und so hält es auch
  die Küche (`PlayerAvatar.carry`: „Pistole rechts, Brötchen links"). Nur wer
  das Werkzeug **wechselt**, legt das Getragene dabei ab.
- **In der Brille gibt es kein Suchfeld.** Dort führen Schubladen, Ordner und
  Fächer zum Ziel; wer den Namen weiß, blättert trotzdem. Am Schirm gibt es
  eines (siehe oben), und es sucht nur in **Dateinamen und Pfaden** — englisch,
  so wie die Sammlung heißt. `holz` findet nichts, `wood` schon.
- **Die Schubladen sind eine Schätzung.** Sie entscheiden an Paket und
  Dateinamen (siehe oben), und eine Datei, für die niemand ein Wort
  aufgeschrieben hat, liegt in _Alles Übrige_. Das ist kein Fehler, sondern der
  Preis dafür, dass niemand viertausendfünfhundert Zeilen pflegt — wer etwas
  vermisst, trägt ein Wort in `KAYKIT_CATEGORIES` nach.
- **Griff, Farbe, Ton kennt ein Modell nicht.** Es wird angefasst, wo die Hand
  es berührt (`PROP_GRIPS` hat keinen Eintrag dafür), und es klingt wie jedes
  andere Ding.
- **Das Einrasten kennt keinen Boden.** Es setzt x, z und die Drehung, die
  Höhe macht die Schwerkraft — wer ein Fass über einer Treppenstufe ablegt,
  bekommt ein Fass, das auf die Stufe fällt und dort liegt, und nicht eines,
  das auf ihre Oberkante gesetzt wird. **Das Gitter darunter ebenso wenig**: Es
  liegt auf der Höhe, auf der die Figur steht (siehe _Das Gitter unter dem
  Getragenen_).
- **Funktionierende Möbel gibt es nur in der Küche.** Dreizehn Adressen werden
  dort zu echten Küchenmöbeln (siehe _Aus dem Regal wird in der Küche ein
  Möbel_); überall sonst — und für alles andere aus der Sammlung — bleibt es
  bei Hülle und Masse. Ein Herd auf einer Wiese hat niemanden, für den er
  braten könnte.
- **Animationen bleiben liegen — außer in der Vorschau.** Was man aus dem Regal
  in die Hand nimmt, steht still; ein Gegenstand aus dem Beutel bewegt sich
  auch nicht von selbst. Abgespielt wird nur auf der **Detailseite** (siehe
  _Ein ⓘ in der Ecke jeder Kachel_), und dort auch nur, was in den beiden
  Grundbibliotheken des passenden Skeletts steht: Stehen, Gehen, Laufen,
  Springen, Treffer, Sterben. Nahkampf, Fernkampf, Werkzeuge und die
  Simulationen liegen daneben (`core/kaykitClips.KAYKIT_CLIP_FILES`) und
  wären 2,8 MB.
- **Den Steckbrief gibt es nur am Schirm.** In der Brille hat eine Kachel
  weiter ein Ziel: greifen. Das Feld, an dem der Knopf hängt
  (`MenuEntry.detail`), liest nur die Seite — eine Seite, die von Wischen,
  Kneifen und Scrollen lebt, hat für einen Strahl nichts zu bieten.
