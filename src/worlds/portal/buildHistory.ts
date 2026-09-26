/**
 * **Rückgängig und Wiederholen im _Baukasten_** — der Stapel, reine Rechnung.
 *
 * Gewünscht war eine Werkzeugleiste mit _Rückgängig/Wiederholen_, und bis
 * dahin gab es keines von beiden: Wer im Baukasten ein Bild an die falsche
 * Wand hängte, holte die Abrissbombe, zielte, riss ab und nahm das Bild neu
 * aus dem Regal. Jetzt merkt sich die Welt jeden Schritt — **was** (die
 * Adresse im Regal) und **wo** (Punkt und Drehung) — und nichts sonst.
 *
 * **Keine Verweise auf Körper, nur Lagen.** Ein Stück, das rückgängig
 * gemacht und dann wiederholt wird, ist ein **neues** Stück mit neuer Id im
 * Netz; ein Stapel, der sich den alten Körper merkte, zeigte danach ins Leere.
 * Gesucht wird deshalb wie beim Einfügen einer Liste der Weltänderungen
 * (`PortalWorld.placeModelAt`): dieselbe Sorte an (fast) derselben Stelle.
 *
 * **Drei Sorten Schritt**, und jede hat ihr Gegenteil (`invertStep`):
 * Hinstellen ↔ Abreißen, Umstellen ↔ Zurückstellen. Ein Pinselstrich oder eine
 * Fläche ist **ein** Schritt aus vielen (`group`) — wer zwanzig Kacheln Boden
 * zieht und sich vertan hat, will einmal drücken und nicht zwanzigmal.
 */

/** Wo ein Stück steht: Mitte in Weltmetern, Drehung um die Hochachse in Bogenmaß. */
export interface BuildPose {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  /**
   * Ob es dort **fest** stand — an der Wand, auf einem Tisch. Dann wird es beim
   * Nachspielen wieder fest hingestellt, sonst fällt es das letzte Stück.
   */
  readonly fixed?: boolean;
}

/** Ein Stück aus dem Regal an einer Stelle. */
export interface BuildItem {
  /** Die Adresse im Regal, z. B. `furniture-bits/table_medium.glb`. */
  readonly path: string;
  readonly pose: BuildPose;
}

export type BuildStep =
  | { readonly kind: 'add'; readonly item: BuildItem }
  | { readonly kind: 'remove'; readonly item: BuildItem }
  | {
      readonly kind: 'move';
      readonly path: string;
      readonly from: BuildPose;
      readonly to: BuildPose;
    }
  | { readonly kind: 'group'; readonly steps: readonly BuildStep[] };

/** Wie viele Schritte zurück es höchstens geht — danach fällt der älteste weg. */
export const HISTORY_LIMIT = 100;

/** Wie weit ein Stück von seiner gemerkten Lage stehen darf und trotzdem gemeint ist, in Metern. */
export const MATCH_REACH = 0.35;

/**
 * **Das Gegenteil eines Schritts** — was `undo` tun muss, damit die Welt
 * wieder so aussieht wie vorher. Eine Gruppe wird rückwärts aufgelöst: Wer
 * erst einen Tisch und dann eine Tasse darauf stellt, nimmt beim Rückgängig
 * erst die Tasse weg.
 */
export function invertStep(step: BuildStep): BuildStep {
  switch (step.kind) {
    case 'add':
      return { kind: 'remove', item: step.item };
    case 'remove':
      return { kind: 'add', item: step.item };
    case 'move':
      return { kind: 'move', path: step.path, from: step.to, to: step.from };
    case 'group':
      return { kind: 'group', steps: [...step.steps].reverse().map(invertStep) };
  }
}

/**
 * **Ob ein Umstellen eines ist** — ein Stück, das an seinen alten Platz
 * zurückgestellt wird, hat nichts geändert und kommt nicht auf den Stapel
 * (dieselbe Regel wie in der Liste der Weltänderungen).
 */
export function samePose(a: BuildPose, b: BuildPose): boolean {
  const turn = Math.abs(normalAngle(a.yaw - b.yaw));
  return Math.hypot(a.x - b.x, a.z - b.z) < 0.02 && Math.abs(a.y - b.y) < 0.05 && turn < 0.01;
}

