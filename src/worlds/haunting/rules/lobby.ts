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
import type { RoundSetup } from './roundSetup';

/** Was ich vorhabe: spielen, zusehen oder ohne Monster üben. */
export type Intent = 'play' | 'watch' | 'train';

/** Wie ich dabei zusehe: die Karte von oben oder das Schiff. */
export type View = '2d' | '3d';

export interface LobbyChoice {
  intent: Intent;
  view: View;
}

/**
 * Die drei Absichten, in der Reihenfolge, in der sie überall stehen. Gewählt
 * werden im Aufbau nur noch zwei davon (über das Häkchen „Testen"); `watch`
 * bleibt für das Brillenmenü und für die Verteilung, die von Hand entsteht.
 */
export const INTENTS: readonly Intent[] = ['play', 'watch', 'train'];

export const LOBBY_STORAGE = 'bgvr.haunting.lobby.v1';

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
export const TEST_CHECK = 'Testen';
export const TEST_CHECK_HINT =
  'Ohne Monster · in einer Test-Runde darf jeder jederzeit jede Rolle wechseln';

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
  return { intent: 'play', view: role === 'handheld' ? '2d' : '3d' };
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
 * `me` sagt, welchen der beiden Plätze *dieses* Gerät hat; ohne Angabe ist es
 * der Techniker, wie überall sonst in diesem Spiel. Das ist der Grund, warum
 * „Zuschauen" nicht stumpf beide auf Bot stellt: Ein Mensch, der woanders am
 * Telefon sitzt und das Monster spielt, bleibt ein Mensch — sonst nähme ihm
 * mein Tipp auf „Zuschauen" die Runde weg. Die Fähigkeiten der Zentrale rührt
 * keine der drei Absichten an.
 */
export function applyIntent(
  setup: RoundSetup,
  intent: Intent,
  me: 'technician' | 'monster' | null = 'technician',
): RoundSetup {
  if (intent === 'train') {
    // Trainieren heißt: kein Monster, und ich bin der, der übt.
    return { ...setup, technician: 'human', monster: 'off' };
  }
  if (intent === 'watch') {
    return {
      ...setup,
      technician: setup.technician === 'human' && me !== 'technician' ? 'human' : 'bot',
      monster: setup.monster === 'human' && me !== 'monster' ? 'human' : 'bot',
    };
  }
  // Spielen: Wer das Monster ist, überlässt den Techniker den Zahlen; alle
  // anderen greifen selbst zum Stock. Ein ausgeschaltetes Monster kommt zurück
  // — eine Mission ohne Monster wäre ein Training.
  const asMonster = me === 'monster';
  return {
    ...setup,
    technician: asMonster ? 'bot' : 'human',
    monster: asMonster ? 'human' : setup.monster === 'off' ? 'bot' : setup.monster,
  };
}

/**
 * Welche Kachel zu dieser Verteilung leuchtet. Die Verteilung ist die
 * Wahrheit: Sie lässt sich auch von Hand umstellen (Optionsmenü, ein Mensch,
 * der sich über das Netz auf einen Platz setzt), und dann muss die Lobby
 * nachgeben und nicht umgekehrt.
 */
export function intentOf(setup: RoundSetup): Intent {
  if (setup.monster === 'off') return 'train';
  // Ein Techniker aus Zahlen heißt zusehen — es sei denn, ich selbst stehe
  // als Monster auf der Tafel: Dann ist das eine Runde und kein Schauspiel.
  if (setup.technician === 'bot' && setup.monster !== 'human') return 'watch';
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
