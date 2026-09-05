import * as THREE from 'three';
import { aimRotation } from './aim';
import { createGrip, type GripOptions } from './grip';
import { GRIP_HOLD_POSITION } from './gripFit';
import { GRAB_TINT, GRAB_TINT_EMISSIVE } from '../../../core/colors';
import { holdHandPose } from '../../../core/handPoseStore';
import type { ControllerState, Handedness } from '../../../core/XRInput';
import type { WorldContext } from '../../../core/types';
import type { MenuIcon } from '../../../ui/menu';
import type { PhysicsBody, PhysicsWorld } from '../../../physics/PhysicsWorld';
import type { PortalKey } from '../PortalSync';
import type { PropKind } from '../props';
import type { BeltOffset } from '../beltSettings';
import type { PropReport, PropStyle } from '../PortalWorld';
import type { Attachment } from './attachments';

const _euler = new THREE.Euler();
const DEG = Math.PI / 180;

/**
 * Wo an der gezeichneten Hand der **Handrücken** liegt und wo das
 * **Handgelenk** — für alles, was angezogen wird (`Tool.worn`).
 *
 * Die Handfläche der Boxhand (`core/HandVisuals.ts`) ist ein Kasten von
 * 2,8 cm Dicke um die Null, 9 cm lang und um einen Zentimeter nach vorn
 * gerückt; ihr Rücken liegt also bei +1,4 cm, ihr hinteres Ende bei +3,5 cm.
 * Eine Platte, die auf dem Handrücken liegen soll, liegt eine halbe Plattendicke
 * darüber; eine Manschette ums Handgelenk sitzt dahinter.
 */
export const GLOVE_BACK = 0.022;
export const GLOVE_WRIST = 0.045;

/** Where a ray met a wall, floor or ceiling. */
export interface SurfaceHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

/**
 * Everything a tool may ask of the room it is used in. Tools never reach into
 * the world directly — that way a tool can be built, tested and thrown away
 * without the world knowing what it does.
 */
