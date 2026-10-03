import * as THREE from 'three';
import { XRMenu, type MenuModelFactory, type XRMenuOptions } from './XRMenu';
import { WristButton } from './WristButton';
import { PagePreviews } from './PagePreviews';
import type { MenuClipSource } from './PageDetail';
import { MenuNav } from './menuNav';
import type { MenuEntry } from './menu';
import type { PageMenu } from './PageMenu';
import type { Pointer } from '../core/Pointer';
import type { Handedness, XRInput } from '../core/XRInput';

/**
 * Bewegungen zu Modellen, die keiner Welt gehören — `null` heißt „nicht
 * meins", dann fragt das Menü die Welt (`setExtraModels`).
 */
export type ExtraClipSource = (
  id: string,
  height: number | null,
) => Promise<THREE.AnimationClip[]> | null;

/**
 * **Das eine Menü, mit zwei Gesichtern** — und diese Klasse entscheidet,
 * welches gilt.
 *
 * - **Ohne Brille eine Seite** aus DOM (`PageMenu.ts`) hinter dem Knopf oben
 *   links: Im Browserfenster gibt es keinen Raum, in dem ein Panel stehen
 *   könnte, und ein Panel vor der Kamera ist am Telefon ein Bild von einem
 *   Menü.
 * - **In der Brille ein Bildschirm** zwei Meter vor dem Spieler (`XRMenu.ts`),
 *   gezeichnet wie die Seite: Reiter oben, ◀ ▶ links davon, ✕ rechts. Bis
 *   Oktober 2026 hing es an beiden Handgelenken; geblieben ist dort nur der
 *   runde ☰-Knopf, der es aufmacht (`WristButton.ts`).
 *
 * Beide lesen **denselben Weg** (`menuNav.ts`) und denselben Baum: Wer am PC
 * im Katalog stand, steht nach dem Aufsetzen der Brille dort auch auf dem
 * Bildschirm. Jede Welt ruft weiter nur `toggle`, `openSubmenu`, `isOpen`,
 * ohne zu wissen, wo das Menü gerade steht.
 */
export class GameMenu extends THREE.Group {
  /** Der Bildschirm in der Brille. */
  readonly xr: XRMenu;
  /** Der Weg durch den Baum — Bildschirm und Seite lesen denselben. */
  readonly nav: MenuNav;
  private readonly buttons: readonly [WristButton, WristButton];
  /** Das Menü als Seite, für alles ohne Brille — oder `null`, dann immer der Bildschirm. */
  private page: PageMenu | null = null;
  /** Was die Welt für die Kacheln abgegeben hat (`setModelFactory`). */
  private worldModels: {
    factory: MenuModelFactory | null;
    clips: MenuClipSource | null;
    forget: ((id: string) => void) | null;
  } = { factory: null, clips: null, forget: null };
  private extraModels: MenuModelFactory | null = null;
  private extraClips: ExtraClipSource | null = null;
  /** Ob die Brille aufgesetzt ist (`App`, Sitzungsbeginn und -ende). */
  private immersive = false;

  constructor(
    private readonly pointer: Pointer,
    options: Omit<XRMenuOptions, 'onToggle'> = {},
  ) {
    super();
    this.name = 'game-menu';
    this.nav = options.nav ?? new MenuNav();
    this.xr = new XRMenu(pointer, {
      ...options,
      nav: this.nav,
      onToggle: (open) => {
        for (const button of this.buttons) button.setOpen(open);
        // Der Knopf am Arm geht auch ohne Brille (`bgvr.xrPreview`) — dann
        // aber nur so, dass das Menü nicht zweimal offen ist.
        if (open) this.page?.toggle(false);
      },
    });
    const press = (): void => this.toggle();
    this.buttons = [new WristButton('left', press), new WristButton('right', press)];
    this.add(this.xr, ...this.buttons);
    for (const button of this.buttons) button.attachPointer(pointer);
  }

  /** Ob irgendein Gesicht des Menüs offen ist — Bildschirm oder Seite. */
  get isOpen(): boolean {
    return this.xr.isOpen || (this.page?.isOpen ?? false);
  }

  /**
   * Die Seite dazuhängen. Sie muss denselben Weg lesen wie der Bildschirm
   * (`nav`), sonst fängt sie beim Absetzen der Brille wieder oben an.
   */
  attachPage(page: PageMenu): void {
    this.page = page;
    page.setPresenting(this.immersive);
  }

  /**
   * Brille auf oder ab. Beim Aufsetzen geht die Seite zu, beim Absetzen der
   * Bildschirm — ein offenes Menü, das man nicht mehr sehen kann, hielte
   * sonst weiter die Welt an (`ShipExperience` fragt `isOpen`).
   */
  set presenting(on: boolean) {
    if (on === this.immersive) return;
    this.immersive = on;
    this.page?.setPresenting(on);
    if (on) this.page?.toggle(false);
    else this.xr.toggle(false);
  }

  get presenting(): boolean {
    return this.immersive;
  }

  /** Ob gerade die Seite das Menü trägt und nicht der Bildschirm. */
  private get onPage(): boolean {
    return this.page !== null && !this.immersive;
  }

