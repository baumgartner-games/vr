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
      case 'grass': {
        const roll = random();
        if (roll < 0.35) {
          out.push({
            model: `decoration/nature/${pickOne(['tree_single_A', 'tree_single_B'])}.glb`,
            x: cx + jitter() * 2,
            z: cz + jitter() * 2,
            yaw: random() * Math.PI * 2,
            scale: 0.55,
          });
        } else if (roll < 0.5) {
          out.push({
            model: `decoration/nature/${pickOne(['rock_single_A', 'rock_single_C'])}.glb`,
            x: cx + jitter() * 2,
            z: cz + jitter() * 2,
            yaw: random() * Math.PI * 2,
            scale: 1,
          });
        }
        break;
      }
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
      for (let i = 0; i < 3; i++) {
        const a = random() * Math.PI * 2;
        const d = 0.3 + random() * 0.4;
        out.push({
          model: `decoration/nature/${random() < 0.5 ? 'tree_single_A' : 'tree_single_B'}.glb`,
          x: Math.cos(a) * d,
          z: Math.sin(a) * d,
          yaw: random() * 6,
          scale: 0.55,
        });
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
 * ohne Sprung von Kachel zu Kachel weiter.
 *
 * Gemeldet war: _„Das Wasser fließt leider aktuell einfach irgendwie random
 * umher, statt entlang des Wasserverlaufs."_
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

/**
 * **Die Richtung jedes Flusses auf dem Brett.** Ein Fluss beginnt an einem
 * offenen Ende, möglichst weit weg von einem See, und fließt von dort durch
 * jede verbundene Kachel weiter — in Seen und Ufer hinein, an offenen Enden
 * vom Brett hinunter. Bei Gabelungen teilt er sich.
 */
export function riverFlow(tiles: ReadonlyMap<string, PlacedTile>): Map<string, RiverFlow> {
  const river = new Map<string, PlacedTile>();
  for (const [key, tile] of tiles) if (flowing(tile)) river.set(key, tile);
  // Wohin eine Wasserkante führt: zu einer Flusskachel, in stehendes Wasser oder ins Offene.
  const across = (tile: PlacedTile, edge: number): 'river' | 'lake' | 'open' => {
    const n = neighbour(tile, edge);
    const other = tiles.get(hexKey(n.q, n.r));
    if (!other || !other.spec.edges.includes('water')) return 'open';
    if (!waterEdges(other).includes(opposite(edge))) return 'open';
    return flowing(other) ? 'river' : 'lake';
  };
  const linked = (tile: PlacedTile): PlacedTile[] =>
    waterEdges(tile)
      .filter((e) => across(tile, e) === 'river')
      .map((e) => {
        const n = neighbour(tile, e);
        return river.get(hexKey(n.q, n.r))!;
      });

  // Wie weit jede Kachel (über den Fluss) von einem See ist — die Quelle liegt möglichst weit weg.
  const toLake = new Map<string, number>();
  const queue: PlacedTile[] = [];
  for (const [key, tile] of river) {
    if (waterEdges(tile).some((e) => across(tile, e) === 'lake')) {
      toLake.set(key, 0);
      queue.push(tile);
    }
  }
  while (queue.length) {
    const tile = queue.shift()!;
    const d = toLake.get(hexKey(tile.q, tile.r))!;
    for (const next of linked(tile)) {
      const key = hexKey(next.q, next.r);
      if (toLake.has(key)) continue;
      toLake.set(key, d + 1);
      queue.push(next);
    }
  }

  const flow = new Map<string, { into: Set<number>; out: Set<number>; centre: number }>();
  for (const [startKey] of river) {
    if (flow.has(startKey)) continue;
    // Das ganze Flusssystem dieser Kachel …
    const system: PlacedTile[] = [];
    const seen = new Set([startKey]);
    const walk = [river.get(startKey)!];
    while (walk.length) {
      const tile = walk.pop()!;
      system.push(tile);
      for (const next of linked(tile)) {
        const key = hexKey(next.q, next.r);
        if (!seen.has(key)) {
          seen.add(key);
          walk.push(next);
        }
      }
    }
    // … und seine Quelle: ein offenes Ende, so weit vom See wie möglich.
    const open = (t: PlacedTile): number[] => waterEdges(t).filter((e) => across(t, e) === 'open');
    let source = system[0]!;
    let best = -1;
    for (const tile of system) {
      if (open(tile).length === 0) continue;
      const d = toLake.get(hexKey(tile.q, tile.r)) ?? 1e6;
      if (d > best) {
        best = d;
        source = tile;
      }
    }
    const sourceIn = open(source)[0] ?? waterEdges(source)[0]!;
    flow.set(hexKey(source.q, source.r), { into: new Set([sourceIn]), out: new Set(), centre: 0 });
    const order = [source];
    while (order.length) {
      const tile = order.shift()!;
      const mine = flow.get(hexKey(tile.q, tile.r))!;
      for (const e of waterEdges(tile)) {
        if (mine.into.has(e) || mine.out.has(e)) continue;
        const kind = across(tile, e);
        if (kind !== 'river') {
          mine.out.add(e);
          continue;
        }
        const n = neighbour(tile, e);
        const key = hexKey(n.q, n.r);
        const theirs = flow.get(key);
        if (theirs) {
          // Schon vergeben: Läuft es dort hinaus zu mir, kommt es hier herein.
          if (theirs.out.has(opposite(e))) mine.into.add(e);
          else {
            mine.out.add(e);
            theirs.into.add(opposite(e));
          }
          continue;
        }
        mine.out.add(e);
        flow.set(key, { into: new Set([opposite(e)]), out: new Set(), centre: mine.centre + 2 });
        order.push(river.get(key)!);
      }
    }
  }

  const out = new Map<string, RiverFlow>();
  for (const [key, f] of flow) {
    const tile = river.get(key)!;
    // In die Kanten des Modells zurückdrehen.
    const mask = (edges: Set<number>): number =>
      [...edges].reduce((m, e) => m | (1 << ((e - tile.rot + 6) % 6)), 0);
    out.set(key, { into: mask(f.into), out: mask(f.out), centre: f.centre });
  }
  return out;
}
