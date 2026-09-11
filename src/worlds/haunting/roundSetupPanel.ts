import {
  ABILITIES,
  ABILITY_HINTS,
  ABILITY_LABELS,
  WHO_LABELS,
  cycleAbility,
  cycleMonster,
  cycleWho,
  humanAbilities,
  powersOf,
  roleName,
  saveSetup,
  technicianLabel,
  type Ability,
  type RoundSetup,
} from './rules/roundSetup';

/**
 * **Die Tafel, an der eine Runde verteilt wird** — das Herz des Aufbaus, im
 * Van, in der Brille und überall, wo eine Runde vorbereitet wird.
 *
 * Fünf Zeilen: der Techniker (Mensch, Bot — oder **VR**, wenn jemand mit der
 * Brille im Raum steht, und dann nicht änderbar), das Monster (Mensch, Bot
 * oder aus) und die **drei Fähigkeiten** der Einsatzzentrale, jede mit
 * `Bot / Mensch / Aus`. Jeder Tipp schreibt die Einstellung sofort
 * (`saveSetup`) und ruft `onChange`; gestartet wird nicht hier, sondern mit
 * dem einen Knopf darunter. Reines DOM ohne Rahmen; die Farben kommen aus
 * `haunting.css` (`.setup`), damit die Tafel überall gleich aussieht.
 *
 * **„+ Platz" ist weg, und mit ihm die Liste, die wachsen konnte.** Vorher
 * standen hier so viele Plätze, wie jemand angelegt hatte — zwei Archivare
 * waren möglich, keiner auch. Wer die Tafel las, wusste nicht, welche
 * Auskünfte es in dieser Runde überhaupt gibt. Jetzt stehen alle drei
 * Fähigkeiten immer da; „Aus" ist eine Antwort und kein fehlender Eintrag.
 *
 * **Und darunter steht, wie die Mischung heißt** (`roleName`): Wer als Mensch
 * Radar und Schalttafel hält, sitzt in der „Einsatzkontrolle", mit Akte und
 * Radar in der „Aufklärung". Der Besitzer wollte mischen können — dann muss
 * die Mischung auch einen Namen haben, sonst ruft man sich am Tisch Listen zu.
 *
 * Die Spalte „Ich" bleibt: Ein Tipp darauf ist beides zugleich — die Zeile
 * wird „Mensch", und dieses Gerät setzt sich dorthin (`SetupPanelHost.claim`).
 * „Ich" gibt es genau einmal; wer es woanders hinsetzt, nimmt es dort weg.
 */

/** Ein Platz der Runde, so wie „Ich" ihn benennt. */
export type SetupSlot = 'technician' | 'monster' | `power:${Ability}`;

/** Aus einer Fähigkeit den Platz machen, den „Ich" meint. */
export function slotOf(ability: Ability): SetupSlot {
  return `power:${ability}`;
}

/** Und wieder zurück — `null`, wenn dieser Platz keine Fähigkeit ist. */
export function abilityOf(slot: SetupSlot): Ability | null {
  if (!slot.startsWith('power:')) return null;
  const rest = slot.slice(6) as Ability;
  return ABILITIES.includes(rest) ? rest : null;
}

