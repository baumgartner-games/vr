import { PLAN_WALL_H, PLAN_WALL_T } from '../editor/levelPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W, TILE, type Dir } from '../nav/navTile';
import { standing, type PlanSolid } from './solids';

/**
 * **Die Bausteine** — was auf einer Kachel steht.
 *
 * Boden, Wand und Tür kommen aus dem Bauplan (`editor/levelPlan.ts`); die
 * gehören der Kachel und ihren Kanten. Alles andere, was in einem Zimmer
 * herumsteht, stand bisher in jeder Welt einzeln in Metern: die Küchenzeile der
 * Pizzeria, die Schießbank des Stands, die Treppe in Dust, das Geländer am
 * Balkon. Dreimal dieselbe Sache, dreimal andere Zahlen, dreimal ungeprüft.
 *
 * Hier ist sie einmal. Ein Baustein ist genau das, was er bei Minecraft ist:
 * **eine Kachel, eine Sorte, eine Blickrichtung** — mehr braucht niemand
 * anzugeben, und weniger geht nicht. Was daraus wird, sind achsenparallele
 * Quader (`solids.ts`), also dasselbe, was der Bauplan ohnehin ausspuckt, und
 * damit prüfbar, ohne dass eine Brille im Spiel ist.
 *
 * **Gebaut wird nach Norden, gedreht wird danach.** Jeder Baustein steht in
 * seiner eigenen kleinen Welt: Ursprung in der Kachelmitte, Boden auf null,
 * vorne ist −Z. Erst `turned()` legt ihn in die Richtung, in die er zeigen
 * soll. Das ist der Unterschied zwischen zwölf Bausteinen und achtundvierzig
 * Sonderfällen — und vor allem ist es der Grund, warum eine Küchenzeile an der
 * Ostwand genauso aussieht wie dieselbe an der Nordwand. Wer die vier Fälle
 * einzeln schreibt, hat irgendwann drei richtige und einen, bei dem die
 * Arbeitsplatte in der Wand steckt.
 *
 * **Ein Baustein weiß, was er der Kachel antut** (`BLOCKS[kind]`): Ein Podest
 * hebt den Boden an (`rise`), ein Tisch macht das Herumkommen teurer (`cost`).
 * Beides landet im Navigationsgraphen, und deshalb läuft ein NPC um den Tisch
 * herum und auf das Podest hinauf, ohne dass jemand die Karte von Hand
 * nachpinselt.
 */

/** Was es zu setzen gibt. */
export type BlockKind =
  | 'counter'
  | 'shelf'
  | 'table'
  | 'bench'
  | 'crate'
  | 'pillar'
  | 'railing'
  | 'parapet'
  | 'stairs'
  | 'ramp'
  | 'platform'
  | 'panel';

/** Wo ein Baustein steht: Kachelmitte, Bodenoberkante, Blickrichtung. */
export interface BlockSite {
  x: number;
  /** Die Oberkante des Bodens, auf dem er steht. */
  base: number;
  z: number;
  /**
   * Wohin er zeigt — und bei allem, was an einer Wand steht, gleichzeitig, an
   * **welcher** Kante er steht: Ein Regal mit `DIR_N` steht an der Nordkante
   * und schaut nach Süden in den Raum.
   */
  dir: Dir;
  /**
   * Wie hoch, wo das eine Frage ist: Treppe, Rampe, Podest, Decke. Ohne Angabe
   * das, was in `BLOCKS` steht.
   */
  height?: number;
}

/** Was ein Baustein außer Quadern noch bedeutet. */
export interface BlockFacts {
  label: string;
  /** Um wie viel er den begehbaren Boden der Kachel anhebt. */
  rise: number;
  /**
   * Was das Herumkommen auf dieser Kachel kostet, `1` ist frei.
   *
   * Kein „blockiert ja/nein": Eine Kachel ist zweieinhalb Meter breit, und ein
   * Tisch darin lässt reichlich Platz — er ist nur der Weg, den man nicht
   * nimmt, wenn daneben einer frei ist. Genau das sagt ein Aufschlag, und
   * genau das kann eine Wegsuche gebrauchen.
   */
  cost: number;
  /**
   * Die Höhe, auf der man ihn **benutzt**, wenn niemand eine andere angibt:
   * Arbeitsplatte, Sitzfläche, Handlauf, oberste Trittfläche. Bei allen außer
   * der Bank ist das gleichzeitig die Oberkante — die Lehne steht darüber.
   */
  height: number;
}

