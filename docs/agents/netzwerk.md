# Zusammen spielen

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

## Zusammen spielen (Peer-to-Peer)

Zwei Geräte, ein Raum-Code, keine eigene Infrastruktur. Auf der Startseite (oder
im HUD unter **Verbindung**) tragen beide denselben Code ein — `Würfeln` erzeugt
einen sprechbaren wie `mond-riff-47`, `Link kopieren` legt ihn als `?room=` in
die URL, damit das zweite Gerät nur noch tippen muss.

**Auch aus der Brille heraus.** Getippt wurde der Code lange nur auf der flachen
Seite, und das hieß für jemanden, der schon spielte: Brille ab, Code eintippen,
Brille auf, Sitzung neu starten. Unter _Verbindung_ stehen deshalb jetzt **Raum
betreten**, **Neuen Raum aufmachen** (würfelt und verbindet gleich) und
**Name** — getippt auf derselben Tastatur wie ein Konfig-Code
(`ui/KeyPanel.ts`, Buchstabenbelegung mit Leertaste für Namen). Raum-Code und
Name liegen in **einem** Speicher (`net/room.ts`), den sich Startseite und
Brille teilen; zwei wären zwei Namen, die auseinanderlaufen.

**Verbinden fasst nichts an außer der Verbindung.** Keine Welt wird neu
geladen, kein Startpunkt angesprungen, keine Sitzung beendet: wer sich mitten
im Spiel dazuschaltet, steht danach genau dort, wo er vorher stand. Das ist
auch das Modell dahinter — es läuft **immer**, als wäre man in einem Raum, nur
dass ohne Gegenüber nichts hinausgeht (`PortalSync.alone`). Und wenn jemand
dazukommt, bleibt, was hier in der Hand liegt, hier in der Hand: der
Schnappschuss des Gastgebers überschreibt jede Besitzerliste außer der eigenen
— sonst zöge ein frisch Dazugekommener einem das Werkzeug sichtbar aus der
Hand, weil er von ihm gar nichts wissen kann.

