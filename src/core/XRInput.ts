import * as THREE from 'three';

export type Handedness = 'left' | 'right';

/** Edge-detected button. Events can arrive between frames, so we count them. */
export class ButtonState {
  pressed = false;
  value = 0;
  justPressed = false;
  justReleased = false;
  private downs = 0;
  private ups = 0;

  press(): void {
    this.pressed = true;
    this.downs++;
  }

  release(): void {
    this.pressed = false;
    this.ups++;
  }

  beginFrame(): void {
    this.justPressed = this.downs > 0;
    this.justReleased = this.ups > 0;
    this.downs = 0;
    this.ups = 0;
  }

  reset(): void {
    this.pressed = false;
    this.value = 0;
    this.justPressed = false;
    this.justReleased = false;
    this.downs = 0;
    this.ups = 0;
  }
}

export class ControllerState {
  handedness: Handedness | null = null;
  connected = false;
  /** True while this input source is a tracked hand instead of a controller. */
  isHand = false;
  inputSource: XRInputSource | null = null;

  readonly trigger = new ButtonState();
  readonly squeeze = new ButtonState();
  /** Pinch (hand tracking) or the trigger of a controller — the generic "select". */
  readonly select = new ButtonState();
  readonly primary = new ButtonState(); // A / X
  readonly secondary = new ButtonState(); // B / Y
  readonly thumbstick = new THREE.Vector2();
  /** Index fingertip object, provided by the hand visuals. */
  fingertip: THREE.Object3D | null = null;

  constructor(
    readonly index: number,
    readonly targetRay: THREE.Group,
    readonly grip: THREE.Group,
    readonly hand: THREE.XRHandSpace,
  ) {}

  /** True when the pose of this input source is currently tracked. */
  get tracked(): boolean {
    return this.connected && (this.isHand ? this.hand.visible : this.targetRay.visible);
  }

  /** Origin + direction of the pointing ray, in world space. */
  getRay(target: THREE.Ray): THREE.Ray {
    this.targetRay.getWorldPosition(target.origin);
    target.direction.set(0, 0, -1).applyQuaternion(this.targetRay.getWorldQuaternion(_quat)).normalize();
    return target;
  }

  /** World position of the index fingertip, when the hand is tracked. */
  getFingertip(target: THREE.Vector3): THREE.Vector3 | null {
    if (this.fingertip) return this.fingertip.getWorldPosition(target);
    if (!this.targetRay.visible) return null;
    // Fallback before the hand visuals had a chance to run.
    this.targetRay.getWorldPosition(target);
    return target.add(
      _vec.set(0, 0, -0.06).applyQuaternion(this.targetRay.getWorldQuaternion(_quat)),
    );
  }

  /** Short haptic pulse, ignored when the runtime has no actuator. */
  pulse(intensity = 0.4, durationMs = 30): void {
    const actuators = (this.inputSource?.gamepad as { hapticActuators?: Array<{ pulse?: (i: number, d: number) => void }> } | undefined)
      ?.hapticActuators;
    actuators?.[0]?.pulse?.(intensity, durationMs);
  }

  reset(): void {
    this.connected = false;
    this.isHand = false;
    this.inputSource = null;
    this.trigger.reset();
    this.squeeze.reset();
    this.select.reset();
    this.primary.reset();
    this.secondary.reset();
    this.thumbstick.set(0, 0);
    this.fingertip = null;
  }
}

const _quat = new THREE.Quaternion();
const _vec = new THREE.Vector3();

/**
 * Wraps the two WebXR input slots. Controllers and tracked hands are handled
 * through the same interface: `trigger` maps to the analog trigger or a pinch,
 * `squeeze` to the grip button.
 */
export class XRInput {
  readonly controllers: ControllerState[] = [];

  constructor(renderer: THREE.WebGLRenderer, parent: THREE.Object3D) {
    for (let i = 0; i < 2; i++) {
      const targetRay = renderer.xr.getController(i);
      const grip = renderer.xr.getControllerGrip(i);
      const hand = renderer.xr.getHand(i);
      parent.add(targetRay, grip, hand);

      const state = new ControllerState(i, targetRay, grip, hand);
      this.controllers.push(state);

      targetRay.addEventListener('connected', (event) => {
        const source = (event as unknown as { data: XRInputSource }).data;
        state.inputSource = source;
        state.connected = true;
        state.isHand = Boolean(source.hand);
        state.handedness = source.handedness === 'left' ? 'left' : 'right';
      });

      targetRay.addEventListener('disconnected', () => state.reset());

      targetRay.addEventListener('selectstart', () => {
        state.select.press();
        if (!state.isHand) state.trigger.press();
      });
      targetRay.addEventListener('selectend', () => {
        state.select.release();
        if (!state.isHand) state.trigger.release();
      });
      targetRay.addEventListener('squeezestart', () => state.squeeze.press());
      targetRay.addEventListener('squeezeend', () => state.squeeze.release());

      // Hand tracking: pinch is the trigger, and three.js derives it for us.
      hand.addEventListener('pinchstart', () => state.trigger.press());
      hand.addEventListener('pinchend', () => state.trigger.release());
    }
  }

  get(handedness: Handedness): ControllerState | null {
    return this.controllers.find((c) => c.connected && c.handedness === handedness) ?? null;
  }

  /** Call once per frame, before world updates. */
  update(): void {
    for (const state of this.controllers) {
      state.trigger.beginFrame();
      state.squeeze.beginFrame();
      state.select.beginFrame();
      state.primary.beginFrame();
      state.secondary.beginFrame();

      const gamepad = state.inputSource?.gamepad;
      if (!gamepad) {
        state.thumbstick.set(0, 0);
        continue;
      }

      // xr-standard mapping: 0 trigger, 1 squeeze, 3 thumbstick, 4/5 A/B.
      state.trigger.value = gamepad.buttons[0]?.value ?? 0;
      state.squeeze.value = gamepad.buttons[1]?.value ?? 0;
      syncFromGamepad(state.primary, gamepad.buttons[4]);
      syncFromGamepad(state.secondary, gamepad.buttons[5]);

      const axes = gamepad.axes;
      const x = axes.length >= 4 ? axes[2] : (axes[0] ?? 0);
      const y = axes.length >= 4 ? axes[3] : (axes[1] ?? 0);
      state.thumbstick.set(deadzone(x ?? 0), deadzone(y ?? 0));
    }
  }
}

/** Polled buttons have no events, so the edges are derived here. */
function syncFromGamepad(button: ButtonState, source: GamepadButton | undefined): void {
  const pressed = source?.pressed ?? false;
  button.justPressed = pressed && !button.pressed;
  button.justReleased = !pressed && button.pressed;
  button.pressed = pressed;
  button.value = source?.value ?? (pressed ? 1 : 0);
}

function deadzone(value: number, threshold = 0.15): number {
  if (Math.abs(value) < threshold) return 0;
  return (value - Math.sign(value) * threshold) / (1 - threshold);
}
