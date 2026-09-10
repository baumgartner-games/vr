import {
  SEAT_HINTS,
  SEAT_LABELS,
  WHO_LABELS,
  cycleMonster,
  cycleSeatRole,
  cycleWho,
  powersOf,
  saveSetup,
  type RoundSetup,
} from './rules/roundSetup';

/**
 * **Die Tafel, an der eine Runde verteilt wird** — dieselbe im Van, im
 * Optionsmenü der 2D-Welt und überall, wo eine Runde vorbereitet wird.
 *
 * Drei Zeilen: der Techniker (Mensch oder Bot), das Monster (Mensch, Bot
 * oder aus) und die Plätze der Einsatzzentrale — beliebig viele, jeder mit
 * Rolle und Besetzung, mit einem Knopf zum Hinzufügen und einem zum
 * Wegnehmen. Jeder Tipp schreibt die Einstellung sofort (`saveSetup`) und
 * ruft `onChange`; gestartet wird nicht hier, sondern mit den Kacheln
 * daneben. Reines DOM ohne Rahmen; die Farben kommen aus `haunting.css`
 * (`.setup`), damit die Tafel überall gleich aussieht.
 */
export interface SetupPanelHost {
  setup(): RoundSetup;
  onChange(setup: RoundSetup): void;
  /** Ob das Monster als Mensch hier überhaupt spielbar ist (nur in der 2D-Welt). */
  humanMonster?: boolean;
}

export class SetupPanel {
  readonly element = el('div', 'setup');

  constructor(private readonly host: SetupPanelHost) {
    this.element.addEventListener('click', (event) => this.click(event));
    this.render();
  }

  render(): void {
    const setup = this.host.setup();
    const powers = powersOf(setup);
    const parts: HTMLElement[] = [];
    parts.push(
      row(
        'Techniker',
        'setup-technician',
        WHO_LABELS[setup.technician],
        'Stock und Knöpfe · oder aus Zahlen',
      ),
      row(
        'Monster',
        'setup-monster',
        WHO_LABELS[setup.monster] +
          (setup.monster === 'human' && this.host.humanMonster === false ? ' (nur in 2D)' : ''),
        setup.monster === 'off' ? 'Sicherer Test ohne Gegner' : 'Aus Zahlen · oder am Stock (2D)',
      ),
    );
    const head = el('div', 'setup__head');
    head.append(el('span', '', 'Einsatzzentrale'));
    const add = el('button', 'setup__add', '+ Platz');
    add.dataset['setupAdd'] = '';
    head.append(add);
    parts.push(head);
    if (!setup.seats.length)
      parts.push(
        el('small', 'setup__hint', 'Keine Plätze: Der Techniker ist ganz auf sich gestellt.'),
      );
    setup.seats.forEach((seat, index) => {
      const line = el('div', 'setup__seat');
      const role = el('button', 'setup__key setup__key--role', SEAT_LABELS[seat.role]);
      role.dataset['setupSeatRole'] = String(index);
      role.title = SEAT_HINTS[seat.role];
      const who = el('button', `setup__key setup__key--who is-${seat.who}`, WHO_LABELS[seat.who]);
      who.dataset['setupSeatWho'] = String(index);
      const remove = el('button', 'setup__key setup__key--remove', '×');
      remove.dataset['setupSeatRemove'] = String(index);
      remove.setAttribute('aria-label', 'Platz entfernen');
      line.append(role, who, remove);
      parts.push(line);
    });
    const granted = [
      powers.scout ? 'Horchbild der Station' : '',
      powers.panel ? 'Türen und Lampen per Tipp' : '',
      powers.archive ? 'Raumakte mit Codes' : '',
    ].filter(Boolean);
    parts.push(
      el(
        'small',
        'setup__hint',
        granted.length
          ? `Bot-Plätze geben dem Techniker die Auskunft selbst: ${granted.join(', ')}.`
          : 'Ein Mensch am Platz sagt es dem Techniker — oder niemand.',
      ),
    );
    this.element.replaceChildren(...parts);
  }

  private click(event: Event): void {
    const key = (event.target as HTMLElement | null)?.closest('button');
    if (!key) return;
    const data = key.dataset;
    const setup = JSON.parse(JSON.stringify(this.host.setup())) as RoundSetup;
    if (data['setupTechnician'] !== undefined) setup.technician = cycleWho(setup.technician);
    else if (data['setupMonster'] !== undefined) setup.monster = cycleMonster(setup.monster);
    else if (data['setupAdd'] !== undefined) {
      if (setup.seats.length < 8) setup.seats.push({ role: 'archive', who: 'bot' });
    } else if (data['setupSeatRole'] !== undefined) {
      const seat = setup.seats[Number(data['setupSeatRole'])];
      if (seat) seat.role = cycleSeatRole(seat.role);
    } else if (data['setupSeatWho'] !== undefined) {
      const seat = setup.seats[Number(data['setupSeatWho'])];
      if (seat) seat.who = cycleWho(seat.who);
    } else if (data['setupSeatRemove'] !== undefined) {
      setup.seats.splice(Number(data['setupSeatRemove']), 1);
    } else return;
    event.stopPropagation();
    saveSetup(setup);
    this.host.onChange(setup);
    this.render();
  }
}

function row(label: string, key: string, value: string, hint: string): HTMLElement {
  const line = el('div', 'setup__row');
  const text = el('div', 'setup__label');
  text.append(el('strong', '', label), el('small', '', hint));
  const button = el('button', 'setup__key', value);
  button.dataset[key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = '';
  line.append(text, button);
  return line;
}

function el(tag: string, className: string, text = ''): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
