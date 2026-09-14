import type { GridPlan } from '../grid/gridPlan';
import { DIR_N } from '../nav/navTile';
import { tileX, tileZ, type Cell } from './streetPlan';

/**
 * **Die Effektecke der Straßenküche** — das Effektlabor, in einer Welt, in der
 * man läuft.
 *
 * Vier Quellen in einer Reihe im Südosten: Rauch, Feuer, Funken, Wasser, mit je
 * einem Knopf eine Kachel davor. Das ist absichtlich dieselbe Reihenfolge wie
 * im Menü des Labors (`effects/effectKinds.EFFECTS`) und dieselben Zahlen —
 * neue gibt es keine, und wer eine Wolke ändern will, ändert sie dort.
 *
 * **Warum vier nebeneinander und nicht eine mit Auswahl.** Im Labor wird der
 * Effekt in einem Menü gewählt, weil man dort steht und hinsieht. Hier läuft
 * man vorbei, und vier Knöpfe nebeneinander sind vier Sachen zum Ausprobieren
 * statt einer Einstellung zum Blättern. Die Düsen tragen dafür die Farbe ihres
 * Effekts (`fixtures/emitter.ts`) — von oben sieht man auf einen Blick, welche
 * die Wasserfontäne ist.
 *
 * **Die Knöpfe gehören P6** (`fixtures/button.ts`). Solange es die Art in
 * diesem Programm nicht gibt, stehen sie im Plan und werden beim Bauen
 * übersprungen und gemeldet — und die Quellen bleiben trotzdem zu gebrauchen:
 * Wer `on: true` in eine Zeile schreibt, hat eine, die von selbst läuft.
 */
export function stampEffects(plan: GridPlan): void {
  for (const one of EMITTERS) {
    plan.putFixture({
      id: one.id,
      kind: 'emitter',
      x: tileX(one.at.col),
      z: tileZ(one.at.row),
      dir: DIR_N,
      props: { effect: one.effect, size: one.size },
    });
    /**
     * **Der Knopf davor** — eine Kachel südlich, also auf der Seite, von der
     * man kommt. `target` zeigt auf die Quelle dahinter: Ein Knopf, der „die
     * Kachel daneben" schaltete, zeigte ins Leere, sobald jemand die Düse eine
     * Kachel weiter setzt.
     */
    plan.putFixture({
      id: `${one.id}-knopf`,
      kind: 'button',
      x: tileX(one.at.col),
      z: tileZ(one.at.row + 1),
      dir: DIR_N,
      props: { target: one.id, label: one.label },
    });
  }
}

/** Eine Quelle in der Reihe: was sie macht, wo sie steht, wie groß. */
interface EmitterSpot {
  id: string;
  effect: string;
  label: string;
  size: number;
  at: Cell;
}

/**
 * **Die vier Quellen**, von West nach Ost in der Reihenfolge des Labors.
 *
 * Zeile 12 für die Düsen, Zeile 13 für die Knöpfe, jede zweite Spalte zwischen
 * 16 und 22 — dort ist in der Zeichnung nichts als Beton, und vom Startplatz
 * sind es vier Schritte nach Osten. Zwei Kacheln Abstand, damit die Wolken
 * nebeneinander noch zwei Wolken sind.
 *
 * Wasser ist die kleinste: Eine Fontäne in voller Größe steht drei Meter hoch
 * und nimmt der Reihe daneben das Bild.
 */
export const EMITTERS: readonly EmitterSpot[] = [
  { id: 'quelle-rauch', effect: 'smoke', label: 'Rauch', size: 1, at: { col: 16, row: 12 } },
  { id: 'quelle-feuer', effect: 'fire', label: 'Feuer', size: 1, at: { col: 18, row: 12 } },
  { id: 'quelle-funken', effect: 'sparks', label: 'Funken', size: 1, at: { col: 20, row: 12 } },
  { id: 'quelle-wasser', effect: 'water', label: 'Wasser', size: 0.75, at: { col: 22, row: 12 } },
];
