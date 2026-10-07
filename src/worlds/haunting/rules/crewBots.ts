import { COLOURS, withWho, type RoundSetup, type SeatColour, type SeatId } from './roundSetup';

/**
 * **Rundentyp und Bots der Einsatzzentrale** — der Rechner
 * _Spiel-Einstellungen_ (`HauntingWorld.menu`).
 *
 * Gewünscht (Oktober 2026): _„ich muss/möchte gar nicht definieren wer da dran
 * sitzen soll/muss da wir einen weiteren punkt haben für bots in der
 * einsatzzentrale (anzahl 0, 1, 2, 3, 4) […] Die bots würden bei rundenbeginn
 * ja in der einsatzzentrale sein und wenn die runde beginnt, würden die
 * warten, bis alle spieler die dabei sind, sich für eine rolle/platz
 * entschieden haben, bevor diese die anderen rollen einnehmen. Wenn z. B. am
 * ende das monster und ein platz am computer frei ist, wird das monster
 * priorisiert […] Ein bot wird nie den platz eines spielers klauen."_
 *
 * Also stellt niemand mehr „Mensch · Bot · Aus" je Platz ein. Wer spielt, nimmt
 * seinen Platz selbst — Techniker-Anzug, Monster-Anzug, ein Rechner der
 * Zentrale —, und beim Start füllt `fillSeats` die Lücken mit den Bots, die
 * in der Zentrale stehen, in einer festen Reihenfolge.
 *
 * Reine Rechnung, ohne three.js und ohne Netz.
 */

/** Übungsrunde (kein Monster, hell) oder echte Runde. */
export type RoundType = 'practice' | 'real';

export interface CrewSettings {
  type: RoundType;
  /** Wie viele Bots in der Einsatzzentrale stehen — 0 bis `MAX_BOTS`. */
  bots: number;
  /**
   * **Wie schnell das Monster neben dem Spieler laufen darf** — ein Faktor auf
   * das Gehtempo des Technikers (`mission.PLAYER_WALK_SPEED`), über das das
   * Monster nie hinauskommt (`monsterSpeedCap`). Gewünscht: _„anpassen können
   * den Modifikator, wie viel schneller das Monster laufen kann. Am besten
   * sollen beide erstmal gleich schnell laufen können"_ — Vorgabe 1.
   */
  monsterPace: number;
}

export const MAX_BOTS = 4;
export const CREW_STORAGE = 'bgvr.haunting.crew.v1';

/** Gewünscht: _„per default sollen 4 bots in der einsatzzentrale stehen"_. */
export function defaultCrew(): CrewSettings {
  return { type: 'practice', bots: MAX_BOTS, monsterPace: 1 };
}

/**
 * **Die Stufen des Monster-Tempos**, relativ zum Spieler. Bei 1,75 liegt der
 * Deckel über allem, was die Gewichte hergeben — das ist das Monster wie vor
 * der Einstellung (Jagd bis 4,55 m/s).
 */
export const MONSTER_PACES: readonly number[] = [1, 1.1, 1.25, 1.5, 1.75];

/** „gleich schnell", „+10 %" … — so steht die Stufe im Menü. */
export function monsterPaceLabel(pace: number): string {
  return pace <= 1 ? 'gleich schnell' : `+${Math.round((pace - 1) * 100)} %`;
}

/** Die nächste Stufe: reihum, nach der letzten wieder „gleich schnell". */
export function nextMonsterPace(pace: number): number {
  const at = MONSTER_PACES.findIndex((one) => Math.abs(one - pace) < 0.001);
  return MONSTER_PACES[(at + 1) % MONSTER_PACES.length]!;
}

/** Eine gelesene Stufe auf eine bekannte ziehen — fremde Zahlen werden die nächste. */
export function clampMonsterPace(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  return MONSTER_PACES.reduce((best, one) =>
    Math.abs(one - value) < Math.abs(best - value) ? one : best,
  );
}

export const ROUND_TYPE_LABELS: Readonly<Record<RoundType, string>> = {
  practice: 'Übungsrunde',
  real: 'Echte Runde',
};

