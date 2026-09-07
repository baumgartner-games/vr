/**
 * **Wie eine Tür aufgeht** — und wann sie wieder zufällt.
 *
 * Eine Tür in VR ist kein Zustand, sondern eine Bewegung: Man sieht ihr an, ob
 * sie gerade aufgeht, und man geht hindurch, während sie es noch tut. Also
 * steht hier eine Zahl zwischen 0 und 1 und nicht ein `offen: boolean` — und
 * damit alles, was daran hängt, ohne Brille prüfbar bleibt, steht sie hier und
 * nicht in der Welt, die die Bretter dazu baut.
 *
 * Zwei Betriebsarten, und beide gibt es an echten Türen:
 *
 * - **Rasten** (`hold: 0`): Der Knopf schaltet um. Auf, und sie bleibt auf,
 *   bis jemand wieder drückt. Das ist der Hebel und der Kippschalter.
 * - **Nachlauf** (`hold > 0`): Der Knopf öffnet, und nach so vielen Sekunden
 *   fällt sie von selbst zu. Jeder weitere Druck — und jedes Bild, in dem
 *   jemand auf der Druckplatte steht — setzt die Uhr neu. Ohne dieses
 *   Nachsetzen schlösse sich die Tür unter dem, der in ihr steht.
 */

export interface DoorState {
  /** 0 ist zu, 1 ist ganz offen. Alles dazwischen ist Bewegung. */
  open: number;
  /** Wohin sie gerade will. */
  wanted: boolean;
  /** Sekunden bis zum Zufallen; 0 heißt: sie bleibt, wo sie ist. */
  hold: number;
}

export interface DoorParams {
  /** Sekunden von ganz zu bis ganz offen. */
  time: number;
  /** Nachlauf in Sekunden; 0 macht aus dem Auslöser einen Umschalter. */
  hold: number;
}

export function newDoor(): DoorState {
  return { open: 0, wanted: false, hold: 0 };
}

/**
 * Der Knopf ist gedrückt worden (oder jemand steht auf der Platte).
 *
 * Mit Nachlauf heißt das immer „auf" und nie „zu": Eine Tür, die beim zweiten
 * Druck zufällt, während man in ihr steht, ist eine Falle und kein Schalter.
 */
export function triggerDoor(state: DoorState, params: DoorParams): DoorState {
  if (params.hold > 0) return { ...state, wanted: true, hold: params.hold };
  return { ...state, wanted: !state.wanted, hold: 0 };
}

/** Und der Weg zurück, für alles, was von Hand geschlossen wird. */
export function closeDoor(state: DoorState): DoorState {
  return { ...state, wanted: false, hold: 0 };
}

/** Ein Bild Türbewegung. */
export function stepDoor(state: DoorState, dt: number, params: DoorParams): DoorState {
  const step = Math.max(0, Number.isFinite(dt) ? dt : 0);
  let { wanted, hold } = state;
  if (hold > 0) {
    hold = Math.max(0, hold - step);
    if (hold === 0) wanted = false;
  }
  const speed = step / Math.max(0.05, params.time);
  const open = wanted ? Math.min(1, state.open + speed) : Math.max(0, state.open - speed);
  return { open, wanted, hold };
}

/**
 * Die weiche Kurve, mit der die Bewegung anfängt und aufhört.
 *
 * Ohne sie ruckt eine Tür los und steht schlagartig — und in der Brille sieht
 * das nicht nach schwerem Metall aus, sondern nach einem Fehler.
 */
export function ease(t: number): number {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  return x * x * (3 - 2 * x);
}

/** Wie weit ein Schiebeflügel zur Seite gefahren ist, in Metern. */
export function slideOffset(open: number, width: number): number {
  return ease(open) * width;
}

/** Und um wie viel ein Drehflügel aufgeschwungen ist, im Bogenmaß. */
export function swingAngle(open: number, max: number): number {
  return ease(open) * max;
}

/** Ob man hindurchpasst — die Schwelle, ab der die Welt „offen" meldet. */
export function passable(state: DoorState): boolean {
  return state.open > 0.85;
}
