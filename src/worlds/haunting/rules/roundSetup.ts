/**
 * **Wer spielt mit — und was darf jeder.**
 *
 * Eine Runde hat **fünf Plätze**: den Techniker im Anzug, drei Stühle in der
 * Einsatzzentrale — **Rot, Gelb, Blau** — und das Monster. Jeder Platz ist
 * für sich Mensch, Bot oder aus (`SeatWho`), und jeder außer dem Monster hält
 * eine beliebige Auswahl der drei **Fähigkeiten** der Zentrale: Späher,
 * Schalttafel, Archiv (`Seat.powers`).
 *
 * **Warum Farben und keine Fähigkeiten als Plätze.** Bis hierher *waren* die
 * drei Fähigkeiten die drei Stühle: Wer „Archiv" nahm, saß am Archiv, und ein
 * Mensch, der Radar *und* Tafel wollte, saß auf zwei Stühlen zugleich. Was
 * dabei fehlte, war der Techniker selbst: Ob **er** Türen sperren und Lampen
 * schalten darf, ließ sich nirgends sagen — ein Bot an der Tafel gab ihm die
 * Tafel, ein Mensch nahm sie ihm, und „aus" nahm sie allen. Jetzt hat jeder
 * Platz seine Fähigkeiten, und der Techniker schaltet Lampen genau dann, wenn
 * auf seinem Platz „Schalttafel" leuchtet (`powersOf`). Die Farben sind die
 * Sitzplätze am Tisch der Zentrale — man ruft sich am Tisch „Rot, mach die Tür
 * zu" zu und nicht „Schalttafel-Späher-Mischung".
 *
 * **Wer ich bin, steht nicht hier.** Die Tafel sagt, wer die Plätze hält; was
 * *dieses Gerät* ist — einer der fünf Plätze oder einer der zwei Zuschauer
 * (`MyRole`) —, ist eine Wahl je Gerät und steht in der Lobby
 * (`rules/lobby.LobbyChoice.me`). Vorher stand dafür eine Spalte „Ich" in der
 * Tafel; die ist weg, weil die Reiter oben dieselbe Frage beantworten und
 * dabei zeigen, was man sieht.
 *
 * **Was der Techniker selbst bekommt** (`powersOf`): seine eigenen
 * Fähigkeiten — und dazu das Horchbild, wenn ein **Bot** auf einem Farbplatz
 * Späher ist (der Bot meldet, was er hört; das ist seine ganze Arbeit). Das
 * Archiv eines Bot-Platzes kommt dagegen als **Funk** (`rules/archiveRadio.ts`)
 * und nicht als Ziel auf seiner Karte: Ziele auf der Karte und am Bildrand
 * sieht nur, wer Archiv **selbst** hält (`goalPrecision`). Und die Tafel eines
 * anderen Platzes gibt ihm gar nichts — schalten tut, wer sie hat.
 *
 * Reine Daten, ohne DOM: Die Tafel im Van (`roundSetupPanel.ts`), das
 * Optionsmenü der 2D-Welt und das Menü in der Brille lesen und schreiben
 * dieselbe Einstellung, gemerkt im Browser (`SETUP_STORAGE`).
 */
import type { FlatRole } from '../map/flatRound';

/** Wer einen Platz hält: ein Mensch, ein Bot — oder niemand. */
export type SeatWho = 'human' | 'bot' | 'off';
/** Der alte Name für dieselbe Sache — ein paar Stellen kennen ihn noch. */
export type Who = SeatWho;
export type MonsterWho = SeatWho;
export type AbilityWho = SeatWho;

/** Die drei Fähigkeiten der Einsatzzentrale. */
export type Ability = 'scout' | 'panel' | 'archive';

/** Die drei Stühle der Zentrale — Farben, weil man sie sich am Tisch zuruft. */
export type SeatColour = 'red' | 'yellow' | 'blue';
/** Die fünf Plätze einer Runde. */
export type SeatId = 'technician' | SeatColour | 'monster';

