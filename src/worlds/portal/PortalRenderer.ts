import * as THREE from 'three';
import type { Portal } from './Portal';
import { LAYER_SELF_ONLY } from '../../core/PlayerAvatar';
import { LAYER_HUD } from '../../ui/ScoreHud';
import { DEFAULT_PORTAL_DEPTH, clampPortalDepth } from './portalDepth';

const _plane = new THREE.Plane();
const _normal = new THREE.Vector3();
const _point = new THREE.Vector3();
const _clip = new THREE.Vector4();
const _q = new THREE.Vector4();
const _size = new THREE.Vector2();
const _targetSize = new THREE.Vector2();

/**
 * How much smaller each level inside the first one is drawn. A portal in a
 * portal is a small thing on the screen, and a full-size target for it is
 * megabytes of headset memory nobody ever looks at closely.
 */
const LEVEL_SCALE = 0.6;
/** However deep it goes, a view never drops below this much of the frame. */
const MIN_LEVEL_SCALE = 0.3;

/**
 * Renders the view through each portal into an off-screen target.
 *
 * The target has the same layout as the frame buffer that is currently being
 * drawn (both eyes side by side in VR), so the portal surface can simply look
 * up its own screen position. That keeps the illusion stable in stereo.
 *
 * The views nest: with `depth` at two, the portal inside a portal shows a room
 * again instead of its idle swirl. Each level is one more pass over the whole
 * scene per portal, so the number is a setting the player owns
 * (`portalDepth.ts`) rather than something baked in here.
 */
export class PortalRenderer {
  /** Render scale of the portal views while in VR. */
  vrResolutionScale = 0.75;

  /** How many views are drawn into one another. See `portalDepth.ts`. */
  depth = DEFAULT_PORTAL_DEPTH;

