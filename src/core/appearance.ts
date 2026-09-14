import { asHeadgear, HEADGEAR_LABELS, type HeadgearKind } from './headgear';
import {
  asBody,
  asHead,
  BODY_LABELS,
  HEAD_LABELS,
  type BodyKind,
  type HeadKind,
} from './avatarLook';

/**
 * **Wie man aussieht** — die eigene Erscheinung, so wie `graphicsSettings` das
 * eigene Bild ist.
 *
 * Zwei Sachen unterscheiden sie von allem anderen, was hier gespeichert wird,
 * und beide folgen aus derselben Beobachtung: Ein Aussehen ist nichts, was
 * man **hat**, sondern etwas, das die **anderen sehen**.
 *
 * - Es hängt am Spieler und an keiner Welt. Wer im Hub eine Kochmütze aufsetzt,
 *   trägt sie im Gokart auch — genau wie die Augenhöhe und die Grafikstufe.
 * - Es **geht über das Netz** (`net/NetSession.ts`): Kopf, Hut und Körper
 *   stehen in der Vorstellung, mit der sich jeder im Raum anmeldet, und die
 *   anderen bauen daraus den Körper, den sie ohnehin für einen zeichnen.
 *
 * Reine Zahlen und Namen, kein three.js: Was daraus für ein Ding wird, steht
 * in `avatarLook.ts` (Kopf und Körper) und `headgear.ts` (der Hut).
 */

const KEY = 'bgvr.look';

export interface Appearance {
  /** Was auf dem Kopf sitzt. `none` ist die Auslieferung. */
  hat: HeadgearKind;
  /** Hautton und Gesicht (`core/avatarLook.ts`). */
  head: HeadKind;
  /** Die Kochjacke (`core/avatarLook.ts`). */
  body: BodyKind;
}

export const DEFAULT_APPEARANCE: Appearance = { hat: 'none', head: 'round', body: 'white' };

/** Ein Aussehen, bei dem jeder Wert erlaubt ist. */
export function clampAppearance(look: Partial<Appearance> | undefined): Appearance {
  return { hat: asHeadgear(look?.hat), head: asHead(look?.head), body: asBody(look?.body) };
}

/**
 * Wie die Seite im Menü unter ihrer Überschrift steht.
 *
 * Alle drei Zeilen in einer Zeile: Wer das Menü aufklappt, soll schon dort
 * sehen, als was er gerade herumläuft, und nicht erst eine Ebene tiefer.
 */
export function appearanceSummary(look: Appearance): string {
  const hat = look.hat === 'none' ? 'ohne Hut' : HEADGEAR_LABELS[look.hat];
  return `${HEAD_LABELS[look.head]} · ${hat} · ${BODY_LABELS[look.body]}`;
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
