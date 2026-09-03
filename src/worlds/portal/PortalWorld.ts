import * as THREE from 'three';
import type { World, WorldContext } from '../../core/types';
import type { MenuEntry } from '../../ui/menu';
import type { ControllerState, Handedness } from '../../core/XRInput';
import { Portal, PORTAL_HALF_HEIGHT, PORTAL_HALF_WIDTH } from './Portal';
import { PortalRenderer } from './PortalRenderer';
import { PortalGun } from './PortalGun';
import { createCompanionCube, createDominoes, DOMINO_SIZE } from './props';
import { TextPlane } from '../../ui/TextPlane';
import { createLighting, disposeTree } from '../shared/environment';
import {
  ALL_GROUPS,
  GROUP_HAND,
  GROUP_PORTAL_SURFACE,
  GROUP_PROP,
  GROUP_WORLD,
  PhysicsWorld,
  type PhysicsBody,
} from '../../physics/PhysicsWorld';
import { PhysicsLocomotion } from '../../physics/PhysicsLocomotion';
import { FreeLocomotion } from '../../core/Locomotion';

const ROOM = { half: 8, height: 4.6, thickness: 0.4 };
const SPAWN = new THREE.Vector3(0, 0, 5.5);
const COLOR_BLUE = 0x2f8fff;
const COLOR_RED = 0xff3b2f;
const UP = new THREE.Vector3(0, 1, 0);
const FUNNEL_DEPTH = 1.1;
/** The grab box is the collider grown by this much — same for every object. */
const GRAB_MARGIN = 0.09;
/** How far a remote grab reaches, and how hard you have to pull. */
const REMOTE_RANGE = 9;
const REMOTE_PULL_SPEED = 1.5;

const _direction = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _placeUp = new THREE.Vector3();
const _local = new THREE.Vector3();
const _target = new THREE.Vector3();
const _velocity = new THREE.Vector3();
const _head = new THREE.Vector3();
const _cross = new THREE.Vector3();
const _point = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _rotationMatrix = new THREE.Matrix4();
const _rotation = new THREE.Quaternion();
const _normalMatrix = new THREE.Matrix3();
const _ray = new THREE.Ray();
const _quaternion = new THREE.Quaternion();
const _hitPoint = new THREE.Vector3();
const _hitNormal = new THREE.Vector3();
const _hit = { point: _hitPoint, normal: _hitNormal, object: null as unknown as THREE.Object3D };

interface GunSlot {
  gun: PortalGun;
  portal: Portal;
  /** The hip this gun rests on. Either hand may pick it up. */
  side: Handedness;
  holster: THREE.Object3D;
  heldBy: Handedness | null;
  /** Blocks a shot on the very frame the gun was picked up. */
  justGrabbed: boolean;
  /** Preview of where this gun would place its portal. */
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
}

interface HandProbe {
  object: THREE.Object3D;
  entry: PhysicsBody;
}

interface HandMotion {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

/** A prop on its way to a hand after a remote pull. */
interface Flight {
  hand: Handedness;
  time: number;
}

interface HandGrab {
  entry: PhysicsBody;
  /** Pose of the prop relative to the hand at pick-up time. */
  offset: THREE.Matrix4;
  lastPosition: THREE.Vector3;
  velocity: THREE.Vector3;
}

/**
 * Portal sandbox with real physics: walk, jump and fall through portals, knock
 * over dominoes and carry the companion cube around.
 *
 * Both hands wear a portal gun on the belt — grab it to hold it, the left one
 * shoots blue, the right one red.
 */
export class PortalWorld implements World {
  private readonly root = new THREE.Group();
  private readonly portalBlue = new Portal('a', COLOR_BLUE);
  private readonly portalRed = new Portal('b', COLOR_RED);
  private readonly raycaster = new THREE.Raycaster();
  private readonly surfaces: THREE.Object3D[] = [];
  private readonly props: PhysicsBody[] = [];
  private readonly spawns = new Map<PhysicsBody, THREE.Matrix4>();
  private readonly slots: GunSlot[] = [];
  private readonly probes = new Map<Handedness, HandProbe>();
  private readonly grabs = new Map<Handedness, HandGrab>();
  private readonly spawned = new Set<PhysicsBody>();
  private readonly motions = new Map<Handedness, HandMotion>();
  private readonly flights = new Map<PhysicsBody, Flight>();
  /** Setting: pull distant objects towards you with a flick of the wrist. */
  private remoteGrab = false;
  private highlighted = new Set<PhysicsBody>();
  private reopenBag = false;
  private readonly previousHead = new THREE.Vector3();

  private physics: PhysicsWorld | null = null;
  private locomotion: PhysicsLocomotion | null = null;
  private context: WorldContext | null = null;
  private portalRenderer: PortalRenderer | null = null;
  private hasPreviousHead = false;
  private time = 0;
  private canvas: HTMLCanvasElement | null = null;
  private flatFire: ((event: MouseEvent) => void) | null = null;
  private flatKeys: ((event: KeyboardEvent) => void) | null = null;
  private blockContextMenu: ((event: Event) => void) | null = null;

  async init(ctx: WorldContext): Promise<void> {
    this.context = ctx;
    this.root.name = 'portal-world';
    ctx.scene.add(this.root);
    ctx.scene.background = new THREE.Color(0x0a0f18);
    ctx.scene.fog = null;
    this.root.add(createLighting(0.6));

    this.physics = await PhysicsWorld.create();
    this.buildChamber();
    this.buildProps();

    this.portalBlue.link = this.portalRed;
    this.portalRed.link = this.portalBlue;
    this.root.add(this.portalBlue, this.portalRed);

    this.portalRenderer = new PortalRenderer(ctx.renderer);

    ctx.rig.placeAt(SPAWN, 0);
    this.locomotion = new PhysicsLocomotion(this.physics, ctx.rig);
    ctx.rig.setLocomotion(this.locomotion);
    this.hasPreviousHead = false;

    this.setupGuns(ctx);
    this.bindFlatInput(ctx);

    ctx.notify('Waffen am Gürtel greifen · Trigger schießt · A springt');
  }

