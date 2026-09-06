import * as THREE from 'three';
import { Tool, disposeToolTree, grabMaterial, type ToolHost } from './Tool';
import { PaintBoard } from './PaintBoard';
import { playPick, playTone } from '../../../core/Audio';
import { GRAB_TINT } from '../../../core/colors';
import type { PaintSurface } from './paintCanvas';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** Wie weit man sie hinstellen kann, in Metern. */
const RANGE = 8;
/** Flacher als das ist kein Boden — auf einer Schräge steht keine Staffelei. */
const MIN_NORMAL_Y = 0.75;

/** Das Blatt: siebzig auf neunzig Zentimeter, wie eine echte Leinwand. */
const BOARD_W = 0.7;
const BOARD_H = 0.9;
/** Wo seine Mitte über dem Boden steht, und wie weit es sich zurücklehnt. */
const BOARD_Y = 1.24;
const BOARD_TILT = -0.1;
/**
 * **Wie weit das Blatt vor dem Dreibein steht** — und das ist die Zahl, an der
 * die Staffelei einmal gescheitert ist.
 *
 * Die Beine laufen von den Füßen zur Spitze zusammen und kreuzen dabei genau
 * die Höhe des Blattes: auf Bildmitte stehen die beiden vorderen noch sieben
 * Zentimeter vor der Achse, die Querlatte oben liegt bei zwei. Ein Blatt bei
 * 7,5 cm lag damit *im* Holz — von vorn sah man zwei Latten quer über der
 * Leinwand, und mit dem Pinsel malte man auf einen Balken.
 *
 * Fünfzehn Zentimeter räumen das aus, und sie sind kein Trick: eine echte
 * Staffelei stellt die Leinwand **vor** die Beine auf eine Ablage, nicht
 * zwischen sie. Die Ablage wandert deshalb mit (`LEDGE_Z`) — sonst stünde das
 * Blatt über ihrer Vorderkante in der Luft.
 */
const BOARD_Z = 0.15;
/** Der Rahmen dahinter, eine Blattdicke zurück. */
const BACKING_Z = BOARD_Z - 0.015;
/** Höhe der Ablage, auf der das Blatt aufsitzt, und wie weit sie vorsteht. */
const LEDGE_Y = 0.76;
const LEDGE_Z = 0.17;
/** Wie hoch die Beine zusammenlaufen. */
const APEX_Y = 1.78;

/**
 * **Die beiden Traggriffe** an den Enden der Ablage — und die Zahl daneben,
 * wie nah eine Hand ihnen kommen muss.
 *
 * Eine aufgestellte Staffelei stand bisher für immer dort, wo sie zufällig
 * hingekommen war: sie ist kein Prop, sie hat keinen Körper, und ein Ding ohne
 * Körper fasst keine Hand an. Zwei Griffe lösen das mit dem, was man ohnehin
 * tut — hinlangen und zupacken —, und sie sitzen dort, wo man eine Staffelei
 * wirklich anfasst: seitlich an der Ablage, unterhalb des Blattes. Weiter
 * außen als die Leinwand breit ist (0,35 m), damit man beim Zupacken nicht in
 * das Bild greift, und tiefer als ihre Unterkante (0,79 m), damit sie
 * überhaupt zu sehen sind.
 */
const HANDLE_X = 0.45;
const HANDLE_Y = LEDGE_Y;
/** Wie nah die Hand am Griff sein muss, um ihn zu fassen. */
const HANDLE_REACH = 0.17;

const WOOD = 0xb2854b;
const DARK_WOOD = 0x7a5730;

const _tip = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _head = new THREE.Vector3();
const _up = new THREE.Vector3(0, 0, 1);
const _hand = new THREE.Vector3();
const _handle = new THREE.Vector3();

/** Ob eine Hand nah genug an diesem Griff steht, um ihn zu fassen. */
function near(handle: THREE.Object3D, hand: THREE.Vector3): boolean {
  handle.getWorldPosition(_handle);
  return _handle.distanceToSquared(hand) <= HANDLE_REACH * HANDLE_REACH;
}

