/**
 * **Wer spielt mit — und wer davon ist ein Mensch.**
 *
 * Bevor eine Runde anfängt, in 2D wie in 3D, wird verteilt: der Techniker
 * (Mensch oder Bot), das Monster (Mensch, Bot oder aus — der sichere Test)
 * und die Plätze in der Einsatzzentrale — beliebig viele, jeder mit einer
 * Rolle (Archivar, Schalttafel, Späher) und der Frage, ob dort ein Mensch am
 * Telefon sitzt oder ein Bot.
 *
 * **Ein Bot auf einem Platz heißt: Der Techniker bekommt die Fähigkeit dieses
 * Platzes selbst.** Wer allein spielt, hat sonst niemanden, der ihm zuruft,
 * wo das Monster ist, welche Tür zu ist und welcher Code am Schrank gilt —
 * also sieht er es auf seiner Karte (`map/flatMode.ts`, `SoloPowers`). Ein
 * Mensch auf dem Platz nimmt dem Techniker diese Auskunft wieder ab: Dann
 * sagt sie ihm ein Mitspieler, oder niemand.
 *
 * Reine Daten, ohne DOM: Die Tafel im Van (`roundSetupPanel.ts`), das
 * Optionsmenü der 2D-Welt und das Menü in der Brille lesen und schreiben
 * dieselbe Einstellung, gemerkt im Browser (`SETUP_STORAGE`).
 */
import type { FlatRole } from '../map/flatRound';

export type Who = 'human' | 'bot';
export type MonsterWho = Who | 'off';
export type SeatRole = 'archive' | 'panel' | 'scout';

export interface Seat {
  role: SeatRole;
  who: Who;
}

export interface RoundSetup {
  technician: Who;
  monster: MonsterWho;
  seats: Seat[];
}

/** Welche Fähigkeiten der Techniker aus den Bot-Plätzen bekommt. */
export interface SoloPowers {
  /**
   * Späher: das **Horchbild** der Station auf der Karte — die Geräusche der
   * letzten Sekunden, als Probe alle paar Sekunden. Nicht die Stelle, an der
   * das Monster steht: Wer die kennt, dem kann sich niemand mehr auflauern.
   */
  scout: boolean;
  /** Schalttafel: Türen und Lampen per Tipp auf die Karte. */
  panel: boolean;
  /** Archivar: Ein Tipp auf ein Zimmer schlägt die Akte mit den Codes auf. */
  archive: boolean;
}

export const SETUP_STORAGE = 'bgvr.haunting.setup.v1';

export const SEAT_ROLES: readonly SeatRole[] = ['archive', 'panel', 'scout'];

export const SEAT_LABELS: Readonly<Record<SeatRole, string>> = {
  archive: 'Archivar',
  panel: 'Schalttafel',
  scout: 'Späher',
};

export const SEAT_HINTS: Readonly<Record<SeatRole, string>> = {
  archive: 'Räume, Fundorte und Codes',
  panel: 'Türen und Lampen schalten',
  scout: 'Horchbild der Station',
};

export const WHO_LABELS: Readonly<Record<MonsterWho, string>> = {
  human: 'Mensch',
  bot: 'Bot',
  off: 'Aus',
};

/** Der Anfang: ein Mensch als Techniker, das Monster aus Zahlen, drei Bot-Plätze. */
export function defaultSetup(): RoundSetup {
  return {
    technician: 'human',
    monster: 'bot',
    seats: SEAT_ROLES.map((role) => ({ role, who: 'bot' })),
  };
}

/** Aus fremdem Text (Speicher) eine gültige Einstellung — Unbekanntes wird ersetzt. */
export function readSetup(value: unknown): RoundSetup {
  const fallback = defaultSetup();
  if (!value || typeof value !== 'object') return fallback;
  const bag = value as Record<string, unknown>;
  const who = (v: unknown, or: Who): Who => (v === 'human' || v === 'bot' ? v : or);
  const seats: Seat[] = Array.isArray(bag['seats'])
    ? (bag['seats'] as unknown[])
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
        .map((s) => ({
          role: SEAT_ROLES.includes(s['role'] as SeatRole) ? (s['role'] as SeatRole) : 'archive',
          who: who(s['who'], 'bot'),
        }))
        .slice(0, 8)
    : fallback.seats;
  return {
    technician: who(bag['technician'], fallback.technician),
    monster:
      bag['monster'] === 'off'
        ? 'off'
        : who(bag['monster'], fallback.monster === 'off' ? 'bot' : fallback.monster),
    seats,
  };
}

