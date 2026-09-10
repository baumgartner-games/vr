/**
 * **Navmesh / Pathfinding** — die eine Tür in dieses Paket (`BOUNDARIES.md`).
 *
 * Heute steckt hier die Glättung der Rasterwege aus `stationNavigation.ts`,
 * eine Abstandsprüfung über die Wände des `MapSnapshot` und der Navigator,
 * mit dem die 2D-Runde dieselben Rasterwege geht wie die 3D-Welt
 * (`flatNavigator.ts`). Was hier nicht exportiert ist, ist nicht Vertrag.
 */
export {
  LOOKAHEAD,
  SMOOTH_MARGIN,
  pathLength,
  pullString,
  totalTurn,
  type NavPoint,
  type PullOptions,
  type SegmentClear,
} from './pathSmoothing';
export { pointSegmentDistance, segmentDistance, snapshotSegmentClear } from './snapshotClearance';
export {
  FlatNavigator,
  GOAL_TOLERANCE,
  HOLD,
  OFF_ROUTE,
  PASSED,
  REACHED,
  lockedDoorsBetween,
  type FlatLeg,
} from './flatNavigator';
