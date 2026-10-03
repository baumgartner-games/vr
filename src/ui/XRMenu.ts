import * as THREE from 'three';
import { SCREEN_ASPECT, UIPanel } from './UIPanel';
import type { XRPlayerCard } from './XRPlayerCard';
import { XRMenuLayer } from './XRMenuLayer';
import { TextPlane } from './TextPlane';
import type { MenuEntry } from './menu';
import { findMenuPath } from './menuGroups';
import { MenuNav, tabStep } from './menuNav';
import type { Pointer } from '../core/Pointer';
import type { Handedness, XRInput } from '../core/XRInput';
import { menuMiniature } from './menuMiniature';
import { PREVIEW_YAW } from './previewGrid';

const _head = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _mat = new THREE.Matrix4();
const _local = new THREE.Matrix4();
const _quat = new THREE.Quaternion();

interface Page {
  title: string;
  entries: MenuEntry[];
  grid: boolean;
  /** Spalten im Raster, wenn die Seite eigene will (`MenuEntry.cols`). */
  cols?: number;
  /** Entries are taken with the grab button instead of tapped. */
  take: boolean;
  /** Hier fängt ein Katalog an (`MenuEntry.home`). */
  home: boolean;
  /** Id of the entry this page belongs to, for reopening it later. */
  id: string;
}

/** Stick deflection that counts as "scroll", and the one that re-arms it. */
const SCROLL_ON = 0.55;
const SCROLL_OFF = 0.3;
/** Holding the stick keeps scrolling: the first repeat waits, the rest run. */
const SCROLL_FIRST_DELAY = 0.42;
const SCROLL_REPEAT = 0.16;
/**
 * Wie weit der Strahl über das Panel wandern muss, damit aus einem Druck ein
 * Wischen wird — in Bruchteilen der Panelhöhe.
 *
 * Klein genug, dass eine Wischbewegung sofort greift, und groß genug, dass die
 * Hand beim Drücken zittern darf, ohne dass die Zeile darunter wegrutscht.
 */
const SWIPE_SLOP = 0.02;

/**
 * **Wie breit der Bildschirm ist und wie weit weg er steht**, in Metern.
 *
 * Gewünscht: _„Stattdessen fliegt das menü dann vor ihm (etwa 2 meter
 * entfernt). Dabei kann das menü ruhig breiter sein wie z. B. im 16:9 format
 * wie bei einem pc bildschirm."_ Erst 1,8 m, dann ein Viertel größer, weil
 * die Schrift zu klein und zu weich war: 2,25 m auf 2 m sind gut 58°, eine
 * Zeile Text (36 Bildpunkte der Leinwand, 5 cm) steht fast anderthalb Grad
 * hoch. Scharf macht sie aber erst die Ebene (`XRMenuLayer`).
 */
export const MENU_SCREEN_W = 2.25;
export const MENU_SCREEN_H = MENU_SCREEN_W * SCREEN_ASPECT;
export const MENU_DISTANCE = 2;
/** Wie weit die Mitte des Bildschirms unter den Augen steht. */
const MENU_DROP = 0.12;
/**
 * Worauf alles am Bildschirm gezeichnet wird: **über** der Welt.
 *
 * Zwei Meter sind in einem kleinen Raum weiter als bis zur Wand. Das Panel
 * zeichnet deshalb ohne Tiefenprüfung, nach allem anderen, und schreibt dabei
 * seine eigene Tiefe — die kleinen Modelle davor (eine Stufe später) messen
 * sich dann am Panel und nicht an der Wand dahinter. `renderOrder` einer
 * Gruppe gilt in three.js für alles darin, aber nur bis zur nächsten Gruppe;
 * darum bekommt jede Gruppe eines Modells die Stufe einzeln (`overlay`).
 */
const PANEL_ORDER = 10;
const PREVIEW_ORDER = 11;

/**
 * Baut ein kleines Modell zu einer Vorschau-Id, oder `null`, wenn es dazu
 * keins gibt. Die Welt liefert das — das Menü weiß nicht, was ein Werkzeug ist.
 */
export type MenuModelFactory = (id: string) => THREE.Object3D | null;

/**
 * Wie lange nach einem `null` gewartet wird, bevor dieselbe Id noch einmal
 * gefragt wird — in Sekunden.
 *
 * `null` heißt bei der Fabrik nicht „gibt es nicht", sondern **„noch nicht"**:
 * Das Asset-Regal stößt damit das Laden an und hat das Modell ein paar hundert
 * Millisekunden später (`core/kaykitModel.ts`, `kaykitModelNow`). Jedes Bild
 * zu fragen wäre sechzigmal die Sekunde dieselbe Frage; einmal zu fragen und
 * das `null` zu behalten wäre ein Fach, das für immer leer bleibt. Eine halbe
 * Sekunde ist beides nicht.
 */
const PREVIEW_RETRY = 0.5;

