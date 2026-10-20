import {
  baseTile,
  hexKey,
  neighbour,
  opposite,
  rng,
  type PlacedTile,
  type Terrain,
  type TileSpec,
} from './hexRules';

/**
 * **Was auf einer Kachel steht** — Bäume, Häuser, Felder, alles aus dem Regal
 * (`medieval-hexagon/decoration`, `buildings`). Ohne three.js, wie die Regeln:
 * Hier steht nur, welches Modell wohin kommt, in den Maßen der Kachel aus dem
 * Regal (Kante zu Kante 2, Oberkante bei 0), **ungedreht**. Gedreht, gerückt
 * und vergrößert wird beim Zeichnen (`hexView.ts`).
 *
 * **Jede Kante hat ihr Stück Kachel**: das Dreieck zwischen Mitte und Kante.
 * Liegt an einer Kante Wald, stehen in diesem Dreieck Bäume; liegt Dorf dort,
 * zwei Häuser; Feld ist ein Kornfeld. So sieht man an der Kachel, was an
 * welcher Kante liegt — und damit, wo sie passt. Ist eine Landkachel ganz aus
 * einem Gelände, bekommt sie das große Stück dafür: viele Baumgruppen, ein
 * ganzes Feld mit Mühle, ein Dorf mit Kirche in der Mitte.
 */
export interface Dress {
  /** Die Datei unter `models/kaykit/medieval-hexagon/`. */
  readonly model: string;
  readonly x: number;
  readonly z: number;
  /** Gieren, Bogenmaß, wie `rotation.y`. */
  readonly yaw: number;
  readonly scale: number;
}

const HOUSE_COLOURS = ['red', 'red', 'red', 'blue', 'yellow', 'red', 'green'] as const;

/**
 * **Was auf der Wiese steht** — kleine Büsche (_Forest Nature_) und ein paar
 * kleine Steine; **keine Bäume**: Bäume heißen Wald. Gemeldet erst _„Bitte bei
 * den hex Feldern die z.B. kein Wald sind auch bitte keine Bäume
 * platzieren."_, dann waren die Blumen _„leider hässlich"_; gewählt aus fünf
 * Varianten: _„B bitte. und etwas kleiner. Auch gerne ein paar steine, aber
 * kleiner?"_ Die Büsche kommen aus einem anderen Paket des Regals (`/` vorn,
 * `HexModels.load`), in den Farben `BUSH_COLOURS`.
 */
const BUSH_SHAPES = ['1_B', '1_C', '1_D', '1_E'] as const;
const BUSH_COLOURS = ['1'] as const;
const bushModel = (shape: string, colour: string): string =>
  `/forest-nature/color${colour}/Bush_${shape}_Color${colour}.glb`;
const ROCKS = ['rock_single_A', 'rock_single_C', 'rock_single_D', 'rock_single_E'] as const;
const MEADOW: readonly string[] = BUSH_SHAPES.flatMap((shape) =>
  BUSH_COLOURS.map((colour) => bushModel(shape, colour)),
);

/** Ein Fleck Wiese um (`x`, `z`): ein, zwei kleine Büsche, oft ein kleiner Stein daneben. */
function meadow(out: Dress[], random: () => number, x: number, z: number, spread = 0.12): void {
  const near = (): number => (random() - 0.5) * spread * 2;
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
  const bushes = 1 + (random() < MEADOW_PAIR ? 1 : 0);
  for (let i = 0; i < bushes; i++) {
    out.push({
      model: bushModel(pick(BUSH_SHAPES), pick(BUSH_COLOURS)),
      x: x + near(),
      z: z + near(),
      yaw: random() * Math.PI * 2,
      scale: BUSH_SCALE * (0.8 + random() * 0.4),
    });
  }
  for (let i = 0; i < MEADOW_ROCKS; i++) {
    if (random() >= MEADOW_ROCK_CHANCE) continue;
    out.push({
      model: `decoration/nature/${pick(ROCKS)}.glb`,
      x: x + near() * 1.6,
      z: z + near() * 1.6,
      yaw: random() * Math.PI * 2,
      scale: ROCK_SCALE * (0.7 + random() * 0.6),
    });
  }
}

const BUSH_SCALE = 0.3;
const ROCK_SCALE = 0.6;
const MEADOW_PAIR = 0.5;
const MEADOW_ROCKS = 2;
const MEADOW_ROCK_CHANCE = 0.5;

