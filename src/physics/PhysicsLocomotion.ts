import * as THREE from 'three';
import type { Collider, KinematicCharacterController, RigidBody } from '@dimforge/rapier3d-compat';
import type { Locomotion } from '../core/Locomotion';
import type { PlayerRig } from '../core/PlayerRig';
import { ALL_GROUPS, GROUP_PLAYER, interactionGroups, type PhysicsWorld } from './PhysicsWorld';

/**
 * Everything the player capsule may bump into. Other players are deliberately
 * missing: bodies that block each other in a shared room are only ever in the
 * way — you cannot see your own, so you cannot avoid theirs either.
 */
const PLAYER_FILTER = ALL_GROUPS & ~GROUP_PLAYER;

const RADIUS = 0.24;
const TERMINAL_VELOCITY = 32;

/**
 * Die **Haut** der Spielerkapsel: so weit bleibt sie von allem weg.
 *
 * Rapier löst mit diesem Abstand auf, und das macht die Zahl zur Untergrenze
 * für alles, worauf jemand stehen soll: ein Boden, der dünner ist als die
 * Haut, lässt die Kapsel dauernd halb darin stecken — und ein Controller, der
 * eine Durchdringung auflösen muss, gibt in dieser Frame keine Bewegung
 * heraus. Deshalb steht sie hier als Name und nicht als 0.02 im Konstruktor:
 * `worlds/shared/environment.ts` rechnet dagegen (mit Test).
 */
export const CHARACTER_SKIN = 0.02;

/**
 * Wie weit **über** dem Boden die Kapsel abgesetzt wird, wenn sie neu unter den
 * Kopf gesetzt wird (`syncCapsuleToRig`) — und das ist die Zahl, ohne die man
 * im Boden versinkt.
 *
 * Der Character-Controller tastet mit einem Formwurf nach vorn: Was er trifft,
 * hält ihn an; was näher liegt als seine eigene Haut, **sieht er nicht**, denn
 * das gilt ihm als Durchdringung und die überspringt er. Eine Kapsel, deren
 * Sohle genau auf der Fläche steht, steht damit in seinem toten Winkel: Der
 * Boden hält sie nicht mehr auf, das Ansaugen (`enableSnapToGround`) zieht sie
 * zusätzlich nach unten, und sie sackt Bild für Bild tiefer, bis sie unten
 * herausfällt. Gemessen: aus dem Stand rutschte der Spieler in zehn Sekunden
 * einen Meter tief, und bei manchen Bildraten fiel er ganz aus der Welt.
 *
 * Genau so wurde die Kapsel aber abgesetzt — die Sohle auf den Fußboden des
 * Rigs, also beim Betreten jeder Welt, nach jedem Portal, nach jeder Rettung.
 * Wer danach losging, kam davon: **in der Bewegung** rechnet der Controller
 * sauber, im Stehen nicht. „Manchmal sacke ich ein, manchmal stehe ich oben
 * drüber" ist dieselbe Zahl von beiden Seiten.
 *
 * Drei Häute Abstand haben in der Messung bei jeder Bildrate von 45 bis 120 Hz
 * gehalten (zwei nicht mehr, die Grenze liegt knapp darüber). Zu sehen ist
 * davon nichts: Das Rig bekommt die paar Zentimeter nicht mit, um die die
 * Kapsel sich danach setzt (`seatSlack`).
 */
export const SEAT_CLEARANCE = CHARACTER_SKIN * 3;

/**
 * Wie schnell sich die Kapsel wieder aus dem Boden **herausarbeitet**, in
 * Metern je Bild — zwei Millimeter, also gut zehn Zentimeter in der Sekunde.
 *
 * Langsam genug, dass niemand ein Anheben sieht, und schnell genug, dass ein
 * Fehlgriff des Ansaugens nach einer Fünftelsekunde vorbei ist statt nach
 * ein paar Sekunden Stocken.
 */
const GROUND_RECOVER = 0.002;

