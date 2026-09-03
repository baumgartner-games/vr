import * as THREE from 'three';
import type { World, WorldContext } from '../../core/types';
import { Portal, PORTAL_HALF_HEIGHT, PORTAL_HALF_WIDTH } from './Portal';
import { PortalRenderer } from './PortalRenderer';
import { PortalGun } from './PortalGun';
import { TextPlane } from '../../ui/TextPlane';
import { createLighting, disposeTree } from '../shared/environment';

const ROOM = { half: 7, height: 4.4 };
const BOUNDS = new THREE.Box3(
  new THREE.Vector3(-ROOM.half + 0.45, 0, -ROOM.half + 0.45),
  new THREE.Vector3(ROOM.half - 0.45, 0, ROOM.half - 0.45),
);
const SPAWN = new THREE.Vector3(0, 0, 4.4);
const COLOR_A = 0x2f8fff;
const COLOR_B = 0xff8a1f;
const UP = new THREE.Vector3(0, 1, 0);

const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _head = new THREE.Vector3();
const _cross = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _normalMatrix = new THREE.Matrix3();
const _ray = new THREE.Ray();
const _quaternion = new THREE.Quaternion();
const _hitPoint = new THREE.Vector3();
const _hitNormal = new THREE.Vector3();
const _hit = { point: _hitPoint, normal: _hitNormal, object: null as unknown as THREE.Object3D };

/**
 * Experimental Portal clone: shoot two linked portals onto the white panels and
 * walk through them. Right hand — trigger = blue, grip = orange.
 */
export class PortalWorld implements World {
  private readonly root = new THREE.Group();
  private readonly portalA = new Portal('a', COLOR_A);
  private readonly portalB = new Portal('b', COLOR_B);
  private readonly gun = new PortalGun();
  private readonly raycaster = new THREE.Raycaster();
  private readonly surfaces: THREE.Object3D[] = [];
  private readonly previousHead = new THREE.Vector3();

  private portalRenderer: PortalRenderer | null = null;
  private aimRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> | null = null;
  private hasPreviousHead = false;
  private time = 0;
  private flatFire: ((event: MouseEvent) => void) | null = null;
  private flatReset: ((event: KeyboardEvent) => void) | null = null;
  private blockContextMenu: ((event: Event) => void) | null = null;
  private canvas: HTMLCanvasElement | null = null;

