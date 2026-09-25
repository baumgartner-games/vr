import * as THREE from 'three';
import type { PlayerRig } from './PlayerRig';
import type { TopDownCamera } from './TopDownCamera';
import { ButtonState } from './XRInput';
import {
  aimHeld,
  firstGamepad,
  readGamepad,
  type ButtonPlan,
  type GamepadFrame,
  type GamepadLike,
} from './gamepad';
import { isTyping } from './textEntry';
import type { PadSlot } from './gamepadReport';
import {
  deviceKey,
  keysFor,
  layoutSize,
  padPlan,
  slotOf,
  type InputConfig,
  type KeyAction,
} from './inputMap';
import { inputConfig, onInputConfigChange } from './inputStore';
import { graphics, onGraphicsChange } from './graphicsSettings';
import { dpadDirection } from './dpad';
import { pinchFactor, yawFromDirection, type Vec2 } from './topDownPose';
import { smoothAngle } from '../net/PoseSmoothing';
import {
  CRANE_TWIST_HOLD,
  craneAimYaw,
  craneEighth,
  cranePan,
  craneQuarter,
  craneTurn,
  craneVelocity,
} from './crane';

/**
 * **Ein abgefangener Druck** — was das Menü beim Einstellen bekommt. Am Pad
 * die Nummer _und_ die Stelle, an der sie laut Gerätekarte sitzt: Die Belegung
 * hängt an Stellen, das Panel auf der Eingabeseite zeigt Nummern, und beide
 * sollen dasselbe meinen.
 */
export type InputPress =
  { kind: 'pad'; index: number; slot: PadSlot | null } | { kind: 'key'; code: string };

const _forward = new THREE.Vector3();
const _strafe = new THREE.Vector3();
const _move = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const _euler = new THREE.Euler();
/** Sekunden, in denen sich die Figur von oben in ihre Laufrichtung dreht. */
const TURN_TAU = 0.07;
/** Wie schnell der rechte Stick am Gamepad den Blick dreht, im Bogenmaß je Sekunde. */
const PAD_LOOK_SPEED = 2.6;
/**
 * Wie weit der Zeiger von der Figur weg sein muss, damit er als Ziel zählt, in
 * CSS-Punkten. Direkt auf der Figur ist die Richtung ein Rundungsfehler, und
 * die Waffe zappelte im Kreis.
 */
const AIM_MIN_PIXELS = 24;

/**
 * **Die Knöpfe auf dem Glas** — was die Seite an Touch-Bedienung mitbringt
 * (`index.html`, `style.css`).
 *
 * Alle vier sind Zeigerflächen und keine echten Knöpfe: Die Leiste liegt auf
 * `pointer-events: none`, die Ereignisse kommen an der Leinwand an, und hier
 * wird nachgesehen, über welchem Feld ein Finger aufgesetzt hat. So kann
 * derselbe Finger vom Zielstock nicht versehentlich die Kamera mitnehmen.
 */
export interface TouchPads {
  /** Der linke Stock: laufen. */
  stick: HTMLElement | null;
  /** Der rechte Stock: zielen — nur von oben. */
  aim: HTMLElement | null;
  /** Knopf `A`: benutzen. */
  use: HTMLElement | null;
  /** Knopf `B`: schießen. */
  fire: HTMLElement | null;
  /** Der Block mit Zielstock und Knöpfen — steht nur in der Ansicht von oben. */
  right: HTMLElement | null;
  /**
   * Der Werkzeug-Knopf (`#hud-tool`) und der Menü-Knopf (`#hud-menu`).
   *
   * Sie werden hier nicht **gedrückt** — beides sind echte Knöpfe, ihre
   * Ereignisse kommen nie an der Leinwand an. Gebraucht werden sie für den
   * Pinch: Zwei Finger zoomen nur, solange keiner von ihnen auf einem Knopf
   * liegt.
   */
  tool?: HTMLElement | null;
  menu?: HTMLElement | null;
}

/**
 * Keyboard/mouse and touch fallback so the worlds can also be visited without a
 * headset — the basis for asymmetric sessions where phones join a VR player.
 *
 * **Und die eine Stelle, an der Eingabe zusammenläuft.** Von oben gespielt
 * wird mit vier Geräten auf einmal — Tastatur, Maus, Gamepad, Glas —, und
 * jedes davon meint dasselbe: laufen, zielen, benutzen, schießen, zoomen
 * (`docs/plan-2d-hub-interaktion.md`, E4). Sie werden hier zu **einer**
 * Absicht verrechnet und nicht in vier Zweigen der Welten noch einmal; eine
 * Welt, die selbst Tasten abhört, hat dieselbe Taste zweimal.
 */
export class FlatControls {
  enabled = true;
  /**
   * **Die Werkzeugliste aufmachen** — `Tab` und `Y` am Pad (`App`).
   *
   * Der Knopf dafür steht auf der Seite (`#hud-tool`), die Liste ist eine
   * Menüseite; beides gehört `App`. Hier liegt nur der Draht, damit die
   * Tasten an **einer** Stelle abgehört werden und keine Welt eine eigene
   * Taste dafür mitbringt.
   */
  onTools: (() => void) | null = null;
  speed = 3.2;
  lookSpeed = 0.0024;

