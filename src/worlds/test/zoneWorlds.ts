import { clearPlanWalls } from '../grid/shelfWalls';
import { GridPlan } from '../grid/gridPlan';
import type { NavRect } from '../nav/navBuild';
import { KART_FIELD, PIT_LANE } from '../kart/kartCourse';
import { CLIMB, EFFECTS, LEVELS, RANGE } from './layout';
import { WALL, fitClimb, stampClimb } from './zones/climb';
import { fitEffects, stampEffects } from './zones/effects';
import { fitKart, stampKart } from './zones/kart';
import { BERM, fitRange, stampRange } from './zones/range';

/**
 * **Die Grundrisse der vier Zonen-Testwelten** — Rennstrecke, Kletterwand,
 * Schießstand, Effekte (`ZoneWorld.ts`). Reine Rechnung, ohne three.js; der
 * Test daneben sieht nach, dass man dort ankommt, wo Boden ist, und dass die
 * Einbauten jeder Zone dastehen.
 *
 * Jeder Grundriss ist derselbe Dreischritt wie auf dem alten Gelände der
 * Sandbox, nur mit einer Zone statt neun: **eine Masse unter allem**
 * (`ground`), darauf **die Kacheln, auf denen gelaufen wird** (`walk`), dann
 * der Stempel der Zone. Die Planwände gehen am Ende wieder weg
 * (`clearPlanWalls`) — gebaut wird mit den Wänden aus dem Regal.
 */

/** Was eine Zonen-Testwelt braucht: ihren Grundriss und wo man ankommt. */
export interface ZoneWorldPlan {
  /** Die Masse unter allem, in Kacheln. */
  readonly ground: NavRect;
  /** Die begehbaren Kacheln. */
  readonly walk: readonly NavRect[];
  /** Wo man ankommt, als Kachel — auf einer der `walk`-Flächen. */
  readonly spawn: { x: number; z: number };
  /** Der Stempel der Zone: Wände, Bausteine, Massen und Einbauten. */
  stamp(plan: GridPlan): void;
}

/** Ein Rechteck, an jeder Seite um `by` Kacheln größer. */
function grown(rect: NavRect, by: number): NavRect {
  return { x: rect.x - by, z: rect.z - by, w: rect.w + 2 * by, d: rect.d + 2 * by };
}

/** **Aus dem Rezept einen Grundriss** — Masse, Kacheln, Zone, keine Planwände. */
export function zonePlan(recipe: ZoneWorldPlan): GridPlan {
  const plan = new GridPlan(LEVELS);
  plan.mass('floor', recipe.ground, -0.5, 0, { portal: true });
  for (const rect of recipe.walk) plan.floor(rect);
  recipe.stamp(plan);
  clearPlanWalls(plan);
  return plan;
}

/**
 * **Test Effekte** — vier Düsen mit je einem Knopf davor (`zones/effects.ts`).
 * Man kommt auf einem Vorplatz südlich der Reihe an, mit Abstand genug, um
 * alle vier Wolken auf einmal zu sehen, und schaut nach Norden auf sie.
 */
const EFFECTS_FORECOURT: NavRect = { x: EFFECTS.x, z: EFFECTS.z + EFFECTS.d, w: EFFECTS.w, d: 4 };

export const EFFECTS_WORLD: ZoneWorldPlan = {
  ground: grown({ ...EFFECTS, d: EFFECTS.d + EFFECTS_FORECOURT.d }, 4),
  walk: [EFFECTS, EFFECTS_FORECOURT],
  spawn: { x: 0, z: EFFECTS_FORECOURT.z + 2 },
  stamp: (plan) => {
    stampEffects(plan);
    fitEffects(plan);
  },
};

/**
 * **Test Schießstand** — drei Bahnen mit Scheiben auf 5, 10 und 20 m, der
 * Kugelfang dahinter (`zones/range.ts`). Die Masse reicht nach Osten bis
 * hinter den Kugelfang, denn dort stehen die Scheiben.
 */
export const RANGE_WORLD: ZoneWorldPlan = {
  ground: {
    x: RANGE.x - 4,
    z: BERM.z - 3,
    w: BERM.x + BERM.w + 3 - (RANGE.x - 4),
    d: BERM.d + 6,
  },
  walk: [RANGE],
  spawn: { x: RANGE.x + 3, z: RANGE.z + 3 },
  stamp: (plan) => {
    stampRange(plan);
    fitRange(plan);
  },
};

/**
 * **Test Kletterwand** — die Wand mit ihren Griffen, das Sprungkissen und die
 * Rampe davor (`zones/climb.ts`). Die Wandreihe selbst ist keine
 * Laufkachel: Eine acht Meter hohe Masse auf einem Weg wäre ein Weg, den man
 * nicht gehen kann. Man kommt am Südrand an, hinter dem Sprungkissen, und hat
 * die ganze Wand vor sich.
 */
export const CLIMB_WORLD: ZoneWorldPlan = {
  ground: grown({ x: CLIMB.x, z: WALL.z, w: CLIMB.w, d: CLIMB.d + WALL.d }, 4),
  walk: [CLIMB],
  spawn: { x: CLIMB.x + 5, z: CLIMB.z + CLIMB.d - 1 },
  stamp: (plan) => {
    stampClimb(plan);
    fitClimb(plan);
  },
};

/**
 * **Test Rennstrecke** — die Kartbahn mit Boxengasse und zwei Karts
 * (`zones/kart.ts`, `kart/kartCourse.ts`). Die Masse ist das ganze Gelände
 * der Strecke (`KART_FIELD`), gelaufen wird in der Gasse (`kartPit.stampPit`).
 * Man kommt am Südende der Gasse an, vor den Karts.
 */
export const KART_WORLD: ZoneWorldPlan = {
  ground: KART_FIELD,
  walk: [],
  spawn: { x: PIT_LANE.x + 1, z: PIT_LANE.z + PIT_LANE.d - 3 },
  stamp: (plan) => {
    stampKart(plan);
    fitKart(plan);
  },
};
