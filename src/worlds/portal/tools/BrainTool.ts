import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { UIPanel } from '../../../ui/UIPanel';
import { drawMenuIcon, type MenuEntry } from '../../../ui/menu';
import { playTone } from '../../../core/Audio';
import { npcSettings, saveNpcSettings } from './gearStore';
import { createBrainShape } from '../../npc/brainShape';
import { BRAIN_IDS, brainLabel, brainOf } from '../../npc/npcBrains';
import { NPC_KINDS, npcSkin } from '../../npc/npcKinds';
import {
  NPC_FIELDS,
  NPC_MODES,
  NPC_MODE_IDS,
  nextIn,
  nextNpcStep,
  npcFieldLabel,
  npcModeLabel,
  withBrain,
  withKind,
  type NpcMode,
} from '../../npc/npcSettings';
import type { ControllerState, Handedness } from '../../../core/XRInput';
import type { Pointer } from '../../../core/Pointer';

/** So weit reicht der Strahl, in Metern. */
const RANGE = 40;
/** Wie groß der Kreis am Ziel ist. */
const MARKER_RADIUS = 0.34;
/** Wie flach eine Fläche sein muss, damit dort jemand stehen kann. */
const MIN_NORMAL_Y = Math.cos(THREE.MathUtils.degToRad(50));

const GOOD = 0x5ee0a0;
const BAD = 0xff6b6b;
const PINK = 0xe58aa8;

const _tip = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 0, 1);

/** Welches Symbol jede der vier Zahlen auf dem Panel bekommt. */
const FIELD_ICONS: Record<string, 'stopwatch' | 'gizmo' | 'spawn'> = {
  speed: 'stopwatch',
  health: 'gizmo',
  interval: 'stopwatch',
  max: 'spawn',
};

/**
 * **Das Hirn** — das Werkzeug, mit dem man NPCs in die Welt setzt.
 *
 * Es sieht aus wie eines und tut auch das, was eines tut: es **entscheidet**.
 * Wer es in die Hand nimmt, hält keinen Zombie, sondern die Frage, was für
 * einer werden soll — und die zerfällt in zwei Hälften, die getrennt
 * beantwortet werden:
 *
 * - die **Haut** (`npcKinds.ts`): wie er aussieht, wie groß er ist, was er
 *   einsteckt;
 * - das **Hirn** (`npcBrains.ts`): was er tut — stehen, schlendern, verfolgen.
 *
 * Beide stehen als eigene Zeile im Panel, und darum kann man eine Übungspuppe
 * mit einem Zombie-Hirn setzen. Wären es eine Zeile, gäbe es statt zwei mal
 * drei Möglichkeiten sechs Sorten NPC — und beim nächsten Modell zwölf.
 *
 * **Der Knopf über dem Stamm** (oder `A`/`X`) öffnet das Panel, genau wie bei
 * der Drohne und bei der Stoppuhr; es ist dieselbe Mechanik, weil es dieselbe
 * Frage ist: eine Einstellung, die man mitten im Spiel braucht, gehört an das
 * Werkzeug und nicht in ein Menü drei Ebenen tiefer.
 *
 * **Der Trigger setzt**, und was er setzt, sagt die Zeile *Setzen*
 * (`npcSettings.ts`):
 *
 * - **NPC** — einer, dorthin, wo der Kreis liegt.
 * - **Spawnpunkt** — eine Stelle, an der später welche auftauchen dürfen.
 * - **Brutkäfig** — ein Käfig, der von selbst nachlegt, solange jemand in der
 *   Nähe ist.
 * - **Entfernen** — nimmt weg, worauf man zeigt: NPC, Käfig oder Punkt.
 *
 * Der **Kreis am Boden** sagt vorher, wohin es geht, und ob es überhaupt geht:
 * eine Wand ist kein Platz für Füße. Dieselbe Auskunft wie beim Teleporter, und
 * aus demselben Grund — eine Antwort, die man erst nach dem Drücken bekommt,
 * ist keine.
 */
export class BrainTool extends Tool {
  override readonly toolId = 'brain';
  override readonly label = 'Hirn';

  /** Der Kreis am Ziel — er hängt an der Welt, nicht am Werkzeug. */
  private readonly marker = new THREE.Group();
  private readonly ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly disc: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly beam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly muzzle = new THREE.Object3D();
  /** Das Ziel dieser Frame, oder `null` — der Trigger liest nur das hier. */
  private target: THREE.Vector3 | null = null;
  private readonly hit = new THREE.Vector3();

