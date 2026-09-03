import * as THREE from 'three';
import type { World, WorldAction, WorldContext } from '../../core/types';
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

const ROOM = { half: 8, height: 4.6, thickness: 0.4 };
const SPAWN = new THREE.Vector3(0, 0, 5.5);
const COLOR_BLUE = 0x2f8fff;
const COLOR_RED = 0xff3b2f;
const UP = new THREE.Vector3(0, 1, 0);
const FUNNEL_DEPTH = 1.1;

const _direction = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _placeUp = new THREE.Vector3();
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
  hand: Handedness;
  holster: THREE.Object3D;
  held: boolean;
  /** Blocks a shot on the very frame the gun was picked up. */
  justGrabbed: boolean;
}

interface HandProbe {
  object: THREE.Object3D;
  entry: PhysicsBody;
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
  private readonly previousHead = new THREE.Vector3();

  private physics: PhysicsWorld | null = null;
  private locomotion: PhysicsLocomotion | null = null;
  private portalRenderer: PortalRenderer | null = null;
  private aimRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> | null = null;
  private hasPreviousHead = false;
  private time = 0;
  private canvas: HTMLCanvasElement | null = null;
  private flatFire: ((event: MouseEvent) => void) | null = null;
  private flatKeys: ((event: KeyboardEvent) => void) | null = null;
  private blockContextMenu: ((event: Event) => void) | null = null;