/** Alle Modelle, die eine Kachel tragen kann — zum Vorladen. */
export function dressingModels(): string[] {
  const out = new Set<string>();
  for (const colour of new Set(HOUSE_COLOURS)) {
    for (const kind of ['home_A', 'home_B', 'church', 'well', 'tavern', 'market', 'windmill']) {
      out.add(`buildings/${colour}/building_${kind}_${colour}.glb`);
    }
  }
  for (const name of [
    'trees_A_small',
    'trees_B_small',
    'trees_A_medium',
    'trees_B_medium',
    'tree_single_A',
    'tree_single_B',
    'rock_single_A',
    'rock_single_C',
    'waterlily_A',
    'waterplant_B',
  ]) {
    out.add(`decoration/nature/${name}.glb`);
  }
  for (const model of MEADOW) out.add(model);
  out.add('decoration/props/haybale.glb');
  out.add('buildings/neutral/building_grain.glb');
  out.add('decoration/props/boat.glb');
  for (const colour of Object.values(FLAG_COLOUR)) out.add(`decoration/props/flag_${colour}.glb`);
  return [...out];
}

/** Die Farbe der Flagge je Gelände: Wald grün, Dorf rot, Feld gelb. */
const FLAG_COLOUR = { forest: 'green', house: 'red', field: 'yellow' } as const;

/** **Die Ausstattung einer Kachel** — immer dieselbe für dieselbe Kachel (`spec.seed`). */
export function dressTile(spec: TileSpec): Dress[] {
  const out = dressLand(spec);
  // **Die Flagge** (`TileSpec.flag`) steht im Stück ihres Geländes, ein Stück
  // zur Mitte hin — damit man sieht, welches Gebiet sie meint.
  if (spec.flag) {
    const edge = Math.max(0, spec.edges.indexOf(spec.flag));
    const a = edge * (Math.PI / 3);
    out.push({
      model: `decoration/props/flag_${FLAG_COLOUR[spec.flag]}.glb`,
      x: Math.cos(a) * 0.32,
      z: Math.sin(a) * 0.32,
      yaw: -a,
      scale: 1.6,
    });
  }
  return out;
}

function dressLand(spec: TileSpec): Dress[] {
  const random = rng(spec.seed);
  const base = baseTile(spec.base);
  const out: Dress[] = [];
  const pickOne = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
  const colour = (): string => pickOne(HOUSE_COLOURS);
  const building = (kind: string): string => {
    const c = colour();
    return `buildings/${c}/building_${kind}_${c}.glb`;
  };
  const turn = (): number => Math.floor(random() * 6) * (Math.PI / 3);

  const land = base.id === 'land';
  const kinds = new Set(spec.edges);
  if (land && kinds.size === 1) {
    whole(spec.edges[0]!, out, random, building, turn);
    return out;
  }

  // Auf Fluss und Weg bleibt die Mitte frei, die Stücke rücken an den Rand.
  const busy = !land;
  const reach = busy ? 0.66 : 0.6;
  const shrink = busy ? 0.85 : 1;
  for (let e = 0; e < 6; e++) {
    const terrain = spec.edges[e]!;
    const a = e * (Math.PI / 3);
    const cx = Math.cos(a) * reach;
    const cz = Math.sin(a) * reach;
    // Quer zur Kante, für zwei Dinge nebeneinander.
    const tx = -Math.sin(a);
    const tz = Math.cos(a);
    const jitter = (): number => (random() - 0.5) * 0.12;
    switch (terrain) {
      case 'forest':
        out.push({
          model: `decoration/nature/${pickOne(['trees_A_small', 'trees_B_small', 'trees_A_medium'])}.glb`,
          x: cx + jitter(),
          z: cz + jitter(),
          yaw: random() * Math.PI * 2,
          scale: 0.46 * shrink,
        });
        break;
      case 'house':
        for (const side of [-1, 1]) {
          out.push({
            model: building(random() < 0.6 ? 'home_A' : 'home_B'),
            x: cx + tx * side * 0.24 * shrink + jitter(),
            z: cz + tz * side * 0.24 * shrink + jitter(),
            // Die Häuser schauen grob zur Mitte, nicht alle gleich.
            yaw: -a + Math.PI / 2 + (random() - 0.5) * 0.9,
            scale: 0.48 * shrink,
          });
        }
        break;
      case 'field':
        // **Das Kornfeld mit Höhe** auf seinem braunen Acker (`groundPatches`):
        // kleiner als sein Stück, damit der Rand ringsum zu sehen bleibt.
        out.push({
          model: 'buildings/neutral/building_grain.glb',
          x: cx * 0.97,
          z: cz * 0.97,
          yaw: -a,
          scale: 0.33 * shrink,
        });
        if (random() < 0.25) {
          out.push({
            model: 'decoration/props/haybale.glb',
            x: cx * 1.25 + jitter(),
            z: cz * 1.25 + jitter(),
            yaw: random() * Math.PI,
            scale: 0.8,
          });
        }
        break;
      case 'grass':
        if (random() < 0.55) meadow(out, random, cx + jitter(), cz + jitter(), 0.1);
        break;
      case 'water':
        if (base.id === 'lake' && random() < 0.4) {
          out.push({
            model: 'decoration/nature/waterlily_A.glb',
            x: cx * 0.9,
            z: cz * 0.9,
            yaw: random() * 6,
            scale: 1.4,
          });
        }
        break;
      case 'road':
        break;
    }
  }

  // Die Mitte einer Landkachel: was dort am meisten liegt, bekommt sie.
  if (land) {
    const count = (t: Terrain): number => spec.edges.filter((e) => e === t).length;
    if (count('house') >= 3) {
      out.push({
        model: building(pickOne(['well', 'home_B', 'tavern'])),
        x: 0,
        z: 0,
        yaw: turn(),
        scale: 0.5,
      });
    } else if (count('field') >= 3 && random() < 0.6) {
      out.push({ model: building('windmill'), x: 0, z: 0, yaw: turn(), scale: 0.5 });
    } else if (count('forest') >= 3) {
      out.push({
        model: `decoration/nature/${pickOne(['tree_single_A', 'tree_single_B'])}.glb`,
        x: 0,
        z: 0,
        yaw: random() * 6,
        scale: 0.7,
      });
    }
  }
  if (base.id === 'lake' && random() < 0.5) {
    out.push({
      model: 'decoration/props/boat.glb',
      x: 0.15,
      z: -0.1,
      yaw: random() * 6,
      scale: 1.3,
    });
  }
  return out;
}

