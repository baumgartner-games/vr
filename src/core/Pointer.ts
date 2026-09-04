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
  /**
   * Hands this target does not listen to. A panel that rides on a hand has to
   * say so: the ray comes out of the same hand that carries it, would rest on
   * its own panel all the time — and a resting pointer swallows the trigger of
   * whatever is holding it.
   */
  ignore?(hand: Handedness | null): boolean;
}

const _ray = new THREE.Ray();
const _tip = new THREE.Vector3();
const _local = new THREE.Vector3();
const _box = new THREE.Box3();
const _hitPoint = new THREE.Vector3();

const HANDS: readonly Handedness[] = ['left', 'right'];

/**
 * One laser: its line, its cursor, and whatever it currently rests on.
 *
 * Both hands have one, and the mouse in flat mode has one without a line —
 * three of these, each with its own hover, so the hands never take the ray
 * away from one another.
 */
class Beam {
  readonly line: THREE.Line;
  readonly cursor: THREE.Mesh;
  hovered: PointerTarget | null = null;

  constructor(readonly hand: Handedness | null) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    this.line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0x8fc8ff, transparent: true, opacity: 0.55 }),
    );
    this.line.name = `pointer-ray-${hand ?? 'screen'}`;
    this.line.visible = false;
    this.line.frustumCulled = false;

    this.cursor = new THREE.Mesh(
      new THREE.SphereGeometry(0.008, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }),
    );
    this.cursor.name = `pointer-cursor-${hand ?? 'screen'}`;
    this.cursor.visible = false;
    this.cursor.renderOrder = 999;
    this.cursor.frustumCulled = false;
  }

  hide(): void {
    this.line.visible = false;
    this.cursor.visible = false;
  }
}

/**
 * Interaction pointers: a laser out of *each* hand in VR, the mouse or a
 * finger in flat mode, plus direct poking with the index fingertip.
 *
 * Both hands point, always. Whatever one hand is carrying, the other one can
 * still work a panel — and a tool's own display is reachable while the tool
 * stays in the hand it belongs to.
 */
export class Pointer {
  /**
   * Off while the view is somewhere else entirely — the drone carries it out
   * of the body, and menus that hang on hands left behind are then neither
   * reachable nor wanted. Off means: no hover, no poke, no laser.
   */
  enabled = true;

  /**
   * Hands that are holding something with both fists instead of pointing — the
   * drone's display is carried that way. Such a hand has no laser at all: a ray
   * that rests on a menu swallows the trigger of whatever is holding it.
   */
  readonly busy = new Set<Handedness>();

  private readonly beams = new Map<Handedness | 'screen', Beam>([
    ['left', new Beam('left')],
    ['right', new Beam('right')],
    ['screen', new Beam(null)],
  ]);

  private targets: PointerTarget[] = [];
  private poking = new Set<THREE.Object3D>();
  private raycaster = new THREE.Raycaster();
  private screen = new THREE.Vector2(0, 0);
  private screenActive = false;
  private screenClick = false;

  constructor(
    private readonly rig: PlayerRig,
    private readonly canvas: HTMLCanvasElement,
  ) {
    this.bindScreenPointer();
  }

  /** True while any pointer rests on an interactive object. */
  get hovering(): boolean {
    for (const beam of this.beams.values()) if (beam.hovered) return true;
    return false;
  }

  /**
   * True while *this* hand's laser rests on something interactive — `null` asks
   * for the mouse. The trigger belongs to the menu only for the hand that is
   * actually aiming at it; the other hand keeps working.
   */
  hoveringWith(hand: Handedness | null): boolean {
    return this.beam(hand).hovered !== null;
  }

  add(target: PointerTarget): void {
    this.targets.push(target);
  }

  remove(object: THREE.Object3D): void {
    this.targets = this.targets.filter((t) => t.object !== object);
    for (const beam of this.beams.values()) {
      if (beam.hovered?.object === object) beam.hovered = null;
    }
    this.poking.delete(object);
  }

