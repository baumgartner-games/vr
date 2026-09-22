import * as THREE from 'three';
import type { GridPlan } from '../../grid/gridPlan';
import { DIR_E, DIR_N, DIR_S } from '../../nav/navTile';
import { faceHit } from '../../range/scoring';
import { pieceBurst } from '../../range/shatter';
import { bullseyeFace } from '../../shared/target';
import { TextPlane } from '../../../ui/TextPlane';
import { canLoadModels } from '../../../core/chefFit';
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
 *
 * ## Ständer, Scheibe und sechs Stücke
 *
 * Was draußen steht, kommt aus dem Regal (`core/kaykitModel.ts`): ein
 * Ständer, eine Scheibe daran — und beim Volltreffer **sechs Tortenstücke**,
 * die zusammen genau die Scheibe waren und auseinanderfliegen. Die Stange und
 * die gemalte Zielscheibe, die vorher hier standen, sind damit weg; sie
 * bleiben nur so lange stehen, wie die Dateien unterwegs sind, und in einem
 * Checkout ohne die gekauften Pakete für immer.
 *
 * **Gerechnet wird dabei weiter mit dem Gebauten.** Der Stand entsteht
 * synchron, die Modelle kommen über die Leitung: Gelenkpunkte, Masse und
 * Wertung können nicht auf eine Datei warten, die vielleicht nie ankommt. Das
 * Modell ersetzt deshalb nur das **Netz** und nie den Körper — die Scheibe
 * bleibt der Zylinder am Scharnier, den `faceHit` seit jeher in seinen eigenen
 * Koordinaten ausrechnet, und das Regalstück hängt als Kind daran. Was sich
 * nach dem Modell richtet, sind die Maße oben, und die stehen samt ihrer
 * Messung dabei.
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

/**
 * **Die drei Modelle des Stands** — der Ständer, die Scheibe und ihre sechs
 * Stücke, alle aus `prototype-bits`.
 *
 * Nachgemessen in den Dateien selbst und in den Einheiten des Pakets, das
 * hier auf **0,7** steht und nicht auf der halbierten Vorgabe
 * (`core/kaykitFit.KAYKIT_PACK_SCALE`, dort begründet — dasselbe Paket bringt
 * eine Figur von 2,40 mit):
 *
 * - `target.glb`: ein Knoten, 1,000 × 1,000 × 0,200 → **0,70 m Durchmesser,
 *   0,14 m dick**. Die Scheibe liegt in ihrer eigenen XY-Ebene; die
 *   **bemalte** Seite ist die bei z = 0,200 (151 Ecken mit den Ringen darauf,
 *   gegenüber 60 auf der glatten Rückseite bei z = 0) — ihre Vorderseite
 *   schaut also in ihrem eigenen **+Z**.
 * - `target_stand_A.glb`: ein Knoten, 1,000 × 2,000 × 1,500, Unterkante bei
 *   y = 0 → **0,70 × 1,40 × 1,05 m**. Ein Brett von y 0,2 bis 1,2 vorn (z
 *   0,00 bis 0,15), Streben und Füße dahinter bis z = −1,10, darüber ein
 *   Rahmen bis y = 2,00. Auch er schaut in seinem eigenen +Z nach vorn.
 * - `target_pieces_A.glb` … `_F.glb`: sechs Tortenstücke, jedes schon an
 *   seinem Platz um denselben Ursprung und jedes 0,200 dick. An einer Stelle
 *   übereinandergelegt ergeben sie wieder genau die Scheibe — und das ist die
 *   ganze Rechnung hinter dem Zerspringen.
 *
 * **Gemessen wird trotzdem am geladenen Modell** und nicht an diesen Zeilen
 * (`THREE.Box3().setFromObject`, siehe `dress` und `spawnPiece`): Die Zahlen
 * hier sagen, *warum* die Maße unten stehen, wie sie stehen; verlassen tut
 * sich auf sie nichts. Dieselbe Trennung wie bei der Druckplatte
 * (`grid/fixtures/plate.ts`) und aus demselben Grund — eine abgeschriebene
 * Zahl ist die, die nach dem nächsten Paket-Update stehen bleibt.
 */
