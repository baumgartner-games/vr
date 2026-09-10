import { COMMAND } from '../roomGraph';
import type { FloorPoint } from '../stationLayout';
import { FlatNavigator } from '../navmesh';
import type { RouteAvoid } from '../stationNavigation';
import { PLAYER_RADIUS, type FlatInput, type FlatRound } from './flatRound';

/**
 * **Wie ein Mensch mit der Karte läuft**: auf demselben Rasterweg, den auch
 * das Monster und der Techniker der 3D-Welt gehen (`navmesh/flatNavigator.ts`
 * über `stationNavigation.ts`), Wegpunkt für Wegpunkt; wer an einer Wand
 * hängen bleibt, rechnet neu und geht kurz zur Raummitte zurück. Ein Stock,
 * der weiß, wo der nächste Wegpunkt ist. Die Tests spielen damit ganze
 * Runden; die Bot-Vorschau der 2D-Welt darf es auch benutzen.
 */
export class FlatWalker {
  private readonly navigator: FlatNavigator;
  private stall = { x: NaN, z: NaN, since: 0 };
  private detour = -1;
  private time = 0;

  constructor(private readonly round: FlatRound) {
    this.navigator = new FlatNavigator(round.house, round.graph, PLAYER_RADIUS);
  }

  /**
   * Der Stock für diesen Schritt, oder `null`, wenn angekommen. `avoid` macht
   * eine Stelle teuer, ohne sie zu sperren — damit geht der Techniker um das
   * Monster herum statt an ihm vorbei (`stationNavigation.ts`).
   */
  input(
    goal: FloorPoint,
    dt: number,
    sprint = false,
    avoid: RouteAvoid | null = null,
  ): FlatInput | null {
    const round = this.round;
    const graph = round.graph;
    this.time += dt;
    const goalSpace = graph.spaceAt(goal) || COMMAND;
    const here = round.player.space;
    let step: FloorPoint = goal;
    if (
      Number.isNaN(this.stall.x) ||
      Math.hypot(round.player.x - this.stall.x, round.player.z - this.stall.z) > 0.05
    )
      this.stall = { x: round.player.x, z: round.player.z, since: this.time };
    else if (this.time - this.stall.since > 0.6 && this.time > this.detour) {
      this.detour = this.time + 1.2;
      this.stall.since = this.time;
      this.navigator.invalidate();
    }
    if (here === goalSpace && Math.hypot(goal.x - round.player.x, goal.z - round.player.z) < 0.6)
      return null;
    if (this.time < this.detour) step = graph.centre(here);
    else {
      this.navigator.aim(round.player, goal, round.haunt.shut, this.time, avoid);
      step = this.navigator.next(round.player) ?? goal;
    }
    const dx = step.x - round.player.x,
      dz = step.z - round.player.z;
    const d = Math.hypot(dx, dz);
    return { x: dx / (d || 1), z: dz / (d || 1), sprint };
  }

  /** Für Spuren: wohin der Stock gerade will. */
  describe(goal: FloorPoint): string {
    const round = this.round;
    const here = round.player.space;
    return `${here} at ${round.player.x.toFixed(2)},${round.player.z.toFixed(2)} goal ${goal.x.toFixed(1)},${goal.z.toFixed(1)} detour=${this.time < this.detour}`;
  }
}