  private readonly keys = new Set<string>();
  /**
   * **Die geltende Belegung** (`core/inputMap.ts`) — hier gehalten und nicht je
   * Bild geholt, denn gelesen wird sie sechzigmal je Sekunde. Wer sie im Menü
   * verstellt, sagt es (`onInputConfigChange`), und dann gilt sie sofort: Wer
   * einen Knopf neu legt, will ihn danach drücken und nicht neu laden.
   */
  private config: InputConfig = inputConfig();
  /**
   * Und daraus die Nummern, die dieses Pad wirklich hat — neu gerechnet, wenn
   * die Belegung wechselt **oder ein anderes Pad angesteckt wird**. Die
   * Gerätekarte gehört dem Gerät, und das zweite Pad im Haus ist ein anderes.
   */
  private plan: ButtonPlan | null = null;
  private planFor = '';
  /**
   * **Der nächste Druck gehört nicht dem Spiel, sondern dem Menü.** Solange
   * hier jemand wartet, läuft die Figur nicht los und die Werkzeugliste klappt
   * nicht auf — sonst spränge man beim Einstellen des Sprungknopfes.
   */
  private capture: ((press: InputPress) => void) | null = null;
  /** Welche Pad-Nummern im letzten Bild lagen — für die Flanke beim Abfangen. */
  private padDown = new Set<number>();
  private jumpQueued = false;
  /** `E` oder Enter — die Tastatur benutzt und springt nie damit. */
  private useQueued = false;
  /** Der Knopf `A` auf dem Glas — derselbe Knopf wie `A` am Pad. */
  private aQueued = false;
  /** `Tab` — die Werkzeugliste (`App`, `#hud-tool`). */
  private toolsQueued = false;
  private yaw = 0;
  private pitch = 0;
  private pointerLocked = false;
  private lookPointer: number | null = null;
  private lookLast = new THREE.Vector2();
  private stickPointer: number | null = null;
  private stickOrigin = new THREE.Vector2();
  private stick = new THREE.Vector2();
  private aimPointer: number | null = null;
  private aimOrigin = new THREE.Vector2();
  private aimStick = new THREE.Vector2();
  private usePointer: number | null = null;
  private firePointer: number | null = null;
  /** Ob die linke Maustaste gerade als Trigger unten liegt — von oben, und aus den Augen mit Werkzeug. */
  private mouseFire = false;
  /**
   * Ob die rechte Maustaste gerade liegt — aus den Augen, mit einem Werkzeug
   * in der Hand, heißt das **zielen über die Waffe** (`PlayerRig.sighting`).
   */
  private mouseSight = false;
  /**
   * Welche Maustasten zuletzt lagen (`PointerEvent.buttons`). Gebraucht, weil
   * eine **zweite** Taste kein `pointerdown` bekommt, sondern nur ein
   * `pointermove` mit neuer Maske — wer rechts zum Zielen hält und dann links
   * schießt, schösse sonst nie (`chordButtons`).
   */
  private mouseButtons = 0;
  /** Wo der Mauszeiger zuletzt stand, in CSS-Punkten. `null`: noch nie bewegt. */
  private mouse: { x: number; y: number } | null = null;
  /**
   * Ob zuletzt ein **Stock** gezielt hat und nicht die Maus.
   *
   * Wer mit dem Gamepad spielt, schiebt die Maus nicht weg — sie liegt
   * irgendwo auf dem Schirm und zöge die Figur ohne diesen Merker dauernd zu
   * sich. Erst eine echte Mausbewegung holt das Zielen zurück.
   */
  private aimedWithStick = false;
  private topDownOn = false;
  /** Ob man gerade der Kran ist (`crane`). */
  private craneOn = false;
  /** Wohin der Kran fliegt, in Weltmetern — `null`: noch nirgendwohin gezeigt. */
  private craneGoal: THREE.Vector3 | null = null;
  /** Der Finger, der dem Kran gerade zeigt, wohin — und wo er liegt. */
  private cranePointer: number | null = null;
  private readonly craneTouch = { x: 0, y: 0 };
  /** Ob Maus oder Finger dem Kran schon einmal gezeigt haben, wohin. */
  private craneAimed = false;
  /** Wie oft `R` seit dem letzten Bild gedrückt wurde — mit Richtung (`crane`). */
  private craneTurns = 0;
  /**
   * **`R` liegt** — seit wann (`performance.now`) und ob mit `Shift`. Kurz
   * getippt dreht es beim Loslassen ein Achtel; gehalten dreht nach
   * `CRANE_TWIST_HOLD` die Maus (`crane.craneAimYaw`).
   */
  private craneTwist: { since: number; shift: boolean } | null = null;
  private readonly pads: TouchPads;
  /** Die Flanken des Gamepads — Knöpfe eines Pads kommen als Zustand, nicht als Ereignis. */
  private readonly padUse = new ButtonState();
  private readonly padZoomIn = new ButtonState();
  private readonly padZoomOut = new ButtonState();
  private readonly padTools = new ButtonState();
  /**
   * Die Finger, die gerade frei auf dem Glas liegen — weder auf einem Stock
   * noch auf einem Knopf —, mit dem Ort, an dem sie zuletzt waren. Zwei davon
   * in der oberen Hälfte sind ein Pinch (`pinching`).
   */
  private readonly freeTouches = new Map<number, { x: number; y: number }>();
  /** Der Fingerabstand des letzten Bildes, in Punkten — `null`: kein Pinch. */
  private pinchGap: number | null = null;
  private disposers: Array<() => void> = [];

  constructor(
    private readonly rig: PlayerRig,
    private readonly canvas: HTMLCanvasElement,
    pads: TouchPads | HTMLElement | null,
    /**
     * Die Kamera von oben — gebraucht wird sie für zwei Dinge: wo die Figur auf
     * dem Schirm steht (`project`, dahin zielt die Maus) und der Zoom auf den
     * Bumpern. `null` in Tests und überall, wo es keine gibt.
     */
    private readonly view: TopDownCamera | null = null,
  ) {
    this.pads =
      pads && 'stick' in pads
        ? pads
        : { stick: pads, aim: null, use: null, fire: null, right: null, tool: null, menu: null };
    this.bind();
    // **Stock oder Steuerkreuz** (`graphicsSettings.movePad`) — das Feld zeigt,
    // was gilt, und wechselt, sobald jemand im Menü umstellt.
    this.showMovePad();
    this.disposers.push(onGraphicsChange(() => this.showMovePad()));
    // Eine verstellte Belegung gilt sofort — der Plan wird beim nächsten Bild
    // neu gerechnet, nicht hier: Welches Pad dann steckt, weiß erst `readPad`.
    this.disposers.push(
      onInputConfigChange(() => {
        this.config = inputConfig();
        this.plan = null;
      }),
    );
  }

  /**
   * **Den nächsten Druck abfangen, statt ihn zu spielen.**
   *
   * So stellt das Menü eine Belegung ein: „Drück jetzt den Knopf, der das tun
   * soll." Abgehört wird dabei nichts Neues — dieselben Tasten und dasselbe
   * Pad wie sonst, nur geht der Druck einmal woanders hin. Eine zweite Stelle,
   * die Tasten abhört, wäre genau die Doppelung, die dieses Modul vermeidet.
   *
   * Der Rückgabewert bricht das Warten wieder ab (der Knopf _Abbrechen_ im
   * Menü, oder ein Menü, das zugeht).
   */
  captureNext(listener: (press: InputPress) => void): () => void {
    this.capture = listener;
    return () => {
      if (this.capture === listener) this.capture = null;
    };
  }

  /** Ob gerade auf einen Druck gewartet wird (für die Zeile im Menü). */
  get capturing(): boolean {
    return this.capture !== null;
  }

  /**
   * **Von oben gesteuert** — die Ansicht _Von oben_ (`core/TopDownCamera.ts`).
   *
   * Dann laufen die Tasten in **Weltrichtungen**: oben ist Norden (−z), rechts
   * ist Osten (+x), und zwar unabhängig davon, wohin die Figur gerade schaut.
   * Gelaufen wird über dieselbe Physik wie am Schreibtisch
   * (`PlayerRig.setIntent`) — eine feste Kamera ist ein Blickwinkel und kein
   * zweiter Antrieb.
   *
   * Die Maus dreht hier **nichts** und fängt keinen Zeiger ein; sie **zielt**:
   * Die Figur schaut zum Zeiger, solange einer bewegt wurde, sonst dorthin,
   * wohin sie läuft. Mit dem Umschalten geht auch die rechte Hälfte der
   * Touch-Bedienung an und aus — Zielstock und die Knöpfe `A`/`B` haben nur
   * von oben eine Bedeutung.
   */
  get topDown(): boolean {
    return this.topDownOn;
  }

