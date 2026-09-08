import * as THREE from 'three';
import type { PlayerRig } from '../../core/PlayerRig';
import type { Pointer } from '../../core/Pointer';
import { isTyping } from '../../core/textEntry';
import type { Handedness } from '../../core/XRInput';

interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

const FLIGHT_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight',
  'Space',
  'ControlLeft',
  'ControlRight',
  'ShiftLeft',
  'ShiftRight',
]);
const ACTION_KEYS = new Set(['KeyE', 'Digit1', 'Digit2', 'Numpad1', 'Numpad2']);

/** Metres per second. Pitch matters in free flight; diagonal input adds no speed. */
export function desktopFlightVelocity(
  keys: ReadonlySet<string>,
  look: Readonly<Vector3Like>,
  out: Vector3Like = { x: 0, y: 0, z: 0 },
): Vector3Like {
  const forward =
    Number(keys.has('KeyW') || keys.has('ArrowUp')) -
    Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const strafe =
    Number(keys.has('KeyD') || keys.has('ArrowRight')) -
    Number(keys.has('KeyA') || keys.has('ArrowLeft'));
  const rise =
    Number(keys.has('Space')) - Number(keys.has('ControlLeft') || keys.has('ControlRight'));
  const length = Math.hypot(look.x, look.y, look.z);
  const valid = Number.isFinite(length) && length > 1e-6;
  const x = valid ? look.x / length : 0;
  const y = valid ? look.y / length : 0;
  const z = valid ? look.z / length : -1;
  const horizontal = Math.hypot(x, z);
  const rightX = horizontal > 1e-6 ? -z / horizontal : 1;
  const rightZ = horizontal > 1e-6 ? x / horizontal : 0;
  out.x = x * forward + rightX * strafe;
  out.y = y * forward + rise;
  out.z = z * forward + rightZ * strafe;
  const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 7.2 : 4;
  const scale = speed / Math.max(1, Math.hypot(out.x, out.y, out.z));
  out.x *= scale;
  out.y *= scale;
  out.z *= scale;
  return out;
}

export interface HauntingDesktopControlHost {
  rig: PlayerRig;
  pointer: Pointer;
  /** False for phone stations, open menus, or another spectator view. */
  enabled(): boolean;
  presenting(): boolean;
  simulation(): boolean;
  /** A hidden or incapacitated technician cannot fly or change stance. */
  canMove?(): boolean;
  cycleHand(hand: Handedness): void;
  /** Handles an equipped item or leaving cover before the aimed interaction. */
  interact?(): boolean;
}

/**
 * Haunting-only additions to FlatControls. Walking and mouse look remain in
 * the normal controller. Simulation deliberately moves the frozen camera
 * directly, so the physics controller cannot cancel WASD or apply gravity.
 */
export class HauntingDesktopControls {
  private readonly keys = new Set<string>();
  private readonly look = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private ownsStance = false;

  constructor(private readonly host: HauntingDesktopControlHost) {
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.clear);
    document.addEventListener('visibilitychange', this.visibilityChanged);
  }

  update(dt: number): void {
    if (!this.active()) {
      this.clear();
      return;
    }
    const step = Math.max(0, Math.min(0.05, Number.isFinite(dt) ? dt : 0));
    const moving = this.host.canMove?.() ?? true;
    const flight = this.host.simulation();
    this.host.rig.updateDesktopCrouch(
      moving && !flight && (this.keys.has('ControlLeft') || this.keys.has('ControlRight')),
      step,
    );
    this.ownsStance = true;
    if (!moving || !flight) return;
    this.host.rig.getHeadLook(this.look);
    desktopFlightVelocity(this.keys, this.look, this.velocity);
    this.host.rig.position.addScaledVector(this.velocity, step);
    this.host.rig.updateMatrixWorld(true);
  }

  dispose(): void {
    this.clear();
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.clear);
    document.removeEventListener('visibilitychange', this.visibilityChanged);
  }

  private active(): boolean {
    return this.host.enabled() && !this.host.presenting() && !isTyping() && !editingElement();
  }

  private keyDown = (event: KeyboardEvent): void => {
    if (!this.active() || event.altKey || event.metaKey) return;
    if (!FLIGHT_KEYS.has(event.code) && !ACTION_KEYS.has(event.code)) return;
    // A held Ctrl is crouching (or descent); Ctrl+E still operates the aimed
    // object, rather than opening the browser's search field.
    if (
      ACTION_KEYS.has(event.code) ||
      event.code.startsWith('Control') ||
      event.ctrlKey ||
      this.host.simulation()
    ) {
      event.preventDefault();
    }
    const first = !this.keys.has(event.code) && !event.repeat;
    this.keys.add(event.code);
    if (!first) return;
    if (event.code === 'KeyE' && !this.host.interact?.()) {
      this.host.pointer.setKeyboardTrigger(true);
    }
    if (event.code === 'Digit1' || event.code === 'Numpad1') this.host.cycleHand('left');
    if (event.code === 'Digit2' || event.code === 'Numpad2') this.host.cycleHand('right');
  };

  private keyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
    if (event.code === 'KeyE') this.host.pointer.setKeyboardTrigger(false);
  };

  private clear = (): void => {
    this.keys.clear();
    this.host.pointer.setKeyboardTrigger(false, true);
    if (this.ownsStance) {
      this.host.rig.updateDesktopCrouch(false, 1);
      this.ownsStance = false;
    }
  };

  private visibilityChanged = (): void => {
    if (document.hidden) this.clear();
  };
}

function editingElement(): boolean {
  const focused = document.activeElement as HTMLElement | null;
  return (
    !!focused &&
    (focused.isContentEditable ||
      focused.tagName === 'INPUT' ||
      focused.tagName === 'TEXTAREA' ||
      focused.tagName === 'SELECT')
  );
}
