import * as THREE from 'three';
import { AvatarBody, type AvatarLimb } from '../core/AvatarBody';
import { appearance, appearanceSummary, onAppearanceChange } from '../core/appearance';
import { createLighting } from '../worlds/shared/environment';
import { cssColor } from './PageMenu';
import { wardrobeRows } from './wardrobeRows';
import './wardrobe.css';

/**
 * **Die Umkleide am Bildschirm** — was hinter dem Kleiderschrank steckt
 * (`worlds/grid/fixtures/wardrobe.ts`).
 *
 * Eine Seite über dem Bild, geschnitten wie das Menü (`ui/pageMenu.css`):
 * auf dem Telefon ein Blatt von unten, am Schreibtisch ein Kasten in der
 * Mitte. Links drei Zeilen mit ‹ und › — **Kopf**, **Hut**, **Körper**
 * (`wardrobeRows.ts`) —, rechts **die Figur in Nahaufnahme**, unten _Fertig_.
 *
 * **Die Figur ist eine zweite Szene.** Ein eigener `WebGLRenderer` in einem
 * eigenen Canvas, ein `AvatarBody` darin, dasselbe Licht wie im Spiel
 * (`createLighting`) — und beides entsteht erst beim Öffnen und ist beim
 * Schließen wieder weg. Das ist die Stelle, an der man es falsch machen kann:
 * Ein zweiter Renderer, der im Hintergrund weiterläuft, kostet auf der Quest
 * genau die Bilder, die dem Spiel fehlen. Der Grund, warum es überhaupt eine
 * zweite Szene ist und kein Ausschnitt der ersten: Die Figur steht im Spiel
 * auf einer Ebene, die nur Portale zeichnen (`PlayerAvatar`,
 * `LAYER_SELF_ONLY`), und sie steht dort, wo der Spieler steht — nicht vor
 * einem Vorhang, in den man hineinschaut.
 *
 * **In der Brille gibt es diese Seite nicht.** Dort zeigt der Spiegel am
 * Schrank einen selbst, und die drei Zeilen stehen am Handgelenk unter
 * _Aussehen_ (`App.openWardrobe`). Ein zweites Canvas vor dem Gesicht wäre
 * dort ein Bild von einem Spiegel neben einem Spiegel.
 *
 * **Gespeichert wird sofort** (`saveAppearance`); _Fertig_ schließt nur. Wer
 * hier etwas ändert, sieht es im selben Bild an der eigenen Figur draußen —
 * der Körper und das Netz hören über `onAppearanceChange` zu.
 */

export interface WardrobeMenuOptions {
  /** Woran die Seite hängt; ohne Angabe `document.body`. */
  host?: HTMLElement;
  /** Auf- oder zugegangen — `App` stellt daraufhin das Laufen ab. */
  onToggle?: (open: boolean) => void;
}

/** Die Farbe der Seite — dieselbe wie die Zeile _Aussehen_ im Menü. */
const ACCENT = 0x5ee0a0;

/** Wie schnell sich die Figur von selbst dreht, in Bogenmaß je Sekunde. */
const SPIN = 0.35;
/** Und wie weit ein Wisch über die ganze Bühne sie dreht. */
const DRAG_TURN = Math.PI * 2;

/** Wo die Kamera steht und wohin sie schaut — eine Figur, ganz im Bild. */
const CAMERA_FOV = 36;
const CAMERA_AT = new THREE.Vector3(0, 1.1, 3);
const CAMERA_LOOK = new THREE.Vector3(0, 1, 0);

/** Die Kopfpose, aus der die Figur gebaut wird: aufrecht, zur Kamera gedreht. */
const HEAD_Y = 1.62;

export class WardrobeMenu {
  /** Das Ganze: Hintergrund zum Wegtippen und das Blatt darauf. */
  readonly element: HTMLElement;

  private readonly sheet: HTMLElement;
  private readonly rowsEl: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly onToggle: ((open: boolean) => void) | null;
  private readonly offLook: () => void;

  private open = false;
  private view: PreviewScene | null = null;

