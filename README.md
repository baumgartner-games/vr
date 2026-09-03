# Baumgartner VR

WebXR-Spielwiese als Basis für weitere VR-Spiele und Experimente.
Drei.js + TypeScript + Vite, ohne externe Assets — alles wird prozedural gebaut.

**Live:** https://baumgartner-games.github.io/vr/ (nach dem ersten Deploy, siehe unten)

## Was drin ist

- **Startseite** mit großem `Enter VR`-Button (plus Flat-Modus für Desktop/Handy).
- **Hub-Welt**: helle Halle, Hände bzw. Controller, Tore zu den anderen Welten.
- **Handgelenk-Menü**: an der linken Hand schwebt ein Button; ein Druck öffnet ein
  Panel, das der Hand folgt — inklusive Neigung, es kippt mit dem Handgelenk.
  Das Panel steht senkrecht auf dem Handrücken und schaut den Kopf an.
  Ausgewählt wird mit der anderen Hand: zielen und **Trigger oder `A`** drücken
  — Hovern allein löst nichts aus, und angetippt wird auch nichts. Ohne
  getrackte Hand hängt dasselbe Menü an der Blickrichtung.
  Aufbau: **Welten** (Hub, Portal Labor), **Werkzeuge** (die beiden Portal
  Waffen direkt in die Hand), **Magischer Beutel** (Raster mit Companion Cube
  und Domino), **Einstellungen** und die Aktionen der Welt. Im Raster wird
  auf ein Feld gezielt und Trigger/`A` gedrückt — das Objekt liegt dann in
  genau dieser Hand. Das Raster kommt zurück, sobald du loslässt.
- **Portal Labor** (experimentell): Physik-Sandkasten mit zwei Portal-Guns am
  Gürtel (blau links, rot rechts, aber jede Hand darf jede nehmen),
  Schwerkraft, Sprung, Companion Cubes und einer Reihe Dominosteine. Portale
  gehen auch auf Boden und Decke — samt Sturz und Schwung beim Herausfliegen.
  Hände, Waffen und Objekte werden an der Portalebene geschnitten und kommen
  auf der anderen Seite wieder heraus: Du kannst die Hand durch ein Portal
  stecken und sie drüben sehen — und damit auch dort etwas anstoßen.
- **Eigener Körper**: Torso, Arme und Beine gibt es, sie werden aber nur in
  Portalsichten gezeichnet. Direkt sieht man nur die eigenen Hände — und sich
  selbst, wenn man durch ein Portal schaut. Die anderen Spieler bekommen
  denselben Körper, samt Namensschild und der Waffe in ihrer Hand.
- **Weltenregistry**: eine neue Welt ist ein Eintrag plus ein Modul.
- **Peer-to-Peer-Sitzungen** (experimentell): beide Geräte tragen denselben
  Raum-Code ein und sind danach direkt verbunden — ohne eigenen Server.
- **Geteilte Welt**: Portale, Würfel und Dominos sind bei allen dieselben —
  wer schießt, wirft oder etwas aus dem Beutel holt, tut das für alle.