  set topDown(on: boolean) {
    if (on === this.topDownOn) return;
    this.topDownOn = on;
    if (this.pads.right) this.pads.right.hidden = !on;
    // Was noch gedrückt war, bleibt beim Umschalten nicht gedrückt: ein
    // Trigger, der über den Ansichtswechsel liegen bleibt, feuert weiter.
    this.mouseFire = false;
    this.mouseSight = false;
    this.rig.sighting = false;
    this.rig.paintHeld = false;
    this.firePointer = null;
    this.setPressed(this.pads.fire, false);
    this.aimStick.set(0, 0);
    this.updateStickVisual(this.pads.aim, 0, 0);
    this.freeTouches.clear();
    this.pinchGap = null;
    this.rig.setTrigger(0);
  }

  /**
   * **Als Kran von oben** (`core/crane.ts`, gesetzt von `App.applyView`).
   *
   * Gewünscht war: _„im Baukasten-Modus (von oben) will ich (im Web mit WASD,
   * mobil mit Joystick) die Kamera-Position bewegen. Die Position des
   * Hakens/Raumschiffs soll über Mauszeiger bzw. Touch passieren, dort wohin
   * ich zeige soll der Kran stehen."_ Also zwei Geber für zwei Dinge:
   *
   * - **WASD, linker Stock, Stock auf dem Glas** fahren die Kamera
   *   (`TopDownCamera.pan`), und nicht mehr den Kran.
   * - **Mauszeiger oder ein Finger auf dem Glas** sagen, wo der Kran steht:
   *   der Punkt am Boden unter dem Zeiger (`TopDownCamera.groundPoint`).
   * - **`R` dreht ihn** um ein Achtel (zweimal ist ein Viertel) (`Shift`+`R` zurück), der **rechte
   *   Stock** (am Pad und auf dem Glas) richtet ihn aus (`crane.craneTurn`).
   *   Von selbst dreht er sich nicht mehr — auch nicht in Flugrichtung.
   *
   * Klick und `A` bleiben, was sie waren: Sie nehmen und stellen hin, was
   * unter dem Kran liegt — und der liegt jetzt unter dem Zeiger.
   */
  get crane(): boolean {
    return this.craneOn;
  }

  set crane(on: boolean) {
    if (on === this.craneOn) return;
    this.craneOn = on;
    this.craneGoal = null;
    this.cranePointer = null;
    this.craneTurns = 0;
    this.craneTwist = null;
    this.view?.detach(on);
    // **Der Kran steht auf einem Viertel, von Anfang an** — sonst übernähme
    // er die Laufrichtung der Figur, und jede Vierteldrehung mit `R` bliebe
    // um genau diesen Rest schief zu den Platten.
    if (on) {
      this.yaw = craneQuarter(_euler.setFromQuaternion(this.rig.quaternion, 'YXZ').y);
      this.rig.rotation.set(0, this.yaw, 0);
      this.rig.updateMatrixWorld(true);
    }
  }

  /** Called when the player is placed, so look direction matches the spawn. */
  syncFromRig(): void {
    this.yaw = new THREE.Euler().setFromQuaternion(this.rig.quaternion, 'YXZ').y;
    this.pitch = 0;
    this.apply();
  }

  /**
   * Turns keys and the touch stick into a movement wish for the rig.
   *
   * @param dt Bildzeit in Sekunden — nur die Ansicht von oben braucht sie, um
   *           die Figur weich in ihre Laufrichtung zu drehen.
   */
  update(dt = 1 / 60): void {
    if (!this.enabled) {
      // **Was nicht gesteuert wird, zielt auch nicht.** Ohne diese Zeile bliebe
      // die letzte Auslenkung stehen, wenn die Brille aufgeht oder das Menü
      // zumacht (`core/App.ts`) — und der Feuerlöscher pustete dort weiter,
      // wo niemand mehr einen Stock in der Hand hat.
      this.rig.aiming = false;
      return;
    }

    const pad = this.readPad();

    // **Ob gerade gezielt wird**, über beide Stöcke zusammen
    // (`core/gamepad.aimHeld`) — in **beiden** flachen Ansichten und nicht nur
    // von oben: Aus den Augen dreht derselbe Stock den Blick, und das ist für
    // ein Gerät, das man ins Feuer hält, dieselbe Geste. Was daraus wird, weiß
    // die Welt (`PlayerRig.aiming`); hier wird nur abgelesen, was anliegt.
    this.rig.aiming = aimHeld(pad.aim, this.aimStick);

    let x = this.stick.x + pad.move.x;
    let z = this.stick.y + pad.move.y;
    if (this.held('forward')) z -= 1;
    if (this.held('back')) z += 1;
    if (this.held('left')) x -= 1;
    if (this.held('right')) x += 1;

    // **Benutzen und Springen liegen auf `A`**, und zwar in jeder
    // Bildschirmansicht (Plan, _Interaktion und Steuerung_): Steht etwas in
    // Reichweite, benutzt der Knopf es; sonst springt er. Die Leertaste
    // springt daneben immer.
    const jump = this.applyUse(pad) || this.jumpQueued;
    this.jumpQueued = false;
    const sprint = this.held('sprint') || pad.sprint;

    if (this.topDownOn && this.craneOn && this.view) {
      this.rig.sighting = false;
      this.flyCrane(dt, x, z, sprint, pad, this.view);
      return;
    }
    if (this.topDownOn) {
      this.rig.sighting = false;
      this.walkNorthUp(dt, x, z, jump, sprint, pad);
      return;
    }

    // Außerhalb von _Von oben_ darf der Gamepad mitspielen: linker Stick
    // läuft, rechter sieht sich um, `A` benutzt oder springt. Erlaubt, nicht
    // verlangt — die Ansicht aus den Augen gehört Maus und Tastatur, und wer
    // kein Pad angeschlossen hat, merkt von diesen Zeilen nichts.
    if (pad.aim.x !== 0 || pad.aim.y !== 0) {
      this.look(pad.aim.x * PAD_LOOK_SPEED * dt, pad.aim.y * PAD_LOOK_SPEED * dt, 1);
    }
    // **Und der Trigger aus den Augen**: Hält die Hand vor dem Auge ein
    // Werkzeug (`PlayerRig.armed`), ist er dasselbe wie von oben — Linksklick,
    // RT, `B` auf dem Glas. Sonst bleibt er zu, und die Maus schießt weiter,
    // was sie ohne Werkzeug schon immer geschossen hat (die Portale, über die
    // Welt): ein zweiter Weg dorthin wäre ein zweiter Schuss.
    this.rig.setTrigger(this.rig.armed ? this.triggerValue(pad) : 0);
    // **Zielen über die Waffe**: rechte Maustaste oder LB halten. LB ist von
    // oben der Zoom und hat aus den Augen sonst nichts zu tun.
    this.rig.sighting = this.rig.armed && (this.mouseSight || pad.zoomIn);

    if (x === 0 && z === 0) {
      if (jump) this.rig.requestJump();
      return;
    }

    this.rig.getHeadForward(_forward);
    _strafe.copy(_forward).cross(UP).normalize();
    _move.set(0, 0, 0).addScaledVector(_forward, -z).addScaledVector(_strafe, x);
    if (_move.lengthSq() > 1) _move.normalize();
    // Die Welt darf das Tempo vorgeben (`PlayerRig.pace`); sonst gilt die Tastatur.
    const speed = this.rig.walkSpeed(sprint, this.speed * (sprint ? 1.8 : 1));
    this.rig.setIntent(_move.multiplyScalar(speed), jump, sprint);
  }

