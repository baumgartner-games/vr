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
  /**
   * **Wie weit über dem Boden der Etage er anfängt**, in Metern.
   *
   * Die zweite Zahl, die eine Treppe über mehrere Kacheln braucht: Die dritte
   * Kachel eines Laufs steigt nicht von null auf 0,7, sondern von 1,4 auf 2,1.
   * Ohne sie stünden vier Treppenkacheln nebeneinander statt hintereinander,
   * und jede fienge unten wieder an.
   */
  lift?: number;
}

/** Was ein Baustein außer Quadern noch bedeutet. */
export interface BlockFacts {
  label: string;
  /** Um wie viel er den begehbaren Boden der Kachel anhebt. */
  rise: number;
  /**
   * Was das Herumkommen auf dieser Kachel kostet, `1` ist frei.
   *
   * Kein „blockiert ja/nein": Ein Aufschlag sagt „hier kommt man schlechter
   * durch", und genau das kann eine Wegsuche gebrauchen — sie geht daneben
   * herum, solange daneben etwas frei ist, und hindurch, wenn es der einzige
   * Weg ist. Auf dem 1-m-Gitter füllt ein Tisch seine Kachel allerdings fast
   * ganz aus; die Zahlen hier stammen noch von den 2,5-m-Kacheln und sind
   * eher zu freundlich als zu streng.
   */
  cost: number;
  /**
   * Die Höhe, auf der man ihn **benutzt**, wenn niemand eine andere angibt:
   * Arbeitsplatte, Sitzfläche, Handlauf, oberste Trittfläche. Bei allen außer
   * der Bank ist das gleichzeitig die Oberkante — die Lehne steht darüber.
   */
  height: number;
}

/**
 * **Die beiden Maße, an denen eine Treppe steht oder klemmt.**
 *
 * Höchstens 0,2 m hoch und mindestens 0,25 m tief — das ist eine Treppe, die
 * man hinaufgeht, ohne darüber nachzudenken. Der Character-Controller steigt
 * 0,32 m (`PhysicsLocomotion`), also ist die Höhe nicht die Grenze; die
 * **Tiefe** ist es. Die Stufen der Straßenküche waren 0,19 m tief, und die
 * Mindestbreite des Autostep lag darüber — man blieb an jeder zweiten hängen.
 */
export const STEP_RISE = 0.2;
export const STEP_RUN = 0.25;

/** Eine Rampe steigt flacher: halb so hohe Stufen, sonst dieselbe Rechnung. */
const RAMP_RISE = 0.1;

/**
 * **Wie viel Anstieg eine Kachel Treppe nimmt**, wenn niemand etwas anderes
 * sagt: 0,7 m — vier Stufen von 0,175 m auf je 0,25 m Tiefe.
 *
 * Damit sind 2,8 m Etagenhöhe genau vier Kacheln Treppe, und das ist die Zahl,
 * aus der `GridPlan.stairs()` ihre Länge rechnet.
 */
export const STAIR_LIFT = 0.7;

/** Und eine Kachel Rampe: halb so viel, dafür gern doppelt so lang. */
export const RAMP_LIFT = 0.35;

