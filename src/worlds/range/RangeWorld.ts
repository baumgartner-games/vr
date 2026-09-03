import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { createSky } from '../shared/environment';
import { TextPlane } from '../../ui/TextPlane';
import type { Handedness } from '../../core/XRInput';
import type { PhysicsBody } from '../../physics/PhysicsWorld';

/** Half width of the range; it runs long into -Z. */
const HALF_W = 26;
/** How far downrange the backstop stands. */
const DEPTH = 120;
/** Lanes, and how far apart they are. */
const LANES = [-8, -4, 0, 4, 8];
/** Distances the round targets stand at, in metres from the firing line. */
const TARGET_ROWS = [10, 25, 50];
/** How high the hangers stand. */
const POST_HEIGHT = 1.9;
/** How far in front of its post a target hangs. */
const STANDOFF = 0.14;

/**
 * A shooting range: a covered firing line and targets out in the distance.
 *
 * Five lanes, bullseyes at 10, 25 and 50 m, two more at 75 and 100 m for
 * anybody who has turned the pistol's muzzle velocity up, and a row of steel
 * plates that go down when they are hit. The distance markers are readable
 * from the line — the whole point of the place is to see what a setting does
 * to a shot.
 *
 * Everything else is the portal lab's: the same belt, the same tools, the same
 * physics and shared session. Portals stick to the white boards beside the
 * firing line and to the ground, not to the target frames — a portal in front
 * of a target would be the end of the exercise.
 */
