/**
 * **Wer eine Tür sperrt, und wie lange sie zu bleibt.**
 *
 * `HauntState.shut` sagt nur, *dass* eine Tür zu ist — nicht, warum. Für die
 * Schalttafel macht das den Unterschied zwischen einem Spiel und einem
 * Schaltplan: Wer alle Türen auf einmal sperren kann, sperrt alle, und das
 * Monster steht in einer Kammer, der Techniker in einer anderen, und niemand
 * muss mehr etwas entscheiden. Deshalb gelten hier zwei Regeln, und beide
 * sind reine Rechnung ohne three.js und ohne Netz:
 *
 * - **Gewollt gesperrt ist immer nur eine Tür.** Wer eine zweite wählt — an
 *   der Tafel, am Telefon oder vor Ort mit der Hand —, gibt die erste damit
 *   frei. Die Tafel ist damit keine Wand aus Riegeln, sondern *ein* Riegel,
 *   den man klug setzen muss.
 * - **Zugefallene Türen gehen von selbst wieder auf.** Was das Monster
 *   zuschlägt (`haunt.ts`), hält `SLAM_HOLD` Sekunden — lang genug, dass ein
 *   Weg gerade jetzt versperrt ist, kurz genug, dass niemand deswegen
 *   aufgibt. Wer an der Tafel sitzt, darf so eine Tür auch vorher freigeben.
 *
 * Die Buchführung (`DoorLocks`) liegt beim Gastgeber und geht nicht über die
 * Leitung: Alle anderen sehen nur die Liste der zugefallenen Türen, und die
 * bleibt, was sie war.
 */

/** Wie lange eine zugeschlagene Tür von selbst zu bleibt, in Sekunden. */
export const SLAM_HOLD = 20;

export interface DoorLocks {
  /** Die eine gewollt gesperrte Tür — `''`, wenn keine. */
  chosen: string;
  /** Die zugefallenen Türen und wann sie von selbst aufgehen (Rundenzeit). */
  slams: Array<{ id: string; until: number }>;
}

export function freshLocks(): DoorLocks {
  return { chosen: '', slams: [] };
}

/** Ob diese Tür die gewollt gesperrte ist. */
export function isChosen(locks: DoorLocks, id: string): boolean {
  return locks.chosen === id;
}

/** Wann eine zugefallene Tür von selbst aufgeht — `null`, wenn sie nicht zugefallen ist. */
export function slamUntil(locks: DoorLocks, id: string): number | null {
  return locks.slams.find((slam) => slam.id === id)?.until ?? null;
}

/**
 * **Eine Tür gewollt sperren.** Die vorher gewählte geht dabei auf; war die
 * Tür nur zugefallen, wird sie zur gewählten und läuft nicht mehr ab.
 *
 * @returns die neue Liste der zugefallenen Türen.
 */
export function chooseLock(locks: DoorLocks, shut: readonly string[], id: string): string[] {
  const next = shut.filter((one) => one !== locks.chosen && one !== id);
  next.push(id);
  locks.chosen = id;
  locks.slams = locks.slams.filter((slam) => slam.id !== id);
  return next;
}

/** **Eine Tür freigeben** — gewählt oder zugefallen, für die Tafel ist das dasselbe. */
export function releaseLock(locks: DoorLocks, shut: readonly string[], id: string): string[] {
  if (locks.chosen === id) locks.chosen = '';
  locks.slams = locks.slams.filter((slam) => slam.id !== id);
  return shut.filter((one) => one !== id);
}

/**
 * **Gewollt sperren oder freigeben** — der Schalter, wie ihn Tafel und
 * Techniker bedienen: zu, wenn offen; auf, wenn zu.
 */
export function toggleLock(
  locks: DoorLocks,
  shut: readonly string[],
  id: string,
): { shut: string[]; locked: boolean } {
  if (shut.includes(id)) return { shut: releaseLock(locks, shut, id), locked: false };
  return { shut: chooseLock(locks, shut, id), locked: true };
}

/** **Eine Tür fällt zu** (der Spuk): sie hält `SLAM_HOLD` Sekunden ab `time`. */
export function slamDoor(
  locks: DoorLocks,
  shut: readonly string[],
  id: string,
  time: number,
): string[] {
  if (shut.includes(id)) return [...shut];
  locks.slams = [...locks.slams.filter((slam) => slam.id !== id), { id, until: time + SLAM_HOLD }];
  return [...shut, id];
}

/**
 * **Ein Schritt der Uhr**: Zugefallene Türen, deren Zeit um ist, gehen auf;
 * Buchführung über Türen, die inzwischen anders geöffnet wurden (Holz
 * splittert, ein alter Stand vom Netz), wird weggeräumt.
 *
 * @returns die neue Liste und die Türen, die gerade von selbst aufgegangen sind.
 */
export function stepLocks(
  locks: DoorLocks,
  shut: readonly string[],
  time: number,
): { shut: string[]; opened: string[] } {
  const opened: string[] = [];
  locks.slams = locks.slams.filter((slam) => {
    if (!shut.includes(slam.id)) return false;
    if (slam.until <= time) {
      opened.push(slam.id);
      return false;
    }
    return true;
  });
  if (locks.chosen && !shut.includes(locks.chosen)) locks.chosen = '';
  return { shut: shut.filter((id) => !opened.includes(id)), opened };
}
