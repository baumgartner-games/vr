/**
 * **Wo man gerade steht, als Zahl** — _Menü → Grafik → Position zeigen_
 * (`GraphicsSettings.showPosition`).
 *
 * Gewünscht: „in Grafik-Menü Option haben, die x-, y-Pos und ggf. z-Pos in der
 * Welt sehen zu wollen." Gebraucht wird das immer dann, wenn man jemandem
 * sagen will, **wo** etwas ist — eine fehlende Bodenplatte, eine Wand, die
 * falsch durchsichtig wird, eine Stelle, an der man hängen bleibt. „Links
 * hinter der Küche" findet niemand wieder; `x 8.40 · z −33.10` schon.
 *
 * Drei Zeilen, und jede beantwortet eine eigene Frage:
 *
 * - **Meter**: `x` nach Osten, `z` nach Süden, `y` die Höhe der Füße — so, wie
 *   three.js und jede Datei dieses Projekts rechnen. Die Höhe steht zuletzt:
 *   Von oben ist der Boden die Frage und die Höhe fast immer null.
 * - **Kachel und Ebene** — dasselbe Raster, auf dem gebaut und eingerastet
 *   wird (`nav/navTile.TILE`, 1 m).
 * - **Die Adresse dorthin**: `?at=x,z` (samt Ebene, wenn sie nicht null ist)
 *   — dieselbe Schreibweise, die `worlds/test/spawnAt.ts` liest. Wer die
 *   Zeile weitergibt, gibt damit den Weg mit.
 *
 * Das Feld ist DOM wie die Bildrate daneben (`FrameStats`) und in der Brille
 * deshalb unsichtbar; dort steht man ohnehin, wo man hinsieht.
 *
 * **Und es hat einen Knopf zum Kopieren** (`positionLine`). Gewünscht: „ein
 * Kopierband, dass ich die aktuelle Position kopieren kann." Abschreiben ist
 * die Fehlerquelle, die das Feld abschaffen sollte — ein Tipp legt alle drei
 * Zeilen als **eine** in die Zwischenablage, so wie man sie in einen Chat
 * einfügt.
 */
import { COPY_FALLBACK, copyText } from '../ui/clipboard';

/** Wie oft die Zeile höchstens neu geschrieben wird, in Sekunden. */
const REFRESH = 0.1;

/**
 * **Die Zeilen des Feldes** — reine Rechnung, damit ein Test sie lesen kann.
 *
 * @param level Die Ebene, auf der das Rig steht (`World.viewLevel`), oder
 *   `null` in einer Welt ohne Stockwerke.
 */
export function positionText(x: number, y: number, z: number, level: number | null): string {
  if (![x, y, z].every((value) => Number.isFinite(value))) return 'Position unbekannt';
  const col = Math.floor(x);
  const row = Math.floor(z);
  const floor = level ?? 0;
  const tile = `Kachel ${col} | ${row}` + (level === null ? '' : ` · Ebene ${floor}`);
  const at = floor > 0 ? `?at=${col},${row},${floor}` : `?at=${col},${row}`;
  return `x ${metres(x)} · z ${metres(z)} · y ${metres(y)}\n${tile}\n${at}`;
}

/**
 * **Was der Knopf kopiert** — dieselben drei Zeilen, auf eine gezogen. Eine
 * Chatzeile mit Zeilenumbrüchen zerfällt beim Einfügen in drei Nachrichten
 * oder in einen Absatz; mit `·` dazwischen bleibt sie eine Auskunft.
 */
export function positionLine(text: string): string {
  return text.split('\n').join(' · ');
}

/** Wie lange der Knopf nach einem Tipp „kopiert" sagt, in Millisekunden. */
const COPIED_FOR = 1500;

/** Zwei Nachkommastellen, und ein Minus, das so breit ist wie eine Ziffer. */
function metres(value: number): string {
  const text = value.toFixed(2);
  // `-0.00` ist keine Auskunft, sondern ein Rundungsrest.
  return text === '-0.00' ? '0.00' : text.replace('-', '−');
}

export class PositionHud {
  private readonly element = document.createElement('div');
  /** Die drei Zeilen — ein eigenes Feld, damit das Schreiben den Knopf stehen lässt. */
  private readonly text = document.createElement('span');
  private readonly copy = document.createElement('button');
  private copiedTimer = 0;
  private requested = false;
  private immersive = false;
  private clock = 0;
  private shown = '';

  constructor() {
    this.element.className = 'position-hud';
    this.element.hidden = true;
    this.element.setAttribute('aria-label', 'Position in der Welt');
    this.text.className = 'position-hud__text';
    this.copy.className = 'position-hud__copy';
    this.copy.type = 'button';
    this.copy.textContent = 'Kopieren';
    this.copy.setAttribute('aria-label', 'Position kopieren');
    this.copy.addEventListener('click', (event) => {
      // Der Tipp gehört dem Knopf und nicht der Welt dahinter.
      event.stopPropagation();
      void this.copyPosition();
    });
    this.element.append(this.text, this.copy);
    document.body.append(this.element);
  }

  /** Ob die Anzeige gewünscht ist — die Zeile im Grafik-Menü. */
  get visible(): boolean {
    return this.requested;
  }

  set visible(on: boolean) {
    if (this.requested === on) return;
    this.requested = on;
    this.refresh();
  }

  setImmersive(on: boolean): void {
    this.immersive = on;
    this.refresh();
  }

  /** Ein Bild weiter — geschrieben wird nur alle `REFRESH` Sekunden, und nur was sich ändert. */
  update(dt: number, x: number, y: number, z: number, level: number | null): void {
    if (this.element.hidden) return;
    this.clock += dt;
    if (this.clock < REFRESH && this.shown !== '') return;
    this.clock = 0;
    const text = positionText(x, y, z, level);
    if (text === this.shown) return;
    this.shown = text;
    this.text.textContent = text;
  }

  dispose(): void {
    window.clearTimeout(this.copiedTimer);
    this.element.remove();
  }

  /** Die Zeile in die Zwischenablage — und am Knopf sagen, ob es geklappt hat. */
  private async copyPosition(): Promise<void> {
    if (this.shown === '') return;
    const copied = await copyText(positionLine(this.shown));
    this.copy.textContent = copied ? 'Kopiert ✓' : 'Markiert';
    this.copy.title = copied ? '' : COPY_FALLBACK;
    window.clearTimeout(this.copiedTimer);
    this.copiedTimer = window.setTimeout(() => {
      this.copy.textContent = 'Kopieren';
      this.copy.title = '';
    }, COPIED_FOR);
  }

  private refresh(): void {
    this.element.hidden = this.immersive || !this.requested;
    this.shown = '';
    this.clock = 0;
  }
}
