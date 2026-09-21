import { TILE } from '../nav/navTile';

/**
 * **Was hingestellt wird, rastet auf dem Kachelgitter ein** — reine Rechnung,
 * ohne three.js und ohne Physik.
 *
 * Ein Modell aus dem Regal (`props.ModelKind`) ist ein **Möbel**: ein Fass, ein
 * Zaun, eine Truhe, eine Wand. Die Möbel dieses Spiels stehen auf Kacheln und
 * schauen in eine der vier Himmelsrichtungen — die Küche tut es
 * (`test/zones/kitchenPlan.Spot`), der Editor tut es (`grid/gridTool.ts`), und
 * der Konstrukt-Raum stellt seine Auswahl aus demselben Grund in
 * Vierteldrehungen hin (`shared/construct.slotTurn`). Wer aus dem Regal eine
 * Reihe Fässer hinstellt, will genau das: eine **Reihe**, und keine Sammlung
 * schräg stehender Fässer, die sich um ein paar Zentimeter verfehlen.
 *
 * Also rastet ein abgelegtes Modell ein, und zwar in beidem:
 *
 * - **Die Kachelmitte** in x und z (`tileCentre`). Dieselbe Kachel wie überall
 *   sonst (`nav/navTile.TILE`, 1 m), also decken sich Regal, Küche und Editor
 *   ohne eine zweite Zahl.
 * - **Die Vierteldrehung** um die Hochachse (`quarterYaw`), und der Rest der
 *   Lage fällt weg: Ein Fass, das man schief in der Faust hielt, steht danach
 *   aufrecht. Nicken und Rollen zu behalten hieße, ein Möbel auf die Kante zu
 *   stellen, das man gerade hinstellen wollte.
 *
 * **Die Höhe bleibt, wie sie ist**, und das ist Absicht: Wo der Boden unter
 * einem Punkt liegt, weiß hier niemand — es kann der Estrich sein, ein Tisch
 * oder das Dach eines Hauses. Also bleibt y stehen, die Geschwindigkeit geht
 * auf null, und den letzten Zentimeter macht die Schwerkraft. Ein Kasten, der
 * ohne Drall aufrecht auf eine ebene Fläche fällt, bleibt aufrecht stehen.
 *
 * **Geworfen wird trotzdem noch.** Einrasten soll, was jemand *hinstellt* —
 * wer ein Fass durch den Raum wirft, meint etwas anderes, und ein Wurf, der
 * mitten im Flug auf eine Kachelmitte springt, sähe aus wie ein Fehler.
 * Die Grenze dazwischen ist `PLACE_SPEED`.
 */

/** Eine Lage, so weit sie hier gebraucht wird: eine Stelle und ein Gierwinkel. */
export interface GridPose {
  readonly x: number;
  readonly z: number;
  /** Die Drehung um die Hochachse, in Bogenmaß — immer ein Vielfaches von 90°. */
  readonly yaw: number;
}

/** Was von einer Drehung hier gelesen wird — die vier Zahlen eines Quaternions. */
export interface Turned {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

/**
 * **Ab welcher Geschwindigkeit es ein Wurf ist**, in Metern je Sekunde.
 *
 * Anderthalb Meter je Sekunde ist die Geschwindigkeit, mit der eine Hand beim
 * Absetzen noch nachgibt — schneller als ein Hinstellen, langsamer als jedes
 * Werfen. Gemessen wird dieselbe Zahl, die auch den Wurf antreibt
 * (`PortalWorld.release`, `grab.velocity`), also gibt es keine zweite
 * Buchführung darüber, wie schnell eine Hand gerade war.
 */
export const PLACE_SPEED = 1.5;

/**
 * **Die Mitte der Kachel, in der ein Punkt liegt**, in Metern.
 *
 * `Math.floor` und nicht `Math.round`: Gesucht ist die Kachel, auf der das Ding
 * **steht**, und die reicht von ihrer Fuge bis zur nächsten. Mit `round` läge
 * die Grenze in der Kachelmitte, und ein Fass auf der Mitte von Kachel 3 sprünge
 * je nach letztem Bit nach 3 oder nach 4.
 */
export function tileCentre(value: number): number {
  return (Math.floor(value / TILE) + 0.5) * TILE;
}

/**
 * **Der Gierwinkel einer Drehung**, in Bogenmaß.
 *
 * Gelesen wird er an der **Blickrichtung**: Die dritte Spalte der Drehmatrix
 * ist das gedrehte +z des Objekts, und ihr Winkel in der Bodenebene ist genau
 * das, was three.js bei einer reinen Drehung um die Hochachse in `rotation.y`
 * schreibt. Über die Eulerwinkel zu gehen wäre der Umweg — dort hängt die Zahl
 * an der Reihenfolge der Achsen, und die steht an einem Gegenstand, der durch
 * die Luft geflogen ist, nirgends fest.
 *
 * Zeigt das Objekt senkrecht nach oben oder unten, ist die Blickrichtung in der
 * Bodenebene ein Punkt; dann ist die Antwort 0. Das ist kein Sonderfall, den
 * jemand abfangen müsste — ein Ding ohne Richtung bekommt eine.
 */
export function yawOf(rotation: Turned): number {
  const { x, y, z, w } = rotation;
  const ahead = { x: 2 * (x * z + w * y), z: 1 - 2 * (x * x + y * y) };
  if (Math.abs(ahead.x) < 1e-9 && Math.abs(ahead.z) < 1e-9) return 0;
  return Math.atan2(ahead.x, ahead.z);
}

/**
 * **Auf die nächste Vierteldrehung gerundet**, in Bogenmaß — und das Ergebnis
 * liegt in (−180°, 180°].
 *
 * Genau zwischen zwei Vierteln gewinnt die größere, weil `Math.round` es so
 * macht; welche das ist, sieht an einem Fass niemand.
 */
export function quarterYaw(yaw: number): number {
  if (!Number.isFinite(yaw)) return 0;
  const quarter = Math.PI / 2;
  const turns = ((Math.round(yaw / quarter) % 4) + 4) % 4;
  return turns > 2 ? (turns - 4) * quarter : turns * quarter;
}

/**
 * **Die eingerastete Lage** — Kachelmitte in x und z, Vierteldrehung um die
 * Hochachse, und sonst nichts.
 */
export function gridPose(x: number, z: number, rotation: Turned): GridPose {
  return { x: tileCentre(x), z: tileCentre(z), yaw: quarterYaw(yawOf(rotation)) };
}

/**
 * **Ob dieses Loslassen ein Hinstellen war.**
 *
 * `placed` sagt es ausdrücklich — am Schirm legt der Benutzen-Knopf ab, und
 * dabei ist die Figur womöglich gerade gelaufen (`PortalWorld.updateScreenCarry`).
 * Sonst entscheidet die Geschwindigkeit: langsam ist hingestellt, schnell ist
 * geworfen.
 */
export function placesOnGrid(speed: number, placed: boolean): boolean {
  if (placed) return true;
  return Number.isFinite(speed) && speed <= PLACE_SPEED;
}