- **Zuschauer-Kamera**: Spieler auswählen und zusehen, aus dessen Augen
  (First Person) oder mit weicher Verfolgung von hinten (Third Person). Am PC
  im Panel unter *Zuschauen*, in VR unter **Menü → Verbindung → Zuschauen** —
  beide Seiten haben dieselben Möglichkeiten.

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Typecheck + Produktionsbuild nach dist/
npm run preview  # gebautes Ergebnis lokal servieren
```

WebXR braucht einen sicheren Kontext. `localhost` reicht; für die Brille im
selben WLAN am einfachsten über HTTPS-Tunnel oder `vite dev --https` testen.

Nützliche Query-/Hash-Parameter:

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
| Bewegen | linker Stick | `WASD` (`Shift` = schneller) | linker Touch-Stick |
| Umsehen | Kopf, rechter Stick = Snap-Turn | Maus (Klick = Pointer-Lock) | wischen |
| Springen | `A` rechts | `Leertaste` | – |
| Menü | Button an der linken Hand | Button `Menü` im HUD | Button `Menü` im HUD |
| Auswählen | rechte Hand zielen + Trigger oder `A` | Linksklick | tippen |
| Waffe ziehen | Grip an der Hüfte halten (jede Hand, jede Waffe) | – (immer bereit) | – |
| Portal schießen | Trigger der Hand mit der Waffe | Links-/Rechtsklick | – |
| Aufheben / werfen | Grip mit leerer Hand am Objekt | – | – |
| Weitergeben | mit der freien Hand danach greifen | – | – |
| Ferngreifen | zielen, Grip drücken (rastet ein), Hand >30° nach oben kippen | – | – |
| Zurücksetzen | `B` / `Y` oder Menü | `R` oder Menü | Menü |
| Zuschauen | Menü → Verbindung → Zuschauen | Panel *Verbindung* → *Zuschauen* | dito |
| Zuschauer-Kamera drehen | – (Kopf bleibt deiner) | ziehen mit der Maus | wischen |
| Zuschauer-Abstand | Menüeintrag *Abstand* | Mausrad oder Regler | Regler |

**Handgesten** (mit Controllern): Grip = Pistolenhand — damit lassen sich
Dominosteine antippen. Grip + Trigger = Daumen hoch. Kommt etwas Greifbares in
Reichweite, leuchtet es auf und die Hand geht leicht in Griffhaltung. Mit
Hand-Tracking werden die echten Finger gerendert; dort schaltet ein Pinch am
Gürtel die Waffe zwischen Halfter und Hand um.

Die Waffe zielt entlang des Pointing-Rays des Controllers, nicht entlang der
Griffachse — sonst schießt man deutlich an der Zielrichtung vorbei. Jede Waffe
in der Hand zeigt ihre eigene Vorschau in ihrer Farbe; auf Boden und Decke
richtet sich das Portal nach der Waffe, mit der du zielst.

Die Greifbox ist der Collider plus 9 cm — ein fester Zuschlag, kein
prozentualer, damit ein Dominostein genauso gut in die Hand springt wie ein
Companion Cube.

**Ferngreifen** (Einstellungen, standardmäßig an) erweitert das auf 9 m und
läuft in zwei Schritten. Der Zielstrahl trifft die tatsächliche Box eines
Objekts — plus etwas Rand und einen Kegel, der mit der Entfernung aufgeht, so
dass ein weit entfernter Dominostein erreichbar bleibt, ohne einem näheren
Objekt das Ziel wegzunehmen. Was getroffen ist, leuchtet auf und bekommt ein
dünnes Seil zur Hand. Mit **Grip** rastet es ein: Es bleibt markiert und
angeseilt, auch wenn die Hand woanders hinzeigt. Kippst du die Hand danach
mehr als **30°** nach oben/hinten, spannt sich das Seil (es wird orange) und
das Objekt fliegt in einem Bogen heran — hältst du weiter gedrückt, landet es
in der Hand. Grip loslassen löst die Verbindung wieder.

## Architektur

```
src/
  core/      Engine, Player-Rig, Locomotion, XR-Input, Pointer, Hände, Avatar
  physics/   Rapier-Wrapper und der Charakter-Controller (dynamisch geladen)
  ui/        Canvas-basierte 3D-UI (Panel, Textflächen, Handgelenk-Menü)
  net/       Transport-Interface, WebRTC/BroadcastChannel, Presence, Avatare,
             Zuschauer-Kamera
  worlds/    Weltenregistry + je eine Welt pro Ordner (inkl. `PortalSync`,
             dem geteilten Zustand des Portal Labors)
```

Wie sich der Spieler bewegt, entscheidet ein austauschbares `Locomotion`:
der Hub gleitet frei über die Plattform, das Portal Labor hängt eine
Rapier-Kapsel mit Schwerkraft, Kollision und Sprung ein. Die Physik-Engine
(rund 1 MB gzip) liegt in einem eigenen Chunk und wird erst geladen, wenn eine
Welt sie braucht.

Der `App`-Loop ist bewusst schlank: Input → Locomotion → `world.update()` →
UI → Netzwerk → Render. Eine Welt darf über `world.render()` selbst rendern;
das Portal Labor nutzt das für seine Zusatzdurchgänge.

### Eine neue Welt hinzufügen

1. `src/worlds/<name>/<Name>World.ts` anlegen und `World` implementieren
   (`init`, `update`, optional `render`, `dispose`).
2. In `src/worlds/index.ts` einen Eintrag in `WORLDS` ergänzen — Titel,
   Beschreibung, Akzentfarbe, unterstützte Rollen und ein `load()` mit
   dynamischem Import.

Mehr braucht es nicht: Menü, Hub-Tor, Deep-Link (`#<id>`) und das Aufräumen
beim Wechsel erledigt die Engine. Alles, was eine Welt der Szene hinzufügt,
wird beim Verlassen wieder entfernt (die Engine räumt zur Sicherheit nach).

### Wie die Portale funktionieren

Jedes Portal rendert die Sicht seines Partners in ein eigenes Render-Target.
Das Target hat exakt das Layout des gerade gezeichneten Framebuffers — in VR
also beide Augen nebeneinander —, deshalb kann die Portalfläche einfach ihre
eigene Bildschirmposition nachschlagen und das Bild sitzt auch in Stereo.
Die Near-Plane der virtuellen Kamera wird schräg auf die Portalebene gelegt
(Lengyels Oblique-Clipping), damit nichts zwischen Kamera und Portal ins Bild
läuft. Beim Durchschreiten wird der Player-Rig mit derselben Matrix versetzt,
mit der auch die virtuelle Kamera berechnet wird.

