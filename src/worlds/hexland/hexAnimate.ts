import * as THREE from 'three';
import { hexCentre, neighbour, opposite, type PlacedTile } from './hexRules';

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
  /** Die Mitten der Kachel, auf der der Wind gerade ist (x, z), und der davor (z, w). */
  gustTiles: { value: new THREE.Vector4(1e4, 1e4, 1e4, 1e4) },
  /** Wie stark dort (x) und davor (y), und wohin er drückt (z, w). */
  gustPush: { value: new THREE.Vector4(0, 0, 1, 0) },
};

/** Von der Mitte einer Kachel bis zu ihrer Kante, in Metern (`hexView.HEX_WIDTH` / 2). */
const APOTHEM = 1.5;

/**
 * **Wiegen im Wind** — die Spitze weicht aus, der Fuß bleibt stehen: Der Weg
 * wächst mit dem Quadrat der Höhe über dem Brett. **Nur auf der Kachel, auf
 * der der Wind gerade ist** (und ausklingend auf der davor) — gewünscht:
 * _„Der Wind soll nur Felder beeinflussen, wenn er auf dessen Feld gerade
 * ist."_ Wo ein Baum steht, sagt sein Fuß (`instanceMatrix[3]`); in der
 * Kachel ist er, wenn er näher an ihrer Mitte als an jeder ihrer drei
 * Kantenachsen ist. Nur in Bündeln: Die Kachel in der Hand bleibt still.
 */
