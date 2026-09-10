import type { RoutineOutput } from '../monsterRoutine';
import type { StationGraph } from '../roomGraph';
import { VENT_REACH, type VentFlap, type VentNet } from './ventGraph';
import {
  VENT_ENTER_SECONDS,
  VENT_EXIT_SECONDS,
  VENT_MIN_RIDE,
  VENT_SPEED,
  type VentRider,
  type VentTravel,
} from './ventTravel';

/**
 * **Wie die KI die Schächte benutzt** — als Abkürzung, nicht als Trick.
 *
 * Die Routine (`monsterRoutine.ts`) sagt, **wohin** das Monster will; sie
 * weiß nichts von Schächten und soll es auch nicht (Balance, `BOUNDARIES.md`).
 * Dieser Lotse liest ihr Ziel und rechnet nach: Wenn eine Klappe im eigenen
 * Raum zu einer Klappe führt, von der aus das Ziel **deutlich** näher liegt
 * als zu Fuß — den Umweg zur Klappe, das Ein- und Aussteigen und die Fahrt
 * eingerechnet —, dann biegt es das Ziel auf die Klappe um und steigt ein,
 * sobald es davorsteht. Sonst lässt er die Entscheidung, wie sie ist.
 *
 * Zwischen zwei Fahrten liegt eine Pause (`interval`, aus `MONSTERS[].vent`
 * — der Schachtläufer fährt oft, der Wächter selten). Und ein Monster, das
 * gerade schreit oder eine Kabine aufreißt, fährt nicht.
 */
export class VentPilot {
  private plan: { flap: VentFlap; choice: number; goalKey: string } | null = null;
  private lastRide = -Infinity;
  /** Wie oft der Lotse eine Fahrt angefangen hat — für Tests und Anzeigen. */
  rides = 0;

  constructor(
    private readonly net: VentNet,
    private readonly ride: VentTravel,
    private readonly interval: number,
    /** Das Gehtempo, mit dem der Vergleich rechnet, in Metern je Sekunde. */
    private readonly walkSpeed: number,
    /** Ab so vielen Metern Ersparnis lohnt sich der Schacht. */
    private readonly margin = 6,
  ) {}

  /** Die Entscheidung der Routine, gegebenenfalls auf eine Klappe umgebogen. */
  steer(
    decision: RoutineOutput,
    monster: VentRider,
    time: number,
    graph: StationGraph,
  ): RoutineOutput {
    if (this.ride.busy) return decision;
    const goal = decision.goal;
    const eligible =
      goal &&
      decision.pace !== 'still' &&
      decision.mode !== 'announce' &&
      decision.mode !== 'breach' &&
      decision.mode !== 'savour';
    if (!eligible) {
      this.plan = null;
      return decision;
    }
    const goalSpace = graph.spaceAt(goal) || monster.space;
    const goalKey = `${goalSpace}`;
    if (this.plan && (this.plan.flap.roomId !== monster.space || this.plan.goalKey !== goalKey))
      this.plan = null;
    if (!this.plan) {
      if (time - this.lastRide < this.interval) return decision;
      this.plan = this.choose(monster, goalSpace, goalKey, graph);
      if (!this.plan) return decision;
    }
    const flap = this.plan.flap;
    const gap = Math.hypot(flap.approach.x - monster.x, flap.approach.z - monster.z);
    if (gap < VENT_REACH * 0.6) {
      const choice = this.plan.choice;
      this.plan = null;
      if (this.ride.enter(monster, choice)) {
        this.lastRide = time;
        this.rides++;
      }
      return { ...decision, goal: null, pace: 'still' };
    }
    return { ...decision, goal: flap.approach };
  }

  private choose(
    monster: VentRider,
    goalSpace: string,
    goalKey: string,
    graph: StationGraph,
  ): { flap: VentFlap; choice: number; goalKey: string } | null {
    const onFoot = graph.distance(monster.space, goalSpace);
    if (!Number.isFinite(onFoot)) return null;
    let best: { flap: VentFlap; choice: number; goalKey: string } | null = null;
    let bestSaving = this.margin;
    for (const flap of this.net.inRoom(monster.space)) {
      const targets = this.net.linked(flap.id);
      targets.forEach((target, choice) => {
        if (target.roomId === monster.space) return;
        const walkToFlap = Math.hypot(flap.approach.x - monster.x, flap.approach.z - monster.z);
        const ride = Math.max(VENT_MIN_RIDE, this.net.length(flap.id, target.id) / VENT_SPEED);
        const overhead = (VENT_ENTER_SECONDS + VENT_EXIT_SECONDS + ride) * this.walkSpeed;
        const afterwards = graph.distance(target.roomId, goalSpace);
        if (!Number.isFinite(afterwards)) return;
        const saving = onFoot - (walkToFlap + overhead + afterwards);
        if (saving > bestSaving) {
          bestSaving = saving;
          best = { flap, choice, goalKey };
        }
      });
    }
    return best;
  }

  /** Für eine neue Runde. */
  reset(): void {
    this.plan = null;
    this.lastRide = -Infinity;
    this.rides = 0;
  }
}