  update(dt: number, ctx: WorldContext): void {
    this.context = ctx;
    if (!this.physics || !this.locomotion) return;

    this.time += dt;
    this.portalBlue.setTime(this.time);
    this.portalRed.setTime(this.time);

    this.updateGuns(dt, ctx);
    this.updateGrabs(dt, ctx);
    this.updateHandProbes(ctx);
    this.handleFiring(ctx);

    this.locomotion.phasing = this.playerInFunnel();

    this.updatePropPhasing();
    this.physics.step(dt);
    this.physics.sync();
    this.traverseProps();
    this.traversePlayer(ctx);
    this.updateAim(ctx);
  }

  menu(): MenuEntry[] {
    const ctx = () => this.context!;
    const remote: MenuEntry = {
      id: 'setting:remote-grab',
      label: 'Fernangeln',
      sub: 'Zielen, dann die Hand zurückreißen',
      icon: 'settings',
      accent: 0x4aa8ff,
      checked: this.remoteGrab,
      run: () => {
        this.remoteGrab = !this.remoteGrab;
        remote.checked = this.remoteGrab;
        this.context?.notify(this.remoteGrab ? 'Fernangeln an' : 'Fernangeln aus');
      },
    };

    return [
      {
        id: 'tools',
        label: 'Werkzeuge',
        sub: 'Ausrüstung in die Hand',
        icon: 'tools',
        accent: 0x9d7bff,
        children: [
          {
            id: 'tool:gun-blue',
            label: 'Portal Waffe blau',
            sub: 'Setzt das blaue Portal',
            icon: 'gun',
            accent: COLOR_BLUE,
            run: (hand) => this.equipGun(ctx(), hand, 'a'),
          },
          {
            id: 'tool:gun-red',
            label: 'Portal Waffe rot',
            sub: 'Setzt das rote Portal',
            icon: 'gun',
            accent: COLOR_RED,
            run: (hand) => this.equipGun(ctx(), hand, 'b'),
          },
        ],
      },
      {
        id: 'bag',
        label: 'Magischer Beutel',
        sub: 'Objekte herbeirufen',
        icon: 'bag',
        accent: 0xffc857,
        grid: true,
        children: [
          {
            id: 'bag:cube',
            label: 'Cube',
            icon: 'cube',
            accent: 0xffc857,
            run: (hand) => this.spawnProp(ctx(), hand, 'cube'),
          },
          {
            id: 'bag:domino',
            label: 'Domino',
            icon: 'domino',
            accent: 0xffc857,
            run: (hand) => this.spawnProp(ctx(), hand, 'domino'),
          },
        ],
      },
      {
        id: 'settings',
        label: 'Einstellungen',
        sub: 'Was darf die Hand?',
        icon: 'settings',
        accent: 0x4aa8ff,
        children: [remote],
      },
      {
        id: 'reset',
        label: 'Labor zurücksetzen',
        sub: 'Portale, Würfel und Dominos',
        icon: 'reset',
        accent: COLOR_RED,
        run: () => this.resetWorld(ctx()),
      },
    ];
  }

  render(ctx: WorldContext): boolean {
    this.portalRenderer?.render(ctx.scene, ctx.camera, [this.portalBlue, this.portalRed]);
    ctx.renderer.render(ctx.scene, ctx.camera);
    return true;
  }

  dispose(ctx: WorldContext): void {
    if (this.canvas) {
      if (this.flatFire) this.canvas.removeEventListener('mousedown', this.flatFire);
      if (this.blockContextMenu) {
        this.canvas.removeEventListener('contextmenu', this.blockContextMenu);
      }
    }
    if (this.flatKeys) window.removeEventListener('keydown', this.flatKeys);
    this.canvas = null;
    this.flatFire = null;
    this.flatKeys = null;
    this.blockContextMenu = null;

    for (const slot of this.slots) slot.gun.dispose();
    this.slots.length = 0;
    this.grabs.clear();
    this.spawned.clear();
    this.highlighted.clear();
    this.context = null;
    ctx.hands.setGestureOverride('left', null);
    ctx.hands.setGestureOverride('right', null);

    // The character controller lives in the physics world, so it has to go
    // before that world is freed.
    ctx.rig.setLocomotion(new FreeLocomotion());
    this.locomotion = null;

    this.portalRenderer?.dispose();
    this.portalRenderer = null;
    this.portalBlue.dispose();
    this.portalRed.dispose();
    this.probes.clear();
    this.props.length = 0;
    this.spawns.clear();
    this.surfaces.length = 0;

    this.flights.clear();
    this.motions.clear();
    disposeTree(this.root);
    ctx.scene.background = null;
    this.physics?.dispose();
    this.physics = null;
  }

  // --- chamber ------------------------------------------------------------

  private buildChamber(): void {
    const chamber = new THREE.Group();
    chamber.name = 'chamber';
    this.root.add(chamber);

    const panel = new THREE.MeshStandardMaterial({
      color: 0xe7ecf5,
      roughness: 0.7,
      metalness: 0.05,
    });
    const shielded = new THREE.MeshStandardMaterial({
      color: 0x55648a,
      roughness: 0.45,
      metalness: 0.5,
    });
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8e9db8,
      roughness: 0.85,
      metalness: 0.05,
    });

    const half = ROOM.half;
    const t = ROOM.thickness;

    // Floor and ceiling take portals too — that is what makes falling fun.
    this.slab(chamber, floorMaterial, [half * 2, t, half * 2], [0, -t / 2, 0], true);
    this.slab(chamber, panel, [half * 2, t, half * 2], [0, ROOM.height + t / 2, 0], true);

