import * as THREE from 'three';
import { NpcBody } from './NpcBody';
import { newBrainState, stepBrain, type BrainState, type Point } from './npcBrain';
import { brainOf, type BrainId, type BrainTuning } from './npcBrains';
import { hitZone, type HitBody, type HitZone } from './npcHit';
import { npcSkin, type NpcKind, type NpcSkin } from './npcKinds';
import {
  GROUP_PROP,
  ALL_GROUPS,
  type PhysicsBody,
  type PhysicsWorld,
} from '../../physics/PhysicsWorld';

/**
 * **Einer, der herumläuft** — Haut, Hirn und ein Körper in der Physik.
 *
 * Die drei Teile kommen von woanders und werden hier zusammengesteckt: das
 * **Modell** aus `NpcBody.ts`, die **Entscheidung** aus `npcBrain.ts`, der
 * **Körper** aus dem Rapier-Wrapper. Was hier steht, ist nur der Draht
 * dazwischen — und genau deshalb steht hier so wenig: alles, was man ohne
 * Brille prüfen kann, ist schon geprüft, bevor es hier ankommt.
 *
 * **Er ist ein dynamischer Körper mit gesperrter Drehung.** Ein Zylinder, der
 * fällt, gegen Wände stößt und sich schieben lässt wie jedes andere Ding im
 * Raum — nur kippt er nicht um, denn ein Zombie, der beim ersten Schubser auf
 * dem Rücken liegt, ist kein Gegner, sondern ein Kegel. Seine **Waagerechte**
 * setzt das Hirn jedes Bild, das **Senkrechte** bleibt bei der Schwerkraft:
 * darum fällt er von einer Kante und läuft trotzdem nicht in den Himmel.
 *
 * **Gedreht wird das Modell und nicht der Körper.** Die Drehung des Körpers
 * ist gesperrt, `physics.sync()` schreibt sie also als Einheitsdrehung in die
 * Gruppe zurück — wer den Gierwinkel dorthin schriebe, sähe ihn genau ein Bild
 * lang. Das Modell hängt deshalb *in* der Gruppe und dreht sich dort.
 */
export class Npc {
  readonly skin: NpcSkin;
  readonly brain: BrainId;
  /** Die Zahlen des Hirns — mit dem Tempo, das am Werkzeug eingestellt war. */
  readonly tuning: BrainTuning;

  /** Was `physics.sync()` bewegt: die Mitte des Colliders. */
  readonly holder = new THREE.Group();
  readonly model: NpcBody;
  readonly entry: PhysicsBody;

  /** Wer ihn gesetzt hat — ein Brutkäfig zählt daran seine eigenen Kinder. */
  readonly owner: object | null;

  health: number;
  readonly maxHealth: number;

  private readonly state: BrainState;
  private yaw: number;
  /** Wie lange er schon liegt, in Sekunden — `null`, solange er steht. */
  private dying: number | null = null;
  private speed = 0;
  private striking = false;

  constructor(options: {
    physics: PhysicsWorld;
    kind: NpcKind;
    brain: BrainId;
    /** Die Füße kommen hierhin. */
    at: THREE.Vector3;
    yaw?: number;
    /** Tempo und Leben, wie sie am Hirn-Werkzeug standen. */
    speed?: number;
    health?: number;
    owner?: object | null;
  }) {
    const skin = npcSkin(options.kind);
    this.skin = skin;
    this.brain = options.brain;
    const base = brainOf(options.brain).tuning;
    this.tuning = { ...base, speed: options.speed ?? base.speed };
    this.maxHealth = Math.max(1, options.health ?? skin.health);
    this.health = this.maxHealth;
    this.owner = options.owner ?? null;
    this.yaw = options.yaw ?? 0;
    this.state = newBrainState(this.yaw);

    this.model = new NpcBody(options.kind);
    // Der Ursprung des Modells liegt zwischen den Füßen, der des Körpers in
    // seiner Mitte — die halbe Höhe dazwischen ist der ganze Unterschied.
    this.model.position.y = -skin.height / 2;
    this.model.rotation.y = this.yaw;
    this.holder.name = `npc-${skin.id}-holder`;
    this.holder.add(this.model);
    this.holder.position.set(options.at.x, options.at.y + skin.height / 2, options.at.z);
    this.holder.updateWorldMatrix(true, false);

    this.entry = options.physics.addDynamic(this.holder, {
      shape: { kind: 'cylinder' },
      halfExtents: new THREE.Vector3(skin.radius, skin.height / 2, skin.radius),
      mass: skin.mass,
      // Wenig Reibung an den Flanken: ein Körper, der an einer Wand entlang
      // läuft, soll nicht daran kleben bleiben.
      friction: 0.25,
      restitution: 0,
      membership: GROUP_PROP,
      filter: ALL_GROUPS,
    });
    this.entry.body.lockRotations(true, true);
    this.entry.previousPosition.copy(this.holder.position);
  }

