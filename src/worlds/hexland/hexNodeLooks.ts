import * as THREE from 'three';
import type * as WebGPU from 'three/webgpu';
import { webgpuModule } from '../../core/appRenderer';
import { asShaderMaterial } from '../../core/nodeLooks';
import { ANIM, APOTHEM, FLOW_SPEED } from './hexAnimate';

/**
 * **Die Bewegung auf dem Brett noch einmal, für den neuen Renderer.**
 *
 * Der `WebGPURenderer` (_Grafik → Renderer: Multiview_) kennt weder
 * `ShaderMaterial` noch `onBeforeCompile`: Die Windspur fehlte, die Bäume und
 * der Weizen standen still, das Wasser glitzerte nicht, die Mühlenflügel
 * drehten sich nicht, und die Kacheln hatten keine weiche Kante. Hier steht
 * dieselbe Rechnung wie in `hexAnimate.ts` und `hexView.bevelEdges`, als
 * Knotenmaterial (TSL) — dieselben Zahlen, dieselbe Reihenfolge.
 *
 * Jedes animierte Material ist eine **Kopie des Regalmaterials als
 * Knotenmaterial** — Feld für Feld abgeschrieben wie in three's eigener
 * Übersetzung (`NodeLibrary.fromMaterial`), dann um die Bewegung ergänzt.
 * Die Uniformen teilen sich alle, wie unter WebGL: ein Wert je Bild aus
 * `ANIM` für das ganze Brett.
 *
 * Jede Funktion gibt `null` zurück, solange WebGL zeichnet; dann baut die
 * Stelle ihr Material wie immer.
 */

type Gpu = NonNullable<ReturnType<typeof webgpuModule>>;
type Tsl = Gpu['TSL'];
type StandardClass = typeof WebGPU.MeshStandardNodeMaterial;
type Builder = Parameters<InstanceType<StandardClass>['setupPosition']>[0];
type Vec2 = WebGPU.Node<'vec2'>;
type Vec3 = WebGPU.Node<'vec3'>;
type Vec4 = WebGPU.Node<'vec4'>;
type Float = WebGPU.Node<'float'>;

/** Die geteilten Uniformen — einmal gebaut, jedes Bild aus `ANIM` gelesen. */
interface Shared {
  time: Float;
  on: Float;
  gustTiles: Vec4;
  gustPush: Vec4;
  gustTiles2: Vec4;
  gustPush2: Vec4;
}
let shared: Shared | null = null;

function uniforms(TSL: Tsl): Shared {
  if (shared) return shared;
  const vec = (source: { value: THREE.Vector4 }): Vec4 =>
    TSL.uniform(source.value.clone()).onRenderUpdate(() => source.value) as unknown as Vec4;
  shared = {
    time: TSL.uniform(0).onRenderUpdate(() => ANIM.time.value) as unknown as Float,
    on: TSL.uniform(1).onRenderUpdate(() => ANIM.on.value) as unknown as Float,
    gustTiles: vec(ANIM.gustTiles),
    gustPush: vec(ANIM.gustPush),
    gustTiles2: vec(ANIM.gustTiles2),
    gustPush2: vec(ANIM.gustPush2),
  };
  return shared;
}

/**
 * **Ein Regalmaterial als Knotenmaterial derselben Art** — Farbe, Textur,
 * Rauheit, alles mit; nur die Kennung ist eine eigene. `extend` darf die
 * Klasse ergänzen (die Lage der Ecken: `setupPosition`).
 */
function twin(
  gpu: Gpu,
  source: THREE.Material,
  extend: (base: StandardClass) => StandardClass = (base) => base,
): WebGPU.MeshStandardNodeMaterial {
  const classes = gpu as unknown as Record<string, StandardClass | undefined>;
  const Base =
    classes[source.type.replace(/Material$/, 'NodeMaterial')] ?? gpu.MeshStandardNodeMaterial;
  const Twin = extend(Base);
  const material = new Twin();
  const from = source as unknown as Record<string, unknown>;
  const to = material as unknown as Record<string, unknown>;
  for (const key in from) if (key !== 'uuid') to[key] = from[key];
  return material;
}

/** Wie `hexAnimate.swayMaterial.hexInside`: 1, wenn `d` von der Mitte aus in der Kachel liegt. */
function hexInside(TSL: Tsl, d: Vec2): Float {
  const m = TSL.max(
    TSL.abs(d.x),
    TSL.max(
      TSL.abs(TSL.dot(d, TSL.vec2(0.5, 0.8660254))),
      TSL.abs(TSL.dot(d, TSL.vec2(-0.5, 0.8660254))),
    ),
  );
  return TSL.step(m, APOTHEM) as unknown as Float;
}