export interface ToolHost {
  readonly ctx: WorldContext;
  /** Scene node the world's own objects hang on. */
  readonly root: THREE.Object3D;
  readonly physics: PhysicsWorld;
  /** Every prop currently in the room. */
  props(): readonly PhysicsBody[];
  notify(message: string): void;
  /** Places a portal along a ray, exactly as the belt guns do. */
  shootPortal(key: PortalKey, origin: THREE.Vector3, direction: THREE.Vector3): void;
  /** Nearest prop the ray enters. */
  aimAt(origin: THREE.Vector3, direction: THREE.Vector3, range?: number): PhysicsBody | null;
  /** Prop whose grab box contains this point. */
  propAt(point: THREE.Vector3): PhysicsBody | null;
  castSurface(origin: THREE.Vector3, direction: THREE.Vector3): SurfaceHit | null;
  /** 1 = normal speed, less = slow motion, more = time-lapse (max 4). */
  setTimeScale(scale: number): void;
  /**
   * Rechnet genau so viele feste Simulationsschritte, egal wie die Zeit sonst
   * steht. Bei angehaltener Zeit ist das das Einzelbild der Stoppuhr.
   */
  stepFrames(count: number): void;
  /** Merkt sich, wie alles gerade steht. Gibt zurück, wie viele Props das sind. */
  saveWorldSnapshot(): number;
  /** Stellt die gemerkte Aufstellung wieder her; die Zahl sagt, wie viele. */
  loadWorldSnapshot(): number;
  hasWorldSnapshot(): boolean;
  /** Legt eine Kopie eines Props daneben — Form, Farbe, Material und Masse. */
  duplicateProp(entry: PhysicsBody): PhysicsBody | null;
  /**
   * Ruft ein Objekt aus dem magischen Beutel herbei — genau dorthin, wo die
   * Hand ist, und bei allen in der Sitzung. Ohne Hand entsteht es vor dem Kopf.
   */
  conjureProp(kind: PropKind, hand: Handedness | null): void;
  /** Farbe und/oder Material eines Props, für alle in der Sitzung. */
  styleProp(entry: PhysicsBody, style: PropStyle): void;
  /** Alles, was über ein Prop zu erfahren ist — der Inspektor liest es ab. */
  inspectProp(entry: PhysicsBody): PropReport;
  /** Fires a bullet the world keeps track of and cleans up again. */
  spawnBullet(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    options?: BulletOptions,
  ): void;
  /** Repaints a prop, for everybody in the session. */
  paintProp(entry: PhysicsBody, color: number): void;
  /** Marks a prop as picked out, so the world can leave its glow alone. */
  setSelection(entries: readonly PhysicsBody[]): void;
  /** Reels a prop in to a hand, exactly like the remote grab does. */
  pullProp(entry: PhysicsBody, hand: Handedness): void;
  /** Shoves a prop away along a direction. */
  pushProp(entry: PhysicsBody, direction: THREE.Vector3, strength: number): void;
  /** Deletes a prop, for everybody in the session. */
  removeProp(entry: PhysicsBody): void;
  /** Ties two props together; `hinge` leaves one axis free. */
  weld(link: WeldRequest): boolean;
  /** Cuts every joint this prop is part of. Returns how many were cut. */
  unweld(entry: PhysicsBody): number;
  /** Throws the player's body along a velocity — the grappling hook reels. */
  launchPlayer(velocity: THREE.Vector3): void;
  /**
   * Takes the player off the ground and drives them by this velocity, gravity
   * and stick alike switched off; `null` gives the body back to both. The
   * Superman glove flies on it.
   */
  setFlight(velocity: THREE.Vector3 | null): void;
  /**
   * Ob die Füße gerade auf etwas stehen. Ein Gleiter fragt das jedes Bild:
   * solange ja, wird gelaufen; sobald nein, trägt der Flügel — und sobald
   * wieder ja, ist gelandet.
   */
  onGround(): boolean;
  /** Wie sich der Körper gerade bewegt, in m/s — der Schwung, mit dem man abhebt. */
  playerVelocity(target: THREE.Vector3): THREE.Vector3;
  /**
   * Setzt den Spieler auf einen Punkt — Füße dorthin, Blickrichtung bleibt.
   *
   * `false` heißt: geht gerade nicht. Wer in einem Kart sitzt oder mit einer
   * Drohne durch die Halle sieht, hat seinen Körper verliehen, und ein
   * Teleport risse ihn mitten aus dem, was er gerade tut.
   */
  teleportPlayer(point: THREE.Vector3): boolean;
  /**
   * Takes the view away from the body and puts it at a point in the world —
   * the drone flies with it. `null` gives the player their body back.
   *
   * `rotation` is the *frame* the head then hangs in, not the head itself: the
   * headset keeps looking wherever it looks, inside a room that is turned by
   * this much. That is what lets the drone's nose take the view around with it
   * without ever taking the head away from its owner.
   */
  setViewOverride(position: THREE.Vector3 | null, rotation?: THREE.Quaternion | null): void;
  /** What that hand is carrying — the adjustment tool works on the other one. */
  heldTool(hand: Handedness): Tool | null;
  /**
   * Eine der beiden Hüften des Gürtels, so wie sie in der Welt steht — der
   * Gürtel-Justierer legt seine Kiste darum.
   */
  beltSlot(side: Handedness): THREE.Object3D | null;
  /** Wie der Gürtel gerade sitzt (`beltSettings.ts`). */
  beltPose(): BeltOffset;
  /**
   * Setzt ihn um. `persist` schreibt ihn in den Speicher — beim Ziehen bleibt
   * das aus, sonst schriebe jedes Bild, und käme einmal am Ende.
   */
  setBeltPose(offset: BeltOffset, persist?: boolean): BeltOffset;
  /**
   * Leaves a held tool hanging in mid-air, out of the hand but still that
   * hand's. The hand can then be moved without it; `unparkTool` puts it back
   * with whatever hold pose it has by then.
   */
  parkTool(tool: Tool): boolean;
  unparkTool(tool: Tool): boolean;
}

