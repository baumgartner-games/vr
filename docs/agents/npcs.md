# NPCs

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

## Wer hier herumläuft

Bis hierher war die Spielwiese leer: Dinge, die man anfasst, Werkzeuge, mit
denen man sie bearbeitet, und sonst niemand. **NPCs** sind die dritte
Kategorie im Handgelenk-Menü, neben Werkzeugen und Beutel, und sie sind
bewusst keine von beiden — was hier herauskommt, läuft von selbst weiter.

**Ein NPC besteht aus zwei Hälften, und sie werden einzeln ausgesucht.**

- Die **Haut** (`worlds/npc/npcKinds.ts`) sagt, wie er aussieht: **welche
  Figur aus dem Regal** er trägt (`figure`, siehe unten), wie groß er ist, was er wiegt, wie viel er aushält — und
  daneben das, was der gebaute Körper darunter braucht: drei Farben und ob die
  Arme **nach vorn** zeigen wie beim Zombie oder neben ihm hängen wie bei
  allem anderen. Vorne ist −Z, dort sitzen auch die Augen; mit dem falschen
  Vorzeichen streckte der Zombie sie eine Weile nach hinten und sah aus, als
  ergäbe er sich. Drei Häute sind fest eingebaut: der **Zombie** (ein
  Mannequin), die **Übungspuppe** (der Dummy aus den Prototyp-Bausteinen) —
  beide sterben nach denselben Regeln, die Puppe hält nur mehr aus (160 statt
  100) — und der **Hamster**, derselbe gebaute Körper in klein (60 cm, 20
  Leben). Er ist keine Zierde: Er ist die Sorte, die vor einer Dachkante stehen
  bleibt, weil sie den Aufprall nicht überlebt (`nav/navFall.ts`), und ohne ihn
  wäre der Fallschaden eine Zahl ohne sichtbare Folge. Eine Figur aus dem Regal
  hat er nicht, und zwar weil es dort keine gibt: Die Sammlung kennt Ritter,
  Skelette, Roboter und Mannequins, alle auf zwei menschlichen Skeletten, und
  ein auf 60 cm gestauchter Mensch ist kein Nager. **Dazu kommt jede einzelne
  Figur des Regals als eigene Sorte** — fünfundachtzig weitere Häute, die
  niemand aufgeschrieben hat (siehe unten).
- Das **Hirn** (`worlds/npc/npcBrains.ts`) sagt, was er tut: **Stehen**
  (bleibt, dreht sich zum Spieler, schlägt nie zu), **Schlendern** (läuft
  einen gewürfelten Kurs, bis ihm ein anderer einfällt, und bemerkt niemanden),
  **Verfolgen** (der Zombie: kommt, sobald man in Sichtweite ist, und
  schlägt in Reichweite zu) oder **Zum Ziel** (er hat einen Auftrag und sonst
  nichts: geht dorthin, wo er hinsoll, sieht den Spieler nicht, will ihn nicht,
  schlägt nicht zu — Sichtweite null ist dort die Aussage und keine vergessene
  Zahl). Das vierte ist das Hirn für alles, was etwas **vorführen** soll: Der
  NPC, der zeigen soll, dass man die Treppe hinaufkommt, hat genau eine
  Aufgabe, nämlich hinaufzukommen. Sein Ziel steht im NPC (`Npc.sendTo`) und
  ersetzt den Spieler in beiden Rechnungen auf einmal — der Läufer sucht den
  Weg dorthin, das Hirn bekommt es als Ziel.

Warum getrennt: Zwei mal vier ist acht, und eine Liste von acht Sorten NPC
wäre beim nächsten Modell zwölf und beim übernächsten vierundzwanzig. Vor
allem aber sind es zwei verschiedene Fragen — _wie sieht der aus_ und _was
macht der_ —, und wer sie zusammenlegt, kann keine davon mehr einzeln
beantworten. Eine Übungspuppe mit einem Verfolger-Hirn ist ein Trainingsgegner,
ein Zombie mit „Stehen" eine grüne Zielscheibe; beides fällt ab, ohne dass
jemand etwas dafür gebaut hätte.

**Bedient wird es zweimal, und beide lesen denselben Speicher** — genau wie
beim Beutel, den es als Rasterseite _und_ als Werkzeug gibt. Im Menü unter
**NPC** stehen die Häute als Zeilen (`Zombie setzen`), dazu das eingestellte
Hirn als Unterseite, _Spawnpunkt hier_, _Brutkäfig hier_ und _Alles
wegräumen_. In der Hand tut dasselbe das **Hirn** (`tools/BrainTool.ts`): ein
Gehirn auf dem Standardgriff, mit einem Knopf, der ein Panel öffnet, und einem
Trigger, der setzt, wohin man zeigt. Die Einstellung dahinter steht in
`worlds/npc/npcSettings.ts` und liegt im Browser bei der übrigen Ausrüstung
(`gearStore.ts`, `bgvr.npc`) — wer sich seinen Zombie einmal eingestellt hat,
soll ihn nach dem Neuladen nicht noch einmal einstellen. **Tempo und Leben
sind dabei absolute Zahlen und keine Faktoren**, und sie ziehen mit: eine neue
Haut bringt ihr Leben mit, ein neues Hirn sein Tempo. Wer danach selbst an
einer der beiden dreht, hat sie gesetzt, und dann bleibt sie stehen.

**Das Hirn ist eine Rechnung, und sie steht ohne three.js da**
(`worlds/npc/npcBrain.ts`, mit Test). Hinein gehen zwei Punkte in der Ebene,
ein Gierwinkel und die Zeit; heraus kommt eine Wunschgeschwindigkeit, ein
Gierwinkel und die Frage, ob in dieser Frame ein Schlag landet. Was ein Zombie
tut, ist damit etwas, das man ansehen kann, ohne die Brille aufzusetzen — und
was man nur in der Brille ansehen kann, sieht sich niemand an. Zwei Regeln
darin sind es wert, hier zu stehen:

- **Gelaufen wird, wohin geschaut wird.** Ein NPC schiebt sich nicht seitwärts
  auf den Spieler zu; er dreht sich zu ihm (Drehrate aus dem Hirn, immer über
  den kürzeren Bogen) und geht dann los, und wie weit er schon herumgedreht
  ist, entscheidet über sein Tempo (`aheadFactor`, der Kosinus des Fehlers,
  nach hinten null). Das ist der Unterschied zwischen einem Zombie, der
  torkelt, und einem Schrank auf Schienen.
- **In Reichweite wird nicht mehr gelaufen, sondern geschlagen** — und zwischen
  zwei Schlägen gewartet. Ohne Wartezeit träfe er sechzigmal je Sekunde, und
  das ist kein Schlag mehr, sondern ein Föhn.

**Ein NPC ist ein Körper in der Physik**, ein Zylinder mit **gesperrter
Drehung** (`worlds/npc/Npc.ts`): er fällt, stößt gegen Wände, lässt sich
schieben — kippt aber nicht um, denn einer, der beim ersten Schubser auf dem
Rücken liegt, ist kein Gegner, sondern ein Kegel. Seine **Waagerechte** setzt
das Hirn jedes Bild, die **Senkrechte** bleibt bei der Schwerkraft; darum
fällt er von einer Kante und läuft trotzdem nicht in den Himmel. Weil die
Drehung gesperrt ist, schreibt `physics.sync()` sie als Einheitsdrehung
zurück — der Gierwinkel gehört deshalb dem **Modell** in der Gruppe und nicht
der Gruppe selbst, sonst sähe man ihn genau ein Bild lang.

**Der Ursprung liegt zwischen den Füßen.** Collider, Trefferzonen und der
Punkt, an den einer gesetzt wird, rechnen alle von der Standfläche aus; ein
Modell mit dem Ursprung in der Mitte versinkt bei jeder dieser Rechnungen zur
Hälfte im Boden. Das gilt für beide Körper, die ein NPC haben kann — den
gebauten und den geladenen —, und dass es für beide dieselbe Stelle ist, ist
der Grund, warum sie sich einfach überlagern dürfen.

**Was man sieht, ist eine Figur aus dem Regal.** Bis zum September 2026 war
ein NPC ein **Skelett aus Klötzen**, und das war
eine Behauptung: „ein Skelett mit Gelenken an den richtigen Stellen bewegt sich
besser als ein gekaufter Charakter, der still steht". Seit die Figuren des
Regals laufen können (`core/kaykitFigure.ts`, siehe
[Das KayKit-Regal](assetregal.md) → _Eine Figur, die läuft_), stimmt sie nicht
mehr — der gekaufte Charakter steht nicht mehr still. Der Auftrag dazu war
knapp: „Ich ärgere mich, dass die Charaktere aus dem KayKit-Regal nicht auch
Default-NPC sind. … Zombie durch Mannequin."

**Beides ist jetzt da, und zwar übereinander.** Der Körper aus Klötzen wird
weiter gebaut, und zwar **sofort** — keine Datei, keine Leitung, kein WebGL —;
die Figur kommt nach und blendet ihn aus (`visible = false`, nicht
weggeworfen). Welche Datei welche Haut trägt:

| Haut             | Figur                                                                      | Höhe   |
| ---------------- | -------------------------------------------------------------------------- | ------ |
| **Zombie**       | `character-animations/mannequin-character/characters/Mannequin_Medium.glb` | 1,78 m |
| **Übungspuppe**  | `prototype-bits/character/Dummy.glb`                                       | 1,70 m |
| **Hamster**      | — (gebaut; im Regal steht kein Nager)                                      | 0,60 m |
| Figur aus dem Regal | die ausgesuchte Datei                                                   | 1,75 m (2,80 m auf dem großen Skelett) |

**Die Klötze sind damit der Ersatz und nicht das Provisorium**, und das ist
kein Wortspiel, sondern die Antwort auf drei Fälle, die es wirklich gibt: In
**Jest** gibt es kein WebGL (`core/chefFit.canLoadModels`, dynamischer Import —
`core/kaykitFigure.ts` zieht `GLTFLoader` und `import.meta` mit sich und bringt
den Lauf sonst zum Stehen), in einem **Checkout ohne die gekauften Pakete**
gibt es die Datei nicht, und über eine **Leitung** kann alles schiefgehen. In
allen dreien steht trotzdem ein NPC da, der läuft, schlägt und umfällt — nur
eben als Kasten mit vier Gelenken. Die Tests messen weiter an ihm
(`npcBody.test.ts`: Kopf, Rumpf, Beine gegen `npcHit.bodyShape`), und die
Trefferzonen sind ohnehin gerechnet und nicht abgetastet: Getroffen wird die
Hülle, nicht das Netz.