/** **Eine Kachel aus einem Guss** — ganz Wald, ganz Feld, ganz Dorf, ganz Wiese. */
function whole(
  terrain: Terrain,
  out: Dress[],
  random: () => number,
  building: (kind: string) => string,
  turn: () => number,
): void {
  switch (terrain) {
    case 'forest':
      // **Viele kleine Gruppen statt eines großen Waldes** — gewünscht: _„Die
      // Wälder, wo komplett Wald ist, sollen nicht so groß sein, sondern lieber
      // viele kleine wie bei den anderen auch."_ Eine Gruppe je Kante wie auf
      // den gemischten Kacheln, dazu eine in der Mitte.
      for (let e = 0; e < 7; e++) {
        const a = e * (Math.PI / 3) + (random() - 0.5) * 0.3;
        const d = e === 6 ? 0 : 0.6 + (random() - 0.5) * 0.1;
        out.push({
          model: `decoration/nature/${['trees_A_small', 'trees_B_small', 'trees_A_medium'][Math.floor(random() * 3)]}.glb`,
          x: Math.cos(a) * d,
          z: Math.sin(a) * d,
          yaw: random() * Math.PI * 2,
          scale: 0.44 + random() * 0.06,
        });
      }
      return;
    case 'field':
      out.push({ model: 'buildings/neutral/building_grain.glb', x: 0, z: 0, yaw: 0, scale: 0.84 });
      if (random() < 0.6)
        out.push({ model: building('windmill'), x: 0.2, z: 0.1, yaw: turn(), scale: 0.55 });
      return;
    case 'house':
      for (let e = 0; e < 6; e++) {
        const a = e * (Math.PI / 3) + Math.PI / 6;
        out.push({
          model: building(random() < 0.55 ? 'home_A' : 'home_B'),
          x: Math.cos(a) * 0.66,
          z: Math.sin(a) * 0.66,
          yaw: -a + Math.PI / 2,
          scale: 0.46,
        });
      }
      out.push({
        model: building(random() < 0.5 ? 'church' : 'market'),
        x: 0,
        z: 0,
        yaw: turn(),
        scale: 0.5,
      });
      return;
    default:
      // Ganz Wiese: drei, vier Flecken Blumen, keine Bäume.
      for (let i = 0, n = 3 + Math.floor(random() * 2); i < n; i++) {
        const a = random() * Math.PI * 2;
        const d = 0.2 + random() * 0.45;
        meadow(out, random, Math.cos(a) * d, Math.sin(a) * d);
      }
  }
}

/** Gelände, die einen eigenen Boden bekommen (`groundPatches`). */
export type GroundKind = 'house' | 'forest' | 'field';

/**
 * Ein Stück Boden: ab welcher Kante, über wie viele, welches Gelände — und
 * ob nur der äußere Ring einer einzelnen Kante (Fluss- und Wegkacheln).
 */
export interface GroundPatch {
  readonly edge: number;
  readonly length: number;
  readonly kind: GroundKind;
  readonly ring: boolean;
}

