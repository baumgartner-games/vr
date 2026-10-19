import {
  BASE_TILES,
  edgeAt,
  hexKey,
  landWeights,
  neighbour,
  opposite,
  type AssessBase,
  type Hex,
  type HexBoard,
  type Terrain,
  type TileSpec,
} from './hexRules';

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
 * wo eine Landkachel andocken kann. Ein Auftrag, der festliegt, kostet
 * (`stuckGain`), und eine Auftragskachel, deren Auftrag nichts verspricht,
 * wird geopfert (Runde 6). Liegen die zwei besten Lagen nah
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
  const before = beforeMove(board);
  const a = board.assess(spec, q, r, rot, true, before.base);
  const side = sideGain(board, before, spec, q, r, rot);
  // **Erfüllen und Opfern mit einer Kachel**: Bringt die Auftragskachel ein
  // Gebiet genau auf die Zahl eines offenen Auftrags und überschreitet dabei
  // ihre eigene, ist ihr eigener Auftrag kein Verlust — er war nie zu haben,
  // und der Platz wird frei (beim Selbst-Spielen 4× je +5…+7; +2,4, Runde 3c).
  //
  // **Die eigene Auftragskachel opfern** (Runde 6c/6f, zusammen +14,2): Von
  // Hand wurden je Partie 3–7 Aufträge absichtlich verpasst, _Intelligent
  // (optimiert)_ verpasste 0,3 — es legte jede Auftragskachel dorthin, wo ihr
  // Auftrag noch ging, auch wenn er dort lange einen der drei Plätze
  // sperrte. Kommen noch Aufträge nach, kostet das Überfüllen des eigenen
  // Auftrags nichts mehr, es bringt sogar etwas: Der Platz bleibt frei, und die
  // nächste Auftragskachel kommt sofort. Behalten wird die Kachel nur, wo ihr
  // Auftrag mehr verspricht (`stuckGain` prüft ihn mit).
  const sacrificed = a.ownBreaks && a.completes === 0 && board.tasks.length > 0;
  const breaks = a.breaks - (a.ownBreaks && (a.completes > 0 || sacrificed) ? 1 : 0);
  return (
    stuckGain(board, before, spec, q, r, rot) +
    a.completes * 50 +
    a.points * 4 +
    // Fluss- und Wegkacheln sind selten (etwa jede fünfte und achte): Ein
    // Fluss- oder Weg-Auftrag, der wächst, ist schwerer zu ersetzen als ein
    // Wald. Doppelt gezählt brachte das +2,1 (Runde 2d).
    (a.closer + a.rareCloser) * 20 +
    (a.progress + a.rareProgress) * 5 +
    a.ready * 8 -
    breaks * 100 +
    fit.matched +
    (sacrificed ? HOPE_BONUS : 0) +
    // Ein Punkt Flagge, Fluss oder Weg wiegt 8 — so viel wie ein Auftrag,
    // der eine Kachel näher kommt, nicht mehr: Mit 15 kosteten die Aufträge
    // mehr, als Flaggen und Fluss brachten (Runde 1b).
    side * 8
  );
}

interface Before {
  hand: TileSpec | null;
  side: number;
  base: AssessBase;
  quests: QuestChance[];
}

/**
 * Was je Zug für alle Lagen gleich ist — einmal gerechnet und an der Kachel
 * in der Hand gemerkt: Die ist mit jedem Zug ein neues Objekt.
 */
const memo = new WeakMap<HexBoard, Before>();

function beforeMove(board: HexBoard): Before {
  let before = memo.get(board);
  if (!before || before.hand !== board.current) {
    before = {
      hand: board.current,
      side: sideOf(board),
      base: board.assessBase(true),
      quests: openQuests(board),
    };
    memo.set(board, before);
  }
  return before;
}

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
function sideGain(
  board: HexBoard,
  before: Before,
  spec: TileSpec,
  q: number,
  r: number,
  rot: number,
): number {
  const key = hexKey(q, r);
  board.tiles.set(key, { q, r, spec, rot });
  const after = sideOf(board);
  board.tiles.delete(key);
  return after - before.side;
}

interface QuestChance {
  key: string;
  terrain: Terrain;
  target: number;
  /** Die freien Felder am Rand seines Gebiets. */
  slots: Set<string>;
  chance: number;
}

