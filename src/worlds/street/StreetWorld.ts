import * as THREE from 'three';
import { GridWorld } from '../grid/GridWorld';
import { createSky } from '../shared/environment';
import { TextPlane } from '../../ui/TextPlane';
import { PLAN_WALL_T } from '../editor/levelPlan';
import { TILE, dirX, dirZ, type Dir } from '../nav/navTile';
import {
  CRATES,
  CROSSING,
  ROAD,
  SPAWN,
  STALLS,
  STOVES,
  centreX,
  centreZ,
  counterAt,
  streetPlan,
} from './streetPlan';
import type { GridPlan } from '../grid/gridPlan';
import type { PlanSolidKind } from '../grid/solids';
import type { Handedness } from '../../core/XRInput';

/**
 * **Die Straßenküche** — die Kreuzung aus dem Referenzbild, von oben gespielt.
 *
 * Sie ist die Testwelt des Vorhabens *Von oben*
 * (`docs/plan-2d-hub-interaktion.md`): Küchenzeilen links und rechts,
 * Marktstände mit gestreiften Markisen am Rand, ein breiter Zebrastreifen in
 * der Mitte und ein freier Platz davor, auf dem später die Türen, Knöpfe,
 * Treppen und Effekte stehen (P6, P7). Der Grundriss steht ohne three.js
 * daneben (`streetPlan.ts`) und ist geprüft, bevor jemand sie betritt.
 *
 * **Keine Bilddateien** (Entscheidung E9 aus dem Plan). Alles, was hier nach
 * Straße aussieht, ist Farbe und Geometrie: Der Asphalt ist ein flacher
 * Quader, der Zebrastreifen sind zehn weiße Balken darauf, die Mittellinie ist
 * eine Reihe gelber Striche, und die Markisen sind abwechselnd gefärbte
 * Latten — blau-weiß und rot-weiß, wie im Bild. Eine Textur wäre hier kein
 * Gewinn: Ein Streifen aus zwei Quadern liegt richtig, sobald der Stand steht,
 * eine Textur muss man erst passend rechnen.
 *
 * **Was dazugehört und woanders steht**: Der Bordstein ringsherum, die
 * Küchenzeilen, die Bänke und die Körper der Stände kommen aus dem Grundriss
 * (`GridPlan`, `grid/blocks.ts`) — was hier gebaut wird, ist genau das, wofür
 * es keinen Baustein gibt: Straßenbemalung, Markisen, Herdplatten und die
 * Kleinigkeiten am Rand. Kisten, Verkehrshüte und Blumenkübel sind
 * **Gegenstände** mit Körper (`buildProps`), also schiebbar wie im
 * Portallabor, und `worldReset()` stellt sie zurück, weil die Basis jeden
 * angemeldeten Gegenstand an seinen Platz zurücksetzt.
 *
 * **Das Tor zurück in den Hub** ist ein Einbau der Art `gate` und steht im
 * Plan. Die Art selbst gehört P4; solange es sie nicht gibt, meldet
 * `GridWorld` sie beim Bauen und überspringt sie — der Rückweg ist dann das
 * Handgelenkmenü.
 */

/** Der Asphalt und was darauf gemalt ist. */
const ASPHALT = 0x474c54;
const PAINT = 0xeae6da;
const LINE = 0xe8be3c;
/** Die Markisen: zwei Streifenfarben, abwechselnd mit Weiß. */
const AWNING = [0x2f6fb5, 0xc8402f] as const;
const AWNING_LIGHT = 0xf3efe4;
/** Der Sockel unter dem Kochtopf — rot, und ohne jede Funktion. */
const STOVE_RED = 0xc03a2b;

