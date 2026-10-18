/**
 * **Die Regeln von Hexland** — ohne three.js, damit ein Test sie in einer
 * Millisekunde abläuft und die Welt nur noch zeichnet, was hier entschieden
 * wird.
 *
 * Gewünscht (Oktober 2026): _„Ich will mit den hex tiles ein Spiel bauen …
 * Baue sowas nach, dass ich in vr als auch von oben oder Handy eine Welt
 * aufbauen kann"_ — mit Bildern aus _Dorfromantik_ dazu. Das Spiel dahinter
 * ist genau das: Kacheln von einem Stapel nehmen, drehen, an die Landschaft
 * legen.
 *
 * **Gewertet wird wie im Brettspiel** (_Dorfromantik — Das Brettspiel_),
 * gewünscht: _„Wie wäre es einfach ein Dorf Romantik Klon zu machen mit 3
 * aktiven Missionen und einer festen Anzahl an normalen Karten … Und Punkte
 * berechnen wie im Brett Spiel"_. Eine Partie hat 40 normale Kacheln
 * (`NORMAL_TILES`); liegen weniger als drei offene Aufträge
 * (`OPEN_TASKS`), kommt statt einer normalen eine **Auftragskachel** — sie
 * zählt nicht vom Stapel ab. Ein Auftrag nennt eine Zahl: Das Gebiet, zu dem
 * seine Kachel gehört, soll **genau** so viele Kacheln groß werden. Wird es
 * genau so groß, ist die Zahl verdient; wächst es darüber hinaus, ist er
 * verpasst. Dazu wie im Brettspiel: geschlossene Gebiete mit **Flagge**
 * zählen ihre Kacheln, und der **längste Fluss** und der **längste Weg**
 * je eine Kachel einen Punkt (`scoring`). Passende Kanten bringen keine
 * Punkte — sie helfen nur, Gebiete wachsen zu lassen.
 *
 * Daneben der **Kreativ-Modus**: kein Stapel, keine Wertung, die nächste
 * Kachel sucht man sich aus dem Katalog aus (`catalogue`).
 *
 * **Sechs Kanten, und jede hat ein Gelände** (`Terrain`). Wiese, Wald, Dorf
 * und Feld sind weich: Sie passen oder passen nicht, gelegt werden darf
 * trotzdem. Fluss und Weg sind hart — wo an der Nachbarkante Wasser ist, muss
 * auch hier Wasser sein, und umgekehrt. So bleiben Flüsse und Wege
 * zusammenhängend, wie in _Dorfromantik_.
 *
 * **Die Kacheln sind Pointy-Top-Sechsecke** (die Spitzen zeigen nach ±z), weil
 * die Kacheln des Regals so gebaut sind (`medieval-hexagon/tiles`). Kante `i`
 * zeigt in die Richtung `i · 60°`, gemessen von +x nach +z.
 */

/** Was an einer Kante liegt. */
export type Terrain = 'grass' | 'forest' | 'house' | 'field' | 'water' | 'road';

/** Gelände mit Flaggen: Wald, Dorf, Feld — ein geschlossenes Gebiet zählt. */
export type AreaTerrain = 'forest' | 'house' | 'field';

export const AREA_TERRAINS: readonly AreaTerrain[] = ['forest', 'house', 'field'];

/** Gelände, für die es Aufträge gibt — wie im Brettspiel auch Fluss und Weg. */
export type QuestTerrain = AreaTerrain | 'water' | 'road';

export const QUEST_TERRAINS: readonly QuestTerrain[] = [
  'forest',
  'house',
  'field',
  'water',
  'road',
];

/** Wie das Gelände im Spiel heißt. */
export const TERRAIN_LABEL: Readonly<Record<Terrain, string>> = {
  grass: 'Wiese',
  forest: 'Wald',
  house: 'Stadt',
  field: 'Weizen',
  water: 'Fluss',
  road: 'Weg',
};

/** Ein Feld auf dem Brett, in axialen Koordinaten. */
export interface Hex {
  readonly q: number;
  readonly r: number;
}

/**
 * **Die sechs Nachbarn**, Index = Kante. Kante 0 liegt bei +x, Kante 1 bei
 * 60° Richtung +z und so weiter — passend zu `hexCentre`.
 */
export const HEX_DIRS: readonly Hex[] = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
];

export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function neighbour(hex: Hex, edge: number): Hex {
  const d = HEX_DIRS[edge]!;
  return { q: hex.q + d.q, r: hex.r + d.r };
}

/** Die gegenüberliegende Kante — wo der Nachbar an diese Kante stößt. */
export function opposite(edge: number): number {
  return (edge + 3) % 6;
}

/** **Die Mitte eines Felds** in der Ebene, bei Breite `width` (Kante zu Kante). */
export function hexCentre(q: number, r: number, width: number): { x: number; z: number } {
  return { x: width * (q + r / 2), z: width * ((r * Math.sqrt(3)) / 2) };
}

/** **Welches Feld unter einem Punkt liegt** — die Umkehrung von `hexCentre`. */
export function hexAt(x: number, z: number, width: number): Hex {
  const r = (2 * z) / (Math.sqrt(3) * width);
  const q = x / width - r / 2;
  return hexRound(q, r);
}

function hexRound(q: number, r: number): Hex {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq + 0, r: rr + 0 };
}

// --- die Grundkacheln aus dem Regal -------------------------------------------

/**
 * **Eine Grundkachel aus dem Regal** und welche ihrer Kanten Wasser und Weg
 * sind — ungedreht. Ausgemessen von oben, Kante für Kante (Oktober 2026): an
 * jeder Kantenmitte die Farbe, blau ist Wasser, sandfarben der Weg.
 */
export interface BaseTile {
  readonly id: string;
  /** Die Datei unter `models/kaykit/medieval-hexagon/`. */
  readonly model: string;
  readonly water: readonly number[];
  readonly road: readonly number[];
  /** Wie oft sie aus dem Stapel kommt, im Verhältnis zu den anderen. */
  readonly weight: number;
}

const river = (letter: string, water: number[], weight: number): BaseTile => ({
  id: `river-${letter}`,
  model: `tiles/rivers/hex_river_${letter}.glb`,
  water,
  road: [],
  weight,
});

const road = (letter: string, roads: number[], weight: number): BaseTile => ({
  id: `road-${letter}`,
  model: `tiles/roads/hex_road_${letter}.glb`,
  water: [],
  road: roads,
  weight,
});

/**
 * **Alle Grundkacheln.** Die Gewichte machen den Stapel: meist Land, ab und zu
 * ein Fluss oder ein Weg, selten eine Kreuzung oder ein See. Die
 * Fluss-Gabelungen mit vier und mehr Armen sind selten, weil jede offene
 * Flusskante eine Kachel verlangt, die genau dort Wasser hat.
 */