export const BLOCKS: Readonly<Record<BlockKind, BlockFacts>> = {
  counter: { label: 'Küchenzeile', rise: 0, cost: 1.6, height: 0.9 },
  shelf: { label: 'Regal', rise: 0, cost: 1.3, height: 1.9 },
  table: { label: 'Tisch', rise: 0, cost: 2.2, height: 0.75 },
  bench: { label: 'Bank', rise: 0, cost: 1.6, height: 0.46 },
  // Zwei Kisten von 0,45 m übereinander — mehr passt auf eine Kachel von einem
  // Meter nicht, ohne dass der Stapel über die Kante kippt.
  crate: { label: 'Kisten', rise: 0, cost: 2.6, height: 0.9 },
  pillar: { label: 'Säule', rise: 0, cost: 1.4, height: PLAN_WALL_H },
  railing: { label: 'Geländer', rise: 0, cost: 1, height: 1 },
  parapet: { label: 'Brüstung', rise: 0, cost: 1, height: 0.9 },
  // **Die Höhe einer Treppenkachel ist ihr Teilanstieg** und nicht mehr die
  // ganze Etage: Sie liegt zu mehreren hintereinander (`GridPlan.stairs`).
  stairs: { label: 'Treppe', rise: 0, cost: 1.8, height: STAIR_LIFT },
  ramp: { label: 'Rampe', rise: 0, cost: 1.2, height: RAMP_LIFT },
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
  const lift = at.lift ?? 0;
  return turned(local, at.dir).map((one) => ({
    ...one,
    x: one.x + at.x,
    y: one.y + at.base + lift,
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

/**
 * **Ein Keil aus Stufen über eine Kachel**, von hinten nach vorn ansteigend.
 *
 * So viele Stufen, wie die gewünschte Steigung braucht — aber nie so viele,
 * dass eine flacher als `STEP_RUN` wird: Lieber eine Stufe zu hoch (das merkt
 * der Character-Controller nicht) als eine, auf der kein Fuß steht.
 */
function steps(height: number, rise: number): PlanSolid[] {
  const count = Math.max(
    1,
    Math.min(Math.floor(TILE / STEP_RUN), Math.ceil(height / Math.max(0.01, rise))),
  );
  const run = TILE / count;
  const out: PlanSolid[] = [];
  for (let i = 0; i < count; i++) {
    const top = ((i + 1) / count) * height;
    // Jede Stufe geht bis zum Boden durch: ein Keil aus Quadern, unter dem
    // niemand steckenbleibt. Hinten ist unten, vorne oben.
    out.push(standing('stone', 0, 0, TILE / 2 - run / 2 - i * run, TILE, top, run));
  }
  return out;
}

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
    // Einen Meter lang und 0,6 m tief — eine Küchenzeile, wie sie in jeder
    // Küche steht. Über die **ganze** Kachel und nicht um `CLEAR` eingerückt:
    // Zwei nebeneinander sollen eine durchgehende Zeile ergeben und nicht zwei
    // Schränke mit einer Fuge dazwischen. `CLEAR` hält sie dafür von der
    // Kante weg, an der sie steht — dort steckt die Wand.
    const depth = 0.6;
    const mid = EDGE + CLEAR + depth / 2;
    const top = 0.04;
    const plinth = 0.1;
    const run = TILE;
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
    const depth = 0.3;
    const mid = EDGE + CLEAR + depth / 2;
    const side = 0.04;
    const out: PlanSolid[] = [];
    const run = TILE;
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

  /**
   * **Der Tisch**: Platte und vier Beine, mitten auf der Kachel.
   *
   * 0,9 × 0,9 — ein Vierertisch, und er lässt ringsum eine Handbreit bis zur
   * Kachelkante. Größer ginge nicht: Ein Tisch, der über seine Kachel ragt,
   * steht in der Nachbarkachel, und die ist im Zweifel der Weg um ihn herum.
   */
  table: (height) => {
    const w = 0.9;
    const d = 0.9;
    const top = 0.06;
    const leg = 0.06;
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
    const depth = 0.36;
    const mid = EDGE + CLEAR + depth / 2 + 0.04;
    const run = TILE - 0.2;
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
   * **Kisten**: zwei gestapelt, und die obere sitzt schief.
   *
   * Sie sind Kulisse und nichts zum Wegtragen — was man werfen können soll,
   * ist ein Gegenstand und kein Baustein (`portal/props.ts`). Das ist der
   * Unterschied, den man sonst erst merkt, wenn ein Stapel Bausteine
   * durch die Gegend fliegt und die Karte nicht mehr stimmt.
   */
  crate: (height) => {
    // **Zwei Kisten und nicht vier.** Auf 2,5 m lagen hier drei nebeneinander
    // und eine obendrauf; auf einem Meter ist eine Kiste von 0,45 m schon fast
    // die halbe Kachel, und vier davon steckten ineinander.
    const size = Math.min(0.45, height / 2);
    return [
      standing('wood', -0.02, 0, 0.03, size, size, size),
      standing('wood', 0.04, size, -0.04, size, size, size),
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
   * **Die Treppe**: eine Kachel breit, eine Kachel lang, ein **Teilanstieg**
   * hoch — und sie steigt **nach vorn**, also in die Richtung, in die sie
   * zeigt.
   *
   * Auf 2,5 m ging eine ganze Etage in eine Kachel; auf einem Meter geht das
   * nicht mehr, und das ist gut so. Eine Treppe, die 2,8 m auf einem Meter
   * schafft, ist eine Leiter mit Stufen von 7 cm Tiefe — man bleibt an ihr
   * hängen, und genau das war der Vorwurf an die Treppe der Straßenküche.
   * Also legt `GridPlan.stairs()` sie über **mehrere** Kacheln, und jede
   * einzelne bekommt hier ihren Teilanstieg (`height`) und ihren Fuß über dem
   * Etagenboden (`BlockSite.lift`).
   *
   * Die Stufenzahl folgt aus zwei Grenzen und nicht aus einem Geschmack:
   * **höchstens `STEP_RISE` hoch** (sonst steigt sich das nicht mehr) und
   * **mindestens `STEP_RUN` tief** (sonst steht kein Fuß darauf). Bei 0,7 m
   * Anstieg je Kachel sind das vier Stufen von 0,175 m auf 0,25 m.
   */
  stairs: (height) => steps(height, STEP_RISE),

  /** **Die Rampe**: dasselbe flacher, für draußen — Stufen, die man nicht sieht. */
  ramp: (height) => steps(height, RAMP_RISE),

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
