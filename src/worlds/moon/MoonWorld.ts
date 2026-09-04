import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { createPropShape } from '../portal/props';
import { TextPlane } from '../../ui/TextPlane';

/** Was der Mond zieht — ein Sechstel der Erde. */
const MOON_GRAVITY = 1.62;
/** Wie weit Krater und Felsen gestreut werden. */
const FIELD = 90;

/**
 * Der Mond: die Welt, die es wegen der Schwerkraft gibt.
 *
 * 1,62 m/s² sind kein Zahlenwert, sondern ein Gefühl — ein Sprung dauert
 * dreimal so lange, ein geworfener Stein fliegt bis zum nächsten Krater, und
 * ein Stapel Kisten fällt in Zeitlupe zusammen, ohne dass jemand die Stoppuhr
 * angefasst hätte. *Welt-Physik → Schwerkraft* kann dasselbe überall, aber ein
 * Ort, der von sich aus so ist, lädt zum Ausprobieren ein, statt es zu
 * erlauben.
 *
 * Gebaut ist er auf der Fläche bis zum Horizont, die jede Welt mitbringt:
 * darauf Krater, Felsbrocken, ein Lander als Landmarke und eine Fahne. Der
 * Himmel ist schwarz — keine Atmosphäre, kein Streulicht —, mit Sternen, die
 * auch bei Sonne stehen, und der Erde darüber, die nie untergeht.
 */
export class MoonWorld extends PortalWorld {
  private readonly dust = new THREE.MeshStandardMaterial({ color: 0x9a9a9d, roughness: 1 });
  private readonly rock = new THREE.MeshStandardMaterial({ color: 0x76767b, roughness: 0.95 });
  private readonly panel = new THREE.MeshStandardMaterial({
    color: 0xf0f2f6,
    roughness: 0.5,
    metalness: 0.15,
  });
  private readonly foil = new THREE.MeshStandardMaterial({
    color: 0xd8c16a,
    roughness: 0.35,
    metalness: 0.85,
  });

  protected override worldGravity(): number {
    return MOON_GRAVITY;
  }

  protected override horizonColor(): number {
    return 0x8f9095;
  }

  protected override horizonLine(): number {
    return 0x4a4b52;
  }

  protected override skyColor(): number {
    return 0x02030a;
  }

  protected override lightIntensity(): number {
    return 0.3;
  }

