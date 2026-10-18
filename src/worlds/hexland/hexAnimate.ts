import * as THREE from 'three';

/**
 * **Bewegung auf dem Brett** — Mühlenflügel drehen sich, Wasser fließt leicht,
 * Bäume und Weizen wiegen sich im Wind, und ab und zu zieht eine weiße Böe
 * übers Brett. Gewünscht: _„Animationen aktiviert — dann soll sich die
 * Windmühle z.B. drehen oder das Wasser leicht fließen und die Bäume z.B.
 * leicht wackeln durch einen Wind, ggf. wäre ein kleines Wind-System schön,
 * was vom Bildschirmrand ab und zu in einer sichtbaren Welle (in weiß) fliegt
 * und auf den Feldern dann Bäume und Weizen wackeln lässt."_
 *
 * Alles im Shader, an den Bündeln (`hexView.Batch`): Ein Baum mehr kostet
 * keinen Zeichenaufruf und keine Zeile JavaScript je Bild. Die Uniformen hier
 * teilen sich alle Materialien — ein Wert je Bild für das ganze Brett.
 */
export const ANIM = {
  /** Sekunden, die nur laufen, solange Animationen an sind. */
  time: { value: 0 },
  /** 1 an, 0 aus — Wiegen und Glitzern gehen damit weg, die Flügel bleiben stehen. */
  on: { value: 1 },
  /** Die Böe: Richtung (x, z), wo ihre Front gerade ist (längs der Richtung), Stärke. */
  gust: { value: new THREE.Vector4(1, 0, -1e4, 0) },
};

/** Der leise Wind ohne Böe — immer aus derselben Richtung, damit nichts springt. */
const BREEZE = 'vec2(0.8, 0.6)';

/**
 * **Wiegen im Wind** — die Spitze weicht aus, der Fuß bleibt stehen: Der Weg
 * wächst mit dem Quadrat der Höhe über dem Brett. `bend` macht kleine Dinge
 * (Weizen) so beweglich wie große (Bäume). Nur in Bündeln: Die Kachel in der
 * Hand schwebt und muss nicht wackeln.
 */
