import * as THREE from 'three';
import type * as WebGPU from 'three/webgpu';
import { usingWebGPU, webgpuModule } from './appRenderer';
import { asShaderMaterial } from './nodeLooks';

/**
 * **Punkte mit Größe, für den neuen Renderer** — Funken, Rauch und Feuer in
 * der Station (`haunting/ShipEffects.ts`), Lampenschein und Lampenmarken
 * (`core/Lamps.ts`).
 *
 * Der alte Renderer zeichnet sie als `THREE.Points` mit `gl_PointSize`: ein
 * Quadrat so viele Bildpunkte breit, wie der Shader sagt, `gl_PointCoord`
 * darin von 0 bis 1. Der neue kennt nur Punkte von **einem** Bildpunkt
 * (`GLSLNodeBuilder`: `gl_PointSize = 1.0`); größere zeichnet er nur an einem
 * `Sprite` mit Instanzen. Hier steht deshalb dasselbe Quadrat als **vier Ecken
 * je Punkt**: ein `Mesh`, dessen Geometrie jeden Punkt als Instanz zeichnet
 * (die Attribute der Aufrufer werden Instanz-Attribute, `PointQuads`), und
 * ein Eckpunkt-Knoten, der die Ecke um so viele Bildpunkte vom Mittelpunkt
 * schiebt, wie `gl_PointSize` breit wäre. Wie bei echten Punkten liegt das
 * ganze Quadrat in der Tiefe des Mittelpunkts, und ein Punkt, dessen Mitte aus
 * dem Bild fällt, fällt ganz weg — auch auf `ALIASED_POINT_SIZE_RANGE`
 * gedeckelt wird wie dort.
 *
 * Für die Aufrufer bleibt es ein `THREE.Points`: `geometry.setDrawRange(0, n)`
 * setzt die Zahl der Instanzen, `material.uniforms` schreibt in die Knoten
 * (`nodeLooks.asShaderMaterial`), `onBeforeRender` läuft wie gehabt. Unter
 * WebGL kommen genau die alten Dinge heraus.
 */

type Node<T = unknown> = WebGPU.Node<T>;
type Tsl = NonNullable<ReturnType<typeof webgpuModule>>['TSL'];

/** Die vier Ecken eines Quadrats, gegen den Uhrzeigersinn. */
const CORNERS = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
const QUAD = [0, 1, 2, 0, 2, 3];

/**
 * **Jeder Punkt eine Instanz des Quadrats.** Was die Aufrufer anhängen
 * (`position`, Farbe, Größe, …), gilt je Instanz; die Ecke (`pointCorner`)
 * je Eckpunkt. `setDrawRange(0, n)` zeichnet die ersten `n` Punkte — wie bei
 * `THREE.Points`.
 */
class PointQuads extends THREE.InstancedBufferGeometry {
  constructor() {
    super();
    this.instanceCount = 0;
    this.setIndex(QUAD);
    super.setAttribute('pointCorner', new THREE.BufferAttribute(CORNERS, 2));
  }

  override setAttribute(
    name: string,
    attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  ): this {
    // Wie `TSL.instancedBufferAttribute`: dasselbe Attribut, nur je Instanz.
    const instanced = attribute as THREE.BufferAttribute & {
      isInstancedBufferAttribute?: boolean;
      meshPerAttribute?: number;
    };
    instanced.isInstancedBufferAttribute = true;
    instanced.meshPerAttribute = 1;
    return super.setAttribute(name, attribute);
  }

  override setDrawRange(_start: number, count: number): void {
    this.instanceCount = count;
  }
}

/** **Die Geometrie für Punkte** — unter WebGL eine gewöhnliche. */
export function pointGeometry(): THREE.BufferGeometry {
  return usingWebGPU() ? new PointQuads() : new THREE.BufferGeometry();
}

/**
 * **Das Ding für Punkte** — unter WebGL `THREE.Points`, im neuen Renderer ein
 * `Mesh` mit den Quadraten (`pointGeometry` muss die Geometrie gebaut haben).
 * Es ist für niemanden zu treffen: Ein Strahl fände an den Quadraten nur
 * Unsinn.
 */
export function pointsObject<M extends THREE.Material>(
  geometry: THREE.BufferGeometry,
  material: M,
): THREE.Points<THREE.BufferGeometry, M> {
  if (!(geometry instanceof PointQuads)) return new THREE.Points(geometry, material);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.raycast = () => {};
  return mesh as unknown as THREE.Points<THREE.BufferGeometry, M>;
}

let pointLimit = 0;

