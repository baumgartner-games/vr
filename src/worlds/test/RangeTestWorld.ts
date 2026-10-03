import type * as THREE from 'three';
import type { GridPlan } from '../grid/gridPlan';
import type { Handedness } from '../../core/XRInput';
import { ZoneWorld } from './ZoneWorld';
import { RANGE_WORLD, zonePlan } from './zoneWorlds';
import { RangeZone } from './zones/range';
import type { TestZone } from './zones/zone';

/**
 * **Test Schießstand** — drei Bahnen, Scheiben auf 5, 10 und 20 m, eine
 * Stahlplatte, die Tafel mit den Punkten (`zones/range.ts`). Bis Oktober 2026
 * eine Zone der Sandbox.
 */
export class RangeTestWorld extends ZoneWorld {
  private readonly range = new RangeZone();
  private readonly lively: readonly TestZone[] = [this.range];

  protected override zones(): readonly TestZone[] {
    return this.lively;
  }

  protected override worldId(): string {
    return 'test-range';
  }

  protected override editorTitle(): string {
    return 'Test Schießstand';
  }

  protected override layout(): GridPlan {
    return zonePlan(RANGE_WORLD);
  }

  protected override spawnTile(): { x: number; z: number } {
    return RANGE_WORLD.spawn;
  }

  /** **Nach Osten**, die Bahnen hinunter. */
  protected override spawnYaw(): number {
    return -Math.PI / 2;
  }

  protected override welcome(): string {
    return 'Test Schießstand · Pistole am Gürtel · B stellt die Scheiben zurück';
  }

  /** Die Pistole — mehr braucht ein Schießstand nicht. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [['pistol', 'right']];
  }

  /** **Eine Kugel zählt zuerst auf dem Stand** und danach wie überall. */
  protected override bulletTravelled(
    from: THREE.Vector3,
    to: THREE.Vector3,
    damage?: number,
  ): boolean {
    if (this.range.bulletTravelled(from, to)) return true;
    return super.bulletTravelled(from, to, damage);
  }
}