/**
 * **Der Boden unter den Gebieten einer Kachel** — gewünscht erst: _„unter
 * Dörfern gerne auch den braunen Boden … bei Wald ein leicht dunklerer Boden"_,
 * dann: _„Die Grenzen in das Innere des Feldes müssen nicht so scharf kantig
 * sein, sondern können leicht gerundet sein … eine scharfe Kante wie jetzt am
 * äußeren Rand des Hex-Tiles, aber innen gerne weicher"_.
 *
 * Deshalb nicht mehr ein Dreieck je Kante, sondern **ein Stück je Lauf**:
 * nebeneinanderliegende Kanten desselben Geländes sind eine Fläche, außen an
 * der Kachelkante gerade, innen eine Kurve durch die Mitte
 * (`hexView.runGeometry`). Auf Fluss-, Weg- und Brückenkacheln je Kante nur der
 * äußere Ring, damit das Wasser in der Mitte sichtbar bleibt; Ufer und See
 * bekommen keinen, ihr Uferbogen liefe sonst unter einen geraden Rand.
 */
export function groundPatches(spec: TileSpec): GroundPatch[] {
  const base = baseTile(spec.base);
  if (base.id === 'lake' || base.id.startsWith('coast')) return [];
  const ground = (t: Terrain): GroundKind | null =>
    t === 'house' || t === 'forest' || t === 'field' ? t : null;
  if (base.id !== 'land') {
    const out: GroundPatch[] = [];
    spec.edges.forEach((terrain, edge) => {
      const kind = ground(terrain);
      if (kind) out.push({ edge, length: 1, kind, ring: true });
    });
    return out;
  }
  const edges = spec.edges;
  const first = ground(edges[0]!);
  if (edges.every((t) => t === edges[0])) {
    return first ? [{ edge: 0, length: 6, kind: first, ring: false }] : [];
  }
  // Am Anfang eines Laufs beginnen: dort, wo die Kante davor anders ist.
  let start = 0;
  while (edges[(start + 5) % 6] === edges[start]) start++;
  const out: GroundPatch[] = [];
  for (let i = 0; i < 6;) {
    const edge = (start + i) % 6;
    let length = 1;
    while (i + length < 6 && edges[(edge + length) % 6] === edges[edge]) length++;
    const kind = ground(edges[edge]!);
    if (kind) out.push({ edge, length, kind, ring: false });
    i += length;
  }
  return out;
}

/**
 * **Wie das Wasser einer Flusskachel fließt** — in den Kanten der Kachel
 * selbst (ungedreht, wie ihr Modell): aus welchen Armen es zur Mitte kommt
 * (`into`, Bitmaske), aus welchen es hinausläuft (`out`), und wie weit die
 * Mitte den Fluss hinab liegt (`centre`, in Halbmessern der Kachel: von Kante
 * zu Mitte 1). So laufen die Wellen im Shader (`hexAnimate.WATER_FRAGMENT`)
 * ohne Sprung von Kachel zu Kachel weiter, und die Pfeile (`HexBoardView`)
 * zeigen dieselbe Richtung.
 */
export interface RiverFlow {
  readonly into: number;
  readonly out: number;
  readonly centre: number;
}

/** Fluss- und Brückenkacheln — Seen und Ufer stehen still. */
function flowing(tile: PlacedTile): boolean {
  const id = baseTile(tile.spec.base).id;
  return id.startsWith('river') || id.startsWith('crossing');
}

/** Die Wasserkanten einer Kachel, auf dem Brett (gedreht). */
function waterEdges(tile: PlacedTile): number[] {
  const out: number[] = [];
  tile.spec.edges.forEach((t, e) => {
    if (t === 'water') out.push((e + tile.rot) % 6);
  });
  return out;
}

/** Richtung je Wasserkante auf dem Brett: `true` hinaus, `false` herein. */
type Arms = Map<number, boolean>;

