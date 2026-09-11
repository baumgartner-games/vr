/**
 * **Was ich vorhabe — und wie ich es sehen will.**
 *
 * Dieselbe Entscheidung lag bisher an drei Stellen und in zwei Sprachen: die
 * Checkbox „2D-Welt von oben" im Van (ein globaler Schalter, der die Kacheln
 * darunter umdeutete), die Kachel „Bot-Runde ansehen" (in Wahrheit nur eine
 * Voreinstellung der Verteilung) und der zyklische Rollenknopf im
 * Optionsmenü der 2D-Welt. Wer sie las, musste raten, was „Runde starten"
 * gerade tut. Hier steht sie einmal, in zwei Achsen, die einander nichts
 * angehen:
 *
 * - **Die Absicht** (`Intent`) — Spielen, Zuschauen, Trainieren. Sie sagt,
 *   *was* passiert, und sie ist keine eigene Wahrheit neben der Verteilung:
 *   `applyIntent` schreibt sie in die `RoundSetup`, `intentOf` liest sie
 *   wieder heraus. Die Fähigkeiten der Zentrale bleiben dabei unberührt — wer
 *   das Archiv hält, hält es auch nach einem Tipp auf „Testen".
 * - **Die Ansicht** (`View`) — 2D von oben oder 3D im Schiff. Sie sagt, *wie*
 *   man dabei zusieht, und sonst nichts.
 *
 * **Aus den drei Kacheln sind zwei Kästchen geworden.** Der Besitzer wollte
 * den Aufbau einfacher: „2D-Welt" und „Testen" sind Häkchen über der
 * Verteilung, und gestartet wird mit dem einen Knopf darunter. „Zuschauen"
 * wird im Aufbau gar nicht mehr gewählt — es ist keine Absicht für die
 * *nächste* Runde, sondern etwas, das man mitten in der laufenden anschaltet
 * (Optionsmenü der 2D-Welt). Die Absicht `watch` bleibt als Datum bestehen,
 * weil die Verteilung sie weiterhin ausdrücken kann (Techniker aus Zahlen,
 * Mensch sieht zu) — sie steht nur in keinem Aufbau-Menü mehr.
 *
 * Reine Daten, ohne DOM und ohne three.js: Die Lobby im Van, das Menü in der
 * Brille und das Optionsmenü der 2D-Welt lesen und schreiben dieselbe Wahl,
 * gemerkt im Browser (`LOBBY_STORAGE`).
 */
import type { PlayerRole } from '../../../core/types';
import { MY_ROLES, withWho, type MyRole, type RoundSetup } from './roundSetup';

/** Was ich vorhabe: spielen, zusehen oder ohne Monster üben. */
export type Intent = 'play' | 'watch' | 'train';

/** Wie ich dabei zusehe: die Karte von oben oder das Schiff. */
export type View = '2d' | '3d';

export interface LobbyChoice {
  intent: Intent;
  view: View;
  /**
   * **Was dieses Gerät ist** (`rules/roundSetup.MyRole`): einer der fünf
   * Plätze oder einer der zwei Zuschauer. Eine Wahl je Gerät, nicht je Runde —
   * deshalb hier und nicht auf der Tafel. Fehlt sie in einem alten Speicher,
   * gilt der Anfang: Zuschauer des Technikers.
   */
  me: MyRole;
}

/**
 * Die drei Absichten, in der Reihenfolge, in der sie überall stehen. Gewählt
 * werden im Aufbau nur noch zwei davon (über das Häkchen „Testen"); `watch`
 * bleibt für das Brillenmenü und für die Verteilung, die von Hand entsteht.
 */
export const INTENTS: readonly Intent[] = ['play', 'watch', 'train'];

export const LOBBY_STORAGE = 'bgvr.haunting.lobby.v1';

/**
 * **Was ein Tipp auf „2D ↔ 3D" mitten in der Runde bedeutet** — die Rechnung
 * dazu, ohne Welt und ohne Bild, damit ein Test sie nachrechnen kann.
 *
 * Sie stand als Kette von `if` in `HauntingWorld.switchView`, und in der Kette
 * steckten zwei Fehler, die man ihr nicht ansah: Der Knopf wurde dem
 * Zuschauer **angeboten** und dann mit „du bist nicht der Techniker"
 * abgewiesen, und solange die Bot-Runde in 2D lief, hielt die Welt sich für
 * „schon in 3D" und tat gar nichts. Beides ist hier eine Zeile.
 */
export interface ViewSwapState {
  /** Was gerade zu sehen ist. */
  now: View;
  /** Wohin es gehen soll. */
  want: View;
  /** Ob hier einer **Vorführung** zugesehen wird — der Bot-Runde, eigener Rechnung. */
  demo: boolean;
  /** Ob dieses Gerät die Runde wirklich als Techniker spielt. */
  technician: boolean;
  /** Ob die Brille aufgesetzt ist — dort gibt es keine Karte von oben. */
  presenting: boolean;
}

