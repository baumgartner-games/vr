import type { HexBoard, TileSpec } from './hexRules';

/**
 * **Wohin mit der Kachel in der Hand** — die Rechnung hinter den Spielhilfen
 * _Intelligent_ und _Intelligent (optimiert)_, ohne three.js, damit derselbe
 * Code im Spiel (`HexlandWorld.autoPlace`) und im Benchmark läuft
 * (`scripts/hexland/bench.ts`, `npm run hexbench`).
 *
 * Gewünscht: _„Lass den intelligenten Modus ein paar hundert Runden spielen …
 * Am Ende soll dann ein neuer Vorschlag-Modus ‚intelligent optimiert' kommen,
 * damit man mit jetzt vergleichen kann."_ `smart` ist der Stand davor und
 * bleibt, wie er ist; `optimized` ist der, an dem gedreht wird.
 */
export type Strategy = 'smart' | 'optimized';

export interface Placement {
  q: number;
  r: number;
  rot: number;
  score: number;
}

/**
 * **Wie gut diese Lage ist** — `null`, wo die Kachel so nicht liegen darf.
 * Höher ist besser; die Abstände zwischen Lagen zählen, nicht die Höhe.
 */
export function scorePlacement(
  board: HexBoard,
  spec: TileSpec,
  q: number,
  r: number,
  rot: number,
  strategy: Strategy,
): number | null {
  const fit = board.fit(spec, q, r, rot);
  if (!fit) return null;
  const a = board.assess(spec, q, r, rot);
  if (strategy === 'smart') {
    return (
      a.completes * 50 +
      a.points * 4 +
      a.closer * 20 +
      a.progress * 5 +
      a.ready * 8 -
      a.breaks * 100 +
      fit.matched
    );
  }
  return optimizedScore(board, spec, q, r, rot, a, fit);
}

/**
 * **Intelligent (optimiert)** — gefunden in Runden gegen den Benchmark
 * (`docs/agents/hexland.md`, _Optimierung von Intelligent_).
 */
function optimizedScore(
  _board: HexBoard,
  _spec: TileSpec,
  _q: number,
  _r: number,
  _rot: number,
  a: ReturnType<HexBoard['assess']>,
  fit: NonNullable<ReturnType<HexBoard['fit']>>,
): number {
  return (
    a.completes * 50 +
    a.points * 4 +
    a.closer * 20 +
    a.progress * 5 +
    a.ready * 8 -
    a.breaks * 100 +
    fit.matched
  );
}

/** **Die beste Lage** über alle freien Felder und Drehungen — `null`, wenn nichts passt. */
export function bestPlacement(board: HexBoard, strategy: Strategy): Placement | null {
  const spec = board.current;
  if (!spec) return null;
  let best: Placement | null = null;
  for (const slot of board.openSlots()) {
    for (let rot = 0; rot < 6; rot++) {
      const score = scorePlacement(board, spec, slot.q, slot.r, rot, strategy);
      if (score === null) continue;
      if (!best || score > best.score) best = { q: slot.q, r: slot.r, rot, score };
    }
  }
  return best;
}
