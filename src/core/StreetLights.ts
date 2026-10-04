import * as THREE from 'three';
import { denyShadow } from './graphicsScene';
import { denyOutline } from './outlineShell';
import {
  signalLit,
  streetLightModel,
  walkGreen,
  type LampKind,
  type StreetLightModel,
} from './streetLightSpots';

/** Wie viele Leuchten und Lichtflecken höchstens — die große Stadt hat gut hundert Masten. */
const MAX_GLOWS = 1024;
const MAX_POOLS = 384;
/** Wie oft die Szene nach Laternen und Ampeln abgesucht wird, in Sekunden. */
const RESCAN = 1;
/** Wie hoch über dem Fuß des Masts der Lichtfleck liegt: gegen Flimmern mit dem Boden. */
const LIFT = 0.03;

/** Wie groß ein Schein ist, als Anteil der Höhe des Masts. */
const GLOW_SIZE: Readonly<Record<LampKind, number>> = {
  lamp: 0.5,
  lantern: 0.55,
  red: 0.15,
  yellow: 0.15,
  green: 0.15,
  walk: 0.11,
};
/** Die Farben, linear und heller als 1 — die Nacht im Wetter lässt Helles hell. */
const GLOW_COLOR: Readonly<Record<LampKind | 'walkRed', readonly [number, number, number]>> = {
  lamp: [3.2, 2.0, 0.85],
  lantern: [3.4, 1.6, 0.45],
  red: [3.4, 0.18, 0.1],
  yellow: [3.2, 1.7, 0.12],
  green: [0.2, 2.8, 0.9],
  walk: [0.2, 2.4, 0.8],
  walkRed: [2.8, 0.2, 0.1],
};
/** Der Fleck unter einer Laterne: Halbmesser als Anteil der Masthöhe, und seine Farbe. */
const POOL_RADIUS = 0.5;
const POOL_COLOR = new THREE.Color(0.95, 0.56, 0.2);

interface Holder {
  object: THREE.Object3D;
  model: StreetLightModel;
  /** Der Kasten des Modells in seinem eigenen Raum. */
  box: THREE.Box3;
}

const _inverse = new THREE.Matrix4();
const _matrix = new THREE.Matrix4();
const _box = new THREE.Box3();
const _point = new THREE.Vector3();
const _base = new THREE.Vector3();
const _top = new THREE.Vector3();
const _facing = new THREE.Vector3();
const _poolAt = new THREE.Vector3();
const _quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const _scale = new THREE.Vector3();
const _size = new THREE.Vector2();

const glowVertex = /* glsl */ `
attribute float size;
attribute vec3 glow;
uniform float pixels;
varying vec3 vGlow;
void main() {
  vGlow = glow;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  // Ein Stück zur Kamera hin: Die Leuchte sitzt im Gehäuse oder im Glas der
  // alten Laterne, und das verdeckte den Schein sonst.
  mv.xyz += normalize(-mv.xyz) * size * 0.5;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = size * projectionMatrix[1][1] * pixels / max(0.1, -mv.z);
}
`;

