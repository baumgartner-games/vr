import * as THREE from 'three';
import { UIPanel } from './UIPanel';
import { TextPlane } from './TextPlane';
import type { MenuEntry } from './menu';
import { MenuNav } from './menuNav';
import type { Pointer } from '../core/Pointer';
import type { Handedness, XRInput } from '../core/XRInput';

const _wrist = new THREE.Vector3();
const _head = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _handUp = new THREE.Vector3();
const _roll = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _panelUp = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _mat = new THREE.Matrix4();
const _local = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _delta = new THREE.Quaternion();

interface Page {
  title: string;
  entries: MenuEntry[];
  grid: boolean;
  /** Entries are taken with the grab button instead of tapped. */
  take: boolean;
  /** Id of the entry this page belongs to, for reopening it later. */
  id: string;
}

const BACK: MenuEntry = { id: 'menu:back', label: 'Zurück', icon: 'back', accent: 0x6f7d99 };

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

export interface WristMenuOptions {
  title?: string;
  footer?: string;
  /** Which wrist it rides on. Both hands carry one; see `WristMenus`. */
  hand?: Handedness;
  /**
   * Wo im Baum man ist — von beiden Händen geteilt. Ohne einen gemeinsamen
   * Weg fängt die zweite Hand jedes Mal ganz oben an.
   */
  nav?: MenuNav;
  /** Opened or closed — the pair uses it to keep only one panel up. */
  onToggle?(menu: WristMenu, open: boolean): void;
}

/**
 * The menu button rides on a hand; pressing it opens a panel that keeps
 * following that hand, tilting along with it. The other hand points and selects.
 *
 * There is one of these per wrist (`WristMenus`), because which hand is free
 * depends entirely on what the other one is doing — and a menu you can only
 * reach with the hand that is currently holding a pistol is no menu at all.
 */
export class WristMenu extends THREE.Group {
  readonly panel: UIPanel;
  readonly button: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  /** One line about the entry under the pointer, floating over the panel. */
  private readonly caption: TextPlane;
  private captionText = '';

  /** Which hand carries the menu. */
  readonly hand: Handedness;
  private readonly onToggle: ((menu: WristMenu, open: boolean) => void) | null;

  private open = false;
  private buttonTexture: THREE.CanvasTexture;
  private buttonCanvas: HTMLCanvasElement;
  private buttonHot = false;
  private root: MenuEntry[] = [];
  private rootTitle = 'Menü';
  private stack: Page[] = [];
  /** Der geteilte Weg durch den Baum — beide Handgelenke lesen denselben. */
  private readonly nav: MenuNav;
  private readonly unwatchNav: () => void;
  /**
   * Hand pose at the moment the menu opened. The panel starts upright from
   * there and only tilts by however much the wrist has turned since — trying
   * to derive "up" from the hand every frame is what made it keel over.
   */
  private tiltRef: THREE.Quaternion | null = null;
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
  private pending: { index: number; hand: Handedness } | null = null;