/** Jeder offene Auftrag mit seiner Chance (`questChance`). */
function openQuests(board: HexBoard): QuestChance[] {
  const out: QuestChance[] = [];
  for (const [key, tile] of board.tiles) {
    const quest = tile.spec.quest;
    if (!quest || quest.state !== 'open' || quest.target === null) continue;
    const found = questChance(board, key, quest.terrain);
    out.push({ key, terrain: quest.terrain, target: quest.target, ...found });
  }
  return out;
}

const STACK_WEIGHT = BASE_TILES.reduce((sum, b) => sum + Math.max(0, b.weight), 0);

/**
 * **Wie wahrscheinlich die nächste Kachel einen Auftrag weiterbringt** — der
 * Anteil des Stapels (nach `BASE_TILES.weight`, das Land grob nach
 * `landWeights`), der in irgendeiner Drehung an eines der freien Felder seines
 * Gebiets passt und dort das Gelände anlegt. Beide Spieler fanden: Ab dem
 * 4.–8. Zug lagen bei _Intelligent_ drei Aufträge fest, deren einziges Feld
 * eine harte Kante verlangt — `slotFor` nennt so ein Feld `grow`, weil
 * _irgendeine_ Kachel passt, und in 40 Zügen kam keine.
 */
function questChance(
  board: HexBoard,
  start: string,
  terrain: Terrain,
): { size: number; slots: Set<string>; chance: number } {
  const seen = new Set<string>([start]);
  const todo = [start];
  const slots = new Map<string, { q: number; r: number; faces: number[] }>();
  while (todo.length) {
    const tile = board.tiles.get(todo.pop()!)!;
    for (let e = 0; e < 6; e++) {
      if (edgeAt(tile.spec, tile.rot, e) !== terrain) continue;
      const n = neighbour(tile, e);
      const key = hexKey(n.q, n.r);
      const other = board.tiles.get(key);
      if (!other) {
        let slot = slots.get(key);
        if (!slot) slots.set(key, (slot = { q: n.q, r: n.r, faces: [] }));
        slot.faces.push(opposite(e));
      } else if (!seen.has(key) && edgeAt(other.spec, other.rot, opposite(e)) === terrain) {
        seen.add(key);
        todo.push(key);
      }
    }
  }
  const kind = terrain === 'water' ? 'w' : terrain === 'road' ? 'r' : 'l';
  const best = new Map<string, number>();
  for (const slot of slots.values()) {
    const need: Array<'w' | 'r' | 'l' | null> = [];
    for (let e = 0; e < 6; e++) {
      const n = neighbour(slot, e);
      const other = board.tiles.get(hexKey(n.q, n.r));
      if (!other) need.push(null);
      else {
        const t = edgeAt(other.spec, other.rot, opposite(e));
        need.push(t === 'water' ? 'w' : t === 'road' ? 'r' : 'l');
      }
    }
    for (const base of BASE_TILES) {
      if (base.weight <= 0) continue;
      const share = kind === 'l' ? landWeights(base)[terrain as 'forest'] / 100 : 1;
      for (let k = 0; k < 6; k++) {
        let ok = true;
        for (let e = 0; e < 6 && ok; e++) {
          const want = need[e];
          if (!want) continue;
          const i = (e - k + 6) % 6;
          ok = (base.water.includes(i) ? 'w' : base.road.includes(i) ? 'r' : 'l') === want;
        }
        if (!ok) continue;
        // Die Kanten zum Gebiet hin: Fluss und Weg liegen fest, Land wird gewürfelt.
        let p = 0;
        for (const f of slot.faces) {
          const i = (f - k + 6) % 6;
          const has = base.water.includes(i) ? 'w' : base.road.includes(i) ? 'r' : 'l';
          if (has === kind) p = 1 - (1 - p) * (1 - share);
        }
        if (p > (best.get(base.id) ?? 0)) best.set(base.id, p);
      }
    }
  }
  let chance = 0;
  for (const base of BASE_TILES) chance += (best.get(base.id) ?? 0) * Math.max(0, base.weight);
  return { size: seen.size, slots: new Set(slots.keys()), chance: chance / STACK_WEIGHT };
}

