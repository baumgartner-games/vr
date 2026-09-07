import * as THREE from 'three';
import {
  clearOfPlayer,
  type HandSphere,
  type PlayerBody,
  type PlayerCapsule,
} from './playerClearance';
import type { Collider, RigidBody, World } from '@dimforge/rapier3d-compat';

export type RapierModule = typeof import('@dimforge/rapier3d-compat');

/** Collision membership bits. */
export const GROUP_WORLD = 1 << 0;
/**
 * **Wer herumläuft** (`worlds/npc/Npc.ts`).
 *
 * Ein eigenes Bit und nicht `GROUP_PROP`, und der Grund ist eine einzige
 * Sorte Körper: die **Kugel**. Ein NPC ist in der Physik ein Zylinder mit 29 cm
 * Halbmesser, seine Trefferzone rechnet dagegen mit dem Körper, den man sieht
 * (`npc/npcHit.ts`) — und eine Kugel, die an dem breiten Zylinder abprallt,
 * kommt an der schmalen Zone nie an. Sie blieb kurz davor stehen, sprang
 * zurück und richtete nichts aus: „Ich treffe ihn, aber es passiert nichts."
 * Mit diesem Bit fliegen Kugeln durch NPCs hindurch, und wer wirklich
 * getroffen hat, entscheidet die Strecke.
 */
export const GROUP_NPC = 1 << 1;
export const GROUP_PROP = 1 << 2;
export const GROUP_PLAYER = 1 << 3;
export const GROUP_HAND = 1 << 4;

/**
 * Every surface that can hold a portal gets a bit of its own. A portal only
 * opens up *its* wall, so standing in front of one no longer lets you sink
 * through the floor — that used to be one shared bit for all of them.
 */
const PORTAL_SURFACE_BASE = 5;
const PORTAL_SURFACE_SLOTS = 10;

/** Membership bit for the n-th portal surface. Wraps around when they run out. */
export function portalSurfaceGroup(index: number): number {
  return 1 << (PORTAL_SURFACE_BASE + (index % PORTAL_SURFACE_SLOTS));
}

export const ALL_GROUPS = 0xffff;

/** Rapier packs membership and filter into one 32 bit value. */
export function interactionGroups(membership: number, filter: number): number {
  return (((membership & 0xffff) << 16) | (filter & 0xffff)) >>> 0;
}

let modulePromise: Promise<RapierModule> | null = null;

/** Loads and initialises Rapier once (the wasm is inlined in the compat build). */
export function loadRapier(): Promise<RapierModule> {
  if (!modulePromise) {
    modulePromise = import('@dimforge/rapier3d-compat').then(async (module) => {
      await module.init();
      return module;
    });
  }
  return modulePromise;
}

/**
 * Collider silhouette. `halfExtents` gives the size for all of them.
 *
 * Die **Hülle** ist die einzige, die etwas mitbringt: die Ecken des Netzes, aus
 * denen Rapier den konvexen Körper rechnet. Gebraucht wird sie von allem, was
 * weder Kasten noch Kugel ist und trotzdem liegen bleiben soll — ein W20 als
 * Kugel rollt bis zur Wand, ein Keil als Kasten ist keine Rampe. Der Puffer ist
 * die **Vorlage** und wird beim Skalieren an Ort und Stelle mitgezogen, damit
 * `resize` nichts über die ursprüngliche Größe wissen muss.
 */
export type ColliderShape =
  | { kind: 'box' }
  | { kind: 'ball' }
  | { kind: 'cylinder' }
  | { kind: 'cone' }
  | { kind: 'hull'; points: Float32Array };

export interface BodyOptions {
  /** Half extents; taken from the mesh geometry when omitted. */
  halfExtents?: THREE.Vector3;
  /** Collider silhouette, a box by default. */
  shape?: ColliderShape;
  mass?: number;
  friction?: number;
  restitution?: number;
  linearDamping?: number;
  angularDamping?: number;
  membership?: number;
  filter?: number;
  ccd?: boolean;
}

