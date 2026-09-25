import type { LabWall } from './wallLab';

/**
 * **Die Wände der Küche, aus dem Regal** — vom Besitzer selbst gebaut und als
 * Weltänderungen geschickt (_„bitte einarbeiten"_), seit die Testwelt keine
 * Planwände mehr hat (`testPlan.clearPlanWalls`).
 *
 * Übernommen, wie sie kamen, mit drei Bereinigungen, die das Ersetzen
 * (`PortalWorld.replaceWalls`) sonst beim Einfügen selbst machen würde:
 *
 * - Wo zwei Wände sich um eine Kachel überlappten (Westwand bei z = −30,
 *   Ostwand bei z = −21), steht am Ende eine halbe.
 * - Die Fenster bei x = 15 und 17 ersetzen die Wände an derselben Stelle.
 * - Das Fenster bei x = 24 stand über zwei Wänden (22…24 und 24…26); jetzt
 *   stehen links und rechts davon halbe.
 *
 * Nach Süden ist die Küche offen, mit zwei Durchgängen.
 */
const WALL = 'restaurant-bits/wall.glb';
const HALF = 'restaurant-bits/wall_half.glb';
const DOOR = 'restaurant-bits/wall_doorway.glb';
const WINDOW = 'restaurant-bits/wall_window_closed_curtains_green.glb';
const Y = 1.49;
const deg = (d: number): number => (d * Math.PI) / 180;

const PIECES: ReadonlyArray<[string, number, number, number]> = [
  // Westwand auf der Fuge x = 12.
  [WALL, 12, -21, -90],
  [WALL, 12, -23, -90],
  [WALL, 12, -25, -90],
  [WALL, 12, -27, -90],
  [WALL, 12, -29, -90],
  [HALF, 12, -30.5, -90],
  // Nordwand auf der Fuge z = −31.
  [WALL, 13, -31, 180],
  [WINDOW, 15, -31, 180],
  [WINDOW, 17, -31, 180],
  [WALL, 19, -31, 180],
  [WALL, 21, -31, 180],
  [HALF, 22.5, -31, 180],
  [WINDOW, 24, -31, 180],
  [HALF, 25.5, -31, 180],
  [WALL, 27, -31, 180],
  [WALL, 29, -31, 180],
  [WALL, 31, -31, 180],
  // Ostwand auf der Fuge x = 32.
  [WALL, 32, -30, 90],
  [WALL, 32, -28, 90],
  [WALL, 32, -26, 90],
  [WALL, 32, -24, -90],
  [WALL, 32, -22, -90],
  [HALF, 32, -20.5, -90],
  // Zwei Durchgänge nach Süden.
  [DOOR, 31, -20, 0],
  [DOOR, 15, -20, 0],
  // Die Ecke im Nordosten, mit Schrägen.
  [HALF, 27.5, -30.5, 135],
  [HALF, 28.5, -29.5, 135],
  [HALF, 29.5, -29.5, 45],
  [HALF, 30.5, -30, 0],
  [HALF, 31, -29.5, -90],
  [HALF, 31, -28.5, -90],
];

export function kitchenWallModels(): LabWall[] {
  return PIECES.map(([path, x, z, yaw]) => ({ path, x, y: Y, z, yaw: deg(yaw) }));
}