  dispose(): void {
    for (const off of this.disposers) off();
    this.disposers = [];
  }

  /**
   * **Laufen in Weltrichtungen** — die Ansicht von oben.
   *
   * W ist Norden und bleibt Norden, auch wenn die Figur nach Süden schaut: Bei
   * einer festen Kamera ist die Taste eine Richtung auf dem Schirm, und nichts
   * anderes erwartet jemand, der von oben spielt. Deshalb steht hier kein
   * `getHeadForward` wie im Zweig darunter.
   *
   * **Und die Figur dreht sich dorthin, wo sie hinläuft** — weich, sonst
   * ruckte sie bei jedem Tastenwechsel um 45°. Das ist die Twin-Stick-Regel
   * ohne zweiten Stick: Sie gilt nur, solange niemand **zielt**; wer zielt,
   * dreht die Figur mit dem Ziel (`aimYaw`).
   */
  private walkNorthUp(
    dt: number,
    x: number,
    z: number,
    jump: boolean,
    sprint: boolean,
    pad: GamepadFrame,
  ): void {
    this.applyTopDownButtons(pad);
    _move.set(x, 0, z);
    if (_move.lengthSq() > 1) _move.normalize();

    const aim = this.aimYaw(pad);
    if (aim !== null) {
      // Gezielt wird hart und nicht weich: Ein Stock, der erst in einer
      // Zehntelsekunde ankommt, zielt für den Spieler daneben.
      this.yaw = aim;
    } else if (_move.lengthSq() > 0) {
      this.yaw = smoothAngle(
        _euler.setFromQuaternion(this.rig.quaternion, 'YXZ').y,
        yawFromDirection(_move.x, _move.z),
        dt,
        TURN_TAU,
      );
    }
    // Ohne Ziel und ohne Weg bleibt die Figur stehen, **wie sie steht** — die
    // zuletzt gezielte Richtung zuckt nicht zur Mitte zurück.
    if (aim !== null || _move.lengthSq() > 0) {
      this.rig.rotation.set(0, this.yaw, 0);
      this.rig.updateMatrixWorld(true);
    }

    if (_move.lengthSq() === 0) {
      if (jump) this.rig.requestJump();
      return;
    }
    const speed = this.rig.walkSpeed(sprint, this.speed * (sprint ? 1.8 : 1));
    this.rig.setIntent(_move.multiplyScalar(speed), jump, sprint);
  }

  /**
   * **Der Kran: Tasten fahren das Bild, der Zeiger stellt den Kran** (siehe
   * `crane`).
   *
   * Der Kran fliegt ohne Physik (`PortalWorld.updateCraneFlight`), also ist
   * die Geschwindigkeit hier genau der Weg zum Ziel, weich gemacht
   * (`crane.craneVelocity`). Gesprungen wird nicht — ein Kran hat keine Beine.
   */
  private flyCrane(
    dt: number,
    x: number,
    z: number,
    sprint: boolean,
    pad: GamepadFrame,
    view: TopDownCamera,
  ): void {
    this.applyTopDownButtons(pad);
    const step = cranePan(x, z, view.zoomDistance, sprint, dt);
    if (step.x !== 0 || step.z !== 0) view.pan(step.x, step.z);

    this.rig.getHeadPosition(_head);
    const goal = (this.craneGoal ??= new THREE.Vector3(_head.x, 0, _head.z));
    const floorY = this.rig.getFloorY();
    // Ein Finger geht vor, dann die Maus. Hat noch keiner von beiden gezeigt
    // — mit dem Pad —, fliegt der Kran in die Bildmitte, und der linke Stock
    // fährt ihn mit dem Bild.
    const screen = this.cranePointer !== null ? this.craneTouch : this.mouse;
    if (screen) this.craneAimed = true;
    const hit = !this.craneAimed
      ? view.centrePoint(floorY, _hit)
      : screen
        ? view.groundPoint(screen.x, screen.y, floorY, _hit)
        : null;
    // **`R` gehalten: Der Kran bleibt stehen, und die Maus zeigt die Drehung**
    // (`crane.craneAimYaw`) — vom Kran zum Zeiger, auf Achtel gerastet.
    const twist = this.craneTwist;
    const twisting = twist !== null && (performance.now() - twist.since) / 1000 >= CRANE_TWIST_HOLD;
    if (hit && !twisting) goal.set(hit.x, 0, hit.z);
    // **Gedreht wird nur, wenn jemand dreht** — `R`, oder der rechte Stock,
    // der die Nase dorthin zeigt, wohin er ausgelenkt ist. Die Maus zeigt
    // weiter auf die Stelle und nimmt dem Stock das Zielen nicht weg: Anders
    // als beim Laufen (`aimYaw`) meinen die beiden hier verschiedene Dinge.
    const sx = pad.aim.x !== 0 || pad.aim.y !== 0 ? pad.aim.x : this.aimStick.x;
    const sz = pad.aim.x !== 0 || pad.aim.y !== 0 ? pad.aim.y : this.aimStick.y;
    const now = _euler.setFromQuaternion(this.rig.quaternion, 'YXZ').y;
    let yaw = now;
    if (Math.hypot(sx, sz) > CRANE_STICK_TURN) yaw = craneEighth(this.groundYaw(sx, sz));
    for (; this.craneTurns > 0; this.craneTurns--) yaw = craneTurn(yaw, true);
    for (; this.craneTurns < 0; this.craneTurns++) yaw = craneTurn(yaw, false);
    if (twisting && hit) yaw = craneAimYaw(goal.x, goal.z, hit.x, hit.z, yaw);
    if (yaw !== now) {
      this.yaw = yaw;
      this.rig.rotation.set(0, yaw, 0);
      this.rig.updateMatrixWorld(true);
    }

    const velocity = craneVelocity(_head.x, _head.z, goal.x, goal.z, dt);
    _move.set(velocity.x, 0, velocity.z);
    this.rig.setIntent(_move);
  }

