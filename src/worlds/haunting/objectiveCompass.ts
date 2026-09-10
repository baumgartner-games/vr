import type { MapGoal } from './map/mapView';
import type { MapPoint } from './map/mapSnapshot';

/**
 * **Der Kompass am oberen Bildrand** — wohin man muss, ohne die Karte.
 *
 * Ein Streifen, der die Blickrichtung in der Mitte hält: Himmelsrichtungen
 * als Striche, die Ziele des Technikers (Ersatzteil, Konsole, Zentrale) als
 * gelbe Dreiecke mit Entfernung. Was hinter einem liegt, klebt am Rand des
 * Streifens, damit man weiß, wohin man sich drehen muss. Die Rechnung
 * (`compassMarks`) ist reine Mathematik ohne DOM und wird getestet; das
 * Bauteil darum ist eine Handvoll `div`s, die je Bild nur verschoben werden.
 *
 * Blickwinkel wie überall (`map/mapSnapshot.ts`): `yaw` 0 schaut nach Norden
 * (`-z`), positiv dreht gegen den Uhrzeigersinn von oben, also nach Westen.
 * Auf dem Streifen liegt Westen deshalb **links** von Norden.
 */

/** Wie viel Winkel der Streifen zeigt, in Bogenmaß — die halbe Runde. */
export const COMPASS_SPAN = Math.PI;

export interface CompassMark {
  id: string;
  label: string;
  /** Wo auf dem Streifen, von -1 (links) bis 1 (rechts); am Rand geklemmt. */
  offset: number;
  /** Ob das Ziel hinter dem Betrachter liegt und deshalb am Rand klebt. */
  behind: boolean;
  /** Luftlinie in Metern. */
  distance: number;
  next: boolean;
}

/** Ein Winkel als Blick (`yaw`) von `from` nach `to`. */
export function bearingOf(from: MapPoint, to: MapPoint): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

/** Ein Winkel in [-π, π]. */
export function wrapAngle(angle: number): number {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Wo ein Ziel auf dem Streifen liegt, relativ zur Blickrichtung. */
export function compassOffset(yaw: number, bearing: number): { offset: number; behind: boolean } {
  const relative = wrapAngle(bearing - yaw);
  // Positiv heißt links (gegen den Uhrzeigersinn), also nach links auf dem Streifen.
  const raw = -relative / (COMPASS_SPAN / 2);
  return { offset: Math.max(-1, Math.min(1, raw)), behind: Math.abs(raw) > 1 };
}

export function compassMarks(yaw: number, at: MapPoint, goals: readonly MapGoal[]): CompassMark[] {
  return goals.map((goal) => {
    const { offset, behind } = compassOffset(yaw, bearingOf(at, goal.at));
    return {
      id: goal.id,
      label: goal.label,
      offset,
      behind,
      distance: Math.hypot(goal.at.x - at.x, goal.at.z - at.z),
      next: goal.next,
    };
  });
}

const CARDINALS: ReadonlyArray<{ label: string; yaw: number }> = [
  { label: 'N', yaw: 0 },
  { label: 'W', yaw: Math.PI / 2 },
  { label: 'S', yaw: Math.PI },
  { label: 'O', yaw: -Math.PI / 2 },
];

/** Die Himmelsrichtungen, die gerade im Streifen liegen. */
export function cardinalMarks(yaw: number): Array<{ label: string; offset: number }> {
  const out: Array<{ label: string; offset: number }> = [];
  for (const cardinal of CARDINALS) {
    const { offset, behind } = compassOffset(yaw, cardinal.yaw);
    if (!behind) out.push({ label: cardinal.label, offset });
  }
  return out;
}

export class ObjectiveCompass {
  readonly element = document.createElement('div');
  private readonly ticks = document.createElement('div');
  private readonly marks = document.createElement('div');
  private readonly nodes = new Map<string, HTMLElement>();
  private readonly cardinals = new Map<string, HTMLElement>();

  constructor() {
    this.element.className = 'orbital-compass';
    this.element.setAttribute('aria-label', 'Kompass mit Zielen');
    this.ticks.className = 'orbital-compass__ticks';
    this.marks.className = 'orbital-compass__marks';
    const centre = document.createElement('div');
    centre.className = 'orbital-compass__centre';
    this.element.append(this.ticks, this.marks, centre);
    for (const cardinal of CARDINALS) {
      const node = document.createElement('span');
      node.className = 'orbital-compass__cardinal';
      node.textContent = cardinal.label;
      this.cardinals.set(cardinal.label, node);
      this.ticks.append(node);
    }
  }

  update(yaw: number, at: MapPoint, goals: readonly MapGoal[]): void {
    for (const node of this.cardinals.values()) node.hidden = true;
    for (const mark of cardinalMarks(yaw)) {
      const node = this.cardinals.get(mark.label)!;
      node.hidden = false;
      node.style.left = `${50 + mark.offset * 50}%`;
    }
    const seen = new Set<string>();
    for (const mark of compassMarks(yaw, at, goals)) {
      seen.add(mark.id);
      let node = this.nodes.get(mark.id);
      if (!node) {
        node = document.createElement('div');
        node.className = 'orbital-compass__mark';
        node.append(document.createElement('i'), document.createElement('span'));
        this.nodes.set(mark.id, node);
        this.marks.append(node);
      }
      node.classList.toggle('is-next', mark.next);
      node.classList.toggle('is-behind', mark.behind);
      // Am Rand bleibt die Beschriftung im Streifen, statt halb abgeschnitten zu werden.
      node.style.left = `${50 + Math.max(-0.86, Math.min(0.86, mark.offset)) * 50}%`;
      const text = `${mark.label} · ${Math.round(mark.distance)} m`;
      const label = node.lastElementChild!;
      if (label.textContent !== text) label.textContent = text;
    }
    for (const [id, node] of this.nodes)
      if (!seen.has(id)) {
        node.remove();
        this.nodes.delete(id);
      }
  }

  dispose(): void {
    this.element.remove();
  }
}
