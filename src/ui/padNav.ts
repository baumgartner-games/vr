import { firstGamepad, readGamepad, type GamepadLike, type Stick } from '../core/gamepad';
import { padKind, type PadKind, type PadSlot } from '../core/gamepadReport';
import { deviceKey, layoutSize, layoutSlots, padPlan, type PadPlan } from '../core/inputMap';
import { inputConfig, onInputConfigChange } from '../core/inputStore';
import { RepeatGate, navDirection, pickNext, type NavDir } from './spatialNav';
import './padNav.css';

/**
 * **Die Menüs am Schirm, mit dem Gamepad bedient.**
 *
 * Die Seite war für Maus und Finger gebaut: ein Knopf ☰ oben links, dahinter
 * ein Blatt aus Knöpfen (`ui/PageMenu.ts`). Wer mit einem Pad in der Hand vor
 * dem Fernseher saß, kam bis dahin gar nicht hinein — am Pad gab es keinen
 * Knopf für das Menü, und im Menü keinen Fokus, den ein Steuerkreuz hätte
 * bewegen können. Gewünscht: _„Menüs müssen vollständig mit dem Gamepad
 * bedienbar sein (Fokus sichtbar, D-Pad/Stick navigiert, A bestätigt, B
 * zurück, Schultertasten …)"_.
 *
 * Also gibt es hier einen **Fahrer**, der jedes Bild einmal das Pad liest und
 * es dem obersten offenen Ding gibt, das sich angemeldet hat (`PadScope`): dem
 * Menü, der Werkzeugliste, der Startseite. Was ein Knopf dort tut, ist überall
 * dasselbe — das einheitliche Schema aus `docs/agents/steuerung.md`:
 *
 * - **Steuerkreuz / linker Stock** bewegen den Fokus — nach der Geometrie
 *   (`spatialNav.pickNext`), nicht nach der Reihenfolge im DOM;
 * - **`A`** (unten) drückt, was den Fokus hat;
 * - **`B`** (rechts) geht eine Seite zurück, ganz oben macht es zu;
 * - **☰** macht zu — und ist nichts offen, macht es das Menü auf;
 * - **LB / RB** springen eine Seite hoch oder runter, der **rechte Stock**
 *   scrollt, was darunter scrollt.
 *
 * **Welche Nummer unten sitzt, sagt die Gerätekarte** (`core/inputMap.ts`):
 * Ein Backbone, das `A` und `B` vertauscht meldet, bestätigt nach dem Tausch
 * im Menü genauso richtig wie im Spiel. Gelesen wird mit denselben Funktionen
 * wie in `FlatControls` — ein zweiter Leser mit eigener Deutung wäre einer,
 * der beim nächsten Umbau stehen bleibt.
 *
 * Und dieselbe Bedienung an der Tastatur: Pfeile bewegen den Fokus, die
 * Rücktaste geht zurück (Eingabe und Leertaste drücken den Knopf ohnehin).
 * Der Fokus ist dann **sichtbar** (`html.nav-focus`, `padNav.css`) — und
 * verschwindet wieder, sobald jemand die Maus bewegt oder tippt.
 */

/** Ein Ding, das Knöpfe hat und sich mit dem Pad bedienen lässt. */
export interface PadScope {
  /** Ob es gerade offen ist. */
  active(): boolean;
  /** Worin seine Knöpfe stehen. */
  root(): HTMLElement | null;
  /**
   * `B`: eine Ebene zurück. `false` heißt „es gibt keine" — dann macht der
   * Fahrer zu (`close`).
   */
  back?(): boolean;
  /** Zumachen — ☰, oder `B` auf der obersten Ebene. Ohne: bleibt offen. */
  close?(): void;
  /** Macht auch `Y` (die Werkzeugliste) es wieder zu? */
  closeOnTools?: boolean;
  /** Wer gewinnt, wenn zwei offen sind — der Höhere. */
  priority: number;
  /** Womit der Fokus anfängt, wenn noch keiner drin steht. */
  initial?(root: HTMLElement): HTMLElement | null;
  /**
   * **Welche Seite gerade aufgeschlagen ist** — eine beliebige Kennung. Hat
   * sie sich geändert und der Fokus ist mit der alten Seite verschwunden,
   * fängt er bei `initial` an (die Zeile, aus der man zurückkam) und nicht
   * bei einem Knopf der neuen Seite, der zufällig wie der alte heißt.
   */
  page?(): string;
}

