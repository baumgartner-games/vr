import * as THREE from 'three';
import { CHEF_CARRY, canLoadModels } from '../../core/chefFit';
import type { WorldContext } from '../../core/types';
import {
  FLAVOR_COLORS,
  ICE_FLAVORS,
  type IceCone,
  type IceFlavor,
  type IceHands,
  type TubBox,
} from './plateUpIce';
import { ICE_FACE, ICE_STAND, ICE_TUBS } from './plateUpPlan';
import { dirX, dirZ } from '../nav/navTile';
import { NO_WOBBLE, stepWobble, type WobbleState } from './plateUpWobble';

/**
 * **Das Eis zum Ansehen** — Eisecke, Hörnchen mit Kugelturm, Portionierer.
 * Die Regeln stehen in `plateUpIce.ts`, das Wackeln in `plateUpWobble.ts`;
 * hier wird nur gezeigt.
 *
 * **Aus dem Regal** (_Restaurant Bits_, `core/kaykitModel`): das Hörnchen
 * (`icecream_cone`), der Hörnchenstapel (`icecream_cone_stacked`), der
 * Portionierer (`icecream_scoop`) und die beiden Wannen — jede aus **zwei**
 * Dateien: der Kasten (`icecream_container`) und das Eis darin
 * (`icecream_container_icecream_vanilla`/`_strawberry`). Das Eis allein ist
 * nur eine flache Platte ohne Rand; so stand es anfangs da, und von oben war
 * die Eisecke zwei blasse Zettel auf einer Arbeitsplatte. Die Arbeitsplatten
 * darunter kommen aus dem Restaurant-Katalog wie alle Stationen. **Gebaut**
 * sind die Kugeln: Kugeln in zwei Farben, eine Geometrie und ein Material je
 * Sorte für alle, damit ein Turm von zwanzig Kugeln zwanzig Aufrufe kostet und
 * keine vierzig Materialien.
 *
 * **Und gebaut ist alles, was nicht kommt** (`fallback`): Lädt ein Modell
 * nicht — kein WebGL, keine Leitung, ein falscher Name —, steht an seiner
 * Stelle ein einfacher Körper in denselben Maßen. Die Eisecke wird nie
 * unsichtbar, nur schlichter.
 */

/** Maße in Metern, so wie das Eis auf einer Arbeitsplatte steht. */
export const ICE_SIZE = {
  /** Höhe des Hörnchens. */
  cone: 0.14,
  /** Halbmesser einer Kugel. */
  ball: 0.04,
  /** Abstand zweier Kugelmitten — etwas weniger als ein Durchmesser, sie sitzen ineinander. */
  spacing: 0.058,
  /** Wie hoch die unterste Kugel über der Öffnung sitzt (ihre Mitte). */
  seat: 0.012,
  /** Länge des Portionierers. */
  scoop: 0.2,
} as const;

/**
 * **Was in der Eisecke steht, in Metern** — größer als das Eis in der Hand
 * (`ICE_SIZE`), und zwar mit Absicht: Die Möbel dieses Ladens sind halb so
 * groß wie echte (`core/dinerFit.DINER_SCALE`), und die Kisten daneben zeigen
 * ihren Inhalt in der Größe des Pakets. Ein Stapel von 26 cm und Wannen von
 * 30 cm waren von oben Krümel. Jetzt stehen die Wannen so groß wie im Paket
 * (zwei nebeneinander füllen die Platte) und der Stapel etwas darunter.
 */
export const CORNER_SIZE = {
  /** Höhe des Hörnchenstapels. */
  stack: 0.5,
  /** Länge des liegenden Portionierers. */
  scoop: 0.3,
  /** Länge einer Wanne — quer zur Platte, von vorn nach hinten. */
  tub: 0.66,
  /** Wie weit die Mitte einer Wanne neben der Mitte der Platte steht. */
  tubOffset: 0.23,
} as const;

/** Wie groß ein abgestelltes Eis auf der Platte ist — von oben soll man es sehen. */
const SHELF_SCALE = 1.6;

