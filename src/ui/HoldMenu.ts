import * as THREE from 'three';
import { GhostHand, handColor, styleOfSetting } from '../core/HandVisuals';
import { buildControllerShape, controllerShape, ownMaterials } from '../core/ControllerModels';
import { GRIP_POSE_ID, mirrorHandPose, setHandPoseField, type HandPose } from '../core/handPose';
import {
  clearHoldHandPose,
  hasHandPose,
  holdHandPose,
  saveHoldHandPose,
} from '../core/handPoseStore';
import { createLighting } from '../worlds/shared/environment';
import { createGripShape } from '../worlds/portal/tools/grip';
import {
  HAND_HOLD_FIELDS,
  HAND_SCALE,
  HOLD_FIELDS,
  dishGrip,
  dishGripInHand,
  dishGripLine,
  dishGripStored,
  gripHandLine,
  saveDishGrip,
  defaultDishHold,
  dishHold,
  dishHoldStored,
  holdLine,
  saveDishHold,
  stepHold,
  type DishHold,
} from '../worlds/elements/dishHold';
import type { KitchenItem } from '../worlds/test/zones/kitchenRecipes';
import { cssColor } from './PageMenu';
import { keepSafe } from './safeArea';
import './holdMenu.css';

/**
 * **Halten einstellen** — die Seite hinter dem Knopf auf der Detailseite eines
 * Möbels (`PortalWorld.elementMenu`).
 *
 * Gewünscht (September 2026): _„in der detail seite einen button haben wollen,
 * wo ich auf ein menü komme, wo ich den gegenstand in der luft fliegen sehe,
 * mit checkbox ob ich den haltezylinder sehen will, und checkbox wie die vr
 * hand den haltezylinder hält. und da will ich auch über slider und buttons die
 * möglichkeit haben den haltezylinder anzupassen, x,y,z, rotation, jaw pitch
 * (gerne einfach in 10° schritten)"_.
 *
 * Genau das steht hier: oben das Ding **in der Luft**, so groß, wie es in der
 * Hand liegt (`dishHold.HAND_SCALE`); darin der grüne **Halterzylinder** mit
 * seinem rosa Pfeil nach vorn (`grip.createGripShape`); darum die **rechte
 * Hand** in der Faust, mit der sie jeden Zylinder hält (die Haltung des
 * Standardgriffs, `GRIP_POSE_ID`, wie sie unter _Einstellungen → Hände_
 * eingestellt ist). Darunter drei Häkchen und sechs Regler.
 *
 * **Das Ding als Geist**: Der Zylinder steckt meist _im_ Ding, und ein
 * Hörnchen verdeckt ihn ganz. Gewünscht: _„checkbox: objekt ghost an/aus"_ —
 * das Ding wird dann halb durchsichtig gezeichnet, und man sieht, wo der
 * Zylinder darin sitzt (`HoldScene.set`).
 *
 * **Controller und Hand, jedes für sich** — gewünscht: _„bei der VR-Hand am
 * Zylinder anzeigen, meine ich dass die hand anzeige losgelöst sein kann von
 * dem zylinder (nur optisch die hand)"_, dazu ein **Geist des Controllers**
 * als Richtung des Zylinders. Die Kette ist dieselbe wie in der Brille: Der
 * Controller sitzt bei `C · G⁻¹` (der Griffraum, in dem der Zylinder im
 * Standardgriff liegt), die Hand bei `Controller · H`. Über den Reglern wählt
 * man, **was** sie verschieben: den Zylinder im Ding (`DishHold`) oder die
 * Hand am Controller (`H`, die Faust des Standardgriffs, `GRIP_POSE_ID`,
 * rechts eingestellt und links gespiegelt). Die Hand ist nur Bild — sie
 * verschiebt weder Ding noch Zylinder — und gilt für **jeden** Standardgriff,
 * denn in der Brille hält dieselbe Faust auch Pistole und Messer.
 * _VR-Hand zum Controller zurück_ nimmt die eingestellte Faust weg.
 *
 * **Die Neigung für alle** (`dishHold.DISH_GRIP`) ist die dritte Wahl über den
 * Reglern: wie der Zylinder selbst im Standardgriff sitzt — Roll dreht ihn
 * um seinen Pfeil. Sie gilt für jedes Ding der Küche; auf der Seite dreht sie
 * Controller und Hand um den Zylinder, denn hier steht das Ding still.
 * _Kopieren_ gibt drei Zeilen: Zylinder, Hand, Neigung.
 *
 * **Das Ding steht still, der Zylinder wandert.** Eingestellt wird die Lage
 * des Zylinders **im Ding** (`dishHold.DishHold`); die Hand hängt am Zylinder
 * und kommt mit. In der Brille ist es umgekehrt, und das ist dieselbe Rechnung
 * rückwärts (`dishHold.dishInHand`): Die Faust steht, wo sie steht, und das
 * Ding hängt so daran, dass sein Zylinder in ihr liegt.
 *
 * **Gespeichert wird sofort** (`saveDishHold`), und die Welt liest es im
 * nächsten Bild — wer mit einem Hörnchen in der Hand hier etwas verstellt,
 * sieht es drüben. _Kopieren_ gibt die Zeile, die in `DISH_HOLDS` gehört, damit
 * sie für alle gilt.
 *
 * Eine zweite Szene mit eigenem Renderer, wie die Umkleide (`WardrobeMenu.ts`):
 * erst beim Öffnen gebaut, beim Schließen samt Kontext wieder weg. Solange sie
 * offen ist, ist das Menü mit seiner Detailseite zu (`App.openHoldEditor`),
 * damit nie zwei Vorschauen zugleich einen WebGL-Kontext halten.
 */