  /**
   * **Ein Knopf für zwei Dinge** — `A` benutzt, was in Reichweite steht, und
   * springt sonst (Plan, _Interaktion und Steuerung_).
   *
   * Das gilt in **jeder** Bildschirmansicht und nicht mehr nur von oben: Aus
   * den Augen sprang `A` am Pad bisher immer, und ein Knopf am Gerät, der in
   * einer Ansicht etwas anderes tut als in der anderen, ist ein Knopf, den man
   * zweimal lernen muss. Ob etwas in Reichweite steht, sagt die Welt
   * (`PlayerRig.useCandidate`).
   *
   * Zwei Geber meinen ausdrücklich **nur** benutzen: `E` und Enter. Zum
   * Springen gibt es am Schreibtisch die Leertaste, und die springt immer —
   * auch direkt vor einem Knopf und auch mit dem Feuerlöscher in der Hand.
   *
   * **Und was die Figur trägt, zählt dabei mit** (`PlayerRig.useBusy`): Der
   * Feuerlöscher hört von oben auf `A`, und solange er in der Hand liegt,
   * gehört der Knopf ihm.
   *
   * @returns ob in diesem Bild gesprungen werden soll
   */
  private applyUse(pad: GamepadFrame): boolean {
    if (this.toolsQueued || this.padTools.justPressed) this.onTools?.();
    this.toolsQueued = false;

    // **Und was gerade _liegt_** (`PlayerRig.useHeld`). Die Flanke darunter
    // ist für Knöpfe; was ein Halten verlangt — der Ausstieg aus dem Kart —,
    // fragte bisher nur den Controller und war damit ohne Brille gar nicht zu
    // bedienen. Alle vier Geber zusammen, weil alle vier dasselbe meinen.
    this.rig.useHeld = this.usePointer !== null || pad.use || this.held('use');

    let use = this.useQueued;
    this.useQueued = false;

    const buttonA = this.aQueued || this.padUse.justPressed;
    this.aQueued = false;
    let jump = false;
    if (buttonA) {
      // **Und was die Figur _trägt_, hat denselben Vorrang wie das, was vor
      // ihr steht** (`PlayerRig.useBusy`): Wer den Feuerlöscher in der Hand
      // hält, schaltet ihn mit `A` an — und hüpft dabei nicht. Gesprungen wird
      // nur, wenn `A` gerade niemandem gehört.
      if (this.rig.useCandidate) use = true;
      else if (!this.rig.useBusy) jump = true;
    }
    if (use) this.rig.requestUse();
    return jump;
  }

  /**
   * **Ein Klick legt ab, was getragen wird** — sofort und nicht erst beim
   * zweiten (`PlayerRig.requestDrop`).
   *
   * Nicht über den Benutzen-Knopf: Der kennt _Halten oder Tippen_, und ein
   * Klick ist immer ein Tippen — das Getragene bliebe in der Hand, und erst
   * der zweite Klick legte es ab. Mit der Maus zeigt man aber, wohin es soll,
   * und klickt dann; zweimal klicken zu müssen sähe aus wie ein verlorener
   * Klick.
   */
  private pressMouseUse(): void {
    this.rig.requestDrop();
  }

  /** Alle Geber des Triggers zusammen: RT, die linke Maustaste, `B` auf dem Glas. */
  private triggerValue(pad: GamepadFrame): number {
    return Math.max(pad.trigger, this.mouseFire ? 1 : 0, this.firePointer !== null ? 1 : 0);
  }

  /**
   * **Schießen und Zoom** — von oben. Geschossen wird inzwischen auch aus den
   * Augen, sobald die Hand dort ein Werkzeug hält (`PlayerRig.armed`).
   *
   * Der Trigger geht ans Rig und nicht an die Welt (`PlayerRig.setTrigger`):
   * Was in der rechten Hand der Figur liegt, weiß die Welt, und die fragt dort
   * nach. Der Zoom bleibt bei der Kamera, denn sie ist das Einzige, was er
   * ändert. Das Benutzen steht eine Ebene höher (`applyUse`) — es gilt in
   * jeder Ansicht und nicht nur hier.
   */
  private applyTopDownButtons(pad: GamepadFrame): void {
    this.rig.setTrigger(this.triggerValue(pad));

    if (this.padZoomIn.justPressed) this.view?.zoomBy(-1);
    if (this.padZoomOut.justPressed) this.view?.zoomBy(1);
  }

  /**
   * **Wohin gezielt wird**, als Gierwinkel — oder `null`, wenn gerade niemand
   * zielt.
   *
   * Drei Geber, eine Rangfolge: der rechte Stock am Pad, der Zielstock auf dem
   * Glas, und die Maus. Alle drei liefern einen Weg auf dem **Schirm**, und
   * daraus wird dieselbe Rechnung wie überall eine Richtung auf dem Boden
   * (`TopDownCamera.groundDirection`) — mit der Stauchung nach Norden, sonst
   * zielte die Figur zu flach.
   */
  private aimYaw(pad: GamepadFrame): number | null {
    if (pad.aim.x !== 0 || pad.aim.y !== 0) {
      this.aimedWithStick = true;
      return this.groundYaw(pad.aim.x, pad.aim.y);
    }
    if (this.aimStick.x !== 0 || this.aimStick.y !== 0) {
      this.aimedWithStick = true;
      return this.groundYaw(this.aimStick.x, this.aimStick.y);
    }
    if (this.aimedWithStick || !this.mouse || !this.view) return null;
    const figure = this.view.project(this.rig);
    if (!figure) return null;
    const dx = this.mouse.x - figure.x;
    const dy = this.mouse.y - figure.y;
    if (Math.hypot(dx, dy) < AIM_MIN_PIXELS) return null;
    return this.groundYaw(dx, dy);
  }

  private groundYaw(screenX: number, screenY: number): number {
    const dir: Vec2 = this.view
      ? this.view.groundDirection(screenX, screenY, _ground)
      : { x: screenX, z: screenY };
    return yawFromDirection(dir.x, dir.z);
  }

  /** Ob eine der Tasten dieser Absicht gerade liegt (`core/inputMap.ts`). */
  private held(action: KeyAction): boolean {
    for (const code of keysFor(this.config, action)) {
      if (this.keys.has(code)) return true;
    }
    return false;
  }

  /** Ob genau diese Taste auf dieser Absicht liegt. */
  private bound(code: string, action: KeyAction): boolean {
    return keysFor(this.config, action).includes(code);
  }

  /**
   * Das Pad dieses Bildes, samt Flanken für seine Knöpfe — gelesen durch die
   * Belegung und die Karte **dieses** Geräts (`core/inputMap.padPlan`).
   */
  private readPad(): GamepadFrame {
    const pads =
      typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
        ? navigator.getGamepads()
        : null;
    const device = firstGamepad(pads) as (GamepadLike & { id?: string }) | null;
    const count = device?.buttons.length ?? 0;
    const layout = this.config.layouts[deviceKey(device?.id)] ?? {};

    // Neu gerechnet wird nur, wenn sich wirklich etwas ändert: ein anderes
    // Pad, eine andere Knopfzahl, oder eine verstellte Belegung (die setzt
    // `plan` auf null). Je Bild eine Karte aufzulösen wäre Arbeit für nichts.
    const key = device ? `${deviceKey(device.id)}:${count}` : '';
    if (!this.plan || this.planFor !== key) {
      this.planFor = key;
      this.plan = padPlan(this.config, layout, count);
    }

    // Welche Nummern **neu** heruntergegangen sind. Der Zustand allein reichte
    // nicht: Wer die Zeile im Menü mit `A` angetippt hat, hält `A` in diesem
    // Moment noch gedrückt, und der Druck, den er meint, kommt erst danach.
    const before = this.padDown;
    const down = new Set<number>();
    for (let index = 0; index < count; index++) {
      if (device?.buttons[index]?.pressed) down.add(index);
    }
    this.padDown = down;

    if (this.capture) {
      for (const index of down) {
        if (before.has(index)) continue;
        const take = this.capture;
        this.capture = null;
        take({ kind: 'pad', index, slot: slotOf(layout, index, layoutSize(count)) });
        // Dieses Bild spielt niemand: Der Knopf war für das Menü.
        return readGamepad(null);
      }
    }

    const frame = readGamepad(device, this.plan);
    edge(this.padUse, frame.use);
    edge(this.padZoomIn, frame.zoomIn);
    edge(this.padZoomOut, frame.zoomOut);
    edge(this.padTools, frame.tools);
    return frame;
  }

