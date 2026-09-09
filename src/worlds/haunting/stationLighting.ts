import type { CrewState } from './mission';

/** Powered decks have a little reflected light; blackouts and labs retain local lighting. */
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
      inTraining || dark ? 0 : bright ? 0.78 : crew.simulation ? 0.55 : poweredDeck ? 0.28 : 0,
    lamps: !dark && !inTraining,
    command: dark || inTraining ? 0 : 22,
  };
}