export interface Seat {
  who: SeatWho;
  /** Welche Fähigkeiten dieser Platz hält. Das Monster hält nie eine. */
  powers: Record<Ability, boolean>;
}

export interface RoundSetup {
  seats: Record<SeatId, Seat>;
}

/**
 * **Was dieses Gerät ist**: einer der fünf Plätze — oder ein Zuschauer, und
 * davon gibt es zwei: einer sieht dem Techniker zu (in 3D durch dessen
 * Augen, in 2D die Karte um ihn), einer sieht alles (die Station von oben,
 * allwissend). Beide sitzen in der Zentrale am Fernseher (`stations.ts`,
 * Station `watch`).
 */
export type MyRole = SeatId | 'watch:technician' | 'watch:all';

/** Was der Techniker aus der Verteilung bekommt. */
export interface SoloPowers {
  /** Späher: das **Horchbild** der Station auf seiner Karte. */
  scout: boolean;
  /** Schalttafel: Türen und Lampen per Tipp auf die Karte. */
  panel: boolean;
  /** Archiv: Ziele auf Karte und Bildrand, die Akte per Tipp aufs Zimmer. */
  archive: boolean;
}

export const SETUP_STORAGE = 'bgvr.haunting.setup.v2';
/** Der Schlüssel der Fassung davor — wird beim ersten Laden einmal übersetzt. */
export const SETUP_STORAGE_V1 = 'bgvr.haunting.setup.v1';

/** Die drei Fähigkeiten, in der Reihenfolge, in der sie überall stehen. */
export const ABILITIES: readonly Ability[] = ['scout', 'panel', 'archive'];
/** Die fünf Plätze, in der Reihenfolge der Tafel. */
export const SEATS: readonly SeatId[] = ['technician', 'red', 'yellow', 'blue', 'monster'];
/** Die drei Stühle der Zentrale. */
export const COLOURS: readonly SeatColour[] = ['red', 'yellow', 'blue'];
/** Die sieben Antworten auf „wer bin ich" — die fünf Plätze und die zwei Zuschauer. */
export const MY_ROLES: readonly MyRole[] = [...SEATS, 'watch:technician', 'watch:all'];

export const ABILITY_LABELS: Readonly<Record<Ability, string>> = {
  scout: 'Späher',
  panel: 'Schalttafel',
  archive: 'Archiv',
};

export const ABILITY_HINTS: Readonly<Record<Ability, string>> = {
  scout: 'Horchbild der Station',
  panel: 'Türen und Lampen schalten',
  archive: 'Räume, Fundorte und Codes',
};

export const SEAT_LABELS: Readonly<Record<SeatId, string>> = {
  technician: 'Techniker',
  red: 'Rot',
  yellow: 'Gelb',
  blue: 'Blau',
  monster: 'Monster',
};

export const SEAT_HINTS: Readonly<Record<SeatId, string>> = {
  technician: 'Im Anzug draußen — Stock und Knöpfe',
  red: 'Platz Rot in der Zentrale',
  yellow: 'Platz Gelb in der Zentrale',
  blue: 'Platz Blau in der Zentrale',
  monster: 'Die Gegenseite — Stock und ein Knopf',
};

export const MY_ROLE_LABELS: Readonly<Record<MyRole, string>> = {
  ...SEAT_LABELS,
  'watch:technician': 'Zuschauer: Techniker',
  'watch:all': 'Zuschauer: Alles',
};

export const MY_ROLE_HINTS: Readonly<Record<MyRole, string>> = {
  ...SEAT_HINTS,
  'watch:technician': 'Sieht, was der Techniker sieht — in 3D durch seine Augen',
  'watch:all': 'Die ganze Station von oben, allwissend',
};

export const WHO_LABELS: Readonly<Record<SeatWho, string>> = {
  human: 'Mensch',
  bot: 'Bot',
  off: 'Aus',
};

/** Die drei Antworten je Platz, in der Reihenfolge der Knöpfe. */
export const WHOS: readonly SeatWho[] = ['human', 'bot', 'off'];

