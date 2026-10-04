import * as THREE from 'three';
import { isHighlight } from '../../core/highlight';
import { disposeTree } from '../shared/environment';

/**
 * **Simulierte Physik-Optik** — was man loslässt, fällt sichtbar aus der Hand.
 *
 * Gewünscht (Oktober 2026): _„wenn ich im Weltbau-Modus in VR etwas fallen
 * lasse aus einer Höhe, wird es aktuell einfach unten direkt erscheinen. […]
 * dass wenn ich eine Kiste z. B. leicht schräg loslasse, dass diese aus meiner
 * Hand runterfällt und sich z. B. in der Luft auch drehen kann und wenn diese
 * aufkommt, dass diese ‚zufällig' so kippt/fällt, dass diese am Ende in der
 * richtigen Position landet (also am Ende soll das Objekt wirklich die
 * Position wie jetzt haben), nur beim Weg dazwischen ist etwas mehr Physik
 * dabei."_
 *
 * **Nur das Bild.** Wo das Stück steht, rechnet das Einrasten wie immer, und
 * zwar sofort (`PortalWorld.snapPlaced`, `placedElement`). Hier fällt eine
 * **Abschrift** des Getragenen — dieselben Netze und Materialien, kein
 * Körper —, während das Original verborgen auf seinem Platz wartet. So
 * bleibt alles, was nach dem Stück fragt (Gitter, Liste der Weltänderungen,
 * Netz, Rückgängig), genau so, wie es ohne die Optik wäre.
 *
 * Der Weg hat zwei Teile:
 *
 * 1. **Fallen** — Schwerkraft, der Schwung der Hand und ein Drall, der aus
 *    der Schräglage beim Loslassen kommt, dazu ein wenig Zufall. Gelenkt wird
 *    waagerecht, damit es über seinem Platz ankommt. Aufgekommen ist es, wenn
 *    die tiefste Ecke des gedrehten Kastens den Boden berührt; ein harter
 *    Aufprall springt einmal kurz zurück.
 * 2. **Kippen** — von der Lage, in der es aufkam, in die richtige, mit der
 *    Ecke auf dem Boden: Es fällt auf die Seite, auf der es stehen soll, und
 *    schlägt am Ende hörbar flach auf (beschleunigt, `u²`).
 *
 * Die Schwerkraft wächst mit dem Gestell (`PlayerRig.scale`): Im Weltbau ist
 * man zehnmal so groß, und eine Kiste, die aus „einem Meter" Hand fällt, fällt
 * in der Welt zehn — sie soll trotzdem so schnell unten sein, wie es für den
 * Riesen aussieht.
 */

/** Erdbeschleunigung, m/s² — mal der Größe des Gestells. */
const GRAVITY = 9.81;
/** Wie schnell der Fall auf den Platz einlenkt, je Sekunde. */
const STEER = 7;
/** Wie viel Drall je Sekunde verloren geht (Luft). */
const SPIN_DAMP = 0.6;
/** Ab welcher Aufprallgeschwindigkeit (mal Gestell) es einmal zurückspringt. */
const BOUNCE_SPEED = 2;
/** Wie viel vom Aufprall der Sprung zurückgibt. */
const BOUNCE = 0.22;
/** Höchster Drall, rad/s. */
const MAX_SPIN = 4.5;
/** So lange darf es höchstens dauern — dann steht es, wo es steht. */
const MAX_TIME = 3;
/** Darunter lohnt kein Fall: kaum Höhe und kaum Drehung. */
const MIN_DROP = 0.04;
const MIN_TURN = 0.05;

const UP = new THREE.Vector3(0, 1, 0);
const _axis = new THREE.Vector3();
const _spin = new THREE.Quaternion();
const _inverse = new THREE.Quaternion();
const _rotation = new THREE.Matrix3();
const _matrix = new THREE.Matrix4();

/** Wie die Abschrift beim Loslassen in der Welt stand — und mit welchem Schwung. */
export interface DropStart {
  readonly position: THREE.Vector3;
  readonly quaternion: THREE.Quaternion;
  readonly scale: THREE.Vector3;
  readonly velocity: THREE.Vector3;
}

