import * as THREE from 'three';
import type { GridPlan } from '../../grid/gridPlan';
import { DIR_E, DIR_N, DIR_S } from '../../nav/navTile';
import { faceHit } from '../../range/scoring';
import { bullseyeFace } from '../../shared/target';
import { TextPlane } from '../../../ui/TextPlane';
import { playTone } from '../../../core/Audio';
import type { WorldContext } from '../../../core/types';
import type { PhysicsBody } from '../../../physics/PhysicsWorld';
import { RANGE, centre } from '../layout';
import type { TestZone, ZoneHost } from './zone';

/**
 * **Der Schießstand** — Osten, **ohne Dach**.
 *
 * Eine Schießlinie mit einer Bank darauf, Scheiben auf 5, 10 und 20 m, zwei
 * Stahlplatten dazwischen und ein Kugelfang als Masse dahinter. Jeder Treffer
 * wird gezählt (`range/scoring.ts`): eine Scheibe nach dem Ring, in dem die
 * Kugel landet (10 bis 2, dieselben fünf Ringe, die auf ihr gemalt sind), eine
 * Stahlplatte flach.
 *
 * **Fünf, zehn und zwanzig Meter, nicht zehn, fünfundzwanzig und hundert.** Der
 * alte Stand war ein Feld von 125 m Tiefe; in einer Welt mit neun Zonen ist
 * das der ganze Osten und dazu die halbe Kartbahn. Zwanzig Meter reichen für
 * die Frage, um die es hier geht — ob eine Einstellung an der Pistole etwas am
 * Schuss ändert.
 *
 * **Kein Dach**, wie nirgends in dieser Welt: Von oben wäre der Schütze unter
 * einem Brett, und genau ihn will man sehen. Was bleibt, ist die Bank — und
 * die ist das, was sie in Wirklichkeit ist: eine **Küchenzeile**. Dasselbe
 * Möbel, dieselbe Arbeitshöhe, derselbe geprüfte Baustein.
 *
 * **Der Punktestand steht auf einer Tafel neben der Linie** und nicht über der
 * Scheibe: Auf zwanzig Meter liest die niemand. Der Ton dazu klingt am Ohr des
 * Schützen — ein Klang aus der Ferne käme zu spät und wäre kaum zu hören.
 */

/** Die Kachelspalte, an deren Ostkante die Bank steht — dort ist die Linie. */
export const BENCH_X = RANGE.x + RANGE.w - 1;
/** Die Schießlinie in Metern: die Ostkante der Bankkachel. */
export const FIRING_LINE = BENCH_X + 1;
/** Die drei Bahnen, je eine Kachel breit. */
export const LANES: readonly number[] = [-1, 0, 1];

/** Wie weit die Scheiben stehen, in Metern hinter der Linie. */
export const TARGET_ROWS: readonly number[] = [5, 10, 20];
/** Und wie weit die beiden Stahlplatten. */
export const PLATE_ROW = 8;

/** Der Kugelfang: eine Masse, und hoch genug, dass nichts darüber hinausgeht. */
export const BERM = { x: FIRING_LINE + 21, z: -6, w: 2, d: 13 } as const;
const BERM_H = 6;

/** Wie hoch eine Scheibe hängt und wie groß sie ist. */
const POST_HEIGHT = 1.9;
const TARGET_R = 0.3;
/** Wie weit vor ihrem Pfosten sie hängt — zwei Körper am selben Ort zanken. */
const STANDOFF = 0.14;

/**
 * **Wo eine Scheibe steht** — die Entfernung liegt in X, die Bahn in Z.
 *
 * Geschossen wird nach **Osten**, und das wissen hier alle: die Marken am
 * Nordrand, der Kugelfang, die um Z gekippte Scheibe, das Gelenk um die
 * Z-Achse. Nur die vier Bauer von Pfosten, Scheibe, Schiene und Platte
 * schrieben eine Zeit lang die Bahn nach X und die Entfernung nach Z — und
 * die Scheiben standen fünf bis zwanzig Meter **nördlich** der Bahnen, quer
 * zum Stand, während die Marken daneben die richtige Strecke abmaßen. Eine
 * Rechnung an einer Stelle statt vier Zeilen mit je einem Vorzeichen, das man
 * falsch schreiben kann; der Test daneben hält sie vor die Linie.
 */
