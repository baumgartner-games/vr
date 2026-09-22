import { GridPlan } from '../grid/gridPlan';
import { DIR_N, DIR_S, DIR_W } from '../nav/navTile';
import { PIT_BAYS, PIT_BOXES, PIT_LANE } from './kartCourse';

/**
 * **Die Boxengasse als Grundriss** — Asphalt, Buchten, Mauern.
 *
 * Die Grenze ist dieselbe wie überall auf dem Gitter: Was Kachelform hat, kommt
 * aufs Raster, und was keine hat, bleibt draußen. Eine **Kurve ist kein
 * Kachelrechteck**, der Asphalt der Strecke ist deshalb weiterhin ein Band
 * entlang der Mittellinie (`test/zones/kart.ts`) — aber die Mittellinie selbst
 * liegt auf dem Raster, weil sie aus Kachel-Teilen gelegt wird
 * (`kartCourse.ts`). Alles hier ist gerastert: Gasse, Buchten, Säulen, Mauern
 * und die Tafeln, an denen ein Portal haftet.
 *
 * **Sie stempelt in einen Plan, den sie nicht selbst anlegt.** Solange das
 * Gokart eine eigene Welt war, baute diese Datei deren ganzen Grundriss samt
 * Wiese und Rücktor. Seit sie eine **Zone der Testwelt** ist (`worlds/test/`),
 * gehören Boden und Tor dem Gelände: Der Boden ist **eine** Masse unter allen
 * Zonen (eine Portalfläche je Welt), und das Tor steht neben dem Startplatz in
 * der Mitte. Übrig bleibt genau das, was die Gasse ausmacht.
 *
 * **Und kein Dach.** Von oben ist ein gedeckelter Boxenplatz ein schwarzer
 * Balken, unter dem ausgerechnet die Karts stehen, die man sucht. Die Säulen
 * zwischen den Buchten bleiben — sie sagen, wo eine Bucht aufhört und die
 * nächste anfängt, und dafür braucht es nichts darüber.
 */

/** Wie hoch die Säulen zwischen den Buchten stehen. */
export const PIT_POST = 2.6;
/** Wo die Oberkante des Asphalts liegt — knapp über dem Gelände. */
export const TARMAC_TOP = 0.02;

/**
 * **Die Kachel, in der die Nordmauer der Gasse ihre Lücke hat** — der Eingang
 * für alle, die zu Fuß kommen.
 *
 * Die mittlere, weil eine Lücke am Rand neben der Boxenreihe läge und die
 * Gasse dort ohnehin am engsten ist.
 */
export const PIT_GATE = PIT_LANE.x + 1;

/**
 * Gasse und Boxen in einen bestehenden Grundriss stempeln.
 *
 * @returns denselben Plan, damit sich Aufrufe aneinanderreihen lassen.
 */
export function stampPit(plan: GridPlan): GridPlan {
  // **Gelaufen wird hier auch**, nicht nur gefahren: Wer zu seinem Kart geht,
  // geht über die Gasse, und ein NPC soll den Weg dorthin kennen. Also
  // Kacheln und nicht bloß eine Masse — es sind vierzig Stück, und die
  // Strecke daneben bleibt ein Band.
  plan.floor(PIT_LANE);
  plan.floor(PIT_BOXES);

  // Der Asphalt. Er stößt kachelbündig an den Streckenkorridor — was man
  // sieht, ist genau die Fläche, auf der ein Kart fahren darf
  // (`kartCourse.ts`, `PIT_APRON`).
  plan.mass('stone', PIT_LANE, -0.06, TARMAC_TOP);
  plan.mass('stone', PIT_BOXES, -0.06, TARMAC_TOP);

  // Rückwand und die beiden Giebelseiten der Boxen. Nach Osten bleibt offen —
  // dort stehen die Karts.
  plan.run(PIT_BOXES.x, PIT_BOXES.z, PIT_BOXES.d, 'z', (x, z) => plan.wall(x, z, DIR_W));
  const boxEnd = PIT_BOXES.z + PIT_BOXES.d - 1;
  plan.run(PIT_BOXES.x, PIT_BOXES.z, PIT_BOXES.w, 'x', (x, z) => plan.wall(x, z, DIR_N));
  plan.run(PIT_BOXES.x, boxEnd, PIT_BOXES.w, 'x', (x, z) => plan.wall(x, z, DIR_S));

  // Die Säulen stehen **zwischen** den Buchten und nicht darin — genau dafür
  // ist zwischen zwei Buchten eine Kachel Luft.
  const front = PIT_BOXES.x + PIT_BOXES.w - 1;
  for (let z = PIT_BOXES.z; z <= boxEnd; z++) {
    if (PIT_BAYS.includes(z)) {
      // In der Bucht selbst: die helle Tafel an der Rückwand. Sie hängt dort,
      // wo man ohnehin hinschaut, wenn man zu seinem Kart geht.
      plan.put('panel', PIT_BOXES.x, z, DIR_W);
      continue;
    }
    plan.put('pillar', front, z, DIR_N, 0, PIT_POST);
  }

  // Ein Regal und eine Bank an der Rückwand, in zwei der Trennkacheln: das,
  // was in einer Box herumsteht — und dieselben Bausteine, die anderswo in
  // dieser Welt auch stehen.
  plan.put('shelf', PIT_BOXES.x, PIT_BOXES.z + 1, DIR_W);
  plan.put('bench', PIT_BOXES.x, boxEnd - 1, DIR_W);

  /**
   * **Die Mauern der Gasse.** Vorn und hinten hört sie auf, und dort steht
   * etwas — sonst wäre die Grenze, an der ein Kart zurückgesetzt wird
   * (`confineToCourse`), unsichtbar. Nach Osten bleibt sie offen: das *ist*
   * die Ausfahrt. Nach Westen steht eine Mauer überall, wo keine Box ist.
   *
   * **Und in der Nordmauer bleibt eine Kachel frei** (`PIT_GATE`): Dort kommt
   * herein, wer zu Fuß zu seinem Kart geht. Ein Kart fährt dort nicht hinaus —
   * es wird von der Fläche gehalten und nicht von der Brüstung
   * (`kartTrack.confineToCourse`) —, aber ein Mensch läuft sonst gegen eine
   * Mauer, über die ihn kein Autostep hebt: Die Brüstung ist 0,55 m hoch
   * (`BLOCKS.parapet`), und gestiegen wird 0,32 m (`PhysicsLocomotion`).
   */
  const laneEnd = PIT_LANE.z + PIT_LANE.d - 1;
  plan.run(PIT_LANE.x, PIT_LANE.z, PIT_LANE.w, 'x', (x, z) => {
    if (x !== PIT_GATE) plan.put('parapet', x, z, DIR_N);
    plan.put('parapet', x, laneEnd, DIR_S);
  });
  for (let z = PIT_LANE.z; z <= laneEnd; z++) {
    if (z >= PIT_BOXES.z && z <= boxEnd) continue;
    plan.put('parapet', PIT_LANE.x, z, DIR_W);
  }

  return plan;
}

/** Dieselbe Gasse allein auf einem frischen Plan — für den Test daneben. */
export function kartPit(): GridPlan {
  return stampPit(new GridPlan([0]));
}