/**
 * Unter dieser Chance liegt ein Auftrag fest (etwa jede siebte Kachel); unter
 * `HOPE` ist er so gut wie hoffnungslos. Was das Festlegen kostet, das
 * Befreien bringt und das Opfern eines hoffnungslosen Auftrags (Runde 3b).
 */
const LOW = 0.15;
const STUCK = 25;
const FREED = 15;
const HOPE = 0.03;
const HOPE_BONUS = 4;

/**
 * **Festfahren** (Runde 3b, +14,4 gegen den Stand von Runde 2): Für jeden offenen Auftrag, an dessen freien
 * Feldern die Lage etwas ändert, die Chance davor und danach. Fällt sie unter
 * `LOW`, kostet das; hebt die Lage sie von dort heraus, bringt es etwas. Ein
 * Auftrag, der schon davor so gut wie hoffnungslos war (unter `HOPE`), darf
 * geopfert werden, solange Aufträge nachkommen: Das hebt dessen −100 aus
 * `breaks` auf — der Platz wird frei für eine neue Auftragskachel.
 */
function stuckGain(
  board: HexBoard,
  before: Before,
  spec: TileSpec,
  q: number,
  r: number,
  rot: number,
): number {
  if (!before.quests.length) return 0;
  const here = hexKey(q, r);
  const sacrifice = (quest: QuestChance) =>
    quest.chance < HOPE && board.tasks.length > 0 && before.base.quests.get(quest.key)?.possible
      ? 100 + HOPE_BONUS
      : 0;
  const near = new Set<string>([here]);
  for (let e = 0; e < 6; e++) {
    const n = neighbour({ q, r }, e);
    near.add(hexKey(n.q, n.r));
  }
  let gain = 0;
  board.tiles.set(here, { q, r, spec, rot });
  for (const quest of before.quests) {
    let touched = false;
    for (const key of near) if (quest.slots.has(key)) touched = true;
    if (!touched) continue;
    const now = questChance(board, quest.key, quest.terrain);
    if (now.size >= quest.target && now.size !== quest.target) {
      gain += sacrifice(quest);
      continue;
    }
    if (now.size === quest.target) continue;
    if (now.slots.size === 0) {
      gain += sacrifice(quest);
      continue;
    }
    if (now.chance < LOW && quest.chance >= LOW) gain -= STUCK;
    else if (now.chance >= LOW && quest.chance < LOW) gain += FREED;
  }
  // Der eigene Auftrag einer Auftragskachel zählte bisher nicht mit — sie
  // durfte sich gleich festlegen. Er kostet `STUCK`, wenn er hier unter `LOW`
  // liegt (Runde 6b, +3,1) oder wenn die Kacheln, die noch kommen, im Mittel
  // nicht reichen: Chance × Stapel < fehlende Kacheln (Runde 6e, +6,4; als
  // Ersatz für `LOW` bei allen Aufträgen kostete dieselbe Rechnung −3,6,
  // Runde 4a).
  const own = spec.quest;
  if (own && own.target !== null && board.tasks.length > 0) {
    const mine = questChance(board, here, own.terrain);
    const missing = own.target - mine.size;
    if (
      missing > 0 &&
      (mine.slots.size === 0 || mine.chance < LOW || mine.chance * board.stack.length < missing)
    )
      gain -= STUCK;
  }
  board.tiles.delete(here);
  return gain;
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
 * +3,2 gegen den Stand ohne (Runde 2o). Die nächste Kachel wird zweimal ganz
 * durchgerechnet — darum nur zwei Lagen, jede weitere kostet noch einmal so
 * viel. Seit der Stand vor dem Zug je Zug nur einmal gerechnet wird
 * (`beforeMove`, Runde 3a), kostet alles zusammen etwa das 2,6- bis 3-Fache von
 * _Intelligent_ (vorher fast das Vierfache).
 */
const LOOK_MARGIN = 5;

function lookAhead(board: HexBoard, spec: TileSpec, at: Placement): number {
  if (board.stack.length === 0) return at.score;
  // Der gemerkte Stand vor dem Zug gehört zum echten Brett, nicht zum probehalber belegten.
  memo.delete(board);
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
  memo.delete(board);
  return value;
}
