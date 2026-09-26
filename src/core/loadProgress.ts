/**
 * **Wie weit ein Weltwechsel ist** — die Rechnung hinter dem Ladebildschirm
 * (`ui/WorldLoader.ts`).
 *
 * Ein Wechsel hat drei Abschnitte, und nur der letzte lässt sich zählen:
 *
 * 1. `modul` — der Chunk der Welt kommt über die Leitung (`definition.load`).
 *    Wie groß er ist, weiß niemand vorher.
 * 2. `aufbau` — `World.init` baut: Physik, Grundriss, Licht.
 * 3. `modelle` — die Modelle und Töne, die die Welt danach nachholt. Die
 *    meldet der Lade-Manager von three.js mit `geladen / angemeldet`.
 *
 * Die Anzeige soll **nie rückwärts laufen** und **nie stehen**, solange etwas
 * passiert. Also bekommt jeder Abschnitt ein Band, und innerhalb der beiden
 * unzählbaren kriecht der Balken auf das Ende seines Bands zu, ohne es zu
 * erreichen (`creep`) — der ehrlichste Balken, den man ohne Zahl haben kann.
 *
 * Reine Rechnung, kein DOM, mit Test.
 */

export type LoadPhase = 'modul' | 'aufbau' | 'modelle' | 'fertig';

export interface LoadState {
  readonly phase: LoadPhase;
  /** Nur `modelle`: wie viele Dateien schon da sind … */
  readonly loaded: number;
  /** … von wie vielen angemeldeten. */
  readonly total: number;
}

/** Die Bänder: wo ein Abschnitt anfängt und wo er aufhört (0…1). */
export const LOAD_BANDS: Readonly<Record<LoadPhase, readonly [number, number]>> = {
  modul: [0.04, 0.45],
  aufbau: [0.45, 0.6],
  modelle: [0.6, 0.98],
  fertig: [1, 1],
};

/**
 * **Wohin der Balken will** — für `modelle` der gezählte Anteil im Band, für
 * die anderen das Ende ihres Bands (das `creep` nie ganz erreicht).
 */
export function loadTarget(state: LoadState): number {
  const [from, to] = LOAD_BANDS[state.phase];
  if (state.phase !== 'modelle') return to;
  if (state.total <= 0) return from;
  const share = Math.min(1, Math.max(0, state.loaded / state.total));
  return from + (to - from) * share;
}

/**
 * **Ein Schritt der Anzeige**: vom gezeigten Wert auf das Ziel zu, in `dt`
 * Sekunden — nie zurück, und in den unzählbaren Abschnitten nie ganz bis ans
 * Ende. `rate` ist der Anteil des Rests, der je Sekunde abgebaut wird.
 */
export function creep(shown: number, state: LoadState, dt: number, rate = 1.6): number {
  if (state.phase === 'fertig') return 1;
  const [from] = LOAD_BANDS[state.phase];
  const target = loadTarget(state);
  const start = Math.max(shown, from);
  if (start >= target) return start;
  // Exponentiell auf das Ziel zu: schnell am Anfang, dann immer langsamer —
  // ein Balken, der „fast fertig" sagt, solange er es nicht weiß.
  const step = (target - start) * (1 - Math.exp(-rate * Math.max(0, dt)));
  return Math.min(target, start + step);
}

/** Die Zeile unter dem Balken. */
export function loadLine(state: LoadState): string {
  switch (state.phase) {
    case 'modul':
      return 'Welt wird geladen …';
    case 'aufbau':
      return 'Welt wird aufgebaut …';
    case 'modelle':
      return state.total > 0
        ? `Modelle und Töne · ${Math.min(state.loaded, state.total)} von ${state.total}`
        : 'Modelle und Töne …';
    case 'fertig':
      return 'Fertig';
  }
}

/**
 * **Wie lange der Ladebildschirm mindestens steht**, in Millisekunden.
 *
 * Eine Welt aus dem Speicher ist in 150 ms da, und ein Bildschirm, der für
 * einen Wimpernschlag aufblitzt, ist unruhiger als gar keiner. So lange bleibt
 * er also mindestens — lang genug, um den Namen zu lesen, kurz genug, um nicht
 * zu warten.
 */
export const LOADER_MIN_MS = 700;

/** Wie lange höchstens auf die Modelle gewartet wird, bevor er trotzdem geht. */
export const LOADER_CAP_MS = 8000;