/**
 * **Wie eine Mischung heißt** — der Name, der am Tisch gerufen wird, wenn
 * ein Platz mehr als eine Fähigkeit hält. Der Schlüssel ist die Menge in der
 * Reihenfolge von `ABILITIES`: Wer erst das Archiv nimmt und dann das Radar,
 * sitzt an derselben Stelle wie der umgekehrte Fall.
 */
export const ROLE_NAMES: Readonly<Record<string, string>> = {
  scout: 'Späher',
  panel: 'Schalttafel',
  archive: 'Archiv',
  'scout+panel': 'Einsatzkontrolle',
  'scout+archive': 'Aufklärung',
  'panel+archive': 'Leitstand',
  'scout+panel+archive': 'Zentrale',
};

/** Der Satz für den, der noch nichts gewählt hat. */
export const NO_ROLE_HINT = 'Bitte wähle über den Reiter oben deine Rolle aus.';

/** Wie ein Platz aus diesen Fähigkeiten heißt — `''`, wenn es keine gibt. */
export function roleName(abilities: Iterable<Ability>): string {
  const set = new Set(abilities);
  const key = ABILITIES.filter((one) => set.has(one)).join('+');
  return ROLE_NAMES[key] ?? '';
}

/** Die Fähigkeiten eines Platzes als Liste, in fester Reihenfolge. */
export function seatAbilities(setup: RoundSetup, seat: SeatId): Ability[] {
  return ABILITIES.filter((one) => setup.seats[seat].powers[one]);
}

/** Wie ein Platz heißt, wenn man ihn mit seinen Fähigkeiten ruft: „Rot · Leitstand". */
export function seatTitle(setup: RoundSetup, seat: SeatId): string {
  const name = roleName(seatAbilities(setup, seat));
  return name ? `${SEAT_LABELS[seat]} · ${name}` : SEAT_LABELS[seat];
}

/** Ein Platz ohne Fähigkeiten. */
function noPowers(): Record<Ability, boolean> {
  return { scout: false, panel: false, archive: false };
}

/**
 * **Der Anfang**: ein Mensch im Anzug mit allen drei Fähigkeiten, die drei
 * Stühle leer, das Monster aus Zahlen. Wer allein spielt, sieht damit alles,
 * was die Zentrale ihm sagen würde — und wer zu mehreren spielt, verteilt die
 * Fähigkeiten vom Techniker weg auf die Farben. Alle Geräte fangen dabei als
 * Zuschauer in der Zentrale an (`rules/lobby.defaultLobby`).
 */
export function defaultSetup(): RoundSetup {
  return {
    seats: {
      technician: { who: 'human', powers: { scout: true, panel: true, archive: true } },
      red: { who: 'off', powers: noPowers() },
      yellow: { who: 'off', powers: noPowers() },
      blue: { who: 'off', powers: noPowers() },
      monster: { who: 'bot', powers: noPowers() },
    },
  };
}

/** Eine Abschrift, in der man schreiben darf, ohne die Vorlage anzufassen. */
export function cloneSetup(setup: RoundSetup): RoundSetup {
  const seats = {} as Record<SeatId, Seat>;
  for (const seat of SEATS)
    seats[seat] = { who: setup.seats[seat].who, powers: { ...setup.seats[seat].powers } };
  return { seats };
}

/** Denselben Aufbau mit einem anderen Halter auf einem Platz. */
export function withWho(setup: RoundSetup, seat: SeatId, who: SeatWho): RoundSetup {
  const next = cloneSetup(setup);
  next.seats[seat].who = who;
  return next;
}

/** Denselben Aufbau mit einer Fähigkeit auf einem Platz an oder aus. Das Monster hält keine. */
export function withPower(
  setup: RoundSetup,
  seat: SeatId,
  ability: Ability,
  on: boolean,
): RoundSetup {
  if (seat === 'monster') return setup;
  const next = cloneSetup(setup);
  next.seats[seat].powers[ability] = on;
  return next;
}

