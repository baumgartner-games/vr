/**
 * Das Gelände der Alpen: eine Höhe für jeden Punkt, aus nichts als Zahlen.
 *
 * Ein großer Berg in der Mitte, ein paar kleinere drum herum, dazwischen ein
 * Tal mit sanften Wellen — und drei Stellen, die absichtlich flach sind: die
 * **Startrampe** unterhalb des Gipfels, die **Landewiese** im Tal und ein
 * kleines Stück um das **Gipfelkreuz**. Alles
 * andere ist eine Summe aus Glockenkurven und etwas Rauschen mit Gedächtnis:
 * derselbe Berg bei jedem Besuch, derselbe bei allen Mitspielern, denn jede
 * Welt wird auf jedem Gerät neu gebaut und nicht übertragen.
 *
 * Kein three.js: die Welt liest hier ihre Höhen ab und baut daraus Mesh und
 * Höhenfeld — mit denselben Zahlen, damit man nie *neben* dem steht, was man
 * sieht. Der Test prüft, was man einem Berg sonst nur ansieht: dass er nirgends
 * unter null geht, dass der Gipfel der höchste Punkt ist, dass die Wiese eben
 * ist und dass die Karte am Rand flach ausläuft.
 */

/** Kantenlänge der Karte in Metern, um den Ursprung zentriert. */
export const TERRAIN_SIZE = 1000;
/** Zellen je Kante — bei einem Kilometer sind das gut sechs Meter pro Zelle. */
export const TERRAIN_CELLS = 160;

/** Bis hier wächst Wald; darüber nur Gras und Fels. */
export const TREE_LINE = 125;
/** Ab hier liegt Schnee. */
export const SNOW_LINE = 175;

interface Peak {
  x: number;
  z: number;
  /** Höhe über dem Tal, in Metern. */
  height: number;
  /** Wie breit der Berg ist — bei diesem Abstand ist noch ein Drittel der Höhe da. */
  spread: number;
}

/** Der große Berg zuerst, dann die Nachbarn. */
const PEAKS: readonly Peak[] = [
  { x: 0, z: -150, height: 240, spread: 210 },
  { x: 260, z: 40, height: 150, spread: 150 },
  { x: -290, z: 120, height: 125, spread: 140 },
  { x: 170, z: -330, height: 170, spread: 150 },
  { x: -250, z: -320, height: 115, spread: 130 },
  { x: 330, z: -160, height: 95, spread: 110 },
  { x: -120, z: 360, height: 70, spread: 120 },
];

/** Die Landewiese im Tal: flach, groß, gut zu sehen. */
export const LANDING = { x: 0, z: 210, radius: 55, height: 5 };

/** Wo die Startrampe steht: die Südschulter des großen Berges, Blick ins Tal. */
export const LAUNCH_SITE = { x: 0, z: -95, radius: 12 };

/**
 * Wie breit der Rand des Startplatzes ist, mit dem er ins Gelände übergeht —
 * **zum Tal hin schmal, zum Gipfel hin breit.**
 *
 * Der Startplatz ist in die Flanke des Berges geschnitten: unten fällt sie
 * ab, oben steigt sie an. Zum Tal hin soll die Kante eine Kante bleiben, denn
 * über sie läuft man los. Zum Gipfel hin war sie mit demselben schmalen Rand
 * eine **Wand**: gut zwanzig Meter Anstieg auf zehn Meter Weg, 60° und mehr,
 * und wer vom Startplatz aus zum Kreuz wollte, kam nicht einmal vom Plateau
 * herunter. Mit dem breiten Rand verteilt sich derselbe Anstieg auf vierzig
 * Meter — steil, aber ein Berg.
 */
export const LAUNCH_EDGE = { valley: 10, summit: 42 };

/**
 * Die Höhe über dem Tal an einem Punkt, in Metern. Nie negativ.
 */
export function alpsHeight(x: number, z: number): number {
  return flatten(rawHeight(x, z), x, z);
}

/** Das Gelände ohne die drei ebenen Stellen. */
function rawHeight(x: number, z: number): number {
  // Das Tal: sanfte Wellen, damit eine Wiese keine Platte ist.
  let h = 3 + 12 * fbm(x / 170 + 11.3, z / 170 + 7.9);
  for (const peak of PEAKS) {
    const d = Math.hypot(x - peak.x, z - peak.z);
    const bell = Math.exp(-((d / peak.spread) ** 1.7));
    // Grate und Rinnen: das Rauschen wird mit der Höhe stärker, damit der
    // Fels oben zerklüftet ist und die Wiese unten nicht — und direkt am
    // Gipfel wieder schwächer, damit der Gipfel auch der höchste Punkt ist.
    const ridges = 1 + 0.28 * (fbm(x / 48 + 3.1, z / 48 - 5.7) - 0.5) * bell * smoothstep(0, 70, d);
    h += peak.height * bell * ridges;
  }
  // Zum Rand hin auf null: dahinter liegt eine Ebene bis zum Horizont, und
  // eine Karte, die an ihrer Kante vierzig Meter hoch steht, ist eine Klippe.
  const edge = 1 - smoothstep(EDGE_FALLOFF, TERRAIN_SIZE / 2, Math.max(Math.abs(x), Math.abs(z)));
  return Math.max(0, h * edge);
}

/** Ab hier läuft das Gelände zum Rand hin aus. */
const EDGE_FALLOFF = 400;

/** Die Höhe, die die Startrampe bekommt — einmal berechnet, damit sie eben ist. */
export const LAUNCH_HEIGHT = Math.round(rawHeight(LAUNCH_SITE.x, LAUNCH_SITE.z) * 10) / 10;

