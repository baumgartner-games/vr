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
import { clickedKey, el } from './ui/dom';
import { head, pillKey } from './ui/widgets';

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
 * **Ein „Ich" gibt es auf der Tafel nicht.** Es stand zweimal hier — als
 * Spalte, dann als Knopf je Zeile — und zweimal wieder weg, zuletzt auf
 * Wunsch des Besitzers: Oben die Reiter, unten „Ich", das war dieselbe Frage
 * an zwei Stellen. Die Tafel sagt, **wer** die Plätze hält und **was** jeder
 * darf; welcher Platz der eigene ist, wählt man nach „Rollen testen" über
 * die Reiter der Karte (`stationUi.ts`, `rules/lobby.LobbyChoice.me`).
 *
 * **Und die Fähigkeiten hängen am Platz, nicht an einer Liste daneben.** Das
 * war der Wunsch des Besitzers, und er löst nebenbei die Frage nach dem
 * Licht: Der Techniker schaltet Lampen genau dann per Tipp, wenn in seiner
 * Zeile „Schalttafel" leuchtet. Unter einer Zeile mit Fähigkeiten steht, wie
 * die Mischung heißt (`roleName`) — Rot mit Radar und Tafel ist die
 * „Einsatzkontrolle", und so ruft man es sich am Tisch zu.
 *
 * Reines DOM ohne Rahmen, aus den Bausteinen von `ui/widgets.ts`; die Farben
 * kommen aus `haunting.css` (`.setup`).
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
   * **Was dieses Gerät ist** (`rules/lobby.LobbyChoice.me`) — nur zum Lesen:
   * Die Zeile des Technikers sagt „du · im Anzug", wenn es der eigene ist.
   */
  me?(): MyRole;
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
      const vrSuit = lockedTechnician && who === 'human';
      const node = pillKey(
        {
          text: vrSuit ? 'VR' : WHO_LABELS[who],
          data: { setupWho: who },
          active,
          pressed: active,
          ariaLabel: `${SEAT_LABELS[seat]}: ${vrSuit ? 'VR — der Spieler in der Brille' : WHO_LABELS[who]}`,
          // **Ein Knopf, der nichts mehr tut, wird auch keiner.** Solange jemand
          // die Brille auf hat, ist der Techniker vergeben; ein drückbares „Bot"
          // hieße, dass man ihn wegklicken kann, und genau das darf niemand.
          disabled: lockedTechnician,
        },
        `setup__key setup__key--who is-${who}`,
      );
      if (seat === 'monster' && who === 'human' && this.host.humanMonster?.() === false)
        node.title = 'Am Stock nur in der 2D-Welt';
      whos.append(node);
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
      powers.append(
        pillKey(
          {
            text: ABILITY_LABELS[ability],
            data: { setupPower: ability },
            active: on,
            pressed: on,
            title: ABILITY_HINTS[ability],
          },
          'setup__lamp',
        ),
      );
    }
    return powers;
  }

  private click(event: Event): void {
    const key = clickedKey(event);
    if (!key || key.disabled) return;
    const line = key.closest<HTMLElement>('[data-seat]');
    const seat = line?.dataset['seat'] as SeatId | undefined;
    if (!seat || !SEATS.includes(seat)) return;
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