export const BASE_TILES: readonly BaseTile[] = [
  { id: 'land', model: 'tiles/base/hex_grass.glb', water: [], road: [], weight: 64 },
  river('A', [0, 3], 4),
  river('A_curvy', [0, 3], 3),
  river('B', [3, 5], 4),
  river('C', [3, 4], 2),
  river('D', [1, 3, 5], 0.6),
  river('E', [0, 3, 5], 0.8),
  river('F', [0, 1, 3], 0.6),
  road('A', [0, 3], 3.5),
  road('B', [3, 5], 3.5),
  road('C', [3, 4], 1.5),
  road('D', [1, 3, 5], 0.8),
  road('E', [0, 3, 5], 1),
  road('F', [0, 1, 3], 0.6),
  road('M', [3], 1.2),
  // **Nur für den Baukasten** (Gewicht 0, also nie im Stapel): die Gabeln mit
  // vier und mehr Armen — wer sie sich selbst baut, soll sie auch bekommen.
  river('G', [2, 3, 4], 0),
  river('H', [0, 2, 3, 4], 0),
  river('I', [1, 2, 4, 5], 0),
  river('J', [0, 1, 2, 3], 0),
  river('K', [1, 2, 3, 4, 5], 0),
  // Alle sechs Kanten Fluss — lag im Regal, fehlte hier (gefragt: _„Schau mal
  // nach, ob wir alle Tile-Kombinationen haben?"_).
  river('L', [0, 1, 2, 3, 4, 5], 0),
  road('G', [2, 3, 4], 0),
  road('H', [0, 2, 3, 4], 0),
  road('I', [1, 2, 4, 5], 0),
  road('J', [0, 1, 2, 3], 0),
  road('K', [1, 2, 3, 4, 5], 0),
  road('L', [0, 1, 2, 3, 4, 5], 0),
  {
    id: 'crossing-A',
    model: 'tiles/rivers/hex_river_crossing_A.glb',
    water: [0, 3],
    road: [1, 4],
    weight: 0.8,
  },
  {
    id: 'crossing-B',
    model: 'tiles/rivers/hex_river_crossing_B.glb',
    water: [0, 3],
    road: [2, 5],
    weight: 0.8,
  },
  // **Eine Bucht an einer Kante** — das einzige Modell mit genau einer
  // Wasserkante: Dort darf ein Fluss enden, und ein Wasser-Auftrag kann
  // geschlossen werden. Lag im Regal und fehlte bisher.
  { id: 'coast-A', model: 'tiles/coast/hex_coast_A.glb', water: [1], road: [], weight: 0.8 },
  { id: 'coast-B', model: 'tiles/coast/hex_coast_B.glb', water: [1, 2], road: [], weight: 1.2 },
  { id: 'coast-C', model: 'tiles/coast/hex_coast_C.glb', water: [0, 1, 2], road: [], weight: 1 },
  {
    id: 'coast-D',
    model: 'tiles/coast/hex_coast_D.glb',
    water: [0, 1, 2, 5],
    road: [],
    weight: 0.6,
  },
  {
    id: 'lake',
    model: 'tiles/base/hex_water.glb',
    water: [0, 1, 2, 3, 4, 5],
    road: [],
    weight: 0.5,
  },
];

const BASE_BY_ID = new Map(BASE_TILES.map((base) => [base.id, base]));

export function baseTile(id: string): BaseTile {
  return BASE_BY_ID.get(id) ?? BASE_TILES[0]!;
}

// --- eine Kachel ------------------------------------------------------------

/**
 * **Ein Auftrag auf einer Kachel**: Das Gebiet soll genau `target` Kacheln
 * groß werden. Das Ziel wird beim Legen gezogen — vorher weiß niemand, wie
 * groß das Gebiet schon ist.
 */
export interface Quest {
  readonly terrain: QuestTerrain;
  target: number | null;
  state: 'open' | 'done' | 'failed';
}

/**
 * **Eine Kachel**, wie sie im Stapel liegt: Grundkachel und die sechs Kanten
 * **ungedreht**. Gedreht wird erst beim Legen (`PlacedTile.rot`).
 */
export interface TileSpec {
  readonly base: string;
  readonly edges: readonly Terrain[];
  /** Ein Zufall für die Deko, damit dieselbe Kachel immer gleich aussieht. */
  readonly seed: number;
  quest?: Quest;
  /** Eine Flagge auf diesem Gelände der Kachel (`scoring`). */
  readonly flag?: AreaTerrain;
}

export interface PlacedTile extends Hex {
  readonly spec: TileSpec;
  /** In Sechsteldrehungen: Kante `i` der Kachel liegt an Kante `(i + rot) % 6`. */
  readonly rot: number;
}

/** **Die Kante `edge` auf dem Brett** — nach der Drehung. */
export function edgeAt(spec: TileSpec, rot: number, edge: number): Terrain {
  return spec.edges[(((edge - rot) % 6) + 6) % 6]!;
}

/**
 * **In wie vielen Stücken ein Gelände auf der Kachel liegt** — zusammenhängende
 * Kanten im Kreis. Fluss und Weg teilen das Land: Stadt, Weg, Stadt sind zwei.
 */
export function runs(edges: readonly Terrain[], terrain: Terrain): number {
  let n = 0;
  for (let e = 0; e < 6; e++) {
    if (edges[e] === terrain && edges[(e + 5) % 6] !== terrain) n++;
  }
  return n;
}

/** Wasser und Weg sind hart: Sie müssen auf ihresgleichen treffen. */
function hard(t: Terrain): boolean {
  return t === 'water' || t === 'road';
}

// --- Zufall -------------------------------------------------------------------

/** **Ein kleiner Würfel mit Gedächtnis** (mulberry32) — derselbe Samen, derselbe Stapel. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], weight: (item: T) => number, roll: number): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let left = roll * total;
  for (const item of items) {
    left -= weight(item);
    if (left < 0) return item;
  }
  return items[items.length - 1]!;
}

/** Das Land neben Wasser oder Weg: am Weg eher Dorf, am Fluss eher Wiese und Feld. */
function landWeights(base: BaseTile): Record<Exclude<Terrain, 'water' | 'road'>, number> {
  if (base.road.length > 0) return { forest: 24, house: 40, field: 24, grass: 12 };
  if (base.water.length > 0) return { forest: 28, house: 22, field: 28, grass: 22 };
  return { forest: 36, house: 28, field: 26, grass: 10 };
}

/**
 * **Eine neue Kachel** — Grundkachel nach Gewicht, das freie Land in ein bis
 * drei zusammenhängende Stücke geteilt, wie die Kacheln des Brettspiels: meist
 * zwei Gelände, oft eines, selten drei, und wenig bloße Wiese.
 * Zusammenhängend, weil eine Kachel mit Wald-Feld-Wald-Feld im Kreis aussieht
 * wie Zufall und sich nirgends anlegen lässt.
 *
 * `task`: eine **Auftragskachel** — sie trägt einen Auftrag auf einem ihrer
 * Gelände.
 */
