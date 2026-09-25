import {
  applyTool,
  PLAN_TOOLS,
  type PlanEdit,
  type PlanSpot,
  type PlanTool,
} from '../editor/levelPlan';
import { DIR_N, keyLevel, keyX, keyZ } from '../nav/navTile';
import { BLOCKS, BLOCK_KINDS, type BlockKind } from './blocks';
import { fixtureKind, type Props } from './fixtures/index';
import type { GridPlan } from './gridPlan';
import type { Slope } from '../nav/cellGrid';

/**
 * **Was ein Druck auf den Grundriss tut** — die vier Bauwerkzeuge und die
 * Bausteine, an *einer* Stelle.
 *
 * Der Bauplatz hatte vier Werkzeuge (`editor/levelPlan.ts`: Boden, Wand, Tür,
 * Löschen), und die reichen für einen Grundriss. Für ein *Zimmer* reichen sie
 * nicht: Eine Küche ohne Küchenzeile ist ein leerer Kasten mit einer Tür, und
 * genau daran merkt man beim Bauen, ob ein Raum funktioniert oder nicht.
 *
 * Die Kreuzung „Werkzeug × worauf man zeigt" steht deshalb weiterhin an einer
 * einzigen Stelle, sie ist nur größer geworden. Zwei Regeln erklären sie ganz:
 *
 * - **Was an eine Wand gehört, will eine Kante.** Eine Küchenzeile, ein Regal,
 *   eine Bank, ein Geländer, eine Brüstung, eine Portaltafel — bei allen sechs
 *   ist die Kante, auf die man zeigt, gleichzeitig die Seite, an der sie
 *   stehen. Zeigt jemand auf die Mitte einer Kachel, fehlt die Angabe, und es
 *   ist besser, das zu sagen, als sie zu raten: Eine geratene Küchenzeile
 *   steht in drei von vier Fällen falsch herum.
 * - **Was frei steht, nimmt die Kante als Blickrichtung.** Tisch, Kiste,
 *   Säule, Podest, Rampe: Die Kachel entscheidet, wo sie stehen, die Kante nur,
 *   wohin sie schauen — und wer auf die Mitte zeigt, bekommt Norden.
 *
 * Und der Radiergummi räumt weiter in der Reihenfolge auf, in der man es
 * meint, nur mit einem Schritt mehr davor: **erst der Baustein**, dann die
 * Tür, dann die Wand, dann der Boden. Wer eine Küchenzeile löschen will, will
 * nicht den Boden darunter los.
 */

/** Was der Pinsel gerade trägt. */
export type GridTool = PlanTool | BlockKind | FixtureTool;

/**
 * **Ein Einbau als Werkzeug** — `fixture:sign`, `fixture:door`, …
 *
 * Mit Vorsilbe und nicht bloß mit dem Namen der Art: Die Arten kommen aus
 * einer Registry, die jedes Paket erweitert (`fixtures/kinds.ts`), und eine
 * Art, die eines Tages `table` heißt, wäre sonst still derselbe Pinsel wie der
 * Baustein Tisch. Zwei Werkzeuge mit einer Kennung sind eines zu viel.
 */
export type FixtureTool = `fixture:${string}`;

const FIXTURE_TOOL = 'fixture:';

export function isFixtureTool(tool: string): tool is FixtureTool {
  return tool.startsWith(FIXTURE_TOOL);
}

/** Welche Art dieses Werkzeug setzt. */
export function fixtureTool(kind: string): FixtureTool {
  return `${FIXTURE_TOOL}${kind}`;
}

export function toolFixtureKind(tool: string): string {
  return isFixtureTool(tool) ? tool.slice(FIXTURE_TOOL.length) : '';
}

/** Die Bausteine, die es im Bauplatz zu setzen gibt. */
export const PALETTE_BLOCKS: readonly BlockKind[] = [
  'counter',
  'shelf',
  'table',
  'bench',
  'crate',
  'pillar',
  'railing',
  'parapet',
  'platform',
];

