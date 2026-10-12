import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { scannerFrame, SCANNER_HEIGHT, SCANNER_WIDTH } from './scannerModel';
import { playTone } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';

const _eye = new THREE.Vector3();
const _direction = new THREE.Vector3();

/** Wonach das Radar ortet — oder `off`. */
export type RadarTarget = 'monster' | 'pin' | 'item' | 'off';

/** Die Reihenfolge in der Auswahl _Wonach orten?_ (`chooser`). */
export const RADAR_TARGETS: readonly RadarTarget[] = ['monster', 'pin', 'item', 'off'];

/** Wie die Ziele im Menü und auf dem Schirm heißen. */
export const RADAR_LABELS: Readonly<Record<RadarTarget, string>> = {
  monster: 'Monster',
  pin: 'Ziel der Zentrale',
  item: 'Nächstes Teil',
  off: 'Aus',
};

/**
 * **Wie weit es reicht**, in Metern — doppelt so weit wie zuerst (18 m).
 * Gewünscht: _„Der Radius sollte verdoppelt werden."_
 */
export const RADAR_RANGE = 36;

/** Der Abstand zweier Pieptöne ganz nah und am Rand der Reichweite (s). */
const BEEP_NEAR = 0.1;
const BEEP_FAR = 1.4;

/**
 * Wie lange zwischen zwei Pieptönen, wenn das Ziel `distance` Meter weg ist —
 * oder `null`, wenn es außer Reichweite ist. Je näher, desto schneller, wie ein
 * Metalldetektor.
 */
export function beepGap(distance: number, range = RADAR_RANGE): number | null {
  if (!Number.isFinite(distance) || distance > range) return null;
  const t = Math.max(0, distance) / range;
  return BEEP_NEAR + (BEEP_FAR - BEEP_NEAR) * t;
}

/**
 * **Das Ortungsgerät** — ein Metalldetektor statt eines Radarschirms.
 * Gewünscht (Oktober 2026): _„es piept, wenn das monster in der nähe ist […]
 * und immer schneller piept, wenn es näher dran ist. […] braucht es sich
 * dann auch nicht zu drehen? sondern eher funktionieren wie ein metall
 * detektor"_ — und _„dass sich dann ein menü öffnet, welches dann fragt wonach
 * wir orten wollen […] das monster, zielpunkt der zentrale, oder nächstes
 * benötigtes item"_.
 *
 * Der Schirm zeigt, wonach gesucht wird, wie weit es weg ist und einen Balken
 * für die Stärke; dazu piept es, schneller, je näher (`beepGap`). Der Trigger
 * öffnet die Auswahl der Welt (`chooser`) — ein ganz gewöhnliches Menü, kein
 * eigenes auf dem Gerät. Was wo liegt, sagt die Welt (`setTargets`).
 */
export class RadarTool extends Tool {
  override readonly toolId = 'radar';
  override readonly label = 'Bewegungsradar';
  readonly frame = scannerFrame(0x8dffcc);
  private readonly canvas = document.createElement('canvas');
  private readonly texture: THREE.CanvasTexture;
  private readonly display: THREE.Mesh;
  private timer = 0;
  private beepTimer = 0;
  /** Wonach gerade geortet wird. */
  private mode: RadarTarget = 'monster';
  private readonly targets: Record<Exclude<RadarTarget, 'off'>, { x: number; z: number } | null> = {
    monster: null,
    pin: null,
    item: null,
  };
  /** Was zuletzt gemalt wurde — gemalt wird nur, wenn sich etwas ändert. */
  private drawn = '';

  constructor() {
    super();
    this.name = 'tool-radar';
    this.icon = 'xray';
    this.accent = 0x8dffcc;
    this.hint = 'Piept schneller, je näher das Ziel · Trigger wählt, wonach es ortet';
    this.canvas.width = 512;
    this.canvas.height = 384;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.display = new THREE.Mesh(
      new THREE.PlaneGeometry(SCANNER_WIDTH, SCANNER_HEIGHT),
      new THREE.MeshBasicMaterial({ map: this.texture, side: THREE.DoubleSide, toneMapped: false }),
    );
    this.frame.add(this.display);
    this.add(this.frame);
    this.mountGrip({ length: 0.09 });
    this.draw(null);
  }

