import type { Rect } from '../house';

/**
 * **Die Vorlage unter der Station** — der Grundriss, nach dem sie gebaut ist,
 * als Bild auf dem Boden.
 *
 * Der Besitzer hat die Umrisse der Station von oben gezeichnet
 * (`docs/orbital/station-vorlage.webp`, 1400 × 800 Pixel), und
 * `house.stationRooms` ist danach abgepaust. **24 Pixel sind ein Meter** —
 * die Station war einmal im Maßstab 16 Pixel gebaut und dem Besitzer zu groß;
 * halbiert (32 Pixel) passten die Pflichtmöbel nicht mehr in die kleinen
 * Räume (`stationLayout`, ein Raum braucht rund sechs Meter), also sind die
 * Gänge und Fugen halbiert und die Räume so klein, wie es die Einrichtung
 * erlaubt. Die Eichung ist die beste Deckung der Raummitten: Pixelspalte 747
 * (Mitte der Cafeteria) ist `x = 0`, Pixelzeile 32 ist `z = −55` — die
 * gezeichnete Cafeteria ist größer als die gebaute und ragt drei Meter über
 * deren Nordwand. Aus der Vorlage ist
 * `public/haunting/station-outline.png` gerechnet — Wände als helle Linien,
 * Räume und Gänge leicht getönt, alles andere durchsichtig —, und wer es
 * einschaltet (_Optionen → Grundriss-Vorlage_), sieht, wo das Raster von
 * der Zeichnung abweicht: an den Schrägen, die das Kachelgitter nicht kennt,
 * und dort, wo ein Raum für seine Möbel größer sein musste.
 *
 * Hier stehen nur Zahlen, kein three.js und kein `import.meta`: Die Eichung
 * prüft ein Test (`blueprint.test.ts`) gegen die Räume des Grundrisses.
 */
export const BLUEPRINT = {
  /** Die Bilddatei unter `public/`. */
  file: 'haunting/station-outline.png',
  width: 1400,
  height: 800,
  pxPerMetre: 24,
  /** Ein Pixel der Vorlage und der Punkt der Station, auf dem er liegt. */
  anchor: { px: 747, py: 32, x: 0, z: -55 },
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