/**
 * **Ein Punkt als Quadrat** um `view` (Ort im Raum der Kamera), `diameter`
 * Bildpunkte breit — was im alten Shader `gl_PointSize` ist. Gibt den
 * Eckpunkt-Knoten für `vertexNode` und `coord` wie `gl_PointCoord` (0…1)
 * zurück.
 *
 * Bildpunkte sind die des Bildausschnitts, in den gerade gezeichnet wird
 * (`cameraViewport`: in der Brille das eine Auge, am Schirm das ganze Bild) —
 * wie bei `gl_PointSize`. Das Quadrat ist also in Bildpunkten quadratisch,
 * nicht nach dem Verhältnis der Projektion: In der nachgestellten Brille, wo
 * beides auseinandergeht, steht es so verzerrt da wie unter WebGL.
 */
function pointSprite(
  TSL: Tsl,
  view: Node<'vec3'>,
  diameter: Node<'float'>,
): { vertex: Node<'vec4'>; coord: Node<'vec2'> } {
  const limit = TSL.uniform(1024).onRenderUpdate(({ renderer }) => {
    if (pointLimit === 0) pointLimit = maxPointSize(renderer);
    return pointLimit;
  });
  const projection = TSL.cameraProjectionMatrix;
  const clip = projection.mul(TSL.vec4(view, 1));
  const corner = TSL.attribute<'vec2'>('pointCorner', 'vec2');
  const size = TSL.clamp(diameter, 1, limit);
  const pixels = TSL.max(TSL.cameraViewport.zw, TSL.vec2(1, 1));
  const offset = corner.mul(size).div(pixels).mul(clip.w);
  // Fällt die Mitte aus dem Bild, fällt der ganze Punkt weg — wie unter WebGL.
  const outside = TSL.max(TSL.abs(clip.x), TSL.abs(clip.y)).greaterThan(clip.w);
  const vertex = TSL.select(
    outside,
    TSL.vec4(2, 2, 2, 1),
    TSL.vec4(clip.xy.add(offset), clip.z, clip.w),
  );
  // `gl_PointCoord` zählt von oben nach unten.
  const coord = TSL.vec2(corner.x.mul(0.5).add(0.5), corner.y.mul(-0.5).add(0.5));
  return { vertex, coord: TSL.varying(coord) };
}

/** Wie groß ein Punkt unter WebGL höchstens sein darf (`ALIASED_POINT_SIZE_RANGE`). */
function maxPointSize(renderer: unknown): number {
  const gl = (renderer as { backend?: { gl?: WebGL2RenderingContext } }).backend?.gl;
  const range = gl?.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | undefined;
  return range?.[1] ?? 1024;
}

type Output = (builder: unknown, output: Node<'vec4'>) => Node<'vec4'>;

/**
 * **Die Deckkraft nicht zweimal.** Die Umrechnung am Ende
 * (`appRenderer.inlineOutput` über `TSL.renderOutput`) gibt die Farbe
 * vormultipliziert heraus — gedacht für den Zwischenpuffer, der danach
 * kopiert wird. Ein Material mit gewöhnlicher Mischung (`SRC_ALPHA`) nähme
 * die Deckkraft dann zweimal: Der Rauch wurde dunkel, das Feuer klein. Also
 * rechnet hier die Umrechnung auf der Farbe allein (Deckkraft 1, da ändert
 * das Vormultiplizieren nichts), und die Deckkraft kommt danach wieder dazu.
 */
function straightOutput(TSL: Tsl, material: WebGPU.NodeMaterial): void {
  const own = material as unknown as { setupOutput: Output };
  const base = own.setupOutput;
  own.setupOutput = function (this: unknown, builder, output) {
    const color = base.call(this, builder, TSL.vec4(output.rgb, 1));
    return TSL.vec4(color.rgb, output.a);
  };
}

interface Look {
  readonly kind: number;
  readonly blending: THREE.Blending;
}

/**
 * **Funken, Rauch und Feuer** (`haunting/ShipEffects.ts`) — dieselbe Rechnung
 * wie dort: Größe, Deckkraft und Farbe je Punkt; Funken in die Breite
 * gezogen, Funken und Feuer mit hellem Kern. Nicht tongemappt, nur sRGB
 * (`colorspace_fragment`).
 */
