import * as THREE from 'three';
import type { GridPlan } from '../../grid/gridPlan';
import { DIR_S } from '../../nav/navTile';
import { EXIT_HOLD, Kart, WHEEL_GRAB_RANGE, WHEEL_HOLD_RANGE } from '../../kart/Kart';
import { KART_COURSE, PIT_APRON, PIT_LANE, pitSpots } from '../../kart/kartCourse';
import { stampPit, TARMAC_TOP } from '../../kart/kartPit';
import { kartSpeed, kmh, stepKart } from '../../kart/kartDynamics';
import { formatLap, startLap, stepLap, type LapState } from '../../kart/kartRace';
import {
  KART_FIELDS,
  KART_PRESETS,
  STEERING_LABELS,
  clampKart,
  clampKartField,
  kartFieldLabel,
  nextKartStep,
  viewFollow,
  type KartField,
} from '../../kart/kartSettings';
import { confineToCourse, insideApron, nearestOnPath, pathLength } from '../../kart/kartTrack';
import { shortestAngle, stepViewYaw } from '../../kart/kartView';
import { TextPlane } from '../../../ui/TextPlane';
import { LAYER_HUD } from '../../../ui/ScoreHud';
import type { MenuEntry } from '../../../ui/menu';
import { playPick, playTone } from '../../../core/Audio';
import { gripAnchor, type Handedness } from '../../../core/XRInput';
import { visorFrame } from '../../../core/headgear';
import type { WorldContext } from '../../../core/types';
import {
  ALL_GROUPS,
  GROUP_PLAYER,
  GROUP_WORLD,
  type PhysicsBody,
} from '../../../physics/PhysicsWorld';
import type { TestZone, ZoneHost } from './zone';

/**
 * **Das Gokart** — Süden, eine Rundstrecke von 35 × 25 m und zwei Karts in der
 * Box.
 *
 * Die Strecke ist **gebaut und nicht gezeichnet**: Sie besteht aus Geraden und
 * Kurven auf dem Kachelgitter (`kart/kartCourse.ts`) — vier Kurven mit vier
 * verschiedenen Radien —, und alles Weitere folgt daraus: der Asphalt, die
 * Randsteine, die Reifenstapel, wo die Runde anfängt und wie lang sie ist. Die
 * Boxengasse liegt kachelbündig an der Zielgeraden (`kart/kartPit.ts`); es gibt
 * keine Ein- und keine Ausfahrt, weil Gasse und Strecke aneinander stoßen.
 *
 * **Eingestiegen wird mit `A`.** Jedes Kart meldet sich als benutzbar an
 * (`core/usable.ts`, `usePrompt` „Einsteigen"), und damit geht es von oben, aus
 * den Augen und in der Brille mit demselben Knopf, mit dem man auch eine Tür
 * aufmacht. In der Brille geht zusätzlich der alte Weg: die Hand ums Lenkrad
 * schließen. **Ausgestiegen** wird wie bisher, indem man `A`/`X` kurz hält —
 * ein Druck wäre bei Tempo 60 zu leicht versehentlich getroffen, und der
 * Balken vor dem Fahrer füllt sich, solange es läuft.
 *
 * **Was hier gegenüber der alten Gokart-Welt fehlt**, ist das **Rennen gegen
 * andere**: Die Welt schickte ihre Kart-Posen zwanzigmal je Sekunde über einen
 * eigenen Netzkanal, führte eine Rangliste und zeigte die Namen der anderen an
 * der Zielgeraden. Das ist eine halbe Welt für sich, und es ist nicht das, was
 * eine Testwelt prüft: Hier soll man merken, ob Lenkung, Traktion, Rundenzeit
 * und Einsteigen noch tun. Die Module dafür (`kartRace.ts`) sind unangetastet
 * geblieben, falls es wieder ein Rennen geben soll.
 */

/** Halbe Fahrbahnbreite in Metern (`kart/kartCourse.ts`). */
const HALF_WIDTH = KART_COURSE.halfWidth;
/** Wie weit die Reifenstapel am Rand auseinander stehen. */
const BARRIER_SPACING = 4.5;
/** Und wie weit außerhalb des Asphalts sie sitzen. */
const BARRIER_OFFSET = 1.1;
/**
 * Wie weit Randstein und Reifenstapel von der Boxengasse wegbleiben.
 *
 * Sie werden aus der Mittellinie abgeleitet und wüssten sonst nichts davon,
 * dass an der Zielgeraden gar kein Rand ist, sondern die Gasse — und stünden
 * mitten zwischen den Karts.
 */
const PIT_CLEAR = 1.2;
/** Die Flächen neben der Strecke, auf denen ein Kart auch fahren darf. */
const APRONS = [PIT_APRON];
/** Wie schnell die Stick-Lenkung dem Stick folgt, in Einheiten je Sekunde. */
const STEER_RATE = 3.4;

/** Was eine Taste am Schreibtisch im Kart tut. */
type FlatJob = 'throttle' | 'brake' | 'left' | 'right' | 'exit';
const FLAT_KEYS: Readonly<Record<string, FlatJob>> = {
  KeyW: 'throttle',
  ArrowUp: 'throttle',
  KeyS: 'brake',
  ArrowDown: 'brake',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  // Eine Tastatur hat keinen A-Knopf, also bekommt der Ausstieg eine eigene.
  KeyE: 'exit',
};