export interface XRMenuOptions {
  title?: string;
  footer?: string;
  /** Wo im Baum man ist — geteilt mit der Seite am Schirm. */
  nav?: MenuNav;
  /** Eigenschaft statt Methode: Sie wird gespeichert und später einzeln gerufen. */
  onToggle?: (open: boolean) => void;
  /**
   * **Die Einträge der Wurzel sind Reiter** — wie am Schirm (`PageMenu`,
   * `tabs`). Die Wurzel selbst schlägt niemand auf; die Reihe steht oben im
   * Kopf (`ui/screenLayout.ts`).
   */
  tabs?: boolean;
  /**
   * **Die Spalte rechts** — für genau eine Seite: die Figur im Inventar
   * (`ui/XRPlayerCard.ts`). Name und Knopf zeichnet das Panel
   * (`PageOptions.aside`), die Figur steht als Modell davor.
   */
  aside?: { page: string; card: XRPlayerCard };
}

/**
 * **Das Menü in der Brille: ein Bildschirm, zwei Meter vor einem.**
 *
 * Bis Oktober 2026 hing es am Handgelenk und kippte mit der Hand mit —
 * _„ja coole idee, aber doch irgendwie unhandlich"_. Jetzt fliegt es beim
 * Aufmachen vor den Spieler, in Augenhöhe und zwei Meter weit, und **bleibt
 * dort stehen** (im Raum des Rigs: Gehen und Drehen nehmen es mit, der Kopf
 * nicht). Gezeichnet wird es wie die Seite am Schirm, im Querformat: oben
 * ◀ ▶, die Reiter und ✕, darunter Zurück, Titel und Haus (`UIPanel` mit
 * `layout: 'screen'`).
 *
 * Gezielt wird mit **einer** Hand: Das Panel ist ein exklusives Ziel des
 * Zeigers (`PointerTarget.exclusive`) — es gehört der Hand, die zuerst darauf
 * zeigt; die andere übernimmt es mit einem Druck. Wo der Strahl aufsetzt,
 * steht ein kleiner Kreis (`UIPanel.marker`).
 */
export class XRMenu extends THREE.Group {
  readonly panel: UIPanel;
  /** One line about the entry under the pointer, floating over the panel. */
  private readonly caption: TextPlane;
  private captionText = '';
  /** Die kleine zweite Zeile darin — im Raster der Untertitel der Kachel. */
  private captionBody = '';

  private readonly onToggle: ((open: boolean) => void) | null;

  private open = false;
  /** Beim nächsten Bild vor den Kopf stellen — gesetzt beim Aufmachen. */
  private place = false;
  private readonly tabs: boolean;
  private readonly aside: { page: string; card: XRPlayerCard } | null;
  /** Das Menü als Ebene des Kompositors (`useLayer`) — oder `null`, dann Textur. */
  private layer: { layer: XRMenuLayer; enabled: () => boolean } | null = null;
  private root: MenuEntry[] = [];
  private rootTitle = 'Menü';
  /** Ob **Greifen** auf der obersten Seite auch auswählt — ein Regal tut das. */
  private rootTake = false;
  private stack: Page[] = [];
  /** Der geteilte Weg durch den Baum — beide Handgelenke lesen denselben. */
  private readonly nav: MenuNav;
  private readonly unwatchNav: () => void;
  /** Seconds until the held stick scrolls another row; 0 while it is idle. */
  private scrollTimer = 0;
  private scrollArmed = true;
  /**
   * Wer gerade mit gehaltenem Trigger über das Panel wischt.
   *
   * Gerechnet wird gegen den Stand beim Zupacken: `v0` ist, wo der Strahl
   * aufsetzte, `scroll0`, wie weit die Liste da stand. Gegen den letzten Frame
   * zu rechnen driftet, sobald ein Frame ausfällt — und in einer Brille fällt
   * regelmäßig einer aus.
   */
  private swipe: { hand: Handedness; v0: number; scroll0: number; moved: boolean } | null = null;
  /**
   * Eine Auswahl, die noch nicht ausgeführt ist.
   *
   * Der Trigger wählt beim *Drücken* aus — überall sonst genau richtig, hier
   * aber im Weg: derselbe Trigger hält beim Wischen die Liste fest, und dann
   * hätte jedes Wischen zuerst die Zeile gedrückt, auf der es anfing. Also
   * wartet eine Auswahl, bis der Trigger wieder los ist, und fällt weg, wenn
   * daraus eine Wischbewegung wurde. Ein Druck ohne Bewegung kommt eine Frame
   * später durch, was niemand merkt; `A` ebenso, weil dabei der Trigger von
   * vornherein nicht gedrückt ist.
   */
  private pending: { index: number; hand: Handedness; viaTrigger: boolean } | null = null;
  /**
   * Das zuletzt gesehene Eingabegerät.
   *
   * Der Pointer sagt beim Auswählen nur, *welche* Hand gedrückt hat, nicht
   * *womit*. Auf einer Nimm-Seite ist das aber der ganze Unterschied: Greifen
   * und `A` füllen die Hand, der Trigger geht in die Einstellungen. Also wird
   * im Moment der Auswahl nachgesehen, ob der Trigger unten ist.
   */
  private lastInput: XRInput | null = null;
  /**
   * Die kleinen Modelle vor den Zeilen und in den Kacheln, nach Vorschau-Id.
   *
   * Sie hängen am Panel, nicht am Handgelenk: dann folgen sie ihm durch jede
   * Neigung, ohne dass hier eine einzige Matrix gerechnet wird. Gebaut werden
   * sie erst, wenn ihre Zeile das erste Mal zu sehen ist — ein Regal mit
   * zwanzig Werkzeugen zeigt nie mehr als sieben davon auf einmal.
   *
   * **Und weggeräumt, sobald sie es nicht mehr ist.** Früher wurden sie nur
   * unsichtbar gestellt und behalten; bei zwanzig Werkzeugen ist das der
   * richtige Handel. Beim Asset-Regal sind es viertausendfünfhundert Modelle,
   * und ein Ordner, den man verlässt, muss seine wieder hergeben — sonst
   * wächst das Panel mit jedem Ordner, den man aufmacht. Geteilt sind
   * Geometrie und Material ohnehin mit der Vorlage im Speicher
   * (`core/kaykitModel.ts`); weggeworfen wird hier nur der Rahmen.
   *
   * Die Größe steht daneben, weil dieselbe Id in einer Zeile anders groß ist
   * als in einer Kachel.
   */
  private readonly previews = new Map<string, { model: THREE.Object3D; size: number }>();
  /**
   * Wann zuletzt vergeblich nach einer Id gefragt wurde — die Uhr unten läuft
   * in Sekunden seit dem Aufmachen des Menüs.
   */
  private readonly asked = new Map<string, number>();
  private models: MenuModelFactory | null = null;
  private previewClock = 0;