  clear(): void {
    this.targets = [];
    for (const beam of this.beams.values()) beam.hovered = null;
    this.poking.clear();
  }

  update(input: XRInput, presenting: boolean): void {
    if (!this.enabled) {
      for (const beam of this.beams.values()) this.blank(beam);
      this.poking.clear();
      return;
    }
    this.updatePoke(input);

    if (presenting) {
      this.blank(this.beam(null));
      for (const hand of HANDS) this.updateXrRay(input, hand);
    } else {
      for (const hand of HANDS) this.blank(this.beam(hand));
      this.updateScreenRay();
    }
  }

  // --- one ray per controller ---------------------------------------------

  private updateXrRay(input: XRInput, handedness: Handedness): void {
    const beam = this.beam(handedness);
    const controller = input.get(handedness);
    if (!controller?.tracked || this.busy.has(handedness)) {
      this.blank(beam);
      return;
    }

    if (beam.line.parent !== controller.targetRay) controller.targetRay.add(beam.line);

    controller.getRay(_ray);
    this.raycaster.set(_ray.origin, _ray.direction);
    this.raycaster.far = 12;
    const hit = this.castAll(handedness);

    beam.line.visible = true;
    beam.line.scale.z = hit ? hit.hit.distance : 1.6;
    this.setHover(beam, hit?.target ?? null, hit?.hit ?? null);

    // Deliberately a button press: hovering alone never triggers anything.
    if (hit && (controller.trigger.justPressed || controller.primary.justPressed)) {
      hit.target.onSelect?.(hit.hit);
    }
  }

  // --- ray from the 2D screen --------------------------------------------

  private updateScreenRay(): void {
    const beam = this.beam(null);
    if (!this.screenActive) {
      this.blank(beam);
      this.screenClick = false;
      return;
    }
    this.raycaster.setFromCamera(this.screen, this.rig.camera);
    this.raycaster.far = 12;
    const hit = this.castAll(null);
    this.setHover(beam, hit?.target ?? null, hit?.hit ?? null);
    if (hit && this.screenClick) hit.target.onSelect?.(hit.hit);
    this.screenClick = false;
  }

  private beam(hand: Handedness | null): Beam {
    return this.beams.get(hand ?? 'screen')!;
  }

  private blank(beam: Beam): void {
    this.setHover(beam, null, null);
    beam.hide();
  }

  private castAll(hand: Handedness | null): { target: PointerTarget; hit: PointerHit } | null {
    let best: { target: PointerTarget; hit: PointerHit } | null = null;
    for (const target of this.targets) {
      if (!target.object.visible) continue;
      if (target.ignore?.(hand)) continue;
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

  private setHover(beam: Beam, target: PointerTarget | null, hit: PointerHit | null): void {
    const previous = beam.hovered;
    beam.hovered = target;
    // Only a blur once no other laser is resting on it any more — otherwise the
    // hand that leaves would switch off the highlight the other one is holding.
    if (previous && previous !== target && !this.hoveredElsewhere(previous)) previous.onBlur?.();
    if (target && hit) {
      target.onHover?.(hit);
      beam.cursor.visible = true;
      if (!beam.cursor.parent) this.rig.parent?.add(beam.cursor);
      beam.cursor.position.copy(hit.point);
    } else {
      beam.cursor.visible = false;
    }
  }

  private hoveredElsewhere(target: PointerTarget): boolean {
    for (const beam of this.beams.values()) if (beam.hovered === target) return true;
    return false;
  }

  // --- direct touch -------------------------------------------------------

  private updatePoke(input: XRInput): void {
    const active = new Set<THREE.Object3D>();
    for (const controller of input.controllers) {
      if (!controller.tracked) continue;
      if (!controller.getFingertip(_tip)) continue;

      for (const target of this.targets) {
        if (target.pokeable === false || !target.object.visible) continue;
        if (target.ignore?.(controller.handedness)) continue;
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