export function drawTile(
  random: () => number,
  options: { landOnly?: boolean; task?: Task } = {},
): TileSpec {
  const task = options.task;
  if (task) {
    // So lange ziehen, bis das verlangte Gelände auf der Kachel liegt — Fluss
    // und Weg gibt es nur auf ihren Grundkacheln.
    for (let tries = 0; tries < 60; tries++) {
      const spec = drawTile(random, { landOnly: false });
      if (!spec.edges.includes(task.terrain)) continue;
      // **Eindeutig, wo der Auftrag zählt** — gemeldet: _„Hier ist nicht klar,
      // wo die Stadt zählt. Bei Flüssen und Straßen, die eine Mission sind (die
      // nicht Fluss bzw. Straße sind), darf von der Mission nicht das Element
      // durch den Fluss geteilt sein."_
      if (task.terrain !== 'water' && task.terrain !== 'road' && runs(spec.edges, task.terrain) > 1)
        continue;
      return {
        base: spec.base,
        edges: spec.edges,
        seed: spec.seed,
        quest: { terrain: task.terrain, target: task.target, state: 'open' },
      };
    }
    // Sehr unwahrscheinlich: dann eine Landkachel, ganz aus dem Gelände.
    const terrain: Terrain =
      task.terrain === 'water' || task.terrain === 'road' ? 'grass' : task.terrain;
    const base = task.terrain === 'water' ? 'river-A' : task.terrain === 'road' ? 'road-A' : 'land';
    const edges: Terrain[] = Array.from({ length: 6 }, () => terrain);
    for (const i of baseTile(base).water) edges[i] = 'water';
    for (const i of baseTile(base).road) edges[i] = 'road';
    return {
      base,
      edges,
      seed: Math.floor(random() * 1e9),
      quest: { terrain: task.terrain, target: task.target, state: 'open' },
    };
  }
  const pool = options.landOnly ? [BASE_TILES[0]!] : BASE_TILES;
  const base = pick(pool, (b) => b.weight, random());
  const edges: Terrain[] = Array.from({ length: 6 }, () => 'grass');
  for (const i of base.water) edges[i] = 'water';
  for (const i of base.road) edges[i] = 'road';
  const free = [0, 1, 2, 3, 4, 5].filter((i) => !hard(edges[i]!));
  if (free.length > 0) {
    const weights = landWeights(base);
    const kinds = Object.keys(weights) as Array<keyof typeof weights>;
    const parts = Math.min(
      free.length,
      pick([1, 2, 3], (n) => [3.5, 4.5, 2][n - 1]!, random()),
    );
    // Schnitte an zufälligen Stellen im Kreis der freien Kanten.
    const start = Math.floor(random() * free.length);
    const cuts = new Set<number>([0]);
    while (cuts.size < parts) cuts.add(1 + Math.floor(random() * (free.length - 1)));
    let terrain: Terrain = 'grass';
    let last: Terrain | null = null;
    for (let k = 0; k < free.length; k++) {
      if (cuts.has(k)) {
        do terrain = pick(kinds, (t) => weights[t], random());
        while (terrain === last && parts > 1);
        last = terrain;
      }
      edges[free[(start + k) % free.length]!] = terrain;
    }
  }
  const seed = Math.floor(random() * 1e9);
  const areas = AREA_TERRAINS.filter((t) => edges.includes(t));
  // Eine Flagge nur auf einem Gelände, das auf der Kachel nicht geteilt ist —
  // sonst wäre unklar, welches Gebiet sie meint (wie beim Auftrag).
  const whole = areas.filter((t) => runs(edges, t) === 1);
  if (whole.length > 0 && random() < FLAG_CHANCE) {
    return { base: base.id, edges, seed, flag: whole[Math.floor(random() * whole.length)]! };
  }
  return { base: base.id, edges, seed };
}

/** Wie groß ein Auftrag sein kann — gewünscht: _„entweder 4, 5, 6 benötigten Feldern"_. */
export const QUEST_TARGETS: readonly number[] = [4, 5, 6];

/** Ein Auftrag im Auftragsstapel: welches Gelände, wie groß. */
export interface Task {
  readonly terrain: QuestTerrain;
  readonly target: number;
}

/**
 * **Die Zahlen je Gelände im Auftragsstapel** — wie im Brettspiel: _„Es gibt
 * bei Städten 4, 4, 5, 5, 6, 6 Aufträge und bei den anderen Gebieten Weizen,
 * Wald, Wasser, Straße/Weg."_ Die Zahl steht schon vor dem Legen fest (_„vor
 * dem Legen erkennbar, welcher Auftrag es ist (Stadt 4 z.B.)"_).
 */
export const TASK_TARGETS: readonly number[] = [4, 4, 5, 5, 6, 6];

/** **Der ganze Auftragsstapel**, gemischt: je Gelände die sechs Zahlen. */
export function taskDeck(random: () => number): Task[] {
  const deck: Task[] = [];
  for (const terrain of QUEST_TERRAINS)
    for (const target of TASK_TARGETS) deck.push({ terrain, target });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}

/**
 * **Wie viele Auftragskacheln eine normale Runde hat** — endlich, wie im
 * Brettspiel, damit man sieht, wie viele noch kommen können (gewünscht: _„Es
 * wäre schön zu sehen, wie viele Aufträge es noch geben könnte und wie viele
 * Spielplan-Tiles"_). Im unendlichen Spiel wird der Stapel neu gemischt,
 * wenn er leer ist.
 */
export const QUEST_TILES = QUEST_TERRAINS.length * TASK_TARGETS.length;

/** Wie viele normale Kacheln eine Partie hat. */
export const NORMAL_TILES = 40;
/** Wie viele Aufträge offen liegen sollen — fehlt einer, kommt eine Auftragskachel. */
export const OPEN_TASKS = 3;
/** Wie oft eine normale Kachel eine Flagge trägt. */
export const FLAG_CHANCE = 0.12;

// --- der Katalog des Kreativ-Modus -------------------------------------------------

/** Eine Kachel im Katalog: Name und Bauplan. */
export interface CatalogueTile {
  readonly id: string;
  readonly label: string;
  readonly spec: TileSpec;
}

/**
 * **Was der Kreativ-Modus anbietet** — die Kacheln, die man zum Bauen braucht:
 * jedes Gelände ganz, halb und halb, Flüsse und Wege in allen Formen mit Land
 * daneben, See, Ufer, Brücke.
 */