/**
 * Der höchste Punkt der Karte — **gesucht**, nicht gesetzt: die Nachbarberge
 * heben die Flanke des großen an, und die Spitze liegt deshalb nicht genau
 * über der Mitte seiner Glocke. Das Kreuz steht dort, wo es wirklich am
 * höchsten ist.
 */
export const SUMMIT = findSummit();

/** Wie hoch der Gipfel ist. */
export const SUMMIT_HEIGHT = rawHeight(SUMMIT.x, SUMMIT.z);

/**
 * Ein kleines ebenes Stück um das Gipfelkreuz, mit weichem Rand: der letzte
 * Anstieg zum Kreuz stand sonst bei 52° — genau an der Grenze dessen, was man
 * hinaufkommt —, und ein Gipfel, den man nur springend erreicht, ist keiner.
 */
export const SUMMIT_CAP = { radius: 5, edge: 22 };

function findSummit(): { x: number; z: number } {
  const centre = PEAKS[0]!;
  let best = { x: centre.x, z: centre.z, h: -1 };
  const search = (radius: number, step: number): void => {
    const origin = { x: best.x, z: best.z };
    for (let x = origin.x - radius; x <= origin.x + radius; x += step) {
      for (let z = origin.z - radius; z <= origin.z + radius; z += step) {
        const h = rawHeight(x, z);
        if (h > best.h) best = { x, z, h };
      }
    }
  };
  search(150, 5);
  search(6, 1);
  return { x: best.x, z: best.z };
}

/** Legt Landewiese, Startplatz und Gipfel eben, mit weichem Rand. */
function flatten(h: number, x: number, z: number): number {
  const toLanding = Math.hypot(x - LANDING.x, z - LANDING.z);
  const meadow = 1 - smoothstep(LANDING.radius, LANDING.radius + 35, toLanding);
  h += (LANDING.height - h) * meadow;

  const toLaunch = Math.hypot(x - LAUNCH_SITE.x, z - LAUNCH_SITE.z);
  // Wie sehr dieser Punkt bergwärts liegt: 1 genau Richtung Gipfel (-z), -1
  // Richtung Tal. Dazwischen läuft die Breite des Randes stetig über, damit
  // der Rand nirgends eine Stufe hat.
  const uphill = toLaunch > 1e-6 ? (LAUNCH_SITE.z - z) / toLaunch : 0;
  const edge =
    LAUNCH_EDGE.valley + (LAUNCH_EDGE.summit - LAUNCH_EDGE.valley) * smoothstep(-0.3, 0.7, uphill);
  const plateau = 1 - smoothstep(LAUNCH_SITE.radius, LAUNCH_SITE.radius + edge, toLaunch);
  h += (LAUNCH_HEIGHT - h) * plateau;

  // Der Gipfel: nur angehoben, nie abgetragen — das Kreuz steht weiter auf
  // dem höchsten Punkt, und der bleibt der höchste.
  const toSummit = Math.hypot(x - SUMMIT.x, z - SUMMIT.z);
  const cap = 1 - smoothstep(SUMMIT_CAP.radius, SUMMIT_CAP.radius + SUMMIT_CAP.edge, toSummit);
  h += Math.max(0, SUMMIT_HEIGHT - h) * cap;
  return h;
}

/** Die Steigung an einem Punkt: 0 ist eben, 1 ist 45°. */
export function alpsSlope(x: number, z: number, step = 3): number {
  const dx = (alpsHeight(x + step, z) - alpsHeight(x - step, z)) / (2 * step);
  const dz = (alpsHeight(x, z + step) - alpsHeight(x, z - step)) / (2 * step);
  return Math.hypot(dx, dz);
}

/** Ein abgetastetes Gelände, so wie Mesh und Höhenfeld es brauchen. */
export interface TerrainSamples {
  /** Zellen je Kante; Werte gibt es eine mehr. */
  cells: number;
  size: number;
  /**
   * Die Höhen, in Rapiers Anordnung: Zeile `i` läuft entlang **Z** von
   * `-size/2` nach `+size/2`, Spalte `j` entlang **X**, und der Wert für
   * `(i, j)` steht bei `i + j · (cells + 1)`.
   */
  heights: Float32Array;
}

/** Tastet das Gelände ab. */
export function sampleAlps(cells = TERRAIN_CELLS, size = TERRAIN_SIZE): TerrainSamples {
  const n = cells + 1;
  const heights = new Float32Array(n * n);
  for (let i = 0; i < n; i++) {
    const z = (i / cells - 0.5) * size;
    for (let j = 0; j < n; j++) {
      const x = (j / cells - 0.5) * size;
      heights[i + j * n] = alpsHeight(x, z);
    }
  }
  return { cells, size, heights };
}

/** Wo ein Wert im Raster liegt — die Umkehrung von `sampleAlps`. */
export function samplePosition(
  samples: TerrainSamples,
  i: number,
  j: number,
): { x: number; z: number } {
  return {
    x: (j / samples.cells - 0.5) * samples.size,
    z: (i / samples.cells - 0.5) * samples.size,
  };
}

// --- Rauschen mit Gedächtnis -------------------------------------------------

/** Eine Zahl zwischen 0 und 1 für jeden Gitterpunkt — immer dieselbe. */
function hash(ix: number, iz: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Wertrauschen: die Gitterpunkte, weich dazwischen. */
function noise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smoothstep(0, 1, x - ix);
  const fz = smoothstep(0, 1, z - iz);
  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fz);
}

/** Drei Lagen Rauschen übereinander, jede halb so groß und halb so stark. 0 … 1. */
function fbm(x: number, z: number): number {
  return (
    (0.5 * noise(x, z) +
      0.25 * noise(x * 2 + 17.2, z * 2 + 9.1) +
      0.125 * noise(x * 4 + 3.7, z * 4 + 1.3)) /
    0.875
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
