import * as THREE from 'three';
import { NpcBody, type BarMode } from './NpcBody';
import { newBrainState, stepBrain, wrapAngle, type BrainState, type Point } from './npcBrain';
import { brainOf, type BrainId, type BrainTuning } from './npcBrains';
import { hitZone, type HitBody, type HitZone } from './npcHit';
import { npcSkin, type NpcKind, type NpcSkin } from './npcKinds';
import {
  GROUP_NPC,
  ALL_GROUPS,
  type PhysicsBody,
  type PhysicsWorld,
} from '../../physics/PhysicsWorld';
import { NavAgent, type DoorAction, type Spot3 } from '../nav/navAgent';
import type { PathPoint } from '../nav/navPath';
import { DOOR_OPEN_TIME } from '../nav/navDoor';
import { fallDamage, fallHeight } from '../nav/navFall';
import { GUARD_SENSES, ZOMBIE_SENSES } from '../nav/navPerception';
import type { NavGraph } from '../nav/navGraph';
import { profileOf } from '../nav/navProfile';
import { NO_TILE, type TileKey } from '../nav/navTile';
import { yawThrough } from '../portal/portalCrossing';

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
  /**
   * Sein Läufer (`worlds/nav/navAgent.ts`) — erst da, wenn er zum ersten Mal
   * einen Weg braucht.
   *
   * Nicht jeder braucht einen: Wer stehen bleibt oder blind herumschlendert,
   * plant nichts, und fünfzig ungenutzte Wegsucher wären fünfzig Meinungen,
   * die niemand liest.
   */
  private agent: NavAgent | null = null;
  /**
   * Wie lange er noch fliegt, in Sekunden — `0`, solange er auf dem Boden ist.
   *
   * Solange etwas darin steht, hat das **Hirn nichts zu sagen**: Eine
   * Wurfparabel, in die jedes Bild eine waagerechte Wunschgeschwindigkeit
   * hineingeschrieben wird, ist keine mehr, sondern ein Schweben.
   */
  private flying = 0;
  /**
   * Wie schnell er in diesem Sturz höchstens gefallen ist, in m/s — `0`,
   * solange er steht (`land`).
   */
  private falling = 0;
  /**
   * Die Tür, an der er gerade arbeitet, und wie lange schon.
   *
   * Zwei Handgriffe, ein Zähler: Wer aufmachen kann, braucht eine halbe
   * Sekunde (`nav/navDoor.DOOR_OPEN_TIME`); wer nur zuschlagen kann, so lange,
   * wie das Blatt aushält. Der Zähler fängt bei jeder neuen Tür von vorn an —
   * sonst spränge eine zweite Tür auf, weil er an der ersten lange genug
   * gestanden hat.
   */
  private doorAt = '';
  private doorWork = 0;
  /** Ob er in diesem Bild auf eine Tür einschlägt — dafür holt das Modell aus. */
  private hammering = false;
  /**
   * Die Tür, die er **in diesem Bild** kleingekriegt hat — sonst `''`.
   *
   * Ein Ereignis und kein Zustand: Daran hängt eine Meldung, und die soll
   * einmal kommen und nicht sechzigmal je Sekunde (`NpcDirector`).
   */
  brokeDoor = '';
  private readonly physics: PhysicsWorld;
  /**
   * Ob er noch einen Körper in der Physik hat — und wo er stand, als er ihn
   * verlor (`feet`).
   */
  private bodied = true;
  private readonly resting = new THREE.Vector3();
  /**
   * **Wohin er geschickt wurde** — `null`, solange ihn niemand geschickt hat.
   *
   * Ein Auftrag ersetzt den Spieler in beiden Rechnungen auf einmal: Der
   * Läufer sucht den Weg **dorthin** statt zu ihm, und das Hirn (`'errand'`)
   * bekommt ihn als Ziel. Wer einen Auftrag hat, hat damit auch keinen Grund
   * mehr, jemanden zu bemerken — das steht in seinem Hirn und nicht hier.
   */
  private errand: THREE.Vector3 | null = null;
  private navigator: NpcNavigator | null = null;
  private navigatorTuning: BrainTuning | null = null;
  private externallyNavigated = false;

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
    /** Wohin er gehen soll, statt jemandem nachzugehen. */
    errand?: THREE.Vector3 | null;
  }) {
    const skin = npcSkin(options.kind);
    this.physics = options.physics;
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
      // **Seine eigene Gruppe** (`GROUP_NPC`): An seinem Zylinder darf sich
      // alles stoßen — der Spieler, eine Kiste, ein anderer NPC —, nur eine
      // Kugel nicht. Die prallte sonst vor der Trefferzone ab und träfe nie
      // (`PhysicsWorld.GROUP_NPC`).
      membership: GROUP_NPC,
      filter: ALL_GROUPS,
    });
    this.entry.body.lockRotations(true, true);
    this.entry.previousPosition.copy(this.holder.position);
    if (options.errand) this.errand = options.errand.clone();
  }

  /**
   * Ihn irgendwohin schicken — oder den Auftrag wieder aufheben (`null`).
   *
   * Ab dann läuft er dorthin statt jemandem nach. Das Hirn dazu ist
   * `'errand'`; wer einem Verfolger einen Auftrag gibt, bekommt einen, der
   * den Weg zum Ziel plant und ihn trotzdem nur läuft, solange er jemanden
   * sieht — die beiden gehören zusammen.
   */
  sendTo(point: THREE.Vector3 | null): void {
    if (!point) {
      this.errand = null;
      this.agent?.clear();
      return;
    }
    this.errand ??= new THREE.Vector3();
    this.errand.copy(point);
  }

  /** Wohin er geschickt wurde, oder `null`. */
  get goal(): THREE.Vector3 | null {
    return this.errand;
  }

  /**
   * Opt in to a world's precise movement path. The world has already selected
   * a perceived goal or patrol destination; attacks still use that final goal.
   * Other NPCs retain their existing navigation, sensing and turning behavior.
   */
  setNavigator(navigator: NpcNavigator | null): void {
    this.navigator = navigator;
    this.navigatorTuning = navigator ? { ...this.tuning, sense: Infinity } : null;
    this.externallyNavigated = false;
    this.agent?.clear();
  }

  /** Ob er noch steht. Ein Gefallener rechnet nicht mehr mit. */
  get alive(): boolean {
    return this.dying === null;
  }

  /**
   * Wo seine Füße stehen — der Punkt, mit dem alle anderen rechnen.
   *
   * **Wer keinen Körper mehr hat, hat trotzdem eine Stelle.** Ein Gefallener
   * wird im selben Zug aus der Physik genommen (`unbody`), liegt aber noch ein
   * paar Sekunden herum, und in dieser Zeit fragt der Regisseur jedes Bild, wo
   * er ist. Ein Rapier-Körper, den es nicht mehr gibt, beantwortet das nicht,
   * sondern reißt die ganze wasm mit („recursive use of an object" —
   * `RuntimeError: unreachable`). Deshalb merkt er sich beim Abbau, wo er
   * zuletzt stand, und antwortet von da an von dort.
   */
  feet(target: THREE.Vector3): THREE.Vector3 {
    if (!this.bodied) return target.copy(this.resting);
    const t = this.entry.body.translation();
    return target.set(t.x, t.y - this.skin.height / 2, t.z);
  }

  /**
   * Wo seine **Mitte** steht — der Punkt, mit dem die Physik rechnet und mit
   * dem ein Portal ihn misst (`worlds/portal/PortalWorld.ts`).
   *
   * Die Füße sind der Punkt aller anderen; ein Portal in einer Wand hängt
   * aber auf Brusthöhe, und wer es mit den Füßen prüfte, ginge einen halben
   * Körper zu tief durch die Wand.
   */
  center(target: THREE.Vector3): THREE.Vector3 {
    const at = this.feet(target);
    return at.setY(at.y + this.skin.height / 2);
  }

  /**
   * Ob er gerade ein Körper in der Physik ist — und keine Leiche im Abgang.
   *
   * Wer gefallen ist, wird im selben Zug herausgenommen (`unbody`), und jede
   * Frage an einen Rapier-Körper, den es nicht mehr gibt, reißt die wasm mit.
   * Deshalb fragt jeder, der über alle läuft, zuerst hier nach.
   */
  get solid(): boolean {
    return this.bodied && this.alive;
  }

  /**
   * Sein Körper, so wie ihn eine Kugel sieht (`npcHit.ts`).
   *
   * **Mit Gierwinkel**, denn die Trefferzonen sind Kästen und keine Röhre: Der
   * Rumpf ist breiter als tief, und ohne diese Zahl stünde er beim Rechnen
   * immer nach Norden — man träfe ihn von der Seite zu leicht und von vorn zu
   * schwer.
   */
  hitBody(): HitBody {
    const at = this.feet(_probe);
    return {
      feet: { x: at.x, y: at.y, z: at.z },
      height: this.skin.height,
      radius: this.skin.radius,
      yaw: this.yaw,
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
  update(dt: number, player: Point | null, random: () => number, nav?: NavRun | null): boolean {
    // **Beides gilt für ein Bild.** Wer nicht mehr plant — weil der Spieler
    // außer Reichweite ist oder weil er gerade umfällt —, kommt gar nicht erst
    // bis `workDoor`; ohne diese zwei Zeilen holte er dann für immer aus, und
    // die Meldung „Die Tür ist hin" käme sechzigmal je Sekunde.
    this.brokeDoor = '';
    this.hammering = false;
    if (this.dying !== null) {
      this.dying += dt;
      // Das Umfallen dauert eine halbe Sekunde, das Liegenbleiben besorgt der
      // Aufräumer im Regisseur.
      this.model.setFallen(this.dying / 0.5);
      this.model.update(dt, 0, false);
      return false;
    }

    if (this.land()) return false;

    const t = this.entry.body.translation();
    const waypoint = this.navigate(dt, { x: t.x, z: t.z }, player, nav ?? null);
    const goal = this.errand ? { x: this.errand.x, z: this.errand.z } : null;
    const step = stepBrain(
      this.brain,
      this.state,
      { at: { x: t.x, z: t.z }, yaw: this.yaw, player, waypoint, goal, dt, random },
      this.externallyNavigated ? this.navigatorTuning! : this.tuning,
    );

    if (this.externallyNavigated) {
      // A cleared path is a contract for the body, not just the model's gaze.
      // Keep smooth model turning, but do not sweep a wide arc across a tight
      // doorway while turning. Stop at a corner before the next segment.
      if (!waypoint) {
        step.vx = 0;
        step.vz = 0;
        if (!step.attack) step.gait = 'stand';
      } else if (step.gait === 'walk') {
        const dx = waypoint.x - t.x;
        const dz = waypoint.z - t.z;
        const distance = Math.hypot(dx, dz);
        const speed = Math.min(Math.hypot(step.vx, step.vz), distance / Math.max(dt, 1e-5));
        step.vx = distance > 1e-6 ? (dx / distance) * speed : 0;
        step.vz = distance > 1e-6 ? (dz / distance) * speed : 0;
      }
    }

    // Die Waagerechte kommt vom Hirn, die Senkrechte von der Schwerkraft —
    // **außer im Flug**: Wer springt, hat seine Geschwindigkeit beim Absprung
    // bekommen, und jedes weitere Hineinschreiben macht aus dem Sprung ein
    // Schweben.
    this.flying = Math.max(0, this.flying - dt);
    if (this.flying === 0) {
      const velocity = this.entry.body.linvel();
      this.entry.body.setLinvel({ x: step.vx, y: velocity.y, z: step.vz }, true);
    }

    this.yaw = step.yaw;
    this.model.rotation.y = this.yaw;
    this.speed = Math.hypot(step.vx, step.vz);
    // Er holt aus, wenn er zuschlägt — und auch dann, wenn das, was er
    // einschlägt, eine Tür ist und kein Spieler.
    this.striking = step.gait === 'strike' || this.hammering;
    this.model.update(dt, this.speed, this.striking);
    this.model.setAlert(step.sees);
    return step.attack;
  }

  /**
   * **Der Aufprall** — was ein Sturz kostet, wenn er unten ankommt.
   *
   * `true`, wenn er daran gestorben ist; dann ist dieses Bild für ihn zu Ende.
   *
   * Gemessen wird die **Fallgeschwindigkeit** und nicht die Kante, von der er
   * kam: Wer geschubst wird, hatte nie eine Kante, und wer über eine Lücke
   * springt, kommt flacher an, als der Höhenunterschied vermuten lässt
   * (`nav/navFall.fallHeight`). Die Schwerkraft ist die der Welt — auf dem Mond
   * fällt man langsamer, und dann tut es auch weniger weh.
   *
   * Das ist die **zweite Hälfte** dessen, was die Wegsuche vorher schon weiß:
   * Sie plant keinen Absprung ein, den seine Sorte nicht überlebt
   * (`nav/navProfile.canTraverse`). Ohne diese Hälfte wäre das eine Behauptung,
   * die man nicht widerlegen kann — mit ihr fällt der Hamster, der doch
   * springt, wirklich um.
   */
  private land(): boolean {
    const speed = this.entry.body.linvel().y;
    if (speed < -FALL_WATCH) {
      this.falling = Math.max(this.falling, -speed);
      return false;
    }
    if (this.falling === 0) return false;
    const height = fallHeight(this.falling, Math.abs(this.physics.gravityY));
    this.falling = 0;
    return this.damage(fallDamage(height));
  }

  /**
   * Der nächste Wegpunkt — oder `null`, wenn geradeaus richtig ist.
   *
   * **Wer nicht sucht, plant nicht.** Ein Läufer wird nur angelegt, wenn dieses
   * Hirn überhaupt jemandem nachgeht (Sicht *und* Tempo über null) und der
   * Spieler nah genug ist, dass es ihn interessiert. Ein Zombie am anderen
   * Ende der Karte rechnet keinen Weg zu jemandem, den er nicht bemerkt hat.
   */
  private navigate(dt: number, at: Point, player: Point | null, nav: NavRun | null): Point | null {
    this.externallyNavigated = false;
    if (!nav || this.tuning.speed <= 0) return null;

    // **Ein Auftrag geht vor.** Wer geschickt wurde, sucht den Weg dorthin —
    // und fragt gar nicht erst, ob ein Spieler nah genug ist, um ihn zu
    // interessieren. Ohne Auftrag ist das Ziel der Spieler, und dann gilt
    // wieder: Wer niemanden bemerkt, plant auch nichts.
    const destination = this.errand ?? (player && nav.at ? nav.at : null);
    if (!destination) return null;
    if (this.navigator) {
      this.externallyNavigated = true;
      this.feet(_feet);
      return this.navigator({
        at: _feet,
        target: destination,
        dt,
        now: nav.now,
        radius: this.skin.radius,
      });
    }
    if (!this.errand) {
      if (this.tuning.sense <= 0) return null;
      const range = Math.hypot(player!.x - at.x, player!.z - at.z);
      if (range > this.tuning.sense) {
        this.agent?.clear();
        return null;
      }
    }

    this.agent ??= new NavAgent({ profile: profileOf(this.skin.profile), girth: this.skin.radius });
    this.feet(_feet);
    const step = this.agent.step(nav.graph, _feet, destination, dt, nav.now);
    // **Der Schritt, den man nicht geht.** Steht eine Tür im Weg, wird sie
    // aufgemacht oder eingeschlagen; gelaufen wird trotzdem weiter, denn er
    // drückt dabei dagegen (`nav/navAgent.ts`, `AgentStep.doorAction`).
    this.workDoor(nav.graph, step.door, step.doorAction, dt);
    if (step.jump !== NO_TILE) this.teleport(nav.graph, step.jump);
    // Ein Sprung wird nicht nachbestellt, solange einer läuft: Der Läufer plant
    // alle halbe Sekunde neu und meldet den Absprung dann noch einmal — mitten
    // im Flug wäre das ein zweiter Absprung aus der Luft.
    if (step.leap !== NO_TILE && this.flying === 0) this.launch(nav.graph, step.leap);
    return step.waypoint;
  }

  /**
   * **Was er an einer Tür tut** — die eine Stelle, an der ein NPC die Welt
   * verändert, statt nur durch sie zu laufen.
   *
   * Aufmachen dauert eine halbe Sekunde, Einschlagen so lange, wie das
   * Material hergibt (`nav/navDoor.ts`). Beides passiert **hier** und nicht in
   * der Welt: Wer davorsteht, weiß es selbst am besten, und eine Welt, die
   * fünfzig NPCs nach ihren Türen fragen müsste, fragte jedes Bild fünfzigmal.
   */
  private workDoor(graph: NavGraph, id: string, action: DoorAction, dt: number): void {
    if (!id || action === 'none') {
      this.doorAt = '';
      this.doorWork = 0;
      return;
    }
    if (id !== this.doorAt) {
      this.doorAt = id;
      this.doorWork = 0;
    }
    this.doorWork += dt;
    if (action === 'break') {
      this.hammering = true;
      if (!graph.poundDoor(id, dt)) return;
      this.brokeDoor = id;
      this.doorAt = '';
      return;
    }
    if (this.doorWork < DOOR_OPEN_TIME) return;
    graph.setDoor(id, { open: true });
    this.doorAt = '';
  }

  /**
   * **Der Absprung** — die eine Verbindung, die man wirklich fliegt.
   *
   * Ein Portal versetzt, eine Treppe geht man, ein Absatz fällt man hinunter.
   * Ein Sprung über eine Lücke ist keines davon: Es gibt keine Geometrie
   * dazwischen, über die ein Körper käme, und Versetzen sähe aus wie ein
   * Fehler. Also wird geworfen — mit der Geschwindigkeit, die ihn in einem Bogen
   * genau auf der Zielkachel landen lässt.
   *
   * Die Rechnung ist die des schrägen Wurfs: Aus der gewünschten Steighöhe
   * (`LEAP_RISE` über dem höheren der beiden Enden) folgt die
   * Absprunggeschwindigkeit nach oben, daraus die Flugzeit bis zur Zielhöhe,
   * und daraus die waagerechte Geschwindigkeit. Die Schwerkraft kommt aus der
   * **Welt** und nicht aus einer Konstante: Auf dem Mond springt er weiter, und
   * das soll er auch.
   */
  private launch(graph: NavGraph, tile: TileKey): void {
    const to = graph.worldOf(tile);
    const t = this.entry.body.translation();
    const dx = to.x - t.x;
    const dz = to.z - t.z;
    // Gerechnet wird von Mitte zu Mitte: Der Körper sitzt eine halbe Höhe über
    // seinen Füßen, das Ziel ist ein Boden.
    const dy = to.y + this.skin.height / 2 - t.y;
    const far = Math.hypot(dx, dz);
    const gravity = Math.abs(this.physics.gravityY);
    if (far < 0.05 || gravity < 0.01) return;

    const rise = Math.max(dy, 0) + LEAP_RISE;
    const up = Math.sqrt(2 * gravity * rise);
    // Zeit bis zurück auf Zielhöhe: die größere der beiden Lösungen.
    const time = (up + Math.sqrt(Math.max(0, up * up - 2 * gravity * dy))) / gravity;
    if (!Number.isFinite(time) || time <= 0) return;

    this.entry.body.setLinvel({ x: dx / time, y: up, z: dz / time }, true);
    this.flying = time;
  }

  /**
   * Durch ein Portal.
   *
   * Die einzige Verbindung, die ein Körper nicht laufen kann: Treppen und
   * Absätze haben eine Geometrie, durch die er wirklich kommt, ein Portal
   * nicht. Die Geschwindigkeit wird dabei gelöscht und die letzte Position
   * mitgezogen — sonst zieht das Zeichnen einen Strich quer durch die Welt.
   */
  private teleport(graph: NavGraph, tile: TileKey): void {
    const at = graph.worldOf(tile);
    const y = at.y + this.skin.height / 2 + 0.05;
    this.entry.body.setTranslation({ x: at.x, y, z: at.z }, true);
    this.entry.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    // Wer versetzt wird, fällt nicht mehr: Ein Portal mitten im Sturz nimmt
    // ihm die Geschwindigkeit, und dann soll es ihm auch den Aufprall nehmen
    // (`land`).
    this.falling = 0;
    this.entry.previousPosition.set(at.x, y, at.z);
    this.holder.position.set(at.x, y, at.z);
  }

  /**
   * **Durch ein Portal des Spielers** — Körper, Blickrichtung und Tempo auf
   * einmal.
   *
   * Der Unterschied zu `teleport` ist der zwischen einer Verbindung, die in
   * der Karte steht, und einem Loch, das eben erst jemand in die Wand
   * geschossen hat: Dort wird auf eine Kachel gesetzt, hier wird eine ganze
   * Bewegung umgerechnet. `transform` ist dieselbe Matrix, die auch Kisten
   * und den Spieler versetzt (`Portal.getTraversalMatrix`).
   *
   * **Vier Dinge gehen mit, und jedes hat sich sein Bild verdient:**
   *
   * - Die **Geschwindigkeit**, gedreht. Wer in ein Bodenportal fällt und aus
   *   einer Wand kommt, fliegt heraus; wer sie hier vergisst, kippt statt
   *   dessen vor dem Ausgang auf den Boden.
   * - Die **Blickrichtung** (`portalCrossing.yawThrough`) — samt dem Kurs, den
   *   sich ein Schlenderer merkt. Ohne sie läuft er hinter einem gedrehten
   *   Portal in die nächste Wand, und man sucht den Fehler in der Wegsuche.
   * - Der **Sturz**: Wer versetzt wird, kommt nicht mehr dort an, wo er
   *   hingefallen wäre. Dieselbe Regel wie beim Portal in der Karte — sonst
   *   stirbt der Zombie, den man durch ein Bodenportal fallen lässt, an einem
   *   Aufprall, den es nie gab (`land`).
   * - Der **Weg**: Der geplante liegt auf der anderen Seite und ist keiner
   *   mehr. Er plant im nächsten Bild neu.
   */
  warp(transform: THREE.Matrix4): void {
    if (!this.bodied) return;
    const t = this.entry.body.translation();
    _warp.set(t.x, t.y, t.z).applyMatrix4(transform);
    this.entry.body.setTranslation({ x: _warp.x, y: _warp.y, z: _warp.z }, true);
    this.entry.previousPosition.copy(_warp);
    this.holder.position.copy(_warp);

    const v = this.entry.body.linvel();
    const speed = Math.hypot(v.x, v.y, v.z);
    if (speed > 1e-6) {
      // `transformDirection` normiert; das Tempo kommt danach wieder daran.
      _warp.set(v.x, v.y, v.z).transformDirection(transform).multiplyScalar(speed);
      this.entry.body.setLinvel({ x: _warp.x, y: _warp.y, z: _warp.z }, true);
    }

    this.yaw = yawThrough(this.yaw, transform);
    this.model.rotation.y = this.yaw;
    this.state.course = wrapAngle(yawThrough(this.state.course, transform));
    this.falling = 0;
    // Eine Wurfparabel endet am Portal: Was danach kommt, ist ein neuer Flug
    // und keiner, in dem das Hirn noch nichts zu sagen hätte.
    this.flying = 0;
    this.agent?.clear();
  }

  /**
   * Der Weg, den er gerade läuft — als **Linie** und nicht als Kachelmitten,
   * denn genau die wird gezeichnet (`nav/navScene.navPathView`).
   */
  get route(): readonly PathPoint[] {
    return this.agent?.points ?? EMPTY_ROUTE;
  }

  /**
   * Sein Läufer, notfalls frisch angelegt.
   *
   * Für alles, was seiner **Meinung** etwas beibringen will, bevor er zum
   * ersten Mal gelaufen ist: „von diesem Portal weißt du nichts"
   * (`navBelief.ts`). Wer nur zusehen will, nimmt `path`.
   */
  mind(): NavAgent {
    this.agent ??= new NavAgent({ profile: profileOf(this.skin.profile), girth: this.skin.radius });
    return this.agent;
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
    this.model.setHealth(this.health / this.maxHealth);
    if (this.health > 0) return false;
    this.health = 0;
    this.dying = 0;
    this.model.setAlert(false);
    // Wer liegt, hat keine Trefferzone mehr — und keinen Kasten darum herum.
    this.model.setHitView(false);
    return true;
  }

  /** Wann sein Lebensbalken zu sehen ist (`NpcBody.ts`). */
  setBars(mode: BarMode): void {
    this.model.setBars(mode);
  }

  /**
   * **Seine Trefferzonen zeigen oder verstecken** (`npcHit.ts`).
   *
   * Die eine Ansicht, mit der man „ich treffe ihn nicht" von „ich ziele
   * daneben" unterscheiden kann: Was man sieht, ist genau der Kasten, gegen
   * den gerechnet wird — nicht eine Nachbildung davon.
   */
  setHitView(on: boolean): void {
    this.model.setHitView(on && this.alive);
  }

  /**
   * **Seinen Sichtbereich zeigen oder verstecken.**
   *
   * Die Weite kommt aus seinem eigenen Hirn (`tuning.sense`) und nicht aus
   * einer Zahl in der Anzeige: Wer am Hirn-Werkzeug die Sichtweite verstellt,
   * soll den Kreis mitwandern sehen. Der Öffnungswinkel kommt aus den Sinnen
   * seiner Sorte (`nav/navPerception.ts`).
   */
  setSight(on: boolean, color: number): void {
    const senses = this.skin.id === 'zombie' ? ZOMBIE_SENSES : GUARD_SENSES;
    this.model.setSight(
      on && this.tuning.sense > 0 ? { range: this.tuning.sense, fov: senses.fov, color } : null,
    );
  }

  /** Wie lange er schon liegt — der Regisseur räumt danach auf. */
  get restingFor(): number {
    return this.dying ?? 0;
  }

  /**
   * Nimmt ihn aus der Physik heraus, ohne das Modell wegzuwerfen.
   *
   * Vorher wird gemerkt, wo er steht: Danach gibt es den Körper nicht mehr, und
   * jede Frage an ihn ist ein Absturz und keine Antwort (`feet`).
   */
  unbody(physics: PhysicsWorld = this.physics): void {
    if (!this.bodied) return;
    this.feet(this.resting);
    this.bodied = false;
    physics.remove(this.entry);
  }

  /**
   * Weg damit — Modell und Körper.
   *
   * **Der Körper geht hier auf jeden Fall mit**, auch wenn ihn schon jemand
   * herausgenommen hat (`unbody` merkt es) und auch dann, wenn er noch steht.
   * Ein weggeworfenes Modell, dessen Zylinder in Rapier stehen bleibt, ist ein
   * unsichtbares Hindernis mitten im Raum, über das man stolpert und dessen
   * Ursache man nie findet.
   */
  dispose(): void {
    this.unbody();
    this.model.dispose();
    this.holder.removeFromParent();
  }
}

/** Was ein NPC über das Navigationsgitter dieser Frame wissen muss. */
export interface NavRun {
  graph: NavGraph;
  /** Wo der Spieler steht, mit Höhe — die Etage hängt daran. */
  at: Spot3 | null;
  /** Weltzeit in Sekunden. */
  now: number;
}

export interface NpcNavigationInput {
  readonly at: Spot3;
  readonly target: Spot3;
  readonly dt: number;
  readonly now: number;
  readonly radius: number;
}

/** Return the next metre waypoint; null explicitly stops horizontal movement. */
export type NpcNavigator = (input: NpcNavigationInput) => Point | null;

/** Wie hoch ein Sprung über das höhere Ende hinausgeht, in Metern. */
const LEAP_RISE = 0.7;

/**
 * Ab welchem Sinken er überhaupt als fallend gilt, in m/s.
 *
 * Ein halber Meter je Sekunde: Ein Zylinder, der auf einer Kante aufliegt,
 * sinkt zwischen zwei Bildern ein paar Zehntel — wer das als Sturz zählt,
 * lässt jeden NPC beim Herumstehen langsam sterben.
 */
const FALL_WATCH = 0.5;

const _feet = new THREE.Vector3();
/** Für den Durchtritt durch ein Portal (`warp`). */
const _warp = new THREE.Vector3();
/** Für alles, was nebenher nach einer Stelle fragt (`hitBody`). */
const _probe = new THREE.Vector3();

/** Der Weg dessen, der noch keinen hat. */
const EMPTY_ROUTE: readonly PathPoint[] = [];
