import type { RoutineOutput } from '../monsterRoutine';
import type { FlatRound } from '../map/flatRound';
import type {
  MonsterAction,
  MonsterDriver,
  MonsterInput,
  MonsterPort,
  MonsterStatus,
} from './monsterDriver';
import {
  interact,
  monsterLabel,
  nearestTarget,
  prompt,
  steer,
  ventTargets,
  type MonsterArena,
  type MonsterTarget,
} from './monsterHelm';

/**
 * **Das Steuer des Monsters in der 2D-Runde.**
 *
 * Hängt sich als `driver` in eine `FlatRound` und übersetzt Stock und
 * Knöpfe in genau die Entscheidung, die sonst die Routine trifft — die
 * Übersetzung selbst steht in `monsterHelm.ts`, weil das Steuer übers Netz
 * (`netMonsterControl.ts`) dieselbe braucht. Was daraus wird — Kabine hin,
 * Treffer, Bewegung mit Gleiten an Wänden —, bleibt Sache der Runde.
 *
 * **Zuschlagen** ist kein Knopf: Wer in Reichweite steht, wird getroffen —
 * die Runde prüft den Abstand. **Interagieren** gilt immer dem *nächsten*
 * Ding (`nearestTarget`): Klappe, Kabine oder gesperrte Tür, und nur eines
 * davon auf einmal.
 *
 * Solange `claimed()` falsch ist, tut die Klasse nichts, und die Runde
 * rechnet die KI. Ein `release` mitten in der Fahrt ist harmlos: Die Fahrt
 * gehört der Runde (`vents/ventTravel.ts`), und die KI steigt drüben aus.
 */
export class FlatMonsterControl implements MonsterDriver, MonsterPort {
  private held = false;
  private stick: MonsterInput = { x: 0, z: 0, sprint: false };
  /** Die Kabine, die dieses Bild aufgerissen wird — aus dem Knopf, nicht aus dem Stock. */
  private cabin = '';
  private ventChoice = 0;
  private readonly arena: MonsterArena;

  constructor(private readonly round: FlatRound) {
    round.driver = this;
    this.arena = {
      house: () => round.house,
      state: () => round.haunt,
      rider: () => round.monster,
      ride: () => round.ventRide,
      locks: () => round.locks,
      time: () => round.haunt.time,
      roll: () => round.roll(),
    };
  }

  /** Vom Steuer der Runde lösen — die KI übernimmt. */
  detach(): void {
    this.held = false;
    if (this.round.driver === this) this.round.driver = null;
  }

  // --- MonsterDriver ---------------------------------------------------------

  active(): boolean {
    return this.held && this.round.driver === this;
  }

  decide(_dt: number): RoutineOutput {
    const decision = steer(this.stick, this.cabin, this.arena);
    this.cabin = '';
    return decision;
  }

  /** Das nächste Ding, mit dem sich etwas anfangen lässt — die Ansicht hebt es hervor. */
  target(): MonsterTarget | null {
    return this.held ? nearestTarget(this.arena) : null;
  }

  // --- MonsterPort -----------------------------------------------------------

  claim(): boolean {
    if (this.held) return false;
    if (this.round.driver !== this) this.round.driver = this;
    this.held = true;
    return true;
  }

  release(): void {
    this.held = false;
    this.stick = { x: 0, z: 0, sprint: false };
    this.cabin = '';
  }

  claimed(): boolean {
    return this.held;
  }

  input(stick: MonsterInput): void {
    this.stick = { x: stick.x, z: stick.z, sprint: stick.sprint };
  }

  act(action: MonsterAction): string {
    if (!this.held || this.round.phase !== 'running' || action !== 'interact') return '';
    const answer = interact(this.arena, this.ventChoice);
    if (answer.boarded) this.ventChoice = 0;
    if (answer.cabin) this.cabin = answer.cabin;
    return answer.text;
  }

  ventTargets(): ReadonlyArray<{ index: number; label: string }> {
    return ventTargets(this.arena);
  }

  chooseVent(index: number): void {
    this.ventChoice = Math.max(0, Math.floor(index));
  }

  status(): MonsterStatus {
    const round = this.round;
    return {
      ride: round.ventRide.phase,
      progress: round.ventRide.progress,
      prompt: prompt(this.arena),
      label: monsterLabel(round.haunt),
    };
  }
}
