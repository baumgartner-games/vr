import { NavGraph, type WallKind } from '../nav/navGraph';
import { fillRect, setDoor, wallRect } from '../nav/navBuild';
import {
  DIRS,
  DIR_E,
  DIR_N,
  DIR_S,
  DIR_W,
  NO_TILE,
  TILE,
  keyLevel,
  keyX,
  keyZ,
  neighbour,
  opposite,
  tileCentreX,
  tileCentreZ,
  tileIndexAt,
  tileKey,
  type Dir,
  type TileKey,
} from '../nav/navTile';

/**
 * **Der Bauplan** — und er ist kein neues Datenformat, sondern der
 * Navigationsgraph (`nav/navGraph.ts`).
 *
 * Das ist die eine Entscheidung, an der in dieser Ecke alles hängt, und sie
 * ist es wert, begründet zu werden. Ein Grundriss aus Kacheln, Wänden und
 * Türen ist **genau** das, was der Graph ohnehin führt: `has(key)` heißt „hier
 * ist Boden", eine Wand steht zwischen zwei Kacheln, eine Tür ist eine Wand,
 * die aufgeht. Ein zweites Format daneben hätte drei Nachteile, und der dritte
 * ist der schlimme:
 *
 * - Es müsste in den Graphen übersetzt werden, damit NPCs es lesen können.
 * - Es bräuchte ein eigenes Dateiformat mit eigener Versionsnummer, obwohl es
 *   `nav/navSerial.ts` schon gibt.
 * - Und es würde **auseinanderlaufen**. Ein Editor, dessen Grundriss etwas
 *   anderes sagt als die Karte, auf der die NPCs laufen, ist ein Editor, in
 *   dem man eine Tür einbaut und danach zusieht, wie ein Zombie hindurchgeht,
 *   weil sie in der anderen Hälfte der Wahrheit nicht steht.
 *
 * Was hier steht, sind deshalb nur die **Handgriffe**: Boden hinlegen, Wand
 * stellen, Tür einbauen, alles wieder wegnehmen — und ein Startgrundriss,
 * damit man nicht in einer leeren Ebene anfängt. Ohne three.js, damit jeder
 * einzelne Handgriff geprüft ist, bevor jemand mit dem Finger darauf zeigt.
 *
 * **Eine Wand gehört zwei Kacheln**, und das ist der Fehler, den man hier
 * macht: Sie hat einen normierten Schlüssel (`navTile.ts`, `wallKey`), aber sie
 * ist gleichzeitig die Ostwand der einen und die Westwand der anderen. Wer
 * eine Wand setzt und dabei nur an *eine* Seite denkt, baut eine Wand, hinter
 * der kein Boden liegt — und die ist in der Brille unsichtbar, weil man sie
 * nur von der Seite sieht, auf der man steht.
 */

/** Wie hoch eine Wand im Bauplan ist, in Metern. */
export const PLAN_WALL_H = 2.8;
/** Und wie dick — deutlich dünner als eine halbe Kachel. */
export const PLAN_WALL_T = 0.25;
/** Wie dick eine Bodenplatte ist. */
export const PLAN_FLOOR_T = 0.3;
/** Wie breit eine Tür ist. */
export const PLAN_DOOR_W = 1.2;
/** Und wie hoch. */
export const PLAN_DOOR_H = 2.1;
/** Ein Fenster: wie breit, und zwischen welchen beiden Höhen es offen ist. */
export const PLAN_WINDOW_W = 1.4;
export const PLAN_WINDOW_SILL = 0.95;
export const PLAN_WINDOW_HEAD = 2.1;

/**
 * **Womit ein Werkzeug auf den Plan zeigt** — was man gerade baut.
 *
 * Vier und nicht mehr: Ein Editor mit zwanzig Werkzeugen ist einer, in dem man
 * das richtige sucht. Boden, Wand, Tür — und der Radiergummi, der alles drei
 * wieder wegnimmt, je nachdem, worauf man zeigt.
 */
export type PlanTool = 'floor' | 'wall' | 'door' | 'erase';

export interface PlanToolSpec {
  id: PlanTool;
  label: string;
  /** Was er tut, in ein paar Worten. */
  sub: string;
  accent: number;
}

