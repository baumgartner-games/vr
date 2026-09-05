import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playPick } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';
import type { PhysicsBody } from '../../../physics/PhysicsWorld';

/** So weit reicht der Strahl. */
const RANGE = 25;
/** Wie schnell die Spule nach einem Schuss wieder aufgeladen ist. */
const COOLDOWN = 0.25;

const _tip = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();

/**
 * Die Duplizier-Waffe.
 *
 * Anzielen, Trigger — und daneben steht dasselbe noch einmal: Form, Farbe,
 * Material, Größe und Masse. Das ist das Werkzeug, das aus einem gebauten
 * Ding einen Stapel macht, ohne dass man ihn zwölfmal von Hand nachbaut, und
 * das Gegenstück zum Radiergummi.
 *
 * Der Rahmen um das Ziel ist wichtiger als er aussieht: die Kopie erscheint
 * *neben* dem Original, und ohne zu sehen, was gerade gemeint ist, verdoppelt
 * man in einem Stapel regelmäßig die falsche Kiste.
 *
 * **Grenze:** Was aus dem Beutel kam, kennt seine Sorte und wird deshalb auch
 * bei den Mitspielern gebaut. Was eine Welt selbst gebaut hat — eine
 * Zielscheibe, ein Hütchen —, kann die Gegenseite nicht nachbauen; solche
 * Kopien bleiben bewusst lokal, statt drüben als Loch zu erscheinen.
 */
export class DuplicatorTool extends Tool {
  override readonly toolId = 'duplicator';
  override readonly label = 'Duplizier-Waffe';

  private readonly beam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly marker: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  private readonly coil: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
  private readonly muzzle = new THREE.Object3D();
  private aimed: PhysicsBody | null = null;
  private charge = 1;

  constructor() {
    super();
    this.name = 'tool-duplicator';
    this.icon = 'cube';
    this.accent = 0x9d7bff;
    this.hint = 'Zielen · Trigger legt eine Kopie daneben';
    this.holdPosition.set(0, -0.015, 0.03);

    const shell = new THREE.MeshStandardMaterial({
      color: 0x2c3450,
      roughness: 0.5,
      metalness: 0.3,
    });
    const trim = new THREE.MeshStandardMaterial({
      color: 0x9d7bff,
      emissive: new THREE.Color(0x9d7bff).multiplyScalar(0.5),
      roughness: 0.35,
      metalness: 0.4,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.19), shell);
    body.position.set(0, 0.01, -0.05);
    this.add(body);

    // Derselbe Griff wie an der Pistole, an derselben Stelle in der Faust
    // (`grip.ts`). Vorher lehnte er hier um 0,18 rad nach *vorn* und damit 23°
    // gegen den der Pistole — bei derselben Faust für beide.
    this.mountGrip();

    // Zwei Ringe, zwischen denen es blitzt: die Kopie „entsteht" sichtbar.
    this.coil = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.006, 8, 20), trim);
    this.coil.position.set(0, 0.012, -0.14);
    this.add(this.coil);
    const back = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 8, 18), trim);
    back.position.set(0, 0.012, -0.1);
    this.add(back);

    this.muzzle.position.set(0, 0.012, -0.17);
    this.add(this.muzzle);

    this.beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: 0x9d7bff, transparent: true, opacity: 0.45 }),
    );
    this.beam.frustumCulled = false;
    this.beam.position.copy(this.muzzle.position);
    this.add(this.beam);

    this.marker = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: 0x9d7bff, transparent: true, opacity: 0.9 }),
    );
    this.marker.frustumCulled = false;
    this.marker.visible = false;
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.marker.parent !== host.root) host.root.add(this.marker);
  }

  override onStow(_host: ToolHost): void {
    this.marker.visible = false;
    this.aimed = null;
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    if (this.charge < 1) return;
    const target = this.aimed;
    if (!target) {
      host.notify('Nichts zum Verdoppeln getroffen');
      return;
    }
    const copy = host.duplicateProp(target);
    if (!copy) {
      host.notify('Das lässt sich nicht verdoppeln');
      return;
    }
    this.charge = 0;
    controller.pulse(0.6, 45);
    playPick(true);
    host.notify('Kopie steht daneben');
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    this.charge = Math.min(1, this.charge + dt / COOLDOWN);
    this.coil.material.emissiveIntensity = 0.4 + this.charge * 0.8;

    if (!controller || !this.heldBy) {
      this.marker.visible = false;
      this.aimed = null;
      return;
    }

    this.muzzle.getWorldPosition(_tip);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    this.aimed = host.aimAt(_tip, _direction, RANGE);

    if (!this.aimed) {
      this.marker.visible = false;
      this.beam.scale.z = 2;
      return;
    }

    const entry = this.aimed;
    entry.object.getWorldPosition(_scale);
    this.beam.scale.z = Math.max(0.2, _tip.distanceTo(_scale));
    this.marker.position.copy(_scale);
    this.marker.quaternion.copy(entry.object.getWorldQuaternion(_quaternion));
    this.marker.scale.copy(entry.halfExtents).multiplyScalar(2.06);
    this.marker.visible = true;
  }

  override disposeTool(): void {
    disposeToolTree(this);
    this.marker.geometry.dispose();
    this.marker.material.dispose();
    this.marker.removeFromParent();
  }
}
