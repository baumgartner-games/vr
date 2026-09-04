/**
 * Sitting or standing — the one thing about a player the headset cannot tell.
 *
 * A headset reports where the head is above the *floor of the room*, and every
 * height in a world is measured from that same floor. That works perfectly for
 * somebody standing up and fails quietly for everybody else: sit down on a
 * chair and the head drops thirty to forty centimetres, so the kitchen counter
 * grows, the go-kart swallows you and the whole world turns into a place built
 * for somebody taller. Nothing in WebXR says which of the two it is, so the
 * player is asked once — on the start page, and afterwards under
 * *Menü → Bewegung → Haltung*.
 *
 * **Und wie hoch die beiden sind, weiß auch niemand von allein.** Der Ausgleich
 * hing lange an einer einzigen getippten Zahl: 1,65 m Augenhöhe im Stehen, für
 * alle. Wer kleiner ist, sitzt danach zu hoch; wer größer ist, zu tief — und
 * man merkt es genau da, wo es zählt. Ein echter Schreibtisch mit 78 cm passt
 * dann nicht auf einen virtuellen Tisch, der auf 78 cm steht, obwohl beide
 * Zahlen stimmen: der Boden unter dem Spieler liegt um die Differenz falsch.
 * Deshalb sind es hier **zwei Augenhöhen**, stehend und sitzend, beide in
 * Zentimetern und beide messbar — Brille auf, hinstellen bzw. hinsetzen,
 * *Jetzt messen* drücken, und die Brille schreibt ihre eigene Zahl hinein.
 *
 * Was die Antwort tut, steht in `PlayerRig`: ein sitzender Spieler bekommt die
 * Differenz zwischen beiden Höhen als Anhebung dazu, die Füße bleiben, wo sie
 * sind. Vorher war das die Differenz zu einer *gemessenen* Kopfhöhe, was jedes
 * Vorbeugen im Sessel in ein Wandern der Welt übersetzte.
 *
 * Reine Zahlen und ein bisschen Speicher, kein three.js.
 */

export type Posture = 'stand' | 'sit';

/** Eye height a standing player is assumed to have, in metres. */
export const STANDING_EYE = 1.65;

/**
 * Wie hoch die Augen über dem Zimmerboden liegen, in **Zentimetern**.
 *
 * Zentimeter, weil das die Einheit ist, in der man sich selbst misst und in
 * der der Tisch im Eingaberaum eingestellt wird — zwischen zwei Einheiten hin
 * und her zu rechnen ist genau die Stelle, an der ein Faktor 100 verloren
 * geht.
 */
export interface EyeHeights {
  stand: number;
  sit: number;
}

/**
 * Voreingestellt: 165 cm im Stehen, 120 cm im Sessel. Die 45 cm dazwischen
 * sind ungefähr das, was ein Bürostuhl ausmacht, und genau der Betrag, um den
 * die Welt vorher zu groß wurde.
 */
export const DEFAULT_EYES: EyeHeights = { stand: Math.round(STANDING_EYE * 100), sit: 120 };

/** Was eine Augenhöhe sein darf — ein Kind im Stehen bis zu jemandem sehr Großem. */
export const EYE_RANGE = { min: 60, max: 220 } as const;

const KEY = 'bgvr.posture';
const EYE_KEY = 'bgvr.eyeHeights';

type Listener = () => void;

const listeners = new Set<Listener>();

/** Wird nach jeder Änderung gerufen — Menü und Eingaberaum ziehen nach. */
export function onPostureChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** What the player picked, or `stand` until they pick something. */
export function playerPosture(): Posture {
  return readPosture() ?? 'stand';
}

/** False while nobody has answered the question yet — the start page asks. */
export function hasPlayerPosture(): boolean {
  return readPosture() !== null;
}

export function savePlayerPosture(posture: Posture): void {
  try {
    globalThis.localStorage?.setItem(KEY, posture);
  } catch {
    // Private mode, no storage: the choice then lasts for this session only.
  }
  announce();
}

/** Beide Augenhöhen, in Zentimetern, immer im erlaubten Bereich. */
export function eyeHeights(): EyeHeights {
  try {
    const raw = globalThis.localStorage?.getItem(EYE_KEY);
    return clampEyes(raw ? (JSON.parse(raw) as Partial<EyeHeights>) : {});
  } catch {
    // Privater Modus, kaputtes JSON — nichts davon ist einen Absturz wert.
    return clampEyes({});
  }
}

/** Ändert, was übergeben wird, und lässt den Rest stehen. */
export function saveEyeHeights(next: Partial<EyeHeights>): EyeHeights {
  const values = clampEyes({ ...eyeHeights(), ...next });
  try {
    globalThis.localStorage?.setItem(EYE_KEY, JSON.stringify(values));
  } catch {
    /* siehe oben */
  }
  announce();
  return values;
}

export function clearEyeHeights(): EyeHeights {
  return saveEyeHeights({ ...DEFAULT_EYES });
}

/** Ein Werte-Paar, bei dem beide Zahlen erlaubt sind. */
export function clampEyes(values: Partial<EyeHeights> | undefined): EyeHeights {
  const one = (value: number | undefined, spare: number): number => {
    if (!Number.isFinite(value)) return spare;
    return Math.round(Math.min(EYE_RANGE.max, Math.max(EYE_RANGE.min, value as number)));
  };
  return { stand: one(values?.stand, DEFAULT_EYES.stand), sit: one(values?.sit, DEFAULT_EYES.sit) };
}

/**
 * Um wie viel ein sitzender Spieler angehoben wird, in Metern.
 *
 * Sitzt jemand *höher* als er steht — auf einem Barhocker, oder weil eine der
 * beiden Zahlen daneben liegt —, wird nichts angehoben statt in den Boden
 * gedrückt: negativ wäre hier immer ein Messfehler und nie eine Absicht.
 */
export function seatedLift(values: EyeHeights = eyeHeights()): number {
  return Math.max(0, (values.stand - values.sit) / 100);
}

function readPosture(): Posture | null {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw === 'sit' || raw === 'stand' ? raw : null;
  } catch {
    return null;
  }
}

function announce(): void {
  for (const listener of listeners) listener();
}