  init(ctx: WorldContext): void {
    this.root.name = 'portal-world';
    ctx.scene.add(this.root);
    ctx.scene.background = new THREE.Color(0x090c14);
    ctx.scene.fog = null;

    this.root.add(createLighting(0.9));
    for (const [x, z] of [
      [-3.5, -3.5],
      [3.5, -3.5],
      [-3.5, 3.5],
      [3.5, 3.5],
    ] as const) {
      const lamp = new THREE.PointLight(0xdce8ff, 16, 24, 2);
      lamp.position.set(x, ROOM.height - 0.6, z);
      this.root.add(lamp);
    }
    this.buildChamber();

    this.portalA.link = this.portalB;
    this.portalB.link = this.portalA;
    this.root.add(this.portalA, this.portalB);

    this.aimRing = new THREE.Mesh(
      new THREE.RingGeometry(0.97, 1, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.55,
        toneMapped: false,
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    this.aimRing.scale.set(PORTAL_HALF_WIDTH, PORTAL_HALF_HEIGHT, 1);
    this.aimRing.renderOrder = 5;
    this.aimRing.visible = false;
    this.root.add(this.aimRing);

    this.portalRenderer = new PortalRenderer(ctx.renderer);

    ctx.rig.placeAt(SPAWN, 0);
    ctx.rig.setMoveFilter((from, to) => this.filterMove(from, to));
    this.hasPreviousHead = false;

    this.canvas = ctx.renderer.domElement;
    this.flatFire = (event: MouseEvent) => {
      if (ctx.renderer.xr.isPresenting || ctx.pointer.hovering) return;
      if (event.button === 0) this.shoot(ctx, this.portalA);
      else if (event.button === 2) this.shoot(ctx, this.portalB);
    };
    this.blockContextMenu = (event: Event) => event.preventDefault();
    this.flatReset = (event: KeyboardEvent) => {
      if (event.code === 'KeyR') this.resetPortals(ctx);
    };
    this.canvas.addEventListener('mousedown', this.flatFire);
    this.canvas.addEventListener('contextmenu', this.blockContextMenu);
    window.addEventListener('keydown', this.flatReset);

    ctx.notify('Trigger = blaues Portal, Grip = oranges Portal, A/R = zurücksetzen');
  }

  update(dt: number, ctx: WorldContext): void {
    this.time += dt;
    this.portalA.setTime(this.time);
    this.portalB.setTime(this.time);
    this.gun.update(dt);

    this.updateGunAttachment(ctx);
    this.updateAim(ctx);
    this.handleFiring(ctx);
    this.handleTraversal(ctx);
  }

  render(ctx: WorldContext): boolean {
    this.portalRenderer?.render(ctx.scene, ctx.camera, [this.portalA, this.portalB]);
    ctx.renderer.render(ctx.scene, ctx.camera);
    return true;
  }

  dispose(ctx: WorldContext): void {
    if (this.canvas && this.flatFire) this.canvas.removeEventListener('mousedown', this.flatFire);
    if (this.canvas && this.blockContextMenu) {
      this.canvas.removeEventListener('contextmenu', this.blockContextMenu);
    }
    if (this.flatReset) window.removeEventListener('keydown', this.flatReset);
    this.flatReset = null;
    this.canvas = null;
    this.flatFire = null;
    this.blockContextMenu = null;

    this.portalRenderer?.dispose();
    this.portalRenderer = null;
    this.portalA.dispose();
    this.portalB.dispose();
    this.gun.dispose();
    this.surfaces.length = 0;
    disposeTree(this.root);
    ctx.scene.background = null;
  }

  // --- setup --------------------------------------------------------------

  private buildChamber(): void {
    const chamber = new THREE.Group();
    chamber.name = 'chamber';
    this.root.add(chamber);

    const panel = new THREE.MeshStandardMaterial({ color: 0xe7ecf5, roughness: 0.72, metalness: 0.04 });
    const shielded = new THREE.MeshStandardMaterial({ color: 0x55648a, roughness: 0.45, metalness: 0.5 });
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x39415a, roughness: 0.9 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.half * 2, ROOM.half * 2), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    chamber.add(floor);

    const grid = new THREE.GridHelper(ROOM.half * 2, 14, 0x6f9ad6, 0x4a5876);
    grid.position.y = 0.005;
    chamber.add(grid);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM.half * 2, ROOM.half * 2),
      new THREE.MeshStandardMaterial({ color: 0x2a3247, roughness: 0.95 }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = ROOM.height;
    chamber.add(ceiling);

    const walls: Array<[THREE.Vector3, number, boolean]> = [
      [new THREE.Vector3(0, ROOM.height / 2, -ROOM.half), 0, true],
      [new THREE.Vector3(ROOM.half, ROOM.height / 2, 0), -Math.PI / 2, true],
      [new THREE.Vector3(-ROOM.half, ROOM.height / 2, 0), Math.PI / 2, true],
      [new THREE.Vector3(0, ROOM.height / 2, ROOM.half), Math.PI, false],
    ];

    for (const [position, rotation, portalable] of walls) {
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM.half * 2, ROOM.height),
        portalable ? panel : shielded,
      );
      wall.position.copy(position);
      wall.rotation.y = rotation;
      wall.name = portalable ? 'surface:panel' : 'surface:shielded';
      chamber.add(wall);
      if (portalable) this.surfaces.push(wall);
    }