export interface SetupPanelHost {
  setup(): RoundSetup;
  onChange(setup: RoundSetup): void;
  /**
   * Ob das Monster als Mensch hier überhaupt spielbar ist (nur in der 2D-Welt).
   * Eine Frage und kein Wert: Die Ansicht wechselt über das Häkchen, während
   * die Tafel schon steht — ein beim Bauen abgelesenes `true` bliebe stehen.
   */
  humanMonster?(): boolean;
  /**
   * Ob jemand mit der Brille im Raum ist. Dann trägt **er** den Anzug: Die
   * Zeile heißt „VR" und lässt sich nicht drücken.
   */
  vr?(): boolean;
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
   * dort rechnet ein Bot. Steht unter jeder Fähigkeit.
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
    const vr = this.host.vr?.() ?? false;
    const parts: HTMLElement[] = [];
    const technician = this.row(
      'Techniker',
      'setup-technician',
      technicianLabel(setup, vr),
      vr ? 'Der Spieler in der Brille — er trägt den Anzug' : 'Stock und Knöpfe · oder aus Zahlen',
      claims && !vr ? 'technician' : null,
      mine,
    );
    // **Ein Knopf, der nichts mehr tut, wird auch keiner.** Solange jemand die
    // Brille auf hat, ist der Techniker vergeben; ein drückbares „VR" hieße,
    // dass man ihn wegklicken kann, und genau das darf niemand.
    if (vr) technician.querySelector('button')?.toggleAttribute('disabled', true);
    parts.push(
      technician,
      this.row(
        'Monster',
        'setup-monster',
        WHO_LABELS[setup.monster],
        setup.monster === 'off'
          ? 'Sicherer Test ohne Gegner'
          : setup.monster === 'human' && this.host.humanMonster?.() === false
            ? 'Am Stock nur in der 2D-Welt'
            : 'Aus Zahlen · oder am Stock (2D)',
        claims ? 'monster' : null,
        mine,
      ),
    );
    parts.push(head('Einsatzzentrale'));
    for (const ability of ABILITIES) {
      const slot = slotOf(ability);
      const who = setup.abilities[ability];
      const line = el('div', 'setup__seat');
      const label = el('div', 'setup__label');
      label.append(
        el('strong', '', ABILITY_LABELS[ability]),
        el('small', '', ABILITY_HINTS[ability]),
      );
      const key = el('button', `setup__key setup__key--who is-${who}`, WHO_LABELS[who]);
      key.dataset['setupAbility'] = ability;
      key.setAttribute(
        'aria-label',
        `${ABILITY_LABELS[ability]}: ${WHO_LABELS[who]} — antippen wechselt`,
      );
      line.append(label, key);
      if (claims) line.append(meKey(slot, mine === slot));
      // **Unter der Fähigkeit steht, wer sie wirklich hält** — der Name aus dem
      // Netz oder „Bot". Ohne diese Zeile ist „Mensch" eine Behauptung: Wer sie
      // liest, weiß nicht, ob schon jemand am Telefon sitzt oder ob nur jemand
      // den Knopf umgestellt hat.
      const held = this.host.holder?.(slot) ?? null;
      parts.push(
        line,
        el(
          'small',
          'setup__holder',
          held ?? (who === 'human' ? 'noch niemand am Telefon' : who === 'bot' ? 'Bot' : 'niemand'),
        ),
      );
    }
    const humans = humanAbilities(setup);
    parts.push(
      el(
        'small',
        'setup__hint',
        humans.length
          ? `Mensch in der Zentrale: ${roleName(humans)} (${humans.map((one) => ABILITY_LABELS[one]).join(' + ')}).`
          : 'Kein Mensch in der Zentrale — der Techniker ist auf sich und die Bots gestellt.',
      ),
    );
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
          ? `Bot-Fähigkeiten gibt der Techniker sich selbst: ${granted.join(', ')}.`
          : 'Ein Mensch sagt es dem Techniker — oder niemand.',
      ),
    );
    this.element.replaceChildren(...parts);
  }

  private click(event: Event): void {
    const key = (event.target as HTMLElement | null)?.closest('button');
    if (!key || key.hasAttribute('disabled')) return;
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
    const read = this.host.setup();
    const setup: RoundSetup = { ...read, abilities: { ...read.abilities } };
    if (data['setupTechnician'] !== undefined) setup.technician = cycleWho(setup.technician);
    else if (data['setupMonster'] !== undefined) setup.monster = cycleMonster(setup.monster);
    else if (data['setupAbility'] !== undefined) {
      const ability = data['setupAbility'] as Ability;
      setup.abilities[ability] = cycleAbility(setup.abilities[ability]);
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