const glowFragment = /* glsl */ `
varying vec3 vGlow;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d >= 1.0) discard;
  // Ein heller Kern und ein weicher Hof darum.
  float halo = pow(1.0 - d, 2.2);
  float core = smoothstep(0.32, 0.0, d);
  gl_FragColor = vec4(vGlow * (halo * 0.55 + core), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * **Laternen und Ampeln leuchten** — automatisch am Abend und in der Nacht
 * (`weather.streetLightsLit`), auf Wunsch immer oder nie.
 *
 * Gewünscht: _„bei den Laternen das entsprechend einstellen, dass diese bei
 * Tageszeit automatisch leuchten. Die Laternen und Ampeln sollen alle ein
 * Licht haben können."_ Die Modelle aus dem Regal wissen davon nichts, und
 * keine Welt muss es wissen: Wie die Schatten-Kreise (`BlobShadows.ts`) läuft
 * dies über die ganze Szene und findet die sechs Dateien an ihrem Namen
 * (`streetLightSpots.streetLightModel`) — in der Stadt, im Weltbau, überall,
 * wo jemand eine Laterne hinstellt.
 *
 * **Keine echten Lichter.** Eine Lampe in three.js kostet in jedem Material
 * jedes Bildpunkts, und eine Stadt hat über hundert. Stattdessen zwei
 * Zeichenaufrufe für alles: ein **Schein** an jeder Leuchte (`THREE.Points`
 * mit eigener Größe und Farbe je Punkt, additiv) und ein **Lichtfleck** auf dem
 * Boden unter jeder Laterne (`InstancedMesh`, additiv). Die Ampeln schalten
 * Grün, Gelb, Rot durch, die quer stehenden einen halben Umlauf versetzt.
 */
export class StreetLights {
  private readonly glows: THREE.Points;
  private readonly glowPositions = new Float32Array(MAX_GLOWS * 3);
  private readonly glowColors = new Float32Array(MAX_GLOWS * 3);
  private readonly glowSizes = new Float32Array(MAX_GLOWS);
  private readonly pools: THREE.InstancedMesh;
  private readonly poolTexture: THREE.Texture;
  private readonly holders: Holder[] = [];
  private readonly boxes = new WeakMap<THREE.Object3D, THREE.Box3>();
  private since = Number.POSITIVE_INFINITY;
  private time = 0;
  private enabled = false;

  constructor(private readonly scene: THREE.Scene) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.glowPositions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute(
      'glow',
      new THREE.BufferAttribute(this.glowColors, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute(
      'size',
      new THREE.BufferAttribute(this.glowSizes, 1).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setDrawRange(0, 0);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: { pixels: { value: 400 } },
      vertexShader: glowVertex,
      fragmentShader: glowFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.glows = new THREE.Points(geometry, glowMaterial);
    this.glows.name = 'street-light-glows';
    this.glows.frustumCulled = false;
    this.glows.renderOrder = 3;
    // Die Punktgröße rechnet in Bildpunkten: halbe Höhe des Zeichenpuffers.
    this.glows.onBeforeRender = (renderer) => {
      renderer.getDrawingBufferSize(_size);
      glowMaterial.uniforms['pixels']!.value = _size.y * 0.5;
    };

    this.poolTexture = poolTexture();
    const poolMaterial = new THREE.MeshBasicMaterial({
      map: this.poolTexture,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2), poolMaterial, MAX_POOLS);
    this.pools.name = 'street-light-pools';
    this.pools.count = 0;
    this.pools.frustumCulled = false;
    this.pools.renderOrder = 2;
    this.pools.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pools.setColorAt(0, POOL_COLOR);

    for (const object of [this.glows, this.pools]) {
      // Kein Ding zum Anfassen: Zeiger, Strahlen und Treffer gehen hindurch.
      object.raycast = () => {};
      denyShadow(object);
      denyOutline(object);
      object.visible = false;
      scene.add(object);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.glows.visible = enabled;
    this.pools.visible = enabled;
    if (enabled) this.since = Number.POSITIVE_INFINITY;
  }

  /** Neue Welt: neue Masten. */
  worldChanged(): void {
    this.holders.length = 0;
    this.since = Number.POSITIVE_INFINITY;
  }

  /** Läuft in jedem Bild. */
  update(dt: number): void {
    if (!this.enabled) return;
    this.time += dt;
    this.since += dt;
    if (this.since >= RESCAN) {
      this.since = 0;
      this.collect();
    }
    let glows = 0;
    let pools = 0;
    for (const holder of this.holders) {
      if (!shown(holder.object, this.scene)) continue;
      const object = holder.object;
      const box = holder.box;
      const world = object.matrixWorld;
      _base.set((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
      _base.applyMatrix4(world);
      _top.set((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
      _top.applyMatrix4(world);
      const height = _top.distanceTo(_base);
      if (height <= 0.01) continue;
      // Wohin die Ampel schaut: Die quer stehenden schalten versetzt.
      _facing.set(0, 0, 1).transformDirection(world);
      const cross = Math.abs(_facing.x) > Math.abs(_facing.z);
      for (const spot of holder.model.spots) {
        _point.set(
          box.min.x + (box.max.x - box.min.x) * spot.x,
          box.min.y + (box.max.y - box.min.y) * spot.y,
          box.min.z + (box.max.z - box.min.z) * spot.z,
        );
        // Vorn vor die Scheibe, damit der Schein nicht im Gehäuse steckt.
        if (spot.z >= 1) _point.z += (box.max.z - box.min.z) * 0.08;
        _point.applyMatrix4(world);
        if (
          (spot.kind === 'lamp' || spot.kind === 'lantern') &&
          holder.model.pool &&
          pools < MAX_POOLS
        ) {
          const radius = height * POOL_RADIUS;
          _poolAt.set(_point.x, _base.y + LIFT, _point.z);
          _matrix.compose(_poolAt, _quat, _scale.set(radius, radius, 1));
          this.pools.setMatrixAt(pools++, _matrix);
        }
        if (glows >= MAX_GLOWS) continue;
        const color =
          spot.kind === 'walk'
            ? GLOW_COLOR[walkGreen(this.time, cross) ? 'walk' : 'walkRed']
            : signalLit(spot.kind, this.time, cross)
              ? GLOW_COLOR[spot.kind]
              : null;
        if (!color) continue;
        this.glowPositions.set([_point.x, _point.y, _point.z], glows * 3);
        this.glowColors.set(color, glows * 3);
        this.glowSizes[glows] = height * GLOW_SIZE[spot.kind];
        glows++;
      }
    }
    const geometry = this.glows.geometry;
    geometry.setDrawRange(0, glows);
    for (const name of ['position', 'glow', 'size']) {
      (geometry.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
    }
    this.pools.count = pools;
    for (let i = 0; i < pools; i++) this.pools.setColorAt(i, POOL_COLOR);
    this.pools.instanceMatrix.needsUpdate = true;
    if (this.pools.instanceColor) this.pools.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    for (const object of [this.glows, this.pools]) {
      object.removeFromParent();
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
    this.poolTexture.dispose();
  }

  private collect(): void {
    this.holders.length = 0;
    this.scene.traverseVisible((object) => {
      const model = object.name ? streetLightModel(object.name) : null;
      if (!model) return;
      const box = this.boxOf(object);
      if (box) this.holders.push({ object, model, box });
    });
  }

  /** Der Kasten des Modells in seinem eigenen Raum — einmal gerechnet je Mast. */
  private boxOf(object: THREE.Object3D): THREE.Box3 | null {
    const known = this.boxes.get(object);
    if (known) return known;
    object.updateWorldMatrix(true, true);
    _inverse.copy(object.matrixWorld).invert();
    const box = new THREE.Box3();
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const geometry = mesh.geometry;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      if (!geometry.boundingBox) return;
      _matrix.multiplyMatrices(_inverse, mesh.matrixWorld);
      box.union(_box.copy(geometry.boundingBox).applyMatrix4(_matrix));
    });
    if (box.isEmpty()) return null;
    this.boxes.set(object, box);
    return box;
  }
}

function shown(object: THREE.Object3D, scene: THREE.Scene): boolean {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (!node.visible) return false;
    if (node === scene) return true;
    node = node.parent;
  }
  return false;
}

/** Der Lichtfleck: hell in der Mitte, weich zum Rand. */
function poolTexture(): THREE.Texture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
      const v = Math.round(Math.pow(1 - THREE.MathUtils.smoothstep(r, 0, 1), 1.6) * 255);
      const i = (y * size + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
