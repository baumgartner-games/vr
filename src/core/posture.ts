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
 * **Und dann gibt es die Küche**, und dort stimmt die richtige Zahl nicht mehr.
 * Die Kochfigur ist 1,60 m hoch, ihre Augen stehen auf 0,91 m, und die Möbel
 * sind auf sie gebaut: Arbeitsplatten auf einem halben Meter
 * (`core/chefFit.ts`, `core/kitchenFit.ts`). Wer dort mit seinen echten 1,65 m
 * steht, schaut von oben auf eine Puppenstube herab — die Küche ist mit
 * Absicht klein, also muss in ihr der **Spieler** kleiner werden. Die dritte
 * Zahl in diesem Speicher ist genau das: die Augenhöhe, aus der man in der
 * Küche schaut (`kitchen`, voreingestellt 140 cm). Wie sie wirkt, steht bei
 * `kitchenEyeScale` — und sie wirkt **nur in der Brille und nur in der Küche**
 * (`worlds/test/zones/kitchen.ts`, `fitEyes`).
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
  /**
   * **Aus welcher Höhe man in der Küche schaut**, in Zentimetern — und das ist
   * keine gemessene Zahl, sondern eine gewünschte.
   *
   * `stand` und `sit` beschreiben den Menschen vor der Brille; diese hier
   * beschreibt einen **Platz in der Welt**. Sie gehört trotzdem hierher und
   * nicht in die Küche: Es ist eine Augenhöhe in Zentimetern, sie wird im
   * selben Menü eingestellt, sie liegt im selben Speicher, und die Rechnung,
   * die sie braucht, braucht `stand` gleich mit (`kitchenEyeScale`). Eine
   * zweite Datei mit einem zweiten `localStorage`-Schlüssel für dieselbe Art
   * Zahl wäre die, die beim nächsten Umbau vergessen wird.
   */
  kitchen: number;
}

/**
 * Voreingestellt: 165 cm im Stehen, 120 cm im Sessel. Die 45 cm dazwischen
 * sind ungefähr das, was ein Bürostuhl ausmacht, und genau der Betrag, um den
 * die Welt vorher zu groß wurde.
 *
 * **140 cm in der Küche**, und die Zahl liegt mit Absicht in der Mitte: Aus
 * 120 cm (sitzende Augenhöhe) schaut man den Arbeitsplatten ins Gesicht, aus
 * 160 cm steht man wieder darüber. 140 cm ist beides nicht — bequem auf den
 * halben Meter Arbeitshöhe herunter und trotzdem hoch genug, dass ein Bücken
 * bis zum Boden noch ein Bücken ist und kein Hinlegen.
 */
export const DEFAULT_EYES: EyeHeights = {
  stand: Math.round(STANDING_EYE * 100),
  sit: 120,
  kitchen: 140,
};

/** Was eine Augenhöhe sein darf — ein Kind im Stehen bis zu jemandem sehr Großem. */
export const EYE_RANGE = { min: 60, max: 220 } as const;

/**
 * **Was die Küchen-Augenhöhe sein darf** — enger als `EYE_RANGE`, und zwar aus
 * einem anderen Grund.
 *
 * `EYE_RANGE` umfasst jeden Menschen, der eine Brille aufsetzen kann. Hier
 * geht es nicht um Menschen, sondern um einen Standpunkt in einem Raum, und
 * dieser Raum hat Maße: Die höchste Arbeitsfläche liegt auf 0,57 m, das
 * Ausgaberegal auf 1,13 m (`core/kitchenFit.KITCHEN_PIECES`). Unter einem
 * Meter schaut man von unten gegen die Theke, über 1,80 m ist man wieder der
 * Riese, gegen den die ganze Einstellung gebaut wurde. Der Nutzer hat 120 bis
 * 160 als den Bereich genannt, um den es geht; hier steht er mit einer
 * Handbreit Luft nach beiden Seiten.
 */
export const KITCHEN_EYE_RANGE = { min: 100, max: 180 } as const;

/**
 * **Wie stark eine Welt die Augenhöhe höchstens verstellen darf.**
 *
 * `kitchenEyeScale` teilt zwei gespeicherte Zahlen durcheinander, und beide
 * dürfen an ihren Rändern stehen: 100 cm Küchenhöhe bei 220 cm Augenhöhe sind
 * 0,45, und 180 bei 60 sind 3,0. Das erste ist ein Spieler, der in der Küche
 * auf Kniehöhe schwebt, das zweite einer, dessen Kopf beim Aufstehen durch die
 * Decke geht. Beide Fälle entstehen aus gültigen Zahlen — also wird nicht die
 * Eingabe verboten, sondern das Ergebnis begrenzt.
 */