/**
 * **Die Instanzmatrix selbst lesen** — der Fuß eines Baums ist ihre letzte
 * Spalte (`instanceMatrix[3]` unter WebGL). three baut seine eigene erst in
 * `setupPosition` und gibt sie nicht heraus; also macht `swayNodeMaterial`
 * das Instanzieren selbst, mit denselben Zahlen im selben Puffer. Die
 * Fassung des Puffers folgt der der Instanzmatrix (`needsUpdate` im
 * Bündel), sonst würde ein neuer Baum nie hochgeladen.
 */
const matrixBuffers = new WeakMap<
  THREE.InstancedBufferAttribute,
  THREE.InstancedInterleavedBuffer
>();

function instanceColumns(TSL: Tsl, matrix: THREE.InstancedBufferAttribute): Vec4[] {
  let buffer = matrixBuffers.get(matrix);
  if (!buffer) {
    buffer = new THREE.InstancedInterleavedBuffer(matrix.array as Float32Array, 16, 1);
    Object.defineProperty(buffer, 'version', { get: () => matrix.version, set: () => {} });
    matrixBuffers.set(matrix, buffer);
  }
  const read =
    matrix.usage === THREE.DynamicDrawUsage
      ? TSL.instancedDynamicBufferAttribute
      : TSL.instancedBufferAttribute;
  return [0, 4, 8, 12].map((offset) => read(buffer, 'vec4', 16, offset) as unknown as Vec4);
}

/**
 * **Wiegen im Wind** (`hexAnimate.swayMaterial`) — die Spitze weicht aus, der
 * Fuß bleibt stehen, nur auf der Kachel, auf der der Wind gerade ist, und
 * nur in Bündeln: Ohne Instanzen (die Kachel in der Hand) bleibt alles still.
 * Geschoben wird in den Maßen des Bretts, nach dem Instanzieren und vor der
 * Lage des Bretts — wie im alten Shader zwischen `instanceMatrix` und
 * `modelViewMatrix`.
 */
export function swayNodeMaterial(source: THREE.Material, bend: number): THREE.Material | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const u = uniforms(TSL);
  const uBend = TSL.uniform(bend);
  return twin(
    gpu,
    source,
    (Base) =>
      class extends Base {
        override setupPosition(builder: Builder) {
          const object = builder.object as THREE.InstancedMesh;
          if (!object.isInstancedMesh || !object.instanceMatrix)
            return super.setupPosition(builder);
          const columns = instanceColumns(TSL, object.instanceMatrix);
          const matrix = TSL.mat4(...(columns as [Vec4, Vec4, Vec4, Vec4]));
          const placed = TSL.vec3(matrix.mul(TSL.vec4(TSL.positionLocal, 1)).xyz).toVar();
          if (builder.geometry.hasAttribute('normal'))
            TSL.normalLocal.assign(TSL.transformNormal(TSL.normalLocal, matrix));
          const foot = columns[3]!.xz;
          const phase = foot.x.mul(0.71).add(foot.y.mul(1.37));
          const h = TSL.max(placed.y, 0);
          const wind = u.gustPush.x
            .mul(hexInside(TSL, foot.sub(u.gustTiles.xy)))
            .add(u.gustPush.y.mul(hexInside(TSL, foot.sub(u.gustTiles.zw))));
          const wind2 = u.gustPush2.x
            .mul(hexInside(TSL, foot.sub(u.gustTiles2.xy)))
            .add(u.gustPush2.y.mul(hexInside(TSL, foot.sub(u.gustTiles2.zw))));
          const flutter = TSL.sin(u.time.mul(6).add(phase)).mul(0.3).add(0.7);
          const push = u.gustPush.zw
            .mul(wind)
            .add(u.gustPush2.zw.mul(wind2))
            .mul(flutter.mul(uBend).mul(h).mul(h).mul(u.on));
          TSL.positionLocal.assign(TSL.vec3(placed.x.add(push.x), placed.y, placed.z.add(push.y)));
          return TSL.positionLocal;
        }
      },
  );
}

/**
 * **Der Flügel der Mühle dreht sich** (`hexAnimate.fanMaterial`) — um seine
 * eigene Achse z, vor allem anderen (wie im alten Shader nach
 * `begin_vertex`), samt Normalen.
 */
