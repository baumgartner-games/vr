/**
 * **Der Ablauf einer Runde, in einem Satz je Schritt** — und die Worte dafür.
 *
 * Der Befund des Besitzers: Das Menüsystem sei _„absolut wirr (wie, wann mit
 * Test, wann echt)"_. Er hatte recht. „Test" hieß an vier Stellen vier
 * verschiedene Dinge — der helle Stand nach „Rollen testen", der Start „Test
 * starten" ohne Monster, das „Testlicht" und das Häkchen `options.test` —, und
 * dieselbe Mission stand als „Spielen", „Mission starten" und „Runde neu
 * starten" in drei Menüs. Hier steht jetzt, **was es gibt** und **wie es
 * heißt**, für jede Oberfläche gleich (Telefon, Bildschirm, Brille):
 *
 * 1. **Lobby** — Raum-Code, Verbinden, Beitreten (Startseite, `main.ts`).
 * 2. **Rollen** — die Tafel im Aufbau: wer welchen Platz hält.
 * 3. **Modus** — genau zwei, deutlich getrennt:
 *    - **Übungsrunde**: hell, keine Uhr, niemand wird getroffen, jeder darf
 *      jede Rolle. Hier landet man nach dem Beitreten, nach „Abbrechen" und
 *      nach dem Ende einer Runde.
 *    - **Echte Runde**: dunkel, das Monster jagt, die Uhr läuft, Treffer
 *      zählen.
 *    Dazu, abseits, die **Vorführung**: Bots spielen, man schaut zu.
 * 4. **Start** — ein Knopf, dessen Aufschrift sagt, was losgeht.
 * 5. **Pause** — das Menü im Spiel (Zahnrad, ⚙ Optionen, Handgelenk): zuerst
 *    „Weiterspielen", dann was die Runde ändert, dann der Weg zurück zu den
 *    Rollen. Oben steht immer, **in welcher Runde man ist**.
 *
 * Reine Daten, ohne DOM und ohne three.js.
 */
import type { RoundPhase } from '../net';

/** Was gerade läuft — so, wie es ein Spieler wissen muss. */
export type RoundMode = 'practice' | 'real' | 'demo' | 'over';

/** Was ein Gerät vom Stand weiß, um den Modus zu nennen. */
export interface RoundModeState {
  phase: RoundPhase;
  /** Der sichere Stand (`StationOptions.test`): kein Monster, kein Schaden. */
  test: boolean;
  /** Die Bot-Runde: Ein Techniker aus Zahlen spielt, man schaut zu. */
  simulation: boolean;
}

/**
 * **Welcher Modus das ist.** Der Stand vor dem Start (`briefing`) und der
 * sichere Test (`options.test`) sind für den Spieler dasselbe — hell, ohne
 * Uhr, ohne Treffer — und heißen deshalb beide **Übungsrunde**.
 */
export function roundMode(state: RoundModeState): RoundMode {
  if (state.phase === 'won' || state.phase === 'lost') return 'over';
  if (state.phase !== 'running') return 'practice';
  if (state.simulation) return 'demo';
  return state.test ? 'practice' : 'real';
}

/** Wie ein Modus aussieht: ein Wort in Großbuchstaben, ein Satz, ein Ton. */
export interface ModeText {
  /** Das Schild, kurz: „ÜBUNGSRUNDE". */
  badge: string;
  /** Derselbe Name im Satz: „Übungsrunde". */
  name: string;
  /** Der Satz daneben: „Du bist in einer Übungsrunde …". */
  line: string;
  /** Wie es eingefärbt wird: ruhig, scharf, zuschauend, vorbei. */
  tone: 'calm' | 'live' | 'watch' | 'done';
}

export const MODE_TEXT: Readonly<Record<RoundMode, ModeText>> = {
  practice: {
    badge: 'ÜBUNGSRUNDE',
    name: 'Übungsrunde',
    line: 'Du bist in einer Übungsrunde: hell, keine Uhr, niemand wird getroffen.',
    tone: 'calm',
  },
  real: {
    badge: 'ECHTE RUNDE',
    name: 'Echte Runde',
    line: 'Du bist in einer echten Runde: Das Monster jagt, die Uhr läuft, Treffer zählen.',
    tone: 'live',
  },
  demo: {
    badge: 'VORFÜHRUNG',
    name: 'Vorführung',
    line: 'Bots spielen die Runde — du schaust zu. Niemand wird getroffen.',
    tone: 'watch',
  },
  over: {
    badge: 'RUNDE VORBEI',
    name: 'Runde vorbei',
    line: 'Die Runde ist vorbei. Nochmal echt — oder zurück in die Übungsrunde.',
    tone: 'done',
  },
};

/**
 * **Die Aufschriften der Knöpfe** — überall dieselben. Wer am Tisch ruft
 * „drück ‚Echte Runde starten'", findet den Knopf auf jedem Gerät unter
 * diesem Namen.
 */
export const FLOW = {
  /** Startet die echte Runde — mit Monster, Uhr und Treffern. */
  real: 'Echte Runde starten',
  realHint: 'Dunkel, das Monster jagt, die Uhr läuft, Treffer zählen',
  /** Auf die Karte, ohne dass etwas losgeht — oder zurück dorthin. */
  practice: 'Übungsrunde',
  practiceHint: 'Hell, keine Uhr, niemand wird getroffen — Rollen ausprobieren',
  /** Bots spielen, man schaut zu. */
  demo: 'Bots spielen lassen',
  demoHint: 'Techniker und Monster aus Zahlen — du schaust zu',
  /** Die echte Runde beenden — zurück in die Übung, auf derselben Station. */
  stop: 'Echte Runde abbrechen',
  stopHint: 'Zurück in die Übungsrunde: hell, ohne Uhr, dieselbe Station',
  /** Eine laufende echte Runde, zu der man nach dem Neuladen zurückwill. */
  join: 'Zur laufenden echten Runde',
  /** Nach dem Ende. */
  again: 'Nochmal: echte Runde',
  back: 'Zurück in die Übungsrunde',
  /** Das Pausemenü. */
  pause: 'Pause',
  resume: 'Weiterspielen',
  setup: 'Rollen & Aufbau',
  setupHint: 'Zurück zur Tafel: Plätze verteilen, dann Übungsrunde oder echte Runde',
} as const;

/**
 * **Die Schritte bis zum Start**, wie der Aufbau sie über die Tafel und die
 * zwei Knöpfe schreibt.
 */
export const FLOW_STEPS: readonly string[] = [
  '1 · Rollen verteilen',
  '2 · Übungsrunde oder echte Runde',
];

/** Die Kopfzeile des Pausemenüs: „Pause · Übungsrunde". */
export function pauseTitle(mode: RoundMode): string {
  return `${FLOW.pause} · ${MODE_TEXT[mode].name}`;
}

/**
 * **Was das Pausemenü an Rundenknöpfen anbietet** — je Modus genau einen Weg,
 * nie zwei zum selben Ziel: In der Übung „Echte Runde starten", in der echten
 * Runde „Echte Runde abbrechen", in der Vorführung ebenfalls „abbrechen"
 * (zurück in die Übung), nach dem Ende „Nochmal" und „Zurück".
 */
export function pauseActions(mode: RoundMode): Array<'real' | 'stop' | 'again' | 'back'> {
  if (mode === 'practice') return ['real'];
  if (mode === 'over') return ['again', 'back'];
  return ['stop'];
}
