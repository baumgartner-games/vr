import { hexKey, type Hex, type HexBoard, type TileSpec } from './hexRules';

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
 * wo eine Landkachel andocken kann. Liegen die zwei besten Lagen nah
 * beieinander, schaut `bestPlacement` eine Kachel voraus (`lookAhead`).
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
  // anliegt, nimmt die Auftragskachel selten auf (Idee aus dem
  // Selbst-Spielen; +3,4 gegen 1a, Runde 2f).
  const a = board.assess(spec, q, r, rot, true);
  const side = sideGain(board, spec, q, r, rot);
  return (
    a.completes * 50 +
    a.points * 4 +
    // Fluss- und Wegkacheln sind selten (etwa jede fünfte und achte): Ein
    // Fluss- oder Weg-Auftrag, der wächst, ist schwerer zu ersetzen als ein
    // Wald. Doppelt gezählt brachte das +2,1 (Runde 2d).
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

/**
 * **Die beste Lage** über alle freien Felder und Drehungen — `null`, wenn nichts passt.
 * `nudge` verschiebt die Wertung je Feld ein wenig (im Spiel: bei Gleichstand
 * näher an der zuletzt gelegten Kachel).
 */
export function bestPlacement(
  board: HexBoard,
  strategy: Strategy,
  nudge?: (slot: Hex) => number,
): Placement | null {
  const spec = board.current;
  if (!spec) return null;
  let best: Placement | null = null;
  let second: Placement | null = null;
  for (const slot of board.openSlots()) {
    for (let rot = 0; rot < 6; rot++) {
      const value = scorePlacement(board, spec, slot.q, slot.r, rot, strategy);
      if (value === null) continue;
      const score = nudge ? value + nudge(slot) : value;
      const here = { q: slot.q, r: slot.r, rot, score };
      if (!best || score > best.score) {
        second = best;
        best = here;
      } else if (!second || score > second.score) second = here;
    }
  }
  if (strategy === 'optimized' && best && second && second.score >= best.score - LOOK_MARGIN) {
    return lookAhead(board, spec, best) >= lookAhead(board, spec, second) ? best : second;
  }
  return best;
}

/**
 * **Vorausschau** (Runde 2): Liegen die beiden besten Lagen keine 5 auseinander,
 * entscheidet die nächste Kachel mit — die oberste im Stapel, probehalber
 * gelegt, mit ihrer besten Lage zur Hälfte gezählt. Käme als nächstes eine
 * Auftragskachel (weil die Lage einen Auftrag erfüllt), zählt das pauschal 15:
 * Ein frei gewordener Platz ist etwa so viel wert wie eine gute Lage. Brachte
 * +3,2 gegen den Stand ohne (Runde 2o); kostet je Zug etwa das Vierfache von
 * _Intelligent_ (die nächste Kachel wird zweimal ganz durchgerechnet) — darum
 * nur zwei Lagen, jede weitere kostet noch einmal so viel.
 */
const LOOK_MARGIN = 5;

function lookAhead(board: HexBoard, spec: TileSpec, at: Placement): number {
  if (board.stack.length === 0) return at.score;
  // Die gemerkte Wertung vor dem Zug gehört zum echten Brett, nicht zum probehalber belegten.
  sideBefore.delete(board);
  const value = board.tryPlace(spec, at.q, at.r, at.rot, (next) => {
    if (!next) return at.score + 15;
    let top = -Infinity;
    for (const slot of board.openSlots()) {
      for (let rot = 0; rot < 6; rot++) {
        const score = scorePlacement(board, next, slot.q, slot.r, rot, 'optimized');
        if (score !== null && score > top) top = score;
      }
    }
    return top === -Infinity ? at.score : at.score + 0.5 * top;
  });
  sideBefore.delete(board);
  return value;
}
