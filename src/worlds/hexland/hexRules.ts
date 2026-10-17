/**
 * **Die Regeln von Hexland** — ohne three.js, damit ein Test sie in einer
 * Millisekunde abläuft und die Welt nur noch zeichnet, was hier entschieden
 * wird.
 *
 * Gewünscht (Oktober 2026): _„Ich will mit den hex tiles ein Spiel bauen …
 * Baue sowas nach, dass ich in vr als auch von oben oder Handy eine Welt
 * aufbauen kann"_ — mit Bildern aus _Dorfromantik_ dazu. Das Spiel dahinter
 * ist genau das: Kacheln von einem Stapel nehmen, drehen, an die Landschaft
 * legen. Passende Kanten bringen Punkte, rundum passende Kacheln eine Kachel
 * zurück auf den Stapel, und manche Kacheln tragen eine Aufgabe („dieser Wald
 * soll 30 groß werden").
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

/** Gelände, die sich in Gebieten zählen lassen — und Aufgaben bekommen. */
export type AreaTerrain = 'forest' | 'house' | 'field';

export const AREA_TERRAINS: readonly AreaTerrain[] = ['forest', 'house', 'field'];

/** Wie das Gelände im Spiel heißt. */
export const TERRAIN_LABEL: Readonly<Record<Terrain, string>> = {
  grass: 'Wiese',
  forest: 'Wald',
  house: 'Dorf',
  field: 'Feld',
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
  /**
   * **Um wie viel sie angehoben wird**, in Einheiten des Regals. Alle Kacheln
   * haben ihre Oberkante bei 0 — nur der See (`hex_water`) liegt 0,2 tiefer
   * und stand als Stufe im Brett. Gewünscht: _„Die hex tiles sollen nicht
   * unterschiedlich hoch sein sondern eine grade Fläche ergeben"_.
   */
  readonly lift?: number;
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
    lift: 0.2,
  },
];

const BASE_BY_ID = new Map(BASE_TILES.map((base) => [base.id, base]));

export function baseTile(id: string): BaseTile {
  return BASE_BY_ID.get(id) ?? BASE_TILES[0]!;
}

// --- eine Kachel ------------------------------------------------------------

/** Eine Aufgabe auf einer Kachel: Das Gebiet soll mindestens so groß werden. */
export interface Quest {
  readonly terrain: AreaTerrain;
  /** Ab wie vielen Kanten im Gebiet sie erfüllt ist — gesetzt beim Legen. */
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
  if (base.road.length > 0) return { forest: 22, house: 40, field: 22, grass: 16 };
  if (base.water.length > 0) return { forest: 26, house: 20, field: 26, grass: 28 };
  return { forest: 34, house: 26, field: 22, grass: 18 };
}

/**
 * **Eine neue Kachel** — Grundkachel nach Gewicht, das freie Land in ein bis
 * drei zusammenhängende Stücke geteilt. Zusammenhängend, weil eine Kachel mit
 * Wald-Feld-Wald-Feld im Kreis aussieht wie Zufall und sich nirgends anlegen
 * lässt.
 */
export function drawTile(random: () => number, options: { landOnly?: boolean } = {}): TileSpec {
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
      pick([1, 2, 3], (n) => [3, 4.5, 2.5][n - 1]!, random()),
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
  const spec: TileSpec = { base: base.id, edges, seed: Math.floor(random() * 1e9) };
  const areas = AREA_TERRAINS.filter((t) => edges.includes(t));
  if (areas.length > 0 && random() < QUEST_CHANCE) {
    spec.quest = {
      terrain: areas[Math.floor(random() * areas.length)]!,
      target: null,
      state: 'open',
    };
  }
  return spec;
}

/** Wie oft eine Kachel mit einer Aufgabe kommt. */
export const QUEST_CHANCE = 0.16;
/** So viele Kacheln liegen am Anfang im Stapel. */
export const START_STACK = 40;
/** So viele bringt eine erfüllte Aufgabe zurück. */
export const QUEST_REWARD = 5;
/** Punkte je passender Kante, und obendrauf für eine rundum passende Kachel. */
export const EDGE_POINTS = 10;
export const PERFECT_POINTS = 60;

// --- das Brett ------------------------------------------------------------------

/** Was ein Legen gebracht hat — für die Meldung und die Anzeige. */
export interface PlaceResult {
  points: number;
  matched: number;
  neighbours: number;
  perfect: boolean;
  /** Kacheln, die zurück auf den Stapel kamen. */
  bonusTiles: number;
  questsDone: AreaTerrain[];
  questsFailed: AreaTerrain[];
}

