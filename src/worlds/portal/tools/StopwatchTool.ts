import * as THREE from 'three';
import { Tool, disposeToolTree, grabMaterial, type ToolHost } from './Tool';
import { gripFrame } from './gripFit';
import type { HoldPose } from './toolPose';
import type { Vec3 } from './aim';
import { playStopwatch, playTone } from '../../../core/Audio';
import { UIPanel } from '../../../ui/UIPanel';
import { drawMenuIcon, type MenuEntry } from '../../../ui/menu';
import { saveStopwatchSettings, stopwatchSettings } from './gearStore';
import {
  STOPWATCH_ACTION_LABELS,
  STOPWATCH_ACTION_SUBS,
  factorLabel,
  framesLabel,
  nextFactor,
  nextFrames,
  nextStopwatchAction,
  type StopwatchSettings,
} from './stopwatchSettings';
import type { ControllerState, Handedness } from '../../../core/XRInput';
import type { Pointer } from '../../../core/Pointer';

/** Wie schnell der Zeitfaktor wechselt — die Rampe ist es, was man hört. */
const RAMP = 0.55;

/** Das Gehäuse: Halbmesser und Dicke. Es liegt mit seiner seitlichen Kante im Griffpunkt. */
const RADIUS = 0.045;
const THICKNESS = 0.016;
/** Die Krone sitzt oben auf dem Gehäuse — und der Daumen auf ihr (`gripFist.test.ts`). */
export const CROWN_Y = RADIUS + 0.005;

/**
 * Der **Rand als Griff**, im Rahmen jedes Griffs (`gripFit.ts`: Achse auf +Y,
 * Vorne auf -Z), im Raum des Werkzeugs — so, wie ein Zeitnehmer seine Uhr
 * hält: sie liegt **in der Hand**, das Blatt zum Gesicht, die Finger greifen
 * um ihre **seitliche Kante** und der Daumen liegt oben auf der Krone. Der
 * Zylinder ist also das Stück Rand an der Seite, senkrecht (Achse +y, die
 * Daumenseite nach oben), und der Handrücken zeigt nach hinten (-z): die
 * Handfläche liegt hinter dem Gehäuse. Das Gehäuse selbst rückt dafür zur
 * Seite — bei der rechten Hand nach rechts, denn deren Finger greifen um die
 * linke Kante (`showHeldBy`). Daraus rechnet `core/gripFist.test.ts` die Faust
 * (`STOPWATCH_HAND_POSE`).
 */
/**
 * Wie schräg die Hand dabei steht, in Bogenmaß: die Finger zeigen nicht
 * waagerecht nach links um die Kante, sondern nach links **oben**, und der
 * Arm kommt von rechts unten — auf dem Foto eines Zeitnehmers sind es gut
 * 35°. Waagerecht sah die Hand aus wie an einem Türgriff.
 */
export const STOPWATCH_TILT = (35 * Math.PI) / 180;
export const STOPWATCH_GRIP: HoldPose = {
  position: { x: 0, y: 0, z: 0 },
  rotation: gripFrame(
    { x: Math.sin(STOPWATCH_TILT), y: Math.cos(STOPWATCH_TILT), z: 0 },
    { x: 0, y: 0, z: -1 },
  ),
};
/** Und wo der Rand in der Hand liegt: wie ein Stab, eine Spur unter und vor dem Griffpunkt. */
export const RIM_HOLD_POSITION: Vec3 = { x: 0, y: -0.012, z: 0.02 };

