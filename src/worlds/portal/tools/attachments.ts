import * as THREE from 'three';
import { XrayScope } from './XrayScope';
import { attachmentPose, saveAttachmentPose } from './gearStore';
import { poseFromReadout, readPose, type PoseReadout } from './toolPose';
import type { SightKind } from './weaponSettings';
import type { ToolHost } from './Tool';

/**
 * Things that clip onto a tool.
 *
 * An attachment is its own little object with its own pose — and that pose
 * lives in the *tool's* space, not the hand's, so lining a red dot up once
 * keeps it lined up however the gun is later held. The adjustment tool can
 * point at one and move it, exactly like it moves a whole tool, and the six
 * numbers travel in the config code with everything else.
 */

const _muzzle = new THREE.Vector3();
const _velocity = new THREE.Vector3();
const _point = new THREE.Vector3();
const _previous = new THREE.Vector3();
const _step = new THREE.Vector3();
const _impact = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _eye = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _forward = new THREE.Vector3(0, 0, 1);
const _scopeAt = new THREE.Vector3();
const _scopeTurn = new THREE.Quaternion();
const _scopeScale = new THREE.Vector3();
const _ahead = new THREE.Vector3();

/** What an attachment is told every frame. */
export interface AttachmentContext {
  host: ToolHost;
  /** Where the round leaves the barrel, and which way it goes. */
  muzzle: THREE.Object3D;
  /** Muzzle velocity in m/s, for anything that predicts a flight. */
  speed: number;
  /** True while the tool is actually in a hand. */
  held: boolean;
  /** How far the scope magnifies: 1 = as the naked eye sees it. */
  zoom: number;
}

export abstract class Attachment extends THREE.Group {
  abstract readonly attachmentId: string;
  abstract readonly label: string;

  /** Where it sits when nobody has moved it, in the tool's own space. */
  readonly factoryPose: PoseReadout = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 };

  /** Reads the pose the player gave this one, or falls back to the built-in. */
  applyStoredPose(toolId: string): void {
    this.setPose(attachmentPose(toolId, this.attachmentId) ?? this.factoryPose);
  }

  /** Puts it where those six numbers say. */
  setPose(readout: PoseReadout): void {
    const pose = poseFromReadout(readout);
    this.position.set(pose.position.x, pose.position.y, pose.position.z);
    this.quaternion.set(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w);
  }

  /** Where it sits now, in the six numbers a person reads. */
  pose(): PoseReadout {
    return readPose({
      position: { x: this.position.x, y: this.position.y, z: this.position.z },
      rotation: {
        x: this.quaternion.x,
        y: this.quaternion.y,
        z: this.quaternion.z,
        w: this.quaternion.w,
      },
    });
  }

  /** Writes the current pose down, so it survives the reload. */
  savePose(toolId: string): PoseReadout {
    const pose = this.pose();
    saveAttachmentPose(toolId, this.attachmentId, pose);
    return pose;
  }

  /** Back to where it was built, and forgets what was measured. */
  resetPose(toolId: string): void {
    this.setPose(this.factoryPose);
    saveAttachmentPose(toolId, this.attachmentId, this.factoryPose);
  }

  update(_dt: number, _ctx: AttachmentContext): void {}

  /**
   * A second pass over the scene, drawn *before* the frame this attachment
   * appears in — the trick the portals and the drone display use. Only
   * something with a picture of its own needs it.
   */
  renderFeed(_renderer: THREE.WebGLRenderer, _scene: THREE.Scene): void {}

  /** Anything that hangs outside the tool goes away here. */
  disposeAttachment(): void {}
}

/**
 * A red dot, done the way a real one works: the dot sits far down the barrel
 * axis and is scaled to keep its size, so it does not wander when your eye
 * moves behind it. It is drawn over everything — a reticle is not an object in
 * the room, it is a mark on the glass.
 */
class RedDotSight extends Attachment {
  override readonly attachmentId = 'reddot';
  override readonly label = 'Rotpunkt';
  override readonly factoryPose = { x: 0, y: 4.8, z: -6, pitch: 0, yaw: 0, roll: 0 };

  /** How far out the dot is imagined to be, in metres. */
  private static readonly THROW = 25;
  private readonly dot: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;

