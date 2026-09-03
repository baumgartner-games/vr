import * as THREE from 'three';
import type { Portal } from './Portal';

const _traversal = new THREE.Matrix4();
const _plane = new THREE.Plane();
const _normal = new THREE.Vector3();
const _point = new THREE.Vector3();
const _clip = new THREE.Vector4();
const _q = new THREE.Vector4();

/**
 * Renders the view through each portal into an off-screen target.
 *
 * The target has the same layout as the frame buffer that is currently being
 * drawn (both eyes side by side in VR), so the portal surface can simply look
 * up its own screen position. That keeps the illusion stable in stereo.
 */
export class PortalRenderer {
  /** Render scale of the portal views while in VR. */
  vrResolutionScale = 0.75;

  private readonly targets = new Map<Portal, THREE.WebGLRenderTarget>();
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

    for (const portal of portals) portal.setResolution(this.size);

    const active = portals.filter((portal) => portal.placed && portal.link?.placed);
    if (active.length === 0) {
      for (const portal of portals) portal.setView(null);
      return;
    }

    const scale = presenting ? this.vrResolutionScale : 1;
    const width = Math.max(2, Math.floor(this.size.x * scale));
    const height = Math.max(2, Math.floor(this.size.y * scale));

    const previousTarget = renderer.getRenderTarget();
    const previousXrEnabled = renderer.xr.enabled;
    renderer.xr.enabled = false;

    for (const portal of active) {
      const target = this.getTarget(portal, width, height, !presenting);
      portal.setView(target.texture);
      // Sampling the target we are drawing into would be a feedback loop, so
      // the portal shows its idle swirl inside its own view.
      portal.setSelf(true);

      const viewCamera = this.prepareCamera(portal, camera, xrCamera, scale);
      renderer.setRenderTarget(target);
      renderer.render(scene, viewCamera);

      portal.setSelf(false);
    }

    renderer.setRenderTarget(previousTarget);
    renderer.xr.enabled = previousXrEnabled;
  }

  dispose(): void {
    for (const target of this.targets.values()) target.dispose();
    this.targets.clear();
  }

  private getTarget(
    portal: Portal,
    width: number,
    height: number,
    multisample: boolean,
  ): THREE.WebGLRenderTarget {
    const existing = this.targets.get(portal);
    const samples = multisample ? 4 : 0;
    if (existing && existing.width === width && existing.height === height && existing.samples === samples) {
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
    this.targets.set(portal, target);
    return target;
  }

  private prepareCamera(
    portal: Portal,
    camera: THREE.PerspectiveCamera,
    xrCamera: THREE.ArrayCamera | null,
    scale: number,
  ): THREE.Camera {
    const link = portal.link!;
    portal.getTraversalMatrix(_traversal);

    if (!xrCamera) {
      camera.updateWorldMatrix(true, false);
      this.mono.matrixWorld.multiplyMatrices(_traversal, camera.matrixWorld);
      this.mono.matrixWorldInverse.copy(this.mono.matrixWorld).invert();
      this.mono.projectionMatrix.copy(camera.projectionMatrix);
      applyObliqueNearPlane(this.mono, link);
      this.mono.projectionMatrixInverse.copy(this.mono.projectionMatrix).invert();
      return this.mono;
    }

    this.syncEyes(xrCamera);

    this.array.matrixWorld.multiplyMatrices(_traversal, xrCamera.matrixWorld);
    this.array.matrixWorldInverse.copy(this.array.matrixWorld).invert();
    // Only used for frustum culling — the union frustum of both eyes.
    this.array.projectionMatrix.copy(xrCamera.projectionMatrix);
    this.array.projectionMatrixInverse.copy(xrCamera.projectionMatrixInverse);

    for (let i = 0; i < xrCamera.cameras.length; i++) {
      const source = xrCamera.cameras[i]!;
      const eye = this.array.cameras[i]!;
      eye.matrixWorld.multiplyMatrices(_traversal, source.matrixWorld);
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
      eye.layers.mask = source.layers.mask;
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
    this.array.layers.mask = xrCamera.layers.mask;
  }
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
