# Spielfigur, Karte und Beutel

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

## Wie man aussieht

_Menü → Aussehen_ und der **Kleiderschrank** — drei Zeilen, und dahinter die
ganze Figur (`core/AvatarBody.ts`, `core/avatarLook.ts`, `core/appearance.ts`,
`core/headgear.ts`).

**Die Figur ist ein Koch**, und seit dem dritten Anlauf ist sie ein
**Modell** statt gebauter Geometrie: „Little Chef (Overcooked like)" von
marcelosants, CC-BY-4.0 (`public/models/CREDITS.md`). Das Vorbild sind die
Köche aus _Overcooked_, und der Grund für die ganze Mühe ist die Kamera: Hier
schaut man aus **16 m** schräg von oben unter 55° auf Figuren
(`core/topDownPose.ts`).

**Warum überhaupt ein Modell**, wo doch sonst alles hier aus Grundkörpern
entsteht: Zwei Anläufe lang wurde die Figur aus Kugeln und Drehformen gebaut,
und zwei Anläufe lang fehlten die letzten zwanzig Prozent Ähnlichkeit. Ein
Modellierer, der weiß, was er tut, macht in einer Stunde, wofür `BARREL`-Kurven
einen Tag brauchen und dann nach Kegel aussehen. Die Regel „dieses Projekt lädt
keine Modelldateien" gilt weiter für **Welt und Werkzeug** — dort ist sie
richtig, weil eine Wand aus zwei Quadern in derselben Sekunde dasteht wie der
Rest. Für **Figuren und Möbel** gilt sie nicht mehr.

**Die gebaute Figur ist trotzdem noch da** (`core/avatarLook.ts`), und nicht
aus Nostalgie: Das Modell kommt über das Netz und ist erst ein paar Bilder
später da; ohne Netz kommt es nie, und in Jest gibt es kein WebGL. Bis dahin —
und notfalls für immer — steht die gebaute Figur. Niemand soll vor einem
unsichtbaren Mitspieler stehen, weil eine Datei fehlt. Dasselbe Muster wie bei
den Controllern (`core/ControllerModels.ts`).

**Die Figur ist 1,6 m hoch, und ihre Augen liegen bei 0,91 m.** Das ist die
Entscheidung, an der zwei Anläufe hingen, und sie ist es wert, aufgeschrieben
zu werden:

Ein Overcooked-Koch ist eine **Chibi-Figur** — Kopf und Mütze machen gut die
Hälfte seiner Höhe aus, ohne Mütze ist er 1,8 Kopfhöhen groß, seine Augen
sitzen bei 1,24. Skaliert man ihn so, dass seine Augen auf der Augenhöhe eines
Menschen liegen, wird er **2,84 m hoch und sein Kopf einen Meter breit**.
Neben einem Tresen von einem Meter ist das ein Riese im Puppenhaus. Es wurde
gebaut, in drei Größen nebeneinandergestellt und angesehen (`npm run avatar`),
und es war eindeutig.

