import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { TextPlane } from '../../ui/TextPlane';
import { playPick, playTone } from '../../core/Audio';
import type { MenuEntry } from '../../ui/menu';
import type { WorldContext } from '../../core/types';
import type { ControllerState, Handedness } from '../../core/XRInput';
import type { PhysicsBody } from '../../physics/PhysicsWorld';
import {
  addCheese,
  addSauce,
  bakeFor,
  bakeTint,
  emptyPizza,
  isFlat,
  knead,
  pizzaHint,
  pizzaLabel,
  pizzaScore,
  pizzaStage,
  type Pizza,
} from './pizza';

/** Inside of the shop: half width, half depth, and how high the ceiling is. */
const ROOM = { halfX: 9, halfZ: 7, height: 3.2, wall: 0.3 };
/** The work table in the kitchen, and how high its top is. */
// Arbeitshöhe wie in einer echten Küche (DIN: 90 cm). Sie stand auf 95, und
// das ist für sich genommen nicht falsch — wer sich hier zu klein vorkommt,
// sitzt meistens auf einem Stuhl, und dagegen hilft nicht der Tisch, sondern
// *Menü → Bewegung → Haltung*, das die Sicht wieder auf Stehhöhe hebt.
const TABLE = { x: 0, z: -5.6, w: 3.8, d: 1, top: 0.9 };
/** Where the three stations stand along the back of the table. */
const STATION_Z = TABLE.z - 0.3;
const CRATE_X = -1.35;
const LADLE_X = 0.05;
const CHEESE_X = 1.45;
/** The oven, and the hole in it a pizza goes into. */
const OVEN = { x: -4.6, z: -6, w: 1.6, d: 1.1 };
/** The bin. Anything that goes in is gone. */
const BIN = { x: 3.4, z: -5.5, half: 0.24, rim: 0.85 };
/** How far apart the counter's two halves stand — that gap is the way through. */
const COUNTER_Z = -1.2;
const COUNTER_GAP = 1.6;

/** Radius of a flat pizza base, and of a ball of dough. */
const BASE_RADIUS = 0.19;
const BALL_RADIUS = 0.11;
/** How fast the ladle and the shaker cover a base, in "per second". */
const SAUCE_RATE = 0.55;
const CHEESE_RATE = 0.5;
/** How far below the ladle a base still gets something on it. */
const POUR_REACH = 0.55;
const POUR_RADIUS = 0.34;
/** A hand this fast, this close, punching towards the dough, kneads it. */
const PUNCH_SPEED = 0.85;
const PUNCH_RANGE = 0.26;
const PUNCH_COOLDOWN = 0.32;
/** More dough than this lying about and the crate stops handing it out. */
const MAX_DOUGH = 9;
/** Seconds before the crate puts out a fresh ball. */
const CRATE_REFILL = 1.4;
/** Guest tables: where they stand and how big their tops are. */
const TABLES: ReadonlyArray<readonly [number, number]> = [
  [-4.5, 2.4],
  [0, 5],
  [4.5, 2.4],
];
const TABLE_RADIUS = 0.6;
const TABLE_HEIGHT = 0.75;

const _hand = new THREE.Vector3();
const _head = new THREE.Vector3();
const _point = new THREE.Vector3();
const _tip = new THREE.Vector3();
const _velocity = new THREE.Vector3();
const _toward = new THREE.Vector3();
/** Where the crate hands out the next ball of dough. */
const CRATE_SPOT = new THREE.Vector3(CRATE_X, TABLE.top + 0.16, STATION_Z);

/** A tool with a home on the table: the sauce ladle and the cheese shaker. */
interface Station {
  kind: 'sauce' | 'cheese';
  entry: PhysicsBody;
  /** Where the stuff comes out. */
  tip: THREE.Object3D;
  home: THREE.Vector3;
  homeRotation: THREE.Quaternion;
  /** Shown while the trigger is held: sauce running, cheese falling. */
  stream: THREE.Mesh;
}

/** One pizza, from ball of dough to whatever it ends up as. */
interface PizzaProp {
  entry: PhysicsBody;
  state: Pizza;
  ball: THREE.Mesh;
  base: THREE.Group;
  dough: THREE.MeshStandardMaterial;
  sauce: THREE.Mesh;
  cheese: THREE.Mesh;
  label: TextPlane;
  /** Last thing written on the label, so it is not redrawn every frame. */
  written: string;
  /** Lying still on the work table, where it can be punched. */
  onTable: boolean;
  served: boolean;
  cooldown: number;
}

