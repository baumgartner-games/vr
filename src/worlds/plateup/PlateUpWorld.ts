import * as THREE from 'three';
import type { DayDriver, DaySettings } from '../../core/dayClock';
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

  /**
   * **Das Restaurant wird von selbst Abend** — gewünscht: _„Restaurant-Runde,
   * die von selbst Abend wird … tagsüber alle kunden, nach ladenschluss
   * nacht"_. Ab Werk stellt die Welt die Uhr (_Vom Spiel_, `restaurantDay`);
   * unter _Welten → Restaurant → Tageslauf_ lässt es sich umstellen.
   */
  protected override dayDefaults(): DaySettings {
    return { mode: 'game', minutes: 5 };
  }

  protected override dayDriver(): DayDriver {
    return RESTAURANT_DAY;
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

/**
 * **Die Öffnungszeiten** — der Tag des Restaurants als Programm (`DayDriver`):
 *
 * 1. **Geöffnet** — die eingestellten Minuten (ab Werk fünf), von 9 bis 17 Uhr:
 *    Tag, in dem die Gäste kommen.
 * 2. **Ladenschluss** — eine Minute, 17 bis 20:30: Es wird Abend, die letzten
 *    werden bedient, die Lampen gehen an.
 * 3. **Nacht** — zwei Fünftel der Öffnungszeit, 20:30 bis 5 Uhr.
 * 4. **Morgen** — eine halbe Minute, 5 bis 9 Uhr, dann öffnet der nächste Tag.
 *
 * Das Gästespiel mit Tagen und Kasse (`plateUpGame.ts`) steht zurzeit nicht in
 * der Welt; kommt es zurück, stellt es die Uhr nach seinem `Shift` (geöffnet,
 * Ladenschluss, geschlossen) und nicht nach der Stoppuhr.
 */
const RESTAURANT_DAY: DayDriver = {
  label: 'Öffnungszeiten',
  sub: 'Geöffnet am Tag · nach Ladenschluss Abend und Nacht · dann der nächste Tag',
  minutesLabel: 'Öffnungszeit',
  hour(seconds, settings) {
    const open = settings.minutes * 60;
    const closing = 60;
    const night = open * 0.4;
    const morning = 30;
    const day = open + closing + night + morning;
    const number = Math.floor(seconds / day) + 1;
    let t = seconds % day;
    const left = (span: number): string => {
      const rest = Math.max(0, Math.ceil(span - t));
      return `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}`;
    };
    if (t < open)
      return { hour: 9 + 8 * (t / open), status: `Tag ${number} · geöffnet, noch ${left(open)}` };
    t -= open;
    if (t < closing)
      return { hour: 17 + 3.5 * (t / closing), status: `Tag ${number} · Ladenschluss` };
    t -= closing;
    if (t < night)
      return { hour: 20.5 + 8.5 * (t / night), status: `Tag ${number} · Nacht, geschlossen` };
    t -= night;
    return { hour: 5 + 4 * (t / morning), status: `Tag ${number + 1} · gleich wird geöffnet` };
  },
};
