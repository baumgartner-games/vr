# Konfig-Code

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

Alle diese Zahlen zusammen — Werkzeug-Posen, Handhaltungen, Anbauteile,
Waffenwerte, Drohne und Supermanhandschuh — passen in eine Zeile:

```
BG3AD8CBg4XPBcMBignAgnwAd8SAQEGFKsCwAwBBgEGRE-YAoQHZAzmAQMAAcACAG6MAbQBZHh4ZIwBeCCPYA
```

Das ist **kein Hash**: `tools/gearCodec.ts` schreibt die Zahlen nach einem
Schema, das beide Enden kennen (deshalb reisen keine Feldnamen, keine Klammern
und keine Anführungszeichen mit), `src/core/configCode.ts` komprimiert das
Ergebnis mit einem winzigen LZSS-Verfahren (Wörterbuch im Datenstrom, deshalb
ohne Bibliothek und ohne `CompressionStream`) und packt es in base64url mit
einer Prüfsumme hinten dran. Der Code eines einzelnen Werkzeugs ist deshalb
kurz genug für eine Tafel in der Brille, und der einer einzelnen
Handhaltung kurz genug zum Abtippen:

```
BG3AAEBBR4XMBcGMU0            # eine Werkzeugpose
BG3AAICP_ABY-AD3xLADPAuALiA   # eine gemessene Handhaltung
```

`decode(encode(x))` gibt exakt `x` zurück — der Jest-Test besteht darauf,
mitsamt Umlauten, leeren Objekten und einem verdrehten Zeichen, das abgelehnt
werden muss.

Ein Code trägt seit **Version 2** eine **Abschnittsmaske** vorneweg: sie sagt,
welche der sechs Sorten überhaupt darin stehen. Erst damit gibt es einen Code
für _ein_ Werkzeug — ohne sie trüge der des Pinsels zwangsläufig die
Pistolenwerte mit sich herum und würde sie beim Laden überschreiben. Was nicht
drinsteht, wird beim Laden auch nicht angefasst; innerhalb eines Abschnitts
wird eingemischt statt ersetzt.

**Version 3** ist die Fassung fürs Abtippen. Eine gemessene Handhaltung kostete
vorher 66 Zeichen und kostet jetzt 27, aus drei Gründen:

- Die **Versionsnummer steht im Prefix** (`BG3…`) statt im Payload. Ein Byte,
  also anderthalb Zeichen — bei der ganzen Ausrüstung Rauschen, bei einer Hand
  messbar. Nebenbei weiß ein Leser vor dem ersten Byte, wie er zu lesen hat.
- Vor jeder Pose steht **noch eine Maske**, eine Ebene tiefer: welche ihrer
  Zahlen überhaupt verstellt sind. Eine Handhaltung hat zwölf Werte, von denen
  eine Messung am Werkzeug genau sechs anfasst — die anderen sechs kosten
  jetzt ein Bit statt eines Bytes. Verglichen wird auf dem Raster, auf dem
  geschrieben wird, sonst stünde eine 0.0000001 aus einer Quaternion-Rechnung
  für immer im Code.
- `toolGearCode` nimmt eine **Hand** entgegen. Wer messen lässt, gibt die
  durch, an der gemessen wurde; die andere steht nicht mehr als
  Behauptung im Code und macht ihn nicht mehr doppelt so lang.

**Version 4** ist eine einzige Zahl: der **Schaden** der Waffe. Angehängt
allein hätte es nicht gereicht — hinter dem Waffenabschnitt stehen Drohne und
Handschuh, und ein Leser, der ein Feld erwartet, das ein alter Code nicht hat,
nimmt dafür das erste Byte des nächsten Abschnitts. Der Zoom durfte seinerzeit
angehängt werden, weil er am **Ende** des Payloads stand und ein leerer Leser
Nullen liefert; ein Feld in der Mitte kostet eine Nummer. Das ist der Preis
dafür, dass die Reihenfolge zählt, und er ist einmalig zu zahlen.

Codes der Fassungen 1 bis 3 werden weiter gelesen (`tools/gearCodec.ts`, mit
Test) — geschrieben wird nur noch 4.

## Der Kurzcode

Für den häufigsten Fall war auch Fassung 3 noch zu breit: eine Werkzeugpose
kostete **22 Zeichen** — genau so viele wie die sechs Zahlen im Klartext
(`4,-2.8,1.7,-44,26,-105`). Ein Code, der nicht kürzer ist als das, was er
ersetzt, ist keiner. Schuld war nie die Menge, sondern die **Verpackung**:
Abschnittsmaske, Feldmaske, Varints, ein Kompressions-Flag und zwei Byte
Prüfsumme sind zusammen mehr als die Nutzlast, wenn die Nutzlast sechs Zahlen
ist.

