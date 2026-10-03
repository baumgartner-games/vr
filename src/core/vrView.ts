/**
 * **VR-Ansicht am Schirm** — _Aus den Augen_, nur so gezeigt, wie es ein Auge
 * der Quest 3 sieht. Reine Zahlen und ein bisschen Speicher, kein three.js.
 *
 * Gewünscht: _„auch will ich bei vr ansicht simmulieren bitte die steuerung
 * wie in aus den augen beibehalten. Es ist nur eine option wie aus den augen
 * dargestellt werden soll, damit wir das sauber verstehen können."_ Vorher war
 * _VR simulieren_ Metas Emulator (`core/xrEmulator.ts`): eine echte Sitzung,
 * Kopf und Hände über dessen eigene Oberfläche — und damit eine andere
 * Steuerung. Jetzt ändert sich nur das Bild (`App.applyVrView`):
 *
 * - **Das Sichtfeld eines Auges**: senkrecht `QUEST_EYE_FOV` Grad, als Kasten
 *   im Seitenverhältnis `QUEST_EYE_ASPECT` mitten im Fenster (`eyeBox`), drum
 *   herum schwarz — so groß, wie es passt.
 * - **Das Menü als Bildschirm zwei Meter davor** (`GameMenu.presenting`), die
 *   Tafeln der Brille (`App.xrPreview`).
 *
 * Gesteuert wird weiter mit Maus und Tastatur wie _Aus den Augen_.
 *
 * Die Zahlen sind ein Anfang (dieselben wie im Küchenwerkzeug,
 * `tools/perf-kitchen.mjs`). Ob sie stimmen, zeigt der **Kalibrier-Helm**
 * (`core/viewCalibration.ts`): In der Brille ablesen, bis zu welcher Linie man
 * sieht, und hier nachstellen.
 */

/** Wie weit ein Auge der Quest 3 senkrecht sieht, in Grad. */
export const QUEST_EYE_FOV = 96;
/** Breite durch Höhe eines Auges der Quest 3. */
export const QUEST_EYE_ASPECT = 0.935;

export interface EyeBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** **Der Kasten für ein Auge** — so groß wie möglich, mittig im Fenster. */
export function eyeBox(width: number, height: number, aspect = QUEST_EYE_ASPECT): EyeBox {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const boxW = Math.min(w, h * aspect);
  const boxH = boxW / aspect;
  return {
    x: Math.round((w - boxW) / 2),
    y: Math.round((h - boxH) / 2),
    width: Math.round(boxW),
    height: Math.round(boxH),
  };
}

const KEY = 'bgvr.vrView';

/** Ob die VR-Ansicht gewählt ist — gemerkt im Browser. */
export function vrViewOn(): boolean {
  try {
    return globalThis.localStorage?.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function saveVrView(on: boolean): void {
  try {
    if (on) globalThis.localStorage?.setItem(KEY, '1');
    else globalThis.localStorage?.removeItem(KEY);
  } catch {
    // Ohne Speicher gilt die Wahl bis zum Neuladen.
  }
}