const STAND_MODEL = 'prototype-bits/target_stand_A.glb';
const TARGET_MODEL = 'prototype-bits/target.glb';
const PIECE_MODELS: readonly string[] = ['A', 'B', 'C', 'D', 'E', 'F'].map(
  (piece) => `prototype-bits/target_pieces_${piece}.glb`,
);

/**
 * **Wie hoch eine Scheibe hängt, und wie groß sie ist.**
 *
 * Beide Zahlen sind die des Ständers und der Scheibe aus dem Regal, und sie
 * stehen hier, weil die **gebauten** Formen sie brauchen: Der Stand wird
 * gebaut, solange die Datei noch über die Leitung kommt — und in einem
 * Checkout ohne die gekauften Pakete für immer. Gelenkpunkte, Masse und
 * Wertung hängen daran und können nicht auf ein Modell warten, das vielleicht
 * nie ankommt.
 *
 * **1,40 statt der früheren 1,90.** Der Pfosten war eine gerechnete Stange und
 * durfte sein, was man wollte; `target_stand_A` ist 2,000 Quelleinheiten hoch
 * und damit 1,40 m. Eine Scheibe, die weiter auf 1,55 m hinge, schwebte eine
 * Handbreit über ihrem eigenen Ständer — und zwar sichtbar, denn das Modell
 * hört oben auf. Die Rechnung darunter bleibt dieselbe wie vorher
 * (`STAND_HEIGHT - TARGET_R`): Der Drehpunkt sitzt auf der Oberkante des
 * Ständers, die Scheibe hängt mit ihrem oberen Rand daran. Sie landet damit
 * auf 1,05 m, also genau in der oberen Hälfte des Ständers — dort, wo der
 * Rahmen des Modells sie hält.
 */
const STAND_HEIGHT = 1.4;
const TARGET_R = 0.35;
/** Und wie dick — die 0,200 Quelleinheiten des Modells. */
const TARGET_T = 0.14;
/** Was sie wiegt: dieselbe Rechnung wie immer, am neuen Halbmesser. */
const TARGET_MASS = TARGET_R * 6;
/**
 * **Wie weit vor ihrem Ständer sie hängt** — zwei Körper am selben Ort zanken.
 *
 * 0,20 statt der früheren 0,14, und dieses Mal entscheidet nicht die Physik,
 * sondern das Bild: Das Brett des Ständers steht 0,15 Quelleinheiten weit
 * vorn, also 0,105 m, und eine Scheibe von 0,14 m Dicke reicht mit ihrer
 * Rückseite halb so weit zurück. Bei 0,14 Abstand steckte ihr unterer Rand im
 * Brett — bei 0,20 bleiben zweieinhalb Zentimeter Luft dazwischen.
 */
const STANDOFF = 0.2;

/**
 * **Ab wie vielen Ringen eine Scheibe zerspringt** — die Zehn und sonst
 * nichts.
 *
 * Das ist keine Vorsicht, sondern das ganze Spiel an dieser Stelle. Es
 * stehen **neun** Scheiben draußen, und ein Magazin ist schneller leer als
 * man denkt: Zersprängen sie beim ersten Streifschuss, wäre der Stand nach
 * zehn Sekunden ein Feld aus leeren Ständern, und wer danach kommt, findet
 * nichts mehr zum Schießen. Die Zehn dagegen ist auf zwanzig Meter eine
 * Ansage — sie passiert selten genug, dass man sie merkt, und oft genug, dass
 * man sie sucht.
 *
 * Eine Zahl und kein `true`/`false`, damit die andere Meinung eine Zeile
 * kostet und keinen Umbau: `2` zerlegt bei jedem Treffer, `11` bei keinem.
 */
const SHATTER_POINTS = 10;

/**
 * **Geschossen wird nach Osten** — und dorthin fliegt auch, was zerspringt
 * (`range/shatter.pieceBurst`).
 */
const EAST = { x: 1, y: 0, z: 0 } as const;

/**
 * **Die Ruhelage einer Scheibe**: ein Zylinder, um eine Vierteldrehung um Z
 * gelegt, damit seine Fläche nach Osten schaut.
 *
 * Aufgeschrieben als Drehung und nicht mehr als `rotation.z`, weil sie
 * inzwischen zwei Leser hat: die Scheibe selbst und das Modell, das an ihr
 * hängt und seine eigene Drehung daraus rechnet.
 */