  private apply(): void {
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
    this.rig.rotation.set(0, this.yaw, 0);
    this.rig.camera.rotation.set(this.pitch, 0, 0);
    this.rig.updateMatrixWorld(true);
  }

  /**
   * @param scale wie viel ein Schritt der Eingabe wert ist — die Maus rechnet
   *              in Punkten (`lookSpeed`), der Stock schon in Bogenmaß.
   */
  private look(dx: number, dy: number, scale = this.lookSpeed): void {
    if (this.topDownOn) return;
    // Von dort weiter, wo das Rig gerade hinschaut — nicht von der Zahl, die
    // sich diese Klasse gemerkt hat. Wer versetzt und dabei gedreht wurde
    // (`PortalWorld.movePlayerTo` mit `yaw`, ein Portal), sprang mit der
    // ersten Mausbewegung sonst in die alte Richtung zurück.
    this.yaw = _euler.setFromQuaternion(this.rig.quaternion, 'YXZ').y - dx * scale;
    this.pitch -= dy * scale;
    this.apply();
  }

  private on<E extends Event>(
    target: EventTarget,
    type: string,
    handler: (event: E) => void,
    options?: AddEventListenerOptions,
  ): void {
    const listener = handler as EventListener;
    target.addEventListener(type, listener, options);
    this.disposers.push(() => target.removeEventListener(type, listener, options));
  }

