import * as THREE from 'three';
import { WristMenu, type MenuModelFactory, type WristMenuOptions } from './WristMenu';
import { PagePreviews } from './PagePreviews';
import type { MenuClipSource } from './PageDetail';
import { MenuNav } from './menuNav';
import type { MenuEntry } from './menu';
import type { PageMenu } from './PageMenu';
import type { Pointer } from '../core/Pointer';
import type { Handedness, XRInput } from '../core/XRInput';

/**
 * The same menu on **both** wrists — and never two panels at once.
 *
 * One menu on the left hand was fine right up to the moment the left hand was
 * doing something: holding a pistol, flying a drone, steering a kart. The
 * button then sat under whatever was in that hand and the only way back to the
 * menu was to put the thing down. So both wrists carry one now. They show the
 * same tree and the same status line; opening one closes the other, because
 * two panels floating in front of a player is not twice as useful, it is twice
 * as much in the way.
 *
 * Und sie zeigen **dieselbe Seite**. Bis hierher hatte jede Hälfte ihren
 * eigenen Merkzettel, was genau dann auffällt, wenn es weh tut: man steht drei
 * Ebenen tief in den Werkzeug-Einstellungen, füllt sich die linke Hand — und
 * muss das Menü nun rechts aufmachen, wo es wieder ganz oben anfing. Der Weg
 * liegt deshalb einmal da (`menuNav.ts`) und wird von beiden gelesen, samt der
 * Zeile, in der man war.
 *
 * **Und ohne Brille ist es eine Seite.** Im Browserfenster gibt es kein
 * Handgelenk, an dem ein Panel hängen könnte, und ein Panel, das stattdessen
 * vor der Kamera schwebt, ist am Telefon ein Bild von einem Menü. Deshalb
 * trägt dasselbe Menü dort ein drittes Gesicht aus DOM (`PageMenu.ts`), hinter
 * dem Knopf oben links — und **diese Klasse entscheidet, welches gilt**: mit
 * aufgesetzter Brille die Handgelenke, sonst die Seite. Alle drei lesen
 * denselben Weg und denselben Baum, und jede Welt ruft weiter nur `toggle`,
 * `openSubmenu`, `isOpen`, ohne zu wissen, wo das Menü gerade steht.
 *
 * Everything a world used to do to *the* menu it does to this instead — same
 * calls, passed on to whichever face is up.
 */
export class WristMenus extends THREE.Group {
  readonly left: WristMenu;
  readonly right: WristMenu;
  /** Der geteilte Weg durch den Baum — Handgelenke und Seite lesen denselben. */
  readonly nav: MenuNav;
  /** The wrist the player used last — where "open the menu" goes by default. */
  private preferred: Handedness = 'left';
  /** Das Menü als Seite, für alles ohne Brille — oder `null`, dann immer der Arm. */
  private page: PageMenu | null = null;
  /** Ob die Brille aufgesetzt ist (`App`, Sitzungsbeginn und -ende). */
  private immersive = false;

  constructor(
    pointer: Pointer,
    options: Omit<WristMenuOptions, 'hand' | 'onToggle'> & { nav?: MenuNav } = {},
  ) {
    super();
    this.name = 'wrist-menus';
    const onToggle = (menu: WristMenu, open: boolean): void => this.onToggle(menu, open);
    const nav = options.nav ?? new MenuNav();
    this.nav = nav;
    this.left = new WristMenu(pointer, { ...options, hand: 'left', nav, onToggle });
    this.right = new WristMenu(pointer, { ...options, hand: 'right', nav, onToggle });
    this.add(this.left, this.right);
  }

  get menus(): readonly [WristMenu, WristMenu] {
    return [this.left, this.right];
  }

  /** The panel that is currently up, if any. */
  get open(): WristMenu | null {
    return this.left.isOpen ? this.left : this.right.isOpen ? this.right : null;
  }

  /** Ob irgendein Gesicht des Menüs offen ist — Handgelenk oder Seite. */
  get isOpen(): boolean {
    return this.open !== null || (this.page?.isOpen ?? false);
  }

  /**
   * Die Seite dazuhängen. Sie muss denselben Weg lesen wie die Handgelenke
   * (`nav`), sonst fängt sie beim Aufsetzen der Brille wieder oben an.
   */
  attachPage(page: PageMenu): void {
    this.page = page;
    page.setPresenting(this.immersive);
  }

