import * as THREE from 'three';
import type { Handedness, XRInput } from './XRInput';
import type { PlayerRig } from './PlayerRig';

export interface PointerHit {
  point: THREE.Vector3;
  uv: THREE.Vector2 | null;
  distance: number;
  /** True when the hit came from a fingertip/controller poke instead of a ray. */
  poke: boolean;
  /** Which hand triggered this, when the pointer came from a controller. */
  hand: Handedness | null;
}

export interface PointerTarget {
  object: THREE.Object3D;
  onHover?(hit: PointerHit): void;
  onBlur?(): void;
  onSelect?(hit: PointerHit): void;
  /** Allow direct touch with the index fingertip. Defaults to true. */
  pokeable?: boolean;
}

const _ray = new THREE.Ray();
const _tip = new THREE.Vector3();
const _local = new THREE.Vector3();
const _box = new THREE.Box3();
const _hitPoint = new THREE.Vector3();

/**
 * Single interaction pointer: a laser from the right hand in VR, the mouse or a
 * finger in flat mode, plus direct poking with the index fingertip.
 */
export class Pointer {
  /** Laser + cursor visuals, parented to the pointing controller. */
  readonly rayLine: THREE.Line;
  readonly cursor: THREE.Mesh;

  private targets: PointerTarget[] = [];
  private hovered: PointerTarget | null = null;
  private poking = new Set<THREE.Object3D>();
  private raycaster = new THREE.Raycaster();
  private screen = new THREE.Vector2(0, 0);
  private screenActive = false;
  private screenClick = false;