export function shipParticleNodeMaterial({ kind, blending }: Look): THREE.ShaderMaterial | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const uKind = TSL.uniform(kind);
  const uViewportY = TSL.uniform(720);
  const material = new gpu.NodeMaterial();
  material.setValues({
    name: `station-particles-${kind}`,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
    blending,
  });
  material.fog = false;
  const view = TSL.modelViewMatrix.mul(TSL.vec4(TSL.positionGeometry, 1));
  const aSize = TSL.attribute<'float'>('aSize', 'float');
  const diameter = aSize
    .mul(TSL.cameraProjectionMatrix.mul(TSL.vec4(0, 1, 0, 0)).y)
    .mul(uViewportY)
    .mul(0.5)
    .div(TSL.max(0.1, view.z.negate()));
  const sprite = pointSprite(TSL, view.xyz, TSL.min(diameter, 72));
  material.vertexNode = sprite.vertex;
  const vColor = TSL.attribute<'vec3'>('aColor', 'vec3');
  const vOpacity = TSL.attribute<'float'>('aOpacity', 'float');
  const raw = sprite.coord.mul(2).sub(1);
  const point = TSL.vec2(TSL.select(uKind.lessThan(0.5), raw.x.mul(2.3), raw.x), raw.y);
  const radius = TSL.dot(point, point);
  const soft = TSL.smoothstep(0.04, 1, radius).oneMinus();
  const core = TSL.smoothstep(0, 0.2, radius).oneMinus();
  const hot = uKind.lessThan(0.5).or(uKind.greaterThan(1.5));
  const color = TSL.select(hot, TSL.mix(vColor, TSL.vec3(1, 0.88, 0.48), core.mul(0.3)), vColor);
  material.colorNode = TSL.Fn(() => {
    TSL.Discard(radius.greaterThanEqual(1).or(vOpacity.lessThan(0.003)));
    return color;
  })();
  material.opacityNode = soft.mul(soft).mul(vOpacity);
  straightOutput(TSL, material);
  return asShaderMaterial(material, { uKind, uViewportY });
}

/**
 * **Der Lampenschein** (`core/Lamps.ts`, `lamp-glows`) — Größe in Metern der
 * Kamera (im Weltbau zehnfach groß), ein Stück zur Kamera hin gerückt, ein
 * heller Kern mit weichem Hof, additiv. Tongemappt und sRGB wie dort.
 */
export function lampGlowNodeMaterial(): THREE.ShaderMaterial | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const pixels = TSL.uniform(400);
  const material = new gpu.NodeMaterial();
  material.setValues({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  material.fog = false;
  const size = TSL.attribute<'float'>('size', 'float');
  const inset = TSL.attribute<'float'>('inset', 'float');
  const mv = TSL.modelViewMatrix.mul(TSL.vec4(TSL.positionGeometry, 1)).xyz;
  const view = size.mul(TSL.length(TSL.modelViewMatrix.mul(TSL.vec4(1, 0, 0, 0)).xyz));
  const moved = mv.add(TSL.normalize(mv.negate()).mul(view).mul(inset));
  const diameter = view
    .mul(TSL.cameraProjectionMatrix.mul(TSL.vec4(0, 1, 0, 0)).y)
    .mul(pixels)
    .div(TSL.max(0.001, moved.z.negate()));
  const sprite = pointSprite(TSL, moved, diameter);
  material.vertexNode = sprite.vertex;
  const glow = TSL.attribute<'vec3'>('glow', 'vec3');
  const d = TSL.length(sprite.coord.sub(0.5)).mul(2);
  const halo = TSL.pow(TSL.max(d.oneMinus(), 0), 2.2);
  const core = TSL.smoothstep(0.32, 0, d);
  material.colorNode = TSL.Fn(() => {
    TSL.Discard(d.greaterThanEqual(1));
    return glow.mul(halo.mul(0.55).add(core));
  })();
  // Deckkraft 1: Das Vormultiplizieren der Umrechnung ändert hier nichts.
  material.opacityNode = TSL.float(1);
  return asShaderMaterial(material, { pixels });
}

/**
 * **Die Lampenmarken** (`core/Lamps.ts`, `lamp-marks`) — ein Ring mit Punkt,
 * feste Größe in Bildpunkten, pulsierend, durch Wände. Der alte Shader rechnet
 * weder Tonemapping noch sRGB an — hier deshalb auch nicht: Die Ausgabe geht
 * so hinaus, wie sie ist (ohne `appRenderer.inlineOutput`).
 */
export function lampMarkNodeMaterial(): THREE.ShaderMaterial | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const pixels = TSL.uniform(26);
  const pulse = TSL.uniform(1);
  const material = new gpu.NodeMaterial();
  material.setValues({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  material.fog = false;
  material.toneMapped = false;
  // Statt der Umrechnung am Ende (`inlineOutput` hängt sie an `setupOutput`).
  (material as unknown as { setupOutput: Output }).setupOutput = (_builder, output) => output;
  const mv = TSL.modelViewMatrix.mul(TSL.vec4(TSL.positionGeometry, 1)).xyz;
  const sprite = pointSprite(TSL, mv, pixels);
  material.vertexNode = sprite.vertex;
  const mark = TSL.attribute<'vec3'>('mark', 'vec3');
  const d = TSL.length(sprite.coord.sub(0.5)).mul(2);
  const ring = TSL.smoothstep(0.62, 0.72, d).mul(TSL.smoothstep(0.88, 1, d).oneMinus());
  const dot = TSL.smoothstep(0.22, 0.3, d).oneMinus();
  const a = TSL.max(ring, dot).mul(pulse.mul(0.3).add(0.7));
  material.colorNode = TSL.Fn(() => {
    TSL.Discard(d.greaterThanEqual(1).or(a.lessThan(0.05)));
    return mark;
  })();
  material.opacityNode = a;
  return asShaderMaterial(material, { pixels, pulse });
}
