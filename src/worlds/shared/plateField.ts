import { TILE } from '../nav/navTile';

/**
 * **Welche Kachel draußen eine Platte bekommt — und welchen Ton sie hat.**
 *
 * Reine Rechnung, kein three.js: dasselbe Schnittmuster wie in
 * `worlds/grid/gridBatch.ts` („Wie überall in diesem Verzeichnis: reine
 * Rechnung, kein three.js"). Was eine Platte auf der Grafikkarte ist, steht
 * nebenan in `plateFloor.ts`; hier steht nur, **wo** sie liegt. Das ist der
 * einzige Teil des Plattenbodens, den man ohne Brille prüfen kann, und genau
 * deshalb liegt er allein.
 *
 * Die Aufgabe hat drei Teile, und alle drei sind Arithmetik:
 *
 * - **Ein Ring um das Gelände** — der Boden geht bis zum Horizont (500 m,
 *   `environment.WORLD_RADIUS`), die Platten können das nicht. 500 × 500 m in
 *   2-m-Platten wären 250 000 Stück; der Ring ist endlich, dahinter bleibt die
 *   gekachelte Leinwand stehen, wie sie ist.
 * - **Ein ausgelassenes Rechteck darin** — wo das Gelände gebaut ist, liegt
 *   schon ein Boden. Siehe `plateSpots`: ausgelassen wird nur, was **ganz**
 *   darin liegt.
 * - **Und ein Schachbrett darüber** — hell und dunkel im Wechsel, siehe
 *   `plateDark`.
 */