Deshalb gibt es daneben den **Kurzcode** (`tools/shortCode.ts`, mit Test), der
nur einen Fall kann — _ein_ Werkzeug an _einer_ Hand — und dafür nichts
mitschleppt:

```
BP <Platz:1> <Flags:1> <Nutzlast> <Summe:2>

BPKGSwKKT7nssF8            # ein Griff              15 Zeichen
BPNDLmS5tAj9BFkRQK7MQ3Qg   # Werkzeugpose + Griff   24 Zeichen
```

**Die Wertebereiche.** Ort −30,0…+30,0 cm in Zehntelschritten (601 Stufen je
Achse), Pitch und Roll 0…359° in ganzen Grad (360), **Yaw nur −90…+90°** (181).
0° und 360° sind derselbe Winkel, also wird nur 0…359 geführt. Und Yaw braucht
wirklich nur die halbe Runde: `eulerXYZ` bestimmt den mittleren Winkel mit
`Math.asin`, der _kann_ nicht darüber hinaus — mit 20 000 gleichverteilten
Drehungen nachgemessen, größter Wert 89,12°. Eine von Hand getippte Haltung mit
Yaw 120° geht trotzdem nicht verloren: sie wird vor dem Packen einmal durch das
Quaternion geschickt und kommt als dieselbe Drehung mit |yaw| ≤ 90 zurück.

**Das Packen.** Alles, was in einem Code steht, wird zu **einer** Ganzzahl zur
gemischten Basis — auch zwei Posen, die dann nicht einzeln aufgerundet werden.

**Wie lang das wird**, entscheidet das _Produkt_ der Stufen und nicht ihre
Summe. Das ist die Stelle, an der die naheliegende Rechnung dreimal
danebenlag — „360+360+360 = 1080, passt in zwei Zeichen" ist um sieben
Größenordnungen zu klein, und auch `601³ · 360 · 181 · 360` sind nicht 42,6
Billionen, sondern gut 5 Billiarden:

```
601³ · 360 · 181 · 360 = 5 092 218 055 137 600   ( = 52,18 bit )
59^8  =     146 830 437 604 321   zu wenig
59^9  =   8 662 995 818 654 939   reicht
```

Also **neun** Zeichen für eine Pose und **achtzehn** für zwei — nicht acht und
sechzehn. Gerechnet wird mit `BigInt`, weil zwei Posen zusammen über 2⁵³
liegen; ab dort zählt eine JavaScript-Zahl nicht mehr in Einsen. Die drei
Zahlen stehen als Test da, damit die Rechnung nicht ein viertes Mal verrutscht.

**Das Alphabet** hat 59 Zeichen statt 64: kein `0`/`O`, kein `1`/`I`/`l`. Ein
Code wird in einer Brille von einer Tafel abgelesen und mit einer Zeigehand
eingetippt — dort ist eine Null, die wie ein O aussieht, kein Schönheitsfehler,
sondern ein Fehlversuch. Alle 59 sind URL-sicher (`-` und `_` gehören zu den
_unreserved characters_ aus RFC 3986). Und es kostet nichts: 59⁹ liegt immer
noch über den 5,09·10¹⁵ Möglichkeiten, es bleibt bei neun Zeichen. Lesbarkeit
gratis.

Die **Prüfsumme** hat zwei Zeichen, weil eines nicht reichte: von 166
vertauschten Zeichen kamen vier durch, und ein Code, der in vier von hundert
Fällen still eine fremde Handhaltung einträgt, ist schlimmer als einer, der ein
Zeichen länger ist. Der Test probiert alle einzelnen Tippfehler und alle
Vertauschungen durch.

Was das bringt:

|                                | großer Code | Kurzcode |
| ------------------------------ | ----------- | -------- |
| eine Werkzeugpose              | 22          | **15**   |
| Werkzeug **und** Griff         | 66          | **24**   |
| eine Grundhaltung samt Fingern | 33          | **22**   |

Die Finger stehen nur drin, wenn sie **verstellt** sind: eine Messung fasst sie
nicht an, und was sich nicht geändert hat, gehört nicht in einen Code, den
jemand abtippt. Fehlen sie, kommen sie beim Lesen aus der gebauten Haltung
dieses Werkzeugs — nicht aus einer Null, sonst streckte ein Code, der nur den
Griff verschiebt, nebenbei alle fünf Finger.

Für die **ganze** Ausrüstung bleibt der große Code zuständig, und der ist nicht
zu lang, sondern voll: eine wirklich benutzte Konfiguration (vier eingemessene
Werkzeuge samt Griffen beider Hände) sind rund 170 Zeichen. Wer alle 24
Werkzeuge und alle 48 Griffe verstellt, hat siebzig Posen, und siebzig Posen
sind nun einmal siebzig Posen — da hilft keine Verpackung mehr.