export function readCrewSettings(value: unknown): CrewSettings {
  const fallback = defaultCrew();
  if (!value || typeof value !== 'object') return fallback;
  const bag = value as Record<string, unknown>;
  const bots = bag['bots'];
  return {
    type: bag['type'] === 'real' ? 'real' : 'practice',
    bots:
      typeof bots === 'number' && Number.isFinite(bots)
        ? Math.max(0, Math.min(MAX_BOTS, Math.round(bots)))
        : fallback.bots,
    monsterPace: clampMonsterPace(bag['monsterPace']),
  };
}

export function loadCrew(
  storage: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined'
    ? null
    : localStorage,
): CrewSettings {
  try {
    const raw = storage?.getItem(CREW_STORAGE);
    return readCrewSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultCrew();
  }
}

export function saveCrew(
  crew: CrewSettings,
  storage: Pick<Storage, 'setItem'> | null = typeof localStorage === 'undefined'
    ? null
    : localStorage,
): void {
  try {
    storage?.setItem(CREW_STORAGE, JSON.stringify(crew));
  } catch {
    // Ein privates Fenster ohne Speicher darf die Wahl nicht verhindern.
  }
}

/** Die nächste Anzahl Bots: 0 → 1 → … → 4 → 0. */
export function nextBotCount(bots: number): number {
  return (bots + 1) % (MAX_BOTS + 1);
}

/** Wer seinen Platz schon selbst genommen hat — Menschen, keine Bots. */
export interface Takers {
  /** Ein Mensch trägt den Techniker-Anzug. */
  technician: boolean;
  /** Ein Mensch trägt den Monster-Anzug oder sitzt am Monster. */
  monster: boolean;
  /** Die Farbplätze, an denen ein Mensch sitzt. */
  colours: ReadonlySet<SeatColour>;
}

export interface SeatFill {
  setup: RoundSetup;
  /** Welche Plätze Bots übernehmen, in der Reihenfolge, in der sie vergeben wurden. */
  bots: SeatId[];
  /** Ein Platz, ohne den die Runde nicht geht und den niemand nimmt — oder `null`. */
  missing: 'technician' | 'monster' | null;
}

/**
 * **Die Plätze füllen.** Menschen behalten, was sie genommen haben; die Bots
 * nehmen den Rest, einer je Platz, in dieser Reihenfolge:
 *
 * 1. **Techniker** — ohne ihn gibt es keine Runde.
 * 2. **Monster** — nur in der echten Runde; ohne es wäre sie keine (_„wird
 *    das monster priorisiert"_). In der Übungsrunde bleibt es aus.
 * 3. **Rot, Gelb, Blau** — solange Bots übrig sind; sonst bleibt der Platz leer.
 *
 * Die Fähigkeiten der Plätze bleiben, wie sie eingestellt sind.
 */
export function fillSeats(setup: RoundSetup, crew: CrewSettings, takers: Takers): SeatFill {
  let left = Math.max(0, Math.min(MAX_BOTS, crew.bots));
  const bots: SeatId[] = [];
  let missing: SeatFill['missing'] = null;
  let next = setup;
  const take = (seat: SeatId): boolean => {
    if (left <= 0) return false;
    left--;
    bots.push(seat);
    next = withWho(next, seat, 'bot');
    return true;
  };

  if (takers.technician) next = withWho(next, 'technician', 'human');
  else if (!take('technician')) missing = 'technician';

  if (crew.type === 'practice') next = withWho(next, 'monster', 'off');
  else if (takers.monster) next = withWho(next, 'monster', 'human');
  else if (!take('monster')) missing ??= 'monster';

  for (const colour of COLOURS) {
    if (takers.colours.has(colour)) next = withWho(next, colour, 'human');
    else if (!take(colour)) next = withWho(next, colour, 'off');
  }
  return { setup: next, bots, missing };
}

/** Was beim Start fehlt, als Satz. */
export const MISSING_TEXT: Readonly<Record<'technician' | 'monster', string>> = {
  technician:
    'Niemand trägt den Techniker-Anzug und kein Bot steht in der Zentrale — Anzug anziehen oder Bots dazuholen.',
  monster:
    'Für die echte Runde fehlt das Monster: Monster-Anzug anziehen oder einen Bot mehr in die Zentrale holen.',
};