  protected override spawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 6);
  }

  protected override welcome(): string {
    return 'Mond · ein Sechstel Schwerkraft · A springt, und zwar weit';
  }

  protected override buildEnvironment(): void {
    const moon = new THREE.Group();
    moon.name = 'moon';
    this.root.add(moon);

    // Die Sonne steht flach: lange Schatten, harte Kanten — und ein Himmel, in
    // dem trotzdem nichts leuchtet, weil keine Luft da ist, die streut.
    const sun = new THREE.DirectionalLight(0xfff6e6, 2.6);
    sun.position.set(-40, 22, -30);
    moon.add(sun);
    moon.add(new THREE.AmbientLight(0x2a3040, 0.6));

    moon.add(starField());
    moon.add(earthInTheSky());
    this.buildCraters(moon);
    this.buildRocks(moon);
    this.buildLander(moon);
    this.buildProps();
  }

  /** Ein paar Steine zum Werfen — der ganze Sinn eines Sechstels g. */
  protected override buildProps(): void {
    const physics = this.physics!;
    let index = 0;
    for (const [x, z, kind] of [
      [1.6, 2.2, 'cube'],
      [-1.8, 2.6, 'sphere'],
      [2.4, 0.4, 'block'],
      [-2.6, 0.2, 'cylinder'],
      [0.4, -1.4, 'pyramid'],
    ] as const) {
      const blueprint = createPropShape(kind);
      blueprint.mesh.userData.propKind = kind;
      blueprint.mesh.position.set(x, blueprint.halfExtents.y + 0.02, z);
      this.root.add(blueprint.mesh);
      this.registerProp(
        physics.addDynamic(blueprint.mesh, {
          shape: blueprint.shape,
          halfExtents: blueprint.halfExtents,
          mass: blueprint.mass,
          friction: 0.9,
          restitution: 0.05,
          ccd: blueprint.ccd ?? false,
        }),
        `moon-prop-${index++}`,
      );
    }
  }

  /**
   * Krater: ein flacher Auswurfring um eine hellere Schüssel. Bewusst nur
   * Geometrie und kein Loch — ein echtes Loch bräuchte eines in der Fläche bis
   * zum Horizont, und dann fiele man hindurch.
   */
  private buildCraters(parent: THREE.Object3D): void {
    const random = seeded(7);
    const bowl = new THREE.MeshStandardMaterial({ color: 0x7d7e84, roughness: 1 });
    for (let i = 0; i < 14; i++) {
      const radius = 3 + random() * 9;
      const angle = random() * Math.PI * 2;
      const distance = 14 + random() * FIELD;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.16, 6, 28), this.dust);
      rim.rotation.x = -Math.PI / 2;
      rim.position.set(x, 0.02, z);
      rim.scale.y = 0.5;
      parent.add(rim);

      const floor = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.95, 28), bowl);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(x, 0.01, z);
      parent.add(floor);
    }
  }

  /** Brocken, an denen man sich stößt — und hinter denen etwas liegen kann. */
  private buildRocks(parent: THREE.Object3D): void {
    const random = seeded(21);
    for (let i = 0; i < 26; i++) {
      const size = 0.5 + random() * 2.4;
      const angle = random() * Math.PI * 2;
      const distance = 8 + random() * FIELD;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), this.rock);
      stone.position.set(Math.cos(angle) * distance, size * 0.45, Math.sin(angle) * distance);
      stone.rotation.set(random() * 3, random() * 3, random() * 3);
      parent.add(stone);
      stone.updateWorldMatrix(true, false);
      this.solids.push(stone);
      this.physics!.addStatic(stone, { halfExtents: new THREE.Vector3(size, size * 0.8, size) });
    }
  }

  /**
   * Der Lander: die Landmarke, an der man sich in einer Ebene orientiert, die
   * sonst überall gleich aussieht. Seine hellen Tafeln halten Portale — auf dem
   * Mond will man einen Weg zurück, der nicht zwei Minuten Hüpfen ist.
   */
  private buildLander(parent: THREE.Object3D): void {
    const lander = new THREE.Group();
    lander.name = 'lander';
    lander.position.set(-9, 0, -11);
    parent.add(lander);
    lander.updateWorldMatrix(true, false);

    this.slab(lander, this.foil, [3.2, 1.5, 3.2], [0, 2.2, 0], false);
    // Zwei helle Tafeln an den Seiten: hier haften Portale.
    this.slab(lander, this.panel, [2.4, 1.2, 0.12], [0, 2.2, 1.68], true);
    this.slab(lander, this.panel, [0.12, 1.2, 2.4], [1.68, 2.2, 0], true);

    for (const [x, z] of [
      [-1.5, -1.5],
      [1.5, -1.5],
      [-1.5, 1.5],
      [1.5, 1.5],
    ] as const) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3, 8), this.rock);
      leg.position.set(x, 1.1, z);
      lander.add(leg);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 12), this.rock);
      foot.position.set(x, 0.06, z);
      lander.add(foot);
      foot.updateWorldMatrix(true, false);
      this.solids.push(foot);
      this.physics!.addStatic(foot);
    }

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), this.rock);
    mast.position.set(3.2, 1.3, 1.2);
    lander.add(mast);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x4aa8ff, side: THREE.DoubleSide, roughness: 0.9 }),
    );
    flag.position.set(3.65, 2.3, 1.2);
    lander.add(flag);

    const sign = new TextPlane({
      width: 2.6,
      height: 0.8,
      title: 'Mond',
      body: '1,62 m/s². Springen, werfen, stapeln — Schwerkraft steht im Menü.',
      accent: 0x9fe3ff,
    });
    sign.position.set(0, 3.7, 1.8);
    lander.add(sign);
  }
}

/** Die Erde: eine blaue Scheibe am schwarzen Himmel, die nie untergeht. */
function earthInTheSky(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1b52a8';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#3f8f4f';
  for (const [x, y, w, h] of [
    [70, 80, 70, 50],
    [165, 60, 60, 40],
    [120, 175, 90, 60],
    [35, 190, 40, 40],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (const [x, y, r] of [
    [90, 120, 28],
    [190, 130, 24],
    [130, 215, 30],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(26, 32, 24),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  earth.position.set(120, 95, -190);
  earth.name = 'earth';
  return earth;
}

/** Sterne, die auch bei Sonne stehen: es gibt keine Luft, die sie schluckt. */
function starField(): THREE.Points {
  const random = seeded(3);
  const count = 900;
  const radius = 480;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Gleichverteilt über die obere Halbkugel, knapp innerhalb des Himmels.
    const u = Math.abs(random() * 2 - 1);
    const angle = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - u * u);
    positions[i * 3] = Math.cos(angle) * ring * radius;
    positions[i * 3 + 1] = u * radius * 0.9 + 10;
    positions[i * 3 + 2] = Math.sin(angle) * ring * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false }),
  );
  stars.name = 'stars';
  stars.frustumCulled = false;
  return stars;
}

/**
 * Zufall mit Gedächtnis: derselbe Mond bei jedem Besuch — und derselbe bei
 * allen Mitspielern, denn jede Welt wird auf jedem Gerät neu gebaut und nicht
 * übertragen.
 */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
