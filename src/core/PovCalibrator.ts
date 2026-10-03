import * as THREE from 'three';
import { LAYER_EYE } from './viewLayers';
import { GAZE_PITCH } from './questView';
import { ORDER, band, disposeCalibration, label, onSphere } from './viewCalibration';
import {
  addPoint,
  encodePov,
  fullOutline,
  items,
  loadPov,
  movePoint,
  removePoint,
  savePov,
  START_POINTS,
  type PovPoint,
} from './povCalibration';
import type { XRInput } from './XRInput';

/**
 * **VR-POV kalibrieren — in der Brille** (`core/povCalibration.ts` rechnet).
 *
 * Gewünscht: _„im menü grafik (vr pov kalibrieren) […] Ich dann diesen
 * verschieben mit dem linken stick (hoch runter links rechts). Mit dem rechten
 * stick kann ich zu den anderen punkten wechseln, welche ich hinzufügen kann.
 * […] mit „A" hinzufügen […] punkte löschen mit highlighten und dann b."_
 *
 * - Die Form hängt an der Kamera, um die gefühlte Null gedreht
 *   (`GAZE_PITCH`), ohne Tiefe über allem, nur das Menü darüber (`ORDER`).
 * - Die eingestellten Punkte sind weiße Scheiben, ihre Spiegelbilder kleine
 *   graue, die Mitten der Kanten hohle Ringe. Was gewählt ist, ist groß und
 *   gelb, mit seinen Gradzahlen daneben.
 * - **Linker Stick** verschiebt den gewählten Punkt (`SPEED` Grad je
 *   Sekunde, voll ausgelenkt), **rechter Stick** wechselt die Auswahl (rechts
 *   oder runter weiter, links oder hoch zurück), **A** macht aus einer Mitte
 *   einen Punkt, **B** löscht einen Punkt. ☰ öffnet das Menü mit _Konfig-Code
 *   anzeigen_ und _Schließen_ (`App.povMenu`); solange es offen ist, ruht
 *   alles hier.
 * - **Am Schirm** (VR-Ansicht): Pfeiltasten verschieben, `Q`/`E` wechseln,
 *   `Enter` fügt hinzu, `Entf`/`Rücktaste` löscht.
 */

/** Wie schnell ein Punkt wandert, in Grad je Sekunde bei vollem Ausschlag. */
const SPEED = 12;
/** Ab wann der rechte Stick als Schritt zählt — und wann er wieder frei ist. */
const STEP_ON = 0.6;
const STEP_OFF = 0.3;
/** Wie groß die Scheiben sind, in Metern auf der Kugel von einem Meter. */
const DOT = 0.012;
const DOT_SELECTED = 0.024;

const DEG = Math.PI / 180;

export class PovCalibrator {
  private points: PovPoint[] = loadPov();
  private selected = 1;
  private group: THREE.Group | null = null;
  private dirty = true;
  private latched = false;
  private readonly keys = new Set<string>();
  private keyListener: ((event: KeyboardEvent) => void) | null = null;
  private keyUpListener: ((event: KeyboardEvent) => void) | null = null;

  get active(): boolean {
    return this.group !== null;
  }

  /** Der Code der aktuellen Form (`povCalibration.encodePov`). */
  get code(): string {
    return encodePov(this.points);
  }

  /** Anfangen — die Form an die Kamera. */
  start(camera: THREE.Camera): void {
    if (this.group) return;
    this.group = new THREE.Group();
    this.group.name = 'pov-calibration';
    this.group.rotation.x = GAZE_PITCH * DEG;
    camera.layers.enable(LAYER_EYE);
    camera.add(this.group);
    // Der erste Punkt ist gewählt (die Liste beginnt mit der Mitte davor).
    this.selected = 1;
    this.dirty = true;
    this.listenKeys(true);
  }

  /** Aufhören — die Form weg, gemerkt bleibt sie (`savePov`). */
  stop(): void {
    if (!this.group) return;
    savePov(this.points);
    disposeCalibration(this.group);
    this.group = null;
    this.listenKeys(false);
  }

  /** Zurück aufs Rechteck. */
  reset(): void {
    this.points = [...START_POINTS];
    this.selected = 1;
    this.dirty = true;
    savePov(this.points);
  }

  /** Jedes Bild. `paused`, solange das Menü offen ist. */
  update(dt: number, input: XRInput, paused: boolean): void {
    if (!this.group) return;
    if (!paused) this.steer(dt, input);
    if (this.dirty) this.rebuild();
    // Schilder sind durchsichtig und kämen nach dem Menü — solange es offen
    // ist, bleiben sie weg; die Form selbst bleibt zu sehen.
    for (const child of this.group.children) {
      if ((child as THREE.Sprite).isSprite) child.visible = !paused;
    }
  }

  dispose(): void {
    this.stop();
  }

