/**
 * **Flächen setzen** — die Rechnung hinter _Fläche_ im Baukasten.
 *
 * Gewünscht: „so ein bisschen die Idee wie bei City Skylines, dass ich zum
 * Beispiel den Küchenboden wählen kann und sagen kann: Ich möchte von Position
 * 1–2 … den Küchenboden setzen und möchte das dann bestätigen." Wer ein Stück
 * aus dem Regal in der Hand hat, zieht am Schirm ein Rechteck auf — mit der
 * Maus gezogen, oder auf dem Telefon zwei Kacheln angetippt —, sieht die
 * Kacheln leuchten und setzt auf jede davon eine Kopie. Ab mehr als vier
 * Kacheln (`AREA_CONFIRM`) wird vorher gefragt.
 *
 * Hier steht nur die Rechnung, ohne DOM und ohne Szene: das Rechteck aus zwei
 * Kacheln (`areaRect`), die Stellen darin (`areaPlan`) und der kleine
 * Zustand zwischen Drücken, Ziehen, zweitem Tippen und Nachfrage
 * (`AreaSelect`). Die Knöpfe stehen in `areaPad.ts`, das Einsetzen in
 * `PortalWorld.updateAreaPaint`.
 */
import { TILE } from '../nav/navTile';
import {
  quarterYaw,
  tileSpan,
  turnedHalf,
  wallAxis,
  type GridEdge,
  type GridTile,
} from './gridSnap';

/** Eine Kachel als Spalte und Reihe — `Math.floor` der Meter, wie in `positionHud`. */
export interface AreaTile {
  readonly col: number;
  readonly row: number;
}

/** Ein Rechteck aus Kacheln, beide Grenzen **eingeschlossen**. */
export interface AreaRect {
  readonly minCol: number;
  readonly maxCol: number;
  readonly minRow: number;
  readonly maxRow: number;
}

/** Eine Stelle, an die eine Kopie kommt — Mitte in Metern und Drehung um die Hochachse. */
export interface AreaSlot {
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
}

/** Was eine Fläche ergibt: die Stellen und das, was davon leuchtet. */
export interface AreaPlan {
  readonly slots: AreaSlot[];
  /** Die Kacheln unter den Stellen — leer bei Wänden. */
  readonly tiles: GridTile[];
  /** Die Fugen unter den Wänden — leer bei allem anderen. */
  readonly edges: GridEdge[];
}

/**
 * **Ab wie vielen Kacheln gefragt wird** — gewünscht: „sollte es eine Fläche
 * von mehr als vier Feldern zum Beispiel sein." Bis dahin wird sofort gesetzt:
 * Wer eine Kachel oder zwei antippt, will nicht jedes Mal bestätigen.
 */
export const AREA_CONFIRM = 4;

/**
 * **Wie viele Stücke eine Fläche höchstens bekommt.** Jedes ist ein Körper
 * der Physik und ein Eintrag im Netz; zwanzig mal zwanzig ist eine große
 * Küche, und was darüber hinausgeht, war fast sicher ein verrutschter Finger.
 */
export const AREA_MAX = 400;

/** Die Kachel unter einem Punkt in Metern. */
export function tileAt(x: number, z: number): AreaTile | null {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  return { col: Math.floor(x / TILE), row: Math.floor(z / TILE) };
}

/** Das Rechteck zwischen zwei Kacheln — gleich, in welcher Ecke man anfängt. */
export function areaRect(a: AreaTile, b: AreaTile): AreaRect {
  return {
    minCol: Math.min(a.col, b.col),
    maxCol: Math.max(a.col, b.col),
    minRow: Math.min(a.row, b.row),
    maxRow: Math.max(a.row, b.row),
  };
}

/** Wie viele Kacheln das Rechteck hat — das, was „mehr als vier Felder" zählt. */
export function areaCount(rect: AreaRect): number {
  return (rect.maxCol - rect.minCol + 1) * (rect.maxRow - rect.minRow + 1);
}

/** `3 × 4` — Breite (West–Ost) mal Tiefe (Nord–Süd), in Kacheln. */
export function areaSize(rect: AreaRect): string {
  return `${rect.maxCol - rect.minCol + 1} × ${rect.maxRow - rect.minRow + 1}`;
}

