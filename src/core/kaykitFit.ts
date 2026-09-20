/**
 * **Der Maßstab des Regals** — wie groß ein KayKit-Modell im Spiel wird.
 *
 * Eigene Datei und keine Zeile im Lader, aus demselben Grund wie bei den
 * anderen Katalogen (`core/mixedbagFit.ts`, `core/dinerFit.ts`): Der Lader
 * braucht `GLTFLoader` und `import.meta`, und beides gibt es in Jest nicht.
 * Eine Zahl, die nirgends nachgerechnet wird, driftet.
 */

/**
 * **Halbiert, wie alles aus dieser Werkstatt.**
 *
 * Die Modelle im Regal kommen aus derselben Quelle wie die beiden anderen
 * KayKit-Kataloge dieses Spiels — die Wundertüte (`core/mixedbagFit.ts`) und
 * das Diner (`core/dinerFit.ts`) —, und die sind in „Blender-Metern" gebaut,
 * in denen eine Kachel zwei sind. Beide stehen deshalb auf 0,5, gemessen an
 * der Küche: Ein Feuerlöscher ist in der Quelle 1,205 hoch und neben einem
 * Koch von 1,60 m erst halbiert ein Feuerlöscher.
 *
 * **Also gilt hier dieselbe Zahl**, und nicht eine zweite, geratene: Ein Fass
 * aus dem Regal steht neben einem Fass aus der Wundertüte, und wenn das eine
 * doppelt so hoch wäre wie das andere, wäre nicht die Küche falsch, sondern
 * dieser Faktor. Der Test daneben hält die beiden zusammen.
 *
 * Der Faktor sitzt am **Lader** (`core/kaykitModel.ts`) und nicht in den
 * Dateien: Die sind gekaufte, fremde Arbeit und werden nicht angefasst.
 */
export const KAYKIT_SCALE = 0.5;