export function catalogue(): CatalogueTile[] {
  const out: CatalogueTile[] = [];
  const add = (id: string, label: string, base: string, land: Terrain[]): void => {
    const b = baseTile(base);
    const edges: Terrain[] = [];
    let k = 0;
    for (let e = 0; e < 6; e++) {
      if (b.water.includes(e)) edges.push('water');
      else if (b.road.includes(e)) edges.push('road');
      else edges.push(land[k++ % land.length]!);
    }
    out.push({ id, label, spec: { base, edges, seed: out.length * 7919 + 13 } });
  };
  const L = TERRAIN_LABEL;
  for (const t of ['forest', 'house', 'field', 'grass'] as const)
    add(`all-${t}`, L[t], 'land', [t]);
  const pairs = [
    ['forest', 'field'],
    ['forest', 'house'],
    ['field', 'house'],
    ['forest', 'grass'],
    ['field', 'grass'],
    ['house', 'grass'],
  ] as const;
  for (const [a, b] of pairs)
    add(`half-${a}-${b}`, `${L[a]} | ${L[b]}`, 'land', [a, a, a, b, b, b]);
  add('third', 'Wald | Feld | Dorf', 'land', [
    'forest',
    'forest',
    'field',
    'field',
    'house',
    'house',
  ]);
  add('river-A', 'Fluss gerade', 'river-A_curvy', ['forest', 'forest', 'field', 'field']);
  add('river-B', 'Fluss Bogen', 'river-B', ['grass', 'field', 'field', 'forest']);
  add('river-C', 'Fluss Knick', 'river-C', ['forest', 'forest', 'grass', 'grass']);
  add('river-E', 'Fluss Gabel', 'river-E', ['field', 'grass', 'forest']);
  add('lake', 'See', 'lake', []);
  add('coast-C', 'Seeufer', 'coast-C', ['grass', 'forest', 'forest']);
  add('crossing', 'Brücke', 'crossing-A', ['house', 'field']);
  add('road-A', 'Weg gerade', 'road-A', ['house', 'house', 'field', 'field']);
  add('road-B', 'Weg Bogen', 'road-B', ['house', 'house', 'forest', 'forest']);
  add('road-C', 'Weg Knick', 'road-C', ['house', 'house', 'field', 'field']);
  add('road-E', 'Weg Gabel', 'road-E', ['house', 'house', 'field']);
  add('road-M', 'Weg Ende', 'road-M', ['house', 'house', 'house', 'house', 'house']);
  return out;
}

/**
 * **Welche Kachel des Regals zu selbst gebauten Kanten passt** — für den
 * Baukasten des Kreativ-Modus. Gesucht wird eine Grundkachel und eine Drehung,
 * bei der Wasser und Weg genau dort liegen, wo sie gebaut sind; das übrige
 * Land malt die Ausstattung ohnehin nach den Kanten (`hexDressing`). `null`:
 * So eine Kachel gibt es im Regal nicht (ein Fluss mit nur einem Arm, Fluss
 * und Weg durcheinander).
 *
 * Bei zwei Treffern gewinnt der erste in `BASE_TILES` — ein Fluss vor einem
 * Ufer mit derselben Form.
 */
export function matchBase(edges: readonly Terrain[]): TileSpec | null {
  for (const base of BASE_TILES) {
    for (let k = 0; k < 6; k++) {
      let ok = true;
      for (let e = 0; e < 6 && ok; e++) {
        const model = (e - k + 6) % 6;
        const water = base.water.includes(model);
        const road = base.road.includes(model);
        ok = (edges[e] === 'water') === water && (edges[e] === 'road') === road;
      }
      if (!ok) continue;
      // Im Bauplan der Kachel stehen die Kanten ungedreht: Kante i liegt bei Drehung k an i + k.
      const own = Array.from({ length: 6 }, (_, i) => edges[(i + k) % 6]!);
      return { base: base.id, edges: own, seed: 1 };
    }
  }
  return null;
}

// --- das Brett ------------------------------------------------------------------

/**
 * **Die drei Spielarten**: eine Partie mit 40 Kacheln, das **unendliche Spiel**
 * (dieselben Regeln und dieselbe Wertung, aber der Stapel füllt sich immer
 * nach — gewünscht: _„normale Runde, unendliches Spiel, Creative Modus"_) und
 * der Kreativ-Modus.
 */
export type HexMode = 'game' | 'endless' | 'creative';

/** Was ein Legen gebracht hat — für die Meldung. */
export interface PlaceResult {
  /** Wie viele Punkte die Wertung dadurch gewonnen hat. */
  points: number;
  questsDone: QuestTerrain[];
  questsFailed: QuestTerrain[];
}

/** **Die Wertung wie im Brettspiel**, Posten für Posten (`HexBoard.scoring`). */
export interface Scoring {
  /** Erfüllte Aufträge: ihre Zahlen zusammen. */
  tasks: number;
  /** Geschlossene Gebiete mit Flagge: ihre Kacheln. */
  flags: number;
  /** Der längste Fluss und der längste Weg, in Kacheln. */
  river: number;
  road: number;
  total: number;
}

/** Ein Gebiet: welche Kacheln, und ob es noch eine offene Kante hat. */
interface Areas {
  find: (key: string) => string;
  size: Map<string, number>;
  open: Map<string, boolean>;
  /** Nur mit `strict`: um wie viele Kacheln das Gebiet höchstens noch wachsen kann. */
  room: Map<string, number>;
}

/**
 * **Das Brett**: was liegt, was im Stapel ist, was in der Hand liegt. Alles,
 * was gespeichert wird, steht hier (`save`/`load`), und nichts davon kennt
 * eine Szene.
 */
export class HexBoard {
  readonly tiles = new Map<string, PlacedTile>();
  /** Die normalen Kacheln, die noch kommen. */
  stack: TileSpec[] = [];
  /** Die Kachel in der Hand — `null`: Die Partie ist vorbei. */
  hand: TileSpec | null = null;
  mode: HexMode = 'game';
  placed = 0;
  /** Die Aufträge, die noch kommen — oben ist das Ende der Liste. */
  tasks: Task[] = [];

  /** Wie viele Auftragskacheln noch kommen können — `Infinity` im unendlichen Spiel. */
  get tasksLeft(): number {
    return this.mode === 'endless' ? Infinity : this.tasks.length;
  }
  private random: () => number;
  private seed: number;

  constructor(seed = Date.now() % 1e9) {
    this.seed = seed;
    this.random = rng(seed);
  }

  /** **Eine neue Partie** — eine Landkachel in der Mitte, 40 im Stapel, dann die Aufträge. */
  reset(seed = Date.now() % 1e9, mode: 'game' | 'endless' = 'game'): void {
    this.start(seed, mode);
    // Die letzten (obersten) ohne Fluss und Weg — sonst verlangt die zweite
    // Kachel schon einen Fluss, bevor es überhaupt Land gibt.
    for (let i = 0; i < NORMAL_TILES; i++) {
      this.stack.push(drawTile(this.random, { landOnly: i >= NORMAL_TILES - 3 }));
    }
    this.hand = this.nextHand();
  }

  /** **Kreativ bauen** — dieselbe Mitte, kein Stapel; in die Hand kommt, was man wählt. */
  resetCreative(seed = Date.now() % 1e9): void {
    this.start(seed, 'creative');
    this.hand = { ...catalogue()[0]!.spec, seed: this.newSeed() };
  }

  private start(seed: number, mode: HexMode): void {
    this.seed = seed;
    this.random = rng(seed);
    this.mode = mode;
    this.tiles.clear();
    this.placed = 0;
    this.stack = [];
    this.tasks = mode === 'creative' ? [] : taskDeck(this.random);
    const first = drawTile(this.random, { landOnly: true });
    this.tiles.set(hexKey(0, 0), {
      q: 0,
      r: 0,
      spec: { base: first.base, edges: first.edges, seed: first.seed },
      rot: 0,
    });
  }