/**
 * - `same` — nichts zu tun, die Ansicht steht schon.
 * - `xr` — in der Brille gibt es die Karte von oben nicht.
 * - `demo` — die Vorführung fängt auf der anderen Seite neu an.
 * - `handover` — dieselbe Runde, andere Seite: Stand und Buchführung reisen mit.
 * - `blocked` — wer weder Techniker noch Zuschauer einer Vorführung ist,
 *   wechselt nicht: Er sähe sonst der Runde eines anderen von innen zu.
 */
export type ViewSwap = 'same' | 'xr' | 'demo' | 'handover' | 'blocked';

export function viewSwap(state: ViewSwapState): ViewSwap {
  if (state.want === state.now) return 'same';
  if (state.want === '2d' && state.presenting) return 'xr';
  // **Der Zuschauer darf vor dem Techniker.** Eine Vorführung gehört
  // niemandem; sie von der anderen Seite anzusehen nimmt keinem etwas weg.
  if (state.demo) return 'demo';
  return state.technician ? 'handover' : 'blocked';
}

/**
 * Wo die alte Checkbox „2D-Welt von oben" ihren Stand aufhob. Sie wird beim
 * ersten Laden noch einmal gelesen — wer am Telefon spielte, soll nach dem
 * Update nicht plötzlich im Schiff stehen — und danach nie wieder
 * geschrieben. Ein Schlüssel, der weiterlebt, ohne dass ihn jemand pflegt,
 * ist die nächste Fehlerquelle.
 */
export const FLAT_STORAGE = 'bgvr.haunting.flat.v1';

export const INTENT_LABELS: Readonly<Record<Intent, string>> = {
  play: 'Spielen',
  watch: 'Zuschauen',
  train: 'Trainieren',
};

export const INTENT_HINTS: Readonly<Record<Intent, string>> = {
  play: 'Die Mission, mit Monster',
  watch: 'Der Runde im Raum folgen — sonst Bot gegen Bot',
  train: 'Ohne Monster · jeder darf jede Rolle wechseln',
};

/**
 * **Die zwei Häkchen des Aufbaus.** Sie stehen hier und nicht in der
 * Oberfläche, weil dieselben zwei Worte im Van, im Brillenmenü und im
 * Optionsmenü gebraucht werden — und drei Oberflächen, die dieselbe Sache
 * verschieden nennen, waren der Befund, mit dem diese Datei angefangen hat.
 */
export const FLAT_CHECK = '2D-Welt von oben';

export const VIEW_LABELS: Readonly<Record<View, string>> = {
  '2d': '2D von oben',
  '3d': '3D Schiff',
};

/**
 * Der Anfang: spielen — und zwar so, wie das Gerät es kann. Auf dem Telefon
 * ist die Karte von oben die Voreinstellung (3D bleibt möglich, aber ein
 * Schiff auf 390 Punkten Breite ist keine Einladung); am Desktop und in der
 * Brille das Schiff.
 */
export function defaultLobby(role: PlayerRole): LobbyChoice {
  // **Alle fangen in der Zentrale an und sehen dem Techniker zu** — außer dem,
  // der den Anzug trägt: Brille und Desktop sind der Techniker, denn dort
  // gibt es das Schiff, und ein Schiff ohne Techniker ist eine Vorführung.
  return {
    intent: 'play',
    view: role === 'handheld' ? '2d' : '3d',
    me: role === 'handheld' ? 'watch:technician' : 'technician',
  };
}

/**
 * Aus fremdem Text (Speicher) eine gültige Wahl — Unbekanntes wird ersetzt.
 *
 * `legacyFlat` ist der Stand der alten Checkbox: Er zählt nur, solange die
 * Lobby selbst noch nichts gemerkt hat, und `'1'` heißt „2D-Welt von oben".
 */
export function readLobby(
  value: unknown,
  legacyFlat?: string | null,
  role: PlayerRole = 'desktop',
): LobbyChoice {
  const fallback = defaultLobby(role);
  const bag = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  const intent = bag?.['intent'];
  const view = bag?.['view'];
  const me = bag?.['me'];
  return {
    intent:
      intent === 'play' || intent === 'watch' || intent === 'train' ? intent : fallback.intent,
    view:
      view === '2d' || view === '3d'
        ? view
        : typeof legacyFlat === 'string'
          ? legacyFlat === '1'
            ? '2d'
            : '3d'
          : fallback.view,
    me: MY_ROLES.includes(me as MyRole) ? (me as MyRole) : fallback.me,
  };
}

