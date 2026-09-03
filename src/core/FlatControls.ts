import * as THREE from 'three';
import type { PlayerRig } from './PlayerRig';

const _forward = new THREE.Vector3();
const _strafe = new THREE.Vector3();
const _move = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Keyboard/mouse and touch fallback so the worlds can also be visited without a
 * headset — the basis for asymmetric sessions where phones join a VR player.
 */
export class FlatControls {
  enabled = true;
  speed = 3.2;
  lookSpeed = 0.0024;

  private readonly keys = new Set<string>();
  private jumpQueued = false;
  private yaw = 0;
  private pitch = 0;
  private pointerLocked = false;
  private lookPointer: number | null = null;
  private lookLast = new THREE.Vector2();
  private stickPointer: number | null = null;
  private stickOrigin = new THREE.Vector2();
  private stick = new THREE.Vector2();
  private disposers: Array<() => void> = [];

  constructor(
    private readonly rig: PlayerRig,
    private readonly canvas: HTMLCanvasElement,
    private readonly stickEl: HTMLElement | null,
  ) {
    this.bind();
  }

  /** Called when the player is placed, so look direction matches the spawn. */
  syncFromRig(): void {
    this.yaw = new THREE.Euler().setFromQuaternion(this.rig.quaternion, 'YXZ').y;
    this.pitch = 0;
    this.apply();
  }

  /** Turns keys and the touch stick into a movement wish for the rig. */
  update(): void {
    if (!this.enabled) return;

    let x = this.stick.x;
    let z = this.stick.y;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;

    const jump = this.jumpQueued;
    this.jumpQueued = false;

    if (x === 0 && z === 0) {
      if (jump) this.rig.requestJump();
      return;
    }

    this.rig.getHeadForward(_forward);
    _strafe.copy(_forward).cross(UP).normalize();
    _move.set(0, 0, 0).addScaledVector(_forward, -z).addScaledVector(_strafe, x);
    if (_move.lengthSq() > 1) _move.normalize();
    const boost = this.keys.has('ShiftLeft') ? 1.8 : 1;
    this.rig.setIntent(_move.multiplyScalar(this.speed * boost), jump);
  }

  dispose(): void {
    for (const off of this.disposers) off();
    this.disposers = [];
  }

  private apply(): void {
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
    this.rig.rotation.set(0, this.yaw, 0);
    this.rig.camera.rotation.set(this.pitch, 0, 0);
    this.rig.updateMatrixWorld(true);
  }

  private look(dx: number, dy: number): void {
    this.yaw -= dx * this.lookSpeed;
    this.pitch -= dy * this.lookSpeed;
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
      if (!this.enabled) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.jumpQueued = true;
      }
      this.keys.add(e.code);
    });
    this.on(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.code));
    this.on(window, 'blur', () => this.keys.clear());

    this.on(document, 'pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    this.on(this.canvas, 'pointerdown', (event: PointerEvent) => {
      if (!this.enabled) return;
      if (event.pointerType === 'mouse') {
        if (!this.pointerLocked) void this.canvas.requestPointerLock?.();
        return;
      }
      const inStick = this.stickEl ? hitsElement(this.stickEl, event) : false;
      if (inStick && this.stickPointer === null) {
        this.stickPointer = event.pointerId;
        this.stickOrigin.set(event.clientX, event.clientY);
        this.canvas.setPointerCapture(event.pointerId);
      } else if (this.lookPointer === null) {
        this.lookPointer = event.pointerId;
        this.lookLast.set(event.clientX, event.clientY);
      }
    });

    this.on(this.canvas, 'pointermove', (event: PointerEvent) => {
      if (!this.enabled) return;
      if (event.pointerType === 'mouse') {
        if (this.pointerLocked) this.look(event.movementX, event.movementY);
        return;
      }
      if (event.pointerId === this.stickPointer) {
        const radius = 56;
        const dx = THREE.MathUtils.clamp((event.clientX - this.stickOrigin.x) / radius, -1, 1);
        const dy = THREE.MathUtils.clamp((event.clientY - this.stickOrigin.y) / radius, -1, 1);
        this.stick.set(dx, dy);
        this.updateStickVisual(dx * 32, dy * 32);
      } else if (event.pointerId === this.lookPointer) {
        this.look(event.clientX - this.lookLast.x, event.clientY - this.lookLast.y);
        this.lookLast.set(event.clientX, event.clientY);
      }
    });

    const end = (event: PointerEvent) => {
      if (event.pointerId === this.stickPointer) {
        this.stickPointer = null;
        this.stick.set(0, 0);
        this.updateStickVisual(0, 0);
      }
      if (event.pointerId === this.lookPointer) this.lookPointer = null;
    };
    this.on(this.canvas, 'pointerup', end);
    this.on(this.canvas, 'pointercancel', end);
  }

  private updateStickVisual(x: number, y: number): void {
    const knob = this.stickEl?.firstElementChild as HTMLElement | undefined;
    if (knob) knob.style.transform = `translate(${x}px, ${y}px)`;
  }
}

function hitsElement(el: HTMLElement, event: PointerEvent): boolean {
  const rect = el.getBoundingClientRect();
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}