  /** **Im Kreativ-Modus die nächste Kachel aussuchen** — mit eigenem Würfel für die Deko. */
  choose(spec: TileSpec): void {
    if (this.mode !== 'creative') return;
    this.hand = { base: spec.base, edges: spec.edges, seed: this.newSeed() };
  }

  private newSeed(): number {
    return Math.floor(this.random() * 1e9);
  }

  /** Die Kachel, die als nächste gelegt wird. */
  get current(): TileSpec | null {
    return this.hand;
  }

  get over(): boolean {
    return this.hand === null;
  }

  /** Wie viele Aufträge gerade offen auf dem Brett liegen. */
  openTasks(): number {
    let n = 0;
    for (const tile of this.tiles.values()) if (tile.spec.quest?.state === 'open') n++;
    return n;
  }

  /**
   * **Was als nächstes in die Hand kommt**: im Kreativ-Modus dieselbe Kachel
   * noch einmal (mit neuer Deko), sonst eine Auftragskachel, solange weniger
   * als drei Aufträge offen sind, und sonst die oberste normale. Ist der Stapel
   * leer, ist die Partie vorbei — auch wenn noch Aufträge fehlen.
   */
  private nextHand(): TileSpec | null {
    if (this.mode === 'creative') {
      const last = this.hand;
      return last ? { base: last.base, edges: last.edges, seed: this.newSeed() } : null;
    }
    // Unendlich: Der Stapel wird nie leer.
    if (this.mode === 'endless')
      while (this.stack.length < 3) this.stack.unshift(drawTile(this.random));
    if (this.stack.length === 0) return null;
    if (this.mode === 'endless' && this.tasks.length === 0) this.tasks = taskDeck(this.random);
    if (this.openTasks() < OPEN_TASKS && this.tasks.length > 0) {
      return drawTile(this.random, { task: this.tasks.pop()! });
    }
    return this.stack.pop()!;
  }

  at(q: number, r: number): PlacedTile | undefined {
    return this.tiles.get(hexKey(q, r));
  }

  /** **Die freien Felder am Rand** — dort darf gelegt werden. */
  openSlots(): Hex[] {
    const out = new Map<string, Hex>();
    for (const tile of this.tiles.values()) {
      for (let e = 0; e < 6; e++) {
        const n = neighbour(tile, e);
        const key = hexKey(n.q, n.r);
        if (!this.tiles.has(key)) out.set(key, n);
      }
    }
    return [...out.values()];
  }

  isOpen(q: number, r: number): boolean {
    if (this.tiles.has(hexKey(q, r))) return false;
    return HEX_DIRS.some((d) => this.tiles.has(hexKey(q + d.q, r + d.r)));
  }

  /**
   * **Ob die Kachel so liegen darf** — und wie gut sie passt. `null`: Ein
   * Fluss oder Weg stieße auf etwas anderes.
   */
  fit(
    spec: TileSpec,
    q: number,
    r: number,
    rot: number,
  ): { matched: number; neighbours: number } | null {
    let matched = 0;
    let neighbours = 0;
    for (let e = 0; e < 6; e++) {
      const n = neighbour({ q, r }, e);
      const other = this.at(n.q, n.r);
      if (!other) continue;
      neighbours++;
      const mine = edgeAt(spec, rot, e);
      const theirs = edgeAt(other.spec, other.rot, opposite(e));
      if ((hard(mine) || hard(theirs)) && mine !== theirs) return null;
      if (mine === theirs) matched++;
    }
    return { matched, neighbours };
  }

  /** **Die Kantenbilanz je Seite** — für die grünen und roten Striche an der Vorschau. */
  edgeMatches(spec: TileSpec, q: number, r: number, rot: number): Array<boolean | null> {
    return HEX_DIRS.map((_, e) => {
      const n = neighbour({ q, r }, e);
      const other = this.at(n.q, n.r);
      if (!other) return null;
      return edgeAt(spec, rot, e) === edgeAt(other.spec, other.rot, opposite(e));
    });
  }

  /** **Die Drehungen, die hier gehen**, die besten zuerst. */
  rotations(spec: TileSpec, q: number, r: number): number[] {
    const ok: Array<{ rot: number; matched: number }> = [];
    for (let rot = 0; rot < 6; rot++) {
      const fit = this.fit(spec, q, r, rot);
      if (fit) ok.push({ rot, matched: fit.matched });
    }
    // Stabil nach Güte: Gleich gute behalten ihre Reihenfolge im Uhrzeigersinn.
    return ok.sort((a, b) => b.matched - a.matched || a.rot - b.rot).map((o) => o.rot);
  }

  /** **Ob die Kachel irgendwo liegen kann** — sonst darf sie überall hin. */
  placeableAnywhere(spec: TileSpec): boolean {
    return this.openSlots().some((slot) => this.rotations(spec, slot.q, slot.r).length > 0);
  }

  /**
   * **Die Kachel aus der Hand legen.** `force` lässt sie auch gegen Fluss und
   * Weg liegen — nur, wenn sie nirgends passt (`placeableAnywhere`), damit die
   * Partie nicht an einer einzigen Kachel hängen bleibt.
   */
  place(q: number, r: number, rot: number, force = false): PlaceResult | null {
    const spec = this.hand;
    if (!spec || !this.isOpen(q, r)) return null;
    if (!this.fit(spec, q, r, rot) && !force) return null;
    const before = this.scoring().total;
    this.tiles.set(hexKey(q, r), { q, r, spec, rot });
    this.placed++;

    // Ein Auftrag aus einem Stand ohne Zahl bekommt sie jetzt.
    const quest = spec.quest;
    if (quest && quest.target === null) {
      quest.target = QUEST_TARGETS[Math.floor(this.random() * QUEST_TARGETS.length)]!;
    }
    const { done, failed } = this.checkQuests();
    this.hand = this.nextHand();
    return { points: this.scoring().total - before, questsDone: done, questsFailed: failed };
  }

  // --- Gebiete ------------------------------------------------------------------

