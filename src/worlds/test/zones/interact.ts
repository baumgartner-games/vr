import * as THREE from 'three';
import type { GridPlan } from '../../grid/gridPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W } from '../../nav/navTile';
import type { PhysicsBody } from '../../../physics/PhysicsWorld';
import { INTERACT, centre } from '../layout';
import type { WorldContext } from '../../../core/types';
import type { TestZone, ZoneHost } from './zone';

/**
 * **Die Interaktionen** — Nordwesten, und der Grund für die ganze Zone ist
 * eine Wand.
 *
 * Drei Türen in drei Betriebsarten (`grid/fixtures/door.ts`): Schiebetür,
 * Flügeltür, Drucktür. Davor je ein Auslöser — **Knopf**, **Hebel**,
 * **Druckplatte** —, und neben der Platte zwei Kisten, die man daraufschiebt,
 * damit ihre Tür offen bleibt. Dazu eine Lampe mit ihrem Kippschalter: die
 * kürzeste Kette, die es hier gibt — Hebel umlegen, Licht geht an, und
 * dazwischen liegt nichts als ein `trigger` durch die Registry.
 *
 * **Warum ein Hof und keine Wand quer über den Platz.** Eine Tür, an der man
 * vorbeigehen kann, ist ein Möbelstück; erst eine Wand, die wirklich trennt,
 * macht daraus eine Tür. Und erst dann lässt es sich auch **prüfen**: Hinter
 * diese Wand kommt man nur durch eine der drei Türen, und das rechnet der Test
 * über den Graphen nach, statt dass es jemand im Headset nachläuft.
 *
 * **Warum die Türkante hier noch einmal gesetzt wird** (`plan.door`), obwohl
 * `putFixture` sie anlegt: Das tut sie nur, wenn die Art angemeldet ist, und
 * angemeldet wird sie in `fixtures/kinds.ts` — der Datei, die three.js
 * mitbringt. Der Grundriss soll ohne auskommen, also steht die Kante
 * ausdrücklich hier. Beide Wege legen dieselbe an.
 */

/** Der Hof hinter der Türwand: die Westhälfte der Zone. */
export const YARD = { x: INTERACT.x, z: INTERACT.z + 1, w: 6, d: 5 } as const;

/** Die Spalte, an deren **Ostkante** die Türwand steht. */
export const DOOR_COLUMN = YARD.x + YARD.w - 1;
/** Und die Spalte davor, in der die Auslöser stehen. */
export const TRIGGER_COLUMN = DOOR_COLUMN + 1;

/** Die Lampe dieser Zone und ihr Kippschalter. */
export const LAMP_ID = 'lampe-interakt';

/** Wo die beiden Kisten liegen, die auf die Druckplatte gehören. */
export const CRATES: ReadonlyArray<{ x: number; z: number }> = [
  { x: TRIGGER_COLUMN + 2, z: YARD.z + 3 },
  { x: TRIGGER_COLUMN + 3, z: YARD.z + 3 },
];

/** Was an dieser Wand steht: Tür, Auslöser, Art und Kennung. */
export interface DoorSpot {
  /** Die Zeile, in der Tür und Auslöser stehen. */
  z: number;
  /** Kennung der Tür und ihre Betriebsart (`fixtures/door.ts`). */
  door: string;
  mode: 'slide' | 'swing' | 'plate';
  /** Kennung des Auslösers und seine Art. */
  trigger: string;
  kind: 'button' | 'lever' | 'plate';
  /** Was auf dem Schild des Auslösers steht. */
  label: string;
}

/**
 * **Die drei Türen, von Norden nach Süden** — jede mit dem Auslöser, der zu
 * ihr gehört.
 *
 * Eine Tabelle und keine drei Blöcke Code darunter: Was sich unterscheidet,
 * sind fünf Wörter je Zeile, und die stehen nebeneinander lesbar statt dreimal
 * in derselben Schleife mit anderem Inhalt.
 */
export const DOORS: readonly DoorSpot[] = [
  {
    z: YARD.z + 1,
    door: 'tuer-schiebe',
    mode: 'slide',
    trigger: 'knopf-schiebetuer',
    kind: 'button',
    label: 'Schiebetür',
  },
  {
    z: YARD.z + 2,
    door: 'tuer-dreh',
    mode: 'swing',
    trigger: 'hebel-drehtuer',
    kind: 'lever',
    label: 'Flügeltür',
  },
  {
    z: YARD.z + 3,
    door: 'tuer-platte',
    mode: 'plate',
    trigger: 'platte-drucktuer',
    kind: 'plate',
    label: 'Drucktür',
  },
];

export function stampInteract(plan: GridPlan): void {
  // **Die Rückwand der Zone**, damit das Schild etwas hat, woran es hängt —
  // und damit der Hof nach Norden nicht ins Gelände ausfranst.
  plan.run(INTERACT.x, INTERACT.z, INTERACT.w, 'x', (x, z) => plan.wall(x, z, DIR_N));

  // Die Mauer um den Hof: Norden, Süden, Westen zu, Osten sind die drei Türen.
  const yardEnd = YARD.z + YARD.d - 1;
  plan.run(YARD.x, YARD.z, YARD.w, 'x', (x, z) => {
    plan.wall(x, z, DIR_N);
    plan.wall(x, yardEnd, DIR_S);
  });
  plan.run(YARD.x, YARD.z, YARD.d, 'z', (x, z) => plan.wall(x, z, DIR_W));

  // Und die Ostkante: massiv überall, wo keine der drei Türen hängt.
  for (let z = YARD.z; z <= yardEnd; z++) {
    if (DOORS.some((one) => one.z === z)) continue;
    plan.wall(DOOR_COLUMN, z, DIR_E);
  }
}

