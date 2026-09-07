import { NO_TILE, keyLevel, keyX, keyZ, tileKey, DIR_E, DIR_N, DIR_S, DIR_W } from '../nav/navTile';
import type { PlanEdit, PlanSpot } from './levelPlan';
import { EDGE_BLOCKS, applyGridTool, isBlockTool, type GridTool } from '../grid/gridTool';
import type { GridPlan } from '../grid/gridPlan';

/**
 * **Mehr als eine Kachel auf einmal** — Malen und Flächen.
 *
 * Der Bauplatz setzte bisher pro Druck genau ein Teil. Das ist die richtige
 * Bedienung für eine Tür und die falscheste, die es gibt, für einen Boden:
 * Ein Zimmer von acht mal acht Kacheln sind vierundsechzig Trigger, und
 * spätestens beim dreißigsten hört man auf, Räume zu bauen, die größer als
 * eine Stube sind. Zwei Gesten nehmen das weg, und beide kennt jeder aus
 * jedem Malprogramm:
 *
 * - **Malen**: drücken, ziehen, loslassen. Was der Zeiger dabei überstreicht,
 *   wird gesetzt.
 * - **Fläche**: zwei Ecken, und dazwischen wird gefüllt.
 *
 * Hier steht die Mathematik dazu, ohne three.js — damit sie geprüft ist,
 * bevor jemand in der Brille damit über einen Grundriss fährt. Drei Fragen
 * beantwortet sie, und die dritte ist die, an der ein Editor sonst scheitert:
 *
 * - Welche Kacheln liegen zwischen zwei Bildern (`strokeSpots`)? Eine Hand
 *   bewegt sich schneller als sechzig Bilder in der Sekunde; wer nur die
 *   Kachel unter dem Zeiger setzt, malt eine gestrichelte Linie.
 * - Welche Stellen gehören zu einem Rechteck (`areaSpots`)?
 * - Und **was heißt „füllen" für ein Werkzeug, das an eine Kante gehört**?
 *   Eine Wand ist keine Kachel. Ein Rechteck aus Wänden ist deshalb sein
 *   *Rand* und nicht seine Fläche — genau das, was `nav/navBuild.ts`
 *   `wallRect` nennt und was jeder meint, der zwei Ecken aufzieht und „Wand"
 *   in der Hand hält.
 */

/**
 * **Wie ein Druck wirkt** — als Strich oder als Fläche.
 *
 * Zwei und nicht drei: Der einzelne Tipp ist kein eigener Modus, sondern der
 * kürzestmögliche Strich. Wer einmal drückt und sofort losläßt, setzt genau
 * eine Kachel — und muss dafür nichts umgestellt haben.
 */
export type PaintMode = 'paint' | 'area';

export interface PaintModeSpec {
  id: PaintMode;
  label: string;
  sub: string;
  accent: number;
}

export const PAINT_MODES: readonly PaintModeSpec[] = [
  {
    id: 'paint',
    label: 'Malen',
    sub: 'Gedrückt halten und ziehen — was der Zeiger überstreicht, wird gesetzt',
    accent: 0x39d0ff,
  },
  {
    id: 'area',
    label: 'Fläche',
    sub: 'Zwei Ecken aufziehen — dazwischen wird alles gefüllt',
    accent: 0xffc857,
  },
];

export function paintModeSpec(id: PaintMode): PaintModeSpec {
  return PAINT_MODES.find((mode) => mode.id === id) ?? PAINT_MODES[0]!;
}

/**
 * **Ob dieses Werkzeug an eine Kante gehört.**
 *
 * Wand und Tür immer, dazu die Bausteine, die an einer Wand kleben
 * (`grid/gridTool.ts`, `EDGE_BLOCKS`). Alles andere sitzt auf der Kachel.
 * Diese eine Frage entscheidet, was eine Fläche für dieses Werkzeug ist —
 * ihr Rand oder ihr Inneres.
 */
export function wantsEdge(tool: GridTool): boolean {
  if (tool === 'wall' || tool === 'door') return true;
  return isBlockTool(tool) && EDGE_BLOCKS.has(tool);
}

/**
 * **Die Stellen zwischen zwei Zeigepunkten**, den Zielpunkt eingeschlossen und
 * den Startpunkt nicht.
 *
 * Eine Hand fährt in einem Bild leicht über drei Kacheln hinweg. Wer nur die
 * setzt, auf der sie am Ende steht, malt eine gestrichelte Linie und wundert
 * sich über die Löcher. Gerechnet wird deshalb in Kachelschritten und nicht in
 * Metern: Zwischen zwei Kacheln liegt eine Anzahl Kacheln, und die ist ganz.
 *
 * Die **Kante des Ziels gilt für den ganzen Strich**. Wer eine Wand entlang
 * malt, zeigt auf Nordkanten; die Kachel wechselt dabei, die Himmelsrichtung
 * nicht. Sie aus jeder Zwischenkachel neu zu raten hieße, an jedem zweiten
 * Schritt eine Wand quer zu stellen.
 */
