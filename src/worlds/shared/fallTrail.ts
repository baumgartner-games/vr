/**
 * **Wie man gelaufen ist, bevor man durch die Welt fiel** — die Spur, die der
 * Sturzbericht zeigt (`ui/fallReport.ts`).
 *
 * Gewünscht: „Wenn ich runter falle soll meine letzten Positionen getrackt
 * werden wie ich gelaufen bin und oben eine Box wie bei den Koordinaten
 * kommen, zum Kopieren, damit ich dir den Fall zusenden kann." Ein Sturz
 * durch eine Wand ist ein Fehler im Gitter oder im Bauplan, und nachstellen
 * lässt er sich nur mit dem Weg dorthin: Richtung, Tempo, die Stelle, an der
 * der Boden aufhörte.
 *
 * Gemerkt werden die Füße alle `TRAIL_STEP` Sekunden, höchstens `TRAIL_SIZE`
 * Stück — gut zehn Sekunden, genug für den Anlauf und den Sturz selbst. Reine
 * Zahlen, kein DOM, kein three.js.
 */

/** Wie oft eine Stelle gemerkt wird, in Sekunden. */
export const TRAIL_STEP = 0.2;
/** Wie viele Stellen höchstens — `TRAIL_STEP` mal diese Zahl ist die Länge der Spur. */
export const TRAIL_SIZE = 60;

export interface TrailPoint {
  /** Sekunden seit dem Start der Welt. */
  t: number;
  x: number;
  y: number;
  z: number;
  /** Ob unter den Füßen Boden war. */
  grounded: boolean;
}

export class FallTrail {
  private readonly points: TrailPoint[] = [];
  private clock = 0;
  private time = 0;

  /** Ein Bild weiter — gemerkt wird nur alle `TRAIL_STEP` Sekunden. */
  record(dt: number, x: number, y: number, z: number, grounded: boolean): void {
    this.time += dt;
    this.clock += dt;
    if (this.points.length > 0 && this.clock < TRAIL_STEP) return;
    this.clock = 0;
    if (![x, y, z].every((value) => Number.isFinite(value))) return;
    this.points.push({ t: this.time, x, y, z, grounded });
    if (this.points.length > TRAIL_SIZE) this.points.shift();
  }

  /** Die gemerkten Stellen, älteste zuerst. */
  get trail(): readonly TrailPoint[] {
    return this.points;
  }

  clear(): void {
    this.points.length = 0;
    this.clock = 0;
  }
}

/**
 * **Der Bericht zum Kopieren** — eine Kopfzeile, dann eine Zeile je Stelle:
 * Zeit vor dem Sturz, Meter, Kachel und ob Boden da war (`·` ja, `~` nein).
 * Die letzte Stelle mit Boden ist mit `←` markiert: Dort war die Welt zu Ende.
 */
export function fallReportText(
  where: string,
  trail: readonly TrailPoint[],
  fellAt: { x: number; y: number; z: number },
): string {
  const now = trail.length ? trail[trail.length - 1]!.t : 0;
  let lastGround = -1;
  trail.forEach((point, i) => {
    if (point.grounded) lastGround = i;
  });
  const lines = [
    `Sturz aus der Welt · ${where} · bei x ${fixed(fellAt.x)} z ${fixed(fellAt.z)} y ${fixed(fellAt.y)}`,
    'vor s | x | z | y | Kachel | Boden',
  ];
  trail.forEach((point, i) => {
    const before = (now - point.t).toFixed(1);
    const tile = `${Math.floor(point.x)}|${Math.floor(point.z)}`;
    const ground = point.grounded ? '·' : '~';
    const mark = i === lastGround ? ' ← letzter Boden' : '';
    lines.push(
      `-${before} | ${fixed(point.x)} | ${fixed(point.z)} | ${fixed(point.y)} | ${tile} | ${ground}${mark}`,
    );
  });
  return lines.join('\n');
}

function fixed(value: number): string {
  const text = value.toFixed(2);
  return text === '-0.00' ? '0.00' : text;
}