/** Was die Seite zeigt: ein Ding der Küche und wie man es baut. */
export interface HoldSubject {
  readonly item: KitchenItem;
  /** Wie es heißt — „Hörnchen". */
  readonly label: string;
  /** Das Bild, wie es auch in der Hand hängt (`KaykitDishView.view`), ohne Maßstab. */
  model(): THREE.Object3D;
}

export interface HoldMenuOptions {
  host?: HTMLElement;
  onToggle?: (open: boolean) => void;
}

/** Die Farbe der Seite — die des Möbelkatalogs. */
const ACCENT = 0xe0914a;

const FOV = 34;
/** Wie weit ein Wisch über die ganze Bühne dreht. */
const DRAG_TURN = Math.PI * 2;

export class HoldMenu {
  readonly element: HTMLElement;

  private readonly sheet: HTMLElement;
  private readonly title: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly ghostBox: HTMLInputElement;
  private readonly cylinderBox: HTMLInputElement;
  private readonly controllerBox: HTMLInputElement;
  private readonly handBox: HTMLInputElement;
  private readonly targetButtons: Record<HoldTarget, HTMLButtonElement>;
  private readonly rows: Array<{
    key: keyof DishHold;
    range: HTMLInputElement;
    minus: HTMLButtonElement;
    plus: HTMLButtonElement;
    value: HTMLElement;
  }> = [];
  private readonly noteEl: HTMLElement;
  private readonly resetButton: HTMLButtonElement;
  private readonly onToggle: ((open: boolean) => void) | null;

  private open = false;
  private subject: HoldSubject | null = null;
  private view: HoldScene | null = null;
  private ghost = false;
  private showCylinder = true;
  private showController = true;
  private showHand = true;
  /** Was die Regler gerade verschieben. */
  private target: HoldTarget = 'cylinder';