  constructor() {
    super();
    this.name = 'attach-reddot';
    const shell = new THREE.MeshStandardMaterial({
      color: 0x1d2230,
      roughness: 0.5,
      metalness: 0.4,
    });

    // A ring housing on two short legs.
    const tube = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 8, 20), shell);
    this.add(tube);
    for (const x of [-0.013, 0.013]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.016, 0.014), shell);
      leg.position.set(x, -0.02, 0);
      this.add(leg);
    }
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.015, 20),
      new THREE.MeshBasicMaterial({
        color: 0x7fd7ff,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    glass.renderOrder = 4;
    this.add(glass);

    this.dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 10, 8),
      new THREE.MeshBasicMaterial({
        color: 0xff2b3a,
        toneMapped: false,
        depthTest: false,
        depthWrite: false,
      }),
    );
    // 25 m out, roughly two minutes of angle across — the size a shooter
    // expects, and the same size wherever the eye happens to be.
    this.dot.position.set(0, 0, -RedDotSight.THROW);
    this.dot.scale.setScalar(1.4);
    this.dot.renderOrder = 41;
    this.dot.frustumCulled = false;
    this.add(this.dot);
  }

  override update(_dt: number, ctx: AttachmentContext): void {
    this.dot.visible = ctx.held;
  }
}

/** Kimme und Korn: a notch at the back, a post at the front. */
class IronSights extends Attachment {
  override readonly attachmentId = 'irons';
  override readonly label = 'Kimme & Korn';
  override readonly factoryPose = { x: 0, y: 3.4, z: 0, pitch: 0, yaw: 0, roll: 0 };

  constructor() {
    super();
    this.name = 'attach-irons';
    const steel = new THREE.MeshStandardMaterial({
      color: 0x303746,
      roughness: 0.45,
      metalness: 0.6,
    });
    const mark = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

    // Rear sight: two blades with the notch between them.
    for (const x of [-0.009, 0.009]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.012, 0.006), steel);
      blade.position.set(x, 0.006, 0);
      this.add(blade);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0016, 6, 5), mark);
      dot.position.set(x, 0.009, -0.003);
      this.add(dot);
    }

    // Front post, out at the muzzle.
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.014, 0.005), steel);
    post.position.set(0, 0.007, -0.16);
    this.add(post);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 6, 5), mark);
    bead.position.set(0, 0.013, -0.163);
    this.add(bead);
  }
}

/**
 * The flight of the next round, drawn before it is fired: the same parabola
 * the physics engine will produce, sampled every few centiseconds. It ends
 * where the line first runs into something, so it doubles as a range finder.
 */
class TrajectorySight extends Attachment {
  override readonly attachmentId = 'trace';
  override readonly label = 'Flugbahn';
  override readonly factoryPose = { x: 0, y: 3.2, z: -2, pitch: 0, yaw: 0, roll: 0 };

  /** Points along the curve, and the step between them in seconds. */
  private static readonly POINTS = 40;
  private static readonly STEP = 0.05;
  private static readonly GRAVITY = -9.81;

  private readonly line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly impact: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly positions: Float32Array;

