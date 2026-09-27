import { PLAN_FLOOR_T } from '../editor/levelPlan';
import { GridPlan } from '../grid/gridPlan';
import {
  planShelfWalls,
  SHELF_WALL_Y,
  SHELF_WINDOW_PIECES,
  type ShelfWall,
} from '../grid/shelfWalls';
import { HAZARD_FIRE } from '../nav/navProfile';
import { DIR_E, DIR_N, DIR_S, DIR_W, tileKey, type Dir, type TileKey } from '../nav/navTile';
import type { Slope } from '../nav/cellGrid';
import type { PlateTile } from '../shared/plateField';
import { PLATE_PROTOTYPE } from '../test/floorPlate';

/**
 * **Test Navigation** — Prüfstände, an denen man einem NPC beim Wegfinden
 * zusieht.
 *
 * Gewünscht: _„eine Test Navigation Welt. In der mehrere Tests aufgebaut sind,
 * die man sich anschauen kann wie der npc langlaufen wird (mit einem Button
 * zum Start des Test). Z.B. eben das mit den schrägen und einer Treppe, oder
 * einer Treppe mit einem Lava Boden am Ende dass den npc töten würde und er am
 * Ende nach links gehen müsste. … es gibt ein grünes start platte und eine
 * blaues Ziel floor für jeden Test."_
 *
 * **Jeder Test ist eine Kammer mit Fensterwänden**: Der NPC kommt nur auf dem
 * Weg hinaus, den der Test prüft, und man sieht ihm von außen dabei zu. Vor
 * jeder Kammer steht ein roter Knopf (`NavTestWorld`), drinnen eine grüne
 * Start- und eine blaue Zielplatte.
 *
 * **Die Wände sind nur aus dem Regal** — gewünscht: _„keine eigenen Wände
 * nutzen, sondern nur die kaykit Wall Elemente"_. Im Plan stehen sie als feste
 * Wände und Schrägen, damit ein Test die Wegsuche ohne Szene nachrechnen
 * kann; die Welt räumt sie aus dem Plan (`shelfWalls.clearPlanWalls`) und
 * stellt an ihre Stelle die Stücke aus `navTestWalls`.
 *
 * Reine Rechnung, ohne Szene: Die Welt baut daraus, und ein Test läuft
 * denselben Plan mit derselben Wegsuche ab (`navTestPlan.test.ts`).
 */

/** Wo auf dem Gitter etwas steht: Kachel und Etage. */
export interface NavSpot {
  readonly x: number;
  readonly z: number;
  readonly level: number;
}

export interface NavTest {
  readonly id: string;
  /** Die Aufschrift des Knopfs. */
  readonly title: string;
  /** Die Zeile darunter: was man sehen soll. */
  readonly body: string;
  /** Die Kammer: ein Kachelrechteck auf Etage 0. */
  readonly room: { readonly x: number; readonly z: number; readonly w: number; readonly d: number };
  /** Die grüne Platte — hier steht der NPC, wenn es losgeht. */
  readonly start: NavSpot;
  /** Die blaue Platte — hierhin soll er. */
  readonly goal: NavSpot;
  /** Die Kachel vor der Kammer, auf der der Knopf steht. */
  readonly button: { readonly x: number; readonly z: number };
  /**
   * **Das Tor**: die Randkachel, durch deren Süd- (oder, mit `dir`, West-)kante
   * der Spieler in die Kammer kommt — ein Durchgang aus dem Regal
   * (`GATE_MODEL`). Für die NPCs bleibt die Kante eine Wand
   * (`NavTestWorld.navReady`).
   */
  readonly gate: { readonly x: number; readonly z: number; readonly dir?: typeof DIR_W };
}

/** Wie hoch eine Etage ist — dieselbe Zahl wie in der Sandbox (`test/layout.STOREY`). */
export const STOREY = 2.8;
export const LEVELS: readonly number[] = [0, STOREY];

/** Wie viele Kacheln eine Treppe braucht: 2,80 m zu 0,70 m je Kachel. */
const STAIR_LENGTH = 4;

/**
 * **1 · Der schräge Gang** — zwei Wände unter 45°, zwei Kacheln auseinander,
 * von Wand zu Wand der Kammer. Es gibt nur den Weg zwischen ihnen hindurch.
 */
const SLANT = { x: 0, z: 0, w: 8, d: 8 } as const;

