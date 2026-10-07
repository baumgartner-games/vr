import * as THREE from 'three';
import type { Npc } from '../../npc/Npc';
import type { NpcKind } from '../../npc/npcKinds';
import { APRON } from '../house';
import type { SeatId } from '../rules/roundSetup';
import { deskOf } from './commandSeats';
import { MONSTER_SPOT, SUIT_SPOT } from './commandRoom';

/**
 * **Die Bots der Einsatzzentrale** — sichtbar, als Figuren aus dem Regal.
 *
 * Gewünscht (Oktober 2026): _„bots in der einsatzzentrale (anzahl 0, 1, 2, 3,
 * 4), diese sitzen dann auf dem sofa (wenn es frei ist) oder gehen umher in
 * der einsatzzentrale."_ Wie viele es sind, stellt der Rechner
 * _Spiel-Einstellungen_ ein (`rules/crewBots.ts`); beim Start bekommt jeder,
 * der einen Platz übernimmt, seinen Auftrag (`assign`): an einen Rechner der
 * Zentrale und dort hinsetzen, oder an den Anzugständer — dann ist er in der
 * Runde und aus der Zentrale verschwunden. Nach der Runde (`release`) sitzen
 * und schlendern alle wieder.
 *
 * Die Figuren sind Roboter aus dem Regal (4GTN, Kampf-Mech); wer
 * läuft, läuft mit dem Hirn `errand` (`Npc.sendTo`), wer sitzt, sitzt mit
 * `Npc.hold('sit')`. Jedes Gerät zeigt seine eigenen — sie sind Kulisse und
 * gehen nicht übers Netz.
 */

export interface CommandBotsHost {
  /** Einen NPC dieser Sorte setzen, Hirn `errand` — oder `null`. */
  spawn(kind: NpcKind, at: THREE.Vector3, yaw: number): Npc | null;
  remove(npc: Npc): void;
  /** Ob gerade ein Mensch auf dem Sofa sitzt — dann ist es nicht frei. */
  couchTaken(): boolean;
}

/** Die Figuren der Reihe nach. */
const KINDS: readonly NpcKind[] = [
  'kaykit:mystery-monthly-6/7-january-2026-4gtn/characters/4GTN.glb',
  'kaykit:mystery-monthly-5/1-july-2024-combat-mech/characters/CombatMech.glb',
];

/** Die Sitzecke: das Sofa (zwei Kacheln, Blick nach Norden), wie `commandRoom.LOUNGE_SPOTS`. */
const LOUNGE_ROW = APRON.z + 10;
/**
 * Je Sitz die Mitte, die Blickrichtung (die eines NPC: null blickt nach +z,
 * also π nach Norden) — und **von wo man sich setzt**: Vor dem
 * Sofa steht der Couchtisch, also kommt man von der Seite, neben den Sesseln
 * vorbei (`approach`).
 */
const COUCH_SEATS: readonly {
  x: number;
  z: number;
  yaw: number;
  approach: { x: number; z: number };
}[] = [
  { x: 4.5, z: LOUNGE_ROW + 1.5, yaw: Math.PI, approach: { x: 3.5, z: LOUNGE_ROW + 1.5 } },
  { x: 5.5, z: LOUNGE_ROW + 1.5, yaw: Math.PI, approach: { x: 6.5, z: LOUNGE_ROW + 1.5 } },
];

/** Wie lange einer sitzt bzw. schlendert, bevor ihm etwas anderes einfällt (s). */
const SIT_TIME: readonly [number, number] = [18, 40];
const STROLL_TIME: readonly [number, number] = [10, 24];
/** Wie nah er seinem Ziel kommen muss, bevor er sitzt oder ein neues sucht (m). */
const REACH = 0.45;
/** Wie nah er einem Sitz kommen muss, bevor er sich setzt (m) — der Sitz selbst ist gesperrt. */
const SIT_REACH = 1.5;

type Plan =
  | { kind: 'stroll'; until: number; goal: { x: number; z: number } | null }
  | { kind: 'couch'; seat: number; until: number }
  | { kind: 'post'; seat: SeatId };