  constructor(
    private readonly pointer: Pointer,
    options: XRMenuOptions = {},
  ) {
    super();
    this.nav = options.nav ?? new MenuNav();
    this.onToggle = options.onToggle ?? null;
    this.tabs = options.tabs ?? false;
    this.aside = options.aside ?? null;
    this.name = 'xr-menu';
    // Die Seite am Schirm ist eine Ebene tiefer gegangen: dieselbe Seite hier.
    this.unwatchNav = this.nav.onChange(() => this.applyNav());

    this.panel = new UIPanel({
      width: MENU_SCREEN_W,
      layout: 'screen',
      title: options.title ?? 'Menü',
      footer: options.footer ?? 'Zielen + Trigger/A · B/Y zurück',
      onSelect: (index, hand) => this.handleSelect(index, hand),
      onTab: (index) => this.showTab(index),
      onControl: (control) => this.handleControl(control),
    });
    // Über der Welt, auch hinter einer Wand (`PANEL_ORDER`): undurchsichtig
    // mit ausgestanzten Ecken, damit es im Durchgang der festen Dinge nach
    // ihnen kommt und seine Tiefe für die Modelle davor schreibt.
    const material = this.panel.material;
    material.transparent = false;
    material.alphaTest = 0.5;
    // Nicht `depthTest = false`: Ohne Tiefenprüfung schreibt WebGL auch keine
    // Tiefe, und dann zeichnen sich Fenster dahinter über das Panel.
    material.depthFunc = THREE.AlwaysDepth;
    material.needsUpdate = true;
    this.panel.renderOrder = PANEL_ORDER;
    this.panel.visible = false;
    this.add(this.panel);

    // A grid cell has room for two words. What the thing actually does goes
    // here instead, above the panel, while the pointer rests on it.
    this.caption = new TextPlane({
      width: 1.1,
      // Etwas höher als eine Zeile: Im Raster steht unter der Überschrift
      // noch der Untertitel der Kachel (`updateCaption`), und eine Tafel, die
      // ihn erst auf ein Viertel verkleinern muss, damit er hineinpasst,
      // zeigt ihn zwar an, aber niemandem.
      height: 0.26,
      title: '',
      accent: 0x9fd0ff,
      align: 'center',
      front: true,
    });
    this.caption.visible = false;
    this.caption.renderOrder = PREVIEW_ORDER + 1;
    this.add(this.caption);

    this.attachPointer();
  }

  /**
   * Woher die kleinen Modelle kommen. `null` schaltet sie ab und räumt die
   * gebauten weg — beim Weltwechsel, wo die Werkzeuge dahinter sterben.
   */
  setModelFactory(factory: MenuModelFactory | null): void {
    if (this.models === factory) return;
    this.models = factory;
    this.clearPreviews();
  }

  /**
   * **Schärfer in der Brille**: das Panel als Quad-Ebene des Kompositors
   * zeigen (`XRMenuLayer`), solange `enabled` es erlaubt — eine Einstellung
   * unter Grafik.
   */
  useLayer(renderer: THREE.WebGLRenderer, camera: THREE.Camera, enabled: () => boolean): void {
    this.layer?.layer.dispose();
    this.layer = { layer: new XRMenuLayer(renderer, camera, this.panel), enabled };
  }

  /** (Re-)registers the menu with the pointer, e.g. after a world switch. */
  attachPointer(): void {
    this.pointer.remove(this.panel);
    // **Exklusiv**: nur die Hand, die zielt — nicht beide abwechselnd.
    this.pointer.add({ ...this.panel.asPointerTarget(), pokeable: false, exclusive: true });
  }