`parseGearCode` nimmt beide Sorten entgegen; welche es ist, sagt das Präfix
(`BG3` oder `BP`). Der ganz kurzlebige Vorgänger `BGK…` wird **nicht** mehr
gelesen — er stand einen Nachmittag lang im Code, mit anderem Alphabet und
anderen Bereichen, und ein zweiter Leser dafür wäre mehr Ballast als Nutzen.

## Über die Leitung

**Ein Code reist als Chat-Zeile** (`NetSession.emit` auf dem Kanal `gear`), und
drüben wird er wie jeder andere gelesen, geprüft und eingetragen — inklusive
der Werkzeuge, die schon in einer Hand liegen (`applyStoredConfig`).
Verschickt wird die **Zeile** und nicht der Datensatz: dieselbe, die auch auf
einer Tafel steht, mit derselben Prüfsumme davor. Damit gibt es einen Weg
hinein statt zweier, die auseinanderlaufen können. Und das ist der Punkt, an
dem der Kurzcode sich auszahlt: ein Werkzeug sind 25 Zeichen, also ein Paket.
Die Knöpfe dazu standen an der Wand des Eingaberaums (_Werkzeug senden_,
_Alles senden_); der Weg ist geblieben, die Wand nicht.

In VR liegt der große Code unter _Einstellungen → Konfig-Code_: **Code anzeigen**
legt ihn gleich in die Zwischenablage (und in die Browser-Konsole), **Code
laden** nimmt ihn wieder entgegen — eingefügt oder Zeichen für Zeichen. Am
Rechner geht dasselbe auf der Kommandozeile:

```bash
npm run config -- decode BG3…        # zeigt die Einstellungen als JSON
npm run config -- encode config.json   # macht wieder einen Code daraus
npm run config -- mirror BG3… left   # linke Handhaltungen nach rechts
```

Damit ist „hier sind meine Einstellungen, mach das für die andere Hand auch"
eine Zeile statt vierzig Zahlen.

Der **Strahl** zum Gegenstand kommt erst, wenn das Ferngreifen wirklich
eingerastet ist, und sagt dann genau eine Sache: _daran kannst du jetzt
ziehen_. Beim bloßen Zielen läge er nur im Bild — dort leuchtet der Gegenstand,
und das reicht. Abschalten geht unter _Einstellungen → Greifen → Strahl beim
Ferngreifen_. Ferngreifen schaltet sich außerdem selbst ab, solange beide Hände
dicht beieinander sind und eine davon schon etwas hält — dann will man den
Gegenstand übergeben und nicht quer durch den Raum zielen.

## Live auf die Werkzeugseite

Eine **gemessene Handhaltung** ging über dieselbe Leitung, und zwar als
**mehr als der Code** (`tune/handShare.ts`, mit Test, ohne three.js). Geschickt
hat sie der Poseraum des Eingaberaums, empfangen die Werkzeugseite unter
_Verbinden_ — den Sender gibt es nicht mehr, der Empfänger und das Format
stehen weiter da, und deshalb steht hier auch weiter, wie es gedacht war.
Ein Zuschauer im Browser hat keinen Griff, keine
Zielkorrektur und keinen Speicher, gegen den er eine Haltung aus dem Griffraum
verrechnen könnte; er müsste die halbe Kette nachbauen, und stünde die Hand
dann ein Grad anders als in der Brille, wüsste niemand, welche der beiden
stimmt. Also gehen **beide** Formen hinaus und keine wird nachgerechnet:

- `at`, `curls` und `spread` sind das **Bild**: wo die Hand am Werkzeug liegt,
  in dessen eigenem Raum, so wie sie gerade gezeichnet wird. Drüben wird das
  Werkzeug gebaut, die Hand hineingehängt, fertig.
- `joints` sind **die zwanzig Winkel**, wenn drüben eine blanke Hand gemessen
  wird: gespreizte Finger, an jedem Gelenk einzeln geknickt. Sie gehen nur mit,
  wenn es sie gibt — zwanzig Nullen hießen „flach ausgestreckt" und nicht
  „nicht gemessen" —, und ein Zuschauer, der sie nicht auswertet, zeigt weiter
  dieselbe Hand aus den Krümmungen.
- `code` ist der **Zettel**: dieselbe Zeile, die auf der Tafel steht. Sie wird
  drüben nicht gelesen, sondern kopiert.

Zwanzigmal je Sekunde, auf dem Kanal `hpose` — derselbe Weg, den auch Portale
und Gegenstände nehmen (`NetSession.emit`). Das Bild, das der Trigger festhält,
trug `saved` und ging sofort hinaus, ohne auf den nächsten Takt zu warten.
