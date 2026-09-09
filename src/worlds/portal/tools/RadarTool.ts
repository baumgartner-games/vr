import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { scannerFrame, SCANNER_HEIGHT, SCANNER_WIDTH } from './scannerModel';
import type { ControllerState } from '../../../core/XRInput';

const _eye = new THREE.Vector3();
const _direction = new THREE.Vector3();

/** A held motion display, housed and holstered just like the x-ray scanner. */
export class RadarTool extends Tool {
  override readonly toolId = 'radar';
  override readonly label = 'Bewegungsradar';
  readonly frame = scannerFrame(0x8dffcc);
  private readonly canvas = document.createElement('canvas');
  private readonly texture: THREE.CanvasTexture;
  private readonly display: THREE.Mesh;
  private enabled = true;
  private timer = 0;
  private sweep = 0;
  private contact: { x: number; z: number } | null = null;

  constructor() {
    super();
    this.name = 'tool-radar';
    this.icon = 'xray';
    this.accent = 0x8dffcc;
    this.hint = 'Bewegung im Umkreis · Trigger schaltet · am Gürtel ablegen';
    this.canvas.width = 512;
    this.canvas.height = 384;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.display = new THREE.Mesh(
      new THREE.PlaneGeometry(SCANNER_WIDTH, SCANNER_HEIGHT),
      new THREE.MeshBasicMaterial({ map: this.texture, side: THREE.DoubleSide, toneMapped: false }),
    );
    this.frame.add(this.display);
    this.add(this.frame);
    this.mountGrip({ length: 0.09 });
    this.draw(0, 0, 0);
  }

  get scanning(): boolean {
    return this.enabled;
  }

  setContact(contact: { x: number; z: number } | null): void {
    this.contact = contact;
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    this.enabled = !this.enabled;
    this.timer = 0;
    controller.pulse(0.3, 25);
    host.notify(this.enabled ? 'Bewegungsradar an' : 'Bewegungsradar aus');
  }

  updateDisplay(dt: number, observer: THREE.Vector3, forward: THREE.Vector3): void {
    this.timer -= dt;
    this.sweep += dt * 1.8;
    if (this.timer > 0) return;
    this.timer = 0.1;
    this.draw(observer.x, observer.z, Math.atan2(-forward.x, -forward.z));
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    if (!controller || !this.heldBy) return;
    host.ctx.rig.getHeadPosition(_eye);
    host.ctx.camera.getWorldDirection(_direction);
    this.updateDisplay(dt, _eye, _direction);
  }

  private draw(x: number, z: number, yaw: number): void {
    const c = this.canvas.getContext('2d');
    if (!c) return;
    c.fillStyle = '#06131b';
    c.fillRect(0, 0, 512, 384);
    c.fillStyle = '#a9f5de';
    c.font = 'bold 23px system-ui';
    c.textAlign = 'center';
    c.fillText(this.enabled ? 'BEWEGUNG / 18 M' : 'RADAR AUS', 256, 32);
    if (this.enabled) {
      const cx = 256,
        cy = 206,
        radius = 140;
      c.strokeStyle = '#205343';
      c.lineWidth = 2;
      for (let i = 1; i <= 3; i++) {
        c.beginPath();
        c.arc(cx, cy, (radius * i) / 3, 0, Math.PI * 2);
        c.stroke();
      }
      c.strokeStyle = '#83e9bb';
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(cx + Math.sin(this.sweep) * radius, cy - Math.cos(this.sweep) * radius);
      c.stroke();
      c.fillStyle = '#d8fff1';
      c.beginPath();
      c.arc(cx, cy, 5, 0, Math.PI * 2);
      c.fill();
      if (this.contact) {
        const dx = this.contact.x - x,
          dz = this.contact.z - z;
        if (Math.hypot(dx, dz) <= 18) {
          const rx = dx * Math.cos(yaw) - dz * Math.sin(yaw);
          const rz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
          c.fillStyle = '#ffc388';
          c.beginPath();
          c.arc(cx + (rx / 18) * radius, cy + (rz / 18) * radius, 9, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
    c.fillStyle = '#66958d';
    c.font = '17px system-ui';
    c.fillText('TRIGGER · EIN / AUS', 256, 373);
    this.texture.needsUpdate = true;
  }

  override disposeTool(): void {
    this.texture.dispose();
    disposeToolTree(this);
  }
}
