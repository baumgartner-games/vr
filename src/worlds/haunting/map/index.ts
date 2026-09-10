/**
 * **2D-Kern + Sichtbarkeit** — die eine Tür in dieses Paket.
 *
 * Andere Pakete importieren von hier und nicht aus den Einzeldateien; was
 * hier nicht exportiert ist, ist nicht Vertrag (`BOUNDARIES.md`).
 */
export {
  emptySnapshot,
  headingOf,
  pointInPolygon,
  roomAtPoint,
  type MapBounds,
  type MapDoor,
  type MapEntity,
  type MapEntityKind,
  type MapFixture,
  type MapItem,
  type MapItemKind,
  type MapLight,
  type MapNoise,
  type MapNoiseCause,
  type MapPoint,
  type MapRoom,
  type MapRound,
  type MapSegment,
  type MapSnapshot,
} from './mapSnapshot';
export type { MapSource, ExtractMapSnapshot } from './mapSource';
export { extractMapSnapshot, wallsOf, roomsOf, boundsOf, fixturesOf, LAMP_RADIUS } from './extract';
export { worldMapSource, type WorldHandles } from './worldSource';
export {
  ALL_LAYERS,
  PANEL_LAYERS,
  MapView,
  WAVE_SPEED,
  type MapGoal,
  type MapHighlight,
  type MapLayers,
  type MapOverlay,
  type MapRoute,
  type MapViewOptions,
  type MapViewState,
  type MarkerPolicy,
} from './mapView';
export {
  SELF_RADIUS,
  NOISE_SPRINT,
  NOISE_WALK,
  LitCache,
  computeVisibility,
  emptyField,
  inCone,
  lineOfSight,
  litAt,
  litPolygon,
  type ComputeVisibility,
  type LineOfSight,
  type LitRegion,
  type NoiseRadius,
  type VisibilityField,
  type VisibilityInput,
  type VisibilityMode,
  type VisionCone,
} from './visibility';
export {
  wallSegments,
  rectPolygon,
  doorCentre,
  doorAxis,
  doorPath,
  nextThroughDoor,
  walkable,
  slide,
  spaceAtMetres,
  DOOR_WIDTH,
  WALL_T,
} from './geometry';
export {
  FlatRound,
  PLAYER_ID,
  MONSTER_ID,
  TOOL_LABELS,
  type FlatAction,
  type FlatEvent,
  type FlatInput,
  type FlatOptions,
} from './flatRound';
export { FlatWalker } from './flatWalk';
export { FlatMode, type FlatModeHost } from './flatMode';
export { applyPuzzle, type PuzzleAction } from './flatPuzzles';
export {
  NOISE_TILE,
  spreadNoise,
  tileGrid,
  tileKeyOf,
  type SpreadOptions,
  type TileGrid,
  type TileLink,
} from './noiseSpread';
// **`toolIcons.ts` steht mit Absicht nicht hier.** Es ist die einzige Datei
// des Pakets, die three.js braucht, und `HauntingWorld` lädt sie dynamisch
// neben `flatMode` (`import('./map/toolIcons')`). Stünde sie in dieser Tür,
// zöge jeder Wert-Import aus `map/` den Renderer mit herein — und die 2D-Welt
// ist genau deshalb headless prüfbar, weil sie das nicht tut. Nur der Vertrag,
// den die Ansicht dafür braucht, gehört hierher:
export type { ToolIconSource } from './toolIcons';
