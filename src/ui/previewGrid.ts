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
 * **Der scrollende Kasten, so wie die Vorschau ihn sieht.**
 *
 * `rect` ist sein sichtbarer Ausschnitt im Fenster, gemessen an der
 * **Innenkante** (`clientWidth`/`clientHeight` an der linken oberen Ecke des
 * Inhalts) — dieselbe Kante, an der auch die Leinwand darin sitzt. `scrollTop`
 * und `content` (`scrollHeight`) sagen, wo in seinem Inhalt dieser Ausschnitt
 * gerade steht und wie lang der Inhalt insgesamt ist.
 */
export interface ListView {
  rect: Rect;
  scrollTop: number;
  content: number;
}

/**
 * **Das Blatt**: die Leinwand, im Inhalt des Kastens verankert — `top` sind
 * Inhaltskoordinaten (also unabhängig davon, wie weit gerade gescrollt ist),
 * `height` ihre Höhe in Bildpunkten.
 */
export interface Sheet {
  top: number;
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
 * **Wie weit das Blatt über den sichtbaren Ausschnitt hinaussteht**, als
 * Anteil seiner Höhe — oben wie unten.
 *
 * Der Rand ist kein Luxus, sondern der Puffer gegen genau das, was diese
 * Datei sonst nicht in den Griff bekommt: Zwischen dem Bild, in dem gerechnet
 * wurde, und dem Bild, das der Compositor zeigt, scrollt der Finger weiter.
 * Was in dieser Zeit neu ins Bild rutscht, ist noch gezeichnet, weil das Blatt
 * dort schon hinreicht. Vier Zehntel sind bei einem Telefonmenü rund 230
 * Bildpunkte — mehr, als ein Schwung zwischen zwei Bildern schafft, und
 * trotzdem eine Leinwand, die kleiner bleibt als das Doppelte des Fensters.
 */
export const PREVIEW_OVERSCAN = 0.4;

/**
 * **Wo das Blatt im Inhalt liegt** — und wann es umgehängt wird.
 *
 * Die Leinwand liegt **im** scrollenden Kasten und wird deshalb vom
 * Compositor mitbewegt, genau wie die Kacheln (siehe `ui/PagePreviews.ts`).
 * Sie ist aber nicht so hoch wie der ganze Inhalt — sechzig Kacheln sind
 * siebentausend Bildpunkte, und ein Zeichenpuffer dieser Höhe ist auf einem
 * Telefon weder erlaubt noch bezahlbar. Sie ist ein **Fenster**: der
 * sichtbare Ausschnitt plus `PREVIEW_OVERSCAN` an jedem Ende.
 *
 * Umgehängt wird erst, wenn der Ausschnitt dem Rand nahe kommt: Ein Blatt,
 * das bei jedem Bild ein Stück weiterrückt, schriebe bei jedem Bild eine neue
 * Verschiebung in den Stil, und das ist die Arbeit, die man hier gerade
 * losgeworden ist. Der Sprung selbst ist unsichtbar, denn er passiert in
 * demselben Bild, in dem die Modelle ihre neuen Plätze auf dem Blatt bekommen.
 *
 * Zurück kommt das übergebene Blatt selbst, solange es noch passt — der
 * Aufrufer erkennt am Vergleich, ob sich etwas geändert hat.
 */
export function previewSheet(view: ListView, current: Sheet | null): Sheet {
  const shown = Math.max(view.rect.height, 0);
  const margin = shown * PREVIEW_OVERSCAN;
  const content = Math.max(view.content, shown);
  // Nie höher als der Inhalt: Sonst wüchse der scrollbare Bereich um den
  // Überstand, und die Liste hätte unten Platz, in dem nichts steht.
  // Ganze Bildpunkte, und das hat einen Grund: `scrollHeight` kommt gerundet
  // aus dem DOM. Ein Blatt mit Nachkommastellen ragte sonst ein Haar über den
  // Inhalt hinaus, machte den Kasten dadurch länger — und wäre beim nächsten
  // Bild wieder zu lang.
  const height = Math.floor(Math.min(content, shown + 2 * margin));
  const last = Math.max(content - height, 0);
  const top = Math.floor(Math.min(Math.max(view.scrollTop - margin, 0), last));
  if (current && current.height === height && Math.abs(current.top - top) <= margin / 2) {
    return current;
  }
  return { top, height };
}

/**
 * Wo das Modell einer Kachel auf dem Blatt steht — oder `null`, wenn die
 * Kachel gar nicht zu sehen ist.
 *
 * Gemessen wird in **Inhaltskoordinaten** des Kastens, abzüglich der Stelle,
 * an der das Blatt hängt: `x`/`y` sagen, wo das Modell auf der Leinwand
 * gezeichnet wird, und die Leinwand scrollt mit. Deshalb steht hier `scrollTop`
 * in der Rechnung, obwohl das Ergebnis nicht vom Scrollen abhängt — die beiden
 * heben sich auf, solange das Blatt hängen bleibt.
 *
 * Gefragt wird trotzdem nur nach **sichtbaren** Kacheln: Nur die bekommen ein
 * Modell, und was hinausscrollt, gibt seines wieder her. Eine halb sichtbare
 * bekommt ihren Platz und wird ganz gezeichnet; abgeschnitten wird sie nicht
 * mehr vom Rand der Leinwand, sondern vom scrollenden Kasten selbst, und das
 * ist der Schnitt, den auch die Kachel bekommt.
 */
export function previewSlot(view: ListView, sheet: Sheet, cell: Rect): Slot | null {
  const list = view.rect;
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
    y: cell.top - list.top + view.scrollTop - sheet.top + cell.height / 2,
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
 * Sie reicht ihren scrollenden Kasten hinüber, sagt ihr nach jedem Neubau,
 * welche Kacheln dastehen, und sagt ihr, wenn sie zugeht. Wer das erfüllt, darf
 * dahinter zeichnen, wie er will — im Spiel tut es `ui/PagePreviews.ts`, im
 * Test eine Attrappe aus zehn Zeilen.
 */
export interface PagePreviewLayer {
  /**
   * Einhängen: `box` ist der **scrollende** Kasten — die Leinwand kommt
   * hinein und scrollt mit, die Kacheln stehen darin. `onChange` meldet, dass
   * ein Modell angekommen ist; die Seite zeichnet dann neu und lässt die Ikone
   * weg.
   */
  mount(box: HTMLElement, onChange: () => void): void;
  /** Nach jedem Neubau der Liste: welche Seite, und welche Kacheln stehen da. */
  observe(page: string, boxes: HTMLElement[]): void;
  /** Ob zu dieser Id schon ein Modell dasteht. */
  has(id: string): boolean;
  /** Das Menü ging auf oder zu — dazwischen läuft keine Schleife. */
  setOpen(open: boolean): void;
  /** Die Brille ist auf: Dort zeigt das Handgelenk die Modelle, nicht die Seite. */
  setPresenting(on: boolean): void;
  /**
   * **Die große Vorschau der Detailseite aufschlagen** — oder `null`, wenn
   * hier niemand zeichnen kann (kein WebGL, keine Fabrik, keine Adresse).
   *
   * Die Seite gibt nur den Kasten her und bekommt eine Steuerung zurück; was
   * darin geschieht — Leinwand, Licht, Mischer, Gitter, Hülle, und die Gesten
   * darauf —, geht sie nichts an. Zugemacht wird über `dispose` der Steuerung
   * und nicht über einen zweiten Aufruf hier: Wer eine Seite verlässt, räumt
   * das weg, was er selbst aufgemacht hat.
   */
  detail(request: DetailRequest): DetailView | null;
  dispose(): void;
}

/** Was die Seite der Vorschau über ihre Detailseite sagt. */
export interface DetailRequest {
  /** Der Kasten, in den die Leinwand kommt — er gibt auch die Größe vor. */
  readonly host: HTMLElement;
  /** Welches Modell (dieselbe Id wie `MenuEntry.preview`). */
  readonly id: string;
  /**
   * **Was sich erst am geladenen Modell messen lässt**, nachgereicht.
   *
   * Gerufen, sobald das Modell da ist — und noch einmal, wenn die Bewegungen
   * einer Figur nachkommen. Die Seite zeichnet daraufhin ihren Steckbrief neu;
   * bis dahin steht dort, was schon im Verzeichnis stand.
   */
  onFacts(facts: DetailFacts): void;
}

/** Was die Vorschau am Modell selbst abliest. */
export interface DetailFacts {
  /** Die Kantenlängen in **Metern** — so groß wird das Ding in der Welt. */
  readonly size?: readonly [number, number, number];
  /** Wie viele Dreiecke darin stecken. */
  readonly triangles?: number;
  /** Die Namen aller Bewegungen, die es dazu gibt. */
  readonly clips?: readonly string[];
  /** Ob noch etwas unterwegs ist — die Bewegungen einer Figur kommen später. */
  readonly loading?: boolean;
}

/** Die Schalter der Detailseite, so wie die Seite sie führt. */
export interface DetailOptions {
  /** Ein Gitter auf Höhe des tiefsten Punktes — wo das Ding steht. */
  readonly floor: boolean;
  /** Die Hülle als Kasten (`THREE.Box3Helper`). */
  readonly bounds: boolean;
  /** Welche Bewegung läuft, oder `null` für „keine". */
  readonly clip: string | null;
}

/** Die Steuerung einer offenen Detailvorschau. */
export interface DetailView {
  /** Der Stand der Schalter — die Seite hält ihn und schiebt ihn hierher. */
  set(options: DetailOptions): void;
  /** Leinwand, Mischer, Gitter, Hülle und die Schleife: alles weg. */
  dispose(): void;
}
