import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { createPropShape } from '../portal/props';
import { GROUND_THICKNESS, GROUND_TOP, createSky } from '../shared/environment';
import type { WorldContext } from '../../core/types';
import { TextPlane } from '../../ui/TextPlane';
import type { Handedness } from '../../core/XRInput';
import {
  LANDING,
  LAUNCH_HEIGHT,
  LAUNCH_SITE,
  SNOW_LINE,
  SUMMIT,
  SUMMIT_HEIGHT,
  TREE_LINE,
  alpsHeight,
  alpsSlope,
  sampleAlps,
  samplePosition,
  type TerrainSamples,
} from './alpsTerrain';

/** Farben des Geländes, von unten nach oben. */
const MEADOW = new THREE.Color(0x5f9a48);
const FOREST = new THREE.Color(0x3e7a3a);
const ROCK = new THREE.Color(0x8b8680);
const SNOW = new THREE.Color(0xf4f7fb);

/** Wo die Alm steht: am Rand der Landewiese, mit Blick auf den Berg. */
const HUT = { x: 62, z: 262, yaw: -0.6 };
/** Wie viele Bäume in den Wald kommen. */
const TREE_COUNT = 900;

const _color = new THREE.Color();
const _matrix = new THREE.Matrix4();
const _point = new THREE.Vector3();
const _normal = new THREE.Vector3();

/**
 * Die Alpen: ein großer Berg, ein paar kleinere drum herum, und ein Tal, in
 * das man hinuntersegelt.
 *
 * Die Welt gibt es wegen zweier Werkzeuge — dem **Hängegleiter** und den
 * **Flügeln** —, und beide brauchen dasselbe: Höhe, die man verlieren kann.
 * Also fängt man oben an, auf einer **Startrampe** unterhalb des Gipfels, mit
 * dem Gleiter an der linken und den Flügeln an der rechten Hüfte, und unten im
 * Tal liegt eine **Landewiese** mit Windsack. Wer lieber läuft, läuft: das
 * Gelände ist begehbar, bis es zu steil wird, und ein **Gipfelkreuz** steht
 * dort, wo es wirklich am höchsten ist.
 *
 * Das Gelände ist ein Höhenfeld (`alpsTerrain.ts`, mit Test) — eine Höhe je
 * Punkt, aus Glockenkurven und Rauschen. Das Mesh und der Physik-Collider
 * lesen dieselben Zahlen, deshalb steht man nie neben dem, was man sieht.
 * Portale gibt es hier keine Flächen für: ein Berg hat keine Wände.
 */
