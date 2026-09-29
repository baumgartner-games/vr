import * as THREE from 'three';
import type { ViewLevel } from './cutaway';

/**
 * **Die Etagen darunter, unscharf** — von oben, sobald man über einer steht.
 *
 * Gewünscht: _„Wenn der Spieler auf einer höheren Ebene steht, dann sieht er ja
 * die unteren Ebenen. Ich denke es wäre gut (bei Ansicht von oben), wenn dann
 * die unteren Ebenen etwas blurry gerendert werden, um den Höhen-/Ebenen-Effekt
 * besser zu zeigen."_ Das Vorbild ist die Tiefenschärfe eines Modellfotos: Was
 * scharf ist, ist die Etage, auf der man steht; was tiefer liegt, verschwimmt,
 * und zwar umso mehr, je tiefer es liegt.
 *
 * **Wie.** Das Bild wird nicht auf den Schirm, sondern in eine Textur mit
 * Tiefenpuffer gezeichnet (`LevelBlur.begin`), und ein Durchgang über den
 * ganzen Schirm (`end`) rechnet für jeden Bildpunkt aus der Tiefe zurück, auf
 * welcher **Höhe in der Welt** er liegt. Liegt er unter dem Boden der eigenen
 * Etage, wird er mit Nachbarn aus einer Scheibe gemischt, deren Größe mit der
 * Tiefe wächst (`levelBlurAmount`). Nachbarn, die selbst scharf sind, zählen
 * nicht mit — sonst zöge die Kante des oberen Bodens einen Schleier über das
 * Stockwerk darunter.
 *
 * **Wann.** Nur von oben, nur am Schirm (die Brille zeichnet ohne Umweg), nur
 * mit Häkchen (`GraphicsSettings.levelBlur`), und nur, wenn es ein Darunter
 * gibt: ab Etage 1 und nicht in der Ansicht _von außen_ (`ViewLevel.whole`),
 * in der man das ganze Haus sehen will und nicht ein Stockwerk. Eine Welt
 * ohne Etagen (`viewLevel` fehlt) zahlt nichts.
 *
 * Getönt wird im Durchgang und nicht in der Textur: three.js zeichnet in ein
 * Ziel linear und ohne Tone Mapping, und die Textur hat halbe Fließkommazahlen,
 * damit die Sonne nicht vor dem Tone Mapping an der 1 abgeschnitten wird.
 */

/** Ab wie viel unter dem eigenen Boden es unscharf wird — die Dicke der Decke darunter. */
export const LEVEL_BLUR_START = 0.25;
/** Wie tief unter dem Boden die volle Unschärfe erreicht ist — ein Stockwerk (`STOREY`). */
export const LEVEL_BLUR_FULL = 2.8;
/** Der größte Halbmesser der Unschärfe, als Anteil der Bildhöhe. */
export const LEVEL_BLUR_RADIUS = 0.009;

/**
 * **Wie unscharf ein Punkt auf Höhe `y` ist**, 0 bis 1 — dieselbe Rampe wie im
 * Shader (`smoothstep`), hier zum Nachrechnen.
 */
export function levelBlurAmount(floorY: number, y: number): number {
  const depth = floorY - y;
  const t = Math.min(
    1,
    Math.max(0, (depth - LEVEL_BLUR_START) / (LEVEL_BLUR_FULL - LEVEL_BLUR_START)),
  );
  return t * t * (3 - 2 * t);
}

/**
 * **Ob in diesem Bild geblurrt wird** — und wenn ja, über welchem Boden.
 * `null` heißt: zeichnen wie immer.
 */
export function levelBlurFloor(
  on: boolean,
  topDown: boolean,
  presenting: boolean,
  view: ViewLevel | null,
): number | null {
  if (!on || !topDown || presenting || !view || view.whole) return null;
  return view.level > 0 ? view.floorY : null;
}

/** Wie viele Nachbarn je Bildpunkt gemischt werden. */
const TAPS = 20;

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform mat4 projectionInverse;
uniform mat4 cameraWorld;
uniform float floorY;
uniform vec2 radius;
varying vec2 vUv;

