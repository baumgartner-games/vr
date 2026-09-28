/**
 * **Die Knöpfe und die Zeichenfläche von _Fläche_** — der DOM-Teil zu
 * `areaPaint.ts`.
 *
 * Zwei Stücke:
 *
 * - **Die Leiste** oben in der Mitte: im Baukasten mit einem Stück aus dem
 *   Regal in der Hand ein Knopf _▦ Fläche_; ist der Modus an, ein Hinweis
 *   und _Beenden_, und steht eine Fläche zur Frage, _Bestätigen_ und
 *   _Abbrechen_. Dieselben Knöpfe am Schirm und auf dem Telefon — gewünscht
 *   war „vielleicht können wir auch da dieselbe UI nutzen".
 * - **Die Zeichenfläche** über dem Bild, solange der Modus an ist. Sie fängt
 *   jeden Druck ab, bevor die Steuerung ihn als Blick, Sprung oder Ablegen
 *   liest (`core/FlatControls.ts` hört am Canvas darunter), und gibt ihn als
 *   Punkt auf dem Schirm weiter. Welche Kachel darunter liegt, weiß nur die
 *   Welt mit ihrer Kamera; deshalb wird hier nur gesammelt und dort gelesen
 *   (`take`).
 *
 * `Esc` nimmt eine halbe Auswahl zurück und beendet sonst den Modus, `Enter`
 * bestätigt eine gefragte Fläche.
 *
 * **Mit einer Wand in der Hand** gibt es einen Knopf mehr: _Linie_ zieht eine
 * Wand von Ecke zu Ecke wie in _Die Sims_ (`areaPaint.wallLine`), _Raum_ zieht
 * wie bisher ein Rechteck, das rundum eine Wand bekommt.
 */

/** Wie eine Wand gezogen wird: als Linie von Ecke zu Ecke oder als Raum. */
export type AreaShape = 'line' | 'rect';

/** Was die Leiste und die Zeichenfläche melden. */
export type AreaEvent =
  | { readonly kind: 'down' | 'move' | 'up'; readonly x: number; readonly y: number }
  | { readonly kind: 'toggle' | 'confirm' | 'cancel' | 'escape' | 'shape' };

/** Was die Leiste gerade zeigt. */
export type AreaBarState =
  | { readonly kind: 'hidden' }
  /** Der Modus ist aus, kann aber an. */
  | { readonly kind: 'offer'; readonly shape?: AreaShape }
  /** Der Modus ist an; `text` sagt, was als Nächstes kommt. */
  | { readonly kind: 'active'; readonly text: string; readonly shape?: AreaShape }
  /** Eine Fläche steht zur Frage. */
  | { readonly kind: 'confirm'; readonly text: string; readonly shape?: AreaShape };

export class AreaPad {
  private readonly bar = document.createElement('div');
  private readonly label = document.createElement('span');
  private readonly toggle = button('▦ Fläche', 'area-bar__btn');
  /** _Linie_ oder _Raum_ — nur mit einer Wand in der Hand zu sehen. */
  private readonly shape = button('╱ Linie', 'area-bar__btn');
  private readonly confirm = button('Bestätigen', 'area-bar__btn area-bar__btn--go');
  private readonly cancel = button('Abbrechen', 'area-bar__btn');
  private readonly surface = document.createElement('div');
  private readonly queue: AreaEvent[] = [];
  private shown = '';
  private pointer: number | null = null;

  constructor() {
    this.bar.className = 'area-bar';
    this.bar.hidden = true;
    this.label.className = 'area-bar__text';
    this.bar.append(this.label, this.shape, this.toggle, this.confirm, this.cancel);
    this.surface.className = 'area-surface';
    this.surface.hidden = true;
    document.body.append(this.surface, this.bar);

    this.toggle.addEventListener('click', this.onToggle);
    this.shape.addEventListener('click', this.onShape);
    this.confirm.addEventListener('click', this.onConfirm);
    this.cancel.addEventListener('click', this.onCancel);
    this.surface.addEventListener('pointerdown', this.onDown);
    this.surface.addEventListener('pointermove', this.onMove);
    this.surface.addEventListener('pointerup', this.onUp);
    this.surface.addEventListener('pointercancel', this.onUp);
    // Das Menü des Browsers auf einen langen Druck wäre hier nur im Weg.
    this.surface.addEventListener('contextmenu', prevent);
    window.addEventListener('keydown', this.onKey, true);
  }

