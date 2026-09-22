/**
 * **Die Rechnung hinter dem roten Knopf** — wie hoch sein Sockel wird, wie
 * groß sein Kopf und auf welcher Höhe die beiden aufeinandertreffen.
 *
 * Eine eigene Datei aus demselben Grund wie `core/kaykitFit.ts` und
 * `core/kaykitHeight.ts` daneben: Der Knopf selbst (`redButton.ts`) baut eine
 * Tafel aus einer Leinwand (`ui/TextPlane`), und eine Leinwand gibt es in Jest
 * nicht — `testEnvironment: 'node'`, kein `document`. Wer die Maße eines
 * Knopfes nachrechnen will, dürfte ihn also gar nicht erst bauen. Hier steht
 * deshalb alles, was **nur** Zahlen sind; drüben steht, was daraus ein Netz
 * macht.
 *
 * ## Warum der Kopf aus dem Regal kommt und die Maße trotzdem bleiben
 *
 * Seit der Knopf aus zwei gekauften Modellen besteht — `dungeon/column.glb`
 * als Sockel, `board-game-bits/pawn_B_red.glb` als Kopf —, gibt es zwei
 * Auskünfte über seine Größe: die **gerechnete** und die **gemessene**. Die
 * gemessene gehört den Dateien und ändert sich mit dem nächsten Paket-Update;
 * die gerechnete gehört dem Spiel und darf sich nicht ändern, denn an ihr
 * hängt, was man treffen kann (`BUTTON_DOME_R`, siehe unten). Ein Modell
 * ersetzt das Bild und nie die Rechnung: Die Zahlen hier bleiben also, was sie
 * waren, und die Modelle werden **in** sie hineingerechnet
 * (`core/kaykitHeight.kaykitHeightScale`) statt umgekehrt.
 */

/**
 * **Halbmesser der Kuppel.**
 *
 * Wird mit ausgeliefert, weil eine Welt, die ihr einen **Kollisionskörper**
 * gibt, ihn genau so groß machen will wie das, was man sieht (Portal-Regel:
 * was man drücken kann, kann man auch treffen). An sechs Stellen ist diese
 * Zahl zugleich Zeigerziel und Trefferkörper — `zones/navigation.ts` schickt
 * mit ihr den NPC los, `zones/kitchen.ts` baut mit ihr dreimal einen Knopf und
 * einmal den Umbauschalter.
 *
 * **Sie hat den Umbau auf die Regalmodelle unverändert überlebt**, und das ist
 * der Kern der Sache: Der sichtbare Kopf ist seither eine Spielfigur und keine
 * Halbkugel mehr, aber angemeldet, gezielt und getroffen wird weiter derselbe
 * Körper an derselben Stelle. Wer die Zahl anfasst, verschiebt sechs
 * Trefferkörper auf einmal.
 */
export const BUTTON_DOME_R = 0.17;

/** Höhe der Säule: der Knopf liegt damit auf Hüfthöhe. */
export const BUTTON_PEDESTAL_H = 0.95;

/**
 * **Wo die Kuppel in Ruhe liegt** — sechs Zentimeter über der Säule, auf dem
 * Teller, in dem der Kragen sitzt.
 *
 * Diese Höhe ist ein Vertrag nach außen, auch wenn sie nicht exportiert
 * aussieht: Der Knopf der Gitterwelt merkt sie sich beim Bauen
 * (`grid/fixtures/button.ts`, `rest: button.dome.position.y`) und schreibt in
 * jedem Bild `rest - DEPTH * …` zurück. Wer die Kuppel später versetzte, hätte
 * einen Knopf, den eine fremde Uhr sofort wieder an die alte Stelle zerrt.
 * Deshalb wandert beim Modellwechsel **der Kopf um die Kuppel herum** und nie
 * die Kuppel.
 */
export const BUTTON_REST_Y = BUTTON_PEDESTAL_H + 0.06;

/**
 * **Wie hoch der Kopf wird** — so hoch, wie die Kuppel breit war.
 *
 * Das ist die eine Zahl, die der Umbau neu entscheiden musste, und sie ist
 * **abgeleitet** und nicht erfunden: Die Halbkugel maß 0,34 m in der Breite
 * und 0,17 m in der Höhe; die Spielfigur bekommt genau diese Breite als ihre
 * **Höhe** und wird damit zu dem Würfel, in dem die Kuppel saß. Ihre eigene
 * Breite fällt dabei ab (`pawn_B_red.glb` ist schlanker als hoch) und liegt
 * mit gut 0,21 m **unter** dem Trefferhalbmesser — der Knopf bleibt also
 * großzügig zu treffen und ist nie knapper, als er aussieht.
 *
 * Die naheliegende Alternative war, der Figur die Breite der Kuppel zu geben;
 * sie wäre damit 0,55 m hoch geworden und hätte oben ins Schild gestanden
 * (`redButton.ts`, `PEDESTAL_H + 0.62`).
 */
export const BUTTON_HEAD_H = 2 * BUTTON_DOME_R;

/** Wie der Knopf gestapelt wird, in Metern über dem Fuß seiner Gruppe. */
export interface ButtonStack {
  /** Die Höhe des Kopfes — die Zielhöhe für das Modell. */
  head: number;
  /** Wo sein Fuß aufsitzt. */
  foot: number;
  /** Und derselbe Ort, von der Kuppel aus gesehen: ihr Kind hängt dort. */
  lift: number;
  /** Wo der Knopf ganz oben aufhört — die Höhe, die eine Hand sucht. */
  top: number;
}

/**
 * **Sockel und Kopf aufeinanderstellen.**
 *
 * `carry` ist die Höhe, auf der der Sockel wirklich **trägt**, am geladenen
 * Netz gemessen (`redButton.ts`, `carryHeight`) — und nicht seine Oberkante.
 * Der Unterschied ist bei `dungeon/column.glb` keine Spitzfindigkeit: Die
 * Säule läuft oben in eine kleine Pyramide aus, und wer den Kopf auf ihre
 * Oberkante stellte, stellte ihn auf eine Spitze, unter deren Rand eine
 * Handbreit Luft bliebe. Gemessen trägt sie dort, wo sie unter dem Rand des
 * Fußes noch Stein hat; der Rest der Pyramide verschwindet im Fuß der Figur.
 *
 * **Zwei Schranken, und beide sind Notausgänge für ein anderes Modell**, nicht
 * für dieses: Höher als die Oberkante der gerechneten Säule darf der Kopf
 * nicht klettern, sonst schwebt er; und tiefer als die halbe Kuppel darf er
 * nicht einsinken, sonst steckt er im Sockel. Kommt gar keine Messung an
 * (`NaN`, weil das Netz leer war), gilt die gerechnete Säulenhöhe — dieselbe
 * Antwort, die der Knopf vor dem Umbau gegeben hätte.
 */
export function redButtonStack(carry: number): ButtonStack {
  const deepest = BUTTON_PEDESTAL_H - BUTTON_DOME_R;
  const foot = Number.isFinite(carry)
    ? Math.min(BUTTON_PEDESTAL_H, Math.max(deepest, carry))
    : BUTTON_PEDESTAL_H;
  return {
    head: BUTTON_HEAD_H,
    foot,
    lift: foot - BUTTON_REST_Y,
    top: foot + BUTTON_HEAD_H,
  };
}