  constructor(options: WardrobeMenuOptions = {}) {
    this.onToggle = options.onToggle ?? null;

    this.element = el('div', 'wrobe');
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-label', 'Umkleide');

    this.sheet = el('div', 'wrobe__sheet');
    this.sheet.tabIndex = -1;
    this.sheet.style.setProperty('--accent', cssColor(ACCENT));

    const head = el('header', 'wrobe__head');
    const title = el('h2', 'wrobe__title', 'Umkleide');
    const close = el('button', 'wrobe__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Schließen');
    close.title = 'Schließen';
    close.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>';
    head.append(title, close);

    const body = el('div', 'wrobe__body');
    this.stage = el('div', 'wrobe__stage');
    this.stage.setAttribute('aria-hidden', 'true');
    this.rowsEl = el('div', 'wrobe__rows');
    body.append(this.stage, this.rowsEl);

    const foot = el('div', 'wrobe__foot');
    const done = el('button', 'wrobe__done', 'Fertig');
    done.type = 'button';
    foot.append(done);

    this.sheet.append(head, body, foot);
    this.element.append(this.sheet);
    (options.host ?? document.body).append(this.element);

    // Neben das Blatt tippen macht zu — auf dem Telefon der Weg ohne Zielen.
    this.element.addEventListener('click', (event) => {
      if (event.target === this.element) this.toggle(false);
    });
    close.addEventListener('click', () => this.toggle(false));
    done.addEventListener('click', () => this.toggle(false));
    this.stage.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('keydown', this.onKeyDown);

    // Geändert wird auch woanders — im Menü am Handgelenk, auf der Seite
    // _Aussehen_. Steht die Umkleide offen, zieht sie mit.
    this.offLook = onAppearanceChange(() => this.refresh());
    this.render();
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(force?: boolean): void {
    const next = force ?? !this.open;
    if (next === this.open) return;
    this.open = next;
    this.element.hidden = !next;
    if (next) {
      this.render();
      this.startPreview();
      this.sheet.focus({ preventScroll: true });
    } else {
      this.stopPreview();
    }
    this.onToggle?.(next);
  }

  dispose(): void {
    this.offLook();
    this.stopPreview();
    window.removeEventListener('keydown', this.onKeyDown);
    this.element.remove();
  }

  // --- die drei Zeilen ------------------------------------------------------

  /** Zeilen und Figur auf den neuesten Stand — nach jeder Änderung. */
  private refresh(): void {
    this.render();
    this.view?.body.setLook(appearance());
  }

  private render(): void {
    const look = appearance();
    this.element.setAttribute('aria-label', `Umkleide — ${appearanceSummary(look)}`);
    this.rowsEl.replaceChildren(...wardrobeRows(look).map((row) => this.rowNode(row)));
  }

  private rowNode(row: ReturnType<typeof wardrobeRows>[number]): HTMLElement {
    const node = el('div', 'wrobe__row');
    node.dataset['slot'] = row.slot;

    const back = arrow('‹', `${row.label}: eines zurück`);
    const forward = arrow('›', `${row.label}: eines weiter`);
    back.addEventListener('click', () => row.step(-1));
    forward.addEventListener('click', () => row.step(1));

    const pick = el('div', 'wrobe__pick');
    pick.append(
      el('span', 'wrobe__label', row.label),
      el('strong', '', row.value),
      el('small', '', `${row.sub} · ${row.index + 1}/${row.count}`),
    );

    node.append(back, pick, forward);
    return node;
  }

  // --- die Figur in Nahaufnahme --------------------------------------------

  /**
   * Die zweite Szene aufbauen — und stillschweigend darauf verzichten, wenn
   * dieser Browser keinen zweiten WebGL-Kontext hergibt.
   *
   * Das ist kein Randfall: Ein Browser gibt nur eine Handvoll Kontexte her,
   * und in einem Test gibt er gar keinen. Ohne Bild bleiben die drei Zeilen,
   * und die sind es, worum es hier geht — eine Umkleide, die nicht aufgeht,
   * weil die Vorschau nicht kann, wäre die schlechtere Antwort.
   */
  private startPreview(): void {
    if (this.view) return;
    try {
      // Erst fragen, dann bauen: three zeichnet seit r15x nur noch auf WebGL 2,
      // und ein Renderer, der das im Konstruktor herausfindet, schreibt dabei
      // eine Fehlermeldung in die Konsole, die hier kein Fehler ist.
      if (typeof WebGL2RenderingContext === 'undefined') throw new Error('kein WebGL 2');
      this.view = new PreviewScene(this.stage);
    } catch {
      this.view = null;
      this.stage.hidden = true;
      return;
    }
    this.stage.hidden = false;
    this.view.body.setLook(appearance());
  }

  private stopPreview(): void {
    this.view?.dispose();
    this.view = null;
  }

  /** Wischen dreht die Figur — solange der Finger liegt. */
  private readonly onPointerDown = (event: PointerEvent): void => {
    const view = this.view;
    if (!view) return;
    const width = this.stage.clientWidth || 1;
    let last = event.clientX;
    view.spinning = false;
    this.stage.setPointerCapture(event.pointerId);

    const move = (e: PointerEvent): void => {
      view.turn += ((e.clientX - last) / width) * DRAG_TURN;
      last = e.clientX;
    };
    const up = (): void => {
      this.stage.removeEventListener('pointermove', move);
      this.stage.removeEventListener('pointerup', up);
      this.stage.removeEventListener('pointercancel', up);
      view.spinning = true;
    };
    this.stage.addEventListener('pointermove', move);
    this.stage.addEventListener('pointerup', up);
    this.stage.addEventListener('pointercancel', up);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.open && event.key === 'Escape') this.toggle(false);
  };
}