  /** One render target per portal *and* per level of nesting. */
  private readonly targets = new Map<Portal, THREE.WebGLRenderTarget[]>();
  /**
   * The traversal matrix of each level, per portal: level 0 steps through this
   * portal once, level 1 through it and back through its partner, and so on.
   * They are world-space transforms of the camera, so they are worked out once
   * per frame and then used for both eyes.
   */
  private readonly chains = new Map<Portal, THREE.Matrix4[]>();
  private readonly mono = new THREE.PerspectiveCamera();
  private readonly array = new THREE.ArrayCamera();
  private readonly size = new THREE.Vector2();

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    for (const camera of [this.mono, this.array]) {
      camera.matrixAutoUpdate = false;
      camera.matrixWorldAutoUpdate = false;
    }
  }

  /** Draws the portal views. Call before the main render pass. */
  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, portals: Portal[]): void {
    const renderer = this.renderer;
    const presenting = renderer.xr.isPresenting;
    const xrCamera = presenting ? renderer.xr.getCamera() : null;

    scene.updateMatrixWorld(true);

    if (xrCamera && xrCamera.cameras.length > 0) {
      let width = 0;
      let height = 0;
      for (const eye of xrCamera.cameras) {
        const viewport = eye.viewport;
        if (!viewport) continue;
        width = Math.max(width, viewport.x + viewport.z);
        height = Math.max(height, viewport.y + viewport.w);
      }
      this.size.set(width, height);
    } else {
      renderer.getDrawingBufferSize(this.size);
    }

    const active = portals.filter((portal) => portal.placed && portal.link?.placed);
    if (active.length === 0) {
      for (const portal of portals) portal.setResolution(this.size);
      for (const portal of portals) portal.setView(null);
      this.trim(0, active);
      return;
    }

    const depth = clampPortalDepth(this.depth);
    this.trim(depth, active);
    this.buildChains(active, depth);

    const scale = presenting ? this.vrResolutionScale : 1;

    const previousTarget = renderer.getRenderTarget();
    const previousXrEnabled = renderer.xr.enabled;
    renderer.xr.enabled = false;

    // Deepest level first: a level is drawn with the level below it already in
    // the portals, and the last one drawn is the one the player looks at.
    for (let level = depth - 1; level >= 0; level--) {
      const inner = level + 1;
      for (const portal of active) {
        portal.setView(
          inner < depth ? this.target(portal, inner, scale, !presenting).texture : null,
        );
      }
      // A portal surface looks its own image up by screen position, so every
      // portal has to be told how big the picture being drawn *right now* is —
      // the nested levels are smaller than the frame buffer.
      const levelScale = scale * shrinkOf(level);
      this.sizeAt(levelScale, _size);
      for (const portal of portals) portal.setResolution(_size);

      for (const portal of active) {
        const target = this.target(portal, level, scale, !presenting);
        const viewCamera = this.prepareCamera(portal, level, camera, xrCamera, levelScale);
        renderer.setRenderTarget(target);
        renderer.render(scene, viewCamera);
      }
    }

    for (const portal of active) portal.setView(this.target(portal, 0, scale, !presenting).texture);
    // Back to the frame buffer the player actually looks at.
    for (const portal of portals) portal.setResolution(this.size);

    renderer.setRenderTarget(previousTarget);
    renderer.xr.enabled = previousXrEnabled;
  }

  dispose(): void {
    for (const levels of this.targets.values()) {
      for (const target of levels) target.dispose();
    }
    this.targets.clear();
    this.chains.clear();
  }

  /**
   * `traversal[level]` for every portal: stepping through the same portal once
   * more for every level. That repetition *is* the recursion — two portals
   * facing each other show a corridor, and every further level is one more
   * room down it.
   */
  private buildChains(active: Portal[], depth: number): void {
    for (const portal of active) {
      let chain = this.chains.get(portal);
      if (!chain) {
        chain = [];
        this.chains.set(portal, chain);
      }
      while (chain.length < depth) chain.push(new THREE.Matrix4());
      portal.getTraversalMatrix(chain[0]!);
      for (let level = 1; level < depth; level++) {
        chain[level]!.multiplyMatrices(chain[0]!, chain[level - 1]!);
      }
    }
  }

  /** Frees the targets of levels (and portals) that are not drawn any more. */
  private trim(depth: number, active: readonly Portal[]): void {
    for (const [portal, levels] of [...this.targets]) {
      const keep = active.includes(portal) ? depth : 0;
      if (levels.length <= keep) continue;
      for (const target of levels.splice(keep)) target.dispose();
      if (levels.length === 0) this.targets.delete(portal);
    }
  }

  /** The frame buffer at a given render scale, in whole pixels. */
  private sizeAt(scale: number, target: THREE.Vector2): THREE.Vector2 {
    return target.set(
      Math.max(2, Math.floor(this.size.x * scale)),
      Math.max(2, Math.floor(this.size.y * scale)),
    );
  }

  private target(
    portal: Portal,
    level: number,
    scale: number,
    multisample: boolean,
  ): THREE.WebGLRenderTarget {
    let levels = this.targets.get(portal);
    if (!levels) {
      levels = [];
      this.targets.set(portal, levels);
    }

    this.sizeAt(scale * shrinkOf(level), _targetSize);
    const width = _targetSize.x;
    const height = _targetSize.y;
    const existing = levels[level];
    const samples = multisample ? 4 : 0;
    if (
      existing &&
      existing.width === width &&
      existing.height === height &&
      existing.samples === samples
    ) {
      return existing;
    }
    existing?.dispose();

    const target = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: false,
      samples,
    });
    target.texture.minFilter = THREE.LinearFilter;
    target.texture.magFilter = THREE.LinearFilter;
    target.texture.generateMipmaps = false;
    levels[level] = target;
    return target;
  }

  private prepareCamera(
    portal: Portal,
    level: number,
    camera: THREE.PerspectiveCamera,
    xrCamera: THREE.ArrayCamera | null,
    scale: number,
  ): THREE.Camera {
    // However deep the view sits, the virtual camera always ends up in front
    // of the partner portal — that is the plane the near plane is laid onto.
    const link = portal.link!;
    const traversal = this.chains.get(portal)![level]!;

    if (!xrCamera) {
      camera.updateWorldMatrix(true, false);
      this.mono.matrixWorld.multiplyMatrices(traversal, camera.matrixWorld);
      this.mono.matrixWorldInverse.copy(this.mono.matrixWorld).invert();
      this.mono.projectionMatrix.copy(camera.projectionMatrix);
      // Portal views also show the player's own head — but never the HUD,
      // which belongs on the glass in front of *this* eye and nowhere else.
      this.mono.layers.mask = viewLayers(camera.layers.mask);
      applyObliqueNearPlane(this.mono, link);
      this.mono.projectionMatrixInverse.copy(this.mono.projectionMatrix).invert();
      return this.mono;
    }

    this.syncEyes(xrCamera);

    this.array.matrixWorld.multiplyMatrices(traversal, xrCamera.matrixWorld);
    this.array.matrixWorldInverse.copy(this.array.matrixWorld).invert();
    // Only used for frustum culling — the union frustum of both eyes.
    this.array.projectionMatrix.copy(xrCamera.projectionMatrix);
    this.array.projectionMatrixInverse.copy(xrCamera.projectionMatrixInverse);

    for (let i = 0; i < xrCamera.cameras.length; i++) {
      const source = xrCamera.cameras[i]!;
      const eye = this.array.cameras[i]!;
      eye.matrixWorld.multiplyMatrices(traversal, source.matrixWorld);
      eye.matrixWorldInverse.copy(eye.matrixWorld).invert();
      eye.projectionMatrix.copy(source.projectionMatrix);
      applyObliqueNearPlane(eye, link);
      eye.projectionMatrixInverse.copy(eye.projectionMatrix).invert();
      const viewport = source.viewport;
      if (viewport) {
        eye.viewport!.set(
          Math.floor(viewport.x * scale),
          Math.floor(viewport.y * scale),
          Math.floor(viewport.z * scale),
          Math.floor(viewport.w * scale),
        );
      }
      eye.layers.mask = viewLayers(source.layers.mask);
    }

    return this.array;
  }

  /** Mirrors the eye setup of the XR camera onto our virtual array camera. */
  private syncEyes(xrCamera: THREE.ArrayCamera): void {
    while (this.array.cameras.length > xrCamera.cameras.length) this.array.cameras.pop();
    while (this.array.cameras.length < xrCamera.cameras.length) {
      const eye = new THREE.PerspectiveCamera();
      eye.matrixAutoUpdate = false;
      eye.matrixWorldAutoUpdate = false;
      eye.viewport = new THREE.Vector4();
      this.array.cameras.push(eye);
    }
    this.array.layers.mask = viewLayers(xrCamera.layers.mask);
  }
}

