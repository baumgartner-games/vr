import type { MapPoint } from '../map/mapSnapshot';
import type { VentFlap, VentNet } from './ventGraph';

/**
 * **Die Fahrt durch den Schacht** — eine Zustandsmaschine ohne Bild.
 *
 * Kein Teleport: Wer einen Vent benutzt, **steigt ein** (eine Interaktion,
 * die Zeit kostet), **fährt** (spürbar, nach Länge des Schachts) und
 * **steigt aus** (wieder eine Interaktion). Während der Fahrt ist das
 * Monster in keinem Raum und für niemanden auf der Karte zu sehen
 * (`concealed`); die Klappe, an der es ein- oder aussteigt, steht in dieser
 * Zeit offen — das ist das Einzige, was ein Techniker davon mitbekommt.
 *
 * Die Maschine kennt nur Zeit und Klappen. Wer sie steuert — die KI
 * (`ventPilot.ts`) oder ein Spieler in der Monster-Rolle — ruft `enter` und
 * `exit`; wer keinen Aufruf macht, bleibt im Schacht sitzen. Ein Wechsel
 * der Steuerung mitten in der Fahrt ist deshalb harmlos: Der Zustand liegt
 * hier und nicht beim Steuernden.
 */
export type VentPhase = 'out' | 'entering' | 'riding' | 'arrived' | 'exiting';

/** Wie lange das Einsteigen dauert, in Sekunden. */
export const VENT_ENTER_SECONDS = 1.2;
/** Und das Aussteigen. */
export const VENT_EXIT_SECONDS = 0.9;
/** Wie schnell es durch den Schacht geht, in Metern je Sekunde. */
export const VENT_SPEED = 3.5;
/** Kürzer als das dauert keine Fahrt. */
export const VENT_MIN_RIDE = 2.5;

export type VentEvent = '' | 'entered' | 'arrived' | 'exited' | 'cancelled';

export interface VentRider {
  x: number;
  z: number;
  yaw: number;
  space: string;
}

export class VentTravel {
  phase: VentPhase = 'out';
  from: VentFlap | null = null;
  to: VentFlap | null = null;
  /** Wie lange die laufende Phase noch dauert, in Sekunden. */
  timer = 0;
  private total = 0;
  /** Wann die letzte Fahrt zu Ende ging — für die Pause der KI. */
  lastExit = -Infinity;

  constructor(private readonly net: VentNet) {}

  get busy(): boolean {
    return this.phase !== 'out';
  }

  /** Ob das Monster gerade im Schacht sitzt — für niemanden sichtbar. */
  get concealed(): boolean {
    return this.phase === 'riding' || this.phase === 'arrived';
  }

  /** Wie weit die laufende Phase ist, von 0 bis 1. */
  get progress(): number {
    return this.total > 0 ? 1 - Math.max(0, this.timer) / this.total : 1;
  }

  /** Die Klappe, an der gerade etwas passiert — für den Zustand `open` auf der Karte. */
  get openFlap(): VentFlap | null {
    if (this.phase === 'entering') return this.from;
    if (this.phase === 'exiting') return this.to;
    return null;
  }

  /** Wohin man von der Klappe aus fahren könnte, an der der Reiter steht. */
  targetsFrom(at: MapPoint): { flap: VentFlap; targets: readonly VentFlap[] } | null {
    const flap = this.net.nearest(at);
    return flap ? { flap, targets: this.net.linked(flap.id) } : null;
  }

  /**
   * Einsteigen: Der Reiter muss vor einer Klappe stehen, und die Klappe
   * muss ein Ziel haben. `choice` wählt unter mehreren Zielen (Datenreihenfolge).
   * Gibt `false` zurück, wenn hier nichts einzusteigen ist.
   */
  enter(rider: VentRider, choice = 0): boolean {
    if (this.busy) return false;
    const found = this.targetsFrom(rider);
    if (!found || found.targets.length === 0) return false;
    const target = found.targets[Math.max(0, Math.min(found.targets.length - 1, choice))]!;
    this.from = found.flap;
    this.to = target;
    this.phase = 'entering';
    this.total = this.timer = VENT_ENTER_SECONDS;
    rider.x = found.flap.approach.x;
    rider.z = found.flap.approach.z;
    rider.yaw = found.flap.yaw;
    return true;
  }

  /** Aussteigen, sobald die Fahrt angekommen ist. */
  exit(): boolean {
    if (this.phase !== 'arrived') return false;
    this.phase = 'exiting';
    this.total = this.timer = VENT_EXIT_SECONDS;
    return true;
  }

  /** Das Einsteigen abbrechen, solange es noch nicht losgefahren ist. */
  cancel(): boolean {
    if (this.phase !== 'entering') return false;
    this.phase = 'out';
    this.from = this.to = null;
    return true;
  }

  /**
   * Ein Zeitschritt. Bewegt den Reiter selbst: Beim Losfahren steht er an
   * der Einstiegsklappe, beim Ankommen an der Zielklappe — dazwischen ist er
   * nirgends. `autoExit` lässt die KI sofort aussteigen; ein Spieler muss
   * den Knopf drücken.
   */
  step(dt: number, rider: VentRider, autoExit: boolean): VentEvent {
    if (!this.busy) return '';
    this.timer -= Math.max(0, dt);
    if (this.phase === 'entering') {
      if (this.timer > 0) return '';
      const length = this.net.length(this.from!.id, this.to!.id);
      this.phase = 'riding';
      this.total = this.timer = Math.max(VENT_MIN_RIDE, length / VENT_SPEED);
      rider.x = this.from!.at.x;
      rider.z = this.from!.at.z;
      return 'entered';
    }
    if (this.phase === 'riding') {
      if (this.timer > 0) return '';
      this.phase = 'arrived';
      this.total = this.timer = 0;
      rider.x = this.to!.at.x;
      rider.z = this.to!.at.z;
      rider.space = this.to!.roomId;
      if (autoExit) this.exit();
      return 'arrived';
    }
    if (this.phase === 'arrived') {
      if (autoExit) this.exit();
      return '';
    }
    // exiting
    if (this.timer > 0) return '';
    const flap = this.to!;
    rider.x = flap.approach.x;
    rider.z = flap.approach.z;
    rider.yaw = flap.yaw + Math.PI;
    rider.space = flap.roomId;
    this.phase = 'out';
    this.from = this.to = null;
    this.total = 0;
    return 'exited';
  }

  /** Alles zurück auf den Boden — für eine neue Runde. */
  reset(): void {
    this.phase = 'out';
    this.from = this.to = null;
    this.timer = this.total = 0;
  }
}
