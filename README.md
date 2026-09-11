# Baumgartner VR

- **[Spiel starten](https://baumgartner-games.github.io/vr/)**
- **[Werkzeug-Übersicht öffnen](https://baumgartner-games.github.io/vr/tools.html)** — alle Werkzeuge, Welten, der magische Beutel und die NPCs zum Ansehen und Drehen, ohne Brille, auf dem Handy.

[![Baumgartner VR](public/banner.svg)](https://baumgartner-games.github.io/vr/)

WebXR-Spielwiese als Basis für weitere VR-Spiele und Experimente: Hub-Welt,
Portal Labor, Schießstand, Dust, eine Gokart-Strecke, eine Pizzeria, der Mond
mit einem Sechstel Schwerkraft, die Alpen mit Hängegleiter und Flügeln, ein
Dunkelhaus zum Ausprobieren von Licht, eine **Kletterhalle**, in der Greifen
dich an der Wand hält — der Halt wird gerechnet, aus Material, Form,
Körperhaltung und dem Verspreizen im Kamin, schlechte Griffe kosten Ausdauer,
und hinunter geht es in **Sprungkissen**, die den Fall abfedern statt ihn
anzuhalten —, ein **Effektlabor** mit einem großen
roten Knopf für Rauch, Feuer, Funken und Explosionen und
ein **Bauplatz**, in dem man die Karte vom Gürtel zieht und der Grundriss als
Miniatur vor einem hängt — eine Hand trägt sie, zwei drehen, kippen und zoomen,
und sie fällt nicht; an einer Palette tunkt man Boden, Wand oder Tür ein und
setzt sie beliebig oft, und in der zweiten Reihe liegen die **Bausteine**:
Küchenzeile, Regal, Tisch, Bank, Kisten, Säule, Geländer, Brüstung, Podest —
eine Kachel, eine Sorte, eine Blickrichtung, wie bei Minecraft. Man hält den
Trigger gedrückt und **malt** eine ganze Reihe, oder zieht **zwei Ecken** auf
und füllt die Fläche dazwischen — ein Zimmer sind damit zwei Gesten statt
sechzig Trigger. Die eigene
Spielfigur steht mit im Modell und wird einfach woandershin gestellt, drumherum
ein weißer Raum — und weggelegt steht alles in Lebensgröße um einen herum.
**Und es bleibt**: Unter *Welt sichern* liegt eine
gebaute Welt im Browser, geht als Datei herunter (`bauplatz-2026-09-07.welt.json`,
Format `baumgartner-welt` in der Fassung `0.1.0`, mit Kacheln, Wänden, Türen,
Möbeln und Dächern darin) und kommt so auch wieder zurück. Wer in einer
fertigen Welt nur wissen will, wo er gerade ist, nimmt statt eines Grundrisses
die **Karte** aus dem Werkzeugregal: ein Blatt in der Hand mit der Umgebung von
oben, Norden oben, ein Pfeil für einen selbst und ein Punkt je Mitspieler — der
Trigger zoomt. Dazu kommt
ein Eingaberaum zum Einstellen von Händen und Werkzeugen — mit einem
**Poseraum**, in dem ein Schwebekasten losgelassene Werkzeuge in der Luft hält,
damit man die blanke Hand daran einmessen kann — samt jedem einzelnen Gelenk —, ein Werkzeuggürtel
voller Spielzeug — darunter ein **magischer Beutel** zum Hineingreifen, aus dem
Klötze, Rampen, Murmeln und ein ganzer Satz Würfel kommen, und ein **Schild**,
das man irgendwo hinstellt und mit Markdown beschriftet (Überschriften, Listen,
Bilder), das von selbst rollen kann und das alle im Raum sehen — der Aushang
für eine Lobby; getippt wird in der Brille auf Wunsch mit der **Systemtastatur
der Quest** —, **NPCs**, die
einem hinterherlaufen (Haut und Hirn getrennt gewählt, dazu Spawnpunkte und
Brutkäfige, mit Lebensbalken über dem Kopf — ein Zombie hat hundert Leben, die
Pistole macht fünfundzwanzig, das Messer fünfzig und der große Hammer hundert,
Kopftreffer vierfach; getroffen wird der Körper, den man sieht, und wer
nachsehen will, schaltet die **Trefferzonen** im Menü ein — und jede Sorte
liest dieselbe Karte mit ihren eigenen Beinen: Was der eine hochspringt, ist
für den anderen eine Wand, und wer den Sturz nicht überlebt, bleibt oben
stehen — und durch ein **Portal** fallen sie wie jede Kiste: halb hier, halb
drüben, und aus einem Sturz ins Bodenportal wird der Schwung aus der Wand) und
Peer-to-Peer-Sitzungen ohne eigenen Server — mit
räumlichem Sprach-Chat und Karts, die man gegeneinander fahren kann. Die meisten Testwelten
stehen auf einer Fläche bis zum Horizont; Orbital schwebt mit sichtbaren Deckplatten im Weltraum, die Schwerkraft steht im Menü, und
die Stoppuhr hält die Zeit an, spult Einzelbilder vor oder lädt eine
gespeicherte Aufstellung zurück.
Unter **Menü → Grafik** steht ein experimenteller Schalter, der
**Grafik-Modus**: _Einfach_ ist das Bild von bisher, _Comic_ zeichnet dieselbe
Welt mit **schwarzen Konturen**, Licht in Stufen und Schatten. Daneben liegt
**Aussehen** — sieben Kopfbedeckungen von der Basecap bis zur Krone, und alle
im Raum sehen, was man aufhat.
three.js + TypeScript + Vite, ohne externe Assets — alles wird prozedural
gebaut.

### Haunting / Orbital — eine Quest, zwei Handys

Eine beschädigte Raumstation, eine Dreiercrew und drei ausgefallene Systeme.
Der **Außentechniker** erkundet die Station in VR. Das **Archiv** kennt
Raumnamen, Aufträge, Fundorte und Schutzcodes; eine Gesamtkarte bekommt es
nicht, und **wohin ein Ersatzteil muss, erfährt es erst, wenn der Techniker es
in der Hand hat**. Die **Einsatzkontrolle** verfolgt
das Monster auf dem Radar, sieht den simulierten Puls und bedient Licht,
Schiebetüren und Geräuschköder. **Die Station ist dunkel**, und sie bleibt es,
wenn niemand schaltet: Es geht nirgends von selbst Licht an. Die
Einsatzkontrolle kann höchstens **zwei Lampen gleichzeitig** brennen lassen —
die dritte macht die älteste aus —, und keine hält länger als etwa eine Minute:
Sie flackert, sirrt und geht aus. Wer im Dunkeln steht, hat die Taschenlampe. Drohne und Zuschauer sind weitere optionale
Plätze; die Schalttafel gehört zur Einsatzkontrolle. Der Zuschauerplatz kann
dabei in jeden anderen hineinsehen, ohne ihn zu besetzen.

**Gemeinsam starten:** Auf allen Geräten dieselbe Website öffnen. In der Quest
im Hub **Haunting / Orbital** wählen und VR starten. Auf beiden Handys
**In der Zentrale mitspielen** wählen, dann Archiv beziehungsweise
Einsatzkontrolle besetzen. Ein weiteres Telefon kann das **Monster** spielen:
Es sieht nur, was das Monster sieht und hört, und steuert es mit Stock und
einem Knopf — zugeschlagen wird von selbst, wer in Reichweite steht; der Knopf
gilt dem nächsten Ding, das die Karte hervorhebt (Klappe, Kabine, gesperrte
Tür) — auch dann, wenn der Techniker die Station in der 2D-Welt von
oben spielt. Für eine eigene Gruppe auf allen Geräten denselben
Link mit `?room=euer-gruppenname#haunting` öffnen; ohne Parameter ist der Raum
`haunting`. Die Verbindungsanzeige nennt Raum und Gegenstellen. Nach einem
Update alle Geräte neu laden, damit sie dieselbe Protokollversion verwenden.

Es sind keine Konten erforderlich. WebRTC nutzt öffentliche Signalisierung und
STUN, auch im selben WLAN. Internetspiele funktionieren bei direkt erreichbaren
Peers; restriktives NAT oder gesperrte öffentliche Dienste können ohne TURN
eine Verbindung verhindern. `?net=local` verbindet ausschließlich mehrere Tabs
desselben Browsers, keine getrennten Geräte im WLAN.

**Die Mission:** Jede Runde fängt in der **Lobby** an, und sie sieht auf dem
Handy, in der Brille und am Bildschirm gleich aus — drei Fragen und ein Knopf:

1. **Was?** _Spielen_ (die Mission mit Monster), _Zuschauen_ (der Runde im Raum
   folgen — auch in 2D; läuft keine, spielt Bot gegen Bot) oder _Trainieren_
   (ohne Monster, sicher üben). Eine der drei Kacheln leuchtet — gestartet
   wird damit noch nichts.
2. **Wer?** Techniker, Monster und die Plätze der Einsatzzentrale, jeder mit
   einem Menschen oder einem Bot. Ein Tipp auf **Ich** macht einen Platz zu
   deinem und setzt dein Telefon zugleich an das Gerät, das dazugehört.
3. **Wie?** _2D von oben_ oder _3D Schiff_. Am Telefon ist 2D voreingestellt,
   in der Brille gibt es immer das Schiff. **Diese eine Frage darfst du dir
   mitten in der Runde anders beantworten** — siehe unten.

Darunter steht **ein** Knopf, und auf ihm steht, was gleich passiert:
„Mission starten (2D)", „Zuschauen", „Training starten (3D)". In der Brille
geht dasselbe über den Knopf am Handgelenk. Geht gerade keine Runde los, weil
ein anderes Gerät sie rechnet oder schon jemand als Techniker spielt, steht
das im Eintrag selbst. Die feste Skeld-Karte enthält 14 benannte Räume in der
Anordnung der Vorlage: Cafeteria oben, Triebwerke/Reactor/Security links,
Weapons/O2/Navigation rechts, Storage unten und die dazwischenliegenden
Nebenräume. Die meisten Räume messen 4 × 4 Rasterfelder (10 × 10 Meter);
Cafeteria und Storage sind größer. Gänge verbinden die Module über echte
Rasterböden. Die Konturen sind rechtwinklig, noch ohne 45°-Wandelemente.
Seeds verändern Aufgaben und Einrichtung, nicht Raumnamen oder Grundriss.
Modelle und Raumgestaltung verwenden eigene Assets.
Antrieb, Nahrungsversorgung und Notsignal müssen repariert werden. In jedem
Raum stehen **zwei bis drei Frachtkisten**, jede mit Farbband und Nummer
beschriftet („Kiste 2 · blau") — am Modell wie auf der Karte, immer lesbar.
Die drei Ersatzteile liegen in dreien davon, vier weitere halten Werkzeug, und
der Rest ist leer. **Wer weiß, welche die richtige ist, hängt daran, wer am
Archiv sitzt:** Ist es ein Bot, leuchtet die richtige Kiste selbst — im Schiff
mit einem gelben Saum, in der 2D-Welt mit Schein, Umriss und Puls. Sitzt dort
ein **Mensch**, sieht der Techniker nur noch den **Raum** leuchten; welche
Kiste darin es ist, weiß das Archiv als Einziges und sagt es an: „Kiste 2,
blaues Band · Nordwand". Wer ohne diese Ansage sucht, öffnet Kisten — oder
nimmt das Röntgengerät, das Kennzeichen und Raum der nächsten vollen Kiste
nennt — und jede offene Kiste macht Geräusch. Der Techniker öffnet die Kiste,
nimmt den Gegenstand und entriegelt den passenden Wartungskasten. Dort werden
Kabel nach Symbolen verbunden, eine Schaltfolge eingegeben oder drei Frequenzen
eingestellt. Anschließend geht es zum nächsten Auftrag. Nach allen drei
Reparaturen zur Zentrale zurückkehren.

**Ein Ersatzteil auf einmal.** Der Techniker trägt es in der Hand — in der
Brille wirklich in der rechten —, und solange er es hat, geht keine zweite
Kiste mit einem Teil heraus: erst abliefern oder ablegen. Ablegen geht
jederzeit (`G` am Schirm, Knopf im Panel); das Teil bleibt liegen, wo er
stand, und lässt sich mit `E` wieder aufnehmen. Ohne Teil in der Hand bleibt
die Abdeckung des Wartungskastens zu. **Die Taschenlampe kann er nie
verlieren:** Sie hängt von Anfang an in beiden Holstern und steht in beiden
Handkreisen (`1` links, `2` rechts) — ausmachen darf er sie, das macht ihn
schwerer sichtbar.

**Wer spielt mit:** Das „Wer?" der Lobby, in 2D wie in 3D — Techniker (Mensch
oder Bot), Monster (Mensch, Bot oder aus) und beliebig viele Plätze der
Einsatzzentrale (Archivar am Archiv, Schalttafel und Späher an der
Einsatzkontrolle), jeder mit einem Menschen am Telefon oder einem Bot. Unter
jedem Platz steht, wer wirklich dort sitzt. **Ein Bot auf einem Platz gibt dem
Techniker die Auskunft selbst:** Wer allein in der 2D-Welt spielt, sieht die
Peilung des Monsters alle paar Sekunden, sperrt Türen und schaltet Lampen per
Tipp auf die Karte und schlägt mit einem Tipp aufs Zimmer die Akte mit den
Codes auf. **Gewollt gesperrt ist immer nur eine Tür** — wer eine zweite
wählt, gibt die erste frei; Türen, die das Monster zuschlägt, gehen nach
zwanzig Sekunden von selbst wieder auf oder vorher durch die Schalttafel.

**Die 2D-Welt** sieht aus wie ein Brettspiel von oben: helle Böden mit
Kacheln, dicke Wände, Türen als Blätter mit Schloss, die Möbel aus dem Schiff
als Klötze, kleine Astronauten mit Händen, das Monster als Klumpen mit Augen.
Geräusche laufen als Wellen über die Kacheln — die eigenen blau, die des
Monsters rot, Türen und Fracht orange. Eine Wand hält eine Welle nicht auf,
sie dämpft sie: Was nebenan ankommt, kommt später und blasser an, und eine
zugeworfene Tür macht einen Schritt leiser und nicht lautlos. Gelbe Dreiecke
am Bildrand zeigen zum nächsten Ziel (am Desktop im Schiff ein Kompass am oberen Bildrand),
„Zielpfade" im Optionsmenü legt die Wege von Techniker und Monster auf die
Karte, und im Modus „Alles sehen" führen Bögen von Klappe zu Klappe mit dem
Raum, in dem der Schacht endet. Wer das Monster spielt, steigt mit
**Interagieren** in eine Klappe und wählt darunter den Zielraum.
Oben links stehen zwei Zeilen und sonst nichts: **O₂** mit der Restzeit und den
Anzug-Herzen, darunter **Aufgaben:** mit einem Kreis je Auftrag — voll
erledigt, halb angefangen, leer offen. Ein Tipp auf die Zeile klappt die Liste
mit den Namen auf, ein zweiter wieder zu. Das **Zahnrad** zeigt nur noch, was
sich mitten in der Runde ändert — Ansicht, Zielpfade, Ton und **Zurück zur
Lobby**; wer mitspielt und was die nächste Runde wird, steht dort.

**2D ↔ 3D, mitten im Spiel.** Als Techniker musst du dich nicht vor der Runde
entscheiden: Im Zahnrad der 2D-Welt steht **„Ansicht: 2D ↔ 3D"**, und im Panel
des Technikers im Schiff steht der Knopf **„2D von oben"**. Beide schalten
sofort um, und zwar **dieselbe Runde**: dieselbe Uhr und derselbe Sauerstoff,
derselbe Anzug, dasselbe Ersatzteil in der Hand, dieselben gesperrten Türen und
brennenden Lampen — und dasselbe Monster an derselben Stelle, das sich immer
noch merkt, wo es dich zuletzt gesehen hat. Du stehst danach dort, wo du eben
standest. Wer zusieht oder in der Zentrale sitzt, merkt von alledem nichts: Der
Stand ist derselbe, nur das Bild ist ein anderes. **In der Brille gibt es keine
Karte von oben** — dort bleibt es beim Schiff, und der Eintrag sagt es auch.
Wandert die Technikerrolle mitten in der Runde zu jemand anderem, übergibt das
alte Gerät dem neuen die ganze Runde, und zwar mitsamt allem, was sonst nur der
eine Rechner wusste — Sperrfristen, Lampenrestzeiten und das Gedächtnis des
Monsters.

**Wer zuschaut**, hat keinen Stock, dafür zwei Knöpfe rechts: _Zum Techniker_
und _Zum Monster_, jederzeit umschaltbar. Die Sicht von Archiv, Einsatzkontrolle
oder Drohne wählt man in der Lobby unter „Plätze und Geräte" — auch während
eine Runde läuft.

**Die Handyansichten:** Das Archiv hat unter **Räume & Codes** oben die
Draufsicht des aufgeschlagenen Raums (orthografisch, Decke ab, ohne Lampen),
darunter alle Räume zum Antippen und die Liste, was gesucht wird. **Ein Tipp
auf einen Raum schlägt dessen Akte auf — ganzseitig, ohne Karte dahinter**,
mit einem Knopf zurück: Schutzcode, Kennzeichen, Türen und **alle Kisten des
Raums mit ihrem Kennzeichen, die richtige markiert** (was in den anderen
liegt, steht dort nicht). Die Seite rollt wie jede andere. Ein
kühler Sci-Fi-Look ersetzt Sepia. Es gibt keinen Gesamtgrundriss und keine
Live-Positionen in dieser Ansicht. **Aufträge** nennt je Auftrag den Fundort
in einer Zeile — Raum, Kennzeichen, Wand — und führt in die passende Raumakte.
**Wohin das Teil muss, erfährt das Archiv erst, wenn der Techniker es in der
Hand hat:** Reparaturraum, Hinweis und Freigabecode stehen vorher nicht auf
dem Blatt. Legt er es irgendwo ab und lässt es länger als fünf Sekunden
liegen, meldet das Archiv, in welchem Raum es liegt. Die Einsatzkontrolle hat
**Radar & Anzug** und
**Schalttafel**. Der Kopfbereich bietet einen sichtbaren Rollenwechsel.

**Wer blutet, wird verfolgt.** Ein Treffer reißt eine Wunde, und die blutet
zwei Minuten lang: Wer sich danach bewegt, hinterlässt alle anderthalb Meter
einen dunkelroten Tropfen — in 2D auf dem Boden, in der Brille als flacher
Fleck auf dem Blech. Nach gut einer halben Minute ist ein Tropfen verblasst,
wer stehen bleibt, hinterlässt fast nichts. Das Monster **sieht nicht**, wo die
Spur liegt; es findet sie nur, wenn es im selben Raum darüberläuft — dann
allerdings liest es daraus, in welche Richtung es weitergehen muss, und sucht
dort statt irgendwo. Nach einem Treffer lohnt sich also ein Umweg: Die Spur
verrät nicht nur, dass man da war, sondern wohin man gelaufen ist.

**Überleben und beobachten:** Drei Treffer beenden die Runde; nach jedem
Treffer gibt es drei Sekunden Schutz. Ein gefundenes Medkit heilt einen
Treffer. Tod und Sieg zeigen eine klare Meldung mit **Neu starten**, auch im
Headset. Ein Schutzschrank lässt sich mit dem Code aus dem Archiv öffnen und
betreten. Ein beleuchteter Knopf im Inneren führt wieder hinaus; am Desktop
funktioniert auch `E`. Die Bedienung setzt voraus, dass man sich im Raum des
Schranks befindet; durch eine Nachbarwand lässt er sich nicht benutzen.
Reißt das Monster einen Schrank auf, ist er für den Rest der Runde ein
funkendes Wrack: Niemand kommt mehr hinein, und es gibt ein Versteck weniger.
Der Sauerstoff reicht zehn Minuten und läuft gleichmäßig ab; keine Reparatur
füllt ihn auf. Uhr und Anzug-Leben stehen bei allen Mitspielern in der Leiste
und beim Techniker im Blickfeld. **Die Aufträge stehen dort nur, wenn er
allein spielt:** Sitzt am Archiv ein Mensch, sieht der Techniker im Blickfeld
nur Uhr und Anzug — wohin er muss, sagt ihm der Archivar, und wo er ist, sagt
er dem Archivar. Spielt niemand dort mit, übernimmt der Bot die Ansage, und
dann steht unter der Uhr wieder die gewohnte Zeile: drei Kreise für die
Aufträge und der nächste offene im Klartext.

Die bestehende **Taschenlampe** hängt von Anfang an in **beiden** Holstern des
Werkzeuggürtels und kann nicht verloren gehen. Die
schwebende Ersatzlampe in der Zentrale kann auch am Desktop mit `E` oder Klick
aufgenommen werden. **Radar** und **Röntgengerät** sind echte greifbare
Werkzeuge mit demselben Scannergehäuse und seitlicher Gürtelablage. Radar zeigt
nahe Bewegung, Röntgen die vollen Kisten in der Nähe — es blendet ihr
Kennzeichen ein und nennt nie den Inhalt; leere meldet es gar nicht.
Anzeigen erscheinen auf dem benutzten Gerät; ein dauerhaftes Radar-/Sensor-HUD im VR-Blick gibt es nicht.

Über jedem Schott zeigen Leuchten auf beiden Seiten seinen Zustand: **grün**
bedeutet betriebsbereit und öffnet beim Annähern, **rot** bedeutet gesperrt.
Ein belegter Durchgang bleibt offen, bis er frei ist. Die Tür zum Übungsdeck
startet oder ersetzt keine Mission; Tests werden am Terminal gestartet.

Schon nach etwa einer Sekunde Rennen beginnt der Atem am unteren Visier zu
kondensieren: weiche Wolken im Atemtakt und feine Tropfen auf dem Glas. Nach
vier Sekunden ist die Anstrengung voll aufgebaut, nach etwa fünf Sekunden
Gehen/Stehen wieder abgebaut.

**Und die Puste ist jetzt eine echte Grenze.** Der Sprint hält **fünf
Sekunden**; danach fällt das Tempo auf einen Trab, der immer noch schneller ist
als Gehen, aber langsamer als ein jagendes Monster. Beim Gehen füllt sich die
Puste in etwa acht Sekunden wieder auf. Wer getroffen wird, bekommt
anderthalb Sekunden Sprint geschenkt, die nichts kosten — gerade genug für eine
Tür. Eine gerade Flucht endet damit nach ungefähr zwanzig Sekunden; wer
entkommen will, braucht einen Riegel, eine Ecke, einen Schutzschrank oder einen
Wartungsschacht. Als Vergleich für kurze Belastungsintervalle dient
[Phasmophobias Exposition-Update von 2021](https://store.steampowered.com/news/posts/?appids=739630&enddate=1631960314&feed=steam_community_announcements)
mit drei Sekunden Sprint und fünf Sekunden Erholung.

Die Gegner unterscheiden sich weiterhin in Bewegung, Wahrnehmung und
Schachtverhalten. Schritte und eine eingeschaltete Taschenlampe können den
Techniker verraten; nach verlorenem Sichtkontakt wird die letzte bemerkte
Position abgesucht. **Die Mikrofon-Gegnerreaktion kommt nicht ins Spiel und
wurde entfernt.** Sprache beeinflusst das Monster nicht. Der davon unabhängige
optionale Sprachchat bleibt erhalten. **Gegneridentifikation über EMF,
Temperatur, Audio-Logger und ein Anomalienjournal ist vorerst gestrichen.**

**Am Desktop testen:** In der Geräteübersicht **Als Techniker am Desktop
testen** wählen. Zum Umsehen ins Bild klicken; `Esc` gibt den Mauszeiger frei.
Die Interaktionsanzeige nennt das anvisierte Objekt in Reichweite.

| Aktion | Tastatur / Maus |
| --- | --- |
| Laufen und umsehen | `WASD` und Maus; `Shift` zum Rennen |
| Schrank öffnen, Sache aufnehmen, Taste am Rätsel drücken | Anvisieren und `E` oder Linksklick |
| Linke Hand wechseln | `1`: Radar, Röntgengerät und freie Hand durchschalten |
| Rechte Hand wechseln | `2`: Taschenlampe, gefundenes Medkit, freie Hand |
| Medkit verwenden | Rechts auswählen und `E` drücken |
| Ducken | `Ctrl` halten |
| Simulationsflug | `WASD` in Blickrichtung, `Space` hoch, `Ctrl` runter; `Shift` schneller |
| Leistungsanzeige | `F3` blendet FPS, Framezeit und Zeichenaufwand ein oder aus |

**Am Bildschirm liegt dieselbe Steuerung wie in der 2D-Welt**: der Stock links
unten, rechts unten drei Knöpfe. Die beiden kleinen sind die zwei Hände —
**Linke Hand** (Radar, Röntgengerät, frei) und **Rechte Hand** (Taschenlampe,
Medkit, frei), dieselben Reihen wie `1` und `2`. Der große trägt den Namen
dessen, worauf man gerade zielt, und tut dasselbe wie `E`. Über den Stock geht
es mit Arbeitstempo los; jenseits des äußeren Rings wird gerannt. Tastatur und
Maus bleiben daneben, wie sie waren; in der Brille sind die Knöpfe weg, dort
gibt es Zeiger und Trigger.

In VR werden dieselben Objekte mit dem Zeiger und Trigger bedient. Unter
**VR-Komfort** lassen sich schrittweises oder fließendes Drehen, ein optionaler
Komfortrand bei künstlicher Bewegung und Controller-Vibration einstellen.
Diese Einstellungen bleiben lokal auf dem Gerät.

**Ohne Angst ausprobieren:** **Test ohne Monster** startet eine unverwundbare
Runde ohne aktiven Gegner. Das bleibt bei **Testlicht aus** so: Die Station
wird dunkel, Raum- und Umgebungslicht gehen aus, und die Taschenlampe wird
benötigt. Im normalen Betrieb erhalten eingeschaltete Decks etwas indirektes
Licht, damit Gehäuse und Wege erkennbar bleiben; stromlose Räume bleiben dunkel.
Die einzelnen Übungsräume haben ihr eigenes lokales Licht.

Der Testschrank enthält die Ausrüstung und Missionsgegenstände. Über den
Testdeck-Aufzug oder **Testdeck: einzelne Übungsräume** erreicht man vier
separate Räume abseits der Missionskarte:

- **Safe und Schutzschrank:** Links steht die Anleitung mit dem Code, daneben
  der echte bedienbare Schutzschrank.
- **Ausrüstung und Scanner:** Gegenstände aufnehmen, Hände wechseln und einen
  geschlossenen Container mit Röntgen untersuchen.
- **Reparaturen und Rätsel:** Drei voneinander unabhängige Übungen mit Lösungen
  daneben. Ein gelöstes Display erneut drücken setzt die Übung zurück; der
  Missionsfortschritt bleibt dabei unverändert.
- **Modelle, Schotts und Effekte:** Einzelne Module mit Maßangaben, harmlose
  Gegnerattrappen, Spiegel, Schacht und Funken-/Rauch-/Feuerprüfung.

Jeder Übungsraum hat Rückkehr- und Wechselknöpfe. Testbesuche in Missionsräumen
verwenden freie Ankunftsplätze.

**Zuschauen** (in der Lobby, in jeder der drei Oberflächen) heißt: der Runde
folgen, die im Raum wirklich läuft. Spielt jemand — im Schiff oder von einem
anderen Gerät aus in 2D —, siehst du **ihn**: dieselbe Station, dieselben
Türen, dasselbe Monster, mit zwei Sprungknöpfen „Zum Techniker" und „Zum
Monster" und dem Modus „Alles sehen". Eingaben hast du keine; ein Zuruf von
dir beendet die Runde schneller als das Monster.

Am **Zuschauerplatz der Zentrale** wählst du dazu, **wessen Platz** du gerade
ansiehst — Zuschauer (das ganze Deck von schräg oben, ohne Decke), Archiv,
Einsatzkontrolle, Späher, Drohne oder Monster —, und das mitten in der Runde:
Du siehst das Blatt des Archivars, das Bild der Drohne oder die Station aus
Monstersicht, aber nie deren Knöpfe. Über dem Deck folgt die Kamera auf Wunsch
dem **Techniker** oder dem **Monster** oder bleibt frei. Ein Schalter
**„KI-Absichten"** legt offen, was das Monster denkt: die Zimmer, in denen es
dich vermutet, eingefärbt nach seiner Sicherheit, der gestrichelte Weg, den es
dich laufen sieht, und die Tür, an der es dich abfangen will — mit beiden
Ankunftszeiten („M 3,2 s / T 4,0 s") und dem Namen seiner Haltung. Das gibt es
**nur beim Zuschauen**; wer mitspielt, sieht davon nie etwas.

Läuft im Raum gar keine Runde, springt „Zuschauen" wie bisher als Vorführung
ein: Ein Techniker aus Zahlen läuft durch die echte Station, öffnet
Frachtschränke, holt die drei Ersatzteile, löst die Reparaturen und kehrt zur
Zentrale zurück. Lokale Meldungen erklären seine Schritte. Gesperrte Wege
halten ihn auf, bis eine Route wieder möglich ist. Der Techniker priorisiert
Überleben: Er unterbricht Arbeit, sprintet mit Erholung zu erreichbarer Deckung,
versteckt sich ungesehen in einem Schutzschrank und setzt anschließend die Mission fort.
Der sichere Test bleibt dabei ohne Schaden.

**Das Monster hat sechs Haltungen** und darüber die Verfolgung: *Patrouille*
(zügig von Raum zu Raum — und zwar dorthin, wo es am längsten nicht war),
*Seitenwechsel* (nach mehreren erfolglosen Zielen quer über die Karte),
*Auflauern* (stehen bleiben und warten, an einer **Tür** statt mitten im
Raum), *Absuchen*, *Abfangen* und *An der Tür lauern*. Es **rät nicht mehr**,
wohin sein Gegenüber verschwunden ist: Es führt ein Bild davon, wo es ihn
vermutet, streicht die Räume heraus, die es selbst abgesucht hat, rechnet
Geräusche ein und sucht dort, wo es am wahrscheinlichsten ist. Aus den letzten
Sichtungen schätzt es Richtung und Tempo und rechnet für die Türen vor ihm aus,
wer zuerst dort ist — passt es, läuft es nicht hinterher, sondern **kürzt ab**
und steht in der Tür. Glaubt es, sein Gegenüber sitze in einem Raum mit nur
einem Ausgang, stellt es sich davor und wartet, aber nie länger als ein paar
Sekunden. Beim Absuchen geht es leise hinein, macht dort Klack-Geräusche,
öffnet manchmal den Schutzschrank und reißt ihn dann auf, weil es dort
jemanden vermutet — ob jemand drin ist oder nicht — oder lässt den Raum stehen
und geht gleich weiter. Hat es jemanden in eine Kabine flüchten **sehen**, geht es hin,
**schreit davor** als Ankündigung, reißt sie mit Rauch und Funken auf und
bleibt danach kurz stehen, um Vorsprung zu gewähren. Bei einer Verfolgung hört
man den eigenen Herzschlag, schneller und lauter, je näher es kommt; je länger
die Jagd ohne Sichtabriss läuft, desto näher kommt es seinem Höchsttempo. Ein
Monster **geht schneller als ein Spieler geht** und **rennt langsamer, als ein
Spieler rennt** — wer nur spaziert, wird eingeholt; wer rennt, kommt davon,
solange die Puste reicht.

**„Zuletzt gesehen."** Beide Seiten spielen gegen jemanden, den sie fast nie
sehen — deshalb merkt sich jede, wo sie den anderen zuletzt gesehen hat. Der
Marker steht als **gestrichelte Silhouette** dort, wo der andere war, mit dem
Blick, den er dabei hatte, und verblasst über eine knappe halbe Minute; in der
Brille ist es eine halbdurchsichtige Kopie des Monsters, die wirklich im Raum
steht. Er läuft **nicht mit**: Wer weiß, dass sein Verfolger einen alten Punkt
hat, läuft woandershin. Man sieht immer nur den Marker des *anderen*, und nur
solange man ihn nicht wirklich sieht; wer das Monster spielt, liest dazu auf
der Karte „Zuletzt gesehen: Werkstatt · vor 6 s". Nur beim **Zuschauen**
(„Alles sehen") stehen beide Marker blass neben den echten Figuren — dort will
man ja gerade sehen, was die beiden voneinander glauben.

**Eine fertige Reparatur bleibt nicht unbemerkt.** Die Konsole fährt hoch, die
Sicherung fällt, im Modul flackert das Licht — das Monster weiß danach, in
welchem Raum eben jemand gearbeitet hat, und legt für ein paar Sekunden
merklich zu. Es sieht nicht durch Wände; es hat nur gehört, was die halbe
Station gehört hat. Schächte durch gemeinsame Wände benutzt es weiterhin.

**Zeitraffer, Regler und Training.** In der Bot-Runde laufen ×2, ×4 und ×8
(beschleunigt wird über die Zahl der Bilder, nicht über ihre Länge). Die
Beleuchtung schaltet zwischen voller Beleuchtung, Wachbetrieb,
Alarmbeleuchtung und Notstrom — im Alarm drehen sich rote Leuchten in den
Gängen. Unter **Bots justieren & trainieren** stehen alle Gewichte beider Bots
als Regler, dazu drei Knöpfe: *Monster trainieren*, *Techniker trainieren*,
*beide*. Das Training spielt hunderte Runden ohne Bild aus und sucht Gewichte, mit
denen eine Runde so ausgeht, wie sie ausgehen soll: **zu zweit** (Techniker
gegen Monster) halbe-halbe, **ab drei Spielern** zwei von drei Runden für das
Monster. Den Unterschied macht die Tür hinter dem Techniker — allein schlägt
er sie selbst zu, im Team muss er es der Schalttafel sagen, und der Zuruf
braucht ein bis zwei Sekunden. Das Training rechnet zwischen den Bildern
weiter und friert den Tab nicht ein.
Cyan zeigt den Technikerweg, Rot den Monsterweg und Gelb die Drohnenroute.
Zielringe markieren die jeweiligen Ziele. Cyan/rote Flächen zeigen die an echten
Wänden und Einrichtungen abgeschnittenen Blickfelder. Orange zeigt den maximalen
Hörbereich für Sprintgeräusche: Schall folgt Stationsboden, wird durch Türen und
angrenzende Wände gedämpft und überquert keine leeren Raumlücken. Langsames Gehen
und Ducken sind leiser. Aktuelle KI-Absichten stehen unter der Legende. Die Linien lesen die tatsächlich
verwendeten Navigationswege. Das lokale Funkprotokoll zeigt Raumwechsel des
Technikers an die Zentrale sowie die Archivhinweise. Es ist keine autonome
Dreiercrew und kein zusätzlicher Sprachchat.
**Simulation / Flugmodus** hebt die Decke ab. Am Desktop folgt die Kamera
zunächst dem Bot; **Freie Kamera** gibt `WASD`, `Space` und `Ctrl` zum Erkunden
frei, bis 120 Meter Höhe. **Kartenübersicht** zeigt die Station direkt von oben.
**Bot folgen** schaltet zurück. Im XR-Headset gibt es keine automatische
Blicknachführung. Zum Verlassen **Simulation beenden** oder **Zur Einsatzzentrale**
wählen. Die Drohne folgt geprüften Kurven mit Beschleunigung, sanftem Abbremsen
und leichter Neigung; ihre Kameradaten werden zwischen Netzpaketen geglättet.

Die Station verwendet vermessene Einrichtungsmodelle mit reservierten Tür- und
Laufwegen, abgerundeten Gehäusen, Rohren und raumspezifischen Aggregaten.
Zusammengefasste Geometrie, das Ausblenden verdeckter Räume, wenige Lichter und
begrenzte Effekt- und Audiopools halten den Aufwand klein. Die Web-Auflösung ist
für Haunting begrenzt; der Übungsspiegel rendert nur in seiner Nähe. Hub und
andere Testwelten bleiben erhalten.

90–120 Hz auf Quest 3 sind ein Leistungsziel, keine hier gemessene Zusage.
Automatisierte Logik-, Physik- und DOM-Tests ersetzen weder die Prüfung der
Grafik auf dem Headset noch einen P2P-Test mit drei echten Geräten. Der reproduzierbare
Browser-Test unter `npm run test:browser` prüft zusätzlich die echte Web-App
in Chromium und Firefox und speichert Screenshots sowie Fehlerberichte.
Vier Produktions-Browserläufe — je zwei in Chromium und Firefox — haben Rollen,
Raumakten, E-Lampenaufnahme, Verlustanzeige/Neustart und Botbewegung erfolgreich
geprüft. Ergebnisse und Grenzen stehen in [docs/orbital-qa.md](docs/orbital-qa.md),
die Einzelresultate im [Browserreport](docs/orbital/browser-report.json).
Screenshots: [Archiv](docs/orbital/archive-desktop.png),
[Botbeobachtung](docs/orbital/bot-observation.png),
[Firefox bei Telefonbreite](docs/orbital/archive-mobile-firefox.png).

> **Hinweis für Agenten:** Entwickelt und gepusht wird **direkt auf `main`** —
> kein Feature-Branch, kein Pull Request, solange nichts anderes im Auftrag
> steht. Das ganze Projektwissen — Features im Detail, vollständige Steuerung,
> Architektur, Portale, Netzwerk, Deployment — steht in **[AGENTS.md](AGENTS.md)**.

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Typecheck + Produktionsbuild nach dist/
npm run preview  # gebautes Ergebnis lokal servieren
npm test         # Jest (schnell); npm run test:slow für die Rundensimulationen
```

WebXR braucht einen sicheren Kontext; `localhost` reicht, für die Brille im
selben WLAN am einfachsten über HTTPS-Tunnel oder `vite dev --https`.

## Tests

Die Haunting-Handyoberflächen werden mit jsdom geprüft: Raumakten, Codes,
Rollenwechsel, Reiterbedienung und Eingabefokus. Automatische Türen und
vollständige Botrunden haben eigene Navigationstests. Für die echte 3D-App:

```bash
npm run test:browser:install     # einmalig Chromium + Firefox
npm run dev                     # in einem Terminal laufen lassen
npm run test:browser            # Screenshots/Report unter .artifacts/browser-smoke
```

Der Browserloop öffnet standardmäßig Chromium und Firefox als sichtbare Fenster
mit normaler Grafik-Konfiguration. `--browser=chromium` oder `--browser=firefox`
begrenzt die Auswahl; `--loops=2 --bot-seconds=30` wiederholt den Durchlauf und
beobachtet die Bot-Demo länger. `--headless` ist für Läufe ohne Fenster gedacht
(in CI automatisch aktiv). Nur bei Bedarf erzwingt `--software` für Chromium
SwiftShader; dessen Bildrate ist kein Vergleichswert für native Grafik.
`--no-screenshots` lässt alle Prüfungen laufen, speichert aber ausschließlich
den Report und nimmt auch bei Fehlern kein Bild auf.

Screenshots und `report.json` dokumentieren Ansichten, Browserfehler,
WebGL-Renderer, Botbewegung und ein kurzes Frame-Timing. Der Loop prüft auch,
dass der Archivar nur einen Raum sieht und das mobile Layout nicht überläuft.
Ein kurzer Botlauf ersetzt weder den Integrationstest einer vollständigen Mission
noch eine Quest-Abnahme mit echten VR-Controllern und mehreren Mobilgeräten.
Details und noch offene Hardwaretests: [Orbital-QA](docs/orbital-qa.md).

Der Workflow [Browser smoke](.github/workflows/browser.yml) prüft den gebauten
Stand zusätzlich mit Chromium und `--no-screenshots` in CI. Der Report bleibt dort
14 Tage als Artefakt **orbital-browser-review** verfügbar, auch bei einem
fehlgeschlagenen Lauf. Die Softwaregrafik dieses CI-Tests ist kein FPS-Benchmark.

Jest testet überwiegend Rechen-Logik ohne Browser — Ferngreifen, Achsenzuordnung,
Werkzeug-Pose, Handhaltung, Handgesten, Waffenwerte, Zielrichtung,
Konfig-Code, den Lichtkegel der Taschenlampe, die Gürtel-Position samt der
Spiegelung beider Hüften, die Portaltiefe, den Durchtritt durch ein Portal, die Grafikstufen, das Aussehen,
den Ausschnitt der Karte in der Hand, die Lichtstufen
des Dunkelhauses, den Halt an der Kletterwand samt Ausdauer und der Vibration
dazu, die **Federung der Sprungkissen** (dass ein Sturz aus sieben Metern nicht
durchschlägt und der Blick trotzdem nicht in einem Bild stehen bleibt),
die Blätterposition der Menüs und den Weg durch sie, die
Augenhöhen, die Vibrationsmuster, die beiden Justierstände im Eingaberaum samt
der Rechnung hinter der Boxhand am Werkzeug, den Standardgriff, der bei jeder
Haltung an derselben Stelle in der Faust landet, die Faust am Griff (eine
Einstellung für alle Werkzeuge mit demselben Griff), die Räumung nach dem
Loslassen (ob ein Ding noch im Spieler steckt), den Griff am Stiel des großen
Hammers samt seiner zweihändigen Lage, die Fahrphysik,
Streckenführung und Rundenzählung der Karts, das Pizza-Rezept, die Welt-Physik, die Rettung aus
der Tiefe, die **Bausteine auf dem Kachelgitter** (dass jeder in jeder der vier
Richtungen auf seiner Kachel bleibt, dass keine Treppenstufe höher wird als der
Spieler steigt) samt den Grundrissen der vier Welten, die darauf stehen (dass
man vom Startzimmer in jedes Zimmer kommt und in Dust jedes Haus vom
Erdgeschoss aufs Dach), die Stoppuhr-Einstellungen, den Markdown-Umbruch der Schilder samt
ihrem Rollen und dem, was von ihnen über das Netz geht, die Türen des
Interaktionslabors, die Pinselwerte (Breite, Art und die eigene
Farbreihe), die Materialien, die Dicke der Bodenplatte, den
Kurzcode für ein einzelnes Werkzeug (samt der Zahlen, an denen seine Länge
hängt), die Zuordnung von Stand zu Zielscheibe im Schießgang, den Chat-Verlauf
samt Putzen fremden Textes, die Wahl des Gastgebers einer geteilten Welt, die
Auslegung der Hub-Gänge, die Flächen der Würfel (dass gegenüberliegende
Seiten zusammen `n + 1` ergeben, wie auf einem echten Würfel), die Passung des
Handschuhs auf die Knochen einer getrackten Hand, die **Messung dieser Knochen**
(eine Hand aus bekannten Winkeln bauen und nachsehen, ob die Messung sie wieder
herausgibt), die **Knochenfarben**, die geteilte Handhaltung auf
dem Weg über die Leitung, die Maße des Poseraums, den **Bauplan des Editors**
(worauf ein Zeiger trifft — Kachel oder Kante —, was die vier Werkzeuge daraus
machen, und dass die gebauten Quader vom Abtasten wiedergefunden werden) samt
der **Miniatur** (Hin und Zurück ohne Drift, und dass der Punkt zwischen den
Fingern beim Ziehen liegen bleibt), dem **Malen** (dass zwischen zwei
Bildern keine Lücke bleibt, und dass ein Rechteck aus Boden seine Fläche füllt,
eines aus Wänden dagegen nur seinen Rand — sonst wäre es ein Klotz und kein
Zimmer) und dem **Weltformat** (dass eine Welt mit Dach und Möbeln durch die
Datei und wieder zurück dieselbe ist, dass der Aufschlag einer Küchenzeile
dabei nicht jedes Mal mitwächst, und dass eine Datei aus der Zukunft abgelehnt
statt halb geladen wird), **was ein NPC an einer Kante anfängt**
(wie hoch er tritt, wie hoch er sich hochzieht, wie steil ein Weg für ihn noch
einer ist und ab welcher Höhe ein Sprung nach unten ihn umbrächte) und das
**ganze Navigationslabor auf einmal**
(ein Körper mit Umfang und Drehrate läuft jede Bucht ab, und je Bucht prüft ein
Kontrollpunkt, dass er den richtigen Weg genommen hat). Diese
Module kommen ohne three.js und Rapier aus, deshalb braucht Jest weder WebGL
noch WebXR. Was schwer zu testen ist, gehört möglichst in so ein Modul — der
Rest bleibt Verdrahtung.

## Werkzeugseite

Neben dem Spiel steht **[`/tools.html`](https://baumgartner-games.github.io/vr/tools.html)**:
alle Werkzeuge als Liste, jedes einzeln in 3D zum Drehen, und die Hand dazu
ein- und ausschaltbar — als zwei verschiedene Hände: *Hand in VR* (die
gezeichnete Hand am Werkzeug, so sieht es in der Brille aus) und *Hand in echt*
(die eigene Hand am roten Handgriff des Geräts, mit dem Werkzeug als Geist
daneben). Werkzeug und Zielscheibe bleiben dabei an derselben Stelle; was
wechselt, ist die Hand. Aus ihr läuft die **weiße Linie** des Zeigestrahls
sauber nach vorn auf die Zielscheibe, genau wie in der Brille. Der Knopf **Bearbeiten** oben in der Ecke (an einem
einzelnen Werkzeug) macht daraus einen Justierstand fürs Telefon: oben die Achse (X, Y, Z, Yaw, Pitch, Roll — immer
nur eine), unten der Regler. Bewegt wird dabei die **Hand** — das Werkzeug steht
still —, und ein Umschalter sagt, wohin die Haltung übernommen wird: als *Lage
in der Hand* oder als *Griffhaltung am Griff*. Wohin ein Werkzeug **zielt**,
sagt ein violetter Pfeil an allem, was zielt. Zwei Knöpfe legen die Hand mit
einem Tipp an eine dieser Richtungen: **Auf den Zylinder** (Richtung und
Ursprung — die Fingerspitze landet im Halter) und **In Zielrichtung** (nur die Richtung, die
Spitze bleibt liegen). Und der Regler dreht die Hand um die **Fingerspitze**
statt um ihr Handgelenk, damit die aufgelegte Linie beim Drehen und Rollen
liegen bleibt. Alles landet in denselben Speichern wie
in der Brille, und der **Konfig-Code** dazu steht gleich darunter zum Kopieren.
Über die Schublade daneben die
**Welten** (jede ganz zum Drehen, schräg von oben für den Überblick, Räume mit
Decke aufgeschnitten wie ein Puppenhaus — über allem, was darin steht, damit
eine Halle ihre Wände behält —, und beliebig nah heranzuzoomen — zwei
Finger schieben und zoomen dabei wie auf einer Karte; mit
**Freie Kamera** fliegt man wie mit einer Drohne hindurch — W A S D und
hoch/runter als Knöpfe oder Tasten, Wischen dreht den Blick —, dazu ein Knopf
hinein) — und **Laufen lassen**: dieselbe Welt mit echter Physik, Gitter und
NPCs, senkrecht von oben, mit den Knöpfen der Welt als Zeilen daneben, den
sieben Debug-Ebenen des Navigationsgitters als Schalter — darunter die
**betretbare Fläche** und der **Sichtkegel** der NPCs, dazu Lebensbalken und
**Trefferzonen** — und einem **Ziel**, das
ein Tipp auf den Boden versetzt und dem die NPCs nachlaufen. Mit **Gehe zu**
geht die eigene Figur stattdessen zu Fuß dorthin — über dasselbe Gitter wie die
NPCs, durch dieselben Türen und Portale —, mit **Im Bereich** legt ein Tipp
einen Kreis hin und die Liste zeigt nur noch, was darin (oder in Reichweite der
Figur) zu drücken ist, und mit **Figur weg** steht man gar nicht erst in der
Welt. Die Karte selbst hat zwei eigene Knöpfe: **Ziehen** schaltet zwischen
Drehen und Schieben um, **Folgen** legt die Bildmitte auf die Figur. Im
[Navigationslabor](https://baumgartner-games.github.io/vr/tools.html#welt/navlab)
ist das die ganze Brille, die man zum Zusehen braucht. Dazu der
**Magische Beutel** (jedes Objekt mit Masse und Maßen) und die **NPCs** (jede
Haut geht auf der Stelle, jedes Hirn mit seinen Zahlen daneben). Keine Brille
nötig, das Telefon reicht.

Und **Verbinden**: derselbe Raum-Code wie beim Zusammenspielen, aber ohne Spiel
darin. Wer in der Brille im **Poseraum** _Handpose teilen_ drückt, dessen Hand
steht hier live am Werkzeug — nur die eine Hand, nichts drumherum —, und ihr
Konfig-Code steht darunter in einem Feld zum Herauskopieren. Details in
[AGENTS.md](AGENTS.md#die-werkzeugseite).

## Query-/Hash-Parameter

| Parameter | Wirkung |
| --- | --- |
| `#portal` | startet direkt in dieser Welt (jede Welt-ID funktioniert) |
| `?world=portal` | dasselbe als Query-Parameter |
| `?room=mond-riff-47` | trägt den Raum-Code ins Verbindungs-Formular ein (Einladungslink) |
| `?net=local` | nutzt `BroadcastChannel` statt WebRTC — zwei Tabs auf einem Rechner |

Im Browser liegt die App zum Debuggen auf `window.bgvr`.

## Steuerung

| | VR | Desktop | Handy |
| --- | --- | --- | --- |
| Bewegen | linker Stick (reindrücken = Sprint) | `WASD`, `Shift` | linker Touch-Stick |
| Umsehen | Kopf, rechter Stick = Snap-Turn | Maus (Klick = Pointer-Lock) | wischen |
| Springen / Ducken | `A` rechts / rechten Stick reindrücken | `Leertaste` | – |
| Menü | Button an beiden Händen (immer nur eins offen) | `Menü` im HUD | `Menü` im HUD |
| Auswählen | zielen + Trigger oder `A` | Linksklick | tippen |
| Werkzeug nehmen/ablegen | Grip an der Hüfte; woanders loslassen lässt es fallen | – | – |
| Hüften verschieben | Gürtel-Justierer: Hüfte anzielen, Trigger, mit der anderen Hand schieben | – | – |
| Ohne Controller | 3 Finger an die Handfläche = Greifen, Zeigefinger = Trigger | – | – |
| Sitzen oder stehen | Startseite oder Menü → Bewegung → Haltung | dito | dito |
| Verbinden | Menü → Verbindung → *Raum betreten*; geht mitten im Spiel, ohne die Sitzung zu verlassen | Raum-Code auf der Startseite | dito |
| Chat | Menü → Verbindung → Chat (lesen, *Schreiben* öffnet die Tastatur) | Panel *Verbindung*: tippen, je Zeile *Kopieren* und *Übernehmen* | dito |
| Sprechen | Menü → Verbindung → *Mikrofon* — die Stimmen kommen aus der Richtung, in der die anderen stehen | Panel *Verbindung* → *Sprache* | dito |
| Werkzeug benutzen | Trigger (Greifen = zweite Funktion) | Links-/Rechtsklick | – |
| Großer Hammer | irgendwo am Stiel greifen, zweite Hand dazu; Trigger halten schiebt die Hand am Stiel | – | – |
| Hängegleiter (Alpen) | Trigger = Anlauf; Bügel ziehen = schneller, drücken = langsamer, zur Seite = Kurve; loslassen am Boden lässt ihn fallen | – | – |
| Flügel (Alpen) | beide Arme schlagen = Start und Schub; ausbreiten = gleiten; eine Hand tiefer = Kurve | – | – |
| Taschenlampe | Trigger schaltet; andere Hand an der Linse zieht den Kegel breit/schmal | – | – |
| Pinsel | Palette an der anderen Hand: antippen **oder** anzielen + Trigger; Regler für RGB und Strichbreite gedrückt halten und ziehen; ✕ schließt sie, `A`/`X` öffnet sie | Linksklick | – |
| Staffelei | Trigger stellt sie auf den Boden und die Hand ist danach frei; Griff an der Ablage + Greifen nimmt sie wieder auf; `A`/`X` wischt die Leinwand; gemalt wird mit dem Pinsel | – | – |
| Aufheben / werfen | Grip mit leerer Hand am Objekt | – | – |
| Ferngreifen | zielen, Grip, Hand zum Körper zucken (ab 8 m/s, einstellbar) | – | – |
| Kart: einsteigen | Lenkrad greifen (oder anzielen + Trigger) | Lenkrad anklicken | – |
| Kart: fahren | rechter Trigger Gas, linker bremst, linker Stick lenkt | `W`/`S`, `A`/`D` | – |
| Kart: aussteigen | `A`/`X` halten | `E` halten | – |
| Kart: zu zweit | im selben Raum verbinden — jeder nimmt ein Kart, die Tafel zeigt die Reihenfolge | dito | – |
| Pizza: kneten | Faust auf den Teig auf dem Tisch schlagen | – | – |
| Pizza: belegen | Kelle/Streuer greifen, Trigger halten | – | – |
| Handpose einmessen (Poseraum) | Werkzeug im Schwebekasten loslassen, blanke Hand daran, mit der Controller-Hand auf *Handpose teilen* zeigen; deren Trigger speichert | – | – |
| Schwebekasten feststellen | Knopf *Schwebe* an der Wand im Poseraum — was darin hängt, steht still und lässt sich nicht greifen | – | – |
| Zurücksetzen | `B` / `Y` oder Menü | `R` oder Menü | Menü |

Die vollständige Tabelle samt aller Werkzeuge steht in [AGENTS.md](AGENTS.md#steuerung).

## Konfig-Code

Werkzeug-Posen, Handhaltungen, Anbauteile und Waffenwerte passen zusammen in
eine kopierbare Zeile (`BG3…`) — und ein einzelnes Werkzeug an einer einzelnen
Hand in eine so kurze, dass man sie abtippt. In VR unter
*Einstellungen → Konfig-Code*,
am Rechner über die Kommandozeile:

```bash
npm run config -- decode BG3…          # zeigt die Einstellungen als JSON
npm run config -- encode config.json   # macht wieder einen Code daraus
npm run config -- mirror BG3… left     # linke Handhaltungen nach rechts
```
