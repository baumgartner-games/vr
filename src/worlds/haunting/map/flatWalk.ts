import { COMMAND } from '../roomGraph';
import type { FloorPoint } from '../stationLayout';
import { nextThroughDoor } from './geometry';
import type { FlatRound, FlatInput } from './flatRound';

/**
 * **Wie ein Mensch mit der Karte läuft**: Raum für Raum über die Türen,
 * senkrecht durch jede Öffnung, und wer an einer Wand hängen bleibt, geht
 * kurz zur Raummitte zurück. Kein Navmesh — ein Stock, der weiß, wo die
 * nächste Tür ist. Die Tests spielen damit ganze Runden; die Bot-Vorschau
 * der 2D-Welt darf es auch benutzen.
 */
export class FlatWalker {
  private stall = { x: NaN, z: NaN, since: 0 };
  private detour = -1;
  private time = 0;

  constructor(private readonly round: FlatRound) {}

  /** Der Stock für diesen Schritt, oder `null`, wenn angekommen. */
  input(goal: FloorPoint, dt: number, sprint = false): FlatInput | null {
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
    }
    if (this.time < this.detour) step = graph.centre(here);
    else if (here !== goalSpace) {
      const next = graph.next(here, goalSpace);
      const door = round.house.doors.find(
        (d) =>
          (d.a === here && (d.b ?? COMMAND) === next) ||
          ((d.b ?? COMMAND) === here && d.a === next),
      );
      if (door) step = nextThroughDoor(door, round.player, graph.centre(next));
    }
    const dx = step.x - round.player.x,
      dz = step.z - round.player.z;
    const d = Math.hypot(dx, dz);
    if (here === goalSpace && d < 0.6) return null;
    return { x: dx / (d || 1), z: dz / (d || 1), sprint };
  }

  /** Für Spuren: wohin der Stock gerade will. */
  describe(goal: FloorPoint): string {
    const round = this.round;
    const here = round.player.space;
    return `${here} at ${round.player.x.toFixed(2)},${round.player.z.toFixed(2)} goal ${goal.x.toFixed(1)},${goal.z.toFixed(1)} detour=${this.time < this.detour}`;
  }
}
