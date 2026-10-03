import { SLOTS, type PaletteSlots } from './tools/paintPalettes';

/**
 * **Die Malpalette am Schirm** — eine Reihe aus neun Fächern unten, wie die
 * Schnellleiste in Minecraft.
 *
 * Gewünscht: _„In web habe ich wie in minecraft mit dem gegenstand
 * ausgerüstet […] unten eine reihe mit den elementen von 1-9 und kann mit
 * ‚1-9' dann dazu wechseln. wenn ich die taste gedrückt halte, öffnet sich
 * der katalog und fragt mich das auszuwählen was ich darein speichern will.
 * Beim mobilen kann ich einen besonderen button dann im bildschirm drücken
 * um die items im grid angeordnet dann auswählen zu können zum ausrüsten."_
 *
 * - **Kurz** `1`–`9` (oder ein Tipp auf das Fach): das Ding in die Hand
 *   (`onTake`); ein leeres Fach fragt gleich nach seinem Inhalt.
 * - **Lang** `1`–`9` (`HOLD_MS`) oder lang auf das Fach drücken: der Katalog
 *   geht auf, und was man dort wählt, kommt in dieses Fach (`onAssign`).
 * - **Der Raster-Knopf** daneben (`▦`) — am Telefon der Weg zu allen neun als
 *   Kacheln mit Vorschau (`onGrid`).
 *
 * Die Tasten gehören der Leiste nur, solange sie zu sehen ist, kein Menü offen
 * ist und kein Textfeld den Fokus hat; dann hört niemand sonst die Ziffer
 * (an der Station der Küche sind `1`/`2` sonst die Hände).
 */

/** Ab wann ein Druck ein langer ist. */
export const HOLD_MS = 450;

export interface PaletteBarOptions {
  onTake(slot: number): void;
  onAssign(slot: number): void;
  onGrid(): void;
  /** Ob gerade ein Menü offen ist — dann gehören die Ziffern ihm. */
  menuOpen(): boolean;
}

/** Welches Fach eine Taste meint — `-1` für keine Ziffer 1–9. */
export function slotOfKey(code: string): number {
  const match = /^(?:Digit|Numpad)([1-9])$/.exec(code);
  return match ? Number(match[1]) - 1 : -1;
}

export class PaletteBar {
  private readonly bar = document.createElement('div');
  private readonly cells: HTMLButtonElement[] = [];
  private readonly grid = document.createElement('button');
  private readonly title = document.createElement('div');
  private shown = false;
  private painted = '';
  /** Ziffer, seit wann gedrückt, und ob der lange Druck schon ausgelöst hat. */
  private readonly downs = new Map<number, { at: number; fired: boolean }>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private selected = -1;

  constructor(private readonly options: PaletteBarOptions) {
    this.bar.className = 'palette-bar';
    this.bar.hidden = true;
    this.bar.setAttribute('role', 'toolbar');
    this.bar.setAttribute('aria-label', 'Malpalette');
    this.title.className = 'palette-bar__title';
    const row = document.createElement('div');
    row.className = 'palette-bar__row';
    for (let slot = 0; slot < SLOTS; slot++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'palette-bar__cell';
      this.press(cell, slot);
      this.cells.push(cell);
      row.append(cell);
    }
    this.grid.type = 'button';
    this.grid.className = 'palette-bar__grid';
    this.grid.textContent = '▦';
    this.grid.title = 'Alle neun als Kacheln';
    this.grid.addEventListener('click', () => options.onGrid());
    row.append(this.grid);
    this.bar.append(this.title, row);
    document.body.append(this.bar);
    window.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('keyup', this.onKeyUp, true);
  }

  /** Zeigen oder verstecken — und was darauf liegt. */
  update(on: boolean, name: string, slots: PaletteSlots): void {
    if (on !== this.shown) {
      this.shown = on;
      this.bar.hidden = !on;
      if (!on) this.downs.clear();
    }
    if (!on) return;
    const key = `${name}|${this.selected}|${slots.map((slot) => slot?.ref ?? '').join('|')}`;
    if (key === this.painted) return;
    this.painted = key;
    this.title.textContent = `🎨 ${name}`;
    slots.forEach((item, slot) => {
      const cell = this.cells[slot]!;
      cell.replaceChildren();
      const number = document.createElement('span');
      number.className = 'palette-bar__key';
      number.textContent = String(slot + 1);
      const label = document.createElement('span');
      label.className = 'palette-bar__label';
      label.textContent = item ? item.label : '—';
      cell.append(number, label);
      cell.classList.toggle('palette-bar__cell--empty', !item);
      cell.classList.toggle('palette-bar__cell--on', slot === this.selected);
      cell.title = item
        ? `${slot + 1}: ${item.label} · lang drücken: neu belegen`
        : `${slot + 1}: leer · drücken: aus dem Katalog belegen`;
    });
  }

  /** Welches Fach zuletzt genommen wurde — es bleibt hervorgehoben. */
  select(slot: number): void {
    this.selected = slot;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown, true);
    window.removeEventListener('keyup', this.onKeyUp, true);
    if (this.timer) clearTimeout(this.timer);
    this.bar.remove();
  }

  /** Ein Fach mit Finger oder Maus: kurz nimmt, lang belegt neu. */
  private press(cell: HTMLButtonElement, slot: number): void {
    let at = 0;
    let fired = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    cell.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      at = performance.now();
      fired = false;
      timer = setTimeout(() => {
        fired = true;
        this.options.onAssign(slot);
      }, HOLD_MS);
    });
    const end = (take: boolean): void => {
      if (timer) clearTimeout(timer);
      timer = null;
      if (take && !fired && at > 0) this.options.onTake(slot);
      at = 0;
    };
    cell.addEventListener('pointerup', () => end(true));
    cell.addEventListener('pointerleave', () => end(false));
    cell.addEventListener('pointercancel', () => end(false));
  }

  private owns(event: KeyboardEvent): number {
    if (!this.shown || event.ctrlKey || event.metaKey || event.altKey) return -1;
    if (this.options.menuOpen()) return -1;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return -1;
    if (target?.isContentEditable) return -1;
    return slotOfKey(event.code);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const slot = this.owns(event);
    if (slot < 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat || this.downs.has(slot)) return;
    this.downs.set(slot, { at: performance.now(), fired: false });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const down = this.downs.get(slot);
      if (!down || down.fired) return;
      down.fired = true;
      this.options.onAssign(slot);
    }, HOLD_MS);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const slot = slotOfKey(event.code);
    const down = slot >= 0 ? this.downs.get(slot) : undefined;
    if (!down) return;
    this.downs.delete(slot);
    event.preventDefault();
    event.stopImmediatePropagation();
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!down.fired) this.options.onTake(slot);
  };
}
