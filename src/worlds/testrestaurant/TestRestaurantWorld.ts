import * as THREE from 'three';
import { FurnishedWorld } from '../grid/FurnishedWorld';
import type { GridPlan } from '../grid/gridPlan';
import type { ElementSpot } from '../elements/elementPlace';
import { createSky } from '../shared/environment';
import type { PlateTile } from '../shared/plateField';
import { PLATE_PROTOTYPE } from '../test/floorPlate';
import { SPOTS, ground, restaurantPlan, spawn } from './restaurantPlan';
import type { Handedness } from '../../core/XRInput';

/**
 * **Test Restaurant** — die zweite Welt im Ordner _Test_: Boden, Ankunftsort
 * und die Burgerküche, die der Besitzer aus dem Möbelkatalog zusammengestellt
 * hat (`restaurantPlan.SPOTS`).
 *
 * Wie die Küche hingestellt wird, wie ihre Stationen auf `A` antworten und wie
 * die Figur trägt, steht in `grid/FurnishedWorld.ts` — das können seit dem
 * einen Katalog alle Gitterwelten. Hier steht nur, was diese Welt ausmacht.
 */
export class TestRestaurantWorld extends FurnishedWorld {
  protected override worldId(): string {
    return 'test-restaurant';
  }

  protected override editorTitle(): string {
    return 'Test Restaurant';
  }

  protected override layout(): GridPlan {
    return restaurantPlan();
  }

  /** Hier steht nichts, was die NPCs bräuchten — geplant wird auf dem Plan. */
  protected override navFromPlan(): boolean {
    return true;
  }

  /** Der Boden ist dieselbe Prototyp-Platte wie in der Test Navigation. */
  protected override floorPlate(_tile: PlateTile): string | null {
    return PLATE_PROTOTYPE;
  }

  protected override skyColor(): number {
    return 0x9cc4e8;
  }

  protected override welcome(): string {
    return 'Test Restaurant · die Burgerküche aus dem Möbelkatalog';
  }

  /** Leere Hände: Getragen wird hier nur, was eine Station hergibt. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  protected override spawnPoint(): THREE.Vector3 {
    const at = spawn();
    return new THREE.Vector3(at.x, 0, at.z);
  }

  protected override spawnYaw(): number {
    return 0;
  }

  protected override buildEnvironment(): void {
    super.buildEnvironment();
    this.root.add(createSky(0x6ea8e8, 0xdbe7f2));
  }

  /** Keine Würfel und Dominos der Portalwelt — nur die Küche. */
  protected override buildProps(): void {
    this.furnishSpots();
  }

  /** Die Burgerküche (`SPOTS`). */
  protected override spots(): readonly ElementSpot[] {
    return SPOTS;
  }

  /** **Ob die Kachel auf dem Boden liegt** — nur dorthin stellt der Katalog. */
  protected override onGround(tx: number, tz: number): boolean {
    const g = ground();
    return tx >= g.x && tx < g.x + g.w && tz >= g.z && tz < g.z + g.d;
  }
}
