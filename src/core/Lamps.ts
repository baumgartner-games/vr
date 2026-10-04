import * as THREE from 'three';
import { denyShadow } from './graphicsScene';
import { denyOutline } from './outlineShell';
import {
  lampBurns,
  lampLevel,
  lampSeed,
  type LampColor,
  type LampEffect,
  type LampMaster,
  type LampMode,
} from './lamps/lampBehaviour';
import { lampBook, type LampHighlight } from './lamps/lampBook';
import {
  lampTypeOfName,
  signalLit,
  walkGreen,
  type LampKind,
  type LampType,
} from './lamps/lampTypes';

/** Wie viele Leuchten und Lichtflecken höchstens — die große Stadt hat gut hundert Masten. */
const MAX_GLOWS = 1024;
const MAX_POOLS = 512;
const MAX_MARKS = 512;
/** Wie oft die Szene nach Lampen abgesucht wird, in Sekunden. */
const RESCAN = 1;
/** Und am Tag, wenn nichts brennen kann. */
const RESCAN_IDLE = 10;
/** Wie hoch über dem Fuß der Lichtfleck liegt: gegen Flimmern mit dem Boden. */
const LIFT = 0.03;
/** **Wie viele Lampen echtes Licht bekommen** — die nächsten; in der Brille weniger. */
const REAL_LIGHTS_SCREEN = 6;
const REAL_LIGHTS_XR = 2;

/** Wie groß ein Schein ist, als Anteil der Höhe der Lampe. */
const GLOW_SIZE: Readonly<Record<LampKind, number>> = {
  lamp: 0.5,
  lantern: 0.55,
  flame: 0.9,
  cold: 0.35,
  red: 0.15,
  yellow: 0.15,
  green: 0.15,
  walk: 0.11,
};
type Rgb = readonly [number, number, number];
/** Die Farben je Art, linear und heller als 1 — die Nacht im Wetter lässt Helles hell. */
const KIND_COLOR: Readonly<Record<LampKind | 'walkRed', Rgb>> = {
  lamp: [3.2, 2.0, 0.85],
  lantern: [3.4, 1.6, 0.45],
  flame: [3.4, 1.5, 0.35],
  cold: [2.2, 2.6, 3.4],
  red: [3.4, 0.18, 0.1],
  yellow: [3.2, 1.7, 0.12],
  green: [0.2, 2.8, 0.9],
  walk: [0.2, 2.4, 0.8],
  walkRed: [2.8, 0.2, 0.1],
};
/** Die wählbaren Farben (`LampColor`) — `auto` heißt: die der Art. */
const CHOSEN_COLOR: Readonly<Record<Exclude<LampColor, 'auto'>, Rgb>> = {
  warm: [3.2, 1.9, 0.75],
  white: [3, 3, 2.8],
  cold: [2.2, 2.6, 3.4],
  red: [3.6, 0.25, 0.15],
  green: [0.3, 3, 0.8],
  blue: [0.35, 0.9, 3.6],
  violet: [2.4, 0.7, 3.4],
};
/** Die Ampelfarben behalten ihre Farbe, egal was gewählt ist. */
const FIXED_KINDS: ReadonlySet<LampKind> = new Set(['red', 'yellow', 'green', 'walk']);
/** Wie hell der Fleck auf dem Boden ist, im Verhältnis zum Schein. */
const POOL_STRENGTH = 0.3;
/** Wie hell das echte Licht ist — mal `power` und dem Quadrat seiner Reichweite. */
const LIGHT_STRENGTH = 1.6;

/**
 * **Eine Lampe in der Szene** — gefunden an ihrem Modell, mit allem, was die
 * Welt über sie wissen will (`Lamps.instances`, `Lamps.pick`).
 */