export function fanNodeMaterial(source: THREE.Material): THREE.Material | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const u = uniforms(TSL);
  const turn = (v: Vec3): Vec3 => {
    const a = u.time.mul(1.3);
    const c = TSL.cos(a);
    const s = TSL.sin(a);
    return TSL.vec3(c.mul(v.x).sub(s.mul(v.y)), s.mul(v.x).add(c.mul(v.y)), v.z);
  };
  return twin(
    gpu,
    source,
    (Base) =>
      class extends Base {
        override setupPosition(builder: Builder) {
          if (builder.geometry.hasAttribute('normal'))
            TSL.normalLocal.assign(turn(TSL.normalLocal as unknown as Vec3));
          TSL.positionLocal.assign(turn(TSL.positionLocal as unknown as Vec3));
          return super.setupPosition(builder);
        }
      },
  );
}

/**
 * **Die Kante der Kachel und das Glitzern des Wassers** (`hexView.bevelEdges`
 * mit `hexAnimate.WATER_FRAGMENT`) — auf die Farbe nach der Textur, vor den
 * Eckfarben, wie im alten Shader nach `map_fragment`. Die Schleifen über die
 * sechs Kanten sind hier ausgerollt: Welche Kanten gegenüberliegen und wo
 * sich zwei treffen, steht fest; nur, welche ein Fluss benutzt, kommt aus
 * `aFlow`.
 */
export function bevelNodeMaterial(source: THREE.Material, bevel: number): THREE.Material | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const u = uniforms(TSL);
  const material = twin(gpu, source);
  material.colorNode = TSL.Fn((builder: Builder) => {
    const base = TSL.vec4(TSL.materialColor as unknown as Vec4);
    const rgb = TSL.vec3(base.xyz).toVar();
    const local = TSL.positionGeometry;
    // Unter WebGL `vHexWorld`: die Lage auf dem Brett — in Bündeln nach der
    // Instanzmatrix, sonst in der Welt.
    const world: Vec2 = (builder.object as THREE.InstancedMesh).isInstancedMesh
      ? TSL.positionLocal.xz
      : TSL.positionWorld.xz;
    const flow: Vec4 = builder.geometry.hasAttribute('aFlow')
      ? TSL.attribute('aFlow', 'vec4')
      : TSL.vec4(0, 0, 0, 1);
    TSL.If(local.y.greaterThan(-0.05), () => {
      const p = local.xz;
      const d = TSL.max(
        TSL.abs(p.x),
        TSL.max(
          TSL.abs(TSL.dot(p, TSL.vec2(0.5, 0.8660254))),
          TSL.abs(TSL.dot(p, TSL.vec2(-0.5, 0.8660254))),
        ),
      );
      const edge = TSL.float(1).sub(d);
      const groove = TSL.float(1).sub(TSL.smoothstep(0, bevel, edge));
      const lip = TSL.smoothstep(bevel * 0.4, bevel, edge).mul(
        TSL.float(1).sub(TSL.smoothstep(bevel, bevel * 1.8, edge)),
      );
      rgb.mulAssign(TSL.mix(1, 0.52, groove.mul(groove)));
      rgb.addAssign(lip.mul(0.07));
    });
    water(TSL, u, rgb, local, world, flow);
    return TSL.vec4(rgb, base.w);
  })();
  return material;
}

/** Das Bit `e` einer Maske aus `aFlow`, wie im alten Shader gerechnet. */
function bit(TSL: Tsl, mask: Float, e: number): Float {
  return TSL.mod(TSL.floor(mask.div(2 ** e).add(0.01)), 2) as unknown as Float;
}