/** How hard a round hits: the punch is its mass times its speed. */
export interface BulletOptions {
  /** Kilograms. Heavier rounds shove more and drop faster. */
  mass?: number;
  /** Tracer: glows and draws the line it flew, so a shot can be watched. */
  tracer?: boolean;
}

/** Two props, the points the joint sits between them, and what kind it is. */
export interface WeldRequest {
  a: PhysicsBody;
  b: PhysicsBody;
  /** World point on `a` the joint is anchored at. */
  pointA: THREE.Vector3;
  /** World point on `b`. */
  pointB: THREE.Vector3;
  /** A hinge instead of a rigid joint. */
  hinge: boolean;
  /** World axis the hinge turns around; ignored for rigid joints. */
  axis: THREE.Vector3;
}

/**
 * A piece of equipment that can sit on the belt and be taken into a hand.
 *
 * Most tools are held the whole time the grab button is down. A `sticky` tool
 * is taken once and stays — its grab button is then free for the tool itself,
 * and it goes back by holding it against a belt slot.
 */
export abstract class Tool extends THREE.Group {
  /** Stable id: used by the menu, the belt and the network. */
  abstract readonly toolId: string;
  abstract readonly label: string;
  /** How the tool shelf draws it. Subclasses set these in their constructor. */
  icon: MenuIcon = 'tools';
  accent = 0x9d7bff;
  hint = '';
  sticky = false;

  /**
   * How many copies of this tool may be away from the belt at once — the ones
   * lying around the room *and* the ones in a hand — **per belt slot**.
   *
   * Letting go of a tool no longer files it away on a hip: it falls, like
   * anything else you let go of, and a fresh one grows on the hip it came from
   * — so a pistol can be taken, passed to the other hand and a second one
   * drawn. Without a ceiling that would carpet the floor in pistols, so the
   * oldest copy still lying about is taken back as soon as one too many is
   * out.
   *
   * Pro Platz, nicht pro Werkzeug: links und rechts sind zwei Vorräte. Eine
   * Waffe in jeder Hand und beide auf den Boden geworfen ist damit genau das,
   * wonach es aussieht — zwei Waffen auf dem Boden — statt eine, die die
   * andere verschluckt. Innerhalb einer Hüfte liest sich die Eins weiter wie
   * gewollt: die frische Pistole von dieser Hüfte holt die von dieser Hüfte
   * liegengelassene ein. A throwing star says five, because five stars in the
   * air is the point of a throwing star, and the sixth throw from the same hip
   * takes the first one back. Die Buchführung dazu steht in `looseBudget.ts`.
   */
  looseLimit = 1;

  /**
   * Let go of in mid-air, this one carries on instead of falling: it keeps the
   * speed it had, ignores gravity and stays wherever it first hits something.
   * The knife is what this is for.
   */
  glides = false;

  /**
   * Turn the tool out of the grip and onto the pointing ray while it is held.
   * On by default: everything that aims at something wants this, and a tool
   * that forgets it shoots about 30° over the target. Switch it off only for
   * something that is deliberately strapped to the hand.
   */
  alignToAim = true;
  /**
   * While this tool is held, that hand stops shoving props around. The welder
   * needs it: reaching into a stack to pick a joint point must not scatter it.
   */
  phaseHands = false;

  /**
   * **Angezogen** statt gehalten: das Ding sitzt auf der Hand — ein Handschuh.
   *
   * Seine Lage im Griff ist dann keine eigene Größe, sondern die **Haltung der
   * Hand**, die es trägt: wo die Hand ist, ist der Handschuh, und er folgt ihr
   * (`holdHandPose`), statt dass jemand ihn eigens einmisst. Die Werkzeugseite
   * schreibt für so ein Werkzeug deshalb beide Ziele in die Handhaltung. Was
   * angezogen ist, zielt auch nicht (`alignToAim = false`) — es sitzt in der
   * Faust und nirgends sonst.
   */
  worn = false;

