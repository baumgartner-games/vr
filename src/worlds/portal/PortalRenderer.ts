import * as THREE from 'three';
import { usingWebGPU } from '../../core/appRenderer';
import type { Portal } from './Portal';
import { viewLayers } from '../../core/viewLayers';
import {
  XrEyeLoan,
  flipTargetRect,
  gpuViewTarget,
  layeredEyes,
  layeredFrameSize,
} from '../shared/screenViewNodes';
import { DEFAULT_PORTAL_DEPTH, clampPortalDepth } from './portalDepth';
import {
  cropProjection,
  emptyRect,
  fullRect,
  intersectRect,
  pixelRect,
  portalRect,
  unionRect,
  type PixelRect,
  type ViewRect,
} from './portalView';

const _plane = new THREE.Plane();
const _normal = new THREE.Vector3();
const _point = new THREE.Vector3();
const _clip = new THREE.Vector4();
const _q = new THREE.Vector4();
const _size = new THREE.Vector2();
const _targetSize = new THREE.Vector2();
const _chainWorld = new THREE.Matrix4();
const _chainInverse = new THREE.Matrix4();
const _seen: ViewRect = { x0: 1, y0: 1, x1: -1, y1: -1 };
const _clipped: ViewRect = { x0: 1, y0: 1, x1: -1, y1: -1 };
const _full: ViewRect = { x0: -1, y0: -1, x1: 1, y1: 1 };
const _crop: ViewRect = { x0: -1, y0: -1, x1: 1, y1: 1 };
const _eyePort: PixelRect = { x: 0, y: 0, w: 0, h: 0 };
const _pixels: PixelRect = { x: 0, y: 0, w: 0, h: 0 };

