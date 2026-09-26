import { DOOR_X, FRIDGE, PASS_END, ROOM, STREET, TABLES } from './plateUpPlan';

/**
 * **Die Einrichtung des Burgerladens** — alles, was nur da ist, damit es ein
 * Laden ist: Wände, Fenster, Bilder, Lampen, Pflanzen, Straße. Ohne three.js.
 *
 * Jedes Stück kommt aus dem gekauften KayKit-Regal, und zwar auf zwei Wegen:
 *
 * - `diner` — ein Knoten aus dem Restaurant-Katalog (`core/dinerFit.ts`,
 *   _Restaurant Bits_), schon auf halbe Größe gebracht wie die Möbel der
 *   Testküche. Wände, Tische, Stühle, Kühlschrank, Dunstabzug.
 * - `kaykit` — eine Datei aus dem Regal (`core/kaykitModel.ts`), und die wird
 *   auf eine **Höhe** eingepasst (`height`), statt einem Paketmaßstab zu
 *   vertrauen: Eine Stehlampe aus _Furniture Bits_ und ein Busch aus _City
 *   Builder Bits_ sind in verschiedenen Welten gebaut, und hier müssen sie
 *   neben einem Stuhl von 60 cm stehen.
 *
 * Liste statt Schleife mit Zufall: Ein Laden, der bei jedem Besuch anders
 * aussieht, ist einer, in dem man den Mülleimer sucht.
 */
export interface DecorPiece {
  readonly source: 'diner' | 'kaykit';
  /** Knotenname (`diner`) oder Regaladresse (`kaykit`). */
  readonly name: string;
  readonly x: number;
  readonly z: number;
  /** Höhe über dem Boden, wo das Stück ansetzt (Bilder an der Wand). */
  readonly y?: number;
  /** Gierwinkel: 0 schaut nach Süden (+Z) — so stehen die Stücke in der Quelle. */
  readonly yaw?: number;
  /** Nur `kaykit`: die Höhe in Metern, auf die das Stück gebracht wird. */
  readonly height?: number;
  /** Nur `kaykit`: statt der Höhe die Breite (flache Stücke wie ein Teppich). */
  readonly width?: number;
  /** Ob man dagegenläuft — ein Körper von der Grundfläche des Stücks. */
  readonly solid?: readonly [w: number, d: number];
  /** Die Südwand wird von oben durchsichtig, damit man in den Laden sieht. */
  readonly south?: boolean;
}

/** Halbe Drehung: das Stück schaut nach Norden. */
const N = Math.PI;
/** Nach Osten (+X). */
const E = Math.PI / 2;
/** Nach Westen (−X). */
const W = -Math.PI / 2;

/** Wandstücke sind zwei Kacheln breit (`dinerFit`, `wall`: 2 × 0,25 m). */
const WALL_HALF = 0.125;

function walls(): DecorPiece[] {
  const out: DecorPiece[] = [];
  const x0 = ROOM.x;
  const x1 = ROOM.x + ROOM.w;
  const z0 = ROOM.z;
  const z1 = ROOM.z + ROOM.d;
  // Nordwand: eine Wand und darüber, ab Arbeitshöhe, der Fliesenspiegel.
  for (let x = x0 + 1; x < x1; x += 2) {
    out.push({ source: 'diner', name: 'wall', x, z: z0 - WALL_HALF, yaw: 0 });
    out.push({ source: 'diner', name: 'wall_tiles_A', x, z: z0 + 0.02, yaw: 0 });
  }
  // West- und Ostwand: Küche gefliest, Gastraum mit Fenstern und Gardinen.
  for (let z = z0 + 1; z < z1; z += 2) {
    const kitchen = z < 4;
    const window = z === 7 || z === 9;
    const name = kitchen ? 'wall' : window ? 'wall_window_closed_curtains_red' : 'wall';
    out.push({ source: 'diner', name, x: x0 - WALL_HALF, z, yaw: E });
    out.push({ source: 'diner', name, x: x1 + WALL_HALF, z, yaw: W });
  }
  // Südwand: Fenster links und rechts, in der Mitte der Durchgang.
  const door = DOOR_X[0]! + 1;
  for (let x = x0 + 1; x < x1; x += 2) {
    const name = x === door ? 'wall_doorway' : x === 3 || x === 11 ? 'wall_window_open' : 'wall';
    out.push({ source: 'diner', name, x, z: z1 + WALL_HALF, yaw: N, south: true });
  }
  return out;
}

