import * as THREE from 'three';
import type { ViewLevel } from './cutaway';
import type { WeatherLook } from './weather';

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
 * mit Häkchen, und nur, wenn es etwas zu verwischen gibt (`levelBlurPlan`):
 *
 * - **Unten** (`GraphicsSettings.levelBlur`, ab Werk an) — sobald man auf
 *   Etage 1 oder höher steht (`ViewLevel.stand`), auch _von außen_
 *   (`ViewLevel.whole`). Die beiden Häkchen sind unabhängig: Gemeldet war
 *   _„blur untere stockwerke klappt anscheinend wieder nicht"_ — von außen, wo
 *   oben verschwamm, blieb unten alles scharf.
 * - **Oben** (`GraphicsSettings.levelBlurAbove`, ab Werk aus) — sobald es über
 *   der eigenen eine Etage gibt (`ViewLevel.aboveY`). Zu sehen ist sie von
 *   oben nur, wo nicht aufgeschnitten wird: draußen im Hausbau oder mit
 *   _⌂ Außen_ in der Ebenen-Leiste. Gewünscht: _„optional als weitere Checkbox
 *   im Grafik-Menü, dass obere Stockwerke auch blurry sein können"_.
 *
 * Eine Welt ohne Etagen (`viewLevel` fehlt) zahlt nichts.
 *
 * **Und das Wetter** (`core/weather.ts`) fährt im selben Durchgang mit:
 * Nebel, Tageszeit und Filter brauchen dieselbe Textur mit Tiefe. Sind Blur
 * und Wetter an, ist es ein Durchgang; ist nur eines an, rechnet der andere
 * Teil nichts.
 *
 * Getönt wird im Durchgang und nicht in der Textur: three.js zeichnet in ein
 * Ziel linear und ohne Tone Mapping, und die Textur hat halbe Fließkommazahlen,
 * damit die Sonne nicht vor dem Tone Mapping an der 1 abgeschnitten wird.
 */

/** Ab wie viel unter dem eigenen Boden es unscharf wird — die Dicke der Decke darunter. */
export const LEVEL_BLUR_START = 0.25;
/** Wie tief unter dem Boden die volle Unschärfe erreicht ist — ein Stockwerk (`STOREY`). */
export const LEVEL_BLUR_FULL = 2.8;
/**
 * **Oben** fängt es 0,6 m unter dem Boden der Etage darüber an —
 * damit ihre Decke schon weich ist — und ist 0,8 m darüber voll: Was oben
 * steht, verdeckt, und soll deshalb schnell zurücktreten.
 */
export const LEVEL_BLUR_ABOVE_START = -0.6;
export const LEVEL_BLUR_ABOVE_FULL = 0.8;
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

/** **Wie unscharf ein Punkt auf Höhe `y` ist**, wenn darüber bei `aboveY` die nächste Etage anfängt. */
export function levelBlurAboveAmount(aboveY: number, y: number): number {
  const t = Math.min(
    1,
    Math.max(
      0,
      (y - aboveY - LEVEL_BLUR_ABOVE_START) / (LEVEL_BLUR_ABOVE_FULL - LEVEL_BLUR_ABOVE_START),
    ),
  );
  return t * t * (3 - 2 * t);
}

/** Was in diesem Bild verwischt wird — unten ab `floorY`, oben ab `aboveY`, je `null` für nichts. */
export interface LevelBlurPlan {
  floorY: number | null;
  aboveY: number | null;
}

/**
 * **Ob in diesem Bild geblurrt wird** — und wenn ja, wo. `null` heißt:
 * zeichnen wie immer.
 */