/** Ein achsenparalleles Rechteck in Weltmetern: Ecke und Kantenlängen. */
export interface PlateArea {
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Eine Platte: die Mitte ihrer Oberseite in Metern, und ob sie die dunkle ist. */
export interface PlateSpot {
  x: number;
  z: number;
  dark: boolean;
}

/**
 * **Wie groß eine Platte ist** — zwei Meter, also zwei Kacheln des Baugitters.
 *
 * Die Zahl ist eine Umrechnung und keine Eigenschaft der Datei. Am geladenen
 * Modell gemessen (`plateFloor.ts`, `THREE.Box3`) ist `Floor_Prototype.glb`
 * 4,000 × 0,500 × 4,000 Quelleinheiten groß; mit dem Maßstab seines Pakets
 * (`core/kaykitFit.KAYKIT_PACK_SCALE`, `prototype-bits` steht auf **0,7** und
 * nicht auf 0,5) wären das **2,80 × 0,35 × 2,80 m** — eine Kantenlänge, die
 * auf dem Metergitter dieser Welt nirgends aufgeht. Eine Platte, deren Kante
 * zwischen zwei Kacheln fällt, ist genau das, wovor der Boden draußen schon
 * einmal umgebaut wurde: „Ein Raster daneben, das nicht dazu passt, ist
 * schlimmer als keines" (`worlds/test/TestWorld.horizonColor`).
 *
 * **Warum zwei und nicht eins:** Ein Feld von einem Meter wäre das feinste
 * mögliche und viermal so viele Platten für denselben Ring — und es zöge die
 * Zeichnung der Platte selbst auf gut ein Drittel der Größe zusammen, in der
 * sie gezeichnet wurde. Sie hat eine: Ihr Stück des Paket-Atlas ist 200 × 235
 * Bildpunkte groß (nachgesehen an den UV-Koordinaten der Datei), also ein
 * Prototypen-Raster mit Markierungen und kein Farbfleck.
 *
 * **Warum zwei und nicht drei**, obwohl drei näher an den natürlichen 2,80 m
 * läge: Das Schachbrett draußen ist ein **Lineal** — es ist dafür da, dass man
 * Felder zählen kann und weiß, wie weit man gelaufen ist (`environment.ts`,
 * `CHECKER_TILE`). Zwei Meter sind **zwei** Kacheln: Jede Plattenfuge ist auch
 * eine Linie des Baugitters, nur eben jede zweite. Drei Meter wären ein Lineal
 * mit krummen Strichen.
 *
 * Nachgerechnet kommt dabei ein Gesamtmaßstab von **0,5** heraus — ausgerechnet
 * die Halbierung, die für alles aus dieser Werkstatt sonst gilt
 * (`core/kaykitFit.KAYKIT_SCALE`). Das ist ein Zufall und kein Grund: Für
 * `prototype-bits` gilt sie eben **nicht**, weil in dem Paket eine Figur und
 * eine Tür liegen. Genau deshalb wird am geladenen Modell gemessen und nicht
 * eine Zahl abgeschrieben, die zufällig dreimal hintereinander gestimmt hat.
 */
export const PLATE_SIZE = 2 * TILE;

/**
 * **Wie weit der Ring über das Gelände hinausreicht**, in Metern.
 *
 * Zweiunddreißig, und die Zahl ist geborgt: Es ist die **Kantenlänge des
 * Kastens, in dem diese Maschine scharfe Schatten zeichnet**
 * (`core/graphicsSettings.graphicsProfile`, `shadowRange: 16` — „sechzehn
 * Meter um den Kopf, also ein Kasten von zweiunddreißig"). Weiter als bis
 * dorthin reicht das, was diese Engine von sich aus „nah" nennt.
 *
 * Damit steht die Schürze auf beiden Beinen, die sie braucht:
 *
 * - **Weit genug.** Wer irgendwo auf dem Gelände steht, hat seinen ganzen
 *   Schattenkasten auf Platten — und wer an der äußersten Kante des Geländes
 *   steht und hinausschaut, sieht die Platten doppelt so weit laufen wie seine
 *   eigenen Schatten. Die Kante dahinter liegt dann 32 m entfernt und damit
 *   bei Augenhöhe knapp 3° unter dem Horizont: ein Band, kein Rand.
 * - **Klein genug.** Um das Gelände der Testwelt (77 × 105 Kacheln) sind das
 *   4 059 Platten zu je 20 Dreiecken, also rund 81 000 Dreiecke — und **zwei**
 *   Zeichenaufrufe, weil es zwei `InstancedMesh` sind (`plateFloor.ts`). Ein
 *   Meter je Platte wären dieselben Dreiecke bei einem Viertel der Schürze.
 */
export const PLATE_SKIRT = 32;

/**
 * **Welches Feld das dunkle ist** — Zeile plus Spalte, gerade oder ungerade.
 *
 * Das älteste Schachbrett der Welt und hier bewusst ohne jede Feinheit: Die
 * **Phase** ist frei. Unter einer Platte von zwei Metern liegen zwei Felder
 * der gekachelten Leinwand (ein Meter je Feld, `environment.CHECKER_TILE`),
 * also immer ein helles und ein dunkles — es gibt keine Stellung, in der die
 * Platte mit dem Boden darunter „zusammenfiele", und deshalb auch keine, die
 * man treffen müsste.
 *
 * Die Verrenkung mit `+ 2` ist die übliche: `%` gibt in JavaScript bei
 * negativen Zahlen ein negatives Ergebnis, und die Spalten links vom Gelände
 * haben negative Nummern.
 */
export function plateDark(col: number, row: number): boolean {
  return (((col + row) % 2) + 2) % 2 === 1;
}

/**
 * **Alle Platten der Schürze** — der Ring um `hole`, ohne `hole` selbst.
 *
 * Das Raster hängt an der **Ecke des ausgelassenen Rechtecks** und nicht am
 * Weltnullpunkt, und das ist der einzige Kniff in dieser Funktion: Damit
 * fallen zwei der vier Kanten des Geländes von selbst auf eine Plattenfuge.
 *
 * Die anderen beiden können es nicht, und daran hängt die zweite Entscheidung.
 * Das Gelände der Testwelt ist 77 × 105 Kacheln groß — beide Zahlen
 * **ungerade**, eine Platte ist zwei Kacheln breit, und damit liegt die
 * gegenüberliegende Kante zwangsläufig **mitten** in einer Platte. Für die
 * betroffene Platte gibt es genau zwei Möglichkeiten:
 *
 * - **weglassen** — dann bleibt außerhalb des Geländes ein ein Meter breiter
 *   Streifen nackter Leinwand zwischen dem gebauten Boden und der ersten
 *   Platte. Das sieht aus wie ein Fehler, weil es einer wäre.
 * - **stehen lassen** — dann ragt sie einen Meter in das Gelände hinein, und
 *   dort ist sie **unsichtbar**: Der gebaute Boden der Testwelt ist eine Masse
 *   von y = −0,50 bis y = −0,02 (`worlds/test/testPlan.ts`,
 *   `plan.mass('floor', FIELD, -0.5, -0.02)`), die Platte liegt mit ihrer
 *   Oberkante bei −0,03 (`plateFloor.PLATE_LIFT`) und damit vollständig
 *   darunter.
 *
 * Also bleibt sie stehen, und die Regel lautet: **ausgelassen wird nur, was
 * ganz im Rechteck liegt.** Eine Platte, die auch nur mit einer Kante
 * herausschaut, wird gesetzt — der Ring schließt damit lückenlos an den
 * gebauten Boden an, und was zu viel ist, liegt begraben.
 *
 * Herausgereicht wird die **Mitte** jeder Platte, weil das die Stelle ist, an
 * der sie gesetzt wird; wer die Kanten braucht, rechnet `PLATE_SIZE / 2`
 * dazu.
 */
export function plateSpots(
  hole: PlateArea,
  size: number = PLATE_SIZE,
  skirt: number = PLATE_SKIRT,
): PlateSpot[] {
  // So viele Platten braucht das Rechteck selbst, aufgerundet — die letzte
  // ragt heraus, siehe oben. Und so viele kommen auf jeder Seite dazu; auch
  // hier aufgerundet, denn eine halbe Platte Schürze gibt es nicht und zu
  // schmal soll sie nicht werden.
  const cols = Math.ceil(hole.w / size);
  const rows = Math.ceil(hole.d / size);
  const pad = Math.ceil(skirt / size);

  const out: PlateSpot[] = [];
  for (let col = -pad; col < cols + pad; col++) {
    const x = hole.x + col * size;
    // Ganz im Rechteck ist eine Spalte nur, wenn **beide** Kanten drin liegen.
    const insideX = x >= hole.x && x + size <= hole.x + hole.w;
    for (let row = -pad; row < rows + pad; row++) {
      const z = hole.z + row * size;
      const insideZ = z >= hole.z && z + size <= hole.z + hole.d;
      if (insideX && insideZ) continue;
      out.push({ x: x + size / 2, z: z + size / 2, dark: plateDark(col, row) });
    }
  }
  return out;
}
