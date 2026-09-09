import type { GridPlan } from '../grid/gridPlan';
import type { NavGraph } from '../nav/navGraph';
import type { HouseSpec } from './house';
import { housePlan } from './plan';
import { TRAINING_DOOR } from './trainingLayout';

/**
 * Navigation plans through functional automatic doors before their sensor opens
 * the physical leaf. Otherwise a partial path stops at the nearest wall instead
 * of approaching a doorway. Logical locks still block every route.
 */
export class StationTravelPlan {
  private spec: HouseSpec | null = null;
  private plan: GridPlan | null = null;
  private testing = false;
  private locks = '';

  clear(): void {
    this.spec = null;
    this.plan = null;
    this.testing = false;
    this.locks = '';
  }

  graph(
    spec: HouseSpec,
    locked: readonly string[],
    test: boolean,
    occupiedOpen: readonly string[] = [],
  ): NavGraph {
    // An occupied threshold holds its leaf open even after a logical lock.
    // Keep that escape edge until the proximity system can physically close it.
    locked = locked.filter((id) => !occupiedOpen.includes(id));
    const stamp = locked.join('|');
    if (this.spec !== spec || this.testing !== test || !this.plan) {
      this.spec = spec;
      this.testing = test;
      this.locks = stamp;
      this.plan = housePlan(spec, new Set(locked), test);
    } else if (this.locks !== stamp) {
      const shut = new Set(locked);
      for (const door of test ? [...spec.doors, TRAINING_DOOR] : spec.doors)
        this.plan.door(door.x, door.z, door.dir, 0, !shut.has(door.id));
      this.locks = stamp;
    }
    return this.plan.graph;
  }
}