Portale auf Boden und Decke richten sich nach der Blickrichtung aus, damit man
immer sauber hineinfällt. Beim Durchgehen wandert nicht nur der Spieler, sondern auch jedes Objekt und
dessen Geschwindigkeit durch dieselbe Matrix — ein Sturz in ein Bodenportal
wird so zum Schwung aus einem Wandportal.

Damit man überhaupt durch eine Wand fallen kann, ignorieren Körper innerhalb
des Portaltrichters die Kollisionsgruppe der Fläche, auf der das Portal sitzt.
Jede portalfähige Fläche hat dafür ein eigenes Bit — mit einem gemeinsamen Bit
für alle löste ein Portal an der Wand auch den Boden davor auf, und man sackte
kurz vor dem Portal ein.

Nichts springt mehr durch die Portalebene: `PortalGhosts` schneidet alles, was
gerade in einer Öffnung steckt, mit einer Clipping-Ebene ab und zeichnet eine
Kopie davon vor dem Partnerportal — mit dem umgekehrten Schnitt. Beide Hälften
zusammen ergeben ein durchgehendes Objekt. Für die Hände sitzt zusätzlich ein
zweiter Kollisionsfühler in der herausragenden Hälfte, damit sie drüben auch
etwas anstoßen kann. Kurz vor dem Durchschreiten rutscht die Portalfläche ein
Stück auf das Auge zu, sonst würde die Near-Plane sie wegschneiden und für ein
paar Zentimeter die nackte Wand zeigen — genau das ließ den Durchgang wie eine
Teleportation wirken.

Bekannte Grenzen des Prototyps: Portale nur auf ebenen Flächen, und es gibt
eine Rekursionsstufe — im Portal zeigt das gegenüberliegende seinen Ruhewirbel.

### Zusammen spielen (Peer-to-Peer)

Zwei Geräte, ein Raum-Code, keine eigene Infrastruktur. Auf der Startseite (oder
im HUD unter **Verbindung**) tragen beide denselben Code ein — `Würfeln` erzeugt
einen sprechbaren wie `mond-riff-47`, `Link kopieren` legt ihn als `?room=` in
die URL, damit das zweite Gerät nur noch tippen muss.

