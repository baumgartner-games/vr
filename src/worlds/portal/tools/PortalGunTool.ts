import * as THREE from 'three';
import { PortalGun } from '../PortalGun';
import { Tool, type ToolHost } from './Tool';
import type { ControllerState } from '../../../core/XRInput';
import type { PortalKey } from '../PortalSync';

export const COLOR_BLUE = 0x2f8fff;
export const COLOR_RED = 0xff3b2f;

const _ray = new THREE.Ray();
const _quaternion = new THREE.Quaternion();

/**
 * A portal gun as a belt tool.
 *
 * The single-colour ones are the originals: hold them and the trigger places
 * their own portal. The two-portal model carries both — trigger fires red,
 * grab fires blue — so it is taken once and stays in the hand until it is put
 * back on the belt.
 */
export class PortalGunTool extends Tool {
  readonly gun: PortalGun;

  constructor(
    override readonly toolId: string,
    override readonly label: string,
    /** Portal on the trigger, and on the grab button for the two-portal model. */
    private readonly triggerKey: PortalKey,
    private readonly grabKey: PortalKey | null,
  ) {
    super();
    this.name = `tool-${toolId}`;
    const trigger = triggerKey === 'a' ? COLOR_BLUE : COLOR_RED;
    const grab = grabKey ? (grabKey === 'a' ? COLOR_BLUE : COLOR_RED) : undefined;
    this.gun = new PortalGun(toolId, trigger, grab);
    this.add(this.gun);

    this.icon = 'gun';
    this.accent = grabKey ? 0x9d7bff : trigger;
    // The two-portal model needs the grab button for its second portal, so it
    // cannot also be the button that holds it: it is taken once and stays.
    this.sticky = grabKey !== null;
    this.hint = grabKey
      ? 'Trigger rot · Greifen blau · am Gürtel ablegen'
      : triggerKey === 'a'
        ? 'Setzt das blaue Portal'
        : 'Setzt das rote Portal';
  }

  override onTake(_controller: ControllerState, _host: ToolHost): void {
    this.gun.holstered = false;
  }

  override onStow(_host: ToolHost): void {
    this.gun.holstered = true;
    this.gun.quaternion.identity();
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    this.shoot(this.triggerKey, controller, host);
  }

  override onGrab(controller: ControllerState, host: ToolHost): void {
    if (this.grabKey) this.shoot(this.grabKey, controller, host);
  }

  override update(dt: number, _host: ToolHost, _controller: ControllerState | null): void {
    // Aiming along the pointing ray instead of the grip is the base class's
    // job now (`Tool.applyAim`) — every tool gets it, not just this one.
    this.gun.update(dt);
  }

  /** Where this gun currently points; the preview ring uses it too. */
  aimRay(target: THREE.Ray): THREE.Ray {
    this.gun.muzzle.getWorldPosition(target.origin);
    target.direction
      .set(0, 0, -1)
      .applyQuaternion(this.gun.getWorldQuaternion(_quaternion))
      .normalize();
    return target;
  }

  /** Portal keys this gun can place, in trigger-then-grab order. */
  get keys(): PortalKey[] {
    return this.grabKey ? [this.triggerKey, this.grabKey] : [this.triggerKey];
  }

  override disposeTool(): void {
    this.gun.dispose();
  }

  private shoot(key: PortalKey, controller: ControllerState, host: ToolHost): void {
    this.aimRay(_ray);
    this.gun.fire(key === 'a' ? COLOR_BLUE : COLOR_RED);
    controller.pulse(0.35, 25);
    host.shootPortal(key, _ray.origin, _ray.direction);
  }
}

/** The three guns the portal lab offers. */
export function createPortalGunTool(id: string): PortalGunTool | null {
  switch (id) {
    case 'gun-blue':
      return new PortalGunTool('gun-blue', 'Portal Waffe blau', 'a', null);
    case 'gun-red':
      return new PortalGunTool('gun-red', 'Portal Waffe rot', 'b', null);
    case 'gun-dual':
      return new PortalGunTool('gun-dual', 'Portal Waffe doppelt', 'b', 'a');
    default:
      return null;
  }
}