/**
 * **Die Richtung jedes Flusses**, Kachel für Kachel in der Reihenfolge, in der
 * sie gelegt wurden — so, wie das Wasser beim Legen weiterliefe. Gewünscht:
 * _„dass ein Fluss eine Wasserrichtung hat, und wenn es mit dem nächsten Teil
 * verbunden ist, fließt das Wasser dort weiter und trennt sich. … Zwei
 * Flüsse, die aufeinander fließen und dann verbunden werden, fließen danach
 * in eine gemeinsame Richtung, einer muss sich umkehren (der kürzere)."_
 *
 * - Eine Kachel allein: herein aus dem Arm am weitesten im Süden (+z), alle
 *   anderen hinaus — gabelt sie, trennt sich das Wasser.
 * - Ein Arm an einem Nachbarfluss übernimmt dessen Richtung: Läuft es dort
 *   heraus, kommt es hier herein, und umgekehrt.
 * - Freie Arme (offen oder an See und Ufer): hinaus, wenn Wasser hereinkommt,
 *   sonst herein.
 * - Kommt so nur Wasser herein und kann nirgends hinaus (oder umgekehrt),
 *   dreht sich der **kürzere** der verbundenen Flüsse um.
 *
 * Ohne eigenes Feld im Spielstand: Die Reihenfolge der Kacheln ist dort
 * gespeichert, und dieselbe Reihenfolge gibt dieselben Richtungen.
 */
export function riverFlow(tiles: ReadonlyMap<string, PlacedTile>): Map<string, RiverFlow> {
  const arms = new Map<string, Arms>();
  const at = (tile: PlacedTile, edge: number): string => {
    const n = neighbour(tile, edge);
    return hexKey(n.q, n.r);
  };
  // Der Fluss nebenan an dieser Kante — schon gerichtet und mit Wasser zurück.
  const across = (tile: PlacedTile, edge: number): Arms | null => {
    const theirs = arms.get(at(tile, edge));
    return theirs?.has(opposite(edge)) ? theirs : null;
  };
  // Alle Kacheln eines verbundenen Flusses.
  const system = (key: string): string[] => {
    const seen = new Set([key]);
    const walk = [key];
    while (walk.length) {
      const k = walk.pop()!;
      const tile = tiles.get(k)!;
      for (const e of arms.get(k)!.keys()) {
        const other = at(tile, e);
        if (!seen.has(other) && arms.get(other)?.has(opposite(e))) {
          seen.add(other);
          walk.push(other);
        }
      }
    }
    return [...seen];
  };
  const reverse = (keys: string[]): void => {
    for (const k of keys) for (const [e, out] of arms.get(k)!) arms.get(k)!.set(e, !out);
  };

  for (const [key, tile] of tiles) {
    if (!flowing(tile)) continue;
    const edges = waterEdges(tile);
    const mine: Arms = new Map();
    const linked: number[] = [];
    for (const e of edges) {
      const theirs = across(tile, e);
      if (!theirs) continue;
      linked.push(e);
      mine.set(e, !theirs.get(opposite(e)));
    }
    const free = edges.filter((e) => !mine.has(e));
    const ins = [...mine.values()].filter((out) => !out).length;
    const outs = mine.size - ins;
    if (mine.size === 0) {
      // Allein: herein von Süden.
      const south = edges.reduce((a, b) => (edgeZ(b) > edgeZ(a) ? b : a));
      for (const e of edges) mine.set(e, e !== south);
    } else if (free.length > 0) {
      for (const e of free) mine.set(e, ins > 0);
    } else if (ins === 0 || outs === 0) {
      // Alles herein oder alles hinaus: Der kürzeste Nachbarfluss kehrt um.
      const systems = linked.map((e) => system(at(tile, e)));
      const shortest = systems.reduce((a, b) => (b.length < a.length ? b : a));
      reverse(shortest);
      for (const e of linked) mine.set(e, !across(tile, e)!.get(opposite(e)));
    }
    arms.set(key, mine);
  }

  // Wie weit jede Mitte den Fluss hinab liegt — von irgendeiner Kachel je Fluss aus gezählt.
  const centre = new Map<string, number>();
  for (const key of arms.keys()) {
    if (centre.has(key)) continue;
    centre.set(key, 0);
    const walk = [key];
    while (walk.length) {
      const k = walk.pop()!;
      const tile = tiles.get(k)!;
      for (const [e, out] of arms.get(k)!) {
        const other = at(tile, e);
        if (centre.has(other) || !arms.get(other)?.has(opposite(e))) continue;
        centre.set(other, centre.get(k)! + (out ? 2 : -2));
        walk.push(other);
      }
    }
  }

  const out = new Map<string, RiverFlow>();
  for (const [key, mine] of arms) {
    const tile = tiles.get(key)!;
    // In die Kanten des Modells zurückdrehen.
    let into = 0;
    let away = 0;
    for (const [e, isOut] of mine) {
      const bit = 1 << ((e - tile.rot + 6) % 6);
      if (isOut) away |= bit;
      else into |= bit;
    }
    out.set(key, { into, out: away, centre: centre.get(key)! });
  }
  return out;
}

/** Wie weit eine Kante nach +z (Süden im Bild von oben) zeigt. */
function edgeZ(edge: number): number {
  return Math.sin((edge * Math.PI) / 3);
}
