/**
 * **Die Werkzeugleiste des _Baukastens_** — der DOM-Teil, am Schirm und auf
 * dem Telefon. Rechnen tut hier nichts; gesammelt wird, was gedrückt wurde,
 * und die Welt liest es je Bild ab (`take`), wie bei der Fläche (`areaPad.ts`).
 *
 * Gewünscht war _„eine klare Werkzeugleiste (Setzen, Drehen, Verschieben,
 * Löschen, Rückgängig/Wiederholen, Kopieren)"_. Bis dahin steckte jedes davon
 * in einer Taste, die man kennen musste: `R` drehte, ein Rechtsklick holte die
 * Bombe, und Rückgängig gab es nicht. Die Leiste zeigt alles auf einmal, und
 * **welches Werkzeug gerade gilt, liest sie an der Welt ab**, statt es sich
 * selbst zu merken: Wer ein Stück aus dem Regal am Haken hat, _setzt_; wer die
 * Bombe trägt, _löscht_; wer nichts trägt, _verschiebt_ — ein Klick auf ein
 * Stück hebt es auf. Eine Leiste mit eigenem Zustand wäre beim ersten
 * Rechtsklick an ihr vorbei die falsche Auskunft.
 *
 * `Strg`+`Z` und `Strg`+`Y` (oder `Strg`+`Umschalt`+`Z`) gelten, solange die
 * Leiste zu sehen ist — die üblichen Tasten jedes Programms und keine neue
 * Belegung der Spielsteuerung.
 */

export type BuildTool = 'place' | 'move' | 'erase';

/** Was die Leiste meldet. */
export type BuildEvent =
  | { readonly kind: 'tool'; readonly tool: BuildTool }
  | { readonly kind: 'turn'; readonly clockwise: boolean }
  | { readonly kind: 'copy' | 'undo' | 'redo' };

/** Was die Leiste zeigt. */
export interface BuildBarState {
  readonly visible: boolean;
  readonly tool: BuildTool;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** Um wie viel ein Druck auf Drehen dreht: `90°` oder `45°` (Wände). */
  readonly turnStep: string;
  /** Ob gerade etwas zu drehen ist. */
  readonly canTurn: boolean;
  /** Eine Zeile über dem, was gerade am Haken hängt, und wohin es käme. */
  readonly status: string;
  /** Ob die Stelle gültig ist — färbt die Zeile grün oder rot; `null` ohne Farbe. */
  readonly valid: boolean | null;
}

export const HIDDEN_BUILD_BAR: BuildBarState = {
  visible: false,
  tool: 'move',
  canUndo: false,
  canRedo: false,
  turnStep: '90°',
  canTurn: false,
  status: '',
  valid: null,
};

interface Button {
  readonly element: HTMLButtonElement;
  readonly label: HTMLSpanElement;
}

export class BuildBar {
  private readonly bar = document.createElement('div');
  private readonly status = document.createElement('div');
  private readonly row = document.createElement('div');
  private readonly queue: BuildEvent[] = [];
  private shown = '';
  private readonly place = this.button('✚', 'Setzen', 'Stück aus dem Regal setzen', {
    kind: 'tool',
    tool: 'place',
  });
  private readonly move = this.button(
    '✥',
    'Verschieben',
    'Hand frei: ein Stück anklicken, um es aufzuheben',
    {
      kind: 'tool',
      tool: 'move',
    },
  );
  private readonly erase = this.button(
    '✖',
    'Löschen',
    'Abrissbombe: das Stück unter dem Kran entfernen',
    {
      kind: 'tool',
      tool: 'erase',
    },
  );
  private readonly left = this.button('⟲', '90°', 'Links drehen (Umschalt+R)', {
    kind: 'turn',
    clockwise: false,
  });
  private readonly right = this.button('⟳', '90°', 'Rechts drehen (R)', {
    kind: 'turn',
    clockwise: true,
  });
  private readonly copy = this.button(
    '⧉',
    'Kopieren',
    'Das Stück unter dem Kran als Pinsel nehmen',
    {
      kind: 'copy',
    },
  );
  private readonly undo = this.button('↶', 'Zurück', 'Rückgängig (Strg+Z)', { kind: 'undo' });
  private readonly redo = this.button('↷', 'Vor', 'Wiederholen (Strg+Y)', { kind: 'redo' });

  constructor() {
    this.bar.className = 'build-bar';
    this.bar.hidden = true;
    this.bar.setAttribute('role', 'toolbar');
    this.bar.setAttribute('aria-label', 'Baukasten');
    this.status.className = 'build-bar__status';
    this.row.className = 'build-bar__row';
    const gap = (): HTMLSpanElement => {
      const one = document.createElement('span');
      one.className = 'build-bar__gap';
      return one;
    };
    this.row.append(
      this.place.element,
      this.move.element,
      this.erase.element,
      gap(),
      this.left.element,
      this.right.element,
      this.copy.element,
      gap(),
      this.undo.element,
      this.redo.element,
    );
    this.bar.append(this.status, this.row);
    document.body.append(this.bar);
    window.addEventListener('keydown', this.onKey, true);
  }

  /** Alles, was seit dem letzten Bild gedrückt wurde — die Liste leert sich dabei. */
  take(): BuildEvent[] {
    return this.queue.splice(0);
  }

  /** Die Leiste auf diesen Stand bringen — geschrieben wird nur, was sich ändert. */
  show(state: BuildBarState): void {
    const key = JSON.stringify(state);
    if (key === this.shown) return;
    this.shown = key;
    this.bar.hidden = !state.visible;
    if (!state.visible) return;
    for (const [tool, button] of [
      ['place', this.place],
      ['move', this.move],
      ['erase', this.erase],
    ] as const) {
      button.element.setAttribute('aria-pressed', String(state.tool === tool));
      button.element.classList.toggle('build-bar__btn--on', state.tool === tool);
    }
    this.left.label.textContent = state.turnStep;
    this.right.label.textContent = state.turnStep;
    this.left.element.disabled = !state.canTurn;
    this.right.element.disabled = !state.canTurn;
    this.undo.element.disabled = !state.canUndo;
    this.redo.element.disabled = !state.canRedo;
    this.status.textContent = state.status;
    this.status.hidden = !state.status;
    this.status.dataset.valid = state.valid === null ? '' : String(state.valid);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey, true);
    this.bar.remove();
  }

  private button(icon: string, text: string, title: string, event: BuildEvent): Button {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'build-bar__btn';
    element.title = title;
    element.setAttribute('aria-label', title);
    const glyph = document.createElement('span');
    glyph.className = 'build-bar__icon';
    glyph.textContent = icon;
    const label = document.createElement('span');
    label.className = 'build-bar__label';
    label.textContent = text;
    element.append(glyph, label);
    element.addEventListener('click', (click) => {
      click.stopPropagation();
      this.queue.push(event);
    });
    // Kein Druck auf die Leiste darf bei der Steuerung darunter ankommen —
    // sonst legt der Klick auf _Drehen_ gleichzeitig ab (`FlatControls`).
    element.addEventListener('pointerdown', (down) => down.stopPropagation());
    element.addEventListener('mousedown', (down) => down.stopPropagation());
    return { element, label };
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (this.bar.hidden || !(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    let kind: 'undo' | 'redo' | null = null;
    if (key === 'z') kind = event.shiftKey ? 'redo' : 'undo';
    else if (key === 'y') kind = 'redo';
    if (!kind) return;
    event.preventDefault();
    event.stopPropagation();
    this.queue.push({ kind });
  };
}
