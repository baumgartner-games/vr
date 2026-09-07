import { asHeadgear, HEADGEAR_LABELS, type HeadgearKind } from './headgear';

/**
 * **Wie man aussieht** — die eigene Erscheinung, so wie `graphicsSettings` das
 * eigene Bild ist.
 *
 * Zwei Sachen unterscheiden sie von allem anderen, was hier gespeichert wird,
 * und beide folgen aus derselben Beobachtung: Ein Aussehen ist nichts, was
 * man **hat**, sondern etwas, das die **anderen sehen**.
 *
 * - Es hängt am Spieler und an keiner Welt. Wer im Hub einen Helm aufsetzt,
 *   trägt ihn im Gokart auch — genau wie die Augenhöhe und die Grafikstufe.
 * - Es **geht über das Netz** (`net/NetSession.ts`): Der Hut steht in der
 *   Vorstellung, mit der sich jeder im Raum anmeldet, und die anderen setzen
 *   ihn dem Körper auf, den sie ohnehin für einen zeichnen.
 *
 * Reine Zahlen und Namen, kein three.js: Was daraus für ein Ding wird, steht
 * in `headgear.ts`.
 */

const KEY = 'bgvr.look';

export interface Appearance {
  /** Was auf dem Kopf sitzt. `none` ist die Auslieferung. */
  hat: HeadgearKind;
}

export const DEFAULT_APPEARANCE: Appearance = { hat: 'none' };

/** Ein Aussehen, bei dem jeder Wert erlaubt ist. */
export function clampAppearance(look: Partial<Appearance> | undefined): Appearance {
  return { hat: asHeadgear(look?.hat) };
}

/** Wie die Seite im Menü unter ihrer Überschrift steht. */
export function appearanceSummary(look: Appearance): string {
  return look.hat === 'none' ? 'Ohne Kopfbedeckung' : `Kopf: ${HEADGEAR_LABELS[look.hat]}`;
}

// --- der Speicher ----------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

/** Läuft nach jeder Änderung — der eigene Körper hört zu, das Netz auch. */
export function onAppearanceChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function appearance(): Appearance {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return clampAppearance(raw ? (JSON.parse(raw) as Partial<Appearance>) : {});
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

/** Speichert die Änderung und gibt zurück, was davon angekommen ist. */
export function saveAppearance(look: Partial<Appearance>): Appearance {
  const next = clampAppearance({ ...appearance(), ...look });
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode; nothing we can do about it */
  }
  for (const listener of listeners) listener();
  return next;
}
