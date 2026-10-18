import { baseTile, rng, type Terrain, type TileSpec } from './hexRules';

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
 * einem Gelände, bekommt sie das große Stück dafür: einen ganzen Wald, ein
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
    'trees_A_large',
    'trees_B_large',
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
        // Das Feld selbst ist der Boden (`groundPatches`) — hier nur ab und zu ein Heuballen.
        if (random() < 0.3) {
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
      out.push({
        model: `decoration/nature/${random() < 0.5 ? 'trees_A_large' : 'trees_B_large'}.glb`,
        x: 0,
        z: 0,
        yaw: turn(),
        scale: 0.98,
      });
      return;
    case 'field':
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

/** Ein Stück Boden: welche Kante, welches Gelände, und ob nur der äußere Ring. */
export interface GroundPatch {
  readonly edge: number;
  readonly kind: GroundKind;
  /** Nur der äußere Teil des Stücks — auf Fluss- und Wegkacheln bleibt die Mitte frei. */
  readonly ring: boolean;
}

/**
 * **Der Boden unter den Stücken einer Kachel** — gewünscht: _„bei den hex
 * tiles unter Dörfern gerne auch den braunen Boden haben (um besser zu
 * erkennen, wo die Grenzen liegen). Auch bei Wald wäre ein leicht dunklerer
 * Boden schön. Weizen kann gerne bis kurz vorm Rand des Hex-Feldes gehen und
 * einfach einen braunen Rand haben"_. Je Kante, deren Gelände Dorf, Wald oder
 * Feld ist, ein Dreieck von der Mitte bis an die Kante; gezeichnet wird es in
 * `hexView.ts`. Auf Fluss-, Weg- und Brückenkacheln nur der äußere Ring, damit
 * das Wasser in der Mitte sichtbar bleibt; Ufer und See bekommen keinen, ihr
 * Uferbogen liefe sonst unter einen geraden Rand.
 */
export function groundPatches(spec: TileSpec): GroundPatch[] {
  const base = baseTile(spec.base);
  if (base.id === 'lake' || base.id.startsWith('coast')) return [];
  const ring = base.id !== 'land';
  const out: GroundPatch[] = [];
  spec.edges.forEach((terrain, edge) => {
    if (terrain === 'house' || terrain === 'forest' || terrain === 'field') {
      out.push({ edge, kind: terrain, ring });
    }
  });
  return out;
}