  /** Ob er noch steht. Ein Gefallener rechnet nicht mehr mit. */
  get alive(): boolean {
    return this.dying === null;
  }

  /** Wo seine Füße stehen — der Punkt, mit dem alle anderen rechnen. */
  feet(target: THREE.Vector3): THREE.Vector3 {
    const t = this.entry.body.translation();
    return target.set(t.x, t.y - this.skin.height / 2, t.z);
  }

  /** Sein Körper, so wie ihn eine Kugel sieht (`npcHit.ts`). */
  hitBody(): HitBody {
    const t = this.entry.body.translation();
    return {
      feet: { x: t.x, y: t.y - this.skin.height / 2, z: t.z },
      height: this.skin.height,
      radius: this.skin.radius,
    };
  }

  /** Wo eine Strecke ihn trifft — `null`, wenn sie vorbeigeht. */
  zoneOf(from: THREE.Vector3, to: THREE.Vector3): HitZone | null {
    if (!this.alive) return null;
    return hitZone(from, to, this.hitBody());
  }

  /**
   * Ein Bild.
   *
   * @param player wo der Spieler steht, in der Ebene — `null`, wenn keiner da
   *               ist (der Zuschauer, ein Spieler in der Drohne).
   * @returns `true`, wenn in dieser Frame ein Schlag landet.
   */
  update(dt: number, player: Point | null, random: () => number): boolean {
    if (this.dying !== null) {
      this.dying += dt;
      // Das Umfallen dauert eine halbe Sekunde, das Liegenbleiben besorgt der
      // Aufräumer im Regisseur.
      this.model.setFallen(this.dying / 0.5);
      this.model.update(dt, 0, false);
      return false;
    }

    const t = this.entry.body.translation();
    const step = stepBrain(
      this.brain,
      this.state,
      { at: { x: t.x, z: t.z }, yaw: this.yaw, player, dt, random },
      this.tuning,
    );

    // Die Waagerechte kommt vom Hirn, die Senkrechte von der Schwerkraft.
    const velocity = this.entry.body.linvel();
    this.entry.body.setLinvel({ x: step.vx, y: velocity.y, z: step.vz }, true);

    this.yaw = step.yaw;
    this.model.rotation.y = this.yaw;
    this.speed = Math.hypot(step.vx, step.vz);
    this.striking = step.gait === 'strike';
    this.model.update(dt, this.speed, this.striking);
    this.model.setAlert(step.sees);
    return step.attack;
  }

  /**
   * Schaden. `true`, wenn er daran gestorben ist.
   *
   * Wer stirbt, wird vom Regisseur im selben Zug aus der Physik genommen
   * (`unbody`): was liegt, ist ein Bild und kein Hindernis mehr — sonst
   * stolpert man über einen Zylinder, den man gerade umgelegt hat.
   */
  damage(amount: number): boolean {
    if (!this.alive) return false;
    this.health -= amount;
    if (this.health > 0) return false;
    this.health = 0;
    this.dying = 0;
    this.model.setAlert(false);
    return true;
  }

  /** Wie lange er schon liegt — der Regisseur räumt danach auf. */
  get restingFor(): number {
    return this.dying ?? 0;
  }

  /** Nimmt ihn aus der Physik heraus, ohne das Modell wegzuwerfen. */
  unbody(physics: PhysicsWorld): void {
    physics.remove(this.entry);
  }

  dispose(): void {
    this.model.dispose();
    this.holder.removeFromParent();
  }
}