export interface PhysicsBody {
  object: THREE.Object3D;
  body: RigidBody;
  collider: Collider;
  /** Half size of the collider — the reach test grows this by a fixed margin. */
  halfExtents: THREE.Vector3;
  /** Silhouette of the collider, kept so it can be resized later. */
  shape: ColliderShape;
  /** Surface bits this body currently phases through (portal funnels). */
  phaseMask: number;
  /** Set while a hand holds the body — it then ignores the player capsule. */
  carried: boolean;
  /**
   * Losgelassen, aber noch **im Spieler** — es ignoriert Kapsel und Hände
   * weiter, bis es draußen ist (`playerClearance.ts`). Ohne das schießt ein
   * Ding, das man dicht am Körper losgelassen hat, quer durch die Halle, und
   * eines, das man einfach fallen lässt, aus der eigenen Faust davon.
   */
  clearing: boolean;
  /**
   * Set while the body is flying to a hand after a remote grab. It touches
   * nothing at all then, so the pull always arrives.
   */
  ghost: boolean;
  membership: number;
  filter: number;
  previousPosition: THREE.Vector3;
  /**
   * **Ob er schon aus der Welt genommen wurde** (`remove`).
   *
   * Ein Rapier-Körper, den es nicht mehr gibt, beantwortet keine Frage mehr,
   * sondern reißt die ganze wasm mit („recursive use of an object" —
   * `RuntimeError: unreachable`). Ein zweites `remove` desselben Eintrags wäre
   * genau das, und zwei Aufräumer, die beide gründlich sind, gibt es in diesem
   * Projekt öfter als einen: der Bestand räumt seine NPCs weg, die Welt ihre
   * Requisiten, und wer beides ist, kommt zweimal vorbei. Deshalb merkt sich
   * ein Eintrag, dass er weg ist, und das zweite Mal passiert nichts.
   */
  removed: boolean;
}

const FIXED_STEP = 1 / 60;
const MAX_STEPS = 4;

/**
 * Wie stark die Kante eines Zylinders gebrochen ist, in Metern (`colliderFor`).
 *
 * Sechs Zentimeter: hoch genug, dass jede Fuge und jede Schwelle, die auf der
 * Karte als eben gilt, auch wirklich eben ist — und klein genug, dass ein NPC
 * damit keine Stufe hinaufspaziert, die er eigentlich springen müsste
 * (`nav/navAgent.ts`, `stepUp` 0,35 m).
 */
const CYLINDER_BEVEL = 0.06;

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();

/**
 * Thin wrapper around a Rapier world: fixed time step, mesh syncing and the
 * collision-group bookkeeping the portals need.
 */
export class PhysicsWorld {
  readonly dynamicBodies: PhysicsBody[] = [];

  /**
   * Wo der Spieler steht, als Kapsel — `PhysicsLocomotion` schreibt sie jedes
   * Bild hierher, denn sie ändert sich mit jedem Schritt und mit jeder
   * Kniebeuge. `null` heißt: in dieser Welt läuft niemand herum.
   */
  playerCapsule: PlayerCapsule | null = null;

  /**
   * Und wo seine **Hände** sind, je eine Kugel, unter dem Namen ihrer Sonde.
   *
   * Die Hände gehören zum Körper: was aus ihnen fällt, steckt im selben
   * Augenblick noch in ihnen, und die Sonde an der Fingerspitze ist ein fester
   * Kasten (`PortalWorld.placeProbe`). Wer die Sonden setzt, meldet sie hier —
   * eine Welt ohne Hände lässt die Karte leer.
   */
  private readonly playerHands = new Map<string, HandSphere>();

  /** Der Spieler als ein Stück, für die Räumung. Wiederverwendet, nicht neu gebaut. */
  private readonly wholePlayer: { capsule: PlayerCapsule | null; hands: HandSphere[] } = {
    capsule: null,
    hands: [],
  };

