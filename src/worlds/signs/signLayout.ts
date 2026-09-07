import type { Block, Run } from './signMarkup';

/**
 * **Der Umbruch** — aus Blöcken werden Zeilen mit festen Plätzen.
 *
 * Zwischen „was da steht" (`signMarkup.ts`) und „wie es gezeichnet wird"
 * (`SignBoard.ts`) fehlt genau dieser Schritt, und er ist der einzige, in dem
 * gerechnet wird: Wie breit ist ein Wort, passt es noch in die Zeile, wie hoch
 * ist eine Überschrift, wie hoch wird das Ganze zusammen.
 *
 * Gemessen wird **von außen** (`measure`): Im Spiel ist das die Leinwand mit
 * ihrer Schrift, im Test eine Funktion, die Buchstaben zählt. Deshalb kann der
 * Umbruch ohne Browser geprüft werden — und deshalb ist die Höhe, aus der das
 * Rollen seine Grenzen zieht (`signScroll.ts`), keine geratene Zahl.
 */

/** Wie eine Schrift auszusehen hat — mehr braucht das Zeichnen nicht zu wissen. */
export interface RunStyle {
  /** Schriftgröße in Pixeln der Leinwand. */
  size: number;
  bold: boolean;
  italic: boolean;
  /** Feste Breite: Code. */
  mono: boolean;
  /** Welche der drei Farben: der Text selbst, der Akzent, das Gedämpfte. */
  tone: 'text' | 'accent' | 'muted';
}

/** Ein Stück Text mit seinem Platz in der Zeile. */
export interface LaidRun {
  text: string;
  /** Linke Kante, in Pixeln von der linken Kante der Textfläche. */
  x: number;
  width: number;
  style: RunStyle;
  link?: string;
}

export interface LaidLine {
  /** Oberkante der Zeile, in Pixeln von der Oberkante des Textes. */
  y: number;
  /** Die ganze Zeile samt Durchschuss. */
  height: number;
  /** Die Grundlinie, gemessen von der Oberkante der Zeile. */
  baseline: number;
  runs: LaidRun[];
  /** Eine Trennlinie statt Text. */
  rule?: boolean;
  /** Der senkrechte Balken eines Zitats. */
  quote?: boolean;
  /** Ein Bild statt Text — Breite und Höhe stehen schon fest. */
  image?: { url: string; alt: string; x: number; width: number; height: number };
}

export interface SignLayout {
  lines: LaidLine[];
  /** Wie hoch alles zusammen ist. Daran hängt, ob überhaupt gerollt wird. */
  height: number;
}

export interface LayoutOptions {
  /** Breite der Textfläche in Pixeln. */
  width: number;
  /** Die Grundschriftgröße in Pixeln; alles andere ist ein Vielfaches davon. */
  fontSize: number;
  align?: 'left' | 'center';
  /**
   * Wie breit dieser Text in dieser Schrift wird.
   *
   * Als Feld geschrieben und nicht als Methode: Sie wird hier aus dem
   * Optionsobjekt herausgelöst und einzeln aufgerufen, und eine Methode, die
   * man von ihrem Objekt trennt, verliert ihr `this`.
   */
  measure: (text: string, style: RunStyle) => number;
  /**
   * Breite geteilt durch Höhe eines Bildes — `null`, solange es noch lädt.
   *
   * Ein Bild, dessen Maße noch niemand kennt, bekommt trotzdem seinen Platz:
   * Ein Schild, das beim Laden des dritten Bildes dreimal umbricht, liest sich
   * wie ein Flackern. Wenn es da ist, wird neu umgebrochen — dann aber einmal.
   */
  imageAspect?: (url: string) => number | null;
}

/** Zeilenabstand als Vielfaches der Schriftgröße. */
const LINE = 1.32;
/** Größen der drei Überschriften, als Vielfaches der Grundgröße. */
const HEADING = [1.7, 1.36, 1.14] as const;
/** Luft über einer Überschrift und unter einem Absatz. */
const SPACE_ABOVE = 0.55;
const SPACE_BELOW = 0.18;
/** Wie weit eine Aufzählung und ein Zitat einrücken. */
const BULLET_INDENT = 1.5;
const QUOTE_INDENT = 0.9;
/** Ein Bild ohne bekannte Maße bekommt vorerst dieses Verhältnis. */
const IMAGE_FALLBACK_ASPECT = 16 / 9;
/** Und keines wird höher als das — sonst füllt ein Foto das ganze Schild. */
const IMAGE_MAX_HEIGHT = 0.62;

function styleOf(run: Run, size: number, tone: RunStyle['tone'] = 'text'): RunStyle {
  return {
    size,
    bold: run.bold === true,
    italic: run.italic === true,
    mono: run.code === true,
    tone: run.link ? 'accent' : run.code ? 'muted' : tone,
  };
}

/**
 * Bricht die Blöcke auf die Breite um.
 *
 * Was hier herauskommt, ist bereits fertig platziert: Jede Zeile weiß ihre
 * Oberkante, jedes Textstück seine linke Kante. Das Zeichnen setzt danach nur
 * noch die Rollhöhe davor.
 */