export const EYE_SCALE_RANGE = { min: 0.5, max: 1.5 } as const;

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

/**
 * Ein Satz Werte, bei dem jede Zahl in ihrem eigenen Bereich liegt.
 *
 * **Jede Zahl für sich, und eine fehlende ist keine kaputte.** Genau das ist
 * der Fall, der im Speicher jedes Spielers steht, der schon vor dieser
 * Einstellung gespielt hat: `{"stand":172,"sit":118}` ohne `kitchen`. Ein
 * `JSON.parse`, das daraus `undefined` macht, darf nicht die beiden
 * gemessenen Zahlen mitreißen — es fehlt eine, also bekommt genau die ihren
 * Auslieferungswert.
 */
export function clampEyes(values: Partial<EyeHeights> | undefined): EyeHeights {
  const one = (
    value: number | undefined,
    spare: number,
    range: { min: number; max: number },
  ): number => {
    if (!Number.isFinite(value)) return spare;
    return Math.round(Math.min(range.max, Math.max(range.min, value as number)));
  };
  return {
    stand: one(values?.stand, DEFAULT_EYES.stand, EYE_RANGE),
    sit: one(values?.sit, DEFAULT_EYES.sit, EYE_RANGE),
    kitchen: one(values?.kitchen, DEFAULT_EYES.kitchen, KITCHEN_EYE_RANGE),
  };
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

/**
 * **Auf welchen Bruchteil seiner eigenen Augenhöhe die Küche den Spieler
 * herunterrechnet** — 1 heißt: unverändert.
 *
 * **Ein Verhältnis und keine Differenz, und das ist die Entscheidung dieser
 * Datei.** Beides war gewünscht („separat setzen bzw. Diff anpassen"), beides
 * ließe sich aus denselben zwei Zahlen bauen, und nur eines davon überlebt das
 * Bücken:
 *
 * - **Als Differenz** (−25 cm für den voreingestellten Spieler) wandert der
 *   ganze Mensch um einen festen Betrag nach unten. Im Stehen stimmt es; wer
 *   sich dann bückt, um etwas vom Boden zu nehmen, steckt mit dem Kopf im
 *   Estrich, sobald seine echte Augenhöhe unter 25 cm fällt — und lange davor
 *   liegen seine Hände darunter. Für einen sehr kleinen Spieler (Augen auf
 *   130 cm) wären 25 cm außerdem viel zu viel: Er stünde in der Küche tiefer,
 *   als die Küche je gemeint war.
 * - **Als Verhältnis** wird nicht verschoben, sondern **gestaucht**: Die Null
 *   bleibt die Null. Der Boden bleibt der Boden, der Tresen rückt in
 *   Augenhöhe, und jedes Bücken landet genau da, wo es soll — anteilig, aber
 *   nie darunter. Und es kippt an keinem Ende: Wer 1,95 m groß ist, wird
 *   stärker gestaucht als jemand mit 1,60 m, denn beide sollen auf **dieselbe**
 *   Höhe kommen.
 *
 * Eingestellt wird trotzdem eine **absolute** Zahl in Zentimetern
 * (`EyeHeights.kitchen`) und kein Faktor, denn das ist die Frage, die man sich
 * stellt: „Aus welcher Höhe will ich auf die Arbeitsplatte schauen?" Ein
 * Faktor von 0,85 beantwortet sie nicht. Die Differenz, nach der der Nutzer
 * gefragt hat, fällt dabei ab — sie wird gerechnet und nicht getippt, und
 * deshalb stimmt sie für jeden.
 *
 * Umgesetzt wird der Faktor in `PlayerRig.eyeScale`.
 */
export function kitchenEyeScale(values: EyeHeights = eyeHeights()): number {
  // Eine Augenhöhe von 0 gibt es nicht (`EYE_RANGE.min`), eine Division durch
  // sie also auch nicht — der Zweig ist für den Aufrufer, der sich sein Paar
  // selbst zusammenstellt.
  if (!(values.stand > 0)) return 1;
  const scale = values.kitchen / values.stand;
  return Math.min(EYE_SCALE_RANGE.max, Math.max(EYE_SCALE_RANGE.min, scale));
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