/** Wo das Getragene hängt — dieselben Stellen wie in `PlateUpWorld.carryInHands`. */
const EGO_CARRY = { x: 0.24, dy: -0.4, z: -0.85, scale: 1.2 } as const;
const TOP_CARRY_SCALE = 2.2;

const MODEL = {
  cone: 'restaurant-bits/icecream_cone.glb',
  stack: 'restaurant-bits/icecream_cone_stacked.glb',
  scoop: 'restaurant-bits/icecream_scoop.glb',
  /** Der leere Kasten einer Wanne — das Eis kommt als zweite Datei hinein. */
  tubBox: 'restaurant-bits/icecream_container.glb',
  tub: {
    vanilla: 'restaurant-bits/icecream_container_icecream_vanilla.glb',
    strawberry: 'restaurant-bits/icecream_container_icecream_strawberry.glb',
  } satisfies Record<IceFlavor, string>,
} as const;

/**
 * **Die Drehung der Eisecke** — ihre Platten sind so gebaut, dass die
 * Vorderseite nach +x zeigt; gedreht wird das Ganze, bis +x auf `ICE_FACE`
 * zeigt.
 */
export const ICE_YAW = Math.atan2(-dirZ(ICE_FACE), dirX(ICE_FACE));

/** Wie hoch die Arbeitsplatte ist, bis ihr Modell gemessen ist. */
const COUNTER_TOP = 0.5;

/**
 * **Ein Modell auf Maß bringen** — gleichmäßig so skaliert, dass seine größte
 * Ausdehnung entlang `axis` genau `size` ist, mit der Mitte auf x/z = 0 und
 * dem Fuß auf y = 0.
 */
function fitModel(model: THREE.Object3D, size: number, axis: 'x' | 'y' | 'z'): void {
  const box = new THREE.Box3().setFromObject(model);
  if (box.isEmpty()) return;
  const extent = box.max[axis] - box.min[axis];
  if (extent <= 1e-6) return;
  model.scale.multiplyScalar(size / extent);
  box.setFromObject(model);
  const centre = box.getCenter(new THREE.Vector3());
  model.position.x -= centre.x;
  model.position.z -= centre.z;
  model.position.y -= box.min.y;
}

/** Ein Modell aus dem Regal — `null`, wenn es nicht kommt (und nie ein Fehler). */
async function loadKaykit(path: string): Promise<THREE.Object3D | null> {
  if (!canLoadModels()) return null;
  try {
    const { kaykitModel } = await import('../../core/kaykitModel');
    return await kaykitModel(path);
  } catch (error) {
    console.warn(`Eisecke: ${path} nicht geladen`, error);
    return null;
  }
}

async function loadCounter(): Promise<THREE.Object3D | null> {
  if (!canLoadModels()) return null;
  try {
    const { dinerModel } = await import('../../core/dinerModel');
    return await dinerModel('kitchencounter_straight_A');
  } catch (error) {
    console.warn('Eisecke: Arbeitsplatte nicht geladen', error);
    return null;
  }
}

/**
 * **Eine Wanne**: Kasten und Eis, zwei Dateien mit demselben Ursprung — das
 * Eis sitzt darin, ein paar Zentimeter unter dem Rand. Fehlt der Kasten, ist
 * es keine Wanne mehr (`null`, dann steht der Ersatz da).
 */
async function loadTub(flavor: IceFlavor): Promise<THREE.Object3D | null> {
  const [box, fill] = await Promise.all([loadKaykit(MODEL.tubBox), loadKaykit(MODEL.tub[flavor])]);
  if (!box) return null;
  const tub = new THREE.Group();
  tub.add(box);
  if (fill) tub.add(fill);
  else tub.add(fallback.tubFill(flavor));
  return tub;
}

/**
 * **Ersatz für jedes Modell, das nicht kommt** — schlichte Körper in den
 * Farben und Maßen des Pakets, jeder mit dem Fuß auf y = 0 und der Mitte auf
 * x/z = 0 (wie nach `fitModel`). Sie werden nur gebaut, wenn das Modell
 * fehlt, und gehören dem, der sie bekommt.
 */
