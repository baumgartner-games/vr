import type { MenuEntry } from './menu';

/**
 * Wo im Menü man gerade ist — **einmal für beide Hände**.
 *
 * An jedem Handgelenk hängt dasselbe Menü, und bis hierher hatte jedes davon
 * seinen eigenen Merkzettel: welche Seite offen war und wie weit sie geblättert
 * war. Das fällt genau dann auf, wenn es weh tut. Man steht drei Ebenen tief in
 * den Werkzeug-Einstellungen, füllt sich die linke Hand — und muss das Menü nun
 * rechts aufmachen, weil links etwas drinliegt. Rechts fing es dann wieder ganz
 * oben an, und der ganze Weg war noch einmal zu gehen.
 *
 * Also liegt der Weg hier, an einer Stelle, und beide Panels lesen ihn. Ein
 * Menü zu öffnen heißt ab jetzt: dieselbe Seite, dieselbe Zeile, andere Hand.
 *
 * Der Weg ist eine Kette von **Ids**, keine Kette von Einträgen. Der Menübaum
 * wird bei jeder Änderung neu gebaut — eine Zeile zu drücken ist ja gerade das,
 * was ihre Beschriftung ändert —, und ein festgehaltener Eintrag wäre nach dem
 * ersten Tastendruck ein Gespenst. Ids überleben das.
 *
 * Kein three.js: was daraus für ein Panel wird, steht in `WristMenu.ts`.
 */
export class MenuNav {
  private steps: string[] = [];
  private readonly listeners = new Set<() => void>();
  /**
   * Wie weit jede Seite geblättert war, nach Id.
   *
   * Ebenfalls geteilt, und zwar aus demselben Grund: eine Seite an der anderen
   * Hand wieder ganz oben aufzuschlagen ist genau das Ärgernis, das die
   * geteilte Seite gerade beseitigt hat, nur eine Ebene kleiner.
   */
  private readonly scrolls = new Map<string, number>();

  /** Die Ids der Seiten unterhalb der obersten Ebene, von oben nach unten. */
  get path(): readonly string[] {
    return this.steps;
  }

  /** Wird nach jedem Wechsel gerufen — das andere Panel zieht dann nach. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Eine Ebene tiefer. */
  push(id: string): void {
    this.steps = [...this.steps, id];
    this.announce();
  }

  /** Eine Ebene zurück. Ganz oben passiert nichts. */
  pop(): void {
    if (this.steps.length === 0) return;
    this.steps = this.steps.slice(0, -1);
    this.announce();
  }

  /** Direkt auf einen Weg springen — das Untermenü aus einer Aktion heraus. */
  goTo(path: readonly string[]): void {
    if (samePath(this.steps, path)) return;
    this.steps = [...path];
    this.announce();
  }

  /**
   * Kürzt den Weg auf das, was es im Baum noch gibt — **ohne** zu melden.
   *
   * Still, weil das hier beim Neuaufbau des Baums läuft und beide Panels
   * ohnehin gleich neu zeichnen: eine Meldung wäre eine Schleife.
   */
  prune(entries: readonly MenuEntry[]): void {
    const walked = walkPath(entries, this.steps);
    if (!samePath(walked, this.steps)) this.steps = walked;
  }

  /** Wie weit eine Seite zuletzt geblättert war. */
  scrollOf(id: string): number {
    return this.scrolls.get(id) ?? 0;
  }

  /** Merkt sich, wo eine Seite steht. Still, wie `prune`. */
  setScroll(id: string, offset: number): void {
    this.scrolls.set(id, Math.max(0, Math.floor(offset)));
  }

  private announce(): void {
    for (const listener of this.listeners) listener();
  }
}

/**
 * Der Teil eines Weges, den es im Baum wirklich gibt.
 *
 * Eine Seite kann zwischen zwei Blicken verschwinden — die Peer-Liste leert
 * sich, eine Welt wird verlassen, ein Werkzeug fällt aus dem Regal. Der Weg
 * dorthin endet dann bei ihrer Elternseite, statt ins Leere zu zeigen oder den
 * Spieler wortlos auf die oberste Ebene zu werfen.
 */
export function walkPath(entries: readonly MenuEntry[], path: readonly string[]): string[] {
  const out: string[] = [];
  let level: readonly MenuEntry[] = entries;
  for (const id of path) {
    const entry = level.find((candidate) => candidate.id === id);
    if (!entry?.children) break;
    out.push(id);
    level = entry.children;
  }
  return out;
}

function samePath(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
