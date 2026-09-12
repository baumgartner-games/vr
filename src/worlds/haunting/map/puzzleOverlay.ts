import { puzzleFor, type Repair } from '../mission';
import type { FlatRound } from './flatRound';
import type { PuzzleAction } from './flatPuzzles';
import { clickedKey, el } from '../ui/dom';
import { pillKey } from '../ui/widgets';

/** Die vier Symbole und Farben des Kabelrätsels — wie an der Konsole im Schiff. */
export const WIRE_SYMBOLS = ['▲', '●', '■', '◆'] as const;
export const WIRE_COLORS = ['#f5aa71', '#70def0', '#dcb5ff', '#b3d57b'] as const;

/**
 * **Das Rätsel als Overlay über der Karte.** Dieselben drei Regeln wie an
 * der Konsole im Schiff (`flatPuzzles.ts`), als Knöpfe für den Daumen.
 */
export class PuzzleOverlay {
  readonly element = el('div', 'ui-panel flat__puzzle');
  private selected = -1;
  private shown: Repair | null = null;
  /** Woraus das letzte Bild gebaut wurde — neu gebaut wird nur, wenn sich das ändert. */
  private drawn = '';

  constructor(private readonly round: FlatRound) {
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
      this.drawn = '';
    }
    // **Nicht jedes Bild neu bauen.** Ein Knopf, der zwischen Aufsetzen und
    // Abheben des Fingers aus dem DOM fällt, bekommt auf dem Telefon keinen
    // Klick — genau so ließ sich das Kabelrätsel nicht lösen. Gebaut wird nur,
    // wenn sich Rätselstand oder Auswahl geändert haben.
    const puzzle = puzzleFor(this.round.state().crew, repair.id);
    const key = `${repair.id}|${puzzle.links.join(',')}|${puzzle.digits.join(',')}|${this.selected}`;
    if (key === this.drawn) return;
    this.drawn = key;
    this.render(repair);
  }

  private render(repair: Repair): void {
    const puzzle = puzzleFor(this.round.state().crew, repair.id);
    const parts: HTMLElement[] = [];
    const head = el('header', 'flat__puzzle-head');
    head.append(el('strong', '', repair.title), el('span', 'flat__tag', repair.hint));
    head.append(pillKey({ text: 'Schließen', data: { close: '' } }, 'flat__puzzle-close'));
    parts.push(head);
    if (repair.puzzle === 'wires') {
      // Dieselben vier Symbole und Farben wie an der Konsole im Schiff
      // (`ShipExperience`): Stecker `i` gehört in die Buchse mit demselben
      // Symbol — ohne die Symbole wäre das Rätsel ein Raten unter 24 Wegen.
      const board = el('div', 'flat__wires');
      const plugs = el('div', 'flat__column');
      const sockets = el('div', 'flat__column');
      for (let i = 0; i < 4; i++) {
        const plug = el('button', 'flat__plug');
        plug.dataset['plug'] = String(i);
        plug.style.setProperty('--wire', WIRE_COLORS[i]!);
        plug.classList.toggle('is-selected', this.selected === i);
        plug.append(
          el('span', 'flat__wire-symbol', WIRE_SYMBOLS[i]!),
          el('span', '', `Stecker ${i + 1}`),
        );
        const link = puzzle.links[i];
        if (link !== undefined) {
          const symbol = WIRE_SYMBOLS[repair.order[link]!]!;
          plug.append(el('small', '', `→ Buchse ${symbol}`));
          plug.classList.toggle('is-right', repair.order[link] === i);
        }
        plugs.append(plug);
        const socketSymbol = repair.order[i]!;
        const socket = el('button', 'flat__socket');
        socket.dataset['socket'] = String(i);
        socket.style.setProperty('--wire', WIRE_COLORS[socketSymbol]!);
        socket.append(
          el('span', 'flat__wire-symbol', WIRE_SYMBOLS[socketSymbol]!),
          el('span', '', `Buchse ${i + 1}`),
        );
        const plugged = puzzle.links.indexOf(i);
        if (plugged >= 0) socket.append(el('small', '', `← Stecker ${WIRE_SYMBOLS[plugged]}`));
        socket.classList.toggle('is-right', plugged === socketSymbol);
        (socket as HTMLButtonElement).disabled = this.selected < 0;
        sockets.append(socket);
      }
      board.append(plugs, sockets);
      parts.push(
        el('p', 'flat__hint', 'Stecker wählen, dann die Buchse mit demselben Symbol.'),
        board,
      );
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
    const target = clickedKey(event);
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
