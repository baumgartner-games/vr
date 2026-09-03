import * as THREE from 'three';
import type { Handedness } from '../../core/XRInput';
import type { PlayerRig } from '../../core/PlayerRig';
import type { Tool } from './tools/Tool';

/** How close a held tool has to come before a slot offers to take it. */
export const SLOT_REACH = 0.34;

const _hand = new THREE.Vector3();
const _local = new THREE.Vector3();

/** One hip of the belt. */
export class BeltSlot extends THREE.Group {
  tool: Tool | null = null;
  /** True while a held tool hovers over this slot. */
  offered = false;

  private readonly ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  private glow = 0;

  constructor(readonly side: Handedness) {
    super();
    this.name = `belt-slot-${side}`;
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.075, 0.007, 8, 28),
      new THREE.MeshBasicMaterial({
        color: 0x6f7d99,
        transparent: true,
        opacity: 0.35,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    this.ring.rotation.x = Math.PI / 2;
    this.ring.renderOrder = 6;
    this.add(this.ring);
  }

  update(dt: number): void {
    // The ring only shows up when it is useful: something to take, or a tool
    // hovering over it that could be put down here.
    const wanted = this.offered ? 1 : this.tool ? 0.28 : 0;
    this.glow += (wanted - this.glow) * Math.min(1, dt * 12);
    const material = this.ring.material;
    material.opacity = 0.12 + this.glow * 0.75;
    material.color.setHex(this.offered ? 0x5ee0a0 : 0x6f7d99);
    this.ring.scale.setScalar(1 + this.glow * 0.18);
  }

  dispose(): void {
    this.ring.geometry.dispose();
    this.ring.material.dispose();
    this.removeFromParent();
  }
}

/**
 * The two hips a tool can rest on. Whatever hangs here rides along with the
 * player and is taken back into a hand with the grab button; a held tool that
 * comes close enough lights its slot up, so it is obvious where it can go.
 *
 * The portal guns start out here, but nothing about the belt knows that —
 * every tool fits every slot, and they can be swapped around freely.
 */
export class ToolBelt {
  readonly slots: [BeltSlot, BeltSlot];

  constructor(rig: PlayerRig) {
    this.slots = [new BeltSlot('left'), new BeltSlot('right')];
    for (const slot of this.slots) rig.add(slot);
  }

  slot(side: Handedness): BeltSlot {
    return this.slots[side === 'left' ? 0 : 1]!;
  }

  /** The tool resting on that hip, if any. */
  toolAt(side: Handedness): Tool | null {
    return this.slot(side).tool;
  }

  /** Where a tool currently lives, or null when it is in neither slot. */
  slotOf(tool: Tool): BeltSlot | null {
    return this.slots.find((slot) => slot.tool === tool) ?? null;
  }

  /**
   * Hangs a tool on a slot. A tool already on another hip is taken off there
   * first, and whatever was on the target hip is handed back to the caller —
   * that is how two tools swap places.
   */
  stow(tool: Tool, side: Handedness): Tool | null {
    const target = this.slot(side);
    const previous = this.slotOf(tool);
    if (previous && previous !== target) previous.tool = null;

    const displaced = target.tool && target.tool !== tool ? target.tool : null;
    if (displaced) displaced.removeFromParent();

    target.tool = tool;
    target.add(tool);
    tool.position.set(0, 0, 0);
    tool.quaternion.identity();
    tool.visible = true;
    tool.heldBy = null;
    return displaced;
  }

  /** The first free hip, preferring the one on the given side. */
  freeSlot(prefer?: Handedness): BeltSlot | null {
    if (prefer && !this.slot(prefer).tool) return this.slot(prefer);
    return this.slots.find((slot) => !slot.tool) ?? null;
  }

  /** Takes a tool off the belt without putting it anywhere. */
  release(tool: Tool): void {
    const slot = this.slotOf(tool);
    if (!slot) return;
    slot.tool = null;
    tool.removeFromParent();
  }

  /** Slot a point is close enough to, nearest first. Rig-local coordinates. */
  nearest(worldPoint: THREE.Vector3, rig: PlayerRig): BeltSlot | null {
    _local.copy(worldPoint);
    rig.worldToLocal(_local);
    let best: BeltSlot | null = null;
    let bestDistance = SLOT_REACH;
    for (const slot of this.slots) {
      const gap = _local.distanceTo(slot.position);
      if (gap >= bestDistance) continue;
      best = slot;
      bestDistance = gap;
    }
    return best;
  }

  /**
   * Puts both hips where they belong and lights up whichever one the given
   * held tools could be dropped into.
   *
   * @param carried world positions of the hands that currently hold a tool
   */
  update(dt: number, rig: PlayerRig, bodyYaw: number, carried: readonly THREE.Vector3[]): void {
    const height = rig.getHeadHeight();
    const sin = Math.sin(bodyYaw);
    const cos = Math.cos(bodyYaw);
    rig.getHeadPosition(_hand);
    rig.worldToLocal(_hand);

    for (const slot of this.slots) {
      const side = slot.side === 'left' ? -1 : 1;
      slot.position.set(
        _hand.x + cos * side * 0.26 + sin * 0.04,
        height * 0.5,
        _hand.z - sin * side * 0.26 + cos * 0.04,
      );
      slot.rotation.set(0, bodyYaw, 0);
      slot.offered = false;
    }

    for (const point of carried) {
      const slot = this.nearest(point, rig);
      if (slot) slot.offered = true;
    }
    for (const slot of this.slots) slot.update(dt);
  }

  dispose(): void {
    for (const slot of this.slots) {
      slot.tool?.removeFromParent();
      slot.tool = null;
      slot.dispose();
    }
  }
}
