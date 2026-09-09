import type { HouseSpec } from '../house';
import type { HauntState } from '../net';
import type { MapSnapshot } from '../map/mapSnapshot';
import { listRoles, type RoleDefinition, type RoleHost, type RoleView } from '../registry/roles';
import { el, key } from './dom';
import type { ViewExtras } from './extras';
import { applySwitch } from './switchState';

/**
 * **Rollenwechsel im Testmodus** — über der laufenden 2D-Welt, ohne sie
 * anzuhalten.
 *
 * Die 2D-Welt (`map/flatMode.ts`) rechnet ihre Runde selbst und bleibt dabei
 * am Leben: Der Techniker steht weiter auf seiner Karte, das Monster geht
 * weiter, die Uhr läuft. Was hier wechselt, ist nur, **wer hinschaut**: Ein
 * Streifen mit vier Knöpfen — Techniker, Archiv, Schalttafel, Späher —, und
 * jeder Knopf außer dem ersten legt eine Rollenansicht über die Welt und
 * blendet den Stock aus. Zurück zum Techniker heißt: Ansicht weg, Welt wieder
 * sichtbar, an derselben Stelle, in derselben Sekunde.
 *
 * Die Rollen lesen den Stand der Runde über denselben `RoleHost` wie im Van
 * (`roundHost`); die Schalttafel schaltet direkt im Stand der Runde, weil es
 * im Testmodus keinen Gastgeber und kein Netz gibt (`applySwitch`).
 */
export const PLAY_ID = 'play';

/** Was eine laufende Runde dem Wechsel geben muss — die `FlatRound` kann das. */
export interface RunningRound {
  snapshot(): MapSnapshot;
  spec(): HouseSpec;
  state(): HauntState;
}

export interface RoundHostOptions {
  me?: () => string;
  nameOf?: (peer: string) => string;
  notify?: (text: string) => void;
}

/** Der `RoleHost` über einer laufenden Runde — ohne Netz, ohne Gastgeber. */
export function roundHost(round: RunningRound, options: RoundHostOptions = {}): RoleHost {
  const extra: ViewExtras = { spec: () => round.spec(), state: () => round.state() };
  return {
    snapshot: () => round.snapshot(),
    me: () => options.me?.() ?? 'me',
    nameOf: (peer) => options.nameOf?.(peer) ?? peer,
    flip: (id, on) => {
      applySwitch(round.state(), round.spec(), id, on);
    },
    notify: (text) => options.notify?.(text),
    extra,
  };
}

export interface RoleSwitcherOptions {
  /** Die 2D-Welt — wird ausgeblendet, solange eine Rolle darüberliegt. */
  play: HTMLElement;
  /** Welche Rollen angeboten werden; sonst alle mit `surface: 'map'`. */
  roles?: readonly RoleDefinition[];
}

export class RoleSwitcher {
  readonly element = el('div', 'roles');
  private readonly strip = el('nav', 'roles__strip');
  private readonly slot = el('div', 'roles__slot');
  private readonly roles: readonly RoleDefinition[];
  private view: { id: string; view: RoleView } | null = null;
  private active = PLAY_ID;

  constructor(
    private readonly host: RoleHost,
    private readonly options: RoleSwitcherOptions,
  ) {
    this.roles = options.roles ?? listRoles().filter((role) => role.surface === 'map');
    this.strip.setAttribute('aria-label', 'Rolle im Testmodus');
    this.strip.append(key('roles__chip', 'Techniker', { role: PLAY_ID }));
    for (const role of this.roles)
      this.strip.append(key('roles__chip', role.label, { role: role.id }));
    this.strip.addEventListener('click', (event) => {
      const hit = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-role]');
      if (hit?.dataset['role']) this.select(hit.dataset['role']);
    });
    this.slot.hidden = true;
    this.element.append(this.strip, this.slot);
    this.mark();
  }

  /** Welche Rolle gerade schaut — `play` ist der Techniker mit dem Stock. */
  get current(): string {
    return this.active;
  }

  /** Die gerade gebaute Ansicht — für Tests. */
  get mounted(): RoleView | null {
    return this.view?.view ?? null;
  }

  select(id: string): void {
    if (id === this.active) return;
    const role = id === PLAY_ID ? null : this.roles.find((one) => one.id === id);
    if (id !== PLAY_ID && !role) return;
    this.drop();
    this.active = id;
    if (role) {
      const view = role.mount(this.host);
      this.view = { id, view };
      this.slot.replaceChildren(view.element);
      this.slot.hidden = false;
      this.options.play.hidden = true;
      view.update(0);
    } else {
      this.slot.hidden = true;
      this.options.play.hidden = false;
    }
    this.mark();
  }

  update(dt: number): void {
    this.view?.view.update(dt);
  }

  private drop(): void {
    this.view?.view.dispose();
    this.view = null;
    this.slot.replaceChildren();
  }

  private mark(): void {
    for (const chip of this.strip.querySelectorAll<HTMLElement>('[data-role]'))
      chip.setAttribute('aria-pressed', chip.dataset['role'] === this.active ? 'true' : 'false');
  }

  dispose(): void {
    this.drop();
    this.options.play.hidden = false;
    this.element.remove();
  }
}
