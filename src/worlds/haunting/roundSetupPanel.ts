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
  type SeatRole,
} from './rules/roundSetup';

/**
 * **Die Tafel, an der eine Runde verteilt wird** — das „Wer?" der Lobby, im
 * Van, in der Brille und überall, wo eine Runde vorbereitet wird.
 *
 * Drei Zeilen: der Techniker (Mensch oder Bot), das Monster (Mensch, Bot
 * oder aus) und die Plätze der Einsatzzentrale — beliebig viele, jeder mit
 * Rolle und Besetzung, mit einem Knopf zum Hinzufügen und einem zum
 * Wegnehmen. Jeder Tipp schreibt die Einstellung sofort (`saveSetup`) und
 * ruft `onChange`; gestartet wird nicht hier, sondern mit dem einen Knopf
 * darunter. Reines DOM ohne Rahmen; die Farben kommen aus `haunting.css`
 * (`.setup`), damit die Tafel überall gleich aussieht.
 *
 * **Die Spalte „Ich" ist neu, und sie räumt eine doppelte Liste weg.** Vorher
 * führte der Van zwei Listen, die dieselben Plätze meinten: unten die
 * Stations-Kacheln („Archiv", „Einsatzkontrolle", „Drohne"), oben in der
 * Verteilung „Archivar / Schalttafel / Späher, je Mensch oder Bot". Wer sich
 * ans Archiv setzte, blieb in der Verteilung ein Bot — zwei Wahrheiten über
 * denselben Platz. Jetzt ist ein Tipp auf „Ich" beides zugleich: Der Platz
 * wird Mensch, und dieses Gerät setzt sich dorthin (`SetupPanelHost.claim`).
 * „Ich" gibt es genau einmal; wer es woanders hinsetzt, nimmt es dort weg.
 */

/** Ein Platz der Runde, so wie „Ich" ihn benennt. */
export type SetupSlot = 'technician' | 'monster' | `seat:${number}`;

/**
 * Welches Gerät der Zentrale zu welchem Platz gehört (`stations.ts`). Es
 * steht als Wort hier und nicht als Kennung: Am Tisch wird „ich hab das
 * Archiv" gerufen und nicht „ich hab `archive`", und die Kachel unten heißt
 * genauso.
 */
export const SEAT_STATION_LABELS: Readonly<Record<SeatRole, string>> = {
  archive: 'Archiv',
  panel: 'Einsatzkontrolle · Schalttafel',
  scout: 'Einsatzkontrolle · Radar',
};

export interface SetupPanelHost {
  setup(): RoundSetup;
  onChange(setup: RoundSetup): void;
  /**
   * Ob das Monster als Mensch hier überhaupt spielbar ist (nur in der 2D-Welt).
   * Eine Frage und kein Wert: Die Ansicht wechselt in der Lobby, während die
   * Tafel schon steht — ein beim Bauen abgelesenes `true` bliebe stehen.
   */
  humanMonster?(): boolean;
  /**
   * Welchen Platz dieses Gerät hat — `null`, wenn keinen. Fehlt die Auskunft,
   * hat die Tafel keine Spalte „Ich": Sie stünde dann an einem Ort, an dem es
   * kein „ich" gibt, und ein Knopf ohne Wirkung ist schlimmer als keiner.
   */
  mine?(): SetupSlot | null;
  /** „Ich" auf diesen Platz setzen — der Wirt schreibt die Tafel und setzt sich hin. */
  claim?(slot: SetupSlot): void;
  /**
   * Wer diesen Platz über das Netz hält, als Name — `null` heißt: niemand,
   * dort rechnet ein Bot. Steht unter jedem Platz der Zentrale.
   */
  holder?(slot: SetupSlot): string | null;
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
    const mine = this.host.mine?.() ?? null;
    const claims = !!this.host.claim && !!this.host.mine;
    const parts: HTMLElement[] = [];
    parts.push(
      this.row(
        'Techniker',
        'setup-technician',
        WHO_LABELS[setup.technician],
        'Stock und Knöpfe · oder aus Zahlen',
        claims ? 'technician' : null,
        mine,
      ),
      this.row(
        'Monster',
        'setup-monster',
        WHO_LABELS[setup.monster] +
          (setup.monster === 'human' && this.host.humanMonster?.() === false ? ' (nur in 2D)' : ''),
        setup.monster === 'off' ? 'Sicherer Test ohne Gegner' : 'Aus Zahlen · oder am Stock (2D)',
        claims ? 'monster' : null,
        mine,
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
      const slot: SetupSlot = `seat:${index}`;
      const line = el('div', 'setup__seat');
      const role = el('button', 'setup__key setup__key--role', SEAT_LABELS[seat.role]);
      role.dataset['setupSeatRole'] = String(index);
      role.title = SEAT_HINTS[seat.role];
      const who = el('button', `setup__key setup__key--who is-${seat.who}`, WHO_LABELS[seat.who]);
      who.dataset['setupSeatWho'] = String(index);
      const remove = el('button', 'setup__key setup__key--remove', '×');
      remove.dataset['setupSeatRemove'] = String(index);
      remove.setAttribute('aria-label', 'Platz entfernen');
      line.append(role, who);
      if (claims) line.append(meKey(slot, mine === slot));
      line.append(remove);
      // **Unter dem Platz steht, wer wirklich dort sitzt** — der Name aus dem
      // Netz oder „Bot". Ohne diese Zeile ist „Mensch" eine Behauptung: Wer
      // sie liest, weiß nicht, ob schon jemand am Telefon sitzt oder ob nur
      // jemand den Knopf umgestellt hat.
      const held = this.host.holder?.(slot) ?? null;
      parts.push(
        line,
        el(
          'small',
          'setup__holder',
          `${SEAT_STATION_LABELS[seat.role]} · ${held ?? (seat.who === 'human' ? 'noch niemand am Telefon' : 'Bot')}`,
        ),
      );
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
    // **„Ich" schreibt die Tafel nicht selbst.** Der Wirt weiß, was daran
    // hängt — hinsetzen, den vorigen Platz wieder freigeben, in 3D den
    // Techniker am Desktop übernehmen —, und zwei Stellen, die dieselbe Tafel
    // schreiben, wären wieder zwei Wahrheiten über denselben Platz.
    const slot = data['setupMe'];
    if (slot !== undefined) {
      event.stopPropagation();
      this.host.claim?.(slot as SetupSlot);
      this.render();
      return;
    }
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

  private row(
    label: string,
    key: string,
    value: string,
    hint: string,
    slot: SetupSlot | null,
    mine: SetupSlot | null,
  ): HTMLElement {
    const line = el('div', 'setup__row');
    const text = el('div', 'setup__label');
    text.append(el('strong', '', label), el('small', '', hint));
    const button = el('button', 'setup__key', value);
    button.dataset[key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = '';
    line.append(text, button);
    if (slot) line.append(meKey(slot, mine === slot));
    return line;
  }
}

/** Der Knopf „Ich" — er leuchtet an genau einem Platz. */
function meKey(slot: SetupSlot, active: boolean): HTMLElement {
  const key = el('button', `setup__key setup__key--me${active ? ' is-mine' : ''}`, 'Ich');
  key.dataset['setupMe'] = slot;
  key.setAttribute('aria-pressed', active ? 'true' : 'false');
  key.setAttribute('aria-label', active ? 'Das ist mein Platz' : 'Diesen Platz übernehmen');
  return key;
}

function el(tag: string, className: string, text = ''): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
