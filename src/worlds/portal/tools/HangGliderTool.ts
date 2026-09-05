import * as THREE from 'three';
import { GlideTool, anchorOf, type GlideCommand } from './GlideTool';
import { disposeToolTree, type ToolHost } from './Tool';
import { createGripShape } from './grip';
import { gripFrame } from './gripFit';
import { HANG_GLIDER, BAR_NEUTRAL, barCommand, barTilt, type GlideParams } from './glideFlight';
import type { HoldPose } from './toolPose';
import type { Vec3 } from './aim';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** Halbe Breite des Steuerbügels — so weit liegen die Fäuste auseinander. */
export const BAR_HALF = 0.34;
/** So nah an der haltenden Hand muss die zweite sein, um am Bügel zu zählen. */
const BAR_REACH = 1.1;
/** Der Anstellwinkel des Segels gegen die Bahn, in Radiant, und was der Bügel daran ändert. */
const TRIM_ANGLE = 0.07;
const BAR_ANGLE = 0.14;
/** So lang ist ein Griff an der Stange — eine Faust und etwas Luft. */
const BAR_GRIP_LENGTH = 0.12;

const SAIL = 0xff8a2f;
const SAIL_INNER = 0xf4f6fa;
const TUBE = 0xd6dbe6;

/**
 * **Die Querstange als Griff**, im Rahmen jedes Griffs (`gripFit.ts`: Achse auf
 * +Y, Vorne auf -Z), im Raum des Werkzeugs: das Stück Bügel im Griffpunkt, als
 * Zylinder quer (x). Gehalten wie ein **Lenker**: von oben, der Handrücken
 * nach oben (+y), die Finger vorn herum, und der Daumen zur Mitte der Stange —
 * bei der rechten Hand, die das rechte Ende hält, also nach links (-x). Daraus
 * rechnet `core/gripFist.test.ts` die Faust (`GLIDER_HAND_POSE`), links
 * gespiegelt: dort zeigt der Daumen nach rechts, zur Mitte.
 *
 * Eine feste Lage, und das ist der Punkt: die Stange liegt in beiden Fäusten
 * gleich, und was sich ändert, wenn man sie kippt, ist der Flug — nicht die
 * Hand an der Stange.
 */
export const BAR_GRIP: HoldPose = {
  position: { x: 0, y: 0, z: 0 },
  rotation: gripFrame({ x: -1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }),
};
/** Wo die Stange in der Hand liegt: genau im Griffpunkt, in der Mitte der Faust. */
export const BAR_HOLD_POSITION: Vec3 = { x: 0, y: 0, z: 0 };

const _mid = new THREE.Vector3();
const _other = new THREE.Vector3();
const _right = new THREE.Vector3();
const _head = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

/**
 * **Hängegleiter**: ein Drachen, unter dem man hängt.
 *
 * Vom Gürtel genommen trägt man ihn auf den Schultern durch die Gegend; vom
 * **Trigger** (oder `A`) kommt der Anlauf, oder man läuft einfach über eine
 * Kante. Ab da hält man den **Steuerbügel** — mit einer Hand, besser mit
 * beiden: die zweite greift ans andere Ende der Querstange. Die Stange ist
 * die ganze Steuerung: **ziehen** heißt Nase runter und schneller, **drücken**
 * Nase hoch und langsamer (und irgendwann reißt die Strömung ab), **kippen**
 * legt den Flügel in die Kurve — auf die Seite, die dabei nach unten geht:
 * rechte Hand tiefer, Kurve nach rechts. Mit einer Hand kippt das
 * Handgelenk. Landen heißt: bis zum Boden gleiten. Die Zahlen stehen in
 * `glideFlight.ts` (mit Test).
 *
 * Die Stange hat **zwei Griffe mit fester Lage**, einen an jedem Ende, und in
 * der Faust liegt sie quer wie ein Lenker (`BAR_GRIP`). Eine Weile hing am
 * Bügel der Standardgriff, senkrecht unter einem Stück Rohr wie an einer
 * Lötpistole, und gelenkt wurde, indem man das Rohr seitlich vor dem Kopf
 * verschob — das fühlte sich an wie ein Pistolengriff, der zufällig an einem
 * Drachen hängt. Jetzt hält man die Stange, und die Stange kippt.
 *
 * Der Flügel hängt beim Fliegen **im Raum** und wird jedes Bild an die Hände
 * gestellt: der Bügel liegt in den Fäusten, das Segel darüber, gekippt und
 * geneigt, wie der Flug es sagt. Nur ein kurzes Stück Stange mit dem Griff
 * steckt als Werkzeug in der Hand. Dazu, solange man fliegt, eine **Geisterstange**
 * dort, wo die Mitte ist: waagerecht, in Ruhelage vor dem Kopf. Man sieht an
 * ihr, wie weit man gezogen, gedrückt und gekippt hat — ohne sie hält man den
 * Bügel irgendwo und wundert sich, warum es abwärts geht. Am Gürtel ist der
 * Drachen ein gepacktes Bündel — ein echter wird auch zum Rohr, wenn man ihn
 * trägt.
 */
