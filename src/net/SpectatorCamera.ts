import * as THREE from 'three';
import { SmoothPose, smoothAngle } from './PoseSmoothing';
import type { PeerPose } from './types';
import type { PlayerRig } from '../core/PlayerRig';
import type { Pointer } from '../core/Pointer';

/**
 * `free` leaves the normal desktop controls alone; the other two hand the
 * camera over to the player being watched.
 */
export type SpectatorMode = 'free' | 'first' | 'third';

export interface SpectatorSettings {
  mode: SpectatorMode;
  /** Peer id being watched, or null for "the first VR player that shows up". */
  targetId: string | null;
  /** 0 = follows the head 1:1, 1 = very lazy. */
  smoothing: number;
  /** Drop the head's roll (and pitch in third person) so the horizon stays put. */
  levelHorizon: boolean;
  /** Third person: metres behind the player. */
  distance: number;
}

/** Smoothing slider ends, in seconds. Position follows a bit tighter than yaw. */
const POSITION_TAU = [0.02, 0.45];
const ROTATION_TAU = [0.02, 0.9];
const DRAG_SPEED = 0.005;
const PITCH_LIMIT = Math.PI / 2 - 0.08;

const UP = new THREE.Vector3(0, 1, 0);
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _drag = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _levelEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _forward = new THREE.Vector3();

/** Keeps yaw and pitch, throws the head tilt away. */
function levelRoll(quaternion: THREE.Quaternion): void {
  _levelEuler.setFromQuaternion(quaternion, 'YXZ');
  _levelEuler.z = 0;
  quaternion.setFromEuler(_levelEuler);
}

/**
 * Drives the local camera from another player's head pose — the "watch the VR
 * player from the PC" view.
 *
 * First person copies the head pose; third person orbits a point above the head
 * with a yaw that lags behind, which is what keeps the picture from shaking
 * with every glance. Dragging the mouse adds an offset on top in both modes.
 */
export class SpectatorCamera {
  readonly settings: SpectatorSettings = {
    mode: 'free',
    targetId: null,
    smoothing: 0.55,
    levelHorizon: true,
    distance: 2.6,
  };

  /** Fired when the camera changed its own settings, e.g. zooming by wheel. */
  onChange: (() => void) | null = null;

  private readonly head = new SmoothPose();
  /** Yaw the third-person camera is lagging towards, in world space. */
  private followYaw = 0;
  private followYawPrimed = false;
  private dragYaw = 0;
  private dragPitch = 0.12;
  private dragPointer: number | null = null;
  private dragLast = new THREE.Vector2();
  private disposers: Array<() => void> = [];

  constructor(
    private readonly rig: PlayerRig,
    private readonly canvas: HTMLCanvasElement,
    private readonly pointer: Pointer,
  ) {
    this.bind();
  }

  get following(): boolean {
    return this.settings.mode !== 'free';
  }

  /** Peer the camera follows, or null for "the first VR player that shows up". */
  setTarget(id: string | null): void {
    if (this.settings.targetId === id) return;
    this.settings.targetId = id;
    this.head.reset();
    this.followYawPrimed = false;
    this.onChange?.();
  }

