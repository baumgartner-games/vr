import * as THREE from 'three';
import type { GridPlan } from '../../grid/gridPlan';
import { DIR_E, DIR_N, DIR_S } from '../../nav/navTile';
import { HAZARD_SPIKES } from '../../nav/navProfile';
import { buildRedButton, BUTTON_DOME_R, type RedButton } from '../../shared/redButton';
import { TextPlane } from '../../../ui/TextPlane';
import type { WorldContext } from '../../../core/types';
import { NAVIGATION, centre } from '../layout';
import type { TestZone, ZoneHost } from './zone';

/**
 * **Die Navigation** — Westen, und das Wenigste vom alten Navigationslabor.
 *
 * Vier Sachen, an denen man der Wegsuche beim Denken zusieht, und mehr braucht
 * es nicht: ein **enger Gang** mit einer Kiste darin, eine **Tür** an seinem
 * Ende, ein **Stachelfeld** und ein **roter Knopf**, der einen NPC von A nach B
 * schickt. Das Labor hatte acht Buchten davon; sie beantworteten dieselbe Frage
 * achtmal, und wer sie alle gesehen hatte, hatte eine Stunde gebraucht.
 *
 * **Der Gang ist ein Umweg und keine Engstelle.** Man kommt auch nördlich und
 * südlich an ihm vorbei, und das ist Absicht: Er zeigt, dass eine Kiste eine
 * Kachel **teuer** macht und nicht **zu** (`grid/blocks.ts`) — ein NPC nimmt
 * ihn, wenn er der kürzeste Weg ist, und geht außen herum, sobald etwas darin
 * steht. Eine Sackgasse hinter einer geschlossenen Tür zeigte dagegen nur, dass
 * eine Wegsuche aufgibt.
 *
 * **Das Stachelfeld ist eine Kachelnotiz und kein Objekt** (`TileFacts.hazard`,
 * `nav/`): Es steht im Graphen, also weiß ein NPC davon, bevor er hineinläuft.
 * Was man sieht, ist ein rotbrauner Fleck auf dem Boden — gebaut von dieser
 * Zone, gerechnet vom Graphen.
 */

/** Der enge Gang: eine Kachelreihe, von Westen nach Osten. */
export const LANE = { x: NAVIGATION.x + 4, z: 0, length: 7 } as const;
/** Die Kachel, auf der die Kiste im Weg steht. */
export const LANE_CRATE = { x: LANE.x + 2, z: LANE.z } as const;
/** Die Tür am Ostende des Gangs. */
export const LANE_DOOR = 'tuer-gang';

/** Das Stachelfeld: drei mal drei Kacheln im Nordosten der Zone. */
export const SPIKES = { x: NAVIGATION.x + 12, z: NAVIGATION.z, w: 3, d: 3 } as const;

/** Wo der NPC losgeht und wo er hinsoll. */
export const POINT_A = { x: NAVIGATION.x + 14, z: 2 } as const;
export const POINT_B = { x: NAVIGATION.x + 1, z: 0 } as const;

/** Und wo der rote Knopf steht, der ihn losschickt. */
export const BUTTON_TILE = { x: NAVIGATION.x + 14, z: 0 } as const;