    // Two free-standing panels give the player something to aim across.
    for (const [x, z, angle] of [
      [-2.6, -1.4, Math.PI / 5],
      [2.6, -1.4, -Math.PI / 5],
    ] as const) {
      const boardMaterial = panel.clone();
      boardMaterial.side = THREE.DoubleSide;
      const board = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3), boardMaterial);
      board.position.set(x, 1.5, z);
      board.rotation.y = angle;
      board.name = 'surface:panel';
      chamber.add(board);
      this.surfaces.push(board);

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 0.12, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x2b3550, roughness: 0.5 }),
      );
      frame.position.set(x, 0.06, z);
      frame.rotation.y = angle;
      chamber.add(frame);
    }

    // Light strips near the ceiling.
    for (const side of [-1, 1]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM.half * 2 - 0.6, 0.06, 0.06),
        new THREE.MeshBasicMaterial({ color: 0x6fa8ff, toneMapped: false }),
      );
      strip.position.set(0, ROOM.height - 0.35, side * (ROOM.half - 0.12));
      chamber.add(strip);
    }

    const sign = new TextPlane({
      width: 2.6,
      height: 0.8,
      title: 'Portal Labor',
      body: 'Weiße Flächen nehmen Portale an, die dunkle Rückwand nicht. Trigger = blau, Grip = orange.',
      accent: COLOR_B,
    });
    sign.position.set(0, 2.6, ROOM.half - 0.05);
    sign.rotation.y = Math.PI;
    chamber.add(sign);
  }

  // --- interaction --------------------------------------------------------

  private updateGunAttachment(ctx: WorldContext): void {
    const right = ctx.input.get('right');
    if (right?.tracked) {
      const anchor = right.isHand || !right.grip.visible ? right.targetRay : right.grip;
      if (this.gun.parent !== anchor) anchor.add(this.gun);
      this.gun.position.set(0, right.isHand ? -0.04 : 0, right.isHand ? -0.02 : 0.02);
      this.gun.rotation.set(0, 0, 0);
      return;
    }
    if (this.gun.parent !== ctx.camera) ctx.camera.add(this.gun);
    this.gun.position.set(0.24, -0.22, -0.55);
    this.gun.rotation.set(0, -0.1, 0);
    this.gun.scale.setScalar(0.85);
  }

  /** Ray the gun is currently pointing along, in world space. */
  private getAimRay(ctx: WorldContext): THREE.Ray {
    const right = ctx.input.get('right');
    if (ctx.renderer.xr.isPresenting && right?.tracked) return right.getRay(_ray);
    ctx.camera.updateWorldMatrix(true, false);
    _ray.origin.setFromMatrixPosition(ctx.camera.matrixWorld);
    _ray.direction.set(0, 0, -1).applyQuaternion(ctx.camera.getWorldQuaternion(_quaternion));
    return _ray;
  }

  private updateAim(ctx: WorldContext): void {
    if (!this.aimRing) return;
    const ray = this.getAimRay(ctx);
    const hit = this.castSurface(ray);
    if (!hit) {
      this.aimRing.visible = false;
      return;
    }
    this.aimRing.visible = true;
    this.aimRing.position.copy(hit.point).addScaledVector(hit.normal, 0.01);
    orientToSurface(this.aimRing, hit.normal);
    const valid = this.fits(hit.point, hit.normal, hit.object);
    this.aimRing.material.color.setHex(valid ? 0xffffff : 0xff5a5a);
    this.aimRing.material.opacity = valid ? 0.55 : 0.35;
  }

  private handleFiring(ctx: WorldContext): void {
    const right = ctx.input.get('right');
    if (!right || !ctx.renderer.xr.isPresenting) return;
    // The same trigger drives the menu, so UI interaction wins.
    if (ctx.pointer.hovering) return;
    if (right.trigger.justPressed) this.shoot(ctx, this.portalA);
    if (right.squeeze.justPressed) this.shoot(ctx, this.portalB);
    if (right.primary.justPressed) this.resetPortals(ctx);
  }

  private resetPortals(ctx: WorldContext): void {
    this.portalA.reset();
    this.portalB.reset();
    ctx.notify('Portale zurückgesetzt');
  }

  private shoot(ctx: WorldContext, portal: Portal): void {
    const ray = this.getAimRay(ctx);
    const hit = this.castSurface(ray);
    const color = portal === this.portalA ? COLOR_A : COLOR_B;
    this.gun.fire(new THREE.Color(color));
    ctx.input.get('right')?.pulse(0.35, 25);

    if (!hit) {
      ctx.notify('Keine Fläche getroffen');
      return;
    }
    if (!this.fits(hit.point, hit.normal, hit.object)) {
      ctx.notify('Hier passt kein Portal hin');
      return;
    }

    const other = portal === this.portalA ? this.portalB : this.portalA;
    if (other.placed && other.getWorldNormal(_probe).dot(hit.normal) > 0.98) {
      other.getWorldPosition(_probe);
      if (_probe.distanceTo(hit.point) < PORTAL_HALF_WIDTH * 2.05) {
        ctx.notify('Portale überlappen sich');
        return;
      }
    }

    _up.copy(Math.abs(hit.normal.y) > 0.9 ? _direction.set(0, 0, 1) : UP);
    portal.place(hit.point, hit.normal, _up);
    ctx.notify(portal === this.portalA ? 'Blaues Portal gesetzt' : 'Oranges Portal gesetzt');
  }

  private handleTraversal(ctx: WorldContext): void {
    ctx.rig.getHeadPosition(_head);

    if (this.hasPreviousHead) {
      for (const portal of [this.portalA, this.portalB]) {
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

  private filterMove(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 {
    void from;
    for (const portal of [this.portalA, this.portalB]) {
      if (!portal.placed || !portal.link?.placed) continue;
      if (Math.abs(portal.signedDistance(to)) < 1 && portal.isInOpening(to, 1.05)) return to;
    }
    to.x = THREE.MathUtils.clamp(to.x, BOUNDS.min.x, BOUNDS.max.x);
    to.z = THREE.MathUtils.clamp(to.z, BOUNDS.min.z, BOUNDS.max.z);
    return to;
  }

  // --- surface helpers ----------------------------------------------------

  private castSurface(ray: THREE.Ray, maxDistance = 40): typeof _hit | null {
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
  private fits(point: THREE.Vector3, normal: THREE.Vector3, object: THREE.Object3D): boolean {
    _right.crossVectors(Math.abs(normal.y) > 0.9 ? _direction.set(0, 0, 1) : UP, normal).normalize();
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

/** Aligns an object's +Z with a surface normal, keeping the horizon level. */
function orientToSurface(object: THREE.Object3D, normal: THREE.Vector3): void {
  const up = Math.abs(normal.y) > 0.9 ? _origin.set(0, 0, 1) : UP;
  _right.crossVectors(up, normal).normalize();
  _up.crossVectors(normal, _right).normalize();
  _matrix.makeBasis(_right, _up, normal);
  object.quaternion.setFromRotationMatrix(_matrix);
}