const DISC_TILT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);

/**
 * **Nach Westen schauen** — dem Schützen zu, für alles, was aus dem Regal
 * kommt.
 *
 * Ständer wie Scheibe haben ihre Vorderseite in ihrem eigenen **+Z** (siehe
 * oben, nachgezählt an den Ecken); eine Vierteldrehung um Y legt dieses +Z
 * auf das westliche −X.
 */
const FACING_WEST = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0),
  -Math.PI / 2,
);

/**
 * **Und was das Scheibenmodell an der gekippten Scheibe für eine Drehung
 * braucht.**
 *
 * Es hängt an einem Körper, der selbst schon um 90° liegt, und es soll
 * trotzdem in der **Welt** nach Westen schauen. Also wird die Weltdrehung
 * hingeschrieben und die des Elternknotens herausgerechnet — einmal hier und
 * nicht neunmal mit einem Vorzeichen, das man falsch schreiben kann.
 *
 * Gerechnet wird mit der **Ruhelage** und nicht mit dem, was die Scheibe
 * gerade tut: Bis die Datei ankommt, kann sie längst an ihrem Gelenk
 * schwingen, und die Drehung eines Kindes gilt gegenüber seinem Vater und
 * nicht gegenüber der Welt.
 */
const MODEL_TILT = DISC_TILT.clone().invert().multiply(FACING_WEST);

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
  /** Ihre Kennung in der Welt — die Stücke leiten ihre davon ab. */
  id: string;
  /** Halbmesser einer Scheibe, oder halbe Kantenlänge einer Platte. */
  radius: number;
  /** Meter hinter der Linie — für die Zeile auf der Tafel. */
  distance: number;
  /** Eine Stahlplatte zählt flach, eine Scheibe nach ihren Ringen. */
  plate: boolean;
  /**
   * **Der Knoten, an dem das Modell der Scheibe hängt** — und damit die
   * Stelle, an der beim Zerspringen die sechs Stücke entstehen.
   *
   * `null` heißt „zerspringt nicht": eine Stahlplatte, oder eine Scheibe, zu
   * der es (noch) kein Modell gibt. Das ist in Jest der Normalfall und in
   * einem Checkout ohne die gekauften Pakete der Dauerzustand — der Stand
   * zählt dann weiter, er geht nur nicht kaputt.
   */
  face: THREE.Object3D | null;
  /**
   * Wo die Mitte des Scheibenmodells in seinem **eigenen** Rahmen sitzt, in
   * Metern und am geladenen Netz gemessen. Jedes Stück rechnet seinen Platz
   * dagegen — das ist der ganze Bezug zwischen „ganze Scheibe" und „sechs
   * Stücke am selben Ort".
   */
  centre: THREE.Vector3;
}

/** Ein Stück einer zersprungenen Scheibe, bis `B`/`Y` es wieder wegräumt. */
interface Debris {
  entry: PhysicsBody;
  /**
   * Seine **eigenen** Materialien. Die Geometrie darunter gehört der Vorlage
   * im Speicher und wird nie freigegeben (`core/kaykitModel.copyOf`,
   * `userData.sharedAssets`); die Materialien klont jede Kopie für sich, und
   * hier entstehen bei jedem Volltreffer sechs neue.
   */
  skins: THREE.Material[];
}

/** Das Regal, sobald es einmal geholt wurde — `import()` gibt es nur einmal. */
type Shelf = typeof import('../../../core/kaykitModel');

