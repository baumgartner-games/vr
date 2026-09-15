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
 * austauscht, lässt das Werkzeug laufen und trägt die neue Liste ein — und
 * rechnet dabei `KITCHEN_SCALE` mit, siehe dort.
 */

/**
 * **Die Möbel kommen doppelt so groß, wie sie sein sollen** — also halbiert.
 *
 * Nachgemessen an der Datei: Eine Spüle ist dort 4 × 2,1 m groß und 2,3 m
 * hoch, ein Feuerlöscher 2 × 2 m und 2,5 m hoch, und der schmalste Unterschrank
 * belegt 2 × 2 m. Das ist keine Küche, das ist eine Turnhalle: Neben einem Koch
 * von 1,60 m (`core/chefFit.ts`) reichte ein Tresen bis über die Augen, und ein
 * einzelner Schrank war fünfmal so breit wie die Figur davor.
 *
 * Halbiert stimmt es: Ein Unterschrank belegt **eine** Kachel und ist einen
 * halben Meter hoch — beim Vorbild liegt die Arbeitsplatte auf einem guten
 * Drittel der Figurenhöhe, und genau dort liegt sie jetzt auch.
 *
 * Der Faktor sitzt am **Lader** (`core/kitchenModel.ts`) und nicht in der
 * Quelldatei: Die ist fremde Arbeit und wird nicht angefasst, und ein zweites
 * Aufbereiten für eine Zahl wäre 32 MB Rohdaten für einen Faktor. Die Maße in
 * diesem Katalog sind die **fertigen** — was hier steht, ist, wie groß ein
 * Möbel im Spiel ist.
 */
export const KITCHEN_SCALE = 0.5;

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
   * darunter läuft man durch.
   *
   * **In dieser Fassung der Quelle tut es keines.** Der Katalog führte das
   * Ausgaberegal als hängendes Stück von 3,52 m — die Datei sagt etwas
   * anderes: Es fängt wie jedes andere Möbel bei y = 0 an und ist 1,13 m hoch,
   * also ein Regal, das auf dem Boden steht. Das war keine Kleinigkeit,
   * sondern ein Loch: Ein hängendes Stück bekommt weder Körper noch
   * Wegaufschlag (`worlds/test/zones/kitchen.ts`), und man lief mitten durch
   * das Regal hindurch. Das Feld bleibt trotzdem — eine Dunstabzugshaube in
   * einer nächsten Quelle braucht es wieder.
   */
  readonly hanging?: boolean;
}

/**
 * **Die dreizehn Möbel**, in der Reihenfolge, in der sie aus der Quelle fallen
 * — mit den Maßen, die sie **im Spiel** haben, also halbiert
 * (`KITCHEN_SCALE`).
 *
 * Die Kachelzahl ist die gerundete Grundfläche und nicht die aufgerundete:
 * Ein Unterschrank ist einen Meter breit und 1,06 m tief, und wer daraus zwei
 * Kacheln macht, stellt eine ganze Reihe davon mit einem Meter Luft dazwischen
 * auf. Ein Möbel darf ein paar Zentimeter über seine Kachel hinausragen; eine
 * Küche mit Lücken darin ist keine Küche.
 *
 * Die Maße der **Quelle** stehen daneben, damit ein zweiter Lauf des Werkzeugs
 * nachrechenbar bleibt: 2 × 2 m und 1 m hoch für einen Unterschrank, 4 m breit
 * für Spüle, Ausgabetheke und Regal.
 */
export const KITCHEN_PIECES: readonly KitchenPiece[] = [
  { name: 'plate-counter', label: 'Tellerausgabe', tiles: [1, 1], height: 0.56 },
  { name: 'extinguisher', label: 'Feuerlöscher', tiles: [1, 1], height: 1.25 },
  { name: 'sink', label: 'Spüle', tiles: [2, 1], height: 1.15 },
  { name: 'bin', label: 'Mülleimer', tiles: [1, 1], height: 0.45 },
  { name: 'table', label: 'Arbeitstisch', tiles: [1, 1], height: 0.5 },
  { name: 'serve-counter', label: 'Ausgabe', tiles: [1, 1], height: 0.46 },
  { name: 'board', label: 'Schneidebrett', tiles: [1, 1], height: 0.57 },
  { name: 'plate-rack', label: 'Ausgaberegal', tiles: [2, 1], height: 0.56 },
  { name: 'pass', label: 'Ausgabetheke', tiles: [2, 1], height: 0.53 },
  { name: 'counter', label: 'Küchenzeile', tiles: [1, 1], height: 0.5 },
  { name: 'stove', label: 'Herd', tiles: [1, 1], height: 0.55 },
  { name: 'stove-pot', label: 'Herd mit Topf', tiles: [1, 1], height: 0.87 },
  { name: 'stove-pan', label: 'Herd mit Pfanne', tiles: [1, 1], height: 0.68 },
];

/** Die Namen allein — für Listen, die keine Maße brauchen. */
export const KITCHEN_NAMES: readonly string[] = KITCHEN_PIECES.map((piece) => piece.name);

/** Ein Möbel nach Namen, oder `undefined` — Fremdtext kommt über das Netz. */
export function kitchenPiece(name: string): KitchenPiece | undefined {
  return KITCHEN_PIECES.find((piece) => piece.name === name);
}
