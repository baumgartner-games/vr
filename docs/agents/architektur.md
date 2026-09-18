# Architektur

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

```
src/
  core/      Engine, Player-Rig, Locomotion, XR-Input, Pointer, Hände, Avatar
             — darin `colors.ts`, die einzige Stelle mit den Greiffarben,
             und `grabSettings.ts`, die drei Reichweiten des Greifens
  physics/   Rapier-Wrapper und der Charakter-Controller (dynamisch geladen)
  ui/        Canvas-basierte 3D-UI (Panel, Textflächen, Handgelenk-Menüs)
             — darin `menuNav.ts`, der Weg durchs Menü, den sich beide
             Handgelenke teilen, und `billboard.ts`, die einzige Stelle,
             an der sich etwas zur Kamera dreht
  net/       Transport-Interface, WebRTC/BroadcastChannel, Presence, Avatare,
             Zuschauer-Kamera
  worlds/    Weltenregistry + je eine Welt pro Ordner (inkl. `PortalSync`,
             dem geteilten Zustand der Props und Portale)
             — darin `npc/`, alles, was in einer Welt herumläuft: Haut, Hirn,
             Körper und der Regisseur, der sie zusammenhält
  sw.ts      Der Service Worker — kein Modul der Seite, sondern ein eigenes
             Programm neben ihr (`vite.config.ts`, eigener Einstiegspunkt);
             er entscheidet nichts selbst, das tut `core/swRoutes.ts`
tools/     Kommandozeile: `npm run config` liest und schreibt Konfig-Codes,
           `npm run icons` macht aus `public/icon.svg` die App-Symbole
```

Wie sich der Spieler bewegt, entscheidet ein austauschbares `Locomotion`:
Eine Welt ohne Physik gleitet frei über ihren Boden, eine Welt mit Kisten und
Treppen hängt eine Rapier-Kapsel mit Schwerkraft, Kollision und Sprung ein.
Die Physik-Engine
(rund 1 MB gzip) liegt in einem eigenen Chunk und wird erst geladen, wenn eine
Welt sie braucht.