  /**
   * **Die Gebiete** eines Geländes: Jede Kachel ist ein Knoten je Gelände, das
   * auf ihr liegt (alle Kanten desselben Geländes auf einer Kachel hängen
   * zusammen — eine Vereinfachung, die man an keiner Kachel sieht). Zwei
   * Knoten hängen zusammen, wenn sich ihre Kacheln an einer Kante dieses
   * Geländes berühren. Gezählt wird wie im Brettspiel in **Kacheln**.
   */
  /**
   * **Was ein freies Feld einem Gebiet noch bringen kann** — gemeldet: _„hier
   * wird ein Spielplan-Tile vorgeschlagen, wodurch aber zwei Missionen nie
   * möglich sein werden zu beenden."_ Ein Weg, dessen einziges offenes Ende in
   * ein Feld führt, das nur noch eine Sackgasse aufnehmen kann, wächst um
   * höchstens eins — und ein Feld, für das keine Kachel im Stapel passt (etwa
   * Weg und Fluss gemischt), um gar nichts.
   *
   * - `dead`: Keine Kachel passt auf die Kanten der Nachbarn.
   * - `end`: Eine passt, führt das Gelände aber zu keinem weiteren freien Feld.
   * - `grow`: Eine passt und führt es weiter.
   */
  slotFor(terrain: Terrain, q: number, r: number): 'dead' | 'end' | 'grow' {
    const need: Array<'w' | 'r' | 'l' | null> = [];
    for (let e = 0; e < 6; e++) {
      const n = neighbour({ q, r }, e);
      const other = this.at(n.q, n.r);
      if (!other) {
        need.push(null);
        continue;
      }
      const t = edgeAt(other.spec, other.rot, opposite(e));
      need.push(t === 'water' ? 'w' : t === 'road' ? 'r' : 'l');
    }
    const kind = terrain === 'water' ? 'w' : terrain === 'road' ? 'r' : 'l';
    let fits = false;
    for (const base of BASE_TILES) {
      if (base.weight <= 0) continue;
      for (let k = 0; k < 6; k++) {
        let ok = true;
        let onward = false;
        for (let e = 0; e < 6 && ok; e++) {
          const i = (e - k + 6) % 6;
          const has = base.water.includes(i) ? 'w' : base.road.includes(i) ? 'r' : 'l';
          const want = need[e];
          if (want) ok = has === want;
          else if (has === kind) onward = true;
        }
        if (!ok) continue;
        if (onward) return 'grow';
        fits = true;
      }
    }
    return fits ? 'end' : 'dead';
  }

  /**
   * `strict`: dazu, um wie viele Kacheln jedes Gebiet höchstens noch wachsen
   * kann (`room`, `slotFor`): unendlich, wenn eines seiner freien Felder es
   * weiterführen kann, sonst eins je freiem Feld, das eine Sackgasse aufnimmt.
   * Für die Frage, ob ein Auftrag noch zu schaffen ist; die Wertung der
   * Flaggen fragt ohne — dort zählt, was wirklich geschlossen ist.
   */
  private areas(terrain: Terrain, strict = false): Areas {
    const parent = new Map<string, string>();
    const find = (key: string): string => {
      let root = key;
      while (parent.get(root) !== root) root = parent.get(root)!;
      let at = key;
      while (parent.get(at) !== root) {
        const next = parent.get(at)!;
        parent.set(at, root);
        at = next;
      }
      return root;
    };
    for (const [key, tile] of this.tiles) {
      if (tile.spec.edges.includes(terrain)) parent.set(key, key);
    }
    for (const [key, tile] of this.tiles) {
      if (!parent.has(key)) continue;
      for (let e = 0; e < 3; e++) {
        if (edgeAt(tile.spec, tile.rot, e) !== terrain) continue;
        const n = neighbour(tile, e);
        const other = this.at(n.q, n.r);
        if (!other || edgeAt(other.spec, other.rot, opposite(e)) !== terrain) continue;
        const a = find(key);
        const b = find(hexKey(n.q, n.r));
        if (a !== b) parent.set(a, b);
      }
    }
    const size = new Map<string, number>();
    const open = new Map<string, boolean>();
    const slots = new Map<string, 'dead' | 'end' | 'grow'>();
    const grows = new Set<string>();
    const ends = new Map<string, Set<string>>();
    for (const [key, tile] of this.tiles) {
      if (!parent.has(key)) continue;
      const root = find(key);
      size.set(root, (size.get(root) ?? 0) + 1);
      for (let e = 0; e < 6; e++) {
        if (edgeAt(tile.spec, tile.rot, e) !== terrain) continue;
        const n = neighbour(tile, e);
        if (this.at(n.q, n.r)) continue;
        open.set(root, true);
        if (!strict) continue;
        const slot = hexKey(n.q, n.r);
        let kind = slots.get(slot);
        if (kind === undefined) slots.set(slot, (kind = this.slotFor(terrain, n.q, n.r)));
        if (kind === 'grow') grows.add(root);
        else if (kind === 'end') {
          let set = ends.get(root);
          if (!set) ends.set(root, (set = new Set()));
          set.add(slot);
        }
      }
    }
    const room = new Map<string, number>();
    if (strict) {
      for (const root of size.keys()) {
        room.set(root, grows.has(root) ? Infinity : (ends.get(root)?.size ?? 0));
      }
    }
    return { find, size, open, room };
  }

  /** **Wie groß das Gebiet ist**, zu dem das Gelände dieser Kachel gehört, in Kacheln. */
  /** **Die Kacheln eines Gebiets** — für die Ränder am Boden (`HexlandWorld.drawQuestRims`). */
  areaTiles(q: number, r: number, terrain: Terrain): PlacedTile[] {
    const key = hexKey(q, r);
    const tile = this.tiles.get(key);
    if (!tile || !tile.spec.edges.includes(terrain)) return [];
    const { find } = this.areas(terrain);
    const root = find(key);
    const out: PlacedTile[] = [];
    for (const [k, t] of this.tiles) {
      if (t.spec.edges.includes(terrain) && find(k) === root) out.push(t);
    }
    return out;
  }

  areaSize(q: number, r: number, terrain: Terrain): number {
    const key = hexKey(q, r);
    const tile = this.tiles.get(key);
    if (!tile || !tile.spec.edges.includes(terrain)) return 0;
    const { find, size } = this.areas(terrain);
    return size.get(find(key)) ?? 0;
  }

  /**
   * **Die offenen Aufträge nachsehen**: erfüllt, wenn ihr Gebiet genau so groß
   * ist wie ihre Zahl; verpasst, wenn es größer geworden ist.
   */
  private checkQuests(): { done: QuestTerrain[]; failed: QuestTerrain[] } {
    const done: QuestTerrain[] = [];
    const failed: QuestTerrain[] = [];
    const cache = new Map<Terrain, Areas>();
    for (const [key, tile] of this.tiles) {
      const quest = tile.spec.quest;
      if (!quest || quest.state !== 'open' || quest.target === null) continue;
      let areas = cache.get(quest.terrain);
      if (!areas) cache.set(quest.terrain, (areas = this.areas(quest.terrain)));
      const size = areas.size.get(areas.find(key)) ?? 0;
      // **Gewertet wird beim Legen**: Ist das Gebiet in diesem Augenblick
      // genau so groß, ist der Auftrag erfüllt und bleibt es — was danach
      // dazukommt, ist egal. Gewünscht: _„Ist der Auftrag erledigt und danach
      // kommt noch was hinzu, ist das egal. Es muss nur zum
      // Bewertungszeitpunkt erfüllt sein."_ Ist es schon größer, ohne je genau
      // gepasst zu haben, ist er verpasst.
      if (size === quest.target) {
        quest.state = 'done';
        done.push(quest.terrain);
      } else if (size > quest.target) {
        quest.state = 'failed';
        failed.push(quest.terrain);
      }
    }
    return { done, failed };
  }