export function stampNavigation(plan: GridPlan): void {
  // **Der enge Gang**: eine Kachel breit, zugemauert nach Norden und Süden.
  const east = LANE.x + LANE.length - 1;
  plan.run(LANE.x, LANE.z, LANE.length, 'x', (x, z) => {
    plan.wall(x, z, DIR_N);
    plan.wall(x, z, DIR_S);
  });

  // Die Tür an seinem Ostende. Sie steht im Graphen als Türkante und nicht als
  // Loch in einer Wand — erst damit kann sich eine Meinung über sie irren
  // (`nav/navBelief.ts`).
  plan.door(east, LANE.z, DIR_E, 0, false);
  plan.putFixture({
    id: LANE_DOOR,
    kind: 'door',
    x: east,
    z: LANE.z,
    dir: DIR_E,
    props: { mode: 'swing' },
  });

  /**
   * **Das Stachelfeld.** `hazard` ist eine Eigenschaft der Kachel und kein
   * Objekt darüber: Es steht im Graphen, also weiß ein NPC davon, bevor er
   * hineinläuft.
   *
   * Und für einen **Menschen** sind Stacheln unpassierbar
   * (`HUMAN_PROFILE.hazard[HAZARD_SPIKES] = Infinity`) — er plant nicht
   * hindurch, sondern herum. Ein Zombie kennt keine Gefahr und läuft mitten
   * hinein; das ist der Unterschied, den man hier in einem Durchgang sieht.
   */
  plan.floor({ ...SPIKES }, { hazard: HAZARD_SPIKES });

  plan.putFixture({
    id: 'schild-navigation',
    kind: 'sign',
    x: NAVIGATION.x + 8,
    z: NAVIGATION.z,
    dir: DIR_N,
    props: { text: 'Roter Knopf schickt einen NPC quer durch die Zone zum Ziel' },
  });
  plan.wall(NAVIGATION.x + 8, NAVIGATION.z, DIR_N);

  // Und ein Schild am Gang, damit man weiß, was die Kiste darin soll.
  plan.putFixture({
    id: 'schild-gang',
    kind: 'sign',
    x: LANE.x,
    z: LANE.z - 1,
    dir: DIR_S,
    props: { text: 'Enger Gang: die Kiste macht die Kachel teuer, nicht zu' },
  });
}

// --- was Leben hat ----------------------------------------------------------

/** Kantenlänge der Kiste im Gang. */
const CRATE_SIZE = 0.62;
/** Wie hoch der Zielmast steht. */
const MARK_HEIGHT = 1.8;

/**
 * **Der Knopf, die Kiste, der Zielmast und der NPC.**
 *
 * Der Knopf ist derselbe, der im alten Labor und in den Alpen stand
 * (`worlds/shared/redButton.ts`): Säule, Kragen, Kuppel, Schild. Er meldet
 * sich als **benutzbar** an, also drückt `A` ihn in jeder Ansicht — und weil
 * er auch am Zeiger hängt, geht es in der Brille genauso mit dem Strahl.
 */
export class NavigationZone implements TestZone {
  private button: RedButton | null = null;
  private mark: TextPlane | null = null;
  private host: ZoneHost | null = null;
  private pointerObject: THREE.Object3D | null = null;
  private ctx: WorldContext | null = null;
  private readonly owned: THREE.Material[] = [];
  private readonly shapes: THREE.BufferGeometry[] = [];

  build(ctx: WorldContext, world: ZoneHost): void {
    this.host = world;
    this.ctx = ctx;

    this.buildCrate(world);
    this.buildSpikes(world);
    this.buildMark(world);
    this.buildButton(ctx, world);
  }

  update(dt: number): void {
    this.button?.update(dt);
  }

  /** `B`/`Y` räumt die Zone leer: Wer noch unterwegs ist, ist es nicht mehr. */
  reset(): void {
    this.host?.clearNpcs();
  }

  dispose(): void {
    if (this.ctx && this.pointerObject) this.ctx.pointer.remove(this.pointerObject);
    if (this.button) this.host?.removeUsable(this.button.dome);
    this.button?.dispose();
    this.button = null;
    this.mark?.dispose();
    this.mark = null;
    for (const material of this.owned) material.dispose();
    this.owned.length = 0;
    for (const shape of this.shapes) shape.dispose();
    this.shapes.length = 0;
    this.host = null;
    this.ctx = null;
    this.pointerObject = null;
  }

  // --- die Stücke -----------------------------------------------------------

  /** Die Kiste im Gang — ein Gegenstand, also schiebbar und zurücksetzbar. */
  private buildCrate(world: ZoneHost): void {
    const skin = this.own(new THREE.MeshStandardMaterial({ color: 0x9a6b3c, roughness: 0.9 }));
    const shape = this.shape(new THREE.BoxGeometry(CRATE_SIZE, CRATE_SIZE, CRATE_SIZE));
    const crate = new THREE.Mesh(shape, skin);
    crate.name = 'nav-kiste';
    crate.position.set(centre(LANE_CRATE.x), CRATE_SIZE / 2 + 0.02, centre(LANE_CRATE.z));
    world.root.add(crate);
    crate.updateWorldMatrix(true, false);
    world.addProp(
      world.physics.addDynamic(crate, {
        shape: { kind: 'box' },
        halfExtents: new THREE.Vector3(CRATE_SIZE / 2, CRATE_SIZE / 2, CRATE_SIZE / 2),
        mass: 14,
        friction: 0.9,
        restitution: 0.02,
      }),
      'nav-kiste',
    );
  }