  /** Der Knopf über dem Hirn und das Panel, das er öffnet. */
  private readonly button: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly buttonCanvas: HTMLCanvasElement;
  private readonly buttonTexture: THREE.CanvasTexture;
  private readonly panel: UIPanel;
  private buttonHot = false;
  private settingsOpen = false;
  private hostRef: ToolHost | null = null;
  private pointer: Pointer | null = null;

  constructor() {
    super();
    this.name = 'tool-brain';
    this.icon = 'brain';
    this.accent = PINK;
    this.hint = 'Zielen und Trigger setzt · Knopf öffnet Haut und Hirn';

    // Derselbe Halterzylinder wie an der Pistole: ein Hirn auf einem Stiel,
    // und der Stiel liegt in der Faust wie jeder andere.
    this.mountGrip();

    // Das Hirn sitzt **auf** dem Halter: sein Stamm steckt oben im Zylinder,
    // wie der Lauf einer Pistole über ihrem Griff. Der Halter liegt bei
    // y = -0,055 und ist knapp zehn Zentimeter lang (`grip.ts`), sein oberes
    // Ende also knapp unter der Null — dort fängt das Hirn an.
    const brain = createBrainShape({ radius: 0.05, color: PINK });
    brain.position.set(0, 0.045, 0.004);
    this.add(brain);

    this.muzzle.position.set(0, 0.02, -0.06);
    this.add(this.muzzle);

    // --- der Knopf ------------------------------------------------------------
    this.buttonCanvas = document.createElement('canvas');
    this.buttonCanvas.width = 128;
    this.buttonCanvas.height = 128;
    this.buttonTexture = new THREE.CanvasTexture(this.buttonCanvas);
    this.buttonTexture.colorSpace = THREE.SRGBColorSpace;
    this.button = new THREE.Mesh(
      new THREE.CircleGeometry(0.015, 24),
      new THREE.MeshBasicMaterial({
        map: this.buttonTexture,
        transparent: true,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    this.button.name = 'brain-settings-button';
    // Der Knopf sitzt hinten am Hirn, also auf der Seite, die beim Zielen zum
    // eigenen Gesicht schaut: -Z ist vorne. Vorn wäre er ein Knopf, den man
    // nur sieht, wenn man das Werkzeug umdreht.
    this.button.position.set(0, 0.045, 0.07);
    this.button.renderOrder = 12;
    this.button.geometry.computeBoundingBox();
    this.add(this.button);
    this.drawButton();

    this.panel = new UIPanel({
      width: 0.2,
      title: 'Hirn',
      onSelect: (index) => this.choose(index),
    });
    this.panel.position.set(0, 0.26, 0.03);
    this.panel.visible = false;
    this.add(this.panel);

    // --- der Kreis am Ziel ----------------------------------------------------
    this.marker.name = 'brain-marker';
    this.marker.visible = false;
    this.disc = new THREE.Mesh(
      new THREE.CircleGeometry(MARKER_RADIUS - 0.06, 36),
      new THREE.MeshBasicMaterial({
        color: GOOD,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.marker.add(this.disc);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(MARKER_RADIUS - 0.05, MARKER_RADIUS, 40),
      new THREE.MeshBasicMaterial({
        color: GOOD,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.marker.add(this.ring);
    this.beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1),
      ]),
      new THREE.LineBasicMaterial({ color: GOOD, transparent: true, opacity: 0.5 }),
    );
    this.beam.name = 'brain-beam';
    this.beam.frustumCulled = false;
    this.beam.visible = false;
    this.muzzle.add(this.beam);
  }

  // --- in die Hand und wieder weg --------------------------------------------

  override onTake(_controller: ControllerState, host: ToolHost): void {
    this.hostRef = host;
    this.pointer = host.ctx.pointer;
    if (this.marker.parent !== host.root) host.root.add(this.marker);
    host.ctx.pointer.remove(this.button);
    host.ctx.pointer.add({
      object: this.button,
      pokeable: true,
      // Die eigene Hand hält das Werkzeug; ihr Strahl läge sonst dauerhaft auf
      // dem eigenen Knopf und nähme ihr den Trigger weg.
      ignore: (hand) => hand !== null && hand === this.heldBy,
      onHover: () => this.setButtonHot(true),
      onBlur: () => this.setButtonHot(false),
      onSelect: () => this.setSettingsOpen(!this.settingsOpen),
    });
  }

  override onStow(host: ToolHost): void {
    this.blank();
    this.setSettingsOpen(false);
    host.ctx.pointer.remove(this.button);
    host.ctx.pointer.remove(this.panel);
    this.hostRef = null;
  }

  /** Nimmt das Hirn auch dem Zeiger aus der Hand, wenn die Welt endet. */
  forgetPointer(pointer: Pointer): void {
    pointer.remove(this.button);
    pointer.remove(this.panel);
  }

  override onPrimary(controller: ControllerState, _host: ToolHost): void {
    this.setSettingsOpen(!this.settingsOpen);
    controller.pulse(0.35, 25);
  }

  // --- setzen -----------------------------------------------------------------

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    const npcs = host.npcs();
    if (!npcs) {
      host.notify('Hier läuft niemand herum');
      return;
    }
    const settings = npcSettings();

    if (settings.mode === 'clear') {
      this.muzzle.getWorldPosition(_tip);
      _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
      const gone = npcs.removeAlong(_tip, _direction);
      host.notify(gone ? `${gone} entfernt` : 'Nichts getroffen');
      if (gone) controller.pulse(0.5, 35);
      return;
    }

    if (!this.target) {
      host.notify('Kein Platz dafür');
      playTone({ type: 'square', from: 220, to: 130, duration: 0.08, gain: 0.05 });
      return;
    }

    switch (settings.mode) {
      case 'point': {
        const count = npcs.addPoint(this.target);
        host.notify(`Spawnpunkt ${count}`);
        break;
      }
      case 'cage': {
        const count = npcs.addCage({
          kind: settings.kind,
          brain: settings.brain,
          at: this.target,
          speed: settings.speed,
          health: settings.health,
          interval: settings.interval,
          max: settings.max,
        });
        host.notify(`Brutkäfig ${count} · ${npcSkin(settings.kind).label}`);
        break;
      }
      default: {
        const placed = npcs.place({
          kind: settings.kind,
          brain: settings.brain,
          at: this.target,
          speed: settings.speed,
          health: settings.health,
        });
        if (placed) {
          host.notify(`${npcSkin(settings.kind).label} · ${brainLabel(settings.brain)}`);
        }
        break;
      }
    }
    controller.pulse(0.6, 40);
    playTone({ type: 'sine', from: 480, to: 900, duration: 0.12, gain: 0.05 });
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    this.hostRef = host;
    this.panel.update(dt);
    if (!this.heldBy || !controller) {
      this.blank();
      return;
    }
    // Beim Entfernen gibt es keinen Platz zu suchen: der Strahl zeigt auf ein
    // Wesen und nicht auf den Boden.
    if (npcSettings().mode === 'clear') {
      this.blank();
      return;
    }

    this.muzzle.getWorldPosition(_tip);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    const surface = host.castSurface(_tip, _direction);
    if (!surface || surface.point.distanceTo(_tip) > RANGE) {
      this.blank();
      return;
    }

    const flat = surface.normal.y >= MIN_NORMAL_Y;
    this.target = flat ? this.hit.copy(surface.point) : null;
    this.marker.visible = true;
    this.marker.position.copy(surface.point);
    this.marker.quaternion.setFromUnitVectors(_up, surface.normal);
    this.marker.translateZ(0.012);

    const color = flat ? GOOD : BAD;
    this.ring.material.color.setHex(color);
    this.disc.material.color.setHex(color);
    this.beam.material.color.setHex(color);
    this.beam.visible = true;
    this.beam.scale.z = _tip.distanceTo(surface.point);
  }

  override disposeTool(): void {
    this.panel.dispose();
    this.buttonTexture.dispose();
    disposeToolTree(this);
    disposeToolTree(this.marker);
    this.marker.removeFromParent();
    this.beam.geometry.dispose();
    this.beam.material.dispose();
  }

  private blank(): void {
    this.target = null;
    this.marker.visible = false;
    this.beam.visible = false;
  }

  // --- das Panel ---------------------------------------------------------------

  /** Die Zeilen, jedes Mal neu gebaut, wenn sich eine davon geändert hat. */
  private showSettings(): void {
    const settings = npcSettings();
    const skin = npcSkin(settings.kind);
    const brain = brainOf(settings.brain);
    const mode = NPC_MODES.find((entry) => entry.id === settings.mode);
    const census = this.hostRef?.npcs()?.census();

    const entries: MenuEntry[] = [
      {
        id: 'brain:kind',
        label: `Haut: ${skin.label}`,
        sub: skin.sub,
        icon: skin.icon,
        accent: skin.accent,
      },
      {
        id: 'brain:brain',
        label: `Hirn: ${brain.label}`,
        sub: brain.sub,
        icon: brain.icon,
        accent: brain.accent,
      },
      {
        id: 'brain:mode',
        label: `Setzen: ${npcModeLabel(settings.mode)}`,
        sub: mode?.sub ?? '',
        icon: settings.mode === 'cage' ? 'spawn' : 'teleport',
        accent: 0x9ad9ff,
      },
      ...NPC_FIELDS.map((field) => ({
        id: `brain:${field.key}`,
        label: `${field.label}: ${npcFieldLabel(field, settings[field.key])}`,
        sub: field.sub,
        icon: FIELD_ICONS[field.key] ?? 'gizmo',
        accent: 0xffc857,
      })),
      {
        id: 'brain:spawn',
        label: 'Am Spawnpunkt setzen',
        sub: census?.points ? `${census.points} Punkt(e) gesetzt` : 'Erst Spawnpunkte setzen',
        icon: 'npc',
        accent: GOOD,
      },
      {
        id: 'brain:clear',
        label: 'Alles wegräumen',
        sub: census
          ? `${census.npcs} NPC · ${census.cages} Käfig(e) · ${census.points} Punkt(e)`
          : 'NPCs, Käfige und Punkte',
        icon: 'reset',
        accent: BAD,
      },
    ];
    this.panel.setPage('Hirn', entries, { hint: 'Zielen und Trigger stellt um' });
  }

  /** Eine Zeile wurde benutzt. Die Reihenfolge ist die aus `showSettings`. */
  private choose(index: number): void {
    const settings = npcSettings();
    const fields = NPC_FIELDS.length;
    const host = this.hostRef;

    if (index === 0) {
      saveNpcSettings(withKind(settings, nextIn(NPC_KINDS, settings.kind)));
    } else if (index === 1) {
      saveNpcSettings(withBrain(settings, nextIn(BRAIN_IDS, settings.brain)));
    } else if (index === 2) {
      saveNpcSettings({ mode: nextIn(NPC_MODE_IDS, settings.mode) as NpcMode });
    } else if (index >= 3 && index < 3 + fields) {
      const field = NPC_FIELDS[index - 3]!;
      saveNpcSettings({ [field.key]: nextNpcStep(field, settings[field.key]) });
    } else if (index === 3 + fields) {
      const npcs = host?.npcs();
      const placed = npcs?.placeAtSpawn({
        kind: settings.kind,
        brain: settings.brain,
        speed: settings.speed,
        health: settings.health,
      });
      host?.notify(placed ? `${npcSkin(settings.kind).label} am Spawnpunkt` : 'Kein Spawnpunkt da');
    } else if (index === 4 + fields) {
      const count = host?.npcs()?.clear() ?? 0;
      host?.notify(count ? `${count} weggeräumt` : 'Da war nichts');
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

  private drawButton(): void {
    const ctx = this.buttonCanvas.getContext('2d');
    if (!ctx) return;
    const size = this.buttonCanvas.width;
    const middle = size / 2;
    ctx.clearRect(0, 0, size, size);
    const glow = ctx.createRadialGradient(middle, middle, 12, middle, middle, middle - 2);
    glow.addColorStop(0, this.settingsOpen ? 'rgba(255,140,180,0.95)' : 'rgba(229,138,168,0.95)');
    glow.addColorStop(1, 'rgba(8, 14, 26, 0.92)');
    ctx.beginPath();
    ctx.arc(middle, middle, middle - 3, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.lineWidth = this.buttonHot ? 6 : 3.5;
    ctx.strokeStyle = this.buttonHot ? '#ffffff' : 'rgba(255,255,255,0.75)';
    ctx.stroke();
    drawMenuIcon(ctx, this.settingsOpen ? 'back' : 'brain', middle, middle, size * 0.5, '#ffffff');
    this.buttonTexture.needsUpdate = true;
  }
}
