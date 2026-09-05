import * as THREE from 'three';
import { GLOVE_BACK, GLOVE_WRIST, Tool, disposeToolTree, type ToolHost } from './Tool';
import { playTone } from '../../../core/Audio';
import { flightCommand } from './supermanFlight';
import { supermanSettings } from './gearStore';
import type { SupermanSettings } from './supermanSettings';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** How fast the hover drifts up and down, and how far. */
const BOB_RATE = 1.7;
const BOB_SPEED = 0.3;
/** Nur zum Anzeigen: bei diesem Tempo glüht die Manschette voll. */
const GLOW_SPEED = 12;

/** Dicke der Rückenplatte und die Höhe ihrer Oberseite — wie an den anderen Handschuhen. */
const PLATE = 0.016;
const TOP = GLOVE_BACK + PLATE;

const _hand = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _rigQuat = new THREE.Quaternion();
const _look = new THREE.Vector3();
const _flat = new THREE.Vector3();
const _body = new THREE.Vector3();
const _cross = new THREE.Vector3();
const _right = new THREE.Vector3();
const _velocity = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const WHITE = new THREE.Color(0xffffff);
const DEG = 180 / Math.PI;

/**
 * Supermanhandschuh: the room, from above.
 *
 * **Greifen** lifts you off the floor and leaves you hanging there, drifting
 * gently up and down. Nothing else happens — hovering is a place to think from,
 * and it is also the safe state to come back to.
 *
 * **Trigger** makes a fist and you go. The moment it goes down the hand's
 * position is remembered, and from then on the hand is an **aircraft stick**:
 *
 * - In the middle you are not flying. That is the resting place, and it is the
 *   one you can always come back to.
 * - Pushed forward you fly forward — wherever you are looking, pitch included,
 *   so a glance down is a dive. Lifting the hand lifts you.
 * - Pushed forward *and to the side* you fly a curve: sideways is not a
 *   sidestep, it is a **turn**, and the whole view comes round with it. That is
 *   what lets you stay in your chair and still end up facing somewhere else.
 * - Turning your **head** off the flight path does the same, the harder the
 *   faster you are going — look left while flying and you go into a left curve,
 *   exactly like a plane. Look ahead again and the curve stops, and by then
 *   "ahead" is the new direction.
 *
 * Let go of the trigger and you hover again, exactly where you got to.
 *
 * **Greifen** again drops you: gravity gets the body back, with the speed it
 * had, so letting go at the top of a climb is a real fall.
 *
 * Wie schnell das alles geht und wer welche Achse bedient, steht unter
 * *Einstellungen → Supermanhandschuh*: eine eigene Zahl für vorwärts,
 * rückwärts, hoch, runter und quer, eine Drehrate — und für jede der drei
 * Achsen die Wahl zwischen **Hand**, **Kopf**, beidem und aus. Volle Lehne ist
 * volle Fahrt, und volle Fahrt ist die eingestellte Zahl; vorher war es ein
 * fester Faktor, bei dem eine bequeme Handbewegung kaum drei Meter pro Sekunde
 * gab (`supermanSettings.ts`, gerechnet in `supermanFlight.ts`).
 *
 * The steering is the translation glove's, turned around: there the hand moves
 * a prop through the room, here it moves you.
 */
export class SupermanGloveTool extends Tool {
  override readonly toolId = 'superman-glove';
  override readonly label = 'Supermanhandschuh';

  private readonly cuff: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
  private readonly crest: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private readonly display: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  /** Off the ground. Everything else only matters while this is true. */
  private hovering = false;
  /**
   * Which hand wears it. Not `heldBy`: a tool is cleared off its hand *before*
   * it is told it has been put away, and a fist left behind on a hand nobody
   * clears is a fist for the rest of the session.
   */
  private side: Handedness | null = null;
  /**
   * Where the hand was when the trigger went down — the middle of the stick,
   * kept in **rig space**.
   *
   * It used to be a world position, and that quietly broke the whole glove: the
   * rig is what flies, so after a few seconds of flight the hand had travelled
   * tens of metres away from a mark that stayed nailed to the room, and every
   * turn of the view swung it further. The stick then read "full forward, hard
   * over" no matter where the hand actually was — which is exactly what "after
   * a moment I cannot steer any more" looks like from the inside. In rig space
   * the mark rides along with the player, so flying and turning leave it alone.
   */
  private origin: THREE.Vector3 | null = null;
  /** Seconds since take-off, for the bob. */
  private time = 0;
  private speed = 0;
  private drawn = '';
  /**
   * Die eingestellten Werte. Beim Bauen gelesen und bei jedem Abheben neu —
   * wer im Menü an der Geschwindigkeit dreht, will sie beim nächsten Start
   * spüren und nicht erst nach einem Neuladen.
   */
  private settings: SupermanSettings = supermanSettings();