/** Wo das Stück am Ende steht — der Mittelpunkt seines Kastens, in Weltmetern. */
export interface DropEnd {
  readonly position: THREE.Vector3;
  readonly quaternion: THREE.Quaternion;
}

export interface DropOptions {
  /** Die halben Maße des Kastens um den Ursprung des Stücks (`PhysicsBody.halfExtents`). */
  readonly half: THREE.Vector3;
  /** Wie groß das Gestell gerade ist — 10 im Weltbau. */
  readonly rigScale: number;
  /** Was solange verborgen wird — das Original auf seinem Platz. */
  readonly hide?: readonly THREE.Object3D[];
  /** Läuft, sobald es liegt (oder abgebrochen wird). */
  readonly onLand?: () => void;
  /** Solange `true`, darf es fallen — sonst steht es sofort (wieder gegriffen, gelöscht). */
  readonly alive?: () => boolean;
  /** Die Abschrift beim Aufräumen freigeben — nur, wenn das Original schon weg ist. */
  readonly ownsResources?: boolean;
}

/**
 * **Wie hoch der Mittelpunkt über der tiefsten Ecke steht**, für einen Kasten
 * mit diesen halben Maßen in dieser Drehung.
 */
export function extentY(half: THREE.Vector3, quaternion: THREE.Quaternion): number {
  _matrix.makeRotationFromQuaternion(quaternion);
  _rotation.setFromMatrix4(_matrix);
  const e = _rotation.elements; // spaltenweise: e[1], e[4], e[7] ist die y-Zeile
  return Math.abs(e[1]!) * half.x + Math.abs(e[4]!) * half.y + Math.abs(e[7]!) * half.z;
}

/** Ob sich ein Fall überhaupt lohnt — genug Höhe oder genug Drehung. */
export function worthFalling(start: DropStart, end: DropEnd): boolean {
  return (
    start.position.y - end.position.y > MIN_DROP ||
    start.quaternion.angleTo(end.quaternion) > MIN_TURN
  );
}

/**
 * **Ein Fall** — die reine Bewegung, ohne Szene. `step` schiebt sie weiter
 * und sagt, ob sie fertig ist; danach stehen `position` und `quaternion`
 * genau auf dem Ziel.
 */
export class FallMotion {
  readonly position = new THREE.Vector3();
  readonly quaternion = new THREE.Quaternion();
  private readonly velocity = new THREE.Vector3();
  private readonly spin = new THREE.Vector3();
  private readonly settleFrom = new THREE.Quaternion();
  private readonly settleAt = new THREE.Vector3();
  private phase: 'fall' | 'settle' | 'done' = 'fall';
  private settleTime = 0;
  private settleLength = 0;
  private bounced = false;
  private time = 0;
  /** Wo die tiefste Ecke am Ende aufliegt. */
  private readonly floor: number;
  private readonly gravity: number;

  constructor(
    start: DropStart,
    private readonly end: DropEnd,
    private readonly half: THREE.Vector3,
    rigScale: number,
    random: () => number = Math.random,
  ) {
    const scale = Math.max(1, rigScale);
    this.gravity = GRAVITY * scale;
    this.position.copy(start.position);
    this.quaternion.copy(start.quaternion);
    this.velocity.copy(start.velocity);
    this.floor = end.position.y - extentY(half, end.quaternion);

    // **Der Drall**: Was schräg losgelassen wird, dreht sich weiter aus der
    // Lage heraus, in der es hing — um die Achse, um die es gegen die
    // richtige Lage gekippt ist. Dazu rollt es in Richtung des Schwungs und
    // bekommt etwas Zufall, damit keine zwei Kisten gleich fallen.
    _inverse.copy(end.quaternion).invert();
    _spin.copy(start.quaternion).multiply(_inverse);
    if (_spin.w < 0) _spin.set(-_spin.x, -_spin.y, -_spin.z, -_spin.w);
    const tilt = 2 * Math.acos(Math.min(1, _spin.w));
    _axis.set(_spin.x, _spin.y, _spin.z);
    if (_axis.lengthSq() > 1e-8) {
      _axis.normalize();
      // Nur das Kippen zählt, nicht das Drehen um die Hochachse.
      _axis.addScaledVector(UP, -_axis.dot(UP));
      this.spin.addScaledVector(_axis, Math.min(tilt, 1.2) * 1.8);
    }
    const size = Math.max(0.2, 2 * Math.max(half.x, half.y, half.z));
    _axis.set(this.velocity.x, 0, this.velocity.z);
    if (_axis.lengthSq() > 1e-6) {
      // Rollen: um die Achse quer zum Schwung, wie ein Ball über den Boden.
      const roll = _axis.length() / scale / size;
      this.spin.addScaledVector(_axis.cross(UP).normalize().negate(), Math.min(roll, 2));
    }
    _axis
      .set(random() - 0.5, (random() - 0.5) * 0.4, random() - 0.5)
      .normalize()
      .multiplyScalar(0.3 + random() * 0.9);
    this.spin.add(_axis);
    if (this.spin.length() > MAX_SPIN) this.spin.setLength(MAX_SPIN);
    // Wer hoch über dem Platz loslässt, soll keinen Speer werfen: der Schwung
    // der Hand bleibt, aber gedeckelt.
    this.velocity.clampLength(0, 6 * scale);
  }