export function swayMaterial<M extends THREE.Material>(material: M, bend: number): M {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHexTime = ANIM.time;
    shader.uniforms.uHexAnim = ANIM.on;
    shader.uniforms.uHexGustTiles = ANIM.gustTiles;
    shader.uniforms.uHexGustPush = ANIM.gustPush;
    shader.uniforms.uHexBend = { value: bend };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uHexTime;
        uniform float uHexAnim;
        uniform vec4 uHexGustTiles;
        uniform vec4 uHexGustPush;
        uniform float uHexBend;
        float hexInside(vec2 d) {
          float m = max(abs(d.x), max(abs(dot(d, vec2(0.5, 0.8660254))), abs(dot(d, vec2(-0.5, 0.8660254)))));
          return step(m, ${APOTHEM.toFixed(2)});
        }`,
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
            float wind = uHexGustPush.x * hexInside(foot - uHexGustTiles.xy)
              + uHexGustPush.y * hexInside(foot - uHexGustTiles.zw);
            float flutter = 0.7 + 0.3 * sin(uHexTime * 6.0 + phase);
            mvPosition.xz += uHexGustPush.zw * wind * flutter * uHexBend * h * h * uHexAnim;
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

/** Wie lange es zwischen zwei Windstößen ruhig bleibt, in Sekunden. */
const CALM = [4, 9] as const;
/** Wie lang die weiße Spur hinter dem Wind ist, in Metern (vor dem Zoom). */
const TRAIL = 3;
const TRAIL_POINTS = 96;

/**
 * **Der Wind — eine Front, von Kachel zu Kachel.** Gewünscht: _„Lass nur eine
 * Windfront bewegen entlang der Hex-Tiles, der Wind bewegt sich von Feld zu
 * Feld mit einer allgemeinen Richtung (z.B. Süd nach Nord) und hat auf den
 * Feldern eine 50%-Chance, links oder rechts abzuweichen."_
 *
 * Jeder Windstoß bekommt eine Hauptrichtung zwischen zwei Nachbarkanten
 * (sechs Möglichkeiten, eine Ecke der Kachel). Er tritt an der Rückseite des
 * Bretts herein, läuft auf jeder Kachel von der Kante, an der er kam, in
 * einem Bogen durch die Mitte zu einer der beiden Kanten nach vorn — je zur
 * Hälfte links oder rechts — und hinter der Vorderseite des Bretts hinaus.
 * Hinter ihm zieht eine weiße Spur. Er läuft mit `FLOW_SPEED`, so schnell
 * wie das Wasser.
 */
export class WindGusts {
  readonly root = new THREE.Group();
  private readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly positions = new Float32Array(TRAIL_POINTS * 2 * 3);
  private readonly alphas = new Float32Array(TRAIL_POINTS * 2);
  /** Die Spur, neuester Punkt vorn. */
  private readonly trail: THREE.Vector2[] = [];
  private calm = 2;
  private running = false;
  /** Die Hauptrichtung: zwischen Kante `forward` und `forward + 1`. */
  private forward = 0;
  private cell = { q: 0, r: 0 };
  private from = new THREE.Vector2();
  private exit = 0;
  private t = 0;
  private length = 1;
  private beyond = 0;
  private size = 1;
  /** Wie lang die Spur sein darf, in Metern — schrumpft, wenn der Wind vom Brett ist. */
  private keep = 0;
  private readonly head = new THREE.Vector2();

  constructor(private readonly width: number) {
    this.root.name = 'hexland-wind';
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    const index: number[] = [];
    for (let i = 0; i < TRAIL_POINTS - 1; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geometry.setIndex(index);
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        vertexShader: `attribute float aAlpha;
          varying float vAlpha;
          void main() {
            vAlpha = aAlpha;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `varying float vAlpha;
          void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha); }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    this.mesh.visible = false;
    this.root.add(this.mesh);
  }

  /**
   * Einmal je Bild. `tiles` ist das Brett; `size` wächst, je weiter man
   * herausgezoomt ist — die Spur wird breiter, damit man sie noch sieht.
   */
  update(dt: number, on: boolean, tiles: ReadonlyMap<string, PlacedTile>, size: number): void {
    ANIM.on.value = on ? 1 : 0;
    const push = ANIM.gustPush.value;
    if (!on) {
      this.running = false;
      this.trail.length = 0;
      this.mesh.visible = false;
      push.x = push.y = 0;
      return;
    }
    ANIM.time.value += dt;
    this.size = size;
    // Die Kachel davor klingt aus, die jetzige schwillt an.
    push.y = Math.max(0, push.y - dt / 0.8);
    if (this.running) this.advance(dt);
    else {
      push.x = Math.max(0, push.x - dt / 0.8);
      this.calm -= dt;
      if (this.calm <= 0 && tiles.size > 0) this.start(tiles);
      // Ohne Kopf holt der Schwanz der Spur auf, bis nichts mehr übrig ist.
      this.keep -= FLOW_SPEED * this.size * dt;
      this.trim();
    }
    this.drawTrail();
  }

  private start(tiles: ReadonlyMap<string, PlacedTile>): void {
    this.forward = Math.floor(Math.random() * 6);
    const dir = this.direction();
    // Die hinterste Kachel des Bretts, eine davon, wenn mehrere gleich weit hinten liegen.
    let least = Infinity;
    let most = -Infinity;
    const along = (q: number, r: number): number => {
      const c = hexCentre(q, r, this.width);
      return c.x * dir.x + c.z * dir.y;
    };
    for (const t of tiles.values()) {
      least = Math.min(least, along(t.q, t.r));
      most = Math.max(most, along(t.q, t.r));
    }
    const back = [...tiles.values()].filter((t) => along(t.q, t.r) <= least + this.width * 0.6);
    const first = back[Math.floor(Math.random() * back.length)]!;
    const behind = opposite(this.forward + (Math.random() < 0.5 ? 0 : 1)) % 6;
    this.cell = neighbour(first, behind);
    this.beyond = most + this.width;
    const c = hexCentre(this.cell.q, this.cell.r, this.width);
    this.from.set(c.x - dir.x * this.width * 0.5, c.z - dir.y * this.width * 0.5);
    this.pickExit();
    this.running = true;
    this.trail.length = 0;
    this.head.copy(this.from);
  }

  /** Links oder rechts der Hauptrichtung, je zur Hälfte. */
  private pickExit(): void {
    this.exit = (this.forward + (Math.random() < 0.5 ? 0 : 1)) % 6;
    const c = hexCentre(this.cell.q, this.cell.r, this.width);
    const x = this.edgePoint(c, this.exit);
    // Länge des Bogens, grob: Eingang → Mitte → Ausgang.
    this.length =
      Math.hypot(c.x - this.from.x, c.z - this.from.y) + Math.hypot(x.x - c.x, x.y - c.z);
    this.t = 0;
    const tiles = ANIM.gustTiles.value;
    tiles.x = c.x;
    tiles.y = c.z;
  }

  private advance(dt: number): void {
    this.t += (FLOW_SPEED * this.size * dt) / this.length;
    const push = ANIM.gustPush.value;
    if (this.t >= 1) {
      // Auf die nächste Kachel: Die jetzige wird die davor.
      const c = hexCentre(this.cell.q, this.cell.r, this.width);
      this.from.copy(this.edgePoint(c, this.exit));
      const g = ANIM.gustTiles.value;
      g.z = g.x;
      g.w = g.y;
      push.y = push.x;
      push.x = 0;
      this.cell = neighbour(this.cell, this.exit);
      const n = hexCentre(this.cell.q, this.cell.r, this.width);
      const dir = this.direction();
      if (n.x * dir.x + n.z * dir.y > this.beyond) {
        this.running = false;
        this.calm = CALM[0] + Math.random() * (CALM[1] - CALM[0]);
        return;
      }
      this.pickExit();
    }
    const c = hexCentre(this.cell.q, this.cell.r, this.width);
    const x = this.edgePoint(c, this.exit);
    const t = Math.min(1, this.t);
    const a = (1 - t) * (1 - t);
    const b = 2 * t * (1 - t);
    const d = t * t;
    const prevX = this.head.x;
    const prevZ = this.head.y;
    this.head.set(a * this.from.x + b * c.x + d * x.x, a * this.from.y + b * c.z + d * x.y);
    // Auf der Kachel kommt er an, schwillt an und drückt in seine Laufrichtung.
    push.x = Math.min(1, push.x + dt / 0.6);
    const mx = this.head.x - prevX;
    const mz = this.head.y - prevZ;
    const m = Math.hypot(mx, mz);
    if (m > 1e-4 && m < 1) {
      push.z = mx / m;
      push.w = mz / m;
    }
    const last = this.trail[0];
    if (!last || last.distanceTo(this.head) > 0.04 * this.size) {
      this.trail.unshift(this.head.clone());
      this.keep = TRAIL * this.size;
      this.trim();
    }
  }

  /** Die Spur auf `keep` Meter kürzen, vom Schwanz her. */
  private trim(): void {
    let budget = this.keep;
    for (let i = 1; i < this.trail.length; i++) {
      budget -= this.trail[i]!.distanceTo(this.trail[i - 1]!);
      if (budget < 0 || i >= TRAIL_POINTS) {
        this.trail.length = i;
        break;
      }
    }
    if (this.keep <= 0) this.trail.length = 0;
  }

  private drawTrail(): void {
    const n = this.trail.length;
    this.mesh.visible = n > 1;
    if (n < 2) return;
    const y = 0.35 * Math.min(this.size, 2);
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const k = Math.min(i, n - 1);
      const p = this.trail[k]!;
      const q = this.trail[Math.min(k + 1, n - 1)]!;
      const o = this.trail[Math.max(k - 1, 0)]!;
      let dx = o.x - q.x;
      let dz = o.y - q.y;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l;
      dz /= l;
      const u = k / (n - 1);
      const w = (0.07 * (1 - u) + 0.015) * this.size;
      const alpha = i < n ? Math.pow(1 - u, 1.3) * Math.min(1, u * 20) * 0.85 : 0;
      for (const side of [0, 1]) {
        const s = side === 0 ? -w : w;
        const j = (i * 2 + side) * 3;
        this.positions[j] = p.x - dz * s;
        this.positions[j + 1] = y;
        this.positions[j + 2] = p.y + dx * s;
        this.alphas[i * 2 + side] = alpha;
      }
    }
    this.mesh.geometry.getAttribute('position').needsUpdate = true;
    this.mesh.geometry.getAttribute('aAlpha').needsUpdate = true;
  }

  /** Die Hauptrichtung als Vektor (x, z): die Ecke zwischen den beiden Vorderkanten. */
  private direction(): THREE.Vector2 {
    const a = ((this.forward * 60 + 30) * Math.PI) / 180;
    return new THREE.Vector2(Math.cos(a), Math.sin(a));
  }

  /** Die Mitte der Kante `edge` einer Kachel mit Mitte `c`. */
  private edgePoint(c: { x: number; z: number }, edge: number): THREE.Vector2 {
    const a = (edge * Math.PI) / 3;
    return new THREE.Vector2(
      c.x + Math.cos(a) * this.width * 0.5,
      c.z + Math.sin(a) * this.width * 0.5,
    );
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    ANIM.gustPush.value.set(0, 0, 1, 0);
  }
}
