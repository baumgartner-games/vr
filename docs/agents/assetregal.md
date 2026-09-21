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

## Zwei Spalten, und warum nicht drei

Ein Raster im Menü hatte immer drei Spalten (`ui/UIPanel.ts`, `GRID_COLS`) —
für Strichzeichnungen ist das die richtige Zahl. Im Regal steht in der Kachel
aber das Modell, und bei drei Spalten ist es so klein, dass zwei ähnliche
Fässer gleich aussehen. Genau das soll es ja nicht.

Also kann eine Seite jetzt sagen, wie viele Spalten sie will: `MenuEntry.cols`
→ `PageOptions.cols` → die Kachelbreite. Das Regal nimmt **zwei**; alles
andere bleibt bei drei, ohne dass irgendwo etwas geändert werden musste. Auf
einem Telefon ist mehr als zwei ohnehin nicht lesbar — dieselbe Zahl gilt
deshalb auch für die Seite (`ui/PageMenu.ts` setzt sie als CSS-Variable
`--pmenu-cols` ans Raster).

Dazu kam die zweite Hälfte: **Eine Kachel hat jetzt einen Anker.**
`UIPanel.rowAnchor` gab für jede Rasterseite `null` zurück, und damit stand vor
einer Kachel nie ein Modell. Jetzt liefert er die Mitte des oberen Quadrats —
dort, wo sonst die Ikone steht —, und die Ikone bleibt bei einem Eintrag mit
`preview` weg: zwei Bilder übereinander wären nur Unruhe.

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

## Fächer: was ein Ordner mit 1588 Dateien tut

Der Waldordner hat rund 1588 Modelle, der Sechseck-Satz 404. In zwei Spalten
und zwei Zeilen je Seite wären das vierhundert Seiten Blättern; mit dem Stick
dauert das über eine Minute, und niemand kommt dort je an. Ein Suchfeld wäre
die richtige Antwort — nur will in einer Brille niemand tippen.

Also zerfällt ein Ordner mit mehr als `KAYKIT_CHUNK` (60) Dateien in **Fächer**
zu je sechzig, und die stehen als Kacheln davor: `1–60`, `61–120`, darunter
jeweils der erste und der letzte Name. Fünfzehn Seiten bis zum letzten Fach,
vier bis zur letzten Datei darin. Das ist die billigste Form eines Suchfelds,
die es gibt, und sie fällt aus dem Baum heraus, ohne dass jemand eine Tastatur
braucht. Nebenbei rettet sie die Seite im Browser: Die zeichnet jede Zeile
ihrer Seite als echten Knopf ins DOM, und 1588 Knöpfe auf einmal sind kein
Menü mehr.

## Die Ids sind Adressen

Jeder Eintrag heißt `kaykit:<pfad>`, ein Fach `kaykit:<ordner>#<n>`. Das ist
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
Der **Index** trägt seine Nummer dagegen, denn er ist erzeugt.

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
- **Kein Suchfeld.** Gefunden wird über Ordner und Fächer; wer den Namen weiß,
  muss trotzdem blättern.
- **Griff, Farbe, Ton kennt ein Modell nicht.** Es wird angefasst, wo die Hand
  es berührt (`PROP_GRIPS` hat keinen Eintrag dafür), und es klingt wie jedes
  andere Ding.
- **Das Einrasten kennt keinen Boden.** Es setzt x, z und die Drehung, die
  Höhe macht die Schwerkraft — wer ein Fass über einer Treppenstufe ablegt,
  bekommt ein Fass, das auf die Stufe fällt und dort liegt, und nicht eines,
  das auf ihre Oberkante gesetzt wird.
- **Animationen bleiben liegen.** Was die Sammlung an Bewegung mitbringt, wird
  geladen und nicht abgespielt — ein Gegenstand aus dem Beutel bewegt sich auch
  nicht von selbst.
