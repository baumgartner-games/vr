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
 *
 * **Seit der Lobby** (`rules/lobby.ts`) stehen hier nicht mehr drei eigene
 * Rundenarten, sondern dieselben drei Absichten wie im Van und im
 * Optionsmenü der 2D-Welt: Spielen · Zuschauen · Trainieren, in derselben
 * Reihenfolge und mit denselben Worten. Drei Oberflächen, die dieselbe
 * Entscheidung verschieden nennen, waren der eigentliche Befund.
 */
import { INTENT_HINTS, INTENT_LABELS, INTENTS, type Intent } from './lobby';
import type { RoundPhase } from '../net';

/**
 * **Die drei Rundenarten der Maschine** — was am Ende wirklich losgeht. Sie
 * sind nicht mehr das, was jemand *wählt*: Gewählt wird die Absicht
 * (`rules/lobby.ts`, Spielen · Zuschauen · Trainieren), und die Verteilung
 * rechnet sie in diese drei um (`roundSetup.roundKindOf`). Die Namen bleiben,
 * weil der Rest der Welt sie kennt (`startedRound`).
 */
export type RoundKind = 'bot' | 'mission' | 'test';

/**
 * Beides geht herein, eine Absicht kommt heraus — so lange, bis die letzten
 * Aufrufer der alten Namen (`startMission`, `testMission`) umgestellt sind.
 * Ein zweiter Satz Namen, den nur die Hälfte des Hauses kennt, wäre genau die
 * Doppelung, gegen die die Lobby gebaut wurde.
 */
export function asIntent(what: Intent | RoundKind): Intent {
  if (what === 'mission') return 'play';
  if (what === 'test') return 'train';
  if (what === 'bot') return 'watch';
  return what;
}

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
  /** Ob die Ansicht der Lobby auf „2D von oben" steht (`rules/lobby.View`). */
  flatWanted: boolean;
  /**
   * Welche der drei Kacheln gerade leuchtet — gerechnet aus der Verteilung
   * (`lobby.intentOf`), nicht aus einem zweiten Merker daneben.
   */
  intent: Intent;
  /** Ob im Raum schon jemand anders den Techniker dieser Runde spielt. */
  occupied: boolean;
}

