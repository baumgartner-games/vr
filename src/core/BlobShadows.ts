import * as THREE from 'three';
import { blobLook, blobShadowRadius, followFloor } from './blobShadow';
import { denyShadow } from './graphicsScene';
import { denyOutline } from './outlineShell';

/** Wie viele Kreise höchstens gleichzeitig liegen — mehr Figuren hat keine Welt. */
const MAX_BLOBS = 96;
/** Wie hoch über dem gemerkten Boden der Kreis liegt: gegen Flimmern mit dem Boden. */
const LIFT = 0.018;
/** Wie oft die Szene nach angemeldeten Figuren abgesucht wird, in Sekunden. */
const RESCAN = 0.5;
/** Wie dunkel die Mitte eines Kreises macht (0 = gar nicht, 1 = schwarz). */
const DARKNESS = 0.5;

const _matrix = new THREE.Matrix4();
const _quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

/**
 * **Die Schatten-Kreise** — im Modus _Einfach (Kreis)_ ein weicher runder
 * Fleck unter jeder angemeldeten Figur (`core/blobShadow.ts`).
 *
 * Alle Kreise sind **ein** `InstancedMesh`, also ein Zeichenaufruf für die
 * ganze Welt, mit einer Textur und einem Material. Gezeichnet wird er ohne
 * Tiefenschreiben und mit einer Mischung, die den Boden nur abdunkelt
 * (`Ziel × (1 − Quelle)`): Ein Kreis kann nicht aufhellen, zwei übereinander
 * werden dunkler, und seine Farbe je Kreis ist seine Deckkraft — damit
 * verblasst jeder einzeln, ohne ein Material je Figur.
 *
 * Er hängt an der Szene der App und nicht an einer Welt, wie der Rest der
 * Grafikeinstellung (`GraphicsQuality`).
 */
export class BlobShadows {
  readonly mesh: THREE.InstancedMesh;
  private readonly texture: THREE.Texture;
  private readonly targets: THREE.Object3D[] = [];
  private readonly floors = new WeakMap<THREE.Object3D, number>();
  private since = Number.POSITIVE_INFINITY;
  private enabled = false;

  constructor(private readonly scene: THREE.Scene) {
    this.texture = blobTexture();
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.ZeroFactor,
      blendDst: THREE.OneMinusSrcColorFactor,
      // **Die Deckkraft des Bildes bleibt, wie sie ist.** Ohne diese zwei
      // Zeilen gilt dieselbe Rechnung für den Alphakanal — und der Fleck
      // stanzte ein Loch in die Leinwand, durch das die helle Seite schien.
      blendEquationAlpha: THREE.AddEquation,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2), material, MAX_BLOBS);
    this.mesh.name = 'blob-shadows';
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    // Nach allem Durchsichtigen: Ein Boden, der selbst durchsichtig gezeichnet
    // wird (das Gitter der Testwelt), überdeckte sonst den Kreis.
    this.mesh.renderOrder = 2;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, _color.setScalar(1));
    // Kein Ding zum Anfassen: Zeiger, Strahlen und Treffer gehen hindurch.
    this.mesh.raycast = () => {};
    denyShadow(this.mesh);
    denyOutline(this.mesh);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /** An oder aus — aus heißt: gar nichts zeichnen und nichts suchen. */
  setEnabled(on: boolean): void {
    this.enabled = on;
    this.mesh.visible = on;
    this.since = Number.POSITIVE_INFINITY;
    if (!on) {
      this.targets.length = 0;
      this.mesh.count = 0;
    }
  }

  /** Neue Welt: sofort neu suchen. */
  worldChanged(): void {
    this.since = Number.POSITIVE_INFINITY;
  }

  /** Läuft in jedem Bild. */
  update(dt: number): void {
    if (!this.enabled) return;
    this.since += dt;
    if (this.since >= RESCAN) {
      this.since = 0;
      this.collect();
    }
    let count = 0;
    for (const target of this.targets) {
      if (count >= MAX_BLOBS) break;
      if (!shown(target, this.scene)) continue;
      const radius = blobShadowRadius(target);
      if (radius <= 0) continue;
      target.getWorldPosition(_pos);
      const floor = followFloor(this.floors.get(target) ?? Number.NaN, _pos.y, dt);
      this.floors.set(target, floor);
      const look = blobLook(_pos.y - floor);
      if (look.opacity <= 0.01) continue;
      _pos.y = floor + LIFT;
      const size = radius * look.scale;
      _matrix.compose(_pos, _quat, _scale.set(size, size, 1));
      this.mesh.setMatrixAt(count, _matrix);
      this.mesh.setColorAt(count, _color.setScalar(DARKNESS * look.opacity));
      count++;
    }
    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.texture.dispose();
  }

  private collect(): void {
    this.targets.length = 0;
    this.scene.traverseVisible((object) => {
      if (blobShadowRadius(object) > 0) this.targets.push(object);
    });
  }
}

/** Ob ein Ding gerade in der Szene hängt und mit allen Eltern sichtbar ist. */
function shown(object: THREE.Object3D, scene: THREE.Scene): boolean {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (!node.visible) return false;
    if (node === scene) return true;
    node = node.parent;
  }
  return false;
}

/**
 * Der weiche Fleck: weiß in der Mitte, schwarz am Rand. Weiß heißt hier
 * „dunkelt ab" — die Mischung rechnet `Ziel × (1 − Quelle)`.
 */
function blobTexture(): THREE.Texture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
      // Ein weicher Rand über die äußere Hälfte, innen fast voll.
      const t = THREE.MathUtils.smoothstep(r, 0.35, 1);
      const v = Math.round((1 - t) * 255);
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
