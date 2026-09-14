import type { GridPlan } from '../../grid/gridPlan';
import { DIR_N } from '../../nav/navTile';
import { EFFECTS } from '../layout';

/**
 * **Die Effektquellen** — Norden, vier Düsen in einer Reihe.
 *
 * Rauch, Feuer, Funken, Wasser, mit je einem Knopf eine Kachel davor. Es ist
 * absichtlich dieselbe Reihenfolge wie im Menü des alten Effektlabors
 * (`effects/effectKinds.EFFECTS`) und es sind dieselben Zahlen — neue gibt es
 * keine, und wer eine Wolke ändern will, ändert sie dort.
 *
 * **Warum vier nebeneinander und nicht eine mit Auswahl.** Im Labor wurde der
 * Effekt in einem Menü gewählt, weil man davorstand und hinsah. Hier läuft man
 * vorbei, und vier Knöpfe nebeneinander sind vier Sachen zum Ausprobieren statt
 * einer Einstellung zum Blättern. Die Düsen tragen dafür die Farbe ihres
 * Effekts (`fixtures/emitter.ts`) — von oben sieht man auf einen Blick, welche
 * die Wasserfontäne ist.
 *
 * **Zwei Kacheln Abstand**, damit zwei Wolken nebeneinander noch zwei Wolken
 * sind. Wasser ist die kleinste: Eine Fontäne in voller Größe steht drei Meter
 * hoch und nimmt der Reihe daneben das Bild.
 */

/** Eine Quelle in der Reihe: was sie macht, wo sie steht, wie groß. */
interface EmitterSpot {
  id: string;
  effect: string;
  label: string;
  size: number;
  x: number;
}

/** Die Zeile, in der die Düsen stehen — die Knöpfe eine Kachel südlich davon. */
const NOZZLE_ROW = EFFECTS.z + 2;

export const EMITTERS: readonly EmitterSpot[] = [
  { id: 'quelle-rauch', effect: 'smoke', label: 'Rauch', size: 1, x: -4 },
  { id: 'quelle-feuer', effect: 'fire', label: 'Feuer', size: 1, x: -1 },
  { id: 'quelle-funken', effect: 'sparks', label: 'Funken', size: 1, x: 2 },
  { id: 'quelle-wasser', effect: 'water', label: 'Wasser', size: 0.75, x: 5 },
];

export function stampEffects(plan: GridPlan): void {
  // Die Rückwand im Norden: Sie hält die Reihe zusammen und trägt das Schild.
  plan.run(EFFECTS.x, EFFECTS.z, EFFECTS.w, 'x', (x, z) => plan.wall(x, z, DIR_N));

  plan.putFixture({
    id: 'schild-effekte',
    kind: 'sign',
    x: 0,
    z: EFFECTS.z,
    dir: DIR_N,
    props: { text: 'Vier Effektquellen — jeder Knopf löst die Düse hinter sich aus' },
  });

  for (const one of EMITTERS) {
    plan.putFixture({
      id: one.id,
      kind: 'emitter',
      x: one.x,
      z: NOZZLE_ROW,
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
      x: one.x,
      z: NOZZLE_ROW + 1,
      dir: DIR_N,
      props: { target: one.id, label: one.label },
    });
  }
}
