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
 *    die tiefste Ecke des gedrehten Kastens den Boden berührt.
 * 2. **Hochspringen und drehen** — beim Aufprall springt es so hoch, wie es
 *    selbst ist, mal `HOP` (1,5), und dreht sich in diesem Sprung von der
 *    Lage, in der es aufkam, in die richtige: Es kommt richtig herum wieder
 *    unten an und bleibt liegen. Fehlt zur richtigen Lage kaum etwas, dreht
 *    es eine ganze Runde dazu — sonst sähe der Sprung aus wie ein Hüpfer.
 *    **Das alles nur aus großer Höhe** (`HIGH_DROP`): Was man bloß absetzt,
 *    fällt ohne Zufallsdrall, wippt kurz nach (`LOW_HOP`) und dreht sich auf
 *    dem kürzesten Weg in seine Lage, ohne Salto.
 *    Gewünscht: _„beim Aufprall eher wie ein [Sprung] so hoch, wie das Objekt
 *    ist ×1,5, und in diesem Hochspringen dann in der Luft drehen, sodass es
 *    beim Runterfallen am Ende korrekt wieder liegen bleibt."_
 *
 * **Gemächlich, nicht echt** — gemeldet: _„Die sprung animation der
 * gegenstände wenn ich diese fallen lasse ist zu schnell, das hochspringen und
 * drehen kann ruhig langsamer passieren, muss nicht mit echter gravitation
 * passieren, aktuell bekomme ich davon kaum was mit."_ Der Fall rechnet mit
 * knapp halber Erdschwere (`FALL_GRAVITY`), die im Weltbau nur mit der Wurzel
 * des Gestells wächst (zehnfach groß: gut dreifach so schnell) und nicht mit
 * ihm selbst — vorher war eine Kiste aus „einem Meter" Hand dort in einer
 * knappen halben Sekunde unten. Der Sprung danach hat eine **feste Dauer**
 * (`HOP_TIME`), unabhängig von jeder Schwerkraft: hoch, drehen, liegen.
 */

/** Die Schwere des Falls, m/s² — knapp die halbe Erde; mal der Wurzel der Größe des Gestells. */
const FALL_GRAVITY = 4.4;
/** Wie lange der Sprung nach dem Aufprall dauert, in Sekunden — hoch, drehen, liegen. */
const HOP_TIME = 1.15;
/** Wie schnell der Fall auf den Platz einlenkt, je Sekunde. */
const STEER = 7;
/** Wie viel Drall je Sekunde verloren geht (Luft). */
const SPIN_DAMP = 0.6;
/** Wie hoch der Sprung nach dem Aufprall geht — mal der Höhe des Stücks. */
const HOP = 1.5;
/** Unter diesem Winkel zur richtigen Lage dreht der Sprung eine Runde dazu. */
const FLIP_BELOW = Math.PI / 2;
/**
 * **Erst ab dieser Fallhöhe gibt es den Salto** (m, mal der Größe des
 * Gestells) — darunter fällt es, setzt kurz auf und dreht sich auf dem
 * kürzesten Weg in seine Lage. Gemeldet: _„Das item flipping beim platzieren,
 * sollte nicht immer komplett um alle achsen flippen, aktuell macht es beim
 * absetzen gefühlt einen salto, auch wenn es fast schon perfekt fallen würde.
 * Es sollte nur so einen salto machen, wenn es von einer großen höhe
 * losgelassen wird"_. Eineinhalb Meter: höher hält niemand etwas, das er nur
 * absetzt.
 */
