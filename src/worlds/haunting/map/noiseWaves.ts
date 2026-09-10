import type { MapNoise, MapSnapshot } from './mapSnapshot';
import { NOISE_TILE, spreadNoise, tileGrid, type TileGrid } from './noiseSpread';
import type { NoiseRadius } from './visibility';

/**
 * **Geräusche als Wellen über die Kacheln** — einmal geschrieben, von beiden
 * Bildern benutzt.
 *
 * Die Karte (`mapView.ts`) hat das erfunden, und dort sah es gut aus; auf dem
 * Boden der gespielten Szene (`flatScene.ts`) gehört es genauso hin — wer
 * spielt, soll sehen, was er hört, ohne erst die Übersicht aufzuklappen.
 * Zweimal dieselbe Flut zu schreiben hieße, sie beim nächsten Mal nur an
 * einer Stelle zu ändern; also steht sie hier, und die Ansichten sagen nur
 * noch, **welche** Welle sie in **welcher** Farbe wollen (`NoiseInk`).
 *
 * Jede Welle hat eine Front, die mit `WAVE_SPEED` nach außen läuft, und
 * dahinter einen Saum, der verblasst. Was zählt, ist nicht die Luftlinie,
 * sondern die Länge des begehbaren Wegs (`noiseSpread.ts`): durch die offene
 * Tür, um die Ecke, nie durch eine Wand, nie über den leeren Weltraum neben
 * der Station — und durch die Schächte, in beide Richtungen. Dasselbe, was
 * `audio/hearing.ts` rechnet, nur sichtbar.
 *
 * Gezeichnet wird **ganz hinten**, direkt auf den Böden: Eine Welle über
 * Möbeln und Figuren nähme genau das Bild weg, für das sie da ist.
 */

/** Wie schnell die Front einer Welle über den Boden läuft, in Metern je Sekunde. */
export const WAVE_SPEED = 9;
/** Wie lange die volle Fläche danach noch nachklingt, in Sekunden. */
export const WAVE_LINGER = 0.7;

/**
 * Wie eine Ansicht eine Welle einfärbt — `null` heißt: diese hier nicht
 * zeigen. Damit entscheidet jede Ansicht für sich, was ihr Betrachter
 * erfahren darf; die Flut selbst weiß von Rollen nichts.
 */
export type NoiseInk = (noise: MapNoise) => string | null;

/** Und dasselbe für die stetige Fläche um jeden, der geht („Alles sehen"). */
export type SteadyInk = (noise: NoiseRadius) => string | null;

export interface NoisePaint {
  snapshot: MapSnapshot;
  /** Welche Geräusche gezeigt werden — voreingestellt die des Snapshots. */
  noises?: readonly MapNoise[];
  /** Die stetigen Flächen aus dem Sichtbarkeitsfeld; leer im Modus „Realitätsnah". */
  steady?: readonly NoiseRadius[];
  ink: NoiseInk;
  steadyInk?: SteadyInk;
  toScreen(x: number, z: number): { x: number; y: number };
  /** Bildpunkte je Meter. */
  scale: number;
  /** Die dichteste Stelle einer Welle, 0…1. */
  alphaMax?: number;
  /**
   * Was im Bild liegt, in Metern — Kacheln außerhalb werden gar nicht erst
   * gemalt. Die gespielte Szene steht bei achtzig Bildpunkten je Meter, und
   * eine Welle von zwölf Metern Reichweite sind dort ein paar hundert
   * Rechtecke, von denen die meisten neben dem Bild liegen. Ohne Grenzen
   * kostet das auf einem Telefon je Bild mehr als alles andere zusammen.
   */
  bounds?: { minX: number; minZ: number; maxX: number; maxZ: number };
}

/**
 * Der Zwischenspeicher einer Ansicht: das Kachelfeld der Station und die
 * geflutete Welle je Geräusch. Ein Geräusch wandert nicht, seine Front wächst
 * nur — die Weglängen bleiben Bild für Bild dieselben, und ein Fluten je Bild
 * wäre auf einem Telefon nicht zu bezahlen.
 */
export class NoiseWaves {
  private floor: { seed: number; grid: TileGrid | null } = { seed: NaN, grid: null };
  private readonly reached = new Map<string, Map<string, number>>();