  get scanning(): boolean {
    return this.mode !== 'off';
  }

  /** Wonach gerade geortet wird. */
  get target(): RadarTarget {
    return this.mode;
  }

  /** Wo das Monster ist — der alte Weg, dasselbe wie `setTargets({ monster })`. */
  setContact(contact: { x: number; z: number } | null): void {
    this.targets.monster = contact;
  }

  /** Wo die Ziele gerade sind (Meter, von oben) — `null`: keines. */
  setTargets(
    targets: Partial<Record<Exclude<RadarTarget, 'off'>, { x: number; z: number } | null>>,
  ): void {
    Object.assign(this.targets, targets);
  }

  /**
   * **Was der Trigger tut**: Hat die Welt eine Auswahl (`chooser`), öffnet er
   * sie — in Haunting die Seite _Wonach orten?_ im großen Menü, wie jedes
   * andere Menü auch. Sonst schaltet er zwischen Monster und aus.
   */
  chooser: (() => void) | null = null;

  /** Wonach orten — gesetzt von außen, aus der Auswahl der Welt. */
  setTarget(mode: RadarTarget): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.beepTimer = 0;
    this.timer = 0;
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    controller.pulse(0.3, 25);
    if (this.chooser) {
      this.chooser();
      return;
    }
    this.setTarget(this.mode === 'off' ? 'monster' : 'off');
    host.notify(this.mode === 'off' ? 'Radar aus.' : `Radar ortet: ${RADAR_LABELS[this.mode]}.`);
  }

  updateDisplay(dt: number, observer: THREE.Vector3, _forward?: THREE.Vector3): void {
    const at = this.mode === 'off' ? null : this.targets[this.mode];
    const distance = at ? Math.hypot(at.x - observer.x, at.z - observer.z) : Infinity;
    const gap = beepGap(distance);
    if (gap === null) this.beepTimer = 0;
    else {
      this.beepTimer -= dt;
      if (this.beepTimer <= 0) {
        this.beepTimer = gap;
        const near = 1 - distance / RADAR_RANGE;
        playTone({ type: 'sine', from: 880 + near * 660, duration: 0.07, gain: 0.05 });
      }
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.15;
    this.draw(Number.isFinite(distance) ? distance : null);
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    if (!controller || !this.heldBy) return;
    host.ctx.rig.getHeadPosition(_eye);
    host.ctx.camera.getWorldDirection(_direction);
    this.updateDisplay(dt, _eye, _direction);
  }

  private draw(distance: number | null): void {
    const inRange = distance !== null && distance <= RADAR_RANGE;
    const key = `${this.mode}|${inRange ? Math.round(distance!) : '-'}`;
    if (key === this.drawn) return;
    this.drawn = key;
    const c = this.canvas.getContext('2d');
    if (!c) return;
    c.fillStyle = '#06131b';
    c.fillRect(0, 0, 512, 384);
    c.textAlign = 'center';
    c.fillStyle = '#a9f5de';
    c.font = 'bold 24px system-ui';
    c.fillText(
      this.mode === 'off' ? 'RADAR AUS' : `ORTET: ${RADAR_LABELS[this.mode].toUpperCase()}`,
      256,
      40,
    );
    if (this.mode !== 'off') {
      c.font = 'bold 76px system-ui';
      c.fillStyle = inRange ? '#ffc388' : '#4d7b70';
      c.fillText(inRange ? `${Math.round(distance!)} m` : 'KEIN SIGNAL', 256, 170);
      // Der Balken: voll ganz nah, leer am Rand der Reichweite.
      const strength = inRange ? 1 - distance! / RADAR_RANGE : 0;
      c.fillStyle = '#173a33';
      c.fillRect(56, 222, 400, 34);
      c.fillStyle = '#8ff0b0';
      c.fillRect(56, 222, 400 * strength, 34);
      c.fillStyle = '#66958d';
      c.font = '19px system-ui';
      c.fillText(`Reichweite ${RADAR_RANGE} m · piept schneller, je näher`, 256, 300);
    }
    c.fillStyle = '#66958d';
    c.font = '17px system-ui';
    c.fillText('TRIGGER · WONACH ORTEN', 256, 373);
    this.texture.needsUpdate = true;
  }

  override disposeTool(): void {
    this.texture.dispose();
    disposeToolTree(this);
  }
}