/**
 * Die sechs, die an eine Kante gehören.
 *
 * Nicht dieselbe Liste wie „hat eine Blickrichtung" — die haben alle. Es ist
 * die Liste derer, bei denen die Blickrichtung **keine Auswahl** ist, sondern
 * die Wand, an der sie kleben.
 *
 * **Sie steht nicht mehr hier**, sondern bei den Bausteinen selbst
 * (`blocks.BlockFacts.edge`), und das ist der Unterschied zwischen einer
 * Antwort und einer Abschrift: Inzwischen hängt auch der Platz des Modells aus
 * dem Regal daran (`blocks.blockModelSpot`), und eine zweite Liste, die
 * dasselbe wissen muss, wird irgendwann die erste sein, die jemand vergisst.
 * Der Name bleibt, weil der Bauplatz ihn an zwei Stellen liest
 * (`editor/planPaint.ts`).
 */
export const EDGE_BLOCKS: ReadonlySet<BlockKind> = new Set<BlockKind>(
  BLOCK_KINDS.filter((kind) => BLOCKS[kind].edge),
);

export function isBlockTool(tool: string): tool is BlockKind {
  return tool in BLOCKS;
}

/**
 * **Die Farben der Bausteine.**
 *
 * Warme Töne für Möbel, kühle für alles, was baulich ist — dieselbe Trennung,
 * die man in der Miniatur auch sieht. Sie stehen hier und nicht in `blocks.ts`,
 * weil ein Baustein selbst keine Farbe hat: Wie er aussieht, entscheidet die
 * Palette der Welt, in der er steht (`GridWorld.GRID_COLORS`). Das hier ist die
 * Farbe seines **Napfes**.
 */
const BLOCK_ACCENT: Readonly<Record<BlockKind, number>> = {
  counter: 0xffa64d,
  shelf: 0xd79a5b,
  table: 0xc98f4f,
  bench: 0xb98a5a,
  crate: 0x9a7a4f,
  pillar: 0x9fb0c8,
  railing: 0x8fd0e0,
  parapet: 0x7fa8c0,
  stairs: 0xa0b8d0,
  ramp: 0x93a8bd,
  platform: 0x86b39a,
  panel: 0xf2f4f8,
};

/** Wie ein Werkzeug heißt, was es tut und in welcher Farbe. */
export interface GridToolSpec {
  id: GridTool;
  label: string;
  sub: string;
  accent: number;
}

export function gridToolSpec(id: string): GridToolSpec {
  if (isFixtureTool(id)) {
    const kind = fixtureKind(toolFixtureKind(id));
    if (!kind) {
      return {
        id: id as GridTool,
        label: toolFixtureKind(id),
        sub: 'Unbekannte Art',
        accent: 0x8892a6,
      };
    }
    return {
      id: id as GridTool,
      label: kind.label,
      sub: kind.edge
        ? 'Auf eine Kante zeigen — dort hängt er dann'
        : 'Auf eine Kachel zeigen; die Kante gibt ihm die Blickrichtung',
      accent: kind.accent,
    };
  }
  if (isBlockTool(id)) {
    return {
      id,
      label: BLOCKS[id].label,
      sub: EDGE_BLOCKS.has(id)
        ? 'Auf eine Kante zeigen — dort steht er dann'
        : 'Auf eine Kachel zeigen; die Kante gibt ihm die Blickrichtung',
      accent: BLOCK_ACCENT[id],
    };
  }
  const tool = PLAN_TOOLS.find((one) => one.id === id) ?? PLAN_TOOLS[0]!;
  return { id: tool.id, label: tool.label, sub: tool.sub, accent: tool.accent };
}

/**
 * **Ein Handgriff auf dem Grundriss** — dieselbe Rolle wie `applyTool`, nur
 * für einen Plan mit Bausteinen darauf.
 */