  constructor(options: HoldMenuOptions = {}) {
    this.onToggle = options.onToggle ?? null;

    this.element = el('div', 'hold');
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-label', 'Halten einstellen');

    this.sheet = el('div', 'hold__sheet');
    this.sheet.tabIndex = -1;
    keepSafe(this.sheet, 'top', 'bottom', 'left', 'right');
    this.sheet.style.setProperty('--accent', cssColor(ACCENT));

    const head = el('header', 'hold__head');
    const back = el('button', 'hold__round');
    back.type = 'button';
    back.setAttribute('aria-label', 'Zurück');
    back.title = 'Zurück zum Möbel';
    back.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>';
    this.title = el('h2', 'hold__title', 'Halten einstellen');
    head.append(back, this.title);

    const body = el('div', 'hold__body');
    this.stage = el('div', 'hold__stage');
    this.stage.setAttribute('aria-hidden', 'true');

    const controls = el('div', 'hold__controls');
    const checks = el('div', 'hold__checks');
    this.ghostBox = check(checks, 'Gegenstand als Geist (durchsichtig)', this.ghost);
    this.cylinderBox = check(checks, 'Halterzylinder zeigen', this.showCylinder);
    this.controllerBox = check(checks, 'Controller zeigen (Geist)', this.showController);
    this.handBox = check(checks, 'VR-Hand zeigen (nur optisch)', this.showHand);
    const handReset = el(
      'button',
      'hold__button hold__wide',
      'VR-Hand zum Controller zurücksetzen',
    );
    handReset.type = 'button';
    handReset.title = 'Die eingestellte Faust wegnehmen — die Hand hält wieder den Zylinder';
    controls.append(checks, handReset);

    // **Was die Regler verschieben** — der Zylinder im Ding oder die Hand am
    // Controller. Zwei Knöpfe nebeneinander, der gewählte in der Farbe.
    const targets = el('div', 'hold__targets');
    targets.setAttribute('role', 'radiogroup');
    targets.setAttribute('aria-label', 'Regler verschieben');
    const targetButton = (target: HoldTarget, text: string): HTMLButtonElement => {
      const button = el('button', 'hold__target', text);
      button.type = 'button';
      button.setAttribute('role', 'radio');
      button.addEventListener('click', () => {
        this.target = target;
        this.paint();
      });
      targets.append(button);
      return button;
    };
    this.targetButtons = {
      cylinder: targetButton('cylinder', 'Halterzylinder'),
      hand: targetButton('hand', 'VR-Hand'),
      grip: targetButton('grip', 'Neigung (alle)'),
    };
    controls.append(targets);

    for (const field of HOLD_FIELDS) {
      const row = el('div', 'hold__row');
      const name = el('span', 'hold__name', field.label);
      const minus = el('button', 'hold__step', '−');
      minus.type = 'button';
      const range = document.createElement('input');
      range.type = 'range';
      range.className = 'hold__range';
      range.min = String(field.min);
      range.max = String(field.max);
      range.setAttribute('aria-label', `${field.label} in ${field.unit}`);
      const plus = el('button', 'hold__step', '+');
      plus.type = 'button';
      const value = el('span', 'hold__value');
      row.append(name, minus, range, plus, value);
      controls.append(row);
      this.rows.push({ key: field.key, range, minus, plus, value });

      const angle = field.unit === '°';
      const step = (): number => fieldsOf(this.target).find((one) => one.key === field.key)!.step;
      minus.addEventListener('click', () =>
        this.change(field.key, (now) => stepHold(now, step(), -1, angle)),
      );
      plus.addEventListener('click', () =>
        this.change(field.key, (now) => stepHold(now, step(), 1, angle)),
      );
      range.addEventListener('input', () => this.change(field.key, () => Number(range.value)));
    }

    this.noteEl = el('p', 'hold__note');
    this.noteEl.setAttribute('aria-live', 'polite');
    controls.append(this.noteEl);
    body.append(this.stage, controls);

    const foot = el('div', 'hold__foot');
    const reset = el('button', 'hold__button', 'Zylinder zurücksetzen');
    reset.type = 'button';
    reset.title = 'Was über den Reglern gewählt ist, zurück auf den Code';
    this.resetButton = reset;
    const copy = el('button', 'hold__button', 'Kopieren');
    copy.type = 'button';
    copy.title = 'Zylinder und Hand als zwei Zeilen in die Zwischenablage';
    const done = el('button', 'hold__done', 'Fertig');
    done.type = 'button';
    foot.append(reset, copy, done);

    this.sheet.append(head, body, foot);
    this.element.append(this.sheet);
    (options.host ?? document.body).append(this.element);

    this.element.addEventListener('click', (event) => {
      if (event.target === this.element) this.toggle(false);
    });
    back.addEventListener('click', () => this.toggle(false));
    done.addEventListener('click', () => this.toggle(false));
    reset.addEventListener('click', () => this.reset());
    copy.addEventListener('click', () => this.copy());
    this.ghostBox.addEventListener('change', () => {
      this.ghost = this.ghostBox.checked;
      this.paint();
    });
    this.cylinderBox.addEventListener('change', () => {
      this.showCylinder = this.cylinderBox.checked;
      this.paint();
    });
    this.controllerBox.addEventListener('change', () => {
      this.showController = this.controllerBox.checked;
      this.paint();
    });
    this.handBox.addEventListener('change', () => {
      this.showHand = this.handBox.checked;
      this.paint();
    });
    handReset.addEventListener('click', () => this.resetHand());
    this.stage.addEventListener('pointerdown', this.onPointerDown);
    this.stage.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Mit diesem Ding aufschlagen. */
  show(subject: HoldSubject): void {
    const other = this.subject?.item !== subject.item;
    this.subject = subject;
    this.title.textContent = `Halten: ${subject.label}`;
    this.element.setAttribute('aria-label', `Halten einstellen — ${subject.label}`);
    if (other && this.view) {
      this.stopPreview();
      if (this.open) this.startPreview();
    }
    this.setNote('');
    this.toggle(true);
    this.paint();
  }

  toggle(force?: boolean): void {
    const next = force ?? !this.open;
    if (next === this.open) return;
    this.open = next;
    this.element.hidden = !next;
    if (next) {
      this.startPreview();
      this.paint();
      this.sheet.focus({ preventScroll: true });
    } else {
      this.stopPreview();
    }
    this.onToggle?.(next);
  }

  dispose(): void {
    this.stopPreview();
    window.removeEventListener('keydown', this.onKeyDown);
    this.element.remove();
  }

  // --- Regler -----------------------------------------------------------------

  private hold(): DishHold {
    return this.subject ? dishHold(this.subject.item) : defaultDishHold('plate');
  }

  private change(key: keyof DishHold, next: (now: number) => number): void {
    const subject = this.subject;
    if (!subject) return;
    if (this.target === 'hand') {
      const pose = holdHandPose('right', GRIP_POSE_ID);
      const value = next(pose[key]);
      if (!Number.isFinite(value)) return;
      saveGripHand(setHandPoseField(pose, key, value));
    } else if (this.target === 'grip') {
      const tilt = dishGrip();
      const value = next(tilt[key]);
      if (!Number.isFinite(value)) return;
      saveDishGrip({ ...tilt, [key]: value });
    } else {
      const hold = this.hold();
      const value = next(hold[key]);
      if (!Number.isFinite(value)) return;
      saveDishHold(subject.item, { ...hold, [key]: value });
    }
    this.setNote('');
    this.paint();
  }

  /** Die Faust des Standardgriffs vergessen — an beiden Händen, wie sie gespeichert wird. */
  private resetHand(): void {
    clearHoldHandPose('right', GRIP_POSE_ID);
    clearHoldHandPose('left', GRIP_POSE_ID);
    this.setNote('VR-Hand wieder am Controller — die Faust aus dem Code.');
    this.paint();
  }

  /** Was gerade gewählt ist, zurück auf den Code. */
  private reset(): void {
    const subject = this.subject;
    if (!subject) return;
    if (this.target === 'hand') {
      this.resetHand();
      return;
    }
    if (this.target === 'grip') {
      saveDishGrip(null);
      this.setNote('Neigung für alle zurück auf den Code.');
    } else {
      saveDishHold(subject.item, null);
      this.setNote('Zylinder zurück auf die Haltung aus dem Code.');
    }
    this.paint();
  }

  private copy(): void {
    const subject = this.subject;
    if (!subject) return;
    const line = [
      holdLine(subject.item, this.hold()),
      gripHandLine(holdHandPose('right', GRIP_POSE_ID), hasHandPose('right', GRIP_POSE_ID)),
      dishGripLine(dishGrip()),
    ].join('\n');
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard) {
      this.setNote(line);
      return;
    }
    clipboard.writeText(line).then(
      () => this.setNote(`Kopiert: ${line}`),
      () => this.setNote(line),
    );
  }

