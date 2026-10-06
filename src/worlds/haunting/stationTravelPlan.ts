import type { GridPlan } from '../grid/gridPlan';
import type { NavGraph } from '../nav/navGraph';
import { doorEdges, leafDoors, type HouseSpec } from './house';
import { housePlan } from './plan';

/**
 * Navigation plans through functional automatic doors before their sensor opens
 * the physical leaf. Otherwise a partial path stops at the nearest wall instead
 * of approaching a doorway. Logical locks still block every route.
 */
export class StationTravelPlan {
  private spec: HouseSpec | null = null;
  private plan: GridPlan | null = null;
  private locks = '';

  clear(): void {
    this.spec = null;
    this.plan = null;
    this.locks = '';
  }

  graph(
    spec: HouseSpec,
    locked: readonly string[],
    occupiedOpen: readonly string[] = [],
  ): NavGraph {
    // An occupied threshold holds its leaf open even after a logical lock.
    // Keep that escape edge until the proximity system can physically close it.
    locked = locked.filter((id) => !occupiedOpen.includes(id));
    const stamp = locked.join('|');
    if (this.spec !== spec || !this.plan) {
      this.spec = spec;
      this.locks = stamp;
      this.plan = housePlan(spec, new Set(locked));
    } else if (this.locks !== stamp) {
      const shut = new Set(locked);
      // Offene Durchgänge haben kein Blatt und bleiben, wie `housePlan` sie legt.
      for (const door of leafDoors(spec))
        for (const edge of doorEdges(door))
          this.plan.door(edge.x, edge.z, edge.dir, 0, !shut.has(door.id));
      this.locks = stamp;
    }
    return this.plan.graph;
  }
}