  setMode(mode: SpectatorMode): void {
    if (mode === this.settings.mode) return;
    this.settings.mode = mode;
    this.head.reset();
    this.followYawPrimed = false;
    this.recenter();
    // A locked cursor would keep feeding the desktop controls instead of us.
    if (mode !== 'free' && document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }

  /** Puts the extra mouse rotation back to zero. */
  recenter(): void {
    this.dragYaw = 0;
    this.dragPitch = this.settings.mode === 'third' ? 0.12 : 0;
  }

  /**
   * @param pose       the watched player's latest pose, or null if there is none
   * @param presenting the local player wears a headset
   * @returns true when the camera was taken over this frame
   */
  update(dt: number, pose: PeerPose | null, presenting = false): boolean {
    if (!this.following) return false;
    if (pose) this.head.setTarget(pose.head);
    if (!this.head.primed) return false;

    const t = THREE.MathUtils.clamp(this.settings.smoothing, 0, 1);
    // Squared so the interesting part of the slider is not all bunched up.
    const shape = t * t;
    const positionTau = THREE.MathUtils.lerp(POSITION_TAU[0]!, POSITION_TAU[1]!, shape);
    const rotationTau = THREE.MathUtils.lerp(ROTATION_TAU[0]!, ROTATION_TAU[1]!, shape);

    if (this.settings.mode === 'first') {
      this.head.update(dt, positionTau * 0.35, rotationTau * 0.5);
      if (presenting) this.applyPosition(this.head.position);
      else this.applyFirstPerson();
    } else {
      this.head.update(dt, positionTau, rotationTau);
      this.applyThirdPerson(dt, rotationTau, presenting);
    }
    return true;
  }

  dispose(): void {
    for (const off of this.disposers) off();
    this.disposers = [];
  }

  // --- modes ----------------------------------------------------------------

  private applyFirstPerson(): void {
    _quaternion.copy(this.head.quaternion);
    if (this.settings.levelHorizon) levelRoll(_quaternion);
    // The drag rotates inside the head's frame, so looking around still moves
    // with the VR player instead of drifting away from them.
    _euler.set(this.dragPitch, this.dragYaw, 0);
    _quaternion.multiply(_drag.setFromEuler(_euler));
    this.rig.setHeadWorldPose(this.head.position, _quaternion);
  }

  /**
   * In VR only the position may be borrowed: the headset owns the view
   * direction, and taking that away is what makes spectating sickening. The
   * player is simply carried along and keeps looking around freely.
   */
  private applyPosition(position: THREE.Vector3): void {
    this.rig.setHeadWorldPosition(position);
  }

  private applyThirdPerson(dt: number, rotationTau: number, presenting = false): void {
    _forward.set(0, 0, -1).applyQuaternion(this.head.quaternion);
    const targetYaw = Math.atan2(-_forward.x, -_forward.z);
    if (!this.followYawPrimed) {
      this.followYaw = targetYaw;
      this.followYawPrimed = true;
    } else {
      this.followYaw = smoothAngle(this.followYaw, targetYaw, dt, rotationTau);
    }

    const yaw = this.followYaw + this.dragYaw;
    const pitch = THREE.MathUtils.clamp(this.dragPitch, -PITCH_LIMIT, PITCH_LIMIT);
    _euler.set(pitch, yaw, 0);
    _quaternion.setFromEuler(_euler);

    // Look at a point slightly above the head, then back off along the view.
    _position.copy(this.head.position).addScaledVector(UP, 0.15);
    _forward.set(0, 0, -1).applyQuaternion(_quaternion);
    _position.addScaledVector(_forward, -this.settings.distance);
    if (presenting) this.applyPosition(_position);
    else this.rig.setHeadWorldPose(_position, _quaternion);
  }

  // --- input ----------------------------------------------------------------

  private bind(): void {
    this.on(this.canvas, 'pointerdown', (event: PointerEvent) => {
      // Let the wrist menu keep its clicks.
      if (!this.following || this.dragPointer !== null || this.pointer.hovering) return;
      this.dragPointer = event.pointerId;
      this.dragLast.set(event.clientX, event.clientY);
      this.canvas.setPointerCapture(event.pointerId);
    });

    this.on(this.canvas, 'pointermove', (event: PointerEvent) => {
      if (event.pointerId !== this.dragPointer) return;
      this.dragYaw -= (event.clientX - this.dragLast.x) * DRAG_SPEED;
      this.dragPitch = THREE.MathUtils.clamp(
        this.dragPitch - (event.clientY - this.dragLast.y) * DRAG_SPEED,
        -PITCH_LIMIT,
        PITCH_LIMIT,
      );
      this.dragLast.set(event.clientX, event.clientY);
    });

    const end = (event: PointerEvent) => {
      if (event.pointerId !== this.dragPointer) return;
      this.dragPointer = null;
      this.canvas.releasePointerCapture?.(event.pointerId);
    };
    this.on(this.canvas, 'pointerup', end);
    this.on(this.canvas, 'pointercancel', end);

    this.on(
      this.canvas,
      'wheel',
      (event: WheelEvent) => {
        if (this.settings.mode !== 'third') return;
        event.preventDefault();
        this.settings.distance = THREE.MathUtils.clamp(
          this.settings.distance * Math.exp(event.deltaY * 0.001),
          0.6,
          14,
        );
        this.onChange?.();
      },
      { passive: false },
    );
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
}
