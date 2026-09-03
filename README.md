# Baumgartner VR

WebXR-Spielwiese als Basis für weitere VR-Spiele und Experimente.
Drei.js + TypeScript + Vite, ohne externe Assets — alles wird prozedural gebaut.

**Live:** https://baumgartner-games.github.io/vr/ (nach dem ersten Deploy, siehe unten)

## Was drin ist

- **Startseite** mit großem `Enter VR`-Button (plus Flat-Modus für Desktop/Handy).
- **Hub-Welt**: helle Halle, Hände bzw. Controller, Tore zu den anderen Welten.
- **Handgelenk-Menü**: an der linken Hand schwebt ein Button; ein Druck öffnet ein
  Panel, das der Hand folgt. Ausgewählt wird mit der rechten Hand (Zielstrahl +
  Trigger) oder direkt per Fingertipp. Ohne getrackte Hand (Desktop/Handy) hängt
  dasselbe Menü an der Blickrichtung.
- **Portal Labor** (experimentell): Portal-Gun in der rechten Hand.
  Trigger = blaues Portal, Grip = oranges Portal, durchgehen inklusive.
- **Weltenregistry**: eine neue Welt ist ein Eintrag plus ein Modul.
- **Rollen & Netzwerk-Grundgerüst** für spätere asymmetrische Spiele
  (VR-Spieler + Handy-Spieler).

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
| `?room=test` | verbindet Tabs über `BroadcastChannel` zu einer lokalen Session |

Im Browser liegt die App zum Debuggen auf `window.bgvr`.

## Steuerung

| | VR | Desktop | Handy |
| --- | --- | --- | --- |
| Bewegen | linker Stick | `WASD` (`Shift` = schneller) | linker Touch-Stick |
| Umsehen | Kopf, rechter Stick = Snap-Turn | Maus (Klick = Pointer-Lock) | wischen |
| Menü | Button an der linken Hand | Button `Menü` im HUD | Button `Menü` im HUD |
| Auswählen | rechte Hand zielen + Trigger, oder antippen | Linksklick | tippen |
| Portal blau | Trigger rechts | Linksklick | – |
| Portal orange | Grip rechts | Rechtsklick | – |

## Architektur

```
src/
  core/      Engine, Player-Rig, XR-Input, Pointer, Flat-Controls, Hand-Visuals
  ui/        Canvas-basierte 3D-UI (Panel, Textflächen, Handgelenk-Menü)
  net/       Transport-Interface, BroadcastChannel-Transport, Presence, Avatare
  worlds/    Weltenregistry + je eine Welt pro Ordner
```

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

Bekannte Grenzen des Prototyps: keine Schwerkraft und keine Objektphysik,
Portale nur auf ebenen Flächen, eine Rekursionsstufe (im Portal zeigt das
gegenüberliegende Portal seinen Ruhewirbel).

### Asymmetrisches Spielen (Vorbereitung)

`PlayerRole` unterscheidet `vr`, `desktop` und `handheld`; jede Welt gibt in
der Registry an, welche Rollen sie unterstützt. `NetSession` kümmert sich um
Presence, Pose-Sync (15 Hz) und freie Nachrichten-Kanäle für Welten-Events,
`RemoteAvatars` zeichnet die anderen Spieler. Der einzige heute enthaltene
Transport ist `BroadcastChannelTransport` (mehrere Tabs im selben Browser) —
ein WebSocket- oder WebRTC-Transport lässt sich ohne Änderung an den Welten
ergänzen, er muss nur `NetTransport` implementieren.

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