export function applyGridTool(
  plan: GridPlan,
  tool: GridTool,
  spot: PlanSpot,
  props: Props = {},
): PlanEdit {
  if (isFixtureTool(tool)) return setFixture(plan, tool, spot, props);

  if (!isBlockTool(tool)) {
    if (tool === 'erase') {
      // **Erst der Einbau, dann der Baustein, dann das Bauliche.** Wer ein
      // Schild löschen will, will nicht die Wand los, an der es hängt — und
      // wer eine Küchenzeile löscht, nicht den Boden darunter.
      const fixture = plan.takeFixtureOn(spot.tile);
      if (fixture) {
        const kind = fixtureKind(fixture.kind);
        return { changed: true, says: `${kind?.label ?? fixture.kind} weg` };
      }
      const gone = plan.takeBlock(spot.tile);
      if (gone) return { changed: true, says: `${BLOCKS[gone.kind].label} weg` };
      // Dann die Schräge — sie steht in der Kachel, nicht an einer Kante.
      if (spot.dir === null && plan.slopeAt(spot.tile)) {
        plan.slope(keyX(spot.tile), keyZ(spot.tile), null, keyLevel(spot.tile));
        return { changed: true, says: 'Schräge weg' };
      }
    }
    if (tool === 'slope') return turnSlope(plan, spot);
    return applyTool(plan.graph, tool, spot);
  }

  if (!plan.graph.has(spot.tile)) {
    return { changed: false, says: 'Erst Boden legen' };
  }
  if (EDGE_BLOCKS.has(tool) && spot.dir === null) {
    return { changed: false, says: `${BLOCKS[tool].label} braucht eine Kante` };
  }
  const dir = spot.dir ?? DIR_N;
  // Zweimal dasselbe an dieselbe Kante ist kein Fehler, sondern die häufigste
  // Handbewegung überhaupt — beim Malen einer Zeile erwischt man eine Kachel
  // doppelt. Sie soll nur nicht zweimal darin stehen.
  const had = plan.blocksOn(spot.tile).find((one) => one.kind === tool && one.dir === dir);
  if (had) return { changed: false, says: '' };

  plan.putAt(tool, spot.tile, dir);
  return { changed: true, says: BLOCKS[tool].label };
}

/**
 * **Einen Einbau setzen** — dieselben zwei Regeln wie beim Baustein.
 *
 * Was an eine Kante gehört, will eine Kante (`kind.edge`); was frei steht,
 * nimmt sie als Blickrichtung. Und zweimal dasselbe an dieselbe Kante ist kein
 * Fehler, sondern die häufigste Handbewegung überhaupt — es soll nur nicht
 * zweimal dastehen.
 */
function setFixture(plan: GridPlan, tool: FixtureTool, spot: PlanSpot, props: Props): PlanEdit {
  const name = toolFixtureKind(tool);
  const kind = fixtureKind(name);
  if (!kind) return { changed: false, says: `„${name}" kennt dieses Programm nicht` };
  if (!plan.graph.has(spot.tile)) return { changed: false, says: 'Erst Boden legen' };
  if (kind.edge && spot.dir === null) {
    return { changed: false, says: `${kind.label} braucht eine Kante` };
  }
  const dir = spot.dir ?? DIR_N;
  const had = plan.fixturesOn(spot.tile).find((one) => one.kind === name && one.dir === dir);
  if (had) return { changed: false, says: '' };

  plan.putFixture({
    kind: name,
    x: keyX(spot.tile),
    z: keyZ(spot.tile),
    level: keyLevel(spot.tile),
    dir,
    props,
  });
  return { changed: true, says: kind.label };
}

/**
 * **Die Schräge einer Kachel weiterdrehen**: keine → „/" → „\" → keine.
 *
 * Ein Werkzeug und nicht zwei: Welche Diagonale gemeint ist, sieht man erst,
 * wenn sie steht — und dann tippt man lieber noch einmal, als vorher zwischen
 * zwei Knöpfen zu wählen, deren Namen niemand auseinanderhält.
 */
function turnSlope(plan: GridPlan, spot: PlanSpot): PlanEdit {
  if (!plan.graph.has(spot.tile)) return { changed: false, says: 'Erst Boden legen' };
  const next: Slope | null =
    plan.slopeAt(spot.tile) === null
      ? 'slash'
      : plan.slopeAt(spot.tile) === 'slash'
        ? 'backslash'
        : null;
  plan.slope(keyX(spot.tile), keyZ(spot.tile), next, keyLevel(spot.tile));
  return {
    changed: true,
    says: next === 'slash' ? 'Schräge ╱' : next === 'backslash' ? 'Schräge ╲' : 'Schräge weg',
  };
}
