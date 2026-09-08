import * as THREE from 'three';
import { mirrorDistance, mirrorMatrix } from './mirrorMath';
import { isScreenSurface, type ScreenSurface } from './screenSurface';
import { viewLayers } from '../../core/viewLayers';

const _plane = new THREE.Plane();
const _normal = new THREE.Vector3();
const _point = new THREE.Vector3();
const _eye = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _clip = new THREE.Vector4();
const _q = new THREE.Vector4();
const _reflect = new THREE.Matrix4();
const _turn = new THREE.Quaternion();
const _worldSize = new THREE.Vector2();
const _passSize = new THREE.Vector2();

/** Wie viele Spiegelflächen es gerade überhaupt gibt. */
let live = 0;

/**
 * Wie schmal ein Spiegel sein darf und trotzdem ein Bild bekommt.
 *
 * Der große Standspiegel liegt im Beutel als **Miniatur** im Fach — dreieinhalb
 * Zentimeter hoch, und sein Glas darin gut ein Zentimeter breit. Ohne diese
 * Grenze zeichnete der Beutel die ganze Welt in jede dieser Briefmarken.
 */
const MIN_WIDTH = 0.1;
/** Weiter weg als das bleibt ein Spiegel blind. */
const MAX_RANGE = 14;
/** Und näher als das steckt das Auge darin — die Rechnung entartet. */
const MIN_DEPTH = 0.02;

/** Wie viele Spiegel gleichzeitig ein Bild bekommen. Siehe `MirrorRenderer`. */
const DEFAULT_BUDGET = 2;
/** A web mirror is a small surface, not another full-resolution 4× MSAA screen. */
const WEB_MAX_SIZE = 768;

/**
 * Die **Spiegelfläche**: ein Rechteck, das zeigt, was vor ihm steht.
 *
 * Sie ist der Portalfläche nachgebaut und samplet ihr Bild genau wie die in
 * **Bildschirmkoordinaten** (`gl_FragCoord`): Das Bild entsteht in einem
 * Ziel, das genauso aufgebaut ist wie der Puffer, in den gerade gezeichnet
 * wird — in VR also beide Augen nebeneinander —, und damit steht das
 * Spiegelbild in der Brille **stereo-richtig**, ohne dass irgendwo eine
 * zweite Rechnung für das zweite Auge steht.
 *
 * Ohne Bild zeigt sie **blindes Glas**: eine dunkle, leicht schimmernde
 * Fläche. Das ist kein Fehlerzustand, sondern der Normalfall an allen Orten,
 * an denen ein Spiegel nur herumliegt — als Miniatur im Beutel, im
 * Werkzeugregal, im Modellbetrachter der Werkzeugseite.
 */