export class RangeWorld extends PortalWorld {
  private readonly ground = new THREE.MeshStandardMaterial({ color: 0x7f8b62, roughness: 0.95 });
  private readonly gravel = new THREE.MeshStandardMaterial({ color: 0x9a9481, roughness: 0.95 });
  private readonly concrete = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.85 });
  private readonly timber = new THREE.MeshStandardMaterial({ color: 0x8a5f38, roughness: 0.8 });
  private readonly steel = new THREE.MeshStandardMaterial({
    color: 0x9aa6bd,
    roughness: 0.4,
    metalness: 0.6,
  });
  private readonly panel = new THREE.MeshStandardMaterial({
    color: 0xf2f4f8,
    roughness: 0.6,
    metalness: 0.05,
  });
  /** The bullseye face, built once and shared by every disc. */
  private targetFace: THREE.MeshStandardMaterial | null = null;

  protected override spawnPoint(): THREE.Vector3 {
    // On the firing line of the middle lane, looking downrange.
    return new THREE.Vector3(0, 0, 3);
  }

  protected override skyColor(): number {
    return 0xa8c4e0;
  }

  protected override lightIntensity(): number {
    return 1.1;
  }

  protected override welcome(): string {
    return 'Schießstand · Pistole am Gürtel · Einstellungen im Menü';
  }

  /** The pistol is what this place is for; the double gun comes along anyway. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [
      ['gun-dual', 'left'],
      ['pistol', 'right'],
    ];
  }

  protected override buildEnvironment(): void {
    const range = new THREE.Group();
    range.name = 'range';
    this.root.add(range);
    this.root.add(createSky(0x6fa3dd, 0xdfe7d6, 180));

    this.buildGround(range);
    this.buildStand(range);
    this.buildLaneMarkers(range);
    this.buildProps();
  }

  /** The targets: discs on posts, and steel plates on a rail. */
  protected override buildProps(): void {
    let index = 0;

    for (const distance of TARGET_ROWS) {
      for (const lane of LANES) {
        this.hangTarget(lane, distance, POST_HEIGHT, 0.34, `range-target-${index++}`);
      }
    }

    // Two big ones far out, for a barrel that has been turned all the way up.
    for (const [lane, distance, radius] of [
      [-4, 75, 0.7],
      [4, 100, 0.9],
    ] as const) {
      this.hangTarget(lane, distance, 2.8, radius, `range-far-${index++}`);
    }

    // Steel plates at 18 m: small, heavy, and they fall over properly.
    for (let i = 0; i < 6; i++) {
      const x = -6 + i * 2.4;
      this.buildRail(x, 18);
      this.spawnPlate(x, 0.93, -18, `range-plate-${index++}`);
    }
  }

  // --- the place ------------------------------------------------------------

  private buildGround(parent: THREE.Object3D): void {
    // One slab for the whole field, so a portal in the ground opens up the
    // ground and nothing else.
    this.slab(parent, this.ground, [HALF_W * 2, 0.4, DEPTH + 40], [0, -0.2, -DEPTH / 2 + 10], true);

    // The gravel strip everybody stands on, and the lane markings on it.
    const apron = new THREE.Mesh(new THREE.BoxGeometry(HALF_W * 2 - 4, 0.04, 12), this.gravel);
    apron.position.set(0, 0.02, 2);
    parent.add(apron);

    for (const lane of LANES) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, DEPTH), this.concrete);
      line.position.set(lane, 0.03, -DEPTH / 2);
      parent.add(line);
    }

    // The backstop berm: high, solid, and no portals on it.
    this.slab(parent, this.gravel, [HALF_W * 2, 9, 3], [0, 4.5, -DEPTH], false);
    for (const side of [-1, 1]) {
      this.slab(parent, this.gravel, [2, 6, DEPTH], [side * HALF_W, 3, -DEPTH / 2], false);
    }
  }

  /** Roof, bench and side walls of the firing line. */
  private buildStand(parent: THREE.Object3D): void {
    const width = HALF_W * 2 - 6;

    // The bench you rest on, one slab across all lanes.
    this.slab(parent, this.timber, [width, 0.12, 0.7], [0, 1.05, -0.4], false);
    for (const lane of LANES) {
      for (const side of [-0.5, 0.5]) {
        this.slab(parent, this.timber, [0.12, 1.05, 0.5], [lane + side * 1.9, 0.52, -0.4], false);
      }
      // A low divider between the lanes — chest high, so the range stays open.
      this.slab(parent, this.concrete, [0.1, 1.4, 2], [lane + 2, 0.7, 0.2], false);
    }

    // Posts and roof over the line. The posts stand *between* the lanes — one
    // in the middle would be exactly in the way of the middle lane.
    for (const x of [-width / 2 + 0.6, -10, 10, width / 2 - 0.6]) {
      for (const z of [-1.4, 3.8]) {
        this.slab(parent, this.timber, [0.24, 3.6, 0.24], [x, 1.8, z], false);
      }
    }
    // The roof stops just behind the line, so there is sky over the shooter.
    this.slab(parent, this.timber, [width + 1.4, 0.22, 5.8], [0, 3.7, 1.2], false);

    // The back wall, and the white boards a portal actually sticks to.
    this.slab(parent, this.concrete, [width + 1.4, 3.6, 0.3], [0, 1.8, 5], false);
    for (const side of [-1, 1]) {
      this.slab(parent, this.panel, [0.3, 2.8, 3], [side * (width / 2 + 0.4), 1.5, 1.4], true);
    }

    const sign = new TextPlane({
      width: 3.4,
      height: 1,
      title: 'Schießstand',
      body: 'Ziele auf 10, 25, 50, 75 und 100 m. Stärke, Tempo, Feuerrate und Modus im Menü.',
      accent: 0xffc857,
    });
    sign.position.set(0, 2.6, 4.82);
    sign.rotation.y = Math.PI;
    parent.add(sign);
  }

  /** The distance markers along the left-hand side. */
  private buildLaneMarkers(parent: THREE.Object3D): void {
    for (const distance of [...TARGET_ROWS, 75, 100]) {
      // Facing the firing line, so the number can be read from it.
      const marker = new TextPlane({
        width: 2,
        height: 0.7,
        title: `${distance} m`,
        accent: 0x4aa8ff,
      });
      marker.position.set(-12, 1.6, -distance);
      parent.add(marker);
      this.slab(parent, this.steel, [0.1, 1.6, 0.1], [-12, 0.8, -distance], false);
    }
  }

  /** A post a target hangs off, and the body it is hinged to. */
  private buildPost(x: number, distance: number, height: number): PhysicsBody {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, height, 0.1), this.steel);
    post.position.set(x, height / 2, -distance);
    this.root.add(post);
    post.updateWorldMatrix(true, false);
    return this.physics!.addStatic(post);
  }

  /**
   * A bullseye on a hinge.
   *
   * Balancing a disc on top of a post looks right for exactly as long as the
   * physics needs to notice it — so the disc hangs off the post instead, on a
   * hinge across the range. A hit swings it back and it comes down again,
   * which reads at a hundred metres and cannot end with every target lying in
   * the grass.
   */
  private hangTarget(x: number, distance: number, height: number, radius: number, id: string): void {
    const post = this.buildPost(x, distance, height);
    // The disc hangs in front of the post, not through it — two solids in the
    // same place fight the hinge every step.
    const entry = this.spawnTarget(x, height - radius, -distance + STANDOFF, radius, id);

    const physics = this.physics!;
    const rapier = physics.rapier;
    // The pivot is the top edge of the disc, at the top of the post — the same
    // world point, written down in each body's own frame. The disc is tipped
    // forward by 90°, so its own "up" is -Z.
    const data = rapier.JointData.revoluteWithAxes(
      { x: 0, y: height / 2, z: STANDOFF },
      { x: 0, y: 0, z: -radius },
      { x: 1, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    );
    physics.world.createImpulseJoint(data, post.body, entry.body, true);
  }

  /** The rail a steel plate rests on. */
  private buildRail(x: number, distance: number): void {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.1), this.steel);
    rail.position.set(x, 0.35, -distance);
    this.root.add(rail);
    rail.updateWorldMatrix(true, false);
    this.physics!.addStatic(rail);
  }

  /**
   * A bullseye disc, standing on its post. It is a normal prop: it can be
   * shot over, picked up, carried somewhere else and put back — and everybody
   * in the session sees the same one go down.
   */
  private spawnTarget(
    x: number,
    y: number,
    z: number,
    radius: number,
    id: string,
  ): PhysicsBody {
    const thickness = 0.06;
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, thickness, 24),
      [this.steel, this.face(), this.steel],
    );
    // A cylinder stands along +Y; tipped forward its face looks at the line.
    disc.rotation.x = Math.PI / 2;
    disc.position.set(x, y, z);
    this.root.add(disc);
    disc.updateWorldMatrix(true, false);

    const entry = this.physics!.addDynamic(disc, {
      shape: { kind: 'cylinder' },
      halfExtents: new THREE.Vector3(radius, thickness / 2, radius),
      mass: radius * 6,
      friction: 0.7,
      restitution: 0.1,
      angularDamping: 0.4,
    });
    this.registerProp(entry, id);
    return entry;
  }

  /** A steel plate: heavier, and it goes down with a proper clang of physics. */
  private spawnPlate(x: number, y: number, z: number, id: string): void {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.05), this.steel.clone());
    (plate.material as THREE.MeshStandardMaterial).color.setHex(0xd9dee8);
    plate.position.set(x, y, z);
    this.root.add(plate);
    plate.updateWorldMatrix(true, false);

    this.registerProp(
      this.physics!.addDynamic(plate, {
        mass: 4,
        friction: 0.8,
        restitution: 0.05,
      }),
      id,
    );
  }

  /** The painted face of a target, drawn once and shared. */
  private face(): THREE.MeshStandardMaterial {
    if (this.targetFace) return this.targetFace;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f4f6fa';
    ctx.fillRect(0, 0, 256, 256);

    // Five rings, the middle one red — readable from a hundred metres.
    const rings = [
      { r: 122, fill: '#f4f6fa' },
      { r: 98, fill: '#dbe2ee' },
      { r: 74, fill: '#f4f6fa' },
      { r: 50, fill: '#2a3550' },
      { r: 26, fill: '#ff3b2f' },
    ];
    for (const ring of rings) {
      ctx.beginPath();
      ctx.arc(128, 128, ring.r, 0, Math.PI * 2);
      ctx.fillStyle = ring.fill;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20, 28, 44, 0.55)';
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    this.targetFace = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
    return this.targetFace;
  }
}
