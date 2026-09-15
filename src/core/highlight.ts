import * as THREE from 'three';
import { denyOutline, ensureOutlineNormals, isOutline } from './outlineShell';

/**
 * **Der gelbe Saum um das, was `A` gerade meint.**
 *
 * Von oben und aus den Augen steht die Figur irgendwo, und irgendwo davor
 * steht ein Knopf, ein Hebel, eine Tür oder ein Kart. Welches davon gemeint
 * ist, rechnet `core/usable.pickUsable` jedes Bild aus — und diese Datei sagt
 * es dem Spieler, bevor er drückt. Ohne sie ist die Auswahl eine Vermutung:
 * Man drückt und sieht dann, was passiert ist.
 *
 * **Gemacht wird das wie der Comic-Saum** (`core/outlineShell.ts`): Das Ding
 * wird ein zweites Mal gezeichnet, ein wenig aufgeblasen und mit den
 * **Rückseiten** nach vorn. Was übersteht, ist der Saum. Kein
 * Nachbearbeitungsschritt, kein Zwischenpuffer — beides gibt eine
 * WebXR-Sitzung nicht her —, und beide Augen sehen dasselbe.
 *
 * **Dem schwarzen Saum kommt er dabei nicht in die Quere.** Er trägt eine
 * eigene Marke (`bgvrHighlight` statt `bgvrOutline`), hat sein eigenes
 * Material, wirft keinen Schatten, fängt keinen Strahl und sagt für sich
 * selbst jeden weiteren Saum ab (`denyOutline`) — sonst bekäme der Saum einen
 * Saum, sobald der Comic-Modus das nächste Mal über die Szene läuft. Er ist
 * etwas breiter als der schwarze und wird **nach** ihm gezeichnet
 * (`renderOrder`), damit die Farbe zu sehen ist und nicht die Kante darunter.
 *
 * **Wo es keine Geometrie gibt, liegt ein Ring auf dem Boden.** Ein Usable
 * darf eine leere Gruppe sein — eine Zone, ein Platz, ein Ort, an dem etwas
 * passiert. Eine umgestülpte Hülle von nichts ist nichts; ein Ring darunter
 * ist die Auskunft, die gemeint war.
 */

/** Die Marke, an der ein Saum dieser Sorte zu erkennen ist. */
const MARK = 'bgvrHighlight';

/** Gelb, nicht schwarz: die Farbe aus dem Plan. */
export const HIGHLIGHT_COLOR = 0xffd35a;

/**
 * Breite des Saums als Anteil der halben Bildhöhe — merklich breiter als der
 * Comic-Saum (0,006), sonst verschwände die Farbe in der schwarzen Kante.
 */
const WIDTH = 0.016;

/** Und wie breit er in Metern höchstens wird. */
const MAX_GROW = 0.06;

/**
 * Wie weit der Saum atmet, als Anteil seiner Breite, und wie schnell.
 *
 * Ein Pulsieren ist nicht nötig — der Saum ist auch stehend zu sehen —, aber
 * es beantwortet eine Frage, die sonst offen bleibt: ob das Ding leuchtet,
 * weil man es meint, oder ob es einfach so aussieht.
 */
const PULSE = 0.25;
const PULSE_HZ = 1.6;

/** Wie hoch über dem Boden der Ring liegt, in Metern — gegen das Z-Flimmern. */
const RING_LIFT = 0.02;

/** Der kleinste Ring, den es gibt — dieselbe Großzügigkeit wie `USE_RADIUS`. */
const RING_MIN = 0.4;

