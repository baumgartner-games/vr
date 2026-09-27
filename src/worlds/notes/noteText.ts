/**
 * **Was auf einem Zettel steht** — und wie es auf ihn passt. Reine Rechnung,
 * ohne Leinwand: Gemessen wird von außen (`measure`), im Spiel mit der
 * Schrift der Leinwand (`notePost.ts`), im Test mit gezählten Buchstaben.
 *
 * Ein Zettel ist kein Schild (`worlds/signs/`): kein Markdown, keine
 * Überschriften, kein Rollen. Er trägt ein paar Worte — _„Kartoffel-Vorrat
 * hier"_ —, und die sollen **so groß wie möglich** darauf stehen, denn gelesen
 * wird er meist von oben, aus der Höhe des Krans.
 */

/** Mehr als das ist kein Zettel mehr, sondern ein Aushang. */
export const NOTE_MAX_CHARS = 200;

/**
 * **Den getippten Text aufräumen**: Ränder weg, höchstens eine Leerzeile am
 * Stück, und nicht länger als `NOTE_MAX_CHARS`. Leer heißt: kein Text — und
 * ein Zettel ohne Text wird weggeworfen (`PortalWorld.writeNote`).
 */
export function cleanNoteText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, NOTE_MAX_CHARS)
    .trim();
}

/** Wie der Text auf dem Zettel steht: Zeilen und die Schriftgröße dazu. */
export interface NoteFit {
  readonly lines: readonly string[];
  /** Schriftgröße in Pixeln der Leinwand. */
  readonly size: number;
}

/**
 * **Umbrechen in eine Breite** — Wort für Wort, und ein Wort, das allein
 * breiter ist als die Zeile, wird mitten im Wort getrennt.
 *
 * @param measure Breite eines Stücks Text bei dieser Schriftgröße
 */
export function wrapNote(text: string, width: number, measure: (text: string) => number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ').filter((one) => one.length > 0)) {
      const tried = line ? `${line} ${word}` : word;
      if (measure(tried) <= width) {
        line = tried;
        continue;
      }
      if (line) out.push(line);
      line = '';
      // Ein Wort, das allein nicht passt, wird zerlegt — lieber getrennt als
      // über den Rand hinaus.
      let rest = word;
      while (measure(rest) > width && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && measure(rest.slice(0, cut)) > width) cut -= 1;
        out.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    out.push(line);
  }
  return out;
}

/**
 * **Die größte Schrift, bei der alles auf den Zettel passt** — von `max`
 * abwärts in Schritten, bis Breite und Höhe reichen, und am liebsten ohne ein
 * Wort zu trennen. Passt es auch bei `min` nicht, wird bei `min`
 * abgeschnitten, mit `…` in der letzten Zeile.
 *
 * @param measure Breite eines Stücks Text bei dieser Schriftgröße
 * @param lineHeight wie hoch eine Zeile ist, als Vielfaches der Schrift
 */
export function fitNote(
  text: string,
  box: { readonly width: number; readonly height: number },
  measure: (text: string, size: number) => number,
  options: { readonly max?: number; readonly min?: number; readonly lineHeight?: number } = {},
): NoteFit {
  const max = options.max ?? 120;
  const min = options.min ?? 28;
  const lineHeight = options.lineHeight ?? 1.15;
  // Erst ohne ein Wort zu trennen — „Kass / e" in großer Schrift ist
  // schlechter als „Kasse" eine Nummer kleiner —, dann auch mit.
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  for (const split of [false, true]) {
    for (let size = max; size >= min; size -= 4) {
      if (!split && words.some((word) => measure(word, size) > box.width)) continue;
      const lines = wrapNote(text, box.width, (part) => measure(part, size));
      if (lines.length * size * lineHeight <= box.height) return { lines, size };
    }
  }
  const lines = wrapNote(text, box.width, (part) => measure(part, min));
  const room = Math.max(1, Math.floor(box.height / (min * lineHeight)));
  if (lines.length <= room) return { lines, size: min };
  const kept = lines.slice(0, room);
  kept[room - 1] = `${kept[room - 1]!.replace(/.$/, '')}…`;
  return { lines: kept, size: min };
}