export const PLAN_TOOLS: readonly PlanToolSpec[] = [
  {
    id: 'floor',
    label: 'Boden',
    sub: 'Kachel hinlegen — darauf steht alles andere',
    accent: 0x39d0ff,
  },
  {
    id: 'wall',
    label: 'Wand',
    sub: 'An die Kante zwischen zwei Kacheln',
    accent: 0xff8a3d,
  },
  {
    id: 'door',
    label: 'Tür',
    sub: 'In eine Wand, die schon steht',
    accent: 0xe58aa8,
  },
  {
    id: 'erase',
    label: 'Löschen',
    sub: 'Nimmt weg, worauf du zeigst',
    accent: 0xff3b2f,
  },
];

export function planToolSpec(id: string | undefined): PlanToolSpec {
  return PLAN_TOOLS.find((tool) => tool.id === id) ?? PLAN_TOOLS[0]!;
}

/** Worauf ein Handgriff zielt: eine Kachel, oder die Kante an ihrer Seite. */
export interface PlanSpot {
  tile: TileKey;
  /** `null` heißt: die Kachel selbst und keine ihrer Kanten. */
  dir: Dir | null;
}

/** Was ein Handgriff bewirkt hat — für die Meldung am Handgelenk. */
export interface PlanEdit {
  /** Ob sich etwas geändert hat. */
  changed: boolean;
  /** Eine Zeile darüber, was passiert ist. */
  says: string;
}

const NOTHING: PlanEdit = { changed: false, says: '' };

/**
 * **Ein Handgriff auf dem Plan.**
 *
 * Ein einziger Eingang für alle vier Werkzeuge, und zwar mit Absicht: Was ein
 * Druck bewirkt, hängt an *zwei* Sachen — am Werkzeug und daran, worauf man
 * zeigt —, und diese Kreuzung an einer Stelle zu haben ist der Unterschied
 * zwischen einem Editor, den man erklären kann, und vier Sonderfällen, die
 * sich widersprechen.
 */
export function applyTool(plan: NavGraph, tool: PlanTool, spot: PlanSpot): PlanEdit {
  if (spot.tile === NO_TILE) return NOTHING;
  switch (tool) {
    case 'floor':
      // Auf eine Kante gezeigt und Boden gewählt: gemeint ist die Kachel
      // **dahinter** (`aimOf`). So malt man einen Raum von seinem Rand aus
      // weiter, ohne vorher genau in die Mitte der nächsten Kachel zu treffen.
      return setFloor(plan, aimOf('floor', spot).tile, true);
    case 'wall':
      return setWall(plan, spot, 'solid');
    case 'door':
      return setWall(plan, spot, 'door');
    case 'erase':
      return erase(plan, spot);
  }
}

/**
 * **Worauf dieser Druck wirklich zielt** — für die Vorschau unter dem Zeiger.
 *
 * Dieselbe Kreuzung wie in `applyTool`, nur ohne etwas zu ändern: Wer *Boden*
 * gewählt hat und auf eine Kante zeigt, baut die Kachel **dahinter**, und
 * genau die soll aufleuchten. Eine Vorschau, die etwas anderes zeigt als der
 * nächste Druck tut, ist schlimmer als gar keine — man lernt sie sich an und
 * baut danach daneben.
 */
export function aimOf(tool: PlanTool, spot: PlanSpot): PlanSpot {
  if (tool !== 'floor') return spot;
  if (spot.dir === null) return spot;
  return { tile: neighbour(spot.tile, spot.dir), dir: null };
}

/**
 * Boden hinlegen oder wegnehmen.
 *
 * Beim Wegnehmen fallen **die Wände mit**, die dann im Nichts stünden: eine
 * Wand zwischen zwei Kacheln, von denen es keine mehr gibt, ist ein Brett in
 * der Luft. Das sieht man in der Miniatur sofort und wundert sich, wo es
 * herkommt.
 */