  /**
   * Anziehen: ab jetzt sitzt das Werkzeug auf der Hand (`worn`), zielt nicht
   * und liegt dort, wo die Haltung der rechten Hand es hinlegt — bis eine Hand
   * es nimmt, dann dort, wo *die* ist.
   */
  protected wear(): void {
    this.worn = true;
    this.alignToAim = false;
    this.followHand('right');
  }

  /**
   * Die Lage im Griff eines angezogenen Werkzeugs: die sechs Zahlen der
   * Handhaltung, die diese Hand mit ihm trägt (`holdHandPose`). Ein Handschuh
   * ist damit immer genau dort, wo die gezeichnete Hand ist — auch dann, wenn
   * jemand die Haltung im Menü gerade verschiebt.
   */
  followHand(side: Handedness): void {
    const pose = holdHandPose(side, this.toolId);
    this.holdPosition.set(pose.x / 100, pose.y / 100, pose.z / 100);
    this.holdRotation.setFromEuler(
      _euler.set(pose.pitch * DEG, pose.yaw * DEG, pose.roll * DEG, 'XYZ'),
    );
  }

  /** The hand currently holding this, or null while it is stowed. */
  heldBy: Handedness | null = null;

  /**
   * Hanging in the air while the adjustment tool measures a new hold pose.
   * Still owned by its hand, but the hand does not carry it around and does
   * not put it away — see `ToolHost.parkTool`.
   */
  parked = false;

  /**
   * Just came back from being parked while the grab button was not held. A
   * non-sticky tool is normally dropped the moment the grip goes up — which
   * would send a freshly adjusted tool straight to the belt. So the rule waits
   * until the hand has taken hold of it once more.
   */
  regrip = false;

  /** Pose inside the hand's grip space. */
  readonly holdPosition = new THREE.Vector3(0, -0.012, 0.03);

  /** Extra tilt on top of the aim, for tools that are not held like a pistol. */
  readonly holdRotation = new THREE.Quaternion();

  /**
   * The pose the tool was *built* with, before anything the player measured
   * was put on top of it. `createTool` fills these in, so "back to how it
   * came" stays possible without rebuilding the tool.
   */
  readonly factoryPosition = new THREE.Vector3();
  readonly factoryRotation = new THREE.Quaternion();

  /**
   * Wo der **Standardgriff** im Werkzeug sitzt — `null`, solange keiner
   * angebaut ist.
   *
   * Gesetzt wird er nicht von Hand, sondern von `mountGrip()`: wer den Griff
   * anbaut, trägt ihn damit auch ein, und die beiden Auskünfte können nicht
   * auseinanderlaufen. Wer ihn trägt, bekommt die Faust dazu geschenkt
   * (`STANDARD_GRIP_TOOLS` in `core/handPose.ts`).
   */
  gripPart: THREE.Object3D | null = null;

  /**
   * Baut den Standardgriff dorthin, wo er in der Faust landet.
   *
   * **Nach** `holdPosition`/`holdRotation` aufzurufen und nicht davor: wohin der
   * Griff kommt, hängt daran, wie das Werkzeug in der Hand liegt (`gripFit.ts`).
   * Die `holdPosition` setzt der Griff gleich selbst — sie ist bei allen
   * Werkzeugen mit Standardgriff dieselbe, und das ist die Bedingung, unter der
   * die Rechnung ohne die Brille aufgeht. Sie legt den Griff dabei auf den
   * Griffpunkt des Controllers, also in die Mitte der Faust.
   *
   * Was hier entsteht, ist die **gebaute** Lage. Wer das Werkzeug später am
   * ersten Justierstand nachmisst, verschiebt es samt Griff gegen die Hand, und
   * die Faust dazu gehört ihm dann selbst: der Griff ist Geometrie und wandert
   * nicht hinterher. Genau dafür gibt es den zweiten Stand.
   */
  protected mountGrip(options?: GripOptions): THREE.Object3D {
    this.holdPosition.set(GRIP_HOLD_POSITION.x, GRIP_HOLD_POSITION.y, GRIP_HOLD_POSITION.z);
    const grip = createGrip(this.holdRotation, options);
    this.add(grip);
    this.gripPart = grip;
    return grip;
  }