export function layoutSign(blocks: readonly Block[], options: LayoutOptions): SignLayout {
  const { width, fontSize, measure } = options;
  const centered = options.align === 'center';
  const lines: LaidLine[] = [];
  let y = 0;

  const emit = (
    runs: readonly Run[],
    size: number,
    indent: number,
    tone: RunStyle['tone'],
    extras: { quote?: boolean; marker?: string } = {},
  ): void => {
    const available = Math.max(1, width - indent);
    const wrapped = wrapRuns(runs, size, tone, available, measure);
    wrapped.forEach((line, index) => {
      const lineWidth = line.reduce((sum, run) => sum + run.width, 0);
      const offset = centered ? Math.max(0, (available - lineWidth) / 2) : 0;
      const placed: LaidRun[] = [];
      let x = indent + offset;
      // Der Punkt einer Aufzählung steht **vor** der Einrückung und nur an der
      // ersten Zeile — die zweite läuft unter dem Text weiter, nicht unter dem
      // Punkt. Das ist der ganze Grund für die Einrückung.
      if (index === 0 && extras.marker) {
        const markerStyle: RunStyle = {
          size,
          bold: false,
          italic: false,
          mono: false,
          tone: 'accent',
        };
        const markerWidth = measure(extras.marker, markerStyle);
        placed.push({
          text: extras.marker,
          x: Math.max(0, x - BULLET_INDENT * fontSize + 0.1 * fontSize),
          width: markerWidth,
          style: markerStyle,
        });
      }
      for (const run of line) {
        placed.push({ ...run, x });
        x += run.width;
      }
      const height = size * LINE;
      lines.push({
        y,
        height,
        baseline: size,
        runs: placed,
        ...(extras.quote ? { quote: true } : {}),
      });
      y += height;
    });
  };

  blocks.forEach((block, index) => {
    switch (block.kind) {
      case 'gap':
        y += fontSize * 0.6;
        break;
      case 'rule': {
        const height = fontSize * 0.9;
        lines.push({ y, height, baseline: height / 2, runs: [], rule: true });
        y += height;
        break;
      }
      case 'heading': {
        const size = fontSize * HEADING[block.level - 1]!;
        if (index > 0) y += fontSize * SPACE_ABOVE;
        emit(block.runs, size, 0, block.level === 1 ? 'accent' : 'text');
        y += fontSize * SPACE_BELOW;
        break;
      }
      case 'list':
        emit(block.runs, fontSize, BULLET_INDENT * fontSize, 'text', { marker: block.marker });
        break;
      case 'quote':
        emit(block.runs, fontSize, QUOTE_INDENT * fontSize, 'muted', { quote: true });
        break;
      case 'code': {
        const style: RunStyle = {
          size: fontSize * 0.92,
          bold: false,
          italic: false,
          mono: true,
          tone: 'muted',
        };
        const height = style.size * LINE;
        lines.push({
          y,
          height,
          baseline: style.size,
          runs: [{ text: block.text, x: 0, width: measure(block.text, style), style }],
        });
        y += height;
        break;
      }
      case 'image': {
        const aspect = options.imageAspect?.(block.url) ?? IMAGE_FALLBACK_ASPECT;
        const safe = Number.isFinite(aspect) && aspect > 0.05 ? aspect : IMAGE_FALLBACK_ASPECT;
        let imageWidth = width;
        let imageHeight = imageWidth / safe;
        const maxHeight = width * IMAGE_MAX_HEIGHT;
        if (imageHeight > maxHeight) {
          imageHeight = maxHeight;
          imageWidth = imageHeight * safe;
        }
        const height = imageHeight + fontSize * 0.4;
        lines.push({
          y,
          height,
          baseline: height,
          runs: [],
          image: {
            url: block.url,
            alt: block.alt,
            x: centered ? Math.max(0, (width - imageWidth) / 2) : 0,
            width: imageWidth,
            height: imageHeight,
          },
        });
        y += height;
        break;
      }
      default:
        emit(block.runs, fontSize, 0, 'text');
        break;
    }
  });

  return { lines, height: y };
}

/**
 * Wörter in Zeilen — die eigentliche Arbeit.
 *
 * Ein Wort, das für sich allein zu breit ist (eine Adresse, ein Code), wird
 * **nicht** abgeschnitten und nicht gewaltsam umgebrochen: Es steht über den
 * Rand hinaus und wird beim Zeichnen an der Kante abgeschnitten. Eine URL
 * mitten im Wort zu trennen macht sie unlesbar, und unlesbar ist schlimmer als
 * zu lang.
 */
function wrapRuns(
  runs: readonly Run[],
  size: number,
  tone: RunStyle['tone'],
  available: number,
  measure: (text: string, style: RunStyle) => number,
): LaidRun[][] {
  const lines: LaidRun[][] = [];
  let line: LaidRun[] = [];
  let used = 0;

  const flush = (): void => {
    lines.push(line);
    line = [];
    used = 0;
  };

  for (const run of runs) {
    const style = styleOf(run, size, tone);
    // Die Leerzeichen bleiben am Wort davor hängen: so trägt jedes Stück seine
    // eigene Breite, und am Zeilenende fällt der Zwischenraum einfach weg.
    const words = run.text.match(/\S+\s*|\s+/g) ?? [];
    for (const word of words) {
      const trimmed = word.replace(/\s+$/, '');
      const wordWidth = measure(word, style);
      const inkWidth = measure(trimmed, style);
      // Ein Zeilenanfang aus lauter Leerzeichen ist keiner.
      if (!trimmed && line.length === 0) continue;
      if (used + inkWidth > available && line.length > 0) flush();
      const last = line[line.length - 1];
      if (last && sameStyle(last.style, style) && last.link === run.link) {
        last.text += word;
        last.width += wordWidth;
      } else {
        line.push({
          text: word,
          x: 0,
          width: wordWidth,
          style,
          ...(run.link ? { link: run.link } : {}),
        });
      }
      used += wordWidth;
    }
  }
  flush();
  return lines;
}

function sameStyle(a: RunStyle, b: RunStyle): boolean {
  return (
    a.size === b.size &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.mono === b.mono &&
    a.tone === b.tone
  );
}
