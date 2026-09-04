import * as THREE from 'three';
import { Tool, disposeToolTree, grabMaterial, type ToolHost } from './Tool';
import { HAMMER_HOME, HAMMER_SHAFT, clampShaftGrip, spanPole, swingPush } from './poleGrip';
import { playTone } from '../../../core/Audio';
import type { ControllerState, Handedness, XRInput } from '../../../core/XRInput';

/** Wo der Kopf sitzt und wo der Knauf — die beiden Enden der Stange. */
const HEAD_Z = -0.52;
const BUTT_Z = 0.48;
/**
 * Wie der Stiel liegt, wenn ihn **niemand** hält: mittig auf dem Ursprung.
 *
 * Nicht kosmetisch. Der Klotz, den die Physik einem fallengelassenen Werkzeug
 * gibt, ist symmetrisch um dessen Ursprung (`toolHalfExtents` in
 * `PortalWorld.ts`) — hing die Stange dabei an ihrem Griff, wäre der Klotz
 * anderthalb Mal so lang wie sie selbst und die Hälfte davon Luft, an der
 * andere Dinge abprallen.
 */
const REST_Z = -(HEAD_Z + BUTT_Z) / 2;
/** Halbmesser des Stiels; der Griffbelag darüber ist eine Spur dicker. */
const SHAFT_R = 0.019;
/** Wie weit eine Faust vom Stiel weg sein darf und noch daran liegt. */
const REACH = 0.15;
/** Wie lange nach einem Schlag nichts weiter angestoßen wird, in Sekunden. */
const HIT_PAUSE = 0.3;

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _point = new THREE.Vector3();
const _head = new THREE.Vector3();
const _velocity = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _up = new THREE.Vector3();
const _axisX = new THREE.Vector3();
const _axisY = new THREE.Vector3();
const _axisZ = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _basis = new THREE.Matrix4();
const _quat = new THREE.Quaternion();

/**
 * **Großer Hammer**: ein Meter Stange, vorn ein Kopf aus Eisen — und das erste
 * Werkzeug, das man *irgendwo* anfassen kann.
 *
 * Jedes andere Werkzeug hier hat genau einen Griff. Das ist keine Sparsamkeit,
 * sondern richtig: eine Pistole hält man am Griff, eine Taschenlampe am Rohr,
 * und wo sonst — es gibt keine zweite Antwort. Bei einer Stange gibt es sie.
 * Weit hinten am Knauf hat man die ganze Reichweite und das ganze Drehmoment;
 * weit vorn hat man Kontrolle und kann das Ding hinstellen, ohne die halbe
 * Halle abzuräumen. Beides will man, und zwar nicht als Einstellung, die man
 * einmal trifft, sondern mitten in der Bewegung. Also:
 *
 * - **Eine Hand** hält ihn wie jedes andere Werkzeug — entlang des
 *   Zeigestrahls, Kopf nach vorn. Neu ist nur, *welcher Punkt* des Stiels in
 *   der Faust liegt: das Modell rutscht in sich selbst entlang der Achse, so
 *   dass der gegriffene Punkt auf dem Ursprung sitzt und damit dort, wohin
 *   `holdPosition` ihn legt. Dieselbe Mechanik wie das Drohnen-Deck, nur
 *   stufenlos (`Tool.showHeldBy`).
 * - **Zwei Hände** nehmen ihn dem Zeigestrahl weg: dann liegt er auf der Linie
 *   zwischen den beiden Fäusten, jede an ihrem Punkt, und der Kopf zeigt von
 *   der hinteren Hand weg. Die Rechnung dazu steht in `poleGrip.ts` — samt dem
 *   Vorzeichen, das entscheidet, ob man den Hammer oder den Knauf vorweg trägt,
 *   und mit Jest-Test, weil man das im Headset nur noch bemerkt und nicht mehr
 *   nachvollzieht.
 * - **Trigger halten** lässt ihn durch die Fäuste rutschen: der Stiel bleibt
 *   stehen, wo er ist, und jede Hand daran liest sich einen neuen Griffpunkt.
 *   Loslassen, und er sitzt an den neuen Punkten. Das ist die ehrliche Form von
 *   „umgreifen" — kein Menü, keine Raste, sondern die Bewegung, die man auch mit
 *   einem echten Stiel macht.
 *
 * **Geschlagen** wird mit dem Kopf und nicht mit dem Trigger. Was der Kopf
 * schnell genug berührt, bekommt einen Stoß in die Richtung, in die der Kopf
 * gerade fliegt (`swingPush` in `poleGrip.ts`). Gemessen wird der Kopf als
 * *Punkt* und nicht als Strecke: die Greifbox eines Objekts ist der Collider
 * plus 9 cm, und in dieser Toleranz verschwindet der Weg, den ein Kopf in einem
 * Bild macht. Ein wirklich schneller Schlag kann durch einen dünnen Dominostein
 * hindurchgehen, ohne ihn zu treffen — dafür kostet der Schlag keine
 * Kollisionsgeometrie, die es an einem Werkzeug sonst nirgends gibt.
 *
 * **Gehalten** wird er von der Hand, die ihn geholt hat, und die zweite kommt
 * dazu — wie bei der Drohne, und aus demselben Grund: `heldBy` gehört der Welt,
 * nicht dem Werkzeug, und ein Werkzeug, das seine Hand selbst umschreibt, hat
 * den Gürtel und die Physik hinterher gegen sich. Lässt die führende Hand los,
 * fällt er also, auch wenn die zweite noch am Stiel liegt. Umgreifen ist der
 * Trigger, nicht das Loslassen.
 *
 * Am **Griffstand** liegt er in seinem Auslieferungsgriff (`HAMMER_HOME`), und
 * das ist die ganze Rücksicht, die er dort braucht: eine Handhaltung ist der
 * Versatz gegen den *Ursprung* des Werkzeugs, und der Ursprung ist bei diesem
 * Werkzeug immer der Punkt, an dem die Faust liegt. Einmal eingemessen gilt die
 * Haltung damit an jedem Punkt des Stiels.
 */
