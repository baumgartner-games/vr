import {
  BASE_TILES,
  TERRAIN_LABEL,
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
  const a = board.assess(spec, q, r, rot, true, before.base, before.hopeless);
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
  /** Die offenen Aufträge, für die der Stapel nicht mehr reicht (`hopeless`). */
  hopeless: Set<string>;
}

/**
 * Was je Zug für alle Lagen gleich ist — einmal gerechnet und an der Kachel
 * in der Hand gemerkt: Die ist mit jedem Zug ein neues Objekt.
 */
const memo = new WeakMap<HexBoard, Before>();

function beforeMove(board: HexBoard): Before {
  let before = memo.get(board);
  if (!before || before.hand !== board.current) {
    const quests = openQuests(board);
    before = {
      hand: board.current,
      side: sideOf(board),
      base: board.assessBase(true),
      quests,
      hopeless: new Set(quests.filter((quest) => quest.hopeless).map((quest) => quest.key)),
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

export interface QuestChance {
  key: string;
  terrain: Terrain;
  target: number;
  size: number;
  /** Die freien Felder am Rand seines Gebiets. */
  slots: Set<string>;
  chance: number;
  /** Wie viele Kacheln, die noch kommen, das Gelände überhaupt tragen (`count`). */
  carriers: number;
  /** Wie viele davon jetzt an eines seiner freien Felder passen. */
  helpful: number;
  /** Der Stapel reicht nicht mehr bis zur Zahl (`hopelessBy`). */
  hopeless: boolean;
}

/**
 * **Jeder offene Auftrag mit seiner Chance** (`questChance`) — und in der
 * normalen Runde, ob der Stapel überhaupt noch reicht (`stackPool`).
 */
export function openQuests(board: HexBoard, withHand = true): QuestChance[] {
  const out: QuestChance[] = [];
  const pool = stackPool(board, withHand);
  for (const [key, tile] of board.tiles) {
    const quest = tile.spec.quest;
    if (!quest || quest.state !== 'open' || quest.target === null) continue;
    const found = questChance(board, key, quest.terrain);
    const counted = pool
      ? count(board, pool, found.slots, quest.terrain)
      : { carriers: Infinity, helpful: Infinity };
    out.push({
      key,
      terrain: quest.terrain,
      target: quest.target,
      ...found,
      ...counted,
      hopeless:
        pool !== null && hopelessBy(board, quest.terrain, quest.target - found.size, counted),
    });
  }
  return out;
}

/**
 * **Was noch kommt, ohne Reihenfolge** — die Kacheln im Stapel und die in der
 * Hand, gleiche zusammengefasst. Nur in der normalen Runde; im unendlichen
 * Spiel füllt sich der Stapel immer nach. Wer am Tisch mitzählt, weiß
 * dasselbe: Der Stapel ist bekannt, nur nicht, in welcher Folge er kommt.
 * Gewünscht: _„wenn die Mission nicht mehr erfolgreich beendet werden kann,
 * dass es das nicht mehr versucht bzw. absichtlich die Mission fehlschlagen
 * lässt, da er weiß, dass es dafür keine tiles mehr gibt."_
 */
interface PoolEntry {
  edges: readonly Terrain[];
  count: number;
}

function stackPool(board: HexBoard, withHand = true): PoolEntry[] | null {
  if (board.mode !== 'game') return null;
  const pool = new Map<string, PoolEntry>();
  const specs = board.current && withHand ? [...board.stack, board.current] : board.stack;
  for (const spec of specs) {
    const key = spec.edges.join();
    const entry = pool.get(key);
    if (entry) entry.count++;
    else pool.set(key, { edges: spec.edges, count: 1 });
  }
  return [...pool.values()];
}

/**
 * **Mitzählen**: `carriers` — Kacheln, die das Gelände überhaupt tragen;
 * `helpful` — die davon, die in irgendeiner Drehung an eines der freien Felder
 * des Gebiets passen (Fluss und Weg der Nachbarn) und das Gelände dort
 * anlegen. Ein freies Feld wird nur enger, je mehr Nachbarn es bekommt: Was
 * jetzt nirgends passt, passt dort auch später nicht.
 */
function count(
  board: HexBoard,
  pool: PoolEntry[],
  slots: Set<string>,
  terrain: Terrain,
): { carriers: number; helpful: number } {
  const kindOf = (t: Terrain): 'w' | 'r' | 'l' => (t === 'water' ? 'w' : t === 'road' ? 'r' : 'l');
  const needs: Array<Array<'w' | 'r' | 'l' | null>> = [];
  const faces: number[][] = [];
  for (const key of slots) {
    const [q, r] = key.split(',').map(Number) as [number, number];
    const need: Array<'w' | 'r' | 'l' | null> = [];
    const face: number[] = [];
    for (let e = 0; e < 6; e++) {
      const n = neighbour({ q, r }, e);
      const other = board.tiles.get(hexKey(n.q, n.r));
      if (!other) {
        need.push(null);
        continue;
      }
      const t = edgeAt(other.spec, other.rot, opposite(e));
      need.push(kindOf(t));
      if (t === terrain) face.push(e);
    }
    needs.push(need);
    faces.push(face);
  }
  let carriers = 0;
  let helpful = 0;
  for (const entry of pool) {
    if (!entry.edges.includes(terrain)) continue;
    carriers += entry.count;
    let fits = false;
    for (let s = 0; s < needs.length && !fits; s++) {
      for (let k = 0; k < 6 && !fits; k++) {
        const at = (e: number): Terrain => entry.edges[(e - k + 6) % 6]!;
        let ok = true;
        for (let e = 0; e < 6 && ok; e++) {
          const want = needs[s]![e];
          if (want) ok = kindOf(at(e)) === want;
        }
        if (ok) fits = faces[s]!.some((e) => at(e) === terrain);
      }
    }
    if (fits) helpful += entry.count;
  }
  return { carriers, helpful };
}

/**
 * **Reicht der Stapel nicht mehr?** Jede Kachel bringt das Gebiet um höchstens
 * eine weiter (bis auf das seltene Zusammenwachsen zweier Gebiete). Fehlen
 * mehr, als noch Kacheln mit dem Gelände kommen — oder passt keine einzige
 * mehr an eines seiner freien Felder —, ist der Auftrag verloren. Eine
 * Auftragskachel desselben Geländes, die noch im Auftragsstapel liegt, zählt
 * als Träger mit (ihre Kanten stehen erst beim Ziehen fest).
 */
function hopelessBy(
  board: HexBoard,
  terrain: Terrain,
  missing: number,
  counted: { carriers: number; helpful: number },
): boolean {
  if (missing <= 0) return false;
  const tasks = board.tasks.filter((task) => task.terrain === terrain).length;
  return missing > counted.carriers + tasks || (counted.helpful === 0 && tasks === 0);
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
  // **Aussichtslose Aufträge** (Stapel gezählt) zählen in `assess` nicht mehr
  // mit: weder Wachsen noch Verlieren. Lässt die Lage einen davon platzen,
  // wird sein Platz frei — so viel wie das Opfern sonst (`HOPE_BONUS`).
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
    if (quest.hopeless) {
      const gone = now.size > quest.target || (now.size < quest.target && now.slots.size === 0);
      if (gone && board.tasks.length > 0) gain += HOPE_BONUS;
      continue;
    }
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
  info?: { second: Placement | null; close: boolean },
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
  const close = !!best && !!second && second.score >= best.score - LOOK_MARGIN;
  if (strategy === 'optimized' && close) {
    const pick = lookAhead(board, spec, best!) >= lookAhead(board, spec, second!) ? best : second;
    if (info) Object.assign(info, { second: pick === best ? second : best, close });
    return pick;
  }
  if (info) Object.assign(info, { second, close });
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

/** Ein Grund für einen Vorschlag — grün, rot oder bloß zur Kenntnis. */
export interface Reason {
  tone: 'good' | 'bad' | 'info';
  text: string;
}

/**
 * **Warum der Vorschlag dort liegt** — in Worten, für das ⓘ neben dem Knopf
 * _Vorschlag_ (`HexlandWorld.suggest`). Gewünscht: _„einen Button im hex Spiel
 * Screen (Hilfe/Lege Vorschlag (intelligent optimiert)) …, der das Tile
 * platziert und ich auf ein (Info Icon) drücken kann um zu erfahren, warum er
 * es dort hin gelegt hat"_. Gerechnet vor dem Legen: was jeder offene Auftrag
 * davon hat, der eigene Auftrag der Kachel, Flaggen, Fluss und Weg, Kanten —
 * und welche Aufträge der Stapel nicht mehr hergibt.
 */
export function explainPlacement(
  board: HexBoard,
  at: Placement,
  info?: { second: Placement | null; close: boolean },
): Reason[] {
  const spec = board.current;
  if (!spec) return [];
  const out: Reason[] = [];
  const label = (t: Terrain): string => TERRAIN_LABEL[t];
  const quests = openQuests(board);
  const sizeOf = (key: string, terrain: Terrain): number => {
    const tile = board.tiles.get(key)!;
    return board.areaSize(tile.q, tile.r, terrain);
  };
  const was = new Map(quests.map((quest) => [quest.key, sizeOf(quest.key, quest.terrain)]));
  const scoreBefore = board.scoring();
  const a = board.assess(spec, at.q, at.r, at.rot, true);
  const fit = board.fit(spec, at.q, at.r, at.rot);
  const key = hexKey(at.q, at.r);
  board.tiles.set(key, { q: at.q, r: at.r, spec, rot: at.rot });
  const scoreAfter = board.scoring();
  const now = new Map(quests.map((quest) => [quest.key, sizeOf(quest.key, quest.terrain)]));
  const own = spec.quest;
  const ownAfter =
    own && own.target !== null
      ? openQuests(board, false).find((quest) => quest.key === key)
      : undefined;
  board.tiles.delete(key);

  for (const quest of quests) {
    const before = was.get(quest.key)!;
    const after = now.get(quest.key)!;
    const name = `${label(quest.terrain)} ${quest.target}`;
    const missing = quest.target - before;
    if (after === quest.target && before !== quest.target) {
      out.push({ tone: 'good', text: `✓ ${name} wird genau fertig — +${quest.target} Punkte` });
    } else if (after > quest.target && before < quest.target) {
      out.push(
        quest.hopeless
          ? {
              tone: 'info',
              text:
                `${name} platzt (${after}/${quest.target}) — er war ohnehin verloren: ${lack(quest, missing)}` +
                (board.tasks.length > 0 ? '. Sein Platz wird frei für einen neuen Auftrag.' : '.'),
            }
          : { tone: 'bad', text: `✗ ${name} wird zu groß (${after}/${quest.target})` },
      );
    } else if (after > before) {
      out.push({
        tone: 'good',
        text: `${name}: ${before} → ${after} / ${quest.target} (noch ${quest.target - after})`,
      });
    } else if (quest.hopeless) {
      out.push({
        tone: 'info',
        text: `${name} (${before}/${quest.target}) wird nicht mehr bedient — ${lack(quest, missing)}.`,
      });
    }
  }

  if (own && own.target !== null && ownAfter) {
    const name = `${label(own.terrain)} ${own.target}`;
    if (ownAfter.size === own.target)
      out.push({
        tone: 'good',
        text: `✓ Der neue Auftrag ${name} ist sofort fertig — +${own.target}`,
      });
    else if (ownAfter.size > own.target)
      out.push({
        tone: 'info',
        text: `Der neue Auftrag ${name} wird gleich geopfert (${ownAfter.size}/${own.target}) — so wird sein Platz sofort wieder frei.`,
      });
    else
      out.push({
        tone: ownAfter.hopeless ? 'bad' : 'info',
        text:
          `Der neue Auftrag ${name} beginnt mit ${ownAfter.size}/${own.target}` +
          (ownAfter.hopeless
            ? ` — der Stapel reicht kaum: ${lack(ownAfter, own.target - ownAfter.size)}`
            : ''),
      });
  }

  const flags = scoreAfter.flags - scoreBefore.flags;
  if (flags > 0) out.push({ tone: 'good', text: `Schließt ein Gebiet mit Flagge — +${flags}` });
  const river = scoreAfter.river - scoreBefore.river;
  if (river > 0) out.push({ tone: 'good', text: `Längster Fluss wird länger — +${river}` });
  const road = scoreAfter.road - scoreBefore.road;
  if (road > 0) out.push({ tone: 'good', text: `Längster Weg wird länger — +${road}` });
  if (a.ready >= 1)
    out.push({
      tone: 'good',
      text: 'Bereitet ein Gebiet vor, das eine kommende Auftragskachel auf einen Schlag erfüllen kann',
    });
  if (!out.some((reason) => reason.tone === 'good'))
    out.push({
      tone: 'info',
      text: 'Kein Auftrag in Reichweite — gelegt, wo die Kanten am besten passen und nichts verbaut wird',
    });
  if (fit && fit.neighbours > 0)
    out.push({ tone: 'info', text: `${fit.matched} von ${fit.neighbours} Kanten passen` });
  if (info?.second)
    out.push({
      tone: 'info',
      text: info.close
        ? 'Knapp entschieden: Die zweitbeste Lage lag fast gleichauf — den Ausschlag gab der Blick auf die nächste Kachel'
        : 'Deutlich vor jeder anderen Lage',
    });
  return out;
}

/** Warum der Stapel für einen Auftrag nicht mehr reicht — in Worten. */
function lack(quest: QuestChance, missing: number): string {
  const name = TERRAIN_LABEL[quest.terrain];
  if (quest.helpful === 0) return `keine Kachel, die noch kommt, passt mit ${name} an sein Gebiet`;
  return `es fehlen ${missing}, aber nur noch ${quest.carriers} Kachel${quest.carriers === 1 ? '' : 'n'} mit ${name} kommen`;
}