  private accumulator = 0;

  private constructor(
    readonly rapier: RapierModule,
    readonly world: World,
  ) {}

  static async create(gravity = -9.81): Promise<PhysicsWorld> {
    const rapier = await loadRapier();
    const world = new rapier.World({ x: 0, y: gravity, z: 0 });
    return new PhysicsWorld(rapier, world);
  }

  /** Was die Welt nach unten zieht, in m/s² (negativ). */
  get gravityY(): number {
    return this.world.gravity.y;
  }

  /**
   * Stellt die Schwerkraft um — mitten im Betrieb, denn genau darum geht es:
   * ein Stapel Kisten, der eben noch stand, fällt bei Mondschwere anders
   * zusammen als bei Erdschwere, und das will man *sehen*, nicht neu laden.
   * Alles, was gerade schläft, wird geweckt: ein Rapier-Körper in Ruhe merkt
   * sonst nichts von der neuen Zahl.
   */
  setGravity(y: number): void {
    if (this.world.gravity.y === y) return;
    this.world.gravity = { x: 0, y, z: 0 };
    for (const entry of this.dynamicBodies) entry.body.wakeUp();
  }

  /** Reibung und Rückprall aller Objekte auf einen Schlag. */
  setMaterial(friction: number, restitution: number): void {
    for (const entry of this.dynamicBodies) {
      entry.collider.setFriction(friction);
      entry.collider.setRestitution(restitution);
    }
  }

  /**
   * Genau `count` feste Schritte, ohne Rücksicht auf die verstrichene Zeit —
   * das Einzelbild der Stoppuhr. Der Rest-Akku bleibt dabei, wo er ist: sonst
   * springt die Welt beim Weiterlaufen um den angesparten Bruchteil.
   */
  stepFixed(count = 1): void {
    for (let i = 0; i < count; i++) this.world.step();
  }

  /** Immovable collider matching the object's world transform. */
  addStatic(object: THREE.Object3D, options: BodyOptions = {}): PhysicsBody {
    return this.addBody(object, 'fixed', options);
  }

  /**
   * Ein **Gelände** als unbeweglicher Körper: ein Raster aus Höhen, das genau
   * so liegt wie das Mesh, das man davon sieht.
   *
   * Ein Berg aus Kisten ist keiner, und ein Dreiecksnetz mit fünfzigtausend
   * Dreiecken hat in Rapier eine bekannte Schwäche — an den Innenkanten
   * bleibt ein rollender Körper hängen. Ein Höhenfeld kennt seine Nachbarn und
   * hat das Problem nicht; dazu ist es das, was ein Gelände *ist*: pro Punkt
   * eine Höhe.
   *
   * Die Anordnung ist die von Rapier, und die ist es wert, hingeschrieben zu
   * werden, weil man sie nur durch Ausprobieren erfährt: `heights` hat
   * `(rows + 1) · (cols + 1)` Werte, der Wert für Zeile `i` (entlang **Z**,
   * von `-depth/2` bei `i = 0` bis `+depth/2`) und Spalte `j` (entlang **X**,
   * von `-width/2` bei `j = 0`) steht bei `heights[i + j · (rows + 1)]`. Das
   * Feld ist um den Ursprung des Objekts zentriert; `width` und `depth` sind
   * seine ganze Ausdehnung.
   */
  addHeightfield(
    object: THREE.Object3D,
    field: { rows: number; cols: number; heights: Float32Array; width: number; depth: number },
    options: Pick<BodyOptions, 'friction' | 'restitution' | 'membership' | 'filter'> = {},
  ): PhysicsBody {
    const { rapier, world } = this;
    object.updateWorldMatrix(true, false);
    object.matrixWorld.decompose(_position, _quaternion, _scale);
    const membership = options.membership ?? GROUP_WORLD;
    const filter = options.filter ?? ALL_GROUPS;

    const body = world.createRigidBody(
      rapier.RigidBodyDesc.fixed()
        .setTranslation(_position.x, _position.y, _position.z)
        .setRotation({ x: _quaternion.x, y: _quaternion.y, z: _quaternion.z, w: _quaternion.w }),
    );
    const desc = rapier.ColliderDesc.heightfield(
      field.rows,
      field.cols,
      field.heights,
      { x: field.width, y: 1, z: field.depth },
      rapier.HeightFieldFlags.FIX_INTERNAL_EDGES,
    )
      .setFriction(options.friction ?? 0.9)
      .setRestitution(options.restitution ?? 0.02)
      .setCollisionGroups(interactionGroups(membership, filter));
    const collider = world.createCollider(desc, body);

    let top = -Infinity;
    for (const height of field.heights) top = Math.max(top, height);
    return {
      object,
      body,
      collider,
      halfExtents: new THREE.Vector3(field.width / 2, Math.max(top, 0.01) / 2, field.depth / 2),
      shape: { kind: 'box' },
      phaseMask: 0,
      carried: false,
      clearing: false,
      ghost: false,
      membership,
      filter,
      previousPosition: _position.clone(),
      removed: false,
    };
  }

