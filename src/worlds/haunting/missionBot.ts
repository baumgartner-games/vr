import { stepAlong, type DronePose, type DroneRoute } from './droneRoute';
import { roomAt, type HouseSpec } from './house';
import { TILE } from '../nav/navTile';
import { puzzleFor, puzzleSolved, repairsFor, type Repair } from './mission';
import type { HauntState } from './net';
import { stationLayout, type FloorPoint } from './stationLayout';
import { taskCargo } from './rules/cargo';
import { COMMAND_HOME } from './trainingLayout';
import { DEFAULT_TUNING, type TechnicianTuning } from './botTuning';

export interface MissionBotHost {
  spec: HouseSpec;
  state: HauntState;
  route(from: DronePose, target: FloorPoint): DroneRoute | null;
  revision?(): number;
  danger?(pose: DronePose): FloorPoint | null;
  visible?(from: FloorPoint, to: FloorPoint): boolean;
  /** Die Gewichte des Technikers (`botTuning.ts`); ohne sie die Auslieferung. */
  tuning?(): TechnicianTuning;
  say(message: string): void;
}
export type BotStage =
  'cargo' | 'open-cargo' | 'take-cargo' | 'console' | 'repair' | 'return' | 'complete';

/** A visible rehearsal uses the actual inventory, terminals and win condition. */
export class MissionBot {
  readonly pose: DronePose = { ...COMMAND_HOME, yaw: 0 };
  stage: BotStage = 'cargo';
  survival: 'mission' | 'flee' | 'hide' = 'mission';
  private dangerMemory: FloorPoint | null = null;
  private calm = 0;
  private escape: { point: FloorPoint; room: string } | null = null;
  private rethink = 0;
  private attackCooldown = 0;
  private sprint = 0;
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