export interface LampInstance {
  /** Unter diesem Schlüssel steht sie im Buch (`lampBook`). */
  readonly key: string;
  readonly type: LampType;
  /** Die Hülle des Modells. */
  readonly object: THREE.Object3D;
  /** Der Kasten des Modells in seinem eigenen Raum. */
  readonly box: THREE.Box3;
  readonly seed: number;
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
const _hit = new THREE.Vector3();
const _color = new THREE.Color();
const _state = new THREE.Vector3();

const glowVertex = /* glsl */ `
attribute float size;
attribute vec3 glow;
attribute float inset;
uniform float pixels;
varying vec3 vGlow;
void main() {
  vGlow = glow;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  // Die Größe in Metern der Kamera: Im Weltbau ist das Gestell zehnfach groß,
  // und ein Meter der Welt ist dort ein Zehntel — ohne das wüchse der Schein
  // um das Zehnfache.
  float view = size * length(modelViewMatrix[0].xyz);
  // Ein Stück zur Kamera hin: Die Leuchte sitzt im Gehäuse oder im Glas, und
  // das verdeckte den Schein sonst.
  mv.xyz += normalize(-mv.xyz) * view * inset;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = view * projectionMatrix[1][1] * pixels / max(0.001, -mv.z);
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

const markVertex = /* glsl */ `
attribute vec3 mark;
varying vec3 vMark;
uniform float pixels;
void main() {
  vMark = mark;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = pixels;
}
`;

const markFragment = /* glsl */ `
varying vec3 vMark;
uniform float pulse;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d >= 1.0) discard;
  // Ein Ring mit Punkt in der Mitte — durch Wände hindurch zu sehen.
  float ring = smoothstep(0.62, 0.72, d) * (1.0 - smoothstep(0.88, 1.0, d));
  float dot = 1.0 - smoothstep(0.22, 0.3, d);
  float a = max(ring, dot) * (0.7 + 0.3 * pulse);
  if (a < 0.05) discard;
  gl_FragColor = vec4(vMark, a);
}
`;

/** **Was eine Lampe gerade tut** (`Lamps.state`). */
export interface LampState {
  burns: boolean;
  /** Der Betrieb, der wirklich gilt — _Gesteuert_, wenn die Welt steuert. */
  mode: LampMode;
  effect: LampEffect;
  color: LampColor;
  /** Ob sie gerade als Notlicht brennt. */
  alarm: boolean;
}

/** **Die Lampen in der Szene** — `null`, solange es keine gibt. */
export function lampsInScene(): Lamps | null {
  return Lamps.current;
}

/**
 * **Alle Lampen der Szene leuchten** — nach ihrem Typ (`lamps/lampTypes.ts`),
 * nach dem, was in der Welt eingestellt ist (`lamps/lampBook.ts`), und nach
 * Tageszeit und Hauptschalter (`weather.ts`).
 *
 * Gewünscht: zuerst _„bei den Laternen das entsprechend einstellen, dass diese
 * bei Tageszeit automatisch leuchten"_, dann _„bei Lampen und Lichtern etwas
 * genauer drauf achten"_ — Tischlampen, Deko, Kerzen, Notlicht, Grusellicht.
 * Keine Welt muss davon wissen: Wie die Schatten-Kreise (`BlobShadows.ts`)
 * läuft dies über die ganze Szene und erkennt die Lampen an ihrem Modell.
 *
 * **Drei Zeichenaufrufe für alle**, egal wie viele Lampen: ein Schein je
 * Leuchte (`THREE.Points` mit Größe und Farbe je Punkt, additiv), ein
 * Lichtfleck auf dem Boden (`InstancedMesh`, additiv) und die Markierungen
 * zum Finden (durch Wände). **Echtes Licht** bekommen nur die nächsten
 * brennenden Lampen — sechs am Schirm, zwei in der Brille —, denn jede Lampe in
 * three.js kostet in jedem Material jedes Bildpunkts. Die Zahl bleibt fest,
 * solange überhaupt etwas brennt, damit die Shader nicht bei jedem Schritt neu
 * übersetzt werden.
 */
export class Lamps {
  private readonly glows: THREE.Points;
  private readonly glowPositions = new Float32Array(MAX_GLOWS * 3);
  private readonly glowColors = new Float32Array(MAX_GLOWS * 3);
  private readonly glowSizes = new Float32Array(MAX_GLOWS);
  private readonly glowInsets = new Float32Array(MAX_GLOWS);
  private readonly pools: THREE.InstancedMesh;
  private readonly poolTexture: THREE.Texture;
  private readonly marks: THREE.Points;
  private readonly markPositions = new Float32Array(MAX_MARKS * 3);
  private readonly markColors = new Float32Array(MAX_MARKS * 3);
  private readonly realLights: THREE.PointLight[] = [];
  private readonly found: LampInstance[] = [];
  private readonly boxes = new WeakMap<THREE.Object3D, THREE.Box3>();
  private since = Number.POSITIVE_INFINITY;
  private time = 0;
  private night = false;
  private master: LampMaster = 'auto';
  private spooky = false;
  private presenting = false;

  /** Die Lampen der Szene, die gerade läuft — für die Welt, die nach ihnen fragt. */
  static current: Lamps | null = null;

  constructor(private readonly scene: THREE.Scene) {
    Lamps.current = this;
    const geometry = new THREE.BufferGeometry();
    const dynamic = (array: Float32Array, size: number): THREE.BufferAttribute =>
      new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', dynamic(this.glowPositions, 3));
    geometry.setAttribute('glow', dynamic(this.glowColors, 3));
    geometry.setAttribute('size', dynamic(this.glowSizes, 1));
    geometry.setAttribute('inset', dynamic(this.glowInsets, 1));
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
    this.glows.name = 'lamp-glows';
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
    this.pools.name = 'lamp-pools';
    this.pools.count = 0;
    this.pools.frustumCulled = false;
    this.pools.renderOrder = 2;
    this.pools.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pools.setColorAt(0, _color.setScalar(1));

    const markGeometry = new THREE.BufferGeometry();
    markGeometry.setAttribute('position', dynamic(this.markPositions, 3));
    markGeometry.setAttribute('mark', dynamic(this.markColors, 3));
    markGeometry.setDrawRange(0, 0);
    const markMaterial = new THREE.ShaderMaterial({
      uniforms: { pixels: { value: 26 }, pulse: { value: 1 } },
      vertexShader: markVertex,
      fragmentShader: markFragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.marks = new THREE.Points(markGeometry, markMaterial);
    this.marks.name = 'lamp-marks';
    this.marks.frustumCulled = false;
    this.marks.renderOrder = 999;
    this.marks.onBeforeRender = (renderer) => {
      renderer.getDrawingBufferSize(_size);
      markMaterial.uniforms['pixels']!.value = Math.max(18, _size.y * 0.03);
      markMaterial.uniforms['pulse']!.value = 0.5 + 0.5 * Math.sin(this.time * 5);
    };

    for (const object of [this.glows, this.pools, this.marks]) {
      // Kein Ding zum Anfassen: Zeiger, Strahlen und Treffer gehen hindurch.
      object.raycast = () => {};
      denyShadow(object);
      denyOutline(object);
      scene.add(object);
    }
  }

  /**
   * Tageszeit, Hauptschalter und Spuk (`weather.weatherTime`,
   * `streetLights`, `weatherFog === 'spooky'`).
   */
  setEnvironment(night: boolean, master: LampMaster, spooky = false): void {
    this.night = night;
    this.master = master;
    this.spooky = spooky;
  }

  /**
   * **Was eine Lampe in diesem Augenblick tut** — die drei Ebenen aus dem Buch
   * und darüber, was die Welt gerade sagt. Dieselbe Antwort für das Bild und
   * für das Menü (`grid/inspectMenu.ts`), damit „Brennt gerade" nicht lügt.
   *
   * - **Steuert etwas** (`lampBook.controller`, das Board der Station), folgt
   *   ihm jede Lampe, an der niemand den Betrieb eingestellt hat.
   * - **Spuk** (Nebel _Spuk_ im Wetter): Wer _Ruhig_ ab Werk hat und keine
   *   eigene Lichtart, flackert — gewünscht als Grusellicht.
   * - **Alarm** (`lampBook.alarm`): Notlicht brennt rot als Drehlicht, außer
   *   der Hauptschalter ist aus.
   */
  state(lamp: LampInstance): LampState {
    const { type, key } = lamp;
    const settings = lampBook.resolve(type, key);
    const own = lampBook.lampSettings(key);
    const world = lampBook.typeSettings(type.id);
    const controller = lampBook.controller;
    let mode = settings.mode;
    if (controller && mode === 'night' && own?.mode === undefined && world?.mode === undefined) {
      mode = 'controlled';
    }
    let controlled: boolean | null = null;
    if (mode === 'controlled') {
      lamp.object.getWorldPosition(_state);
      controlled = controller ? controller(_state.x, _state.z) : false;
    }
    let burns = lampBurns({ mode, on: settings.on }, this.night, this.master, controlled);
    let effect = settings.effect;
    let color = settings.color;
    if (
      this.spooky &&
      effect === 'steady' &&
      own?.effect === undefined &&
      world?.effect === undefined
    ) {
      effect = 'flicker';
    }
    const alarm = lampBook.alarm && settings.emergency;
    if (alarm) {
      burns = this.master !== 'off';
      effect = 'rotate';
      color = 'red';
    }
    return { burns, mode, effect, color, alarm };
  }

  /** Neue Welt: neue Lampen. */
  worldChanged(): void {
    this.found.length = 0;
    this.burningModels = false;
    this.since = Number.POSITIVE_INFINITY;
  }

  /** **Alle Lampen der Szene**, wie sie beim letzten Absuchen dastanden. */
  instances(): readonly LampInstance[] {
    return this.found;
  }

  /** Jetzt gleich neu absuchen — nach einem Umbau, den man sofort sehen will. */
  rescan(): void {
    this.collect();
    this.since = 0;
  }

  /**
   * **Welche Lampe ein Strahl trifft** — die nächste, deren Kasten (etwas
   * großzügiger als sie selbst) er schneidet. Gebündelte Deko (`staticDecor`)
   * zeichnet ihre Netze woanders hin; der Kasten steht trotzdem, wo sie steht.
   */
  pick(ray: THREE.Ray, reach = 80): LampInstance | null {
    let best: LampInstance | null = null;
    let bestDistance = reach;
    for (const lamp of this.found) {
      if (!shown(lamp.object, this.scene)) continue;
      this.worldBox(lamp, _box);
      const grow = Math.max(0.12, (_box.max.y - _box.min.y) * 0.08);
      _box.expandByScalar(grow);
      const hit = ray.intersectBox(_box, _hit);
      if (!hit) continue;
      const distance = hit.distanceTo(ray.origin);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = lamp;
      }
    }
    return best;
  }

  /** Der Kasten einer Lampe in der Welt. */
  worldBox(lamp: LampInstance, target: THREE.Box3): THREE.Box3 {
    return target.copy(lamp.box).applyMatrix4(lamp.object.matrixWorld);
  }

  /** Läuft in jedem Bild. `head` ist der Kopf des Spielers — die nächsten Lampen bekommen Licht. */
  update(dt: number, head: THREE.Vector3, presenting: boolean): void {
    this.time += dt;
    this.since += dt;
    // **Am Tag ohne Einstellungen brennt nichts** (ab Werk sind alle Lampen
    // „bei Nacht", außer brennenden Kerzen und Fackeln) — dann sucht die Szene
    // nur alle zehn Sekunden nach solchen. Wer im Einrichten klickt, sucht
    // ohnehin frisch.
    const idle =
      !this.night &&
      this.master !== 'on' &&
      lampBook.empty &&
      lampBook.highlight === null &&
      lampBook.controller === null &&
      !this.burningModels;
    if (this.since >= (idle ? RESCAN_IDLE : RESCAN)) {
      this.since = 0;
      this.collect();
    }
    if (presenting !== this.presenting) {
      this.presenting = presenting;
      this.dropRealLights();
    }
    let glows = 0;
    let pools = 0;
    let marks = 0;
    const highlight = lampBook.highlight;
    const candidates: Array<{ at: THREE.Vector3; color: Rgb; strength: number; range: number }> =
      [];
    for (const lamp of this.found) {
      if (!shown(lamp.object, this.scene)) continue;
      const { object, box, type } = lamp;
      const world = object.matrixWorld;
      _base.set((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
      _base.applyMatrix4(world);
      _top.set((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
      _top.applyMatrix4(world);
      const height = _top.distanceTo(_base);
      if (height <= 0.01) continue;

      if (highlight && marks < MAX_MARKS && highlighted(highlight, lamp)) {
        const changed = lampBook.overridden(lamp.key);
        this.markPositions.set([_top.x, _top.y + height * 0.12 + 0.15, _top.z], marks * 3);
        // Gelb: weicht ab · Türkis: wie der Standard.
        this.markColors.set(changed ? [1, 0.78, 0.2] : [0.3, 0.95, 1], marks * 3);
        marks++;
      }

      const settings = this.state(lamp);
      if (!settings.burns) continue;
      const level = lampLevel(settings.effect, this.time, lamp.seed);
      // Wohin die Ampel schaut: Die quer stehenden schalten versetzt.
      _facing.set(0, 0, 1).transformDirection(world);
      const cross = Math.abs(_facing.x) > Math.abs(_facing.z);
      let pooled = false;
      for (const spot of type.spots) {
        _point.set(
          box.min.x + (box.max.x - box.min.x) * spot.x,
          box.min.y + (box.max.y - box.min.y) * spot.y,
          box.min.z + (box.max.z - box.min.z) * spot.z,
        );
        // Vorn vor die Scheibe, damit der Schein nicht im Gehäuse steckt.
        if (spot.z >= 1) _point.z += (box.max.z - box.min.z) * 0.08;
        _point.applyMatrix4(world);
        const fixed = FIXED_KINDS.has(spot.kind);
        const base: Rgb =
          spot.kind === 'walk'
            ? KIND_COLOR[walkGreen(this.time, cross) ? 'walk' : 'walkRed']
            : fixed || settings.color === 'auto'
              ? KIND_COLOR[spot.kind]
              : CHOSEN_COLOR[settings.color];
        const lit =
          settings.effect === 'signal' && fixed ? signalLit(spot.kind, this.time, cross) : true;
        if (!lit) continue;
        const strength = fixed && settings.effect === 'signal' ? 1 : level;
        if (!fixed && type.pool && !pooled && pools < MAX_POOLS) {
          pooled = true;
          const radius = height * type.reach;
          _poolAt.set(_point.x, _base.y + LIFT, _point.z);
          _matrix.compose(_poolAt, _quat, _scale.set(radius, radius, 1));
          this.pools.setMatrixAt(pools, _matrix);
          const k = POOL_STRENGTH * strength;
          this.pools.setColorAt(pools, _color.setRGB(base[0] * k, base[1] * k, base[2] * k));
          pools++;
        }
        if (!fixed && type.power > 0) {
          const range = height * type.reach * 1.6 + 0.4;
          candidates.push({
            at: _point.clone(),
            color: base,
            strength: LIGHT_STRENGTH * type.power * strength * range * range,
            range,
          });
        }
        if (glows >= MAX_GLOWS) continue;
        this.glowPositions.set([_point.x, _point.y, _point.z], glows * 3);
        this.glowColors.set(
          [base[0] * strength, base[1] * strength, base[2] * strength],
          glows * 3,
        );
        this.glowSizes[glows] = height * GLOW_SIZE[spot.kind];
        this.glowInsets[glows] = type.inset ? 0.5 : 0.15;
        glows++;
      }
    }

    const geometry = this.glows.geometry;
    geometry.setDrawRange(0, glows);
    for (const name of ['position', 'glow', 'size', 'inset']) {
      (geometry.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
    }
    this.glows.visible = glows > 0;
    this.pools.count = pools;
    this.pools.visible = pools > 0;
    this.pools.instanceMatrix.needsUpdate = true;
    if (this.pools.instanceColor) this.pools.instanceColor.needsUpdate = true;
    const markGeometry = this.marks.geometry;
    markGeometry.setDrawRange(0, marks);
    for (const name of ['position', 'mark']) {
      (markGeometry.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
    }
    this.marks.visible = marks > 0;
    this.placeRealLights(candidates, head);
  }

  dispose(): void {
    if (Lamps.current === this) Lamps.current = null;
    for (const object of [this.glows, this.pools, this.marks]) {
      object.removeFromParent();
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
    this.dropRealLights();
    this.poolTexture.dispose();
  }

  /**
   * **Echtes Licht an die nächsten** brennenden Lampen. Die Lichter gibt es
   * nur, solange etwas brennt, und dann immer alle — eine wechselnde Zahl
   * hieße, dass three.js jedes Material neu übersetzt.
   */
  private placeRealLights(
    candidates: Array<{ at: THREE.Vector3; color: Rgb; strength: number; range: number }>,
    head: THREE.Vector3,
  ): void {
    if (candidates.length === 0) {
      if (this.realLights.length > 0) this.dropRealLights();
      return;
    }
    const count = this.presenting ? REAL_LIGHTS_XR : REAL_LIGHTS_SCREEN;
    if (this.realLights.length !== count) {
      this.dropRealLights();
      for (let i = 0; i < count; i++) {
        const light = new THREE.PointLight(0xffffff, 0, 1, 2);
        light.name = 'lamp-light';
        light.castShadow = false;
        // Ein Durchlauf der Grafikstufe soll diese Stärke nicht anfassen.
        light.userData.dynamicIntensity = true;
        this.scene.add(light);
        this.realLights.push(light);
      }
    }
    candidates.sort((a, b) => a.at.distanceToSquared(head) - b.at.distanceToSquared(head));
    this.realLights.forEach((light, i) => {
      const one = candidates[i];
      if (!one) {
        light.intensity = 0;
        return;
      }
      light.position.copy(one.at);
      const peak = Math.max(one.color[0], one.color[1], one.color[2]);
      light.color.setRGB(one.color[0] / peak, one.color[1] / peak, one.color[2] / peak);
      // Im Weltbau der Brille gleicht die App den Maßstab aus (`viewLights.ts`).
      light.intensity = one.strength;
      light.distance = one.range * 2.5;
    });
  }

  private dropRealLights(): void {
    for (const light of this.realLights) {
      light.removeFromParent();
      light.dispose();
    }
    this.realLights.length = 0;
  }

  /** Ob beim letzten Absuchen etwas dabei war, das auch am Tag brennt (`candle_lit`, `torch_lit`). */
  private burningModels = false;

  private collect(): void {
    this.found.length = 0;
    this.burningModels = false;
    const counts = new Map<string, number>();
    this.scene.traverse((object) => {
      if (!object.name) return;
      const type = lampTypeOfName(object.name);
      if (!type) return;
      const box = this.boxOf(object);
      if (!box) return;
      const key = keyOf(object, type, counts);
      this.found.push({ key, type, object, box, seed: lampSeed(key) });
      if (type.defaults.mode === 'on') this.burningModels = true;
    });
  }

  /** Der Kasten des Modells in seinem eigenen Raum — einmal gerechnet je Lampe. */
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

/**
 * **Der Schlüssel einer Lampe** — gehört sie zu einem Spielelement (sie oder
 * ein Vorfahr trägt `userData.elementSpot`, `elementView.ts`), dessen Stelle
 * und ihre Nummer darin; sonst ihr Modell und ihr Ort auf zehn Zentimeter.
 */
function keyOf(object: THREE.Object3D, type: LampType, counts: Map<string, number>): string {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    const spot = node.userData.elementSpot;
    if (typeof spot === 'string') {
      const n = counts.get(spot) ?? 0;
      counts.set(spot, n + 1);
      return `element:${spot}/${type.id}#${n}`;
    }
  }
  object.getWorldPosition(_point);
  return `${type.id}@${_point.x.toFixed(1)},${_point.y.toFixed(1)},${_point.z.toFixed(1)}`;
}

function highlighted(highlight: LampHighlight, lamp: LampInstance): boolean {
  switch (highlight.kind) {
    case 'all':
      return true;
    case 'type':
      return lamp.type.id === highlight.type;
    case 'overridden':
      return (
        (highlight.type === null || lamp.type.id === highlight.type) &&
        lampBook.overridden(lamp.key)
      );
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