  /**
   * Free-falling body; the object's transform is driven by the simulation.
   *
   * Es entsteht **geräumt**: wo ein neuer Körper auftaucht, weiß niemand vorher,
   * und ein Ding, das im Spieler entsteht, wird sonst im ersten Schritt aus ihm
   * herausgeschossen. Das trifft nicht nur den magischen Beutel — ein
   * fallengelassenes Werkzeug entsteht buchstäblich in der Hand, und die ist am
   * Körper. Liegt es frei, ist der Zustand nach einem Schritt wieder weg.
   */
  addDynamic(object: THREE.Object3D, options: BodyOptions = {}): PhysicsBody {
    const entry = this.addBody(object, 'dynamic', options);
    entry.clearing = true;
    this.applyFilter(entry);
    this.dynamicBodies.push(entry);
    return entry;
  }

  /** Body that is moved by code but pushes dynamic bodies around (hands). */
  addKinematic(object: THREE.Object3D, options: BodyOptions = {}): PhysicsBody {
    return this.addBody(object, 'kinematic', options);
  }

  /**
   * Ein Bild Physik — und **wenn es keines gibt, wenigstens die Buchhaltung**.
   *
   * Rapier zieht die Collider ihren Körpern erst in `world.step()` nach. Solange
   * die Welt Schritte macht, fällt das niemandem auf; bei angehaltener Zeit
   * (`timeScale` 0, die Stoppuhr) macht sie keine — und dann steht der Collider
   * der Spielerkapsel für immer dort, wo die Uhr gedrückt wurde, während die
   * Kapsel selbst weiterwandert. Der Character-Controller tastet danach von der
   * alten Stelle aus und findet weder den Boden noch die Wand: Man fällt
   * hindurch und springt aus dem Stand endlos weiter, weil er einen immer noch
   * für stehend hält.
   *
   * Deshalb dieselbe Zeile, die auch ein Schritt als erstes täte. Sie kostet
   * nichts, wenn sich nichts bewegt hat, und sie ist der Unterschied zwischen
   * „die Zeit steht" und „die Welt ist weg": **Die Physik gilt weiter, sie
   * rechnet nur nichts mehr.**
   */
  step(dt: number): void {
    this.accumulator = Math.min(this.accumulator + dt, FIXED_STEP * MAX_STEPS);
    let stepped = false;
    while (this.accumulator >= FIXED_STEP) {
      this.world.step();
      this.accumulator -= FIXED_STEP;
      stepped = true;
    }
    if (!stepped) this.syncColliders();
    for (const entry of this.dynamicBodies) {
      if (entry.clearing) this.checkClearing(entry);
    }
  }

