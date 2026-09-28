import * as THREE from 'three';
import type { ElementSpot } from '../elements/elementPlace';
import type { GridPlan } from '../grid/gridPlan';
import type { PlateTile } from '../shared/plateField';
import { TestRestaurantWorld } from '../testrestaurant/TestRestaurantWorld';
import { SPOTS, onFloor, plateUpRoomPlan, roomFloor, roomWalls, spawn } from './plateUpRoom';

/**
 * **Das Restaurant** — Küche und Gastraum, neu aus dem Möbelkatalog.
 *
 * Gewünscht, im September 2026: _„Also zunächst Restaurant Welt komplett leer
 * machen, dann die Boden floor Platten für die Küche einbauen und die floor
 * Holz für den Gast Raum einsetzen. Dann die Küchen Elemente aus Möbel
 * einbauen."_ — und die Wände als Möbel, _„keine weiteren Gegenstände wie
 * Tische oder Stühle"_. Im Plan (`plateUpRoom.ts`) stehen Boden, Tor und die
 * Stellen; jede Stelle ist ein Spielelement und sperrt ihre Zellen selbst.
 * Die Wände sind die Regalwände der Test Navigation, auf den Fugen
 * (`roomWalls`) — hingestellt wie aus der Hand, keine Blöcke.
 *
 * Gebaut wird auf demselben Weg wie im Test Restaurant (`TestRestaurantWorld`):
 * `furnish` stellt jede Stelle hin, jede mit Stationsart antwortet auf `A`
 * nach der Regel der Küche, das Getragene hängt in der Hand, und der
 * Möbelkatalog steht im Menü. Das Spiel mit Gästen, Tagen und Kasse, das bis
 * hierher in dieser Klasse stand, ist mit Tischen und Stühlen gegangen; es
 * steht in der Geschichte des Repositorys (`docs/agents/burgerladen.md`
 * nennt den Commit).
 */
export class PlateUpWorld extends TestRestaurantWorld {
  protected override worldId(): string {
    return 'plateup';
  }

  protected override editorTitle(): string {
    return 'Restaurant';
  }

  protected override layout(): GridPlan {
    return plateUpRoomPlan();
  }

  /**
   * **Die Wände aus dem Regal**, eingerastet wie aus der Hand — wie in der
   * Test Navigation (`NavTestWorld.buildProps`): für das Zellgitter Wände an
   * der Kante (`GridWorld.collectWalls`). Steht schon ein Stück an seiner
   * Stelle, kommt kein zweites (`placeModel`).
   */
  protected override buildProps(): void {
    super.buildProps();
    if (!this.context) return;
    for (const wall of roomWalls())
      void this.placeModel(wall.path, new THREE.Vector3(wall.x, wall.y, wall.z), wall.yaw);
  }

  protected override spots(): readonly ElementSpot[] {
    return SPOTS;
  }

  protected override onGround(tx: number, tz: number): boolean {
    return onFloor(tx, tz);
  }

  /** Fliesen in der Küche, Dielen im Gastraum, draußen der Prototyp-Boden. */
  protected override floorPlate(tile: PlateTile): string | null {
    return roomFloor(tile.col, tile.row);
  }

  protected override welcome(): string {
    return 'Restaurant · Küche aus dem Möbelkatalog';
  }

  protected override spawnPoint(): THREE.Vector3 {
    const at = spawn();
    return new THREE.Vector3(at.x, 0, at.z);
  }

  /** Nach Süden, über die Durchreiche in den Gastraum. */
  protected override spawnYaw(): number {
    return Math.PI;
  }
}