  /**
   * Puts a menu tree on the panel **without moving the player**.
   *
   * The tree is rebuilt constantly — the peer list changes, a setting steps to
   * its next notch, a world is entered — and every rebuild used to drop the
   * player back at the top level. So the page they were looking at is walked
   * out again by id afterwards; a page that has since gone away simply stops
   * the walk at its parent (`menuNav.ts`).
   */
  setRoot(entries: MenuEntry[], title = 'Menü', take = false): void {
    this.root = entries;
    this.rootTitle = title;
    this.rootTake = take;
    this.keepScroll();
    this.nav.prune(entries);
    this.applyNav();
  }

  /** Opens a submenu by id — wherever in the tree it sits (`findMenuPath`). */
  openSubmenu(id: string): void {
    // Die Seite kann eine Ebene tiefer liegen — unter ihrem Hauptbereich
    // (`ui/menuGroups.ts`). Wer sie aufruft, nennt nur ihre Id.
    const path = findMenuPath(this.root, id);
    if (!path) return;
    this.keepScroll();
    this.nav.goTo(path);
    this.toggle(true);
  }

  /**
   * Der Weg aus dem geteilten Merkzettel, auf diesem Panel.
   *
   * Läuft auch auf dem geschlossenen Panel: es soll beim Aufmachen dieselbe
   * Seite zeigen und nicht erst eine Frame lang die alte.
   */
  private applyNav(): void {
    const path = this.nav.path;
    this.stack = [
      {
        title: this.rootTitle,
        entries: this.root,
        grid: false,
        take: this.rootTake,
        home: false,
        id: 'root',
      },
    ];
    let level: MenuEntry[] = this.root;
    for (const id of path) {
      const entry = level.find((candidate) => candidate.id === id);
      if (!entry?.children) break;
      this.stack.push(pageOf(entry));
      level = entry.children;
    }
    // **Mit Reitern wird die Wurzel nie aufgeschlagen** — wer dort ankäme,
    // steht im ersten Reiter (wie `PageMenu.applyNav`).
    if (this.tabs && this.stack.length < 2 && this.root.length > 0) {
      this.nav.showTab(this.root[0]!.id, false);
      return;
    }
    this.applyPage();
  }

  /** Wie viele Seiten der Stapel mindestens hat — darunter gibt es kein _Zurück_. */
  private get floor(): number {
    return this.tabs ? 2 : 1;
  }

  /** Ein Reiter wurde gedrückt: dorthin, wo man in ihm zuletzt stand (`MenuNav.showTab`). */
  private showTab(index: number): void {
    const entry = this.root[index];
    if (!entry) return;
    this.keepScroll();
    this.nav.showTab(entry.id);
  }

  /** **◀ ▶** links in der Reiterleiste — und LB/RB, wer sie belegt. */
  stepTab(step: -1 | 1): void {
    const next = tabStep(
      this.root.map((entry) => entry.id),
      this.nav.path[0],
      step,
    );
    const index = next === null ? -1 : this.root.findIndex((entry) => entry.id === next);
    if (index >= 0) this.showTab(index);
  }

  /** Ein Knopf im Kopf des Bildschirms. */
  private handleControl(control: 'prev' | 'next' | 'close' | 'back' | 'home' | 'aside'): void {
    switch (control) {
      case 'aside':
        this.aside?.card.onCustomize();
        return;
      case 'prev':
        this.stepTab(-1);
        return;
      case 'next':
        this.stepTab(1);
        return;
      case 'close':
        this.toggle(false);
        return;
      case 'back':
        this.goBack();
        return;
      case 'home':
        this.goHome();
        return;
    }
  }

  /** Eine Seite zurück — ganz oben macht es zu. */
  goBack(): void {
    if (this.stack.length > this.floor) {
      this.keepScroll();
      this.nav.pop();
    } else this.toggle(false);
  }

  /** Zurück an den Anfang des Katalogs (`MenuEntry.home`), ohne achtmal _Zurück_. */
  private goHome(): void {
    const depth = this.homeDepth();
    if (depth < 0) return;
    this.keepScroll();
    // `stack[depth]` gehört zu `nav.path[depth - 1]` — die Wurzel steht im
    // Stapel, aber nicht im Weg.
    this.nav.goTo(this.nav.path.slice(0, depth));
  }