/**
 * A little pizza shop: kitchen at the back, counter across the middle, tables
 * for the guests in front.
 *
 * The whole recipe is done with your hands, and every station says on the wall
 * behind it what it wants:
 *
 * 1. **Teig** — take a ball out of the crate and put it on the work table. It
 *    stays where it is put, and a few **punches with the fist** knead it flat.
 * 2. **Soße** — the red ladle has a fixed spot on the table. Pick it up, hold
 *    the **trigger** over a base and the sauce spreads.
 * 3. **Käse** — the shaker beside it, the same way. Sauce first: cheese does
 *    not stick to bare dough.
 * 4. **Ofen** — put it in or throw it in, there is no door. It goes golden and
 *    then, if it is left in there, black.
 * 5. **Gast** — a finished pizza put down on a table in the front room counts.
 *    A ruined one goes in the **bin**, which deletes it.
 *
 * Both tools go back to their spot the moment they are let go of, so the table
 * never ends up empty and nothing has to be tidied away.
 *
 * Everything else is the portal lab's — the same hands, the same physics, the
 * same shared session. The belt starts out empty: in this world the hands have
 * something else to do.
 */
export class ShopWorld extends PortalWorld {
  private readonly wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0e6d6,
    roughness: 0.9,
  });
  private readonly tileMaterial = new THREE.MeshStandardMaterial({
    color: 0xdfe4ec,
    roughness: 0.6,
  });
  private readonly woodMaterial = new THREE.MeshStandardMaterial({
    color: 0xa9773f,
    roughness: 0.75,
  });
  private readonly steelMaterial = new THREE.MeshStandardMaterial({
    color: 0xb9c2d4,
    roughness: 0.35,
    metalness: 0.6,
  });
  private readonly brickMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d4a3a,
    roughness: 0.9,
  });
  private readonly panelMaterial = new THREE.MeshStandardMaterial({
    color: 0xf7f9fc,
    roughness: 0.5,
    metalness: 0.05,
  });

  private readonly pizzas: PizzaProp[] = [];
  private readonly stations: Station[] = [];
  /** Where each hand was last frame, so a punch can be told from a wave. */
  private readonly handWas = new Map<Handedness, THREE.Vector3>();
  private crateTimer = 0;
  private made = 0;
  private served = 0;
  private bestScore = 0;
  private totalScore = 0;
  private scoreBoard: TextPlane | null = null;
  private ovenGlow: THREE.MeshStandardMaterial | null = null;

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    this.updateStations(dt, ctx);
    this.updatePizzas(dt, ctx);
    this.updateCrate(dt);
    this.updateHands(dt, ctx);
    this.updateLabels(ctx);
  }

  override dispose(ctx: WorldContext): void {
    for (const pizza of this.pizzas) pizza.label.dispose();
    this.pizzas.length = 0;
    this.stations.length = 0;
    this.handWas.clear();
    this.scoreBoard?.dispose();
    this.scoreBoard = null;
    this.ovenGlow = null;
    super.dispose(ctx);
  }

  override menu(): MenuEntry[] {
    return [
      ...super.menu(),
      {
        id: 'shop:clear',
        label: 'Küche aufräumen',
        sub: 'Alle Teige und Pizzen wegwerfen',
        icon: 'reset',
        accent: 0xff8a2f,
        run: () => {
          const count = this.pizzas.length;
          this.clearPizzas();
          this.context?.notify(count ? `${count} weggeräumt` : 'Die Küche ist schon leer');
        },
      },
    ];
  }

  /** `B`/`Y` clears the worktop as well as putting the room back. */
  protected override worldReset(): void {
    this.clearPizzas();
    for (const station of this.stations) this.parkStation(station);
  }

  protected override spawnPoint(): THREE.Vector3 {
    // In the kitchen, in front of the work table.
    return new THREE.Vector3(0, 0, -4.2);
  }

  protected override skyColor(): number {
    return 0x1a1410;
  }

  protected override lightIntensity(): number {
    return 1.05;
  }

  protected override welcome(): string {
    return 'Pizzeria · Teig auf den Tisch, mit der Faust kneten · Text steht an der Wand';
  }

  /** The hands have a job here, so nothing hangs on the belt to start with. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  protected override buildEnvironment(): void {
    const shop = new THREE.Group();
    shop.name = 'pizzeria';
    this.root.add(shop);

    this.buildLights(shop);
    this.buildShell(shop);
    this.buildCounter(shop);
    this.buildGuestRoom(shop);
    this.buildKitchen(shop);
    this.buildProps();
  }

  /** Two balls of dough to start with; the crate keeps up from there. */
  protected override buildProps(): void {
    this.spawnDough(CRATE_X, TABLE.top + 0.3, STATION_Z);
  }

  // --- the room -------------------------------------------------------------

  /**
   * Warm lamps over the two rooms. The hemisphere light the engine hands every
   * world lights everything the same, which indoors reads as no light at all —
   * a kitchen wants somewhere for the shadows to fall away from.
   */
  private buildLights(parent: THREE.Object3D): void {
    for (const [x, z, colour, power] of [
      [0, -4.5, 0xfff0d8, 26],
      [-4.6, -5, 0xffb070, 14],
      [-3.5, 3, 0xffe6c0, 22],
      [3.5, 3, 0xffe6c0, 22],
    ] as const) {
      const lamp = new THREE.PointLight(colour, power, 12, 2);
      lamp.position.set(x, ROOM.height - 0.5, z);
      parent.add(lamp);
      const shade = new THREE.Mesh(
        new THREE.ConeGeometry(0.26, 0.22, 14, 1, true),
        new THREE.MeshStandardMaterial({
          color: 0x2b3040,
          roughness: 0.6,
          side: THREE.DoubleSide,
        }),
      );
      shade.position.set(x, ROOM.height - 0.34, z);
      parent.add(shade);
    }
  }

  private buildShell(parent: THREE.Object3D): void {
    const { halfX, halfZ, height, wall } = ROOM;
    this.slab(
      parent,
      this.tileMaterial,
      [halfX * 2 + wall * 2, wall, halfZ * 2 + wall * 2],
      [0, -wall / 2, 0],
      true,
    );
    this.slab(
      parent,
      this.wallMaterial,
      [halfX * 2 + wall * 2, wall, halfZ * 2 + wall * 2],
      [0, height + wall / 2, 0],
      true,
    );
    this.slab(
      parent,
      this.wallMaterial,
      [halfX * 2, height, wall],
      [0, height / 2, -halfZ - wall / 2],
      false,
    );
    this.slab(
      parent,
      this.wallMaterial,
      [halfX * 2, height, wall],
      [0, height / 2, halfZ + wall / 2],
      false,
    );
    this.slab(
      parent,
      this.wallMaterial,
      [wall, height, halfZ * 2],
      [-halfX - wall / 2, height / 2, 0],
      false,
    );
    this.slab(
      parent,
      this.wallMaterial,
      [wall, height, halfZ * 2],
      [halfX + wall / 2, height / 2, 0],
      false,
    );

    // Two bright panels, so the portal guns have somewhere to stick.
    this.slab(parent, this.panelMaterial, [0.12, 2.2, 3], [-halfX + 0.08, 1.4, 3], true);
    this.slab(parent, this.panelMaterial, [0.12, 2.2, 3], [halfX - 0.08, 1.4, 3], true);

    // A skirting board all the way round: a room of one flat colour has no
    // corners, and a kitchen you cannot see the corners of feels like a box.
    for (const [w, d, x, z] of [
      [halfX * 2, 0.06, 0, -halfZ + 0.03],
      [halfX * 2, 0.06, 0, halfZ - 0.03],
      [0.06, halfZ * 2, -halfX + 0.03, 0],
      [0.06, halfZ * 2, halfX - 0.03, 0],
    ] as const) {
      this.slab(parent, this.woodMaterial, [w, 0.32, d], [x, 0.16, z], false, false);
    }

    const door = new TextPlane({
      width: 2.6,
      height: 0.8,
      title: 'Pizzeria',
      body: 'Küche hinten, Gäste vorn',
      accent: 0xff8a2f,
      align: 'center',
    });
    door.position.set(0, 2.4, ROOM.halfZ - 0.05);
    door.rotation.y = Math.PI;
    parent.add(door);

    const card = new TextPlane({
      width: 2.4,
      height: 0.9,
      title: 'Speisekarte',
      body: 'Pizza. Sonst nichts. Fertige Pizza auf einen Tisch stellen — das zählt.',
      accent: 0xffc857,
    });
    // On the side wall of the guest room, where somebody sitting down looks.
    card.position.set(halfX - 0.2, 1.9, 3);
    card.rotation.y = -Math.PI / 2;
    parent.add(card);
  }

  /** The counter across the middle, with the way through in the middle of it. */
  private buildCounter(parent: THREE.Object3D): void {
    const side = ROOM.halfX - COUNTER_GAP / 2;
    for (const direction of [-1, 1]) {
      const centre = direction * (COUNTER_GAP / 2 + side / 2);
      this.slab(parent, this.woodMaterial, [side, 1.05, 0.5], [centre, 0.525, COUNTER_Z], false);
      this.slab(
        parent,
        this.steelMaterial,
        [side + 0.1, 0.07, 0.68],
        [centre, 1.08, COUNTER_Z],
        false,
      );
    }

    this.scoreBoard = new TextPlane({
      width: 3.2,
      height: 1.05,
      title: '',
      accent: 0x5ee0a0,
    });
    this.scoreBoard.position.set(-5, 2.2, COUNTER_Z + 0.02);
    parent.add(this.scoreBoard);
    this.drawScore();
  }

  private buildGuestRoom(parent: THREE.Object3D): void {
    for (const [x, z] of TABLES) {
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(TABLE_RADIUS, TABLE_RADIUS, 0.07, 24),
        this.woodMaterial,
      );
      top.position.set(x, TABLE_HEIGHT, z);
      parent.add(top);
      top.updateWorldMatrix(true, false);
      this.physics!.addStatic(top, {
        halfExtents: new THREE.Vector3(TABLE_RADIUS, 0.035, TABLE_RADIUS),
        shape: { kind: 'cylinder' },
      });
      this.solids.push(top);

      this.slab(
        parent,
        this.steelMaterial,
        [0.12, TABLE_HEIGHT, 0.12],
        [x, TABLE_HEIGHT / 2, z],
        false,
      );
      this.slab(parent, this.steelMaterial, [0.5, 0.04, 0.5], [x, 0.02, z], false);

      // Four chairs, one on each side.
      for (const [dx, dz] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        const cx = x + dx * 1.05;
        const cz = z + dz * 1.05;
        this.slab(parent, this.woodMaterial, [0.42, 0.06, 0.42], [cx, 0.45, cz], false);
        this.slab(
          parent,
          this.steelMaterial,
          [0.36, 0.45, 0.05],
          [cx + dx * 0.19, 0.68, cz + dz * 0.19],
          false,
        );
        // One pedestal instead of four legs: a chair leg is four rigid bodies
        // nobody ever looks at, and there are twelve chairs in here.
        this.slab(parent, this.steelMaterial, [0.12, 0.42, 0.12], [cx, 0.21, cz], false);
        this.slab(parent, this.steelMaterial, [0.32, 0.03, 0.32], [cx, 0.015, cz], false);
      }
    }
  }

  private buildKitchen(parent: THREE.Object3D): void {
    // The work table: everything happens on this.
    this.slab(
      parent,
      this.steelMaterial,
      [TABLE.w, 0.08, TABLE.d],
      [TABLE.x, TABLE.top, TABLE.z],
      false,
    );
    for (const dx of [-1, 1]) {
      for (const dz of [-1, 1]) {
        this.slab(
          parent,
          this.steelMaterial,
          [0.08, TABLE.top, 0.08],
          [TABLE.x + dx * (TABLE.w / 2 - 0.12), TABLE.top / 2, TABLE.z + dz * (TABLE.d / 2 - 0.12)],
          false,
        );
      }
    }

    this.buildCrate(parent);
    this.buildOven(parent);
    this.buildBin(parent);
    this.stations.push(this.buildLadle(parent), this.buildShaker(parent));
    for (const station of this.stations) this.parkStation(station);

    // The wall behind the stations says what to do with each of them. That is
    // the whole tutorial: it stands exactly where you are already looking.
    const wallZ = -ROOM.halfZ + 0.2;
    // Two lines each: a sign nobody finishes reading is a sign nobody reads.
    this.sign(
      parent,
      CRATE_X,
      wallZ,
      'Teig',
      'Kugel auf den Tisch legen und mit der Faust flach schlagen.',
    );
    this.sign(
      parent,
      LADLE_X,
      wallZ,
      'Tomatensoße',
      'Kelle greifen, über den Boden halten, Trigger drücken.',
    );
    this.sign(
      parent,
      CHEESE_X,
      wallZ,
      'Käse',
      'Streuer greifen, Trigger streut. Erst Soße, dann Käse.',
    );
    // Over the oven rather than behind it: the oven is taller than a sign.
    this.sign(
      parent,
      OVEN.x,
      wallZ,
      'Ofen',
      'Hineinlegen oder hineinwerfen. Golden ist fertig, schwarz zu spät.',
      2.6,
    );
    this.sign(parent, BIN.x, wallZ, 'Mülleimer', 'Alles, was hineinfällt, ist gelöscht.');
  }

  /** One instruction sign on the back wall, above its station. */
  private sign(
    parent: THREE.Object3D,
    x: number,
    z: number,
    title: string,
    body: string,
    y = 1.72,
  ): void {
    // Wide and low on purpose: a `TextPlane` sizes its type off its height, so
    // a *taller* sign holds less text, not more.
    const plane = new TextPlane({ width: 1.32, height: 0.5, title, body, accent: 0xffc857 });
    plane.position.set(x, y, z);
    parent.add(plane);
  }

  /** The crate the dough comes out of. */
  private buildCrate(parent: THREE.Object3D): void {
    const half = 0.26;
    this.slab(
      parent,
      this.woodMaterial,
      [half * 2, 0.04, half * 2],
      [CRATE_X, TABLE.top + 0.06, STATION_Z],
      false,
    );
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      this.slab(
        parent,
        this.woodMaterial,
        [dx ? 0.04 : half * 2, 0.2, dz ? 0.04 : half * 2],
        [CRATE_X + dx * half, TABLE.top + 0.14, STATION_Z + dz * half],
        false,
      );
    }
  }

  /**
   * The oven: a brick box with a hole in the front and no door, so a pizza can
   * simply be thrown in.
   */
  private buildOven(parent: THREE.Object3D): void {
    const { x, z, w, d } = OVEN;
    this.slab(parent, this.brickMaterial, [w, 0.9, d], [x, 0.45, z], false);
    this.slab(parent, this.brickMaterial, [0.3, 0.52, d], [x - w / 2 + 0.15, 1.16, z], false);
    this.slab(parent, this.brickMaterial, [0.3, 0.52, d], [x + w / 2 - 0.15, 1.16, z], false);
    this.slab(parent, this.brickMaterial, [w, 0.52, 0.16], [x, 1.16, z - d / 2 + 0.08], false);
    this.slab(parent, this.brickMaterial, [w, 0.24, d], [x, 1.54, z], false);
    this.slab(parent, this.brickMaterial, [0.9, 0.5, 0.7], [x, 1.91, z], false);
    this.slab(parent, this.steelMaterial, [0.26, 0.6, 0.26], [x, 2.46, z - 0.15], false);

    // The mouth glows, so it is obvious which side a pizza goes in.
    this.ovenGlow = new THREE.MeshStandardMaterial({
      color: 0x2a1408,
      emissive: new THREE.Color(0xff7a2a),
      emissiveIntensity: 0.9,
      roughness: 0.9,
    });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.5), this.ovenGlow);
    back.position.set(x, 1.15, z - d / 2 + 0.17);
    parent.add(back);
  }

  private buildBin(parent: THREE.Object3D): void {
    const { x, z, half, rim } = BIN;
    this.slab(
      parent,
      this.steelMaterial,
      [half * 2 + 0.08, 0.05, half * 2 + 0.08],
      [x, 0.025, z],
      false,
    );
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      this.slab(
        parent,
        this.steelMaterial,
        [dx ? 0.05 : half * 2, rim, dz ? 0.05 : half * 2],
        [x + dx * half, rim / 2, z + dz * half],
        false,
      );
    }
  }

  // --- the two tools --------------------------------------------------------

  private buildLadle(parent: THREE.Object3D): Station {
    const group = new THREE.Group();
    group.name = 'tool-ladle';
    const red = new THREE.MeshStandardMaterial({
      color: 0xd4342a,
      roughness: 0.45,
      metalness: 0.2,
    });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 10), red);
    handle.position.y = 0.15;
    group.add(handle);
    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.058, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      red,
    );
    group.add(bowl);
    const tip = new THREE.Object3D();
    tip.position.y = -0.06;
    group.add(tip);
    parent.add(group);

    const stream = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.05, 0.3, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xc22c22,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    stream.position.y = -0.2;
    stream.visible = false;
    group.add(stream);

    group.position.set(LADLE_X, TABLE.top + 0.11, STATION_Z);
    group.updateWorldMatrix(true, false);
    const entry = this.physics!.addDynamic(group, {
      halfExtents: new THREE.Vector3(0.06, 0.16, 0.06),
      mass: 0.4,
      friction: 0.8,
    });
    this.registerProp(entry, 'shop-ladle');
    return {
      kind: 'sauce',
      entry,
      tip,
      home: group.position.clone(),
      homeRotation: group.quaternion.clone(),
      stream,
    };
  }

  private buildShaker(parent: THREE.Object3D): Station {
    const group = new THREE.Group();
    group.name = 'tool-cheese';
    const body = new THREE.MeshStandardMaterial({ color: 0xf2e6b8, roughness: 0.6 });
    const cap = new THREE.MeshStandardMaterial({ color: 0xd9b64a, roughness: 0.4, metalness: 0.3 });
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.19, 14), body);
    jar.position.y = 0.095;
    group.add(jar);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.03, 14), cap);
    lid.position.y = 0.2;
    group.add(lid);
    const tip = new THREE.Object3D();
    tip.position.y = 0.22;
    group.add(tip);
    parent.add(group);

    // Cheese comes out of the lid, so the shaker is held upside down — the
    // spray is drawn upwards in its own space and points down in the hand.
    const stream = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.3, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xf6e39a,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    stream.position.y = 0.37;
    stream.visible = false;
    group.add(stream);

    group.position.set(CHEESE_X, TABLE.top + 0.05, STATION_Z);
    group.updateWorldMatrix(true, false);
    const entry = this.physics!.addDynamic(group, {
      halfExtents: new THREE.Vector3(0.055, 0.11, 0.055),
      mass: 0.4,
      friction: 0.8,
    });
    this.registerProp(entry, 'shop-cheese');
    return {
      kind: 'cheese',
      entry,
      tip,
      home: group.position.clone(),
      homeRotation: group.quaternion.clone(),
      stream,
    };
  }

  /** Back onto its spot, standing still. */
  private parkStation(station: Station): void {
    const physics = this.physics!;
    const { home, homeRotation, entry } = station;
    // Already sitting there: nothing to do, and no body type to churn.
    if (entry.body.isKinematic() && entry.object.position.distanceToSquared(home) < 1e-8) {
      station.stream.visible = false;
      return;
    }
    entry.body.setBodyType(physics.rapier.RigidBodyType.KinematicPositionBased, true);
    entry.body.setTranslation({ x: home.x, y: home.y, z: home.z }, true);
    entry.body.setRotation(
      { x: homeRotation.x, y: homeRotation.y, z: homeRotation.z, w: homeRotation.w },
      true,
    );
    entry.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    entry.object.position.copy(home);
    entry.object.quaternion.copy(homeRotation);
    station.stream.visible = false;
  }

  /**
   * A tool in a hand pours; a tool that is let go of goes home. That is what
   * "a fixed place on the table" means: it cannot be lost, and the spot is
   * never empty when you come back to it.
   */
  private updateStations(dt: number, ctx: WorldContext): void {
    for (const station of this.stations) {
      if (!station.entry.carried) {
        this.parkStation(station);
        continue;
      }
      const controller = this.holdingHand(ctx, station.entry);
      const pouring = Boolean(controller?.trigger.pressed);
      station.stream.visible = pouring;
      if (!pouring) continue;

      station.tip.updateWorldMatrix(true, false);
      station.tip.getWorldPosition(_tip);
      const target = this.baseUnder(_tip);
      if (!target) continue;

      const before = target.state;
      target.state =
        station.kind === 'sauce'
          ? addSauce(before, SAUCE_RATE * dt)
          : addCheese(before, CHEESE_RATE * dt);
      if (target.state === before) continue;
      this.drawPizza(target);
      controller?.pulse(0.15, 12);
    }
  }

  /** The base a tool is being held over, if there is one. */
  private baseUnder(tip: THREE.Vector3): PizzaProp | null {
    let best: PizzaProp | null = null;
    let bestDrop = Number.POSITIVE_INFINITY;
    for (const pizza of this.pizzas) {
      if (!isFlat(pizza.state) || pizza.state.bake > 0) continue;
      pizza.entry.object.getWorldPosition(_point);
      const drop = tip.y - _point.y;
      if (drop < -0.05 || drop > POUR_REACH) continue;
      if (Math.hypot(tip.x - _point.x, tip.z - _point.z) > POUR_RADIUS) continue;
      if (drop < bestDrop) {
        best = pizza;
        bestDrop = drop;
      }
    }
    return best;
  }

  /** Whichever tracked hand is closest to a prop it is carrying. */
  private holdingHand(ctx: WorldContext, entry: PhysicsBody): ControllerState | null {
    entry.object.getWorldPosition(_point);
    let best: ControllerState | null = null;
    let bestDistance = 0.5;
    for (const controller of ctx.input.controllers) {
      if (!controller.tracked) continue;
      gripOf(controller).getWorldPosition(_hand);
      const distance = _hand.distanceTo(_point);
      if (distance < bestDistance) {
        best = controller;
        bestDistance = distance;
      }
    }
    return best;
  }

  // --- the dough ------------------------------------------------------------

  /** A fresh ball of dough, as a prop like any other. */
  private spawnDough(x: number, y: number, z: number): PizzaProp {
    const physics = this.physics!;
    const group = new THREE.Group();
    group.name = 'pizza';

    const dough = new THREE.MeshStandardMaterial({ color: 0xe8d3a8, roughness: 0.85 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 16, 12), dough);
    ball.scale.y = 0.82;
    group.add(ball);

    const base = new THREE.Group();
    base.visible = false;
    group.add(base);
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(BASE_RADIUS, BASE_RADIUS * 0.96, 0.035, 26),
      dough,
    );
    base.add(disc);
    const sauce = new THREE.Mesh(
      new THREE.CylinderGeometry(BASE_RADIUS * 0.88, BASE_RADIUS * 0.88, 0.008, 24),
      new THREE.MeshStandardMaterial({ color: 0xc0281c, roughness: 0.7 }),
    );
    sauce.position.y = 0.021;
    sauce.scale.setScalar(0.001);
    base.add(sauce);
    const cheese = new THREE.Mesh(
      new THREE.CylinderGeometry(BASE_RADIUS * 0.82, BASE_RADIUS * 0.82, 0.01, 24),
      new THREE.MeshStandardMaterial({ color: 0xf3d878, roughness: 0.6 }),
    );
    cheese.position.y = 0.03;
    cheese.scale.setScalar(0.001);
    base.add(cheese);

    group.position.set(x, y, z);
    this.root.add(group);
    group.updateWorldMatrix(true, false);

    const entry = physics.addDynamic(group, {
      shape: { kind: 'cylinder' },
      halfExtents: new THREE.Vector3(BALL_RADIUS, BALL_RADIUS * 0.82, BALL_RADIUS),
      mass: 0.5,
      friction: 0.9,
      restitution: 0.02,
      angularDamping: 0.5,
    });
    this.registerProp(entry, `pizza-${this.made++}`);

    const label = new TextPlane({
      width: 0.5,
      height: 0.2,
      title: '',
      accent: 0xffc857,
      align: 'center',
    });
    label.visible = false;
    this.root.add(label);

    const pizza: PizzaProp = {
      entry,
      state: emptyPizza(),
      ball,
      base,
      dough,
      sauce,
      cheese,
      label,
      written: '',
      onTable: false,
      served: false,
      cooldown: 0,
    };
    this.pizzas.push(pizza);
    this.drawPizza(pizza);
    return pizza;
  }

  /** Keeps a ball of dough in the crate, so there is always one to take. */
  private updateCrate(dt: number): void {
    const taken = !this.pizzas.some(
      (pizza) => pizza.entry.object.position.distanceTo(CRATE_SPOT) < 0.22,
    );
    if (!taken || this.pizzas.length >= MAX_DOUGH) {
      this.crateTimer = 0;
      return;
    }
    this.crateTimer += dt;
    if (this.crateTimer < CRATE_REFILL) return;
    this.crateTimer = 0;
    this.spawnDough(CRATE_SPOT.x, CRATE_SPOT.y, CRATE_SPOT.z);
    playPick(true);
  }

  /**
   * The fist. No button: a hand that comes down hard on a ball of dough lying
   * on the table kneads it, and one that is merely closed picks it up as
   * usual — which is exactly the difference between the two gestures.
   */
  private updateHands(dt: number, ctx: WorldContext): void {
    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand) continue;
      const previous = this.handWas.get(hand);
      if (!controller.tracked) {
        this.handWas.delete(hand);
        continue;
      }
      gripOf(controller).getWorldPosition(_hand);
      if (!previous) {
        this.handWas.set(hand, _hand.clone());
        continue;
      }
      _velocity
        .copy(_hand)
        .sub(previous)
        .divideScalar(Math.max(dt, 1 / 120));
      previous.copy(_hand);
      if (_velocity.length() < PUNCH_SPEED) continue;

      for (const pizza of this.pizzas) {
        if (pizza.cooldown > 0 || !pizza.onTable || isFlat(pizza.state)) continue;
        pizza.entry.object.getWorldPosition(_point);
        if (_hand.distanceTo(_point) > PUNCH_RANGE) continue;
        // Only on the way in. A hand pulled back out is not a second punch.
        _toward.copy(_point).sub(_hand);
        if (_velocity.dot(_toward) <= 0) continue;
        this.punch(ctx, pizza, controller);
        break;
      }
    }
    for (const pizza of this.pizzas) pizza.cooldown = Math.max(0, pizza.cooldown - dt);
  }

  private punch(ctx: WorldContext, pizza: PizzaProp, controller: ControllerState): void {
    pizza.state = knead(pizza.state);
    pizza.cooldown = PUNCH_COOLDOWN;
    controller.pulse(0.7, 40);
    playTone({ type: 'triangle', from: 190, to: 110, duration: 0.08, gain: 0.06 });
    this.drawPizza(pizza);
    if (isFlat(pizza.state)) {
      this.flatten(pizza);
      ctx.notify('Boden fertig · jetzt die Kelle');
    }
  }

  /** A ball becomes a base: another shape, another collider. */
  private flatten(pizza: PizzaProp): void {
    pizza.ball.visible = false;
    pizza.base.visible = true;
    this.physics!.resize(pizza.entry, new THREE.Vector3(BASE_RADIUS, 0.025, BASE_RADIUS));
    this.settle(pizza);
  }

  // --- what happens to a pizza ---------------------------------------------

  private updatePizzas(dt: number, ctx: WorldContext): void {
    for (let i = this.pizzas.length - 1; i >= 0; i--) {
      const pizza = this.pizzas[i]!;
      const object = pizza.entry.object;

      if (insideBin(object.position)) {
        this.binIt(pizza, i);
        continue;
      }
      if (pizza.entry.carried) pizza.onTable = false;

      if (insideOven(object.position)) {
        const before = pizzaStage(pizza.state);
        pizza.state = bakeFor(pizza.state, dt);
        this.paintBake(pizza);
        const now = pizzaStage(pizza.state);
        if (now !== before && (now === 'fertig' || now === 'verbrannt')) {
          this.announce(ctx, now);
        }
        continue;
      }

      this.updateResting(ctx, pizza);
    }
  }

  /**
   * Dough that has been put down stays put: the moment it comes to rest on the
   * work table it stops being a loose object, so a punch flattens it instead
   * of knocking it across the kitchen.
   */
  private updateResting(ctx: WorldContext, pizza: PizzaProp): void {
    const object = pizza.entry.object;
    if (pizza.entry.carried) return;

    // Already lying on the table. A hand taking it clears the flag, and so
    // does anything else that moved it off the worktop — a stale flag would
    // quietly stop it ever settling or being served again.
    if (pizza.onTable) {
      if (onWorkTable(object.position)) return;
      pizza.onTable = false;
    }

    const velocity = pizza.entry.body.linvel();
    const still = Math.hypot(velocity.x, velocity.y, velocity.z) < 0.25;
    if (!still) return;

    if (onWorkTable(object.position)) {
      this.settle(pizza);
      return;
    }
    if (!pizza.served && pizzaStage(pizza.state) === 'fertig' && onGuestTable(object.position)) {
      this.serve(ctx, pizza);
    }
  }

  /** Lies flat where it was put, and stays there until a hand takes it. */
  private settle(pizza: PizzaProp): void {
    const physics = this.physics!;
    const object = pizza.entry.object;
    const height = isFlat(pizza.state) ? 0.025 : BALL_RADIUS * 0.82;
    const y = TABLE.top + 0.04 + height;
    if (!onWorkTable(object.position)) return;
    pizza.entry.body.setBodyType(physics.rapier.RigidBodyType.KinematicPositionBased, true);
    pizza.entry.body.setTranslation({ x: object.position.x, y, z: object.position.z }, true);
    pizza.entry.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    pizza.entry.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    pizza.onTable = true;
  }

  private serve(ctx: WorldContext, pizza: PizzaProp): void {
    pizza.served = true;
    const score = pizzaScore(pizza.state);
    this.served++;
    this.totalScore += score;
    this.bestScore = Math.max(this.bestScore, score);
    playTone({ type: 'sine', from: 620, to: 980, duration: 0.24, gain: 0.07 });
    ctx.notify(`Serviert · ${score} Punkte`);
    this.drawScore();
    this.drawPizza(pizza);
  }

  private announce(ctx: WorldContext, stage: 'fertig' | 'verbrannt'): void {
    if (stage === 'fertig') {
      playTone({ type: 'sine', from: 520, to: 880, duration: 0.2, gain: 0.07 });
      ctx.notify('Pizza ist fertig — raus damit!');
    } else {
      playTone({ type: 'sawtooth', from: 220, to: 90, duration: 0.35, gain: 0.06 });
      ctx.notify('Verbrannt · ab in den Mülleimer');
    }
  }

  private binIt(pizza: PizzaProp, index: number): void {
    playTone({ type: 'square', from: 300, to: 120, duration: 0.12, gain: 0.05 });
    pizza.label.dispose();
    pizza.label.removeFromParent();
    this.pizzas.splice(index, 1);
    // Not shared: a pizza is made on the machine it is made on, and the ids
    // of two kitchens have nothing to say to each other.
    this.removeProp(pizza.entry, false);
  }

  private clearPizzas(): void {
    for (const pizza of [...this.pizzas]) {
      pizza.label.dispose();
      pizza.label.removeFromParent();
      this.removeProp(pizza.entry, false);
    }
    this.pizzas.length = 0;
    this.crateTimer = CRATE_REFILL;
  }

  // --- what a pizza looks like ---------------------------------------------

  /** Sauce and cheese as far as they have been spread, and the right label. */
  private drawPizza(pizza: PizzaProp): void {
    pizza.sauce.scale.set(
      Math.max(pizza.state.sauce, 0.001),
      1,
      Math.max(pizza.state.sauce, 0.001),
    );
    pizza.cheese.scale.set(
      Math.max(pizza.state.cheese, 0.001),
      1,
      Math.max(pizza.state.cheese, 0.001),
    );
    this.paintBake(pizza);
  }

  private paintBake(pizza: PizzaProp): void {
    const tint = bakeTint(pizza.state.bake);
    pizza.dough.color.setRGB(tint.r, tint.g, tint.b);
  }

  /**
   * The little sign over each pizza: what it is and what it wants next. Only
   * within a couple of metres — a kitchen wallpapered in labels helps nobody.
   */
  private updateLabels(ctx: WorldContext): void {
    ctx.rig.getHeadPosition(_head);
    for (const pizza of this.pizzas) {
      pizza.entry.object.getWorldPosition(_point);
      const near = _point.distanceTo(_head) < 3.2;
      pizza.label.visible = near;
      if (!near) continue;
      const text = pizza.served ? 'Serviert · danke!' : pizzaLabel(pizza.state);
      if (text !== pizza.written) {
        pizza.label.setText(text, pizza.served ? '' : pizzaHint(pizza.state));
        pizza.written = text;
      }
      pizza.label.position.copy(_point).y += 0.3;
      pizza.label.lookAt(_head);
    }
  }

  private drawScore(): void {
    const average = this.served > 0 ? Math.round(this.totalScore / this.served) : 0;
    this.scoreBoard?.setText(
      `Serviert: ${this.served}`,
      this.served === 0
        ? 'Fertige Pizza auf einen Tisch im Gastraum stellen'
        : `Beste ${this.bestScore} Punkte · Schnitt ${average}`,
    );
  }
}

