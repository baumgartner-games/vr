import {
  ABILITIES,
  ABILITY_HINTS,
  ABILITY_LABELS,
  SEAT_HINTS,
  SEAT_LABELS,
  SEATS,
  WHO_LABELS,
  WHOS,
  roleName,
  saveSetup,
  seatAbilities,
  withPower,
  withWho,
  type Ability,
  type MyRole,
  type RoundSetup,
  type SeatId,
  type SeatWho,
} from './rules/roundSetup';

/**
 * **Die Tafel, an der eine Runde verteilt wird** — im Van, in der Brille und
 * überall, wo eine Runde vorbereitet wird.
 *
 * Fünf Zeilen, eine je Platz (`rules/roundSetup.SEATS`): Techniker, Rot,
 * Gelb, Blau, Monster. In jeder Zeile stehen **drei Knöpfe** nebeneinander —
 * Mensch, Bot, Aus —, und rechts daneben, außer beim Monster, die **drei
 * Fähigkeiten** als Lämpchen: gelb, wenn der Platz sie hält, grau, wenn
 * nicht. Jeder Tipp schreibt die Einstellung sofort (`saveSetup`) und ruft
 * `onChange`; gestartet wird nicht hier, sondern mit dem einen Knopf darunter.
 *
 * **Die Spalte „Ich" ist weg.** Sie sagte, welches Gerät auf welchem Platz
 * sitzt — dieselbe Frage, die die Reiter oben beantworten, nur ohne zu
 * zeigen, was man dann sieht. Was dieses Gerät ist, steht jetzt allein dort
 * (`stationUi.ts`, `rules/lobby.LobbyChoice.me`); die Tafel sagt nur noch,
 * **wer** die Plätze hält und **was** jeder darf.
 *
 * **Und die Fähigkeiten hängen am Platz, nicht an einer Liste daneben.** Das
 * war der Wunsch des Besitzers, und er löst nebenbei die Frage nach dem
 * Licht: Der Techniker schaltet Lampen genau dann per Tipp, wenn in seiner
 * Zeile „Schalttafel" leuchtet. Unter einer Zeile mit Fähigkeiten steht, wie
 * die Mischung heißt (`roleName`) — Rot mit Radar und Tafel ist die
 * „Einsatzkontrolle", und so ruft man es sich am Tisch zu.
 *
 * Reines DOM ohne Rahmen; die Farben kommen aus `haunting.css` (`.setup`).
 */
export interface SetupPanelHost {
  setup(): RoundSetup;
  onChange(setup: RoundSetup): void;
  /**
   * Ob das Monster als Mensch hier überhaupt spielbar ist. Eine Frage und
   * kein Wert: Die Ansicht wechselt über das Häkchen, während die Tafel schon
   * steht — ein beim Bauen abgelesenes `true` bliebe stehen.
   */
  humanMonster?(): boolean;
  /**
   * Ob jemand mit der Brille im Raum ist. Dann trägt **er** den Anzug: Die
   * Zeile des Technikers heißt „VR" und lässt sich nicht umstellen.
   */
  vr?(): boolean;
  /**
   * Wer diesen Platz über das Netz hält, als Name — `null` heißt: niemand
   * sitzt dort. Steht klein unter der Zeile, damit „Mensch" keine Behauptung
   * bleibt: Wer sie liest, weiß, ob schon jemand am Telefon sitzt.
   */
  holder?(seat: SeatId): string | null;
  /**
   * **Was dieses Gerät ist** (`rules/lobby.LobbyChoice.me`) — und der Tipp
   * auf „Ich" in einer Zeile, der es zu diesem Platz macht. Die Reiterzeile
   * oben tut dasselbe; aber wer auf der Tafel liest, wer wer ist, will an
   * derselben Stelle sagen können „das bin ich" — der Wunsch des Besitzers,
   * nachdem die alte Spalte „Ich" gestrichen war.
   */
  me?(): MyRole;
  choose?(seat: SeatId): void;
  /**
   * **Wer im Anzug steckt**, als Name — die Brille oder der Techniker am
   * Bildschirm („Web 3D"), der schon beim Betreten der Techniker ist. Steht
   * ein Name hier, zeigt die Zeile des Technikers ihn statt „Ich · Mensch ·
   * Bot": Der Platz ist vergeben, und es gibt nichts zu wählen. `null`
   * heißt: niemand trägt ihn, die Knöpfe bleiben.
   */
  technician?(): string | null;
}

