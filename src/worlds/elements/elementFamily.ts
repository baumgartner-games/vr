import type { GameElement } from './elementCatalog';

/**
 * **Eine Familie in Farben** — dasselbe Stück in Blau, Grün, Rot und Gelb.
 *
 * Im Katalog steht nur das erste; die übrigen sind seine **Fassungen**
 * (`GameElement.swap`), reihum getauscht im Element-Menü wie die Laternen der
 * Straße (`grid/inspectMenu.ts`, _Fassung tauschen_). Sonst stünden allein im
 * Parcours über fünfhundert Kacheln, von denen vier Fünftel dasselbe zeigen.
 */
export function swapRing(elements: readonly GameElement[]): GameElement[] {
  if (elements.length < 2) return [...elements];
  return elements.map((one, i) => ({ ...one, swap: elements[(i + 1) % elements.length]!.id }));
}

/** Die Farben des Regals auf Deutsch — wie sie in den Dateinamen stehen. */
export const COLOR_WORDS: Readonly<Record<string, string>> = {
  blue: 'blau',
  green: 'grün',
  red: 'rot',
  yellow: 'gelb',
  white: 'weiß',
  black: 'schwarz',
  purple: 'lila',
  neutral: 'natur',
  grey: 'grau',
  orange: 'orange',
  gold: 'gold',
  silver: 'silber',
  copper: 'kupfer',
  plain: 'natur',
};

/** Die Ids, die im Katalog stehen — von jeder Familie die erste. */
export function catalogueOf(families: readonly (readonly GameElement[])[]): string[] {
  return families.map((family) => family[0]!.id);
}
