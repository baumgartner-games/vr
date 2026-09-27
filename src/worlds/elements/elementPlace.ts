import { footprintCellKeys } from '../nav/cellGrid';
import { elementById, type GameElement } from './elementCatalog';

/**
 * **Wo ein Spielelement steht** — die Rechnung ohne Bild: Kacheln, Zellen,
 * Mitte, Drehung. Das Bild dazu steht in `elementView.ts`.
 *
 * Eine Stelle nennt die **Nordwestecke** ihrer Grundfläche, wie sie nach dem
 * Drehen daliegt, und nicht die Mitte: Ein Plan denkt in Kacheln (die Küche
 * reicht von Kachel 3 bis 6), und eine Mitte bei 4,5 für ein Band von zwei
 * Kacheln Länge und bei 4,0 für eines von einer wäre genau die Rechnung, die
 * jeder Plan dann selbst anstellt — und jeder etwas anders.
 */

/** Wohin die Vorderseite schaut — Norden ist −z, wie überall hier. */
export type Face = 'N' | 'E' | 'S' | 'W';

/** Die vier Richtungen, im Uhrzeigersinn von Norden. */
export const FACES: readonly Face[] = ['N', 'E', 'S', 'W'];

/** **Eine Stelle für ein Element** — was ein Plan über ein Möbel sagt. */
export interface ElementSpot {
  /** Der Name dieser Stelle im Plan — eindeutig, etwa `'burger-board'`. */
  readonly id: string;
  /** Welches Element (`elementCatalog.ELEMENTS`). */
  readonly element: string;
  /** Die Kachel der Nordwestecke der (gedrehten) Grundfläche. */
  readonly x: number;
  readonly z: number;
  /** Wohin die Vorderseite schaut; ohne Angabe nach Süden. */
  readonly face?: Face;
  /** Was eine Kiste oder ein Stapel hier hergibt — schlägt `GameElement.gives`. */
  readonly gives?: string;
  /** Die Beschriftung hier — schlägt `GameElement.label`. */
  readonly label?: string;
  /**
   * **Ein Versatz des Bilds**, in Metern (x Osten, z Süden) — Modelle und
   * Anker rücken, die gesperrten Zellen nicht.
   *
   * Für ein Möbel, das nicht auf der Mitte seiner Kachel steht: Der Stuhl am
   * runden Tisch steht 1,05 m von dessen Mitte (`restaurantPlan.SEAT_REACH`),
   * und dort sitzt auch der Gast. Auf die Mitte der Kachel gerückt, säße er
   * einen halben Meter neben seinem Stuhl. Gesperrt bleibt die Kachel, auf
   * der der Stuhl zum größten Teil steht — das Gitter kennt nur ganze Zellen.
   */
  readonly offset?: readonly [number, number];
}

/** Das Element einer Stelle. */
export function spotElement(spot: ElementSpot): GameElement {
  return elementById(spot.element);
}

/** Wohin die Stelle schaut. */
export function spotFace(spot: ElementSpot): Face {
  return spot.face ?? 'S';
}

/** Was die Stelle hergibt — ihre eigene Angabe vor der des Elements. */
export function spotGives(spot: ElementSpot): string | null {
  return spot.gives ?? spotElement(spot).gives ?? null;
}

/**
 * **Die Drehung um die Hochachse**, in Bogenmaß — 0 schaut nach Süden (+z),
 * wie jeder Stuhl im Test Restaurant (`restaurantPlan.Seat.yaw`) und jede
 * Platte des Regals (_„das Möbel schaut von Haus aus nach +z"_). Eine Drehung
 * um `yaw` bringt +z nach (sin yaw, cos yaw): Osten ist π/2, Norden π.
 */
export function faceYaw(face: Face): number {
  switch (face) {
    case 'S':
      return 0;
    case 'E':
      return Math.PI / 2;
    case 'N':
      return Math.PI;
    case 'W':
      return -Math.PI / 2;
  }
}

/** Die Drehung einer Stelle (`faceYaw`). */
export function spotYaw(spot: ElementSpot): number {
  return faceYaw(spotFace(spot));
}

/** Ob die Grundfläche quer liegt — nach Osten oder Westen gedreht. */
function turned(face: Face): boolean {
  return face === 'E' || face === 'W';
}

/**
 * **Die Grundfläche in Kacheln, gedreht** — Breite (x) × Tiefe (z). Ein Band
 * `[1, 2]`, das nach Osten läuft, liegt zwei Kacheln breit und eine tief.
 */
export function spotSize(spot: ElementSpot): [number, number] {
  const [w, d] = spotElement(spot).tiles;
  return turned(spotFace(spot)) ? [d, w] : [w, d];
}

/** **Die Mitte der Grundfläche**, in Metern. */
export function spotCentre(spot: ElementSpot): { x: number; z: number } {
  const [w, d] = spotSize(spot);
  return { x: spot.x + w / 2, z: spot.z + d / 2 };
}

/** Die belegten Kacheln als `'x,z'`. */
export function spotTiles(spot: ElementSpot): string[] {
  const [w, d] = spotSize(spot);
  const out: string[] = [];
  for (let dz = 0; dz < d; dz++)
    for (let dx = 0; dx < w; dx++) out.push(`${spot.x + dx},${spot.z + dz}`);
  return out;
}

/**
 * **Die gesperrten Zellen** (`cellGrid.cellKey`, Etage 0) — dieselbe Rechnung,
 * die `GridWorld.blockFootprint` anstellt: vier je Kachel.
 */
export function spotCells(spot: ElementSpot): string[] {
  const [w, d] = spotSize(spot);
  const { x, z } = spotCentre(spot);
  return footprintCellKeys(x, z, w, d);
}

/**
 * **Einen Versatz mitdrehen** — von der Form „das Element schaut nach Süden"
 * (`ElementPart.at`: x Osten, z Süden) in die Welt. Dieselbe Drehung, die
 * three.js mit `rotation.y = yaw` macht: (x, z) → (x cos + z sin, −x sin + z cos).
 */
export function rotateOffset(face: Face, at: readonly [number, number]): [number, number] {
  const [x, z] = at;
  switch (face) {
    case 'S':
      return [x, z];
    case 'E':
      return [z, -x];
    case 'N':
      return [-x, -z];
    case 'W':
      return [-z, x];
  }
}

/**
 * **Die Mitte der Vorderkante**, in Metern — dort steht, wer das Element
 * benutzt, und dort hängt sein Anker (`PlacedElement.anchor`).
 */
export function spotFront(spot: ElementSpot): { x: number; z: number } {
  const { x, z } = spotCentre(spot);
  const [, d] = spotElement(spot).tiles;
  const [ox, oz] = rotateOffset(spotFace(spot), [0, d / 2]);
  return { x: x + ox, z: z + oz };
}

/**
 * **Welche Kacheln doppelt belegt sind** — jede nur einmal genannt. Zwei
 * Möbel auf einer Kachel sind ein Fehler im Plan, den man im Bild erst sieht,
 * wenn man hindurchläuft; hier sieht ihn der Test.
 */
export function overlaps(spots: readonly ElementSpot[]): string[] {
  const seen = new Set<string>();
  const twice = new Set<string>();
  for (const spot of spots)
    for (const tile of spotTiles(spot)) {
      if (seen.has(tile)) twice.add(tile);
      seen.add(tile);
    }
  return [...twice];
}