**Die Höhe ist die erklärte und nicht die gemessene.** `loadKaykitFigure(pfad,
höhe)` bringt jede Figur auf die Zahl, die in der Haut steht — der Zombie bleibt
1,78 m, die Puppe 1,70 m, und beides bleibt genau deshalb stehen: Collider,
Trefferzonen, Lebensbalken und die Stelle, an die einer gesetzt wird, hängen
daran und stehen fest, **bevor** irgendeine Datei angekommen ist. Umgekehrt
hätte jede neue Figur eine andere Hülle — ein Mannequin von 1,54 m und ein
Dummy von 1,68 m wären zwei verschiedene Gegner mit denselben Regeln. Für die
Figuren aus dem Regal gilt dieselbe Zahl für alle (1,75 m, die Mitte zwischen
Zombie und Puppe); nur die des **großen** Skeletts dürfen groß bleiben (2,80 m,
`npcKinds.shelfHeight`), und erkannt werden sie am Namen (`_Large`, `Golem`),
weil die Höhe erst am geladenen Modell feststeht und hier vorher gebraucht wird.

**Was einen Zombie zum Zombie macht, ist die Bewegung** — die Sammlung hat
keine Zombie-Figur, und das Mannequin ist die namenloseste, die es gibt. Eine
Haut darf deshalb **bevorzugte Spuren** mitbringen (`NpcSkin.gaits`,
`npc/npcFigure.ts`, mit Test), und der Zombie tut es: Er steht in
`Melee_Unarmed_Idle`, der Kampfhaltung mit erhobenen Fäusten — das ist die
Silhouette der Klötze (`arms: 'out'`), nur als Bewegung —, und er geht in
`Walking_C`. Beides ist nachgemessen und nicht
geraten (rechte Hand gegen die Hüfte, über einen Zyklus, am laufenden Mischer
im Browser): Im Stand stehen die Hände in der Kampfhaltung 44 cm über der
Hüfte statt 20 wie bei `Idle_A`; beim Gehen schwingt `Walking_A` die Arme weit
mit — die Hand kommt bis 23 cm vor die Hüfte —, bei `Walking_C` bleibt sie über
den ganzen Schritt dahinter. Ein
Zombie schlurft, er spaziert nicht. Angehängt wird die allgemeine Liste
trotzdem immer (`core/kaykitFigureFit.GAIT_CLIPS`): Das **große** Skelett hat
überhaupt nur eine Gehspur (`Walking_A`), und eine Figur, die deshalb gar nicht
mehr geht, wäre der teuerste Weg, einen Geschmack durchzusetzen. Die
Kampfhaltung kennt es dagegen auch — ein Golem als Zombie steht also ebenfalls
mit erhobenen Fäusten da.

**Zwei Dinge tut eine Figur einmal statt dauernd: zuschlagen und sterben.**
Der Schlag ist ein **Ereignis** und kein Zustand — die Klötzchen-Arme holen
aus, solange das Hirn `strike` sagt (das steht an, solange einer in Reichweite
steht), die Spur einer Figur fängt dagegen genau dann an, wenn wirklich ein
Schlag sitzt (`Npc.update` → `NpcBody.swing()`, dazu die Flanke für den Hieb
gegen eine **Tür**, die das Hirn gar nicht kennt). Abgespielt wird er mit
`play(…, {once:true})` und nicht mit `act('attack')`, weil nur die Spur selbst
sagt, **wie lang** sie ist: Danach findet der Körper in seinen Gang zurück, und
bis dahin wechselt er ihn nicht — ein Schlag, den der nächste Schritt
abschneidet, ist ein Zucken. Wer **stirbt**, spielt `Death_A` (einmal, endet
liegend, `clampWhenFinished`); gekippt wird dabei nur der gebaute Körper, denn
der hat keine Spur dafür. Die **Augen** leuchten nur an ihm: Die Materialien
einer Figur gehören der Vorlage im Speicher **und allen anderen Kopien** —
wer sie aufleuchten ließe, ließe jeden Zombie der Halle mitleuchten.

**In den Händen sitzt je ein leerer Anker** (`NpcBody.hands`): er trägt heute
nichts und ist die Stelle, an der später ein Werkzeug hängt — ein NPC mit einer
Schusswaffe ist genau das, dieselbe `Tool`-Instanz wie in einer Spielerhand,
nur an diesem Anker statt am Griffraum eines Controllers. Dass der Anker schon
jetzt mitschwingt, ist der Unterschied zwischen „später einhängen" und „später
umbauen" — und **mit einer Figur zieht er in ihren Handknochen um**
(`bones.handLeft/Right`, nachgemessen: `handl`/`handr` beim Mannequin, das die
`handslot`-Griffpunkte nicht hat). Was dort hängt, nimmt den Maßstab der Figur
an; fehlt der Knochen, bleibt der Anker am unsichtbaren Klötzchen-Arm, und das
ist immer noch ungefähr die richtige Stelle.

**Und jede Figur des Regals ist eine eigene Sorte.** Die Sorte eines NPC ist
eine Zeichenkette, und sie darf eine Adresse sein
(`npcKinds.NpcKind`): `kaykit:adventurers/characters/Knight.glb` gilt überall
dort, wo bisher `zombie` stand — im Menü, in der gespeicherten Einstellung des
Hirn-Werkzeugs (`npcSettings.ts`, `bgvr.npc`) und in einem gespeicherten
Charakter (`characterStore.ts`, samt der Aufnahme darin). Eine Aufzählung wäre
die falsche Form: Es sind fünfundachtzig Figuren, morgen sind es mehr, und
diese Liste stünde dann in vier Dateien noch einmal. Die **Haut** dazu wird
gerechnet und nicht aufgeschrieben (`shelfSkin`, reine Funktion mit Test): Die
Beschriftung kommt aus dem Dateinamen (`Knight`), der Rest sind die Zahlen
eines gewöhnlichen Menschen — 29 cm Radius, 70 kg, 100 Leben, 1,5 m/s, Profil
`human`, Hirn _Verfolgen_. Geprüft wird beim Einlesen nur die **Form**
(`kaykit:`, kein `#` — das sind die Fächer des Regalmenüs —, Endung `.glb`);
ob die Datei wirklich dort liegt, weiß erst das Regal, und ein Speicher, der
darauf wartete, käme nie heraus. Liegt dort nichts, steht ein Körper aus
Klötzen da, und sonst passiert nichts.

**Ausgesucht wird unter _Menü → NPC → Figur aus dem Regal_**: die Schublade
_Figuren_ des Katalogs (`core/kaykitIndex.KAYKIT_CATEGORIES`), dieselben
Kacheln mit dem Modell darin, dieselben zwei Spalten, dieselbe Blätterei in
Fächern zu sechzig (`kaykitSheets` — dieselbe Funktion wie im Regal, damit es
nicht zwei Blätterstellungen gibt, die verschieden brechen). Nur was beim
Aussuchen passiert, ist ein anderes: Im Regal nimmt man ein Modell **in die
Hand**, hier wird einer **hingestellt** — deshalb der Trigger und nicht der
Griff. Wer eine Figur setzt, setzt damit auch die Sorte im Hirn-Werkzeug
(`withKind`), und der nächste Brutkäfig speit Ritter aus.

**Was die Puppe mit einem Skelett kann und was nicht** (`Puppeteer.ts`, siehe
unten): Ein übernommener NPC **mit** Figur folgt in Ort, Drehung und **Tempo**
— er geht, während man geht, weil der Gang aus dem Tempo der Fäden kommt. Seine
**Arme und sein Kopf** folgen nicht. Sie müssten über die Knochen laufen, und
dort stünde ein Oberarm, den `setFromUnitVectors` auf ein Ziel dreht, gegen
einen Mischer, der ihn im selben Bild zurückschreibt — der Ellbogen darunter
bliebe, wo die Spur ihn hat, und heraus käme ein Arm, der halb zeigt und halb
geht. Wer die Arme der Puppe wirklich führen will, nimmt eine Haut **ohne**
Figur (den Hamster, oder eine Sitzung ohne die Pakete): Dort führt `pull`
weiter jeden Klotz, und das ist nach wie vor das, was eine Aufnahme aussagt.

**Getroffen wird mit der Strecke, nicht mit der Kugel** (`worlds/npc/npcHit.ts`,
mit Test). Eine Kugel legt zwischen zwei Bildern Meter zurück; was sie
durchquert hat, ist eine Strecke — dieselbe Rechnung, mit der der Schießstand
seine Scheiben abrechnet (`bulletTravelled`, die der Schießstand jetzt an die
Halle weiterreicht). Getroffen wird dabei **der Körper, den man sieht**:
Kopfkugel, Rumpfkasten, Beinkasten, alle drei aus derselben Rechnung wie das
Modell (`bodyShape`) und deshalb genau dort, wo die Klötze stehen. Weil die
Kästen breiter als tief sind, bringt ein Treffer den **Gierwinkel** mit
(`HitBody.yaw`) — gerechnet wird nicht der Kasten in der Welt, sondern die
Strecke in seinen Maßen. Nur der Kopf sitzt auf der Hochachse und ist damit
richtungslos: ein Kopftreffer ist einer, wo der Kopf ist, egal wohin der Kopf
gerade schaut.

Hier stand einmal ein **Zylinder** um die Hochachse — bequem, weil er sich
nicht mitdrehen muss, und falsch: Sein Halbmesser ist der des Colliders (29 cm
beim Zombie), die Schultern sind 23 cm breit, und die Handbreit dazwischen
zählte als Rumpftreffer. Zusammen mit der Kugel, die an eben diesem Collider
abprallte (siehe unten), war das die Antwort auf „ich treffe ihn und es
passiert nichts": Beides zeigte auf denselben Zylinder, der weder das eine noch
das andere war.

**Kugeln fliegen durch NPCs hindurch** (`PhysicsWorld.GROUP_NPC`). Ein NPC hat
eine eigene Kollisionsgruppe, und eine Kugel filtert sie heraus — als
_physikalischer_ Körper existiert er für sie nicht. Vorher prallte sie an
seinem Zylinder ab, blieb eine Handbreit **vor** der Trefferzone stehen und
sprang zurück: Die Strecke, die anschließend gefragt wurde, hatte ihn nie
berührt, und vier Schuss richteten nichts aus. Alles andere stößt sich
weiterhin an ihm — der Spieler, seine Hände, jede Kiste.