/** Womit zuletzt bedient wurde — für die Tastenhilfe (`ui/ControlHints.ts`). */
export type InputDevice = 'keyboard' | 'pad' | 'touch';

/** Was als Knopf zählt, den der Fokus besuchen darf. */
const FOCUSABLE =
  'button, input:not([type="hidden"]), select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

/** Scrollen mit dem rechten Stock, in Punkten je Sekunde bei vollem Ausschlag. */
const SCROLL_SPEED = 1100;

/** Wie viel einer Fensterhöhe LB/RB springen. */
const PAGE_SHARE = 0.8;

/** Die vier Stellen des Kreuzes — gelesen durch die Gerätekarte. */
const DPAD: readonly PadSlot[] = ['dpad-up', 'dpad-down', 'dpad-left', 'dpad-right'];

type PadEdge = 'use' | 'cancel' | 'menu' | 'tools' | 'zoomIn' | 'zoomOut';

export class PadNav {
  /** ☰, wenn nichts offen ist: das Menü aufmachen (`main.ts`). */
  onMenu: (() => void) | null = null;
  /**
   * Solange das stimmt, hört der Fahrer weg — das Menü _Eingaben_ wartet auf
   * einen Druck (`FlatControls.captureNext`), und der gehört dann nicht der
   * Navigation: Sonst ginge das Menü mit dem `B` zurück, das man gerade als
   * Sprungknopf festlegen wollte.
   */
  paused: () => boolean = () => false;

  private readonly scopes = new Set<PadScope>();
  private readonly deviceListeners = new Set<(device: InputDevice) => void>();
  private lastDevice: InputDevice = startDevice();
  private lastKind: PadKind = 'generic';
  private plan: PadPlan | null = null;
  private planFor = '';
  private dpadIndex: number[] = [];
  private down = new Set<PadEdge>();
  private readonly gate = new RepeatGate();
  private last = 0;
  private frame = 0;
  /** Welcher Knopf zuletzt den Fokus hatte — wiedergefunden nach einem Neuzeichnen. */
  private lastKey = '';
  /** Auf welcher Seite (`PadScope.page`) der Fokus zuletzt stand. */
  private lastPage = '';
  private readonly disposers: Array<() => void> = [];

  constructor(
    private readonly readPads: () => readonly (GamepadLike | null)[] | null = defaultPads,
  ) {}

  /** Anmelden; der Rückgabewert meldet wieder ab. */
  addScope(scope: PadScope): () => void {
    this.scopes.add(scope);
    return () => this.scopes.delete(scope);
  }

  /** Womit zuletzt bedient wurde. */
  get device(): InputDevice {
    return this.lastDevice;
  }

  /** Welche Aufschrift das zuletzt gelesene Pad hat — `A` oder `✕`. */
  get kind(): PadKind {
    return this.lastKind;
  }

  onDevice(listener: (device: InputDevice) => void): () => void {
    this.deviceListeners.add(listener);
    return () => this.deviceListeners.delete(listener);
  }

  /** Die Schleife anwerfen — einmal, von `main.ts`. */
  start(): void {
    if (typeof window === 'undefined' || this.frame) return;
    this.disposers.push(
      onInputConfigChange(() => {
        this.plan = null;
      }),
    );
    const onKey = (event: KeyboardEvent): void => this.onKey(event);
    const onPointer = (event: PointerEvent): void => {
      // Ein Stift ist am Glas dasselbe wie ein Finger.
      this.setDevice(
        event.pointerType === 'touch' || event.pointerType === 'pen' ? 'touch' : 'keyboard',
      );
      document.documentElement.classList.remove('nav-focus');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer, true);
    this.disposers.push(() => window.removeEventListener('keydown', onKey));
    this.disposers.push(() => window.removeEventListener('pointerdown', onPointer, true));
    const loop = (time: number): void => {
      this.frame = requestAnimationFrame(loop);
      this.tick(time);
    };
    this.frame = requestAnimationFrame(loop);
  }