const UP = new THREE.Vector3(0, 1, 0);
const _hand = new THREE.Vector3();
const _hub = new THREE.Vector3();
const _head = new THREE.Vector3();
const _seat = new THREE.Vector3();
const _spot = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();

/** Der Grundriss der Zone: die Boxengasse und ein Schild davor. */
export function stampKart(plan: GridPlan): void {
  stampPit(plan);
}

/**
 * **Die Einbauten dieser Zone** — und nur sie.
 *
 * Getrennt vom Rest, weil `TestWorld.planLoaded` sie **nach** einem
 * gespeicherten Umbau noch einmal aufsetzt: Ein Einbau hat eine **Kennung**,
 * und `putFixture` ersetzt nach Kennung — es entsteht also kein zweiter
 * daneben. Wände und Bausteine haben keine, und wer eine Wand wegbaut, hat sie
 * weggebaut.
 */
export function fitKart(plan: GridPlan): void {
  plan.putFixture({
    id: 'schild-gokart',
    kind: 'sign',
    x: PIT_LANE.x + 1,
    z: PIT_LANE.z + PIT_LANE.d - 1,
    dir: DIR_S,
    props: { text: 'Kart mit A besteigen · Aussteigen: A/X halten · Klemmbrett im Kart' },
  });
}

// --- und was fährt ----------------------------------------------------------

/**
 * **Die Karts, die Strecke und der Fahrer darin.**
 *
 * Aus der alten `KartWorld` übernommen: Einsteigen, Sitzen, Gas, Bremse,
 * Lenkung (Stick *oder* Lenkrad in der Hand), Nachlauf des Blicks, Rundenzeit,
 * Klemmbrett und Helm. Weggelassen: alles, was mit anderen Spielern zu tun
 * hatte (siehe oben).
 */
export class KartZone implements TestZone {
  private readonly path = KART_COURSE.centre;
  private readonly lapLength = pathLength(this.path);

  private readonly karts: Kart[] = [];
  private readonly bodies = new Map<Kart, PhysicsBody>();
  private readonly owned: THREE.Material[] = [];
  private readonly shapes: THREE.BufferGeometry[] = [];
  private readonly pointerTargets: THREE.Object3D[] = [];

  private world: ZoneHost | null = null;
  private ctx: WorldContext | null = null;

  private driving: Kart | null = null;
  private visor: THREE.Mesh | null = null;
  private exitHeld = 0;
  private wheelGrab: { hand: Handedness; angle: number } | null = null;
  /** Die Stick-Lenkung, geglättet — das Lenkrad führt seinen Winkel selbst. */
  private steer = 0;
  /** Wohin der Blick gerade schaut; er zieht dem Kart nach (`kartView.ts`). */
  private viewYaw = 0;
  private lap: LapState = startLap(0);
  private lapBoard: TextPlane | null = null;
  private boardTick = 0;

  private readonly pressed = new Set<string>();
  private onKeyDown: ((event: KeyboardEvent) => void) | null = null;
  private onKeyUp: ((event: KeyboardEvent) => void) | null = null;

