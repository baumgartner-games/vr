import { SEARCH_LIMIT, searchTerms } from '../../core/kaykitIndex';
import { kaykitEnglish } from '../../core/kaykitTerms';

/**
 * **Das Suchfeld des Katalogs** — wie im Modellregal (`core/kaykitIndex.
 * kaykitSearch`), nur über die Kacheln des Katalogs statt über viertausend
 * Dateien. Gewünscht: _„Den Katalog Menü mit einem Text Suchfeld ausstatten
 * wie bei modelregal Menü."_
 *
 * Dieselben Regeln wie dort: **Alle Wörter müssen vorkommen**, Umlaute werden
 * gefaltet (`käse` und `kase` finden die Käsekiste), und gesucht wird immer im
 * **ganzen** Katalog, nicht nur im offenen Ordner. Die Ordnernamen zählen mit:
 * `pizza` findet alles aus dem Ordner _Pizza_, `vorräte käse` die Käsekiste.
 * Und Englisch auch, über die Id und das Wörterbuch des Regals: `cheese` wie
 * `kiste` (→ `crate`).
 *
 * Rein, ohne Menü und ohne three.js — geprüft in `catalogSearch.test.ts`.
 */

/** **Eine Kachel, nach der gesucht werden kann.** */
export interface CatalogRow<T> {
  /**
   * Was die Kachel nimmt — das Element, die Datei, das Ding. Dasselbe Möbel
   * steht in mehreren Ordnern; in den Treffern steht es **einmal**, und die
   * Ordner aller seiner Kacheln zählen für die Suche.
   */
  readonly key: string;
  /** Die Beschriftung — ein Treffer darin zählt am meisten. */
  readonly name: string;
  /** Alles Übrige, was sie findbar macht: Ordner, Id, Adresse im Regal. */
  readonly words: string;
  /** Was in der Trefferliste steht. */
  readonly entry: T;
}

/** Name beginnt mit dem Wort, enthält es, trifft es übersetzt, oder nur im Rest. */
const HIT_NAME_START = 8;
const HIT_NAME_IN = 4;
const HIT_TERM = 3;
const HIT_WORDS = 1;

/** Ein Text als Folge gefalteter Wörter, mit Leerzeichen davor und danach. */
function folded(text: string): string {
  return ` ${searchTerms(text).join(' ')} `;
}

/**
 * **Die Treffer im Katalog** — nach Güte sortiert, bei Gleichstand in der
 * Reihenfolge des Katalogs, höchstens `limit`. Ein leerer Suchbegriff findet
 * nichts: dann steht die eigene Liste der Seite da (`MenuEntry.find`).
 */
export function catalogSearch<T>(
  rows: readonly CatalogRow<T>[],
  query: string,
  limit = SEARCH_LIMIT,
): T[] {
  const wanted = searchTerms(query).map((term) => ({ term, english: kaykitEnglish(term) }));
  if (wanted.length === 0) return [];
  const merged = new Map<string, { name: string; words: string; entry: T; order: number }>();
  for (const row of rows) {
    const known = merged.get(row.key);
    if (known) known.words += folded(row.words);
    else
      merged.set(row.key, {
        name: folded(row.name),
        words: folded(row.words),
        entry: row.entry,
        order: merged.size,
      });
  }
  const hits: { entry: T; score: number; order: number }[] = [];
  for (const row of merged.values()) {
    let score = 0;
    let all = true;
    for (const { term, english } of wanted) {
      if (row.name.includes(` ${term}`)) score += HIT_NAME_START;
      else if (row.name.includes(term)) score += HIT_NAME_IN;
      else if (english.some((word) => row.name.includes(word) || row.words.includes(word)))
        score += HIT_TERM;
      else if (row.words.includes(term)) score += HIT_WORDS;
      else {
        all = false;
        break;
      }
    }
    if (all) hits.push({ entry: row.entry, score, order: row.order });
  }
  hits.sort((a, b) => b.score - a.score || a.order - b.order);
  return hits.slice(0, Math.max(0, limit)).map((hit) => hit.entry);
}
