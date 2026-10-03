import { GridPlan } from '../grid/gridPlan';
import type { NavRect } from '../nav/navBuild';
import { LEVELS } from './layout';

/**
 * **Die leere Sandbox** — eine Fläche aus Prototyp-Platten und sonst nichts.
 *
 * Bis Oktober 2026 standen hier neun Zonen auf einem Gelände von 77 × 105
 * Kacheln: Küche, Türen, Effekte, Podest, Navigation, Schießstand, Kartbahn,
 * Kletterwand, Portaltafeln. Gewünscht war dann: _„Ich will aber eine leere
 * Sandbox welt behalten, in der ich etwas aufbauen und testen kann."_
 * Rennstrecke, Kletterwand, Schießstand und Effekte haben seitdem je eine
 * eigene Welt im Ordner _Test_ (`zoneWorlds.ts`); der Rest ist gelöscht und
 * steht in der Geschichte des Repositorys.
 *
 * **Die Fläche ist ganz begehbar**: jede Kachel ein Laufweg, damit der
 * Möbelkatalog überall hinstellen kann (`FurnishedWorld.onGround`) und der
 * Baukasten nicht erst Boden legen muss. Draußen liegt die Schürze, die mit
 * der Figur wandert (`SandboxWorld.followPlates`).
 */

/** Die Fläche in Kacheln, um die Null herum. */
export const SANDBOX_FIELD: NavRect = { x: -20, z: -20, w: 40, d: 40 };

/** Wo man ankommt: die Mitte der Fläche. */
export const SANDBOX_SPAWN = { x: 0, z: 0 } as const;

export function sandboxPlan(): GridPlan {
  const plan = new GridPlan(LEVELS);
  // Eine Masse unter allem, auf null — portalfähig, wie der Boden des alten
  // Geländes: eine Fläche je Welt, denn Kollisionsgruppen für Portale gibt es
  // nur zehn (`PhysicsWorld.ts`).
  plan.mass('floor', SANDBOX_FIELD, -0.5, 0, { portal: true });
  plan.floor(SANDBOX_FIELD);
  return plan;
}