/**
 * Die Stoppuhr: das Werkzeug, mit dem man Physik ansieht.
 *
 * Der **Knopf** an der Krone (oder `A`/`X`) öffnet ein kleines Panel über der
 * Uhr — dieselbe Mechanik wie beim Drohnen-Display, und aus demselben Grund:
 * eine Einstellung, die man mitten im Versuch braucht, gehört an das Werkzeug
 * und nicht in ein Menü drei Ebenen tiefer. Dort steht, was der **Trigger**
 * macht (`stopwatchSettings.ts`):
 *
 * - **Zeit** — er legt den eingestellten Faktor an: 0,05× Zeitlupe, 4×
 *   Zeitraffer, oder ganz angehalten. Nochmal drücken gibt der Welt ihr Tempo
 *   zurück, und das Weglegen der Uhr sowieso.
 * - **Einzelbild** — solange die Uhr in der Hand ist, *steht* die Zeit, und
 *   jeder Druck rechnet die eingestellte Anzahl fester Schritte. Eine Kugel im
 *   Flug, ein umkippender Stapel, ein Portalübergang: alles, was zwischen zwei
 *   Bildern passiert, passiert hier sichtbar.
 * - **Schnellladen** — er stellt die zuletzt gespeicherte Aufstellung wieder
 *   her. **Gespeichert** wird nur über das Panel, nie über den Trigger: sonst
 *   überschreibt der eine Fehlgriff genau den Zustand, den man behalten
 *   wollte.
 */
export class StopwatchTool extends Tool {
  override readonly toolId = 'stopwatch';
  override readonly label = 'Stoppuhr';

  /** Die Uhr selbst — gegen das Werkzeug versetzt, damit ihre Kante im Griffpunkt liegt. */
  private readonly body = new THREE.Group();
  private readonly hand: THREE.Mesh;
  private readonly sweepPivot: THREE.Group;
  private readonly face: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly crown: THREE.Mesh;
  /** Der Knopf an der Krone und das Panel, das er öffnet. */
  private readonly button: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly buttonCanvas: HTMLCanvasElement;
  private readonly buttonTexture: THREE.CanvasTexture;
  private readonly panel: UIPanel;
  private buttonHot = false;
  private settingsOpen = false;

  /** Der Zeitfaktor liegt gerade an. */
  private active = false;
  /** 0 = normale Geschwindigkeit, 1 = der eingestellte Faktor, geblendet. */
  private blend = 0;
  private sweep = 0;
  private hostRef: ToolHost | null = null;
  private pointer: Pointer | null = null;

  constructor() {
    super();
    this.name = 'tool-stopwatch';
    this.icon = 'stopwatch';
    this.accent = 0xffc857;
    this.hint = 'Trigger schaltet die Zeit · Knopf öffnet das Menü';
    // Kein Standardgriff: eine Taschenuhr liegt **in der Hand**. Ihre
    // seitliche Kante läuft als senkrechter Zylinder durch den Griffpunkt, und
    // die Faust liegt darum (`STOPWATCH_GRIP`, `STOPWATCH_HAND_POSE`):
    // Handfläche hinter dem Gehäuse, Finger um die Kante, Daumen oben auf der
    // Krone, Zifferblatt zum Gesicht — also nach **+z**, zum Kopf, und nicht
    // nach vorn wie eine Waffe. Lange schaute es nach vorn, und man sah den
    // Zeiger nie; dann stand es hochkant auf der Faust, und niemand hält eine
    // Uhr so.
    this.holdPosition.set(RIM_HOLD_POSITION.x, RIM_HOLD_POSITION.y, RIM_HOLD_POSITION.z);
    // Alles, woraus die Uhr besteht, hängt an `body` — und das rückt je Hand
    // zur Seite, damit die gegriffene Kante im Griffpunkt liegt.
    this.add(this.body);
    this.showHeldBy('right');

    const brass = new THREE.MeshStandardMaterial({
      color: 0xd9a441,
      roughness: 0.3,
      metalness: 0.75,
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b2231, roughness: 0.6 });

    // Das Gehäuse: sein Mantel — der Rand — in Greiffarbe, denn dort fasst man
    // an; die Böden in Messing.
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(RADIUS, RADIUS, THICKNESS, 28, 1, true),
      grabMaterial({ roughness: 0.5 }),
    );
    shell.rotation.x = Math.PI / 2;
    this.body.add(shell);
    const back = new THREE.Mesh(new THREE.CircleGeometry(RADIUS, 28), brass);
    back.position.set(0, 0, -THICKNESS / 2);
    back.rotation.y = Math.PI;
    this.body.add(back);
    const bezel = new THREE.Mesh(new THREE.RingGeometry(0.038, RADIUS, 28), brass);
    bezel.position.set(0, 0, THICKNESS / 2);
    this.body.add(bezel);

