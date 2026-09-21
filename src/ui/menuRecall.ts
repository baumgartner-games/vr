/**
 * **Wo im Katalog man zuletzt stand** — über das Schließen des Menüs hinaus,
 * und über das Neuladen der Seite hinaus.
 *
 * Der Weg durchs Menü (`ui/menuNav.ts`) überlebt von sich aus jedes Zumachen:
 * Er liegt einmal da und wird von beiden Handgelenken und von der Seite
 * gelesen. Ein **Neuladen** überlebt er nicht, und genau das fiel im Regal
 * auf — dort ist der Weg lang (drei Wege hinein, Paket, Ordner, Fach), und
 * ihn nach jedem Neustart noch einmal zu gehen, ist die Arbeit, die man sich
 * mit einem Katalog gerade spart. Gewünscht war: „Es soll sich auch gemerkt
 * werden, in welchem Ordner/Kategorie/Scroll-Bereich ich bin, wenn ich das
 * Menü erneut öffne."
 *
 * Gemerkt wird **nur der Katalog** und nicht das ganze Menü. Eine Seite, die
 * nach dem Neuladen mitten in den Grafikeinstellungen aufgeht, wäre keine
 * Freundlichkeit, sondern ein Rätsel; ein Katalog dagegen ist ein Ort, an den
 * man zurückkommt. Und wer doch von vorn will, hat den Knopf im Kopf dafür
 * (`MenuEntry.home`).
 *
 * Kein DOM, kein three.js: was hier steht, ist eine Handvoll Zeichenketten in
 * `localStorage` — und was daraus für den Weg wird, steht in `menuNav.ts`.
 */

/** Wo der gemerkte Weg liegt — dieselbe Schreibweise wie überall (`bgvr.…`). */
const KEY = 'bgvr.katalog';

/**
 * **Wie viele Stufen gemerkt werden.**
 *
 * Acht, und das ist reichlich: Der tiefste Weg im Regal ist _Kategorien →
 * Schublade → Fach → Modell_, also vier. Die Grenze ist kein Platzproblem,
 * sondern eine Grenze gegen Unsinn aus dem Speicher — was von Hand oder von
 * einem alten Build dort steht, soll den Weg nicht ins Endlose verlängern.
 */
const MAX_STEPS = 8;

/** Wie lang eine einzelne Stufe höchstens sein darf. */
const MAX_STEP_LENGTH = 200;

/**
 * **Was sich der Weg merkt** — eine Wurzel und der Rest darunter.
 *
 * `root` ist die Id der Seite, unter der gemerkt wird (beim Regal `assets`).
 * Alles, was mit ihr anfängt, wird geschrieben; alles andere geht diesen
 * Zettel nichts an.
 */
export interface NavRecall {
  readonly root: string;
  /** Der gemerkte Weg **unterhalb** der Wurzel, ohne sie selbst. */
  read(): string[];
  write(rest: readonly string[]): void;
}

/**
 * **Nur Ids, und nur so viele, wie hier hingehören.**
 *
 * Was aus einem Speicher kommt, ist fremde Arbeit: Es kann von einem älteren
 * Build stammen, von Hand geändert sein oder gar nichts mit dem Menü zu tun
 * haben. Ein Weg, den es im Baum nicht gibt, ist danach trotzdem kein
 * Problem — er wird beim Aufschlagen gekürzt (`menuNav.prune`).
 */
export function cleanSteps(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const step of value) {
    if (typeof step !== 'string' || step.length === 0 || step.length > MAX_STEP_LENGTH) break;
    out.push(step);
    if (out.length >= MAX_STEPS) break;
  }
  return out;
}

/**
 * Der Zettel für den Katalog — oder `null`, wenn es keinen Speicher gibt.
 *
 * `null` ist kein Fehler: In einem privaten Fenster fängt das Regal eben nach
 * jedem Neuladen wieder bei der Frage an, und innerhalb einer Sitzung merkt
 * sich der Weg ohnehin alles selbst.
 */
export function catalogRecall(root = 'assets'): NavRecall | null {
  const store = storage();
  if (!store) return null;
  return {
    root,
    read(): string[] {
      try {
        const raw = store.getItem(KEY);
        return raw ? cleanSteps(JSON.parse(raw)) : [];
      } catch {
        // Kaputtes JSON ist wie keins: dann fängt der Katalog vorn an.
        return [];
      }
    },
    write(rest: readonly string[]): void {
      try {
        store.setItem(KEY, JSON.stringify(cleanSteps([...rest])));
      } catch {
        // Ein voller oder gesperrter Speicher kostet hier nichts.
      }
    },
  };
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Zugriff kann werfen (gesperrte Seite) — siehe `ui/pageCols.ts`.
    return null;
  }
}
