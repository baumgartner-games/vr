import type { MarkId } from './house';

/** Metres, including every handle, pipe and closed door. Front is local +Z. */
export interface FixtureSize {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}

/** Pure placement contract: rendering and the generator use the same footprint. */
export const FIXTURE_CATALOG: Readonly<Record<MarkId, FixtureSize>> = {
  wanne: { width: 2.1, height: 1.25, depth: 1.15 },
  dusche: { width: 1.4, height: 2.4, depth: 1.25 },
  ofen: { width: 1.15, height: 1.65, depth: 0.8 },
  spuele: { width: 1.5, height: 1.65, depth: 0.85 },
  bett: { width: 2.1, height: 1.3, depth: 1.15 },
  buecher: { width: 1.35, height: 2.15, depth: 0.8 },
  werkbank: { width: 1.9, height: 1.7, depth: 1.2 },
  klavier: { width: 1.65, height: 1.55, depth: 1.05 },
  kamin: { width: 1.5, height: 2.3, depth: 1.35 },
  standuhr: { width: 1.25, height: 2.15, depth: 0.95 },
  sessel: { width: 1.05, height: 1.65, depth: 1.1 },
  kiste: { width: 1.5, height: 1.15, depth: 1.0 },
  schaukelpferd: { width: 1.3, height: 1.8, depth: 0.85 },
  esstisch: { width: 1.85, height: 1.6, depth: 1.05 },
  ausgabe: { width: 2.3, height: 1.85, depth: 0.95 },
};

export const CARGO_SIZE: FixtureSize = { width: 0.9, height: 1.4, depth: 0.65 };
export const LOCKER_SIZE: FixtureSize = { width: 1.15, height: 2.2, depth: 0.8 };
export const CONSOLE_SIZE: FixtureSize = { width: 1.2, height: 1.65, depth: 0.55 };