function normalAngle(angle: number): number {
  const full = Math.PI * 2;
  return ((((angle + Math.PI) % full) + full) % full) - Math.PI;
}

/**
 * **Welches von mehreren Stücken gemeint ist** — das nächste innerhalb von
 * `MATCH_REACH`, oder `-1`. Gemessen wird im Raum und nicht nur am Boden:
 * Zwei Tassen übereinander auf einem Regal sind zwei Stücke.
 */
export function nearestAt(
  spots: readonly { readonly x: number; readonly y: number; readonly z: number }[],
  pose: BuildPose,
): number {
  let best = -1;
  let bestDistance = MATCH_REACH;
  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i]!;
    const distance = Math.hypot(spot.x - pose.x, spot.y - pose.y, spot.z - pose.z);
    if (distance <= bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

/**
 * **Der Stapel selbst.** `push` legt einen getanen Schritt oben auf und
 * vergisst alles, was wiederholt werden könnte — wer nach einem Rückgängig
 * etwas Neues baut, hat einen neuen Zweig angefangen. `undo` und `redo` geben
 * den Schritt zurück, den die Welt jetzt **ausführen** muss (bei `undo` also
 * schon umgedreht), und `null`, wenn es nichts gibt.
 *
 * Solange eine Gruppe offen ist (`begin` … `end`), sammeln sich die Schritte
 * darin; eine leere Gruppe kommt gar nicht erst auf den Stapel, eine mit einem
 * Schritt als dieser eine.
 */
export class BuildHistory {
  private readonly done: BuildStep[] = [];
  private readonly undone: BuildStep[] = [];
  private open: BuildStep[] | null = null;
  private depth = 0;

  constructor(private readonly limit = HISTORY_LIMIT) {}

  get canUndo(): boolean {
    return this.done.length > 0;
  }

  get canRedo(): boolean {
    return this.undone.length > 0;
  }

  /** Wie viele Schritte zurück es gerade geht. */
  get size(): number {
    return this.done.length;
  }

  push(step: BuildStep): void {
    if (step.kind === 'move' && samePose(step.from, step.to)) return;
    if (step.kind === 'group' && !step.steps.length) return;
    if (this.open) {
      this.open.push(step);
      return;
    }
    this.done.push(step);
    if (this.done.length > this.limit) this.done.splice(0, this.done.length - this.limit);
    this.undone.length = 0;
  }

  /** Eine Gruppe anfangen — geschachtelt zählt nur die äußerste. */
  begin(): void {
    this.depth += 1;
    this.open ??= [];
  }

  /** Die Gruppe schließen und als **einen** Schritt ablegen. */
  end(): void {
    if (this.depth === 0) return;
    this.depth -= 1;
    if (this.depth > 0 || !this.open) return;
    const steps = this.open;
    this.open = null;
    if (steps.length === 1) this.push(steps[0]!);
    else if (steps.length) this.push({ kind: 'group', steps });
  }

  /** Den obersten Schritt zurücknehmen — zurück kommt, was dafür zu tun ist. */
  undo(): BuildStep | null {
    const step = this.done.pop();
    if (!step) return null;
    this.undone.push(step);
    return invertStep(step);
  }

  /** Den zuletzt zurückgenommenen Schritt noch einmal tun. */
  redo(): BuildStep | null {
    const step = this.undone.pop();
    if (!step) return null;
    this.done.push(step);
    return step;
  }

  clear(): void {
    this.done.length = 0;
    this.undone.length = 0;
    this.open = null;
    this.depth = 0;
  }
}

/** Ein Schritt in Worten — für die Rückmeldung nach einem Druck auf _Rückgängig_. */
export function describeStep(step: BuildStep, label: (path: string) => string): string {
  switch (step.kind) {
    case 'add':
      return `${label(step.item.path)} gesetzt`;
    case 'remove':
      return `${label(step.item.path)} entfernt`;
    case 'move':
      return `${label(step.path)} verschoben`;
    case 'group':
      return `${step.steps.length} Schritte`;
  }
}