/**
 * **4 · Der enge schräge Gang** — dieselbe Kammer, die zweite Schräge eine
 * Kachel näher an der ersten. Gewünscht: _„einen Test mit 45° Wände die aber
 * einen näher aneinander stehen"_.
 */
const NARROW = { x: 29, z: 0, w: 8, d: 8 } as const;

/**
 * **5 · Der engste schräge Gang** — noch eine Kachel näher: Zwischen den
 * beiden Schrägen bleibt eine einzige Kachelreihe (`x + z = 6`). Gewünscht:
 * _„noch ein Test mit einem noch engeren Gang"_. Der Gang stößt nicht an die
 * Südwand, also steht sein Tor in der Westwand.
 */
const NARROWEST = { x: 40, z: 0, w: 8, d: 8 } as const;

/**
 * **2 · Die Treppe** — eine Treppe auf ein Podest, oben das Ziel.
 */
const STAIRS = { x: 11, z: 0, w: 5, d: 10 } as const;
const STAIRS_X = STAIRS.x + 2;

/**
 * **3 · Treppe und Lava** — oben geradeaus liegt Lava, und dahinter das Ziel.
 * Rechts ist die Kammer zu Ende; es geht nur links herum.
 */
const LAVA_ROOM = { x: 19, z: 0, w: 7, d: 10 } as const;
const LAVA_STAIRS_X = LAVA_ROOM.x + 5;

/** Das Podest oben: die nördlichen vier Kachelreihen einer Kammer. */
const DECK_DEPTH = 4;

/**
 * **Die Lava auf dem Podest**: zwei Reihen quer vor dem Ziel, vom rechten Rand
 * bis zwei Kacheln vor den linken — der Durchgang links ist genau so breit wie
 * ein 2 × 2-Block.
 */
export const LAVA = { x: LAVA_ROOM.x + 2, z: LAVA_ROOM.z + 1, w: 5, d: 2, level: 1 } as const;

export const NAV_TESTS: readonly NavTest[] = [
  {
    id: 'schraege',
    title: '1 · Schräger Gang',
    body: 'Zwischen zwei 45°-Wänden hindurch',
    room: SLANT,
    start: { x: SLANT.x, z: SLANT.z + SLANT.d - 1, level: 0 },
    goal: { x: SLANT.x + SLANT.w - 1, z: SLANT.z, level: 0 },
    button: { x: SLANT.x + 1, z: SLANT.z + SLANT.d + 1 },
    gate: { x: SLANT.x, z: SLANT.z + SLANT.d - 1 },
  },
  {
    id: 'treppe',
    title: '2 · Treppe',
    body: 'Die Treppe hinauf aufs Podest',
    room: STAIRS,
    start: { x: STAIRS_X, z: STAIRS.z + STAIRS.d - 1, level: 0 },
    goal: { x: STAIRS_X, z: STAIRS.z, level: 1 },
    button: { x: STAIRS_X + 1, z: STAIRS.z + STAIRS.d + 1 },
    gate: { x: STAIRS.x, z: STAIRS.z + STAIRS.d - 1 },
  },
  {
    id: 'lava',
    title: '3 · Treppe und Lava',
    body: 'Oben geradeaus Lava — er muss links herum',
    room: LAVA_ROOM,
    start: { x: LAVA_STAIRS_X, z: LAVA_ROOM.z + LAVA_ROOM.d - 1, level: 0 },
    goal: { x: LAVA_STAIRS_X, z: LAVA_ROOM.z, level: 1 },
    button: { x: LAVA_STAIRS_X - 1, z: LAVA_ROOM.z + LAVA_ROOM.d + 1 },
    gate: { x: LAVA_ROOM.x, z: LAVA_ROOM.z + LAVA_ROOM.d - 1 },
  },
  {
    id: 'eng',
    title: '4 · Enger schräger Gang',
    body: 'Die 45°-Wände eine Kachel näher',
    room: NARROW,
    start: { x: NARROW.x, z: NARROW.z + NARROW.d - 1, level: 0 },
    goal: { x: NARROW.x + NARROW.w - 1, z: NARROW.z, level: 0 },
    button: { x: NARROW.x + 1, z: NARROW.z + NARROW.d + 1 },
    gate: { x: NARROW.x, z: NARROW.z + NARROW.d - 1 },
  },
  {
    id: 'engste',
    title: '5 · Engster schräger Gang',
    body: 'Nur eine Kachelreihe zwischen den 45°-Wänden',
    room: NARROWEST,
    start: { x: NARROWEST.x, z: NARROWEST.z + 6, level: 0 },
    goal: { x: NARROWEST.x + 6, z: NARROWEST.z, level: 0 },
    button: { x: NARROWEST.x + 1, z: NARROWEST.z + NARROWEST.d + 1 },
    gate: { x: NARROWEST.x, z: NARROWEST.z + 6, dir: DIR_W },
  },
];

