import * as THREE from 'three';
import type { VisorBreathRender, VisorBreathStyle } from './graphicsSettings';

/**
 * **Der Beschlag auf dem Visier** — eine zweite Haut über dem Glas des
 * immersiven Helms (`core/selfHelmet.ts`), wie stark gerade, rechnet
 * `core/visorBreath.ts`.
 *
 * Sie liegt **auf dem Netz des Visiers selbst** und nicht als Scheibe vor dem
 * Auge: So sitzt der Beschlag genau dort, wo das Glas ist, krümmt sich mit
 * ihm, und die Schale des Helms bleibt frei. Die Lage auf dem Glas kommt aus
 * der Hülle seiner Geometrie (`uBoxMin`, `uBoxSize`): `x` quer von 0 bis 1,
 * `y` von unten nach oben.
 *
 * - **Ganz flächig** — überall gleich trüb.
 * - **Realistisch** — beginnt unten in der Mitte, über Mund und Nase, wo der
 *   warme Atem auf die kalte Scheibe trifft, und wächst von dort fächer- oder
 *   pilzförmig nach oben und zu den Seiten; nahe am Ursprung dichter, am Rand
 *   ausgefranst. Mit dem Beschlag wächst auch die Fläche.
 * - **Rechnerisch** — ein feines Rauschen in drei Größen, wie winzige
 *   Tröpfchen und Nebel; keine Textur.
 * - **Bild** — dasselbe als einmal gemaltes Bild aus Tröpfchen
 *   (`dropletImage`), das ein- und ausgeblendet wird.
 *
 * Die Farbe ist ein kühles Milchweiß: Die Sicht nach draußen wird matt und
 * diffus, Kontraste verschwimmen. Echte **Lichtstreuung** — Höfe um Lampen und
 * Scheinwerfer — bräuchte einen eigenen Durchgang über das ganze Bild und ist
 * nicht dabei.
 */

const VERTEX = /* glsl */ `
uniform vec3 uBoxMin;
uniform vec3 uBoxSize;
varying vec2 vP;
varying vec3 vL;
void main() {
  vP = (position.xy - uBoxMin.xy) / uBoxSize.xy;
  // Die Körnung im Raum des Glases und nicht in seiner Projektion — sonst zöge
  // sie sich an den gekrümmten Rändern zu Streifen.
  vL = (position - uBoxMin) / uBoxSize.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform float uFog;
uniform float uRealistic;
uniform float uImage;
uniform sampler2D uMap;
varying vec2 vP;
varying vec3 vL;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}
float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y
    ),
    f.z
  );
}

void main() {
  if (uFog <= 0.002) discard;
  vec2 p = clamp(vP, 0.0, 1.0);
  float grain = uImage > 0.5
    ? texture2D(uMap, vL.xy * 1.5).r
    : 0.45 * noise(vL * 70.0) + 0.35 * noise(vL * 22.0) + 0.2 * noise(vL * 6.0);

  float cover = 1.0;
  float density = uFog;
  if (uRealistic > 0.5) {
    // Unten Mitte ist der Ursprung; breiter als hoch — ein Fächer.
    vec2 d = vec2((p.x - 0.5) * 1.15, p.y * 1.35);
    float r = length(d) + 0.14 * (noise(vL * 6.0 + 3.0) - 0.5);
    float reach = mix(0.12, 1.9, uFog);
    cover = 1.0 - smoothstep(reach * 0.55, reach, r);
    density = uFog * mix(1.25, 0.8, clamp(r / max(reach, 0.001), 0.0, 1.0));
  }

  float alpha = clamp(density * cover * mix(0.8, 1.12, grain), 0.0, 0.94);
  vec3 colour = vec3(0.86, 0.9, 0.93) * mix(0.93, 1.06, grain);
  gl_FragColor = vec4(colour, alpha);
}
`;

export interface VisorFog {
  readonly material: THREE.ShaderMaterial;
  /** Die Lage auf dem Glas: aus der Hülle der Geometrie des Visiers. */
  fit(geometry: THREE.BufferGeometry): void;
  set(fog: number, style: VisorBreathStyle, render: VisorBreathRender): void;
  dispose(): void;
}

/** **Die Haut für ein Visier** — je Visier eine, weil jedes seine eigene Hülle hat. */
export function visorFog(): VisorFog {
  let image: THREE.Texture | null = null;
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uFog: { value: 0 },
      uRealistic: { value: 1 },
      uImage: { value: 0 },
      uMap: { value: null },
      uBoxMin: { value: new THREE.Vector3() },
      uBoxSize: { value: new THREE.Vector3(1, 1, 1) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    // Auf dem Glas und nicht darin: ein Hauch vor dem Visier, damit die beiden
    // nicht um dieselbe Tiefe streiten.
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
  });
  material.name = 'visor-fog';
  const uniforms = material.uniforms as Record<string, THREE.IUniform>;

  return {
    material,
    fit(geometry) {
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      (uniforms.uBoxMin!.value as THREE.Vector3).copy(box.min);
      const size = box.getSize(uniforms.uBoxSize!.value as THREE.Vector3);
      size.set(Math.max(size.x, 1e-4), Math.max(size.y, 1e-4), Math.max(size.z, 1e-4));
    },
    set(fog, style, render) {
      uniforms.uFog!.value = Math.min(Math.max(fog, 0), 1);
      uniforms.uRealistic!.value = style === 'realistic' ? 1 : 0;
      const wantImage = render === 'image';
      if (wantImage && !image) image = dropletImage();
      uniforms.uImage!.value = wantImage && image ? 1 : 0;
      uniforms.uMap!.value = wantImage ? image : null;
    },
    dispose() {
      material.dispose();
      image?.dispose();
      image = null;
    },
  };
}

/**
 * **Das Bild aus Tröpfchen** — einmal gemalt, auf einer Leinwand von 512²:
 * ein dunkler Grund, darauf ein paar tausend kleine, weiche Punkte in
 * verschiedenen Größen und Helligkeiten. Gelesen wird nur der Rotkanal als
 * Körnung. Ohne `document` (Jest) gibt es keines; dann bleibt es beim
 * gerechneten Rauschen.
 */
export function dropletImage(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.fillStyle = 'rgb(90,90,90)';
  g.fillRect(0, 0, size, size);
  let seed = 7;
  const random = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 4200; i++) {
    const x = random() * size;
    const y = random() * size;
    const r = 0.6 + random() ** 3 * 5;
    const light = Math.round(150 + random() * 105);
    const dot = g.createRadialGradient(x, y, 0, x, y, r);
    dot.addColorStop(0, `rgba(${light},${light},${light},1)`);
    dot.addColorStop(1, `rgba(${light},${light},${light},0)`);
    g.fillStyle = dot;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.name = 'visor-droplets';
  return texture;
}
