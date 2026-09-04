/**
 * Wie stark ein Controller brummt — und wann.
 *
 * WebXR kann genau eine Sache: `pulse(stärke, dauer)`. Alles, was sich nach
 * mehr anfühlt — ein Doppelklopfen, eine Salve, ein Herzschlag —, ist eine
 * Reihe solcher Stöße mit Pausen dazwischen. Genau diese Reihen stehen hier,
 * und die Auswahl, welche gerade dranhängt.
 *
 * Warum das eine eigene Datei mit eigenen Tests ist: Vibration ist die eine
 * Rückmeldung, die man **nicht sehen** kann. Ob eine Salve fünf Stöße hat oder
 * vier, ob nach dem letzten noch etwas kommt, ob ein Muster beim zweiten
 * Durchlauf verrutscht — das merkt man in der Brille höchstens als „fühlt sich
 * komisch an". Also wird es hier ausgerechnet, wo man es nachlesen und prüfen
 * kann, und der Raum spielt nur ab, was dabei herauskommt.
 *
 * Reine Zahlen, kein three.js und kein WebXR.
 */

/** Ein einzelner Stoß: wann er losgeht, wie stark und wie lang er ist. */
export interface HapticPulse {
  /** Sekunden seit dem Anfang des Musters. */
  at: number;
  /** 0 bis 1. */
  intensity: number;
  /** Millisekunden. */
  duration: number;
}

export interface HapticPattern {
  id: string;
  label: string;
  sub: string;
  /** Aufsteigend nach `at`. Leer heißt: gar nichts. */
  pulses: readonly HapticPulse[];
  /**
   * Wie lang ein Durchlauf dauert, in Sekunden. Länger als der letzte Stoß,
   * weil die Pause danach zum Muster gehört: ohne sie wird aus einem
   * Herzschlag ein Dauerbrummen, sobald man den Griff hält.
   */
  length: number;
}

/**
 * Was zur Auswahl steht.
 *
 * Die Reihenfolge ist die, in der der Knopf an der Wand durchschaltet, und sie
 * ist bewusst eine Steigerung: erst gar nichts, dann immer mehr, dann die
 * Muster. Wer wissen will, ob sein Controller überhaupt brummt, fängt oben an
 * und drückt sich nach unten durch.
 */
export const HAPTIC_PATTERNS: readonly HapticPattern[] = [
  {
    id: 'off',
    label: 'Kein Vibrieren',
    sub: 'Nur anfassen, sonst nichts',
    pulses: [],
    length: 0.5,
  },
  {
    id: 'soft',
    label: 'Leicht',
    sub: 'Ein Antippen — so viel wie ein Menüklick',
    pulses: [{ at: 0, intensity: 0.2, duration: 40 }],
    length: 0.35,
  },
  {
    id: 'medium',
    label: 'Mittel',
    sub: 'Ein deutlicher Stoß — so viel wie ein Treffer',
    pulses: [{ at: 0, intensity: 0.5, duration: 80 }],
    length: 0.4,
  },
  {
    id: 'strong',
    label: 'Stark',
    sub: 'Voll aufgedreht — so viel wie ein Rückstoß',
    pulses: [{ at: 0, intensity: 1, duration: 140 }],
    length: 0.55,
  },
  {
    id: 'double',
    label: 'Doppelklopfen',
    sub: 'Zwei kurze — „angekommen"',
    pulses: [
      { at: 0, intensity: 0.6, duration: 45 },
      { at: 0.11, intensity: 0.6, duration: 45 },
    ],
    length: 0.6,
  },
  {
    id: 'burst',
    label: 'Salve',
    sub: 'Fünf schnelle hintereinander — wie eine Feuerstoß',
    pulses: [0, 1, 2, 3, 4].map((i) => ({ at: i * 0.07, intensity: 0.8, duration: 45 })),
    length: 0.7,
  },
  {
    id: 'heartbeat',
    label: 'Herzschlag',
    sub: 'Bum-bum, Pause — läuft weiter, solange du hältst',
    pulses: [
      { at: 0, intensity: 0.9, duration: 70 },
      { at: 0.2, intensity: 0.45, duration: 55 },
    ],
    length: 1,
  },
  {
    id: 'ramp',
    label: 'Anschwellen',
    sub: 'Von kaum zu voll — zeigt, was dazwischenliegt',
    pulses: [0, 1, 2, 3, 4, 5].map((i) => ({
      at: i * 0.13,
      intensity: 0.15 + i * 0.17,
      duration: 90,
    })),
    length: 1.1,
  },
  {
    id: 'rumble',
    label: 'Dauerbrummen',
    sub: 'Stöße Schlag auf Schlag — wie ein laufender Motor',
    pulses: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
      at: i * 0.06,
      intensity: 0.35,
      duration: 60,
    })),
    length: 0.48,
  },
];

