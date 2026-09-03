import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playTone } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';
import type { PhysicsBody } from '../../../physics/PhysicsWorld';

/** Opening of the frame. */
const FRAME_W = 0.26;
const FRAME_H = 0.19;
/** How far the scanner sees. */
const RANGE = 45;

const _corner = new THREE.Vector3();
const _next = new THREE.Vector3();
const _eye = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _centre = new THREE.Vector3();
const _probe = new THREE.Vector3();

/** The four corners of the opening, in the tool's own space. */
const CORNERS: Array<[number, number]> = [
  [-FRAME_W / 2, -FRAME_H / 2],
  [FRAME_W / 2, -FRAME_H / 2],
  [FRAME_W / 2, FRAME_H / 2],
  [-FRAME_W / 2, FRAME_H / 2],
];

/**
 * Röntgen-Scanner: a picture frame you hold up in front of your face.
 *
 * Everything inside the frame is drawn again on top of the world, so props
 * behind a wall show through it. The four clipping planes are the pyramid from
 * your eye through the corners of the frame — that is what keeps the effect
 * *inside* the frame instead of turning the whole room into an x-ray.
 */
export class XrayTool extends Tool {
  override readonly toolId = 'xray';
  override readonly label = 'Röntgen-Scanner';

  /** The see-through copies live in world space, next to the props. */
  private readonly overlays = new THREE.Group();
  private readonly ghosts = new Map<PhysicsBody, THREE.Mesh>();
  private readonly planes = [
    new THREE.Plane(),
    new THREE.Plane(),
    new THREE.Plane(),
    new THREE.Plane(),
  ];
  private readonly material: THREE.MeshBasicMaterial;
  private readonly glass: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private scanning = true;

  constructor() {
    super();
    this.name = 'tool-xray';
    this.icon = 'xray';
    this.accent = 0x7ff0ff;
    this.hint = 'Vors Gesicht halten · Trigger schaltet den Scan';
    this.holdPosition.set(0, 0.02, -0.02);

    const shell = new THREE.MeshStandardMaterial({
      color: 0x2b3346,
      roughness: 0.55,
      metalness: 0.35,
    });

    // The frame: four bars around the opening.
    const bar = 0.018;
    for (const [w, h, x, y] of [
      [FRAME_W + bar * 2, bar, 0, FRAME_H / 2 + bar / 2],
      [FRAME_W + bar * 2, bar, 0, -FRAME_H / 2 - bar / 2],
      [bar, FRAME_H, -FRAME_W / 2 - bar / 2, 0],
      [bar, FRAME_H, FRAME_W / 2 + bar / 2, 0],
    ] as const) {
      const piece = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.014), shell);
      piece.position.set(x, y, 0);
      this.add(piece);
    }

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.02), shell);
    handle.position.set(0, -FRAME_H / 2 - 0.05, 0);
    this.add(handle);

    this.glass = new THREE.Mesh(
      new THREE.PlaneGeometry(FRAME_W, FRAME_H),
      new THREE.MeshBasicMaterial({
        color: 0x7ff0ff,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    this.glass.renderOrder = 3;
    this.add(this.glass);

    this.material = new THREE.MeshBasicMaterial({
      color: 0x7ff0ff,
      transparent: true,
      opacity: 0.55,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      clippingPlanes: this.planes,
      side: THREE.DoubleSide,
    });

    this.overlays.name = 'xray-overlays';
    this.overlays.visible = false;
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.overlays.parent !== host.root) host.root.add(this.overlays);
    this.scanning = true;
  }

  override onStow(_host: ToolHost): void {
    this.overlays.visible = false;
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    this.scanning = !this.scanning;
    controller.pulse(0.35, 25);
    playTone({ type: 'sine', from: this.scanning ? 420 : 900, to: this.scanning ? 900 : 420, duration: 0.12, gain: 0.05 });
    host.notify(this.scanning ? 'Scanner an' : 'Scanner aus');
  }

  override update(_dt: number, host: ToolHost, controller: ControllerState | null): void {
    const active = Boolean(controller && this.heldBy && this.scanning);
    this.overlays.visible = active;
    this.glass.material.opacity = active ? 0.08 : 0.03;
    if (!active) return;

    host.ctx.rig.getHeadPosition(_eye);
    this.updatePlanes(_eye);
    this.updateGhosts(host, _eye);
  }

  override disposeTool(): void {
    disposeToolTree(this);
    for (const mesh of this.ghosts.values()) mesh.removeFromParent();
    this.ghosts.clear();
    this.overlays.removeFromParent();
    this.material.dispose();
  }

  /** The pyramid from the eye through the four corners of the opening. */
  private updatePlanes(eye: THREE.Vector3): void {
    this.updateWorldMatrix(true, false);
    _centre.set(0, 0, 0).applyMatrix4(this.matrixWorld);
    // A point that is definitely inside the pyramid, used to fix the sign of
    // each plane: on the axis eye → middle of the opening, past the frame.
    // (Not "in front of the frame" — the eye is rarely on the frame's axis,
    // and then that point sits outside the pyramid and flips a plane.)
    _probe.copy(_centre).sub(eye).multiplyScalar(2).add(eye);

    for (let i = 0; i < 4; i++) {
      const [x0, y0] = CORNERS[i]!;
      const [x1, y1] = CORNERS[(i + 1) % 4]!;
      _corner.set(x0, y0, 0).applyMatrix4(this.matrixWorld);
      _next.set(x1, y1, 0).applyMatrix4(this.matrixWorld);
      _a.copy(_corner).sub(eye);
      _b.copy(_next).sub(eye);
      _normal.crossVectors(_a, _b).normalize();
      const plane = this.planes[i]!;
      plane.setFromNormalAndCoplanarPoint(_normal, eye);
      if (plane.distanceToPoint(_probe) < 0) plane.negate();
    }
  }

  /** One see-through copy per prop in range, reused frame after frame. */
  private updateGhosts(host: ToolHost, eye: THREE.Vector3): void {
    const props = host.props();
    const alive = new Set<PhysicsBody>();

    for (const entry of props) {
      const source = entry.object as THREE.Mesh;
      if (!source.geometry) continue;
      if (source.position.distanceTo(eye) > RANGE) continue;
      alive.add(entry);

      let mesh = this.ghosts.get(entry);
      if (!mesh) {
        // The geometry is shared with the prop: an x-ray is a second look at
        // the same object, not a second object.
        mesh = new THREE.Mesh(source.geometry, this.material);
        mesh.renderOrder = 30;
        mesh.frustumCulled = false;
        this.overlays.add(mesh);
        this.ghosts.set(entry, mesh);
      }
      source.updateWorldMatrix(true, false);
      mesh.matrix.copy(source.matrixWorld);
      mesh.matrixAutoUpdate = false;
      mesh.matrixWorldNeedsUpdate = true;
    }

    for (const [entry, mesh] of [...this.ghosts]) {
      if (alive.has(entry)) continue;
      mesh.removeFromParent();
      this.ghosts.delete(entry);
    }
  }
}