/** Ein Eintrag des Brillenmenüs, der eine Runde startet — oder sagt, warum nicht. */
export interface WorldMenuEntry {
  id: string;
  label: string;
  /** Die Zeile unter der Beschriftung. Ist etwas im Weg, steht der Grund darin. */
  sub: string;
  /** Die Absicht, die dieser Eintrag startet — `null`, wenn er es gerade nicht kann. */
  starts: Intent | null;
  /** Warum nicht, als ganzer Satz; `null`, wenn nichts im Weg ist. */
  blocked: string | null;
  /** Ob das die Absicht ist, die gerade auf der Tafel steht. */
  active: boolean;
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
  'Zuschauen aus dem Schiff geht nicht, solange ein anderer Techniker in diesem Raum spielt — nimm die Karte von oben oder den Fernseher in der Zentrale.';

/**
 * **Was einem Start im Weg steht** — als Satz, den man einem Spieler zeigen
 * kann, oder `null`, wenn nichts im Weg ist.
 */
export function startBlocker(state: WorldMenuState, what: Intent | RoundKind): string | null {
  if (state.role !== 'vr') return NOT_TECHNICIAN;
  if (!mayCompute(state)) return HOST_BUSY;
  // Zuschauen ist im Schiff eine Vorführung für einen: Sie setzt den Stand
  // zurück, und das mitten in der Runde eines anderen wäre ein Spielabbruch
  // mit Ansage. (In 2D ist es eine eigene Karte und stört niemanden.)
  if (asIntent(what) === 'watch' && state.occupied) return ROOM_BUSY;
  return null;
}

/**
 * **Was aus einem Druck auf „Mission starten" im Aufbau wird.**
 *
 * Der zweite Befund des Besitzers war: „Der Knopf ‚Mission starten' scheint
 * die Mission nicht zu starten." Er hatte recht, und der Grund stand eine
 * Datei weiter: Der Startknopf der Einsatzzentrale ruft `startMission`, und
 * das fragt zuerst `startBlocker` — wer nicht `role === 'vr'` ist, bekommt
 * `NOT_TECHNICIAN`. Das ist **jedes** Telefon und jeder Desktop, der nicht
 * vorher in einem *anderen* Menü „Als Techniker am Desktop testen" gewählt
 * hatte. Der Satz dazu ging in die Statuszeile des Handgelenk-Menüs, und die
 * liegt als Panel in der 3D-Szene hinter der Einsatzzentrale
 * (`haunting.css`, `body.haunt-on`). Übrig blieb ein Knopf, der nichts tut
 * und nichts sagt — genau die Falle, gegen die dieses Modul gebaut wurde.
 *
 * Der Aufbau **ist** der Weg an den Stock: Wer dort startet und den Anzug
 * tragen soll, bekommt ihn. Diese Zeile rechnet, was aus dem Druck wird:
 *
 * - `start` — dieses Gerät steht schon am Stock (Brille oder Techniker am
 *   Desktop); die Runde geht sofort los.
 * - `stick` — es soll den Anzug tragen und trägt ihn noch nicht: erst an den
 *   Stock (`HauntingWorld.flatTechnician`), dann starten.
 * - `others` — im Raum trägt schon jemand anders den Anzug. Im Schiff gibt es
 *   einen Techniker je Raum.
 * - `nobody` — die Tafel will einen Menschen im Anzug, und dieses Gerät hat
 *   sich einen Platz in der Zentrale genommen. Dann fehlt der Runde einer.
 */
export type ShipStart = 'start' | 'stick' | 'others' | 'nobody';

export interface ShipStartState {
  /** Ob dieses Gerät den Anzug schon trägt — Brille oder Techniker am Desktop. */
  atStick: boolean;
  /** Ob dieses Gerät der Techniker dieser Runde ist (`roundSetup.MyRole`). */
  mine: boolean;
  /** Ob im Raum schon jemand anders den Anzug trägt. */
  occupied: boolean;
}

export function shipStart(state: ShipStartState): ShipStart {
  if (state.atStick) return 'start';
  if (state.occupied) return 'others';
  return state.mine ? 'stick' : 'nobody';
}

export const SHIP_NEEDS_TECHNICIAN =
  'Im Schiff braucht die Runde einen Menschen im Anzug. Nimm oben den Reiter „Techniker" — ' +
  'oder stell auf der Tafel „Techniker: Bot", dann läuft sie als Vorführung.';
export const SHIP_OCCUPIED =
  'Im Schiff trägt schon jemand anders den Anzug — es gibt einen Techniker je Raum. ' +
  'Nimm die Karte von oben oder einen Platz in der Zentrale.';

/**
 * **Die drei Start-Einträge des Brillenmenüs** — dieselben drei Absichten, in
 * derselben Reihenfolge und mit denselben Worten wie die Kacheln im Van
 * (`rules/lobby.INTENTS`). Genau das war vorher nicht so: Die Brille bot
 * „Mission starten / TEST / Bot-Runde anschauen" an, der Van „Bot-Runde
 * ansehen / Runde starten / Mission spielen (2D)", und niemand konnte dem
 * anderen über den Tisch zurufen, was er drücken soll.
 *
 * Die Einstellungen darunter (Station, Gegner, Verteilung) baut `menu()`
 * weiterhin selbst — sie ändern nichts an der Frage, ob eine Runde losgeht.
 */
export function startEntries(state: WorldMenuState): WorldMenuEntry[] {
  const running = state.phase === 'running';
  return INTENTS.map((intent) => {
    const blocked = startBlocker(state, intent);
    const notes: string[] = [];
    if (opensFlat(state)) notes.push('Als 2D-Karte von oben');
    if (running) notes.push('Die laufende Runde endet damit');
    notes.push(INTENT_HINTS[intent]);
    return {
      id: `haunt:${intent}`,
      // **Ein Wort, überall dasselbe** (`INTENT_LABELS`). Vorher hieß dieselbe
      // Sache in der Brille „Mission starten", im Van „Runde starten" und im
      // Optionsmenü „Als Techniker spielen"; dass eine laufende Runde damit
      // endet, steht in der Zeile darunter und nicht im Namen.
      label: INTENT_LABELS[intent],
      sub: blocked ?? notes.join(' · '),
      starts: blocked ? null : intent,
      blocked,
      active: state.intent === intent,
    };
  });
}
