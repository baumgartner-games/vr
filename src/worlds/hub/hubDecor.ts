import { DIRS, dirX, dirZ, type Dir } from '../nav/navTile';
import { HALL_HALF, type HubCorridor } from './hubGrid';

/**
 * **Die Ausstattung der Lobby** — Bögen über den Toren, Lampen an den
 * Mündungen, Bänke an den Wänden, Topfpflanzen in den Ecken. Ohne three.js.
 *
 * Gewünscht war ein Hub, der eine **Lobby** ist und kein Grundriss: ein Raum,
 * in dem man ankommt, sich umsieht und merkt, wohin es geht. Dezent mit
 * Absicht — die Tore sollen das Auffälligste bleiben. Jedes Stück kommt aus
 * dem gekauften KayKit-Regal (`core/kaykitHeight.kaykitAtHeight`) und wird auf
 * eine **Höhe** eingepasst, wie im Burgerladen (`plateup/plateUpDecor.ts`).
 *
 * Alle Maße in Metern **von der Hallenmitte aus**; eine Kachel ist ein Meter.
 * Die Halle reicht von −5 bis +5 Kacheln, ihre Wand steht also bei ±5,5 m, und
 * eine Gangmündung ist drei Kacheln breit (±1,5 m um die Achse).
 *
 * Liste statt Zufall: Eine Lobby, die bei jedem Besuch anders aussieht, ist
 * eine, in der man die Tür sucht.
 */
export interface HubPiece {
  /** Regaladresse (`models/kaykit/<…>`). */
  readonly path: string;
  readonly x: number;
  readonly z: number;
  /** Gierwinkel: 0 schaut nach Süden (+Z) — so stehen die Stücke in der Quelle. */
  readonly yaw: number;
  /** Die Höhe in Metern, auf die das Stück gebracht wird. */
  readonly height: number;
  /** Nur Bögen: zu welchem Gang (Index in der Liste der Gänge). */
  readonly corridor?: number;
}

/** Die vier Farben, in denen es die Bögen der Plattform-Kiste gibt. */
export type ArchColor = 'red' | 'yellow' | 'green' | 'blue';

/**
 * **Welche Bogenfarbe zur Akzentfarbe einer Welt passt** — die nächste im
 * Farbkreis. Der Burgerladen (Orange) bekommt Gelb, Haunting (Türkis) und der
 * Bauplatz (Himmelblau) Blau, die Testwelt (Grün) Grün.
 */
export function archColor(accent: number): ArchColor {
  const r = ((accent >> 16) & 0xff) / 255;
  const g = ((accent >> 8) & 0xff) / 255;
  const b = (accent & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 0.08) return 'blue';
  let hue: number;
  if (max === r) hue = ((g - b) / (max - min)) % 6;
  else if (max === g) hue = (b - r) / (max - min) + 2;
  else hue = (r - g) / (max - min) + 4;
  hue = (hue * 60 + 360) % 360;
  // Rot 0°, Gelb 50° (das KayKit-Gelb ist ein warmes), Grün 130°, Blau 210°.
  const centres: ReadonlyArray<readonly [ArchColor, number]> = [
    ['red', 0],
    ['yellow', 50],
    ['green', 130],
    ['blue', 210],
  ];
  let best: ArchColor = 'blue';
  let bestDistance = Infinity;
  for (const [name, centre] of centres) {
    const raw = Math.abs(hue - centre);
    const distance = Math.min(raw, 360 - raw);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = name;
    }
  }
  return best;
}

/** Wo die Wand der Halle steht, in Metern von der Mitte. */
export const HALL_WALL = HALL_HALF + 0.5;

/** Wie hoch ein Bogen über einer Gangmündung wird — gut über Kopfhöhe. */
export const ARCH_HEIGHT = 2.6;

/** Blickrichtung zur Hallenmitte für etwas, das im Gang `dir` steht. */
export function yawToCentre(dir: Dir): number {
  return Math.atan2(-dirX(dir), -dirZ(dir));
}

/**
 * **Ein Punkt an der Wand eines Gangs**: `along` Meter von der Mitte in
 * Gangrichtung, `across` quer dazu (nach rechts, vom Hineingehen aus gesehen).
 */
export function wallPoint(dir: Dir, along: number, across: number): { x: number; z: number } {
  const ax = dirX(dir);
  const az = dirZ(dir);
  // Rechts von der Gangrichtung: (−az, ax) — für Norden (0, −1) also Osten.
  return { x: ax * along - az * across, z: az * along + ax * across };
}

/**
 * **Die ganze Ausstattung** für diese Gänge und diese Akzentfarben (eine je
 * Gang, in derselben Reihenfolge).
 *
 * Je Gang: ein **Bogen** über der Mündung in der Farbe der Welt, zwei
 * **Stehlampen** links und rechts davon und eine **Bank** an der Wand rechts
 * daneben, zur Mitte gedreht. Je Ecke eine **Topfpflanze**. Wo kein Gang ist, steht
 * dennoch eine Bank — die Wand dort ist die längste der Halle.
 */
export function hubDecor(
  corridors: readonly HubCorridor[],
  accents: readonly number[],
): HubPiece[] {
  const out: HubPiece[] = [];
  const open = new Set<Dir>(corridors.map((one) => one.dir));

  corridors.forEach((corridor, index) => {
    const dir = corridor.dir;
    const yaw = yawToCentre(dir);
    const colour = archColor(accents[index] ?? 0x4aa8ff);
    const arch = wallPoint(dir, HALL_WALL + 0.3, 0);
    out.push({
      path: `platformer/${colour}/arch_tall_${colour}.glb`,
      x: arch.x,
      z: arch.z,
      yaw,
      height: ARCH_HEIGHT,
      corridor: index,
    });
    for (const side of [-1, 1] as const) {
      const lamp = wallPoint(dir, HALL_WALL - 0.45, side * 2.05);
      out.push({ path: 'furniture-bits/lamp_standing.glb', ...lamp, yaw, height: 1.55 });
    }
  });

  for (const dir of DIRS) {
    const bench = wallPoint(dir, HALL_WALL - 0.45, open.has(dir) ? 3.4 : 0);
    out.push({
      path: 'halloween-bits/bench.glb',
      ...bench,
      yaw: yawToCentre(dir),
      height: 0.42,
    });
  }

  const corner = HALL_WALL - 0.6;
  const bushes = ['furniture-bits/cactus_medium_A.glb', 'furniture-bits/cactus_medium_B.glb'];
  [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].forEach(([sx, sz], index) => {
    out.push({
      path: bushes[index % 2]!,
      x: sx! * corner,
      z: sz! * corner,
      yaw: (index * Math.PI) / 2,
      height: 0.9,
    });
  });

  return out;
}