  /**
   * Brille auf oder ab. Beim Aufsetzen geht die Seite zu, beim Absetzen das
   * Handgelenk — ein offenes Menü, das man nicht mehr sehen kann, hielte
   * sonst weiter die Welt an (`ShipExperience` fragt `isOpen`).
   */
  set presenting(on: boolean) {
    if (on === this.immersive) return;
    this.immersive = on;
    this.page?.setPresenting(on);
    if (on) this.page?.toggle(false);
    else this.closeWrists();
  }

  get presenting(): boolean {
    return this.immersive;
  }

  /** Ob gerade die Seite das Menü trägt und nicht die Handgelenke. */
  private get onPage(): boolean {
    return this.page !== null && !this.immersive;
  }

  menu(hand: Handedness): WristMenu {
    return hand === 'left' ? this.left : this.right;
  }

  /**
   * Welchem Stick das Menü diese Frame etwas zu sagen hat — `PlayerRig` lässt
   * ihn dann in Ruhe, damit Blättern nicht heißt, dass man losläuft.
   */
  get scrollHand(): Handedness | null {
    return this.open?.scrollHand ?? null;
  }

  /**
   * Opens or closes the menu. Closing shuts both; opening uses the wrist that
   * was used last, so "menu" from a HUD button or a hotkey lands where the
   * player left it — or, without a headset, the page.
   */
  toggle(force?: boolean): void {
    if (this.onPage) {
      this.closeWrists();
      this.page!.toggle(force);
      return;
    }
    this.page?.toggle(false);
    if (force === false || (force === undefined && this.open !== null)) {
      this.closeWrists();
      return;
    }
    this.menu(this.preferred).toggle(true);
  }

  openSubmenu(id: string): void {
    if (this.onPage) {
      this.closeWrists();
      this.page!.openSubmenu(id);
      return;
    }
    this.menu(this.preferred).openSubmenu(id);
  }

  setRoot(entries: MenuEntry[], title?: string): void {
    for (const menu of this.menus) menu.setRoot(entries, title);
    this.page?.setRoot(entries, title);
  }

  setStatus(status: string): void {
    for (const menu of this.menus) menu.setStatus(status);
    this.page?.setStatus(status);
  }

  /** Repaints whichever page is up — a row whose label changed underneath. */
  refresh(): void {
    this.open?.refresh();
    this.page?.refresh();
  }

  attachPointer(): void {
    for (const menu of this.menus) menu.attachPointer();
  }

  /**
   * Woher die kleinen Modelle in den Zeilen kommen — das Werkzeugregal setzt
   * das, wenn seine Welt startet, und nimmt es beim Gehen wieder weg.
   *
   * **Und die Seite bekommt sie auch.** Sie ging hier lange leer aus, und man
   * sah es genau dort, wo es am meisten wehtut: im Asset-Regal auf dem
   * Telefon, wo in jeder Kachel das Modell stehen soll und stattdessen nichts
   * stand. Die Handgelenke bekommen die Fabrik selbst; die Seite bekommt eine
   * Schicht darum, die ihr die Modelle auf eine Leinwand zeichnet
   * (`PagePreviews.ts`) — sie selbst bleibt frei von three.js.
   *
   * `clips` gehört zur **Detailseite** und nur zu ihr: Dort darf man bei einer
   * Figur die Bewegung wählen (`ui/PageDetail.ts`), und woher die kommen, weiß
   * die Welt und nicht das Menü. Ohne Quelle bleibt das Auswahlfeld weg.
   */
  setModelFactory(factory: MenuModelFactory | null, clips: MenuClipSource | null = null): void {
    for (const menu of this.menus) menu.setModelFactory(factory);
    this.page?.setPreviews(factory ? new PagePreviews(factory, clips) : null);
  }

  update(dt: number, input: XRInput, headWorld: THREE.Matrix4): void {
    for (const menu of this.menus) menu.update(dt, input, headWorld);
  }

  dispose(): void {
    for (const menu of this.menus) menu.dispose();
    this.removeFromParent();
  }

  private closeWrists(): void {
    this.left.toggle(false);
    this.right.toggle(false);
  }

  /** One panel at a time: whichever just opened wins, the other one shuts. */
  private onToggle(menu: WristMenu, open: boolean): void {
    if (!open) return;
    this.preferred = menu.hand;
    const other = menu === this.left ? this.right : this.left;
    if (other.isOpen) other.toggle(false);
    // Der runde Knopf am Arm geht auch ohne Brille — dann aber nur so, dass
    // das Menü nicht zweimal offen ist.
    this.page?.toggle(false);
  }
}
