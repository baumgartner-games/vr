import { movesStructure, type GameMode } from './gameMode';

/**
 * **Die Abrissbombe des Krans** — die Regeln, ohne three.js.
 *
 * Gewünscht war: _„mit einem Rechtsklick soll im Baukasten-Modus eine Bombe
 * geholt werden in die Hand, mit der Sachen abgerissen werden können. Dann
 * sind die Elemente, welche abgerissen werden sollen, als Ghost markiert."_
 *
 * - **Nur im _Baukasten_ und nur als Kran** (`bombAllowed`). Abreißen ist
 *   Umbauen, und umgebaut wird im _Baukasten_ (`gameMode.movesStructure`);
 *   beim _Einrichten_ wird eingerichtet, nicht abgerissen.
 * - **Und nur mit leeren Klauen.** Wer eine Wand trägt und rechts klickt,
 *   will sie nicht gegen eine Bombe tauschen — die Wand fiele an Ort und
 *   Stelle.
 * - **Was darunter liegt, wird zum Geist** (`PortalWorld.updateBomb`): rot
 *   und durchscheinend, genau das eine Ding, das der nächste Klick abreißt.
 *   Rechtsklick noch einmal legt die Bombe wieder weg.
 */
export function bombAllowed(mode: GameMode, crane: boolean, carrying: boolean): boolean {
  return crane && movesStructure(mode) && !carrying;
}

/** Die Datei aus dem Regal, die als Bombe am Haken hängt. */
export const BOMB_MODEL = 'platformer/neutral/bomb.glb';

/** Die Farbe des Geistes — was gleich abgerissen wird. */
export const BOMB_GHOST_COLOR = 0xff4a3d;

/** Wie durchscheinend der Geist ist. */
export const BOMB_GHOST_OPACITY = 0.45;
