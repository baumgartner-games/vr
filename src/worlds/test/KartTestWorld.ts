import type { GridPlan } from '../grid/gridPlan';
import type { HintZone } from '../../core/controlHints';
import type { MenuEntry } from '../../ui/menu';
import { ZoneWorld } from './ZoneWorld';
import { KART_WORLD, zonePlan } from './zoneWorlds';
import { KartZone } from './zones/kart';
import type { TestZone } from './zones/zone';

/**
 * **Test Rennstrecke** — die Kartbahn mit Boxengasse und zwei Karts, Lenkrad
 * in der Hand oder Stick, Rundenzeit und Klemmbrett (`zones/kart.ts`). Bis
 * Oktober 2026 eine Zone der Sandbox.
 */
export class KartTestWorld extends ZoneWorld {
  private readonly kart = new KartZone();
  private readonly lively: readonly TestZone[] = [this.kart];

  protected override zones(): readonly TestZone[] {
    return this.lively;
  }

  /** Am Steuer sagt die Tastenhilfe, wie man fährt (`core/controlHints.ts`). */
  override hintZone(): HintZone | null {
    return this.kart.seated ? { kind: 'kart' } : super.hintZone();
  }

  override menu(): MenuEntry[] {
    return [...super.menu(), ...this.kart.menu()];
  }

  protected override worldId(): string {
    return 'test-kart';
  }

  protected override editorTitle(): string {
    return 'Test Rennstrecke';
  }

  protected override layout(): GridPlan {
    return zonePlan(KART_WORLD);
  }

  protected override spawnTile(): { x: number; z: number } {
    return KART_WORLD.spawn;
  }

  /** **Nach Norden**, wohin die Karts in der Box schauen. */
  protected override spawnYaw(): number {
    return 0;
  }

  protected override welcome(): string {
    return 'Test Rennstrecke · Kart mit A besteigen · B stellt die Karts zurück in die Box';
  }
}