const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _inverse = new THREE.Matrix4();
/** Wo das Scheibenmodell im Augenblick des Treffers stand, samt seiner Lage. */
const _face = new THREE.Matrix4();
const _facing = new THREE.Quaternion();
const _spot = new THREE.Vector3();
const _size = new THREE.Vector3();
const _offset = new THREE.Vector3();

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
  /** Die zersprungenen darunter — `B`/`Y` holt sie hier wieder heraus. */
  private readonly broken: ScoreTarget[] = [];
  /** Und was von ihnen herumliegt. */
  private readonly debris: Debris[] = [];
  private readonly owned: THREE.Material[] = [];
  private readonly shapes: THREE.BufferGeometry[] = [];
  private board: TextPlane | null = null;
  private readonly marks: TextPlane[] = [];
  private host: ZoneHost | null = null;
  private shelf: Shelf | null = null;
  /** Ob die Zone schon abgeräumt ist, während eine Datei noch unterwegs war. */
  private gone = false;

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

    // Die sechs Stücke vorwärmen, bevor das erste Mal geschossen wird: Im
    // Augenblick des Treffers bleibt keine Zeit mehr für die Leitung — die
    // Scheibe ist dann schon weg, und ein Loch in der Luft, in dem eine halbe
    // Sekunde später etwas erscheint, liest niemand als „zersprungen".
    this.warmPieces();

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
      // **Erst zählen, dann zerlegen.** Der Schuss, der eine Scheibe
      // auseinandernimmt, ist der beste des Tages — er wäre der einzige, der
      // nichts einbrächte, wenn es andersherum stünde.
      this.count(points, target.distance);
      if (points >= SHATTER_POINTS) this.shatter(target);
      return true;
    }
    return false;
  }

  /**
   * `B`/`Y` setzt die Wertung zurück — und räumt auf, was zersprungen ist.
   *
   * **Die Scheiben selbst stellt die Basis**, und zwar schon: `resetShared`
   * (`PortalWorld`) setzt jeden angemeldeten Gegenstand an seinen
   * Rückstellpunkt und ruft erst **danach** `worldReset` → hierher. Wenn
   * diese Zeilen laufen, hängen die neun Scheiben also längst wieder an ihrem
   * Platz und die Stücke liegen an dem, an dem sie entstanden sind. Was
   * fehlt, ist genau das, was die Welt von einer zersprungenen Scheibe nicht
   * wissen kann: dass es sie noch gibt und dass sie wieder zählt.
   */
  reset(): void {
    this.score = 0;
    this.hits = 0;
    this.best = 0;
    this.clearDebris();
    for (const target of this.broken) {
      target.entry.object.visible = true;
      this.host?.physics.setGhost(target.entry, false);
      this.targets.push(target);
    }
    this.broken.length = 0;
    this.drawBoard();
  }

  dispose(): void {
    this.gone = true;
    // Vor allem anderen: `clearDebris` braucht die Welt noch, und die steht
    // weiter unten auf `null`.
    this.clearDebris();
    this.broken.length = 0;
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
    this.shelf = null;
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
    const stand = this.buildStand(world, spot);
    // Die Scheibe hängt **vor** ihrem Ständer, also westlich, dem Schützen zu.
    const shell = this.buildDisc();
    const entry = this.spawnTarget(
      world,
      shell,
      spot.x - STANDOFF,
      STAND_HEIGHT - TARGET_R,
      spot.z,
    );

    const physics = world.physics;
    const rapier = physics.rapier;
    // Der Drehpunkt ist die Oberkante der Scheibe auf der Oberkante des
    // Ständers — derselbe Weltpunkt, in den Koordinaten jedes der beiden
    // Körper aufgeschrieben. Die Scheibe liegt um 90° nach vorn gekippt, ihr
    // eigenes „oben" ist also −X. Gedreht wird um die Z-Achse der Welt, weil
    // hier nach **Osten** geschossen wird und nicht nach Norden.
    const data = rapier.JointData.revoluteWithAxes(
      { x: -STANDOFF, y: STAND_HEIGHT / 2, z: 0 },
      { x: -TARGET_R, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: 1 },
    );
    physics.world.createImpulseJoint(data, stand.body.body, entry.body, true);

    const target: ScoreTarget = {
      entry: world.addProp(entry, id),
      id,
      radius: TARGET_R,
      distance,
      plate: false,
      face: null,
      centre: new THREE.Vector3(),
    };
    this.targets.push(target);
    this.dress(world, target, spot, stand.built, shell);
  }

  /**
   * **Der Ständer, an dem eine Scheibe hängt** — und der Körper darin bleibt
   * der schlanke Pfosten von vorher.
   *
   * Das Modell ist 0,70 m breit und 1,05 m tief; sein Körper ist ein Kasten
   * von 10 cm Kantenlänge, und das ist Absicht. Zum einen hängt die Scheibe
   * eine Handbreit davor und gerät sonst mit ihrem eigenen Ständer in Streit;
   * zum anderen ist jeder Zentimeter Collider hier eine Kugel, die vorher
   * vorbeiflog und jetzt abprallt — und was neben der Scheibe durchgeht, soll
   * durchgehen.
   */
  private buildStand(
    world: ZoneHost,
    spot: { x: number; z: number },
  ): { body: PhysicsBody; built: THREE.Mesh } {
    const built = new THREE.Mesh(
      this.shape(new THREE.BoxGeometry(0.1, STAND_HEIGHT, 0.1)),
      this.steel!,
    );
    built.position.set(spot.x, STAND_HEIGHT / 2, spot.z);
    world.root.add(built);
    built.updateWorldMatrix(true, false);
    return { body: world.addSolid(built), built };
  }

  /**
   * **Die gerechnete Scheibe** — sie steht da, bis das Modell kommt, und in
   * einem Checkout ohne die gekauften Pakete für immer.
   */
  private buildDisc(): THREE.Mesh {
    return new THREE.Mesh(
      this.shape(new THREE.CylinderGeometry(TARGET_R, TARGET_R, TARGET_T, 24)),
      [this.steel!, this.face(), this.steel!],
    );
  }

  /**
   * Eine Scheibe als **Gegenstand**: Man kann sie abschießen, aufheben,
   * wegtragen und wieder hinstellen — und `B`/`Y` stellt sie zurück.
   *
   * **Der Körper ist eine Gruppe und kein Netz**, und daran hängt mehr, als
   * es aussieht. Die Wertung rechnet in den **eigenen** Koordinaten dieses
   * Objekts (`hitPoints` → `range/scoring.faceHit`): eine Fläche in seinem
   * `y = 0` mit `radius`. Diese Gruppe steht genau dort, wo vorher das Netz
   * stand, und ist genauso gedreht — die Rechnung merkt den Umbau also gar
   * nicht. Was sich ändert, ist nur, dass jetzt zwei Dinge darunter hängen
   * können: der gerechnete Zylinder und das Modell aus dem Regal. Hinge das
   * Modell am Zylinder selbst, wäre es mit ihm zusammen unsichtbar — in
   * three.js gilt `visible` für den ganzen Ast.
   */
  private spawnTarget(
    world: ZoneHost,
    shell: THREE.Mesh,
    x: number,
    y: number,
    z: number,
  ): PhysicsBody {
    const disc = new THREE.Group();
    // Ein Zylinder steht auf +Y; um eine Vierteldrehung um Z gelegt schaut
    // seine Fläche nach Osten — und damit ist ihr eigenes „oben" das westliche
    // −X, worauf beide Gelenkpunkte oben gerechnet sind.
    disc.quaternion.copy(DISC_TILT);
    disc.position.set(x, y, z);
    disc.add(shell);
    world.root.add(disc);
    disc.updateWorldMatrix(true, true);

    return world.physics.addDynamic(disc, {
      shape: { kind: 'cylinder' },
      halfExtents: new THREE.Vector3(TARGET_R, TARGET_T / 2, TARGET_R),
      mass: TARGET_MASS,
      friction: 0.7,
      restitution: 0.1,
      angularDamping: 0.4,
    });
  }

  // --- was aus dem Regal kommt ----------------------------------------------

  /**
   * **Das Regal holen** — einmal je Aufruf, und in Jest gar nicht.
   *
   * Dieselben zwei Schranken wie bei der Druckplatte
   * (`grid/fixtures/plate.ts`, dort steht die lange Fassung): `canLoadModels`
   * hält den Lader aus einem Lauf ohne WebGL heraus, und `import()` ist
   * dynamisch, damit Jest den `GLTFLoader` samt `import.meta` gar nicht erst
   * mitzieht. Was danach kommt, kann also jederzeit ins Leere laufen — und
   * genau dafür steht `gone` daneben.
   */
  private withShelf(use: (shelf: Shelf) => Promise<void>): void {
    if (!canLoadModels()) return;
    void import('../../../core/kaykitModel').then(async (shelf) => {
      this.shelf = shelf;
      if (this.gone) return;
      await use(shelf);
    });
  }

  /**
   * **Die sechs Stücke in den Speicher holen**, ohne sie irgendwo hinzustellen.
   *
   * Beim Zerspringen wird `kaykitModelNow` gefragt, und das antwortet nur,
   * was schon da ist — der Lader kann in diesem Augenblick nichts mehr
   * holen. Die Kopie, die hier herauskommt, ist bloß das Mittel zum Zweck;
   * ihre **eigenen** Materialien gehen sofort wieder weg, die Vorlage darunter
   * bleibt liegen und ist genau das, was gebraucht wurde.
   */
  private warmPieces(): void {
    this.withShelf(async (shelf) => {
      for (const path of PIECE_MODELS) {
        const copy = await shelf.kaykitModel(path);
        if (copy) for (const skin of skinsOf(copy)) skin.dispose();
      }
    });
  }

  /**
   * **Ständer und Scheibe anziehen** — und die gerechneten Formen darunter
   * ausblenden, sobald beide da sind.
   *
   * **Beide oder keiner**: Ein Modellständer unter einer gerechneten Scheibe
   * wäre ein halber Umbau, den man sieht. Und gemessen wird am **geladenen**
   * Netz (`THREE.Box3().setFromObject`) und nicht an den Maßen oben: Der
   * Ständer kommt mit seiner Unterkante auf den Boden, die Scheibe mit ihrer
   * Mitte auf den Ursprung ihres Körpers — beides Sätze über das, was
   * wirklich in der Datei steht, und keine über das, was einmal darin stand.
   */
  private dress(
    world: ZoneHost,
    target: ScoreTarget,
    spot: { x: number; z: number },
    post: THREE.Mesh,
    shell: THREE.Mesh,
  ): void {
    this.withShelf(async (shelf) => {
      const [stand, face] = await Promise.all([
        shelf.kaykitModel(STAND_MODEL),
        shelf.kaykitModel(TARGET_MODEL),
      ]);
      // Weg ist die Zone, oder eine der beiden Dateien kam nicht an: Dann
      // bleibt stehen, was gebaut wurde. Die Kopien sind schon gemacht, und
      // ihre Materialien gehören ihnen allein — sie gehen hier weg und nicht
      // erst, wenn niemand mehr weiß, dass es sie gab.
      if (this.gone || !stand || !face) {
        for (const copy of [stand, face]) {
          if (copy) for (const skin of skinsOf(copy)) skin.dispose();
        }
        return;
      }

      // **Der Ständer steht neben der Scheibe und nicht an ihr.** Er rührt
      // sich nie, sein Körper ist fest — ein Kind des Pfostens zu sein brächte
      // ihm nichts und nähme ihm die Möglichkeit, allein sichtbar zu bleiben.
      const feet = new THREE.Group();
      feet.position.set(spot.x, 0, spot.z);
      feet.quaternion.copy(FACING_WEST);
      stand.position.y -= new THREE.Box3().setFromObject(stand).min.y;
      feet.add(stand);
      world.root.add(feet);
      post.visible = false;

      // Und die Scheibe an einen eigenen Knoten, der die Kippung ihres
      // Körpers herausrechnet (`MODEL_TILT`). Die Mitte des Netzes kommt auf
      // den Ursprung der Scheibe — dort rechnet die Wertung, und dort sitzen
      // gleich auch die sechs Stücke.
      const pivot = new THREE.Group();
      pivot.quaternion.copy(MODEL_TILT);
      new THREE.Box3().setFromObject(face).getCenter(target.centre);
      face.position.sub(target.centre);
      pivot.add(face);
      target.entry.object.add(pivot);
      shell.visible = false;
      target.face = pivot;

      // Die Geometrie gehört der Vorlage und bleibt liegen; die Materialien
      // gehören diesen beiden Kopien und damit dieser Zone.
      for (const copy of [stand, face]) {
        for (const skin of skinsOf(copy)) this.owned.push(skin);
      }
    });
  }

  // --- und was daraus wird --------------------------------------------------

  /**
   * **Die Scheibe zerspringt** — sie geht weg, und an ihrer Stelle stehen
   * sechs Stücke.
   *
   * Die Scheibe selbst bleibt dabei, wo sie ist: unsichtbar und für alles
   * durchlässig (`PhysicsWorld.setGhost`), aber weiter an ihrem Gelenk. Das
   * ist der billigste ehrliche Weg zurück — `B`/`Y` macht sie wieder sichtbar
   * und fest, und die Welt hat sie in der Zwischenzeit als Gegenstand
   * behalten, mitsamt ihrem Rückstellpunkt. Wer sie stattdessen aus der Welt
   * nähme, müsste beim Zurückstellen Körper, Netz, Gelenk und Kennung neu
   * bauen — vier Dinge, von denen drei schon richtig dastehen.
   *
   * **Sie ist damit aus `targets` heraus** und zählt nicht mehr: Ein Loch in
   * der Luft ist keine Punkte wert (dieselbe Regel, die `bulletTravelled`
   * oben für weggeräumte Scheiben anwendet).
   *
   * Und wenn die sechs Stücke nicht **alle** bereitstehen, passiert gar
   * nichts. Eine Scheibe, die verschwindet und nichts hinterlässt, wäre kein
   * Treffer, sondern ein Fehler.
   */
  private shatter(target: ScoreTarget): void {
    const host = this.host;
    const shelf = this.shelf;
    const pivot = target.face;
    if (!host || !shelf || !pivot) return;

    const copies: THREE.Object3D[] = [];
    for (const path of PIECE_MODELS) {
      const copy = shelf.kaykitModelNow(path);
      if (copy) {
        copies.push(copy);
        continue;
      }
      for (const made of copies) for (const skin of skinsOf(made)) skin.dispose();
      return;
    }

    pivot.updateWorldMatrix(true, false);
    _face.copy(pivot.matrixWorld);
    _facing.setFromRotationMatrix(_face);

    target.entry.object.visible = false;
    host.physics.setGhost(target.entry, true);
    const at = this.targets.indexOf(target);
    if (at >= 0) this.targets.splice(at, 1);
    this.broken.push(target);

    copies.forEach((copy, index) => {
      this.spawnPiece(host, target, copy, index);
    });
  }

  /**
   * **Ein Stück** — an der Stelle, an der es eben noch an der Scheibe saß, und
   * mit dem Stoß, der es von dort wegträgt.
   *
   * Der Körper sitzt in der **Mitte** des Stücks und nicht in der Mitte der
   * Scheibe: Ein Collider steht in Rapier immer um den Ursprung seines
   * Körpers, und ein Tortenstück, dessen Ursprung an der Spitze läge, hätte
   * einen Kasten um sich, der halb in seinen beiden Nachbarn steckt. Das Netz
   * wandert dafür um denselben Betrag zurück — zusammengesetzt ergeben die
   * sechs damit wieder genau die Scheibe, die gerade verschwunden ist.
   *
   * Die Hülle ist die **echte** Form aus den Ecken des Netzes
   * (`ColliderShape.hull`) und kein Kasten. Sechs Kästen um sechs Keile
   * überlappen einander schon im Augenblick ihrer Entstehung, und Rapier
   * beantwortet das mit einer Explosion, die niemand bestellt hat.
   */
  private spawnPiece(
    host: ZoneHost,
    target: ScoreTarget,
    copy: THREE.Object3D,
    index: number,
  ): void {
    const box = new THREE.Box3().setFromObject(copy);
    box.getCenter(_spot);
    box.getSize(_size);
    // Wo dieses Stück gegenüber der Mitte der Scheibe sitzt — im Rahmen des
    // Modells, in Metern.
    _offset.copy(_spot).sub(target.centre);
    const hull = hullOf(copy, _spot);
    copy.position.sub(_spot);

    const piece = new THREE.Group();
    piece.add(copy);
    piece.position.copy(_offset).applyMatrix4(_face);
    piece.quaternion.copy(_facing);
    host.root.add(piece);
    piece.updateWorldMatrix(true, true);

    const entry = host.physics.addDynamic(piece, {
      shape: { kind: 'hull', points: hull },
      halfExtents: _size.multiplyScalar(0.5).clone(),
      mass: TARGET_MASS / PIECE_MODELS.length,
      friction: 0.8,
      restitution: 0.15,
      angularDamping: 0.3,
    });
    host.addProp(entry, `${target.id}-stueck-${index}`);

    // **Der vorhandene Weg, einem Körper Schwung zu geben**: Alles in dieser
    // Welt, was etwas wegfliegen lässt — der geworfene Gegenstand, die Kugel
    // aus der Pistole, das Portal, das eine Kiste übernimmt —, schreibt seine
    // Geschwindigkeit hin. Ein Stück entsteht in Ruhe; ein Stoß und eine
    // gesetzte Geschwindigkeit sind hier dasselbe.
    const burst = pieceBurst(_offset.applyQuaternion(_facing), EAST);
    entry.body.setLinvel(burst.velocity, true);
    entry.body.setAngvel(burst.spin, true);
    this.debris.push({ entry, skins: skinsOf(copy) });
  }

  /**
   * **Und wieder weg damit** — für `B`/`Y` und fürs Verlassen der Welt.
   *
   * Die Materialien zuerst, denn die bekommt die Welt nicht: Ihr Aufräumen
   * endet an `userData.sharedAssets` (`shared/environment.ts`, `disposeTree`),
   * weil die Geometrie darunter der Vorlage gehört. Alles Übrige — Körper,
   * Netz, Liste, Kennung, Rückstellpunkt — macht die Welt selbst
   * (`ZoneHost.removeProp`), und sie macht es vollständig.
   *
   * Die Materialien der Stücke stehen deshalb **nicht** in `owned` wie die
   * von Ständer und Scheibe: Die beiden leben so lange wie die Zone, die
   * Stücke leben bis zum nächsten `B`/`Y`. Ein Schießstand, der eine
   * Viertelstunde läuft, sammelt sonst hunderte Materialien, die niemand mehr
   * anschaut.
   */
  private clearDebris(): void {
    for (const piece of this.debris) {
      for (const skin of piece.skins) skin.dispose();
      this.host?.removeProp(piece.entry);
    }
    this.debris.length = 0;
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
    // Eine Platte hat kein Modell und zerspringt nicht: Sie ist aus Stahl,
    // und was aus Stahl ist, geht um und steht wieder auf.
    this.targets.push({
      entry,
      id,
      radius: 0.22,
      distance,
      plate: true,
      face: null,
      centre: new THREE.Vector3(),
    });
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

/**
 * **Die Materialien unter einem Knoten**, jedes einmal.
 *
 * Abgeschrieben von der Druckplatte (`grid/fixtures/plate.ts`) und nicht
 * geteilt: Es sind zehn Zeilen, sie stehen an beiden Stellen aus demselben
 * Grund, und eine gemeinsame Datei für sie kostete mehr Gemeinsamkeit
 * zwischen der Gitterwelt und dem Schießstand, als sie wert ist.
 */
function skinsOf(root: THREE.Object3D): THREE.Material[] {
  const out = new Set<THREE.Material>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const skin of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      out.add(skin);
    }
  });
  return [...out];
}

/**
 * **Die Ecken eines Netzes**, im Rahmen des Körpers, der daraus wird.
 *
 * Rapier rechnet daraus die konvexe Hülle (`PhysicsWorld.ColliderShape`,
 * `hull`), und ein Tortenstück ist konvex — ein Kreisausschnitt von 60° ist
 * genau das. Gemessen wird am **geladenen** Netz und in Metern: Die
 * Weltmatrix jedes Teilnetzes trägt den Maßstab des Pakets schon in sich,
 * solange die Kopie noch an niemandem hängt.
 *
 * `shift` ist die Stelle, an der der Ursprung des Körpers sitzt — bei einem
 * Stück seine eigene Mitte und nicht die der Scheibe (siehe `spawnPiece`).
 */
function hullOf(root: THREE.Object3D, shift: THREE.Vector3): Float32Array {
  const points: number[] = [];
  const corner = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const position = mesh.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index++) {
      corner.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld).sub(shift);
      points.push(corner.x, corner.y, corner.z);
    }
  });
  return new Float32Array(points);
}