/**
 * Wie weit die Kapsel beim Gehen an den Boden **angesaugt** wird.
 *
 * Wer eine Stufe hinuntergeht, soll auf ihr stehen und nicht über ihr fliegen:
 * Rapier zieht die Kapsel dafür an die Fläche, die es unter ihr findet. Die
 * Zahl war 28 cm — eine ganze Treppenstufe —, und so weit greift der Griff
 * auch daneben. Auf der freien Bodenplatte, wo gar nichts zu holen ist, riss
 * er den Spieler im Vorbeigehen dreizehn Zentimeter nach unten in die Platte
 * hinein; er arbeitete sich in den nächsten Sekunden wieder heraus, und
 * genau das ist das Stolpern aus dem Nichts, das man beim Laufen spürt.
 *
 * Acht Zentimeter halten die Treppe genauso sauber — gemessen an einer Treppe
 * aus 18-cm-Stufen bleibt der Fuß bei 45 bis 120 Hz durchgehend am Boden, wie
 * bei 28 — und begrenzen den Fehlgriff auf unter einen Zentimeter. Was höher
 * ist als das, ist ohnehin ein Absatz, den man **fällt**, und ein kurzer Fall
 * sieht richtiger aus als ein Ruck.
 */
const GROUND_SNAP = 0.08;

/**
 * Wie lange ein Sprungwunsch auf den Boden wartet, in Sekunden.
 *
 * Gedrückt wird kurz vor der Landung, nicht danach — und ein Knopfdruck, der
 * eine Fünfzigstelsekunde zu früh kam, ist für den Spieler kein zu früher
 * Druck, sondern ein Sprung, der nicht kam. Der Wunsch bleibt deshalb kurz
 * stehen und löst aus, sobald wieder Boden da ist.
 */
const JUMP_BUFFER = 0.15;

/**
 * Wie lange nach der Kante noch gesprungen werden darf, in Sekunden.
 *
 * Die Gegenrichtung desselben Fehlers: Wer im Laufen abspringt, ist im Moment
 * des Drucks oft schon einen Frame in der Luft — über einer Fuge, einer Stufe
 * oder der Kante, von der er gerade wegwollte. Ohne diese Frist verschluckt
 * genau das den Sprung.
 */
const COYOTE_TIME = 0.12;

/**
 * Wie steil eine Fläche höchstens sein darf, damit man sie hinaufkommt.
 *
 * Der Teleporter liest dieselbe Zahl: ein Ziel, das steiler steht, ist keines,
 * auf dem man stehen bleibt — man landete darauf und rutschte sofort ab.
 */
export const MAX_SLOPE_DEG = 52;

/**
 * Ab wie steil man **abrutscht** — und zwar erst jenseits dessen, was man
 * hinaufkommt.
 *
 * Rapier kennt beide Grenzen getrennt, und die Rutschgrenze lag lange bei 40°:
 * zwischen 40° und 52° durfte man also hinauf und rutschte gleichzeitig
 * hinunter. Auf einer Rampe im Labor merkt das niemand, an der Flanke eines
 * Berges schon — dort ist fast alles zwischen 35° und 50°, und wer dort ging,
 * kam kaum vom Fleck (die Alpen). Jetzt rutscht nur, wo man ohnehin nicht
 * hinaufkäme.
 */
export const SLIDE_SLOPE_DEG = MAX_SLOPE_DEG + 3;

const _head = new THREE.Vector3();
const _drift = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _applied = new THREE.Vector3();
const _rotation = new THREE.Quaternion();
const _matrix = new THREE.Matrix4();

/** Die Kapsel steht immer aufrecht, und der Formwurf geht immer nach unten. */
const UPRIGHT = { x: 0, y: 0, z: 0, w: 1 };
const DOWN = { x: 0, y: -1, z: 0 };

/**
 * Walking, falling and jumping with a Rapier kinematic capsule.
 *
 * The capsule tracks the head: stepping around the room moves the capsule, and
 * whatever the capsule is *not* allowed to do (walls, ledges) is pushed back
 * onto the rig, so the player never ends up inside geometry.
 */
export class PhysicsLocomotion implements Locomotion {
  readonly velocity = new THREE.Vector3();
  grounded = false;
  jumpSpeed = 4.4;
  /** How quickly the player can steer while airborne. */
  airControl = 2.2;

