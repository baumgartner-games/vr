import type { NavGraph } from '../nav/navGraph';
import type { NpcNavigationInput } from '../npc/Npc';
import type { Point } from '../npc/npcBrain';
import type { DroneRoute } from './droneRoute';
import type { HouseSpec } from './house';
import { stationRoute } from './stationNavigation';

/**
 * Per-monster route cursor. Shared geometry/search storage lives in stationRoute.
 *
 * `comfort` is the extra clearance added to the body radius when routing: the
 * physical capsule in 3D gets a tenth of a metre; the 2D world, whose
 * `walkable` already insets rooms by its own radius, passes a smaller one.
 */
export class StationNpcNavigator {
  private route: DroneRoute | null = null;
  private cursor = 0;
  private timer = 0;
  private version = -1;
  private goalX = Infinity;
  private goalZ = Infinity;
  private lastX = Infinity;
  private lastZ = Infinity;
  private previousGraph: NavGraph | null = null;
  private previousSpec: HouseSpec | null = null;

  constructor(
    private readonly spec: () => HouseSpec,
    private readonly graph: () => NavGraph | null,
    private readonly comfort = 0.1,
  ) {}

  get navigation() {
    return {
      at: { x: this.lastX, z: this.lastZ },
      points: this.route?.points?.slice(this.cursor) ?? [],
      goal: Number.isFinite(this.goalX) ? { x: this.goalX, z: this.goalZ } : null,
    };
  }

  step(input: NpcNavigationInput): Point | null {
    const graph = this.graph();
    const spec = this.spec();
    if (!graph) return null;
    this.timer -= Math.max(0, input.dt);
    const moved = Math.hypot(input.at.x - this.lastX, input.at.z - this.lastZ);
    const goalMoved = Math.hypot(input.target.x - this.goalX, input.target.z - this.goalZ);
    if (
      !this.route ||
      this.timer <= 0 ||
      graph !== this.previousGraph ||
      spec !== this.previousSpec ||
      graph.version !== this.version ||
      moved > 1.5 ||
      goalMoved > 0.75
    ) {
      this.route = stationRoute(
        spec,
        graph,
        { x: input.at.x, z: input.at.z, yaw: 0 },
        { x: input.target.x, z: input.target.z },
        input.radius + this.comfort,
      );
      // A door/body contact can push the capsule into our optional comfort margin.
      // Recover with its real radius, never with a path through solid geometry.
      if (!this.route.grounded)
        this.route = stationRoute(
          spec,
          graph,
          { x: input.at.x, z: input.at.z, yaw: 0 },
          { x: input.target.x, z: input.target.z },
          input.radius + 0.01,
        );
      this.cursor = 0;
      this.timer = 0.55;
      this.version = graph.version;
      this.goalX = input.target.x;
      this.goalZ = input.target.z;
      this.previousGraph = graph;
      this.previousSpec = spec;
    }
    this.lastX = input.at.x;
    this.lastZ = input.at.z;
    const points = this.route.points!;
    while (this.cursor < points.length) {
      const point = points[this.cursor]!;
      if (Math.hypot(point.x - input.at.x, point.z - input.at.z) > 0.035) return point;
      this.cursor++;
    }
    // A blocked path ends here. Never let the generic brain fall back to an
    // unverified straight line through a cabinet or a newly closed door.
    return null;
  }
}
