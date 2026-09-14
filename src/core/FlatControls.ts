import * as THREE from 'three';
import type { PlayerRig } from './PlayerRig';
import type { TopDownCamera } from './TopDownCamera';
import { ButtonState } from './XRInput';
import { firstGamepad, readGamepad, type GamepadFrame } from './gamepad';
import { isTyping } from './textEntry';
import { yawFromDirection, type Vec2 } from './topDownPose';
import { smoothAngle } from '../net/PoseSmoothing';

const _forward = new THREE.Vector3();
const _strafe = new THREE.Vector3();
const _move = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const _euler = new THREE.Euler();
/** Sekunden, in denen sich die Figur von oben in ihre Laufrichtung dreht. */
const TURN_TAU = 0.07;
/** Wie schnell der rechte Stick am Gamepad den Blick dreht, im Bogenmaß je Sekunde. */
const PAD_LOOK_SPEED = 2.6;
/**
 * Wie weit der Zeiger von der Figur weg sein muss, damit er als Ziel zählt, in
 * CSS-Punkten. Direkt auf der Figur ist die Richtung ein Rundungsfehler, und
 * die Waffe zappelte im Kreis.
 */
const AIM_MIN_PIXELS = 24;

/**
 * **Die Knöpfe auf dem Glas** — was die Seite an Touch-Bedienung mitbringt
 * (`index.html`, `style.css`).
 *
 * Alle vier sind Zeigerflächen und keine echten Knöpfe: Die Leiste liegt auf
 * `pointer-events: none`, die Ereignisse kommen an der Leinwand an, und hier
 * wird nachgesehen, über welchem Feld ein Finger aufgesetzt hat. So kann
 * derselbe Finger vom Zielstock nicht versehentlich die Kamera mitnehmen.
 */
export interface TouchPads {
  /** Der linke Stock: laufen. */
  stick: HTMLElement | null;
  /** Der rechte Stock: zielen — nur von oben. */
  aim: HTMLElement | null;
  /** Knopf `A`: benutzen. */
  use: HTMLElement | null;
  /** Knopf `B`: schießen. */
  fire: HTMLElement | null;
  /** Der Block mit Zielstock und Knöpfen — steht nur in der Ansicht von oben. */
  right: HTMLElement | null;
}

/**
 * Keyboard/mouse and touch fallback so the worlds can also be visited without a
 * headset — the basis for asymmetric sessions where phones join a VR player.
 *
 * **Und die eine Stelle, an der Eingabe zusammenläuft.** Von oben gespielt
 * wird mit vier Geräten auf einmal — Tastatur, Maus, Gamepad, Glas —, und
 * jedes davon meint dasselbe: laufen, zielen, benutzen, schießen, zoomen
 * (`docs/plan-2d-hub-interaktion.md`, E4). Sie werden hier zu **einer**
 * Absicht verrechnet und nicht in vier Zweigen der Welten noch einmal; eine
 * Welt, die selbst Tasten abhört, hat dieselbe Taste zweimal.
 */
export class FlatControls {
  enabled = true;
  speed = 3.2;
  lookSpeed = 0.0024;
  /**
   * Der Wunsch dieses Bildes für die alte Kachelwelt (`world2d/`).
   *
   * Ausgehängt: Von oben läuft jetzt das Rig selbst, niemand liest hier mehr
   * etwas heraus. Das Feld steht noch, weil `World2D` es als Rückruf
   * verlangt — mit dem Rest von Phaser fällt es weg (Paket P8).
   */
  readonly wish = { x: 0, z: 0, sprint: false };

  private readonly keys = new Set<string>();
  private jumpQueued = false;
  private useQueued = false;
  private yaw = 0;
  private pitch = 0;
  private pointerLocked = false;
  private lookPointer: number | null = null;
  private lookLast = new THREE.Vector2();
  private stickPointer: number | null = null;
  private stickOrigin = new THREE.Vector2();
  private stick = new THREE.Vector2();
  private aimPointer: number | null = null;
  private aimOrigin = new THREE.Vector2();
  private aimStick = new THREE.Vector2();
  private usePointer: number | null = null;
  private firePointer: number | null = null;
  /** Ob die linke Maustaste gerade unten liegt — von oben ist sie der Trigger. */
  private mouseFire = false;
  /** Wo der Mauszeiger zuletzt stand, in CSS-Punkten. `null`: noch nie bewegt. */
  private mouse: { x: number; y: number } | null = null;
  /**
   * Ob zuletzt ein **Stock** gezielt hat und nicht die Maus.
   *
   * Wer mit dem Gamepad spielt, schiebt die Maus nicht weg — sie liegt
   * irgendwo auf dem Schirm und zöge die Figur ohne diesen Merker dauernd zu
   * sich. Erst eine echte Mausbewegung holt das Zielen zurück.
   */
  private aimedWithStick = false;
  private topDownOn = false;
  private readonly pads: TouchPads;
  /** Die Flanken des Gamepads — Knöpfe eines Pads kommen als Zustand, nicht als Ereignis. */
  private readonly padUse = new ButtonState();
  private readonly padZoomIn = new ButtonState();
  private readonly padZoomOut = new ButtonState();
  private disposers: Array<() => void> = [];