  private bind(): void {
    this.on(window, 'keydown', (e: KeyboardEvent) => {
      if (isTyping()) return;
      // **Wartet das Menü auf eine Taste, spielt sie dieses Mal nicht.** Auch
      // dann nicht, wenn die Steuerung sonst gar nicht läuft (`enabled`): Im
      // Menü steht man still, und eingestellt wird trotzdem.
      if (this.capture && !e.repeat) {
        e.preventDefault();
        const take = this.capture;
        this.capture = null;
        take({ kind: 'key', code: e.code });
        return;
      }
      if (!this.enabled) return;
      if (this.bound(e.code, 'jump')) {
        e.preventDefault();
        this.jumpQueued = true;
      }
      // Benutzen — einmal je Druck. Eine gehaltene Taste wiederholt sich im
      // Browser, und ein Knopf, der dreißigmal je Sekunde gedrückt wird, ist
      // ein flackernder Knopf. **Alle** Tasten der Absicht lösen aus;
      // `NumpadEnter` hielt hier bis zur Belegung nur, ohne dass das je
      // jemand entschieden hätte — und eine Taste, die man selbst auf
      // _Benutzen_ legt und die dann nicht benutzt, wäre eine kaputte Zeile.
      if (this.bound(e.code, 'use') && !e.repeat && !this.keys.has(e.code)) {
        this.useQueued = true;
      }
      // Die Werkzeugliste. Auf `Tab` schöbe der Browser sonst den Fokus durch
      // die Kopfzeile, und wer danach `WASD` drückt, tippt in einen Knopf
      // statt zu laufen.
      if (this.bound(e.code, 'tools') && !e.repeat) {
        e.preventDefault();
        this.toolsQueued = true;
      }
      // **`R` dreht den Kran** (`crane`) — nur als Kran; sonst setzt dieselbe
      // Taste die Welt zurück (`PortalWorld.flatKeys`), und die fragt dafür
      // den Spielmodus.
      if (e.code === 'KeyR' && this.topDownOn && this.craneOn && !e.repeat) {
        this.craneTwist = { since: performance.now(), shift: e.shiftKey };
      }
      this.keys.add(e.code);
    });
    this.on(window, 'keyup', (e: KeyboardEvent) => {
      this.keys.delete(e.code);
      // Kurz getippt: ein Achtel weiter. Gehalten hat die Maus gedreht.
      const twist = this.craneTwist;
      if (e.code === 'KeyR' && twist) {
        if ((performance.now() - twist.since) / 1000 < CRANE_TWIST_HOLD)
          this.craneTurns += twist.shift ? -1 : 1;
        this.craneTwist = null;
      }
    });
    this.on(window, 'blur', () => {
      this.keys.clear();
      this.craneTwist = null;
      this.mouseFire = false;
      this.rig.paintHeld = false;
      this.mouseSight = false;
      this.mouseButtons = 0;
      this.rig.sighting = false;
      this.rig.useHeld = false;
      // Derselbe Gedanke eine Zeile höher: Ein Fenster, das den Fokus verliert,
      // hält keinen Stock mehr (`PlayerRig.aiming`).
      this.rig.aiming = false;
    });

    this.on(document, 'pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    this.on(this.canvas, 'pointerdown', (event: PointerEvent) => {
      if (!this.enabled) return;
      if (event.pointerType === 'mouse') {
        // Von oben ist die linke Maustaste der Trigger — **solange nichts in
        // Reichweite steht**; sonst holt sie sich wie bisher den Zeiger.
        if (this.topDownOn) {
          // **Und sie benutzt auch von oben** (`core/interaction.ts`,
          // `topDown`: „A / E / Linke Maustaste"). Wer eine Küche mit der Maus
          // spielt, führt die Figur ohnehin mit ihr — und greift dann zur
          // Tastatur, nur um ein Brötchen zu nehmen. Der Klick tut hier
          // dasselbe wie `E`, mit derselben Rangfolge wie `A`
          // (`applyUse`): Was vor der Figur steht, gehört der Taste
          // (`PlayerRig.useCandidate`), und erst wenn dort nichts steht, ist
          // sie der Auslöser. So bleibt der Feuerlöscher auf freier Fläche der
          // linken Maustaste, und ein Klick vor der Ausgabetheke gibt aus,
          // statt ins Leere zu spritzen.
          //
          // **Was getragen wird, legt sie ab** (`PlayerRig.carrying`) — wie
          // `E`, und vor allem anderen: Wer mit einer Wand in den Händen
          // klickt, will sie hinstellen und nicht schießen.
          // **Rechts holt der Kran die Abrissbombe** (`core/craneBomb.ts`) —
          // ob er sie bekommt, entscheidet die Welt (nur im _Baukasten_).
          if (event.button === 2 && this.craneOn) this.rig.requestBomb();
          if (event.button === 0) {
            if (this.rig.carrying) {
              this.pressMouseUse();
              // Gedrückt halten und ziehen malt (`PlayerRig.paintHeld`).
              this.rig.paintHeld = true;
            } else if (this.rig.useCandidate) this.useQueued = true;
            else this.mouseFire = true;
          }
          return;
        }
        // Auch der Klick, der den Zeiger holt, zählt als liegende Taste — sonst
        // schösse die erste Mausbewegung danach, solange er noch unten ist.
        this.mouseButtons = event.buttons;
        if (!this.pointerLocked) {
          void this.canvas.requestPointerLock?.();
          return;
        }
        // **Aus den Augen benutzt die linke Maustaste** — die Auflösung von
        // `core/interaction.ts` für die Ansicht `firstPerson`: „Linke
        // Maustaste / E". Der Blick zeigt hin, der Klick macht.
        //
        // Ausdrücklich **nur**, wenn wirklich etwas dasteht
        // (`PlayerRig.useCandidate`): Anders als `A` ist die linke Maustaste
        // kein Knopf für zwei Dinge — ein Klick ins Leere soll nichts tun und
        // vor allem nicht springen. Und der erste Klick bleibt der, der den
        // Zeiger holt (oben), sonst benutzte man beim Hineinklicken ins Bild
        // aus Versehen, was gerade vor einem steht.
        //
        // **Und mit einem Werkzeug in der Hand ist sie dessen Trigger**
        // (`PlayerRig.armed`) — und zwar **vor** dem Benutzen, anders als von
        // oben. Dort ist die Maus alles, was man hat; hier liegt `E` neben
        // `WASD`, und eine Pistole, die in der Küche nicht schießt, weil
        // gerade ein Topf in Reichweite steht, sähe kaputt aus.
        if (event.button === 2) this.mouseSight = true;
        if (event.button === 0 && this.rig.carrying) this.pressMouseUse();
        else if (event.button === 0 && this.rig.armed) this.mouseFire = true;
        else if (event.button === 0 && this.rig.useCandidate) this.useQueued = true;
        return;
      }
      const pads = this.pads;
      if (this.stickPointer === null && hitsElement(pads.stick, event)) {
        this.stickPointer = event.pointerId;
        this.stickOrigin.set(event.clientX, event.clientY);
        this.canvas.setPointerCapture(event.pointerId);
        // Das Kreuz zählt vom ersten Druck an — der Stock erst, wenn man zieht.
        if (this.dpad) this.pressDpad(event);
      } else if (this.topDownOn && this.aimPointer === null && hitsElement(pads.aim, event)) {
        this.aimPointer = event.pointerId;
        this.aimOrigin.set(event.clientX, event.clientY);
        this.canvas.setPointerCapture(event.pointerId);
      } else if (hitsElement(pads.use, event)) {
        // Derselbe Knopf wie `A` am Pad: benutzen, wenn etwas dasteht, sonst
        // springen (`applyUse`).
        this.usePointer = event.pointerId;
        this.aQueued = true;
        this.setPressed(pads.use, true);
      } else if (this.topDownOn && this.craneOn && hitsElement(pads.fire, event)) {
        // Als Kran ist `B` auf dem Glas der Rechtsklick: die Abrissbombe.
        // Gezündet wird sie mit `A` — dort, wo auch sonst genommen wird.
        this.rig.requestBomb();
      } else if (hitsElement(pads.fire, event)) {
        this.firePointer = event.pointerId;
        this.setPressed(pads.fire, true);
      } else if (this.freeHit(event)) {
        // Ein Finger, der auf nichts liegt: Er sieht sich um — bis ein zweiter
        // dazukommt, dann zoomen die beiden (`updatePinch`). Als Kran zeigt
        // er stattdessen, wohin der Kran soll (`crane`).
        this.freeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.startPinch()) {
          this.lookPointer = null;
          this.cranePointer = null;
        } else if (this.topDownOn && this.craneOn && this.cranePointer === null) {
          this.cranePointer = event.pointerId;
          this.craneTouch.x = event.clientX;
          this.craneTouch.y = event.clientY;
          this.aimedWithStick = false;
        } else if (this.lookPointer === null) {
          this.lookPointer = event.pointerId;
          this.lookLast.set(event.clientX, event.clientY);
        }
      }
    });

    this.on(this.canvas, 'pointermove', (event: PointerEvent) => {
      if (!this.enabled) return;
      if (event.pointerType === 'mouse') {
        // Wo der Zeiger steht, gilt immer — von oben zielt die Figur dorthin,
        // und eine echte Mausbewegung nimmt das Zielen vom Stock zurück.
        this.mouse = { x: event.clientX, y: event.clientY };
        this.aimedWithStick = false;
        this.chordButtons(event.buttons);
        if (this.pointerLocked) this.look(event.movementX, event.movementY);
        return;
      }
      if (event.pointerId === this.stickPointer && this.dpad) {
        this.pressDpad(event);
      } else if (event.pointerId === this.stickPointer) {
        const dx = clampStick(event.clientX - this.stickOrigin.x);
        const dy = clampStick(event.clientY - this.stickOrigin.y);
        this.stick.set(dx, dy);
        this.updateStickVisual(this.pads.stick, dx * 32, dy * 32);
      } else if (event.pointerId === this.aimPointer) {
        const dx = clampStick(event.clientX - this.aimOrigin.x);
        const dy = clampStick(event.clientY - this.aimOrigin.y);
        this.aimStick.set(dx, dy);
        this.updateStickVisual(this.pads.aim, dx * 32, dy * 32);
      } else if (this.freeTouches.has(event.pointerId)) {
        const at = this.freeTouches.get(event.pointerId)!;
        at.x = event.clientX;
        at.y = event.clientY;
        // Zwei Finger oben zoomen; solange sie liegen, sieht sich niemand um.
        if (this.pinchGap !== null) {
          this.updatePinch();
          return;
        }
        if (event.pointerId === this.cranePointer) {
          this.craneTouch.x = event.clientX;
          this.craneTouch.y = event.clientY;
        }
        if (event.pointerId === this.lookPointer) {
          this.look(event.clientX - this.lookLast.x, event.clientY - this.lookLast.y);
          this.lookLast.set(event.clientX, event.clientY);
        }
      }
    });

    const end = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        if (event.button === 0) this.mouseFire = false;
        if (event.button === 0) this.rig.paintHeld = false;
        if (event.button === 2) this.mouseSight = false;
        this.mouseButtons = event.buttons;
      }
      if (event.pointerId === this.stickPointer) {
        this.stickPointer = null;
        this.stick.set(0, 0);
        this.updateStickVisual(this.pads.stick, 0, 0);
        this.pads.stick?.removeAttribute('data-dir');
      }
      if (event.pointerId === this.aimPointer) {
        this.aimPointer = null;
        this.aimStick.set(0, 0);
        this.updateStickVisual(this.pads.aim, 0, 0);
      }
      if (event.pointerId === this.usePointer) {
        this.usePointer = null;
        this.setPressed(this.pads.use, false);
      }
      if (event.pointerId === this.firePointer) {
        this.firePointer = null;
        this.setPressed(this.pads.fire, false);
      }
      if (event.pointerId === this.lookPointer) this.lookPointer = null;
      if (event.pointerId === this.cranePointer) this.cranePointer = null;
      if (this.freeTouches.delete(event.pointerId) && this.freeTouches.size < 2) {
        this.pinchGap = null;
      }
    };
    this.on(this.canvas, 'pointerup', end);
    this.on(this.canvas, 'pointercancel', end);
  }

  /**
   * **Maustasten, die zu einer schon liegenden dazukommen oder gehen.**
   *
   * Pointer Events melden nur die **erste** Taste als `pointerdown` und nur
   * die **letzte** als `pointerup`; alles dazwischen kommt als `pointermove`
   * mit neuer Tastenmaske. Aus den Augen ist genau das der Normalfall: rechts
   * halten zum Zielen, links drücken zum Schießen. Also wird die Maske hier
   * gelesen — was losgelassen ist, ist los, und ein neuer Linksklick mit
   * einem Werkzeug in der Hand ist ein Schuss.
   */
  private chordButtons(buttons: number): void {
    const was = this.mouseButtons;
    this.mouseButtons = buttons;
    if ((buttons & 1) === 0) this.mouseFire = false;
    if ((buttons & 1) === 0) this.rig.paintHeld = false;
    if ((buttons & 2) === 0) this.mouseSight = false;
    if (this.topDownOn || !this.pointerLocked || !this.rig.armed) return;
    if ((buttons & 1) !== 0 && (was & 1) === 0) this.mouseFire = true;
    if ((buttons & 2) !== 0 && (was & 2) === 0) this.mouseSight = true;
  }

  /**
   * **Ein Finger, der auf nichts liegt.** Stöcke und Knöpfe haben ihre eigenen
   * Zweige; hier bleibt, was auf der blanken Leinwand aufsetzt — und auch der
   * Werkzeug- und der Menü-Knopf werden ausdrücklich ausgenommen, obwohl ihre
   * Ereignisse ohnehin nie hier ankommen. Eine Regel, die sich auf
   * `pointer-events` verlässt, ist eine Regel, die beim nächsten CSS bricht.
   */
  private freeHit(event: PointerEvent): boolean {
    const pads = this.pads;
    return !(
      hitsElement(pads.stick, event) ||
      hitsElement(pads.aim, event) ||
      hitsElement(pads.use, event) ||
      hitsElement(pads.fire, event) ||
      hitsElement(pads.tool ?? null, event) ||
      hitsElement(pads.menu ?? null, event)
    );
  }

  /**
   * **Zwei Finger in der oberen Hälfte sind ein Pinch** (Plan, _Pinch-Zoom_).
   *
   * Die obere Hälfte, weil unten die Stöcke und die Knöpfe liegen: Wer dort
   * mit zwei Daumen arbeitet, läuft und schießt — und hätte die Kamera sonst
   * bei jedem zweiten Schritt neu eingestellt. Und weil ein Pinch keine
   * Wischbewegung ist, gibt der Blick währenddessen Ruhe.
   *
   * @returns ob gerade einer angefangen hat
   */
  private startPinch(): boolean {
    // Nur von oben: Aus den Augen gibt es nichts zu zoomen, und zwei Finger
    // dürften dort nicht heimlich das Umsehen abstellen.
    if (!this.topDownOn || !this.view) return false;
    if (this.pinchGap !== null || this.freeTouches.size !== 2) return false;
    const half = this.canvas.getBoundingClientRect();
    const middle = half.top + half.height / 2;
    for (const at of this.freeTouches.values()) {
      if (at.y > middle) return false;
    }
    this.pinchGap = this.touchGap();
    return this.pinchGap !== null;
  }

  /** Der neue Fingerabstand gegen den alten — und die Kamera fährt mit. */
  private updatePinch(): void {
    const gap = this.touchGap();
    if (gap === null || this.pinchGap === null) return;
    this.view?.zoomScale(pinchFactor(this.pinchGap, gap));
    this.pinchGap = gap;
  }

  /** Wie weit die zwei Finger auseinanderliegen, in Punkten — sonst `null`. */
  private touchGap(): number | null {
    if (this.freeTouches.size !== 2) return null;
    const [a, b] = [...this.freeTouches.values()];
    if (!a || !b) return null;
    const gap = Math.hypot(a.x - b.x, a.y - b.y);
    return gap > 0 ? gap : null;
  }

  /** Ob links das Steuerkreuz liegt statt des Stocks (`graphicsSettings.movePad`). */
  private get dpad(): boolean {
    return graphics().movePad === 'dpad';
  }

  /** Das Feld links zeigt Stock oder Kreuz (`style.css`, `.touch__stick--dpad`). */
  private showMovePad(): void {
    const el = this.pads.stick;
    if (!el) return;
    el.classList.toggle('touch__stick--dpad', this.dpad);
    if (this.stickPointer === null) this.stick.set(0, 0);
    this.updateStickVisual(el, 0, 0);
    el.removeAttribute('data-dir');
  }

  /**
   * **Ein Finger auf dem Kreuz**: Die Richtung zählt von der Mitte des Feldes
   * aus und nicht von dort, wo der Finger aufsetzte — ein Kreuz hat feste
   * Arme (`dpadDirection`).
   */
  private pressDpad(event: PointerEvent): void {
    const el = this.pads.stick;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dir = dpadDirection(
      event.clientX - (rect.left + rect.width / 2),
      event.clientY - (rect.top + rect.height / 2),
    );
    this.stick.set(dir.x, dir.y);
    this.updateStickVisual(el, dir.x * 42, dir.y * 42);
    if (dir.name) el.dataset.dir = dir.name;
    else el.removeAttribute('data-dir');
  }

  private updateStickVisual(el: HTMLElement | null, x: number, y: number): void {
    const knob = el?.firstElementChild as HTMLElement | undefined;
    if (knob) knob.style.transform = `translate(${x}px, ${y}px)`;
  }

  /** Ein gedrückter Touch-Knopf sieht auch gedrückt aus (`style.css`). */
  private setPressed(el: HTMLElement | null, down: boolean): void {
    el?.classList.toggle('is-down', down);
  }
}

