import type { GridPlan } from '../grid/gridPlan';
import { ZoneWorld } from './ZoneWorld';
import { CLIMB_WORLD, zonePlan } from './zoneWorlds';
import { ClimbZone } from './zones/climb';
import type { TestZone } from './zones/zone';

/**
 * **Test Kletterwand** — acht Meter Wand mit Griffen aller Arten, Ausdauer,
 * das Sprungkissen und die Rampe davor (`zones/climb.ts`). Bis Oktober 2026
 * eine Zone der Sandbox.
 */
export class ClimbTestWorld extends ZoneWorld {
  private readonly lively: readonly TestZone[] = [new ClimbZone()];

  protected override zones(): readonly TestZone[] {
    return this.lively;
  }

  protected override worldId(): string {
    return 'test-climb';
  }

  protected override editorTitle(): string {
    return 'Test Kletterwand';
  }

  protected override layout(): GridPlan {
    return zonePlan(CLIMB_WORLD);
  }

  protected override spawnTile(): { x: number; z: number } {
    return CLIMB_WORLD.spawn;
  }

  /** **Nach Norden**, auf die Wand. */
  protected override spawnYaw(): number {
    return 0;
  }

  protected override welcome(): string {
    return 'Test Kletterwand · Greifen hält dich an der Wand';
  }
}
