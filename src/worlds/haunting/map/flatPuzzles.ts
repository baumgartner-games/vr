import { puzzleSolved, type PuzzleState, type Repair } from '../mission';

/**
 * **Die drei Rätsel, als reine Regeln** — dieselben wie an der Konsole im
 * Schiff (`ShipExperience`), nur ohne Bildschirmkoordinaten.
 *
 * - `wires`: vier Stecker links, vier Buchsen rechts; Stecker `i` gehört in
 *   Buchse `order.indexOf(i)`.
 * - `sequence`: drei Ziffern 1–4 in der richtigen Reihenfolge; eine falsche
 *   Dreiergruppe fängt von vorn an.
 * - `tune`: drei Frequenzregler 1–4; „Senden" prüft.
 */
export type PuzzleAction =
  | { kind: 'wire'; plug: number; socket: number }
  | { kind: 'digit'; digit: number }
  | { kind: 'turn'; column: number }
  | { kind: 'send' };

export interface PuzzleOutcome {
  solved: boolean;
  /** Ob dieser Zug ausdrücklich danebenging (Fehlerton). */
  wrong: boolean;
}

export function applyPuzzle(
  repair: Repair,
  puzzle: PuzzleState,
  action: PuzzleAction,
): PuzzleOutcome {
  if (!puzzle.open) return { solved: false, wrong: true };
  let wrong = false;
  if (repair.puzzle === 'wires' && action.kind === 'wire') {
    if (action.plug >= 0 && action.plug < 4 && action.socket >= 0 && action.socket < 4)
      puzzle.links[action.plug] = action.socket;
  } else if (repair.puzzle === 'sequence' && action.kind === 'digit') {
    puzzle.links.push(Math.max(1, Math.min(4, Math.round(action.digit))));
    if (puzzle.links.length === 3 && puzzle.links.join('') !== repair.code) {
      puzzle.links = [];
      wrong = true;
    }
  } else if (repair.puzzle === 'tune') {
    if (action.kind === 'turn' && action.column >= 0 && action.column < 3)
      puzzle.digits[action.column] = ((puzzle.digits[action.column] ?? 1) % 4) + 1;
    if (action.kind === 'send' && !puzzleSolved(repair, puzzle)) wrong = true;
    if (action.kind !== 'send') return { solved: false, wrong: false };
  }
  return { solved: puzzleSolved(repair, puzzle), wrong };
}
