/**
 * **Wie man in der Brille eine Runde startet — und warum das einmal nicht ging.**
 *
 * Der Besitzer meldete es in einem Satz: „Mit der VR-Brille konnte ich nicht so
 * einfach eine Runde starten." Der Grund lag nicht am Zeigen und nicht am
 * Menü selbst, sondern an drei Stellen, an denen ein Tastendruck **wortlos ins
 * Leere** lief:
 *
 * - Die Checkbox „2D-Welt von oben" (`bgvr.haunting.flat.v1`) gilt für den
 *   ganzen Browser. Stand sie an — im Van angehakt, Tage vorher —, führte
 *   „Mission starten" in der Brille in die 2D-Karte. Die aber macht in einer
 *   laufenden XR-Sitzung ausdrücklich gar nichts auf (`openFlat`: „Im Headset
 *   gibt es keine Karte von oben"). Der Eintrag in der Brille zeigte die
 *   Checkbox nicht einmal an, denn sie steht nur im Fenstermodus im Menü.
 *   Ergebnis: drücken, nichts passiert, kein Wort dazu.
 * - `startMission` und `testMission` brachen still ab, wenn dieses Gerät die
 *   Runde nicht rechnet (`isHost`) oder nicht der Techniker ist. Ein zweites
 *   Fenster, das noch als Techniker im Raum steht, reicht dafür.
 * - Und wer trotzdem traf, blieb hinter dem eigenen Menü stehen: Der Start im
 *   Schiff klappte das Panel nicht zu.
 *
 * Deshalb liegt die Rechnung jetzt hier: Welche Einträge das Brillenmenü
 * zeigt, welcher davon eine Runde startet, und **welcher Satz** an seiner
 * Stelle steht, wenn gerade keiner starten kann. Ohne three.js und ohne DOM,
 * damit ein Test das nachrechnet, statt dass es jemand mit der Brille auf
 * herausfindet.
 */
import type { RoundPhase } from '../net';

/** Die drei Rundenarten, die das Menü anbietet — dieselben wie im Van. */
export type RoundKind = 'bot' | 'mission' | 'test';

/** Der Stand, aus dem sich die Start-Einträge ergeben. */
export interface WorldMenuState {
  /** Wie der Spieler teilnimmt. Nur `vr` steuert den Techniker im Schiff. */
  role: 'vr' | 'desktop' | 'handheld';
  /** Ob die Brille wirklich auf ist (`renderer.xr.isPresenting`). */
  immersive: boolean;
  /** Wer die Runde rechnet — leer, solange das noch nicht entschieden ist. */
  hostId: string;
  /** Die eigene Kennung im Netz. */
  me: string;
  /** Wo die Runde gerade steht. */
  phase: RoundPhase;
  /** Ob die Checkbox „2D-Welt von oben" angehakt ist. */
  flatWanted: boolean;
  /** Ob im Raum schon jemand anders den Techniker dieser Runde spielt. */
  occupied: boolean;
}

/** Ein Eintrag des Brillenmenüs, der eine Runde startet — oder sagt, warum nicht. */
export interface WorldMenuEntry {
  id: string;
  label: string;
  /** Die Zeile unter der Beschriftung. Ist etwas im Weg, steht der Grund darin. */
  sub: string;
  /** Die Runde, die dieser Eintrag startet — `null`, wenn er es gerade nicht kann. */
  starts: RoundKind | null;
  /** Warum nicht, als ganzer Satz; `null`, wenn nichts im Weg ist. */
  blocked: string | null;
}

/** Was ein Start am Rundenstand ändert. */
export interface RoundStart {
  phase: RoundPhase;
  /** Ob ein Monster im Haus ist — nur die Mission hat eins. */
  monsterOn: boolean;
  /** Der sichere Test: kein Monster, kein Schaden, Testlabor offen. */
  test: boolean;
  /** Und ob das Testlicht dazu angeht. */
  bright: boolean;
}

/**
 * **Nach dem Start läuft die Runde.** Bot-Runde und Test sind derselbe sichere
 * Stand — die Vorführung spielt im Testlabor, nur eben ohne Menschen am Stock.
 */
export function startedRound(kind: RoundKind): RoundStart {
  const mission = kind === 'mission';
  return { phase: 'running', monsterOn: mission, test: !mission, bright: !mission };
}