  private setNote(text: string): void {
    this.noteEl.textContent = text;
  }

  /** Zahlen, Regler und Bild auf den Stand der gespeicherten Haltung. */
  private paint(): void {
    const hold = this.hold();
    const hand = holdHandPose('right', GRIP_POSE_ID);
    const tilt = dishGrip();
    const shown: Readonly<Record<keyof DishHold, number>> =
      this.target === 'hand' ? hand : this.target === 'grip' ? tilt : hold;
    const fields = fieldsOf(this.target);
    for (const [target, button] of Object.entries(this.targetButtons)) {
      const on = target === this.target;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-checked', String(on));
    }
    for (const row of this.rows) {
      const value = shown[row.key];
      const field = fields.find((one) => one.key === row.key)!;
      row.range.step = String(field.step);
      row.minus.title = `${field.label} − ${field.step} ${field.unit}`;
      row.plus.title = `${field.label} + ${field.step} ${field.unit}`;
      // Ein Regler, an dem gerade gezogen wird, bekommt seine Zahl nicht
      // zurückgeschrieben — sonst springt er unter dem Finger auf die Raste.
      if (document.activeElement !== row.range) row.range.value = String(value);
      row.value.textContent = `${round(value)} ${field.unit}`;
    }
    const stored = this.subject ? dishHoldStored(this.subject.item) : false;
    this.sheet.classList.toggle('is-custom', stored || dishGripStored());
    this.resetButton.textContent =
      this.target === 'hand'
        ? 'Hand zurücksetzen'
        : this.target === 'grip'
          ? 'Neigung zurücksetzen'
          : 'Zylinder zurücksetzen';
    this.view?.set(hold, hand, tilt, {
      cylinder: this.showCylinder,
      controller: this.showController,
      hand: this.showHand,
      ghost: this.ghost,
    });
  }