    this.face = new THREE.Mesh(
      new THREE.CircleGeometry(0.038, 28),
      new THREE.MeshBasicMaterial({ color: 0xf3f6fb, toneMapped: false }),
    );
    this.face.position.set(0, 0, THICKNESS / 2 + 0.001);
    this.body.add(this.face);

    // The second hand turns around a pivot sitting on the dial.
    this.sweepPivot = new THREE.Group();
    this.sweepPivot.name = 'stopwatch-pivot';
    this.sweepPivot.position.set(0, 0, THICKNESS / 2 + 0.003);
    this.hand = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.032, 0.002), dark);
    this.hand.position.set(0, 0.016, 0);
    this.sweepPivot.add(this.hand);
    this.body.add(this.sweepPivot);

    this.crown = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.014, 12), brass);
    this.crown.position.set(0, CROWN_Y, 0);
    this.body.add(this.crown);

    // --- der Knopf auf der Krone ---------------------------------------------
    this.buttonCanvas = document.createElement('canvas');
    this.buttonCanvas.width = 128;
    this.buttonCanvas.height = 128;
    this.buttonTexture = new THREE.CanvasTexture(this.buttonCanvas);
    this.buttonTexture.colorSpace = THREE.SRGBColorSpace;
    this.button = new THREE.Mesh(
      new THREE.CircleGeometry(0.013, 24),
      new THREE.MeshBasicMaterial({
        map: this.buttonTexture,
        transparent: true,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    this.button.name = 'stopwatch-settings-button';
    this.button.position.set(0, CROWN_Y, 0.012);
    this.button.renderOrder = 12;
    this.button.geometry.computeBoundingBox();
    this.body.add(this.button);
    this.drawButton();

    this.panel = new UIPanel({
      width: 0.19,
      title: 'Stoppuhr',
      onSelect: (index) => this.choose(index),
    });
    this.panel.position.set(0, CROWN_Y + 0.1, 0.02);
    this.panel.visible = false;
    this.body.add(this.panel);
  }

  /**
   * Das Gehäuse rückt zur Seite, damit die gegriffene Kante im Griffpunkt
   * liegt: die rechte Hand greift um die linke Kante, also liegt die Uhr rechts
   * von ihr; links gespiegelt. Ohne Hand (am Gürtel, auf dem Boden) liegt sie
   * mittig — dieselbe Regel wie beim Deck der Drohne.
   */
  override showHeldBy(hand: Handedness | null): void {
    this.body.position.x = hand === 'right' ? RADIUS : hand === 'left' ? -RADIUS : 0;
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    this.hostRef = host;
    this.pointer = host.ctx.pointer;
    host.ctx.pointer.remove(this.button);
    host.ctx.pointer.add({
      object: this.button,
      pokeable: true,
      // Die eigene Hand hält die Uhr; ihr Strahl liegt sonst dauerhaft auf dem
      // eigenen Knopf und nimmt ihr den Trigger weg.
      ignore: (hand) => hand !== null && hand === this.heldBy,
      onHover: () => this.setButtonHot(true),
      onBlur: () => this.setButtonHot(false),
      onSelect: () => this.setSettingsOpen(!this.settingsOpen),
    });
    // Im Einzelbild-Modus hält die Uhr die Welt an, sobald sie in der Hand
    // liegt: „Zeit steht" ist der Modus, nicht erst der erste Druck.
    if (this.settings().action === 'step') {
      this.active = true;
      host.setTimeScale(0);
      this.blend = 1;
    }
  }

  override onStow(host: ToolHost): void {
    // Letting go of the watch always gives the world its speed back.
    this.setActive(false, host);
    host.setTimeScale(1);
    this.blend = 0;
    this.setSettingsOpen(false);
    host.ctx.pointer.remove(this.button);
    host.ctx.pointer.remove(this.panel);
    this.hostRef = null;
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    const settings = this.settings();
    switch (settings.action) {
      case 'step': {
        host.setTimeScale(0);
        this.blend = 1;
        this.active = true;
        host.stepFrames(settings.frames);
        this.sweep += settings.frames / 60;
        host.notify(`${framesLabel(settings.frames)} weiter`);
        playTone({ type: 'square', from: 880, to: 660, duration: 0.05, gain: 0.03 });
        break;
      }
      case 'load': {
        if (!host.hasWorldSnapshot()) {
          host.notify('Nichts gespeichert — erst im Menü sichern');
          break;
        }
        const count = host.loadWorldSnapshot();
        host.notify(`${count} Objekt(e) zurückgesetzt`);
        playTone({ type: 'sine', from: 520, to: 900, duration: 0.12, gain: 0.05 });
        break;
      }
      default:
        this.setActive(!this.active, host);
        break;
    }
    controller.pulse(0.5, 40);
  }

  /**
   * `A`/`X` öffnet dasselbe Panel wie der Knopf — die Hand, die die Uhr hält,
   * kommt mit dem Daumen leichter dorthin als die andere mit dem Strahl.
   */
  override onPrimary(controller: ControllerState, _host: ToolHost): void {
    this.setSettingsOpen(!this.settingsOpen);
    controller.pulse(0.35, 25);
  }

  override update(dt: number, host: ToolHost, _controller: ControllerState | null): void {
    this.hostRef = host;
    const settings = this.settings();
    const target = this.active ? 1 : 0;
    const factor = settings.action === 'step' ? 0 : settings.factor;
    if (this.blend !== target) {
      const step = dt / RAMP;
      this.blend =
        target > this.blend
          ? Math.min(target, this.blend + step)
          : Math.max(target, this.blend - step);
      host.setTimeScale(1 + (factor - 1) * this.blend);
    }

    // Der Zeiger läuft so schnell wie die Welt.
    this.sweep += dt * (1 + (factor - 1) * this.blend) * 2.2;
    // Das Blatt schaut nach +z: von vorn gesehen läuft -z-Drehung im Uhrzeigersinn.
    this.sweepPivot.rotation.z = -this.sweep;
    this.face.material.color.setHex(
      this.blend > 0.5 ? (factor > 1 ? 0xd6f5ff : 0xffe2ad) : 0xf3f6fb,
    );
    this.crown.position.y = CROWN_Y - this.blend * 0.004;
    this.panel.update(dt);
  }

  override disposeTool(): void {
    this.panel.dispose();
    this.buttonTexture.dispose();
    disposeToolTree(this);
  }

  /** Nimmt die Uhr auch dem Zeiger aus der Hand, wenn die Welt endet. */
  forgetPointer(pointer: Pointer): void {
    pointer.remove(this.button);
    pointer.remove(this.panel);
  }

  // --- das Panel -------------------------------------------------------------

  private settings(): StopwatchSettings {
    return stopwatchSettings();
  }

  private showSettings(): void {
    const settings = this.settings();
    const host = this.hostRef;
    const entries: MenuEntry[] = [
      {
        id: 'watch:action',
        label: `Trigger: ${STOPWATCH_ACTION_LABELS[settings.action]}`,
        sub: STOPWATCH_ACTION_SUBS[settings.action],
        icon: 'stopwatch',
        accent: 0xffc857,
      },
      {
        id: 'watch:factor',
        label: `Zeitfaktor: ${factorLabel(settings.factor)}`,
        sub: 'Anhalten, Zeitlupe oder Zeitraffer',
        icon: 'stopwatch',
        accent: 0x9ad9ff,
      },
      {
        id: 'watch:frames',
        label: `Einzelbild: ${framesLabel(settings.frames)}`,
        sub: 'Wie weit ein Druck die Welt rechnet',
        icon: 'gizmo',
        accent: 0x9ad9ff,
      },
      {
        id: 'watch:save',
        label: 'Welt speichern',
        sub: 'Jede Pose und jeden Schwung merken',
        icon: 'bag',
        accent: 0x5ee0a0,
      },
      {
        id: 'watch:load',
        label: 'Welt laden',
        sub: host?.hasWorldSnapshot()
          ? 'Zurück zum gespeicherten Stand'
          : 'Noch nichts gespeichert',
        icon: 'reset',
        accent: 0x5ee0a0,
      },
    ];
    this.panel.setPage('Stoppuhr', entries, { hint: 'Zielen und Trigger stellt um' });
  }

  private choose(index: number): void {
    const settings = this.settings();
    const host = this.hostRef;
    switch (index) {
      case 0: {
        const action = nextStopwatchAction(settings.action);
        saveStopwatchSettings({ action });
        // Der Moduswechsel gibt der Welt erst einmal ihr Tempo zurück; im
        // Einzelbild-Modus hält sie sofort wieder an, sonst stünde sie ohne
        // dass jemand den Trigger gedrückt hätte.
        this.active = action === 'step';
        this.blend = this.active ? 1 : 0;
        host?.setTimeScale(action === 'step' ? 0 : 1);
        break;
      }
      case 1:
        saveStopwatchSettings({ factor: nextFactor(settings.factor) });
        break;
      case 2:
        saveStopwatchSettings({ frames: nextFrames(settings.frames) });
        break;
      case 3: {
        const count = host?.saveWorldSnapshot() ?? 0;
        host?.notify(`${count} Objekt(e) gespeichert`);
        playTone({ type: 'sine', from: 620, to: 980, duration: 0.12, gain: 0.05 });
        break;
      }
      case 4: {
        if (!host?.hasWorldSnapshot()) {
          host?.notify('Noch nichts gespeichert');
          break;
        }
        host.notify(`${host.loadWorldSnapshot()} Objekt(e) zurückgesetzt`);
        break;
      }
    }
    this.showSettings();
  }

  private setSettingsOpen(open: boolean): void {
    if (this.settingsOpen === open) return;
    this.settingsOpen = open;
    this.panel.visible = open;
    const pointer = this.pointer;
    if (pointer) {
      pointer.remove(this.panel);
      if (open) {
        pointer.add({
          ...this.panel.asPointerTarget(),
          pokeable: false,
          ignore: (hand: Handedness | null) => hand !== null && hand === this.heldBy,
        });
      }
    }
    if (open) this.showSettings();
    this.drawButton();
    playTone({
      type: 'sine',
      from: open ? 420 : 620,
      to: open ? 700 : 380,
      duration: 0.09,
      gain: 0.04,
    });
  }

  private setButtonHot(hot: boolean): void {
    if (this.buttonHot === hot) return;
    this.buttonHot = hot;
    this.drawButton();
  }

  private setActive(active: boolean, host: ToolHost): void {
    if (this.active === active) return;
    this.active = active;
    const factor = this.settings().factor;
    playStopwatch(active);
    host.notify(active ? factorLabel(factor) : 'Normale Geschwindigkeit');
    if (!active && this.blend === 0) host.setTimeScale(1);
  }

  private drawButton(): void {
    const ctx = this.buttonCanvas.getContext('2d');
    if (!ctx) return;
    const size = this.buttonCanvas.width;
    const middle = size / 2;
    ctx.clearRect(0, 0, size, size);

    const glow = ctx.createRadialGradient(middle, middle, 12, middle, middle, middle - 2);
    glow.addColorStop(0, this.settingsOpen ? 'rgba(255,157,61,0.95)' : 'rgba(255,200,87,0.95)');
    glow.addColorStop(1, 'rgba(8, 14, 26, 0.92)');
    ctx.beginPath();
    ctx.arc(middle, middle, middle - 3, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.lineWidth = this.buttonHot ? 6 : 3.5;
    ctx.strokeStyle = this.buttonHot ? '#ffffff' : 'rgba(255,255,255,0.75)';
    ctx.stroke();

    drawMenuIcon(
      ctx,
      this.settingsOpen ? 'back' : 'stopwatch',
      middle,
      middle,
      size * 0.5,
      '#ffffff',
    );
    this.buttonTexture.needsUpdate = true;
  }
}
