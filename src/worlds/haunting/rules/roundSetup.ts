/**
 * **Wer spielt mit — und wer davon ist ein Mensch.**
 *
 * Bevor eine Runde anfängt, in 2D wie in 3D, wird verteilt: der Techniker
 * (Mensch oder Bot — und **VR**, sobald jemand mit der Brille im Raum steht),
 * das Monster (Mensch, Bot oder aus — der sichere Test) und die drei
 * **Fähigkeiten** der Einsatzzentrale, jede für sich auf Bot, Mensch oder Aus.
 *
 * **Fähigkeiten statt Plätze — das ist die Änderung.** Vorher stand hier eine
 * Liste von Plätzen mit einem Knopf „+ Platz": Wer zwei Leute am Tisch hatte
 * und drei Aufgaben zu verteilen, musste einen Platz doppelt belegen oder eine
 * Aufgabe wegwerfen, und wie die entstandene Mischung *heißt*, stand nirgends.
 * Jetzt gibt es genau drei Fähigkeiten, die immer alle dastehen, und ein Mensch
 * in der Zentrale hält davon so viele, wie er sich nimmt. Wie sein Platz dann
 * heißt, rechnet `roleName` — und zwar nach dieser Tafel:
 *
 * | Fähigkeiten                | Name            |
 * | -------------------------- | --------------- |
 * | Späher                     | Späher          |
 * | Schalttafel                | Schalttafel     |
 * | Archiv                     | Archiv          |
 * | Späher + Schalttafel       | Einsatzkontrolle|
 * | Archiv + Späher            | Aufklärung      |
 * | Archiv + Schalttafel       | Leitstand       |
 * | alle drei                  | Zentrale        |
 *
 * Die Namen sind nicht erfunden, sondern die, die am Tisch ohnehin gerufen
 * werden: „Einsatzkontrolle" heißt das Gerät mit Radar und Schaltern seit je
 * (`stations.ts`), und wer Akte und Radar hat, klärt auf.
 *
 * **Ein Bot auf einer Fähigkeit heißt: Der Techniker bekommt sie selbst.** Wer
 * allein spielt, hat sonst niemanden, der ihm zuruft, wo es rumort, welche Tür
 * zu ist und welcher Code am Schrank gilt — also sieht er es auf seiner Karte
 * (`map/flatMode.ts`, `SoloPowers`). Ein **Mensch** nimmt ihm die Auskunft
 * wieder ab: Dann sagt sie ihm ein Mitspieler. **Aus** heißt: niemand hat sie,
 * auch der Techniker nicht.
 *
 * Reine Daten, ohne DOM: Die Tafel im Van (`roundSetupPanel.ts`), das
 * Optionsmenü der 2D-Welt und das Menü in der Brille lesen und schreiben
 * dieselbe Einstellung, gemerkt im Browser (`SETUP_STORAGE`).
 */
import type { FlatRole } from '../map/flatRound';

export type Who = 'human' | 'bot';
export type MonsterWho = Who | 'off';
/** Wer eine Fähigkeit hält: ein Mensch, ein Bot — oder niemand. */
export type AbilityWho = Who | 'off';

/**
 * Die drei Fähigkeiten der Einsatzzentrale. Sie hießen einmal „Rollen" und
 * waren Plätze; als Fähigkeit lassen sie sich mischen, und genau darum ging
 * es: Bei drei Spielern sitzen manchmal nur zwei in der Zentrale.
 */
export type Ability = 'scout' | 'panel' | 'archive';

export interface RoundSetup {
  technician: Who;
  monster: MonsterWho;
  /** Jede Fähigkeit für sich: Bot, Mensch oder Aus. */
  abilities: Record<Ability, AbilityWho>;
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
  /** Archiv: Ein Tipp auf ein Zimmer schlägt die Akte mit den Codes auf. */
  archive: boolean;
}

export const SETUP_STORAGE = 'bgvr.haunting.setup.v1';

/** Die drei Fähigkeiten, in der Reihenfolge, in der sie überall stehen. */
export const ABILITIES: readonly Ability[] = ['scout', 'panel', 'archive'];

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

export const WHO_LABELS: Readonly<Record<AbilityWho, string>> = {
  human: 'Mensch',
  bot: 'Bot',
  off: 'Aus',
};

/**
 * **Wie eine Mischung heißt.** Der Schlüssel ist die Menge der Fähigkeiten in
 * der Reihenfolge von `ABILITIES` — eine Menge und keine Liste: Wer erst das
 * Archiv nimmt und dann das Radar, sitzt an derselben Stelle wie der
 * umgekehrte Fall, und zwei Namen für denselben Platz wären der Anfang vom
 * alten Durcheinander.
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

/** Der Satz für den, der noch nichts gewählt hat. Er steht an drei Stellen. */
export const NO_ROLE_HINT = 'Bitte wähle über den Tab oben deine Rolle aus.';

