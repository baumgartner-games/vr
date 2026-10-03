import * as THREE from 'three';
import type { GridPlan } from '../grid/gridPlan';
import { DustTrail } from '../shared/dustTrail';
import { PLATE_TOP, PlateFloor } from '../shared/plateFloor';
import { plateAnchor, plateCapacity, plateSpots, type PlateSpot } from '../shared/plateField';
import { TILE } from '../nav/navTile';
import type { WorldContext } from '../../core/types';
import { PLATE_PROTOTYPE } from './floorPlate';
import { SANDBOX_FIELD, SANDBOX_SPAWN, sandboxPlan } from './sandboxPlan';
import { ZoneWorld } from './ZoneWorld';

/**
 * **Die Sandbox** — leer, bebaubar, zum Ausprobieren (`sandboxPlan.ts`).
 *
 * Was hier gebaut wird, bleibt im Browser (`editable()`, `grid/worldStore.ts`);
 * „Original wiederherstellen" im Baumenü macht sie wieder leer. Ein Stand,
 * der noch aus der Zeit der neun Zonen gespeichert ist, kommt beim ersten
 * Öffnen so zurück, wie er war — derselbe Knopf räumt ihn weg.
 */
export class SandboxWorld extends ZoneWorld {
  /** **Der Staub hinter der Figur** (`shared/dustTrail.ts`) — von oben sieht man, dass sie läuft. */
  private dust: DustTrail | null = null;
  /**
   * **Der Plattenboden draußen** (`shared/plateFloor.ts`) — die Schürze, die
   * mit der Figur wandert (`followPlates`). Auf der Fläche selbst legt die
   * Gitterwelt ihre Platten, eine je Kachel.
   */
  private plates: PlateFloor | null = null;
  private platesAround: PlateSpot | null = null;

  /** `sandbox` — bis September 2026 `test` (`worlds/index.WORLD_ALIASES`). */
  protected override worldId(): string {
    return 'sandbox';
  }

  protected override editorTitle(): string {
    return 'Sandbox';
  }

  protected override originalName(): string {
    return 'die leere Fläche';
  }

  /** **Hier wird gebaut.** */
  protected override editable(): boolean {
    return true;
  }

  /** Der Plan ändert sich mit jedem Umbau — die NPCs tasten ab, was steht. */
  protected override navFromPlan(): boolean {
    return false;
  }

  protected override layout(): GridPlan {
    return sandboxPlan();
  }

  protected override spawnTile(): { x: number; z: number } {
    return SANDBOX_SPAWN;
  }

  protected override spawnYaw(): number {
    return 0;
  }

  protected override lightIntensity(): number {
    return 1.15;
  }

  protected override welcome(): string {
    return 'Sandbox · leer · im Menü unter Bauen und im Möbelkatalog aufbauen';
  }

  protected override buildProps(): void {
    super.buildProps();
    if (!this.context) return;
    this.dust ??= new DustTrail(this.root);
    // Leer angelegt und so groß, wie sie je wird (`plateCapacity`); wo sie
    // liegt, entscheidet erst das erste Bild (`followPlates`).
    this.plates ??= new PlateFloor(this.root, PLATE_PROTOTYPE, [], {
      capacity: plateCapacity(),
    });
    this.platesAround = null;
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    this.trailDust(dt, ctx);
    this.followPlates(ctx);
  }

  /**
   * **Die Schürze zieht der Figur nach** — als Quadrat um ihre Kachel, und
   * erst nach ein paar Kacheln (`plateField.plateAnchor`). Ausgelassen wird
   * die Fläche: Dort liegen ihre eigenen Platten.
   */
  private followPlates(ctx: WorldContext): void {
    if (!this.plates) return;
    const at = plateAnchor(this.platesAround, ctx.rig.position.x, ctx.rig.position.z);
    if (!at) return;
    this.platesAround = at;
    const f = SANDBOX_FIELD;
    const field = { x: f.x * TILE, z: f.z * TILE, w: f.w * TILE, d: f.d * TILE };
    this.plates.reseat(
      plateSpots(field, at).map((spot) => ({ x: spot.x, y: PLATE_TOP, z: spot.z })),
    );
  }

  /** Gestaubt wird nur zu Fuß (`wishing`), nicht im Sitzen. */
  private trailDust(dt: number, ctx: WorldContext): void {
    const dust = this.dust;
    if (!dust) return;
    const rig = ctx.rig;
    _feet.set(rig.position.x, rig.getFloorY(), rig.position.z);
    dust.update(dt, _feet, rig.wishing && rig.seated <= 0.01);
  }

  override dispose(ctx: WorldContext): void {
    this.dust?.dispose();
    this.dust = null;
    // **Vor `super.dispose`**: `disposeTree` kennt die Instanzpuffer eines
    // Bündels nicht (`shared/plateFloor.PlateFloor.dispose`).
    this.plates?.dispose();
    this.plates = null;
    this.platesAround = null;
    super.dispose(ctx);
  }
}

/** Einer für alle: Wer je Bild einen Vektor baut, baut je Bild einen Vektor. */
const _feet = new THREE.Vector3();