export const fallback = {
  /** Eine Arbeitsplatte, 1 × 1 m und einen halben Meter hoch, Vorderseite +z. */
  counter(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'plateup-ice-fallback:counter';
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, 0.46, 0.96),
      new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.8 }),
    );
    body.position.y = 0.23;
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.04, 1),
      new THREE.MeshStandardMaterial({ color: 0xd9783c, roughness: 0.7 }),
    );
    top.position.y = 0.48;
    group.add(body, top);
    return group;
  },
  /** Ein Stapel Hörnchen: fünf Spitztüten ineinander. */
  stack(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'plateup-ice-fallback:stack';
    const material = new THREE.MeshStandardMaterial({ color: 0xd6a15c, roughness: 0.9 });
    const geometry = new THREE.ConeGeometry(0.1, 0.25, 12);
    geometry.rotateX(Math.PI);
    for (let i = 0; i < 5; i++) {
      const cone = new THREE.Mesh(geometry, material);
      cone.position.y = 0.125 + i * 0.075;
      group.add(cone);
    }
    return group;
  },
  /** Ein Hörnchen, Spitze unten. */
  cone(): THREE.Object3D {
    const geometry = new THREE.ConeGeometry(0.1, 0.25, 12);
    geometry.rotateX(Math.PI);
    geometry.translate(0, 0.125, 0);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: 0xd6a15c, roughness: 0.9 }),
    );
    mesh.name = 'plateup-ice-fallback:cone';
    return mesh;
  },
  /** Ein Portionierer, aufrecht: Griff unten, Schale oben. */
  scoop(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'plateup-ice-fallback:scoop';
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.035, 0.34, 10),
      new THREE.MeshStandardMaterial({ color: 0x3d7be0, roughness: 0.6 }),
    );
    handle.position.y = 0.17;
    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xaab4c0, metalness: 0.4, roughness: 0.4 }),
    );
    bowl.rotation.x = Math.PI / 2;
    bowl.position.y = 0.4;
    group.add(handle, bowl);
    return group;
  },
  /** Das Eis in einer Wanne: eine Platte in der Farbe der Sorte (Maße des Pakets). */
  tubFill(flavor: IceFlavor): THREE.Object3D {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.17, 0.7),
      new THREE.MeshStandardMaterial({ color: FLAVOR_COLORS[flavor], roughness: 0.85 }),
    );
    mesh.name = `plateup-ice-fallback:fill:${flavor}`;
    return mesh;
  },
  /** Eine Wanne: offener Kasten mit Eis darin, 0,5 × 0,8 m wie im Paket. */
  tub(flavor: IceFlavor): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `plateup-ice-fallback:tub:${flavor}`;
    const material = new THREE.MeshStandardMaterial({ color: 0xe9eef3, roughness: 0.6 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.8), material);
    floor.position.y = 0.02;
    group.add(floor);
    for (const [w, d, x, z] of [
      [0.04, 0.8, -0.23, 0],
      [0.04, 0.8, 0.23, 0],
      [0.5, 0.04, 0, -0.38],
      [0.5, 0.04, 0, 0.38],
    ] as const) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), material);
      side.position.set(x, 0.125, z);
      group.add(side);
    }
    const fill = fallback.tubFill(flavor);
    fill.position.y = 0.095;
    group.add(fill);
    return group;
  },
};

/** Geometrie und Materialien der Kugeln — einmal für alle. */
class BallKit {
  readonly geometry = new THREE.SphereGeometry(ICE_SIZE.ball, 14, 10);
  private readonly materials = new Map<IceFlavor, THREE.MeshStandardMaterial>();

  material(flavor: IceFlavor): THREE.MeshStandardMaterial {
    let material = this.materials.get(flavor);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color: FLAVOR_COLORS[flavor], roughness: 0.85 });
      this.materials.set(flavor, material);
    }
    return material;
  }

  ball(flavor: IceFlavor): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geometry, this.material(flavor));
    mesh.name = `plateup-ice-ball:${flavor}`;
    return mesh;
  }

  dispose(): void {
    this.geometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
  }
}