  constructor(
    private readonly rig: PlayerRig,
    private readonly canvas: HTMLCanvasElement,
  ) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    this.rayLine = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0x8fc8ff, transparent: true, opacity: 0.55 }),
    );
    this.rayLine.name = 'pointer-ray';
    this.rayLine.visible = false;
    this.rayLine.frustumCulled = false;

    this.cursor = new THREE.Mesh(
      new THREE.SphereGeometry(0.008, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }),
    );
    this.cursor.name = 'pointer-cursor';
    this.cursor.visible = false;
    this.cursor.renderOrder = 999;
    this.cursor.frustumCulled = false;

    this.bindScreenPointer();
  }

  /** True while the pointer rests on an interactive object. */
  get hovering(): boolean {
    return this.hovered !== null;
  }

  add(target: PointerTarget): void {
    this.targets.push(target);
  }

  remove(object: THREE.Object3D): void {
    this.targets = this.targets.filter((t) => t.object !== object);
    if (this.hovered?.object === object) this.hovered = null;
    this.poking.delete(object);
  }

  clear(): void {
    this.targets = [];
    this.hovered = null;
    this.poking.clear();
  }

  update(input: XRInput, presenting: boolean): void {
    this.updatePoke(input);

    if (presenting) this.updateXrRay(input);
    else this.updateScreenRay();
  }

  // --- ray from the right controller -------------------------------------

  private updateXrRay(input: XRInput): void {
    const hand = input.get('right') ?? input.get('left');
    if (!hand || !hand.tracked) {
      this.setHover(null, null);
      this.rayLine.visible = false;
      this.cursor.visible = false;
      return;
    }

    if (this.rayLine.parent !== hand.targetRay) hand.targetRay.add(this.rayLine);

    hand.getRay(_ray);
    this.raycaster.set(_ray.origin, _ray.direction);
    this.raycaster.far = 12;
    const hit = this.castAll(hand.handedness);

    this.rayLine.visible = true;
    this.rayLine.scale.z = hit ? hit.hit.distance : 1.6;
    this.setHover(hit?.target ?? null, hit?.hit ?? null);

    // Deliberately a button press: hovering alone never triggers anything.
    if (hit && (hand.trigger.justPressed || hand.primary.justPressed)) {
      hit.target.onSelect?.(hit.hit);
    }
  }

  // --- ray from the 2D screen --------------------------------------------

  private updateScreenRay(): void {
    if (this.rayLine.parent) this.rayLine.parent.remove(this.rayLine);
    this.rayLine.visible = false;
    if (!this.screenActive) {
      this.setHover(null, null);
      this.screenClick = false;
      return;
    }
    this.raycaster.setFromCamera(this.screen, this.rig.camera);
    this.raycaster.far = 12;
    const hit = this.castAll(null);
    this.setHover(hit?.target ?? null, hit?.hit ?? null);
    if (hit && this.screenClick) hit.target.onSelect?.(hit.hit);
    this.screenClick = false;
  }

  private castAll(hand: Handedness | null): { target: PointerTarget; hit: PointerHit } | null {
    let best: { target: PointerTarget; hit: PointerHit } | null = null;
    for (const target of this.targets) {
      if (!target.object.visible) continue;
      const intersections = this.raycaster.intersectObject(target.object, true);
      const first = intersections[0];
      if (!first) continue;
      if (best && first.distance >= best.hit.distance) continue;
      best = {
        target,
        hit: {
          point: first.point.clone(),
          uv: first.uv ? first.uv.clone() : null,
          distance: first.distance,
          poke: false,
          hand,
        },
      };
    }
    return best;
  }

  private setHover(target: PointerTarget | null, hit: PointerHit | null): void {
    if (this.hovered && this.hovered !== target) this.hovered.onBlur?.();
    this.hovered = target;
    if (target && hit) {
      target.onHover?.(hit);
      this.cursor.visible = true;
      if (!this.cursor.parent) this.rig.parent?.add(this.cursor);
      this.cursor.position.copy(hit.point);
    } else {
      this.cursor.visible = false;
    }
  }

  // --- direct touch -------------------------------------------------------

  private updatePoke(input: XRInput): void {
    const active = new Set<THREE.Object3D>();
    for (const controller of input.controllers) {
      if (!controller.tracked) continue;
      if (!controller.getFingertip(_tip)) continue;

      for (const target of this.targets) {
        if (target.pokeable === false || !target.object.visible) continue;
        const hit = pokeTest(target.object, _tip, controller.handedness);
        if (!hit) continue;
        active.add(target.object);
        if (!this.poking.has(target.object)) target.onSelect?.(hit);
      }
    }
    this.poking = active;
  }

  // --- mouse / touch ------------------------------------------------------

  private bindScreenPointer(): void {
    const setFrom = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.screen.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      this.screenActive = true;
    };
    this.canvas.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse') setFrom(event);
    });
    this.canvas.addEventListener('pointerdown', (event) => {
      setFrom(event);
      this.screenClick = true;
    });
    this.canvas.addEventListener('pointerleave', () => {
      this.screenActive = false;
    });
    // With pointer lock the cursor sits in the centre of the screen.
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === this.canvas) {
        this.screen.set(0, 0);
        this.screenActive = true;
      }
    });
  }
}

/** Poke test against a flat object: inside its bounds and within 3 cm depth. */
function pokeTest(
  object: THREE.Object3D,
  tipWorld: THREE.Vector3,
  hand: Handedness | null,
): PointerHit | null {
  const mesh = object as THREE.Mesh;
  const geometry = mesh.geometry;
  if (!geometry) return null;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = _box.copy(geometry.boundingBox!);

  _local.copy(tipWorld);
  object.worldToLocal(_local);
  if (_local.x < box.min.x || _local.x > box.max.x) return null;
  if (_local.y < box.min.y || _local.y > box.max.y) return null;
  const depth = _local.z;
  if (depth > 0.012 || depth < -0.035) return null;

  const size = box.getSize(_hitPoint);
  const uv = new THREE.Vector2(
    size.x > 0 ? (_local.x - box.min.x) / size.x : 0.5,
    size.y > 0 ? (_local.y - box.min.y) / size.y : 0.5,
  );
  return { point: tipWorld.clone(), uv, distance: 0, poke: true, hand };
}
