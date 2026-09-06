import * as THREE from 'three';
import { disposeTree } from '../shared/environment';
import { npcSkin, type NpcKind, type NpcSkin } from './npcKinds';
import { HEAD_SHARE } from './npcHit';

/**
 * **Das Modell eines NPC** — die Haut aus `npcKinds.ts`, gebaut.
 *
 * Ein Körper aus Klötzen und zwei Kugeln, und mehr soll es auch nicht sein:
 * Was einen NPC ausmacht, ist, dass er sich bewegt, und ein Skelett mit
 * Gelenken an den richtigen Stellen bewegt sich besser als ein gekaufter
 * Charakter, der still steht. Die Gelenke sind vier: zwei Hüften, zwei
 * Schultern, jedes eine eigene Gruppe, deren X-Drehung der Schritt ist.
 *
 * **Der Ursprung liegt zwischen den Füßen.** Alles, was mit einem NPC
 * rechnet — der Collider, die Trefferzonen (`npcHit.ts`), der Punkt, an dem
 * er gesetzt wird —, rechnet von der Standfläche aus. Ein Modell, dessen
 * Ursprung in der Mitte steckt, versinkt bei jeder dieser Rechnungen zur
 * Hälfte im Boden.
 *
 * **In den Händen sitzt je ein leerer Anker** (`hands`). Er trägt heute
 * nichts; er ist die Stelle, an der später ein Werkzeug hängt — ein NPC mit
 * einer Schusswaffe ist genau das: dieselbe `Tool`-Instanz wie in einer
 * Spielerhand, nur an diesem Anker statt am Griffraum eines Controllers. Dass
 * der Anker schon jetzt da ist und richtig mitschwingt, ist der Unterschied
 * zwischen „später einhängen" und „später umbauen".
 */
export class NpcBody extends THREE.Group {
  readonly skin: NpcSkin;

  /** Die vier Gelenke, deren X-Drehung den Gang macht. */
  private readonly legLeft = new THREE.Group();
  private readonly legRight = new THREE.Group();
  private readonly armLeft = new THREE.Group();
  private readonly armRight = new THREE.Group();
  /** Der Rumpf samt allem darüber — er wiegt beim Gehen mit. */
  private readonly chest = new THREE.Group();
  private readonly head = new THREE.Group();

  /**
   * Wo ein Werkzeug hinkäme, je Hand. Leer, bis jemand eines hineinhängt —
   * siehe der Klassenkommentar.
   */
  readonly hands: { left: THREE.Object3D; right: THREE.Object3D };

  /** Die Augen — sie leuchten, sobald das Hirn den Spieler bemerkt hat. */
  private readonly eyes: THREE.MeshStandardMaterial;

  /**
   * Der **Schädel**, offen daliegend: `npcBody.test.ts` misst an ihm nach, dass
   * die Trefferzone aus `npcHit.ts` wirklich dort liegt, wo der Kopf zu sehen
   * ist. Zwei Rechnungen, die dasselbe meinen, prüft man aneinander.
   */
  readonly skull: THREE.Mesh<THREE.SphereGeometry, THREE.Material>;

  /** Die Phase des Schritts, in Bogenmaß. */
  private phase = 0;
  /** Wie weit der Arm gerade ausholt: 0 = hängt, 1 = trifft. */
  private strike = 0;

