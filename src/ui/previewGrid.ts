/**
 * **Die Rechnung hinter den drehenden Modellen im Raster der Seite** — ohne
 * three.js, ohne Leinwand, ohne Browser.
 *
 * Das Regal zeigt am Handgelenk in jeder Kachel das Modell selbst
 * (`ui/WristMenu.ts`); auf dem Telefon tut es das jetzt auch
 * (`ui/PagePreviews.ts`). Was daran **wehtun** kann, ist nicht das Zeichnen,
 * sondern die Buchführung: Wer wird wann wieder gefragt, wer ist zu sehen, wer
 * gibt sein Modell wieder her. Genau das steht hier — als reine Funktion und
 * als reines Verzeichnis, beide von einem Test nachgerechnet
 * (`previewGrid.test.ts`). Im Browser bleibt dann nur noch das, was einen
 * Browser wirklich braucht.
 */

/** Ein Rechteck, wie `getBoundingClientRect` es liefert — in Bildpunkten. */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Wo ein Modell auf der Leinwand steht: die **Mitte** seiner Kachel, gemessen
 * von der linken oberen Ecke der Liste, und die Kantenlänge des Quadrats, in
 * das es passen muss. Beides in Bildpunkten.
 */
export interface Slot {
  x: number;
  y: number;
  size: number;
}

/**
 * Wie lange nach einem `null` gewartet wird, bevor dieselbe Id noch einmal
 * gefragt wird — in Sekunden, dieselbe Zahl wie am Handgelenk.
 *
 * `null` heißt bei der Modellfabrik nicht „gibt es nicht", sondern **„noch
 * nicht"**: Der Aufruf stößt das Laden an und kommt sofort zurück
 * (`core/kaykitModel.ts`, `kaykitModelNow`). Jedes Bild zu fragen wäre
 * sechzigmal die Sekunde dieselbe Frage; ein gemerktes `null` wäre ein Fach,
 * das für immer leer bleibt.
 */
export const PREVIEW_RETRY = 0.5;

/** Wie schnell sich ein Vorschaumodell dreht, in Radiant pro Sekunde. */
export const PREVIEW_SPIN = 0.7;

/**
 * Wie weit es nach vorn gekippt steht. Eine reine Seitenansicht macht aus
 * jedem Ding einen Strich — dieselbe Zahl wie am Handgelenk.
 */
export const PREVIEW_TILT = 0.32;

/**
 * Wie viel vom Quadrat der Kachel das Modell einnimmt.
 *
 * **Diese Zahl ersetzt eine Schere.** Das Raster wird in *einem* Durchgang
 * gezeichnet (`ui/PagePreviews.ts`), es gibt also keinen Scherenschnitt je
 * Kachel, der ein Modell in seinem Fach hielte. Stattdessen rechnet man es
 * aus: Auf die längste Kante normiert, ragt ein um die Hochachse gedrehter
 * Körper höchstens √2⁄2 ≈ 0,707 seiner Kantenlänge aus der Mitte, mit der
 * Kippung oben rund 0,70. Mal 0,68 sind das 0,48 — und damit bleibt auch das
 * ungünstigste Ding in seiner Kachel, statt der Nachbarin ins Bild zu ragen.
 */
export const PREVIEW_FILL = 0.68;

/**
 * Wo das Modell einer Kachel auf der Leinwand steht — oder `null`, wenn die
 * Kachel gar nicht zu sehen ist.
 *
 * Die Leinwand liegt über dem **sichtbaren** Ausschnitt der Liste und scrollt
 * nicht mit; die Kacheln tun es. Also wird hier jedes Bild neu gerechnet, wo
 * eine Kachel gerade liegt. Was die Liste oben oder unten verlässt, schneidet
 * der Rand der Leinwand ab — eine halb sichtbare Kachel bekommt deshalb ihren
 * Platz und wird halb gezeichnet, und erst eine ganz draußen liegende bekommt
 * `null`.
 */
export function previewSlot(list: Rect, cell: Rect): Slot | null {
  if (cell.width <= 0 || cell.height <= 0) return null;
  if (list.width <= 0 || list.height <= 0) return null;
  const outside =
    cell.left >= list.left + list.width ||
    cell.left + cell.width <= list.left ||
    cell.top >= list.top + list.height ||
    cell.top + cell.height <= list.top;
  if (outside) return null;
  return {
    x: cell.left - list.left + cell.width / 2,
    y: cell.top - list.top + cell.height / 2,
    size: Math.min(cell.width, cell.height),
  };
}

