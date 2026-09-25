import * as THREE from 'three';
import { PLAN_WALL_H } from '../../editor/levelPlan';
import { TILE } from '../../nav/navTile';
import { APRON, spacesOf, type HouseSpec, type Rect } from '../house';

/** Die Farbe über einem Raum, den man gerade nicht sieht — die des Weltraums draußen. */
const FOG_COLOUR = 0x04070c;
/** Die Kennung des Deckels über der Einsatzzentrale; sie ist kein Raum der Station. */
const APRON_LID = 'apron';

/**
 * **Von oben deckt ein Deckel zu, was die Figur nicht sieht**
 * (`stationVisibility.topDownRooms`).
 *
 * Die Ansicht von oben schneidet die Decke ab (`core/cutaway.ts`), und dann
 * liegt die ganze Station offen: Nachbarräume mit Licht, Kisten und dem, was
 * darin läuft. Bis hierher blendete die Welt nur die Einrichtung aus, und auch
 * das nur in der Brille; auf dem Telefon war alles zu sehen. Jetzt liegt über
 * jedem Raum und Gang, den die Figur nicht sieht, eine dunkle Platte auf
 * Wandhöhe: Die Wände schauen zur Hälfte darunter hervor und zeichnen den
 * Grundriss, drinnen ist es Nacht.
 *
 * Die Deckel sind nur von oben zu sehen (`setTopDown`) und tragen keine
 * Ebenenmarke — die Decke geht beim Aufschneiden weg, die Deckel nicht.
 */
export class TopDownFog {
  readonly group = new THREE.Group();
  private readonly lids = new Map<string, THREE.Mesh>();
  private readonly geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly material = new THREE.MeshBasicMaterial({ color: FOG_COLOUR, fog: false });
  private readonly entryRoom: string;

  constructor(spec: HouseSpec) {
    this.group.name = 'top-down-fog';
    this.group.visible = false;
    this.entryRoom = spec.entryRoom;
    for (const space of spacesOf(spec)) this.lid(space.id, space.rect);
    this.lid(APRON_LID, APRON);
  }

  private lid(id: string, rect: Rect): void {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.scale.set(rect.w * TILE, 1, rect.d * TILE);
    mesh.position.set(
      (rect.x + rect.w / 2) * TILE,
      PLAN_WALL_H + 0.02,
      (rect.z + rect.d / 2) * TILE,
    );
    mesh.renderOrder = 3;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.raycast = () => {};
    mesh.visible = false;
    this.lids.set(id, mesh);
    this.group.add(mesh);
  }

  /**
   * Welche Räume die Figur sieht — `null` heißt alle. Die Zentrale bleibt
   * offen, solange man in der Cafeteria steht: Zwischen beiden ist Glas.
   */
  update(visible: ReadonlySet<string> | null): void {
    for (const [id, lid] of this.lids) {
      const seen = id === APRON_LID ? visible?.has(this.entryRoom) : visible?.has(id);
      lid.visible = !!visible && !seen;
    }
  }

  setTopDown(on: boolean): void {
    this.group.visible = on;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