  constructor(
    private readonly pointer: Pointer,
    options: WristMenuOptions = {},
  ) {
    super();
    this.hand = options.hand ?? 'left';
    this.nav = options.nav ?? new MenuNav();
    this.onToggle = options.onToggle ?? null;
    this.name = `wrist-menu-${this.hand}`;
    // Die andere Hand ist eine Ebene tiefer gegangen: dieselbe Seite hier.
    this.unwatchNav = this.nav.onChange(() => this.applyNav());

    this.buttonCanvas = document.createElement('canvas');
    this.buttonCanvas.width = 256;
    this.buttonCanvas.height = 256;
    this.buttonTexture = new THREE.CanvasTexture(this.buttonCanvas);
    this.buttonTexture.colorSpace = THREE.SRGBColorSpace;

    this.button = new THREE.Mesh(
      new THREE.CircleGeometry(0.026, 32),
      new THREE.MeshBasicMaterial({
        map: this.buttonTexture,
        transparent: true,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    this.button.name = `wrist-menu-button-${this.hand}`;
    this.button.renderOrder = 12;
    this.button.geometry.computeBoundingBox();
    this.add(this.button);

    this.panel = new UIPanel({
      width: 0.26,
      title: options.title ?? 'Menü',
      footer: options.footer ?? 'Andere Hand: zielen + Trigger/A',
      onSelect: (index, hand) => this.handleSelect(index, hand),
    });
    this.panel.visible = false;
    this.add(this.panel);

    // A grid cell has room for two words. What the thing actually does goes
    // here instead, above the panel, while the pointer rests on it.
    this.caption = new TextPlane({
      width: 0.3,
      height: 0.06,
      title: '',
      accent: 0x9fd0ff,
      align: 'center',
    });
    this.caption.visible = false;
    this.caption.renderOrder = 11;
    this.add(this.caption);

    this.attachPointer();
    this.drawButton();
  }

  /** (Re-)registers the menu with the pointer, e.g. after a world switch. */
  attachPointer(): void {
    this.pointer.remove(this.button);
    this.pointer.remove(this.panel);
    // Both hands have a laser now, and this menu rides on one of them: its own
    // ray would sweep across its own button and panel every time the wrist
    // turns, and would then swallow that hand's trigger. The other hand aims —
    // that is what the footer has been saying all along.
    const own = (hand: Handedness | null) => hand === this.hand;
    this.pointer.add({
      object: this.button,
      // Only the trigger (or A) opens it — brushing past must not toggle it.
      pokeable: false,
      ignore: own,
      onHover: () => this.setButtonHot(true),
      onBlur: () => this.setButtonHot(false),
      onSelect: () => this.toggle(),
    });
    this.pointer.add({ ...this.panel.asPointerTarget(), pokeable: false, ignore: own });
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
  setRoot(entries: MenuEntry[], title = 'Menü'): void {
    this.root = entries;
    this.rootTitle = title;
    this.keepScroll();
    this.nav.prune(entries);
    this.applyNav();
  }

  /** Opens the submenu of a root entry, e.g. after using an item from it. */
  openSubmenu(id: string): void {
    const entry = this.root.find((candidate) => candidate.id === id);
    if (!entry?.children) return;
    this.keepScroll();
    this.nav.goTo([id]);
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
      { title: this.rootTitle, entries: this.root, grid: false, take: false, id: 'root' },
    ];
    let level: MenuEntry[] = this.root;
    for (const id of path) {
      const entry = level.find((candidate) => candidate.id === id);
      if (!entry?.children) break;
      this.stack.push(pageOf(entry));
      level = entry.children;
    }
    this.applyPage();
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
    // Every fresh opening re-centres the tilt on however the hand is held now.
    if (this.open !== wasOpen) this.tiltRef = null;
    // Aufmachen heißt: dahin, wo die andere Hand aufgehört hat — Seite *und*
    // Zeile. Das Panel behält sonst seine eigene Blätterstellung von vorhin.
    if (this.open && !wasOpen) {
      this.swipe = null;
      this.pending = null;
      this.panel.scrollTo(this.nav.scrollOf(this.page.id));
    }
    // Closing keeps the page. Going away to try something out and coming back
    // to the top of the tree is the same annoyance as being thrown to the top
    // of a list, one level up — and the title on the panel plus the *Zurück*
    // row say plainly where you are.
    if (!this.open) this.keepScroll();
    this.drawButton();
    if (this.open !== wasOpen) this.onToggle?.(this, this.open);
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
    this.panel.update(dt);

    // Everything is computed in this group's space (the player rig), where the
    // controller and joint poses already live.
    this.updateMatrixWorld(true);
    _local.copy(this.matrixWorld).invert().multiply(headWorld);
    _head.setFromMatrixPosition(_local);

    this.updateGrabTake(input);
    this.updateScroll(dt, input);
    this.updateSwipe(input);
    this.updatePending(input);

    const controller = input.get(this.hand);
    const anchor = controller?.tracked ? wristObject(controller.isHand, controller) : null;

    this.button.visible = true;
    this.panel.visible = this.open;

    if (anchor) {
      _wrist.copy(anchor.position);
      // The hand's own up axis carries the button on the back of the hand.
      _handUp.set(0, 1, 0).applyQuaternion(anchor.quaternion);
      if (Math.abs(_handUp.dot(_dir.copy(_head).sub(_wrist).normalize())) > 0.97) {
        _handUp.copy(_up);
      }

      _dir.copy(_head).sub(_wrist);
      const distance = _dir.length() || 1;
      _dir.divideScalar(distance);

      _roll.copy(_handUp);
      this.button.position.copy(_wrist).addScaledVector(_dir, 0.05).addScaledVector(_handUp, 0.03);
      faceTowards(this.button, _head, _roll);

      // The panel starts upright above the wrist and tilts by however far the
      // wrist has turned since it was opened — no absolute hand axis involved,
      // so it can never flip over on its own.
      this.tiltRef ??= anchor.quaternion.clone();
      _delta.copy(anchor.quaternion).multiply(_quat.copy(this.tiltRef).invert());
      _panelUp.copy(_up).applyQuaternion(_delta);
      if (Math.abs(_panelUp.dot(_dir)) > 0.97) _panelUp.copy(_up);

      this.panel.position.copy(_wrist).addScaledVector(_dir, 0.08).addScaledVector(_panelUp, 0.2);
      faceTowards(this.panel, _head, _panelUp);

      this.updateCaption();
      if (this.caption.visible) {
        this.caption.position
          .copy(this.panel.position)
          .addScaledVector(_panelUp, this.panelHeight / 2 + 0.05);
        faceTowards(this.caption, _head, _panelUp);
      }
      return;
    }

    this.tiltRef = null;

    // No tracked hand (desktop/phone): dock the menu to the view instead.
    _quat.setFromRotationMatrix(_local);
    this.button.position.copy(_head).add(_offset.set(0.2, -0.16, -0.55).applyQuaternion(_quat));
    this.button.quaternion.copy(_quat);
    this.panel.position.copy(_head).add(_offset.set(0, -0.02, -0.62).applyQuaternion(_quat));
    this.panel.quaternion.copy(_quat);

    this.updateCaption();
    if (this.caption.visible) {
      this.caption.position
        .copy(this.panel.position)
        .add(_offset.set(0, this.panelHeight / 2 + 0.05, 0).applyQuaternion(_quat));
      this.caption.quaternion.copy(_quat);
    }
  }

  /** How tall the panel is in metres, for putting the caption above it. */
  private get panelHeight(): number {
    return this.panel.geometry.parameters.height;
  }

  /**
   * The line over the panel: whatever the pointer rests on says what it is.
   * Only entries that carry a `caption` get one — a list already spells itself
   * out in its rows, and a second copy of the same words is just noise.
   */
  private updateCaption(): void {
    const entry = this.open ? this.displayed()[this.panel.hovered.index] : undefined;
    const text = entry?.caption ?? '';
    if (text !== this.captionText) {
      this.captionText = text;
      if (text) this.caption.setText(text);
    }
    this.caption.visible = text.length > 0;
  }

  dispose(): void {
    this.unwatchNav();
    this.pointer.remove(this.button);
    this.pointer.remove(this.panel);
    this.button.geometry.dispose();
    this.button.material.dispose();
    this.buttonTexture.dispose();
    this.panel.dispose();
    this.caption.dispose();
    this.removeFromParent();
  }

  // --- pages --------------------------------------------------------------

  private get page(): Page {
    return this.stack[this.stack.length - 1]!;
  }

  private displayed(): MenuEntry[] {
    const entries = this.page.entries;
    return this.stack.length > 1 ? [BACK, ...entries] : entries;
  }

  private applyPage(): void {
    const page = this.page;
    this.panel.setPage(page.title, this.displayed(), {
      grid: page.grid,
      hint: page.take ? 'Zeigen + Greifen/A nimmt es in die Hand' : undefined,
      // The same page again keeps its place; a different one starts where it
      // was left. Using a row is what changes its label, so a page is
      // re-applied constantly — resetting it there was what threw you back to
      // the top every time you took a tool or stepped a setting.
      key: page.id,
      scroll: this.nav.scrollOf(page.id),
      // Die *Zurück*-Zeile bleibt als Kopf stehen, egal wie weit man unten
      // ist. Eine lange Seite, aus der man nur wieder herauskommt, indem man
      // erst blind nach oben blättert, ist eine Falle.
      pinned: this.stack.length > 1 ? 1 : 0,
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
    if (!entry || entry === BACK || !entry.run) return;

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
    return this.panel.hovered.hand ?? (this.hand === 'left' ? 'right' : 'left');
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
    this.runSelect(pending.index, pending.hand);
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
      this.runSelect(index, null);
      return;
    }
    this.pending = { index, hand };
  }

  private runSelect(index: number, hand: Handedness | null): void {
    const entry = this.displayed()[index];
    if (!entry) return;

    if (entry === BACK) {
      this.keepScroll();
      this.nav.pop();
      return;
    }
    if (entry.children) {
      this.pushPage(entry);
      return;
    }
    // Taken items need the grab button; only the mouse may tap them.
    if (this.page.take && hand !== null) return;
    entry.run?.(hand);
    this.panel.refresh();
  }

  // --- button -------------------------------------------------------------

  private setButtonHot(hot: boolean): void {
    if (this.buttonHot === hot) return;
    this.buttonHot = hot;
    this.drawButton();
  }

  private drawButton(): void {
    const ctx = this.buttonCanvas.getContext('2d')!;
    const size = this.buttonCanvas.width;
    ctx.clearRect(0, 0, size, size);

    const glow = ctx.createRadialGradient(128, 128, 40, 128, 128, 126);
    glow.addColorStop(0, this.open ? 'rgba(255, 157, 61, 0.95)' : 'rgba(74, 168, 255, 0.95)');
    glow.addColorStop(1, 'rgba(8, 14, 26, 0.9)');
    ctx.beginPath();
    ctx.arc(128, 128, 124, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.lineWidth = this.buttonHot ? 12 : 7;
    ctx.strokeStyle = this.buttonHot ? '#ffffff' : 'rgba(255,255,255,0.75)';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    if (this.open) {
      ctx.beginPath();
      ctx.moveTo(88, 88);
      ctx.lineTo(168, 168);
      ctx.moveTo(168, 88);
      ctx.lineTo(88, 168);
      ctx.stroke();
    } else {
      for (let i = 0; i < 3; i++) {
        const y = 94 + i * 34;
        ctx.beginPath();
        ctx.moveTo(86, y);
        ctx.lineTo(170, y);
        ctx.stroke();
      }
    }

    this.buttonTexture.needsUpdate = true;
  }
}

/** A menu page, derived from the entry that opens it. */
function pageOf(entry: MenuEntry): Page {
  const grid = entry.grid ?? false;
  return {
    title: entry.label,
    entries: entry.children ?? [],
    grid,
    take: entry.take ?? grid,
    id: entry.id,
  };
}

function wristObject(isHand: boolean, controller: { hand: THREE.XRHandSpace; grip: THREE.Group }) {
  if (isHand) {
    const wrist = controller.hand.joints['wrist'];
    return wrist && wrist.visible ? wrist : null;
  }
  return controller.grip.visible ? controller.grip : null;
}

/** Points an object's +Z at a target, rolling around the given up axis. */
function faceTowards(object: THREE.Object3D, target: THREE.Vector3, up: THREE.Vector3): void {
  _mat.lookAt(target, object.position, up);
  object.quaternion.setFromRotationMatrix(_mat);
}
