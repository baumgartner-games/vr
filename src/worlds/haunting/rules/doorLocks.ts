/**
 * **Wer eine Tür sperrt, wie lange sie zu bleibt, und wie man sie aufbekommt.**
 *
 * `HauntState.shut` sagt nur, *dass* eine Tür zu ist — nicht, warum. Für die
 * Schalttafel macht das den Unterschied zwischen einem Spiel und einem
 * Schaltplan: Wer alle Türen auf einmal sperren kann, sperrt alle, und das
 * Monster steht in einer Kammer, der Techniker in einer anderen, und niemand
 * muss mehr etwas entscheiden. Deshalb gelten hier drei Regeln, und alle drei
 * sind reine Rechnung ohne three.js und ohne Netz:
 *
 * - **Gewollt gesperrt ist immer nur eine Tür — und sie hält, bis sie von
 *   selbst fällt.** Wer eine zweite wählt — an der Tafel, am Telefon oder
 *   vor Ort mit der Hand —, bekommt sie nicht (`'busy'`), solange die erste
 *   noch zu ist; und die erste bekommt er auch nicht vorher wieder auf
 *   (`'held'`). Lange gab die zweite Wahl die erste frei, und ein zweiter
 *   Tipp öffnete sie sofort — damit war der Riegel ein Schalter, den man im
 *   Takt umlegen konnte: sperren, freigeben, die nächste sperren, und das
 *   Monster stand vor einer Wand aus Riegeln, die man von Tür zu Tür trug.
 *   Der Besitzer wollte das nicht: Ein Riegel ist eine Entscheidung mit
 *   Frist, und die nächste Entscheidung gibt es erst, wenn die Frist um ist.
 *   Die Tafel ist damit *ein* Riegel, den man klug setzen muss.
 * - **Keine Sperre hält ewig.** Was das Monster zuschlägt (`haunt.ts`), hält
 *   `SLAM_HOLD` Sekunden; was ein Spieler von Hand sperrt, hält `HOLD_RANGE`
 *   — acht bis zehn Sekunden, leicht gewürfelt, damit niemand mitzählen kann.
 *   Eine Tür, die für immer zu bleibt, ist keine Entscheidung, sondern eine
 *   Wand; und wer sie gesperrt hat, will wissen, wie lange noch, deshalb
 *   sagt `holdUntil` es für den Balken über der Tür.
 * - **Eine Tür, die gerade frei geworden ist, bleibt eine Weile frei**
 *   (`LOCK_COOLDOWN`). Ohne diese vierte Regel war der Rest eine Einladung:
 *   Der Riegel fällt, die Tafel legt ihn sofort wieder um — oder der Spuk
 *   schlägt dieselbe Tür ein zweites Mal zu, während noch jemand darin steht
 *   —, und für den, der davor wartet, geht sie nie wieder auf. Wer sich
 *   durchgezogen hat, soll auch hindurchkommen; deshalb ist eine eben
 *   entriegelte Tür für `LOCK_COOLDOWN` Sekunden weder wählbar noch
 *   zuschlagbar. Freigeben darf man sie natürlich jederzeit. Und weil vierzig
 *   Sekunden lang genug sind, dass man sie für einen kaputten Schalter hält,
 *   **zeigt** die abkühlende Tür ihre Restzeit: offen und grün, auf der Tafel
 *   (`stationUi.hackPage`), auf der Karte und in der 2D-Szene — derselbe
 *   Balken wie beim Halten, nur in der anderen Farbe — und die Tür blinkt
 *   dazu, damit man auch ohne Balken sieht, dass sie gerade nicht zu haben
 *   ist.
 * - **Das Monster kann eine Sperre aufbrechen** (`pryLock`), und es lohnt
 *   sich: Der erste Versuch geht **nie** auf — ein Riegel gibt nicht beim
 *   ersten Zug nach —, danach steigt die Aussicht mit jedem weiteren
 *   (`pryChance`). Im Mittel sind das gut drei Versuche und damit knapp vier
 *   Sekunden: **weniger, als das Warten kostet.** Genau das ist die Absicht.
 *   Wer wartet, verliert Zeit; wer zieht, macht Lärm — das ist der Handel.
 *
 * **Und im Test-Zustand gelten dieselben Regeln.** Vor der Mission ist die
 * Station hell und ohne Spuk — aber die Riegel laufen mit denselben Fristen:
 * Wer dort ohne Frist schalten durfte, sah nie den Balken und lernte ein
 * anderes Spiel als das, das er gleich spielt. Genau das war der Befund des
 * Besitzers („der Ladebalken fehlt noch").
 *
 * Was ein Schalter gerade nicht darf, sagt `lockBlock` — als Wort, nicht als
 * stilles Nichts (`LockBlock`, `LOCK_BLOCK_TEXT`): gehalten, belegt, warm.
 *
 * Die Buchführung (`DoorLocks`) liegt beim Gastgeber und geht nicht über die
 * Leitung: Alle anderen sehen nur die Liste der zugefallenen Türen, und die
 * bleibt, was sie war.
 */