  /**
   * Things clipped onto this tool that carry a pose of their own — the sights
   * on the pistol. The adjustment tool can pick one out and move it, so it
   * asks every tool rather than knowing which ones have any.
   */
  attachments(): readonly Attachment[] {
    return [];
  }

  /** Forgets a measured hold pose and goes back to the built-in one. */
  resetHold(): void {
    this.holdPosition.copy(this.factoryPosition);
    this.holdRotation.copy(this.factoryRotation);
  }

  /**
   * Eine Hand greift danach, **während es noch liegt, wo es lag**.
   *
   * Und das ist der ganze Unterschied zu `onTake`: dort hängt es schon im
   * Griff, und wo die Hand es angefasst hat, ist nicht mehr zu erfahren. Hier
   * steht beides noch getrennt im Raum, und ein Werkzeug, für das die *Stelle*
   * eine Rolle spielt, kann sie ablesen — der große Hammer liest daraus, an
   * welchem Punkt des Stiels die Faust liegt.
   *
   * Gerufen nur für ein Werkzeug, das im Raum lag. Vom Gürtel greift man in
   * einen Ring und nicht an eine Stelle des Werkzeugs.
   */
  onReach(_controller: ControllerState): void {}

  /** Taken into a hand. */
  onTake(_controller: ControllerState, _host: ToolHost): void {}

  /** Put back on the belt or into the shelf. */
  onStow(_host: ToolHost): void {}

  /** Trigger went down while the tool is held. */
  onTrigger(_controller: ControllerState, _host: ToolHost): void {}

  /** Trigger came back up. */
  onTriggerUp(_controller: ControllerState, _host: ToolHost): void {}

  /** Grab went down while a sticky tool is held — never for the others. */
  onGrab(_controller: ControllerState, _host: ToolHost): void {}

  /** The A/X button of the holding hand. */
  onPrimary(_controller: ControllerState, _host: ToolHost): void {}

  /**
   * Let go of into the room rather than onto a hip. `speed` is how fast the
   * hand was moving when it opened, in m/s.
   */
  onThrow(_host: ToolHost, _speed: number): void {}

  /** A gliding tool came to rest against something and stayed there. */
  onStick(_host: ToolHost): void {}

  /**
   * A two-handed tool takes the *other* hand as well. While it says yes to a
   * hand, that hand neither reaches into the belt nor picks up props — it is
   * busy holding this thing. The drone's display is the one that does it.
   */
  claimsHand(_hand: Handedness): boolean {
    return false;
  }

