import { CELL, footprintCellKeys } from '../nav/cellGrid';
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
  /**
   * Die Kachel der Nordwestecke der (gedrehten) Grundfläche — bei einem
   * Element auf Zellen (`onCells`) auch eine halbe.
   */
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
  /**
   * **Wie hoch es steht**, in Metern — die Oberkante der Ablage, auf der es
   * steht (`GameElement.shelf`/`rests`). Ohne Angabe auf dem Boden. Was
   * obenauf steht, sperrt keine Zellen (`spotSolid`): Die sperrt die Ablage.
   * Die Höhe zählt von null und nicht vom Boden der Etage: Die Oberkante der
   * Ablage (`PlacedElement.top`) ist schon die ganze Höhe.
   */
  readonly y?: number;
  /**
   * **Auf welcher Etage** (`nav/navTile.keyLevel`) — ohne Angabe im
   * Erdgeschoss. Gesperrt werden die Zellen dieser Etage, gestellt wird auf
   * ihren Boden (`ElementHost.floorY`). Im Weltbau kommt sie aus der Höhe der
   * Hand (`GridWorld.handLevel`).
   */
  readonly level?: number;
  /**
   * **Nicht benutzbar** — `A` tut an diesem Element nichts, und es leuchtet
   * nicht (`StationLayer.addOpener`). Gewünscht für die Stühle im Restaurant:
   * _„dass wir die Stühle nicht benutzen können (z.B. sinnvoll in Restaurant,
   * da hier nur Gäste drauf sitzen sollen für die Spiel Mechanik)"_.
   * Umgeschaltet im Einrichten über das Element-Menü (`grid/inspectMenu.ts`).
   */
  readonly idle?: boolean;
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

/**
 * **Ob ein Element auf Zellen steht und nicht auf Kacheln** — seine
 * Grundfläche ist kein Vielfaches einer Kachel (`GameElement.tiles`
 * `[0.5, 0.5]`: ein schmaler Baum auf einer Zelle). Dann rastet es je Zelle
 * ein (`spotAround`), und die Stelle darf auf einer halben Kachel anfangen.
 */
export function onCells(element: GameElement): boolean {
  return element.tiles.some((one) => !Number.isInteger(one));
}

/**
 * **Ob ein Element je Zelle einrastet** — wer auf Zellen steht (`onCells`),
 * und wer es ausdrücklich will (`GameElement.fine`, die Stühle).
 */
export function snapsToCells(element: GameElement): boolean {
  return onCells(element) || element.fine === true;
}

/**
 * Die belegten Kacheln als `'x,z'` — bei einem Element auf Zellen (`onCells`)
 * die Kachel, in der seine Zelle liegt.
 */
export function spotTiles(spot: ElementSpot): string[] {
  const [w, d] = spotSize(spot);
  const out: string[] = [];
  const [x0, z0] = [Math.floor(spot.x), Math.floor(spot.z)];
  const [x1, z1] = [Math.ceil(spot.x + w), Math.ceil(spot.z + d)];
  for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) out.push(`${x},${z}`);
  return out;
}

/** Ob ein Punkt (Meter) auf der Grundfläche der Stelle liegt. */
export function spotCovers(spot: ElementSpot, x: number, z: number): boolean {
  const [w, d] = spotSize(spot);
  return x >= spot.x && x < spot.x + w && z >= spot.z && z < spot.z + d;
}

/**
 * **Was die Stelle sperrt, gedreht** — Breite (x) × Tiefe (z) in Metern, um
 * die Mitte der Grundfläche: die ganze Grundfläche, oder nur der Stamm eines
 * Baums (`GameElement.solid`). `[0, 0]`: nichts.
 */
export function spotSolid(spot: ElementSpot): [number, number] {
  if ((spot.y ?? 0) > 0) return [0, 0];
  const element = spotElement(spot);
  if (!element.solid) return spotSize(spot);
  const [w, d] = element.solid;
  return turned(spotFace(spot)) ? [d, w] : [w, d];
}