  /**
   * **Was diese Lage für die Aufträge bedeutet** — für die Spielhilfen, die
   * Felder vorschlagen. Gerechnet wird, als läge die Kachel schon dort.
   *
   * - `progress`: um wie viele Kacheln offene Aufträge wachsen, ohne ihre
   *   Zahl schon zu erreichen;
   * - `completes`: wie viele dadurch genau ihre Zahl erreichen, und `points`,
   *   was sie zusammen bringen (ihre Zahlen);
   * - `breaks`: wie viele dadurch **unerfüllbar** werden — ihr Gebiet wird
   *   größer als die Zahl oder schließt sich ringsum, bevor die Zahl erreicht
   *   ist. Auch der eigene Auftrag der Kachel zählt mit;
   * - `closer`: wie nah die gewachsenen, noch nicht erfüllten Aufträge danach
   *   ihrer Zahl sind — je Auftrag Größe durch Zahl, aufsummiert. So zieht ein
   *   Auftrag, dem nur noch eine Kachel fehlt, stärker als einer, der eben
   *   erst angefangen hat.
   *
   * Gemeldet war, dass die Hilfe Felder empfahl, nach denen ein Auftrag nie
   * mehr zu schaffen war — sie zählte nur, ob ein Gebiet weiterwächst.
   */
  assess(
    spec: TileSpec,
    q: number,
    r: number,
    rot: number,
  ): {
    progress: number;
    completes: number;
    points: number;
    breaks: number;
    closer: number;
    ready: number;
  } {
    const key = hexKey(q, r);
    const before = this.questStates();
    const readyBefore = this.readiness();
    this.tiles.set(key, { q, r, spec, rot });
    const after = this.questStates();
    const readyAfter = this.readiness();
    this.tiles.delete(key);
    let progress = 0;
    let completes = 0;
    let points = 0;
    let breaks = 0;
    let closer = 0;
    for (const [id, now] of after) {
      const was = before.get(id);
      if (!now.possible && (was?.possible ?? true)) breaks++;
      if (!now.possible) continue;
      if (now.size === now.target && (was?.size ?? 0) !== now.target) {
        completes++;
        points += now.target;
        continue;
      }
      // Der eigene Auftrag der Kachel war vorher nicht da: Er zählt nur damit,
      // wie nah er gleich seiner Zahl ist — gewachsen ist er nicht.
      const grown = was ? Math.max(0, now.size - was.size) : 0;
      progress += grown;
      if ((grown > 0 || !was) && now.size < now.target) closer += now.size / now.target;
    }
    // **Vorbereitet**: was dazukommt, zählt, was verloren geht, zählt dagegen.
    // Und ein 3er-Wald, der für einen kommenden Wald 4 bereitsteht, wird nicht
    // zum 4er, nur weil auch ein Wald 5 kommen kann — kleiner bleiben lässt
    // beides offen, größer nicht mehr. Gemeldet: _„Hier ist es sinnvoller,
    // den Wald nicht zu einem 4er-Wald zu machen, sondern ihn als 3er-Wald zu
    // lassen … falls eine 4er-Wald-Mission kommt."_
    let ready = 0;
    const gained = new Set<string>();
    const lost = new Set<string>();
    for (const key of readyAfter)
      if (!readyBefore.has(key)) {
        ready++;
        gained.add(key.split(':')[0]!);
      }
    for (const key of readyBefore)
      if (!readyAfter.has(key)) {
        ready--;
        lost.add(key.split(':')[0]!);
      }
    // Ein Gebiet, das von „bereit für 4" zu „bereit für 5" wächst, gibt etwas her.
    for (const terrain of gained) if (lost.has(terrain)) ready -= 0.15;
    return { progress, completes, points, breaks, closer, ready };
  }

  /** Jeder offene Auftrag: Größe, Zahl und ob er noch zu schaffen ist. */
  private questStates(): Map<
    string,
    { size: number; target: number; possible: boolean; area: string }
  > {
    const out = new Map<
      string,
      { size: number; target: number; possible: boolean; area: string }
    >();
    const cache = new Map<Terrain, Areas>();
    const rows: Array<{ id: string; area: string; size: number; target: number; room: number }> =
      [];
    for (const [key, tile] of this.tiles) {
      const quest = tile.spec.quest;
      if (!quest || quest.state !== 'open' || quest.target === null) continue;
      let areas = cache.get(quest.terrain);
      if (!areas) cache.set(quest.terrain, (areas = this.areas(quest.terrain, true)));
      const root = areas.find(key);
      const area = `${quest.terrain}:${root}`;
      rows.push({
        id: key,
        area,
        size: areas.size.get(root) ?? 0,
        target: quest.target,
        room: areas.room.get(root) ?? 0,
      });
    }
    // Mehrere offene Aufträge in einem Gebiet sind **kein** Widerspruch, auch
    // mit verschiedenen Zahlen: Das Gebiet wächst weiter, erst wird der kleine
    // erfüllt, später der große. Gemeldet: _„Hier könnte der Weg bei dem 3er
    // statt beim 2er vorgeschlagen werden"_ — ein Weg-Auftrag 5 an einem Weg
    // 3 / 4 galt als unmöglich und wurde nie vorgeschlagen.
    for (const row of rows) {
      // Noch zu schaffen, solange das Gebiet weit genug wachsen kann (`room`).
      const possible =
        row.size === row.target || (row.size < row.target && row.size + row.room >= row.target);
      out.set(row.id, { size: row.size, target: row.target, possible, area: row.area });
    }
    return out;
  }
  /**
   * **Wie viele kommende Aufträge sofort fertig würden** — je Gelände und Zahl
   * im Auftragsstapel (`tasks`) zählt eins, wenn es ein offenes Gebiet ohne
   * Auftrag gibt, das genau eins kleiner ist: Eine Auftragskachel daneben
   * macht es dann auf einen Schlag genau richtig. Gewünscht: _„dass das Spiel
   * Städte bzw. Gebiete so weit vorbereitet, wenn z. B. noch klar ist, dass
   * eine 4er-Stadt als Mission kommen kann, dass man eine 3er-Stadt, falls
   * noch nicht existierend, mit freier Kachel nebenan so weit aufbaut"_.
   */
  private readiness(): Set<string> {
    const wanted = new Map<QuestTerrain, Set<number>>();
    for (const t of this.tasks) {
      let set = wanted.get(t.terrain);
      if (!set) wanted.set(t.terrain, (set = new Set()));
      set.add(t.target);
    }
    const ready = new Set<string>();
    for (const [terrain, targets] of wanted) {
      const areas = this.areas(terrain);
      // Gebiete, in denen schon ein offener Auftrag liegt, sind vergeben.
      const taken = new Set<string>();
      for (const [key, tile] of this.tiles) {
        if (tile.spec.quest?.state === 'open' && tile.spec.quest.terrain === terrain)
          taken.add(areas.find(key));
      }
      const sizes = new Set<number>();
      for (const [root, size] of areas.size) {
        if (!taken.has(root) && areas.open.get(root) === true) sizes.add(size);
      }
      for (const target of targets) if (sizes.has(target - 1)) ready.add(`${terrain}:${target}`);
    }
    return ready;
  }

  /** Wie groß das Gebiet eines Auftrags gerade ist — für das Schild über der Kachel. */
  questProgress(tile: PlacedTile): { size: number; target: number } | null {
    const quest = tile.spec.quest;
    if (!quest || quest.target === null || quest.state !== 'open') return null;
    return { size: this.areaSize(tile.q, tile.r, quest.terrain), target: quest.target };
  }

