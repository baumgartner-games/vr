import { PLAN_FLOOR_T } from '../../editor/levelPlan';
import type { GridPlan } from '../../grid/gridPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W } from '../../nav/navTile';
import { PODIUM, STOREY } from '../layout';

/**
 * **Treppe und Podest** — Nordosten, und die eine Ecke, in der es ein
 * Obergeschoss gibt.
 *
 * Fünf mal fünf Kacheln auf Ebene 1, eine Brüstung ringsum, vier Säulen
 * darunter und eine **vier Kacheln lange** Treppe hinauf. Oben ein Hebel, der
 * unten eine Lampe schaltet — dieselbe Kette wie im Nordwesten, nur über ein
 * Stockwerk hinweg, und damit der Beweis, dass ein `trigger` keine
 * Etagengrenze kennt.
 *
 * **Warum das Podest auf Säulen steht und nicht auf einer Wand.** Von oben
 * verschwindet die obere Etage, solange die Figur unten steht, und kommt dazu,
 * sobald sie die halbe Treppe hinaufgestiegen ist (`core/cutaway.ts`). Bei
 * einem massiven Klotz sähe man nur, dass etwas erscheint, und nie, dass
 * darunter etwas war — unter dem Podest läuft man durch.
 *
 * **Eine Treppe ist drei Sachen** (AGENTS, _Welten auf dem Kachelgitter_): der
 * Baustein, das Loch in der Decke darüber und der Weg im Graphen. Alle drei
 * macht `GridPlan.stairs()`, und weil sie das Loch schlägt, wird sie **nach**
 * dem Boden der oberen Etage gerufen und nicht davor. Auf einem Metergitter ist
 * sie vier Kacheln lang: 2,80 m Etagenhöhe zu je 0,70 m Anstieg, vier Stufen
 * von 17,5 cm auf 25 cm Tiefe — eine Treppe, die man hinaufgeht, ohne darüber
 * nachzudenken.
 */

/** Das Podest auf Ebene 1: fünf mal fünf Kacheln in der Nordhälfte der Zone. */
export const DECK = { x: PODIUM.x + 4, z: PODIUM.z, w: 5, d: 5 } as const;

/** Wie viele Kacheln die Treppe lang ist — 2,80 m zu 0,70 m je Kachel. */
export const STAIR_LENGTH = 4;

/** Die Spalte, in der die Treppe liegt: die Mitte des Podests. */
export const STAIR_X = DECK.x + 2;
/**
 * Ihre **unterste** Kachel — so weit südlich, dass ihre letzte Stufe auf der
 * Südkante des Podests mündet.
 */
export const STAIR_FOOT = DECK.z + DECK.d - 1 + STAIR_LENGTH;
/** Und wo sie oben ankommt: die Landekachel auf Ebene 1. */
export const STAIR_LANDING = DECK.z + DECK.d - 1;

/** Die Lampe unten und der Hebel oben, der sie schaltet. */
export const DECK_LAMP = 'lampe-podest';
export const DECK_LEVER = 'hebel-podest';

export function stampPodium(plan: GridPlan): void {
  // **Der Boden des Obergeschosses.** Er liegt, bevor die Treppe ihr Loch
  // schlägt — sonst legte er es wieder zu.
  plan.floor({ ...DECK, level: 1 });

  // Die Treppe hinauf, von Süden kommend nach Norden steigend. Ihre letzte
  // Stufe mündet auf der Kachel davor, und dort steht man auf Ebene 1.
  plan.stairs(STAIR_X, STAIR_FOOT, DIR_N, 0, STAIR_LENGTH);

  /**
   * **Die Säulen darunter.** Vier an den Ecken, vom Gelände bis **unter** den
   * Boden des Podests (`PLAN_FLOOR_T`) und nicht bis auf seine Oberkante:
   * Sonst stehen von oben vier graue Flecken mitten im Podest.
   */
  const east = DECK.x + DECK.w - 1;
  const south = DECK.z + DECK.d - 1;
  for (const x of [DECK.x, east]) {
    for (const z of [DECK.z, south]) plan.put('pillar', x, z, DIR_N, 0, STOREY - PLAN_FLOOR_T);
  }

  /**
   * **Die Brüstung am Rand**, an jeder Kante, hinter der es hinuntergeht — die
   * Südkante der Treppenmündung bleibt frei, dort kommt man herauf.
   */
  for (let z = DECK.z; z <= south; z++) {
    for (let x = DECK.x; x <= east; x++) {
      if (z === DECK.z) plan.put('parapet', x, z, DIR_N, 1);
      if (z === south && x !== STAIR_X) plan.put('parapet', x, z, DIR_S, 1);
      if (x === DECK.x) plan.put('parapet', x, z, DIR_W, 1);
      if (x === east) plan.put('parapet', x, z, DIR_E, 1);
    }
  }
}

/**
 * **Die Einbauten dieser Zone** — und nur sie.
 *
 * Getrennt vom Rest, weil `TestWorld.planLoaded` sie **nach** einem
 * gespeicherten Umbau noch einmal aufsetzt: Ein Einbau hat eine **Kennung**,
 * und `putFixture` ersetzt nach Kennung — es entsteht also kein zweiter
 * daneben. Wände und Bausteine haben keine, und wer eine Wand wegbaut, hat sie
 * weggebaut.
 */
export function fitPodium(plan: GridPlan): void {
  // Der Hebel oben: an der Westkante des Podests und nicht auf der Kachel, auf
  // der die Treppe mündet — wer oben ankommt, soll nicht schon im Hebel stehen.
  plan.putFixture({
    id: DECK_LEVER,
    kind: 'lever',
    x: DECK.x,
    z: DECK.z + 2,
    dir: DIR_W,
    level: 1,
    props: { target: DECK_LAMP, label: 'Licht unten' },
  });

  // Und die Lampe, die er schaltet — unten, am Fuß der Treppe, wo man sie von
  // oben angehen sieht.
  plan.putFixture({
    id: DECK_LAMP,
    kind: 'lamp',
    x: PODIUM.x + 1,
    z: PODIUM.z + 6,
    dir: DIR_N,
    props: { on: false, height: 3.2 },
  });

  plan.putFixture({
    id: 'schild-treppe',
    kind: 'sign',
    x: STAIR_X + 1,
    z: PODIUM.z + PODIUM.d - 1,
    dir: DIR_S,
    props: { text: 'Vier Kacheln hinauf — oben ein Hebel für die Lampe hier unten' },
  });
}