/** Das Tor aus dem Regal: eine Kachel breit, 2,1 m Öffnung (`props.MODEL_ARCHES`). */
export const GATE_MODEL = 'prototype-bits/Wall_Doorway.glb';

/** Der Boden, auf dem man zwischen den Kammern herumläuft. */
export const GROUND = { x: -4, z: -4, w: 56, d: 22 } as const;

/** Wo man ankommt: vor der Mitte der Reihe, mit Blick auf alle Kammern. */
export const SPAWN = { x: 23.5, z: 15.5 } as const;

/**
 * **Der Plan der Welt**: Boden, drei Kammern, die Schrägen, zwei Treppen auf
 * ihre Podeste und die Lava.
 */
export function navTestPlan(): GridPlan {
  const plan = new GridPlan([...LEVELS]);
  plan.floor(GROUND);
  for (const test of NAV_TESTS) wallRing(plan, test.room, 0);

  // 1 · Die beiden Schrägen „╱", jede von Wand zu Wand der Kammer.
  slant(plan, SLANT, 5);
  slant(plan, SLANT, 9);
  // 4 · Dieselbe erste, die zweite eine Kachel näher.
  slant(plan, NARROW, 5);
  slant(plan, NARROW, 8);
  // 5 · Und noch eine näher.
  slant(plan, NARROWEST, 5);
  slant(plan, NARROWEST, 7);

  // 2 und 3 · Podest und Treppe — der Boden oben liegt, bevor die Treppe ihr
  // Loch schlägt (`GridPlan.stairs`, wie beim Podest der Sandbox).
  for (const [room, stairX] of [
    [STAIRS, STAIRS_X],
    [LAVA_ROOM, LAVA_STAIRS_X],
  ] as const) {
    const deck = { x: room.x, z: room.z, w: room.w, d: DECK_DEPTH };
    plan.floor({ ...deck, level: 1 });
    plan.stairs(stairX, room.z + DECK_DEPTH - 1 + STAIR_LENGTH, DIR_N, 0, STAIR_LENGTH);
    wallRing(plan, deck, 1, { x: stairX, z: deck.z + deck.d - 1, dir: DIR_S });
    // Vier Säulen unter den Ecken, bis unter den Boden des Podests.
    const east = deck.x + deck.w - 1,
      south = deck.z + deck.d - 1;
    for (const x of [deck.x, east])
      for (const z of [deck.z, south]) plan.put('pillar', x, z, DIR_N, 0, STOREY - PLAN_FLOOR_T);
  }

  // 3 · Die Lava: eine Gefahr im Graphen (`TileFacts.hazard`) — ein Mensch
  // plant nicht hindurch (`HUMAN_PROFILE`), und wer doch hineingerät, stirbt
  // (`NavTestWorld.burn`).
  plan.floor(LAVA, { hazard: HAZARD_FIRE });
  return plan;
}

/**
 * **Eine Schräge „╱" quer durch eine quadratische Kammer** — alle Kacheln mit
 * `x + z = sum` (in den Koordinaten der Kammer), von Wand zu Wand.
 */
function slant(plan: GridPlan, room: { x: number; z: number; w: number }, sum: number): void {
  for (let x = 0; x < room.w; x++) {
    const z = sum - x;
    if (z < 0 || z >= room.w) continue;
    plan.slope(room.x + x, room.z + z, 'slash' satisfies Slope);
  }
}

/**
 * **Die Wände der Welt als Stücke aus dem Regal** — die geraden aus der
 * Fensterwand (`Wall_Window_Closed`, am Ende `…_Narrow`), damit man in die
 * Kammern hineinsieht, die Schrägen aus der Prototypwand (`Wall.glb`) und
 * in jeder Kammer ein Tor (`GATE_MODEL`), wo der Plan die Kante zu hat.
 */
