import type { MenuEntry } from './menu';
import type { NavRecall } from './menuRecall';

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
   * **Ein Weg, der noch nicht ganz gehbar ist.**
   *
   * Der gemerkte Katalogweg (`menuRecall.ts`) zeigt drei Ebenen tief in ein
   * Regal, dessen Verzeichnis in diesem Augenblick erst geholt wird
   * (`MenuEntry.onOpen`): Unter der Seite steht bis dahin nur „Lädt …", und
   * `prune` müsste den Weg kürzen und wäre ihn los. Also steht der ganze
   * Wunsch hier, bis er einmal wirklich dastand — und in der Zwischenzeit
   * zeigt das Panel so viel davon, wie es schon gibt.
   *
   * Nur für den gemerkten Weg, und das mit Absicht: Ein Wunsch, der jede
   * verschwundene Seite wiederkommen lässt, würde einen in die Seite eines
   * Mitspielers werfen, sobald der wieder auftaucht.
   */
  private pending: string[] | null = null;
  /**
   * Wie weit jede Seite geblättert war, nach Id.
   *
   * Ebenfalls geteilt, und zwar aus demselben Grund: eine Seite an der anderen
   * Hand wieder ganz oben aufzuschlagen ist genau das Ärgernis, das die
   * geteilte Seite gerade beseitigt hat, nur eine Ebene kleiner.
   */
  private readonly scrolls = new Map<string, number>();

  /**
   * @param recall wo ein Katalogweg über das Neuladen hinweg liegt, oder
   *               `null` — dann merkt sich der Weg nur diese Sitzung.
   */
  constructor(private readonly recall: NavRecall | null = null) {}

  /** Die Ids der Seiten unterhalb der obersten Ebene, von oben nach unten. */
  get path(): readonly string[] {
    return this.steps;
  }

  /** Wird nach jedem Wechsel gerufen — das andere Panel zieht dann nach. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Eine Ebene tiefer — **oder zurück dorthin, wo man im Katalog aufgehört
   * hat.**
   *
   * Von ganz oben in den Katalog hinein ist kein Schritt um eine Ebene,
   * sondern ein Wiederaufschlagen: Es geht dahin, wo der Zettel steht
   * (`menuRecall.ts`). Beim ersten Mal ist der leer, und dann ist es doch
   * wieder nur ein Schritt.
   */
  push(id: string): void {
    const rest = this.steps.length === 0 && this.recall?.root === id ? this.recall.read() : [];
    if (rest.length > 0) {
      this.pending = [id, ...rest];
      this.steps = this.pending;
    } else {
      this.pending = null;
      this.steps = [...this.steps, id];
    }
    this.remember();
    this.announce();
  }

  /** Eine Ebene zurück. Ganz oben passiert nichts. */
  pop(): void {
    if (this.steps.length === 0) return;
    this.pending = null;
    this.steps = this.steps.slice(0, -1);
    this.remember();
    this.announce();
  }

  /** Direkt auf einen Weg springen — das Untermenü aus einer Aktion heraus. */
  goTo(path: readonly string[]): void {
    if (samePath(this.steps, path)) return;
    this.pending = null;
    this.steps = [...path];
    this.remember();
    this.announce();
  }

  /**
   * Kürzt den Weg auf das, was es im Baum noch gibt — **ohne** zu melden.
   *
   * Still, weil das hier beim Neuaufbau des Baums läuft und beide Panels
   * ohnehin gleich neu zeichnen: eine Meldung wäre eine Schleife.
   */
  prune(entries: readonly MenuEntry[]): void {
    // Solange ein gemerkter Weg auf seine Seite wartet, wird **er** abgelaufen
    // und nicht das, was gerade davon übrig ist — sonst wäre er nach dem
    // ersten Neuaufbau weg.
    const wish = this.pending ?? this.steps;
    const walked = walkPath(entries, wish);
    if (this.pending && samePath(walked, this.pending)) this.pending = null;
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

  /**
   * **Aufgeschrieben wird nur der Katalog** — und nur dann, wenn man wirklich
   * darin steht. Wer danebensteht, ändert den Zettel nicht: Sonst hieße jeder
   * Blick in die Einstellungen, dass das Regal seine Stelle verliert.
   *
   * Nicht aus `prune` heraus: Dort ist der Weg vielleicht gerade gekürzt,
   * weil das Verzeichnis noch lädt, und ein gekürzter Weg ist keine
   * Entscheidung.
   */
  private remember(): void {
    const recall = this.recall;
    if (!recall || this.steps[0] !== recall.root) return;
    recall.write(this.steps.slice(1));
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
 *
 * **Eine Detailseite ist eine Seite ohne Kinder** (`MenuEntry.detail`): Sie
 * zeigt ein Modell und keine Liste, also endet der Weg auf ihr. Ohne diese
 * Zeile fiele der Steckbrief beim nächsten Neubau des Baums wieder zu — und
 * der wird zweimal die Sekunde gebaut.
 */
export function walkPath(entries: readonly MenuEntry[], path: readonly string[]): string[] {
  const out: string[] = [];
  let level: readonly MenuEntry[] = entries;
  for (const id of path) {
    const entry = findStep(entries, level, id);
    if (!entry) break;
    if (!entry.children) {
      if (entry.detail) out.push(id);
      break;
    }
    out.push(id);
    level = entry.children;
  }
  return out;
}

/**
 * **Ein Schritt auf dem Weg** — und er muss finden, was am Schirm zu sehen war.
 *
 * Zuerst unter den Kindern der Ebene, dann in ihren Fächern (`flatten`: „1–60"
 * steht am Schirm offen, die Kachel ist also scheinbar ein direktes Kind), und
 * für einen Steckbrief (`detail`) zuletzt im ganzen Baum. Das Letzte ist das
 * ⓘ eines Suchtreffers: Der Treffer liegt irgendwo in der Sammlung und nicht
 * unter der Seite, auf der gesucht wurde. Ohne diese beiden Umwege schnitt der
 * nächste Neubau des Baums den Schritt sofort wieder ab — und auf dem Telefon,
 * wo fast jeder Ordner mehr als sechzig Dateien hat, öffnete das ⓘ nie etwas.
 * Die Ids sind Adressen und damit eindeutig; das Suchen im ganzen Baum findet
 * also dasselbe Modell und nicht bloß eines mit demselben Namen.
 */
export function findStep(
  root: readonly MenuEntry[],
  level: readonly MenuEntry[],
  id: string,
): MenuEntry | undefined {
  const direct = level.find((candidate) => candidate.id === id);
  if (direct) return direct;
  for (const entry of level) {
    if (!entry.flatten || !entry.children) continue;
    const inside = entry.children.find((candidate) => candidate.id === id);
    if (inside) return inside;
  }
  return findDetail(root, id);
}

function findDetail(entries: readonly MenuEntry[], id: string): MenuEntry | undefined {
  for (const entry of entries) {
    if (entry.children) {
      const found = findDetail(entry.children, id);
      if (found) return found;
    } else if (entry.id === id && entry.detail) return entry;
  }
  return undefined;
}

function samePath(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
