# Der KayKit-Editor

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

**`kaykit-editor.html`** ist die vierte Seite neben Spiel, Werkzeugseite und
Eingabeseite (`vite.config.ts`, `rollupOptions.input`). Gewünscht (September
2026): _„einen sehr einfachen Editor für die KayKit-Elemente … alles von oben,
in der Mitte das Objekt, auf dem Boden die Prototype-Floors und die
Gitterlinien, die belegten Grid-Teile in rot … Slider für Größe und x/y …
alle Änderungen getrackt, sodass ich die finale Einstellung dir senden kann."_
Zu erreichen über _Menü → Steuerung & Hilfe → **KayKit-Editor**_ (öffnet in
einem neuen Tab, nur am Schirm — `App.helpLinks`) oder direkt unter
`/kaykit-editor.html`.

Anlass: Möbel der Raumstation sperren zu viele Zellen oder stehen so, dass ein
1 × 1-Ding mittig 2 × 2 Zellen nimmt.

## Was wo liegt

- `src/kaykitEditor/editorModel.ts` — die Rechnung ohne three.js, geprüft in
  `editorModel.test.ts`: die Liste der Stationselemente (dieselben Paare wie
  `stationProps.FIXTURE_MODELS`, dazu Spind, Frachtschrank, Konsole; der Test
  hält beide Listen gleich), Einstellung je Element (`scale`, `offsetX`,
  `offsetZ`, `yaw`), belegte Zellen, Protokoll und Ausgabe.
- `src/kaykitEditor/main.ts` — das Bild: Draufsicht (orthografisch, Norden
  oben), `Floor_Prototype` je Kachel (`PlateFloor`), Zell- und Kachellinien,
  rote Zellen, weißer Umriss des Modells, gelber Rahmen der heutigen
  Stellfläche des Spiels, die Spielfigur (`AvatarBody`) mit ihrem Kreis
  (0,35 m).

## Draufsicht und 3D

Oben rechts im Bild (und mit `V`) wird zwischen **Draufsicht** und **3D**
umgeschaltet; gemerkt wird die Wahl in `bgvr.kaykitEditor.view`. Gewünscht:
_„umschalten können zur 3D-Ansicht wie bei der Element-Details-Ansicht."_ Die
3D-Kamera ist die der Detailseite (`ui/PageDetail.ts`): perspektivisch, 32°,
sie kreist um die Mitte des Elements, und Wischen/Rad rechnen mit derselben
Lage (`ui/detailDrag.ts`: `detailDrag`, `detailZoom`, `DETAIL_POSE`). Gedreht
wird die Kamera, nicht das Element — Gitter, rote Zellen und Rahmen bleiben
liegen. In der Draufsicht verschiebt Ziehen die Ansicht. ⟲ setzt beide Kameras
zurück.

## Was gerechnet wird

- Das Modell wird **wie im Spiel** eingepasst (`stationProps.fitProp` in
  `FIXTURE_CATALOG` bzw. `LOCKER_SIZE`/`CARGO_SIZE` gestreckt); `scale` ist ein
  Faktor **darauf**, 1 heißt unverändert.
- Die Mitte steht auf einer **Kachelmitte** (`ANCHOR`) — also auf der Ecke von
  vier Zellen. Die Verschiebung zählt von dort, in Metern; die Knöpfe gehen in
  ½ und 1 Zelle (0,25 / 0,5 m), die Pfeiltasten in ¼ Kachel, mit Umschalt 5 cm.
- Rot ist jede Zelle, in die der Umriss des Modells mindestens 15 cm ragt —
  dieselbe Regel wie `stationCells.FIXTURE_OVERLAP` / `cellGrid.boxCells`.
- Gemerkt wird in `localStorage` (`bgvr.kaykitEditor`). Ziehbewegungen an
  einem Regler innerhalb von 1,5 s sind **ein** Protokolleintrag.

## Die Ausgabe

JSON mit `elements` (nur veränderte, auf Wunsch alle) und `log`. Je Element:
`scale`, `offsetX`, `offsetZ`, `yaw`, `gameFit` (heutige Stellfläche),
`model` (gemessene Maße mit dieser Einstellung), `cells` (belegte Zellen damit)
und `gameCells` (belegte Zellen der heutigen Stellfläche). Wer sie übernimmt,
ändert `FIXTURE_CATALOG` (Breite/Tiefe auf `model`) und den Sitz des Modells in
`stationProps` — der Editor selbst schreibt nichts ins Spiel.