function tableSets(): DecorPiece[] {
  const out: DecorPiece[] = [];
  for (const t of TABLES) {
    const cx = t.x + 1;
    const cz = t.z + 1;
    const cloth =
      t.index % 2 === 0 ? 'table_round_B_tablecloth_red' : 'table_round_B_tablecloth_green';
    out.push({ source: 'diner', name: cloth, x: cx, z: cz, solid: [1.4, 1.4] });
    // Die Stühle drehen der Tischmitte den Rücken zu — `yaw` ist die Richtung,
    // in die man auf ihnen schaut.
    out.push({ source: 'diner', name: 'chair_A', x: t.seat.x, z: t.seat.z, yaw: 0 });
    out.push({ source: 'diner', name: 'chair_A', x: t.other.x, z: t.other.z, yaw: t.other.yaw });
    // Senf und Ketchup an den Rand, damit der Teller in der Mitte Platz hat.
    const side = t.other.x < cx ? -0.45 : 0.45;
    out.push({ source: 'diner', name: 'ketchup', x: cx + side, z: cz + 0.35, y: 0.5 });
    out.push({ source: 'diner', name: 'mustard', x: cx + side, z: cz + 0.15, y: 0.5 });
    out.push({ source: 'diner', name: 'menu', x: cx - side * 0.2, z: cz + 0.45, y: 0.5, yaw: N });
  }
  return out;
}

/**
 * **Das ganze Inventar** — Küche, Gastraum, Straße.
 *
 * Die Stationen stehen nicht hier (`plateUpPlan.STATIONS`): Sie sind Möbel
 * mit einer Regel, und die Welt baut sie zusammen mit ihrer Anmeldung.
 */
