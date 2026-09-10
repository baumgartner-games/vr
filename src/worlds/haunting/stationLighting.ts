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