export class HangGliderTool extends GlideTool {
  override readonly toolId = 'hang-glider';
  override readonly label = 'Hängegleiter';
  protected override readonly params: GlideParams = HANG_GLIDER;

  private readonly downtubes: THREE.Mesh[] = [];
  /** Die Geisterstange: die Ruhelage des Bügels, nur beim Fliegen zu sehen. */
  private readonly ghost: THREE.Group;
  /** Ob die zweite Hand gerade mit am Bügel ist. */
  private twoHanded = false;
  /** Trigger oder `A` seit dem letzten Bild: der Anlauf. */
  private launchWanted = false;

  constructor() {
    super();
    this.name = 'tool-hang-glider';
    this.icon = 'glider';
    this.accent = SAIL;
    this.hint = 'Trigger = Anlauf · Stange ziehen = schneller · kippen = Kurve';
    this.holdPosition.set(BAR_HOLD_POSITION.x, BAR_HOLD_POSITION.y, BAR_HOLD_POSITION.z);

    const tube = new THREE.MeshStandardMaterial({ color: TUBE, roughness: 0.4, metalness: 0.6 });
    const wire = new THREE.LineBasicMaterial({ color: 0x9aa4b8 });

    // Das Stück in der Faust: ein Griff auf der Querstange, die Stange durch
    // ihn hindurch. Quer, wie ein Lenker — und nicht der Standardgriff unter
    // einem Rohr, wie es eine Weile war.
    this.add(barGrip(), barStub(tube));

    // Der Ursprung des Flügels ist die Mitte des Steuerbügels: dorthin kommen
    // die Hände, alles andere hängt darüber.
    const hang = new THREE.Vector3(0, 1.45, 0.1);
    const nose = new THREE.Vector3(0, 1.55, -1.85);
    const tail = new THREE.Vector3(0, 1.45, 1.6);
    const tipL = new THREE.Vector3(-5.1, 1.9, 0.75);
    const tipR = new THREE.Vector3(5.1, 1.9, 0.75);
    const post = new THREE.Vector3(0, 2.3, 0);

    this.wing.add(sail(nose, tail, tipL, tipR));
    this.wing.add(strut(nose, tail, 0.03, tube), strut(nose, tipL, 0.028, tube));
    this.wing.add(strut(nose, tipR, 0.028, tube), strut(hang, post, 0.02, tube));
    // Der Querrohr zwischen den Leitkanten, ein Stück hinter der Nase.
    const midL = nose.clone().lerp(tipL, 0.55);
    const midR = nose.clone().lerp(tipR, 0.55);
    this.wing.add(strut(midL, midR, 0.024, tube));

    for (const side of [-1, 1] as const) {
      const foot = new THREE.Vector3(side * BAR_HALF, 0, 0);
      const down = strut(hang, foot, 0.018, tube);
      this.downtubes.push(down);
      this.wing.add(down);
    }
    // Die Querstange: das Rohr zwischen den Fäusten, und an beiden Enden ein
    // Griff — zwei, mit fester Lage, dort, wo die Hände hingehören.
    this.wing.add(
      strut(new THREE.Vector3(-BAR_HALF, 0, 0), new THREE.Vector3(BAR_HALF, 0, 0), 0.016, tube),
    );
    for (const side of [-1, 1] as const) {
      const grip = barGrip();
      grip.position.x = side * BAR_HALF;
      this.wing.add(grip);
    }

    // Verspannung: vom Kingpost nach oben, vom Bügel nach unten.
    for (const to of [nose, tail, tipL, tipR]) {
      this.wing.add(line(post, to, wire));
      this.wing.add(line(new THREE.Vector3(-BAR_HALF, 0, 0), to, wire));
      this.wing.add(line(new THREE.Vector3(BAR_HALF, 0, 0), to, wire));
    }

    // Gepackt: ein langes Bündel Segel um die Rohre, mit zwei Gurten.
    const bundle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.045, 0.62, 12),
      new THREE.MeshStandardMaterial({ color: SAIL, roughness: 0.85 }),
    );
    bundle.rotation.x = Math.PI / 2;
    this.pack.add(bundle);
    for (const z of [-0.18, 0.18]) {
      const strap = new THREE.Mesh(
        new THREE.TorusGeometry(0.052, 0.008, 6, 16),
        new THREE.MeshStandardMaterial({ color: 0x2c3348, roughness: 0.7 }),
      );
      strap.position.z = z;
      this.pack.add(strap);
    }

    this.ghost = ghostBar();
    this.ghost.visible = false;
  }

  /** Die zweite Hand zählt, sobald sie neben der ersten zudrückt. */
  override claimsHand(hand: Handedness): boolean {
    if (!this.heldBy || this.parked || hand === this.heldBy) return false;
    return this.twoHanded;
  }

  override onTrigger(_controller: ControllerState, _host: ToolHost): void {
    this.launchWanted = true;
  }

  override onPrimary(_controller: ControllerState, _host: ToolHost): void {
    this.launchWanted = true;
  }

  override onTake(controller: ControllerState, host: ToolHost): void {
    super.onTake(controller, host);
    // Die Geisterstange gehört dem Raum wie der Flügel: sie steht vor dem Kopf
    // und nicht an der Hand.
    host.root.add(this.ghost);
  }

  override onStow(host: ToolHost): void {
    this.setGesture(host, this.heldBy, false);
    this.setGesture(host, this.otherSide(), false);
    this.twoHanded = false;
    this.ghost.visible = false;
    this.ghost.removeFromParent();
    super.onStow(host);
  }

  protected override takeOffNote(): string {
    return 'Abgehoben · Stange ziehen = schneller, drücken = langsamer, kippen = Kurve';
  }

  protected override readCommand(
    _dt: number,
    host: ToolHost,
    controller: ControllerState,
  ): GlideCommand {
    const launch = this.launchWanted;
    this.launchWanted = false;

    const held = this.relativeToHead(host, controller);
    let ahead = held.ahead;
    let tilt: number;

    // Die zweite Hand: nah genug an der ersten und zugedrückt, dann ist die
    // Stange in beiden Fäusten — die Mitte zwischen ihnen zählt für vor und
    // zurück, und wie schief sie zwischen ihnen liegt, ist die Schräglage.
    const other = this.secondHand(host, controller);
    this.twoHanded = other !== null;
    if (other) {
      const rel = this.relativeToHead(host, other);
      ahead = (ahead + rel.ahead) / 2;
      const left = this.heldBy === 'left' ? held : rel;
      const right = this.heldBy === 'left' ? rel : held;
      tilt = barTilt(left.up, right.up, Math.abs(right.side - left.side));
    } else {
      // Mit einer Hand kippt das Handgelenk die Stange: ihre Achse ist das
      // Quer des Griffraums, und wie tief dessen rechte Seite hängt, ist die
      // Schräglage. Der Griffraum ist nicht gespiegelt, +x ist an beiden
      // Händen rechts.
      tilt = wristTilt(controller);
    }

    this.setGesture(host, this.heldBy, true);
    this.setGesture(host, this.otherSide(), this.twoHanded);

    const bar = barCommand(ahead, tilt);
    return { pitchUp: bar.pitchUp, roll: bar.roll, area: 1, flap: 0, launch };
  }

  protected override placeWing(host: ToolHost, controller: ControllerState): void {
    anchorOf(controller).getWorldPosition(_mid);
    // Schräglage nach rechts ist eine Drehung um die Bahn nach rechts herum,
    // und die ist in three.js negativ um Z.
    const bank = (-this.state.bank * Math.PI) / 180;
    const pitch = this.flying
      ? this.pitch + TRIM_ANGLE + this.command.pitchUp * BAR_ANGLE
      : TRIM_ANGLE;
    this.wing.quaternion.setFromEuler(_euler.set(pitch, this.yaw, bank, 'YXZ'));

    const other = this.twoHanded ? this.secondHand(host, controller) : null;
    if (other) {
      anchorOf(other).getWorldPosition(_other);
      _mid.add(_other).multiplyScalar(0.5);
    } else {
      // Der Bügel liegt mit einem Ende in der Faust; seine Mitte ist eine
      // halbe Breite weiter innen, entlang der Querachse des Flügels.
      _right.set(1, 0, 0).applyQuaternion(this.wing.quaternion);
      _mid.addScaledVector(_right, this.heldBy === 'left' ? BAR_HALF : -BAR_HALF);
    }
    this.wing.position.copy(_mid);
    this.placeGhost(host);
  }

  /**
   * Die Geisterstange in die Ruhelage: waagerecht, quer zur flachen
   * Blickrichtung, `BAR_NEUTRAL` vor dem Kopf — und auf der Höhe, auf der
   * der Bügel gerade liegt, denn die Höhe steuert nichts. Liegt der Bügel
   * genau in ihr, ist alles neutral; was daneben liegt, ist der Ausschlag.
   */
  private placeGhost(host: ToolHost): void {
    this.ghost.visible = this.flying;
    if (!this.flying) return;
    const rig = host.ctx.rig;
    rig.getHeadPosition(_head);
    rig.getHeadForward(_forward);
    _forward.y = 0;
    if (_forward.lengthSq() < 1e-6) _forward.set(0, 0, -1);
    _forward.normalize();
    this.ghost.position.copy(_head).addScaledVector(_forward, BAR_NEUTRAL);
    this.ghost.position.y = this.wing.position.y;
    this.ghost.quaternion.setFromEuler(
      _euler.set(0, Math.atan2(-_forward.x, -_forward.z), 0, 'YXZ'),
    );
  }

  protected override land(host: ToolHost, announce: boolean): void {
    super.land(host, announce);
    this.setGesture(host, this.otherSide(), false);
    this.ghost.visible = false;
  }

  override disposeTool(): void {
    this.ghost.removeFromParent();
    disposeToolTree(this.ghost);
    super.disposeTool();
  }

  /** Die andere Hand, wenn sie am Bügel ist: nah genug und zugedrückt. */
  private secondHand(host: ToolHost, controller: ControllerState): ControllerState | null {
    const side = this.otherSide();
    if (!side) return null;
    const other = host.ctx.input.get(side);
    if (!other?.tracked || !other.squeeze.pressed) return null;
    if (host.heldTool(side)) return null;
    anchorOf(controller).getWorldPosition(_mid);
    anchorOf(other).getWorldPosition(_other);
    return _mid.distanceTo(_other) < BAR_REACH ? other : null;
  }
}