**Ein Fehler in einem Bild friert die Brille nicht mehr ein** (`App.frame`,
`frameFailed`). `setAnimationLoop` bestellt das nächste Bild erst, wenn dieses
durch ist; eine Ausnahme irgendwo im Bild — Welt, Rig, Physik — heißt also:
kein nächstes Bild, nie wieder. Am Bildschirm steht der Fehler dann in der
Konsole, in der Brille steht gar nichts: Das Bild bleibt stehen, und der Ton
läuft weiter, weil Web Audio seinen eigenen Faden hat. Genau das war der
Befund „Ton gehört, Bild eingefroren" in der Verfolgung. Jetzt fängt die
Schleife den Fehler, schreibt ihn einmal in die Konsole und ans Handgelenk
(`notify`, „Fehler im Bild: …") und macht weiter; ein Fehler, der jedes Bild
wiederkommt, steht alle 300 Bilder noch einmal im Protokoll. Das ist keine
Ursache, sondern ihre Sichtbarkeit — wer den Text am Handgelenk liest, kann
ihn melden, wo vorher nur ein stehendes Bild war.

**Alles, worauf jemand steht, braucht Dicke.** Ein Collider kommt aus der
Bounding-Box der Geometrie, und eine `PlaneGeometry` hat keine — aus null wird
ein Zentimeter, das Minimum. Ein Zentimeter ist aber dünner als die **Haut** des
Character-Controllers (`CHARACTER_SKIN`, 2 cm): die Kapsel steckt dann dauernd
halb im Boden, und wer eine Durchdringung auflösen muss, gibt in dieser Frame
keine Bewegung heraus. In der Brille sieht das aus wie ein Spieler, der beim
Gehen alle paar Schritte stehenbleibt und dabei langsam einsinkt — und niemand
sucht das im Boden. Die Fläche bis zum Horizont ist deshalb ein **Kasten** von
einem halben Meter (`GROUND_THICKNESS`, mit Test), dessen Oberseite dort liegt,
wo vorher die Ebene lag.

**Und die Kapsel wird über dem Boden abgesetzt, nicht auf ihm**
(`SEAT_CLEARANCE`, 6 cm). Das ist die Zahl, wegen der man beim Stehen langsam
im Fußboden versank, nach dem nächsten Portal wieder oben drüber stand und der
Sprung mal kam und mal nicht — drei Beschwerden, ein Ursprung. Der
Character-Controller sucht den Boden nämlich nur auf der Strecke, die er gehen
soll, und was näher liegt als seine eigene Haut, sieht er überhaupt nicht: Eine
Sohle, die genau auf der Fläche steht, steht in seinem toten Winkel, wird von
ihr nicht mehr gehalten und sackt Bild für Bild tiefer, bis sie unten
herausfällt (gemessen: ein Meter in zehn Sekunden, bei manchen Bildraten der
ganze Weg aus der Welt). Genau so wurde sie aber abgesetzt, beim Betreten jeder
Welt und nach jeder Versetzung. Die paar Zentimeter, um die sie sich danach
setzt, bekommt der Spieler nicht mit: Das Rig lässt sie aus (`seatSlack`).

Dazu **misst** die Fortbewegung jedes Bild den Abstand zwischen Sohle und
Fläche, statt ihn dem Controller zu glauben (`groundGap` — ein Formwurf der
Kapsel nach unten). Liegt die Fläche in Hautnähe und der Controller hat sie
trotzdem nicht gesehen, unterbleibt der Schritt nach unten; steckt die Kapsel
schon darin, wird sie mit zwei Millimetern je Bild herausgeschoben. Das
Zweite kommt vom **Ansaugen** (`GROUND_SNAP`), das gelegentlich danebengreift:
Es stand auf 28 cm — eine ganze Treppenstufe — und riss den Spieler auf freier
Fläche dreizehn Zentimeter in die Bodenplatte hinein, wo der Controller ihn
auch nicht mehr vorwärts ließ. Das ist das Stocken beim Gehen, das aus dem
Nichts kommt und sekundenlang anhält. Jetzt sind es 8 cm; eine Treppe hält das
genauso sauber, und was höher ist, ist ohnehin ein Absatz, den man fällt.

**Ein Sprung wartet kurz auf den Boden und gilt kurz nach der Kante weiter**
(`JUMP_BUFFER` 0,15 s, `COYOTE_TIME` 0,12 s). Wer im Laufen abspringt, drückt
oft ein Bild zu früh oder ein Bild zu spät, und beides verschluckte den Sprung
ganz. Dazu kam ein zweiter Fehler mit demselben Ergebnis: Der Controller meldet
den frisch verlassenen Boden noch ein, zwei Bilder als betreten, und dort
löschte ein `min(v, 0)` die frische Sprunggeschwindigkeit wieder — aus 4,4 m/s
wurden fünf Zentimeter Hüpfer, und zwar mal so, mal so. Gemessen wird das jetzt
mit echtem Rapier bei fünf Bildraten (`physics/playerFooting.test.ts`).

**Wer einen Körper versetzt, zieht die Collider nach** (`syncColliders`).
Rapier tut das sonst als Erstes im nächsten Schritt, und abgefragt wird der
Collider, nicht der Körper: Wer den Spieler umsetzt und im selben Bild den
Character-Controller rechnen lässt, fragt sonst von der alten Stelle aus und
bekommt eine Bewegung zurück, die zu einem anderen Ort gehört — in der Brille
ein Spieler, der nach dem Portal fünf Zentimeter im Boden steht.

**Ein Körper wird höchstens einmal weggenommen** (`PhysicsWorld.remove`), und
das steht hier, weil der Preis so hoch ist: Ein zweites `removeRigidBody`
desselben Eintrags — oder eines aus einer Welt, die schon freigegeben ist —
beantwortet keine Frage, sondern reißt die wasm mit („recursive use of an
object", `RuntimeError: unreachable`), und das Spiel ist weg. Aufräumer gibt es
mehr als einen: der Bestand räumt seine NPCs weg, die Welt ihre Requisiten, ein
geworfenes Werkzeug ist beides. Also merkt sich jeder Eintrag, dass er weg ist
(`PhysicsBody.removed`), und die Welt merkt sich, dass sie freigegeben ist —
das zweite Mal passiert dann einfach nichts. Festgehalten hat das ein Test mit
**echter Engine**, denn anders geht es nicht: ohne die Sperre stürzt derselbe
Test mit genau dieser Meldung ab.

Der `App`-Loop ist bewusst schlank: Input → Locomotion → `world.update()` →
UI → Netzwerk → Render. Eine Welt darf über `world.render()` selbst rendern;
`PortalWorld` nutzt das für die Zusatzdurchgänge ihrer Portale.
