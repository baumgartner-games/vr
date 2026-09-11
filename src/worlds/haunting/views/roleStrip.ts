import { listRoles, type RoleDefinition, type RoleHost, type RoleView } from '../registry/roles';
import { el } from './roleShell';

/**
 * **Der Streifen über der 2D-Welt** — Rollenwechsel, ohne dass etwas neu
 * aufgebaut wird.
 *
 * Wer die Station im 2D-Testmodus laufen hat, will die Rollen ausprobieren,
 * und zwar an **dieser** Runde: Was die Schalttafel schaltet, soll der
 * Techniker eine Sekunde später vor sich haben, und was der Späher peilt, soll
 * dasselbe Monster sein. Deshalb wird hier nichts gestartet und nichts
 * verworfen — die laufende `FlatRound` bleibt stehen, rechnet weiter, und die
 * Rolle legt sich als Ansicht darüber, die denselben Snapshot liest wie die
 * Szene darunter.
 *
 * Angeboten wird, was die Registry an Karten hergibt (`surface: 'map'`), also
 * genau die drei Nicht-VR-Rollen und das Monster, sobald es angemeldet ist.
 * Der Fernseher steht nicht dabei: Sein Bild ist die 3D-Welt, und die gibt es
 * hier nicht.
 *
 * **Und nicht in jeder Runde.** Wer hier sitzt, ist der Techniker (oder das
 * Monster) — und der wechselt mitten in einer Mission die Rolle nicht, so wie
 * es niemand sonst tut, der nicht in der Einsatzzentrale sitzt
 * (`rules/roundSetup.switchRights`). In einer **Test-Runde** darf er alles;
 * dafür ist sie da. Die Knöpfe bleiben dabei stehen und werden nur
 * abgeschaltet: Ein Streifen, der in der einen Runde da ist und in der
 * nächsten fehlt, ist einer, den man sucht — und der Grund steht als Titel
 * daran.
 */
export interface RoleStripHost {
  /** Der Wirt, den eine aufgeschlagene Rolle bekommt. */
  roleHost(): RoleHost;
  /** Wie die 2D-Welt selbst in der Leiste heißt. */
  homeLabel(): string;
  /** Eine Rolle liegt jetzt über der Szene — oder wieder keine. */
  onChange(id: string): void;
  /**
   * Ob hier gerade überhaupt gewechselt werden darf, und warum nicht
   * (`rules/roundSetup.switchRights`). Fehlt die Auskunft, ist alles erlaubt —
   * eine Ansicht ohne Runde (Tests) soll ihre Rollen zeigen dürfen.
   */
  rights?(): { allowed: boolean; why: string };
}

export class RoleStrip {
  readonly element = el('div', 'role-strip');
  /** Wohin die aufgeschlagene Rolle gehängt wird. */
  readonly stage = el('div', 'role-stage');
  private view: RoleView | null = null;
  private open = '';

  constructor(private readonly host: RoleStripHost) {
    this.element.setAttribute('role', 'tablist');
    this.element.setAttribute('aria-label', 'Rolle');
    this.element.addEventListener('click', (event) => {
      const key = (event.target as HTMLElement | null)?.closest('button');
      const id = key?.dataset['roleStrip'];
      if (id === undefined) return;
      this.show(id);
    });
    this.stage.hidden = true;
    this.render();
  }

  /** Welche Rolle gerade offen ist — `''` heißt: die 2D-Welt selbst. */
  get active(): string {
    return this.open;
  }

  /** Die Rollen, die der Streifen anbietet. */
  get roles(): RoleDefinition[] {
    return listRoles().filter((role) => role.surface === 'map');
  }

  /** Ob der Streifen gerade etwas wechseln lässt — und warum nicht. */
  get rights(): { allowed: boolean; why: string } {
    return this.host.rights?.() ?? { allowed: true, why: '' };
  }

  /**
   * Eine Rolle aufschlagen — oder mit `''` zurück zur Szene. Die alte Ansicht
   * wird abgebaut (ihr `dispose` gibt frei, was sie hält); die Runde merkt
   * davon nichts.
   */
  show(id: string): void {
    if (id === this.open) return;
    // Zurück zur Szene ist immer erlaubt: Wer eine Rolle offen hat, während
    // die Runde die Rechte entzieht, säße sonst darin fest.
    if (id && !this.rights.allowed) return;
    this.view?.dispose();
    this.view = null;
    this.open = '';
    const role = id ? this.roles.find((one) => one.id === id) : null;
    if (role) {
      this.view = role.mount(this.host.roleHost());
      this.stage.replaceChildren(this.view.element);
      this.open = role.id;
    } else this.stage.replaceChildren();
    this.stage.hidden = !this.view;
    this.render();
    this.host.onChange(this.open);
  }

  /** Aus dem Takt der 2D-Welt: Die offene Rolle zeichnet sich selbst. */
  update(dt: number): void {
    this.view?.update(dt);
  }

  private render(): void {
    const entries: Array<{ id: string; label: string }> = [
      { id: '', label: this.host.homeLabel() },
      ...this.roles.map((role) => ({ id: role.id, label: role.label })),
    ];
    this.element.replaceChildren(
      ...entries.map((entry) => {
        const key = el('button', 'role-strip__key', entry.label);
        key.dataset['roleStrip'] = entry.id;
        const active = entry.id === this.open;
        key.classList.toggle('is-active', active);
        key.setAttribute('aria-pressed', String(active));
        const rights = this.rights;
        if (entry.id && !rights.allowed) {
          key.disabled = true;
          key.title = rights.why;
        }
        return key;
      }),
    );
  }

  dispose(): void {
    this.view?.dispose();
    this.view = null;
    this.element.remove();
    this.stage.remove();
  }
}