  constructor() {
    super();
    this.name = 'attach-trace';
    const body = new THREE.MeshStandardMaterial({
      color: 0x243044,
      roughness: 0.5,
      metalness: 0.4,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.03), body);
    this.add(box);
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.004, 12),
      new THREE.MeshBasicMaterial({ color: 0x9dff8a, toneMapped: false }),
    );
    lens.position.set(0, 0, -0.016);
    this.add(lens);

    this.positions = new Float32Array(TrajectorySight.POINTS * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: 0x9dff8a,
        transparent: true,
        opacity: 0.75,
        toneMapped: false,
      }),
    );
    this.line.name = 'trajectory';
    this.line.frustumCulled = false;
    this.line.visible = false;

    this.impact = new THREE.Mesh(
      new THREE.RingGeometry(0.05, 0.07, 20),
      new THREE.MeshBasicMaterial({
        color: 0x9dff8a,
        transparent: true,
        opacity: 0.8,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    this.impact.visible = false;
    this.impact.frustumCulled = false;
  }

  override update(_dt: number, ctx: AttachmentContext): void {
    // The line lives in the room, not on the gun: it has to stay put while the
    // barrel swings, or it would simply be a straight stick out of the muzzle.
    if (this.line.parent !== ctx.host.root) ctx.host.root.add(this.line, this.impact);
    if (!ctx.held) {
      this.line.visible = false;
      this.impact.visible = false;
      return;
    }

    ctx.muzzle.updateWorldMatrix(true, false);
    ctx.muzzle.getWorldPosition(_muzzle);
    _velocity
      .set(0, 0, -1)
      .applyQuaternion(ctx.muzzle.getWorldQuaternion(_quaternion))
      .normalize()
      .multiplyScalar(ctx.speed);

    let hit = false;
    let count = 0;
    _previous.copy(_muzzle);
    for (let i = 0; i < TrajectorySight.POINTS; i++) {
      const t = i * TrajectorySight.STEP;
      _point
        .copy(_muzzle)
        .addScaledVector(_velocity, t)
        .setY(_muzzle.y + _velocity.y * t + 0.5 * TrajectorySight.GRAVITY * t * t);

      // Where the curve runs into something. Every second point is enough for
      // that — a ray per sample would be three dozen casts a frame.
      if (i > 0 && i % 2 === 0) {
        _step.copy(_point).sub(_previous);
        const length = _step.length();
        const surface =
          length > 1e-4 ? ctx.host.castSurface(_previous, _step.divideScalar(length)) : null;
        if (surface && surface.point.distanceTo(_previous) <= length) {
          // The host reuses its vectors, so anything kept is copied at once.
          _impact.copy(surface.point);
          _normal.copy(surface.normal).normalize();
          this.positions[i * 3] = _impact.x;
          this.positions[i * 3 + 1] = _impact.y;
          this.positions[i * 3 + 2] = _impact.z;
          this.impact.position.copy(_impact).addScaledVector(_normal, 0.01);
          this.impact.quaternion.setFromUnitVectors(_forward, _normal);
          count = i + 1;
          hit = true;
          break;
        }
        _previous.copy(_point);
      }

      this.positions[i * 3] = _point.x;
      this.positions[i * 3 + 1] = _point.y;
      this.positions[i * 3 + 2] = _point.z;
      count = i + 1;
    }

    // The tail of the buffer sits on the last point, so nothing stray is drawn.
    const last = (count - 1) * 3;
    for (let i = count; i < TrajectorySight.POINTS; i++) {
      this.positions[i * 3] = this.positions[last]!;
      this.positions[i * 3 + 1] = this.positions[last + 1]!;
      this.positions[i * 3 + 2] = this.positions[last + 2]!;
    }
    (this.line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    this.line.geometry.computeBoundingSphere();
    this.line.visible = true;
    this.impact.visible = hit;
  }

  override disposeAttachment(): void {
    this.line.geometry.dispose();
    this.line.material.dispose();
    this.line.removeFromParent();
    this.impact.geometry.dispose();
    this.impact.material.dispose();
    this.impact.removeFromParent();
  }
}

/** The hand-held scanner, shrunk onto the top rail. */
class XraySight extends Attachment {
  override readonly attachmentId = 'xray';
  override readonly label = 'Röntgen';
  override readonly factoryPose = { x: 0, y: 7, z: -5, pitch: 0, yaw: 0, roll: 0 };

  private readonly scope = new XrayScope(0.09, 0.06, 0x7ff0ff, 60);

  constructor() {
    super();
    this.name = 'attach-xray';
    const shell = new THREE.MeshStandardMaterial({
      color: 0x2b3346,
      roughness: 0.55,
      metalness: 0.35,
    });
    const bar = 0.008;
    for (const [w, h, x, y] of [
      [0.09 + bar * 2, bar, 0, 0.03 + bar / 2],
      [0.09 + bar * 2, bar, 0, -0.03 - bar / 2],
      [bar, 0.06, -0.045 - bar / 2, 0],
      [bar, 0.06, 0.045 + bar / 2, 0],
    ] as const) {
      const piece = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.008), shell);
      piece.position.set(x, y, 0);
      this.add(piece);
    }
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.02), shell);
    mount.position.set(0, -0.045, 0);
    this.add(mount);
    this.add(this.scope.glass);
  }

  override update(_dt: number, ctx: AttachmentContext): void {
    this.scope.attach(ctx.host.root);
    if (!ctx.held) {
      this.scope.hide();
      return;
    }
    ctx.host.ctx.rig.getHeadPosition(_eye);
    this.scope.update(this, _eye, ctx.host.props());
  }

  override disposeAttachment(): void {
    this.scope.dispose();
  }
}

/**
 * A telescopic sight with a real zoom.
 *
 * The picture in the eyepiece is neither a texture nor a trick: a second camera
 * sits at the front of the tube, looks along the tube's axis and draws the
 * scene into a render target that lies on the rear lens — the same mechanism
 * the drone's display uses. The magnification is therefore simply that camera's
 * field of view: `REFERENCE / zoom`, where `REFERENCE` is what the naked eye
 * sees. 40× really is 40×.
 *
 * The eyepiece has to be brought to the eye, like a real scope. That is why the
 * camera sits at the front and not at the back: from the back the tube would
 * photograph itself and half the barrel.
 *
 * The magnification is one of the weapon's values (*Einstellungen → Pistole →
 * Zoom*): step through the notches (1×, 2×, 4×, 8×, 12×, 16×, 20×, 40×) or type
 * the number in.
 */
class TelescopicSight extends Attachment {
  override readonly attachmentId = 'scope';
  override readonly label = 'Fernrohr';
  override readonly factoryPose = { x: 0, y: 4.6, z: -1, pitch: 0, yaw: 0, roll: 0 };