interface Bot {
  npc: Npc;
  plan: Plan;
  /** Ob er gerade sitzt oder (im Anzug) verschwunden ist. */
  settled: boolean;
  /** Wo er stand, bevor er sich setzte — dorthin steht er wieder auf (`sit`). */
  stood: { x: number; z: number } | null;
}

const _at = new THREE.Vector3();
const _goal = new THREE.Vector3();
const _shift = new THREE.Matrix4();

export class CommandBots {
  private readonly bots: Bot[] = [];
  private clock = 0;

  constructor(
    private readonly host: CommandBotsHost,
    private readonly random: () => number = Math.random,
  ) {}

  get count(): number {
    return this.bots.length;
  }

  /** Was jeder gerade tut — für den Test und eine Zeile im Menü. */
  plans(): string[] {
    return this.bots.map((bot) =>
      bot.plan.kind === 'post' ? `post:${bot.plan.seat}` : bot.plan.kind,
    );
  }

  /** So viele Bots, wie eingestellt — fehlende kommen an der Sitzecke dazu, überzählige gehen. */
  setCount(count: number): void {
    while (this.bots.length > count) this.drop(this.bots.length - 1);
    while (this.bots.length < count) {
      const index = this.bots.length;
      const at = this.strollPoint();
      const npc = this.host.spawn(KINDS[index % KINDS.length]!, _at.set(at.x, 0, at.z), Math.PI);
      if (!npc) return;
      this.bots.push({ npc, plan: this.newStroll(), settled: false, stood: null });
    }
  }

  /**
   * **Die Runde beginnt**: Wer einen Platz übernimmt (`rules/crewBots.fillSeats`),
   * geht dorthin — der Reihe nach, der erste Bot den ersten Platz.
   */
  assign(seats: readonly SeatId[]): void {
    this.release();
    seats.forEach((seat, index) => {
      const bot = this.bots[index];
      if (!bot) return;
      this.unsettle(bot);
      bot.npc.sendTo(null);
      bot.plan = { kind: 'post', seat };
    });
  }

  /** Die Runde ist vorbei: alle wieder in die Sitzecke und durch die Zentrale. */
  release(): void {
    for (const bot of this.bots) {
      if (bot.plan.kind !== 'post') continue;
      this.unsettle(bot);
      bot.plan = this.newStroll();
    }
  }

  update(dt: number): void {
    this.clock += dt;
    const couchTaken = this.host.couchTaken();
    for (const bot of this.bots) {
      const plan = bot.plan;
      if (plan.kind === 'post') {
        this.post(bot, plan.seat);
        continue;
      }
      if (plan.kind === 'couch') {
        // Setzt sich ein Mensch aufs Sofa, steht der Bot auf und macht Platz.
        if (couchTaken || this.clock > plan.until) {
          this.unsettle(bot);
          bot.plan = this.newStroll();
          continue;
        }
        const seat = COUCH_SEATS[plan.seat]!;
        if (!bot.settled && this.near(bot, seat, SIT_REACH)) this.sit(bot, seat, seat.yaw);
        else if (!bot.settled) this.walk(bot, seat.approach);
        continue;
      }
      // Schlendern: von Punkt zu Punkt, und ist das Sofa frei, irgendwann hinsetzen.
      if (this.clock > plan.until) {
        const seat = couchTaken ? null : this.freeCouchSeat();
        if (seat !== null) {
          bot.plan = {
            kind: 'couch',
            seat,
            until: this.clock + this.between(SIT_TIME),
          };
          continue;
        }
        plan.until = this.clock + this.between(STROLL_TIME);
      }
      if (!plan.goal || this.near(bot, plan.goal)) plan.goal = this.strollPoint();
      this.walk(bot, plan.goal);
    }
  }

  dispose(): void {
    while (this.bots.length) this.drop(this.bots.length - 1);
  }