export function loadSetup(
  storage: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined'
    ? null
    : localStorage,
): RoundSetup {
  try {
    const raw = storage?.getItem(SETUP_STORAGE);
    return readSetup(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultSetup();
  }
}

export function saveSetup(
  setup: RoundSetup,
  storage: Pick<Storage, 'setItem'> | null = typeof localStorage === 'undefined'
    ? null
    : localStorage,
): void {
  try {
    storage?.setItem(SETUP_STORAGE, JSON.stringify(setup));
  } catch {
    // Ein privates Fenster ohne Speicher darf die Wahl nicht verhindern.
  }
}

/**
 * Was der Techniker aus den Plätzen bekommt: jede Rolle, an der ein Bot
 * sitzt. Zwei Plätze derselben Rolle sind erlaubt — ein Mensch und ein Bot
 * heißt dann: der Mensch hat es auch, der Techniker ebenso.
 */
export function powersOf(setup: RoundSetup): SoloPowers {
  const has = (role: SeatRole): boolean =>
    setup.seats.some((seat) => seat.role === role && seat.who === 'bot');
  return { scout: has('scout'), panel: has('panel'), archive: has('archive') };
}

/**
 * Wen der Spieler in der 2D-Welt spielt. Die 2D-Welt ist ein Gerät und ein
 * Mensch: Ein Techniker aus Fleisch gewinnt gegen ein Monster aus Fleisch,
 * weil der Stock nur einem gehören kann.
 *
 * Der dritte Fall hieß einmal `bot`, und das war die Sicht der Maschine: Ja,
 * der Techniker aus Zahlen läuft dann die Runde — aber der Mensch davor
 * **sieht zu**, und genau das steht jetzt auch dran (`watch`). Der Bot bleibt
 * innen drin (`rules/technicianBot.ts`), er ist nur keine Rolle mehr, die
 * jemand wählt.
 */
export function flatRoleOf(setup: RoundSetup): FlatRole {
  if (setup.technician === 'human') return 'technician';
  if (setup.monster === 'human') return 'monster';
  return 'watch';
}

/**
 * **Wie viele in einer Runde mitspielen** — der Techniker, das Monster (wenn
 * es eines gibt) und jeder Platz der Zentrale, ob dort ein Mensch oder ein Bot
 * sitzt. Zwei heißt: Techniker gegen Monster, sonst niemand. Ab drei läuft
 * jede Reaktion über eine Absprache, und die kostet Zeit
 * (`rules/doorSeal.ts`) — genau daran hängen die zwei Zielbänder des
 * Trainings (`botTraining.TRAINING_TARGETS`).
 */
export function crewSize(setup: RoundSetup): number {
  return 1 + (setup.monster === 'off' ? 0 : 1) + setup.seats.length;
}

/** Die drei Rundenarten der 3D-Welt — dort steuert nur der Techniker aus Fleisch. */
export function roundKindOf(setup: RoundSetup): 'bot' | 'mission' | 'test' {
  if (setup.technician === 'bot') return 'bot';
  return setup.monster === 'off' ? 'test' : 'mission';
}

/** Die Einstellung, die eine der drei Kacheln meint — die Plätze bleiben, wie sie sind. */
export function presetFor(kind: 'bot' | 'mission' | 'test', setup: RoundSetup): RoundSetup {
  return {
    ...setup,
    technician: kind === 'bot' ? 'bot' : 'human',
    monster: kind === 'test' ? 'off' : setup.monster === 'off' ? 'bot' : setup.monster,
  };
}

/** Eine Zeile, die die Einstellung zusammenfasst — für Anzeigen. */
export function describeSetup(setup: RoundSetup): string {
  const seats = setup.seats.length
    ? setup.seats.map((seat) => `${SEAT_LABELS[seat.role]} (${WHO_LABELS[seat.who]})`).join(', ')
    : 'keine Plätze';
  return `Techniker: ${WHO_LABELS[setup.technician]} · Monster: ${WHO_LABELS[setup.monster]} · Zentrale: ${seats}`;
}

/** Das Monster durchschalten: Bot → Mensch → Aus → Bot. */
export function cycleMonster(who: MonsterWho): MonsterWho {
  return who === 'bot' ? 'human' : who === 'human' ? 'off' : 'bot';
}

export function cycleWho(who: Who): Who {
  return who === 'bot' ? 'human' : 'bot';
}

export function cycleSeatRole(role: SeatRole): SeatRole {
  return SEAT_ROLES[(SEAT_ROLES.indexOf(role) + 1) % SEAT_ROLES.length]!;
}
