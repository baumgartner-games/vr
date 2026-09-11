/**
 * **Türen, die von selbst aufgehen** — der Stationsfehler.
 *
 * Die Schotts der Station fahren auf, wenn jemand davorsteht, und sonst nie
 * (`automaticDoors.ts`, `map/flatRound.stepDoors`). Das ist sauber und genau
 * deshalb still: Ein Blatt, das sich bewegt, bedeutete bisher immer *jemand
 * ist da* — und wer das einmal begriffen hat, liest die halbe Station aus dem
 * Augenwinkel ab. Der Techniker weiß, wo das Monster steht, ohne es gesehen
 * zu haben; das Monster weiß es vom Techniker.
 *
 * **Also lügt die Station gelegentlich.** Alle `GLITCH_RANGE` Sekunden fährt
 * irgendein Blatt für `GLITCH_HOLD` Sekunden auf, ohne dass jemand davorsteht,
 * und fährt danach wieder zu. Das ist kein zweiter Spuk (`haunt.ts`) — es
 * macht nichts kaputt, es nimmt niemandem etwas weg. Es macht nur das
 * Zeichen unzuverlässig, auf das sich beide verlassen hatten.
 *
 * **Zwei Dinge darf es nie**, und beide stehen nicht hier, sondern beim
 * Aufrufer, weil nur der sie weiß:
 *
 * - **Keine gesperrte Tür aufmachen.** Der Riegel ist die eine Entscheidung
 *   der Tafel (`rules/doorLocks.ts`); ein Stationsfehler, der ihn aufhebt,
 *   nähme ihr das Einzige, was sie hat. Deshalb bekommt `stepGlitch` nur die
 *   Türen herein, die **nicht** gesperrt sind — und lässt eine laufende
 *   Störung fallen, sobald ihre Tür nicht mehr dabei ist.
 * - **Niemandem das Blatt auf den Kopf.** Das Zufahren danach geht durch
 *   dieselbe Mechanik wie jedes andere Zufahren, und die hält den Durchgang
 *   auf, solange jemand darin steht (`AutomaticDoors`, `occupants`). Diese
 *   Rechnung hier öffnet nur; sie schließt nichts.
 *
 * Reine Rechnung ohne three.js und ohne DOM: Herein gehen eine Uhr, eine
 * Liste von Türen und ein Würfel, heraus geht höchstens eine Türkennung.
 */

/**
 * Wie viele Sekunden zwischen zwei Fehlöffnungen liegen: mindestens,
 * höchstens.
 *
 * Selten genug, dass man nicht mitzählt, und häufig genug, dass es in einer
 * Runde von zehn Minuten ein gutes Dutzend Mal vorkommt — sonst hielte man
 * das einmalige Ereignis für den einen Beweis, auf den man gewartet hat, und
 * das wäre schlimmer als gar keines.
 */
export const GLITCH_RANGE: readonly [number, number] = [35, 70];

/**
 * Wie lange das Blatt dabei offen steht, in Sekunden: mindestens, höchstens.
 *
 * So lange wie ein Durchgang dauert. Kürzer sähe aus wie ein Zucken, länger
 * wie eine Tür, die jemand aufgehalten hat — und genau das soll es ja gerade
 * **nicht** heißen.
 */
export const GLITCH_HOLD: readonly [number, number] = [1.8, 3.2];

/** Welche Tür gerade grundlos offen steht, und wann die nächste dran ist. */
export interface DoorGlitch {
  /** Die Tür, die gerade von selbst offen steht — `''`, wenn keine. */
  id: string;
  /** Wann sie wieder zufährt (Rundenzeit). */
  until: number;
  /** Wann die nächste Tür aufgeht (Rundenzeit). */
  next: number;
}

export interface GlitchStep {
  /** Die Tür, die in diesem Bild offen gehalten wird — `''`, wenn keine. */
  id: string;
  /** Die Tür, die in **diesem** Bild aufgefahren ist — für Geräusch und Meldung. */
  opened: string;
}

/**
 * Eine Runde ohne Störung. Die erste kommt frühestens nach `GLITCH_RANGE`
 * Sekunden: Eine Tür, die in der ersten Sekunde der Runde aufgeht, ist keine
 * Verunsicherung, sondern eine Ansage.
 */
export function freshGlitch(roll: () => number = Math.random): DoorGlitch {
  return { id: '', until: 0, next: span(GLITCH_RANGE, roll) };
}

/**
 * **Ein Schritt der Uhr.** Läuft eine Störung, sagt sie, welche Tür offen
 * bleibt; ist ihre Zeit um (oder ihre Tür inzwischen gesperrt), endet sie.
 * Ist keine da und die Frist abgelaufen, wird eine neue Tür gewürfelt.
 *
 * @param open Die Türen, die gerade **nicht** gesperrt sind — nur aus denen
 *   wird gewählt.
 */
export function stepGlitch(
  glitch: DoorGlitch,
  open: readonly string[],
  time: number,
  roll: () => number = Math.random,
): GlitchStep {
  if (glitch.id && (time >= glitch.until || !open.includes(glitch.id))) glitch.id = '';
  if (glitch.id || time < glitch.next) return { id: glitch.id, opened: '' };
  // Die Frist läuft auch dann weiter, wenn gerade keine Tür in Frage kommt:
  // Sonst stünde der Zähler bei einer Runde mit lauter gesperrten Türen still
  // und feuerte in der Sekunde, in der die erste wieder frei wird.
  glitch.next = time + span(GLITCH_RANGE, roll);
  if (!open.length) return { id: '', opened: '' };
  const id = open[Math.min(open.length - 1, Math.floor(roll() * open.length))]!;
  glitch.id = id;
  glitch.until = time + span(GLITCH_HOLD, roll);
  return { id, opened: id };
}

function span(range: readonly [number, number], roll: () => number): number {
  return range[0] + roll() * (range[1] - range[0]);
}
