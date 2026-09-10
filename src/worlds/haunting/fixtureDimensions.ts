import { BLOCKS, type BlockKind } from '../grid/blocks';
import type { MarkId } from './house';
import type { MarkColour } from './rules/cargo';

/** Metres, including every handle, pipe and closed door. Front is local +Z. */
export interface FixtureSize {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}

/** Pure placement contract: rendering and the generator use the same footprint. */
export const FIXTURE_CATALOG: Readonly<Record<MarkId, FixtureSize>> = {
  wanne: { width: 2.1, height: 1.25, depth: 1.15 },
  dusche: { width: 1.4, height: 2.4, depth: 1.25 },
  ofen: { width: 1.15, height: 1.65, depth: 0.8 },
  spuele: { width: 1.5, height: 1.65, depth: 0.85 },
  bett: { width: 2.1, height: 1.3, depth: 1.15 },
  buecher: { width: 1.35, height: 2.15, depth: 0.8 },
  werkbank: { width: 1.9, height: 1.7, depth: 1.2 },
  klavier: { width: 1.65, height: 1.55, depth: 1.05 },
  kamin: { width: 1.5, height: 2.3, depth: 1.35 },
  standuhr: { width: 1.25, height: 2.15, depth: 0.95 },
  sessel: { width: 1.05, height: 1.65, depth: 1.1 },
  kiste: { width: 1.5, height: 1.15, depth: 1.0 },
  schaukelpferd: { width: 1.3, height: 1.8, depth: 0.85 },
  esstisch: { width: 1.85, height: 1.6, depth: 1.05 },
  ausgabe: { width: 2.3, height: 1.85, depth: 0.95 },
};

/**
 * **Die Farbe, an der ein Merkmal kenntlich ist** — in 3D die Farbe seines
 * Klotzes (`marks.ts`), in 2D die Farbe desselben Möbels auf dem Bild
 * (`map/flatArt.ts`) und im Archiv (`archiveMap.ts`). Eine Zahl, ein Möbel:
 * Wer hier ein Klavier umlackiert, lackiert es in allen drei Ansichten um.
 *
 * Sie steht hier und nicht bei den Modellen, weil hier auch die Maße stehen —
 * und weil diese Datei kein three.js kennt: Die 2D-Welt darf sie lesen, ohne
 * einen Renderer mitzuschleppen.
 */
export const MARK_COLORS: Readonly<Record<MarkId, number>> = {
  wanne: 0xf2f5f8,
  dusche: 0xa8d8e8,
  ofen: 0x2c313c,
  spuele: 0xc9ced8,
  bett: 0xd8c7a8,
  buecher: 0x9c5a3c,
  werkbank: 0x7a6a52,
  klavier: 0x14161c,
  kamin: 0xb0463a,
  standuhr: 0x8a6440,
  sessel: 0x5a6a8a,
  kiste: 0xa8874f,
  schaukelpferd: 0xd88a6a,
  esstisch: 0xb08a5a,
  ausgabe: 0xd6c08a,
};

/**
 * **Die vier Farben der Frachtbänder** — dieselbe Zahl im Schiff (`fixtureModels.ts`)
 * wie auf dem Bild der 2D-Runde (`map/flatArt.ts`).
 *
 * Sie stehen neben `MARK_COLORS`, weil sie derselben Regel folgen: eine Zahl,
 * ein Ding, alle Ansichten. Und sie sind kräftig gewählt, nicht hübsch: Wer im
 * Dunkeln „das blaue Band" gesagt bekommt, hat drei Sekunden und eine
 * Taschenlampe, um es von dem grünen zu unterscheiden.
 */
export const CARGO_BAND_COLORS: Readonly<Record<MarkColour, number>> = {
  rot: 0xe2453f,
  blau: 0x3b7ede,
  gelb: 0xf2c53d,
  grün: 0x4bb35a,
};

export const CARGO_SIZE: FixtureSize = { width: 0.9, height: 1.4, depth: 0.65 };
export const LOCKER_SIZE: FixtureSize = { width: 1.15, height: 2.2, depth: 0.8 };
export const CONSOLE_SIZE: FixtureSize = { width: 1.2, height: 1.65, depth: 0.55 };

/**
 * Historische Zuordnung für Werkzeuge, die alte Hausmerkmale darstellen.
 * Der Raumstationsplan erzeugt diese Bausteine nicht mehr.
 */
export function blockFor(mark: MarkId): BlockKind {
  switch (mark) {
    case 'buecher':
      return 'shelf';
    case 'dusche':
    case 'standuhr':
      return 'pillar';
    case 'ofen':
    case 'spuele':
    case 'kamin':
    case 'ausgabe':
      return 'counter';
    case 'werkbank':
    case 'klavier':
    case 'esstisch':
      return 'table';
    case 'kiste':
      return 'crate';
    default:
      // Wanne, Bett, Sessel, Schaukelpferd: alles, was niedrig ist.
      return 'bench';
  }
}

/**
 * **Wie hoch ein Möbel wirklich steht**, in Metern — die Höhe seines
 * Bausteins (`grid/blocks.ts`), aus der auch das 3D-Modell gebaut wird
 * (`marks.ts`). Nicht `FIXTURE_CATALOG.height`: Das ist die Hülle für die
 * Aufstellung samt Griffen und Luft darüber, und ein Esstisch von 1,6 m sähe
 * auf dem Bild aus wie ein Schrank.
 */
export function markHeight(mark: MarkId): number {
  return BLOCKS[blockFor(mark)].height;
}
