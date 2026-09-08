import type { CrewState } from './mission';

/** Test light is independent of monster safety; laboratories supply only local light. */
export function stationLighting(
  crew: Pick<CrewState, 'options' | 'simulation'>,
  inTraining: boolean,
): { dark: boolean; ambient: number; lamps: boolean; command: number } {
  const bright = crew.options.test && crew.options.bright;
  const dark = crew.options.test && !bright && !crew.simulation;
  return {
    dark,
    ambient: inTraining ? 0 : bright ? 0.78 : crew.simulation ? 0.55 : 0,
    lamps: !dark && !inTraining,
    command: dark || inTraining ? 0 : 22,
  };
}