  constructor(
    private readonly rig: PlayerRig,
    private readonly canvas: HTMLCanvasElement,
    pads: TouchPads | HTMLElement | null,
    /**
     * Die Kamera von oben — gebraucht wird sie für zwei Dinge: wo die Figur auf
     * dem Schirm steht (`project`, dahin zielt die Maus) und der Zoom auf den
     * Bumpern. `null` in Tests und überall, wo es keine gibt.
     */
    private readonly view: TopDownCamera | null = null,
  ) {
    this.pads =
      pads && 'stick' in pads
        ? pads
        : { stick: pads, aim: null, use: null, fire: null, right: null };
    this.bind();
  }

  /**
   * **Von oben gesteuert** — die Ansicht _Von oben_ (`core/TopDownCamera.ts`).
   *
   * Dann laufen die Tasten in **Weltrichtungen**: oben ist Norden (−z), rechts
   * ist Osten (+x), und zwar unabhängig davon, wohin die Figur gerade schaut.
   * Gelaufen wird über dieselbe Physik wie am Schreibtisch
   * (`PlayerRig.setIntent`) — eine feste Kamera ist ein Blickwinkel und kein
   * zweiter Antrieb.
   *
   * Die Maus dreht hier **nichts** und fängt keinen Zeiger ein; sie **zielt**:
   * Die Figur schaut zum Zeiger, solange einer bewegt wurde, sonst dorthin,
   * wohin sie läuft. Mit dem Umschalten geht auch die rechte Hälfte der
   * Touch-Bedienung an und aus — Zielstock und die Knöpfe `A`/`B` haben nur
   * von oben eine Bedeutung.
   */
  get topDown(): boolean {
    return this.topDownOn;
  }

  set topDown(on: boolean) {
    if (on === this.topDownOn) return;
    this.topDownOn = on;
    if (this.pads.right) this.pads.right.hidden = !on;
    // Was noch gedrückt war, bleibt beim Umschalten nicht gedrückt: ein
    // Trigger, der über den Ansichtswechsel liegen bleibt, feuert weiter.
    this.mouseFire = false;
    this.firePointer = null;
    this.setPressed(this.pads.fire, false);
    this.aimStick.set(0, 0);
    this.updateStickVisual(this.pads.aim, 0, 0);
    this.rig.setTrigger(0);
  }

  /** Called when the player is placed, so look direction matches the spawn. */
  syncFromRig(): void {
    this.yaw = new THREE.Euler().setFromQuaternion(this.rig.quaternion, 'YXZ').y;
    this.pitch = 0;
    this.apply();
  }

  /**
   * Turns keys and the touch stick into a movement wish for the rig.
   *
   * @param dt Bildzeit in Sekunden — nur die Ansicht von oben braucht sie, um
   *           die Figur weich in ihre Laufrichtung zu drehen.
   */
  update(dt = 1 / 60): void {
    if (!this.enabled) return;

    const pad = this.readPad();

    let x = this.stick.x + pad.move.x;
    let z = this.stick.y + pad.move.y;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;

    const jump = this.jumpQueued;
    this.jumpQueued = false;
    const sprint = this.keys.has('ShiftLeft') || pad.sprint;

    if (this.topDownOn) {
      this.walkNorthUp(dt, x, z, jump, sprint, pad);
      return;
    }

    // Außerhalb von _Von oben_ darf der Gamepad mitspielen: linker Stick
    // läuft, rechter sieht sich um, `A` springt. Erlaubt, nicht verlangt — die
    // Ansicht aus den Augen gehört Maus und Tastatur, und wer kein Pad
    // angeschlossen hat, merkt von diesen drei Zeilen nichts.
    if (pad.aim.x !== 0 || pad.aim.y !== 0) {
      this.look(pad.aim.x * PAD_LOOK_SPEED * dt, pad.aim.y * PAD_LOOK_SPEED * dt, 1);
    }
    const jumpNow = jump || this.padUse.justPressed;
    // Der Trigger gehört von oben der Figur; aus den Augen schießt weiter, was
    // schon immer geschossen hat (die Maus, über die Welt) — ein zweiter Weg
    // dorthin wäre ein zweiter Schuss.
    this.rig.setTrigger(0);
    this.useQueued = false;

    if (x === 0 && z === 0) {
      if (jumpNow) this.rig.requestJump();
      return;
    }

    this.rig.getHeadForward(_forward);
    _strafe.copy(_forward).cross(UP).normalize();
    _move.set(0, 0, 0).addScaledVector(_forward, -z).addScaledVector(_strafe, x);
    if (_move.lengthSq() > 1) _move.normalize();
    // Die Welt darf das Tempo vorgeben (`PlayerRig.pace`); sonst gilt die Tastatur.
    const speed = this.rig.walkSpeed(sprint, this.speed * (sprint ? 1.8 : 1));
    this.rig.setIntent(_move.multiplyScalar(speed), jumpNow, sprint);
  }