export function setFloor(plan: NavGraph, tile: TileKey, on: boolean): PlanEdit {
  if (tile === NO_TILE) return NOTHING;
  if (on) {
    if (plan.has(tile)) return NOTHING;
    plan.setTile(tile);
    return { changed: true, says: 'Boden' };
  }
  if (!plan.has(tile)) return NOTHING;
  for (const dir of DIRS) {
    const other = neighbour(tile, dir);
    // Die Wand bleibt, solange die Nachbarin noch Boden hat — dort ist sie ja
    // weiterhin eine Wand, nur eben eine an der Kante der Welt.
    if (other !== NO_TILE && plan.has(other)) continue;
    plan.clearWall(tile, dir);
  }
  plan.removeTile(tile);
  return { changed: true, says: 'Boden weg' };
}

/**
 * Eine Wand stellen — oder aus einer, die schon steht, eine Tür machen.
 *
 * **Eine Tür braucht eine Wand.** Wer auf eine freie Kante zeigt und *Tür*
 * gewählt hat, bekommt eine Wand mit einer Tür darin und keine freistehende
 * Tür: Das ist, was er gemeint hat, und es spart den Zwischenschritt, den
 * sonst jeder zweimal vergisst.
 */
export function setWall(plan: NavGraph, spot: PlanSpot, kind: WallKind): PlanEdit {
  const dir = spot.dir;
  if (dir === null) return NOTHING;
  if (!plan.has(spot.tile)) return NOTHING;

  const before = plan.wall(spot.tile, dir);
  if (before?.kind === kind) {
    // Zweimal dasselbe auf dieselbe Kante ist kein Fehler, sondern die
    // häufigste Handbewegung überhaupt: Man malt eine Wand entlang und
    // erwischt eine Kachel doppelt.
    return NOTHING;
  }
  if (kind === 'door') {
    // Türen tragen einen Namen, unter dem eine Meinung sie kennt
    // (`navBelief.ts`) — ohne ihn kann sich niemand über sie irren, und die
    // halbe Hälfte des NPC-Verhaltens fällt weg. Der Name kommt aus der
    // Kante und ist damit stabil: dieselbe Kante, dieselbe Tür.
    setDoor(plan, spot.tile, dir, doorName(spot.tile, dir), true);
    return { changed: true, says: 'Tür' };
  }
  plan.setWall(spot.tile, dir, { kind });
  return { changed: true, says: 'Wand' };
}

/**
 * **Der Radiergummi**, und er räumt in der Reihenfolge auf, in der man es
 * meint: erst die Tür, dann die Wand, dann den Boden.
 *
 * Wer auf eine Tür zeigt und löscht, will die Tür los und nicht die halbe
 * Wand. Wer danach noch einmal drückt, will die Wand los. Und wer auf die
 * Mitte einer Kachel zeigt, meint den Boden — dort steht keine Wand, über die
 * man sich streiten könnte.
 */
export function erase(plan: NavGraph, spot: PlanSpot): PlanEdit {
  if (spot.dir !== null) {
    const facts = plan.wall(spot.tile, spot.dir);
    if (facts?.kind === 'door') {
      plan.setWall(spot.tile, spot.dir, { kind: 'solid' });
      return { changed: true, says: 'Tür weg — Wand steht noch' };
    }
    if (facts) {
      plan.clearWall(spot.tile, spot.dir);
      return { changed: true, says: 'Wand weg' };
    }
  }
  // Keine Wand an der Kante, auf die gezeigt wurde: Dann war der Boden
  // gemeint, denn etwas anderes gibt es dort nicht.
  return setFloor(plan, spot.tile, false);
}

/** Der Name, unter dem eine Tür an dieser Kante im Plan steht. */
export function doorName(tile: TileKey, dir: Dir): string {
  // Normiert über `neighbour`: Dieselbe Kante von der anderen Seite gesehen
  // ergibt denselben Namen, sonst hieße eine Tür je nach Blickrichtung anders
  // und stünde nach dem zweiten Druck zweimal im Plan.
  const other = neighbour(tile, dir);
  const [a, b] = tile < other ? [tile, other] : [other, tile];
  return `tuer:${a}:${b}`;
}