  private steer(dt: number, input: XRInput): void {
    const left = input.get('left');
    const right = input.get('right');
    const list = items(this.points);
    this.selected = Math.min(Math.max(0, this.selected), list.length - 1);

    // Rechter Stick: wechseln, einmal je Ausschlag.
    let step = 0;
    if (right) {
      const { x, y } = right.thumbstick;
      const strongest = Math.abs(x) > Math.abs(y) ? x : y;
      if (!this.latched && Math.abs(strongest) > STEP_ON) {
        step = strongest > 0 ? 1 : -1;
        this.latched = true;
      } else if (Math.abs(strongest) < STEP_OFF) this.latched = false;
    }
    if (this.pressedKey('KeyE')) step = 1;
    if (this.pressedKey('KeyQ')) step = -1;
    if (step) {
      this.selected = (this.selected + step + list.length) % list.length;
      this.dirty = true;
    }

    const item = list[this.selected]!;
    // A fügt hinzu, B löscht.
    const add = Boolean(right?.primary.justPressed || left?.primary.justPressed);
    const remove = Boolean(right?.secondary.justPressed || left?.secondary.justPressed);
    if ((add || this.pressedKey('Enter')) && item.kind === 'add') {
      this.points = addPoint(this.points, item);
      // Der neue Punkt steht an der Stelle der Mitte, also eins weiter.
      this.selected += 1;
      this.changed();
      return;
    }
    if (
      (remove || this.pressedKey('Delete') || this.pressedKey('Backspace')) &&
      item.kind === 'point' &&
      this.points.length > 1
    ) {
      this.points = removePoint(this.points, item.index);
      this.selected = Math.max(0, this.selected - 1);
      this.changed();
      return;
    }

    // Linker Stick: verschieben (nach vorn ist am Stick negativ).
    if (item.kind !== 'point') return;
    let dx = left ? left.thumbstick.x : 0;
    let dy = left ? -left.thumbstick.y : 0;
    if (this.keys.has('ArrowRight')) dx += 1;
    if (this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('ArrowUp')) dy += 1;
    if (this.keys.has('ArrowDown')) dy -= 1;
    if (dx === 0 && dy === 0) return;
    this.points = movePoint(this.points, item.index, dx * SPEED * dt, dy * SPEED * dt);
    this.changed();
  }

  private changed(): void {
    this.dirty = true;
    savePov(this.points);
  }

  // --- zeichnen -----------------------------------------------------------

  private rebuild(): void {
    const group = this.group;
    if (!group) return;
    this.dirty = false;
    for (const child of [...group.children]) disposeCalibration(child);

    const outline = fullOutline(this.points);
    const ring = [...outline, outline[0]!].map(([az, el]) => onSphere(az, el));
    group.add(band(ring, 0xffe14a));
    // Das Kreuz durch die Mitte, dünn: Daran spiegelt sich alles.
    group.add(band([onSphere(-6, 0), onSphere(6, 0)], 0x5ee0a0));
    group.add(band([onSphere(0, -6), onSphere(0, 6)], 0x5ee0a0));

    const list = items(this.points);
    list.forEach((item, index) => {
      const chosen = index === this.selected;
      const { az, el } = item.at;
      if (item.kind === 'point') {
        // Die Spiegelbilder — klein und grau, nicht zu wählen.
        for (const [a, e] of [
          [-az, el],
          [az, -el],
          [-az, -el],
        ] as const) {
          group.add(dot(a, e, DOT * 0.7, 0x8a93a3, false));
        }
      }
      const size = chosen ? DOT_SELECTED : DOT;
      const color = chosen ? 0xffe14a : item.kind === 'point' ? 0xffffff : 0x9fb3d0;
      group.add(dot(az, el, size, color, item.kind === 'add'));
      if (chosen) {
        const text =
          item.kind === 'point' ? `${az.toFixed(1)}° · ${el.toFixed(1)}°` : 'A: Punkt hinzufügen';
        const sign = label(text, 0xffe14a, onSphere(Math.max(0, az - 12), el - 5), 2);
        sign.scale.multiplyScalar(0.8);
        group.add(sign);
      }
    });

    const hint = label(
      'L schieben · R wählen · A neu · B weg · ☰ Menü',
      0xffffff,
      onSphere(0, -12),
      7,
    );
    hint.name = 'pov-hint';
    hint.scale.multiplyScalar(0.55);
    group.add(hint);

    group.traverse((object) => {
      object.layers.set(LAYER_EYE);
      object.frustumCulled = false;
      // Nur an den Netzen: Auf einer Gruppe gälte die Stufe für alles darin
      // vor jeder anderen Gruppe, und dann läge die Form über dem Menü.
      if (!(object as THREE.Group).isGroup) object.renderOrder = ORDER;
    });
  }

  // --- Tastatur am Schirm --------------------------------------------------

  /** Tasten, die seit dem letzten Bild gedrückt wurden. */
  private readonly pressed = new Set<string>();

  private pressedKey(code: string): boolean {
    return this.pressed.delete(code);
  }

  private listenKeys(on: boolean): void {
    if (typeof window === 'undefined') return;
    if (!on) {
      if (this.keyListener) window.removeEventListener('keydown', this.keyListener, true);
      if (this.keyUpListener) window.removeEventListener('keyup', this.keyUpListener, true);
      this.keyListener = null;
      this.keyUpListener = null;
      this.keys.clear();
      this.pressed.clear();
      return;
    }
    const owned = new Set([
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'KeyQ',
      'KeyE',
      'Enter',
      'Delete',
      'Backspace',
    ]);
    this.keyListener = (event) => {
      if (!owned.has(event.code)) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      // Die Tasten gehören hier der Form, nicht den Beinen.
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
    };
    this.keyUpListener = (event) => {
      if (!owned.has(event.code)) return;
      this.keys.delete(event.code);
    };
    window.addEventListener('keydown', this.keyListener, true);
    window.addEventListener('keyup', this.keyUpListener, true);
  }
}

/** Eine Scheibe — oder ein Ring — auf der Kugel, zum Auge gedreht. */
function dot(az: number, el: number, size: number, color: number, hollow: boolean): THREE.Mesh {
  const geometry = hollow
    ? new THREE.RingGeometry(size * 0.6, size, 24)
    : new THREE.CircleGeometry(size, 24);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  mesh.position.copy(onSphere(az, el, 0.999));
  mesh.lookAt(0, 0, 0);
  return mesh;
}