  build(ctx: WorldContext, world: ZoneHost): void {
    this.world = world;
    this.ctx = ctx;

    this.buildRoad(world);
    this.buildKerbs(world);
    this.buildBarriers(world);
    this.buildStart(world);
    this.buildKarts(ctx, world);

    this.onKeyDown = (event) => {
      if (FLAT_KEYS[event.code]) this.pressed.add(event.code);
    };
    this.onKeyUp = (event) => this.pressed.delete(event.code);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  update(dt: number, ctx: WorldContext): void {
    if (this.driving) this.updateDriving(dt, ctx, this.driving);

    ctx.rig.getHeadPosition(_head);
    for (const kart of this.karts) kart.faceHover(_head);

    // Viermal je Sekunde reicht für eine Tafel mit Rundenzeiten.
    this.boardTick += dt;
    if (this.boardTick >= 0.25) {
      this.boardTick = 0;
      this.drawLapBoard();
    }

    // In der Brille geht der alte Weg weiter: die Hand ums Lenkrad schließen.
    if (!this.driving) this.checkBoarding(ctx);
  }

  /** `B`/`Y` stellt beide Karts zurück in die Box, Fahrer und alles. */
  reset(): void {
    if (this.driving && this.ctx) this.leave(this.ctx);
    for (const kart of this.karts) {
      kart.returnHome();
      this.syncBody(kart);
    }
    this.lap = startLap(0);
    this.drawLapBoard();
  }

  dispose(): void {
    // Erst aussteigen, dann abräumen: Der Rig soll nicht eingefroren
    // zurückbleiben, nur weil jemand die Welt gewechselt hat.
    if (this.driving && this.ctx) this.leave(this.ctx);
    if (this.ctx) {
      for (const object of this.pointerTargets) this.ctx.pointer.remove(object);
      this.ctx.rig.frozen = false;
    }
    this.pointerTargets.length = 0;
    if (this.onKeyDown) window.removeEventListener('keydown', this.onKeyDown);
    if (this.onKeyUp) window.removeEventListener('keyup', this.onKeyUp);
    this.onKeyDown = null;
    this.onKeyUp = null;
    this.pressed.clear();

    this.dropVisor();
    for (const kart of this.karts) {
      this.world?.removeUsable(kart.wheelTarget);
      kart.disposeKart();
    }
    this.karts.length = 0;
    this.bodies.clear();
    this.lapBoard?.dispose();
    this.lapBoard = null;
    for (const material of this.owned) material.dispose();
    this.owned.length = 0;
    for (const shape of this.shapes) shape.dispose();
    this.shapes.length = 0;
    this.world = null;
    this.ctx = null;
  }

  /** Die Zeilen, die das Weltmenü dieser Zone beisteuert. */
  menu(): MenuEntry[] {
    return [
      {
        id: 'kart:home',
        label: 'Karts in die Box',
        sub: 'Beide zurück in ihre Bucht',
        icon: 'reset',
        accent: 0xffc857,
        run: () => {
          this.reset();
          this.world?.notify('Karts stehen wieder in der Box');
        },
      },
      {
        id: 'kart:times',
        label: 'Zeiten löschen',
        sub: 'Letzte und beste Runde vergessen',
        icon: 'stopwatch',
        accent: 0x5ee0a0,
        run: () => {
          this.lap = { ...this.lap, laps: 0, lastLap: null, bestLap: null };
          this.drawLapBoard();
          this.world?.notify('Rundenzeiten gelöscht');
        },
      },
    ];
  }

  // --- einsteigen und aussteigen --------------------------------------------

  /**
   * **Die Karts in ihren Buchten** — und jedes meldet sich als benutzbar an.
   *
   * Der Halbmesser ist groß (ein Meter), weil ein Kart ein Meter breit ist und
   * man von vorn, von der Seite und von hinten davorstehen kann; getroffen
   * werden soll es dagegen nicht (`shot: 0`) — eine Kugel, die einen ins Kart
   * setzt, wäre eine Überraschung zu viel.
   */
  private buildKarts(ctx: WorldContext, world: ZoneHost): void {
    const spots = pitSpots();
    // Zwei Karts, also die ersten zwei Vorgaben: gutmütig und nervös. Ein
    // drittes hätte keine Bucht.
    KART_PRESETS.slice(0, spots.length).forEach((preset, index) => {
      const kart = new Kart(preset);
      const spot = spots[index]!;
      kart.placeHome(spot.x, spot.z, spot.yaw);
      world.root.add(kart);
      this.karts.push(kart);
      kart.updateWorldMatrix(true, false);

      // Fest genug, um einen Verkehrshut umzuwerfen, aber nie den Spieler: Ein
      // Kart, das die Kapsel wegschiebt, in der man steht, schießt einen quer
      // über das Gelände.
      this.bodies.set(
        kart,
        world.physics.addKinematic(kart, {
          halfExtents: new THREE.Vector3(0.5, 0.3, 0.85),
          membership: GROUP_WORLD,
          filter: ALL_GROUPS & ~GROUP_PLAYER,
        }),
      );
      this.syncBody(kart);

      world.addUsable(
        kart.wheelTarget,
        {
          use: () => this.enter(ctx, kart),
          usePrompt: () => 'Einsteigen',
        },
        { radius: 1, shot: 0, half: 0.8 },
      );
      // Und am Zeiger, damit es in der Brille auch aus zwei Metern geht.
      ctx.pointer.add({
        object: kart.wheelTarget,
        pokeable: false,
        // Sitzt jemand, hört kein Lenkrad mehr auf einen Strahl: Ein Zeiger,
        // der auf dem Lenkrad vor der Nase liegt, schluckte das Gas.
        ignore: () => this.driving !== null,
        onSelect: () => this.enter(ctx, kart),
      });
      ctx.pointer.add(kart.board.asPointerTarget());
      this.pointerTargets.push(kart.wheelTarget, kart.board);
      this.showBoard(kart);
    });
  }

  /** Eine Hand, die sich um ein Lenkrad schließt, ist ein Fahrer beim Einsteigen. */
  private checkBoarding(ctx: WorldContext): void {
    for (const controller of ctx.input.controllers) {
      if (!controller.tracked || !controller.squeeze.justPressed) continue;
      gripAnchor(controller).getWorldPosition(_hand);
      for (const kart of this.karts) {
        kart.hubPosition(_hub);
        if (_hand.distanceTo(_hub) > WHEEL_GRAB_RANGE) continue;
        this.enter(ctx, kart);
        controller.pulse(0.6, 40);
        return;
      }
    }
  }

  private enter(ctx: WorldContext, kart: Kart): boolean {
    if (this.driving) return false;
    this.driving = kart;
    this.exitHeld = 0;
    this.steer = 0;
    this.wheelGrab = null;
    // Beim Einsteigen schaut man dorthin, wohin das Kart schaut; erst ab dem
    // ersten Lenkeinschlag läuft der Blick hinterher.
    this.viewYaw = kart.motion.yaw;
    this.lap = startLap(nearestOnPath(this.path, kart.motion.x, kart.motion.z).along);
    kart.setSeated(true);
    ctx.rig.frozen = true;
    this.applyHelmet();
    this.seatDriver(ctx, kart);
    playPick(true);
    this.world?.notify(`${kart.preset.name} · Aussteigen: A/X halten`);
    return true;
  }

  /**
   * Aus dem Kart und zurück auf die Füße, daneben. Die Kapsel, die herumläuft,
   * ist inzwischen ganz woanders, also wird ihr gesagt, wo der Spieler gelandet
   * ist.
   */
  private leave(ctx: WorldContext): void {
    const kart = this.driving;
    if (!kart) return;
    this.driving = null;
    this.wheelGrab = null;
    this.exitHeld = 0;
    kart.setSeated(false);
    kart.setBraking(0);
    kart.setExitProgress(0);
    this.applyHelmet();

    kart.updateWorldMatrix(true, false);
    _spot.set(-1.5, 0, 0.2).applyMatrix4(kart.matrixWorld);
    _spot.y = 0;
    ctx.rig.frozen = false;
    // Mit dem Blickwinkel und nicht mit dem des Karts: Wer aussteigt, soll
    // dorthin weiterschauen, wo er gerade hingeschaut hat.
    this.world?.placePlayer(_spot, this.viewYaw);
    playPick(false);
    this.world?.notify('Ausgestiegen');
  }

  /**
   * **Helm auf, Helm ab** — beides an einer Stelle, weil es zwei Dinge sind,
   * die immer zusammen gelten.
   *
   * Von **außen** ist es ein Helm auf dem Kopf: `ctx.wear` setzt ihn dem eigenen
   * Körper auf und sagt ihn allen im Raum an. Von **innen** ist es der
   * Visierrand vor dem Auge — und der ist der eigentliche Zweck der
   * Einstellung: etwas, das stillsteht, während die Welt in der Kurve schwenkt.
   */
  private applyHelmet(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const on = this.driving?.settings.helmet === true;
    ctx.wear(on ? 'helmet' : null);

    if (!on) {
      this.dropVisor();
      return;
    }
    if (this.visor) return;
    const frame = visorFrame();
    frame.layers.set(LAYER_HUD);
    ctx.camera.layers.enable(LAYER_HUD);
    ctx.camera.add(frame);
    this.visor = frame;
  }

  private dropVisor(): void {
    if (!this.visor) return;
    this.visor.removeFromParent();
    this.visor.geometry.dispose();
    (this.visor.material as THREE.Material | undefined)?.dispose();
    this.visor = null;
  }

  /**
   * Setzt den Fahrer in den Sitz — über den **Kopf**, in allen drei Achsen.
   *
   * `placeAt` verschiebt den Rig und nicht den Kopf: In der Brille sitzt das
   * Headset dort, wo der Spieler in seinem Zimmer gerade ist, und wie hoch es
   * über dem Rig sitzt, sind seine Körpergröße und seine Haltung. Beides muss
   * herausgerechnet werden, sonst hat ein Sitzender die Augen auf Sitzhöhe und
   * ein Stehender schaut über den Überrollbügel.
   *
   * **Der Ort kommt vom Kart, die Richtung vom Blick.** Der Sitz wandert ohne
   * Verzug mit dem Kart — sonst sähe man neben ihm. Gedreht wird dagegen nur
   * so schnell, wie der Nachlauf es zulässt (`kartView.ts`), und das ist der
   * ganze Unterschied zwischen „das Kart dreht sich unter mir" und „die Welt
   * wird mir weggerissen".
   */
  private seatDriver(ctx: WorldContext, kart: Kart): void {
    kart.updateWorldMatrix(true, false);
    kart.seat.getWorldPosition(_seat);
    ctx.rig.placeAt(_seat, this.viewYaw);
    ctx.rig.getHeadPosition(_head);
    ctx.rig.position.x += _seat.x - _head.x;
    ctx.rig.position.y += _seat.y - _head.y;
    ctx.rig.position.z += _seat.z - _head.z;
    ctx.rig.updateMatrixWorld(true);
  }

  // --- fahren ---------------------------------------------------------------

  private updateDriving(dt: number, ctx: WorldContext, kart: Kart): void {
    const left = ctx.input.get('left');
    const right = ctx.input.get('right');
    // Eine Hand, deren Strahl auf dem Klemmbrett liegt, hat ihren Trigger an
    // das Brett verliehen. Je Hand, damit das Lesen mit der einen nicht auch
    // der anderen das Gas nimmt.
    let throttle = ctx.pointer.hoveringWith('right') ? 0 : (right?.trigger.value ?? 0);
    let brake = ctx.pointer.hoveringWith('left') ? 0 : (left?.trigger.value ?? 0);
    let steerWish = 0;
    if (!ctx.renderer.xr.isPresenting) {
      if (this.pressedIs('throttle')) throttle = 1;
      if (this.pressedIs('brake')) brake = 1;
      steerWish = (this.pressedIs('left') ? 1 : 0) - (this.pressedIs('right') ? 1 : 0);
    }

    if (kart.settings.steering === 'wheel') {
      this.updateWheelGrab(ctx, kart);
      // Die Tastatur dreht das Lenkrad trotzdem; eine Hand zum Greifen gibt es
      // dort nicht.
      if (steerWish !== 0) kart.turnWheelBy(steerWish * STEER_RATE * 0.6 * dt);
    } else {
      const stick = left?.thumbstick.x ?? 0;
      // Stick nach links ist negativ, und links ist eine Linkskurve.
      const wish = THREE.MathUtils.clamp(steerWish - stick, -1, 1);
      this.steer += THREE.MathUtils.clamp(wish - this.steer, -STEER_RATE * dt, STEER_RATE * dt);
      kart.showSteer(this.steer);
    }

    const before = { x: kart.motion.x, z: kart.motion.z };
    kart.motion = stepKart(
      kart.motion,
      { throttle, brake, steer: kart.steerInput },
      kart.settings,
      dt,
    );

    const guarded = confineToCourse(
      this.path,
      HALF_WIDTH,
      APRONS,
      kart.motion.x,
      kart.motion.z,
      kart.motion.vx,
      kart.motion.vz,
    );
    kart.motion.x = guarded.x;
    kart.motion.z = guarded.z;
    kart.motion.vx = guarded.vx;
    kart.motion.vz = guarded.vz;
    if (guarded.hit && kmh(kartSpeed(kart.motion)) > 12) {
      playTone({ type: 'sawtooth', from: 180, to: 90, duration: 0.09, gain: 0.04 });
    }

    kart.applyMotion();
    kart.applySteering();
    kart.roll(Math.hypot(kart.motion.x - before.x, kart.motion.z - before.z));
    kart.setBraking(brake);
    this.syncBody(kart);
    // Der Blick zieht nach, und **danach** wird der Sitz gestellt: `seatDriver`
    // dreht den Rig auf genau diesen Winkel.
    this.viewYaw = stepViewYaw(this.viewYaw, kart.motion.yaw, viewFollow(kart.settings), dt);
    this.seatDriver(ctx, kart);
    this.updateLap(dt, kart);
    this.updateExit(dt, ctx);
  }

  /** Ob eine Taste mit diesem Auftrag gedrückt ist. */
  private pressedIs(job: FlatJob): boolean {
    for (const code of this.pressed) {
      if (FLAT_KEYS[code] === job) return true;
    }
    return false;
  }

  /**
   * Lenken durch Drehen: Eine Hand nimmt das Lenkrad irgendwo am Kranz, und
   * wie weit diese Hand um die Nabe wandert, so weit dreht das Rad. Loslassen —
   * oder zu weit weggreifen — gibt es zurück.
   *
   * Gemessen wird dabei **gegen den Blick und nicht gegen das Kart**
   * (`Kart.handAngle`): Seit der Kopf nachzieht, drehen sich die beiden nicht
   * mehr im selben Bild, und eine völlig stillgehaltene Hand wanderte sonst um
   * die Nabe — das Lenkrad drehte sich unter ihr weg und lenkte dabei weiter.
   */
  private updateWheelGrab(ctx: WorldContext, kart: Kart): void {
    const lag = shortestAngle(kart.motion.yaw - this.viewYaw);
    const grab = this.wheelGrab;
    if (grab) {
      const controller = ctx.input.get(grab.hand);
      if (!controller || !controller.tracked || !controller.squeeze.pressed) {
        this.wheelGrab = null;
        return;
      }
      gripAnchor(controller).getWorldPosition(_hand);
      kart.hubPosition(_hub);
      if (_hand.distanceTo(_hub) > WHEEL_HOLD_RANGE) {
        this.wheelGrab = null;
        return;
      }
      const angle = kart.handAngle(_hand, lag);
      kart.turnWheelBy(shortestAngle(angle - grab.angle));
      grab.angle = angle;
      return;
    }

    for (const controller of ctx.input.controllers) {
      if (!controller.tracked || !controller.squeeze.justPressed) continue;
      gripAnchor(controller).getWorldPosition(_hand);
      kart.hubPosition(_hub);
      if (_hand.distanceTo(_hub) > WHEEL_HOLD_RANGE) continue;
      this.wheelGrab = { hand: controller.handedness!, angle: kart.handAngle(_hand, lag) };
      controller.pulse(0.3, 20);
      return;
    }
  }

  /**
   * Der Weg hinaus. Ein Druck wäre bei Tempo zu leicht versehentlich
   * getroffen, also ist es ein kurzes Halten — und das Schild vor dem Fahrer
   * füllt sich, solange es läuft. Das macht die Regel sichtbar, statt sie
   * aufzuschreiben.
   */
  private updateExit(dt: number, ctx: WorldContext): void {
    const kart = this.driving;
    if (!kart) return;
    // `A` bestätigt auch einen Menüeintrag, also zählt es nur von einer Hand,
    // die gerade auf keinen zeigt.
    const held =
      ctx.input.controllers.some(
        (controller) =>
          controller.tracked &&
          controller.primary.pressed &&
          !ctx.pointer.hoveringWith(controller.handedness),
      ) || this.pressedIs('exit');
    this.exitHeld = held ? this.exitHeld + dt : 0;
    kart.setExitProgress(this.exitHeld / EXIT_HOLD);
    if (this.exitHeld >= EXIT_HOLD) this.leave(ctx);
  }

  /** Wie weit das Kart um die Runde gekommen ist, und was das wert war. */
  private updateLap(dt: number, kart: Kart): void {
    const hit = nearestOnPath(this.path, kart.motion.x, kart.motion.z);
    const step = stepLap(this.lap, hit.along, this.lapLength, dt);
    this.lap = step.state;
    if (!step.completed || this.lap.lastLap === null) return;

    playTone({
      type: 'sine',
      from: step.record ? 620 : 480,
      to: step.record ? 980 : 620,
      duration: 0.22,
      gain: 0.07,
    });
    this.world?.announce(
      `Runde ${formatLap(this.lap.lastLap)}${step.record ? ' · Bestzeit!' : ''}`,
    );
    this.drawLapBoard();
  }

  /** Trägt die Pose des Karts auf den Körper über, der Hüte umschiebt. */
  private syncBody(kart: Kart): void {
    const entry = this.bodies.get(kart);
    if (!entry) return;
    entry.body.setNextKinematicTranslation({ x: kart.motion.x, y: 0.3, z: kart.motion.z });
    _quaternion.setFromAxisAngle(UP, kart.motion.yaw);
    entry.body.setNextKinematicRotation({
      x: _quaternion.x,
      y: _quaternion.y,
      z: _quaternion.z,
      w: _quaternion.w,
    });
  }

  // --- das Klemmbrett -------------------------------------------------------

  /** Das ganze Einstellungsmenü eines Karts, als Zeilen auf seinem Klemmbrett. */
  private boardPage(kart: Kart): MenuEntry[] {
    const rows: MenuEntry[] = [
      {
        id: 'kart:leave',
        label: 'Aussteigen',
        sub: 'Oder A/X gedrückt halten',
        icon: 'back',
        accent: 0xffc857,
        run: () => {
          if (this.driving === kart && this.ctx) this.leave(this.ctx);
        },
      },
      {
        id: 'kart:steering',
        label: 'Lenkung',
        sub: 'Stick oder Lenkrad in der Hand',
        badge: STEERING_LABELS[kart.settings.steering],
        icon: 'settings',
        accent: 0x4aa8ff,
        run: () => {
          kart.settings.steering = kart.settings.steering === 'stick' ? 'wheel' : 'stick';
          if (kart.settings.steering === 'stick') this.wheelGrab = null;
          this.steer = kart.steerInput;
          kart.refreshSign();
          this.showBoard(kart);
          this.world?.notify(`Lenkung: ${STEERING_LABELS[kart.settings.steering]}`);
        },
      },
    ];

    for (const field of KART_FIELDS) {
      rows.push({
        id: `kart:${field.key}`,
        label: field.label,
        sub: field.sub,
        badge: kartFieldLabel(field, kart.settings),
        icon: 'settings',
        accent: kart.preset.color,
        run: () => this.stepField(kart, field),
      });
    }

    rows.push({
      id: 'kart:helmet',
      label: 'Helm',
      sub: 'Visierrand steht fest im Blick — gegen Übelkeit',
      badge: kart.settings.helmet ? 'auf' : 'ab',
      icon: 'settings',
      accent: 0x9fd8ff,
      checked: kart.settings.helmet,
      run: () => {
        kart.settings.helmet = !kart.settings.helmet;
        this.applyHelmet();
        this.showBoard(kart);
        playPick(true);
        this.world?.notify(kart.settings.helmet ? 'Helm auf' : 'Helm ab');
      },
    });
    rows.push({
      id: 'kart:values',
      label: 'Werte eingeben',
      sub: 'Jede Zahl direkt tippen statt durchzuschalten',
      icon: 'settings',
      accent: kart.preset.color,
      children: KART_FIELDS.map((field) => ({
        id: `kart:type:${field.key}`,
        label: field.label,
        // Die Spanne und nicht der Wert: Der steht schon eine Seite höher, und
        // was hier fehlt, ist die Frage „was darf ich überhaupt eintippen".
        sub: `${field.min}–${field.max} ${field.unit}`.trim(),
        badge: kartFieldLabel(field, kart.settings),
        icon: 'settings',
        accent: kart.preset.color,
        run: () => this.typeField(kart, field),
      })),
    });
    rows.push({
      id: 'kart:reset',
      label: 'Werte zurücksetzen',
      sub: `Wie ${kart.preset.name} aus der Box kam`,
      icon: 'reset',
      accent: 0x9d7bff,
      run: () => {
        Object.assign(kart.settings, clampKart(kart.preset.settings));
        kart.refreshSign();
        this.showBoard(kart);
        this.world?.notify(`${kart.preset.name} zurückgesetzt`);
      },
    });
    rows.push({
      id: 'kart:box',
      label: 'Zurück in die Box',
      sub: 'Setzt genau dieses Kart zurück in seine Bucht',
      icon: 'reset',
      accent: 0x6f7d99,
      run: () => {
        if (this.driving === kart && this.ctx) this.leave(this.ctx);
        kart.returnHome();
        this.syncBody(kart);
        this.world?.notify(`${kart.preset.name} steht wieder in der Box`);
      },
    });
    return rows;
  }

  /** Ein Tipp schaltet einen Wert auf seine nächste Raste. */
  private stepField(kart: Kart, field: KartField): void {
    kart.settings[field.key] = clampKartField(field, nextKartStep(field, kart.settings[field.key]));
    this.showBoard(kart);
    playPick(true);
    this.world?.notify(`${field.label}: ${kartFieldLabel(field, kart.settings)}`);
  }

  /**
   * **Und derselbe Wert getippt** — der Zifferblock vor dem Kopf.
   *
   * Rasten sind zum Ausprobieren da: Man tippt eine Zeile an und merkt am
   * nächsten Bogen, ob es besser wurde. Was sie nicht können, ist das Ende
   * davon — wer weiß, dass sein Kart 0,62 Traktion haben soll, will nicht
   * siebenmal weiterschalten und dabei daran vorbei.
   */
  private typeField(kart: Kart, field: KartField): void {
    this.world?.askNumber({
      title: field.label,
      sub: `${kart.preset.name} · ${field.min} bis ${field.max} ${field.unit}`.trim(),
      hint: field.sub,
      value: String(kart.settings[field.key]),
      commit: (value) => {
        kart.settings[field.key] = clampKartField(field, value);
        kart.refreshSign();
        this.showBoard(kart);
        this.world?.notify(`${field.label}: ${kartFieldLabel(field, kart.settings)}`);
      },
    });
  }

  /** Zeichnet das Klemmbrett neu — jede Zeile zeigt, worauf sie steht. */
  private showBoard(kart: Kart): void {
    kart.setBoard(this.boardPage(kart), kart.preset.tagline);
  }

  // --- die Strecke ----------------------------------------------------------

  /**
   * Der Asphalt, als **ein** Band entlang der Mittellinie.
   *
   * Auf derselben Höhe wie der Asphalt der Boxengasse (`kart/kartPit.ts`),
   * damit an der Zielgeraden keine Stufe zwischen den beiden steht — sie stoßen
   * dort kachelbündig aneinander, und das soll man auch sehen.
   */
  private buildRoad(world: ZoneHost): void {
    const tarmac = this.own(new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.95 }));
    const paint = this.own(new THREE.MeshBasicMaterial({ color: 0xf2f4f8, toneMapped: false }));
    world.root.add(this.ribbon(0, HALF_WIDTH, TARMAC_TOP, tarmac));
    // Die weißen Linien knapp innerhalb der Kante; in einer Kurve braucht das
    // Auge sie.
    world.root.add(this.ribbon(HALF_WIDTH - 0.25, 0.08, TARMAC_TOP + 0.01, paint));
    world.root.add(this.ribbon(-(HALF_WIDTH - 0.25), 0.08, TARMAC_TOP + 0.01, paint));
  }

  /**
   * Ein Streifen entlang der Strecke: `offset` Meter neben der Mitte, `half`
   * Meter zu jeder Seite davon, auf der Höhe `y`.
   */
  private ribbon(offset: number, half: number, y: number, material: THREE.Material): THREE.Mesh {
    const count = this.path.length;
    const positions = new Float32Array(count * 2 * 3);
    const indices: number[] = [];

    for (let i = 0; i < count; i++) {
      const point = this.path[i]!;
      const next = this.path[(i + 1) % count]!;
      const previous = this.path[(i - 1 + count) % count]!;
      // Die Tangente der ganzen Nachbarschaft, damit der Streifen nicht knickt.
      const tx = next.x - previous.x;
      const tz = next.z - previous.z;
      const length = Math.hypot(tx, tz) || 1;
      // Linke Normale der Tangente, von oben gesehen.
      const nx = tz / length;
      const nz = -tx / length;
      const base = i * 6;
      positions[base] = point.x + nx * (offset + half);
      positions[base + 1] = y;
      positions[base + 2] = point.z + nz * (offset + half);
      positions[base + 3] = point.x + nx * (offset - half);
      positions[base + 4] = y;
      positions[base + 5] = point.z + nz * (offset - half);

      const a = i * 2;
      const b = ((i + 1) % count) * 2;
      indices.push(a, a + 1, b + 1, a, b + 1, b);
    }

    const geometry = this.shape(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    // Der Name macht die Fläche portalfähig, genau wie bei jeder anderen
    // Fahrbahn dieses Projekts (`PortalWorld`, `surface:`).
    mesh.name = 'surface:track';
    return mesh;
  }

  /**
   * Rot-weiße Randsteine an beiden Kanten des Asphalts — nur eben nicht dort,
   * wo die Boxengasse liegt: Dort ist kein Rand, sondern die Ausfahrt.
   */
  private buildKerbs(world: ZoneHost): void {
    const red = this.own(new THREE.MeshStandardMaterial({ color: 0xd8402f, roughness: 0.8 }));
    const white = this.own(new THREE.MeshStandardMaterial({ color: 0xf0f2f6, roughness: 0.8 }));
    const step = 2;
    const shape = this.shape(new THREE.BoxGeometry(0.5, 0.07, step * 0.95));
    let index = 0;
    for (let distance = 0; distance < this.lapLength; distance += step) {
      const point = this.pointAt(distance);
      const material = index % 2 === 0 ? red : white;
      for (const side of [1, -1]) {
        const x = point.x + point.nx * side * (HALF_WIDTH + 0.26);
        const z = point.z + point.nz * side * (HALF_WIDTH + 0.26);
        if (this.overPit(x, z)) continue;
        const kerb = new THREE.Mesh(shape, material);
        kerb.position.set(x, 0.035, z);
        kerb.rotation.y = Math.atan2(-point.tx, -point.tz);
        world.root.add(kerb);
      }
      index++;
    }
  }

  /** Reifenstapel außerhalb der Randsteine — fest, damit niemand vom Feld läuft. */
  private buildBarriers(world: ZoneHost): void {
    const tyre = this.own(new THREE.MeshStandardMaterial({ color: 0x1b1e26, roughness: 0.95 }));
    const shape = this.shape(new THREE.BoxGeometry(1, 0.6, 1));
    for (let distance = 0; distance < this.lapLength; distance += BARRIER_SPACING) {
      const point = this.pointAt(distance);
      for (const side of [1, -1]) {
        const x = point.x + point.nx * side * (HALF_WIDTH + BARRIER_OFFSET);
        const z = point.z + point.nz * side * (HALF_WIDTH + BARRIER_OFFSET);
        if (this.overPit(x, z)) continue;
        const stack = new THREE.Mesh(shape, tyre);
        stack.position.set(x, 0.3, z);
        stack.rotation.y = Math.atan2(-point.tx, -point.tz);
        world.root.add(stack);
        stack.updateWorldMatrix(true, false);
        world.addSolid(stack);
      }
    }
  }

  /**
   * Ob an dieser Stelle die Boxengasse liegt.
   *
   * Randsteine und Reifenstapel folgen der Mittellinie und wissen von der Gasse
   * nichts — ohne diese Frage stünde die halbe Bande zwischen den Karts.
   */
  private overPit(x: number, z: number): boolean {
    return APRONS.some((apron) =>
      insideApron(
        {
          x0: apron.x0 - PIT_CLEAR,
          z0: apron.z0 - PIT_CLEAR,
          x1: apron.x1 + PIT_CLEAR,
          z1: apron.z1 + PIT_CLEAR,
        },
        x,
        z,
      ),
    );
  }

  /** Start- und Ziellinie, und die Tafel mit den Rundenzeiten daneben. */
  private buildStart(world: ZoneHost): void {
    const point = this.pointAt(0);
    const line = new THREE.Mesh(
      this.shape(new THREE.PlaneGeometry(HALF_WIDTH * 2, 0.7)),
      this.own(new THREE.MeshBasicMaterial({ color: 0xf2f4f8, toneMapped: false })),
    );
    line.rotation.x = -Math.PI / 2;
    // Erst flach gelegt, dann so gedreht, dass ihre Breite quer zur Bahn läuft.
    line.rotation.z = Math.atan2(point.tx, point.tz);
    line.position.set(point.x, TARMAC_TOP + 0.015, point.z);
    world.root.add(line);

    // Die Tafel steht **östlich** der Zielgeraden: westlich liegt die
    // Boxengasse, und eine Tafel auf Stelzen mitten darin wäre das Erste, was
    // jemand beim Losfahren umfährt.
    const board = new TextPlane({
      width: 3.4,
      height: 1.2,
      title: 'Rundenzeiten',
      accent: 0xffc857,
    });
    board.position.set(point.x + HALF_WIDTH + 1.6, 2, point.z + 3);
    board.rotation.y = -Math.PI / 2;
    world.root.add(board);
    this.lapBoard = board;
    this.drawLapBoard();
  }

  private drawLapBoard(): void {
    const board = this.lapBoard;
    if (!board) return;
    const last = this.lap.lastLap === null ? '—' : formatLap(this.lap.lastLap);
    const best = this.lap.bestLap === null ? '—' : formatLap(this.lap.bestLap);
    board.setText(`Letzte ${last}`, `Beste ${best} · ${this.lap.laps} Runden`);
  }

  /** Ein Punkt so weit um die Runde, mit Tangente und Normale dort. */
  private pointAt(distance: number): {
    x: number;
    z: number;
    tx: number;
    tz: number;
    nx: number;
    nz: number;
  } {
    // Gebraucht wird der Punkt nach einer **Bogenlänge** und nicht der
    // nächstgelegene (`nearestOnPath`) — also wird die Linie einmal abgelaufen.
    let travelled = 0;
    const count = this.path.length;
    for (let i = 0; i < count; i++) {
      const a = this.path[i]!;
      const b = this.path[(i + 1) % count]!;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      if (length <= 1e-9) continue;
      if (travelled + length >= distance) {
        const t = (distance - travelled) / length;
        const tx = dx / length;
        const tz = dz / length;
        return { x: a.x + dx * t, z: a.z + dz * t, tx, tz, nx: tz, nz: -tx };
      }
      travelled += length;
    }
    const first = this.path[0]!;
    return { x: first.x, z: first.z, tx: 0, tz: -1, nx: -1, nz: 0 };
  }

  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }

  private shape<T extends THREE.BufferGeometry>(geometry: T): T {
    this.shapes.push(geometry);
    return geometry;
  }
}
