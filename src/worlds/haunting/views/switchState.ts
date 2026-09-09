import type { HouseSpec } from '../house';
import type { HauntState } from '../net';

/**
 * **Einen Schalter der Tafel auf einen Stand anwenden** — dieselbe Regel wie
 * beim Gastgeber der 3D-Runde (`HauntingWorld.applyFlip`), nur ohne Welt.
 *
 * Gebraucht im 2D-Testmodus: Dort gibt es keinen Gastgeber und kein Netz,
 * und die Schalttafel schaltet direkt im Stand der laufenden `FlatRound`.
 * Türen: `on` heißt offen, und die Liste führt die geschlossenen. Lichter
 * und Radios: `on` heißt drin.
 *
 * @returns ob es den Schalter gab.
 */
export function applySwitch(state: HauntState, spec: HouseSpec, id: string, on: boolean): boolean {
  const entry = spec.switches.find((one) => one.id === id);
  if (!entry) return false;
  const list = entry.kind === 'light' ? state.lit : entry.kind === 'radio' ? state.loud : null;
  if (list) {
    const at = list.indexOf(entry.target);
    if (on && at < 0) list.push(entry.target);
    if (!on && at >= 0) list.splice(at, 1);
    return true;
  }
  const shut = state.shut.indexOf(entry.target);
  if (!on && shut < 0) state.shut.push(entry.target);
  if (on && shut >= 0) state.shut.splice(shut, 1);
  return true;
}

/** Der Schalter, der auf eine Tür wirkt — oder `null`, wenn die Tafel keinen hat. */
export function doorSwitch(spec: HouseSpec, doorId: string) {
  return spec.switches.find((one) => one.kind === 'door' && one.target === doorId) ?? null;
}

/** Der Schalter für die Deckenlampe eines Zimmers. */
export function lightSwitch(spec: HouseSpec, roomId: string) {
  return spec.switches.find((one) => one.kind === 'light' && one.target === roomId) ?? null;
}

/** Der Schalter für das Radio in einem Zimmer — die wenigsten Zimmer haben eins. */
export function radioSwitch(spec: HouseSpec, roomId: string) {
  return spec.switches.find((one) => one.kind === 'radio' && one.target === roomId) ?? null;
}
