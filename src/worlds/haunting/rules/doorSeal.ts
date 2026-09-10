import { PRY_BASE, PRY_COOLDOWN, PRY_GAIN } from './doorLocks';

/**
 * **Die Tür, die hinter dem Techniker zufällt.**
 *
 * Ein Techniker allein gegen ein Monster hat nichts in der Hand: Er ist
 * langsamer als es, er muss stehen bleiben, um zu arbeiten, und wenn es ihn
 * einmal hat, hat es ihn. Die eine Sache, die er kann und das Monster nicht,
 * ist **eine Tür**. Also darf er sie zumachen — nicht als Knopf, den man im
 * Moment der Berührung findet, sondern als das, was ein Mensch auf der Flucht
 * wirklich tut: Er geht hindurch, und sie fällt hinter ihm ins Schloss.
 *
 * Verriegelt wird über denselben einen Riegel wie überall (`doorLocks.ts`,
 * `chooseLock`): eine Tür auf einmal, acht bis zehn Sekunden, und das Monster
 * kann daran ziehen. Im Mittel kostet es das gut drei Züge — `SEAL_HOLD`
 * Sekunden. Genau diese Zahl ist der Gewinn, und deshalb steht sie hier
 * ausgerechnet und nicht geraten.
 *
 * **Wie schnell die Tür zugeht, hängt daran, wer sie zumacht.**
 *
 * - **Zwei Spieler** (Techniker gegen Monster): Der Techniker macht sie
 *   selbst zu, im Vorbeigehen. Keine Verzögerung.
 * - **Drei und mehr**: Die Tür gehört der Schalttafel, und die sitzt woanders.
 *   Er muss es **sagen** („schließ die Tür hinter mir"), und der andere muss
 *   es hören und drücken — `COMMAND_DELAY` Sekunden, ein bis zwei. In der Zeit
 *   ist ein rennendes Monster fünf Meter weiter, und manchmal ist es dann
 *   schon durch. Mehr Leute heißt hier nicht mehr Sicherheit, sondern mehr
 *   Reibung; die Zentrale zahlt sie mit Wissen zurück, das der Einzelne
 *   nicht hat.
 *
 * Reine Rechnung, ohne DOM und ohne Netz: Die 2D-Runde (`map/flatRound.ts`)
 * und die Simulation des Trainings (`roundSim.ts`) benutzen dieselbe.
 */

/** Wie lange eine so verriegelte Tür das Monster im Mittel aufhält, in Sekunden. */
export const SEAL_HOLD = pryDelay();

/** Wie lange ein Zuruf an die Zentrale braucht, bis er ausgeführt ist: von, bis. */
export const COMMAND_DELAY: readonly [number, number] = [1, 2];

/** Ab so vielen Mitspielern läuft der Riegel über die Zentrale statt über die Hand. */
export const CREW_SIZE = 3;

/**
 * Die mittlere Wartezeit, bis ein Riegel aufgeht — aus den Zahlen von
 * `pryLock`: Der erste Zug geht nie auf, danach steigt die Aussicht. Kein
 * geratener Wert, sondern der Erwartungswert derselben Würfel.
 */
function pryDelay(): number {
  let left = 1;
  let mean = 0;
  for (let tries = 1; tries <= 12 && left > 1e-6; tries++) {
    const chance = tries < 2 ? 0 : Math.min(1, PRY_BASE + (tries - 2) * PRY_GAIN);
    mean += left * chance * tries * PRY_COOLDOWN;
    left *= 1 - chance;
  }
  return Math.round((mean + left * 12 * PRY_COOLDOWN) * 100) / 100;
}

/**
 * **Wie lange eine Absprache kostet.** Wer allein ist, handelt selbst: null.
 * Wer eine Zentrale hat, muss es sagen, und der andere muss es hören,
 * verstehen und drücken — ein bis zwei Sekunden. Dieselbe Reibung gilt für
 * jede Reaktion, die über das Team läuft: die Tür hinter dem Rücken **und**
 * die Warnung, dass da etwas kommt.
 */
export function commandLag(players: number, roll: () => number = Math.random): number {
  if (players < CREW_SIZE) return 0;
  return COMMAND_DELAY[0] + roll() * (COMMAND_DELAY[1] - COMMAND_DELAY[0]);
}

/** Der Riegel, der gleich fällt: welche Tür, wann — und woher der Auftrag kam. */
export interface DoorSeal {
  /** Die vorgemerkte Tür; `''`, wenn keine aussteht. */
  pending: string;
  /** Wann sie zugeht, in Rundensekunden. */
  at: number;
  /** Ob der Auftrag über die Zentrale läuft — dann ist er zu hören. */
  relayed: boolean;
}

export function freshSeal(): DoorSeal {
  return { pending: '', at: 0, relayed: false };
}

/**
 * **Der Techniker ist durch eine Tür und wird verfolgt** — merkt sie vor.
 * Eine schon vorgemerkte wird ersetzt: Es gilt immer die letzte, durch die er
 * gegangen ist, denn hinter der steht das Monster.
 */
export function askSeal(
  seal: DoorSeal,
  doorId: string,
  time: number,
  players: number,
  roll: () => number = Math.random,
): void {
  const delay = commandLag(players, roll);
  seal.pending = doorId;
  seal.at = time + delay;
  seal.relayed = delay > 0;
}

/** Die Tür, die **jetzt** zugeht — `''`, wenn nichts fällig ist. Verbraucht den Auftrag. */
export function dueSeal(seal: DoorSeal, time: number): string {
  if (!seal.pending || time < seal.at) return '';
  const id = seal.pending;
  seal.pending = '';
  return id;
}