/**
 * **Wer schon ein Modell hat, wer gerade gefragt wurde, und wer es wieder
 * hergibt.**
 *
 * Drei Zusagen, und jede einzelne ist der Grund, warum sich ein Ordner mit
 * 1588 Dateien überhaupt aufschlagen lässt:
 *
 * - Gefragt wird höchstens alle `PREVIEW_RETRY` Sekunden, und **ein `null`
 *   wird nicht gemerkt** — es heißt „noch nicht".
 * - Wer aus dem Bild scrollt, gibt sein Modell her (`keepOnly`).
 * - Wer die Seite wechselt, gibt **alles** her (`turnTo`). Ohne diese Zeile
 *   wüchse die Szene mit jedem Ordner, den man je aufgemacht hat.
 *
 * Das Verzeichnis führt nur Ids. Was daran hängt — ein Knoten in einer Szene,
 * ein Bild auf einer Leinwand —, weiß der Aufrufer; er bekommt zurück, was er
 * wegräumen soll.
 */
export class PreviewLedger {
  private page = '';
  /** Wann zuletzt vergeblich gefragt wurde, in Sekunden der Aufruferuhr. */
  private readonly asked = new Map<string, number>();
  /** Wer ein gebautes Modell hat. */
  private readonly held = new Set<string>();

  /** Wie viele Modelle gerade gehalten werden — für Messungen und Tests. */
  get size(): number {
    return this.held.size;
  }

  /**
   * Eine andere Seite wird aufgeschlagen. Zurück kommen die Ids, deren Modelle
   * der Aufrufer wegräumen soll; bei derselben Seite bleibt alles stehen.
   */
  turnTo(page: string): string[] {
    if (page === this.page) return [];
    this.page = page;
    const gone = [...this.held];
    this.held.clear();
    this.asked.clear();
    return gone;
  }

  /** Ob die Fabrik zu dieser Id jetzt gefragt werden darf. */
  due(id: string, now: number): boolean {
    if (this.held.has(id)) return false;
    const last = this.asked.get(id);
    return last === undefined || now - last >= PREVIEW_RETRY;
  }

  /** Ob zu dieser Id ein Modell dasteht — die Kachel lässt dann ihre Ikone weg. */
  has(id: string): boolean {
    return this.held.has(id);
  }

  /** Die Fabrik hat geliefert. */
  got(id: string): void {
    this.held.add(id);
    this.asked.delete(id);
  }

  /** Die Fabrik sagte „noch nicht" — in einer halben Sekunde wieder. */
  missed(id: string, now: number): void {
    this.asked.set(id, now);
  }

  /**
   * Nur diese Ids sind noch zu sehen. Zurück kommt, was der Aufrufer wegräumen
   * soll — und nebenbei vergisst das Verzeichnis die vergeblichen Fragen zu
   * allem, was ohnehin nicht mehr dasteht.
   */
  keepOnly(visible: Iterable<string>): string[] {
    const keep = new Set(visible);
    const gone: string[] = [];
    for (const id of this.held) if (!keep.has(id)) gone.push(id);
    for (const id of gone) this.held.delete(id);
    for (const id of [...this.asked.keys()]) if (!keep.has(id)) this.asked.delete(id);
    return gone;
  }
}

/**
 * **Was die Seite von ihrer Vorschau braucht** — und mehr nicht.
 *
 * `ui/PageMenu.ts` ist DOM und sonst nichts; das ist der Grund, warum ein Test
 * sie ohne Browser aufschlagen kann. Eine Schicht aus three.js darin hätte das
 * aufgegeben. Also steht hier die Schnittstelle, und die Seite kennt nur sie:
 * Sie hängt die Vorschau in ihr eigenes DOM, sagt ihr nach jedem Neubau,
 * welche Kacheln dastehen, und sagt ihr, wenn sie zugeht. Wer das erfüllt, darf
 * dahinter zeichnen, wie er will — im Spiel tut es `ui/PagePreviews.ts`, im
 * Test eine Attrappe aus zehn Zeilen.
 */
export interface PagePreviewLayer {
  /**
   * Einhängen: `stage` ist der Rahmen, in dem die Leinwand liegt, `list` der
   * scrollende Kasten mit den Kacheln. `onChange` meldet, dass ein Modell
   * angekommen ist — die Seite zeichnet dann neu und lässt die Ikone weg.
   */
  mount(stage: HTMLElement, list: HTMLElement, onChange: () => void): void;
  /** Nach jedem Neubau der Liste: welche Seite, und welche Kacheln stehen da. */
  observe(page: string, boxes: HTMLElement[]): void;
  /** Ob zu dieser Id schon ein Modell dasteht. */
  has(id: string): boolean;
  /** Das Menü ging auf oder zu — dazwischen läuft keine Schleife. */
  setOpen(open: boolean): void;
  /** Die Brille ist auf: Dort zeigt das Handgelenk die Modelle, nicht die Seite. */
  setPresenting(on: boolean): void;
  dispose(): void;
}
