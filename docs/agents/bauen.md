# Bauen

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

## Der Konstrukt-Raum — gelöscht

Bis Oktober 2026 gab es einen **weißen Raum, in dem man aussucht**
(`worlds/shared/construct.ts`): Wer vor dem Kleiderschrank der Sandbox oder
vor dem Computer-Tisch der Küche `A` drückte, sah die Welt verblassen, ein
Kachelboden kam herauf, und um die Figur fuhren die Stücke zur Auswahl aus dem
Boden — Kleidung am Schrank, Möbel am Rechner. Die Figur blieb dabei draußen
stehen, ging ohne Körper durch den weißen Raum (`PhysicsLocomotion.ghost`), und
die anderen sahen sie über einen Pose-Anker weiter vor dem Möbel
(`NetSession.poseAnchor`).

Gewünscht war dann: _„dem kostrukt raum kannst du auch komplett entfernen
bitte"_. Er ist weg, samt Pose-Anker und Tests:

- **Statt der Umkleide** steht in der Sandbox die **Garderobe**, und `A`
  öffnet die Seite _Aussehen_ im Menü
  ([Spielelemente](spielelemente.md#die-garderobe-a-öffnet-aussehen)).
- **Statt des Möbelkatalogs im weißen Raum** schlägt der Rechner der Küche den
  **Katalog im Menü** auf (`kitchen.openCatalogue` → `ZoneHost.openCatalogue`),
  denselben wie unter dem Reiter _Katalog_ — mit vollen Händen weiterhin nicht.
- **Geblieben** ist der kollisionsfreie Körper: Der Kran fliegt damit
  (`PortalWorld.updateCraneFlight`).

Wer die alte Fassung nachlesen will:
`git show 49dfe5b:src/worlds/shared/construct.ts` und dieses Kapitel im selben
Stand (`git show 49dfe5b:docs/agents/bauen.md`).

## Weltbau: von oben, auch in der Brille — und der Bauplatz ist weg

Die Welt **Bauplatz** (`worlds/editor/EditorWorld.ts`, `#editor`) ist im
Oktober 2026 gelöscht worden, samt Startzimmer (`editor/starterGrid.ts`),
Vorschaubild und Messstrecke. Gewünscht: _„die welt bauplatz kann bitte weg.
stattdessen dachte ich an einen welt bau modus, wo man einfach wie bei ‚von
oben' zuschaut, also auch in vr."_ Der Editor selbst (`editor/WorldEditor.ts`
und was daran hängt) bleibt — er gehört jeder Gitterwelt, nicht dem Bauplatz.
Die alte Welt: `git show 7fd7c4f:src/worlds/editor/EditorWorld.ts`.

**Weltbau** ist ein Haken im Reiter _Bauen_, gleich unter dem Spielmodus
(`build-flight`, `core/buildFlight.ts`), gilt in jeder Welt und wird nicht
gespeichert; ein Weltwechsel landet.

- **Am Schirm** heißt Weltbau: von oben (`App.topDown` fragt `buildFlight()`
  neben `screenTopDown`) — mit Zoom und Drehen, wie es die Ansicht schon kann.
- **In der Brille** wächst **das Gestell** um `BUILD_SCALE` (10), und die Welt
  bleibt, wie sie ist (`PlayerRig.startFlight`). Gewünscht war genau das:
  _„die welt soll nicht kleiner werden, nur die eigenen bewegungen in vr
  (also entfernungen der hand) oder neigung/bewegung des kopfes werden
  skaliert, damit die berechnungen in der welt gleich bleiben"_. Ein
  Zentimeter Kopfbewegung ist zehn Zentimeter in der Welt, der Augenabstand
  auch, und so sieht man die Welt wie ein Modell auf dem Tisch — jede Wand,
  Zelle und Physik bleibt in ihren echten Metern. Wer mit 1,60 m dasteht,
  schaut aus 16 m herunter; der Kopf bleibt über der Stelle, an der er war.
- **Gesteuert** wird nur mit den Sticks (`PlayerRig.updateFlight`,
  `buildFlight.flightStep`): **links** fliegt waagerecht, vorn ist, wohin der
  Kopf schaut; **rechts vor/zurück** steigt und sinkt, zwischen 2 und 150 m
  Augenhöhe über dem Boden, auf dem man abgehoben hat; **rechts quer** dreht
  wie immer (Snap oder gleitend, `updateTurn`). Das Tempo geht mit der Höhe,
  wie beim Kran. Seit Oktober 2026 1,8-mal so schnell wie zuerst
  (`BUILD_PAN`, `BUILD_CLIMB`), und **linker Stick eingedrückt** sprintet
  noch einmal doppelt (`BUILD_SPRINT`). Gewünscht: _„mit dem linken Stick
  1,8-fach schneller bewegen können (ggf. auch Sprint durch Drücken noch
  schneller). Rechter Stick hoch runter auch schneller."_ Kein Laufen, kein Springen — die Fortbewegung und die
  Physikkapsel bleiben am Boden stehen, und `endFlight` stellt das Gestell
  genau dorthin zurück, wo es abgehoben hat (`locomotion.resync`).
- **Das Menü wächst mit**: Es hängt am Gestell (`GameMenu`), und die
  Menü-Ebene rechnet relativ zu ihm (`XRMenuLayer`) — es steht so groß und
  scharf wie immer. Der Zeigestrahl reicht deshalb `12 × scale` Meter weit
  und wird in den Maßen der Hand gezeichnet (`Pointer.updateXrRay`).
- **Die anderen** sehen den Riesen nicht: Solange man fliegt, wird keine
  eigene Pose gesendet (`net.visible`), wie beim Zuschauen. Zuschauen, Brille
  absetzen und Weltwechsel landen (`App.syncFlight`).

**Greifen aus der Luft** (Oktober 2026). Gemeldet: _„wenn ich nahe dran bin
an gegenständen werden diese anscheinend unsichtbar […] die möbel die ich in
der hand halte sollen genauso groß sein, wie in der welt […] wenn ich die
höhen position ändere, dann wird die vorschau […] mit nach unten
verschoben"_, und: _„wenn die hand nahe eines möbel stücks ist, dass ich
dieses mit der hand wie beim grab angedeutet wird grabbar zu sein und
gehighlighted wird das möbelstück."_

- **Die Nahebene schrumpft mit** (`App.syncFlight`): Die Brille rechnet
  `camera.near` in Metern des Gestells, bei zehnfacher Größe also 50 cm Welt
  statt 5 cm — wer sich über ein Möbel beugte, sah es verschwinden. Im
  Weltbau gilt `CAMERA_NEAR / BUILD_SCALE`, die Fernebene geht im selben Maß
  zurück (700 m Welt), damit die Tiefe so fein bleibt wie am Boden. Im
  Emulator (`?xr=sim`) sieht man das nicht: IWER übernimmt die Nahebene nicht.
- **Die Füße bleiben am Boden** (`PlayerRig.getFloorY`): Im Weltbau sagt es
  den Boden, von dem man abgehoben hat (`flight.floor`), und nicht die Höhe
  des Gestells. Vorher sanken die leuchtenden Kacheln der Vorschau
  (`PlaceGrid`) mit, sobald man mit dem rechten Stick tiefer flog — und alles
  andere, das nach den Füßen fragt, gleich mit.
- **In der Riesenhand in echter Größe**: `shrinkInHand` gilt nicht, solange
  `rig.flying` — ein Tisch liegt dort so groß in der Hand, wie er gleich in
  der Welt steht.
- **Der Greifzuschlag wächst mit** (`PortalWorld.handMargin`):
  `GRAB_MARGIN × Gestellgröße`, für Gegenstände (`findProp`, auch die offene
  Hand) und benutzbare Dinge (`reachDepth`).
- **Stehende Möbel mit der Hand** (`PortalWorld.reachElement`): Ein
  hingestelltes Spielelement gehört der Welt und ist für `findProp` nur ein
  festgehaltenes Bodenstück. Im Weltbau geht es deshalb **vor** dem übrigen
  Greifen: Liegt die Hand über seiner Grundfläche und nicht höher als
  1,40 m plus Zuschlag, leuchtet sein Saum (`showUse`, `elementLiftTarget`),
  die Hand öffnet sich, und der Grip hebt es an wie der Kran am Schirm
  (`liftElementAt` → `conjureModel`) — samt allem, was darauf steht. Grip auf
  stellt hin. Ein umgestelltes Element hält kein Spielmodus fest
  (`heldByMode`). Am Boden nicht: Dort fasst die Hand eine Küchenzeile an, um
  ihr etwas zu nehmen.

**Der Geist auf der Etage der Hand** (Oktober 2026). Gemeldet: _„der Ghost
wird nicht korrekt angezeigt, aber die hervorgehobenen Kacheln schon, der
Ghost ist anscheinend immer auf der untersten Ebene (auch in Rot dann
leider)"_. `decorTarget` (Geist, Höhe beim Einrasten, Pinsel) fragte nach den
Füßen (`rig.getFloorY`), und die sind im Weltbau auf dem Boden, von dem man
abgehoben hat. Jetzt fragt es wie das Gitter nach `buildFloorY`. Und rot war
er oben aus einem zweiten Grund: Eine Wand der Etage darunter endet auf der
Höhe dieses Bodens, gerechnet einen Hauch darüber, und galt in `restOn` als
Unterlage, auf die der Tisch nicht passt — jetzt mit einem Zentimeter Luft.

**Fallen lassen mit Physik-Optik** (Oktober 2026, _Grafik → Weltbau:
simulierte Physik-Optik_, `gfx:drop-physics`, ab Werk an). Was man loslässt
und einrastet, fällt sichtbar aus der Hand, dreht sich in der Luft, springt
einmal kurz auf und kippt dann auf seinen Platz (`portal/dropFall.ts`).
Gewünscht: _„wenn ich eine Kiste z. B. leicht schräg loslasse, dass diese aus
meiner Hand runterfällt und sich z. B. in der Luft auch drehen kann und wenn
diese aufkommt, dass diese ‚zufällig' so kippt/fällt, dass diese am Ende in
der richtigen Position landet"_.

- **Nur das Bild**: Es fällt eine Abschrift (dieselben Netze, kein Körper).
  Ein Modell aus dem Regal steht schon an seinem Platz (`snapPlaced`) und ist
  nur verborgen, bis die Abschrift unten ist (`fallModel`). Ein Spielelement
  wird erst hingestellt, wenn sie liegt (`fallElement`, `landing`) — seine
  Teile laden neu und stünden sonst schon unten; die Etage gilt dabei vom
  Loslassen (`buildLevel` → `furnishAt(…, level)`), und im _Baukasten_ liegt
  die nächste Kopie sofort in der Hand.
- **Die Bewegung** (`FallMotion`): Schwerkraft mal Gestellgröße (der Riese
  sieht eine Kiste so schnell fallen wie ein Mensch eine kleine), Schwung der
  Hand, Drall aus der Schräglage beim Loslassen plus etwas Zufall; gelenkt
  wird waagerecht auf den Platz. Aufgekommen ist sie, wenn die tiefste Ecke
  des gedrehten Kastens den Boden berührt; dann kippt sie mit der Ecke am
  Boden in die richtige Lage und steht am Ende genau dort, wo sie ohne Optik
  stünde. Höchstens drei Sekunden; wer sie unterwegs wieder greift, beendet
  den Fall.

**Etagen aus der Luft: die Hand sagt, welche** (Oktober 2026). Gewünscht:
_„Überleg dir wie ich Ebenen wechsel, oder wenn es z. B. das Dach bei
Hausbau-Welt gibt, aber Ebene noch keine anderen Plätze auf der Ebene, dann
wird das in der Hand auf das nächste Feld unter der Hand platziert (z. B. auf
dem Dach) mit Vorschau."_

- **Gebaut wird auf dem obersten Boden unter der Hand**
  (`GridWorld.handLevel`): die höchste Etage, die an dieser Kachel Boden hat
  und nicht mehr als 30 cm über der Hand liegt (`HAND_LEVEL_SLACK`) — sonst
  das Erdgeschoss. Gemessen an der Hand, die trägt, sonst an der rechten
  (`PortalWorld.buildHandAt`). Im Weltbau ersetzt das die Etage unter den
  Füßen (`trackLevel` → `rigLevel`), also gilt es für alles, was nach der
  Bauetage fragt: Vorschau (`updatePlaceGrid` auf `buildFloorY`), Hinstellen,
  Anheben (`placedAt` nur auf dieser Etage), Wände ziehen.
- **Das ist zugleich der Etagenwechsel**: Hand über dem Dach — das Dach; Hand
  ins Haus gesenkt — das Zimmer darunter, und die Etagen darüber blendet der
  Hausbau aus (`HausbauWorld.underRoof` fragt an `levelProbe`, der Stelle
  unter der Hand). Keine Leiste und kein Knopf: Man sieht in das Haus, sobald
  man hineingreift.
- **Spielelemente kennen Etagen** (`ElementSpot.level`): gesperrt werden die
  Zellen dieser Etage (`spotCells`), gestellt wird auf ihren Boden
  (`ElementHost.floorY`), Anker und Teile tragen `userData.level`, damit sie
  mit der Etage verschwinden. Oben zählt jede Kachel, die die Etage hat
  (`graph.has`), unten weiter `onGround`. Eine Ablage trägt nur, was auf
  derselben Etage steht; was darauf steht, erbt ihre Etage. In der Liste der
  Weltänderungen steht die Etage als `level` (fehlt im Erdgeschoss).

## In der Brille: was aus dem Katalog kommt, klebt — und ist klein

Gemeldet im Oktober 2026: _„im vr modus einrichten bzw. bauen klappt noch
nicht korrekt. Es scheint wenn ich etwas mit grab gedrückt halte, dass ich
dann durch grab loslassen es leider nicht platziere. Zudem sind z. B. tische
viel zu groß in der hand."_

- **Was ohne Faust in die Hand kommt, klebt** (`HandGrab.regrip`, gesetzt in
  `spawnModel`): ein Stück aus dem Katalog oder Regal, mit dem Trigger im
  Menü gewählt, und im _Baukasten_ die nächste Kopie nach dem Hinstellen.
  Vorher galt dafür sofort „Grip offen = loslassen": Das Stück fiel im ersten
  Bild aus der Hand, und im _Baukasten_ holte jedes Hinstellen die nächste
  Kopie, die gleich wieder hingestellt wurde — eine Schleife aus „kein Platz"
  und neuer Kopie, in der nie etwas ruhig in der Hand lag. Jetzt: einmal
  greifen (Grip zu), hinhalten, Grip auf — erst dieses Loslassen stellt hin.
- **Wegwerfen leert die Hand**: Ein frisches Stück im _Baukasten_, mit
  Schwung losgelassen (schneller als `gridSnap.PLACE_SPEED`), verschwindet
  ohne Nachschub (`letGo`) — das _Kran leeren_ der Brille.
- **In der Faust kleiner** (`PortalWorld.shrinkInHand`). Gewünscht: _„für
  alles (außer Werkzeuge), dass wenn ich diese in der hand halte, dass diese
  kleiner gerendert werden (wie beim burger)"_. Höchstens halb so groß
  (`dishHold.HAND_SCALE`, wie der Burger), und so, dass die längste Seite in
  `HAND_FIT` (0,35 m) passt — ein Tisch von 1 m ist ein Modell auf der Hand.
  Nicht im Weltbau: Da ist man selbst der Riese (siehe oben).
  Verkleinert wird um die Faust, nicht um die Mitte. Nur das Bild: Körper,
  Geist und Einrasten rechnen mit der echten Größe, beim Loslassen ist es
  sofort wieder groß (`release` → `unshrinkInHand`). Nicht beim Nahgreifen
  (dort liegt es nicht in der Hand) und nicht für Werkzeuge (die sind keine
  `grabs`).
- **Nachgestellt** mit `?xr=sim`: Der Emulator liegt dann als
  `globalThis.bgvrXr` bereit, Knöpfe und Hände lassen sich aus Playwright
  setzen (`bgvrXr.controllers.right.updateButtonValue('squeeze', 1)`).

## Bauen, während man darin steht

**Jede Gitterwelt lässt sich umbauen, ohne sie zu verlassen**
(`worlds/editor/WorldEditor.ts`). Das war einmal eine eigene Welt — der
**Bauplatz** —, und als erste Fassung war das richtig: Man probiert eine
Bedienung an einem Ort aus, bevor man sie überall hinhängt. Es war aber auch
die Antwort auf die falsche Frage. Die Frage lautet nicht _wo baue ich ein
Level?_, sondern _warum kann ich das Haus, in dem ich gerade stehe, nicht
umbauen?_ Wer beim Durchlaufen merkt, dass ein Gang zu eng ist, will ihn
**dort** verbreitern und nicht in einer zweiten Welt nachbauen.

Also hängt die Bedienung an keiner Welt mehr, sondern an einem **Grundriss**
(`grid/gridPlan.ts`) und an einem Wirt (`EditorHost`), der drei Sachen kann:
die Welt neu bauen, jemanden versetzen und etwas sagen. Jede Gitterwelt hat
beides und bekommt den Editor damit geschenkt (`grid/GridWorld.ts`,
`editable()`); gesagt haben es heute der **Bauplatz** und die **Testwelt**.

Vier Entscheidungen tragen das Ganze:

- **Der Plan ist der Navigationsgraph** (`editor/levelPlan.ts`). Kein zweites
  Datenformat: `has(key)` heißt „hier ist Boden", eine Wand steht zwischen zwei
  Kacheln, eine Tür ist eine Wand, die aufgeht — das führt `nav/navGraph.ts`
  ohnehin. Damit können NPCs sofort belaufen, was man baut, `nav/navSerial.ts`
  kann es speichern, und vor allem kann nichts auseinanderlaufen: Ein Editor,
  dessen Grundriss etwas anderes sagt als die Karte, ist einer, in dem man eine
  Tür einbaut und danach zusieht, wie ein Zombie hindurchgeht.
- **Gebaut wird aus einer Liste** (`editor/levelBuild.ts`, `grid/gridPlan.ts`).
  `solids()` macht aus dem Plan achsenparallele Quader — die Gegenrichtung von
  `navBake.ts`, und der Test prüft genau das: Was der Editor baut, muss das
  Abtasten wiederfinden. Miniatur und Lebensgröße kommen aus **derselben**
  Liste; zwei Bauanleitungen für dasselbe Zimmer laufen auseinander, und man
  merkt es an dem Tag, an dem eine Tür im Modell an einer anderen Wand hängt
  als im Raum.
- **Die Miniatur ist ein Gegenstand** (`editor/miniature.ts`): Standort,
  Drehung, Maßstab — und die Drehung ist seit der zweiten Fassung ein
  **Quaternion** und kein Gierwinkel mehr. Eine Hand **trägt** das Modell, samt
  allem, was das Handgelenk dabei tut; **zwei Hände** ziehen es größer,
  **kippen** und drehen es, in allen drei Achsen (Kippen aus der kürzesten
  Drehung zwischen alter und neuer Handverbindung, Rollen aus dem Anteil der
  Handdrehungen **um** diese Achse — ohne den zweiten Teil ließe sich ein
  Modell um genau die Achse nicht drehen, die man in den Händen hält). Nur
  fallen tut es nicht: Losgelassen bleibt es stehen, und genau deshalb hat man
  beim Bauen zwei Hände frei. Die eine Regel, ohne die sich jede Karte falsch
  anfühlt, steht dort als eine Zeile: **Der Punkt zwischen den Fingern bleibt
  liegen.** Gerechnet wird gegen den Stand beim Zugreifen und nicht gegen das
  letzte Bild — sonst liegt die Geste nach zwei Sekunden Zittern um zehn
  Prozent daneben. Dass ein Grundriss dabei schief hängen darf, ist kein
  Versehen, sondern der Zweck: Wer eine Wand von unten sehen will, kippt das
  Modell, statt sich darunter zu bücken. Gerade legt es _ein_ Griff wieder —
  „Zu mir" ist gleichzeitig die Wasserwaage.
- **Die Welt tritt zur Seite, solange die Karte draußen ist.** Ihre Quader
  werden unsichtbar und kommen aus der Physik heraus, und was in ihr
  herumliegt, hält still (`PhysicsWorld.setFrozen`). Drei Gründe, und jeder
  allein reicht: Ein Grundriss vor der Nase, hinter dem eine Wand steht, ist
  einer, den man nicht sieht — ein Zimmer ist ein geschlossener Kasten, und man
  steht darin. Wer eine Wand quer durch den Raum malt, in dem er steht, steckt
  sonst darin. Und eine Wand, die man nicht sieht, aber gegen die man läuft,
  ist schlimmer als eine, die im Weg steht — also gehören Sichtbarkeit und
  Körper zusammen. Was bleibt, ist der Boden bis zum Horizont, der Himmel und
  alles, was nicht aus dem Grundriss kommt; wo man selbst dabei steht, sagt die
  Figur in der Miniatur. **Fest wird das Gebaute beim Weglegen der Karte**:
  Dann werden die Quader mit Körpern neu gebaut und die Navigationskarte neu
  abgetastet, denn was man gebaut hat, sollen NPCs auch belaufen können.

**Ausgesucht wird an einer Palette** (`editor/Palette.ts`). Drei Antworten
standen zur Wahl, wie man in der Brille ein Bauteil aussucht: ein Menü (dreimal
Aufklappen je Wechsel — die Sorte Bedienung, nach der man aufhört zu bauen),
ein magischer Beutel (der gibt _Gegenstände_ heraus, einen nach dem anderen;
beim Bauen setzt man dasselbe zwanzigmal hintereinander) — und eine Palette mit
einem Pinsel: einmal eintunken, beliebig oft setzen, den Pinsel zurück in die
Mulde, wenn man fertig ist. Genau das ist der Rhythmus eines Kacheleditors.
Steckt der Pinsel in der Mulde, baut ein Tipp auf die Miniatur **nichts** —
dann darf man darin herumfassen, ohne aus Versehen eine Wand zu setzen.

**Werkzeuge sind vier, und der Radiergummi ist eines davon**: Boden, Wand, Tür,
Löschen. Was ein Druck tut, hängt an zwei Sachen — am Werkzeug und daran, worauf
man zeigt —, und diese Kreuzung steht an _einer_ Stelle (`applyTool`,
`applyGridTool`). Zwei Handgriffe daran sind eingebaute Nachsicht: Wer _Boden_
gewählt hat und auf eine **Kante** zeigt, baut die Kachel dahinter (so malt man
einen Raum von seinem Rand aus weiter, ohne die Mitte der nächsten Kachel zu
treffen); und wer _Tür_ auf eine freie Kante setzt, bekommt eine Wand mit einer
Tür darin statt einer Fehlermeldung.

**Und dann gibt es die zweite Reihe der Palette: die Bausteine**
(`grid/gridTool.ts`, `grid/blocks.ts`). Küchenzeile, Regal, Tisch, Bank, Kisten,
Säule, Geländer, Brüstung, Podest — eintunken, auf die Miniatur tippen, fertig.
Ohne sie ist ein Zimmer ein leerer Kasten mit einer Tür, und genau daran merkt
man beim Bauen _nicht_, ob ein Raum funktioniert. Zwei Regeln erklären das
Setzen ganz:

- **Was an eine Wand gehört, will eine Kante.** Küchenzeile, Regal, Bank,
  Geländer, Brüstung, Portaltafel: Die Kante, auf die man zeigt, ist
  gleichzeitig die Seite, an der sie stehen. Zeigt jemand auf die Mitte einer
  Kachel, sagt der Editor das — eine geratene Küchenzeile steht in drei von vier
  Fällen falsch herum, und man sieht es erst, wenn man davorsteht.
- **Was frei steht, nimmt die Kante als Blickrichtung.** Tisch, Kiste, Säule,
  Podest: Die Kachel entscheidet, _wo_ sie stehen, die Kante nur, _wohin_ sie
  schauen; wer auf die Mitte zeigt, bekommt Norden.

Die zwei Reihen auf der Palette sind kein Ordnungssinn, sondern die Reihenfolge,
in der man baut: erst der Grundriss, dann das, was darin steht. Wer eine
Küchenzeile in derselben Reihe suchte, käme beim Wandmalen aus Versehen daran.

Der Radiergummi räumt in der Reihenfolge auf, in der man es meint: **erst der
Baustein**, dann die Tür, dann die Wand, dann der Boden. Wer eine Küchenzeile
löschen will, will nicht den Boden darunter los.

### Malen und Flächen

**Ein Druck ist eine Kachel, und das ist die falscheste Bedienung, die es für
einen Boden gibt.** Für eine Tür ist sie richtig; für ein Zimmer von acht mal
acht Kacheln sind es vierundsechzig Trigger, und spätestens beim dreißigsten
hört man auf, Räume zu bauen, die größer als eine Stube sind. Zwei Gesten
nehmen das weg (`editor/planPaint.ts`), und beide kennt jeder aus jedem
Malprogramm:

- **Malen**: drücken, ziehen, loslassen. Was der Zeiger dabei überstreicht,
  wird gesetzt. Der einzelne Tipp ist dabei kein eigener Modus, sondern der
  kürzestmögliche Strich — wer einmal drückt und sofort losläßt, setzt genau
  eine Kachel und muss dafür nichts umgestellt haben.
- **Fläche**: zwei Ecken, und dazwischen wird gefüllt. Aufziehen und zweimal
  tippen sind dasselbe: Wer beim Loslassen woanders steht als beim Drücken, hat
  aufgezogen; wer auf derselben Kachel losläßt, hat getippt, und die Ecke
  wartet auf den zweiten Tipp. Aus der Ferne hält niemand den Arm für einen
  langen Zug ruhig, und wer nah davorsteht, will nicht zweimal tippen.

Drei Rechnungen stehen dahinter, und die dritte ist die, an der ein
Kacheleditor sonst scheitert:

- **Zwischen zwei Bildern darf keine Lücke bleiben** (`strokeSpots`). Eine Hand
  fährt in einem Sechzigstel leicht über drei Kacheln; wer nur die unter dem
  Zeiger setzt, malt gestrichelt. Gerechnet wird deshalb in Kachelschritten und
  nicht in Metern — zwischen zwei Kacheln liegt eine ganze Zahl von Kacheln.
  Die **Kante des Ziels gilt für den ganzen Strich**: Wer eine Wand entlang
  malt, zeigt auf Nordkanten, und sie aus jeder Zwischenkachel neu zu raten
  stellte an jedem zweiten Schritt eine Wand quer.
- **Was „füllen" heißt, hängt am Werkzeug** (`areaSpots`). Was auf eine
  **Kachel** gehört — Boden, Radiergummi, ein Tisch —, füllt die Fläche. Was an
  eine **Kante** gehört — Wand, Tür, Regal, Geländer —, zieht ihren **Rand**,
  nach außen gerichtet wie bei `wallRect`. Ein gefülltes Rechteck aus Wänden
  wäre ein Klotz aus Wänden; gemeint ist ein Zimmer. Damit ist ein Zimmer zwei
  Gesten: eine Fläche Boden, ein Rechteck Wände.
- **Die Ecke ist immer eine Kachel**, auch wenn der Zeiger auf einer Fuge lag.
  Ein Rechteck, dessen Ecke je nach getroffener Kante um eine Kachel springt,
  bekommt man nicht zweimal gleich hin.

Gehalten wird das vom Zeiger selbst (`core/Pointer.ts`): Neben `onSelect` gibt
es jetzt `onHold` — jedes Bild, solange die Taste unten bleibt — und
`onRelease`. Zwei Fallen stecken darin, und beide sind abgefangen: Ein Ziel,
das mitten im Ziehen **abgemeldet** wird (die Karte wandert an die Hüfte,
während der Finger noch am Trigger liegt), muss trotzdem sein Loslassen
bekommen, sonst malt der nächste Druck an dem alten Strich weiter. Und die
**Zeigefläche der Miniatur entsteht nur einmal** und wird beim Umbauen nur
nachgezogen — eine Fläche, die bei jeder gesetzten Kachel neu entstünde, nähme
dem Zeiger mitten im Strich sein Ziel weg, und der Strich wäre nach einer
Kachel zu Ende.

Im flachen Modus geht dasselbe mit der Maus: gedrückt halten und den Blick
schwenken. Dafür musste eine alte Ungereimtheit weg — mit gefangener Maus
(Pointer-Lock) friert der Browser `clientX/clientY` dort ein, wo er sie
gefangen hat, und der Strahl zeigte für den Rest der Sitzung dorthin, wo der
Mauszeiger beim ersten Klick zufällig stand. Jetzt zeigt er auf die Bildmitte,
also dorthin, wo auch das Fadenkreuz ist.

### Platz zum Weiterbauen

**Man muss neben alles zeigen können, was schon steht** — auch dorthin, wo noch
gar nichts ist. Der Teller unter dem Modell ist der Plan plus eine Kachel; die
**Fläche, auf die man zeigen kann, ist der Plan plus fünf** (`FIELD_MARGIN`),
und das Raster darauf zeigt genau, wo das ist. Ein Editor, in dem man nur an
vorhandene Kacheln andocken kann, ist einer, in dem man keinen zweiten Flügel
anbaut; und in einer Welt, in der an dieser Stelle noch nichts steht, ist es der
Unterschied zwischen bauen und nicht bauen können. Ein **leerer** Plan bekommt
denselben Rand als Ganzes — sonst hätte, wer bei null anfängt, nichts, worauf er
zeigen könnte.

**Ob eine Kachel oder ihre Kante gemeint ist, entscheidet ein Streifen**
(`spotAt`, 70 cm). Das ist die Rechnung, an der ein Kacheleditor steht oder
fällt: Die Mitte einer Kachel ist ein großes Ziel, ihre Kante eine Linie — und
eine Linie trifft man in der Brille auf drei Meter Entfernung nicht ohne Hilfe.

### Wo Karte und Palette hängen

**Der Gürtel hat zwei Haken, und der Bauplatz macht mit Absicht ohne Werkzeuge
auf.** Deshalb sucht sich der Editor beim Aufmachen die **freien** Haken: Hier
sind es beide, also hängt die Karte an der einen und die Palette an der
anderen, und man zieht sie mit dem Greifknopf heraus wie jedes Werkzeug. Wo
keiner frei wäre, hingen sie an gar keinem und schwebten vor einem, statt sich
zu verstecken — der Fall kommt seit dem Wegfall der Seite _Bauen_ aus dem
Handgelenkmenü nicht mehr vor (`GridWorld.editable`), die Vorsorge steht
trotzdem. Zwei Sachen an demselben Haken hieße, dass ein Griff dorthin eine von
beiden verschluckt, und welche, wüsste niemand.

**Man selbst steht mit im Modell** (`editor/PlayerPin.ts`). Eine Karte hat einen
Punkt „Sie sind hier", und weil man ihn anfassen kann, ist er gleichzeitig der
Weg dorthin: Figur nehmen, ans andere Ende des Gangs stellen, loslassen — dort
steht man. Auf eine Kachel, die es nicht gibt, geht niemand; dort wäre der
nächste Schritt ein Sturz. Gebaut ist sie in **Planmetern** und nicht in
Zentimetern: Sie hängt in der Miniatur, die trägt den Maßstab, und damit ist die
Figur bei jedem Zoom so groß wie ein Mensch im Grundriss.

Damit schweben drei Dinge in derselben Luft, und wer zugreift, greift irgendwo
hin. Die Vorfahrt steht in `editor/reach.ts` und ist **das nächstgelegene
gewinnt**, mit einer Reichweite am Ding statt am Griff: Die Figur hat eine
kleine, der Grundriss eine große. Ohne diese Regel hat jeder Editor denselben
Fehler — man will die Figur versetzen und schiebt den ganzen Grundriss weg, weil
das Modell größer ist und deshalb immer zuerst antwortet.

**Das Modell bringt sein eigenes Licht mit.** Eine kleine Lampe schwebt einen
halben Meter darüber, und sie hängt **neben** dem Modell in der Welt statt
darin: Ein Licht in einer Gruppe, die auf ein Zwanzigstel geschrumpft ist,
leuchtet auch nur ein Zwanzigstel weit. Sie muss sein, seit der Editor nicht
mehr nur im hellen Bauplatz steht — in einer dunklen Welt ist die Umgebung mit
Absicht fast schwarz, und ein Grundriss, den man nur mit der Taschenlampe lesen
kann, ist keiner.

**Das fünfte Werkzeug, das keines ist: Hingehen.** Auf eine Kachel der Miniatur
tippen und dort stehen. Es ändert nichts am Plan und steht deshalb neben den Werkzeugen und
nicht in ihnen — aber es ist der Griff, der aus einer Zeichnung eine Karte macht:
Wer den Gang am anderen Ende gebaut hat, muss ihn nicht ablaufen, um zu sehen, ob
er zu eng ist. Versetzt wird dabei über `PortalWorld.movePlayerTo` — Rig **und**
Kapsel, denn `rig.placeAt` allein verschiebt nur das, was man sieht, und die
Fortbewegung zieht einen im nächsten Bild zurück.

### Speichern, exportieren, importieren

**Eine gebaute Welt muss irgendwo hin**, sonst ist Bauen ein Zeitvertreib. Es
gibt dafür zwei Wege, und sie sind mit Absicht nicht dasselbe
(`grid/worldStore.ts`):

- **Der Speicher** (`localStorage`, ein Eintrag je Welt unter `vr-welt:<id>`)
  ist kein Archiv, sondern die Antwort auf eine einzige Frage: _Wer zwanzig
  Minuten baut und die Brille absetzt, soll seine Welt wiederfinden._
  Geschrieben wird beim **Weglegen der Karte** — das ist der Augenblick, in dem
  jemand fertig ist, und der einzige, an dem ein Schreiben weder sechzigmal in
  der Sekunde passiert noch zu spät kommt — und beim Verlassen der Welt, falls
  die Karte dabei noch draußen war. Der Bauplatz schreibt zusätzlich beim
  Bauen, höchstens alle zwei Sekunden: Dort baut man von Grund auf, oft eine
  halbe Stunde am Stück, ohne die Karte dazwischen wegzulegen.
- **Die Datei** ist das Archiv. Sie geht als Download vom Gerät herunter und
  über die Dateiauswahl wieder hinein, und sie ist das Einzige, was einen Umbau
  vom nächsten Browser, vom nächsten Rechner und von der nächsten
  Programmfassung trennt.

Beide schreiben **dasselbe Format**. Ein Speicher mit einem eigenen, kürzeren
Format wäre das zweite Format neben dem ersten, und das zweite Format ist
immer das, das eine Kleinigkeit vergisst.

Im Menü liegen die vier Handgriffe unter **Welt sichern**, und zwar ganz
oben — und nur im Bauplatz, denn nur dort wird gebaut (`GridWorld.editable`):
Speichern und Mitnehmen ist keine Fußnote unter den Werkzeugen, und eine Welt,
die man nicht ändern kann, hat auch nichts aufzuheben. Die erste Zeile heißt _Im Browser speichern_ und nicht „Welt
speichern" — so heißt schon der Knopf der Stoppuhr, und der merkt sich etwas
ganz anderes (wo die Kisten gerade liegen, für diese Sitzung). _Gespeichertes verwerfen_ leert den Eintrag **und** baut die Welt
im selben Augenblick aus ihrem `layout()` neu — das eine ohne das andere wäre
eine Welt, die erst beim nächsten Laden wieder die richtige ist, und bis dahin
fragt man sich, ob der Knopf kaputt ist.

**Was im Browser liegt, gewinnt** — und zwar ganz. Kein Verschmelzen mit
`layout()`: Ein halb übernommener Umbau wäre eine Welt, die weder die gebaute
noch die gespeicherte ist, und man sähe es erst an der Stelle, an der beide
sich widersprechen.

**Unter welchem Namen eine Welt liegt, sagt sie selbst** (`worldId()`,
abstrakt). Naheliegend wäre `ctx.net.world` gewesen — der steht beim Bauen aber
noch auf der _vorigen_ Welt (`App.loadWorld` setzt ihn erst nach `init`), und
zwei Welten, die sich still denselben Speicherplatz teilen, sind der Fehler, den
man erst bemerkt, wenn im Bauplatz plötzlich die Testwelt steht.

### Das Weltformat

**Eine Welt als Datei** (`grid/worldFile.ts`), Format `baumgartner-welt`,
Version **`0.3.0`**.

Bis hierher gab es zwei Hälften und keine Naht dazwischen. Der
Navigationsgraph hatte längst ein sauberes, versioniertes Format
(`nav/navSerial.ts`); alles andere, was eine Gitterwelt ausmacht, hatte keins.
Die **Bausteine** lagen als nacktes JSON daneben, ungeprüft und ohne Version,
und die **Massen** — das Dach über einer Halle, eine Felswand, der Sand
darunter — wurden überhaupt nicht gespeichert. Ein „gespeicherter Grundriss"
war deshalb genau so lange brauchbar, wie die Welt keine hatte.

Vier Entscheidungen tragen das Format:

- **Der Graph bleibt der Graph.** Die Weltdatei _enthält_ eine `nav`-Datei, sie
  ersetzt sie nicht. Damit erbt sie jede Prüfung, die dort schon steht
  (Kachelgröße, Version, Kachelläufe), und wer nur die Karte braucht, greift
  sich `nav` heraus.
- **Gespeichert wird der Grundwert, nicht das Ergebnis.** In den Kacheldaten
  eines laufenden Plans stecken die Aufschläge der Bausteine schon drin: Eine
  Küchenzeile macht ihre Kachel teurer. Wer diese Zahl speichert, sie beim
  Laden als Grundwert nimmt und die Bausteine danach anwendet, zählt jeden
  Aufschlag zweimal — nach dem dritten Laden ist die Küche unbegehbar. Also
  steht in `nav` der Plan **ohne** Möbel (`GridPlan.bare()`), und die
  Aufschläge werden beim Laden neu gerechnet (`GridPlan.restore()`). Ein Test
  fährt drei Runden und prüft, dass die Zahl dabei stehen bleibt.
- **Koordinaten sind Zahlen, keine Schlüssel.** Eine Kachel steht als `x`, `z`,
  `l` in der Datei und nicht als `TileKey`. Der Schlüssel ist eine gepackte
  Ganzzahl (`navTile.ts`), also ein Implementierungsdetail: Wer seine Packung
  ändert, macht damit sonst still jede gespeicherte Welt kaputt — und niemand
  sähe es, weil die Datei weiterhin gültig aussieht.
- **Die Version ist Semver, als Zeichenkette.** Solange die Hauptnummer `0`
  ist, gilt eine neue Nebennummer als Bruch — so liest man Semver vor 1.0.
  Gelesen werden die Zeilen `0.1.x`, `0.2.x` und `0.3.x`: `0.1` blieb lesbar,
  weil der Sprung auf `0.2` nur eine Liste hinzugefügt hat (die **Einbauten**),
  und `0.2` bleibt es, weil `0.3` nur ein **Feld** hinzufügt — den Fuß einer
  Treppenkachel (`y`, siehe unten). Eine fehlende Liste ist eine leere, ein
  fehlendes Feld eine Null. Andersherum gilt das nicht: Wer eine
  `0.3`-Welt in ein altes Programm lädt, verlöre ihre Treppen still.
  Eine Datei aus der Zukunft wird **abgelehnt** und nicht halb geladen, denn
  eine Welt, der beim Laden die Hälfte fehlt, sieht aus wie eine kaputte Welt
  und nicht wie eine zu neue. „Zu neu" und „zu
  alt" bekommen deshalb zwei verschiedene Meldungen: Sie sind das Einzige,
  woran jemand sieht, ob er ein Programm oder eine Datei aktualisieren muss.

**Ein Baustein hat seit `0.3` einen Fuß**, und er heißt `y`. Eine Treppe liegt
auf dem Metergitter über **mehrere** Kacheln, und jede einzelne weiß zwei
Dinge: wie viel sie steigt (`height`) und wie hoch über dem Etagenboden sie
anfängt (`BlockPlacement.lift`). Ohne die zweite Zahl läge ein gespeicherter
Lauf beim nächsten Laden flach auf dem Boden — vier Stufen nebeneinander statt
einer Treppe. Sie heißt in der Datei `y` und nicht `lift`, weil dort schon `x`
und `z` stehen und drei Buchstaben derselben Sorte sich leichter lesen als zwei
plus ein Wort; und sie fehlt bei null, denn das ist der Normalfall — jeder
Baustein, der nicht steigt, spart sie sich.

**Streng und nachsichtig an den richtigen Stellen.** Ein Baustein auf einer
Kachel, die es nicht gibt, fällt weg; eine unbekannte Baustein-Sorte fällt weg
(wer eine Welt aus einer neueren Fassung öffnet, will sein Haus sehen und nicht
eine Fehlermeldung über einen Schrank). Bei einem **Einbau** fällt die
unbekannte Art dagegen _nicht_ weg — sie hat eine Kennung, auf die andere
zeigen, und ein Tor, das beim Speichern verschwände, nähme jedem Knopf sein
Ziel; übersprungen wird sie erst beim Bauen, und dann mit einer Meldung. Bei
den **Massen** ist es andersherum: Dort wird abgebrochen. Ein fehlendes Dach ist
eine Welt, in die es hineinregnet, und eine fehlende Felswand eine, aus der man
hinausläuft.

Und noch ein Unterschied, der leicht als Schlamperei durchginge: Eine kaputte
Zeile im **Speicher** wird weggeworfen und nicht gemeldet — sie kommt aus einer
Fassung, die es nicht mehr gibt, niemand kann etwas daran tun, und die Welt
soll trotzdem aufmachen. Eine **Datei**, die jemand bewusst auswählt, meldet
jeden Fehler: Wer eine Datei auswählt, hat eine Erwartung, und ein stilles
Nichts wäre die schlechteste aller Antworten.

**Was bewusst nicht in der Datei steht**, damit niemand es sucht: Eine
Weltdatei ist ein **Grundriss** und kein Spielstand. Sie kennt Kacheln, Wände,
Türen, Verbindungen, Bausteine, Einbauten und Massen — alles, was `GridPlan`
führt. Sie kennt **nicht**, was eine Welt darüber hinaus von Hand hinstellt
(`buildProps`): die Lampen an den Türen, die Karts in der Boxengasse, die
Kisten zum Herumwerfen. Und sie kennt keine Farben — welchen Ton eine Wand hat,
entscheidet die Welt, in der sie steht (`GridWorld.tint`), und genau deshalb
sieht eine in den Bauplatz importierte Welt aus wie ein Bauplan und nicht wie
ein Haus. Das ist die Grenze, und sie ist gezogen und
nicht vergessen: Ein Format, das _alles_ speichert, ist eines, das bei jeder
neuen Lampe eine neue Version braucht.

Der **Dateiname** ist der Name der Welt plus das Datum plus `.welt.json` — die
doppelte Endung, damit ein Betriebssystem sie als JSON öffnet und ein Mensch
trotzdem sieht, was darin steht: `bauplatz-2026-09-07.welt.json`. Ein
Startzimmer wiegt so ein paar Kilobyte, das Gelände der Testwelt ein paar
Dutzend.

Ein Download und eine Dateiauswahl sind in der Brille wenig wert — man sieht
von beidem nichts. Sie sind für den Rechner gedacht, und das ist keine Lücke,
sondern die Arbeitsteilung: In der Brille wird gebaut, am Rechner wird
abgelegt und weitergegeben.

### Was der Bauplatz noch selbst macht

Von der Welt `editor/EditorWorld.ts` ist wenig übrig, und das ist ihr Erfolg und
nicht ihr Ende. Drei Sachen unterscheiden sie vom Umbauen einer fertigen Welt:

- **Sie fängt bei einem Zimmer an** (`starterGrid.ts`) und nicht bei einem Haus,
  das schon steht. Eine leere Ebene beantwortet die erste Frage nicht, die jeder
  hat — _wie sieht denn eine Wand hier aus?_
- **Er schreibt auch beim Bauen** und nicht nur beim Weglegen der Karte
  (`planEdited`, höchstens alle zwei Sekunden). Hier baut man von Grund auf, oft
  eine halbe Stunde am Stück und ohne die Karte dazwischen wegzulegen — und wer
  dabei die Brille absetzt, hätte sonst nichts. Alles Übrige am Speichern ist
  seit dem Weltformat für jede Gitterwelt dasselbe (_Speichern, exportieren,
  importieren_). Den **alten Eintrag** aus der Zeit davor (`vr-bauplatz-plan`:
  die nackte Karte plus Mobiliar, ohne Version und ohne Massen) liest er noch
  einmal, schreibt ihn im neuen Format und räumt ihn weg — wer zwei Wochen an
  einem Grundriss gebaut hat, verliert ihn nicht, weil das Programm inzwischen
  ein richtiges Format hat.
- **Beim Bearbeiten steht man in einem weißen Raum.** Wo eine fertige Welt nur
  zur Seite tritt, tauscht der Bauplatz seine Kulisse: Boden bis zum Horizont
  und ein weißer Himmel statt des dunklen. Der Grund ist derselbe wie beim
  Tischmodell — wer einen Grundriss von Grund auf zieht, steht nicht
  gleichzeitig darin. Beide Kulissen liegen von Anfang an übereinander da;
  umgeschaltet wird nur die Sichtbarkeit, und der Körper des dunklen Bodens
  trägt für beide. Zwei kleine Zahlen, die man sonst falsch macht: Der Boden bis
  zum Horizont liegt hier **zwei Zentimeter tiefer** als sonst, weil er sich mit
  den Bodenplatten des Plans sonst um jedes Pixel streitet; und die Mitte des
  Plans wandert beim Anbauen, weshalb `recentre` das Modell um genau so viel
  zurückschiebt — ohne das springt der Grundriss bei jedem Druck ein Stück zur
  Seite, und man baut ihm hinterher.

**Was noch fehlt**: Etagen (der Graph kann sie, der Editor zeigt nur die erste —
und damit fehlen auch die beiden Bausteine, die zwischen Etagen führen: Treppe
und Rampe), Rückgängig **für den Grundriss** (für Stücke aus dem Regal gibt es
es seit September 2026, siehe _Die Werkzeugleiste des Baukastens_), Fenster als Werkzeug (gebaut werden sie längst, gesetzt
bisher nur von Welten in ihrem Grundriss), und ein Weg, eine **eigene** Welt aus
einer Datei zu laden statt sie in eine vorhandene zu importieren: Heute
überschreibt ein Import den Grundriss der Welt, in der man gerade steht, und wer
zwei gebaute Welten nebeneinander haben will, braucht zwei Wirte dafür.

Eine rauhe Kante gibt es dazu, und sie steht hier, damit sie niemand für einen
Zufall hält: **Der Greifknopf gehört beim Bauen zwei Herren.** Die Welt greift
weiter nach Requisiten (`PortalWorld`), der Editor nach Modell, Palette und
Figur — und wer in einer Welt mit Kisten mitten in der Miniatur greift, kann
beides auf einmal erwischen. Im Bauplatz fällt das nicht auf (dort liegt nichts
herum), anderswo ist es selten (die Requisiten sind beim Bauen eingefroren und
das Haus ist unsichtbar), aber es ist da. Der saubere Weg wäre, dass die Welt
ihr Greifen abgibt, solange die Karte draußen ist.

## Der Spielmodus und die Liste der Weltänderungen

**Ein Möbel im Spielmodus** (September 2026, gewünscht: _„wenn der Spieler
Möbel im spielmödus platzieren will, sollen diese direkt vor ihm gehalten
werden und immer mit south Ausrichtung zu ihm. Ich brauche kein ghost des
Objektes … sondern lediglich das floor tile gehighlithed"_): Ein Spielelement
aus dem Möbelkatalog hängt vor der Figur, und seine Vorderseite zeigt immer
zu ihr (`PortalWorld.attach`, der Halter steht um `-ELEMENT_HOLD` gegen den
Anker). Abgestellt wird es so, wie es hängt — es schaut dorthin, von wo man
es hingestellt hat. Der Geist (`PlaceGhost`) bleibt für Möbel im Spielmodus
weg; es leuchten nur die Kacheln, auf denen es landen wird, gerechnet wie
beim Abstellen (`spotAround` → `spotTiles`) statt aus dem Collider.

**Drei Modi, eine Zeile** (`core/gameMode.ts`): _Einstellungen →
Spielmodus_ schaltet mit jedem Klick weiter — **Spielen**, **Einrichten**,
**Baukasten**, und wieder von vorn. Gewünscht war das mit den Namen
_Adventure, Edit, Creative_, und ausdrücklich nicht mit diesen; die drei
Verben sagen, was man in dem Modus tut.

- **Spielen** ist die Küche, wie sie war: Gegenstände benutzen, ablegen,
  einen Burger von der Ausgabe nehmen. Die Möbel stehen.
- **Einrichten** ist der Umbau aus _PlateUp!_. Möbel werden aufgehoben und
  neu hingestellt, **samt dem, was darauf liegt** — die Pfanne fährt auf
  dem Herd mit, die Teller auf der Ausgabe (`kitchen.carryLoad`).
  Gegenstände selbst nimmt man in dem Modus nicht in die Hand. Bis dahin
  räumte das Anschalten des Umbaus jede Fläche leer (`calmStations`, dasselbe
  wie `B`/`Y`); jetzt bleibt alles liegen, und nur die **Uhren stehen**:
  `cook` und `runBelts` tun nichts, solange eingerichtet wird, und laufen
  danach dort weiter, wo sie standen (`kitchen.pauseStations`). Aufgeräumt
  wird nur, was gerade **unterwegs** war — ein Brötchen mitten auf dem Band
  geht auf seine Kachel zurück — und was in den Händen lag.
- **Baukasten** ist Einrichten, und dazu: Wer ein Stück **aus einem Katalog**
  genommen hat — dem Möbelkatalog am Computer-Tisch, dem Kopierer oder dem
  KayKit-Regal — und es hinstellt, hat sofort die nächste Kopie in der Hand,
  **mit derselben Drehung** (aus dem Regal seit September 2026:
  `placedFromShelf` reicht die Vierteldrehung an `spawnModel` weiter). Nur für frische Stücke
  (`Furnish.fresh`, `PortalWorld.shelfFresh`): Wer einen Herd umstellt, der
  schon stand, bekommt keinen zweiten.

**Wer einrichtet, ist der Kran** (`core/crane.ts`, seit September 2026).
Gewünscht war es wie in _PlateUp!_: In **Einrichten** und **Baukasten** tritt
der Koch ab, und über dem Kopf schwebt ein gelber Greifer — ein Gehäuse, ein
Seil, drei Klauen im Drittelkreis (`buildCrane`). Er ist **rund**, weil
„Richtungen erstmal nicht wichtig" waren: Ein Greifer ohne Vorn kann nicht
falsch herum stehen. Er schwebt in fester Höhe (`CRANE_HEIGHT`, 1,7 m — erst 2,2 m, aber von
schräg oben stand er dann sichtbar eine halbe Kachel neben der Stelle, auf die
er zeigte) und
nicht über der Kopfhöhe, sonst sänke er beim Ducken, und dreht sich langsam
um sich selbst (`cranePose`). Der Körper geht dabei über
`AvatarBody.setBodyHidden` und nicht an `applyBodyVisible` vorbei — sonst
schaltete der nächste Hutwechsel den Koch mitten im Einrichten wieder an.

- **Am Schirm heißt Kran: von oben** (`screenTopDown`, `App.topDown`). Wer
  _Aus den Augen_ gewählt hat, behält die Wahl; sie gilt nur nicht, solange
  eingerichtet wird, und kommt mit _Spielen_ von selbst zurück. Das Menü
  _Spiel-Sicht_ sagt es dazu (`… · als Kran von oben`). Gespeichert wird nichts —
  der Modus nicht, und die Wahl der Startseite wird nicht überschrieben.
  Umgeschaltet wird über `onGameMode` im `App`: Der Modus sagt es, die
  Ansicht folgt.
- **In der Brille bleibt es vorerst beim Alten.** Ob man dort steht oder die
  Welt wie beim Bauen als Miniatur von oben sieht (`editor/miniature.ts`), ist
  offen. Der eigene Körper ist in der Brille ohnehin nicht zu sehen
  (`LAYER_SELF_ONLY`), der Kran also auch nicht.
- **Aus dem Regal** (`dressCrane`, `CRANE_MODELS`): oben ein Dropship aus der
  Raumbasis (halbe Größe), darunter die hängende Kette aus der Wundertüte
  (`mixed-bag/chain_hanging_A`), unten ein Angelhaken, doppelt so groß
  (`rpg-tools-bits/fishing_hook_A`). Gewünscht war: _„statt Seil die Kette und
  unten einen Haken, gerne statt dem Kran oben ein anderes passendes Objekt
  aus KayKit."_ Die Kette wird so lang gezogen, dass der Haken bei
  `CRANE_CLAW_DROP` (1,15 m unter dem Dropship) endet — dort hängt, was der
  Kran trägt. Getauscht wird erst, wenn alle drei da sind; bis dahin steht der
  gebaute Kran mit seiner Lotschnur. Das Dropship dreht sich nicht mehr
  (`CRANE_SPIN` 0): Ein Fluggerät mit Nase, das sich im Kreis dreht, sieht
  verloren aus. Es dreht mit dem Rig — und das dreht nur, wer dreht (`R`,
  rechter Stock, siehe unten); in der Datei zeigt die Nase nach hinten,
  deshalb steht es um 180° gedreht (`TOP_TURN`).
- **Tasten fahren das Bild, der Zeiger stellt den Kran** (`FlatControls.crane`,
  `flyCrane`, seit September 2026). Gewünscht war: _„im Baukasten-Modus (von
  oben) will ich (im Web mit WASD, mobil mit Joystick) die Kamera-Position
  bewegen. Die Position des Hakens/Raumschiffs soll über Mauszeiger bzw.
  Touch passieren."_ Als Kran löst sich die Kamera vom Rig
  (`TopDownCamera.detach`) und fährt mit `WASD`/linkem Stock
  (`TopDownCamera.pan`, Tempo `CRANE_PAN` × Zoomabstand je Sekunde). Der Kran
  fliegt zu dem Punkt am Boden unter Mauszeiger oder Finger
  (`TopDownCamera.groundPoint`), weich mit `CRANE_FOLLOW_TAU` (0,05 s,
  `craneVelocity`); wer nur ein Pad hat, bekommt ihn in der Bildmitte
  (`centrePoint`). Ein Finger, der losgelassen wird, lässt den Kran stehen,
  wo er ist. Gilt für _Einrichten_ und _Baukasten_ — beide sind der Kran.
- **Beim Einschalten bleibt der Kran, wo die Figur steht** (`craneHold`,
  Oktober 2026). Gemeldet: _„durch das aktivieren [wird] der spieler oben
  links im bildschirm gesetzt, weil da die maus ist"_ — die letzte Mausstelle
  vor dem Klick ins Menü. `FlatControls.crane` vergisst sie deshalb; erst eine
  neue Mausbewegung, ein Finger oder der Stock fahren ihn los.
- **Die Figur bleibt als Geist stehen** (`PlayerAvatar.setCrane`). Gewünscht:
  _„der spieler wird ghost und ich kann diesen mit dem kran auch umsetzen"_.
  Der Körper bleibt halb durchsichtig dort, wo man zum Kran wurde
  (`leaveBehind`, `setGhostly`); der Kran hängt am Rig und nicht mehr an der
  Figur. Ein Klick mit leerem Kran über ihr nimmt sie an den Haken, der
  nächste setzt sie ab (`PortalWorld.liftFigure`). Wer aufhört, Kran zu sein,
  steht wieder in seiner Figur — nicht dort, wo der Kran zuletzt war.
- **Den Kran leer machen**: Rechtsklick mit vollem Haken oder der Knopf _Kran
  leeren_ unten rechts (`craneEmpty.ts`, `PortalWorld.emptyCrane`). Gewünscht,
  _„damit ich nicht ewig ein objekt lege"_. Ein frisches Stück aus dem
  Katalog verschwindet, ein aufgehobenes fällt, die Figur wird abgesetzt.
  Mit leerem Haken holt der Rechtsklick wie bisher die Bombe.
- **Gedreht wird mit `R`** (`craneTurn`, ein Achtel, `Shift`+`R` zurück —
  zweimal ist ein Viertel) oder mit dem rechten Stock (die Nase zeigt dorthin,
  auf das nächste Achtel gerastet). Achtel, seit Wände auch unter 45° stehen:
  Eine Wand aus dem Regal rastet schräg ein und wird auf die Diagonale ihrer
  Kacheln gekürzt — eine 2×1-Wand geht durch eine Kachel, eine 4×1-Wand durch
  zwei (`gridSnap.diagonalPose`, `PortalWorld.fitWall`). Für das Zellgitter
  ist sie danach eine Schräge wie eine gebaute (`GridWorld.refreshWallSlopes`).
  **Halber Boden unter einer Schräge** (September 2026): Im Werkzeug
  _Schräge_ des Bauplans schaltet das dritte und vierte Tippen den Boden
  darunter auf die innere Hälfte (`GridPlan.halfFloor`, leer wird die Seite
  mit weniger Boden, `gridTool.outerCorner`; Einzelheiten in
  `docs/agents/zellgitter.md`). Die Station von Haunting setzt ihn an jeder
  Schräge. Für eine eingerastete Regalwand unter 45° gibt es den Schalter
  noch nicht.
  Alles andere rastet beim Hinstellen weiter auf ein Viertel.
  **`R` gehalten** (länger als `crane.CRANE_TWIST_HOLD`, 0,25 s): Der Kran
  bleibt stehen, und die Nase zeigt zum Mauszeiger, auf Achtel gerastet
  (`crane.craneAimYaw`). Gewünscht: _„wenn ich r gedrückt halte, [soll] ich
  nach einem kurzen moment mit der maus richtung die grad zahl der wand
  einstellen [können]? 0,45,90 etc."_ Gewünscht war: _„im Web mittels R rotieren (anstelle der
  Richtung der Drohne) … im Web ohne Stick dreht die Drohne sich dann nicht."_
  Das Dropship schaut also nicht mehr in Flugrichtung; das Getragene dreht mit.
  Als Kran setzt `R` die Welt deshalb **nicht** zurück (`PortalWorld.flatKeys`
  fragt `movesFurniture`) — das bleibt über das Menü.
- **Malen mit gedrückter Maus** (`PortalWorld.startPaint`, `paintStroke`,
  seit September 2026). Gewünscht war: _„im web von oben mit maus gedrückt
  halten mehrere objekte legen … wie bei einem paint tool."_ Im _Baukasten_
  und mit einem Stück frisch aus dem Regal ist der Linksklick ein
  Pinselstrich: Das Stück bleibt am Kran, und jede Kachel, über die er mit
  gedrückter Taste fährt, bekommt eine Kopie in seiner Drehung
  (`placeModelAt`, dieselbe Höhe wie die Fläche). Zwischen zwei Bildern wird
  in halben Kacheln nachgezogen, damit schnelles Ziehen keine Lücken lässt;
  wo dasselbe Modell schon steht, kommt keine zweite hin. Ein einfacher Klick
  ist ein Strich über eine Kachel. `E` und ein Möbel, das schon stand, legen
  weiter ab wie bisher (`PlayerRig.paintHeld` setzt nur die Maus).
- **Die Abrissbombe** (`core/craneBomb.ts`, `PortalWorld.updateBomb`, seit
  September 2026). Gewünscht war: _„mit einem Rechtsklick soll im
  Baukasten-Modus eine Bombe geholt werden in die Hand, mit der Sachen
  abgerissen werden können. Dann sind die Elemente, welche abgerissen werden
  sollen, als Ghost markiert."_ Rechtsklick (auf dem Glas `B`) hängt eine
  Bombe aus dem Regal an den Haken (`platformer/neutral/bomb.glb`) und legt
  sie beim zweiten Mal wieder weg. Solange sie hängt, wird das Ding unter dem
  Kran rot und durchscheinend (`markBombTarget`), und Linksklick, `E` oder
  `A` reißt genau das ab — für alle in der Sitzung (`removeProp` mit
  `share`). Ein hingestelltes Modell verliert dabei auch seine Zeile in der
  Liste der Weltänderungen (`worldChanges.forgetChange`); was schon zur Welt
  gehörte, steht darin nicht als Abriss. Nur im _Baukasten_, nur als Kran,
  nur mit leeren Klauen (`bombAllowed`); Gebautes aus dem Grundriss und die
  Möbel der Küche sind keine Gegenstände und bleiben stehen.
- **Nur lokal.** Mitspieler sehen weiter den Koch; der Modus geht nicht über
  die Leitung.
- **Keine Physik** (`PortalWorld.updateCraneFlight`). Gewünscht war: _„als Kran
  will ich keine Physik haben, also auch durch Wände und über Arbeitsplatten
  fliegen können."_ Das ist der kollisionsfreie Körper des Konstrukt-Raums
  (`PhysicsLocomotion.ghost`), jedes Bild neu gesetzt, weil jedes `resync` ihn
  abschaltet. **Das Ende ist die Arbeit**: Wer über dem Herd aufhört, Kran zu
  sein, stünde im Herd. Zurück geht es in die stehen gebliebene Figur
  (siehe oben); steht dort inzwischen etwas, sucht `PhysicsLocomotion.land` in Ringen
  (`playerClearance.landingOffsets`, bis 3 m) die nächste Stelle, an der die
  Kapsel frei steht und Boden unter sich hat — gegen alles Feste, nicht gegen
  Gegenstände, die ohnehin weichen. Findet sich keine, geht es zurück an den
  Ort, an dem man zum Kran wurde. Geprüft mit echtem Rapier
  (`playerGhost.test.ts`): bleibt auf freiem Boden stehen, landet neben der
  Küchenzeile und nicht in ihr, findet über dem Rand der Welt nichts.
- **Gemeint ist, was unter dem Kran liegt** (`PortalWorld.pickBody`,
  `CRANE_TOUCH`). Ohne Vorn gibt es keinen Strahl aus der Brust; `pickUsable`
  bekommt keine Richtung und nimmt nur, was die Stelle unter dem Kopf
  überdeckt. Dorthin hängt auch das Getragene (`screenCarry`, Ansicht
  `crane`; in der Küche `carryInHands`), und die Küche setzt auf der Kachel
  darunter ab statt auf der vor den Füßen (`showGhost`, `tileAhead` ohne
  Vorlauf) — Saum, Taste und Ablage meinen dieselbe Stelle.
- **Ein Kreis am Boden** (`buildCraneMark`, `PortalWorld.updateCraneMark`)
  zeigt diese Stelle, solange dort nichts hervorgehoben ist: Leuchtet ein Ding,
  sagt der gelbe Saum schon alles, und trägt der Kran ein Modell aus dem Regal,
  zeigt das Gitter die Kacheln (`updatePlaceGrid`). Er liegt über allem
  (`depthTest` aus), fängt keinen Strahl und wirft keinen Schatten.

**Wechseln im _Baukasten_ hängte die Seite auf** (`portal/shelfSwap.ts`,
`PortalWorld.letGo`). Wer ein Stück aus dem KayKit-Regal in der Hand hatte und
ein anderes wählte, ließ das alte los — und Loslassen ohne Schwung **ist**
Hinstellen (`gridSnap.placesOnGrid`). Das alte rastete ein, holte als frisches
Katalogstück seine nächste Kopie (`placedFromShelf`), die warf das neue
hinaus, das holte seinerseits nach, Mikrotask um Mikrotask. Jetzt gilt: **Ein
frisches Stück war nie hingestellt** — es ist der Pinsel und verschwindet beim
Wechseln, ohne Zeile in der Liste der Weltänderungen; alles andere fällt wie
bisher. Dasselbe in der Küche (`KitchenZone.scrapFresh`): Mit einem frischen
Möbel in den Händen gab der Katalog vorher nichts her, und das Regal machte
daraus ein Fass neben dem getragenen Herd. Geprüft wird die Regel samt
Gegenprobe (die alte Regel hört nie auf) in `shelfSwap.test.ts`.

**_Zurücksetzen_ setzt alles zurück** (Menü, vorher _Labor zurücksetzen_;
`PortalWorld.resetEverything`, seit September 2026): Portale, Gegenstände und
NPCs wie bisher — und dazu der im Gerät gespeicherte Umbau
(`GridWorld.forgetStored` → `worldStore.forgetWorld`), die Liste der
Weltänderungen und alles, was aus dem Regal hingestellt oder verschoben wurde:
Die Welt wird frisch geladen (`WorldContext.reload` → `App.reloadWorld`). `R`
am Schirm und die zweite Taste in der Brille bleiben beim kleinen
Zurücksetzen, damit ein verirrter Tastendruck keinen Umbau löscht. Ein alter
gespeicherter Umbau war auch der Grund für den grauen Estrich über der Küche
in der Handy-App (die App hat ihren eigenen Speicher): Er brachte den Estrich
auf der Höhe von vor „Küche auf null" mit, zwei Zentimeter über dem Belag.
`floorPlate.underKitchenFloor` blendet deshalb auch einen Estrich bis
`UNDER_FLOOR_REACH` (3 cm) über dem Belag aus.

**Was aus dem Regal hingestellt wird, hat eine Haltung**
(`worlds/portal/modelStance.ts`, seit September 2026). Vorher war jedes
Modell ein Fass mit Physik, und eine im _Baukasten_ gestellte Wand kippte um
wie eines. Jetzt sagt der Dateiname (und für namenlose Wände die Form über
`gridSnap.wallAxis`), was es ist:

- **Bau** — Wand, Boden, Säule, Tür, Fenster, Zaun, Treppe: steht fest und
  lässt sich **nur im _Baukasten_** umsetzen (`gameMode.movesStructure`). Im
  _Einrichten_ wird eingerichtet, nicht umgebaut. **Wände schließen an**
  (`props.WALL_OVERLAP`, seit September 2026): Die KayKit-Wände haben an den
  Enden eine 45°-Fase von 5 cm, und zwei gerade Stücke Stoß an Stoß ließen
  eine V-Kerbe offen. Das Bild jeder Wand (dünn, lang, hoch — `gridSnap.wallAxis`)
  wird deshalb an beiden Enden um 5 cm verlängert, die Fasen schieben sich
  ineinander. Körper, Einrasten und Kachelzahl bleiben beim gemessenen Maß;
  ein freies Wandende steht dafür 5 cm über — so gewollt.
  **Bodenstücke liegen im Boden, nicht darauf** (`modelStance.isFloorPiece`,
  `PortalWorld.sinkFloor`, seit September 2026): Bau mit `floor`/`road` im
  Namen und flacher als breit wird beim Hinstellen **bündig** mit seiner
  Lauffläche auf die Höhe des Grundrisses gesetzt (`floorTopAt`,
  `shared/floorCover.ts`) und als fester Körper festgemacht; eine Stachelfalle
  zählt ohne ihre Stacheln (`props.ModelBlueprint.tread`). Die Prototyp-Platten
  darunter gehen aus dem Bild (`GridWorld.coverFloor`, `PlateFloor.reseat`) und
  kommen zurück, sobald das Stück aufgehoben, abgerissen oder weggeräumt ist.
  In der Küche liegt es 4 mm über null, knapp über ihrem Belag
  (`floorPlate.KITCHEN_PIECE_LIFT`). Estrich und Bodenkacheln unter dem
  Küchenbelag werden gar nicht gezeichnet (`GridWorld.underOwnFloor`,
  `floorPlate.underKitchenFloor`) — zwei Millimeter Abstand hielt nicht jeder
  Tiefenpuffer auseinander, und der graue Estrich lag dann über den Fliesen.
- **Möbel** — Tisch, Vorratskiste, Küchenzeile, Herd, Kühlschrank, Regal,
  Bett, Stuhl: steht fest und lässt sich wie jedes Möbel im _Einrichten_ und
  im _Baukasten_ umstellen, beim _Spielen_ nicht.
- **Lose** — Fass, Teller, Topf, Essen: Physik wie bisher, in jedem Modus
  greifbar.

„Fest" heißt: Drehung und waagerechte Verschiebung sind gesperrt, die
Schwerkraft nicht (`PortalWorld.applyStance`). Ein Möbel wird in Handhöhe
losgelassen und sinkt senkrecht auf das, was darunter liegt; ein Körper vom
Typ _fest_ bliebe dort in der Luft hängen. Frisch aus dem Regal Genommenes ist
von der Modussperre ausgenommen (`shelfFresh`) — es liegt ja schon in der Hand.
Die Förderbänder und die übrigen Möbel der Küche selbst sind ohnehin feste
Körper (`TestWorld.addSolid`).

**Der rote Umbauknopf schaltet denselben Modus** (_Küche umbauen_ →
Einrichten, _Küche nutzen_ → Spielen), und die Küche fragt je Bild nur ab,
was gilt (`kitchen.syncMode`). Zwei Schalter mit je eigenem Zustand liefen
beim ersten Druck auf den jeweils anderen auseinander. Gespeichert wird der
Modus **nicht**: Jede Sitzung fängt mit _Spielen_ an.

**Die Liste der Weltänderungen** (`core/worldChanges.ts`, Menü
_Weltänderungen_) ist dafür da, Umgestelltes weiterzugeben — einrichten,
_Kopieren_, in den Chat einfügen. Ein Häkchen schaltet das Mitschreiben ein;
_Einfügen_ stellt eine kopierte Liste in der Welt nach (Zwischenablage, sonst
ein Textfeld), _Liste leeren_ fängt neu an, und **_Alle Änderungen
zurücksetzen_** (seit September 2026, gewünscht: _„bei Welt Tracking fehlt mir
die Option alle meine Änderungen zurück zusetzen, ich habe nur Liste
leeren"_) ist dasselbe wie _Zurücksetzen_ im Menü (`resetEverything`): Umbau
vergessen, Liste und Zettel leer, die Welt frisch geladen, wie sie
ausgeliefert wird. Drei Entscheidungen:

- **Eine Bilanz und kein Protokoll.** Dreimal umgestellt ist einmal
  umgestellt; wer ein Möbel an seinen alten Platz zurückstellt, hat nichts
  geändert, und die Zeile geht wieder.
- **Die Zahlen des Aufbaus.** Ein Küchenmöbel steht als
  `{"kitchen":"stove-pan","from":[3,0,0],"to":[8,5,2]}` darin: Kachel `x`,
  `z` und Viertelumdrehungen relativ zur Küche, also genau das, was in
  `kitchenPlan.KITCHEN_SPOTS` steht. `from: null` heißt: neu aus dem
  Katalog. Modelle aus dem Regal stehen mit Weltmetern und Grad darin —
  und seit September 2026 **mit ihrer Welt**:
  `{"model":"block-bits/barrel.glb","at":[3.5,0.35,7.5],"yaw":90,"world":"test-restaurant"}`.
  Ein Punkt in Weltmetern sagt ohne die Welt nichts; `world` ist die Kennung
  aus dem Verzeichnis (`worlds/index.ts`, dieselbe wie `net.world`). Alte
  Listen ohne `world` lesen sich weiter. Zettel stehen mit Text darin (siehe
  [Zettel](#zettel-beschriften-was-man-baut)).
- **Bei jedem Start der Seite leer** (Oktober 2026, gewünscht: _„liste der
  welt änderungen bei jedem start der seite leeren"_): Beim Laden fällt
  alles weg, was eine frühere Sitzung mitgeschrieben hat — wie _Liste
  leeren_. Im Browser gespeichert bleiben nur das Häkchen und die Zettel,
  deren einziger Speicher die Liste ist.

**Und wo man stand** (`PlayerView`, Oktober 2026, gewünscht: _„wenn die
aktuelle spieler position und camera einstellung mitkopiert werden (aber
nicht berücksichtigt beim einfügen (oder bzw. checkbox …, default false),
damit ich dir debug szenarien besser senden kann"_): _Kopieren_ schreibt vor
das JSON eine Zeile

```
Spieler: {"at":[8.4,0,-33.1],"yaw":180,"world":"hausbau","camera":{"turn":45,"zoom":14.26}}
```

— die Füße der Figur in Weltmetern, ihre Blickrichtung in Grad, die Welt und,
von oben, die Kamera (`TopDownCamera.viewState`: Drehung des Bildes in Grad,
links herum, und Abstand in Metern). Sie ist keine Änderung und steht nicht
in der Liste; mit ihr lässt sich auch eine leere Liste kopieren. Übernommen
wird sie beim Einfügen nur mit dem Häkchen **_Spieler & Kamera mit
einfügen_** (`pastingView`, ab Werk aus, nicht gespeichert) und nur in
derselben Welt: Die Figur springt hin (`movePlayerTo`), die Kamera dreht und
zoomt ohne Fahrt (`setViewState`, über `WorldContext.topDownView`).

Beim Einfügen wird ein umgestelltes Möbel an seiner alten Kachel gesucht und
über dieselben Handgriffe wie von Hand umgesetzt (`kitchen.applyChange`), in
zwei Durchgängen, damit getauschte Plätze aufgehen. Was schon dasteht, zählt
als erledigt; ein Modell, das schon an derselben Stelle steht, wird nicht
doppelt hingestellt. **Eine Zeile aus einer anderen Welt** (`world` gesetzt
und nicht die, in der man steht) wird nicht eingefügt, die Meldung zählt sie
mit (`… · 2 aus einer anderen Welt`); Zeilen ohne Welt gelten wie bisher hier.

**Was aus dem Regal hingestellt wurde, übersteht kein Neuladen.** Das ist
nachgesehen (September 2026): Gespeichert wird nur der Grundriss
(`grid/worldStore.ts`, `keepWorld` schreibt den `GridPlan`), und seit Oktober
2026 fängt auch die Liste der Weltänderungen bei jedem Start leer an. Wer
nach dem Neuladen weiterbauen will, kopiert die Liste vorher und fügt sie
danach wieder ein (_Einfügen_). Die einzige Ausnahme sind die Zettel.

## Zettel: beschriften, was man baut

Gewünscht war, als das Test Restaurant leer wurde, um es aus dem Modellregal
neu aufzubauen: _„Ermögliche es mir, dass ich ein Post vor Felder hinzustellen
kann und einen Text drauf schreiben kann durch interagieren. Das soll auch in
Welt Änderungen getrackt werden können."_ Gemeint sind **Post-its**: Der
Besitzer baut aus dem Regal, stellt Zettel dazu — _„Kartoffel-Vorrat hier"_ —,
kopiert die Liste der Weltänderungen und schickt sie jemandem, der daraus
Spielelemente macht. Der Zettel sagt dem Leser, was der Haufen Modelle daneben
sein soll.

**Holen**: Im **Modellregal** steht vorn die Kachel _Zettel_, dazu dieselbe
Zeile im Menü _Weltänderungen_ (`PortalWorld.noteEntry`, `takeNote`). Danach
ist es derselbe Weg wie mit jedem Modell aus dem Regal: in die Hand, an den
Kran, `R` dreht, Ablegen rastet auf das Kachelgitter ein, auf einem Tisch oder
einer Theke steht er obendrauf (`conjureModel` → `spawnModel` mit Text). Also
am Schirm, auf dem Telefon und in der Brille. Nicht mit dem Pinsel, nicht als
Fläche, nicht mit _Rückgängig_, und im _Baukasten_ kommt nach dem Hinstellen
kein zweiter Zettel nach — zwanzig gleiche Zettel sagen nichts. _Kopieren_
(die Pipette) auf einen Zettel gibt einen neuen mit demselben Text.

**Aussehen** (`worlds/notes/notePost.ts`): Das Gestell ist die Menükarte des
Restaurant-Pakets (`NOTE_MODEL`, `restaurant-bits/menu.glb`), aus dem Regal wie
alles andere. Obendrauf liegt ein gelbes Blatt mit Klebestreifen, 0,7 × 0,5 m,
**gerechnet** — eine Fläche mit Leinwand, denn kein Modell hat eine Fläche,
auf die man schreiben kann, und ein Zettel ist eine Beschriftung, kein Möbel.
Es liegt 70° aus der Senkrechten nach hinten gekippt (`TILT`): Gelesen wird
meist von oben, als Kran, und dort wäre ein senkrechtes Schild ein Strich. Die
Oberkante des Textes zeigt bei Drehung 0 nach Norden, also oben im Bild. Die
Schrift ist so groß, wie der Text es erlaubt (`noteText.fitNote`, 120 bis
28 px auf 512 px), und trennt Wörter nur, wenn es gar nicht anders geht.

**Kein Hindernis.** Ein Zettel ist kein Stück Bau: Er sperrt keine Zelle des
Gitters (`placedModels` lässt ihn aus, also auch keine Wand, keine Fläche zum
Daraufstellen und kein Geist von oben), er ersetzt keine Wand beim
Hinstellen, und Spieler und NPCs gehen durch ihn hindurch
(`PhysicsWorld.setGridWall`). Einen Körper hat er trotzdem — um Gestell und
Blatt gemessen, damit der Kran ihn in Hüfthöhe zu fassen bekommt — und der
steht fest, wo er hingestellt wurde (`hang`). Umgestellt wird er wie ein
Möbel: im _Einrichten_ und im _Baukasten_, beim _Spielen_ nicht.

**Beschriften** (`editNote`, `writeNote`): Frisch hingestellt geht sofort die
Tastatur der Welt auf (`askLines`, `ui/KeyPanel.ts`, Belegung `lines` mit
Umlauten). Später schreibt man um, indem man ihn benutzt — `A`, `E` oder der
Trigger (`addUsable`), und zwar am Schirm beim **_Spielen_**: Als Kran heißt
`E` auf einem Ding _aufheben_ (`liftUnderCrane`), und das bleibt so. In der
Brille zielt die Hand darauf und zieht den Trigger — **nur den Trigger**, nicht
schon das Hineinfassen (`NOTE_INTERACTION`) — angefasst wird ein Zettel mit der
Greif-Taste zum Umstellen, und dabei soll keine Tastatur aufgehen. Am Schirm tippt
die echte Tastatur hinein; **in der Brille** zeigt man auf die Tasten der
Tafel, und auf der Quest kommt, wo es sie gibt, die Systemtastatur dazu
(`core/systemKeyboard.ts`). Höchstens 200 Zeichen (`NOTE_MAX_CHARS`),
Ränder und doppelte Leerzeichen gehen weg (`cleanNoteText`).

**Wegwerfen**: leer schreiben und _Fertig_ — oder im _Baukasten_ die
Abrissbombe (Rechtsklick, dann auf den Zettel), in der Brille das scharfe
Löschen. Beides streicht auch seine Zeile. _Abbrechen_ lässt ihn, wie er war.

**In der Liste** steht er als eigene Sorte, unter einem Schlüssel je Zettel
(`changeKey('note')`), und wie alles dort als Bilanz: Umstellen und
Umschreiben ändern dieselbe Zeile.

```
Weltänderungen · 2 · kitchen: … · model: … · note: ein Zettel mit Text, Lage wie model · world: …
Zettel „Kartoffel-Vorrat hier" bei (3.5, 0.3, 7.5) · 90° · in test-restaurant
[
{"model":"block-bits/barrel.glb","at":[4.5,0.35,7.5],"yaw":0,"world":"test-restaurant"},
{"note":"Kartoffel-Vorrat hier","at":[3.5,0.3,7.5],"yaw":90,"world":"test-restaurant"}
]
```

Die Sätze über dem JSON sind für den Leser (`describeNote`); zurückgelesen
wird nur das JSON, und dessen Anfang sucht `parseChanges` jetzt zuerst an
einem Zeilenanfang — im Text eines Zettels darf also auch eine eckige Klammer
stehen. `at` ist die Mitte von Gestell und Blatt, in Weltmetern.

**Drei Abweichungen vom Rest der Liste, alle mit Absicht:**

- **Ein Zettel wird auch ohne Häkchen mitgeschrieben** (`recordNote`). Er ist
  für die Liste da, und die Liste ist sein Speicher. Ein Zettel **ohne Text**
  bekommt dafür gar keine Zeile.
- **_Liste leeren_ lässt die Zettel stehen**; nur _Zurücksetzen_ nimmt sie mit
  (`clearWorldChanges({ notes: true })`). Wer nach dem Kopieren neu anfängt,
  soll nach dem nächsten Neuladen nicht vor einer unbeschrifteten Welt stehen.
- **Er übersteht das Neuladen** — anders als die Modelle daneben (siehe oben).
  Beim Betreten einer Welt stellt `PortalWorld.restoreNotes` die Zettel dieser
  Welt wieder auf (`worldChanges.notesIn`, nur mit passendem `world`), fest an
  ihrer Stelle und unter ihrem alten Schlüssel. Gefragt wird im ersten Bild,
  nicht im Aufbau: Welche Welt das ist, sagt die Sitzung erst nach `init`
  (`App.goTo` → `net.setWorld`), vorher steht dort die vorige. Ändert sich die
  Antwort, gehen die aufgestellten wieder (ohne ihre Zeilen), und die richtigen
  kommen. _Einfügen_ stellt Zettel aus einer kopierten Liste ebenfalls auf,
  wenn sie in diese Welt gehören; einer, der mit demselben Text schon an der
  Stelle steht, kommt nicht doppelt.

**Nur auf diesem Gerät.** Modelle aus dem Regal gehen über die Leitung
(`PortalSync`, `spawn`), Zettel nicht: Drüben käme nur das Gestell an, ohne
Text, und für den Text gibt es keine Nachricht. Ein Zettel ist deshalb wie
die Stücke, die eine Welt selbst aufstellt, lokal (`createSync`, `local`) und
auch nicht in der Beutelware, die das kleine Zurücksetzen (`R`) wegräumt.
Soll er geteilt werden, braucht es eine eigene Nachricht mit dem Text —
die Schilder (`worlds/signs/SignRoom.ts`) zeigen, wie.

**Geprüft** in `core/worldChanges.test.ts` (Zeile mit Welt, alte Liste ohne,
Umschreiben ist dieselbe Zeile, Wegwerfen streicht sie, Satz und JSON beim
Kopieren, nur die Zettel der betretenen Welt, _Liste leeren_, Speichern und
Wiederlesen) und `worlds/notes/noteText.test.ts` (Aufräumen, Umbruch,
Schriftgröße).

## Flächen setzen im Baukasten

**Ein Rechteck ziehen, und auf jede Kachel kommt eine Kopie**
(`worlds/portal/areaPaint.ts` rechnet, `areaPad.ts` sind die Knöpfe,
`PortalWorld.updateAreaPaint` setzt ein). Gewünscht: „so ein bisschen die Idee
wie bei City Skylines, dass ich zum Beispiel den Küchenboden wählen kann und
sagen kann: Ich möchte von Position 1–2 … den Küchenboden setzen und möchte das
dann bestätigen." Stück für Stück hinzustellen geht im _Baukasten_ schon
lange (das nächste liegt nach jedem Ablegen in der Hand); für einen Boden von
zehn mal zehn Kacheln ist das aber hundertmal Zielen.

**Wann es die Leiste gibt**: im _Baukasten_, am Schirm oder auf dem Telefon,
mit einem **Modell aus dem Regal** in der Bildschirmhand (`areaBrush`). Dann
steht oben in der Mitte _▦ Fläche_ (auf dem Telefon unten, oben links wohnt
die Positionsanzeige). In der Brille nicht — dort gibt es keinen Zeiger über
einem Bild, und die Leiste ist DOM. Ein Küchenmöbel, das in der Küche aus dem
Katalog zum funktionierenden Möbel wird (`takeFurniture`), ist kein Modell und
bekommt sie auch nicht: Es hat eine Heimatkachel, und hundert Herde mit
Heimatkachel sind eine andere Frage.

**Das Stück in der Hand ist der Pinsel.** Es bleibt in der Hand, und jede
Stelle der Fläche bekommt eine Kopie in **seiner** Drehung — gedreht wird
also wie bisher, bevor man zieht. Gesetzt wird über denselben Weg wie eine
eingefügte Liste der Weltänderungen (`placeModelAt`, früher nur
`placeModelChange`): mit Id im Netz, mit Zeile in der Liste, und was genau
dort schon steht, kommt nicht doppelt hin. Die Kopien entstehen eine Handbreit
über dem Boden, auf dem man steht, und fallen das letzte Stück.

**Zwei Wege zu denselben zwei Ecken** (`AreaSelect`), und beide gehen auf
beiden Geräten:

- **Ziehen**: drücken, ziehen, loslassen. Das ist der Weg der Maus.
- **Tippen**: Ein Druck, der auf seiner Kachel losgelassen wird, ist die erste
  Ecke; der nächste Tipp die zweite (wer dabei zieht, schiebt sie noch mit).
  Das ist der Weg des Fingers. Zweimal dieselbe Kachel ist eine Kachel.

Die Maus zeigt schon vor dem ersten Klick, welche Kachel es würde. Solange
_Fläche_ an ist, liegt über dem Bild eine Zeichenfläche, die jeden Druck
abfängt, bevor die Steuerung ihn als Blick, Ablegen oder Schuss liest; die
Maus wird dafür aus dem Fang gelassen (`exitPointerLock`). Laufen geht am
Schirm weiter mit den Tasten; auf dem Telefon liegen die Stöcke unter der
Zeichenfläche, also erst _Beenden_, dann laufen.

**Ab mehr als vier Kacheln wird gefragt** (`AREA_CONFIRM`, gezählt werden die
Kacheln des Rechtecks): _4 × 3 = 12 Kacheln · 3× Floor Kitchen setzen?_ mit
_Bestätigen_ und _Abbrechen_ — am Schirm auch `Enter` und `Esc`. Darunter wird
sofort gesetzt; wer eine Kachel antippt, will nicht jedes Mal bestätigen.
`Esc` nimmt erst eine halbe Auswahl zurück und beendet beim zweiten Mal den
Modus. Mehr als **400** Stücke (`AREA_MAX`) setzt eine Fläche nicht — jedes
ist ein Körper der Physik und ein Eintrag im Netz, und so eine Fläche war fast
sicher ein verrutschter Finger.

**Welche Stellen eine Fläche hat** (`areaPlan`), nach denselben Regeln wie das
Einrasten einzeln (siehe
[Was hingestellt wird, rastet auf dem Kachelgitter ein](assetregal.md)):

- **Was auf Kacheln steht**, wird Reihe für Reihe ausgelegt, Schritt so groß
  wie seine Grundfläche: eine Bodenplatte von einer Kachel auf jede, der
  Küchenboden des Restaurants (zwei mal zwei) auf jede zweite. Was nicht mehr
  ganz ins Rechteck passt, kommt nicht hin; eines kommt immer.
- **Eine Wand** kommt nicht **in** die Fläche, sondern um sie **herum**: Das
  Rechteck bekommt seinen Rand auf den Fugen, die Wände quer dazu um eine
  Vierteldrehung gedreht. Ein Rechteck von nur einer Reihe wird eine gerade
  Wand an seiner Nord- oder Westkante. Zwanzig Wände nebeneinander wären keine
  Absicht; ein Raum ist eine.

Die Vorschau ist das Gitter unter dem Getragenen (`PlaceGrid`), nur mit
höherer Grenze (`AREA_PREVIEW`, 1 600 statt 64 Kacheln): leuchtende Kacheln,
bei Wänden die Kantenstücke.

### Wand ziehen wie in _Die Sims_

Gewünscht (September 2026): _„man wählt eine Wand aus, und einen Startpunkt
und zieht z.B. mit der linken Maustaste (oder durch links klick den Start
Punkt bestätigen …) und zieht dann die Wand wohin man die haben will, während
man noch nicht den Endpunkt bestätigt hat sieht man eine Vorschau der ghost
Wall."_

- **Von selbst an**: Wer im _Baukasten_ (und mit einer Wand aus dem Katalog
  auch beim _Spielen_ und _Einrichten_, siehe unten) eine Wand in die Bildschirmhand nimmt
  (Katalog → _Wände_, _Türen_ oder _Fenster_, oder eine Wand aus den
  Rohmodellen), ist sofort in _Wand ziehen_ (`areaAuto`) — einmal je Wand in
  der Hand. `Esc` beendet es, und dieselbe Wand setzt der Kran dann wieder
  einzeln; _▦ Wand ziehen_ an der Leiste schaltet es wieder an.
- **Linie oder Raum**: Mit einer Wand in der Hand hat die Leiste einen Knopf
  mehr (`AreaShape`). _╱ Linie_ (vorgegeben) zieht von Ecke zu Ecke, _▭ Raum_
  zieht wie bisher ein Rechteck mit Wand rundum.
- **Ecken statt Kacheln** (`areaPaint.cornerAt`, `PortalWorld.cornerUnder`):
  Eine Wand steht auf der Fuge, ihre Enden liegen dort, wo sich Fugen kreuzen.
  Vor dem ersten Druck leuchten die vier Kacheln um die Ecke unter der Maus.
- **Die Richtung rastet auf das nächste Achtel** (`wallLine`): gerade oder
  unter 45°. Ein schiefer Zug gibt die Wand, der er am nächsten ist, keine
  Treppe. Gerade kommen ganze Stücke aneinander und bei ungerader Länge am
  Ende das halbe (`elementCatalog.wallHalfOf`); ohne halbes Stück
  (Durchgänge) endet die Wand eines früher. Schräg kommt je `tileSpan / 2`
  Kacheln ein ganzes Stück, gekürzt auf die Diagonale wie einzeln
  (`fitWall`).
- **Die Geisterwand** (`placeGhost.WallGhosts`): je Stück eine grüne,
  durchscheinende Kopie des Getragenen, auf das halbe Stück und die Schräge
  gestreckt, solange der Endpunkt nicht bestätigt ist. Darunter leuchten die
  Fugen (gerade) oder die Kacheln (schräg); an der Leiste steht die Länge in
  Metern und die Zahl der Stücke.
- **Loslassen setzt**, ohne Nachfrage — oder, getippt, der zweite Tipp. Jedes
  Stück geht über `placeModelAt`, ersetzt also eine Wand, die auf derselben
  Fuge schon stand (`replaceWalls`), und die ganze Linie ist **ein** Schritt
  für _Rückgängig_. Danach fängt die nächste Wand gleich wieder beim
  Startpunkt an.

- **Im Katalog nur kurze Stücke** (September 2026): _Wände_ hat die halbe
  Prototyp- und Putzwand, _Fenster_ das schmale Fenster — _„Im Wand zieh
  Modus werden wir eh lange Wände ziehen."_ Gezogen wird trotzdem mit dem
  langen Stück dazu (`elementCatalog.wallFullOf`, `PortalWorld.drawnWall`):
  lange Stücke aneinander, am ungeraden Ende das kurze.
- **Außer beim Fenster** (September 2026, gemeldet: _„fenster über zwei
  felder scheinen das fenster nicht breiter zu machen"_): Das lange
  `Wall_Window_Closed` hat dasselbe Fenster (0,8 m) wie das schmale, nur mit
  mehr Wand drumherum. Ein Fenster wird deshalb Kachel für Kachel aus dem
  schmalen gezogen (`wallFullOf` gibt `null`); die Rahmen stoßen zu einem
  Fensterband aneinander, zwei Kacheln sind ein Doppelfenster.
- **Die Wand sitzt quer mittig auf der Fuge** (`props.modelPropShape`):
  Gemittelt wird längs und in der Höhe nach der Hülle, quer aber nach dem
  Ursprung der Datei. Die Prototypwände tragen ihre Flecken nur auf einer
  Seite (0,28 statt 0,25 Quelleinheiten); nach der Hülle stand jedes Stück
  7,5 mm daneben, und zwei Nachbarn, einer um 180° gedreht, sprangen um
  1,5 cm — gemeldet als _„keine saubere grade Wand, sondern eine
  Einrückung"_. Die Fensterwand selbst hat einen Rahmen, der 5 cm tief
  eingelassen ist; beim schmalen Fenster reicht er über das ganze Stück.
- **Eine lange Wand wird geteilt, wenn ein kürzeres Stück einen Teil von ihr
  ersetzt** (`wallRests`, `restoreWallRests`): Ein schmales Fenster in einer
  langen Wand nimmt nur seine Fuge, auf der anderen bleibt ein halbes Stück
  stehen — im selben Schritt für _Rückgängig_. Ein Teilstück mit der
  Abrissbombe entfernen geht noch nicht: Sie reißt das ganze Stück ab.
  Muss der Rest erst geladen werden, kommt er nur, wo dann noch frei ist
  (`placeModelAt(…, onlyIfFree)`) — gemeldet: _„wenn ich fenster über mehrere
  bereiche hinweg legen will, wird eine wand falsch unterbrochen"_. Ein
  gezogenes Fensterband setzt Kachel für Kachel; der Rest neben dem ersten
  Fenster kam an, als auf seiner Fuge schon das nächste stand, und ersetzte
  es.
- **Fest auf der Etage, auf der man steht** (`buildFloorY`) — gezogene Wände
  und die Wand rundum fallen nicht, sondern stehen, wo der Geist stand, auch
  über einem Loch ([Hausbau](./hausbau.md#treppen-und-etagen)).
- **Eine Tür trägt man mit der Vorderseite zu sich** (`isDoorModel`), wie ein
  Möbel im Spielmodus: _„Wenn ich eine Tür halte soll die bei mir in Richtung
  south immer ausgerichtet sein."_

- **Auch beim _Spielen_ und _Einrichten_** (September 2026, gewünscht:
  _„Beim spielmodus als auch einrichtungs modus will ich es bei "Wand"
  platzierungen so handhaben, dass im katalog es funktioniert wie im
  baumodus."_), aber **ohne Leiste und ohne Zeiger**
  (`gameMode.wallDrawOnly`, `PortalWorld.carryLineBrush`): _„mit der maus
  bzw. aus den augen kann ich mich aber normal weiterbewegen und co, mit dem
  wand gegenstand setze ich ja nur sogesehen start und endpunkte."_ Eine Wand
  **frisch aus dem Katalog** (`shelfFresh`) bleibt sichtbar in der Hand und
  zielt: Die Ecke unter ihr (`carriedCorner`) ist der Punkt. Interagieren
  (Klick, `E`, `A`) setzt den Startpunkt, danach zieht die Geisterwand vom
  Startpunkt bis zur Ecke unter dem Getragenen über die Fugen, und der
  zweite Druck setzt sie (`pressCarryLine` → `commitWallLine`). Zweimal
  dieselbe Ecke nimmt den Startpunkt zurück. Danach ist die Hand **leer**
  (`spendBrush`, verschwindet wie beim Wechseln über `letGo`) — _„nur im
  baukasten modus erhalte ich dann erneut eine wand in der "hand"“_. Die
  Maus bleibt gefangen, Blick und Laufen gehen weiter; der gewöhnliche Geist
  des Einzelstücks bleibt dabei weg.
- **Pfeiler statt Block, und der Pfeiler wandert mit** (September 2026,
  gewünscht: _„Ich habe vor dem setzen einen pfeiler in der hand (klein) und
  ich sehe den ghost pfeiler wo er hinkommen würde. Beim platzieren des
  startpunktes, will ich dann keinen ghost pfeiler mehr sehen, sondern nur
  noch die ghost wand … und ich sehe einen ghost pfeiler wo es aktuell enden
  würde."_): In der Hand ist die gezogene Wand ein kleiner Pfeiler
  (`handPost`, `HAND_POST` im Quadrat, halbe Höhe, nur das Bild —
  `shrinkScreenCarry` mit Achsen). Ein Geist-Pfeiler (`postGhostSlot`,
  `START_POST`, volle Höhe) steht immer dort, wo der nächste Punkt landen
  würde: vor dem Startpunkt auf der Ecke unter dem Getragenen, danach am
  Ende der Linie (`WallLine.end`), und dazwischen die Geisterwand
  (`showLinePreview`). **Kein Bodengitter um den Pfeiler**; unter der Linie
  leuchten die Fugen, unter einer schrägen der Strich quer durch jede Kachel
  (`WallLine.slants` → `PlaceGrid.showSlants`, `showLineGrid`) statt ganzer
  Kacheln. Gilt für alle drei Modi. Der Geist rechnet das kleinere Bild in
  der Hand zurück (`ghostFix`) — **auch in der Höhe**: Vorher übernahm er die
  halbe Höhe des Pfeilers in der Hand und stand um die Mitte der echten Wand,
  also in der Luft (gemeldet: _„die ghost pillars … schweben in der Mitte der
  Luft"_). Und er rechnet gegen das Maß von **jetzt** (`PlaceGhost.show`
  übernimmt es in die Kopie), nicht gegen das beim ersten Zeigen.
- **In der Brille** (`carryLineBrush` in jedem Modus, auch im _Baukasten_,
  weil es dort keine Leiste gibt): Die Wand mit der Greif-Taste festhalten,
  `A`/`X` **der Faust, die sie hält**, setzt Start- und Endpunkt
  (`showCarryLine`); der Knopf der Figur wird dabei abgeholt, damit sie
  weder springt noch benutzt, was vor ihr steht. Loslassen der Greif-Taste
  stellt die Wand einzeln hin wie bisher.
  **Umfärben heißt: dieselbe Linie mit einer anderen Wand noch einmal ziehen.**
  Alle Wände sperren gleich, sie sehen nur anders aus; eine neue ersetzt die
  alte auf derselben Fuge. In der Brille gibt es _Wand ziehen_ noch nicht (keine
  Leiste, kein Zeiger über dem Bild).
- **Wände abreißen wie Wände ziehen** (September 2026, gewünscht: _„eine
  wall mit disallowed icon, was eigentlich funktioniert wie eine wand setzen,
  nur bei der auswahl würde dann die entsprechende wand gelöscht werden,
  sodass ich wände abreißen kann"_): Im Katalog unter _Haus_ steht hinter
  Wand, Tür und Fenster _Wand abreißen_ — im Bild die zerbrochene Wand
  (`elementCatalog.WALL_ERASER_PREVIEW`), mitten darauf groß das rote
  Verbotszeichen (`FurnitureFolder.erasers`, `MenuEntry.mark` `forbidden`).
  Gezeigt wird bewusst nicht dieselbe Datei wie _Wand_: Die Vorschauen im
  Raster gehen nach Vorschau-Id (`ui/PagePreviews.ts`), und zwei Kacheln mit
  derselben Id bekommen nur ein Bild — die _Wand_ blieb leer. Genommen wird sie
  wie jede Wand und gezogen auf demselben Weg, in allen drei Modi und in der
  Brille; nur **Linie**, kein _Raum_ (`PortalWorld.wallErasers`). Die Linie
  geht Kachel für Kachel, ihr Geist ist rot, und rot leuchten auch die
  Wände, die sie wegnimmt (`wallsOnLine`, dieselbe Fugenrechnung wie
  `wallsUnder`, nur auf der Etage, auf der man steht, ohne Bilder).
  Bestätigt reißt `eraseWallLine` sie ab wie die Bombe: Von einer langen
  Wand, die nur halb auf der Linie liegt, bleibt die andere Hälfte als
  kurzes Stück stehen (`wallRests`), und alles ist **ein** Schritt für
  _Rückgängig_. Die Wand zum Abreißen wird selbst nie hingestellt —
  losgelassen verschwindet sie (`release`), und im _Baukasten_ bleibt
  _Wand ziehen_ für sie immer an. Im Hausbau geht mit einem aufgebrochenen
  Raum wie sonst auch die Decke ([Hausbau](./hausbau.md#die-decke-über-jedem-raum)).

### Straßen ziehen wie in _Cities: Skylines_

Gewünscht (Oktober 2026): _„beim Straßenbau ein Baumodus […] wie bei City
Skylines und den Wänden. Ich platziere z. B. eine Straße und kann diese dann
ziehen. Das Spiel schaut dann, wo Kreuzungen sind, und ersetzt die Teile dann
durch Kreuzungen. Laternen werden dann immer automatisch gesetzt bzw.
angepasst, wenn die Straße angepasst wird. […] mehr in Richtung City-Skyline-
Building mit Ghost-Straßen."_

- **Die Straße in der Hand ist der Pinsel** (`PortalWorld.updateRoadDraw`,
  `roadBrushOf`): jede Gerade aus dem Katalog _Stadt → Straßen_ (Laternen,
  alte Laternen, Doppellaternen, ohne, Allee, Zebrastreifen), frisch genommen
  und nicht umgestellt. In jedem Modus, am Schirm und in der Brille.
- **Eine Straße ist ein Band** von 12 m Breite (`roadNetwork.RoadNet`,
  `ROAD_WIDTH`), waagerecht oder senkrecht, auf Kacheln genau. Gewünscht:
  _„dass Straßen bzw. Kreuzungen nicht genau eine Straßenbreite entfernt sind,
  sondern ggf. auch mal kürzer bzw. statt 12 Felder ggf. auch nur 1–11 Felder
  auseinander liegen können"_. Das Netz einer Etage kommt aus den stehenden
  Teilen (`RoadNet.fromPieces`), die gezogene Linie wird ein Band dazu
  (`roadLineBand`: gerade, auf der Achse, auf der der Zug weiter ging, an
  beiden Enden eine halbe Breite länger), und daraus alle Teile neu
  (`roadPieces`). Gesetzt und genommen wird nur, was sich unterscheidet
  (`planRoad`, `pieceKey`); was geht, verliert seine Zeile in der Liste der
  Weltänderungen (`recordErased`), was kommt, bekommt eine.
- **Der Punkt ist die Stelle unter dem Getragenen** (`carriedSpot`), gefangen
  (`snapRoadPoint`) — wie in _Cities: Skylines_ gewünscht: _„ein Snap-Grid-
  Modus (also auf ganze 12 Felder) oder auch teilweise, damit wir nicht eine
  Manhattan-Stadt haben"_. **Raster** (ab Werk) fängt auf die Mitte eines
  12-m-Stücks, **frei** auf jede Kachel; umgeschaltet mit `G`, in der Brille
  mit dem Stick der Hand, die die Straße hält (`toggleRoadSnap`). In beiden
  Fällen fängt eine Straße, die schon dort liegt, wenn man weniger als eine
  halbe Breite neben ihre Mitte zielt — so endet die neue genau auf ihr, und
  es wird eine Einmündung statt eines Stummels daneben.
- **Drücken**: Der erste Druck setzt den Start — am Schirm Klick, `E` oder
  `A`, in der Brille `A`/`X` der Faust, die die Straße hält —, der zweite baut
  (`pressRoad` → `FurnishedWorld.commitRoad`). Einzeln losgelassen wird sie
  ein Stück mit den richtigen Anschlüssen (`placedElement`). Im _Baukasten_
  bleibt sie in der Hand, sonst ist die Hand danach leer.
- **Welches Teil**: Wo ein waagerechtes und ein senkrechtes Band einander ganz
  decken, ist ein Knoten; seine Nachbarn sagen, was er ist (`nodePiece`): zwei
  über Eck — Ecke, drei — Einmündung, vier — Kreuzung (geht es nur in einer
  Achse weiter, gehört das Quadrat der Geraden). Dazwischen liegen Geraden
  von 12 m, am Ende eines Laufs gleicher Art eine kürzere von 1–11 m
  (`shortStraight`, `cityCatalog.shortRoads`). Die Laternen gehören zu den
  Teilen und stehen deshalb immer richtig.
- **Gesperrt** ist eine Linie, unter der kein Boden ist, auf der etwas anderes
  als Straße steht (ein Haus, ein Park), oder die eine Straße schief
  überdeckt — parallel weniger als eine Breite daneben, oder quer, ohne sie
  ganz zu decken (`roadOverlaps`). Dann liegt ein rotes Band da, und gebaut
  wird nichts.
- **Die Art** — Laternen, alte Laternen, Doppellaternen, ohne, Allee,
  Zebrastreifen — ist die der Straße in der Hand, umzustellen beim Ziehen mit
  `T`, in der Brille mit dem Trigger der Hand, die sie hält
  (`cycleRoadStyle`; gefragt war: _„beim Baumodus, dass ich gefragt werde,
  welcher Typ Straße es sein soll"_). Die Wahl gilt, solange dasselbe Element
  gezogen wird, auch nach dem Nachfüllen. Sie gilt für Gerade und Ecke;
  Einmündung und Kreuzung haben ihre Ampeln. Wer eine vorhandene Straße mit
  einer anderen Art überzieht, baut sie um. Einzelne Laternen tauscht weiter
  `A` an der Laterne.
- **Die Geist-Straße** (`showRoadPlan`): Jedes Teil, das der Plan setzen
  würde, steht durchscheinend an seiner Stelle (`elementModel`, Materialien
  mit 55 % Deckkraft), ein Teil, das er nimmt, ist so lange ausgeblendet.
  Vor dem Start zeigt sie das eine Stück unter dem Getragenen, samt der
  Kreuzung, die es machen würde. Das Kachelgitter des Hinstellens schweigt
  dabei (`updatePlaceGrid`).
- **Was nicht geht**: Wo schon etwas steht (ein Haus, ein Park) oder kein
  Boden ist, entsteht keine Straße; die Zeile sagt, wie viele Stücke belegt
  waren. Zwei parallele Straßen direkt nebeneinander verbinden sich auf jeder
  Zelle — gerechnet wird nur mit Nachbarn.

## Die Werkzeugleiste des Baukastens

**Gespielt, bevor gebaut wurde.** Im September 2026 wurde der _Baukasten_
einmal mit Playwright durchgespielt — im Bauplatz, als Kran von oben, einen
Raum einrichten und ihn danach aus den Augen ansehen. Die größten Reibungen,
in der Reihenfolge, in der sie wehtaten:

- **Wo landet das?** Das Stück hängt eine Körperlänge über dem Boden am
  Haken, und aus der Aufsicht liegt seine Landestelle perspektivisch woanders.
  Das Gitter sagte _welche Kacheln_, nicht _wie_ — und ein Tisch landete halb
  in der Wand, ohne dass vorher etwas rot wurde.
- **Kein Zurück.** Wer sich verklickte, holte die Abrissbombe, zielte, riss ab
  und nahm das Stück neu aus dem Regal.
- **Was einmal stand, blieb stehen.** Am Schirm ließ sich ein hingestelltes
  Modell nicht mehr aufheben, nur abreißen — gegriffen wird sonst mit dem
  Griff in der Brille.
- **Jedes Werkzeug war eine Taste**, die man kennen musste: `R` dreht,
  Rechtsklick holt die Bombe. Und die Bombe ging nach dem ersten getragenen
  Stück gar nicht mehr (unten).
- **Eine Tasse über dem Tisch fiel in den Tisch**: Gemalte Stücke entstanden
  auf Bodenhöhe. Und das nächste Stück am Haken schob beim Vorbeifliegen die
  Stehlampe durch den Raum — einmal bis auf 34 m Höhe.
- **Bilder standen auf dem Boden**, und ein großer Bilderrahmen galt dem
  Einrasten als Wand (dünn, lang) und hätte eine echte Wand auf seiner Fuge
  ersetzt.

**Die Leiste** (`worlds/portal/buildBar.ts`, DOM) steht im _Baukasten_ als
Kran am Schirm unten in der Mitte (die Tastenhilfe, `ui/ControlHints.ts`,
rückt im Baukasten darüber), auf dem Telefon oben unter der Kopfzeile, dort in
zwei Reihen und nur mit Symbolen (unten liegen Stöcke und _▦ Fläche_; die
Tastenhilfe rückt unter die Leiste, `ui/controlHints.css`). Am Pad schaltet
das Steuerkreuz ▲/▼ durch Setzen → Verschieben → Löschen → Kopieren → Boden
→ Wand (`buildBar.nextBuildTool`, `World.toolStep`). Dreizehn
Knöpfe in vier Gruppen: **Setzen**, **Verschieben**, **Löschen** — **Drehen**
links und rechts, **Schräg** (45° auch für Möbel), **Kopieren** — **Boden**,
**Wand** — **Zurück**, **Vor**. Darüber eine Zeile, was am Haken hängt und
wohin es käme (_Mug A · auf Table Medium_, _Pictureframe · an der Wand_,
_Couch · kein Platz_, _▣ Dielen hell · Boden · 64 Kacheln · klicken_), grün
oder rot. Bei _Boden_ und _Wand_ steht vorn in der Zeile das **Muster mit
Namen und Farbfeld** (unten, _Boden und Wände gestalten_).

- **Welches Werkzeug gilt, liest die Leiste an der Welt ab** und merkt es sich
  nicht selbst: _Boden_ oder _Wand_ gewählt — dieses (`surfaceTool`, unten);
  Stück frisch aus dem Regal am Haken — _Setzen_; Bombe am Haken —
  _Löschen_; _Kopieren_ scharf — _Kopieren_; sonst _Verschieben_. Eine Leiste
  mit eigenem Zustand wäre beim ersten Rechtsklick an ihr vorbei die falsche
  Auskunft.
- **Setzen** mit leerem Haken nimmt den letzten Pinsel wieder (`lastBrush`,
  samt Drehung); gab es noch keinen, geht das Regal auf (`assets`).
- **Verschieben** legt den Pinsel weg (ein frisches Stück war nie hingestellt,
  `letGo`) und die Bombe ab. Dann hebt ein Druck — Klick, `E`, `A` — das
  Modell unter dem Kran in die Bildschirmhand (`PortalWorld.liftUnderCrane`),
  von oben nach unten gesucht: die Tasse vor dem Tisch darunter. Dafür meldet
  die Welt ein solches Modell als `PlayerRig.useCandidate`, sonst wäre der
  Linksklick mit leerem Kran gar kein Benutzen. Gilt in _Einrichten_ und
  _Baukasten_; der nächste Druck stellt es eingerastet wieder hin.
- **Löschen** ist die Abrissbombe (oben, _Der Spielmodus_). Beim Einbau fiel
  auf, dass sie nach dem ersten getragenen Stück nie wieder kam:
  `bombAllowed` bekam als „trägt etwas" die Frage, ob es eine Bildschirmhand
  **gibt** — und die behält ihre Seite, auch leer. Jetzt: ob sie etwas trägt.
- **Drehen** dreht den Kran wie `R`: ein Viertel je Druck, bei einer Wand aus
  dem Regal ein Achtel (die steht auch schräg). **Schräg** schaltet das
  Achtel auch für Möbel ein (`PortalWorld.fineTurn`, `gridSnap.gridPose` mit
  `fine`): Ein schräges Möbel steht auf der Mitte seiner Kachel, seine Hülle
  ist unter 45° ein Quadrat (`turnedHalf`), und so steht es auch im Weg
  (`decorScene` rechnet in Achteln). Die Beschriftung der Drehknöpfe sagt,
  welches gilt (`90°`/`45°`). Aus einer Liste der Weltänderungen kommt ein
  schräges Möbel so schräg zurück, wie es stand — `placeModelAt` dreht die
  Lage nicht nach.
- **Kopieren** ist ein Werkzeug und kein Sofort-Knopf: erst der Knopf, dann das
  Stück anklicken, und es ist der Pinsel — gleiche Datei, gleiche Drehung.
  Zuerst war es ein Knopf, der „das unter dem Kran" kopierte; aber wer mit der
  Maus zur Leiste fährt, zieht den Kran unterwegs vom Stück weg, und der Knopf
  kopierte den Boden neben der Leiste.
- **Zurück/Vor** sind auch `Strg`+`Z` und `Strg`+`Y` (oder
  `Strg`+`Umschalt`+`Z`), solange die Leiste zu sehen ist — die Tasten jedes
  Programms, keine neue Belegung der Spielsteuerung. In der Brille und am Pad
  stehen dieselben zwei im Menü _Weltänderungen_ (`changes:undo`,
  `changes:redo`); eine eigene Taste bekommen sie nicht, die Tastenbelegung
  wird woanders umgebaut.

**Rückgängig merkt sich Lagen, keine Körper** (`worlds/portal/buildHistory.ts`,
reine Rechnung). Ein Schritt ist _Hinstellen_ (Adresse und Lage), _Abreißen_
oder _Umstellen_ (von, nach); jeder hat sein Gegenteil (`invertStep`). Ein
Stück, das rückgängig gemacht und wiederholt wird, ist ein **neues** — neue Id
im Netz, neuer Körper —, also wird es beim Nachspielen an seiner Lage gesucht
(`nearestAt`, 35 cm) wie beim Einfügen einer Liste, nicht an einem gemerkten
Körper. Ein **Pinselstrich** und eine **Fläche** sind je ein Schritt
(`begin`/`end`), eine Gruppe wird rückwärts aufgelöst (erst die Tasse, dann
der Tisch). Ein Umstellen an den alten Platz kommt gar nicht erst auf den
Stapel. Höchstens hundert Schritte; wer nach einem Zurück etwas Neues baut,
verliert das _Vor_. Nachgespielt wird über dieselben Wege wie von Hand
(`placeModelAt`, `dropModel`), also landet alles auch in der Liste der
Weltänderungen und im Netz. **Auch eine ersetzte Wand kommt zurück**:
`replaceWalls` legt jede Wand, die eine neue beim Hinstellen verdrängt, als
_Abreißen_ in `replacedSteps` ab, und der Schritt der neuen Wand
(`pushBuild`) nimmt sie mit — erst das Abreißen, dann das Hinstellen, als
**eine** Gruppe. Ein _Zurück_ nimmt die neue weg und stellt die alte an ihre
Lage. Was von einem vorigen Ersetzen noch wartet, verfällt beim nächsten,
damit es sich an keinen fremden Schritt hängt; Stücke der Welt
(`placeModel`, `note = false`) legen gar nichts ab.

**Der Geist** (`worlds/portal/placeGhost.ts`) ist eine durchscheinende Kopie
des Getragenen genau dort, wo es landet: grün, wenn Platz ist, rot, wenn
nicht. Er steht unter **jedem** getragenen Stück aus dem Regal, in jedem Modus
und auch in der Brille — die Frage „wo landet das?" stellt sich überall. Er
wird **ohne Tiefenprüfung** über alles gezeichnet, denn von oben hängt das
Stück am Haken genau über seiner Landestelle und deckte ihn sonst zu. Die
Kopie teilt die Geometrie mit dem Modell; freigegeben werden nur ihre zwei
Materialien. Während _Fläche_ an ist, schweigt er — dort zeigt das Gitter die
ganze Fläche.

**Im Baukasten steht, was gesetzt ist, fest** — ein fester Körper genau auf
der Höhe des Geists (`hang`). Vorher sank es mit Schwerkraft und gesperrten
Achsen auf den Boden, und der kinematische Körper des nächsten Stücks am Haken
schob es beim Vorbeifliegen weg. Wer es wieder aufhebt, macht es beweglich wie
zuvor (`attach`). In den anderen Modi bleibt es beim Sinken, außer bei dem,
was an der Wand hängt oder auf etwas steht. Ob ein Stück fest stand, merkt
sich auch der Stapel (`BuildPose.fixed`), damit ein Nachspielen es wieder so
hinstellt.

### Ebenen wie in _Die Sims_

Gemeldet: _„im baukasten modus habe ich noch ein problem mit dem platzieren
von dingen auf der korrekten ebene. Ich brauche ein UI button um durch die
jeweiligen ebenen durchzuschalten. Zudem sollen dann auch nur die Wände/dinge
der jeweiligen ebene sichtbar sein."_ Welche Etage galt, hing daran, wo der
Kran gerade schwebte — hinauf kam er nur über die Treppe.

**Die Leiste** (`worlds/grid/levelBar.ts`, DOM) steht senkrecht am rechten
Rand, sobald die Werkzeugleiste zu sehen ist (`PortalWorld.buildBarShown`) —
in jeder Gitterwelt, auch mit nur einer Etage (dann sind _Hoch_ und _Runter_
aus; neue Etagen legt die Treppe an). Zuerst kam sie erst ab der zweiten
Etage; gewünscht: _„im baumodus kann das ebenen ui immer angezeigt werden"_.
Von oben nach unten:

- **⌂ Außen** (an/aus): alle Etagen zu sehen, wie von jemandem, der vor dem
  Haus steht (`viewLevel` meldet die oberste). Gebaut wird trotzdem auf der
  gewählten, und auf die zielt die Kamera.
- **▲ Hoch**, **▼ Runter** — auch `Bild↑`/`Bild↓`, solange die Leiste da ist.
- **☰ Ebene N** öffnet die Liste aller Etagen, die oberste oben; auf dem
  Telefon ist das die einzige beschriftete Taste.

**Gewechselt wird, indem der Kran die Etage wechselt** (`GridWorld.goToLevel`):
Er fliegt ohnehin ohne Schwerkraft und durch Wände (`updateCraneFlight`,
`PhysicsLocomotion.ghost`), also genügt es, das Rig auf den Boden der Etage zu
setzen und `rigLevel` mitzunehmen. Alles, was nach dem Boden unter dem Kran
fragt — Geist, Gitter, Wand ziehen, Boden legen, Treppe —, fragt danach auf
dieser Etage, auch dort, wo sie noch keinen Boden hat. Wer den Baukasten
verlässt, landet wie immer (`PhysicsLocomotion.land`).

**Sichtbar ist die gewählte Etage und was darunter liegt** — darüber schneidet
die Kamera weg (`core/cutaway.ts`). Damit das auch für Möbel gilt und nicht
nur für Wände, trägt jedes hingestellte Modell seine Etage
(`GridWorld.markModelLevels`, `cutaway.levelOfBottom`: ab einem halben Meter
unter ihrem Boden, damit ein Bild auf anderthalb Metern unten bleibt); was
getragen wird, trägt keine. Mit der Leiste entscheidet sie allein, was man
sieht — die Regel des _Hausbaus_ „draußen das ganze Haus" (`underRoof`) gilt
dann nicht.

## Räume dekorieren

**Stücke aus dem KayKit-Regal an Wände hängen und auf Tische stellen**
(`worlds/portal/decorPlace.ts`, reine Rechnung; `PortalWorld.decorTarget` ruft
sie). Gewünscht war, dass der Spieler einen Raum gestalten kann — Möbel,
Pflanzen, Lampen, Bilder aus dem KayKit-Regal, auch an Wänden und auf Tischen.
Das Einrasten auf dem Kachelgitter (`gridSnap.ts`, siehe
[Das Modellregal](assetregal.md)) lässt die Höhe bewusst offen; hier wird sie
beantwortet.

- **Worauf etwas steht** (`restOn`): auf dem, was **unter seiner Mitte** liegt
  — der höchsten Oberkante bis 2 m über dem Boden (`STACK_MAX`), sonst dem
  Boden. Ein Teppich trägt einen Stuhl, ein Tisch eine Tasse, ein Wandbrett
  ein Buch. Ungültig (rot) ist, was mehr als 12 % seiner Grundfläche mit etwas
  teilt, das in seiner Höhe steht (`BLOCK_SHARE` — ein Stuhl, der drei
  Zentimeter unter die Platte ragt, ist ein Stuhl am Tisch), was zu weniger
  als 30 % aufliegt (`SUPPORT_SHARE`), und was in einer Richtung breiter ist
  als seine Unterlage (`STACK_SLACK`, 10 cm): gestapelt wird **Kleines auf
  Großes** — ein Sofa auf einem Beistelltisch liegt vielleicht zu einem
  Drittel auf, gemeint ist es trotzdem nicht. Ein 1×1-Möbel an der Wand ragt
  10 cm in sie hinein (die Wand steht mittig auf der Fuge) und ist gültig.
- **Kleinkram rastet auf der Fläche ein** (`surfaceSpot`): Was höchstens 60 cm
  breit ist, rastet über einer Fläche auf **Viertelkacheln innerhalb** der
  Fläche ein statt auf der Kachelmitte — ein Wandbrett ist 30 cm tief und
  liegt an der Wand, weit weg von jeder Kachelmitte, und auf einem Tisch sollen
  zwei Tassen nebeneinander stehen.
- **Was an die Wand gehört** (`mountsOnWall`, am Dateinamen wie die Haltung):
  Bilderrahmen (nicht die stehenden), Banner, Wandfackeln, Tafeln,
  Zielscheiben, Wandschmuck, Schilder und die Wandbretter `shelf_A_*` aus
  `furniture-bits` (die lagen vorher als Brett mit Konsolen auf dem Boden). Es
  sucht die nächste **Wandfläche** vor dem Kran (`mountPose`, bis 75 cm davor),
  dreht sich mit der Vorderseite in den Raum, rückt bis auf einen Zentimeter an
  die Fläche und hängt mit der Mitte auf 1,55 m (`MOUNT_HEIGHT`) — nie mit der
  Unterkante unter 10 cm, nie über die Wand. Entlang der Wand rastet es auf
  halbe Kacheln ein und bleibt ganz auf der Fläche. Ohne Wand in Reichweite
  steht es wie jedes Stück. Ein Bild über einem anderen ist rot
  (`mountBlocked`). Wandstücke ersetzen keine Wand und werden nie gekürzt,
  auch wenn sie so dünn sind wie eine.
- **Welche Seite vorn ist, sagt die Datei**: Liegt ihre Breite entlang x,
  zeigt +z in den Raum, sonst +x (`faceYaw`). Nachgesehen an Bilderrahmen,
  Wandfackel und Wandbrett — aus den Augen, in der Bild-Schleife.
- **Wandflächen** (`wallFaces`) sind die zwei Seiten jedes hohen, dünnen
  Kastens (ab 1,2 m hoch, bis 60 cm dick), und Stücke derselben Wand werden
  zusammengelegt (`joinFaces`): Der Grundriss baut eine Wand aus einem Quader
  je Kachel, und ohne das Zusammenlegen passte an eine acht Meter lange Wand
  kein Bild, das breiter ist als ein Meter.

**Woher die Kästen kommen** (`PortalWorld.decorScene`): jedes hingestellte
Modell aus dem Regal (Hülle des Colliders, auf ein Viertel gedreht) und die
Quader, die die Welt selbst gebaut hat — die Gitterwelt reicht ihren
Grundriss herein (`GridWorld.decorSolids`, gemerkt je Fassung des Plans; ohne
Böden und ohne schräge Wände). Damit hängt ein Bild an einer gebauten Wand und
ein Kaktus steht auf der Küchenzeile des Bauplatzes.

**Wo es gilt**: beim Malen mit der Maus (`paintAt` — was keinen Platz hat,
wird übersprungen und einmal je Strich gemeldet), beim Hinstellen aus der Hand
in jedem Modus (`snapPlaced`, auch in der Brille), für den Geist und — seit
der zweiten Runde — auch für die **Fläche** (`commitArea` über
`decorPlace.decorArea`): Eine Fläche Tassen über der Küchenzeile steht auf der
Zeile, eine Reihe Bilder vor der Wand hängt an ihr. Gefragt wird Stelle für
Stelle **nacheinander**, und weil ein geladenes Stück noch in derselben Zeile
entsteht, steht jede Kopie der nächsten schon im Weg; zwei Stellen, die an
dieselbe Stelle der Wand führen, werden ein Bild. Was keinen Platz hat, wird
übersprungen und in der Rückmeldung gezählt (_3× Mug A gesetzt · 1 ohne
Platz_). Wände und Bodenstücke bleiben bei ihrem Gitter: Eine Wand kommt um
die Fläche herum, ein Boden liegt im Boden.

**Auch an Wände unter 45°** (`slantMountPose`, `slantBlocked`): Eine Wand aus
dem Regal, die schräg steht (`fitWall`, `userData.diagonalWall`), ist für die
Kastenrechnung ein Quadrat, an das man nichts hängt. Also bekommt sie eine
eigene: Mitte, Richtung (`╱` nach Nordost, `╲` nach Südost), halbe Länge und
halbe Dicke (`PortalWorld.slantWalls`). Ein Wandstück sucht die Seite, auf
der der Kran steht, rückt bis auf einen Zentimeter an sie, rastet entlang der
Wand auf Viertelmeter ein und dreht sich mit der Vorderseite unter 45° in den
Raum. Liegt der Kran näher an einer schrägen als an einer geraden Wand,
gewinnt die schräge. Ob ein Bild dort ein anderes überdeckt, sagt der Abstand
der Mitten (die Kästen der anderen sind achsparallel); ein Kasten, der
größer ist als ein Bild, ist die Wand selbst und stört nicht.

**Gespeichert wird wie jede Weltänderung**: Ein gehängtes Bild steht mit
seinem Punkt und seiner Drehung in der Liste (`recordModel`), und beim
Einfügen hängt `placeModelAt` jedes Wandstück wieder fest an diese Stelle
(`mountsOnWall`) statt es fallen zu lassen.

**Boden- und Wandfarbe**: Welchen Ton eine gebaute Wand hat, entscheidet
weiter die Welt (`GridWorld.tint`), und das Weltformat speichert bewusst
keine Farben (_Das Weltformat_). Gestaltet wird mit Stücken aus dem Regal —
seit der zweiten Runde mit zwei eigenen Werkzeugen, _Boden_ und _Wand_
(unten, _Boden und Wände gestalten_).

**Geprüft** wird die Rechnung ohne Szene (`decorPlace.test.ts`: Tasse auf
Tisch, Stuhl am und im Tisch, Sofa auf Tasse und auf Beistelltisch, Buch auf
dem Wandbrett, Etagenhöhe, Wand quer durch; Bild innen und außen, Reichweite,
Wandende, zu schmale Fläche, Höhe, zusammengelegte Wände, Bild über Bild;
`buildHistory.test.ts`: Gegenschritte, Gruppen, Grenze, Zweige). Die
Bild-Schleife lief im Bauplatz bei 1280×800 und 390×844: Geist grün auf dem
Tisch, rot halb im Tisch, Bild an der Wand; der eingerichtete Raum von oben
und aus den Augen nach Norden, Osten und Westen.

**Und der Kran reist nicht mehr durch Tore** (`GridWorld.fixtureEvent`,
`goto`): Beim Durchspielen stand der Bauplatz nach dem Überfliegen seines
Hub-Tors plötzlich im Hub — der Kran hat keinen Körper, aber das Tor fragte
nur, ob jemand auf seiner Kachel steht. Als Kran wird eingerichtet, nicht
gereist.

**Offen** nach der ersten Runde war: die Leiste am Pad (macht die Pad-Belegung
der Werkzeugleiste), Bilder an schrägen Wänden und eine Leiste in der Brille —
die beiden letzten stehen im nächsten Kapitel.

## Boden und Wände gestalten

**Zwei Werkzeuge an der Leiste, _Boden_ ▤ und _Wand_ ▥**
(`worlds/portal/surfaceDecor.ts` rechnet, `PortalWorld.applySurface` setzt).
Gewünscht war, nicht nur Möbel in einen Raum zu stellen, sondern **den Raum
selbst** zu gestalten — mit einem gewählten KayKit-Boden- oder Wandstück, in
der Liste der Weltänderungen und rückgängig zu machen. Neue Farben gibt es
dabei nicht: Gesetzt wird, was das Regal hergibt, und wo ein Paket zwei
Farbvarianten desselben Stücks hat (Restaurant-Fliesen hell und dunkel,
Küchenboden grau und blau, Dielen hell und dunkel), sind das die Muster.

- **Ein Druck wählt das Werkzeug, der nächste das nächste Muster**
  (`nextStyle`, im Kreis). Die Zeile über der Leiste sagt, welches gilt und
  was ein Klick täte. Der Haken wird dafür leer, die Bombe geht weg; solange
  _Boden_ oder _Wand_ gilt, meint jeder Klick „hier belegen" und nichts sonst
  (`updateUsables`, wie bei der Bombe).
- **Das Muster sieht man, bevor man klickt** (dritte Runde): Jedes Muster hat
  ein Farbfeld (`SurfaceStyle.swatch`, bei Schachbrettfliesen ein zweiter
  Ton `swatch2`, dann kariert — `buildBar.swatchBackground`), abgelesen in
  der Bild-Schleife. Die Zeile über der Leiste zeigt vorn **Farbfeld und
  Namen** (`BuildBarState.pattern`, `stylePattern`), dahinter, was ein Klick
  täte (_Boden · 64 Kacheln · klicken_). Und auf den Knöpfen _Boden_ und
  _Wand_ sitzt oben rechts ein kleiner Farbpunkt mit dem Muster, das sie
  gerade setzen würden — auch, wenn gerade ein anderes Werkzeug gilt.
- **Boden** (`FLOOR_STYLES`: Dielen hell, Dielen dunkel, Küchenfliesen,
  Küchenfliesen beige, Küchenfliesen rot, grün und blau, Steinplatten,
  Zuckerguss — alle eine Kachel groß) füllt den
  **Raum** unter dem Kran: alle Kacheln, die von dort aus ohne Wand
  dazwischen zu erreichen sind (`floodRoom`). Welche Fugen zu sind, sagen
  dieselben Kästen wie beim Dekorieren (`blockedEdges` über `decorScene`):
  was dünn ist, auf einer Fuge steht und über Hüfthöhe reicht, auch der Sturz
  über einer Tür. Mehr als 400 Kacheln (`ROOM_MAX`) sind kein Raum, sondern
  draußen — dann kommt eine Zeile statt eines Bodens bis zum Horizont (für
  draußen gibt es _▦ Fläche_). Die Vorschau leuchtet den ganzen Raum im
  Gitter. Bodenstücke eines **anderen** Musters im Raum gehen dabei weg (als
  Schritt), dasselbe Muster bleibt liegen.
- **Sechs Millimeter über dem Boden** (`FLOOR_LIFT` in `sinkFloor`): Bündig
  lag die Lauffläche jedes Bodenstücks in derselben Ebene wie die Oberkante
  des gebauten Bodens, und der Bauplatz blendet seine Böden (Quader, keine
  Platten) darunter nicht aus — beide stritten um jeden Bildpunkt, dunkle
  zackige Streifen quer über die Dielen (Z-Fighting). Geprüft von oben, aus
  den Augen und flach über dem Boden für Dielen, Küchenfliesen und
  Steinplatten.
- **Wand** belegt **eine Seite** der Wand vor dem Kran (`nearestFace`, bis
  1,2 m davor). Zwei Arten Muster (`WALL_STYLES`):
  - **Fliesen** (`restaurant-bits/wall_tiles_A/B`, eine Platte 1 m × 70 cm ×
    8 cm) liegen Reihe über Reihe nur auf **dieser** Seite, so viele
    nebeneinander, wie ganz passen, mittig, vom Boden bis 2,8 m
    (`panelSpots`); alte Fliesen derselben Seite gehen, die der anderen
    bleiben (`onFace`). Die Fliesen zählen dafür jetzt zu den Wandstücken
    (`mountsOnWall`, `wall_tiles_`): Vorher galt so eine Platte dem
    Einrasten als Wand und hätte eine echte auf ihrer Fuge ersetzt.
  - **Ganze Wände** (Putzwand `restaurant-bits/wall`, Prototypwand
    `prototype-bits/Wall`, am Ende je ein halbes Stück) stehen auf der Fuge
    hinter der Seite (`wallSpots`) — dann für beide Seiten. Eine Regalwand
    dort ersetzen sie (`replaceWalls`, und _Zurück_ bringt sie wieder), eine
    gebaute decken sie zu: Die Putzwand ist 26 cm dick, die gebaute 20.
- **Ein Klick ist ein Schritt**: Die Stücke werden vorher geladen, damit
  alles in einem Zug entsteht und die Gruppe sich gleich schließt; darin
  steht auch, was ersetzt wurde. _Zurück_ nimmt den Boden weg und legt den
  alten wieder hin.

**In der Brille: eine Seite im Menü**, _Bauen & Gestalten →
Baukasten-Werkzeuge_ (`PortalWorld.buildToolsMenu`, `build-tools` in
`ui/menuGroups.MENU_PLACEMENT`), als Raster mit drei Knöpfen je Reihe — oben,
was man dauernd braucht: **Setzen**, **Verschieben**, **Löschen**, **Links**
und **Rechts drehen**, **Rückgängig**, dann **Boden**, **Wand**,
**Wiederholen**, **Bodenmuster**, **Wandmuster**, **Möbel in 45°** und im
Bauplatz die **Vorlagen** (unten). Dieselbe Seite gibt es am Schirm; dort tut
sie, was die Leiste tut. In der Brille gilt die Hand statt des Krans:

- **Setzen** legt den letzten Pinsel (`lastBrush`) in die Hand, die den
  Knopf gedrückt hat; gab es noch keinen, geht das Regal auf.
- **Verschieben** ist Greifen, wie immer — der Knopf schaltet nur Löschen ab.
- **Löschen** ist ein Schalter (`vrErase`): Solange er an ist, reißt der
  nächste Griff an ein hingestelltes Stück es ab (`attach` → `detonate`),
  statt es aufzuheben. Setzen, Verschieben, Boden und Wand schalten ihn ab.
- **Drehen** dreht das Stück **in der Hand** um seine Mitte und die
  Hochachse (`turnHeld`: der Griffversatz wird um die Drehung erweitert), ein
  Viertel oder — bei Wänden und mit _Möbel in 45°_ — ein Achtel.
- **Boden** belegt den Raum, in dem man steht; **Wand** die Wand, die man
  ansieht (`surfaceHere`).
- **Erst zeigen, dann belegen** (dritte Runde, `surfaceMenu`,
  `surfaceDecor.surfacePress`): Ohne Leiste — in der Brille und in der
  Ich-Sicht am Schirm (Spielmodus _Spielen_, Ansicht 3D; in _Einrichten_ und
  _Baukasten_ gibt es dort den Kran) — belegte der Knopf sofort, und welche
  Wand gemeint war, sah man erst hinterher. Jetzt **zeigt** der erste Druck:
  Der Raum leuchtet im Gitter, die gemeinte Wandseite als durchscheinende
  Fläche in der Farbe des Musters mit einem Rahmen in der Farbe des Gitters
  (`showFaceMark` — die Kante im Gitter liegt am Boden und ist aus den Augen
  kaum zu sehen), und die Zeile oben im Menü sagt _Wand: Fliesen hell · diese
  Seite · 8 m · noch einmal Wand: belegen_. Der Knopf ist dann abgehakt.
  Erst der zweite Druck auf **denselben** Knopf belegt; der andere wechselt
  die Vorschau, Setzen, Verschieben und Löschen schalten sie ab. Die
  Vorschau folgt jedes Bild dem Kopf (`updateBuild`, solange die Hand nichts
  trägt). Mit der Leiste am Kran bleibt es beim sofortigen Belegen — dort
  zeigt die Leiste schon, was gemeint ist.
- **Die Wand im Rücken gilt nicht mehr** (`nearestFace` mit `look`): Ohne
  Kran geht die Blickrichtung mit, und nur eine Seite, die einem zugewandt
  ist, zählt — dafür reicht sie etwas weiter (`LOOK_REACH`, 0,6 m über
  `FACE_REACH`). Aufgefallen in der Bild-Schleife: Wer mit dem Rücken nah an
  der Südwand stand und nach Norden sah, bekam die Südwand. Und der halbe
  Meter, um den der Punkt früher vorrückte, landete dicht vor einer Wand
  hinter ihr — dann war gar keine gemeint.

Die Pad-Belegung der Leiste (Schultertasten o. Ä.) ist nicht Teil davon.

**Mehr Muster ohne neue Assets** (dritte Runde). Die Stücke von KayKit
färben sich über einen **Farbatlas**: Jede Fläche zeigt mit ihren UV in eines
von 8 × 4 Feldern der Paket-Textur. `tools/surface-variants.mjs` (einmal von
Hand, wie `tools/prototype-variants.mjs`) verschiebt die UV der dunklen
Küchenfliesen (`floor_kitchen_small`, Feld 1/0) in das rote, grüne und blaue
Feld von `restaurantbits_extra.webp` und schreibt
`restaurant-bits/floor_kitchen_small_{red,green,blue}.glb` samt Eintrag im
Inhaltsverzeichnis des Regals — je ein unkomprimiertes Netz von knapp 5 KB,
**dieselbe Textur**, geladen erst, wenn jemand das Muster wählt. Dazu kommt
**Zuckerguss** (`holiday-bits/floor_gingerbread_small`), ein Stück, das schon
im Regal lag. Ausprobiert und verworfen: `floor_tile_small_broken_A` (von
oben ein dunkler Fleck je Kachel), `floor_dirt_small_A` (auf dem dunklen
Boden kaum zu sehen) und `platformer/floor_wood_1x1` (nur einen halben Meter
groß, jede Kachel halb leer). Die zweite Restaurantfliese hieß
_Küchenfliesen blau_ und ist beige-braun kariert — sie heißt jetzt so.

**Die Vorlagen** (`worlds/portal/sampleRoom.ts`, `SAMPLE_ROOMS`) liegen in
einem Untermenü _Baukasten-Werkzeuge → Vorlagen_ (`build:templates`, je
Vorlage `build:sample:<id>`): das **Wohnzimmer** (der erste Beispielraum,
unten) und das **Kleine Café** — rot-weiße Küchenfliesen, dunkle Fliesen
hinter der Theke (der Küchenzeile des Startzimmers), Menükarte, Eisbecher
und Glas auf der Theke, drei Hocker davor, ein Tisch mit rotem Tischtuch und
Burger auf dem Teller, zwei kleine runde Tische mit Eisbecher und Eintopf,
Bilder an West- und Südwand, ein Kaktus an der Tür; alles aus
`restaurant-bits` und `furniture-bits`. Beide laden wie unten beschrieben
als **ein** Schritt; eine zweite Vorlage im selben Raum tauscht den Boden,
stellt ihre Stücke aber **zu** den ersten — wer wechseln will, nimmt die
erste mit _Zurück_ weg. Die gebaute Pizza war auf dem kleinen Tisch größer
als der Tisch; dort steht jetzt ein Eintopf.

**Der Beispielraum** (_Wohnzimmer_) ist ein fertig
eingerichtetes Startzimmer des Bauplatzes, das zeigt, was geht: helle Dielen
im ganzen Raum, Fliesen hinter der Küchenzeile, eine Putzwand im Osten, Topf
und Kaktus auf der Zeile, Teller auf dem Tisch, zwei Stühle (einer schräg),
eine Wohnecke mit Teppich, Sofa, Couchtisch samt Tasse, Stehlampe, einem
Sessel in 45° und zwei Bildern, eine Schlafecke mit Bett, Nachttisch und
Lampe, Bild und Wandbrett mit Buch. Die Liste sagt nur, **wo ungefähr** etwas
hinkommt; Höhe, Wand und Unterlage findet dieselbe Rechnung wie beim Setzen
aus der Hand (`placeModelAt` mit `snap` → `snapPlaced`) — die Tasse steht auf
dem Tisch, weil dort ein Tisch ist. Die Reihenfolge zählt (erst der Tisch,
dann die Tasse). Geladen wird er über das Menü, in den Raum um
`sampleRoomOrigin` (der Bauplatz sagt: sein Startzimmer, `EditorWorld`;
andere Welten bieten ihn nicht an), und alles zusammen ist **ein** Schritt:
_Zurück_ räumt ihn wieder ab. Wer den Grundriss umgebaut hat, bekommt die
Stücke trotzdem an dieselben Stellen — Bilder ohne Wand stehen dann eben.

**Geprüft** ohne Szene: `surfaceDecor.test.ts` (Muster, Raum mit 64
Kacheln, offene Tür heißt draußen, Sturz schließt, niedrige und dicke Kästen
sind keine Wand, Innenwand teilt; gemeinte Seite innen und außen; Fliesen
acht mal vier, schmale Fläche mittig, gedreht nach Westen; ganze Wände zwei
Meter und am Ende einer; Fliese gehört zu ihrer Seite), `decorPlace.test.ts`
(`decorArea`: Lage, Überspringen, ein Bild statt zwei, nacheinander;
`slantMountPose`: Seite, Abstand, Höhe, Gegenseite, Reichweite, zu schmal,
`slantBlocked`), `gridSnap.test.ts` (`fine`: schräg auf der Kachelmitte,
ohne `fine` ein Viertel, eine Wand bleibt Wand, Hülle unter 45°). Die
Bild-Schleife lief im Bauplatz bei 1280×800 und 390×844: Boden-Vorschau und
dunkle Dielen, Fliesen an der Nordwand, Putzwand im Osten und nach _Zurück_
wieder die gebaute, der Geist eines Sessels in 45°, ein Bild und eine
Wandfackel an einer schrägen Wand, die ersetzte Regalwand nach _Zurück_, eine
Fläche Tassen auf der Küchenzeile, der Beispielraum von oben und aus vier
Richtungen, die Werkzeugseite am Schirm und als Panel der Brille.

**Geprüft in der dritten Runde**: `surfaceDecor.test.ts` (jedes Muster mit
eigenem Farbfeld und Namen, `stylePattern`; `surfacePress`: erst zeigen,
dann belegen, das andere Werkzeug wechselt die Vorschau; `nearestFace` mit
Blickrichtung: die Wand im Rücken nicht, die angesehene auch etwas weiter
weg, in der Ecke die angesehene statt der näheren), `buildBar.test.ts`
(`swatchBackground` einfarbig und kariert), `sampleRoom.test.ts` (jedes
Muster und jedes Stück der Vorlagen liegt als Datei im Regal, die
umgefärbten Fliesen sind unter 8 KB und im Inhaltsverzeichnis, jede Vorlage
im Zimmer und mit genau einem Boden). Die Bild-Schleife lief im Bauplatz bei
1280×800: Leiste mit Farbfeld bei Boden und Wand (einfarbig und kariert),
jedes neue Bodenmuster von oben, die Vorschau in der Ich-Sicht (Raum im
Gitter, leuchtende Wandseite, dann die Fliesen), die Werkzeugseite mit der
Zeile der Vorschau, das Untermenü _Vorlagen_ und das Café von oben und aus
vier Richtungen.

**Offen**: Eine gebaute Wand wird von einer ganzen Regalwand nur zugedeckt,
nicht ersetzt. _Boden_ läuft durch eine Tür ohne Sturz hinaus und meldet dann
„kein geschlossener Raum". Wandmuster aus dem Atlas gibt es noch nicht
(`wall_tiles_A` ließe sich wie die Bodenfliesen umfärben). Eine Vorlage
räumt die vorige nicht selbst ab. Die leuchtende Wandseite ist in der
Ich-Sicht dicht vor einer langen Wand größer als das Bild — in der Brille
sieht man mehr davon; in einer echten Brille ist die Vorschau nicht
ausprobiert (nur Ich-Sicht am Schirm, derselbe Weg ohne Leiste).