export const BLOCKS: Readonly<Record<BlockKind, BlockFacts>> = {
  counter: { label: 'Küchenzeile', rise: 0, cost: 1.6, height: 0.9 },
  shelf: { label: 'Regal', rise: 0, cost: 1.3, height: 1.9 },
  table: { label: 'Tisch', rise: 0, cost: 2.2, height: 0.75 },
  bench: { label: 'Bank', rise: 0, cost: 1.6, height: 0.46 },
  crate: { label: 'Kisten', rise: 0, cost: 2.6, height: 1.2 },
  pillar: { label: 'Säule', rise: 0, cost: 1.4, height: PLAN_WALL_H },
  railing: { label: 'Geländer', rise: 0, cost: 1, height: 1 },
  parapet: { label: 'Brüstung', rise: 0, cost: 1, height: 0.9 },
  stairs: { label: 'Treppe', rise: 0, cost: 1.8, height: PLAN_WALL_H },
  ramp: { label: 'Rampe', rise: 0, cost: 1.2, height: 1.2 },
  // Ein Podest **ist** der Boden, auf dem man dort steht — deshalb hebt es ihn
  // an, statt ein Hindernis darauf zu sein.
  platform: { label: 'Podest', rise: 1.2, cost: 1, height: 1.2 },
  panel: { label: 'Portaltafel', rise: 0, cost: 1, height: 2.4 },
};

export const BLOCK_KINDS: readonly BlockKind[] = Object.keys(BLOCKS) as BlockKind[];

/** Wie hoch dieser Baustein hier gebaut wird. */
export function blockHeight(kind: BlockKind, height?: number): number {
  return height ?? BLOCKS[kind].height;
}

/**
 * Um wie viel ein Baustein den Boden der Kachel anhebt.
 *
 * Beim Podest ist das seine Höhe und nicht die Zahl aus der Tabelle: Wer ein
 * Podest zwei Meter hoch baut, steht zwei Meter höher darauf.
 */
export function blockRise(kind: BlockKind, height?: number): number {
  const facts = BLOCKS[kind];
  if (facts.rise === 0) return 0;
  return blockHeight(kind, height);
}

/**
 * Die Quader eines Bausteins, an seinem Platz und in seiner Richtung.
 *
 * Der einzige Eingang. Was hier herauskommt, geht ohne Umweg in dieselbe Liste
 * wie Boden, Wände und Türen.
 */
export function blockSolids(kind: BlockKind, at: BlockSite): PlanSolid[] {
  const height = blockHeight(kind, at.height);
  const local = BUILD[kind](height);
  return turned(local, at.dir).map((one) => ({
    ...one,
    x: one.x + at.x,
    y: one.y + at.base,
    z: one.z + at.z,
  }));
}

/**
 * Dieselben Quader, in eine andere Richtung gedreht.
 *
 * Vier rechte Winkel, also bleiben achsenparallele Kästen achsenparallel — der
 * ganze Grund, warum die Bausteine nur in eine Richtung geschrieben sind. Bei
 * Ost und West tauschen dabei Breite und Tiefe, und **das** ist die Zeile, die
 * man vergisst: Ohne sie steht die Küchenzeile richtig herum, aber quer.
 */
export function turned(solids: readonly PlanSolid[], dir: Dir): PlanSolid[] {
  if (dir === DIR_N) return solids.map((one) => ({ ...one }));
  return solids.map((one) => {
    if (dir === DIR_S) return { ...one, x: -one.x, z: -one.z };
    if (dir === DIR_E) return { ...one, x: -one.z, z: one.x, w: one.d, d: one.w };
    return { ...one, x: one.z, z: -one.x, w: one.d, d: one.w };
  });
}

// --- die Bausteine selbst, alle nach Norden gebaut -------------------------

/** Wie weit ein Möbelstück von der Kante wegrückt, damit es nicht in der Wand steckt. */
const CLEAR = PLAN_WALL_T / 2;
/** Die Kante, an der etwas steht — in der lokalen Welt die Nordkante. */
const EDGE = -TILE / 2;
/** Wie hoch die Portaltafel über dem Boden anfängt. */
const PANEL_SILL = 0.2;