  /** What the naked eye sees — 1× is exactly this angle. */
  private static readonly REFERENCE = 58;
  /** Edge of the picture. The lens is round, the target is square. */
  private static readonly FEED = 512;
  /** How far ahead of the tube the camera sits, so it never sees the barrel. */
  private static readonly AHEAD = 0.115;

  private readonly camera = new THREE.PerspectiveCamera(58, 1, 0.15, 400);
  private readonly target: THREE.WebGLRenderTarget;
  private readonly lens: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly reticle = new THREE.Group();
  private zoom = 1;
  private live = false;

  constructor() {
    super();
    this.name = 'attach-scope';
    const shell = new THREE.MeshStandardMaterial({
      color: 0x1b2130,
      roughness: 0.45,
      metalness: 0.5,
    });

    // Tube, objective bell at the front, eyepiece at the back, and two rings
    // to sit on the rail with.
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.15, 18), shell);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0, -0.01);
    this.add(tube);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.017, 0.035, 18), shell);
    bell.rotation.x = Math.PI / 2;
    bell.position.set(0, 0, -0.1);
    this.add(bell);
    const eyepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.016, 0.03, 18), shell);
    eyepiece.rotation.x = Math.PI / 2;
    eyepiece.position.set(0, 0, 0.075);
    this.add(eyepiece);
    for (const z of [-0.05, 0.03]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.008, 16), shell);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 0, z);
      this.add(ring);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.016, 0.01), shell);
      foot.position.set(0, -0.024, z);
      this.add(foot);
    }

    this.target = new THREE.WebGLRenderTarget(TelescopicSight.FEED, TelescopicSight.FEED, {
      depthBuffer: true,
      colorSpace: THREE.SRGBColorSpace,
    });
    this.lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.0155, 28),
      new THREE.MeshBasicMaterial({ map: this.target.texture, toneMapped: false }),
    );
    // At the rear end, facing the eye: a circle looks along +Z.
    this.lens.position.set(0, 0, 0.0905);
    this.add(this.lens);

    // Crosshair on the glass — four strokes that leave the middle clear.
    const mark = new THREE.MeshBasicMaterial({
      color: 0x101418,
      toneMapped: false,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
    });
    for (const [w, h, x, y] of [
      [0.0009, 0.0095, 0, 0.0058],
      [0.0009, 0.0095, 0, -0.0058],
      [0.0095, 0.0009, 0.0058, 0],
      [0.0095, 0.0009, -0.0058, 0],
    ] as const) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mark);
      bar.position.set(x, y, 0);
      this.reticle.add(bar);
    }
    this.reticle.position.set(0, 0, 0.0906);
    this.reticle.renderOrder = 42;
    this.add(this.reticle);
  }

  override update(_dt: number, ctx: AttachmentContext): void {
    this.zoom = ctx.zoom;
    this.live = ctx.held;
    this.lens.visible = ctx.held;
    this.reticle.visible = ctx.held;
  }

  override renderFeed(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    if (!this.live || !this.visible) return;

    this.updateWorldMatrix(true, false);
    this.matrixWorld.decompose(_scopeAt, _scopeTurn, _scopeScale);
    this.camera.quaternion.copy(_scopeTurn);
    _ahead.set(0, 0, -1).applyQuaternion(_scopeTurn);
    this.camera.position.copy(_scopeAt).addScaledVector(_ahead, TelescopicSight.AHEAD);
    // The magnification *is* the field of view: half the angle over the factor.
    const half = THREE.MathUtils.degToRad(TelescopicSight.REFERENCE) / 2;
    this.camera.fov = THREE.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(half) / Math.max(1, this.zoom)),
    );
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);

    const previousTarget = renderer.getRenderTarget();
    const xrEnabled = renderer.xr.enabled;
    renderer.xr.enabled = false;
    // The lens must not photograph itself.
    this.lens.visible = false;
    this.reticle.visible = false;
    renderer.setRenderTarget(this.target);
    renderer.render(scene, this.camera);
    renderer.setRenderTarget(previousTarget);
    renderer.xr.enabled = xrEnabled;
    this.lens.visible = true;
    this.reticle.visible = true;
  }

  override disposeAttachment(): void {
    this.target.dispose();
  }
}

/** Builds one of the aiming aids; `none` has nothing to build. */
export function createSight(kind: SightKind): Attachment | null {
  switch (kind) {
    case 'reddot':
      return new RedDotSight();
    case 'irons':
      return new IronSights();
    case 'trace':
      return new TrajectorySight();
    case 'xray':
      return new XraySight();
    case 'scope':
      return new TelescopicSight();
    default:
      return null;
  }
}