    this.slab(chamber, panel, [half * 2, ROOM.height, t], [0, ROOM.height / 2, -half - t / 2], true);
    this.slab(chamber, panel, [t, ROOM.height, half * 2], [half + t / 2, ROOM.height / 2, 0], true);
    this.slab(chamber, panel, [t, ROOM.height, half * 2], [-half - t / 2, ROOM.height / 2, 0], true);
    // The wall behind the spawn is shielded: no portals stick to it.
    this.slab(chamber, shielded, [half * 2, ROOM.height, t], [0, ROOM.height / 2, half + t / 2], false);

    const grid = new THREE.GridHelper(half * 2, 16, 0x5d7398, 0x7d8ea9);
    grid.position.y = 0.01;
    chamber.add(grid);

    // Two panels facing each other: shoot both and you can look at yourself.
    for (const [x, z, angle] of [
      [-4.6, -1.2, Math.PI / 2],
      [4.6, -1.2, -Math.PI / 2],
    ] as const) {
      const board = this.slab(chamber, panel, [3.6, 3.2, 0.2], [x, 1.7, z], true, false);
      board.rotation.y = angle;
      board.updateMatrixWorld(true);
      this.physics!.addStatic(board, { membership: GROUP_PORTAL_SURFACE, filter: ALL_GROUPS });
    }

    // A ledge that is out of reach without jumping or a portal.
    const ledge = this.slab(chamber, shielded, [3, 1.5, 2.4], [-5.4, 0.75, -5.4], false);
    void ledge;

