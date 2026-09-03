import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playPick, playTone } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';

/** How far the hook flies. */
const RANGE = 30;
/** Metres per second the rope reels the player in with. */
const REEL_SPEED = 11;
/** The pull stops this close to the anchor, so you land instead of ramming it. */
const ARRIVE = 1.3;
/** Rope segments — enough for a bit of sag while the hook is only hanging. */
const ROPE_POINTS = 12;

const _tip = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _head = new THREE.Vector3();
const _pull = new THREE.Vector3();
const _point = new THREE.Vector3();

/**
 * Grappling hook.
 *
 * The trigger fires the hook along the aim. It bites into the first wall,
 * floor or ceiling it meets and reels you in for as long as the trigger is
 * held; letting go drops the rope. A prop in the way is pulled to you instead
 * of you to it — the hook does not care which end is heavier, but the physics
 * does.
 */
export class GrappleTool extends Tool {
  override readonly toolId = 'grapple';
  override readonly label = 'Greifhaken';

  private readonly rope: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly hook = new THREE.Group();
  private readonly muzzle = new THREE.Object3D();
  private readonly anchor = new THREE.Vector3();
  private attached = false;
  private reeling = false;

  constructor() {
    super();
    this.name = 'tool-grapple';
    this.icon = 'grapple';
    this.accent = 0x8fd6ff;
    this.hint = 'Trigger schießt den Haken · halten zieht dich hin';

    const steel = new THREE.MeshStandardMaterial({
      color: 0x8b97ad,
      roughness: 0.35,
      metalness: 0.7,
    });
    const grip = new THREE.MeshStandardMaterial({ color: 0x243044, roughness: 0.7 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.13), steel);
    body.position.set(0, 0.01, -0.05);
    this.add(body);

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.055, 16), grip);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, 0.03, -0.01);
    this.add(drum);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.09, 12), steel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.14);
    this.add(barrel);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.04), grip);
    handle.position.set(0, -0.05, 0.005);
    handle.rotation.x = -0.2;
    this.add(handle);

    this.muzzle.position.set(0, 0.01, -0.19);
    this.add(this.muzzle);

    // The hook itself: three prongs that sit on the anchor point once it bites.
    this.hook.name = 'grapple-hook';
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const prong = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.07, 8), steel);
      prong.position.set(Math.cos(angle) * 0.03, 0.02, Math.sin(angle) * 0.03);
      prong.rotation.z = Math.cos(angle) * 0.5;
      prong.rotation.x = -Math.sin(angle) * 0.5;
      this.hook.add(prong);
    }
    this.hook.visible = false;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(ROPE_POINTS * 3), 3),
    );
    this.rope = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.9 }),
    );
    this.rope.name = 'grapple-rope';
    this.rope.frustumCulled = false;
    this.rope.visible = false;
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.rope.parent !== host.root) host.root.add(this.rope, this.hook);
  }

  override onStow(_host: ToolHost): void {
    this.detach();
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    this.muzzle.getWorldPosition(_tip);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();

    // A prop in the line of fire comes to you; that is what a hook on a rope
    // does to anything lighter than a player.
    const prop = host.aimAt(_tip, _direction, RANGE);
    const surface = host.castSurface(_tip, _direction);
    const propDistance = prop
      ? _point.copy(prop.object.position).distanceTo(_tip)
      : Number.POSITIVE_INFINITY;
    const surfaceDistance = surface ? surface.point.distanceTo(_tip) : Number.POSITIVE_INFINITY;

    if (prop && propDistance <= surfaceDistance) {
      host.pullProp(prop, this.heldBy ?? 'right');
      controller.pulse(0.6, 40);
      playPick(true);
      return;
    }

    if (!surface) {
      host.notify('Kein Halt gefunden');
      playTone({ type: 'square', from: 200, to: 120, duration: 0.08, gain: 0.05 });
      return;
    }

    this.anchor.copy(surface.point);
    this.attached = true;
    this.reeling = true;
    this.hook.position.copy(this.anchor);
    this.hook.visible = true;
    controller.pulse(0.8, 60);
    playTone({ type: 'square', from: 320, to: 780, duration: 0.12, gain: 0.06 });
  }

  override onTriggerUp(_controller: ControllerState, _host: ToolHost): void {
    this.detach();
  }

  override update(_dt: number, host: ToolHost, controller: ControllerState | null): void {
    if (!this.heldBy || !controller) {
      this.detach();
      return;
    }

    if (this.attached && this.reeling) {
      host.ctx.rig.getHeadPosition(_head);
      _pull.copy(this.anchor).sub(_head);
      const distance = _pull.length();
      if (distance <= ARRIVE) {
        // Arrived: stop pulling but keep hanging on, so a swing is possible.
        this.reeling = false;
        host.launchPlayer(_pull.set(0, 0, 0));
      } else {
        host.launchPlayer(_pull.multiplyScalar(REEL_SPEED / distance));
      }
    }

    this.drawRope();
  }

  override disposeTool(): void {
    disposeToolTree(this);
    disposeToolTree(this.hook);
    this.hook.removeFromParent();
    this.rope.geometry.dispose();
    this.rope.material.dispose();
    this.rope.removeFromParent();
  }

  private detach(): void {
    this.attached = false;
    this.reeling = false;
    this.hook.visible = false;
    this.rope.visible = false;
  }

  /** Straight while it pulls, with a bit of sag once it only hangs. */
  private drawRope(): void {
    if (!this.attached) {
      this.rope.visible = false;
      return;
    }
    this.muzzle.getWorldPosition(_tip);
    const sag = this.reeling ? 0 : _tip.distanceTo(this.anchor) * 0.06;
    const positions = this.rope.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < ROPE_POINTS; i++) {
      const f = i / (ROPE_POINTS - 1);
      _point.lerpVectors(_tip, this.anchor, f);
      _point.y -= Math.sin(f * Math.PI) * sag;
      positions.setXYZ(i, _point.x, _point.y, _point.z);
    }
    positions.needsUpdate = true;
    this.rope.material.color.setHex(this.reeling ? 0xffd27a : 0xdfe8ff);
    this.rope.visible = true;
  }
}
