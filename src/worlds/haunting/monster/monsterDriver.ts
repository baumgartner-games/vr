import type { RoutineOutput } from '../monsterRoutine';
import type { RoleHost } from '../registry/roles';
import type { VentPhase } from '../vents/ventTravel';

/**
 * **Wer das Monster steuert** — die zwei Schnittstellen der Monster-Rolle.
 *
 * `MonsterDriver` ist die Seite der **Simulation**: Die 2D-Runde
 * (`map/flatRound.ts`) fragt in jedem Bild, ob ein Spieler am Steuer sitzt,
 * und nimmt dann dessen Entscheidung statt der Routine — in **derselben
 * Form** (`RoutineOutput`), damit alles dahinter (Kabinenangriff, Treffer,
 * Bewegung, Snapshot) nicht wissen muss, wer entschieden hat. Sitzt niemand
 * am Steuer, rechnet die KI weiter, ohne dass jemand etwas umschalten müsste.
 *
 * `MonsterPort` ist die Seite der **Ansicht**: Stock, ein Knopf, die Wahl
 * unter mehreren Schachtzielen und ein Stand für die Anzeige. Die Ansicht
 * findet ihren Port über `host.extra` (`monsterPortOf`) — der `RoleHost` des
 * 2D-Kerns kennt keine Monstersteuerung, und die Registry soll sie nicht
 * kennen müssen; wer eine Monster-Rolle anbietet, legt einen Port dazu.
 */
export interface MonsterDriver {
  /** Ob gerade ein Spieler steuert; sonst rechnet die Routine. */
  active(): boolean;
  /** Die Entscheidung für dieses Bild — dieselbe Form wie die der Routine. */
  decide(dt: number): RoutineOutput;
}

export interface MonsterInput {
  /** Der Stock: `x` nach Osten, `z` nach Süden, beide in [-1, 1]. */
  x: number;
  z: number;
  sprint: boolean;
}

/**
 * Der eine Knopf. **Zuschlagen ist keiner**: Wer in Reichweite steht, wird
 * getroffen, ohne dass jemand tippen muss (`monsterHelm.ts`).
 */
export type MonsterAction = 'interact';

export type MonsterTargetKind = 'vent' | 'cabin' | 'door' | 'ride';

/**
 * **Woran das Monster gerade etwas tun kann** — genau eines, das nächste.
 * Die Ansicht hebt es auf der Karte hervor, der Knopf meint es.
 */
export interface MonsterTarget {
  kind: MonsterTargetKind;
  /** Klappe: die Klappe. Kabine: der Raum. Tür: die Tür. Fahrt: leer. */
  id: string;
  at: { x: number; z: number };
  /** Was der Knopf sagt. */
  label: string;
}

export interface MonsterStatus {
  /** Wo das Monster in der Fahrt steht, und wie weit die Phase ist. */
  ride: VentPhase;
  progress: number;
  /** Was der Knopf „Interagieren" gerade täte — leer, wenn nichts. */
  prompt: string;
  /** Die Erscheinung, wie sie am Marker steht. */
  label: string;
}

export interface MonsterPort {
  /** Den Platz nehmen; `false`, wenn ihn schon jemand hat. */
  claim(): boolean;
  /** Den Platz räumen — die KI übernimmt im nächsten Bild. */
  release(): void;
  claimed(): boolean;
  input(stick: MonsterInput): void;
  /** Ein Knopf; die Antwort ist eine Zeile für den Spieler oder leer. */
  act(action: MonsterAction): string;
  /** Das nächste Ding in Reichweite, das der Knopf meint — für die Hervorhebung. */
  target?(): MonsterTarget | null;
  /** Wohin der Schacht vor dem Monster führt, als Knöpfe; leer ohne Klappe. */
  ventTargets(): ReadonlyArray<{ index: number; label: string }>;
  /** Welches der Ziele die nächste Fahrt nimmt. */
  chooseVent(index: number): void;
  status(): MonsterStatus;
}

/** Den Port aus `host.extra` holen — untypisiert per Vertrag, deshalb hier geprüft. */
export function monsterPortOf(host: RoleHost): MonsterPort | null {
  const extra = host.extra as { monster?: unknown } | null | undefined;
  const port = extra?.monster as Partial<MonsterPort> | undefined;
  if (
    port &&
    typeof port.claim === 'function' &&
    typeof port.release === 'function' &&
    typeof port.input === 'function' &&
    typeof port.act === 'function' &&
    typeof port.status === 'function'
  )
    return port as MonsterPort;
  return null;
}