const _base = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();

/**
 * **Ein Hörnchen mit seinem Turm** — die Kugeln folgen ihm nicht starr,
 * sondern mit der Feder aus `plateUpWobble.ts`, gerechnet **in der Welt** und
 * erst danach in den Raum des Hörnchens zurückgelegt. Nur so kann ein Turm
 * hinter einer Hand zurückbleiben, die ihn trägt.
 */
export class IceConeView {
  readonly root = new THREE.Group();
  private readonly balls: THREE.Mesh[] = [];
  private shown: readonly IceFlavor[] = [];
  private wobble: WobbleState = NO_WOBBLE;
  private alive = true;

  constructor(private readonly kit: BallKit) {
    this.root.name = 'plateup-ice-cone';
    void loadKaykit(MODEL.cone).then((loaded) => {
      if (!this.alive) return;
      const model = loaded ?? fallback.cone();
      fitModel(model, ICE_SIZE.cone, 'y');
      this.root.add(model);
    });
  }

  /** Die Kugeln zeigen, die das Eis hat — neue kommen oben dazu. */
  set(cone: IceCone): void {
    const balls = cone.balls;
    const same =
      balls.length === this.shown.length && balls.every((flavor, i) => flavor === this.shown[i]);
    if (same) return;
    // Was unten gleich geblieben ist, bleibt stehen — samt seinem Wackeln.
    let keep = 0;
    while (keep < balls.length && keep < this.shown.length && balls[keep] === this.shown[keep]) {
      keep++;
    }
    for (const mesh of this.balls.splice(keep)) mesh.removeFromParent();
    for (let i = keep; i < balls.length; i++) {
      const mesh = this.kit.ball(balls[i]!);
      mesh.position.set(0, ICE_SIZE.cone + ICE_SIZE.seat + i * ICE_SIZE.spacing, 0);
      this.root.add(mesh);
      this.balls.push(mesh);
    }
    this.wobble = { ...this.wobble, balls: this.wobble.balls.slice(0, keep) };
    this.shown = [...balls];
  }

  /** Den Turm vergessen — nach einem Sprung (ein anderer Platz, eine andere Ansicht). */
  settle(): void {
    this.wobble = NO_WOBBLE;
  }

  /**
   * **Ein Bild des Turms** — erst die Stelle des Hörnchens in der Welt, dann
   * die Feder, dann jede Kugel zurück in den Raum des Hörnchens.
   */
  step(dt: number): void {
    if (!this.balls.length) return;
    this.root.updateWorldMatrix(true, false);
    this.root.matrixWorld.decompose(_p, _q, _scale);
    const s = _scale.x || 1;
    this.root.localToWorld(_base.set(0, ICE_SIZE.cone + ICE_SIZE.seat, 0));
    _axis.set(0, 1, 0).applyQuaternion(_q);
    this.wobble = stepWobble(
      this.wobble,
      _base,
      _axis,
      this.balls.length,
      ICE_SIZE.spacing * s,
      dt,
    );
    this.wobble.balls.forEach((ball, i) => {
      const mesh = this.balls[i];
      if (!mesh) return;
      mesh.position.copy(this.root.worldToLocal(_p.set(ball.p.x, ball.p.y, ball.p.z)));
    });
  }

  /** Die Spitze des Turms in der Welt — die oberste Kugel oder die Öffnung. */
  top(out: THREE.Vector3): THREE.Vector3 {
    const last = this.balls[this.balls.length - 1];
    if (last) return last.getWorldPosition(out);
    return this.root.localToWorld(out.set(0, ICE_SIZE.cone, 0));
  }

  dispose(): void {
    this.alive = false;
    this.root.removeFromParent();
  }
}

/**
 * **Der Portionierer** — in der Hand mit der Schale nach vorn (−z), und darin
 * die Kugel, sobald er eingetaucht war. `tip` ist die Mitte der Schale: Sie
 * taucht ein, und sie setzt die Kugel ab.
 */
