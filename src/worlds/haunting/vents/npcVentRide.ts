import { MONSTERS, type MonsterKind } from '../mission';
import type { RoutineOutput } from '../monsterRoutine';
import type { StationGraph } from '../roomGraph';
import type { HouseSpec } from '../house';
import { VentNet, VENT_REACH, type VentFlap } from './ventGraph';
import { VentPilot } from './ventPilot';
import { VentTravel, type VentEvent, type VentRider } from './ventTravel';

/**
 * **Die Fahrt mit einem Körper verheiratet** — was die 3D-Welt vom Netz
 * braucht, ohne three.js und ohne Rapier.
 *
 * `VentTravel` kennt nur Zeit und Klappen und bewegt einen Reiter aus vier
 * Zahlen. Das Monster im Headset hat aber einen Rapier-Körper, ein Modell
 * und ein Signal `crew.venting`, das übers Netz geht und an einem Dutzend
 * Stellen gelesen wird (Modell sichtbar, Bot-Wahrnehmung, Karte, Treffer).
 * Diese Klasse bündelt die drei Fäden, damit `HauntingWorld` nur noch eine
 * Zeile je Bild ruft — und damit sich das Ganze ohne Welt prüfen lässt:
 * Der Körper ist hier ein Interface aus drei Handgriffen.
 *
 * - `hold`: jedes Bild der Fahrt — der Körper bleibt stehen, wo er ist.
 * - `place`: bei Ankunft und Ausstieg — der Körper wird an den Standplatz
 *   der Zielklappe gesetzt.
 * - `effect`: an der Einstiegs- und an der Zielklappe — Rauch und Schlag.
 */
export interface VentBody {
  hold(): void;
  place(at: { x: number; z: number }, yaw: number): void;
  effect(flap: VentFlap): void;
}

/** Unter diesem Wert fällt `venting` nie, solange das Monster im Schacht sitzt. */
export const VENTING_FLOOR = 0.5;
/** Und über diesen nie — `mission.readCrew` schneidet beim Empfänger bei 3 ab. */
export const VENTING_CEILING = 3;
/**
 * Der Rapier-Körper hält vor seinem Ziel an (`npcBrain`, `reach` 1,15 m);
 * bis hierhin gilt er als „vor der Klappe". Knapp unter `VENT_REACH`.
 */
export const NPC_VENT_REACH = VENT_REACH * 0.93;

export class NpcVentRide {
  readonly pilot: VentPilot;

  constructor(
    readonly net: VentNet,
    readonly ride: VentTravel,
    private readonly body: VentBody,
    kind: MonsterKind,
    walkSpeed: number,
  ) {
    this.pilot = new VentPilot(
      net,
      ride,
      MONSTERS.find((m) => m.id === kind)?.vent ?? 28,
      walkSpeed,
      undefined,
      NPC_VENT_REACH,
    );
  }

  /** Netz und Fahrt aus dem Bauplan — für Tests und für eine Welt ohne eigene. */
  static forSpec(spec: HouseSpec, body: VentBody, kind: MonsterKind, walkSpeed: number) {
    const net = new VentNet(spec);
    return new NpcVentRide(net, new VentTravel(net), body, kind, walkSpeed);
  }

  /** Die Entscheidung der Routine, vom Lotsen gegebenenfalls auf eine Klappe umgebogen. */
  steer(
    decision: RoutineOutput,
    rider: VentRider,
    time: number,
    graph: StationGraph,
  ): RoutineOutput {
    return this.pilot.steer(decision, rider, time, graph);
  }

  /**
   * Ein Bild der Fahrt. Der Reiter ist ein Abbild des Monsters (Füße, Blick,
   * Raum); die Maschine schreibt hinein, wo er nach dem Bild steht, und der
   * Körper wird erst dann angefasst, wenn sich daraus etwas ergibt.
   */
  step(dt: number, rider: VentRider, autoExit: boolean): VentEvent {
    if (!this.ride.busy) return '';
    const event = this.ride.step(dt, rider, autoExit);
    const to = this.ride.to;
    if (event === 'entered' && this.ride.from) this.body.effect(this.ride.from);
    if (event === 'arrived' && to) {
      // Die Maschine setzt den Reiter in die Wand (`to.at`); ein Körper mit
      // Halbmesser steht davor, auf dem Standplatz.
      this.body.place(to.approach, to.yaw + Math.PI);
      this.body.effect(to);
    }
    if (event === 'exited') this.body.place({ x: rider.x, z: rider.z }, rider.yaw);
    if (this.ride.concealed) this.body.hold();
    return event;
  }

  /**
   * Das Signal für alle, die `crew.venting > 0` lesen: positiv, solange das
   * Monster im Schacht sitzt, sonst null. Nach oben begrenzt, weil der
   * Empfänger höhere Werte kappt; nach unten, weil `stepVitals` jedes Bild
   * `dt` abzieht und ein Wert knapp über null sonst noch im selben Bild
   * wieder null wäre.
   */
  venting(): number {
    if (!this.ride.concealed) return 0;
    return Math.min(VENTING_CEILING, Math.max(VENTING_FLOOR, this.ride.timer));
  }

  /** Für eine neue Runde oder ein Monster, das es nicht mehr gibt. */
  reset(): void {
    this.ride.reset();
    this.pilot.reset();
  }
}
