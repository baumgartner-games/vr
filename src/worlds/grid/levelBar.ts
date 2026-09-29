/**
 * **Die Ebenen des _Baukastens_** — eine senkrechte Leiste am rechten Rand, wie
 * in _Die Sims_. DOM, am Schirm und auf dem Telefon, neben der Werkzeugleiste
 * (`portal/buildBar.ts`) und nur, solange die zu sehen ist und die Welt mehr
 * als eine Etage hat. Rechnen tut hier nichts: Gesammelt wird, was gedrückt
 * wurde, und die Welt holt es je Bild ab (`take`, `GridWorld.stepLevelBar`).
 *
 * Gewünscht: _„im baukasten modus habe ich noch ein problem mit dem platzieren
 * von dingen auf der korrekten ebene. Ich brauche ein UI button um durch die
 * jeweiligen ebenen durchzuschalten. Zudem sollen dann auch nur die
 * Wände/dinge der jeweiligen ebene sichtbar sein. Gerne aber auch einen button
 * bei den ebenen mit einem Icon von Außen anzeigen […] wie bei SIms"_ — von
 * oben nach unten:
 *
 * - **Von außen** (an/aus): alle Etagen zu sehen, wie jemand, der vor dem Haus
 *   steht. Gebaut wird weiter auf der gewählten.
 * - **Ebene hoch**
 * - **Ebene N** — öffnet die Liste aller Etagen, die oberste oben.
 * - **Ebene runter**
 *
 * `Bild↑` und `Bild↓` tun dasselbe wie hoch und runter, solange die Leiste zu
 * sehen ist.
 */

/** Was die Leiste meldet. */
export type LevelEvent =
  | { readonly kind: 'step'; readonly step: 1 | -1 }
  | { readonly kind: 'pick'; readonly level: number }
  | { readonly kind: 'outside' };

/** Was die Leiste zeigt. */
export interface LevelBarState {
  readonly visible: boolean;
  /** Die gewählte Etage (`nav/navTile.keyLevel`). */
  readonly level: number;
  /** Wie viele es gibt (`NavGraph.levels.length`). */
  readonly count: number;
  /** Ob alle Etagen zu sehen sind. */
  readonly outside: boolean;
}

export const HIDDEN_LEVEL_BAR: LevelBarState = {
  visible: false,
  level: 0,
  count: 1,
  outside: false,
};

/** **Die Etage neben `level`**, in den Grenzen `0 … count − 1`. */
export function stepLevel(level: number, step: 1 | -1, count: number): number {
  return Math.max(0, Math.min(count - 1, level + step));
}

/** Wie eine Etage in der Liste heißt: die Nummer, und bei der untersten, was sie ist. */
export function levelName(level: number): string {
  return level === 0 ? 'Ebene 0 · Erdgeschoss' : `Ebene ${level}`;
}

export class LevelBar {
  private readonly bar = document.createElement('div');
  private readonly list = document.createElement('div');
  private readonly queue: LevelEvent[] = [];
  private shown = '';
  /** Für wie viele Etagen die Liste gerade gebaut ist. */
  private listCount = -1;
  private readonly outside = this.button('⌂', 'Außen', 'Von außen: alle Ebenen zeigen (an/aus)', {
    kind: 'outside',
  });
  private readonly up = this.button('▲', 'Hoch', 'Eine Ebene höher (Bild↑)', {
    kind: 'step',
    step: 1,
  });
  private readonly pick = this.button('☰', 'Ebene 0', 'Ebene auswählen', null);
  private readonly down = this.button('▼', 'Runter', 'Eine Ebene tiefer (Bild↓)', {
    kind: 'step',
    step: -1,
  });