  /** Alles, was seit dem letzten Bild gemeldet wurde — und die Liste leert sich dabei. */
  take(): AreaEvent[] {
    return this.queue.splice(0);
  }

  /** Die Leiste und die Zeichenfläche auf diesen Stand bringen — geschrieben wird nur, was sich ändert. */
  show(state: AreaBarState): void {
    const shape = state.kind === 'hidden' ? undefined : state.shape;
    const key = state.kind + ('text' in state ? state.text : '') + (shape ?? '');
    if (key === this.shown) return;
    this.shown = key;
    this.bar.hidden = state.kind === 'hidden';
    const active = state.kind === 'active' || state.kind === 'confirm';
    this.bar.classList.toggle('area-bar--active', active);
    this.surface.hidden = !active;
    this.label.textContent = 'text' in state ? state.text : '';
    this.label.hidden = !('text' in state);
    this.toggle.hidden = state.kind === 'confirm';
    this.toggle.textContent =
      state.kind !== 'offer' ? 'Beenden' : shape ? '▦ Wand ziehen' : '▦ Fläche';
    // Der Knopf zeigt, was gilt; ein Druck schaltet auf das andere.
    this.shape.hidden = shape === undefined || state.kind === 'confirm';
    this.shape.textContent = shape === 'rect' ? '▭ Raum' : '╱ Linie';
    this.shape.title =
      shape === 'rect'
        ? 'Raum: ein Rechteck aufziehen, rundum kommt eine Wand · umschalten auf Linie'
        : 'Linie: vom Startpunkt zum Endpunkt ziehen, wie in Die Sims · umschalten auf Raum';
    this.toggle.setAttribute('aria-pressed', String(active));
    this.confirm.hidden = state.kind !== 'confirm';
    this.cancel.hidden = state.kind !== 'confirm';
    if (!active) this.pointer = null;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey, true);
    this.bar.remove();
    this.surface.remove();
  }

  private readonly onToggle = (event: Event): void => {
    event.stopPropagation();
    this.queue.push({ kind: 'toggle' });
  };

  private readonly onShape = (event: Event): void => {
    event.stopPropagation();
    this.queue.push({ kind: 'shape' });
  };

  private readonly onConfirm = (event: Event): void => {
    event.stopPropagation();
    this.queue.push({ kind: 'confirm' });
  };

  private readonly onCancel = (event: Event): void => {
    event.stopPropagation();
    this.queue.push({ kind: 'cancel' });
  };

  private readonly onDown = (event: PointerEvent): void => {
    // Ein Finger zeichnet; ein zweiter wäre eine Geste, die hier nichts heißt.
    if (this.pointer !== null) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    this.pointer = event.pointerId;
    this.surface.setPointerCapture?.(event.pointerId);
    this.queue.push({ kind: 'down', x: event.clientX, y: event.clientY });
  };

  private readonly onMove = (event: PointerEvent): void => {
    // Ohne Druck zählt nur die Maus: Sie zeigt nach dem ersten Klick schon,
    // wohin die zweite Ecke käme. Ein Finger ohne Druck gibt es nicht.
    if (this.pointer === null && event.pointerType !== 'mouse') return;
    if (this.pointer !== null && event.pointerId !== this.pointer) return;
    this.queue.push({ kind: 'move', x: event.clientX, y: event.clientY });
  };

  private readonly onUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointer) return;
    this.pointer = null;
    this.queue.push({ kind: 'up', x: event.clientX, y: event.clientY });
  };

  private readonly onKey = (event: KeyboardEvent): void => {
    if (this.surface.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.queue.push({ kind: 'escape' });
    } else if (event.key === 'Enter' && !this.confirm.hidden) {
      event.preventDefault();
      event.stopPropagation();
      this.queue.push({ kind: 'confirm' });
    }
  };
}

function button(text: string, className: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = text;
  return element;
}

function prevent(event: Event): void {
  event.preventDefault();
}