/**
 * **Ob dieser Start als 2D-Karte läuft — in der Brille nie.**
 *
 * Die Checkbox gilt für den ganzen Browser, die Karte von oben aber ist ein
 * Fenster-Ding: `openFlat` steigt in einer XR-Sitzung wieder aus. Wer die
 * Brille auf hat, bekommt deshalb das Schiff, egal was angehakt ist.
 */
export function opensFlat(state: Pick<WorldMenuState, 'flatWanted' | 'immersive'>): boolean {
  return state.flatWanted && !state.immersive;
}

/** Ob dieses Gerät die Runde rechnet. Ein leerer Gastgeber heißt: noch offen. */
export function mayCompute(state: Pick<WorldMenuState, 'hostId' | 'me'>): boolean {
  return state.hostId === '' || state.hostId === state.me;
}

/**
 * Die drei Sätze, die an die Stelle einer Runde treten, die gerade nicht
 * losgeht. Sie stehen als Konstanten hier, weil dieselben Worte zweimal
 * gebraucht werden: einmal im Menü, wo sie unter der Beschriftung stehen, und
 * einmal als Meldung, wenn jemand den Eintrag trotzdem drückt.
 */
export const NOT_TECHNICIAN =
  'Nur der Techniker startet eine Runde: Brille aufsetzen oder „Als Techniker am Desktop testen" wählen.';
export const HOST_BUSY =
  'Ein anderer Techniker rechnet diese Runde gerade — eine zweite lässt sich hier nicht starten.';
export const ROOM_BUSY =
  'Bot-Test nicht verfügbar: Ein anderer Techniker spielt bereits in diesem Raum.';

/**
 * **Was einem Start im Weg steht** — als Satz, den man einem Spieler zeigen
 * kann, oder `null`, wenn nichts im Weg ist.
 */
export function startBlocker(state: WorldMenuState, kind: RoundKind): string | null {
  if (state.role !== 'vr') return NOT_TECHNICIAN;
  if (!mayCompute(state)) return HOST_BUSY;
  // Die Bot-Runde ist eine Vorführung für einen: Sie setzt den Stand zurück,
  // und das mitten in der Runde eines anderen wäre ein Spielabbruch mit Ansage.
  if (kind === 'bot' && state.occupied) return ROOM_BUSY;
  return null;
}

/** Die Beschriftung je Art — die Mission sagt dazu, wenn sie eine laufende ablöst. */
const LABELS: Readonly<Record<RoundKind, string>> = {
  mission: 'Mission starten',
  test: 'TEST / ohne Monster',
  bot: 'Bot-Runde anschauen',
};

const HINTS: Readonly<Record<RoundKind, string>> = {
  mission: 'Drei Systeme reparieren und zur Zentrale zurückkehren',
  test: 'Sicher üben · Ausrüstung und beleuchtetes Testlabor',
  bot: 'Eine vollständige Reparaturrunde automatisch beobachten',
};

/** In dieser Reihenfolge: Wer die Brille aufsetzt, will die Mission, nicht die Vorführung. */
export const ROUND_ORDER: readonly RoundKind[] = ['mission', 'test', 'bot'];

/**
 * **Die Start-Einträge des Brillenmenüs**, in der Reihenfolge, in der sie
 * dastehen — die Mission zuerst, damit sie auf der ersten Seite des Panels
 * landet und niemand für eine Runde erst blättern muss.
 *
 * Genau **einer** davon startet die Mission; ein Untermenü gibt es hier nicht.
 * Die Einstellungen darunter (Station, Gegner, Verteilung) baut `menu()`
 * weiterhin selbst — sie ändern nichts an der Frage, ob eine Runde losgeht.
 */
export function startEntries(state: WorldMenuState): WorldMenuEntry[] {
  return ROUND_ORDER.map((kind) => {
    const blocked = startBlocker(state, kind);
    const running = state.phase === 'running';
    const notes: string[] = [];
    if (opensFlat(state)) notes.push('Als 2D-Karte von oben');
    if (running) notes.push('Die laufende Runde endet damit');
    notes.push(HINTS[kind]);
    return {
      id: `haunt:${kind === 'mission' ? 'start' : kind === 'test' ? 'test' : 'bot-round'}`,
      label: kind === 'mission' && running ? 'Mission neu starten' : LABELS[kind],
      sub: blocked ?? notes.join(' · '),
      starts: blocked ? null : kind,
      blocked,
    };
  });
}