  dispose(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    for (const off of this.disposers) off();
    this.disposers.length = 0;
  }

  /** Das oberste offene Ding — oder `null`. */
  get current(): PadScope | null {
    let best: PadScope | null = null;
    for (const scope of this.scopes) {
      if (!scope.active() || !scope.root()) continue;
      if (!best || scope.priority > best.priority) best = scope;
    }
    return best;
  }

  /** Ein Bild: das Pad lesen und dem obersten Ding geben. Öffentlich für Tests. */
  tick(time: number): void {
    const dt = this.last ? Math.min(0.1, (time - this.last) / 1000) : 1 / 60;
    this.last = time;
    const pad = firstGamepad(this.readPads()) as (GamepadLike & { id?: string }) | null;
    if (!pad) {
      this.down.clear();
      this.gate.step(null, time);
      return;
    }
    this.lastKind = padKind(pad.id);
    const frame = readGamepad(pad, this.planOf(pad));
    const now = new Set<PadEdge>();
    for (const key of ['use', 'cancel', 'menu', 'tools', 'zoomIn', 'zoomOut'] as const) {
      if (frame[key]) now.add(key);
    }
    const pressed = (key: PadEdge): boolean => now.has(key) && !this.down.has(key);
    const edges = new Set([...now].filter(pressed));
    this.down = now;
    const dpad = {
      up: buttonDown(pad, this.dpadIndex[0]),
      down: buttonDown(pad, this.dpadIndex[1]),
      left: buttonDown(pad, this.dpadIndex[2]),
      right: buttonDown(pad, this.dpadIndex[3]),
    };
    const active =
      edges.size > 0 ||
      dpad.up ||
      dpad.down ||
      dpad.left ||
      dpad.right ||
      Math.hypot(frame.move.x, frame.move.y) > 0 ||
      Math.hypot(frame.aim.x, frame.aim.y) > 0 ||
      frame.trigger > 0;
    if (active) this.setDevice('pad');

    if (this.paused()) {
      this.gate.step(null, time);
      return;
    }
    const scope = this.current;
    if (!scope) {
      this.gate.step(null, time);
      if (edges.has('menu')) this.onMenu?.();
      return;
    }
    const root = scope.root()!;
    // Wer mit dem Pad bedient, hat **immer** einen Fokus — auch nach einem
    // Seitenwechsel, bei dem der gedrückte Knopf mitsamt dem Fokus aus dem
    // DOM verschwand, während `A` noch lag.
    const had = this.focused(root) !== null;
    if (this.lastDevice === 'pad') this.showFocus(root, scope);

    // ☰ macht zu — und wo es nichts zuzumachen gibt (die Startseite), macht
    // es das Menü auf wie überall sonst.
    if (edges.has('menu')) {
      if (scope.close) scope.close();
      else this.onMenu?.();
      return;
    }
    if (edges.has('tools') && scope.closeOnTools) {
      scope.close?.();
      return;
    }
    if (edges.has('cancel')) {
      if (!(scope.back?.() ?? false)) scope.close?.();
      return;
    }
    if (edges.has('use')) {
      this.press(root);
      return;
    }
    if (edges.has('zoomIn')) this.page(root, 'up');
    if (edges.has('zoomOut')) this.page(root, 'down');

    // Der erste Druck zeigt nur, wo der Fokus steht — er springt nicht gleich
    // weiter, sonst begänne jedes Menü eine Zeile unter der ersten.
    const dir = this.gate.step(navDirection(dpad, frame.move), time);
    if (dir && had) this.move(root, dir);
    if (frame.aim.y !== 0) this.scroll(root, frame.aim, dt);
  }

  // --- Fokus ---------------------------------------------------------------

