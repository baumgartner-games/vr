import type { GridPlan } from '../grid/gridPlan';
import { ZoneWorld } from './ZoneWorld';
import { EFFECTS_WORLD, zonePlan } from './zoneWorlds';

/**
 * **Test Effekte** — Rauch, Feuer, Funken, Wasser: vier Düsen in einer Reihe,
 * vor jeder ein Knopf (`zones/effects.ts`). Bis Oktober 2026 eine Zone der
 * Sandbox. Die Düsen sind Einbauten des Grundrisses; Leben braucht die Zone
 * keines.
 */
export class EffectsTestWorld extends ZoneWorld {
  protected override worldId(): string {
    return 'test-effects';
  }

  protected override editorTitle(): string {
    return 'Test Effekte';
  }

  protected override layout(): GridPlan {
    return zonePlan(EFFECTS_WORLD);
  }

  protected override spawnTile(): { x: number; z: number } {
    return EFFECTS_WORLD.spawn;
  }

  protected override spawnYaw(): number {
    return 0;
  }

  protected override welcome(): string {
    return 'Test Effekte · A auf einen Knopf löst die Düse dahinter aus';
  }
}