/** Ob vor dem Setzen gefragt wird (`AREA_CONFIRM`). */
export function needsConfirm(rect: AreaRect): boolean {
  return areaCount(rect) > AREA_CONFIRM;
}

/**
 * **Die Stellen einer Fläche** für ein Stück mit dieser Grundfläche und
 * Drehung — dieselben Regeln wie beim Einrasten einzeln (`gridSnap.gridPose`).
 *
 * - **Was auf Kacheln steht**, wird Reihe für Reihe ausgelegt, Schritt so
 *   groß wie seine Grundfläche (`tileSpan`): ein Boden von einer Kachel auf
 *   jede, ein Tisch von zwei auf jede zweite. Was nicht mehr ganz passt,
 *   kommt nicht hin — ein halbes Möbel über dem Rand wäre ein Versprechen,
 *   das das Rechteck nicht gegeben hat. Eines kommt immer.
 * - **Eine Wand** (`gridSnap.wallAxis`) wird nicht in die Fläche gelegt —
 *   zwanzig Wände nebeneinander sind keine Absicht —, sondern um sie
 *   **herum**: Das Rechteck bekommt seinen Rand, und die Wände quer dazu
 *   stehen um eine Vierteldrehung gedreht. Ist es nur eine Reihe breit, wird
 *   es eine gerade Wand an seiner Nord- oder Westkante.
 *
 * @param half die halbe Grundfläche im eigenen Rahmen (`PhysicsBody.halfExtents`)
 * @param yaw die Drehung, mit der das Stück gerade getragen wird
 */
export function areaPlan(
  rect: AreaRect,
  half: { readonly x: number; readonly z: number },
  yaw: number,
): AreaPlan {
  const turn = quarterYaw(yaw);
  const { halfX, halfZ } = turnedHalf(half, turn);
  const wall = wallAxis(2 * halfX, 2 * halfZ);
  if (wall !== null) return wallPlan(rect, Math.max(2 * halfX, 2 * halfZ), turn, wall === 'z');
  return floorPlan(rect, tileSpan(2 * halfX), tileSpan(2 * halfZ), turn);
}

/** Reihen und Spalten, jede Stelle so groß wie das Stück. */
function floorPlan(rect: AreaRect, spanX: number, spanZ: number, yaw: number): AreaPlan {
  const across = Math.max(1, Math.floor((rect.maxCol - rect.minCol + 1) / spanX));
  const down = Math.max(1, Math.floor((rect.maxRow - rect.minRow + 1) / spanZ));
  const slots: AreaSlot[] = [];
  const tiles: GridTile[] = [];
  for (let j = 0; j < down; j++) {
    for (let i = 0; i < across; i++) {
      const col = rect.minCol + i * spanX;
      const row = rect.minRow + j * spanZ;
      // Die Mitte der belegten Kacheln — bei ungerader Zahl eine Kachelmitte,
      // bei gerader eine Fuge, genau wie `gridSnap.snapAxis` einzeln rastet.
      slots.push({ x: (col + spanX / 2) * TILE, z: (row + spanZ / 2) * TILE, yaw });
      for (let dz = 0; dz < spanZ; dz++) {
        for (let dx = 0; dx < spanX; dx++) {
          tiles.push({ x: (col + dx + 0.5) * TILE, z: (row + dz + 0.5) * TILE });
        }
      }
    }
  }
  return { slots, tiles, edges: [] };
}

/**
 * Der Rand des Rechtecks aus Wänden.
 *
 * @param length die Länge einer Wand in Metern
 * @param alongX ob die Wand in der Drehung, in der sie getragen wird, von
 *   Westen nach Osten läuft
 */
