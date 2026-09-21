import { BUILD_META, readBuildId } from './buildId';

/**
 * **Die Build-Nummer steht in der Seite und nicht im Programm** — und das ist
 * keine Geschmacksfrage, sondern 2,2 MB je Deploy.
 *
 * Rollup rechnet den Hash eines Chunks über die **Namen seiner Importe** mit.
 * Eine Zeichenkette, die sich bei jedem Deploy ändert, benennt deshalb nicht
 * nur ihre eigene Datei um, sondern jede, die sie nennt: Gemessen waren das
 * 22 Dateinamen und 2,2 MB, die jedes Telefon nach jedem Deploy neu holte,
 * obwohl sich an keiner einzigen Zeile etwas geändert hatte.
 *
 * Hier steht deshalb nur noch ein Leser für ein `<meta>` — und vor allem die
 * Zusage, dass eine fehlende Marke **kein Fehler** ist.
 */

/** Ein Dokument, so viel davon, wie `readBuildId` anfasst. */
function pageWith(meta: Record<string, string>): {
  querySelector(sel: string): { getAttribute(name: string): string | null } | null;
} {
  return {
    querySelector(sel: string) {
      const name = /meta\[name="(.*)"\]/.exec(sel)?.[1] ?? '';
      const content = meta[name];
      return content === undefined ? null : { getAttribute: () => content };
    },
  };
}

describe('die Kennung aus der Seite', () => {
  it('liest die Marke, die der Build gesetzt hat', () => {
    expect(readBuildId(pageWith({ [BUILD_META]: '1a2b3c4d5e6f' }))).toBe('1a2b3c4d5e6f');
  });

  /**
   * **Ohne Marke ist sie leer, und das ist der normale Ausgang** — in einem
   * Jest-Lauf, unter `vite dev`, und bei einer Seite aus einem Speicher, der
   * älter ist als diese Marke. Ein leerer Text heißt „keine Auskunft": Die
   * Startseite zeigt dann nur `0.<Build>.<Patch>`, und `offline.json` wird
   * ohne Query geholt. Geworfen wird nie — eine Startseite, die an einer
   * fehlenden Kennung scheitert, wäre der teuerste denkbare Tausch.
   */
  it('kommt ohne Marke und ohne Dokument aus', () => {
    expect(readBuildId(pageWith({}))).toBe('');
    expect(readBuildId(null)).toBe('');
    expect(readBuildId(undefined)).toBe('');
  });

  /** Der Name der Marke steht einmal — `vite.config.ts` importiert ihn hier. */
  it('sucht unter dem Namen, den der Build schreibt', () => {
    expect(BUILD_META).toBe('bgvr-build');
    expect(readBuildId(pageWith({ 'irgendwas-anderes': 'xyz' }))).toBe('');
  });
});