export function swayMaterial<M extends THREE.Material>(material: M, bend: number): M {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHexTime = ANIM.time;
    shader.uniforms.uHexAnim = ANIM.on;
    shader.uniforms.uHexGust = ANIM.gust;
    shader.uniforms.uHexBend = { value: bend };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uHexTime;
        uniform float uHexAnim;
        uniform vec4 uHexGust;
        uniform float uHexBend;`,
      )
      .replace(
        '#include <project_vertex>',
        `vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
          {
            vec2 foot = instanceMatrix[3].xz;
            float phase = foot.x * 0.71 + foot.y * 1.37;
            float h = max(mvPosition.y, 0.0);
            float along = dot(mvPosition.xz, uHexGust.xy) - uHexGust.z;
            float gust = uHexGust.w * exp(-along * along / 6.0) * (0.75 + 0.25 * sin(uHexTime * 9.0 + phase));
            float idle = 0.12 + 0.1 * sin(uHexTime * 1.7 + phase) + 0.04 * sin(uHexTime * 3.1 + phase * 1.9);
            vec2 push = ${BREEZE} * idle + uHexGust.xy * gust;
            mvPosition.xz += push * uHexBend * h * h * uHexAnim;
          }
        #endif
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`,
      );
  };
  material.customProgramCacheKey = () => 'hexland-sway';
  material.needsUpdate = true;
  return material;
}

/**
 * **Der Flügel der Mühle dreht sich** — um seine eigene Achse: Im Netz der
 * Datei liegt er schon mittig auf ihr (`building_windmill_top_fan_*`, z ist
 * die Achse).
 */
export function fanMaterial<M extends THREE.Material>(material: M): M {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHexTime = ANIM.time;
    const turn = `float hexA = uHexTime * 1.3;
      mat2 hexR = mat2(cos(hexA), sin(hexA), -sin(hexA), cos(hexA));`;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uHexTime;')
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        { ${turn} objectNormal.xy = hexR * objectNormal.xy; }`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        { ${turn} transformed.xy = hexR * transformed.xy; }`,
      );
  };
  material.customProgramCacheKey = () => 'hexland-fan';
  material.needsUpdate = true;
  return material;
}

/**
 * **Das Glitzern auf dem Wasser** — für den Shader der Kacheln
 * (`hexView.bevelEdges`): Wo die Kachel blau ist, ziehen helle Wellen langsam
 * darüber. `vHexWorld` ist die Lage auf dem Brett, damit die Wellen über die
 * Kachelgrenzen weiterlaufen.
 */
export const WATER_VERTEX = `
  #ifdef USE_INSTANCING
    vHexWorld = (instanceMatrix * vec4(position, 1.0)).xz;
  #else
    vHexWorld = (modelMatrix * vec4(position, 1.0)).xz;
  #endif`;

/**
 * **Wie schnell Wasser fließt — und der Wind weht**, in Metern je Sekunde.
 * Gewünscht: _„Der Wind ist mir zu schnell und sollte so schnell sein, wie das
 * Wasser fließt."_
 */
export const FLOW_SPEED = 0.8;

/**
 * Im Fluss laufen die Wellen **den Fluss hinab** (`aFlow`, gerechnet von
 * `hexDressing.riverFlow`): Der nächste Arm der Kachel sagt, wo man ist, und
 * `S` zählt von der Quelle an in Halbmessern der Kachel — an der Kante
 * zweier Kacheln ist es auf beiden Seiten dasselbe, die Wellen laufen ohne
 * Sprung hinüber. Seen und Ufer glitzern still vor sich hin, langsam.
 */
export const WATER_FRAGMENT = `
  {
    float blue = smoothstep(0.06, 0.22, diffuseColor.b - max(diffuseColor.r, diffuseColor.g * 0.9));
    vec2 w = vHexWorld;
    float t = uHexTime;
    float glint;
    if (vFlow.w > 1.5) {
      vec2 p = vHexLocal.xz;
      float best = -10.0;
      float S = 0.0;
      for (int e = 0; e < 6; e++) {
        float fe = float(e);
        float into = mod(floor(vFlow.x / exp2(fe) + 0.01), 2.0);
        float out_ = mod(floor(vFlow.y / exp2(fe) + 0.01), 2.0);
        if (into + out_ < 0.5) continue;
        float a = fe * 1.0471976;
        float d = dot(p, vec2(cos(a), sin(a)));
        if (d > best) {
          best = d;
          S = vFlow.z + (out_ > 0.5 ? d : -d);
        }
      }
      // Etwas quer verwirbelt, damit es keine Streifen wie gezogen sind.
      float n = sin(w.x * 2.3 + w.y * 1.9) * 0.8 + sin(w.y * 3.1 - w.x * 1.3) * 0.6;
      float k = 3.5;
      glint = sin(S * k - t * k * ${(FLOW_SPEED / 1.5).toFixed(4)} + n);
    } else {
      glint = sin(w.x * 2.1 + t * 0.45 + sin(w.y * 1.7 + t * 0.25) * 1.5)
        * sin(w.y * 2.6 - t * 0.4 + sin(w.x * 1.3 - t * 0.15) * 1.2);
    }
    diffuseColor.rgb += blue * uHexAnim * (smoothstep(0.45, 0.95, glint) * 0.16 + glint * 0.025);
  }`;

export function waterUniforms(uniforms: Record<string, THREE.IUniform>): void {
  uniforms.uHexTime = ANIM.time;
  uniforms.uHexAnim = ANIM.on;
}

const CALM = [5, 11] as const;
const STREAKS = 6;

/**
 * **Die weiße Böe** — ein paar Schlieren, die vom Rand des Bildes übers Brett
 * ziehen und sich dabei kringeln; wo ihre Front gerade ist, steht in
 * `ANIM.gust`, und dort biegen sich Bäume und Weizen stärker.
 */
export class WindGusts {
  readonly root = new THREE.Group();
  private readonly streaks: Array<{
    mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
    side: number;
    lag: number;
    height: number;
  }> = [];
  private calm = 3;
  private front = 0;
  private reach = 0;
  private speed = 0;
  private readonly dir = new THREE.Vector2(1, 0);
  private readonly centre = new THREE.Vector2();
  private readonly geometry = ribbon();

  constructor() {
    this.root.name = 'hexland-wind';
    for (let i = 0; i < STREAKS; i++) {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: ANIM.time,
          uLen: { value: 4 },
          uSeed: { value: i * 1.7 },
          uFade: { value: 0 },
        },
        vertexShader: RIBBON_VERTEX,
        fragmentShader: RIBBON_FRAGMENT,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = 6;
      mesh.visible = false;
      this.root.add(mesh);
      this.streaks.push({ mesh, side: 0, lag: 0, height: 1 });
    }
  }

  /**
   * Einmal je Bild. `centre` ist die Stelle, auf die man schaut, `reach` wie
   * weit das Bild von dort bis zum Rand reicht — dort fängt die Böe an —,
   * `spread` wie breit sie quer dazu ist.
   */
  update(dt: number, on: boolean, centre: THREE.Vector2, reach: number, spread: number): void {
    ANIM.on.value = on ? 1 : 0;
    if (on) ANIM.time.value += dt;
    const g = ANIM.gust.value;
    if (!on) {
      g.w = 0;
      this.reach = 0;
      for (const s of this.streaks) s.mesh.visible = false;
      return;
    }
    if (this.reach === 0) {
      this.calm -= dt;
      if (this.calm > 0) return;
      this.start(centre, reach, spread);
    }
    this.front += this.speed * dt;
    const end = this.reach + 4;
    if (this.front > end) {
      this.reach = 0;
      g.w = 0;
      this.calm = CALM[0] + Math.random() * (CALM[1] - CALM[0]);
      for (const s of this.streaks) s.mesh.visible = false;
      return;
    }
    // Sanft an und aus — eine Böe, kein Schlag.
    const k = (this.front + this.reach) / (2 * this.reach + 4);
    const strength = Math.sin(Math.PI * Math.min(1, Math.max(0, k)));
    g.set(this.dir.x, this.dir.y, this.centre.dot(this.dir) + this.front - 1, 0.6 + 0.6 * strength);
    const perp = new THREE.Vector2(-this.dir.y, this.dir.x);
    for (const s of this.streaks) {
      const along = this.front - s.lag;
      s.mesh.position.set(
        this.centre.x + this.dir.x * along + perp.x * s.side,
        s.height,
        this.centre.y + this.dir.y * along + perp.y * s.side,
      );
      // Am Rand des Bildes blendet sie ein und aus.
      const edge = Math.min(along + this.reach, this.reach - along) / (this.reach * 0.2);
      s.mesh.material.uniforms.uFade!.value = Math.max(0, Math.min(1, edge)) * 0.85;
    }
  }

  private start(centre: THREE.Vector2, reach: number, wide: number): void {
    const a = Math.random() * Math.PI * 2;
    this.dir.set(Math.cos(a), Math.sin(a));
    this.centre.copy(centre);
    this.reach = Math.max(8, reach);
    this.front = -this.reach;
    // Von weit oben wären Schlieren in Metern unsichtbar dünn — sie wachsen mit.
    const size = Math.max(1, this.reach / 12);
    // So schnell wie das Wasser — weit herausgezoomt so viel schneller, wie die
    // Schlieren größer sind, damit es im Bild gleich schnell aussieht.
    this.speed = FLOW_SPEED * size;
    const spread = Math.max(3, wide);
    this.streaks.forEach((s, i) => {
      s.side = (i / (STREAKS - 1) - 0.5) * 2 * spread + (Math.random() - 0.5) * spread * 0.3;
      s.lag = Math.random() * 3;
      // Tief über den Kacheln, wie Wasser über das Brett — gewünscht: _„Auch
      // sollte es wie Wasser auf den Tiles entlang fließen, von Tile zu Tile."_
      s.height = (0.2 + Math.random() * 0.3) * size;
      s.lag *= size;
      s.mesh.scale.setScalar(size);
      s.mesh.material.uniforms.uLen!.value = 3 + Math.random() * 2.5;
      s.mesh.rotation.y = -Math.atan2(this.dir.y, this.dir.x);
      s.mesh.visible = true;
    });
  }

  dispose(): void {
    this.geometry.dispose();
    for (const s of this.streaks) s.mesh.material.dispose();
    ANIM.gust.value.w = 0;
  }
}