/** How much of the frame buffer one level of nesting is drawn at. */
function shrinkOf(level: number): number {
  return Math.max(MIN_LEVEL_SCALE, LEVEL_SCALE ** level);
}

/** What a portal view draws: the player's own body in, the HUD out. */
function viewLayers(mask: number): number {
  return (mask | (1 << LAYER_SELF_ONLY)) & ~(1 << LAYER_HUD);
}

/**
 * Pulls the near plane of the projection onto the destination portal, so that
 * nothing between the virtual camera and the portal leaks into the view.
 * (Lengyel's oblique near-plane clipping, as used by three's Reflector.)
 */
function applyObliqueNearPlane(camera: THREE.PerspectiveCamera, destination: Portal): void {
  destination.getWorldNormal(_normal);
  destination.getWorldPosition(_point);
  _plane.setFromNormalAndCoplanarPoint(_normal, _point);
  _plane.applyMatrix4(camera.matrixWorldInverse);

  // Degenerate when the camera sits right on the plane — keep it as is.
  if (Math.abs(_plane.constant) < 0.02) return;

  _clip.set(_plane.normal.x, _plane.normal.y, _plane.normal.z, _plane.constant);

  const p = camera.projectionMatrix.elements;
  _q.set(
    (Math.sign(_clip.x) + p[8]!) / p[0]!,
    (Math.sign(_clip.y) + p[9]!) / p[5]!,
    -1,
    (1 + p[10]!) / p[14]!,
  );

  const denominator = _clip.dot(_q);
  if (Math.abs(denominator) < 1e-6) return;
  _clip.multiplyScalar(2 / denominator);

  p[2] = _clip.x;
  p[6] = _clip.y;
  p[10] = _clip.z + 1;
  p[14] = _clip.w;
}
