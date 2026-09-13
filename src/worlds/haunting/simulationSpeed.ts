/**
 * **Die Zeitraffer-Stufe der Bot-Runde.**
 *
 * Eine Runde dauert zwei bis fünf Minuten, und wer die Bots beim Justieren
 * zuschauen lässt, schaut die meiste Zeit jemandem beim Gehen zu. Also gibt
 * es einen Regler — aber keinen, der einfach `dt` mit acht malnimmt: Ein
 * Physikschritt über eine halbe Sekunde ist kein schnelles Spiel, sondern
 * ein Techniker, der durch eine Wand steht.
 *
 * Beschleunigt wird deshalb über die **Anzahl der Bilder** und nicht über
 * ihre Länge: Bei ×4 rechnet die Welt in jedem echten Bild vier ganz normale
 * Bilder. Physik, Wegsuche und Routine sehen dieselben Zeitschritte wie
 * immer, nur eben viermal so viele.
 *
 * Und mit einem Deckel: Wird das echte Bild dabei lang, sinkt die Zahl der
 * Wiederholungen von selbst. Ein Zeitraffer, der die Bildrate auf sechs
 * drückt, hat nichts beschleunigt — er hat nur alles zäh gemacht.
 *
 * **Eingestellt wird die Stufe im Optionsmenü** (`map/optionsMenu.speedKeys`),
 * in der 2D-Welt wie im Schiff, und zwar direkt: sechs Knöpfe, einer je
 * Stufe, statt eines Knopfs, der reihum weiterzählt — wer von ×16 auf ×2
 * will, drückt einmal und nicht fünfmal.
 */

export const SIMULATION_SPEEDS = [1, 2, 4, 8, 12, 16] as const;
export type SimulationSpeed = (typeof SIMULATION_SPEEDS)[number];

/**
 * Ab welcher echten Bilddauer der Zeitraffer zurückgenommen wird, in
 * Sekunden. Zwanzig Bilder je Sekunde sind die Grenze, unterhalb derer man
 * nicht mehr zuschaut, sondern wartet.
 */
export const SIMULATION_CEILING = 1 / 20;

export function clampSimulationSpeed(value: unknown): SimulationSpeed {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : 1;
  let best: SimulationSpeed = 1;
  for (const speed of SIMULATION_SPEEDS) if (speed <= number) best = speed;
  return best;
}

/**
 * Wie viele Bilder in diesem einen Bild gerechnet werden.
 *
 * Immer mindestens eines — auch bei einem Bild, das schon für sich zu lang
 * war. Ein Ruckler darf die Welt anhalten, aber nicht zurückdrehen.
 */
export function simulationRepeats(
  speed: unknown,
  dt: number,
  ceiling = SIMULATION_CEILING,
): number {
  const wanted = clampSimulationSpeed(speed);
  if (wanted === 1) return 1;
  const step = Number.isFinite(dt) && dt > 0 ? dt : 1 / 60;
  // Solange die Bilder kurz sind, gilt die volle Stufe; wird das echte Bild
  // länger als die Grenze, sinkt die Zahl im selben Verhältnis.
  const room = ceiling / Math.max(ceiling, step);
  return Math.max(1, Math.min(wanted, Math.round(wanted * room)));
}

/** Wie die Stufe auf einer Schaltfläche steht: „×1" ist Echtzeit. */
export function simulationSpeedLabel(speed: unknown): string {
  return `×${clampSimulationSpeed(speed)}`;
}