/**
 * Wie ein Platz aus diesen Fähigkeiten heißt — `''`, wenn es keine gibt. Ist
 * nur eine aktiv, ist der Name die Fähigkeit selbst; das war die Vorgabe und
 * ist auch die einzige, die man niemandem erklären muss.
 */
export function roleName(abilities: Iterable<Ability>): string {
  const set = new Set(abilities);
  const key = ABILITIES.filter((one) => set.has(one)).join('+');
  return ROLE_NAMES[key] ?? '';
}

/** Welche Fähigkeiten in dieser Verteilung Menschen gehören. */
export function humanAbilities(setup: RoundSetup): Ability[] {
  return ABILITIES.filter((one) => setup.abilities[one] === 'human');
}

/** Der Anfang: ein Mensch als Techniker, das Monster aus Zahlen, alles andere Bot. */
export function defaultSetup(): RoundSetup {
  return {
    technician: 'human',
    monster: 'bot',
    abilities: { scout: 'bot', panel: 'bot', archive: 'bot' },
  };
}

/**
 * Aus fremdem Text (Speicher) eine gültige Einstellung — Unbekanntes wird
 * ersetzt.
 *
 * **Die alten Plätze werden dabei übersetzt.** Im Speicher liegen bei vielen
 * noch `seats: [{role, who}, …]` aus der Zeit vor den Fähigkeiten; wer sie
 * wegwürfe, nähme dem Besitzer beim Update seine Verteilung weg. Ein Mensch
 * schlägt dabei einen Bot: „Da sitzt jemand" ist die stärkere Aussage, und
 * eine Rolle, die gar nicht vorkam, ist aus.
 */