  // --- Bühne ------------------------------------------------------------------

  private startPreview(): void {
    if (this.view || !this.subject) return;
    try {
      if (typeof WebGL2RenderingContext === 'undefined') throw new Error('kein WebGL 2');
      this.view = new HoldScene(this.stage, this.subject);
    } catch {
      this.view = null;
      this.stage.hidden = true;
      return;
    }
    this.stage.hidden = false;
  }

  private stopPreview(): void {
    this.view?.dispose();
    this.view = null;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    const view = this.view;
    if (!view) return;
    const width = this.stage.clientWidth || 1;
    const height = this.stage.clientHeight || 1;
    let lastX = event.clientX;
    let lastY = event.clientY;
    this.stage.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent): void => {
      view.turn((e.clientX - lastX) / width, (e.clientY - lastY) / height);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const up = (): void => {
      this.stage.removeEventListener('pointermove', move);
      this.stage.removeEventListener('pointerup', up);
      this.stage.removeEventListener('pointercancel', up);
    };
    this.stage.addEventListener('pointermove', move);
    this.stage.addEventListener('pointerup', up);
    this.stage.addEventListener('pointercancel', up);
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.view?.zoom(event.deltaY > 0 ? 1 / 1.15 : 1.15);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.open && event.key === 'Escape') this.toggle(false);
  };
}

/**
 * **Die Szene: das Ding in der Luft, der Zylinder darin, die Hand daran.**
 *
 * Alles steht im Rahmen des Dings (Nullpunkt der Szene). Der Zylinder steht
 * bei `C` (die Haltung), die Hand bei `C · G⁻¹ · H`: `G` ist der Standardgriff
 * in der Hand (`STANDARD_GRIP_IN_HAND`), `H` die Haltung der Faust im Griffraum
 * — genau die Kette, mit der die Hand in der Brille am Controller sitzt, nur
 * vom Zylinder aus gerechnet.
 */
class HoldScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 20);
  private readonly lighting: THREE.Group;
  private readonly thing = new THREE.Group();
  private readonly cylinder = new THREE.Group();
  private readonly shape: THREE.Mesh;
  private readonly hand: GhostHand;
  /**
   * **Der Controller als Geist** — dort, wo er in der Brille säße: im
   * Griffraum, also bei `C · G⁻¹`. Erst der selbst gebaute, dann, sobald die
   * Datei da ist, das echte Modell (`ControllerModels.controllerShape`).
   * Durchsichtig und ohne Tiefe, damit er Zylinder und Hand nicht verdeckt.
   */
  private readonly controller = new THREE.Group();
  private readonly controllerStuff: THREE.Material[] = [];
  private readonly controllerMeshes: THREE.Mesh[] = [];
  private real: THREE.Object3D | null = null;
  private disposed = false;
  /**
   * Die Stoffe des Dings, wie sie kamen, und ihre durchsichtigen Doppel. Die
   * Stoffe gehören den Vorlagen der Welt (`KaykitDishView`) und werden deshalb
   * nie verändert: Getauscht wird am Mesh, und beim Schließen kommt das
   * Original zurück.
   *
   * **Nachgesehen wird in jedem Bild** (`dress`), nicht nur beim Öffnen: Das
   * Hörnchen lädt sein Modell erst hinterher (`IceConeView`), und beim
   * Aufschlagen hingen nur die Kugeln schon daran — gemeldet: _„anscheinend
   * sind nur die eis kugeln hier durchsichtig"_.
   */
  private readonly skins = new Map<
    THREE.Mesh,
    { solid: THREE.Material | THREE.Material[]; ghost: THREE.Material | THREE.Material[] }
  >();
  private ghosted = false;
  private readonly box = new THREE.Box3();
  private readonly target = new THREE.Vector3(0, 0.1, 0);
  private yaw = -0.7;
  private pitch = 0.25;
  private near = 1;
  private frame = 0;
  private size = 0;

  constructor(
    private readonly stage: HTMLElement,
    subject: HoldSubject,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    stage.append(this.renderer.domElement);

    this.lighting = createLighting(1);
    this.scene.add(this.lighting);

    this.thing.scale.setScalar(HAND_SCALE);
    this.thing.add(subject.model());
    this.scene.add(this.thing);

    this.shape = createGripShape({ front: true });
    this.cylinder.add(this.shape);
    this.scene.add(this.cylinder);

    this.hand = new GhostHand('right', holdHandPose('right', GRIP_POSE_ID), {
      color: handColor(),
      look: styleOfSetting(),
      opacity: 1,
    });
    this.scene.add(this.hand);

    const shell = this.ghostStuff(0x9aa6bd);
    const built = buildControllerShape('right', shell, (_key, color) =>
      this.ghostStuff(color),
    ).root;
    built.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) this.controllerMeshes.push(mesh);
    });
    this.controller.add(built);
    this.scene.add(this.controller);
    void controllerShape('right').then((shape) => {
      if (!shape || this.disposed) return;
      for (const material of ownMaterials(shape)) {
        material.transparent = true;
        material.opacity = CONTROLLER_OPACITY;
        material.depthWrite = false;
        this.controllerStuff.push(material);
      }
      this.real = shape;
      built.visible = false;
      this.controller.add(shape);
    });

    this.loop();
  }

  private ghostStuff(color: number): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      transparent: true,
      opacity: CONTROLLER_OPACITY,
      depthWrite: false,
    });
    this.controllerStuff.push(material);
    return material;
  }

  set(hold: DishHold, pose: HandPose, tilt: DishHold, show: SceneShow): void {
    this.ghosted = show.ghost;
    this.dress();
    this.cylinder.position.set(hold.x / 100, hold.y / 100, hold.z / 100);
    this.cylinder.quaternion.setFromEuler(
      _euler.set(hold.pitch * DEG, hold.yaw * DEG, hold.roll * DEG, 'XYZ'),
    );
    this.cylinder.visible = show.cylinder;

    // Der Controller: der Griffraum, in dem der Zylinder im Standardgriff liegt.
    this.cylinder.updateMatrix();
    // Mit der Neigung für alle (`dishGripInHand`): Der Zylinder steht still,
    // also drehen Controller und Hand um ihn.
    const grip = dishGripInHand(tilt);
    _g.compose(
      _p.set(grip.position.x, grip.position.y, grip.position.z),
      _q.set(grip.rotation.x, grip.rotation.y, grip.rotation.z, grip.rotation.w),
      _one,
    ).invert();
    _c.multiplyMatrices(this.cylinder.matrix, _g);
    _c.decompose(this.controller.position, this.controller.quaternion, _s);
    this.controller.visible = show.controller;

    // Die Hand: am Controller, wo ihre Faust sie hinsetzt.
    _h.compose(
      _p.set(pose.x / 100, pose.y / 100, pose.z / 100),
      _q.setFromEuler(_euler.set(pose.pitch * DEG, pose.yaw * DEG, pose.roll * DEG, 'XYZ')),
      _one,
    );
    _m.multiplyMatrices(_c, _h);
    _m.decompose(this.hand.position, this.hand.quaternion, _s);
    this.hand.setPose(pose);
    this.hand.update(1);
    this.hand.visible = show.hand;
  }

  /**
   * **Jedes Mesh des Dings im richtigen Stoff** — als Geist oder, wie es kam,
   * fest. Was seit dem letzten Bild dazugekommen ist, bekommt hier sein
   * durchsichtiges Doppel; alles, was nicht Hand und nicht Zylinder ist, hängt
   * unter `thing` und wird damit erfasst.
   */
  private dress(): void {
    this.thing.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      let skin = this.skins.get(mesh);
      if (!skin || (mesh.material !== skin.solid && mesh.material !== skin.ghost)) {
        if (skin) for (const ghost of [skin.ghost].flat()) ghost.dispose();
        const solid = mesh.material;
        skin = { solid, ghost: Array.isArray(solid) ? solid.map(ghostOf) : ghostOf(solid) };
        this.skins.set(mesh, skin);
      }
      const want = this.ghosted ? skin.ghost : skin.solid;
      if (mesh.material !== want) mesh.material = want;
    });
  }

  /** Um das Ding herum: waagerecht eine Umdrehung über die Breite, senkrecht gedeckelt. */
  turn(dx: number, dy: number): void {
    this.yaw -= dx * DRAG_TURN;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + dy * Math.PI));
  }

  zoom(factor: number): void {
    this.near = Math.max(0.4, Math.min(3, this.near * factor));
  }

  dispose(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.disposed = true;
    this.hand.dispose();
    // Das echte Modell teilt seine Geometrie mit allen Controllern: nur
    // aushängen. Die eigenen Kästen und alle Stoffe gehören dieser Szene.
    this.real?.removeFromParent();
    this.real = null;
    for (const mesh of this.controllerMeshes) mesh.geometry.dispose();
    for (const material of this.controllerStuff) material.dispose();
    this.shape.geometry.dispose();
    this.shape.traverse((node) => {
      const line = node as THREE.LineSegments;
      if (line.isLineSegments) {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
    });
    // Das Ding selbst gehört den Vorlagen der Welt (`KaykitDishView`): die
    // eigenen Stoffe zurück, die Geister weg, und dann nur abhängen.
    for (const [mesh, skin] of this.skins) {
      mesh.material = skin.solid;
      for (const ghost of [skin.ghost].flat()) ghost.dispose();
    }
    this.skins.clear();
    this.thing.removeFromParent();
    this.lighting.removeFromParent();
    this.renderer.domElement.remove();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private readonly loop = (): void => {
    this.frame = requestAnimationFrame(this.loop);
    if (!this.fit()) return;
    this.dress();
    this.aim();
    this.renderer.render(this.scene, this.camera);
  };

  /** Auf die Mitte des Dings, und so weit weg, dass es samt Hand ins Bild passt. */
  private aim(): void {
    // Das Ding samt der Stelle, an der die Faust sitzt: Ein Hörnchen hält man
    // unten an der Spitze, und die Mitte des Dings allein ließe die Hand beim
    // Heranzoomen aus dem Bild fallen.
    this.box.setFromObject(this.thing);
    this.box.expandByPoint(_p.copy(this.cylinder.position).addScalar(FIST_REACH));
    this.box.expandByPoint(_p.copy(this.cylinder.position).addScalar(-FIST_REACH));
    this.box.getCenter(this.target);
    const size = this.box.getSize(_p).length();
    // Etwas Luft ringsum; ohne sie stünde ein Hörnchen formatfüllend da und
    // die Finger am Rand.
    const span = Math.max(size, 0.22) + 0.06;
    const dist = span / 2 / Math.tan((FOV * DEG) / 2) / this.near;
    const cos = Math.cos(this.pitch);
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * cos * dist,
      this.target.y + Math.sin(this.pitch) * dist,
      this.target.z + Math.cos(this.yaw) * cos * dist,
    );
    this.camera.lookAt(this.target);
  }

  private fit(): boolean {
    const width = this.stage.clientWidth;
    const height = this.stage.clientHeight;
    if (width <= 0 || height <= 0) return false;
    const stamp = width * 4096 + height;
    if (stamp === this.size) return true;
    this.size = stamp;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    return true;
  }
}