/**
 * **Die Staffelei**: das Werkzeug, das eine Leinwand hinstellt.
 *
 * Der Pinsel konnte bisher nur Dinge anstreichen — eine Kiste rot, eine Kugel
 * aus Glas. Malen konnte man nicht, weil es nichts gab, worauf ein Strich ein
 * Strich bleibt. Das hier ist dieses Etwas: ein Dreibein mit einem Blatt
 * darauf, das man irgendwo hinstellt und stehen lässt.
 *
 * In der Hand ist sie ein **zusammengelegtes Bündel** — drei Latten und die
 * gerollte Leinwand, am Standardgriff wie jedes andere Werkzeug. Wohin sie
 * kommt, zeigt ein Kreis auf dem Boden; der **Trigger** stellt sie dort auf,
 * mit dem Blatt zum Spieler.
 *
 * Und dann ist die **Hand wieder leer**: das Bündel geht an den Gürtel. Wer
 * eine Staffelei abgestellt hat, hat sie abgestellt — sie danach noch
 * mitzutragen ist ein Zustand, den man erst bemerkt, wenn man mit ihr
 * irgendwo hängenbleibt, und ein zweites Bündel auf dem Boden wäre eine
 * zweite Staffelei, die keine ist.
 *
 * Umstellen geht deshalb über die **beiden Traggriffe** an der Ablage: Hand
 * daran, greifen, und sie liegt wieder im Arm (`watchHandles`) — der nächste
 * Trigger stellt dieselbe woandershin. Eine zweite bekommt man, indem man eine
 * zweite aus dem Regal holt, und nicht dadurch, dass man zweimal drückt.
 *
 * `A`/`X` **wischt das Blatt leer**. Ohne das wäre der erste misslungene Strich
 * das Ende des Bildes, und man holte sich für jeden Versuch eine neue
 * Staffelei.
 *
 * Gemalt wird mit dem **Pinsel**, nicht mit ihr: Spitze ans Blatt (oder von
 * weiter weg daraufzielen), Trigger halten und ziehen. Die Farbe kommt von der
 * Palette an der anderen Hand. Die Staffelei weiß davon nichts — sie meldet der
 * Welt nur, dass hier eine Fläche steht, auf die man malen kann
 * (`Tool.paintSurface`), und die Welt reicht das an den Pinsel weiter.
 *
 * Sie ist **kein Hindernis**: man geht durch sie hindurch. Das ist kein
 * Versehen, sondern die Bedingung fürs Malen — eine Pinselspitze muss das Blatt
 * berühren dürfen, und ein Körper, der sie wegschiebt, verhindert genau das.
 */
export class EaselTool extends Tool {
  override readonly toolId = 'easel';
  override readonly label = 'Staffelei';

  /** Die aufgestellte Staffelei — im Raum, sobald sie steht. */
  private readonly stand = new THREE.Group();
  /** Das Bündel in der Hand. */
  private readonly pack = new THREE.Group();
  private readonly board: PaintBoard;
  /** Der Kreis, der zeigt, wo sie hinkommt. */
  private readonly marker: THREE.Group;
  /** Die beiden Traggriffe an der aufgestellten Staffelei. */
  private readonly handles: THREE.Object3D[] = [];
  private readonly ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private planted = false;
  /** Wohin sie diese Frame käme, oder `null` — der Trigger liest nur das hier. */
  private target: THREE.Vector3 | null = null;
  private readonly spot = new THREE.Vector3();