export function readSetup(value: unknown): RoundSetup {
  const fallback = defaultSetup();
  if (!value || typeof value !== 'object') return fallback;
  const bag = value as Record<string, unknown>;
  const who = (v: unknown, or: Who): Who => (v === 'human' || v === 'bot' ? v : or);
  const abilities = { ...fallback.abilities };
  const read = bag['abilities'];
  if (read && typeof read === 'object') {
    const from = read as Record<string, unknown>;
    for (const one of ABILITIES) {
      const value_ = from[one];
      if (value_ === 'human' || value_ === 'bot' || value_ === 'off') abilities[one] = value_;
    }
  } else if (Array.isArray(bag['seats'])) {
    for (const one of ABILITIES) abilities[one] = 'off';
    for (const seat of bag['seats'] as unknown[]) {
      if (!seat || typeof seat !== 'object') continue;
      const role = (seat as Record<string, unknown>)['role'];
      if (!ABILITIES.includes(role as Ability)) continue;
      const holder = who((seat as Record<string, unknown>)['who'], 'bot');
      const before = abilities[role as Ability];
      abilities[role as Ability] = before === 'human' ? 'human' : holder;
    }
  }
  return {
    technician: who(bag['technician'], fallback.technician),
    monster:
      bag['monster'] === 'off'
        ? 'off'
        : who(bag['monster'], fallback.monster === 'off' ? 'bot' : fallback.monster),
    abilities,
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

/** Was der Techniker selbst bekommt: jede Fähigkeit, an der ein Bot rechnet. */
export function powersOf(setup: RoundSetup): SoloPowers {
  const has = (one: Ability): boolean => setup.abilities[one] === 'bot';
  return { scout: has('scout'), panel: has('panel'), archive: has('archive') };
}

/**
 * **Wie genau der Techniker sein Ziel sieht** — die eine Frage, an der die
 * Fähigkeit „Archiv" hängt.
 *
 * Solange die richtige Kiste immer hervorgehoben wurde, war der Archivar ein
 * Mensch, der vorliest, was der andere ohnehin sieht. Rechnet dort ein **Bot**,
 * gibt es niemanden zum Zurufen — dann darf die Kiste selbst leuchten
 * (`'crate'`). Sitzt dort ein **Mensch** (oder niemand), sieht der Techniker
 * nur noch den **Raum** (`'room'`); welche der zwei bis drei Kisten darin die
 * richtige ist, steht allein auf dessen Blatt, und er muss es sagen. Der
 * technische Ausweg bleibt das Röntgengerät.
 */
export type GoalPrecision = 'crate' | 'room';

export function goalPrecision(setup: RoundSetup): GoalPrecision {
  return powersOf(setup).archive ? 'crate' : 'room';
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
 * jemand im Aufbau wählt: Zuschauen steht im Optionsmenü der Runde.
 */
export function flatRoleOf(setup: RoundSetup): FlatRole {
  if (setup.technician === 'human') return 'technician';
  if (setup.monster === 'human') return 'monster';
  return 'watch';
}

/**
 * **Wie viele in einer Runde mitspielen** — der Techniker, das Monster (wenn
 * es eines gibt) und jede Fähigkeit, die nicht aus ist, ob Mensch oder Bot.
 * Zwei heißt: Techniker gegen Monster, sonst niemand. Ab drei läuft jede
 * Reaktion über eine Absprache, und die kostet Zeit (`rules/doorSeal.ts`) —
 * genau daran hängen die zwei Zielbänder des Trainings
 * (`botTraining.TRAINING_TARGETS`).
 */
export function crewSize(setup: RoundSetup): number {
  const staffed = ABILITIES.filter((one) => setup.abilities[one] !== 'off').length;
  return 1 + (setup.monster === 'off' ? 0 : 1) + staffed;
}

/** Die drei Rundenarten der 3D-Welt — dort steuert nur der Techniker aus Fleisch. */
export function roundKindOf(setup: RoundSetup): 'bot' | 'mission' | 'test' {
  if (setup.technician === 'bot') return 'bot';
  return setup.monster === 'off' ? 'test' : 'mission';
}

/** Die Einstellung, die eine Rundenart meint — die Fähigkeiten bleiben, wie sie sind. */
export function presetFor(kind: 'bot' | 'mission' | 'test', setup: RoundSetup): RoundSetup {
  return {
    ...setup,
    technician: kind === 'bot' ? 'bot' : 'human',
    monster: kind === 'test' ? 'off' : setup.monster === 'off' ? 'bot' : setup.monster,
  };
}

/**
 * **Der Techniker gehört der Brille.** Steht jemand mit der Brille im Raum,
 * trägt er den Anzug — er ist der Einzige, der darin laufen kann, und ein
 * Knopf, der ihn zum Bot erklärt, nähme ihm mitten im Schiff die Runde weg.
 * Die Tafel zeigt an seiner Stelle „VR" und lässt sich dort nicht drücken.
 */
export function technicianLabel(setup: RoundSetup, vr: boolean): string {
  return vr ? 'VR' : WHO_LABELS[setup.technician];
}

/** Dieselbe Regel als Daten: Mit Brille im Raum ist der Techniker ein Mensch. */
export function lockTechnician(setup: RoundSetup, vr: boolean): RoundSetup {
  return vr && setup.technician !== 'human' ? { ...setup, technician: 'human' } : setup;
}

/** Eine Zeile, die die Einstellung zusammenfasst — für Anzeigen. */
export function describeSetup(setup: RoundSetup): string {
  const abilities = ABILITIES.map(
    (one) => `${ABILITY_LABELS[one]} (${WHO_LABELS[setup.abilities[one]]})`,
  ).join(', ');
  return `Techniker: ${WHO_LABELS[setup.technician]} · Monster: ${WHO_LABELS[setup.monster]} · Zentrale: ${abilities}`;
}

/** Das Monster durchschalten: Bot → Mensch → Aus → Bot. */
export function cycleMonster(who: MonsterWho): MonsterWho {
  return who === 'bot' ? 'human' : who === 'human' ? 'off' : 'bot';
}

export function cycleWho(who: Who): Who {
  return who === 'bot' ? 'human' : 'bot';
}

/** Eine Fähigkeit durchschalten — dieselben drei Stufen wie beim Monster. */
export function cycleAbility(who: AbilityWho): AbilityWho {
  return who === 'bot' ? 'human' : who === 'human' ? 'off' : 'bot';
}

/**
 * **Wer mitten in der Runde die Rolle wechseln darf.**
 *
 * Der Besitzer hat die Regel in drei Sätzen gesagt, und sie stehen hier als
 * Rechnung, damit nicht jede Oberfläche sie neu errät:
 *
 * - In einer **Test-Runde** darf jeder alles — dafür ist sie da. Wer eine
 *   Kombination ausprobieren will, soll nicht erst eine Runde neu aufbauen.
 * - Sonst wechselt nur, wer **in der Einsatzzentrale** sitzt, und nur unter
 *   den Fähigkeiten der Zentrale. Wer draußen im Anzug steht, kann nicht
 *   nebenbei ins Archiv greifen.
 * - Der **Techniker in der Brille** wechselt nie, und niemand nimmt ihm seine
 *   Rolle ab: Er ist der Einzige, der den Anzug tragen kann.
 */
export interface SwitchState {
  /** Ob die laufende Runde ein Test ist (`HauntState.crew.options.test`). */
  test: boolean;
  /** Ob dieses Gerät in der Einsatzzentrale sitzt — am Telefon also. */
  inCentre: boolean;
  /** Ob der Techniker dieser Runde in der Brille steckt. */
  vrTechnician: boolean;
}

export interface SwitchRights {
  /** Ob dieses Gerät eine Fähigkeit der Zentrale nehmen darf. */
  abilities: boolean;
  /** Und ob es den Techniker übernehmen darf. */
  technician: boolean;
  /** Warum nicht — ein ganzer Satz für die Anzeige, sonst `''`. */
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