float heightAt(vec2 uv) {
  float depth = texture2D(tDepth, uv).x;
  vec4 clip = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 view = projectionInverse * clip;
  view /= view.w;
  return (cameraWorld * view).y;
}

float blurAt(vec2 uv) {
  return smoothstep(${LEVEL_BLUR_START.toFixed(3)}, ${LEVEL_BLUR_FULL.toFixed(3)}, floorY - heightAt(uv));
}

void main() {
  vec4 center = texture2D(tColor, vUv);
  float amount = blurAt(vUv);
  vec4 color = center;
  if (amount > 0.01) {
    vec3 sum = center.rgb;
    float weight = 1.0;
    // Eine Scheibe im goldenen Winkel: gleichmäßig verteilt, ohne Muster.
    for (int i = 0; i < ${TAPS}; i++) {
      float f = (float(i) + 0.5) / ${TAPS.toFixed(1)};
      float a = float(i) * 2.39996323;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * sqrt(f) * radius * amount;
      float w = blurAt(uv);
      sum += texture2D(tColor, uv).rgb * w;
      weight += w;
    }
    color.rgb = sum / weight;
  }
  gl_FragColor = color;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class LevelBlur {
  private target: THREE.WebGLRenderTarget | null = null;
  private readonly size = new THREE.Vector2();
  private readonly material = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: null },
      tDepth: { value: null },
      projectionInverse: { value: new THREE.Matrix4() },
      cameraWorld: { value: new THREE.Matrix4() },
      floorY: { value: 0 },
      radius: { value: new THREE.Vector2() },
    },
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  private readonly quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
  private readonly quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  /** Worauf das Bild gerade gezeichnet wird, solange `begin` gilt. */
  private active = false;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.quad.frustumCulled = false;
  }

  /**
   * **Ab hier in die Textur zeichnen.** Gerufen vor allem, was das Bild
   * zeichnet — auch vor den Portalsichten, die ihr Ziel danach selbst
   * zurücksetzen (`getRenderTarget`).
   */
  begin(): void {
    const renderer = this.renderer;
    renderer.getDrawingBufferSize(this.size);
    const width = Math.max(1, Math.floor(this.size.x));
    const height = Math.max(1, Math.floor(this.size.y));
    let target = this.target;
    if (!target) {
      target = new THREE.WebGLRenderTarget(width, height, {
        type: THREE.HalfFloatType,
        samples: 4,
        depthTexture: new THREE.DepthTexture(width, height),
      });
      target.texture.name = 'level-blur';
      this.target = target;
    } else if (target.width !== width || target.height !== height) {
      target.setSize(width, height);
    }
    renderer.setRenderTarget(target);
    this.active = true;
  }

  /** **Und durch den Durchgang auf den Schirm** — `floorY` ist der Boden der eigenen Etage. */
  end(camera: THREE.Camera, floorY: number): void {
    if (!this.active || !this.target) return;
    this.active = false;
    const renderer = this.renderer;
    renderer.setRenderTarget(null);
    const uniforms = this.material.uniforms;
    uniforms['tColor']!.value = this.target.texture;
    uniforms['tDepth']!.value = this.target.depthTexture;
    (uniforms['projectionInverse']!.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (uniforms['cameraWorld']!.value as THREE.Matrix4).copy(camera.matrixWorld);
    uniforms['floorY']!.value = floorY;
    const aspect = this.target.width / Math.max(1, this.target.height);
    (uniforms['radius']!.value as THREE.Vector2).set(LEVEL_BLUR_RADIUS / aspect, LEVEL_BLUR_RADIUS);
    renderer.render(this.quad, this.quadCamera);
  }

  /** Den Speicher der Textur wieder hergeben — wer ausschaltet, zahlt nicht weiter. */
  release(): void {
    if (this.active) this.renderer.setRenderTarget(null);
    this.active = false;
    this.target?.depthTexture?.dispose();
    this.target?.dispose();
    this.target = null;
  }

  dispose(): void {
    this.release();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}