    for (const side of [-1, 1]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(half * 2 - 0.6, 0.06, 0.06),
        new THREE.MeshBasicMaterial({ color: 0x9ec4ff, toneMapped: false }),
      );
      strip.position.set(0, ROOM.height - 0.3, side * (half - 0.15));
      chamber.add(strip);
    }
    for (const [x, z] of [
      [-4, -4],
      [4, -4],
      [-4, 4],
      [4, 4],
    ] as const) {
      const lamp = new THREE.PointLight(0xdce8ff, 9, 22, 2);
      lamp.position.set(x, ROOM.height - 0.5, z);
      this.root.add(lamp);
    }

    const sign = new TextPlane({
      width: 3,
      height: 0.9,
      title: 'Portal Labor',
      body: 'Weiße Flächen halten Portale, die blaue Rückwand nicht. Links blau, rechts rot.',
      accent: COLOR_RED,
    });
    sign.position.set(0, 2.8, half - 0.02);
    sign.rotation.y = Math.PI;
    chamber.add(sign);
  }

  /** Adds a box that is both visible and solid. */
  private slab(
    parent: THREE.Object3D,
    material: THREE.Material,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    portalable: boolean,
    physics = true,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.name = portalable ? 'surface:panel' : 'surface:shielded';
    parent.add(mesh);
    mesh.updateWorldMatrix(true, false);

    if (portalable) this.surfaces.push(mesh);
    if (physics) {
      this.physics!.addStatic(mesh, {
        membership: portalable ? GROUP_PORTAL_SURFACE : GROUP_WORLD,
        filter: ALL_GROUPS,
      });
    }
    return mesh;
  }

  private buildProps(): void {
    const physics = this.physics!;

    const cube = createCompanionCube(0.5);
    cube.position.set(-5.4, 1.9, -5.4);
    this.root.add(cube);
    this.registerProp(physics.addDynamic(cube, { mass: 8, friction: 0.8, restitution: 0.1 }));

    const second = createCompanionCube(0.4);
    second.position.set(1.8, 0.3, 2.2);
    this.root.add(second);
    this.registerProp(physics.addDynamic(second, { mass: 5, friction: 0.8, restitution: 0.1 }));

    const dominoes = createDominoes(16, COLOR_BLUE);
    dominoes.forEach((domino, index) => {
      domino.position.set(-2.4 + index * 0.32, DOMINO_SIZE.y / 2 + 0.001, 1.6);
      this.root.add(domino);
      this.registerProp(
        physics.addDynamic(domino, {
          mass: 0.35,
          friction: 0.6,
          restitution: 0.02,
          angularDamping: 0.25,
          ccd: true,
        }),
      );
    });
  }

  private registerProp(entry: PhysicsBody): void {
    entry.object.updateWorldMatrix(true, false);
    this.spawns.set(entry, entry.object.matrixWorld.clone());
    this.props.push(entry);
  }

  // --- guns on the belt ---------------------------------------------------

  private setupGuns(ctx: WorldContext): void {
    const definitions: Array<[Handedness, Portal, number]> = [
      ['left', this.portalBlue, COLOR_BLUE],
      ['right', this.portalRed, COLOR_RED],
    ];
    for (const [side, portal, color] of definitions) {
      const gun = new PortalGun(portal.key, color);
      const holster = new THREE.Object3D();
      ctx.rig.add(holster);
      holster.add(gun);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.96, 1, 48),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.6,
          toneMapped: false,
          side: THREE.DoubleSide,
        }),
      );
      ring.scale.set(PORTAL_HALF_WIDTH, PORTAL_HALF_HEIGHT, 1);
      ring.renderOrder = 5;
      ring.visible = false;
      this.root.add(ring);

      this.slots.push({ gun, portal, side, holster, heldBy: null, justGrabbed: false, ring });
    }
  }

  /**
   * Both guns hang on the belt and either hand can take either one — the gun
   * decides the colour, not the hand.
   */
  private updateGuns(dt: number, ctx: WorldContext): void {
    const height = ctx.rig.getHeadHeight();
    const yaw = ctx.avatar.bodyYaw;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    ctx.rig.getHeadPosition(_head);
    ctx.rig.worldToLocal(_head);

    for (const slot of this.slots) {
      slot.justGrabbed = false;
      const side = slot.side === 'left' ? -1 : 1;
      slot.holster.position.set(
        _head.x + cos * side * 0.26 + sin * 0.04,
        height * 0.5,
        _head.z - sin * side * 0.26 + cos * 0.04,
      );
      slot.holster.rotation.set(0, yaw, 0);
    }

    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand) continue;
      const held = this.slots.find((slot) => slot.heldBy === hand) ?? null;

      if (!controller.tracked) {
        if (held) this.holsterGun(ctx, held);
        continue;
      }

      // Controllers hold the gun while the grip is down. Tracked hands have no
      // grip button, so there a pinch at the belt toggles it.
      const pressed = controller.isHand
        ? controller.trigger.justPressed
        : controller.squeeze.justPressed;

      if (held) {
        const letGo = controller.isHand
          ? pressed && this.handNearHolster(ctx, controller, held)
          : !controller.squeeze.pressed;
        if (letGo) this.holsterGun(ctx, held);
        else this.alignGun(controller, held);
        continue;
      }

      if (!pressed) continue;
      const target = this.slots.find(
        (slot) => !slot.heldBy && this.handNearHolster(ctx, controller, slot),
      );
      if (target) this.takeGun(ctx, controller, target);
    }

    for (const slot of this.slots) slot.gun.update(dt);
  }

  private takeGun(ctx: WorldContext, controller: ControllerState, slot: GunSlot): void {
    const hand = controller.handedness;
    if (!hand) return;

    const grab = this.grabs.get(hand);
    if (grab) this.release(ctx, hand, grab, true);

    slot.heldBy = hand;
    slot.justGrabbed = true;
    const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
    anchor.add(slot.gun);
    slot.gun.position.set(0, -0.012, 0.03);
    slot.gun.holstered = false;
    this.alignGun(controller, slot);
    controller.pulse(0.4, 25);
  }

  private holsterGun(ctx: WorldContext, slot: GunSlot): void {
    slot.holster.add(slot.gun);
    slot.gun.position.set(0, 0, 0);
    slot.gun.quaternion.identity();
    slot.gun.holstered = true;
    slot.heldBy = null;
    void ctx;
  }

  /**
   * Aims the gun along the pointing ray instead of along the controller handle
   * — the grip axis is tilted, which made every shot go up and away.
   */
  private alignGun(controller: ControllerState, slot: GunSlot): void {
    if (slot.gun.parent === controller.grip) {
      slot.gun.quaternion
        .copy(controller.grip.quaternion)
        .invert()
        .multiply(controller.targetRay.quaternion);
    } else {
      slot.gun.quaternion.identity();
    }
  }

  /** Puts a specific gun into a hand, used by the tool menu. */
  private equipGun(ctx: WorldContext, hand: Handedness | null, key: 'a' | 'b'): void {
    const slot = this.slots.find((entry) => entry.gun.key === key);
    if (!slot) return;
    // Without a known hand, take whichever one is still free.
    const target: Handedness =
      hand ?? (this.gunHeldBy('right') || this.grabs.has('right') ? 'left' : 'right');
    const controller = ctx.input.get(target);
    if (!controller?.tracked) {
      ctx.notify('Keine Hand für die Waffe gefunden');
      return;
    }
    if (slot.heldBy === target) return;
    if (slot.heldBy) this.holsterGun(ctx, slot);
    this.takeGun(ctx, controller, slot);
    ctx.notify(key === 'a' ? 'Blaue Portal Waffe' : 'Rote Portal Waffe');
  }

  private handNearHolster(ctx: WorldContext, controller: ControllerState, slot: GunSlot): boolean {
    const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
    anchor.getWorldPosition(_hand);
    ctx.rig.worldToLocal(_hand);
    return _hand.distanceTo(slot.holster.position) < 0.32;
  }

  private gunHeldBy(hand: Handedness): GunSlot | null {
    return this.slots.find((slot) => slot.heldBy === hand) ?? null;
  }

  /** Empty hands can pick up props, pass them over and throw them. */
  private updateGrabs(dt: number, ctx: WorldContext): void {
    const reachable = new Set<PhysicsBody>();

    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand) continue;
      const grab = this.grabs.get(hand);

      if (!controller.tracked) {
        if (grab) this.release(ctx, hand, grab, true);
        continue;
      }

      const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
      anchor.updateWorldMatrix(true, false);
      const pressed = controller.isHand
        ? controller.trigger.justPressed
        : controller.squeeze.justPressed;

      if (grab) {
        const holding = controller.isHand ? !pressed : controller.squeeze.pressed;
        if (!holding) {
          this.release(ctx, hand, grab, true);
          continue;
        }
        _matrix.multiplyMatrices(anchor.matrixWorld, grab.offset);
        _matrix.decompose(_point, _quaternion, _probe);
        grab.velocity.copy(_point).sub(grab.lastPosition).divideScalar(Math.max(dt, 1 / 120));
        grab.lastPosition.copy(_point);
        grab.entry.body.setNextKinematicTranslation({ x: _point.x, y: _point.y, z: _point.z });
        grab.entry.body.setNextKinematicRotation({
          x: _quaternion.x,
          y: _quaternion.y,
          z: _quaternion.z,
          w: _quaternion.w,
        });
        continue;
      }

      if (this.gunHeldBy(hand)) continue;

      anchor.getWorldPosition(_hand);
      const entry = this.findProp(_hand);
      if (entry) reachable.add(entry);
      if (!entry || !pressed) continue;

      // Already in the other hand? Then this is a hand-over, not a pick-up.
      const other = this.handHolding(entry);
      if (other) this.release(ctx, other, this.grabs.get(other)!, false);
      this.attach(hand, anchor, entry);
      controller.pulse(0.5, 30);
    }

    this.updateRemote(dt, ctx, reachable);
    this.updateFlights(dt, ctx);
    this.updateHighlights(reachable);
    this.updateHandGestures(ctx, reachable);
  }

  /**
   * Remote grabbing: aim at something, then pull the hand back sharply and the
   * object is thrown towards you in an arc. Keep holding grab and it lands in
   * your hand; let go and it simply flies on.
   */
  private updateRemote(dt: number, ctx: WorldContext, reachable: Set<PhysicsBody>): void {
    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand || !controller.tracked) continue;

      const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
      anchor.getWorldPosition(_hand);
      let motion = this.motions.get(hand);
      if (!motion) {
        motion = { position: _hand.clone(), velocity: new THREE.Vector3() };
        this.motions.set(hand, motion);
      }
      _velocity.copy(_hand).sub(motion.position).divideScalar(Math.max(dt, 1 / 120));
      motion.velocity.lerp(_velocity, 0.5);
      motion.position.copy(_hand);

      if (!this.remoteGrab) continue;
      if (this.grabs.has(hand) || this.gunHeldBy(hand)) continue;
      const holding = controller.isHand
        ? controller.trigger.pressed
        : controller.squeeze.pressed;
      if (!holding) continue;

      controller.getRay(_ray);
      const entry = this.findRemoteTarget(_ray);
      if (!entry) continue;
      reachable.add(entry);

      if (-motion.velocity.dot(_ray.direction) < REMOTE_PULL_SPEED) continue;
      this.launchToHand(entry, hand, _hand);
      controller.pulse(0.6, 40);
    }
  }

  private findRemoteTarget(ray: THREE.Ray): PhysicsBody | null {
    let best: PhysicsBody | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const entry of this.props) {
      if (this.flights.has(entry) || this.handHolding(entry)) continue;
      const t = entry.body.translation();
      _probe.set(t.x, t.y, t.z);

      const along = _target.copy(_probe).sub(ray.origin).dot(ray.direction);
      if (along < 0.35 || along > REMOTE_RANGE || along >= bestDistance) continue;

      ray.closestPointToPoint(_probe, _point);
      const size = Math.max(entry.halfExtents.x, entry.halfExtents.y, entry.halfExtents.z);
      if (_point.distanceTo(_probe) > size + 0.28) continue;

      best = entry;
      bestDistance = along;
    }
    return best;
  }

  /** Ballistic arc from the prop to the hand. */
  private launchToHand(entry: PhysicsBody, hand: Handedness, handPosition: THREE.Vector3): void {
    const physics = this.physics!;
    const t = entry.body.translation();
    _point.set(t.x, t.y, t.z);

    const distance = _point.distanceTo(handPosition);
    const time = THREE.MathUtils.clamp(distance / 7, 0.35, 1);
    _velocity.copy(handPosition).sub(_point).divideScalar(time);
    _velocity.y += 0.5 * 9.81 * time;

    entry.body.setBodyType(physics.rapier.RigidBodyType.Dynamic, true);
    physics.setCarried(entry, true);
    entry.body.setLinvel({ x: _velocity.x, y: _velocity.y, z: _velocity.z }, true);
    entry.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.flights.set(entry, { hand, time: 0 });
  }

  private updateFlights(dt: number, ctx: WorldContext): void {
    const physics = this.physics!;

    for (const [entry, flight] of [...this.flights]) {
      flight.time += dt;
      const controller = ctx.input.get(flight.hand);
      const holding =
        controller?.tracked &&
        (controller.isHand ? controller.trigger.pressed : controller.squeeze.pressed);

      if (!holding || flight.time > 2.5 || this.grabs.has(flight.hand)) {
        this.flights.delete(entry);
        physics.setCarried(entry, false);
        continue;
      }

      const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
      anchor.getWorldPosition(_hand);
      const t = entry.body.translation();
      _point.set(t.x, t.y, t.z);

      if (_point.distanceTo(_hand) < 0.3) {
        this.flights.delete(entry);
        anchor.updateWorldMatrix(true, false);
        this.attach(flight.hand, anchor, entry);
        controller.pulse(0.5, 30);
        continue;
      }

      // Steer it home a little, so a good flick always connects.
      const linear = entry.body.linvel();
      _velocity.set(linear.x, linear.y, linear.z);
      const speed = Math.max(_velocity.length(), 2.5);
      _target.copy(_hand).sub(_point).normalize().multiplyScalar(speed);
      _velocity.lerp(_target, Math.min(1, dt * 2.5));
      entry.body.setLinvel({ x: _velocity.x, y: _velocity.y, z: _velocity.z }, true);
    }
  }

  private attach(hand: Handedness, anchor: THREE.Object3D, entry: PhysicsBody): void {
    const physics = this.physics!;
    entry.body.setBodyType(physics.rapier.RigidBodyType.KinematicPositionBased, true);
    physics.setCarried(entry, true);
    entry.object.updateWorldMatrix(true, false);
    const offset = new THREE.Matrix4()
      .copy(anchor.matrixWorld)
      .invert()
      .multiply(entry.object.matrixWorld);
    entry.object.getWorldPosition(_point);
    this.grabs.set(hand, {
      entry,
      offset,
      lastPosition: _point.clone(),
      velocity: new THREE.Vector3(),
    });
  }

  private release(ctx: WorldContext, hand: Handedness, grab: HandGrab, drop: boolean): void {
    const physics = this.physics!;
    this.grabs.delete(hand);
    if (!drop) return;

    physics.setCarried(grab.entry, false);
    grab.entry.body.setBodyType(physics.rapier.RigidBodyType.Dynamic, true);
    const thrown = grab.velocity.clampLength(0, 9);
    grab.entry.body.setLinvel({ x: thrown.x, y: thrown.y, z: thrown.z }, true);

    if (this.reopenBag && this.spawned.has(grab.entry)) {
      this.reopenBag = false;
      ctx.menu.openSubmenu('bag');
    }
  }

  private handHolding(entry: PhysicsBody): Handedness | null {
    for (const [hand, grab] of this.grabs) {
      if (grab.entry === entry) return hand;
    }
    return null;
  }

  /**
   * Closest prop whose grab box contains the point. The box is the collider
   * plus a fixed margin, so a small domino is as easy to catch as a big cube.
   */
  private findProp(position: THREE.Vector3): PhysicsBody | null {
    let best: PhysicsBody | null = null;
    let bestDepth = Number.POSITIVE_INFINITY;
    for (const entry of this.props) {
      const depth = reachDepth(entry, position);
      if (depth !== null && depth < bestDepth) {
        best = entry;
        bestDepth = depth;
      }
    }
    return best;
  }

  /** Glow on everything a hand could grab right now. */
  private updateHighlights(reachable: Set<PhysicsBody>): void {
    for (const entry of this.highlighted) {
      if (!reachable.has(entry)) setEmissive(entry, false);
    }
    for (const entry of reachable) {
      if (!this.highlighted.has(entry)) setEmissive(entry, true);
    }
    this.highlighted = reachable;
  }

  private updateHandGestures(ctx: WorldContext, reachable: Set<PhysicsBody>): void {
    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand) continue;
      if (this.gunHeldBy(hand) || this.grabs.has(hand)) {
        ctx.hands.setGestureOverride(hand, 'grip');
        continue;
      }
      if (reachable.size > 0 && controller.tracked) {
        const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
        anchor.getWorldPosition(_hand);
        ctx.hands.setGestureOverride(hand, this.findProp(_hand) ? 'ready' : null);
        continue;
      }
      ctx.hands.setGestureOverride(hand, null);
    }
  }

  /** Conjures a new prop straight into the hand that picked it from the bag. */
  private spawnProp(ctx: WorldContext, hand: Handedness | null, kind: 'cube' | 'domino'): void {
    const physics = this.physics;
    if (!physics) return;

    const mesh = kind === 'cube' ? createCompanionCube(0.32) : createDominoes(1, COLOR_RED)[0]!;
    const controller = hand ? ctx.input.get(hand) : null;
    const anchor = controller?.tracked
      ? controller.grip.visible
        ? controller.grip
        : controller.targetRay
      : null;

    if (anchor) {
      anchor.getWorldPosition(_point);
    } else {
      ctx.rig.getHeadPosition(_point);
      ctx.rig.getHeadForward(_direction);
      _point.addScaledVector(_direction, 0.7);
    }
    mesh.position.copy(_point);
    this.root.add(mesh);
    mesh.updateWorldMatrix(true, false);

    const entry = physics.addDynamic(mesh, {
      mass: kind === 'cube' ? 4 : 0.35,
      friction: 0.7,
      restitution: 0.05,
      ccd: kind === 'domino',
    });
    entry.previousPosition.copy(_point);
    this.props.push(entry);
    this.spawned.add(entry);

    ctx.menu.toggle(false);
    if (hand && anchor) {
      const existing = this.grabs.get(hand);
      if (existing) this.release(ctx, hand, existing, true);
      this.attach(hand, anchor, entry);
      this.reopenBag = true;
    }
    ctx.notify(kind === 'cube' ? 'Companion Cube' : 'Domino');
  }

  /** Removes everything that came out of the bag again. */
  private clearSpawned(): void {
    const physics = this.physics;
    if (!physics) return;
    for (const entry of [...this.spawned]) {
      for (const [hand, grab] of [...this.grabs]) {
        if (grab.entry === entry) this.grabs.delete(hand);
      }
      this.highlighted.delete(entry);
      this.flights.delete(entry);
      this.spawns.delete(entry);
      const index = this.props.indexOf(entry);
      if (index >= 0) this.props.splice(index, 1);
      physics.remove(entry);
      disposeTree(entry.object);
    }
    this.spawned.clear();
  }

  // --- hands that can touch things ----------------------------------------

  private updateHandProbes(ctx: WorldContext): void {
    const physics = this.physics!;
    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand) continue;

      let probe = this.probes.get(hand);
      if (!probe) {
        const object = new THREE.Object3D();
        object.position.set(0, -60, 0);
        this.root.add(object);
        const entry = physics.addKinematic(object, {
          halfExtents: new THREE.Vector3(0.016, 0.016, 0.016),
          membership: GROUP_HAND,
          filter: GROUP_PROP,
        });
        probe = { object, entry };
        this.probes.set(hand, probe);
      }

      const gesture = ctx.hands.gestureOf(controller);
      const active =
        controller.tracked && (controller.isHand || gesture === 'point' || gesture === 'open');
      const tip = active ? controller.getFingertip(_point) : null;
      const target = tip ?? _point.set(0, -60, 0);
      probe.entry.body.setNextKinematicTranslation({ x: target.x, y: target.y, z: target.z });
    }
  }

  // --- shooting -----------------------------------------------------------

  private bindFlatInput(ctx: WorldContext): void {
    this.canvas = ctx.renderer.domElement;
    this.flatFire = (event: MouseEvent) => {
      if (ctx.renderer.xr.isPresenting || ctx.pointer.hovering) return;
      if (event.button === 0) this.shoot(ctx, this.slots[0]!);
      else if (event.button === 2) this.shoot(ctx, this.slots[1]!);
    };
    this.flatKeys = (event: KeyboardEvent) => {
      if (event.code === 'KeyR') this.resetWorld(ctx);
    };
    this.blockContextMenu = (event: Event) => event.preventDefault();
    this.canvas.addEventListener('mousedown', this.flatFire);
    this.canvas.addEventListener('contextmenu', this.blockContextMenu);
    window.addEventListener('keydown', this.flatKeys);
  }

  private handleFiring(ctx: WorldContext): void {
    if (!ctx.renderer.xr.isPresenting) return;
    // The trigger also drives the wrist menu, so pointing at UI wins.
    if (ctx.pointer.hovering) return;
    for (const slot of this.slots) {
      if (!slot.heldBy || slot.justGrabbed) continue;
      const controller = ctx.input.get(slot.heldBy);
      if (controller?.trigger.justPressed) this.shoot(ctx, slot);
    }
    for (const controller of ctx.input.controllers) {
      if (controller.secondary.justPressed) this.resetWorld(ctx);
    }
  }

  private shoot(ctx: WorldContext, slot: GunSlot): void {
    const ray = this.getAimRay(ctx, slot);
    const hit = this.castSurface(ray);
    slot.gun.fire();
    if (slot.heldBy) ctx.input.get(slot.heldBy)?.pulse(0.35, 25);

    if (!hit) {
      ctx.notify('Keine Fläche getroffen');
      return;
    }
    surfaceUp(ray.direction, hit.normal, _placeUp);
    if (!this.fits(hit.point, hit.normal, _placeUp, hit.object)) {
      ctx.notify('Hier passt kein Portal hin');
      return;
    }

    const other = slot.portal === this.portalBlue ? this.portalRed : this.portalBlue;
    if (other.placed && other.getWorldNormal(_probe).dot(hit.normal) > 0.98) {
      other.getWorldPosition(_probe);
      if (_probe.distanceTo(hit.point) < PORTAL_HALF_WIDTH * 2.05) {
        ctx.notify('Portale überlappen sich');
        return;
      }
    }

    slot.portal.place(hit.point, hit.normal, _placeUp);
    ctx.notify(slot.portal === this.portalBlue ? 'Blaues Portal' : 'Rotes Portal');
  }

  /** Ray the gun points along; the head ray while not in VR. */
  private getAimRay(ctx: WorldContext, slot: GunSlot): THREE.Ray {
    const controller = slot.heldBy ? ctx.input.get(slot.heldBy) : null;
    if (ctx.renderer.xr.isPresenting && slot.heldBy && controller?.tracked) {
      slot.gun.muzzle.getWorldPosition(_ray.origin);
      _ray.direction
        .set(0, 0, -1)
        .applyQuaternion(slot.gun.getWorldQuaternion(_quaternion))
        .normalize();
      return _ray;
    }
    ctx.camera.updateWorldMatrix(true, false);
    _ray.origin.setFromMatrixPosition(ctx.camera.matrixWorld);
    _ray.direction.set(0, 0, -1).applyQuaternion(ctx.camera.getWorldQuaternion(_quaternion));
    return _ray;
  }

  /** Every gun in a hand shows its own preview, in its own colour. */
  private updateAim(ctx: WorldContext): void {
    const presenting = ctx.renderer.xr.isPresenting;
    for (const [index, slot] of this.slots.entries()) {
      const active = presenting ? Boolean(slot.heldBy) : index === 0;
      if (!active) {
        slot.ring.visible = false;
        continue;
      }
      const ray = this.getAimRay(ctx, slot);
      const hit = this.castSurface(ray);
      if (!hit) {
        slot.ring.visible = false;
        continue;
      }
      surfaceUp(ray.direction, hit.normal, _placeUp);
      const valid = this.fits(hit.point, hit.normal, _placeUp, hit.object);
      slot.ring.visible = true;
      slot.ring.position.copy(hit.point).addScaledVector(hit.normal, 0.012 + index * 0.002);
      orientToSurface(slot.ring, hit.normal, _placeUp);
      slot.ring.material.opacity = valid ? 0.6 : 0.25;
    }
  }

  // --- portals ------------------------------------------------------------

  private isInFunnel(point: THREE.Vector3): boolean {
    for (const portal of [this.portalBlue, this.portalRed]) {
      if (!portal.placed || !portal.link?.placed) continue;
      if (Math.abs(portal.signedDistance(point)) > FUNNEL_DEPTH) continue;
      if (portal.isInOpening(point, 1.1)) return true;
    }
    return false;
  }

  /** Lets the player fall through a wall while standing in a portal opening. */
  private playerInFunnel(): boolean {
    this.locomotion!.getPosition(_probe);
    return this.isInFunnel(_probe);
  }

  private updatePropPhasing(): void {
    const physics = this.physics!;
    for (const entry of this.props) {
      const t = entry.body.translation();
      _probe.set(t.x, t.y, t.z);
      physics.setPhasing(entry, this.isInFunnel(_probe));
    }
  }

  private traverseProps(): void {
    const grabbed = new Set([...this.grabs.values()].map((grab) => grab.entry));
    for (const entry of this.props) {
      if (grabbed.has(entry)) continue;
      const t = entry.body.translation();
      _point.set(t.x, t.y, t.z);

      if (_point.y < -25) {
        this.respawn(entry);
        continue;
      }

      for (const portal of [this.portalBlue, this.portalRed]) {
        const transform = portal.getTraversalMatrix(_matrix);
        if (!transform) continue;
        const before = portal.signedDistance(entry.previousPosition);
        const after = portal.signedDistance(_point);
        if (before <= 0 || after > 0) continue;
        const t0 = before / (before - after);
        _cross.lerpVectors(entry.previousPosition, _point, t0);
        if (!portal.isInOpening(_cross, 1.05)) continue;

        _rotation.setFromRotationMatrix(_rotationMatrix.extractRotation(transform));
        _point.applyMatrix4(transform);
        entry.body.setTranslation({ x: _point.x, y: _point.y, z: _point.z }, true);

        const r = entry.body.rotation();
        _quaternion.set(r.x, r.y, r.z, r.w).premultiply(_rotation);
        entry.body.setRotation(
          { x: _quaternion.x, y: _quaternion.y, z: _quaternion.z, w: _quaternion.w },
          true,
        );

        const linear = entry.body.linvel();
        _direction.set(linear.x, linear.y, linear.z).applyQuaternion(_rotation);
        entry.body.setLinvel({ x: _direction.x, y: _direction.y, z: _direction.z }, true);

        const angular = entry.body.angvel();
        _direction.set(angular.x, angular.y, angular.z).applyQuaternion(_rotation);
        entry.body.setAngvel({ x: _direction.x, y: _direction.y, z: _direction.z }, true);
        break;
      }

      entry.previousPosition.copy(_point);
    }
  }

  private traversePlayer(ctx: WorldContext): void {
    ctx.rig.getHeadPosition(_head);

    if (this.hasPreviousHead) {
      for (const portal of [this.portalBlue, this.portalRed]) {
        const transform = portal.getTraversalMatrix(_matrix);
        if (!transform) continue;
        const before = portal.signedDistance(this.previousHead);
        const after = portal.signedDistance(_head);
        if (before <= 0 || after > 0) continue;
        const t = before / (before - after);
        _cross.lerpVectors(this.previousHead, _head, t);
        if (!portal.isInOpening(_cross)) continue;
        ctx.rig.applyWorldTransform(transform);
        ctx.rig.getHeadPosition(_head);
        break;
      }
    }

    this.previousHead.copy(_head);
    this.hasPreviousHead = true;
  }

  private respawn(entry: PhysicsBody): void {
    const spawn = this.spawns.get(entry);
    if (!spawn) return;
    spawn.decompose(_point, _quaternion, _probe);
    entry.body.setTranslation({ x: _point.x, y: _point.y, z: _point.z }, true);
    entry.body.setRotation(
      { x: _quaternion.x, y: _quaternion.y, z: _quaternion.z, w: _quaternion.w },
      true,
    );
    entry.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    entry.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    entry.previousPosition.copy(_point);
  }

  private resetWorld(ctx: WorldContext): void {
    this.portalBlue.reset();
    this.portalRed.reset();
    for (const entry of this.flights.keys()) this.physics?.setCarried(entry, false);
    this.flights.clear();
    this.clearSpawned();
    for (const entry of this.props) this.respawn(entry);
    ctx.notify('Labor zurückgesetzt');
  }

  // --- surface helpers ----------------------------------------------------

  private castSurface(ray: THREE.Ray, maxDistance = 60): typeof _hit | null {
    this.raycaster.set(ray.origin, ray.direction);
    this.raycaster.far = maxDistance;
    const hit = this.raycaster.intersectObjects(this.surfaces, false)[0];
    if (!hit || !hit.face) return null;

    _normalMatrix.getNormalMatrix(hit.object.matrixWorld);
    _hitNormal.copy(hit.face.normal).applyMatrix3(_normalMatrix).normalize();
    if (_hitNormal.dot(ray.direction) > 0) _hitNormal.negate();
    _hitPoint.copy(hit.point);
    _hit.object = hit.object;
    return _hit;
  }

  /** Does the whole ellipse sit on the same flat surface? */
  private fits(
    point: THREE.Vector3,
    normal: THREE.Vector3,
    up: THREE.Vector3,
    object: THREE.Object3D,
  ): boolean {
    _right.crossVectors(up, normal).normalize();
    _up.crossVectors(normal, _right).normalize();

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      _probe
        .copy(point)
        .addScaledVector(_right, Math.cos(angle) * PORTAL_HALF_WIDTH * 0.98)
        .addScaledVector(_up, Math.sin(angle) * PORTAL_HALF_HEIGHT * 0.98)
        .addScaledVector(normal, 0.25);
      _direction.copy(normal).negate();

      this.raycaster.set(_probe, _direction);
      this.raycaster.far = 0.5;
      const hit = this.raycaster.intersectObject(object, false)[0];
      if (!hit || Math.abs(hit.distance - 0.25) > 0.02) return false;
    }
    return true;
  }
}