export class SetupPanel {
  readonly element = el('div', 'setup');

  constructor(private readonly host: SetupPanelHost) {
    this.element.addEventListener('click', (event) => this.click(event));
    this.render();
  }

  render(): void {
    const setup = this.host.setup();
    const vr = this.host.vr?.() ?? false;
    const parts: HTMLElement[] = [];
    for (const seat of SEATS) {
      if (seat === 'red') parts.push(head('Einsatzzentrale'));
      if (seat === 'monster') parts.push(head('Gegenseite'));
      parts.push(this.row(setup, seat, vr));
    }
    parts.push(
      el(
        'small',
        'setup__hint',
        'Mensch: jemand am Gerät · Bot: rechnet die Runde · Aus: der Platz bleibt leer. ' +
          'Die Lämpchen sagen, welche Fähigkeiten ein Platz hält — der Techniker schaltet ' +
          'Lampen und Türen nur mit „Schalttafel", und Ziele sieht er nur mit „Archiv".',
      ),
    );
    this.element.replaceChildren(...parts);
  }

  private row(setup: RoundSetup, seat: SeatId, vr: boolean): HTMLElement {
    const one = setup.seats[seat];
    const line = el('div', `setup__seat setup__seat--${seat}`);
    line.dataset['seat'] = seat;
    const label = el('div', 'setup__label');
    const abilities = seatAbilities(setup, seat);
    const name = roleName(abilities);
    label.append(
      el('strong', '', SEAT_LABELS[seat]),
      el('small', '', name && one.who !== 'off' ? name : SEAT_HINTS[seat]),
    );
    line.append(label);

    // **Der Anzug hat einen Namen.** Brille und „Web 3D" kommen als Techniker
    // herein; die Zeile sagt dann, wer es ist, und fragt nicht mehr, ob ein
    // Mensch oder ein Bot ihn tragen soll — der Wunsch des Besitzers.
    const suit = seat === 'technician' ? (this.host.technician?.() ?? null) : null;
    if (suit) {
      const mine = this.host.me?.() === 'technician';
      const chip = el('div', `setup__suit${mine ? ' is-mine' : ''}`);
      chip.dataset['setupSuit'] = '';
      chip.append(el('strong', '', suit), el('span', '', mine ? 'du · im Anzug' : 'im Anzug'));
      chip.setAttribute('aria-label', `Techniker: ${suit}${mine ? ' (du)' : ''}`);
      line.append(chip);
      line.append(this.powers(seat, one));
      return line;
    }

    // **„Ich"**: dieser Platz ist meiner. Leuchtet auf der Zeile, die dieses
    // Gerät hält; beim Techniker gesperrt, solange die Brille ihn trägt.
    if (this.host.choose) {
      const mine = this.host.me?.() === seat;
      const me = el('button', `setup__key setup__key--me${mine ? ' is-active' : ''}`, 'Ich');
      me.dataset['setupMe'] = '';
      me.setAttribute('aria-pressed', mine ? 'true' : 'false');
      me.setAttribute('aria-label', `${SEAT_LABELS[seat]}: das bin ich`);
      if (seat === 'technician' && vr && !mine) me.toggleAttribute('disabled', true);
      line.append(me);
    }

    // **Drei Knöpfe, nicht ein Zykler.** Ein Knopf, der weiterzählt, ohne zu
    // zeigen, was als Nächstes kommt, war der alte Fehler; drei Knöpfe zeigen
    // alle Antworten auf einmal, und eine davon leuchtet.
    const whos = el('div', 'setup__whos');
    whos.setAttribute('role', 'group');
    whos.setAttribute('aria-label', `${SEAT_LABELS[seat]}: wer hält den Platz`);
    const lockedTechnician = seat === 'technician' && vr;
    for (const who of WHOS) {
      // Der Techniker kennt kein „Aus": Eine Runde ohne Anzug gibt es nicht.
      if (seat === 'technician' && who === 'off') continue;
      const active = lockedTechnician ? who === 'human' : one.who === who;
      const key = el('button', `setup__key setup__key--who is-${who}${active ? ' is-active' : ''}`);
      key.textContent = lockedTechnician && who === 'human' ? 'VR' : WHO_LABELS[who];
      key.dataset['setupWho'] = who;
      key.setAttribute('aria-pressed', active ? 'true' : 'false');
      key.setAttribute(
        'aria-label',
        `${SEAT_LABELS[seat]}: ${lockedTechnician && who === 'human' ? 'VR — der Spieler in der Brille' : WHO_LABELS[who]}`,
      );
      // **Ein Knopf, der nichts mehr tut, wird auch keiner.** Solange jemand
      // die Brille auf hat, ist der Techniker vergeben; ein drückbares „Bot"
      // hieße, dass man ihn wegklicken kann, und genau das darf niemand.
      if (lockedTechnician) key.toggleAttribute('disabled', true);
      if (seat === 'monster' && who === 'human' && this.host.humanMonster?.() === false)
        key.title = 'Am Stock nur in der 2D-Welt';
      whos.append(key);
    }
    line.append(whos);

    if (seat !== 'monster') line.append(this.powers(seat, one));

    const held = this.host.holder?.(seat) ?? null;
    if (held || (one.who === 'human' && seat !== 'technician'))
      line.append(el('small', 'setup__holder', held ?? 'noch niemand am Gerät'));
    return line;
  }