function isWho(value: unknown): value is SeatWho {
  return value === 'human' || value === 'bot' || value === 'off';
}

/**
 * Aus fremdem Text (Speicher) eine gültige Einstellung — Unbekanntes wird
 * ersetzt.
 *
 * **Die alte Fassung wird dabei übersetzt** (`{technician, monster,
 * abilities}` — und davor `seats: [{role, who}]`). Wer das Update einspielt,
 * soll seine Verteilung nicht verlieren: Ein Bot auf einer Fähigkeit hieß
 * damals „der Techniker bekommt sie selbst", also landet sie auf seinem Platz;
 * ein Mensch bekommt den ersten freien Farbplatz; „aus" bleibt aus.
 */
export function readSetup(value: unknown): RoundSetup {
  const fallback = defaultSetup();
  if (!value || typeof value !== 'object') return fallback;
  const bag = value as Record<string, unknown>;
  const seats = bag['seats'];
  if (seats && typeof seats === 'object' && !Array.isArray(seats)) {
    const out = defaultSetup();
    const from = seats as Record<string, unknown>;
    for (const seat of SEATS) {
      const read = from[seat];
      if (!read || typeof read !== 'object') continue;
      const one = read as Record<string, unknown>;
      if (isWho(one['who'])) out.seats[seat].who = one['who'];
      const powers = one['powers'];
      if (seat !== 'monster' && powers && typeof powers === 'object')
        for (const ability of ABILITIES)
          out.seats[seat].powers[ability] = (powers as Record<string, unknown>)[ability] === true;
    }
    return out;
  }
  return readLegacy(bag);
}

/** Die zwei Fassungen davor — siehe `readSetup`. */
function readLegacy(bag: Record<string, unknown>): RoundSetup {
  const out = defaultSetup();
  const technician = bag['technician'];
  const monster = bag['monster'];
  if (technician === 'human' || technician === 'bot') out.seats.technician.who = technician;
  if (isWho(monster)) out.seats.monster.who = monster;
  // Die Fähigkeiten der Fassung davor: erst als `abilities`, davor als Liste `seats`.
  const abilities: Partial<Record<Ability, SeatWho>> = {};
  const read = bag['abilities'];
  if (read && typeof read === 'object') {
    const from = read as Record<string, unknown>;
    for (const one of ABILITIES) if (isWho(from[one])) abilities[one] = from[one];
  } else if (Array.isArray(bag['seats'])) {
    for (const one of ABILITIES) abilities[one] = 'off';
    for (const seat of bag['seats'] as unknown[]) {
      if (!seat || typeof seat !== 'object') continue;
      const role = (seat as Record<string, unknown>)['role'];
      if (!ABILITIES.includes(role as Ability)) continue;
      const holder = (seat as Record<string, unknown>)['who'] === 'human' ? 'human' : 'bot';
      abilities[role as Ability] = abilities[role as Ability] === 'human' ? 'human' : holder;
    }
  } else return out;
  // Übersetzen: Der Techniker hält, was ein Bot hielt; Menschen bekommen Farben.
  for (const ability of ABILITIES) out.seats.technician.powers[ability] = false;
  let colour = 0;
  for (const ability of ABILITIES) {
    const who = abilities[ability] ?? 'off';
    if (who === 'bot') out.seats.technician.powers[ability] = true;
    else if (who === 'human' && colour < COLOURS.length) {
      const seat = COLOURS[colour++]!;
      out.seats[seat].who = 'human';
      out.seats[seat].powers[ability] = true;
    }
  }
  return out;
}