  /**
   * Die Zahlen, nach denen er arbeitet und flieht.
   *
   * Sie werden **bei jedem Zugriff** neu gelesen und nicht im Konstruktor
   * eingefroren: Wer in der Schalttafel am Fluchttempo dreht, will es an der
   * laufenden Runde sehen und nicht an der nächsten.
   */
  private get bot(): TechnicianTuning {
    return this.host.tuning?.() ?? DEFAULT_TUNING.technician;
  }

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
    if (this.survive(Math.min(0.1, dt))) return;
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
      const cargo = this.layout.find(
        (placement) => placement.id === taskCargo(this.host.spec, repair.itemId).id,
      );
      if (!cargo || !this.walk(cargo.approach, step)) return;
      this.host.say(`Techniker: ${repair.item} gefunden. Frachtschrank wird geöffnet.`);
      this.stage = 'open-cargo';
      this.timer = 0.7 * this.bot.work;
    } else if (this.stage === 'open-cargo') {
      const id = taskCargo(this.host.spec, repair.itemId).id;
      if (!state.crew.opened.includes(id)) state.crew.opened.push(id);
      this.stage = 'take-cargo';
      this.timer = 0.9 * this.bot.work;
    } else if (this.stage === 'take-cargo') {
      const id = taskCargo(this.host.spec, repair.itemId).id;
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
      this.timer = 1.2 * this.bot.work;
      this.host.say(`Archiv → Techniker: ${repair.title}. ${repair.hint}`);
    } else if (this.stage === 'repair') {
      const puzzle = puzzleFor(state.crew, repair.id);
      if (repair.puzzle === 'wires') puzzle.links[this.input] = repair.order.indexOf(this.input);
      else if (repair.puzzle === 'sequence') puzzle.links.push(Number(repair.code[this.input]));
      else puzzle.digits[this.input] = Number(repair.code[this.input]);
      this.input++;
      this.timer = 0.65 * this.bot.work;
      if (!puzzleSolved(repair, puzzle)) return;
      if (!state.done.includes(repair.id)) state.done.push(repair.id);
      if (!state.lit.includes(repair.roomId)) state.lit.push(repair.roomId);
      state.fuse = true;
      this.host.say(`Techniker: ${repair.title} repariert (${state.done.length}/3).`);
      this.index++;
      this.stage = this.index === this.repairs.length ? 'return' : 'cargo';
      this.timer = 1.1 * this.bot.work;
    }
  }

  /** Survival interrupts work without granting inventory or completing an off-site puzzle. */
  private survive(dt: number): boolean {
    const danger = this.host.danger?.(this.pose) ?? null;
    this.attackCooldown -= dt;
    this.rethink -= dt;
    const bot = this.bot;
    this.sprint = Math.max(
      0,
      Math.min(1, this.sprint + (this.survival === 'flee' ? dt / bot.stamina : -dt / 4)),
    );
    if (danger) {
      this.dangerMemory = { ...danger };
      this.calm = 0;
      if (
        Math.hypot(danger.x - this.pose.x, danger.z - this.pose.z) < 1.65 &&
        this.attackCooldown <= 0 &&
        this.survival !== 'hide' &&
        this.host.visible?.(this.pose, danger) !== false
      ) {
        this.attackCooldown = 3;
        this.host.say(
          'TEST · Monster greift Techniker an — Treffer, Anzug bleibt im sicheren Test unbeschädigt.',
        );
      }
    } else this.calm += dt;
    if (this.survival === 'hide') {
      if (!this.host.state.crew.hidden) {
        // Die Kabine ist aufgerissen worden (`HauntingWorld.breakLocker`
        // hat `crew.hidden` geleert): Wer jetzt still im Zustand „versteckt"
        // bliebe, stünde reglos vor dem Monster. Also raus — und weg von der
        // Stelle, an der es gerade steht: der Kabine selbst.
        this.survival = 'flee';
        this.dangerMemory = danger ?? this.escape?.point ?? { ...this.pose };
        this.escape = null;
        this.path = null;
        this.rethink = 0;
        this.calm = 0;
        this.host.say('FUNK · Techniker → Zentrale: Die Kabine ist aufgerissen! Fliehe.');
        return true;
      }
      if (this.calm < bot.nerve * 0.7) return true;
      this.host.state.crew.hidden = '';
      this.resume();
      return false;
    }
    if (!danger && (this.survival === 'mission' || this.calm > bot.nerve)) {
      if (this.survival !== 'mission') this.resume();
      return false;
    }
    if (!this.dangerMemory) return false;
    if (this.survival === 'mission') {
      this.survival = 'flee';
      this.path = null;
      this.rethink = 0;
      this.host.say(
        'FUNK · Techniker → Zentrale: Monster wahrgenommen! Überleben zuerst — fliehe zu Deckung.',
      );
    }
    if (this.rethink <= 0 || !this.escape) {
      this.rethink = 2;
      const threat = this.dangerMemory;
      let best = -Infinity;
      for (const locker of this.layout.filter((item) => item.kind === 'locker')) {
        // Ein Wrack ist kein Versteck (`HauntState.destroyed`).
        if (this.host.state.destroyed.includes(locker.roomId)) continue;
        const point = locker.approach;
        const distance = Math.hypot(point.x - threat.x, point.z - threat.z);
        if (distance < bot.caution * 0.78) continue;
        const route = this.host.route(this.pose, point);
        const end = route?.points?.at(-1);
        if (!end || Math.hypot(end.x - point.x, end.z - point.z) > 0.5) continue;
        if (
          route!.points!.some(
            (p) =>
              Math.hypot(p.x - threat.x, p.z - threat.z) <
              Math.min(2.5, Math.hypot(this.pose.x - threat.x, this.pose.z - threat.z) - 0.2),
          )
        )
          continue;
        let length = 0,
          previous: FloorPoint = this.pose;
        for (const p of route!.points!) {
          length += Math.hypot(p.x - previous.x, p.z - previous.z);
          previous = p;
        }
        const cover = this.host.visible?.(threat, point) === false ? 12 : 0;
        const score = Math.min(distance, 20) + cover * (0.5 + bot.hide) - length * 0.7;
        if (score > best) {
          best = score;
          this.escape = { point, room: locker.roomId };
        }
      }
      this.path = null;
    }
    // Mit Puste das Fluchttempo, ohne Puste ein Trab — nicht Arbeitstempo:
    // Ein Techniker, der nach fünf Sekunden spazieren geht, wird von einem
    // Monster eingeholt, das schneller **geht** als er (`mission.ts`).
    const flight = this.sprint < 0.85 ? bot.sprint : Math.max(bot.walk, bot.sprint * 0.72);
    if (this.escape && this.walk(this.escape.point, dt, flight)) {
      // A watched entry gives away the hiding place: keep seeking another escape.
      if (!danger) {
        this.survival = 'hide';
        this.host.state.crew.hidden = this.escape.room;
        this.path = null;
        this.calm = 0;
        this.host.say(
          'FUNK · Techniker → Zentrale: Im Schutzschrank. Warte leise, bis die Gefahr vorbei ist.',
        );
      } else {
        this.escape = null;
        this.rethink = 0;
      }
    }
    return true;
  }

  private resume(): void {
    this.survival = 'mission';
    this.escape = null;
    this.dangerMemory = null;
    this.path = null;
    this.timer = 0;
    if (this.stage === 'open-cargo' || this.stage === 'take-cargo') this.stage = 'cargo';
    if (this.stage === 'repair') {
      const repair = this.repairs[this.index]!;
      delete this.host.state.crew.puzzles[repair.id];
      this.stage = 'console';
    }
    this.host.say('FUNK · Techniker → Zentrale: Gefahr abgeschüttelt. Setze den Auftrag fort.');
  }

  /** Missing routes pause the demonstration. They never fabricate an arrival or repair. */
  private walk(target: FloorPoint, dt: number, speed = this.bot.walk): boolean {
    if (
      this.destination &&
      Math.hypot(target.x - this.destination.x, target.z - this.destination.z) > 0.1
    )
      this.path = null;
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
    const moving = stepAlong(this.pose, this.path, dt, speed);
    if (!moving) this.path = null;
    return false;
  }
}
