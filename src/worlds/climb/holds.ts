/**
 * **Was an einer Kletterwand hängt** — das Vokabular der Kletterhalle.
 *
 * Ein Griff ist zwei Dinge auf einmal, und die beiden gehören auseinander:
 * die **Oberfläche**, aus der er besteht, und die **Form**, die er hat. Das
 * Material sagt, wie viel Reibung überhaupt da ist und wie schnell einem die
 * Kraft ausgeht; die Form sagt, ob die Finger etwas hinter sich bekommen.
 * Derselbe Henkel ist aus rauem Fels ein Geschenk und aus poliertem Stein
 * eine Zumutung — und eine glatte Fläche ist auch aus rauem Fels nichts,
 * woran man hängen bleibt.
 *
 * Drei Materialien, weil es drei Fragen sind:
 *
 * - **Sprosse** — das perfekte Material, eine Leiter. Wer daran hängt,
 *   verliert **nie** Ausdauer. Es ist der Nullpunkt der ganzen Welt: an der
 *   Leiterwand kann jeder hoch, und alles andere misst sich daran.
 * - **Rauer Fels** — der Normalfall. Wer eine Kante erwischt, hält sich;
 *   wer daneben greift, verliert langsam Kraft.
 * - **Glatter Fels** — glänzend, poliert. Dieselbe Kante trägt weniger, und
 *   die Kraft geht fast doppelt so schnell weg.
 *
 * Die Zahlen stehen hier und nirgends sonst: `gripQuality.ts` rechnet damit,
 * `ClimbWorld.ts` baut damit, und wer an der Schwierigkeit der Halle dreht,
 * dreht an dieser Datei.
 *
 * Kein three.js — die Farben sind Zahlen aus `core/colors.ts`, damit ein
 * Griff dieselbe Farbe trägt wie jeder andere Griff im Spiel.
 */

import { GRAB_GLOW, GRAB_TINT, GRAB_TINT_DARK } from '../../core/colors';

/** Woraus die Oberfläche besteht. */
export type HoldMaterial = 'perfect' | 'rough' | 'smooth';

/** Welche Form die Hand vorfindet. */
export type HoldFeature = 'rung' | 'jug' | 'crack' | 'edge' | 'sloper' | 'flat';

export interface MaterialSpec {
  label: string;
  /**
   * Was die blanke Fläche allein hergibt, 0 bis 1 — bevor die Form, die
   * Körperhaltung und die zweite Hand dazukommen.
   */
  base: number;
  /**
   * Wie schnell dieses Material Ausdauer frisst. `1` ist der raue Fels;
   * **`0` heißt gar nicht**, und genau das ist die Leiter.
   */
  drain: number;
}

export const HOLD_MATERIALS: Readonly<Record<HoldMaterial, MaterialSpec>> = {
  perfect: { label: 'Sprosse', base: 1, drain: 0 },
  rough: { label: 'Rauer Fels', base: 0.44, drain: 1 },
  smooth: { label: 'Glatter Fels', base: 0.24, drain: 1.9 },
};

export interface FeatureSpec {
  label: string;
  /**
   * Was die Form obendrauf gibt — **wenn die Hand richtig sitzt**. Wer die
   * Kante verfehlt, bekommt davon nichts (`seat` in `gripQuality.ts`).
   */
  bonus: number;
}

export const HOLD_FEATURES: Readonly<Record<HoldFeature, FeatureSpec>> = {
  rung: { label: 'Sprosse', bonus: 0.36 },
  jug: { label: 'Henkel', bonus: 0.34 },
  crack: { label: 'Spalte', bonus: 0.3 },
  edge: { label: 'Kante', bonus: 0.26 },
  sloper: { label: 'Ballen', bonus: 0.06 },
  flat: { label: 'Fläche', bonus: 0 },
};

/**
 * Die Farbe eines Griffs — aus der **Greif-Palette** und keiner zweiten.
 *
 * Eine Kletterhalle in echt ist bunt, und das war hier genau der falsche Weg:
 * Wer im Spiel gelernt hat, dass Türkis „hier anfassen“ heißt, sucht an einer
 * Wand voller roter und gelber Klötze zuerst den türkisen. Also tragen alle
 * drei Materialien Töne aus `core/colors.ts` — und weil sie es tun, muss man
 * sie *innerhalb* der Palette unterscheiden: die Sprosse leuchtet hell (an ihr
 * kann nichts passieren), der raue Fels trägt den ruhigen Ton, der glatte den
 * dunklen. Den Rest macht die Oberfläche selbst: glatter Fels glänzt.
 */
export function holdColor(material: HoldMaterial): number {
  if (material === 'perfect') return GRAB_GLOW;
  return material === 'rough' ? GRAB_TINT : GRAB_TINT_DARK;
}

/** Wie eine Griffart in einer Meldung heißt: „Rauer Fels · Kante“. */
export function holdLabel(material: HoldMaterial, feature: HoldFeature): string {
  const spec = HOLD_MATERIALS[material];
  if (material === 'perfect') return spec.label;
  return `${spec.label} · ${HOLD_FEATURES[feature].label}`;
}
