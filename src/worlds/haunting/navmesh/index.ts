/**
 * **Navmesh / Pathfinding** — die eine Tür in dieses Paket (`BOUNDARIES.md`).
 *
 * Heute steckt hier die Glättung der Rasterwege aus `stationNavigation.ts`
 * und eine Abstandsprüfung über die Wände des `MapSnapshot`. Was hier nicht
 * exportiert ist, ist nicht Vertrag.
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