export const DECOR: readonly DecorPiece[] = [
  ...walls(),
  ...tableSets(),

  // --- Küche -------------------------------------------------------------
  {
    source: 'diner',
    name: 'fridge_A_decorated',
    x: FRIDGE.x + 0.5,
    z: FRIDGE.z + 0.5,
    yaw: 0,
    solid: [1, 1],
  },
  { source: 'diner', name: 'shelf_papertowel_decorated', x: 5.5, z: 0.5, yaw: 0 },
  { source: 'diner', name: 'kitchencabinet', x: 11.5, z: 0.5, yaw: 0 },
  { source: 'diner', name: 'kitchencabinet', x: 12.5, z: 0.5, yaw: 0 },
  {
    source: 'diner',
    name: 'kitchencounter_straight_decorated',
    x: PASS_END.x + 0.5,
    z: PASS_END.z + 0.5,
    yaw: N,
    solid: [1, 1],
  },
  { source: 'diner', name: 'pot_B_stew', x: 5.5, z: 0.55, y: 0.5 },
  { source: 'diner', name: 'jar_B_medium', x: 7.25, z: 0.3, y: 0.5 },
  { source: 'diner', name: 'jar_C_small', x: 7.45, z: 0.3, y: 0.5 },

  // --- Gastraum ----------------------------------------------------------
  {
    source: 'kaykit',
    name: 'furniture-bits/rug_rectangle_A.glb',
    x: 7,
    z: 7.9,
    yaw: E,
    width: 2.8,
  },
  { source: 'kaykit', name: 'furniture-bits/lamp_standing.glb', x: 0.45, z: 11.45, height: 1.45 },
  { source: 'kaykit', name: 'furniture-bits/lamp_standing.glb', x: 13.55, z: 11.45, height: 1.45 },
  { source: 'kaykit', name: 'furniture-bits/lamp_standing.glb', x: 13.55, z: 4.5, height: 1.45 },
  { source: 'kaykit', name: 'furniture-bits/cactus_medium_A.glb', x: 5.35, z: 11.5, height: 0.7 },
  { source: 'kaykit', name: 'furniture-bits/cactus_medium_B.glb', x: 8.65, z: 11.5, height: 0.7 },
  {
    source: 'kaykit',
    name: 'mixed-bag/gumball_machine.glb',
    x: 0.5,
    z: 4.5,
    height: 0.9,
    solid: [0.5, 0.5],
  },
  {
    source: 'kaykit',
    name: 'mixed-bag/slushy_machine_pink.glb',
    x: 12.5,
    z: 11.4,
    height: 0.9,
    yaw: N,
    solid: [0.7, 0.6],
  },
  {
    source: 'kaykit',
    name: 'furniture-bits/pictureframe_large_A.glb',
    x: 0.03,
    z: 5.1,
    y: 0.95,
    yaw: E,
    height: 0.6,
  },
  {
    source: 'kaykit',
    name: 'furniture-bits/pictureframe_large_B.glb',
    x: 13.97,
    z: 5.1,
    y: 0.95,
    yaw: W,
    height: 0.6,
  },
  {
    source: 'kaykit',
    name: 'furniture-bits/pictureframe_medium.glb',
    x: 0.03,
    z: 10.9,
    y: 1.0,
    yaw: E,
    height: 0.45,
  },
  {
    source: 'kaykit',
    name: 'furniture-bits/pictureframe_medium.glb',
    x: 13.97,
    z: 10.9,
    y: 1.0,
    yaw: W,
    height: 0.45,
  },
  {
    source: 'kaykit',
    name: 'furniture-bits/shelf_B_small_decorated.glb',
    x: 13.6,
    z: 2.2,
    yaw: W,
    height: 1.2,
    solid: [0.5, 1],
  },

  // --- Straße ------------------------------------------------------------
  {
    source: 'kaykit',
    name: 'city-builder-bits/streetlight.glb',
    x: STREET.x + 1.5,
    z: STREET.z + 0.4,
    height: 2.6,
  },
  {
    source: 'kaykit',
    name: 'city-builder-bits/streetlight.glb',
    x: STREET.x + STREET.w - 1.5,
    z: STREET.z + 0.4,
    height: 2.6,
  },
  {
    source: 'kaykit',
    name: 'city-builder-bits/bench.glb',
    x: 2.5,
    z: STREET.z + 0.5,
    height: 0.55,
    solid: [1.2, 0.5],
  },
  {
    source: 'kaykit',
    name: 'city-builder-bits/bench.glb',
    x: 11.5,
    z: STREET.z + 0.5,
    height: 0.55,
    solid: [1.2, 0.5],
  },
  {
    source: 'kaykit',
    name: 'city-builder-bits/bush_A.glb',
    x: 0.8,
    z: STREET.z + 0.45,
    height: 0.45,
  },
  {
    source: 'kaykit',
    name: 'city-builder-bits/bush_B.glb',
    x: 4.6,
    z: STREET.z + 0.45,
    height: 0.45,
  },
  {
    source: 'kaykit',
    name: 'city-builder-bits/bush_A.glb',
    x: 9.4,
    z: STREET.z + 0.45,
    height: 0.45,
  },
  {
    source: 'kaykit',
    name: 'city-builder-bits/bush_C.glb',
    x: 13.2,
    z: STREET.z + 0.45,
    height: 0.45,
  },
  {
    source: 'kaykit',
    name: 'city-builder-bits/car_taxi.glb',
    x: 12,
    z: STREET.z + 3.3,
    yaw: W,
    height: 1.1,
  },
];
