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
export {
  ALL_LAYERS,
  PANEL_LAYERS,
  MapView,
  type MapLayers,
  type MapViewOptions,
  type MapViewState,
  type MarkerPolicy,
} from './mapView';
export {
  SELF_RADIUS,
  emptyField,
  inCone,
  type ComputeVisibility,
  type LineOfSight,
  type LitRegion,
  type NoiseRadius,
  type VisibilityField,
  type VisibilityInput,
  type VisibilityMode,
  type VisionCone,
} from './visibility';