const vertexShader = /* glsl */ `
uniform float thickness;
uniform float maxGrow;

attribute vec3 bgvrOutlineNormal;

#include <common>
#include <skinning_pars_vertex>

void main() {
  vec3 objectNormal = bgvrOutlineNormal;
  vec3 transformed = vec3( position );

  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <skinning_vertex>

  vec4 mvPosition = vec4( transformed, 1.0 );
  vec3 growNormal = objectNormal;

  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
    growNormal = mat3( instanceMatrix ) * growNormal;
  #endif

  mvPosition = modelViewMatrix * mvPosition;
  growNormal = normalize( normalMatrix * growNormal );

  // Wie beim schwarzen Saum: Der Betrag wächst mit der Entfernung, damit die
  // Kante auf dem Bildschirm gleich breit bleibt — gedeckelt, damit ein
  // ferner Knopf kein gelber Klecks wird.
  float distance = max( - mvPosition.z, 0.02 );
  float grow = min( thickness * distance / max( projectionMatrix[1][1], 0.0001 ), maxGrow );
  mvPosition.xyz += growNormal * grow;

  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 diffuse;

#include <common>

void main() {
  gl_FragColor = vec4( diffuse, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Ob dieses Ding selbst ein gelber Saum ist (oder ein Ring darunter). */
export function isHighlight(object: THREE.Object3D): boolean {
  return object.userData[MARK] === true;
}

/**
 * **Die Netze, die einen Saum bekommen** — rein, damit ein Test sie zählen
 * kann.
 *
 * Alles, was unter `object` hängt und wirklich Geometrie hat: Ein Knopf ist
 * eine Gruppe aus Sockel und Kuppel, und nur die Kuppel zu umranden sähe aus
 * wie ein Fehler. Ausgenommen sind Säume aller Art (schwarze wie gelbe — sonst
 * umrandet sich der Saum selbst), Unsichtbares und alles ohne Positionen und
 * Normalen (Linien, Punkte).
 */
export function highlightTargets(object: THREE.Object3D): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  object.traverse((node) => {
    if (isOutline(node) || isHighlight(node)) return;
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible || !mesh.geometry) return;
    if (!mesh.geometry.getAttribute('position')) return;
    found.push(mesh);
  });
  return found;
}

/**
 * **Wie groß der Ring unter einem Ding ist**, in Metern (Halbmesser).
 *
 * Er soll es umfassen und nicht umklammern: die halbe Diagonale seiner
 * Grundfläche plus eine Handbreit, mindestens aber `RING_MIN` — ein Ring von
 * vier Zentimetern um einen Kippschalter sieht aus wie ein Staubkorn.
 */
export function ringRadius(object: THREE.Object3D): number {
  const box = _box.setFromObject(object);
  if (box.isEmpty()) return RING_MIN;
  box.getSize(_size);
  const half = Math.hypot(_size.x, _size.z) / 2;
  return Math.max(RING_MIN, half + 0.1);
}

/**
 * **Wo der Boden unter einem Ding ist**, in Weltmaß.
 *
 * Die Unterkante dessen, was man sieht — und wo es nichts zu sehen gibt, der
 * Ort des Dings selbst. Ein Ring in der Luft wäre eine Auskunft über etwas
 * anderes als den Platz, auf dem man steht.
 */
export function highlightFloor(object: THREE.Object3D): number {
  const box = _box.setFromObject(object);
  if (!box.isEmpty()) return box.min.y;
  return object.getWorldPosition(_at).y;
}

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _at = new THREE.Vector3();

/**
 * **Die Hervorhebung einer Welt** — genau ein Ding leuchtet, oder keines.
 *
 * `highlight(object)` hängt den Saum an, `highlight(null)` nimmt ihn wieder
 * ab; dasselbe Ding zweimal zu nennen kostet nichts. Am Ende der Welt räumt
 * `dispose()` auf — ein Material, das eine Welt beim Verlassen entsorgt,
 * gehört ihr auch.
 */
export class Highlight {
  /** Woran der Ring hängt, wenn es einen braucht (der Baum der Welt). */
  private readonly parent: THREE.Object3D;
  private current: THREE.Object3D | null = null;
  /** Die Hüllen, die gerade hängen — samt ihres Materials zum Aufräumen. */
  private shells: THREE.Mesh[] = [];
  private ring: THREE.Mesh | null = null;
  private elapsed = 0;

  constructor(parent: THREE.Object3D) {
    this.parent = parent;
  }

  /** Was gerade leuchtet — `null`, wenn nichts. */
  get object(): THREE.Object3D | null {
    return this.current;
  }

  /**
   * **Dieses Ding leuchtet jetzt**, und das vorige nicht mehr.
   *
   * @param floorY Wo der Ring liegen soll, falls es einen braucht. Ohne
   *               Angabe die Unterkante des Dings.
   */
  highlight(object: THREE.Object3D | null, floorY?: number): void {
    if (object === this.current) {
      this.placeRing(floorY);
      return;
    }
    this.clear();
    this.current = object;
    if (!object) return;

    const targets = highlightTargets(object);
    for (const mesh of targets) {
      const shell = this.shell(mesh);
      if (shell) this.shells.push(shell);
    }
    // Nichts zu umranden: dann der Ring auf dem Boden.
    if (this.shells.length === 0) this.showRing(object, floorY);
  }

  /**
   * Ein Bild weiter — der Saum atmet. Wer ihn nicht ruft, bekommt einen
   * stehenden, und der ist auch in Ordnung.
   */
  update(dt: number): void {
    if (this.shells.length === 0 && !this.ring) return;
    this.elapsed += dt;
    const pulse = 1 + PULSE * Math.sin(this.elapsed * PULSE_HZ * Math.PI * 2);
    for (const shell of this.shells) {
      const material = shell.material as THREE.ShaderMaterial;
      material.uniforms['thickness']!.value = WIDTH * pulse;
    }
    if (this.ring) {
      const material = this.ring.material as THREE.MeshBasicMaterial;
      material.opacity = 0.55 + 0.25 * (pulse - 1);
    }
  }

  /** Alles ab und alles weg — Weltwechsel, `dispose`. */
  dispose(): void {
    this.clear();
  }

  private clear(): void {
    for (const shell of this.shells) {
      shell.removeFromParent();
      (shell.material as THREE.Material).dispose();
    }
    this.shells.length = 0;
    if (this.ring) {
      this.ring.removeFromParent();
      this.ring.geometry.dispose();
      (this.ring.material as THREE.Material).dispose();
      this.ring = null;
    }
    this.current = null;
    this.elapsed = 0;
  }

  /** Die umgestülpte Hülle eines Netzes — ein Kind davon, wie der Comic-Saum. */
  private shell(mesh: THREE.Mesh): THREE.Mesh | null {
    if (!ensureOutlineNormals(mesh.geometry)) return null;
    const material = new THREE.ShaderMaterial({
      uniforms: {
        thickness: { value: WIDTH },
        maxGrow: { value: MAX_GROW },
        diffuse: { value: new THREE.Color(HIGHLIGHT_COLOR) },
      },
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
    });

    const skinned = mesh as THREE.SkinnedMesh;
    const instanced = mesh as THREE.InstancedMesh;
    let shell: THREE.Mesh;
    if (skinned.isSkinnedMesh) {
      const bound = new THREE.SkinnedMesh(mesh.geometry, material);
      bound.bind(skinned.skeleton, skinned.bindMatrix);
      shell = bound;
    } else if (instanced.isInstancedMesh) {
      const many = new THREE.InstancedMesh(mesh.geometry, material, instanced.count);
      many.instanceMatrix = instanced.instanceMatrix;
      shell = many;
    } else {
      shell = new THREE.Mesh(mesh.geometry, material);
    }

    shell.name = 'highlight';
    shell.userData[MARK] = true;
    // Er ist ein zweites Bild eines Dings und kein Ding: kein Schatten, kein
    // Strahl, und ausdrücklich kein eigener Comic-Saum.
    denyOutline(shell);
    shell.castShadow = false;
    shell.receiveShadow = false;
    shell.frustumCulled = mesh.frustumCulled;
    shell.layers.mask = mesh.layers.mask;
    shell.renderOrder = mesh.renderOrder + 1;
    shell.raycast = () => {};
    mesh.add(shell);
    return shell;
  }

  /** Der flache Ring auf dem Boden — für alles ohne Geometrie. */
  private showRing(object: THREE.Object3D, floorY?: number): void {
    const radius = ringRadius(object);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.82, radius, 40),
      new THREE.MeshBasicMaterial({
        color: HIGHLIGHT_COLOR,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    ring.name = 'highlight-ring';
    ring.userData[MARK] = true;
    denyOutline(ring);
    ring.castShadow = false;
    ring.receiveShadow = false;
    ring.rotation.x = -Math.PI / 2;
    ring.raycast = () => {};
    this.ring = ring;
    this.parent.add(ring);
    this.placeRing(floorY);
  }

  /** Der Ring folgt dem Ding — es könnte ein fahrendes Kart sein. */
  private placeRing(floorY?: number): void {
    const ring = this.ring;
    const object = this.current;
    if (!ring || !object) return;
    object.getWorldPosition(_at);
    const y = floorY ?? highlightFloor(object);
    ring.position.set(_at.x, y + RING_LIFT, _at.z);
  }
}
