import type { NavGraph } from '../nav/navGraph';
import { DIR_N, TILE, keyLevel, tileCentreX, tileCentreZ, wallDir, wallTile } from '../nav/navTile';
import { PLAN_DOOR_H, PLAN_DOOR_W, PLAN_FLOOR_T, PLAN_WALL_H, PLAN_WALL_T } from './levelPlan';

/**
 * **Aus dem Bauplan werden Quader** — die andere Richtung von `nav/navBake.ts`.
 *
 * Das Abtasten macht aus einer gebauten Welt eine Karte; hier wird aus einer
 * Karte eine gebaute Welt. Dass es beide Richtungen gibt, ist kein Zufall,
 * sondern der Grund, warum der Editor auf dem Navigationsgraphen sitzt: Was
 * hier herauskommt, kann `navBake` wieder einlesen und muss dabei dieselbe
 * Karte ergeben. Ein Editor, bei dem das nicht stimmt, baut Wände, an denen
 * die Wegsuche vorbeiplant.
 *
 * Herausgereicht werden **achsenparallele Quader** und sonst nichts — genau
 * das, was `slab()` in jeder Welt dieses Projekts baut und was das Abtasten
 * versteht. Keine three.js-Objekte: So ist der Grundriss geprüft, bevor
 * irgendwo eine Geometrie entsteht, und dieselbe Liste baut die **Miniatur**
 * und das **Lebensgroße** — zweimal dasselbe aus einer Quelle, denn zwei
 * Bauanleitungen für dasselbe Zimmer laufen auseinander.
 */

/** Wozu ein Quader gehört — die Sorte entscheidet über Farbe und Härte. */
export type PlanSolidKind = 'floor' | 'wall' | 'door';

/** Ein Quader in Planmetern: Mitte und Kantenlängen. */
export interface PlanSolid {
  kind: PlanSolidKind;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  /** Bei einer Tür: ihr Name im Plan — daran erkennt man das Blatt wieder. */
  door?: string;
}

/** Wie dick ein Türblatt ist. */
export const PLAN_LEAF_T = 0.1;

/**
 * Der ganze Plan als Quader.
 *
 * Die Reihenfolge ist: erst alle Böden, dann alle Wände. Das ist keine
 * Kosmetik — wer die Liste in eine Physik gibt, will die Böden zuerst
 * hinlegen, damit nichts eine Wand berührt, bevor es Boden gibt.
 */
export function planSolids(plan: NavGraph): PlanSolid[] {
  const out: PlanSolid[] = [];
  for (const key of plan.tileKeys()) {
    const facts = plan.tile(key);
    const top = plan.levelY(keyLevel(key)) + (facts?.rise ?? 0);
    out.push({
      kind: 'floor',
      x: tileCentreX(key),
      y: top - PLAN_FLOOR_T / 2,
      z: tileCentreZ(key),
      w: TILE,
      h: PLAN_FLOOR_T,
      d: TILE,
    });
  }
  for (const [wall, facts] of plan.wallEntries()) {
    const key = wallTile(wall);
    const alongX = wallDir(wall) === DIR_N;
    const base = plan.levelY(keyLevel(key));
    // Die Mitte der Kante: eine halbe Kachel nach Norden bzw. nach Osten.
    const x = tileCentreX(key) + (alongX ? 0 : TILE / 2);
    const z = tileCentreZ(key) + (alongX ? -TILE / 2 : 0);
    if (facts.kind === 'door') {
      out.push(...doorParts(x, base, z, alongX, facts.open, facts.id));
      continue;
    }
    out.push(slab(x, base + PLAN_WALL_H / 2, z, alongX, TILE, PLAN_WALL_H, PLAN_WALL_T, 'wall'));
  }
  return out;
}

/**
 * **Eine Tür als das, was sie ist**: zwei Pfosten, ein Sturz darüber und ein
 * Blatt.
 *
 * Der Sturz ist die Zeile, die man vergisst, und sie kostet den Eindruck: Ohne
 * ihn steht in der Wand ein Loch bis zur Decke, und ein Loch bis zur Decke ist
 * ein Durchgang und keine Tür. Man sieht den Unterschied nicht in einer
 * Zeichnung von oben, sondern erst, wenn man davorsteht — und in dieser Welt
 * steht man immer irgendwann davor.
 *
 * **Offen heißt aufgeschwungen und nicht verschwunden.** Ein Blatt, das beim
 * Öffnen einfach weg ist, sieht aus wie ein Fehler; eines, das quer in den Raum
 * ragt, sagt von oben auf einen Blick, wohin es aufgeht.
 */
export function doorParts(
  x: number,
  base: number,
  z: number,
  alongX: boolean,
  open: boolean,
  id: string,
): PlanSolid[] {
  const post = (TILE - PLAN_DOOR_W) / 2;
  const offset = (PLAN_DOOR_W + post) / 2;
  const out: PlanSolid[] = [];
  for (const side of [-1, 1]) {
    out.push(
      slab(
        x + (alongX ? side * offset : 0),
        base + PLAN_WALL_H / 2,
        z + (alongX ? 0 : side * offset),
        alongX,
        post,
        PLAN_WALL_H,
        PLAN_WALL_T,
        'wall',
      ),
    );
  }
  // Der Sturz: von der Türhöhe bis unter die Decke, über die ganze Kante.
  const lintel = PLAN_WALL_H - PLAN_DOOR_H;
  if (lintel > 0.01) {
    out.push(
      slab(x, base + PLAN_DOOR_H + lintel / 2, z, alongX, TILE, lintel, PLAN_WALL_T, 'wall'),
    );
  }

  // Und das Blatt. Zu: in der Lücke, quer zur Wand. Offen: um den Pfosten
  // geschwenkt, also **entlang** der Wandrichtung und einen halben Türflügel
  // in den Raum hinein.
  const leaf = open
    ? slab(
        x + (alongX ? -PLAN_DOOR_W / 2 : PLAN_DOOR_W / 2),
        base + PLAN_DOOR_H / 2,
        z + (alongX ? PLAN_DOOR_W / 2 : -PLAN_DOOR_W / 2),
        !alongX,
        PLAN_DOOR_W,
        PLAN_DOOR_H,
        PLAN_LEAF_T,
        'door',
      )
    : slab(x, base + PLAN_DOOR_H / 2, z, alongX, PLAN_DOOR_W, PLAN_DOOR_H, PLAN_LEAF_T, 'door');
  leaf.door = id;
  out.push(leaf);
  return out;
}

/**
 * Ein Quader an einer Kante: `length` läuft **die Kante entlang**, `thick`
 * steht quer dazu.
 *
 * Die eine Stelle, an der die Achsen getauscht werden — und deshalb die eine
 * Stelle, an der man sie vertauschen kann. Überall sonst steht danach nur noch
 * `alongX`.
 */
function slab(
  x: number,
  y: number,
  z: number,
  alongX: boolean,
  length: number,
  height: number,
  thick: number,
  kind: PlanSolidKind,
): PlanSolid {
  return {
    kind,
    x,
    y,
    z,
    w: alongX ? length : thick,
    h: height,
    d: alongX ? thick : length,
  };
}
