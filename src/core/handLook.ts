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
 * Schublade der Werkzeugseite.
 *
 * Getrackte Hände (ohne Controller) waren lange Kugeln an den Gelenken — die
 * liefert die Brille, und dort schien nichts anzuziehen zu sein. Seit
 * `gloveFit.ts` gibt es den zweiten Schalter daneben: **Handschuh an
 * getrackten Händen**. Er legt einen Handschuh auf dieselben Gelenke — gebaut
 * auf die gemessenen Knochen und Bild für Bild aus allen Gelenken gestellt
 * (`handBones.ts`). Ein eigener Schalter und keine dritte Stufe von
 * `HandLook`, weil es eine andere Frage ist: das Modell gilt für die Hand am
 * Controller, dieser hier für die Hand ohne.
 *
 * Und der dritte, der für beide gilt: **Knochenfarben**. Er ist keine dritte
 * Art Hand, sondern eine Ansicht davon — dieselbe Hand, nur so angemalt, dass
 * man ihre Knochen einzeln sieht. Zum Justieren, und ab Werk aus.
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

// --- der Handschuh an getrackten Händen -------------------------------------

const TRACKED_KEY = 'bgvr.trackedGlove';

/**
 * Ob eine Hand **ohne Controller** einen Handschuh trägt statt Gelenkkugeln.
 *
 * Ab Werk aus: die Kugeln sind das, was die Brille misst, und wer eine Geste
 * einstellt, will genau das sehen. Angeschaltet liegt derselbe Handschuh
 * darüber, den die Hand am Controller trägt — dieselben Finger, dasselbe Maß,
 * nur auf echte Knochen gelegt (`gloveFit.ts`). Der Schalter dafür hängt im
 * Poseraum des Eingaberaums an der Wand, dort, wo man ihn braucht.
 */
export function trackedGlove(): boolean {
  try {
    return globalThis.localStorage?.getItem(TRACKED_KEY) === 'on';
  } catch {
    // Privater Modus, kein Speicher — siehe oben.
    return false;
  }
}

export function saveTrackedGlove(on: boolean): boolean {
  try {
    globalThis.localStorage?.setItem(TRACKED_KEY, on ? 'on' : 'off');
  } catch {
    /* siehe oben */
  }
  // Derselbe Verteiler wie beim Modell: die Hände ziehen sich neu an.
  for (const listener of listeners) listener();
  return on;
}

// --- die Knochenfarben ------------------------------------------------------

const BONES_KEY = 'bgvr.boneColors';

/**
 * Ob jeder **Knochen seine eigene Farbe** bekommt statt der einen Handfarbe.
 *
 * Ab Werk aus, und aus einem Grund: eine Hand ist einfarbig, und beim Spielen
 * soll ein Handschuh ein Handschuh sein und kein Farbfächer. Beim **Justieren**
 * ist genau das im Weg — fünf gleich weiße Röhren, und welche davon der
 * Ringfinger ist und wo sein zweiter Knochen anfängt, muss man erraten. Wer
 * eine Zahl in der Tafel ändert, sieht ohne Farben auch nicht, *welcher*
 * Knochen sich bewegt hat.
 *
 * Angeschaltet bekommt jeder Finger einen Farbton und jeder Knochen darin eine
 * Stufe — gerechnet und nicht ausgesucht (`bonePalette.ts`). Es gilt für alles,
 * was eine Hand sein kann: Boxhand, Handschuh und die Gelenkkugeln einer
 * blanken Hand. Der Schalter dafür hängt neben dem Handschuh-Schalter im
 * Poseraum, dort, wo man ihn braucht.
 */
export function boneColors(): boolean {
  try {
    return globalThis.localStorage?.getItem(BONES_KEY) === 'on';
  } catch {
    // Privater Modus, kein Speicher — siehe oben.
    return false;
  }
}

export function saveBoneColors(on: boolean): boolean {
  try {
    globalThis.localStorage?.setItem(BONES_KEY, on ? 'on' : 'off');
  } catch {
    /* siehe oben */
  }
  // Wieder derselbe Verteiler: eine Hand wird neu gebaut, wenn sie sich anders
  // anzieht, und eine gefärbte Hand ist eine anders angezogene.
  for (const listener of listeners) listener();
  return on;
}