export function targetSpot(lane: number, distance: number): { x: number; z: number } {
  return { x: FIRING_LINE + distance, z: centre(lane) };
}

export function stampRange(plan: GridPlan): void {
  // Die Seitenwände der Linie: Nach Osten bleibt offen, dorthin wird
  // geschossen, und nach Westen kommt der Gang von der Mitte herein.
  plan.run(RANGE.x, RANGE.z, RANGE.w, 'x', (x) => {
    plan.wall(x, RANGE.z, DIR_N);
    plan.wall(x, RANGE.z + RANGE.d - 1, DIR_S);
  });

  /**
   * **Die Schießbank ist eine Küchenzeile** — Arbeitshöhe, Platte, Nische für
   * die Füße, genau das, wovor man mit einer Pistole steht. Sie liegt nur auf
   * den drei Bahnen; die Randkacheln bleiben frei, sonst käme niemand an der
   * Linie vorbei nach vorn.
   */
  for (const lane of LANES) plan.put('counter', BENCH_X, lane, DIR_E);
  // Die Trennwände zwischen den Bahnen: brusthoch, damit der Stand offen
  // bleibt. Nur zwischen den Bahnen, nicht an ihren Außenseiten.
  for (const lane of LANES.slice(0, -1)) plan.put('parapet', BENCH_X, lane, DIR_S);

  // Eine Bank und ein Regal an der Nordwand: das, was auf einem Stand
  // herumsteht, und dieselben Bausteine wie überall sonst.
  plan.put('bench', RANGE.x + 1, RANGE.z, DIR_N);
  plan.put('shelf', RANGE.x + 2, RANGE.z, DIR_N);

  /**
   * **Der Kugelfang** ist eine Masse und keine Kachelreihe: Er hat keine
   * Kachelform im Sinne von „darauf steht man", er ist ein Wall. Sechs Meter
   * hoch — was darüber hinausfliegt, hat die Scheibe ohnehin um Meter verpasst.
   */
  plan.mass('stone', { ...BERM }, 0, BERM_H);
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
export function fitRange(plan: GridPlan): void {
  plan.putFixture({
    id: 'schild-schiessstand',
    kind: 'sign',
    x: RANGE.x + 1,
    z: RANGE.z + RANGE.d - 1,
    dir: DIR_S,
    props: { text: 'Scheiben auf 5, 10 und 20 m — Pistole am Gürtel, Punkte auf der Tafel' },
  });
}

// --- was zählt --------------------------------------------------------------

/** Eine Scheibe, auf die gezählt wird, und wie weit sie draußen steht. */
interface ScoreTarget {
  entry: PhysicsBody;
  /** Halbmesser einer Scheibe, oder halbe Kantenlänge einer Platte. */
  radius: number;
  /** Meter hinter der Linie — für die Zeile auf der Tafel. */
  distance: number;
  /** Eine Stahlplatte zählt flach, eine Scheibe nach ihren Ringen. */
  plate: boolean;
}

const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _inverse = new THREE.Matrix4();

/**
 * **Die Scheiben, die Platten und die Wertung.**
 *
 * Gezählt wird gegen die **Strecke** einer Kugel seit dem letzten Bild und
 * nicht gegen ihren Ort: Bei 120 m/s legt sie zwischen zwei Bildern zwei Meter
 * zurück, und eine Scheibe, durch die sie mitten im Bild hindurchgeflogen ist,
 * wäre sonst nie getroffen worden (`range/scoring.faceHit`, samt dem
 * Vorhalt, den die Physik ihr vorher wegnimmt).
 */
export class RangeZone implements TestZone {
  private readonly targets: ScoreTarget[] = [];
  private readonly owned: THREE.Material[] = [];
  private readonly shapes: THREE.BufferGeometry[] = [];
  private board: TextPlane | null = null;
  private readonly marks: TextPlane[] = [];
  private host: ZoneHost | null = null;

  /** Punkte dieser Sitzung, Treffer und der beste Einzelschuss. */
  private score = 0;
  private hits = 0;
  private best = 0;

  private steel: THREE.MeshStandardMaterial | null = null;
  private targetFace: THREE.MeshStandardMaterial | null = null;

  build(_ctx: WorldContext, world: ZoneHost): void {
    this.host = world;
    this.steel = this.own(
      new THREE.MeshStandardMaterial({ color: 0x99a1b2, roughness: 0.55, metalness: 0.35 }),
    );

    let index = 0;
    for (const distance of TARGET_ROWS) {
      for (const lane of LANES) {
        this.hangTarget(world, lane, distance, `test-scheibe-${index++}`);
      }
    }

    // Zwei Stahlplatten auf halber Strecke: klein, schwer, und sie fallen
    // richtig um.
    for (const lane of [-1, 1]) {
      this.buildRail(world, targetSpot(lane, PLATE_ROW));
      this.spawnPlate(world, targetSpot(lane, PLATE_ROW), PLATE_ROW, `test-platte-${index++}`);
    }

    this.buildMarks(world);
    this.buildBoard(world);
  }

  /**
   * **Ein Schuss gegen alles, was Punkte wert ist.**
   *
   * `TestWorld.bulletTravelled` fragt hier zuerst und gibt danach an die Welt
   * weiter: Was keine Scheibe trifft, kann immer noch einen NPC treffen.
   *
   * @returns ob die Kugel hier aufgebraucht ist
   */
  bulletTravelled(from: THREE.Vector3, to: THREE.Vector3): boolean {
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const target = this.targets[i]!;
      // Jemand hat sie weggeräumt. Ein Loch in der Luft ist keine Punkte wert.
      if (!target.entry.object.parent) {
        this.targets.splice(i, 1);
        continue;
      }
      const points = this.hitPoints(target, from, to);
      if (points === null) continue;
      this.count(points, target.distance);
      return true;
    }
    return false;
  }

  /** `B`/`Y` setzt die Wertung zurück — die Scheiben stellt die Basis. */
  reset(): void {
    this.score = 0;
    this.hits = 0;
    this.best = 0;
    this.drawBoard();
  }

  dispose(): void {
    this.targets.length = 0;
    this.board?.dispose();
    this.board = null;
    for (const mark of this.marks) mark.dispose();
    this.marks.length = 0;
    for (const material of this.owned) material.dispose();
    this.owned.length = 0;
    for (const shape of this.shapes) shape.dispose();
    this.shapes.length = 0;
    this.steel = null;
    this.targetFace = null;
    this.host = null;
  }

  // --- zählen ---------------------------------------------------------------

  /**
   * Die Strecke in den eigenen Koordinaten der Scheibe, und was dort
   * herauskommt.
   *
   * Die Scheiben sind nie skaliert oder verzerrt, also ist `matrixWorld`
   * invertiert eine Drehung und eine Verschiebung und sonst nichts — ein Meter
   * bleibt ein Meter, und der Vorhalt in `faceHit` heißt dort dasselbe wie
   * hier. **Einmal** invertiert für beide Enden: `worldToLocal` täte es je
   * Scheibe zweimal, und jede Kugel in der Luft fragt jede Scheibe in jedem
   * Bild.
   */
  private hitPoints(target: ScoreTarget, from: THREE.Vector3, to: THREE.Vector3): number | null {
    const object = target.entry.object;
    object.updateWorldMatrix(true, false);
    _inverse.copy(object.matrixWorld).invert();
    _from.copy(from).applyMatrix4(_inverse);
    _to.copy(to).applyMatrix4(_inverse);
    return faceHit(_from, _to, target)?.points ?? null;
  }

  /** Ein Treffer: die Zahl auf die Tafel, der Ton ins Ohr. */
  private count(points: number, distance: number): void {
    this.score += points;
    this.hits++;
    this.best = Math.max(this.best, points);
    // Je besser der Treffer, desto höher klingt er.
    const base = 420 + points * 46;
    playTone({ type: 'sine', from: base, to: base * 1.5, duration: 0.14, gain: 0.06 });
    this.host?.announce(`+${points} · ${Math.round(distance)} m`);
    this.drawBoard();
  }

  // --- das Bild -------------------------------------------------------------

  /**
   * **Eine Scheibe an einem Scharnier.**
   *
   * Eine Scheibe auf einem Pfosten zu balancieren sieht genau so lange richtig
   * aus, wie die Physik braucht, um sie zu bemerken — also hängt sie davor, an
   * einem Scharnier quer zum Feld. Ein Treffer schwingt sie zurück, und sie
   * kommt wieder herunter: Das liest sich noch auf zwanzig Meter und kann nicht
   * damit enden, dass jede Scheibe im Gras liegt.
   */
  private hangTarget(world: ZoneHost, lane: number, distance: number, id: string): void {
    const spot = targetSpot(lane, distance);
    const post = this.buildPost(world, spot, POST_HEIGHT);
    // Die Scheibe hängt **vor** dem Pfosten, also westlich, dem Schützen zu.
    const entry = this.spawnTarget(world, spot.x - STANDOFF, POST_HEIGHT - TARGET_R, spot.z, id);

    const physics = world.physics;
    const rapier = physics.rapier;
    // Der Drehpunkt ist die Oberkante der Scheibe auf der Spitze des Pfostens —
    // derselbe Weltpunkt, in den Koordinaten jedes der beiden Körper
    // aufgeschrieben. Die Scheibe liegt um 90° nach vorn gekippt, ihr eigenes
    // „oben" ist also −Z. Gedreht wird um die Z-Achse der Welt, weil hier nach
    // **Osten** geschossen wird und nicht nach Norden.
    const data = rapier.JointData.revoluteWithAxes(
      { x: -STANDOFF, y: POST_HEIGHT / 2, z: 0 },
      { x: -TARGET_R, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: 1 },
    );
    physics.world.createImpulseJoint(data, post.body, entry.body, true);
    this.targets.push({ entry, radius: TARGET_R, distance, plate: false });
  }

  /** Der Pfosten, an dem eine Scheibe hängt. */
  private buildPost(world: ZoneHost, spot: { x: number; z: number }, height: number): PhysicsBody {
    const post = new THREE.Mesh(this.shape(new THREE.BoxGeometry(0.1, height, 0.1)), this.steel!);
    post.position.set(spot.x, height / 2, spot.z);
    world.root.add(post);
    post.updateWorldMatrix(true, false);
    return world.addSolid(post);
  }

  /**
   * Eine Scheibe als **Gegenstand**: Man kann sie abschießen, aufheben,
   * wegtragen und wieder hinstellen — und `B`/`Y` stellt sie zurück.
   */
  private spawnTarget(world: ZoneHost, x: number, y: number, z: number, id: string): PhysicsBody {
    const thickness = 0.06;
    const disc = new THREE.Mesh(
      this.shape(new THREE.CylinderGeometry(TARGET_R, TARGET_R, thickness, 24)),
      [this.steel!, this.face(), this.steel!],
    );
    // Ein Zylinder steht auf +Y; um eine Vierteldrehung um Z gelegt schaut
    // seine Fläche nach Osten — und damit ist ihr eigenes „oben" das westliche
    // −X, worauf beide Gelenkpunkte oben gerechnet sind.
    disc.rotation.z = -Math.PI / 2;
    disc.position.set(x, y, z);
    world.root.add(disc);
    disc.updateWorldMatrix(true, false);

    const entry = world.physics.addDynamic(disc, {
      shape: { kind: 'cylinder' },
      halfExtents: new THREE.Vector3(TARGET_R, thickness / 2, TARGET_R),
      mass: TARGET_R * 6,
      friction: 0.7,
      restitution: 0.1,
      angularDamping: 0.4,
    });
    return world.addProp(entry, id);
  }

  /** Die Schiene, auf der eine Stahlplatte steht. */
  private buildRail(world: ZoneHost, spot: { x: number; z: number }): void {
    const rail = new THREE.Mesh(this.shape(new THREE.BoxGeometry(0.1, 0.7, 0.6)), this.steel!);
    rail.position.set(spot.x, 0.35, spot.z);
    world.root.add(rail);
    rail.updateWorldMatrix(true, false);
    world.addSolid(rail);
  }

  /** Eine Stahlplatte: schwerer, und sie geht mit einem ehrlichen Klong um. */
  private spawnPlate(
    world: ZoneHost,
    spot: { x: number; z: number },
    distance: number,
    id: string,
  ): void {
    const skin = this.own(
      new THREE.MeshStandardMaterial({ color: 0xd9dee8, roughness: 0.5, metalness: 0.3 }),
    );
    // **Die Fläche einer Platte liegt in ihrem eigenen `z = 0`** — so rechnet
    // `faceHit` sie. Gebaut wird sie deshalb flach in Z und danach gedreht,
    // bis ihr eigenes Vorn nach Osten schaut.
    const plate = new THREE.Mesh(this.shape(new THREE.BoxGeometry(0.44, 0.44, 0.05)), skin);
    plate.rotation.y = Math.PI / 2;
    plate.position.set(spot.x, 0.93, spot.z);
    world.root.add(plate);
    plate.updateWorldMatrix(true, false);

    const entry = world.physics.addDynamic(plate, {
      mass: 4,
      friction: 0.8,
      restitution: 0.05,
    });
    world.addProp(entry, id);
    this.targets.push({ entry, radius: 0.22, distance, plate: true });
  }

  /** Die Entfernungsmarken am Nordrand, lesbar von der Linie aus. */
  private buildMarks(world: ZoneHost): void {
    for (const distance of TARGET_ROWS) {
      const mark = new TextPlane({
        width: 1.4,
        height: 0.5,
        title: `${distance} m`,
        accent: 0x4aa8ff,
      });
      mark.position.set(FIRING_LINE + distance, 1.5, centre(RANGE.z - 1));
      mark.rotation.y = Math.PI / 2;
      world.root.add(mark);
      this.marks.push(mark);

      const post = new THREE.Mesh(this.shape(new THREE.BoxGeometry(0.07, 1.5, 0.07)), this.steel!);
      post.position.set(FIRING_LINE + distance, 0.75, centre(RANGE.z - 1));
      world.root.add(post);
    }
  }

  /** Die Punktetafel neben der Linie. */
  private buildBoard(world: ZoneHost): void {
    const board = new TextPlane({
      width: 2.2,
      height: 0.8,
      title: 'Wertung',
      accent: 0xffc857,
    });
    board.position.set(centre(RANGE.x + 4), 2.1, centre(RANGE.z + RANGE.d));
    board.rotation.y = Math.PI;
    world.root.add(board);
    this.board = board;
    this.drawBoard();
  }

  private drawBoard(): void {
    this.board?.setText(
      this.hits === 0 ? 'Noch kein Treffer' : `${this.score} Punkte`,
      this.hits === 0
        ? 'Scheiben auf 5, 10 und 20 m'
        : `${this.hits} Treffer · bester ${this.best} · Schnitt ${(this.score / this.hits).toFixed(1)}`,
    );
  }

  /** Das gemalte Blatt einer Scheibe, einmal gezeichnet und von allen geteilt. */
  private face(): THREE.MeshStandardMaterial {
    if (!this.targetFace) this.targetFace = this.own(bullseyeFace());
    return this.targetFace;
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
