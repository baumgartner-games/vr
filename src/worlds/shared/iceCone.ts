import * as THREE from 'three';
import { canLoadModels } from '../../core/chefFit';
import { FLAVOR_COLORS, type IceCone, type IceFlavor } from '../plateup/plateUpIce';
import { NO_WOBBLE, WOBBLE, stepWobble, type WobbleState } from './iceWobble';

/**
 * **Das Hörnchen mit seinem Kugelturm — und dessen Wackeln**, für jede Welt.
 *
 * Bis September 2026 wohnte beides im Restaurant (`plateup/plateUpIceView`,
 * `plateUpWobble`), und nur das Restaurant stieß das Wackeln je Bild an. Das
 * Test Restaurant zeigte dasselbe Hörnchen (`elements/dishView`), aber der Turm
 * stand starr. Gewünscht: _„Es fehlt die Eis Kugel Physik wie es in Restaurant
 * Welt existiert. Bitte lösche die Physik in Restaurant und lege diese so ab,
 * dass diese an den Eis Waffel hängt. Also auslagern."_
 *
 * Jetzt hängt sie am Hörnchen: `IceConeView` rechnet den Turm (`iceWobble`),
 * und ein Hörnchen mit `auto` meldet sich an (`stepIceCones`) — eine Welt ruft
 * das einmal je Bild, und jedes Hörnchen im Bild wackelt, gleich, ob es in der
 * Hand liegt oder auf einer Platte steht. Das Restaurant stößt seine Hörnchen
 * weiter selbst an (`IceCorner`).
 */

/** Das Hörnchen im Regal. */
const CONE_MODEL = 'restaurant-bits/icecream_cone.glb';

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
 * **Ein Modell auf Maß bringen** — gleichmäßig so skaliert, dass seine größte
 * Ausdehnung entlang `axis` genau `size` ist, mit der Mitte auf x/z = 0 und
 * dem Fuß auf y = 0.
 */
export function fitModel(model: THREE.Object3D, size: number, axis: 'x' | 'y' | 'z'): void {
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
export async function loadKaykit(path: string): Promise<THREE.Object3D | null> {
  if (!canLoadModels()) return null;
  try {
    const { kaykitModel } = await import('../../core/kaykitModel');
    return await kaykitModel(path);
  } catch (error) {
    console.warn(`Eis: ${path} nicht geladen`, error);
    return null;
  }
}

/** Ein Hörnchen, Spitze unten — wenn das Modell nicht kommt. */
export function coneFallback(): THREE.Object3D {
  const geometry = new THREE.ConeGeometry(0.1, 0.25, 12);
  geometry.rotateX(Math.PI);
  geometry.translate(0, 0.125, 0);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0xd6a15c, roughness: 0.9 }),
  );
  mesh.name = 'plateup-ice-fallback:cone';
  return mesh;
}

/** Geometrie und Materialien der Kugeln — einmal für alle. */
export class BallKit {
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
 * sondern verzögert, nach oben hin immer weiter zurück und beim Anhalten
 * einmal hinüber und zurück, und in der Hand im Stehen sanft schaukelnd
 * (`iceWobble.ts`), gerechnet **in der Welt** und
 * erst danach in den Raum des Hörnchens zurückgelegt. Nur so kann ein Turm
 * hinter einer Hand zurückbleiben, die ihn trägt.
 */
export class IceConeView {
  readonly root = new THREE.Group();
  private readonly balls: THREE.Mesh[] = [];
  private shown: readonly IceFlavor[] = [];
  private wobble: WobbleState = NO_WOBBLE;
  private alive = true;
  /** Ob es schon einmal im Bild hing — erst dann darf `stepIceCones` es vergessen. */
  private shownOnce = false;

  /**
   * @param idle wie weit die oberste Kugel im Stehen schaukelt (`WOBBLE.idle`)
   *             — ein abgestelltes Eis schaukelt nicht (0). Änderbar: Wer ein
   *             Hörnchen in die Hand nimmt, lässt es schaukeln.
   * @param auto ob es sich anmeldet und von `stepIceCones` angestoßen wird —
   *             sonst stößt es der an, der es hält (das Restaurant, `IceCorner`)
   */
  constructor(
    private readonly kit: BallKit,
    public idle: number = WOBBLE.idle,
    auto = false,
  ) {
    this.root.name = 'plateup-ice-cone';
    this.root.userData['iceCone'] = this;
    if (auto) LIVE.add(this);
    void loadKaykit(CONE_MODEL).then((loaded) => {
      if (!this.alive) return;
      const model = loaded ?? coneFallback();
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
    // Was unten gleich geblieben ist, bleibt stehen — samt seiner Verspätung.
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
   * die Verzögerung, dann jede Kugel zurück in den Raum des Hörnchens.
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
      2 * ICE_SIZE.ball * s,
      this.idle,
    );
    this.wobble.balls.forEach((ball, i) => {
      const mesh = this.balls[i];
      if (!mesh) return;
      mesh.position.copy(this.root.worldToLocal(_p.set(ball.x, ball.y, ball.z)));
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
    LIVE.delete(this);
    this.root.removeFromParent();
  }

  /**
   * **Ob es noch im Bild hängt** — merkt sich, ob es je dort hing. Wer
   * einmal im Bild war und jetzt nicht mehr, ist weggeworfen (ein Gericht,
   * das sich geändert hat, bekommt ein neues Bild, `dishView`).
   */
  gone(): boolean {
    let node: THREE.Object3D = this.root;
    while (node.parent) node = node.parent;
    const attached = (node as THREE.Scene).isScene === true;
    if (attached) this.shownOnce = true;
    return this.shownOnce && !attached;
  }
}

/** Die Hörnchen, die sich angemeldet haben (`auto`). */
const LIVE = new Set<IceConeView>();

/**
 * **Jedes angemeldete Hörnchen ein Bild weiter** — einmal je Bild, von der
 * Welt, **nachdem** sie das Getragene an seinen Platz gehängt hat. Wer nicht
 * mehr im Bild hängt, wird vergessen.
 */
export function stepIceCones(dt: number): void {
  for (const cone of LIVE) {
    if (cone.gone()) cone.dispose();
    else cone.step(dt);
  }
}

/** Das Hörnchen in einem Bild — gesetzt am Wurzelknoten (`userData.iceCone`). */
export function iceConeIn(object: THREE.Object3D): IceConeView | null {
  let found: IceConeView | null = null;
  object.traverse((node) => {
    const cone = node.userData['iceCone'] as IceConeView | undefined;
    if (cone && !found) found = cone;
  });
  return found;
}
