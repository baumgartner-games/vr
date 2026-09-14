/**
 * **Die flache Welt** — jede Welt von oben, auf einem Raster.
 *
 * Das Paket ist die Grundlage, die der Besitzer wollte: eine 2D-Welt aus
 * Kacheln, auf der Wege und Kollision sauber zu rechnen sind, und die
 * 3D-Welt als Bild davon. Es kennt keinen three.js-Scene-Graph — nur den
 * Kachelgraphen (`nav/navGraph.ts`), den jede Welt ohnehin hat, und das DOM
 * für Karte und Stock.
 *
 * - `flatFloor.ts` — das Bodenmodell: begehbar, gleiten, Höhe, Etagen.
 * - `flatFigure.ts` — die Figur und ihr Schritt am Stock.
 * - `flatSnapshot.ts` — das Bild einer Welt, Etage für Etage.
 * - `levelMap.ts` — die Ebenen-Karte, untere Etagen verschwommen.
 * - `flatWorldMode.ts` — der Bildschirm, auf dem man die Welt begeht.
 * - `kernelLocomotion.ts` — der Stock geht in den Kern, nicht in die Physik.
 * - `joystick.ts` — der Stock unter dem Daumen.
 */
export {
  FloorModel,
  STEP_LIMIT,
  WALL_HALF,
  edgeOf,
  rampProgress,
  type FloorBox,
  type FloorOptions,
  type FloorPoint,
  type FloorRamp,
} from './flatFloor';
export {
  FIGURE_CROUCH,
  FIGURE_RADIUS,
  FIGURE_SPRINT,
  FIGURE_STEP,
  FIGURE_WALK,
  IDLE_INPUT,
  freshFigure,
  stepFigure,
  type FlatFigure,
  type FlatInput,
} from './flatFigure';
export {
  snapshotOf,
  type FlatBounds,
  type FlatBox,
  type FlatEntity,
  type FlatEntityKind,
  type FlatLevel,
  type FlatLink,
  type FlatPoint,
  type FlatSnapshot,
  type FlatTile,
  type FlatWall,
  type SnapshotOptions,
} from './flatSnapshot';
export {
  BLUR_PER_LEVEL,
  FADE_PER_LEVEL,
  LEVELS_SEEN_BELOW,
  LevelMap,
  type LevelMapOptions,
} from './levelMap';
export { FlatWorldMode, USE_REACH, type FlatWorldHost } from './flatWorldMode';
export { KernelLocomotion } from './kernelLocomotion';
export { GridDriver } from './gridDriver';
export { TERRAIN_STEP, terrainGraph, type Terrain } from './terrainGraph';
export {
  IDLE,
  Joystick,
  SPRINT_RING,
  STICK_DEADZONE,
  STICK_RADIUS,
  stickValue,
  type StickValue,
} from './joystick';
