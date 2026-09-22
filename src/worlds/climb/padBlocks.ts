import type { PadRect } from './crashPad';

/**
 * **Das Kissen als Feld aus Klötzen** — wie viele, wie groß, und wo jeder
 * einzelne steht.
 *
 * Bis hierher war das Sprungkissen **ein** blauer Quader von 8 × 3 m mal
 * 1,40 m. Er ist es immer noch — als **Körper**: Die Feder, der kinematische
 * Collider und alles, was einen auffängt, stehen unverändert in `crashPad.ts`
 * und werden hier nicht angefasst. Getauscht wird das **Bild**, und zwar
 * gegen das, was bestellt wurde: `block-bits/colored_block_blue.glb`, und
 * zwar „mehrere davon". Aus dem einen Quader wird damit ein Feld aus Klötzen,
 * so wie in einer Halle mehrere Matten nebeneinander liegen und nicht eine
 * genähte von acht Metern.
 *
 * ## Warum das hier steht und nicht in der Zone
 *
 * Weil es reine Rechnung ist: ein Rechteck, eine Höhe, zwei Divisionen. Ob
 * die Klötze das Kissen lückenlos und ohne Überstand ausfüllen, ist damit
 * eine Frage an einen Test und nicht an eine Sitzung mit der Brille auf —
 * dieselbe Begründung, mit der die Feder nebenan in `crashPad.ts` liegt.
 *
 * ## Und warum die Klötze nicht wissen, wie groß das Modell ist
 *
 * Das Regalmodell ist ein Würfel von 2 Quelleinheiten, halbiert also ein
 * Meter (`core/kaykitFit.KAYKIT_SCALE`) — aber das ist ein **Beleg** dafür,
 * dass ein Meter je Klotz eine vernünftige Bestellung ist, und keine Eingabe
 * für diese Datei. Gemessen wird am geladenen Netz, und eingepasst wird das
 * Modell dann in das Fach, das hier gerechnet wurde
 * (`worlds/test/zones/propFit.ts`). Wer das Modell austauscht, tauscht eine
 * Zeile und keine Rechnung.
 */

/**
 * **Wie breit ein Klotz sein soll**, in Metern — und warum genau so.
 *
 * Ein Meter ist die Kachel dieser Welt (`nav/navTile.TILE`), und das Kissen
 * ist 8 × 3 m groß: Es geht also **ohne Rest** auf, 8 × 3 = 24 Klötze je
 * Lage, keine halbe Matte am Rand. Das Modell liefert bei seinem Paketmaßstab
 * genau diesen einen Meter mit, verzogen wird also nichts. Kleinere Klötze
 * wären mehr Dreiecke für ein Muster, das man beim Hinunterspringen ohnehin
 * nicht liest; größere ließen am Rand einen Streifen offen.
 */
export const PAD_BLOCK_AIM = 1;

/**
 * **Und wie viele Lagen übereinander** — zwei.
 *
 * Das Kissen ist 1,40 m dick, der Klotz ein Würfel. Drei Wege standen zur
 * Wahl, und die Zahlen entscheiden:
 *
 * - **Eine Lage**, auf 1,40 m gestreckt: Jeder Klotz wäre 40 % höher als
 *   breit.
 * - **Zwei Lagen** zu 0,70 m: Jeder Klotz ist 30 % flacher als breit, und die
 *   Fuge auf halber Höhe liest sich wie das, was es sein soll — zwei Matten
 *   aufeinander.
 * - **Eine Lage auf einem Sockel** von 0,40 m: Der Klotz bliebe ein Würfel,
 *   aber der Sockel wäre wieder der gebaute Quader, den hier gerade jemand
 *   loswerden wollte.
 *
 * Zwei Lagen verziehen also am wenigsten und bringen eine Kante mehr ins
 * Bild. Dass beim **Einsinken** ohnehin alles gestaucht wird, spricht nicht
 * dagegen: Ein Kissen, das unter einem nachgibt, soll flacher werden — das
 * ist der ganze Trick (`worlds/test/zones/climb.ts`, `showPad`).
 */
export const PAD_BLOCK_LAYERS = 2;

/** Ein Klotz, im Koordinatensystem des Kissenquaders. */
export interface PadBlockSpot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Das ganze Feld: die Maße eines Klotzes und die Plätze aller. */
export interface PadBlockField {
  /** Klötze in Ost-West-Richtung und in Nord-Süd-Richtung, je Lage. */
  readonly cols: number;
  readonly rows: number;
  readonly layers: number;
  /** Die Kantenlängen eines einzelnen Klotzes, in Metern. */
  readonly size: PadBlockSpot;
  /**
   * Die Mittelpunkte, **relativ zur Mitte des Kissenquaders** — also genau
   * das, was ein Bündeleintrag braucht, wenn er an derselben Gruppe hängt wie
   * der Quader. `y = 0` ist die halbe Höhe des Kissens, nicht sein Boden.
   */
  readonly spots: readonly PadBlockSpot[];
}

/**
 * **Das Feld rechnen** — aus dem Rechteck des Kissens und seiner Ruhedicke.
 *
 * Gerundet und nicht abgeschnitten: Ein Kissen von 8,4 m bekommt acht Klötze
 * zu 1,05 m und keine acht zu einem Meter mit einem Streifen daneben. Die
 * Klötze füllen ihr Rechteck **immer** vollständig aus — das ist die
 * Bedingung, unter der ein Bild ein Körper sein darf.
 */
export function padBlockField(
  rect: PadRect,
  height: number,
  layers: number = PAD_BLOCK_LAYERS,
): PadBlockField {
  const width = Math.max(0, rect.maxX - rect.minX);
  const depth = Math.max(0, rect.maxZ - rect.minZ);
  const cols = Math.max(1, Math.round(width / PAD_BLOCK_AIM));
  const rows = Math.max(1, Math.round(depth / PAD_BLOCK_AIM));
  const stack = Math.max(1, Math.round(layers));
  const size = { x: width / cols, y: Math.max(0, height) / stack, z: depth / rows };

  const spots: PadBlockSpot[] = [];
  for (let layer = 0; layer < stack; layer++) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        spots.push({
          x: -width / 2 + size.x * (col + 0.5),
          y: -Math.max(0, height) / 2 + size.y * (layer + 0.5),
          z: -depth / 2 + size.z * (row + 0.5),
        });
      }
    }
  }
  return { cols, rows, layers: stack, size, spots };
}
