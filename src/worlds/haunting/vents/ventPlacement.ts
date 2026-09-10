import { PLAN_WALL_T } from '../../editor/levelPlan';
import { dirX, dirZ, TILE } from '../../nav/navTile';
import type { VentFlapData } from './ventNet.data';

/**
 * **Wo eine Klappe aus den Daten in Metern sitzt** — ohne den Graphen.
 *
 * Drei Rechnungen, die zwei Stellen brauchen: `ventGraph.ts` baut daraus die
 * Klappen, und `stationLayout.ts` hält den Platz davor frei, damit kein
 * Regal vor einer Klappe steht. Das Layout darf den Graphen aber nicht
 * importieren: Der zieht `map/geometry.ts` nach, das `roomGraph.ts`, das
 * wieder das Layout — ein Kreis, in dem `WALL_T` beim Laden noch nicht da
 * wäre. Deshalb liegen die Maße hier, mit nichts als dem Raster darunter.
 */
export interface VentSpot {
  x: number;
  z: number;
}

/** Wie weit die Klappe vor der Wandlinie liegt und wie weit der Standplatz davor. */
export const FLAP_INSET = PLAN_WALL_T / 2 + 0.08;
export const APPROACH_DEPTH = 0.85;
/** Das Maß der Klappe selbst — für das Modell und den Freiraum davor. */
export const FLAP_WIDTH = 0.9;
export const FLAP_HEIGHT = 0.55;

/** Der Punkt auf der Wandlinie, wie bei einer Tür (`map/geometry.doorCentre`). */
export function flapWall(flap: Pick<VentFlapData, 'x' | 'z' | 'dir'>): VentSpot {
  return {
    x: (flap.x + 0.5 + dirX(flap.dir) * 0.5) * TILE,
    z: (flap.z + 0.5 + dirZ(flap.dir) * 0.5) * TILE,
  };
}

/** Wo man davorsteht, um sie zu benutzen — ein Stück in den Raum hinein. */
export function flapApproach(flap: Pick<VentFlapData, 'x' | 'z' | 'dir'>): VentSpot {
  const wall = flapWall(flap);
  return {
    x: wall.x - dirX(flap.dir) * APPROACH_DEPTH,
    z: wall.z - dirZ(flap.dir) * APPROACH_DEPTH,
  };
}