/**
 * **Einen Plan durch einen anderen ersetzen** — Kachel für Kachel, Wand für
 * Wand.
 *
 * Es gibt keinen anderen Weg: Ein `NavGraph` ist ein lebendes Objekt, an dem
 * Zeiger hängen (die Welt zeichnet daraus, NPCs laufen darauf), und ihn
 * auszutauschen hieße, alle diese Zeiger nachzuziehen. Also wird sein *Inhalt*
 * ausgetauscht.
 *
 * **Die Wände zuerst wegräumen und dann die Kacheln**: `removeTile` lässt eine
 * Wand stehen, an der noch die Nachbarkachel hängt — und wer sie danach
 * wegnehmen will, findet die Kachel nicht mehr, an der sie hing.
 */
export function replacePlan(target: NavGraph, source: NavGraph): void {
  for (const key of [...target.tileKeys()]) {
    for (const dir of DIRS) target.clearWall(key, dir);
  }
  for (const key of [...target.tileKeys()]) target.removeTile(key);

  for (const key of source.tileKeys()) target.setTile(key, { ...source.tile(key) });
  // Wände kommen über ihre Kachel und ihre Richtung herüber und nicht über
  // ihren Schlüssel: `setWall` normiert ihn ohnehin, und aus einem
  // Wandschlüssel allein käme man nicht an die Kachel zurück, an der er hängt.
  for (const key of source.tileKeys()) {
    for (const dir of DIRS) {
      const facts = source.wall(key, dir);
      if (!facts) continue;
      target.setWall(key, dir, { ...facts });
    }
  }
  for (const link of source.links()) target.addLink({ ...link });
}

// --- der Ausschnitt, den es zu sehen gibt ---------------------------------

/** Die Ecken eines Plans in Metern — leer, wenn er leer ist. */
export interface PlanBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  /** Ob überhaupt etwas darin steht. */
  any: boolean;
}

/**
 * Wie groß der Plan ist, in Metern.
 *
 * **Mit einer Kachel Rand ringsherum**, und das ist keine Kosmetik: Ein Modell,
 * das genau an seiner äußersten Kachel endet, hat keinen Platz, an dem man die
 * nächste anbauen könnte — man zeigt daneben und trifft nichts. Der Rand ist
 * die Einladung, weiterzubauen, und wie groß sie ausfällt, sagt `margin`: Der
 * Teller unter dem Modell nimmt eine Kachel, die Fläche, auf die man zeigen
 * kann, deutlich mehr (`WorldEditor`, `FIELD_MARGIN`).
 */
export function planBounds(plan: NavGraph, margin = 1): PlanBounds {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  let any = false;
  for (const key of plan.tileKeys()) {
    any = true;
    minX = Math.min(minX, keyX(key));
    maxX = Math.max(maxX, keyX(key));
    minZ = Math.min(minZ, keyZ(key));
    maxZ = Math.max(maxZ, keyZ(key));
  }
  // **Ein leerer Plan bekommt trotzdem eine Fläche**, und zwar den Rand als
  // Ganzes: Wer in einer Welt anfängt, in der noch nichts steht, hat sonst
  // nichts, worauf er zeigen könnte — und käme nie zur ersten Kachel.
  if (!any) {
    const reach = (margin + 1) * TILE;
    return { minX: -reach, minZ: -reach, maxX: reach, maxZ: reach, any: false };
  }
  return {
    minX: (minX - margin) * TILE,
    minZ: (minZ - margin) * TILE,
    maxX: (maxX + 1 + margin) * TILE,
    maxZ: (maxZ + 1 + margin) * TILE,
    any: true,
  };
}

/** Die Mitte eines Plans in Metern — der Punkt, um den seine Miniatur steht. */
export function planCentre(plan: NavGraph): { x: number; z: number } {
  const box = planBounds(plan);
  return { x: (box.minX + box.maxX) / 2, z: (box.minZ + box.maxZ) / 2 };
}

// --- womit man anfängt ----------------------------------------------------

/**
 * **Der Grundriss, mit dem der Editor aufmacht**: ein Zimmer mit einer Tür.
 *
 * Nicht leer, und das ist der ganze Grund: Eine leere Ebene beantwortet die
 * erste Frage nicht, die jeder hat — *wie sieht denn eine Wand hier aus?*. Ein
 * Zimmer beantwortet sie in einem Blick, und wer es nicht will, löscht es in
 * zehn Sekunden.
 */