  /** Die Knöpfe, die gerade zu sehen sind. */
  private candidates(root: HTMLElement): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (node) => !node.closest('[hidden]') && !(node as HTMLButtonElement).disabled && visible(node),
    );
  }

  /** Was gerade den Fokus hat — wenn es in diesem Ding liegt und ein Knopf ist. */
  private focused(root: HTMLElement): HTMLElement | null {
    const active = document.activeElement as HTMLElement | null;
    if (!active || active === root || !root.contains(active)) return null;
    return active.matches(FOCUSABLE) ? active : null;
  }

  /**
   * **Der Fokus steht immer irgendwo** — sobald jemand am Pad drückt. Ein Menü
   * zeichnet seine Zeilen ständig neu (`PageMenu.render`), und ein Knopf, der
   * dabei ersetzt wird, nimmt den Fokus mit ins Nichts. Wiedergefunden wird er
   * an seinem Schlüssel (`data-key`, sonst Id oder Beschriftung); erst wenn es
   * den nicht mehr gibt, fängt der Fokus beim ersten Knopf an.
   */
  private showFocus(root: HTMLElement, scope: PadScope): HTMLElement | null {
    document.documentElement.classList.add('nav-focus');
    const now = this.focused(root);
    const page = scope.page?.() ?? '';
    if (page !== this.lastPage) {
      this.lastPage = page;
      // Eine andere Seite: Was dort den Fokus hatte, gilt hier nicht mehr.
      if (!now) this.lastKey = '';
    }
    if (now) {
      this.lastKey = keyOf(now);
      return now;
    }
    const list = this.candidates(root);
    const again = this.lastKey ? list.find((node) => keyOf(node) === this.lastKey) : undefined;
    const next = again ?? scope.initial?.(root) ?? preferred(list);
    if (next) this.focus(next);
    return next ?? null;
  }

  private focus(node: HTMLElement): void {
    node.focus({ preventScroll: true });
    node.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    this.lastKey = keyOf(node);
  }

  private move(root: HTMLElement, dir: NavDir): void {
    const from = this.focused(root);
    if (!from) return;
    const list = this.candidates(root).filter((node) => node !== from);
    const index = pickNext(
      from.getBoundingClientRect(),
      list.map((node) => node.getBoundingClientRect()),
      dir,
    );
    if (index >= 0) this.focus(list[index]!);
  }

  /** LB / RB: so lange weiter, bis eine gute Fensterhöhe geschafft ist. */
  private page(root: HTMLElement, dir: 'up' | 'down'): void {
    let from = this.focused(root);
    if (!from) return;
    const box = scroller(from) ?? root;
    const goal = Math.max(80, box.clientHeight * PAGE_SHARE);
    const start = from.getBoundingClientRect().top;
    const list = this.candidates(root);
    for (let steps = 0; steps < 200; steps++) {
      const others = list.filter((node) => node !== from);
      const index = pickNext(
        from.getBoundingClientRect(),
        others.map((node) => node.getBoundingClientRect()),
        dir,
      );
      if (index < 0) break;
      from = others[index]!;
      if (Math.abs(from.getBoundingClientRect().top - start) >= goal) break;
    }
    this.focus(from);
  }

  /** `A`: drücken, was den Fokus hat. Eine Auswahlliste schaltet eins weiter. */
  private press(root: HTMLElement): void {
    const node = this.focused(root);
    if (!node) return;
    if (node instanceof HTMLSelectElement) {
      const count = node.options.length;
      if (count > 0) {
        node.selectedIndex = (node.selectedIndex + 1) % count;
        node.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }
    if (node instanceof HTMLInputElement && node.type !== 'checkbox' && node.type !== 'radio') {
      node.focus();
      return;
    }
    node.click();
  }

  private scroll(root: HTMLElement, aim: Stick, dt: number): void {
    const box = scroller(this.focused(root) ?? root) ?? root;
    box.scrollTop += aim.y * SCROLL_SPEED * dt;
  }

  // --- Tastatur ------------------------------------------------------------

  /**
   * **Dieselbe Navigation an der Tastatur** — Pfeile und Rücktaste. Nur wenn
   * ein Ding offen ist, und nie, solange jemand in ein Feld tippt: Dort
   * gehören Pfeile und Rücktaste dem Text.
   */
  private onKey(event: KeyboardEvent): void {
    this.setDevice('keyboard');
    if (this.paused()) return;
    const scope = this.current;
    if (!scope) return;
    const target = event.target as HTMLElement | null;
    if (target && target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const root = scope.root()!;
    const dir = ARROWS[event.key];
    if (dir) {
      event.preventDefault();
      const had = this.focused(root);
      this.showFocus(root, scope);
      if (had) this.move(root, dir);
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (!(scope.back?.() ?? false)) scope.close?.();
      return;
    }
    if (event.key === 'Tab') document.documentElement.classList.add('nav-focus');
  }

  // --- Gerät ---------------------------------------------------------------

  private setDevice(device: InputDevice): void {
    if (device === this.lastDevice) return;
    this.lastDevice = device;
    if (device !== 'pad') this.down.clear();
    for (const listener of this.deviceListeners) listener(device);
  }

  /** Die Nummern dieses Pads — neu gerechnet, wenn Pad oder Belegung wechseln. */
  private planOf(pad: GamepadLike & { id?: string }): PadPlan {
    const count = pad.buttons.length;
    const key = `${deviceKey(pad.id)}:${count}`;
    if (this.plan && this.planFor === key) return this.plan;
    const config = inputConfig();
    const layout = config.layouts[deviceKey(pad.id)] ?? {};
    this.plan = padPlan(config, layout, count);
    this.planFor = key;
    const slots = layoutSlots(layout, layoutSize(count));
    this.dpadIndex = DPAD.map((slot) => slots.indexOf(slot));
    return this.plan;
  }
}

const ARROWS: Record<string, NavDir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

/**
 * **Womit angefangen wird, bevor irgendetwas gedrückt ist.** Hier stand
 * immer „Tastatur" — auf einem Telefon, das die Welt ohne Tipp aufmacht (eine
 * Adresse mit Welt dahinter, ein Neuladen), sprach die erste Tastenhilfe damit
 * von Leertaste und Tab. Ein Gerät ohne feinen Zeiger fängt beim Glas an.
 */
function startDevice(): InputDevice {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'keyboard';
  return window.matchMedia('(any-pointer: fine)').matches ? 'keyboard' : 'touch';
}

function defaultPads(): readonly (GamepadLike | null)[] | null {
  return typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
    ? navigator.getGamepads()
    : null;
}

function buttonDown(pad: GamepadLike, index: number | undefined): boolean {
  if (index === undefined || index < 0) return false;
  return pad.buttons[index]?.pressed === true;
}

function visible(node: HTMLElement): boolean {
  const rect = node.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/** Der erste gewählte Knopf (`is-selected`, `aria-checked`) — sonst der erste. */
function preferred(list: readonly HTMLElement[]): HTMLElement | undefined {
  return list.find((node) => node.classList.contains('is-selected')) ?? list[0];
}

/** Woran ein Knopf nach dem Neuzeichnen wiederzuerkennen ist. */
function keyOf(node: HTMLElement): string {
  const data = node.dataset;
  if (data['key']) return `k:${data['key']}`;
  if (data['more']) return `m:${data['more']}`;
  if (node.id) return `#${node.id}`;
  return `l:${node.getAttribute('aria-label') ?? node.textContent?.trim().slice(0, 40) ?? ''}`;
}

/** Der nächste Kasten darüber, der wirklich scrollt. */
function scroller(node: HTMLElement): HTMLElement | null {
  for (let at: HTMLElement | null = node.parentElement; at; at = at.parentElement) {
    const style = getComputedStyle(at);
    if (/(auto|scroll)/.test(style.overflowY) && at.scrollHeight > at.clientHeight) return at;
  }
  return null;
}

/** Der eine Fahrer der Seite — `main.ts` wirft ihn an, `App` meldet an. */
export const padNav = new PadNav();