const DEFAULT_ID = 'medium';

export function patternById(id: string): HapticPattern {
  return HAPTIC_PATTERNS.find((pattern) => pattern.id === id) ?? HAPTIC_PATTERNS[0]!;
}

/** Der nächste in der Reihe — nach dem letzten wieder der erste. */
export function nextPatternId(id: string): string {
  const at = HAPTIC_PATTERNS.findIndex((pattern) => pattern.id === id);
  return HAPTIC_PATTERNS[(at + 1) % HAPTIC_PATTERNS.length]!.id;
}

/**
 * Welche Stöße zwischen zwei Zeitpunkten fällig sind — und wie oft das Muster
 * dabei von vorn anfängt.
 *
 * Das ist der ganze Abspieler. Ein Frame dauert 11 bis 20 Millisekunden, ein
 * Muster über eine Sekunde, und ein Stoß darf weder verschluckt noch doppelt
 * ausgelöst werden: der Bereich ist deshalb **halboffen** — `from` gehört dazu,
 * `to` nicht. Der Stoß bei null fällt damit auf den allerersten Frame, wo man
 * ihn erwartet, und keiner kommt zweimal. Beim Umlauf wird weitergerechnet
 * statt zurückgesetzt, damit sich ein gehaltener Griff nicht langsam
 * verschiebt. Ein Frame, der länger dauert als ein ganzer Durchlauf — beim
 * Weltwechsel passiert genau das —, gibt trotzdem höchstens einen Durchlauf
 * zurück und nicht hundert Stöße auf einmal.
 *
 * @param from Sekunden seit dem Zupacken, Stand des letzten Frames
 * @param to   dasselbe, Stand jetzt
 */
export function pulsesBetween(pattern: HapticPattern, from: number, to: number): HapticPulse[] {
  if (pattern.pulses.length === 0 || to <= from) return [];
  const length = Math.max(pattern.length, 0.05);
  const out: HapticPulse[] = [];
  // Höchstens ein Durchlauf pro Frame: ein Ruckler soll die Hand nicht
  // erschlagen, und mehr als einmal dasselbe zu fühlen geht ohnehin nicht.
  const start = Math.max(from, to - length);
  const firstLap = Math.floor(start / length);
  const lastLap = Math.floor(to / length);
  for (let lap = firstLap; lap <= lastLap; lap++) {
    for (const pulse of pattern.pulses) {
      const at = lap * length + pulse.at;
      if (at >= start && at < to) out.push({ ...pulse, at });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

// --- der Speicher ----------------------------------------------------------

const KEY = 'bgvr.haptics';

type Listener = () => void;

const listeners = new Set<Listener>();

export function onHapticChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Was gerade ausgewählt ist. */
export function hapticPattern(): HapticPattern {
  try {
    return patternById(globalThis.localStorage?.getItem(KEY) ?? DEFAULT_ID);
  } catch {
    return patternById(DEFAULT_ID);
  }
}

export function saveHapticPattern(id: string): HapticPattern {
  const pattern = patternById(id);
  try {
    globalThis.localStorage?.setItem(KEY, pattern.id);
  } catch {
    /* privater Modus — dann gilt die Wahl für diese Sitzung */
  }
  for (const listener of listeners) listener();
  return pattern;
}