export function levelBlurPlan(
  below: boolean,
  above: boolean,
  topDown: boolean,
  presenting: boolean,
  view: ViewLevel | null,
): LevelBlurPlan | null {
  if (!topDown || presenting || !view) return null;
  const stand = view.stand ?? view.level;
  const floorY = below && stand > 0 ? view.floorY : null;
  const aboveY = above && view.aboveY !== undefined ? view.aboveY : null;
  return floorY === null && aboveY === null ? null : { floorY, aboveY };
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
uniform float aboveY;
uniform float below;
uniform float above;
uniform vec2 radius;
uniform float weather;
uniform vec3 wLight;
uniform float wKeepBright;
uniform vec3 wFogColor;
uniform float wFogStrength;
uniform float wFogSwirl;
uniform vec4 wFogShape;
uniform float wSaturation;
uniform float wContrast;
uniform vec3 wTint;
uniform float wVignette;
uniform float wTime;
uniform vec3 wPlayer;
varying vec2 vUv;

vec3 worldAt(vec2 uv, float depth) {
  vec4 clip = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 view = projectionInverse * clip;
  view /= view.w;
  return (cameraWorld * view).xyz;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Zwei Lagen Rauschen, die gegeneinander ziehen: Schwaden statt Fläche.
float swirl(vec2 p) {
  float a = noise(p * 0.18 + vec2(wTime * 0.05, wTime * 0.02));
  float b = noise(p * 0.41 - vec2(wTime * 0.03, -wTime * 0.06));
  return a * 0.65 + b * 0.35;
}

vec3 applyWeather(vec3 color, vec2 uv) {
  // Tageszeit: abdunkeln und färben, was nicht selbst leuchtet.
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float keep = wKeepBright * smoothstep(0.75, 2.2, lum);
  color *= mix(wLight, vec3(1.0), keep);

  // Nebel: liegt unten, reißt um die Figur herum auf, wabert.
  if (wFogStrength > 0.0) {
    float depth = texture2D(tDepth, uv).x;
    float amount;
    // wFogShape: klar bis x, voll ab y (m um die Figur), dicht bis z über dem
    // Boden, w liegt unabhängig von der Höhe (\`weather.FOG\`).
    if (depth >= 0.99999) {
      amount = wFogStrength * mix(0.85, 1.0, wFogShape.w);
    } else {
      vec3 p = worldAt(uv, depth);
      float lying = exp(-max(0.0, p.y - wPlayer.y) / wFogShape.z);
      float away = smoothstep(wFogShape.x, wFogShape.y, distance(p.xz, wPlayer.xz));
      float s = mix(1.0, smoothstep(0.2, 0.8, swirl(p.xz)) * 1.5, wFogSwirl);
      amount = wFogStrength * away * clamp(lying * s + wFogShape.w, 0.0, 1.0);
    }
    color = mix(color, wFogColor, clamp(amount, 0.0, 1.0));
  }

  // Filter: Sättigung, Kontrast (um ein mittleres Grau), Tönung.
  float grey = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(grey), color, wSaturation);
  color = max(vec3(0.0), (color - 0.18) * wContrast + 0.18);
  color *= wTint;

  // Vignette: die Ecken dunkler, rund nach Bildhöhe.
  vec2 d = (uv - 0.5) * vec2(radius.y / radius.x, 1.0);
  float v = smoothstep(0.35, 0.95, length(d));
  color *= 1.0 - wVignette * v;
  return color;
}

float heightAt(vec2 uv) {
  return worldAt(uv, texture2D(tDepth, uv).x).y;
}

float blurAt(vec2 uv) {
  float y = heightAt(uv);
  float down = below * smoothstep(${LEVEL_BLUR_START.toFixed(3)}, ${LEVEL_BLUR_FULL.toFixed(3)}, floorY - y);
  float up = above * smoothstep(${LEVEL_BLUR_ABOVE_START.toFixed(3)}, ${LEVEL_BLUR_ABOVE_FULL.toFixed(3)}, y - aboveY);
  return max(down, up);
}

void main() {
  vec4 center = texture2D(tColor, vUv);
  float amount = below + above > 0.0 ? blurAt(vUv) : 0.0;
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
  if (weather > 0.0) color.rgb = applyWeather(color.rgb, vUv);
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
      aboveY: { value: 0 },
      below: { value: 0 },
      above: { value: 0 },
      radius: { value: new THREE.Vector2() },
      weather: { value: 0 },
      wLight: { value: new THREE.Vector3(1, 1, 1) },
      wKeepBright: { value: 0 },
      wFogColor: { value: new THREE.Vector3() },
      wFogStrength: { value: 0 },
      wFogSwirl: { value: 0 },
      wFogShape: { value: new THREE.Vector4(5, 20, 1.6, 0.15) },
      wSaturation: { value: 1 },
      wContrast: { value: 1 },
      wTint: { value: new THREE.Vector3(1, 1, 1) },
      wVignette: { value: 0 },
      wTime: { value: 0 },
      wPlayer: { value: new THREE.Vector3() },
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

  /**
   * **Und durch den Durchgang auf den Schirm** — was verwischt wird, sagt
   * `plan`, welches Wetter liegt, `weather` (`core/weather.ts`); `player` ist
   * der Fußpunkt der Figur, um den der Nebel aufreißt, `time` in Sekunden.
   */
  end(
    camera: THREE.Camera,
    plan: LevelBlurPlan | null,
    weather: WeatherLook | null = null,
    player: THREE.Vector3 | null = null,
    time = 0,
  ): void {
    if (!this.active || !this.target) return;
    this.active = false;
    const renderer = this.renderer;
    renderer.setRenderTarget(null);
    const uniforms = this.material.uniforms;
    uniforms['tColor']!.value = this.target.texture;
    uniforms['tDepth']!.value = this.target.depthTexture;
    (uniforms['projectionInverse']!.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (uniforms['cameraWorld']!.value as THREE.Matrix4).copy(camera.matrixWorld);
    uniforms['floorY']!.value = plan?.floorY ?? 0;
    uniforms['below']!.value = plan?.floorY == null ? 0 : 1;
    uniforms['aboveY']!.value = plan?.aboveY ?? 0;
    uniforms['above']!.value = plan?.aboveY == null ? 0 : 1;
    uniforms['weather']!.value = weather ? 1 : 0;
    if (weather) {
      (uniforms['wLight']!.value as THREE.Vector3).set(...weather.light);
      uniforms['wKeepBright']!.value = weather.keepBright;
      (uniforms['wFogColor']!.value as THREE.Vector3).set(...weather.fogColor);
      uniforms['wFogStrength']!.value = weather.fogStrength;
      uniforms['wFogSwirl']!.value = weather.fogSwirl;
      (uniforms['wFogShape']!.value as THREE.Vector4).set(
        weather.fogClear,
        weather.fogFull,
        weather.fogHeight,
        weather.fogBase,
      );
      uniforms['wSaturation']!.value = weather.saturation;
      uniforms['wContrast']!.value = weather.contrast;
      (uniforms['wTint']!.value as THREE.Vector3).set(...weather.tint);
      uniforms['wVignette']!.value = weather.vignette;
      uniforms['wTime']!.value = time;
      if (player) (uniforms['wPlayer']!.value as THREE.Vector3).copy(player);
    }
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
