import * as THREE from 'three';
import { FurnishedWorld } from '../grid/FurnishedWorld';
import type { GridPlan } from '../grid/gridPlan';
import type { ElementSpot } from '../elements/elementPlace';
import { createSky } from '../shared/environment';
import type { PlateTile } from '../shared/plateField';
import type { PlanSolid } from '../grid/solids';
import { CITY_SPOTS, cityGround, cityPlan, citySpawn } from './cityPlan';
import type { Handedness } from '../../core/XRInput';

/**
 * **Stadt** — eine Welt im Ordner _Test_, gebaut nur aus dem
 * Katalogordner _Stadt_: Straßen mit Gehweg, Kreuzungen mit Ampeln, Häuser
 * Rücken an Rücken, Gärten, Parks und Plätze (`cityPlan.CITY_SPOTS`). Alles darin sind
 * Spielelemente; umstellen, tauschen und weiterbauen geht wie überall mit dem
 * Katalog.
 */
export class CityTestWorld extends FurnishedWorld {
  protected override worldId(): string {
    return 'test-city';
  }

  protected override editorTitle(): string {
    return 'Stadt';
  }

  protected override layout(): GridPlan {
    return cityPlan();
  }

  /** Geplant wird auf dem Plan — die Häuser sperren ihre Zellen selbst. */
  protected override navFromPlan(): boolean {
    return true;
  }

  /**
   * **Wiese statt Prototyp-Boden** — keine Platten, der Boden selbst ist grün
   * (`solidMaterial`). Das blaue Karomuster rund um die Stadt sah nach
   * Baustelle aus, und unter Straßen und Häusern sieht man ihn ohnehin nicht.
   */
  protected override floorPlate(_tile: PlateTile): string | null {
    return null;
  }

  protected override solidMaterial(solid: PlanSolid): THREE.Material {
    if (solid.kind !== 'floor') return super.solidMaterial(solid);
    return (this.lawn ??= new THREE.MeshStandardMaterial({ color: 0x7fae5a, roughness: 1 }));
  }

  /** **Draußen geht die Wiese weiter** — die Fläche jeder Welt, in Grün statt Schachbrett. */
  protected override horizonColor(): number | null {
    return 0x6f9e4c;
  }

  protected override horizonLine(): number {
    return 0x6a984a;
  }

  protected override horizonChecker(): number | null {
    return 0x6f9e4c;
  }

  /** Das Grün der Wiese, einmal gebaut. */
  private lawn: THREE.Material | null = null;

  protected override skyColor(): number {
    return 0x9cc4e8;
  }

  protected override welcome(): string {
    return 'Stadt · Straßen, Häuser und Parks aus dem Katalog „Stadt“';
  }

  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  protected override spawnPoint(): THREE.Vector3 {
    const at = citySpawn();
    return new THREE.Vector3(at.x, 0, at.z);
  }

  protected override spawnYaw(): number {
    return 0;
  }

  protected override buildEnvironment(): void {
    super.buildEnvironment();
    this.root.add(createSky(0x6ea8e8, 0xdbe7f2));
  }

  /** Keine Würfel und Dominos der Portalwelt — nur die Stadt. */
  protected override buildProps(): void {
    this.furnishSpots();
  }

  protected override spots(): readonly ElementSpot[] {
    return CITY_SPOTS;
  }

  protected override onGround(tx: number, tz: number): boolean {
    const g = cityGround();
    return tx >= g.x && tx < g.x + g.w && tz >= g.z && tz < g.z + g.d;
  }
}