export class AlpsWorld extends PortalWorld {
  private readonly wood = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.85 });
  private readonly darkWood = new THREE.MeshStandardMaterial({
    color: 0x4e3a26,
    roughness: 0.9,
  });
  private readonly stone = new THREE.MeshStandardMaterial({ color: 0x8b8680, roughness: 0.95 });
  private samples: TerrainSamples | null = null;
  /** Der Himmel — er wandert mit dem Kopf, siehe `update`. */
  private sky: THREE.Mesh | null = null;

  protected override horizonColor(): number | null {
    // Das Gelände ist der Boden — bis an den Rand der Karte.
    return null;
  }

  protected override skyColor(): number {
    return 0x8ec5f2;
  }

  protected override lightIntensity(): number {
    return 1.05;
  }

  protected override spawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(LAUNCH_SITE.x, LAUNCH_HEIGHT + 0.05, LAUNCH_SITE.z - 3);
  }

  protected override spawnYaw(): number {
    // Mit dem Rücken zum Gipfel, Blick über die Rampe ins Tal (+Z).
    return Math.PI;
  }

  protected override welcome(): string {
    return 'Alpen · Hängegleiter links, Flügel rechts · Trigger = Anlauf über die Rampe';
  }

  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [
      ['hang-glider', 'left'],
      ['wings', 'right'],
    ];
  }

  protected override buildEnvironment(): void {
    const alps = new THREE.Group();
    alps.name = 'alps';
    this.root.add(alps);

    this.sky = createSky(0x6fb0ee, 0xe4eef7, 680);
    alps.add(this.sky);
    // Dunst in der Ferne: die Kante der Karte löst sich im Himmel auf, statt
    // als Linie dazustehen — und ein ferner Berg sieht nach Ferne aus.
    if (this.context) this.context.scene.fog = new THREE.Fog(0xd6e4f2, 260, 680);

    const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
    sun.position.set(-180, 260, 120);
    alps.add(sun);

    this.buildTerrain(alps);
    this.buildPlain(alps);
    this.buildForest(alps);
    this.buildLaunch(alps);
    this.buildSummit(alps);
    this.buildLanding(alps);
    this.buildHut(alps);
    this.buildProps();
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    // Der Himmel steht um den Kopf, nicht um den Ursprung: wer vom Gipfel aus
    // dreihundert Meter weit sieht, sähe sonst die Kugel von innen an ihrer
    // Naht — und wer über den Rand fliegt, käme aus ihr heraus. Die Höhe
    // bleibt bei null, damit der Horizont des Farbverlaufs der Horizont
    // bleibt und nicht mit dem Steigen wandert.
    if (this.sky) {
      ctx.rig.getHeadPosition(_point);
      this.sky.position.set(_point.x, 0, _point.z);
    }
  }

  /** Ein paar Kisten an der Alm — zum Werfen ins Tal, wenn man schon oben ist. */
  protected override buildProps(): void {
    const physics = this.physics!;
    let index = 0;
    for (const [dx, dz, kind] of [
      [4.2, 1.5, 'cube'],
      [4.9, 2.4, 'block'],
      [3.6, 2.9, 'sphere'],
      [-4.4, 2.2, 'cylinder'],
    ] as const) {
      const blueprint = createPropShape(kind);
      blueprint.mesh.userData.propKind = kind;
      const x = HUT.x + dx;
      const z = HUT.z + dz;
      blueprint.mesh.position.set(x, alpsHeight(x, z) + blueprint.halfExtents.y + 0.05, z);
      this.root.add(blueprint.mesh);
      this.registerProp(
        physics.addDynamic(blueprint.mesh, {
          shape: blueprint.shape,
          halfExtents: blueprint.halfExtents,
          mass: blueprint.mass,
          friction: 0.8,
          restitution: 0.05,
          ccd: blueprint.ccd ?? false,
        }),
        `alps-prop-${index++}`,
      );
    }
  }

  // --- das Gelände -----------------------------------------------------------

  /**
   * Das Gelände: ein Netz aus den abgetasteten Höhen, gefärbt nach Höhe und
   * Steigung — Wiese, Wald, Fels, Schnee —, und darunter ein Höhenfeld mit
   * genau denselben Zahlen.
   */
  private buildTerrain(parent: THREE.Object3D): void {
    const samples = sampleAlps();
    this.samples = samples;
    const n = samples.cells + 1;

    const positions = new Float32Array(n * n * 3);
    const colors = new Float32Array(n * n * 3);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const at = i * n + j;
        const { x, z } = samplePosition(samples, i, j);
        const y = samples.heights[i + j * n]!;
        positions[at * 3] = x;
        positions[at * 3 + 1] = y;
        positions[at * 3 + 2] = z;
        terrainColor(y, alpsSlope(x, z, 4), _color);
        colors[at * 3] = _color.r;
        colors[at * 3 + 1] = _color.g;
        colors[at * 3 + 2] = _color.b;
      }
    }
    const indices = new Uint32Array(samples.cells * samples.cells * 6);
    let k = 0;
    for (let i = 0; i < samples.cells; i++) {
      for (let j = 0; j < samples.cells; j++) {
        const a = i * n + j;
        const b = a + 1;
        const c = a + n;
        const d = c + 1;
        // Gegen den Uhrzeigersinn von oben gesehen: die Oberseite schaut nach oben.
        indices[k++] = a;
        indices[k++] = c;
        indices[k++] = b;
        indices[k++] = b;
        indices[k++] = c;
        indices[k++] = d;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const terrain = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
    );
    terrain.name = 'terrain';
    terrain.receiveShadow = true;
    // Ein Strahl durch fünfzigtausend Dreiecke ist ohne Beschleunigung eine
    // Millisekunde je Versuch, und der Teleporter fragt jedes Bild. Ein
    // Höhenfeld kann das billiger: am Strahl entlanglaufen, bis er unter die
    // Höhe fällt.
    terrain.raycast = (raycaster, intersects) =>
      this.raycastTerrain(terrain, raycaster, intersects);
    parent.add(terrain);
    terrain.updateWorldMatrix(true, false);
    this.solids.push(terrain);
    this.physics!.addHeightfield(terrain, {
      rows: samples.cells,
      cols: samples.cells,
      heights: samples.heights,
      width: samples.size,
      depth: samples.size,
    });
  }

  /**
   * Die Ebene jenseits der Karte: Wiese bis zum Horizont, damit hinter der
   * Kante kein Nichts ist. Das Gelände läuft am Rand auf null aus, und hier
   * geht es auf derselben Höhe weiter — und trägt, wer dort landet.
   */
  private buildPlain(parent: THREE.Object3D): void {
    const plain = new THREE.Mesh(
      new THREE.BoxGeometry(4000, GROUND_THICKNESS, 4000),
      new THREE.MeshStandardMaterial({ color: MEADOW, roughness: 0.95 }),
    );
    plain.name = 'plain';
    plain.position.y = GROUND_TOP - GROUND_THICKNESS / 2;
    parent.add(plain);
    plain.updateWorldMatrix(true, false);
    this.solids.push(plain);
    this.physics!.addStatic(plain, { friction: 0.9 });
  }

  /** Die Höhe des abgetasteten Geländes an einem Punkt, zwischen den Werten linear. */
  private sampledHeight(x: number, z: number): number | null {
    const samples = this.samples;
    if (!samples) return null;
    const half = samples.size / 2;
    if (x < -half || x > half || z < -half || z > half) return null;
    const n = samples.cells + 1;
    const fj = ((x + half) / samples.size) * samples.cells;
    const fi = ((z + half) / samples.size) * samples.cells;
    const j = Math.min(samples.cells - 1, Math.floor(fj));
    const i = Math.min(samples.cells - 1, Math.floor(fi));
    const tj = fj - j;
    const ti = fi - i;
    const h = (ii: number, jj: number) => samples.heights[ii + jj * n]!;
    const top = h(i, j) * (1 - tj) + h(i, j + 1) * tj;
    const bottom = h(i + 1, j) * (1 - tj) + h(i + 1, j + 1) * tj;
    return top * (1 - ti) + bottom * ti;
  }

  private raycastTerrain(
    terrain: THREE.Mesh,
    raycaster: THREE.Raycaster,
    intersects: THREE.Intersection[],
  ): void {
    const samples = this.samples;
    if (!samples) return;
    const ray = raycaster.ray;
    const step = (samples.size / samples.cells) * 0.5;
    const far = Math.min(raycaster.far, 2000);
    let previous = raycaster.near;
    let wasAbove: boolean | null = null;
    for (let t = raycaster.near; t <= far; t += step) {
      ray.at(t, _point);
      const ground = this.sampledHeight(_point.x, _point.z);
      if (ground === null) {
        wasAbove = null;
        previous = t;
        continue;
      }
      const above = _point.y >= ground;
      if (wasAbove === true && !above) {
        // Zwischen `previous` und `t` schneidet der Strahl das Gelände: halbieren.
        let lo = previous;
        let hi = t;
        for (let n = 0; n < 10; n++) {
          const mid = (lo + hi) / 2;
          ray.at(mid, _point);
          const h = this.sampledHeight(_point.x, _point.z) ?? -Infinity;
          if (_point.y >= h) lo = mid;
          else hi = mid;
        }
        const distance = (lo + hi) / 2;
        ray.at(distance, _point);
        const dx = alpsHeight(_point.x + 1, _point.z) - alpsHeight(_point.x - 1, _point.z);
        const dz = alpsHeight(_point.x, _point.z + 1) - alpsHeight(_point.x, _point.z - 1);
        _normal.set(-dx / 2, 1, -dz / 2).normalize();
        intersects.push({
          distance,
          point: _point.clone(),
          object: terrain,
          face: { a: 0, b: 0, c: 0, normal: _normal.clone(), materialIndex: 0 },
        });
        return;
      }
      wasAbove = above;
      previous = t;
    }
  }

  /**
   * Der Wald: Fichten aus zwei Kegeln und einem Stamm, als Instanzen — neun
   * hundert einzelne Meshes wären neunhundert Zeichenaufrufe. Sie stehen
   * unterhalb der Baumgrenze, nicht auf der Wiese, nicht auf der Rampe und
   * nicht im Steilen.
   */
  private buildForest(parent: THREE.Object3D): void {
    const random = seeded(19);
    const placements: Array<{ x: number; y: number; z: number; scale: number }> = [];
    let attempts = 0;
    while (placements.length < TREE_COUNT && attempts++ < TREE_COUNT * 8) {
      const x = (random() - 0.5) * 940;
      const z = (random() - 0.5) * 940;
      const y = alpsHeight(x, z);
      if (y > TREE_LINE) continue;
      if (alpsSlope(x, z) > 0.85) continue;
      if (Math.hypot(x - LANDING.x, z - LANDING.z) < LANDING.radius + 20) continue;
      if (Math.hypot(x - LAUNCH_SITE.x, z - LAUNCH_SITE.z) < 40) continue;
      if (Math.hypot(x - HUT.x, z - HUT.z) < 14) continue;
      // Oben lichter: kurz unter der Baumgrenze steht nur noch jeder dritte.
      if (y > TREE_LINE - 40 && random() < 0.65) continue;
      placements.push({ x, y, z, scale: 0.75 + random() * 0.7 });
    }

    const trunkGeometry = new THREE.CylinderGeometry(0.22, 0.32, 2.2, 6);
    trunkGeometry.translate(0, 1.1, 0);
    const crownGeometry = new THREE.ConeGeometry(2.2, 7, 7);
    crownGeometry.translate(0, 4.9, 0);
    const trunks = new THREE.InstancedMesh(trunkGeometry, this.darkWood, placements.length);
    const crowns = new THREE.InstancedMesh(
      crownGeometry,
      new THREE.MeshStandardMaterial({ color: 0x2f6b34, roughness: 0.95 }),
      placements.length,
    );
    trunks.name = 'trunks';
    crowns.name = 'crowns';
    placements.forEach((tree, index) => {
      _matrix.makeRotationY(random() * Math.PI * 2);
      _matrix.scale(new THREE.Vector3(tree.scale, tree.scale, tree.scale));
      _matrix.setPosition(tree.x, tree.y - 0.1, tree.z);
      trunks.setMatrixAt(index, _matrix);
      crowns.setMatrixAt(index, _matrix);
    });
    parent.add(trunks, crowns);
  }

  // --- die Orte ----------------------------------------------------------------

  /**
   * Die Startrampe: ein Holzsteg, der über die Kante des Plateaus hinausragt
   * und leicht abfällt. Man läuft ihn hinunter — oder nimmt den Trigger —,
   * und am Ende ist kein Boden mehr, nur Tal.
   */
  private buildLaunch(parent: THREE.Object3D): void {
    const site = new THREE.Group();
    site.name = 'launch';
    site.position.set(LAUNCH_SITE.x, LAUNCH_HEIGHT, LAUNCH_SITE.z);
    parent.add(site);
    site.updateWorldMatrix(true, false);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 12), this.wood);
    deck.position.set(0, 0.02, 9);
    deck.rotation.x = 0.14;
    deck.name = 'launch-deck';
    site.add(deck);
    deck.updateWorldMatrix(true, false);
    this.solids.push(deck);
    this.physics!.addStatic(deck, { friction: 0.9 });

    // Geländer an beiden Seiten — nicht zum Festhalten, zum Sehen, wo der
    // Steg ist. Vorne offen: da geht es los.
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 11.6), this.darkWood);
      rail.position.set(side * 2.05, 1.0, 9);
      rail.rotation.x = 0.14;
      site.add(rail);
      for (const z of [3.6, 8.5, 13.4]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.05, 0.1), this.darkWood);
        post.position.set(side * 2.05, 0.5 - (z - 9) * 0.14, z);
        site.add(post);
      }
    }
    // Stützen unter dem Ende, ins Gelände hinein.
    for (const [x, z] of [
      [-1.8, 13.5],
      [1.8, 13.5],
      [-1.8, 8],
      [1.8, 8],
    ] as const) {
      const ground = alpsHeight(LAUNCH_SITE.x + x, LAUNCH_SITE.z + z) - LAUNCH_HEIGHT;
      const top = -(z - 9) * 0.14 - 0.07;
      const length = Math.max(0.3, top - ground + 0.5);
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, length, 8),
        this.darkWood,
      );
      strut.position.set(x, top - length / 2, z);
      site.add(strut);
    }

    const sign = new TextPlane({
      width: 2.6,
      height: 0.95,
      title: 'Startrampe',
      body: 'Hängegleiter von der linken Hüfte, dann Trigger: Anlauf über die Kante. Bügel ziehen = schneller, drücken = langsamer, schieben = Kurve. Flügel: beide Arme schlagen.',
      accent: 0xff8a2f,
    });
    sign.position.set(-3.2, 1.7, 1.5);
    sign.rotation.y = Math.PI * 0.75;
    site.add(sign);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), this.darkWood);
    post.position.set(-3.2, 0.7, 1.5);
    site.add(post);

    // Eine Bank für die, die erst einmal schauen.
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.45), this.wood);
    bench.position.set(3.4, 0.46, 0.5);
    bench.rotation.y = -0.4;
    site.add(bench);
    for (const side of [-0.7, 0.7]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.4), this.darkWood);
      leg.position.set(3.4 + side * Math.cos(-0.4), 0.22, 0.5 - side * Math.sin(-0.4));
      leg.rotation.y = -0.4;
      site.add(leg);
    }
  }

  /** Das Gipfelkreuz: dort, wo es wirklich am höchsten ist. */
  private buildSummit(parent: THREE.Object3D): void {
    const summit = new THREE.Group();
    summit.name = 'summit';
    summit.position.set(SUMMIT.x, SUMMIT_HEIGHT, SUMMIT.z);
    parent.add(summit);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.5, 8), this.stone);
    base.position.y = 0.2;
    summit.add(base);
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.6, 0.18), this.wood);
    upright.position.y = 2.2;
    summit.add(upright);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.18), this.wood);
    arm.position.y = 3.1;
    summit.add(arm);
    summit.updateWorldMatrix(true, false);
    base.updateWorldMatrix(true, false);
    this.solids.push(base);
    this.physics!.addStatic(base);

    const sign = new TextPlane({
      width: 1.6,
      height: 0.5,
      title: `Gipfel · ${Math.round(SUMMIT_HEIGHT)} m`,
      body: 'Über dem Tal. Von hier aus geht es nur noch runter.',
      accent: 0xf4f7fb,
    });
    sign.position.set(0, 1.35, 0.3);
    sign.lookAt(LAUNCH_SITE.x, SUMMIT_HEIGHT + 1.35, LAUNCH_SITE.z);
    summit.add(sign);
  }

  /** Die Landewiese: ein Ring auf dem Gras und ein Windsack, der die Richtung zeigt. */
  private buildLanding(parent: THREE.Object3D): void {
    const field = new THREE.Group();
    field.name = 'landing';
    field.position.set(LANDING.x, LANDING.height, LANDING.z);
    parent.add(field);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(14, 16, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    field.add(ring);
    const inner = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false }),
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.06;
    field.add(inner);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 6, 8), this.stone);
    mast.position.set(22, 3, 4);
    field.add(mast);
    const sock = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 2.4, 10, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0xff7a2f,
        side: THREE.DoubleSide,
        roughness: 0.9,
      }),
    );
    // Der Wind kommt aus dem Tal und der Sack zeigt zum Berg: die Spitze des
    // Kegels (+Y) nach -Z gedreht, die Öffnung am Mast.
    sock.rotation.x = -Math.PI / 2;
    sock.position.set(22, 5.9, 4 - 1.2);
    field.add(sock);

    const sign = new TextPlane({
      width: 2.4,
      height: 0.7,
      title: 'Landewiese',
      body: 'Gegen den Berg anfliegen, Bügel drücken, aufsetzen. Die Alm ist gleich nebenan.',
      accent: 0x5ee0a0,
    });
    sign.position.set(-18, 1.6, 6);
    sign.lookAt(LANDING.x, LANDING.height + 1.6, LANDING.z);
    field.add(sign);
  }

  /** Die Alm: eine Hütte am Rand der Wiese, mit Blick auf den Berg. */
  private buildHut(parent: THREE.Object3D): void {
    const hut = new THREE.Group();
    hut.name = 'hut';
    const y = alpsHeight(HUT.x, HUT.z);
    hut.position.set(HUT.x, y, HUT.z);
    hut.rotation.y = HUT.yaw;
    parent.add(hut);
    hut.updateWorldMatrix(true, false);

    const plaster = new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.9 });
    this.slab(hut, this.stone, [7.4, 0.5, 5.4], [0, 0.2, 0], false);
    this.slab(hut, plaster, [7, 2.6, 5], [0, 1.75, 0], false);
    // Das Dach: zwei schräge Platten, Holz.
    for (const side of [-1, 1]) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.16, 3.4), this.darkWood);
      roof.position.set(0, 3.55, side * 1.35);
      roof.rotation.x = -side * 0.5;
      hut.add(roof);
    }
    const gable = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 0.3), this.wood);
    gable.position.set(0, 3.5, 0);
    hut.add(gable);

    const sign = new TextPlane({
      width: 2.2,
      height: 0.7,
      title: 'Alm',
      body: 'Kisten stehen daneben. Der Weg nach oben ist weit — die Rampe liegt am großen Berg.',
      accent: 0xffc857,
    });
    sign.position.set(0, 2.2, 2.62);
    hut.add(sign);

    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.45), this.wood);
    bench.position.set(-1.6, 0.9, 2.95);
    hut.add(bench);
    bench.updateWorldMatrix(true, false);
    this.solids.push(bench);
    this.physics!.addStatic(bench);
  }
}

/** Wiese unten, Wald in der Mitte, Fels wo es steil ist, Schnee ganz oben. */
function terrainColor(height: number, slope: number, target: THREE.Color): THREE.Color {
  target.copy(MEADOW);
  target.lerp(FOREST, THREE.MathUtils.smoothstep(height, 20, 90));
  target.lerp(ROCK, THREE.MathUtils.smoothstep(height, TREE_LINE - 20, TREE_LINE + 30));
  // Steil ist Fels, egal wie hoch.
  target.lerp(ROCK, THREE.MathUtils.smoothstep(slope, 0.55, 0.95));
  const snow = THREE.MathUtils.smoothstep(height, SNOW_LINE - 15, SNOW_LINE + 25);
  // Auf Steilhängen bleibt der Schnee nicht liegen.
  target.lerp(SNOW, snow * (1 - THREE.MathUtils.smoothstep(slope, 0.8, 1.3)));
  return target;
}

/** Zufall mit Gedächtnis: derselbe Wald bei jedem Besuch und bei allen Mitspielern. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
