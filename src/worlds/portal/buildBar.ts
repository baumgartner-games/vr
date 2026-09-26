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

export type BuildTool = 'place' | 'move' | 'erase' | 'copy' | 'floor' | 'wall';

/** Was die Leiste meldet. */
export type BuildEvent =
  | { readonly kind: 'tool'; readonly tool: BuildTool }
  | { readonly kind: 'turn'; readonly clockwise: boolean }
  | { readonly kind: 'copy' | 'undo' | 'redo' | 'fine' };

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
  /** Ob auch Möbel in Achteln drehen (`45°` an der Leiste). */
  readonly fine: boolean;
  /** Eine Zeile über dem, was gerade am Haken hängt, und wohin es käme. */
  readonly status: string;
  /** Ob die Stelle gültig ist — färbt die Zeile grün oder rot; `null` ohne Farbe. */
  readonly valid: boolean | null;
  /**
   * **Das Muster, das _Boden_ oder _Wand_ gerade setzen** — Name und
   * Farbfeld vorn in der Zeile, solange eines der beiden Werkzeuge gilt;
   * sonst `null`.
   */
  readonly pattern: BuildPattern | null;
  /** Das Farbfeld des Bodenmusters, als Punkt auf dem Knopf _Boden_ — immer zu sehen. */
  readonly floorSwatch: string;
  /** Dasselbe für _Wand_. */
  readonly wallSwatch: string;
}

/** Ein Muster in der Leiste: Name und Farbfeld (`SurfaceStyle.swatch`). */
export interface BuildPattern {
  readonly label: string;
  readonly swatch: string;
  /** Der zweite Ton eines Schachbretts — das Farbfeld wird kariert. */
  readonly swatch2?: string;
}

/** **Der Hintergrund eines Farbfelds** — einfarbig, oder kariert mit zwei Tönen. */
export function swatchBackground(swatch: string, swatch2?: string): string {
  return swatch2
    ? `repeating-conic-gradient(${swatch} 0 25%, ${swatch2} 0 50%) 50% / 8px 8px`
    : swatch;
}

/**
 * **Die Werkzeuge der Leiste in ihrer Reihenfolge** — so, wie sie von links
 * nach rechts dastehen, und so, wie das Steuerkreuz ↑/↓ am Pad durch sie
 * schaltet (`nextBuildTool`). Drehen, Rückgängig und Wiederholen sind keine
 * Werkzeuge, sondern Taten: Sie liegen auf `R`/rechtem Stock und `Strg`+`Z`.
 * _Boden_ und _Wand_ gehören dazu (`surfaceDecor.ts`); ihr Muster wechselt
 * ein zweiter Druck auf denselben Knopf, nicht das Steuerkreuz.
 */
export const BUILD_TOOLS: readonly BuildTool[] = [
  'place',
  'move',
  'erase',
  'copy',
  'floor',
  'wall',
];

/**
 * **Das Werkzeug neben `tool`** — `+1` rechts daneben, `-1` links, am Ende
 * geht es vorn weiter. Heraus kommt das, was die Leiste bei einem Klick auf
 * dieses Werkzeug meldete: Kopieren ist dort ein eigener Knopf (`copy`),
 * die anderen drei sind `tool`.
 */
export function nextBuildTool(tool: BuildTool, step: 1 | -1): BuildEvent {
  const at = BUILD_TOOLS.indexOf(tool);
  const count = BUILD_TOOLS.length;
  const next = BUILD_TOOLS[((((at < 0 ? 0 : at) + step) % count) + count) % count]!;
  return next === 'copy' ? { kind: 'copy' } : { kind: 'tool', tool: next };
}

export const HIDDEN_BUILD_BAR: BuildBarState = {
  visible: false,
  tool: 'move',
  canUndo: false,
  canRedo: false,
  turnStep: '90°',
  canTurn: false,
  fine: false,
  status: '',
  valid: null,
  pattern: null,
  floorSwatch: '',
  wallSwatch: '',
};

interface Button {
  readonly element: HTMLButtonElement;
  readonly label: HTMLSpanElement;
  readonly dot: HTMLSpanElement;
}