  /** Das Kachelfeld — Böden, Nachbarn, Türen, Schächte (`noiseSpread.ts`). */
  grid(snapshot: MapSnapshot): TileGrid {
    if (this.floor.seed === snapshot.seed && this.floor.grid) return this.floor.grid;
    const grid = tileGrid(snapshot, NOISE_TILE);
    this.floor = { seed: snapshot.seed, grid };
    this.reached.clear();
    return grid;
  }

  clear(): void {
    this.floor = { seed: NaN, grid: null };
    this.reached.clear();
  }

  /** Zeichnet, was gerade klingt, und sagt, wie viele Wellen es waren. */
  paint(ctx: CanvasRenderingContext2D, options: NoisePaint): number {
    const s = options.scale;
    const cell = NOISE_TILE * s;
    const alphaMax = options.alphaMax ?? 0.8;
    const waves: Array<{ noise: MapNoise; color: string; front: number; fade: number }> = [];
    for (const noise of options.noises ?? options.snapshot.noises ?? []) {
      const color = options.ink(noise);
      if (!color) continue;
      const age = options.snapshot.time - noise.since;
      if (age < 0) continue;
      const arrival = noise.radius / WAVE_SPEED;
      if (age > arrival + WAVE_LINGER) continue;
      const front = Math.min(noise.radius, age * WAVE_SPEED);
      const fade = age <= arrival ? 1 : 1 - (age - arrival) / WAVE_LINGER;
      waves.push({ noise, color, front, fade });
    }
    const steady: Array<{ noise: NoiseRadius; color: string }> = [];
    for (const noise of options.steady ?? []) {
      const color = options.steadyInk?.(noise) ?? null;
      if (color) steady.push({ noise, color });
    }
    if (!waves.length && !steady.length) return 0;
    const grid = this.grid(options.snapshot);
    // Was noch klingt, bleibt gespeichert; alles andere räumt sich weg. Der
    // Schlüssel trägt Ort und Reichweite mit: Eine neue Runde fängt ihre
    // Kennungen wieder bei `n0` an, und eine alte Flut an einer anderen
    // Stelle wäre dann ein Geräusch aus dem letzten Spiel.
    const alive = new Set(waves.map(({ noise }) => waveKey(noise)));
    for (const id of [...this.reached.keys()]) if (!alive.has(id)) this.reached.delete(id);
    const open = new Set(
      options.snapshot.doors.filter((door) => door.open && !door.locked).map((door) => door.id),
    );
    const view = options.bounds;
    ctx.save();
    const paint = (key: string, color: string, alpha: number): void => {
      const [tx, tz] = key.split(',').map(Number) as [number, number];
      const x = tx * NOISE_TILE,
        z = tz * NOISE_TILE;
      if (
        view &&
        (x > view.maxX || x + NOISE_TILE < view.minX || z > view.maxZ || z + NOISE_TILE < view.minZ)
      )
        return;
      ctx.globalAlpha = Math.min(alphaMax, alpha);
      ctx.fillStyle = color;
      const p = options.toScreen(x, z);
      ctx.fillRect(p.x + 0.5, p.y + 0.5, Math.max(1, cell - 1), Math.max(1, cell - 1));
    };
    for (const { noise, color, front, fade } of waves) {
      const id = waveKey(noise);
      let flood = this.reached.get(id);
      if (!flood) {
        flood = spreadNoise(grid, noise.at, noise.radius, { open, vents: true });
        this.reached.set(id, flood);
      }
      for (const [tile, d] of flood) {
        if (d > front) continue;
        // Die Front ist am hellsten; dahinter klingt es aus.
        const ring = Math.max(0, 1 - (front - d) / 2.2);
        const alpha = (0.1 + 0.55 * ring * ring) * fade * (1 - (d / noise.radius) * 0.5);
        if (alpha <= 0.02) continue;
        paint(tile, color, alpha);
      }
    }
    for (const { noise, color } of steady) {
      const flood = spreadNoise(grid, noise.at, noise.radius, { open, vents: true });
      for (const [tile, d] of flood) paint(tile, color, 0.12 * (1 - d / noise.radius));
    }
    ctx.restore();
    return waves.length;
  }
}

export function waveKey(noise: MapNoise): string {
  return `${noise.id}@${noise.at.x.toFixed(2)},${noise.at.z.toFixed(2)},${noise.radius.toFixed(2)}`;
}