/** Wie lange eine zugeschlagene Tür von selbst zu bleibt, in Sekunden. */
export const SLAM_HOLD = 20;
/** Wie lange eine von Hand gesperrte Tür hält, in Sekunden: mindestens, höchstens. */
export const HOLD_RANGE: readonly [number, number] = [8, 10];
/** Sekunden zwischen zwei Versuchen des Monsters, eine Sperre aufzuziehen. */
export const PRY_COOLDOWN = 1.1;
/** Wie viel Aussicht jeder Versuch nach dem zweiten dazugewinnt. */
export const PRY_GAIN = 0.15;
/** Womit der zweite Versuch anfängt — der erste geht nie auf. */
export const PRY_BASE = 0.3;
/**
 * Wie lange eine Tür nach dem Ende einer Sperre frei bleibt, in Sekunden.
 *
 * **Zwölf Sekunden waren zu wenig.** Sie reichten dem, der hindurchwollte,
 * aber sie reichten auch dem, der die Tafel bedient: Riegel fällt, zwölf
 * Sekunden warten, Riegel wieder setzen — und weil das Monster in dieser Zeit
 * selten mehr als einen Raum weit kommt, stand es nach der dritten Runde
 * immer noch vor derselben Tür. Genau das sollte die Abkühlung verhindern.
 * Vierzig Sekunden sind lang genug, dass die Tür kein Riegel mehr ist,
 * sondern ein Weg: Wer sie aufgezogen oder ausgesessen hat, kommt hindurch
 * und ist weg, bevor sie wieder zufallen darf.
 *
 * Und weil vierzig Sekunden lang genug sind, um für einen kaputten Schalter
 * gehalten zu werden, steht die Restzeit jetzt überall dort, wo die Tür zu
 * sehen ist — auf der Tafel, auf der Karte, in der 2D-Szene: offen und grün.
 */
export const LOCK_COOLDOWN = 40;

export interface DoorLocks {
  /** Die eine gewollt gesperrte Tür — `''`, wenn keine. */
  chosen: string;
  /** Wann die gewollt gesperrte Tür von selbst aufgeht (Rundenzeit); 0 ohne. */
  until: number;
  /** Die zugefallenen Türen und wann sie von selbst aufgehen (Rundenzeit). */
  slams: Array<{ id: string; until: number }>;
  /** Wie oft an einer Tür schon gezogen wurde, und wann zuletzt. */
  pries: Array<{ id: string; tries: number; last: number }>;
  /** Türen, die gerade frei geworden sind, und wann sie wieder sperrbar sind. */
  cooling: Array<{ id: string; until: number }>;
}

