import type { HintDevice } from '../../../core/controlHints';

/**
 * **Die Zeile unter dem Namen in der Techniker-Tafel** (`ShipExperience`,
 * `.orbital-player__keys`) — was die Hände halten, und nur dann die Tasten,
 * wenn sie sonst niemand sagt.
 *
 * Vorher stand dort fest „WASD · Strg ducken · E benutzen … Tab" — auch am
 * Telefon und mit Pad, wo es weder `E` noch `Tab` gibt, und doppelt neben
 * der Tastenhilfe unten (`core/controlHints.ts`, Zone `haunting`) und der
 * Willkommens-Karte. Jetzt:
 *
 * - **immer** der Stand der Hände (links, rechts); mit Tastatur dazu, was _Benutzen_ ins
 *   Leere tut (die Lampe an/aus, `useTogglesLight`) — am Glas und am Pad
 *   springt `A` dort, also steht es nicht da;
 * - **die Tasten zum Laufen, Ducken und Werkzeug** nur mit Tastatur und nur,
 *   wenn die Tastenhilfe abgeschaltet ist. Am Pad und am Glas stehen sie auf
 *   den Knöpfen bzw. in der Tastenhilfe.
 *
 * Reine Rechnung, kein DOM.
 */
export interface PlayerKeysInput {
  /** Womit gerade bedient wird (`core/controlHints.hintDevice`). */
  readonly device: HintDevice;
  /** Steht die Tastenhilfe unten im Bild (`ui/ControlHints.hintsOn`)? */
  readonly hintsShown: boolean;
  /** Der Knopf für _Benutzen_ auf diesem Gerät, wie er dasteht (`E`, `Ⓐ`, `A`). */
  readonly useKey: string;
  /** Die Taste für die Werkzeugliste (Tastatur, `Tab`). */
  readonly toolsKey: string;
  /** Die vier Lauftasten zusammen (`WASD`). */
  readonly moveKeys: string;
  /** Brennt die Lampe gerade — dann schaltet _Benutzen_ ins Leere sie aus. */
  readonly lightOn: boolean;
  /** Was die linke Hand hält, oder `Hand frei`. */
  readonly left: string;
  /** Was die rechte Hand hält, oder `Hand frei`. */
  readonly right: string;
}

/**
 * **Schaltet _Benutzen_ ins Leere auf diesem Gerät das Licht?** Nur die
 * Taste tut das: `E` geht immer an die Welt (`FlatControls`, `useQueued` →
 * `useForward` → `ShipExperience.useEmpty`). `A` am Glas und `Ⓐ` am Pad
 * benutzen dagegen nur, wenn etwas vor der Figur steht (`rig.useCandidate`),
 * sonst wollen sie **springen** (`FlatControls.applyUse`), was die Station
 * auf dem Zellgitter überhört — die Zeile „A ins Leere:
 * Licht aus" am Telefon versprach also etwas, das nicht geschah. Dort geht
 * das Licht über die Werkzeugwahl; die Angabe fällt weg.
 */
export function useTogglesLight(device: HintDevice): boolean {
  return device === 'keyboard';
}

export function playerKeysText(input: PlayerKeysInput): string {
  const hands = `links: ${input.left} · rechts: ${input.right}`;
  if (!useTogglesLight(input.device)) return hands;
  const light = `${input.useKey} ins Leere: Licht ${input.lightOn ? 'aus' : 'an'}`;
  if (!input.hintsShown) {
    return `${input.moveKeys} · Strg ducken · ${light} · Werkzeug: ${input.toolsKey} · ${hands}`;
  }
  return `${light} · ${hands}`;
}
