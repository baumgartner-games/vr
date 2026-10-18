import { hexKey, type HexBoard, type TileSpec } from './hexRules';

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
  if (strategy === 'smart') {
    const a = board.assess(spec, q, r, rot);
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
  return optimizedScore(board, spec, q, r, rot, fit);
}

/**
 * **Intelligent (optimiert)** — gefunden in Runden gegen den Benchmark
 * (`docs/agents/hexland.md`, _Optimierung von Intelligent_): die Rechnung von
 * `smart`, dazu was die Lage sofort an Flaggen, Fluss und Weg bringt; Fluss-
 * und Weg-Aufträge wachsen doppelt so viel wert, und „vorbereitet" zählt nur,
 * wo eine Landkachel andocken kann.
 */
function optimizedScore(
  board: HexBoard,
  spec: TileSpec,
  q: number,
  r: number,
  rot: number,
  fit: NonNullable<ReturnType<HexBoard['fit']>>,
): number {
  // Ein bereites Gebiet, an dessen freien Feldern schon Fluss oder Weg
  // anliegt, nimmt die Auftragskachel selten auf (Runde 2, Idee aus dem
  // Selbst-Spielen; +3,4 gegen 1a).
  const a = board.assess(spec, q, r, rot, true);
  const side = sideGain(board, spec, q, r, rot);
  return (
    a.completes * 50 +
    a.points * 4 +
    // Fluss- und Wegkacheln sind selten (etwa jede fünfte und achte): Ein
    // Fluss- oder Weg-Auftrag, der wächst, ist schwerer zu ersetzen als ein
    // Wald. Doppelt gezählt brachte das +2,1 (Runde 2).
    (a.closer + a.rareCloser) * 20 +
    (a.progress + a.rareProgress) * 5 +
    a.ready * 8 -
    a.breaks * 100 +
    fit.matched +
    // Ein Punkt Flagge, Fluss oder Weg wiegt 8 — so viel wie ein Auftrag,
    // der eine Kachel näher kommt, nicht mehr: Mit 15 kosteten die Aufträge
    // mehr, als Flaggen und Fluss brachten (Runde 1b).
    side * 8
  );
}

/**
 * Wertung ohne Aufträge vor dem Zug — je Zug nur einmal gerechnet. Gemerkt
 * an der Kachel in der Hand: Die ist mit jedem Zug ein neues Objekt.
 */
const sideBefore = new WeakMap<HexBoard, { hand: TileSpec | null; value: number }>();

function sideOf(board: HexBoard): number {
  const s = board.scoring();
  return s.flags + s.river + s.road;
}

/**
 * **Was die Lage sofort an Flaggen, Fluss und Weg bringt** — der Unterschied
 * der Wertung ohne Aufträge (`HexBoard.scoring`), als läge die Kachel schon:
 * eine Flagge, deren Gebiet sie schließt, der längste Fluss oder Weg, den sie
 * verlängert. _Intelligent_ sah davon nichts und brachte im Schnitt nur 1,5
 * Punkte Flaggen heim.
 */
function sideGain(board: HexBoard, spec: TileSpec, q: number, r: number, rot: number): number {
  let before = sideBefore.get(board);
  if (!before || before.hand !== board.current) {
    before = { hand: board.current, value: sideOf(board) };
    sideBefore.set(board, before);
  }
  const key = hexKey(q, r);
  board.tiles.set(key, { q, r, spec, rot });
  const after = sideOf(board);
  board.tiles.delete(key);
  return after - before.value;
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