  constructor() {
    super();
    this.name = 'tool-superman-glove';
    this.icon = 'superman';
    this.accent = 0xff4d5e;
    this.sticky = true;
    this.hint = 'Greifen schwebt · Trigger fliegt · Tempo im Menü';
    this.wear();

    const shell = new THREE.MeshStandardMaterial({
      color: 0x1f3f8a,
      roughness: 0.45,
      metalness: 0.35,
    });

    // A gauntlet: a plate over the back of the hand, a cuff around the wrist —
    // im Raum der **Hand** gebaut (`Tool.worn`): `GLOVE_BACK` ist die
    // Oberfläche des Handrückens, die Platte liegt also mit ihrer Unterseite
    // darauf und nicht mit ihrer Mitte.
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.07, PLATE, 0.1), shell);
    plate.position.set(0, GLOVE_BACK + PLATE / 2, -0.01);
    this.add(plate);
    for (const side of [-1, 1]) {
      const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.02, 0.02), shell);
      knuckle.position.set(side * 0.022, TOP - 0.005, -0.058);
      this.add(knuckle);
    }

    // **Die Manschette steht quer zum Unterarm**, wie eine Manschette es tut:
    // ein Ring in der XY-Ebene, den der Arm durchsteckt, und quer gedrückt,
    // damit er der Hand folgt statt als Reifen um sie herumzustehen. Sie lag
    // eine Weile **flach** (eine Vierteldrehung um X): ein waagerechter Teller
    // von 9 cm Durchmesser um das Handgelenk herum, der 4,6 cm hinter der Hand
    // in der Luft endete.
    this.cuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.034, 0.007, 10, 24),
      new THREE.MeshStandardMaterial({
        color: 0xff4d5e,
        emissive: new THREE.Color(0xff4d5e).multiplyScalar(0.35),
        roughness: 0.35,
        metalness: 0.4,
      }),
    );
    this.cuff.name = 'superman-cuff';
    this.cuff.scale.set(1, 0.62, 1);
    this.cuff.position.set(0, 0, GLOVE_WRIST);
    this.add(this.cuff);

    // The crest on the back of the hand, in the red that says who this is.
    this.crest = new THREE.Mesh(
      new THREE.CircleGeometry(0.019, 5),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, toneMapped: false }),
    );
    this.crest.position.set(0, TOP + 0.001, -0.02);
    this.crest.rotation.set(-Math.PI / 2, 0, 0);
    this.add(this.crest);

    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 96;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.display = new THREE.Mesh(
      new THREE.PlaneGeometry(0.07, 0.026),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false }),
    );
    this.display.position.set(0, TOP + 0.001, 0.014);
    this.display.rotation.x = -Math.PI / 2;
    this.add(this.display);
    this.draw();
  }

  override onTake(controller: ControllerState, _host: ToolHost): void {
    this.side = controller.handedness;
  }

  /** Greifen: off the ground, or back onto it. */
  override onGrab(controller: ControllerState, host: ToolHost): void {
    if (this.hovering) {
      this.land(host);
      host.notify('Gelandet');
      playTone({ type: 'sine', from: 620, to: 240, duration: 0.16, gain: 0.05 });
    } else {
      this.hovering = true;
      this.time = 0;
      this.origin = null;
      // Frisch aus dem Menü, bei jedem Abheben.
      this.settings = supermanSettings();
      host.notify('Schweben · Trigger fliegt, Blick lenkt');
      playTone({ type: 'triangle', from: 280, to: 820, duration: 0.18, gain: 0.05 });
    }
    controller.pulse(0.5, 35);
    this.draw();
  }

  /** `A` does the same as the grab button — whichever finger is free. */
  override onPrimary(controller: ControllerState, host: ToolHost): void {
    this.onGrab(controller, host);
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    if (!this.hovering) {
      host.notify('Erst greifen — dann fliegt der Trigger');
      return;
    }
    // The middle of the joystick is wherever the hand happens to be now.
    this.origin = handPosition(controller, new THREE.Vector3());
    host.ctx.rig.worldToLocal(this.origin);
    controller.pulse(0.4, 25);
    playTone({ type: 'square', from: 520, to: 900, duration: 0.1, gain: 0.04 });
    this.draw();
  }

  override onTriggerUp(_controller: ControllerState, _host: ToolHost): void {
    this.origin = null;
    this.draw();
  }

  override onStow(host: ToolHost): void {
    this.land(host);
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    if (!this.heldBy || !controller) {
      this.land(host);
      return;
    }
    if (!this.hovering) {
      this.speed = 0;
      this.setFist(host, false);
      return;
    }

    this.time += dt;
    // Letting go of the trigger while pointing at a panel swallows the event,
    // so the fist is also given up when the finger is simply found to be off.
    if (this.origin && !controller.trigger.pressed) this.origin = null;

    if (this.origin) {
      handPosition(controller, _hand);
      host.ctx.rig.worldToLocal(_hand);
      // Both ends in rig space; the difference goes back into the world, where
      // the look and the horizon it is measured against live.
      _offset
        .copy(_hand)
        .sub(this.origin)
        .applyQuaternion(host.ctx.rig.getWorldQuaternion(_rigQuat));
      // Forward is where the head looks *now*, so turning the head steers.
      host.ctx.rig.getHeadLook(_look);
      host.ctx.rig.getHeadForward(_flat);
      _right.copy(_flat).cross(UP);
      if (_right.lengthSq() < 1e-6) _right.set(1, 0, 0);
      _right.normalize();

      // Die Ausschläge, alle in derselben Einheit wie die Einstellungen: die
      // Lehne der Hand in Metern entlang der drei Achsen des Flugwegs, und die
      // zwei Winkel des Kopfes in Grad. Was daraus an Fahrt wird, rechnet
      // `supermanFlight.ts` — hier steht nur, was gemessen wurde.
      const command = flightCommand(
        {
          ahead: _offset.dot(_flat),
          lift: _offset.y,
          side: _offset.dot(_right),
          headPitch: Math.asin(THREE.MathUtils.clamp(_look.y, -1, 1)) * DEG,
          headYaw: this.headYaw(host),
        },
        this.settings,
      );

      // Vorwärts geht entlang des Blicks, Neigung inklusive: ein Blick nach
      // unten ist ein Sturzflug. Hoch und quer stehen senkrecht dazu.
      _velocity
        .set(0, 0, 0)
        .addScaledVector(_look, command.ahead)
        .addScaledVector(UP, command.lift)
        .addScaledVector(_right, command.side);
      if (command.turn !== 0) {
        host.ctx.rig.rotateAroundHead(command.turn * THREE.MathUtils.DEG2RAD * dt);
      }
    } else {
      // Hovering: standing still, breathing.
      _velocity.set(0, Math.sin(this.time * BOB_RATE) * BOB_SPEED, 0);
    }

    host.setFlight(_velocity);
    this.speed = _velocity.length();
    this.setFist(host, this.origin !== null);

    const glow = 0.35 + Math.min(1, this.speed / GLOW_SPEED) * 0.65;
    this.cuff.material.emissive.setHex(0xff4d5e).multiplyScalar(glow);
    this.crest.material.color.setHex(0xffd23f).lerp(WHITE, glow - 0.35);
    this.draw();
  }

  override disposeTool(): void {
    disposeToolTree(this);
    this.texture.dispose();
  }

  /**
   * Wie weit der Kopf vom Flugweg weg zeigt, in Grad, links herum positiv.
   *
   * Was hier steuert, ist der Winkel zwischen dem, wohin der *Körper* zeigt,
   * und dem, wohin der *Kopf* schaut. Eine Drehung des Rigs nimmt den Kopf
   * nicht mit, also behält er den Winkel, den er physisch hat: ein Kopf, der
   * gedreht bleibt, hält die Kurve, und wer wieder geradeaus schaut, beendet
   * sie. Genau so fliegt ein Flugzeug — und deshalb wächst der Anteil des
   * Kopfes mit dem Tempo, statt jemanden im Schweben um die eigene Achse zu
   * drehen, der sich nur umsieht (`supermanFlight.ts`).
   */
  private headYaw(host: ToolHost): number {
    _body.set(0, 0, -1).applyQuaternion(host.ctx.rig.quaternion);
    _body.y = 0;
    if (_body.lengthSq() < 1e-6) return 0;
    _body.normalize();
    return Math.atan2(_cross.copy(_body).cross(_flat).dot(UP), _body.dot(_flat)) * DEG;
  }

  /** Back on the floor, with whatever speed was left. */
  private land(host: ToolHost): void {
    if (!this.hovering) return;
    this.hovering = false;
    this.origin = null;
    this.speed = 0;
    host.setFlight(null);
    this.setFist(host, false);
    if (!this.heldBy) this.side = null;
    this.draw();
  }

  /** A hand that is flying is a fist, whatever it happens to be holding. */
  private setFist(host: ToolHost, closed: boolean): void {
    const side = this.heldBy ?? this.side;
    if (!side) return;
    host.ctx.hands.setFist(side, closed);
  }

  private draw(): void {
    // Whole metres per second: the canvas is redrawn when the line changes,
    // and a tenth that flickers every frame would redraw it every frame.
    const text = !this.hovering
      ? 'AUS'
      : this.origin
        ? `${Math.round(this.speed)} m/s`
        : 'SCHWEBEN';
    if (text === this.drawn) return;
    this.drawn = text;

    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 96);
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 88, 20);
    ctx.fillStyle = 'rgba(10, 14, 30, 0.9)';
    ctx.fill();
    ctx.strokeStyle = this.hovering ? '#ff4d5e' : '#48506a';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 40px system-ui, sans-serif';
    ctx.fillText(text, 128, 50);
    this.texture.needsUpdate = true;
  }
}

function handPosition(controller: ControllerState, target: THREE.Vector3): THREE.Vector3 {
  const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
  return anchor.getWorldPosition(target);
}
