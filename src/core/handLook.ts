/**
 * **Wie die Hand aussieht** — als Einstellung.
 *
 * Zwei Modelle, dieselbe Hand: die **Boxhand** aus Kästen und Kapseln, mit
 * der alles angefangen hat, und der **weiße Handschuh** — ein Handschuh wie
 * bei Rayman oder Master Hand, mit runder Handfläche, dicken runden Fingern
 * und einer Manschette am Handgelenk. Beide hängen am selben Skelett
 * (`HandVisuals.ts`, `ProceduralHand`): dieselben Gelenke, dieselben
 * Krümmungen, dieselbe Fingerspitze — nur anders angezogen. Deshalb gilt jede
 * Haltung und jede gerechnete Faust für beide, und die Werkzeugseite zeigt,
 * was man gewählt hat.
 *
 * Umgeschaltet wird unter *Einstellungen → Hände → Handmodell* und in der
 * Schublade der Werkzeugseite. Getrackte Hände (ohne Controller) bleiben
 * Kugeln an den Gelenken — die liefert die Brille, und dort ist nichts
 * anzuziehen.
 *
 * Ohne three.js, wie jede Einstellung hier.
 */

export type HandLook = 'box' | 'glove';

export const HAND_LOOKS: readonly HandLook[] = ['box', 'glove'];

/** Der Handschuh ist der Grund, warum es die Wahl gibt — also ist er die Vorgabe. */
export const DEFAULT_HAND_LOOK: HandLook = 'glove';

export function handLookLabel(look: HandLook): string {
  return look === 'glove' ? 'Weißer Handschuh' : 'Boxhand';
}

/** Das jeweils andere Modell — ein Menüpunkt, der beim Drücken wechselt. */
export function nextHandLook(look: HandLook): HandLook {
  return look === 'glove' ? 'box' : 'glove';
}

function clampLook(value: unknown): HandLook {
  return HAND_LOOKS.includes(value as HandLook) ? (value as HandLook) : DEFAULT_HAND_LOOK;
}

// --- der Speicher ----------------------------------------------------------

const KEY = 'bgvr.handLook';

type Listener = () => void;

const listeners = new Set<Listener>();

/** Wird nach jeder Änderung gerufen, damit die Hände sich neu anziehen. */
export function onHandLookChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function handLook(): HandLook {
  try {
    return clampLook(globalThis.localStorage?.getItem(KEY));
  } catch {
    // Privater Modus, kein Speicher — nichts davon ist einen Absturz wert.
    return DEFAULT_HAND_LOOK;
  }
}

export function saveHandLook(look: HandLook): HandLook {
  const next = clampLook(look);
  try {
    globalThis.localStorage?.setItem(KEY, next);
  } catch {
    /* siehe oben */
  }
  for (const listener of listeners) listener();
  return next;
}