  dispose(): void {
    for (const off of this.disposers) off();
    this.disposers = [];
  }

  /**
   * **Laufen in Weltrichtungen** — die Ansicht von oben.
   *
   * W ist Norden und bleibt Norden, auch wenn die Figur nach Süden schaut: Bei
   * einer festen Kamera ist die Taste eine Richtung auf dem Schirm, und nichts
   * anderes erwartet jemand, der von oben spielt. Deshalb steht hier kein
   * `getHeadForward` wie im Zweig darunter.
   *
   * **Und die Figur dreht sich dorthin, wo sie hinläuft** — weich, sonst
   * ruckte sie bei jedem Tastenwechsel um 45°. Das ist die Twin-Stick-Regel
   * ohne zweiten Stick: Sie gilt nur, solange niemand **zielt**; wer zielt,
   * dreht die Figur mit dem Ziel (`aimYaw`).
   */
  private walkNorthUp(
    dt: number,
    x: number,
    z: number,
    jump: boolean,
    sprint: boolean,
    pad: GamepadFrame,
  ): void {
    this.applyTopDownButtons(pad);
    _move.set(x, 0, z);
    if (_move.lengthSq() > 1) _move.normalize();

    const aim = this.aimYaw(pad);
    if (aim !== null) {
      // Gezielt wird hart und nicht weich: Ein Stock, der erst in einer
      // Zehntelsekunde ankommt, zielt für den Spieler daneben.
      this.yaw = aim;
    } else if (_move.lengthSq() > 0) {
      this.yaw = smoothAngle(
        _euler.setFromQuaternion(this.rig.quaternion, 'YXZ').y,
        yawFromDirection(_move.x, _move.z),
        dt,
        TURN_TAU,
      );
    }
    // Ohne Ziel und ohne Weg bleibt die Figur stehen, **wie sie steht** — die
    // zuletzt gezielte Richtung zuckt nicht zur Mitte zurück.
    if (aim !== null || _move.lengthSq() > 0) {
      this.rig.rotation.set(0, this.yaw, 0);
      this.rig.updateMatrixWorld(true);
    }

    if (_move.lengthSq() === 0) {
      if (jump) this.rig.requestJump();
      return;
    }
    const speed = this.rig.walkSpeed(sprint, this.speed * (sprint ? 1.8 : 1));
    this.rig.setIntent(_move.multiplyScalar(speed), jump, sprint);
  }

  /**
   * **Benutzen, Schießen, Zoom** — alles, was von oben kein Weg ist.
   *
   * Beides geht ans Rig und nicht an die Welt (`PlayerRig.requestUse`,
   * `setTrigger`): Was vor der Figur steht und was in ihrer rechten Hand
   * liegt, weiß die Welt, und die fragt dort nach (Paket P2). Der Zoom bleibt
   * bei der Kamera, denn sie ist das Einzige, was er ändert.
   */
  private applyTopDownButtons(pad: GamepadFrame): void {
    if (this.useQueued || this.padUse.justPressed) this.rig.requestUse();
    this.useQueued = false;

    const trigger = Math.max(
      pad.trigger,
      this.mouseFire ? 1 : 0,
      this.firePointer !== null ? 1 : 0,
    );
    this.rig.setTrigger(trigger);

    if (this.padZoomIn.justPressed) this.view?.zoomBy(-1);
    if (this.padZoomOut.justPressed) this.view?.zoomBy(1);
  }