  constructor() {
    super();
    this.name = 'tool-easel';
    this.icon = 'palette';
    this.accent = WOOD;
    this.hint = 'Trigger stellt sie hin · Griffe nehmen sie wieder auf · A/X wischt das Blatt';

    const wood = new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.85 });
    const dark = new THREE.MeshStandardMaterial({ color: DARK_WOOD, roughness: 0.8 });

    // Derselbe Griff wie an der Pistole: ein Bündel Latten trägt man am
    // Bündel, und die Faust dazu ist die, die alle Werkzeuge teilen.
    this.mountGrip();

    // --- das Bündel in der Hand ---------------------------------------------
    this.pack.name = 'easel-pack';
    for (const [x, z] of [
      [-0.03, 0],
      [0.03, 0],
      [0, 0.045],
    ] as const) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.62, 0.022), wood);
      slat.position.set(x, 0.2, z);
      this.pack.add(slat);
    }
    // Die gerollte Leinwand, quer über dem Bündel.
    const roll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: 0xefe7d6, roughness: 0.95 }),
    );
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.34, 0.02);
    this.pack.add(roll);
    for (const y of [0.08, 0.32]) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 6, 16), dark);
      strap.rotation.x = Math.PI / 2;
      strap.position.set(0, y, 0.015);
      this.pack.add(strap);
    }
    this.add(this.pack);

    // --- die aufgestellte Staffelei ------------------------------------------
    // Ursprung auf dem Boden, Blatt nach +Z: beim Hinstellen wird sie um Y
    // gedreht, bis dieses +Z zum Spieler zeigt.
    this.stand.name = 'easel-stand';
    const apex = new THREE.Vector3(0, APEX_Y, 0);
    for (const foot of [
      new THREE.Vector3(-0.38, 0, 0.22),
      new THREE.Vector3(0.38, 0, 0.22),
      new THREE.Vector3(0, 0, -0.5),
    ]) {
      this.stand.add(leg(foot, apex, wood));
    }
    // Die Ablage, auf der das Blatt aufsitzt, und die Leiste darüber.
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.045, 0.14), dark);
    ledge.position.set(0, LEDGE_Y, LEDGE_Z);
    this.stand.add(ledge);
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.03), dark);
    brace.position.set(0, BOARD_Y + BOARD_H / 2 - 0.02, 0.02);
    this.stand.add(brace);

    // Der Rahmen hinter dem Blatt: ohne ihn schwebt eine Fläche in den Beinen.
    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD_W + 0.05, BOARD_H + 0.05, 0.02),
      dark,
    );
    backing.position.set(0, BOARD_Y, BACKING_Z);
    backing.rotation.x = BOARD_TILT;
    this.stand.add(backing);

    // Die Traggriffe: zwei Knäufe an den Enden der Ablage, in Greiffarbe —
    // dieselbe Farbe, die an jedem Werkzeug „hier anfassen" heißt.
    for (const side of [-1, 1]) {
      const handle = new THREE.Group();
      handle.name = `easel-handle-${side < 0 ? 'left' : 'right'}`;
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.13, 12),
        grabMaterial({ roughness: 0.6 }),
      );
      bar.rotation.z = Math.PI / 2;
      handle.add(bar);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 10), grabMaterial({}));
      knob.position.x = side * 0.075;
      handle.add(knob);
      handle.position.set(side * HANDLE_X, HANDLE_Y, LEDGE_Z);
      this.stand.add(handle);
      this.handles.push(handle);
    }

    this.board = new PaintBoard(BOARD_W, BOARD_H);
    this.board.position.set(0, BOARD_Y, BOARD_Z);
    this.board.rotation.x = BOARD_TILT;
    this.stand.add(this.board);
    this.add(this.stand);

    // --- der Kreis am Boden ---------------------------------------------------
    this.marker = new THREE.Group();
    this.marker.name = 'easel-marker';
    this.marker.visible = false;
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.36, 40),
      new THREE.MeshBasicMaterial({
        color: GRAB_TINT,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.marker.add(this.ring);
    this.refreshShape();
  }

  /** Die Leinwand — solange sie steht. Auf ein Bündel malt niemand. */
  override paintSurface(): PaintSurface | null {
    return this.planted ? this.board : null;
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.marker.parent !== host.root) host.root.add(this.marker);
    this.refreshShape();
  }

  override onStow(_host: ToolHost): void {
    this.blank();
    this.refreshShape();
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    if (!this.target) {
      host.notify('Kein Boden für die Staffelei');
      playTone({ type: 'square', from: 220, to: 130, duration: 0.08, gain: 0.05 });
      return;
    }
    this.plant(host, this.target);
    controller.pulse(0.6, 40);
    playPick(true);
  }

  /** `A`/`X`: das Blatt wieder leer. */
  override onPrimary(controller: ControllerState, host: ToolHost): void {
    this.board.wipe();
    controller.pulse(0.3, 20);
    playPick(false);
    host.notify(this.planted ? 'Leinwand gewischt' : 'Leinwand gewischt · Trigger stellt sie hin');
  }

  override update(_dt: number, host: ToolHost, controller: ControllerState | null): void {
    // Die aufgestellte Staffelei hört auf ihre Griffe — auch dann, wenn das
    // Werkzeug selbst längst am Gürtel hängt. Genau dafür läuft `update` für
    // *jedes* Werkzeug und nicht nur für die in einer Hand.
    if (this.planted && !this.heldBy) this.watchHandles(host);

    if (!this.heldBy || !controller || this.parked) {
      this.blank();
      this.refreshShape();
      return;
    }

    this.getWorldPosition(_tip);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    const surface = host.castSurface(_tip, _direction);
    if (!surface || surface.normal.y < MIN_NORMAL_Y || surface.point.distanceTo(_tip) > RANGE) {
      this.blank();
      return;
    }

    this.target = this.spot.copy(surface.point);
    this.marker.visible = true;
    this.marker.position.copy(surface.point);
    this.marker.quaternion.setFromUnitVectors(_up, surface.normal);
    this.marker.translateZ(0.012);
  }

  override disposeTool(): void {
    this.board.dispose();
    this.stand.removeFromParent();
    disposeToolTree(this.stand);
    this.marker.removeFromParent();
    disposeToolTree(this.marker);
    disposeToolTree(this);
  }

  /**
   * Hinstellen: der Ständer gehört ab jetzt dem Raum und nicht mehr dem
   * Werkzeug — wer die Staffelei wieder einsteckt, nimmt ihr Blatt nicht mit.
   */
  private plant(host: ToolHost, point: THREE.Vector3): void {
    if (this.stand.parent !== host.root) host.root.add(this.stand);
    this.stand.position.copy(point);
    // Wo sie steht, für den Fall, dass das Aufnehmen doch nicht klappt.
    if (point !== this.spot) this.spot.copy(point);
    // Das Blatt schaut den an, der sie hinstellt: eine Leinwand mit dem Rücken
    // zum Maler ist eine Staffelei, die man erst einmal umdrehen muss.
    host.ctx.rig.getHeadPosition(_head);
    this.stand.rotation.set(0, Math.atan2(_head.x - point.x, _head.z - point.z), 0);
    this.planted = true;
    this.refreshShape();
    // **Hingestellt ist hingestellt.** Was steht, gehört dem Raum, und die Hand
    // ist wieder leer: ein Bündel Latten, das man nach dem Aufstellen weiter
    // mit sich herumträgt, ist ein Zustand, den man erst bemerkt, wenn man
    // damit irgendwo hängenbleibt. Weggelegt wird es an den Gürtel und nicht
    // auf den Boden — dort läge sonst eine zweite Staffelei herum, die keine
    // ist.
    host.stowTool(this);
    host.notify('Staffelei steht · an den Griffen wieder aufnehmen');
  }

  /**
   * **Die Griffe der aufgestellten Staffelei**: eine Hand, die zupackt, hebt
   * sie wieder auf.
   *
   * Es ist derselbe Griffknopf wie überall, und mehr braucht es nicht: die
   * Hand liegt am Knauf, sie schließt sich, die Staffelei liegt wieder im Arm
   * — und der nächste Trigger stellt sie woandershin. Ohne das stünde eine
   * einmal aufgestellte Leinwand für immer dort, wo sie zufällig hingekommen
   * ist, denn sie ist mit Absicht **kein Prop**: sie hat keinen Körper, den
   * eine Hand anfassen könnte (man muss mit dem Pinsel hindurchgreifen
   * können).
   *
   * Eine Hand, die schon etwas hält, greift hier nicht zu: wer mit dem Pinsel
   * an der Leinwand steht, malt und räumt sie nicht ein.
   */
  private watchHandles(host: ToolHost): void {
    for (const hand of ['left', 'right'] as const) {
      if (host.heldTool(hand)) continue;
      const controller = host.ctx.input.get(hand);
      if (!controller?.tracked || !controller.squeeze.justPressed) continue;
      const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
      anchor.getWorldPosition(_hand);
      if (!this.handles.some((handle) => near(handle, _hand))) continue;
      this.lift(host, hand);
      controller.pulse(0.5, 32);
      return;
    }
  }

  /** Wieder in die Hand: der Ständer geht zurück ans Werkzeug, das Bild bleibt. */
  private lift(host: ToolHost, hand: Handedness): void {
    this.planted = false;
    // Zurück ans Werkzeug — dorthin, wo der Ständer gebaut wurde. Sonst zeigte
    // die Kopie im Regal nichts mehr.
    this.add(this.stand);
    this.stand.position.set(0, 0, 0);
    this.stand.rotation.set(0, 0, 0);
    this.refreshShape();
    if (!host.takeTool(this, hand)) {
      // Die Hand war doch nicht da: dann steht sie eben weiter, wo sie stand.
      this.plant(host, this.spot);
      return;
    }
    playPick(true);
    host.notify('Staffelei in der Hand · Trigger stellt sie neu hin');
  }

  /**
   * Was zu sehen ist: der ganze Ständer im Regal und dort, wo er steht — das
   * Bündel überall sonst.
   *
   * Eine Kopie, die **nirgends hängt**, ist die des Regals (dasselbe Zeichen
   * wie beim Hängegleiter): sie zeigt das Ding, um das es geht, und nicht
   * seine Verpackung. Was in einer Hand liegt oder im Raum herumliegt, ist
   * gepackt — eine Staffelei in Lebensgröße an der Hüfte wäre ein Bild, das
   * man nicht wieder los wird.
   */
  private refreshShape(): void {
    const shelf = !this.planted && !this.heldBy && this.parent === null;
    this.stand.visible = this.planted || shelf;
    this.pack.visible = !shelf;
    if (this.gripPart) this.gripPart.visible = !shelf;
  }

  private blank(): void {
    this.target = null;
    this.marker.visible = false;
  }
}

/** Ein Bein vom Fuß zum Kopf der Staffelei. */
function leg(from: THREE.Vector3, to: THREE.Vector3, material: THREE.Material): THREE.Mesh {
  const length = from.distanceTo(to);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.045, length, 0.045), material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  return mesh;
}