**Warum kein eigener Signaling-Server?** WebRTC braucht nur für den Handshake
einen Umweg (Austausch der SDP-Beschreibungen). Danach läuft alles direkt
zwischen den Browsern. Diesen Handshake übernimmt
[Trystero](https://github.com/dmotz/trystero): es legt die Angebote in ein
öffentliches Relay-Netz statt auf einen Server, den wir betreiben müssten.

| Vermittlung          | Netz                        | Anmerkung                                   |
| -------------------- | --------------------------- | ------------------------------------------- |
| **Nostr** (Standard) | hunderte öffentliche Relays | am robustesten, `wss://`                    |
| **MQTT**             | öffentliche Broker          | gute Alternative, wenn Nostr blockiert ist  |
| **BitTorrent**       | öffentliche Tracker         | funktioniert, aber Tracker kommen und gehen |

Umschalten geht im Panel unter _Vermittlung_ — hilfreich in Netzen, die eine
der Varianten wegfiltern. Findet keins der Relays einen Weg, sagt das Panel das
auch so (`Kein nostr-Relay erreichbar`), statt still zu warten.

Was **nicht** über die Relays läuft: alles Inhaltliche. Posen, Welt-Events,
Chat und Sprache gehen ausschließlich über die direkte, verschlüsselte
Verbindung. Der
Raum-Code dient zugleich als Passwort, mit dem Trystero die Handshake-Daten auf
dem Relay verschlüsselt.

**Grenzen.** Ohne TURN-Server scheitert die direkte Verbindung bei symmetrischem
NAT (manche Mobilfunknetze, strenge Firmennetze). Im selben WLAN — der
Hauptfall: Brille und PC im gleichen Raum — reicht STUN. Wer einen TURN-Server
hat, gibt ihn beim Build mit:

```bash
VITE_TURN_URL=turn:example.org:3478 VITE_TURN_USER=user VITE_TURN_CREDENTIAL=secret npm run build
```

Zum Entwickeln ohne Netz reicht `?net=local`: dann übernimmt
`BroadcastChannelTransport` und zwei Tabs im selben Browser bilden eine Session.

## Chat: Text, und vor allem Codes

Ein Chat, der nicht zum Plaudern gebaut ist. Wer in der Brille steht, misst
dort ein Werkzeug ein und hat am Ende einen **Konfig-Code**, den er am PC
bräuchte — zum Aufschreiben, zum Eintragen ins Werkzeug, zum Weiterschicken.
Vorlesen und abtippen ist genau die Sorte Arbeit, für die es Rechner gibt. Also
schickt die Brille die Zeile herüber, und am PC steht sie im Panel unter
**Chat**: mit Uhrzeit, mit der Angabe, wofür sie gilt, und mit einem Knopf
_Kopieren_ daneben. _Verlauf kopieren_ nimmt alles auf einmal mit.

Deshalb hat eine Zeile eine **Sorte**. `text` ist, was jemand getippt hat;
`code` ist eine Zeile, die eine Maschine geschrieben hat und die eine andere
wieder lesen kann. Wer einen Code verschickt, trägt ihn als `code` ein, und
angewandt wird beim Empfang **nur solches** — was jemand von Hand schreibt,
wird nie ausgeführt, auch wenn es zufällig wie ein Code aussieht. Die Knöpfe
_Werkzeug senden_ und _Alles senden_ an der Wand des Eingaberaums gingen über
diesen Weg; sie lohnten auch allein im Raum, weil der Code dann im eigenen
Verlauf landet statt in einer Meldung, die nach vier Sekunden weg ist.

`chat` ist eine eigene Nachrichtensorte in `net/types.ts` und kein
Welt-Ereignis: der Verlauf gehört der App, überlebt jeden Weltwechsel und wird
nicht abbestellt, wenn eine Welt aufräumt. Der Verlauf selbst (`net/chat.ts`,
mit Test) ist eine Liste, die vorn ausfranst — 200 Zeilen —, und alles, was
hereinkommt, wird vorher **geputzt**: Steuerzeichen raus, Umbrüche zu
Leerzeichen, bei 2000 Zeichen abgeschnitten. Was über das Netz kommt, hat sich
niemand ausgesucht.

In der Brille steht derselbe Verlauf unter _Menü → Zusammen → Chat_, die
letzten acht Zeilen, neueste oben, und _Schreiben_ macht die Tastatur auf. Was
dort **nicht** steht, ist ein Kopieren-Knopf: 24 Zeichen aus einem Alphabet
ohne Bedeutung sind in einer Brille nicht zu lesen und nirgends hinzulegen.
Abgeholt wird am PC — dafür ist der Code ja geschickt worden.

**Der Verlauf übersteht einen Neuladen**: die letzten 50 Zeilen liegen im
Browser (`CHAT_KEPT`), sonst wäre der Code, den die Brille gerade
herübergeschickt hat, nach einem F5 weg. Gelesen wird der eigene Speicher
genauso misstrauisch wie das Netz — es ist derselbe fremde Text von gestern,
und dazwischen lag vielleicht eine Fassung mit anderen Feldern.

**Angewandt wird ein Code auf Knopfdruck.** Eine Welt darf ankommende Codes von
sich aus annehmen — im Eingaberaum war das der Sinn der Sache, zwei Leute
justierten gemeinsam. Überall sonst kam ein Code bisher an, stand im Verlauf und tat
nichts, ohne dass irgendwo stand, warum. Jetzt liegt neben der Zeile ein Knopf
_Übernehmen_ (im Panel wie im Menü der Brille), und `World.reloadGear` sagt der
laufenden Welt Bescheid — was schon in einer Hand liegt, liest seine Zahlen
sonst nie wieder nach. Automatisch überall wäre die schlechtere Antwort: Was
ein anderer schickt, soll einem nicht ungefragt die Ausrüstung umstellen,
während man gerade fliegt.

## Sprechen: Stimmen im Raum

Der Chat ist für Codes gebaut und nicht zum Plaudern — in der Brille zu tippen
ist teuer, und „schau mal nach links" über eine Bildschirmtastatur zu
buchstabieren ist die Art Aufwand, für die es Stimmen gibt. Die Leitung dafür
steht längst: WebRTC trägt neben dem Datenkanal auch Ton, und Trystero hängt
einen Medienstrom an dieselben Peers, die schon die Posen bekommen.

- **Räumlich, nicht als Telefonkonferenz.** Jede ankommende Stimme läuft durch
  einen `PannerNode`, der jedes Bild an den Kopf ihres Sprechers gesetzt wird
  (`net/Voice.ts`); die Ohren des Kontextes sitzen an der Kamera. Wer hinter
  dir redet, klingt von hinten, und wer am anderen Ende der Halle steht, ist
  leise. In VR ist das kein Schmuck, sondern der Unterschied zwischen „jemand
  sagt etwas" und „der da drüben sagt etwas".
- **Aus, bis jemand es einschaltet** — _Menü → Zusammen → Mikrofon_, am PC im
  Panel unter _Sprache_. Ein Mikrofon, das mitläuft, weil man einem Raum
  beigetreten ist, ist ein Fehler und keine Bequemlichkeit; der Browser fragt
  ohnehin um Erlaubnis, und diese Frage soll auf einen Knopfdruck folgen.
  Ausschalten hängt den Strom nicht nur ab, sondern **hält ihn an**: nur so
  geht die Aufnahmeleuchte des Geräts aus, und das ist die eine Rückmeldung,
  der ein Mensch glauben können muss.
- **Wer spricht, trägt einen Punkt** auf dem Namensschild
  (`RemoteAvatars.isSpeaking`, gemessen an einem `AnalyserNode`). In einem Raum
  mit vier Leuten ist „wer redet gerade" sonst geraten.
- **Zwei Fallstricke, beide eingebaut:** Ein WebRTC-Strom fließt in Chrome erst
  dann in die Web-Audio-Welt, wenn er außerdem an einem Medienelement hängt —
  deshalb liegt an jeder Stimme ein stummes `<audio>`, ohne das der
  `MediaStreamSource` still bleibt. Und Trystero hängt einen Strom an die
  Verbindungen, die es _jetzt_ gibt; wer später dazukommt, bekommt ihn nur,
  weil `TrysteroTransport` ihn bei `onPeerJoin` noch einmal anhängt.
- **Nicht überall.** `NetTransport.addStream` ist optional: über einen
  `BroadcastChannel` zwischen zwei Tabs (`?net=local`) gibt es keine Spur, auf
  der Ton fließt. Dann sagt das Menü das, statt einen Knopf anzubieten, der
  nichts tut. Und `getUserMedia` braucht einen sicheren Kontext — über `http://`
  jenseits von `localhost` ist die Frage gar nicht erst da.

## Die Welt teilen: Objekte und Portale

Ein Raum, ein Zustand. `PortalSync` (`worlds/portal/PortalSync.ts`) hält Props
und Portale auf allen Geräten gleich und hängt am freien Nachrichten-Kanal von
`NetSession` — die Engine selbst weiß davon nichts.

- **Wer rechnet?** Wer **am längsten in dieser Welt steht** (`net/host.ts`, mit
  Test). Das kann jeder für sich ausrechnen, es braucht keine Wahl und keinen
  Server. Er simuliert die Physik und streamt die Transformationen mit 20 Hz;
  bei allen anderen sind dieselben Körper kinematisch und laufen der empfangenen
  Pose weich hinterher. Geht er, übernimmt der Nächstälteste — mitten im Spiel.

  Vorher gewann die **kleinste Peer-Id**, und die ist gewürfelt: Wer dazukam,
  übernahm damit in der Hälfte aller Fälle die Welt eines anderen und schob ihm
  im selben Moment seinen eigenen, leeren Stand hinüber. Man kommt aber in einen
  Raum _hinein_ und nicht in einen anderen _hinüber_. Angesagt wird dafür eine
  **Dauer** und kein Zeitpunkt (`since` in `hello` und beim Weltwechsel): Zwei
  Rechner sind sich über die Uhrzeit nie einig, über die Länge einer Minute
  schon. Bei exakt gleicher Standzeit entscheidet weiterhin die kleinste Id —
  irgendetwas muss entscheiden, und es muss auf beiden Seiten dasselbe sein.

- **Wer anfasst, besitzt.** Greift eine Hand einen Würfel, beansprucht sie ihn
  (`own`) und streamt ihn selbst. Sonst würde ein getragener Würfel dauernd
  zwischen Hand und Simulation hin- und herspringen. Beim Loslassen geht er
  zurück, samt Wurfgeschwindigkeit, damit der Bogen nicht am Handgelenk endet.
- **Portale** gehören niemandem: Wer trifft, schickt die Pose, alle setzen sie.
- **Beutel und Reset** laufen als eigene Nachrichten; wer neu dazukommt, fragt
  einmal nach dem kompletten Stand (`hello` → `state`), und der rechnende
  Spieler wiederholt ihn zur Sicherheit alle zwei Sekunden.
- **Körper mit Wirkung**: jeder Mitspieler bekommt eine kinematische Kiste
  unter dem Kopf und zwei an den Händen. Dadurch stößt er beim Vorbeilaufen
  wirklich Dominos um, statt durch sie hindurchzugehen.

Was du davon siehst: den vollen Körper des anderen, sein Namensschild, die
Portal-Waffe in seiner Hand und ein Leuchten an dem Objekt, das er gerade hält.
Greift er durch ein Portal, wird seine Hand genauso geschnitten und auf der
anderen Seite weitergezeichnet wie deine eigene.

## Zuschauen: First und Third Person

Unter _Zuschauen_ — am PC im Panel, in VR unter **Menü → Zusammen** — wählst
du erst einen Spieler und dann die Ansicht:

- **Frei** — die normale Steuerung, eigene Kamera.
- **First Person** — die Kamera sitzt im Kopf des Spielers. Der eigene
  Avatar wird für die anderen ausgeblendet (man steckt ja in deren Kopf), und
  vom Beobachteten bleiben lokal nur die Hände sichtbar.
- **Third Person** — die Kamera schwebt hinter dem Spieler. Sie bleibt immer
  waagerecht; nur die Drehung zieht weich nach, damit das Bild nicht bei jedem
  Kopfruck mitzuckt.

**Zuschauen sticht _Von oben_.** Beides sind Kameras, und es kann nur eine das
Bild sein: Wer über die Schulter eines anderen sieht, will dessen Bild und
nicht sich selbst von oben. Solange zugesehen wird, ist `App.topDown` deshalb
falsch; hört es auf, kommt die Ansicht von selbst zurück — dieselbe Regel wie
für die Brille.

**Wer zusieht, geht mit.** Steht der gewählte Spieler in einer anderen Welt,
wechselst du beim Aussuchen automatisch dorthin — und genauso, wenn er sie
**später** wechselt: Geht der VR-Spieler durch ein Tor in eine andere Welt,
wird sie bei allen Zuschauenden nachgeladen. Vorher endete das Zuschauen in dem
Moment, in dem es spannend wurde: Seine Posen kamen weiter an und gehörten zu
nichts mehr, was hier steht, und das Bild blieb stehen, ohne dass irgendwo
stand, warum.

Gehandelt wird dabei auf den **Wechsel** und nicht auf den Unterschied
(`App.followWatched`, Merker `watchedWorld`). Das ist mehr als eine Sparmaßnahme
in der Bildschleife: Ein Unterschied allein zöge einen auch dann wieder zurück,
wenn man selbst gerade im Menü eine andere Welt gewählt hat — aus dem Mitgehen
würde ein Festhalten. Und lässt sich die Welt nicht laden, bleibt es bei einem
Versuch statt einem je Bild.

Dafür sind **zwei Fragen getrennt**, die gleich aussehen: _Wem wird zugesehen?_
(`App.watched`, die Wahl allein — `net/watch.ts`, mit Test) und _Von wem gibt es
hier eine Pose?_ (`App.spectatorTarget`, dieselbe Person, aber nur solange sie
in derselben Welt steht). Nur die zweite hat die Welt als Bedingung; wer durch
ein Portal geht, hört nicht auf, der zu sein, dem man zusieht — Menü und Panel
zeigen ihn deshalb weiter als gewählt, während seine Welt lädt. Verlässt er die
Sitzung, fällt die Kamera auf _Frei_ zurück.

Der Regler **Kamera-Glättung** bestimmt, wie träge das passiert: ganz links
folgt die Kamera 1:1, ganz rechts schwenkt sie deutlich verzögert nach. In First
Person glättet derselbe Regler die Kopfbewegung; **Horizont stabilisieren** wirft
zusätzlich die Kopfneigung weg, was gegen Übelkeit hilft.

Ziehen mit Maus oder Finger dreht die Kamera zusätzlich — in Third Person orbitet
sie um den Spieler, in First Person schaut man sich aus dessen Kopf um. Das
Mausrad ändert den Abstand, _Ansicht zentrieren_ setzt den Drag zurück.

**Im Headset** gibt es dieselben Optionen, aber mit einem Unterschied: übernommen
wird nur die _Position_ des anderen Spielers, nie seine Blickrichtung. Genau das
Umdrehen des Kopfes ohne eigenes Zutun macht in VR übel. Man wird also
mitgetragen und schaut sich dabei frei um. Solange das läuft, ist die eigene
Fortbewegung eingefroren (`PlayerRig.paused`); beim Zurückschalten auf _Frei_
holt die Physik-Kapsel den Körper wieder ein.

Technisch: `NetSession` verschickt Posen mit 20 Hz, `SmoothPose` zieht dazwischen
exponentiell nach (dieselbe Glättung nutzen auch die `RemoteAvatars`). Flach
setzt `SpectatorCamera` daraus die Kamera per `PlayerRig.setHeadWorldPose()` —
der eigene Rig bleibt stehen, es wandert nur die Kamera darin. In VR gehört die
Kamera dem Headset, deshalb wandert dort per `setHeadWorldPosition()` der Rig.

## Asymmetrisches Spielen

`PlayerRole` unterscheidet `vr`, `desktop` und `handheld`; jede Welt gibt in der
Registry an, welche Rollen sie unterstützt. `NetSession` kümmert sich um
Presence, Pose-Sync und freie Nachrichten-Kanäle für Welten-Events,
`RemoteAvatars` zeichnet die anderen Spieler mit demselben `AvatarBody`, den
auch der eigene Körper benutzt — Kopf plus zwei Hände reichen als Eingabe, mehr
weiß ein Headset über seinen Träger nicht. Eine Welt darf dabei einen
Mitspieler **umsetzen** (`RemoteAvatars.placement`): Sie bekommt jeden, der in
ihr ist und eine Pose hat, und gibt eine andere Pose zurück, `null` für seine
eigene oder eine mit `hidden`, die ihn aus dem Bild nimmt — Haunting setzt so
die Zentrale auf ihre Hocker statt an den Spawn. Welten sehen nie, welcher
Transport darunter liegt — ein WebSocket-Transport ließe sich ohne Änderung an
den Welten ergänzen, er muss nur `NetTransport` implementieren.