**Warum kein eigener Signaling-Server?** WebRTC braucht nur für den Handshake
einen Umweg (Austausch der SDP-Beschreibungen). Danach läuft alles direkt
zwischen den Browsern. Diesen Handshake übernimmt
[Trystero](https://github.com/dmotz/trystero): es legt die Angebote in ein
öffentliches Relay-Netz statt auf einen Server, den wir betreiben müssten.

| Vermittlung | Netz | Anmerkung |
| --- | --- | --- |
| **Nostr** (Standard) | hunderte öffentliche Relays | am robustesten, `wss://` |
| **MQTT** | öffentliche Broker | gute Alternative, wenn Nostr blockiert ist |
| **BitTorrent** | öffentliche Tracker | funktioniert, aber Tracker kommen und gehen |

Umschalten geht im Panel unter *Vermittlung* — hilfreich in Netzen, die eine
der Varianten wegfiltern. Findet keins der Relays einen Weg, sagt das Panel das
auch so (`Kein nostr-Relay erreichbar`), statt still zu warten.

Was **nicht** über die Relays läuft: alles Inhaltliche. Posen, Welt-Events und
Chat gehen ausschließlich über den direkten, verschlüsselten Datenkanal. Der
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

### Die Welt teilen: Objekte und Portale

Ein Raum, ein Zustand. `PortalSync` (`worlds/portal/PortalSync.ts`) hält Props
und Portale auf allen Geräten gleich und hängt am freien Nachrichten-Kanal von
`NetSession` — die Engine selbst weiß davon nichts.

- **Wer rechnet?** Der Spieler mit der kleinsten Peer-ID. Das kann jeder für
  sich ausrechnen, es braucht keine Wahl und keinen Server. Er simuliert die
  Physik und streamt die Transformationen mit 20 Hz; bei allen anderen sind
  dieselben Körper kinematisch und laufen der empfangenen Pose weich hinterher.
  Geht er, übernimmt der Nächste in der Reihe — mitten im Spiel.
- **Wer anfasst, besitzt.** Greift eine Hand einen Würfel, beansprucht sie ihn
  (`own`) und streamt ihn selbst. Sonst würde ein getragener Würfel dauernd
  zwischen Hand und Simulation hin- und herspringen. Beim Loslassen geht er
  zurück, samt Wurfgeschwindigkeit, damit der Bogen nicht am Handgelenk endet.
- **Portale** gehören niemandem: Wer trifft, schickt die Pose, alle setzen sie.
- **Beutel und Reset** laufen als eigene Nachrichten; wer neu dazukommt, fragt
  einmal nach dem kompletten Stand (`hello` → `state`), und der rechnende
  Spieler wiederholt ihn zur Sicherheit alle zwei Sekunden.
- **Körper mit Wirkung**: jeder Mitspieler bekommt im Portal Labor eine
  kinematische Kiste unter dem Kopf und zwei an den Händen. Dadurch stößt er
  beim Vorbeilaufen wirklich Dominos um, statt durch sie hindurchzugehen.

Was du davon siehst: den vollen Körper des anderen, sein Namensschild, die
Portal-Waffe in seiner Hand und ein Leuchten an dem Objekt, das er gerade hält.
Greift er durch ein Portal, wird seine Hand genauso geschnitten und auf der
anderen Seite weitergezeichnet wie deine eigene.

### Zuschauen: First und Third Person

Unter *Zuschauen* — am PC im Panel, in VR unter **Menü → Verbindung** — wählst
du erst einen Spieler und dann die Ansicht:

- **Frei** — die normale Steuerung, eigene Kamera.
- **First Person** — die Kamera sitzt im Kopf des Spielers. Der eigene
  Avatar wird für die anderen ausgeblendet (man steckt ja in deren Kopf), und
  vom Beobachteten bleiben lokal nur die Hände sichtbar.
- **Third Person** — die Kamera schwebt hinter dem Spieler. Sie bleibt immer
  waagerecht; nur die Drehung zieht weich nach, damit das Bild nicht bei jedem
  Kopfruck mitzuckt.

Steht der gewählte Spieler in einer anderen Welt, wechselst du automatisch
dorthin. Verlässt er die Sitzung, fällt die Kamera auf *Frei* zurück.

Der Regler **Kamera-Glättung** bestimmt, wie träge das passiert: ganz links
folgt die Kamera 1:1, ganz rechts schwenkt sie deutlich verzögert nach. In First
Person glättet derselbe Regler die Kopfbewegung; **Horizont stabilisieren** wirft
zusätzlich die Kopfneigung weg, was gegen Übelkeit hilft.

Ziehen mit Maus oder Finger dreht die Kamera zusätzlich — in Third Person orbitet
sie um den Spieler, in First Person schaut man sich aus dessen Kopf um. Das
Mausrad ändert den Abstand, *Ansicht zentrieren* setzt den Drag zurück.

**Im Headset** gibt es dieselben Optionen, aber mit einem Unterschied: übernommen
wird nur die *Position* des anderen Spielers, nie seine Blickrichtung. Genau das
Umdrehen des Kopfes ohne eigenes Zutun macht in VR übel. Man wird also
mitgetragen und schaut sich dabei frei um. Solange das läuft, ist die eigene
Fortbewegung eingefroren (`PlayerRig.paused`); beim Zurückschalten auf *Frei*
holt die Physik-Kapsel den Körper wieder ein.

Technisch: `NetSession` verschickt Posen mit 20 Hz, `SmoothPose` zieht dazwischen
exponentiell nach (dieselbe Glättung nutzen auch die `RemoteAvatars`). Flach
setzt `SpectatorCamera` daraus die Kamera per `PlayerRig.setHeadWorldPose()` —
der eigene Rig bleibt stehen, es wandert nur die Kamera darin. In VR gehört die
Kamera dem Headset, deshalb wandert dort per `setHeadWorldPosition()` der Rig.

### Asymmetrisches Spielen

`PlayerRole` unterscheidet `vr`, `desktop` und `handheld`; jede Welt gibt in der
Registry an, welche Rollen sie unterstützt. `NetSession` kümmert sich um
Presence, Pose-Sync und freie Nachrichten-Kanäle für Welten-Events,
`RemoteAvatars` zeichnet die anderen Spieler mit demselben `AvatarBody`, den
auch der eigene Körper benutzt — Kopf plus zwei Hände reichen als Eingabe, mehr
weiß ein Headset über seinen Träger nicht. Welten sehen nie, welcher
Transport darunter liegt — ein WebSocket-Transport ließe sich ohne Änderung an
den Welten ergänzen, er muss nur `NetTransport` implementieren.

## Deployment

`.github/workflows/deploy.yml` baut bei **jedem Push** (und in Pull Requests)
und lädt das Ergebnis als Artefakt hoch. Pushes auf `main` werden zusätzlich
auf den Branch `gh-pages` veröffentlicht — bewusst ohne GitHub-Pages-
Environment, damit keine Environment-Protection dazwischenfunkt. Nötig ist
nur die einmalige Einstellung:

> Repository → Settings → Pages → Source: **Deploy from a branch** →
> Branch `gh-pages`, Ordner `/ (root)`

Der Basispfad kommt aus `BASE_PATH` (im Workflow `/<repo-name>/`), lokal wird
von `/` ausgegangen.
