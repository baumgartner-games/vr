import type { CrewState } from './mission';

/**
 * **Wie hell es im Schiff ist** — und vor allem: wie dunkel.
 *
 * Die Station ist im Ernstfall dunkel. Das ist keine Stimmung, sondern die
 * Spielregel, an der alles andere hängt: Die Taschenlampe des VR-Spielers ist
 * nur etwas wert, wenn es ohne sie nichts zu sehen gibt, und die zwei Lampen,
 * die der Hacker anmachen darf (`rules/lamps.ts`), sind nur dann eine
 * Entscheidung. Ein Grundlicht, bei dem man auch ohne Lampe zurechtkommt,
 * nimmt beiden den Sinn — deshalb steht hier eine kleine Zahl und keine
 * bequeme.
 *
 * Ein Raum, in dem Licht brennt, bekommt trotzdem ein wenig Streulicht
 * (`ROOM_BOUNCE`): Eine Punktleuchte allein lässt die Ecken schwarz, und eine
 * beleuchtete Kammer, in der man die Wand nicht findet, sieht nach Fehler aus
 * und nicht nach Licht. Der helle Test und die Bot-Runde behalten ihre alte
 * Helligkeit — dort schaut jemand zu und will etwas sehen.
 */

/** Das Streulicht in einem Raum, in dem eine Lampe brennt — mehr nicht. */
export const ROOM_BOUNCE = 0.12;
/** Die Helligkeit der sicheren Bot-Runde: Dort wird zugesehen, nicht gesucht. */
export const SIMULATION_LIGHT = 0.55;
/** Und die des ausdrücklich hellen Tests. */
export const BRIGHT_LIGHT = 0.78;

export function stationLighting(
  crew: Pick<CrewState, 'options' | 'simulation'>,
  inTraining: boolean,
  poweredDeck = false,
): { dark: boolean; ambient: number; lamps: boolean; command: number } {
  const bright = crew.options.test && crew.options.bright;
  const dark = crew.options.test && !bright && !crew.simulation;
  return {
    dark,
    ambient:
      inTraining || dark
        ? 0
        : bright
          ? BRIGHT_LIGHT
          : crew.simulation
            ? SIMULATION_LIGHT
            : poweredDeck
              ? ROOM_BOUNCE
              : 0,
    lamps: !dark && !inTraining,
    command: dark || inTraining ? 0 : 22,
  };
}

/**
 * **Welche Deckenleuchte ihre Schattenkarte in diesem Bild neu zeichnet** —
 * höchstens eine, und nur eine, die brennt.
 *
 * Eine Punktleuchte zeichnet ihre Karte sechsmal, einmal je Würfelseite
 * (`shared/wallLight.ts`), und jede Seite ist ein Durchgang über alles, was im
 * Umkreis Schatten wirft. Bis hierher bestellten beide Leuchten des Pools
 * (`HauntingWorld.lampPool`) ihre Karte **im selben Bild**, viermal die
 * Sekunde, und auch dann, wenn sie gar nicht brannten: Gemessen kamen in
 * diesem einen Bild 300 bis 420 Zeichenaufrufe und gut 100 000 Dreiecke zu
 * den sonst knapp 200 dazu — ein Ruckler im Takt von 4 Hz, in der Brille am
 * deutlichsten. Jetzt wechseln sie sich ab (jede kommt weiter alle `every`
 * Sekunden dran), und eine dunkle Leuchte zeichnet gar nichts.
 *
 * Zieht eine Leuchte um oder geht sie gerade an, zeichnet sie sofort — ihre
 * alte Karte gehört an eine andere Stelle oder ist veraltet.
 */
export class LampShadowTurns {
  private clock = 0;
  private turn = -1;

  constructor(
    private readonly count: number,
    private readonly every: number,
  ) {}

  /** Die Leuchte, die in diesem Bild an der Reihe ist, oder `-1`. */
  step(dt: number): number {
    if (this.count <= 0) return -1;
    this.clock += dt;
    if (this.clock < this.every / this.count) return -1;
    this.clock = 0;
    this.turn = (this.turn + 1) % this.count;
    return this.turn;
  }
}

/**
 * Ob eine Leuchte ihre Karte jetzt neu zeichnen soll.
 *
 * @param turn    sie ist an der Reihe (`LampShadowTurns.step`)
 * @param moved   sie hängt seit dem letzten Bild woanders
 * @param before  ihre Stärke im letzten Bild
 * @param now     ihre Stärke jetzt
 */
export function lampShadowDue(turn: boolean, moved: boolean, before: number, now: number): boolean {
  if (now <= 0) return false;
  return turn || moved || before <= 0;
}