  /**
   * Surface bits the capsule currently ignores. Only the wall a portal is
   * mounted on is opened up — the floor you stand on stays solid.
   */
  phaseMask = 0;

  private pushes = false;

  /**
   * While this is set the capsule flies: the vector *is* the velocity, gravity
   * is off and the stick has nothing to say. Walls still stop it — flying
   * through the room is the point, flying through its walls is not.
   */
  private flight: THREE.Vector3 | null = null;

  private readonly controller: KinematicCharacterController;
  private readonly body: RigidBody;
  private readonly collider: Collider;
  private readonly lastHead = new THREE.Vector3();
  private hasLastHead = false;
  private halfHeight = 0.6;
  private disposed = false;
  /**
   * Der Rest des Abstands, mit dem die Kapsel abgesetzt wurde und den das Rig
   * **nicht** mitmachen soll (`SEAT_CLEARANCE`). Die Kapsel setzt sich in ein
   * paar Bildern darauf, der Spieler steht die ganze Zeit still.
   */
  private seatSlack = 0;
  /**
   * Wie weit sich die Kapsel am Stück nach oben herausgearbeitet hat
   * (`GROUND_RECOVER`). Sobald der Boden wieder antwortet, fängt das von vorn
   * an — die Begrenzung gilt nur für ein Herausarbeiten in einem Zug.
   */
  private recovered = 0;
  /** Wie lange der Sprungwunsch noch gilt (`JUMP_BUFFER`). */
  private jumpWish = 0;
  /** Wie lange noch abgesprungen werden darf (`COYOTE_TIME`). */
  private coyote = 0;

  constructor(
    private readonly physics: PhysicsWorld,
    rig: PlayerRig,
  ) {
    const { rapier, world } = physics;

    this.controller = world.createCharacterController(CHARACTER_SKIN);
    this.controller.enableAutostep(0.32, 0.18, true);
    this.controller.enableSnapToGround(GROUND_SNAP);
    this.controller.setApplyImpulsesToDynamicBodies(this.pushes);
    this.controller.setCharacterMass(72);
    this.controller.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(MAX_SLOPE_DEG));
    this.controller.setMinSlopeSlideAngle(THREE.MathUtils.degToRad(SLIDE_SLOPE_DEG));

    this.body = world.createRigidBody(rapier.RigidBodyDesc.kinematicPositionBased());
    this.collider = world.createCollider(
      rapier.ColliderDesc.capsule(this.halfHeight, RADIUS).setCollisionGroups(
        interactionGroups(GROUP_PLAYER, PLAYER_FILTER),
      ),
      this.body,
    );