const HIGH_DROP = 1.5;
/** Wie hoch es aus geringer Höhe nach dem Aufsetzen noch hüpft — mal seiner Höhe. */
const LOW_HOP = 0.25;
/** Und wie lange das dauert, in Sekunden — ein Nachwippen, kein Sprung. */
const LOW_HOP_TIME = 0.45;
/** Höchster Drall, rad/s. */
const MAX_SPIN = 4.5;
/** So lange darf es höchstens dauern — dann steht es, wo es steht. */
const MAX_TIME = 6;
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
  private readonly hopFrom = new THREE.Quaternion();
  private readonly hopAt = new THREE.Vector3();
  /** Um welche Achse die ganze Runde im Sprung geht — keine, wenn sie nicht nötig ist. */
  private readonly flipAxis = new THREE.Vector3();
  private flip = 0;
  private hopHeight = 0;
  private hopTime = 0;
  private hopLength = 0;
  private phase: 'fall' | 'hop' | 'done' = 'fall';
  private time = 0;
  /** Wo die tiefste Ecke am Ende aufliegt. */
  private readonly floor: number;
  private readonly gravity: number;
  /** Ob es von hoch genug fällt für Drall, Sprung und Salto (`HIGH_DROP`). */
  private readonly high: boolean;

  constructor(
    start: DropStart,
    private readonly end: DropEnd,
    private readonly half: THREE.Vector3,
    rigScale: number,
    private readonly random: () => number = Math.random,
  ) {
    const scale = Math.max(1, rigScale);
    this.gravity = FALL_GRAVITY * Math.sqrt(scale);
    this.position.copy(start.position);
    this.quaternion.copy(start.quaternion);
    this.velocity.copy(start.velocity);
    this.floor = end.position.y - extentY(half, end.quaternion);
    this.high = start.position.y - end.position.y > HIGH_DROP * scale;

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
    // Aus geringer Höhe kein Zufallsdrall: Was fast richtig liegt, soll fast
    // richtig ankommen.
    if (this.high) this.spin.add(_axis);
    else this.spin.multiplyScalar(0.35);
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
      else this.hop(h);
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
    this.startHop();
  }

  /**
   * **Der Aufprall wird ein Sprung**: so hoch wie das Stück mal `HOP`, hoch und
   * wieder herunter in `HOP_TIME` — eine Parabel nach der Zeit, nicht nach
   * der Schwerkraft.
   */
  private startHop(): void {
    this.phase = 'hop';
    this.hopFrom.copy(this.quaternion);
    this.hopAt.copy(this.position);
    this.hopTime = 0;
    const hop = this.high ? HOP : LOW_HOP;
    this.hopHeight = Math.max(0.01, hop * 2 * extentY(this.half, this.end.quaternion));
    this.hopLength = this.high ? HOP_TIME : LOW_HOP_TIME;
    // Liegt es schon fast richtig, dreht es eine ganze Runde dazu — um eine
    // waagerechte Achse, quer zu der Richtung, in die es noch rutscht.
    this.flip = 0;
    if (this.high && this.quaternion.angleTo(this.end.quaternion) < FLIP_BELOW) {
      this.flipAxis.set(this.velocity.x, 0, this.velocity.z);
      if (this.flipAxis.lengthSq() < 1e-6) {
        const turn = this.random() * Math.PI * 2;
        this.flipAxis.set(Math.cos(turn), 0, Math.sin(turn));
      }
      this.flipAxis.cross(UP).normalize().negate();
      this.flip = Math.PI * 2;
    }
  }

  private hop(dt: number): void {
    this.hopTime += dt;
    const u = Math.min(1, this.hopTime / this.hopLength);
    // Gedreht wird gleichmäßig über den ganzen Sprung, oben am schnellsten.
    const turn = u * u * (3 - 2 * u);
    this.quaternion.slerpQuaternions(this.hopFrom, this.end.quaternion, turn);
    if (this.flip > 0) {
      _spin.setFromAxisAngle(this.flipAxis, this.flip * turn);
      this.quaternion.premultiply(_spin);
    }
    this.position.x = this.hopAt.x + (this.end.position.x - this.hopAt.x) * u;
    this.position.z = this.hopAt.z + (this.end.position.z - this.hopAt.z) * u;
    // Die Wurfparabel sitzt auf der tiefsten Ecke: Was sich im Sprung dreht,
    // taucht dabei nicht in den Boden ein.
    const lift = this.hopHeight * 4 * u * (1 - u);
    this.position.y = this.floor + extentY(this.half, this.quaternion) + lift;
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