**Man kann die Zonen ansehen**: _Menü → NPC → Trefferzonen zeigen_ (und
derselbe Schalter unter der laufenden Vorschau der Werkzeugseite) hängt jedem
NPC ein Drahtgitter genau dieser Kästen an — Kopf rot, Rumpf und Beine blau,
gezeichnet aus `hitParts()` und nicht aus einer zweiten Rechnung daneben. Es
ist die Ansicht, mit der man „ich treffe ihn nicht" von „ich ziele daneben"
unterscheiden kann.

**Was ein Treffer kostet, bringt die Waffe mit**: die Pistole ihre eingestellte
Zahl (25, also vier Rumpftreffer für einen Zombie), das Messer 50, der große
Hammer 100 — und der Kopf zählt überall vierfach (`HEAD_FACTOR`). Hier stand
einmal eine feste Zahl je Zone, und das hieß: Ein Messer tut genau so weh wie
ein Gewehr. Dass der Kopf, den man
_sieht_, auch der ist, auf den man _zielt_, hält `npcBody.test.ts` fest —
Modell und Trefferzone rechnen dieselbe Zahl (`HEAD_SHARE`), und zwei
Rechnungen, die dasselbe meinen, laufen sonst irgendwann auseinander; dasselbe
misst er inzwischen für Rumpf und Beine nach. Wer
fällt, geht sofort aus der Physik heraus, liegt ein paar Sekunden als Bild da
und verschwindet dann; ohne das Aufräumen füllt sich eine Halle mit Leichen,
und jede davon zeichnet weiter mit. **Weggeräumt wird immer beides**, Modell
und Körper (`Npc.dispose`): ein Zylinder, der ohne sein Modell in Rapier
stehen bleibt, ist ein unsichtbares Hindernis, dessen Ursache man nie findet.

**Was zuschlägt, braucht Tempo und danach eine Pause**
(`portal/tools/meleeSwing.ts`, mit Test). Eine Kugel fliegt los und trifft; ein
Messer liegt in der Hand und ist die ganze Zeit irgendwo. Wer jedes Bild fragt
„stecke ich in einem Zombie", trifft sechzigmal in der Sekunde, und ein Messer,
das man einem Zombie nur hinhält, tötet ihn dann im Zusehen. Ein Schlag zählt
deshalb nur, wenn die **Spitze** sich schnell genug bewegt (`SWING_SPEED`),
danach ist kurz Ruhe (`SWING_REST`), und ein **Sprung** der Spitze — Handwechsel,
Portal, vom Gürtel gezogen — zählt gar nicht, sonst führe die Strecke quer durch
den halben Raum. Wo die Spitze ist, sagt das Werkzeug selbst (`Tool.meleeTip`):
beim Messer die Klingenspitze, beim Hammer der Kopf. Ein **geworfenes** Messer
fragt dieselbe Strecke ab, die es ohnehin schon gegen Wände prüft — und fällt
dort zu Boden, wo es getroffen hat, statt in der Luft zu hängen, wo eben noch
ein Zombie stand.

**Über jedem NPC steht ein Lebensbalken** (`worlds/npc/NpcBody.ts`) — zwei
**Sprites** und keine Textur: Ein Sprite steht in three.js immer quer zur
Kamera, ohne dass jemand es dorthin drehen müsste, und das ist genau, was ein
Balken braucht, den man von vorn, von der Seite **und von oben** liest. Die
Füllung schrumpft nach links (`center`) und geht dabei von Grün über Gelb nach
Rot. **Die Balkengruppe dreht sich nicht mit ihm**: Ein Sprite steht zwar immer
quer zur Kamera, seine _Stelle_ aber kommt aus der Kette darüber — und bei
einem, der einen ansieht (Gierwinkel um 180°), war der linke Rand plötzlich der
rechte, die Füllung stand **neben** ihrem Rahmen statt darin. Also nimmt die
Gruppe die Drehung des Modells wieder heraus. Zu sehen ist er voreingestellt **bei Schaden** — ein Balken über einem
unversehrten Zombie ist eine Zeile, die immer dasselbe sagt, und dreißig davon
sind dreißig. Unter **Menü → NPC → Lebensbalken** steht _immer_ (zum Nachprüfen
der Zahlen) und _aus_; dasselbe schaltet die laufende Vorschau auf der
Werkzeugseite.

**Und andersherum:** ein Schlag, der sitzt, **schiebt den Spieler** und
rüttelt in beiden Händen. Lebenspunkte hat der Spieler nicht — es gibt in
dieser Welt nichts, was sie zählen würde —, und ein Treffer, den man nicht
spürt, ist trotzdem keiner. Wer eine Lebensanzeige will, hängt sie an genau
einer Stelle ein (`PortalWorld.takeHit`).

**Woher einer kommt, dafür gibt es zwei Antworten** (`worlds/npc/npcSpawn.ts`,
mit Test), und beide sind reine Rechnung:

- Ein **Spawnpunkt** ist eine Stelle, an der jemand auftauchen _darf_ — ein
  Kreis auf dem Boden, durch den man hindurchläuft. Wer einen braucht, bekommt
  einen ausgewürfelt, und zwar nach derselben Regel, nach der ein Spieler nach
  dem Tod wieder ins Spiel kommt: **möglichst nicht direkt vor der Nase
  dessen, der schon da ist**. Taugt keiner, wird nicht aufgegeben, sondern der
  entfernteste genommen — in einem kleinen Raum ist keiner weit genug weg,
  und „nicht ideal" ist besser als „gar nicht".
- Ein **Brutkäfig** ist eine Stelle, die von selbst nachlegt; das Vorbild
  steht in einem Verlies aus Klötzchen. Er hat einen Takt, eine Grenze für
  seine eigenen Kinder und einen Ring, in dem sie entstehen. **Der Käfig sagt
  wann, der Spawnpunkt sagt wo**: Sein Kind kommt auf einem ausgewürfelten
  Spawnpunkt heraus (im Ring darum, damit drei Kinder keinen Turm bilden) — und
  wo **kein** Spawnpunkt steht, legt er gar nichts nach und sagt es einmal je
  Takt. Wer einen Zombie umlegt, will ihn liegen sehen und nicht zwei Sekunden
  später wieder vor sich haben; wer Nachschub will, setzt einen Punkt.
  Seine Uhr läuft **nur, während jemand in Reichweite ist**: ein Käfig
  am anderen Ende der Halle soll nicht die ganze Zeit Zombies auswerfen, die
  dort niemand sieht, und wer zurückkommt, soll nicht in eine Wand aus dreißig
  Stück laufen. Sie läuft auch nicht weiter, solange er voll ist, sonst spuckt
  er nach jedem Todesfall sofort nach. Angehalten wird sie, nicht
  zurückgesetzt: wer zurückkommt, wartet den Rest des Takts ab und nicht einen
  ganzen neuen.

Verwaltet wird der ganze Bestand vom **Regisseur** (`worlds/npc/NpcDirector.ts`).
Er hängt an der **Welt** und nicht am Werkzeug — ein Zombie bleibt stehen, wenn
man das Hirn weglegt, und der Käfig legt weiter nach; das Werkzeug ist die
Bedienung, nicht der Besitzer. Der Schnitt dazwischen ist derselbe wie beim
Werkzeugkasten: die Welt reicht ein paar Fähigkeiten herein (`NpcWorld`), der
Bestand reicht ein paar Befehle heraus (`NpcControl`, am Werkzeug erreichbar
über `ToolHost.npcs()`), und keiner der beiden kennt die Innereien des
anderen. _Zurücksetzen_ räumt sie mit weg; vierzig gleichzeitig sind die
Notbremse.

**Wer verfolgt wird, ist der Körper und nicht die Kamera.** Wer mit der Drohne
unterwegs ist, hat seine Sicht verliehen, und der Rig steht dann draußen bei
der Maschine — sein Körper ist aber hiergeblieben (`bodyHome`), und ein Zombie
läuft zu dem Körper, den er sehen kann.

**Durch ein Portal fällt er wie eine Kiste.** Dieselbe Kollisionsmaske,
dieselbe Traversal-Matrix, dasselbe geschnittene Abbild — nachzulesen oben bei
den Portalen. Was dabei **nicht** passiert: Er _plant_ keinen Weg hindurch. Die
Navigationskarte kennt Portale zwar als Verbindung (`navBuild.addPortal`), die
beiden geschossenen stehen aber nicht darin. Ein Zombie fällt also durch ein Bodenportal, das auf seinem Weg
liegt, und er läuft durch ein Wandportal, hinter dem er den Spieler sieht — den
Umweg durch das Portal am anderen Ende der Halle nimmt er nicht. Das ist der
nächste Schritt in dieser Ecke, und er hängt an einer Frage, die die Karte
beantworten muss: auf welcher Kachel ein eben erst geschossenes Loch liegt.

**Was noch nicht geht: das Netz.** Ein NPC ist heute das, was der Sektkorken
ist — jeder sieht seinen eigenen. Zwei Spieler in einem Raum sehen also zwei
verschiedene Zombies. Der Weg dahin, dass sie denselben sehen, führt über
`PortalSync` und über eine Antwort auf die Frage, wer von beiden das Hirn
rechnet; das ist der nächste Schritt und nicht dieser.

## Charakter: übernehmen, vormachen, nachspielen

Bis hierher war ein NPC etwas, das man setzt und dem man zusieht. Seit der
Übungspuppe mit der Heizdecke ist er auch etwas, das man **wird** — und dem
man etwas beibringt. _Menü → NPC → Charakter_ hat dafür vier Zeilen, und alle
vier lesen dieselbe Klasse (`worlds/npc/Puppeteer.ts`, der **Puppenspieler**):

- **Übernehmen** nimmt den NPC, den man anschaut (`NpcDirector.pickAlong`,
  derselbe Strahl wie beim Wegnehmen, nur ohne die Antwort zu beseitigen),
  sonst den nächsten im Umkreis von acht Metern (`nearest`). Der Spieler wird
  **zu ihm** gestellt und nicht er zum Spieler — wer vor der Puppe mit der
  Decke steht, soll dort bleiben. Ab dann steht er, wo man steht, dreht sich,
  wohin man schaut, und seine Arme zeigen dorthin, wo die eigenen Hände sind.
  Die Zeile heißt jetzt _Loslassen_; danach bleibt er stehen, wo man gerade
  ist, und denkt wieder selbst.
