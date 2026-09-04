import * as THREE from 'three';
import { WristMenu, type WristMenuOptions } from './WristMenu';
import { MenuNav } from './menuNav';
import type { MenuEntry } from './menu';
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
 * Everything a world used to do to *the* menu it does to this instead — same
 * calls, passed on to both halves.
 */
export class WristMenus extends THREE.Group {
  readonly left: WristMenu;
  readonly right: WristMenu;
  /** The wrist the player used last — where "open the menu" goes by default. */
  private preferred: Handedness = 'left';

  constructor(pointer: Pointer, options: Omit<WristMenuOptions, 'hand' | 'onToggle'> = {}) {
    super();
    this.name = 'wrist-menus';
    const onToggle = (menu: WristMenu, open: boolean): void => this.onToggle(menu, open);
    const nav = new MenuNav();
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

  get isOpen(): boolean {
    return this.open !== null;
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
   * player left it.
   */
  toggle(force?: boolean): void {
    if (force === false || (force === undefined && this.isOpen)) {
      this.left.toggle(false);
      this.right.toggle(false);
      return;
    }
    this.menu(this.preferred).toggle(true);
  }

  openSubmenu(id: string): void {
    this.menu(this.preferred).openSubmenu(id);
  }

  setRoot(entries: MenuEntry[], title?: string): void {
    for (const menu of this.menus) menu.setRoot(entries, title);
  }

  setStatus(status: string): void {
    for (const menu of this.menus) menu.setStatus(status);
  }

  /** Repaints whichever page is up — a row whose label changed underneath. */
  refresh(): void {
    this.open?.refresh();
  }

  attachPointer(): void {
    for (const menu of this.menus) menu.attachPointer();
  }

  update(dt: number, input: XRInput, headWorld: THREE.Matrix4): void {
    for (const menu of this.menus) menu.update(dt, input, headWorld);
  }

  dispose(): void {
    for (const menu of this.menus) menu.dispose();
    this.removeFromParent();
  }

  /** One panel at a time: whichever just opened wins, the other one shuts. */
  private onToggle(menu: WristMenu, open: boolean): void {
    if (!open) return;
    this.preferred = menu.hand;
    const other = menu === this.left ? this.right : this.left;
    if (other.isOpen) other.toggle(false);
  }
}