  setStatus(status: string): void {
    this.panel.setStatus(status);
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(force?: boolean): void {
    const wasOpen = this.open;
    this.open = force ?? !this.open;
    this.panel.visible = this.open;
    // Aufmachen heißt: dahin, wo man aufgehört hat — Seite *und* Zeile; und
    // der Bildschirm fliegt neu vor den Kopf, wohin man jetzt schaut.
    if (this.open && !wasOpen) {
      this.place = true;
      this.swipe = null;
      this.pending = null;
      this.panel.scrollTo(this.nav.scrollOf(this.page.id));
    }
    // Closing keeps the page. Going away to try something out and coming back
    // to the top of the tree is the same annoyance as being thrown to the top
    // of a list, one level up — and the title on the panel plus the *Zurück*
    // row say plainly where you are.
    if (!this.open) this.keepScroll();
    if (this.open !== wasOpen) this.onToggle?.(this.open);
  }

  /** Repaints the open page — a row whose label changed under the pointer. */
  refresh(): void {
    this.panel.refresh();
  }

  /**
   * @param input     current XR input
   * @param headWorld head pose in world space
   */
  update(dt: number, input: XRInput, headWorld: THREE.Matrix4): void {
    this.lastInput = input;
    this.panel.update(dt);
    this.panel.visible = this.open;

    if (this.place) this.placeBefore(headWorld);

    this.updateBack(input);
    this.updateGrabTake(input);
    this.updateScroll(dt, input);
    this.updateSwipe(input);
    this.updatePending(input);
    this.updatePreviews(dt);
    this.updateAside();

    this.layer?.layer.update(this.open && this.layer.enabled());

    this.updateCaption();
    if (this.caption.visible) {
      this.caption.position
        .set(0, MENU_SCREEN_H / 2 + 0.17, 0)
        .applyQuaternion(this.panel.quaternion);
      this.caption.position.add(this.panel.position);
      this.caption.quaternion.copy(this.panel.quaternion);
    }
  }

  /**
   * **Vor den Kopf stellen** — waagerecht in Blickrichtung, `MENU_DISTANCE`
   * weit und etwas unter den Augen, zum Kopf gedreht. Gerechnet im Raum
   * dieser Gruppe (des Rigs): Danach steht der Bildschirm still, auch wenn
   * man den Kopf wendet, und kommt beim Gehen mit.
   */
  private placeBefore(headWorld: THREE.Matrix4): void {
    this.place = false;
    this.updateMatrixWorld(true);
    _local.copy(this.matrixWorld).invert().multiply(headWorld);
    _head.setFromMatrixPosition(_local);
    _quat.setFromRotationMatrix(_local);
    _forward.set(0, 0, -1).applyQuaternion(_quat);
    _forward.y = 0;
    // Senkrecht nach oben oder unten geschaut: dann eben geradeaus im Rig.
    if (_forward.lengthSq() < 1e-4) _forward.set(0, 0, -1);
    _forward.normalize();
    this.panel.position.copy(_head).addScaledVector(_forward, MENU_DISTANCE);
    this.panel.position.y -= MENU_DROP;
    _mat.lookAt(_head, this.panel.position, _up);
    this.panel.quaternion.setFromRotationMatrix(_mat);
  }

  /**
   * **Die Figur in der Spalte rechts** (`XRMenuOptions.aside`): ans Panel
   * gehängt, vor die Fläche, die das Panel für sie freilässt — nur auf ihrer
   * Seite zu sehen.
   */
  private updateAside(): void {
    const aside = this.aside;
    if (!aside) return;
    const card = aside.card;
    const anchor = this.open && this.page.id === aside.page ? this.panel.asideAnchor() : null;
    if (anchor && card.parent !== this.panel) this.panel.add(card);
    if (card.parent !== this.panel) return;
    card.visible = anchor !== null;
    if (!anchor) return;
    card.place(anchor.x, anchor.y, anchor.height);
    this.panel.setAside(card.info());
    // Jedes Bild: Die Figur lädt ihr Modell nach, und eine neue Gruppe darin
    // fiele sonst auf Stufe 0 zurück und hinter das Panel (`PANEL_ORDER`).
    overlay(card, PREVIEW_ORDER);
  }

  /**
   * The line over the panel: whatever the pointer rests on says what it is.
   * Only entries that carry a `caption` get one — a list already spells itself
   * out in its rows, and a second copy of the same words is just noise.
   */
  private updateCaption(): void {
    const entry = this.open ? this.displayed()[this.panel.hovered.index] : undefined;
    const text = entry?.caption ?? '';
    // **Und im Raster auch die zweite Zeile** (`MenuEntry.sub`). In einer
    // Liste steht sie in der Zeile selbst; eine Kachel hat dafür keinen Platz
    // und zeigt nur die Beschriftung (`ui/UIPanel.drawCell`), also ist das
    // Fähnchen die **einzige** Stelle, an der sie in der Brille überhaupt zu
    // lesen wäre. Für den Katalog ist das die Adresse des Modells
    // (`core/kaykitIndex.fileEntry`): Hier gibt es keine Zwischenablage und
    // keinen Steckbrief, wohl aber jemanden, der den genauen Namen vorlesen
    // oder abtippen will.
    //
    // Sie geht als **Rumpf** hinein und nicht hinter die Überschrift: Eine
    // Tafel verkleinert einen Rumpf, bis er hineinpasst, und quetscht eine
    // Überschrift stattdessen in die Breite (`ui/TextPlane.draw`) — bei
    // `characters/enemies/skeleton_warrior_A.glb` ist das der Unterschied
    // zwischen lesbar und Tapete.
    const body = entry && this.page.grid ? (entry.sub ?? '') : '';
    if (text !== this.captionText || body !== this.captionBody) {
      this.captionText = text;
      this.captionBody = body;
      if (text || body) this.caption.setText(text, body || undefined);
    }
    this.caption.visible = text.length > 0 || body.length > 0;
  }

  dispose(): void {
    this.unwatchNav();
    this.clearPreviews();
    this.layer?.layer.dispose();
    this.pointer.remove(this.panel);
    this.panel.dispose();
    this.caption.dispose();
    this.removeFromParent();
  }

  // --- pages --------------------------------------------------------------

  private get page(): Page {
    return this.stack[this.stack.length - 1]!;
  }

  /** Was auf der Seite steht — _Zurück_ und _Von vorne_ sind Knöpfe im Kopf. */
  private displayed(): MenuEntry[] {
    return this.page.entries;
  }

  /**
   * **Wie tief im Stapel der Anfang des Katalogs liegt** — oder `-1`, wenn es
   * keinen gibt oder man schon auf ihm steht. Wie am Schirm (`ui/PageMenu.ts`).
   */
  private homeDepth(): number {
    for (let depth = this.stack.length - 2; depth > 0; depth--) {
      if (this.stack[depth]!.home) return depth;
    }
    return -1;
  }

  private applyPage(): void {
    const page = this.page;
    this.panel.setPage(page.title, this.displayed(), {
      grid: page.grid,
      ...(page.cols === undefined ? {} : { cols: page.cols }),
      hint: page.take ? 'Greifen/A nimmt es · Trigger öffnet die Einstellungen' : undefined,
      // The same page again keeps its place; a different one starts where it
      // was left. Using a row is what changes its label, so a page is
      // re-applied constantly — resetting it there was what threw you back to
      // the top every time you took a tool or stepped a setting.
      key: page.id,
      scroll: this.nav.scrollOf(page.id),
      // **Zurück und Von vorne sind Knöpfe im Kopf** wie am Schirm — keine
      // angehefteten Zeilen mehr, die im Raster eine ganze Kachelreihe kosten.
      back: this.stack.length > this.floor,
      home: this.homeDepth() >= 0,
      ...(this.aside && page.id === this.aside.page ? { aside: this.aside.card.info() } : {}),
      ...(this.tabs
        ? {
            tabs: this.root.map((entry) => ({
              label: entry.label,
              ...(entry.icon ? { icon: entry.icon } : {}),
              ...(entry.accent === undefined ? {} : { accent: entry.accent }),
            })),
            tab: this.root.findIndex((entry) => entry.id === this.nav.path[0]),
          }
        : {}),
      // Der Weg bis hierher, wie am Schirm: „Menü › Bauen & Gestalten" — mit
      // Reitern ab dem Reiter, die Wurzel steht ja als Reihe darüber.
      crumb: this.stack
        .slice(this.floor - 1, -1)
        .map((step) => step.title)
        .join(' › '),
    });
  }

  /** Writes down where the page on show currently sits, before leaving it. */
  private keepScroll(): void {
    const page = this.stack[this.stack.length - 1];
    if (page) this.nav.setScroll(page.id, this.panel.scrollOffset);
  }

  private pushPage(entry: MenuEntry): void {
    this.keepScroll();
    this.nav.push(entry.id);
  }

  /**
   * On a grid page the entries are not tapped: point at a cell and press the
   * trigger (or A), then the item lands in that hand. Otherwise one press
   * spawns a whole pile.
   */
  private updateGrabTake(input: XRInput): void {
    if (!this.open || !this.page.take) return;
    const { index, hand } = this.panel.hovered;
    if (!hand) return;
    const entry = this.displayed()[index];
    if (!entry || !entry.run) return;

    const controller = input.get(hand);
    if (!controller?.tracked) return;
    // Grab or `A` — never the trigger, which is busy aiming at the panel. A
    // bare hand's grip is its three fingers closing onto the palm, so the same
    // rule reads on both kinds of hand.
    if (!controller.squeeze.justPressed && !controller.primary.justPressed) return;

    entry.run(hand);
    this.applyPage();
  }

  /**
   * **`B` / `Y` gehen eine Seite zurück** — dasselbe Schema wie am Pad und im
   * Menü am Schirm (`docs/agents/steuerung.md`): unten bestätigt, oben
   * (am Quest-Controller der obere Knopf, `secondary`) geht zurück, und ganz
   * oben macht es zu. Solange das Menü offen ist, gehört der Knopf ihm; die
   * Welt setzt dann nicht zurück (`PortalWorld.handleReset`).
   */
  private updateBack(input: XRInput): void {
    if (!this.open) return;
    for (const controller of input.controllers) {
      if (!controller.tracked || !controller.secondary.justPressed) continue;
      this.goBack();
      return;
    }
  }

  /**
   * Welche Hand gerade das Menü blättert — deren Stick gehört dann dem Menü
   * und nicht den Beinen.
   *
   * Der Spieler zeigt aufs Panel und drückt den Stick nach unten, um weiter
   * zu kommen; dass er dabei losläuft, will niemand. `PlayerRig` fragt hier,
   * welchem Stick es diese Frame nichts zu sagen hat. `null`, solange das
   * Panel zu ist oder ganz auf eine Seite passt — dann hat der Stick nichts
   * zu tun und darf wieder laufen.
   */
  get scrollHand(): Handedness | null {
    if (!this.open || !this.panel.scrollable) return null;
    return this.panel.hovered.hand ?? 'right';
  }

  /**
   * The pointing hand's stick pages through a long list. Only the up/down axis:
   * left/right is the snap turn, and a menu is no reason to give that up.
   */
  private updateScroll(dt: number, input: XRInput): void {
    const side = this.scrollHand;
    if (!side) {
      this.scrollArmed = true;
      this.scrollTimer = 0;
      return;
    }

    const stick = input.get(side)?.thumbstick;
    const y = stick?.y ?? 0;

    if (Math.abs(y) < SCROLL_OFF) {
      this.scrollArmed = true;
      this.scrollTimer = 0;
      return;
    }
    if (Math.abs(y) < SCROLL_ON) return;

    // Stick forward (negative y) walks up the list, like a scroll wheel.
    const rows = y > 0 ? 1 : -1;
    if (this.scrollArmed) {
      this.scrollArmed = false;
      this.scrollTimer = SCROLL_FIRST_DELAY;
      this.scrollBy(rows);
      return;
    }
    this.scrollTimer -= dt;
    if (this.scrollTimer > 0) return;
    this.scrollTimer = SCROLL_REPEAT;
    this.scrollBy(rows);
  }

  /**
   * Trigger halten und wischen — dieselbe Bewegung, mit der man überall sonst
   * eine Liste schiebt.
   *
   * Der Stick blättert zeilenweise und ist damit gut für zwei Zeilen und
   * mühsam für zwanzig; das Werkzeugregal hat inzwischen zwanzig. Gewischt
   * wird gegen den Aufsetzpunkt: eine volle Panelhöhe Handbewegung schiebt die
   * Liste um eine volle Seite, was sich anfühlt, als läge das Blatt unter der
   * Hand fest.
   */
  private updateSwipe(input: XRInput): void {
    const swipe = this.swipe;
    const { hand, v } = this.panel.hovered;

    if (swipe) {
      const controller = input.get(swipe.hand);
      // Weg vom Panel oder Trigger los: der Zug ist vorbei. Ob daraus eine
      // Auswahl wird, entscheidet `updatePending`.
      if (!controller?.trigger.pressed || hand !== swipe.hand) {
        this.swipe = null;
        return;
      }
      const travel = v - swipe.v0;
      if (Math.abs(travel) > SWIPE_SLOP && !swipe.moved) {
        swipe.moved = true;
        // Sobald aus dem Druck ein Zug wird, ist die Zeile darunter vom Tisch.
        // Hier und nicht erst beim Loslassen: da ist der Zug schon vorbei und
        // die Auswahl würde durchrutschen.
        this.pending = null;
      }
      // Nach oben wischen heißt: das Blatt kommt mit und gibt unten frei —
      // dieselbe Richtung wie auf jedem Telefon.
      if (swipe.moved) this.scrollTo(swipe.scroll0 + travel * this.panel.rowsPerPage);
      return;
    }

    if (!this.open || !this.panel.scrollable || !hand) return;
    if (!input.get(hand)?.trigger.pressed) return;
    this.swipe = { hand, v0: v, scroll0: this.panel.scrollOffset, moved: false };
  }

  /**
   * Die zurückgehaltene Auswahl: ausführen, sobald der Trigger los ist. Wurde
   * daraus ein Wischen, hat `updateSwipe` sie längst weggeworfen.
   */
  private updatePending(input: XRInput): void {
    const pending = this.pending;
    if (!pending) return;
    if (input.get(pending.hand)?.trigger.pressed) return;
    this.pending = null;
    this.runSelect(pending.index, pending.hand, pending.viaTrigger);
  }

  /** Blättern und dabei mitschreiben, wo die Seite steht. */
  private scrollBy(rows: number): void {
    if (this.panel.scrollBy(rows)) this.keepScroll();
  }

  private scrollTo(offset: number): void {
    if (this.panel.scrollTo(offset)) this.keepScroll();
  }

  /**
   * Der Trigger drückt — aber die Zeile wird noch nicht ausgeführt.
   *
   * Wischen und Auswählen liegen auf derselben Taste, und wer wischt, drückt
   * dabei zwangsläufig auf irgendeine Zeile. Also wartet die Auswahl auf das
   * Loslassen (`updatePending`); wurde daraus eine Wischbewegung, fällt sie
   * weg. Die Maus kennt das Problem nicht und wählt sofort.
   */
  private handleSelect(index: number, hand: Handedness | null): void {
    if (hand === null) {
      this.runSelect(index, null, true);
      return;
    }
    this.pending = {
      index,
      hand,
      viaTrigger: this.lastInput?.get(hand)?.trigger.pressed ?? false,
    };
  }

  /**
   * @param viaTrigger ob der Trigger das ausgelöst hat und nicht `A`. Auf
   *                   einer Nimm-Seite hängt daran, was passiert: `A` und
   *                   Greifen legen das Werkzeug in die Hand, der Trigger
   *                   geht in seine Einstellungen. Beides zugleich wäre das
   *                   Schlimmste von beidem — man hätte das Ding in der Hand
   *                   *und* stünde eine Seite tiefer.
   */
  private runSelect(index: number, hand: Handedness | null, viaTrigger: boolean): void {
    const entry = this.displayed()[index];
    if (!entry) return;

    if (entry.children) {
      if (this.page.take && !viaTrigger) return;
      // **Bevor** der Weg umgestellt wird: Wer erst beim Aufschlagen etwas
      // laden will, soll es beim ersten Bild der neuen Seite schon getan
      // haben (`MenuEntry.onOpen`).
      entry.onOpen?.();
      this.pushPage(entry);
      return;
    }
    // Taken items need the grab button; only the mouse may tap them.
    if (this.page.take && hand !== null) return;
    entry.run?.(hand);
    this.panel.refresh();
  }

  // --- die kleinen Modelle --------------------------------------------------

  /**
   * Vor jeder sichtbaren Zeile, die eins hat, steht das Ding selbst.
   *
   * Eine Strichzeichnung sagt „irgendein Handschuh"; das Modell sagt, welcher
   * — und es steht schräg (`PREVIEW_YAW`), Vorderseite und eine Flanke zum
   * Betrachter; gedreht hat es sich bis September 2026, gewünscht war dann
   * _„Die Elemente nicht mehr automatisch drehen in der Vorschau"_. Es fängt **keinen Strahl** ab: es ist kein
   * Ziel des Pointers, also greift man weiter die Zeile dahinter, und die
   * ganze Zeile bleibt anfassbar wie vorher.
   */
  private updatePreviews(dt: number): void {
    if (!this.models || !this.open) {
      // Zu ist zu: Was das Panel nicht zeigt, hält es auch nicht im Speicher.
      if (this.previews.size > 0) this.clearPreviews();
      return;
    }
    this.previewClock += dt;

    const shown = new Set<string>();
    const entries = this.displayed();
    for (let index = 0; index < entries.length; index++) {
      const id = entries[index]!.preview;
      if (!id) continue;
      // **Nur was zu sehen ist.** Ohne Anker ist die Zeile weggescrollt, und
      // eine weggescrollte Zeile lädt nichts — das ist der ganze Grund, warum
      // ein Ordner mit 1588 Modellen sich überhaupt aufschlagen lässt.
      const anchor = this.panel.rowAnchor(index);
      if (!anchor) continue;
      shown.add(id);
      const preview = this.preview(id, anchor.size);
      if (!preview) continue;
      preview.visible = true;
      // Ganz vor dem Panel und nicht zur Hälfte darin: Das Panel schreibt
      // seine Tiefe (`PANEL_ORDER`), und was dahinter liegt, wäre weg.
      preview.position.set(anchor.x, anchor.y, anchor.size / 2 + 0.004);
      preview.rotation.y = PREVIEW_YAW;
    }
    for (const [id, preview] of [...this.previews]) {
      if (shown.has(id)) continue;
      preview.model.removeFromParent();
      this.previews.delete(id);
      this.asked.delete(id);
    }
    for (const id of [...this.asked.keys()]) {
      if (!shown.has(id)) this.asked.delete(id);
    }
  }

  /**
   * Das Modell zu einer Id, gebaut beim ersten Hinsehen und dann behalten —
   * oder `null`, solange es keines gibt.
   *
   * **`null` wird nicht gemerkt.** Die Fabrik antwortet damit auch dann, wenn
   * das Modell erst noch geladen wird (`MenuModelFactory`); wer das als
   * „gibt es nicht" ablegte, hätte ein Fach, das für immer leer bleibt.
   * Gefragt wird deshalb wieder — aber höchstens alle `PREVIEW_RETRY`, sonst
   * stünde je Bild und Kachel dieselbe Frage.
   */
  private preview(id: string, size: number): THREE.Object3D | null {
    const existing = this.previews.get(id);
    // Dieselbe Id in einer Kachel ist größer als in einer Zeile: Stimmt das
    // Maß nicht mehr, wird sie noch einmal abgeschrieben.
    if (existing && Math.abs(existing.size - size) < 1e-4) return existing.model;
    if (!existing) {
      const last = this.asked.get(id);
      if (last !== undefined && this.previewClock - last < PREVIEW_RETRY) return null;
    }
    const source = this.models?.(id);
    if (!source) {
      this.asked.set(id, this.previewClock);
      return null;
    }
    this.asked.delete(id);
    existing?.model.removeFromParent();
    const model = menuMiniature(source, size);
    overlay(model, PREVIEW_ORDER);
    model.visible = false;
    this.panel.add(model);
    this.previews.set(id, { model, size });
    return model;
  }

  private clearPreviews(): void {
    for (const preview of this.previews.values()) {
      preview.model.removeFromParent();
      // Geometrie und Material gehören dem Werkzeug oder der Vorlage, von der
      // abgeschrieben wurde — hier wird nur der Rahmen weggeräumt.
    }
    this.previews.clear();
    this.asked.clear();
  }
}

/** A menu page, derived from the entry that opens it. */
function pageOf(entry: MenuEntry): Page {
  const grid = entry.grid ?? false;
  return {
    title: entry.label,
    // Eine versteckte Seite ist keine Zeile (`MenuEntry.hidden`).
    entries: (entry.children ?? []).filter((child) => !child.hidden),
    grid,
    ...(entry.cols === undefined ? {} : { cols: entry.cols }),
    take: entry.take ?? grid,
    home: entry.home ?? false,
    id: entry.id,
  };
}

/** Jede Gruppe und jedes Netz darin auf eine Stufe — siehe `PANEL_ORDER`. */
function overlay(object: THREE.Object3D, order: number): void {
  object.traverse((node) => {
    node.renderOrder = order;
  });
}