  /**
   * **Die Wertung wie im Brettspiel**: erfüllte Aufträge (ihre Zahl),
   * geschlossene Gebiete mit Flagge (ihre Kacheln, jedes einmal), der längste
   * Fluss und der längste Weg (je Kachel einen Punkt).
   */
  scoring(): Scoring {
    let tasks = 0;
    for (const tile of this.tiles.values()) {
      const quest = tile.spec.quest;
      if (quest?.state === 'done') tasks += quest.target ?? 0;
    }
    let flags = 0;
    for (const terrain of AREA_TERRAINS) {
      const areas = this.areas(terrain);
      const counted = new Set<string>();
      for (const [key, tile] of this.tiles) {
        if (tile.spec.flag !== terrain) continue;
        const root = areas.find(key);
        if (counted.has(root) || areas.open.get(root)) continue;
        counted.add(root);
        flags += areas.size.get(root) ?? 0;
      }
    }
    const longest = (terrain: Terrain): number => Math.max(0, ...this.areas(terrain).size.values());
    const river = longest('water');
    const road = longest('road');
    return { tasks, flags, river, road, total: tasks + flags + river + road };
  }

  // --- Speichern ------------------------------------------------------------------

  save(): string {
    return JSON.stringify({
      v: SAVE_VERSION,
      mode: this.mode,
      seed: this.seed,
      placed: this.placed,
      tiles: [...this.tiles.values()].map((t) => [t.q, t.r, t.rot, packSpec(t.spec)]),
      stack: this.stack.map(packSpec),
      hand: this.hand ? packSpec(this.hand) : null,
      // `-1`: unendlich (JSON kennt kein `Infinity`).
      tasks: Number.isFinite(this.tasksLeft) ? this.tasksLeft : -1,
      // Der Auftragsstapel selbst, Gelände und Zahl je Auftrag.
      deck: this.tasks.map((t) => [TERRAIN_CODE[t.terrain], t.target]),
    });
  }

  /**
   * **Einen Stand wieder einlesen** — `false`, wenn er nicht zu lesen ist; dann
   * bleibt das Brett, wie es war. Geworfen wird nie: Ein kaputter Speicher ist
   * ein neues Spiel und kein schwarzer Bildschirm.
   */
  load(text: string | null): boolean {
    if (!text) return false;
    try {
      const data = JSON.parse(text) as SaveData;
      if (data?.v !== SAVE_VERSION || !Array.isArray(data.tiles) || data.tiles.length === 0) {
        return false;
      }
      const tiles = new Map<string, PlacedTile>();
      for (const [q, r, rot, packed] of data.tiles) {
        const spec = unpackSpec(packed);
        if (!spec || !Number.isInteger(q) || !Number.isInteger(r)) return false;
        tiles.set(hexKey(q, r), { q, r, rot: ((rot % 6) + 6) % 6, spec });
      }
      const stack: TileSpec[] = [];
      for (const packed of data.stack ?? []) {
        const spec = unpackSpec(packed);
        if (spec) stack.push(spec);
      }
      this.tiles.clear();
      for (const [key, tile] of tiles) this.tiles.set(key, tile);
      this.stack = stack;
      this.hand = data.hand ? unpackSpec(data.hand) : null;
      this.mode = data.mode === 'creative' || data.mode === 'endless' ? data.mode : 'game';
      this.placed = Number(data.placed) || 0;
      this.seed = Number(data.seed) || 1;
      this.tasks = readDeck(data, this.mode, rng(this.seed + 104729));
      // Der Würfel geht weiter, wo der Stand war — nicht wieder von vorn.
      this.random = rng(this.seed + this.placed * 7919);
      return true;
    } catch {
      return false;
    }
  }
}

/** 2: Wertung wie im Brettspiel, Hand, Flaggen, Kreativ-Modus (Oktober 2026). */
const SAVE_VERSION = 2;

type PackedSpec = [
  string,
  string,
  number,
  ([QuestTerrain, number | null, Quest['state']] | 0)?,
  (AreaTerrain | 0)?,
];

interface SaveData {
  v: number;
  mode: HexMode;
  seed: number;
  placed: number;
  tiles: Array<[number, number, number, PackedSpec]>;
  stack: PackedSpec[];
  hand: PackedSpec | null;
  tasks?: number;
  deck?: Array<[string, number]>;
}

/**
 * **Den Auftragsstapel lesen.** Stände von vor dem Stapel mit Zahlen
 * (Oktober 2026) haben nur, wie viele noch kommen (`tasks`) oder gar nichts —
 * sie bekommen einen frisch gemischten Stapel in dieser Größe.
 */
function readDeck(data: SaveData, mode: HexMode, random: () => number): Task[] {
  if (mode === 'creative') return [];
  if (Array.isArray(data.deck)) {
    const deck: Task[] = [];
    for (const entry of data.deck) {
      const terrain = Array.isArray(entry) ? CODE_TERRAIN.get(entry[0]) : undefined;
      const target = Array.isArray(entry) ? Number(entry[1]) : NaN;
      if (!terrain || !QUEST_TERRAINS.includes(terrain as QuestTerrain)) continue;
      if (!TASK_TARGETS.includes(target)) continue;
      deck.push({ terrain: terrain as QuestTerrain, target });
    }
    return deck;
  }
  const count = typeof data.tasks === 'number' && data.tasks >= 0 ? data.tasks : QUEST_TILES;
  return taskDeck(random).slice(0, Math.min(count, QUEST_TILES));
}

const TERRAIN_CODE: Readonly<Record<Terrain, string>> = {
  grass: 'g',
  forest: 'f',
  house: 'h',
  field: 'a',
  water: 'w',
  road: 'r',
};
const CODE_TERRAIN = new Map(
  Object.entries(TERRAIN_CODE).map(([terrain, code]) => [code, terrain as Terrain]),
);

function packSpec(spec: TileSpec): PackedSpec {
  const edges = spec.edges.map((t) => TERRAIN_CODE[t]).join('');
  const q = spec.quest;
  return [spec.base, edges, spec.seed, q ? [q.terrain, q.target, q.state] : 0, spec.flag ?? 0];
}

function unpackSpec(packed: PackedSpec): TileSpec | null {
  if (!Array.isArray(packed) || typeof packed[1] !== 'string' || packed[1].length !== 6) {
    return null;
  }
  const edges = [...packed[1]].map((c) => CODE_TERRAIN.get(c));
  if (edges.some((t) => t === undefined) || !BASE_BY_ID.has(packed[0])) return null;
  const q = packed[3];
  const flag = packed[4];
  return {
    base: packed[0],
    edges: edges as Terrain[],
    seed: Number(packed[2]) || 0,
    ...(q && QUEST_TERRAINS.includes(q[0])
      ? { quest: { terrain: q[0], target: q[1] ?? null, state: q[2] ?? 'open' } }
      : {}),
    ...(flag && AREA_TERRAINS.includes(flag) ? { flag } : {}),
  };
}