/**
 * **Die Einbauten dieser Zone** — und nur sie.
 *
 * Getrennt vom Rest, weil `TestWorld.planLoaded` sie **nach** einem
 * gespeicherten Umbau noch einmal aufsetzt: Ein Einbau hat eine **Kennung**,
 * und `putFixture` ersetzt nach Kennung — es entsteht also kein zweiter
 * daneben. Wände und Bausteine haben keine, und wer eine Wand wegbaut, hat sie
 * weggebaut.
 */
export function fitInteract(plan: GridPlan): void {
  for (const spot of DOORS) {
    const z = spot.z;
    // Zu, und nicht offen: Ein Hof, dessen Türen beim Laden aufstehen, ist
    // einer, an dem man nie merkt, dass es Türen sind. Die Kante wird hier
    // ausdrücklich gesetzt, weil `putFixture` sie nur anlegt, wenn die Art
    // angemeldet ist — und angemeldet wird sie in der Datei, die three.js
    // mitbringt (`fixtures/kinds.ts`).
    plan.door(DOOR_COLUMN, z, DIR_E, 0, false);
    plan.putFixture({
      id: spot.door,
      kind: 'door',
      x: DOOR_COLUMN,
      z,
      dir: DIR_E,
      props: { mode: spot.mode },
    });
    // Der Auslöser davor — eine Kachel östlich, an seiner Westkante und mit
    // dem Gesicht nach Osten, dorthin, wo der herkommt, der die Tür aufmachen
    // will (`fixtureYaw`).
    plan.putFixture({
      id: spot.trigger,
      kind: spot.kind,
      x: TRIGGER_COLUMN,
      z,
      dir: DIR_W,
      props: { target: spot.door, label: spot.label },
    });
  }

  // Die Lampe im Osten der Zone und ihr Kippschalter eine Kachel weiter.
  plan.putFixture({
    id: LAMP_ID,
    kind: 'lamp',
    x: INTERACT.x + 9,
    z: INTERACT.z + 2,
    dir: DIR_N,
    props: { on: false, height: 3.2 },
  });
  plan.putFixture({
    id: 'schalter-lampe',
    kind: 'lever',
    x: INTERACT.x + 9,
    z: INTERACT.z + 3,
    dir: DIR_E,
    props: { target: LAMP_ID, label: 'Licht' },
  });

  // Zwei Schilder an der Rückwand: eines für die Türwand, eines für die Lampe.
  plan.putFixture({
    id: 'schild-tueren',
    kind: 'sign',
    x: DOOR_COLUMN,
    z: INTERACT.z,
    dir: DIR_N,
    props: { text: 'Drei Türen: Knopf, Hebel, Platte — Kisten halten die Platte gedrückt' },
  });
  plan.putFixture({
    id: 'schild-lampe',
    kind: 'sign',
    x: INTERACT.x + 9,
    z: INTERACT.z,
    dir: DIR_N,
    props: { text: 'Hebel schaltet die Lampe — eine Kette durch die Registry' },
  });
}

// --- was Körper hat ---------------------------------------------------------

/** Kantenlänge einer Kiste — zwei davon schiebt man auf die Druckplatte. */
const CRATE_SIZE = 0.6;

/**
 * **Die beiden Kisten** — das Einzige an dieser Zone, was einen Körper hat.
 *
 * Sie stehen hier und nicht im Grundriss, weil eine Kiste ein **Gegenstand**
 * ist: Sie wird geschoben, geworfen und landet irgendwo — und `worldReset()`
 * der Basis stellt jeden angemeldeten Gegenstand an seinen Platz zurück, ohne
 * dass diese Zone etwas dafür tun müsste.
 */
export class InteractZone implements TestZone {
  private readonly owned: THREE.Material[] = [];
  private readonly bodies: PhysicsBody[] = [];

  build(_ctx: WorldContext, world: ZoneHost): void {
    const wood = this.own(new THREE.MeshStandardMaterial({ color: 0xb07a3f, roughness: 0.85 }));
    const trim = this.own(new THREE.MeshStandardMaterial({ color: 0x8a5c2c, roughness: 0.85 }));

    CRATES.forEach((cell, index) => {
      const crate = new THREE.Group();
      crate.name = `test-kiste-${index}`;
      crate.add(new THREE.Mesh(new THREE.BoxGeometry(CRATE_SIZE, CRATE_SIZE, CRATE_SIZE), wood));
      // Zwei Leisten über Eck: Ohne sie ist eine Kiste ein brauner Würfel.
      for (const axis of ['x', 'z'] as const) {
        const band = new THREE.Mesh(
          new THREE.BoxGeometry(
            axis === 'x' ? CRATE_SIZE + 0.02 : 0.07,
            0.07,
            axis === 'x' ? 0.07 : CRATE_SIZE + 0.02,
          ),
          trim,
        );
        band.position.y = CRATE_SIZE / 2 - 0.08;
        crate.add(band);
      }
      crate.position.set(centre(cell.x), CRATE_SIZE / 2 + 0.02, centre(cell.z));
      crate.rotation.y = index * 0.4;
      world.root.add(crate);
      crate.updateWorldMatrix(true, false);
      this.bodies.push(
        world.addProp(
          world.physics.addDynamic(crate, {
            shape: { kind: 'box' },
            halfExtents: new THREE.Vector3(CRATE_SIZE / 2, CRATE_SIZE / 2, CRATE_SIZE / 2),
            mass: 14,
            friction: 0.9,
            restitution: 0.02,
          }),
          `test-kiste-${index}`,
        ),
      );
    });
  }

  dispose(): void {
    for (const material of this.owned) material.dispose();
    this.owned.length = 0;
    this.bodies.length = 0;
  }

  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }
}
