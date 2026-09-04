import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playPick, playTone } from '../../../core/Audio';
import { MAX_SLOPE_DEG } from '../../../physics/PhysicsLocomotion';
import type { ControllerState } from '../../../core/XRInput';

/** Wie weit der Strahl reicht, in Metern. */
const RANGE = 30;

/** Wie groß der Kreis am Boden ist. */
const MARKER_RADIUS = 0.36;

/**
 * Wie flach eine Fläche sein muss, damit man dort stehen bleibt.
 *
 * Dieselbe Grenze, die auch beim Gehen gilt (`PhysicsLocomotion`): steiler
 * kommt man nicht hinauf, und wo man nicht hinaufkommt, bleibt man auch nicht
 * stehen, wenn einen jemand hinstellt — man landete und rutschte sofort ab.
 */
const MIN_NORMAL_Y = Math.cos(THREE.MathUtils.degToRad(MAX_SLOPE_DEG));

const _tip = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 0, 1);

const GOOD = 0x5ee0a0;
const BAD = 0xff6b6b;

/**
 * Teleporter: hinzeigen, Kreis ansehen, Trigger — und dort stehen.
 *
 * Der Stick trägt einen durch die Welt, aber er trägt einen **langsam**, und
 * über eine Fläche, die bis zum Horizont geht, ist das eine Wanderung. Die
 * Portalwaffe kann es besser, verlangt dafür aber zwei Schüsse und eine Wand,
 * die Portale hält. Hier ist die kurze Antwort auf dieselbe Frage: **dorthin**.
 *
 * Gezielt wird wie mit der Portalwaffe, entlang der Zielachse des Werkzeugs,
 * und was der Strahl trifft, ist entweder ein Platz oder keiner:
 *
 * - **Ein Kreis auf der Fläche** sagt, wo man landet — grün, wenn es geht. Ein
 *   Ziel ohne Kreis ist kein Ziel; man sieht es, bevor man drückt, statt es
 *   danach zu merken.
 * - **Rot** heißt: zu steil. Eine Wand ist kein Boden, und eine Böschung, die
 *   steiler steht als das, was man hinaufgeht, ist auch keiner — man landete
 *   darauf und rutschte im selben Moment wieder herunter.
 * - **Kein Kreis** heißt: dort ist nichts. Der Strahl reicht dreißig Meter,
 *   danach hört die Welt für ihn auf.
 *
 * Die **Blickrichtung bleibt**, wie sie war. Wer sich beim Teleportieren auch
 * noch gedreht vorfindet, muss sich hinterher erst wieder zurechtfinden — und
 * das ist genau das, was die Übelkeit macht, die ein Teleporter eigentlich
 * vermeiden soll.
 */
export class TeleportTool extends Tool {
  override readonly toolId = 'teleport';
  override readonly label = 'Teleporter';

  /** Wo der Strahl herauskommt. */
  private readonly muzzle = new THREE.Object3D();
  /** Der Kreis am Ziel — er hängt an der Welt, nicht am Werkzeug. */
  private readonly marker = new THREE.Group();
  private readonly ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly disc: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly pin: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>;
  /** Der Strahl vom Lauf bis zum Kreis. */
  private readonly beam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  /** Das Ziel dieser Frame, oder `null` — der Trigger liest nur das hier. */
  private target: THREE.Vector3 | null = null;
  private readonly hit = new THREE.Vector3();