/**
 * **Die gesperrten Zellen** (`cellGrid.cellKey`, Etage 0) — dieselbe Rechnung,
 * die `GridWorld.blockFootprint` anstellt: vier je Kachel, beim Baum nur die
 * unter dem Stamm (`spotSolid`), bei Gras keine.
 */
export function spotCells(spot: ElementSpot): string[] {
  const keys = spotSolidBoxes(spot).flatMap((box) =>
    footprintCellKeys(box.x, box.z, box.w, box.d, spot.level ?? 0),
  );
  return [...new Set(keys)];
}

/**
 * **Die Kästen, die eine Stelle sperrt** — Mitte und Maße in Metern. Meist
 * einer, die ganze gesperrte Fläche (`spotSolid`); mit freien Ecken
 * (`GameElement.openCorners`) zwei, die sich zu einem Kreuz überlagern: Jede
 * Seite ist um eine Zelle je Ende kürzer, und genau die vier Eckzellen bleiben
 * frei.
 */
export function spotSolidBoxes(
  spot: ElementSpot,
): { x: number; z: number; w: number; d: number }[] {
  const [w, d] = spotSolid(spot);
  if (w <= 0 || d <= 0) return [];
  const { x, z } = spotCentre(spot);
  if (!spotElement(spot).openCorners || w <= 2 * CELL || d <= 2 * CELL) return [{ x, z, w, d }];
  return [
    { x, z, w, d: d - 2 * CELL },
    { x, z, w: w - 2 * CELL, d },
  ];
}

/**
 * **Alle Zellen der Grundfläche**, gesperrt oder nicht — für das Bild der
 * Belegung, das unter einem Baum die freien Zellen um den Stamm zeigt.
 */
