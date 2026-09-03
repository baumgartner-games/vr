import * as THREE from 'three';
import type { PhysicsBody } from '../../../physics/PhysicsWorld';

const _corner = new THREE.Vector3();
const _next = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _centre = new THREE.Vector3();
const _probe = new THREE.Vector3();

/**
 * The x-ray effect on its own: an opening you look through, and everything
 * behind it drawn again on top of the world.
 *
 * It started life inside the hand-held scanner, and the scope that clips onto
 * the pistol wants exactly the same thing at a quarter of the size — so the
 * maths lives here and the two frames around it are just geometry.
 *
 * The four clipping planes are the pyramid from your eye through the corners
 * of the opening. That is what keeps the effect *inside* the frame instead of
 * turning the whole room into an x-ray.
 */
export class XrayScope {
  /** The see-through copies live in world space, next to the props. */
  readonly overlays = new THREE.Group();
  /** The faint pane in the opening; the owner adds it to its own frame. */
  readonly glass: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

  private readonly ghosts = new Map<PhysicsBody, THREE.Mesh>();
  private readonly planes = [
    new THREE.Plane(),
    new THREE.Plane(),
    new THREE.Plane(),
    new THREE.Plane(),
  ];
  private readonly material: THREE.MeshBasicMaterial;
  /** The four corners of the opening, in the frame's own space. */
  private readonly corners: Array<[number, number]>;

  constructor(
    readonly width: number,
    readonly height: number,
    color = 0x7ff0ff,
    /** How far the scanner sees, in metres. */
    readonly range = 45,
  ) {
    this.corners = [
      [-width / 2, -height / 2],
      [width / 2, -height / 2],
      [width / 2, height / 2],
      [-width / 2, height / 2],
    ];

    this.glass = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    this.glass.renderOrder = 3;

    this.material = new THREE.MeshBasicMaterial({
      color,
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

  /** Hangs the overlays into the room. Safe to call every time it is taken. */
  attach(root: THREE.Object3D): void {
    if (this.overlays.parent !== root) root.add(this.overlays);
  }

  /** Nothing drawn until the next update. */
  hide(): void {
    this.overlays.visible = false;
    this.glass.material.opacity = 0.03;
  }

  /**
   * One frame of x-ray.
   *
   * @param frame the object the opening belongs to, already in world space
   * @param eye   where the player is looking from
   */
  update(frame: THREE.Object3D, eye: THREE.Vector3, props: readonly PhysicsBody[]): void {
    this.overlays.visible = true;
    this.glass.material.opacity = 0.08;
    this.updatePlanes(frame, eye);
    this.updateGhosts(props, eye);
  }

  dispose(): void {
    for (const mesh of this.ghosts.values()) mesh.removeFromParent();
    this.ghosts.clear();
    this.overlays.removeFromParent();
    this.glass.geometry.dispose();
    this.glass.material.dispose();
    this.material.dispose();
  }

  /** The pyramid from the eye through the four corners of the opening. */
  private updatePlanes(frame: THREE.Object3D, eye: THREE.Vector3): void {
    frame.updateWorldMatrix(true, false);
    _centre.set(0, 0, 0).applyMatrix4(frame.matrixWorld);
    // A point that is definitely inside the pyramid, used to fix the sign of
    // each plane: on the axis eye → middle of the opening, past the frame.
    // (Not "in front of the frame" — the eye is rarely on the frame's axis,
    // and then that point sits outside the pyramid and flips a plane.)
    _probe.copy(_centre).sub(eye).multiplyScalar(2).add(eye);

    for (let i = 0; i < 4; i++) {
      const [x0, y0] = this.corners[i]!;
      const [x1, y1] = this.corners[(i + 1) % 4]!;
      _corner.set(x0, y0, 0).applyMatrix4(frame.matrixWorld);
      _next.set(x1, y1, 0).applyMatrix4(frame.matrixWorld);
      _a.copy(_corner).sub(eye);
      _b.copy(_next).sub(eye);
      _normal.crossVectors(_a, _b).normalize();
      const plane = this.planes[i]!;
      plane.setFromNormalAndCoplanarPoint(_normal, eye);
      if (plane.distanceToPoint(_probe) < 0) plane.negate();
    }
  }

  /** One see-through copy per prop in range, reused frame after frame. */
  private updateGhosts(props: readonly PhysicsBody[], eye: THREE.Vector3): void {
    const alive = new Set<PhysicsBody>();

    for (const entry of props) {
      const source = entry.object as THREE.Mesh;
      if (!source.geometry) continue;
      if (source.position.distanceTo(eye) > this.range) continue;
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
