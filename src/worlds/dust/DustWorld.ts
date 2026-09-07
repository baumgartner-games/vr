import * as THREE from 'three';
import { GridWorld } from '../grid/GridWorld';
import { createCompanionCube, createPropShape } from '../portal/props';
import { createSky } from '../shared/environment';
import { TextPlane } from '../../ui/TextPlane';
import { dustTown } from './dustTown';
import type { GridPlan } from '../grid/gridPlan';
import type { PlanSolidKind } from '../grid/solids';

/**
 * Dust — a big outdoor map in the spirit of the Counter-Strike one: two open
 * squares connected by lanes and a tunnel, a four-storey block you can walk up
 * inside, a couple of smaller houses and a lot of crates to knock over.
 *
 * **Die Karte steht auf dem Kachelgitter** (`dustTown.ts`). Sie hatte vorher
 * siebzehn `slab()`-Aufrufe und vier eigene Hilfsfunktionen — Außenwand mit
 * Loch, Bodenplatte mit Loch, Treppe, Rampe —, und alle vier gibt es jetzt
 * einmal für alle Welten. Übrig bleibt in dieser Datei, was Dust wirklich
 * ausmacht: die Kisten, die Fässer und die Bretter, die man umwerfen kann.
 *
 * Everything the portal lab can do works here as well: the same tool belt, the
 * same shelf, the same physics and the same shared session — this world only
 * replaces the room. Portals stick to the light panels and to the ground;
 * plaster and stone stay solid, otherwise a portal in a wall of a hundred
 * pieces would open up half the map.
 */
export class DustWorld extends GridWorld {
  protected override spawnPoint(): THREE.Vector3 {
    // In the open at the south end, a few metres clear of the spawn house.
    return new THREE.Vector3(-6, 0, 33);
  }

  protected override skyColor(): number {
    return 0xbcd3ec;
  }

  protected override lightIntensity(): number {
    return 1.15;
  }

  protected override welcome(): string {
    return 'Dust · Werkzeuge am Gürtel · Portale haften an den hellen Tafeln';
  }

  /** Sand, Putz und Stein — die Karte lebt von drei warmen Tönen. */
  protected override tint(): Partial<Record<PlanSolidKind, number>> {
    return {
      floor: 0xd8bd8b,
      wall: 0xe0cba6,
      stone: 0xbda87f,
      wood: 0x9a6b3f,
    };
  }

  protected override layout(): GridPlan {
    return dustTown();
  }

  protected override buildEnvironment(): void {
    super.buildEnvironment();
    this.root.add(createSky(0x6ea8e8, 0xf3e2bb));

    const sign = new TextPlane({
      width: 5,
      height: 1.3,
      title: 'Dust',
      body: 'Zwei Plätze, ein Tunnel, vier Stockwerke. Portale haften an den hellen Tafeln.',
      accent: 0xffc857,
    });
    sign.position.set(-6, 3, 26);
    this.root.add(sign);
  }

  /** Crates and barrels — the things that are actually meant to be moved. */
  protected override buildProps(): void {
    const physics = this.physics!;
    let index = 0;

    const crate = (x: number, y: number, z: number, size: number, yaw = 0): void => {
      const mesh = createCompanionCube(size);
      mesh.position.set(x, y, z);
      mesh.rotation.y = yaw;
      this.root.add(mesh);
      this.registerProp(
        physics.addDynamic(mesh, { mass: size * 18, friction: 0.85, restitution: 0.05 }),
        `dust-crate-${index++}`,
      );
    };

    // Site A: a stack you can climb, and one that falls over if you shove it.
    for (const [x, z] of [
      [-19, -21],
      [-17.4, -21],
      [-19, -19.4],
    ] as const) {
      crate(x, 0.3, z, 0.6);
    }
    crate(-18.2, 0.9, -20.2, 0.6, 0.4);
    crate(-21.5, 0.25, -18, 0.5, 0.9);

    // Site B, on the other side of the map.
    for (let i = 0; i < 5; i++) {
      crate(
        19 + (i % 2) * 1.5,
        0.3 + Math.floor(i / 2) * 0.62,
        -20 + Math.floor(i / 2) * 0.4,
        0.6,
        i * 0.3,
      );
    }

    // Barrels along the middle lane.
    for (const [x, z] of [
      [1.6, 4],
      [2.4, 6.2],
      [-2.2, 8.5],
    ] as const) {
      const blueprint = createPropShape('cylinder');
      blueprint.mesh.position.set(x, 0.2, z);
      blueprint.mesh.scale.set(1.6, 1.6, 1.6);
      this.root.add(blueprint.mesh);
      this.registerProp(
        physics.addDynamic(blueprint.mesh, {
          shape: blueprint.shape,
          halfExtents: blueprint.halfExtents.clone().multiplyScalar(1.6),
          mass: 9,
          friction: 0.7,
          restitution: 0.1,
        }),
        `dust-barrel-${index++}`,
      );
    }

    // Planks leaning around the yard, good for building something with.
    for (const [x, z, yaw] of [
      [-6, -6, 0.4],
      [-6.9, -6.6, 1.1],
      [8, -4, -0.6],
    ] as const) {
      const blueprint = createPropShape('plank');
      blueprint.mesh.position.set(x, 0.1, z);
      blueprint.mesh.rotation.y = yaw;
      this.root.add(blueprint.mesh);
      this.registerProp(
        physics.addDynamic(blueprint.mesh, {
          shape: blueprint.shape,
          halfExtents: blueprint.halfExtents,
          mass: 3,
          friction: 0.7,
          restitution: 0.05,
        }),
        `dust-plank-${index++}`,
      );
    }
  }
}