/** Ein Band, waagerecht: `aT` von der Spitze (0) zum Schwanz (1), `aSide` die Seite. */
function ribbon(): THREE.BufferGeometry {
  const n = 40;
  const t = new Float32Array((n + 1) * 2);
  const side = new Float32Array((n + 1) * 2);
  const index: number[] = [];
  for (let i = 0; i <= n; i++) {
    t[i * 2] = t[i * 2 + 1] = i / n;
    side[i * 2] = -1;
    side[i * 2 + 1] = 1;
    if (i < n) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  // `position` braucht three.js für die Zahl der Ecken; die Lage rechnet der Shader.
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((n + 1) * 6), 3));
  geometry.setAttribute('aT', new THREE.BufferAttribute(t, 1));
  geometry.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  geometry.setIndex(index);
  return geometry;
}

const RIBBON_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uLen;
  uniform float uSeed;
  attribute float aT;
  attribute float aSide;
  varying float vT;
  void main() {
    // Der Schwanz schlängelt sich, und kurz hinter der Spitze schlägt er
    // einen kleinen Kringel — wie eine Windlinie im Zeichentrick.
    float x = -aT * uLen;
    float z = sin(aT * 7.0 - uTime * 1.6 + uSeed) * 0.22 * aT;
    float curl = smoothstep(0.12, 0.2, aT) * (1.0 - smoothstep(0.32, 0.4, aT));
    float ang = (aT - 0.12) / 0.28 * 6.2831853;
    x += curl * sin(ang) * 0.35;
    z += curl * (1.0 - cos(ang)) * 0.35;
    float w = 0.045 * (1.0 - aT) + 0.01;
    vec3 p = vec3(x, 0.0, z + aSide * w);
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;

const RIBBON_FRAGMENT = /* glsl */ `
  uniform float uFade;
  varying float vT;
  void main() {
    float a = smoothstep(0.0, 0.04, vT) * pow(1.0 - vT, 1.4) * uFade;
    gl_FragColor = vec4(1.0, 1.0, 1.0, a);
  }`;
