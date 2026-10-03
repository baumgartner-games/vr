import { asHeadgear, HEADGEAR_LABELS, type HeadgearKind } from './headgear';
import {
  asBody,
  asHead,
  BODY_LABELS,
  HEAD_LABELS,
  type BodyKind,
  type HeadKind,
} from './avatarLook';
import { asFigure, FIGURE_CHEF, FIGURE_DEFAULT, figureLabel } from './avatarFigures';
import { asFace, FACE_LABELS, type FaceKind } from './figureParts';

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
 * - Es **geht über das Netz** (`net/NetSession.ts`): Figur, Kopf, Hut und
 *   Körper stehen in der Vorstellung, mit der sich jeder im Raum anmeldet, und
 *   die anderen bauen daraus den Körper, den sie ohnehin für einen zeichnen.
 *
 * Reine Zahlen und Namen, kein three.js: Was daraus für ein Ding wird, steht
 * in `avatarLook.ts` (Kopf und Körper), `headgear.ts` (der Hut) und
 * `avatarFigures.ts` (die Figur darunter).
 */

const KEY = 'bgvr.look';

export interface Appearance {
  /** Was auf dem Kopf sitzt. `none` ist die Auslieferung. */
  hat: HeadgearKind;
  /** Hautton und Gesicht (`core/avatarLook.ts`). */
  head: HeadKind;
  /** Die Kochjacke (`core/avatarLook.ts`). */
  body: BodyKind;
  /**
   * **Wer man überhaupt ist** (`core/avatarFigures.ts`): `'chef'` — die gebaute
   * Figur samt Modell, so wie es immer war — oder die Adresse einer Figur aus
   * dem Regal (`adventurers/characters/Knight.glb`).
   *
   * Die vierte Zeile ist die **oberste**: Wer eine Figur aus dem Regal trägt,
   * an dem wirken Kopf und Jacke nicht mehr — die bringt ihre eigene Haut mit.
   * Der **Hut** wirkt weiter, denn der sitzt auf ihrem Kopfknochen
   * (`headgearFor`).
   */
  figure: string;
  /**
   * **Der Kopf einer Figur aus dem Regal** (`core/figureParts.ts`): `own`
   * ist der, den sie mitbringt, sonst der Kopf einer anderen Figur — getrennt
   * vom Hut wählbar. Nicht zu verwechseln mit `head`, dem Gesicht des
   * gebauten Kochs.
   */
  face: FaceKind;
}

export const DEFAULT_APPEARANCE: Appearance = {
  hat: 'none',
  head: 'round',
  body: 'white',
  figure: FIGURE_DEFAULT,
  face: 'own',
};

/** Ein Aussehen, bei dem jeder Wert erlaubt ist. */
export function clampAppearance(look: Partial<Appearance> | undefined): Appearance {
  return {
    hat: asHeadgear(look?.hat),
    head: asHead(look?.head),
    body: asBody(look?.body),
    // **Der Koch ist keine Wahl mehr** (`avatarFigures.FIGURE_CHEF`): Wer ihn
    // noch gespeichert hat oder ansagt, läuft als Auslieferung herum.
    figure: retired(asFigure(look?.figure)),
    face: asFace(look?.face),
  };
}

function retired(figure: string): string {
  return figure === FIGURE_CHEF ? FIGURE_DEFAULT : figure;
}

/**
 * Wie die Seite im Menü unter ihrer Überschrift steht.
 *
 * Alle Zeilen in einer Zeile: Wer das Menü aufklappt, soll schon dort sehen,
 * als was er gerade herumläuft, und nicht erst eine Ebene tiefer.
 *
 * **Die Figur steht vorn**, wenn es nicht der Koch ist, und dann fallen Kopf
 * und Jacke weg: Sie wirken auf eine Figur aus dem Regal nicht (siehe
 * `Appearance.figure`), und eine Zeile, die _Vollbart_ meldet, während die
 * Figur ein Roboter ist, ist keine Auskunft, sondern ein Irrtum zum Mitlesen.
 */
export function appearanceSummary(look: Appearance): string {
  const hat = look.hat === 'none' ? 'ohne Hut' : HEADGEAR_LABELS[look.hat];
  if (look.figure !== FIGURE_CHEF) {
    const face = look.face === 'own' ? '' : ` · Kopf: ${FACE_LABELS[look.face]}`;
    return `${figureLabel(look.figure)}${face} · ${hat}`;
  }
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
