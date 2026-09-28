import type { ElementSpot } from '../elements/elementPlace';
import { FLOORING_CRATES, WALLPAPER_CRATES } from '../elements/elementCatalog';
import { GridPlan } from '../grid/gridPlan';
import {
  SHELF_WALL_PIECES,
  SHELF_WALL_Y,
  SHELF_WINDOW_PIECES,
  wallRun,
  type ShelfWall,
} from '../grid/shelfWalls';
import type { NavRect } from '../nav/navBuild';
import { DIR_N } from '../nav/navTile';

/**
 * **Hausbau** — eine Testwelt zum Bauen und Tapezieren.
 *
 * Gewünscht (September 2026): _„Ich würde gerne eine weitere Test Welt haben:
 * Hausbau, in der wir genau die Wände und co aufbauen und anpassen können. In
 * der Welt können vorratskisten von den Tapeten sein, sodass man unendlich
 * viele davon hat."_
 *
 * Auf einer Wiese aus Prototyp-Boden steht ein kleines Haus aus den Wänden des
 * Katalogs: zwei Zimmer, dazwischen eine Innentür, vorn eine breite Haustür,
 * in der Nordwand zwei Fenster. Davor, vor der Haustür, die sechs
 * Tapetenkisten (`WALLPAPER_CRATES`) und die sechs Bodenkisten
 * (`FLOORING_CRATES`). Alles andere baut man selbst — Wände
 * zieht man im _Baukasten_ aus dem Katalog.
 *
 * Reine Rechnung, ohne Szene; die Welt dazu ist `HausbauWorld`.
 */

/** Der Boden: 20 × 18 Kacheln. */
export const HOUSE_GROUND: NavRect = { x: 0, z: 0, w: 20, d: 18 };

/** Das Haus: 10 × 6 Kacheln, geteilt bei `PARTITION_X`. */
export const HOUSE: NavRect = { x: 4, z: 3, w: 10, d: 6 };

/** Die Innenwand zwischen Wohnzimmer (Westen) und Küche (Osten). */
export const PARTITION_X = 10;

/** Die Haustür in der Südwand: der breite Durchgang, zwei Kacheln ab hier. */
export const FRONT_DOOR_X = 6;

/** Die Innentür in der Trennwand: eine Kachel ab hier (z). */
export const INNER_DOOR_Z = 5;

/** Der breite Durchgang aus dem Regal — zwei Kacheln. */
export const WIDE_DOOR = 'prototype-bits/Wall_Doorway_Wide.glb';
/** Der schmale Durchgang — eine Kachel. */
export const NARROW_DOOR = 'prototype-bits/Wall_Doorway.glb';

/** Das Tor zurück in die Sandbox. */
export const HOUSE_GATE = 'tor-hausbau';
export const HOUSE_GATE_TILE = { x: 1, z: 16 } as const;

/** Wo man ankommt: vor dem Haus, mit Blick auf Tür und Kisten. */
export function houseSpawn(): { x: number; z: number } {
  return { x: 9.5, z: 14.5 };
}

/**
 * **Die Wände des Hauses** — Stücke aus dem Katalog auf den Fugen, gelegt wie
 * in der Test Navigation (`shelfWalls.wallRun`): die graue Prototypwand, zwei
 * Fensterwände im Norden, die breite Haustür im Süden und die schmale
 * Innentür in der Trennwand.
 */
export function houseWalls(): ShelfWall[] {
  const out: ShelfWall[] = [];
  const west = HOUSE.x;
  const east = HOUSE.x + HOUSE.w;
  const north = HOUSE.z;
  const south = HOUSE.z + HOUSE.d;
  const wall = SHELF_WALL_PIECES;
  const piece = (path: string, x: number, z: number, yaw: number): void => {
    out.push({ path, x, y: SHELF_WALL_Y, z, yaw });
  };

  // Norden: Wand, Fenster, Wand, Fenster, Wand.
  wallRun(out, true, north, west, 2, 0, wall);
  piece(SHELF_WINDOW_PIECES.full, west + 3, north, 0);
  wallRun(out, true, north, west + 4, 3, 0, wall);
  piece(SHELF_WINDOW_PIECES.full, west + 8, north, 0);
  wallRun(out, true, north, west + 9, east - west - 9, 0, wall);
  // Süden: Wand, Haustür, Wand.
  wallRun(out, true, south, west, FRONT_DOOR_X - west, 0, wall);
  piece(WIDE_DOOR, FRONT_DOOR_X + 1, south, 0);
  wallRun(out, true, south, FRONT_DOOR_X + 2, east - FRONT_DOOR_X - 2, 0, wall);
  // Westen und Osten.
  wallRun(out, false, west, north, HOUSE.d, 0, wall);
  wallRun(out, false, east, north, HOUSE.d, 0, wall);
  // Die Trennwand mit der Innentür.
  wallRun(out, false, PARTITION_X, north, INNER_DOOR_Z - north, 0, wall);
  piece(NARROW_DOOR, PARTITION_X, INNER_DOOR_Z + 0.5, Math.PI / 2);
  wallRun(out, false, PARTITION_X, INNER_DOOR_Z + 1, south - INNER_DOOR_Z - 1, 0, wall);
  return out;
}

/**
 * **Die Kisten** — vor dem Haus, eine Reihe mit Blick nach Norden: links die
 * sechs Tapeten, eine Kachel Lücke, rechts die sechs Bodenbeläge.
 */
export const HOUSE_SPOTS: readonly ElementSpot[] = [
  ...WALLPAPER_CRATES.map((crate, index): ElementSpot => ({
    id: `tapete-${index}`,
    element: crate.id,
    x: 3 + index,
    z: 11,
    face: 'N',
  })),
  ...FLOORING_CRATES.map((crate, index): ElementSpot => ({
    id: `boden-${index}`,
    element: crate.id,
    x: 10 + index,
    z: 11,
    face: 'N',
  })),
];

/** Ob die Kachel (`x`, `z`) auf dem Boden liegt. */
export function onHouseGround(x: number, z: number): boolean {
  const g = HOUSE_GROUND;
  return x >= g.x && x < g.x + g.w && z >= g.z && z < g.z + g.d;
}

/** **Der Plan**: der Boden und das Tor zurück. Die Wände sind Stücke (`houseWalls`). */
export function housePlan(): GridPlan {
  const plan = new GridPlan();
  plan.floor(HOUSE_GROUND);
  plan.putFixture({
    id: HOUSE_GATE,
    kind: 'gate',
    x: HOUSE_GATE_TILE.x,
    z: HOUSE_GATE_TILE.z,
    dir: DIR_N,
    props: {
      world: 'sandbox',
      label: '→ Sandbox',
      accent: 0x5ee0a0,
      note: 'Zurück in die Sandbox',
    },
  });
  return plan;
}