/** Ein Auge, aus dem gezeichnet wird: am Schirm die Kamera, in der Brille je Auge eines. */
interface Eye {
  readonly camera: THREE.PerspectiveCamera;
  /** Sein Viewport im Bild, in vollen Pixeln (vor dem Maßstab der Ebene). */
  readonly viewport: PixelRect;
}

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
 * again instead of its idle swirl. Each level is one more pass per portal, so
 * the number is a setting the player owns (`portalDepth.ts`) rather than
 * something baked in here.
 *
 * **Gezeichnet wird nur, was durch das Loch zu sehen ist** (`portalView.ts`,
 * Oktober 2026): je Portal, Ebene und Auge das Rechteck, in dem die Öffnung
 * liegt, als Viewport, und eine Projektion, die genau darauf zugeschnitten
 * ist — three.js sortiert dann mit dem engen Kegel aus. Ein Portal, das man
 * nicht sieht, kostet nichts; eines in der Ferne fast nichts. Die Augen
 * werden dafür einzeln gezeichnet und nicht mehr als `ArrayCamera`: Deren
 * Aussortieren läuft über den gemeinsamen Kegel beider Augen, und der ist
 * für einen Ausschnitt zu breit.
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
  /**
   * Wo jedes Portal auf jeder Ebene in jedem Auge zu sehen ist — leer heißt,
   * diese Sicht wird nicht gezeichnet (`portalView.portalRect`).
   */
  private readonly rects = new Map<Portal, ViewRect[][]>();
  /** Die virtuelle Kamera, aus der gerade gezeichnet wird — eine für alle Sichten. */
  private readonly view = new THREE.PerspectiveCamera();
  /** Die Augen dieses Bildes (`collectEyes`). */
  private readonly eyes: Eye[] = [];
  private readonly size = new THREE.Vector2();
  /** Im neuen Renderer mit Multiview zeichnet die Brille mit ihrer eigenen Kamera. */
  private readonly loan = new XrEyeLoan();

  /** Wie viele Sichten das letzte Bild gezeichnet hat — für die Messstrecke. */
  passes = 0;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.view.matrixAutoUpdate = false;
    this.view.matrixWorldAutoUpdate = false;
  }

  /** Draws the portal views. Call before the main render pass. */
  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, portals: Portal[]): void {
    const renderer = this.renderer;
    const presenting = renderer.xr.isPresenting;
    const xrCamera = presenting ? renderer.xr.getCamera() : null;

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
      // Mit Multiview (nur im neuen Renderer) ist es das Ziel der Brille.
      layeredFrameSize(renderer, xrCamera, this.size);
    } else {
      renderer.getDrawingBufferSize(this.size);
    }

    this.passes = 0;
    const active = portals.filter((portal) => portal.placed && portal.link?.placed);
    if (active.length === 0) {
      for (const portal of portals) portal.setResolution(this.size);
      for (const portal of portals) portal.setView(null);
      this.trim(0, active);
      return;
    }

    // **Erst hier**, und das ist der ganze Unterschied: Ein Portal wird aus
    // einer Kamera gezeichnet, die aus der Weltmatrix seiner Fläche gerechnet
    // wird (`prepareCamera`) — dafür muss der Graph fertig sein, **bevor** der
    // erste Durchgang läuft. Steht aber gar kein Portal, ist dieser Durchlauf
    // ein zweiter über die ganze Szene, den gleich darauf `renderer.render`
    // ohnehin macht: In der Testwelt sind das 6 556 Knoten je Bild umsonst,
    // und die Portalpistole liegt die meiste Zeit gar nicht in der Hand.
    //
    // Erzwungen bleibt er, weil ein Portal die Szene mitten im Bild in ein
    // Renderziel zeichnet: Was `updateMatrixWorld()` an `matrixWorldNeedsUpdate`
    // abarbeitet, ist danach abgehakt, und die nächste Sicht bekäme einen
    // Graphen, den niemand mehr nachzieht.
    scene.updateMatrixWorld(true);

    const depth = clampPortalDepth(this.depth);
    this.trim(depth, active);
    this.buildChains(active, depth);
    this.collectEyes(camera, xrCamera);
    this.measure(active, depth);

    const scale = presenting ? this.vrResolutionScale : 1;

    const previousTarget = renderer.getRenderTarget();
    const previousXrEnabled = renderer.xr.enabled;
    renderer.xr.enabled = false;

    // **Im neuen Renderer** (`shared/screenViewNodes.ts`): Die Schere schaltet
    // er nicht am Ziel ein, sondern am Renderer. Und mit Multiview zeichnet
    // jede Sicht beide Augen auf einmal, in ein Ziel mit zwei Ebenen und mit
    // der geliehenen Brillenkamera (`prepareLayered`).
    const gpu = usingWebGPU();
    const previousScissor = gpu && renderer.getScissorTest();
    if (gpu) renderer.setScissorTest(true);
    const layered = gpu && layeredEyes(xrCamera);
    if (layered) this.loan.borrow(xrCamera!);
    const layers = layered ? 2 : 1;
    try {
      this.renderLevels(scene, portals, active, depth, scale, presenting, gpu, layers);
    } finally {
      this.loan.restore();
      if (gpu) renderer.setScissorTest(previousScissor);
      renderer.setRenderTarget(previousTarget);
      renderer.xr.enabled = previousXrEnabled;
    }
  }

  /** Die Sichten aller Ebenen, die tiefste zuerst. */
  private renderLevels(
    scene: THREE.Scene,
    portals: Portal[],
    active: Portal[],
    depth: number,
    scale: number,
    presenting: boolean,
    gpu: boolean,
    layers: number,
  ): void {
    const renderer = this.renderer;
    // Deepest level first: a level is drawn with the level below it already in
    // the portals, and the last one drawn is the one the player looks at.
    for (let level = depth - 1; level >= 0; level--) {
      const inner = level + 1;
      for (const portal of active) {
        portal.setView(
          inner < depth ? this.target(portal, inner, scale, !presenting, layers).texture : null,
        );
      }
      // A portal surface looks its own image up by screen position, so every
      // portal has to be told how big the picture being drawn *right now* is —
      // the nested levels are smaller than the frame buffer.
      const levelScale = scale * shrinkOf(level);
      this.sizeAt(levelScale, _size);
      for (const portal of portals) portal.setResolution(_size);

      for (const portal of active) {
        const rects = this.rects.get(portal)![level]!;
        if (rects.every(emptyRect)) continue;
        const target = this.target(portal, level, scale, !presenting, layers);
        if (layers > 1) {
          if (!this.prepareLayered(portal, level, rects, levelScale)) continue;
          target.viewport.set(_pixels.x, _pixels.y, _pixels.w, _pixels.h);
          target.scissor.set(_pixels.x, _pixels.y, _pixels.w, _pixels.h);
          flipTargetRect(target);
          renderer.setRenderTarget(target);
          renderer.render(scene, this.loan.camera!);
          this.passes++;
          continue;
        }
        for (let eye = 0; eye < this.eyes.length; eye++) {
          const rect = rects[eye]!;
          if (emptyRect(rect)) continue;
          const view = this.prepareView(portal, level, this.eyes[eye]!, rect, levelScale);
          if (!view) continue;
          // Nur der Ausschnitt: Viewport und Schere, und `clear` hält sich
          // auch daran — der Rest des Ziels bleibt, wie er war, und wird
          // nirgends gezeigt.
          target.viewport.set(_pixels.x, _pixels.y, _pixels.w, _pixels.h);
          target.scissor.set(_pixels.x, _pixels.y, _pixels.w, _pixels.h);
          target.scissorTest = true;
          if (gpu) flipTargetRect(target);
          renderer.setRenderTarget(target);
          renderer.render(scene, view);
          this.passes++;
        }
      }
    }

    for (const portal of active) {
      portal.setView(this.target(portal, 0, scale, !presenting, layers).texture);
    }
    // Back to the frame buffer the player actually looks at.
    for (const portal of portals) portal.setResolution(this.size);
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
    layers = 1,
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
      existing.samples === samples &&
      existing.depth === layers
    ) {
      return existing;
    }
    existing?.dispose();

    if (usingWebGPU()) {
      const gpuTarget = gpuViewTarget(width, height, samples, layers);
      levels[level] = gpuTarget;
      return gpuTarget;
    }

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

  /**
   * **Die Augen dieses Bildes**: am Schirm die eine Kamera über das ganze
   * Bild, in der Brille jedes Auge mit seinem Viewport.
   */
  private collectEyes(camera: THREE.PerspectiveCamera, xrCamera: THREE.ArrayCamera | null): void {
    this.eyes.length = 0;
    if (xrCamera && xrCamera.cameras.length > 0) {
      for (const source of xrCamera.cameras) {
        const viewport = source.viewport;
        if (!viewport) continue;
        this.eyes.push({
          camera: source,
          viewport: { x: viewport.x, y: viewport.y, w: viewport.z, h: viewport.w },
        });
      }
      return;
    }
    camera.updateWorldMatrix(true, false);
    this.eyes.push({ camera, viewport: { x: 0, y: 0, w: this.size.x, h: this.size.y } });
  }

  /**
   * **Wo jedes Portal auf jeder Ebene zu sehen ist** — je Auge ein Rechteck.
   *
   * Ebene 0 ist die Öffnung, wie das Auge sie sieht. Das Bild einer tieferen
   * Ebene `k` liegt auf einem Portal, wie es in einer Sicht der Ebene `k − 1`
   * erscheint, und nur, soweit diese Sicht selbst zu sehen ist: Projektion
   * durch die Kamera jener Sicht, geschnitten mit deren Rechteck, vereinigt
   * über alle Portale. Ist es nirgends zu sehen, bleibt das Rechteck leer und
   * die Sicht ungezeichnet.
   */
  private measure(active: readonly Portal[], depth: number): void {
    const eyes = this.eyes;
    for (const portal of active) {
      let levels = this.rects.get(portal);
      if (!levels) {
        levels = [];
        this.rects.set(portal, levels);
      }
      while (levels.length < depth) levels.push([]);
      for (const level of levels) {
        while (level.length < eyes.length) level.push({ x0: 1, y0: 1, x1: -1, y1: -1 });
      }
    }
    for (let level = 0; level < depth; level++) {
      for (const portal of active) {
        portal.updateMatrixWorld();
        const rects = this.rects.get(portal)![level]!;
        for (let eye = 0; eye < eyes.length; eye++) {
          const out = rects[eye]!;
          out.x0 = out.y0 = 1;
          out.x1 = out.y1 = -1;
          const camera = eyes[eye]!.camera;
          if (level === 0) {
            portalRect(
              portal.matrixWorld,
              camera.matrixWorld,
              camera.matrixWorldInverse,
              camera.projectionMatrix,
              _seen,
            );
            intersectRect(_seen, fullRect(_full), out);
            continue;
          }
          for (const through of active) {
            const before = this.rects.get(through)![level - 1]![eye]!;
            if (emptyRect(before)) continue;
            _chainWorld.multiplyMatrices(this.chains.get(through)![level - 1]!, camera.matrixWorld);
            _chainInverse.copy(_chainWorld).invert();
            portalRect(
              portal.matrixWorld,
              _chainWorld,
              _chainInverse,
              camera.projectionMatrix,
              _seen,
            );
            unionRect(out, intersectRect(_seen, before, _clipped));
          }
        }
      }
    }
  }

  /**
   * **Eine Sicht für beide Augen auf einmal** — der neue Renderer mit
   * Multiview. Beide Ebenen des Ziels teilen sich einen Viewport, also wird
   * der Ausschnitt die Vereinigung der Rechtecke beider Augen, und jedes Auge
   * bekommt seine Projektion auf genau diesen Ausschnitt zugeschnitten.
   * Gezeichnet wird mit der geliehenen Brillenkamera (`XrEyeLoan`), der
   * Viewport steht danach in `_pixels`. `false`, wenn nichts zu sehen ist.
   */
  private prepareLayered(
    portal: Portal,
    level: number,
    rects: readonly ViewRect[],
    scale: number,
  ): boolean {
    const loan = this.loan;
    const camera = loan.camera;
    if (!camera) return false;
    _crop.x0 = _crop.y0 = 1;
    _crop.x1 = _crop.y1 = -1;
    for (const rect of rects) unionRect(_crop, rect);
    if (emptyRect(_crop)) return false;
    // Beide Augen zeichnen über ihre ganze Ebene (`layeredFrameSize`).
    _eyePort.x = 0;
    _eyePort.y = 0;
    _eyePort.w = Math.floor(this.size.x * scale);
    _eyePort.h = Math.floor(this.size.y * scale);
    pixelRect(_crop, _eyePort, _pixels);
    if (_pixels.w <= 0 || _pixels.h <= 0) return false;

    const link = portal.link!;
    const traversal = this.chains.get(portal)![level]!;
    camera.matrixWorld.multiplyMatrices(traversal, loan.world);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    camera.layers.mask = viewLayers(loan.layers);
    for (let i = 0; i < camera.cameras.length; i++) {
      const eye = camera.cameras[i]!;
      const source = loan.eyes[i]!;
      eye.matrixWorld.multiplyMatrices(traversal, source.world);
      eye.matrixWorldInverse.copy(eye.matrixWorld).invert();
      eye.projectionMatrix.copy(source.projection);
      eye.layers.mask = viewLayers(source.layers);
      applyObliqueNearPlane(eye, link);
      cropProjection(eye.projectionMatrix, _crop);
      eye.projectionMatrixInverse.copy(eye.projectionMatrix).invert();
    }
    return true;
  }

  /**
   * **Die Kamera einer Sicht** — durch das Portal versetzt, die Nahebene auf
   * dem Partner, die Projektion auf den Ausschnitt `rect` zugeschnitten. Der
   * Viewport dazu steht danach in `_pixels`. `null`, wenn der Ausschnitt
   * nach dem Runden auf Pixel nichts mehr enthält.
   */
  private prepareView(
    portal: Portal,
    level: number,
    eye: Eye,
    rect: ViewRect,
    scale: number,
  ): THREE.PerspectiveCamera | null {
    // However deep the view sits, the virtual camera always ends up in front
    // of the partner portal — that is the plane the near plane is laid onto.
    const link = portal.link!;
    const traversal = this.chains.get(portal)![level]!;
    const source = eye.camera;

    _eyePort.x = Math.floor(eye.viewport.x * scale);
    _eyePort.y = Math.floor(eye.viewport.y * scale);
    _eyePort.w = Math.floor(eye.viewport.w * scale);
    _eyePort.h = Math.floor(eye.viewport.h * scale);
    _crop.x0 = rect.x0;
    _crop.y0 = rect.y0;
    _crop.x1 = rect.x1;
    _crop.y1 = rect.y1;
    pixelRect(_crop, _eyePort, _pixels);
    if (_pixels.w <= 0 || _pixels.h <= 0) return null;

    const view = this.view;
    view.matrixWorld.multiplyMatrices(traversal, source.matrixWorld);
    view.matrixWorldInverse.copy(view.matrixWorld).invert();
    view.projectionMatrix.copy(source.projectionMatrix);
    // Portal views also show the player's own head — but never the HUD,
    // which belongs on the glass in front of *this* eye and nowhere else.
    view.layers.mask = viewLayers(source.layers.mask);
    applyObliqueNearPlane(view, link);
    // Erst schräg, dann zugeschnitten: Die Nahebene rechnet mit der Form
    // einer gewöhnlichen Projektion, der Zuschnitt lässt die Tiefe in Ruhe.
    cropProjection(view.projectionMatrix, _crop);
    view.projectionMatrixInverse.copy(view.projectionMatrix).invert();
    return view;
  }
}

/** How much of the frame buffer one level of nesting is drawn at. */
function shrinkOf(level: number): number {
  return Math.max(MIN_LEVEL_SCALE, LEVEL_SCALE ** level);
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
