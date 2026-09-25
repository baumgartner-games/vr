import type { Rect } from '../house';

/**
 * **Die Vorlage unter der Station** — der Grundriss, nach dem sie gebaut ist,
 * als Bild auf dem Boden.
 *
 * Der Besitzer hat die Umrisse der Station von oben gezeichnet
 * (`docs/orbital/station-vorlage.webp`, 1400 × 800 Pixel). Seit Oktober 2026
 * ist die Station **Kachel für Kachel danach gebaut** (`stationMap.ts`), im
 * Maßstab **20 Pixel = 1 Meter** — so gewünscht: _„Bitte auf 20px = 1m"_.
 * Vorher war sie nur ungefähr abgepaust (24 Pixel = 1 m), und Boden und Wände
 * passten nicht zum Bild. Die Eichung ist die beste Deckung aller Wandlinien
 * mit den Kachelkanten: Pixelspalte 52 ist `x = −34`, Pixelzeile 36,2 ist
 * `z = −52`. Aus der Vorlage ist `public/haunting/station-outline.png`
 * gerechnet — Wände als helle Linien, Räume und Gänge leicht getönt, alles
 * andere durchsichtig —, und wer es einschaltet (_Optionen →
 * Grundriss-Vorlage_), sieht, wo das Raster von der Zeichnung abweicht: um
 * höchstens eine halbe Kachel, wo eine Linie auf die nächste Kante gerundet
 * ist.
 *
 * Hier stehen nur Zahlen, kein three.js und kein `import.meta`: Die Eichung
 * prüft ein Test (`blueprint.test.ts`) gegen die Räume des Grundrisses.
 */
export const BLUEPRINT = {
  /** Die Bilddatei unter `public/`. */
  file: 'haunting/station-outline.png',
  width: 1400,
  height: 800,
  pxPerMetre: 20,
  /** Ein Pixel der Vorlage und der Punkt der Station, auf dem er liegt. */
  anchor: { px: 52, py: 36.2, x: -34, z: -52 },
} as const;

/** Wo ein Pixel der Vorlage in der Station liegt, in Metern. */
export function blueprintPoint(px: number, py: number): { x: number; z: number } {
  const { anchor, pxPerMetre } = BLUEPRINT;
  return {
    x: anchor.x + (px - anchor.px) / pxPerMetre,
    z: anchor.z + (py - anchor.py) / pxPerMetre,
  };
}

/** Die Fläche, die das ganze Bild auf dem Boden bedeckt, in Metern. */
export function blueprintArea(): Rect {
  const from = blueprintPoint(0, 0);
  return {
    x: from.x,
    z: from.z,
    w: BLUEPRINT.width / BLUEPRINT.pxPerMetre,
    d: BLUEPRINT.height / BLUEPRINT.pxPerMetre,
  };
}

/** Ob die Vorlage beim Laden der Welt am Boden liegt. Gemerkt je Gerät. */
const STORAGE_KEY = 'haunting:blueprint';

export function loadBlueprintShown(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveBlueprintShown(shown: boolean): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, shown ? '1' : '0');
  } catch {
    // Privates Fenster oder gesperrter Speicher: Dann gilt es nur bis zum Neuladen.
  }
}
