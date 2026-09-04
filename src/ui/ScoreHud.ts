import * as THREE from 'three';
import { TextPlane } from './TextPlane';

/**
 * The layer only the player's own view draws.
 *
 * `LAYER_SELF_ONLY` (3) is the other way round: the player's own body, which
 * *only* the portal views draw. The HUD sticks to the camera and must therefore
 * appear in no second camera at all — otherwise it floats in the middle of the
 * room in the portal view, in the drone's display and inside the scope.
 */
export const LAYER_HUD = 4;

/** How long a row stands, and how far it drifts up in that time. */
const LIFE = 1.8;
const RISE = 0.05;
/** Distance from the eye, height above it, and the spacing in the stack. */
const DISTANCE = 1;
const TOP = 0.28;
const ROW = 0.058;
/** This many rows stand on top of each other; the oldest then falls off. */
const MAX_ROWS = 5;

interface Row {
  plane: TextPlane;
  life: number;
}

/**
 * Hit scores in the upper field of view — the way Battlefield or Borderlands
 * do it, only not over the target.
 *
 * Over the target would be the honest place, but at a hundred metres a number
 * there is either unreadably small or big enough to cover the disc — and
 * whoever rides the recoil up never sees it at all. So it hangs off the head
 * instead: one row per hit, new ones at the bottom, older ones sliding up and
 * fading out.
 *
 * The whole thing is a **child of the camera**, so that it stands perfectly
 * still in a headset — a HUD that trails the head by one frame is the first
 * thing in VR that makes people ill. To keep it here and nowhere else,
 * everything sits on `LAYER_HUD`; the portal, drone and scope cameras do not
 * draw that layer.
 *
 * The rows are **reused**: automatic fire lands twenty hits a second, and a
 * fresh canvas and texture for each one is exactly the sort of litter that
 * makes a headset stutter.
 */
export class ScoreHud extends THREE.Group {
  private readonly rows: Row[] = [];
  private readonly free: TextPlane[] = [];

  constructor() {
    super();
    this.name = 'score-hud';
    this.position.set(0, TOP, -DISTANCE);
    this.layers.set(LAYER_HUD);
    for (let i = 0; i < MAX_ROWS; i++) this.free.push(this.buildRow());
  }

  /** Hangs itself off the camera and lets that camera see its layer. */
  mount(camera: THREE.Camera): void {
    if (this.parent !== camera) camera.add(this);
    camera.layers.enable(LAYER_HUD);
  }

  /** Off again, layer included — the next world brings its own HUD. */
  unmount(camera: THREE.Camera): void {
    this.removeFromParent();
    camera.layers.disable(LAYER_HUD);
    this.dispose();
  }

  /** A new row at the bottom of the stack. */
  push(title: string, sub: string, accent: number): void {
    const plane = this.free.pop() ?? this.rows.pop()!.plane;
    plane.setText(title, sub, accent);
    plane.material.opacity = 1;
    plane.visible = true;
    this.rows.unshift({ plane, life: LIFE });
    this.layout();
  }

  /** Every row ages, drifts up and fades out. */
  update(dt: number): void {
    for (let i = this.rows.length - 1; i >= 0; i--) {
      const row = this.rows[i]!;
      row.life -= dt;
      if (row.life <= 0) {
        row.plane.visible = false;
        this.free.push(row.plane);
        this.rows.splice(i, 1);
        continue;
      }
      // It only starts fading in the last third — a number that goes pale at
      // once cannot be read at all.
      row.plane.material.opacity = Math.min(1, (row.life / LIFE) * 3);
      row.plane.position.y += RISE * dt;
    }
  }

  dispose(): void {
    for (const row of this.rows) row.plane.dispose();
    for (const plane of this.free) plane.dispose();
    this.rows.length = 0;
    this.free.length = 0;
    this.clear();
  }

  /** New row at the bottom, older ones above it. */
  private layout(): void {
    for (let i = 0; i < this.rows.length; i++) this.rows[i]!.plane.position.set(0, i * ROW, 0);
  }

  private buildRow(): TextPlane {
    const plane = new TextPlane({
      width: 0.2,
      height: 0.05,
      title: '',
      body: '',
      accent: 0x5ee0a0,
      background: 'rgba(9, 14, 26, 0.6)',
      align: 'center',
    });
    // Nothing in the room covers a HUD — it lies on the glass, not behind it.
    plane.material.depthTest = false;
    plane.material.depthWrite = false;
    plane.renderOrder = 60;
    plane.frustumCulled = false;
    plane.visible = false;
    plane.layers.set(LAYER_HUD);
    this.add(plane);
    return plane;
  }
}