  get done(): boolean {
    return this.phase === 'done';
  }

  /** Narrowing-frei gefragt: `finish` ändert die Phase mitten in einer Schleife. */
  private running(): boolean {
    return this.phase !== 'done';
  }

  /** Sofort ans Ziel. */
  finish(): void {
    this.position.copy(this.end.position);
    this.quaternion.copy(this.end.quaternion);
    this.phase = 'done';
  }

  /** Ein Bild weiter — in Teilschritten, damit ein ruckelndes Bild nicht durch den Boden fällt. */
  step(dt: number): boolean {
    if (this.phase === 'done') return true;
    this.time += dt;
    if (this.time > MAX_TIME) {
      this.finish();
      return true;
    }
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (let i = 0; i < steps && this.running(); i++) {
      if (this.phase === 'fall') this.fall(h);
      else this.settle(h);
    }
    return !this.running();
  }

  private fall(dt: number): void {
    // Waagerecht einlenken: so schnell, dass es bis zum Aufkommen über seinem
    // Platz ist — gerechnet aus der Zeit, die der Fall noch braucht.
    const drop = Math.max(0, this.position.y - extentY(this.half, this.quaternion) - this.floor);
    const vy = this.velocity.y;
    const left = Math.max(0.05, (vy + Math.sqrt(vy * vy + 2 * this.gravity * drop)) / this.gravity);
    const blend = Math.min(1, STEER * dt);
    this.velocity.x += ((this.end.position.x - this.position.x) / left - this.velocity.x) * blend;
    this.velocity.z += ((this.end.position.z - this.position.z) / left - this.velocity.z) * blend;
    this.velocity.y -= this.gravity * dt;
    this.position.addScaledVector(this.velocity, dt);

    const angle = this.spin.length() * dt;
    if (angle > 0) {
      _axis.copy(this.spin).normalize();
      _spin.setFromAxisAngle(_axis, angle);
      this.quaternion.premultiply(_spin).normalize();
    }
    this.spin.multiplyScalar(Math.exp(-SPIN_DAMP * dt));

    const rest = this.floor + extentY(this.half, this.quaternion);
    if (this.position.y > rest) return;
    this.position.y = rest;
    const impact = -this.velocity.y;
    if (!this.bounced && impact > BOUNCE_SPEED * (this.gravity / GRAVITY) ** 0.5) {
      // **Einmal kurz zurück** — und dabei etwas verdreht, als hätte die Kante
      // zuerst aufgesetzt.
      this.bounced = true;
      this.velocity.y = impact * BOUNCE;
      this.velocity.x *= 0.5;
      this.velocity.z *= 0.5;
      this.spin.multiplyScalar(0.5);
      return;
    }
    this.phase = 'settle';
    this.settleFrom.copy(this.quaternion);
    this.settleAt.copy(this.position);
    this.settleTime = 0;
    const turn = this.quaternion.angleTo(this.end.quaternion);
    this.settleLength = 0.16 + 0.32 * Math.min(1, turn / Math.PI);
  }

