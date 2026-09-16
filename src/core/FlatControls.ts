import * as THREE from 'three';
import type { PlayerRig } from './PlayerRig';
import type { TopDownCamera } from './TopDownCamera';
import { ButtonState } from './XRInput';
import {
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
import { pinchFactor, yawFromDirection, type Vec2 } from './topDownPose';
import { smoothAngle } from '../net/PoseSmoothing';

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
  /** Ob die linke Maustaste gerade unten liegt — von oben ist sie der Trigger. */
  private mouseFire = false;
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
  /**
   * Ob zuletzt ein **Knopf am Pad oder auf dem Glas** gedrückt wurde und nicht
   * eine Taste — daraus wird der Name im Hinweis über der Figur
   * (`PlayerRig.useLabel`). Eine Taste holt ihn wieder zurück.
   */
  private padSpoke = false;
  private topDownOn = false;
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
    this.firePointer = null;
    this.setPressed(this.pads.fire, false);
    this.aimStick.set(0, 0);
    this.updateStickVisual(this.pads.aim, 0, 0);
    this.freeTouches.clear();
    this.pinchGap = null;
    this.rig.setTrigger(0);
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
    if (!this.enabled) return;

    const pad = this.readPad();

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

    if (this.topDownOn) {
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
    // Der Trigger gehört von oben der Figur; aus den Augen schießt weiter, was
    // schon immer geschossen hat (die Maus, über die Welt) — ein zweiter Weg
    // dorthin wäre ein zweiter Schuss.
    this.rig.setTrigger(0);

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
   * auch direkt vor einem Knopf.
   *
   * @returns ob in diesem Bild gesprungen werden soll
   */
  private applyUse(pad: GamepadFrame): boolean {
    if (pad.use || pad.fire || pad.zoomIn || pad.zoomOut || pad.tools) this.padSpoke = true;
    this.rig.useLabel = this.padSpoke ? 'A' : 'E';

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
      if (this.rig.useCandidate) use = true;
      else jump = true;
    }
    if (use) this.rig.requestUse();
    return jump;
  }

  /**
   * **Schießen und Zoom** — was es nur von oben gibt.
   *
   * Der Trigger geht ans Rig und nicht an die Welt (`PlayerRig.setTrigger`):
   * Was in der rechten Hand der Figur liegt, weiß die Welt, und die fragt dort
   * nach. Der Zoom bleibt bei der Kamera, denn sie ist das Einzige, was er
   * ändert. Das Benutzen steht eine Ebene höher (`applyUse`) — es gilt in
   * jeder Ansicht und nicht nur hier.
   */
  private applyTopDownButtons(pad: GamepadFrame): void {
    const trigger = Math.max(
      pad.trigger,
      this.mouseFire ? 1 : 0,
      this.firePointer !== null ? 1 : 0,
    );
    this.rig.setTrigger(trigger);

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
      // Wer tippt, spielt an der Tastatur: der Hinweis heißt wieder `E`.
      this.padSpoke = false;
      this.keys.add(e.code);
    });
    this.on(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.code));
    this.on(window, 'blur', () => {
      this.keys.clear();
      this.mouseFire = false;
      this.rig.useHeld = false;
    });

    this.on(document, 'pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    this.on(this.canvas, 'pointerdown', (event: PointerEvent) => {
      if (!this.enabled) return;
      if (event.pointerType === 'mouse') {
        // Von oben ist die linke Maustaste der Trigger; sonst holt sie sich
        // wie bisher den Zeiger.
        if (this.topDownOn) {
          if (event.button === 0) this.mouseFire = true;
          return;
        }
        if (!this.pointerLocked) void this.canvas.requestPointerLock?.();
        return;
      }
      const pads = this.pads;
      if (this.stickPointer === null && hitsElement(pads.stick, event)) {
        this.stickPointer = event.pointerId;
        this.stickOrigin.set(event.clientX, event.clientY);
        this.canvas.setPointerCapture(event.pointerId);
      } else if (this.topDownOn && this.aimPointer === null && hitsElement(pads.aim, event)) {
        this.aimPointer = event.pointerId;
        this.aimOrigin.set(event.clientX, event.clientY);
        this.canvas.setPointerCapture(event.pointerId);
      } else if (hitsElement(pads.use, event)) {
        // Derselbe Knopf wie `A` am Pad: benutzen, wenn etwas dasteht, sonst
        // springen (`applyUse`).
        this.usePointer = event.pointerId;
        this.aQueued = true;
        this.padSpoke = true;
        this.setPressed(pads.use, true);
      } else if (hitsElement(pads.fire, event)) {
        this.firePointer = event.pointerId;
        this.padSpoke = true;
        this.setPressed(pads.fire, true);
      } else if (this.freeHit(event)) {
        // Ein Finger, der auf nichts liegt: Er sieht sich um — bis ein zweiter
        // dazukommt, dann zoomen die beiden (`updatePinch`).
        this.freeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.startPinch()) {
          this.lookPointer = null;
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
        if (this.pointerLocked) this.look(event.movementX, event.movementY);
        return;
      }
      if (event.pointerId === this.stickPointer) {
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
        if (event.pointerId === this.lookPointer) {
          this.look(event.clientX - this.lookLast.x, event.clientY - this.lookLast.y);
          this.lookLast.set(event.clientX, event.clientY);
        }
      }
    });

    const end = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button === 0) this.mouseFire = false;
      if (event.pointerId === this.stickPointer) {
        this.stickPointer = null;
        this.stick.set(0, 0);
        this.updateStickVisual(this.pads.stick, 0, 0);
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
      if (this.freeTouches.delete(event.pointerId) && this.freeTouches.size < 2) {
        this.pinchGap = null;
      }
    };
    this.on(this.canvas, 'pointerup', end);
    this.on(this.canvas, 'pointercancel', end);
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