  constructor() {
    this.bar.className = 'level-bar';
    this.bar.hidden = true;
    this.bar.setAttribute('role', 'toolbar');
    this.bar.setAttribute('aria-label', 'Ebenen');
    this.bar.setAttribute('aria-orientation', 'vertical');
    this.list.className = 'level-bar__list';
    this.list.hidden = true;
    this.list.setAttribute('role', 'menu');
    this.pick.element.classList.add('level-bar__pick');
    this.pick.element.setAttribute('aria-haspopup', 'menu');
    this.pick.element.addEventListener('click', (click) => {
      click.stopPropagation();
      this.list.hidden = !this.list.hidden;
      this.pick.element.setAttribute('aria-expanded', String(!this.list.hidden));
    });
    this.bar.append(
      this.outside.element,
      this.up.element,
      this.pick.element,
      this.down.element,
      this.list,
    );
    // Kein Druck auf die Leiste darf bei der Steuerung darunter ankommen —
    // sonst setzt der Klick auf _Hoch_ gleichzeitig ab (`FlatControls`).
    this.list.addEventListener('pointerdown', (down) => down.stopPropagation());
    this.list.addEventListener('mousedown', (down) => down.stopPropagation());
    document.body.append(this.bar);
    window.addEventListener('keydown', this.onKey, true);
  }

  /** Alles, was seit dem letzten Bild gedrückt wurde — die Liste leert sich dabei. */
  take(): LevelEvent[] {
    return this.queue.splice(0);
  }

  /** Die Leiste auf diesen Stand bringen — geschrieben wird nur, was sich ändert. */
  show(state: LevelBarState): void {
    const key = JSON.stringify(state);
    if (key === this.shown) return;
    this.shown = key;
    this.bar.hidden = !state.visible;
    if (!state.visible) {
      this.closeList();
      return;
    }
    this.outside.element.setAttribute('aria-pressed', String(state.outside));
    this.outside.element.classList.toggle('build-bar__btn--on', state.outside);
    this.up.element.disabled = state.level >= state.count - 1;
    this.down.element.disabled = state.level <= 0;
    this.pick.label.textContent = `Ebene ${state.level}`;
    this.pick.element.title = `${levelName(state.level)} · Ebene auswählen`;
    if (this.listCount !== state.count) this.fillList(state.count);
    for (const row of this.list.children) {
      const on = (row as HTMLElement).dataset['level'] === String(state.level);
      row.classList.toggle('level-bar__item--on', on);
      row.setAttribute('aria-checked', String(on));
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey, true);
    this.bar.remove();
  }

  /** Die Liste der Etagen, die oberste oben — wie sie im Haus übereinanderliegen. */
  private fillList(count: number): void {
    this.listCount = count;
    this.list.replaceChildren();
    for (let level = count - 1; level >= 0; level--) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'level-bar__item';
      row.dataset['level'] = String(level);
      row.setAttribute('role', 'menuitemradio');
      row.textContent = levelName(level);
      row.addEventListener('click', (click) => {
        click.stopPropagation();
        this.queue.push({ kind: 'pick', level });
        this.closeList();
      });
      this.list.append(row);
    }
  }

  private closeList(): void {
    this.list.hidden = true;
    this.pick.element.setAttribute('aria-expanded', 'false');
  }

  private button(
    icon: string,
    text: string,
    title: string,
    event: LevelEvent | null,
  ): { element: HTMLButtonElement; label: HTMLSpanElement } {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'build-bar__btn level-bar__btn';
    element.title = title;
    element.setAttribute('aria-label', title);
    const glyph = document.createElement('span');
    glyph.className = 'build-bar__icon';
    glyph.textContent = icon;
    const label = document.createElement('span');
    label.className = 'build-bar__label';
    label.textContent = text;
    element.append(glyph, label);
    if (event)
      element.addEventListener('click', (click) => {
        click.stopPropagation();
        this.closeList();
        this.queue.push(event);
      });
    element.addEventListener('pointerdown', (down) => down.stopPropagation());
    element.addEventListener('mousedown', (down) => down.stopPropagation());
    return { element, label };
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (this.bar.hidden || event.ctrlKey || event.metaKey || event.altKey) return;
    let step: 1 | -1 | null = null;
    if (event.key === 'PageUp') step = 1;
    else if (event.key === 'PageDown') step = -1;
    if (step === null) return;
    event.preventDefault();
    event.stopPropagation();
    this.queue.push({ kind: 'step', step });
  };
}