  constructor(kind: NpcKind) {
    super();
    const skin = npcSkin(kind);
    this.skin = skin;
    this.name = `npc-${skin.id}`;

    const flesh = new THREE.MeshStandardMaterial({ color: skin.palette.skin, roughness: 0.85 });
    const cloth = new THREE.MeshStandardMaterial({ color: skin.palette.cloth, roughness: 0.95 });
    this.eyes = new THREE.MeshStandardMaterial({
      color: skin.palette.eye,
      roughness: 0.4,
      emissive: new THREE.Color(skin.palette.eye).multiplyScalar(0.25),
    });

    // Die Maße hängen alle an der Körperhöhe: eine Haut, die morgen 1,4 m groß
    // ist, ist dann ein Kind und kein zerquetschter Erwachsener.
    const h = skin.height;
    const hip = h * 0.47;
    const shoulder = h * 0.8;
    const width = skin.radius * 1.55;
    const legLength = hip;
    const armLength = h * 0.34;
    // Dieselbe Zahl, aus der die Trefferzone gerechnet wird: der Kopf, den man
    // sieht, *ist* der Kopf, auf den man zielt (`npcHit.ts`).
    const headRadius = h * HEAD_SHARE;

    const box = (
      w: number,
      height: number,
      d: number,
      material: THREE.Material,
    ): THREE.Mesh<THREE.BoxGeometry, THREE.Material> =>
      new THREE.Mesh(new THREE.BoxGeometry(w, height, d), material);

    // --- Beine ----------------------------------------------------------------
    for (const [group, side] of [
      [this.legLeft, -1],
      [this.legRight, 1],
    ] as const) {
      group.position.set((side * width) / 4, hip, 0);
      const limb = box(width * 0.34, legLength, skin.radius * 0.72, cloth);
      // Der Klotz hängt am Gelenk und dreht sich um dessen Achse, also sitzt
      // seine Mitte eine halbe Länge darunter.
      limb.position.y = -legLength / 2;
      group.add(limb);
      const foot = box(width * 0.36, h * 0.045, skin.radius * 1.15, cloth);
      foot.position.set(0, -legLength + h * 0.02, -skin.radius * 0.14);
      group.add(foot);
      this.add(group);
    }

    // --- Rumpf ---------------------------------------------------------------
    this.chest.position.y = hip;
    this.add(this.chest);
    const torso = box(width, shoulder - hip, skin.radius * 1.05, cloth);
    torso.position.y = (shoulder - hip) / 2;
    this.chest.add(torso);

    // --- Kopf ----------------------------------------------------------------
    this.head.position.y = shoulder - hip;
    this.chest.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 16, 12), flesh);
    this.skull = skull;
    // Die Kugel sitzt so, dass ihr Scheitel genau die Körperhöhe erreicht —
    // dieselbe Rechnung wie in `headOf`, sonst zielt man daneben.
    skull.position.y = h - headRadius - shoulder;
    this.head.add(skull);
    for (const side of [-1, 1] as const) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 0.2, 10, 8), this.eyes);
      // Die Augen sitzen im Gesicht und nicht im Nacken: -Z ist vorne.
      eye.position.set(
        side * headRadius * 0.38,
        skull.position.y + headRadius * 0.18,
        -headRadius * 0.82,
      );
      this.head.add(eye);
    }

    // --- Arme ----------------------------------------------------------------
    this.hands = { left: new THREE.Object3D(), right: new THREE.Object3D() };
    for (const [group, side, hand] of [
      [this.armLeft, -1, this.hands.left],
      [this.armRight, 1, this.hands.right],
    ] as const) {
      group.position.set((side * width) / 2, shoulder - hip, 0);
      // Ein Zombie streckt die Arme nach vorn; alles andere lässt sie hängen.
      // Es ist dieselbe Kette, nur um 80° vorgedreht.
      group.rotation.x = skin.arms === 'out' ? -Math.PI * 0.44 : 0;
      const limb = box(width * 0.28, armLength, width * 0.28, flesh);
      limb.position.y = -armLength / 2;
      group.add(limb);
      hand.position.y = -armLength;
      group.add(hand);
      this.chest.add(group);
    }
  }

  /**
   * Ein Bild des Gangs.
   *
   * @param speed wie schnell er gerade läuft, in m/s — daraus kommt der Takt.
   * @param striking ob er gerade zuschlägt.
   */
  update(dt: number, speed: number, striking: boolean): void {
    // Die Schrittfrequenz hängt am Tempo: langsam schlurft er, schnell hetzt
    // er. Sonst tanzt ein stehender NPC auf der Stelle.
    this.phase += dt * (2.6 + speed * 2.2);
    const swing = Math.min(0.7, speed * 0.42);
    const step = Math.sin(this.phase) * swing;

    this.legLeft.rotation.x = step;
    this.legRight.rotation.x = -step;
    // Der Rumpf wiegt halb so weit mit und im Gegentakt zum linken Bein.
    this.chest.rotation.y = -step * 0.18;
    this.chest.position.y = this.skin.height * 0.47 - Math.abs(step) * 0.03;

    this.strike = THREE.MathUtils.damp(this.strike, striking ? 1 : 0, 14, dt);
    const base = this.skin.arms === 'out' ? -Math.PI * 0.44 : 0;
    // Beim Schlagen holen beide Arme aus und kommen nach unten durch; sonst
    // pendeln sie gegen die Beine.
    const hit = this.strike * (Math.sin(this.phase * 3.4) * 0.5 + 0.5) * 0.9;
    const sway = (1 - this.strike) * -step * 0.6;
    this.armLeft.rotation.x = base - hit + sway;
    this.armRight.rotation.x = base - hit - sway;
  }

  /** Ob die Augen leuchten: der NPC hat jemanden bemerkt. */
  setAlert(alert: boolean): void {
    this.eyes.emissive.setHex(this.skin.palette.eye);
    this.eyes.emissive.multiplyScalar(alert ? 0.9 : 0.25);
  }

  /**
   * Umfallen: das Ganze kippt um die eigene Querachse und sinkt dabei ein
   * wenig ein. `t` läuft von 0 (steht) bis 1 (liegt).
   */
  setFallen(t: number): void {
    const eased = Math.min(1, Math.max(0, t));
    this.rotation.x = -eased * Math.PI * 0.5;
    this.position.y = -eased * this.skin.radius * 0.5;
  }

  dispose(): void {
    disposeTree(this);
    this.eyes.dispose();
  }
}
