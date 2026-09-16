import { DEFAULT_GRAPHICS, type ScreenPads } from './graphicsSettings';
import type { PlayerRole } from './types';

/**
 * **Ob die Stöcke auf dem Glas liegen** — die eine Rechnung dahinter
 * (`index.html`, `#touch`; die Flächen selbst macht `core/FlatControls.ts`).
 *
 * Die Frage hing an einer einzigen Bedingung, und die stand **dreimal** in
 * `main.ts`: einmal beim Betreten, einmal beim Auf- und Absetzen der Brille,
 * einmal wenn eine Welt den Stock zurückgibt. Drei Stellen sind drei
 * Gelegenheiten, eine zu vergessen — und genau das war passiert: Wer die
 * Brille absetzte, bekam die Stöcke zurück, auch wenn die Welt sie gerade
 * selbst mitbrachte. Deshalb steht die Antwort jetzt hier, einmal, als Funktion
 * über fünf Eingaben, und `main.ts` ruft sie nach **jeder** Änderung.
 *
 * Fünf, weil die Sichtbarkeit an zwei ganz verschiedenen Dingen hängt:
 *
 * - **Was der Spieler eingestellt hat** (`graphicsSettings.screenPads`). Sein
 *   Wort gilt: `an` zeigt sie auch am Schreibtisch, `aus` nimmt sie auch dem
 *   Telefon. Nur `automatisch` fragt überhaupt nach dem Gerät.
 * - **Was gerade läuft**: In der Brille ist ein gemalter Stock auf einem Glas,
 *   das niemand sieht, sinnlos, und eine Welt mit eigener Steuerung hätte zwei
 *   Stöcke übereinander (`WorldContext.touchStick`). Diese beiden stehen
 *   **vor** der Einstellung — sie sind kein Geschmack, sondern ein Zustand,
 *   und gegen einen Zustand hilft kein „an".
 *
 * Und das **Gamepad** ist der Grund, warum die Automatik mehr ist als die alte
 * Zeile `detectFlatRole() === 'handheld'`: Ein Tablet mit angestecktem Pad ist
 * ein mobiler Client mit einem echten Stock in der Hand — zwei gemalte Daumen
 * darüber nehmen ihm nur das halbe Bild weg. Angesteckt und abgezogen wird
 * jederzeit, deshalb hört `main.ts` auf `gamepadconnected`/`gamepaddisconnected`
 * und rechnet neu.
 *
 * Reine Rechnung: kein DOM, kein `navigator`, kein three.js. Wer die Antwort
 * anwendet, ist `main.ts`; wer sie prüft, ist `screenPads.test.ts`.
 */
export interface PadsSituation {
  /** Was unter *Grafik → Bildschirm-Steuerung* steht. */
  setting: ScreenPads;
  /** Was das Gerät ist (`core/device.detectFlatRole`). */
  role: PlayerRole;
  /** Ob die Gamepad-API gerade ein Pad meldet (`core/gamepad.firstGamepad`). */
  gamepad: boolean;
  /** Ob eine XR-Sitzung läuft — dann sieht niemand auf das Glas. */
  presenting: boolean;
  /** Ob die Welt den Bordstock der Seite überhaupt will. */
  worldWantsStick: boolean;
}

/**
 * Die Antwort auf eine Lage. Fehlt die Einstellung — ein Aufrufer, der nur ein
 * Stück der Lage kennt —, gilt die Voreinstellung und nicht „aus".
 */
export function showScreenPads(situation: Partial<PadsSituation> & { role: PlayerRole }): boolean {
  const { role, gamepad = false, presenting = false, worldWantsStick = true } = situation;
  const setting = situation.setting ?? DEFAULT_GRAPHICS.screenPads;
  // Zwei Zustände, gegen die keine Einstellung ankommt.
  if (presenting || !worldWantsStick) return false;
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return role === 'handheld' && !gamepad;
}
