import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playEmpty, playReload, playShot } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';

/** Rounds in a full magazine. */
const MAGAZINE = 12;
/** Seconds a reload takes. */
const RELOAD_TIME = 1.15;
const MUZZLE_SPEED = 26;

const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _kick = new THREE.Quaternion();
const _axisX = new THREE.Vector3(1, 0, 0);

/**
 * A plain pistol. The trigger fires, and once the magazine runs dry it reloads
 * itself — there is no ammo to pick up anywhere, so the counter on the side of
 * the magazine reads "rounds left / ∞".
 */
export class PistolTool extends Tool {
  override readonly toolId = 'pistol';
  override readonly label = 'Pistole';

  private readonly muzzle = new THREE.Object3D();
  private readonly slide: THREE.Mesh;
  private readonly counter: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private rounds = MAGAZINE;
  private reloading = 0;
  private recoil = 0;

  constructor() {
    super();
    this.name = 'tool-pistol';
    this.icon = 'pistol';
    this.accent = 0xd7dce8;
    this.hint = 'Trigger schießt · lädt selbst nach';

    const steel = new THREE.MeshStandardMaterial({
      color: 0x9aa6bd,
      roughness: 0.35,
      metalness: 0.65,
    });
    const grip = new THREE.MeshStandardMaterial({ color: 0x22293a, roughness: 0.75 });

    this.slide = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.038, 0.17), steel);
    this.slide.position.set(0, 0.012, -0.06);
    this.add(this.slide);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 10), steel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.012, -0.155);
    this.add(barrel);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.045), grip);
    handle.position.set(0, -0.055, 0.01);
    handle.rotation.x = -0.22;
    this.add(handle);

    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.075, 0.032), steel);
    magazine.position.set(0, -0.052, 0.008);
    magazine.rotation.x = -0.22;
    this.add(magazine);

    // The round counter sits flat against the magazine, where a glance down
    // the sights catches it.
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 128;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.counter = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, 0.03),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false }),
    );
    this.counter.position.set(0.014, -0.05, 0.012);
    this.counter.rotation.set(-0.22, Math.PI / 2, 0);
    this.add(this.counter);

    const mirrored = this.counter.clone();
    mirrored.position.x = -0.014;
    mirrored.rotation.y = -Math.PI / 2;
    this.add(mirrored);

    this.muzzle.position.set(0, 0.012, -0.19);
    this.add(this.muzzle);

    this.draw();
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    if (this.reloading > 0) return;
    if (this.rounds <= 0) {
      playEmpty();
      this.startReload();
      return;
    }

    this.rounds--;
    this.recoil = 1;
    this.muzzle.getWorldPosition(_origin);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    host.spawnBullet(_origin, _direction, MUZZLE_SPEED);
    playShot();
    controller.pulse(0.6, 40);
    this.draw();

    if (this.rounds === 0) this.startReload();
  }

  override update(dt: number, _host: ToolHost, _controller: ControllerState | null): void {
    if (this.reloading > 0) {
      this.reloading = Math.max(0, this.reloading - dt);
      if (this.reloading === 0) {
        this.rounds = MAGAZINE;
        this.draw();
      }
    }
    // The slide kicks back and settles again.
    this.recoil = Math.max(0, this.recoil - dt * 7);
    this.slide.position.z = -0.06 + this.recoil * 0.016;
    // The muzzle flip rides on top of the aim the base class just set, so the
    // kick must be multiplied in — assigning a rotation would throw the aim away.
    if (this.heldBy && this.recoil > 0) {
      this.quaternion.multiply(_kick.setFromAxisAngle(_axisX, this.recoil * 0.18));
    }
  }

  override disposeTool(): void {
    disposeToolTree(this);
    this.texture.dispose();
  }

  private startReload(): void {
    this.reloading = RELOAD_TIME;
    playReload();
    this.draw();
  }

  private draw(): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 128);
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 120, 22);
    ctx.fillStyle = 'rgba(8, 12, 22, 0.9)';
    ctx.fill();
    ctx.strokeStyle = this.reloading > 0 ? '#ffb35c' : '#5ee0a0';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    if (this.reloading > 0) {
      ctx.font = '700 46px system-ui, sans-serif';
      ctx.fillText('LADEN', 128, 66);
    } else {
      ctx.font = '700 62px system-ui, sans-serif';
      // Rounds left over an endless supply of magazines.
      ctx.fillText(`${this.rounds}/∞`, 128, 68);
    }
    this.texture.needsUpdate = true;
  }
}
