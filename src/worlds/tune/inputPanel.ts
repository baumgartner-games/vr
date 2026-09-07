/**
 * **Die Tafelwand des Eingaberaums**, als Maße — wo Modelle, Tafeln und Knöpfe
 * hängen, und der Beweis, dass sich dabei nichts gegenseitig verdeckt.
 *
 * Vorher hing das alles an der **Vorderwand**, und die ist vom Spieler vier
 * Meter weg. Zwei Sachen gehen dabei schief, und beide wurden gemeldet:
 *
 * - **Man liest es nicht.** Eine Tafel wird nicht dadurch lesbar, dass sie
 *   größer wird: die Schrift wächst mit ihr, aber die Entfernung bleibt. Die
 *   Lage-Tafel trug drei lange Zeilen auf 1,5 × 0,62 m, jede brach auf zwei um,
 *   und was übrig blieb, war 12 px hoch — ein halbes Grad im Blickfeld, und die
 *   letzte Zeile fiel ganz weg.
 * - **Die Modelle stehen davor.** Die beiden Controller hingen auf halbem Weg
 *   zur Wand, und aus Spielersicht lagen sie genau auf den Zahlen dahinter.
 *   Ein Ding zwischen Auge und Tafel wirft einen Schatten, der mit dem Abstand
 *   wächst; auf halber Strecke ist er doppelt so breit wie das Ding.
 *
 * Deshalb hängt jetzt alles auf **einer Fläche in Lesenähe** — gut zwei Meter
 * vor dem Spieler, dort, wo vorher schon die Modelle hingen. Auf einer Fläche
 * heißt: nichts steht mehr vor etwas anderem, es steht nur noch **neben**
 * einander, und das kann man ausrechnen. Die Tafeln sind dabei **kleiner**
 * geworden und die Schrift trotzdem doppelt so groß — genau das ist der Punkt
 * an der Entfernung.
 *
 * Die Zahlen stehen hier und nicht in der Welt, damit ein Test sie prüfen kann:
 * kein Rechteck schneidet ein anderes, und alles zusammen bleibt in einem
 * Blickfeld, für das man den Kopf nicht drehen muss.
 */

/** Ein Rechteck auf der Tafelwand: Mitte und Größe, in Metern. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Wie weit die Tafelwand vor dem Nullpunkt des Raums steht.
 *
 * Der Spieler steht bei `z = 0,9`, es sind von ihm aus also 2,25 m — Lesenähe:
 * nah genug, dass eine 4 cm hohe Zeile ein volles Grad im Blick einnimmt, weit
 * genug, dass man nicht hineingreift.
 */
export const PANEL_Z = -1.35;

/** Wo der Spieler steht und wie hoch sein Auge dabei liegt (Vorgabe, stehend). */
export const EYE = { y: 1.6, z: 0.9 };

/** Wie weit das Modell eines Controllers ausladen kann — als Quadrat gerechnet. */
export const MODEL_SIZE = 0.24;
/** Und die eingefrorene Lage daneben: Zylinder, Achsenkreuz und Boxhand. */
export const FREEZE_SIZE = 0.3;

/**
 * Die Zeilen der Tafelwand, von unten nach oben:
 *
 * ```
 *              ┌──────── Eingaberaum ────────┐
 *              │  Aufnahme        [ Start ]  │
 *   ( Lage ) ▮▮│   ▣ links      ▣ rechts     │▮▮ ( Lage )
 *              │ [ linke Hand ] [ rechte H ] │
 *              └─────────────────────────────┘
 * ```
 *
 * Die beiden `▮▮` sind der Zug an Trigger und Griff (`PullGauge.ts`).
 *
 * `x` ist dabei der Betrag: jede Hand bekommt ihre Seite, die linke mit
 * umgekehrtem Vorzeichen.
 */
export const PANEL = {
  /** Der Name des Raums und die beiden Gesten, in einer Zeile. */
  title: { x: 0, y: 2.45, width: 1.6, height: 0.26 } as Rect,
  /** Die Aufnahme: laufende Zeit, Höchstwert, Marken. */
  record: { x: -0.36, y: 2.03, width: 1.1, height: 0.5 } as Rect,
  /** Und der Knopf daneben, der sie startet und beendet. */
  recordButton: { x: 0.66, y: 2.03, width: 0.8, height: 0.34 } as Rect,
  /** Das lebende Modell des Geräts, je Hand. */
  model: { x: 0.45, y: 1.6, width: MODEL_SIZE, height: MODEL_SIZE } as Rect,
  /**
   * Wie weit Trigger und Griff gezogen sind, als zwei Balken (`PullGauge.ts`).
   *
   * Zwischen dem Modell und der eingefrorenen Lage, auf der Höhe des Modells:
   * Was da gemessen wird, ist ein Analogwert desselben Geräts, und es soll im
   * selben Blick stehen wie das Gerät.
   */
  pull: { x: 0.74, y: 1.6, width: 0.2, height: 0.26 } as Rect,
  /** Die eingefrorene Lage, außen daneben. */
  freeze: { x: 1.06, y: 1.6, width: FREEZE_SIZE, height: FREEZE_SIZE } as Rect,
  /** Was gedrückt ist und wie das Gerät liegt — eine Tafel je Hand. */
  board: { x: 0.45, y: 1.18, width: 0.8, height: 0.52 } as Rect,
} as const;

/** Was es zweimal gibt, einmal je Hand — der Rest steht einmal da. */
export const PER_HAND: ReadonlySet<string> = new Set(['model', 'pull', 'freeze', 'board']);

/** Dasselbe Rechteck für die linke Seite: gespiegelt an der Mitte. */
export function mirrored(rect: Rect): Rect {
  return { ...rect, x: -rect.x };
}

/** Jedes Rechteck der Tafelwand, beide Seiten, mit Namen. */
export function panelRects(): { name: string; rect: Rect }[] {
  const out: { name: string; rect: Rect }[] = [];
  for (const [name, rect] of Object.entries(PANEL)) {
    if (!PER_HAND.has(name)) {
      out.push({ name, rect });
      continue;
    }
    out.push({ name: `${name}:rechts`, rect });
    out.push({ name: `${name}:links`, rect: mirrored(rect) });
  }
  return out;
}

/** Wie weit zwei Rechtecke einander überlappen — negativ heißt: Luft dazwischen. */
export function overlap(a: Rect, b: Rect): number {
  const x = (a.width + b.width) / 2 - Math.abs(a.x - b.x);
  const y = (a.height + b.height) / 2 - Math.abs(a.y - b.y);
  return Math.min(x, y);
}

/** Wie weit ein Punkt der Tafelwand vom Auge weg zur Seite und nach oben steht. */
export function viewAngles(
  x: number,
  y: number,
  eye: { y: number; z: number } = EYE,
): { azimuth: number; elevation: number } {
  const away = eye.z - PANEL_Z;
  const deg = 180 / Math.PI;
  return {
    azimuth: Math.atan2(Math.abs(x), away) * deg,
    elevation: Math.atan2(y - eye.y, away) * deg,
  };
}
