import { puzzleFor, type Repair } from '../mission';
import type { FlatRound } from './flatRound';
import type { PuzzleAction } from './flatPuzzles';

/**
 * **Das Rätsel als Overlay über der Karte.** Dieselben drei Regeln wie an
 * der Konsole im Schiff (`flatPuzzles.ts`), als Knöpfe für den Daumen.
 */
export class PuzzleOverlay {
  readonly element = document.createElement('div');
  private selected = -1;
  private shown: Repair | null = null;

  constructor(private readonly round: FlatRound) {
    this.element.className = 'flat__puzzle';
    this.element.hidden = true;
    this.element.addEventListener('click', (event) => this.click(event));
  }

  /** Nach jedem Bild: zeigt das offene Rätsel, versteckt sich ohne. */
  sync(): void {
    const repair = this.round.puzzle;
    if (!repair) {
      if (this.shown) {
        this.shown = null;
        this.element.hidden = true;
        this.element.replaceChildren();
      }
      return;
    }
    if (this.shown !== repair) {
      this.shown = repair;
      this.selected = -1;
      this.element.hidden = false;
    }
    this.render(repair);
  }

  private render(repair: Repair): void {
    const puzzle = puzzleFor(this.round.state().crew, repair.id);
    const parts: HTMLElement[] = [];
    const head = el('header', 'flat__puzzle-head');
    head.append(el('strong', '', repair.title), el('span', 'flat__tag', repair.hint));
    const close = el('button', 'flat__puzzle-close', 'Schließen');
    close.dataset['close'] = '';
    head.append(close);
    parts.push(head);
    if (repair.puzzle === 'wires') {
      const board = el('div', 'flat__wires');
      const plugs = el('div', 'flat__column');
      const sockets = el('div', 'flat__column');
      for (let i = 0; i < 4; i++) {
        const plug = el('button', 'flat__plug', `Stecker ${i + 1}`);
        plug.dataset['plug'] = String(i);
        plug.classList.toggle('is-selected', this.selected === i);
        const link = puzzle.links[i];
        if (link !== undefined) plug.append(el('small', '', `→ Buchse ${link + 1}`));
        plugs.append(plug);
        const socket = el('button', 'flat__socket', `Buchse ${i + 1}`);
        socket.dataset['socket'] = String(i);
        (socket as HTMLButtonElement).disabled = this.selected < 0;
        sockets.append(socket);
      }
      board.append(plugs, sockets);
      parts.push(el('p', 'flat__hint', 'Stecker wählen, dann die Buchse.'), board);
    } else if (repair.puzzle === 'sequence') {
      const display = el('div', 'flat__display', puzzle.links.map(String).join(' ') || '— — —');
      const keys = el('div', 'flat__keys');
      for (let digit = 1; digit <= 4; digit++) {
        const key = el('button', 'flat__key', String(digit));
        key.dataset['digit'] = String(digit);
        keys.append(key);
      }
      parts.push(
        el('p', 'flat__hint', 'Drei Ziffern in der richtigen Reihenfolge.'),
        display,
        keys,
      );
    } else {
      const columns = el('div', 'flat__keys');
      for (let column = 0; column < 3; column++) {
        const key = el(
          'button',
          'flat__key',
          `Frequenz ${column + 1}: ${puzzle.digits[column] ?? 1}`,
        );
        key.dataset['turn'] = String(column);
        columns.append(key);
      }
      const send = el('button', 'flat__send', 'Senden');
      send.dataset['send'] = '';
      parts.push(el('p', 'flat__hint', 'Regler drehen, dann senden.'), columns, send);
    }
    this.element.replaceChildren(...parts);
  }

  private click(event: Event): void {
    const target = (event.target as HTMLElement | null)?.closest('button');
    if (!target) return;
    const data = target.dataset;
    if (data['close'] !== undefined) {
      this.round.closePuzzle();
      this.sync();
      return;
    }
    let action: PuzzleAction | null = null;
    if (data['plug'] !== undefined) {
      this.selected = Number(data['plug']);
    } else if (data['socket'] !== undefined && this.selected >= 0) {
      action = { kind: 'wire', plug: this.selected, socket: Number(data['socket']) };
      this.selected = -1;
    } else if (data['digit'] !== undefined)
      action = { kind: 'digit', digit: Number(data['digit']) };
    else if (data['turn'] !== undefined) action = { kind: 'turn', column: Number(data['turn']) };
    else if (data['send'] !== undefined) action = { kind: 'send' };
    if (action) {
      const outcome = this.round.solve(action);
      this.element.classList.toggle('is-wrong', outcome.wrong);
    }
    this.sync();
  }
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