Also andersherum: **Die Figur bekommt die Größe, die zur Küche passt**, und
ihre Augen liegen dann eben tiefer als die des Spielers. In der Brille steht
die Kamera damit über dem Kopf der eigenen Figur; von oben — und von dort wird
gespielt — sieht man davon nichts. Der alte Grund („sonst sehen sich zwei Leute
in der Brille nicht in die Augen") ist damit hinfällig, und mit ihm der
**Nackenversatz**: Der Kopf sitzt jetzt einfach auf dem Rumpf.

Aus derselben Entscheidung folgt, dass die Figur **immer gleich hoch ist**. Sie
duckt sich nicht mehr mit dem Spieler, denn ihre Höhe kommt nicht mehr von ihm;
ob jemand steht oder sitzt, ändert an ihr nichts. **Es gibt kein Bücken der
Figur mehr**, und das ist eine Entscheidung und kein Versehen — ein Jest-Test
hält sie fest.

Was daraus für die **Posen** folgt, steht in `core/chefFit.ts`: Der Spieler
schaut aus 1,6 m, seine Figur aus 0,91 m, also wird der **Abstand zum Kopf**
mit `POSE_SCALE` gestaucht. Was er eine Kopfhöhe unter seinen Augen hält, hält
sie eine Kopfhöhe unter ihren. Derselbe Faktor sitzt auf den Handankern, damit
ein Werkzeug darin mit der Figur kleiner wird, statt in ihrer Faust zu stecken
wie ein Balken.

**Und die Bildschirmhand rechnet rückwärts** (`worlds/portal/screenHand.ts`).
Sie hing an einer festen Höhe von 1,20 m — der Höhe, auf der ein
ausgestreckter Menschenarm eine Waffe hält —, und der **Griff**, an dem das
Werkzeug wirklich hängt, machte die Stauchung gar nicht erst mit: Die Pistole
schwebte über dem Kopf der Figur und hatte obendrein Spielergröße. Jetzt steht
die Stelle an der **Figur** fest (`CHEF_TOOL`), und `at` ist die Pose, aus der
der Avatar wieder genau diese Stelle macht. Eine Zahl, zwei Abnehmer — die Hand
und das Werkzeug darin landen an derselben Stelle, statt getrennt geraten zu
werden.

**Wo eine ungetrackte Hand ruht, wird am Modell gemessen** und nicht an seiner
Hülle: `spanAt` fragt den Rumpf nach seiner Breite **auf der Höhe, auf der die
Hand hängt**. Der Rumpf ist ein Ei, seine dickste Stelle liegt unter den
Händen, und wer die Hand nach der Hülle danebensetzt, lässt sie eine Handbreit
im Nichts schweben. Dazu kommt die halbe Breite der **Hand selbst** — ohne sie
steckte ihre Innenseite in der Jacke.

**Wie die Datei entsteht**, steht in `tools/chef-model.mjs`, und zwar
vollständig: Die Quelle ist ein Standbild-Sculpt mit 550 000 Dreiecken (allein
die Mütze 352 000), ohne Skelett, ohne Animation, und ihre Teile liegen nicht
in Knoten, sondern über fünf Materialien verteilt. Das Werkzeug zerlegt sie in
**Mütze, Kopf, Rumpf und zwei Hände** — nach Material und Ort, nicht nach
zusammenhängenden Flächen —, dezimiert jedes Stück einzeln auf zusammen 8 260
Dreiecke und stellt sie in Spielmaße. Übrig bleiben 160 KB.

Drei Fehler aus diesem Umbau stehen dort im Detail, weil sie sich sonst
wiederholen: dass **anteilige** Budgets der Mütze das Budget des Gesichts
wegfressen, dass **kleine Teile gar nicht** vereinfacht werden dürfen (die
Augen wurden zu zwei Sicheln), und dass die **Trennebene gemessen** gehört und
nicht geschätzt — sie lag zuerst im Kopf statt in der Lücke darunter, und
danach hatte der Kopf ein abgeschnittenes Kinn und die „Hände" einen halben
Meter Breite.

**Der Antrieb ist derselbe geblieben**: `update(dt, head, left, right)` mit Kopf
und Händen, wie ihn ein Headset über seinen Träger nun einmal weiß. Der Rumpf
steht unter dem Kopf und dreht mit `bodyYaw` (mit derselben Totzone wie vorher);
seine **Höhe kommt nicht mehr vom Spieler**, siehe oben. Nicht getrackte Hände
schweben seitlich neben dem Rumpf und pendeln beim Laufen leicht. Was andere
daran hängen haben, ist unverändert: `head`, `handAnchors`, `setColor`,
`setHeadgear`, `setSelfView`, `setHandsVisible`, `update`, `dispose`, `bodyYaw`
— dazu `setLook(look)`.

**`BodyShape` hat zwei Methoden** (`core/avatarLook.ts`), und beide ändern je
Bild nur `scale`, `position` und `rotation` — **niemals Geometrie**, sonst läge
je Bild ein Netz für den Sammler da: `setHeight` stellt die Figur auf ihre
Höhe, `setStride` watschelt.

**Und eine Gruppe darüber kann sie federn**: Ist _Grafik → Animationen →
Squishy-Bewegung_ eingeschaltet, staucht und streckt sich die ganze Figur beim
Laufen — Rumpf und Kopf zusammen, um die Sohlen herum, nach einer
Hermite-Kurve, und ab Werk mit einem Federn auf zwei Schritte (_Stärke_ und
_Tempo_ stehen daneben). Darunter stehen dieselben drei Zeilen noch einmal für
das **Atmen im Stehen** — dieselbe Stauchung, nur ein Drittel so tief und mit
einer eigenen Uhr, damit eine wartende Figur nicht wie eine Statue dasteht.
Was die Figur dabei **hält**, geht mit ihrer Höhe auf und ab
(`AvatarBody.stretch`): das Werkzeug in ihrer Faust wie der Teller vor ihrem
Bauch. Ab Werk ist beides aus, und wie es rechnet, steht in
[Wie schön es aussieht](grafik.md) unter _Squishy_.

**Drei Zeilen, drei Listen** (`core/avatarLook.ts`). Vorher gab es nur den Hut,
und alle sahen darunter gleich aus: derselbe Körper aus Kapseln, dieselbe Farbe
nach Gerät, ein schwarzes Visier vorn. Für eine Werkstatt geht das, für eine
Sitzung mit drei Leuten nicht — wer sich unterscheiden will, hat sonst nur
seinen Namen dafür. Jetzt sind es drei:

- **Kopf** — vier Sorten, Hautton plus ein Merkmal im Gesicht: `round` (die
  Auslieferung), `freckles`, `beard`, `moustache`. Den Hautton tragen die
  **Hände** mit, es sind ja seine (`skinTone`).
- **Hut** — acht Sorten aus Zylindern, Kugeln und Quadern wie alles hier:
  **ohne** (die Auslieferung), **Kochmütze**, **Basecap**, **Helm**,
  **Bauhelm**, **Mütze**, **Zylinder**, **Krone**. Die Kochmütze ist das
  Vorbild für alles andere: **dunkles Stirnband**, schmaler Rand, darüber eine
  Haube aus **fünf Lappen**, die über den Rand hinauskragt, das Ganze so hoch
  wie der Kopf und gut zehn Grad nach hinten gekippt. Jedes dieser Stücke ist
  nachgemessen, und jedes einzelne fehlte in der ersten Fassung — die war ein
  Marshmallow auf einem Kegel.

  Wer einen Hut baut, der den Kopf **umfasst**, rechnet mit `HEAD_SPREAD`: An
  seinen vier Ecken ist die gefaste Kiste ein Viertel weiter draußen als eine
  Kugel, und ohne diese Zahl blitzt dort die Haut durch (`around()` in
  `core/headgear.ts`).
- **Körper** — fünf Kochjacken: weiß, rot, blau, grün, gestreift.

**Alle drei Zeilen wirken auch auf das Modell**, und das ist nachgetragen
worden: Es hat **einen** Kopf und **einen** Stoff für alle Sorten, und damit
war die halbe Umkleide wirkungslos — wer _Kochjacke rot_ wählte, lief weiter in
der Farbe seiner Rolle herum, und drei der vier Köpfe sahen aus wie der erste.
Drei Zeilen richten das:

- **Die Jacke trägt die Farbe aus der Umkleide** (`avatarLook.bodyJacket`) und
  nicht mehr die der Rolle. Das Modell hat genau einen Stoff, beide wollten
  ihn, und die Rolle gewann — jetzt gewinnt, was einem selbst gehört
  (dieselbe Regel wie beim geliehenen Helm im Kart). Die Rollenfarbe bleibt am
  Hut, der sie ohnehin schon trug.
- **Bart, Schnauzer, Sommersprossen, Zöpfe und Haar werden aufgesetzt**
  (`core/chefFace.ts`). Sie sind in den **gemessenen** Maßen genau dieses
  Kopfes gebaut und nicht aus der gebauten Figur abgezweigt: Deren Schädel ist
  ein gefaster Würfel, der des Modells eine rundere, flachere Kugel, ihre Augen
  sitzen unter der Mitte, seine genau darauf. Ein Bart mit dem Maß der einen
  auf der anderen ist ein schwarzer Klumpen über dem halben Gesicht — das
  wurde gebaut und angesehen. Was auf der **Haut** liegt (Wangen,
  Sommersprossen), wird über `onSkull` auf ein Ellipsoid gelegt und nicht auf
  die vorderste Ebene des Kopfes; sonst schweben die Wangen am Rand des
  Gesichts acht Zentimeter davor.
- **`none` heißt barhäuptig, auch mit Modell.** Bis dahin behielt die Figur
  bei `none` die modellierte Kochmütze auf — die Zeile im Schrank heißt aber
  _Ohne · Barhäuptig_, und von acht Hüten taten damit zwei dasselbe. Das
  **Haar auf dem Schädel** (`FaceMarks.crown`) ist genau dann sichtbar und
  weicht jedem Hut: Bei der gebauten Figur steckte es von selbst unter der
  Mütze, auf dem runderen Kopf des Modells ragte es als brauner Fladen über
  deren Rand.

- **_Rund_ hat einen Schopf**, und der ist nachgereicht. Die Rückmeldung lautete
  „Rund sieht aus wie nichts", und sie stimmte: Die anderen drei Köpfe
  unterscheiden sich an Bart, Schnauzer und Zöpfen — _Rund_ hatte eine
  Haarkappe und zwei blasse Wangen, und von **oben**, und von dort schaut man
  in diesem Projekt auf die Figur, blieb davon der Unterschied zwischen braunem
  und schwarzem Haar übrig: keiner. Ein Schopf über der Stirn löst genau das,
  weil er die **Silhouette** ändert und nicht nur die Farbe; die Wangen sind
  dazu größer und kräftiger geworden, denn ein Kopf, der _Runde Backen_ heißt,
  muss welche haben, die man sieht. Der Schopf hängt im `crown` und geht damit
  unter jeder Mütze mit — dieselbe Regel wie für das übrige Haar.

Was eine **Anzugfarbe** trägt und keine eigene hat — Schürze, Halstuch —, trägt
die des Trägers: Ein Spieler hat eine Farbe und nicht drei.

**Wie man die Figur ansieht, bevor man sie ändert.** Die Optik ist das eine
hier, was kein Jest-Test abnehmen kann — `avatarBody.test.ts` prüft
Proportionen und Rechnung, aber ob eine Figur nach Koch aussieht, entscheidet
das Auge. Dafür gibt es den **Musterbogen**:

```
npm run dev                # in einem Fenster laufen lassen
npm run avatar             # schießt vier Ansichten nach .artifacts/avatar
npm run avatar -- --tag=nachher --walk   # zum Vergleichen, und in Bewegung
```

Die Seite ist `avatar-preview.html` (`src/preview/avatarPreview.ts`) und wird
**nicht mitgebaut** — `vite.config.ts` kennt nur `index.html`, `tools.html` und
`inputs.html`, also gibt es sie nur im Entwicklungsserver. Sie stellt alle Sorten
nebeneinander und rendert vier Ansichten: von vorn, halb schräg, von der Seite
und **die Kamera, unter der wirklich gespielt wird** (16 m, 55°, 30°
Öffnung). Was dort nicht lesbar ist, ist es nirgends. `?hat=all` geht statt
der Kochmütze das Hutregal durch, `?walk=1` lässt die Figuren laufen — daran
sieht man das Watscheln, und im Stand sieht man das nie.

Drei Regeln stecken darin, und alle drei sind es wert, aufgeschrieben zu
werden:

- **Der Hut hängt am Kopf des Avatars und nicht am Körper.** Das ist der ganze
  Trick daran: `setSelfView` blendet den Kopf aus, sobald man in den eigenen
  Augen steckt, und nimmt den Hut damit von selbst mit. Man sieht seinen
  eigenen im Spiegel und durch ein Portal — so wie man auch seinen eigenen
  Körper nur dort sieht.
- **Das Aussehen gehört dem Spieler und keiner Welt.** Gespeichert wird es wie
  die Augenhöhe und die Grafikstufe, also im Browser (`bgvr.look`) und nicht in
  einer Welt; wer im Hub eine Kochmütze aufsetzt, trägt sie in der Testwelt
  auch. Eine Welt darf den **Hut** dabei **ausleihen** (`WorldContext.wear`) —
  das Kart tut es für den Helm —, und `null` gibt den Kopf wieder der
  Einstellung zurück. Wer aussteigt, hat wieder seinen eigenen Hut auf.
- **Es geht über das Netz**, und zwar in der **Anmeldung** und nicht in der
  Pose (`net/NetSession.ts`, Felder `hat`, `head`, `body` im `hello`). Ein
  Aussehen ändert sich einmal am Abend, eine Pose zwanzigmal in der Sekunde:
  Wer etwas wechselt, sagt sich neu an (`App.applyAppearance` schickt erst,
  wenn sich wirklich etwas geändert hat). Alle drei Felder sind **optional** —
  eine ältere Fassung schickt sie nicht mit —, und was hereinkommt, ist fremder
  Text und geht durch `asHeadgear`, `asHead` und `asBody`; ein unbekannter Wert
  wird zur Vorgabe und nicht zu `undefined`.

**Geändert wird an zwei Stellen, und beide lesen denselben Speicher**: die Seite
_Aussehen_ im Menü (drei Zeilen, jede schaltet im Kreis, die Überschrift zeigt
die Wahl gleich mit — `appearanceSummary`) und die **Umkleide** am
Kleiderschrank — und die ist keine Liste mehr, sondern ein **Regal im
Konstrukt**, in dem dieselben siebzehn Sachen als Sachen dastehen und der
Spiegel an der Tür zeigt, was man gerade angezogen hat (siehe
_Der Konstrukt-Raum_ und _Der Kleiderschrank und die Umkleide_). Gespeichert
wird sofort (`saveAppearance`), und wer zuhören will, hängt sich an
`onAppearanceChange` — der eigene Körper und das Netz tun genau das.

**Von innen ist ein Helm etwas anderes als von außen.** Außen eine Schale,
innen ein **Rahmen**: ein Kreisring vor dem Auge (`visorFrame`), dessen Loch
aus einem halben Meter Abstand rund 90° freies Blickfeld lässt. Die Mitte des
Bildes bleibt vollständig, außen wird es dunkel — und genau dort, am Bildrand,
ist die schnelle Bewegung, von der einem schlecht wird. Beide haben außer dem
Namen nichts miteinander zu tun, und deshalb sind es zwei Funktionen.

**Und hinter ihr staubt es** (`worlds/shared/dustTrail.ts`, `DustTrail`). Aus
16 m Höhe ist eine rennende Figur eine Figur, die ein Stück weiter oben ist als
eben; woran man sieht, dass sie rennt, ist die Spur dahinter — bei _Overcooked_
ist der Staub hinter dem Koch deshalb kein Zierrat, sondern die Auskunft über
das Tempo. Gemessen wird am **Weg** und nicht an der Zeit (`dustDue`, mit
Test): Alle 35 cm steigt ein Wölkchen auf, also staubt es beim Rennen dicht,
beim Schleichen selten und im Stehen gar nicht. Wer in einem Bild weiter kommt
als `DUST_JUMP` (1,2 m), ist **versetzt** worden — Portal, Sprungmenü,
Sturzrettung —, und dann staubt es überhaupt nicht: Eine Spur entlang einer
Strecke, die niemand gelaufen ist, wäre eine Lüge. Gebaut ist der Effekt wie der
Löschnebel in der Küche (`SprayJet`: geteilte Form, ein Material, Felder fester
Länge, und wer nichts zeigt, kostet nichts), und die Wölkchen hängen in der
**Welt** und nicht an der Figur — was ausgestoßen ist, bleibt liegen, sonst
zöge man es hinter sich her wie einen Schal. Angehängt wird die Spur in der
Testwelt (`TestWorld.trailDust`) und nicht in der Küche: Gestaubt wird, wo
gelaufen wird, und gelaufen wird auf dem ganzen Gelände. Nur zu Fuß —
`PlayerRig.wishing` ist der Merker, den alle vier Steuerungen setzen, und
`seated` schließt das Kart aus.

## Die Karte in der Hand

Ein Werkzeug im Regal, das nichts tut außer zu sagen, wo man ist
(`portal/tools/MapTool.ts`, gerechnet in `portal/tools/mapPlot.ts`).

**Sie ist mit Absicht ein Ding und keine Anzeige im Blickfeld.** Eine Minimap
in der Ecke des Bildes ist die Antwort vom Bildschirm; in einer Brille ist sie
das, wovon einem schlecht wird — sie klebt am Kopf, hat keine Entfernung, und
man kann sie nicht weglegen. Eine Karte in der Hand hat all das: Man hebt sie
an, dreht sie ins Licht, hält sie näher ans Auge und steckt sie wieder weg.

**Woher sie weiß, wie die Welt aussieht: aus dem Kachelgitter**, das jede Welt
beim Aufbau von sich selbst abtastet (`PortalWorld.bakeNavigation`) — dasselbe,
über das auch die NPCs laufen, erreichbar über `ToolHost.navMap()`. Das ist
keine Notlösung, sondern die einzige ehrliche Quelle: Eine zweite, eigens
gepflegte Kartenbeschreibung je Welt wäre eine Liste, die nach der dritten
Änderung lügt. So gibt es nichts zu pflegen — wer eine Wand baut, hat sie damit
auf der Karte, und eine Tür, die aufgeht, geht auch dort auf.

Vier Entscheidungen:

- **Ein Ausschnitt und keine Übersicht.** Ein Kasten um den Träger, der mit ihm
  wandert. Eine Karte, die immer die ganze Welt zeigt, ist auf einem Gelände
  von siebzig Metern ein grauer Fleck und in einem Zimmer ein Punkt. Der
  **Trigger** schaltet den Maßstab
  weiter: 20 → 40 → 80 → 160 m, im Kreis. Mehr Bedienung hat sie nicht.
- **Norden ist oben, immer.** Das Blatt dreht sich nicht mit, der **Pfeil**
  darauf schon. Die Alternative wäre verführerisch, aber wer die Karte in der
  Hand hält, dreht sie ohnehin selbst dorthin, wo er sie lesen will — und eine
  Karte, die sich beim Gehen unter der Hand mitdreht, ist ein Kreisel. In der
  Umrechnung steckt die eine Zeile, an der sich eine Karte verrät: In three.js
  zeigt −z nach vorn, auf dem Blatt zeigt kleines _v_ nach oben.
- **Ein Stockwerk und nicht alle übereinander.** Wo Etagen aufeinander liegen,
  wären sie übereinandergelegt ein Knäuel aus Wänden, das nichts mehr sagt.
  Genommen wird die, auf deren Boden der Kopf am ehesten steht
  (`nearestLevel`).
- **Was sie zeigt, sagt etwas.** Boden als helle Felder, gesperrte Kacheln rot
  (`NavGraph.isBlocked` — die eine Auskunft, die eine Karte geben kann und ein
  Blick nicht), Wände schwarz, **Türen** in einer eigenen Farbe und offene
  gestrichelt (wer vor einer Karte steht, sucht als Erstes den Ausgang),
  Fenster dünn und blau. Dazu ein Punkt je Mitspieler aus derselben Sitzung.

Gerechnet wird alles in **Blattkoordinaten** (0…1, _v_ nach unten wie auf jeder
Leinwand) und ohne three.js, damit es ohne Brille geprüft werden kann;
`MapTool.ts` malt nur noch.

## Was aus dem Beutel kommt

> **Und was aus dem Regal kommt**, steht nebenan: Neben dem Beutel hängt im
> Menü das [KayKit-Regal](./assetregal.md) — die gekaufte Sammlung, rund 4500
> Dateien, durchblättert wie ein Dateibrowser. Der Unterschied ist der zwischen
> einer Kiste mit Spielzeug und einem Lager: Was hier steht, ist von Hand
> gebaut und heißt beim Namen; was dort steht, ist eine Datei, und ihr Pfad
> **ist** ihr Name. **Herausgeholt wird aus beiden gleich**, und zwar in jeder
> Ansicht: In der Brille landet es in der Hand, die zugegriffen hat, am Schirm
> und auf dem Telefon in der Bildschirmhand — vor dem Bauch der Figur
> beziehungsweise vor der Kamera (siehe [Greifen](./greifen.md), _Und am Schirm
> trägt die Figur_). Dass es dort einmal zu Boden fiel, ist vorbei.

Der Beutel ist die Kiste mit dem Spielzeug, und alles darin steht in
`worlds/portal/props.ts` — Sorte, Netz, Masse und Collider an _einer_ Stelle,
denn beide Seiten einer Sitzung bauen aus derselben `kind` dasselbe Ding, und
die Werkzeugseite liest dieselbe Liste (`BAG_ITEMS`). Der **Name** steht
daneben in `PROP_LABELS`: Wer nur wissen will, wie etwas heißt — die Meldung
beim Herbeirufen, der Inspektor, das Schild im Beutel —, soll dafür keine
Geometrie, kein Material und keine Textur bauen müssen.

Zu den sieben Bauklötzen der ersten Stunde sind neun dazugekommen, und sie
teilen sich in zwei Gruppen:

- **Was sich bewegt**: **Kegel** (rund, während die Pyramide derselbe Körper
  mit vier Segmenten ist — welchen von beiden man braucht, merkt man beim
  Umwerfen), **Rampe** (der Keil, mit dem eine Kugel irgendwo hinunterrollt),
  **Stab** (neunzig Zentimeter Metall, der Hebel und die Achse für alles
  Gebaute) und **Murmel** (klein, schwer und sprungfreudig — sie hat als
  einzige einen eigenen Rückprall im Bauplan).
- **Der Würfelsatz**: die **fünf platonischen Körper** als W4, W6, W8, W12 und
  W20, gebaut in `worlds/portal/dice.ts`.
- **Die Sektflasche** (`worlds/portal/champagne.ts`): das erste Ding, das man
  nicht anfasst, sondern **hält**, und das erste, das etwas **tut** — siehe
  unten.
- **Der Standspiegel** (`worlds/portal/standingMirror.ts`): 1,65 m Glas im
  Bügel auf einem Fuß, hoch genug, um sich ganz darin zu sehen.
- **Die Heizdecke** (`worlds/portal/heatedBlanket.ts`): das Ding, das man
  jemandem **abnimmt** — die erste Aktion, die ein übernommener NPC gelernt
  hat (siehe [NPCs](./npcs.md), _Charakter_). Eine gefaltete Decke, kein
  Tuch: flach, leicht, mit Steppnähten und dem Regler am Kabel.

**Warum der Standspiegel ein Ding und kein Werkzeug ist.** Die nächstliegende
Vorlage wäre die **Staffelei** gewesen: ein Werkzeug, das etwas hinstellt und
danach die Hand wieder leer macht. Aber ein Werkzeug ist etwas, das man
_benutzt_ — es hat einen Trigger, es tut etwas, es liegt in der Hand. Ein
Standspiegel tut nichts: Er steht herum, man schiebt ihn dorthin, wo man ihn
braucht, und stellt sich davor. Genau das ist ein Ding aus dem Beutel — es hat
einen Körper, es fällt um, man kann es tragen und werfen, der Duplizierer legt
ein zweites daneben, und die anderen in der Sitzung sehen es an derselben
Stelle stehen. Die Staffelei ist nur deshalb ein Werkzeug, weil sie
ausdrücklich **kein** Hindernis sein darf: Man muss mit der Pinselspitze durch
sie hindurchgreifen können. Bei einem Spiegel will man das Gegenteil. Sein
Collider ist deshalb der ganze Kasten aus Fuß, Pfosten und Rahmen — einer nur
um den Rahmen fiele bei der leisesten Berührung um, und ein Standspiegel, der
nicht steht, ist keiner.

**Ein Griff an einem Ding aus dem Beutel.** Ein Werkzeug kommt vom Gürtel in
die Hand und liegt dort, wie seine Haltung es sagt; ein Ding aus dem Beutel
wird _angefasst_: die Hand schließt sich, wo sie es berührt, und es bleibt, wie
es lag. Für einen Würfel ist das richtig, für eine Flasche nicht — die fasst
man am **Hals**. Also kann ein Beutel-Objekt einen **Griff** tragen
(`worlds/portal/propGrip.ts`, `PROP_GRIPS` in `props.ts`): einen Zylinder in
seinem eigenen Raum, und beim Zugreifen rastet der in die Faust — in dieselbe,
die den **Standardgriff** hält (`GRIP_FIST`, `GRIP_HAND_POSE`; die Hand trägt
die Haltung unter der Sorte als Id, und `gripFist.test.ts` prüft, dass der
Hals darin liegt). Der Hals steht damit senkrecht in der Faust wie ein
Pistolengriff; eine Weile war es die Faust am Hammerstiel, und die Flasche lag
quer in der Hand wie eine Taschenlampe. **Und ein Zylinder hat kein Oben**: die
Flasche lässt sich aufrecht halten und **über Kopf**, am Hals gepackt. Welche Lage
gilt, entscheidet die Hand beim Zugreifen — `snapToGrip` kippt die Achse in die
nähere der beiden Richtungen und dreht sonst nichts, auch nicht um die Achse
(mit Test). Das ist der Unterschied zu einem Werkzeug: das kommt beim ersten
Griff immer in seiner einen Haltung; ein Ding mit Griff darf man drehen, wie man
will, und der Griff nimmt es so. Beim **Nahgreifen** rastet nichts — da bleibt
das Ding liegen und folgt der Hand von dort; erst der Zug holt es her, und dann
rastet es. Ein Objekt ohne Eintrag in `PROP_GRIPS` verhält sich wie immer.

**Und der Korken knallt.** Geschüttelt wird gemessen, nicht geraten
(`ShakeMeter`, mit Test): nicht die Geschwindigkeit der Hand — ein Wurf ist
schnell und kein Schütteln —, sondern wie oft und wie hart sie die **Richtung
wechselt**, aufsummiert mit Verfall; ein Ruck allein reicht nicht, ein paar in
einer Sekunde reichen, und eine vorsichtig getragene Flasche knallt nie. Dann
löst sich der Korken vom Hals und wird ein eigener kleiner Körper, der die
Halsachse hinausfliegt und irgendwo liegen bleibt (man kann ihn aufheben),
dazu ein Schwall Schaum aus der Mündung (`Foam`, Punkte statt Kugeln) und der
Knall (`playPop`). Die Flasche bleibt offen; eine neue kommt aus dem Beutel.
Über das Netz geht nur _dass_ es geknallt hat (`pop` in `PortalSync.ts`): der
Korken ist ein Effekt und kein geteilter Gegenstand, jede Seite lässt ihren
eigenen fliegen. Wer später dazukommt, sieht die Flasche mit Korken — der Preis
dafür, dass der Zustand nirgends gespeichert wird.

Am Würfelsatz hängen zwei Dinge, die es vorher nicht gab.

**Die Zahlen werden gerechnet, nicht gezeichnet.** Ein Ikosaeder von Hand mit
einem UV-Netz zu versehen wäre eine Stunde Fleißarbeit und danach unantastbar.
Stattdessen wird das Netz gelesen: Dreiecke mit gleicher Normale sind eine
Fläche (beim Dodekaeder je drei), jede Fläche bekommt ihre Zelle in einer
Zahlen-Textur, und ihre Ecken werden in diese Zelle projiziert. Wer die Zahl
trägt, entscheidet `worlds/portal/diceFaces.ts` (mit Test) nach der Regel
echter Würfel: **gegenüberliegende Flächen ergeben zusammen `n + 1`**. Der
Tetraeder hat kein Gegenüber und zählt darum einfach durch. 6 und 9 bekommen
den Strich darunter, ohne den sie dasselbe Zeichen sind. Der W6 behält als
einziger sein eigenes UV-Netz — three.js reiht die vier Ecken einer
Kastenseite zeilenweise auf, und die gerechnete Fassung legte die Zahl damit
ausgerechnet auf dem Würfel quer, den jeder kennt.

**Und sie brauchen einen Collider, der kippt.** Bis dahin kannte die Physik
Kasten, Kugel, Zylinder und Kegel; ein W20 wäre als Kugel bis zur Wand
gerollt und nie liegen geblieben, eine Rampe als Kasten keine Rampe. Also gibt
es eine fünfte Form: **`{ kind: 'hull', points }`**, die konvexe Hülle der
Ecken (`physics/PhysicsWorld.ts`). Der Punktpuffer ist dabei die Vorlage _und_
der Maßstab: `resize` zieht ihn an Ort und Stelle mit, statt sich die
Ausgangsgröße daneben zu merken — damit landet zweimal Verdoppeln dort, wo
einmal Vervierfachen landet, und das Transformationswerkzeug funktioniert an
einem Würfel wie an einer Kiste.