  /**
   * **Die Fähigkeiten als Lämpchen**: gelb hält, grau hält nicht. Sie stehen
   * auch bei einem Platz, der aus ist — grau —, damit die Zeile ihre Form
   * behält und niemand rät, ob da noch etwas käme.
   */
  private powers(seat: SeatId, one: RoundSetup['seats'][SeatId]): HTMLElement {
    const powers = el('div', 'setup__powers');
    powers.setAttribute('role', 'group');
    powers.setAttribute('aria-label', `${SEAT_LABELS[seat]}: Fähigkeiten`);
    for (const ability of ABILITIES) {
      const on = one.powers[ability];
      const lamp = el('button', `setup__lamp${on ? ' is-on' : ''}`, ABILITY_LABELS[ability]);
      lamp.dataset['setupPower'] = ability;
      lamp.setAttribute('aria-pressed', on ? 'true' : 'false');
      lamp.title = ABILITY_HINTS[ability];
      powers.append(lamp);
    }
    return powers;
  }

  private click(event: Event): void {
    const key = (event.target as HTMLElement | null)?.closest('button');
    if (!key || key.hasAttribute('disabled')) return;
    const line = key.closest<HTMLElement>('[data-seat]');
    const seat = line?.dataset['seat'] as SeatId | undefined;
    if (!seat || !SEATS.includes(seat)) return;
    if (key.dataset['setupMe'] !== undefined) {
      event.stopPropagation();
      // Die Wahl schreibt selbst Lobby und Tafel (`stationUi.choose`) und
      // zeichnet die Seite neu — hier bleibt nichts zu tun.
      this.host.choose?.(seat);
      return;
    }
    const read = this.host.setup();
    let setup: RoundSetup;
    const who = key.dataset['setupWho'] as SeatWho | undefined;
    const power = key.dataset['setupPower'] as Ability | undefined;
    if (who && WHOS.includes(who)) setup = withWho(read, seat, who);
    else if (power && ABILITIES.includes(power))
      setup = withPower(read, seat, power, !read.seats[seat].powers[power]);
    else return;
    event.stopPropagation();
    saveSetup(setup);
    this.host.onChange(setup);
    this.render();
  }
}

function head(text: string): HTMLElement {
  const node = el('div', 'setup__head');
  node.append(el('span', '', text));
  return node;
}

function el(tag: string, className: string, text = ''): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