export function starterPlan(): NavGraph {
  const plan = new NavGraph([0]);
  fillRect(plan, { x: -3, z: -3, w: 6, d: 6 });
  wallRect(plan, { x: -3, z: -3, w: 6, d: 6 });
  // Eine Tür in der Südwand, damit man beides einmal gesehen hat.
  const doorTile = tileKey(0, 2, 0);
  setDoor(plan, doorTile, DIR_S, doorName(doorTile, DIR_S), true);
  return plan;
}

// --- Meter und Kacheln, für alles, was mit dem Finger zeigt ----------------

/**
 * **Worauf jemand zeigt** — eine Kachel oder eine ihrer Kanten.
 *
 * Die eine Rechnung, an der ein Kacheleditor steht oder fällt. Ein Punkt auf
 * dem Boden ist immer *in* einer Kachel; ob damit die Kachel gemeint ist oder
 * die Wand an ihrem Rand, entscheidet der Abstand zur nächsten Kante. Wer das
 * nicht trennt, hat einen Editor, in dem man Wände nur trifft, wenn man
 * millimetergenau auf die Fuge zeigt — und das geht in der Brille auf drei
 * Meter Entfernung nicht.
 *
 * `band` ist der Streifen an der Kante, der als Kante zählt, in Metern. Er ist
 * absichtlich breit: Die Mitte einer Kachel ist ein großes Ziel, ihre Kante
 * eine Linie, und die Linie braucht deshalb die Hilfe.
 */
export function spotAt(x: number, z: number, level = 0, band = TILE * 0.28): PlanSpot {
  const tx = tileIndexAt(x);
  const tz = tileIndexAt(z);
  const tile = tileKey(tx, tz, level);
  const dx = x - tileCentreX(tile);
  const dz = z - tileCentreZ(tile);
  const half = TILE / 2;
  // Der Abstand zu den vier Kanten — die kleinste gewinnt, sofern sie
  // überhaupt im Streifen liegt.
  const gaps: [Dir, number][] = [
    [DIR_N, half + dz],
    [DIR_E, half - dx],
    [DIR_S, half - dz],
    [DIR_W, half + dx],
  ];
  let best: Dir | null = null;
  let bestGap = band;
  for (const [dir, gap] of gaps) {
    if (gap >= bestGap) continue;
    bestGap = gap;
    best = dir;
  }
  return { tile, dir: best };
}

/**
 * Wo eine Kante in der Welt liegt: ihre Mitte und wie sie läuft.
 *
 * Für die Vorschau unter dem Zeiger — man soll sehen, *welche* Wand man gleich
 * baut, bevor man sie baut.
 */
export function edgeAt(
  tile: TileKey,
  dir: Dir,
): {
  x: number;
  z: number;
  /** Ob die Kante in X läuft (Nord/Süd) oder in Z (Ost/West). */
  alongX: boolean;
} {
  const x = tileCentreX(tile);
  const z = tileCentreZ(tile);
  const half = TILE / 2;
  if (dir === DIR_N) return { x, z: z - half, alongX: true };
  if (dir === DIR_S) return { x, z: z + half, alongX: true };
  if (dir === DIR_E) return { x: x + half, z, alongX: false };
  return { x: x - half, z, alongX: false };
}

/**
 * Dieselbe Kante, aber von der anderen Kachel aus benannt.
 *
 * Nur für die Anzeige: Der Graph normiert sie ohnehin (`wallKey`), und wer sie
 * zeichnen will, braucht trotzdem eine der beiden Seiten.
 */
export function flipEdge(spot: PlanSpot): PlanSpot {
  if (spot.dir === null) return spot;
  const other = neighbour(spot.tile, spot.dir);
  if (other === NO_TILE) return spot;
  return { tile: other, dir: opposite(spot.dir) };
}

/** Auf welcher Etage ein Plan gerade bearbeitet wird — heute immer die erste. */
export function planLevel(tile: TileKey): number {
  return keyLevel(tile);
}
