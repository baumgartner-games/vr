import { viewFrustum, type ViewFrustum } from './questView';

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
 * - **Das gemessene Sichtfeld** (`core/questView.ts`): der Kasten darum mitten
 *   im Fenster (`eyeBox`), so groß, wie es passt, die Kamera schief darauf
 *   zugeschnitten (oben 25°, unten 45°, seitlich 40°) und die Leinwand auf
 *   die Form der Messung beschnitten (`clip-path`); drum herum dunkel.
 * - **Das Menü als Bildschirm zwei Meter davor** (`GameMenu.presenting`), die
 *   Tafeln der Brille (`App.xrPreview`).
 *
 * Gesteuert wird weiter mit Maus und Tastatur wie _Aus den Augen_.
 *
 * Erst standen hier geschätzte 96° senkrecht bei 0,935; seit Oktober 2026
 * gilt, was mit dem **Kalibrier-Helm** in der Brille abgelesen wurde.
 */

/** Das Bild für das gemessene Sichtfeld. */
export const QUEST_FRUSTUM: ViewFrustum = viewFrustum();

export interface EyeBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** **Der Kasten für ein Auge** — so groß wie möglich, mittig im Fenster. */
export function eyeBox(width: number, height: number, aspect = QUEST_FRUSTUM.aspect): EyeBox {
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
