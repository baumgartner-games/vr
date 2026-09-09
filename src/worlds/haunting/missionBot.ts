import { stepAlong, type DronePose, type DroneRoute } from './droneRoute';
import { roomAt, type HouseSpec } from './house';
import { TILE } from '../nav/navTile';
import { puzzleFor, puzzleSolved, repairsFor, type Repair } from './mission';
import type { HauntState } from './net';
import { stationLayout, type FloorPoint } from './stationLayout';
import { COMMAND_HOME } from './trainingLayout';

export interface MissionBotHost {
  spec: HouseSpec;
  state: HauntState;
  route(from: DronePose, target: FloorPoint): DroneRoute | null;
  revision?(): number;
  say(message: string): void;
}
export type BotStage =
  'cargo' | 'open-cargo' | 'take-cargo' | 'console' | 'repair' | 'return' | 'complete';

/** A visible rehearsal uses the actual inventory, terminals and win condition. */
export class MissionBot {
  readonly pose: DronePose = { ...COMMAND_HOME, yaw: 0 };
  stage: BotStage = 'cargo';
  private index = 0;
  private path: DroneRoute | null = null;
  private timer = 0;
  private input = 0;
  private readonly repairs: readonly Repair[];
  private readonly layout;
  private blocked = false;
  private routeRevision = -1;
  private reportedRoom = '';
  private destination: FloorPoint | null = null;

  get navigation() {
    return { at: this.pose, points: this.path?.points ?? [], goal: this.destination };
  }

  constructor(private readonly host: MissionBotHost) {
    this.repairs = repairsFor(host.spec);
    this.layout = stationLayout(host.spec);
    host.say(
      'BOT-RUNDE: Der Techniker sucht Ersatzteile, repariert drei Systeme und kehrt zurück.',
    );
  }

  get completed(): boolean {
    return this.stage === 'complete';
  }

  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0 || this.completed) return;
    const room = roomAt(
      this.host.spec,
      Math.floor(this.pose.x / TILE),
      Math.floor(this.pose.z / TILE),
    );
    const here = room?.id ?? 'command';
    if (here !== this.reportedRoom) {
      this.reportedRoom = here;
      this.host.say(
        `FUNK · Techniker → Zentrale: Standort ${room?.name ?? 'Zentrale'}. Auftrag: ${{ cargo: 'Ersatzteil suchen', 'open-cargo': 'Fracht öffnen', 'take-cargo': 'Ersatzteil aufnehmen', console: 'zum Reparaturterminal', repair: 'System reparieren', return: 'Rückkehr zur Zentrale', complete: 'abgeschlossen' }[this.stage]}.`,
      );
    }
    const step = Math.min(0.1, dt);
    this.timer -= step;
    if (this.timer > 0) return;
    const state = this.host.state;
    const repair = this.repairs[this.index];
    if (this.stage === 'return') {
      if (!this.walk(COMMAND_HOME, step)) return;
      if (state.done.length === this.repairs.length) {
        state.phase = 'won';
        this.stage = 'complete';
        this.host.say(
          'BOT-RUNDE ERFÜLLT: Alle Systeme repariert, Techniker sicher in der Zentrale.',
        );
      }
      return;
    }
    if (!repair) return;
    if (this.stage === 'cargo') {
      const cargoRoom = this.host.spec.tasks.find((task) => task.id === repair.itemId)?.roomId;
      const cargo = this.layout.find((placement) => placement.id === `cargo-${cargoRoom}`);
      if (!cargo || !this.walk(cargo.approach, step)) return;
      this.host.say(`Techniker: ${repair.item} gefunden. Frachtschrank wird geöffnet.`);
      this.stage = 'open-cargo';
      this.timer = 0.7;
    } else if (this.stage === 'open-cargo') {
      const cargoRoom = this.host.spec.tasks.find((task) => task.id === repair.itemId)?.roomId;
      const id = `cargo-${cargoRoom}`;
      if (!state.crew.opened.includes(id)) state.crew.opened.push(id);
      this.stage = 'take-cargo';
      this.timer = 0.9;
    } else if (this.stage === 'take-cargo') {
      const cargoRoom = this.host.spec.tasks.find((task) => task.id === repair.itemId)?.roomId;
      const id = `cargo-${cargoRoom}`;
      if (!state.taken.includes(repair.itemId)) state.taken.push(repair.itemId);
      if (!state.crew.inventory.includes(id)) state.crew.inventory.push(id);
      this.host.say(`Archiv → Techniker: ${repair.item} zur Reparatur „${repair.title}“ bringen.`);
      this.stage = 'console';
    } else if (this.stage === 'console') {
      const console = this.layout.find((placement) => placement.id === `console-${repair.id}`);
      if (!console || !this.walk(console.approach, step)) return;
      if (!state.taken.includes(repair.itemId)) return;
      puzzleFor(state.crew, repair.id).open = true;
      this.stage = 'repair';
      this.input = 0;
      this.timer = 1.2;
      this.host.say(`Archiv → Techniker: ${repair.title}. ${repair.hint}`);
    } else if (this.stage === 'repair') {
      const puzzle = puzzleFor(state.crew, repair.id);
      if (repair.puzzle === 'wires') puzzle.links[this.input] = repair.order.indexOf(this.input);
      else if (repair.puzzle === 'sequence') puzzle.links.push(Number(repair.code[this.input]));
      else puzzle.digits[this.input] = Number(repair.code[this.input]);
      this.input++;
      this.timer = 0.65;
      if (!puzzleSolved(repair, puzzle)) return;
      if (!state.done.includes(repair.id)) state.done.push(repair.id);
      if (!state.lit.includes(repair.roomId)) state.lit.push(repair.roomId);
      state.fuse = true;
      this.host.say(`Techniker: ${repair.title} repariert (${state.done.length}/3).`);
      this.index++;
      this.stage = this.index === this.repairs.length ? 'return' : 'cargo';
      this.timer = 1.1;
    }
  }

  /** Missing routes pause the demonstration. They never fabricate an arrival or repair. */
  private walk(target: FloorPoint, dt: number): boolean {
    this.destination = target;
    const revision = this.host.revision?.() ?? 0;
    if (revision !== this.routeRevision) {
      this.path = null;
      this.routeRevision = revision;
    }
    if (Math.hypot(target.x - this.pose.x, target.z - this.pose.z) < 0.45) {
      this.path = null;
      this.blocked = false;
      return true;
    }
    this.path ??= this.host.route(this.pose, target);
    if (!this.path?.points?.length) {
      if (!this.blocked)
        this.host.say(
          'Techniker wartet: Der Weg ist blockiert. Tür in der Einsatzkontrolle freigeben.',
        );
      this.blocked = true;
      this.path = null;
      this.timer = 1;
      return false;
    }
    this.blocked = false;
    const moving = stepAlong(this.pose, this.path, dt, 2.15);
    if (!moving) this.path = null;
    return false;
  }
}
