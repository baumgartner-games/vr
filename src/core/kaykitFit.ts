/**
 * **Der Maßstab des Regals** — wie groß ein KayKit-Modell im Spiel wird.
 *
 * Eigene Datei und keine Zeile im Lader, aus demselben Grund wie bei den
 * anderen Katalogen (`core/mixedbagFit.ts`, `core/dinerFit.ts`): Der Lader
 * braucht `GLTFLoader` und `import.meta`, und beides gibt es in Jest nicht.
 * Eine Zahl, die nirgends nachgerechnet wird, driftet.
 */

/**
 * **Halbiert, wie alles aus dieser Werkstatt** — die Vorgabe für jedes Paket,
 * für das unten nichts anderes steht.
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
 * Nachgemessen in der Sammlung selbst: `dungeon/barrel_large.glb` ist 1,80 ×
 * 2,00 × 1,80 groß und wird damit zu einem Fass von 0,90 × 1,00 × 0,90 m,
 * `dungeon/wall.glb` ist 4,00 hoch und wird zu einer Wand von 2,00 m,
 * `furniture-bits/bed_double_A.glb` zu einem Doppelbett von 1,55 × 1,50 m.
 *
 * Der Faktor sitzt am **Lader** (`core/kaykitModel.ts`) und nicht in den
 * Dateien.
 */
export const KAYKIT_SCALE = 0.5;

/**
 * **Und der Maßstab der Figurenpakete** — größer als die Vorgabe, weil die
 * Figuren in der Quelle kleiner gebaut sind als die Requisiten daneben.
 *
 * KayKit baut alle seine Figuren auf **zwei** Skeletten, und die haben eine
 * feste Größe: Das mittlere (`character-animations`, `Mannequin_Medium`) ist
 * 1,98 × 2,20 × 1,01 groß, das große 5,64 × 3,98 × 1,40. Nachgemessen über
 * die ganze Sammlung stehen alle 85 Figuren darauf — vom Ritter (1,94 × 2,54
 * × 1,31) über den Skelett-Krieger (1,94 × 2,59 × 1,46) bis zum Bauern
 * (1,94 × 2,41 × 1,43). Die Spanne ist immer 1,94: das sind die
 * ausgestreckten Arme der T-Pose.
 *
 * Eine mittlere Figur ist also rund **2,3** hoch. Halbiert wären das 1,15 m —
 * ein Ritter, der einem Koch von 1,60 m (`core/chefFit.CHEF_HEIGHT`) bis zur
 * Brust reicht. Mit 0,7 steht er auf 1,78 m, das Mannequin auf 1,54 m, der
 * Skelett-Krieger auf 1,81 m: Menschen neben einer Spielfigur.
 *
 * **Sieben Pakete und eine Zahl**, nicht viertausendfünfhundert Ausnahmen.
 * Der Maßstab gehört dem **Paket** und nicht dem Modell, denn innerhalb eines
 * Pakets ist alles in derselben Einheit gebaut: In `adventurers` wächst mit
 * dem Ritter auch sein Schwert (1,78 → 1,25 m) und seine Munitionskiste
 * (0,57 → 0,40 m), und genau so soll es sein. Eine Tabelle je Datei pflegt
 * niemand; eine mit sieben Zeilen liest man.
 *
 * `prototype-bits` steht mit in der Liste, obwohl es ein „Bits"-Paket heißt:
 * Es bringt dieselbe Figur mit (`prototype-bits/character/Dummy.glb`, 2,40
 * hoch), und seine Tür ist 2,80 hoch — 1,40 m halbiert, 1,96 m mit 0,7. Durch
 * die halbierte Tür käme die Figur nicht, die im selben Paket liegt.
 */
export const KAYKIT_FIGURE_SCALE = 0.7;

/**
 * **Welches Paket welchen Maßstab bekommt** — nur die Ausnahmen stehen hier,
 * der Rest nimmt `KAYKIT_SCALE`.
 *
 * Der Schlüssel ist der **Ordnername unter `models/kaykit/`**, also das erste
 * Stück jeder Adresse; der Test daneben prüft, dass es jedes dieser Pakete
 * wirklich gibt. Wer ein Paket dazukauft, in dem Figuren stehen, trägt es
 * hier ein und schreibt daneben, woran er das gemessen hat.
 */
export const KAYKIT_PACK_SCALE: Readonly<Record<string, number>> = {
  // Ritter 2,54 → 1,78 m; die neun Helden stehen auf dem mittleren Skelett.
  adventurers: KAYKIT_FIGURE_SCALE,
  // Die beiden Skelette selbst, mit denen alle Figuren der Sammlung gebaut sind.
  'character-animations': KAYKIT_FIGURE_SCALE,
  // Achtzehn Figuren und ihre Requisiten, Monat für Monat.
  'mystery-monthly-4': KAYKIT_FIGURE_SCALE,
  'mystery-monthly-5': KAYKIT_FIGURE_SCALE,
  'mystery-monthly-6': KAYKIT_FIGURE_SCALE,
  // Tür 2,80 → 1,96 m, Fass 1,00 → 0,70 m, Figur 2,40 → 1,68 m.
  'prototype-bits': KAYKIT_FIGURE_SCALE,
  // Skelett-Krieger 2,59 → 1,81 m, Skelett-Golem 4,23 → 2,96 m.
  skeletons: KAYKIT_FIGURE_SCALE,
};

/**
 * **Der Maßstab für eine Adresse im Regal** — `adventurers/characters/Knight.glb`
 * fragt nach `adventurers`.
 *
 * Reine Zeichenkettenarbeit und deshalb hier und nicht im Lader: Was vor dem
 * ersten Schrägstrich steht, ist das Paket, und mehr braucht die Antwort
 * nicht. Eine Adresse ohne Schrägstrich — eine Datei, die direkt unter
 * `models/kaykit/` läge — gibt es nicht, und sie bekäme die Vorgabe.
 */
export function kaykitScale(path: string): number {
  const cut = path.indexOf('/');
  const pack = cut < 0 ? path : path.slice(0, cut);
  return KAYKIT_PACK_SCALE[pack] ?? KAYKIT_SCALE;
}