/** Wie hoch die Arbeitsplatte einer Küchenzeile liegt (`grid/blocks.ts`). */
const COUNTER_TOP = 0.9;
/** Wie weit die Zeile von der Kachelmitte zu ihrer Kante hin steht. */
const COUNTER_MID = TILE / 2 - PLAN_WALL_T / 2 - 0.31;
/** Ein Verkehrshut, ein Blumenkübel: wo er steht und wie weit neben der Mitte. */
interface Spot {
  col: number;
  row: number;
  dx?: number;
  dz?: number;
}

/** Vier Hüte am Rand der Fahrbahn — sie stehen im Weg, und das ist ihr Zweck. */
const CONES: readonly Spot[] = [
  { col: 9, row: 3, dx: 0.7 },
  { col: 14, row: 3, dx: -0.7 },
  { col: 9, row: 10, dx: 0.7 },
  { col: 14, row: 10, dx: -0.7 },
];

/** Blumenkübel an den Ecken des Platzes. */
const PLANTERS: readonly Spot[] = [
  { col: 2, row: 12 },
  { col: 5, row: 13 },
  { col: 18, row: 13 },
  { col: 21, row: 3 },
];

export class StreetWorld extends GridWorld {
  protected override layout(): GridPlan {
    return streetPlan();
  }

  protected override worldId(): string {
    return 'street';
  }

  protected override editorTitle(): string {
    return 'Straßenküche';
  }