  /**
   * Welchem Stick das Menü diese Frame etwas zu sagen hat — `PlayerRig` lässt
   * ihn dann in Ruhe, damit Blättern nicht heißt, dass man losläuft.
   */
  get scrollHand(): Handedness | null {
    return this.xr.scrollHand;
  }

  /** Opens or closes the menu — the page without a headset, the screen with one. */
  toggle(force?: boolean): void {
    if (this.onPage) {
      this.xr.toggle(false);
      this.page!.toggle(force);
      return;
    }
    this.page?.toggle(false);
    this.xr.toggle(force);
  }

  /**
   * **Eine Ebene zurück — und erst ganz oben zu.** Dieselbe Treppe wie `Esc`
   * auf der Seite (`PageMenu.back`) und _Zurück_ im Kopf des Bildschirms.
   * Für jede Taste, die „zurück" heißen soll (`B` am Pad, `Esc`): Wer sie
   * belegt, ruft das hier und muss nicht wissen, welches Gesicht gerade oben
   * ist. Ist gar nichts offen, passiert nichts — `false` sagt es.
   */
  back(): boolean {
    const page = this.onPage ? this.page : null;
    if (page) {
      if (!page.isOpen) return false;
      page.back();
      return true;
    }
    if (!this.xr.isOpen) return false;
    this.xr.goBack();
    return true;
  }

  openSubmenu(id: string): void {
    if (this.onPage) {
      this.xr.toggle(false);
      this.page!.openSubmenu(id);
      return;
    }
    this.xr.openSubmenu(id);
  }

  setRoot(entries: MenuEntry[], title?: string): void {
    this.xr.setRoot(entries, title);
    this.page?.setRoot(entries, title);
  }

  setStatus(status: string): void {
    this.xr.setStatus(status);
    this.page?.setStatus(status);
  }

  /** Repaints whichever page is up — a row whose label changed underneath. */
  refresh(): void {
    if (this.xr.isOpen) this.xr.refresh();
    this.page?.refresh();
  }

  attachPointer(): void {
    this.xr.attachPointer();
    for (const button of this.buttons) button.attachPointer(this.pointer);
  }

  /**
   * Woher die kleinen Modelle in den Zeilen kommen — das Werkzeugregal setzt
   * das, wenn seine Welt startet, und nimmt es beim Gehen wieder weg.
   *
   * Der Bildschirm bekommt die Fabrik selbst; die Seite bekommt eine Schicht
   * darum, die ihr die Modelle auf eine Leinwand zeichnet (`PagePreviews.ts`)
   * — sie selbst bleibt frei von three.js.
   *
   * `clips` gehört zur **Detailseite** und nur zu ihr: Dort darf man bei einer
   * Figur die Bewegung wählen (`ui/PageDetail.ts`), und woher die kommen, weiß
   * die Welt und nicht das Menü. Ohne Quelle bleibt das Auswahlfeld weg.
   */
  setModelFactory(
    factory: MenuModelFactory | null,
    clips: MenuClipSource | null = null,
    forget: ((id: string) => void) | null = null,
  ): void {
    this.worldModels = { factory, clips, forget };
    this.installModels();
  }

  /**
   * **Modelle, die keiner Welt gehören** — die Stücke unter _Aussehen_
   * (`ui/outfitModels.ts`). Gefragt wird zuerst hier, dann die Welt; und es
   * gilt auch in einer Welt, die selbst keine Fabrik abgibt.
   */
  setExtraModels(factory: MenuModelFactory | null, clips: ExtraClipSource | null = null): void {
    this.extraModels = factory;
    this.extraClips = clips;
    this.installModels();
  }

  private installModels(): void {
    const { factory: world, clips: worldClips, forget } = this.worldModels;
    const extra = this.extraModels;
    const factory: MenuModelFactory | null =
      world && extra ? (id) => extra(id) ?? world(id) : (world ?? extra);
    // Die Bewegungen auf der Detailseite: erst, was keiner Welt gehört (die
    // eigene Figur unter _Aussehen_), dann die Welt.
    const extraClips = this.extraClips;
    const clips: MenuClipSource | null = extraClips
      ? (id, height) => extraClips(id, height) ?? worldClips?.(id, height) ?? Promise.resolve([])
      : worldClips;
    this.xr.setModelFactory(factory);
    this.page?.setPreviews(factory ? new PagePreviews(factory, clips, forget) : null);
  }

  update(dt: number, input: XRInput, headWorld: THREE.Matrix4): void {
    // **☰ am Controller macht das Menü auf und zu** — derselbe Knopf wie ☰
    // am Pad und `M` an der Tastatur (`XRInput.menu`).
    if (this.immersive && input.controllers.some((one) => one.tracked && one.menu.justPressed)) {
      this.toggle();
    }
    const onPage = this.onPage;
    for (const button of this.buttons) {
      button.hidden = onPage;
      button.update(input, headWorld);
    }
    this.xr.update(dt, input, headWorld);
  }

  dispose(): void {
    this.xr.dispose();
    for (const button of this.buttons) button.dispose();
    this.removeFromParent();
  }
}