  /**
   * **Die Collider dorthin ziehen, wo ihre Körper stehen** — ohne zu rechnen.
   *
   * Rapier tut das sonst als erstes in `world.step()`, und alles, was zwischen
   * zwei Schritten einen Körper *versetzt*, muss es selbst tun: Abgefragt wird
   * nämlich der Collider, nicht der Körper. Wer den Spieler umsetzt und im
   * nächsten Bild den Character-Controller rechnen lässt, fragt sonst von der
   * **alten** Stelle aus — und bekommt eine Bewegung zurück, die zu einem
   * anderen Ort gehört. In der Brille war das ein Spieler, der nach einem
   * Portal fünf Zentimeter in den Boden gesetzt wurde.
   */
  syncColliders(): void {
    if (this.freed) return;
    this.world.propagateModifiedBodyPositionsToColliders();
  }

  /**
   * Ein losgelassenes Ding wieder fest machen, sobald es den Spieler verlassen
   * hat — die Kapsel *und* die Hände.
   *
   * Ohne beides gibt es niemanden, in dem es stecken könnte: eine Welt ohne
   * Fortbewegung und ohne Sonden (der Zuschauer, ein Test) schaltet sofort
   * zurück.
   */
  private checkClearing(entry: PhysicsBody): void {
    const t = entry.body.translation();
    if (!clearOfPlayer(this.playerBody(), t, entry.halfExtents.length())) return;
    entry.clearing = false;
    this.applyFilter(entry);
  }

  /** Kapsel und Hände in einem Stück — dieselbe Liste, jedes Bild neu gefüllt. */
  private playerBody(): PlayerBody {
    this.wholePlayer.capsule = this.playerCapsule;
    this.wholePlayer.hands.length = 0;
    for (const hand of this.playerHands.values()) this.wholePlayer.hands.push(hand);
    return this.wholePlayer;
  }

  /**
   * Wo eine Hand des Spielers gerade ist — `null` nimmt sie wieder heraus.
   *
   * Gemeint sind nur die **eigenen** Hände: was ein anderer Spieler mit seiner
   * anstößt, ist seine Sache, und in seiner Brille hält dieselbe Regel seine
   * Gegenstände zusammen.
   */
  setPlayerHand(
    key: string,
    position: { x: number; y: number; z: number } | null,
    radius = 0.03,
  ): void {
    if (!position) {
      this.playerHands.delete(key);
      return;
    }
    const hand = this.playerHands.get(key);
    if (!hand) {
      this.playerHands.set(key, { x: position.x, y: position.y, z: position.z, radius });
      return;
    }
    hand.x = position.x;
    hand.y = position.y;
    hand.z = position.z;
    hand.radius = radius;
  }