/**
 * **Die kleine Szene neben den Zeilen**: ein Renderer, ein Licht, eine Figur
 * auf einem Drehteller.
 *
 * Gedreht wird der **Teller** und nicht der Kopf. Der Körper folgt seinem Kopf
 * mit einer Totzone (`AvatarBody.update`) — wer ihn über den Kopf drehte,
 * bekäme eine Figur, die dem Blick hinterherzuckelt statt sich zu zeigen.
 */
class PreviewScene {
  readonly body: AvatarBody;
  /** Wie weit der Teller gedreht ist, in Bogenmaß. */
  turn = 0;
  /** Ob er sich von selbst weiterdreht — beim Wischen nicht. */
  spinning = true;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly table = new THREE.Group();
  private readonly lighting: THREE.Group;
  private readonly head: AvatarLimb = {
    position: new THREE.Vector3(0, HEAD_Y, 0),
    quaternion: new THREE.Quaternion(),
  };
  private readonly clock = new THREE.Clock();
  private frame = 0;
  private size = 0;

  constructor(private readonly stage: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    stage.append(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 20);
    this.camera.position.copy(CAMERA_AT);
    this.camera.lookAt(CAMERA_LOOK);

    this.lighting = createLighting(1);
    this.scene.add(this.lighting);

    // Mit Handkugeln: Ohne sie sieht die Figur von vorn abgesägt aus, und die
    // Hände sind das Einzige, woran man die Hautfarbe zweimal sieht.
    this.body = new AvatarBody({ hands: true });
    this.table.add(this.body);
    this.scene.add(this.table);

    this.loop();
  }

  dispose(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.body.dispose();
    this.lighting.removeFromParent();
    this.renderer.domElement.remove();
    this.renderer.dispose();
    // Der Kontext wird knapp, wenn eine Seite ihn mehrmals aufmacht: `dispose`
    // allein gibt ihn nicht überall zurück.
    this.renderer.forceContextLoss();
  }

  private readonly loop = (): void => {
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (this.spinning) this.turn += dt * SPIN;
    this.table.rotation.y = this.turn;
    this.body.update(dt, this.head, null, null);
    this.fit();
    this.renderer.render(this.scene, this.camera);
  };

  /** Die Bühne kann ihre Größe ändern (Drehen des Telefons) — dann das Bild auch. */
  private fit(): void {
    const width = this.stage.clientWidth;
    const height = this.stage.clientHeight;
    if (width <= 0 || height <= 0) return;
    const stamp = width * 4096 + height;
    if (stamp === this.size) return;
    this.size = stamp;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}

// --- Bausteine --------------------------------------------------------------

function arrow(glyph: string, label: string): HTMLButtonElement {
  const node = el('button', 'wrobe__arrow', glyph);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  node.title = label;
  return node;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // `textContent`, nie `innerHTML`: Beschriftungen kommen aus Listen, aber die
  // Regel gilt im ganzen Haus (`PageMenu.ts`).
  if (text) node.textContent = text;
  return node;
}