/**
 * Wie schief eine Hand ihre Stange hält, in Grad: das Quer des Griffraums
 * (+x, an beiden Händen rechts) gegen die Waagerechte — positiv, wenn die
 * rechte Seite hängt.
 */
function wristTilt(controller: ControllerState): number {
  _right.set(1, 0, 0).applyQuaternion(anchorOf(controller).getWorldQuaternion(_quaternion));
  const flat = Math.hypot(_right.x, _right.z);
  return (Math.atan2(-_right.y, flat) * 180) / Math.PI;
}

/**
 * Ein Griff auf der Querstange: die Griff-Form mit der Achse auf x. Eine
 * Vierteldrehung um z legt das +Y der Form auf -X — die Daumenseite der rechten
 * Hand zur Mitte —, und das Vorne (-Z, die Rillen) bleibt vorn. Für das linke
 * Ende sähe die Drehung andersherum aus und die Form genauso: sie ist um ihre
 * Mitte symmetrisch, und ein Zylinder hat keine Seite.
 */
function barGrip(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'bar-grip';
  group.quaternion.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
  group.add(createGripShape({ length: BAR_GRIP_LENGTH }));
  return group;
}

/** Das Stück Stange durch den Griff in der Hand. */
function barStub(material: THREE.Material): THREE.Mesh {
  const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 10), material);
  stub.rotation.z = Math.PI / 2;
  stub.name = 'bar-stub';
  return stub;
}