  /**
   * Der Fleck, den man sieht, während der Graph die Zahl kennt.
   *
   * Ein flacher Quader ohne Körper: Die Stacheln halten niemanden auf — sie
   * kosten, und was sie kosten, steht in der Kachel (`TileFacts.hazard`).
   */
  private buildSpikes(world: ZoneHost): void {
    const skin = this.own(
      new THREE.MeshStandardMaterial({ color: 0x8c3a2c, roughness: 0.95, metalness: 0 }),
    );
    const shape = this.shape(new THREE.BoxGeometry(SPIKES.w, 0.04, SPIKES.d));
    const patch = new THREE.Mesh(shape, skin);
    patch.name = 'nav-stacheln';
    patch.position.set(SPIKES.x + SPIKES.w / 2, 0.022, SPIKES.z + SPIKES.d / 2);
    world.root.add(patch);

    // Ein paar Spitzen darauf, damit es von oben nach Stacheln aussieht und
    // nicht nach einem Teppich.
    const spike = this.own(new THREE.MeshStandardMaterial({ color: 0xc8cdd8, roughness: 0.4 }));
    const cone = this.shape(new THREE.ConeGeometry(0.06, 0.22, 8));
    for (let dz = 0; dz < SPIKES.d; dz++) {
      for (let dx = 0; dx < SPIKES.w; dx++) {
        const tip = new THREE.Mesh(cone, spike);
        tip.position.set(centre(SPIKES.x + dx), 0.15, centre(SPIKES.z + dz));
        world.root.add(tip);
      }
    }
  }

  /** Der Zielmast am Ende: ein Mast und eine Tafel, die nach Osten liest. */
  private buildMark(world: ZoneHost): void {
    const steel = this.own(new THREE.MeshStandardMaterial({ color: 0x9aa6bd, roughness: 0.5 }));
    const post = new THREE.Mesh(this.shape(new THREE.BoxGeometry(0.09, MARK_HEIGHT, 0.09)), steel);
    post.position.set(centre(POINT_B.x), MARK_HEIGHT / 2, centre(POINT_B.z));
    world.root.add(post);

    const plate = new TextPlane({
      width: 1.3,
      height: 0.5,
      title: 'Ziel',
      body: 'Hierher läuft er',
      accent: 0x5ee0a0,
    });
    plate.position.set(centre(POINT_B.x), MARK_HEIGHT, centre(POINT_B.z));
    plate.rotation.y = Math.PI / 2;
    world.root.add(plate);
    this.mark = plate;
  }

  /** Und der Knopf, der ihn losschickt. */
  private buildButton(ctx: WorldContext, world: ZoneHost): void {
    const button = buildRedButton({
      title: 'NPC losschicken',
      body: 'Von hier bis zum Zielmast im Westen',
    });
    button.group.position.set(centre(BUTTON_TILE.x), 0, centre(BUTTON_TILE.z));
    // Das Schild steht auf +Z; gedreht schaut es dorthin, wo man ankommt.
    button.group.rotation.y = Math.PI;
    world.root.add(button.group);
    this.button = button;

    world.addUsable(
      button.dome,
      {
        use: () => this.send(),
        usePrompt: () => 'NPC losschicken',
      },
      { radius: 0.5, shot: BUTTON_DOME_R, half: 0.3 },
    );
    ctx.pointer.add({ object: button.dome, onSelect: () => this.send() });
    this.pointerObject = button.dome;
  }

  /**
   * Einen losschicken — und vorher den letzten wegräumen.
   *
   * Sonst stehen nach dem fünften Druck fünf davon am Ziel und schieben sich
   * gegenseitig vom Mast.
   */
  private send(): boolean {
    const world = this.host;
    if (!world) return false;
    this.button?.press();
    world.clearNpcs();
    const from = new THREE.Vector3(centre(POINT_A.x), 0, centre(POINT_A.z));
    const to = new THREE.Vector3(centre(POINT_B.x), 0, centre(POINT_B.z));
    if (!world.sendNpc(from, to)) return false;
    world.notify('Unterwegs zum Ziel');
    return true;
  }

  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }

  private shape<T extends THREE.BufferGeometry>(geometry: T): T {
    this.shapes.push(geometry);
    return geometry;
  }
}