  /**
   * Stellt das **Modell** so, wie es in dieser Hand liegt — ohne dass es dazu
   * gehalten werden muss.
   *
   * Die meisten Werkzeuge tun hier nichts, und sie haben recht damit: ihr
   * Ursprung *ist* der Griff, `holdPosition` legt genau diesen Punkt in die
   * Hand, und ein Modell, das sich darin nirgends verschiebt, sieht in jeder
   * Hand gleich aus. Zwei Werkzeuge verschieben sich doch — das Drohnen-Deck
   * rutscht zur Seite, damit der Griff *dieser* Hand auf dem Ursprung sitzt,
   * der Stiel des Hammers rutscht entlang seiner Achse —, und für die ist das
   * hier die zweite Hälfte von `applyHold`.
   *
   * Gebraucht wird sie am **Griffstand** (`worlds/tune/GripStand.ts`). Dort
   * hängt eine Kopie, die niemand hält; `applyHold` steigt bei so einer Kopie
   * gleich in der ersten Zeile aus, also stand die Drohne dort **mittig** statt
   * am Griff. Wer die Boxhand an ihren sichtbaren Griff legte, mass sie damit
   * um genau diese Verschiebung daneben, und im Spiel schwebte die Hand dann
   * zehn Zentimeter neben dem Gerät. Die Kopie am Stand muss dasselbe Bild
   * zeigen wie die Hand im Spiel — sonst misst man an einem anderen Gegenstand
   * als dem, den man später hält.
   *
   * Am Nullpunkt ändert das nichts: der Ursprung des Werkzeugs bleibt, wo er
   * ist, und die Messung rechnet gegen ihn (`tune/handGrip.ts`). Verschoben
   * wird nur das, was man ansieht.
   *
   * @param hand die Hand, in der es liegt; `null` für „so, wie es herumliegt".
   */
  showHeldBy(hand: Handedness | null): void {
    if (this.worn && hand) this.followHand(hand);
  }

  /**
   * Puts the tool into the hand: the offset from `holdPosition`, and a
   * rotation that runs its -Z along the pointing ray instead of along the
   * grip, with `holdRotation` on top.
   *
   * The world calls this every frame before `update`, so a tool never has to
   * think about it — and a new tool cannot forget it. Doing it every frame is
   * also what lets the adjustment tool change a pose while the tool is held.
   */
  applyHold(controller: ControllerState | null): void {
    // Stowed tools belong to the belt and parked ones to the room; both set
    // their own pose.
    if (!this.heldBy || this.parked) return;
    // Ein Handschuh folgt der Hand, Bild für Bild: seine Lage *ist* ihre Haltung.
    if (this.worn) this.followHand(this.heldBy);
    this.position.copy(this.holdPosition);
    if (!this.alignToAim || !controller || !controller.grip.visible) {
      // Hanging in the target ray already: that *is* the aim.
      this.quaternion.copy(this.holdRotation);
      return;
    }
    aimQuaternion(controller, this.quaternion);
    this.quaternion.multiply(this.holdRotation);
  }

  /** @param controller the hand holding it, or null while it is stowed. */
  update(_dt: number, _host: ToolHost, _controller: ControllerState | null): void {}

  /** Frees geometries and materials this tool built. */
  disposeTool(): void {}
}

/**
 * The rotation that turns something parented to a hand out of the grip and
 * onto the pointing ray. Identity when the runtime gives no separate grip —
 * then the tool already hangs in the ray.
 */
export function aimQuaternion(
  controller: ControllerState | null,
  target: THREE.Quaternion,
): THREE.Quaternion {
  if (!controller || !controller.grip.visible) return target.identity();
  // `aimRotation` writes into whatever it is given; a Quaternion is one.
  aimRotation(controller.grip.quaternion, controller.targetRay.quaternion, target);
  return target;
}

/**
 * Das Material für alles, was eine Hand nehmen soll.
 *
 * Ein Werkzeug in VR ist ein Klotz aus Dreiecken, und woran man es nimmt,
 * sieht man ihm nicht an. Also ist der Griff türkis — überall dieselbe Farbe,
 * aus `core/colors.ts`, und damit dieselbe Antwort auf dieselbe Frage. Wer
 * eine neue Handhabe baut, ruft das hier auf statt eine eigene Zahl zu
 * erfinden.
 */
export function grabMaterial(
  options: THREE.MeshStandardMaterialParameters = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: GRAB_TINT,
    roughness: 0.72,
    metalness: 0.08,
    // Ein Griff, den man im Dunkeln nicht findet, ist kein Griff.
    emissive: new THREE.Color(GRAB_TINT).multiplyScalar(GRAB_TINT_EMISSIVE),
    ...options,
  });
}

/** Disposes every geometry and material below an object. */
export function disposeToolTree(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[];
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material?.dispose();
  });
}