/**
 * **Das Brett**: was liegt, was im Stapel ist, die Punkte. Alles, was gespeichert
 * wird, steht hier (`save`/`load`), und nichts davon kennt eine Szene.
 */
export class HexBoard {
  readonly tiles = new Map<string, PlacedTile>();
  stack: TileSpec[] = [];
  score = 0;
  placed = 0;
  /** Endlos legen: Der Stapel wird nie leer (für entspanntes Bauen). */
  endless = false;
  private random: () => number;
  private seed: number;

  constructor(seed = Date.now() % 1e9) {
    this.seed = seed;
    this.random = rng(seed);
  }

  /** **Ein neues Spiel** — eine Landkachel in der Mitte und ein voller Stapel. */
  reset(seed = Date.now() % 1e9): void {
    this.seed = seed;
    this.random = rng(seed);
    this.tiles.clear();
    this.score = 0;
    this.placed = 0;
    const first = drawTile(this.random, { landOnly: true });
    delete first.quest;
    this.tiles.set(hexKey(0, 0), { q: 0, r: 0, spec: first, rot: 0 });
    // Die ersten paar ohne Fluss und Weg — sonst verlangt die zweite Kachel
    // schon einen Fluss, bevor es überhaupt Land gibt.
    this.stack = [];
    for (let i = 0; i < START_STACK; i++) {
      this.stack.push(drawTile(this.random, { landOnly: i >= START_STACK - 3 }));
    }
  }