export function freshLocks(): DoorLocks {
  return { chosen: '', until: 0, slams: [], pries: [], cooling: [] };
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
 * **Wann diese Sperre von selbst fällt** — egal, woher sie kommt: `null`,
 * wenn die Tür gar nicht gesperrt ist. Das ist die Zahl für den Balken über
 * der Tür (`map/mapView.ts`, `map/flatScene.ts`).
 */
export function holdUntil(locks: DoorLocks, id: string): number | null {
  if (locks.chosen === id) return locks.until;
  return slamUntil(locks, id);
}

/**
 * **Wann diese Tür wieder gesperrt werden darf** — `null`, wenn sofort. Für
 * die Tafel ist das die Zahl, die erklärt, warum ihr Schalter gerade nichts
 * tut: nicht kaputt, sondern noch warm.
 */
export function coolingUntil(locks: DoorLocks, id: string): number | null {
  return locks.cooling.find((one) => one.id === id)?.until ?? null;
}

/** Ob diese Tür gerade nicht mehr warm ist — die eine Frage, die auch der Spuk stellt. */
export function mayLock(locks: DoorLocks, id: string, time: number): boolean {
  const until = coolingUntil(locks, id);
  return until === null || until <= time;
}

/** **Die Tür, die ein Spieler gerade hält** — `''`, wenn keine (oder sie längst anders aufging). */
export function heldDoor(locks: Pick<DoorLocks, 'chosen'>, shut: readonly string[]): string {
  return locks.chosen && shut.includes(locks.chosen) ? locks.chosen : '';
}

/**
 * **Warum der Schalter dieser Tür gerade nichts tut** — oder `''`, wenn er
 * etwas täte.
 *
 * - `'held'`: Die Tür ist die gehaltene. Sie geht erst auf, wenn ihre Frist
 *   um ist — kein zweiter Tipp macht sie vorher frei.
 * - `'busy'`: Eine andere Tür wird gerade gehalten. Erst wenn die von selbst
 *   aufgeht, darf die nächste zu.
 * - `'cooling'`: Diese Tür ist eben erst frei geworden und noch warm
 *   (`LOCK_COOLDOWN`).
 *
 * Reine Auskunft, ohne die Buchführung anzufassen — deshalb reicht ihr auch
 * das, was jedes Gerät vom Stand kennt (`HauntState.held`, `.cooling`), nicht
 * nur die volle Buchführung des Gastgebers.
 */
export type LockBlock = '' | 'held' | 'busy' | 'cooling';

export function lockBlock(
  locks: Pick<DoorLocks, 'chosen' | 'cooling'>,
  shut: readonly string[],
  id: string,
  time: number,
): LockBlock {
  const held = heldDoor(locks, shut);
  if (shut.includes(id)) return held === id ? 'held' : '';
  if (held) return 'busy';
  const until = locks.cooling.find((one) => one.id === id)?.until ?? null;
  return until === null || until <= time ? '' : 'cooling';
}

/** Die Sätze dazu — dieselben auf der Tafel, am Telefon und vor Ort. */
export const LOCK_BLOCK_TEXT: Readonly<Record<Exclude<LockBlock, ''>, string>> = {
  held: 'Der Riegel hält, bis er von selbst fällt.',
  busy: 'Ein Schott ist schon gesperrt — erst geht es wieder auf.',
  cooling: 'Der Riegel ist noch warm.',
};

/**
 * **Merken, dass diese Tür gerade frei geworden ist.** Jeder Weg aus einer
 * Sperre heraus geht hier durch — abgelaufen, freigegeben, aufgezogen —,
 * damit es keine Hintertür gibt, durch die eine Tür sofort wieder zufällt.
 */
function cool(locks: DoorLocks, id: string, time: number): void {
  const until = time + LOCK_COOLDOWN;
  const entry = locks.cooling.find((one) => one.id === id);
  if (entry) entry.until = Math.max(entry.until, until);
  else locks.cooling.push({ id, until });
}

/**
 * **Eine Tür gewollt sperren.** Solange eine andere gehalten wird oder diese
 * noch warm ist, passiert nichts (`lockBlock`); war die Tür nur zugefallen,
 * wird sie zur gewählten und bekommt die Frist der Hand.
 *
 * @returns die neue Liste der zugefallenen Türen.
 */
export function chooseLock(
  locks: DoorLocks,
  shut: readonly string[],
  id: string,
  time = 0,
  roll: () => number = Math.random,
): string[] {
  if (lockBlock(locks, shut, id, time)) return [...shut];
  const next = shut.filter((one) => one !== id);
  next.push(id);
  locks.chosen = id;
  locks.until = time + HOLD_RANGE[0] + roll() * (HOLD_RANGE[1] - HOLD_RANGE[0]);
  locks.slams = locks.slams.filter((slam) => slam.id !== id);
  return next;
}

/** **Eine Tür freigeben** — gewollt oder zugefallen, für die Tafel ist das dasselbe. */
export function releaseLock(
  locks: DoorLocks,
  shut: readonly string[],
  id: string,
  time = 0,
): string[] {
  if (locks.chosen === id) {
    locks.chosen = '';
    locks.until = 0;
  }
  locks.slams = locks.slams.filter((slam) => slam.id !== id);
  locks.pries = locks.pries.filter((pry) => pry.id !== id);
  if (shut.includes(id)) cool(locks, id, time);
  return shut.filter((one) => one !== id);
}

/**
 * **Gewollt sperren oder freigeben** — der Schalter, wie ihn Tafel und
 * Techniker bedienen: zu, wenn offen; auf, wenn zugefallen. Die gehaltene
 * Tür gibt er **nicht** frei, und eine zweite sperrt er nicht, solange die
 * erste hält — ein Schalter, der wortlos nichts tut, gilt als kaputt,
 * deshalb sagt `blocked`, warum (`LOCK_BLOCK_TEXT`).
 */
export function toggleLock(
  locks: DoorLocks,
  shut: readonly string[],
  id: string,
  time = 0,
  roll: () => number = Math.random,
): { shut: string[]; locked: boolean; blocked: LockBlock } {
  const blocked = lockBlock(locks, shut, id, time);
  if (blocked) return { shut: [...shut], locked: shut.includes(id), blocked };
  if (shut.includes(id))
    return { shut: releaseLock(locks, shut, id, time), locked: false, blocked: '' };
  return { shut: chooseLock(locks, shut, id, time, roll), locked: true, blocked: '' };
}

/** **Eine Tür fällt zu** (der Spuk): sie hält `SLAM_HOLD` Sekunden ab `time`. */
export function slamDoor(
  locks: DoorLocks,
  shut: readonly string[],
  id: string,
  time: number,
): string[] {
  if (shut.includes(id)) return [...shut];
  // Auch der Spuk darf dieselbe Tür nicht sofort wieder zuschlagen: Zweimal
  // hintereinander dieselbe Tür ist keine Bedrohung mehr, sondern eine Wand.
  if (!mayLock(locks, id, time)) return [...shut];
  locks.slams = [...locks.slams.filter((slam) => slam.id !== id), { id, until: time + SLAM_HOLD }];
  return [...shut, id];
}

/**
 * **Wie gut ein Versuch steht**, wenn es der `tries`-te an dieser Tür ist:
 * Der erste ist 0 — ein Riegel gibt nicht beim ersten Zug nach —, der zweite
 * `PRY_BASE`, und jeder weitere `PRY_GAIN` mehr, bis er sicher ist.
 */
export function pryChance(tries: number): number {
  if (tries < 2) return 0;
  return Math.min(1, PRY_BASE + (tries - 2) * PRY_GAIN);
}

/** Wie oft an dieser Tür schon gezogen wurde — für Anzeige und Tests. */
export function pryTries(locks: DoorLocks, id: string): number {
  return locks.pries.find((pry) => pry.id === id)?.tries ?? 0;
}

/** Ob gerade wieder gezogen werden darf, oder ob der letzte Zug noch nachhallt. */
export function pryReady(locks: DoorLocks, id: string, time: number): boolean {
  const pry = locks.pries.find((one) => one.id === id);
  return !pry || time - pry.last >= PRY_COOLDOWN;
}

export interface PryResult {
  /** Die neue Liste der gesperrten Türen. */
  shut: string[];
  /** Ob die Tür aufgegangen ist. */
  opened: boolean;
  /** Der wievielte Versuch das war; 0, wenn noch gar nicht gezogen werden durfte. */
  tries: number;
}

/**
 * **An einer Sperre ziehen.** Zählt den Versuch, würfelt gegen `pryChance`
 * und gibt die Tür frei, wenn er gelingt. Zu früh nach dem letzten Zug
 * passiert nichts (`tries: 0`) — das Ziehen hat einen Takt, sonst wäre die
 * Rechnung eine Frage der Bildrate.
 */
export function pryLock(
  locks: DoorLocks,
  shut: readonly string[],
  id: string,
  time: number,
  roll: () => number = Math.random,
): PryResult {
  if (!shut.includes(id)) return { shut: [...shut], opened: false, tries: pryTries(locks, id) };
  if (!pryReady(locks, id, time)) return { shut: [...shut], opened: false, tries: 0 };
  const pry = locks.pries.find((one) => one.id === id);
  const tries = (pry?.tries ?? 0) + 1;
  if (pry) {
    pry.tries = tries;
    pry.last = time;
  } else locks.pries.push({ id, tries, last: time });
  if (roll() >= pryChance(tries)) return { shut: [...shut], opened: false, tries };
  return { shut: releaseLock(locks, shut, id, time), opened: true, tries };
}

/**
 * **Ein Schritt der Uhr**: Sperren, deren Zeit um ist, gehen auf — die
 * zugefallenen wie die von Hand gesetzten. Buchführung über Türen, die
 * inzwischen anders geöffnet wurden (Holz splittert, ein alter Stand vom
 * Netz), wird weggeräumt.
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
  if (locks.chosen && !shut.includes(locks.chosen)) {
    locks.chosen = '';
    locks.until = 0;
  } else if (locks.chosen && locks.until <= time) {
    opened.push(locks.chosen);
    locks.chosen = '';
    locks.until = 0;
  }
  const left = shut.filter((id) => !opened.includes(id));
  locks.pries = locks.pries.filter((pry) => left.includes(pry.id));
  for (const id of opened) cool(locks, id, time);
  locks.cooling = locks.cooling.filter((one) => one.until > time);
  return { shut: left, opened };
}