export function navTestWalls(): ShelfWall[] {
  const plan = navTestPlan();
  for (const test of NAV_TESTS) plan.graph.clearWall(gateTile(test), gateDir(test));
  const walls = planShelfWalls(plan, SHELF_WINDOW_PIECES);
  for (const test of NAV_TESTS) {
    const { x, z } = test.gate;
    walls.push(
      gateDir(test) === DIR_W
        ? { path: GATE_MODEL, x, y: SHELF_WALL_Y, z: z + 0.5, yaw: Math.PI / 2 }
        : { path: GATE_MODEL, x: x + 0.5, y: SHELF_WALL_Y, z: z + 1, yaw: 0 },
    );
  }
  return walls;
}

/** An welcher Kante seiner Kachel das Tor steht: Süd, außer es ist anders gesagt. */
export function gateDir(test: NavTest): Dir {
  return test.gate.dir ?? DIR_S;
}

/** Die Kachel innen am Tor — das Tor ist ihre Kante `gateDir`. */
export function gateTile(test: NavTest): TileKey {
  return tileKey(test.gate.x, test.gate.z, 0);
}

/**
 * **Ein Ring aus Wänden um ein Kachelrechteck**. `gap` lässt eine Kante offen
 * (die Mündung der Treppe).
 */
function wallRing(
  plan: GridPlan,
  rect: { x: number; z: number; w: number; d: number },
  level: number,
  gap?: { x: number; z: number; dir: Dir },
): void {
  const east = rect.x + rect.w - 1,
    south = rect.z + rect.d - 1;
  const put = (x: number, z: number, dir: Dir): void => {
    if (gap && gap.x === x && gap.z === z && gap.dir === dir) return;
    plan.wall(x, z, dir, level);
  };
  for (let x = rect.x; x <= east; x++) {
    put(x, rect.z, DIR_N);
    put(x, south, DIR_S);
  }
  for (let z = rect.z; z <= south; z++) {
    put(rect.x, z, DIR_W);
    put(east, z, DIR_E);
  }
}

/** Die Mitte einer Kachel in Metern. */
export function tileCentre(tile: number): number {
  return tile + 0.5;
}

/**
 * **Der Boden ist nur aus dem Regal** — gewünscht: _„Bei der Test Welt der
 * Boden soll bitte nur aus kaykit floor prototype Sachen bestehen außer die
 * Lava, aber dafür gibt es ja die Spikes. Und als Start und Ziel gibt es die
 * farbigen kitchen floor Grid Teile."_
 *
 * - **Überall der Prototyp-Boden** (`test/floorPlate.PLATE_PROTOTYPE`), wie in
 *   der Sandbox — auch auf den Podesten und den Treppenstufen.
 * - **Start grün, Ziel blau**: die kleinen Küchenfliesen aus dem Restaurant
 *   (`floor_kitchen_small_green` / `…_blue`), eine Kachel groß.
 * - **Die Lava bekommt keine Platte** (`null`): Dort liegt die Stachelfalle
 *   als eigener Boden (`NavTestWorld.fillSpikes`), und zwei Böden
 *   übereinander flimmern.
 */
export const START_FLOOR = 'restaurant-bits/floor_kitchen_small_green.glb';
export const GOAL_FLOOR = 'restaurant-bits/floor_kitchen_small_blue.glb';

/** Ob diese Kachel in der Lava liegt (`LAVA`). */
export function inLava(col: number, row: number, level: number): boolean {
  return (
    level === LAVA.level &&
    col >= LAVA.x &&
    col < LAVA.x + LAVA.w &&
    row >= LAVA.z &&
    row < LAVA.z + LAVA.d
  );
}

/** Die Mitten der Lavakacheln, in Metern — eine Stachelfalle je Kachel. */
export function lavaSpots(): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = [];
  for (let dz = 0; dz < LAVA.d; dz++)
    for (let dx = 0; dx < LAVA.w; dx++)
      out.push({ x: tileCentre(LAVA.x + dx), z: tileCentre(LAVA.z + dz) });
  return out;
}

/** **Welche Platte auf welcher Kachel liegt** — eine Adresse aus dem Regal, oder `null`. */
export function navTestPlate(tile: PlateTile): string | null {
  const at = (spot: NavSpot): boolean =>
    spot.x === tile.col && spot.z === tile.row && spot.level === tile.level;
  if (inLava(tile.col, tile.row, tile.level)) return null;
  if (NAV_TESTS.some((test) => at(test.start))) return START_FLOOR;
  if (NAV_TESTS.some((test) => at(test.goal))) return GOAL_FLOOR;
  return PLATE_PROTOTYPE;
}