/**
 * Reference "up" for a portal on this surface. On walls that is the world up,
 * on floors and ceilings the direction the gun points — so the opening lines up
 * with how you aimed at it.
 */
function surfaceUp(
  direction: THREE.Vector3,
  normal: THREE.Vector3,
  target: THREE.Vector3,
): THREE.Vector3 {
  if (Math.abs(normal.y) <= 0.9) return target.copy(UP);
  target.copy(direction);
  target.y = 0;
  if (target.lengthSq() < 1e-6) target.set(0, 0, -1);
  return target.normalize();
}

/** Aligns an object's +Z with a surface normal, using `up` as the roll reference. */
function orientToSurface(object: THREE.Object3D, normal: THREE.Vector3, up: THREE.Vector3): void {
  _right.crossVectors(up, normal).normalize();
  _up.crossVectors(normal, _right).normalize();
  _matrix.makeBasis(_right, _up, normal);
  object.quaternion.setFromRotationMatrix(_matrix);
}

/** Highlight for props that are within grabbing distance. */
function setEmissive(entry: PhysicsBody, on: boolean): void {
  const mesh = entry.object as THREE.Mesh;
  const material = mesh.material as THREE.MeshStandardMaterial | undefined;
  if (!material?.emissive) return;
  const store = entry.object.userData as { baseEmissive?: THREE.Color };
  if (on) {
    store.baseEmissive ??= material.emissive.clone();
    material.emissive.setHex(0x6fb6ff).multiplyScalar(0.55);
  } else if (store.baseEmissive) {
    material.emissive.copy(store.baseEmissive);
  }
}

/**
 * How deep a point sits inside a prop's grab box, or null when it is outside.
 * Smaller means "more inside", which makes picking the nearest one trivial.
 */
function reachDepth(entry: PhysicsBody, point: THREE.Vector3): number | null {
  const t = entry.body.translation();
  const r = entry.body.rotation();
  _local
    .set(point.x - t.x, point.y - t.y, point.z - t.z)
    .applyQuaternion(_quaternion.set(r.x, r.y, r.z, r.w).invert());

  const dx = Math.abs(_local.x) - entry.halfExtents.x;
  const dy = Math.abs(_local.y) - entry.halfExtents.y;
  const dz = Math.abs(_local.z) - entry.halfExtents.z;
  const depth = Math.max(dx, dy, dz);
  return depth <= GRAB_MARGIN ? depth : null;
}
