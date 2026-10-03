import type { NavRect } from '../nav/navBuild';
import { TILE } from '../nav/navTile';
import { PLATE_FACE, PLATE_SEAM } from '../shared/plateField';

/**
 * **Wo die Zonen liegen** — nichts als Zahlen.
 *
 * Bis Oktober 2026 standen hier die Rechtecke von neun Zonen auf dem Gelände
 * der Sandbox. Geblieben sind die vier, die eine eigene Testwelt bekommen
 * haben (`zoneWorlds.ts`), und die Navigation, aus der die Test Navigation
 * ihre Bausteine nimmt (`zones/navigation.ts`). **Die Zahlen sind die alten
 * Kacheln des Geländes**: Jede Zone rechnet damit, und jede Welt legt ihren
 * Boden dorthin, wo ihre Zone steht.
 *
 * Eine eigene Datei, und der Grund ist ein **Kreis**: Die Grundrisse rufen die
 * Zonen auf, und jede Zone will wissen, wo ihr Rechteck liegt. Also liegen die
 * Zahlen hier, ganz unten, und importieren selbst nur, was selbst nichts
 * importiert.
 */

/**
 * **Die Etagen**: Erdgeschoss und ein Obergeschoss auf 2,80 m — dieselbe Zahl,
 * mit der eine Wand gebaut wird (`PLAN_WALL_H`).
 */
export const STOREY = 2.8;
export const LEVELS: readonly number[] = [0, STOREY];

/**
 * **Die Farben des Bodens draußen** — die der Platte, Bildpunkt für Bildpunkt
 * an ihrem Atlas gemessen (`shared/plateField.PLATE_FACE`, `PLATE_SEAM`).
 *
 * Die Leinwand hinter den Platten hat genau eine Aufgabe: **weitergehen**.
 * `ground` ist die Deckfläche, `line` die umlaufende Fase, und `checker` ist
 * dasselbe wie `ground` — ein Schachbrett draußen neben lauter gleichen
 * Platten wäre genau die Kante, die keiner sehen soll („das dunklere brauche
 * ich nicht, da die alle einen weißen rand haben, das reicht").
 */
export const HORIZON_COLORS = {
  ground: PLATE_FACE,
  checker: PLATE_FACE,
  line: PLATE_SEAM,
} as const;

/** Die Effektquellen (`zones/effects.ts`, Test Effekte). */
export const EFFECTS: NavRect = { x: -6, z: -16, w: 13, d: 7 };
/** Die Navigation (`zones/navigation.ts`) — ihre Bausteine nutzt die Test Navigation. */
export const NAVIGATION: NavRect = { x: -24, z: -3, w: 17, d: 7 };
/** Der Schießstand (`zones/range.ts`, Test Schießstand) — geschossen wird nach Osten. */
export const RANGE: NavRect = { x: 6, z: -3, w: 6, d: 7 };
/**
 * Die Kletterzone (`zones/climb.ts`, Test Kletterwand) — **ohne** die
 * Kachelreihe, auf der ihre Wand steht: Eine acht Meter hohe Masse auf einer
 * begehbaren Kachel wäre ein Weg im Graphen, den man nicht gehen kann. Die
 * Wandreihe liegt nördlich dieses Rechtecks.
 */
export const CLIMB: NavRect = { x: 24, z: 9, w: 10, d: 9 };

/** Die Mitte einer Kachel in Weltmetern — Zonen rechnen damit ihre Requisiten aus. */
export function centre(tile: number): number {
  return (tile + 0.5) * TILE;
}