  /** Die Kachel, die als nächste gelegt wird — oben auf dem Stapel. */
  get current(): TileSpec | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1]! : null;
  }

  get over(): boolean {
    return this.current === null;
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
   * **Die oberste Kachel legen.** `force` lässt sie auch gegen Fluss und Weg
   * liegen — nur, wenn sie nirgends passt (`placeableAnywhere`), damit das
   * Spiel nicht an einer einzigen Kachel hängen bleibt.
   */
  place(q: number, r: number, rot: number, force = false): PlaceResult | null {
    const spec = this.current;
    if (!spec || !this.isOpen(q, r)) return null;
    const fit = this.fit(spec, q, r, rot);
    if (!fit && !force) return null;
    const matched = fit?.matched ?? 0;
    const neighbours = fit?.neighbours ?? 0;
    this.stack.pop();
    this.tiles.set(hexKey(q, r), { q, r, spec, rot });
    this.placed++;

    const perfect = neighbours === 6 && matched === 6;
    let points = matched * EDGE_POINTS + (perfect ? PERFECT_POINTS : 0);
    let bonusTiles = perfect ? 1 : 0;

    // Die Aufgabe dieser Kachel bekommt ihr Ziel: ein Stück über das, was schon da ist.
    if (spec.quest && spec.quest.target === null) {
      const now = this.areaSize(q, r, spec.quest.terrain);
      spec.quest.target = Math.max(6, Math.ceil((now + 6 + this.random() * 12) / 5) * 5);
    }
    const { done, failed } = this.checkQuests();
    for (const _ of done) {
      bonusTiles += QUEST_REWARD;
      points += 50;
    }
    this.score += points;
    for (let i = 0; i < bonusTiles; i++) this.pushTile();
    if (this.endless && this.stack.length < 3) {
      while (this.stack.length < 3) this.pushTile();
    }
    return {
      points,
      matched,
      neighbours,
      perfect,
      bonusTiles,
      questsDone: done,
      questsFailed: failed,
    };
  }

  /** Eine frische Kachel **unter** die oberste, damit die Vorschau nicht springt. */
  private pushTile(): void {
    const tile = drawTile(this.random);
    this.stack.splice(Math.max(0, this.stack.length - 1), 0, tile);
  }

  /** **Endlos legen an oder aus** — an heißt: Es liegen immer ein paar im Stapel. */
  setEndless(on: boolean): void {
    this.endless = on;
    if (on) while (this.stack.length < 3) this.pushTile();
  }

  /** **Die oberste Kachel nach unten** — wer sie gerade nirgends hinlegen mag. */
  skip(): void {
    const top = this.stack.pop();
    if (top) this.stack.unshift(top);
  }

  // --- Gebiete ------------------------------------------------------------------

  /**
   * **Die Gebiete** eines Geländes: Jede Kachel ist ein Knoten je Gelände, das
   * auf ihr liegt (alle Kanten desselben Geländes auf einer Kachel hängen
   * zusammen — eine Vereinfachung, die man an keiner Kachel sieht). Zwei
   * Knoten hängen zusammen, wenn ihre Kachel sich an einer Kante dieses
   * Geländes berühren. Die Größe eines Gebiets ist die Zahl seiner Kanten.
   */
  private areas(terrain: Terrain): {
    find: (key: string) => string;
    size: Map<string, number>;
    open: Map<string, boolean>;
  } {
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
      for (let e = 0; e < 6; e++) {
        if (edgeAt(tile.spec, tile.rot, e) === terrain) {
          parent.set(key, key);
          break;
        }
      }
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
    for (const [key, tile] of this.tiles) {
      if (!parent.has(key)) continue;
      const root = find(key);
      for (let e = 0; e < 6; e++) {
        if (edgeAt(tile.spec, tile.rot, e) !== terrain) continue;
        size.set(root, (size.get(root) ?? 0) + 1);
        const n = neighbour(tile, e);
        if (!this.at(n.q, n.r)) open.set(root, true);
      }
    }
    return { find, size, open };
  }

  /** **Wie groß das Gebiet ist**, zu dem das Gelände dieser Kachel gehört. */
  areaSize(q: number, r: number, terrain: Terrain): number {
    const key = hexKey(q, r);
    const tile = this.tiles.get(key);
    if (!tile || !tile.spec.edges.includes(terrain)) return 0;
    const { find, size } = this.areas(terrain);
    return size.get(find(key)) ?? 0;
  }

  /**
   * **Die offenen Aufgaben nachsehen**: erfüllt, wenn ihr Gebiet groß genug ist;
   * gescheitert, wenn es ringsum zu ist und nicht mehr wachsen kann.
   */
  private checkQuests(): { done: AreaTerrain[]; failed: AreaTerrain[] } {
    const done: AreaTerrain[] = [];
    const failed: AreaTerrain[] = [];
    const cache = new Map<Terrain, ReturnType<HexBoard['areas']>>();
    for (const [key, tile] of this.tiles) {
      const quest = tile.spec.quest;
      if (!quest || quest.state !== 'open' || quest.target === null) continue;
      let areas = cache.get(quest.terrain);
      if (!areas) cache.set(quest.terrain, (areas = this.areas(quest.terrain)));
      const root = areas.find(key);
      const size = areas.size.get(root) ?? 0;
      if (size >= quest.target) {
        quest.state = 'done';
        done.push(quest.terrain);
      } else if (!areas.open.get(root)) {
        quest.state = 'failed';
        failed.push(quest.terrain);
      }
    }
    return { done, failed };
  }

  /** Wie viel einer Aufgabe noch fehlt — für das Schild über der Kachel. */
  questLeft(tile: PlacedTile): number | null {
    const quest = tile.spec.quest;
    if (!quest || quest.target === null || quest.state !== 'open') return null;
    return Math.max(0, quest.target - this.areaSize(tile.q, tile.r, quest.terrain));
  }

  // --- Speichern ------------------------------------------------------------------

  save(): string {
    return JSON.stringify({
      v: SAVE_VERSION,
      seed: this.seed,
      score: this.score,
      placed: this.placed,
      endless: this.endless,
      tiles: [...this.tiles.values()].map((t) => [t.q, t.r, t.rot, packSpec(t.spec)]),
      stack: this.stack.map(packSpec),
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
      this.score = Number(data.score) || 0;
      this.placed = Number(data.placed) || 0;
      this.endless = data.endless === true;
      this.seed = Number(data.seed) || 1;
      // Der Würfel geht weiter, wo der Stand war — nicht wieder von vorn.
      this.random = rng(this.seed + this.placed * 7919);
      return true;
    } catch {
      return false;
    }
  }
}

const SAVE_VERSION = 1;

type PackedSpec = [string, string, number, [AreaTerrain, number | null, Quest['state']]?];

interface SaveData {
  v: number;
  seed: number;
  score: number;
  placed: number;
  endless: boolean;
  tiles: Array<[number, number, number, PackedSpec]>;
  stack: PackedSpec[];
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
  return q
    ? [spec.base, edges, spec.seed, [q.terrain, q.target, q.state]]
    : [spec.base, edges, spec.seed];
}

function unpackSpec(packed: PackedSpec): TileSpec | null {
  if (!Array.isArray(packed) || typeof packed[1] !== 'string' || packed[1].length !== 6)
    return null;
  const edges = [...packed[1]].map((c) => CODE_TERRAIN.get(c));
  if (edges.some((t) => t === undefined) || !BASE_BY_ID.has(packed[0])) return null;
  const spec: TileSpec = {
    base: packed[0],
    edges: edges as Terrain[],
    seed: Number(packed[2]) || 0,
  };
  const q = packed[3];
  if (q && AREA_TERRAINS.includes(q[0])) {
    spec.quest = { terrain: q[0], target: q[1] ?? null, state: q[2] ?? 'open' };
  }
  return spec;
}