export function loadSetup(
  storage: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined'
    ? null
    : localStorage,
): RoundSetup {
  try {
    const raw = storage?.getItem(SETUP_STORAGE) ?? storage?.getItem(SETUP_STORAGE_V1);
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

/** Ob irgendein Farbplatz mit diesem Halter diese Fähigkeit hält. */
export function colourHolds(setup: RoundSetup, ability: Ability, who: SeatWho): boolean {
  return COLOURS.some((seat) => setup.seats[seat].who === who && setup.seats[seat].powers[ability]);
}

/**
 * **Wer eine Fähigkeit in der Zentrale hält** — ein Mensch, ein Bot oder
 * niemand. Ein Mensch schlägt einen Bot: „Da sitzt jemand" ist die stärkere
 * Aussage. Der Techniker zählt hier nicht mit — die Frage ist, wer *ihm*
 * etwas zuruft.
 */
export function abilityWho(setup: RoundSetup, ability: Ability): SeatWho {
  if (colourHolds(setup, ability, 'human')) return 'human';
  if (colourHolds(setup, ability, 'bot')) return 'bot';
  return 'off';
}

/**
 * **Was der Techniker selbst bekommt.** Seine eigenen Fähigkeiten — und das
 * Horchbild auch dann, wenn ein Bot in der Zentrale Späher ist: Der Bot
 * meldet, was er hört, mehr kann er nicht. Das Archiv eines Bots kommt
 * dagegen als Funk (`rules/archiveRadio.ts`), nicht als Ziel auf der Karte;
 * und die Tafel eines anderen gibt ihm nichts — schalten tut, wer sie hat.
 */
export function powersOf(setup: RoundSetup): SoloPowers {
  const mine = setup.seats.technician.powers;
  return {
    scout: mine.scout || colourHolds(setup, 'scout', 'bot'),
    panel: mine.panel,
    archive: mine.archive,
  };
}

/** Ob ein Bot in der Zentrale das Archiv hält — dann funkt er dem Techniker. */
export function botArchivist(setup: RoundSetup): boolean {
  return colourHolds(setup, 'archive', 'bot');
}

/**
 * **Wie genau der Techniker sein Ziel sieht.** Mit eigenem Archiv leuchtet die
 * Kiste (`'crate'`); ohne sieht er **gar kein** Ziel — kein Dreieck am Rand,
 * keine Liste im HUD. Es gab dazwischen einmal `'room'` (nur der Raum); das
 * ist weg: Wer das Archiv nicht hat, hört, wo es liegt, oder sucht.
 */
export type GoalPrecision = 'crate' | 'none';

export function goalPrecision(setup: RoundSetup): GoalPrecision {
  return powersOf(setup).archive ? 'crate' : 'none';
}

/** Die Fähigkeiten, die Menschen in der Zentrale halten — für Anzeigen. */
export function humanAbilities(setup: RoundSetup): Ability[] {
  return ABILITIES.filter((one) => colourHolds(setup, one, 'human'));
}

/**
 * **Wen dieses Gerät in der 2D-Welt spielt** — aus seiner Wahl, nicht aus
 * der Tafel geraten: Wer „Monster" gewählt hat, hält den Stock des Monsters;
 * wer „Techniker" gewählt hat und der Anzug ist ein Mensch, hält den des
 * Technikers; alle anderen sehen zu.
 */
export function flatRoleOf(setup: RoundSetup, me: MyRole = 'technician'): FlatRole {
  if (me === 'monster') return 'monster';
  if (me === 'technician' && setup.seats.technician.who === 'human') return 'technician';
  return 'watch';
}

/**
 * **Wie viele in einer Runde mitspielen** — der Techniker, das Monster (wenn
 * es eines gibt) und jeder Farbplatz, der nicht aus ist. Ab drei läuft jede
 * Reaktion über eine Absprache, und die kostet Zeit (`rules/doorSeal.ts`).
 */
export function crewSize(setup: RoundSetup): number {
  const staffed = COLOURS.filter((seat) => setup.seats[seat].who !== 'off').length;
  return 1 + (setup.seats.monster.who === 'off' ? 0 : 1) + staffed;
}

/** Die drei Rundenarten der 3D-Welt — dort steuert nur der Techniker aus Fleisch. */
export function roundKindOf(setup: RoundSetup): 'bot' | 'mission' | 'test' {
  if (setup.seats.technician.who !== 'human') return 'bot';
  return setup.seats.monster.who === 'off' ? 'test' : 'mission';
}

/** Die Einstellung, die eine Rundenart meint — die Farbplätze bleiben, wie sie sind. */
export function presetFor(kind: 'bot' | 'mission' | 'test', setup: RoundSetup): RoundSetup {
  const monster = setup.seats.monster.who;
  const next = withWho(setup, 'technician', kind === 'bot' ? 'bot' : 'human');
  return withWho(next, 'monster', kind === 'test' ? 'off' : monster === 'off' ? 'bot' : monster);
}

/**
 * **Der Techniker gehört der Brille.** Steht jemand mit der Brille im Raum,
 * trägt er den Anzug; die Tafel zeigt „VR" und lässt sich dort nicht drücken.
 */
export function technicianLabel(setup: RoundSetup, vr: boolean): string {
  return vr ? 'VR' : WHO_LABELS[setup.seats.technician.who];
}

/** Dieselbe Regel als Daten: Mit Brille im Raum ist der Techniker ein Mensch. */
export function lockTechnician(setup: RoundSetup, vr: boolean): RoundSetup {
  return vr && setup.seats.technician.who !== 'human'
    ? withWho(setup, 'technician', 'human')
    : setup;
}

/** Eine Zeile, die die Einstellung zusammenfasst — für Anzeigen. */
export function describeSetup(setup: RoundSetup): string {
  return SEATS.map((seat) => {
    const one = setup.seats[seat];
    const powers = seatAbilities(setup, seat).map((a) => ABILITY_LABELS[a]);
    const tail = powers.length && one.who !== 'off' ? ` · ${powers.join(' + ')}` : '';
    return `${SEAT_LABELS[seat]}: ${WHO_LABELS[one.who]}${tail}`;
  }).join(' · ');
}

/** Einen Platz durchschalten: Mensch → Bot → Aus → Mensch. */
export function cycleWho(who: SeatWho): SeatWho {
  return who === 'human' ? 'bot' : who === 'bot' ? 'off' : 'human';
}

/** Der Techniker kennt kein „Aus": Mensch ↔ Bot. */
export function cycleTechnician(who: SeatWho): SeatWho {
  return who === 'human' ? 'bot' : 'human';
}

/** Ob diese Wahl ein Zuschauer ist. */
export function isWatcher(me: MyRole): me is 'watch:technician' | 'watch:all' {
  return me === 'watch:technician' || me === 'watch:all';
}

/** Ob diese Wahl ein Stuhl in der Zentrale ist. */
export function isColour(me: MyRole): me is SeatColour {
  return me === 'red' || me === 'yellow' || me === 'blue';
}

/**
 * **Wer mitten in der Runde die Rolle wechseln darf.**
 *
 * - In einer **Test-Runde** darf jeder alles — dafür ist sie da.
 * - Sonst wechselt nur, wer **in der Einsatzzentrale** sitzt, und nur unter
 *   den Plätzen der Zentrale. Wer draußen im Anzug steht, kann nicht
 *   nebenbei ins Archiv greifen.
 * - Der **Techniker in der Brille** wechselt nie, und niemand nimmt ihm seine
 *   Rolle ab: Er ist der Einzige, der den Anzug tragen kann.
 */
export interface SwitchState {
  test: boolean;
  inCentre: boolean;
  vrTechnician: boolean;
}

export interface SwitchRights {
  abilities: boolean;
  technician: boolean;
  why: string;
}

export const NOT_IN_CENTRE =
  'Mitten in der Runde wechselt nur die Rolle, wer in der Einsatzzentrale sitzt.';
export const VR_KEEPS_TECHNICIAN =
  'Der Techniker steckt in der Brille — seine Rolle bleibt bei ihm.';

export function switchRights(state: SwitchState): SwitchRights {
  if (state.test) return { abilities: true, technician: true, why: '' };
  if (!state.inCentre) return { abilities: false, technician: false, why: NOT_IN_CENTRE };
  return {
    abilities: true,
    technician: !state.vrTechnician,
    why: state.vrTechnician ? VR_KEEPS_TECHNICIAN : '',
  };
}