export function loadLobby(
  storage: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined'
    ? null
    : localStorage,
  role: PlayerRole = 'desktop',
): LobbyChoice {
  try {
    const raw = storage?.getItem(LOBBY_STORAGE);
    return readLobby(raw ? JSON.parse(raw) : null, storage?.getItem(FLAT_STORAGE), role);
  } catch {
    // Kein Speicher (privates Fenster, jsdom ohne Origin) oder Bruch darin:
    // dann eben von vorn. Eine kaputte Zeile darf niemanden aussperren.
    return defaultLobby(role);
  }
}

export function saveLobby(
  choice: LobbyChoice,
  storage: Pick<Storage, 'setItem'> | null = typeof localStorage === 'undefined'
    ? null
    : localStorage,
): void {
  try {
    storage?.setItem(LOBBY_STORAGE, JSON.stringify(choice));
  } catch {
    // Ein privates Fenster ohne Speicher darf die Wahl nicht verhindern.
  }
}

/**
 * **Die Absicht in die Verteilung schreiben** — die eine Stelle, an der aus
 * einer Kachel eine Runde wird.
 *
 * `me` ist, was *dieses* Gerät ist (`rules/roundSetup.MyRole`). Zwei Plätze
 * hängen daran: Wer sich als **Techniker** gewählt hat, trägt beim Spielen
 * den Anzug; wer sich als **Monster** gewählt hat, hält dessen Stock, und der
 * Techniker geht an die Zahlen. Alle anderen — die Farben und die Zuschauer —
 * rühren an den beiden Plätzen nichts: Für sie sagt die Tafel, wer den Anzug
 * trägt (ein Mensch an der Brille, sonst ein Bot). Die Farbplätze rührt keine
 * der drei Absichten an.
 *
 * **„Trainieren" heißt nur: kein Monster.** Das Häkchen „Testen" dafür ist
 * weg — auf der Tafel steht „Monster: Aus", und das ist dieselbe Aussage an
 * der Stelle, an die sie gehört.
 */
export function applyIntent(
  setup: RoundSetup,
  intent: Intent,
  me: MyRole | null = 'technician',
): RoundSetup {
  const asTechnician = me === 'technician';
  const asMonster = me === 'monster';
  let next = setup;
  if (asTechnician && setup.seats.technician.who !== 'human')
    next = withWho(next, 'technician', 'human');
  if (asMonster) {
    next = withWho(next, 'monster', 'human');
    if (next.seats.technician.who === 'human') next = withWho(next, 'technician', 'bot');
  }
  if (intent === 'train') return withWho(next, 'monster', 'off');
  if (intent === 'watch') {
    // Zusehen: Techniker und Monster aus Zahlen — es sei denn, ein anderer
    // Mensch hält den Platz; den nimmt mein Tipp auf „Zuschauen" ihm nicht weg.
    if (asTechnician || next.seats.technician.who !== 'human')
      next = withWho(next, 'technician', 'bot');
    if (asMonster || next.seats.monster.who !== 'human') next = withWho(next, 'monster', 'bot');
    return next;
  }
  // Spielen: Ein ausgeschaltetes Monster kommt zurück — eine Mission ohne
  // Monster wäre ein Training.
  if (next.seats.monster.who === 'off') next = withWho(next, 'monster', 'bot');
  return next;
}

/**
 * Welche Kachel zu dieser Verteilung leuchtet. Die Verteilung ist die
 * Wahrheit: Sie lässt sich auch von Hand umstellen (Optionsmenü, ein Mensch,
 * der sich über das Netz auf einen Platz setzt), und dann muss die Lobby
 * nachgeben und nicht umgekehrt.
 */
export function intentOf(setup: RoundSetup): Intent {
  if (setup.seats.monster.who === 'off') return 'train';
  // Ein Techniker aus Zahlen heißt zusehen — es sei denn, ein Mensch spielt
  // das Monster: Dann ist das eine Runde und kein Schauspiel.
  if (setup.seats.technician.who !== 'human' && setup.seats.monster.who !== 'human') return 'watch';
  return 'play';
}

/**
 * Die Beschriftung des einen Startknopfes. Sie sagt, was gleich passiert —
 * und das steht in der Verteilung, nicht im Häkchen: Wer die Tafel von Hand
 * umstellt, hätte sonst „Mission" auf dem Knopf und startete einen Test.
 *
 * **Die Ansicht steht nicht mehr dabei.** „Mission starten (2D)" war eine
 * Klammer, die dasselbe sagte wie das Häkchen zwei Zeilen darüber; der
 * Besitzer hat sie ausdrücklich weghaben wollen, und er hat recht: Ein Knopf
 * wiederholt keine Einstellung, er führt sie aus.
 */
export function startLabel(setup: RoundSetup): string {
  const intent = intentOf(setup);
  if (intent === 'watch') return 'Zuschauen';
  return intent === 'play' ? 'Mission starten' : 'Test starten';
}
