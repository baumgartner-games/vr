/**
 * **Der Möbelkatalog der Küche** — was es gibt, wie groß es ist und wie es
 * heißt. Ohne three.js, ohne Vite, ohne Datei.
 *
 * Getrennt von `core/kitchenModel.ts` aus demselben Grund wie bei der Figur
 * (`core/chefFit.ts`): Der Lader dort braucht `GLTFLoader` und `import.meta`,
 * und beides gibt es in Jest nicht. Was ein Editor über ein Möbel wissen muss
 * — Name, Beschriftung, Grundfläche, Höhe —, sind Zahlen, und die stehen hier.
 *
 * Geschrieben werden sie von `tools/kitchen-model.mjs --list`. Wer die Quelle
 * austauscht, lässt das Werkzeug laufen und trägt die neue Liste ein.
 */

/** Ein Möbel im Katalog. */
export interface KitchenPiece {
  /** Der Name des Knotens in `public/models/kitchen.glb`. */
  readonly name: string;
  /** Wie es im Menü heißt. */
  readonly label: string;
  /** Wie viele Kacheln es belegt (`worlds/nav/navTile.TILE` = 1 m). */
  readonly tiles: readonly [x: number, z: number];
  /** Wie hoch es ist, in Metern — für Kopffreiheit und Sicht. */
  readonly height: number;
  /**
   * Ob es **hängt** statt zu stehen: Dann ist `height` seine Oberkante und
   * darunter läuft man durch. Genau ein Stück im Katalog tut das, und ohne
   * diese Zeile stünde die Dunstabzugshaube auf dem Boden.
   */
  readonly hanging?: boolean;
}

/**
 * **Die dreizehn Möbel**, in der Reihenfolge, in der sie aus der Quelle
 * fallen. Die Maße sind gemessen (`--list`) und nicht gerundet: Ein Tresen
 * ist dort 2 × 2 m, und das bleibt er — das Raster hier ist ein Meter, also
 * belegt er vier Kacheln.
 */
export const KITCHEN_PIECES: readonly KitchenPiece[] = [
  { name: 'plate-counter', label: 'Tellerausgabe', tiles: [2, 3], height: 1.12 },
  { name: 'extinguisher', label: 'Feuerlöscher', tiles: [2, 2], height: 2.5 },
  { name: 'sink', label: 'Spüle', tiles: [4, 3], height: 2.3 },
  { name: 'bin', label: 'Mülleimer', tiles: [2, 2], height: 0.9 },
  { name: 'table', label: 'Arbeitstisch', tiles: [2, 2], height: 1.0 },
  { name: 'serve-counter', label: 'Ausgabe', tiles: [2, 2], height: 0.91 },
  { name: 'board', label: 'Schneidebrett', tiles: [2, 2], height: 1.15 },
  { name: 'plate-rack', label: 'Ausgaberegal', tiles: [4, 2], height: 3.52, hanging: true },
  { name: 'pass', label: 'Ausgabetheke', tiles: [4, 3], height: 1.05 },
  { name: 'counter', label: 'Küchenzeile', tiles: [2, 3], height: 1.0 },
  { name: 'stove', label: 'Herd', tiles: [2, 3], height: 1.1 },
  { name: 'stove-pot', label: 'Herd mit Topf', tiles: [3, 3], height: 1.73 },
  { name: 'stove-pan', label: 'Herd mit Pfanne', tiles: [3, 3], height: 1.35 },
];

/** Die Namen allein — für Listen, die keine Maße brauchen. */
export const KITCHEN_NAMES: readonly string[] = KITCHEN_PIECES.map((piece) => piece.name);

/** Ein Möbel nach Namen, oder `undefined` — Fremdtext kommt über das Netz. */
export function kitchenPiece(name: string): KitchenPiece | undefined {
  return KITCHEN_PIECES.find((piece) => piece.name === name);
}