const BUILD: Readonly<Record<BlockKind, (height: number) => PlanSolid[]>> = {
  /**
   * **Die Küchenzeile**: Unterschrank, Arbeitsplatte, Nische für die Füße.
   *
   * Die Nische ist die Zeile, die man weglässt und danach vermisst. Ein
   * Schrank, der bis auf den Boden geht, ist ein Kasten; einer, der zehn
   * Zentimeter über dem Boden anfängt, ist eine Küche — und man merkt es nicht
   * am Hinsehen, sondern daran, dass man davorstehen kann, ohne mit den Zehen
   * anzustoßen.
   */
  counter: (height) => {
    const depth = 0.62;
    const mid = EDGE + CLEAR + depth / 2;
    const top = 0.04;
    const plinth = 0.1;
    const run = TILE - CLEAR * 2;
    return [
      standing('wood', 0, plinth, mid, run, height - top - plinth, depth),
      // Der Sockel steht zurück — das ist die Nische.
      standing('steel', 0, 0, mid + 0.06, run, plinth, depth - 0.12),
      // Die Platte kragt vorne über, sonst sieht sie aus wie ein Deckel.
      standing('steel', 0, height - top, mid + 0.02, run, top, depth + 0.04),
    ];
  },

  /** **Das Regal**: zwei Wangen und vier Böden. */
  shelf: (height) => {
    const depth = 0.34;
    const mid = EDGE + CLEAR + depth / 2;
    const side = 0.04;
    const out: PlanSolid[] = [];
    const run = TILE - CLEAR * 2;
    for (const s of [-1, 1]) {
      out.push(standing('wood', (s * (run - side)) / 2, 0, mid, side, height, depth));
    }
    const boards = 4;
    for (let i = 0; i < boards; i++) {
      // Der unterste Boden liegt auf dem Fußboden, der oberste ist der Deckel.
      const y = (i / (boards - 1)) * (height - 0.03);
      out.push(standing('wood', 0, y, mid, run - side * 2, 0.03, depth));
    }
    return out;
  },

  /** **Der Tisch**: Platte und vier Beine, mitten auf der Kachel. */
  table: (height) => {
    const w = 1.5;
    const d = 0.9;
    const top = 0.06;
    const leg = 0.08;
    const out: PlanSolid[] = [standing('wood', 0, height - top, 0, w, top, d)];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        out.push(
          standing(
            'steel',
            (sx * (w - leg * 2 - 0.1)) / 2,
            0,
            (sz * (d - leg * 2 - 0.1)) / 2,
            leg,
            height - top,
            leg,
          ),
        );
      }
    }
    return out;
  },

  /** **Die Bank**: Sitzfläche an der Kante, Lehne dahinter. */
  bench: (height) => {
    const depth = 0.44;
    const mid = EDGE + CLEAR + depth / 2 + 0.06;
    const run = TILE - CLEAR * 2 - 0.3;
    const board = 0.05;
    const out: PlanSolid[] = [standing('wood', 0, height - board, mid, run, board, depth)];
    for (const s of [-1, 1]) {
      out.push(
        standing('wood', (s * (run - 0.12)) / 2, 0, mid, 0.08, height - board, depth - 0.06),
      );
    }
    // Die Lehne, direkt an der Kante — ohne sie ist es ein Podest zum Draufstellen.
    out.push(standing('wood', 0, height, EDGE + CLEAR + 0.04, run, height * 0.9, 0.06));
    return out;
  },

  /**
   * **Kisten**: drei gestapelt, und die oberste sitzt schief.
   *
   * Sie sind Kulisse und nichts zum Wegtragen — was man werfen können soll,
   * ist ein Gegenstand und kein Baustein (`portal/props.ts`). Das ist der
   * Unterschied, den man sonst erst merkt, wenn ein Stapel Bausteine
   * durch die Gegend fliegt und die Karte nicht mehr stimmt.
   */
  crate: (height) => {
    const size = Math.min(0.62, height / 2);
    return [
      standing('wood', -0.34, 0, -0.28, size, size, size),
      standing('wood', 0.32, 0, -0.24, size, size, size),
      standing('wood', 0.3, 0, 0.34, size, size, size),
      standing('wood', -0.02, size, -0.26, size, size, size),
    ];
  },

  /** **Die Säule**: vom Boden bis unter die Decke, mitten auf der Kachel. */
  pillar: (height) => [standing('stone', 0, 0, 0, 0.34, height, 0.34)],

  /** **Das Geländer**: Handlauf auf Pfosten, an der Kante. */
  railing: (height) => {
    const at = EDGE + PLAN_WALL_T / 2;
    const out: PlanSolid[] = [];
    for (const s of [-1, 0, 1]) {
      out.push(standing('steel', (s * (TILE - 0.12)) / 2, 0, at, 0.07, height, 0.07));
    }
    out.push(standing('steel', 0, height - 0.05, at, TILE, 0.05, 0.09));
    // Ein Knieholm auf halber Höhe: ohne ihn ist ein Geländer ein Balken in
    // der Luft, unter dem man durchfällt.
    out.push(standing('steel', 0, height / 2, at, TILE - 0.14, 0.04, 0.05));
    return out;
  },

  /** **Die Brüstung**: eine niedrige, massive Mauer an der Kante. */
  parapet: (height) => [standing('stone', 0, 0, EDGE + PLAN_WALL_T / 2, TILE, height, PLAN_WALL_T)],

  /**
   * **Die Treppe**: eine Kachel breit, eine Kachel lang, eine Etage hoch — und
   * sie steigt **nach vorn**, also in die Richtung, in die sie zeigt.
   *
   * Die Stufenhöhe ergibt sich aus der Etage und nicht umgekehrt: Der
   * Character-Controller steigt 0,32 m (`PhysicsLocomotion`), also müssen
   * genug Stufen hinein, dass keine höher wird. Wer die Stufenhöhe festlegte
   * und die Treppe daraus baute, hätte bei jeder krummen Etagenhöhe eine
   * letzte Stufe, die entweder in der Luft endet oder zu hoch ist.
   */
  stairs: (height) => {
    const steps = Math.max(2, Math.ceil(height / 0.24));
    const run = TILE / steps;
    const out: PlanSolid[] = [];
    for (let i = 0; i < steps; i++) {
      const top = ((i + 1) / steps) * height;
      // Jede Stufe geht bis zum Boden durch: ein Keil aus Quadern, unter dem
      // niemand steckenbleibt. Hinten ist unten, vorne oben.
      out.push(standing('stone', 0, 0, TILE / 2 - run / 2 - i * run, TILE, top, run));
    }
    return out;
  },

  /** **Die Rampe**: dasselbe flacher, für draußen — Stufen, die man nicht sieht. */
  ramp: (height) => {
    const steps = Math.max(3, Math.ceil(height / 0.16));
    const run = TILE / steps;
    const out: PlanSolid[] = [];
    for (let i = 0; i < steps; i++) {
      const top = ((i + 1) / steps) * height;
      out.push(standing('stone', 0, 0, TILE / 2 - run / 2 - i * run, TILE, top, run));
    }
    return out;
  },

  /**
   * **Das Podest**: eine volle Kachel, angehoben.
   *
   * Es ist kein Möbel, sondern Boden — deshalb steht in `BLOCKS` ein `rise`
   * und kein Aufschlag. Wer darauf will, geht über eine Treppe oder eine Rampe
   * daneben; wer darunter durch will, kann es nicht, und das ist der Zweck.
   */
  platform: (height) => [standing('stone', 0, 0, 0, TILE, height, TILE)],

  /**
   * **Die Portaltafel**: das helle Brett an der Wand, an dem ein Portal hält.
   *
   * Es ist der einzige Baustein, der nicht dafür da ist, dass man ihn ansieht,
   * sondern dafür, dass man ihn *erkennt*: In jeder Welt hier haften Portale
   * an denselben hellen Flächen und nirgends sonst, und wer das einmal gesehen
   * hat, sucht in der nächsten Welt nicht wieder danach. Deshalb ist es ein
   * Baustein und keine Zahl in einer Welt.
   *
   * Es hängt eine Handbreit über dem Boden — ein Portal, dessen Unterkante im
   * Boden steckt, führt in die Bodenplatte.
   */
  panel: (height) => [
    standing(
      'panel',
      0,
      PANEL_SILL,
      EDGE + PLAN_WALL_T / 2 + 0.09,
      TILE - 0.1,
      height - PANEL_SILL,
      0.14,
    ),
  ],
};

/** Nur damit die vier Richtungen einmal namentlich in dieser Datei stehen. */
export const BLOCK_FACINGS: readonly Dir[] = [DIR_N, DIR_E, DIR_S, DIR_W];