  async init(ctx: WorldContext): Promise<void> {
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

    this.aimRing = new THREE.Mesh(
      new THREE.RingGeometry(0.96, 1, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    this.aimRing.scale.set(PORTAL_HALF_WIDTH, PORTAL_HALF_HEIGHT, 1);
    this.aimRing.renderOrder = 5;
    this.aimRing.visible = false;
    this.root.add(this.aimRing);

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

  actions(): WorldAction[] {
    return [
      {
        id: 'reset',
        label: 'Labor zurücksetzen',
        sub: 'Portale, Würfel und Dominos',
        accent: COLOR_RED,
        run: (ctx) => this.resetWorld(ctx),
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
    ctx.hands.setGestureOverride('left', null);
    ctx.hands.setGestureOverride('right', null);

    this.portalRenderer?.dispose();
    this.portalRenderer = null;
    this.portalBlue.dispose();
    this.portalRed.dispose();
    this.probes.clear();
    this.props.length = 0;
    this.spawns.clear();
    this.surfaces.length = 0;

    disposeTree(this.root);
    ctx.scene.background = null;
    this.physics?.dispose();
    this.physics = null;
    this.locomotion = null;
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
    for (const [hand, portal, color] of definitions) {
      const gun = new PortalGun(portal.key, color);
      const holster = new THREE.Object3D();
      ctx.rig.add(holster);
      holster.add(gun);
      this.slots.push({ gun, portal, hand, holster, held: false, justGrabbed: false });
    }
  }

  private updateGuns(dt: number, ctx: WorldContext): void {
    const height = ctx.rig.getHeadHeight();
    const yaw = ctx.avatar.bodyYaw;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    ctx.rig.getHeadPosition(_head);
    ctx.rig.worldToLocal(_head);

    for (const slot of this.slots) {
      const side = slot.hand === 'left' ? -1 : 1;
      slot.holster.position.set(
        _head.x + cos * side * 0.26 + sin * 0.04,
        height * 0.5,
        _head.z - sin * side * 0.26 + cos * 0.04,
      );
      slot.holster.rotation.set(0, yaw, 0);

      const controller = ctx.input.get(slot.hand);
      const canReach = controller?.tracked ? this.handNearHolster(ctx, controller, slot) : false;
      slot.justGrabbed = false;

      // Controllers hold the gun while the grip is pressed. Tracked hands have
      // no grip button, so there a pinch at the belt toggles it.
      const grab = controller
        ? controller.isHand
          ? controller.trigger.justPressed && canReach
          : controller.squeeze.justPressed && canReach
        : false;
      const letGo = controller
        ? controller.isHand
          ? controller.trigger.justPressed && canReach
          : !controller.squeeze.pressed || !controller.tracked
        : true;

      if (!slot.held && grab && controller) {
        slot.held = true;
        slot.justGrabbed = true;
        const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
        anchor.add(slot.gun);
        slot.gun.position.set(0, -0.012, 0.03);
        slot.gun.rotation.set(0, 0, 0);
        slot.gun.holstered = false;
        controller.pulse(0.4, 25);
        ctx.hands.setGestureOverride(slot.hand, 'grip');
      } else if (slot.held && letGo) {
        slot.held = false;
        slot.holster.add(slot.gun);
        slot.gun.position.set(0, 0, 0);
        slot.gun.rotation.set(0, 0, 0);
        slot.gun.holstered = true;
        ctx.hands.setGestureOverride(slot.hand, null);
      }

      slot.gun.update(dt);
    }
  }

  private handNearHolster(ctx: WorldContext, controller: ControllerState, slot: GunSlot): boolean {
    const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
    anchor.getWorldPosition(_hand);
    ctx.rig.worldToLocal(_hand);
    return _hand.distanceTo(slot.holster.position) < 0.32;
  }

  /** Empty hands can pick up the cubes and dominoes. */
  private updateGrabs(dt: number, ctx: WorldContext): void {
    const rapier = this.physics!.rapier;

    for (const slot of this.slots) {
      const controller = ctx.input.get(slot.hand);
      const grab = this.grabs.get(slot.hand);

      if (!controller?.tracked) {
        if (grab) this.release(slot.hand, grab);
        continue;
      }

      const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
      anchor.updateWorldMatrix(true, false);

      if (grab) {
        if (!controller.squeeze.pressed) {
          this.release(slot.hand, grab);
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

      if (slot.held || !controller.squeeze.justPressed) continue;
      anchor.getWorldPosition(_hand);
      const entry = this.findProp(_hand, 0.42);
      if (!entry) continue;

      entry.body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
      const offset = new THREE.Matrix4()
        .copy(anchor.matrixWorld)
        .invert()
        .multiply(entry.object.matrixWorld);
      entry.object.getWorldPosition(_point);
      this.grabs.set(slot.hand, {
        entry,
        offset,
        lastPosition: _point.clone(),
        velocity: new THREE.Vector3(),
      });
      controller.pulse(0.5, 30);
    }
  }

  private release(hand: Handedness, grab: HandGrab): void {
    const rapier = this.physics!.rapier;
    grab.entry.body.setBodyType(rapier.RigidBodyType.Dynamic, true);
    const throwVelocity = grab.velocity.clampLength(0, 9);
    grab.entry.body.setLinvel(
      { x: throwVelocity.x, y: throwVelocity.y, z: throwVelocity.z },
      true,
    );
    this.grabs.delete(hand);
  }

  private findProp(position: THREE.Vector3, radius: number): PhysicsBody | null {
    let best: PhysicsBody | null = null;
    let bestDistance = radius;
    for (const entry of this.props) {
      if ([...this.grabs.values()].some((grab) => grab.entry === entry)) continue;
      const t = entry.body.translation();
      const distance = position.distanceTo(_probe.set(t.x, t.y, t.z));
      if (distance < bestDistance) {
        best = entry;
        bestDistance = distance;
      }
    }
    return best;
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
      const controller = ctx.input.get(slot.hand);
      if (!controller) continue;
      if (slot.held && !slot.justGrabbed && controller.trigger.justPressed) this.shoot(ctx, slot);
      if (controller.secondary.justPressed) this.resetWorld(ctx);
    }
  }

  private shoot(ctx: WorldContext, slot: GunSlot): void {
    const ray = this.getAimRay(ctx, slot);
    const hit = this.castSurface(ray);
    slot.gun.fire();
    ctx.input.get(slot.hand)?.pulse(0.35, 25);

    if (!hit) {
      ctx.notify('Keine Fläche getroffen');
      return;
    }
    this.surfaceUp(ctx, hit.normal, _placeUp);
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
    const controller = ctx.input.get(slot.hand);
    if (ctx.renderer.xr.isPresenting && slot.held && controller?.tracked) {
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

  private updateAim(ctx: WorldContext): void {
    if (!this.aimRing) return;
    const held = this.slots.find((entry) => entry.held);
    if (ctx.renderer.xr.isPresenting && !held) {
      this.aimRing.visible = false;
      return;
    }
    const ray = this.getAimRay(ctx, held ?? this.slots[1]!);
    const hit = this.castSurface(ray);
    if (!hit) {
      this.aimRing.visible = false;
      return;
    }
    this.aimRing.visible = true;
    this.aimRing.position.copy(hit.point).addScaledVector(hit.normal, 0.012);
    this.surfaceUp(ctx, hit.normal, _placeUp);
    orientToSurface(this.aimRing, hit.normal, _placeUp);
    const valid = this.fits(hit.point, hit.normal, _placeUp, hit.object);
    this.aimRing.material.color.setHex(valid ? 0xffffff : 0xff5a5a);
    this.aimRing.material.opacity = valid ? 0.5 : 0.3;
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

  /**
   * Reference "up" for a portal on this surface. On walls that is the world up,
   * on floors and ceilings the direction the player is looking — so a portal at
   * your feet is always aligned with your view.
   */
  private surfaceUp(
    ctx: WorldContext,
    normal: THREE.Vector3,
    target: THREE.Vector3,
  ): THREE.Vector3 {
    if (Math.abs(normal.y) <= 0.9) return target.copy(UP);
    ctx.rig.getHeadForward(target);
    target.y = 0;
    if (target.lengthSq() < 1e-6) target.set(0, 0, -1);
    return target.normalize();
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

/** Aligns an object's +Z with a surface normal, using `up` as the roll reference. */
function orientToSurface(object: THREE.Object3D, normal: THREE.Vector3, up: THREE.Vector3): void {
  _right.crossVectors(up, normal).normalize();
  _up.crossVectors(normal, _right).normalize();
  _matrix.makeBasis(_right, _up, normal);
  object.quaternion.setFromRotationMatrix(_matrix);
}