export function strokeSpots(from: PlanSpot | null, to: PlanSpot): PlanSpot[] {
  if (to.tile === NO_TILE) return [];
  if (!from || from.tile === NO_TILE) return [to];
  if (keyLevel(from.tile) !== keyLevel(to.tile)) return [to];
  if (from.tile === to.tile) return [to];

  const level = keyLevel(to.tile);
  const x0 = keyX(from.tile);
  const z0 = keyZ(from.tile);
  const x1 = keyX(to.tile);
  const z1 = keyZ(to.tile);
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));

  const out: PlanSpot[] = [];
  for (let i = 1; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const z = Math.round(z0 + ((z1 - z0) * i) / steps);
    out.push({ tile: tileKey(x, z, level), dir: to.dir });
  }
  return out;
}

/**
 * **Das Rechteck zwischen zwei Ecken**, für dieses Werkzeug.
 *
 * Zwei Regeln, und die zweite ist der ganze Witz:
 *
 * - Was auf eine **Kachel** gehört (Boden, Löschen, ein Tisch), füllt die
 *   Fläche. Bausteine nehmen dabei die Blickrichtung der zweiten Ecke mit —
 *   sonst stünden zwanzig Tische in zwanzig Richtungen.
 * - Was an eine **Kante** gehört (Wand, Tür, Regal, Geländer), zieht den
 *   **Rand**. Ein gefülltes Rechteck aus Wänden wäre ein Klotz aus Wänden,
 *   und niemand meint das; gemeint ist ein Zimmer. Die Kanten zeigen dabei
 *   nach außen, genau wie bei `wallRect` — eine Wand auf der Innenseite
 *   machte die Randkacheln unbetretbar.
 *
 * Die **Ecken sind immer Kacheln**, auch wenn der Zeiger auf einer Kante lag.
 * Ein Rechteck, dessen Ecke je nach getroffener Fuge um eine Kachel springt,
 * ist eines, das man nicht zweimal gleich hinbekommt.
 */
export function areaSpots(tool: GridTool, a: PlanSpot, b: PlanSpot): PlanSpot[] {
  if (a.tile === NO_TILE || b.tile === NO_TILE) return [];
  if (keyLevel(a.tile) !== keyLevel(b.tile)) return [];

  const level = keyLevel(a.tile);
  const x0 = Math.min(keyX(a.tile), keyX(b.tile));
  const x1 = Math.max(keyX(a.tile), keyX(b.tile));
  const z0 = Math.min(keyZ(a.tile), keyZ(b.tile));
  const z1 = Math.max(keyZ(a.tile), keyZ(b.tile));

  const out: PlanSpot[] = [];
  if (!wantsEdge(tool)) {
    // Die Blickrichtung kommt aus der zweiten Ecke — das ist die, an der die
    // Hand beim Loslassen stand, und damit die, an die man zuletzt gedacht hat.
    const dir = isBlockTool(tool) ? b.dir : null;
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) out.push({ tile: tileKey(x, z, level), dir });
    }
    return out;
  }

  for (let x = x0; x <= x1; x++) {
    out.push({ tile: tileKey(x, z0, level), dir: DIR_N });
    out.push({ tile: tileKey(x, z1, level), dir: DIR_S });
  }
  for (let z = z0; z <= z1; z++) {
    out.push({ tile: tileKey(x0, z, level), dir: DIR_W });
    out.push({ tile: tileKey(x1, z, level), dir: DIR_E });
  }
  return out;
}

/**
 * **Viele Handgriffe als einer.**
 *
 * Jede Stelle geht durch dieselbe Kreuzung wie ein einzelner Druck
 * (`applyGridTool`) — ein zweiter Weg für „dasselbe, nur oft" wäre genau der
 * zweite Weg, der irgendwann etwas anderes tut als der erste. Was hier
 * dazukommt, ist die Zählung: Eine Meldung „Boden" nach dem Füllen von
 * vierzig Kacheln sagt nicht, dass vierzig entstanden sind.
 *
 * Ändert sich nichts, bleibt die **Auskunft der letzten Stelle** stehen —
 * „Erst Boden legen" ist die Antwort, die man beim Wandziehen ins Leere
 * braucht, und ein stummes Nichts wäre keine.
 */
export function applySpots(
  plan: GridPlan,
  tool: GridTool,
  spots: readonly PlanSpot[],
): PlanEdit & { count: number } {
  let count = 0;
  let says = '';
  let last = '';
  for (const spot of spots) {
    const edit = applyGridTool(plan, tool, spot);
    if (edit.says) last = edit.says;
    if (!edit.changed) continue;
    count++;
    says = edit.says;
  }
  if (count === 0) return { changed: false, says: last, count: 0 };
  return { changed: true, says: count === 1 ? says : `${count} × ${says}`, count };
}