  constructor() {
    super();
    this.name = 'tool-teleport';
    this.icon = 'teleport';
    this.accent = GOOD;
    this.hint = 'Zielen, Kreis ansehen, Trigger — die Blickrichtung bleibt';

    const shell = new THREE.MeshStandardMaterial({
      color: 0x2c3b52,
      roughness: 0.4,
      metalness: 0.5,
    });
    const glow = new THREE.MeshStandardMaterial({
      color: GOOD,
      roughness: 0.3,
      emissive: new THREE.Color(GOOD).multiplyScalar(0.8),
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.13), shell);
    body.position.set(0, 0.01, -0.04);
    this.add(body);

    // Ein Ring vorn statt eines Laufs: der Teleporter schießt nichts, er macht
    // ein Tor auf — und ein Ring sieht aus wie ein Tor.
    const gate = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.008, 8, 20), glow);
    gate.position.set(0, 0.01, -0.12);
    this.add(gate);

    // Derselbe Griff wie an der Pistole (`grip.ts`) — hier saß er ohnehin fast
    // richtig, jetzt sitzt er es.
    this.mountGrip('pistol');

    this.muzzle.position.set(0, 0.01, -0.13);
    this.add(this.muzzle);

    // --- das Ziel in der Welt -----------------------------------------------
    this.marker.name = 'teleport-marker';
    this.marker.visible = false;

    this.disc = new THREE.Mesh(
      new THREE.CircleGeometry(MARKER_RADIUS - 0.06, 40),
      new THREE.MeshBasicMaterial({
        color: GOOD,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.marker.add(this.disc);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(MARKER_RADIUS - 0.05, MARKER_RADIUS, 44),
      new THREE.MeshBasicMaterial({
        color: GOOD,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.marker.add(this.ring);

    // Ein Kegel über der Mitte, der nach unten zeigt: ein Kreis, den man von
    // der Seite sieht, ist ein Strich, und dann weiß niemand mehr, wo er
    // eigentlich hinzeigt.
    this.pin = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.18, 12),
      new THREE.MeshBasicMaterial({
        color: GOOD,
        transparent: true,
        opacity: 0.75,
        toneMapped: false,
      }),
    );
    this.pin.rotation.x = Math.PI / 2;
    this.pin.position.set(0, 0, 0.2);
    this.marker.add(this.pin);

    this.beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1),
      ]),
      new THREE.LineBasicMaterial({ color: GOOD, transparent: true, opacity: 0.55 }),
    );
    this.beam.name = 'teleport-beam';
    this.beam.frustumCulled = false;
    this.beam.visible = false;
    this.muzzle.add(this.beam);
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.marker.parent !== host.root) host.root.add(this.marker);
  }

  override onStow(_host: ToolHost): void {
    this.blank();
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    if (!this.target) {
      host.notify('Kein Platz zum Landen');
      playTone({ type: 'square', from: 220, to: 130, duration: 0.08, gain: 0.05 });
      return;
    }
    if (!host.teleportPlayer(this.target)) {
      host.notify('Jetzt gerade nicht');
      return;
    }
    controller.pulse(0.7, 45);
    playPick(true);
    playTone({ type: 'sine', from: 520, to: 980, duration: 0.14, gain: 0.05 });
  }

  /**
   * Jede Frame: wohin zeigt der Strahl, und taugt das als Platz?
   *
   * Gerechnet wird hier und nicht erst beim Trigger — der Kreis *ist* die
   * Antwort, und eine Antwort, die man erst nach dem Drücken bekommt, ist
   * keine.
   */
  override update(_dt: number, host: ToolHost, controller: ControllerState | null): void {
    if (!this.heldBy || !controller) {
      this.blank();
      return;
    }

    this.muzzle.getWorldPosition(_tip);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    const surface = host.castSurface(_tip, _direction);

    if (!surface || surface.point.distanceTo(_tip) > RANGE) {
      this.blank();
      return;
    }

    const walkable = surface.normal.y >= MIN_NORMAL_Y;
    this.target = walkable ? this.hit.copy(surface.point) : null;

    this.marker.visible = true;
    this.marker.position.copy(surface.point);
    // Der Kreis legt sich auf die Fläche: `RingGeometry` liegt in der XY-Ebene,
    // ihre Normale ist +Z, und die soll auf der Flächennormalen liegen.
    this.marker.quaternion.setFromUnitVectors(_up, surface.normal);
    // Ein Hauch Abstand, sonst streitet der Kreis mit der Fläche um die Tiefe.
    this.marker.translateZ(0.012);

    const color = walkable ? GOOD : BAD;
    this.ring.material.color.setHex(color);
    this.disc.material.color.setHex(color);
    this.pin.material.color.setHex(color);
    this.beam.material.color.setHex(color);
    this.beam.visible = true;
    this.beam.scale.z = _tip.distanceTo(surface.point);
  }

  override disposeTool(): void {
    disposeToolTree(this);
    disposeToolTree(this.marker);
    this.marker.removeFromParent();
    this.beam.geometry.dispose();
    this.beam.material.dispose();
  }

  private blank(): void {
    this.target = null;
    this.marker.visible = false;
    this.beam.visible = false;
  }
}
