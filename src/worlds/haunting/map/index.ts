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
  type MapItem,
  type MapItemKind,
  type MapLight,
  type MapPoint,
  type MapRoom,
  type MapSegment,
  type MapSnapshot,
} from './mapSnapshot';
export type { MapSource, ExtractMapSnapshot } from './mapSource';
export { extractMapSnapshot, wallsOf, roomsOf, boundsOf, LAMP_RADIUS } from './extract';
export { worldMapSource, type WorldHandles } from './worldSource';
export {
  ALL_LAYERS,
  PANEL_LAYERS,
  MapView,
  type MapLayers,
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
