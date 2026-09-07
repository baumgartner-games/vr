/**
 * **Was auf einem Schild steht** — von der getippten Zeile zum Absatz.
 *
 * Ein Schild in einer Lobby trägt selten einen Satz. Es trägt eine
 * Überschrift, drei Punkte darunter und vielleicht ein Bild — also genau das,
 * wofür Markdown erfunden wurde. Hier steht die kleine Teilmenge davon, die
 * ein Schild braucht, und sie ist **selbst geschrieben und nicht geladen**:
 *
 * - Eine Markdown-Bibliothek gibt HTML zurück, und HTML ist in einer
 *   WebXR-Szene kein Bild. Was gezeichnet wird, ist eine Leinwand
 *   (`CanvasTexture`) — der Umweg über `foreignObject` in einem SVG malt in
 *   der Brille entweder gar nicht oder verfärbt sich beim ersten fremden
 *   Bild, weil die Leinwand dann „vergiftet" ist.
 * - Was hier steht, sind **Daten**: Blöcke mit Textstücken. Die Umbrechung
 *   (`signLayout.ts`) und das Zeichnen (`SignBoard.ts`) sind zwei weitere
 *   Schritte, und nur der letzte kennt eine Leinwand. Deshalb ist alles bis
 *   dorthin ohne Brille prüfbar.
 *
 * Der Sprachumfang ist bewusst klein: Überschriften, Aufzählungen, Zitat,
 * Trennlinie, Code, Bild — und in der Zeile fett, kursiv, Code und Links.
 * Alles, was hier nicht steht, bleibt einfach stehen, wie es getippt wurde.
 * Ein Schild, das ein Zeichen verschluckt, ist schlimmer als eines, das ein
 * Sternchen zeigt.
 */

/** Ein Stück Text in einer Zeile, mit dem, was daran besonders ist. */
export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  /** Ziel eines Links — gezeichnet wird der Text, nicht die Adresse. */
  link?: string;
}

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; runs: Run[] }
  | { kind: 'text'; runs: Run[] }
  /** Ein Punkt einer Aufzählung; `marker` ist der Punkt oder die Nummer. */
  | { kind: 'list'; marker: string; runs: Run[] }
  | { kind: 'quote'; runs: Run[] }
  /** Eine Zeile Code — im Block wird nichts mehr in der Zeile gedeutet. */
  | { kind: 'code'; text: string }
  | { kind: 'rule' }
  | { kind: 'image'; url: string; alt: string }
  /** Eine Leerzeile. Sie trägt nichts, aber sie trennt. */
  | { kind: 'gap' };

/** Obergrenzen, damit ein fremdes Schild nicht die ganze Bildrate frisst. */
export const MAX_SIGN_CHARS = 6000;
export const MAX_SIGN_BLOCKS = 400;

export interface ParseOptions {
  /** Aus heißt: jede Zeile ist eine Zeile, Sternchen sind Sternchen. */
  markdown?: boolean;
}

/**
 * Zerlegt den getippten Text in Blöcke.
 *
 * Ohne Markdown ist das Ergebnis so langweilig, wie es aussieht — eine Zeile
 * pro Zeile —, und genau das ist der Sinn des Schalters: Wer eine Liste von
 * Namen mit `*` davor aufschreibt, will keine Aufzählung, sondern Sternchen.
 */
export function parseSign(text: string, options: ParseOptions = {}): Block[] {
  const source = text.slice(0, MAX_SIGN_CHARS).replace(/\r\n?/g, '\n');
  const lines = source.split('\n');
  const blocks: Block[] = [];
  if (!options.markdown) {
    for (const line of lines) {
      if (blocks.length >= MAX_SIGN_BLOCKS) break;
      blocks.push(line.trim() ? { kind: 'text', runs: [{ text: line }] } : { kind: 'gap' });
    }
    return blocks;
  }

  let fenced = false;
  for (const raw of lines) {
    if (blocks.length >= MAX_SIGN_BLOCKS) break;
    const line = raw.replace(/\s+$/, '');
    const trimmed = line.trim();

    // Der Zaun um einen Codeblock. Innerhalb wird nichts gedeutet — das ist
    // der ganze Zweck eines Codeblocks.
    if (trimmed.startsWith('```')) {
      fenced = !fenced;
      continue;
    }
    if (fenced) {
      blocks.push({ kind: 'code', text: line });
      continue;
    }

    if (!trimmed) {
      blocks.push({ kind: 'gap' });
      continue;
    }
    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      blocks.push({ kind: 'rule' });
      continue;
    }

    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(trimmed);
    if (image) {
      blocks.push({ kind: 'image', alt: image[1]!, url: image[2]! });
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({
        kind: 'heading',
        level: heading[1]!.length as 1 | 2 | 3,
        runs: parseInline(heading[2]!),
      });
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(trimmed);
    if (quote) {
      blocks.push({ kind: 'quote', runs: parseInline(quote[1]!) });
      continue;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      blocks.push({ kind: 'list', marker: '•', runs: parseInline(bullet[1]!) });
      continue;
    }

    const numbered = /^(\d{1,3})[.)]\s+(.*)$/.exec(trimmed);
    if (numbered) {
      blocks.push({ kind: 'list', marker: `${numbered[1]}.`, runs: parseInline(numbered[2]!) });
      continue;
    }

    blocks.push({ kind: 'text', runs: parseInline(line) });
  }
  return blocks;
}

/**
 * Die Auszeichnungen **innerhalb** einer Zeile.
 *
 * Von Hand gelesen und nicht mit einem Ausdruck über die ganze Zeile: Ein
 * regulärer Ausdruck, der geschachtelte Sternchen greifen soll, wird entweder
 * falsch oder langsam, und beides bemerkt man erst an einem langen Schild.
 * Was nicht schließt, bleibt stehen, wie es getippt wurde — ein einzelnes
 * Sternchen ist ein Sternchen.
 */
export function parseInline(text: string): Run[] {
  const runs: Run[] = [];
  let plain = '';
  let index = 0;

  const flush = (): void => {
    if (plain) runs.push({ text: plain });
    plain = '';
  };
  const push = (run: Run): void => {
    flush();
    if (run.text) runs.push(run);
  };

  while (index < text.length) {
    const rest = text.slice(index);

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
    if (link) {
      push({ text: link[1]!, link: link[2]! });
      index += link[0].length;
      continue;
    }

    const code = /^`([^`]+)`/.exec(rest);
    if (code) {
      push({ text: code[1]!, code: true });
      index += code[0].length;
      continue;
    }

    const bold = /^\*\*([^*]+)\*\*/.exec(rest);
    if (bold) {
      push({ text: bold[1]!, bold: true });
      index += bold[0].length;
      continue;
    }

    const italic = /^(?:\*([^*]+)\*|_([^_]+)_)/.exec(rest);
    if (italic) {
      push({ text: italic[1] ?? italic[2]!, italic: true });
      index += italic[0].length;
      continue;
    }

    plain += text[index];
    index++;
  }
  flush();
  return runs.length > 0 ? runs : [{ text: '' }];
}

/** Der Text ohne alles — für die Zeile im Menü und für Meldungen. */
export function signSummary(text: string, limit = 40): string {
  const first =
    text
      .split('\n')
      .map((line) => line.replace(/^[#>\-*+\s]+/, '').trim())
      .find((line) => line.length > 0) ?? '';
  return first.length > limit ? `${first.slice(0, limit - 1)}…` : first;
}
