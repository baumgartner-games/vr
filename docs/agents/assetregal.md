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

| Datei                    | Was darin steht                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `public/models/kaykit/`  | Die gekauften Pakete, unverändert, je Paket mit eigener `LICENSE.txt`                               |
| `…/kaykit/index.json`    | Der erzeugte Verzeichnisbaum — geschrieben von `tools/kaykit-model.mjs`                             |
| `core/kaykitIndex.ts`    | **Rein**: Typen des Index, Adressen, Beschriftungen, und der Menübaum daraus (`kaykitMenu`)          |
| `core/kaykitFit.ts`      | **Rein**: `KAYKIT_SCALE`, der Maßstab — dieselbe Zahl wie bei der Wundertüte                         |
| `core/kaykitModel.ts`    | Der Lader: `loadKaykitIndex`, `kaykitModel`, `kaykitModelNow`                                        |
| `worlds/portal/props.ts` | `ModelKind` (`model:<pfad>`) und `modelPropShape` — wie aus einem Modell ein Gegenstand wird          |
| `worlds/portal/PortalWorld.ts` | Der Menüeintrag `assets`, `conjureModel`, und die Modellfabrik fürs Menü                       |

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
Stelle, an der jeder Griff dieser Welt endet. Das Panel geht dabei sofort zu
(ein Menü, das nach dem Zugreifen noch stehen bleibt, fühlt sich an wie ein
Fehlgriff) und beim Loslassen wieder auf — **im selben Ordner**, denn der Weg
bleibt beim Zumachen stehen. Der Beutel macht es genauso, nur schlägt er seine
eine Seite wieder auf.

Dauert das Laden, sagt es das: `Lädt …` am Handgelenk. Kommt nichts an, steht
dort `… nicht geladen`, und sonst passiert nichts.

**Am Bildschirm und auf dem Telefon** entsteht das Modell 70 cm vor dem Kopf
und fällt zu Boden. Das ist keine Nachlässigkeit, sondern derselbe Weg, den der
Beutel dort schon immer geht: Die Greifzüge dieser Welt laufen über getrackte
Controller (`PortalWorld.updateGrabs` geht `ctx.input.controllers` durch). Die
Bildschirmhand (`worlds/portal/screenHand.ts`) ist ein `ControllerState` ohne
Controller und hält **Werkzeuge**, aber sie steht in dieser Schleife nicht
drin — was man ihr anhinge, bliebe kinematisch in der Luft stehen, statt der
Hand zu folgen, und würde nie wieder losgelassen. Ein Gegenstand in der flachen
Hand ist deshalb kein Nebenbei, sondern eine eigene Aufgabe: Sie hieße, die
Bildschirmhand in `updateGrabs` mitlaufen zu lassen, samt Greifen und
Loslassen über `A`/`E`.

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
- **Der Maßstab ist einer für alle** (`KAYKIT_SCALE`, 0,5 — dieselbe Zahl wie
  bei der Wundertüte). Für Requisiten stimmt das; die **Figuren** der Sammlung
  sind in der Quelle deutlich größer gebaut und stehen danach immer noch über
  zwei Meter hoch im Raum. Wer das ändert, ändert es für alle oder gar nicht:
  Eine Tabelle mit viertausendfünfhundert Ausnahmen pflegt niemand.
- **Kein Suchfeld.** Gefunden wird über Ordner und Fächer; wer den Namen weiß,
  muss trotzdem blättern.
- **Griff, Farbe, Ton kennt ein Modell nicht.** Es wird angefasst, wo die Hand
  es berührt (`PROP_GRIPS` hat keinen Eintrag dafür), und es klingt wie jedes
  andere Ding.
- **Animationen bleiben liegen.** Was die Sammlung an Bewegung mitbringt, wird
  geladen und nicht abgespielt — ein Gegenstand aus dem Beutel bewegt sich auch
  nicht von selbst.
