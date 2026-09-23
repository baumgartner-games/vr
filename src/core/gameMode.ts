/**
 * **Der Spielmodus** — was ein Griff mit Möbeln und Gegenständen tut.
 *
 * Gewünscht war er so: „Im Option-Menü wäre ein Spielmodus gut", mit drei
 * Stellungen, durch die ein Klick auf die Zeile weiterschaltet. Die Namen aus
 * dem Auftrag (_Adventure, Edit, Creative_) sollten es ausdrücklich nicht
 * bleiben; es sind drei deutsche Verben geworden, und jedes sagt, was man in
 * dem Modus **tut**:
 *
 * - **Spielen** — wie bisher: Gegenstände benutzen, auf Tische legen, einen
 *   Burger von der Ausgabe nehmen. Die Möbel stehen.
 * - **Einrichten** — der Umbau aus _PlateUp!_: Möbel werden aufgehoben und
 *   neu hingestellt, **samt dem, was darauf liegt**. Gegenstände selbst nimmt
 *   man in dem Modus nicht in die Hand; sie liegen ja auf den Möbeln und fahren
 *   mit. Die Uhren halten solange an — es wird eingerichtet, nicht gekocht.
 * - **Baukasten** — Einrichten, und dazu: Wer ein Stück aus einem Katalog
 *   genommen hat (dem Möbelkatalog der Küche oder dem KayKit-Regal) und es
 *   hinstellt, hat sofort die nächste Kopie in der Hand. Eine Reihe aus zehn
 *   Arbeitsplatten ist dann zehn Mal hinstellen und nicht zehn Mal hin- und
 *   herlaufen.
 *
 * **Nicht gespeichert, mit Absicht.** Eine Welt, die nach dem Neuladen im
 * Umbau aufwacht, ist eine, in der man sich wundert, warum nichts kocht.
 * Jede Sitzung fängt mit _Spielen_ an.
 *
 * **Eine Stelle für alle, die fragen.** Die Zeile im Menü schaltet hier, der
 * rote Umbauknopf der Küche schaltet hier, und die Küche liest hier ab
 * (`test/zones/kitchen.ts`, `syncMode`). Zwei Schalter, die jeder ihren eigenen
 * Zustand führten, liefen beim ersten Druck auf den jeweils anderen
 * auseinander.
 */

export type GameMode = 'play' | 'arrange' | 'creative';

/** In dieser Reihenfolge schaltet die Zeile im Menü weiter. */
export const GAME_MODES: readonly GameMode[] = ['play', 'arrange', 'creative'];

/** Wie der Modus im Menü und in den Meldungen heißt. */
export const GAME_MODE_LABELS: Readonly<Record<GameMode, string>> = {
  play: 'Spielen',
  arrange: 'Einrichten',
  creative: 'Baukasten',
};

/** Was der Modus tut — ein Satz unter der Zeile im Menü. */
export const GAME_MODE_HINTS: Readonly<Record<GameMode, string>> = {
  play: 'Gegenstände benutzen, ablegen und nehmen · Möbel stehen fest',
  arrange: 'Möbel samt Inhalt umstellen · Wände bleiben stehen',
  creative:
    'Wie Einrichten, auch Wände · aus dem Katalog kommt nach dem Hinstellen die nächste Kopie',
};

/** Der Modus nach diesem — nach dem letzten wieder der erste. */
export function nextGameMode(mode: GameMode): GameMode {
  const at = GAME_MODES.indexOf(mode);
  return GAME_MODES[(at + 1) % GAME_MODES.length]!;
}

/** **Ob Möbel sich tragen lassen** — in beiden Modi außer _Spielen_. */
export function movesFurniture(mode: GameMode): boolean {
  return mode !== 'play';
}

/**
 * **Ob sich der Bau selbst umsetzen lässt** — Wände, Böden, Säulen aus dem
 * Regal (`worlds/portal/modelStance`). Nur im _Baukasten_: Im _Einrichten_
 * werden Möbel umgestellt, aber nicht umgebaut.
 */
export function movesStructure(mode: GameMode): boolean {
  return mode === 'creative';
}

/** **Ob ein hingestelltes Katalogstück gleich nachkommt** — nur im _Baukasten_. */
export function refillsCatalogue(mode: GameMode): boolean {
  return mode === 'creative';
}

let current: GameMode = 'play';
const listeners = new Set<(mode: GameMode) => void>();

/** Der Modus, der gerade gilt. */
export function gameMode(): GameMode {
  return current;
}

/**
 * Einen Modus setzen und allen sagen, die zuhören — aber nur, wenn es wirklich
 * ein anderer ist. Ein Zuhörer, der auf dasselbe noch einmal angestoßen wird,
 * räumte die Hände ein zweites Mal ab.
 */
export function setGameMode(mode: GameMode): GameMode {
  if (mode === current) return current;
  current = mode;
  for (const listener of listeners) listener(mode);
  return current;
}

/**
 * Zuhören, wenn sich der Modus ändert — zurück kommt das Abmelden.
 *
 * Gerufen wird **nach** dem Umstellen, also liest `gameMode()` im Zuhörer
 * schon den neuen Stand.
 */
export function onGameMode(listener: (mode: GameMode) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
