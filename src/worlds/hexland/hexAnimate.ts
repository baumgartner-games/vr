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
 * `hexDressing.riverFlow`): je Weg der Kachel (ein Arm herein, einer hinaus)
 * zählt `S` den Fluss hinab, in Halbmessern der Kachel — an der Kante zweier
 * Kacheln auf beiden Seiten dasselbe, die Wellen laufen ohne Sprung hinüber.
 * An Gabelungen gibt es mehrere Wege; jeder Punkt mischt sie nach seiner
 * Nähe zu ihnen. Gemeldet war eine keilförmige Naht, wo vorher hart der
 * nächste Weg galt. Seen und Ufer glitzern still vor sich hin, langsam.
 */
export const WATER_FRAGMENT = `
  {
    float blue = smoothstep(0.06, 0.22, diffuseColor.b - max(diffuseColor.r, diffuseColor.g * 0.9));
    vec2 w = vHexWorld;
    float t = uHexTime;
    float glint;
    if (vFlow.w > 1.5) {
      vec2 p = vHexLocal.xz;
      // Etwas quer verwirbelt, damit es keine Streifen wie gezogen sind.
      float n = sin(w.x * 2.3 + w.y * 1.9) * 0.8 + sin(w.y * 3.1 - w.x * 1.3) * 0.6;
      float k = 3.5;
      float drift = t * k * ${(FLOW_SPEED / 1.5).toFixed(4)};
      // Gibt es Arme beider Richtungen? Sonst gilt jeder als Anfang eines Weges.
      float anyIn = 0.0;
      float anyOut = 0.0;
      for (int e = 0; e < 6; e++) {
        anyIn += mod(floor(vFlow.x / exp2(float(e)) + 0.01), 2.0);
        anyOut += mod(floor(vFlow.y / exp2(float(e)) + 0.01), 2.0);
      }
      bool mixed = anyIn > 0.5 && anyOut > 0.5;
      // **Jeder Weg herein → hinaus** einer Kachel bekommt seine Wellen; wo
      // mehrere Wege nah sind (Gabelungen), wird weich zwischen ihnen
      // überblendet — sonst stieße eine Naht mitten durchs Wasser.
      float sum = 0.0;
      float weight = 0.0;
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float iin = mod(floor(vFlow.x / exp2(fi) + 0.01), 2.0);
        float iout = mod(floor(vFlow.y / exp2(fi) + 0.01), 2.0);
        if ((mixed ? iin : iin + iout) < 0.5) continue;
        for (int o = 0; o < 6; o++) {
          if (o == i) continue;
          float fo = float(o);
          float oout = mod(floor(vFlow.y / exp2(fo) + 0.01), 2.0);
          float oin = mod(floor(vFlow.x / exp2(fo) + 0.01), 2.0);
          if ((mixed ? oout : (o > i ? oin + oout : 0.0)) < 0.5) continue;
          vec2 ni = vec2(cos(fi * 1.0471976), sin(fi * 1.0471976));
          vec2 no = vec2(cos(fo * 1.0471976), sin(fo * 1.0471976));
          float c = dot(ni, no);
          float f;
          float d;
          if (c < -0.99) {
            // Gerade durch: von der Kante herein zur Kante hinaus.
            f = 0.5 + 0.5 * dot(p, no);
            d = abs(p.x * no.y - p.y * no.x);
          } else {
            // **Im Bogen um die Ecke**: Die beiden Kanten treffen sich in O; um
            // O läuft der Fluss von der Mitte der einen Kante zur Mitte der
            // anderen, der Winkel um O ist die Strecke.
            vec2 b = normalize(ni + no);
            vec2 org = b / sqrt(0.5 + 0.5 * c);
            vec2 u = ni - org;
            vec2 v = no - org;
            vec2 q = p - org;
            float total = atan(u.x * v.y - u.y * v.x, dot(u, v));
            float here = atan(u.x * q.y - u.y * q.x, dot(u, q));
            f = here / total;
            d = abs(length(q) - length(u));
          }
          d += max(0.0, max(-f, f - 1.0)) * 2.0;
          float wgt = exp(-d * d / 0.06) + 1e-4;
          float S = vFlow.z - 1.0 + 2.0 * clamp(f, -0.3, 1.3);
          sum += wgt * sin(S * k - drift + n);
          weight += wgt;
        }
      }
      glint = weight > 0.0 ? sum / weight : 0.0;
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

/** Wie lange es zwischen zwei Windstößen ruhig bleibt, in Sekunden — kaum: Es soll immer einer wehen. */
const CALM = [0.4, 1.5] as const;
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
  private calm = 0.5;
  private running = false;
  /** Die Hauptrichtung: zwischen Kante `forward` und `forward + 1`. */
  private forward = 0;
  private cell = { q: 0, r: 0 };
  private from = new THREE.Vector2();
  private exit = 0;
  private t = 0;
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
  update(
    dt: number,
    on: boolean,
    tiles: ReadonlyMap<string, PlacedTile>,
    size: number,
    view: { x: number; z: number; r: number },
  ): void {
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
    if (this.running) {
      this.advance(dt);
      // Aus dem Bild gelaufen: gleich der nächste, im Bild.
      if (Math.hypot(this.head.x - view.x, this.head.y - view.z) > view.r * 1.15) this.stop();
    } else {
      push.x = Math.max(0, push.x - dt / 0.8);
      this.calm -= dt;
      if (this.calm <= 0 && tiles.size > 0) this.start(tiles, view);
      // Ohne Kopf holt der Schwanz der Spur auf, bis nichts mehr übrig ist.
      this.keep = Math.max(0, this.keep - FLOW_SPEED * this.size * dt);
    }
    this.drawTrail();
  }

  /**
   * **Ein neuer Windstoß, im Bild** — gewünscht: _„Wind kommt zu wenig/selten,
   * bitte häufiger. Es sollte im sichtbaren Screen immer ein Wind aktiv
   * sein."_ Er beginnt hinter der hintersten Kachel, die man gerade sieht
   * (`view`: wohin die Kamera schaut und wie weit das Bild reicht), und endet,
   * wenn er vorn aus dem Bild oder vom Brett läuft — dann kommt nach einer
   * Atempause der nächste.
   */
  private start(
    tiles: ReadonlyMap<string, PlacedTile>,
    view: { x: number; z: number; r: number },
  ): void {
    this.forward = Math.floor(Math.random() * 6);
    const dir = this.direction();
    const seen = [...tiles.values()].filter((t) => {
      const c = hexCentre(t.q, t.r, this.width);
      return Math.hypot(c.x - view.x, c.z - view.z) < view.r;
    });
    const pool = seen.length > 0 ? seen : [...tiles.values()];
    let least = Infinity;
    let most = -Infinity;
    const along = (q: number, r: number): number => {
      const c = hexCentre(q, r, this.width);
      return c.x * dir.x + c.z * dir.y;
    };
    for (const t of pool) {
      least = Math.min(least, along(t.q, t.r));
      most = Math.max(most, along(t.q, t.r));
    }
    // Eine der hintersten — quer zur Richtung verteilt, damit er nicht immer am selben Rand läuft.
    const back = pool.filter((t) => along(t.q, t.r) <= least + this.width * 1.6);
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

  /** Der Windstoß ist durch — die Spur läuft aus, der nächste kommt bald. */
  private stop(): void {
    this.running = false;
    this.calm = CALM[0] + Math.random() * (CALM[1] - CALM[0]);
  }

  /** Links oder rechts der Hauptrichtung, je zur Hälfte. */
  private pickExit(): void {
    this.exit = (this.forward + (Math.random() < 0.5 ? 0 : 1)) % 6;
    const c = hexCentre(this.cell.q, this.cell.r, this.width);
    this.t = 0;
    const tiles = ANIM.gustTiles.value;
    tiles.x = c.x;
    tiles.y = c.z;
  }

  /**
   * **Weiter auf dem Bogen** — gleichmäßig in Metern, nicht im Parameter des
   * Bogens: Der läuft in der Mitte langsamer als an den Kanten. Gemeldet:
   * _„Es wirkt, als wenn es ruckelt, zumindest der Wind. Es werden mir aber
   * 60 fps angezeigt."_
   */
  private advance(dt: number): void {
    const push = ANIM.gustPush.value;
    let left = FLOW_SPEED * this.size * dt;
    // In kleinen Schritten, damit die Geschwindigkeit auf dem Bogen stimmt.
    for (let step = 0; step < 8 && left > 1e-6; step++) {
      const speed = this.bend(this.t).length() || 1;
      const dtParam = Math.min(left / speed, 0.05);
      this.t += dtParam;
      left -= dtParam * speed;
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
          this.stop();
          return;
        }
        this.pickExit();
      }
    }
    const prevX = this.head.x;
    const prevZ = this.head.y;
    this.head.copy(this.at(this.t));
    // Auf der Kachel kommt er an, schwillt an und drückt in seine Laufrichtung.
    push.x = Math.min(1, push.x + dt / 0.6);
    const mx = this.head.x - prevX;
    const mz = this.head.y - prevZ;
    const m = Math.hypot(mx, mz);
    if (m > 1e-4 && m < 1) {
      push.z = mx / m;
      push.w = mz / m;
    }
    // Feste Punkte nur in Abständen; vorn hängt immer der Kopf selbst (`drawTrail`).
    const last = this.trail[0];
    if (!last || last.distanceTo(this.head) > 0.06 * this.size)
      this.trail.unshift(this.head.clone());
    if (this.trail.length > TRAIL_POINTS - 2) this.trail.length = TRAIL_POINTS - 2;
    this.keep = TRAIL * this.size;
  }

  /** Wo der Wind auf dieser Kachel bei `t` ist: Bogen Eingang → Mitte → Ausgang. */
  private at(t: number): THREE.Vector2 {
    const c = hexCentre(this.cell.q, this.cell.r, this.width);
    const x = this.edgePoint(c, this.exit);
    const a = (1 - t) * (1 - t);
    const b = 2 * t * (1 - t);
    const d = t * t;
    return new THREE.Vector2(
      a * this.from.x + b * c.x + d * x.x,
      a * this.from.y + b * c.z + d * x.y,
    );
  }

  /** Die Ableitung des Bogens nach `t` — wie viele Meter je Parameter. */
  private bend(t: number): THREE.Vector2 {
    const c = hexCentre(this.cell.q, this.cell.r, this.width);
    const x = this.edgePoint(c, this.exit);
    return new THREE.Vector2(
      2 * (1 - t) * (c.x - this.from.x) + 2 * t * (x.x - c.x),
      2 * (1 - t) * (c.z - this.from.y) + 2 * t * (x.y - c.z),
    );
  }

  /**
   * **Die Spur zeichnen** — vorn der Kopf, wo er gerade ist, dahinter die
   * festen Punkte, genau auf `keep` Meter gekürzt (der letzte Punkt
   * dazwischen gerechnet). Die Durchsichtigkeit folgt den Metern, nicht der
   * Zahl der Punkte — sonst springt sie, sobald ein Punkt dazukommt.
   */
  private drawTrail(): void {
    const pts: THREE.Vector2[] = this.running ? [this.head, ...this.trail] : [...this.trail];
    const cut: THREE.Vector2[] = [];
    const along: number[] = [];
    let run = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i > 0) {
        const step = pts[i]!.distanceTo(pts[i - 1]!);
        if (run + step >= this.keep) {
          const f = step > 0 ? (this.keep - run) / step : 0;
          cut.push(pts[i - 1]!.clone().lerp(pts[i]!, f));
          along.push(this.keep);
          break;
        }
        run += step;
      }
      cut.push(pts[i]!);
      along.push(run);
    }
    const n = Math.min(cut.length, TRAIL_POINTS);
    this.mesh.visible = n > 1 && this.keep > 0;
    if (!this.mesh.visible) return;
    const full = TRAIL * this.size;
    const y = 0.35 * Math.min(this.size, 2);
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const k = Math.min(i, n - 1);
      const p = cut[k]!;
      const q = cut[Math.min(k + 1, n - 1)]!;
      const o = cut[Math.max(k - 1, 0)]!;
      let dx = o.x - q.x;
      let dz = o.y - q.y;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l;
      dz /= l;
      const back = along[k]!;
      const w = (0.07 * (1 - back / full) + 0.015) * this.size;
      // Zum Ende der Spur hin aus, am Kopf kurz ein.
      const tail = Math.max(0, 1 - back / Math.max(this.keep, 1e-3));
      const alpha =
        i < n ? Math.pow(tail, 1.3) * Math.min(1, back / (0.15 * this.size) + 0.2) * 0.85 : 0;
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