export class MirrorSurface
  extends THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  implements ScreenSurface
{
  /** Erkennungszeichen für `collectMirrors` — wie `isMesh` bei three selbst. */
  readonly isMirrorSurface = true;
  /** Und wie das Portal liest sie ihr Bild in Bildschirmkoordinaten ab. */
  readonly isScreenSurface = true;

  /**
   * Ob die Fläche überhaupt ein Bild bekommen soll.
   *
   * `false` ist **blindes Glas mit Absicht**: Der Handspiegel am Gürtel und
   * der abgeschaltete zeigen dasselbe wie einer, der zu weit weg ist — nur
   * dass hier jemand entschieden hat und nicht die Entfernung. Sichtbar bleibt
   * die Fläche in jedem Fall; ein Rahmen mit einem Loch darin wäre kein
   * ausgeschalteter Spiegel.
   */
  reflecting = true;

  constructor(
    readonly width: number,
    readonly height: number,
    tint = 0xdfe7f2,
  ) {
    super(
      new THREE.PlaneGeometry(width, height),
      new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: null },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uTint: { value: new THREE.Color(tint) },
          uActive: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uTexture;
          uniform vec2 uResolution;
          uniform vec3 uTint;
          uniform float uActive;
          varying vec2 vUv;

          void main() {
            vec3 color;
            if (uActive > 0.5) {
              // Ein Spiegel schluckt etwas Licht — ein Bild, das genauso hell
              // ist wie der Raum daneben, sieht aus wie ein Loch in der Wand.
              color = texture2D(uTexture, gl_FragCoord.xy / uResolution).rgb * uTint * 0.92;
            } else {
              // Blindes Glas: ein flacher Schein von unten links nach oben
              // rechts, damit die Fläche überhaupt als Fläche zu sehen ist.
              float sheen = clamp(vUv.x * 0.45 + vUv.y * 0.55, 0.0, 1.0);
              color = uTint * (0.035 + sheen * 0.075);
            }
            gl_FragColor = vec4(color, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    );
    this.name = 'mirror-surface';
    live += 1;
    // Der Zähler hängt an der **Material-Entsorgung** und nicht an einer
    // eigenen `dispose`-Methode: Spiegel stecken in Werkzeugen und in
    // Beutel-Objekten, und die werden mit `disposeTree`/`disposeToolTree`
    // weggeräumt, die von einer Fläche nichts wissen. Vom Material weiß three
    // dagegen selbst, und es meldet sich hier, egal auf welchem Weg es geht.
    this.material.addEventListener('dispose', this.retire);
  }

  /** Das Bild, das die Fläche zeigt — `null` ist blindes Glas. */
  setView(texture: THREE.Texture | null): void {
    this.material.uniforms.uTexture!.value = texture;
    this.material.uniforms.uActive!.value = texture ? 1 : 0;
  }

  /** Wie groß der Puffer ist, in den die Fläche gerade gezeichnet wird. */
  setResolution(size: THREE.Vector2): void {
    (this.material.uniforms.uResolution!.value as THREE.Vector2).copy(size);
  }

  /** Weltnormale — die +Z-Achse der Fläche, also die Seite mit dem Bild. */
  getWorldNormal(target: THREE.Vector3): THREE.Vector3 {
    this.updateWorldMatrix(true, false);
    const e = this.matrixWorld.elements;
    return target.set(e[8]!, e[9]!, e[10]!).normalize();
  }

  /** Wie breit und hoch die Fläche wirklich im Raum steht. */
  worldSize(target: THREE.Vector2): THREE.Vector2 {
    this.updateWorldMatrix(true, false);
    this.matrixWorld.decompose(_point, _turn, _scale);
    return target.set(this.width * Math.abs(_scale.x), this.height * Math.abs(_scale.y));
  }

  private readonly retire = (): void => {
    if (this.retired) return;
    this.retired = true;
    live -= 1;
  };

  private retired = false;
}

/**
 * Sammelt in **einem** Durchgang die sichtbaren Spiegelflächen und alle
 * Flächen, die ihr Bild in Bildschirmkoordinaten ablesen (`screenSurface.ts`)
 * — die Spiegel selbst und die Portale.
 *
 * Gesucht wird durch den Szenengraphen und nicht in einer Liste, in die sich
 * jede Fläche einträgt: Spiegel stecken in Werkzeugen, in Beutel-Objekten und
 * in Miniaturen davon, und die wandern zwischen Hand, Gürtel, Regal und
 * Papierkorb. Eine Liste, die davon nichts mitbekommt, zeigt irgendwann auf
 * etwas, das längst weg ist. Gezählt wird trotzdem mit (`live`) — solange es
 * gar keinen Spiegel gibt, ist auch das Durchlaufen umsonst.
 */
export function collectMirrors(
  scene: THREE.Object3D,
  mirrors: MirrorSurface[],
  screens: ScreenSurface[] = [],
): MirrorSurface[] {
  mirrors.length = 0;
  screens.length = 0;
  if (live <= 0) return mirrors;
  scene.traverseVisible((object) => {
    if ((object as Partial<MirrorSurface>).isMirrorSurface) mirrors.push(object as MirrorSurface);
    if (isScreenSurface(object)) screens.push(object);
  });
  return mirrors;
}

/**
 * Zeichnet die Spiegelbilder — vor dem Bild, in dem sie zu sehen sind.
 *
 * Das ist derselbe Bau wie beim `PortalRenderer`, mit einem Unterschied, und
 * der steckt in einem Vorzeichen: Ein Portal **versetzt** die Kamera (eine
 * Drehung samt Verschiebung), ein Spiegel **klappt** sie um (`mirrorMath.ts`).
 * Umklappen dreht die Händigkeit, und damit laufen alle Dreiecke im Bild
 * andersherum — deshalb wird für den Durchgang die Aussortierung umgedreht
 * (`CullFaceFront`). Ohne das zeigte der Spiegel jedes Objekt von innen.
 *
 * Es bleibt bei **einer Rückspiegelung**: Was in einem Spiegelbild selbst ein
 * Spiegel ist, zeigt blindes Glas. Zwei Spiegel gegeneinander sind sonst ein
 * unendlicher Gang, und der kostet pro Stufe die ganze Szene noch einmal.
 */
export class MirrorRenderer {
  /** Auflösung der Spiegelbilder in VR, als Anteil des Augenpuffers. */
  vrResolutionScale = 0.7;

  /**
   * Wie viele Spiegel gleichzeitig ein Bild bekommen.
   *
   * Jeder davon ist ein **vollständiger zweiter Durchgang** durch die Szene.
   * Wer einen Handspiegel vor einem Standspiegel hält, sieht beide; wer in
   * einem Saal voller Spiegel steht, sieht die zwei, die sein Blickfeld
   * füllen, und der Rest bleibt Glas.
   */
  budget = DEFAULT_BUDGET;

  private readonly targets = new Map<MirrorSurface, THREE.WebGLRenderTarget>();
  private readonly found: MirrorSurface[] = [];
  private readonly screens: ScreenSurface[] = [];
  private readonly live: MirrorSurface[] = [];
  private readonly mono = new THREE.PerspectiveCamera();
  private readonly array = new THREE.ArrayCamera();
  private readonly size = new THREE.Vector2();
  private readonly frustum = new THREE.Frustum();
  private readonly projectionScreen = new THREE.Matrix4();

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    for (const camera of [this.mono, this.array]) {
      camera.matrixAutoUpdate = false;
      camera.matrixWorldAutoUpdate = false;
    }
  }

  /** Vor dem Hauptdurchgang aufzurufen. */
  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    const mirrors = collectMirrors(scene, this.found, this.screens);
    if (mirrors.length === 0) {
      this.trim(mirrors);
      return;
    }

    const renderer = this.renderer;
    const presenting = renderer.xr.isPresenting;
    const xrCamera = presenting ? renderer.xr.getCamera() : null;

    // Web selection only needs camera and mirror transforms. Actual render
    // passes update the scene themselves; a second full traversal was wasted
    // even when every mirror was behind the viewer.
    if (presenting) scene.updateMatrixWorld(true);
    this.frameSize(xrCamera);

    // Wo das Auge steht, entscheidet, welcher Spiegel überhaupt eines
    // bekommt — und in VR ist das der Kopf zwischen den beiden Augen.
    (xrCamera ?? camera).getWorldPosition(_eye);
    // Keep the established stereo selection in XR. On a flat screen, mirrors
    // behind the viewer used to redraw the whole scene despite being invisible.
    if (!presenting) {
      camera.updateWorldMatrix(true, false);
      this.frustum.setFromProjectionMatrix(
        this.projectionScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
      );
    }
    this.pick(mirrors, _eye, presenting ? null : this.frustum);

    // Erst alle blind, dann zeichnen: Ein Spiegel, der beim Zeichnen des
    // nächsten noch sein Bild von eben trüge, zeigte darin einen Raum aus
    // einer anderen Blickrichtung.
    for (const mirror of mirrors) mirror.setView(null);

    const scale = presenting
      ? this.vrResolutionScale
      : Math.min(1, WEB_MAX_SIZE / Math.max(1, this.size.x, this.size.y));
    // Solange in ein kleineres Ziel gezeichnet wird, ist *das* der Puffer, in
    // dem eine Bildschirmfläche ihre eigene Stelle sucht — auch ein Portal,
    // das im Spiegelbild vorkommt (`screenSurface.ts`).
    this.sizeAt(scale, _passSize);
    for (const screen of this.screens) screen.setResolution(_passSize);

    const previousTarget = renderer.getRenderTarget();
    const previousXrEnabled = renderer.xr.enabled;
    renderer.xr.enabled = false;
    // Das Vorzeichen aus dem Kommentar der Klasse: gespiegelt laufen die
    // Dreiecke andersherum.
    renderer.state.setCullFace(THREE.CullFaceFront);

    for (const mirror of this.live) {
      const target = this.target(mirror, scale);
      renderer.setRenderTarget(target);
      renderer.render(scene, this.prepareCamera(mirror, camera, xrCamera, scale));
    }

    renderer.state.setCullFace(THREE.CullFaceBack);
    renderer.setRenderTarget(previousTarget);
    renderer.xr.enabled = previousXrEnabled;

    for (const mirror of this.live) {
      const target = this.targets.get(mirror);
      if (target) mirror.setView(target.texture);
    }
    // Und zurück auf den Puffer, in den gleich gezeichnet wird — nicht auf das
    // (kleinere) Ziel, in dem das Bild steht: Texturkoordinaten sind auf eins
    // normiert, die Auflösung ist nur der Maßstab dafür.
    for (const screen of this.screens) screen.setResolution(this.size);

    this.trim(mirrors);
  }

  dispose(): void {
    for (const target of this.targets.values()) target.dispose();
    this.targets.clear();
    this.found.length = 0;
    this.screens.length = 0;
    this.live.length = 0;
  }

  /** Wie groß der Puffer ist, in den gleich gezeichnet wird. */
  private frameSize(xrCamera: THREE.ArrayCamera | null): void {
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
      return;
    }
    this.renderer.getDrawingBufferSize(this.size);
  }

  /** Der Augenpuffer bei einem Maßstab, in ganzen Pixeln. */
  private sizeAt(scale: number, target: THREE.Vector2): THREE.Vector2 {
    return target.set(
      Math.max(2, Math.floor(this.size.x * scale)),
      Math.max(2, Math.floor(this.size.y * scale)),
    );
  }

  /**
   * Welche Spiegel ein Bild bekommen: die, die im Blickfeld am meisten Platz
   * einnehmen.
   *
   * Nicht der nächste gewinnt, sondern der **größte am Auge** — Fläche durch
   * Abstand im Quadrat. Ein Handspiegel vor der Nase ist dem Standspiegel drei
   * Meter weiter wichtiger, obwohl er ein Zehntel so groß ist, und genau so
   * hält man ihn ja auch hin.
   */
  private pick(
    mirrors: readonly MirrorSurface[],
    eye: THREE.Vector3,
    frustum: THREE.Frustum | null,
  ): void {
    this.live.length = 0;
    if (this.budget <= 0) return;
    const weights = new Map<MirrorSurface, number>();
    for (const mirror of mirrors) {
      if (!mirror.reflecting) continue;
      mirror.updateWorldMatrix(true, false);
      if (frustum && !frustum.intersectsObject(mirror)) continue;
      const size = mirror.worldSize(_worldSize);
      if (size.x < MIN_WIDTH || size.y < MIN_WIDTH) continue;
      mirror.getWorldNormal(_normal);
      mirror.getWorldPosition(_point);
      const depth = mirrorDistance(_normal, _point, eye);
      // Von hinten sieht man in keinen Spiegel, und mittendrin auch nicht.
      if (depth < MIN_DEPTH) continue;
      const distance = _point.distanceTo(eye);
      if (distance > MAX_RANGE) continue;
      weights.set(mirror, (size.x * size.y) / Math.max(0.04, distance * distance));
      this.live.push(mirror);
    }
    this.live.sort((a, b) => weights.get(b)! - weights.get(a)!);
    this.live.length = Math.min(this.live.length, this.budget);
  }

  /** Vergisst die Ziele der Spiegel, die es nicht mehr gibt. */
  private trim(mirrors: readonly MirrorSurface[]): void {
    for (const [mirror, target] of [...this.targets]) {
      if (mirrors.includes(mirror)) continue;
      target.dispose();
      this.targets.delete(mirror);
    }
  }

  private target(mirror: MirrorSurface, scale: number): THREE.WebGLRenderTarget {
    this.sizeAt(scale, _passSize);
    const width = _passSize.x;
    const height = _passSize.y;
    const samples = 0;
    const existing = this.targets.get(mirror);
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
    this.targets.set(mirror, target);
    return target;
  }

  /**
   * Die umgeklappte Kamera — einäugig am Bildschirm, zweiäugig in der Brille.
   *
   * Die **Projektion bleibt dieselbe** wie die des echten Auges, und das ist
   * kein Zufall: Ein Punkt landet unter `P · (M·C)⁻¹` genau dort, wo sein
   * gespiegeltes Gegenstück unter `P · C⁻¹` landet. Genau deshalb darf die
   * Fläche ihr Bild in Bildschirmkoordinaten ablesen.
   */
  private prepareCamera(
    mirror: MirrorSurface,
    camera: THREE.PerspectiveCamera,
    xrCamera: THREE.ArrayCamera | null,
    scale: number,
  ): THREE.Camera {
    mirror.getWorldNormal(_normal);
    mirror.getWorldPosition(_point);
    mirrorMatrix(_reflect, _normal, _point);

    if (!xrCamera) {
      camera.updateWorldMatrix(true, false);
      this.mono.matrixWorld.multiplyMatrices(_reflect, camera.matrixWorld);
      this.mono.matrixWorldInverse.copy(this.mono.matrixWorld).invert();
      this.mono.projectionMatrix.copy(camera.projectionMatrix);
      this.mono.layers.mask = viewLayers(camera.layers.mask);
      applyObliqueNearPlane(this.mono, _normal, _point);
      this.mono.projectionMatrixInverse.copy(this.mono.projectionMatrix).invert();
      return this.mono;
    }

    this.syncEyes(xrCamera);

    this.array.matrixWorld.multiplyMatrices(_reflect, xrCamera.matrixWorld);
    this.array.matrixWorldInverse.copy(this.array.matrixWorld).invert();
    // Nur fürs Aussortieren ganzer Objekte — der Kegel beider Augen zusammen.
    this.array.projectionMatrix.copy(xrCamera.projectionMatrix);
    this.array.projectionMatrixInverse.copy(xrCamera.projectionMatrixInverse);

    for (let i = 0; i < xrCamera.cameras.length; i++) {
      const source = xrCamera.cameras[i]!;
      const eye = this.array.cameras[i]!;
      eye.matrixWorld.multiplyMatrices(_reflect, source.matrixWorld);
      eye.matrixWorldInverse.copy(eye.matrixWorld).invert();
      eye.projectionMatrix.copy(source.projectionMatrix);
      applyObliqueNearPlane(eye, _normal, _point);
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

  /** Übernimmt die Augenaufteilung der XR-Kamera auf die eigene. */
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

/**
 * Zieht die Nahebene der Projektion auf die **Spiegelebene**.
 *
 * Ohne das stünde die Wand, an der der Spiegel hängt, mitten im Bild: Von der
 * umgeklappten Kamera aus liegt sie **vor** der Fläche. (Lengyels schiefe
 * Nahebene, wie sie auch der Portal-Renderer benutzt.)
 */
function applyObliqueNearPlane(
  camera: THREE.PerspectiveCamera,
  normal: THREE.Vector3,
  point: THREE.Vector3,
): void {
  _plane.setFromNormalAndCoplanarPoint(normal, point);
  _plane.applyMatrix4(camera.matrixWorldInverse);

  // Entartet, wenn die Kamera genau in der Ebene sitzt — dann so lassen.
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