  private settle(dt: number): void {
    this.settleTime += dt;
    const u = Math.min(1, this.settleTime / this.settleLength);
    // Kippen beschleunigt — wie etwas, das über die Kante fällt — und schlägt
    // am Ende flach auf.
    this.quaternion.slerpQuaternions(this.settleFrom, this.end.quaternion, u * u);
    const slide = u * u * (3 - 2 * u);
    this.position.x = this.settleAt.x + (this.end.position.x - this.settleAt.x) * slide;
    this.position.z = this.settleAt.z + (this.end.position.z - this.settleAt.z) * slide;
    this.position.y = this.floor + extentY(this.half, this.quaternion);
    if (u >= 1) this.finish();
  }
}

interface Falling {
  readonly motion: FallMotion;
  readonly view: THREE.Object3D;
  readonly hidden: readonly { object: THREE.Object3D; visible: boolean }[];
  readonly options: DropOptions;
}

/**
 * **Alles, was gerade fällt** — die Abschriften in der Szene, je Bild
 * nachgeführt (`update`), beim Verlassen der Welt aufgeräumt (`clear`).
 */
export class DropFalls {
  private readonly falling: Falling[] = [];

  /**
   * Eine Abschrift von `source` fallen lassen — von `start` nach `end`.
   *
   * @returns ob gefallen wird; `false`, wenn es sich nicht lohnt (dann ist
   *   nichts verborgen und `onLand` ist nicht gelaufen)
   */
  start(
    parent: THREE.Object3D,
    source: THREE.Object3D,
    start: DropStart,
    end: DropEnd,
    options: DropOptions,
  ): boolean {
    if (!worthFalling(start, end)) return false;
    const view = copyView(source);
    view.position.copy(start.position);
    view.quaternion.copy(start.quaternion);
    view.scale.copy(start.scale);
    parent.add(view);
    const hidden = (options.hide ?? []).map((object) => {
      const was = { object, visible: object.visible };
      object.visible = false;
      return was;
    });
    const motion = new FallMotion(start, end, options.half, options.rigScale);
    this.falling.push({ motion, view, hidden, options });
    return true;
  }

  /** Wie viele gerade fallen — für Tests und Anzeigen. */
  get count(): number {
    return this.falling.length;
  }

  update(dt: number): void {
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const one = this.falling[i]!;
      const alive = one.options.alive?.() ?? true;
      if (!alive) one.motion.finish();
      else one.motion.step(dt);
      one.view.position.copy(one.motion.position);
      one.view.quaternion.copy(one.motion.quaternion);
      if (!one.motion.done) continue;
      this.falling.splice(i, 1);
      this.land(one);
    }
  }

  /**
   * Alles sofort an seinen Platz.
   *
   * @param land ob `onLand` noch laufen soll — beim Verlassen der Welt nicht
   */
  clear(land = true): void {
    const all = this.falling.splice(0);
    for (const one of all) {
      one.motion.finish();
      this.land(one, land);
    }
  }

  private land(one: Falling, run = true): void {
    for (const { object, visible } of one.hidden) object.visible = visible;
    if (one.options.ownsResources) disposeTree(one.view);
    else one.view.removeFromParent();
    if (run) one.options.onLand?.();
  }
}

/**
 * **Die Abschrift**: dieselben Netze und Materialien, ohne den Saum der Hand
 * (`highlight.ts`) und ohne die Merkzettel des Originals — sie ist kein
 * Gegenstand, nach dem irgendetwas fragen soll.
 */
function copyView(source: THREE.Object3D): THREE.Object3D {
  source.updateWorldMatrix(true, false);
  const view = source.clone(true);
  const marks: THREE.Object3D[] = [];
  view.traverse((part) => {
    if (part !== view && isHighlight(part)) marks.push(part);
  });
  for (const mark of marks) mark.removeFromParent();
  const shared = (source.userData as { sharedAssets?: boolean }).sharedAssets;
  view.userData = shared ? { sharedAssets: true } : {};
  view.matrixAutoUpdate = true;
  view.visible = true;
  return view;
}
