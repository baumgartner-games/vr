import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playTone } from '../../../core/Audio';
import { canLoadModels } from '../../../core/chefFit';
import type { ControllerState } from '../../../core/XRInput';

/** Die gelbe Bombe mit Streifen aus _Platformer_ (`kaykit/platformer`). */
export const STUN_GRENADE_MODEL = 'platformer/yellow/bomb_A_yellow.glb';
/** So groß liegt sie in der Hand, in Metern — eine Faust voll. */
const SIZE = 0.1;

/**
 * **Die Blendgranate** — ein Knall und ein Blitz, die das Monster für ein
 * paar Sekunden betäuben, damit man wegrennen kann. Gewünscht (Oktober 2026):
 * _„ich glaube eine "blendgranate" bzw. betäubungsgranate gegen das monster
 * wäre gut, dass ein spieler diese aktiviern kann um das monster zu beträuben
 * um wegzurennen. die haben dann z. B. nur eine ladung?"_ — als Modell die
 * gelbe Bombe mit Streifen aus _Platformer_.
 *
 * **Eine Ladung.** Der Trigger zündet sie dort, wo die Hand sie hält; danach
 * ist sie leer (grau) und tut nichts mehr. Was sie trifft, entscheidet die
 * Welt: Das Werkzeug merkt sich nur, wo es gezündet wurde (`takeBlast`), und
 * die Station fragt das je Bild ab (`HauntingWorld.stepGrenades`).
 */
export class StunGrenadeTool extends Tool {
  override readonly toolId = 'stun-grenade';
  override readonly label = 'Blendgranate';

  /** Ob die eine Ladung schon weg ist. */
  spent = false;
  /** Wo gezündet wurde und noch niemand nachgesehen hat — `null` sonst. */
  private blast: THREE.Vector3 | null = null;
  private readonly body: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  private model: THREE.Object3D | null = null;
  private gone = false;

  constructor() {
    super();
    this.name = 'tool-stun-grenade';
    this.icon = 'tools';
    this.accent = 0xffd84a;
    this.hint = 'Trigger zündet · betäubt das Monster in der Nähe · eine Ladung';
    this.holdPosition.set(0, 0, -0.03);

    // Gebaut, bis das Modell da ist — und für immer ohne die Pakete.
    this.body = new THREE.Mesh(
      new THREE.SphereGeometry(SIZE / 2, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd84a, roughness: 0.5, metalness: 0.2 }),
    );
    this.add(this.body);
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(SIZE / 2, 0.006, 6, 24),
      new THREE.MeshStandardMaterial({ color: 0xd8342c, roughness: 0.5 }),
    );
    band.rotation.x = Math.PI / 2;
    this.body.add(band);
    this.dress();
  }

  /** Einmal: wo sie gezündet wurde — danach `null`, bis sie wieder eine Ladung hätte. */
  takeBlast(): THREE.Vector3 | null {
    const blast = this.blast;
    this.blast = null;
    return blast;
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    if (this.spent) {
      host.notify('Blendgranate ist leer.');
      controller.pulse(0.1, 10);
      return;
    }
    this.spent = true;
    this.blast = this.getWorldPosition(new THREE.Vector3());
    controller.pulse(1, 120);
    playTone({ type: 'square', from: 2400, to: 120, duration: 0.5, gain: 0.12 });
    this.showSpent();
  }

  override onTake(controller: ControllerState, _host: ToolHost): void {
    controller.pulse(0.3, 20);
  }

  /** Leer ist sie grau — das Modell geht, die gebaute Kugel bleibt, ohne Farbe. */
  private showSpent(): void {
    if (this.model) this.model.visible = false;
    this.body.visible = true;
    this.body.material.color.setHex(0x55585e);
  }

  private dress(): void {
    if (!canLoadModels()) return;
    void import('../../../core/kaykitModel').then(async (module) => {
      const model = await module.kaykitModel(STUN_GRENADE_MODEL);
      if (!model || this.gone) return;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      const scale = SIZE / Math.max(size.x, size.y, size.z, 1e-3);
      model.scale.multiplyScalar(scale);
      model.position.sub(centre.multiplyScalar(scale));
      model.name = 'stun-grenade-model';
      this.add(model);
      this.model = model;
      if (this.spent) this.showSpent();
      else this.body.visible = false;
    });
  }

  override disposeTool(): void {
    this.gone = true;
    disposeToolTree(this);
  }
}