/** The node a hand's belongings hang on. */
function gripOf(controller: ControllerState): THREE.Object3D {
  return controller.grip.visible ? controller.grip : controller.targetRay;
}

/** Lying on the work table, close enough to the top to be resting on it. */
function onWorkTable(position: THREE.Vector3): boolean {
  // The crate is on the table but is not part of the worktop: dough is meant
  // to be taken out of it, not kneaded in it.
  if (Math.abs(position.x - CRATE_X) < 0.32 && Math.abs(position.z - STATION_Z) < 0.32) {
    return false;
  }
  return (
    Math.abs(position.x - TABLE.x) < TABLE.w / 2 - 0.1 &&
    Math.abs(position.z - TABLE.z) < TABLE.d / 2 - 0.05 &&
    position.y > TABLE.top &&
    position.y < TABLE.top + 0.32
  );
}

/** Standing on one of the tables in the front room. */
function onGuestTable(position: THREE.Vector3): boolean {
  if (position.y < TABLE_HEIGHT || position.y > TABLE_HEIGHT + 0.3) return false;
  return TABLES.some(([x, z]) => Math.hypot(position.x - x, position.z - z) < TABLE_RADIUS - 0.05);
}

/** Inside the oven's mouth. */
function insideOven(position: THREE.Vector3): boolean {
  return (
    Math.abs(position.x - OVEN.x) < 0.48 &&
    position.y > 0.88 &&
    position.y < 1.45 &&
    position.z > OVEN.z - 0.45 &&
    position.z < OVEN.z + 0.5
  );
}

/** Down in the bin. */
function insideBin(position: THREE.Vector3): boolean {
  return (
    Math.abs(position.x - BIN.x) < BIN.half &&
    Math.abs(position.z - BIN.z) < BIN.half &&
    position.y < BIN.rim
  );
}
