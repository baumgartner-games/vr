import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playSwitch } from '../../../core/Audio';
import {
  DEFAULT_BEAM_ANGLE,
  beamAngleFromDrag,
  beamIntensity,
  beamLabel,
  beamRange,
  clampBeamAngle,
} from './flashlightBeam';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** Where the lens sits on the torch, in the tool's own space. */
const LENS_Z = -0.13;
/** How close the free hand has to come to the lens to take hold of it. */
const LENS_REACH = 0.11;
/** Length of the drawn cone, in metres. It is a hint, not the light itself. */
const CONE_LENGTH = 6;

const _hand = new THREE.Vector3();
const _local = new THREE.Vector3();
const _lens = new THREE.Vector3();
const _inverse = new THREE.Matrix4();

/**
 * A torch: the tool the dark house is for.
 *
 * The **trigger** switches it on and off. The **other hand** grabs the lens —
 * the ring at the front — and pulls sideways: right opens the cone up into a
 * floodlight, left closes it down to a spot. That is one gesture doing what a
 * real torch does when you twist its head, and it is worth having as a gesture
 * rather than as a menu row, because in a dark corridor the menu is exactly
 * the thing you cannot find.
 *
 * Narrow is bright and reaches far, wide is soft and short — `flashlightBeam.ts`
 * works that out and is tested on its own.
 *
 * The spot light stays in the scene when the torch is off; it is turned down
 * to zero instead of being hidden, because three.js rebuilds every shader in
 * the room when the number of lights changes, and a torch that stutters the
 * whole world on every click is not a torch.
 */
export class FlashlightTool extends Tool {
  override readonly toolId = 'flashlight';
  override readonly label = 'Taschenlampe';

  /** Half angle of the cone, in degrees. */
  private angle = DEFAULT_BEAM_ANGLE;
  private on = false;
  /** What it was doing before it went onto a hip — a dropped one stays lit. */
  private wasOn = false;

  private readonly beam: THREE.SpotLight;
  private readonly glow: THREE.PointLight;
  private readonly lens: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly cone: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>;
  private readonly ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;

  /** The hand on the lens: near it, or holding on to it right now. */
  private lensHand: Handedness | null = null;
  private grip: { hand: Handedness; startAngle: number; startX: number } | null = null;

