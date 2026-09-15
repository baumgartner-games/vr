import { parseSign, type Block, type Run } from '../../signs/signMarkup';
import type { MenuEntry } from '../../../ui/menu';

/**
 * **Ein Aushang als Menüseite** — aus dem getippten Text werden Zeilen.
 *
 * Ein Schild trug bisher **eine** Zeile, und wer es benutzte, bekam sie als
 * Meldung am Handgelenk zu sehen: vier Sekunden, dann war sie weg. Damit ist
 * ein Schild ein Aufkleber und kein Aushang — ein Wegweiser mit drei Zielen,
 * eine Hausordnung, die Regeln eines Spiels passen nicht in vier Sekunden.
 *
 * Also wird der Text **aufgeschlagen**: Benutzen öffnet eine Seite im Menü
 * (`ui/PageMenu.ts` am Bildschirm, das Panel am Handgelenk in der Brille), und
 * dort steht er, so lange man will, mit Blättern und mit einem Zurück.
 *
 * **Markdown, und zwar dasselbe**, das die Schildwelt schon kann
 * (`worlds/signs/signMarkup.ts`): Überschriften, Aufzählungen, Zitate,
 * Trennlinien, Code. Nicht ein zweiter kleiner Dialekt daneben — der wäre nach
 * dem ersten Schild, das in beiden Welten hängt, ein Fehler.
 *
 * **Diese Datei ist reine Rechnung**: Text hinein, `MenuEntry[]` heraus, kein
 * three.js und kein DOM. Deshalb steht der Test daneben und prüft in
 * Millisekunden, was man sonst nur mit aufgesetzter Brille sieht.
 */

/** Wie viele Zeilen eine Seite höchstens bekommt. */
export const MAX_SIGN_ROWS = 120;

/** Die Textstücke einer Zeile zu einer Zeichenkette — Fett und Kursiv fallen weg. */
function flatten(runs: readonly Run[]): string {
  return runs
    .map((run) => run.text)
    .join('')
    .trim();
}

/** Das Ziel des ersten Links einer Zeile, falls sie einen hat. */
function firstLink(runs: readonly Run[]): string | undefined {
  return runs.find((run) => run.link)?.link;
}

/** Eine Zeile aus einem Block — oder `null`, wo ein Block keine hergibt. */
function rowOf(block: Block, index: number, accent: number): MenuEntry | null {
  const id = `sign:row:${index}`;
  switch (block.kind) {
    case 'heading': {
      const label = flatten(block.runs);
      if (!label) return null;
      // Nur die erste Ebene bekommt Farbe und Ikone: Ein Menü, in dem jede
      // zweite Zeile leuchtet, hebt nichts mehr hervor.
      return block.level === 1
        ? { id, label, accent, icon: 'sign' }
        : { id, label, accent: accent, sub: '' };
    }
    case 'text': {
      const label = flatten(block.runs);
      if (!label) return null;
      const link = firstLink(block.runs);
      return link ? { id, label, sub: link } : { id, label };
    }
    case 'list': {
      const label = flatten(block.runs);
      if (!label) return null;
      return { id, label: `${block.marker} ${label}` };
    }
    case 'quote': {
      const label = flatten(block.runs);
      if (!label) return null;
      return { id, label: `„${label}"` };
    }
    case 'code':
      return block.text.trim() ? { id, label: block.text } : null;
    case 'rule':
      // Eine Trennlinie ist keine Zeile mit Text, aber sie trennt — und ein
      // Menü ohne sie liest sich als eine einzige lange Liste.
      return { id, label: '———' };
    case 'image':
      // Ein Bild kann eine Menüzeile nicht zeigen; seine Beschriftung schon,
      // und die Adresse steht darunter. Besser als gar nichts zu sagen.
      return { id, label: block.alt || 'Bild', sub: block.url };
    case 'gap':
      return null;
  }
}

/**
 * Die Zeilen zu einem Aushang.
 *
 * @param markdown Aus heißt: jede Zeile ist eine Zeile, Sternchen sind
 *   Sternchen (`signMarkup.ParseOptions`).
 */
export function signRows(text: string, accent: number, markdown = true): MenuEntry[] {
  const rows: MenuEntry[] = [];
  parseSign(text, { markdown }).forEach((block, index) => {
    if (rows.length >= MAX_SIGN_ROWS) return;
    const row = rowOf(block, index, accent);
    if (row) rows.push(row);
  });
  // Ein leeres Schild ist ein Schild und kein Fehler — es sagt nur nichts.
  if (rows.length === 0) rows.push({ id: 'sign:row:0', label: '(nichts darauf)' });
  return rows;
}