  /** Ein Bot mit Auftrag: an den Rechner und hinsetzen, oder an den Ständer und weg. */
  private post(bot: Bot, seat: SeatId): void {
    if (bot.settled) return;
    const desk = seat === 'technician' || seat === 'monster' ? null : deskOf(seat);
    if (desk) {
      const at = { x: desk.x, z: desk.z };
      // `desk.yaw` ist die Drehung des Spielers (Blick nach −z); die Figur
      // eines NPC blickt bei null nach +z.
      if (this.near(bot, at, SIT_REACH)) this.sit(bot, at, desk.yaw + Math.PI);
      else this.walk(bot, at);
      return;
    }
    // Techniker und Monster: an den Ständer — dann steckt er im Anzug und ist
    // draußen in der Runde; die Figur der Zentrale verschwindet so lange.
    const spot = seat === 'monster' ? MONSTER_SPOT : SUIT_SPOT;
    const at = { x: spot.x + 0.5, z: spot.z + 1.4 };
    if (this.near(bot, at, 0.7)) {
      bot.npc.sendTo(null);
      bot.npc.holder.visible = false;
      bot.settled = true;
    } else this.walk(bot, at);
  }

  /**
   * **Hinsetzen**: Sofa und Stuhl stehen auf gesperrten Zellen, dorthin plant
   * kein Weg. Wer nah genug davor steht, wird auf den Sitz versetzt
   * (`Npc.warp`) und hält dort die Haltung (`Npc.hold`).
   */
  private sit(bot: Bot, at: { x: number; z: number }, yaw: number): void {
    bot.npc.feet(_at);
    bot.stood = { x: _at.x, z: _at.z };
    bot.npc.warp(_shift.makeTranslation(at.x - _at.x, 0, at.z - _at.z));
    bot.npc.hold('sit', yaw, at);
    bot.settled = true;
  }

  private unsettle(bot: Bot): void {
    bot.npc.hold(null);
    // Vom Sitz zurück an die Stelle davor: Auf der gesperrten Zelle des Sofas
    // fände die Wegsuche keinen Anfang.
    if (bot.stood) {
      bot.npc.feet(_at);
      bot.npc.warp(_shift.makeTranslation(bot.stood.x - _at.x, 0, bot.stood.z - _at.z));
      bot.stood = null;
    }
    bot.npc.holder.visible = true;
    bot.settled = false;
  }

  private walk(bot: Bot, to: { x: number; z: number }): void {
    const goal = bot.npc.goal;
    if (goal && Math.hypot(goal.x - to.x, goal.z - to.z) < 0.05) return;
    bot.npc.sendTo(_goal.set(to.x, 0, to.z), REACH * 0.8);
  }

  private near(bot: Bot, to: { x: number; z: number }, reach = REACH): boolean {
    bot.npc.feet(_at);
    return Math.hypot(_at.x - to.x, _at.z - to.z) < reach;
  }

  private freeCouchSeat(): number | null {
    const taken = new Set(
      this.bots.flatMap((bot) => (bot.plan.kind === 'couch' ? [bot.plan.seat] : [])),
    );
    const free = COUCH_SEATS.map((_, index) => index).filter((index) => !taken.has(index));
    return free.length ? free[Math.floor(this.random() * free.length)]! : null;
  }

  private newStroll(): Plan {
    return { kind: 'stroll', until: this.clock + this.between(STROLL_TIME), goal: null };
  }

  private between([low, high]: readonly [number, number]): number {
    return low + this.random() * (high - low);
  }

  /**
   * **Ein Punkt zum Hinschlendern** — in der Zentrale, abseits der Wände, der
   * Schreibtische, des Hologramms und der Sitzecke.
   */
  private strollPoint(): { x: number; z: number } {
    const cx = APRON.x + APRON.w / 2;
    const cz = APRON.z + APRON.d / 2;
    for (let tries = 0; tries < 12; tries++) {
      const x = APRON.x + 3 + this.random() * (APRON.w - 6);
      const z = APRON.z + 2.2 + this.random() * 6.5;
      if (Math.abs(x - cx) < 1.8 && Math.abs(z - cz) < 1.8) continue;
      return { x, z };
    }
    return { x: cx - 3, z: APRON.z + 3 };
  }

  private drop(index: number): void {
    const bot = this.bots[index]!;
    this.host.remove(bot.npc);
    this.bots.splice(index, 1);
  }
}