  constructor() {
    super();
    this.name = 'tool-flashlight';
    this.icon = 'flashlight';
    this.accent = 0xffd88a;
    this.hint = 'Trigger schaltet · andere Hand an der Linse stellt den Kegel';
    this.holdPosition.set(0, -0.012, 0.035);

    const body = new THREE.MeshStandardMaterial({
      color: 0x2b3242,
      roughness: 0.45,
      metalness: 0.55,
    });
    const metal = new THREE.MeshStandardMaterial({
      color: 0xb9c2d4,
      roughness: 0.3,
      metalness: 0.8,
    });

    // The barrel lies along -Z, the direction every tool aims in.
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.024, 0.16, 20), body);
    barrel.rotation.x = -Math.PI / 2;
    barrel.position.z = -0.03;
    this.add(barrel);

    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.026, 0.05, 20), metal);
    head.rotation.x = -Math.PI / 2;
    head.position.z = LENS_Z + 0.024;
    this.add(head);

    this.lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.034, 24),
      new THREE.MeshBasicMaterial({ color: 0x3a4152, toneMapped: false }),
    );
    this.lens.position.z = LENS_Z;
    this.lens.rotation.y = Math.PI;
    this.add(this.lens);

    // The ring around the lens: what the other hand takes hold of, and what
    // lights up when it is close enough for the grab to count.
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.038, 0.005, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0x6f7d99, toneMapped: false }),
    );
    this.ring.position.z = LENS_Z + 0.004;
    this.add(this.ring);

    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.03, 0.05), metal);
    clip.position.set(0.02, 0.014, 0.01);
    this.add(clip);

    this.beam = new THREE.SpotLight(0xfff1cf, 0, beamRange(this.angle), 0, 0.45, 1.6);
    this.beam.position.set(0, 0, LENS_Z);
    this.add(this.beam);
    // A spot light shines at its target, so the target rides in front of it.
    this.beam.target.position.set(0, 0, LENS_Z - 1);
    this.add(this.beam.target);

    // A little light at the lens itself, or the torch is a black stick in a
    // black room and its own housing stays invisible.
    this.glow = new THREE.PointLight(0xffe3ad, 0, 1.4, 2);
    this.glow.position.set(0, 0, LENS_Z - 0.02);
    this.add(this.glow);

    // The visible cone. Its apex sits at the lens (+Y of the geometry, turned
    // backwards), so the mouth opens forwards along -Z.
    this.cone = new THREE.Mesh(
      new THREE.ConeGeometry(1, 1, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffeec4,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    this.cone.rotation.x = Math.PI / 2;
    this.cone.position.z = LENS_Z - CONE_LENGTH / 2;
    this.cone.frustumCulled = false;
    this.cone.renderOrder = 4;
    this.add(this.cone);

    this.applyBeam();
  }

  /** Half angle of the cone, in degrees — the dark world reads it for a sign. */
  get coneAngle(): number {
    return this.angle;
  }

  get lit(): boolean {
    return this.on;
  }

  /** Switches the torch on or off without anybody pressing anything. */
  setLit(on: boolean): void {
    if (this.on === on) return;
    this.on = on;
    this.wasOn = on;
    this.applyBeam();
  }

  /**
   * The free hand is busy with the lens while it is on it — so it does not
   * pull a tool off the hip or grab a crate at the same time.
   */
  override claimsHand(hand: Handedness): boolean {
    return this.heldBy !== null && this.lensHand === hand;
  }

  override onTake(_controller: ControllerState, _host: ToolHost): void {
    // Picking up a torch in a dark house and having to find its switch first
    // is a joke that stops being funny immediately.
    this.on = true;
    this.wasOn = true;
    this.applyBeam();
  }

  override onStow(_host: ToolHost): void {
    // Stowed is inside the belt: no light in there. `onThrow` puts it back on
    // for a torch that was let go of into the room rather than onto a hip.
    this.wasOn = this.on;
    this.on = false;
    this.lensHand = null;
    this.grip = null;
    this.applyBeam();
  }

  override onThrow(_host: ToolHost, _speed: number): void {
    this.on = this.wasOn;
    this.applyBeam();
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    this.on = !this.on;
    this.wasOn = this.on;
    this.applyBeam();
    playSwitch(this.on);
    controller.pulse(0.4, 25);
    host.notify(this.on ? 'Taschenlampe an' : 'Taschenlampe aus');
  }

  override update(_dt: number, host: ToolHost, _controller: ControllerState | null): void {
    if (!this.heldBy) {
      this.lensHand = null;
      this.grip = null;
      this.updateRing();
      return;
    }

    const other: Handedness = this.heldBy === 'left' ? 'right' : 'left';
    const free = host.ctx.input.get(other);
    const anchor = free?.tracked ? (free.grip.visible ? free.grip : free.targetRay) : null;
    if (!anchor) {
      this.endGrip(host);
      this.lensHand = null;
      this.updateRing();
      return;
    }

    // Everything happens in the torch's own space: "left and right" is left
    // and right *of the lamp*, however the holding hand is turned.
    anchor.getWorldPosition(_hand);
    this.updateWorldMatrix(true, false);
    _local.copy(_hand).applyMatrix4(_inverse.copy(this.matrixWorld).invert());
    const near = _local.distanceTo(_lens.set(0, 0, LENS_Z)) <= LENS_REACH;

    if (this.grip) {
      if (!free!.squeeze.pressed) {
        this.endGrip(host);
      } else {
        const angle = beamAngleFromDrag(this.grip.startAngle, _local.x - this.grip.startX);
        if (angle !== this.angle) {
          this.angle = angle;
          this.applyBeam();
        }
      }
    } else if (near && free!.squeeze.justPressed) {
      this.grip = { hand: other, startAngle: this.angle, startX: _local.x };
      free!.pulse(0.4, 25);
    }

    this.lensHand = this.grip ? this.grip.hand : near ? other : null;
    this.updateRing();
  }

  override disposeTool(): void {
    disposeToolTree(this);
    this.cone.geometry.dispose();
    this.cone.material.dispose();
  }

  /** Lets go of the lens and says what the cone ended up at. */
  private endGrip(host: ToolHost): void {
    if (!this.grip) return;
    this.grip = null;
    host.notify(`Lichtkegel: ${beamLabel(this.angle)}`);
  }

  /** Puts the current angle and switch position onto the light and the glass. */
  private applyBeam(): void {
    const angle = clampBeamAngle(this.angle);
    const radians = (Math.PI / 180) * angle;
    this.beam.angle = radians;
    this.beam.distance = beamRange(angle);
    this.beam.intensity = this.on ? beamIntensity(angle) : 0;
    this.glow.intensity = this.on ? 0.35 : 0;
    this.lens.material.color.setHex(this.on ? 0xfff4d8 : 0x3a4152);

    const radius = Math.tan(radians) * CONE_LENGTH;
    this.cone.scale.set(radius, CONE_LENGTH, radius);
    // A narrow beam is a brighter shaft of dust; a wide one barely shows.
    this.cone.material.opacity = this.on ? 0.035 + (1 - angle / 90) * 0.05 : 0;
    this.cone.visible = this.on;
  }

  /** The ring glows while the free hand is on the lens. */
  private updateRing(): void {
    const held = this.grip !== null;
    this.ring.material.color.setHex(held ? 0x5ee0a0 : this.lensHand ? 0x9fe3ff : 0x6f7d99);
  }
}