export class ScoopView {
  readonly root = new THREE.Group();
  readonly tip = new THREE.Object3D();
  private readonly ball: THREE.Mesh;
  private flavor: IceFlavor | null = null;
  private alive = true;

  constructor(private readonly kit: BallKit) {
    this.root.name = 'plateup-ice-scoop';
    const holder = new THREE.Group();
    // Das Modell steht aufrecht, die Schale oben: umgelegt zeigt sie nach vorn.
    holder.rotation.x = -Math.PI / 2;
    holder.position.z = 0.05;
    this.root.add(holder);
    this.tip.position.set(0, ICE_SIZE.scoop * 0.8, 0);
    holder.add(this.tip);
    this.ball = kit.ball('vanilla');
    this.ball.scale.setScalar(0.85);
    // Über der Schale — `holder` ist umgelegt, sein +z ist oben.
    this.ball.position.set(0, ICE_SIZE.scoop * 0.8, 0.025);
    this.ball.visible = false;
    holder.add(this.ball);
    void loadKaykit(MODEL.scoop).then((loaded) => {
      if (!this.alive) return;
      const model = loaded ?? fallback.scoop();
      fitModel(model, ICE_SIZE.scoop, 'y');
      holder.add(model);
    });
  }

  /** Mit oder ohne Kugel — und welcher. */
  setBall(flavor: IceFlavor | null): void {
    if (flavor === this.flavor) return;
    this.flavor = flavor;
    this.ball.visible = flavor !== null;
    if (flavor) this.ball.material = this.kit.material(flavor);
  }

  dispose(): void {
    this.alive = false;
    this.root.removeFromParent();
  }
}

/** Eine Wanne der Eisecke: ihre Sorte und ihr Anker (daran hängt die Anmeldung). */
export interface TubView {
  readonly flavor: IceFlavor;
  readonly anchor: THREE.Group;
}

/**
 * **Die Eisecke** — zwei Arbeitsplatten mit Stapel, Portionierer und Wannen,
 * dazu alles, was vom Eis gerade in einer Hand oder auf einer Platte ist.
 *
 * Die **Anker** sind, woran die Welt ihre Anmeldungen hängt, und jeder Anker
 * trägt genau das, was aufleuchten soll:
 *
 * - `stand`: die ganze Platte mit Stapel und Portionierer — am Schirm ist das
 *   **ein** Handgriff (Hörnchen samt Portionierer);
 * - `cones` und `scoop`: Stapel und Portionierer je für sich — in der Brille
 *   zwei Dinge für zwei Hände;
 * - `tubs`: jede Wanne ein eigener Anker, damit immer nur **die eine**
 *   leuchtet, die gemeint ist.
 */
export class IceCorner {
  readonly kit = new BallKit();
  stand = new THREE.Group();
  cones = new THREE.Group();
  scoop = new THREE.Group();
  tubs: TubView[] = [];
  /** Wie hoch die Platten sind — gemessen, sobald ihr Modell da ist. */
  private top = COUNTER_TOP;
  private tubRoot = new THREE.Group();
  /** Der liegende Portionierer auf der Platte — weg, solange ihn eine Hand hat. */
  private lying: THREE.Object3D | null = null;
  private held: IceConeView | null = null;
  private heldScoop: ScoopView | null = null;
  private readonly shelf = new Map<string, IceConeView>();
  private mat: THREE.Mesh | null = null;
  private round = 0;

