import * as THREE from 'three';
import { GlideTool, anchorOf, type GlideCommand } from './GlideTool';
import { grabMaterial, type ToolHost } from './Tool';
import { HANG_GLIDER, barCommand, type GlideParams } from './glideFlight';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** Halbe Breite des Steuerbügels — so weit liegen die Fäuste auseinander. */
const BAR_HALF = 0.34;
/** So nah an der haltenden Hand muss die zweite sein, um am Bügel zu zählen. */
const BAR_REACH = 1.1;
/** Der Anstellwinkel des Segels gegen die Bahn, in Radiant, und was der Bügel daran ändert. */
const TRIM_ANGLE = 0.07;
const BAR_ANGLE = 0.14;

const SAIL = 0xff8a2f;
const SAIL_INNER = 0xf4f6fa;
const TUBE = 0xd6dbe6;

const _mid = new THREE.Vector3();
const _other = new THREE.Vector3();
const _right = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

/**
 * **Hängegleiter**: ein Drachen, unter dem man hängt.
 *
 * Vom Gürtel genommen trägt man ihn auf den Schultern durch die Gegend; vom
 * **Trigger** (oder `A`) kommt der Anlauf, oder man läuft einfach über eine
 * Kante. Ab da hält man den **Steuerbügel** — mit einer Hand, besser mit
 * beiden: die zweite greift neben der ersten zu. Der Bügel ist die ganze
 * Steuerung: **ziehen** heißt Nase runter und schneller, **drücken** Nase hoch
 * und langsamer (und irgendwann reißt die Strömung ab), **zur Seite** legt
 * den Flügel in die Kurve — auf die Seite, zu der man schiebt. Landen heißt:
 * bis zum Boden gleiten. Die Zahlen stehen in `glideFlight.ts` (mit Test).
 *
 * Der Flügel hängt beim Fliegen **im Raum** und wird jedes Bild an die Hände
 * gestellt: der Bügel liegt in den Fäusten, das Segel darüber, gekippt und
 * geneigt, wie der Flug es sagt. Nur ein kurzes Stück Bügel steckt als
 * Werkzeug in der Hand. Am Gürtel ist er ein gepacktes Bündel — ein echter
 * Drachen wird auch zum Rohr, wenn man ihn trägt.
 */
export class HangGliderTool extends GlideTool {
  override readonly toolId = 'hang-glider';
  override readonly label = 'Hängegleiter';
  protected override readonly params: GlideParams = HANG_GLIDER;

  private readonly downtubes: THREE.Mesh[] = [];
  private readonly bar: THREE.Mesh;
  /** Ob die zweite Hand gerade mit am Bügel ist. */
  private twoHanded = false;
  /** Trigger oder `A` seit dem letzten Bild: der Anlauf. */
  private launchWanted = false;

  constructor() {
    super();
    this.name = 'tool-hang-glider';
    this.icon = 'glider';
    this.accent = SAIL;
    this.hint = 'Trigger = Anlauf · Bügel ziehen = schneller · zur Seite = Kurve';

    // Das Stück in der Faust: ein kurzes Rohr mit Griff, quer wie ein Lenker.
    const stub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.2, 10),
      new THREE.MeshStandardMaterial({ color: TUBE, roughness: 0.4, metalness: 0.6 }),
    );
    stub.rotation.x = Math.PI / 2;
    stub.position.z = 0.02;
    this.add(stub);
    this.mountGrip('rod', { length: 0.11 });

    const tube = new THREE.MeshStandardMaterial({ color: TUBE, roughness: 0.4, metalness: 0.6 });
    const wire = new THREE.LineBasicMaterial({ color: 0x9aa4b8 });

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
    this.bar = strut(
      new THREE.Vector3(-BAR_HALF, 0, 0),
      new THREE.Vector3(BAR_HALF, 0, 0),
      0.018,
      grabMaterial({ roughness: 0.8 }),
    );
    this.wing.add(this.bar);

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

  protected override takeOffNote(): string {
    return 'Abgehoben · Bügel ziehen = schneller, drücken = langsamer, schieben = Kurve';
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
    let side = held.side;

    // Die zweite Hand: nah genug an der ersten und zugedrückt, dann ist der
    // Bügel in beiden Fäusten und die Mitte zwischen ihnen zählt.
    const other = this.secondHand(host, controller);
    this.twoHanded = other !== null;
    if (other) {
      const rel = this.relativeToHead(host, other);
      ahead = (ahead + rel.ahead) / 2;
      side = (side + rel.side) / 2;
    } else {
      // Mit einer Hand liegt die Mitte des Bügels eine halbe Breite daneben.
      side += this.heldBy === 'left' ? BAR_HALF : -BAR_HALF;
    }

    this.setGesture(host, this.heldBy, true);
    this.setGesture(host, this.otherSide(), this.twoHanded);

    const bar = barCommand(ahead, side);
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
  }

  protected override land(host: ToolHost, announce: boolean): void {
    super.land(host, announce);
    this.setGesture(host, this.otherSide(), false);
  }

  override onStow(host: ToolHost): void {
    this.setGesture(host, this.heldBy, false);
    this.setGesture(host, this.otherSide(), false);
    this.twoHanded = false;
    super.onStow(host);
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