  protected override spawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(centreX(SPAWN.col), 0, centreZ(SPAWN.row));
  }

  /** Blick nach Norden: die Kreuzung, der Zebrastreifen, beide Küchen. */
  protected override spawnYaw(): number {
    return 0;
  }

  protected override skyColor(): number {
    return 0x8fc0ec;
  }

  protected override lightIntensity(): number {
    return 1.2;
  }

  protected override welcome(): string {
    return 'Straßenküche · Kisten schieben, Hüte umwerfen · Menü → Ansicht schaltet von oben';
  }

  /**
   * **Rechts die Pistole und nicht die zweite Portalpistole.**
   *
   * Draußen hält kein Portal — portalfähig ist hier nur der Boden, und ein
   * Portal darin führt in den Boden daneben. Was diese Welt dagegen wirklich
   * braucht, ist der Abzug: Der Knopf an der Türwand lässt sich **anschießen**
   * (Portal-Regel, `grid/fixtures/button.ts`), und das ist von oben mit `B`
   * beziehungsweise dem Linksklick genau der Weg, für den die Steuerung
   * gemacht ist.
   */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [
      ['gun-dual', 'left'],
      ['pistol', 'right'],
    ];
  }

  /**
   * Heller Beton, warmes Holz, dunkelgrauer Asphalt — drei Töne, und die Welt
   * hat ihr Bild. Die Palette der Gitterwelten (`GRID_COLORS`) bleibt
   * darunter: verstellt wird, was diese Welt wirklich anders macht.
   */
  protected override tint(): Partial<Record<PlanSolidKind, number>> {
    return {
      floor: 0xd9d2c2,
      wall: 0xcdc5b4,
      stone: 0xbfb6a3,
      wood: 0xc08a4e,
      steel: 0xa9b1bd,
    };
  }

  protected override buildEnvironment(): void {
    super.buildEnvironment();
    this.root.add(createSky(0x63a8e8, 0xf6e3c2));

    const dressing = new THREE.Group();
    dressing.name = 'street-dressing';
    this.root.add(dressing);

    this.buildRoad(dressing);
    this.buildStalls(dressing);
    this.buildStoves(dressing);

    const sign = new TextPlane({
      width: 4.6,
      height: 1.2,
      title: 'Straßenküche',
      body: 'Türen, Knöpfe, Treppen — von oben. Menü → Ansicht wechselt den Blick.',
      accent: 0xe07a3c,
    });
    sign.position.set(centreX(SPAWN.col), 2.6, centreZ(SPAWN.row) + 4.5);
    sign.rotation.y = Math.PI;
    dressing.add(sign);
  }

  // --- die Straße -----------------------------------------------------------

  /**
   * **Fahrbahn, Zebrastreifen, Mittellinie** — drei flache Quader-Sorten und
   * keine einzige Bilddatei.
   *
   * Die Balken des Zebrastreifens liegen **längs zur Fahrtrichtung** und
   * wiederholen sich quer dazu. Das ist die Sorte Detail, die man nur falsch
   * herum bemerkt: Balken quer zur Fahrbahn sehen aus wie eine Leiter, und
   * eine Leiter auf der Straße ist keine Querung.
   */
  private buildRoad(parent: THREE.Object3D): void {
    const asphalt = new THREE.MeshStandardMaterial({ color: ASPHALT, roughness: 0.96 });
    const paint = new THREE.MeshStandardMaterial({ color: PAINT, roughness: 0.85 });
    const line = new THREE.MeshStandardMaterial({ color: LINE, roughness: 0.85 });

    const west = centreX(ROAD.col) - TILE / 2;
    const north = centreZ(ROAD.row) - TILE / 2;
    const width = ROAD.cols * TILE;
    const depth = ROAD.rows * TILE;
    parent.add(flat(asphalt, west + width / 2, 0.01, north + depth / 2, width, 0.02, depth));

    // Der Zebrastreifen: Balken von 55 cm, alle 100 cm einer.
    const bandNorth = centreZ(CROSSING.row) - TILE / 2;
    const bandDepth = CROSSING.rows * TILE - 0.5;
    const step = 1;
    const bars = Math.floor(width / step);
    const start = west + (width - (bars - 1) * step) / 2;
    for (let i = 0; i < bars; i++) {
      parent.add(
        flat(
          paint,
          start + i * step,
          0.03,
          bandNorth + bandDepth / 2 + 0.25,
          0.55,
          0.02,
          bandDepth,
        ),
      );
    }

    // Die gelbe Mittellinie, doppelt und gestrichelt — und sie hört vor dem
    // Zebrastreifen auf, statt quer darüber zu laufen.
    const dash = 1.4;
    const gap = 1.1;
    for (let z = north + 0.6; z < north + depth - dash; z += dash + gap) {
      const middle = z + dash / 2;
      if (middle > bandNorth - 0.6 && middle < bandNorth + bandDepth + 0.8) continue;
      for (const side of [-0.12, 0.12]) {
        parent.add(flat(line, west + width / 2 + side, 0.03, middle, 0.14, 0.02, dash));
      }
    }
  }

  // --- die Marktstände ------------------------------------------------------

  /**
   * **Ein Marktstand**: der Körper steht schon (eine Masse aus dem Plan), hier
   * kommen Pfosten, Markise und ein Brett dazu.
   *
   * Die Markise ist das, was das Referenzbild ausmacht — **gestreift**, und
   * zwar aus Latten: eine Reihe Quader, abwechselnd farbig und weiß, leicht
   * nach vorn geneigt. Zwei Farben reichen für den ganzen Markt, blau-weiß und
   * rot-weiß, und welcher Stand welche bekommt, entscheidet seine Nummer.
   */
  private buildStalls(parent: THREE.Object3D): void {
    const post = new THREE.MeshStandardMaterial({ color: 0x8b6236, roughness: 0.85 });
    const light = new THREE.MeshStandardMaterial({ color: AWNING_LIGHT, roughness: 0.8 });
    const tones = AWNING.map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));

    STALLS.forEach((stall, index) => {
      const alongX = stall.along === 'x';
      const run = stall.count * TILE;
      const x = centreX(stall.col) + (alongX ? ((stall.count - 1) * TILE) / 2 : 0);
      const z = centreZ(stall.row) + (alongX ? 0 : ((stall.count - 1) * TILE) / 2);
      // Nach vorn heißt: weg von der Kante, an der die Rückwand steht.
      const front: [number, number] = [-dirX(stall.dir), -dirZ(stall.dir)];

      const group = new THREE.Group();
      group.name = `stall-${index}`;
      group.position.set(x, 0, z);
      parent.add(group);

      // Vier Pfosten in den Ecken, auf dem Körper aus dem Plan.
      const half = run / 2 - 0.2;
      const side = TILE / 2 - 0.25;
      for (const along of [-half, half]) {
        for (const across of [-side, side]) {
          const px = alongX ? along : across;
          const pz = alongX ? across : along;
          const pole = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.35, 0.09), post);
          pole.position.set(px, 1.175, pz);
          group.add(pole);
        }
      }

      // Das Brett über den Pfosten — es hält die Markise und ist ihr Schatten.
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(alongX ? run : 0.12, 0.14, alongX ? 0.12 : run),
        post,
      );
      board.position.set(front[0] * side, 2.3, front[1] * side);
      group.add(board);

      /**
       * **Die Markise**: Latten längs des Standes, abwechselnd farbig und
       * weiß, das Ganze nach vorn geneigt.
       *
       * Die Neigung ist die Zeile, bei der man das Vorzeichen zweimal
       * nachrechnet: Eine Drehung um X schiebt das **südliche** Ende nach
       * unten, eine um Z das **westliche** — und eine Markise, die nach hinten
       * abfällt, sieht aus wie ein Fehler und nicht wie ein Markt.
       */
      const canopyDepth = TILE * 0.9 + 0.9;
      const stripes = Math.max(2, Math.round(run / 0.5));
      const tone = tones[index % tones.length]!;
      const canopy = new THREE.Group();
      canopy.position.set(front[0] * 0.45, 2.46, front[1] * 0.45);
      canopy.rotation.set(alongX ? front[1] * 0.3 : 0, 0, alongX ? 0 : -front[0] * 0.3, 'XYZ');
      group.add(canopy);
      for (let i = 0; i < stripes; i++) {
        const width = run / stripes;
        const offset = -run / 2 + width * (i + 0.5);
        const lath = new THREE.Mesh(
          new THREE.BoxGeometry(alongX ? width : canopyDepth, 0.06, alongX ? canopyDepth : width),
          i % 2 === 0 ? tone : light,
        );
        lath.position.set(alongX ? offset : 0, 0, alongX ? 0 : offset);
        canopy.add(lath);
      }
    });
  }

  // --- die Herdplatten ------------------------------------------------------

  /** Roter Sockel, Topf darauf, und sonst tut er nichts — so steht es im Plan. */
  private buildStoves(parent: THREE.Object3D): void {
    const base = new THREE.MeshStandardMaterial({ color: STOVE_RED, roughness: 0.7 });
    const steel = new THREE.MeshStandardMaterial({
      color: 0x9aa6bd,
      roughness: 0.35,
      metalness: 0.6,
    });
    for (const cell of STOVES) {
      const run = counterAt(cell.col, cell.row);
      const dir: Dir = run?.dir ?? 0;
      const x = centreX(cell.col) + dirX(dir) * COUNTER_MID;
      const z = centreZ(cell.row) + dirZ(dir) * COUNTER_MID;

      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.12, 0.5), base);
      plinth.position.set(x, COUNTER_TOP + 0.06, z);
      parent.add(plinth);

      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.19, 0.24, 18), steel);
      pot.position.set(x, COUNTER_TOP + 0.24, z);
      parent.add(pot);

      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 18), steel);
      lid.position.set(x, COUNTER_TOP + 0.37, z);
      parent.add(lid);
    }
  }

  // --- was herumsteht und sich schieben lässt --------------------------------

  /**
   * **Kisten, Hüte und Kübel** — die drei Sachen, die hier einen Körper haben.
   *
   * Sie sind Gegenstände und keine Bausteine, und das ist genau der
   * Unterschied, um den es geht: Was man schieben können soll, gehört in die
   * Physik und nicht in die Karte (`grid/blocks.ts` sagt das beim Baustein
   * *Kisten* ausdrücklich). Angemeldet werden sie mit `registerProp`, und
   * damit stellt sie *Welt zurücksetzen* wieder an ihren Platz.
   */
  protected override buildProps(): void {
    const physics = this.physics;
    if (!physics) return;

    const wood = new THREE.MeshStandardMaterial({ color: 0xb07a3f, roughness: 0.85 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x8a5c2c, roughness: 0.85 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xff7a2f, roughness: 0.6 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf2efe4, roughness: 0.6 });
    const clay = new THREE.MeshStandardMaterial({ color: 0xb2624a, roughness: 0.9 });
    const leaf = new THREE.MeshStandardMaterial({ color: 0x4f9b52, roughness: 0.9 });

    CRATES.forEach((cell, index) => {
      const crate = new THREE.Group();
      const size = 0.66;
      const box = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), wood);
      crate.add(box);
      // Zwei Leisten über Eck: Ohne sie ist eine Kiste ein brauner Würfel.
      for (const axis of ['x', 'z'] as const) {
        const band = new THREE.Mesh(
          new THREE.BoxGeometry(
            axis === 'x' ? size + 0.02 : 0.08,
            0.08,
            axis === 'x' ? 0.08 : size + 0.02,
          ),
          trim,
        );
        band.position.y = size / 2 - 0.09;
        crate.add(band);
      }
      crate.name = `street-crate-${index}`;
      crate.position.set(centreX(cell.col), size / 2 + 0.02, centreZ(cell.row));
      crate.rotation.y = index * 0.4;
      this.root.add(crate);
      this.registerProp(
        physics.addDynamic(crate, {
          shape: { kind: 'box' },
          halfExtents: new THREE.Vector3(size / 2, size / 2, size / 2),
          mass: 16,
          friction: 0.9,
          restitution: 0.02,
        }),
        `street-crate-${index}`,
      );
    });

    CONES.forEach((spot, index) => {
      const cone = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.62, 16), orange);
      body.position.y = 0.33;
      cone.add(body);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.09, 16), white);
      ring.position.y = 0.33;
      cone.add(ring);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), orange);
      foot.position.y = 0.02;
      cone.add(foot);
      cone.name = `street-cone-${index}`;
      cone.position.set(
        centreX(spot.col) + (spot.dx ?? 0),
        0.02,
        centreZ(spot.row) + (spot.dz ?? 0),
      );
      this.root.add(cone);
      this.registerProp(
        physics.addDynamic(cone, {
          shape: { kind: 'box' },
          halfExtents: new THREE.Vector3(0.21, 0.32, 0.21),
          mass: 2.2,
          friction: 0.8,
          restitution: 0.1,
        }),
        `street-cone-${index}`,
      );
    });

    PLANTERS.forEach((spot, index) => {
      const planter = new THREE.Group();
      const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.5, 14), clay);
      tub.position.y = 0.25;
      planter.add(tub);
      for (const [dx, dy, dz, r] of [
        [0, 0.62, 0, 0.26],
        [0.18, 0.54, 0.12, 0.18],
        [-0.16, 0.56, -0.1, 0.17],
      ] as const) {
        const bush = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), leaf);
        bush.position.set(dx, dy, dz);
        planter.add(bush);
      }
      planter.name = `street-planter-${index}`;
      planter.position.set(
        centreX(spot.col) + (spot.dx ?? 0),
        0.02,
        centreZ(spot.row) + (spot.dz ?? 0),
      );
      this.root.add(planter);
      this.registerProp(
        physics.addDynamic(planter, {
          shape: { kind: 'box' },
          halfExtents: new THREE.Vector3(0.34, 0.45, 0.34),
          // Schwer genug, dass er nicht wegrutscht, wenn man daneben steht —
          // und leicht genug, dass eine Kiste ihn verschiebt.
          mass: 48,
          friction: 0.95,
          restitution: 0.02,
        }),
        `street-planter-${index}`,
      );
    });
  }
}

/** Ein flacher Quader auf dem Boden — Asphalt, Balken, Strich. */
function flat(
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}
