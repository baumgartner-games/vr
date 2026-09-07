import type { Spot } from './miniature';

/**
 * **Was eine Hand meint, wenn sie zugreift.**
 *
 * Im Bauplatz schweben drei Dinge in derselben Luft: das Modell, die Palette
 * und die Spielfigur darin. Wer danach greift, greift *irgendwo* hin — und
 * dann muss eine Regel sagen, was gemeint war. Ohne sie passiert das, was
 * jeder Editor einmal hat: Man will die Figur versetzen und schiebt dabei den
 * ganzen Grundriss weg, weil das Modell größer ist und deshalb immer zuerst
 * antwortet.
 *
 * Die Regel ist **das nächstgelegene gewinnt**, und die Reichweite steht am
 * Ding statt am Griff: Eine Figur von zwei Zentimetern hat eine kleine, ein
 * Grundriss von einem halben Meter eine große. Damit greift man in die
 * Miniatur hinein, ohne sie zu verschieben — solange man näher an der Figur
 * ist als an sonst etwas.
 *
 * Dieselbe Rechnung beantwortet die zweite Frage, die diese Welt hat: **über
 * welcher Hüfte** eine offene Hand steht. Eine Hüfte ist auch nur eine Stelle
 * mit einer Reichweite, und eine Karte, die man weglegt, ist eine Hand, die
 * losläßt, wo etwas ist.
 *
 * Ohne three.js, damit die Vorfahrt geprüft ist und nicht nur ausprobiert.
 */

/** Eine Stelle, nach der gegriffen werden kann. */
export interface Target<Id> {
  id: Id;
  at: Spot;
  /** Wie weit um sie herum sie noch gemeint ist, in Metern. */
  reach: number;
}

/**
 * Was diese Hand meint — `null`, wenn nichts in Reichweite ist.
 *
 * Gemessen wird der **Abstand**, nicht der Überstand: Zwei Dinge, die beide in
 * Reichweite sind, entscheiden über ihre Mitte und nicht darüber, wer die
 * größere Blase hat. Sonst verschlänge das Modell jedes Mal die Figur, die
 * mitten in ihm steht.
 */
export function grabbedAt<Id>(hand: Spot, targets: readonly Target<Id>[]): Id | null {
  let best: Id | null = null;
  let bestGap = Infinity;
  for (const target of targets) {
    const gap = Math.hypot(hand.x - target.at.x, hand.y - target.at.y, hand.z - target.at.z);
    if (gap > target.reach || gap >= bestGap) continue;
    best = target.id;
    bestGap = gap;
  }
  return best;
}

/**
 * Wie nah eine Hand an einer Hüfte sein muss, damit sie dort etwas ablegt.
 *
 * Dieselbe Zahl wie am Gürtel des Werkzeugkastens (`portal/ToolBelt.ts`,
 * `SLOT_REACH`) — zwei Gürtel mit zwei Reichweiten wären zwei Bedienungen für
 * dieselbe Bewegung.
 */
export const HIP_REACH = 0.34;