    this.syncCapsuleToRig(rig, true);
    this.publishCapsule();
  }

  /**
   * Ob der eigene Körper Gegenstände **anschiebt**, wenn er gegen sie läuft.
   *
   * Aus, und das ist die Voreinstellung: der Rumpf bleibt fest — man geht nicht
   * durch Kisten hindurch und steht weiter auf ihnen —, aber er stößt nichts
   * mehr um. Ein Körper, den man selbst nicht sieht, trifft ständig etwas, das
   * man nicht treffen wollte: der Stapel, an dem man vorbeigeht, fällt; das
   * Ding, das man abgelegt hat, ist beim Umdrehen weg. Wer das *will* — Kisten
   * mit dem Knie vor sich herschieben —, schaltet es im Menü an
   * (`worldPhysics.bodyPush`).
   *
   * Die Hände sind davon ausdrücklich nicht betroffen: mit der Hand hinlangen
   * heißt, etwas anstoßen zu wollen.
   */
  get pushesProps(): boolean {
    return this.pushes;
  }

  set pushesProps(on: boolean) {
    if (this.pushes === on) return;
    this.pushes = on;
    this.controller.setApplyImpulsesToDynamicBodies(on);
  }

  /** Capsule centre in world space. */
  getPosition(target: THREE.Vector3): THREE.Vector3 {
    const t = this.body.translation();
    return target.set(t.x, t.y, t.z);
  }

  /** Takes off, or hands the body back to gravity. */
  setFlight(velocity: THREE.Vector3 | null): void {
    if (!velocity) {
      if (this.flight) this.velocity.copy(this.flight);
      this.flight = null;
      return;
    }
    if (!this.flight) this.flight = new THREE.Vector3();
    this.flight.copy(velocity);
  }

  apply(rig: PlayerRig, velocity: THREE.Vector3, jump: boolean, dt: number): void {
    if (dt <= 0 || this.disposed) return;
    this.updateShape(rig);
    this.publishCapsule();

    rig.getHeadPosition(_head);
    if (!this.hasLastHead) {
      this.lastHead.copy(_head);
      this.hasLastHead = true;
    }

    // Movement the player made physically (room scale) since the last frame.
    _drift.set(_head.x - this.lastHead.x, 0, _head.z - this.lastHead.z);

    // Ein Sprungwunsch wartet kurz auf den Boden, und der Boden bleibt kurz
    // gültig, nachdem er weg ist — beides gegen denselben Fehler: einen Druck,
    // der ein Bild neben dem Boden lag. Nach oben wird die Frist nicht neu
    // gestellt, sonst spränge man aus dem eigenen Sprung noch einmal ab.
    if (jump) this.jumpWish = JUMP_BUFFER;
    else this.jumpWish = Math.max(0, this.jumpWish - dt);
    if (this.grounded && this.velocity.y <= 0 && !this.flight) this.coyote = COYOTE_TIME;
    else this.coyote = Math.max(0, this.coyote - dt);
    const takeOff = this.jumpWish > 0 && this.coyote > 0 && !this.flight;

    if (this.flight) {
      // Flying: the glove owns the whole velocity, gravity does not get a say.
      this.velocity.copy(this.flight);
      this.grounded = false;
    } else if (this.grounded) {
      this.velocity.x = velocity.x;
      this.velocity.z = velocity.z;
      // Nur das Fallen wird abgestellt, nicht das Steigen: Der Boden gilt dem
      // Controller noch ein, zwei Bilder lang als betreten, nachdem man von ihm
      // abgesprungen ist (er tastet ein Stück weit nach unten). Ein `min(v, 0)`
      // löschte dort den frischen Sprung wieder — aus 4,4 m/s wurden fünf
      // Zentimeter Hüpfer, und zwar mal so, mal so. **Das** war der Sprung, der
      // „manchmal nicht geht".
      if (this.velocity.y < 0) this.velocity.y = 0;
    } else {
      const blend = Math.min(1, this.airControl * dt);
      if (velocity.lengthSq() > 0) {
        this.velocity.x += (velocity.x - this.velocity.x) * blend;
        this.velocity.z += (velocity.z - this.velocity.z) * blend;
      }
    }
    if (takeOff) {
      this.velocity.y = this.jumpSpeed;
      this.grounded = false;
      this.jumpWish = 0;
      this.coyote = 0;
    }
    if (!this.flight) {
      // Die Schwerkraft kommt aus der Welt, nicht aus einer Konstante hier:
      // sonst fiele der Spieler auf dem Mond wie auf der Erde, während die
      // Kisten neben ihm schweben.
      this.velocity.y += this.physics.gravityY * dt;
      if (this.velocity.y < -TERMINAL_VELOCITY) this.velocity.y = -TERMINAL_VELOCITY;
    }

    _desired.copy(this.velocity).multiplyScalar(dt).add(_drift);

    this.controller.computeColliderMovement(
      this.collider,
      _desired,
      undefined,
      interactionGroups(GROUP_PLAYER, PLAYER_FILTER & ~this.phaseMask),
    );
    const movement = this.controller.computedMovement();
    _applied.set(movement.x, movement.y, movement.z);
    this.grounded = this.controller.computedGrounded();

    // **Das Millimeterloch im Boden** — und was dagegen hilft.
    //
    // Der Controller sucht den Boden nur auf der Strecke, die er gehen soll. Im
    // Stehen ist das die Schwerkraft eines Bildes: bei 90 Hz gut ein
    // Millimeter, und damit *kürzer als seine eigene Haut*. Die Fläche zwei
    // Zentimeter unter der Sohle liegt außerhalb dessen, wonach er schaut — er
    // hält nichts an und gibt den Millimeter frei. Dabei meldet er völlig
    // richtig „steht auf dem Boden", nur eben einen Millimeter tiefer als
    // vorher. Ein paar Dutzend solcher Bilder, und die Sohle steckt in der
    // Haut, in der er gar nichts mehr sieht; von da an gibt er *jede* Strecke
    // frei, und der Spieler fährt durch den Fußboden nach unten weg. Gemessen:
    // aus dem Stand ein Meter in zehn Sekunden, bei manchen Bildraten der ganze
    // Weg aus der Welt.
    //
    // Gefragt wird deshalb nicht der Controller, sondern die Welt: ein
    // Formwurf der Kapsel nach unten, so weit wie ihre Haut reicht
    // (`groundGap`). Der antwortet mit einer Zahl statt mit einem Gefühl, und
    // aus ihr folgt beides —
    //
    //  * **Abstand da, aber Schritt unangetastet durch**: Der Controller hat
    //    die Fläche nicht gesehen, obwohl sie in Hautnähe liegt. Der Schritt
    //    wird nicht gemacht; er kostet auch nichts, denn er ist kleiner als
    //    der Abstand, den der Controller ohnehin hält. Damit hört das Einsinken
    //    auf, bevor es anfängt.
    //  * **Kein Abstand mehr, die Kapsel steckt drin**: Das kommt vom
    //    Ansaugen, das gelegentlich danebengreift (`GROUND_SNAP`) — auf der
    //    endlosen Bodenplatte, die einen Kilometer misst, öfter als anderswo.
    //    Drinnen lässt der Controller einen auch nicht mehr **vorwärts**, und
    //    heraus arbeitet er sich mit einem Zehntelmillimeter je Bild: Das ist
    //    das Stocken beim Gehen, das sekundenlang anhält und aus dem Nichts
    //    kommt. Zwei Millimeter je Bild bringen die Kapsel in einer
    //    Fünftelsekunde heraus (`GROUND_RECOVER`); begrenzt ist der Weg
    //    trotzdem, damit eine Fläche, aus der es kein Herauskommen gibt,
    //    niemanden in den Himmel schiebt.
    //
    // Ist gar nichts in Reichweite, gilt nichts davon: Dann steht die Kapsel
    // *über* der Fläche — nach einer Stufe abwärts etwa —, und sie soll fallen.
    // Genau daran ist die frühere Fassung gescheitert, die statt zu messen
    // geraten hat: Sie hielt den Spieler fünf Zentimeter über dem Boden fest.
    //
    // Beim Absetzen gilt es ebenfalls nicht: Da *soll* die Kapsel die paar
    // Zentimeter fallen, für die sie über der Fläche losgelassen wurde
    // (`SEAT_CLEARANCE`).
    const standing = this.seatSlack <= 0 && this.grounded && !this.flight;
    const gap = standing && this.velocity.y <= 0 ? this.groundGap() : null;
    if (gap === null) {
      this.recovered = 0;
    } else if (gap <= 0) {
      if (this.recovered < SEAT_CLEARANCE) {
        const push = Math.min(GROUND_RECOVER, SEAT_CLEARANCE - this.recovered);
        this.recovered += push;
        _applied.y = Math.max(_applied.y, push);
      }
    } else {
      this.recovered = 0;
      if (_desired.y < 0 && untouched(_applied.y, _desired.y)) _applied.y = 0;
    }

    const t = this.body.translation();
    this.body.setNextKinematicTranslation({
      x: t.x + _applied.x,
      y: t.y + _applied.y,
      z: t.z + _applied.z,
    });
    // Kinematic bodies only move on the next step; keep our own view in sync.
    this.body.setTranslation(
      { x: t.x + _applied.x, y: t.y + _applied.y, z: t.z + _applied.z },
      true,
    );

    if (this.grounded && !this.flight && this.velocity.y < 0) this.velocity.y = 0;
    // Actually blocked by something: drop that part of the momentum. The
    // threshold has to stay generous, otherwise a portal fling dies instantly.
    if (blocked(_applied.x, _desired.x)) this.velocity.x *= 0.3;
    if (blocked(_applied.z, _desired.z)) this.velocity.z *= 0.3;

    // Move the rig so the head ends up above the capsule again.
    rig.position.x += _applied.x - _drift.x;
    rig.position.z += _applied.z - _drift.z;
    rig.position.y += this.settle(_applied.y);
    rig.updateMatrixWorld(true);

    rig.getHeadPosition(this.lastHead);
  }

  teleport(rig: PlayerRig, transform: THREE.Matrix4): void {
    _rotation.setFromRotationMatrix(_matrix.extractRotation(transform));
    this.velocity.applyQuaternion(_rotation);
    // Portals only sit on vertical or horizontal surfaces here, so the level
    // stays level — but a tilted exit should not fling the player sideways.
    this.syncCapsuleToRig(rig, true);
    this.hasLastHead = false;
    this.grounded = false;
    this.coyote = 0;
  }

  /** The rig was moved from the outside — put the capsule back under the head. */
  resync(rig: PlayerRig): void {
    this.velocity.set(0, 0, 0);
    this.flight = null;
    this.syncCapsuleToRig(rig, true);
    this.grounded = false;
    this.coyote = 0;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.physics.playerCapsule = null;
    this.physics.world.removeCharacterController(this.controller);
    this.physics.world.removeRigidBody(this.body);
  }

  /**
   * Sagt der Physik, wo der Spieler steht.
   *
   * Sie braucht die Kapsel für eine einzige Frage, die sie sich selbst nicht
   * beantworten kann: ob ein losgelassenes Ding noch im Spieler steckt
   * (`playerClearance.ts`). Geschrieben wird sie jedes Bild, weil sie sich mit
   * jedem Schritt und mit jeder Kniebeuge ändert.
   */
  private publishCapsule(): void {
    const t = this.body.translation();
    const capsule = this.physics.playerCapsule;
    if (!capsule) {
      this.physics.playerCapsule = {
        x: t.x,
        y: t.y,
        z: t.z,
        halfHeight: this.halfHeight,
        radius: RADIUS,
      };
      return;
    }
    capsule.x = t.x;
    capsule.y = t.y;
    capsule.z = t.z;
    capsule.halfHeight = this.halfHeight;
    capsule.radius = RADIUS;
  }

  /** Places the capsule under the current head position. */
  syncCapsuleToRig(rig: PlayerRig, immediate = false): void {
    rig.getHeadPosition(_head);
    // A crouching rig hangs below its own floor, so the feet come from the rig.
    // Abgesetzt wird **über** dem Boden und nicht auf ihm: warum, steht bei
    // `SEAT_CLEARANCE`. Die Kapsel sinkt in den nächsten Bildern von selbst
    // darauf ab, und `seatSlack` hält das Rig währenddessen still.
    //
    // Gerechnet wird von der **Sohle** aus und mit der Kapsel, die gerade da
    // ist: Ihre Höhe hinkt der des Kopfes um ein Bild hinterher (`updateShape`
    // zieht gleich nach und lässt die Sohle dabei stehen), und wer stattdessen
    // die Kopfhöhe halbiert, setzt sie um genau diesen Rückstand daneben.
    const foot = rig.getFloorY() + SEAT_CLEARANCE;
    const centre = { x: _head.x, y: foot + this.halfHeight + RADIUS, z: _head.z };
    this.body.setTranslation(centre, true);
    if (immediate) this.body.setNextKinematicTranslation(centre);
    this.seatSlack = SEAT_CLEARANCE - CHARACTER_SKIN;
    this.recovered = 0;
    // Der Controller fragt den Collider, nicht den Körper — und zwischen hier
    // und dem nächsten Bild rechnet die Welt keinen Schritt.
    this.physics.syncColliders();
    this.lastHead.copy(_head);
    this.hasLastHead = true;
  }

  /**
   * Wie weit die Sohle über der Fläche unter ihr steht — gemessen, nicht
   * geraten.
   *
   * Ein Formwurf der Kapsel selbst, gerade so weit nach unten, wie ihre Haut
   * reicht. `null` heißt „in dieser Reichweite ist nichts", **0** heißt „sie
   * steckt schon drin" (ein Wurf, der am Start durchdringt, meldet den
   * Aufprall zur Zeit null). Die eigene Kapsel ist ausgenommen, und was gerade
   * durchlässig ist — ein Portalboden —, zählt hier so wenig wie beim Gehen.
   *
   * Gefragt wird an der Stelle, an der der Controller gerechnet hat: Der
   * Körper wird erst danach versetzt.
   */
  private groundGap(): number | null {
    const hit = this.physics.world.castShape(
      this.body.translation(),
      UPRIGHT,
      DOWN,
      this.collider.shape,
      0,
      CHARACTER_SKIN,
      true,
      undefined,
      interactionGroups(GROUP_PLAYER, PLAYER_FILTER & ~this.phaseMask),
      this.collider,
      this.body,
    );
    return hit === null ? null : hit.time_of_impact;
  }

  /**
   * Wie viel von der senkrechten Bewegung der Kapsel das Rig mitmacht.
   *
   * Alles — außer dem Stück, mit dem die Kapsel gerade eben über dem Boden
   * abgesetzt wurde. Das setzt sich nach unten ab, bis die Sohle auf ihrer Haut
   * steht, und wäre sonst ein Ruck nach unten bei jedem Weltwechsel, jedem
   * Portal und jeder Rettung. Steht die Kapsel wieder, ist das Guthaben
   * aufgebraucht; wird sie stattdessen nach oben geschoben, war das Absetzen
   * ohnehin vorbei.
   */
  private settle(dy: number): number {
    if (this.seatSlack <= 0) return dy;
    if (dy >= 0) {
      // Steht sie schon, oder wird sie merklich nach oben geschoben, ist das
      // Absetzen vorbei — ein Zehntelmillimeter Nachgeben des Bodens ist es
      // nicht, und der käme sonst als Guthaben mitten im Fall abhanden.
      if (this.grounded || dy > GROUND_RECOVER) this.seatSlack = 0;
      return dy;
    }
    const absorbed = Math.min(this.seatSlack, -dy);
    this.seatSlack -= absorbed;
    return dy + absorbed;
  }

  /**
   * Keeps the capsule as tall as the player is right now — standing, ducking,
   * or halfway between the two.
   *
   * A capsule is resized around its centre, so a shorter one would leave the
   * ground with its feet. Moving the centre by the same amount the half height
   * lost keeps the soles exactly where they were: crouching lowers the head,
   * not the feet.
   */
  private updateShape(rig: PlayerRig): void {
    const target = Math.max(0.06, rig.getHeadHeight() / 2 - RADIUS);
    const delta = target - this.halfHeight;
    if (Math.abs(delta) < 0.005) return;
    this.halfHeight = target;
    this.collider.setShape(new this.physics.rapier.Capsule(target, RADIUS));

    const t = this.body.translation();
    const centre = { x: t.x, y: t.y + delta, z: t.z };
    this.body.setTranslation(centre, true);
    this.body.setNextKinematicTranslation(centre);
    // Gleich danach rechnet der Character-Controller, und der liest den
    // Collider (`PhysicsWorld.syncColliders`).
    this.physics.syncColliders();
  }
}

/** True when the solver ate most of the movement we asked for. */
function blocked(applied: number, desired: number): boolean {
  return Math.abs(desired) > 1e-3 && Math.abs(applied) < Math.abs(desired) * 0.5;
}

/**
 * Die Strecke kam zurück, wie sie hingegeben wurde: Auf ihr stand nichts.
 *
 * Ein Promille Spielraum, weil zwischen hier und Rapier einmal `f32` liegt —
 * und weit genug von allem entfernt, was der Controller sonst zurückgibt: Wo
 * er anhält, kommt (fast) null heraus, wo er ansaugt oder eine Rampe abwärts
 * rechnet, ein Vielfaches.
 */
function untouched(applied: number, desired: number): boolean {
  return Math.abs(applied - desired) <= Math.abs(desired) * 1e-3;
}