  /** Copies simulated transforms back onto the meshes. */
  sync(): void {
    for (const entry of this.dynamicBodies) {
      const t = entry.body.translation();
      const r = entry.body.rotation();
      entry.object.position.set(t.x, t.y, t.z);
      entry.object.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }

  /**
   * Lets a body fall through the surfaces named by `mask` — the walls the
   * portals it currently sits in front of are mounted on. 0 = solid again.
   */
  setPhasing(entry: PhysicsBody, mask: number): void {
    if (entry.phaseMask === mask) return;
    entry.phaseMask = mask;
    this.applyFilter(entry);
  }

  /**
   * A carried body stops interacting with the player, otherwise pulling a cube
   * towards yourself launches you across the room.
   *
   * Und beim **Loslassen** hört das nicht sofort auf: was noch im Spieler
   * steckt — in der Kapsel oder in der Hand —, bleibt weich, bis es draußen
   * ist. Ein Ding, das mitten im Körper wieder fest wird, wird im selben Bild
   * aus ihm herausgeschossen: genau das passierte mit allem, was man aus dem
   * magischen Beutel zog und gleich wieder losließ, und mit jedem Gegenstand,
   * den man einfach fallen ließ — die Sonde in der Fingerspitze ist auch ein
   * fester Körper (`playerClearance.ts`).
   */
  setCarried(entry: PhysicsBody, carried: boolean): void {
    if (entry.carried === carried) return;
    entry.carried = carried;
    // Wer loslässt, übergibt an die Räumung: erst wenn niemand mehr im Weg
    // steht, zählt der Spieler wieder mit. `checkClearing` nimmt es sofort
    // zurück, wenn das Ding ohnehin schon frei liegt.
    if (!carried) entry.clearing = true;
    this.applyFilter(entry);
    if (!carried) this.checkClearing(entry);
  }

  /**
   * A ghost body passes through everything. The remote grab uses it: an object
   * reeled in on a fixed path must not be knocked off course by the crate it
   * happens to fly past.
   */
  setGhost(entry: PhysicsBody, ghost: boolean): void {
    if (entry.ghost === ghost) return;
    entry.ghost = ghost;
    this.applyFilter(entry);
  }

  private applyFilter(entry: PhysicsBody): void {
    if (entry.ghost) {
      entry.collider.setCollisionGroups(interactionGroups(entry.membership, 0));
      return;
    }
    let filter = entry.filter;
    filter &= ~entry.phaseMask;
    // Rumpf **und** Hände: ein Ding in der Faust hat vom Fingerkasten so wenig
    // zu befürchten wie von der Kapsel (`playerClearance.ts`).
    if (entry.carried || entry.clearing) filter &= ~GROUP_PLAYER & ~GROUP_HAND;
    entry.collider.setCollisionGroups(interactionGroups(entry.membership, filter));
  }

  /**
   * Grows or shrinks a collider to match a rescaled mesh. The transform tool
   * needs it: a cube that looks twice as big has to feel twice as big too.
   */
  resize(entry: PhysicsBody, halfExtents: THREE.Vector3): void {
    entry.halfExtents.set(
      Math.max(halfExtents.x, 0.01),
      Math.max(halfExtents.y, 0.01),
      Math.max(halfExtents.z, 0.01),
    );
    const { rapier } = this;
    const half = entry.halfExtents;
    switch (entry.shape.kind) {
      case 'ball':
        entry.collider.setShape(new rapier.Ball(Math.max(half.x, half.y, half.z)));
        break;
      case 'cylinder':
        entry.collider.setShape(new rapier.Cylinder(half.y, Math.max(half.x, half.z)));
        break;
      case 'cone':
        entry.collider.setShape(new rapier.Cone(half.y, Math.max(half.x, half.z)));
        break;
      case 'box':
        entry.collider.setShape(new rapier.Cuboid(half.x, half.y, half.z));
        break;
      case 'hull':
        // Die Ecken selbst werden gezogen, nicht eine Zahl daneben: damit ist
        // der Puffer immer das, was der Collider gerade ist, und ein zweites
        // Skalieren rechnet nicht noch einmal von vorn.
        scalePoints(entry.shape.points, half);
        entry.collider.setShape(new rapier.ConvexPolyhedron(entry.shape.points));
        break;
    }
  }

  /**
   * **Einfrieren** — der Körper hält an, wo er ist, und fällt nicht.
   *
   * Für den einen Fall, den es dafür gibt: Während jemand an einer Welt baut,
   * ist ihr Boden nicht fest (`grid/GridWorld.ts`). Ohne diesen Handgriff
   * fielen alle Kisten der Welt durch ihn hindurch, während man an ihr malt,
   * und lägen hinterher als Haufen auf dem Boden bis zum Horizont.
   *
   * Ein eingefrorener Körper ist `fixed` — er nimmt weiter Platz weg und
   * lässt sich weiter anfassen, er bewegt sich nur nicht mehr von selbst.
   * Beim Auftauen bekommt er seine Ruhe mit: eine Kiste, die mit der
   * Geschwindigkeit von vorhin weiterflöge, hätte zwei Sekunden lang
   * dieselbe Richtung wie vor dem Bauen.
   *
   * Gibt zurück, ob sich wirklich etwas geändert hat — daran erkennt der
   * Aufrufer, welche Körper *er* eingefroren hat und also auch wieder
   * auftauen darf.
   */
  setFrozen(entry: PhysicsBody, frozen: boolean): boolean {
    if (entry.removed || this.freed) return false;
    const { RigidBodyType } = this.rapier;
    const want = frozen ? RigidBodyType.Fixed : RigidBodyType.Dynamic;
    // **Nur, was vorher das andere war.** Ein Aufzug ist kinematisch und ein
    // Türblatt fest; wer beide beim Auftauen zu Kisten machte, hätte danach
    // eine Welt, die zu Boden fällt.
    if (entry.body.bodyType() === want) return false;
    if (frozen && entry.body.bodyType() !== RigidBodyType.Dynamic) return false;
    entry.body.setBodyType(want, true);
    if (frozen) return true;
    entry.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    entry.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    return true;
  }

  remove(entry: PhysicsBody): void {
    // **Zweimal wegnehmen ist kein Wegnehmen mehr, sondern ein Absturz**
    // (`PhysicsBody.removed`) — und aus einer Welt, die es nicht mehr gibt,
    // nimmt man gar nichts mehr heraus. Ein Aufräumer, der beim Weltwechsel
    // eine Zeile zu spät kommt, soll sie nicht mitreißen.
    if (entry.removed || this.freed) return;
    entry.removed = true;
    const index = this.dynamicBodies.indexOf(entry);
    if (index >= 0) this.dynamicBodies.splice(index, 1);
    this.world.removeRigidBody(entry.body);
  }

  dispose(): void {
    if (this.freed) return;
    this.freed = true;
    this.dynamicBodies.length = 0;
    this.world.free();
  }

  /** Ob die wasm-Welt schon freigegeben ist (`dispose`). */
  private freed = false;

  private addBody(
    object: THREE.Object3D,
    kind: 'fixed' | 'dynamic' | 'kinematic',
    options: BodyOptions,
  ): PhysicsBody {
    const { rapier, world } = this;
    object.updateWorldMatrix(true, false);
    object.matrixWorld.decompose(_position, _quaternion, _scale);

    const half = options.halfExtents ?? halfExtentsOf(object, _scale);
    const membership = options.membership ?? GROUP_PROP;
    const filter = options.filter ?? ALL_GROUPS;

    const description =
      kind === 'fixed'
        ? rapier.RigidBodyDesc.fixed()
        : kind === 'dynamic'
          ? rapier.RigidBodyDesc.dynamic()
          : rapier.RigidBodyDesc.kinematicPositionBased();

    description
      .setTranslation(_position.x, _position.y, _position.z)
      .setRotation({ x: _quaternion.x, y: _quaternion.y, z: _quaternion.z, w: _quaternion.w });

    if (options.linearDamping !== undefined) description.setLinearDamping(options.linearDamping);
    if (options.angularDamping !== undefined) description.setAngularDamping(options.angularDamping);
    if (options.ccd) description.setCcdEnabled(true);

    const body = world.createRigidBody(description);

    const colliderDesc = colliderFor(rapier, options.shape ?? { kind: 'box' }, half)
      .setFriction(options.friction ?? 0.7)
      .setRestitution(options.restitution ?? 0.05)
      .setCollisionGroups(interactionGroups(membership, filter));
    if (options.mass !== undefined) colliderDesc.setMass(options.mass);

    const collider = world.createCollider(colliderDesc, body);

    return {
      object,
      body,
      collider,
      halfExtents: half.clone(),
      shape: options.shape ?? { kind: 'box' },
      phaseMask: 0,
      carried: false,
      clearing: false,
      ghost: false,
      membership,
      filter,
      previousPosition: _position.clone(),
      removed: false,
    };
  }
}

function colliderFor(
  rapier: RapierModule,
  shape: ColliderShape,
  half: THREE.Vector3,
): import('@dimforge/rapier3d-compat').ColliderDesc {
  switch (shape.kind) {
    case 'ball':
      return rapier.ColliderDesc.ball(Math.max(half.x, half.y, half.z));
    case 'cylinder': {
      // **Ein Zylinder mit gebrochener Kante** — und die Fase ist kein
      // Feinschliff, sondern der Unterschied zwischen einem NPC, der über eine
      // Fuge läuft, und einem, der davor stehen bleibt.
      //
      // Zwei gleich hohe Kästen, die aneinanderstoßen, sind zusammen eine
      // ebene Fläche — bis ein Zylinder darauf steht. Der sinkt beim Aufliegen
      // Bruchteile eines Millimeters ein, und schon steht die senkrechte
      // Seitenfläche des Nachbarkastens vor seiner scharfen Bodenkante: eine
      // Wand von zwanzig Mikrometern, und ein Zylinder steigt keine Stufe. Im
      // Navigationslabor hing die Puppe genau daran fest, an der Fuge zwischen
      // der obersten Rampenstufe und dem Podest daneben — sie stand oben, ihr
      // Weg zeigte über die Lücke, und sie rührte sich nicht mehr
      // (`navlab/labPhysics.test.ts`).
      //
      // Die Rundung nimmt der Kante genau diese Ecke: Was so hoch ist wie sie,
      // schiebt den Körper hinauf statt ihn zu blockieren. **Die Außenmaße
      // bleiben, wie sie waren** — der Rand wächst nach außen, also wird er
      // vom Halbmesser und von der halben Höhe abgezogen.
      const radius = Math.max(half.x, half.z);
      const round = Math.min(CYLINDER_BEVEL, radius / 2, half.y / 2);
      return rapier.ColliderDesc.roundCylinder(half.y - round, radius - round, round);
    }
    case 'cone':
      return rapier.ColliderDesc.cone(half.y, Math.max(half.x, half.z));
    case 'box':
      return rapier.ColliderDesc.cuboid(half.x, half.y, half.z);
    case 'hull':
      // Entartete Ecken (alle auf einer Ebene) haben keine Hülle; dann lieber
      // ein Kasten als ein Körper ohne Collider, der durch den Boden fällt.
      return (
        rapier.ColliderDesc.convexHull(shape.points) ??
        rapier.ColliderDesc.cuboid(half.x, half.y, half.z)
      );
  }
}

/**
 * Zieht eine Punktwolke auf eine neue halbe Größe — an Ort und Stelle.
 *
 * Gemessen wird an ihrer eigenen Ausdehnung und nicht an einer gemerkten
 * Ausgangsgröße: die Wolke *ist* der Maßstab, und damit landet zweimal
 * Verdoppeln genau dort, wo einmal Vervierfachen landet.
 */
function scalePoints(points: Float32Array, half: THREE.Vector3): void {
  const reach = [0, 0, 0];
  for (let index = 0; index < points.length; index++) {
    const axis = index % 3;
    reach[axis] = Math.max(reach[axis]!, Math.abs(points[index]!));
  }
  const factor = [half.x, half.y, half.z].map((value, axis) =>
    reach[axis]! > 1e-6 ? value / reach[axis]! : 1,
  );
  for (let index = 0; index < points.length; index++) {
    points[index] = points[index]! * factor[index % 3]!;
  }
}

function halfExtentsOf(object: THREE.Object3D, scale: THREE.Vector3): THREE.Vector3 {
  const mesh = object as THREE.Mesh;
  if (mesh.geometry) {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    _box.copy(mesh.geometry.boundingBox!);
    _box.getSize(_size);
    return new THREE.Vector3(
      Math.max((_size.x * Math.abs(scale.x)) / 2, 0.01),
      Math.max((_size.y * Math.abs(scale.y)) / 2, 0.01),
      Math.max((_size.z * Math.abs(scale.z)) / 2, 0.01),
    );
  }
  return new THREE.Vector3(0.1, 0.1, 0.1);
}
