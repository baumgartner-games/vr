/**
 * **Was ein Sturz kostet** — die eine Rechnung, mit der ein NPC eine Kante
 * ansehen und wissen kann, ob er sie überlebt.
 *
 * Sie steht in einer eigenen Datei, weil drei Stellen dieselbe Zahl brauchen
 * und drei Kopien davon auseinanderlaufen: die **Wegsuche** fragt sie, bevor
 * sie einen Absprung in einen Weg einbaut (`navProfile.canTraverse`), der
 * **Körper** wendet sie an, wenn er unten aufkommt (`npc/Npc.ts`), und der
 * **Test ohne Brille** rechnet sie genauso (`navlab/labSim.ts`). Wüsste die
 * Wegsuche etwas anderes als der Boden, hätte man einen NPC, der springt und
 * stirbt, oder einen, der stehen bleibt, obwohl nichts passiert wäre.
 *
 * **Zwei Zahlen, und die erste ist die wichtigere.** Bis `FALL_FREE` tut ein
 * Sturz gar nichts — ohne diese Schwelle kostete jeder Absatz Leben, und ein
 * Zombie, der von einer Bordsteinkante Schaden nimmt, ist kein Zombie, sondern
 * eine Fehlermeldung. Darüber kostet jeder Meter dasselbe (`FALL_HARM`), und
 * dass die Kurve gerade ist und nicht quadratisch, ist Absicht: Man soll die
 * Höhe, die einer noch überlebt, im Kopf ausrechnen können (`safeFall`), sonst
 * stellt sie niemand mehr ein.
 *
 * **Gerechnet wird in Höhe und nicht in Tempo**, weil eine Karte Höhen kennt
 * und keine Geschwindigkeiten. Wer einen Aufprall vor sich hat statt einer
 * Kante — der Körper, der gerade landet —, rechnet ihn mit `fallHeight` in die
 * Höhe um, aus der er käme. Damit ist ein Sprung, der flach landet, auch dann
 * harmlos, wenn er über zehn Meter ging.
 */

/**
 * Bis hierher tut ein Sturz nichts, in Metern.
 *
 * Anderthalb Meter: ein Absatz, von dem ein Mensch springt, ohne darüber
 * nachzudenken — und mehr als der Bogen, in dem ein NPC über eine Lücke setzt
 * (`Npc.launch`, `LEAP_RISE` = 0,7 m). Läge die Schwelle darunter, kostete
 * jeder geplante Sprung Leben, und die Wegsuche müsste ihre eigenen Sprünge
 * meiden.
 */
export const FALL_FREE = 1.5;

/** Was jeder Meter darüber abzieht. */
export const FALL_HARM = 40;

/**
 * Was ein Sturz aus dieser Höhe abzieht.
 *
 * Null bis `FALL_FREE`, danach linear. Eine negative Höhe ist kein Sturz.
 */
export function fallDamage(height: number): number {
  if (!(height > FALL_FREE)) return 0;
  return FALL_HARM * (height - FALL_FREE);
}

/**
 * **Die größte Höhe, aus der einer mit `health` noch aufsteht**, in Metern.
 *
 * Die Umkehrung von `fallDamage`, und die Zahl, die ein NPC eigentlich meint,
 * wenn er an einer Kante steht: „vier Meter kann ich, fünf nicht mehr". Für
 * einen Zombie (100 Leben) sind es vier Meter, für einen Hamster (20) zwei —
 * und genau daran hängt, dass der eine vom Dach springt und der andere
 * oben bleibt.
 */
export function safeFall(health: number): number {
  if (!(health > 0)) return 0;
  if (!Number.isFinite(health)) return Infinity;
  return FALL_FREE + health / FALL_HARM;
}

/**
 * Ob er den Sturz übersteht — und zwar **stehend**.
 *
 * Genau so viel Schaden, wie er Leben hat, heißt umfallen; wer eine Kante nur
 * überlebt, um unten liegen zu bleiben, ist nicht heruntergekommen, sondern
 * abgestürzt.
 */
export function survivesFall(health: number, height: number): boolean {
  return fallDamage(height) < health;
}

/**
 * **Aus welcher Höhe ein Aufprall käme** — für den Körper, der landet.
 *
 * Er kennt seine Fallgeschwindigkeit und nicht die Kante, von der er kam: Wer
 * geschubst wird, hat nie eine Kante gehabt, und wer über eine Lücke springt,
 * fällt weniger tief, als der Höhenunterschied vermuten lässt. Die Schwerkraft
 * kommt von der Welt und nicht aus einer Konstante — auf dem Mond fällt man
 * langsamer, und dann tut es auch weniger weh.
 */
export function fallHeight(speed: number, gravity = 9.81): number {
  if (!(gravity > 0)) return 0;
  const down = Math.abs(speed);
  return (down * down) / (2 * gravity);
}
