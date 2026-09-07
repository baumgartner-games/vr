import {
  applyTool,
  PLAN_TOOLS,
  type PlanEdit,
  type PlanSpot,
  type PlanTool,
} from '../editor/levelPlan';
import { DIR_N } from '../nav/navTile';
import { BLOCKS, type BlockKind } from './blocks';
import type { GridPlan } from './gridPlan';

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
export type GridTool = PlanTool | BlockKind;

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
 */
export const EDGE_BLOCKS: ReadonlySet<BlockKind> = new Set<BlockKind>([
  'counter',
  'shelf',
  'bench',
  'railing',
  'parapet',
  'panel',
]);

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
export function applyGridTool(plan: GridPlan, tool: GridTool, spot: PlanSpot): PlanEdit {
  if (!isBlockTool(tool)) {
    if (tool === 'erase') {
      // Erst der Baustein: Wer eine Küchenzeile löschen will, will nicht den
      // Boden darunter los.
      const gone = plan.takeBlock(spot.tile);
      if (gone) return { changed: true, says: `${BLOCKS[gone.kind].label} weg` };
    }
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