function wallPlan(rect: AreaRect, length: number, yaw: number, alongX: boolean): AreaPlan {
  const span = tileSpan(length);
  const yawX = alongX ? yaw : quarterYaw(yaw + Math.PI / 2);
  const yawZ = alongX ? quarterYaw(yaw + Math.PI / 2) : yaw;
  const width = rect.maxCol - rect.minCol + 1;
  const depth = rect.maxRow - rect.minRow + 1;
  const slots: AreaSlot[] = [];
  const edges: GridEdge[] = [];

  /** Eine Reihe Wände auf einer Fuge, von `from` an über `tiles` Kacheln. */
  const line = (from: number, tiles: number, fuge: number, onX: boolean): void => {
    const count = Math.max(1, Math.floor(tiles / span));
    for (let index = 0; index < count; index++) {
      const start = from + index * span;
      const along = (start + span / 2) * TILE;
      slots.push(
        onX ? { x: along, z: fuge * TILE, yaw: yawX } : { x: fuge * TILE, z: along, yaw: yawZ },
      );
      for (let k = 0; k < span; k++) {
        const at = (start + k + 0.5) * TILE;
        edges.push(
          onX ? { x: at, z: fuge * TILE, alongX: true } : { x: fuge * TILE, z: at, alongX: false },
        );
      }
    }
  };

  if (depth === 1 && (width > 1 || alongX)) {
    line(rect.minCol, width, rect.minRow, true);
  } else if (width === 1) {
    line(rect.minRow, depth, rect.minCol, false);
  } else {
    line(rect.minCol, width, rect.minRow, true);
    line(rect.minCol, width, rect.maxRow + 1, true);
    line(rect.minRow, depth, rect.minCol, false);
    line(rect.minRow, depth, rect.maxCol + 1, false);
  }
  return { slots, tiles: [], edges };
}

/** Wo die Auswahl gerade steht. */
export type AreaPhase =
  /** Nichts gewählt — der nächste Druck ist die erste Ecke. */
  | 'idle'
  /** Gedrückt, und die zweite Ecke folgt dem Finger. */
  | 'drag'
  /** Eine Ecke angetippt; der nächste Tipp ist die zweite. */
  | 'second'
  /** Beide Ecken stehen, und es wird gefragt (`needsConfirm`). */
  | 'confirm';

/**
 * **Die Auswahl zwischen zwei Ecken** — ziehen oder zweimal tippen, beides
 * führt zum selben Rechteck.
 *
 * - **Ziehen**: drücken, ziehen, loslassen — die Ecken sind die Kachel unter
 *   dem Druck und die unter dem Loslassen. So geht es am Schirm mit der Maus.
 * - **Tippen**: Ein Druck, der auf seiner Kachel wieder losgelassen wird, ist
 *   die erste Ecke; der nächste Druck setzt die zweite, und wer dabei noch
 *   zieht, schiebt sie mit. So geht es auf dem Telefon, wo ein Finger, der
 *   zieht, sonst die Figur dreht.
 *
 * `up` meldet, wann beide Ecken stehen; ob dann gefragt oder sofort gesetzt
 * wird, entscheidet der Aufrufer (`needsConfirm`, `ask`).
 */
export class AreaSelect {
  phase: AreaPhase = 'idle';
  start: AreaTile | null = null;
  end: AreaTile | null = null;
  private moved = false;

  down(tile: AreaTile): void {
    if (this.phase === 'second' && this.start) {
      this.end = tile;
      this.moved = true;
      this.phase = 'drag';
      return;
    }
    this.start = tile;
    this.end = tile;
    this.moved = false;
    this.phase = 'drag';
  }

  move(tile: AreaTile): void {
    if (this.phase !== 'drag' && this.phase !== 'second') return;
    this.end = tile;
    if (this.phase === 'drag' && !sameTile(tile, this.start)) this.moved = true;
  }

  /** @returns ob jetzt beide Ecken stehen */
  up(tile: AreaTile | null): boolean {
    if (this.phase !== 'drag') return false;
    if (tile) this.move(tile);
    if (!this.moved) {
      this.phase = 'second';
      return false;
    }
    return true;
  }

  /** Beide Ecken stehen, und jetzt wird gefragt. */
  ask(): void {
    if (this.start && this.end) this.phase = 'confirm';
  }

  /**
   * Zurück auf null. @returns ob es etwas zurückzunehmen gab — sonst beendet
   * `Esc` den ganzen Modus.
   */
  reset(): boolean {
    const had = this.phase !== 'idle';
    this.phase = 'idle';
    this.start = null;
    this.end = null;
    this.moved = false;
    return had;
  }

  /** Das Rechteck, soweit es steht — in der Phase `second` bis zur Maus. */
  rect(): AreaRect | null {
    if (!this.start) return null;
    return areaRect(this.start, this.end ?? this.start);
  }
}

function sameTile(a: AreaTile, b: AreaTile | null): boolean {
  return b !== null && a.col === b.col && a.row === b.row;
}
