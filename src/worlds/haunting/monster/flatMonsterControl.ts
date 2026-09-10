import { spacesOf } from '../house';
import { MONSTERS } from '../mission';
import type { RoutineOutput } from '../monsterRoutine';
import { doorCentre } from '../map/geometry';
import type { FlatRound } from '../map/flatRound';
import { ENTITY_PROFILES } from '../threat';
import type {
  MonsterAction,
  MonsterDriver,
  MonsterInput,
  MonsterPort,
  MonsterStatus,
} from './monsterDriver';

/**
 * **Das Steuer des Monsters in der 2D-Runde.**
 *
 * Hängt sich als `driver` in eine `FlatRound` und übersetzt Stock und
 * Knöpfe in genau die Entscheidung, die sonst die Routine trifft:
 * ein Ziel einen Meter voraus, das Tempo aus dem Sprintring, `strike` vom
 * Knopf „Angreifen". Was daraus wird — Kabine hin, Treffer, Bewegung mit
 * Gleiten an Wänden —, bleibt Sache der Runde.
 *
 * **Angreifen** trifft nur, was in Reichweite ist: den Techniker im Freien
 * (die Runde prüft den Abstand) oder die Kabine, in der er steckt.
 * **Interagieren** ist die Klappe: einsteigen, wenn eine davor ist,
 * aussteigen, wenn die Fahrt angekommen ist, abbrechen, solange man noch
 * nicht losgefahren ist — und sonst eine verriegelte Holztür aufbrechen.
 *
 * Solange `claimed()` falsch ist, tut die Klasse nichts, und die Runde
 * rechnet die KI. Ein `release` mitten in der Fahrt ist harmlos: Die Fahrt
 * gehört der Runde (`vents/ventTravel.ts`), und die KI steigt drüben aus.
 */

/** Wie weit die Kabine vom Monster entfernt sein darf, damit „Angreifen" sie aufreißt. */
const CABIN_REACH = 2.0;
/** Ab hier gilt der Stock als ausgelenkt. */
const DEADZONE = 0.05;
/** Wie weit vor dem Monster das Ziel liegt, in Metern. */
const AHEAD = 1;
/** Wie nah eine Tür sein muss, um sie aufzubrechen, in Metern. */
const DOOR_REACH = 1.6;

export class FlatMonsterControl implements MonsterDriver, MonsterPort {
  private held = false;
  private stick: MonsterInput = { x: 0, z: 0, sprint: false };
  private attack = false;
  private ventChoice = 0;

  constructor(private readonly round: FlatRound) {
    round.driver = this;
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
    const round = this.round;
    const crew = round.state().crew;
    const strike = this.attack && this.cabinInReach(crew.hidden);
    this.attack = false;
    const length = Math.hypot(this.stick.x, this.stick.z);
    const moving = length > DEADZONE;
    const goal = moving
      ? {
          x: round.monster.x + (this.stick.x / length) * AHEAD,
          z: round.monster.z + (this.stick.z / length) * AHEAD,
        }
      : null;
    return {
      mode: this.stick.sprint && moving ? 'hunt' : 'patrol',
      goal,
      face: null,
      pace: !moving ? 'still' : this.stick.sprint ? 'hunt' : 'walk',
      cue: '',
      strike,
      label: 'Spieler',
    };
  }

  /** Ob die Kabine, in der der Techniker steckt, vor dem Monster steht. */
  private cabinInReach(hidden: string): boolean {
    if (!hidden) return true;
    const locker = this.round.graph.locker(hidden);
    if (!locker) return false;
    return (
      Math.hypot(locker.x - this.round.monster.x, locker.z - this.round.monster.z) < CABIN_REACH
    );
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
    this.attack = false;
  }

  claimed(): boolean {
    return this.held;
  }

  input(stick: MonsterInput): void {
    this.stick = { x: stick.x, z: stick.z, sprint: stick.sprint };
  }

  act(action: MonsterAction): string {
    if (!this.held || this.round.phase !== 'running') return '';
    if (action === 'attack') {
      if (this.round.ventRide.busy) return 'Im Schacht kann man nichts anrichten.';
      this.attack = true;
      return '';
    }
    const ride = this.round.ventRide;
    if (ride.phase === 'arrived') {
      ride.exit();
      return 'Aussteigen …';
    }
    if (ride.phase === 'entering') {
      ride.cancel();
      return 'Doch nicht.';
    }
    if (ride.busy) return '';
    if (ride.enter(this.round.monster, this.ventChoice)) {
      this.ventChoice = 0;
      return `Einsteigen · nach ${this.roomName(ride.to?.roomId ?? '')}.`;
    }
    const door = this.lockedDoorNearby();
    if (door) {
      if (door.material !== 'wood') return 'Stahl. Das hält.';
      this.round.haunt.shut = this.round.haunt.shut.filter((id) => id !== door.id);
      return 'Holz splittert.';
    }
    return 'Hier ist nichts.';
  }

  ventTargets(): ReadonlyArray<{ index: number; label: string }> {
    const ride = this.round.ventRide;
    if (ride.busy) return [];
    const found = ride.targetsFrom(this.round.monster);
    if (!found || found.targets.length < 2) return [];
    return found.targets.map((flap, index) => ({ index, label: this.roomName(flap.roomId) }));
  }

  chooseVent(index: number): void {
    this.ventChoice = Math.max(0, Math.floor(index));
  }

  status(): MonsterStatus {
    const round = this.round;
    const kind = round.state().crew.options.monster;
    return {
      ride: round.ventRide.phase,
      progress: round.ventRide.progress,
      prompt: this.prompt(),
      label: MONSTERS.find((m) => m.id === kind)?.name ?? ENTITY_PROFILES[kind].label,
    };
  }

  /** Was „Interagieren" jetzt täte — für die Beschriftung des Knopfs. */
  private prompt(): string {
    const ride = this.round.ventRide;
    if (ride.phase === 'arrived') return 'Aussteigen';
    if (ride.phase === 'entering') return 'Abbrechen';
    if (ride.busy) return '';
    const found = ride.targetsFrom(this.round.monster);
    if (found && found.targets.length) return 'Einsteigen';
    const door = this.lockedDoorNearby();
    if (door) return door.material === 'wood' ? 'Tür aufbrechen' : 'Stahltür';
    return '';
  }

  private lockedDoorNearby(): (typeof this.round.house.doors)[number] | null {
    const round = this.round;
    let best: (typeof round.house.doors)[number] | null = null;
    let near = DOOR_REACH;
    for (const door of round.house.doors) {
      if (!round.haunt.shut.includes(door.id)) continue;
      const at = doorCentre(door);
      const d = Math.hypot(at.x - round.monster.x, at.z - round.monster.z);
      if (d < near) {
        near = d;
        best = door;
      }
    }
    return best;
  }

  private roomName(id: string): string {
    return spacesOf(this.round.house).find((room) => room.id === id)?.name ?? id;
  }
}