/** `hexAnimate.WATER_FRAGMENT`, Zeile für Zeile — `rgb` wird verändert. */
function water(TSL: Tsl, u: Shared, rgb: Vec3, local: Vec3, w: Vec2, flow: Vec4): void {
  const blue = TSL.smoothstep(0.06, 0.22, rgb.z.sub(TSL.max(rgb.x, rgb.y.mul(0.9))));
  const t = u.time;
  const glint = TSL.float(0).toVar();
  TSL.If(flow.w.greaterThan(1.5), () => {
    const p = local.xz;
    // Etwas quer verwirbelt, damit es keine Streifen wie gezogen sind.
    const n = TSL.sin(w.x.mul(2.3).add(w.y.mul(1.9)))
      .mul(0.8)
      .add(TSL.sin(w.y.mul(3.1).sub(w.x.mul(1.3))).mul(0.6));
    const k = 3.5;
    const drift = t.mul(k * Number((FLOW_SPEED / 1.5).toFixed(4)));
    const inBits = [0, 1, 2, 3, 4, 5].map((e) => bit(TSL, flow.x, e).toVar());
    const outBits = [0, 1, 2, 3, 4, 5].map((e) => bit(TSL, flow.y, e).toVar());
    const sumOf = (bits: Float[]): Float => bits.reduce((a, b) => a.add(b) as Float);
    // Gibt es Arme beider Richtungen? Sonst gilt jeder als Anfang eines Weges.
    const mixed = sumOf(inBits).greaterThan(0.5).and(sumOf(outBits).greaterThan(0.5)).toVar();
    const sum = TSL.float(0).toVar();
    const weight = TSL.float(0).toVar();
    for (let i = 0; i < 6; i++) {
      for (let o = 0; o < 6; o++) {
        if (o === i) continue;
        const iin = inBits[i]!;
        const iout = outBits[i]!;
        const oin = inBits[o]!;
        const oout = outBits[o]!;
        // Die Bedingungen der Schleife unter WebGL, mit `o > i` schon hier entschieden.
        const fromHere = TSL.select(mixed, iin, iin.add(iout)).greaterThanEqual(0.5);
        const toThere = TSL.select(mixed, oout, o > i ? oin.add(oout) : 0).greaterThanEqual(0.5);
        TSL.If(fromHere.and(toThere), () => {
          const ai = i * (Math.PI / 3);
          const ao = o * (Math.PI / 3);
          const ni = new THREE.Vector2(Math.cos(ai), Math.sin(ai));
          const no = new THREE.Vector2(Math.cos(ao), Math.sin(ao));
          const c = ni.dot(no);
          let f: Float;
          let d: Float;
          if (c < -0.99) {
            // Gerade durch: von der Kante herein zur Kante hinaus.
            f = TSL.dot(p, TSL.vec2(no.x, no.y)).mul(0.5).add(0.5) as unknown as Float;
            d = TSL.abs(p.x.mul(no.y).sub(p.y.mul(no.x))) as unknown as Float;
          } else {
            // **Im Bogen um die Ecke** um O, wo sich die beiden Kanten treffen.
            const b = ni.clone().add(no).normalize();
            const org = b.clone().divideScalar(Math.sqrt(0.5 + 0.5 * c));
            const uu = ni.clone().sub(org);
            const vv = no.clone().sub(org);
            const q = p.sub(TSL.vec2(org.x, org.y));
            const total = Math.atan2(uu.x * vv.y - uu.y * vv.x, uu.dot(vv));
            const here = TSL.atan(
              q.y.mul(uu.x).sub(q.x.mul(uu.y)),
              q.x.mul(uu.x).add(q.y.mul(uu.y)),
            );
            f = here.div(total) as unknown as Float;
            d = TSL.abs(TSL.length(q).sub(uu.length())) as unknown as Float;
          }
          const dd = d.add(TSL.max(0, TSL.max(f.negate(), f.sub(1))).mul(2));
          const wgt = TSL.exp(dd.mul(dd).negate().div(0.06)).add(1e-4);
          const S = flow.z.sub(1).add(TSL.clamp(f, -0.3, 1.3).mul(2));
          sum.addAssign(wgt.mul(TSL.sin(S.mul(k).sub(drift).add(n))));
          weight.addAssign(wgt);
        });
      }
    }
    glint.assign(TSL.select(weight.greaterThan(0), sum.div(weight), 0));
  }).Else(() => {
    glint.assign(
      TSL.sin(
        w.x
          .mul(2.1)
          .add(t.mul(0.45))
          .add(TSL.sin(w.y.mul(1.7).add(t.mul(0.25))).mul(1.5)),
      ).mul(
        TSL.sin(
          w.y
            .mul(2.6)
            .sub(t.mul(0.4))
            .add(TSL.sin(w.x.mul(1.3).sub(t.mul(0.15))).mul(1.2)),
        ),
      ),
    );
  });
  rgb.addAssign(
    blue.mul(u.on).mul(TSL.smoothstep(0.45, 0.95, glint).mul(0.16).add(glint.mul(0.025))),
  );
}

/**
 * **Die weiße Spur hinter dem Wind** (`hexAnimate.WindGusts`) — weiß, so
 * durchsichtig, wie `aAlpha` je Ecke sagt. Unter WebGL schreibt der Shader
 * die Farbe ohne Tonemapping und Umrechnung; hier ebenso (`toneMapped`, `userData.rawOutput`).
 */
export function windTrailNodeMaterial(): THREE.ShaderMaterial | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const material = new gpu.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  material.toneMapped = false;
  // Auch keine sRGB-Umrechnung: Der alte Shader hatte kein `colorspace_fragment`.
  material.userData.rawOutput = true;
  material.fog = false;
  material.colorNode = TSL.vec3(1, 1, 1);
  material.opacityNode = TSL.attribute('aAlpha', 'float');
  return asShaderMaterial(material, {});
}