  /**
   * **Wohin gezielt wird**, als Gierwinkel — oder `null`, wenn gerade niemand
   * zielt.
   *
   * Drei Geber, eine Rangfolge: der rechte Stock am Pad, der Zielstock auf dem
   * Glas, und die Maus. Alle drei liefern einen Weg auf dem **Schirm**, und
   * daraus wird dieselbe Rechnung wie überall eine Richtung auf dem Boden
   * (`TopDownCamera.groundDirection`) — mit der Stauchung nach Norden, sonst
   * zielte die Figur zu flach.
   */
  private aimYaw(pad: GamepadFrame): number | null {
    if (pad.aim.x !== 0 || pad.aim.y !== 0) {
      this.aimedWithStick = true;
      return this.groundYaw(pad.aim.x, pad.aim.y);
    }
    if (this.aimStick.x !== 0 || this.aimStick.y !== 0) {
      this.aimedWithStick = true;
      return this.groundYaw(this.aimStick.x, this.aimStick.y);
    }
    if (this.aimedWithStick || !this.mouse || !this.view) return null;
    const figure = this.view.project(this.rig);
    if (!figure) return null;
    const dx = this.mouse.x - figure.x;
    const dy = this.mouse.y - figure.y;
    if (Math.hypot(dx, dy) < AIM_MIN_PIXELS) return null;
    return this.groundYaw(dx, dy);
  }

  private groundYaw(screenX: number, screenY: number): number {
    const dir: Vec2 = this.view
      ? this.view.groundDirection(screenX, screenY, _ground)
      : { x: screenX, z: screenY };
    return yawFromDirection(dir.x, dir.z);
  }

  /** Das Pad dieses Bildes, samt Flanken für seine Knöpfe. */
  private readPad(): GamepadFrame {
    const pads =
      typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
        ? navigator.getGamepads()
        : null;
    const frame = readGamepad(firstGamepad(pads));
    edge(this.padUse, frame.use);
    edge(this.padZoomIn, frame.zoomIn);
    edge(this.padZoomOut, frame.zoomOut);
    return frame;
  }

  private apply(): void {
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
    this.rig.rotation.set(0, this.yaw, 0);
    this.rig.camera.rotation.set(this.pitch, 0, 0);
    this.rig.updateMatrixWorld(true);
  }

  /**
   * @param scale wie viel ein Schritt der Eingabe wert ist — die Maus rechnet
   *              in Punkten (`lookSpeed`), der Stock schon in Bogenmaß.
   */
  private look(dx: number, dy: number, scale = this.lookSpeed): void {
    if (this.topDownOn) return;
    // Von dort weiter, wo das Rig gerade hinschaut — nicht von der Zahl, die
    // sich diese Klasse gemerkt hat. Wer versetzt und dabei gedreht wurde
    // (`PortalWorld.movePlayerTo` mit `yaw`, ein Portal), sprang mit der
    // ersten Mausbewegung sonst in die alte Richtung zurück.
    this.yaw = _euler.setFromQuaternion(this.rig.quaternion, 'YXZ').y - dx * scale;
    this.pitch -= dy * scale;
    this.apply();
  }

  private on<E extends Event>(
    target: EventTarget,
    type: string,
    handler: (event: E) => void,
    options?: AddEventListenerOptions,
  ): void {
    const listener = handler as EventListener;
    target.addEventListener(type, listener, options);
    this.disposers.push(() => target.removeEventListener(type, listener, options));
  }