  /** **Die Eisecke aufbauen** — nach jedem Neuaufbau der Welt neu. */
  build(root: THREE.Object3D): void {
    const round = ++this.round;
    this.stand.removeFromParent();
    this.tubRoot.removeFromParent();
    this.lying = null;
    this.stand = new THREE.Group();
    this.stand.name = 'plateup-ice-stand';
    this.stand.position.set(ICE_STAND.x + 0.5, 0, ICE_STAND.z + 0.5);
    this.stand.rotation.y = ICE_YAW;
    root.add(this.stand);
    this.cones = new THREE.Group();
    this.cones.name = 'plateup-ice-cones';
    this.scoop = new THREE.Group();
    this.scoop.name = 'plateup-ice-scoop-spot';
    this.stand.add(this.cones, this.scoop);
    this.tubRoot = new THREE.Group();
    this.tubRoot.name = 'plateup-ice-tubs';
    this.tubRoot.position.set(ICE_TUBS.x + 0.5, 0, ICE_TUBS.z + 0.5);
    this.tubRoot.rotation.y = ICE_YAW;
    root.add(this.tubRoot);
    this.tubs = ICE_FLAVORS.map((flavor) => {
      const anchor = new THREE.Group();
      anchor.name = `plateup-ice-tub:${flavor}`;
      this.tubRoot.add(anchor);
      return { flavor, anchor };
    });
    // **Die Ablage des Portionierers** — eine dunkle Matte, die liegen
    // bleibt, auch wenn er weg ist: In der Brille muss die Hand wissen, wohin
    // sie ihn zurücklegt, und ein leerer Anker hätte keine Ausdehnung.
    const mat = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.012, CORNER_SIZE.scoop + 0.05),
      new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.9 }),
    );
    mat.name = 'plateup-ice-mat';
    this.dropMat();
    this.mat = mat;
    mat.position.y = 0.006;
    this.scoop.add(mat);
    this.place();
    void this.furnish(round);
  }

  /**
   * Stapel, Portionierer und Wannen auf die Plattenhöhe setzen — im Raum der
   * Platten: Vorderseite +x, ihre Länge entlang z (gedreht wird das Ganze,
   * `ICE_YAW`).
   */
  private place(): void {
    this.cones.position.set(0.05, this.top, -0.22);
    this.scoop.position.set(0.08, this.top, 0.2);
    this.tubs.forEach((tub, i) => {
      const side = i === 0 ? -1 : 1;
      tub.anchor.position.set(0, this.top, side * CORNER_SIZE.tubOffset);
    });
  }

  private async furnish(round: number): Promise<void> {
    const counters = await Promise.all([loadCounter(), loadCounter()]);
    if (round !== this.round) return;
    counters.forEach((loaded, i) => {
      const counter = loaded ?? fallback.counter();
      // Vorderseite nach +x: das Möbel schaut von Haus aus nach +z.
      counter.rotation.y = Math.PI / 2;
      const parent = i === 0 ? this.stand : this.tubRoot;
      parent.add(counter);
      const box = new THREE.Box3().setFromObject(counter);
      if (!box.isEmpty()) this.top = box.max.y - parent.position.y;
    });
    this.place();
    const [stack, scoop, ...tubs] = await Promise.all([
      loadKaykit(MODEL.stack),
      loadKaykit(MODEL.scoop),
      ...this.tubs.map((tub) => loadTub(tub.flavor)),
    ]);
    if (round !== this.round) return;
    const cones = stack ?? fallback.stack();
    fitModel(cones, CORNER_SIZE.stack, 'y');
    this.cones.add(cones);
    const lyingScoop = scoop ?? fallback.scoop();
    fitModel(lyingScoop, CORNER_SIZE.scoop, 'y');
    // Umgelegt, längs der Platte, die Schale zum Stapel hin.
    const lying = new THREE.Group();
    lying.add(lyingScoop);
    lying.rotation.set(-Math.PI / 2, 0, 0);
    lying.position.set(0, 0.03, CORNER_SIZE.scoop / 2);
    this.scoop.add(lying);
    this.lying = lying;
    tubs.forEach((loaded, i) => {
      const tub = this.tubs[i];
      if (!tub) return;
      const model = loaded ?? fallback.tub(tub.flavor);
      fitModel(model, CORNER_SIZE.tub, 'z');
      // Gedreht wird eine Hülle und nicht das Modell: Dessen Versatz aus
      // `fitModel` gilt im ungedrehten Raum.
      const turned = new THREE.Group();
      turned.rotation.y = Math.PI / 2;
      turned.add(model);
      tub.anchor.add(turned);
    });
  }

  /** **Die Wannen als Kästen in der Welt** — zum Eintauchen in der Brille. */
  tubBoxes(): TubBox[] {
    return this.tubs.map((tub) => {
      const box = new THREE.Box3().setFromObject(tub.anchor);
      if (box.isEmpty()) {
        // Noch kein Modell: ein Kasten in den Maßen der Wanne, quer zur Platte.
        const at = tub.anchor.getWorldPosition(new THREE.Vector3());
        const deep = CORNER_SIZE.tub / 2;
        const wide = CORNER_SIZE.tub * 0.31;
        const alongX = Math.abs(Math.cos(ICE_YAW)) > 0.5;
        return {
          centre: { x: at.x, y: at.y + 0.08, z: at.z },
          half: { x: alongX ? deep : wide, y: 0.08, z: alongX ? wide : deep },
        };
      }
      const c = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      return {
        centre: { x: c.x, y: c.y, z: c.z },
        half: { x: size.x / 2, y: size.y / 2, z: size.z / 2 },
      };
    });
  }

  /** Die Mitte einer Wanne auf dem Boden — für die Wahl am Schirm. */
  tubSpots(): { x: number; z: number }[] {
    return this.tubs.map((tub) => {
      const at = tub.anchor.getWorldPosition(_p);
      return { x: at.x, z: at.z };
    });
  }

  // --- Was die Hände halten ----------------------------------------------------

  /**
   * **Hörnchen und Portionierer dorthin, wo sie gehalten werden** — in der
   * Brille in die Hand, die sie hat; am Schirm vor den Bauch (von oben) bzw.
   * unten ins Bild (aus den Augen), dann mit dem Portionierer daneben.
   *
   * @param out bekommt den Punkt vor dem Bauch, an den die Figur greift
   * @returns ob die Figur (von oben) etwas vor dem Bauch trägt
   */
  carry(hands: IceHands, ctx: WorldContext, dt: number, out: THREE.Vector3): boolean {
    const xr = ctx.renderer.xr.isPresenting;
    // Der Portionierer ist ein eigenes Ding in der Brille — und am Schirm der
    // Begleiter des Hörnchens.
    const scoopShown = hands.scoop !== null || (hands.cone !== null && hands.coneHand === null);
    if (this.lying) this.lying.visible = !scoopShown;
    let belly = false;

    if (hands.cone) {
      if (!this.held) this.held = new IceConeView(this.kit);
      const view = this.held;
      view.set(hands.cone);
      const controller = xr && hands.coneHand ? ctx.input.get(hands.coneHand) : null;
      let parent: THREE.Object3D;
      if (controller?.tracked) {
        parent = controller.hold;
        view.root.position.set(0, 0.0, -0.05);
        view.root.scale.setScalar(1);
      } else if (xr) {
        parent = ctx.rig;
        view.root.position.set(-0.08, ctx.rig.camera.position.y - 0.55, -0.4);
        view.root.scale.setScalar(1);
      } else if (!ctx.topDown) {
        parent = ctx.rig;
        view.root.position.set(EGO_CARRY.x, ctx.rig.camera.position.y + EGO_CARRY.dy, EGO_CARRY.z);
        view.root.scale.setScalar(EGO_CARRY.scale);
      } else {
        parent = ctx.rig;
        const y = CHEF_CARRY.y * ctx.avatar.stretch + ctx.avatar.bob;
        view.root.position.set(CHEF_CARRY.x, y, CHEF_CARRY.z);
        view.root.scale.setScalar(TOP_CARRY_SCALE);
        out.set(CHEF_CARRY.x, y, CHEF_CARRY.z);
        belly = true;
      }
      view.root.rotation.set(0, 0, 0);
      if (view.root.parent !== parent) {
        parent.add(view.root);
        view.settle();
      }
      view.step(dt);
    } else if (this.held) {
      this.held.dispose();
      this.held = null;
    }

    if (scoopShown) {
      if (!this.heldScoop) this.heldScoop = new ScoopView(this.kit);
      const view = this.heldScoop;
      view.setBall(hands.scoop?.ball ?? null);
      const hand = hands.scoop?.hand ?? null;
      const controller = xr && hand ? ctx.input.get(hand) : null;
      let parent: THREE.Object3D;
      if (controller?.tracked) {
        parent = controller.hold;
        view.root.position.set(0, 0, 0);
        view.root.rotation.set(0, 0, 0);
        view.root.scale.setScalar(1);
      } else if (hands.cone && this.held) {
        // **Am Schirm neben dem Hörnchen** — schräg daneben, Schale nach oben.
        parent = this.held.root;
        view.root.position.set(0.07, 0.04, 0.02);
        view.root.rotation.set(0.9, 0, -0.5);
        view.root.scale.setScalar(0.8);
      } else {
        parent = ctx.rig;
        view.root.position.set(0.1, ctx.rig.camera.position.y - 0.55, -0.4);
        view.root.rotation.set(0, 0, 0);
        view.root.scale.setScalar(1);
      }
      if (view.root.parent !== parent) parent.add(view.root);
    } else if (this.heldScoop) {
      this.heldScoop.dispose();
      this.heldScoop = null;
    }
    return belly;
  }

  /** Die Schale des Portionierers in der Welt — `null`, wenn keiner in einer Hand ist. */
  scoopTip(hands: IceHands, out: THREE.Vector3): THREE.Vector3 | null {
    if (!hands.scoop || !this.heldScoop?.root.parent) return null;
    this.heldScoop.root.updateWorldMatrix(true, true);
    return this.heldScoop.tip.getWorldPosition(out);
  }

  /** Die Spitze des Turms auf dem Hörnchen in der Hand. */
  heldTop(out: THREE.Vector3): THREE.Vector3 | null {
    return this.held ? this.held.top(out) : null;
  }

  // --- Was auf den Platten steht -------------------------------------------------

  /**
   * **Die abgestellten Eise zeigen** — je Station eines, auf ihrer Oberkante.
   *
   * @param spots je Station-Id der Anker und die Höhe der Platte
   */
  showShelf(
    shelf: ReadonlyMap<string, IceCone>,
    spots: (id: string) => { anchor: THREE.Object3D; top: number } | null,
    dt: number,
  ): void {
    for (const [id, entry] of this.shelf) {
      if (!shelf.has(id)) {
        entry.dispose();
        this.shelf.delete(id);
      }
    }
    for (const [id, cone] of shelf) {
      const spot = spots(id);
      if (!spot) continue;
      let entry = this.shelf.get(id);
      if (!entry) {
        entry = new IceConeView(this.kit);
        this.shelf.set(id, entry);
      }
      const view = entry;
      view.set(cone);
      view.root.scale.setScalar(SHELF_SCALE);
      view.root.position.set(0, spot.top, 0);
      if (view.root.parent !== spot.anchor) {
        spot.anchor.add(view.root);
        view.settle();
      }
      view.step(dt);
    }
  }

  /** Die Spitzen der abgestellten Eise, je Station-Id — zum Absetzen in der Brille. */
  shelfTops(): { id: string; top: THREE.Vector3 }[] {
    return [...this.shelf].map(([id, view]) => ({ id, top: view.top(new THREE.Vector3()) }));
  }

  /** Alles weg, was in Händen und auf Platten hängt — die Ecke selbst bleibt. */
  clearHeld(): void {
    this.held?.dispose();
    this.held = null;
    this.heldScoop?.dispose();
    this.heldScoop = null;
    for (const view of this.shelf.values()) view.dispose();
    this.shelf.clear();
  }

  dispose(): void {
    this.round++;
    this.clearHeld();
    this.stand.removeFromParent();
    this.tubRoot.removeFromParent();
    this.lying = null;
    this.tubs = [];
    this.dropMat();
    this.kit.dispose();
  }

  private dropMat(): void {
    if (!this.mat) return;
    this.mat.removeFromParent();
    this.mat.geometry.dispose();
    (this.mat.material as THREE.Material).dispose();
    this.mat = null;
  }
}
