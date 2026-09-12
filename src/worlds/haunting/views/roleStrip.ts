import { roles, type RoleHost, type RoleView } from '../registry/roles';
import {
  isColour,
  isWatcher,
  seatAbilities,
  type MyRole,
  type RoundSetup,
} from '../rules/roundSetup';
import { roleTabKey, roleTabs } from './roleTabs';
import { el } from './roleShell';
import { mountSeatView } from './seatRole';

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
 * **Angeboten werden die Plätze, nicht die Karten** (`roleTabs.ts`): Techniker,
 * Rot, Gelb, Blau, Monster, Zuschauer: Techniker, Zuschauer: Alles — dieselben
 * sieben Reiter wie über der Karte des Telefons. Vorher standen hier Archiv,
 * Schalttafel und Späher, also die Karten der Registry, und in der Mission
 * hieß die Zeile damit anders als im Test auf dem Telefon; der Besitzer
 * wollte eine Zeile. Ein **Farbplatz** schlägt die Karte mit allem auf, was
 * der Platz laut Tafel hält (`seatRole.ts` — ein Stuhl, eine Karte), das
 * **Monster** seine angemeldete Ansicht; **Techniker** und die **Zuschauer**
 * schlagen nichts auf, sondern sagen dem Wirt, wer man jetzt ist (`pick`):
 * Zurück an den Stock, oder zusehen — dem Techniker folgend oder die ganze
 * Station als Karte.
 *
 * **Und nicht in jeder Runde.** Wer hier sitzt, ist der Techniker (oder das
 * Monster) — und der wechselt mitten in einer Mission die Rolle nicht, so wie
 * es niemand sonst tut, der nicht in der Einsatzzentrale sitzt
 * (`rules/roundSetup.switchRights`). In einer **Test-Runde** darf er alles;
 * dafür ist sie da. Die Knöpfe bleiben dabei stehen und werden nur
 * abgeschaltet: Ein Streifen, der in der einen Runde da ist und in der
 * nächsten fehlt, ist einer, den man sucht — und der Grund steht als Titel
 * daran. Zusehen und zurück an den Stock gehen immer.
 */
export interface RoleStripHost {
  /** Der Wirt, den eine aufgeschlagene Rolle bekommt. */
  roleHost(): RoleHost;
  /** Die Tafel — wer welchen Platz hält und was er darf. `null` ohne Tafel. */
  setup(): RoundSetup | null;
  /** Wer man hier gerade ist — der Reiter, der gelb umrandet steht. */
  me(): MyRole;
  /** Eine Rolle liegt jetzt über der Szene — oder wieder keine. */
  onChange(id: string): void;
  /**
   * Ob hier gerade überhaupt gewechselt werden darf, und warum nicht
   * (`rules/roundSetup.switchRights`). Fehlt die Auskunft, ist alles erlaubt —
   * eine Ansicht ohne Runde (Tests) soll ihre Rollen zeigen dürfen.
   */
  rights?(): { allowed: boolean; why: string };
  /**
   * **Ein Reiter, der nichts aufschlägt**: Techniker (zurück an den Stock)
   * und die zwei Zuschauer. Der Wirt entscheidet, was das für ihn heißt.
   */
  pick?(id: 'technician' | 'watch:technician' | 'watch:all'): void;
}

export class RoleStrip {
  readonly element = el('div', 'role-strip');
  /** Wohin die aufgeschlagene Rolle gehängt wird. */
  readonly stage = el('div', 'role-stage');
  private view: RoleView | null = null;
  private open: '' | MyRole = '';

  constructor(private readonly host: RoleStripHost) {
    this.element.setAttribute('role', 'tablist');
    this.element.setAttribute('aria-label', 'Rolle');
    this.element.addEventListener('click', (event) => {
      const key = (event.target as HTMLElement | null)?.closest('button');
      const id = key?.dataset['roleStrip'];
      if (id === undefined) return;
      this.show(id as '' | MyRole);
    });
    this.stage.hidden = true;
    this.render();
  }

  /** Welche Rolle gerade über der Szene liegt — `''` heißt: die 2D-Welt selbst. */
  get active(): string {
    return this.open;
  }

  /** Ob der Streifen gerade etwas wechseln lässt — und warum nicht. */
  get rights(): { allowed: boolean; why: string } {
    return this.host.rights?.() ?? { allowed: true, why: '' };
  }

  /**
   * Einen Reiter nehmen — oder mit `''` zurück zur Szene. Ein Farbplatz und
   * das Monster legen ihre Ansicht über die Szene; die alte wird abgebaut (ihr
   * `dispose` gibt frei, was sie hält), die Runde merkt davon nichts.
   * Techniker und Zuschauer gehen an den Wirt.
   */
  show(id: '' | MyRole): void {
    if (id && (id === 'technician' || isWatcher(id))) {
      this.close();
      this.host.pick?.(id);
      this.render();
      return;
    }
    if (id === this.open) return;
    // Zurück zur Szene ist immer erlaubt: Wer eine Rolle offen hat, während
    // die Runde die Rechte entzieht, säße sonst darin fest.
    if (id && !this.rights.allowed) return;
    const view = id ? this.mount(id) : null;
    if (id && !view) return;
    this.close();
    if (view) {
      this.view = view;
      this.stage.replaceChildren(view.element);
      this.open = id;
    }
    this.stage.hidden = !this.view;
    this.render();
    this.host.onChange(this.open);
  }

  /**
   * Die Ansicht zu einem Reiter: Ein Farbplatz bekommt die eine Karte mit
   * allen Fähigkeiten, die die Tafel ihm gibt — hält er keine, sagt der
   * Streifen das, statt eine leere Karte aufzuschlagen —, das Monster seine
   * Ansicht aus der Registry.
   */
  private mount(id: MyRole): RoleView | null {
    const host = this.host.roleHost();
    if (isColour(id)) {
      const setup = this.host.setup();
      const abilities = setup ? seatAbilities(setup, id) : [];
      if (abilities.length === 0) {
        host.notify(
          `${roleTabs(setup).find((tab) => tab.id === id)?.name ?? id} hält keine Fähigkeit — im Aufbau eine zuweisen.`,
        );
        return null;
      }
      return mountSeatView(host, abilities);
    }
    const role = roles.get(id);
    if (!role) {
      host.notify(`Für „${id}" ist keine Ansicht angemeldet.`);
      return null;
    }
    return role.mount(host);
  }

  private close(): void {
    this.view?.dispose();
    this.view = null;
    const was = this.open;
    this.open = '';
    this.stage.replaceChildren();
    this.stage.hidden = true;
    if (was) this.host.onChange('');
  }

  /** Aus dem Takt der 2D-Welt: Die offene Rolle zeichnet sich selbst. */
  update(dt: number): void {
    this.view?.update(dt);
  }

  private render(): void {
    const me = this.host.me();
    const rights = this.rights;
    this.element.replaceChildren(
      ...roleTabs(this.host.setup()).map((tab) => {
        const opens = isColour(tab.id) || tab.id === 'monster';
        const key = roleTabKey(tab, {
          mine: tab.id === me,
          open: opens ? tab.id === this.open : tab.id === me && !this.open,
          ...(opens && !rights.allowed ? { blocked: rights.why } : {}),
        });
        key.dataset['roleStrip'] = tab.id;
        return key;
      }),
    );
  }

  /** Die Knöpfe neu zeichnen, wenn sich draußen etwas geändert hat. */
  refresh(): void {
    this.render();
  }

  dispose(): void {
    this.view?.dispose();
    this.view = null;
    this.element.remove();
    this.stage.remove();
  }
}