  private bind(): void {
    this.on(window, 'keydown', (e: KeyboardEvent) => {
      if (!this.enabled || isTyping()) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.jumpQueued = true;
      }
      // `E` und Enter benutzen — einmal je Druck. Eine gehaltene Taste
      // wiederholt sich im Browser, und ein Knopf, der dreißigmal je Sekunde
      // gedrückt wird, ist ein flackernder Knopf.
      if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat && !this.keys.has(e.code)) {
        this.useQueued = true;
      }
      this.keys.add(e.code);
    });
    this.on(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.code));
    this.on(window, 'blur', () => {
      this.keys.clear();
      this.mouseFire = false;
    });

    this.on(document, 'pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    this.on(this.canvas, 'pointerdown', (event: PointerEvent) => {
      if (!this.enabled) return;
      if (event.pointerType === 'mouse') {
        // Von oben ist die linke Maustaste der Trigger; sonst holt sie sich
        // wie bisher den Zeiger.
        if (this.topDownOn) {
          if (event.button === 0) this.mouseFire = true;
          return;
        }
        if (!this.pointerLocked) void this.canvas.requestPointerLock?.();
        return;
      }
      const pads = this.pads;
      if (this.stickPointer === null && hitsElement(pads.stick, event)) {
        this.stickPointer = event.pointerId;
        this.stickOrigin.set(event.clientX, event.clientY);
        this.canvas.setPointerCapture(event.pointerId);
      } else if (this.topDownOn && this.aimPointer === null && hitsElement(pads.aim, event)) {
        this.aimPointer = event.pointerId;
        this.aimOrigin.set(event.clientX, event.clientY);
        this.canvas.setPointerCapture(event.pointerId);
      } else if (this.topDownOn && hitsElement(pads.use, event)) {
        this.usePointer = event.pointerId;
        this.useQueued = true;
        this.setPressed(pads.use, true);
      } else if (this.topDownOn && hitsElement(pads.fire, event)) {
        this.firePointer = event.pointerId;
        this.setPressed(pads.fire, true);
      } else if (this.lookPointer === null) {
        this.lookPointer = event.pointerId;
        this.lookLast.set(event.clientX, event.clientY);
      }
    });

    this.on(this.canvas, 'pointermove', (event: PointerEvent) => {
      if (!this.enabled) return;
      if (event.pointerType === 'mouse') {
        // Wo der Zeiger steht, gilt immer — von oben zielt die Figur dorthin,
        // und eine echte Mausbewegung nimmt das Zielen vom Stock zurück.
        this.mouse = { x: event.clientX, y: event.clientY };
        this.aimedWithStick = false;
        if (this.pointerLocked) this.look(event.movementX, event.movementY);
        return;
      }
      if (event.pointerId === this.stickPointer) {
        const dx = clampStick(event.clientX - this.stickOrigin.x);
        const dy = clampStick(event.clientY - this.stickOrigin.y);
        this.stick.set(dx, dy);
        this.updateStickVisual(this.pads.stick, dx * 32, dy * 32);
      } else if (event.pointerId === this.aimPointer) {
        const dx = clampStick(event.clientX - this.aimOrigin.x);
        const dy = clampStick(event.clientY - this.aimOrigin.y);
        this.aimStick.set(dx, dy);
        this.updateStickVisual(this.pads.aim, dx * 32, dy * 32);
      } else if (event.pointerId === this.lookPointer) {
        this.look(event.clientX - this.lookLast.x, event.clientY - this.lookLast.y);
        this.lookLast.set(event.clientX, event.clientY);
      }
    });

    const end = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button === 0) this.mouseFire = false;
      if (event.pointerId === this.stickPointer) {
        this.stickPointer = null;
        this.stick.set(0, 0);
        this.updateStickVisual(this.pads.stick, 0, 0);
      }
      if (event.pointerId === this.aimPointer) {
        this.aimPointer = null;
        this.aimStick.set(0, 0);
        this.updateStickVisual(this.pads.aim, 0, 0);
      }
      if (event.pointerId === this.usePointer) {
        this.usePointer = null;
        this.setPressed(this.pads.use, false);
      }
      if (event.pointerId === this.firePointer) {
        this.firePointer = null;
        this.setPressed(this.pads.fire, false);
      }
      if (event.pointerId === this.lookPointer) this.lookPointer = null;
    };
    this.on(this.canvas, 'pointerup', end);
    this.on(this.canvas, 'pointercancel', end);
  }

  private updateStickVisual(el: HTMLElement | null, x: number, y: number): void {
    const knob = el?.firstElementChild as HTMLElement | undefined;
    if (knob) knob.style.transform = `translate(${x}px, ${y}px)`;
  }

  /** Ein gedrückter Touch-Knopf sieht auch gedrückt aus (`style.css`). */
  private setPressed(el: HTMLElement | null, down: boolean): void {
    el?.classList.toggle('is-down', down);
  }
}

const _ground: Vec2 = { x: 0, z: 0 };

/** Aus dem Weg eines Fingers eine Auslenkung von −1 bis 1 (Radius 56 Punkte). */
function clampStick(delta: number): number {
  return THREE.MathUtils.clamp(delta / 56, -1, 1);
}

/**
 * Ein gepolltes Ja/Nein zur Flanke machen — `ButtonState` zählt Ereignisse,
 * ein Pad meldet Zustände (`core/XRInput.ts`, dieselbe Klasse wie in der
 * Brille, nicht abgeschrieben).
 */
function edge(state: ButtonState, down: boolean): void {
  if (down && !state.pressed) state.press();
  else if (!down && state.pressed) state.release();
  state.beginFrame();
}

function hitsElement(el: HTMLElement | null, event: PointerEvent): boolean {
  if (!el || el.hidden) return false;
  const rect = el.getBoundingClientRect();
  // Ein ausgeblendetes Feld misst 0 × 0 an der Ecke (0, 0) — und ein Finger
  // genau dort träfe es sonst.
  if (rect.width === 0 || rect.height === 0) return false;
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}