- **Aktion aufnehmen** schreibt mit, was man von da an tut — ohne
  übernommenen NPC wird erst einer übernommen, denn wer „aufnehmen" sagt,
  meint nicht „erst einmal übernehmen". Angefasst wird dabei, was man will:
  die Heizdecke aus dem Beutel, die auf der Puppe liegt, wegziehen und
  fallen lassen. _Aufnahme stoppen_ macht daraus die **Aktion** des
  Charakters und speichert ihn gleich im Browser — unter einem Namen, den
  niemand eintippen muss („Übungspuppe 14:32").
- **Aktion abspielen** lässt ihn das Ganze allein tun. Ein übernommener NPC
  wird dafür losgelassen; man steht dann daneben und sieht zu, wie die Puppe
  die Decke noch einmal abnimmt.
- **Charaktere laden** ist die Liste der gespeicherten, die neuesten zuerst.
  Jeder ist eine Seite: _Hinstellen_ (dort, wo seine Aufnahme beginnt, mit dem
  Hirn „Stehen", damit er wartet), _Hinstellen und abspielen_, _Löschen_.

**Wer an den Fäden hängt, ist kinematisch und ein Geist** (`Npc.possess`).
Das Hirn rechnet nicht, der Körper wird jedes Bild dorthin gesetzt, wo die
Fäden ihn haben wollen, und stößt dabei an nichts — aus zwei Gründen, die
beide nicht verhandelbar sind. Der Spieler, der ihn übernommen hat, steht mit
seiner Kapsel **in** ihm; ein fester Zylinder dort schöbe ihn jedes Bild aus
sich selbst heraus. Und eine Aufnahme, die beim Abspielen ein Ding wegschiebt,
das beim Aufnehmen nicht da war, ist keine Wiederholung mehr, sondern ein
neues Ereignis. Die Dinge, die zur Aufnahme gehören, führt der Puppenspieler
selbst — genau wie eine Hand es täte (`setNextKinematicTranslation`, siehe
`PortalWorld.carryGrab`), und am Ende werden sie wieder Körper und behalten
den Schwung ihrer letzten Bilder: Eine Decke, die im letzten Bild noch fiel,
fällt zu Ende.

**Wie man aussieht, während man ihn ist: wie die eigene Figur.** Die steht
auf `LAYER_SELF_ONLY` — das eigene Auge zeichnet sie nicht, Spiegel, Portal
und die Ansicht von oben schon. Ein übernommener NPC bekommt dieselbe Ebene,
und die Figur des Spielers verschwindet solange (`PortalWorld.wearNpc`): Im
Standspiegel steht dann die Übungspuppe, wo sonst der Koch steht. Die
Alternative wäre ein Kopf aus Klötzen vor der eigenen Kamera gewesen.

**Die Arme sind ein Gelenk, keine Ellbogen** (`NpcBody.puppet`,
`NpcBody.pull`). Jeder Arm, der ein Ziel hat, zeigt von seiner Schulter
dorthin — `setFromUnitVectors` von „hängt" nach „dorthin", im Raum des
Modells, mit dem Gierwinkel schon herausgerechnet (`Npc.setPuppet`). Ob die
Hand der Puppe die Decke wirklich erreicht, hängt davon ab, ob die eigene
Hand so weit weg war wie ihre, und das ist ihr egal: Man sieht, dass sie
danach greift, und die Decke bewegt sich, weil ihre Spur es sagt — nicht,
weil eine Hand sie hält. Der Kopf nimmt Nicken und Drehung des Spielerkopfs,
gedeckelt, damit die Puppe ihn nicht auf den Rücken dreht. Die Beine gehen
weiter ihren Schritt: Der kommt aus dem Tempo, und das stimmt.

**Die Aufnahme ist reine Rechnung** (`worlds/npc/npcRecording.ts`, mit Test):
Füße, Gierwinkel, Kopf und Hände, alles in Weltkoordinaten, mit **zwanzig**
Bildern je Sekunde (`RECORD_RATE`) und nicht neunzig — eine Minute davon wäre
ein halbes Megabyte im Browser —, gerundet auf Millimeter, längstens drei
Minuten. Dazwischen wird gerechnet (`poseAt`: Ort linear, Drehung normiert
gemischt, Winkel über den kürzeren Bogen), nicht gesprungen. **Absolut und
nicht relativ zum Start**, mit Absicht: „Die Heizdecke von der Puppe nehmen"
gehört an den Ort, an dem die Decke liegt; ein geladener Charakter wird
deshalb dort hingestellt, wo sein erstes Bild ihn hat.

**Und die Dinge in der Hand laufen als eigene Spuren mit** (`PropTrack`). Was
während der Aufnahme einmal angefasst wurde, wird von da an bis zum Ende
mitgeschrieben — auch nachdem es losgelassen ist, denn wo die Decke hinfällt,
gehört zur Aktion dazu. Jede Spur trägt ihre **Sorte** (`kind`, dieselbe wie
im Beutel) und nicht nur ihre Id: Die Id kennt nur diese Sitzung. Wer einen
alten Charakter in einer neuen Sitzung abspielt, bekommt das Ding aus der
Sorte **nachgebaut**, dort, wo seine Spur beginnt (`Puppeteer.stageProps`,
`PuppetStage.spawnProp`) — aus dem Beutel sofort; ein Modell aus dem Regal
müsste erst geladen werden, und eine Aufnahme wartet nicht, also wird es
gemeldet und ausgelassen. Liegt ein Ding der Aufnahme gerade in der eigenen
Hand, bleibt es dort, und die Spur läuft ohne es.

**Gespeichert wird unter einem eigenen Schlüssel** (`bgvr.characters`,
`worlds/npc/characterStore.ts`, mit Test): Der Rest der Ausrüstung sind ein
paar Zahlen, eine Aufnahme sind tausend Bilder, und läge beides unter einem
Schlüssel, würde jede Einstellung am Hirn die Aufnahmen mit umschreiben. Vor
dem Schreiben wird gemessen (`STORE_LIMIT`, 3,5 Millionen Zeichen): Ein
Charakter, der nicht mehr hineinpasst, wird gemeldet und nicht halb
geschrieben. Was unlesbar ist, wird beim Lesen übersprungen, nicht repariert
(`readRecording`) — lieber ein Eintrag weniger als eine Puppe, die ins
Nichts fliegt, weil in einer Zahl `null` stand. Das Format trägt vom ersten
Tag an eine Versionsnummer.

**Die Heizdecke** (`worlds/portal/heatedBlanket.ts`) ist deshalb ein Ding im
Beutel: 1,50 × 0,80 m, sechs Zentimeter dick, als **gefaltete Decke** und
nicht als Tuch — ein Tuch über einem Körper wäre Stoffsimulation, und die
kostet in der Brille mehr als alles andere in diesem Raum zusammen. Ein
flacher Kasten mit Steppnähten und dem Regler am Kabel liegt auf einer Puppe
wie eine zusammengelegte Decke auf einem Patienten; man sieht, was gemeint
ist, und die Physik trägt ihn wie eine Planke. CCD hat sie, damit sie beim
Wegziehen nicht durch die Puppe fällt.

**Geprüft wird mit echter Physik** (`puppeteer.test.ts`, ein paar Sekunden):
dass ein übernommener NPC steht, wo der Spieler steht, und danach wieder ein
Körper ist, der nicht durch den Boden fällt; dass eine Aufnahme mit der Decke
in der Hand hinterher allein abläuft, samt Decke, und die Decke am Ende dort
liegt, wo die Aufnahme sie ließ; dass ein Charakter aus einer fremden Sitzung
seine Decke nachgebaut bekommt und ein Regalmodell gemeldet wird; und dass ein
weggeräumter NPC alles mitnimmt, was an ihm hing.

**Was noch nicht geht**: das Netz — ein übernommener NPC ist für die anderen
in der Sitzung derselbe unsichtbare Zombie wie jeder andere (siehe oben); und
die Hände der Puppe tragen beim Abspielen nichts, die Decke bewegt sich
allein. Beides führt über `PortalSync`, wie alles, was hier geteilt werden
soll.

## Wie sich NPCs orientieren

Die Navigation ist eine **eigene Schicht** unter den NPCs (`worlds/nav/`), und
sie kennt weder three.js noch Rapier. Hinein gehen Kachelschlüssel und Meter,
heraus kommen Wege, Sichtlinien und Geschwindigkeiten — deshalb ist sie
vollständig geprüft, und deshalb kann derselbe Graph eine Welt, eine
Debug-Ansicht und einen Test bedienen.

**Die Karte ist ein Kachelgitter mit Etagenindex.** Eine Kachel ist **einen
Meter** breit (`TILE`, seit September 2026 — vorher 2,5 m, siehe _Welten auf
dem Kachelgitter_), und diese Zahl ist eine Konstante und keine Einstellung:
Sie steht in jeder gespeicherten Karte im Kopf, und wer sie ändert, macht jede
davon ungültig. Die Höhe ist ein **Index** und keine Zahl — Dach, Erdgeschoss und
Tunnel darunter liegen übereinander, ohne dass irgendeine Rechnung entscheiden
müsste, ob zwei Kacheln noch dieselbe Ebene sind. Was zwischen zwei
Kachelmitten passiert, ist ausdrücklich nicht Sache des Gitters, sondern der
Fortbewegung.

**Wände stehen zwischen Kacheln und bedeuten drei Dinge auf einmal**: ob man
hindurchkommt, ob man hindurchsieht, und wie viel man hindurchhört. Ein Fenster
ist deshalb kein „solid" mit anderer Textur, sondern eine eigene Art — es hält
auf und verrät trotzdem, was dahinter passiert. Hätte jede der drei Fragen ihr
eigenes Modell, drifteten alle drei auseinander, sobald jemand eine Wand
versetzt.

**Alles, was nicht Nachbarschaft ist, ist eine Verbindung**: Treppe, Leiter,
Absprung, Portal. Ein Portal ist dabei nichts Besonderes, sondern eine
Verbindung mit Kosten nahe null, die zur Laufzeit dazukommt und wieder
verschwindet — dieselbe Bauart, die Quake III 1999 „teleporter reachability"
nannte. Welche Art wer benutzen darf, steht im Kostenprofil: Ein Zombie nimmt
keine Leiter, ein Fahrzeug keine Treppe.

**Dieselbe Karte liest jede Sorte anders.** Eine Kachel trägt nur, _was_ dort
ist (Stacheln, Wasser, freies Feld); was das _kostet_, entscheidet erst das
Profil dessen, der darüberläuft (`navProfile.ts`). Der Zombie hat für Stacheln
keinen Eintrag und fällt hinein, der Mensch hat dort `Infinity` und geht außen
herum. `Infinity` heißt dabei „niemals" und nicht „sehr teuer" — wer „lieber
nicht, aber im Notfall doch" will, schreibt eine große endliche Zahl hin.

**Und dasselbe Gelände liest auch jede Sorte anders.** Das ist derselbe
Gedanke, eine Etage tiefer, und er hat das Abtasten umgebaut: Eine Verbindung
trägt nicht mehr die _Antwort_ („das ist eine Treppe"), sondern die **Form** —
wie viel es hinaufgeht (`rise`), wie hoch die größte einzelne Stufe darin ist
(`step`) und wie weit es waagerecht ist (`gap`). Fünf Zahlen im Profil machen
daraus ein Ja oder ein Nein:

- **`stepUp`** — was er _tritt_, ohne etwas dafür zu tun. Die Bordsteinkante.
- **`jumpUp`** — was er sich _hochzieht_. Das ist die Zahl, an der eine
  60-cm-Stufe für einen Zombie ein Weg ist und für einen Hamster eine Wand.
- **`maxSlope`** — wie steil ein Weg noch sein darf, in Grad, gemessen über
  eine Kachel. Sie gilt nur, wo der Boden **durchläuft**; eine einzelne Kante
  ist keine Steigung, sonst wäre jede Bordsteinkante eine 9°-Rampe und jede
  Mauer eine 45°.
- **`dropDown`** — wie tief er _freiwillig_ springt.
- **`leapOver`** — wie weit er über eine Lücke setzt.

Dazu kommt der **Fallschaden** (`navFall.ts`) als sechste Zahl, und er ist die
einzige, die nicht im Profil steht, sondern sich daraus ergibt: Was mehr
abzieht, als eine Sorte Leben hat, springt sie nicht. Zwei Meter für einen
Hamster, vier für einen Zombie — dieselbe Dachkante, zwei Antworten, und keine
davon steht irgendwo als Sonderfall. Dass der Sprung dann auch wirklich
wehtut, ist die andere Hälfte davon (`npc/Npc.land`): Eine Wegsuche, die
Fallschaden einrechnet, den es beim Landen gar nicht gibt, behauptet etwas, das
niemand widerlegen kann.

**Eine Kante ist damit keine Einbahnstraße mehr.** Sie steht einmal in der
Karte und gilt in beide Richtungen; welche davon geht, fragt die Wegsuche für
**die Richtung, in die gelaufen wird** (`linkFactor`) — hinunter ein Absprung,
hinauf eine Wand. Vorher entschied das Abtasten das ein für alle Mal, und weil
es nur zwei der vier Himmelsrichtungen abläuft, hing die Antwort daran, ob die
höhere Kachel im Norden oder im Süden lag.

**Was sich ändert, ändert nichts am Graphen.** Eine Kiste setzt eine Kachel auf
`blocked`, eine Tür kippt ein Flag, ein Portal fügt zwei Kanten ein. Neu
gerechnet wird nie — die Wegsuche läuft ohnehin jedes Mal neu, und die ist
billig; teuer wäre nur das Aufbauen des Gitters, und genau das passiert dabei
nicht.

**Was ein NPC weiß, ist nicht, was die Welt weiß** (`navBelief.ts`). Jeder trägt
nur eine **Abweichungsliste** gegenüber der Wahrheit mit sich: „Tür 7 war
offen, Stand t=120 s", „das Portal kenne ich nicht". Wo nichts eingetragen ist,
gilt die Welt. Ein NPC darf deshalb gegen eine inzwischen verschlossene Tür
laufen und erst dort umplanen — **das ist das gewollte Verhalten**. Wer diese
Datei später „repariert", indem er Meinung und Wahrheit abgleicht, hat die
Hellsicht wieder eingebaut, und man sieht sie einem Bot sofort an, ohne sagen
zu können, woran. Zum Planen zählt die Meinung, zum Sehen und Hören nie: Man
sieht nicht durch eine Tür, nur weil man sie für offen hält.

**Und was er nie gesehen hat, hält er für offen** (`hopeful`). Das ist die
Freiraum-Annahme, mit der Roboter seit je durch unbekannte Gänge fahren, und
sie schließt die Lücke, die „wo nichts eingetragen ist, gilt die Welt" offen
ließ: Für eine Tür, an der noch nie jemand stand, _war_ die Welt eingetragen —
also wusste ein Zombie schon dreißig Meter vor einer Metalltür, dass sie zu
ist, und bog ab, ohne je dagewesen zu sein. Dieselbe Hellsicht wie oben, nur an
der Stelle, an der niemand sie vermutet. Jetzt läuft er hin, steht davor, sieht
sie an (`navAgent.doorAhead` trägt sie in dem Moment ein, in dem sie in
Reichweite ist) und plant _dort_ um — außen herum bei Metall, mit den Fäusten
bei Holz. Das **Material** ist davon ausgenommen und kommt weiter aus der Welt:
Ob eine Tür aus Brettern oder aus Blech ist, sieht man ihr an; ob sie
abgeschlossen ist, nicht.

Zwei Feinheiten hängen daran, und beide sind teuer bezahlt: `seeDoor` meldet
**nur eine Änderung** als Änderung, sonst plant einer, der eine Sekunde vor
seiner Tür steht, sechzigmal neu, weil er seine eigene Meinung für eine
Neuigkeit hält. Und die **Attrappe der Vorschau** hofft ausdrücklich nicht
(`shared/previewWalk.ts`): Sie ist der Zuschauer und keine Figur im Stück, und
ein Ring, der zu einer verriegelten Tür läuft und wieder umkehrt, sähe aus wie
eine kaputte Wegsuche.

**Route und Fortbewegung sind getrennt** (`locomotion.ts`). Die Wegsuche
liefert Kacheln; was daraus wird, entscheidet die Fortbewegungsart hinter einer
gemeinsamen Schnittstelle: der **Fußgänger** dreht sich und geht los, das
**Fahrzeug** hat einen Wendekreis und lenkt im Stand gar nicht (ω = v/R), der
**Flug** nimmt die Luftlinie und das Gitter überhaupt nicht. Wer beides
zusammenlegte, hätte am Ende eine Wegsuche, die weiß, dass Autos nicht
rückwärts durch Türen fahren — und eine zweite, sobald das erste Boot kommt.

**Für viele auf einmal gibt es das Strömungsfeld** (`flowField`). Ein Dijkstra
rückwärts vom Ziel, danach ist „wohin als nächstes" ein Nachschlagen, und ob
dreißig oder dreihundert danach fragen, kostet gleich viel. Rückwärts, damit
eine einseitige Verbindung einseitig bleibt: ein vorwärts gebautes Feld ließe
die Horde Klippen hochlaufen.

**Das Dateiformat hat vom ersten Tag an eine Versionsnummer**
(`navSerial.ts`, `NAV_VERSION`). Kacheln stehen als Läufe darin (ein Zimmer ist
vier Zeilen und nicht zwanzig), Wände und Verbindungen einzeln, und dieselbe
Karte ergibt immer dieselbe Datei — sonst zeigt ein Diff Umsortierung statt
Änderung. Gesperrte Kacheln sind Laufzeit und werden nicht gespeichert, und
**das Leben einer Tür auch nicht**: Eine gespeicherte Karte hat heile Türen;
was jemand in einer Runde kaputtgeschlagen hat, ist ein Ereignis dieser Runde
und kein Bauplan. Ihr **Material** steht sehr wohl darin — dafür ist die
Version auf **2** gegangen, und eine Tür ohne Angabe stammt aus einer Datei der
Version 1: Damals gab es nur eine Sorte, und die war aus Brettern. Wer die
Version erhöht, schreibt in `migrate()` einen Zweig dazu; ein stilles „geht
schon" ist die einzige Möglichkeit, sich hier die Karten kaputtzumachen.

**Keine Welt wird „auf Kacheln umgebaut" — sie wird abgetastet**
(`navBake.ts`). Die Welten dieses Projekts bestehen aus achsenparallelen
Quadern, `slab()` baut sie und `solids` sammelt sie; daraus lässt sich das
Gitter ableiten, ohne eine einzige Weltklasse anzufassen. Über jeder
Kachelmitte werden alle Deckel gesucht, die dort liegen — Sand bei 0, die
Stockwerke bei 3,1 und 6,2, das Dach bei 12,4 —, und jeder wird eine Kachel auf
seiner Etage, sofern darüber genug Luft für einen NPC ist. Deshalb sind der
Tunnel und der Sand darüber zwei Kacheln, und deshalb entsteht unter einem zu
niedrigen Vordach gar keine. Zwischen zwei Kacheln wird gefragt, ob dort in
Kopfhöhe etwas steht; sonst entscheidet der Höhenunterschied, ob es eine Stufe,
eine Treppe, ein Absprung oder eine Wand ist. `PortalWorld` ruft das einmal nach
`buildEnvironment()`, und damit hat **jede** Welt ihr Gitter — der Hub, der
Bauplatz, die Testwelt, alle.

**Eine Welt auf dem Kachelgitter wird trotzdem abgetastet** (`grid/GridWorld.ts`),
und das ist kein Versehen. Sie _hätte_ ihren Graphen ja schon; ihn hier
einzusetzen statt abzutasten wäre bequem und würde genau eine Sache verlieren:
die Probe. Das Abtasten liest, was wirklich gebaut wurde, und wenn dabei die
Karte des Plans herauskommt, stimmen Plan und Welt überein. Danach wird
darübergelegt, was in keinem Quader steht und nur der Plan weiß: dass eine Wand
aufgehen kann, dass auf einer Kachel eine Küchenzeile steht, dass eine Treppe
zwei Etagen verbindet.

Drei Zahlen daran sind teuer bezahlt, und alle drei standen hinter einem
Eindruck aus der Brille, den niemand erklären konnte:

- **Eine Lücke ist erst eine, wenn jemand hindurchpasst** (`edgeOpen`). Bis
  dahin lag zwischen zwei Kachelmitten genau **ein** Prüfpunkt: die Grenze
  dazwischen. Stand dort nichts, war die Kachelgrenze offen — auch dann, wenn
  links und rechts davon je einen Meter weit eine Mauer stand und der Schlitz
  dazwischen zwanzig Zentimeter breit war. Auf der Karte war das ein Durchgang,
  in der Welt eine Wand mit einem Guckloch, und der Zombie davor lief so lange
  dagegen, bis jemandem auffiel, dass er durch eine Wand _wollte_. Jetzt wird
  quer zur Laufrichtung abgetastet, vom Mittelpunkt nach beiden Seiten, und was
  frei bleibt, muss die **Schulterbreite** tragen (`BAKE_DEFAULTS.width`, 70 cm
  — ein Zombie ist 58 dick). Gemessen wird nur der Streifen um die Mitte: Eine
  freie Ecke am Rand der Kachelgrenze nützt niemandem, der von Kachelmitte zu
  Kachelmitte läuft.
- **Ein Boden, auf dem etwas steht, ist keiner.** „Vergraben" hieß bis dahin,
  dass ein anderer Kasten den Deckel _überspannt_ — ein Klotz, der bei y = 0
  anfängt, saß aber genau darauf und überspannte ihn nicht. Damit blieb unter
  jedem Klotz und in jeder aufsitzenden Wand eine Kachel übrig, die es nicht
  gibt. Zugemauert war sie von allen Seiten, also lief niemand hinein — sichtbar
  gemacht (Ebene _Betretbar_) sieht man aber sofort, dass die Karte dort Boden
  behauptet, wo Beton ist.
- **Ein Absatz ist derselbe, von welcher Seite man ihn ansieht.** Abgetastet
  werden nur zwei der vier Richtungen (Nord und Ost) — jede Grenze gehört genau
  einer Kachel, sonst stünde jede Wand zweimal da. Damit hing aber daran, ob ein
  Absatz eine **Treppe** (hin und zurück) oder ein **Absprung** (nur hinunter)
  wurde, welche Himmelsrichtung er zufällig hatte: Lag die höhere Kachel im
  Norden oder Osten, kam man hinauf; lag sie im Süden oder Westen, war dieselbe
  Stufe eine Einbahnstraße nach unten. In der halben Welt kam niemand die Rampe
  hinauf, die er gerade heruntergefallen war — und man suchte den Fehler in der
  Wegsuche, weil das Gitter ja eine Verbindung zeigte. Entschieden wird jetzt
  nach der **Höhe**: Was man hinaufkommt, geht in beide Richtungen.

Eine Welt darf zwei Dinge dazu sagen: `navLevels()` nennt ihre Stockwerke —
eine Welt mit Podesten tut das, sonst würde eine Etage zu viel geraten, weil
ein Podest bei 1,2 m aussieht wie eine eigene Ebene —, und `navBounds()` sagt,
was abgetastet wird. Voreingestellt ist
der Umriss aller gebauten Quader **ohne** die Fläche bis zum Horizont: Die ist
absichtlich riesig, und wer sie mitzählte, tastete einen halben
Quadratkilometer leeren Sand ab. Als Boden zählt sie trotzdem — sie steckt in
den Kästen, nur nicht in den Grenzen.

**Ansehen kann man es im Menü**: _NPC → Navigationsgitter zeigen_
(`navScene.ts`). Kacheln blau, Wände rot, Kanten gelb, Verbindungen violett,
Gesperrtes magenta — und die Zeile darunter sagt, wie viele Kacheln auf welcher
Etage gefunden wurden. Ein Gitter, das man nicht sieht, ist eines, dessen
Fehler man an einem NPC sucht, der komisch läuft; und dort findet man sie nie.
`navScene.ts` ist dabei die **einzige** Datei der Schicht, die three.js kennt —
alles andere rechnet mit Zahlen und läuft im Test.

**Angeschlossen ist es über den Läufer** (`navAgent.ts`). Er ist die
Buchhaltung zwischen einer Wegsuche, die einmal antwortet, und einem NPC, der
sechzigmal je Sekunde fragt: Geplant wird alle halbe Sekunde, gelaufen jedes
Bild. Kommt er eine Weile nicht voran, **sieht er nach**, was ihn aufhält
(`observe`) — in die _Laufrichtung_, nicht auf den Wegpunkt, denn nach der
Glättung liegt der oft zehn Kacheln weit weg —, trägt es in seine Meinung ein
und plant von dort neu. Das Hirn bekommt davon nur den nächsten Wegpunkt
(`npcBrain.ts`, `sense.waypoint`); **gesehen und geschlagen wird trotzdem der
Spieler**, sonst schlüge ein Zombie gegen Hausecken.

Welches Kostenprofil einer benutzt, sagt seine **Haut** und nicht sein Hirn
(`npcKinds.ts`, `profile`): Was einem wehtut, hängt daran, was man ist, und
nicht daran, was man vorhat — und dasselbe gilt für die Beine, mit denen er
Kanten und Steigungen liest. Ein **Portal** ist dabei die eine Verbindung, die
ein Körper nicht laufen kann — der Läufer meldet sie als `jump`, und `Npc`
setzt den Körper um.

**Ansehen lässt sich das alles in sieben Ebenen**, einzeln schaltbar
(`nav/navLayers.ts`): Kacheln, die **betretbare Fläche**, Wände, Verbindungen,
Sperren, die gerade gelaufenen Wege und der **Sichtbereich** der NPCs. Alles auf
einmal ist bei ein paar hundert Kacheln eine Wolke aus Linien, in der man nichts
findet — wer wissen will, warum ein Zombie stehen bleibt, schaltet die Sperren
an und den Rest aus. Voreingestellt sind **Kacheln, Fläche und Wege**: die drei
beantworten zusammen „wo kann er hin, und wo will er gerade hin"; der Rest
beantwortet „warum nicht dorthin" und wird erst gebraucht, wenn etwas nicht
stimmt.

Die beiden neuen sind es wert, einzeln erklärt zu werden, weil beide aus
derselben Beschwerde entstanden sind — „einige Zombies wollen durch eine Wand":

- **Betretbar** ist die Kachel als _Fläche_ und nicht als Umriss. Ein Raster aus
  dünnen Linien zeigt, wo Kacheln liegen; aus dreißig Metern Höhe sieht man
  darin aber nicht, wo **keine** liegt — und das ist die Frage, wenn ein NPC in
  eine Lücke plant, die es nicht gibt. Sie ist die einzige Ebene, die
  `depthTest` **anlässt**: Eine Fläche, die durch jede Wand hindurchleuchtet,
  ist von oben ein blauer Teppich über dem ganzen Labor und sagt gar nichts
  mehr. Und sie **rückt von jeder Wand ab**, Seite für Seite, genau so weit, wie
  der Weg dort Abstand hält (`shrinkFor`) — dasselbe Bild, das eine
  Unity-Navmesh von ihren Rändern zeigt, nur in einem Kachelgitter, das keine
  halben Kacheln kennt: Eingezogen wird beim **Zeichnen**. Zwei verschiedene
  Zahlen dafür wären eine Ansicht, die etwas anderes zeigt, als gelaufen wird —
  und dann sucht man den Fehler dort, wo keiner ist.

  **Und an den Ecken auch.** Seite für Seite reicht nämlich nicht, und das war
  der Fehler, den man von oben sah: An einer Wand entlang rückte die Fläche
  sauber ab, an ihrem **Kopfende** nicht. Dort liegt eine Kachel, die auf allen
  vier Seiten frei ist — nur steht die Stirnseite des Klotzes eben in ihrer
  Ecke, und ein Zylinder, der dorthin plant, steckt darin. Gefragt wird deshalb
  jede der vier Ecken einzeln, und zwar mit derselben Funktion, die der
  Schnurzug an jedem Durchlass fragt (`navPath.cornerBlocked`); wo etwas steht,
  fehlt ein Quadrat von der Größe des Abstands. Aus einem Rechteck werden dabei
  bis zu neun Felder eines 3 × 3-Rasters — die übrigen werden wieder
  zusammengefasst, sonst wären ein paar hundert Kacheln ein paar tausend
  Dreiecke, wo ein Rechteck je Kachel reicht.

- **Wege** zeichnen die **Wegpunkte** und nicht die Kachelmitten
  (`navAgent.points`). Der Unterschied ist der ganze Zweck der Ebene: Eine Linie
  durch Kachelmitten schneidet jede Hausecke, um die der Läufer in Wirklichkeit
  einen Bogen macht — sie sieht aus wie ein Weg mitten durch die Wand, direkt
  neben einer betretbaren Fläche, die dort gerade abgerückt ist. Zwei Ansichten
  desselben Wegs, die sich widersprechen, sind schlimmer als eine grobe.
- **Wände** zeichnen eine **Tür in der Farbe ihres Materials**: Holz und Metall
  sind auf der Karte dieselbe Linie und bedeuten für einen Zombie das Gegenteil
  voneinander. Wer wissen will, warum einer außen herumläuft und der nächste
  geradeaus durchbricht, sieht es hier und nirgends sonst.
- **Sicht** hängt nicht am Gitter, sondern an den NPCs: Der Fächer wird an ihr
  Modell gebaut und dreht sich mit ihnen (`npc/NpcBody.setSight`). Zwei Formen,
  und der Unterschied ist die halbe Auskunft: Der **Ring** ist die Entfernung,
  auf die ein Zombie einen wirklich bemerkt (`npcBrains.ts`, `tuning.sense` —
  eine Zahl, sonst nichts, und deshalb rundherum); der **Kegel** ist die
  Richtung, in die er schaut, und die zählt heute nur für die Sinne, die eine
  Karte lesen (`nav/navPerception.ts`). Wer beides sieht, versteht sofort,
  warum einer einen im Rücken bemerkt.

**Und daneben drei Schalter, die etwas anderes tun** (`nav/navSwitches.ts`).
Der Unterschied zu den Ebenen ist der ganze Punkt und steht deshalb auch im
Menü in einer eigenen Zeile („Navigation schalten"): Eine **Ebene** macht etwas
_sichtbar_, ein **Schalter** macht es _wirksam_. „Hindernisse aus" heißt nicht,
dass die Kiste verschwindet — es heißt, dass die Wegsuche sie nicht mehr
beachtet, der Zombie mitten hindurchplant und dagegenrennt. Es sind dieselben
drei, die eine Unity-Navmesh ausmachen:

- **Fläche** (_NavMesh Surface_) — das Gitter selbst. Aus heißt: niemand sucht
  mehr einen Weg, die Hirne laufen stur auf den Spieler zu. Der einzige
  Schalter, an dem man in einem Bild sieht, was die Wegsuche den ganzen Tag
  leistet. Er hängt in der Welt (`PortalWorld.navForAgents`) und nicht im
  Graphen, denn er schaltet nichts _am_ Gitter ab, sondern das Gitter selbst.
- **Hindernisse** (_NavMesh Obstacle_) — was zur Laufzeit im Weg steht
  (`setBlocked`): die Kiste, die jemand abstellt.
- **Verbindungen** (_Off-Mesh Links_) — Treppe, Absprung, Leiter, Portal. Aus
  heißt: nur noch Nachbarkacheln, und der kurze Weg ist auf einmal der lange.

Die beiden letzten sitzen im Graphen (`NavGraph.features`) und schalten das
**Zählen** und nicht den Bestand: Was gesperrt ist, bleibt gesperrt eingetragen
(`blockedKeys`), es gilt bloß nicht. Deshalb zeichnet die Debug-Ansicht
weiter, was da ist — sonst schaltete man etwas aus und sähe nichts mehr, woran
man merkt, dass es aus ist. In jeder Welt fangen alle drei **an** an; ein
Schalter, der irgendwo aus anfängt, lässt einen den Fehler in der Wegsuche
suchen, der in einer Einstellung steckt.

Umgeschaltet wird die **Sichtbarkeit** und nicht die Geometrie — jede
Linienmenge trägt den Namen ihrer Ebene. Gebaut wird das Gitter erst, wenn
wirklich etwas davon zu sehen sein soll, und wieder abgeräumt, wenn nichts mehr
an ist: Unsichtbare Linien kosten in der Brille genauso viel wie sichtbare. Die
Wege werden fünfmal je Sekunde neu gezeichnet, nicht sechzigmal — ein Weg
ändert sich, wenn neu geplant wird.

Die Schalter und die sieben Ebenen hingen im **Navigationslabor** an zwei
Wandkonsolen, dort, wo man beim Zusehen stand: oben zeigen, unten schalten,
dazwischen eine eigene Überschrift. Stünden sie in derselben Reihe, hielte man
die Schalter für Ebenen und wunderte sich, warum ein Zombie plötzlich durch
eine Kiste läuft; und „Verbindungen" stünde zweimal darauf und meinte
zweierlei. Deshalb trugen die Schalter intern ein Präfix (`sw:`) — zwei Tasten,
die dasselbe heißen und Verschiedenes tun, sind der Fehler, den man in der
Brille am schwersten findet. Die Welt ist seit September 2026 gelöscht;
geschaltet wird jetzt am Handgelenk und auf der Werkzeugseite, und die eine
Zahl daraus, die man sonst wieder falsch macht, steht hier: **Eine Tafel schaut
nach +Z**, ein Körper nach −Z. Wer eine Konsole wie einen NPC ausrichtet, hängt
sie mit dem Rücken zum Raum an die Wand und sieht eine schwarze Platte.

**Was das Labor war und wozu es gut war.** Elf Buchten, elf rote Knöpfe, und in
jeder eine Behauptung, die man nachprüfen konnte — langer Gang um zwei Ecken,
Stachelgrube, Kiste im Weg, zu enger Gang, Tür fällt hinter dem Verfolger zu,
Portal, von dem nur einer weiß, Dachkante, Podest und Sprung, drei Steigungen.
Es war der einzige Ort, an dem eine Wegsuche nicht als Zahl, sondern als
**Eindruck** geprüft wurde: „der Zombie läuft durch die verriegelte Tür" ist
keine falsche Zahl, sondern ein Weg, den man erst sieht, wenn man ihn abläuft.
Was es an Einsichten gebracht hat, steht heute dort, wo es hingehört — in
`navBake.ts`, `navProfile.ts`, `navDoor.ts` und `PhysicsWorld.ts` —, und die
**Navigationszone der Testwelt** stellt vier seiner Fragen wieder auf: enger
Gang mit Kiste, Tür, Stachelfeld, ein NPC von A nach B.

Die drei Zahlen, an denen es zweimal gescheitert ist, gelten weiter:

- **Jedes Maß ist ein Vielfaches der Kachel** (`nav/navTile.ts`, seit September
  2026 ein Meter). Das Abtasten fragt zwischen zwei Kachelmitten genau **einen**
  Punkt: die Grenze dazwischen (`navBake.ts`, `joinTiles`). Eine Wand einen
  halben Meter daneben steht in der Welt, aber nicht auf der Karte — der NPC
  plant seelenruhig einen Weg mitten hindurch und bleibt daran hängen. Genau so
  war das Labor lange gebaut (22 × 16 Meter im Raster von 2,5), und von den
  Wänden jeder Bucht kannte die Wegsuche zwei: die Rückwand fehlte, die
  Stirnwände fehlten, und ein Zombie im langen Gang lief hinten aus seiner Bucht
  heraus und um das ganze Labor herum. Wer eine Wand danebenstellt, sieht es im
  Test und nicht in der Brille.
- **Die Kachelmitte entscheidet, auch beim Anmalen** (`navBuild.paintRect`,
  `coverRect`). Eine Kachel gehört zu einem Rechteck in Weltmetern, wenn ihre
  **Mitte** darin liegt — dieselbe Regel, nach der das Abtasten Boden findet.
  Hier lief einmal eine Schleife bis einschließlich der Rechteckkante, und die
  gehört schon zur nächsten Kachel: Ein Stachelfeld von sechs Kacheln war auf
  der Karte sieben breit, und zwar nur nach Osten und nach Süden. Zu sehen war
  davon nichts als ein Mensch, der einen viel zu großen Bogen darum lief — die
  Kachel daneben galt ihm ja als Grube. Ein Anmalen, das eine Kachel zu weit
  reicht, sieht man nie an der Karte, sondern immer nur an einem Weg, der
  komisch aussieht.
- **Ein Zombie bemerkt einen Spieler auf 22 Meter** (`npcBrains.ts`, `sense`).
  Im Labor waren es vom Mittelgang zu den äußeren Buchten fast vierzig, und
  fünf von sechs roten Knöpfen starteten damit ein Szenario, in dem niemand
  einen Schritt tat — das sah nicht nach einer zu großen Zahl aus, sondern nach
  kaputter Wegsuche. Wer etwas vorführen will, stellt den Zuschauer in
  Sichtweite oder gibt dem NPC einen **Auftrag** (Hirn _Zum Ziel_) statt eines
  Spielers.

**Die Stachelgrube war eine Falle und kein Anstrich**, und daran hängt die eine
Stelle, an der eine Karte mit Absicht etwas anderes sagt als die Geometrie: In
der Welt war sie ein Loch, über dem das Abtasten keinen Boden findet — ohne eine
Zeile dagegen plante niemand mehr hindurch, und aus der Falle wäre eine Wand
geworden, um die beide Sorten herumgehen. Also liegt auf der Karte an derselben
Stelle ein ganz normaler Weg, auf dem Stacheln stehen (`navBuild.coverRect`).
Die Grube muss dafür **tiefer sein als das Band**, mit dem das Abtasten Böden
einer Etage zuschlägt (`BAKE_DEFAULTS.band`, 1,6 m) — sonst wäre sie für die
Karte bloß eine tiefergelegte Kachel mit einer Treppe hinein und wieder heraus.
Das Stachelfeld der Testwelt macht es sich einfacher: Es ist eine
**Kachelnotiz** auf ebenem Boden (`TileFacts.hazard`) und braucht kein Loch.

**Eine Tür ist kein Wahrheitswert mehr, sondern ein Ding aus einem Material**
(`nav/navDoor.ts`). Vorher gab es nur „offen" und „zu" und dazu die Frage, ob
jemand Klinken bedienen kann — das reicht für ein Haus mit Bewohnern und nicht
für eines mit Zombies davor: Der Zombie macht keine Tür auf, aber er läuft auch
nicht ratlos außen herum, wenn sie aus Brettern ist. Er schlägt sie ein. Drei
Zahlen je Material entscheiden das:

- **Leben.** Holz hält 80 aus, Metall `Infinity` — und das ist kein Zahlenspiel:
  Eine Metalltür, die nach fünf Minuten Prügel doch aufgeht, ist keine Wand
  mehr, und die halbe Karte hängt daran, dass sie eine ist.
- **Was der Weg durch sie kostet**, wenn man sie erst einschlagen muss: zehn
  Meter. Die Zahl ist der Umweg, ab dem sich das Einschlagen lohnt — wer außen
  herum zwanzig Meter läuft, tritt lieber die Tür ein; wer fünf läuft, geht
  außen herum. Genau so soll es aussehen, und genau so plant die Wegsuche.
- **Wie schnell einer sie kleinbekommt.** Aus Leben durch Schaden wird die Zeit,
  die man in der Brille davorsteht — drei Sekunden sind ein Ereignis, zwanzig
  sind ein Hänger.

Wer **aufmachen** kann, macht auf: drei Meter sind billiger als eine
eingetretene Tür, und niemand tritt eine Tür ein, deren Klinke er in der Hand
hält (`navGraph.wallState`, `closedDoor`). Wer nicht aufbekommt — oder vor einer
**verriegelten** steht —, schlägt zu, und ob das etwas nützt, entscheidet das
Material. Eine Barrikade ist damit etwas, das man vor eine Tür stellt, und kein
Zauberspruch: Für den Menschen ist sie eine Wand, der Zombie schlägt beides
zusammen kurz und klein. Welches Profil zuschlägt, steht in einer Zeile Tabelle
(`navProfile.ts`, `breaks`).

**Eine eingeschlagene Tür ist keine Tür mehr, sondern das Loch, in dem sie
hing**: offen für jeden, für immer, und niemand muss davon erst gehört haben —
auch eine alte Meinung („die war zu") gilt dort nicht mehr, sonst stünde ihr
Besitzer vor dem Trümmerhaufen, durch den er gerade gegangen ist. `setDoor`
lehnt es deshalb ab, sie wieder zuzuziehen; heil wird sie nur beim Aufräumen
zwischen zwei Durchläufen (`mendDoor`).

**Der Handgriff selbst liegt beim Läufer und nicht bei der Welt**: `navAgent.ts`
meldet je Bild, vor welcher Tür einer steht und was sie von ihm verlangt
(`AgentStep.door`, `doorAction`) — und zwar erst **in Reichweite**, gemessen
zur Wandlinie und nicht zur Kachelmitte, sonst ginge eine Tür auf, während man
noch zwei Meter davor steht. `Npc.workDoor` macht daraus die halbe Sekunde an
der Klinke oder das Einprügeln; die Attrappe der Vorschau tut dasselbe
(`previewWalk.ts`). Eine Welt, die fünfzig NPCs nach ihren Türen fragen müsste,
fragte jedes Bild fünfzigmal.

**Dieselbe Reichweite ist auch der Moment, in dem er sie erfährt**: Was
`doorAhead` findet, trägt er in seine Meinung ein, und zwar unabhängig davon,
ob sie etwas von ihm verlangt. Genau darum geht es bei der Metalltür — sie
verlangt gar nichts (er macht sie nicht auf und bekommt sie nicht klein), und
ohne diese Zeile stünde er davor und drückte dagegen, bis das Festfahren ihn
nachsehen lässt (`observe`). Jetzt sieht er hin, sobald er dort ist, und ist im
nächsten Bild schon außen herum unterwegs.
**Diese Zahlen standen einmal im Abtasten** (`climb` 2,2 m, `drop` 2,6 m) und
galten damit für jeden. Sie stehen jetzt im **Profil**, und das Abtasten hat
nur noch eine einzige Grenze (`reach`, sechs Meter): ab wann eine Kante keine
Kante mehr ist, sondern eine Hauswand. Was das ändert, sieht man an einer
Dachkante: Vorher hätte ein Hamster sie genommen wie ein Zombie, denn die Karte
kannte nur eine Sorte Bein. Und die eine Zahl, die dabei keine Geschmacksfrage
ist: Ein Dach auf **2,4 m** liegt über dem, was sich der Beweglichste noch
**hochzieht** (`jumpUp`, 1,2 m), und unter dem, was ein Zombie
**hinunterspringt** und überlebt (vier Meter, `navFall.safeFall`) — es ist damit
ein Weg nach unten und keiner nach oben, und für einen Hamster, der zwei Meter
überlebt, gar keiner.

**Und hinauf kommt er inzwischen doch — er springt.** Ein NPC ist ein
dynamischer Zylinder ohne Schrittautomatik: Er _steigt_ keine Stufe, er kann nur
fallen oder fliegen. Also fliegt er. Der Läufer meldet zwei Sorten von
Absprung getrennt (`navAgent.ts`, `AgentStep`): `jump` ist das **Portal** —
Versetzen, denn dazwischen gibt es keinen Weg —, `leap` ist der **Sprung**, und
den rechnet `Npc.launch` als schrägen Wurf aus: aus der gewünschten Steighöhe
folgt die Absprunggeschwindigkeit, daraus die Flugzeit bis zur Zielhöhe, daraus
die waagerechte Geschwindigkeit. Die Schwerkraft kommt aus der **Welt** und
nicht aus einer Konstante — bei wenig Schwerkraft springt er weiter, und das
soll er auch. Solange er fliegt, hat das Hirn nichts zu sagen: Eine Wurfparabel,
in die jedes Bild eine waagerechte Wunschgeschwindigkeit geschrieben wird, ist
keine mehr, sondern ein Schweben.

Gesprungen wird über **Sprungverbindungen** (die Lücke zwischen zwei Dächern)
und über **Stufen, die zu hoch zum Hinauftreten sind** — gemessen an der
größten einzelnen Stufe der Verbindung (`NavLink.step`) und nicht an ihrem
Höhenunterschied. Der Unterschied ist der zwischen zwei Rampen, die gleich hoch
enden: Vier Stufen von 60 cm sind vier Sprünge; zwanzig von zwölf Zentimetern
sind ein Gang. Wer für zwölf Zentimeter hüpft, sieht aus wie ein Frosch — und
wer sie geht, ohne einen Character-Controller zu haben, steht davor. Der bleibt
deshalb der sauberere Weg und steht weiter auf der Liste.

**Eine gebrochene Kante, wegen eines Zwanzigstelmillimeters.** Ein Zylinder
sinkt beim Aufliegen ein wenig in seine Unterlage ein, und damit steht die
**senkrechte Seitenfläche des Nachbarkastens** vor seiner scharfen Bodenkante:
Zwei gleich hohe Klötze, die aneinanderstoßen — die oberste Rampenstufe und das
Podest daneben —, sind für ihn keine ebene Fläche, sondern eine Wand. Ein
Zylinder steigt keine Stufe, auch keine von zwanzig Mikrometern. In der Brille
sah das so aus: Die Puppe nahm die Rampe, stand oben, ihr Weg zeigte quer über
den Gang — und sie rührte sich nicht mehr; Karte, Weg, Sprungverbindung und
Absprunghöhe waren alle im Recht. Die Abhilfe: Jeder Zylinder-Collider bekommt
sechs Zentimeter Rundung (`PhysicsWorld.CYLINDER_BEVEL`, `roundCylinder`,
Außenmaße bleiben gleich) — hoch genug für jede Fuge und jede Schwelle, die auf
der Karte als eben gilt, klein genug, dass niemand damit eine Stufe
hinaufspaziert, die er springen müsste. Der Test dazu ist so klein wie der
Fehler: zwei Klötze, ein Zylinder, 1,5 m/s geradeaus über die Naht. Das ist auch
der Grund, warum eine Bank mit **echter Physik** hier nicht durch eine Rechnung
zu ersetzen ist: Ein nachgebauter Körper zeigt so etwas nie.

**Zusehen ohne Brille: die Werkzeugseite.** Bei jeder Welt, die es kann, steht
unter dem Bild der Knopf **Laufen lassen** (`tools.html#welt/test`). Er baut
dieselbe Welt mit echter Physik, kippt die Ansicht senkrecht nach unten und
legt die Knöpfe der Welt als Zeilen daneben — dazu die sieben Debug-Ebenen als
Schalter, die **drei Schalter der Navigation** in derselben Reihe (gestrichelt
umrandet, und sie tragen ihr „aus" im Namen: an ist der Normalfall und soll
ruhig sein) und ein **Ziel**, das ein Tipp auf den Boden versetzt.

**Die Ebene „Wege" zeigt dabei auch den eigenen.** Bis dahin zeigte sie nur, was
die _anderen_ laufen — wer von oben seine Figur losschickt, schaltete sie ein
und sah in einer leeren Welt gar nichts. Der eigene Weg ist derselbe Weg, den
ein NPC bekäme (`PreviewWalk.path`), und er hat eine **eigene Farbe**, denn er
beantwortet eine andere Frage: nicht „wie kommen sie zu mir", sondern „wie komme
ich dorthin".

Daneben stehen drei Tipp-Modi, von denen immer genau einer gilt: **Gehe zu**
(die Figur geht zu Fuß dorthin, statt sich versetzen zu lassen — und **bleibt
dabei an einer geschlossenen Tür stehen, bis sie auf ist**: eine halbe Sekunde,
denn eine Tür aufzumachen ist eine Handlung und kein Zustand. Vorher lief sie
einfach hindurch, und ob eine Tür hier überhaupt etwas bedeutet, war von oben
nicht zu sehen. Vor einer **verriegelten** bleibt sie stehen und sagt es), **Im Bereich**
(ein Tipp legt einen Kreis hin, und die Liste darunter zeigt nur noch, was darin
steht — plus, was im selben Kreis um die **Figur** herum liegt) und der
Normalfall, das Versetzen. **Figur weg** nimmt sie ganz aus der Welt.

Der Kreis ist **doppelt** so weit wie eine Spielerhand von selbst zugreift
(`DEFAULT_NEAR_RADIUS`, 1,40 m), und die Verdopplung ist keine Willkür: In der
Brille streckt man den Arm aus und weiß dabei, was man erwischt; von oben zeigt
man mit einem Finger auf ein Telefon, und ein Kreis von anderthalb Metern ist
auf einer Karte von hundert ein Punkt, den niemand trifft.

Die **Karte selbst** hat zwei eigene Knöpfe, und beide gab es vorher nicht:
**Ziehen** schaltet um, was ein Finger auf dem Bild tut — die Ansicht drehen und
kippen (wie bei jedem anderen Modell auf dieser Seite) oder die Karte schieben
(wie bei jeder anderen Karte). **Folgen** legt die Bildmitte auf die Figur und schaltet
dabei auf **Gehe zu** um; dann tippt man sich mit Klicks durch die Welt, statt
nach jedem Schritt nachzuschieben. Die beiden gehören zusammen: Wer die
Bildmitte an die Figur hängt und sie dann per Tipp _versetzt_, sieht nichts —
die Mitte springt im selben Bild mit. Eine laufende Welt fängt deshalb als
**Karte** an: Der Finger schiebt, die Mitte hängt an der Figur. Wer die Welt
drehen will, sagt es — das ist ein Griff; nach jedem Schritt nachzuschieben sind
zwanzig.

Geschoben wird dabei die **Kamera** und nicht die Bühne (`panX`, `panY` in
`tools/viewer.ts`): Verschöbe man die Bühne, wanderte der Drehpunkt mit,
dieselbe Drehung sähe danach anders aus, und ein Tipp träfe daneben. Und wer
selbst schiebt, nimmt der Mitte damit das Folgen ab — man will dorthin sehen,
wohin man geschoben hat.

Das ist die Vogelperspektive aus „was noch fehlt", ohne Brille und ohne Editor;
wie sie funktioniert, steht bei der Werkzeugseite unter _Eine Welt laufen
lassen_.

**Was noch fehlt**: das lokale Ausweichen (RVO) für Engstellen, zerstörbare
Hindernisse samt „schlag drauf, wenn kein Weg da ist", ein **Prüfstand**, der
wieder einen Eindruck prüft statt einer Rechnung (siehe _Tests_) — und der
Character-Controller oben, der inzwischen der teuerste offene Punkt ist: Solange
ein NPC ein dynamischer Zylinder ist, kommt er keine Stufe hinauf, die er nicht
springt, und jede Rampe muss deshalb aus Stufen bestehen, die groß genug zum
Springen sind. Die Karte kann längst mehr, als der Körper einlöst — sie weiß,
dass eine Rampe aus 12-cm-Stufen begehbar ist (`CostProfile.stepUp`), und in
der Brille steht er davor.