/**
 * Die Geisterstange: durchsichtig weiß, so lang wie der Bügel, mit zwei
 * kurzen Marken dort, wo die Hände hingehören. Ohne Tiefenschreiben, damit
 * das Segel nicht in ihr flimmert.
 */
function ghostBar(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ghost-bar';
  const material = new THREE.MeshBasicMaterial({
    color: 0xf2f6ff,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, BAR_HALF * 2, 10), material);
  bar.rotation.z = Math.PI / 2;
  group.add(bar);
  for (const side of [-1, 1] as const) {
    const mark = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, BAR_GRIP_LENGTH, 12),
      material,
    );
    mark.rotation.z = Math.PI / 2;
    mark.position.x = side * BAR_HALF;
    group.add(mark);
  }
  return group;
}

/** Das Segel: je Seite ein weißes Feld am Kiel und ein orangefarbenes außen. */
function sail(
  nose: THREE.Vector3,
  tail: THREE.Vector3,
  tipL: THREE.Vector3,
  tipR: THREE.Vector3,
): THREE.Mesh {
  const midL = tail.clone().lerp(tipL, 0.5);
  const midR = tail.clone().lerp(tipR, 0.5);
  const inner = new THREE.Color(SAIL_INNER);
  const outer = new THREE.Color(SAIL);
  const positions: number[] = [];
  const colors: number[] = [];
  const triangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: THREE.Color) => {
    for (const p of [a, b, c]) {
      positions.push(p.x, p.y, p.z);
      colors.push(color.r, color.g, color.b);
    }
  };
  triangle(nose, tail, midL, inner);
  triangle(nose, midL, tipL, outer);
  triangle(nose, midR, tail, inner);
  triangle(nose, tipR, midR, outer);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.6,
      metalness: 0.05,
    }),
  );
  mesh.name = 'sail';
  return mesh;
}

/** Ein Rohr von A nach B. */
function strut(
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  material: THREE.Material,
): THREE.Mesh {
  const length = from.distanceTo(to);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  return mesh;
}

function line(
  from: THREE.Vector3,
  to: THREE.Vector3,
  material: THREE.LineBasicMaterial,
): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
  return new THREE.Line(geometry, material);
}