export class HammerTool extends Tool {
  override readonly toolId = 'hammer';
  override readonly label = 'Großer Hammer';

  /**
   * Alles, woraus er besteht. Es rutscht entlang seiner z-Achse **in** dem
   * Werkzeug: der gegriffene Punkt des Stiels soll auf dem Ursprung sitzen,
   * denn den legt `holdPosition` in die Hand.
   */
  private readonly shaft = new THREE.Group();
  /** Der Kopf, als Punkt — daran wird der Schlag gemessen. */
  private readonly head = new THREE.Object3D();
  /** Wo jede Hand am Stiel liegt, in Metern; `null` heißt: nicht dran. */
  private readonly grips: Record<Handedness, number | null> = { left: null, right: null };
  /** Kommt aus `onTake`, damit die Pose die *andere* Hand fragen kann. */
  private input: XRInput | null = null;
  /** Der Stiel steht, die Hände rutschen daran — solange ein Trigger liegt. */
  private sliding = false;
  private readonly frozen = new THREE.Matrix4();
  private frozenShaft = 0;
  /** Weltlage des Kopfes im Bild davor, für seine Geschwindigkeit. */
  private readonly lastHead = new THREE.Vector3();
  private headKnown = false;
  private hitPause = 0;

  constructor() {
    super();
    this.name = 'tool-hammer';
    this.icon = 'hammer';
    this.accent = 0xc98b52;
    this.hint = 'Überall am Stiel greifen · zweite Hand dazu · Trigger schiebt die Hand';
    // Der Ursprung ist der Griffpunkt, und ein Stiel liegt in der Faust wie
    // jeder andere Griff: eine Spur unter und vor dem Griffpunkt des Controllers.
    this.holdPosition.set(0, -0.012, 0.02);

    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.78 });
    const iron = new THREE.MeshStandardMaterial({
      color: 0x6f7684,
      roughness: 0.42,
      metalness: 0.82,
    });

    this.add(this.shaft);

    // --- der Stiel ------------------------------------------------------------
    // Zylinder wachsen in three.js entlang +y; eine Vierteldrehung um x legt
    // ihn auf die z-Achse, auf der in dieser Welt jedes Werkzeug zeigt.
    const length = BUTT_Z - HEAD_Z;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(SHAFT_R, SHAFT_R * 1.1, length, 12),
      wood,
    );
    pole.rotation.x = Math.PI / 2;
    pole.position.z = (HEAD_Z + BUTT_Z) / 2;
    this.shaft.add(pole);

    // Der **Griffbelag** über dem greifbaren Teil, in Türkis wie jeder Griff in
    // dieser Welt (`grabMaterial`). Er ist die einzige Auskunft darüber, dass
    // hier nicht *eine* Stelle gemeint ist, sondern jede — und deshalb ist er
    // auch **kein** Standardgriff (`grip.ts`): der ist eine Faust lang und sagt
    // „hier", dieser ist siebenmal so lang und sagt „irgendwo hier". Ein
    // Zylinder ohne Ellipse und ohne Rillen, denn beide zeigen eine Richtung an,
    // und hier gibt es keine.
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(
        SHAFT_R * 1.35,
        SHAFT_R * 1.35,
        HAMMER_SHAFT.back - HAMMER_SHAFT.front,
        12,
      ),
      grabMaterial(),
    );
    band.rotation.x = Math.PI / 2;
    band.position.z = (HAMMER_SHAFT.front + HAMMER_SHAFT.back) / 2;
    this.shaft.add(band);

    // Ein Knauf, damit die Hand am hinteren Ende etwas hat, wogegen sie zieht.
    const knob = new THREE.Mesh(new THREE.SphereGeometry(SHAFT_R * 1.7, 12, 8), iron);
    knob.position.z = BUTT_Z;
    this.shaft.add(knob);

    // --- der Kopf -------------------------------------------------------------
    // Quer zum Stiel: ein Hammer trifft mit der Fläche, nicht mit der Kante.
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.085, 0.09), iron);
    block.position.z = HEAD_Z;
    this.shaft.add(block);
    for (const side of [-1, 1] as const) {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.075), iron);
      cheek.position.set(side * 0.09, 0, HEAD_Z);
      this.shaft.add(cheek);
    }
    // Ein Ring dort, wo der Kopf auf dem Stiel sitzt — sonst sieht es aus, als
    // stecke der Stiel bloß daneben.
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(SHAFT_R * 1.5, SHAFT_R * 1.5, 0.03, 12),
      iron,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.z = HEAD_Z + 0.055;
    this.shaft.add(collar);

    this.head.position.z = HEAD_Z;
    this.shaft.add(this.head);

    this.showHeldBy(null);
  }

  // --- wie er in den Händen liegt ---------------------------------------------

  /**
   * Der Stiel rutscht so weit, dass der Griffpunkt dieser Hand auf dem
   * Ursprung sitzt.
   *
   * Eine Hand, die noch nirgends zugepackt hat, bekommt den Auslieferungsgriff
   * — so liegt er am **Griffstand**, wo niemand hält und trotzdem gezeigt
   * werden muss, wie er in dieser Hand liegt. **Ohne** Hand liegt er mittig
   * (`REST_Z`): das ist der Gürtel, der Boden und alles andere, wo er
   * herumliegt statt gehalten zu werden.
   */
  override showHeldBy(hand: Handedness | null): void {
    const at = hand === null ? null : (this.grips[hand] ?? HAMMER_HOME);
    this.shaft.position.z = at === null ? REST_Z : -at;
  }

  /**
   * Drei Fälle, und nur einer davon ist der übliche.
   *
   * Beim **Schieben** steht der Stiel still: seine Weltlage von vorhin wird Bild
   * für Bild zurückgerechnet, und die Hände rutschen daran entlang. **Zwei
   * Hände** legen ihn auf die Linie zwischen den Fäusten. Sonst hängt er wie
   * jedes Werkzeug am Zeigestrahl der einen Hand, die ihn hält.
   */
  override applyHold(controller: ControllerState | null): void {
    if (!this.heldBy || this.parked) return;
    this.grips[this.heldBy] ??= HAMMER_HOME;
    if (this.sliding && this.holdStill()) return;
    if (this.spanHands()) return;
    this.showHeldBy(this.heldBy);
    super.applyHold(controller);
  }

  /** Die Weltlage von vor dem Schieben, in den Raum des Elternteils gerechnet. */
  private holdStill(): boolean {
    const parent = this.parent;
    if (!parent) return false;
    parent.updateWorldMatrix(true, false);
    _matrix.copy(parent.matrixWorld).invert().multiply(this.frozen);
    _matrix.decompose(this.position, this.quaternion, _scale);
    this.shaft.position.z = this.frozenShaft;
    return true;
  }

  /**
   * Die zweihändige Lage: beide Griffpunkte in ihren Fäusten, und der Kopf von
   * der hinteren Hand weg.
   *
   * Die Achse und der Ursprung kommen aus `spanPole`; hier steht nur, was
   * three.js dazu braucht — die **Rolle** um diese Achse, und die gehört der
   * führenden Hand: sie ist die, deren Handgelenk man dabei fühlt. Ist die
   * Aufstellung nicht zu lesen (eine Hand weg, beide Griffe zu dicht
   * beieinander), sagt das `false`, und der Stab liegt wieder einhändig.
   */
  private spanHands(): boolean {
    const parent = this.parent;
    const side = this.heldBy;
    if (!parent || !side) return false;
    const other = otherHand(side);
    const mine = this.grips[side];
    const theirs = this.grips[other];
    if (mine === null || theirs === null) return false;
    const lead = this.input?.get(side);
    const follow = this.input?.get(other);
    if (!lead?.tracked || !follow?.tracked) return false;

    anchorOf(lead).getWorldPosition(_a);
    anchorOf(follow).getWorldPosition(_b);
    const span = spanPole({ point: _a, z: mine }, { point: _b, z: theirs });
    if (!span) return false;

    _axisZ.set(span.axis.x, span.axis.y, span.axis.z);
    _up.set(0, 1, 0).applyQuaternion(anchorOf(lead).getWorldQuaternion(_quat));
    _axisX.copy(_up).cross(_axisZ);
    // Die Faust genau in der Achse: dann sagt sie über die Rolle nichts, und
    // eine Basis daraus wäre ein Nullvektor. Einhändig ist dann die ehrlichere
    // Antwort als eine erfundene Richtung.
    if (_axisX.lengthSq() < 1e-6) return false;
    _axisX.normalize();
    _axisY.copy(_axisZ).cross(_axisX);
    _basis.makeBasis(_axisX, _axisY, _axisZ);
    _quat.setFromRotationMatrix(_basis);

    this.shaft.position.z = 0;
    parent.updateWorldMatrix(true, false);
    _matrix.copy(parent.matrixWorld).invert();
    this.position.set(span.origin.x, span.origin.y, span.origin.z).applyMatrix4(_matrix);
    // Rig und Hände werden nie skaliert, die Umkehrung ist also eine Drehung.
    this.quaternion.setFromRotationMatrix(_matrix).multiply(_quat);
    return true;
  }

  /**
   * Die zweite Hand ist belegt, sobald sie **am Stiel** ist — nicht erst, wenn
   * sie zudrückt. Sonst zöge derselbe Griff, mit dem man hier zupackt, im
   * selben Augenblick ein Werkzeug von der nächsten Hüfte.
   */
  override claimsHand(hand: Handedness): boolean {
    if (!this.heldBy || this.parked || hand === this.heldBy) return false;
    if (this.grips[hand] !== null) return true;
    const controller = this.input?.get(hand);
    return !!controller?.tracked && this.gripUnder(controller) !== null;
  }

  // --- greifen, schieben, schlagen -------------------------------------------

  /**
   * Vom Boden aufgehoben wird er **dort, wo die Hand ihn anfasst**. Das ist die
   * eine Stelle, an der der Griffpunkt ohne Zutun aus der Bewegung selbst
   * kommt: das Ding liegt noch, die Hand ist schon dran, und was dazwischen
   * steht, ist die Antwort. Greift sie neben den Stiel — am Kopf, am Knauf
   * vorbei —, bleibt der Griff, den er ohnehin hatte.
   */
  override onReach(controller: ControllerState): void {
    const hand = controller.handedness;
    if (!hand) return;
    const at = this.gripUnder(controller);
    if (at !== null) this.grips[hand] = at;
  }

  override onTake(controller: ControllerState, host: ToolHost): void {
    this.input = host.ctx.input;
    const hand = controller.handedness;
    if (hand) this.grips[hand] ??= HAMMER_HOME;
    this.headKnown = false;
    controller.pulse(0.4, 26);
  }

  override onStow(host: ToolHost): void {
    this.grips.left = null;
    this.grips.right = null;
    this.sliding = false;
    this.headKnown = false;
    host.ctx.pointer.busy.delete('left');
    host.ctx.pointer.busy.delete('right');
    this.restShaft();
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    if (!this.heldBy || !controller) {
      this.grips.left = null;
      this.grips.right = null;
      this.sliding = false;
      this.headKnown = false;
      return;
    }
    this.input = host.ctx.input;
    // Hängt für den Justierstand in der Luft: es gehört gerade in niemandes
    // Fäuste, und die Hand daneben misst, statt zu halten.
    if (this.parked) {
      this.grips[otherHand(this.heldBy)] = null;
      this.sliding = false;
      this.headKnown = false;
      this.markBusyHands(host);
      return;
    }
    this.checkSecondHand(host);
    this.checkSlide(host);
    this.markBusyHands(host);
    this.hitPause = Math.max(0, this.hitPause - dt);
    this.checkSwing(dt, host);
  }

  /** Liegt die andere Hand am Stiel — und wo? */
  private checkSecondHand(host: ToolHost): void {
    const side = this.heldBy;
    if (!side) return;
    const other = otherHand(side);
    const controller = this.input?.get(other);
    const at =
      controller?.tracked && controller.squeeze.pressed && !host.heldTool(other)
        ? this.gripUnder(controller)
        : null;
    if (at === null || !controller) {
      this.grips[other] = null;
      return;
    }
    // Schon dran: der Punkt bleibt, wo er gegriffen wurde. Ihn Bild für Bild
    // nachzuziehen hieße, dass die Hand am Stiel klebt statt ihn zu halten.
    if (this.grips[other] !== null) return;
    this.grips[other] = at;
    controller.pulse(0.45, 28);
    host.notify('Zweite Hand am Stiel');
  }

  /**
   * Der Trigger schiebt: solange er liegt, steht der Stiel im Raum und jede
   * Hand daran liest sich ihren Punkt neu. Das ist das Umgreifen, und es ist
   * dasselbe für eine Hand wie für zwei.
   */
  private checkSlide(host: ToolHost): void {
    const sides = this.handsOn();
    let pressed = false;
    for (const side of sides) {
      const controller = this.input?.get(side);
      if (!controller?.tracked) continue;
      // Liegt der Strahl dieser Hand auf einem Panel, gehört ihr Trigger dorthin.
      if (host.ctx.pointer.hoveringWith(side)) continue;
      if (controller.trigger.pressed) pressed = true;
    }

    if (!pressed) {
      if (!this.sliding) return;
      this.sliding = false;
      playTone({ type: 'sine', from: 520, to: 300, duration: 0.08, gain: 0.04 });
      return;
    }

    if (!this.sliding) {
      this.updateWorldMatrix(true, false);
      this.frozen.copy(this.matrixWorld);
      this.frozenShaft = this.shaft.position.z;
      this.sliding = true;
      for (const side of sides) this.input?.get(side)?.pulse(0.3, 20);
      host.notify('Stiel steht — Hand daran entlangschieben');
      return;
    }

    for (const side of sides) {
      const controller = this.input?.get(side);
      if (!controller?.tracked) continue;
      // Rutscht eine Hand über das Ende hinaus, bleibt ihr letzter Punkt
      // stehen: ein Griff, der ins Nichts springt, ist kein Griff.
      const at = this.gripUnder(controller);
      if (at !== null) this.grips[side] = at;
    }
  }

  /** Was der Kopf trifft, und wie schnell er dabei war. */
  private checkSwing(dt: number, host: ToolHost): void {
    // `getWorldPosition` zieht die Matrizen selbst nach — der Kopf hängt unter
    // einem Werkzeug, das diese Frame gerade neu gestellt wurde.
    this.head.getWorldPosition(_head);
    if (!this.headKnown || dt <= 0) {
      this.lastHead.copy(_head);
      this.headKnown = true;
      return;
    }
    _velocity.copy(_head).sub(this.lastHead).divideScalar(dt);
    this.lastHead.copy(_head);
    if (this.hitPause > 0) return;
    const push = swingPush(_velocity.length());
    if (push <= 0) return;
    const hit = host.propAt(_head);
    if (!hit) return;
    host.pushProp(hit, _velocity, push);
    this.hitPause = HIT_PAUSE;
    playTone({ type: 'square', from: 260, to: 70, duration: 0.12, gain: 0.07 });
    for (const side of this.handsOn()) this.input?.get(side)?.pulse(0.9, 45);
  }

  /**
   * Wo diese Faust am Stiel läge — `null`, wenn sie zu weit davon weg ist.
   *
   * Gerechnet im Raum des Werkzeugs: der Stiel liegt dort auf der z-Achse durch
   * den Ursprung, also *ist* der Abstand quer dazu `hypot(x, y)`, und längs
   * zählt, wie weit die Hand hinter das Ende hinausgerutscht ist.
   */
  private gripUnder(controller: ControllerState): number | null {
    anchorOf(controller).getWorldPosition(_a);
    this.updateWorldMatrix(true, false);
    _matrix.copy(this.matrixWorld).invert();
    _point.copy(_a).applyMatrix4(_matrix);
    // Vom Werkzeugraum in den Raum des Stiels: der ist um genau diesen Versatz
    // darin verschoben.
    const along = _point.z - this.shaft.position.z;
    const at = clampShaftGrip(HAMMER_SHAFT, along);
    return Math.hypot(_point.x, _point.y, along - at) <= REACH ? at : null;
  }

  /** Die Hände, die gerade wirklich an diesem Ding sind. */
  private handsOn(): Handedness[] {
    const sides: Handedness[] = [];
    for (const side of ['left', 'right'] as const) {
      if (side === this.heldBy || this.grips[side] !== null) sides.push(side);
    }
    return sides;
  }

  /**
   * Wessen Zeigestrahl ausgeht. Die zweite Hand, sobald sie am Stiel liegt —
   * sie hält, sie zeigt nicht. Die führende erst, wenn beide dran sind: sonst
   * käme man mit einem Hammer in der Hand an kein Menü mehr heran.
   */
  private markBusyHands(host: ToolHost): void {
    const pointer = host.ctx.pointer;
    const both = this.grips.left !== null && this.grips.right !== null;
    for (const side of ['left', 'right'] as const) {
      const busy = side === this.heldBy ? both : this.grips[side] !== null;
      if (busy) pointer.busy.add(side);
      else pointer.busy.delete(side);
    }
  }

  /**
   * Nimmt den Stiel-Versatz zurück, **ohne dass das Ding dabei springt**: was
   * das Modell nach vorn rückt, rückt der Ursprung zurück.
   *
   * Beim Ablegen und beim Fallenlassen — dort bleibt die Weltlage des Werkzeugs
   * stehen und die Physik baut ihren Klotz darum. Ein Hammer, der beim
   * Loslassen einen halben Meter entlang seiner Achse springt, ist der Fehler,
   * den hinterher niemand mehr zuordnet.
   */
  private restShaft(): void {
    const before = this.shaft.position.z;
    const after = REST_Z;
    if (before === after) return;
    this.shaft.position.z = after;
    this.position.add(_offset.set(0, 0, before - after).applyQuaternion(this.quaternion));
  }

  override disposeTool(): void {
    disposeToolTree(this);
  }
}

function otherHand(hand: Handedness): Handedness {
  return hand === 'left' ? 'right' : 'left';
}

function anchorOf(controller: ControllerState): THREE.Object3D {
  return controller.grip.visible ? controller.grip : controller.targetRay;
}