export class BuildBar {
  private readonly bar = document.createElement('div');
  private readonly status = document.createElement('div');
  private readonly chip = document.createElement('span');
  private readonly chipSwatch = document.createElement('span');
  private readonly chipLabel = document.createElement('span');
  private readonly statusText = document.createElement('span');
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
  private readonly fine = this.button('∠', 'Schräg', 'Auch Möbel in 45° drehen (an/aus)', {
    kind: 'fine',
  });
  private readonly floor = this.button(
    '▤',
    'Boden',
    'Den Raum unter dem Kran mit Boden belegen · noch einmal: anderes Muster',
    { kind: 'tool', tool: 'floor' },
  );
  private readonly wall = this.button(
    '▥',
    'Wand',
    'Die Wandseite am Kran belegen · noch einmal: anderes Muster',
    { kind: 'tool', tool: 'wall' },
  );
  private readonly copy = this.button(
    '⧉',
    'Kopieren',
    'Ein Stück anklicken, um es als Pinsel zu nehmen',
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
    this.chip.className = 'build-bar__pattern';
    this.chipSwatch.className = 'build-bar__swatch';
    this.chipLabel.className = 'build-bar__pattern-name';
    this.chip.append(this.chipSwatch, this.chipLabel);
    this.status.append(this.chip, this.statusText);
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
      this.fine.element,
      this.copy.element,
      gap(),
      this.floor.element,
      this.wall.element,
      gap(),
      this.undo.element,
      this.redo.element,
    );
    this.bar.append(this.status, this.row);
    document.body.append(this.bar);
    window.addEventListener('keydown', this.onKey, true);
  }

  /**
   * **Ein Druck, der nicht von der Leiste kam** — das Steuerkreuz am Pad
   * (`PortalWorld.toolStep`). Er geht in dieselbe Liste wie ein Klick und
   * wird im selben Bild abgeholt.
   */
  press(event: BuildEvent): void {
    this.queue.push(event);
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
      ['copy', this.copy],
      ['floor', this.floor],
      ['wall', this.wall],
    ] as const) {
      button.element.setAttribute('aria-pressed', String(state.tool === tool));
      button.element.classList.toggle('build-bar__btn--on', state.tool === tool);
    }
    this.left.label.textContent = state.turnStep;
    this.right.label.textContent = state.turnStep;
    this.fine.element.setAttribute('aria-pressed', String(state.fine));
    this.fine.element.classList.toggle('build-bar__btn--on', state.fine);
    this.left.element.disabled = !state.canTurn;
    this.right.element.disabled = !state.canTurn;
    this.undo.element.disabled = !state.canUndo;
    this.redo.element.disabled = !state.canRedo;
    this.statusText.textContent = state.status;
    this.status.hidden = !state.status && !state.pattern;
    this.chip.hidden = !state.pattern;
    this.chipLabel.textContent = state.pattern?.label ?? '';
    this.chipSwatch.style.background = state.pattern
      ? swatchBackground(state.pattern.swatch, state.pattern.swatch2)
      : '';
    this.floor.dot.style.background = state.floorSwatch;
    this.floor.dot.hidden = !state.floorSwatch;
    this.wall.dot.style.background = state.wallSwatch;
    this.wall.dot.hidden = !state.wallSwatch;
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
    // Ein kleiner Farbpunkt in der Ecke — nur _Boden_ und _Wand_ füllen ihn
    // (das Muster, das ein Klick setzen würde).
    const dot = document.createElement('span');
    dot.className = 'build-bar__dot';
    dot.hidden = true;
    element.append(glyph, label, dot);
    element.addEventListener('click', (click) => {
      click.stopPropagation();
      this.queue.push(event);
    });
    // Kein Druck auf die Leiste darf bei der Steuerung darunter ankommen —
    // sonst legt der Klick auf _Drehen_ gleichzeitig ab (`FlatControls`).
    element.addEventListener('pointerdown', (down) => down.stopPropagation());
    element.addEventListener('mousedown', (down) => down.stopPropagation());
    return { element, label, dot };
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