export function spotFootprintCells(spot: ElementSpot): string[] {
  const [w, d] = spotSize(spot);
  const { x, z } = spotCentre(spot);
  return footprintCellKeys(x, z, w, d, spot.level ?? 0);
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

/**
 * **Wohin eine Drehung schaut** — die Gegenrichtung von `faceYaw`, auf die
 * nächste Vierteldrehung gerundet. Für ein Element, das jemand aus dem
 * Möbelkatalog in der Hand gedreht hat (`PortalWorld.placedElement`).
 */
export function yawFace(yaw: number): Face {
  if (!Number.isFinite(yaw)) return 'S';
  const turns = ((Math.round(yaw / (Math.PI / 2)) % 4) + 4) % 4;
  return (['S', 'E', 'N', 'W'] as const)[turns]!;
}

/**
 * **Die Stelle um einen Punkt** — für ein Element, das jemand hinstellt, statt
 * dass ein Plan es bestellt: Der Punkt (in Metern) ist, wo es losgelassen
 * wurde, und die Stelle ist die, deren Mitte ihm am nächsten liegt. Für eine
 * Kachel ist das die Kachel, auf die der Punkt fällt — und für ein Element auf
 * Zellen (`onCells`) die Zelle: Ein schmaler Baum steht auf jeder der vier
 * Zellen einer Kachel.
 */
export function spotAround(
  id: string,
  element: string,
  x: number,
  z: number,
  face: Face,
): ElementSpot {
  const probe: ElementSpot = { id, element, x: 0, z: 0, face };
  const [w, d] = spotSize(probe);
  const step = snapsToCells(spotElement(probe)) ? CELL : 1;
  const snap = (value: number): number => Math.round(value / step) * step;
  return { ...probe, x: snap(x - w / 2), z: snap(z - d / 2) };
}

/**
 * **Ein getragenes Spielelement** — frisch aus dem Möbelkatalog
 * (`takeElement`) oder im Bau-Modus zum Umstellen aufgehoben
 * (`liftElementAt`).
 */
export interface CarriedElement {
  /** Die Id im Katalog (`elementCatalog.ELEMENTS`). */
  readonly id: string;
  /** Wo es stand, als es aufgehoben wurde — `null`: frisch aus dem Katalog. */
  readonly from: ElementSpot | null;
  /** Was die Welt zum Wiederhinstellen mitgibt — der Stand seiner Stationen. */
  readonly keep: unknown;
  /**
   * **Was auf der Ablage stand** (`GameElement.shelf`) — von ihr aus gesehen
   * (`riderPlace`), damit es mitgeht und nach dem Umstellen wieder dasteht,
   * wo es auf ihr stand.
   */
  readonly riders?: readonly RiderPlace[];
}

/**
 * **Wo etwas auf einer Ablage steht, von der Ablage aus gesehen** — Mitte als
 * Versatz von ihrer Mitte, in ihrer Drehung (so, als schaute sie nach Süden),
 * und die eigene Drehung gegen ihre. Damit geht es mit, wenn man die Ablage
 * umstellt (`riderSpot`): Die Tasse bleibt an der linken Ecke des
 * Schreibtischs, auch wenn der jetzt nach Osten schaut.
 */
export interface RiderPlace {
  /** Die Id seiner Stelle — sie bleibt, damit die Liste der Weltänderungen dieselbe Zeile ändert. */
  readonly id: string;
  readonly element: string;
  readonly label?: string;
  readonly at: readonly [number, number];
  /** Vierteldrehungen gegen die Ablage, 0 bis 3. */
  readonly turns: number;
}

/** Vierteldrehungen einer Richtung, von Süden aus (`yawFace`). */
function turnsOf(face: Face): number {
  return ['S', 'E', 'N', 'W'].indexOf(face);
}

/** Was auf der Ablage `shelf` an der Stelle `rider` steht — von ihr aus gesehen. */
export function riderPlace(shelf: ElementSpot, rider: ElementSpot): RiderPlace {
  const from = spotCentre(shelf);
  const to = spotCentre(rider);
  // Zurückdrehen heißt: um die Gegenrichtung drehen (S↔S, E↔W, N↔N).
  const back = (['S', 'W', 'N', 'E'] as const)[turnsOf(spotFace(shelf))]!;
  const at = rotateOffset(back, [to.x - from.x, to.z - from.z]);
  return {
    id: rider.id,
    element: rider.element,
    ...(rider.label ? { label: rider.label } : {}),
    at: [round(at[0]), round(at[1])],
    turns: (turnsOf(spotFace(rider)) - turnsOf(spotFace(shelf)) + 4) % 4,
  };
}

/**
 * **Die Stelle des Mitgenommenen auf der umgestellten Ablage** — die
 * Gegenrechnung zu `riderPlace`, mit der Höhe der Ablage (`top`).
 */
export function riderSpot(shelf: ElementSpot, place: RiderPlace, top: number): ElementSpot {
  const id = place.id;
  const centre = spotCentre(shelf);
  const [ox, oz] = rotateOffset(spotFace(shelf), place.at);
  const face = (['S', 'E', 'N', 'W'] as const)[(turnsOf(spotFace(shelf)) + place.turns) % 4]!;
  const probe: ElementSpot = { id, element: place.element, x: 0, z: 0, face };
  const [w, d] = spotSize(probe);
  return {
    ...probe,
    ...(place.label ? { label: place.label } : {}),
    x: round(centre.x + ox - w / 2),
    z: round(centre.z + oz - d / 2),
    y: top,
    ...(shelf.level ? { level: shelf.level } : {}),
  };
}

/** Auf Millimeter — Drehungen um Vierteldrehungen sollen keine Krümel lassen. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000 + 0;
}

/**
 * **Ob eine Stelle auf die Ablage passt** — jede Zelle ihrer Grundfläche liegt
 * auf der Grundfläche der Ablage, und keine ist schon von etwas anderem
 * obenauf belegt (`taken`, Zellen wie `spotFootprintCells`).
 */
export function fitsOnShelf(
  shelf: ElementSpot,
  rider: ElementSpot,
  taken: ReadonlySet<string>,
): boolean {
  const room = new Set(spotFootprintCells(shelf));
  return spotFootprintCells(rider).every((cell) => room.has(cell) && !taken.has(cell));
}
