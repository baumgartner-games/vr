import * as THREE from 'three';
import type { Npc } from './Npc';
import type { NpcKind } from './npcKinds';
import { PlaceBoard, type Place } from './npcPlaces';
import {
  VISITOR_DEFAULTS,
  newVisitor,
  stepVisitor,
  type VisitorConfig,
  type VisitorState,
} from './npcBehavior';
import { sidestep, type Mover } from './npcAvoid';

/**
 * **Die Schicht zwischen Verhalten und Körper** — Besucher, die Plätze
 * aufsuchen.
 *
 * `npcBehavior.ts` rechnet, `npcPlaces.ts` bucht, `npcAvoid.ts` weicht aus;
 * hier wird daraus ein NPC, der wirklich läuft: Ein Auftrag mit Ziel wird ein
 * `sendTo`, einer mit Haltung ein `hold`, und wer gegangen ist, wird beim
 * Regisseur abgemeldet. Die Welt reicht zwei Handgriffe herein (`RoutineHost`:
 * setzen, wegräumen) und ruft `update` je Bild — dieselbe Schnittstelle, wie
 * sie der Regisseur selbst hat (`NpcWorld`), und aus demselben Grund: Eine
 * Zone, eine Küche oder ein Spielmodus hängt das hier ein, ohne die Innereien
 * des anderen zu kennen.
 *
 * Gelaufen wird über das Hirn `errand` mit einer engeren Ankunftsweite
 * (`Npc.sendTo(…, reach)`): Der Läufer plant den Weg, das Hirn dreht und
 * geht, und die letzten Zentimeter bis auf den Stuhl rückt `Npc.hold`.
 */

export interface RoutineHost {
  /** Setzt einen NPC dieser Sorte hierhin, mit Hirn `errand` — oder `null`. */
  spawn(kind: NpcKind, at: THREE.Vector3, yaw: number): Npc | null;
  /** Nimmt ihn wieder aus der Welt. */
  remove(npc: Npc): void;
}

interface Visitor {
  npc: Npc;
  state: VisitorState;
  /** Ein Ausweichpunkt, solange er ausweicht, und wie lange noch. */
  dodge: { x: number; z: number } | null;
  dodging: number;
  /** Wohin er zuletzt geschickt wurde — damit nicht jedes Bild neu geplant wird. */
  sent: { x: number; z: number } | null;
}

/** Wie lange ein Ausweichschritt gilt, bevor wieder das Ziel zählt. */
const DODGE_TIME = 0.8;

const _at = new THREE.Vector3();
const _goal = new THREE.Vector3();

export class VisitorRoutine {
  readonly board = new PlaceBoard();
  private readonly visitors: Visitor[] = [];
  private serial = 0;

  constructor(
    private readonly host: RoutineHost,
    readonly options: {
      /** Wo sie hereinkommen. */
      entrance: { x: number; z: number };
      /** Wo sie gehen. */
      exit: { x: number; z: number };
      /** Welche Figuren, der Reihe nach. */
      kinds: readonly NpcKind[];
      config?: Partial<VisitorConfig>;
    },
  ) {}

  private get config(): VisitorConfig {
    return { ...VISITOR_DEFAULTS, ...this.options.config };
  }

  addPlace(place: Place): void {
    this.board.add(place);
  }

  /** Wie viele gerade da sind. */
  get count(): number {
    return this.visitors.length;
  }

  /** Was jeder gerade tut — für eine Zeile im Menü, eine Tafel und den Test. */
  modes(): string[] {
    return this.visitors.map((one) => one.state.mode);
  }

  /**
   * **Einlassen**: `count` Besucher am Eingang, nebeneinander aufgereiht,
   * damit sie nicht ineinander entstehen. Gibt zurück, wie viele es wurden.
   */
  admit(count: number): number {
    let made = 0;
    const { entrance, exit, kinds } = this.options;
    for (let i = 0; i < count; i++) {
      const kind = kinds[this.serial % kinds.length]!;
      const offset = (i - (count - 1) / 2) * 0.9;
      _at.set(entrance.x + offset, 0, entrance.z);
      const npc = this.host.spawn(kind, _at, Math.PI);
      if (!npc) break;
      this.serial++;
      this.visitors.push({
        npc,
        state: newVisitor(`besucher-${this.serial}`, exit),
        dodge: null,
        dodging: 0,
        sent: null,
      });
      made++;
    }
    return made;
  }

  update(dt: number, random: () => number = Math.random): void {
    const config = this.config;
    const movers: (Mover & { visitor: Visitor })[] = this.visitors.map((visitor) => {
      visitor.npc.feet(_at);
      return { x: _at.x, z: _at.z, heading: null, visitor };
    });

    for (let i = this.visitors.length - 1; i >= 0; i--) {
      const visitor = this.visitors[i]!;
      const me = movers[i]!;
      if (!visitor.npc.alive) {
        this.drop(i);
        continue;
      }
      const order = stepVisitor(visitor.state, this.board, { at: me, dt, random }, config);
      if (visitor.state.mode === 'gone') {
        this.drop(i);
        continue;
      }
      if (order.pose) {
        visitor.npc.hold(order.pose, order.yaw ?? undefined, order.settle);
        visitor.sent = null;
        continue;
      }
      visitor.npc.hold(null);
      if (!order.goal) {
        this.send(visitor, null, config.reach);
        continue;
      }

      // **Ausweichen**: Steht jemand vorne im Weg, ein kurzer Schritt nach
      // rechts; danach wieder das eigentliche Ziel.
      const dx = order.goal.x - me.x;
      const dz = order.goal.z - me.z;
      const length = Math.hypot(dx, dz);
      me.heading = length > 1e-6 ? { x: dx / length, z: dz / length } : null;
      visitor.dodging = Math.max(0, visitor.dodging - dt);
      if (visitor.dodging === 0) {
        visitor.dodge = null;
        const others = movers.filter((other) => other !== me);
        const step = length > 1.2 ? sidestep(me, others) : null;
        if (step) {
          visitor.dodge = step;
          visitor.dodging = DODGE_TIME;
        }
      }
      this.send(visitor, visitor.dodge ?? order.goal, visitor.dodge ? 0.3 : config.reach * 0.8);
    }
  }

  /** Alle weg, alle Plätze frei. */
  clear(): number {
    const count = this.visitors.length;
    for (let i = this.visitors.length - 1; i >= 0; i--) this.drop(i);
    return count;
  }

  private send(visitor: Visitor, goal: { x: number; z: number } | null, reach: number): void {
    const last = visitor.sent;
    if (!goal) {
      if (last) visitor.npc.sendTo(null);
      visitor.sent = null;
      return;
    }
    if (last && Math.hypot(last.x - goal.x, last.z - goal.z) < 0.05) return;
    visitor.sent = { ...goal };
    visitor.npc.sendTo(_goal.set(goal.x, 0, goal.z), reach);
  }

  private drop(index: number): void {
    const visitor = this.visitors[index]!;
    this.board.release(visitor.state.id);
    this.host.remove(visitor.npc);
    this.visitors.splice(index, 1);
  }
}