const DEG = Math.PI / 180;
/** Wie weit die Faust um die Mitte des Zylinders reicht — so viel Bild braucht sie. */
const FIST_REACH = 0.06;
const _euler = new THREE.Euler();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _one = new THREE.Vector3(1, 1, 1);
const _h = new THREE.Matrix4();
const _c = new THREE.Matrix4();
const _g = new THREE.Matrix4();
const _m = new THREE.Matrix4();
/** Wie viel vom Controller-Geist zu sehen ist. */
const CONTROLLER_OPACITY = 0.45;

/** Was die Regler verschieben. */
type HoldTarget = 'cylinder' | 'hand' | 'grip';

interface SceneShow {
  readonly cylinder: boolean;
  readonly controller: boolean;
  readonly hand: boolean;
  readonly ghost: boolean;
}

function fieldsOf(target: HoldTarget): typeof HOLD_FIELDS | typeof HAND_HOLD_FIELDS {
  return target === 'hand' ? HAND_HOLD_FIELDS : HOLD_FIELDS;
}

/**
 * **Die Faust des Standardgriffs speichern** — rechts, wie sie hier gezeigt
 * wird, und links gespiegelt, wie es die Seite _Hände_ auch tut
 * (`mirrorHandPose`). Sonst hielte die linke Hand in der Brille das Hörnchen
 * anders als die rechte.
 */
function saveGripHand(pose: HandPose): void {
  saveHoldHandPose('right', GRIP_POSE_ID, pose);
  saveHoldHandPose('left', GRIP_POSE_ID, mirrorHandPose(pose));
}

/**
 * **Ein Stoff als Geist**: dieselbe Farbe, zu einem Drittel sichtbar, und ohne
 * Eintrag in die Tiefe — sonst verdeckte die Vorderseite des Dings seine eigene
 * Rückseite und den Zylinder dahinter trotzdem.
 */
function ghostOf(material: THREE.Material): THREE.Material {
  const ghost = material.clone();
  ghost.transparent = true;
  ghost.opacity = 0.3;
  ghost.depthWrite = false;
  return ghost;
}

function round(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function check(parent: HTMLElement, text: string, on: boolean): HTMLInputElement {
  const label = el('label', 'hold__check');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = on;
  label.append(box, el('span', '', text));
  parent.append(label);
  return box;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
