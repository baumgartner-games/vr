/**
 * **Navmesh / Pathfinding** — die eine Tür in dieses Paket (`BOUNDARIES.md`).
 *
 * Heute steckt hier die Glättung der Rasterwege aus `stationNavigation.ts`,
 * eine Abstandsprüfung über die Wände des `MapSnapshot`, der Navigator,
 * mit dem die 2D-Runde dieselben Rasterwege geht wie die 3D-Welt
 * (`flatNavigator.ts`), und die Bahn selbst (`route.ts`, früher
 * `droneRoute.ts`). Was hier nicht exportiert ist, ist nicht Vertrag.
 */
export {
  ROUTE_SPEED,
  ROUTE_TURN,
  routeLength,
  shortestTurn,
  stepAlong,
  turnTowards,
  wrapAngle,
  type RoutePath,
  type RoutePose,
} from './route';
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