const _ground: Vec2 = { x: 0, z: 0 };
const _head = new THREE.Vector3();
const _hit = new THREE.Vector3();
/** Wie weit der rechte Stock ausgelenkt sein muss, bevor er den Kran dreht. */
const CRANE_STICK_TURN = 0.5;

/** Aus dem Weg eines Fingers eine Auslenkung von −1 bis 1 (Radius 56 Punkte). */
function clampStick(delta: number): number {
  return THREE.MathUtils.clamp(delta / 56, -1, 1);
}

/**
 * Ein gepolltes Ja/Nein zur Flanke machen — `ButtonState` zählt Ereignisse,
 * ein Pad meldet Zustände (`core/XRInput.ts`, dieselbe Klasse wie in der
 * Brille, nicht abgeschrieben).
 */
function edge(state: ButtonState, down: boolean): void {
  if (down && !state.pressed) state.press();
  else if (!down && state.pressed) state.release();
  state.beginFrame();
}

function hitsElement(el: HTMLElement | null, event: PointerEvent): boolean {
  if (!el || el.hidden) return false;
  const rect = el.getBoundingClientRect();
  // Ein ausgeblendetes Feld misst 0 × 0 an der Ecke (0, 0) — und ein Finger
  // genau dort träfe es sonst.
  if (rect.width === 0 || rect.height === 0) return false;
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}
